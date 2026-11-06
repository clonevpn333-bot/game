// GETAWAY! — the deep: everything Mission 04 (DEEP END) needs under and on the sea, all built from shapes.
// A trench with its own sea floor, kelp, coral, fish; a rock "knuckle" with a tunnel into a Halcyon mining cavern
// (drill rig, glowing minerals, gas tanks, charge points); a scuba diver controller (3D swim, oxygen, speargun,
// headlamp, bubbles); enemy divers; Juno's submarine (torpedoes); police boats dropping depth charges; mini-subs;
// and the offshore rig base the crew falls back to.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, rand, damp, dampAngle, chance, pick } from '../core/utils.js';
import { Human, LOOKS } from '../characters/humanoid.js';
import { voice } from '../core/streetaudio.js';

export const SEA_Y = -0.8;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Quaternion(), _m = new THREE.Matrix4();
// layout (inside the world bounds, in the open sea south of the beach)
export const BOAT = V(-1185, SEA_Y, 862);
export const MOUTH = V(-991, -27, 903);
export const TUNNEL = [V(-991, -27, 903), V(-979, -29, 898), V(-967, -30.5, 906), V(-955, -30, 913), V(-944, -31, 907)];
export const CH = V(-928, -31, 905); export const CH_R = 15.5;
export const SUBDOCK = V(-1012, -24, 897);
export const RIG = V(-520, 0, 905); export const DECK_Y = 6; export const POOL = { x0: -531, x1: -523, z0: 901, z1: 909 };

function noise2(x, z) { return Math.sin(x * 0.071 + Math.cos(z * 0.053) * 1.7) * 0.6 + Math.sin(z * 0.11 + x * 0.031) * 0.4 + Math.sin((x + z) * 0.23) * 0.15; }
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export function floorH(x, z) {
  const zc = 902 + Math.sin(x / 38) * 14; const tr = sstep(30, 9, Math.abs(z - zc)) * sstep(-1235, -1185, x) * (1 - sstep(-905, -880, x));
  const shelf = -9 - sstep(-1200, -1000, x) * 4; return shelf + noise2(x, z) * 1.6 - tr * (26 + noise2(z, x) * 3) - (x > -1000 ? 0 : 0);
}

// ================= the world =================
export class SeaWorld {
  constructor() {
    this.g = new THREE.Group(); G.scene.add(this.g); this.rocks = []; this.shootables = []; this.statics = []; this.updaters = [];
    const mats = this.mats = {
      sand: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }),
      rock: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }),
      metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.5 }),
      glow: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, emissive: 0xffffff, emissiveIntensity: 1.6 }),
      kelp: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }),
      under: new THREE.MeshBasicMaterial({ color: 0x5fb7c4, transparent: true, opacity: 0.55, side: THREE.BackSide, depthWrite: false, fog: false }),
    };
    this._floor(); this._knuckle(); this._cavern(); this._life(); this._surface(); this._rig();
    // every mineral / charge point must be reachable by a diver: nudge it towards the open middle until a diver-sized sphere fits there
    for (const o of [...this.minerals, ...this.charges]) { o.reach = o.pos.clone(); for (let k = 0; k < 30; k++) { const t = o.reach.clone(); this.collide(t, 0.5); if (t.distanceTo(o.reach) < 0.05) break; o.reach.lerp(CH, 0.12); } }
    // real light from the work lamps / crystals / rig floodlights through the game's two pooled lights (no new lights = no shader recompiles)
    this.lightDefs = [{ x: CH.x, y: CH.y + 4, z: CH.z, color: 0x7fe0ff, intensity: 90, distance: 34 }, { x: CH.x + 6, y: CH.y - 2, z: CH.z - 5, color: 0xffc36b, intensity: 70, distance: 26 }, { x: TUNNEL[2].x, y: TUNNEL[2].y, z: TUNNEL[2].z, color: 0xff9a3c, intensity: 30, distance: 18 },
      { x: RIG.x - 4, y: DECK_Y + 6, z: RIG.z, color: 0xfff1d0, intensity: 160, distance: 50 }, { x: RIG.x + 14, y: DECK_Y + 6, z: RIG.z, color: 0xfff1d0, intensity: 140, distance: 45 }];
    if (G.world.interiorLights) G.world.interiorLights.push(...this.lightDefs);
    // hide the flat city seabed while we're out here (our own floor replaces it)
    this.hidden = []; G.scene.traverse((o) => { if (o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry' && Math.abs(o.position.y + 5.05) < 0.02) { o.visible = false; this.hidden.push(o); } });
    G.underwater = { color: 0x0f5664, far: 60, att: 18 };
    this.bubbles = new Bubbles(); this.spears = new Spears(this); this.torps = new Torpedoes(this); this.dcharges = new DepthCharges(this); this.targets = [];
  }
  _vc(geo, col, j = 0.08) { const c = new THREE.Color(col); const n = geo.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const k = 1 + (Math.random() - 0.5) * j * 2; a[i * 3] = c.r * k; a[i * 3 + 1] = c.g * k; a[i * 3 + 2] = c.b * k; } geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; }
  _floor() { // 420 x 260 m of sea floor with a winding trench
    const W = 440, D = 260, nx = 150, nz = 90; const geo = new THREE.PlaneGeometry(W, D, nx, nz); geo.rotateX(-Math.PI / 2); geo.translate(-1060, 0, 900);
    const p = geo.attributes.position; const col = new Float32Array(p.count * 3); const a = new THREE.Color(0x9c9372), b = new THREE.Color(0x5d6a52), c = new THREE.Color(0x34403f);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const h = floorH(x, z); p.setY(i, h); const t = clamp((-h - 9) / 26, 0, 1); _w.set(0, 0, 0); const cc = a.clone().lerp(b, clamp(t * 1.6, 0, 1)).lerp(c, clamp(t * 1.4 - 0.4, 0, 1)); const k = 0.9 + Math.random() * 0.15; col[i * 3] = cc.r * k; col[i * 3 + 1] = cc.g * k; col[i * 3 + 2] = cc.b * k; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); const m = new THREE.Mesh(geo, this.mats.sand); m.receiveShadow = true; this.g.add(m);
  }
  _rockMesh(list, color) { // instanced faceted rocks: [{p, r, s:[sx,sy,sz], rot}]
    const geo = this._vc(new THREE.IcosahedronGeometry(1, 0), 0xffffff, 0); const im = new THREE.InstancedMesh(geo, this.mats.rock, list.length); const c = new THREE.Color();
    list.forEach((r, i) => { _q.setFromEuler(new THREE.Euler(r.rot[0], r.rot[1], r.rot[2])); _m.compose(r.p, _q, _v.set(r.r * r.s[0], r.r * r.s[1], r.r * r.s[2])); im.setMatrixAt(i, _m); c.set(color).multiplyScalar(0.75 + Math.random() * 0.4); im.setColorAt(i, c); });
    im.castShadow = true; im.receiveShadow = true; this.g.add(im); return im;
  }
  _inVoid(p, pad) { // inside the tunnel or the cavern (+pad)?
    if (p.distanceTo(CH) < CH_R + pad) return true;
    for (let i = 0; i < TUNNEL.length; i++) { const a = TUNNEL[i], b = TUNNEL[i + 1] || CH; const ab = _w.subVectors(b, a); const t = clamp(_v.subVectors(p, a).dot(ab) / ab.lengthSq(), 0, 1); if (p.distanceTo(_v.copy(a).addScaledVector(ab, t)) < 4.6 + pad) return true; }
    return false;
  }
  _knuckle() { // a rock mountain the tunnel and cavern are carved into
    const L = []; const add = (p, r, s = [1, 1, 1]) => { L.push({ p, r, s, rot: [rand(0, 6), rand(0, 6), rand(0, 6)] }); this.rocks.push({ p, r: r * Math.min(...s) * 0.92 }); };
    for (let k = 0; k < 520 && L.length < 150; k++) { const p = V(rand(-1000, -895), rand(-40, -8), rand(868, 942)); const r = rand(5, 11); if (this._inVoid(p, r * 0.95)) continue; if (p.y < floorH(p.x, p.z) - r) continue; add(p, r, [1, rand(0.7, 1.1), 1]); }
    // tunnel lining + cavern dome: smaller rocks right on the void boundary (the walls you swim past)
    for (let i = 0; i < TUNNEL.length; i++) { const a = TUNNEL[i], b = TUNNEL[i + 1] || CH; const n = Math.ceil(a.distanceTo(b) / 3.2); for (let j = 0; j < n; j++) { const c = a.clone().lerp(b, j / n); const d = _w.subVectors(b, a).normalize().clone(); const u = Math.abs(d.y) > 0.9 ? V(1, 0, 0) : V(0, 1, 0); const s1 = new THREE.Vector3().crossVectors(d, u).normalize(), s2 = new THREE.Vector3().crossVectors(d, s1).normalize();
      for (let q = 0; q < 7; q++) { const ang = (q / 7) * Math.PI * 2 + j * 0.5; const r = rand(1.6, 2.6); const p = c.clone().addScaledVector(s1, Math.cos(ang) * (4.6 + r)).addScaledVector(s2, Math.sin(ang) * (4.6 + r)); if (p.distanceTo(CH) < CH_R + r) continue; add(p, r); } } }
    for (let q = 0; q < 90; q++) { const u = rand(-1, 1), th = rand(0, Math.PI * 2); const d = V(Math.sqrt(1 - u * u) * Math.cos(th), u * 0.75, Math.sqrt(1 - u * u) * Math.sin(th)); const r = rand(2.5, 4.2); const p = CH.clone().addScaledVector(d, CH_R + r * 0.9); if (p.distanceTo(TUNNEL[TUNNEL.length - 1]) < 6 + r) continue; add(p, r); }
    this.rockIM = this._rockMesh(L, 0x5d5a55); this.rockList = L;
    // loose boulders on the floor elsewhere
    const B = []; for (let k = 0; k < 90; k++) { const x = rand(-1260, -900), z = rand(800, 995); const r = rand(0.8, 3.2); const p = V(x, floorH(x, z) + r * 0.3, z); if (this._inVoid(p, r)) continue; B.push({ p, r, s: [1, rand(0.5, 0.9), 1], rot: [rand(0, 6), rand(0, 6), rand(0, 6)] }); this.rocks.push({ p, r: r * 0.6 }); }
    this._rockMesh(B, 0x6d6a60);
  }
  _cavern() { // Halcyon's mining op inside the cavern
    const parts = [], glow = []; const box = (w, h, d, x, y, z, c, ry = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); parts.push(this._vc(g, c, 0.04)); };
    const cyl = (r, h, x, y, z, c, rx = 0, rz = 0) => { const g = new THREE.CylinderGeometry(r, r, h, 12); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); g.translate(x, y, z); parts.push(this._vc(g, c, 0.04)); };
    const fy = floorH(CH.x, CH.z); const base = Math.max(fy, CH.y - CH_R * 0.6); this.cavFloor = base;
    // floor slab + drill tower + scaffolds
    box(22, 0.6, 18, CH.x, base + 0.3, CH.z, 0x3b3f44); cyl(1.4, 13, CH.x, base + 6.5, CH.z, 0xd8a12a); cyl(0.5, 15, CH.x, base + 7.5, CH.z, 0x2c2f33);
    for (const [dx, dz] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) cyl(0.18, 12, CH.x + dx, base + 6, CH.z + dz, 0xd8a12a);
    for (let k = 1; k <= 3; k++) box(7, 0.2, 7, CH.x, base + k * 3.5, CH.z, 0x55595e);
    box(6, 3, 3, CH.x + 7, base + 1.5, CH.z - 5, 0x2f6f8f); box(5, 2.4, 2.6, CH.x - 7.5, base + 1.2, CH.z + 5.5, 0x8f2f2f); // generator, ore bin
    // the 4 support pylons that hold the cavern roof up: plant charges on these
    this.charges = [];
    for (const [dx, dz] of [[-9, -6], [9, -6], [-9, 7], [9, 7]]) { cyl(0.9, CH_R * 1.6, CH.x + dx, base + CH_R * 0.8, CH.z + dz, 0x6b6f75); this.charges.push({ pos: V(CH.x + dx, base + 2.2, CH.z + dz + (dz > 0 ? -1 : 1)), planted: false }); this.rocks.push({ p: V(CH.x + dx, base + 4, CH.z + dz), r: 0.9 }); }
    // gas tanks (shoot them)
    const tanks = [[CH.x + 6, CH.z + 4], [CH.x - 6, CH.z - 4], [CH.x + 2, CH.z - 7], [CH.x - 2, CH.z + 7.5], [CH.x + 11, CH.z]];
    for (const [x, z] of tanks) { cyl(0.55, 1.8, x, base + 1.5, z, 0xc0392b); box(1.2, 0.12, 1.2, x, base + 2.45, z, 0xf1c40f); const t = { pos: V(x, base + 1.5, z), r: 0.9, alive: true, onHit: () => { if (!t.alive) return; t.alive = false; this.blast(t.pos.clone(), 1.2); } }; this.shootables.push(t); }
    // glowing minerals: crystal clusters (collect these)
    this.minerals = [];
    const spots = [[-12, 3, -5], [12, 5, 4], [-5, 9, 11], [6, 1, -11], [0, 13, 0], [-12, 7, 8]];
    for (const [dx, dy, dz] of spots) { const p = V(CH.x + dx, base + dy + 0.4, CH.z + dz); const col = pick([0x46f0ff, 0xb46bff, 0x3dffa0]); for (let k = 0; k < 6; k++) { const g = new THREE.ConeGeometry(rand(0.12, 0.28), rand(0.8, 1.8), 6); g.translate(0, 0.5, 0); g.rotateX(rand(-0.6, 0.6)); g.rotateZ(rand(-0.6, 0.6)); g.translate(p.x + rand(-0.4, 0.4), p.y, p.z + rand(-0.4, 0.4)); glow.push(this._vc(g, col, 0.15)); } this.minerals.push({ pos: p, col, got: false }); }
    // work lamps (emissive)
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; const g = new THREE.BoxGeometry(0.5, 0.3, 0.3); g.translate(CH.x + Math.cos(a) * 10, base + 4, CH.z + Math.sin(a) * 9); glow.push(this._vc(g, 0xffd38a, 0)); }
    // the tunnel's guide lights (so you can find your way in the dark)
    for (let i = 0; i < TUNNEL.length; i++) { const p = TUNNEL[i]; const g = new THREE.SphereGeometry(0.22, 8, 6); g.translate(p.x, p.y - 3.8, p.z); glow.push(this._vc(g, 0xff9a3c, 0)); }
    this.cavMesh = new THREE.Mesh(merge(parts), this.mats.metal); this.cavMesh.castShadow = true; this.cavMesh.receiveShadow = true; this.g.add(this.cavMesh);
    this.glowMesh = new THREE.Mesh(merge(glow), this.mats.glow); this.g.add(this.glowMesh);
  }
  _life() { // kelp forest, coral, fish
    const kelp = []; for (let k = 0; k < 160; k++) { const x = BOAT.x + rand(-40, 120), z = BOAT.z + rand(-55, 60); const y = floorH(x, z); kelp.push({ x, y, z, h: rand(4, 9), ph: rand(0, 6) }); }
    const kg = new THREE.PlaneGeometry(0.9, 1, 1, 6); kg.translate(0, 0.5, 0); this._vc(kg, 0x3f7a2a, 0.15); this.kelpIM = new THREE.InstancedMesh(kg, this.mats.kelp, kelp.length); this.kelp = kelp; this.g.add(this.kelpIM);
    const cor = []; const cg = []; for (let k = 0; k < 240; k++) { const x = rand(-1240, -1000), z = rand(815, 990); const y = floorH(x, z); const col = pick([0xff6f61, 0xffb347, 0xc86bff, 0x4fd1c5, 0xf7d046]); const t = Math.random();
      const g = t < 0.4 ? new THREE.ConeGeometry(rand(0.2, 0.5), rand(0.6, 1.6), 6) : t < 0.75 ? new THREE.SphereGeometry(rand(0.3, 0.7), 7, 5) : new THREE.CylinderGeometry(0.08, 0.12, rand(0.8, 1.6), 5); g.translate(x, y + 0.4, z); cg.push(this._vc(g, col, 0.12)); cor.push(1); }
    this.g.add(Object.assign(new THREE.Mesh(merge(cg), this.mats.sand), { receiveShadow: true }));
    // fish schools
    const fg = (() => { const b = new THREE.BoxGeometry(0.12, 0.18, 0.4); const t = new THREE.ConeGeometry(0.1, 0.18, 4); t.rotateX(-Math.PI / 2); t.translate(0, 0, -0.28); return merge([this._vc(b, 0xffffff, 0), this._vc(t, 0xffffff, 0)]); })();
    this.schools = []; const n = 3 * 26; this.fishIM = new THREE.InstancedMesh(fg, this.mats.metal, n); const c = new THREE.Color();
    for (let s = 0; s < 3; s++) { const sc = { c: V(BOAT.x + 30 + s * 60, -8 - s * 5, BOAT.z + rand(-20, 30)), r: rand(5, 9), sp: rand(0.3, 0.6) * (s % 2 ? 1 : -1), fish: [] }; const col = [0xffd34d, 0x8fd3ff, 0xff7a59][s]; for (let i = 0; i < 26; i++) { sc.fish.push({ a: rand(0, 6.28), y: rand(-2, 2), r: rand(0.6, 1.4) }); this.fishIM.setColorAt(s * 26 + i, c.set(col).multiplyScalar(rand(0.8, 1.2))); } this.schools.push(sc); }
    this.g.add(this.fishIM);
    this.updaters.push((dt, t) => {
      for (let i = 0; i < this.kelp.length; i++) { const k = this.kelp[i]; _q.setFromEuler(new THREE.Euler(Math.sin(t * 0.8 + k.ph) * 0.12, k.ph, Math.sin(t * 0.6 + k.ph * 1.3) * 0.15)); _m.compose(_v.set(k.x, k.y, k.z), _q, _w.set(1, k.h, 1)); this.kelpIM.setMatrixAt(i, _m); } this.kelpIM.instanceMatrix.needsUpdate = true;
      let j = 0; for (const sc of this.schools) { for (const f of sc.fish) { const a = f.a + t * sc.sp; const R = sc.r * f.r; _v.set(sc.c.x + Math.cos(a) * R, sc.c.y + f.y + Math.sin(t + f.a) * 0.4, sc.c.z + Math.sin(a) * R); _q.setFromAxisAngle(_w.set(0, 1, 0), -a + (sc.sp > 0 ? 0 : Math.PI)); _m.compose(_v, _q, _w.set(1, 1, 1)); this.fishIM.setMatrixAt(j++, _m); } } this.fishIM.instanceMatrix.needsUpdate = true;
    });
  }
  _surface() { // the sea surface seen from below (the city water plane only faces up)
    const g = new THREE.PlaneGeometry(1400, 400, 1, 1); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, this.mats.under); m.position.set(-900, SEA_Y - 0.03, 900); m.renderOrder = 2; this.g.add(m);
  }
  _rig() { // offshore rig: the crew's fallback base. Walkable deck (static boxes), moon pool, hangar, containers, crane
    const S = G.world.static; const parts = []; const R = RIG; const y = DECK_Y; const box = (w, h, d, x, yy, z, c, solid = true, o = {}) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, yy, z); parts.push(this._vc(g, c, 0.05)); if (solid) this.statics.push(S.addBox(x - w / 2, yy - h / 2, z - d / 2, x + w / 2, yy + h / 2, z + d / 2, { mat: o.mat || 'metal', climb: !!o.climb })); };
    const x0 = R.x - 25, x1 = R.x + 25, z0 = R.z - 20, z1 = R.z + 20;
    // deck (four slabs around the moon pool)
    box(POOL.x0 - x0, 1, z1 - z0, (x0 + POOL.x0) / 2, y - 0.5, R.z, 0x6b6f75); box(x1 - POOL.x1, 1, z1 - z0, (POOL.x1 + x1) / 2, y - 0.5, R.z, 0x6b6f75);
    box(POOL.x1 - POOL.x0, 1, POOL.z0 - z0, (POOL.x0 + POOL.x1) / 2, y - 0.5, (z0 + POOL.z0) / 2, 0x6b6f75); box(POOL.x1 - POOL.x0, 1, z1 - POOL.z1, (POOL.x0 + POOL.x1) / 2, y - 0.5, (POOL.z1 + z1) / 2, 0x6b6f75);
    // hazard stripes round the pool, legs, under-structure
    for (const [w, d, x, z] of [[8.6, 0.3, (POOL.x0 + POOL.x1) / 2, POOL.z0 - 0.15], [8.6, 0.3, (POOL.x0 + POOL.x1) / 2, POOL.z1 + 0.15], [0.3, 8.6, POOL.x0 - 0.15, (POOL.z0 + POOL.z1) / 2], [0.3, 8.6, POOL.x1 + 0.15, (POOL.z0 + POOL.z1) / 2]]) box(w, 0.05, d, x, y + 0.03, z, 0xf1c40f, false);
    for (const [x, z] of [[x0 + 3, z0 + 3], [x1 - 3, z0 + 3], [x0 + 3, z1 - 3], [x1 - 3, z1 - 3]]) { const g = new THREE.CylinderGeometry(1.6, 1.9, y + 14, 12); g.translate(x, (y - 14) / 2 - 0.5, z); parts.push(this._vc(g, 0xd8a12a, 0.05)); this.rocks.push({ p: V(x, -8, z), r: 2 }); this.rocks.push({ p: V(x, -2, z), r: 2 }); this.statics.push(S.addBox(x - 1.7, -20, z - 1.7, x + 1.7, y - 1, z + 1.7)); }
    { const g = new THREE.BoxGeometry(46, 1.2, 1.2); g.translate(R.x, y - 6, z0 + 3); parts.push(this._vc(g, 0xb08a20)); const g2 = g.clone(); g2.translate(0, 0, 34); parts.push(g2); }
    // hangar over the moon pool (open towards the east), railings, containers, crates, crane, helipad, lamps
    box(14, 7, 0.4, (POOL.x0 + POOL.x1) / 2, y + 3.5, POOL.z0 - 3, 0x8a3b2f); box(14, 7, 0.4, (POOL.x0 + POOL.x1) / 2, y + 3.5, POOL.z1 + 3, 0x8a3b2f); box(0.4, 7, 14, POOL.x0 - 3, y + 3.5, (POOL.z0 + POOL.z1) / 2, 0x8a3b2f);
    box(14.4, 0.4, 14.4, (POOL.x0 + POOL.x1) / 2, y + 7.2, (POOL.z0 + POOL.z1) / 2, 0x5d2a22, false);
    for (const [w, d, x, z] of [[50, 0.2, R.x, z0 + 0.1], [50, 0.2, R.x, z1 - 0.1], [0.2, 40, x0 + 0.1, R.z], [0.2, 40, x1 - 0.1, R.z]]) box(w, 1.1, d, x, y + 0.55, z, 0xd8a12a);
    const cont = [[R.x + 6, R.z - 12, 0x1f6fb2, 0], [R.x + 6, R.z + 12, 0xc0392b, 0], [R.x + 14, R.z - 4, 0x27ae60, 1], [R.x + 14, R.z + 6, 0xd35400, 1], [R.x - 2, R.z - 15, 0x7f8c8d, 0], [R.x - 2, R.z + 15, 0x16a085, 0]];
    for (const [x, z, c, rot] of cont) { if (rot) box(2.5, 2.6, 6, x, y + 1.3, z, c); else box(6, 2.6, 2.5, x, y + 1.3, z, c); }
    for (const [x, z] of [[R.x + 2, R.z - 6], [R.x + 2, R.z + 7], [R.x + 10, R.z + 1], [R.x + 19, R.z - 12], [R.x + 19, R.z + 13], [R.x - 10, R.z + 15], [R.x - 10, R.z - 15]]) box(1.4, 1.2, 1.4, x, y + 0.6, z, 0x8e6b3e, true, { mat: 'wood' });
    { const g = new THREE.CylinderGeometry(6, 6, 0.06, 24); g.translate(R.x + 17, y + 0.03, R.z); parts.push(this._vc(g, 0x2c3e50, 0)); const h = new THREE.BoxGeometry(4, 0.07, 0.6); h.translate(R.x + 17, y + 0.04, R.z); parts.push(this._vc(h, 0xf1c40f, 0)); }
    { box(1.4, 16, 1.4, R.x - 18, y + 8, R.z - 14, 0xd8a12a); const g = new THREE.BoxGeometry(1, 1, 22); g.rotateX(-0.3); g.translate(R.x - 18, y + 17, R.z - 5); parts.push(this._vc(g, 0xd8a12a)); }
    this.rigMesh = new THREE.Mesh(merge(parts), this.mats.metal); this.rigMesh.castShadow = true; this.rigMesh.receiveShadow = true; this.g.add(this.rigMesh);
    const lamps = []; for (const [x, z] of [[x0 + 1, z0 + 1], [x1 - 1, z0 + 1], [x0 + 1, z1 - 1], [x1 - 1, z1 - 1], [R.x, z0 + 1], [R.x, z1 - 1]]) { const g = new THREE.BoxGeometry(0.6, 0.3, 0.6); g.translate(x, y + 4, z); lamps.push(this._vc(g, 0xfff1c8, 0)); const p = new THREE.CylinderGeometry(0.1, 0.1, 4, 6); p.translate(x, y + 2, z); lamps.push(this._vc(p, 0x333333, 0)); }
    this.g.add(new THREE.Mesh(merge(lamps), this.mats.glow));
  }
  // underwater blast: the usual explosion (damage, sound, shake) plus a bubble burst, rock chunks, a pressure flash
  blast(p, size = 1) { G.emit('explosion', p.clone(), size, 'mine', null); if (this.bubbles) this.bubbles.burst(p, 70 * size, 3 * size); if (G.fx) G.fx.debris(p, 18, 0x5d5a55, 5, 0.25); if (this.onBlast) this.onBlast(p, size); }
  // keep a sphere out of the rocks, the floor and the sky
  collide(p, r, maxY = SEA_Y - 0.35) {
    let hit = false; for (const k of this.rocks) { const dx = p.x - k.p.x, dy = p.y - k.p.y, dz = p.z - k.p.z; const R = k.r + r; if (Math.abs(dx) > R || Math.abs(dy) > R || Math.abs(dz) > R) continue; const d = Math.hypot(dx, dy, dz); if (d < R && d > 1e-4) { const s = (R - d) / d; p.x += dx * s; p.y += dy * s; p.z += dz * s; hit = true; } }
    const fl = floorH(p.x, p.z) + r; if (p.y < fl) { p.y = fl; hit = true; } if (this.cavFloor !== undefined && p.distanceTo(CH) < CH_R && p.y < this.cavFloor + 0.6 + r) { p.y = this.cavFloor + 0.6 + r; hit = true; }
    if (p.y > maxY) p.y = maxY; return hit;
  }
  update(dt) { this.t = (this.t || 0) + dt; for (const u of this.updaters) u(dt, this.t); this.bubbles.update(dt, this.t); this.spears.update(dt, this.targets); this.torps.update(dt); }
  dispose() { G.scene.remove(this.g); this.g.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); for (const b of this.statics) b.disabled = true; for (const o of this.hidden) o.visible = true; G.underwater = null; const L = G.world.interiorLights; if (L) for (const d of this.lightDefs) { const i = L.indexOf(d); if (i >= 0) L.splice(i, 1); } this.bubbles.dispose(); this.spears.clear(); this.torps.clear(); this.dcharges.clear(); }
}
function merge(list) { // merge (non-indexed) geometries that all carry position/normal/color
  let n = 0; const ls = list.map((g) => (g.index ? g.toNonIndexed() : g)); for (const g of ls) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const g of ls) { if (!g.attributes.normal) g.computeVertexNormals(); pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); if (g.attributes.color) col.set(g.attributes.color.array, o * 3); else col.fill(1, o * 3, (o + g.attributes.position.count) * 3); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeBoundingSphere(); return g;
}

// ================= bubbles =================
export class Bubbles {
  constructor(n = 500) { this.n = n; this.i = 0; this.p = new Float32Array(n * 3); this.life = new Float32Array(n); this.ph = new Float32Array(n); this.p.fill(-999);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.p, 3)); this.geo = g; const cv = document.createElement('canvas'); cv.width = cv.height = 32; const cx = cv.getContext('2d'); if (cx) { const gr = cx.createRadialGradient(16, 16, 2, 16, 16, 15); gr.addColorStop(0, 'rgba(255,255,255,0.15)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.85, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); cx.fillStyle = gr; cx.beginPath(); cx.arc(16, 16, 15, 0, Math.PI * 2); cx.fill(); }
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xdff8ff, size: 0.07, map: new THREE.CanvasTexture(cv), transparent: true, opacity: 0.9, depthWrite: false, alphaTest: 0.02 })); this.pts.frustumCulled = false; G.scene.add(this.pts); }
  emit(pos, n = 3, spread = 0.15) { for (let k = 0; k < n; k++) { const i = this.i; this.i = (this.i + 1) % this.n; this.p[i * 3] = pos.x + rand(-spread, spread); this.p[i * 3 + 1] = pos.y + rand(-spread, spread); this.p[i * 3 + 2] = pos.z + rand(-spread, spread); this.life[i] = rand(2, 5); this.ph[i] = rand(0, 6); } }
  burst(pos, n, r) { for (let k = 0; k < n; k++) this.emit(_v.set(pos.x + rand(-r, r), pos.y + rand(-r, r), pos.z + rand(-r, r)), 1, 0.1); }
  update(dt, t) { const p = this.p; for (let i = 0; i < this.n; i++) { if (this.life[i] <= 0) continue; this.life[i] -= dt; p[i * 3 + 1] += dt * (1.1 + (i % 5) * 0.12); p[i * 3] += Math.sin(t * 4 + this.ph[i]) * dt * 0.25; if (p[i * 3 + 1] > SEA_Y - 0.05 || this.life[i] <= 0) { this.life[i] = 0; p[i * 3 + 1] = -999; } } this.geo.attributes.position.needsUpdate = true; }
  dispose() { G.scene.remove(this.pts); this.geo.dispose(); }
}

// ================= harpoons (yours and theirs) =================
const SPEAR_GEO = (() => { const a = new THREE.CylinderGeometry(0.012, 0.012, 1.1, 5); a.rotateX(Math.PI / 2); const b = new THREE.ConeGeometry(0.04, 0.12, 6); b.rotateX(Math.PI / 2); b.translate(0, 0, 0.6); const g = merge([a, b]); return g; })();
export class Spears {
  constructor(world) { this.world = world; this.list = []; this.mat = new THREE.MeshStandardMaterial({ color: 0xcfd6dc, metalness: 0.8, roughness: 0.3 }); }
  fire(from, dir, speed, team, dmg) { const m = new THREE.Mesh(SPEAR_GEO, this.mat); m.position.copy(from); m.lookAt(_v.copy(from).add(dir)); G.scene.add(m); this.list.push({ m, pos: from.clone(), vel: dir.clone().multiplyScalar(speed), team, dmg, life: 3, stuck: false }); if (G.audio) G.audio.whoosh(from, 0.25, 0.25); if (this.world.bubbles) this.world.bubbles.emit(from, 4); }
  update(dt, targets) {
    for (let i = this.list.length - 1; i >= 0; i--) { const s = this.list[i]; s.life -= dt; if (s.life <= 0) { G.scene.remove(s.m); this.list.splice(i, 1); continue; } if (s.stuck) continue;
      const step = s.vel.length() * dt; const d = _w.copy(s.vel).normalize(); const prev = _v.copy(s.pos); s.pos.addScaledVector(s.vel, dt); s.vel.multiplyScalar(1 - dt * 0.4);
      // hits: targets (spheres), shootables, rocks / floor
      let done = false; for (const t of targets) { if (!(typeof t.alive === 'function' ? t.alive() : t.alive) || t.team === s.team) continue; const c = t.center(); const ab = s.pos.clone().sub(prev); const k = clamp(c.clone().sub(prev).dot(ab) / Math.max(1e-6, ab.lengthSq()), 0, 1); if (prev.clone().addScaledVector(ab, k).distanceTo(c) < t.r) { t.hit(s.dmg, d.clone(), s.pos.clone()); done = true; break; } }
      if (!done) for (const t of this.world.shootables) { if (t.alive && s.pos.distanceTo(t.pos) < t.r + 0.2) { t.onHit(); done = true; break; } }
      if (done) { G.scene.remove(s.m); this.list.splice(i, 1); continue; }
      if (this.world.collide(_w.copy(s.pos), 0.02, 10)) { s.stuck = true; s.life = 6; if (G.audio) G.audio.click(s.pos, 900, 0.2); if (G.fx) G.fx.dust(s.pos, 3, 0.4); }
      s.m.position.copy(s.pos); void step; }
  }
  clear() { for (const s of this.list) G.scene.remove(s.m); this.list = []; }
}

// ================= scuba gear on a figure (tank, fins, mask) — shapes posed from the joints =================
class Gear {
  constructor(color = 0xf1c40f) { const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 }); const dark = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6 }); const glass = new THREE.MeshStandardMaterial({ color: 0x9fe7ff, roughness: 0.1, metalness: 0.4, transparent: true, opacity: 0.55 });
    this.tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.5, 4, 10), mat); this.mask = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.05), glass); this.strap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.24), dark);
    this.fins = [0, 1].map(() => { const g = new THREE.BoxGeometry(0.16, 0.025, 0.42); g.translate(0, 0, 0.26); return new THREE.Mesh(g, dark); }); this.all = [this.tank, this.mask, this.strap, ...this.fins]; for (const m of this.all) { m.castShadow = true; G.scene.add(m); } }
  pose(h) { const J = h.joints; const j = (i) => _v.set(J[i * 3], J[i * 3 + 1], J[i * 3 + 2]).clone();
    const pel = j(0), ch = j(1), hd = j(2), lS = j(3), rS = j(6); const up = ch.clone().sub(pel).normalize(); const left = lS.clone().sub(rS).normalize(); const fwd = new THREE.Vector3().crossVectors(left, up).normalize();
    _m.makeBasis(left, up, fwd); this.tank.quaternion.setFromRotationMatrix(_m); this.tank.position.copy(pel).lerp(ch, 0.62).addScaledVector(fwd, -0.19);
    const hu = hd.clone().sub(ch).normalize(); const hl = left.clone(); const hf = new THREE.Vector3().crossVectors(hl, hu).normalize(); _m.makeBasis(hl, hu, hf); this.mask.quaternion.setFromRotationMatrix(_m); this.strap.quaternion.copy(this.mask.quaternion);
    this.mask.position.copy(hd).addScaledVector(hu, 0.04).addScaledVector(hf, 0.12); this.strap.position.copy(hd).addScaledVector(hu, 0.04);
    for (const [k, fi, ki] of [[0, 11, 10], [1, 14, 13]]) { const ft = j(fi), kn = j(ki); const shin = ft.clone().sub(kn).normalize(); const fw = shin; const l2 = left.clone(); const u2 = new THREE.Vector3().crossVectors(fw, l2).normalize(); _m.makeBasis(l2, u2, fw); this.fins[k].quaternion.setFromRotationMatrix(_m); this.fins[k].position.copy(ft); } }
  set visible(v) { for (const m of this.all) m.visible = v; }
  dispose() { for (const m of this.all) G.scene.remove(m); }
}
// tip a figure's world joints forward around its pelvis (swimming is horizontal)
function tipBody(h, angle) { const J = h.joints; const px = J[0], py = J[1], pz = J[2]; const ax = _w.set(Math.cos(h.yaw), 0, -Math.sin(h.yaw)); _q.setFromAxisAngle(ax, angle);
  for (let i = 0; i < 15; i++) { _v.set(J[i * 3] - px, J[i * 3 + 1] - py, J[i * 3 + 2] - pz).applyQuaternion(_q); J[i * 3] = px + _v.x; J[i * 3 + 1] = py + _v.y; J[i * 3 + 2] = pz + _v.z; } }

// ================= the player as a diver =================
export class Diver {
  constructor(world, pos, yaw) { this.world = world; this.pos = pos.clone(); this.vel = V(0, 0, 0); this.yaw = yaw; this.camYaw = yaw; this.camPitch = -0.2; this.bodyPitch = 0.3; this.o2 = 1; this.o2Secs = 300; this.reload = 0; this.showHuman = true; this.fullDamage = true; this.gear = new Gear(0xf1c40f); this.bubT = 0; this.alive = true; this.hp = 100; }
  seat() { return this.pos; }
  get dir() { return V(Math.sin(this.camYaw) * Math.cos(this.camPitch), Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch)); }
  update(dt, input) {
    const P = G.player, h = P.human; const W = this.world;
    if (input) { this.camYaw -= input.lookX(); this.camPitch = clamp(this.camPitch - input.lookY(), -1.35, 1.2);
      const K = (c) => input.key(c); const f = input.moveY(), s = input.moveX(), up = input.down('jump') ? 1 : 0, dn = K('KeyC') || K('ControlLeft') ? 1 : 0; const sprint = input.down('sprint');
      const d = this.dir; const right = V(-Math.cos(this.camYaw), 0, Math.sin(this.camYaw)); const sp = sprint ? 5.4 : 3.3;
      const want = d.multiplyScalar(f * sp).addScaledVector(right, s * sp * 0.8); want.y += (up - dn) * 2.6; this.vel.lerp(want, clamp(dt * 1.8, 0, 1));
      this.o2 -= dt / this.o2Secs * (sprint && (f || s) ? 1.7 : 1);
      // speargun: shoot where the crosshair points
      this.reload -= dt; if (input.fire() && this.reload <= 0) { this.reload = 0.75; const from = this.pos.clone().add(V(0, 0.5, 0)).addScaledVector(this.dir, 0.9); W.spears.fire(from, this.camAim(), 46, 'player', 60); h.upper = { name: 'hit', dur: 0.2 }; h.upperT = 0; }
    } else this.vel.multiplyScalar(1 - dt * 1.5);
    this.vel.multiplyScalar(1 - dt * 0.6); this.pos.addScaledVector(this.vel, dt); W.collide(this.pos, 0.45); if (W.extraCollide) W.extraCollide(this.pos, 0.45);
    // breathing: surface refills, empty tank hurts
    if (this.pos.y > SEA_Y - 0.9) this.o2 = Math.min(1, this.o2 + dt * 0.25); this.o2 = Math.max(0, this.o2); if (this.o2 <= 0) P.hit(dt * 9, V(0, 1, 0), this.pos.clone(), false, null, 'drown');
    // figure: face where you swim, tip forward when moving
    const hs = Math.hypot(this.vel.x, this.vel.z), spd = this.vel.length(); if (hs > 0.4) this.yaw = dampAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), 4, dt); else this.yaw = dampAngle(this.yaw, this.camYaw, 1.5, dt);
    const tgtTip = spd > 0.6 ? Math.PI / 2 - Math.atan2(this.vel.y, Math.max(0.3, hs)) * 0.85 : 0.35; this.bodyPitch = damp(this.bodyPitch, tgtTip, 3, dt);
    h.pos.copy(this.pos).y -= 0.9; h.yaw = this.yaw; h.state = 'scuba'; h.speed = spd; h.weapon = null; h.aim = null; h.animate(dt); tipBody(h, this.bodyPitch); this.gear.pose(h);
    // bubbles + headlamp + muffled ears
    this.bubT -= dt; if (this.bubT <= 0 && W.bubbles) { this.bubT = rand(0.25, 0.6); W.bubbles.emit(_v.set(h.joints[6], h.joints[7] + 0.1, h.joints[8]), chance(0.3) ? 6 : 2, 0.08); }
    const depth = SEA_Y - this.pos.y; const L = G.heliSpot; if (L) { const on = depth > 17; L.intensity = on ? 90 : 0; L.distance = 40; L.angle = 0.5; L.penumbra = 0.6; L.color.set(0xd8f4ff); L.position.copy(this.pos).add(V(0, 0.6, 0)); L.target.position.copy(this.pos).addScaledVector(this.camAim(), 12); L.target.updateMatrixWorld(); }
    if (G.audio) G.audio.setUnderwater(G.camera.position.y < SEA_Y - 0.1);
    if (G.player.health <= 0) this.alive = false;
  }
  camAim() { return this.dir; }
  camShot(dt) { const d = this.dir; const want = this.pos.clone().addScaledVector(d, -4.2).add(V(0, 0.8, 0)); const c = this.world; for (let k = 0; k < 6 && c.collide(want, 0.3, SEA_Y - 0.2); k++) want.lerp(this.pos, 0.3); this._cp = this._cp ? this._cp.lerp(want, clamp(dt * 8, 0, 1)) : want.clone(); return { pos: this._cp, look: this.pos.clone().addScaledVector(d, 6).add(V(0, 0.4, 0)), fov: 64 }; }
  dispose() { this.gear.dispose(); const L = G.heliSpot; if (L) L.intensity = 0; if (G.audio) G.audio.setUnderwater(false); }
}

// ================= enemy divers =================
export class EnemyDiver {
  constructor(world, pos, anchor) { this.world = world; this.h = new Human(LOOKS.halcyon(), { x: pos.x, y: pos.y, z: pos.z, yaw: rand(0, 6) }); this.h.look.shades = false; this.h.look.hat = null; this.pos = pos.clone(); this.vel = V(0, 0, 0); this.anchor = (anchor || pos).clone(); this.hp = 70; this.alive = true; this.alert = false; this.fireT = rand(1.5, 3); this.ring = rand(0, 6.28); this.t = rand(0, 10); this.gear = new Gear(0x2c3e50); this.team = 'halcyon'; this.r = 0.75; this.yaw = 0; this.tip = 1.3;
    (G.extraHumans || (G.extraHumans = [])).push(this.h); }
  center() { return this.pos; }
  hit(d, dir) { if (!this.alive) return; this.hp -= d; this.alert = true; this.vel.addScaledVector(dir, 2); if (this.world.bubbles) this.world.bubbles.emit(this.pos, 8, 0.3); if (this.hp <= 0) { this.alive = false; this.deadT = 0; if (G.stunts) G.stunts.award('SPEARED', 150); if (this.onDeath) this.onDeath(this); } }
  update(dt, tgt) {
    const W = this.world; this.t += dt; const h = this.h;
    if (!this.alive) { this.deadT += dt; this.vel.y = damp(this.vel.y, 0.6, 1, dt); this.vel.x *= 0.98; this.vel.z *= 0.98; this.pos.addScaledVector(this.vel, dt); this.tip += dt * 0.5; h.speed = 0; h.state = 'scuba'; h.pos.copy(this.pos).y -= 0.9; h.animate(dt); tipBody(h, this.tip); this.gear.pose(h); if (this.deadT > 7) { h.visible = false; this.gear.visible = false; } return; }
    const d = tgt ? tgt.distanceTo(this.pos) : 1e9; if (d < 26) this.alert = true;
    let goal; if (this.alert && tgt) { const a = this.ring + this.t * 0.25; goal = tgt.clone().add(V(Math.cos(a) * 9, 1.5 + Math.sin(this.t * 0.7) * 2, Math.sin(a) * 9)); } else { const a = this.t * 0.2 + this.ring; goal = this.anchor.clone().add(V(Math.cos(a) * 6, Math.sin(this.t * 0.4), Math.sin(a) * 6)); }
    const want = goal.sub(this.pos); const L = want.length(); if (L > 0.5) want.multiplyScalar(Math.min(this.alert ? 3.4 : 1.4, L) / L); else want.set(0, 0, 0); this.vel.lerp(want, clamp(dt * 1.5, 0, 1)); this.pos.addScaledVector(this.vel, dt); W.collide(this.pos, 0.5);
    const face = this.alert && tgt ? Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z) : Math.atan2(this.vel.x, this.vel.z); this.yaw = dampAngle(this.yaw, face, 3, dt);
    const spd = this.vel.length(); this.tip = damp(this.tip, this.alert && d < 10 ? 0.75 : spd > 0.5 ? 1.4 : 0.5, 2, dt);
    h.pos.copy(this.pos).y -= 0.9; h.yaw = this.yaw; h.state = 'scuba'; h.speed = spd; h.animate(dt); tipBody(h, this.tip); this.gear.pose(h);
    if (this.alert && tgt && d < 30) { this.fireT -= dt; if (this.fireT <= 0) { this.fireT = rand(2.2, 3.6); const lead = tgt.clone().add(V(rand(-1.2, 1.2), rand(-0.8, 1), rand(-1.2, 1.2))); const from = this.pos.clone().add(V(0, 0.3, 0)); W.spears.fire(from, lead.sub(from).normalize(), 30, 'halcyon', 13); } }
    if (chance(dt * 1.5) && W.bubbles) W.bubbles.emit(_v.copy(this.pos).add(V(0, 0.6, 0)), 2, 0.08);
  }
  dispose() { this.gear.dispose(); const L = G.extraHumans; if (L) { const i = L.indexOf(this.h); if (i >= 0) L.splice(i, 1); } }
}

// ================= Juno's submarine =================
export function subMesh(body = 0x1b1e22, accent = 0xff7a1a) {
  const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: body, roughness: 0.45, metalness: 0.4 }); const a = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5, metalness: 0.2 }); const glow = new THREE.MeshStandardMaterial({ color: 0x9feaff, emissive: 0x46d0ff, emissiveIntensity: 1.3 });
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 7, 6, 18), m); hull.rotation.x = Math.PI / 2; g.add(hull);
  const tower = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 2.6), m); tower.position.set(0, 1.7, 0.6); g.add(tower); const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.04, 0.35, 6), a); stripe.position.set(0, 0.2, 0); g.add(stripe);
  for (const s of [1, -1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 1), a); p.position.set(s * 1.6, 0, 2.6); g.add(p); const w = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.4), glow); w.position.set(s * 1.48, 0.45, 2.4); g.add(w); }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 1), a); fin.position.set(0, 0, -4.6); g.add(fin); const fin2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.1, 1), a); fin2.position.set(0, 0, -4.6); g.add(fin2);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.75, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), glow); nose.rotation.x = Math.PI / 2; nose.position.set(0, 0, 5.1); g.add(nose);
  const prop = new THREE.Group(); for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.1, 0.05), m); b.position.y = 0.45; const piv = new THREE.Group(); piv.rotation.z = (k / 3) * Math.PI * 2; piv.add(b); prop.add(piv); } prop.position.z = -5.3; g.add(prop);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return { g, prop };
}
export class Sub {
  constructor(world, pos, yaw) { this.world = world; const s = subMesh(); this.g = s.g; this.prop = s.prop; G.scene.add(this.g); this.pos = pos.clone(); this.yaw = yaw; this.pitch = 0; this.speed = 0; this.vel = V(0, 0, 0); this.hp = this.maxHp = 520; this.alive = true; this.torps = 24; this.torpT = 0; this.team = 'player'; this.r = 3.4; this.surfaceOK = false;
    this.snd = G.audio && G.audio.createLoop('hum', { freq: 48, ref: 12 }); }
  seat() { return this.pos; }
  center() { return this.pos; }
  get fwd() { return V(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)); }
  damage(d, p) { if (!this.alive) return; this.hp -= d; G.cam.shake(Math.min(1, d / 60)); if (this.world.bubbles && p) this.world.bubbles.burst(p, 12, 1.2); if (this.hp <= 0) { this.alive = false; this.world.blast(this.pos.clone(), 2); G.emit('subDown'); } }
  hit(d, dir, p) { this.damage(d, p); }
  update(dt, input) {
    if (input && this.alive) { const K = (c) => input.key(c); const thr = input.moveY(), turn = input.moveX(); const up = input.down('jump') ? 1 : 0, dn = K('KeyC') || K('ControlLeft') ? 1 : 0; const boost = input.down('sprint');
      this.speed = damp(this.speed, thr * (boost ? 24 : 15), thr ? 0.8 : 1.2, dt); this.yaw -= turn * dt * (0.9 - Math.min(0.4, Math.abs(this.speed) / 60)); this.pitch = damp(this.pitch, (up - dn) * 0.45, 2, dt);
      this.torpT -= dt; if ((input.fire() || input.aim()) && this.torpT <= 0 && this.torps > 0) { this.torpT = 0.6; this.torps--; this.world.torps.fire(this.pos.clone().addScaledVector(this.fwd, 6).add(V(0, -1.4, 0)), this.fwd, 'player', this.world.torps.lock(this)); }
    } else this.speed = damp(this.speed, 0, 1, dt);
    if (this.surfaceOK && input && input.down('jump')) this.pos.y += dt * 3.5; // ballast blow: straight up in the moon pool
    this.pos.addScaledVector(this.fwd, this.speed * dt); this.world.collide(this.pos, 2.4, this.surfaceOK ? SEA_Y + 0.3 : SEA_Y - 2.5); if (this.world.extraCollide) this.world.extraCollide(this.pos, 2.4);
    this.g.position.copy(this.pos); this.g.rotation.set(-this.pitch, this.yaw, Math.sin((this.t = (this.t || 0) + dt) * 0.8) * 0.03, 'YXZ'); this.prop.rotation.z += dt * this.speed * 1.2;
    if (Math.abs(this.speed) > 3 && this.world.bubbles && chance(dt * 18)) this.world.bubbles.emit(_v.copy(this.pos).addScaledVector(this.fwd, -5.6), 3, 0.3);
    if (this.snd) this.snd.update(this.pos, 0.25 + Math.abs(this.speed) / 30);
    if (G.audio) G.audio.setUnderwater(G.camera.position.y < SEA_Y - 0.1);
    const L = G.heliSpot; if (L && this.pos.y < SEA_Y - 8) { L.intensity = 380; L.distance = 70; L.angle = 0.45; L.penumbra = 0.5; L.color.set(0xd8f4ff); L.position.copy(this.pos).addScaledVector(this.fwd, 5.4); L.target.position.copy(this.pos).addScaledVector(this.fwd, 30); L.target.updateMatrixWorld(); } else if (L) L.intensity = 0;
  }
  camShot(dt) { const f = V(Math.sin(this.yaw), 0, Math.cos(this.yaw)); const want = this.pos.clone().addScaledVector(f, -15).add(V(0, 4.5, 0)); for (let k = 0; k < 6 && this.world.collide(want, 0.4, SEA_Y + 50); k++) want.lerp(this.pos, 0.3); this._cp = this._cp ? this._cp.lerp(want, clamp(dt * 4, 0, 1)) : want.clone(); return { pos: this._cp, look: this.pos.clone().addScaledVector(this.fwd, 18), fov: 66 + Math.abs(this.speed) * 0.4 }; }
  dispose() { G.scene.remove(this.g); if (this.snd) this.snd.dispose(); const L = G.heliSpot; if (L) L.intensity = 0; }
}

// ================= torpedoes (homing, proximity fuse) =================
export class Torpedoes {
  constructor(world) { this.world = world; this.list = []; this.targets = []; const g = new THREE.CapsuleGeometry(0.2, 1.4, 4, 8); g.rotateX(Math.PI / 2); this.geo = g; this.mat = new THREE.MeshStandardMaterial({ color: 0x8a939b, metalness: 0.7, roughness: 0.35 }); }
  lock(from) { let best = null, bd = 1e9; const f = from.fwd; for (const t of this.targets) { if (!t.alive || t.team === from.team) continue; const d = t.center().clone().sub(from.pos); const L = d.length(); if (L > 160) continue; const c = d.dot(f) / L; if (c < 0.6) continue; const s = L * (2 - c); if (s < bd) { bd = s; best = t; } } return best; }
  fire(from, dir, team, target = null, speed = 26) { const m = new THREE.Mesh(this.geo, this.mat); G.scene.add(m); this.list.push({ m, pos: from.clone(), vel: dir.clone().normalize().multiplyScalar(speed), team, target, life: 7, speed }); if (G.audio) G.audio.whoosh(from, 0.5, 0.8); }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) { const t = this.list[i]; t.life -= dt; let boom = t.life <= 0;
      if (t.target && t.target.alive) { const want = t.target.center().clone().sub(t.pos).normalize().multiplyScalar(t.speed); t.vel.lerp(want, clamp(dt * 2.2, 0, 1)).setLength(t.speed); }
      t.pos.addScaledVector(t.vel, dt); t.m.position.copy(t.pos); t.m.lookAt(_v.copy(t.pos).add(t.vel));
      if (this.world.bubbles && chance(dt * 30)) this.world.bubbles.emit(t.pos, 2, 0.1);
      for (const tg of this.targets) if (tg.alive && tg.team !== t.team && tg.center().distanceTo(t.pos) < (tg.r || 2) + 1.5) { boom = true; tg.hit(t.team === 'player' ? 150 : 70, t.vel.clone().normalize(), t.pos.clone()); break; }
      if (!boom && this.world.collide(_w.copy(t.pos), 0.3, SEA_Y + 5)) boom = true;
      if (boom) { this.world.blast(t.pos.clone(), 0.9); G.scene.remove(t.m); this.list.splice(i, 1); } }
  }
  clear() { for (const t of this.list) G.scene.remove(t.m); this.list = []; }
}

// ================= police boats (surface) with depth charges =================
export function boatMesh(hull = 0xf2f2f2, stripe = 0x1d3c78) {
  const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: hull, roughness: 0.5 }); const s = new THREE.MeshStandardMaterial({ color: stripe, roughness: 0.5 }); const dk = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.6 });
  const h = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.4, 10), m); h.position.y = 0.3; g.add(h); const bow = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3, 4), m); bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.scale.set(1, 1, 0.65); bow.position.set(0, 0.3, 6.3); g.add(bow);
  const band = new THREE.Mesh(new THREE.BoxGeometry(3.25, 0.3, 10.05), s); band.position.y = 0.55; g.add(band); const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 3), m); cab.position.set(0, 1.8, -0.5); g.add(cab); const win = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.6, 3.05), dk); win.position.set(0, 2.1, -0.5); g.add(win);
  const red = new THREE.MeshStandardMaterial({ color: 0xff2a2a, emissive: 0xff0000, emissiveIntensity: 0 }), blue = new THREE.MeshStandardMaterial({ color: 0x2a5bff, emissive: 0x0044ff, emissiveIntensity: 0 });
  const lr = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.4), red); lr.position.set(-0.45, 2.75, -0.5); const lb = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.25, 0.4), blue); lb.position.set(0.45, 2.75, -0.5); g.add(lr, lb);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); return { g, red, blue };
}
export class PoliceBoat {
  constructor(world, pos) { this.world = world; const b = boatMesh(); this.g = b.g; this.red = b.red; this.blue = b.blue; G.scene.add(this.g); this.pos = pos.clone(); this.pos.y = SEA_Y; this.yaw = rand(0, 6); this.hp = 260; this.alive = true; this.team = 'police'; this.r = 4.5; this.dropT = rand(2, 4); this.t = rand(0, 5); this.off = rand(0, 6.28);
    this.siren = G.audio && G.audio.createSiren && G.audio.createSiren('wail'); }
  center() { return _w.copy(this.pos); }
  hit(d) { if (!this.alive) return; this.hp -= d; if (this.hp <= 0) { this.alive = false; this.world.blast(this.pos.clone().add(V(0, 0.5, 0)), 1.5); if (G.stunts) G.stunts.award('BOAT SUNK', 400); } }
  update(dt, tgt) {
    this.t += dt; if (!this.alive) { this.pos.y -= dt * 1.2; this.g.rotation.z += dt * 0.3; this.g.position.copy(this.pos); if (this.siren) { this.siren.dispose(); this.siren = null; } return; }
    const goal = tgt.clone().add(V(Math.cos(this.off + this.t * 0.2) * 8, 0, Math.sin(this.off + this.t * 0.2) * 8)); const d = Math.hypot(goal.x - this.pos.x, goal.z - this.pos.z); const want = Math.atan2(goal.x - this.pos.x, goal.z - this.pos.z); this.yaw = dampAngle(this.yaw, want, 1.2, dt);
    const sp = clamp(d * 0.8, 4, 19); this.pos.x += Math.sin(this.yaw) * sp * dt; this.pos.z += Math.cos(this.yaw) * sp * dt; this.pos.y = SEA_Y + Math.sin(this.t * 1.7) * 0.15;
    this.g.position.copy(this.pos); this.g.rotation.set(-0.05 + Math.sin(this.t * 1.3) * 0.03, this.yaw, Math.sin(this.t) * 0.04, 'YXZ');
    const on = Math.sin(this.t * 12) > 0; this.red.emissiveIntensity = on ? 3 : 0; this.blue.emissiveIntensity = on ? 0 : 3;
    if (this.world.bubbles && chance(dt * 10)) this.world.bubbles.emit(_v.set(this.pos.x - Math.sin(this.yaw) * 5, SEA_Y - 0.4, this.pos.z - Math.cos(this.yaw) * 5), 3, 0.5);
    this.dropT -= dt; if (this.dropT <= 0 && Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z) < 26) { this.dropT = rand(2.6, 4.2); this.world.dcharges.drop(this.pos.clone().add(V(0, -1, 0)), tgt.y); }
    if (this.siren) this.siren.update(dt, this.pos, V(Math.sin(this.yaw) * sp, 0, Math.cos(this.yaw) * sp), 0.8);
  }
  dispose() { G.scene.remove(this.g); if (this.siren) this.siren.dispose(); }
}
export class DepthCharges {
  constructor(world) { this.world = world; this.list = []; this.geo = new THREE.CylinderGeometry(0.4, 0.4, 0.9, 10); this.mat = new THREE.MeshStandardMaterial({ color: 0x2f3a2a, roughness: 0.6, metalness: 0.3 }); }
  drop(p, armY) { const m = new THREE.Mesh(this.geo, this.mat); G.scene.add(m); this.list.push({ m, pos: p.clone(), armY: armY + rand(-1.5, 1.5), t: 0 }); if (G.audio) G.audio.splash(p, 0.6); }
  update(dt, sub) { for (let i = this.list.length - 1; i >= 0; i--) { const c = this.list[i]; c.t += dt; c.pos.y -= dt * 7; c.m.position.copy(c.pos); c.m.rotation.x += dt * 2; const near = sub && sub.alive && sub.pos.distanceTo(c.pos) < 5; const floor = floorH(c.pos.x, c.pos.z) + 0.5;
    if (near || c.pos.y <= c.armY || c.pos.y < floor || c.t > 8) { const d = sub ? sub.pos.distanceTo(c.pos) : 99; if (sub && d < 12) sub.damage((1 - d / 12) * 75, c.pos.clone()); this.world.blast(c.pos.clone(), 1.1); G.scene.remove(c.m); this.list.splice(i, 1); } } }
  clear() { for (const c of this.list) G.scene.remove(c.m); this.list = []; }
}
// ================= Halcyon mini-subs =================
export class MiniSub {
  constructor(world, pos) { this.world = world; const s = subMesh(0x3a0d0d, 0x15171a); s.g.scale.setScalar(0.55); this.g = s.g; this.prop = s.prop; G.scene.add(this.g); this.pos = pos.clone(); this.yaw = 0; this.pitch = 0; this.hp = 150; this.alive = true; this.team = 'halcyon'; this.r = 2.2; this.fireT = rand(2, 4); this.t = rand(0, 5); this.off = rand(0, 6.28); }
  center() { return this.pos; } get fwd() { return V(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)); }
  hit(d) { if (!this.alive) return; this.hp -= d; if (this.hp <= 0) { this.alive = false; this.world.blast(this.pos.clone(), 1.4); this.g.visible = false; if (G.stunts) G.stunts.award('SUB KILL', 500); } }
  update(dt, tgt) { if (!this.alive) return; this.t += dt; const goal = tgt.clone().add(V(Math.cos(this.off + this.t * 0.3) * 22, rand(-0.2, 0.2) + Math.sin(this.t * 0.5) * 4, Math.sin(this.off + this.t * 0.3) * 22)); const d = goal.sub(this.pos); const L = d.length();
    this.yaw = dampAngle(this.yaw, Math.atan2(d.x, d.z), 1.4, dt); this.pitch = damp(this.pitch, clamp(Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.5, 0.5), 2, dt); this.pos.addScaledVector(this.fwd, clamp(L * 0.6, 6, 17) * dt); this.world.collide(this.pos, 1.6, SEA_Y - 2.5);
    this.g.position.copy(this.pos); this.g.rotation.set(-this.pitch, this.yaw, 0, 'YXZ'); this.prop.rotation.z += dt * 20;
    this.fireT -= dt; const td = tgt.distanceTo(this.pos); if (this.fireT <= 0 && td < 70) { this.fireT = rand(3.5, 5.5); const dir = tgt.clone().sub(this.pos).normalize(); this.world.torps.fire(this.pos.clone().addScaledVector(dir, 4), dir, 'halcyon', this.world.player || null, 20); } }
  dispose() { G.scene.remove(this.g); }
}

// ================= HUD for diving / sub =================
export const DiveHUD = {
  el: null, x: null,
  show(mode) { if (!this.el) { this.el = document.createElement('div'); this.el.style.cssText = 'position:fixed;right:22px;bottom:150px;z-index:50;font:700 15px Rajdhani,system-ui,sans-serif;color:#dff8ff;text-shadow:0 1px 3px #000;text-align:right;letter-spacing:.08em;pointer-events:none'; document.body.appendChild(this.el);
      this.x = document.createElement('div'); this.x.style.cssText = 'position:fixed;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;border-radius:50%;background:#dff8ff;box-shadow:0 0 0 2px rgba(0,0,0,.35);z-index:50;pointer-events:none'; document.body.appendChild(this.x); }
    this.mode = mode; this.el.style.display = 'block'; this.x.style.display = 'block'; },
  hide() { if (this.el) { this.el.style.display = 'none'; this.x.style.display = 'none'; } this.mode = null; },
  update(o) { if (!this.el || !this.mode) return; const depth = Math.max(0, SEA_Y - o.pos.y);
    if (this.mode === 'dive') { const o2 = Math.round(o.o2 * 100); const c = o2 > 40 ? '#7bd88f' : o2 > 20 ? '#ffb02e' : '#ff3b2f'; this.el.innerHTML = `DEPTH <b>${depth.toFixed(0)}</b> M<br>O₂ <b style="color:${c}">${o2}%</b><br><span style="font-size:12px;opacity:.75">SPACE UP · C DOWN · CLICK SPEARGUN</span>`; }
    else { const hp = Math.max(0, o.hp / o.maxHp); const c = hp > 0.5 ? '#7bd88f' : hp > 0.25 ? '#ffb02e' : '#ff3b2f'; this.el.innerHTML = `DEPTH <b>${depth.toFixed(0)}</b> M · SPD <b>${(Math.abs(o.speed) * 1.94).toFixed(0)}</b> KN<br>HULL <b style="color:${c}">${Math.round(hp * 100)}%</b> · TORPEDOES <b>${o.torps}</b><br><span style="font-size:12px;opacity:.75">W/S THRUST · A/D TURN · SPACE/C DIVE · CLICK TORPEDO</span>`; } },
};
export function ride(craft, mode) { const P = G.player; if (P.vehicle) P.leaveVehicleInstant(); P.riding = craft; if (P.mesh) P.mesh.visible = false; P.human.visible = !!craft.showHuman; G.cam.custom = (dt) => craft.camShot(dt); DiveHUD.show(mode); }
export function unride(at) { const P = G.player; P.riding = null; P.human.visible = true; G.cam.custom = null; DiveHUD.hide(); if (G.audio) G.audio.setUnderwater(false); if (at) P.teleport(at.x, at.y, at.z, 0); }
export { voice };
