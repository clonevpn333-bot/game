import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { MaterialKit } from '../render/DreamShading';
import { Collider, PhysicsWorld, Surface } from './Physics';
import { boxGeo, prep, roundedGeo } from './Geo';

export type Layer = 'play' | 'near' | 'far';

export interface PlaceOpts {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  sx?: number;
  sy?: number;
  sz?: number;
  s?: number;
  color?: THREE.ColorRepresentation;
  top?: THREE.ColorRepresentation;
  ao?: number;
  mat?: THREE.Material;
  layer?: Layer;
  shadow?: boolean;
}

export interface BoxOpts extends PlaceOpts {
  w: number;
  h: number;
  d: number;
  /** Corner radius; 0 = sharp box with metric UVs. */
  r?: number;
  collide?: boolean;
  climbable?: boolean;
  surface?: Surface;
  noCamera?: boolean;
  tag?: string;
}

const m4 = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v = new THREE.Vector3();
const sc = new THREE.Vector3();

/**
 * Collects static geometry per material/layer and merges it into a handful of
 * meshes; registers colliders with the physics world.
 */
export class LevelBuilder {
  private batches = new Map<string, { mat: THREE.Material; layer: Layer; shadow: boolean; geos: THREE.BufferGeometry[] }>();
  readonly meshes: THREE.Mesh[] = [];

  constructor(
    readonly root: THREE.Group,
    readonly physics: PhysicsWorld,
    readonly mats: MaterialKit,
  ) {}

  /** Bake a geometry into a static batch. Geometry is consumed. */
  add(geo: THREE.BufferGeometry, o: PlaceOpts = {}): void {
    const g = prep(geo, o.color ?? '#ffffff', o.ao ?? 0.22, o.top);
    e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
    q.setFromEuler(e);
    const s = o.s ?? 1;
    sc.set((o.sx ?? 1) * s, (o.sy ?? 1) * s, (o.sz ?? 1) * s);
    v.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
    m4.compose(v, q, sc);
    g.applyMatrix4(m4);
    const mat = o.mat ?? this.mats.paint;
    const layer = o.layer ?? 'play';
    const shadow = o.shadow ?? layer !== 'far';
    const key = `${mat.uuid}|${layer}|${shadow}`;
    let b = this.batches.get(key);
    if (!b) {
      b = { mat, layer, shadow, geos: [] };
      this.batches.set(key, b);
    }
    b.geos.push(g);
    geo.dispose();
  }

  /** A box (centre x,y,z) with optional rounded corners and a collider. */
  box(o: BoxOpts): Collider | null {
    const geo = o.r && o.r > 0 ? roundedGeo(o.w, o.h, o.d, o.r) : boxGeo(o.w, o.h, o.d);
    this.add(geo, o);
    if (o.collide === false) return null;
    const ry = o.ry ?? 0;
    // Colliders are axis-aligned; quarter turns swap w/d.
    const swap = Math.abs(Math.round(ry / (Math.PI / 2))) % 2 === 1;
    const w = swap ? o.d : o.w;
    const d = swap ? o.w : o.d;
    return this.physics.addBox(o.x ?? 0, o.y ?? 0, o.z ?? 0, w, o.h, d, {
      climbable: o.climbable ?? true,
      surface: o.surface ?? 'stone',
      noCamera: o.noCamera,
      tag: o.tag,
    });
  }

  /** Floor slab whose top is at `top`. */
  slab(x: number, z: number, w: number, d: number, top: number, o: Partial<BoxOpts> = {}): Collider | null {
    const h = o.h ?? 1;
    return this.box({ ...o, x, z, w, d, h, y: top - h / 2 });
  }

  /** Invisible collider. */
  wall(x: number, y: number, z: number, w: number, h: number, d: number, opts: Partial<Collider> = {}): Collider {
    return this.physics.addBox(x, y, z, w, h, d, { climbable: false, noCamera: true, ...opts });
  }

  /** Ramp from (x,z) footprint, rising along axis. */
  ramp(x: number, z: number, w: number, d: number, y0: number, y1: number, axis: 'x' | 'z', dir: 1 | -1, o: Partial<BoxOpts> = {}): Collider {
    const len = axis === 'x' ? w : d;
    const rise = y1 - y0;
    const ang = Math.atan2(rise, len);
    const slope = Math.hypot(len, rise);
    const thick = 0.3;
    const geo = boxGeo(axis === 'x' ? slope : w, thick, axis === 'z' ? slope : d);
    const midY = (y0 + y1) / 2 - (thick / 2) * Math.cos(ang);
    this.add(geo, {
      ...o,
      x,
      y: midY,
      z,
      rz: axis === 'x' ? ang * dir : 0,
      rx: axis === 'z' ? -ang * dir : 0,
    });
    return this.physics.add({
      min: new THREE.Vector3(x - w / 2, y0 - 0.2, z - d / 2),
      max: new THREE.Vector3(x + w / 2, y1, z + d / 2),
      ramp: { axis, dir },
      climbable: false,
      surface: o.surface ?? 'stone',
    });
  }

  /** Stairs made of steps (each a box collider). */
  stairs(x: number, z: number, w: number, y0: number, y1: number, run: number, axis: 'x' | 'z', dir: 1 | -1, o: Partial<BoxOpts> = {}): void {
    const steps = Math.max(2, Math.round((y1 - y0) / 0.32));
    const rise = (y1 - y0) / steps;
    const sd = run / steps;
    for (let i = 0; i < steps; i++) {
      const top = y0 + rise * (i + 1);
      const off = (-run / 2 + sd * (i + 0.5)) * dir;
      const h = top - (y0 - 0.2);
      this.box({
        ...o,
        x: axis === 'x' ? x + off : x,
        z: axis === 'z' ? z + off : z,
        y: top - h / 2,
        w: axis === 'x' ? sd : w,
        d: axis === 'z' ? sd : w,
        h,
        climbable: false,
      });
    }
  }

  /** A non-batched mesh (for moving or toggled things). */
  mesh(geo: THREE.BufferGeometry, mat: THREE.Material, o: PlaceOpts = {}): THREE.Mesh {
    const g = prep(geo, o.color ?? '#ffffff', o.ao ?? 0.2, o.top);
    geo.dispose();
    const mesh = new THREE.Mesh(g, mat);
    mesh.position.set(o.x ?? 0, o.y ?? 0, o.z ?? 0);
    mesh.rotation.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0);
    const s = o.s ?? 1;
    mesh.scale.set((o.sx ?? 1) * s, (o.sy ?? 1) * s, (o.sz ?? 1) * s);
    mesh.castShadow = o.shadow ?? true;
    mesh.receiveShadow = true;
    this.root.add(mesh);
    return mesh;
  }

  /** Merge everything collected so far into meshes. */
  finalize(): void {
    for (const b of this.batches.values()) {
      if (!b.geos.length) continue;
      // Chunk to keep each merged buffer reasonably sized and cullable.
      const chunk = 400;
      for (let i = 0; i < b.geos.length; i += chunk) {
        const merged = mergeGeometries(b.geos.slice(i, i + chunk), false);
        if (!merged) continue;
        merged.computeBoundingSphere();
        const mesh = new THREE.Mesh(merged, b.mat);
        mesh.castShadow = b.shadow;
        mesh.receiveShadow = b.layer !== 'far';
        mesh.matrixAutoUpdate = false;
        mesh.updateMatrix();
        this.root.add(mesh);
        this.meshes.push(mesh);
      }
      for (const g of b.geos) g.dispose();
    }
    this.batches.clear();
  }
}
