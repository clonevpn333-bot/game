// GETAWAY! — ROSTR: hand-modelled faceted hyper-EV body (sharp creases, flat planes) instead of the generic
// superellipse loft. Built as an explicit crease-line profile lofted along the car + hand-built nose/tail
// faces, so the knife-edge nose, fender blades, V hood, wrap-around glass canopy and black fascia read cleanly.
import * as THREE from 'three';
import { mergeParts } from '../world/props.js';
import { plateTexture } from '../world/textures.js';
import { wheelAssets, makeLightMaterial, lightParts } from './models.js';

const pwl = (keys, z) => {
  if (z <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (z <= b[0]) return a[1] + (b[1] - a[1]) * (z - a[0]) / (b[0] - a[0]); }
  return keys[keys.length - 1][1];
};
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const lerpV = (a, b, t) => a.clone().lerp(b, t);

// right-half crease lines. z runs rear(-) -> front(+). [x keys, y keys, zMin, zMax]
const ZF = 2.325, ZR = -2.325;
const LINES = {
  p0: [[[0, 0]], [[-2.3, 0.24], [-1.9, 0.15], [2.2, 0.15]], -2.24, 2.2], // floor centre
  p1: [[[-2.3, 0.82], [-1.4, 0.92], [1.4, 0.9], [1.9, 0.86], [2.2, 0.64]], [[-2.3, 0.24], [-1.9, 0.15], [2.2, 0.15]], -2.24, 2.2], // floor edge
  p2: [[[-2.3, 0.92], [-1.4, 0.965], [0, 0.95], [1.4, 0.95], [1.9, 0.93], [2.22, 0.68]], [[-2.3, 0.4], [-1.6, 0.34], [0, 0.29], [1.6, 0.28], [1.9, 0.3], [2.22, 0.15]], -2.3, 2.22], // sill bottom
  p3: [[[-2.325, 0.985], [-1.4, 1.01], [-0.4, 1.0], [0.6, 0.995], [1.4, 1.005], [1.86, 1.0], [2.25, 0.69]], [[-2.325, 0.62], [-1.4, 0.6], [0, 0.57], [1.4, 0.57], [1.86, 0.44], [2.25, 0.16]], -2.325, 2.25], // side crease -> corner fang bottom
  p4: [[[-2.325, 0.96], [-1.4, 0.99], [-0.4, 0.98], [0.9, 0.975], [1.35, 0.97], [2.325, 0.69]], [[-2.325, 0.99], [-1.4, 0.975], [-0.4, 0.93], [0.9, 0.89], [1.35, 0.87], [2.325, 0.5]], -2.325, 2.325], // shoulder -> fender crease -> knife corner
  p5: [[[-2.325, 0.87], [-1.4, 0.88], [-0.4, 0.87], [0.9, 0.84], [1.35, 0.76]], [[-2.325, 1.02], [-1.4, 1.0], [-0.4, 0.955], [0.9, 0.9], [1.35, 0.85]], -2.325, 2.325], // deck ledge (front: computed on the fender facet)
  p6: [[[-2.325, 0.7], [-1.4, 0.74], [0, 0.75], [0.9, 0.74], [1.35, 0.5], [2.325, 0.69]], [[-2.325, 1.02], [-1.4, 1.0], [-0.4, 0.95], [0.9, 0.88], [1.35, 0.82], [2.325, 0.5]], -2.325, 2.325], // deck -> hood edge (hood widens to the nose)
  p7: [[[0, 0]], [[-2.325, 1.02], [-1.4, 1.0], [-0.4, 0.95], [0.9, 0.88], [1.35, 0.825], [2.325, 0.5]], -2.325, 2.325], // centreline
};
const ORDER = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
const AX = 1.395, AR = 0.46;
function archY(z) { let y = -1; for (const az of [AX, -AX]) { const d = Math.abs(z - az); if (d < AR) y = Math.max(y, 0.37 + Math.sqrt(AR * AR - d * d)); } return y; }
function line(name, zc) { const [xk, yk, z0, z1] = LINES[name]; const z = Math.min(z1, Math.max(z0, zc)); return V(pwl(xk, z), pwl(yk, z), z); }
// full right-half profile at a column: p0 p1 p2 p2m p3 p4 p5 p6 p7
function profile(zc) {
  const P = {}; for (const n of ORDER) P[n] = line(n, zc);
  if (zc > 1.35) P.p5 = lerpV(P.p6, P.p4, 0.55); // fender top facet is one flat triangle (windshield corner, shoulder, knife corner)
  const p2m = lerpV(P.p2, P.p3, 0.16);
  const pts = [P.p0, P.p1, P.p2, p2m, P.p3, P.p4, P.p5, P.p6, P.p7];
  const ay = archY(zc); if (ay > 0) { const cap = P.p4.y - 0.035; for (let i = 0; i <= 4; i++) pts[i].y = Math.max(pts[i].y, Math.min(ay, cap)); }
  return pts;
}
// x of the body side at (z, y) — for placing parts flush on the flanks
function sideX(z, y) { const p = profile(z); for (let i = 2; i < 5; i++) { const a = p[i], b = p[i + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / ((b.y - a.y) || 1); } return y < p[2].y ? p[2].x : p[5].x; }

// canopy: c0 (base) cm1 cm2 c1 (roof edge / A-pillar line) cr (rail) c2 (centre)
const CZ0 = -2.2, CZ1 = 1.35;
const C_BELT = [[-2.2, 1.02], [-1.4, 1.0], [-0.4, 0.95], [0.9, 0.89], [1.2, 0.875], [1.35, 0.862]];
const C_X0 = [[-2.2, 0.64], [-1.4, 0.73], [-0.4, 0.76], [0.9, 0.79], [1.35, 0.8]];
const C_ROOF = [[-2.2, 1.04], [-1.2, 1.13], [-0.5, 1.2], [-0.05, 1.22], [0.05, 1.22], [1.35, 0.85]];
const C_X1 = [[-2.2, 0.46], [-0.5, 0.5], [0.05, 0.52], [1.35, 0.8]];
const C_DROP = [[-2.2, 0.0], [-0.5, 0.03], [0.05, 0.035], [1.35, 0.0]];
function canopy(z) {
  const belt = pwl(C_BELT, z), roof = pwl(C_ROOF, z);
  const c0 = V(pwl(C_X0, z), belt, z), c1 = V(pwl(C_X1, z), Math.max(belt + 0.005, roof - pwl(C_DROP, z)), z), c2 = V(0, roof, z);
  return [c0, lerpV(c0, c1, 0.34), lerpV(c0, c1, 0.68), c1, lerpV(c1, c2, 0.16), c2];
}

const mirror = (v) => V(-v.x, v.y, v.z);
class Tris {
  constructor(names) { this.g = {}; for (const n of names) this.g[n] = []; }
  tri(gname, a, b, c) { const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z; const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx; if (cx * cx + cy * cy + cz * cz < 1e-12) return; this.g[gname].push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); }
  quad(gname, a, b, c, d) { this.tri(gname, a, b, c); this.tri(gname, a, c, d); }
  fan(gname, pts, dir) { for (let i = 1; i < pts.length - 1; i++) { let a = pts[0], b = pts[i], c = pts[i + 1]; if (dir) { const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)); if (n.dot(dir) < 0) { const t = b; b = c; c = t; } } this.tri(gname, a, b, c); } }
  geometry(order) {
    const all = []; const g = new THREE.BufferGeometry(); let start = 0;
    order.forEach((n, mi) => { const l = this.g[n]; for (const v of l) all.push(v); g.addGroup(start, l.length / 3, mi); start += l.length / 3; });
    g.setAttribute('position', new THREE.Float32BufferAttribute(all, 3)); g.computeVertexNormals(); return g;
  }
}
// box spanning a->b (for light strips, seams, pylons)
function seg(a, b, w, h, c, g, up = V(0, 1, 0)) {
  const d = new THREE.Vector3().subVectors(b, a); const len = d.length(); const geo = new THREE.BoxGeometry(len, h, w);
  const xA = d.clone().normalize(); const zA = new THREE.Vector3().crossVectors(xA, up).normalize(); const yA = new THREE.Vector3().crossVectors(zA, xA).normalize();
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(xA, yA, zA)); const m = a.clone().add(b).multiplyScalar(0.5); geo.translate(m.x, m.y, m.z);
  return g === undefined ? { geo, c } : { geo, c, g };
}
const box = (w, h, d, x, y, z, c, rx = 0, g) => { const geo = new THREE.BoxGeometry(w, h, d); if (rx) geo.rotateX(rx); geo.translate(x, y, z); return g === undefined ? { geo, c } : { geo, c, g }; };

export function buildRostrModel(spec, paintColor) {
  const S = wheelAssets(); const { L, W } = spec; const wh = spec.wheels; const hw = W / 2;
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const paint = new THREE.MeshPhysicalMaterial({ color: paintColor, roughness: 0.34, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1, });
  const trim = new THREE.MeshStandardMaterial({ color: 0x0b0c0e, roughness: 0.5, metalness: 0.35 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0a0e12, roughness: 0.03, metalness: 0.96, transparent: true, opacity: 0.95, map: (() => { const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true; return t; })() });

  // ---------- body shell ----------
  const T = new Tris(['paint', 'trim']); const NZ = 120; const cols = [];
  for (let i = 0; i <= NZ; i++) { const z = ZR + (ZF - ZR) * i / NZ; const r = profile(z); const ring = [...r]; for (let k = 7; k >= 1; k--) ring.push(mirror(r[k])); cols.push(ring); }
  const segMat = (j) => (j <= 2 ? 'trim' : 'paint'); // right segments 0..7 (p0p1, p1p2, p2p2m are black)
  const RN = cols[0].length; // 16
  for (let i = 0; i < NZ; i++) for (let k = 0; k < RN; k++) {
    const k2 = (k + 1) % RN; const j = k < 8 ? k : RN - 1 - k; // mirror segment index
    const a = cols[i][k], b = cols[i][k2], c = cols[i + 1][k2], d = cols[i + 1][k];
    T.quad(segMat(j), a, b, c, d);
  }
  // nose: knife edge on top, black trapezoid fascia, white corner fangs
  {
    const f = cols[NZ]; const [p0, p1, p2, p2m, p3, p4, p5, p6, p7] = f; const Bc = V(0, 0.15, 2.24);
    for (const s of [1, -1]) {
      const m = (v) => (s > 0 ? v : mirror(v)); const fw = V(0, -0.3, 1);
      T.fan('trim', [m(Bc), m(p7), m(p6), m(p4), m(p3)], fw);
      T.fan('trim', [m(Bc), m(p3), m(p2m), m(p2), m(p1), m(p0)], fw);
    }
  }
  // tail: painted upper panel above the black lower diffuser section
  {
    const r = cols[0]; const [p0, p1, p2, p2m, p3, p4, p5, p6, p7] = r; const cut = 0.74; const k = (p4.y - cut) / (p4.y - p3.y); const R4 = lerpV(p4, p3, k), R0 = V(0, cut, p4.z);
    for (const s of [1, -1]) { const m = (v) => (s > 0 ? v : mirror(v)); T.fan('paint', [m(R0), m(p7), m(p6), m(p5), m(p4), m(R4)], V(0, 0, -1)); T.fan('trim', [m(R0), m(R4), m(p3), m(p2m), m(p2), m(p1), m(p0)], V(0, 0, -1)); }
  }
  const bodyGeo = T.geometry(['paint', 'trim']); const bodyMesh = new THREE.Mesh(bodyGeo, [paint, trim]);

  // ---------- glass canopy ----------
  const CT = new Tris(['paint', 'glass']); const NC = 90; const ccols = [];
  for (let i = 0; i <= NC; i++) { const z = CZ0 + (CZ1 - CZ0) * i / NC; const r = canopy(z); const ring = [...r]; for (let k = 4; k >= 0; k--) ring.push(mirror(r[k])); ccols.push(ring); }
  const CN = ccols[0].length; // 11, open ring
  for (let i = 0; i < NC; i++) for (let k = 0; k < CN - 1; k++) {
    const a = ccols[i][k], b = ccols[i][k + 1], c = ccols[i + 1][k + 1], d = ccols[i + 1][k]; const j = k < 5 ? k : CN - 2 - k;
    const zc = (a.z + c.z) / 2, yc = (a.y + b.y + c.y + d.y) / 4, belt = pwl(C_BELT, zc);
    let g = 'paint';
    if (j <= 2) g = zc > -0.98 + (yc - belt) * 1.5 ? 'glass' : 'paint'; // side windows with a raked C-pillar
    else if (j === 3) g = zc > 0.16 ? 'glass' : 'paint'; // roof rails (windshield wraps over)
    else g = zc > -0.62 || (zc < -1.0 && zc > -1.62) ? 'glass' : 'paint'; // windshield + glass roof, rear glass slot
    CT.quad(g, a, b, c, d);
  }
  { const r = ccols[0]; CT.fan('paint', [V(0, r[0].y, r[0].z), ...r], V(0, 0.3, -1)); }
  const cabGeo = CT.geometry(['paint', 'glass']); const cabMesh = new THREE.Mesh(cabGeo, [paint, glass]);
  for (const m of [bodyMesh, cabMesh]) { m.castShadow = true; m.receiveShadow = true; body.add(m); }

  // ---------- details ----------
  const parts = [], lights = [], interior = [], paintParts = []; const DARK = 0x0b0c0e, SEAM = 0x050506;
  // arch liners
  for (const az of [AX, -AX]) for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(wh.r + 0.035, wh.r + 0.035, 0.2, 18, 1, true, -Math.PI / 2, Math.PI); g.rotateZ(Math.PI / 2); g.translate(s * 0.88, wh.r, az); interior.push({ geo: g, c: 0x050506 }); }
  // knife-edge light bar across the whole nose
  const nose = cols[NZ]; const knife = [nose[8], nose[7], nose[6], nose[5]].map((v) => V(v.x, v.y - 0.016, v.z + 0.004));
  const kl = [...knife.slice().reverse().map(mirror).slice(0, 3), ...knife];
  for (let i = 0; i < kl.length - 1; i++) { lights.push(seg(kl[i], kl[i + 1], 0.02, 0.022, 0xf2f8ff, 0)); lights.push(seg(V(kl[i].x, kl[i].y - 0.022, kl[i].z - 0.01), V(kl[i + 1].x, kl[i + 1].y - 0.022, kl[i + 1].z - 0.01), 0.012, 0.008, 0xf2f8ff, 7)); }
  for (const s of [-1, 1]) {
    lights.push(box(0.012, 0.05, 0.07, s * (sideX(0.86, 0.8) + 0.006), 0.8, 0.86, 0xffa21a, 0, s > 0 ? 2 : 3)); // amber side marker behind the front wheel
  }
  // fascia: inner intake recess + slats, front splitter (detachable)
  parts.push(box(1.34, 0.01, 0.012, 0, 0.3, 2.284, 0x3a3d42, -0.23)); parts.push(box(1.34, 0.008, 0.012, 0, 0.42, 2.31, 0x202226, -0.23));
  // LED headlight clusters tucked into the crease between hood and fender facet
  for (const s of [-1, 1]) {
    const K = V(0.69, 0.5, 2.325), Wc = V(0.5, 0.82, 1.35), A = V(0.97, 0.87, 1.35); const n = new THREE.Vector3().subVectors(A, K).cross(new THREE.Vector3().subVectors(Wc, K)).normalize(); if (n.y < 0) n.negate();
    const c = K.clone().lerp(Wc.clone().add(A).multiplyScalar(0.5), 0.42); const q = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), n);
    const pod = (w, h, d, ox, oz, col, g) => { const geo = new THREE.BoxGeometry(w, h, d); geo.applyQuaternion(q); geo.translate(s * (c.x + ox), c.y + 0.004 + n.y * h * 0.5 - (ox * n.x), c.z + oz); return g === undefined ? { geo, c: col } : { geo, c: col, g }; };
    parts.push(pod(0.17, 0.012, 0.1, 0, 0, 0x111214));
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) lights.push(pod(0.028, 0.02, 0.022, -0.06 + i * 0.04, 0.03 - j * 0.04, 0xf6fbff, j ? 7 : 0));
  }
  const splitter = mergeParts([box(1.44, 0.03, 0.3, 0, 0, 0, DARK), box(1.4, 0.012, 0.04, 0, 0.02, 0.14, 0x2a2c30)]);
  // hood: recessed slot at the base of the windshield + panel seams
  const hoodA = Math.atan2(0.825 - 0.5, ZF - 1.35);
  parts.push(box(1.04, 0.004, 0.012, 0, 0.779, 1.49, 0x2a2c30, hoodA));
  // door: cut lines, flush (no handles, like the real car)
  const DZ0 = -0.62, DZ1 = 0.8;
  for (const s of [-1, 1]) for (const z of [DZ0, DZ1]) { const pr = profile(z); const pts = [pr[3], pr[4], pr[5]].map((v) => V(s * (v.x + 0.006), v.y, z)); for (let i = 0; i < 2; i++) parts.push(seg(pts[i], pts[i + 1], 0.008, 0.008, SEAM)); }
  // black sill blade along the rocker + rear haunch thruster intakes
  for (const s of [-1, 1]) {
    const pts = []; for (let i = 0; i <= 16; i++) { const z = -0.94 + i / 16 * 1.88; const p = profile(z)[3]; pts.push(V(s * (p.x + 0.012), p.y - 0.01, z)); }
    for (let i = 0; i < 16; i++) parts.push(seg(pts[i], pts[i + 1], 0.04, 0.03, 0x15171a));
    const iz = -0.84, iy = 0.76; const ix = s * (sideX(iz, iy) + 0.004);
    parts.push(box(0.02, 0.025, 0.3, ix, iy, iz, 0x050506, -0.12));
    parts.push({ geo: new THREE.CylinderGeometry(0.06, 0.085, 0.12, 14).translate(s * hw * 0.84, 0.24, -1.85), c: 0x3a3c40 });
    parts.push({ geo: new THREE.CylinderGeometry(0.05, 0.07, 0.1, 14).translate(s * hw * 0.8, 0.24, 1.95), c: 0x3a3c40 });
  }
  // crisp crease lines framing the hood trapezoid (windshield corner -> knife corner)
  for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 10; i++) { const z = 1.36 + i / 10 * (ZF - 0.02 - 1.36); const p6 = profile(z)[7]; pts.push(V(s * p6.x, p6.y + 0.004, z)); } for (let i = 0; i < 10; i++) parts.push(seg(pts[i], pts[i + 1], 0.008, 0.004, 0x9ea3a8)); }
  // roof rail highlight lines in body colour
  for (const s of [-1, 1]) { const pts = []; for (let i = 0; i <= 22; i++) { const z = 0.35 - i / 22 * 0.95; const c1 = canopy(z)[3]; pts.push(V(s * (c1.x + 0.004), c1.y + 0.006, z)); } for (let i = 0; i < 22; i++) paintParts.push(seg(pts[i], pts[i + 1], 0.035, 0.018, 0xffffff)); }
  // rear: full-width tail bar, reverse + indicators, diffuser + four cold-gas thruster bells (detachable)
  const tz = ZR - 0.006;
  lights.push(box(1.86, 0.035, 0.02, 0, 0.91, tz, 0xff140c, 0, 1)); lights.push(box(1.7, 0.01, 0.02, 0, 0.875, tz, 0xff140c, 0, 1));
  for (const s of [-1, 1]) { lights.push(box(0.22, 0.025, 0.02, s * 0.42, 0.81, tz, 0xffffff, 0, 4)); lights.push(box(0.12, 0.03, 0.02, s * 0.84, 0.81, tz, 0xffa21a, 0, s > 0 ? 2 : 3)); }
  lights.push(box(0.5, 0.015, 0.02, 0, 1.02, -2.215, 0xff140c, 0, 1)); // CHMSL on the ducktail
  const dparts = [box(1.6, 0.3, 0.06, 0, 0.37, 0, DARK)];
  for (let i = -3; i <= 3; i++) dparts.push(box(0.02, 0.1, 0.36, i * 0.24, 0.24, 0.18, DARK));
  for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 0.3; const bell = new THREE.CylinderGeometry(0.07, 0.095, 0.14, 16, 1, true); bell.rotateX(Math.PI / 2); bell.translate(x, 0.36, -0.06); dparts.push({ geo: bell, c: 0xb08a5a }); dparts.push({ geo: new THREE.CircleGeometry(0.068, 14).rotateY(Math.PI).translate(x, 0.36, -0.01), c: 0x020202 }); dparts.push({ geo: new THREE.TorusGeometry(0.095, 0.01, 6, 18).translate(x, 0.36, -0.13), c: 0xd0b088 }); }
  const diffuser = mergeParts(dparts);
  // giant rear wing on swan-neck pylons (body colour)
  { const y = 1.38, z = -2.02; paintParts.push(box(W * 1.0, 0.045, 0.46, 0, y, z, 0xffffff, 0.12)); paintParts.push(box(W * 0.98, 0.03, 0.12, 0, y + 0.03, z - 0.25, 0xffffff, -0.35));
    for (const s of [-1, 1]) { paintParts.push(box(0.03, 0.15, 0.5, s * W * 0.5, y - 0.02, z - 0.03, 0xffffff)); parts.push(seg(V(s * 0.34, 1.02, -1.86), V(s * 0.34, y - 0.02, -2.0), 0.035, 0.12, 0x111214, V(1, 0, 0))); } }
  // interior (visible through the canopy): two buckets, floating dash + screen, yoke
  for (const s of [-1, 1]) { const x = s * 0.4; interior.push(box(0.48, 0.1, 0.5, x, 0.34, -0.25, 0x1d1d20)); interior.push(box(0.48, 0.62, 0.1, x, 0.64, -0.55, 0x1d1d20, -0.32)); interior.push(box(0.1, 0.5, 0.42, x - s * 0.22, 0.48, -0.42, 0x26262a, -0.3)); interior.push(box(0.24, 0.14, 0.08, x, 1.0, -0.66, 0x26262a, -0.3)); }
  interior.push(box(1.36, 0.08, 0.36, 0, 0.84, 0.5, 0x161618)); interior.push(box(0.2, 0.14, 0.9, 0, 0.42, 0.0, 0x161618));
  { const y0 = new THREE.TorusGeometry(0.16, 0.022, 6, 20, Math.PI); y0.rotateZ(Math.PI); y0.rotateX(-0.45); y0.translate(0.4, 0.9, 0.24); interior.push({ geo: y0, c: 0x111111 }); interior.push(box(0.32, 0.03, 0.03, 0.4, 0.9, 0.24, 0x111111, -0.45)); }
  lights.push(box(0.36, 0.2, 0.012, 0.0, 0.95, 0.42, 0x3aa0ff, -0.6, 7));

  const detail = new THREE.Mesh(mergeParts(parts), S.detail); detail.castShadow = true; body.add(detail);
  const pmesh = new THREE.Mesh(mergeParts(paintParts), paint); pmesh.castShadow = true; body.add(pmesh);
  const inter = new THREE.Mesh(mergeParts(interior), S.interior); body.add(inter);
  const lmat = makeLightMaterial(); const lmesh = new THREE.Mesh(lightParts(lights), lmat); body.add(lmesh);
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.125), new THREE.MeshStandardMaterial({ map: plateTexture('ROSTR'), roughness: 0.4 })); pl.rotation.y = Math.PI; pl.position.set(0, 0.62, ZR - 0.012); body.add(pl);
  // detachable bumpers: [front splitter, rear diffuser]
  const bumpers = [];
  { const m = new THREE.Mesh(splitter, S.detail); m.position.set(0, 0.13, 2.16); m.castShadow = true; body.add(m); bumpers.push(m); }
  { const m = new THREE.Mesh(diffuser, S.detail); m.position.set(0, 0, ZR + 0.05); m.castShadow = true; body.add(m); bumpers.push(m); }
  // doors: flush panels lifted straight from the body surface between the cut lines
  const doors = [];
  for (const side of [1, -1]) {
    const DT = new Tris(['paint']); const NDZ = 18; const dcols = [];
    for (let i = 0; i <= NDZ; i++) { const z = DZ0 + (DZ1 - DZ0) * i / NDZ; const p = profile(z); dcols.push([p[3], p[4], p[5]].map((v) => V(side * (v.x + 0.004), v.y, z))); }
    for (let i = 0; i < NDZ; i++) for (let k = 0; k < 2; k++) { if (side > 0) DT.quad('paint', dcols[i][k], dcols[i][k + 1], dcols[i + 1][k + 1], dcols[i + 1][k]); else DT.quad('paint', dcols[i][k], dcols[i + 1][k], dcols[i + 1][k + 1], dcols[i][k + 1]); }
    const geo = DT.geometry(['paint']); const hinge = V(side * (profile(DZ1)[4].x + 0.004), 0, DZ1); geo.translate(-hinge.x, 0, -hinge.z);
    const pivot = new THREE.Group(); pivot.position.copy(hinge); const dm = new THREE.Mesh(geo, paint); dm.castShadow = true; pivot.add(dm); body.add(pivot);
    doors.push({ pivot, side, open: 0, target: 0, attached: true });
  }
  const wheels = [];
  for (const [az, front] of [[(wh.f - 0.5) * L, true], [(wh.b - 0.5) * L, false]]) for (const s of [1, -1]) wheels.push({ x: s * wh.track * hw, z: az, front, side: s, r: wh.r, w: wh.w, spin: 0, comp: 0, lastP: null, skid: false });
  return { root, body, bodyMesh, cabMesh, paint, glass, detail, lights: lmesh, lightU: lmat.uniforms.L.value, bumpers, doors, wheels, interior: inter, origBody: bodyGeo.attributes.position.array.slice(), origCab: cabGeo.attributes.position.array.slice() };
}
