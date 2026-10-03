// Hand-authored landmark chunks. Each builds all three eras and consults the
// Chronicle for cause-and-effect variants.
import * as THREE from 'three';
import { lotsForChunk, district, chunkOrigin, CHUNK, blockRect, terrainHeight } from './layout.js';
import { emitLot, emitLotFar } from './buildings.js';
import { placeProp } from './props.js';
import { signQuad } from './signs.js';
import { LAYER as L } from './textures.js';
import { CF, SURF } from './collision.js';
import { RNG } from '../core/mathx.js';

const GENERATORS = {};
const FAR = {};
const C = (hex) => { const c = new THREE.Color(hex); return [c.r, c.g, c.b]; };
const M = (l, style = -1, seed = 0, w = 0) => [l, style, seed, w];

export function registerLandmark(id, gen, far) {
  GENERATORS[id] = gen;
  if (far) FAR[id] = far;
}

function genericLots(ctx, c, era, skip = null) {
  const flat = district(c.ci, c.cj) !== 'W';
  for (const lot of lotsForChunk(c.ci, c.cj)) {
    lot.flat = flat;
    if (skip && skip(lot)) continue;
    emitLot(ctx, lot, era);
  }
}
function genericFar(gb, ci, cj, era, facts, skip = null) {
  const flat = district(ci, cj) !== 'W';
  for (const lot of lotsForChunk(ci, cj)) {
    lot.flat = flat;
    if (skip && skip(lot)) continue;
    emitLotFar(gb, lot, era, facts);
  }
}
const overlaps = (lot, r) => !(lot.x1 <= r.x0 || lot.x0 >= r.x1 || lot.z1 <= r.z0 || lot.z0 >= r.z1);

export function buildLandmark(id, ctx, c, era) {
  const gen = GENERATORS[id];
  if (gen) { gen(ctx, c, era); return; }
  genericLots(ctx, c, era);
}
export function landmarkFar(id, gb, ci, cj, era, facts) {
  const f = FAR[id];
  if (f) { f(gb, ci, cj, era, facts); return; }
  genericFar(gb, ci, cj, era, facts);
}

// Interactable registration helper
function interact(ctx, x, y, z, r, id, label, extra = {}) {
  ctx.interact.push({ x, y, z, r, id, label, era: ctx.era, ...extra });
}

// ===========================================================================
// HOME BLOCK — Calloway Block. The vacant lot on the south side is where the
// player plants the seed in 1996; by 2189 it's a colossal climbable tree.
// ===========================================================================
export function seedLotRect(ci, cj) {
  const b = blockRect(ci, cj);
  const cx = (b.x0 + b.x1) / 2;
  return { x0: cx - 15, x1: cx + 15, z0: b.z1 - 26, z1: b.z1 };
}

function homeGen(ctx, c, era) {
  const f = ctx.facts;
  const seed = seedLotRect(c.ci, c.cj);
  genericLots(ctx, c, era, (lot) => overlaps(lot, seed));
  const g = ctx.geo.get('uber');
  const y0 = 0.15;
  const cx = (seed.x0 + seed.x1) / 2, cz = (seed.z0 + seed.z1) / 2;
  const planted = f.get('home.tree', era);
  const r = new RNG(4242 + era);
  // ground
  const groundLayer = era === 0 ? L.dirt : era === 1 ? (planted ? L.grass : L.concrete) : L.grass;
  g.quad([seed.x0, y0 + 0.01, seed.z1], [seed.x1, y0 + 0.01, seed.z1], [seed.x1, y0 + 0.01, seed.z0], [seed.x0, y0 + 0.01, seed.z0], [0, 1, 0],
    [seed.x0, seed.z1], [seed.x1, seed.z1], [seed.x1, seed.z0], [seed.x0, seed.z0], era === 2 ? C('#a8c890') : C('#ffffff'), M(groundLayer));
  if (era === 0) {
    // vacant lot: chain-link fence with a gap, weeds, burned-out car, junk
    for (let x = seed.x0 + 2; x < seed.x1 - 2; x += 4) if (Math.abs(x + 2 - cx) > 3) placeProp(ctx, 'fence_chain', x + 2, y0, seed.z1 - 0.5, 0);
    for (let z = seed.z0 + 2; z < seed.z1 - 2; z += 4) { placeProp(ctx, 'fence_chain', seed.x0 + 0.5, y0, z + 2, Math.PI / 2); placeProp(ctx, 'fence_chain', seed.x1 - 0.5, y0, z + 2, Math.PI / 2); }
    placeProp(ctx, 'wreck_1', seed.x0 + 6, y0, seed.z0 + 6, 0.6);
    for (let i = 0; i < 18; i++) placeProp(ctx, 'grass_tuft', seed.x0 + 1 + r.next() * 28, y0, seed.z0 + 1 + r.next() * 24, r.range(0, 6), r.range(0.8, 1.5), null, { noCollide: true });
    placeProp(ctx, 'pallet', seed.x1 - 5, y0, seed.z0 + 4, 0.3);
    placeProp(ctx, 'drum', seed.x1 - 3, y0, seed.z0 + 7);
    placeProp(ctx, 'billboard', seed.x1 - 4, y0, seed.z0 + 1.2, 0);
    if (planted) placeProp(ctx, 'bush_2', cx, y0, cz, 0, 0.35, null, { noCollide: true }); // sapling
    interact(ctx, cx, y0 + 0.5, cz, 3.5, 'plant_home', 'Plant the seed', { cond: 'canPlantHome' });
  } else if (era === 1) {
    if (planted) {
      // Calloway Memorial Garden around the 51-year-old oak
      placeProp(ctx, 'tree_oak_0', cx, y0, cz, 0.5, 2.2);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; placeProp(ctx, 'bench', cx + Math.cos(a) * 9, y0, cz + Math.sin(a) * 9, -a + Math.PI / 2); }
      placeProp(ctx, 'fence_glass', cx, y0, seed.z1 - 0.5, 0);
      g.box(cx - 5, y0, cz - 5, cx + 5, y0 + 0.5, cz + 5, C('#d8dce0'), M(L.stone), { faces: 1 | 2 | 16 | 32 | 4, topM: M(L.grass), topCol: C('#c0e0a0') });
      ctx.collider(cx - 5, y0, cz - 5, cx + 5, y0 + 0.5, cz + 5, CF.SOLID, SURF.grass);
      signQuad(ctx.geo.get('holo'), ctx.signs.get('s:CALLOWAY'), cx, y0 + 3.2, seed.z1 - 1, 0, 1, 6, 1.5, [1.4, 1.4, 1.4], 0, 0);
    } else {
      // Pinnacle micro-living tower
      g.box(seed.x0 + 3, y0 - 1, seed.z0 + 3, seed.x1 - 3, y0 + 96, seed.z1 - 3, C('#e8ecf0'), M(L.panel, 6 + 10, 0.37, 3.2), { vBase: y0, topM: M(L.gravel) });
      ctx.collider(seed.x0 + 3, y0 - 1, seed.z0 + 3, seed.x1 - 3, y0 + 96, seed.z1 - 3);
      ctx.geo.get('emissive').box(seed.x0 + 2.8, y0 + 4, seed.z1 - 3.2, seed.x0 + 3.1, y0 + 96, seed.z1 - 2.9, [3, 0.5, 2.5], [0, 2, 0.2, 0]);
    }
  } else {
    if (planted) {
      // The colossus: a two-century tree you can climb to the city's canopy
      const s = 2.4;
      placeProp(ctx, 'tree_giant_1', cx, y0, cz, 0.3, s, null, { noCollide: true });
      const trunkR = 1.1 * s, h = 20 * s;
      ctx.collider(cx - trunkR, y0, cz - trunkR, cx + trunkR, h * 0.86, cz + trunkR, CF.SOLID | CF.CLIMB, SURF.wood);
      // canopy platform (walkable branches)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + 0.4;
        const bx = cx + Math.cos(a) * 6, bz = cz + Math.sin(a) * 6;
        ctx.collider(Math.min(cx, bx) - 1.2, h * 0.86 - 0.6, Math.min(cz, bz) - 1.2, Math.max(cx, bx) + 1.2, h * 0.86, Math.max(cz, bz) + 1.2, CF.SOLID | CF.NOCAM, SURF.wood);
        g.tube(cx, h * 0.86 - 0.3, cz, bx, h * 0.86 - 0.3, bz, 0.9, 0.5, 6, C('#6e6252'), M(L.bark));
      }
      interact(ctx, cx, h * 0.86 + 0.5, cz, 4, 'canopy', 'Survey the city', { cond: 'atCanopy' });
      // roots cracking the street
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.tube(cx + Math.cos(a) * 2, y0 + 1.2, cz + Math.sin(a) * 2, cx + Math.cos(a) * 13, y0 - 0.3, cz + Math.sin(a) * 13, 1.0, 0.25, 6, C('#6e6252'), M(L.bark));
      }
      for (let i = 0; i < 20; i++) placeProp(ctx, 'bush_' + r.int(0, 2), seed.x0 + r.next() * 30, y0, seed.z0 + r.next() * 26, r.range(0, 6), r.range(1, 1.8), null, { noCollide: true });
    } else {
      for (let i = 0; i < 9; i++) placeProp(ctx, 'rubble_' + r.int(0, 3), seed.x0 + 4 + r.next() * 22, y0, seed.z0 + 4 + r.next() * 18, r.range(0, 6), r.range(1.6, 2.8));
      g.box(seed.x0 + 5, y0 - 1, seed.z0 + 6, seed.x0 + 14, y0 + 14, seed.z0 + 15, C('#a8aca8'), M(L.panel, 7, 0.4, 3.2), { vBase: y0 });
      ctx.collider(seed.x0 + 5, y0 - 1, seed.z0 + 6, seed.x0 + 14, y0 + 14, seed.z0 + 15);
    }
  }
  // Neon Galaxy arcade sign + Tommy marker on the north-east corner of the block (1996)
  const b = blockRect(c.ci, c.cj);
  if (era === 0) {
    signQuad(ctx.geo.get('sign'), ctx.signs.get('s:NEON GALAXY'), b.x1 - 10, 5.4, b.z0 - 0.15, 0, -1, 9, 2.2, [1.2, 1.2, 1.2], 2, 0.3);
  } else if (era === 1) {
    signQuad(ctx.geo.get('holo'), ctx.signs.get("s:OLD TOM'S"), b.x1 - 10, 5.6, b.z0 - 0.6, 0, -1, 9, 2.2, [1.8, 1.8, 1.8], 3, 0.3);
  } else {
    signQuad(ctx.geo.get('sign'), ctx.signs.get('s:TOM.EXE'), b.x1 - 10, 2.6, b.z0 - 0.2, 0, -1, 4, 1, [1.4, 1.6, 1.4], 2, 0.3);
  }
  signQuad(ctx.geo.get('sign'), ctx.signs.get(era === 2 ? 'p:SAFE' : 's:CALLOWAY APTS'), b.x0 + 12, 4.0, b.z0 - 0.15, 0, -1, 6, 1.5, [1, 1, 1], 2, 0.5);
}
function homeFar(gb, ci, cj, era, facts) {
  const seed = seedLotRect(ci, cj);
  genericFar(gb, ci, cj, era, facts, (lot) => overlaps(lot, seed));
  if (era === 1 && !facts.get('home.tree', 1)) gb.box(seed.x0 + 3, -1, seed.z0 + 3, seed.x1 - 3, 96, seed.z1 - 3, C('#e8ecf0'), M(L.panel, 16, 0.37, 3.2), { faces: 1 | 2 | 4 | 16 | 32 });
}
registerLandmark('home', homeGen, homeFar);

// ===========================================================================
// HALVORSEN SITE — 1996 construction skeleton / 2047 Halvorsen Spire / 2189
// the shattered spire. Floor 3 lines up across eras: that's the way in.
// ===========================================================================
export const SPIRE = { floorH: 4.2, f3: 0.15 + 2 * 4.2 };
export function spireRect(ci, cj) {
  const b = blockRect(ci, cj);
  return { x0: b.x0 + 14, x1: b.x1 - 14, z0: b.z0 + 14, z1: b.z1 - 14, b };
}

function halvorsenGen(ctx, c, era) {
  const f = ctx.facts;
  const S = spireRect(c.ci, c.cj);
  const b = S.b;
  const g = ctx.geo.get('uber');
  const e = ctx.geo.get('emissive');
  const y0 = 0.15;
  const prevented = f.has('spire.prevented', era);
  const r = new RNG(777 + era);
  const cx = (S.x0 + S.x1) / 2, cz = (S.z0 + S.z1) / 2;
  const FH = SPIRE.floorH;
  // site ground
  g.quad([b.x0, y0 + 0.01, b.z1], [b.x1, y0 + 0.01, b.z1], [b.x1, y0 + 0.01, b.z0], [b.x0, y0 + 0.01, b.z0], [0, 1, 0], [b.x0, b.z1], [b.x1, b.z1], [b.x1, b.z0], [b.x0, b.z0],
    C('#ffffff'), M(era === 0 ? L.dirt : era === 1 ? L.tiles : L.grass));
  const slab = (x0, z0, x1, z1, y, t = 0.35, col = C('#b8b4ac'), layer = L.concrete) => {
    g.box(x0, y - t, z0, x1, y, z1, col, M(layer), { topM: M(layer) });
    ctx.collider(x0, y - t, z0, x1, y, z1, CF.SOLID, SURF.concrete);
  };
  if (era === 0) {
    if (prevented) {
      // the foundation pit blown, project abandoned
      for (let i = 0; i < 10; i++) placeProp(ctx, 'rubble_' + r.int(0, 3), S.x0 + r.next() * (S.x1 - S.x0), y0, S.z0 + r.next() * (S.z1 - S.z0), r.range(0, 6), 2.2);
      placeProp(ctx, 'crane', S.x1 + 6, y0, S.z0 - 4, 0.6);
      return;
    }
    // site fence with a gate on the north side
    for (let x = b.x0 + 2; x < b.x1 - 2; x += 4) {
      if (Math.abs(x + 2 - cx) > 4) placeProp(ctx, 'fence_chain', x + 2, y0, b.z0 + 1, 0);
      placeProp(ctx, 'fence_chain', x + 2, y0, b.z1 - 1, 0);
    }
    for (let z = b.z0 + 2; z < b.z1 - 2; z += 4) { placeProp(ctx, 'fence_chain', b.x0 + 1, y0, z + 2, Math.PI / 2); placeProp(ctx, 'fence_chain', b.x1 - 1, y0, z + 2, Math.PI / 2); }
    // concrete frame: columns + slabs for 6 floors, top floors unfinished
    const floors = 6;
    for (let fl = 1; fl <= floors; fl++) {
      const y = y0 + fl * FH;
      if (fl <= 4) slab(S.x0, S.z0, S.x1, S.z1, y);
      else slab(S.x0, S.z0, (S.x0 + S.x1) / 2 + 4, S.z1, y);
    }
    for (let x = S.x0; x <= S.x1 + 0.01; x += (S.x1 - S.x0) / 4) {
      for (let z = S.z0; z <= S.z1 + 0.01; z += (S.z1 - S.z0) / 4) {
        const top = x > (S.x0 + S.x1) / 2 + 4 ? 4 : 6;
        g.box(x - 0.4, y0, z - 0.4, x + 0.4, y0 + top * FH, z + 0.4, C('#b8b4ac'), M(L.concrete));
        ctx.collider(x - 0.4, y0, z - 0.4, x + 0.4, y0 + top * FH, z + 0.4);
        // rebar sticking out on top
        g.box(x - 0.05, y0 + top * FH, z - 0.05, x + 0.05, y0 + top * FH + 1.2, z + 0.05, C('#6a4030'), M(L.rust));
      }
    }
    // concrete core with stairs (core walls)
    const kx = cx - 4, kz = cz - 3;
    for (const [x0, z0, x1, z1] of [[kx, kz, kx + 8, kz + 0.3], [kx, kz + 5.7, kx + 8, kz + 6]]) {
      g.box(x0, y0, z0, x1, y0 + 5 * FH, z1, C('#a8a49c'), M(L.concrete));
      ctx.collider(x0, y0, z0, x1, y0 + 5 * FH, z1);
    }
    // partially built floor-3 wall with an open cavity (the dead drop)
    const wy = SPIRE.f3;
    const wx = cx + 6, wz = S.z0 + 6;
    g.box(wx - 3, wy, wz - 0.15, wx - 0.6, wy + 3.4, wz + 0.15, C('#d8d0c0'), M(L.brickTan));
    g.box(wx + 0.6, wy, wz - 0.15, wx + 3, wy + 3.4, wz + 0.15, C('#d8d0c0'), M(L.brickTan));
    g.box(wx - 0.6, wy, wz - 0.15, wx + 0.6, wy + 1.0, wz + 0.15, C('#d8d0c0'), M(L.brickTan));
    g.box(wx - 0.6, wy + 1.6, wz - 0.15, wx + 0.6, wy + 3.4, wz + 0.15, C('#d8d0c0'), M(L.brickTan));
    g.box(wx - 0.55, wy + 1.0, wz - 0.1, wx + 0.55, wy + 1.6, wz + 0.1, C('#2a2a2a'), M(L.metal)); // cable trunk in the cavity
    ctx.collider(wx - 3, wy, wz - 0.15, wx + 3, wy + 3.4, wz + 0.15);
    interact(ctx, wx, wy + 1.3, wz - 0.6, 2.2, 'deaddrop_plant', 'Hide the bypass box in the wall cavity', { cond: 'canPlantDrop' });
    // scaffolding up the east face (climb to floor 3+)
    for (let z = S.z0 + 6; z < S.z1 - 6; z += 4.2) placeProp(ctx, 'scaffold', S.x1 + 0.1, y0, z + 2, Math.PI / 2);
    // crane, site trailer, materials
    placeProp(ctx, 'crane', S.x1 + 6, y0, S.z0 - 4, 0.6);
    placeProp(ctx, 'trailer', b.x0 + 8, y0, b.z1 - 6, 0);
    interact(ctx, b.x0 + 8, y0 + 1, b.z1 - 4.2, 2.4, 'trailer_charges', 'Search the site trailer', { cond: 'trailerAvailable' });
    for (let i = 0; i < 8; i++) placeProp(ctx, r.pick(['pallet', 'drum', 'crate', 'cone', 'barrier']), b.x0 + 4 + r.next() * 20, y0, b.z0 + 6 + r.next() * 30, r.range(0, 6));
    // foundation charges spot (finale)
    interact(ctx, cx, y0 + 0.5, cz + 4, 2.5, 'foundation', 'Set charges on the foundation core', { cond: 'canSabotage' });
    signQuad(ctx.geo.get('sign'), ctx.signs.get('s:HALVORSEN'), cx, 3.2, b.z0 + 0.8, 0, -1, 10, 2.5, [1, 1, 1], 2, 0.1);
    ctx.lights.push({ x: cx, y: 6, z: cz, kind: 'work' });
  } else if (era === 1) {
    if (prevented) {
      // Founders Green: the tower was never built
      for (let i = 0; i < 16; i++) ctx.tree(b.x0 + 4 + r.next() * (b.x1 - b.x0 - 8), y0, b.z0 + 4 + r.next() * (b.z1 - b.z0 - 8), r, 1.2);
      placeProp(ctx, 'fountain', cx, y0, cz);
      placeProp(ctx, 'holopillar', cx + 12, y0, cz);
      return;
    }
    // AEGIS shield perimeter (indestructible energy wall)
    const sh = ctx.geo.get('holo');
    const shieldOn = !f.has('spire.security_down', 1);
    const ring = [[b.x0 + 3, b.z0 + 3, b.x1 - 3, b.z0 + 3.4], [b.x0 + 3, b.z1 - 3.4, b.x1 - 3, b.z1 - 3], [b.x0 + 3, b.z0 + 3, b.x0 + 3.4, b.z1 - 3], [b.x1 - 3.4, b.z0 + 3, b.x1 - 3, b.z1 - 3]];
    for (const [x0, z0, x1, z1] of ring) {
      g.box(x0, y0, z0, x1, y0 + 0.6, z1, C('#2a2f38'), M(L.panel));
      if (shieldOn) {
        sh.box(x0, y0 + 0.6, z0, x1, y0 + 9, z1, [0.3, 1.4, 2.4], [0, 3, 0.2, 0]);
        const col = ctx.collider(x0, y0, z0, x1, y0 + 9, z1, CF.SOLID | CF.NOVAULT, SURF.glass);
        col.data.shield = true;
      }
    }
    // the Spire: podium, then hollow floors 2-4 (interior), then the tower
    const P = { x0: S.x0, z0: S.z0, x1: S.x1, z1: S.z1 };
    const glass = C('#7a9aa8');
    g.box(P.x0, y0 - 1, P.z0, P.x1, y0 + FH * 2 - 0.4, P.z1, C('#1e2228'), M(L.panel, 6 + 10, 0.61, FH), { vBase: y0 });
    ctx.collider(P.x0, y0 - 1, P.z0, P.x1, y0 + FH * 2 - 0.4, P.z1);
    // floor 3 interior shell (y = f3 .. f3 + FH)
    const fy = SPIRE.f3;
    slab(P.x0, P.z0, P.x1, P.z1, fy, 0.4, C('#3a3f48'), L.tiles);
    const wallT = 0.4;
    const walls = [[P.x0, P.z0, P.x1, P.z0 + wallT, 32], [P.x0, P.z1 - wallT, P.x1, P.z1, 16], [P.x0, P.z0, P.x0 + wallT, P.z1, 2], [P.x1 - wallT, P.z0, P.x1, P.z1, 1]];
    for (const [x0, z0, x1, z1, face] of walls) {
      g.box(x0, fy, z0, x1, fy + FH, z1, glass, M(L.metal, 2, 0.61, FH), { vBase: y0 });
      ctx.collider(x0, fy, z0, x1, fy + FH, z1);
      void face;
    }
    // interior: dark corridor walls, server racks, the vault
    const inner = C('#22262e');
    g.box(P.x0 + 0.5, fy + FH - 0.35, P.z0 + 0.5, P.x1 - 0.5, fy + FH, P.z1 - 0.5, inner, M(L.panel), { faces: 8 });
    for (let x = P.x0 + 4; x < P.x1 - 4; x += 5) {
      g.box(x, fy, cz + 4, x + 1.6, fy + 2.4, cz + 5, C('#14161a'), M(L.panel));
      ctx.collider(x, fy, cz + 4, x + 1.6, fy + 2.4, cz + 5);
      e.box(x + 0.1, fy + 0.3, cz + 3.98, x + 1.5, fy + 2.2, cz + 4.0, [0.2, 1.4, 0.6], [0, 4, x * 0.1, 0]);
    }
    e.box(P.x0 + 0.5, fy + FH - 0.4, cz - 0.1, P.x1 - 0.5, fy + FH - 0.36, cz + 0.1, [2.6, 2.8, 3.0], [0, 0, 0, 0]);
    // the aged wall panel where the bypass box has waited 51 years
    const wx = cx + 6, wz = S.z0 + 6;
    g.box(wx - 1.6, fy, wz - 0.2, wx + 1.6, fy + FH, wz + 0.2, C('#3a3f48'), M(L.panel));
    ctx.collider(wx - 1.6, fy, wz - 0.2, wx + 1.6, fy + FH, wz + 0.2);
    if (f.has('deaddrop.planted', 1)) interact(ctx, wx, fy + 1.3, wz - 0.7, 2.2, 'deaddrop_retrieve', 'Pry open the wall panel', { cond: 'canRetrieveDrop' });
    // vault
    const vx = cx - 8, vz = S.z1 - 5;
    g.box(vx - 3, fy, vz, vx + 3, fy + FH, vz + 0.6, C('#4a4f58'), M(L.metal));
    const vaultOpen = f.has('spire.vault_open', 1);
    if (!vaultOpen) {
      const vd = ctx.collider(vx - 1.4, fy, vz - 0.2, vx + 1.4, fy + 3, vz + 0.2, CF.SOLID | CF.NOVAULT, SURF.metal);
      void vd;
      g.box(vx - 1.4, fy, vz - 0.2, vx + 1.4, fy + 3, vz, C('#8a8f98'), M(L.metal));
      e.box(vx - 1.5, fy + 3, vz - 0.25, vx + 1.5, fy + 3.1, vz - 0.2, [3, 0.3, 0.3], [0, 2, 0.5, 0]);
    } else {
      e.box(vx - 1.5, fy + 3, vz - 0.25, vx + 1.5, fy + 3.1, vz - 0.2, [0.3, 3, 0.6], [0, 0, 0.5, 0]);
    }
    if (!f.has('spire.core_taken', 1)) interact(ctx, vx, fy + 1, vz + 1.2, 2.2, 'vault_core', 'Take the Continuum data core', { cond: 'vaultOpen' });
    // security laser grid across the corridor (disabled by the bypass)
    if (!f.has('spire.security_down', 1)) {
      for (let k = 0; k < 4; k++) e.box(cx - 2.5, fy + 0.4 + k * 0.6, P.z0 + 12, cx - 2.45, fy + 0.45 + k * 0.6, P.z1 - 3, [6, 0.2, 0.2], [0, 1, k, 0]);
      const lz = ctx.collider(cx - 2.7, fy, P.z0 + 12, cx - 2.3, fy + 2.8, P.z1 - 3, CF.NOBULLET | CF.NOCAM, SURF.glass);
      lz.data.laser = true;
    }
    // tower above
    const T = { x0: P.x0 + 4, z0: P.z0 + 4, x1: P.x1 - 4, z1: P.z1 - 4 };
    g.box(P.x0, fy + FH, P.z0, P.x1, fy + FH + 0.6, P.z1, C('#1e2228'), M(L.panel));
    g.box(T.x0, fy + FH + 0.6, T.z0, T.x1, 260, T.z1, glass, M(L.metal, 2, 0.83, 3.6), { vBase: y0 });
    ctx.collider(P.x0, fy + FH, P.z0, P.x1, 260, P.z1);
    const K = { x0: T.x0 + 5, z0: T.z0 + 5, x1: T.x1 - 5, z1: T.z1 - 5 };
    g.box(K.x0, 260, K.z0, K.x1, 330, K.z1, glass, M(L.metal, 2, 0.83, 3.6), { vBase: y0 });
    g.box((K.x0 + K.x1) / 2 - 0.5, 330, (K.z0 + K.z1) / 2 - 0.5, (K.x0 + K.x1) / 2 + 0.5, 380, (K.z0 + K.z1) / 2 + 0.5, C('#d8dce0'), M(L.metal));
    e.box((K.x0 + K.x1) / 2 - 0.6, 378, (K.z0 + K.z1) / 2 - 0.6, (K.x0 + K.x1) / 2 + 0.6, 380, (K.z0 + K.z1) / 2 + 0.6, [8, 0.4, 0.4], [0, 4, 0.1, 0]);
    for (const [x, z] of [[T.x0, T.z0], [T.x1, T.z0], [T.x0, T.z1], [T.x1, T.z1]]) e.box(x - 0.2, fy + FH, z - 0.2, x + 0.2, 260, z + 0.2, [3.4, 0.6, 2.8], [0, 2, 0.3, 0]);
    signQuad(ctx.geo.get('holo'), ctx.signs.get('s:HALVORSEN'), cx, 150, T.z0 - 1.5, 0, -1, 30, 7.5, [2.4, 2.4, 2.4], 3, 0.2);
    signQuad(ctx.geo.get('holo'), ctx.signs.get('s:AEGIS'), cx, 7.5, b.z0 + 2.5, 0, -1, 10, 2.5, [2, 2, 2], 3, 0.6);
    // entrance (sealed)
    e.box(cx - 3, y0, P.z0 - 0.06, cx + 3, y0 + 4, P.z0 - 0.04, [0.4, 1.2, 2.0], [0, 2, 0.3, 0]);
    ctx.spawns.push({ x: cx, z: S.z0 + 8, y: fy, kind: 'spireInterior' });
  } else {
    // 2189: the shattered spire — collapse epicentre
    if (prevented) {
      for (let i = 0; i < 26; i++) ctx.tree(b.x0 + 3 + r.next() * (b.x1 - b.x0 - 6), y0, b.z0 + 3 + r.next() * (b.z1 - b.z0 - 6), r, 1.6);
      return;
    }
    const P = { x0: S.x0, z0: S.z0, x1: S.x1, z1: S.z1 };
    g.box(P.x0, y0 - 1, P.z0, P.x1, y0 + FH * 2 - 0.4, P.z1, C('#4a4f48'), M(L.panel, 7, 0.61, FH), { vBase: y0 });
    ctx.collider(P.x0, y0 - 1, P.z0, P.x1, y0 + FH * 2 - 0.4, P.z1);
    slab(P.x0, P.z0, P.x1, P.z1, SPIRE.f3, 0.4, C('#5a5a50'), L.rubble);
    // broken tower stump with jagged walls
    const T = { x0: P.x0 + 4, z0: P.z0 + 4, x1: P.x1 - 4, z1: P.z1 - 4 };
    for (let k = 0; k < 14; k++) {
      const side = k % 4;
      const h = 20 + r.next() * 45;
      const t = r.next();
      let x0, z0, x1, z1;
      if (side === 0) { x0 = T.x0 + t * (T.x1 - T.x0 - 4); x1 = x0 + 4; z0 = T.z0; z1 = T.z0 + 0.6; }
      else if (side === 1) { x0 = T.x0 + t * (T.x1 - T.x0 - 4); x1 = x0 + 4; z0 = T.z1 - 0.6; z1 = T.z1; }
      else if (side === 2) { z0 = T.z0 + t * (T.z1 - T.z0 - 4); z1 = z0 + 4; x0 = T.x0; x1 = T.x0 + 0.6; }
      else { z0 = T.z0 + t * (T.z1 - T.z0 - 4); z1 = z0 + 4; x0 = T.x1 - 0.6; x1 = T.x1; }
      g.box(x0, SPIRE.f3 + FH, z0, x1, SPIRE.f3 + FH + h, z1, C('#5a6a6a'), M(L.metal, 2, 0.83, 3.6), { vBase: y0 });
      ctx.collider(x0, SPIRE.f3 + FH, z0, x1, SPIRE.f3 + FH + h, z1);
    }
    for (let i = 0; i < 16; i++) placeProp(ctx, 'rubble_' + r.int(0, 3), b.x0 + r.next() * (b.x1 - b.x0), y0, b.z0 + r.next() * (b.z1 - b.z0), r.range(0, 6), r.range(1.5, 3.5));
    // rubble ramp up to floor 3 from the north
    ctx.ramp(cx - 5, P.z0 - 14, cx + 5, P.z0, y0, SPIRE.f3, 'z');
    g.quad([cx - 5, y0, P.z0 - 14], [cx - 5, SPIRE.f3, P.z0], [cx + 5, SPIRE.f3, P.z0], [cx + 5, y0, P.z0 - 14], [0, 0.8, -0.6], [0, 0], [0, 14], [10, 14], [10, 0], C('#8a8478'), M(L.rubble));
    // the strange machine core glowing in the ruin
    e.cylinder(cx, SPIRE.f3, cz, 2.5, 1.5, 3, 12, [0.4, 3.5, 2.0], [0, 2, 0.4, 0]);
    for (let i = 0; i < 6; i++) placeProp(ctx, 'ivy', T.x0 + r.next() * (T.x1 - T.x0), SPIRE.f3 + FH + 20, T.z0 - 0.1, Math.PI, 2, null, { noCollide: true });
    ctx.spawns.push({ x: cx, z: cz, y: SPIRE.f3, kind: 'sentinels' });
  }
}
function halvorsenFar(gb, ci, cj, era, facts) {
  if (era === 0 || facts.has('spire.prevented', era)) return;
  const S = spireRect(ci, cj);
  if (era === 1) {
    gb.box(S.x0, -1, S.z0, S.x1, 260, S.z1, C('#7a9aa8'), M(L.metal, 2, 0.83, 3.6), { faces: 1 | 2 | 4 | 16 | 32 });
    gb.box(S.x0 + 9, 260, S.z0 + 9, S.x1 - 9, 330, S.z1 - 9, C('#7a9aa8'), M(L.metal, 2, 0.83, 3.6), { faces: 1 | 2 | 4 | 16 | 32 });
  } else {
    gb.box(S.x0, -1, S.z0, S.x1, 50, S.z1, C('#5a6a6a'), M(L.metal, 2, 0.83, 3.6), { faces: 1 | 2 | 4 | 16 | 32 });
  }
}
registerLandmark('halvorsen', halvorsenGen, halvorsenFar);

// ===========================================================================
// CITY HALL — the clock tower is the city's anchor in every era
// ===========================================================================
function cityhallGen(ctx, c, era) {
  const b = blockRect(c.ci, c.cj);
  const g = ctx.geo.get('uber');
  const e = ctx.geo.get('emissive');
  const y0 = 0.15;
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const r = new RNG(55 + era);
  const stone = era === 2 ? C('#b8b4a0') : C('#f0e8d8');
  // plaza
  g.quad([b.x0, y0 + 0.01, b.z1], [b.x1, y0 + 0.01, b.z1], [b.x1, y0 + 0.01, b.z0], [b.x0, y0 + 0.01, b.z0], [0, 1, 0], [b.x0, b.z1], [b.x1, b.z1], [b.x1, b.z0], [b.x0, b.z0], era === 2 ? C('#a8b098') : C('#e0d8c8'), M(L.stone));
  // main hall
  const H = { x0: cx - 26, x1: cx + 26, z0: cz - 6, z1: cz + 22 };
  g.box(H.x0, y0 - 1, H.z0, H.x1, y0 + 16, H.z1, stone, M(L.stone, 3, 0.21, 4), { vBase: y0, topM: M(L.gravel) });
  ctx.collider(H.x0, y0 - 1, H.z0, H.x1, y0 + 16, H.z1);
  // columns portico
  for (let i = 0; i < 8; i++) {
    const x = cx - 14 + i * 4;
    if (era === 2 && i % 3 === 1) continue;
    g.cylinder(x, y0 + 1.2, H.z0 - 3, 0.7, 0.6, 11, 12, stone, M(L.stone));
    ctx.collider(x - 0.7, y0, H.z0 - 3.7, x + 0.7, y0 + 12, H.z0 - 2.3);
  }
  g.box(cx - 16, y0, H.z0 - 5, cx + 16, y0 + 1.2, H.z0, stone, M(L.stone));
  ctx.ramp(cx - 16, H.z0 - 9, cx + 16, H.z0 - 5, y0, y0 + 1.2, 'z', SURF.concrete);
  if (era !== 2) g.box(cx - 16, y0 + 12.2, H.z0 - 4, cx + 16, y0 + 13.4, H.z0, stone, M(L.stone));
  // clock tower
  const th = era === 2 ? 44 : 52;
  g.box(cx - 5, y0 + 16, cz + 3, cx + 5, y0 + th, cz + 13, stone, M(L.stone, 3, 0.4, 4), { vBase: y0 });
  ctx.collider(cx - 5, y0 + 16, cz + 3, cx + 5, y0 + th, cz + 13);
  if (era !== 2) g.gable(cx - 5, cz + 3, cx + 5, cz + 13, y0 + th, 8, 'x', C('#3a5a4a'), M(L.metal), 0.3);
  // clock faces
  const clockCol = era === 1 ? [0.6, 2.6, 3.2] : era === 0 ? [2.6, 2.4, 1.8] : [0.25, 0.3, 0.2];
  for (const [nx, nz, x, z] of [[0, -1, cx, cz + 3], [0, 1, cx, cz + 13], [-1, 0, cx - 5, cz + 8], [1, 0, cx + 5, cz + 8]]) {
    e.cylinder(x + nx * 0.06, y0 + 38, z + nz * 0.06, 0, 0, 0, 3, clockCol, [0, era === 2 ? 0 : 2, 0.1, 0], false);
    const disc = new THREE.CircleGeometry(3, 24);
    const m = new THREE.Matrix4().makeRotationY(Math.atan2(nx, nz)).setPosition(x + nx * 0.08, y0 + 38, z + nz * 0.08);
    e.addGeometry(disc, m, clockCol, [0, era === 2 ? 0 : 2, 0.1, era === 2 ? 0 : 0]);
  }
  if (era === 1) {
    // heritage site under glass towers
    placeProp(ctx, 'holopillar', cx - 20, y0, b.z0 + 8);
    placeProp(ctx, 'holopillar', cx + 20, y0, b.z0 + 8);
  }
  placeProp(ctx, 'statue', cx, y0, b.z0 + 10, Math.PI);
  for (let i = 0; i < 6; i++) ctx.tree(b.x0 + 5 + r.next() * 10, y0, b.z0 + 5 + r.next() * 60, r, era === 2 ? 1.6 : 1);
  for (let i = 0; i < 6; i++) ctx.tree(b.x1 - 5 - r.next() * 10, y0, b.z0 + 5 + r.next() * 60, r, era === 2 ? 1.6 : 1);
  if (era === 2) for (let i = 0; i < 6; i++) placeProp(ctx, 'ivy', H.x0 + r.next() * 52, y0 + 15, H.z0 - 0.1, Math.PI, 1.6, null, { noCollide: true });
  signQuad(ctx.geo.get('sign'), ctx.signs.get('s:CITY HALL'), cx, y0 + 14.2, H.z0 - 4.1, 0, -1, 10, 2.4, era === 2 ? [0.5, 0.5, 0.5] : [1, 1, 1], era === 2 ? 0 : 2, 0);
}
function cityhallFar(gb, ci, cj, era) {
  const b = blockRect(ci, cj);
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const stone = C('#f0e8d8');
  gb.box(cx - 26, -1, cz - 6, cx + 26, 16, cz + 22, stone, M(L.stone, 3, 0.21, 4), { faces: 1 | 2 | 4 | 16 | 32 });
  gb.box(cx - 5, 16, cz + 3, cx + 5, era === 2 ? 44 : 52, cz + 13, stone, M(L.stone, 3, 0.4, 4), { faces: 1 | 2 | 4 | 16 | 32 });
}
registerLandmark('cityhall', cityhallGen, cityhallFar);

// ===========================================================================
// PIER 9 — where Mara Quinn's fate is decided; becomes Quinn Clinic (2047)
// and the Haven settlement (2189) — or a raider den if she dies.
// ===========================================================================
function quinnGen(ctx, c, era) {
  const f = ctx.facts;
  const b = blockRect(c.ci, c.cj);
  const pier = { x0: b.x0 + 10, x1: b.x1 - 4, z0: b.z0 + 20, z1: b.z1 - 20 };
  genericLots(ctx, c, era, (lot) => overlaps(lot, pier));
  const g = ctx.geo.get('uber');
  const y0 = 0.15;
  const saved = f.get('mara.saved', era);
  const dead = f.get('mara.dead', era);
  const r = new RNG(909 + era);
  const cx = (pier.x0 + pier.x1) / 2, cz = (pier.z0 + pier.z1) / 2;
  g.quad([pier.x0, y0 + 0.01, pier.z1], [pier.x1, y0 + 0.01, pier.z1], [pier.x1, y0 + 0.01, pier.z0], [pier.x0, y0 + 0.01, pier.z0], [0, 1, 0], [pier.x0, pier.z1], [pier.x1, pier.z1], [pier.x1, pier.z0], [pier.x0, pier.z0], C('#ffffff'), M(era === 2 ? L.grass : L.wood));
  if (era === 0) {
    // old fish-market shed + boats + crates
    g.box(pier.x0 + 4, y0 - 1, pier.z0 + 3, pier.x0 + 24, y0 + 6, pier.z0 + 15, C('#c8c0a8'), M(L.corrugated, 5, 0.3, 6), { vBase: y0, topM: M(L.metal) });
    ctx.collider(pier.x0 + 4, y0 - 1, pier.z0 + 3, pier.x0 + 24, y0 + 6, pier.z0 + 15);
    for (let i = 0; i < 10; i++) placeProp(ctx, r.pick(['crate', 'pallet', 'drum']), pier.x0 + 26 + r.next() * 20, y0, pier.z0 + 3 + r.next() * 30, r.range(0, 6));
    signQuad(ctx.geo.get('sign'), ctx.signs.get('s:PIER 9'), pier.x0 + 14, 7.5, pier.z0 + 2.9, 0, -1, 7, 1.75, [1, 1, 1], 2, 0.2);
    ctx.spawns.push({ x: cx, z: cz, y: y0, kind: 'mara' });
  } else if (era === 1) {
    if (saved) {
      // Quinn Clinic: clean white pavilion with a green cross
      g.box(pier.x0 + 4, y0 - 1, pier.z0 + 3, pier.x0 + 30, y0 + 8, pier.z0 + 18, C('#f2f4f6'), M(L.panel, 6 + 10, 0.5, 4), { vBase: y0 });
      ctx.collider(pier.x0 + 4, y0 - 1, pier.z0 + 3, pier.x0 + 30, y0 + 8, pier.z0 + 18);
      ctx.geo.get('emissive').box(pier.x0 + 15, y0 + 8.2, pier.z0 + 2.6, pier.x0 + 19, y0 + 9, pier.z0 + 2.8, [0.4, 4, 1.2], [0, 2, 0, 0]);
      signQuad(ctx.geo.get('holo'), ctx.signs.get('s:QUINN CLINIC'), pier.x0 + 17, y0 + 10.5, pier.z0 + 2.5, 0, -1, 10, 2.5, [2, 2, 2], 3, 0.1);
      interact(ctx, pier.x0 + 17, y0 + 1, pier.z0 + 1.5, 3, 'clinic', 'Quinn Clinic — treatment', {});
    } else {
      g.box(pier.x0 + 4, y0 - 1, pier.z0 + 3, pier.x0 + 30, y0 + 22, pier.z0 + 18, C('#2a2f38'), M(L.panel, 6, 0.5, 3.6), { vBase: y0 });
      ctx.collider(pier.x0 + 4, y0 - 1, pier.z0 + 3, pier.x0 + 30, y0 + 22, pier.z0 + 18);
      if (dead) {
        placeProp(ctx, 'statue', cx + 6, y0, cz + 8, 0, 0.6);
        interact(ctx, cx + 6, y0 + 1, cz + 6, 3, 'memorial', 'Read the memorial plaque', {});
      }
    }
    for (let i = 0; i < 6; i++) placeProp(ctx, 'bench', pier.x0 + 34 + (i % 3) * 5, y0, pier.z0 + 6 + Math.floor(i / 3) * 10, 0);
  } else {
    if (saved) {
      // HAVEN: survivor settlement founded by the Quinn line
      for (let i = 0; i < 6; i++) placeProp(ctx, 'tent', pier.x0 + 6 + (i % 3) * 7, y0, pier.z0 + 6 + Math.floor(i / 3) * 9, r.range(-0.3, 0.3));
      placeProp(ctx, 'campfire', cx, y0, cz);
      for (let i = 0; i < 8; i++) placeProp(ctx, 'scrapwall', pier.x0 + 2 + i * 5.2, y0, pier.z0 + 1.5, 0);
      placeProp(ctx, 'watercollector', cx + 6, y0, cz - 4);
      placeProp(ctx, 'watercollector', cx - 6, y0, cz - 6);
      signQuad(ctx.geo.get('sign'), ctx.signs.get('s:HAVEN'), cx, y0 + 3.4, pier.z0 + 1.3, 0, -1, 6, 1.5, [1, 1, 1], 0, 0);
      ctx.spawns.push({ x: cx, z: cz, y: y0, kind: 'haven' });
      interact(ctx, cx + 2, y0 + 1, cz + 2, 3, 'haven_trader', 'Trade with Haven', {});
    } else {
      for (let i = 0; i < 5; i++) placeProp(ctx, 'scrapwall', pier.x0 + 2 + i * 5.2, y0, pier.z0 + 1.5, r.range(-0.2, 0.2));
      placeProp(ctx, 'campfire', cx, y0, cz);
      for (let i = 0; i < 6; i++) placeProp(ctx, 'rubble_' + r.int(0, 3), pier.x0 + r.next() * 40, y0, pier.z0 + r.next() * 30, r.range(0, 6), 1.4);
      ctx.spawns.push({ x: cx, z: cz, y: y0, kind: 'raiders' });
    }
  }
}
registerLandmark('quinn', quinnGen);

// ===========================================================================
// KESSLER COMMONS — the contested land (Old Kessler). In 1996 the Trust's
// community hall stands here; who wins the land shapes 2047 and 2189.
// ===========================================================================
function kesslerGen(ctx, c, era) {
  const f = ctx.facts;
  const owner = f.get('oldkessler.owner', era);
  const b = blockRect(c.ci, c.cj);
  const g = ctx.geo.get('uber');
  const y0 = 0.15;
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
  const r = new RNG(313 + era);
  g.quad([b.x0, y0 + 0.01, b.z1], [b.x1, y0 + 0.01, b.z1], [b.x1, y0 + 0.01, b.z0], [b.x0, y0 + 0.01, b.z0], [0, 1, 0], [b.x0, b.z1], [b.x1, b.z1], [b.x1, b.z0], [b.x0, b.z0], C('#ffffff'), M(L.grass));
  if (era === 0) {
    g.box(cx - 10, y0 - 1, cz - 8, cx + 10, y0 + 6, cz + 8, C('#d8c8a8'), M(L.siding, 4, 0.2, 3), { vBase: y0 });
    g.gable(cx - 10, cz - 8, cx + 10, cz + 8, y0 + 6, 4, 'x', C('#5a3a2a'), M(L.tiles), 0.4);
    ctx.collider(cx - 10, y0 - 1, cz - 8, cx + 10, y0 + 6, cz + 8);
    signQuad(ctx.geo.get('sign'), ctx.signs.get('s:KESSLER TRUST'), cx, y0 + 4.6, cz - 8.1, 0, -1, 8, 2, [1, 1, 1], 2, 0.3);
    for (let i = 0; i < 10; i++) placeProp(ctx, 'bush_' + r.int(0, 2), b.x0 + r.next() * (b.x1 - b.x0), y0, b.z0 + r.next() * (b.z1 - b.z0), r.range(0, 6), 1, null, { noCollide: true });
    for (let i = 0; i < 4; i++) ctx.tree(b.x0 + 4 + r.next() * 60, y0, b.z0 + 4 + r.next() * 60, r);
    interact(ctx, cx, y0 + 1, cz - 9.5, 3, 'kessler_trust', 'Speak with the Kessler Trust', { cond: 'kesslerUndecided' });
  } else if (owner === 'halvorsen') {
    const h = era === 1 ? 120 : 50;
    g.box(cx - 24, y0 - 1, cz - 20, cx + 24, y0 + h, cz + 20, era === 1 ? C('#2a2f38') : C('#4a4f48'), M(L.panel, era === 1 ? 6 : 7, 0.73, 3.4), { vBase: y0, topM: M(L.gravel) });
    ctx.collider(cx - 24, y0 - 1, cz - 20, cx + 24, y0 + h, cz + 20);
    if (era === 1) signQuad(ctx.geo.get('holo'), ctx.signs.get('s:HALVORSEN'), cx, 60, cz - 21.5, 0, -1, 24, 6, [2, 2, 2], 3, 0.4);
    if (era === 2) for (let i = 0; i < 6; i++) placeProp(ctx, 'ivy', cx - 22 + r.next() * 44, y0 + 48, cz - 20.1, Math.PI, 2, null, { noCollide: true });
  } else {
    // Kessler Gardens (2047) → Rootfolk grove (2189)
    for (let i = 0; i < 4; i++) {
      const x = b.x0 + 10 + (i % 2) * 40, z = b.z0 + 10 + Math.floor(i / 2) * 36;
      const h = era === 1 ? 14 + i * 4 : 8 + i * 2;
      g.box(x, y0 - 1, z, x + 18, y0 + h, z + 18, era === 1 ? C('#e8e4d8') : C('#a8a890'), M(L.plaster, 0, 0.3 + i * 0.1, 3.4), { vBase: y0, topM: M(L.grass), topCol: C('#a0d080') });
      ctx.collider(x, y0 - 1, z, x + 18, y0 + h, z + 18);
      for (let k = 0; k < 3; k++) placeProp(ctx, 'tree_street_' + k, x + 4 + k * 5, y0 + h, z + 9, 0, era === 2 ? 1.6 : 0.9, null, { noCollide: true });
    }
    for (let i = 0; i < 12; i++) ctx.tree(b.x0 + 4 + r.next() * 68, y0, b.z0 + 4 + r.next() * 68, r, era === 2 ? 1.5 : 1);
    if (era === 2) { placeProp(ctx, 'campfire', cx, y0, cz); ctx.spawns.push({ x: cx, z: cz, y: y0, kind: 'camp' }); }
  }
}
registerLandmark('kessler_lot', kesslerGen);

// ===========================================================================
// YARDS WATER TOWER — industrial landmark (all eras)
// ===========================================================================
function towerGen(ctx, c, era) {
  genericLots(ctx, c, era);
  const b = blockRect(c.ci, c.cj);
  const x = b.x1 - 10, z = b.z0 + 10, y0 = 0.15;
  const g = ctx.geo.get('uber');
  const col = era === 2 ? C('#8a5a40') : era === 1 ? C('#e8ecf0') : C('#9ab0c0');
  for (const [dx, dz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) g.tube(x + dx, y0, z + dz, x + dx * 0.6, y0 + 28, z + dz * 0.6, 0.3, 0.25, 6, col, M(era === 2 ? L.rust : L.metal));
  g.cylinder(x, y0 + 28, z, 6, 6, 8, 18, col, M(era === 2 ? L.rust : L.paint), true);
  g.cylinder(x, y0 + 36, z, 6.2, 0.4, 3, 18, col, M(era === 2 ? L.rust : L.paint), false);
  ctx.collider(x - 6, y0 + 28, z - 6, x + 6, y0 + 36, z + 6, CF.SOLID, SURF.metal);
  ctx.collider(x - 0.5, y0, z - 4.5, x + 0.5, y0 + 28, z - 3.5, CF.CLIMB, SURF.metal);
  g.box(x - 0.4, y0, z - 4.3, x + 0.4, y0 + 28, z - 4.2, C('#555'), M(L.metal));
}
registerLandmark('watertower', towerGen);

// ===========================================================================
// KXRS RADIO TOWER — on Mount Kessler, visible from everywhere
// ===========================================================================
function radioGen(ctx, c, era) {
  const o = chunkOrigin(c.ci, c.cj);
  const x = o.x + CHUNK / 2, z = o.z + CHUNK / 2;
  // place on the highest terrain point of the chunk
  const g = ctx.geo.get('uber');
  const e = ctx.geo.get('emissive');
  const y = terrainHeight(x, z);
  const h = era === 2 ? 70 : 110;
  const col = era === 2 ? C('#8a4a30') : C('#d84a30');
  for (let k = 0; k < h; k += 6) {
    const s = 3 * (1 - k / (h * 1.4));
    for (const [a, b2] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) g.tube(x + a * s, y + k, z + b2 * s, x + a * s * 0.95, y + k + 6, z + b2 * s * 0.95, 0.12, 0.12, 4, k % 12 === 0 ? col : C('#e8e4dc'), M(L.paint));
  }
  if (era !== 2) e.box(x - 0.4, y + h, z - 0.4, x + 0.4, y + h + 0.8, z + 0.4, [8, 0.3, 0.2], [0, 4, 0.2, 0]);
  ctx.collider(x - 3, y, z - 3, x + 3, y + h, z + 3, CF.SOLID | CF.CLIMB, SURF.metal);
}
registerLandmark('radio', radioGen);
