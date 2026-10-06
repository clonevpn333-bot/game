import { lineDuration } from '../audio/voice';
import * as THREE from 'three';
import type { Game } from './Game';
import { Animator, gaitRate, idle, locomotion, track, type Pose, type Rig } from '../entities/Rig';
import { buildKnight } from '../entities/Knight';
import { buildMorvane } from '../entities/Morvane';
import { buildTownsfolk, styleFor } from '../entities/Townsfolk';
import { Cloth } from '../entities/Cloth';
import { Mats } from '../world/Materials';
import type { FolkStyle } from '../entities/Rig';
import { dampAngle } from '../utils/math';

// ============================================================================ actors

export type ActorKind = 'calder' | 'ivarr' | 'morvane' | 'folk';
export type ActorPose =
  | 'idle' | 'talk' | 'point' | 'kneel' | 'bow' | 'arms' | 'cower' | 'pray' | 'lie' | 'lookup'
  | 'staff' | 'staffRaise' | 'guard' | 'sitWall' | 'reach' | 'slump';

/** A performer in a cutscene: walks with the real gait, gestures while speaking, holds poses. */
export class Actor {
  readonly group = new THREE.Group();
  readonly rig: Rig;
  private readonly anim: Animator;
  readonly cloak: Cloth | null = null;
  yaw = 0;
  pose: ActorPose = 'idle';
  private target: THREE.Vector3 | null = null;
  private speed = 1.5;
  private phase = 0;
  private talkT = 0;
  private faceTarget: THREE.Vector3 | null = null;
  private onArrive: (() => void) | null = null;
  private poseT = 0;
  private sword: THREE.Object3D | null = null;

  constructor(
    readonly name: string,
    readonly kind: ActorKind,
    private readonly ground: (x: number, z: number) => number,
    style?: FolkStyle,
  ) {
    if (kind === 'calder' || kind === 'ivarr') {
      const k = buildKnight({ hollow: kind === 'ivarr' });
      this.rig = k;
      this.sword = k.sword;
      k.sword.visible = false;
      this.cloak = new Cloth(7, 11, 0.62, 1.42, k.mats.cloak, k.cloakAnchorL, k.cloakAnchorR, 1.55);
      this.cloak.colliders.push(
        { obj: k.j.chest, offset: new THREE.Vector3(0, 0.16, -0.02), r: 0.27 },
        { obj: k.j.hips, offset: new THREE.Vector3(0, -0.12, -0.02), r: 0.29 },
        { obj: k.j.hipL, offset: new THREE.Vector3(0, -0.3, 0), r: 0.14 },
        { obj: k.j.hipR, offset: new THREE.Vector3(0, -0.3, 0), r: 0.14 },
      );
    } else if (kind === 'morvane') {
      this.rig = buildMorvane();
    } else {
      this.rig = buildTownsfolk(styleFor(name, style ?? { robe: Mats().robeBrown, skin: '#c99878', mood: 'calm', hair: true }));
    }
    this.group.add(this.rig.root);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2).rotateX(-Math.PI / 2), Mats().contactShadow);
    sh.position.y = 0.03;
    this.group.add(sh);
    this.anim = new Animator(this.rig);
  }

  get pos(): THREE.Vector3 {
    return this.group.position;
  }

  place(p: THREE.Vector3, yaw: number): this {
    this.group.position.set(p.x, this.ground(p.x, p.z), p.z);
    this.yaw = yaw;
    this.group.rotation.y = yaw;
    this.cloak?.reset();
    return this;
  }

  armed(on: boolean): this {
    if (this.sword) this.sword.visible = on;
    return this;
  }

  setPose(p: ActorPose): this {
    this.pose = p;
    this.poseT = 0;
    return this;
  }

  walkTo(p: THREE.Vector3, speed = 1.6, onArrive?: () => void): this {
    this.target = p.clone();
    this.speed = speed;
    this.onArrive = onArrive ?? null;
    return this;
  }

  face(p: THREE.Vector3 | null): this {
    this.faceTarget = p ? p.clone() : null;
    return this;
  }

  talk(seconds: number): void {
    this.talkT = seconds;
  }

  get moving(): boolean {
    return this.target !== null;
  }

  private posePose(t: number): Pose {
    const k = Math.min(1, this.poseT / 0.8);
    switch (this.pose) {
      case 'kneel':
        return { hipL: [-1.5, 0, 0.12], hipR: [-0.1, 0, -0.1], kneeL: [1.55, 0, 0], kneeR: [2.25, 0, 0], footR: [0.7, 0, 0], spine: [0.2, 0, 0], head: [0.35, 0, 0], shoulderL: [-0.3, 0, 0.15], elbowL: [-0.6, 0, 0], shoulderR: [-0.6, 0, -0.1], elbowR: [-1.0, 0, 0], rootY: -0.45 };
      case 'bow':
        return { ...idle(t), spine: [0.55, 0, 0], head: [0.4, 0, 0], shoulderL: [0.1, 0, 0.1], shoulderR: [0.1, 0, -0.1] };
      case 'point':
        return { ...idle(t), shoulderR: [-1.5, 0.2, -0.1], elbowR: [-0.05, 0, 0], head: [0, 0.1, 0], spine: [0.05, -0.2, 0] };
      case 'arms':
        return { ...idle(t), shoulderL: [-2.6, 0, 0.5], shoulderR: [-2.6, 0, -0.5], elbowL: [-0.3, 0, 0], elbowR: [-0.3, 0, 0], spine: [-0.25, 0, 0], head: [-0.5, 0, 0] };
      case 'cower':
        return { hipL: [-1.6, 0, 0.2], hipR: [-1.6, 0, -0.2], kneeL: [2.3, 0, 0], kneeR: [2.3, 0, 0], spine: [0.9, 0, 0], head: [0.6, 0, 0], shoulderL: [-2.4, 0, 0.6], shoulderR: [-2.4, 0, -0.6], elbowL: [-2, 0, 0], elbowR: [-2, 0, 0], rootY: -0.62 };
      case 'pray':
        return { hipL: [-1.5, 0, 0.1], hipR: [-1.5, 0, -0.1], kneeL: [2.2, 0, 0], kneeR: [2.2, 0, 0], spine: [0.15, 0, 0], head: [0.35, 0, 0], shoulderL: [-1.0, 0.4, 0.1], shoulderR: [-1.0, -0.4, -0.1], elbowL: [-1.6, 0, 0], elbowR: [-1.6, 0, 0], rootY: -0.6 };
      case 'lie':
        return { hipL: [-0.2, 0, 0.2], hipR: [-0.1, 0, -0.15], kneeL: [0.4, 0, 0], kneeR: [0.2, 0, 0], spine: [-0.2, 0, 0], head: [-0.3, 0.4, 0], shoulderL: [-0.3, 0, 1.0], shoulderR: [-0.5, 0, -0.8], rootY: -0.82, rootPitch: -1.45 * k };
      case 'slump':
        return { hipL: [-1.4, 0, 0.3], hipR: [-1.3, 0, -0.3], kneeL: [0.3, 0, 0], kneeR: [0.5, 0, 0], spine: [-0.4, 0, 0], head: [0.5, 0.3, 0.2], shoulderL: [0.1, 0, 0.4], shoulderR: [-0.3, 0, -0.4], elbowR: [-1.2, 0, 0], rootY: -0.75 };
      case 'sitWall':
        return { hipL: [-1.45, 0, 0.2], hipR: [-1.45, 0, -0.2], kneeL: [0.6, 0, 0], kneeR: [0.9, 0, 0], spine: [-0.3, 0, 0], head: [0.2, 0.2, 0], shoulderL: [-0.2, 0, 0.3], shoulderR: [-0.6, 0, -0.2], elbowR: [-1.4, 0, 0], rootY: -0.72 };
      case 'lookup':
        return { ...idle(t), head: [-0.7, Math.sin(t * 0.6) * 0.2, 0], neck: [-0.25, 0, 0], spine: [-0.1, 0, 0] };
      case 'staff':
        return { ...idle(t), shoulderR: [-0.35, 0, -0.15], elbowR: [-1.2, 0, 0], handR: [0.1, 0, 0], shoulderL: [-0.25, 0, 0.2], elbowL: [-0.8, 0, 0] };
      case 'staffRaise':
        return { ...idle(t), shoulderR: [-2.9, 0, -0.2], elbowR: [-0.2, 0, 0], shoulderL: [-1.8, 0, 0.5], elbowL: [-0.4, 0, 0], spine: [-0.3, 0, 0], head: [-0.5, 0, 0] };
      case 'guard':
        return { ...idle(t, { swordHeld: true }) };
      case 'reach':
        return { ...idle(t), shoulderR: [-1.3, 0, -0.1], elbowR: [-0.3, 0, 0], shoulderL: [-0.9, 0, 0.2], elbowL: [-0.5, 0, 0], spine: [0.35, 0, 0], head: [0.2, 0, 0] };
      default:
        return idle(t);
    }
  }

  update(dt: number, t: number): void {
    this.poseT += dt;
    this.talkT = Math.max(0, this.talkT - dt);
    let pose: Pose;
    if (this.target) {
      const dx = this.target.x - this.pos.x;
      const dz = this.target.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.15) {
        this.target = null;
        const cb = this.onArrive;
        this.onArrive = null;
        cb?.();
        pose = this.posePose(t);
      } else {
        this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 8, dt);
        const step = Math.min(d, this.speed * dt);
        this.pos.x += (dx / d) * step;
        this.pos.z += (dz / d) * step;
        this.pos.y = this.ground(this.pos.x, this.pos.z);
        this.phase += gaitRate(this.speed) * dt;
        pose = locomotion(this.phase, this.speed / 5, { armSwing: this.kind === 'morvane' ? 0.15 : 0.5 });
        if (this.kind === 'morvane') {
          const st = this.posePose(t);
          pose = { ...pose, shoulderR: [-0.35, 0, -0.15], elbowR: [-1.2, 0, 0] };
          void st;
        }
      }
    } else {
      if (this.faceTarget) this.yaw = dampAngle(this.yaw, Math.atan2(this.faceTarget.x - this.pos.x, this.faceTarget.z - this.pos.z), 5, dt);
      pose = this.posePose(t);
      // Speaking: head nods and an open-hand gesture layered over standing poses.
      if (this.talkT > 0 && ['idle', 'talk', 'staff', 'lookup', 'guard'].includes(this.pose)) {
        const g = Math.sin(t * 5.3) * 0.5 + 0.5;
        pose.head = [(pose.head?.[0] ?? 0) + Math.sin(t * 7) * 0.05, (pose.head?.[1] ?? 0) + Math.sin(t * 2.3) * 0.1, 0];
        if (this.pose !== 'staff') {
          pose.shoulderL = [-0.55 - g * 0.35, 0.2, 0.25];
          pose.elbowL = [-1.0 - g * 0.3, 0, 0];
        }
      }
    }
    this.anim.apply(pose, dt, 9);
    const face = (this.rig as { face?: { talking: boolean; update: (dt: number) => void } }).face;
    if (face) {
      face.talking = this.talkT > 0.15;
      face.update(dt);
    }
    this.group.rotation.y = this.yaw;
    if (this.cloak) {
      this.group.updateMatrixWorld(true);
      this.cloak.update(dt, t);
    }
    const halo = (this.rig as unknown as { halo?: THREE.Mesh }).halo;
    if (halo) halo.rotation.z += dt * 0.6;
  }

  attach(parent: THREE.Object3D, scene: THREE.Object3D): void {
    parent.add(this.group);
    if (this.cloak) scene.add(this.cloak.mesh);
  }

  dispose(): void {
    this.group.removeFromParent();
    this.cloak?.mesh.removeFromParent();
  }
}

// ============================================================================ shots

type V = THREE.Vector3;
export type Line = [speaker: string, text: string, seconds?: number];

export type Shot = {
  /** Minimum length; extended automatically to fit the lines. */
  dur?: number;
  cam?: { from: V; to?: V; look: V; lookTo?: V; fov?: number };
  /** Dynamic camera (worldRoot-local positions). */
  camFn?: (k: number) => { pos: V; look: V };
  lines?: Line[];
  narr?: string[];
  /** Visual setup at the start of the shot (actor commands, effects). */
  start?: () => void;
  /** Persistent world state; also run when the cutscene is skipped. */
  apply?: () => void;
  tick?: (k: number, dt: number, t: number) => void;
  fadeIn?: number;
  fadeOut?: number;
  card?: [string, string];
  /** Dip to black into this shot instead of a hard cut. */
  dip?: boolean;
  /** Handheld drift amount (0 = locked off). Default 1. */
  handheld?: number;
};

const ease = (k: number) => k * k * (3 - 2 * k);

export class CutscenePlayer {
  active = false;
  private shots: Shot[] = [];
  private i = -1;
  private t = 0;
  private dur = 0;
  private applied = new Set<number>();
  private onDone: (() => void) | null = null;
  readonly actors: Actor[] = [];
  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();
  private readonly tmpC = new THREE.Vector3();
  /** World point kept in focus by the cinematic depth of field (whatever the shot looks at). */
  private readonly focus = new THREE.Vector3();
  private savedFov = 55;

  constructor(private readonly g: Game) {}

  /** Create a performer standing on the path's ground. */
  actor(name: string, kind: ActorKind, pos: V, yaw: number, style?: FolkStyle): Actor {
    const g = this.g;
    const ground = (x: number, z: number) => g.path.nearest(x, z).sample.pos.y;
    const a = new Actor(name, kind, ground, style).place(pos, yaw);
    a.attach(g.worldRoot, g.scene);
    this.actors.push(a);
    return a;
  }

  /** Transition phase: dipping to black before the first shot, or after the last. */
  private phase: 'in' | 'shots' | 'out' = 'shots';
  private phaseT = 0;
  private clock = 0;

  play(shots: Shot[], onDone?: () => void): void {
    const g = this.g;
    this.shots = shots;
    this.i = -1;
    this.applied.clear();
    this.onDone = onDone ?? null;
    this.active = true;
    g.player.controlEnabled = false;
    g.player.invulnerable = true;
    // Dip to black out of gameplay, then cut in on the first shot.
    this.phase = 'in';
    this.phaseT = 0;
    g.hud.fade(1, 0.35);
  }

  /** Scene changes (storybook narration ↔ live dialogue) dip through black; everything else is a hard cut. */
  private dipsInto(i: number): boolean {
    const s = this.shots[i];
    const p = this.shots[i - 1];
    if (!s || !p || s.fadeIn) return false;
    return !!s.dip || !!p.narr !== !!s.narr;
  }

  private begin(): void {
    const g = this.g;
    this.phase = 'shots';
    this.savedFov = g.cam.baseFov;
    g.player.controlEnabled = false;
    g.player.invulnerable = true;
    g.player.lockTarget = null;
    g.player.group.visible = false;
    g.player.cloak.mesh.visible = false;
    g.hud.setLetterbox(true);
    g.hud.cinematic(true);
    g.cam.setCinematic(true);
    g.cam.cineWeight = 1;
    g.pipeline.dofPass.enabled = true;
    g.audio.preloadLines(this.shots.flatMap((sh) => [...(sh.lines ?? []).map((l): [string, string] => [l[0], l[1]]), ...(sh.narr ?? []).map((n): [string, string] => ['Narrator', n])]));
    g.pipeline.dof.target = this.focus;
    this.next();
    if (!this.shots[0]?.fadeIn) g.hud.fade(0, 0.7);
  }

  private lineSeconds(l: Line): number {
    const v = lineDuration(l[0], l[1]);
    return l[2] ? Math.max(l[2], v) : v;
  }

  private next(): void {
    const g = this.g;
    this.i += 1;
    if (this.i >= this.shots.length) {
      this.finish();
      return;
    }
    const s = this.shots[this.i];
    this.t = 0;
    const lineTime = (s.lines ?? []).reduce((a, l) => a + this.lineSeconds(l) + 0.35, 0);
    const narrTime = (s.narr ?? []).reduce((a, n) => a + lineDuration('Narrator', n, 3.2, 0.07) + 0.45, 0);
    this.dur = Math.max(s.dur ?? 2, lineTime + 0.4, narrTime + 0.4);
    if (!this.applied.has(this.i)) {
      this.applied.add(this.i);
      s.apply?.();
    }
    s.start?.();
    g.hud.clearSubtitles();
    for (const l of s.lines ?? []) {
      g.hud.say(l[0], l[1], this.lineSeconds(l), l[0] === '');
    }
    if (s.narr) g.hud.narrate(s.narr);
    if (s.card) g.hud.area(s.card[0], s.card[1], Math.min(6, this.dur));
    if (s.fadeIn) {
      g.hud.fade(1, 0.01);
      window.setTimeout(() => g.hud.fade(0, s.fadeIn), 30);
    } else if (this.dipsInto(this.i)) {
      g.hud.fade(0, 0.55);
    }
    if (s.cam?.fov) g.cam.baseFov = s.cam.fov;
    else g.cam.baseFov = this.savedFov;
    // Mouth/gesture timing: whoever speaks first gets the talk gesture.
    let at = 0;
    for (const l of s.lines ?? []) {
      const a = this.actors.find((x) => x.name === l[0]);
      const len = this.lineSeconds(l);
      if (a) window.setTimeout(() => a.talk(len), at * 1000);
      at += len + 0.35;
    }
    this.place(0);
  }

  private place(k: number): void {
    const g = this.g;
    const s = this.shots[this.i];
    if (!s) return;
    const e = ease(Math.min(1, k));
    // Handheld drift: a slow, breathing wobble so shots never feel like a locked debug camera.
    const hh = (s.handheld ?? 1) * 0.045;
    const c = this.clock;
    const sway = this.tmpC.set(Math.sin(c * 0.71) + Math.sin(c * 1.73) * 0.4, Math.sin(c * 0.93 + 1.3) * 0.7, Math.cos(c * 0.57) + Math.sin(c * 1.31) * 0.3).multiplyScalar(hh);
    if (s.camFn) {
      const r = s.camFn(e);
      g.cam.cinePos.copy(g.worldRoot.localToWorld(this.tmpA.copy(r.pos).add(sway)));
      g.cam.cineLook.copy(g.worldRoot.localToWorld(this.tmpB.copy(r.look).addScaledVector(sway, 0.5)));
      this.focus.copy(g.cam.cineLook);
    } else if (s.cam) {
      const p = this.tmpA.copy(s.cam.from);
      if (s.cam.to) p.lerp(s.cam.to, e);
      const l = this.tmpB.copy(s.cam.look);
      if (s.cam.lookTo) l.lerp(s.cam.lookTo, e);
      g.cam.cinePos.copy(g.worldRoot.localToWorld(p.add(sway)));
      g.cam.cineLook.copy(g.worldRoot.localToWorld(l.addScaledVector(sway, 0.5)));
      this.focus.copy(g.cam.cineLook);
    }
  }

  update(dt: number, time: number): void {
    for (const a of this.actors) a.update(dt, time);
    if (!this.active) return;
    const g = this.g;
    // Depth of field: tight on close dialogue, wide open on landscapes.
    const fd = g.cam.cinePos.distanceTo(this.focus);
    g.pipeline.dof.cocMaterial.focusRange = Math.max(2.5, fd * 0.45);
    g.pipeline.dof.bokehScale = fd > 40 ? 0 : fd > 12 ? 1.5 : 3.2;
    this.clock += dt;
    if (this.phase === 'in') {
      this.phaseT += dt;
      if (this.phaseT > 0.4) this.begin();
      return;
    }
    if (this.phase === 'out') {
      this.phaseT += dt;
      if (this.phaseT > 0.4) this.end();
      return;
    }
    if (g.input.consume('roll') || g.input.consume('pause')) {
      this.skip();
      return;
    }
    this.t += dt;
    const s = this.shots[this.i];
    const k = this.t / this.dur;
    s.tick?.(Math.min(1, k), dt, time);
    this.place(k);
    if (s.fadeOut && this.t > this.dur - s.fadeOut && this.t - dt <= this.dur - s.fadeOut) g.hud.fade(1, s.fadeOut);
    // Dip into the next shot: fade out the tail of this one.
    const nx = this.shots[this.i + 1];
    if (nx && this.dipsInto(this.i + 1) && !s.fadeOut && this.t > this.dur - 0.4 && this.t - dt <= this.dur - 0.4) g.hud.fade(1, 0.38);
    if (this.t >= this.dur) this.next();
  }

  skip(): void {
    for (let i = Math.max(0, this.i); i < this.shots.length; i += 1) {
      if (!this.applied.has(i)) {
        this.applied.add(i);
        this.shots[i].apply?.();
      }
    }
    this.g.hud.clearSubtitles();
    this.g.hud.narrate([]);
    this.finish();
  }

  private finish(): void {
    // Dip to black, then hand the camera back to the player.
    this.phase = 'out';
    this.phaseT = 0;
    this.g.hud.clearSubtitles();
    this.g.hud.fade(1, 0.35);
  }

  private end(): void {
    const g = this.g;
    this.active = false;
    this.phase = 'shots';
    g.cam.baseFov = this.savedFov;
    g.hud.setLetterbox(false);
    g.hud.cinematic(false);
    g.cam.setCinematic(false);
    g.cam.cineWeight = 0;
    g.pipeline.dofPass.enabled = false;
    g.pipeline.dof.target = null;
    g.player.group.visible = true;
    g.player.cloak.mesh.visible = true;
    g.player.controlEnabled = true;
    g.player.invulnerable = false;
    g.cam.snap(g.worldRoot.localToWorld(g.player.pos.clone()), g.player.yaw);
    g.hud.fade(0, 0.9);
    const cb = this.onDone;
    this.onDone = null;
    cb?.();
  }

  /** Remove all performers (call when a chapter resets or after a cutscene that cleans up). */
  clearActors(keep: Actor[] = []): void {
    for (let i = this.actors.length - 1; i >= 0; i -= 1) {
      const a = this.actors[i];
      if (keep.includes(a)) continue;
      a.dispose();
      this.actors.splice(i, 1);
    }
  }
}

/** Helpers for authoring shots relative to a point on the path. */
export function around(center: V, radius: number, height: number, angleFrom: number, angleTo: number, lookHeight = 1.4): (k: number) => { pos: V; look: V } {
  return (k: number) => {
    const a = angleFrom + (angleTo - angleFrom) * k;
    return {
      pos: new THREE.Vector3(center.x + Math.sin(a) * radius, center.y + height, center.z + Math.cos(a) * radius),
      look: new THREE.Vector3(center.x, center.y + lookHeight, center.z),
    };
  };
}

/** Over-the-shoulder framing from `a` toward `b`. */
export function overShoulder(a: Actor, b: Actor, side = 1, dist = 1.6): (k: number) => { pos: V; look: V } {
  return () => {
    const dir = b.pos.clone().sub(a.pos).setY(0).normalize();
    const right = new THREE.Vector3(-dir.z, 0, dir.x);
    return {
      pos: a.pos.clone().addScaledVector(dir, -dist).addScaledVector(right, side * 0.65).setY(a.pos.y + 1.85),
      look: b.pos.clone().setY(b.pos.y + 1.55),
    };
  };
}

export { track };
