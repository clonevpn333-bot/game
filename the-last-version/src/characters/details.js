// Surface details for sculpted clothing: raised seams, stitching, zippers,
// laces — real geometry projected onto the garment's SDF surface.
import * as THREE from 'three';
import { skinWeights } from './sculpt.js';

const g3 = [0, 0, 0];
export function project(sculpt, p, offset = 0, iters = 6) {
  let x = p[0], y = p[1], z = p[2];
  for (let i = 0; i < iters; i++) {
    const d = sculpt.eval(x, y, z) - offset;
    sculpt.grad(x, y, z, g3);
    x -= g3[0] * d; y -= g3[1] * d; z -= g3[2] * d;
    if (Math.abs(d) < 1e-5) break;
  }
  sculpt.grad(x, y, z, g3);
  return { p: new THREE.Vector3(x, y, z), n: new THREE.Vector3(g3[0], g3[1], g3[2]) };
}

/** Find the surface point by marching from `from` along `dir`. */
export function raySurface(sculpt, from, dir, maxT = 0.5) {
  let t = 0;
  for (let i = 0; i < 128 && t < maxT; i++) {
    const d = sculpt.eval(from[0] + dir[0] * t, from[1] + dir[1] * t, from[2] + dir[2] * t);
    if (d < 0.0004) return [from[0] + dir[0] * t, from[1] + dir[1] * t, from[2] + dir[2] * t];
    t += Math.max(d * 0.9, 0.0005);
  }
  return null;
}

function ensureAO(geo) { if (!geo.attributes.ao) geo.setAttribute('ao', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count).fill(1), 1)); return geo; }

/** Tube following a curve on the surface. Returns geometry (unskinned). */
export function surfaceTube(sculpt, pts, { radius = 0.0016, lift = 0.0006, samples = 40, radial = 5 } = {}) {
  const proj = pts.map((p) => project(sculpt, p).p);
  const curve = new THREE.CatmullRomCurve3(proj);
  const fine = curve.getSpacedPoints(samples).map((p) => { const r = project(sculpt, [p.x, p.y, p.z]); return r.p.addScaledVector(r.n, lift + radius * 0.4); });
  return ensureAO(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fine), samples * 2, radius, radial, false));
}

/** Dashed stitch line: short capsules along a surface curve. */
export function stitches(sculpt, pts, { spacing = 0.006, len = 0.0035, radius = 0.0006, lift = 0.0006 } = {}) {
  const proj = pts.map((p) => project(sculpt, p).p);
  const curve = new THREE.CatmullRomCurve3(proj);
  const n = Math.max(2, Math.floor(curve.getLength() / spacing));
  const geos = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    const r = project(sculpt, [p.x, p.y, p.z]);
    const c = new THREE.CylinderGeometry(radius, radius, len, 4, 1);
    c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan));
    c.translate(r.p.x + r.n.x * lift, r.p.y + r.n.y * lift, r.p.z + r.n.z * lift);
    geos.push(c);
  }
  return ensureAO(merge(geos));
}

/** Zipper: tape + interlocking teeth + slider/pull, along a surface curve. */
export function zipper(sculpt, pts, { teeth = 60, width = 0.007, sliderAt = 0.98 } = {}) {
  const proj = pts.map((p) => project(sculpt, p).p);
  const curve = new THREE.CatmullRomCurve3(proj);
  const geos = [];
  for (let i = 0; i < teeth; i++) {
    const t = i / teeth;
    const p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    const r = project(sculpt, [p.x, p.y, p.z]);
    const side = new THREE.Vector3().crossVectors(tan, r.n).normalize();
    const b = new THREE.BoxGeometry(width * 0.55, 0.0018, 0.0016);
    const m = new THREE.Matrix4().makeBasis(side, tan, r.n);
    b.applyMatrix4(m);
    const off = (i % 2 ? 1 : -1) * width * 0.2;
    b.translate(r.p.x + side.x * off + r.n.x * 0.0012, r.p.y + side.y * off + r.n.y * 0.0012, r.p.z + side.z * off + r.n.z * 0.0012);
    geos.push(b);
  }
  // slider + pull tab
  const p = curve.getPointAt(sliderAt), tan = curve.getTangentAt(sliderAt), r = project(sculpt, [p.x, p.y, p.z]);
  const side = new THREE.Vector3().crossVectors(tan, r.n).normalize();
  const m = new THREE.Matrix4().makeBasis(side, tan, r.n).setPosition(r.p.clone().addScaledVector(r.n, 0.003));
  const s = new THREE.BoxGeometry(0.009, 0.012, 0.004); s.applyMatrix4(m); geos.push(s);
  const tab = new THREE.BoxGeometry(0.006, 0.02, 0.0015); tab.translate(0, -0.014, 0.003); tab.applyMatrix4(m); geos.push(tab);
  return ensureAO(merge(geos));
}

export function merge(geos) {
  let total = 0, totalIdx = 0;
  const parts = geos.map((g) => { const ng = g.index ? g : g; return ng; });
  for (const g of parts) { total += g.attributes.position.count; totalIdx += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(total * 3), nor = new Float32Array(total * 3), idx = new Uint32Array(totalIdx);
  let vo = 0, io = 0;
  for (const g of parts) {
    pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3);
    if (g.index) { for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.array[i] + vo; io += g.index.count; }
    else { for (let i = 0; i < g.attributes.position.count; i++) idx[io + i] = vo + i; io += g.attributes.position.count; }
    vo += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

/** Skins a detail geometry with the same primitives as its garment and adds it to the character. */
export function attachDetail(ch, geo, material, prims, name = 'detail', softness = 0.03) {
  ensureAO(geo);
  skinWeights(geo, prims, ch.boneIndex, { softness });
  return ch.addSkinned(geo, material, name);
}
