// GETAWAY! — static collision world: AABB boxes (walls/roofs/decks), ramps, terrain, water.
import { clamp } from '../core/utils.js';

export class StaticWorld {
  constructor(cell = 24) {
    this.cell = cell; this.boxes = []; this.ramps = []; this.holes = []; this.waters = []; this.grid = new Map(); this.rampGrid = new Map(); this.stamp = 0;
    this.terrainFn = () => 0; this.terrainMat = () => 'ground'; this.bounds = { minX: -2300, maxX: 900, minZ: -1400, maxZ: 1000 };
    this._out = [];
  }
  _k(ix, iz) { return ix * 100003 + iz; }
  _cells(minX, minZ, maxX, maxZ, fn) {
    const c = this.cell; const x0 = Math.floor(minX / c), x1 = Math.floor(maxX / c), z0 = Math.floor(minZ / c), z1 = Math.floor(maxZ / c);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) fn(this._k(ix, iz));
  }
  addBox(minX, minY, minZ, maxX, maxY, maxZ, o = {}) {
    if (minX > maxX) [minX, maxX] = [maxX, minX]; if (minZ > maxZ) [minZ, maxZ] = [maxZ, minZ];
    const b = { minX, minY, minZ, maxX, maxY, maxZ, mat: o.mat || 'concrete', solid: o.solid !== false, surface: o.surface !== false, climb: !!o.climb, tag: o.tag || null, id: this.boxes.length, disabled: false, glass: !!o.glass, onBreak: o.onBreak || null, owner: o.owner || null, _s: 0 };
    this.boxes.push(b);
    this._cells(minX, minZ, maxX, maxZ, (k) => { let l = this.grid.get(k); if (!l) this.grid.set(k, (l = [])); l.push(b); });
    return b;
  }
  // ramp surface: height varies linearly along axis from h0 (at min) to h1 (at max)
  addRamp(minX, minZ, maxX, maxZ, axis, h0, h1, o = {}) {
    const r = { minX, minZ, maxX, maxZ, axis, h0, h1, mat: o.mat || 'asphalt', tag: o.tag || null, disabled: false, _s: 0 };
    this.ramps.push(r);
    this._cells(minX, minZ, maxX, maxZ, (k) => { let l = this.rampGrid.get(k); if (!l) this.rampGrid.set(k, (l = [])); l.push(r); });
    return r;
  }
  rampH(r, x, z) { const t = r.axis === 'x' ? (x - r.minX) / (r.maxX - r.minX) : (z - r.minZ) / (r.maxZ - r.minZ); return r.h0 + (r.h1 - r.h0) * clamp(t, 0, 1); }
  addHole(minX, minZ, maxX, maxZ) { this.holes.push({ minX, minZ, maxX, maxZ }); }
  addWater(minX, minZ, maxX, maxZ, level) { this.waters.push({ minX, minZ, maxX, maxZ, level }); }
  inHole(x, z) { for (const h of this.holes) if (x >= h.minX && x <= h.maxX && z >= h.minZ && z <= h.maxZ) return true; return false; }
  terrain(x, z) { return this.inHole(x, z) ? -40 : this.terrainFn(x, z); }
  waterLevel(x, z) { for (const w of this.waters) if (x >= w.minX && x <= w.maxX && z >= w.minZ && z <= w.maxZ) return w.level; return -Infinity; }

  boxesIn(minX, minZ, maxX, maxZ, out = this._out) {
    out.length = 0; const s = ++this.stamp;
    this._cells(minX, minZ, maxX, maxZ, (k) => { const l = this.grid.get(k); if (l) for (const b of l) if (b._s !== s) { b._s = s; if (!b.disabled && b.maxX >= minX && b.minX <= maxX && b.maxZ >= minZ && b.minZ <= maxZ) out.push(b); } });
    return out;
  }
  // highest walkable surface at (x,z) that is not above yRef+step. Returns {h, box, ramp, mat}
  groundAt(x, z, yRef = 1e6, step = 0.5, res = { h: 0, box: null, ramp: null, mat: 'asphalt' }) {
    const lim = yRef + step; let best = -Infinity; res.box = null; res.ramp = null; res.mat = 'asphalt';
    const k = this._k(Math.floor(x / this.cell), Math.floor(z / this.cell));
    const l = this.grid.get(k);
    if (l) for (const b of l) {
      if (b.disabled || !b.surface) continue;
      if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue;
      if (b.maxY <= lim && b.maxY > best) { best = b.maxY; res.box = b; res.mat = b.mat; }
    }
    const rl = this.rampGrid.get(k);
    if (rl) for (const r of rl) {
      if (r.disabled || x < r.minX || x > r.maxX || z < r.minZ || z > r.maxZ) continue;
      const h = this.rampH(r, x, z); if (h <= lim + 0.4 && h > best) { best = h; res.ramp = r; res.box = null; res.mat = r.mat; }
    }
    const t = this.terrain(x, z);
    if (t <= lim && t > best) { best = t; res.box = null; res.ramp = null; res.mat = this.terrainMat(x, z); }
    if (best === -Infinity) { best = t; res.mat = this.terrainMat(x, z); }
    res.h = best; return res;
  }
  // ceiling: lowest box bottom above y at x,z (for jumping / camera)
  ceilingAt(x, z, y) {
    let best = Infinity; const l = this.grid.get(this._k(Math.floor(x / this.cell), Math.floor(z / this.cell)));
    if (l) for (const b of l) { if (b.disabled || !b.solid) continue; if (x < b.minX || x > b.maxX || z < b.minZ || z > b.maxZ) continue; if (b.minY > y && b.minY < best) best = b.minY; }
    return best;
  }
  // push a vertical capsule (circle in XZ between y0..y1) out of solid boxes
  pushCircle(x, z, r, y0, y1, res = { x: 0, z: 0, hit: false, nx: 0, nz: 0, box: null }) {
    res.x = x; res.z = z; res.hit = false; res.nx = 0; res.nz = 0; res.box = null;
    const cand = this.boxesIn(x - r, z - r, x + r, z + r);
    for (let it = 0; it < 2; it++) for (const b of cand) {
      if (!b.solid || b.maxY <= y0 || b.minY >= y1) continue;
      const cx = clamp(res.x, b.minX, b.maxX), cz = clamp(res.z, b.minZ, b.maxZ);
      let dx = res.x - cx, dz = res.z - cz; let d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 < 1e-8) { // center inside: push along min axis
        const pen = [res.x - b.minX, b.maxX - res.x, res.z - b.minZ, b.maxZ - res.z]; let m = 0; for (let i = 1; i < 4; i++) if (pen[i] < pen[m]) m = i;
        if (m === 0) { res.x = b.minX - r; dx = -1; dz = 0; } else if (m === 1) { res.x = b.maxX + r; dx = 1; dz = 0; } else if (m === 2) { res.z = b.minZ - r; dx = 0; dz = -1; } else { res.z = b.maxZ + r; dx = 0; dz = 1; }
        res.nx = dx; res.nz = dz;
      } else { const d = Math.sqrt(d2); const nx = dx / d, nz = dz / d; res.x = cx + nx * r; res.z = cz + nz * r; res.nx = nx; res.nz = nz; }
      res.hit = true; res.box = b;
    }
    return res;
  }
  // ray vs boxes (+ terrain/ground plane). Returns {t, x,y,z, nx,ny,nz, box, mat} or null
  raycast(ox, oy, oz, dx, dy, dz, maxT = 200, opts = {}) {
    const len = Math.hypot(dx, dy, dz) || 1; dx /= len; dy /= len; dz /= len;
    let bestT = maxT, hit = null; const s = ++this.stamp; const c = this.cell;
    const ignoreGlass = opts.ignoreGlass;
    // DDA over grid cells in XZ
    let ix = Math.floor(ox / c), iz = Math.floor(oz / c);
    const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const tdx = Math.abs(dx) < 1e-9 ? Infinity : Math.abs(c / dx), tdz = Math.abs(dz) < 1e-9 ? Infinity : Math.abs(c / dz);
    let tmx = Math.abs(dx) < 1e-9 ? Infinity : ((dx > 0 ? (ix + 1) * c - ox : ox - ix * c) / Math.abs(dx));
    let tmz = Math.abs(dz) < 1e-9 ? Infinity : ((dz > 0 ? (iz + 1) * c - oz : oz - iz * c) / Math.abs(dz));
    let tCell = 0; let guard = 0;
    while (tCell < bestT && guard++ < 400) {
      const l = this.grid.get(this._k(ix, iz));
      if (l) for (const b of l) {
        if (b._s === s) continue; b._s = s; if (b.disabled || (!b.solid && !b.surface)) continue; if (ignoreGlass && b.glass) continue; if (b.tag === 'fence') continue; // invisible vehicle catch fences don't stop bullets, sight lines or the camera
        // slab test
        let t0 = 0, t1 = bestT, nAxis = -1, nSign = 0;
        const sl = (o, d, mn, mx, axis) => {
          if (Math.abs(d) < 1e-9) return o >= mn && o <= mx;
          let a = (mn - o) / d, bb = (mx - o) / d; let sgn = -1; if (a > bb) { const tmp = a; a = bb; bb = tmp; sgn = 1; }
          if (a > t0) { t0 = a; nAxis = axis; nSign = sgn; } if (bb < t1) t1 = bb; return t0 <= t1;
        };
        if (!sl(ox, dx, b.minX, b.maxX, 0) || !sl(oy, dy, b.minY, b.maxY, 1) || !sl(oz, dz, b.minZ, b.maxZ, 2)) continue;
        if (t0 < bestT && t0 >= 0 && nAxis >= 0) { bestT = t0; hit = { t: t0, nx: nAxis === 0 ? nSign : 0, ny: nAxis === 1 ? nSign : 0, nz: nAxis === 2 ? nSign : 0, box: b, mat: b.mat }; }
      }
      if (tmx < tmz) { tCell = tmx; tmx += tdx; ix += stepX; } else { tCell = tmz; tmz += tdz; iz += stepZ; }
    }
    // ramps (approximate: sample)
    // terrain / ground: march
    if (!opts.noGround) {
      const stepL = 2; let prevY = oy, prevG = this._g(ox, oz, oy);
      for (let t = stepL; t <= bestT; t += stepL) {
        const x = ox + dx * t, y = oy + dy * t, z = oz + dz * t; const g = this._g(x, z, y + 0.5);
        if (y <= g) { // refine
          const a = prevY - prevG, b2 = y - g; const tt = t - stepL + stepL * (a / Math.max(1e-6, a - b2));
          if (tt < bestT) { bestT = tt; hit = { t: tt, nx: 0, ny: 1, nz: 0, box: null, mat: 'ground' }; }
          break;
        }
        prevY = y; prevG = g; if (dy > 0 && y > 400) break;
      }
    }
    if (!hit) return null;
    hit.x = ox + dx * hit.t; hit.y = oy + dy * hit.t; hit.z = oz + dz * hit.t; return hit;
  }
  _g(x, z, y) { // terrain + ramps (boxes handled by slab test)
    let h = this.terrain(x, z);
    const rl = this.rampGrid.get(this._k(Math.floor(x / this.cell), Math.floor(z / this.cell)));
    if (rl) for (const r of rl) { if (r.disabled || x < r.minX || x > r.maxX || z < r.minZ || z > r.maxZ) continue; const rh = this.rampH(r, x, z); if (rh <= y + 0.5 && rh > h) h = rh; }
    if (h > y + 3 && this.inHole(x, z)) h = -40;
    return h;
  }
  lineOfSight(ax, ay, az, bx, by, bz) {
    const dx = bx - ax, dy = by - ay, dz = bz - az; const d = Math.hypot(dx, dy, dz);
    const h = this.raycast(ax, ay, az, dx, dy, dz, d, { ignoreGlass: true }); return !h || h.t >= d - 0.3;
  }
}
