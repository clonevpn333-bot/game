// Block characters, after MARCHLIGHT's rig (marchlight/src/characters/rig.js on the
// confident-bardeen branch): every body part is a simple rounded box rigidly bound to one
// bone, merged into ONE skinned mesh per character (one draw call; each vertex follows exactly
// one bone). Faces are blocks: eyes that squash to blink, block brows, a block mouth whose
// lower lip rides the jaw. Built on the same skeleton as the old Humanoid so the procedural
// animator, IK and every chapter work unchanged. No sculpting, no SDFs.
import * as THREE from 'three';
import { Humanoid } from './humanoid.js';

export const MAT = { skin: 0, cloth: 1, leather: 2, metal: 3, hair: 4, eye: 5, rubber: 6, canvas: 7, lips: 8, knit: 9, glow: 10 };

let SHARED = null;
export function blockMaterial() {
  if (SHARED) return SHARED;
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0 });
  m.userData.rim = { value: new THREE.Color(0.42, 0.4, 0.38) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRim = m.userData.rim;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aMat;\nvarying float vMat;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvMat = aMat;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uRim; varying float vMat;
        float matIs(float id){ return 1.0 - step(0.5, abs(vMat - id)); }`)
      .replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment
        .replace('vec3 irradiance = dotNL * directLight.color;', 'vec3 irradiance = (smoothstep(0.0, 0.14, dotNL) * 0.7 + dotNL * 0.3) * directLight.color; // soft cel band'))
      .replace('#include <color_fragment>', `#include <color_fragment>
        float mSkin = matIs(0.0), mCloth = matIs(1.0), mLeather = matIs(2.0), mMetal = matIs(3.0), mHair = matIs(4.0), mEye = matIs(5.0), mRubber = matIs(6.0), mCanvas = matIs(7.0), mLips = matIs(8.0), mKnit = matIs(9.0), mGlow = matIs(10.0);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mSkin * 0.6 + mCloth * 0.88 + mCanvas * 0.82 + mKnit * 0.95 + mLeather * 0.5 + mMetal * 0.3 + mHair * 0.7 + mEye * 0.15 + mRubber * 0.95 + mLips * 0.5 + mGlow * 0.3;`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mMetal * 0.85;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimF = smoothstep(0.55, 0.85, 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0));
        totalEmissiveRadiance += uRim * rimF * diffuseColor.rgb;
        totalEmissiveRadiance += diffuseColor.rgb * vec3(0.1, 0.035, 0.02) * (mSkin + mLips);
        totalEmissiveRadiance += diffuseColor.rgb * 2.5 * mGlow;`)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (any(isnan(gl_FragColor)) || any(isinf(gl_FragColor))) gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);`);
  };
  m.customProgramCacheKey = () => 'char-blocks';
  return (SHARED = m);
}

// ---------------------------------------------------------------- shapes
const BOXES = new Map();
export function rbox(w, h, d, r = 0.2) {
  const rr = Math.min(w, h, d) * r, key = [w, h, d, rr].map((v) => v.toFixed(4)).join();
  if (BOXES.has(key)) return BOXES.get(key);
  const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
  const P = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3(), inner = new THREE.Vector3(w / 2 - rr, h / 2 - rr, d / 2 - rr);
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i);
    c.set(Math.max(-inner.x, Math.min(inner.x, v.x)), Math.max(-inner.y, Math.min(inner.y, v.y)), Math.max(-inner.z, Math.min(inner.z, v.z)));
    const off = v.clone().sub(c); if (off.lengthSq() > 0) off.setLength(rr);
    P.setXYZ(i, c.x + off.x, c.y + off.y, c.z + off.z);
  }
  g.computeVertexNormals(); g.computeBoundingBox();
  BOXES.set(key, g); return g;
}

class Mesher {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.si = []; this.mat = []; this.idx = []; }
  add(geo, matrix, color, bone, mat = MAT.cloth, shade = 0.16) {
    const P = geo.attributes.position, N = geo.attributes.normal, base = this.pos.length / 3;
    const nm = new THREE.Matrix3().getNormalMatrix(matrix), v = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Color(color);
    const bb = geo.boundingBox || (geo.computeBoundingBox(), geo.boundingBox), y0 = bb.min.y, dy = Math.max(1e-6, bb.max.y - bb.min.y);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i); const k = 1 - shade + shade * (v.y - y0) / dy; // baked top-to-bottom shade
      v.applyMatrix4(matrix); n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      this.pos.push(v.x, v.y, v.z); this.nor.push(n.x, n.y, n.z); this.col.push(c.r * k, c.g * k, c.b * k);
      this.si.push(bone); this.mat.push(mat);
    }
    if (geo.index) for (let i = 0; i < geo.index.count; i++) this.idx.push(base + geo.index.getX(i));
    else for (let i = 0; i < P.count; i++) this.idx.push(base + i);
  }
  build(skinned = true) {
    const g = new THREE.BufferGeometry(), n = this.si.length;
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.mat, 1));
    if (skinned) {
      const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { si[i * 4] = this.si[i]; sw[i * 4] = 1; }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    }
    g.setIndex(this.idx); g.computeBoundingSphere();
    return g;
  }
}

const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), _UP = new THREE.Vector3(0, 1, 0);
/** Matrix placing a box between two rest-space points (its Y axis along a→b). */
function between(a, b, extraZ = 0) {
  const A = V(a), B = V(b), mid = A.clone().add(B).multiplyScalar(0.5);
  _q.setFromUnitVectors(_UP, B.clone().sub(A).normalize());
  const m = new THREE.Matrix4().compose(mid, _q, new THREE.Vector3(1, 1, 1));
  if (extraZ) m.multiply(new THREE.Matrix4().makeTranslation(0, 0, extraZ));
  return { m, len: A.distanceTo(B) };
}
const at = (p, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(V(p), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));

// ---------------------------------------------------------------- the character
export class BlockHumanoid extends Humanoid {
  build() {
    const d = this.def, L = d.look, J = this.J, s = d.body.height / 1.8, hs = (d.body.headScale ?? 1.2) * s;
    const M = new Mesher(), C = (c) => new THREE.Color(c);
    const bi = (n) => this.boneIndex[n];
    const add = (geo, m, col, bone, mat, shade) => M.add(geo, m, col, bi(bone), mat, shade);
    const skin = C(L.skin), skinD = skin.clone().multiplyScalar(0.86), hair = C(L.hair), top = C(L.top), pants = C(L.pants), shoes = C(L.shoes), sole = C(L.sole ?? '#d8d0c0');
    const lip = skin.clone().lerp(C('#a03a3c'), 0.45);
    const fem = !!L.fem, bw = L.build ?? 1, sw = d.body.shoulder ?? 1;

    // ---- torso
    add(rbox(0.3 * bw, 0.2, 0.2), at([0, J.hips[1] - 0.04 * s, 0]), pants, 'hips', MAT.canvas);
    add(rbox((fem ? 0.25 : 0.28) * bw, 0.2 * s, 0.18), at([0, (J.spine[1] + J.chest[1]) / 2 - 0.02 * s, 0]), top, 'spine', L.topMat ?? MAT.cloth);
    add(rbox((fem ? 0.32 : 0.36) * sw * bw, 0.25 * s, 0.21), at([0, J.chest[1] + 0.03 * s, 0]), top, 'chest', L.topMat ?? MAT.cloth);
    for (const sd of ['L', 'R']) { const x = J['upperArm' + sd][0]; add(rbox(0.12, 0.1, 0.17), at([x * 0.82, J.chest[1] + 0.12 * s, -0.01]), top, 'clavicle' + sd, L.topMat ?? MAT.cloth); }
    add(rbox(0.09, 0.11 * s, 0.09), at([0, J.neck[1] + 0.03 * s, J.neck[2]]), skinD, 'neck', MAT.skin);

    // ---- arms (boxes laid along each bone, so any arm angle works)
    for (const sd of ['L', 'R']) {
      const sg = sd === 'L' ? 1 : -1;
      const ua = J['upperArm' + sd], fa = J['forearm' + sd], ha = J['hand' + sd];
      const sleeveU = L.sleeves === 'short' ? skin : top, sleeveF = L.sleeves === 'long' ? top : skin;
      let b = between(ua, fa); add(rbox(0.1 * bw, b.len + 0.02, 0.105 * bw), b.m, sleeveU, 'upperArm' + sd, L.sleeves === 'short' ? MAT.skin : L.topMat ?? MAT.cloth);
      b = between(fa, ha); add(rbox(0.088 * bw, b.len, 0.092 * bw), b.m, sleeveF, 'forearm' + sd, L.sleeves === 'long' ? L.topMat ?? MAT.cloth : MAT.skin);
      if (L.sleeves === 'rolled') { const r = between(fa, fa.map((v, i) => v + (ha[i] - fa[i]) * 0.3)); add(rbox(0.105 * bw, r.len, 0.108 * bw), r.m, top, 'forearm' + sd, L.topMat ?? MAT.cloth); }
      if (L.cuff) { const r = between(ha.map((v, i) => v - (ha[i] - fa[i]) * 0.12), ha); add(rbox(0.1 * bw, r.len, 0.104 * bw), r.m, C(L.cuff), 'forearm' + sd, MAT.canvas); }
      // hand: palm on the hand bone, fingers as one block on the middle knuckle (curls for grip), thumb
      const h = this.hands[sd], D = V(h.D).normalize(), N = V(h.N).normalize(), Tn = V(h.T).normalize();
      const basis = (o) => new THREE.Matrix4().makeBasis(Tn, D, N).setPosition(V(o));
      const hc = L.gloves ? C(L.gloves) : skin, hm = L.gloves ? MAT.leather : MAT.skin;
      const palm = ha.map((v, i) => v + D.getComponent(i) * 0.045 * s);
      add(rbox(0.075 * s, 0.085 * s, 0.032 * s), basis(palm), hc, 'hand' + sd, hm);
      const fing = ha.map((v, i) => v + D.getComponent(i) * 0.12 * s + N.getComponent(i) * 0.004);
      add(rbox(0.072 * s, 0.075 * s, 0.027 * s), basis(fing), skin, 'middle0' + sd, MAT.skin);
      const th = ha.map((v, i) => v + D.getComponent(i) * 0.04 * s + Tn.getComponent(i) * 0.04 * s + N.getComponent(i) * 0.012 * s);
      add(rbox(0.022 * s, 0.05 * s, 0.024 * s), basis(th).multiply(new THREE.Matrix4().makeRotationZ(-sg * 0.5)), skin, 'thumb0' + sd, MAT.skin);
    }

    // ---- legs
    for (const sd of ['L', 'R']) {
      const th = J['thigh' + sd], sh = J['shin' + sd], ft = J['foot' + sd], toe = J['toe' + sd];
      let b = between(th, sh); add(rbox(0.15 * bw, b.len + 0.03, 0.16), b.m, pants, 'thigh' + sd, MAT.canvas);
      b = between(sh, ft); add(rbox(0.122, b.len, 0.13), b.m, pants, 'shin' + sd, MAT.canvas);
      if (L.boots) { const bb = between([sh[0], ft[1] + 0.2 * s, sh[2]], ft); add(rbox(0.135, bb.len, 0.145), bb.m, shoes, 'shin' + sd, MAT.leather); }
      add(rbox(0.12, 0.1 * s, 0.2 * s), at([ft[0], 0.058 * s, ft[2] + 0.04 * s]), shoes, 'foot' + sd, MAT.leather);
      add(rbox(0.12, 0.075 * s, 0.085 * s, 0.3), at([toe[0], 0.045 * s, toe[2] + 0.02 * s]), shoes, 'toe' + sd, MAT.leather);
      add(rbox(0.126, 0.026, 0.215 * s, 0.1), at([ft[0], 0.013, ft[2] + 0.04 * s]), sole, 'foot' + sd, MAT.rubber, 0);
      add(rbox(0.126, 0.026, 0.09 * s, 0.1), at([toe[0], 0.013, toe[2] + 0.02 * s]), sole, 'toe' + sd, MAT.rubber, 0);
    }

    // ---- head: block head on the head bone; features scaled by hs from the top of the neck
    const hp = J.head, HM = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(hp[0] + x * hs, hp[1] + y * hs, hp[2] + z * hs), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(hs, hs, hs));
    const fz = 0.105;
    add(rbox(0.2 * (L.headW ?? 1), 0.22, 0.2, 0.16), HM(0, 0.108, 0.005), skin, 'head', MAT.skin, 0.12);
    add(rbox(0.03, 0.042 * (L.nose ?? 1), 0.03, 0.25), HM(0, 0.086, fz + 0.008), skinD, 'head', MAT.skin, 0.1);
    for (const sg of [1, -1]) add(rbox(0.02, 0.045, 0.032, 0.3), HM(sg * 0.104 * (L.headW ?? 1), 0.108, 0), skinD, 'head', MAT.skin, 0.1);
    // brows on the brow bones
    const browC = C(L.brows ?? L.hair).multiplyScalar(0.75);
    for (const sg of [1, -1]) add(rbox(0.048, 0.013 * (L.browThick ?? 1), 0.012, 0.3), HM(sg * 0.044, 0.153, 0.104, 0, 0, -sg * 0.08), browC, sg > 0 ? 'browL' : 'browR', MAT.hair, 0);
    // mouth: dark slot + teeth on the head, upper lip on lipU, lower lip on the jaw, corners on the corner bones
    const my = 0.05;
    add(rbox(0.05, 0.026, 0.012, 0.2), HM(0, my - 0.006, fz - 0.007), C('#2a1012'), 'head', MAT.lips, 0);
    add(rbox(0.034, 0.008, 0.005, 0.2), HM(0, my + 0.001, fz - 0.004), C('#ece6da'), 'head', MAT.eye, 0);
    add(rbox(0.026, 0.0105, 0.012, 0.25), HM(0, my + 0.0052, fz + 0.002), lip, 'lipU', MAT.lips, 0);
    add(rbox(0.024, 0.0105, 0.012, 0.25), HM(0, my - 0.0052, fz + 0.002), lip.clone().multiplyScalar(0.86), 'jaw', MAT.lips, 0);
    for (const sg of [1, -1]) {
      add(rbox(0.015, 0.009, 0.011, 0.25), HM(sg * 0.019, my + 0.0045, fz + 0.0015), lip, sg > 0 ? 'mouthL' : 'mouthR', MAT.lips, 0);
      add(rbox(0.014, 0.009, 0.011, 0.25), HM(sg * 0.018, my - 0.0045, fz + 0.0015), lip.clone().multiplyScalar(0.86), sg > 0 ? 'mouthL' : 'mouthR', MAT.lips, 0);
    }
    if (L.stubble) { const sc = skin.clone().lerp(C(L.hair), 0.4); add(rbox(0.15, 0.03, 0.012, 0.3), HM(0, 0.018, 0.1), sc, 'jaw', MAT.skin, 0); for (const sg of [1, -1]) add(rbox(0.022, 0.06, 0.012, 0.3), HM(sg * 0.085, 0.045, 0.1), sc, 'head', MAT.skin, 0); }
    if (L.freckles) for (let i = 0; i < 8; i++) { const sg = i % 2 ? 1 : -1; add(rbox(0.007, 0.007, 0.002, 0.2), HM(sg * (0.03 + (i % 4) * 0.009), 0.075 + (i % 3) * 0.008, fz + 0.001), skin.clone().multiplyScalar(0.7), 'head', MAT.skin, 0); }
    buildHair(add, HM, L, hair);
    if (L.glasses) { const fc = C('#c0b8a8'); for (const sg of [1, -1]) { add(rbox(0.05, 0.007, 0.007, 0.2), HM(sg * 0.044, 0.139, fz + 0.014), fc, 'head', MAT.metal, 0); add(rbox(0.05, 0.007, 0.007, 0.2), HM(sg * 0.044, 0.091, fz + 0.014), fc, 'head', MAT.metal, 0); for (const t of [-1, 1]) add(rbox(0.007, 0.05, 0.007, 0.2), HM(sg * 0.044 + t * 0.025, 0.115, fz + 0.014), fc, 'head', MAT.metal, 0); add(rbox(0.007, 0.007, 0.11, 0.2), HM(sg * 0.1, 0.125, 0.05), fc, 'head', MAT.metal, 0); } }

    // ---- outfit pieces (all blocks)
    if (L.outfit) L.outfit(add, { J, s, bw, sw, C, MAT, rbox, at, between, HM });

    // ---- ponytail on two spring bones (the animator swings them)
    if (L.ponytail) {
      const base = [hp[0], hp[1] + 0.15 * hs, hp[2] - 0.12 * hs];
      const bones = []; let parent = this.bones.head, pw = this.worldRest.head;
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Bone(); b.name = 'tail' + i;
        const w = [base[0], base[1] - i * 0.07 * hs, base[2] - 0.01 * i];
        b.position.set(w[0] - pw[0], w[1] - pw[1], w[2] - pw[2]); parent.add(b); bones.push(b); parent = b; pw = w;
        this.boneList.push(b); this.boneIndex[b.name] = this.boneList.length - 1; this.worldRest[b.name] = w;
      }
      this.tail = { bones };
      this.updateMatrixWorld(true);
      this.skeleton = new THREE.Skeleton(this.boneList);
      add(rbox(0.05, 0.035, 0.05, 0.3), HM(0, 0.15, -0.125), C('#1d2a2c'), 'tail0', MAT.rubber, 0);
      add(rbox(0.06, 0.12, 0.05, 0.35), HM(0, 0.08, -0.135), hair, 'tail1', MAT.hair, 0.12);
      add(rbox(0.05, 0.1, 0.045, 0.4), HM(0, -0.01, -0.14), hair.clone().multiplyScalar(0.85), 'tail2', MAT.hair, 0.12);
    }

    const geo = M.build();
    const mesh = this.addSkinned(geo, blockMaterial(), 'body');
    this.headMesh = mesh;

    // ---- eyes: whites + iris + pupil + catchlight in a blink group (squashes), iris on a look pivot
    this.eyes = []; this.lids = []; this.blinkGroups = [];
    for (const sg of [1, -1]) {
      const blink = new THREE.Group();
      blink.position.set(sg * 0.044 * hs, 0.115 * hs, fz * hs);
      this.bones.head.add(blink);
      const W = new Mesher(); W.add(rbox(0.038, 0.042, 0.01, 0.3), new THREE.Matrix4().makeScale(hs, hs, hs), C('#f2ede4'), 0, MAT.eye, 0);
      const whites = new THREE.Mesh(W.build(false), blockMaterial()); blink.add(whites);
      const pivot = new THREE.Object3D(); pivot.position.z = -0.015 * hs; blink.add(pivot);
      const I = new Mesher();
      const S = (x, y, z) => new THREE.Matrix4().compose(new THREE.Vector3(x * hs, y * hs, (z + 0.015) * hs), new THREE.Quaternion(), new THREE.Vector3(hs, hs, hs));
      I.add(rbox(0.022, 0.03, 0.006, 0.3), S(0, -0.002, 0.005), C(L.eyes ?? '#4a3424'), 0, MAT.eye, 0);
      I.add(rbox(0.012, 0.018, 0.004, 0.3), S(0, -0.002, 0.008), C('#0b0a0a'), 0, MAT.eye, 0);
      I.add(rbox(0.006, 0.006, 0.002, 0.2), S(0.005, 0.006, 0.0105), C('#ffffff'), 0, MAT.eye, 0);
      const iris = new THREE.Mesh(I.build(false), blockMaterial()); pivot.add(iris);
      this.eyes.push({ pivot, eye: iris, side: sg });
      this.blinkGroups.push(blink);
    }
    if (d.accessories) d.accessories(this);
    this.restPose = {};
    for (const [n, b] of Object.entries(this.bones)) this.restPose[n] = { p: b.position.clone(), q: b.quaternion.clone() };
    if (this.tail) for (const b of this.tail.bones) this.restPose[b.name] = { p: b.position.clone(), q: b.quaternion.clone() };
    this.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return this;
  }
}

// Hair as blocks (MARCHLIGHT's buildHair): a cap over the crown and back plus a style piece.
function buildHair(add, HM, L, hair) {
  const style = L.hairStyle; if (style === 'bald') return;
  const hc = hair, dark = hair.clone().multiplyScalar(0.82);
  const capH = style === 'crop' ? 0.055 : 0.07;
  add(rbox(0.216, capH, 0.218, 0.25), HM(0, 0.205 + capH / 2 - 0.02, 0.002), hc, 'head', MAT.hair, 0.1);
  add(rbox(0.216, 0.15, 0.04, 0.25), HM(0, 0.15, -0.092), dark, 'head', MAT.hair, 0.15);
  for (const s of [1, -1]) add(rbox(0.02, 0.07, 0.15, 0.25), HM(s * 0.104, 0.172, -0.02), dark, 'head', MAT.hair, 0.1);
  add(rbox(0.21, 0.03, 0.03, 0.3), HM(0, 0.2, 0.1), hc, 'head', MAT.hair, 0);
  if (style === 'swept') add(rbox(0.17, 0.055, 0.1, 0.3), HM(0.015, 0.25, 0.05, -0.35, 0, 0.12), hc, 'head', MAT.hair, 0.1);
  if (style === 'crop') add(rbox(0.12, 0.03, 0.08, 0.3), HM(0, 0.24, 0.04), hc, 'head', MAT.hair, 0);
  if (style === 'bun') add(rbox(0.085, 0.075, 0.08, 0.35), HM(0, 0.25, -0.07), hc, 'head', MAT.hair, 0.12);
  if (style === 'framed') for (const s of [1, -1]) add(rbox(0.026, 0.13, 0.05, 0.3), HM(s * 0.1, 0.1, 0.07), hc, 'head', MAT.hair, 0.1);
}
