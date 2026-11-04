// Flow-field navigation: a coarse walkability grid sampled from the physics world, with a BFS
// distance field from the player recomputed a few times per second. Ground enemies follow
// the gradient when they can't see the player directly. Works with any floor layout.
import * as THREE from 'three';

const _v = new THREE.Vector3();
const _d = new THREE.Vector3(0, -1, 0);
const _hit = {};

export class NavGrid {
  constructor(physics, o) {
    this.P = physics;
    this.cell = o.cell || 1.5;
    this.minX = o.minX; this.minZ = o.minZ;
    this.w = Math.ceil((o.maxX - o.minX) / this.cell);
    this.h = Math.ceil((o.maxZ - o.minZ) / this.cell);
    this.minY = o.minY ?? -2;
    this.maxY = o.maxY ?? 3;
    this.topY = o.topY ?? this.maxY + 3;
    this.walk = new Uint8Array(this.w * this.h);
    this.height = new Float32Array(this.w * this.h);
    this.dist = new Int32Array(this.w * this.h);
    this.queue = new Int32Array(this.w * this.h);
    this.timer = 0;
    this.build();
  }
  idx(ix, iz) { return iz * this.w + ix; }
  cellOf(x, z) { return [Math.floor((x - this.minX) / this.cell), Math.floor((z - this.minZ) / this.cell)]; }
  build() {
    const P = this.P;
    for (let iz = 0; iz < this.h; iz++) for (let ix = 0; ix < this.w; ix++) {
      const x = this.minX + (ix + 0.5) * this.cell, z = this.minZ + (iz + 0.5) * this.cell;
      const r = P.raycast(_v.set(x, this.topY, z), _d, this.topY - this.minY + 1, _hit, (c) => c.tag !== 'trigger' && !c.dynamic && !c.navIgnore);
      let ok = 0;
      if (r.hit && r.normal.y > 0.6 && r.point.y <= this.maxY && r.point.y >= this.minY && !r.collider.hazard) {
        // clearance: nothing solid in the body volume
        const c = P.collideSphere(_v.set(x, r.point.y + 1.0, z), 0.45, (cc) => cc.tag !== 'trigger' && !cc.dynamic);
        ok = c ? 0 : 1;
        this.height[this.idx(ix, iz)] = r.point.y;
      }
      this.walk[this.idx(ix, iz)] = ok;
    }
  }
  setBlocked(x, z, r, blocked) {
    const [x0, z0] = this.cellOf(x - r, z - r), [x1, z1] = this.cellOf(x + r, z + r);
    for (let iz = Math.max(0, z0); iz <= Math.min(this.h - 1, z1); iz++) for (let ix = Math.max(0, x0); ix <= Math.min(this.w - 1, x1); ix++) this.walk[this.idx(ix, iz)] = blocked ? 0 : 1;
  }
  update(dt, target) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.25;
    let [tx, tz] = this.cellOf(target.x, target.z);
    tx = Math.max(0, Math.min(this.w - 1, tx)); tz = Math.max(0, Math.min(this.h - 1, tz));
    // if target cell not walkable (player on a platform), seed from nearest walkable cells
    this.dist.fill(-1);
    let qh = 0, qt = 0;
    const seed = (ix, iz) => { const i = this.idx(ix, iz); if (this.walk[i] && this.dist[i] < 0) { this.dist[i] = 0; this.queue[qt++] = i; } };
    seed(tx, tz);
    for (let r = 1; qt === 0 && r < 8; r++) {
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
        const ix = tx + dx, iz = tz + dz;
        if (ix >= 0 && iz >= 0 && ix < this.w && iz < this.h) seed(ix, iz);
      }
    }
    const W = this.w;
    while (qh < qt) {
      const i = this.queue[qh++];
      const ix = i % W, iz = (i / W) | 0;
      const d = this.dist[i] + 1;
      const hy = this.height[i];
      if (ix > 0) this._push(i - 1, d, hy, qt) && (this.queue[qt++] = i - 1);
      if (ix < W - 1) this._push(i + 1, d, hy, qt) && (this.queue[qt++] = i + 1);
      if (iz > 0) this._push(i - W, d, hy, qt) && (this.queue[qt++] = i - W);
      if (iz < this.h - 1) this._push(i + W, d, hy, qt) && (this.queue[qt++] = i + W);
    }
  }
  _push(j, d, hy) {
    if (!this.walk[j] || this.dist[j] >= 0) return false;
    if (Math.abs(this.height[j] - hy) > 0.9) return false; // too steep a step
    this.dist[j] = d;
    return true;
  }
  // direction (xz) for an agent at pos to descend the distance field
  dirTo(pos, out) {
    const [ix, iz] = this.cellOf(pos.x, pos.z);
    if (ix < 0 || iz < 0 || ix >= this.w || iz >= this.h) return false;
    const i = this.idx(ix, iz);
    let best = this.dist[i] >= 0 ? this.dist[i] : 1e9, bx = 0, bz = 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const jx = ix + dx, jz = iz + dz;
      if (jx < 0 || jz < 0 || jx >= this.w || jz >= this.h) continue;
      const j = this.idx(jx, jz);
      let d = this.dist[j];
      if (d < 0) continue;
      if (dx && dz) { // no corner cutting
        if (this.dist[this.idx(ix + dx, iz)] < 0 || this.dist[this.idx(ix, iz + dz)] < 0) continue;
        d += 0.4;
      }
      if (d < best) { best = d; bx = dx; bz = dz; }
    }
    if (!bx && !bz) return false;
    // aim at the neighbour cell center for smooth motion
    const cx = this.minX + (ix + bx + 0.5) * this.cell, cz = this.minZ + (iz + bz + 0.5) * this.cell;
    out.set(cx - pos.x, 0, cz - pos.z);
    const l = out.length();
    if (l < 1e-3) return false;
    out.divideScalar(l);
    return true;
  }
}
