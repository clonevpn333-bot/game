// Chunk streaming + per-era chunk construction.
import * as THREE from 'three';
import { G } from '../core/state.js';
import { RNG, hash2i, clamp } from '../core/mathx.js';
import {
  CHUNK, GRID, HALF, district, chunkOrigin, chunkCoord, chunkRoads, ROAD, blockRect, lotsForChunk, terrainHeight,
  URBAN, WATER_Y, RIVER_X0, RIVER_X1, HIGHWAY_X, TRENCH_HALF, TRENCH_Y, highwayRoadY, trenchFactor, landmarkAt, BRIDGES,
  edgeRoad, chunkKey,
} from './layout.js';
import { ChunkGeo, GeoBuffer } from './geo.js';
import { LAYER as L } from './textures.js';
import { Collider, CF, SURF } from './collision.js';
import { placeProp, PROPS } from './props.js';
import { emitLot, emitLotFar } from './buildings.js';
import { GU } from './materials.js';
import { buildLandmark, landmarkFar } from './landmarks.js';

const C = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };

export const NEAR_RADIUS = 2.6; // chunks (centre distance)
const KEEP_RADIUS = 3.4;
const KINDS = ['uber', 'ground', 'foliage', 'grass', 'emissive', 'glass', 'holo', 'sign'];

class EraChunk {
  constructor() {
    this.group = new THREE.Group();
    this.colliders = [];
    this.holes = [];
    this.lights = [];
    this.parking = [];
    this.spawns = [];
    this.interactables = [];
    this.lanes = [];
    this.built = false;
    this.active = false;
    this.version = 0;
  }
}

class Chunk {
  constructor(ci, cj) {
    this.ci = ci; this.cj = cj;
    this.key = chunkKey(ci, cj);
    const o = chunkOrigin(ci, cj);
    this.x0 = o.x; this.z0 = o.z;
    this.cx = o.x + CHUNK / 2; this.cz = o.z + CHUNK / 2;
    this.district = district(ci, cj);
    this.eras = [null, null, null];
    this.dirty = [false, false, false];
  }
}

export class ChunkManager {
  constructor(scene, materials, collision, signs) {
    this.scene = scene;
    this.mats = materials;
    this.col = collision;
    this.signs = signs;
    this.chunks = new Map();
    this.queue = [];
    this.root = new THREE.Group();
    scene.add(this.root);
    this.eraRoots = [new THREE.Group(), new THREE.Group(), new THREE.Group()];
    this.eraRoots.forEach((g) => this.root.add(g));
    // near-mask texture (1 = chunk built at near detail -> hide far LOD)
    this.maskData = new Uint8Array(GRID * GRID * 4);
    this.maskTex = new THREE.DataTexture(this.maskData, GRID, GRID, THREE.RGBAFormat);
    this.maskTex.magFilter = THREE.NearestFilter;
    this.maskTex.minFilter = THREE.NearestFilter;
    this.maskTex.needsUpdate = true;
    GU.uNearMask.value = this.maskTex;
    this.visibleEra = 0;
    this.focusCi = -1; this.focusCj = -1;
    this.budgetMs = 7;
    this.stats = { built: 0, active: 0 };
  }

  // Era visibility
  setVisibleEras(list) {
    this.eraRoots.forEach((g, i) => { g.visible = list.includes(i); });
  }

  get(ci, cj) { return this.chunks.get(chunkKey(ci, cj)); }

  // Request rebuild of chunks for a set of eras (cause & effect)
  invalidate(ci, cj, eras) {
    const c = this.get(ci, cj);
    if (!c) return;
    for (const e of eras) {
      if (c.eras[e]) c.dirty[e] = true;
    }
  }
  invalidateAll(eras) {
    for (const c of this.chunks.values()) for (const e of eras) if (c.eras[e]) c.dirty[e] = true;
  }

  update(px, pz, era, force = false) {
    const fc = chunkCoord(px, pz);
    const R = Math.ceil(KEEP_RADIUS);
    // create / schedule
    const wanted = [];
    for (let dj = -R; dj <= R; dj++) {
      for (let di = -R; di <= R; di++) {
        const ci = fc.ci + di, cj = fc.cj + dj;
        if (ci < 0 || cj < 0 || ci >= GRID || cj >= GRID) continue;
        const ccx = -HALF + ci * CHUNK + CHUNK / 2, ccz = -HALF + cj * CHUNK + CHUNK / 2;
        const d = Math.hypot(ccx - px, ccz - pz) / CHUNK;
        if (d > NEAR_RADIUS) continue;
        wanted.push([ci, cj, d]);
      }
    }
    for (const [ci, cj, d] of wanted) {
      let c = this.get(ci, cj);
      if (!c) { c = new Chunk(ci, cj); this.chunks.set(c.key, c); }
      c.dist = d;
    }
    // unload far chunks
    for (const c of [...this.chunks.values()]) {
      const d = Math.hypot(c.cx - px, c.cz - pz) / CHUNK;
      c.dist = d;
      if (d > KEEP_RADIUS) this.unload(c);
    }
    // build queue: current era first, then the others (needed for instant shifts)
    const jobs = [];
    for (const c of this.chunks.values()) {
      if (c.dist > NEAR_RADIUS + 0.3) continue;
      for (let e = 0; e < 3; e++) {
        if (!c.eras[e] || c.dirty[e]) {
          const pri = c.dist + (e === era ? 0 : 3) + (c.dirty[e] && c.eras[e] ? 0.5 : 0);
          jobs.push([pri, c, e]);
        }
      }
    }
    jobs.sort((a, b) => a[0] - b[0]);
    const t0 = performance.now();
    let n = 0;
    for (const [pri, c, e] of jobs) {
      const elapsed = performance.now() - t0;
      if (!force && elapsed > this.budgetMs && n > 0) break;
      if (force && pri > 4 && elapsed > this.budgetMs) break;
      this.build(c, e);
      n++;
    }
    // activation (colliders) for all eras within near radius — collisions of
    // other eras are needed to test shift obstruction.
    let active = 0;
    for (const c of this.chunks.values()) {
      for (let e = 0; e < 3; e++) {
        const ec = c.eras[e];
        if (!ec) continue;
        const shouldBeActive = c.dist <= NEAR_RADIUS + 0.4;
        if (shouldBeActive && !ec.active) this.activate(c, e);
        else if (!shouldBeActive && ec.active) this.deactivate(c, e);
        if (ec.active) active++;
      }
    }
    this.stats.active = active;
    this._updateMask();
    return jobs.length - n;
  }

  _updateMask() {
    let changed = false;
    for (let cj = 0; cj < GRID; cj++) {
      for (let ci = 0; ci < GRID; ci++) {
        const c = this.get(ci, cj);
        // mask out far LOD only when every visible era is built
        let v = 0;
        if (c) {
          const e = this.visibleEra;
          const ok = c.eras[e] && c.eras[e].built;
          v = ok ? 255 : 0;
        }
        const idx = (cj * GRID + ci) * 4;
        if (this.maskData[idx] !== v) { this.maskData[idx] = v; changed = true; }
      }
    }
    if (changed) this.maskTex.needsUpdate = true;
  }

  activate(c, e) {
    const ec = c.eras[e];
    for (const col of ec.colliders) this.col.add(e, col);
    for (const h of ec.holes) this.col.addHole(e, h);
    ec.active = true;
  }
  deactivate(c, e) {
    const ec = c.eras[e];
    for (const col of ec.colliders) this.col.remove(e, col);
    for (const h of ec.holes) this.col.removeHole(e, h);
    ec.active = false;
  }

  unload(c) {
    for (let e = 0; e < 3; e++) {
      const ec = c.eras[e];
      if (!ec) continue;
      if (ec.active) this.deactivate(c, e);
      this._dispose(ec);
      c.eras[e] = null;
    }
    this.chunks.delete(c.key);
  }

  _dispose(ec) {
    ec.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    if (ec.group.parent) ec.group.parent.remove(ec.group);
  }

  build(c, era) {
    const old = c.eras[era];
    const ec = new EraChunk();
    const geo = new ChunkGeo();
    const rng = new RNG(hash2i(c.ci, c.cj, 1000 + era));
    const ctx = {
      era, geo, rng, chunk: c, signs: this.signs, facts: G.chronicle, lights: ec.lights, parking: ec.parking, spawns: ec.spawns,
      interact: ec.interactables, lanes: ec.lanes,
      block: blockRect(c.ci, c.cj),
      collider: (x0, y0, z0, x1, y1, z1, flags = CF.SOLID, surf = SURF.concrete) => {
        const col = new Collider(x0, y0, z0, x1, y1, z1, flags, surf);
        col.data = { chunk: c.key, era };
        ec.colliders.push(col);
        return col;
      },
      ramp: (x0, z0, x1, z1, ya, yb, axis, surf = SURF.rubble) => {
        const col = new Collider(x0, Math.min(ya, yb) - 0.5, z0, x1, Math.max(ya, yb), z1, CF.SOLID, surf);
        col.ramp = { axis, y0: ya, y1: yb };
        ec.colliders.push(col);
        return col;
      },
      hole: (minX, minZ, maxX, maxZ, maxY) => { ec.holes.push({ minX, minZ, maxX, maxZ, maxY }); },
      tree: (x, y, z, r, scale = 1) => this._tree(ctx, x, y, z, r, scale),
    };
    G.chronicle.tracking = { key: c.key, era };
    try {
      buildChunkContent(ctx, c, era);
    } catch (err) {
      console.error('chunk build failed', c.key, era, err);
    }
    G.chronicle.tracking = null;
    // meshes
    const set = this.mats.sets[era];
    for (const kind of KINDS) {
      const gb = geo.b[kind];
      if (!gb || gb.empty) continue;
      const g = gb.build();
      if (!g) continue;
      let mat = set[kind];
      if (kind === 'sign' && !mat) continue;
      const mesh = new THREE.Mesh(g, mat);
      mesh.matrixAutoUpdate = false;
      mesh.castShadow = kind === 'uber' || kind === 'foliage';
      mesh.receiveShadow = kind !== 'emissive' && kind !== 'holo' && kind !== 'sign';
      mesh.frustumCulled = true;
      if (kind === 'glass' || kind === 'holo') mesh.renderOrder = 2;
      ec.group.add(mesh);
    }
    ec.group.matrixAutoUpdate = false;
    ec.built = true;
    if (old) {
      if (old.active) this.deactivate(c, era);
      this._dispose(old);
    }
    c.eras[era] = ec;
    c.dirty[era] = false;
    this.eraRoots[era].add(ec.group);
    this.stats.built++;
  }

  _tree(ctx, x, y, z, r, scale = 1) {
    const era = ctx.era;
    if (era === 2 && scale > 1.2 && r.chance(0.35)) {
      placeProp(ctx, 'tree_giant_' + r.int(0, 1), x, y, z, r.range(0, 6), r.range(0.55, 0.85));
      return;
    }
    const name = r.pick(['tree_oak', 'tree_maple', 'tree_street', 'tree_birch']) + '_' + r.int(0, 2);
    placeProp(ctx, name, x, y, z, r.range(0, 6), scale * r.range(0.85, 1.15));
  }

  // Era chunk data for systems (traffic, NPC spawns, etc.)
  eraChunk(ci, cj, era) {
    const c = this.get(ci, cj);
    return c ? c.eras[era] : null;
  }
  isBuilt(x, z, era) {
    const cc = chunkCoord(x, z);
    const ec = this.eraChunk(cc.ci, cc.cj, era);
    return !!(ec && ec.built && ec.active);
  }
  forEachActive(era, fn) {
    for (const c of this.chunks.values()) {
      const ec = c.eras[era];
      if (ec && ec.active) fn(c, ec);
    }
  }
}

// ---------------------------------------------------------------------------
// Content
// ---------------------------------------------------------------------------
function buildChunkContent(ctx, c, era) {
  const d = c.district;
  const lm = landmarkAt(c.ci, c.cj);
  if (d === 'R' || d === '~') {
    buildWaterChunk(ctx, c, era);
    return;
  }
  if (d === 'H') {
    buildHighwayChunk(ctx, c, era);
    return;
  }
  if (!URBAN.has(d)) {
    buildWildChunk(ctx, c, era, lm);
    return;
  }
  buildStreets(ctx, c, era);
  buildBlockGround(ctx, c, era);
  if (lm) {
    buildLandmark(lm, ctx, c, era);
  } else {
    const flat = d !== 'W';
    for (const lot of lotsForChunk(c.ci, c.cj)) {
      lot.flat = flat;
      emitLot(ctx, lot, era);
    }
  }
  buildStreetProps(ctx, c, era);
  if (d === 'B') buildQuay(ctx, c, era);
}

// --------------------------------------------------------------- roads ----
function roadY(x, z) {
  return terrainHeight(x, z);
}

// Flat or sloped rectangle surface (follows terrain when sloped)
function surfaceRect(gb, x0, z0, x1, z1, yOff, col, m, sloped) {
  if (!sloped) {
    const y = yOff;
    gb.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], [x0, z1], [x1, z1], [x1, z0], [x0, z0], col, m);
    return;
  }
  const step = 8;
  const nx = Math.max(1, Math.ceil((x1 - x0) / step)), nz = Math.max(1, Math.ceil((z1 - z0) / step));
  const base = gb.vcount;
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + ((x1 - x0) * i) / nx, z = z0 + ((z1 - z0) * j) / nz;
      const y = terrainHeight(x, z) + yOff;
      const e = 0.5;
      const hx = terrainHeight(x + e, z) - terrainHeight(x - e, z), hz = terrainHeight(x, z + e) - terrainHeight(x, z - e);
      const n = new THREE.Vector3(-hx, 2 * e, -hz).normalize();
      gb.vert(x, y, z, n.x, n.y, n.z, x, z, col[0], col[1], col[2], m[0], m[1], m[2], m[3]);
    }
  }
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = base + j * (nx + 1) + i;
      const b = a + 1, cc = a + (nx + 1), dd = cc + 1;
      gb.tri(a, cc, dd);
      gb.tri(a, dd, b);
    }
  }
}

function buildStreets(ctx, c, era) {
  const roads = chunkRoads(c.ci, c.cj);
  const g = ctx.geo.get('ground');
  const x0 = c.x0, z0 = c.z0, x1 = c.x0 + CHUNK, z1 = c.z0 + CHUNK;
  const cw = roads.map((r) => ROAD[r].carriage);
  const hw = roads.map((r) => ROAD[r].half);
  const sloped = c.district === 'W';
  const asphaltCol = era === 2 ? C('#b8b4a8') : era === 1 ? C('#8a8c90') : C('#ffffff');
  const am = [L.asphalt, -1, 0, 0];
  // carriageways
  if (cw[0] > 0) surfaceRect(g, x0, z0, x1, z0 + cw[0], 0, asphaltCol, am, sloped);
  if (cw[2] > 0) surfaceRect(g, x0, z1 - cw[2], x1, z1, 0, asphaltCol, am, sloped);
  if (cw[3] > 0) surfaceRect(g, x0, z0 + cw[0], x0 + cw[3], z1 - cw[2], 0, asphaltCol, am, sloped);
  if (cw[1] > 0) surfaceRect(g, x1 - cw[1], z0 + cw[0], x1, z1 - cw[2], 0, asphaltCol, am, sloped);

  // sidewalks: raised slabs with curbs (flat districts) / flush (sloped)
  const swCol = era === 2 ? C('#a8a898') : era === 1 ? C('#d8dce0') : C('#e8e4dc');
  const sm = [L.sidewalk, -1, 0, 0];
  const swH = 0.15;
  const sw = (ax0, az0, ax1, az1) => {
    if (ax1 - ax0 < 0.1 || az1 - az0 < 0.1) return;
    if (sloped) {
      surfaceRect(g, ax0, az0, ax1, az1, 0.06, swCol, sm, true);
    } else {
      g.box(ax0, -0.3, az0, ax1, swH, az1, swCol, sm, { faces: 1 | 2 | 4 | 16 | 32, topM: sm, topCol: swCol });
      ctx.collider(ax0, -0.3, az0, ax1, swH, az1, CF.SOLID, SURF.concrete);
    }
  };
  const bx0 = x0 + hw[3], bx1 = x1 - hw[1], bz0 = z0 + hw[0], bz1 = z1 - hw[2];
  if (hw[0] > 0) sw(x0 + cw[3], z0 + cw[0], x1 - cw[1], bz0);
  if (hw[2] > 0) sw(x0 + cw[3], bz1, x1 - cw[1], z1 - cw[2]);
  if (hw[3] > 0) sw(x0 + cw[3], bz0, bx0, bz1);
  if (hw[1] > 0) sw(bx1, bz0, x1 - cw[1], bz1);
  // fill sidewalk corners where a road ends (dead ends)
  // lane markings
  const paint = ctx.geo.get('ground');
  const yel = era === 1 ? C('#f8e060') : C('#e8c040');
  const wht = C('#f0f0e8');
  const fade = era === 2;
  const pm = [L.paint, -1, 0, 0];
  const line = (ax0, az0, ax1, az1, col, dashed) => {
    if (fade && ctx.rng.next() < 0.6) return;
    const yy = 0.012;
    if (!dashed) {
      paint.quad([ax0, yy, az1], [ax1, yy, az1], [ax1, yy, az0], [ax0, yy, az0], [0, 1, 0], [0, 0], [1, 0], [1, 1], [0, 1], col, pm);
    } else {
      const horiz = ax1 - ax0 > az1 - az0;
      const len = horiz ? ax1 - ax0 : az1 - az0;
      for (let t = 1.5; t < len - 1.5; t += 6) {
        if (horiz) paint.quad([ax0 + t, yy, az1], [ax0 + t + 3, yy, az1], [ax0 + t + 3, yy, az0], [ax0 + t, yy, az0], [0, 1, 0], [0, 0], [1, 0], [1, 1], [0, 1], col, pm);
        else paint.quad([ax0, yy, az0 + t + 3], [ax1, yy, az0 + t + 3], [ax1, yy, az0 + t], [ax0, yy, az0 + t], [0, 1, 0], [0, 0], [1, 0], [1, 1], [0, 1], col, pm);
      }
    }
  };
  if (!sloped) {
    const lw = 0.12;
    if (roads[0] !== 'none') {
      line(x0 + cw[3], z0 + 0.1, x1 - cw[1], z0 + 0.1 + lw, yel, false);
      if (roads[0] === 'avenue') line(x0 + cw[3], z0 + 3.2, x1 - cw[1], z0 + 3.2 + lw, wht, true);
    }
    if (roads[2] !== 'none') {
      line(x0 + cw[3], z1 - 0.1 - lw, x1 - cw[1], z1 - 0.1, yel, false);
      if (roads[2] === 'avenue') line(x0 + cw[3], z1 - 3.2 - lw, x1 - cw[1], z1 - 3.2, wht, true);
    }
    if (roads[3] !== 'none') {
      line(x0 + 0.1, z0 + cw[0], x0 + 0.1 + lw, z1 - cw[2], yel, false);
      if (roads[3] === 'avenue') line(x0 + 3.2, z0 + cw[0], x0 + 3.2 + lw, z1 - cw[2], wht, true);
    }
    if (roads[1] !== 'none') {
      line(x1 - 0.1 - lw, z0 + cw[0], x1 - 0.1, z1 - cw[2], yel, false);
      if (roads[1] === 'avenue') line(x1 - 3.2 - lw, z0 + cw[0], x1 - 3.2, z1 - cw[2], wht, true);
    }
    // crosswalks at corners where two roads meet
    const zebra = (ax0, az0, ax1, az1, horizStripes) => {
      if (fade) return;
      const col = wht;
      if (horizStripes) {
        for (let z = az0 + 0.3; z < az1 - 0.3; z += 1.0) paint.quad([ax0, 0.013, z + 0.5], [ax1, 0.013, z + 0.5], [ax1, 0.013, z], [ax0, 0.013, z], [0, 1, 0], [0, 0], [1, 0], [1, 1], [0, 1], col, pm);
      } else {
        for (let x = ax0 + 0.3; x < ax1 - 0.3; x += 1.0) paint.quad([x, 0.013, az1], [x + 0.5, 0.013, az1], [x + 0.5, 0.013, az0], [x, 0.013, az0], [0, 1, 0], [0, 0], [1, 0], [1, 1], [0, 1], col, pm);
      }
    };
    const corners = [[0, 3, x0, z0, 1, 1], [0, 1, x1, z0, -1, 1], [2, 3, x0, z1, 1, -1], [2, 1, x1, z1, -1, -1]];
    for (const [ra, rb, cx, cz, sx, sz] of corners) {
      if (roads[ra] === 'none' || roads[rb] === 'none') continue;
      // crossing the E-W road (ra): stripes run along x, just past the N-S carriageway
      const xa = cx + sx * cw[rb], xb = cx + sx * (cw[rb] + 3.2);
      zebra(Math.min(xa, xb), Math.min(cz, cz + sz * cw[ra]), Math.max(xa, xb), Math.max(cz, cz + sz * cw[ra]), false);
      const za = cz + sz * cw[ra], zb = cz + sz * (cw[ra] + 3.2);
      zebra(Math.min(cx, cx + sx * cw[rb]), Math.min(za, zb), Math.max(cx, cx + sx * cw[rb]), Math.max(za, zb), true);
      // traffic light on the block corner
      if (era < 2) {
        const px = cx + sx * (hw[rb] - 0.6), pz = cz + sz * (hw[ra] - 0.6);
        // NW & SE corners control the N-S road (axis 0), NE & SW the E-W road (axis 1)
        const isNWSE = (sx === 1 && sz === 1) || (sx === -1 && sz === -1);
        const axis = isNWSE ? 0 : 1;
        // arm reaches over the road it controls
        const dirX = axis === 0 ? -sx : 0, dirZ = axis === 0 ? 0 : -sz;
        placeProp(ctx, `traffic${era}_${axis}`, px, swH, pz, Math.atan2(dirX, dirZ));
      }
    }
  }
  // traffic lanes for the traffic system (centre of each lane, direction)
  const lanes = ctx.lanes;
  const addLane = (ax, az, bx, bz, road) => lanes.push({ ax, az, bx, bz, road });
  // Right-hand traffic. North road (z = z0): our half is z in [z0, z0+cw]; traffic here travels +x? For a road
  // along z = z0, the south half carries westbound? Using right-hand driving: eastbound (+x) keeps to the south side (+z).
  if (roads[0] !== 'none') {
    const n = roads[0] === 'avenue' ? 2 : 1;
    for (let i = 0; i < n; i++) addLane(x0, z0 + 1.7 + i * 3.2, x1, z0 + 1.7 + i * 3.2, roads[0]);
  }
  if (roads[2] !== 'none') {
    const n = roads[2] === 'avenue' ? 2 : 1;
    for (let i = 0; i < n; i++) addLane(x1, z1 - 1.7 - i * 3.2, x0, z1 - 1.7 - i * 3.2, roads[2]);
  }
  if (roads[3] !== 'none') {
    const n = roads[3] === 'avenue' ? 2 : 1;
    for (let i = 0; i < n; i++) addLane(x0 + 1.7 + i * 3.2, z1, x0 + 1.7 + i * 3.2, z0, roads[3]);
  }
  if (roads[1] !== 'none') {
    const n = roads[1] === 'avenue' ? 2 : 1;
    for (let i = 0; i < n; i++) addLane(x1 - 1.7 - i * 3.2, z0, x1 - 1.7 - i * 3.2, z1, roads[1]);
  }
  // 2189: grass & weeds through cracked asphalt, wrecks
  if (era === 2) {
    const r = ctx.rng;
    for (let i = 0; i < 40; i++) {
      const side = r.int(0, 3);
      if (roads[side] === 'none') continue;
      let x, z;
      if (side === 0) { x = x0 + r.next() * CHUNK; z = z0 + r.next() * cw[0]; }
      else if (side === 2) { x = x0 + r.next() * CHUNK; z = z1 - r.next() * cw[2]; }
      else if (side === 3) { x = x0 + r.next() * cw[3]; z = z0 + r.next() * CHUNK; }
      else { x = x1 - r.next() * cw[1]; z = z0 + r.next() * CHUNK; }
      placeProp(ctx, 'grass_tuft', x, roadY(x, z), z, r.range(0, 6), r.range(0.8, 1.8), null, { noCollide: true });
    }
    const wrecks = r.int(0, 3);
    for (let i = 0; i < wrecks; i++) {
      const side = r.int(0, 3);
      if (roads[side] === 'none') continue;
      const along = r.range(10, CHUNK - 10);
      let x, z, yaw;
      if (side === 0) { x = x0 + along; z = z0 + r.range(1.5, cw[0] - 1.5); yaw = Math.PI / 2 + r.range(-0.4, 0.4); }
      else if (side === 2) { x = x0 + along; z = z1 - r.range(1.5, cw[2] - 1.5); yaw = Math.PI / 2 + r.range(-0.4, 0.4); }
      else if (side === 3) { x = x0 + r.range(1.5, cw[3] - 1.5); z = z0 + along; yaw = r.range(-0.4, 0.4); }
      else { x = x1 - r.range(1.5, cw[1] - 1.5); z = z0 + along; yaw = r.range(-0.4, 0.4); }
      placeProp(ctx, 'wreck_' + r.int(0, 3), x, roadY(x, z), z, yaw);
    }
    // trees breaking through the road
    if (r.chance(0.4)) {
      const x = x0 + r.range(2, cw[3] || 5), z = z0 + r.range(20, 70);
      if (roads[3] !== 'none') placeProp(ctx, 'tree_oak_' + r.int(0, 2), x, 0, z, r.range(0, 6), 1.3);
    }
  }
}

function buildBlockGround(ctx, c, era) {
  const b = ctx.block;
  const g = ctx.geo.get('ground');
  const d = c.district;
  const sloped = d === 'W';
  let layer = L.concrete, col = C('#d8d4cc');
  if (d === 'S' || d === 'W' || d === 'P') { layer = L.grass; col = C('#d8e8c0'); }
  if (d === 'A') { layer = L.dirt; col = C('#d8d0c0'); }
  if (d === 'I') { layer = L.asphalt; col = C('#d8d8d8'); }
  if (era === 2) {
    if (layer === L.concrete || layer === L.asphalt) { layer = L.rubble; col = C('#b8b8a8'); }
    else { layer = L.grass; col = C('#a8c890'); }
  }
  const m = [layer, -1, 0, 0];
  if (sloped) {
    surfaceRect(g, b.x0, b.z0, b.x1, b.z1, 0.12, col, m, true);
  } else {
    g.box(b.x0, -0.3, b.z0, b.x1, 0.15, b.z1, col, m, { faces: 4 | 1 | 2 | 16 | 32, topM: m, topCol: col });
    ctx.collider(b.x0, -0.3, b.z0, b.x1, 0.15, b.z1, CF.SOLID, layer === L.grass ? SURF.grass : SURF.concrete);
  }
}

function buildStreetProps(ctx, c, era) {
  const roads = chunkRoads(c.ci, c.cj);
  const hw = roads.map((r) => ROAD[r].half);
  const cw = roads.map((r) => ROAD[r].carriage);
  const r = new RNG(hash2i(c.ci, c.cj, 77)); // same positions every era → correspondence
  const er = ctx.rng;
  const x0 = c.x0, z0 = c.z0, x1 = c.x0 + CHUNK, z1 = c.z0 + CHUNK;
  const d = c.district;
  const sloped = d === 'W';
  const y = (x, z) => (sloped ? terrainHeight(x, z) + 0.06 : 0.15);
  const lampName = era === 0 ? 'lamp96' : era === 1 ? 'lamp47' : 'lamp89';
  const treeOK = d !== 'I';
  const sides = [
    // [side, ax, az, bx, bz, nx, nz] curb line + outward normal toward the road
    [0, x0 + hw[3] + 2, z0 + cw[0] + 0.7, x1 - hw[1] - 2, z0 + cw[0] + 0.7, 0, -1],
    [2, x0 + hw[3] + 2, z1 - cw[2] - 0.7, x1 - hw[1] - 2, z1 - cw[2] - 0.7, 0, 1],
    [3, x0 + cw[3] + 0.7, z0 + hw[0] + 2, x0 + cw[3] + 0.7, z1 - hw[2] - 2, -1, 0],
    [1, x1 - cw[1] - 0.7, z0 + hw[0] + 2, x1 - cw[1] - 0.7, z1 - hw[2] - 2, 1, 0],
  ];
  for (const [side, ax, az, bx, bz, nx, nz] of sides) {
    if (roads[side] === 'none') continue;
    const len = Math.hypot(bx - ax, bz - az);
    const tx = (bx - ax) / len, tz = (bz - az) / len;
    const yawRoad = Math.atan2(nx, nz);
    // lamps every ~28 m
    const nl = Math.max(1, Math.round(len / 28));
    for (let i = 0; i < nl; i++) {
      const t = (i + 0.5) / nl * len;
      const px = ax + tx * t, pz = az + tz * t;
      if (era === 2 && r.next() < 0.4) { r.next(); continue; }
      placeProp(ctx, lampName, px, y(px, pz), pz, yawRoad);
    }
    // street trees between lamps (they grow across eras)
    if (treeOK) {
      const nt = Math.max(1, Math.round(len / 14));
      for (let i = 0; i < nt; i++) {
        const t = (i + 0.0) / nt * len + 5;
        if (t > len - 2) continue;
        const keep = r.next();
        const pick = r.int(0, 2);
        const rot = r.range(0, 6);
        const px = ax + tx * t - nx * 0.3, pz = az + tz * t - nz * 0.3;
        if (Math.abs(((t + 14) % 28) - 14) < 4) continue; // too close to a lamp
        if (keep < (d === 'D' ? 0.45 : 0.75)) {
          const yy = y(px, pz);
          if (era === 0) placeProp(ctx, 'tree_street_' + pick, px, yy, pz, rot, 0.75);
          else if (era === 1) placeProp(ctx, 'tree_street_' + pick, px, yy, pz, rot, 1.15);
          else placeProp(ctx, keep < 0.2 ? 'tree_giant_' + (pick % 2) : 'tree_oak_' + pick, px, yy, pz, rot, keep < 0.2 ? 0.7 : 1.5);
          // tree pit
          if (era < 2 && !sloped) ctx.geo.get('ground').box(px - 0.8, 0.15, pz - 0.8, px + 0.8, 0.17, pz + 0.8, C('#5a4a3a'), [L.dirt, -1, 0, 0], { faces: 4 });
        }
      }
    }
    // street furniture, deterministic slots with era-specific objects
    const nf = Math.floor(len / 9);
    for (let i = 0; i < nf; i++) {
      const roll = r.next();
      const t = r.range(3, len - 3);
      const inset = r.range(1.4, 2.4);
      const px = ax + tx * t - nx * inset, pz = az + tz * t - nz * inset;
      const yy = y(px, pz);
      const yaw = yawRoad + Math.PI;
      if (roll < 0.1) placeProp(ctx, era === 2 ? 'rubble_' + (i % 4) : 'hydrant', ax + tx * t, yy, az + tz * t, 0, era === 2 ? 0.5 : 1);
      else if (roll < 0.2) placeProp(ctx, era === 0 ? 'trashcan' : era === 1 ? 'charger47' : 'drum', px, yy, pz, yaw);
      else if (roll < 0.27 && d !== 'S') placeProp(ctx, era === 0 ? 'phonebooth' : era === 1 ? 'kiosk47' : 'scrapwall', px, yy, pz, yaw, era === 2 ? 0.6 : 1);
      else if (roll < 0.33) placeProp(ctx, era === 0 ? 'newsbox' : era === 1 ? 'vending' : 'crate', px, yy, pz, yaw);
      else if (roll < 0.38 && roads[side] === 'avenue') placeProp(ctx, era === 2 ? 'tent' : 'busstop', px - nx * 0.2, yy, pz - nz * 0.2, yaw + Math.PI);
      else if (roll < 0.46) placeProp(ctx, era === 1 ? 'campole47' : era === 0 ? 'meter' : 'grass_tuft', ax + tx * t, yy, az + tz * t, yaw);
      else if (roll < 0.52 && era < 2) placeProp(ctx, 'bench', px, yy, pz, yaw + Math.PI);
      else if (roll < 0.56 && era === 0 && d !== 'D') placeProp(ctx, 'mailbox', px, yy, pz, yaw);
      else if (roll < 0.6 && era === 2) placeProp(ctx, r.chance(0.5) ? 'campfire' : 'watercollector', px, yy, pz, yaw);
    }
    // parked-car slots along streets (vehicle system spawns cars here)
    if (roads[side] === 'street' || (roads[side] === 'avenue' && d !== 'D')) {
      for (let t = 8; t < len - 6; t += 7.5) {
        if (r.next() < 0.4) continue;
        const px = ax + tx * t + nx * 1.9, pz = az + tz * t + nz * 1.9;
        ctx.parking.push({ x: px, z: pz, yaw: Math.atan2(tx, tz), street: true });
      }
    }
    // pedestrian spawn/waypoints along the sidewalk
    for (let t = 4; t < len; t += 10) {
      ctx.spawns.push({ x: ax + tx * t - nx * 1.4, z: az + tz * t - nz * 1.4, y: y(ax + tx * t, az + tz * t), side, kind: 'walk' });
    }
  }
  if (era === 2 && er.chance(0.25)) {
    // survivor camp on the block corner
    const b = ctx.block;
    const cx = b.x0 + 6, cz = b.z0 + 6;
    placeProp(ctx, 'campfire', cx, y(cx, cz), cz);
    placeProp(ctx, 'tent', cx + 4, y(cx, cz), cz + 1, 0.4);
    placeProp(ctx, 'scrapwall', cx + 1, y(cx, cz), cz - 3.5, 0);
    ctx.spawns.push({ x: cx + 2, z: cz + 2, y: y(cx, cz), kind: 'camp' });
  }
}

// ------------------------------------------------------- water / quay -----
function buildQuay(ctx, c, era) {
  // Waterfront promenade along the east edge of column 17 (river side)
  const roads = chunkRoads(c.ci, c.cj);
  const east = district(c.ci + 1, c.cj);
  if (east !== 'R' && east !== '~') return;
  const x = c.x0 + CHUNK;
  const g = ctx.geo.get('uber');
  const z0 = c.z0, z1 = c.z0 + CHUNK;
  // railing along the quay edge
  for (let z = z0 + 2; z < z1 - 2; z += 4) {
    if (era === 2 && ctx.rng.chance(0.4)) continue;
    placeProp(ctx, 'railing', x - 0.5, 0.15, z + 2, Math.PI / 2, 1, era === 2 ? C('#8a5a40') : null);
  }
  void roads; void g;
}

function buildWaterChunk(ctx, c, era) {
  const g = ctx.geo.get('ground');
  const x0 = c.x0, z0 = c.z0, x1 = c.x0 + CHUNK, z1 = c.z0 + CHUNK;
  // riverbed (terrain patch)
  terrainPatch(ctx, c, era, 6);
  // quay strip on the river's west side (x 384..392) and east (568..576)
  const inCity = c.z0 > -700 && c.z0 < 600 && district(c.ci, c.cj) === 'R';
  const wall = C('#b8b0a0');
  if (inCity) {
    for (const [qx0, qx1, face] of [[RIVER_X0 - 8, RIVER_X0, 1], [RIVER_X1, RIVER_X1 + 8, 2]]) {
      if (qx1 <= x0 || qx0 >= x1) continue;
      const a = Math.max(qx0, x0), b = Math.min(qx1, x1);
      g.box(a, -10, z0, b, 0.15, z1, wall, [L.stone, -1, 0, 0], { faces: face === 1 ? 1 | 4 : 2 | 4, topM: [L.sidewalk, -1, 0, 0], topCol: C('#d8d4cc') });
      ctx.collider(a, -10, z0, b, 0.15, z1, CF.SOLID, SURF.concrete);
      // mooring posts / railing
      for (let z = z0 + 3; z < z1; z += 8) placeProp(ctx, 'bollard', face === 1 ? b - 0.6 : a + 0.6, 0.15, z, 0, 0.8);
    }
  }
  // bridges crossing this chunk
  for (const [id, br] of Object.entries(BRIDGES)) {
    if (br.z < z0 - 1 || br.z > z1 + 1) continue;
    buildBridgeSegment(ctx, c, era, id, br);
  }
  void x1;
}

function buildBridgeSegment(ctx, c, era, id, br) {
  const facts = ctx.facts;
  const g = ctx.geo.get('uber');
  const x0 = c.x0, x1 = c.x0 + CHUNK;
  const z = br.z;
  // only the half of the bridge belonging to this chunk row (bridge sits on the edge between two rows)
  const north = Math.abs(z - c.z0) < 1; // bridge on our north edge → we own z in [z, z+half]
  const za = north ? z : z - 10, zb = north ? z + 10 : z;
  if (id === 'kessler') {
    const destroyed = facts.has('kessler_bridge.destroyed', era);
    if (era >= 1 && destroyed) {
      // only broken piers remain
      for (let x = x0 + 16; x < x1; x += 48) {
        g.box(x - 2, -10, za + 1, x + 2, -1 - (era === 2 ? 2 : 0), zb - 1, C('#8a8478'), [L.concrete, -1, 0, 0]);
      }
      return;
    }
    if (era === 0 && destroyed) {
      // freshly destroyed: twisted girders in the water
      for (let x = x0 + 8; x < x1; x += 24) g.boxRot(x, -2, (za + zb) / 2, 6, 0.4, 3, 0.3, C('#5a4a40'), [L.rust, -1, 0, 0]);
      return;
    }
    const deckY = 0.15;
    const ruin = era === 2;
    // deck
    for (let x = x0; x < x1; x += 8) {
      if (ruin && ctx.rng.chance(0.18)) continue; // holes in the deck
      g.box(x, deckY - 1.2, za, x + 8, deckY, zb, era === 1 ? C('#9a9ea4') : C('#a8a49c'), [L.asphalt, -1, 0, 0], { topM: [L.asphalt, -1, 0, 0] });
      ctx.collider(x, deckY - 1.2, za, x + 8, deckY, zb, CF.SOLID, SURF.asphalt);
    }
    // truss (1996 & ruin) / cables (2047)
    const steel = era === 0 ? C('#3a6a8a') : era === 1 ? C('#d8dce0') : C('#7a5040');
    const lay = era === 2 ? L.rust : L.paint;
    const ez = north ? zb - 0.4 : za + 0.4;
    if (era !== 1) {
      for (let x = x0; x < x1; x += 12) {
        g.tube(x, deckY, ez, x + 12, deckY + 9, ez, 0.18, 0.18, 4, steel, [lay, -1, 0, 0]);
        g.tube(x, deckY + 9, ez, x + 12, deckY, ez, 0.18, 0.18, 4, steel, [lay, -1, 0, 0]);
        g.tube(x, deckY, ez, x, deckY + 9, ez, 0.22, 0.22, 4, steel, [lay, -1, 0, 0]);
      }
      g.box(x0, deckY + 8.8, ez - 0.3, x1, deckY + 9.4, ez + 0.3, steel, [lay, -1, 0, 0]);
      ctx.collider(x0, deckY, ez - 0.3, x1, deckY + 9.4, ez + 0.3, CF.SOLID | CF.NOCAM | CF.CLIMB, SURF.metal);
    } else {
      g.box(x0, deckY, ez - 0.25, x1, deckY + 1.1, ez + 0.25, steel, [L.metal, -1, 0, 0]);
      ctx.collider(x0, deckY, ez - 0.25, x1, deckY + 1.1, ez + 0.25, CF.SOLID, SURF.metal);
      ctx.geo.get('emissive').box(x0, deckY + 1.1, ez - 0.05, x1, deckY + 1.18, ez + 0.05, [0.4, 2.6, 3.2], [0, 2, 0.2, 0]);
    }
    // piers
    for (let x = x0 + 16; x < x1; x += 48) g.box(x - 2, -10, za + 1, x + 2, deckY - 1.2, zb - 1, C('#8a8478'), [L.concrete, -1, 0, 0]);
    ctx.lanes.push(north ? { ax: x0, az: z + 2, bx: x1, bz: z + 2, road: 'avenue' } : { ax: x1, az: z - 2, bx: x0, bz: z - 2, road: 'avenue' });
  } else if (id === 'skyway') {
    if (era === 0) return; // not built until 2040s
    const deckY = 0.15;
    const ruin = era === 2;
    for (let x = x0; x < x1; x += 8) {
      if (ruin && (x - x0) > 30 && (x - x0) < 60) continue; // collapsed centre span
      g.box(x, deckY - 1.5, za, x + 8, deckY, zb, C('#c8ccd0'), [L.asphalt, -1, 0, 0]);
      ctx.collider(x, deckY - 1.5, za, x + 8, deckY, zb, CF.SOLID, SURF.asphalt);
    }
    // pylon near the river centre with stay cables
    const px = 480;
    if (px >= x0 && px < x1 && north) {
      g.box(px - 1.5, -10, z - 3, px + 1.5, 70, z + 3, C('#e8ecef'), [L.concrete, -1, 0, 0]);
      if (era === 1) ctx.geo.get('emissive').box(px - 1.55, 64, z - 3.05, px + 1.55, 66, z + 3.05, [3, 0.5, 2.5], [0, 2, 0.4, 0]);
      for (let k = 1; k <= 6; k++) {
        g.tube(px, 68 - k * 3, z, px - k * 10, deckY + 0.5, z + 9, 0.08, 0.08, 4, C('#d8d8d8'), [L.metal, -1, 0, 0]);
        g.tube(px, 68 - k * 3, z, px + k * 10, deckY + 0.5, z + 9, 0.08, 0.08, 4, C('#d8d8d8'), [L.metal, -1, 0, 0]);
      }
      ctx.collider(px - 1.5, -10, z - 3, px + 1.5, 70, z + 3, CF.SOLID, SURF.concrete);
    }
  } else if (id === 'rail') {
    const deckY = 1.5;
    if (era === 2) {
      for (let x = x0 + 16; x < x1; x += 48) g.box(x - 2, -10, za + 2, x + 2, deckY - 1, zb - 2, C('#8a8478'), [L.concrete, -1, 0, 0]);
      return;
    }
    for (let x = x0; x < x1; x += 8) {
      g.box(x, deckY - 1, za + 2, x + 8, deckY, zb - 2, C('#6a6460'), [L.concrete, -1, 0, 0]);
      ctx.collider(x, deckY - 1, za + 2, x + 8, deckY, zb - 2, CF.SOLID, SURF.concrete);
    }
    for (let x = x0 + 16; x < x1; x += 48) g.box(x - 2, -10, za + 2, x + 2, deckY - 1, zb - 2, C('#8a8478'), [L.concrete, -1, 0, 0]);
    const rc = era === 1 ? C('#e8ecef') : C('#4a4440');
    g.box(x0, deckY, (za + zb) / 2 - 1.2, x1, deckY + 0.2, (za + zb) / 2 - 1.0, rc, [L.metal, -1, 0, 0]);
    g.box(x0, deckY, (za + zb) / 2 + 1.0, x1, deckY + 0.2, (za + zb) / 2 + 1.2, rc, [L.metal, -1, 0, 0]);
  }
}

// ---------------------------------------------------- highway corridor ----
function buildHighwayChunk(ctx, c, era) {
  const g = ctx.geo.get('ground');
  const u = ctx.geo.get('uber');
  const x0 = c.x0, z0 = c.z0, x1 = c.x0 + CHUNK, z1 = c.z0 + CHUNK;
  const hx = HIGHWAY_X;
  const tf = trenchFactor(c.cz);
  const inTrench = tf > 0.5;
  const r = ctx.rng;
  // highway surface (follows profile)
  const am = [L.asphalt, -1, 0, 0];
  const acol = era === 2 ? C('#a8a898') : C('#ffffff');
  const segs = 12;
  for (let i = 0; i < segs; i++) {
    const za = z0 + (CHUNK * i) / segs, zb = z0 + (CHUNK * (i + 1)) / segs;
    const ya = highwayRoadY(za), yb = highwayRoadY(zb);
    g.quad([hx - TRENCH_HALF, ya, za], [hx - TRENCH_HALF, yb, zb], [hx + TRENCH_HALF, yb, zb], [hx + TRENCH_HALF, ya, za], [0, 1, 0],
      [hx - TRENCH_HALF, za], [hx - TRENCH_HALF, zb], [hx + TRENCH_HALF, zb], [hx + TRENCH_HALF, za], acol, am);
    // centre median barrier
    if (era < 2 || r.chance(0.6)) {
      u.box(hx - 0.3, Math.min(ya, yb), za, hx + 0.3, Math.min(ya, yb) + 0.9, zb, C('#c8c4bc'), [L.concrete, -1, 0, 0]);
      ctx.collider(hx - 0.3, Math.min(ya, yb) - 0.5, za, hx + 0.3, Math.min(ya, yb) + 0.9, zb, CF.SOLID, SURF.concrete);
    }
  }
  // lane markings
  if (era < 2) {
    for (const lx of [hx - 4, hx - 8, hx + 4, hx + 8]) {
      for (let z = z0 + 2; z < z1; z += 10) {
        const y = highwayRoadY(z) + 0.02;
        g.quad([lx - 0.08, y, z + 4], [lx + 0.08, y, z + 4], [lx + 0.08, y, z], [lx - 0.08, y, z], [0, 1, 0], [0, 0], [1, 0], [1, 1], [0, 1], C('#f0f0e8'), [L.paint, -1, 0, 0]);
      }
    }
  }
  // lanes for traffic: southbound on west side (right-hand traffic → southbound uses +x side? heading +z, right side is -x)
  for (const off of [2, 6, 10]) {
    ctx.lanes.push({ ax: hx - off, az: z0, bx: hx - off, bz: z1, road: 'highway', hw: true });
    ctx.lanes.push({ ax: hx + off, az: z1, bx: hx + off, bz: z0, road: 'highway', hw: true });
  }
  if (inTrench) {
    // retaining walls
    const wy0 = TRENCH_Y - 0.5;
    for (const side of [-1, 1]) {
      const wx = hx + side * TRENCH_HALF;
      const xa = side < 0 ? wx - 1 : wx, xb = side < 0 ? wx : wx + 1;
      u.box(xa, wy0, z0, xb, 0.9, z1, C('#c8c0b0'), [L.concrete, -1, 0, 0], { faces: side < 0 ? 1 | 4 : 2 | 4 });
      ctx.collider(xa, wy0, z0, xb, 0.9, z1, CF.SOLID, SURF.concrete);
      if (era === 2) {
        for (let k = 0; k < 4; k++) placeProp(ctx, 'ivy', wx + (side < 0 ? 0.05 : -0.05), 0.5, z0 + r.range(5, 90), side < 0 ? Math.PI / 2 : -Math.PI / 2, r.range(1, 1.6), null, { noCollide: true });
      }
    }
    // frontage ground on both sides at street level
    const fg = era === 2 ? C('#a8c890') : C('#d8e8c0');
    for (const [a, b] of [[x0, hx - TRENCH_HALF - 1], [hx + TRENCH_HALF + 1, x1]]) {
      u.box(a, -0.3, z0, b, 0.15, z1, fg, [L.grass, -1, 0, 0], { faces: 4 });
      ctx.collider(a, -0.3, z0, b, 0.15, z1, CF.SOLID, SURF.grass);
      for (let i = 0; i < 4; i++) ctx.tree(a + 3 + r.next() * (b - a - 6), 0.15, z0 + 5 + r.next() * (CHUNK - 10), r, era === 2 ? 1.4 : 1);
    }
    // overpass bridges on chunk edges (cross streets)
    for (const zz of [z0]) {
      const roadW = 10;
      u.box(hx - TRENCH_HALF - 1, -1.0, zz - roadW, hx + TRENCH_HALF + 1, 0.0, zz + roadW, C('#b8b4ac'), [L.concrete, -1, 0, 0]);
      g.quad([hx - TRENCH_HALF - 1, 0.01, zz + 6.5], [hx + TRENCH_HALF + 1, 0.01, zz + 6.5], [hx + TRENCH_HALF + 1, 0.01, zz - 6.5], [hx - TRENCH_HALF - 1, 0.01, zz - 6.5], [0, 1, 0], [0, 0], [1, 0], [1, 1], [0, 1], acol, am);
      ctx.collider(hx - TRENCH_HALF - 1, -1.0, zz - roadW, hx + TRENCH_HALF + 1, 0.0, zz + roadW, CF.SOLID, SURF.asphalt);
      for (const s of [-1, 1]) {
        u.box(hx - TRENCH_HALF - 1, 0, zz + s * roadW - 0.25, hx + TRENCH_HALF + 1, 1.1, zz + s * roadW + 0.25, C('#c8c4bc'), [L.concrete, -1, 0, 0]);
        ctx.collider(hx - TRENCH_HALF - 1, 0, zz + s * roadW - 0.25, hx + TRENCH_HALF + 1, 1.1, zz + s * roadW + 0.25, CF.SOLID, SURF.concrete);
      }
      // E-W lanes across the overpass
      ctx.lanes.push({ ax: x0, az: zz + 1.7, bx: x1, bz: zz + 1.7, road: 'avenue' });
      ctx.lanes.push({ ax: x1, az: zz - 1.7, bx: x0, bz: zz - 1.7, road: 'avenue' });
    }
    if (era === 2) {
      for (let i = 0; i < 5; i++) ctx.tree(hx + r.range(-12, 12), TRENCH_Y, z0 + r.range(5, 90), r, 1.4);
      for (let i = 0; i < 3; i++) placeProp(ctx, 'wreck_' + r.int(0, 3), hx + r.range(-12, 12), TRENCH_Y, z0 + r.range(5, 90), r.range(-0.5, 0.5));
    }
  } else {
    // outside the city: embankments follow the terrain
    terrainPatch(ctx, c, era, 8, (x) => Math.abs(x - hx) < TRENCH_HALF + 0.5);
    for (let i = 0; i < 10; i++) {
      const x = x0 + r.next() * CHUNK, z = z0 + r.next() * CHUNK;
      if (Math.abs(x - hx) < 26) continue;
      ctx.tree(x, terrainHeight(x, z), z, r, era === 2 ? 1.3 : 1);
    }
    // guard rails
    if (era < 2) {
      for (let z = z0 + 2; z < z1; z += 4) {
        for (const s of [-1, 1]) placeProp(ctx, 'railing', hx + s * (TRENCH_HALF - 0.4), highwayRoadY(z + 2), z + 2, Math.PI / 2, 1, null);
      }
    }
  }
  // 2047 elevated deck above Route 9 (a double-decker freeway); ruined in 2189
  if (era >= 1) buildElevatedDeck(ctx, c, era);
  // street lamps along the trench
  if (era < 2) for (let z = z0 + 12; z < z1; z += 32) placeProp(ctx, era === 0 ? 'lamp96' : 'lamp47', hx - 0.6, highwayRoadY(z) + 0.9, z, -Math.PI / 2);
}

const DECK_Y = 15;
function deckProfile(z) {
  // ramps up from ground at the city edges
  const up = THREE.MathUtils.smoothstep(z, -900, -760) * (1 - THREE.MathUtils.smoothstep(z, 700, 840));
  const ground = highwayRoadY(z) + 0.2;
  return ground + (DECK_Y - ground) * up;
}
function buildElevatedDeck(ctx, c, era) {
  const u = ctx.geo.get('uber');
  const x0 = HIGHWAY_X - 13, x1 = HIGHWAY_X + 13;
  const z0 = c.z0, z1 = c.z0 + CHUNK;
  const r = new RNG(hash2i(c.ci, c.cj, 4747));
  const ruin = era === 2;
  for (let z = z0; z < z1; z += 8) {
    const ya = deckProfile(z), yb = deckProfile(z + 8);
    const collapsed = ruin && r.next() < 0.35;
    if (!collapsed) {
      // deck slab
      u.quad([x0, ya, z], [x0, yb, z + 8], [x1, yb, z + 8], [x1, ya, z], [0, 1, 0], [x0, z], [x0, z + 8], [x1, z + 8], [x1, z], ruin ? C('#a8a898') : C('#9a9ea4'), [L.asphalt, -1, 0, 0]);
      u.quad([x1, ya - 1.6, z], [x1, yb - 1.6, z + 8], [x0, yb - 1.6, z + 8], [x0, ya - 1.6, z], [0, -1, 0], [0, 0], [1, 0], [1, 1], [0, 1], C('#8a8c90'), [L.concrete, -1, 0, 0]);
      u.box(x0 - 0.4, Math.min(ya, yb) - 1.6, z, x0, Math.max(ya, yb) + 1.0, z + 8, C('#d8dce0'), [L.concrete, -1, 0, 0]);
      u.box(x1, Math.min(ya, yb) - 1.6, z, x1 + 0.4, Math.max(ya, yb) + 1.0, z + 8, C('#d8dce0'), [L.concrete, -1, 0, 0]);
      const col = ctx.ramp(x0, z, x1, z + 8, ya, yb, 'z', SURF.asphalt);
      col.minY = Math.min(ya, yb) - 1.6;
      ctx.collider(x0 - 0.4, Math.min(ya, yb) - 1.6, z, x0, Math.max(ya, yb) + 1.0, z + 8, CF.SOLID, SURF.concrete);
      ctx.collider(x1, Math.min(ya, yb) - 1.6, z, x1 + 0.4, Math.max(ya, yb) + 1.0, z + 8, CF.SOLID, SURF.concrete);
      if (era === 1) {
        ctx.geo.get('emissive').box(x0 - 0.42, Math.max(ya, yb) + 0.9, z, x0 - 0.38, Math.max(ya, yb) + 1.0, z + 8, [0.5, 2.6, 3.4], [0, 2, 0.1, 0]);
        ctx.geo.get('emissive').box(x1 + 0.38, Math.max(ya, yb) + 0.9, z, x1 + 0.42, Math.max(ya, yb) + 1.0, z + 8, [3.2, 0.5, 2.6], [0, 2, 0.6, 0]);
      }
    } else {
      // fallen slab tilted into the trench
      const yb2 = highwayRoadY(z + 4) + 1.0;
      u.boxRot(HIGHWAY_X + r.range(-3, 3), (ya + yb2) / 2, z + 4, 12, 0.8, 4, r.range(-0.2, 0.2), C('#9a9a8e'), [L.concrete, -1, 0, 0]);
      placeProp(ctx, 'rubble_' + r.int(0, 3), HIGHWAY_X + r.range(-8, 8), highwayRoadY(z + 4), z + 4, r.range(0, 6), 1.8);
    }
    // pillars every 24 m
    if (Math.round(z) % 24 === 0 && ya > 4) {
      const gy = highwayRoadY(z);
      for (const px of [HIGHWAY_X - 7, HIGHWAY_X + 7]) {
        u.box(px - 1.0, gy, z - 1.0, px + 1.0, ya - 1.6, z + 1.0, C('#c8c8c4'), [L.concrete, -1, 0, 0]);
        ctx.collider(px - 1.0, gy, z - 1.0, px + 1.0, ya - 1.6, z + 1.0, CF.SOLID, SURF.concrete);
        if (ruin) placeProp(ctx, 'ivy', px + 1.05, ya - 2, z, Math.PI / 2, 1.2, null, { noCollide: true });
      }
    }
  }
  if (era === 1) {
    for (const off of [3, 7, 10]) {
      ctx.lanes.push({ ax: HIGHWAY_X - off, az: z0, bx: HIGHWAY_X - off, bz: z1, road: 'skyway', deck: true });
      ctx.lanes.push({ ax: HIGHWAY_X + off, az: z1, bx: HIGHWAY_X + off, bz: z0, road: 'skyway', deck: true });
    }
  }
}

// --------------------------------------------------------- wilderness -----
function terrainPatch(ctx, c, era, step = 4, skip = null) {
  const g = ctx.geo.get('ground');
  const x0 = c.x0, z0 = c.z0;
  const n = Math.ceil(CHUNK / step);
  const base = g.vcount;
  const tint = era === 2 ? C('#b8d8a0') : era === 1 ? C('#d0dcc0') : C('#e0ecc8');
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const x = x0 + i * step, z = z0 + j * step;
      const y = terrainHeight(x, z);
      const e = 1;
      const hx = terrainHeight(x + e, z) - terrainHeight(x - e, z), hz = terrainHeight(x, z + e) - terrainHeight(x, z - e);
      const nl = Math.hypot(hx, 2 * e, hz);
      g.vert(x, y, z, -hx / nl, (2 * e) / nl, -hz / nl, x, z, tint[0], tint[1], tint[2], L.grass, -2, 0, 0);
    }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      if (skip && skip(x0 + (i + 0.5) * step, z0 + (j + 0.5) * step)) continue;
      const a = base + j * (n + 1) + i;
      g.tri(a, a + n + 1, a + n + 2);
      g.tri(a, a + n + 2, a + 1);
    }
  }
}

function buildWildChunk(ctx, c, era, lm) {
  terrainPatch(ctx, c, era, 4);
  const r = new RNG(hash2i(c.ci, c.cj, 31)); // same forest layout in every era
  const d = c.district;
  const density = d === 'F' ? 70 : 28;
  for (let i = 0; i < density; i++) {
    const x = c.x0 + r.next() * CHUNK, z = c.z0 + r.next() * CHUNK;
    const h = terrainHeight(x, z);
    const roll = r.next();
    const kind = r.next();
    const rot = r.range(0, 6);
    const sc = r.range(0.8, 1.3);
    if (h < WATER_Y[era] + 0.3) continue;
    // 1996: some patches are logged; 2047: outskirts developed; 2189: denser, bigger
    if (era === 0 && roll < 0.05) continue;
    if (era === 1 && roll < 0.12) continue;
    if (kind < 0.45) placeProp(ctx, 'tree_pine_' + r.int(0, 2), x, h - 0.2, z, rot, sc * (era === 2 ? 1.35 : 1));
    else if (kind < 0.75) placeProp(ctx, (era === 2 && roll > 0.85 ? 'tree_giant_' + r.int(0, 1) : 'tree_' + r.pick(['oak', 'maple', 'birch', 'autumn']) + '_' + r.int(0, 2)), x, h - 0.2, z, rot, era === 2 && roll > 0.85 ? 0.6 : sc);
    else if (kind < 0.88) placeProp(ctx, 'rock_' + r.int(0, 2), x, h - 0.3, z, rot, r.range(0.6, 2.2));
    else placeProp(ctx, 'bush_' + r.int(0, 2), x, h, z, rot, sc, null, { noCollide: true });
  }
  // grass tufts
  for (let i = 0; i < (era === 2 ? 60 : 30); i++) {
    const x = c.x0 + r.next() * CHUNK, z = c.z0 + r.next() * CHUNK;
    const h = terrainHeight(x, z);
    if (h < WATER_Y[era]) continue;
    placeProp(ctx, 'grass_tuft', x, h, z, r.range(0, 6), r.range(0.9, 1.6), null, { noCollide: true });
  }
  if (lm) buildLandmark(lm, ctx, c, era);
}

// ---------------------------------------------------------------------------
// Far LOD: every building in the city as simple boxes, one mesh per era
// ---------------------------------------------------------------------------
export function buildFarLod(era, facts) {
  const gb = new GeoBuffer();
  for (let cj = 0; cj < GRID; cj++) {
    for (let ci = 0; ci < GRID; ci++) {
      const d = district(ci, cj);
      if (!URBAN.has(d) || d === 'H') continue;
      gb.setChunk(ci, cj);
      const lm = landmarkAt(ci, cj);
      if (lm) { landmarkFar(lm, gb, ci, cj, era, facts); continue; }
      for (const lot of lotsForChunk(ci, cj)) {
        lot.flat = d !== 'W';
        emitLotFar(gb, lot, era, facts);
      }
    }
  }
  return gb.build();
}

// Far terrain: whole map at 16 m resolution with district tint
export function buildFarTerrain(era) {
  const step = 16;
  const n = (HALF * 2) / step;
  const gb = new GeoBuffer();
  const ext = 1200; // skirt beyond the map edge
  const N = n + 2;
  const base = gb.vcount;
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      let x = -HALF + (i - 1) * step, z = -HALF + (j - 1) * step;
      if (i === 0) x = -HALF - ext; if (i === N) x = HALF + ext;
      if (j === 0) z = -HALF - ext; if (j === N) z = HALF + ext;
      const cx = clamp(x, -HALF, HALF - 1), cz = clamp(z, -HALF, HALF - 1);
      let y = terrainHeight(cx, cz);
      if (i === 0 || i === N || j === 0 || j === N) y = Math.max(y, 120);
      const cc = chunkCoord(cx, cz);
      const d = district(cc.ci, cc.cj);
      const e = 4;
      const hx = terrainHeight(cx + e, cz) - terrainHeight(cx - e, cz), hz = terrainHeight(cx, cz + e) - terrainHeight(cx, cz - e);
      const nl = Math.hypot(hx, 2 * e, hz);
      let tint = era === 2 ? [0.72, 0.85, 0.62] : [0.85, 0.9, 0.78];
      let layer = L.grass, style = -2;
      if (URBAN.has(d) && d !== 'P' && d !== 'S' && d !== 'W') { tint = era === 2 ? [0.55, 0.6, 0.5] : [0.42, 0.42, 0.44]; layer = L.asphalt; style = -1; }
      gb.setChunk(cc.ci, cc.cj);
      gb.vert(x, y, z, -hx / nl, (2 * e) / nl, -hz / nl, x, z, tint[0], tint[1], tint[2], layer, style, 0, 0);
    }
  }
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const a = base + j * (N + 1) + i;
      gb.tri(a, a + N + 1, a + N + 2);
      gb.tri(a, a + N + 2, a + 1);
    }
  }
  return gb.build();
}

// Far forest: instanced simple trees over wild chunks (masked in near chunks)
export function buildFarForest(era) {
  const pts = [];
  for (let cj = 0; cj < GRID; cj++) {
    for (let ci = 0; ci < GRID; ci++) {
      const d = district(ci, cj);
      if (d !== 'F' && d !== 'M' && d !== 'P') continue;
      const r = new RNG(hash2i(ci, cj, 31));
      const o = chunkOrigin(ci, cj);
      const n = d === 'F' ? 26 : d === 'P' ? 10 : 10;
      for (let i = 0; i < n; i++) {
        const x = o.x + r.next() * CHUNK, z = o.z + r.next() * CHUNK;
        const h = terrainHeight(x, z);
        if (h < WATER_Y[era] + 0.5) continue;
        pts.push([x, h, z, r.range(0.8, 1.4) * (era === 2 ? 1.3 : 1), ci, cj, r.next()]);
      }
    }
  }
  return pts;
}
