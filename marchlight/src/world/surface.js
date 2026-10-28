// THE SURFACE — playable ground below Meridian.
// A zone is built in the ground's frame (a group under worldRoot, offset so that, while the city holds
// still, its local coordinates equal the city frame the physics lives in). Its terrain collider samples
// the same height function the terrain shader uses, so feet meet the grass you see. Zones are disposed
// when a chapter leaves them (meshes and colliders both).
import * as THREE from 'three';
import { Builder } from './builder.js';
import { GROUND_Y } from './city.js';
import { crate, barrel } from './props.js';
import { rng, clamp } from '../core/util.js';

export class Zone {
  constructor(game, name) {
    this.game = game; this.name = name; this.T0 = game.city.travel;
    this.root = new THREE.Group(); this.root.name = 'zone:' + name; this.root.position.z = -this.T0;
    game.engine.worldRoot.add(this.root);
    this.colliders = []; this.disposers = []; this.spots = {}; this.offs = [];
    const P = game.physics, cols = this.colliders;
    // a Builder whose colliders we keep, so the zone can be torn down cleanly
    this.b = new Builder(game, this.root, { cell: 60 });
    this.b.physics = new Proxy(P, { get: (t, k) => (k === 'addBox' || k === 'addCylinder' || k === 'addTrimesh') ? (...a) => { const c = t[k](...a); cols.push(c); return c; } : (typeof t[k] === 'function' ? t[k].bind(t) : t[k]) });
  }
  // ground height in the city frame (the terrain shader's own function, sampled at the frozen travel)
  gy(x, z) { return GROUND_Y + this.game.ground.heightAt(x, z - this.T0); }
  v(x, dy, z) { return new THREE.Vector3(x, this.gy(x, z) + dy, z); }
  terrain(x0, x1, z0, z1, step = 4) {
    const nx = Math.round((x1 - x0) / step), nz = Math.round((z1 - z0) / step);
    const geo = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz); geo.rotateX(-Math.PI / 2);
    const P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i) + (x0 + x1) / 2, z = P.getZ(i) + (z0 + z1) / 2; P.setXYZ(i, x, this.gy(x, z) - 0.02, z); }
    this.colliders.push(this.game.physics.addTrimesh(geo, new THREE.Matrix4(), { surface: 'dirt' }));
    geo.dispose();
  }
  finalize() { this.b.finalize(); }
  dispose() {
    const P = this.game.physics;
    for (const c of this.colliders) { try { const body = c.parent(); P.world.removeCollider(c, false); if (body) P.world.removeRigidBody(body); } catch { /* */ } }
    this.colliders = [];
    this.offs.forEach(f => f()); this.offs = [];
    this.disposers.forEach(f => f()); this.disposers = [];
    this.root.traverse(o => { o.geometry?.dispose?.(); });
    this.root.removeFromParent();
  }
}

// ----------------------------------------------------------------------------- kit for the old world
const R = rng(1111);
export function car(z, x, y, zz, ry, o = {}) {
  const b = z.b, col = o.color ?? [0x7a3a2a, 0x3a4a5a, 0x5a5a4a, 0x8a7a5a, 0x4a5a3a, 0x6a6a6a, 0x2a3a4a][Math.floor(R() * 7)];
  const L = o.L ?? 4.3, W = o.W ?? 1.8, c = Math.cos(ry), s = Math.sin(ry);
  const at = (dx, dy, dz) => [x + dx * c + dz * s, y + dy, zz - dx * s + dz * c];
  b.box('rust', at(0, 0.55, 0), [W, 0.7, L], { ry, color: col, tex: 1.5, round: 0.12 });
  b.box('rust', at(0, 1.15, -0.25), [W - 0.12, 0.55, L * 0.5], { ry, color: col, tex: 1.5, round: 0.12, collide: false });
  b.box('glassDark', at(0, 1.15, -0.25), [W - 0.08, 0.42, L * 0.46], { ry, collide: false });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl('rubber', at(sx * (W / 2 - 0.05), 0.33, sz * L * 0.32), 0.33, 0.22, { rz: Math.PI / 2, ry, color: 0x1a1a1a, seg: 10 });
  if (o.overgrown !== false) bush(z, ...at((R() - 0.5) * W, 1.2, (R() - 0.5) * L), 0.45 + R() * 0.4);
}
export function bus(z, x, y, zz, ry) {
  const b = z.b; b.box('rust', [x, y + 1.55, zz], [2.5, 2.7, 11], { ry, color: 0x9a7a3a, tex: 2, round: 0.15 });
  b.box('glassDark', [x, y + 2.1, zz], [2.55, 0.8, 9.6], { ry, collide: false });
  bush(z, x, y + 3.0, zz + 2, 0.9); bush(z, x, y + 2.9, zz - 3, 0.7);
}
export function bush(z, x, y, zz, s = 1) {
  const g = [0x3a5a2a, 0x4a6a2a, 0x2f4a24, 0x5a6a30][Math.floor(R() * 4)];
  z.b.sphere('leaf', [x, y, zz], s, { color: g, seg: 8, sy: 0.75 });
  if (s > 0.6) z.b.sphere('leaf', [x + s * 0.6, y - s * 0.2, zz + s * 0.3], s * 0.65, { color: g, seg: 7, sy: 0.75 });
}
export function tree(z, x, zz, h = 9) {
  const y = z.gy(x, zz);
  z.b.cyl('wood', [x, y + h * 0.3, zz], h * 0.035, h * 0.6, { r2: h * 0.025, color: 0x4a3a2a, seg: 7, collide: true });
  for (let i = 0; i < 3; i++) z.b.sphere('leaf', [x + (R() - 0.5) * h * 0.25, y + h * (0.62 + i * 0.12), zz + (R() - 0.5) * h * 0.25], h * (0.24 - i * 0.04), { color: [0x2f4a24, 0x3a5a2a, 0x46602c][i], seg: 9, sy: 0.8 });
}
// a tuft: seven thin blades fanned out from the root, each bending outward (reads as grass, not a spike)
function tuftGeometry() {
  const pos = [], nrm = [];
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2 + (i % 2) * 0.3, lean = 0.18 + (i % 3) * 0.08, h = 0.45 + (i % 4) * 0.09, w = 0.05;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz * w, pz = dx * w, tip = [dx * lean, h, dz * lean];
    pos.push(px, 0, pz, -px, 0, -pz, ...tip);
    for (let k = 0; k < 3; k++) nrm.push(dx * 0.4, 0.9, dz * 0.4);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return g;
}
// a field of grass clumps: one instanced mesh (cheap) seated on the terrain
export function grass(z, x0, x1, z0, z1, n, o = {}) {
  const geo = tuftGeometry();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, side: THREE.DoubleSide });
  const im = new THREE.InstancedMesh(geo, mat, n), m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const x = x0 + R() * (x1 - x0), zz = z0 + R() * (z1 - z0); if (o.skip?.(x, zz)) { m.makeScale(0, 0, 0); im.setMatrixAt(i, m); continue; }
    const s = 0.5 + R() * 1.0; q.setFromEuler(e.set((R() - 0.5) * 0.5 + (o.lean || 0), R() * 6, (R() - 0.5) * 0.5));
    m.compose(new THREE.Vector3(x, z.gy(x, zz) - 0.05, zz), q, new THREE.Vector3(s, s * (0.7 + R() * 0.8), s)); im.setMatrixAt(i, m);
    c.setHSL(0.17 + R() * 0.08, 0.35 + R() * 0.2, (o.dry ? 0.38 : 0.24) + R() * 0.12); im.setColorAt(i, c);
  }
  im.receiveShadow = true; z.root.add(im); z.disposers.push(() => { geo.dispose(); mat.dispose(); });
  return im;
}
// a ruined concrete building: floor slabs, corner columns, broken walls with window gaps, stairs inside
export function shell(z, cx, cz, w, d, floors, o = {}) {
  const b = z.b, y0 = z.gy(cx, cz) - 0.3, FH = o.fh ?? 3.5, col = o.color ?? 0x8a847a, r = rng(o.seed ?? 7);
  const levels = [];
  // the stairwell: every slab above the ground has a hole over the stair footprint (east side). Flights
  // alternate between two lanes side by side (even floors west lane, odd floors east lane) so each has headroom.
  const sx = cx + w / 2 - 3.0, run = Math.min(d - 3, 5.2), hz1 = cz + d / 2 - 1.2, hz0 = hz1 - run, hx0 = sx - 2.2, hx1 = sx + 2.2;
  const slab = (y, c) => {
    const W0 = cx - w / 2, E0 = cx + w / 2, N0 = cz - d / 2, S0 = cz + d / 2;
    b.box('concrete', [(W0 + hx0) / 2, y - 0.15, cz], [hx0 - W0, 0.3, d], { color: c, tex: 3 });
    b.box('concrete', [(hx1 + E0) / 2, y - 0.15, cz], [E0 - hx1, 0.3, d], { color: c, tex: 3 });
    b.box('concrete', [(hx0 + hx1) / 2, y - 0.15, (N0 + hz0) / 2], [hx1 - hx0, 0.3, hz0 - N0], { color: c, tex: 3 });
    b.box('concrete', [(hx0 + hx1) / 2, y - 0.15, (hz1 + S0) / 2], [hx1 - hx0, 0.3, S0 - hz1], { color: c, tex: 3 });
  };
  for (let f = 0; f <= floors; f++) {
    const y = y0 + f * FH; levels.push(y);
    if (f > 0 && !(o.holes && o.holes.includes(f))) { if (o.stairs === false) b.box('concrete', [cx, y - 0.15, cz], [w, 0.3, d], { color: col, tex: 3 }); else slab(y, col); }
    if (f === 0) b.box('concrete', [cx, y - 0.15, cz], [w, 0.3, d], { color: 0x6a665e, tex: 3 });
    if (f === floors) break;
    // walls, with window gaps and broken stretches
    for (const [side, len] of [['n', w], ['s', w], ['e', d], ['w', d]]) {
      const n = Math.max(2, Math.round(len / 4)), seg = len / n;
      for (let i = 0; i < n; i++) {
        if (o.open?.includes(side + f + ':' + i) || r() < (o.broken ?? 0.12)) continue;
        const u = -len / 2 + (i + 0.5) * seg, hgt = r() < 0.15 ? FH * (0.3 + r() * 0.5) : FH;
        const win = r() < 0.6 && hgt === FH;
        const put = (du, dy, su, sy) => { const p = side === 'n' ? [cx + du, y + dy, cz - d / 2] : side === 's' ? [cx + du, y + dy, cz + d / 2] : side === 'e' ? [cx + w / 2, y + dy, cz + du] : [cx - w / 2, y + dy, cz + du]; const sz = side === 'n' || side === 's' ? [su, sy, 0.35] : [0.35, sy, su]; b.box('concrete', p, sz, { color: col, tex: 2.5 }); };
        if (win) { put(u, 0.5, seg, 1.0); put(u, FH - 0.45, seg, 0.9); put(u - seg / 2 + 0.25, FH / 2, 0.5, FH); }
        else put(u, hgt / 2, seg, hgt);
      }
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box('concrete', [cx + sx * (w / 2 - 0.3), y + FH / 2, cz + sz * (d / 2 - 0.3)], [0.7, FH, 0.7], { color: col - 0x101010, tex: 2 });
    // stairs in the north-east corner, alternating direction each floor
    if (o.stairs !== false && f < floors) {
      if (f % 2 === 0) b.stairs('concrete', [sx - 1.1, y, hz1], run, FH, 2.0, Math.PI, { color: 0x9a948a, tex: 1.5, rails: false });
      else b.stairs('concrete', [sx + 1.1, y, hz0], run, FH, 2.0, 0, { color: 0x9a948a, tex: 1.5, rails: false });
    }
  }
    // the way up from floor f: where its flight starts and where it arrives
  const flight = (f) => f % 2 === 0 ? { x: sx - 1.1, from: hz1 + 0.9, to: hz0 - 0.6 } : { x: sx + 1.1, from: hz0 - 0.9, to: hz1 + 0.6 };
  return { levels, top: y0 + floors * FH, FH, stair: { x: sx, z0: hz0, z1: hz1 }, flight };
}
