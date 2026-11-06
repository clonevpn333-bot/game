// GETAWAY! — close-up characters: one seamless, smooth, stylized body per person, generated in code (no imported or
// sculpted model): a signed-distance body (smoothly blended ellipsoids + tapered capsules carved around the exact
// skeleton the animation system drives) is meshed with surface nets, skinned to 15 bones with region-aware weights,
// and painted per person (skin / shirt / sleeves / trousers / belt / shoes) by one shared shader. Eyes, brows and
// lips ride the head bone. The 16 nearest visible people use it; the far crowd keeps the cheap instanced figures.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { solveFK, P, NP, DIM } from './humanoid.js';
import { inView } from '../core/perf.js';

// ---------- rest skeleton (exactly the FK the animation uses; arms slightly out so they don't fuse to the torso) ----------
const restPose = new Float32Array(NP); restPose[P.hipH] = DIM.hipH; restPose[P.lSR] = restPose[P.rSR] = 0.3; restPose[P.lHR] = restPose[P.rHR] = 0.03; restPose[P.lEl] = restPose[P.rEl] = 0.12;
const RJ = solveFK(restPose, 1, new Float32Array(45)); const rj = (j) => new THREE.Vector3(RJ[j * 3], RJ[j * 3 + 1], RJ[j * 3 + 2]);
// bones: [startJoint, endJoint] (frames built from the segment + the body's left axis); 2 = head, 11/14 = feet (own frames)
const BONES = [[0, 1], [1, 2], [1, 2], [3, 4], [4, 5], [4, 5], [6, 7], [7, 8], [7, 8], [9, 10], [10, 11], [11, 11], [12, 13], [13, 14], [14, 14]];
const SPINE = 0, NECK = 1, HEAD = 2, LUP = 3, LFO = 4, LHA = 5, RUP = 6, RFO = 7, RHA = 8, LTH = 9, LSH = 10, LFT = 11, RTH = 12, RSH = 13, RFT = 14;
const REG = { skin: 0, shirt: 1, sleeve: 2, pants: 3, shoes: 4, belt: 5, lips: 6, sclera: 7, iris: 8, brow: 9 };

// ---------- SDF body ----------
const sdEll = (p, c, r) => { const x = (p.x - c.x) / r.x, y = (p.y - c.y) / r.y, z = (p.z - c.z) / r.z; const k0 = Math.hypot(x, y, z); const k1 = Math.hypot(x / r.x, y / r.y, z / r.z); return k1 > 1e-6 ? k0 * (k0 - 1) / k1 : -Math.min(r.x, r.y, r.z); };
const sdCap = (p, a, b, ra, rb) => { const bx = b.x - a.x, by = b.y - a.y, bz = b.z - a.z; const px = p.x - a.x, py = p.y - a.y, pz = p.z - a.z; const t = Math.max(0, Math.min(1, (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz))); return Math.hypot(px - bx * t, py - by * t, pz - bz * t) - (ra + (rb - ra) * t); };
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
function bodySDF(fem) {
  const V = (x, y, z) => new THREE.Vector3(x, y, z); const pel = rj(0), ch = rj(1), hd = rj(2); const up = ch.y - pel.y;
  const hc = hd.clone().add(V(0, 0.03, 0)); // head centre (hair/hats from the instanced renderer fit this exactly)
  const parts = [
    // [group, region, sdf fn]
    ['head', 'skin', (p) => sdEll(p, hc, V(0.104, 0.122, 0.115))],
    ['head', 'skin', (p) => sdEll(p, hc.clone().add(V(0, -0.075, 0.03)), V(0.078, 0.06, 0.085))], // jaw + chin
    ['head', 'skin', (p) => sdEll(p, hc.clone().add(V(0, -0.012, 0.112)), V(0.019, 0.03, 0.026))], // nose
    ['head', 'skin', (p) => sdEll(p, hc.clone().add(V(0.102, -0.005, -0.005)), V(0.018, 0.034, 0.026))], ['head', 'skin', (p) => sdEll(p, hc.clone().add(V(-0.102, -0.005, -0.005)), V(0.018, 0.034, 0.026))], // ears
    ['neck', 'skin', (p) => sdCap(p, ch.clone().add(V(0, -0.02, 0.0)), hc.clone().add(V(0, -0.08, -0.01)), 0.05, 0.045)],
    ['torso', 'shirt', (p) => sdEll(p, ch.clone().add(V(0, -0.11, 0.0)), V(fem ? 0.155 : 0.175, 0.14, fem ? 0.1 : 0.105))], // chest / shoulders
    ['torso', 'shirt', (p) => sdEll(p, ch.clone().add(V(0, -0.25, 0.005)), V(fem ? 0.13 : 0.145, 0.15, 0.095))], // waist
    ...(fem ? [['torso', 'shirt', (p) => sdEll(p, ch.clone().add(V(0.055, -0.13, 0.07)), V(0.055, 0.05, 0.045))], ['torso', 'shirt', (p) => sdEll(p, ch.clone().add(V(-0.055, -0.13, 0.07)), V(0.055, 0.05, 0.045))]] : []),
    ['pelvis', 'pants', (p) => sdEll(p, pel.clone().add(V(0, -0.02, -0.005)), V(fem ? 0.16 : 0.15, 0.1, 0.105))],
  ];
  for (const s of [1, -1]) { const L = s > 0; const sh = rj(L ? 3 : 6), el = rj(L ? 4 : 7), ha = rj(L ? 5 : 8), hip = rj(L ? 9 : 12), kn = rj(L ? 10 : 13), ft = rj(L ? 11 : 14);
    const hd2 = ha.clone().sub(el).normalize();
    parts.push(['torso', 'shirt', (p) => sdEll(p, sh.clone().add(V(-s * 0.02, -0.01, 0)), V(0.065, 0.06, 0.07))], // deltoid
      [L ? 'lup' : 'rup', 'shirt', (p) => sdCap(p, sh, el, 0.047, 0.039)], [L ? 'lfo' : 'rfo', 'sleeve', (p) => sdCap(p, el, ha.clone().addScaledVector(hd2, -0.02), 0.037, 0.03)],
      [L ? 'lha' : 'rha', 'skin', (p) => sdEll(p, ha.clone().addScaledVector(hd2, 0.035), V(0.028, 0.055, 0.042))], [L ? 'lha' : 'rha', 'skin', (p) => sdCap(p, ha.clone().add(V(-s * 0.0, 0.0, 0.02)), ha.clone().add(V(-s * 0.012, -0.035, 0.05)), 0.013, 0.011)], // hand + thumb
      [L ? 'lth' : 'rth', 'pants', (p) => sdCap(p, hip.clone().add(V(0, 0.03, 0)), kn, fem ? 0.078 : 0.074, 0.054)], [L ? 'lsh' : 'rsh', 'pants', (p) => sdCap(p, kn, ft.clone().add(V(0, 0.04, 0)), 0.052, 0.04)],
      [L ? 'lft' : 'rft', 'shoes', (p) => sdCap(p, ft.clone().add(V(0, -0.03, -0.035)), ft.clone().add(V(0, -0.045, 0.13)), 0.05, 0.042)]);
  }
  return parts;
}
// surface nets over the SDF -> smooth seamless mesh; returns {pos, nrm, grp, reg, idx}
function mesh(fem, h = 0.0145) {
  const parts = bodySDF(fem); const x0 = -0.5, x1 = 0.5, y0 = -0.06, y1 = 1.98, z0 = -0.22, z1 = 0.3;
  const nx = Math.ceil((x1 - x0) / h) + 1, ny = Math.ceil((y1 - y0) / h) + 1, nz = Math.ceil((z1 - z0) / h) + 1;
  const p = new THREE.Vector3(); const K = 0.035;
  const f = (x, y, z, wantPart) => { p.set(x, y, z); let d = 1e9, best = 0, bd = 1e9; for (let i = 0; i < parts.length; i++) { const v = parts[i][2](p); d = i ? smin(d, v, K) : v; if (v < bd) { bd = v; best = i; } } return wantPart ? best : d; };
  const F = new Float32Array(nx * ny * nz); const I = (i, j, k) => (k * ny + j) * nx + i;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[I(i, j, k)] = f(x0 + i * h, y0 + j * h, z0 + k * h);
  const vid = new Int32Array(nx * ny * nz).fill(-1); const pos = [], idx = [];
  const E = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]]; const C = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]]; const cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let m = 0; for (let c = 0; c < 8; c++) { cv[c] = F[I(i + C[c][0], j + C[c][1], k + C[c][2])]; if (cv[c] < 0) m |= 1 << c; } if (m === 0 || m === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0; for (const [a, b] of E) { if ((cv[a] < 0) === (cv[b] < 0)) continue; const t = cv[a] / (cv[a] - cv[b]); sx += C[a][0] + (C[b][0] - C[a][0]) * t; sy += C[a][1] + (C[b][1] - C[a][1]) * t; sz += C[a][2] + (C[b][2] - C[a][2]) * t; n++; }
    vid[I(i, j, k)] = pos.length / 3; pos.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (k + sz / n) * h);
  }
  // quads across every sign-changing grid edge
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const a = F[I(i, j, k)] < 0;
    for (let ax = 0; ax < 3; ax++) { const i2 = i + (ax === 0), j2 = j + (ax === 1), k2 = k + (ax === 2); if (i2 >= nx || j2 >= ny || k2 >= nz) continue; const b = F[I(i2, j2, k2)] < 0; if (a === b) continue;
      let q; if (ax === 0) q = [I(i, j - 1, k - 1), I(i, j, k - 1), I(i, j, k), I(i, j - 1, k)]; else if (ax === 1) q = [I(i - 1, j, k - 1), I(i - 1, j, k), I(i, j, k), I(i, j, k - 1)]; else q = [I(i - 1, j - 1, k), I(i, j - 1, k), I(i, j, k), I(i - 1, j, k)];
      const v = q.map((c) => vid[c]); if (v.some((x) => x < 0)) continue; if (a) idx.push(v[0], v[1], v[2], v[0], v[2], v[3]); else idx.push(v[0], v[2], v[1], v[0], v[3], v[2]); }
  }
  // smooth normals from the SDF gradient, and the part each vertex belongs to
  const N = pos.length / 3; const nrm = new Float32Array(N * 3), grp = new Array(N), reg = new Float32Array(N); const e = h * 0.5;
  for (let v = 0; v < N; v++) { const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    let gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e); const l = Math.hypot(gx, gy, gz) || 1; nrm[v * 3] = gx / l; nrm[v * 3 + 1] = gy / l; nrm[v * 3 + 2] = gz / l;
    const pi = f(x, y, z, true); grp[v] = parts[pi][0]; let r = REG[parts[pi][1]];
    if (grp[v] === 'pelvis' && y > rj(0).y + 0.035 && y < rj(0).y + 0.075) r = REG.belt; // belt band
    if (grp[v] === 'head') { const hc = rj(2).add(new THREE.Vector3(0, 0.03, 0)); const dy = y - hc.y, dz = z - hc.z; if (dz > 0.07 && Math.abs(x) < 0.032 && dy < -0.062 && dy > -0.088) r = REG.lips; }
    reg[v] = r; }
  return { pos: new Float32Array(pos), nrm, grp, reg, idx };
}
// bone weights: each vertex follows its own part's bone; joints blend smoothly into the neighbouring bone
function weights(m) {
  const N = m.pos.length / 3; const si = new Uint16Array(N * 4), sw = new Float32Array(N * 4); const v = new THREE.Vector3();
  const seg = (a, b) => { const A = rj(a), Bv = rj(b); return (p) => { const ab = Bv.clone().sub(A); return Math.max(0, Math.min(1, p.clone().sub(A).dot(ab) / ab.lengthSq())); }; };
  const along = { lup: seg(3, 4), lfo: seg(4, 5), rup: seg(6, 7), rfo: seg(7, 8), lth: seg(9, 10), lsh: seg(10, 11), rth: seg(12, 13), rsh: seg(13, 14) };
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < N; i++) { v.set(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]); const g = m.grp[i]; let w = [];
    const L = v.x > 0;
    if (g === 'head') w = [[HEAD, 1]];
    else if (g === 'neck') { const t = ss(rj(1).y + 0.02, rj(2).y - 0.02, v.y); w = [[NECK, 1 - t], [HEAD, t]]; }
    else if (g === 'torso') { const sh = rj(L ? 3 : 6); const d = v.distanceTo(sh); const t = 1 - ss(0.05, 0.14, d); const k = ss(rj(0).y + 0.05, rj(1).y - 0.15, v.y); w = [[SPINE, (1 - t) * (k * 0.75 + 0.25)], [NECK, (1 - t) * (1 - k) * 0.0], [L ? LUP : RUP, t * 0.6], [SPINE, t * 0.4]]; }
    else if (g === 'pelvis') { const hip = rj(L ? 9 : 12); const t = (1 - ss(0.05, 0.12, v.distanceTo(hip))) * ss(rj(0).y + 0.02, rj(0).y - 0.08, v.y); w = [[SPINE, 1 - t * 0.7], [L ? LTH : RTH, t * 0.7]]; }
    else if (g === 'lup' || g === 'rup') { const t = along[g](v); const b = ss(0.85, 1.05, t); const top = 1 - ss(0.0, 0.15, t); w = [[g === 'lup' ? LUP : RUP, (1 - b) * (1 - top * 0.35)], [SPINE, (1 - b) * top * 0.35], [g === 'lup' ? LFO : RFO, b]]; }
    else if (g === 'lfo' || g === 'rfo') { const t = along[g](v); const b = 1 - ss(-0.05, 0.12, t); w = [[g === 'lfo' ? LFO : RFO, 1 - b * 0.5], [g === 'lfo' ? LUP : RUP, b * 0.5]]; }
    else if (g === 'lha' || g === 'rha') w = [[g === 'lha' ? LHA : RHA, 1]];
    else if (g === 'lth' || g === 'rth') { const t = along[g](v); const b = ss(0.88, 1.06, t); const top = 1 - ss(0.0, 0.18, t); w = [[g === 'lth' ? LTH : RTH, (1 - b) * (1 - top * 0.3)], [SPINE, (1 - b) * top * 0.3], [g === 'lth' ? LSH : RSH, b]]; }
    else if (g === 'lsh' || g === 'rsh') { const t = along[g](v); const b = 1 - ss(-0.06, 0.1, t); w = [[g === 'lsh' ? LSH : RSH, 1 - b * 0.5], [g === 'lsh' ? LTH : RTH, b * 0.5]]; }
    else w = [[g === 'lft' ? LFT : RFT, 1]];
    const acc = new Map(); for (const [b, x] of w) if (x > 1e-4) acc.set(b, (acc.get(b) || 0) + x); const arr = [...acc].sort((a, b) => b[1] - a[1]).slice(0, 4); const tot = arr.reduce((s, a) => s + a[1], 0) || 1;
    arr.forEach(([b, x], k) => { si[i * 4 + k] = b; sw[i * 4 + k] = x / tot; }); if (!arr.length) { si[i * 4] = SPINE; sw[i * 4] = 1; } }
  return { si, sw };
}
// eyes / brows as rigid parts on the head bone (rest-space geometry)
function faceGeo() {
  const hc = rj(2).add(new THREE.Vector3(0, 0.03, 0)); const parts = []; const add = (g, r) => { const n = g.attributes.position.count; g.setAttribute('region', new THREE.Float32BufferAttribute(new Float32Array(n).fill(r), 1)); parts.push(g); };
  for (const s of [1, -1]) { const x = hc.x + s * 0.036, y = hc.y + 0.012, z = hc.z + 0.094;
    add(new THREE.SphereGeometry(0.0175, 14, 10).scale(1, 0.85, 0.7).translate(x, y, z), REG.sclera); add(new THREE.SphereGeometry(0.0105, 12, 8).scale(1, 1, 0.45).translate(x, y, z + 0.011), REG.iris);
    add(new THREE.SphereGeometry(0.0045, 8, 6).translate(x + 0.004, y + 0.005, z + 0.016), REG.sclera); // catch-light
    add(new THREE.BoxGeometry(0.034, 0.0065, 0.008).rotateZ(-s * 0.15).translate(x, y + 0.03, z + 0.008), REG.brow); }
  const merged = mergeGeos(parts); return merged;
}
function mergeGeos(list) { const g = new THREE.BufferGeometry(); const P2 = [], Nn = [], R = [], Ix = []; let o = 0; for (const s0 of list) { const s = s0.index ? s0 : s0; const pa = s.attributes.position, na = s.attributes.normal, ra = s.attributes.region; for (let i = 0; i < pa.count; i++) { P2.push(pa.getX(i), pa.getY(i), pa.getZ(i)); Nn.push(na.getX(i), na.getY(i), na.getZ(i)); R.push(ra.getX(i)); } const ix = s.index.array; for (const q of ix) Ix.push(q + o); o += pa.count; }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setAttribute('region', new THREE.Float32BufferAttribute(R, 1)); g.setIndex(Ix); return g; }

// one shared program: colour by region from per-person uniforms
function material(cols) {
  const m = new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.02 });
  m.onBeforeCompile = (sh) => { sh.uniforms.uRC = { value: cols };
    sh.vertexShader = 'attribute float region; varying float vRegion;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vRegion = region;');
    sh.fragmentShader = 'uniform vec3 uRC[10]; varying float vRegion;\n' + sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      int ri = int(vRegion + 0.5); vec3 rc = uRC[0]; for (int i = 1; i < 10; i++) if (i == ri) rc = uRC[i]; diffuseColor.rgb *= rc;`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n if (int(vRegion + 0.5) >= 7 && int(vRegion + 0.5) <= 8) roughnessFactor = 0.18; else if (int(vRegion + 0.5) == 4 || int(vRegion + 0.5) == 5) roughnessFactor = 0.45;'); };
  m.customProgramCacheKey = () => 'skinHuman1'; return m;
}

// ---------- the pool ----------
const _m = new THREE.Matrix4(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _z = new THREE.Vector3(), _l = new THREE.Vector3(), _f = new THREE.Vector3();
function frame(start, y, left, out, sx = 1, sy = 1, sz = 1) { _y.copy(y).normalize(); _x.copy(left).addScaledVector(_y, -left.dot(_y)); if (_x.lengthSq() < 1e-6) _x.set(1, 0, 0); _x.normalize(); _z.crossVectors(_x, _y); out.makeBasis(_x.multiplyScalar(sx), _y.multiplyScalar(sy), _z.multiplyScalar(sz)); out.setPosition(start); return out; }
const restFrames = BONES.map(([a, b], k) => { const m = new THREE.Matrix4(); if (k === LFT || k === RFT) return frame(rj(a), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), m); return frame(rj(a), rj(b).sub(rj(a)), new THREE.Vector3(1, 0, 0), m); });
const restLen = BONES.map(([a, b]) => Math.max(1e-3, rj(b).distanceTo(rj(a))));

export class SkinnedCrowd {
  constructor(scene, n = 16) {
    this.slots = []; const build = (fem) => { const m = mesh(fem); const w = weights(m); const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(m.pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(m.nrm, 3)); g.setAttribute('region', new THREE.BufferAttribute(m.reg, 1)); g.setAttribute('skinIndex', new THREE.BufferAttribute(w.si, 4)); g.setAttribute('skinWeight', new THREE.BufferAttribute(w.sw, 4)); g.setIndex(m.idx); g.computeBoundingSphere(); return g; };
    const t0 = performance.now(); this.geo = [build(false), build(true)]; this.face = faceGeo(); this.buildMs = performance.now() - t0;
    for (let i = 0; i < n; i++) {
      const cols = Array.from({ length: 10 }, () => new THREE.Color(1, 1, 1)); const mat = material(cols);
      const bones = BONES.map(() => { const b = new THREE.Bone(); b.matrixAutoUpdate = false; b.matrixWorldAutoUpdate = false; return b; });
      const skel = new THREE.Skeleton(bones, restFrames.map((m) => m.clone().invert()));
      const meshes = this.geo.map((g) => { const sm = new THREE.SkinnedMesh(g, mat); sm.bind(skel, new THREE.Matrix4()); sm.bindMode = 'detached'; sm.frustumCulled = false; sm.castShadow = true; sm.receiveShadow = true; sm.visible = false; sm.matrixAutoUpdate = false; scene.add(sm); return sm; });
      const face = new THREE.Mesh(this.face, mat); face.matrixAutoUpdate = false; face.visible = false; face.frustumCulled = false; scene.add(face);
      this.slots.push({ h: null, cols, mat, bones, skel, meshes, face });
    }
  }
  // pick the nearest visible people each frame
  assign(humans) {
    const cam = G.camera.position; const cand = [];
    for (const h of humans) { h._sk = null; if (!h || !h.visible) continue; const d = h.pos.distanceToSquared(cam); if (d > 34 * 34 || !inView(h.pos, 1.2, 34)) continue; cand.push([d, h]); }
    cand.sort((a, b) => a[0] - b[0]); const n = Math.min(cand.length, this.slots.length);
    for (let i = 0; i < this.slots.length; i++) { const s = this.slots[i]; const h = i < n ? cand[i][1] : null; s.h = h; if (h) h._sk = s; }
  }
  update() {
    for (const s of this.slots) { const h = s.h; for (const m of s.meshes) m.visible = false; s.face.visible = false; if (!h) continue; const L = h.look; const fem = L.hairStyle === 'long' || L.hairStyle === 'bun';
      const mesh = s.meshes[fem ? 1 : 0]; mesh.visible = true; s.face.visible = true;
      const c = s.cols; c[0].set(L.skin); c[1].set(L.jacket || L.shirt); c[2].set(L.sleeve === 'long' || L.jacket ? (L.jacket || L.shirt) : L.skin); c[3].set(L.pants); c[4].set(L.shoes); c[5].set(0x2b1d14); c[6].set(L.skin).multiplyScalar(0.78).lerp(new THREE.Color(0xb05a50), 0.35); c[7].set(0xf4f0e8); c[8].set(L.eyes || 0x3d2a1a); c[9].set(L.hair || 0x2a1c14);
      const J = h.joints; const jp = (j, o) => o.set(J[j * 3], J[j * 3 + 1], J[j * 3 + 2]);
      jp(3, _a); jp(6, _b); _l.subVectors(_a, _b).normalize(); // body left axis
      jp(1, _a); jp(0, _b); const up = _a.clone().sub(_b).normalize(); _f.crossVectors(_l, up).normalize(); // forward
      const b = L.build || 1;
      BONES.forEach(([a0, b0], k) => { const st = jp(a0, new THREE.Vector3()); let M;
        if (k === LFT || k === RFT) { const ff = _f.clone().setY(0).normalize(); M = frame(st, new THREE.Vector3(0, 1, 0), new THREE.Vector3(ff.z, 0, -ff.x), _m.clone(), h.scale || 1, h.scale || 1, h.scale || 1); }
        else { const en = jp(b0, new THREE.Vector3()); const d = en.clone().sub(st); const len = d.length() / restLen[k]; const sc = h.scale || 1; const wide = sc * (k === SPINE ? b : 1);
          M = frame(st, d, _l, _m.clone(), wide, len, wide); }
        s.bones[k].matrixWorld.copy(M); });
      // face rides the head bone
      s.face.matrix.multiplyMatrices(s.bones[HEAD].matrixWorld, s.skel.boneInverses[HEAD]); s.face.matrixWorld.copy(s.face.matrix);
    }
  }
}
