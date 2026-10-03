// Static collision world: axis-aligned boxes and ramps in a spatial hash, one
// set per era, plus the analytic terrain. Fast enough for player, NPCs,
// vehicles, bullets and the camera.
import { terrainHeight, WATER_Y } from './layout.js';

export const CF = {
  SOLID: 1,
  CLIMB: 2,     // ladders, vines, scaffolds — climbable when pressed against
  NOCAM: 4,     // camera ignores (thin props)
  NOBULLET: 8,  // bullets pass (fences, foliage)
  WALKONLY: 16, // vehicles ignore (stairs inside buildings etc. still block via walls)
  GLASS: 32,
  NOVAULT: 64,
};
export const SURF = { concrete: 0, asphalt: 1, metal: 2, wood: 3, grass: 4, dirt: 5, water: 6, glass: 7, tile: 8, carpet: 9, rubble: 10, leaves: 11 };

const CELL = 16;
const ckey = (cx, cz) => (cx + 4096) * 8192 + (cz + 4096);

let NEXT_ID = 1;
export class Collider {
  constructor(minX, minY, minZ, maxX, maxY, maxZ, flags = CF.SOLID, surf = SURF.concrete) {
    this.minX = Math.min(minX, maxX); this.maxX = Math.max(minX, maxX);
    this.minY = Math.min(minY, maxY); this.maxY = Math.max(minY, maxY);
    this.minZ = Math.min(minZ, maxZ); this.maxZ = Math.max(minZ, maxZ);
    this.flags = flags;
    this.surf = surf;
    this.ramp = null; // { axis: 'x'|'z', y0, y1 }
    this.id = NEXT_ID++;
    this.stamp = 0;
    this.cells = null;
    this.data = null;
    this.enabled = true;
  }
  topAt(x, z) {
    if (!this.ramp) return this.maxY;
    const r = this.ramp;
    let t;
    if (r.axis === 'x') t = (x - this.minX) / (this.maxX - this.minX);
    else t = (z - this.minZ) / (this.maxZ - this.minZ);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    return r.y0 + (r.y1 - r.y0) * t;
  }
}

class EraSpace {
  constructor() {
    this.cells = new Map();
    this.holes = [];
    this.stamp = 1;
  }
  add(c) {
    const x0 = Math.floor(c.minX / CELL), x1 = Math.floor(c.maxX / CELL);
    const z0 = Math.floor(c.minZ / CELL), z1 = Math.floor(c.maxZ / CELL);
    c.cells = [];
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const k = ckey(cx, cz);
        let arr = this.cells.get(k);
        if (!arr) { arr = []; this.cells.set(k, arr); }
        arr.push(c);
        c.cells.push(k);
      }
    }
  }
  remove(c) {
    if (!c.cells) return;
    for (const k of c.cells) {
      const arr = this.cells.get(k);
      if (!arr) continue;
      const i = arr.indexOf(c);
      if (i >= 0) { arr[i] = arr[arr.length - 1]; arr.pop(); }
      if (arr.length === 0) this.cells.delete(k);
    }
    c.cells = null;
  }
  query(minX, minZ, maxX, maxZ, out) {
    out.length = 0;
    const s = ++this.stamp;
    const x0 = Math.floor(minX / CELL), x1 = Math.floor(maxX / CELL);
    const z0 = Math.floor(minZ / CELL), z1 = Math.floor(maxZ / CELL);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const arr = this.cells.get(ckey(cx, cz));
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) {
          const c = arr[i];
          if (c.stamp === s || !c.enabled) continue;
          c.stamp = s;
          if (c.maxX < minX || c.minX > maxX || c.maxZ < minZ || c.minZ > maxZ) continue;
          out.push(c);
        }
      }
    }
    return out;
  }
}

const _q = [];
const _q2 = [];

export class CollisionWorld {
  constructor() {
    this.eras = [new EraSpace(), new EraSpace(), new EraSpace()];
    this.result = { y: 0, collider: null, surf: SURF.asphalt, water: false };
  }

  add(era, c) { this.eras[era].add(c); return c; }
  remove(era, c) { this.eras[era].remove(c); }
  addHole(era, h) { this.eras[era].holes.push(h); return h; }
  removeHole(era, h) {
    const a = this.eras[era].holes;
    const i = a.indexOf(h);
    if (i >= 0) a.splice(i, 1);
  }

  box(era, minX, minY, minZ, maxX, maxY, maxZ, flags = CF.SOLID, surf = SURF.concrete) {
    return this.add(era, new Collider(minX, minY, minZ, maxX, maxY, maxZ, flags, surf));
  }
  ramp(era, minX, minZ, maxX, maxZ, y0, y1, axis, bottom = null, flags = CF.SOLID, surf = SURF.concrete) {
    const c = new Collider(minX, bottom === null ? Math.min(y0, y1) - 0.6 : bottom, minZ, maxX, Math.max(y0, y1), maxZ, flags, surf);
    c.ramp = { axis, y0, y1 };
    return this.add(era, c);
  }

  terrainAt(era, x, z, y) {
    const holes = this.eras[era].holes;
    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      if (x > h.minX && x < h.maxX && z > h.minZ && z < h.maxZ && y < h.maxY) return -1e9;
    }
    return terrainHeight(x, z);
  }

  // Highest walkable surface at (x,z) whose top is <= yMax.
  // r: footprint radius used to test support (smaller than body radius)
  ground(era, x, z, yMax, r = 0.2) {
    const res = this.result;
    let best = this.terrainAt(era, x, z, yMax);
    if (best > yMax) best = -1e9;
    let bestC = null;
    const arr = this.eras[era].query(x - r, z - r, x + r, z + r, _q);
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i];
      if (!(c.flags & CF.SOLID)) continue;
      const cx = x < c.minX ? c.minX : x > c.maxX ? c.maxX : x;
      const cz = z < c.minZ ? c.minZ : z > c.maxZ ? c.maxZ : z;
      if ((cx - x) * (cx - x) + (cz - z) * (cz - z) > r * r) continue;
      const top = c.topAt(cx, cz);
      if (top <= yMax && top > best) { best = top; bestC = c; }
    }
    res.y = best;
    res.collider = bestC;
    res.surf = bestC ? bestC.surf : SURF.grass;
    const wy = WATER_Y[era];
    res.water = best < wy;
    res.waterY = wy;
    return res;
  }

  // Lowest ceiling above yMin at (x,z) (bottom face of a solid)
  ceiling(era, x, z, yMin, r = 0.25) {
    let best = 1e9;
    const arr = this.eras[era].query(x - r, z - r, x + r, z + r, _q);
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i];
      if (!(c.flags & CF.SOLID) || c.ramp) continue;
      if (x + r < c.minX || x - r > c.maxX || z + r < c.minZ || z - r > c.maxZ) continue;
      if (c.minY >= yMin && c.minY < best) best = c.minY;
    }
    return best;
  }

  // Push a vertical cylinder out of solids. Mutates pos {x,y,z}. Returns
  // number of contacts; contact normals accumulated in this.pushN.
  resolveCylinder(era, pos, radius, height, stepUp, ignoreFlags = 0) {
    let contacts = 0;
    this.lastWall = null;
    this.pushNX = 0; this.pushNZ = 0;
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      const arr = this.eras[era].query(pos.x - radius, pos.z - radius, pos.x + radius, pos.z + radius, _q2);
      for (let i = 0; i < arr.length; i++) {
        const c = arr[i];
        if (!(c.flags & CF.SOLID) || (c.flags & ignoreFlags)) continue;
        const top = c.topAt(pos.x, pos.z);
        if (top <= pos.y + stepUp) continue; // walkable / below
        const bottom = c.ramp && c.ramp.thick !== undefined ? top - c.ramp.thick : c.minY;
        if (bottom >= pos.y + height) continue; // above head
        const cx = pos.x < c.minX ? c.minX : pos.x > c.maxX ? c.maxX : pos.x;
        const cz = pos.z < c.minZ ? c.minZ : pos.z > c.maxZ ? c.maxZ : pos.z;
        let dx = pos.x - cx, dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= radius * radius) continue;
        let nx, nz, pen;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          nx = dx / d; nz = dz / d;
          pen = radius - d;
        } else {
          // centre inside the box: push out along the smallest axis
          const l = pos.x - c.minX, rr = c.maxX - pos.x, b = pos.z - c.minZ, f = c.maxZ - pos.z;
          const m = Math.min(l, rr, b, f);
          if (m === l) { nx = -1; nz = 0; pen = l + radius; }
          else if (m === rr) { nx = 1; nz = 0; pen = rr + radius; }
          else if (m === b) { nx = 0; nz = -1; pen = b + radius; }
          else { nx = 0; nz = 1; pen = f + radius; }
        }
        pos.x += nx * (pen + 1e-4);
        pos.z += nz * (pen + 1e-4);
        this.pushNX += nx; this.pushNZ += nz;
        this.lastWall = c;
        contacts++;
        moved = true;
      }
      if (!moved) break;
    }
    return contacts;
  }

  // Ray vs world. Returns {t, x,y,z, nx,ny,nz, collider|null, terrain:bool} or null
  raycast(era, ox, oy, oz, dx, dy, dz, maxDist, ignoreFlags = 0) {
    const len = Math.hypot(dx, dy, dz) || 1;
    dx /= len; dy /= len; dz /= len;
    let bestT = maxDist, bestC = null, bnx = 0, bny = 0, bnz = 0;
    // walk cells along the ray in XZ (DDA)
    const space = this.eras[era];
    const s = ++space.stamp;
    let cx = Math.floor(ox / CELL), cz = Math.floor(oz / CELL);
    const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const tdx = Math.abs(dx) > 1e-9 ? Math.abs(CELL / dx) : 1e9;
    const tdz = Math.abs(dz) > 1e-9 ? Math.abs(CELL / dz) : 1e9;
    let tmx = Math.abs(dx) > 1e-9 ? ((dx > 0 ? (cx + 1) * CELL - ox : ox - cx * CELL) / Math.abs(dx)) : 1e9;
    let tmz = Math.abs(dz) > 1e-9 ? ((dz > 0 ? (cz + 1) * CELL - oz : oz - cz * CELL) / Math.abs(dz)) : 1e9;
    let tCell = 0;
    for (let guard = 0; guard < 512; guard++) {
      const arr = space.cells.get(ckey(cx, cz));
      if (arr) {
        for (let i = 0; i < arr.length; i++) {
          const c = arr[i];
          if (c.stamp === s || !c.enabled) continue;
          c.stamp = s;
          if (!(c.flags & CF.SOLID) || (c.flags & ignoreFlags)) continue;
          // slab test
          let t0 = 0, t1 = bestT, nx = 0, ny = 0, nz = 0;
          let ok = true;
          const slab = (o, d, mn, mx, ax) => {
            if (Math.abs(d) < 1e-9) { if (o < mn || o > mx) ok = false; return; }
            let ta = (mn - o) / d, tb = (mx - o) / d;
            let sgn = -1;
            if (ta > tb) { const tt = ta; ta = tb; tb = tt; sgn = 1; }
            if (ta > t0) { t0 = ta; nx = ax === 0 ? sgn : 0; ny = ax === 1 ? sgn : 0; nz = ax === 2 ? sgn : 0; }
            if (tb < t1) t1 = tb;
            if (t0 > t1) ok = false;
          };
          slab(ox, dx, c.minX, c.maxX, 0);
          if (ok) slab(oy, dy, c.minY, c.maxY, 1);
          if (ok) slab(oz, dz, c.minZ, c.maxZ, 2);
          if (!ok || t0 >= bestT) continue;
          if (c.ramp) {
            // refine against sloped top
            const hx = ox + dx * t0, hz = oz + dz * t0, hy = oy + dy * t0;
            if (hy > c.topAt(hx, hz) + 0.05) {
              // march inside the box to find the slope
              let found = false;
              for (let k = 1; k <= 8; k++) {
                const tt = t0 + ((t1 - t0) * k) / 8;
                const px = ox + dx * tt, py = oy + dy * tt, pz = oz + dz * tt;
                if (py <= c.topAt(px, pz)) { t0 = tt; nx = 0; ny = 1; nz = 0; found = true; break; }
              }
              if (!found) continue;
            }
          }
          if (t0 < bestT) { bestT = t0; bestC = c; bnx = nx; bny = ny; bnz = nz; }
        }
      }
      // advance
      if (tmx < tmz) { tCell = tmx; tmx += tdx; cx += stepX; }
      else { tCell = tmz; tmz += tdz; cz += stepZ; }
      if (tCell > bestT) break;
    }
    // terrain (adaptive march — terrain slopes stay below ~1)
    let terrainHit = false;
    let t = 0, prevT = 0;
    for (let guard = 0; guard < 200 && t <= bestT; guard++) {
      const py = oy + dy * t;
      const th = this.terrainAt(era, ox + dx * t, oz + dz * t, py + 0.01);
      const gap = py - th;
      if (gap < 0) {
        let a = prevT, b = t;
        for (let k = 0; k < 7; k++) {
          const m = (a + b) * 0.5;
          const my = oy + dy * m;
          if (my < this.terrainAt(era, ox + dx * m, oz + dz * m, my + 0.01)) b = m; else a = m;
        }
        if (b < bestT) { bestT = b; bestC = null; terrainHit = true; bnx = 0; bny = 1; bnz = 0; }
        break;
      }
      prevT = t;
      t += Math.min(25, Math.max(0.35, gap * 0.6));
    }
    if (bestT >= maxDist) return null;
    return { t: bestT, x: ox + dx * bestT, y: oy + dy * bestT, z: oz + dz * bestT, nx: bnx, ny: bny, nz: bnz, collider: bestC, terrain: terrainHit };
  }

  pointSolid(era, x, y, z, pad = 0) {
    const arr = this.eras[era].query(x - pad, z - pad, x + pad, z + pad, _q);
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i];
      if (!(c.flags & CF.SOLID)) continue;
      if (x + pad > c.minX && x - pad < c.maxX && z + pad > c.minZ && z - pad < c.maxZ && y > c.minY && y < c.topAt(x, z)) return c;
    }
    return null;
  }

  // Is a standing body (cylinder) at feet position free of solids?
  bodyFree(era, x, y, z, radius = 0.3, height = 1.75) {
    const arr = this.eras[era].query(x - radius, z - radius, x + radius, z + radius, _q);
    for (let i = 0; i < arr.length; i++) {
      const c = arr[i];
      if (!(c.flags & CF.SOLID)) continue;
      const cx = x < c.minX ? c.minX : x > c.maxX ? c.maxX : x;
      const cz = z < c.minZ ? c.minZ : z > c.maxZ ? c.maxZ : z;
      if ((cx - x) ** 2 + (cz - z) ** 2 >= radius * radius) continue;
      const top = c.topAt(cx, cz);
      const bottom = c.ramp && c.ramp.thick !== undefined ? top - c.ramp.thick : c.minY;
      if (top > y + 0.35 && bottom < y + height) return false;
    }
    return true;
  }

  queryBox(era, minX, minZ, maxX, maxZ, out = []) {
    return this.eras[era].query(minX, minZ, maxX, maxZ, out);
  }
}
