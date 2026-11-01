// GETAWAY! — street furniture, trees, traffic signals and breakable glass, rendered instanced.
// Props are static until hit; then the instance is hidden and a physical rigid body takes over.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { rand, clamp } from '../core/utils.js';
import { RigidBody } from '../fx/rigid.js';
import { signal } from './signals.js';
import { HR } from './layout.js';

const M4 = () => new THREE.Matrix4();
const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
export function mergeParts(parts) {
  const pos = [], nor = [], col = [];
  const c = new THREE.Color(); const v = new THREE.Vector3(); const nm = new THREE.Matrix3();
  for (const p of parts) {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo; const m = p.m || M4(); nm.getNormalMatrix(m); c.set(p.c ?? 0x888888);
    const pa = g.attributes.position, na = g.attributes.normal;
    for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(m); pos.push(v.x, v.y, v.z); v.fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); nor.push(v.x, v.y, v.z); col.push(c.r, c.g, c.b); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.computeBoundingSphere(); return g;
}
const box = (w, h, d, x = 0, y = 0, z = 0, c, rot) => ({ geo: new THREE.BoxGeometry(w, h, d), m: rot ? T(x, y, z).multiply(rot) : T(x, y, z), c });
const cyl = (r1, r2, h, x = 0, y = 0, z = 0, c, seg = 10, rot) => ({ geo: new THREE.CylinderGeometry(r1, r2, h, seg), m: rot ? T(x, y, z).multiply(rot) : T(x, y, z), c });
const sph = (r, x, y, z, c, d = 1) => ({ geo: new THREE.IcosahedronGeometry(r, d), m: T(x, y, z), c });
const RX = (a) => new THREE.Matrix4().makeRotationX(a), RZ = (a) => new THREE.Matrix4().makeRotationZ(a), RY = (a) => new THREE.Matrix4().makeRotationY(a);

// type definitions: parts, collision radius, height, mass, break speed, effect
const DEFS = {
  lamp: { r: 0.25, h: 7.5, mass: 120, brk: 7, fx: 'sparks', half: [0.15, 3.7, 0.15], parts: () => [cyl(0.11, 0.16, 7.2, 0, 3.6, 0, 0x2d3236), cyl(0.25, 0.3, 0.5, 0, 0.25, 0, 0x2d3236), box(0.12, 0.12, 2.0, 0, 7.1, -1.0, 0x2d3236), box(0.5, 0.18, 0.9, 0, 7.0, -2.0, 0x3b4146)], glow: [0, 6.88, -2.0, 0.42, 0.04, 0.75] },
  hwylamp: { r: 0.3, h: 9, mass: 200, brk: 12, fx: 'sparks', half: [0.2, 4.5, 0.2], parts: () => [cyl(0.15, 0.2, 9, 0, 4.5, 0, 0x6d7378), box(0.14, 0.14, 6, 0, 9, 0, 0x6d7378), box(0.6, 0.2, 1, 0, 8.9, -2.8, 0x6d7378), box(0.6, 0.2, 1, 0, 8.9, 2.8, 0x6d7378)], glow: [0, 8.78, 0, 0.5, 0.04, 6.4] },
  hydrant: { r: 0.3, h: 0.8, mass: 90, brk: 6, fx: 'water', half: [0.2, 0.4, 0.2], parts: () => [cyl(0.17, 0.2, 0.7, 0, 0.35, 0, 0xc0392b), sph(0.17, 0, 0.72, 0, 0xc0392b), cyl(0.07, 0.07, 0.5, 0, 0.45, 0, 0xd4ac0d, 8, RZ(Math.PI / 2))] },
  bin: { r: 0.35, h: 1, mass: 25, brk: 3, fx: 'trash', half: [0.3, 0.48, 0.3], parts: () => [cyl(0.3, 0.27, 0.95, 0, 0.48, 0, 0x2d4a3a), cyl(0.32, 0.32, 0.06, 0, 0.97, 0, 0x22332a)] },
  bench: { r: 0.9, h: 0.9, mass: 60, brk: 5, fx: 'wood', half: [0.9, 0.45, 0.3], parts: () => [box(1.8, 0.07, 0.45, 0, 0.46, 0, 0x8a6440), box(1.8, 0.4, 0.06, 0, 0.75, -0.22, 0x8a6440), box(0.06, 0.46, 0.45, -0.8, 0.23, 0, 0x222222), box(0.06, 0.46, 0.45, 0.8, 0.23, 0, 0x222222)] },
  newsbox: { r: 0.35, h: 1.1, mass: 35, brk: 3, fx: 'paper', half: [0.25, 0.55, 0.22], parts: () => [box(0.5, 1.0, 0.45, 0, 0.5, 0, 0x1e5799), box(0.38, 0.3, 0.02, 0, 0.75, 0.23, 0xdddddd)] },
  meter: { r: 0.15, h: 1.4, mass: 15, brk: 3, fx: 'coins', half: [0.1, 0.7, 0.1], parts: () => [cyl(0.04, 0.04, 1.1, 0, 0.55, 0, 0x555555), box(0.22, 0.3, 0.16, 0, 1.25, 0, 0x7f8c8d)] },
  busstop: { r: 1.8, h: 2.7, mass: 250, brk: 9, fx: 'glass', half: [1.9, 1.3, 0.7], parts: () => [box(4, 0.1, 1.6, 0, 2.6, 0, 0x6d7378), box(0.08, 2.6, 0.08, -1.9, 1.3, 0.7, 0x6d7378), box(0.08, 2.6, 0.08, 1.9, 1.3, 0.7, 0x6d7378), box(0.08, 2.6, 0.08, -1.9, 1.3, -0.7, 0x6d7378), box(0.08, 2.6, 0.08, 1.9, 1.3, -0.7, 0x6d7378), box(3.8, 2.2, 0.04, 0, 1.3, -0.72, 0x9ac4d8), box(0.04, 2.2, 1.3, 1.9, 1.3, 0, 0xe0c45a), box(3, 0.08, 0.4, 0, 0.5, -0.4, 0x777777)] },
  mailbox: { r: 0.3, h: 1.2, mass: 40, brk: 4, fx: 'paper', half: [0.25, 0.6, 0.25], parts: () => [box(0.45, 0.8, 0.45, 0, 0.75, 0, 0x1f3a93), cyl(0.225, 0.225, 0.45, 0, 1.15, 0, 0x1f3a93, 10, RX(Math.PI / 2)), box(0.08, 0.4, 0.08, 0, 0.2, 0, 0x222222)] },
  dumpster: { r: 1.2, h: 1.4, mass: 400, brk: 14, fx: 'trash', half: [1.0, 0.65, 0.6], parts: () => [box(2.0, 1.2, 1.15, 0, 0.7, 0, 0x2e6b3a), box(2.1, 0.08, 1.25, 0, 1.33, 0, 0x234f2c), box(2.0, 0.1, 0.1, 0, 0.2, 0.62, 0x222222)] },
  barrel: { r: 0.35, h: 0.95, mass: 60, brk: 4, fx: 'explode', half: [0.3, 0.45, 0.3], shootable: true, parts: () => [cyl(0.3, 0.3, 0.9, 0, 0.45, 0, 0xc0392b, 12), cyl(0.31, 0.31, 0.12, 0, 0.62, 0, 0xf1c40f, 12), cyl(0.31, 0.31, 0.05, 0, 0.2, 0, 0x7b241c, 12)] },
  cone: { r: 0.25, h: 0.7, mass: 4, brk: 1, fx: 'none', half: [0.2, 0.35, 0.2], parts: () => [{ geo: new THREE.ConeGeometry(0.18, 0.65, 10), m: T(0, 0.36, 0), c: 0xe67e22 }, box(0.45, 0.04, 0.45, 0, 0.02, 0, 0x333333), cyl(0.12, 0.14, 0.08, 0, 0.42, 0, 0xffffff, 10)] },
  barrier: { r: 1.7, h: 1.2, mass: 30, brk: 3, fx: 'wood', half: [1.8, 0.2, 0.1], parts: () => [box(3.6, 0.22, 0.12, 0, 1.0, 0, 0xe74c3c), box(0.6, 0.23, 0.13, -1.2, 1.0, 0, 0xffffff), box(0.6, 0.23, 0.13, 0, 1.0, 0, 0xffffff), box(0.6, 0.23, 0.13, 1.2, 1.0, 0, 0xffffff), box(0.15, 1.0, 0.15, -1.8, 0.5, 0, 0x555555), box(0.15, 1.0, 0.15, 1.8, 0.5, 0, 0x555555)] },
  fence: { r: 1.6, h: 2, mass: 30, brk: 3, fx: 'metal', half: [1.5, 1.0, 0.1], parts: () => [box(3, 0.06, 0.06, 0, 2.0, 0, 0x9aa0a6), box(3, 0.06, 0.06, 0, 0.1, 0, 0x9aa0a6), box(0.06, 2, 0.06, -1.5, 1, 0, 0x9aa0a6), box(0.06, 2, 0.06, 1.5, 1, 0, 0x9aa0a6), box(2.9, 1.85, 0.02, 0, 1.05, 0, 0x2d6b3a), box(0.6, 0.2, 0.3, -1.5, 0.1, 0, 0x777777)] },
  rail: { r: 2, h: 1.1, mass: 40, brk: 7, fx: 'metal', half: [2, 0.5, 0.05], parts: () => [box(4, 0.08, 0.08, 0, 1.05, 0, 0x5d6d7e), box(4, 0.06, 0.06, 0, 0.55, 0, 0x5d6d7e), box(0.08, 1.1, 0.08, -1.95, 0.55, 0, 0x5d6d7e), box(0.08, 1.1, 0.08, 0, 0.55, 0, 0x5d6d7e)] },
  umbrella: { r: 0.4, h: 2.4, mass: 6, brk: 1, fx: 'none', half: [0.1, 1.2, 0.1], parts: () => [cyl(0.03, 0.03, 2.3, 0, 1.15, 0, 0xeeeeee), { geo: new THREE.ConeGeometry(1.3, 0.5, 8), m: T(0, 2.3, 0), c: [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71, 0xffffff][(Math.random() * 5) | 0] }] },
  planter: { r: 1.1, h: 1.5, mass: 600, brk: 30, fx: 'none', half: [1, 0.5, 1], parts: () => [box(2, 0.7, 2, 0, 0.35, 0, 0xb5aa98), sph(0.9, 0, 1.2, 0, 0x3e7a35)] },
  kiosk: { r: 1.4, h: 2.6, mass: 300, brk: 12, fx: 'glass', half: [1.2, 1.3, 0.9], parts: () => [box(2.4, 1.1, 1.8, 0, 0.55, 0, 0xffffff), box(2.6, 0.1, 2.0, 0, 2.5, 0, 0xc0392b), box(0.08, 1.4, 0.08, -1.15, 1.8, 0.85, 0x999999), box(0.08, 1.4, 0.08, 1.15, 1.8, 0.85, 0x999999), box(2.2, 0.5, 1.6, 0, 1.35, 0, 0x9ac4d8)] },
  xing: { r: 0.3, h: 4, mass: 100, brk: 99, fx: 'none', static: true, half: [0.2, 2, 0.2], parts: () => [cyl(0.1, 0.12, 3.6, 0, 1.8, 0, 0xeeeeee), box(1.0, 0.25, 0.1, 0, 3.2, 0, 0x111111), { geo: new THREE.CircleGeometry(0.6, 3), m: T(0, 2.7, 0.06), c: 0xffffff }, box(0.5, 0.5, 0.5, 0, 1.2, 0, 0x333333)] },
};

export class Props {
  constructor(world, scene) {
    this.world = world; this.scene = scene; this.S = world.static; this.list = []; this.hash = new Map(); this.cell = 16;
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.25 });
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0xfff0cc, toneMapped: false });
    this.geos = {}; for (const k in DEFS) this.geos[k] = mergeParts(DEFS[k].parts());
    this.loose = []; this.sprays = [];
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._v = new THREE.Vector3(); this._zero = new THREE.Matrix4().makeScale(0, 0, 0);
    this.build(world);
  }
  _key(x, z) { return Math.floor(x / this.cell) * 7919 + Math.floor(z / this.cell); }
  build(world) {
    const CH = 400; const groups = new Map();
    for (const s of world.props) {
      const def = DEFS[s.type]; if (!def) continue;
      const p = { ...s, def, alive: true, id: this.list.length }; this.list.push(p);
      const ck = Math.floor(s.x / CH) + ',' + Math.floor(s.z / CH) + '|' + s.type; let g = groups.get(ck); if (!g) groups.set(ck, (g = [])); g.push(p);
      const k = this._key(s.x, s.z); let l = this.hash.get(k); if (!l) this.hash.set(k, (l = [])); l.push(p);
    }
    this.meshes = [];
    for (const [ck, arr] of groups) {
      const type = ck.split('|')[1]; const def = DEFS[type];
      const im = new THREE.InstancedMesh(this.geos[type], this.mat, arr.length); im.castShadow = type !== 'cone' && type !== 'meter'; im.receiveShadow = true;
      let glow = null; if (def.glow) { const [gx, gy, gz, w, h, d] = def.glow; const gg = new THREE.BoxGeometry(w, h, d); gg.translate(gx, gy, gz); glow = new THREE.InstancedMesh(gg, this.glowMat, arr.length); }
      arr.forEach((p, i) => { this._m.compose(this._v.set(p.x, p.y, p.z), this._q.setFromAxisAngle(this._v2 || (this._v2 = new THREE.Vector3(0, 1, 0)), p.yaw), this._s.set(1, 1, 1)); im.setMatrixAt(i, this._m); if (glow) glow.setMatrixAt(i, this._m); p.mesh = im; p.glow = glow; p.idx = i; });
      im.computeBoundingSphere(); this.scene.add(im); this.meshes.push(im);
      if (glow) { glow.computeBoundingSphere(); this.scene.add(glow); }
    }
    // crossing arms (animated)
    const xs = this.list.filter((p) => p.type === 'xing');
    const armG = mergeParts([box(7.5, 0.18, 0.12, 3.75, 0, 0, 0xffffff), box(1.2, 0.19, 0.13, 1.5, 0, 0, 0xe74c3c), box(1.2, 0.19, 0.13, 4, 0, 0, 0xe74c3c), box(1.2, 0.19, 0.13, 6.5, 0, 0, 0xe74c3c)]);
    this.arms = new THREE.InstancedMesh(armG, this.mat, Math.max(1, xs.length)); this.armList = xs; this.scene.add(this.arms); this.crossingLevel = 0; this._setCrossing(0);
    // trees
    this._buildTrees(world.trees);
    // traffic lights
    this._buildSignals(world.lights);
    // glass panes
    this._buildGlass(world.glass);
  }
  _setCrossing(level) {
    this.armList.forEach((p, i) => { const ang = (1 - level) * 1.35; this._q.setFromEuler(new THREE.Euler(0, p.yaw, ang, 'YXZ')); this._m.compose(this._v.set(p.x, 3.2, p.z), this._q, this._s.set(1, 1, 1)); this.arms.setMatrixAt(i, this._m); });
    this.arms.instanceMatrix.needsUpdate = true; this.arms.computeBoundingSphere();
  }
  setCrossing(level) { if (Math.abs(level - this.crossingLevel) > 0.01) { this.crossingLevel = level; this._setCrossing(level); } }
  _buildTrees(trees) {
    const kinds = {
      round: mergeParts([cyl(0.18, 0.28, 3.2, 0, 1.6, 0, 0x5a4128, 7), sph(1.7, 0, 4.2, 0, 0x3f7a2e), sph(1.3, 0.9, 3.7, 0.4, 0x4c8a36), sph(1.2, -0.8, 3.9, -0.5, 0x356b28), sph(1.0, 0.2, 5.2, -0.3, 0x5a9a3e)]),
      pine: mergeParts([cyl(0.15, 0.25, 2.5, 0, 1.25, 0, 0x5a4128, 7), { geo: new THREE.ConeGeometry(2.0, 3.2, 8), m: T(0, 3.3, 0), c: 0x2a5a2e }, { geo: new THREE.ConeGeometry(1.6, 2.8, 8), m: T(0, 4.9, 0), c: 0x2f6a34 }, { geo: new THREE.ConeGeometry(1.1, 2.4, 8), m: T(0, 6.3, 0), c: 0x357a3a }]),
      palm: (() => { const parts = []; let x = 0; for (let i = 0; i < 8; i++) { x += 0.06 * i * 0.3; parts.push(cyl(0.2 - i * 0.012, 0.22 - i * 0.012, 1.1, x, 0.55 + i * 1.05, 0, i % 2 ? 0x8a6a48 : 0x7a5c3c, 7)); } const top = new THREE.Vector3(x, 8.6, 0); for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; parts.push({ geo: new THREE.BoxGeometry(3.4, 0.05, 0.6), m: T(top.x + Math.cos(a) * 1.5, top.y - 0.3, top.z + Math.sin(a) * 1.5).multiply(RY(-a)).multiply(RZ(-0.35)), c: k % 2 ? 0x3f8a3a : 0x2f7a32 }); } parts.push(sph(0.35, top.x, top.y - 0.2, 0, 0x5a4128)); return mergeParts(parts); })(),
    };
    const CH = 600; const groups = new Map();
    for (const t of trees) { const k = Math.floor(t.x / CH) + ',' + Math.floor(t.z / CH) + '|' + t.kind; let g = groups.get(k); if (!g) groups.set(k, (g = [])); g.push(t); }
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    for (const [k, arr] of groups) {
      const kind = k.split('|')[1]; const im = new THREE.InstancedMesh(kinds[kind], mat, arr.length); im.castShadow = true; im.receiveShadow = true;
      arr.forEach((t, i) => { this._m.compose(this._v.set(t.x, t.y, t.z), this._q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (t.x * 13.7 + t.z) % 6.28), this._s.set(t.s, t.s * (0.9 + ((t.x * 7) % 1) * 0.3), t.s)); im.setMatrixAt(i, this._m); this.S.addBox(t.x - 0.3 * t.s, t.y, t.z - 0.3 * t.s, t.x + 0.3 * t.s, t.y + 3, t.z + 0.3 * t.s, { mat: 'wood', surface: false, tag: 'tree' }); });
      im.computeBoundingSphere(); this.scene.add(im);
    }
  }
  _buildSignals(lights) {
    // 4 heads per lit intersection: one per approach direction
    const dirs = [[0, 1, 'ns'], [0, -1, 'ns'], [1, 0, 'ew'], [-1, 0, 'ew']];
    const poleG = mergeParts([cyl(0.12, 0.15, 6, 0, 3, 0, 0x2b2f33), box(0.12, 0.12, 6.5, 0, 5.8, 3.25, 0x2b2f33), box(0.45, 1.3, 0.35, 0, 5.2, 6.2, 0x1b1d20)]);
    const n = lights.length * 4; this.signalHeads = [];
    const poles = new THREE.InstancedMesh(poleG, this.mat, n); poles.castShadow = true;
    const bulbG = new THREE.SphereGeometry(0.13, 8, 6); const bulbs = new THREE.InstancedMesh(bulbG, new THREE.MeshBasicMaterial({ toneMapped: false }), n * 3);
    let i = 0;
    for (const L of lights) {
      const node = this.world.graph.nodes[L.node];
      for (const [dx, dz, axis] of dirs) {
        // approach direction (dx,dz); right of travel = (-dz, dx); pole at far-right corner
        const rx = -dz, rz = dx; const px = L.x + dx * (HR + 2) + rx * (HR + 2), pz = L.z + dz * (HR + 2) + rz * (HR + 2);
        const yaw = Math.atan2(-rx, -rz); // arm (+z local) points toward road center (-right)
        this._m.compose(this._v.set(px, 0.15, pz), this._q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), this._s.set(1, 1, 1)); poles.setMatrixAt(i, this._m);
        const hx = px - rx * 6.2, hz = pz - rz * 6.2; const fx = -dx * 0.2, fz = -dz * 0.2;
        const head = { node, axis, bulbs: [i * 3, i * 3 + 1, i * 3 + 2], x: hx, z: hz, state: '' };
        for (let k = 0; k < 3; k++) { this._m.compose(this._v.set(hx + fx, 5.2 + 5.6 - 5.2 + (0.4 - k * 0.4) - 0.0 + 0, hz + fz), this._q.identity(), this._s.set(1, 1, 1)); this._m.setPosition(hx + fx, 5.6 - k * 0.4 + 0.15, hz + fz); bulbs.setMatrixAt(i * 3 + k, this._m); bulbs.setColorAt(i * 3 + k, new THREE.Color(0x111111)); }
        this.signalHeads.push(head); this.S.addBox(px - 0.15, 0, pz - 0.15, px + 0.15, 6, pz + 0.15, { mat: 'metal', surface: false });
        i++;
      }
    }
    poles.computeBoundingSphere(); bulbs.computeBoundingSphere(); this.scene.add(poles); this.scene.add(bulbs); this.bulbs = bulbs; this.sigT = 0;
  }
  _buildGlass(panes) {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x9ec3d0, transparent: true, opacity: 0.28, roughness: 0.04, metalness: 0.9, depthWrite: false });
    this.glass = new THREE.InstancedMesh(geo, mat, Math.max(1, panes.length)); this.glass.renderOrder = 3; this.glassList = [];
    panes.forEach((p, i) => {
      const t = 0.06; let x0, x1, z0, z1; if (p.along) { x0 = p.a0; x1 = p.a1; z0 = p.c - t; z1 = p.c + t; } else { z0 = p.a0; z1 = p.a1; x0 = p.c - t; x1 = p.c + t; }
      this._m.compose(this._v.set((x0 + x1) / 2, (p.y0 + p.y1) / 2, (z0 + z1) / 2), this._q.identity(), this._s.set(x1 - x0, p.y1 - p.y0, z1 - z0)); this.glass.setMatrixAt(i, this._m);
      const b = this.S.addBox(x0, p.y0, z0, x1, p.y1, z1, { mat: 'glass', glass: true, surface: false });
      const rec = { i, box: b, alive: true, cx: (x0 + x1) / 2, cy: (p.y0 + p.y1) / 2, cz: (z0 + z1) / 2, w: Math.max(x1 - x0, z1 - z0), h: p.y1 - p.y0, normal: p.along ? new THREE.Vector3(0, 0, p.face === 'pz' ? 1 : -1) : new THREE.Vector3(p.face === 'px' ? 1 : -1, 0, 0) };
      b.onBreak = (bx, vel) => this.breakGlass(rec, vel); this.glassList.push(rec);
    });
    this.glass.computeBoundingSphere(); this.scene.add(this.glass);
  }
  breakGlass(rec, vel) {
    if (!rec.alive) return; rec.alive = false; rec.box.disabled = true;
    this.glass.setMatrixAt(rec.i, this._zero); this.glass.instanceMatrix.needsUpdate = true;
    const p = new THREE.Vector3(rec.cx, rec.cy, rec.cz); const n = vel ? new THREE.Vector3(vel.x, 0, vel.z).normalize() : rec.normal;
    if (G.fx) { for (let k = 0; k < 3; k++) G.fx.glass(new THREE.Vector3(rec.cx + (n.z ? (k - 1) * rec.w / 3 : 0), rec.cy + rand(-0.8, 0.8), rec.cz + (n.x ? (k - 1) * rec.w / 3 : 0)), 14, n, 4); }
    if (G.audio) G.audio.glass(p, 1);
    G.emit('glassBreak', p);
  }
  near(x, z, r, out = []) {
    out.length = 0; const c = this.cell; const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c), z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) { const l = this.hash.get(ix * 7919 + iz); if (l) for (const p of l) if (p.alive) out.push(p); }
    return out;
  }
  // knock a prop loose: hide instance, spawn rigid body
  hit(p, vel, point, power = 1) {
    if (!p.alive || p.def.static) return null; p.alive = false;
    p.mesh.setMatrixAt(p.idx, this._zero); p.mesh.instanceMatrix.needsUpdate = true; if (p.glow) { p.glow.setMatrixAt(p.idx, this._zero); p.glow.instanceMatrix.needsUpdate = true; }
    const def = p.def; const mesh = new THREE.Mesh(this.geos[p.type], this.mat); mesh.castShadow = true;
    // mesh geometry origin is at base; offset by half height so rigid center is mid-body
    const holder = new THREE.Group(); mesh.position.y = -def.half[1]; holder.add(mesh); this.scene.add(holder);
    const body = new RigidBody({ half: new THREE.Vector3(...def.half), mass: def.mass, pos: new THREE.Vector3(p.x, p.y + def.half[1], p.z), quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw), mesh: holder, life: 25, kind: 'prop', restitution: 0.3 });
    const v = vel ? vel.clone() : new THREE.Vector3(); const sp = v.length();
    body.vel.copy(v).multiplyScalar(clamp(0.9 * power, 0.2, 1.3)); body.vel.y += clamp(sp * 0.35, 1, 9);
    body.angVel.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(clamp(sp * 0.4, 1, 10));
    body.onRemove = () => { this.scene.remove(holder); };
    body.onImpact = (b, imp) => { if (G.audio && imp > 3) G.audio.impact(b.pos, Math.min(0.6, imp / 15) * (def.mass > 80 ? 1 : 0.5), def.fx === 'wood' ? 'wood' : 'metal'); };
    if (G.rigid) G.rigid.add(body);
    // effects
    const at = point || new THREE.Vector3(p.x, p.y + 0.5, p.z);
    if (G.audio) G.audio.impact(at, clamp(sp / 20, 0.3, 1.2), def.fx === 'wood' ? 'wood' : 'metal');
    if (def.fx === 'water') this._spray(p);
    else if (def.fx === 'sparks' && G.fx) { G.fx.spark(new THREE.Vector3(p.x, p.y + 0.3, p.z), null, 30, 6); if (G.audio) G.audio.scrape(at, 1); }
    else if (def.fx === 'glass' && G.fx) { G.fx.glass(at.clone().setY(p.y + 1.3), 50, null, 5); if (G.audio) G.audio.glass(at, 1.2); }
    else if (def.fx === 'trash' && G.fx) G.fx.debris(at, 12, 0x6b6b5a, 5, 0.18);
    else if (def.fx === 'paper' && G.fx) G.fx.debris(at, 16, 0xeeeeee, 5, 0.12);
    else if (def.fx === 'coins' && G.fx) G.fx.debris(at, 10, 0xd4af37, 4, 0.05);
    else if (def.fx === 'explode') setTimeout(() => G.emit('explosion', new THREE.Vector3(body.pos.x, body.pos.y, body.pos.z), 0.9, 'barrel'), 300 + Math.random() * 400);
    G.emit('propHit', p, sp);
    return body;
  }
  _spray(p) {
    const pos = new THREE.Vector3(p.x, p.y + 0.4, p.z); let life = 25; const snd = G.audio ? G.audio.createLoop('water', { ref: 6 }) : null;
    G.fx.addEmitter({ update: (dt) => { life -= dt; G.fx.water(pos, new THREE.Vector3(rand(-0.15, 0.15), 1, rand(-0.15, 0.15)), 6, 13); if (snd) snd.update(pos, Math.min(1, life) * 0.4); if (life <= 0 && snd) snd.dispose(); return life > 0; } });
    G.emit('hydrant', pos);
  }
  update(dt, t, night) {
    this.glowMat.color.setScalar(0.25 + night * 1.6);
    // signal colors every 0.25s
    this.sigT -= dt; if (this.sigT <= 0 && this.signalHeads) {
      this.sigT = 0.25; let dirty = false; const cols = { g: [0x111111, 0x111111, 0x22ff66], y: [0x111111, 0xffbb00, 0x111111], r: [0xff2a1a, 0x111111, 0x111111] };
      const c = this._c || (this._c = new THREE.Color());
      for (const h of this.signalHeads) { const s = signal(h.node, h.axis, t); if (s !== h.state) { h.state = s; const cc = cols[s]; for (let k = 0; k < 3; k++) { c.set(cc[k]); if (cc[k] !== 0x111111) c.multiplyScalar(2.2); this.bulbs.setColorAt(h.bulbs[k], c); } dirty = true; } }
      if (dirty) this.bulbs.instanceColor.needsUpdate = true;
    }
  }
}
export const PROP_DEFS = DEFS;
