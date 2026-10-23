// Procedural stylized humanoid (v2).
// One skinned body per LOD, sharing a single skeleton. Built from sculpted primitives with
// blended joint weights; per-vertex material ids drive the shading (skin, cloth, canvas,
// leather, metal, hair, eyes, rubber, lips) so fabric, leather and skin read differently.
// Face: lidded eyes, mouth corners, a jaw and expressive brows. Hands have fingers.
import * as THREE from 'three';
import { rng } from '../core/util.js';
import { ARM_A, LEG_A, TAG, FACE, sculptBody, sculptHead, sculptHair, sculptHands, garment } from './anatomy.js';

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
      .replace('#include <common>', '#include <common>\nattribute float aMat; attribute float aMatP; attribute float aMatN; attribute vec3 aColP; attribute vec3 aColN; attribute float aMask; attribute float aPair;\nvarying float vMat; varying float vMatP; varying float vMatN; varying vec3 vColP; varying vec3 vColN; varying float vMask; varying float vPair; varying vec3 vRest; varying vec3 vRestN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMat = aMat; vMatP = aMatP; vMatN = aMatN; vColP = aColP; vColN = aColN; vMask = aMask; vPair = aPair; vRest = position; vRestN = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uRim; varying float vMat; varying float vMatP; varying float vMatN; varying vec3 vColP; varying vec3 vColN; varying float vMask; varying float vPair; varying vec3 vRest; varying vec3 vRestN;
        float gMat;
        float ch(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float cn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(ch(i), ch(i+vec3(1,0,0)), f.x), mix(ch(i+vec3(0,1,0)), ch(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(ch(i+vec3(0,0,1)), ch(i+vec3(1,0,1)), f.x), mix(ch(i+vec3(0,1,1)), ch(i+vec3(1,1,1)), f.x), f.y), f.z); }
        float matIs(float id){ return 1.0 - step(0.5, abs(gMat - id)); }`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        // two-layer colour: an antialiased boundary from the interpolated signed distance
        // (only inside triangles whose vertices all describe the same boundary)
        gMat = vMat;
        if (vPair > 0.5 && fwidth(vPair) < 1e-4) {
          float wm = max(fwidth(vMask) * 0.8, 1e-5), kM = smoothstep(-wm, wm, vMask);
          diffuseColor.rgb = diffuse * mix(vColN, vColP, kM); gMat = kM > 0.5 ? vMatP : vMatN;
        }
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
          + mMetal * 0.28 + mHair * (0.56 + strands * 0.22) + mEye * 0.06 + mRubber * 0.95 + mLips * 0.35;`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mMetal * 0.85;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          // procedural micro-relief (heights in metres): weave, twill, knit, leather grain,
          // hair strands, skin pores; each band fades out once a pixel covers its period
          float fp = length(fwidth(vRest)) + 1e-6;
          float w1 = 1.0 - smoothstep(0.0003, 0.0011, fp), w2 = 1.0 - smoothstep(0.0012, 0.004, fp);
          float weave = sin(vRest.x * 4200.0) * sin(vRest.y * 4200.0 + vRest.z * 4200.0);
          float twill = sin((vRest.x + vRest.y + vRest.z) * 3200.0);
          float knit = sin(vRest.x * 2300.0 + sin(vRest.y * 1150.0) * 2.0) * sin(vRest.y * 1150.0);
          float pores = cn(vRest * 1700.0), wrink = cn(vRest * 140.0 + 3.0);
          float h = (mCloth * weave * 0.00007 + mCanvas * twill * 0.00009 + mKnit * knit * 0.00016 + mSkin * pores * 0.00003) * w1
                  + (mLeather * grain * 0.00012 + mHair * strands * 0.0004 + (mCloth + mCanvas + mKnit) * wrink * 0.00035 + mSkin * cn(vRest * 420.0) * 0.00004) * w2;
          vec3 dpx = dFdx(-vViewPosition), dpy = dFdy(-vViewPosition);
          float dhx = dFdx(h), dhy = dFdy(h);
          vec3 r1 = cross(dpy, normal), r2 = cross(normal, dpx);
          float det = dot(dpx, r1);
          vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
          normal = normalize(abs(det) * normal - grad);
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
  constructor(lod, A = null) { this.lod = lod; this.A = A; this.pos = []; this.nor = []; this.col = []; this.col2 = []; this.col3 = []; this.mask = []; this.pair = []; this.mat2 = []; this.mat3 = []; this.si = []; this.sw = []; this.idx = []; this.mat = []; }
  // Sculpted piece (already in bind space): positions via xf(i, out) or as stored.
  addSculpt(piece, color, mat, xf = null) {
    const { mesh, at } = piece, base = this.pos.length / 3, v = new THREE.Vector3(), c = new THREE.Color();
    for (let i = 0; i < mesh.count; i++) {
      v.set(mesh.pos[i * 3], mesh.pos[i * 3 + 1], mesh.pos[i * 3 + 2]);
      if (xf) xf(i, v, at);
      this.pos.push(v.x, v.y, v.z); this.nor.push(mesh.nrm[i * 3], mesh.nrm[i * 3 + 1], mesh.nrm[i * 3 + 2]);
      // display colour + the two sides of the nearest colour boundary
      const shown = at.mask[i] > 0 ? at.tag[i] : at.tag2[i];
      color(shown, at.aux[i], at.ao[i], c, v); this.col.push(c.r, c.g, c.b);
      color(at.tag[i], at.aux[i], at.ao[i], c, v); this.col2.push(c.r, c.g, c.b);
      color(at.tag2[i], at.aux[i], at.ao[i], c, v); this.col3.push(c.r, c.g, c.b);
      this.mask.push(at.mask[i]); this.pair.push(at.pair[i]);
      for (let k = 0; k < 4; k++) { this.si.push(at.si[i * 4 + k]); this.sw.push(at.sw[i * 4 + k]); }
      this.mat.push(mat(shown)); this.mat2.push(mat(at.tag[i])); this.mat3.push(mat(at.tag2[i]));
    }
    for (let t = 0; t < mesh.idx.length; t++) this.idx.push(base + mesh.idx[t]);
  }
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
      const cc = c || color(lp, v, n);
      const w = typeof weights === 'number' ? [[weights, 1]] : Array.isArray(weights) ? weights : weights(lp, v);
      const s = [0, 0, 0, 0], ww = [0, 0, 0, 0]; let tot = 0;
      for (let k = 0; k < Math.min(4, w.length); k++) { s[k] = w[k][0]; ww[k] = Math.max(0, w[k][1]); tot += ww[k]; }
      for (let k = 0; k < 4; k++) ww[k] /= tot || 1;
      if (this.A) { // rest space -> bind (A-pose) space by blending the bones' pose transforms
        let px = 0, py = 0, pz = 0, qx = 0, qy = 0, qz = 0;
        for (let k = 0; k < 4; k++) { if (!ww[k]) continue; const e = this.A[s[k]].elements;
          px += ww[k] * (e[0] * v.x + e[4] * v.y + e[8] * v.z + e[12]); py += ww[k] * (e[1] * v.x + e[5] * v.y + e[9] * v.z + e[13]); pz += ww[k] * (e[2] * v.x + e[6] * v.y + e[10] * v.z + e[14]);
          qx += ww[k] * (e[0] * n.x + e[4] * n.y + e[8] * n.z); qy += ww[k] * (e[1] * n.x + e[5] * n.y + e[9] * n.z); qz += ww[k] * (e[2] * n.x + e[6] * n.y + e[10] * n.z); }
        v.set(px, py, pz); n.set(qx, qy, qz).normalize();
      }
      this.pos.push(v.x, v.y, v.z); this.nor.push(n.x, n.y, n.z);
      this.col.push(cc.r, cc.g, cc.b); this.col2.push(cc.r, cc.g, cc.b); this.col3.push(cc.r, cc.g, cc.b); this.mask.push(1); this.pair.push(0);
      this.si.push(...s); this.sw.push(...ww);
      const mid = typeof mat === 'function' ? mat(lp, v) : mat; this.mat.push(mid); this.mat2.push(mid); this.mat3.push(mid);
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
    g.setAttribute('aMatP', new THREE.Float32BufferAttribute(this.mat2, 1));
    g.setAttribute('aMatN', new THREE.Float32BufferAttribute(this.mat3, 1));
    g.setAttribute('aColP', new THREE.Float32BufferAttribute(this.col2, 3));
    g.setAttribute('aColN', new THREE.Float32BufferAttribute(this.col3, 3));
    g.setAttribute('aMask', new THREE.Float32BufferAttribute(this.mask, 1));
    g.setAttribute('aPair', new THREE.Float32BufferAttribute(this.pair, 1));
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
  L.build = Math.round(L.build * 4) / 4;
  const kid = L.kid; const H = (kid ? 0.62 : 1) * L.height;
  const bw = 0.88 + L.build * 0.28, fr = L.frame;
  const sh = (1.08 - fr * 0.16) * bw, hw = (0.92 + fr * 0.14) * bw;
  const headS = kid ? 1.25 : 1.0;
  const rest = {
    root: V(0, 0, 0), hips: V(0, 0.92, 0), spine: V(0, 1.03, 0), chest: V(0, 1.2, 0), neck: V(0, 1.4, 0), head: V(0, 1.468, 0),
    jaw: V(0, 1.468, 0).add(V(...FACE.jaw)), eyeL: V(FACE.eye[0], 1.468 + FACE.eye[1], FACE.eye[2]), eyeR: V(-FACE.eye[0], 1.468 + FACE.eye[1], FACE.eye[2]),
    browL: V(FACE.brow[0], 1.468 + FACE.brow[1], FACE.brow[2]), browR: V(-FACE.brow[0], 1.468 + FACE.brow[1], FACE.brow[2]),
    lidL: V(FACE.eye[0], 1.468 + FACE.eye[1], FACE.eye[2]), lidR: V(-FACE.eye[0], 1.468 + FACE.eye[1], FACE.eye[2]),
    cornerL: V(FACE.corner[0], 1.468 + FACE.corner[1], FACE.corner[2]), cornerR: V(-FACE.corner[0], 1.468 + FACE.corner[1], FACE.corner[2]),
    shoulderL: V(0.06 * sh, 1.35, 0), armL: V(0.18 * sh, 1.35, -0.005), foreL: V(0.185 * sh, 1.07, -0.005), handL: V(0.185 * sh, 0.82, 0), fingersL: V(0.185 * sh, 0.735, 0.01),
    shoulderR: V(-0.06 * sh, 1.35, 0), armR: V(-0.18 * sh, 1.35, -0.005), foreR: V(-0.185 * sh, 1.07, -0.005), handR: V(-0.185 * sh, 0.82, 0), fingersR: V(-0.185 * sh, 0.735, 0.01),
    thighL: V(0.09 * hw, 0.88, 0), shinL: V(0.095 * hw, 0.47, 0.005), footL: V(0.095 * hw, 0.075, 0), toeL: V(0.095 * hw, 0.03, 0.12),
    thighR: V(-0.09 * hw, 0.88, 0), shinR: V(-0.095 * hw, 0.47, 0.005), footR: V(-0.095 * hw, 0.075, 0), toeR: V(-0.095 * hw, 0.03, 0.12),
    hair1: V(0, 1.468, 0).add(V(...FACE.hair1)), hair2: V(0, 1.468, 0).add(V(...FACE.hair2)),
  };
  if (headS !== 1) { const pv = rest.head.clone(); for (const n of ['jaw', 'eyeL', 'eyeR', 'browL', 'browR', 'lidL', 'lidR', 'cornerL', 'cornerR', 'hair1', 'hair2']) rest[n].sub(pv).multiplyScalar(headS).add(pv); }

  const bones = BONES.map(n => { const b = new THREE.Bone(); b.name = n; return b; });
  BONES.forEach((n, i) => { const p = PARENT[n]; if (p) { bones[B[p]].add(bones[i]); bones[i].position.copy(rest[n]).sub(rest[p]); } else bones[i].position.copy(rest[n]); });
  const skeleton = new THREE.Skeleton(bones);
  const group = new THREE.Group(); group.scale.setScalar(H);
  const holder = new THREE.Group(); group.add(holder);
  holder.add(bones[0]);
  // Bind in an A-pose (limbs spread, as the body is sculpted); A[i] maps rest -> bind space per bone.
  holder.updateMatrixWorld(true);
  const toHolder = new THREE.Matrix4().copy(holder.matrixWorld).invert();
  const restW = bones.map(b => toHolder.clone().multiply(b.matrixWorld));
  bones[B.armL].rotation.z = ARM_A; bones[B.armR].rotation.z = -ARM_A; bones[B.thighL].rotation.z = LEG_A; bones[B.thighR].rotation.z = -LEG_A;
  holder.updateMatrixWorld(true);
  const A = bones.map((b, i) => toHolder.clone().multiply(b.matrixWorld).multiply(restW[i].clone().invert()));
  skeleton.calculateInverses();
  for (const n of ['armL', 'armR', 'thighL', 'thighR']) bones[B[n]].rotation.z = 0;
  holder.updateMatrixWorld(true);
  const meshes = {};
  for (const lod of (lods ? ['high', 'low'] : ['high'])) {
    const geo = buildBody(L, rest, { sh, hw, bw, fr, headS, kid, A }, lod);
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
  const { sh, hw, bw, fr, headS, kid, A } = P;
  const hi = lod === 'high';
  const S = hi ? 1 : 0.55; // segment scale
  const seg = (n) => Math.max(5, Math.round(n * S));
  const M = new Mesher(lod, A);
  const C = c => new THREE.Color(c);
  const skin = C(L.skin), hair = C(L.hair);
  const skinDark = skin.clone().multiplyScalar(0.84), skinWarm = skin.clone().lerp(C('#c0504a'), 0.22);
  const lip = skin.clone().lerp(C('#9a4848'), 0.24).multiplyScalar(0.88);
  const prim = C(L.primary), sec = C(L.secondary), pants = C(L.pants), boots = C(L.boots), gloves = C(L.gloves);
  const outfit = L.outfit, G = garment(L);
  let torsoMat = MAT.cloth, legMat = MAT.canvas;
  if (outfit === 'runner' || outfit === 'runnerLight' || outfit === 'engineer' || outfit === 'worker') torsoMat = MAT.canvas;
  if (outfit === 'casual') torsoMat = MAT.knit;
  const w1 = b => [[B[b], 1]];
  const blend = (a, b, fn) => (lp, v) => { const t = fn(lp, v); return [[B[a], 1 - t], [B[b], t]]; };
  const torsoW = (lp, v) => { const a = smooth(0.94, 1.08, v.y), b = smooth(1.1, 1.22, v.y), n = smooth(1.36, 1.42, v.y) * 0.3; return [[B.hips, 1 - a], [B.spine, a * (1 - b)], [B.chest, a * b * (1 - n)], [B.neck, n]]; };

  // ---- sculpted body, head, hair and hands
  const solePale = outfit === 'casual' || outfit === 'smart';
  const pal = [];
  pal[TAG.SKIN] = skin; pal[TAG.LIP] = lip; pal[TAG.TOP] = prim; pal[TAG.TOPD] = prim.clone().multiplyScalar(0.7); pal[TAG.ACC] = sec;
  pal[TAG.PANTS] = pants; pal[TAG.PANTSD] = pants.clone().multiplyScalar(0.75); pal[TAG.BOOT] = boots; pal[TAG.BOOTD] = boots.clone().multiplyScalar(0.68);
  pal[TAG.SOLE] = solePale ? C('#a89c88') : C('#1c1916'); pal[TAG.GLOVE] = gloves; pal[TAG.HAIR] = hair; pal[TAG.NAIL] = skin.clone().lerp(C('#f4e4dc'), 0.35);
  pal[TAG.SCALP] = skin.clone().lerp(hair, 0.55).multiplyScalar(0.92);
  const color = (tag, aux, ao, c) => {
    c.copy(pal[tag] || prim);
    if (tag === TAG.SKIN) c.lerp(skinWarm, Math.min(1, aux) * 0.75);
    else if (tag === TAG.HAIR) c.multiplyScalar(1 - aux * 0.15);
    else if (tag !== TAG.LIP) c.multiplyScalar(1 - aux * 0.22);
    // baked occlusion; skin keeps some red in its shadows (scattering)
    const o = Math.max(0, Math.min(1, ao));
    if (tag === TAG.SKIN || tag === TAG.LIP) { c.r *= Math.pow(o, 0.55); c.g *= Math.pow(o, 1.05); c.b *= Math.pow(o, 1.2); }
    else if (tag === TAG.HAIR) c.multiplyScalar(0.35 + 0.65 * o * o);
    else c.multiplyScalar(0.2 + 0.8 * o);
  };
  const matOf = (tag) => tag === TAG.SKIN || tag === TAG.NAIL ? MAT.skin : tag === TAG.LIP ? MAT.lips : tag === TAG.HAIR || tag === TAG.SCALP ? MAT.hair
    : tag === TAG.PANTS || tag === TAG.PANTSD ? legMat : tag === TAG.BOOT || tag === TAG.BOOTD || tag === TAG.GLOVE ? MAT.leather : tag === TAG.SOLE ? MAT.rubber : torsoMat;
  const SP = { sh, hw, bw, fr, kid };
  // build deformation: base sculpt (sh = hw = bw = 1) -> this character, blended by skin weights
  const wst = bw * 0.6 + 0.4, dz1 = 0.85 + 0.15 * bw;
  const armAx = (s) => [s * Math.sin(ARM_A), -Math.cos(ARM_A)], legAx = (s) => [s * Math.sin(LEG_A), -Math.cos(LEG_A)];
  const limb = (x, y, z, px, py, ax, dx, r, out) => { // translate by dx, scale radially by r about the axis through (px, py)
    const qx = x - px, qy = y - py, t = qx * ax[0] + qy * ax[1];
    const rx = qx - ax[0] * t, ry = qy - ax[1] * t;
    out[0] = px + dx + ax[0] * t + rx * r; out[1] = py + ax[1] * t + ry * r; out[2] = z * r + (1 - r) * -0.003;
  };
  const tmp = [0, 0, 0];
  const deform = (i, v, at) => {
    const x = v.x, y = v.y, z = v.z; let ox = 0, oy = 0, oz = 0;
    for (let k = 0; k < 4; k++) {
      const w = at.sw[i * 4 + k]; if (!w) continue; const b = BONES[at.si[i * 4 + k]];
      let X = x, Y = y, Z = z;
      if (b === 'hips') { X = x * hw; Z = z * dz1; }
      else if (b === 'spine') { X = x * wst; Z = z * (0.7 + 0.3 * bw); }
      else if (b === 'chest' || b === 'shoulderL' || b === 'shoulderR') { X = x * sh; Z = z * dz1; }
      else if (b === 'armL' || b === 'foreL' || b === 'armR' || b === 'foreR') { const s1 = b.endsWith('L') ? 1 : -1; limb(x, y, z, s1 * 0.18, 1.35, armAx(s1), s1 * 0.18 * (sh - 1), bw, tmp); X = tmp[0]; Y = tmp[1]; Z = tmp[2]; }
      else if (b === 'handL' || b === 'fingersL') X = x + 0.18 * (sh - 1);
      else if (b === 'handR' || b === 'fingersR') X = x - 0.18 * (sh - 1);
      else if (b === 'thighL' || b === 'shinL' || b === 'thighR' || b === 'shinR') { const s1 = b.endsWith('L') ? 1 : -1; limb(x, y, z, s1 * 0.09, 0.88, legAx(s1), s1 * 0.09 * (hw - 1), 0.75 + 0.25 * bw, tmp); X = tmp[0]; Y = tmp[1]; Z = tmp[2]; }
      else if (b === 'footL' || b === 'toeL') X = x + 0.09 * (hw - 1);
      else if (b === 'footR' || b === 'toeR') X = x - 0.09 * (hw - 1);
      ox += w * X; oy += w * Y; oz += w * Z;
    }
    v.set(ox, oy, oz);
  };
  M.addSculpt(sculptBody(SP, L, B, lod), color, matOf, deform);
  const hands = sculptHands(SP, L, B, lod);
  M.addSculpt(hands.L, color, matOf, deform); M.addSculpt(hands.R, color, matOf, deform);
  const hp = rest.head;
  const headXf = (i, v) => { const k = 1 + (headS - 1) * smooth(-0.035, 0.04, v.y); v.multiplyScalar(k).add(hp); };
  M.addSculpt(sculptHead(SP, L, B, lod), color, matOf, headXf);
  const hairPiece = sculptHair(SP, L, B, lod);
  if (hairPiece) M.addSculpt(hairPiece, color, matOf, headXf);

  // --- head features
  const HM = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(V(x, y, z).multiplyScalar(headS).add(hp), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(headS, headS, headS));
  const HMS = (x, y, z, rx, ry, rz, sx, sy, sz) => new THREE.Matrix4().compose(V(x, y, z).multiplyScalar(headS).add(hp), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(sx * headS, sy * headS, sz * headS));
  const rel = (n) => rest[n].clone().sub(hp).divideScalar(headS);
  // eyes (glossy), iris ring, pupil, catchlight; upper lids on lid bones; lower lids static
  const iris = C(L.eyes);
  for (const [bn, sx] of [['eyeL', 1], ['eyeR', -1]]) {
    const e = rel(bn), R = FACE.eyeR;
    M.add(ellipsoid(R, R, R, seg(16)), HM(e.x, e.y, e.z), C('#e8e2d8'), w1(bn), MAT.eye);
    M.add(ellipsoid(0.0059, 0.0059, 0.0024, seg(16)), HM(e.x, e.y, e.z + R - 0.0012), (lp) => { const t = Math.min(1, Math.hypot(lp.x, lp.y) / 0.0059); return iris.clone().multiplyScalar(1.3 - 0.8 * t * t * t); }, w1(bn), MAT.eye);
    M.add(ellipsoid(0.0026, 0.0026, 0.0012, seg(10)), HM(e.x, e.y, e.z + R + 0.0008), C('#070606'), w1(bn), MAT.eye);
    M.add(ellipsoid(0.0011, 0.0011, 0.0006, 6), HM(e.x + 0.0018, e.y + 0.0022, e.z + R + 0.0012), C('#ffffff'), w1(bn), MAT.eye);
    if (hi) {
      const lidName = bn === 'eyeL' ? 'lidL' : 'lidR';
      const lidG = new THREE.SphereGeometry(R + 0.0011, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.36);
      M.add(lidG, HMS(e.x, e.y, e.z, -0.1, 0, 0, 1, 1, 0.92), skin.clone().multiplyScalar(0.93), w1(lidName), MAT.skin);
      const lash = new THREE.TorusGeometry(R * 0.98, 0.0008, 4, 18, Math.PI * 0.8); M.add(lash, HMS(e.x, e.y + R * 0.47, e.z + 0.0012, Math.PI / 2 - 0.3, 0, Math.PI * 0.1, 0.88, 0.8, 1), C('#1a1412'), w1(lidName), MAT.hair);
    }
    // brows: tapered strokes on the brow ridge
    const bb = rel(bn === 'eyeL' ? 'browL' : 'browR');
    const browC = L.brows ? C(L.brows) : hair.clone().multiplyScalar(0.75);
    const bpts = [V(-sx * 0.015, -0.0015, 0.0025), V(sx * 0.001, 0.0022, 0.0035), V(sx * 0.016, -0.0025, -0.0005)].map(p => p.add(bb));
    M.add(taperTube(bpts, 0.0046, 0.002, hi ? 6 : 4, 0.45), HM(0, 0, 0), browC, w1(bn === 'eyeL' ? 'browL' : 'browR'), MAT.hair);
  }
  // mouth interior and teeth behind the lips
  { const my = FACE.mouthY;
    M.add(ellipsoid(0.015, 0.0065, 0.009, seg(12)), HM(0, my - 0.001, 0.083), C('#2a0e0e'), w1('jaw'), MAT.lips);
    if (hi) { M.add(roundedBox(0.022, 0.0046, 0.006, 0.0018, 1), HM(0, my + 0.0022, 0.0875), C('#e2dccf'), w1('head'), MAT.eye); M.add(roundedBox(0.02, 0.004, 0.006, 0.0016, 1), HM(0, my - 0.0026, 0.0865), C('#d8d0c2'), w1('jaw'), MAT.eye); }
  }
  if (L.freckles) for (let i = 0; i < (hi ? 26 : 8); i++) { const r = rng(i + 3); const sx = r.sign(), fx = 0.012 + r() * 0.03; M.add(ellipsoid(0.0022, 0.0022, 0.0015, 4), HM(sx * fx, 0.07 + r() * 0.02, 0.087 - fx * 0.32), skin.clone().multiplyScalar(0.72), w1('head'), MAT.skin); }
  if (L.glasses) {
    const fc = C('#1d1d1f'), e = FACE.eye;
    for (const sx of [-1, 1]) M.add(new THREE.TorusGeometry(0.0168, 0.0018, 6, 20), HM(sx * e[0], e[1], 0.094), fc, w1('head'), MAT.metal);
    M.add(new THREE.BoxGeometry(0.014, 0.003, 0.003), HM(0, e[1] + 0.003, 0.095), fc, w1('head'), MAT.metal);
    for (const sx of [-1, 1]) M.add(new THREE.BoxGeometry(0.003, 0.003, 0.088), HM(sx * 0.0665, e[1] + 0.002, 0.048), fc, w1('head'), MAT.metal);
  }
  if (L.goggles) {
    M.add(new THREE.TorusGeometry(0.084, 0.007, 6, seg(28)), HMS(0, 0.182, -0.004, Math.PI / 2 + 0.35, 0, 0, 1, 1.2, 1), C('#3a3330'), w1('head'), MAT.leather);
    for (const sx of [-1, 1]) { M.add(new THREE.CylinderGeometry(0.02, 0.022, 0.016, seg(14)), HM(sx * 0.029, 0.19, 0.08, Math.PI / 2 - 0.6, 0, 0), C('#6a5a48'), w1('head'), MAT.metal); M.add(new THREE.CylinderGeometry(0.016, 0.016, 0.018, seg(14)), HM(sx * 0.029, 0.192, 0.083, Math.PI / 2 - 0.6, 0, 0), C('#3f8aa8'), w1('head'), MAT.eye); }
  }
  if (L.earrings) for (const sx of [-1, 1]) M.add(new THREE.TorusGeometry(0.0065, 0.0015, 4, 10), HM(sx * 0.078, 0.076, -0.008), C('#d8b45a'), w1('head'), MAT.metal);
  buildHairExtras(M, L, hair, rest, hi);

  // Tether gauntlet (left forearm): bracer, coil housings, cable to the palm
  if (L.tetherArm) {
    const e0 = rest.foreL, h0 = rest.handL, my = (e0.y + h0.y) / 2 - 0.01;
    M.add(latheProfile([[-0.08, 0.045], [-0.07, 0.05], [0.04, 0.053], [0.07, 0.058], [0.08, 0.055]], seg(18)), T(e0.x, my, e0.z), C('#2b2e33'), w1('foreL'), MAT.metal);
    M.add(roundedBox(0.036, 0.12, 0.048, 0.012, 2), T(e0.x + 0.042, my, e0.z), C('#4a4f57'), w1('foreL'), MAT.metal);
    for (let k = 0; k < 3; k++) M.add(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 10), TR(e0.x + 0.062, my - 0.04 + k * 0.04, e0.z, 0, 0, Math.PI / 2), C('#c8692b'), w1('foreL'), MAT.metal);
    M.add(new THREE.TorusGeometry(0.05, 0.007, 6, seg(18)), TR(e0.x, h0.y + 0.055, e0.z, Math.PI / 2, 0, 0), C('#c8692b'), w1('foreL'), MAT.metal);
    if (hi) M.add(taperTube([V(e0.x + 0.03, h0.y + 0.05, e0.z + 0.035), V(e0.x + 0.02, h0.y + 0.0, e0.z + 0.04), V(e0.x + 0.008, h0.y - 0.04, e0.z + 0.035)], 0.005, 0.004, 5), T(0, 0, 0), C('#1a1a1a'), (lp, v) => [[B.foreL, smooth(h0.y - 0.02, h0.y + 0.04, v.y)], [B.handL, 1 - smooth(h0.y - 0.02, h0.y + 0.04, v.y)]], MAT.rubber);
  }

  // --- legs: pads and pockets
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? 1 : -1;
    const t0 = rest['thigh' + s], k0 = rest['shin' + s];
    if (outfit === 'runner') {
      M.add(roundedBox(0.085, 0.1, 0.045, 0.02, 2), T(k0.x, k0.y - 0.025, k0.z + 0.058), C('#26282c'), w1('shin' + s), MAT.rubber);
      M.add(roundedBox(0.03, 0.022, 0.03, 0.006, 1), T(k0.x + sx * 0.0, k0.y - 0.025, k0.z + 0.078), C('#3a3d42'), w1('shin' + s), MAT.metal);
      M.add(roundedBox(0.055, 0.1, 0.075, 0.015, 2), T(t0.x + sx * 0.07 * hw, 0.68, 0.008), pants.clone().multiplyScalar(0.85), w1('thigh' + s), MAT.canvas);
      M.add(roundedBox(0.058, 0.022, 0.078, 0.006, 1), T(t0.x + sx * 0.071 * hw, 0.735, 0.008), pants.clone().multiplyScalar(0.72), w1('thigh' + s), MAT.canvas);
    }
  }

  // --- outfit details
  if (outfit === 'runner' || outfit === 'runnerLight') {
    // standing collar, open at the throat
    const collar = new THREE.LatheGeometry([[0.084, 0], [0.076, 0.03], [0.069, 0.052], [0.063, 0.055], [0.06, 0.05], [0.064, 0.03], [0.07, 0.0]].map(([r, y]) => new THREE.Vector2(r, y)), seg(28), 0.3, Math.PI * 2 - 0.6);
    M.add(collar, TRS(0, 1.386, -0.02, 0, 0, 0, 1, 1, 0.97), prim.clone().multiplyScalar(0.74), blend('chest', 'neck', (lp) => smooth(0.0, 0.05, lp.y) * 0.4), MAT.canvas);
    M.add(roundedBox(0.075, 0.07, 0.014, 0.006, 1), T(-0.068 * sh, 1.27, 0.103), prim.clone().multiplyScalar(0.86), w1('chest'), MAT.canvas);
    // harness: leather straps with metal buckles
    for (const sx of [-1, 1]) M.add(new THREE.BoxGeometry(0.032, 0.3, 0.012), TR(sx * 0.066 * sh, 1.23, 0.107, -0.06, 0, sx * 0.12), C('#3b332b'), torsoW, MAT.leather);
    M.add(new THREE.BoxGeometry(0.2 * sh, 0.028, 0.012), T(0, 1.165, 0.106), C('#3b332b'), w1('chest'), MAT.leather);
    M.add(roundedBox(0.03, 0.03, 0.01, 0.004, 1), T(0, 1.165, 0.113), C('#b8b0a0'), w1('chest'), MAT.metal);
    // belt, buckle, pouches
    M.add(new THREE.TorusGeometry(0.152 * hw, 0.016, 6, seg(24)), TRS(0, 0.955, -0.006, Math.PI / 2, 0, 0, 1, 0.74, 1), C('#2a221b'), w1('hips'), MAT.leather);
    M.add(roundedBox(0.05, 0.034, 0.012, 0.005, 1), T(0, 0.955, 0.111), C('#b8a070'), w1('hips'), MAT.metal);
    for (const sx of [-1, 1]) { M.add(roundedBox(0.068, 0.078, 0.045, 0.015, 2), T(sx * 0.11 * hw, 0.925, 0.085), C('#3b332b'), w1('hips'), MAT.leather); M.add(roundedBox(0.07, 0.024, 0.047, 0.008, 1), T(sx * 0.11 * hw, 0.96, 0.086), C('#2e2822'), w1('hips'), MAT.leather); }
    if (L.backpack) {
      M.add(roundedBox(0.25, 0.3, 0.1, 0.03, 2), T(0, 1.22, -0.16), C('#3b3f45'), w1('chest'), MAT.canvas);
      M.add(new THREE.CylinderGeometry(0.035, 0.035, 0.24, 10), TR(0, 1.39, -0.16, 0, 0, Math.PI / 2), sec, w1('chest'), MAT.canvas);
    }
  }
  if (outfit === 'casual' || outfit === 'smart' || outfit === 'vendor') {
    if (L.hood) M.add(ellipsoid(0.13, 0.065, 0.075, seg(12)), T(0, 1.42, -0.1), prim.clone().multiplyScalar(0.9), w1('chest'), torsoMat);
    if (outfit === 'smart') M.add(new THREE.BoxGeometry(0.03, 0.28, 0.01), T(0, 1.22, 0.106), sec, w1('chest'), MAT.cloth);
  }
  if (outfit === 'engineer' || outfit === 'worker') {
    M.add(new THREE.TorusGeometry(0.15 * hw, 0.018, 6, seg(20)), TRS(0, 0.955, -0.006, Math.PI / 2, 0, 0, 1, 0.74, 1), C('#3a2f22'), w1('hips'), MAT.leather);
    for (const sx of [-1, 1]) M.add(roundedBox(0.06, 0.09, 0.045, 0.015, 2), T(sx * 0.125 * hw, 0.9, 0.06), C('#5a4630'), w1('hips'), MAT.leather);
    M.add(roundedBox(0.09, 0.08, 0.016, 0.01, 1), T(0.068 * sh, 1.27, 0.104), prim.clone().multiplyScalar(0.85), w1('chest'), MAT.canvas);
    M.add(new THREE.BoxGeometry(0.008, 0.07, 0.006), T(0.05, 1.29, 0.114), C('#c8c8c0'), w1('chest'), MAT.metal); // pen
    if (outfit === 'worker') { M.add(ellipsoid(0.1, 0.055, 0.112, seg(16)), HM(0, 0.2, -0.008), C('#d8a020'), w1('head'), MAT.rubber); M.add(new THREE.CylinderGeometry(0.112, 0.112, 0.008, seg(18)), TRS(0, 1.468 + 0.168 * headS, 0.004, 0, 0, 0, headS, 1, headS * 1.12), C('#c89018'), w1('head'), MAT.rubber); }
  }
  if (L.vest) M.add(roundedBox(0.33 * sh, 0.25, 0.22, 0.08, 2), T(0, 1.2, -0.008), C(L.vest), blend('spine', 'chest', (lp, v) => smooth(1.08, 1.22, v.y)), MAT.canvas);
  if (L.apron) M.add(roundedBox(0.28 * hw, 0.5, 0.02, 0.01, 2), T(0, 0.92, 0.112 * bw), C(L.apron), (lp, v) => [[B.spine, smooth(0.85, 1.1, v.y)], [B.hips, 1 - smooth(0.85, 1.1, v.y)]], MAT.cloth);
  if (L.scarf) {
    M.add(new THREE.TorusGeometry(0.07, 0.028, 8, seg(18)), TR(0, 1.405, 0.008, Math.PI / 2 + 0.15, 0, 0), C(L.scarf), blend('chest', 'neck', () => 0.3), MAT.knit);
    M.add(roundedBox(0.06, 0.2, 0.025, 0.01, 2), TR(0.05, 1.26, 0.11, 0.1, 0, 0.1), C(L.scarf), w1('chest'), MAT.knit);
  }
  if (L.tiedJacket) {
    const tj = C(L.tiedJacket);
    M.add(new THREE.CylinderGeometry(0.155 * hw, 0.165 * hw, 0.07, seg(18), 1, true), TRS(0, 0.93, -0.005, 0, 0, 0, 1, 1, 0.76), tj, w1('hips'), MAT.canvas);
    M.add(roundedBox(0.3 * hw, 0.3, 0.03, 0.012, 2), T(0, 0.78, -0.12), tj, () => [[B.hips, 0.6], [B.thighL, 0.2], [B.thighR, 0.2]], MAT.canvas);
    for (const sx of [-1, 1]) M.add(roundedBox(0.05, 0.14, 0.04, 0.015, 2), TR(sx * 0.04, 0.86, 0.13, 0, 0, sx * 0.4), tj, w1('hips'), MAT.canvas);
  }
  if (L.coat) {
    const cc = C(L.coat);
    M.add(new THREE.CylinderGeometry(0.075, 0.09, 0.08, seg(16), 1, true), T(0, 1.41, -0.012), cc, w1('chest'), MAT.cloth);
    M.add(roundedBox(0.35 * sh, 0.28, 0.22, 0.085, 2), T(0, 1.25, -0.008), cc, blend('spine', 'chest', (lp, v) => smooth(1.12, 1.22, v.y)), MAT.cloth);
    for (const sx of [-1, 1]) M.add(roundedBox(0.05, 0.2, 0.01, 0.004, 1), TR(sx * 0.05, 1.3, 0.106, 0, 0, sx * 0.35), cc.clone().multiplyScalar(0.8), w1('chest'), MAT.cloth); // lapels
    for (const s of ['L', 'R']) {
      const sx = s === 'L' ? 1 : -1;
      const g = new THREE.CylinderGeometry(0.105 * hw, 0.135 * hw, 0.5, seg(14), 4, true, sx > 0 ? -Math.PI * 0.05 : Math.PI * 0.95, Math.PI * 1.1);
      M.add(g, T(sx * 0.075, 0.74, -0.005), cc, (lp, v) => { const t = smooth(0.95, 0.5, v.y); return [[B.hips, 1 - t * 0.55], [B['thigh' + s], t * 0.55]]; }, MAT.cloth);
    }
    for (const s of ['L', 'R']) { const a0 = rest['arm' + s], e0 = rest['fore' + s]; const ua = segMatrix(a0, e0); M.add(taperCapsule(0.06 * bw, 0.05 * bw, ua.L, seg(14)), ua.m, cc, w1('arm' + s), MAT.cloth); const fa = segMatrix(e0, rest['hand' + s].clone().add(V(0, 0.05, 0))); M.add(taperCapsule(0.05 * bw, 0.044 * bw, fa.L, seg(14)), fa.m, cc, (lp) => [[B['fore' + s], 1 - (1 - smooth(0, 0.2, lp.y / fa.L)) * 0.5], [B['arm' + s], (1 - smooth(0, 0.2, lp.y / fa.L)) * 0.5]], MAT.cloth); }
  }
  return M.build();
}

// ----------------------------------------------------------------- hair extras
// The scalp shell is sculpted (anatomy.js); tails, braids and a few loose strands are added here.
function buildHairExtras(M, L, hair, rest, hi) {
  const style = L.hairStyle;
  const r = rng(style.length * 17 + 3);
  const C0 = hair, C2 = hair.clone().lerp(new THREE.Color(1, 0.95, 0.85), 0.1);
  if (style === 'ponytail' || style === 'braid') {
    const r0 = rest.hair1.clone(), r1 = rest.hair2.clone();
    M.add(new THREE.TorusGeometry(0.022, 0.006, 6, 12), TR(r0.x, r0.y + 0.02, r0.z - 0.02, Math.PI / 2 - 0.4, 0, 0), new THREE.Color('#2a2a2a'), [[B.head, 1]], MAT.rubber);
    if (style === 'braid') { for (let i = 0; i < 7; i++) M.add(ellipsoid(0.024, 0.03, 0.024, hi ? 10 : 6), T(r1.x + (i % 2 ? 0.006 : -0.006), r1.y + 0.06 - i * 0.035, r1.z - i * 0.003), i % 2 ? C0 : C0.clone().multiplyScalar(0.8), [[i < 2 ? B.hair1 : B.hair2, 1]], MAT.hair); }
    else {
      const N = hi ? 12 : 1;
      for (let k = 0; k < N; k++) {
        const off = hi ? V((r() - 0.5) * 0.026, 0, (r() - 0.5) * 0.018) : V(0, 0, 0);
        const pts = [r0.clone().add(V(0, 0.02, -0.02)).add(off.clone().multiplyScalar(0.2)), r0.clone().lerp(r1, 0.5).add(off).add(V(0, 0, -0.03)), r1.clone().add(off), r1.clone().add(V(off.x * 1.5, -0.14, -0.02))];
        M.add(taperTube(pts, hi ? 0.016 : 0.038, 0.003, hi ? 6 : 8, hi ? 0.8 : 1), T(0, 0, 0), k % 2 ? C0 : C2, (lp, v) => { const t = smooth(r0.y, r1.y, v.y); return [[B.hair1, t], [B.hair2, 1 - t]]; }, MAT.hair);
      }
    }
  }
}
