// Procedural stylized humanoid: one SkinnedMesh per character, built from
// primitives with blended joint weights, expressive face bones and outfits.
import * as THREE from 'three';
import { rng } from '../core/util.js';

export const BONES = ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'eyeL', 'eyeR', 'browL', 'browR',
  'shoulderL', 'armL', 'foreL', 'handL', 'shoulderR', 'armR', 'foreR', 'handR',
  'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR', 'hair1', 'hair2'];
export const B = Object.fromEntries(BONES.map((n, i) => [n, i]));
const PARENT = { root: null, hips: 'root', spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', jaw: 'head', eyeL: 'head', eyeR: 'head', browL: 'head', browR: 'head',
  shoulderL: 'chest', armL: 'shoulderL', foreL: 'armL', handL: 'foreL', shoulderR: 'chest', armR: 'shoulderR', foreR: 'armR', handR: 'foreR',
  thighL: 'hips', shinL: 'thighL', footL: 'shinL', thighR: 'hips', shinR: 'thighR', footR: 'shinR', hair1: 'head', hair2: 'hair1' };

export const SKIN_TONES = ['#f3d6c4', '#e8b896', '#d29a72', '#b7794f', '#8e5a3a', '#6b4029', '#4a2c1d'];
export const HAIR_COLORS = ['#1b1512', '#3a2618', '#6b4426', '#a8743c', '#d9b26a', '#9c9a96', '#e9e4dc', '#7a2b22', '#2c3a5c', '#5a2a5e'];
export const HAIR_STYLES = ['crop', 'swept', 'ponytail', 'bun', 'curls', 'long', 'shaved', 'braid'];
export const OUTFITS = ['runner', 'runnerLight', 'casual', 'engineer'];

// Shared character material with soft rim light for the stylized look.
let SHARED_MAT = null;
export function characterMaterial() {
  if (SHARED_MAT) return SHARED_MAT;
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.0 });
  m.userData.rim = { value: new THREE.Color(0.35, 0.32, 0.3) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRim = m.userData.rim;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uRim;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
        totalEmissiveRadiance += uRim * rimF * diffuseColor.rgb * 1.4;`);
  };
  SHARED_MAT = m;
  return m;
}

// ----------------------------------------------------------------- geometry helpers
class Mesher {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.si = []; this.sw = []; this.idx = []; }
  // weights(localPos) -> [[bone, w], ...] (sum ~1)
  add(geo, matrix, color, weights) {
    const g = geo.index ? geo : geo; // keep indexed
    const P = g.attributes.position, Nn = g.attributes.normal;
    const base = this.pos.length / 3;
    const nm = new THREE.Matrix3().getNormalMatrix(matrix);
    const v = new THREE.Vector3(), n = new THREE.Vector3(), lp = new THREE.Vector3();
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    for (let i = 0; i < P.count; i++) {
      lp.fromBufferAttribute(P, i);
      v.copy(lp).applyMatrix4(matrix); n.fromBufferAttribute(Nn, i).applyMatrix3(nm).normalize();
      this.pos.push(v.x, v.y, v.z); this.nor.push(n.x, n.y, n.z);
      const cc = typeof color === 'function' ? color(lp, v) : c;
      this.col.push(cc.r, cc.g, cc.b);
      const w = typeof weights === 'number' ? [[weights, 1]] : Array.isArray(weights) ? weights : weights(lp, v);
      const s = [0, 0, 0, 0], ww = [0, 0, 0, 0]; let tot = 0;
      for (let k = 0; k < Math.min(4, w.length); k++) { s[k] = w[k][0]; ww[k] = w[k][1]; tot += w[k][1]; }
      for (let k = 0; k < 4; k++) ww[k] /= tot || 1;
      this.si.push(...s); this.sw.push(...ww);
    }
    if (g.index) for (let i = 0; i < g.index.count; i++) this.idx.push(base + g.index.getX(i));
    else for (let i = 0; i < P.count; i++) this.idx.push(base + i);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _s = new THREE.Vector3(1, 1, 1);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Tapered capsule along +y from 0 to L
function taperCapsule(r0, r1, L, radial = 12, rings = 4) {
  const pts = [];
  for (let i = 0; i <= rings; i++) { const a = -Math.PI / 2 + (i / rings) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * r0, Math.sin(a) * r0)); }
  for (let i = 1; i <= 4; i++) { const t = i / 5; pts.push(new THREE.Vector2(r0 + (r1 - r0) * t, L * t)); }
  for (let i = 0; i <= rings; i++) { const a = (i / rings) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * r1), L + Math.sin(a) * r1)); }
  pts[0].x = 0.0001;
  const g = new THREE.LatheGeometry(pts, radial);
  return g;
}
function segMatrix(a, b) {
  const d = b.clone().sub(a); const L = d.length();
  _q.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return { m: new THREE.Matrix4().compose(a, _q, _s), L };
}
function ellipsoid(rx, ry, rz, seg = 16) { const g = new THREE.SphereGeometry(1, seg, Math.max(8, seg * 0.75 | 0)); g.scale(rx, ry, rz); return g; }
function roundedBox(w, h, d, r, seg = 3) {
  const g = new THREE.BoxGeometry(w, h, d, seg * 2, seg * 2, seg * 2);
  const P = g.attributes.position, v = new THREE.Vector3(), inner = V(w / 2 - r, h / 2 - r, d / 2 - r), c = new THREE.Vector3();
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i);
    c.set(Math.max(-inner.x, Math.min(inner.x, v.x)), Math.max(-inner.y, Math.min(inner.y, v.y)), Math.max(-inner.z, Math.min(inner.z, v.z)));
    const off = v.clone().sub(c); if (off.lengthSq() > 0) off.setLength(r);
    P.setXYZ(i, c.x + off.x, c.y + off.y, c.z + off.z);
  }
  g.computeVertexNormals();
  return g;
}
// Head: deformed sphere with tapered jaw/chin and fuller cranium
function headGeo() {
  const g = new THREE.SphereGeometry(1, 32, 24);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const low = Math.max(0, -y);
    x *= 1 - 0.3 * low * low - 0.05 * low;
    z *= 1 - 0.12 * low * low;
    if (z > 0) z += 0.12 * low * z; // chin forward
    if (z < 0) z *= 1.06 + 0.05 * Math.max(0, y);
    y *= y > 0 ? 0.97 : 1.0;
    P.setXYZ(i, x * 0.105, y * 0.122, z * 0.112);
  }
  g.computeVertexNormals();
  return g;
}
// Smooth body surface from a profile of superelliptic rings
function profileSurface(prof, seg = 24) {
  const pos = [], idx = [];
  const rings = [];
  for (let i = 0; i < prof.length - 1; i++) for (let k = 0; k < 3; k++) { const t = k / 3; const a = prof[i], b = prof[i + 1]; rings.push(a.map((v, j) => v + (b[j] - v) * (t * t * (3 - 2 * t)))); }
  rings.push(prof[prof.length - 1]);
  for (const [y, rx, rzf, rzb, n] of rings) {
    for (let s = 0; s <= seg; s++) {
      const a = (s / seg) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      const ex = 2 / n;
      const x = rx * Math.sign(sn) * Math.pow(Math.abs(sn), ex), zz = Math.sign(c) * Math.pow(Math.abs(c), ex);
      pos.push(x, y, zz * (zz > 0 ? rzf : rzb));
    }
  }
  const W = seg + 1;
  for (let r = 0; r < rings.length - 1; r++) for (let s = 0; s < seg; s++) { const a = r * W + s, b = a + 1, c = a + W, d = c + 1; idx.push(a, c, b, b, c, d); }
  // caps
  const base = pos.length / 3; pos.push(0, rings[0][0] - 0.01, 0); for (let s = 0; s < seg; s++) idx.push(base, s, s + 1);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
const TR = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), _s);
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// ----------------------------------------------------------------- appearance
export function defaultLook(over = {}) {
  return Object.assign({
    skin: '#d29a72', hair: '#1b1512', hairStyle: 'crop', eyes: '#4a3424', height: 1.0, build: 0.5, frame: 0.5,
    outfit: 'runner', primary: '#2f4858', secondary: '#c8692b', pants: '#2b2d33', boots: '#3a2a20', gloves: '#2a2622',
    beard: false, glasses: false, goggles: false, freckles: false, scarf: null, coat: false, apron: null, lid: 1, age: 0,
    kid: false, brows: null, tetherArm: false, backpack: false, hood: false, earrings: false, tank: false, tiedJacket: null, vest: null,
  }, over);
}

export function randomLook(seed, over = {}) {
  const r = rng(seed);
  const outfits = ['casual', 'casual', 'engineer', 'worker', 'vendor', 'smart'];
  const palette = ['#5b7f95', '#9d5c3c', '#3f6b4c', '#7e6aa6', '#b79a48', '#a14a52', '#486a8a', '#6a6a6a', '#c58b5b', '#2f4f5f', '#8a3b2e', '#d1c3a4'];
  const look = defaultLook({
    skin: r.pick(SKIN_TONES), hair: r() < 0.15 ? r.pick(['#9c9a96', '#e9e4dc']) : r.pick(HAIR_COLORS.slice(0, 5).concat(['#7a2b22'])),
    hairStyle: r.pick(HAIR_STYLES), height: 0.92 + r() * 0.14, build: r(), frame: r(), outfit: r.pick(outfits),
    primary: r.pick(palette), secondary: r.pick(palette), pants: r.pick(['#2b2d33', '#3d3a34', '#4a5160', '#5c4b3b', '#30343c']),
    boots: r.pick(['#3a2a20', '#222', '#4a3a2a', '#5a5048']), beard: r() < 0.2, glasses: r() < 0.12, apron: null, age: r() < 0.2 ? 1 : 0,
    eyes: r.pick(['#4a3424', '#2d5a7a', '#3e5a2a', '#6b4b24', '#2a2a2a']),
  });
  if (look.outfit === 'vendor') look.apron = r.pick(['#e8e0d0', '#7a2b22', '#2f4858']);
  return Object.assign(look, over);
}

// ----------------------------------------------------------------- build
export function buildCharacter(lookIn = {}) {
  const L = defaultLook(lookIn);
  const kid = L.kid; const H = (kid ? 0.62 : 1) * L.height;
  const bw = 0.88 + L.build * 0.28;       // girth
  const fr = L.frame;                      // 0 = broad shoulders, 1 = wider hips/narrower shoulders
  const sh = (1.08 - fr * 0.16) * bw;     // shoulder width factor
  const hw = (0.92 + fr * 0.14) * bw;     // hip width factor
  const headS = kid ? 1.25 : 1.0;          // proportionally bigger head for kids

  // Bone rest positions (character space, unscaled; scaled by H at end via root scale)
  const rest = {
    root: V(0, 0, 0), hips: V(0, 0.92, 0), spine: V(0, 1.03, 0), chest: V(0, 1.2, 0), neck: V(0, 1.4, 0), head: V(0, 1.468, 0),
    jaw: V(0, 1.515, 0.075), eyeL: V(0.042, 1.586, 0.093), eyeR: V(-0.042, 1.586, 0.093), browL: V(0.044, 1.621, 0.098), browR: V(-0.044, 1.621, 0.098),
    shoulderL: V(0.06 * sh, 1.35, 0), armL: V(0.18 * sh, 1.35, -0.005), foreL: V(0.185 * sh, 1.07, -0.005), handL: V(0.185 * sh, 0.82, 0),
    shoulderR: V(-0.06 * sh, 1.35, 0), armR: V(-0.18 * sh, 1.35, -0.005), foreR: V(-0.185 * sh, 1.07, -0.005), handR: V(-0.185 * sh, 0.82, 0),
    thighL: V(0.09 * hw, 0.88, 0), shinL: V(0.095 * hw, 0.47, 0.005), footL: V(0.095 * hw, 0.075, 0),
    thighR: V(-0.09 * hw, 0.88, 0), shinR: V(-0.095 * hw, 0.47, 0.005), footR: V(-0.095 * hw, 0.075, 0),
    hair1: V(0, 1.648, -0.11), hair2: V(0, 1.508, -0.14),
  };
  // Head scale about the neck for stylization (kids get bigger heads)
  if (headS !== 1) {
    const pivot = rest.head.clone();
    for (const n of ['jaw', 'eyeL', 'eyeR', 'browL', 'browR', 'hair1', 'hair2']) rest[n].sub(pivot).multiplyScalar(headS).add(pivot);
  }

  const M = new Mesher();
  const C = c => new THREE.Color(c);
  const skin = C(L.skin), hair = C(L.hair);
  const skinDark = skin.clone().multiplyScalar(0.86); const lip = skin.clone().lerp(C('#9a3b3b'), 0.35);
  const prim = C(L.primary), sec = C(L.secondary), pants = C(L.pants), boots = C(L.boots), gloves = C(L.gloves);
  const outfit = L.outfit;
  // clothing color selection per outfit
  let torsoC = prim, sleeveC = prim, foreC = prim, handC = skin, thighC = pants, shinC = pants;
  if (outfit === 'runner') { handC = gloves; }
  if (outfit === 'runnerLight') { foreC = skin; }
  if (outfit === 'engineer' || outfit === 'worker') { thighC = prim; shinC = prim; foreC = skin; }
  if (outfit === 'casual' || outfit === 'vendor' || outfit === 'smart') { foreC = L.tank ? skin : prim; }
  if (L.tank) { sleeveC = skin; foreC = skin; }

  const w1 = b => [[B[b], 1]];
  const blend = (a, b, fn) => (lp, v) => { const t = fn(lp, v); return [[B[a], 1 - t], [B[b], t]]; };

  // --- torso: one smooth parametric surface skinned across hips/spine/chest
  {
    const bust = fr > 0.55 && !kid ? (fr - 0.55) * 0.07 : 0;
    // [y, rx, rzFront, rzBack, superellipse n]
    const prof = [
      [0.80, 0.06 * hw, 0.05, 0.05, 2], [0.83, 0.13 * hw, 0.085, 0.095, 2.2], [0.88, 0.158 * hw, 0.1, 0.115, 2.4], [0.95, 0.158 * hw, 0.098, 0.105, 2.4],
      [1.03, 0.135 * (bw * 0.6 + 0.4), 0.092, 0.092, 2.3], [1.12, 0.15 * sh, 0.1 + bust * 0.4, 0.1, 2.5], [1.21, 0.165 * sh, 0.112 + bust, 0.105, 2.7],
      [1.29, 0.172 * sh, 0.105 + bust * 0.5, 0.1, 2.9], [1.35, 0.16 * sh, 0.09, 0.09, 2.8], [1.395, 0.11 * sh, 0.07, 0.07, 2.3], [1.42, 0.055, 0.05, 0.05, 2],
    ];
    const g = profileSurface(prof, 24);
    const tc = (lp, v) => (v.y < 0.935 ? thighC : torsoC);
    M.add(g, T(0, 0, 0), tc, (lp, v) => { const a = smooth(0.94, 1.08, v.y), b = smooth(1.1, 1.22, v.y), n = smooth(1.36, 1.42, v.y) * 0.3; return [[B.hips, 1 - a], [B.spine, a * (1 - b)], [B.chest, a * b * (1 - n)], [B.neck, n]]; });
  }
  // neck
  { const s = segMatrix(V(0, 1.36, -0.005), V(0, 1.53, 0.0)); M.add(taperCapsule(0.056, 0.05, s.L), s.m, skin, blend('chest', 'neck', (lp) => smooth(0.0, 0.08, lp.y) * 0.8 + smooth(0.1, 0.17, lp.y) * 0.2)); }
  // --- head (pivot at head bone)
  const hp = rest.head;
  const HM = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(V(x, y, z).multiplyScalar(headS).add(hp), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(headS, headS, headS));
  M.add(headGeo(), HM(0, 0.125, 0.008), skin, w1('head'));
  M.add(ellipsoid(0.013, 0.021, 0.016, 10), HM(0, 0.09, 0.117, -0.25, 0, 0), skinDark, w1('head')); // nose
  for (const sx of [-1, 1]) M.add(ellipsoid(0.014, 0.028, 0.02, 8), HM(sx * 0.103, 0.11, -0.002), skinDark, w1('head')); // ears
  // eyes (white, iris, pupil, catchlight) bound to eye bones
  const iris = C(L.eyes);
  for (const [bn, sx] of [['eyeL', 1], ['eyeR', -1]]) {
    const e = rest[bn].clone().sub(hp).divideScalar(headS);
    M.add(ellipsoid(0.025, 0.025 * L.lid, 0.019, 14), HM(e.x, e.y, e.z), C('#f6f3ee'), w1(bn));
    M.add(ellipsoid(0.0165, 0.0165 * Math.min(1, L.lid + 0.1), 0.006, 14), HM(e.x, e.y, e.z + 0.0155), iris, w1(bn));
    M.add(ellipsoid(0.0078, 0.0078, 0.003, 10), HM(e.x, e.y, e.z + 0.0205), C('#0b0a0a'), w1(bn));
    M.add(ellipsoid(0.004, 0.004, 0.002, 6), HM(e.x + 0.006, e.y + 0.007, e.z + 0.0215), C('#ffffff'), w1(bn));
    // upper lid (skin) — gives tired/heavy-lidded looks
    if (L.lid < 0.95) M.add(ellipsoid(0.027, 0.013, 0.02, 10), HM(e.x, e.y + 0.019 * L.lid, e.z + 0.002), skin, w1(bn === 'eyeL' ? 'browL' : 'browR'));
    // brows
    const bb = rest[bn === 'eyeL' ? 'browL' : 'browR'].clone().sub(hp).divideScalar(headS);
    const browC = L.brows ? C(L.brows) : hair.clone().multiplyScalar(0.8);
    M.add(ellipsoid(0.024, 0.0058, 0.007, 8), HM(bb.x, bb.y + 0.006, bb.z + 0.002, 0, 0, sx * -0.12), browC, w1(bn === 'eyeL' ? 'browL' : 'browR'));
  }
  // mouth (jaw bone): dark interior + lips
  { const j = rest.jaw.clone().sub(hp).divideScalar(headS);
    M.add(ellipsoid(0.02, 0.007, 0.008, 12), HM(j.x, j.y + 0.003, j.z + 0.019), C('#3a1414'), w1('jaw'));
    M.add(ellipsoid(0.021, 0.0042, 0.008, 12), HM(j.x, j.y + 0.008, j.z + 0.021), lip, w1('head'));
    M.add(ellipsoid(0.018, 0.0048, 0.008, 12), HM(j.x, j.y - 0.002, j.z + 0.019), lip, w1('jaw'));
  }
  if (L.freckles) for (let i = 0; i < 14; i++) { const r = rng(i + 3); const sx = r.sign(); M.add(ellipsoid(0.003, 0.003, 0.002, 4), HM(sx * (0.03 + r() * 0.035), 0.08 + r() * 0.02, 0.105 - r() * 0.01), skin.clone().multiplyScalar(0.7), w1('head')); }
  buildHair(M, L, HM, hair, rest, hp, headS);
  if (L.beard) {
    const bc = hair.clone().multiplyScalar(0.95);
    M.add(ellipsoid(0.09, 0.055, 0.075, 14), HM(0, 0.045, 0.05), bc, w1('jaw'));
    M.add(ellipsoid(0.1, 0.06, 0.085, 14), HM(0, 0.075, 0.02), bc, w1('head'));
    M.add(ellipsoid(0.03, 0.008, 0.012, 8), HM(0, 0.081, 0.112), bc, w1('head')); // moustache
  }
  if (L.glasses) {
    const fc = C('#1d1d1f');
    for (const sx of [-1, 1]) { const g = new THREE.TorusGeometry(0.02, 0.0028, 6, 16); M.add(g, HM(sx * 0.041, 0.115, 0.118), fc, w1('head')); }
    M.add(new THREE.BoxGeometry(0.022, 0.004, 0.004), HM(0, 0.118, 0.12), fc, w1('head'));
    for (const sx of [-1, 1]) M.add(new THREE.BoxGeometry(0.004, 0.004, 0.1), HM(sx * 0.062, 0.118, 0.07), fc, w1('head'));
  }
  if (L.goggles) {
    M.add(new THREE.TorusGeometry(0.118, 0.008, 6, 24), HM(0, 0.19, 0.0, Math.PI / 2 + 0.35, 0, 0), C('#3a3330'), w1('head'));
    for (const sx of [-1, 1]) { M.add(new THREE.CylinderGeometry(0.026, 0.028, 0.02, 14), HM(sx * 0.038, 0.2, 0.102, Math.PI / 2 - 0.6, 0, 0), C('#6a5a48'), w1('head')); M.add(new THREE.CylinderGeometry(0.02, 0.02, 0.022, 14), HM(sx * 0.038, 0.203, 0.106, Math.PI / 2 - 0.6, 0, 0), C('#4fa3c0'), w1('head')); }
  }
  if (L.earrings) for (const sx of [-1, 1]) M.add(new THREE.TorusGeometry(0.008, 0.0018, 4, 10), HM(sx * 0.11, 0.08, 0.0), C('#d8b45a'), w1('head'));

  // --- arms
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    const a0 = rest['arm' + s], e0 = rest['fore' + s], h0 = rest['hand' + s];
    const ua = segMatrix(a0, e0); // pointing down
    M.add(taperCapsule(0.054 * bw, 0.044 * bw, ua.L), ua.m, sleeveC, (lp) => { const t = lp.y / ua.L; return [[B['arm' + s], 1 - smooth(0.78, 1.05, t) * 0.5 - (1 - smooth(-0.1, 0.18, t)) * 0.3], [B['shoulder' + s], (1 - smooth(-0.1, 0.18, t)) * 0.3], [B['fore' + s], smooth(0.78, 1.05, t) * 0.5]]; });
    M.add(ellipsoid(0.058 * bw, 0.052, 0.055), T(a0.x - sx * 0.012, a0.y + 0.0, a0.z), sleeveC, () => [[B['arm' + s], 0.6], [B['shoulder' + s], 0.4]]);
    const fa = segMatrix(e0, h0.clone().add(V(0, 0.02, 0)));
    M.add(taperCapsule(0.044 * bw, 0.034 * bw, fa.L), fa.m, foreC, (lp) => { const t = lp.y / fa.L; return [[B['fore' + s], 1 - (1 - smooth(-0.05, 0.22, t)) * 0.5 - smooth(0.85, 1.1, t) * 0.3], [B['arm' + s], (1 - smooth(-0.05, 0.22, t)) * 0.5], [B['hand' + s], smooth(0.85, 1.1, t) * 0.3]]; });
    // cuff
    if (!foreC.equals(skin) || outfit === 'runner') M.add(new THREE.CylinderGeometry(0.041 * bw, 0.044 * bw, 0.035, 12), T(h0.x, h0.y + 0.04, h0.z), outfit === 'runner' ? sec : foreC.clone().multiplyScalar(0.8), w1('fore' + s));
    else if (outfit !== 'runner' && sleeveC !== skin) M.add(new THREE.CylinderGeometry(0.052 * bw, 0.05 * bw, 0.05, 12), T(e0.x, e0.y + 0.02, e0.z), sleeveC.clone().multiplyScalar(0.85), w1('arm' + s)); // rolled sleeve
    // hand
    M.add(roundedBox(0.052, 0.085, 0.085, 0.022), T(h0.x, h0.y - 0.045, h0.z + 0.005), handC, w1('hand' + s));
    M.add(roundedBox(0.045, 0.05, 0.075, 0.018), T(h0.x, h0.y - 0.1, h0.z + 0.004), handC, w1('hand' + s)); // fingers
    { const th = segMatrix(V(h0.x - sx * 0.0, h0.y - 0.02, h0.z + 0.04), V(h0.x - sx * 0.0, h0.y - 0.07, h0.z + 0.07)); M.add(taperCapsule(0.014, 0.012, th.L, 6, 2), th.m, handC, w1('hand' + s)); }
  }
  // Tether gauntlet (left forearm) — a heavy bracer with coil housings
  if (L.tetherArm) {
    const e0 = rest.foreL, h0 = rest.handL;
    M.add(new THREE.CylinderGeometry(0.05, 0.055, 0.15, 14), T(e0.x, (e0.y + h0.y) / 2 - 0.01, e0.z), C('#2b2e33'), w1('foreL'));
    M.add(roundedBox(0.04, 0.12, 0.05, 0.012), T(e0.x + 0.04, (e0.y + h0.y) / 2 - 0.01, e0.z + 0.0), C('#4a4f57'), w1('foreL'));
    M.add(new THREE.TorusGeometry(0.056, 0.008, 6, 16), TR(e0.x, h0.y + 0.055, e0.z, Math.PI / 2, 0, 0), C('#c8692b'), w1('foreL'));
  }

  // --- legs
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    const t0 = rest['thigh' + s], k0 = rest['shin' + s], f0 = rest['foot' + s];
    const th = segMatrix(t0.clone().add(V(0, 0.02, 0)), k0);
    M.add(taperCapsule(0.078 * hw, 0.058 * bw, th.L), th.m, thighC, (lp) => { const t = lp.y / th.L; return [[B['thigh' + s], 1 - smooth(0.8, 1.05, t) * 0.5 - (1 - smooth(-0.05, 0.2, t)) * 0.35], [B.hips, (1 - smooth(-0.05, 0.2, t)) * 0.35], [B['shin' + s], smooth(0.8, 1.05, t) * 0.5]]; });
    const sh2 = segMatrix(k0, f0.clone().add(V(0, 0.01, 0)));
    M.add(taperCapsule(0.057 * bw, 0.042 * bw, sh2.L), sh2.m, shinC, (lp) => { const t = lp.y / sh2.L; return [[B['shin' + s], 1 - (1 - smooth(-0.05, 0.18, t)) * 0.5 - smooth(0.88, 1.05, t) * 0.3], [B['thigh' + s], (1 - smooth(-0.05, 0.18, t)) * 0.5], [B['foot' + s], smooth(0.88, 1.05, t) * 0.3]]; });
    // boots
    const bootTop = outfit === 'casual' || outfit === 'smart' ? 0.12 : 0.24;
    M.add(new THREE.CylinderGeometry(0.058 * bw, 0.054, bootTop, 12), T(f0.x, f0.y + bootTop / 2 - 0.01, f0.z - 0.005), boots, (lp, v) => [[B['shin' + s], smooth(0.05, 0.2, v.y)], [B['foot' + s], 1 - smooth(0.05, 0.2, v.y)]]);
    M.add(roundedBox(0.1, 0.085, 0.25, 0.035), T(f0.x, 0.04, f0.z + 0.05), boots, w1('foot' + s));
    M.add(roundedBox(0.106, 0.025, 0.26, 0.01), T(f0.x, 0.01, f0.z + 0.05), C('#1a1714'), w1('foot' + s));
    if (outfit === 'runner') {
      M.add(roundedBox(0.09, 0.1, 0.05, 0.02), T(k0.x, k0.y - 0.03, k0.z + 0.055), C('#26282c'), w1('shin' + s)); // knee pads
      M.add(roundedBox(0.06, 0.1, 0.08, 0.015), T(t0.x + sx * 0.075, 0.68, 0.01), pants.clone().multiplyScalar(0.8), w1('thigh' + s)); // thigh pocket
    }
  }

  // --- outfit details
  const torsoW = 0.17 * sh;
  if (outfit === 'runner' || outfit === 'runnerLight') {
    // high collar
    M.add(new THREE.CylinderGeometry(0.07, 0.085, 0.07, 16, 1, true), T(0, 1.4, -0.005), prim.clone().multiplyScalar(0.85), blend('chest', 'neck', () => 0.25));
    // hem flare over hips
    M.add(new THREE.CylinderGeometry(0.145 * bw, 0.16 * hw, 0.12, 16, 1, true), T(0, 0.93, 0), prim, blend('hips', 'spine', (lp, v) => smooth(0.9, 1.0, v.y) * 0.6));
    // accent stripes on shoulders
    M.add(new THREE.TorusGeometry(0.083, 0.008, 6, 20), TR(0, 1.37, -0.005, Math.PI / 2, 0, 0), sec, w1('chest'));
    // zip
    M.add(new THREE.BoxGeometry(0.012, 0.36, 0.012), T(0.01, 1.2, 0.108), C('#151515'), blend('spine', 'chest', (lp, v) => smooth(1.1, 1.25, v.y)));
    // harness straps
    for (const sx of [-1, 1]) M.add(new THREE.BoxGeometry(0.035, 0.32, 0.014), TR(sx * 0.07, 1.22, 0.11, 0, 0, sx * 0.12), C('#3b332b'), blend('spine', 'chest', (lp, v) => smooth(1.1, 1.25, v.y)));
    M.add(new THREE.BoxGeometry(0.2, 0.03, 0.014), T(0, 1.18, 0.115), C('#3b332b'), w1('chest'));
    // belt + pouches
    M.add(new THREE.TorusGeometry(0.152 * hw, 0.018, 6, 20), TR(0, 0.95, 0, Math.PI / 2, 0, 0), C('#2a221b'), w1('hips'));
    M.add(roundedBox(0.05, 0.035, 0.03, 0.008), T(0, 0.95, 0.15), C('#b8a070'), w1('hips'));
    for (const sx of [-1, 1]) M.add(roundedBox(0.07, 0.08, 0.05, 0.015), T(sx * 0.12 * hw, 0.92, 0.09), C('#3b332b'), w1('hips'));
    if (L.backpack) {
      M.add(roundedBox(0.25, 0.3, 0.1, 0.03), T(0, 1.22, -0.15), C('#3b3f45'), w1('chest'));
      M.add(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 10), TR(0, 1.39, -0.15, 0, 0, Math.PI / 2), sec, w1('chest'));
    }
  }
  if (outfit === 'casual' || outfit === 'smart' || outfit === 'vendor') {
    M.add(new THREE.CylinderGeometry(0.062, 0.08, 0.035, 16, 1, true), T(0, 1.39, 0), prim.clone().multiplyScalar(0.8), w1('chest'));
    M.add(new THREE.CylinderGeometry(0.14 * bw, 0.155 * hw, 0.1, 16, 1, true), T(0, 0.94, 0), prim, blend('hips', 'spine', (lp, v) => smooth(0.9, 1.0, v.y) * 0.6));
    if (L.hood) M.add(ellipsoid(0.14, 0.07, 0.08, 12), T(0, 1.42, -0.1), prim.clone().multiplyScalar(0.9), w1('chest'));
    if (outfit === 'smart') M.add(new THREE.BoxGeometry(0.03, 0.3, 0.01), T(0, 1.2, 0.108), sec, w1('chest'));
  }
  if (outfit === 'engineer' || outfit === 'worker') {
    M.add(new THREE.CylinderGeometry(0.07, 0.09, 0.05, 16, 1, true), T(0, 1.39, 0), prim.clone().multiplyScalar(0.8), w1('chest'));
    M.add(new THREE.TorusGeometry(0.152 * hw, 0.02, 6, 20), TR(0, 0.95, 0, Math.PI / 2, 0, 0), C('#3a2f22'), w1('hips'));
    for (const sx of [-1, 1]) M.add(roundedBox(0.06, 0.09, 0.05, 0.015), T(sx * 0.13 * hw, 0.9, 0.06), C('#5a4630'), w1('hips'));
    M.add(roundedBox(0.09, 0.08, 0.02, 0.01), T(0.07, 1.27, 0.11), prim.clone().multiplyScalar(0.85), w1('chest'));
    if (outfit === 'worker') M.add(ellipsoid(0.125, 0.06, 0.125, 14), HM(0, 0.2, 0.01), C('#d8a020'), w1('head')); // hard hat
  }
  if (L.vest) { M.add(roundedBox(0.35 * sh, 0.25, 0.215, 0.08), T(0, 1.2, -0.005), C(L.vest), blend('spine', 'chest', (lp, v) => smooth(1.08, 1.22, v.y))); }
  if (L.apron) M.add(roundedBox(0.28 * hw, 0.5, 0.02, 0.01), T(0, 0.92, 0.12 * bw), C(L.apron), (lp, v) => [[B.spine, smooth(0.85, 1.1, v.y)], [B.hips, 1 - smooth(0.85, 1.1, v.y)]]);
  if (L.scarf) {
    M.add(new THREE.TorusGeometry(0.075, 0.03, 8, 18), TR(0, 1.39, 0.01, Math.PI / 2 + 0.15, 0, 0), C(L.scarf), blend('chest', 'neck', () => 0.3));
    M.add(roundedBox(0.06, 0.2, 0.025, 0.01), TR(0.05, 1.25, 0.12, 0.1, 0, 0.1), C(L.scarf), w1('chest'));
  }
  if (L.tiedJacket) { // jacket tied around the waist (Nia)
    const tj = C(L.tiedJacket);
    M.add(new THREE.CylinderGeometry(0.16 * hw, 0.17 * hw, 0.07, 18, 1, true), T(0, 0.93, 0), tj, w1('hips'));
    M.add(roundedBox(0.3 * hw, 0.3, 0.03, 0.012), T(0, 0.78, -0.12), tj, (lp, v) => [[B.hips, 0.6], [B.thighL, 0.2], [B.thighR, 0.2]]);
    for (const sx of [-1, 1]) M.add(roundedBox(0.05, 0.14, 0.04, 0.015), TR(sx * 0.04, 0.86, 0.15, 0, 0, sx * 0.4), tj, w1('hips'));
  }
  if (L.coat) { // long coat panels follow thighs partially
    const cc = C(L.coat);
    M.add(new THREE.CylinderGeometry(0.075, 0.09, 0.08, 16, 1, true), T(0, 1.4, -0.01), cc, w1('chest'));
    M.add(roundedBox(0.36 * sh, 0.28, 0.215, 0.085), T(0, 1.25, -0.005), cc, blend('spine', 'chest', (lp, v) => smooth(1.12, 1.22, v.y)));
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      const g = new THREE.CylinderGeometry(0.105 * hw, 0.13 * hw, 0.5, 12, 4, true, sx > 0 ? -Math.PI * 0.05 : Math.PI * 0.95, Math.PI * 1.1);
      M.add(g, T(sx * 0.075, 0.74, -0.005), cc, (lp, v) => { const t = smooth(0.95, 0.5, v.y); return [[B.hips, 1 - t * 0.55], [B['thigh' + s], t * 0.55]]; });
    }
    for (const s of ['L', 'R']) { const a0 = rest['arm' + s], e0 = rest['fore' + s]; const ua = segMatrix(a0, e0); M.add(taperCapsule(0.06 * bw, 0.05 * bw, ua.L), ua.m, cc, w1('arm' + s)); const fa = segMatrix(e0, rest['hand' + s].clone().add(V(0, 0.05, 0))); M.add(taperCapsule(0.05 * bw, 0.044 * bw, fa.L), fa.m, cc, (lp) => [[B['fore' + s], 1 - (1 - smooth(0, 0.2, lp.y / fa.L)) * 0.5], [B['arm' + s], (1 - smooth(0, 0.2, lp.y / fa.L)) * 0.5]]); }
  }

  // ----- assemble skeleton
  const bones = BONES.map(n => { const b = new THREE.Bone(); b.name = n; return b; });
  BONES.forEach((n, i) => {
    const p = PARENT[n];
    if (p) { bones[B[p]].add(bones[i]); bones[i].position.copy(rest[n]).sub(rest[p]); }
    else bones[i].position.copy(rest[n]);
  });
  const geo = M.build();
  const mesh = new THREE.SkinnedMesh(geo, characterMaterial());
  mesh.add(bones[0]);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.frustumCulled = false; // skinned bounds are unreliable; we cull by distance ourselves
  const group = new THREE.Group();
  group.add(mesh);
  group.scale.setScalar(H);
  const bonesBy = Object.fromEntries(BONES.map((n, i) => [n, bones[i]]));
  // Attachment helpers (weapons, tether glow)
  const sockets = {};
  sockets.gripR = new THREE.Object3D(); sockets.gripR.position.set(0, -0.075, 0.025); bonesBy.handR.add(sockets.gripR);
  sockets.gripL = new THREE.Object3D(); sockets.gripL.position.set(0, -0.075, 0.025); bonesBy.handL.add(sockets.gripL);
  sockets.tether = new THREE.Object3D(); sockets.tether.position.set(0, -0.2, 0.0); bonesBy.foreL.add(sockets.tether);
  sockets.back = new THREE.Object3D(); sockets.back.position.set(0.0, 0.02, -0.17); bonesBy.chest.add(sockets.back);
  sockets.hip = new THREE.Object3D(); sockets.hip.position.set(-0.17, -0.02, 0.02); bonesBy.hips.add(sockets.hip);
  sockets.head = new THREE.Object3D(); sockets.head.position.set(0, 0.14, 0.0); bonesBy.head.add(sockets.head);
  if (L.tetherArm) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.057, 0.006, 6, 20), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.55, 0.2).multiplyScalar(3) }));
    ring.rotation.x = Math.PI / 2; ring.position.set(0, -0.19, 0);
    bonesBy.foreL.add(ring); sockets.tetherRing = ring;
  }
  return { group, mesh, bones: bonesBy, boneList: bones, rest, look: L, sockets, height: H * 1.73 };
}

function buildHair(M, L, HM, hair, rest, hp, headS) {
  const style = L.hairStyle;
  if (style === 'bald') return;
  const w = [[B.head, 1]];
  const r = rng(style.length * 17 + 3);
  // cap: sphere around skull, remove face region
  const cap = (scale, faceLine, backLine, sideLine, bump = 0.006) => {
    const g = new THREE.SphereGeometry(1, 28, 20);
    const P = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i);
      const lon = Math.atan2(v.x, v.z);
      const n = Math.sin(lon * 34) * 0.6 + Math.sin(lon * 13 + v.y * 4) * 0.4;
      const k = 1 + n * bump * 1.6 * Math.max(0, 0.3 + v.y);
      P.setXYZ(i, v.x * 0.118 * scale * k, v.y * 0.133 * scale * k, v.z * 0.124 * scale * k);
    }
    // filter triangles
    const idx = g.index, keep = [];
    const dir = new THREE.Vector3();
    for (let t = 0; t < idx.count; t += 3) {
      let ok = true;
      for (let k = 0; k < 3; k++) {
        dir.fromBufferAttribute(P, idx.getX(t + k)).normalize();
        const front = dir.z > 0.2 && dir.y < faceLine;
        const back = dir.y < backLine;
        const side = Math.abs(dir.x) > 0.55 && dir.y < sideLine && dir.z > -0.4;
        if (front || back || side) { ok = false; break; }
      }
      if (ok) keep.push(idx.getX(t), idx.getX(t + 1), idx.getX(t + 2));
    }
    g.setIndex(keep); g.computeVertexNormals();
    return g;
  };
  const hc = hair, hd = hair.clone().multiplyScalar(0.82);
  if (style === 'shaved') { M.add(cap(1.02, 0.42, -0.25, 0.15, 0.001), HM(0, 0.125, 0.006), hd, w); return; }
  const baseCap = cap(1.08, style === 'swept' ? 0.48 : 0.52, style === 'long' || style === 'braid' ? -0.6 : -0.32, 0.1);
  M.add(baseCap, HM(0, 0.127, 0.0), hc, w);
  // fringe locks along the hairline
  const fringe = style === 'crop' || style === 'curls' || style === 'long' || style === 'bun' || style === 'ponytail' || style === 'braid';
  if (fringe) for (let i = 0; i < 7; i++) {
    const a = -0.9 + i * 0.3;
    M.add(ellipsoid(0.03, 0.022, 0.028, 8), HM(Math.sin(a) * 0.09, 0.205 - Math.abs(a) * 0.02, Math.cos(a) * 0.088, 0.4, a, 0), i % 2 ? hc : hd, w);
  }
  if (style === 'swept') {
    M.add(ellipsoid(0.085, 0.045, 0.11, 14), HM(0.015, 0.228, 0.02, 0.15, 0, -0.2), hc, w);
    M.add(ellipsoid(0.05, 0.03, 0.06, 10), HM(0.045, 0.215, 0.085, 0.6, 0.3, -0.5), hd, w);
  }
  if (style === 'curls') {
    for (let i = 0; i < 46; i++) {
      const th = r() * Math.PI * 2, ph = r() * 1.3;
      const d = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph), Math.sin(ph) * Math.sin(th));
      if (d.z > 0.45 && d.y < 0.55) continue;
      M.add(ellipsoid(0.035, 0.035, 0.035, 8), HM(d.x * 0.13, 0.13 + d.y * 0.14, d.z * 0.13), r() < 0.5 ? hc : hd, w);
    }
  }
  if (style === 'bun') M.add(ellipsoid(0.05, 0.05, 0.05, 12), HM(0, 0.24, -0.1), hc, w);
  if (style === 'ponytail' || style === 'braid') {
    // tail on hair bones (sways)
    const r0 = rest.hair1.clone(), r1 = rest.hair2.clone();
    M.add(ellipsoid(0.035, 0.03, 0.035, 10), T(r0.x, r0.y, r0.z), hd, [[B.head, 1]]);
    const s1 = segMatrix(r0, r1);
    M.add(taperCapsule(0.035, 0.04, s1.L, 10, 3), s1.m, hc, [[B.hair1, 1]]);
    const end = r1.clone().add(new THREE.Vector3(0, style === 'braid' ? -0.2 : -0.13, -0.02));
    const s2 = segMatrix(r1, end);
    if (style === 'braid') { for (let i = 0; i < 6; i++) M.add(ellipsoid(0.028, 0.03, 0.028, 8), T(r1.x, r1.y - i * 0.035, r1.z - i * 0.003), i % 2 ? hc : hd, [[B.hair2, 1]]); }
    else M.add(taperCapsule(0.04, 0.012, s2.L, 10, 3), s2.m, hc, [[B.hair2, 1]]);
  }
  if (style === 'long') {
    M.add(roundedBox(0.23, 0.26, 0.06, 0.03), HM(0, 0.0, -0.1), hc, w);
    for (const sx of [-1, 1]) M.add(roundedBox(0.045, 0.2, 0.06, 0.02), HM(sx * 0.105, 0.03, -0.01), hd, w);
  }
}
