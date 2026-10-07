import * as THREE from 'three';
import { citizen } from '../actors/Cast';
import { characterGeometry } from '../actors/Actor';
import { buildRig } from '../anim/Rig';
import { Animator } from '../anim/Animator';
import { sculptMaterial } from '../gfx/Materials';
import { addOutline } from '../gfx/Toon';
import { rng } from './Kit';

/**
 * Crowds and armies made of the same sculpted people as the cast. Each body
 * type is posed by the real animator into a handful of key poses which are
 * baked into morph targets; every instance then blends its own poses on the
 * GPU (breathing, weight shifts, cheering, looking up, running, cowering),
 * with per-person cloth colours.
 */

type Kind = 'man' | 'woman' | 'elder' | 'soldierBlue' | 'soldierRed';
export const POSES = ['idle2', 'cheer', 'lookUp', 'runA', 'runB', 'cower', 'point', 'guard'] as const;
type PoseName = (typeof POSES)[number];

const baked = new Map<string, THREE.BufferGeometry>();

function bake(kind: Kind, cell?: number): THREE.BufferGeometry {
  const key = `${kind}@${cell ?? ''}`;
  const hit = baked.get(key);
  if (hit) return hit;
  const def = citizen(kind);
  if (cell) {
    def.cell = cell;
    def.id += `@${cell}`;
  }
  const src = characterGeometry(def);
  const rig = buildRig(def.joints, def.scale);
  const mesh = new THREE.SkinnedMesh(src, new THREE.MeshBasicMaterial());
  mesh.add(rig.root);
  mesh.updateMatrixWorld(true);
  mesh.bind(rig.skeleton);
  const anim = new Animator(rig);
  const pose = (clip: string, o: { speed?: number; phase?: number; t?: number; head?: number } = {}): Float32Array => {
    anim.play(clip, { fade: 0, restart: true });
    anim.params.speed = o.speed ?? 0;
    anim.update(o.t ?? 0.0001);
    if (o.phase !== undefined) {
      anim.phase = o.phase;
      anim.update(0.0001);
    }
    if (o.head) {
      for (const [b, k] of [['neck', 0.4], ['head', 0.6]] as const) {
        const bone = rig.byName.get(b)!;
        bone.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -o.head * k));
      }
    }
    mesh.updateMatrixWorld(true);
    rig.skeleton.update();
    const pos = src.attributes.position;
    const out = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      mesh.applyBoneTransform(i, v);
      out[i * 3] = v.x;
      out[i * 3 + 1] = v.y;
      out[i * 3 + 2] = v.z;
    }
    return out;
  };
  const base = pose('idle', { t: 0.4 });
  const targets: Record<PoseName, Float32Array> = {
    idle2: pose('idle', { t: 2.1 }),
    cheer: pose('invoke', { t: 1.2 }),
    lookUp: pose('idle', { t: 0.4, head: 0.75 }),
    runA: pose('move', { speed: 6, phase: 0.1 }),
    runB: pose('move', { speed: 6, phase: 0.6 }),
    cower: pose('cower', { t: 1 }),
    point: pose('point', { t: 1 }),
    guard: pose('guard', { t: 0.6 }),
  };
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(base, 3));
  for (const k of ['color', 'surf', 'tint', 'ink']) g.setAttribute(k, src.attributes[k]);
  g.setIndex(src.index);
  g.morphAttributes.position = POSES.map((p) => new THREE.BufferAttribute(targets[p], 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  baked.set(key, g);
  return g;
}

export interface CrowdOpts {
  kinds?: Kind[];
  /** cloth palette (tinted per person) */
  cloth?: THREE.ColorRepresentation[];
  seed?: number;
  outline?: boolean;
  /** coarser sculpt for big armies */
  cell?: number;
}

interface Person {
  kind: number;
  idx: number;
  phase: number;
  speed: number;
  scale: number;
}

export class Crowd {
  readonly group = new THREE.Group();
  readonly pts: THREE.Vector3[];
  readonly yaw: number[];
  /** 0..1 */
  panic = 0;
  cheer = 0;
  lookUp = 0;
  cower = 0;
  /** soldiers holding a guard stance */
  guard = 0;
  /** run in place / charge (armies) */
  march = 0;
  lookAt: THREE.Vector3 | null = null;
  panicFrom: THREE.Vector3 | null = null;
  private readonly people: Person[] = [];
  private readonly meshes: THREE.InstancedMesh[] = [];
  private readonly outlines: THREE.Mesh[] = [];
  private readonly dummy = new THREE.Mesh();
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();

  constructor(points: THREE.Vector3[], o: CrowdOpts = {}) {
    const kinds = o.kinds ?? ['man', 'woman', 'elder', 'man', 'woman'];
    const cloth = (o.cloth ?? ['#b0503e', '#4a6aa0', '#7a8a44', '#d8a85a', '#7a4a8a', '#c47a44', '#3a7a74', '#e8dcc0', '#a03a4a']).map((c) => new THREE.Color(c));
    this.pts = points.map((p) => p.clone());
    this.yaw = points.map(() => 0);
    const r = rng(o.seed ?? 3);
    const uniq = [...new Set(kinds)];
    const counts = uniq.map(() => 0);
    const assign = points.map(() => {
      const k = uniq.indexOf(kinds[Math.floor(r() * kinds.length)]);
      return { k, i: counts[k]++ };
    });
    uniq.forEach((kind, ki) => {
      if (!counts[ki]) return;
      const geo = bake(kind, o.cell);
      const im = new THREE.InstancedMesh(geo, sculptMaterial({ instanced: true }), counts[ki]);
      im.castShadow = true;
      im.receiveShadow = true;
      im.frustumCulled = false;
      this.group.add(im);
      this.meshes.push(im);
    });
    this.dummy.morphTargetInfluences = POSES.map(() => 0);
    assign.forEach(({ k, i }) => {
      const im = this.meshes[k];
      im.setColorAt(i, cloth[Math.floor(r() * cloth.length)].clone().multiplyScalar(0.9 + r() * 0.2));
      this.people.push({ kind: k, idx: i, phase: r() * 100, speed: 0.7 + r() * 0.6, scale: 0.94 + r() * 0.12 });
    });
    this.update(0, 0);
    if (o.outline !== false) for (const im of this.meshes) this.outlines.push(addOutline(im, 0.012, 0.9));
  }

  update(dt: number, time: number): void {
    const inf = this.dummy.morphTargetInfluences!;
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    for (let n = 0; n < this.people.length; n++) {
      const per = this.people[n];
      const base = this.pts[n];
      const t = time * per.speed + per.phase;
      // flee: run away from the panic source
      if (this.panic > 0 && dt > 0) {
        const from = this.panicFrom;
        const ax = from ? base.x - from.x : Math.sin(per.phase * 3);
        const az = from ? base.z - from.z : Math.cos(per.phase * 3);
        const l = Math.hypot(ax, az) || 1;
        base.x += (ax / l) * dt * 5.5 * this.panic * per.speed;
        base.z += (az / l) * dt * 5.5 * this.panic * per.speed;
        this.yaw[n] = Math.atan2(ax, az);
      }
      inf.fill(0);
      const calm = 1 - Math.max(this.panic, this.march);
      inf[0] = (0.5 + 0.5 * Math.sin(t * 0.7)) * calm * (1 - this.cheer);
      inf[1] = this.cheer * (0.55 + 0.45 * Math.sin(t * 5)) * calm;
      inf[2] = this.lookUp * calm * (1 - this.cheer);
      const run = Math.max(this.panic, this.march);
      const rp = 0.5 + 0.5 * Math.sin(t * 9);
      inf[3] = run * rp;
      inf[4] = run * (1 - rp);
      inf[5] = this.cower * calm;
      inf[7] = this.guard * calm;
      let y = this.yaw[n];
      if (this.lookAt && this.panic < 0.5) y = Math.atan2(this.lookAt.x - base.x, this.lookAt.z - base.z);
      const bob = run > 0 ? Math.abs(Math.sin(t * 9)) * 0.06 * run : 0;
      p.set(base.x, base.y + bob, base.z);
      this.q.setFromAxisAngle(up, y);
      s.setScalar(per.scale);
      this.m.compose(p, this.q, s);
      const im = this.meshes[per.kind];
      im.setMatrixAt(per.idx, this.m);
      im.setMorphAt(per.idx, this.dummy);
    }
    for (const im of this.meshes) {
      im.instanceMatrix.needsUpdate = true;
      if (im.morphTexture) im.morphTexture.needsUpdate = true;
    }
    this.outlines.forEach((o, i) => ((o as THREE.InstancedMesh).morphTexture = this.meshes[i].morphTexture));
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const m of this.meshes) m.dispose();
  }
}
