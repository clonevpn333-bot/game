import * as THREE from 'three';
import type { Collider, Layer, PhysicsWorld, Surface } from '../core/Physics';
import { StaticBatcher } from '../render/Batcher';
import type { LightPool, LightSocket } from '../render/LightPool';
import { coneMaterial, glowMaterial, streakMaterial, variant, type EchoMode } from '../render/Materials';
import type { SkyPreset } from '../render/Sky';
import type { EnvKind } from '../render/EnvMap';

export interface Interactable {
  id: string;
  pos: THREE.Vector3;
  radius: number;
  prompt: string;
  enabled: boolean;
  /** only usable during an Echo / only in the present */
  layer?: 'echo' | 'present';
  onUse: () => void;
  /** optional height window */
  minY?: number;
}

export interface Trigger {
  box: THREE.Box3;
  once: boolean;
  fired: boolean;
  enabled: boolean;
  inside: boolean;
  onEnter: () => void;
  onExit?: () => void;
}

export interface EnvSettings {
  sky: SkyPreset;
  fog: THREE.ColorRepresentation;
  fogDensity: number;
  rain: number;
  envKind: EnvKind;
  exposure: number;
  hemi: [THREE.ColorRepresentation, THREE.ColorRepresentation, number];
  moon?: { color: THREE.ColorRepresentation; intensity: number; dir: [number, number, number]; shadow?: boolean };
  reverb: [number, number];
  motes?: number;
  bloom?: number;
  indoorRain?: boolean;
  floorY?: number;
  floorSurface?: Surface;
  grade?: { sat?: number; tint?: THREE.ColorRepresentation; vignette?: number };
}

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const PLANE = new THREE.PlaneGeometry(1, 1);
const CONE = (() => {
  const g = new THREE.CylinderGeometry(0.05, 1, 1, 24, 1, true);
  g.translate(0, -0.5, 0);
  // uv.y: 1 at the bulb, 0 at the floor -> flip so fragment shader fades towards the ground
  return g;
})();

export class World {
  readonly root = new THREE.Group();
  readonly dynamic = new THREE.Group();
  readonly batcher = new StaticBatcher();
  interactables: Interactable[] = [];
  triggers: Trigger[] = [];
  updaters: ((dt: number, t: number) => void)[] = [];
  /** objects whose visibility follows the Echo state */
  echoObjects: { obj: THREE.Object3D; layer: 'echo' | 'present' }[] = [];
  spawn = new THREE.Vector3();
  spawnYaw = 0;
  disposers: (() => void)[] = [];
  named = new Map<string, unknown>();
  indoorZones: THREE.Box3[] = [];

  constructor(readonly physics: PhysicsWorld, readonly lights: LightPool, readonly env: EnvSettings) {
    this.root.add(this.dynamic);
  }

  // ---------------------------------------------------------------- geometry
  /** Static box from min/max corners: batched mesh + optional collider. */
  box(
    min: [number, number, number], max: [number, number, number], mat: THREE.Material,
    o: { collide?: boolean; layer?: Layer; uv?: number; cast?: boolean; surface?: Surface; noShoot?: boolean; tag?: string; noVault?: boolean; yaw?: number; ladder?: boolean } = {},
  ): Collider | null {
    const sx = Math.abs(max[0] - min[0]);
    const sy = Math.abs(max[1] - min[1]);
    const sz = Math.abs(max[2] - min[2]);
    const cx = (min[0] + max[0]) / 2;
    const cy = (min[1] + max[1]) / 2;
    const cz = (min[2] + max[2]) / 2;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(cx, cy, cz), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), o.yaw ?? 0), new THREE.Vector3(sx, sy, sz));
    const echo: EchoMode = o.layer === 'echo' ? 'echo' : o.layer === 'present' ? 'present' : undefined;
    this.batcher.add(UNIT_BOX, mat, m, { uv: 'world', uvScale: o.uv ?? 2, cast: o.cast ?? true, echo });
    if (o.collide === false) return null;
    return this.physics.add({
      cx, cy, cz, hx: sx / 2, hy: sy / 2, hz: sz / 2, yaw: o.yaw ?? 0, layer: o.layer ?? 'always',
      surface: o.surface, noShoot: o.noShoot, tag: o.tag, noVault: o.noVault, ladder: o.ladder,
    });
  }

  /** Box by centre + size + yaw. */
  boxC(c: [number, number, number], size: [number, number, number], mat: THREE.Material, yaw = 0, o: Parameters<World['box']>[3] = {}): Collider | null {
    const h = size.map((v) => v / 2);
    return this.box([c[0] - h[0], c[1] - h[1], c[2] - h[2]], [c[0] + h[0], c[1] + h[1], c[2] + h[2]], mat, { ...o, yaw });
  }

  /** Walkable ramp (stairs / escalators): rises along +z of its local frame. */
  ramp(c: [number, number, number], size: [number, number, number], yaw: number, visual?: THREE.Material, steps = 0, layer: Layer = 'always'): Collider {
    if (visual) {
      if (steps > 0) {
        for (let i = 0; i < steps; i++) {
          const t0 = i / steps;
          const h = size[1] * (i + 1) / steps;
          const len = size[2] / steps;
          const local = new THREE.Vector3(0, -size[1] / 2 + h / 2, -size[2] / 2 + len * (i + 0.5));
          local.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
          const m = new THREE.Matrix4().compose(
            new THREE.Vector3(c[0] + local.x, c[1] + local.y, c[2] + local.z),
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
            new THREE.Vector3(size[0], h, len),
          );
          this.batcher.add(UNIT_BOX, visual, m, { uv: 'world', uvScale: 1, echo: layer === 'echo' ? 'echo' : undefined });
          void t0;
        }
      } else {
        const ang = Math.atan2(size[1], size[2]);
        const len = Math.hypot(size[1], size[2]);
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(-ang, yaw, 0, 'YXZ'));
        const m = new THREE.Matrix4().compose(new THREE.Vector3(...c), q, new THREE.Vector3(size[0], 0.12, len));
        this.batcher.add(UNIT_BOX, visual, m, { uv: 'world', uvScale: 1 });
      }
    }
    return this.physics.add({ cx: c[0], cy: c[1], cz: c[2], hx: size[0] / 2, hy: size[1] / 2, hz: size[2] / 2, yaw, ramp: true, layer });
  }

  /** Batch any geometry with a transform. */
  geo(g: THREE.BufferGeometry, mat: THREE.Material, pos: THREE.Vector3Like, rot: THREE.Euler | number = 0, scale: number | THREE.Vector3 = 1, o: { cast?: boolean; echo?: EchoMode; uv?: 'keep' | 'world'; uvScale?: number } = {}): void {
    const q = typeof rot === 'number' ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rot) : new THREE.Quaternion().setFromEuler(rot);
    const s = typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : scale;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(pos.x, pos.y, pos.z), q, s);
    this.batcher.add(g, mat, m, { cast: o.cast, echo: o.echo, uv: o.uv ?? 'keep', uvScale: o.uvScale });
  }

  /** Batch an authored group (prop) at a transform. */
  prop(group: THREE.Object3D, pos: THREE.Vector3Like, yaw = 0, o: { echo?: EchoMode; cast?: boolean } = {}): void {
    group.position.set(pos.x, pos.y, pos.z);
    group.rotation.y = yaw;
    this.batcher.addGroup(group, { echo: o.echo, cast: o.cast });
  }

  /** Flat textured quad (signs, posters, decals). */
  quad(mat: THREE.Material, pos: THREE.Vector3Like, w: number, h: number, yaw = 0, o: { pitch?: number; echo?: EchoMode; dynamic?: boolean } = {}): THREE.Mesh | void {
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(o.pitch ?? 0, yaw, 0, 'YXZ'));
    if (o.dynamic) {
      const m = new THREE.Mesh(PLANE, mat);
      m.position.set(pos.x, pos.y, pos.z);
      m.quaternion.copy(q);
      m.scale.set(w, h, 1);
      this.dynamic.add(m);
      return m;
    }
    const mtx = new THREE.Matrix4().compose(new THREE.Vector3(pos.x, pos.y, pos.z), q, new THREE.Vector3(w, h, 1));
    this.batcher.add(PLANE, mat, mtx, { cast: false, echo: o.echo });
  }

  add<T extends THREE.Object3D>(o: T, layer?: 'echo' | 'present'): T {
    this.dynamic.add(o);
    if (layer) {
      this.echoObjects.push({ obj: o, layer });
      o.traverse((c) => {
        const m = c as THREE.Mesh;
        if (m.isMesh && m.material) m.material = variant(m.material as THREE.Material, layer);
      });
    }
    return o;
  }

  // ---------------------------------------------------------------- lights
  /**
   * A practical light: bulb glow + optional volumetric cone + wet ground pool/streak + pooled real light.
   */
  light(
    pos: THREE.Vector3Like, color: THREE.ColorRepresentation, o: {
      intensity?: number; distance?: number; flicker?: number; cone?: number; coneLen?: number; pool?: boolean; poolY?: number; glow?: number;
      bulb?: THREE.Material; noLight?: boolean; layer?: 'echo' | 'present'; streak?: boolean;
    } = {},
  ): LightSocket | null {
    const p = new THREE.Vector3(pos.x, pos.y, pos.z);
    const glowS = o.glow ?? 0.8;
    if (glowS > 0) {
      const g = new THREE.Mesh(PLANE, glowMaterial(color, 1.4, 'bulb'));
      g.position.copy(p);
      g.scale.setScalar(glowS);
      g.userData.billboard = true;
      g.renderOrder = 5;
      this.add(g, o.layer);
    }
    if (o.cone) {
      const len = o.coneLen ?? p.y - (o.poolY ?? 0);
      const c = new THREE.Mesh(CONE, coneMaterial(color, 0.16));
      c.position.copy(p);
      c.scale.set(o.cone, len, o.cone);
      // uv.y on CylinderGeometry: 1 at top -> bulb end bright (shader uses vH)
      c.renderOrder = 4;
      this.add(c, o.layer);
    }
    if (o.pool !== false && p.y > 1.2) {
      const y = (o.poolY ?? this.physics.floorY) + 0.02;
      const r = Math.min(9, (o.distance ?? 12) * 0.45);
      this.quad(glowMaterial(color, 0.22, 'pool'), { x: p.x, y, z: p.z }, r, r, 0, { pitch: -Math.PI / 2, echo: o.layer });
      if (o.streak !== false) {
        // stretched reflection on wet ground
        const s = new THREE.Mesh(PLANE, streakMaterial(color, 0.5));
        s.rotation.x = -Math.PI / 2;
        s.position.set(p.x, y + 0.005, p.z);
        s.scale.set(0.6, Math.min(10, p.y * 1.6), 1);
        s.userData.streak = true;
        this.add(s, o.layer);
      }
    }
    if (o.noLight) return null;
    return this.lights.add(p, color, o.intensity ?? 18, o.distance ?? 14, o.flicker ?? 0, o.layer);
  }

  // ---------------------------------------------------------------- gameplay hooks
  interact(i: Omit<Interactable, 'enabled' | 'radius'> & { radius?: number; enabled?: boolean }): Interactable {
    const it: Interactable = { radius: 1.6, enabled: true, ...i };
    this.interactables.push(it);
    return it;
  }

  trigger(min: [number, number, number], max: [number, number, number], onEnter: () => void, o: { once?: boolean; onExit?: () => void } = {}): Trigger {
    const t: Trigger = {
      box: new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max)), once: o.once ?? true, fired: false, enabled: true, inside: false, onEnter, onExit: o.onExit,
    };
    this.triggers.push(t);
    return t;
  }

  indoor(min: [number, number, number], max: [number, number, number]): void {
    this.indoorZones.push(new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max)));
  }

  isIndoor(p: THREE.Vector3): boolean {
    return this.indoorZones.some((b) => b.containsPoint(p));
  }

  onUpdate(fn: (dt: number, t: number) => void): void {
    this.updaters.push(fn);
  }

  finalize(): void {
    this.batcher.build(this.root);
  }

  dispose(): void {
    for (const d of this.disposers) d();
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && this.batcher.meshes.includes(m)) m.geometry.dispose();
    });
    this.root.removeFromParent();
  }
}
