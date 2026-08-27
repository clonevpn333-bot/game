/* Geometry for everything that grows or sits on the mountain. Built once at
 * load, instanced everywhere. No models, no imports — just maths and materials. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { materials, foliageMaterial, grassMaterial, heightFog } from '../gfx/materials.js';
import { materialMaps } from '../gfx/textures.js';
import { rng, Noise } from '../../shared/rng.js';

/** Lathe-style tapered trunk that leans and bends. */
function trunk(height, r0, r1, lean, bend, seed, segs = 7, radial = 7) {
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    pts.push(new THREE.Vector3(
      Math.sin(t * bend + lean) * height * 0.16 * t + (r() - 0.5) * 0.06,
      t * height,
      Math.cos(t * bend * 0.6) * height * 0.06 * t * t,
    ));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(curve, segs * 2, r0, radial, false);
  // taper: squeeze the radius toward the top
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const t = THREE.MathUtils.clamp(v.y / height, 0, 1);
    const c = curve.getPoint(t);
    const k = THREE.MathUtils.lerp(1, r1 / r0, Math.pow(t, 0.8));
    v.x = c.x + (v.x - c.x) * k;
    v.z = c.z + (v.z - c.z) * k;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function cards(count, spec, seed) {
  const r = rng(seed);
  const geos = [];
  for (let i = 0; i < count; i++) {
    const g = new THREE.PlaneGeometry(spec.w * (0.7 + r() * 0.6), spec.h * (0.7 + r() * 0.6), 1, spec.segs || 2);
    g.translate(0, spec.h * 0.42, 0);
    const m = new THREE.Matrix4();
    const e = new THREE.Euler(
      (spec.pitch ?? -0.5) + (r() - 0.5) * 0.7,
      (i / count) * Math.PI * 2 + r() * 0.5,
      (r() - 0.5) * 0.5,
    );
    m.makeRotationFromEuler(e);
    m.setPosition(
      Math.cos((i / count) * Math.PI * 2) * (spec.spread ?? 0),
      (spec.y ?? 0) + (r() - 0.5) * (spec.yJitter ?? 0),
      Math.sin((i / count) * Math.PI * 2) * (spec.spread ?? 0),
    );
    g.applyMatrix4(m);
    // canopy lighting: bend the card normals toward the sky so foliage reads soft
    const nAttr = g.attributes.normal, pAttr = g.attributes.position;
    const nv = new THREE.Vector3(), pv = new THREE.Vector3();
    for (let k = 0; k < nAttr.count; k++) {
      nv.fromBufferAttribute(nAttr, k);
      pv.fromBufferAttribute(pAttr, k);
      nv.lerp(new THREE.Vector3(pv.x * 0.25, 1, pv.z * 0.25).normalize(), 0.72).normalize();
      nAttr.setXYZ(k, nv.x, nv.y, nv.z);
    }
    geos.push(g);
  }
  return mergeGeometries(geos);
}

/** Minimal geometry merge (position/normal/uv only) so we avoid an extra import. */
export function mergeGeometries(list) {
  let vCount = 0, iCount = 0;
  for (const g of list) { vCount += g.attributes.position.count; iCount += g.index ? g.index.count : 0; }
  const pos = new Float32Array(vCount * 3), nor = new Float32Array(vCount * 3), uv = new Float32Array(vCount * 2);
  const idx = new Uint32Array(iCount);
  let vo = 0, io = 0;
  for (const g of list) {
    const p = g.attributes.position, n = g.attributes.normal, t = g.attributes.uv;
    pos.set(p.array, vo * 3);
    if (n) nor.set(n.array, vo * 3);
    if (t) uv.set(t.array, vo * 2);
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.array[i] + vo;
    vo += p.count; io += g.index ? g.index.count : 0;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

/** Irregular boulder: subdivided icosahedron pushed around by noise. */
export function boulder(radius, seed, detail = 2) {
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const n = new Noise(seed);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const d = n.fbm(v.x * 0.6 + seed, v.z * 0.6 - v.y * 0.4, 4);
    v.multiplyScalar(1 + d * 0.36);
    v.y *= 0.72 + Math.abs(d) * 0.3;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  geo.translate(0, radius * 0.38, 0);
  return geo;
}

let LIB = null;
/** All prop meshes, keyed by name: { geo, mat, shadow } */
export function flora() {
  if (LIB) return LIB;
  const M = materials();
  const leafJungle = foliageMaterial(101, 0.30);
  const leafPalm = foliageMaterial(202, 0.24);
  const leafPine = foliageMaterial(303, 0.38);
  const leafDry = foliageMaterial(404, 0.11);
  const grassLow = grassMaterial(505, 0.24);
  const grassAlp = grassMaterial(606, 0.16);

  LIB = {
    palm: {
      parts: [
        { geo: trunk(8.2, 0.24, 0.14, 0.16, 0.5, 11), mat: M.bark },
        { geo: cards(13, { w: 5.6, h: 5.4, y: 7.9, pitch: -0.75, spread: 0.3, yJitter: 0.35 }, 12), mat: leafPalm },
      ],
      radius: 3.2,
    },
    jungleTree: {
      parts: [
        { geo: trunk(13.5, 0.42, 0.2, 0.06, 0.3, 21), mat: M.bark },
        { geo: cards(18, { w: 8.6, h: 6.6, y: 10.0, pitch: -0.30, spread: 2.1, yJitter: 2.2 }, 22), mat: leafJungle },
      ],
      radius: 4.6,
    },
    smallTree: {
      parts: [
        { geo: trunk(6.4, 0.2, 0.1, 0.2, 0.6, 31), mat: M.bark },
        { geo: cards(11, { w: 4.6, h: 3.8, y: 4.8, pitch: -0.35, spread: 1.0, yJitter: 1.1 }, 32), mat: leafJungle },
      ],
      radius: 2.4,
    },
    pine: {
      parts: [
        { geo: trunk(11.0, 0.30, 0.08, 0.03, 0.12, 41), mat: M.bark },
        { geo: cards(17, { w: 4.4, h: 3.8, y: 4.2, pitch: -0.12, spread: 1.4, yJitter: 3.6 }, 42), mat: leafPine },
      ],
      radius: 3.0,
    },
    deadTree: {
      parts: [
        { geo: trunk(7.5, 0.26, 0.05, 0.34, 1.0, 51), mat: M.bark },
        { geo: cards(4, { w: 1.6, h: 1.4, y: 5.2, pitch: 0.2, spread: 0.6, yJitter: 1.4 }, 52), mat: leafDry },
      ],
      radius: 2.0,
    },
    fern: {
      parts: [{ geo: cards(6, { w: 2.1, h: 1.8, y: 0.15, pitch: -0.7, spread: 0.18, yJitter: 0.12 }, 61), mat: leafJungle }],
      radius: 1.1, noShadow: true,
    },
    grass: {
      parts: [{ geo: cards(4, { w: 1.5, h: 1.1, y: 0.05, pitch: -0.12, spread: 0.1 }, 71), mat: grassLow }],
      radius: 0.8, noShadow: true,
    },
    tussock: {
      parts: [{ geo: cards(4, { w: 1.2, h: 0.8, y: 0.04, pitch: -0.1, spread: 0.09 }, 81), mat: grassAlp }],
      radius: 0.7, noShadow: true,
    },
    boulderL: { parts: [{ geo: boulder(2.4, 91, 2), mat: M.rockProp }], radius: 2.4 },
    boulderM: { parts: [{ geo: boulder(1.2, 92, 2), mat: M.rockProp }], radius: 1.2 },
    boulderS: { parts: [{ geo: boulder(0.55, 93, 1), mat: M.rockProp }], radius: 0.6 },
    obsidian: { parts: [{ geo: boulder(1.6, 94, 1), mat: obsidianMat() }], radius: 1.6 },
    driftwood: { parts: [{ geo: trunk(3.4, 0.22, 0.12, 1.45, 0.5, 95, 5, 6), mat: M.bark }], radius: 1.8 },
  };
  return LIB;
}

function obsidianMat() {
  const maps = materialMaps('ash', 77, null, 2);
  return heightFog(new THREE.MeshStandardMaterial({ ...maps, roughness: 0.28, metalness: 0.12, color: 0x5a4a48 }), null, 'std');
}
