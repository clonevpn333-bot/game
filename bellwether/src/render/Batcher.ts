import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { variant, type EchoMode } from './Materials';

interface Entry {
  geoms: THREE.BufferGeometry[];
  mat: THREE.Material;
  cast: boolean;
  receive: boolean;
  echo: EchoMode;
}

const _n = new THREE.Vector3();
const _p = new THREE.Vector3();
const _nm = new THREE.Matrix3();

/** Planar box-projected UVs in world space (meters / scale). */
export function worldUV(g: THREE.BufferGeometry, scale = 1, offset = 0): void {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const nor = g.getAttribute('normal') as THREE.BufferAttribute;
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    _p.fromBufferAttribute(pos, i);
    _n.fromBufferAttribute(nor, i);
    const ax = Math.abs(_n.x);
    const ay = Math.abs(_n.y);
    const az = Math.abs(_n.z);
    let u: number;
    let v: number;
    if (ay >= ax && ay >= az) {
      u = _p.x;
      v = _p.z;
    } else if (ax >= az) {
      u = _p.z * Math.sign(_n.x || 1);
      v = _p.y;
    } else {
      u = -_p.x * Math.sign(_n.z || 1);
      v = _p.y;
    }
    uv[i * 2] = u / scale + offset;
    uv[i * 2 + 1] = v / scale;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/**
 * Collects static geometry per material and merges it into a few large meshes.
 * Geometry is baked to world space at add() time.
 */
export class StaticBatcher {
  private entries = new Map<string, Entry>();
  private matIds = new WeakMap<THREE.Material, number>();
  private nextId = 1;
  meshes: THREE.Mesh[] = [];
  triangles = 0;

  private id(m: THREE.Material): number {
    let i = this.matIds.get(m);
    if (!i) {
      i = this.nextId++;
      this.matIds.set(m, i);
    }
    return i;
  }

  add(
    geom: THREE.BufferGeometry,
    mat: THREE.Material,
    matrix?: THREE.Matrix4,
    opts: { uv?: 'keep' | 'world'; uvScale?: number; cast?: boolean; receive?: boolean; echo?: EchoMode } = {},
  ): void {
    let g = geom.clone();
    if (matrix) g.applyMatrix4(matrix);
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    if (opts.uv === 'world') worldUV(g, opts.uvScale ?? 1);
    if (!g.getAttribute('uv')) worldUV(g, 1);
    // keep a consistent attribute set
    for (const name of Object.keys(g.attributes)) {
      if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
    }
    g.morphAttributes = {};
    if (!g.index) {
      const n = g.getAttribute('position').count;
      const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n);
      for (let i = 0; i < n; i++) idx[i] = i;
      g.setIndex(new THREE.BufferAttribute(idx, 1));
    }
    g.clearGroups();
    const cast = opts.cast ?? true;
    const receive = opts.receive ?? true;
    const key = `${this.id(mat)}-${cast ? 1 : 0}${receive ? 1 : 0}-${opts.echo ?? ''}`;
    let e = this.entries.get(key);
    if (!e) {
      e = { geoms: [], mat, cast, receive, echo: opts.echo };
      this.entries.set(key, e);
    }
    e.geoms.push(g);
  }

  /** Convenience: add a mesh (uses its world matrix after updateMatrixWorld). */
  addMesh(mesh: THREE.Mesh, opts: Parameters<StaticBatcher['add']>[3] = {}): void {
    mesh.updateMatrixWorld(true);
    this.add(mesh.geometry, mesh.material as THREE.Material, mesh.matrixWorld, opts);
  }

  /** Add every mesh in a group hierarchy. */
  addGroup(group: THREE.Object3D, opts: Parameters<StaticBatcher['add']>[3] = {}): void {
    group.updateMatrixWorld(true);
    group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !(m as unknown as THREE.InstancedMesh).isInstancedMesh) {
        const ud = m.userData as { echo?: EchoMode; noCast?: boolean };
        this.add(m.geometry, m.material as THREE.Material, m.matrixWorld, { ...opts, echo: ud.echo ?? opts.echo, cast: ud.noCast ? false : opts.cast });
      }
    });
  }

  build(parent: THREE.Object3D): THREE.Mesh[] {
    for (const e of this.entries.values()) {
      // merge in chunks to keep index sizes reasonable
      const chunks: THREE.BufferGeometry[][] = [[]];
      let count = 0;
      for (const g of e.geoms) {
        const n = g.getAttribute('position').count;
        if (count + n > 500000 && chunks[chunks.length - 1].length) {
          chunks.push([]);
          count = 0;
        }
        chunks[chunks.length - 1].push(g);
        count += n;
      }
      for (const list of chunks) {
        const merged = mergeGeometries(list, false);
        if (!merged) continue;
        merged.computeBoundingSphere();
        merged.computeBoundingBox();
        const mat = variant(e.mat, e.echo);
        const mesh = new THREE.Mesh(merged, mat);
        mesh.castShadow = e.cast;
        mesh.receiveShadow = e.receive;
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        mesh.userData.echo = e.echo;
        parent.add(mesh);
        this.meshes.push(mesh);
        this.triangles += (merged.index ? merged.index.count : merged.getAttribute('position').count) / 3;
        for (const g of list) g.dispose();
      }
    }
    this.entries.clear();
    return this.meshes;
  }
}

export function normalMatrixOf(m: THREE.Matrix4): THREE.Matrix3 {
  return _nm.getNormalMatrix(m);
}

/**
 * Bakes a group of static meshes into one mesh per material (transforms relative to the group),
 * for toggleable sets that can't go through the world batcher.
 */
export function mergeGroup(group: THREE.Group): THREE.Group {
  group.updateMatrixWorld(true);
  const inv = group.matrixWorld.clone().invert();
  const byMat = new Map<THREE.Material, { geoms: THREE.BufferGeometry[]; cast: boolean }>();
  const loose: THREE.Object3D[] = [];
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || o === group) return;
    if (Array.isArray(m.material) || m.userData.billboard) {
      loose.push(o);
      return;
    }
    const g = m.geometry.clone();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    let e = byMat.get(m.material);
    if (!e) byMat.set(m.material, (e = { geoms: [], cast: false }));
    e.geoms.push(g);
    e.cast ||= m.castShadow;
  });
  const out = new THREE.Group();
  out.position.copy(group.position);
  out.quaternion.copy(group.quaternion);
  out.scale.copy(group.scale);
  for (const [mat, e] of byMat) {
    const merged = mergeGeometries(e.geoms, false);
    for (const g of e.geoms) g.dispose();
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = e.cast;
    mesh.receiveShadow = true;
    out.add(mesh);
  }
  for (const o of loose) {
    o.parent!.remove(o);
    out.add(o);
  }
  return out;
}
