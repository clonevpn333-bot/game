// GETAWAY! — generic hand-modelled "crease-line" car builder (the ROSTR technique, reusable).
// A car is described by 8 right-half crease lines (p0 floor centre .. p7 roof/hood centre), each a set of
// x/y keyframes along z, plus a canopy (greenhouse) profile, nose/tail caps and a details() pass.
// Flat-shaded loft between the creases gives crisp, real-car panel planes.
import * as THREE from 'three';
import { mergeParts } from '../world/props.js';
import { plateTexture } from '../world/textures.js';
import { wheelAssets, makeLightMaterial, lightParts } from './models.js';
import { PHOTO } from './photoTex.js';

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

// auto-smooth: per-vertex normal = average of the adjacent face normals within `deg` of this face (smooth curves, crisp creases)
export function autoSmooth(geo, deg = 32) {
  const pos = geo.attributes.position.array; const n = pos.length / 9; const fn = new Float32Array(n * 3); const cosT = Math.cos(deg * Math.PI / 180);
  for (let f = 0; f < n; f++) { const o = f * 9; const ux = pos[o + 3] - pos[o], uy = pos[o + 4] - pos[o + 1], uz = pos[o + 5] - pos[o + 2], vx = pos[o + 6] - pos[o], vy = pos[o + 7] - pos[o + 1], vz = pos[o + 8] - pos[o + 2]; let cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx; const l = Math.hypot(cx, cy, cz) || 1; fn[f * 3] = cx / l; fn[f * 3 + 1] = cy / l; fn[f * 3 + 2] = cz / l; }
  const key = (i) => Math.round(pos[i * 3] * 2000) + ',' + Math.round(pos[i * 3 + 1] * 2000) + ',' + Math.round(pos[i * 3 + 2] * 2000); const map = new Map();
  for (let i = 0; i < n * 3; i++) { const k = key(i); let l = map.get(k); if (!l) map.set(k, (l = [])); l.push(i); }
  const nor = new Float32Array(n * 9);
  for (const list of map.values()) for (const i of list) { const f = (i / 3) | 0; let x = 0, y = 0, z = 0; for (const j of list) { const g = (j / 3) | 0; const d = fn[f * 3] * fn[g * 3] + fn[f * 3 + 1] * fn[g * 3 + 1] + fn[f * 3 + 2] * fn[g * 3 + 2]; if (d >= cosT) { x += fn[g * 3]; y += fn[g * 3 + 1]; z += fn[g * 3 + 2]; } } const l = Math.hypot(x, y, z) || 1; nor[i * 3] = x / l; nor[i * 3 + 1] = y / l; nor[i * 3 + 2] = z / l; }
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return geo;
}
// ---------- photo projection ("pixel to pixel" from the reference photos) ----------
// Each view is a solved camera for one reference photo. Every panel takes its texture from the view that sees it
// most head-on (mirrored for the far side). Paint pixels carry shading only (alpha 127) and are recoloured in-game.
const PW = 678, PH = 452; const ATLAS = {};
function photoAtlas(keys) {
  const id = keys.join('+'); if (ATLAS[id]) return ATLAS[id];
  const AH = PH * keys.length + 8; const cv = document.createElement('canvas'); cv.width = PW; cv.height = AH; const g = cv.getContext('2d');
  { const strip = g.createImageData(PW, AH); for (let i = 0; i < strip.data.length; i += 4) { strip.data[i] = strip.data[i + 1] = strip.data[i + 2] = 158; strip.data[i + 3] = 127; } g.putImageData(strip, 0, 0); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; tex.premultiplyAlpha = false;
  keys.forEach((k, i) => {
    const [jpg, png] = PHOTO[k]; const a = new Image(), b = new Image(); let n = 0;
    const done = () => { if (++n < 2) return; const t = document.createElement('canvas'); t.width = PW; t.height = PH; const tg = t.getContext('2d'); tg.drawImage(b, 0, 0, PW, PH); const md = tg.getImageData(0, 0, PW, PH).data; tg.clearRect(0, 0, PW, PH); tg.drawImage(a, 0, 0, PW, PH); const im = tg.getImageData(0, 0, PW, PH); for (let q = 0; q < md.length; q += 4) im.data[q + 3] = md[q] > 127 ? 127 : 255; g.putImageData(im, 0, i * PH); tex.needsUpdate = true; };
    a.onload = done; b.onload = done; a.src = jpg; b.src = png;
  });
  return (ATLAS[id] = { tex, AH, n: keys.length });
}
export function photoPaint(mat, tex) {
  mat.map = tex;
  mat.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#ifdef USE_MAP
    vec4 tP = texture2D( map, vMapUv ); float pm = 1.0 - smoothstep( 0.62, 0.88, tP.a );
    diffuseColor.rgb = mix( tP.rgb, tP.rgb * diffuse * 2.6, pm );
  #endif`); };
  mat.customProgramCacheKey = () => 'photoPaint';
}
function viewProject(vw, x, y, z) {
  if (vw.ortho) { const o = vw.ortho; return [o.cx + o.s * z, o.gy - o.s * y / (o.ys || 1)]; }
  const [ry, h, d, lx, ly, fov, side] = vw.cam; const c = Math.cos(ry), s = Math.sin(ry);
  const wx = x * c + z * s, wy = y, wz = -x * s + z * c; const cam = V(side, h, d); const f = V(lx, ly, 0).sub(cam).normalize(); const r = new THREE.Vector3().crossVectors(f, V(0, 1, 0)).normalize(); const u = new THREE.Vector3().crossVectors(r, f);
  const rel = V(wx, wy, wz).sub(cam); const fy = (PH / 2) / Math.tan(fov * Math.PI / 360); const zc = rel.dot(f);
  return [PW / 2 + fy * rel.dot(r) / zc, PH / 2 - fy * rel.dot(u) / zc];
}
function viewToCam(vw, cx, cy, cz) {
  if (vw.ortho) return V(vw.ortho.side, 0, 0);
  const [ry, h, d, , , , side] = vw.cam; const c = Math.cos(ry), s = Math.sin(ry); // camera in car-local space
  const lx = side * c - d * s, lz = side * s + d * c; return V(lx - cx, h - cy, lz - cz).normalize();
}
export function projectUVs(def, geo, atlas, offset = null) {
  const views = def.photo.views; const pos = geo.attributes.position.array; const nV = pos.length / 3; const uv = new Float32Array(nV * 2);
  const plainV = 1 - (PH * atlas.n + 4) / atlas.AH; const A = V(0, 0, 0), B = V(0, 0, 0), C = V(0, 0, 0), N = V(0, 0, 0), M = V(0, 0, 0);
  for (let f = 0; f < nV / 3; f++) {
    const o = f * 9; A.set(pos[o], pos[o + 1], pos[o + 2]); B.set(pos[o + 3], pos[o + 4], pos[o + 5]); C.set(pos[o + 6], pos[o + 7], pos[o + 8]);
    if (offset) { A.add(offset); B.add(offset); C.add(offset); }
    N.subVectors(B, A).cross(M.subVectors(C, A)).normalize(); M.copy(A).add(B).add(C).multiplyScalar(1 / 3);
    let best = -1, bw = def.photo.minFacing ?? 0.3, mir = false;
    views.forEach((vw, i) => { for (const m of [false, true]) { const n2 = m ? V(-N.x, N.y, N.z) : N; const tc = viewToCam(vw, m ? -M.x : M.x, M.y, M.z); const w = n2.dot(tc) - (m ? 0.05 : 0); if (w > bw) { bw = w; best = i; mir = m; } } });
    for (let k = 0; k < 3; k++) {
      const vi = f * 3 + k; if (best < 0) { uv[vi * 2] = 0.5; uv[vi * 2 + 1] = plainV; continue; }
      const P = k === 0 ? A : k === 1 ? B : C; const [px, py] = viewProject(views[best], mir ? -P.x : P.x, P.y, P.z);
      uv[vi * 2] = Math.min(1, Math.max(0, px / PW)); uv[vi * 2 + 1] = 1 - (Math.min(PH - 1, Math.max(0, py)) + PH * views[best].slot) / atlas.AH;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
// subdivision (Chaikin corner cutting on each cross-section ring) -> rounded, flowing panels like a Subdivision Surface
function chaikin(pts, segs, closed, iters, r) {
  for (let it = 0; it < iters; it++) {
    const P = [], Sg = []; const n = pts.length; const m = closed ? n : n - 1;
    if (!closed) { P.push(pts[0]); Sg.push(segs[0]); }
    for (let k = 0; k < m; k++) { const a = pts[k], b = pts[(k + 1) % n]; if (closed || k > 0) { P.push(lerpV(a, b, r)); Sg.push(segs[k]); } if (closed || k < m - 1) { P.push(lerpV(a, b, 1 - r)); Sg.push(segs[k]); } }
    if (!closed) { P.push(pts[n - 1]); Sg.push(segs[m - 1]); }
    pts = P; segs = Sg;
  }
  return [pts, segs];
}
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
  const segMat = def.segMat || ((j) => (j <= 2 ? 'trim' : 'paint')); const sub = def.subdiv;
  let segs0 = cols[0].map((_, k) => (k < 8 ? k : cols[0].length - 1 - k));
  const rings = sub ? cols.map((ring) => chaikin(ring, segs0, true, sub.iters ?? 2, sub.r ?? 0.2)[0]) : cols; const segs = sub ? chaikin(cols[0], segs0, true, sub.iters ?? 2, sub.r ?? 0.2)[1] : segs0; const RN = rings[0].length;
  const DTs = sub && def.doors ? { 1: new Tris(['paint']), '-1': new Tris(['paint']) } : null; const dSegs = def.doors?.segs || [3, 4];
  for (let i = 0; i < NZ; i++) for (let k = 0; k < RN; k++) {
    const k2 = (k + 1) % RN; const a = rings[i][k], b = rings[i][k2], cc = rings[i + 1][k2], d = rings[i + 1][k]; const zc = (a.z + cc.z) / 2, yc = (a.y + b.y + cc.y + d.y) / 4; const j = segs[k];
    T.quad(segMat(j, zc, yc), a, b, cc, d);
    if (DTs && zc > def.doors.z0 && zc < def.doors.z1 && dSegs.includes(j) && yc > (def.doors.yMin ?? 0)) { const sd = a.x + b.x > 0 ? 1 : -1; const o = (v) => V(v.x + sd * 0.005, v.y, v.z); DTs[sd].quad('paint', o(a), o(b), o(cc), o(d)); }
  }
  const capFan = (mat, pts, dir) => { for (const s of [1, -1]) T.fan(mat, pts.map((v) => (s > 0 ? v : mirror(v))), dir); };
  const ringCap = (ring, dir, matFn) => { const c0 = ring.reduce((acc, v) => acc.add(v), V(0, 0, 0)).multiplyScalar(1 / ring.length); c0.z += dir.z * 0.012; for (let k = 0; k < ring.length; k++) { let p1 = ring[k], p2 = ring[(k + 1) % ring.length]; const nrm = new THREE.Vector3().subVectors(p1, c0).cross(new THREE.Vector3().subVectors(p2, c0)); if (nrm.dot(dir) < 0) { const t = p1; p1 = p2; p2 = t; } T.tri(matFn((c0.y + p1.y + p2.y) / 3), c0, p1, p2); } };
  if (sub) { ringCap(rings[NZ], V(0, 0, 1), def.noseMat || (() => 'paint')); ringCap(rings[0], V(0, 0, -1), def.tailMat || ((y) => (y > 0.62 ? 'paint' : 'trim'))); }
  else if (def.noseCap) def.noseCap(cols[NZ], capFan); else { const [p0, p1, p2, p2m, p3, p4, p5, p6, p7] = cols[NZ]; capFan('trim', [V(0, p0.y, p0.z), p7, p6, p5, p4, p3, p2m, p2, p1, p0], V(0, 0, 1)); }
  if (sub) {} else if (def.tailCap) def.tailCap(cols[0], capFan); else { const [p0, p1, p2, p2m, p3, p4, p5, p6, p7] = cols[0]; capFan('paint', [V(0, p3.y, p0.z), p7, p6, p5, p4, p3], V(0, 0, -1)); capFan('trim', [V(0, p3.y, p0.z), p3, p2m, p2, p1, p0], V(0, 0, -1)); }
  const atlas = def.photo ? photoAtlas(def.photo.views.map((v) => v.img)) : null; if (atlas) photoPaint(paint, atlas.tex);
  const bodyGeo = autoSmooth(T.geometry(['paint', 'trim']), def.smooth ?? 32); const bodyMesh = new THREE.Mesh(bodyGeo, [paint, trim]); if (atlas) projectUVs(def, bodyGeo, atlas);
  // ---- canopy ----
  const C = def.canopy; const CT = new Tris(['paint', 'glass', 'trim']); const NC = C.n || 100; const ccols = [];
  for (let i = 0; i <= NC; i++) { const z = C.z0 + (C.z1 - C.z0) * i / NC; const r = canopy(z); const ring = [...r]; for (let k = 4; k >= 0; k--) ring.push(mirror(r[k])); ccols.push(ring); }
  let cseg0 = ccols[0].map((_, k) => (k < 5 ? k : ccols[0].length - 2 - k)); const csub = C.subdiv;
  const crings = csub ? ccols.map((r) => chaikin(r, cseg0, false, csub.iters ?? 2, csub.r ?? 0.2)[0]) : ccols; const csegs = csub ? chaikin(ccols[0], cseg0, false, csub.iters ?? 2, csub.r ?? 0.2)[1] : cseg0; const CN = crings[0].length;
  for (let i = 0; i < NC; i++) for (let k = 0; k < CN - 1; k++) { const a = crings[i][k], b = crings[i][k + 1], cc = crings[i + 1][k + 1], d = crings[i + 1][k]; const j = csegs[k]; const zc = (a.z + cc.z) / 2, yc = (a.y + b.y + cc.y + d.y) / 4; CT.quad(C.mat(j, zc, yc, pwl(C.belt, zc)), a, b, cc, d); }
  { const r = crings[0]; CT.fan(C.rearCap || 'paint', [V(0, r[0].y, r[0].z), ...r], V(0, 0.3, -1)); const f = crings[NC]; CT.fan(C.frontCap || 'glass', [V(0, f[0].y, f[0].z), ...f], V(0, 0.3, 1)); }
  const cabGeo = autoSmooth(CT.geometry(['paint', 'glass', 'trim']), def.smooth ?? 32); const cabMesh = new THREE.Mesh(cabGeo, [paint, glass, trim]); if (atlas) projectUVs(def, cabGeo, atlas);
  for (const m of [bodyMesh, cabMesh]) { m.castShadow = true; m.receiveShadow = true; body.add(m); }
  // ---- details ----
  const parts = [], lights = [], interior = [], paintParts = [];
  for (const a of def.axles) for (const s of [-1, 1]) { const g = new THREE.CylinderGeometry(a.r + 0.02, a.r + 0.02, 0.2, 18, 1, true, -Math.PI / 2, Math.PI); g.rotateZ(Math.PI / 2); g.translate(s * (wh.track * hw - 0.03), a.r, a.z); interior.push({ geo: g, c: 0x000000 }); }
  const api = { ...sh, V, mirror, lerpV, seg, box, poly, parts, lights, interior, paintParts, L, W, hw, spec, body, def };
  if (def.details) def.details(api);
  const detail = new THREE.Mesh(mergeParts(parts), S.detail); detail.castShadow = true; body.add(detail);
  if (paintParts.length) { const pg = mergeParts(paintParts); if (atlas) { const nv = pg.attributes.position.count; const u2 = new Float32Array(nv * 2); const pv = 1 - (PH * atlas.n + 4) / atlas.AH; for (let i = 0; i < nv; i++) { u2[i * 2] = 0.5; u2[i * 2 + 1] = pv; } pg.setAttribute('uv', new THREE.BufferAttribute(u2, 2)); } const pmesh = new THREE.Mesh(pg, paint); pmesh.castShadow = true; body.add(pmesh); }
  const inter = new THREE.Mesh(mergeParts(interior), S.interior); body.add(inter);
  const lmat = makeLightMaterial(); const lmesh = new THREE.Mesh(lightParts(lights), lmat); body.add(lmesh);
  if (def.plate) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.12), new THREE.MeshStandardMaterial({ map: plateTexture(def.plate.text), roughness: 0.4 })); pl.rotation.y = Math.PI; pl.position.set(0, def.plate.y, def.ZR - 0.012); body.add(pl); }
  // ---- detachable bumpers: [front lip, rear diffuser] ----
  const bumpers = [];
  for (const [list, pos] of [[def.frontLip, def.ZF], [def.rearLip, def.ZR]]) { const g = list ? mergeParts(list(api)) : mergeParts([box(0.4, 0.02, 0.1, 0, 0, 0, 0x0b0c0e)]); const m = new THREE.Mesh(g, S.detail); m.castShadow = true; body.add(m); bumpers.push(m); }
  // ---- doors: panels lifted off the side between the cut lines ----
  const doors = [];
  if (DTs) for (const side of [1, -1]) {
    const geo = autoSmooth(DTs[side].geometry(['paint']), def.smooth ?? 32); if (atlas) projectUVs(def, geo, atlas); const hz = def.doors.z1; const hinge = V(side * (profile(hz)[4].x), 0, hz); geo.translate(-hinge.x, 0, -hinge.z);
    const pivot = new THREE.Group(); pivot.position.copy(hinge); const dm = new THREE.Mesh(geo, paint); dm.castShadow = true; pivot.add(dm); body.add(pivot); doors.push({ pivot, side, open: 0, target: 0, attached: true });
  }
  else for (const side of [1, -1]) {
    const DT = new Tris(['paint']); const ND = 18; const dc = []; const { z0: DZ0, z1: DZ1, rows = [3, 4, 5] } = def.doors;
    for (let i = 0; i <= ND; i++) { const z = DZ0 + (DZ1 - DZ0) * i / ND; const p = profile(z); dc.push(rows.map((r) => V(side * (p[r].x + 0.004), p[r].y, z))); }
    for (let i = 0; i < ND; i++) for (let k = 0; k < rows.length - 1; k++) { if (side > 0) DT.quad('paint', dc[i][k], dc[i][k + 1], dc[i + 1][k + 1], dc[i + 1][k]); else DT.quad('paint', dc[i][k], dc[i + 1][k], dc[i + 1][k + 1], dc[i][k + 1]); }
    const geo = autoSmooth(DT.geometry(['paint']), def.smooth ?? 32); if (atlas) projectUVs(def, geo, atlas); const hinge = V(side * (profile(DZ1)[rows[1]].x + 0.004), 0, DZ1); geo.translate(-hinge.x, 0, -hinge.z);
    const pivot = new THREE.Group(); pivot.position.copy(hinge); const dm = new THREE.Mesh(geo, paint); dm.castShadow = true; pivot.add(dm); body.add(pivot); doors.push({ pivot, side, open: 0, target: 0, attached: true });
  }
  const wheels = [];
  for (const [az, front] of [[(wh.f - 0.5) * L, true], [(wh.b - 0.5) * L, false]]) for (const s of [1, -1]) wheels.push({ x: s * wh.track * hw, z: az, front, side: s, r: wh.r, w: wh.w, spin: 0, comp: 0, lastP: null, skid: false });
  return { root, body, bodyMesh, cabMesh, paint, glass, detail, lights: lmesh, lightU: lmat.uniforms.L.value, bumpers, doors, wheels, interior: inter, origBody: bodyGeo.attributes.position.array.slice(), origCab: cabGeo.attributes.position.array.slice() };
}
