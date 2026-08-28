/* Builds a climber: a real skinned mesh with silhouette, layered gear and
 * per-part materials, generated from the skeleton's rest pose. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { makeSkeleton, segments, segDistance } from './rig.js';
import { mergeGeometries } from '../world/flora.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Sweeps a closed ring along a polyline. profile(t) -> {rx, rz} in metres. */
function tube(points, profile, radial = 12, capStart = true, capEnd = true) {
  const rings = points.length;
  const pos = [], nor = [], uv = [], idx = [];
  const tangent = new THREE.Vector3(), right = new THREE.Vector3(), up = new THREE.Vector3();
  const ref = new THREE.Vector3();
  for (let i = 0; i < rings; i++) {
    const p = points[i];
    const a = points[Math.max(0, i - 1)], b = points[Math.min(rings - 1, i + 1)];
    tangent.subVectors(b, a).normalize();
    ref.set(0, 0, 1);
    if (Math.abs(tangent.z) > 0.88) ref.set(0, 1, 0);
    right.crossVectors(ref, tangent).normalize();
    up.crossVectors(tangent, right).normalize();
    const t = i / (rings - 1);
    const { rx, rz } = profile(t);
    for (let j = 0; j <= radial; j++) {
      const a2 = (j / radial) * Math.PI * 2;
      const c = Math.cos(a2), s2 = Math.sin(a2);
      const nx = right.x * c * rz + up.x * s2 * rx;
      const ny = right.y * c * rz + up.y * s2 * rx;
      const nz = right.z * c * rz + up.z * s2 * rx;
      pos.push(p.x + nx, p.y + ny, p.z + nz);
      const len = Math.hypot(nx, ny, nz) || 1;
      nor.push(nx / len, ny / len, nz / len);
      uv.push(j / radial, t);
    }
  }
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = a + 1, c = a + radial + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  // Rounded caps, appended after the tube body so indices stay valid.
  const dirEnd = new THREE.Vector3().subVectors(points[rings - 1], points[rings - 2]).normalize();
  const dirStart = new THREE.Vector3().subVectors(points[0], points[1]).normalize();
  const span = points[0].distanceTo(points[rings - 1]);
  const capLen = (r) => Math.min(r, span * 0.45) * 0.85;
  if (capEnd) {
    const c = points[rings - 1].clone().addScaledVector(dirEnd, capLen(profile(1).rx));
    const base = pos.length / 3;
    pos.push(c.x, c.y, c.z); nor.push(dirEnd.x, dirEnd.y, dirEnd.z); uv.push(0.5, 1);
    const ringStart = (rings - 1) * (radial + 1);
    for (let j = 0; j < radial; j++) idx.push(ringStart + j, ringStart + j + 1, base);
  }
  if (capStart) {
    const c = points[0].clone().addScaledVector(dirStart, capLen(profile(0).rx));
    const base = pos.length / 3;
    pos.push(c.x, c.y, c.z); nor.push(dirStart.x, dirStart.y, dirStart.z); uv.push(0.5, 0);
    for (let j = 0; j < radial; j++) idx.push(j + 1, j, base);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

const lerpV = (a, b, t) => a.clone().lerp(b, t);
function spline(a, b, n, bulge = 0, axis = V(0, 0, 1)) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const p = lerpV(a, b, t);
    p.addScaledVector(axis, Math.sin(t * Math.PI) * bulge);
    out.push(p);
  }
  return out;
}

const smooth = (t) => t * t * (3 - 2 * t);

/** Builds the geometry for one climber. Returns { geometry, materialsOrder }. */
function buildParts(rest, look) {
  const P = (n) => rest.get(n).clone();
  const parts = [];   // { geo, mat }
  const bulk = (look.bulk ?? 1) * 1.22;

  /* ---- torso: shirt / jacket shell ---- */
  const torsoPts = [
    P('hips').add(V(0, -0.06, 0)), P('hips'), P('spine1'), P('spine2'), P('chest'), P('neck').add(V(0, -0.01, 0)),
  ];
  const torsoProfile = (t) => {
    const waist = 0.155 + 0.02 * Math.sin(t * 3.1);
    const chest = 0.222;
    const rx = THREE.MathUtils.lerp(0.175, chest, smooth(Math.min(1, t * 1.35))) * bulk;
    const rz = rx * THREE.MathUtils.lerp(0.66, 0.62, t);
    return { rx: t < 0.35 ? waist * bulk * 1.05 : rx, rz };
  };
  parts.push({ geo: tube(torsoPts, torsoProfile, 16, false, false), mat: 'jacket' });

  // collar
  const collar = tube(spline(P('neck').add(V(0, -0.02, 0)), P('neck').add(V(0, 0.08, 0)), 4), () => ({ rx: 0.105, rz: 0.085 }), 14, false, false);
  parts.push({ geo: collar, mat: 'jacket' });

  /* ---- head and neck ---- */
  parts.push({ geo: tube(spline(P('neck'), P('head').add(V(0, -0.02, 0)), 3), () => ({ rx: 0.075, rz: 0.070 }), 10, false, false), mat: 'skin' });
  parts.push({ geo: head(P('head'), look), mat: 'skin' });

  /* ---- arms ---- */
  for (const side of ['L', 'R']) {
    const sh = P('clavicle' + side), arm = P('arm' + side), fore = P('fore' + side), hand = P('hand' + side), fin = P('finger' + side);
    parts.push({ geo: tube(spline(sh, arm, 4), (t) => ({ rx: (0.137 - t * 0.048) * bulk, rz: (0.125 - t * 0.044) * bulk }), 12, true, false), mat: 'jacket' });
    parts.push({ geo: tube(spline(arm, fore, 5), (t) => ({ rx: (0.082 - t * 0.010) * bulk, rz: (0.079 - t * 0.010) * bulk }), 11, false, false), mat: 'jacket' });
    parts.push({ geo: tube(spline(fore, hand, 5), (t) => ({ rx: 0.072 - t * 0.006, rz: 0.069 - t * 0.006 }), 11, false, false), mat: 'sleeve' });
    parts.push({ geo: tube(spline(hand, fin, 3), (t) => ({ rx: 0.082 - t * 0.020, rz: 0.062 - t * 0.014 }), 10), mat: 'glove' });
  }

  /* ---- legs ---- */
  for (const side of ['L', 'R']) {
    const hip = P('thigh' + side), knee = P('shin' + side), ankle = P('foot' + side), toe = P('toe' + side);
    parts.push({ geo: tube(spline(hip.clone().add(V(0, 0.05, 0)), knee, 6), (t) => ({ rx: (0.104 - t * 0.024) * bulk, rz: (0.100 - t * 0.022) * bulk }), 12, false, false), mat: 'trousers' });
    parts.push({ geo: tube(spline(knee, ankle, 6), (t) => ({ rx: (0.090 - t * 0.016) * bulk, rz: (0.087 - t * 0.016) * bulk }), 11, false, false), mat: 'trousers' });
    parts.push({ geo: boot(ankle, toe), mat: 'boot' });
  }

  /* ---- gear: belt, harness, straps ---- */
  const belt = tube(spline(P('hips').add(V(0, -0.03, 0)), P('hips').add(V(0, 0.06, 0)), 3), () => ({ rx: 0.19 * bulk, rz: 0.132 * bulk }), 16, false, false);
  parts.push({ geo: belt, mat: 'gear' });
  for (const s of [1, -1]) {
    const a = P('chest').add(V(0.11 * s, 0.07, -0.02));
    const b = P('hips').add(V(0.09 * s, 0.06, 0.12));
    parts.push({ geo: tube(spline(a, b, 6, 0.02, V(0, 0, 1)), () => ({ rx: 0.028, rz: 0.012 }), 6, false, false), mat: 'gear' });
  }
  return parts;
}

function head(center, look) {
  const geo = new THREE.SphereGeometry(0.152, 20, 16);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    v.z *= 1.06;
    v.y *= 1.16;
    if (v.y < 0) { v.z += Math.max(0, -v.y) * 0.34; v.x *= 1 - Math.max(0, -v.y) * 0.7; } // jaw
    if (v.y > 0.05 && v.z > 0) v.z += 0.012;                                              // brow
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  geo.translate(center.x, center.y + 0.105, center.z);
  return geo;
}

function boot(ankle, toe) {
  const shaft = tube(spline(ankle.clone().add(V(0, 0.14, 0)), ankle.clone().add(V(0, -0.02, 0)), 4), (t) => ({ rx: 0.082 + t * 0.008, rz: 0.079 + t * 0.008 }), 11, false, false);
  const foot = new THREE.BoxGeometry(0.105, 0.075, 0.27, 2, 2, 4);
  const pos = foot.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const front = THREE.MathUtils.clamp((v.z + 0.135) / 0.27, 0, 1);
    v.x *= 1 - Math.pow(front, 3) * 0.35;
    v.y += Math.pow(front, 3) * 0.018;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  foot.computeVertexNormals();
  foot.translate(ankle.x, ankle.y - 0.055, ankle.z + 0.055);
  return mergeGeometries([shaft, foot]);
}

/** Weights every vertex to the nearest bone segments. */
function skinGeometry(geo, boneIndexOf, segs) {
  const pos = geo.attributes.position;
  const count = pos.count;
  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  const p = new THREE.Vector3();
  const cand = [];
  for (let i = 0; i < count; i++) {
    p.fromBufferAttribute(pos, i);
    cand.length = 0;
    for (const s of segs) {
      const { d } = segDistance(p, s.a, s.b);
      cand.push({ bone: s.bone, w: 1 / Math.pow(Math.max(d - s.r * 0.35, 0.012), 3.1) });
    }
    cand.sort((a, b) => b.w - a.w);
    let total = 0;
    for (let k = 0; k < 4; k++) total += cand[k]?.w || 0;
    for (let k = 0; k < 4; k++) {
      const c = cand[k];
      skinIndex[i * 4 + k] = c ? boneIndexOf.get(c.bone) : 0;
      skinWeight[i * 4 + k] = c ? c.w / total : 0;
    }
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
}

/**
 * Creates one climber.
 * @param look  cosmetics description (see cosmetics.js)
 * @param mats  { skin, jacket, sleeve, glove, trousers, boot, gear, hair } materials
 * @param extras  optional [{ geo, mat }] from cosmetics (hats, packs)
 */
export function buildClimber(look, mats, extras = []) {
  const { skeleton, bones, byName, root, rest } = makeSkeleton();
  const boneIndexOf = new Map(bones.map((b, i) => [b.name, i]));
  const segs = segments(rest);

  const parts = [...buildParts(rest, look), ...extras];
  const order = [];
  const groups = [];
  const geos = [];
  let start = 0;
  const byMat = new Map();
  for (const part of parts) {
    if (!byMat.has(part.mat)) byMat.set(part.mat, []);
    byMat.get(part.mat).push(part.geo);
  }
  for (const [matName, list] of byMat) {
    const merged = mergeGeometries(list);
    geos.push(merged);
    groups.push({ start, count: merged.index.count, mat: matName });
    start += merged.index.count;
    order.push(matName);
  }
  const geometry = mergeGeometries(geos);
  for (const g of groups) geometry.addGroup(g.start, g.count, order.indexOf(g.mat));
  skinGeometry(geometry, boneIndexOf, segs);
  geometry.computeBoundingSphere();

  const materialList = order.map((n) => mats[n] || mats.jacket);
  const mesh = new THREE.SkinnedMesh(geometry, materialList);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  mesh.add(root);
  mesh.bind(skeleton);
  return { mesh, skeleton, bones, byName, root, rest };
}
