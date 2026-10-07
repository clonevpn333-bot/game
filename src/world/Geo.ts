import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { noise3 } from '../core/math';

/** Box with UVs in metres so textures tile consistently at any size. */
export function boxGeo(w: number, h: number, d: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  const n = g.getAttribute('normal') as THREE.BufferAttribute;
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    const x = p.getX(i) + w / 2, y = p.getY(i) + h / 2, z = p.getZ(i) + d / 2;
    if (nx > 0.5) uv.setXY(i, z, y);
    else if (ny > 0.5) uv.setXY(i, x, z);
    else uv.setXY(i, x, y);
  }
  return g;
}

export function roundedGeo(w: number, h: number, d: number, r: number, seg = 3): THREE.BufferGeometry {
  const rr = Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001);
  return new RoundedBoxGeometry(w, h, d, seg, Math.max(0.001, rr));
}

const puffCache = new Map<number, THREE.BufferGeometry>();
/** Lumpy cloud puff: icosphere with baked noise displacement, flattened bottom. */
export function puffGeo(variant = 0, detail = 2): THREE.BufferGeometry {
  const key = variant * 10 + detail;
  const hit = puffCache.get(key);
  if (hit) return hit.clone();
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = noise3(v.x * 1.6 + variant * 3.1, v.y * 1.6, v.z * 1.6) * 0.16 + noise3(v.x * 3.4, v.y * 3.4 + variant, v.z * 3.4) * 0.06;
    v.multiplyScalar(1 + n);
    if (v.y < -0.35) v.y = -0.35 + (v.y + 0.35) * 0.3;
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  puffCache.set(key, g);
  return g.clone();
}

/** Strip to position/normal/uv, make non-indexed, add vertex color with optional vertical AO. */
export function prep(
  geo: THREE.BufferGeometry,
  color: THREE.ColorRepresentation,
  ao = 0.25,
  topColor?: THREE.ColorRepresentation,
): THREE.BufferGeometry {
  let g = geo.index ? geo.toNonIndexed() : geo;
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
  }
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  if (!g.getAttribute('uv')) {
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
  }
  g.computeBoundingBox();
  const bb = g.boundingBox!;
  const h = Math.max(1e-4, bb.max.y - bb.min.y);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const c = new THREE.Color(color);
  const top = topColor !== undefined ? new THREE.Color(topColor) : null;
  const tmp = new THREE.Color();
  const cols = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const t = (p.getY(i) - bb.min.y) / h;
    tmp.copy(c);
    if (top) tmp.lerp(top, t);
    const k = 1 - ao * (1 - Math.min(1, t * 1.6));
    cols[i * 3] = tmp.r * k;
    cols[i * 3 + 1] = tmp.g * k;
    cols[i * 3 + 2] = tmp.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  if (g === geo) g = g.clone();
  return g;
}
