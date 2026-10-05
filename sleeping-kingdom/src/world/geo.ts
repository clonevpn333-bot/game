import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Normalise a geometry so it can be merged: non-indexed, position/normal/uv only. */
export function prep(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  for (const name of Object.keys(ng.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') ng.deleteAttribute(name);
  }
  if (!ng.attributes.uv) {
    const count = ng.attributes.position.count;
    ng.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(count * 2), 2));
  }
  if (!ng.attributes.normal) ng.computeVertexNormals();
  return ng;
}

const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();

export function place(
  g: THREE.BufferGeometry,
  x: number,
  y: number,
  z: number,
  ry = 0,
  sx = 1,
  sy = 1,
  sz = 1,
  rx = 0,
  rz = 0,
): THREE.BufferGeometry {
  tmpE.set(rx, ry, rz);
  tmpQ.setFromEuler(tmpE);
  tmpS.set(sx, sy, sz);
  tmpP.set(x, y, z);
  tmpM.compose(tmpP, tmpQ, tmpS);
  g.applyMatrix4(tmpM);
  return g;
}

/** Box whose UVs are in world units / `uvScale` so textures tile consistently across sizes. */
export function worldBox(w: number, h: number, d: number, uvScale = 4): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const n = g.attributes.normal as THREE.BufferAttribute;
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i += 1) {
    const nx = Math.abs(n.getX(i));
    const ny = Math.abs(n.getY(i));
    const px = p.getX(i) + w / 2;
    const py = p.getY(i) + h / 2;
    const pz = p.getZ(i) + d / 2;
    if (ny > 0.5) uv.setXY(i, px / uvScale, pz / uvScale);
    else if (nx > 0.5) uv.setXY(i, pz / uvScale, py / uvScale);
    else uv.setXY(i, px / uvScale, py / uvScale);
  }
  return prep(g);
}

/** Gabled roof prism, ridge along X. */
export function gableRoof(w: number, d: number, h: number, overhang = 0.6): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hd = d / 2 + overhang;
  shape.moveTo(-hd, 0);
  shape.lineTo(hd, 0);
  shape.lineTo(0, h);
  shape.lineTo(-hd, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: w + overhang * 2, bevelEnabled: false });
  g.translate(0, 0, -(w + overhang * 2) / 2);
  g.rotateY(Math.PI / 2);
  // World-ish UVs for slate.
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i += 1) {
    uv.setXY(i, p.getX(i) / 3, (p.getY(i) + Math.abs(p.getZ(i))) / 3);
  }
  return prep(g);
}

export function spire(radius: number, height: number, sides = 8): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(radius, height, sides, 1, true);
  g.translate(0, height / 2, 0);
  return prep(g);
}

export function lathe(profile: Array<[number, number]>, segments = 12): THREE.BufferGeometry {
  const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y));
  return prep(new THREE.LatheGeometry(pts, segments));
}

/** Gothic pointed arch opening, extruded. */
export function archFrame(width: number, height: number, depth: number, thickness: number): THREE.BufferGeometry {
  const outer = new THREE.Shape();
  const hw = width / 2;
  outer.moveTo(-hw - thickness, 0);
  outer.lineTo(-hw - thickness, height + thickness * 2);
  outer.lineTo(hw + thickness, height + thickness * 2);
  outer.lineTo(hw + thickness, 0);
  outer.lineTo(hw, 0);
  outer.lineTo(hw, height * 0.6);
  outer.quadraticCurveTo(hw, height * 0.95, 0, height);
  outer.quadraticCurveTo(-hw, height * 0.95, -hw, height * 0.6);
  outer.lineTo(-hw, 0);
  outer.lineTo(-hw - thickness, 0);
  const g = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: false });
  g.translate(0, 0, -depth / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i += 1) uv.setXY(i, (p.getX(i) + p.getZ(i)) / 4, p.getY(i) / 4);
  return prep(g);
}

/** Bridge span: a slab with a round arch cut from below. Spans along local X. */
export function bridgeSpan(span: number, height: number, depth: number): THREE.BufferGeometry {
  const s = new THREE.Shape();
  const hs = span / 2;
  s.moveTo(-hs, -height);
  s.lineTo(-hs, 0);
  s.lineTo(hs, 0);
  s.lineTo(hs, -height);
  s.lineTo(hs - 2.2, -height);
  s.absarc(0, -height, hs - 2.2, 0, Math.PI, false);
  s.lineTo(-hs, -height);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 10 });
  g.translate(0, 0, -depth / 2);
  const p = g.attributes.position as THREE.BufferAttribute;
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i += 1) uv.setXY(i, (p.getX(i) + p.getZ(i)) / 4, p.getY(i) / 4);
  return prep(g);
}

export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const m = mergeGeometries(list.map(prep), false);
  if (!m) throw new Error('mergeGeometries failed');
  m.computeBoundingSphere();
  return m;
}

/** Faceted rock: displaced icosahedron. */
export function rockGeo(seed: number, detail = 1): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i += 1) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const n = Math.sin(x * 3.1 + seed) * Math.cos(z * 2.7 + seed * 1.3) * 0.22 + Math.sin(y * 4.2 + seed * 2.1) * 0.12;
    const k = 1 + n;
    p.setXYZ(i, x * k, y * k * 0.75, z * k);
  }
  const ng = prep(g);
  ng.computeVertexNormals();
  return ng;
}
