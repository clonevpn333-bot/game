import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../core/math';
import { Rig, RigStyle } from './Rig';
import { ActionName, Animator } from './Animator';
import type { Player } from './Player';
import { Body, PhysicsWorld } from '../world/Physics';
import type { Vfx } from '../systems/Vfx';
import type { AudioSys } from '../systems/Audio';
import { prep, roundedGeo } from '../world/Geo';
import { dreamify } from '../render/DreamShading';
import { Tex } from '../render/Textures';

export interface ActorContext {
  player: Player;
  physics: PhysicsWorld;
  camera: THREE.PerspectiveCamera;
  vfx: Vfx;
  audio: AudioSys;
  time: number;
  dread: number;
  wake(reason: string): void;
  hurtPlayer(from: THREE.Vector3, amount: number): void;
  isObserved(p: THREE.Vector3, radius: number): boolean;
  bark(actor: Actor, text: string): void;
  /** Set by the HUD so it can draw detection meters. */
  setDetection(actor: Actor, amount: number, alerted: boolean): void;
  inDialogue: boolean;
}

export abstract class Actor {
  readonly group = new THREE.Group();
  readonly home = new THREE.Vector3();
  homeFacing = 0;
  alive = true;
  active = true;
  name = '';
  abstract kind: string;
  abstract update(dt: number, ctx: ActorContext): void;
  reset(): void {
    this.alive = true;
  }
  get position(): THREE.Vector3 {
    return this.group.position;
  }
  dispose(): void {
    this.group.removeFromParent();
  }
}

/** Shared walking helper: rig + animator positioned on the ground. */
abstract class Walker extends Actor {
  readonly rig: Rig;
  readonly anim: Animator;
  facing = 0;
  speed = 0;
  action: ActionName = 'none';
  actionT = 0;
  protected body = new Body();
  protected useBody = false;

  constructor(style: RigStyle, x: number, y: number, z: number, facing = 0) {
    super();
    this.rig = new Rig(style);
    this.anim = new Animator(this.rig);
    this.group.add(this.rig.root);
    this.group.position.set(x, y, z);
    this.home.set(x, y, z);
    this.facing = facing;
    this.homeFacing = facing;
    this.body.pos.set(x, y, z);
    this.body.radius = 0.32 * (style.scale ?? 1);
    this.body.height = 1.5 * (style.scale ?? 1);
  }

  reset(): void {
    super.reset();
    this.group.position.copy(this.home);
    this.body.pos.copy(this.home);
    this.body.vel.set(0, 0, 0);
    this.facing = this.homeFacing;
    this.speed = 0;
    this.action = 'none';
    this.group.visible = true;
  }

  /** Teleport the actor (and its collision body). */
  placeAt(p: THREE.Vector3): void {
    this.group.position.copy(p);
    this.body.pos.copy(p);
    this.body.vel.set(0, 0, 0);
  }

  /** Move toward a point at speed; returns remaining distance. */
  protected steer(target: THREE.Vector3, speed: number, dt: number, physics: PhysicsWorld): number {
    const p = this.group.position;
    const dx = target.x - p.x, dz = target.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d > 0.05) {
      this.facing = dampAngle(this.facing, Math.atan2(dx, dz), 8, dt);
      this.speed = damp(this.speed, speed, 6, dt);
    } else this.speed = damp(this.speed, 0, 8, dt);
    if (this.useBody) {
      this.body.pos.copy(p);
      const s = d > 0.05 ? this.speed : 0;
      this.body.vel.x = (dx / (d || 1)) * s;
      this.body.vel.z = (dz / (d || 1)) * s;
      physics.step(this.body, dt);
      p.copy(this.body.pos);
    } else {
      const step = Math.min(d, this.speed * dt);
      if (d > 1e-4) {
        p.x += (dx / d) * step;
        p.z += (dz / d) * step;
      }
      const gy = physics.groundBelow(p.x, p.z, p.y + 0.6, 0.2);
      if (gy > -Infinity) p.y = damp(p.y, gy, 12, dt);
    }
    return d;
  }

  protected animate(dt: number, ctx: ActorContext, extra: Partial<Parameters<Animator['update']>[1]> = {}): void {
    this.rig.root.rotation.y = this.facing;
    this.anim.update(dt, {
      speed: this.speed,
      grounded: true,
      vy: 0,
      crouch: false,
      sprint: false,
      action: this.action,
      actionT: this.actionT,
      dread: ctx.dread * 0.5,
      inWater: false,
      turn: 0,
      ...extra,
    });
    this.rig.update(dt, ctx.time);
  }

  protected lookAtPlayer(ctx: ActorContext, range: number): void {
    const p = ctx.player.pos;
    const d = this.group.position.distanceTo(p);
    if (d < range) {
      const a = Math.atan2(p.x - this.group.position.x, p.z - this.group.position.z) - this.facing;
      this.rig.lookYaw = Math.atan2(Math.sin(a), Math.cos(a));
    } else this.rig.lookYaw = 0;
  }
}

export type ResidentBehavior = 'idle' | 'loop' | 'wander' | 'frozen' | 'sit' | 'sweep' | 'count' | 'sleep' | 'wave' | 'glitch' | 'talk' | 'lookAround' | 'cower';

export interface ResidentDef {
  name: string;
  style: RigStyle;
  pos: [number, number, number];
  facing?: number;
  behavior?: ResidentBehavior;
  path?: Array<[number, number, number]>;
  speed?: number;
  /** Ambient line shown above the head when Ori is nearby. */
  bark?: string | string[];
  barkRange?: number;
  /** Voice pitch for dialogue blips. */
  voice?: number;
  /** Ignore Ori entirely (later-chapter uncanniness). */
  oblivious?: boolean;
}

export class Resident extends Walker {
  kind = 'resident';
  readonly def: ResidentDef;
  private pathIdx = 0;
  private barkCd = 0;
  private barkIdx = 0;
  private glitchT = 0;
  talking = false;

  constructor(def: ResidentDef) {
    super(def.style, def.pos[0], def.pos[1], def.pos[2], def.facing ?? 0);
    this.def = def;
    this.name = def.name;
    this.applyBehaviorPose();
  }

  private applyBehaviorPose(): void {
    const b = this.def.behavior ?? 'idle';
    const map: Partial<Record<ResidentBehavior, ActionName>> = {
      sit: 'sit', sweep: 'sweep', count: 'count', sleep: 'sleep', wave: 'wave', frozen: 'frozen', talk: 'talk', lookAround: 'lookAround', cower: 'cower',
    };
    this.action = map[b] ?? 'none';
  }

  reset(): void {
    super.reset();
    this.pathIdx = 0;
    this.applyBehaviorPose();
  }

  update(dt: number, ctx: ActorContext): void {
    const b = this.def.behavior ?? 'idle';
    const path = this.def.path;
    if (this.talking) {
      const p = ctx.player.pos;
      this.facing = dampAngle(this.facing, Math.atan2(p.x - this.group.position.x, p.z - this.group.position.z), 5, dt);
      this.speed = damp(this.speed, 0, 8, dt);
      this.action = 'talk';
    } else if ((b === 'loop' || b === 'wander') && path && path.length) {
      const t = new THREE.Vector3(...path[this.pathIdx]);
      const d = this.steer(t, this.def.speed ?? 1.4, dt, ctx.physics);
      if (d < 0.3) this.pathIdx = (this.pathIdx + 1) % path.length;
    } else {
      this.speed = damp(this.speed, 0, 8, dt);
      if (!this.talking) this.applyBehaviorPose();
    }
    if (b === 'glitch') {
      this.glitchT -= dt;
      if (this.glitchT <= 0) {
        this.glitchT = 0.6 + ((ctx.time * 3.7) % 2);
        this.rig.root.position.x = (Math.sin(ctx.time * 91) * 0.25);
        this.facing += Math.sin(ctx.time * 37) * 1.5;
        this.group.visible = Math.sin(ctx.time * 13) > -0.8;
      }
    }
    if (!this.def.oblivious && b !== 'frozen' && b !== 'sleep') this.lookAtPlayer(ctx, 6);
    else this.rig.lookYaw = 0;

    // ambient barks
    this.barkCd -= dt;
    const bark = this.def.bark;
    if (bark && this.barkCd <= 0 && !ctx.inDialogue) {
      const d = this.group.position.distanceTo(ctx.player.pos);
      if (d < (this.def.barkRange ?? 7)) {
        const lines = Array.isArray(bark) ? bark : [bark];
        ctx.bark(this, lines[this.barkIdx % lines.length]);
        this.barkIdx++;
        this.barkCd = 4.5;
      }
    }
    this.animate(dt, ctx, b === 'frozen' ? { stiffness: 60 } : {});
  }
}

// ======================= ENEMIES =======================

const huskMats = {
  card: null as THREE.MeshStandardMaterial | null,
  glow: null as THREE.MeshBasicMaterial | null,
};
function huskMat(): THREE.MeshStandardMaterial {
  if (!huskMats.card) {
    huskMats.card = dreamify(new THREE.MeshStandardMaterial({ map: Tex.cardboard(), vertexColors: true, roughness: 0.9, emissive: '#ff5a3c', emissiveIntensity: 0 }));
    huskMats.card.map!.repeat.set(1, 1);
  }
  return huskMats.card;
}

/** Corrupted delivery being formed around damaged parcels. Melee combat enemy. */
export class ParcelHusk extends Walker {
  kind = 'husk';
  hp = 3;
  private state: 'idle' | 'chase' | 'windup' | 'lunge' | 'recover' | 'stun' | 'dying' = 'idle';
  private t = 0;
  private readonly box: THREE.Mesh;
  private readonly glow: THREE.Mesh;
  private flash = 0;
  aggroRange = 11;
  private readonly lungeDir = new THREE.Vector3();
  private readonly mat: THREE.MeshStandardMaterial;

  constructor(x: number, y: number, z: number, facing = 0, scale = 1) {
    super({ scale: 0.95 * scale, top: '#b98a58', bottom: '#8e6438', skin: '#b98a58', shoes: '#5a3d26', face: 'husk', hair: undefined, headSize: 0.2, bodyW: 0.42 }, x, y, z, facing);
    this.useBody = true;
    this.mat = dreamify(huskMat().clone());
    const boxG = prep(roundedGeo(0.62, 0.52, 0.56, 0.05, 2), '#ffffff', 0.15);
    this.box = new THREE.Mesh(boxG, this.mat);
    this.box.position.set(0, 0.22, 0);
    this.box.castShadow = true;
    this.rig.j.head.add(this.box);
    const slit = prep(roundedGeo(0.42, 0.08, 0.04, 0.02, 1), '#ff9a5a', 0);
    this.glow = new THREE.Mesh(slit, new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.5, 2.5, 2.5), toneMapped: false }));
    this.glow.position.set(0, 0.24, 0.29);
    this.rig.j.head.add(this.glow);
    // extra parcels stuck on the body
    const extra = new THREE.Mesh(prep(roundedGeo(0.34, 0.28, 0.3, 0.04, 2), '#ffffff', 0.2), this.mat);
    extra.position.set(0.18, 0.1, -0.12);
    extra.rotation.set(0.3, 0.5, 0.2);
    this.rig.j.chest.add(extra);
    this.rig.skinned.material = this.mat;
  }

  reset(): void {
    super.reset();
    this.hp = 3;
    this.state = 'idle';
    this.group.scale.setScalar(1);
  }

  takeHit(from: THREE.Vector3, ctx: ActorContext): void {
    if (!this.alive || this.state === 'dying') return;
    this.hp--;
    this.flash = 1;
    const away = this.group.position.clone().sub(from).setY(0).normalize();
    this.body.vel.addScaledVector(away, 6);
    this.group.position.addScaledVector(away, 0.6);
    ctx.audio.hit();
    ctx.vfx.emit(this.group.position.clone().setY(this.group.position.y + 1), 14, { color: '#ffd29a', color2: '#ff8a5a', speed: 4, life: 0.5, size: 0.18 });
    if (this.hp <= 0) {
      this.state = 'dying';
      this.t = 0;
      ctx.audio.crunch();
    } else {
      this.state = 'recover';
      this.t = 0;
      this.action = 'stagger';
    }
  }

  stun(): void {
    if (this.state === 'dying') return;
    this.state = 'stun';
    this.t = 0;
  }

  update(dt: number, ctx: ActorContext): void {
    if (!this.alive) return;
    this.t += dt;
    const p = this.group.position;
    const pp = ctx.player.pos;
    const d = p.distanceTo(pp);
    this.flash = Math.max(0, this.flash - dt * 4);
    switch (this.state) {
      case 'idle':
        this.speed = damp(this.speed, 0, 6, dt);
        this.action = 'none';
        if (d < this.aggroRange && Math.abs(pp.y - p.y) < 3) this.state = 'chase';
        break;
      case 'chase':
        this.action = 'none';
        this.steer(pp, 3.4, dt, ctx.physics);
        if (d < 2.0) {
          this.state = 'windup';
          this.t = 0;
        }
        if (d > this.aggroRange * 1.8) this.state = 'idle';
        break;
      case 'windup':
        this.speed = damp(this.speed, 0, 10, dt);
        this.facing = dampAngle(this.facing, Math.atan2(pp.x - p.x, pp.z - p.z), 10, dt);
        this.action = 'stagger';
        this.actionT = 0.6;
        this.rig.root.position.x = Math.sin(ctx.time * 60) * 0.03;
        if (this.t > 0.55) {
          this.state = 'lunge';
          this.t = 0;
          this.lungeDir.set(Math.sin(this.facing), 0, Math.cos(this.facing));
        }
        break;
      case 'lunge':
        this.action = 'lunge';
        this.actionT = clamp(this.t / 0.35, 0, 1);
        p.addScaledVector(this.lungeDir, 7 * dt * (1 - this.actionT));
        if (d < 1.3 && this.t < 0.3) ctx.hurtPlayer(p, 1);
        if (this.t > 0.35) {
          this.state = 'recover';
          this.t = 0;
        }
        break;
      case 'recover':
        this.speed = damp(this.speed, 0, 8, dt);
        this.action = 'stagger';
        this.actionT = clamp(this.t / 0.7, 0, 1);
        if (this.t > 0.8) this.state = 'chase';
        break;
      case 'stun':
        this.speed = damp(this.speed, 0, 8, dt);
        this.action = 'sleep';
        if (this.t > 2.6) this.state = 'chase';
        break;
      case 'dying': {
        const k = this.t / 0.5;
        this.group.scale.set(1 + k * 0.4, 1 - k * 0.9, 1 + k * 0.4);
        if (k >= 1) {
          this.alive = false;
          this.group.visible = false;
          ctx.vfx.emit(p.clone().setY(p.y + 0.8), 30, { color: '#e2b47c', color2: '#fff1c8', speed: 5, life: 0.9, size: 0.22, gravity: 6 });
          ctx.vfx.ring(p.clone().setY(p.y + 0.05), '#ffcf8a', 2.5, 0.5);
        }
        break;
      }
    }
    const glow = this.state === 'windup' ? 1 + Math.sin(ctx.time * 40) * 0.5 : this.state === 'stun' ? 0.2 : 0.7;
    (this.glow.material as THREE.MeshBasicMaterial).color.setScalar(glow * 2.2);
    this.mat.emissiveIntensity = this.flash * 1.2 + (this.state === 'windup' ? 0.35 : 0);
    this.animate(dt, ctx);
  }
}

/** Former couriers who went too deep. Patrol with lanterns; stealth enemy. */
export class LostCourier extends Walker {
  kind = 'courier';
  private path: THREE.Vector3[];
  private idx = 0;
  private state: 'patrol' | 'suspicious' | 'chase' | 'search' | 'return' | 'stagger' = 'patrol';
  private suspicion = 0;
  private t = 0;
  private wait = 0;
  readonly cone: THREE.Mesh;
  private readonly lastSeen = new THREE.Vector3();
  viewRange = 9;
  viewAngle = 0.62;
  patrolSpeed = 1.5;
  chaseSpeed = 6.6;
  private barkCd = 0;

  constructor(path: Array<[number, number, number]>, opts: { range?: number; speed?: number } = {}) {
    const [x, y, z] = path[0];
    super(
      {
        top: '#4b4f63', topAccent: '#8a7f5a', bottom: '#2f3140', skin: '#b8b2c4', hair: '#262230', hat: 'courier', hatColor: '#3a3d4e',
        face: 'none', scarf: null, lantern: true, material: 'faded', scale: 1.08,
      },
      x, y, z,
    );
    this.path = path.map((p) => new THREE.Vector3(...p));
    this.viewRange = opts.range ?? 9;
    this.patrolSpeed = opts.speed ?? 1.5;
    this.useBody = true;
    // faceless head: dark hollow
    const hollow = new THREE.Mesh(prep(new THREE.SphereGeometry(0.2, 12, 10), '#08060c', 0), new THREE.MeshBasicMaterial({ vertexColors: true }));
    hollow.scale.set(1, 1.1, 0.4);
    hollow.position.set(0, 0.26, 0.17);
    this.rig.j.head.add(hollow);
    // view cone (ground-projected fan)
    const fan = new THREE.CircleGeometry(1, 24, -this.viewAngle + Math.PI / 2, this.viewAngle * 2);
    fan.rotateX(-Math.PI / 2);
    this.cone = new THREE.Mesh(
      fan,
      new THREE.MeshBasicMaterial({ color: '#ffd27a', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    this.cone.position.y = 0.05;
    this.group.add(this.cone);
  }

  reset(): void {
    super.reset();
    this.idx = 0;
    this.state = 'patrol';
    this.suspicion = 0;
  }

  staggerBy(): void {
    this.state = 'stagger';
    this.t = 0;
    this.suspicion = 0;
  }

  private canSee(ctx: ActorContext): number {
    const pl = ctx.player;
    const p = this.group.position;
    const to = pl.pos.clone().sub(p);
    const dist = to.length();
    const range = this.viewRange * (pl.crouch ? 0.55 : 1) * (pl.sprinting ? 1.25 : 1);
    if (dist > range) return 0;
    to.y = 0;
    to.normalize();
    const fwd = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
    const ang = Math.acos(clamp(fwd.dot(to), -1, 1));
    const close = dist < 1.6;
    if (ang > this.viewAngle && !close) return 0;
    const eye = p.clone();
    eye.y += 1.5;
    const tgt = pl.pos.clone();
    tgt.y += pl.crouch ? 0.6 : 1.1;
    if (!ctx.physics.lineOfSight(eye, tgt)) return 0;
    return (1 - dist / range) * 1.6 + 0.4;
  }

  update(dt: number, ctx: ActorContext): void {
    this.t += dt;
    this.barkCd -= dt;
    const p = this.group.position;
    const see = ctx.inDialogue ? 0 : this.canSee(ctx);
    const pl = ctx.player.pos;
    switch (this.state) {
      case 'patrol': {
        if (this.wait > 0) {
          this.wait -= dt;
          this.speed = damp(this.speed, 0, 6, dt);
          this.action = 'lookAround';
        } else {
          this.action = 'none';
          const d = this.steer(this.path[this.idx], this.patrolSpeed, dt, ctx.physics);
          if (d < 0.35) {
            this.idx = (this.idx + 1) % this.path.length;
            this.wait = 1.4;
          }
        }
        if (see > 0) {
          this.suspicion += see * dt * 1.2;
          this.state = 'suspicious';
          this.lastSeen.copy(pl);
        } else this.suspicion = Math.max(0, this.suspicion - dt * 0.4);
        break;
      }
      case 'suspicious': {
        this.speed = damp(this.speed, 0, 6, dt);
        this.action = 'none';
        this.facing = dampAngle(this.facing, Math.atan2(this.lastSeen.x - p.x, this.lastSeen.z - p.z), 3, dt);
        if (see > 0) {
          this.suspicion += see * dt * 1.4;
          this.lastSeen.copy(pl);
        } else this.suspicion -= dt * 0.35;
        if (this.suspicion >= 1) {
          this.state = 'chase';
          ctx.audio.stinger('spotted');
          if (this.barkCd <= 0) {
            ctx.bark(this, 'Is that... a delivery? Give it to me.');
            this.barkCd = 6;
          }
        } else if (this.suspicion <= 0) {
          this.suspicion = 0;
          this.state = 'patrol';
        }
        break;
      }
      case 'chase': {
        this.action = 'none';
        if (see > 0) this.lastSeen.copy(pl);
        this.steer(this.lastSeen, this.chaseSpeed, dt, ctx.physics);
        if (p.distanceTo(pl) < 0.95) ctx.wake('A Lost Courier caught you.');
        if (see <= 0 && p.distanceTo(this.lastSeen) < 0.8) {
          this.state = 'search';
          this.t = 0;
        }
        break;
      }
      case 'search': {
        this.speed = damp(this.speed, 0, 6, dt);
        this.action = 'lookAround';
        if (see > 0) {
          this.state = 'chase';
          this.lastSeen.copy(pl);
        } else if (this.t > 3.5) {
          this.state = 'return';
          this.suspicion = 0;
        }
        break;
      }
      case 'return': {
        this.action = 'none';
        const d = this.steer(this.path[this.idx], this.patrolSpeed * 1.4, dt, ctx.physics);
        if (d < 0.4) this.state = 'patrol';
        if (see > 0) {
          this.state = 'suspicious';
          this.suspicion = 0.5;
          this.lastSeen.copy(pl);
        }
        break;
      }
      case 'stagger': {
        this.speed = damp(this.speed, 0, 8, dt);
        this.action = 'cower';
        if (this.t > 2.2) {
          this.state = 'search';
          this.t = 0;
        }
        break;
      }
    }
    this.suspicion = clamp(this.suspicion, 0, 1);
    const alerted = this.state === 'chase';
    ctx.setDetection(this, alerted ? 1 : this.suspicion, alerted);
    const cm = this.cone.material as THREE.MeshBasicMaterial;
    cm.color.set(alerted ? '#ff6a5a' : this.suspicion > 0.05 ? '#ffb05a' : '#ffd27a');
    cm.opacity = alerted ? 0.2 : 0.1 + this.suspicion * 0.12;
    this.cone.scale.setScalar(this.viewRange * (ctx.player.crouch ? 0.55 : 1));
    this.cone.rotation.y = 0;
    this.cone.quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.facing);
    // the cone is a child of group, the rig rotates separately; keep group unrotated
    if (this.rig.lantern) (this.rig.lantern.material as THREE.MeshBasicMaterial).color.setScalar(alerted ? 3 : 2.2);
    this.animate(dt, ctx, { strideScale: 1.1 });
  }
}

/** Glitched dream residents that move only when unobserved. */
export class StaticFigure extends Walker {
  kind = 'static';
  calmed = false;
  speedUnseen = 7.2;
  private seenT = 0;
  private stingerCd = 0;
  dormant = false;
  catchRange = 0.9;

  constructor(x: number, y: number, z: number, facing = 0, style: Partial<RigStyle> = {}) {
    super(
      {
        material: 'static', face: 'none', top: '#d9d3e6', bottom: '#b3abc6', skin: '#e6e0f0', shoes: '#9a92ad', hair: '#8c85a0',
        scale: 1.05, headSize: 0.25, ...style,
      },
      x, y, z, facing,
    );
    this.useBody = true;
    this.action = 'frozen';
  }

  reset(): void {
    super.reset();
    this.calmed = false;
    this.action = 'frozen';
  }

  update(dt: number, ctx: ActorContext): void {
    this.stingerCd -= dt;
    const p = this.group.position;
    const head = p.clone();
    head.y += 1.1;
    const observed = ctx.isObserved(head, 0.8);
    if (this.calmed || this.dormant || ctx.inDialogue) {
      this.speed = 0;
      this.action = this.calmed ? 'sleep' : 'frozen';
      this.animate(dt, ctx, { stiffness: 80 });
      return;
    }
    if (observed) {
      this.seenT += dt;
      // freeze completely while observed: no pose or position update
      this.speed = 0;
      return;
    }
    this.seenT = 0;
    const d = p.distanceTo(ctx.player.pos);
    if (d < 22) {
      this.action = 'none';
      this.steer(ctx.player.pos, this.speedUnseen, dt, ctx.physics);
      if (d < 6 && this.stingerCd <= 0) {
        ctx.audio.stinger('static');
        this.stingerCd = 8;
      }
      if (d < this.catchRange) ctx.wake('A Static Figure reached you while you looked away.');
    } else {
      this.speed = 0;
    }
    this.animate(dt, ctx, { stiffness: 60 });
  }
}

/** Tall distant figures; mostly harmless, deeply wrong. */
export class Watcher extends Actor {
  kind = 'watcher';
  readonly rig: Rig;
  mode: 'vanishOnLook' | 'approach' | 'stare' = 'stare';
  private seen = 0;
  private hidden = false;
  private stepCd = 0;
  approachStep = 6;
  minDist = 10;
  onSeen?: () => void;
  private seenOnce = false;

  constructor(x: number, y: number, z: number, scale = 2.6) {
    super();
    this.rig = new Rig({
      scale, legLen: 0.95, armLen: 0.85, torsoLen: 0.55, bodyW: 0.3, headSize: 0.2, material: 'void', face: 'none',
      top: '#1a1622', bottom: '#120f18', skin: '#1a1622', hat: 'none',
    });
    this.group.add(this.rig.root);
    this.group.position.set(x, y, z);
    this.home.set(x, y, z);
    this.rig.target.head.z = 0.35;
    this.rig.target.shoulderL.z = -0.05;
    this.rig.target.shoulderR.z = 0.05;
  }

  reset(): void {
    super.reset();
    this.group.position.copy(this.home);
    this.hidden = false;
    this.group.visible = true;
    this.seen = 0;
  }

  update(dt: number, ctx: ActorContext): void {
    if (!this.active) {
      this.group.visible = false;
      return;
    }
    const p = this.group.position;
    const pp = ctx.player.pos;
    this.rig.root.rotation.y = Math.atan2(pp.x - p.x, pp.z - p.z);
    const head = p.clone();
    head.y += 4;
    const observed = !this.hidden && ctx.isObserved(head, 1.5);
    if (observed) {
      this.seen += dt;
      if (!this.seenOnce && this.seen > 0.3) {
        this.seenOnce = true;
        ctx.audio.stinger('watcher');
        this.onSeen?.();
      }
    }
    if (this.mode === 'vanishOnLook' && this.seen > 1.1 && !this.hidden) {
      this.hidden = true;
      this.group.visible = false;
      ctx.vfx.emit(head, 30, { color: '#2a2238', color2: '#9a8fc0', speed: 2, life: 1.5, size: 0.4 });
    }
    if (this.mode === 'approach' && !observed) {
      this.stepCd -= dt;
      const d = Math.hypot(pp.x - p.x, pp.z - p.z);
      if (this.stepCd <= 0 && d > this.minDist) {
        this.stepCd = 1.6;
        const k = Math.min(this.approachStep, d - this.minDist) / d;
        p.x += (pp.x - p.x) * k;
        p.z += (pp.z - p.z) * k;
      }
    }
    this.rig.update(dt, ctx.time);
  }
}

/** Entities that do not belong inside dreams at all. Relentless chasers. */
export class Sleepless extends Walker {
  kind = 'sleepless';
  chaseSpeed = 7.4;
  hunting = false;
  catchRange = 1.0;
  private screamCd = 0;

  constructor(x: number, y: number, z: number, scale = 1.35) {
    super({ material: 'void', face: 'void', scale, legLen: 0.85, armLen: 0.78, bodyW: 0.34, headSize: 0.26, top: '#05030a', bottom: '#05030a', skin: '#05030a' }, x, y, z);
    this.useBody = true;
    this.body.stepHeight = 0.6;
  }

  reset(): void {
    super.reset();
    this.hunting = false;
    this.group.visible = false;
  }

  update(dt: number, ctx: ActorContext): void {
    if (!this.hunting) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    this.screamCd -= dt;
    const d = this.group.position.distanceTo(ctx.player.pos);
    this.action = 'none';
    this.steer(ctx.player.pos, ctx.inDialogue ? 0 : this.chaseSpeed, dt, ctx.physics);
    if (d < this.catchRange) ctx.wake('The Sleepless took hold of you.');
    if (d < 9 && this.screamCd <= 0) {
      ctx.audio.stinger('sleepless');
      this.screamCd = 9;
    }
    // jittery, wrong movement
    this.rig.root.position.x = Math.sin(ctx.time * 47) * 0.04;
    this.animate(dt, ctx, { stiffness: 40, strideScale: 1.2 });
    this.rig.target.head.z = Math.sin(ctx.time * 3) * 0.5;
  }
}
