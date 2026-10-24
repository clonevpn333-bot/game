// Procedural block characters.
// Every body part is a simple shape (mostly rounded boxes) rigidly attached to one bone of a
// shared skeleton, merged into a single skinned mesh per character (one draw call; each vertex
// follows exactly one bone, so plain linear skinning is exact). Faces are flat blocks too: eyes
// that squash to blink, block brows, and a block mouth that opens with the jaw. Per-vertex
// material ids drive the shading (skin, cloth, leather, metal, hair, eyes, rubber, canvas, lips).
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

// The block head, in head-bone space (the bone sits at the top of the neck; +z is the face).
// Kids and the stylized adults scale it by headS about the bone.
export const FACE = {
  size: [0.2, 0.22, 0.2], front: 0.105,
  eye: [0.044, 0.115, 0.1], brow: [0.044, 0.153, 0.104], mouthY: 0.05, corner: [0.026, 0.05, 0.104],
  jaw: [0, 0.075, -0.004], hair1: [0, 0.17, -0.11], hair2: [0, 0.03, -0.125],
};

// ----------------------------------------------------------------- material
// Flat painted colour per vertex, a soft cel band on direct light and a rim light.
let SHARED_MAT = null;
export function characterMaterial() {
  if (SHARED_MAT) return SHARED_MAT;
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0.0 });
  m.userData.rim = { value: new THREE.Color(0.42, 0.4, 0.38) };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uRim = m.userData.rim;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aMat;\nvarying float vMat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMat = aMat;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform vec3 uRim; varying float vMat;
        float matIs(float id){ return 1.0 - step(0.5, abs(vMat - id)); }`)
      .replace('#include <lights_physical_pars_fragment>', THREE.ShaderChunk.lights_physical_pars_fragment
        .replace('vec3 irradiance = dotNL * directLight.color;', 'vec3 irradiance = (smoothstep(0.0, 0.14, dotNL) * 0.7 + dotNL * 0.3) * directLight.color; // soft cel band'))
      .replace('#include <color_fragment>', `#include <color_fragment>
        float mSkin = matIs(0.0), mCloth = matIs(1.0), mLeather = matIs(2.0), mMetal = matIs(3.0), mHair = matIs(4.0), mEye = matIs(5.0), mRubber = matIs(6.0), mCanvas = matIs(7.0), mLips = matIs(8.0), mKnit = matIs(9.0);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mSkin * 0.6 + mCloth * 0.88 + mCanvas * 0.82 + mKnit * 0.95 + mLeather * 0.5
          + mMetal * 0.3 + mHair * 0.7 + mEye * 0.15 + mRubber * 0.95 + mLips * 0.5;`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = mMetal * 0.85;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float rimF = smoothstep(0.55, 0.85, 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0));
        totalEmissiveRadiance += uRim * rimF * diffuseColor.rgb;
        totalEmissiveRadiance += diffuseColor.rgb * vec3(0.1, 0.035, 0.02) * (mSkin + mLips); // warm skin`)
      // never hand a NaN/Inf pixel to the bloom chain (it smears into black blocks)
      .replace('#include <dithering_fragment>', `#include <dithering_fragment>
        if (any(isnan(gl_FragColor)) || any(isinf(gl_FragColor))) gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);`);
  };
  m.customProgramCacheKey = () => 'char-blocks';
  return (SHARED_MAT = m);
}

// ----------------------------------------------------------------- geometry
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const M4 = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), V(s, s, s));

// box with rounded edges (the basic shape of everything)
const BOXES = new Map();
function rbox(w, h, d, r = 0.2) {
  const rr = Math.min(w, h, d) * r, key = [w, h, d, rr].map(v => v.toFixed(4)).join();
  if (BOXES.has(key)) return BOXES.get(key);
  const g = new THREE.BoxGeometry(w, h, d, 2, 2, 2);
  const P = g.attributes.position, v = new THREE.Vector3(), c = new THREE.Vector3(), inner = V(w / 2 - rr, h / 2 - rr, d / 2 - rr);
  for (let i = 0; i < P.count; i++) {
    v.fromBufferAttribute(P, i);
    c.set(Math.max(-inner.x, Math.min(inner.x, v.x)), Math.max(-inner.y, Math.min(inner.y, v.y)), Math.max(-inner.z, Math.min(inner.z, v.z)));
    const off = v.clone().sub(c); if (off.lengthSq() > 0) off.setLength(rr);
    P.setXYZ(i, c.x + off.x, c.y + off.y, c.z + off.z);
  }
  g.computeVertexNormals(); g.computeBoundingBox();
  BOXES.set(key, g); return g;
}
const CYLS = new Map();
function cyl(r0, r1, h, seg = 10) {
  const key = [r0, r1, h, seg].join(); if (CYLS.has(key)) return CYLS.get(key);
  const g = new THREE.CylinderGeometry(r1, r0, h, seg); g.computeBoundingBox(); CYLS.set(key, g); return g;
}

// Collects shapes, each rigidly bound to one bone, into one geometry. Colours get a gentle
// top-to-bottom shade per shape (a cheap baked occlusion that suits the toy look).
class Mesher {
  constructor() { this.pos = []; this.nor = []; this.col = []; this.si = []; this.mat = []; this.idx = []; }
  add(geo, matrix, color, bone, mat = MAT.cloth, shade = 0.16) {
    const P = geo.attributes.position, N = geo.attributes.normal, base = this.pos.length / 3;
    const nm = new THREE.Matrix3().getNormalMatrix(matrix), v = new THREE.Vector3(), n = new THREE.Vector3(), c = new THREE.Color(color);
    const bb = geo.boundingBox || (geo.computeBoundingBox(), geo.boundingBox), y0 = bb.min.y, dy = Math.max(1e-6, bb.max.y - bb.min.y);
    for (let i = 0; i < P.count; i++) {
      v.fromBufferAttribute(P, i); const k = 1 - shade + shade * (v.y - y0) / dy;
      v.applyMatrix4(matrix); n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
      this.pos.push(v.x, v.y, v.z); this.nor.push(n.x, n.y, n.z); this.col.push(c.r * k, c.g * k, c.b * k);
      this.si.push(bone); this.mat.push(mat);
    }
    if (geo.index) for (let i = 0; i < geo.index.count; i++) this.idx.push(base + geo.index.getX(i));
    else for (let i = 0; i < P.count; i++) this.idx.push(base + i);
  }
  build() {
    const g = new THREE.BufferGeometry(), n = this.si.length;
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { si[i * 4] = this.si[i]; sw[i * 4] = 1; }
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.mat, 1));
    g.setIndex(this.idx); g.computeBoundingSphere();
    return g;
  }
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
export function buildCharacter(lookIn = {}) {
  const L = defaultLook(lookIn);
  const kid = L.kid; const H = (kid ? 0.62 : 1) * L.height;
  const bw = 0.88 + L.build * 0.28, fr = L.frame;
  const sh = (1.08 - fr * 0.16) * bw, hw = (0.92 + fr * 0.14) * bw;
  const headS = kid ? 1.42 : 1.2; // big block heads
  const hp = V(0, 1.468, 0), F = (a) => V(a[0], a[1], a[2]).multiplyScalar(headS).add(hp);
  const rest = {
    root: V(0, 0, 0), hips: V(0, 0.92, 0), spine: V(0, 1.03, 0), chest: V(0, 1.2, 0), neck: V(0, 1.4, 0), head: hp.clone(),
    jaw: F(FACE.jaw), eyeL: F(FACE.eye), eyeR: F([-FACE.eye[0], FACE.eye[1], FACE.eye[2]]),
    browL: F(FACE.brow), browR: F([-FACE.brow[0], FACE.brow[1], FACE.brow[2]]),
    lidL: F(FACE.eye), lidR: F([-FACE.eye[0], FACE.eye[1], FACE.eye[2]]),
    cornerL: F(FACE.corner), cornerR: F([-FACE.corner[0], FACE.corner[1], FACE.corner[2]]),
    shoulderL: V(0.06 * sh, 1.35, 0), armL: V(0.18 * sh, 1.35, -0.005), foreL: V(0.185 * sh, 1.07, -0.005), handL: V(0.185 * sh, 0.82, 0), fingersL: V(0.185 * sh, 0.735, 0.01),
    shoulderR: V(-0.06 * sh, 1.35, 0), armR: V(-0.18 * sh, 1.35, -0.005), foreR: V(-0.185 * sh, 1.07, -0.005), handR: V(-0.185 * sh, 0.82, 0), fingersR: V(-0.185 * sh, 0.735, 0.01),
    thighL: V(0.09 * hw, 0.88, 0), shinL: V(0.095 * hw, 0.47, 0.005), footL: V(0.095 * hw, 0.075, 0), toeL: V(0.095 * hw, 0.03, 0.12),
    thighR: V(-0.09 * hw, 0.88, 0), shinR: V(-0.095 * hw, 0.47, 0.005), footR: V(-0.095 * hw, 0.075, 0), toeR: V(-0.095 * hw, 0.03, 0.12),
    hair1: F(FACE.hair1), hair2: F(FACE.hair2),
  };

  const bones = BONES.map(n => { const b = new THREE.Bone(); b.name = n; return b; });
  BONES.forEach((n, i) => { const p = PARENT[n]; if (p) { bones[B[p]].add(bones[i]); bones[i].position.copy(rest[n]).sub(rest[p]); } else bones[i].position.copy(rest[n]); });
  const skeleton = new THREE.Skeleton(bones);
  const group = new THREE.Group(); group.scale.setScalar(H);
  const holder = new THREE.Group(); group.add(holder);
  holder.add(bones[0]);
  holder.updateMatrixWorld(true);
  skeleton.calculateInverses(); // bound in the rest pose: the shapes are placed there

  const geo = buildBlocks(L, rest, { sh, hw, bw, fr, headS, kid });
  const mesh = new THREE.SkinnedMesh(geo, characterMaterial());
  holder.add(mesh); mesh.updateMatrixWorld(true);
  mesh.bind(skeleton, mesh.matrixWorld.clone());
  mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false;
  const meshes = { high: mesh };

  const bonesBy = Object.fromEntries(BONES.map((n, i) => [n, bones[i]]));
  const sockets = {};
  sockets.gripR = new THREE.Object3D(); sockets.gripR.position.set(0, -0.075, 0.025); bonesBy.handR.add(sockets.gripR);
  sockets.gripL = new THREE.Object3D(); sockets.gripL.position.set(0, -0.075, 0.025); bonesBy.handL.add(sockets.gripL);
  sockets.tether = new THREE.Object3D(); sockets.tether.position.set(0, -0.2, 0.0); bonesBy.foreL.add(sockets.tether);
  sockets.back = new THREE.Object3D(); sockets.back.position.set(0.0, 0.02, -0.17); bonesBy.chest.add(sockets.back);
  sockets.hip = new THREE.Object3D(); sockets.hip.position.set(-0.17, -0.02, 0.02); bonesBy.hips.add(sockets.hip);
  sockets.head = new THREE.Object3D(); sockets.head.position.set(0, 0.14 * headS, 0.0); bonesBy.head.add(sockets.head);
  if (L.tetherArm) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.008, 4, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.55, 0.2).multiplyScalar(3) }));
    ring.rotation.set(Math.PI / 2, 0, Math.PI / 4); ring.position.set(0, -0.19, 0);
    bonesBy.foreL.add(ring); sockets.tetherRing = ring;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.1, 0.02), ring.material); strip.position.set(0.058, -0.12, 0.0); bonesBy.foreL.add(strip);
  }
  const char = { group, mesh, meshLow: null, meshes, bones: bonesBy, boneList: bones, rest, look: L, sockets, height: H * 1.73, lod: 'high' };
  char.setLOD = () => {}; // block characters are cheap enough to need no LODs
  return char;
}

// ----------------------------------------------------------------- the body, in blocks
function buildBlocks(L, rest, P) {
  const { sh, hw, bw, fr, headS, kid } = P;
  const M = new Mesher(), C = (c) => new THREE.Color(c);
  const fem = fr > 0.55 && !kid, outfit = L.outfit;
  const skin = C(L.skin), hair = C(L.hair), prim = C(L.primary), sec = C(L.secondary), pants = C(L.pants), boots = C(L.boots), gloves = C(L.gloves);
  const skinD = skin.clone().multiplyScalar(0.85), lip = skin.clone().lerp(C('#a03a3c'), 0.5), brow = L.brows ? C(L.brows) : hair.clone().multiplyScalar(0.7);
  const runner = outfit === 'runner' || outfit === 'runnerLight', work = outfit === 'engineer' || outfit === 'worker';
  const sleeves = !L.tank, gloved = runner, socks = !!L.socks, tallBoots = runner || work;
  const topMat = outfit === 'casual' ? MAT.knit : runner || work ? MAT.canvas : MAT.cloth;
  const coat = L.coat ? C(L.coat) : null, armTop = coat || prim;
  const add = (g, m, c, bone, mat, shade) => M.add(g, m, c, B[bone], mat, shade);
  const at = (bone, x, y, z, rx, ry, rz) => M4(x, y, z, rx, ry, rz); // shapes are placed in rest (model) space

  // ---- torso
  const wst = (0.82 + 0.18 * bw) * (fem ? 0.88 : 1);
  add(rbox(0.3 * hw, 0.19, 0.19), at('hips', 0, 0.915, 0), pants, 'hips', MAT.canvas);
  add(rbox(0.27 * wst, 0.17, 0.175), at('spine', 0, 1.06, 0), coat || prim, 'spine', topMat);
  add(rbox((fem ? 0.33 : 0.355) * sh, 0.25, 0.205 + (fem ? 0.01 : 0)), at('chest', 0, 1.25, 0), coat || prim, 'chest', topMat);
  for (const s of [1, -1]) add(rbox(0.11, 0.1, 0.16), at('chest', s * 0.15 * sh, 1.335, 0), armTop, s > 0 ? 'shoulderL' : 'shoulderR', topMat);
  add(rbox(0.085, 0.09, 0.085), at('neck', 0, 1.425, 0), skinD, 'neck', MAT.skin);

  // ---- arms
  for (const s of [1, -1]) {
    const S = s > 0 ? 'L' : 'R', x = s * 0.183 * sh;
    add(rbox(0.095 * bw, 0.29, 0.1 * bw), at('arm', x, 1.215, -0.005), sleeves ? armTop : skin, 'arm' + S, sleeves ? topMat : MAT.skin);
    add(rbox(0.086 * bw, 0.26, 0.09 * bw), at('fore', x, 0.95, -0.003), sleeves ? armTop : skin, 'fore' + S, sleeves ? topMat : MAT.skin);
    if (sleeves && runner) add(rbox(0.094 * bw, 0.035, 0.098 * bw), at('fore', x, 0.84, -0.003), sec, 'fore' + S, MAT.canvas); // cuff
    const hc = gloved ? gloves : skin, hm = gloved ? MAT.leather : MAT.skin;
    add(rbox(0.066, 0.075, 0.085), at('hand', x, 0.787, 0.005), hc, 'hand' + S, hm);
    add(rbox(0.024, 0.045, 0.026), at('hand', x - s * 0.005, 0.775, 0.05), hc, 'hand' + S, hm); // thumb
    add(rbox(0.062, 0.062, 0.078), at('fingers', x, 0.72, 0.012), hc, 'fingers' + S, hm);
  }
  if (L.tetherArm) { const x = 0.185 * sh; add(rbox(0.11, 0.17, 0.115, 0.15), at('fore', x, 0.93, -0.003), C('#2b2e33'), 'foreL', MAT.metal); add(rbox(0.036, 0.11, 0.05, 0.15), at('fore', x + 0.06, 0.94, -0.003), C('#c8692b'), 'foreL', MAT.metal); }

  // ---- legs
  for (const s of [1, -1]) {
    const S = s > 0 ? 'L' : 'R', x = s * 0.093 * hw;
    add(rbox(0.145 * hw, 0.41, 0.155), at('thigh', x, 0.685, 0), pants, 'thigh' + S, MAT.canvas);
    add(rbox(0.118, 0.37, 0.127), at('shin', x, 0.29, 0.002), pants, 'shin' + S, MAT.canvas);
    if (socks) {
      add(rbox(0.1, 0.14, 0.105), at('shin', x, 0.1, 0.0), boots, 'shin' + S, MAT.knit);
      add(rbox(0.1, 0.075, 0.17), at('foot', x, 0.042, 0.03), boots, 'foot' + S, MAT.knit);
      add(rbox(0.1, 0.06, 0.07), at('toe', x, 0.032, 0.14), boots, 'toe' + S, MAT.knit);
      continue;
    }
    if (tallBoots) add(rbox(0.13, 0.2, 0.14), at('shin', x, 0.2, 0.002), boots, 'shin' + S, MAT.leather);
    add(rbox(0.118, 0.1, 0.2), at('foot', x, 0.058, 0.035), boots, 'foot' + S, MAT.leather);
    add(rbox(0.118, 0.075, 0.085, 0.3), at('toe', x, 0.045, 0.158), boots, 'toe' + S, MAT.leather);
    const sole = outfit === 'casual' || outfit === 'smart' ? C('#a89c88') : C('#1c1916');
    add(rbox(0.124, 0.026, 0.215, 0.1), at('foot', x, 0.013, 0.035), sole, 'foot' + S, MAT.rubber, 0);
    add(rbox(0.124, 0.026, 0.09, 0.1), at('toe', x, 0.013, 0.16), sole, 'toe' + S, MAT.rubber, 0);
    if (outfit === 'runner') add(rbox(0.1, 0.11, 0.05), at('shin', x, 0.45, 0.07), C('#26282c'), 'shin' + S, MAT.rubber); // knee pad
  }

  // ---- head (all in head-bone space, scaled by headS)
  const hp = rest.head, HM = (x, y, z, rx = 0, ry = 0, rz = 0) => M4(hp.x + x * headS, hp.y + y * headS, hp.z + z * headS, rx, ry, rz, headS);
  const [hw0, hh0, hd0] = FACE.size, fz = FACE.front;
  add(rbox(hw0, hh0, hd0, 0.16), HM(0, 0.108, 0.005), skin, 'head', MAT.skin, 0.12);
  add(rbox(0.032, 0.042, 0.03, 0.25), HM(0, 0.086, fz + 0.008), skinD, 'head', MAT.skin, 0.1); // nose
  for (const s of [1, -1]) add(rbox(0.02, 0.045, 0.032, 0.3), HM(s * 0.104, 0.108, 0.0), skinD, 'head', MAT.skin, 0.1); // ears
  // eyes: whites, iris, pupil, a catchlight (on the eye bones: they squash to blink)
  for (const s of [1, -1]) {
    const e = s > 0 ? 'eyeL' : 'eyeR', ex = s * FACE.eye[0], ey = FACE.eye[1];
    add(rbox(0.038, 0.042, 0.01, 0.3), HM(ex, ey, fz), C('#f2ede4'), e, MAT.eye, 0);
    add(rbox(0.022, 0.03, 0.006, 0.3), HM(ex, ey - 0.002, fz + 0.005), C(L.eyes), e, MAT.eye, 0);
    add(rbox(0.012, 0.018, 0.004, 0.3), HM(ex, ey - 0.002, fz + 0.008), C('#0b0a0a'), e, MAT.eye, 0);
    add(rbox(0.006, 0.006, 0.002, 0.2), HM(ex + 0.005, ey + 0.006, fz + 0.0105), C('#ffffff'), e, MAT.eye, 0);
    add(rbox(0.048, 0.013, 0.012, 0.3), HM(s * FACE.brow[0], FACE.brow[1], FACE.brow[2], 0, 0, -s * 0.08), brow, s > 0 ? 'browL' : 'browR', MAT.hair, 0);
  }
  // block mouth: a dark slot, a row of teeth, three-piece lips (sides ride the corner bones)
  { const my = FACE.mouthY;
    add(rbox(0.05, 0.026, 0.012, 0.2), HM(0, my - 0.006, fz - 0.007), C('#2a1012'), 'head', MAT.lips, 0);
    add(rbox(0.034, 0.008, 0.005, 0.2), HM(0, my + 0.001, fz - 0.004), C('#ece6da'), 'head', MAT.eye, 0); // teeth, behind the closed lips
    add(rbox(0.026, 0.0105, 0.012, 0.25), HM(0, my + 0.0052, fz + 0.002), lip, 'head', MAT.lips, 0);
    add(rbox(0.024, 0.0105, 0.012, 0.25), HM(0, my - 0.0052, fz + 0.002), lip.clone().multiplyScalar(0.86), 'jaw', MAT.lips, 0);
    for (const s of [1, -1]) {
      add(rbox(0.015, 0.009, 0.011, 0.25), HM(s * 0.019, my + 0.0045, fz + 0.0015), lip, s > 0 ? 'cornerL' : 'cornerR', MAT.lips, 0);
      add(rbox(0.014, 0.009, 0.011, 0.25), HM(s * 0.018, my - 0.0045, fz + 0.0015), lip.clone().multiplyScalar(0.86), s > 0 ? 'cornerL' : 'cornerR', MAT.lips, 0);
    }
  }
  if (L.freckles) for (let i = 0; i < 8; i++) { const r = rng(i + 3), s = i % 2 ? 1 : -1; add(rbox(0.007, 0.007, 0.002, 0.2), HM(s * (0.03 + r() * 0.035), 0.075 + r() * 0.02, fz + 0.001), skin.clone().multiplyScalar(0.7), 'head', MAT.skin, 0); }
  if (L.beard) {
    const bc = hair.clone().multiplyScalar(0.9);
    add(rbox(0.205, 0.06, 0.07, 0.2), HM(0, 0.022, 0.075), bc, 'jaw', MAT.hair);
    add(rbox(0.06, 0.014, 0.016, 0.3), HM(0, FACE.mouthY + 0.019, fz + 0.004), bc, 'head', MAT.hair, 0); // moustache
    for (const s of [1, -1]) add(rbox(0.024, 0.11, 0.1, 0.2), HM(s * 0.1, 0.08, 0.035), bc, 'head', MAT.hair);
  }
  buildHair(add, HM, L, hair);
  if (L.glasses) { const fc = C('#1d1d1f'); for (const s of [1, -1]) { add(rbox(0.05, 0.008, 0.008, 0.2), HM(s * FACE.eye[0], FACE.eye[1] + 0.024, fz + 0.014), fc, 'head', MAT.metal, 0); add(rbox(0.05, 0.008, 0.008, 0.2), HM(s * FACE.eye[0], FACE.eye[1] - 0.024, fz + 0.014), fc, 'head', MAT.metal, 0); for (const t of [-1, 1]) add(rbox(0.008, 0.05, 0.008, 0.2), HM(s * FACE.eye[0] + t * 0.025, FACE.eye[1], fz + 0.014), fc, 'head', MAT.metal, 0); add(rbox(0.008, 0.008, 0.11, 0.2), HM(s * 0.1, FACE.eye[1] + 0.01, 0.05), fc, 'head', MAT.metal, 0); } add(rbox(0.014, 0.008, 0.008), HM(0, FACE.eye[1] + 0.015, fz + 0.014), fc, 'head', MAT.metal, 0); }
  if (L.goggles) { add(rbox(0.215, 0.022, 0.215, 0.1), HM(0, 0.19, 0.0), C('#3a3330'), 'head', MAT.leather, 0); for (const s of [1, -1]) { add(rbox(0.05, 0.042, 0.03, 0.3), HM(s * 0.035, 0.192, fz + 0.012), C('#6a5a48'), 'head', MAT.metal, 0); add(rbox(0.038, 0.03, 0.006), HM(s * 0.035, 0.192, fz + 0.028), C('#3f8aa8'), 'head', MAT.eye, 0); } }
  if (L.earrings) for (const s of [1, -1]) add(rbox(0.01, 0.014, 0.01), HM(s * 0.104, 0.075, 0.005), C('#d8b45a'), 'head', MAT.metal, 0);
  if (outfit === 'worker') { add(rbox(0.235, 0.075, 0.24, 0.3), HM(0, 0.235, 0.0), C('#d8a020'), 'head', MAT.rubber); add(rbox(0.25, 0.012, 0.29, 0.2), HM(0, 0.2, 0.02), C('#c89018'), 'head', MAT.rubber, 0); }

  // ---- outfit pieces
  if (runner) {
    add(rbox(0.14, 0.05, 0.13), at('chest', 0, 1.395, -0.01), prim.clone().multiplyScalar(0.72), 'chest', MAT.canvas); // standing collar
    for (const s of [1, -1]) add(rbox(0.032, 0.3, 0.012), at('chest', s * 0.075 * sh, 1.22, 0.108, -0.04, 0, s * 0.1), C('#3b332b'), 'chest', MAT.leather, 0); // harness
    add(rbox(0.21 * sh, 0.028, 0.012), at('chest', 0, 1.17, 0.108), C('#3b332b'), 'chest', MAT.leather, 0);
    add(rbox(0.03, 0.03, 0.01), at('chest', 0, 1.17, 0.116), C('#b8b0a0'), 'chest', MAT.metal, 0);
  }
  if (runner || work) {
    add(rbox(0.315 * hw, 0.04, 0.2), at('hips', 0, 0.99, 0), C('#2a221b'), 'hips', MAT.leather, 0); // belt
    add(rbox(0.05, 0.035, 0.012), at('hips', 0, 0.99, 0.103), C('#b8a070'), 'hips', MAT.metal, 0);
    for (const s of [1, -1]) add(rbox(0.07, 0.08, 0.05), at('hips', s * 0.12 * hw, 0.94, 0.08), C(work ? '#5a4630' : '#3b332b'), 'hips', MAT.leather);
  }
  if (work) add(rbox(0.09, 0.08, 0.016), at('chest', 0.07 * sh, 1.27, 0.105), prim.clone().multiplyScalar(0.85), 'chest', MAT.canvas, 0); // chest pocket
  if (outfit === 'smart') add(rbox(0.03, 0.26, 0.012), at('chest', 0, 1.22, 0.108), sec, 'chest', MAT.cloth, 0); // tie
  if (L.backpack) { add(rbox(0.25, 0.3, 0.11), at('chest', 0, 1.22, -0.16), C('#3b3f45'), 'chest', MAT.canvas); add(rbox(0.24, 0.07, 0.07, 0.4), at('chest', 0, 1.39, -0.16), sec, 'chest', MAT.canvas); }
  if (L.hood) add(rbox(0.24, 0.09, 0.12), at('chest', 0, 1.41, -0.1), prim.clone().multiplyScalar(0.9), 'chest', topMat);
  if (L.vest) { add(rbox(0.37 * sh, 0.24, 0.225), at('chest', 0, 1.24, 0), C(L.vest), 'chest', MAT.canvas); }
  if (L.scarf) { const sc = C(L.scarf); add(rbox(0.16, 0.06, 0.15, 0.4), at('chest', 0, 1.4, 0.005), sc, 'chest', MAT.knit); add(rbox(0.055, 0.18, 0.025), at('chest', 0.05, 1.27, 0.115, 0, 0, 0.08), sc, 'chest', MAT.knit); }
  if (L.apron) { const ap = C(L.apron); add(rbox(0.28 * hw, 0.2, 0.02), at('spine', 0, 1.05, 0.1), ap, 'spine', MAT.cloth, 0); add(rbox(0.28 * hw, 0.3, 0.02), at('hips', 0, 0.8, 0.105), ap, 'hips', MAT.cloth, 0); }
  if (L.tiedJacket) { const tj = C(L.tiedJacket); add(rbox(0.32 * hw, 0.07, 0.21), at('hips', 0, 0.95, 0), tj, 'hips', MAT.canvas); add(rbox(0.28 * hw, 0.26, 0.03), at('hips', 0, 0.8, -0.11), tj, 'hips', MAT.canvas); }
  if (coat) for (const s of [1, -1]) add(rbox(0.16 * hw, 0.42, 0.18), at('thigh', s * 0.095 * hw, 0.68, -0.005), coat, s > 0 ? 'thighL' : 'thighR', MAT.cloth); // coat skirts over the thighs

  return M.build();
}

// Hair as blocks: a cap over the crown and back of the head plus a style piece.
function buildHair(add, HM, L, hair) {
  const style = L.hairStyle; if (style === 'bald') return;
  const hc = hair, dark = hair.clone().multiplyScalar(0.82);
  if (style === 'shaved') {
    const sc = hair.clone().lerp(new THREE.Color(L.skin), 0.45);
    add(rbox(0.206, 0.03, 0.208, 0.3), HM(0, 0.212, 0.005), sc, 'head', MAT.hair, 0);
    add(rbox(0.206, 0.1, 0.02, 0.3), HM(0, 0.165, -0.098), sc, 'head', MAT.hair, 0);
    return;
  }
  const capH = style === 'crop' ? 0.055 : 0.07;
  add(rbox(0.216, capH, 0.218, 0.25), HM(0, 0.205 + capH / 2 - 0.02, 0.002), hc, 'head', MAT.hair, 0.1);
  add(rbox(0.216, 0.15, 0.04, 0.25), HM(0, 0.15, -0.092), dark, 'head', MAT.hair, 0.15); // back
  for (const s of [1, -1]) add(rbox(0.02, 0.07, 0.15, 0.25), HM(s * 0.104, 0.172, -0.02), dark, 'head', MAT.hair, 0.1); // sides
  add(rbox(0.21, 0.03, 0.03, 0.3), HM(0, 0.2, 0.1), hc, 'head', MAT.hair, 0); // fringe line
  if (style === 'swept') add(rbox(0.17, 0.055, 0.1, 0.3), HM(0.015, 0.25, 0.05, -0.35, 0, 0.12), hc, 'head', MAT.hair, 0.1);
  if (style === 'crop') add(rbox(0.12, 0.03, 0.08, 0.3), HM(0, 0.24, 0.04), hc, 'head', MAT.hair, 0);
  if (style === 'bun') add(rbox(0.08, 0.075, 0.08, 0.35), HM(0, 0.25, -0.07), hc, 'head', MAT.hair, 0.12);
  if (style === 'curls') { const r = rng(9); for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, rr = 0.03 + r() * 0.07; add(rbox(0.06, 0.05, 0.06, 0.35), HM(Math.cos(a) * rr, 0.225 + r() * 0.02, Math.sin(a) * rr - 0.01), i % 3 ? hc : dark, 'head', MAT.hair, 0.1); } }
  if (style === 'long') {
    add(rbox(0.22, 0.3, 0.05, 0.25), HM(0, 0.02, -0.105), dark, 'hair1', MAT.hair, 0.15);
    for (const s of [1, -1]) add(rbox(0.03, 0.17, 0.06, 0.3), HM(s * 0.105, 0.08, 0.025), hc, 'head', MAT.hair, 0.1);
  }
  if (style === 'ponytail' || style === 'braid') {
    const h1 = FACE.hair1, h2 = FACE.hair2;
    add(rbox(0.05, 0.035, 0.05, 0.3), HM(h1[0], h1[1], h1[2] - 0.005), new THREE.Color('#2a2a2a'), 'hair1', MAT.rubber, 0); // band
    if (style === 'ponytail') add(rbox(0.055, 0.2, 0.05, 0.35), HM(h2[0], h2[1] - 0.04, h2[2] - 0.01), hc, 'hair2', MAT.hair, 0.15);
    else for (let i = 0; i < 4; i++) add(rbox(0.048, 0.05, 0.045, 0.35), HM(h2[0] + (i % 2 ? 0.005 : -0.005), h2[1] + 0.03 - i * 0.05, h2[2] - 0.01), i % 2 ? dark : hc, 'hair2', MAT.hair, 0.1);
  }
}
