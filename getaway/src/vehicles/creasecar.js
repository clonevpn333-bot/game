// GETAWAY! — generic hand-modelled "crease-line" car builder (the ROSTR technique, reusable).
// A car is described by 8 right-half crease lines (p0 floor centre .. p7 roof/hood centre), each a set of
// x/y keyframes along z, plus a canopy (greenhouse) profile, nose/tail caps and a details() pass.
// Flat-shaded loft between the creases gives crisp, real-car panel planes.
import * as THREE from 'three';
import { mergeParts } from '../world/props.js';
import { plateTexture } from '../world/textures.js';
import { wheelAssets, makeLightMaterial, lightParts } from './models.js';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const lerpV = (a, b, t) => a.clone().lerp(b, t);
export const mirror = (v) => V(-v.x, v.y, v.z);
export const pwl = (keys, z) => {
  if (z <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (z <= b[0]) return a[1] + (b[1] - a[1]) * (z - a[0]) / (b[0] - a[0]); }
  return keys[keys.length - 1][1];
};
export class Tris {
  constructor(names) { this.g = {}; for (const n of names) this.g[n] = []; }
  tri(gname, a, b, c) { const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z; const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx; if (cx * cx + cy * cy + cz * cz < 1e-12) return; this.g[gname].push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); }
  quad(gname, a, b, c, d) { this.tri(gname, a, b, c); this.tri(gname, a, c, d); }
  fan(gname, pts, dir) { for (let i = 1; i < pts.length - 1; i++) { let a = pts[0], b = pts[i], c = pts[i + 1]; if (dir) { const n = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)); if (n.dot(dir) < 0) { const t = b; b = c; c = t; } } this.tri(gname, a, b, c); } }
  geometry(order) {
    const all = []; const g = new THREE.BufferGeometry(); let start = 0;
    order.forEach((n, mi) => { const l = this.g[n] || []; for (const v of l) all.push(v); g.addGroup(start, l.length / 3, mi); start += l.length / 3; });
    g.setAttribute('position', new THREE.Float32BufferAttribute(all, 3)); g.computeVertexNormals(); return g;
  }
}
export function seg(a, b, w, h, c, g, up = V(0, 1, 0)) {
  const d = new THREE.Vector3().subVectors(b, a); const len = d.length(); const geo = new THREE.BoxGeometry(len, h, w);
  const xA = d.clone().normalize(); let zA = new THREE.Vector3().crossVectors(xA, up); if (zA.lengthSq() < 1e-6) zA = new THREE.Vector3().crossVectors(xA, V(1, 0, 0)); zA.normalize(); const yA = new THREE.Vector3().crossVectors(zA, xA).normalize();
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(xA, yA, zA)); const m = a.clone().add(b).multiplyScalar(0.5); geo.translate(m.x, m.y, m.z);
  return g === undefined ? { geo, c } : { geo, c, g };
}
export const box = (w, h, d, x, y, z, c, rx = 0, g, ry = 0) => { const geo = new THREE.BoxGeometry(w, h, d); if (rx) geo.rotateX(rx); if (ry) geo.rotateY(ry); geo.translate(x, y, z); return g === undefined ? { geo, c } : { geo, c, g }; };
// flat polygon (list of Vector3) as a part, both windings
export function poly(pts, c, g) { const P = []; for (let i = 1; i < pts.length - 1; i++) for (const [a, b, d] of [[0, i, i + 1], [0, i + 1, i]]) P.push(pts[a].x, pts[a].y, pts[a].z, pts[b].x, pts[b].y, pts[b].z, pts[d].x, pts[d].y, pts[d].z); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.computeVertexNormals(); return g === undefined ? { geo, c } : { geo, c, g }; }

const ORDER = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
function inPoly(pt, poly2) { let ins = false; for (let i = 0, j = poly2.length - 1; i < poly2.length; j = i++) { const [zi, yi] = poly2[i], [zj, yj] = poly2[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (zj - zi) * (pt[1] - yi) / (yj - yi) + zi) ins = !ins; } return ins; }

export function makeShape(def) {
  const line = (name, zc) => { const [xk, yk, z0, z1] = def.lines[name]; const z = Math.min(z1, Math.max(z0, zc)); return V(pwl(xk, z), pwl(yk, z), z); };
  const archY = (z) => { let y = -1; for (const a of def.axles) { const d = Math.abs(z - a.z); if (d < a.R) y = Math.max(y, a.r + Math.sqrt(a.R * a.R - d * d)); } return y; };
  const profile = (zc) => {
    const P = {}; for (const n of ORDER) P[n] = line(n, zc); if (def.profileHook) def.profileHook(P, zc);
    const p2m = lerpV(P.p2, P.p3, def.p2m ?? 0.16); const pts = [P.p0, P.p1, P.p2, p2m, P.p3, P.p4, P.p5, P.p6, P.p7];
    const ay = archY(zc); if (ay > 0) { const cap = P.p4.y - (def.archLip ?? 0.035); for (let i = 0; i <= 4; i++) pts[i].y = Math.max(pts[i].y, Math.min(ay, cap)); }
    return pts;
  };
  const sideX = (z, y) => { const p = profile(z); for (let i = 2; i < 6; i++) { const a = p[i], b = p[i + 1]; if (y >= a.y && y <= b.y) return a.x + (b.x - a.x) * (y - a.y) / ((b.y - a.y) || 1); } return y < p[2].y ? p[2].x : p[6].x; };
  const c = def.canopy;
  const canopy = (z) => { const belt = pwl(c.belt, z), roof = pwl(c.roof, z); const c0 = V(pwl(c.x0, z), belt, z), c1 = V(pwl(c.x1, z), Math.max(belt + 0.005, roof - pwl(c.drop, z)), z), c2 = V(0, roof, z); return [c0, lerpV(c0, c1, 0.34), lerpV(c0, c1, 0.68), c1, lerpV(c1, c2, c.rail ?? 0.16), c2]; };
  // a flat-ish patch hugging the side between (z,y) polygon vertices (both sides), for intakes / cladding / vents
  const sidePatch = (poly2, off, col, list, n = 22) => {
    const zs = poly2.map((p) => p[0]), ys = poly2.map((p) => p[1]); const z0 = Math.min(...zs), z1 = Math.max(...zs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const P = []; const dz = (z1 - z0) / n, dy = (y1 - y0) / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const za = z0 + i * dz, ya = y0 + j * dy; if (!inPoly([za + dz / 2, ya + dy / 2], poly2)) continue; const q = [[za, ya], [za + dz, ya], [za + dz, ya + dy], [za, ya + dy]].map(([z, y]) => V(sideX(z, y) + off, y, z)); for (const s of [1, -1]) { const m = (v) => (s > 0 ? v : mirror(v)); for (const [a, b, d] of [[0, 1, 2], [0, 2, 3], [0, 2, 1], [0, 3, 2]]) { const A = m(q[a]), Bv = m(q[b]), D = m(q[d]); P.push(A.x, A.y, A.z, Bv.x, Bv.y, Bv.z, D.x, D.y, D.z); } } }
    if (!P.length) return; const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.computeVertexNormals(); list.push({ geo, c: col });
  };
  return { line, profile, sideX, canopy, sidePatch, archY };
}

export function buildCreaseCar(def, spec, paintColor) {
  const S = wheelAssets(); const { L, W } = spec; const wh = spec.wheels; const hw = W / 2; const sh = makeShape(def); const { profile, canopy } = sh;
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const pm = def.paint || {}; const paint = new THREE.MeshPhysicalMaterial({ color: paintColor, roughness: pm.roughness ?? 0.32, metalness: pm.metalness ?? 0.4, clearcoat: 1, clearcoatRoughness: 0.08 });
  const trim = new THREE.MeshStandardMaterial({ color: def.trimColor ?? 0x0b0c0e, roughness: 0.5, metalness: 0.35 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0a0e12, roughness: 0.03, metalness: 0.96, transparent: true, opacity: 0.9, map: (() => { const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true; return t; })() });
  // ---- body shell ----
  const T = new Tris(['paint', 'trim']); const NZ = def.nz || 130; const cols = [];
  for (let i = 0; i <= NZ; i++) { const z = def.ZR + (def.ZF - def.ZR) * i / NZ; const r = profile(z); const ring = [...r]; for (let k = 7; k >= 1; k--) ring.push(mirror(r[k])); cols.push(ring); }
  const segMat = def.segMat || ((j) => (j <= 2 ? 'trim' : 'paint')); const RN = cols[0].length;
  for (let i = 0; i < NZ; i++) for (let k = 0; k < RN; k++) { const k2 = (k + 1) % RN; const j = k < 8 ? k : RN - 1 - k; const a = cols[i][k], b = cols[i][k2], cc = cols[i + 1][k2], d = cols[i + 1][k]; T.quad(segMat(j, (a.z + cc.z) / 2, (a.y + b.y + cc.y + d.y) / 4), a, b, cc, d); }
  const capFan = (mat, pts, dir) => { for (const s of [1, -1]) T.fan(mat, pts.map((v) => (s > 0 ? v : mirror(v))), dir); };
  if (def.noseCap) def.noseCap(cols[NZ], capFan); else { const [p0, p1, p2, p2m, p3, p4, p5, p6, p7] = cols[NZ]; capFan('trim', [V(0, p0.y, p0.z), p7, p6, p5, p4, p3, p2m, p2, p1, p0], V(0, 0, 1)); }
  if (def.tailCap) def.tailCap(cols[0], capFan); else { const [p0, p1, p2, p2m, p3, p4, p5, p6, p7] = cols[0]; capFan('paint', [V(0, p3.y, p0.z), p7, p6, p5, p4, p3], V(0, 0, -1)); capFan('trim', [V(0, p3.y, p0.z), p3, p2m, p2, p1, p0], V(0, 0, -1)); }
  const bodyGeo = T.geometry(['paint', 'trim']); const bodyMesh = new THREE.Mesh(bodyGeo, [paint, trim]);
  // ---- canopy ----
  const C = def.canopy; const CT = new Tris(['paint', 'glass', 'trim']); const NC = C.n || 100; const ccols = [];
  for (let i = 0; i <= NC; i++) { const z = C.z0 + (C.z1 - C.z0) * i / NC; const r = canopy(z); const ring = [...r]; for (let k = 4; k >= 0; k--) ring.push(mirror(r[k])); ccols.push(ring); }
  const CN = ccols[0].length;
  for (let i = 0; i < NC; i++) for (let k = 0; k < CN - 1; k++) { const a = ccols[i][k], b = ccols[i][k + 1], cc = ccols[i + 1][k + 1], d = ccols[i + 1][k]; const j = k < 5 ? k : CN - 2 - k; const zc = (a.z + cc.z) / 2, yc = (a.y + b.y + cc.y + d.y) / 4; CT.quad(C.mat(j, zc, yc, pwl(C.belt, zc)), a, b, cc, d); }
  { const r = ccols[0]; CT.fan(C.rearCap || 'paint', [V(0, r[0].y, r[0].z), ...r], V(0, 0.3, -1)); const f = ccols[NC]; CT.fan(C.frontCap || 'glass', [V(0, f[0].y, f[0].z), ...f], V(0, 0.3, 1)); }
  const cabGeo = CT.geometry(['paint', 'glass', 'trim']); const cabMesh = new THREE.Mesh(cabGeo, [paint, glass, trim]);
  for (const m of [bodyMesh, cabMesh]) { m.castShadow = true; m.receiveShadow = true; body.add(m); }
  // ---- details ----
  const parts = [], lights = [], interior = [], paintParts = [];
  for (const a of def.axles) for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(a.r + 0.035, a.r + 0.035, 0.22, 18, 1, true, -Math.PI / 2, Math.PI); g.rotateZ(Math.PI / 2); g.translate(s * (wh.track * hw), a.r, a.z); interior.push({ geo: g, c: 0x050506 }); }
  const api = { ...sh, V, mirror, lerpV, seg, box, poly, parts, lights, interior, paintParts, L, W, hw, spec, body, def };
  if (def.details) def.details(api);
  const detail = new THREE.Mesh(mergeParts(parts), S.detail); detail.castShadow = true; body.add(detail);
  if (paintParts.length) { const pmesh = new THREE.Mesh(mergeParts(paintParts), paint); pmesh.castShadow = true; body.add(pmesh); }
  const inter = new THREE.Mesh(mergeParts(interior), S.interior); body.add(inter);
  const lmat = makeLightMaterial(); const lmesh = new THREE.Mesh(lightParts(lights), lmat); body.add(lmesh);
  if (def.plate) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), new THREE.MeshStandardMaterial({ map: plateTexture(def.plate.text), roughness: 0.4 })); pl.rotation.y = Math.PI; pl.position.set(0, def.plate.y, def.ZR - 0.012); body.add(pl); }
  // ---- detachable bumpers: [front lip, rear diffuser] ----
  const bumpers = [];
  for (const [list, pos] of [[def.frontLip, def.ZF], [def.rearLip, def.ZR]]) { const g = list ? mergeParts(list(api)) : mergeParts([box(0.4, 0.02, 0.1, 0, 0, 0, 0x0b0c0e)]); const m = new THREE.Mesh(g, S.detail); m.castShadow = true; body.add(m); bumpers.push(m); }
  // ---- doors: panels lifted off the side between the cut lines ----
  const doors = [];
  for (const side of [1, -1]) {
    const DT = new Tris(['paint']); const ND = 18; const dc = []; const { z0: DZ0, z1: DZ1, rows = [3, 4, 5] } = def.doors;
    for (let i = 0; i <= ND; i++) { const z = DZ0 + (DZ1 - DZ0) * i / ND; const p = profile(z); dc.push(rows.map((r) => V(side * (p[r].x + 0.004), p[r].y, z))); }
    for (let i = 0; i < ND; i++) for (let k = 0; k < rows.length - 1; k++) { if (side > 0) DT.quad('paint', dc[i][k], dc[i][k + 1], dc[i + 1][k + 1], dc[i + 1][k]); else DT.quad('paint', dc[i][k], dc[i + 1][k], dc[i + 1][k + 1], dc[i][k + 1]); }
    const geo = DT.geometry(['paint']); const hinge = V(side * (profile(DZ1)[rows[1]].x + 0.004), 0, DZ1); geo.translate(-hinge.x, 0, -hinge.z);
    const pivot = new THREE.Group(); pivot.position.copy(hinge); const dm = new THREE.Mesh(geo, paint); dm.castShadow = true; pivot.add(dm); body.add(pivot); doors.push({ pivot, side, open: 0, target: 0, attached: true });
  }
  const wheels = [];
  for (const [az, front] of [[(wh.f - 0.5) * L, true], [(wh.b - 0.5) * L, false]]) for (const s of [1, -1]) wheels.push({ x: s * wh.track * hw, z: az, front, side: s, r: wh.r, w: wh.w, spin: 0, comp: 0, lastP: null, skid: false });
  return { root, body, bodyMesh, cabMesh, paint, glass, detail, lights: lmesh, lightU: lmat.uniforms.L.value, bumpers, doors, wheels, interior: inter, origBody: bodyGeo.attributes.position.array.slice(), origCab: cabGeo.attributes.position.array.slice() };
}
