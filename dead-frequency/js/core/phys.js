'use strict';
// 2.5D collision: axis-aligned boxes on the XZ plane with a vertical span.

const Phys = {
  boxes: [],
  ready: false,
  reset() { this.boxes = []; this.ready = false; },
  add(minX, minZ, maxX, maxZ, minY = 0, maxY = 3, o = {}) {
    const b = { minX: Math.min(minX, maxX), maxX: Math.max(minX, maxX), minZ: Math.min(minZ, maxZ), maxZ: Math.max(minZ, maxZ), minY, maxY, on: true, sight: o.sight !== false, tag: o.tag || '', player: o.player !== false, npc: o.npc !== false };
    this.boxes.push(b);
    return b;
  },
  // centered helper
  addC(x, z, w, d, minY = 0, maxY = 3, o) { return this.add(x - w / 2, z - d / 2, x + w / 2, z + d / 2, minY, maxY, o); },
  remove(b) { const i = this.boxes.indexOf(b); if (i >= 0) this.boxes.splice(i, 1); },

  // push a circle (x,z,r) out of boxes overlapping vertical span [y0,y1]
  resolve(pos, r, y0, y1, who = 'player') {
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const b of this.boxes) {
        if (!b.on || !b[who]) continue;
        if (b.maxY <= y0 + 0.35 || b.minY >= y1) continue; // low things can be stepped over
        const cx = U.clamp(pos.x, b.minX, b.maxX), cz = U.clamp(pos.z, b.minZ, b.maxZ);
        let dx = pos.x - cx, dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2), push = r - d;
          pos.x += dx / d * push; pos.z += dz / d * push;
        } else {
          // center inside box: push along smallest axis
          const l = pos.x - b.minX, rr = b.maxX - pos.x, t = pos.z - b.minZ, bb = b.maxZ - pos.z;
          const m = Math.min(l, rr, t, bb);
          if (m === l) pos.x = b.minX - r; else if (m === rr) pos.x = b.maxX + r; else if (m === t) pos.z = b.minZ - r; else pos.z = b.maxZ + r;
        }
        moved = true;
      }
      if (!moved) break;
    }
  },
  // is a point blocked
  blocked(x, z, r = 0.25, y0 = 0.1, y1 = 1.7) {
    for (const b of this.boxes) {
      if (!b.on || b.maxY <= y0 + 0.35 || b.minY >= y1) continue;
      if (x + r > b.minX && x - r < b.maxX && z + r > b.minZ && z - r < b.maxZ) return true;
    }
    return false;
  },
  // 2D segment vs boxes at height y; returns true if clear
  lineOfSight(ax, az, bx, bz, y = 1.5, soundOnly = false) {
    const dx = bx - ax, dz = bz - az;
    for (const b of this.boxes) {
      if (!b.on || (!b.sight && !soundOnly)) continue;
      if (soundOnly && b.tag === 'tree') continue;
      if (y < b.minY || y > b.maxY) continue;
      // slab test
      let t0 = 0, t1 = 1;
      if (Math.abs(dx) < 1e-9) { if (ax < b.minX || ax > b.maxX) continue; }
      else { let ta = (b.minX - ax) / dx, tb = (b.maxX - ax) / dx; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) continue; }
      if (Math.abs(dz) < 1e-9) { if (az < b.minZ || az > b.maxZ) continue; }
      else { let ta = (b.minZ - az) / dz, tb = (b.maxZ - az) / dz; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) continue; }
      if (t1 > 0.001 && t0 < 0.999) return false;
    }
    return true;
  },
};
