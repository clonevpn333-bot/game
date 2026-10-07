import * as THREE from 'three';
import { Sculpt } from '../sculpt/Sculpt';
import { buildRig, boneIndex, mirrorJoints, type JointDef, type Rig } from '../anim/Rig';
import { sculptMaterial } from '../gfx/Materials';
import { addOutline } from '../gfx/Toon';
import { clamp, damp, easeInOut, lerp } from '../util/math';

/**
 * The war horse: a sculpted, skinned mount with a gait engine. Each gait
 * (walk, trot, gallop) has its own footfall order and duty factor; legs are
 * posed per phase (stance sweep, then a folded swing with the hoof flicking
 * back) and gaits cross-fade by speed. The body rocks with the gallop, the
 * neck counters it, and the tail and mane trail behind.
 */

const J = (name: string, parent: string | null, at: [number, number, number]): JointDef => ({ name, parent, at });

const HORSE: JointDef[] = mirrorJoints([
  J('spine', null, [0, 1.42, -0.45]),
  J('chest', 'spine', [0, 1.44, 0.5]),
  J('neck', 'chest', [0, 1.6, 0.82]),
  J('neck2', 'neck', [0, 1.92, 1.04]),
  J('head', 'neck2', [0, 2.12, 1.18]),
  J('tail0', 'spine', [0, 1.52, -0.98]),
  J('tail1', 'tail0', [0, 1.3, -1.16]),
  J('tail2', 'tail1', [0, 1.0, -1.26]),
  J('fUpper.L', 'chest', [0.2, 1.28, 0.66]),
  J('fLower.L', 'fUpper.L', [0.21, 0.96, 0.6]),
  J('fCannon.L', 'fLower.L', [0.21, 0.54, 0.64]),
  J('fHoof.L', 'fCannon.L', [0.21, 0.16, 0.66]),
  J('hUpper.L', 'spine', [0.21, 1.38, -0.62]),
  J('hLower.L', 'hUpper.L', [0.23, 0.98, -0.46]),
  J('hCannon.L', 'hLower.L', [0.22, 0.6, -0.76]),
  J('hHoof.L', 'hCannon.L', [0.22, 0.16, -0.72]),
]);

const geoCache = new Map<string, THREE.BufferGeometry>();

function sculptHorse(coat: string, mane: string, cloth: string): THREE.BufferGeometry {
  const key = coat + mane + cloth;
  const hit = geoCache.get(key);
  if (hit) return hit;
  const M = [
    { color: coat, rough: 0.6 }, // 0 coat
    { color: mane, rough: 0.5 }, // 1 mane
    { color: '#f2ece0', rough: 0.7 }, // 2 socks / blaze
    { color: '#2a2220', rough: 0.4 }, // 3 hoof
    { color: cloth, rough: 0.85 }, // 4 blanket
    { color: '#d8aa4a', rough: 0.3, metal: 0.9 }, // 5 gold
    { color: '#5a3420', rough: 0.55 }, // 6 leather
    { color: '#0e0a0c', rough: 0.2 }, // 7 eye
    { color: '#' + new THREE.Color(coat).multiplyScalar(0.75).getHexString(), rough: 0.6 }, // 8 muzzle (darker)
  ];
  const sc = new Sculpt(M);
  const C = 0;
  // barrel, chest and quarters
  sc.cone([0, 1.4, -0.5], [0, 1.42, 0.5], 0.33, 0.34, { mat: C, bone: 'spine', bone2: 'chest', k: 0.08 });
  sc.ellipsoid([0, 1.3, 0.0], [0.31, 0.3, 0.6], { mat: C, bone: 'spine', k: 0.1 });
  sc.ellipsoid([0, 1.38, 0.62], [0.27, 0.33, 0.26], { mat: C, bone: 'chest', k: 0.08 });
  sc.ellipsoid([0, 1.62, 0.42], [0.15, 0.12, 0.22], { mat: C, bone: 'chest', k: 0.08 });
  for (const m of [1, -1]) sc.sphere([m * 0.13, 1.46, -0.62], 0.29, { mat: C, bone: 'spine', k: 0.08 });
  sc.ellipsoid([0, 1.56, -0.8], [0.22, 0.16, 0.2], { mat: C, bone: 'spine', k: 0.08 });
  // neck & head
  sc.cone([0, 1.52, 0.7], [0, 1.98, 1.1], 0.25, 0.15, { mat: C, bone: 'neck', bone2: 'neck2', k: 0.07 });
  sc.ellipsoid([0, 1.82, 0.84], [0.1, 0.22, 0.12], { mat: C, bone: 'neck', k: 0.06, rot: [0.7, 0, 0] });
  sc.sphere([0, 2.06, 1.2], 0.14, { mat: C, bone: 'head', k: 0.05 });
  sc.cone([0, 2.08, 1.22], [0, 1.84, 1.6], 0.12, 0.085, { mat: C, bone: 'head', k: 0.05 });
  sc.sphere([0, 1.82, 1.6], 0.092, { mat: 8, bone: 'head', k: 0.03, priority: 1 });
  sc.box([0, 1.98, 1.36], [0.012, 0.16, 0.02], 0.01, { mat: 2, bone: 'head', k: 0.02, priority: 2, rot: [-0.95, 0, 0] });
  for (const m of [1, -1]) {
    sc.cone([m * 0.07, 2.18, 1.14], [m * 0.09, 2.34, 1.1], 0.035, 0.008, { mat: C, bone: 'head', k: 0.02 });
    sc.sphere([m * 0.104, 2.06, 1.3], 0.024, { mat: 7, bone: 'head', k: 0.008, priority: 3 });
    sc.sphere([m * 0.035, 1.8, 1.68], 0.016, { mat: 1, bone: 'head', k: 0.006, sub: true });
  }
  // mane (a ridge of locks) + forelock
  for (let i = 0; i < 8; i++) {
    const t = i / 7;
    const p: [number, number, number] = [0, 1.64 + t * 0.52, 0.66 + t * 0.48];
    sc.cone(p, [i % 2 ? 0.06 : -0.06, p[1] - 0.04, p[2] - 0.2], 0.06, 0.01, { mat: 1, bone: t < 0.5 ? 'neck' : 'neck2', k: 0.03, priority: 2 });
  }
  sc.cone([0, 2.2, 1.16], [0.02, 2.06, 1.32], 0.045, 0.008, { mat: 1, bone: 'head', k: 0.02, priority: 2 });
  // tail
  sc.cone([0, 1.52, -0.98], [0, 1.3, -1.16], 0.07, 0.09, { mat: 1, bone: 'tail0', bone2: 'tail1', k: 0.03, priority: 2 });
  sc.cone([0, 1.3, -1.16], [0, 0.92, -1.27], 0.09, 0.03, { mat: 1, bone: 'tail1', bone2: 'tail2', k: 0.03, priority: 2 });
  // legs
  const legs: { s: 'L' | 'R'; m: number; sock: boolean }[] = [
    { s: 'L', m: 1, sock: true },
    { s: 'R', m: -1, sock: false },
  ];
  for (const { s, m, sock } of legs) {
    // front
    sc.cone([m * 0.19, 1.34, 0.68], [m * 0.21, 0.96, 0.6], 0.13, 0.085, { mat: C, bone: `fUpper.${s}`, k: 0.06 });
    sc.cone([m * 0.21, 0.96, 0.6], [m * 0.21, 0.56, 0.64], 0.08, 0.05, { mat: C, bone: `fLower.${s}`, k: 0.03 });
    sc.sphere([m * 0.21, 0.54, 0.65], 0.058, { mat: C, bone: `fCannon.${s}`, k: 0.02 });
    sc.cone([m * 0.21, 0.54, 0.64], [m * 0.21, 0.18, 0.66], 0.045, 0.042, { mat: sock ? 2 : C, bone: `fCannon.${s}`, k: 0.02, priority: sock ? 1 : 0 });
    sc.sphere([m * 0.21, 0.16, 0.66], 0.054, { mat: sock ? 2 : C, bone: `fHoof.${s}`, k: 0.02, priority: sock ? 1 : 0 });
    sc.cone([m * 0.21, 0.12, 0.68], [m * 0.21, 0.015, 0.71], 0.055, 0.068, { mat: 3, bone: `fHoof.${s}`, k: 0.012, priority: 2 });
    // hind
    sc.ellipsoid([m * 0.19, 1.22, -0.6], [0.13, 0.26, 0.21], { mat: C, bone: `hUpper.${s}`, k: 0.08 });
    sc.cone([m * 0.23, 0.98, -0.46], [m * 0.22, 0.6, -0.76], 0.095, 0.055, { mat: C, bone: `hLower.${s}`, k: 0.04 });
    sc.sphere([m * 0.22, 0.6, -0.78], 0.06, { mat: C, bone: `hCannon.${s}`, k: 0.02 });
    sc.cone([m * 0.22, 0.6, -0.76], [m * 0.22, 0.18, -0.72], 0.046, 0.042, { mat: !sock ? 2 : C, bone: `hCannon.${s}`, k: 0.02, priority: !sock ? 1 : 0 });
    sc.sphere([m * 0.22, 0.16, -0.72], 0.054, { mat: !sock ? 2 : C, bone: `hHoof.${s}`, k: 0.02, priority: !sock ? 1 : 0 });
    sc.cone([m * 0.22, 0.12, -0.7], [m * 0.22, 0.015, -0.67], 0.055, 0.068, { mat: 3, bone: `hHoof.${s}`, k: 0.012, priority: 2 });
  }
  // tack: blanket, saddle, girth, bridle
  sc.box([0, 1.7, -0.02], [0.36, 0.035, 0.36], 0.03, { mat: 4, bone: 'spine', bone2: 'chest', k: 0.03, priority: 3 });
  for (const m of [1, -1]) sc.box([m * 0.33, 1.52, -0.02], [0.03, 0.2, 0.34], 0.02, { mat: 4, bone: 'spine', k: 0.03, priority: 3 });
  for (const m of [1, -1]) sc.box([m * 0.35, 1.36, -0.02], [0.02, 0.015, 0.35], 0.01, { mat: 5, bone: 'spine', k: 0.01, priority: 4 });
  sc.ellipsoid([0, 1.78, -0.06], [0.18, 0.07, 0.26], { mat: 6, bone: 'spine', k: 0.02, priority: 4 });
  sc.ellipsoid([0, 1.82, 0.14], [0.09, 0.07, 0.06], { mat: 6, bone: 'chest', k: 0.02, priority: 4 });
  sc.torus([0, 1.4, 0.12], 0.36, 0.022, { mat: 6, bone: 'chest', k: 0.01, priority: 4, rot: [0, 0, Math.PI / 2] });
  sc.torus([0, 1.96, 1.42], 0.105, 0.012, { mat: 6, bone: 'head', k: 0.006, priority: 4, rot: [Math.PI / 2 + 0.95, 0, 0] });
  sc.torus([0, 2.12, 1.2], 0.13, 0.012, { mat: 6, bone: 'head', k: 0.006, priority: 4, rot: [Math.PI / 2 - 0.2, 0, 0] });
  const rig = buildRig(HORSE, 1);
  const { geometry } = sc.mesh(0.017, boneIndex(rig));
  geoCache.set(key, geometry);
  return geometry;
}

type Gait = { stride: number; duty: number; offs: [number, number, number, number]; amp: number; flex: number; bob: number; rock: number };
// leg order: fL, fR, hL, hR
const WALK: Gait = { stride: 1.7, duty: 0.66, offs: [0.25, 0.75, 0, 0.5], amp: 18, flex: 55, bob: 0.025, rock: 1.5 };
const TROT: Gait = { stride: 2.6, duty: 0.5, offs: [0, 0.5, 0.5, 0], amp: 24, flex: 85, bob: 0.06, rock: 2 };
const GALLOP: Gait = { stride: 5.6, duty: 0.38, offs: [0.48, 0.58, 0.0, 0.1], amp: 36, flex: 110, bob: 0.1, rock: 7 };

export class Horse {
  readonly root = new THREE.Group();
  readonly mesh: THREE.SkinnedMesh;
  readonly rig: Rig;
  readonly saddle = new THREE.Object3D();
  readonly pillion = new THREE.Object3D();
  speed = 0;
  /** 0..1 jump arc progress (>0 while airborne) */
  jump = 0;
  phase = 0;
  onHoof: (() => void) | null = null;
  private time = 0;
  private lastBeat = 0;
  private smoothSpeed = 0;
  private readonly B: Map<string, THREE.Bone>;
  private readonly e = new THREE.Euler();

  constructor(coat = '#8a4e2c', mane = '#2a1a14', cloth = '#24406e') {
    this.rig = buildRig(HORSE, 1);
    this.B = this.rig.byName;
    const mat = sculptMaterial();
    this.mesh = new THREE.SkinnedMesh(sculptHorse(coat, mane, cloth), mat);
    this.mesh.add(this.rig.root);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(this.rig.skeleton);
    this.root.add(this.mesh);
    addOutline(this.mesh, 0.012, 1);
    const spine = this.B.get('spine')!;
    this.saddle.position.set(0, 0.42, 0.42);
    this.pillion.position.set(0, 0.38, -0.08);
    spine.add(this.saddle, this.pillion);
  }

  private set(name: string, x: number, y = 0, z = 0): void {
    const b = this.B.get(name);
    if (!b) return;
    this.e.set((x * Math.PI) / 180, (y * Math.PI) / 180, (z * Math.PI) / 180, 'YXZ');
    b.quaternion.setFromEuler(this.e);
  }

  /** Leg pose (degrees) for one gait at leg phase u. */
  private legPose(g: Gait, u: number, front: boolean): [number, number, number, number] {
    if (u < g.duty) {
      // stance: sweep from forward to back, slight fetlock sink mid-stance
      const s = u / g.duty;
      const a = lerp(-g.amp, g.amp, s);
      const sink = Math.sin(s * Math.PI) * 14;
      return front ? [a * 0.8, a * 0.25, -sink * 0.3, sink] : [a * 0.6, -a * 0.35, a * 0.25 + sink * 0.2, sink * 0.8];
    }
    const s = (u - g.duty) / (1 - g.duty);
    const a = lerp(g.amp, -g.amp, easeInOut(s));
    const f = Math.sin(s * Math.PI);
    return front ? [a * 0.8, -f * g.flex * 0.25, f * g.flex, f * 50] : [a * 0.6 - f * 15, f * g.flex * 0.45, -f * g.flex * 0.55, f * 40];
  }

  update(dt: number): void {
    this.time += dt;
    this.smoothSpeed += (this.speed - this.smoothSpeed) * damp(4, dt);
    const v = this.smoothSpeed;
    // gait weights
    const wWalk = 1 - clamp((v - 2.2) / 1.6, 0, 1);
    const wGallop = clamp((v - 5.5) / 2.5, 0, 1);
    const wTrot = Math.max(0, 1 - wWalk - wGallop);
    const stride = WALK.stride * wWalk + TROT.stride * wTrot + GALLOP.stride * wGallop;
    const moving = clamp(v / 0.8, 0, 1);
    this.phase += (dt * v) / stride;
    const gaits: [Gait, number][] = [
      [WALK, wWalk],
      [TROT, wTrot],
      [GALLOP, wGallop],
    ];
    const legs: [string, boolean, number][] = [
      ['L', true, 0],
      ['R', true, 1],
      ['L', false, 2],
      ['R', false, 3],
    ];
    for (const [s, front, i] of legs) {
      const acc = [0, 0, 0, 0];
      for (const [g, w] of gaits) {
        if (w <= 0) continue;
        const u = (((this.phase + g.offs[i]) % 1) + 1) % 1;
        const p = this.legPose(g, u, front);
        for (let k = 0; k < 4; k++) acc[k] += p[k] * w;
      }
      // standing: legs settle square; jump: everything tucks
      const tuck = this.jump > 0 ? Math.sin(Math.min(1, this.jump * 2) * Math.PI * 0.5) : 0;
      const pre = front ? 'f' : 'h';
      const k = moving;
      const st = front ? [-60, 40, 120, 30] : [50, 50, -90, 30];
      const fin = acc.map((a, j) => lerp(a * k, st[j], tuck));
      this.set(`${pre}Upper.${s}`, fin[0]);
      this.set(`${pre}Lower.${s}`, fin[1]);
      this.set(`${pre}Cannon.${s}`, fin[2]);
      this.set(`${pre}Hoof.${s}`, fin[3]);
    }
    // body: bob, gallop rock, idle breathing
    const bob = (WALK.bob * wWalk + TROT.bob * wTrot + GALLOP.bob * wGallop) * moving;
    const rock = (WALK.rock * wWalk + TROT.rock * wTrot + GALLOP.rock * wGallop) * moving;
    const P = this.phase * Math.PI * 2;
    const spine = this.B.get('spine')!;
    const rest = this.rig.rest.get('spine')!;
    spine.position.set(rest.x, rest.y - Math.abs(Math.sin(P)) * bob * (wGallop > 0.5 ? 0.6 : 1) + Math.sin(this.time * 1.7) * 0.004 * (1 - moving), rest.z);
    const jumpPitch = this.jump > 0 ? Math.cos(this.jump * Math.PI) * -14 : 0;
    this.set('spine', Math.sin(P) * rock + jumpPitch, 0, Math.sin(P * 0.5) * 1.2 * moving);
    this.set('chest', -Math.sin(P + 0.6) * rock * 0.4);
    // neck counters the rock; head bobs; idle grazing looks around
    const idleLook = (1 - moving) * Math.sin(this.time * 0.35);
    this.set('neck', -10 + Math.sin(P + 1.2) * rock * 1.1 - wGallop * 10, idleLook * 10);
    this.set('neck2', 6 - Math.sin(P + 1.6) * rock * 0.6, idleLook * 6);
    this.set('head', 8 + Math.sin(P + 2.0) * rock * 0.5 + (1 - moving) * Math.sin(this.time * 0.8) * 3);
    // tail streams out with speed and swishes when idle
    const sw = Math.sin(this.time * (1 - moving) * 2.2) * 14 * (1 - moving);
    this.set('tail0', -20 - moving * 30, sw * 0.4);
    this.set('tail1', -10 - moving * 25 + Math.sin(P * 2) * 6 * moving, sw * 0.8);
    this.set('tail2', -5 - moving * 10 + Math.sin(P * 2 + 1) * 10 * moving, sw);
    // hoofbeats
    const beat = Math.floor(this.phase * (wGallop > 0.5 ? 2 : 4));
    if (beat !== this.lastBeat && v > 1.5 && this.jump <= 0) {
      this.lastBeat = beat;
      this.onHoof?.();
    }
  }
}
