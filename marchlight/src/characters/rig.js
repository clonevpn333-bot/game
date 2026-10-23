// Procedural stylized humanoid (v2).
// One skinned body per LOD, sharing a single skeleton. Built from sculpted primitives with
// blended joint weights; per-vertex material ids drive the shading (skin, cloth, canvas,
// leather, metal, hair, eyes, rubber, lips) so fabric, leather and skin read differently.
// Face: lidded eyes, mouth corners, a jaw and expressive brows. Hands have fingers.
import * as THREE from 'three';
import { rng } from '../core/util.js';

export const BONES = ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'eyeL', 'eyeR', 'browL', 'browR',
  'shoulderL', 'armL', 'foreL', 'handL', 'shoulderR', 'armR', 'foreR', 'handR',
  'thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR', 'hair1', 'hair2',
  'fingersL', 'fingersR', 'lidL', 'lidR', 'cornerL', 'cornerR', 'toeL', 'toeR'];
export const B = Object.fromEntries(BONES.map((n, i) => [n, i]));
const PARENT = { root: null, hips: 'root', spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', jaw: 'head', eyeL: 'head', eyeR: 'head', browL: 'head', browR: 'head',
  shoulderL: 'chest', armL: 'shoulderL', foreL: 'armL', handL: 'foreL', shoulderR: 'chest', armR: 'shoulderR', foreR: 'armR', handR: 'foreR',
  thighL: 'hips', shinL: 'thighL', footL: 'shinL', thighR: 'hips', shinR: 'thighR', footR: 'shinR', hair1: 'head', hair2: 'hair1',
  fingersL: 'handL', fingersR: 'handR', lidL: 'head', lidR: 'head', cornerL: 'head', cornerR: 'head', toeL: 'footL', toeR: 'footR' };

export const SKIN_TONES = ['#f3d6c4', '#e8b896', '#d29a72', '#b7794f', '#8e5a3a', '#6b4029', '#4a2c1d'];
export const HAIR_COLORS = ['#1b1512', '#3a2618', '#6b4426', '#a8743c', '#d9b26a', '#9c9a96', '#e9e4dc', '#7a2b22', '#2c3a5c', '#5a2a5e'];
export const HAIR_STYLES = ['crop', 'swept', 'ponytail', 'bun', 'curls', 'long', 'shaved', 'braid'];
export const OUTFITS = ['runner', 'runnerLight', 'casual', 'engineer'];

// material ids
export const MAT = { skin: 0, cloth: 1, leather: 2, metal: 3, hair: 4, eye: 5, rubber: 6, canvas: 7, lips: 8, knit: 9 };

// ----------------------------------------------------------------- shared material
let SHARED_MAT = null;
export function characterMaterial() {
  if (SHARED_MAT) return SHARED_MAT;
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.0 });
  m.userData.rim = { value: new THREE.Color(0.32, 0.3, 0.28) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRim = m.userData.rim;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aMat; varying float vMat; varying vec3 vRest; varying vec3 vRestN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMat = aMat; vRest = position; vRestN = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uRim; varying float vMat; varying vec3 vRest; varying vec3 vRestN;
        float ch(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float cn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(ch(i), ch(i+vec3(1,0,0)), f.x), mix(ch(i+vec3(0,1,0)), ch(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(ch(i+vec3(0,0,1)), ch(i+vec3(1,0,1)), f.x), mix(ch(i+vec3(0,1,1)), ch(i+vec3(1,1,1)), f.x), f.y), f.z); }
        float matIs(float id){ return 1.0 - step(0.5, abs(vMat - id)); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        float mSkin = matIs(0.0), mCloth = matIs(1.0), mLeather = matIs(2.0), mMetal = matIs(3.0), mHair = matIs(4.0), mEye = matIs(5.0), mRubber = matIs(6.0), mCanvas = matIs(7.0), mLips = matIs(8.0), mKnit = matIs(9.0);
        float mottle = cn(vRest * 30.0) * 0.6 + cn(vRest * 90.0) * 0.4;
        float strands = cn(vec3(vRest.x * 420.0, vRest.y * 40.0, vRest.z * 420.0));
        float grain = cn(vRest * 260.0);
        float alb = 1.0;
        alb *= mix(1.0, 0.9 + mottle * 0.2, mCloth + mCanvas + mKnit);
        alb *= mix(1.0, 0.8 + grain * 0.35, mLeather);
        alb *= mix(1.0, 0.7 + strands * 0.55, mHair);
        alb *= mix(1.0, 0.93 + mottle * 0.12, mSkin);
        diffuseColor.rgb *= alb;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mSkin * (0.52 + cn(vRest * 120.0) * 0.12) + mCloth * 0.88 + mCanvas * 0.8 + mKnit * 0.95 + mLeather * (0.42 + grain * 0.2)
          + mMetal * 0.28 + mHair * (0.38 + strands * 0.2) + mEye * 0.06 + mRubber * 0.95 + mLips * 0.35;`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mMetal * 0.85;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // procedural micro-relief: weave, twill, knit, leather grain, hair strands, pores
          float fw = fwidth(vRest.x * 900.0) + fwidth(vRest.y * 900.0);
          float near = clamp(1.6 - fw * 1.4, 0.0, 1.0);
          float weave = sin(vRest.x * 900.0) * sin(vRest.y * 900.0 + vRest.z * 900.0);
          float twill = sin((vRest.x + vRest.y + vRest.z) * 1100.0);
          float knit = sin(vRest.x * 700.0 + sin(vRest.y * 350.0) * 2.0);
          float h = mCloth * weave * 0.6 + mCanvas * twill * 0.7 + mKnit * knit * 0.9 + mLeather * grain * 0.8 + mHair * strands * 1.2 + mSkin * cn(vRest * 400.0) * 0.25;
          h *= near * 0.0025;
          vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
          float dhx = dFdx(h), dhy = dFdy(h);
          vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
          float det = dot(dpx, r1);
          vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
          normal = normalize(abs(det) * normal - grad * 25.0);
        }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimF = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 3.0);
        totalEmissiveRadiance += uRim * rimF * diffuseColor.rgb * (1.2 + mHair * 0.8);
        // fake subsurface warmth on skin
        totalEmissiveRadiance += diffuseColor.rgb * vec3(0.12, 0.035, 0.02) * (mSkin + mLips);`);
  };
  SHARED_MAT = m;
  return m;
}

// ----------------------------------------------------------------- geometry helpers
class Mesher {
  constructor(lod) { this.lod = lod; this.pos = []; this.nor = []; this.col = []; this.si = []; this.sw = []; this.idx = []; this.mat = []; }
  // weights: bone index | [[bone, w], ...] | fn(localPos, worldPos) -> [[bone, w]]; color: Color | fn
  add(geo, matrix, color, weights, mat = MAT.cloth) {
    const P = geo.attributes.position, Nn = geo.attributes.normal || (geo.computeVertexNormals(), geo.attributes.normal);
    const base = this.pos.length / 3;
    const nm = new THREE.Matrix3().getNormalMatrix(matrix);
    const v = new THREE.Vector3(), n = new THREE.Vector3(), lp = new THREE.Vector3();
    const c = color instanceof THREE.Color ? color : (typeof color === 'function' ? null : new THREE.Color(color));
    for (let i = 0; i < P.count; i++) {
      lp.fromBufferAttribute(P, i);
      v.copy(lp).applyMatrix4(matrix); n.fromBufferAttribute(Nn, i).applyMatrix3(nm).normalize();
      this.pos.push(v.x, v.y, v.z); this.nor.push(n.x, n.y, n.z);
      const cc = c || color(lp, v, n);
      this.col.push(cc.r, cc.g, cc.b);
      const w = typeof weights === 'number' ? [[weights, 1]] : Array.isArray(weights) ? weights : weights(lp, v);
      const s = [0, 0, 0, 0], ww = [0, 0, 0, 0]; let tot = 0;
      for (let k = 0; k < Math.min(4, w.length); k++) { s[k] = w[k][0]; ww[k] = Math.max(0, w[k][1]); tot += ww[k]; }
      for (let k = 0; k < 4; k++) ww[k] /= tot || 1;
      this.si.push(...s); this.sw.push(...ww);
      this.mat.push(typeof mat === 'function' ? mat(lp, v) : mat);
    }
    if (geo.index) for (let i = 0; i < geo.index.count; i++) this.idx.push(base + geo.index.getX(i));
    else for (let i = 0; i < P.count; i++) this.idx.push(base + i);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.mat, 1));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

const _q = new THREE.Quaternion(), _s = new THREE.Vector3(1, 1, 1);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const T = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z);
const TR = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), _s);
const TRS = (x, y, z, rx, ry, rz, sx, sy, sz) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx, sy, sz));
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Tapered capsule along +y from 0 to L
function taperCapsule(r0, r1, L, radial = 12, rings = 4) {
  const pts = [];
  for (let i = 0; i <= rings; i++) { const a = -Math.PI / 2 + (i / rings) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.cos(a) * r0, Math.sin(a) * r0)); }
  for (let i = 1; i <= 5; i++) { const t = i / 6; const bulge = Math.sin(t * Math.PI) * 0.06 * Math.max(r0, r1); pts.push(new THREE.Vector2(r0 + (r1 - r0) * t + bulge, L * t)); }
  for (let i = 0; i <= rings; i++) { const a = (i / rings) * (Math.PI / 2); pts.push(new THREE.Vector2(Math.max(0.0001, Math.cos(a) * r1), L + Math.sin(a) * r1)); }
  pts[0].x = 0.0001;
  return new THREE.LatheGeometry(pts, radial);
}
// Lathe from a radius profile [[y, r], ...] (open)
function latheProfile(prof, radial = 14) { return new THREE.LatheGeometry(prof.map(([y, r]) => new THREE.Vector2(Math.max(0.0001, r), y)), radial); }
function segMatrix(a, b) {
  const d = b.clone().sub(a); const L = d.length();
  _q.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return { m: new THREE.Matrix4().compose(a, _q, _s), L };
}
function ellipsoid(rx, ry, rz, seg = 16) { const g = new THREE.SphereGeometry(1, seg, Math.max(6, seg * 0.75 | 0)); g.scale(rx, ry, rz); return g; }
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
// Tapered tube through points (hair clumps, straps, cables)
function taperTube(pts, r0, r1, radial = 6, flat = 1) {
  const curve = new THREE.CatmullRomCurve3(pts);
  const N = Math.max(4, pts.length * 3);
  const frames = curve.computeFrenetFrames(N, false);
  const pos = [], idx = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, p = curve.getPointAt(t), r = r0 + (r1 - r0) * t;
    const nrm = frames.normals[i], bin = frames.binormals[i];
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const cx = Math.cos(a) * r, cy = Math.sin(a) * r * flat;
      pos.push(p.x + nrm.x * cx + bin.x * cy, p.y + nrm.y * cx + bin.y * cy, p.z + nrm.z * cx + bin.z * cy);
    }
  }
  const W = radial + 1;
  for (let i = 0; i < N; i++) for (let j = 0; j < radial; j++) { const a = i * W + j, b = a + 1, c = a + W, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// Head: sculpted sphere — cranium, brow ridge, eye sockets, cheekbones, jaw angle, chin.
function headGeo(seg) {
  const g = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const low = Math.max(0, -y), front = Math.max(0, z);
    x *= 1 - 0.32 * low * low - 0.04 * low;                       // jaw taper
    z *= 1 - 0.1 * low * low;
    z += 0.13 * low * front;                                       // chin forward
    z *= z < 0 ? 1.08 + 0.06 * Math.max(0, y) : 1;                 // fuller cranium
    // brow ridge
    const brow = Math.exp(-Math.pow((y - 0.22) / 0.09, 2)) * Math.exp(-Math.pow(x / 0.55, 2)) * front;
    z += brow * 0.05;
    // eye sockets
    for (const sx of [-1, 1]) {
      const d = Math.hypot((x - sx * 0.36) / 0.2, (y - 0.06) / 0.14);
      z -= Math.exp(-d * d) * 0.05 * front;
    }
    // cheekbones
    const cheek = Math.exp(-Math.pow((y + 0.08) / 0.16, 2)) * Math.exp(-Math.pow((Math.abs(x) - 0.62) / 0.18, 2)) * front;
    x += Math.sign(x) * cheek * 0.035; z += cheek * 0.02;
    // jaw angle
    const jaw = Math.exp(-Math.pow((y + 0.55) / 0.15, 2)) * Math.exp(-Math.pow((Math.abs(x) - 0.55) / 0.2, 2));
    x += Math.sign(x) * jaw * 0.04;
    y *= y > 0 ? 0.97 : 1.0;
    P.setXYZ(i, x * 0.105, y * 0.122, z * 0.112);
  }
  g.computeVertexNormals();
  return g;
}
// Smooth body surface from superelliptic rings; optional open bottom (for garment hems)
function profileSurface(prof, seg = 24, capBottom = true, sub = 3) {
  const pos = [], idx = [];
  const rings = [];
  for (let i = 0; i < prof.length - 1; i++) for (let k = 0; k < sub; k++) { const t = k / sub; const a = prof[i], b = prof[i + 1]; rings.push(a.map((v, j) => v + (b[j] - v) * (t * t * (3 - 2 * t)))); }
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
  if (capBottom) { const base = pos.length / 3; pos.push(0, rings[0][0] - 0.01, 0); for (let s = 0; s < seg; s++) idx.push(base, s, s + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// Boot: sculpted from a rounded box — toe box, heel, ankle
function bootGeo(len, w, h) {
  const g = roundedBox(w, h, len, Math.min(w, h) * 0.45, 3);
  const P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    let x = P.getX(i), y = P.getY(i), z = P.getZ(i);
    const tz = (z / (len / 2)); // -1 heel .. 1 toe
    const toe = Math.max(0, tz);
    y -= toe * toe * (y + h / 2) * 0.45;       // toe slopes down
    x *= 1 - Math.max(0, -tz) * 0.15 + toe * 0.05;
    if (y > 0) z -= toe * 0.02;
    P.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

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
export function buildCharacter(lookIn = {}, { lods = true } = {}) {
  const L = defaultLook(lookIn);
  const kid = L.kid; const H = (kid ? 0.62 : 1) * L.height;
  const bw = 0.88 + L.build * 0.28, fr = L.frame;
  const sh = (1.08 - fr * 0.16) * bw, hw = (0.92 + fr * 0.14) * bw;
  const headS = kid ? 1.25 : 1.0;
  const rest = {
    root: V(0, 0, 0), hips: V(0, 0.92, 0), spine: V(0, 1.03, 0), chest: V(0, 1.2, 0), neck: V(0, 1.4, 0), head: V(0, 1.468, 0),
    jaw: V(0, 1.515, 0.075), eyeL: V(0.042, 1.586, 0.092), eyeR: V(-0.042, 1.586, 0.092), browL: V(0.044, 1.623, 0.101), browR: V(-0.044, 1.623, 0.101),
    lidL: V(0.042, 1.586, 0.092), lidR: V(-0.042, 1.586, 0.092), cornerL: V(0.024, 1.527, 0.103), cornerR: V(-0.024, 1.527, 0.103),
    shoulderL: V(0.06 * sh, 1.35, 0), armL: V(0.18 * sh, 1.35, -0.005), foreL: V(0.185 * sh, 1.07, -0.005), handL: V(0.185 * sh, 0.82, 0), fingersL: V(0.185 * sh, 0.735, 0.01),
    shoulderR: V(-0.06 * sh, 1.35, 0), armR: V(-0.18 * sh, 1.35, -0.005), foreR: V(-0.185 * sh, 1.07, -0.005), handR: V(-0.185 * sh, 0.82, 0), fingersR: V(-0.185 * sh, 0.735, 0.01),
    thighL: V(0.09 * hw, 0.88, 0), shinL: V(0.095 * hw, 0.47, 0.005), footL: V(0.095 * hw, 0.075, 0), toeL: V(0.095 * hw, 0.03, 0.12),
    thighR: V(-0.09 * hw, 0.88, 0), shinR: V(-0.095 * hw, 0.47, 0.005), footR: V(-0.095 * hw, 0.075, 0), toeR: V(-0.095 * hw, 0.03, 0.12),
    hair1: V(0, 1.648, -0.11), hair2: V(0, 1.508, -0.14),
  };
  if (headS !== 1) { const pv = rest.head.clone(); for (const n of ['jaw', 'eyeL', 'eyeR', 'browL', 'browR', 'lidL', 'lidR', 'cornerL', 'cornerR', 'hair1', 'hair2']) rest[n].sub(pv).multiplyScalar(headS).add(pv); }

  const bones = BONES.map(n => { const b = new THREE.Bone(); b.name = n; return b; });
  BONES.forEach((n, i) => { const p = PARENT[n]; if (p) { bones[B[p]].add(bones[i]); bones[i].position.copy(rest[n]).sub(rest[p]); } else bones[i].position.copy(rest[n]); });
  const skeleton = new THREE.Skeleton(bones);
  const group = new THREE.Group(); group.scale.setScalar(H);
  const holder = new THREE.Group(); group.add(holder);
  holder.add(bones[0]);
  holder.updateMatrixWorld(true);
  skeleton.calculateInverses();
  const meshes = {};
  for (const lod of (lods ? ['high', 'low'] : ['high'])) {
    const geo = buildBody(L, rest, { sh, hw, bw, fr, headS, kid }, lod);
    const mesh = new THREE.SkinnedMesh(geo, characterMaterial());
    holder.add(mesh); mesh.updateMatrixWorld(true);
    mesh.bind(skeleton, mesh.matrixWorld.clone());
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
    meshes[lod] = mesh;
  }
  if (meshes.low) meshes.low.visible = false;
  const bonesBy = Object.fromEntries(BONES.map((n, i) => [n, bones[i]]));
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
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.1, 0.02), ring.material); strip.position.set(0.048, -0.12, 0.0); bonesBy.foreL.add(strip);
  }
  const char = { group, mesh: meshes.high, meshLow: meshes.low, bones: bonesBy, boneList: bones, rest, look: L, sockets, height: H * 1.73, lod: 'high' };
  char.setLOD = (lod) => { if (!meshes.low || char.lod === lod) return; char.lod = lod; meshes.high.visible = lod === 'high'; meshes.low.visible = lod === 'low'; };
  return char;
}

// ----------------------------------------------------------------- body
function buildBody(L, rest, P, lod) {
  const { sh, hw, bw, fr, headS, kid } = P;
  const hi = lod === 'high';
  const S = hi ? 1 : 0.55; // segment scale
  const seg = (n) => Math.max(5, Math.round(n * S));
  const M = new Mesher(lod);
  const C = c => new THREE.Color(c);
  const skin = C(L.skin), hair = C(L.hair);
  const skinDark = skin.clone().multiplyScalar(0.84), skinWarm = skin.clone().lerp(C('#c0504a'), 0.12);
  const lip = skin.clone().lerp(C('#9a3b3b'), 0.32).multiplyScalar(0.92);
  const prim = C(L.primary), sec = C(L.secondary), pants = C(L.pants), boots = C(L.boots), gloves = C(L.gloves);
  const outfit = L.outfit;
  let torsoC = prim, sleeveC = prim, foreC = prim, handC = skin, thighC = pants, shinC = pants;
  let torsoMat = MAT.cloth, legMat = MAT.canvas, handMat = MAT.skin;
  if (outfit === 'runner') { handC = gloves; handMat = MAT.leather; torsoMat = MAT.canvas; }
  if (outfit === 'runnerLight') { foreC = skin; torsoMat = MAT.canvas; }
  if (outfit === 'engineer' || outfit === 'worker') { thighC = prim; shinC = prim; foreC = skin; torsoMat = MAT.canvas; }
  if (outfit === 'casual' || outfit === 'vendor' || outfit === 'smart') { foreC = L.tank ? skin : prim; torsoMat = outfit === 'casual' ? MAT.knit : MAT.cloth; }
  if (L.tank) { sleeveC = skin; foreC = skin; }
  const w1 = b => [[B[b], 1]];
  const blend = (a, b, fn) => (lp, v) => { const t = fn(lp, v); return [[B[a], 1 - t], [B[b], t]]; };
  const torsoW = (lp, v) => { const a = smooth(0.94, 1.08, v.y), b = smooth(1.1, 1.22, v.y), n = smooth(1.36, 1.42, v.y) * 0.3; return [[B.hips, 1 - a], [B.spine, a * (1 - b)], [B.chest, a * b * (1 - n)], [B.neck, n]]; };
  // garment colour with seams: darker lines at side seams and the waist
  const seamed = (base, lineAt = []) => (lp, v) => { let k = 1; if (Math.abs(Math.abs(v.x) - 0.155 * sh) < 0.004) k = 0.78; for (const y of lineAt) if (Math.abs(v.y - y) < 0.004) k = 0.78; return base.clone().multiplyScalar(k); };

  // --- torso (skin body underneath is implied; garments are the visible surface)
  const bust = fr > 0.55 && !kid ? (fr - 0.55) * 0.07 : 0;
  const prof = [
    [0.80, 0.06 * hw, 0.05, 0.05, 2], [0.83, 0.13 * hw, 0.085, 0.1, 2.2], [0.88, 0.158 * hw, 0.1, 0.12, 2.4], [0.95, 0.158 * hw, 0.098, 0.108, 2.4],
    [1.03, 0.133 * (bw * 0.6 + 0.4), 0.092, 0.092, 2.3], [1.12, 0.148 * sh, 0.1 + bust * 0.4, 0.1, 2.5], [1.21, 0.165 * sh, 0.114 + bust, 0.105, 2.7],
    [1.29, 0.172 * sh, 0.106 + bust * 0.5, 0.1, 2.9], [1.35, 0.16 * sh, 0.09, 0.092, 2.8], [1.395, 0.11 * sh, 0.07, 0.072, 2.3], [1.42, 0.055, 0.05, 0.05, 2],
  ];
  M.add(profileSurface(prof, seg(28), true, hi ? 3 : 2), T(0, 0, 0), (lp, v) => (v.y < 0.935 ? thighC : (L.tank && v.y > 1.33 ? skin : torsoC)).clone().multiplyScalar(Math.abs(Math.abs(v.x) - 0.15 * sh) < 0.005 && v.y > 0.95 ? 0.8 : 1), torsoW, (lp, v) => (v.y < 0.935 ? legMat : (L.tank && v.y > 1.33 ? MAT.skin : torsoMat)));
  // neck
  { const s = segMatrix(V(0, 1.36, -0.005), V(0, 1.53, 0.0)); M.add(taperCapsule(0.056, 0.05, s.L, seg(14)), s.m, skin, blend('chest', 'neck', (lp) => smooth(0.0, 0.08, lp.y) * 0.8 + smooth(0.1, 0.17, lp.y) * 0.2), MAT.skin); }
  // --- head
  const hp = rest.head;
  const HM = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(V(x, y, z).multiplyScalar(headS).add(hp), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(headS, headS, headS));
  const HMS = (x, y, z, rx, ry, rz, sx, sy, sz) => new THREE.Matrix4().compose(V(x, y, z).multiplyScalar(headS).add(hp), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx * headS, sy * headS, sz * headS));
  const rel = (n) => rest[n].clone().sub(hp).divideScalar(headS);
  // face colour: blush on cheeks, slightly darker around the eyes and jaw
  const faceCol = (lp, v, n) => { const c = skin.clone(); const cheek = Math.exp(-Math.pow((lp.y + 0.1) / 0.18, 2)) * Math.exp(-Math.pow((Math.abs(lp.x) - 0.55) / 0.2, 2)) * Math.max(0, lp.z); c.lerp(skinWarm, cheek * 1.4); if (lp.y < -0.5) c.multiplyScalar(0.96); return c; };
  M.add(headGeo(hi ? 36 : 16), HMS(0, 0.125, 0.008, 0, 0, 0, 1, 1, 1), faceCol, w1('head'), MAT.skin);
  // nose: bridge, tip, wings
  { const a = V(0, 0.135, 0.106), b2 = V(0, 0.094, 0.121); const s = segMatrix(a, b2); M.add(taperCapsule(0.0075, 0.0105, s.L, seg(8), 2), HM(0, 0, 0).multiply(s.m), skin, w1('head'), MAT.skin); }
  M.add(ellipsoid(0.0115, 0.0105, 0.011, seg(10)), HM(0, 0.089, 0.12), skin.clone().lerp(skinWarm, 0.3), w1('head'), MAT.skin);
  for (const sx of [-1, 1]) M.add(ellipsoid(0.0065, 0.006, 0.0065, seg(8)), HM(sx * 0.0105, 0.0855, 0.1135), skin.clone().lerp(skinDark, 0.5), w1('head'), MAT.skin);
  // ears with a fold
  for (const sx of [-1, 1]) { M.add(ellipsoid(0.012, 0.028, 0.02, seg(10)), HM(sx * 0.104, 0.11, -0.004, 0, sx * 0.3, 0), skin, w1('head'), MAT.skin); if (hi) M.add(ellipsoid(0.006, 0.018, 0.012, 8), HM(sx * 0.113, 0.11, -0.002, 0, sx * 0.3, 0), skinDark, w1('head'), MAT.skin); }
  // eyes (glossy), iris ring, pupil, catchlight; upper lids on lid bones; lower lids static
  const iris = C(L.eyes);
  for (const [bn, sx] of [['eyeL', 1], ['eyeR', -1]]) {
    const e = rel(bn);
    M.add(ellipsoid(0.0245, 0.0245, 0.019, seg(16)), HM(e.x, e.y, e.z), C('#f2eee6'), w1(bn), MAT.eye);
    M.add(ellipsoid(0.0158, 0.0158, 0.006, seg(16)), HM(e.x, e.y, e.z + 0.0152), (lp) => { const t = Math.min(1, Math.hypot(lp.x, lp.y) / 0.0158); return iris.clone().multiplyScalar(1.25 - 0.75 * t * t * t); }, w1(bn), MAT.eye);
    M.add(ellipsoid(0.0074, 0.0074, 0.003, seg(10)), HM(e.x, e.y, e.z + 0.0198), C('#090808'), w1(bn), MAT.eye);
    M.add(ellipsoid(0.0035, 0.0035, 0.002, 6), HM(e.x + 0.006, e.y + 0.007, e.z + 0.021), C('#ffffff'), w1(bn), MAT.eye);
    if (hi) {
      const lidName = bn === 'eyeL' ? 'lidL' : 'lidR';
      const lidG = new THREE.SphereGeometry(0.0268, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.3); // cap over the top of the eye
      M.add(lidG, HMS(e.x, e.y, e.z, -0.1, 0, 0, 1, 1, 0.85), skin, w1(lidName), MAT.skin);
      // lash line along the lid edge
      const lash = new THREE.TorusGeometry(0.026, 0.0017, 4, 18, Math.PI); M.add(lash, HMS(e.x, e.y + 0.0155, e.z + 0.002, Math.PI / 2 - 0.25, 0, 0, 0.82, 0.7, 1), C('#1a1412'), w1(lidName), MAT.hair);
      const lower = new THREE.SphereGeometry(0.026, 14, 6, 0, Math.PI * 2, Math.PI * 0.78, Math.PI * 0.22);
      M.add(lower, HMS(e.x, e.y, e.z, -0.1, 0, 0, 1, 1, 0.85), skin, w1('head'), MAT.skin);
    }
    // brows: tapered strokes
    const bb = rel(bn === 'eyeL' ? 'browL' : 'browR');
    const browC = L.brows ? C(L.brows) : hair.clone().multiplyScalar(0.75);
    const bpts = [V(-sx * 0.019, -0.002, -0.002), V(0, 0.003, 0.002), V(sx * 0.02, -0.003, -0.004)].map(p => p.add(bb));
    M.add(taperTube(bpts, 0.0052, 0.0028, hi ? 6 : 4, 0.55), HM(0, 0, 0), browC, w1(bn === 'eyeL' ? 'browL' : 'browR'), MAT.hair);
  }
  // mouth: interior, teeth, lips with corners
  { const j = rel('jaw');
    M.add(ellipsoid(0.019, 0.007, 0.009, seg(12)), HM(j.x, j.y + 0.003, j.z + 0.018), C('#3a1212'), w1('jaw'), MAT.lips);
    if (hi) M.add(roundedBox(0.026, 0.005, 0.006, 0.002, 1), HM(j.x, j.y + 0.0085, j.z + 0.021), C('#e8e2d6'), w1('head'), MAT.eye);
    const lipW = (lp, v) => { const side = (v.x - hp.x) / headS; const k = smooth(0.008, 0.02, Math.abs(side)); return side > 0 ? [[B.cornerL, k], [B.head, 1 - k]] : [[B.cornerR, k], [B.head, 1 - k]]; };
    const lipWJ = (lp, v) => { const side = (v.x - hp.x) / headS; const k = smooth(0.008, 0.02, Math.abs(side)); return side > 0 ? [[B.cornerL, k], [B.jaw, 1 - k]] : [[B.cornerR, k], [B.jaw, 1 - k]]; };
    M.add(ellipsoid(0.022, 0.0046, 0.0085, seg(16)), HM(j.x, j.y + 0.0095, j.z + 0.02), lip, lipW, MAT.lips);
    M.add(ellipsoid(0.019, 0.0058, 0.0085, seg(16)), HM(j.x, j.y - 0.0015, j.z + 0.0185), lip, lipWJ, MAT.lips);
    // chin & philtrum hint
  }
  if (L.freckles) for (let i = 0; i < (hi ? 18 : 8); i++) { const r = rng(i + 3); const sx = r.sign(); M.add(ellipsoid(0.003, 0.003, 0.002, 4), HM(sx * (0.026 + r() * 0.04), 0.08 + r() * 0.025, 0.104 - r() * 0.012), skin.clone().multiplyScalar(0.72), w1('head'), MAT.skin); }
  buildHair(M, L, HM, hair, rest, hp, headS, hi);
  if (L.beard) {
    const bc = hair.clone().multiplyScalar(0.92);
    M.add(ellipsoid(0.09, 0.05, 0.075, seg(16)), HM(0, 0.043, 0.05), bc, w1('jaw'), MAT.hair);
    M.add(ellipsoid(0.1, 0.06, 0.085, seg(16)), HM(0, 0.072, 0.018), bc, w1('head'), MAT.hair);
    M.add(taperTube([V(-0.026, 0.078, 0.111), V(0, 0.083, 0.118), V(0.026, 0.078, 0.111)], 0.007, 0.007, 6, 0.7), HM(0, 0, 0), bc, w1('head'), MAT.hair);
  }
  if (L.glasses) {
    const fc = C('#1d1d1f');
    for (const sx of [-1, 1]) M.add(new THREE.TorusGeometry(0.021, 0.0028, 6, 18), HM(sx * 0.042, 0.112, 0.121), fc, w1('head'), MAT.metal);
    M.add(new THREE.BoxGeometry(0.022, 0.004, 0.004), HM(0, 0.116, 0.124), fc, w1('head'), MAT.metal);
    for (const sx of [-1, 1]) M.add(new THREE.BoxGeometry(0.004, 0.004, 0.1), HM(sx * 0.064, 0.115, 0.072), fc, w1('head'), MAT.metal);
  }
  if (L.goggles) {
    M.add(new THREE.TorusGeometry(0.118, 0.009, 6, seg(28)), HM(0, 0.19, 0.0, Math.PI / 2 + 0.35, 0, 0), C('#3a3330'), w1('head'), MAT.leather);
    for (const sx of [-1, 1]) { M.add(new THREE.CylinderGeometry(0.026, 0.028, 0.02, seg(14)), HM(sx * 0.038, 0.2, 0.102, Math.PI / 2 - 0.6, 0, 0), C('#6a5a48'), w1('head'), MAT.metal); M.add(new THREE.CylinderGeometry(0.02, 0.02, 0.022, seg(14)), HM(sx * 0.038, 0.203, 0.106, Math.PI / 2 - 0.6, 0, 0), C('#3f8aa8'), w1('head'), MAT.eye); }
  }
  if (L.earrings) for (const sx of [-1, 1]) M.add(new THREE.TorusGeometry(0.008, 0.0018, 4, 10), HM(sx * 0.108, 0.078, 0.0), C('#d8b45a'), w1('head'), MAT.metal);

  // --- arms
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    const a0 = rest['arm' + s], e0 = rest['fore' + s], h0 = rest['hand' + s];
    const ua = segMatrix(a0, e0);
    const sleeveMat = sleeveC === skin ? MAT.skin : torsoMat;
    M.add(taperCapsule(0.055 * bw, 0.045 * bw, ua.L, seg(14)), ua.m, sleeveC, (lp) => { const t = lp.y / ua.L; return [[B['arm' + s], 1 - smooth(0.78, 1.05, t) * 0.5 - (1 - smooth(-0.1, 0.18, t)) * 0.3], [B['shoulder' + s], (1 - smooth(-0.1, 0.18, t)) * 0.3], [B['fore' + s], smooth(0.78, 1.05, t) * 0.5]]; }, sleeveMat);
    M.add(ellipsoid(0.052 * bw, 0.048, 0.05, seg(12)), T(a0.x - sx * 0.018, a0.y - 0.004, a0.z), sleeveC, () => [[B['arm' + s], 0.6], [B['shoulder' + s], 0.4]], sleeveMat);
    const fa = segMatrix(e0, h0.clone().add(V(0, 0.02, 0)));
    M.add(taperCapsule(0.045 * bw, 0.034 * bw, fa.L, seg(14)), fa.m, foreC, (lp) => { const t = lp.y / fa.L; return [[B['fore' + s], 1 - (1 - smooth(-0.05, 0.22, t)) * 0.5 - smooth(0.85, 1.1, t) * 0.3], [B['arm' + s], (1 - smooth(-0.05, 0.22, t)) * 0.5], [B['hand' + s], smooth(0.85, 1.1, t) * 0.3]]; }, foreC === skin ? MAT.skin : torsoMat);
    // sleeve cuff / rolled sleeve
    if (foreC !== skin) M.add(new THREE.TorusGeometry(0.039 * bw, 0.009, 6, seg(14)), TR(h0.x, h0.y + 0.035, h0.z, Math.PI / 2, 0, 0), outfit === 'runner' ? sec : foreC.clone().multiplyScalar(0.8), w1('fore' + s), torsoMat);
    else if (sleeveC !== skin) M.add(new THREE.TorusGeometry(0.048 * bw, 0.014, 6, seg(14)), TR(e0.x, e0.y + 0.03, e0.z, Math.PI / 2, 0, 0), sleeveC.clone().multiplyScalar(0.85), w1('arm' + s), torsoMat);
    // hand: palm, fingers on the curl bone, thumb
    M.add(roundedBox(0.05, 0.075, 0.082, 0.02, hi ? 2 : 1), T(h0.x, h0.y - 0.042, h0.z + 0.006), handC, w1('hand' + s), handMat);
    const fb = rest['fingers' + s];
    if (hi) {
      for (let f = 0; f < 4; f++) {
        const fz = h0.z + 0.034 - f * 0.021, fl = [0.055, 0.062, 0.058, 0.046][f];
        const pts = [V(fb.x, fb.y + 0.006, fz), V(fb.x + sx * 0.0, fb.y - fl * 0.5, fz + 0.004), V(fb.x - sx * 0.002, fb.y - fl, fz + 0.012)];
        M.add(taperTube(pts, 0.0095, 0.0075, 6), T(0, 0, 0), handC, w1('fingers' + s), handMat);
        M.add(ellipsoid(0.0078, 0.0078, 0.0078, 6), T(pts[2].x, pts[2].y, pts[2].z), handC, w1('fingers' + s), handMat);
      }
      const tp = [V(h0.x, h0.y - 0.03, h0.z + 0.04), V(h0.x - sx * 0.004, h0.y - 0.06, h0.z + 0.06), V(h0.x - sx * 0.006, h0.y - 0.085, h0.z + 0.064)];
      M.add(taperTube(tp, 0.012, 0.009, 6), T(0, 0, 0), handC, w1('hand' + s), handMat);
    } else {
      M.add(roundedBox(0.044, 0.055, 0.074, 0.018, 1), T(fb.x, fb.y - 0.024, fb.z), handC, w1('fingers' + s), handMat);
      const th = segMatrix(V(h0.x, h0.y - 0.02, h0.z + 0.04), V(h0.x, h0.y - 0.07, h0.z + 0.065)); M.add(taperCapsule(0.013, 0.011, th.L, 6, 2), th.m, handC, w1('hand' + s), handMat);
    }
    if (outfit === 'runner') M.add(new THREE.CylinderGeometry(0.04, 0.042, 0.03, seg(14)), T(h0.x, h0.y + 0.008, h0.z), handC.clone().multiplyScalar(0.8), w1('hand' + s), MAT.leather); // glove cuff
  }
  // Tether gauntlet (left forearm): bracer, coil housings, cable to the palm
  if (L.tetherArm) {
    const e0 = rest.foreL, h0 = rest.handL, my = (e0.y + h0.y) / 2 - 0.01;
    M.add(latheProfile([[-0.08, 0.051], [-0.07, 0.056], [0.06, 0.054], [0.075, 0.049]], seg(18)), T(e0.x, my, e0.z), C('#2b2e33'), w1('foreL'), MAT.metal);
    M.add(roundedBox(0.038, 0.12, 0.05, 0.012, 2), T(e0.x + 0.045, my, e0.z), C('#4a4f57'), w1('foreL'), MAT.metal);
    for (let k = 0; k < 3; k++) M.add(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 10), TR(e0.x + 0.065, my - 0.04 + k * 0.04, e0.z, 0, 0, Math.PI / 2), C('#c8692b'), w1('foreL'), MAT.metal);
    M.add(new THREE.TorusGeometry(0.056, 0.008, 6, seg(18)), TR(e0.x, h0.y + 0.055, e0.z, Math.PI / 2, 0, 0), C('#c8692b'), w1('foreL'), MAT.metal);
    if (hi) M.add(taperTube([V(e0.x + 0.03, h0.y + 0.05, e0.z + 0.04), V(e0.x + 0.02, h0.y + 0.0, e0.z + 0.05), V(e0.x + 0.01, h0.y - 0.04, e0.z + 0.04)], 0.005, 0.004, 5), T(0, 0, 0), C('#1a1a1a'), (lp, v) => [[B.foreL, smooth(h0.y - 0.02, h0.y + 0.04, v.y)], [B.handL, 1 - smooth(h0.y - 0.02, h0.y + 0.04, v.y)]], MAT.rubber);
  }

  // --- legs & boots
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    const t0 = rest['thigh' + s], k0 = rest['shin' + s], f0 = rest['foot' + s];
    const th = segMatrix(t0.clone().add(V(0, 0.02, 0)), k0);
    M.add(taperCapsule(0.079 * hw, 0.058 * bw, th.L, seg(14)), th.m, thighC, (lp) => { const t = lp.y / th.L; return [[B['thigh' + s], 1 - smooth(0.8, 1.05, t) * 0.5 - (1 - smooth(-0.05, 0.2, t)) * 0.35], [B.hips, (1 - smooth(-0.05, 0.2, t)) * 0.35], [B['shin' + s], smooth(0.8, 1.05, t) * 0.5]]; }, thighC === prim ? torsoMat : legMat);
    const sh2 = segMatrix(k0, f0.clone().add(V(0, 0.01, 0)));
    M.add(taperCapsule(0.058 * bw, 0.044 * bw, sh2.L, seg(14)), sh2.m, shinC, (lp) => { const t = lp.y / sh2.L; return [[B['shin' + s], 1 - (1 - smooth(-0.05, 0.18, t)) * 0.5 - smooth(0.88, 1.05, t) * 0.3], [B['thigh' + s], (1 - smooth(-0.05, 0.18, t)) * 0.5], [B['foot' + s], smooth(0.88, 1.05, t) * 0.3]]; }, shinC === prim ? torsoMat : legMat);
    // knee wrinkles (fabric folds) — a few soft rings behind the knee
    if (hi) for (let k = 0; k < 2; k++) M.add(new THREE.TorusGeometry(0.055 * bw, 0.005, 4, 14), TR(k0.x, k0.y - 0.03 - k * 0.04, k0.z - 0.004, Math.PI / 2 + 0.2, 0, 0), shinC.clone().multiplyScalar(0.85), w1('shin' + s), legMat);
    // boots: shaft, foot, sole with tread, toe cap, laces
    const casualShoe = outfit === 'casual' || outfit === 'smart';
    const bootTop = casualShoe ? 0.11 : 0.23;
    M.add(latheProfile([[0, 0.054], [bootTop * 0.5, 0.053 * bw], [bootTop, 0.059 * bw], [bootTop + 0.01, 0.06 * bw]], seg(14)), T(f0.x, f0.y - 0.02, f0.z - 0.006), boots, (lp, v) => [[B['shin' + s], smooth(0.05, 0.2, v.y)], [B['foot' + s], 1 - smooth(0.05, 0.2, v.y)]], MAT.leather);
    M.add(bootGeo(0.26, 0.098, 0.085), T(f0.x, 0.042, f0.z + 0.048), boots, (lp, v) => { const k = smooth(0.08, 0.16, v.z - f0.z); return [[B['toe' + s], k], [B['foot' + s], 1 - k]]; }, MAT.leather);
    M.add(roundedBox(0.104, 0.024, 0.27, 0.01, 1), T(f0.x, 0.012, f0.z + 0.048), C('#1a1714'), (lp, v) => { const k = smooth(0.08, 0.16, v.z - f0.z); return [[B['toe' + s], k], [B['foot' + s], 1 - k]]; }, MAT.rubber);
    if (hi) {
      for (let k = 0; k < 4; k++) M.add(new THREE.BoxGeometry(0.06, 0.004, 0.006), TR(f0.x, 0.07 + k * 0.022 * (casualShoe ? 0.4 : 1), f0.z + 0.095 - k * 0.022, -0.6, 0, 0), C('#d8c8a8'), w1('foot' + s), MAT.cloth);
      if (!casualShoe) M.add(new THREE.TorusGeometry(0.058 * bw, 0.006, 4, 14), TR(f0.x, f0.y + bootTop - 0.025, f0.z - 0.006, Math.PI / 2, 0, 0), boots.clone().multiplyScalar(0.7), w1('shin' + s), MAT.leather);
    }
    if (outfit === 'runner') {
      M.add(roundedBox(0.09, 0.1, 0.05, 0.02, 2), T(k0.x, k0.y - 0.03, k0.z + 0.056), C('#26282c'), w1('shin' + s), MAT.rubber);
      M.add(roundedBox(0.06, 0.1, 0.08, 0.015, 2), T(t0.x + sx * 0.075, 0.68, 0.01), pants.clone().multiplyScalar(0.8), w1('thigh' + s), MAT.canvas);
      M.add(roundedBox(0.062, 0.02, 0.082, 0.006, 1), T(t0.x + sx * 0.075, 0.735, 0.01), pants.clone().multiplyScalar(0.7), w1('thigh' + s), MAT.canvas); // pocket flap
    }
  }

  // --- outfit details
  if (outfit === 'runner' || outfit === 'runnerLight') {
    // jacket shell: a hem that flares over the hips, open at the bottom
    const jprof = [[0.83, 0.17 * hw, 0.112, 0.128, 2.4], [0.9, 0.168 * hw, 0.108, 0.124, 2.4], [0.97, 0.162 * hw, 0.104, 0.112, 2.4], [1.03, 0.142 * (bw * 0.6 + 0.4), 0.098, 0.098, 2.3]];
    M.add(profileSurface(jprof, seg(28), false, 2), T(0, 0, 0), seamed(prim, [0.86]), (lp, v) => { const t = smooth(0.84, 0.98, v.y); const lw = smooth(0.95, 0.84, v.y) * 0.35; return [[B.hips, 1 - t * 0.5 - lw], [B.spine, t * 0.5], [v.x > 0 ? B.thighL : B.thighR, lw]]; }, MAT.canvas);
    // standing collar (open front)
    M.add(new THREE.CylinderGeometry(0.072, 0.088, 0.075, seg(18), 1, true, 0.35, Math.PI * 2 - 0.7), T(0, 1.405, -0.006), prim.clone().multiplyScalar(0.82), blend('chest', 'neck', () => 0.25), MAT.canvas);
    M.add(new THREE.TorusGeometry(0.083, 0.008, 6, seg(20)), TR(0, 1.37, -0.005, Math.PI / 2, 0, 0), sec, w1('chest'), MAT.canvas);
    // shoulder yokes in the accent colour
    // zip + chest pocket
    M.add(new THREE.BoxGeometry(0.01, 0.46, 0.01), T(0.012, 1.13, 0.112), C('#151515'), torsoW, MAT.metal);
    M.add(roundedBox(0.075, 0.07, 0.014, 0.006, 1), T(-0.07, 1.27, 0.112), prim.clone().multiplyScalar(0.88), w1('chest'), MAT.canvas);
    // harness: leather straps with metal buckles
    for (const sx of [-1, 1]) M.add(new THREE.BoxGeometry(0.034, 0.32, 0.012), TR(sx * 0.07, 1.22, 0.116, 0, 0, sx * 0.12), C('#3b332b'), torsoW, MAT.leather);
    M.add(new THREE.BoxGeometry(0.21, 0.03, 0.012), T(0, 1.18, 0.12), C('#3b332b'), w1('chest'), MAT.leather);
    M.add(roundedBox(0.03, 0.03, 0.01, 0.004, 1), T(0, 1.18, 0.127), C('#b8b0a0'), w1('chest'), MAT.metal);
    // belt, buckle, pouches
    M.add(new THREE.TorusGeometry(0.153 * hw, 0.017, 6, seg(24)), TR(0, 0.95, 0, Math.PI / 2, 0, 0), C('#2a221b'), w1('hips'), MAT.leather);
    M.add(roundedBox(0.05, 0.036, 0.012, 0.005, 1), T(0, 0.95, 0.158), C('#b8a070'), w1('hips'), MAT.metal);
    for (const sx of [-1, 1]) { M.add(roundedBox(0.07, 0.08, 0.05, 0.015, 2), T(sx * 0.12 * hw, 0.92, 0.09), C('#3b332b'), w1('hips'), MAT.leather); M.add(roundedBox(0.072, 0.025, 0.052, 0.008, 1), T(sx * 0.12 * hw, 0.955, 0.091), C('#2e2822'), w1('hips'), MAT.leather); }
    if (L.backpack) {
      M.add(roundedBox(0.25, 0.3, 0.1, 0.03, 2), T(0, 1.22, -0.15), C('#3b3f45'), w1('chest'), MAT.canvas);
      M.add(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 10), TR(0, 1.39, -0.15, 0, 0, Math.PI / 2), sec, w1('chest'), MAT.canvas);
    }
  }
  if (outfit === 'casual' || outfit === 'smart' || outfit === 'vendor') {
    M.add(new THREE.CylinderGeometry(0.062, 0.08, 0.035, seg(16), 1, true), T(0, 1.39, 0), prim.clone().multiplyScalar(0.8), w1('chest'), torsoMat);
    const jprof = [[0.88, 0.165 * hw, 0.108, 0.12, 2.4], [0.95, 0.16 * hw, 0.104, 0.11, 2.4], [1.0, 0.142 * (bw * 0.6 + 0.4), 0.098, 0.098, 2.3]];
    if (!L.tank) M.add(profileSurface(jprof, seg(24), false, 2), T(0, 0, 0), prim.clone().multiplyScalar(0.94), blend('hips', 'spine', (lp, v) => smooth(0.9, 1.0, v.y) * 0.6), torsoMat);
    if (L.hood) M.add(ellipsoid(0.14, 0.07, 0.08, seg(12)), T(0, 1.42, -0.1), prim.clone().multiplyScalar(0.9), w1('chest'), torsoMat);
    if (outfit === 'smart') { M.add(new THREE.BoxGeometry(0.03, 0.3, 0.01), T(0, 1.2, 0.11), sec, w1('chest'), MAT.cloth); for (const sx of [-1, 1]) M.add(new THREE.BoxGeometry(0.05, 0.18, 0.01), TR(sx * 0.045, 1.3, 0.106, 0, 0, sx * 0.4), prim.clone().multiplyScalar(0.8), w1('chest'), MAT.cloth); }
    if (L.tank) { for (const sx of [-1, 1]) M.add(new THREE.BoxGeometry(0.03, 0.12, 0.012), TR(sx * 0.085, 1.37, 0.06, 0.4, 0, 0), prim, w1('chest'), torsoMat); }
  }
  if (outfit === 'engineer' || outfit === 'worker') {
    M.add(new THREE.CylinderGeometry(0.07, 0.09, 0.05, seg(16), 1, true), T(0, 1.39, 0), prim.clone().multiplyScalar(0.8), w1('chest'), MAT.canvas);
    M.add(new THREE.TorusGeometry(0.152 * hw, 0.02, 6, seg(20)), TR(0, 0.95, 0, Math.PI / 2, 0, 0), C('#3a2f22'), w1('hips'), MAT.leather);
    for (const sx of [-1, 1]) M.add(roundedBox(0.06, 0.09, 0.05, 0.015, 2), T(sx * 0.13 * hw, 0.9, 0.06), C('#5a4630'), w1('hips'), MAT.leather);
    M.add(roundedBox(0.09, 0.08, 0.02, 0.01, 1), T(0.07, 1.27, 0.112), prim.clone().multiplyScalar(0.85), w1('chest'), MAT.canvas);
    M.add(new THREE.BoxGeometry(0.008, 0.07, 0.006), T(0.05, 1.29, 0.124), C('#c8c8c0'), w1('chest'), MAT.metal); // pen
    if (outfit === 'worker') { M.add(ellipsoid(0.125, 0.06, 0.125, seg(16)), HM(0, 0.2, 0.01), C('#d8a020'), w1('head'), MAT.rubber); M.add(new THREE.CylinderGeometry(0.135, 0.135, 0.01, seg(18)), HM(0, 0.165, 0.015), C('#c89018'), w1('head'), MAT.rubber); }
  }
  if (L.vest) M.add(roundedBox(0.35 * sh, 0.25, 0.215, 0.08, 2), T(0, 1.2, -0.005), C(L.vest), blend('spine', 'chest', (lp, v) => smooth(1.08, 1.22, v.y)), MAT.canvas);
  if (L.apron) M.add(roundedBox(0.28 * hw, 0.5, 0.02, 0.01, 2), T(0, 0.92, 0.12 * bw), C(L.apron), (lp, v) => [[B.spine, smooth(0.85, 1.1, v.y)], [B.hips, 1 - smooth(0.85, 1.1, v.y)]], MAT.cloth);
  if (L.scarf) {
    M.add(new THREE.TorusGeometry(0.075, 0.03, 8, seg(18)), TR(0, 1.39, 0.01, Math.PI / 2 + 0.15, 0, 0), C(L.scarf), blend('chest', 'neck', () => 0.3), MAT.knit);
    M.add(roundedBox(0.06, 0.2, 0.025, 0.01, 2), TR(0.05, 1.25, 0.12, 0.1, 0, 0.1), C(L.scarf), w1('chest'), MAT.knit);
  }
  if (L.tiedJacket) {
    const tj = C(L.tiedJacket);
    M.add(new THREE.CylinderGeometry(0.16 * hw, 0.17 * hw, 0.07, seg(18), 1, true), T(0, 0.93, 0), tj, w1('hips'), MAT.canvas);
    M.add(roundedBox(0.3 * hw, 0.3, 0.03, 0.012, 2), T(0, 0.78, -0.125), tj, () => [[B.hips, 0.6], [B.thighL, 0.2], [B.thighR, 0.2]], MAT.canvas);
    for (const sx of [-1, 1]) M.add(roundedBox(0.05, 0.14, 0.04, 0.015, 2), TR(sx * 0.04, 0.86, 0.15, 0, 0, sx * 0.4), tj, w1('hips'), MAT.canvas);
  }
  if (L.coat) {
    const cc = C(L.coat);
    M.add(new THREE.CylinderGeometry(0.075, 0.09, 0.08, seg(16), 1, true), T(0, 1.4, -0.01), cc, w1('chest'), MAT.cloth);
    M.add(roundedBox(0.36 * sh, 0.28, 0.215, 0.085, 2), T(0, 1.25, -0.005), cc, blend('spine', 'chest', (lp, v) => smooth(1.12, 1.22, v.y)), MAT.cloth);
    for (const sx of [-1, 1]) M.add(roundedBox(0.05, 0.2, 0.01, 0.004, 1), TR(sx * 0.05, 1.3, 0.112, 0, 0, sx * 0.35), cc.clone().multiplyScalar(0.8), w1('chest'), MAT.cloth); // lapels
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      const g = new THREE.CylinderGeometry(0.105 * hw, 0.135 * hw, 0.5, seg(14), 4, true, sx > 0 ? -Math.PI * 0.05 : Math.PI * 0.95, Math.PI * 1.1);
      M.add(g, T(sx * 0.075, 0.74, -0.005), cc, (lp, v) => { const t = smooth(0.95, 0.5, v.y); return [[B.hips, 1 - t * 0.55], [B['thigh' + s], t * 0.55]]; }, MAT.cloth);
    }
    for (const s of ['L', 'R']) { const a0 = rest['arm' + s], e0 = rest['fore' + s]; const ua = segMatrix(a0, e0); M.add(taperCapsule(0.061 * bw, 0.05 * bw, ua.L, seg(14)), ua.m, cc, w1('arm' + s), MAT.cloth); const fa = segMatrix(e0, rest['hand' + s].clone().add(V(0, 0.05, 0))); M.add(taperCapsule(0.051 * bw, 0.045 * bw, fa.L, seg(14)), fa.m, cc, (lp) => [[B['fore' + s], 1 - (1 - smooth(0, 0.2, lp.y / fa.L)) * 0.5], [B['arm' + s], (1 - smooth(0, 0.2, lp.y / fa.L)) * 0.5]], MAT.cloth); }
  }
  return M.build();
}

// ----------------------------------------------------------------- hair
// High LOD: a groomed set of tapered clumps that follow the scalp. Low LOD: the cap only.
function buildHair(M, L, HM, hair, rest, hp, headS, hi) {
  const style = L.hairStyle;
  if (style === 'bald') return;
  const w = [[B.head, 1]];
  const r = rng(style.length * 17 + 3);
  const C0 = hair, C1 = hair.clone().multiplyScalar(0.78), C2 = hair.clone().lerp(new THREE.Color(1, 0.95, 0.85), 0.12);
  const RX = 0.118, RY = 0.133, RZ = 0.124, CY = 0.127;
  const cap = (scale, faceLine, backLine, sideLine) => {
    const g = new THREE.SphereGeometry(1, hi ? 30 : 16, hi ? 20 : 10);
    const P = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); P.setXYZ(i, v.x * RX * scale, v.y * RY * scale, v.z * RZ * scale); }
    const idx = g.index, keep = [], dir = new THREE.Vector3();
    for (let t = 0; t < idx.count; t += 3) {
      let ok = true;
      for (let k = 0; k < 3; k++) {
        dir.fromBufferAttribute(P, idx.getX(t + k)).normalize();
        if ((dir.z > 0.2 && dir.y < faceLine) || dir.y < backLine || (Math.abs(dir.x) > 0.55 && dir.y < sideLine && dir.z > -0.4)) { ok = false; break; }
      }
      if (ok) keep.push(idx.getX(t), idx.getX(t + 1), idx.getX(t + 2));
    }
    g.setIndex(keep); g.computeVertexNormals();
    return g;
  };
  if (style === 'shaved') { M.add(cap(1.015, 0.42, -0.25, 0.15), HM(0, CY, 0.006), C1, w, MAT.hair); return; }
  const longish = style === 'long' || style === 'braid';
  M.add(cap(1.05, style === 'swept' ? 0.5 : 0.53, longish ? -0.6 : -0.32, 0.1), HM(0, CY, 0.0), C1, w, MAT.hair);
  // scalp point from spherical angles: theta = around y (0 = front), phi = from top
  const scalp = (theta, phi, lift = 1.06) => V(Math.sin(phi) * Math.sin(theta) * RX * lift, CY + Math.cos(phi) * RY * lift, Math.sin(phi) * Math.cos(theta) * RZ * lift);
  // grow a clump along the scalp toward a flow target, with gravity for long hair
  const clump = (theta, phi, flowTo, len, thick, opts = {}) => {
    const pts = []; let p = scalp(theta, phi, 1.0);
    const segs = 5; const step = len / segs;
    for (let i = 0; i <= segs; i++) {
      pts.push(p.clone());
      const n = p.clone().sub(V(0, CY, 0)).normalize();
      let dir = flowTo.clone().sub(p);
      dir.addScaledVector(n, -dir.dot(n)); // tangent to the scalp
      if (opts.gravity) dir.y -= opts.gravity * (i / segs);
      dir.normalize();
      p = p.clone().addScaledVector(dir, step);
      // keep it lifted off the scalp (volume)
      const rel = p.clone().sub(V(0, CY, 0)); const ell = Math.hypot(rel.x / RX, rel.y / RY, rel.z / RZ);
      const lift = opts.lift ?? 1.07;
      if (ell < lift && p.y > (opts.minY ?? -1)) p = V(0, CY, 0).add(rel.multiplyScalar(lift / ell));
    }
    const col = r() < 0.33 ? C0 : r() < 0.5 ? C2 : C1;
    M.add(taperTube(pts, thick * 1.25, thick * 0.3, 5, 0.38), HM(0, 0, 0), col, w, MAT.hair);
  };
  if (!hi) {
    // low LOD: volume shapes only
    if (style === 'swept') M.add(ellipsoid(0.085, 0.045, 0.11, 10), HM(0.015, 0.228, 0.02, 0.15, 0, -0.2), C0, w, MAT.hair);
    if (style === 'bun') M.add(ellipsoid(0.05, 0.05, 0.05, 8), HM(0, 0.24, -0.1), C0, w, MAT.hair);
    if (style === 'curls') M.add(ellipsoid(0.135, 0.12, 0.135, 10), HM(0, 0.15, -0.005), C0, w, MAT.hair);
    if (longish) M.add(roundedBox(0.23, 0.26, 0.06, 0.03, 1), HM(0, 0.0, -0.1), C0, w, MAT.hair);
  } else {
    const back = V(0, CY - 0.02, -0.25), crownBack = V(0, CY + 0.05, -0.3);
    if (style === 'crop') {
      for (let i = 0; i < 110; i++) { const th = r() * Math.PI * 2, ph = 0.15 + Math.pow(r(), 0.8) * 1.15; if (Math.cos(th) > 0.35 && ph > 0.95) continue; const front = Math.cos(th) > 0.4; clump(th, ph, front ? V(Math.sin(th) * 0.3, CY - 0.05, 0.4) : back, 0.05 + r() * 0.03, 0.016 + r() * 0.006); }
    }
    if (style === 'swept') {
      for (let i = 0; i < 130; i++) { const th = r() * Math.PI * 2, ph = 0.1 + Math.pow(r(), 0.9) * 1.2; if (Math.cos(th) > 0.35 && ph > 0.95) continue; const top = ph < 0.75; clump(th, ph, top ? V(-0.2, CY + 0.12, -0.4) : back, top ? 0.1 + r() * 0.04 : 0.045, top ? 0.02 : 0.014, { lift: top ? 1.09 + r() * 0.03 : 1.04 }); }
    }
    if (style === 'ponytail' || style === 'braid') {
      const gather = rest.hair1.clone().sub(hp).divideScalar(headS);
      for (let i = 0; i < 80; i++) { const th = r() * Math.PI * 2, ph = 0.1 + r() * 1.3; if (Math.cos(th) > 0.35 && ph > 0.95) continue; clump(th, ph, gather, 0.09 + r() * 0.06, 0.016, { lift: 1.05 }); }
    }
    if (style === 'bun') {
      const top = V(0, CY + 0.12, -0.08);
      for (let i = 0; i < 70; i++) { const th = r() * Math.PI * 2, ph = 0.2 + r() * 1.2; if (Math.cos(th) > 0.35 && ph > 0.95) continue; clump(th, ph, top, 0.1, 0.017, { lift: 1.04 }); }
      for (let i = 0; i < 14; i++) { const a = r() * 6.28; M.add(taperTube([V(0, 0.24, -0.1), V(Math.cos(a) * 0.04, 0.25 + r() * 0.02, -0.1 + Math.sin(a) * 0.04), V(Math.cos(a + 1) * 0.03, 0.27, -0.1 + Math.sin(a + 1) * 0.03)], 0.016, 0.006, 5), HM(0, 0, 0), C0, w, MAT.hair); }
      M.add(ellipsoid(0.045, 0.042, 0.045, 12), HM(0, 0.245, -0.1), C1, w, MAT.hair);
    }
    if (style === 'curls') {
      for (let i = 0; i < 90; i++) {
        const th = r() * Math.PI * 2, ph = r() * 1.35; if (Math.cos(th) > 0.4 && ph > 0.95) continue;
        const c = scalp(th, ph, 1.08); const pts = [];
        const a0 = r() * 6.28, rad = 0.012 + r() * 0.008;
        for (let k = 0; k < 7; k++) { const a = a0 + k * 1.1; pts.push(c.clone().add(V(Math.cos(a) * rad, (k - 3) * 0.004, Math.sin(a) * rad))); }
        M.add(taperTube(pts, 0.011, 0.007, 5), HM(0, 0, 0), r() < 0.5 ? C0 : C2, w, MAT.hair);
      }
    }
    if (style === 'long') {
      for (let i = 0; i < 90; i++) { const th = r() * Math.PI * 2, ph = 0.1 + r() * 1.2; if (Math.cos(th) > 0.35 && ph > 0.95) continue; const side = Math.sin(th); clump(th, ph, V(side * 0.18, CY - 0.5, -0.12 - Math.abs(side) * 0.02), 0.25 + r() * 0.08, 0.02, { gravity: 0.8, lift: 1.05, minY: CY - 0.06 }); }
    }
    // a soft fringe for crop/ponytail/bun/long/braid
    if (['crop', 'ponytail', 'bun', 'long', 'braid'].includes(style)) for (let i = 0; i < 9; i++) { const a = -0.8 + i * 0.2; clump(a, 0.62 + r() * 0.1, V(Math.sin(a) * 0.3, CY + 0.02, 0.5), 0.05, 0.014, { lift: 1.04 }); }
  }
  if (style === 'ponytail' || style === 'braid') {
    const r0 = rest.hair1.clone(), r1 = rest.hair2.clone();
    M.add(new THREE.TorusGeometry(0.03, 0.008, 6, 12), TR(r0.x, r0.y - 0.01, r0.z, Math.PI / 2 - 0.4, 0, 0), new THREE.Color('#2a2a2a'), [[B.head, 1]], MAT.rubber);
    if (style === 'braid') { for (let i = 0; i < 7; i++) M.add(ellipsoid(0.026, 0.03, 0.026, hi ? 8 : 6), T(r1.x + (i % 2 ? 0.006 : -0.006), r1.y + 0.06 - i * 0.035, r1.z - i * 0.003), i % 2 ? C0 : C1, [[i < 2 ? B.hair1 : B.hair2, 1]], MAT.hair); }
    else {
      const N = hi ? 10 : 1;
      for (let k = 0; k < N; k++) {
        const off = hi ? V((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.02) : V(0, 0, 0);
        const pts = [r0.clone().add(off.clone().multiplyScalar(0.3)), r0.clone().lerp(r1, 0.5).add(off).add(V(0, 0, -0.03)), r1.clone().add(off), r1.clone().add(V(off.x * 1.5, -0.14, -0.02))];
        M.add(taperTube(pts, hi ? 0.017 : 0.04, 0.004, hi ? 5 : 8, hi ? 0.8 : 1), T(0, 0, 0), k % 2 ? C0 : C2, (lp, v) => { const t = smooth(r0.y, r1.y, v.y); return [[B.hair1, t], [B.hair2, 1 - t]]; }, MAT.hair);
      }
    }
  }
}
