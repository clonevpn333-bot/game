import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type V3t = [number, number, number];

export function xf(geo: THREE.BufferGeometry, p: V3t = [0, 0, 0], r: V3t = [0, 0, 0], s: V3t = [1, 1, 1]): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
  geo.applyMatrix4(m);
  return geo;
}

export const G = {
  box: (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z),
  cyl: (rt: number, rb: number, h: number, seg = 10, open = false) => new THREE.CylinderGeometry(rt, rb, h, seg, 1, open),
  sph: (r: number, w = 14, h = 10) => new THREE.SphereGeometry(r, w, h),
  hemi: (r: number, w = 16, h = 8) => new THREE.SphereGeometry(r, w, h, 0, Math.PI * 2, 0, Math.PI / 2),
  cone: (r: number, h: number, seg = 10) => new THREE.ConeGeometry(r, h, seg, 1),
  torus: (r: number, t: number, rs = 8, ts = 24, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc),
  lathe: (pts: [number, number][], seg = 16) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg),
  oct: (r: number) => new THREE.OctahedronGeometry(r),
};

/** A bell silhouette (used everywhere: it's the world's sacred motif). */
export function bellGeo(r: number, seg = 14): THREE.BufferGeometry {
  return G.lathe(
    [
      [0, r * 1.5],
      [r * 0.35, r * 1.45],
      [r * 0.55, r * 1.2],
      [r * 0.62, r * 0.6],
      [r * 0.8, r * 0.1],
      [r * 1.0, -r * 0.05],
      [r * 0.95, -r * 0.1],
    ],
    seg,
  );
}

/** Gear ring with teeth. */
export function gearGeo(r: number, thickness: number, teeth: number, toothSize: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [G.torus(r, thickness, 6, Math.max(16, teeth * 2))];
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    parts.push(xf(G.box(toothSize, toothSize * 1.4, thickness * 1.6), [Math.cos(a) * (r + thickness), Math.sin(a) * (r + thickness), 0], [0, 0, a + Math.PI / 2]));
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    parts.push(xf(G.box(thickness * 0.8, r * 2, thickness * 0.8), [0, 0, 0], [0, 0, a]));
  }
  return merge(parts);
}

export function merge(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const norm = list.map((g) => {
    let n = g.index ? g.toNonIndexed() : g;
    if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2));
    if (!n.attributes.normal) n.computeVertexNormals();
    for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k);
    return n;
  });
  const m = mergeGeometries(norm, false);
  if (!m) throw new Error('merge failed');
  return m;
}

/**
 * Collects geometry per (parent object, material) and emits one merged mesh per
 * pair. This keeps colossal multi-part machines at a few dozen draw calls.
 */
export class MeshBuilder {
  private readonly buckets = new Map<THREE.Object3D, Map<THREE.Material, THREE.BufferGeometry[]>>();

  add(parent: THREE.Object3D, mat: THREE.Material, geo: THREE.BufferGeometry): this {
    let m = this.buckets.get(parent);
    if (!m) this.buckets.set(parent, (m = new Map()));
    let l = m.get(mat);
    if (!l) m.set(mat, (l = []));
    l.push(geo);
    return this;
  }

  build(opts: { castShadow?: boolean; receiveShadow?: boolean } = {}): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const [parent, mats] of this.buckets) {
      for (const [mat, list] of mats) {
        const mesh = new THREE.Mesh(merge(list), mat);
        mesh.castShadow = opts.castShadow ?? true;
        mesh.receiveShadow = opts.receiveShadow ?? true;
        parent.add(mesh);
        out.push(mesh);
      }
    }
    this.buckets.clear();
    return out;
  }
}
