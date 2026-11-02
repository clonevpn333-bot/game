// GETAWAY! — procedural vehicle models. Lofted superellipse bodies with wheel arches, glass greenhouse
// with pillars, separate doors & bumpers (animate/detach), interiors, and an emissive light rig.
import * as THREE from 'three';
import { mergeParts } from '../world/props.js';
import { plateTexture } from '../world/textures.js';
import { clamp, lerp, smoothstep } from '../core/utils.js';
import { buildRostrModel } from './rostr.js';
import { buildCrease } from './cars2.js';
import { CUSTOM, buildCustomCar } from './glbcars.js';

// light groups: 0 head, 1 tail/brake, 2 left indicator, 3 right indicator, 4 reverse, 5 police red, 6 police blue, 7 always-on (taxi sign, DRL)
const LIGHT_VS = `attribute float lg; attribute vec3 color; varying vec3 vC; varying float vG; void main(){ vC = color; vG = lg; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const LIGHT_FS = `uniform float L[8]; varying vec3 vC; varying float vG; void main(){ int g = int(vG + 0.5); float k = 0.0; for (int i=0;i<8;i++) if (i==g) k = L[i]; gl_FragColor = vec4(vC * (0.18 + k * 3.2), 1.0); }`;
export function makeLightMaterial() { return new THREE.ShaderMaterial({ vertexShader: LIGHT_VS, fragmentShader: LIGHT_FS, uniforms: { L: { value: new Array(8).fill(0) } } }); }

const SHARED = {};
export const KEEP_GEO = new WeakSet(); // geometries shared between cars (never disposed with one car)
function shared() {
  if (SHARED.trim) return SHARED;
  SHARED.trim = new THREE.MeshStandardMaterial({ color: 0x15171a, roughness: 0.7, metalness: 0.2 });
  SHARED.detail = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.45 });
  SHARED.interior = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0.05 });
  // wheels (instanced globally)
  const prof = []; const w = 0.5;
  // tread: circumferential grooves along the contact patch + rounded shoulders + sidewall
  for (let i = 0; i <= 28; i++) { const a = -Math.PI / 2 + (i / 28) * Math.PI; const ax = Math.sin(a); let r0 = 0.72 + 0.28 * Math.cos(a); const inTread = Math.abs(ax) < 0.78; if (inTread && (i % 4 === 1)) r0 -= 0.025; prof.push(new THREE.Vector2(r0, w * ax * 0.95)); }
  const tire = new THREE.LatheGeometry(prof, 40); tire.rotateZ(Math.PI / 2);
  const cap = new THREE.CircleGeometry(0.72, 32); cap.rotateY(Math.PI / 2); cap.translate(-w * 0.9, 0, 0);
  const wall = new THREE.TorusGeometry(0.8, 0.012, 4, 40); wall.rotateY(Math.PI / 2); wall.translate(w * 0.42, 0, 0);
  SHARED.tireGeo = mergeParts([{ geo: tire, c: 0x1c1c1e }, { geo: cap, c: 0x101012 }, { geo: wall, c: 0x3a3a3c }]);
  const base = () => [
    { geo: new THREE.CylinderGeometry(0.72, 0.72, 0.1, 40, 1, true).rotateZ(Math.PI / 2).translate(0.18, 0, 0), c: 0xb8bec4 },
    { geo: new THREE.TorusGeometry(0.71, 0.025, 6, 40).rotateY(Math.PI / 2).translate(0.235, 0, 0), c: 0xe8ecf0 },
    { geo: new THREE.CylinderGeometry(0.64, 0.64, 0.05, 32).rotateZ(Math.PI / 2).translate(-0.06, 0, 0), c: 0x4a4e54 },
    { geo: new THREE.BoxGeometry(0.16, 0.32, 0.24).translate(-0.01, 0.4, 0.2), c: 0xc0392b },
    { geo: new THREE.CylinderGeometry(0.15, 0.17, 0.12, 16).rotateZ(Math.PI / 2).translate(0.25, 0, 0), c: 0xd0d4d8 },
    { geo: new THREE.CylinderGeometry(0.07, 0.07, 0.02, 12).rotateZ(Math.PI / 2).translate(0.315, 0, 0), c: 0x15171a },
  ];
  const spoke = (a, w2, d, len, twist = 0, col = 0xc6ccd2, r0 = 0.15) => { const g = new THREE.BoxGeometry(0.09, len, w2); g.translate(0, r0 + len / 2, 0); if (twist) g.rotateY(twist); g.rotateX(a); g.translate(0.21 + d, 0, 0); return { geo: g, c: col }; };
  const designs = {
    sport6: () => { const p = base(); for (let i = 0; i < 6; i++) p.push(spoke(i / 6 * Math.PI * 2, 0.12, 0, 0.56)); return p; },
    five: () => { const p = base(); for (let i = 0; i < 5; i++) { p.push(spoke(i / 5 * Math.PI * 2, 0.17, 0, 0.56)); p.push(spoke(i / 5 * Math.PI * 2 + 0.06, 0.03, 0.02, 0.5, 0, 0x9aa0a6)); } return p; },
    mesh: () => { const p = base(); for (let i = 0; i < 10; i++) { p.push(spoke(i / 10 * Math.PI * 2, 0.05, 0, 0.56, 0.5, 0x2a2d31)); p.push(spoke(i / 10 * Math.PI * 2, 0.05, 0.01, 0.56, -0.5, 0x2a2d31)); } return p; },
    turbine: () => { const p = base(); for (let i = 0; i < 6; i++) p.push(spoke(i / 6 * Math.PI * 2, 0.2, 0, 0.56, 0.7, 0xe6e8ea)); p.push({ geo: new THREE.CylinderGeometry(0.6, 0.6, 0.03, 32).rotateZ(Math.PI / 2).translate(0.2, 0, 0), c: 0x16181b }); return p; },
    aero: () => { const p = base(); p.push({ geo: new THREE.CylinderGeometry(0.62, 0.62, 0.03, 40).rotateZ(Math.PI / 2).translate(0.2, 0, 0), c: 0xdfe2e5 }); p.push({ geo: new THREE.TorusGeometry(0.66, 0.05, 6, 40).rotateY(Math.PI / 2).translate(0.215, 0, 0), c: 0x1a1c1f }); for (let i = 0; i < 5; i++) p.push(spoke(i / 5 * Math.PI * 2, 0.06, 0.02, 0.5, 0.18, 0x15171a, 0.1)); p.push({ geo: new THREE.CylinderGeometry(0.12, 0.12, 0.05, 20).rotateZ(Math.PI / 2).translate(0.235, 0, 0), c: 0x15171a }); return p; },
    forged: () => { const p = base(); p.push({ geo: new THREE.CylinderGeometry(0.62, 0.62, 0.03, 40).rotateZ(Math.PI / 2).translate(0.12, 0, 0), c: 0x0c0d0f }); p.push({ geo: new THREE.TorusGeometry(0.69, 0.035, 6, 40).rotateY(Math.PI / 2).translate(0.235, 0, 0), c: 0x16181b }); for (let i = 0; i < 10; i++) { p.push(spoke(i / 10 * Math.PI * 2, 0.05, 0.01, 0.52, 0.32, 0x1a1c1f, 0.12)); p.push(spoke(i / 10 * Math.PI * 2 + 0.16, 0.035, 0.0, 0.5, -0.25, 0x141518, 0.12)); } p.push({ geo: new THREE.CylinderGeometry(0.13, 0.13, 0.05, 6).rotateZ(Math.PI / 2).translate(0.24, 0, 0), c: 0x101113 }); return p; },
    multi: () => { const p = base(); p.push({ geo: new THREE.CylinderGeometry(0.62, 0.62, 0.03, 40).rotateZ(Math.PI / 2).translate(0.12, 0, 0), c: 0x0b0c0e }); p.push({ geo: new THREE.TorusGeometry(0.69, 0.03, 6, 40).rotateY(Math.PI / 2).translate(0.235, 0, 0), c: 0x1a1b1e }); for (let i = 0; i < 15; i++) { p.push(spoke(i / 15 * Math.PI * 2, 0.04, 0.01, 0.53, 0.15, 0x1d1f22, 0.12)); p.push(spoke(i / 15 * Math.PI * 2 + 0.12, 0.03, 0.0, 0.5, -0.15, 0x16171a, 0.14)); } p.push({ geo: new THREE.CylinderGeometry(0.14, 0.14, 0.05, 20).rotateZ(Math.PI / 2).translate(0.24, 0, 0), c: 0x2a2c30 }); return p; },
    steel: () => { const p = base(); p.push({ geo: new THREE.CylinderGeometry(0.66, 0.66, 0.04, 32).rotateZ(Math.PI / 2).translate(0.22, 0, 0), c: 0x6d7378 }); for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; p.push({ geo: new THREE.CylinderGeometry(0.06, 0.06, 0.05, 10).rotateZ(Math.PI / 2).translate(0.235, Math.cos(a) * 0.44, Math.sin(a) * 0.44), c: 0x111111 }); } return p; },
  };
  SHARED.rimGeos = {}; for (const k in designs) SHARED.rimGeos[k] = mergeParts(designs[k]());
  SHARED.rimGeo = SHARED.rimGeos.sport6;
  SHARED.tireMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0 });
  SHARED.rimMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.9 });
  return SHARED;
}
export function wheelAssets() { return shared(); }

function lerpStations(st, t) {
  if (t <= st[0][0]) return st[0]; if (t >= st[st.length - 1][0]) return st[st.length - 1];
  for (let i = 0; i < st.length - 1; i++) { const a = st[i], b = st[i + 1]; if (t >= a[0] && t <= b[0]) { const u = smoothstep(0, 1, (t - a[0]) / (b[0] - a[0] || 1)); return [t, lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)]; } }
  return st[st.length - 1];
}
const sgnPow = (v, p) => Math.sign(v) * Math.pow(Math.abs(v), p);

// ---- body loft ----
function loftBody(spec, out) {
  const { L, W } = spec; const st = spec.body; const wh = spec.wheels; const NR = spec.boxy ? 70 : 96, M = spec.facet ? 20 : 30; const n = spec.boxy ? 9 : spec.facet ? 12 : 5;
  const axles = [(wh.f - 0.5) * L, (wh.b - 0.5) * L]; const R = wh.r + 0.07;
  const P = [], groupsIdx = { paint: [], trim: [] }; const info = [];
  for (let i = 0; i <= NR; i++) {
    const t = i / NR; const [, yb0, yt, wf] = lerpStations(st, t); const z = (t - 0.5) * L; const hw = wf * W / 2;
    let yb = yb0; for (const az of axles) { const dz = z - az; if (Math.abs(dz) < R) yb = Math.max(yb, wh.r + Math.sqrt(R * R - dz * dz) * 0.98); }
    yb = Math.min(yb, yt - 0.12);
    const yc = (yb + yt) / 2, hh = (yt - yb) / 2;
    for (let k = 0; k < M; k++) {
      const th = (k / M) * Math.PI * 2; const c = Math.cos(th), s = Math.sin(th);
      const y = yc + hh * sgnPow(s, 2 / n); let x = hw * sgnPow(c, 2 / n); x *= 1 - 0.09 * Math.max(0, (y - yc) / (hh || 1));
      P.push(x, y, z); info.push({ y, yb, yt, t });
    }
  }
  const idx = (i, k) => i * M + (k % M);
  for (let i = 0; i < NR; i++) for (let k = 0; k < M; k++) {
    const a = idx(i, k), b = idx(i, k + 1), c = idx(i + 1, k + 1), d = idx(i + 1, k);
    const ia = info[a]; const yAvg = (info[a].y + info[b].y + info[c].y + info[d].y) / 4; const low = yAvg < ia.yb + (ia.yt - ia.yb) * (spec.boxy ? 0.12 : 0.2);
    const g = low ? groupsIdx.trim : groupsIdx.paint; g.push(a, b, d, b, c, d);
  }
  // caps
  const base = P.length / 3;
  for (const [i, sgn] of [[0, -1], [NR, 1]]) {
    let cx = 0, cy = 0, cz = 0; for (let k = 0; k < M; k++) { cx += P[idx(i, k) * 3]; cy += P[idx(i, k) * 3 + 1]; cz += P[idx(i, k) * 3 + 2]; }
    const ci = P.length / 3; P.push(cx / M, cy / M, cz / M + sgn * 0.02); info.push({ y: cy / M, yb: 0, yt: 1, t: i / NR });
    for (let k = 0; k < M; k++) { if (sgn < 0) groupsIdx.paint.push(ci, idx(i, k + 1), idx(i, k)); else groupsIdx.paint.push(ci, idx(i, k), idx(i, k + 1)); }
  }
  out.bodyP = P; out.bodyGroups = groupsIdx; out.NR = NR; out.M = M; out.bodyN = n;
}
// half-width of the body at (t,y) — for placing parts on the surface
function surfX(spec, t, y) {
  const [, yb, yt, wf] = lerpStations(spec.body, t); const hw = wf * spec.W / 2; const n = spec.boxy ? 9 : spec.facet ? 12 : 5;
  const yc = (yb + yt) / 2, hh = (yt - yb) / 2; const v = clamp((y - yc) / (hh || 1), -0.999, 0.999); const s = Math.pow(Math.abs(v), n / 2); const c = Math.sqrt(Math.max(0, 1 - s * s));
  return hw * Math.pow(c, 2 / n) * (1 - 0.09 * Math.max(0, v));
}
function bodyTop(spec, t) { return lerpStations(spec.body, t)[2]; }

// ---- cabin loft (glass greenhouse with pillars) ----
function loftCabin(spec, out) {
  const c = spec.cabin; const { L, W } = spec; const NR = 44, M = 26, n = spec.boxy ? 7 : spec.facet ? 5 : 3.6;
  const P = [], groups = { paint: [], glass: [] }, info = [];
  const f = (t) => { if (t < c.r0) return Math.pow(clamp((t - c.t0) / (c.r0 - c.t0 || 1), 0, 1), 0.8); if (t > c.r1) return Math.pow(clamp((c.t1 - t) / (c.t1 - c.r1 || 1), 0, 1), 0.85); return 1; };
  for (let i = 0; i <= NR; i++) {
    const t = c.t0 + (c.t1 - c.t0) * (i / NR); const z = (t - 0.5) * L; const fv = Math.max(0.04, f(t)); const top = c.belt + (c.roof - c.belt) * fv; const bot = c.belt - 0.3;
    const yc = (bot + top) / 2, hh = (top - bot) / 2;
    for (let k = 0; k < M; k++) {
      const th = (k / M) * Math.PI * 2; const cc = Math.cos(th), s = Math.sin(th);
      const y = yc + hh * sgnPow(s, 2 / n); const u = clamp((y - c.belt) / (c.roof - c.belt), 0, 1);
      const hw = lerp(c.wb, c.wr, u) * W / 2 * (0.94 + 0.06 * fv); const xn = sgnPow(cc, 2 / n); const x = xn * hw;
      P.push(x, y, z); info.push({ xn: Math.abs(xn), y, f: f(t), t });
    }
  }
  const idx = (i, k) => i * M + (k % M); const bpT = (c.r0 + c.r1) / 2; const bpW = 0.07 / L;
  for (let i = 0; i < NR; i++) for (let k = 0; k < M; k++) {
    const a = idx(i, k), b = idx(i, k + 1), cc = idx(i + 1, k + 1), d = idx(i + 1, k); const vs = [info[a], info[b], info[cc], info[d]];
    const xn = vs.reduce((s, v) => s + v.xn, 0) / 4, y = vs.reduce((s, v) => s + v.y, 0) / 4, fv = Math.min(...vs.map((v) => v.f)), t = vs.reduce((s, v) => s + v.t, 0) / 4;
    let g = 'paint';
    if (y < c.belt + 0.04) g = 'paint';
    else if (xn > (spec.facet ? 0.74 : 0.8)) g = (Math.abs(t - bpT) < bpW && !spec.bus) || (spec.bus && ((t * L) % 1.6 < 0.12)) ? 'paint' : 'glass';
    else if (xn < (spec.facet ? 0.7 : 0.62)) g = fv > 0.995 && !spec.facet ? 'paint' : (spec.facet && fv > 0.995 ? 'glass' : (fv > 0.995 ? 'paint' : 'glass'));
    groups[g].push(a, b, d, b, cc, d);
  }
  out.cabP = P; out.cabGroups = groups;
}

function geoFrom(P, groupLists, order) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  const all = []; let start = 0;
  order.forEach((name, mi) => { const l = groupLists[name] || []; all.push(...l); g.addGroup(start, l.length, mi); start += l.length; });
  g.setIndex(all); g.computeVertexNormals(); return g;
}

// ---- door panels (sampled side patch) ----
function doorGeo(spec, side, t0, t1) {
  const { L } = spec; const NZ = 8, NY = 6; const P = [], I = []; const c = spec.cabin;
  const sill = Math.max(lerpStations(spec.body, (t0 + t1) / 2)[1] + 0.08, spec.wheels.r * 1.2), top = Math.min(c.belt - 0.02, bodyTop(spec, (t0 + t1) / 2) - 0.03);
  for (let i = 0; i <= NZ; i++) for (let j = 0; j <= NY; j++) {
    const t = lerp(t0, t1, i / NZ), y = lerp(sill, top, j / NY); const x = (surfX(spec, t, y) + 0.012) * side; P.push(x, y, (t - 0.5) * L);
  }
  for (let i = 0; i < NZ; i++) for (let j = 0; j < NY; j++) { const a = i * (NY + 1) + j, b = a + 1, cc = a + NY + 2, d = a + NY + 1; if (side > 0) I.push(a, b, d, b, cc, d); else I.push(a, d, b, b, d, cc); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals();
  const hingeZ = (t1 - 0.5) * L; const hingeX = surfX(spec, t1, (sill + top) / 2) * side;
  g.translate(-hingeX, 0, -hingeZ); return { geo: g, hinge: new THREE.Vector3(hingeX, 0, hingeZ) };
}

const B = (w, h, d, x, y, z, c, rot) => { const g = new THREE.BoxGeometry(w, h, d); if (rot) g.applyMatrix4(rot); g.translate(x, y, z); return { geo: g, c }; };
const C = (r1, r2, h, x, y, z, c, seg = 12, rot) => { const g = new THREE.CylinderGeometry(r1, r2, h, seg); if (rot) g.applyMatrix4(rot); g.translate(x, y, z); return { geo: g, c }; };
const RX = (a) => new THREE.Matrix4().makeRotationX(a), RZ = (a) => new THREE.Matrix4().makeRotationZ(a), RY = (a) => new THREE.Matrix4().makeRotationY(a);

export function lightParts(list) { // [{geo, c, g}] -> geometry with color + lg attributes
  const geo = mergeParts(list); const lg = []; let n = 0;
  for (const p of list) { const cnt = (p.geo.index ? p.geo.index.count : p.geo.attributes.position.count); for (let i = 0; i < cnt; i++) lg.push(p.g); n += cnt; }
  geo.setAttribute('lg', new THREE.Float32BufferAttribute(lg, 1)); return geo;
}

// ---------------- main car builder ----------------
export function buildCarModel(spec, paintColor) {
  if (spec._id && CUSTOM[spec._id]) return buildCustomCar(spec, paintColor, spec._id);
  if (spec.rostr) return buildRostrModel(spec, paintColor);
  if (spec.crease) return buildCrease(spec, paintColor);
  const S = shared(); const { L, W } = spec; const out = {};
  const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const paint = new THREE.MeshPhysicalMaterial({ color: paintColor, roughness: 0.32, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.08 });
  if (!SHARED.white) { SHARED.white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); SHARED.white.needsUpdate = true; }
  const glass = new THREE.MeshStandardMaterial({ color: 0x0d1418, roughness: 0.04, metalness: 0.95, transparent: true, opacity: 0.85, map: SHARED.white });
  loftBody(spec, out); loftCabin(spec, out);
  const bodyGeo = geoFrom(out.bodyP, out.bodyGroups, ['paint', 'trim']); const bodyMesh = new THREE.Mesh(bodyGeo, [paint, S.trim]);
  const cabGeo = geoFrom(out.cabP, out.cabGroups, ['paint', 'glass']); const cabMesh = new THREE.Mesh(cabGeo, [paint, glass]);
  for (const m of [bodyMesh, cabMesh]) { m.castShadow = true; m.receiveShadow = true; body.add(m); }
  const c = spec.cabin, wh = spec.wheels; const zf = L / 2, zr = -L / 2; const hw = W / 2;
  const tF = 0.985, tR = 0.012; const fTop = bodyTop(spec, tF), rTop = bodyTop(spec, tR);
  const fBot = lerpStations(spec.body, tF)[1], rBot = lerpStations(spec.body, tR)[1];
  const parts = [], lights = [], interior = [];
  const col = new THREE.Color(paintColor).getHex();
  // underbody & arch liners
  for (const az of [(wh.f - 0.5) * L, (wh.b - 0.5) * L]) for (const s of [-1, 1]) {
    const g = new THREE.CylinderGeometry(wh.r + 0.07, wh.r + 0.07, wh.w * 0.9, 16, 1, true, -Math.PI / 2, Math.PI); g.rotateZ(Math.PI / 2); g.translate(s * (wh.track * hw - wh.w * 0.12), wh.r, az); parts.push({ geo: g, c: 0x08080a });
  }
  // grille & front details
  const gy = fBot + (fTop - fBot) * 0.42, gz = zf - 0.02; const fx = surfX(spec, tF, gy);
  if (spec.grille === 'chrome' || spec.grille === 'bullbar') { parts.push(B(fx * 1.1, (fTop - fBot) * 0.3, 0.06, 0, gy, gz - 0.02, 0x1a1c1f)); parts.push(B(fx * 1.15, 0.04, 0.07, 0, gy + (fTop - fBot) * 0.16, gz - 0.01, 0xd8dde2)); }
  else if (spec.grille === 'muscle') { parts.push(B(fx * 1.5, (fTop - fBot) * 0.36, 0.06, 0, gy, gz - 0.02, 0x0e0f10)); for (let i = -3; i <= 3; i++) parts.push(B(0.03, (fTop - fBot) * 0.32, 0.07, i * fx * 0.2, gy, gz - 0.01, 0x9aa0a6)); }
  else if (spec.grille === 'truck') { parts.push(B(fx * 1.2, (fTop - fBot) * 0.5, 0.07, 0, gy + 0.05, gz - 0.02, 0xbfc5ca)); for (let i = 0; i < 5; i++) parts.push(B(fx * 1.15, 0.035, 0.08, 0, gy - 0.15 + i * 0.09, gz - 0.01, 0x222428)); }
  else if (spec.grille === 'ev') {}
  else if (spec.grille === 'sport') { parts.push(B(fx * 1.2, 0.12, 0.05, 0, fBot + 0.12, gz - 0.03, 0x0a0a0b)); parts.push(B(fx * 0.6, 0.08, 0.05, 0, gy + 0.05, gz - 0.02, 0x0a0a0b)); }
  else parts.push(B(fx * 0.9, (fTop - fBot) * 0.2, 0.05, 0, gy, gz - 0.02, 0x1a1c1f));
  // headlights / taillights
  const hy = fBot + (fTop - fBot) * (spec.boxy ? 0.5 : 0.66); const hx = surfX(spec, 0.97, hy) * 0.72;
  if (spec.lights === 'bar') {
    const fy = fBot + (fTop - fBot) * 0.7; const fw = surfX(spec, 0.999, fy) * 2 * 0.98;
    lights.push({ geo: new THREE.BoxGeometry(fw, 0.035, 0.05).translate(0, fy, zf + 0.012), c: 0xf4fbff, g: 0 });
    lights.push({ geo: new THREE.BoxGeometry(fw * 0.98, 0.012, 0.05).translate(0, fy - 0.045, zf + 0.012), c: 0xf4fbff, g: 7 });
    const ry = rTop - 0.12; const rw = surfX(spec, 0.001, ry) * 2 * 0.97;
    lights.push({ geo: new THREE.BoxGeometry(rw, 0.05, 0.05).translate(0, ry, zr - 0.012), c: 0xff140c, g: 1 });
    for (const s of [-1, 1]) { lights.push({ geo: new THREE.BoxGeometry(0.14, 0.03, 0.05).translate(s * rw * 0.42, ry - 0.07, zr + 0.03), c: 0xffffff, g: 4 }); lights.push({ geo: new THREE.BoxGeometry(0.18, 0.025, 0.05).translate(s * fw * 0.4, fy - 0.1, zf - 0.03), c: 0xffa21a, g: s > 0 ? 2 : 3 }); lights.push({ geo: new THREE.BoxGeometry(0.18, 0.03, 0.05).translate(s * rw * 0.3, ry - 0.07, zr + 0.03), c: 0xffa21a, g: s > 0 ? 2 : 3 }); }
    // dark front intake band + rear diffuser with four thruster nozzles
    parts.push(B(fw, (fTop - fBot) * 0.5, 0.05, 0, fBot + (fTop - fBot) * 0.3, zf + 0.005, 0x0b0d10));
    parts.push(B(rw * 0.9, 0.36, 0.08, 0, rBot + 0.22, zr - 0.02, 0x0b0c0e));
    for (let i = 0; i < 4; i++) { const nxp = (i - 1.5) * 0.3; const g = new THREE.CylinderGeometry(0.07, 0.085, 0.16, 14, 1, true); g.rotateX(Math.PI / 2); g.translate(nxp, rBot + 0.3, zr - 0.06); parts.push({ geo: g, c: 0xb08a5a }); const g2 = new THREE.CircleGeometry(0.06, 12); g2.rotateY(Math.PI); g2.translate(nxp, rBot + 0.3, zr - 0.02); parts.push({ geo: g2, c: 0x050505 }); }
    for (const s of [-1, 1]) parts.push(B(0.04, 0.03, L * 0.55, s * (surfX(spec, 0.5, 0.42) + 0.01), 0.42, 0, 0x0b0c0e)); // side skirts
  }
  for (const s of [-1, 1]) {
    if (spec.lights === 'bar') break;
    if (spec.lights === 'round') { const g = new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16); g.rotateX(Math.PI / 2); g.translate(s * hx, hy, zf - 0.03 - 0.02); lights.push({ geo: g, c: 0xfffbe8, g: 0 }); }
    else { lights.push({ geo: new THREE.BoxGeometry(spec.lights === 'slim' ? 0.42 : 0.38, spec.lights === 'slim' ? 0.08 : 0.16, 0.08).translate(s * hx, hy, zf - 0.06 - (spec.lights === 'slim' ? 0.06 : 0)), c: 0xfffbe8, g: 0 }); }
    lights.push({ geo: new THREE.BoxGeometry(0.12, 0.05, 0.06).translate(s * (hx + 0.24), hy - 0.06, zf - 0.08), c: 0xffa21a, g: s > 0 ? 2 : 3 });
    const ty = rBot + (rTop - rBot) * (spec.boxy ? 0.3 : 0.7); const tx = surfX(spec, 0.03, ty) * 0.74;
    lights.push({ geo: new THREE.BoxGeometry(spec.boxy ? 0.18 : 0.42, spec.boxy ? 0.32 : 0.11, 0.07).translate(s * tx, ty, zr + 0.05), c: 0xff1a12, g: 1 });
    lights.push({ geo: new THREE.BoxGeometry(0.1, 0.06, 0.06).translate(s * (tx - (spec.boxy ? 0.16 : 0.28)), ty - 0.02, zr + 0.06), c: 0xffffff, g: 4 });
    lights.push({ geo: new THREE.BoxGeometry(0.1, 0.06, 0.06).translate(s * (tx + 0.02), ty - (spec.boxy ? 0.24 : 0.1), zr + 0.06), c: 0xffa21a, g: s > 0 ? 2 : 3 });
  }
  // license plates
  if (spec.grille !== 'ev') parts.push(B(0.52, 0.13, 0.03, 0, fBot + 0.16, zf + 0.02, 0xf0f0e6)); parts.push(B(0.52, 0.13, 0.03, 0, rBot + 0.25, zr - 0.02, 0xf0f0e6));
  // mirrors, door handles
  const mt = c.t1 - (c.t1 - c.r1) * 0.7; const mz = (mt - 0.5) * L; const my = c.belt + 0.08; const mx = c.wb * hw + 0.1;
  for (const s of [-1, 1]) { parts.push(B(0.2, 0.12, 0.1, s * mx, my, mz, col)); parts.push(B(0.08, 0.04, 0.06, s * (mx - 0.1), my - 0.02, mz + 0.02, 0x111111)); }
  // exhausts
  const ex = spec.engine === 'muscle' || spec.engine === 'super' || spec.engine === 'sports' ? [-0.35, 0.35] : [-0.4];
  if (spec.engine !== 'electric') for (const x of ex) { const g = new THREE.CylinderGeometry(0.05, 0.055, 0.25, 10); g.rotateX(Math.PI / 2); g.translate(x * hw * 1.4, rBot + 0.08, zr - 0.04); parts.push({ geo: g, c: 0xc9ced3 }); }
  // spoilers
  if (spec.spoiler === 'bigwing') { const y = rTop + 0.38, z = zr + 0.18; parts.push(B(W * 1.02, 0.05, 0.5, 0, y, z, col, RX(0.08))); for (const s of [-1, 1]) { parts.push(B(0.04, 0.16, 0.42, s * W * 0.51, y - 0.02, z, col)); parts.push(B(0.04, 0.4, 0.1, s * W * 0.22, y - 0.2, z + 0.05, 0x111111, RX(0.3))); } }
  else if (spec.spoiler === 'wing') { const y = rTop + 0.28, z = zr + 0.32; parts.push(B(W * 0.9, 0.04, 0.32, 0, y, z, col)); for (const s of [-1, 1]) parts.push(B(0.05, 0.3, 0.12, s * W * 0.3, y - 0.15, z, 0x111111)); }
  else if (spec.spoiler === 'lip') parts.push(B(W * 0.75, 0.035, 0.16, 0, rTop + 0.02, zr + 0.2, col, RX(-0.25)));
  else if (spec.spoiler === 'duck') parts.push(B(W * 0.8, 0.05, 0.22, 0, rTop + 0.03, zr + 0.15, col, RX(-0.3)));
  // stripes (muscle): ribbon over hood / roof / trunk centerline
  if (spec.stripes) {
    for (const off of [-0.17, 0.17]) for (let i = 0; i < 24; i++) {
      const t0 = i / 24, t1 = (i + 1) / 24; let y0 = bodyTop(spec, t0), y1 = bodyTop(spec, t1);
      const inCab = (t) => t > c.t0 + 0.02 && t < c.t1 - 0.02;
      if (inCab(t0) || inCab(t1)) continue;
      const z0 = (t0 - 0.5) * L, z1 = (t1 - 0.5) * L; const len = Math.hypot(z1 - z0, y1 - y0); const a = Math.atan2(y1 - y0, z1 - z0);
      parts.push(B(0.16, 0.012, len + 0.01, off, (y0 + y1) / 2 + 0.004, (z0 + z1) / 2, 0xf2f2f2, RX(-a)));
    }
    parts.push(B(0.16, 0.012, (c.r1 - c.r0) * L, -0.17, c.roof + 0.004, ((c.r0 + c.r1) / 2 - 0.5) * L, 0xf2f2f2)); parts.push(B(0.16, 0.012, (c.r1 - c.r0) * L, 0.17, c.roof + 0.004, ((c.r0 + c.r1) / 2 - 0.5) * L, 0xf2f2f2));
  }
  const roofZ = ((c.r0 + c.r1) / 2 - 0.5) * L;
  if (spec.roofRack) for (const s of [-1, 1]) { parts.push(B(0.05, 0.06, (c.r1 - c.r0) * L * 0.9, s * c.wr * hw * 0.8, c.roof + 0.05, roofZ, 0x1a1a1a)); }
  if (spec.taxi) { parts.push(B(0.7, 0.24, 0.3, 0, c.roof + 0.12, roofZ, 0xf4c20d)); lights.push({ geo: new THREE.BoxGeometry(0.6, 0.16, 0.31).translate(0, c.roof + 0.13, roofZ), c: 0xfff6c0, g: 7 }); for (let i = 0; i < 14; i++) for (const s of [-1, 1]) parts.push(B(0.012, 0.06, 0.12, s * (surfX(spec, 0.5, c.belt - 0.12) + 0.006), c.belt - 0.12 - (i % 2) * 0.06, (i - 7) * 0.12, i % 2 ? 0x111111 : 0xf2f2f2)); }
  if (spec.police) {
    parts.push(B(1.15, 0.08, 0.3, 0, c.roof + 0.04, roofZ + 0.1, 0x1a1a1a));
    lights.push({ geo: new THREE.BoxGeometry(0.5, 0.12, 0.26).translate(-0.3, c.roof + 0.13, roofZ + 0.1), c: 0x2a6bff, g: 6 }); lights.push({ geo: new THREE.BoxGeometry(0.5, 0.12, 0.26).translate(0.3, c.roof + 0.13, roofZ + 0.1), c: 0xff2a2a, g: 5 });
    lights.push({ geo: new THREE.BoxGeometry(0.16, 0.06, 0.05).translate(-0.25, gy + 0.08, zf + 0.0), c: 0x2a6bff, g: 6 }); lights.push({ geo: new THREE.BoxGeometry(0.16, 0.06, 0.05).translate(0.25, gy + 0.08, zf + 0.0), c: 0xff2a2a, g: 5 });
    if (spec.grille === 'bullbar') { parts.push(B(fx * 1.3, 0.06, 0.06, 0, fBot + 0.45, zf + 0.12, 0x111111)); parts.push(B(fx * 1.3, 0.06, 0.06, 0, fBot + 0.15, zf + 0.12, 0x111111)); for (const s of [-1, 1]) parts.push(B(0.06, 0.45, 0.06, s * fx * 0.45, fBot + 0.3, zf + 0.12, 0x111111)); }
    parts.push(C(0.008, 0.008, 0.9, -0.5, c.roof + 0.4, roofZ - 0.6, 0x111111, 4));
  }
  if (spec.bed) parts.push(B(W * 0.82, 0.04, (c.t0 - 0.03) * L, 0, 0.98, ((c.t0 - 0.03) / 2 - 0.5) * L + 0.05, 0x1d1f22));
  if (spec.cargoBox) { for (let i = 0; i < 9; i++) for (const s of [-1, 1]) parts.push(B(0.03, 2.6, 0.06, s * (surfX(spec, 0.35, 2) + 0.015), 2.05, (0.03 + i * 0.08 - 0.5) * L, 0xd5d8dc)); parts.push(B(W * 0.9, 2.5, 0.03, 0, 2.0, zr - 0.01, 0xcfd3d7)); parts.push(B(0.03, 2.5, 0.05, 0, 2.0, zr - 0.02, 0x555555)); }
  if (spec.armoredPlates) { for (let i = 0; i < 6; i++) for (const s of [-1, 1]) parts.push(B(0.04, 0.05, 3.6, s * (surfX(spec, 0.35, 1) + 0.02), 0.95 + i * 0.32, (0.33 - 0.5) * L, 0x3a4048)); for (const s of [-1, 1]) parts.push(B(0.04, 0.3, 0.5, s * (surfX(spec, 0.4, 2) + 0.02), 2.0, (0.4 - 0.5) * L, 0x0d1418)); }
  if (spec.bus) { lights.push({ geo: new THREE.BoxGeometry(1.6, 0.25, 0.05).translate(0, c.roof - 0.25, zf + 0.01), c: 0xffb000, g: 7 }); for (const s of [1]) parts.push(B(0.04, 1.9, 1.2, s * (hw + 0.005), 1.4, zf - 1.4, 0x1a2a33)); }
  // interior (visible through glass)
  const seatY = Math.max(0.45, c.belt - 0.55); const seatRows = spec.bus ? 0 : (spec.cabin.r1 - spec.cabin.r0) * L > 1.3 ? 2 : 1; const dashZ = ((c.r1 + (c.t1 - c.r1) * 0.2) - 0.5) * L;
  for (let r = 0; r < seatRows; r++) for (const s of [-1, 1]) { const z = dashZ - 0.95 - r * 0.85; interior.push(B(0.5, 0.12, 0.5, s * 0.38 * W / 1.9, seatY, z, 0x2b2b2e)); interior.push(B(0.5, 0.6, 0.12, s * 0.38 * W / 1.9, seatY + 0.32, z - 0.25, 0x2b2b2e, RX(-0.15))); }
  interior.push(B(W * 0.85, 0.22, 0.4, 0, c.belt - 0.08, dashZ, 0x1d1e20));
  const sw = new THREE.TorusGeometry(0.17, 0.025, 6, 16); sw.rotateX(-0.5); sw.translate(0.38 * W / 1.9, c.belt + 0.03, dashZ - 0.35); interior.push({ geo: sw, c: 0x111111 });
  detailPass(spec, parts, lights, interior, col, { zf, zr, fTop, fBot, rTop, rBot, hw, c, wh, dashZ, seatY });
  // finalize meshes
  const detail = new THREE.Mesh(mergeParts(parts), S.detail); detail.castShadow = true; body.add(detail);
  const inter = new THREE.Mesh(mergeParts(interior), S.interior); body.add(inter);
  const lmat = makeLightMaterial(); const lmesh = new THREE.Mesh(lightParts(lights), lmat); body.add(lmesh);
  if (spec.thrusters) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.125), new THREE.MeshStandardMaterial({ map: plateTexture('ROSTR'), roughness: 0.4 })); pl.rotation.y = Math.PI; pl.position.set(0, rTop - 0.215, zr - 0.05); body.add(pl); }
  // bumpers (detachable)
  const bumpers = [];
  for (const [t, z, s] of [[0.985, zf, 1], [0.015, zr, -1]]) {
    const yb2 = lerpStations(spec.body, t)[1]; const w2 = surfX(spec, t, yb2 + 0.2) * 2 * 0.97;
    const g = mergeParts([B(w2, 0.24, 0.16, 0, 0, 0, spec.boxy || spec.grille === 'truck' || spec.grille === 'chrome' || spec.grille === 'plain' || spec.grille === 'ev' ? 0x0b0d10 : col), B(w2 * 0.96, 0.06, 0.18, 0, -0.1, 0, 0x111214)]);
    const m = new THREE.Mesh(g, S.detail); m.position.set(0, yb2 + (spec.grille === 'ev' ? 0.04 : 0.14), z - s * (spec.grille === 'ev' ? 0.06 : 0.03)); m.castShadow = true; body.add(m); bumpers.push(m);
  }
  // doors
  const doors = [];
  if (!spec.bus) {
    const dt0 = Math.max(c.t0 + 0.02, c.r0 - 0.04 + (spec.boxy ? 0.02 : 0)), dt1 = Math.min(c.t1 - 0.04, (c.r1 + c.t1) / 2 - 0.02);
    for (const side of [1, -1]) {
      const { geo, hinge } = doorGeo(spec, side, dt0, dt1); const pivot = new THREE.Group(); pivot.position.copy(hinge);
      const dm = new THREE.Mesh(geo, spec.police ? new THREE.MeshPhysicalMaterial({ color: 0xf2f2f2, roughness: 0.3, metalness: 0.4, clearcoat: 1 }) : paint); dm.castShadow = true; pivot.add(dm);
      if (spec.police) { const strip = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.1, (dt1 - dt0) * L * 0.95), new THREE.MeshBasicMaterial({ color: 0xd4af37 })); strip.position.set(side * 0.02 - 0 + (surfX(spec, (dt0 + dt1) / 2, c.belt - 0.3) - Math.abs(hinge.x)) * side + side * 0.012, c.belt - 0.3, -(dt1 - dt0) * L / 2); pivot.add(strip); }
      body.add(pivot); doors.push({ pivot, side, open: 0, target: 0, attached: true });
    }
  }
  // front/rear wheel positions (local)
  const wheels = [];
  for (const [az, front] of [[(wh.f - 0.5) * L, true], [(wh.b - 0.5) * L, false]]) for (const s of [1, -1]) wheels.push({ x: s * wh.track * hw, z: az, front, side: s, r: wh.r, w: wh.w, spin: 0, comp: 0, lastP: null, skid: false });
  return { root, body, bodyMesh, cabMesh, paint, glass, detail, lights: lmesh, lightU: lmat.uniforms.L.value, bumpers, doors, wheels, interior: inter, origBody: bodyGeo.attributes.position.array.slice(), origCab: cabGeo.attributes.position.array.slice() };
}

// ---------------- motorcycle ----------------
export function buildBikeModel(spec, paintColor) {
  const S = shared(); const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const paint = new THREE.MeshPhysicalMaterial({ color: paintColor, roughness: 0.3, metalness: 0.5, clearcoat: 1 });
  const col = new THREE.Color(paintColor).getHex(); const wh = spec.wheels; const L = spec.L;
  const zf = (wh.f - 0.5) * L, zr = (wh.b - 0.5) * L;
  const parts = [];
  const tank = new THREE.SphereGeometry(0.28, 16, 10); tank.scale(0.9, 0.7, 1.5); tank.translate(0, 0.98, 0.18);
  const fair = new THREE.SphereGeometry(0.3, 16, 10); fair.scale(1, 1.1, 1.3); fair.translate(0, 1.0, 0.62);
  const tail = new THREE.ConeGeometry(0.16, 0.6, 10); tail.rotateX(-Math.PI / 2); tail.translate(0, 0.92, -0.62);
  const pm = new THREE.Mesh(mergeParts([{ geo: tank, c: col }, { geo: fair, c: col }, { geo: tail, c: col }]), new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.5, clearcoat: 1 })); pm.castShadow = true; body.add(pm);
  parts.push(B(0.26, 0.1, 0.62, 0, 0.92, -0.22, 0x151515)); // seat
  parts.push(B(0.2, 0.32, 0.55, 0, 0.55, 0.0, 0x2a2d31)); // engine block
  parts.push(C(0.05, 0.05, 0.75, 0, 0.62, zf - 0.08, 0xb8bec4, 8, RX(0.42))); // fork
  parts.push(B(0.06, 0.06, 0.9, 0, 0.55, zr / 2, 0x2a2d31, RX(-0.1))); // swingarm
  parts.push(B(0.62, 0.04, 0.04, 0, 1.12, 0.48, 0x1a1a1a)); // handlebar
  parts.push(C(0.06, 0.07, 0.6, 0.16, 0.45, -0.45, 0xc9ced3, 10, RX(Math.PI / 2 - 0.25)));
  const ws = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.02), new THREE.MeshStandardMaterial({ color: 0x223344, transparent: true, opacity: 0.6, roughness: 0.05, metalness: 0.8 })); ws.position.set(0, 1.25, 0.74); ws.rotation.x = -0.6; body.add(ws);
  const detail = new THREE.Mesh(mergeParts(parts), S.detail); detail.castShadow = true; body.add(detail);
  const lights = [{ geo: new THREE.CylinderGeometry(0.08, 0.08, 0.05, 12).rotateX(Math.PI / 2).translate(0, 1.0, 0.9), c: 0xfffbe8, g: 0 }, { geo: new THREE.BoxGeometry(0.16, 0.05, 0.04).translate(0, 0.92, -0.92), c: 0xff1a12, g: 1 }];
  if (spec.police) { lights.push({ geo: new THREE.BoxGeometry(0.1, 0.08, 0.06).translate(-0.18, 1.0, 0.82), c: 0x2a6bff, g: 6 }, { geo: new THREE.BoxGeometry(0.1, 0.08, 0.06).translate(0.18, 1.0, 0.82), c: 0xff2a2a, g: 5 }); }
  const lmat = makeLightMaterial(); body.add(new THREE.Mesh(lightParts(lights), lmat));
  const wheels = [{ x: 0, z: zf, front: true, side: 1, r: wh.r, w: wh.w, spin: 0, comp: 0 }, { x: 0, z: zr, front: false, side: 1, r: wh.r, w: wh.w * 1.3, spin: 0, comp: 0 }];
  return { root, body, paint, glass: null, detail, lightU: lmat.uniforms.L.value, bumpers: [], doors: [], wheels, bike: true };
}

export const RIM_OF = { rostr: 'aero', rivolta: 'forged', strada: 'multi', super: 'mesh', saetta: 'five', interceptor: 'five', muscle: 'sport6', sedan: 'five', taxi: 'steel', police: 'steel', hatch: 'sport6', suv: 'five', pickup: 'steel', van: 'steel', truck: 'steel', bus: 'steel', armored: 'steel', moto: 'sport6', policebike: 'sport6' };
function topY(spec, t, x) { const [, yb, yt, wf] = lerpStations(spec.body, t); const a = wf * spec.W / 2; const n = spec.boxy ? 9 : spec.facet ? 12 : 5; const yc = (yb + yt) / 2, hh = (yt - yb) / 2; const u = Math.min(0.999, Math.abs(x) / a); return yc + hh * Math.pow(1 - Math.pow(u, n), 1 / n); }
// thin ribbon following points (seams, chrome trims, light strips)
function ribbon(pts, normals, w, col) {
  const P = [], I = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], n = normals[i]; const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const T = new THREE.Vector3().subVectors(b, a).normalize(); const S = new THREE.Vector3().crossVectors(T, n).normalize().multiplyScalar(w / 2);
    const q = p.clone().addScaledVector(n, 0.005); P.push(q.x + S.x, q.y + S.y, q.z + S.z, q.x - S.x, q.y - S.y, q.z - S.z);
    if (i) { const k = i * 2; I.push(k - 2, k - 1, k, k - 1, k + 1, k, k - 2, k, k - 1, k - 1, k, k + 1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setIndex(I); g.computeVertexNormals(); return { geo: g, c: col };
}
function detailPass(spec, parts, lights, interior, col, k) {
  if (spec.bike) return;
  const { L, W } = spec; const { zf, zr, fTop, fBot, rTop, rBot, hw, c, wh } = k; const Z = (t) => (t - 0.5) * L;
  const SEAM = 0x070708, CHROME = 0xd9dee3, DARK = 0x111214;
  const sport = ['Sports', 'Super', 'Muscle', 'Hyper EV', 'Police'].includes(spec.cls) && !spec.boxy;
  const sill = (t) => Math.max(lerpStations(spec.body, t)[1] + 0.06, wh.r * 1.15);
  const sidePt = (t, y, side) => new THREE.Vector3(side * surfX(spec, t, y), y, Z(t));
  const N = (side) => new THREE.Vector3(side, 0, 0); const UP = new THREE.Vector3(0, 1, 0);
  const dt0 = Math.max(c.t0 + 0.02, c.r0 - 0.04), dt1 = Math.min(c.t1 - 0.04, (c.r1 + c.t1) / 2 - 0.02);
  for (const side of [1, -1]) {
    // door seams (vertical) + sill line + shoulder crease
    for (const t of spec.bus ? [] : [dt0, dt1, (dt0 + dt1) / 2 + (spec.cabin.r1 - spec.cabin.r0 > 0.3 ? 0 : 99)]) { if (t > 1) continue; const pts = [], ns = []; for (let j = 0; j <= 8; j++) { const y = lerp(sill(t), Math.min(c.belt - 0.03, bodyTop(spec, t) - 0.04), j / 8); pts.push(sidePt(t, y, side)); ns.push(N(side)); } parts.push(ribbon(pts, ns, 0.012, SEAM)); }
    { const pts = [], ns = []; for (let j = 0; j <= 24; j++) { const t = lerp(0.12, 0.9, j / 24); const y = sill(t) + 0.02; pts.push(sidePt(t, y, side)); ns.push(N(side)); } parts.push(ribbon(pts, ns, 0.03, DARK)); }
    if (!spec.boxy) { const pts = [], ns = []; for (let j = 0; j <= 24; j++) { const t = lerp(0.08, 0.95, j / 24); const yt = bodyTop(spec, t); const yb = lerpStations(spec.body, t)[1]; const y = yb + (yt - yb) * 0.72; pts.push(sidePt(t, y, side)); ns.push(N(side)); } parts.push(ribbon(pts, ns, 0.008, 0x000000)); }
    // chrome window trim along the beltline
    { const pts = [], ns = []; for (let j = 0; j <= 20; j++) { const t = lerp(c.r0 - 0.01, c.r1 + 0.01, j / 20); const y = c.belt + 0.035; pts.push(new THREE.Vector3(side * (c.wb * W / 2 + 0.006), y, Z(t))); ns.push(N(side)); } parts.push(ribbon(pts, ns, 0.022, sport ? DARK : CHROME)); }
    // door handle
    const ht = dt1 - 0.035, hy = Math.min(c.belt - 0.1, bodyTop(spec, ht) - 0.12); const hx = surfX(spec, ht, hy) + 0.012;
    parts.push({ geo: new THREE.BoxGeometry(0.03, 0.035, 0.2).translate(side * hx, hy, Z(ht)), c: sport ? DARK : CHROME });
    // side mirror: arm + glass
    const mt = c.t1 - (c.t1 - c.r1) * 0.7; const mx = c.wb * hw + 0.1;
    parts.push({ geo: new THREE.BoxGeometry(0.1, 0.03, 0.05).translate(side * (mx - 0.06), c.belt + 0.04, Z(mt) + 0.02), c: DARK });
    parts.push({ geo: new THREE.BoxGeometry(0.16, 0.09, 0.01).translate(side * mx, c.belt + 0.08, Z(mt) - 0.055), c: 0x9fb4c4 });
    // side marker / skirts
    if (sport) parts.push({ geo: new THREE.BoxGeometry(0.05, 0.07, L * 0.5).translate(side * (surfX(spec, 0.5, sill(0.5)) + 0.01), sill(0.5) - 0.04, 0), c: DARK });
    lights.push({ geo: new THREE.BoxGeometry(0.02, 0.03, 0.08).translate(side * (surfX(spec, 0.9, fBot + 0.25) + 0.008), fBot + 0.25, Z(0.9)), c: 0xffa21a, g: side > 0 ? 2 : 3 });
    // fog lights
    if (!sport && !spec.boxy) lights.push({ geo: new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12).rotateX(Math.PI / 2).translate(side * surfX(spec, 0.99, fBot + 0.14) * 0.72, fBot + 0.14, zf - 0.01), c: 0xfff4d0, g: 0 });
    // headlight projectors + DRL strip
    if (spec.lights !== 'bar') {
      const hy2 = fBot + (fTop - fBot) * (spec.boxy ? 0.5 : 0.66); const hx2 = surfX(spec, 0.97, hy2) * 0.72;
      parts.push({ geo: new THREE.BoxGeometry(0.46, 0.17, 0.05).translate(side * hx2, hy2, zf - 0.09), c: 0x1b1e22 });
      for (const o of [-0.1, 0.1]) lights.push({ geo: new THREE.CylinderGeometry(0.045, 0.045, 0.03, 14).rotateX(Math.PI / 2).translate(side * hx2 + o, hy2 - 0.01, zf - 0.04), c: 0xffffff, g: 0 });
      lights.push({ geo: new THREE.BoxGeometry(0.4, 0.018, 0.03).translate(side * hx2, hy2 + 0.065, zf - 0.04), c: 0xeaf6ff, g: 7 });
    }
  }
  // hood + trunk seams across the top, front bumper crease
  const across = (t, w, colr) => { const pts = [], ns = []; const a = lerpStations(spec.body, t)[3] * W / 2 * 0.9; for (let j = 0; j <= 16; j++) { const x = lerp(-a, a, j / 16); pts.push(new THREE.Vector3(x, topY(spec, t, x), Z(t))); ns.push(UP); } parts.push(ribbon(pts, ns, w, colr)); };
  if (!spec.boxy) { across(Math.min(0.98, c.t1 + 0.012), 0.012, SEAM); across(0.95, 0.01, SEAM); across(Math.max(0.03, c.t0 - 0.02), 0.012, SEAM); }
  // windshield wipers
  for (const o of [-0.35, 0.25]) parts.push({ geo: new THREE.BoxGeometry(0.55, 0.015, 0.02).translate(o * W * 0.5, c.belt + 0.06, Z(c.t1) - 0.08), c: DARK });
  // roof antenna fin + badges + fuel cap
  if (!spec.boxy) parts.push({ geo: new THREE.BoxGeometry(0.05, 0.06, 0.16).translate(0, c.roof + 0.03, Z(c.r0) + 0.05), c: DARK });
  parts.push({ geo: new THREE.CylinderGeometry(0.05, 0.05, 0.01, 16).rotateX(Math.PI / 2).translate(0, fBot + (fTop - fBot) * 0.62, zf + 0.004), c: CHROME });
  parts.push({ geo: new THREE.CylinderGeometry(0.04, 0.04, 0.01, 16).rotateX(Math.PI / 2).translate(0, rBot + (rTop - rBot) * 0.55, zr - 0.004), c: CHROME });
  parts.push({ geo: new THREE.CylinderGeometry(0.07, 0.07, 0.01, 16).rotateZ(Math.PI / 2).translate(surfX(spec, 0.2, c.belt - 0.15) + 0.006, c.belt - 0.15, Z(0.2)), c: SEAM });
  if (sport) {
    parts.push({ geo: new THREE.BoxGeometry(W * 0.86, 0.025, 0.28).translate(0, fBot + 0.02, zf - 0.05), c: DARK }); // splitter
    for (let i = -2; i <= 2; i++) parts.push({ geo: new THREE.BoxGeometry(0.02, 0.16, 0.4).translate(i * W * 0.14, rBot + 0.06, zr + 0.2), c: DARK }); // diffuser fins
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) { const t = 0.8 + i * 0.012; parts.push({ geo: new THREE.BoxGeometry(0.22, 0.012, 0.025).translate(sx * W * 0.18, topY(spec, t, sx * W * 0.18) + 0.006, Z(t)), c: DARK }); } // hood vents
    if (spec.grille === 'sport') for (let gx = -4; gx <= 4; gx++) for (let gyi = 0; gyi < 2; gyi++) parts.push({ geo: new THREE.BoxGeometry(0.05, 0.03, 0.02).translate(gx * 0.07 + (gyi % 2) * 0.035, fBot + 0.1 + gyi * 0.04, zf - 0.01), c: 0x2a2d31 });
  }
  if (!spec.boxy) lights.push({ geo: new THREE.BoxGeometry(W * 0.5, 0.02, 0.02).translate(0, rTop - 0.05, zr + 0.06), c: 0xff1a12, g: 1 }); // third brake light bar
  if (spec.thrusters) {
    for (const side of [1, -1]) {
      const t = 0.69, yI = sill(t) + (c.belt - sill(t)) * 0.3; const x = side * (surfX(spec, t, yI) + 0.004);
      const slot = new THREE.BoxGeometry(0.02, 0.07, 0.32); slot.rotateX(0.32); slot.translate(x, yI, Z(t)); parts.push({ geo: slot, c: 0x08090b });
      const lip = new THREE.BoxGeometry(0.024, 0.01, 0.32); lip.rotateX(0.32); lip.translate(x, yI + 0.04, Z(t)); parts.push({ geo: lip, c: 0xb9bdc3 });
      parts.push({ geo: new THREE.CylinderGeometry(0.06, 0.085, 0.14, 14).translate(side * hw * 0.86, 0.3, Z(0.12)), c: 0x3a3c40 });
    }
    for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 0.3; const cone = new THREE.CylinderGeometry(0.075, 0.1, 0.12, 14, 1, true); cone.rotateX(Math.PI / 2); cone.translate(x, rBot + 0.1, zr - 0.02); parts.push({ geo: cone, c: 0x2c2e31 }); parts.push({ geo: new THREE.CircleGeometry(0.07, 12).rotateY(Math.PI).translate(x, rBot + 0.1, zr + 0.03), c: 0x050505 }); }
    parts.push({ geo: new THREE.BoxGeometry(W * 0.8, 0.02, 0.35).translate(0, rBot + 0.2, zr + 0.12), c: 0x0b0c0e });
  }
  // interior: headrests, dash screen, console, shifter, wheel spokes
  const dz = k.dashZ, sy = k.seatY;
  for (const s2 of [-1, 1]) interior.push({ geo: new THREE.BoxGeometry(0.24, 0.16, 0.1).translate(s2 * 0.38 * W / 1.9, sy + 0.72, dz - 0.95 - 0.33), c: 0x26262a });
  interior.push({ geo: new THREE.BoxGeometry(0.16, 0.18, 0.5).translate(0, sy + 0.05, dz - 0.6), c: 0x1a1b1d });
  interior.push({ geo: new THREE.CylinderGeometry(0.015, 0.015, 0.16, 6).translate(0, sy + 0.2, dz - 0.55), c: 0x888888 });
  for (let i = 0; i < 3; i++) { const g = new THREE.BoxGeometry(0.02, 0.15, 0.02); g.translate(0, 0.075, 0); g.rotateZ(i * 2.1); g.rotateX(-0.5); g.translate(0.38 * W / 1.9, c.belt + 0.03, dz - 0.35); interior.push({ geo: g, c: 0x222222 }); }
  lights.push({ geo: new THREE.BoxGeometry(0.3, 0.12, 0.01).translate(0.05, c.belt + 0.06, dz - 0.21), c: 0x3aa0ff, g: 7 });
}

