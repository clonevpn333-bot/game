import * as THREE from 'three';
import { Animator, idle, locomotion, mix, track, type Pose } from './Rig';
import { buildKnight } from './Knight';
import { Cloth } from './Cloth';
import { Horse } from './Horse';
import { Mats } from '../world/Materials';
import { Input } from '../core/Input';
import { Nav } from '../game/Nav';
import type { Combatant, EventBus, HitInfo } from '../systems/Combat';
import { clamp, damp, dampAngle, wrapAngle } from '../utils/math';

type State = 'ride' | 'free' | 'attack' | 'roll' | 'hit' | 'flask' | 'dead' | 'locked';

export type AttackDef = {
  duration: number;
  active: [number, number];
  damage: number;
  poise: number;
  stamina: number;
  reach: number;
  arc: number;
  lunge: number;
  heavy: boolean;
  keys: Array<[number, Pose]>;
};

/** Two-handed longsword guard: right hand forward of the navel, blade rising across the body. */
export function guardPose(t: number, breathe = 1): Pose {
  const b = Math.sin(t * 1.7) * 0.025 * breathe;
  return {
    hips: [0, 0.18, 0],
    spine: [0.06 + b, -0.12, 0],
    chest: [0.04 + b, -0.1, 0],
    neck: [0, 0.1, 0],
    head: [-0.06 - b, 0.12, 0],
    shoulderR: [-0.3, 0.1, 0.42],
    elbowR: [-1.05, 0, 0],
    handR: [0.75, 0.2, 0.1],
    shoulderL: [-0.4, 0, 0.2],
    elbowL: [-1.1, 0, 0],
    hipL: [-0.22, 0, 0.1],
    hipR: [0.16, 0, -0.08],
    kneeL: [0.22, 0, 0],
    kneeR: [0.2, 0, 0],
    footL: [0.0, 0, 0],
    footR: [-0.08, 0, 0],
    rootY: -0.03 + b * 0.4,
  };
}

const GUARD: Pose = guardPose(0);

export const ATTACKS: AttackDef[] = [
  {
    duration: 0.66,
    active: [0.3, 0.52],
    damage: 22,
    poise: 22,
    stamina: 17,
    reach: 2.5,
    arc: 1.25,
    lunge: 2.2,
    heavy: false,
    keys: [
      [0, GUARD],
      [0.26, { shoulderR: [-2.3, 0, -0.9], elbowR: [-1.2, 0, 0], handR: [0.4, 0, 0], chest: [0, -0.6, 0], spine: [0, -0.2, 0], shoulderL: [-0.6, 0, 0.3], elbowL: [-0.9, 0, 0], hipL: [-0.2, 0, 0.05], hipR: [0.1, 0, -0.05], kneeL: [0.2, 0, 0], kneeR: [0.2, 0, 0], rootY: -0.04 }],
      [0.44, { shoulderR: [-1.2, 0, 0.7], elbowR: [-0.25, 0, 0], handR: [0.1, 0, 0], chest: [0.15, 0.75, 0], spine: [0.2, 0.25, 0], shoulderL: [-0.2, 0, 0.5], elbowL: [-0.6, 0, 0], hipL: [-0.6, 0, 0.05], kneeL: [0.5, 0, 0], hipR: [0.35, 0, -0.05], kneeR: [0.35, 0, 0], rootY: -0.1 }],
      [0.7, { shoulderR: [-0.6, 0, 0.9], elbowR: [-0.5, 0, 0], handR: [0.1, 0, 0], chest: [0.1, 0.5, 0], spine: [0.15, 0.2, 0], hipL: [-0.4, 0, 0.05], kneeL: [0.4, 0, 0], hipR: [0.25, 0, 0], kneeR: [0.3, 0, 0], rootY: -0.08 }],
      [1, GUARD],
    ],
  },
  {
    duration: 0.66,
    active: [0.3, 0.52],
    damage: 22,
    poise: 22,
    stamina: 17,
    reach: 2.5,
    arc: 1.25,
    lunge: 2.2,
    heavy: false,
    keys: [
      [0, { shoulderR: [-0.6, 0, 0.9], elbowR: [-0.5, 0, 0], chest: [0.1, 0.5, 0] }],
      [0.24, { shoulderR: [-1.5, 0, 1.0], elbowR: [-1.5, 0, 0], handR: [0.5, 0, 0], chest: [0.05, 0.7, 0], spine: [0, 0.2, 0], hipR: [-0.1, 0, 0], kneeR: [0.2, 0, 0], rootY: -0.04 }],
      [0.44, { shoulderR: [-1.35, 0, -1.1], elbowR: [-0.2, 0, 0], handR: [0.1, 0, 0], chest: [0.15, -0.75, 0], spine: [0.2, -0.25, 0], shoulderL: [-0.3, 0, 0.6], hipR: [-0.6, 0, -0.05], kneeR: [0.5, 0, 0], hipL: [0.35, 0, 0.05], kneeL: [0.35, 0, 0], rootY: -0.1 }],
      [0.7, { shoulderR: [-0.8, 0, -1.2], elbowR: [-0.4, 0, 0], chest: [0.1, -0.5, 0], hipR: [-0.4, 0, 0], kneeR: [0.4, 0, 0], rootY: -0.07 }],
      [1, GUARD],
    ],
  },
  {
    duration: 0.86,
    active: [0.38, 0.56],
    damage: 34,
    poise: 40,
    stamina: 22,
    reach: 2.8,
    arc: 0.8,
    lunge: 2.8,
    heavy: false,
    keys: [
      [0, GUARD],
      [0.32, { shoulderR: [-3.0, 0, -0.2], elbowR: [-1.5, 0, 0], handR: [0.6, 0, 0], shoulderL: [-2.7, 0, 0.35], elbowL: [-1.5, 0, 0], spine: [-0.25, 0, 0], chest: [-0.1, 0, 0], hipL: [-0.15, 0, 0.05], kneeL: [0.25, 0, 0], kneeR: [0.25, 0, 0], rootY: 0.02 }],
      [0.48, { shoulderR: [-1.0, 0, -0.05], elbowR: [-0.1, 0, 0], handR: [-0.1, 0, 0], shoulderL: [-1.0, 0, 0.35], elbowL: [-0.2, 0, 0], spine: [0.5, 0, 0], chest: [0.15, 0, 0], hipL: [-0.75, 0, 0.05], kneeL: [0.7, 0, 0], hipR: [0.45, 0, 0], kneeR: [0.45, 0, 0], rootY: -0.18 }],
      [0.75, { shoulderR: [-0.6, 0, -0.1], elbowR: [-0.3, 0, 0], shoulderL: [-0.6, 0, 0.3], elbowL: [-0.4, 0, 0], spine: [0.4, 0, 0], hipL: [-0.5, 0, 0], kneeL: [0.5, 0, 0], rootY: -0.12 }],
      [1, GUARD],
    ],
  },
];

export const HEAVY: AttackDef = {
  duration: 1.15,
  active: [0.5, 0.64],
  damage: 58,
  poise: 75,
  stamina: 32,
  reach: 3.0,
  arc: 1.0,
  lunge: 3.6,
  heavy: true,
  keys: [
    [0, GUARD],
    [0.4, { shoulderR: [-3.1, 0, -0.4], elbowR: [-1.7, 0, 0], handR: [0.8, 0, 0], shoulderL: [-2.9, 0, 0.4], elbowL: [-1.7, 0, 0], spine: [-0.35, -0.35, 0], chest: [-0.15, -0.3, 0], hipL: [-0.4, 0, 0.1], kneeL: [0.6, 0, 0], hipR: [0.2, 0, 0], kneeR: [0.7, 0, 0], rootY: -0.12 }],
    [0.56, { shoulderR: [-0.8, 0, 0.1], elbowR: [0, 0, 0], handR: [-0.2, 0, 0], shoulderL: [-0.8, 0, 0.3], elbowL: [-0.1, 0, 0], spine: [0.7, 0.1, 0], chest: [0.2, 0.1, 0], hipL: [-0.9, 0, 0.1], kneeL: [0.9, 0, 0], hipR: [0.6, 0, 0], kneeR: [0.5, 0, 0], rootY: -0.3, rootPitch: 0.1 }],
    [0.8, { shoulderR: [-0.5, 0, 0.1], elbowR: [-0.2, 0, 0], shoulderL: [-0.5, 0, 0.3], spine: [0.6, 0, 0], hipL: [-0.7, 0, 0], kneeL: [0.8, 0, 0], kneeR: [0.4, 0, 0], rootY: -0.25 }],
    [1, GUARD],
  ],
};

export const ROLL_POSE: Pose = {
  spine: [0.9, 0, 0],
  chest: [0.4, 0, 0],
  head: [0.5, 0, 0],
  hipL: [-1.6, 0, 0.1],
  hipR: [-1.5, 0, -0.1],
  kneeL: [2.0, 0, 0],
  kneeR: [2.0, 0, 0],
  shoulderL: [-1.4, 0, 0.3],
  shoulderR: [-1.4, 0, -0.3],
  elbowL: [-1.2, 0, 0],
  elbowR: [-1.2, 0, 0],
};

export const HIT_POSE: Pose = {
  spine: [-0.35, 0.2, 0],
  chest: [-0.2, 0, 0],
  head: [-0.4, 0, 0.2],
  shoulderL: [-0.4, 0, 0.7],
  shoulderR: [-0.6, 0, -0.7],
  elbowR: [-0.8, 0, 0],
  hipL: [-0.3, 0, 0],
  kneeL: [0.3, 0, 0],
  kneeR: [0.4, 0, 0],
  rootY: -0.06,
};

export const DEATH_KEYS: Array<[number, Pose]> = [
  [0, HIT_POSE],
  [0.35, { hipL: [-1.4, 0, 0.1], hipR: [-1.4, 0, -0.1], kneeL: [2.2, 0, 0], kneeR: [2.2, 0, 0], spine: [0.3, 0, 0], head: [0.4, 0, 0], shoulderL: [0.2, 0, 0.3], shoulderR: [0.2, 0, -0.3], rootY: -0.62 }],
  [1, { hipL: [-1.4, 0, 0.1], hipR: [-1.4, 0, -0.1], kneeL: [2.2, 0, 0], kneeR: [2.2, 0, 0], spine: [1.1, 0, 0], head: [0.6, 0, 0], shoulderL: [-0.6, 0, 0.4], shoulderR: [-0.6, 0, -0.4], rootY: -0.62, rootPitch: 0.6 }],
];

export const FLASK_POSE: Pose = {
  shoulderL: [-2.4, 0, 0.3],
  elbowL: [-1.9, 0, 0],
  head: [-0.45, 0, 0],
  spine: [-0.08, 0, 0],
  shoulderR: [-0.3, 0, -0.2],
  elbowR: [-0.6, 0, 0],
};

export const POSE_LIB = {} as Record<string, unknown>;

export const RIDE_POSE: Pose = {
  hipL: [-1.15, 0, 0.5],
  hipR: [-1.15, 0, -0.5],
  kneeL: [1.3, 0, 0],
  kneeR: [1.3, 0, 0],
  footL: [-0.2, 0, 0],
  footR: [-0.2, 0, 0],
  spine: [0.12, 0, 0],
  shoulderL: [-0.65, 0, 0.1],
  shoulderR: [-0.65, 0, -0.1],
  elbowL: [-0.85, 0, 0],
  elbowR: [-0.85, 0, 0],
};

export class Player {
  readonly group = new THREE.Group();
  readonly rig = buildKnight();
  readonly anim = new Animator(this.rig);
  readonly cloak: Cloth;
  readonly horse = new Horse();
  readonly pos: THREE.Vector3;
  readonly velocity = new THREE.Vector3();
  yaw = Math.PI;
  state: State = 'ride';
  hp = 100;
  maxHp = 100;
  stamina = 100;
  maxStamina = 100;
  flasks = 3;
  maxFlasks = 3;
  pathIndex = 0;
  lockTarget: Combatant | null = null;
  invulnerable = false;
  controlEnabled = true;
  horseSpeed = 0;
  private ikTarget = 1;
  private ikWeight = 1;
  private stateT = 0;
  private combo = 0;
  private attack: AttackDef = ATTACKS[0];
  private readonly hitThisSwing = new Set<Combatant>();
  private staminaDelay = 0;
  private phase = 0;
  private lastStepPhase = 0;
  private rollDir = new THREE.Vector3();
  private hitDir = new THREE.Vector3();
  private hitHeavy = false;
  private flaskHealed = false;
  private readonly scabbardHilt: THREE.Object3D;
  private readonly tmp = new THREE.Vector3();
  private readonly tmp2 = new THREE.Vector3();
  private readonly move = new THREE.Vector2();
  private readonly shadow: THREE.Mesh;
  private readonly horseShadow: THREE.Mesh;

  constructor(
    private readonly nav: Nav,
    private readonly bus: EventBus,
  ) {
    this.pos = this.group.position;
    this.group.add(this.rig.root);
    this.cloak = new Cloth(7, 11, 0.62, 1.42, this.rig.mats.cloak, this.rig.cloakAnchorL, this.rig.cloakAnchorR, 1.55);
    this.cloak.colliders.push(
      { obj: this.rig.j.chest, offset: new THREE.Vector3(0, 0.16, -0.02), r: 0.27 },
      { obj: this.rig.j.chest, offset: new THREE.Vector3(0, -0.05, -0.02), r: 0.26 },
      { obj: this.rig.j.hips, offset: new THREE.Vector3(0, -0.12, -0.02), r: 0.29 },
      { obj: this.rig.j.hipL, offset: new THREE.Vector3(0, -0.3, 0), r: 0.14 },
      { obj: this.rig.j.hipR, offset: new THREE.Vector3(0, -0.3, 0), r: 0.14 },
      { obj: this.rig.j.kneeL, offset: new THREE.Vector3(0, -0.15, 0), r: 0.11 },
      { obj: this.rig.j.kneeR, offset: new THREE.Vector3(0, -0.15, 0), r: 0.11 },
    );
    // Scabbard on the left hip (hilt shows when the sword is sheathed on horseback).
    const m = Mats();
    const hilt = new THREE.Group();
    this.scabbardHilt = hilt;
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4).rotateX(-Math.PI / 2), m.contactShadow);
    this.shadow.position.y = 0.03;
    this.group.add(this.shadow);
    this.horseShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.4).rotateX(-Math.PI / 2), m.contactShadow);
    this.horseShadow.position.y = 0.04;
    this.horse.root.add(this.horseShadow);
  }

  /** Rig root height that puts the knight's hips on the saddle (root is at the feet). */
  private saddleRootY(): number {
    const hip = this.rig.j.hips.position.y * this.rig.root.scale.y;
    return this.horse.body.position.y + this.horse.seat.position.y + 0.06 - hip;
  }

  get mounted(): boolean {
    return this.state === 'ride';
  }

  get forward(): THREE.Vector3 {
    return this.tmp2.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
  }

  mount(): void {
    this.state = 'ride';
    this.horse.root.position.copy(this.pos);
    this.horse.root.rotation.y = this.yaw;
    this.group.add(this.horse.root);
    this.horse.root.position.set(0, 0, 0);
    this.horse.root.rotation.set(0, 0, 0);
    this.rig.root.position.y = this.saddleRootY();
    this.rig.sword.visible = false;
    this.scabbardHilt.visible = true;
    this.anim.snap(RIDE_POSE);
    this.cloak.reset();
  }

  /** Leave the horse standing at its current place in `parent`. */
  dismount(parent: THREE.Object3D, side: THREE.Vector3): void {
    parent.add(this.horse.root);
    this.horse.root.position.copy(this.pos);
    this.horse.root.rotation.y = this.yaw;
    this.pos.addScaledVector(side, 1.6);
    this.rig.root.position.y = 0;
    this.state = 'free';
    this.rig.sword.visible = true;
    this.scabbardHilt.visible = false;
    this.horseSpeed = 0;
    this.cloak.reset();
  }

  respawn(pos: THREE.Vector3, yaw: number, index: number): void {
    if (this.horse.root.parent === this.group) this.horse.root.removeFromParent();
    this.pos.copy(pos);
    this.yaw = yaw;
    this.pathIndex = index;
    this.hp = this.maxHp;
    this.stamina = this.maxStamina;
    this.flasks = this.maxFlasks;
    this.state = 'free';
    this.stateT = 0;
    this.velocity.set(0, 0, 0);
    this.lockTarget = null;
    this.rig.root.position.y = 0;
    this.rig.body.rotation.set(0, 0, 0);
    this.rig.body.position.set(0, 0, 0);
    this.anim.snap(GUARD);
    this.rig.sword.visible = true;
    this.scabbardHilt.visible = false;
    this.cloak.reset();
  }

  private spend(cost: number): boolean {
    if (this.stamina <= 1) return false;
    this.stamina = Math.max(-10, this.stamina - cost);
    this.staminaDelay = 0.7;
    return true;
  }

  takeHit(hit: HitInfo): boolean {
    if (this.state === 'dead' || this.invulnerable) return false;
    if (this.state === 'roll' && this.stateT > 0.04 && this.stateT < 0.42) {
      this.bus.emit({ type: 'blocked-roll', pos: this.pos.clone() });
      return false;
    }
    if (this.state === 'ride') return false;
    this.hp -= hit.damage;
    this.hitDir.copy(this.pos).sub(hit.from).setY(0).normalize();
    this.hitHeavy = hit.heavy;
    this.bus.emit({ type: 'hit-player', pos: this.pos.clone().setY(this.pos.y + 1.2), damage: hit.damage, heavy: hit.heavy });
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'dead';
      this.stateT = 0;
      this.lockTarget = null;
      return true;
    }
    if (hit.noStagger) return true;
    // Hyper-armour during the heavy's strike frames.
    if (this.state === 'attack' && this.attack.heavy && this.stateT / this.attack.duration > 0.45 && this.stateT / this.attack.duration < 0.65 && !hit.heavy) return true;
    this.state = 'hit';
    this.stateT = 0;
    return true;
  }

  update(dt: number, time: number, input: Input, camYaw: number, enemies: Combatant[]): void {
    this.stateT += dt;
    input.readMove(this.move);
    if (!this.controlEnabled) this.move.set(0, 0);
    // Camera-relative intent.
    const fx = Math.sin(camYaw);
    const fz = Math.cos(camYaw);
    const wish = this.tmp.set(fx * this.move.y - fz * this.move.x, 0, fz * this.move.y + fx * this.move.x);
    // Note: right vector of camera yaw is (-cos, 0, sin) for our convention -> handled above.
    const wishLen = Math.min(1, this.move.length());

    if (this.state !== 'ride' && this.state !== 'dead') {
      this.staminaDelay -= dt;
      if (this.staminaDelay <= 0) this.stamina = Math.min(this.maxStamina, this.stamina + 38 * dt);
    }
    if (this.lockTarget && (!this.lockTarget.alive || this.lockTarget.pos.distanceTo(this.pos) > 26)) this.lockTarget = null;

    const ctl = this.controlEnabled;
    switch (this.state) {
      case 'ride':
        this.updateRide(dt, time, input, wish, wishLen);
        break;
      case 'free': {
        if (ctl && input.consume('lock')) this.toggleLock(enemies, camYaw);
        if (ctl && input.consume('roll') && this.spend(22)) {
          this.state = 'roll';
          this.stateT = 0;
          this.rollDir.copy(wishLen > 0.2 ? wish.normalize() : this.forward);
          this.yaw = Math.atan2(this.rollDir.x, this.rollDir.z);
          this.bus.emit({ type: 'roll', pos: this.pos.clone() });
          break;
        }
        if (ctl && input.consume('attack') && this.spend(ATTACKS[0].stamina)) {
          this.startAttack(ATTACKS[0], 0);
          break;
        }
        if (ctl && input.consume('heavy') && this.spend(HEAVY.stamina)) {
          this.startAttack(HEAVY, -1);
          break;
        }
        if (ctl && input.consume('flask') && this.flasks > 0) {
          this.flasks -= 1;
          this.state = 'flask';
          this.stateT = 0;
          this.flaskHealed = false;
          break;
        }
        const sprinting = input.sprintHeld() && wishLen > 0.3 && this.stamina > 2 && !this.lockTarget;
        const speed = wishLen * (sprinting ? 7.4 : wishLen > 0.6 ? 4.8 : 3.0) * (this.lockTarget ? 0.8 : 1);
        if (sprinting) {
          this.stamina -= 16 * dt;
          this.staminaDelay = 0.5;
        }
        const target = this.tmp2.copy(wish).normalize().multiplyScalar(speed);
        this.velocity.x = damp(this.velocity.x, target.x, 11, dt);
        this.velocity.z = damp(this.velocity.z, target.z, 11, dt);
        if (this.lockTarget) {
          const d = this.lockTarget.pos;
          this.yaw = dampAngle(this.yaw, Math.atan2(d.x - this.pos.x, d.z - this.pos.z), 12, dt);
        } else if (wishLen > 0.1) {
          this.yaw = dampAngle(this.yaw, Math.atan2(wish.x, wish.z), 12, dt);
        }
        const sp = Math.hypot(this.velocity.x, this.velocity.z);
        this.phase += sp * 2.3 * dt;
        this.footsteps(sp > 5.5);
        const guard = guardPose(time);
        let pose: Pose;
        if (sp > 0.2) {
          const loco = locomotion(this.phase, sp / 5, { armSwing: 0.2 });
          pose = { ...loco, shoulderR: guard.shoulderR, elbowR: guard.elbowR, handR: guard.handR, shoulderL: guard.shoulderL, elbowL: guard.elbowL };
          if (sp > 5.6) {
            // Sprint: sword carried low and back, body pitched forward.
            pose.shoulderR = [0.35, 0, -0.25];
            pose.elbowR = [-0.5, 0, 0];
            pose.handR = [1.0, 0, 0];
            pose.spine = [0.32, (loco.spine ?? [0, 0, 0])[1], 0];
          }
        } else pose = guard;
        if (this.lockTarget && sp > 0.2) {
          // Strafing: keep torso to the target.
          pose.chest = [0.05, 0, 0];
        }
        this.anim.apply(pose, dt, 12);
        this.ikTarget = sp > 5.6 ? 0 : 1;
        break;
      }
      case 'attack': {
        const a = this.attack;
        const k = this.stateT / a.duration;
        // Root-motion lunge during the windup→strike frames.
        const lungeK = k > 0.15 && k < a.active[1] ? 1 : 0;
        const fwd = this.forward;
        this.velocity.x = damp(this.velocity.x, fwd.x * a.lunge * lungeK, 14, dt);
        this.velocity.z = damp(this.velocity.z, fwd.z * a.lunge * lungeK, 14, dt);
        // Small aim correction in the windup.
        if (k < 0.3) {
          if (this.lockTarget) {
            const d = this.lockTarget.pos;
            this.yaw = dampAngle(this.yaw, Math.atan2(d.x - this.pos.x, d.z - this.pos.z), 10, dt);
          } else if (wishLen > 0.2) this.yaw = dampAngle(this.yaw, Math.atan2(wish.x, wish.z), 7, dt);
        }
        if (k >= a.active[0] && k <= a.active[1]) this.sweep(enemies, a);
        this.ikTarget = 1;
        this.anim.apply(track(a.keys, k), dt, a.heavy ? 18 : 22);
        // Chain / cancel windows.
        if (k > 0.6 && ctl) {
          if (this.combo >= 0 && this.combo < 2 && input.peek('attack')) {
            input.consume('attack');
            if (this.spend(ATTACKS[this.combo + 1].stamina)) {
              this.startAttack(ATTACKS[this.combo + 1], this.combo + 1);
              break;
            }
          }
          if (input.peek('roll') && this.stamina > 1) {
            this.state = 'free';
            break;
          }
          if (input.peek('heavy') && this.combo >= 0 && this.spend(HEAVY.stamina)) {
            input.consume('heavy');
            this.startAttack(HEAVY, -1);
            break;
          }
        }
        if (k >= 1) this.state = 'free';
        break;
      }
      case 'roll': {
        this.ikTarget = 0;
        const dur = 0.62;
        const k = this.stateT / dur;
        const sp = k < 0.7 ? 8.2 : 8.2 * (1 - (k - 0.7) / 0.3);
        this.velocity.set(this.rollDir.x * sp, 0, this.rollDir.z * sp);
        this.anim.apply(ROLL_POSE, dt, 30);
        const theta = clamp(k / 0.85, 0, 1) * Math.PI * 2;
        const c = 0.55;
        this.rig.body.rotation.x = theta;
        this.rig.body.position.set(0, c - c * Math.cos(theta), -c * Math.sin(theta));
        if (k >= 1) {
          this.rig.body.rotation.x = 0;
          this.rig.body.position.set(0, 0, 0);
          this.state = 'free';
        }
        break;
      }
      case 'hit': {
        this.ikTarget = 0;
        const dur = this.hitHeavy ? 0.85 : 0.42;
        const k = this.stateT / dur;
        const push = (1 - k) * (this.hitHeavy ? 5 : 2.5);
        this.velocity.set(this.hitDir.x * push, 0, this.hitDir.z * push);
        this.anim.apply(HIT_POSE, dt, 25);
        if (k >= 1) this.state = 'free';
        break;
      }
      case 'flask': {
        this.ikTarget = 0;
        const k = this.stateT / 1.1;
        this.velocity.multiplyScalar(Math.exp(-8 * dt));
        this.anim.apply(FLASK_POSE, dt, 12);
        if (k > 0.55 && !this.flaskHealed) {
          this.flaskHealed = true;
          this.hp = Math.min(this.maxHp, this.hp + 48);
          this.bus.emit({ type: 'flask', pos: this.pos.clone() });
        }
        if (k >= 1) this.state = 'free';
        break;
      }
      case 'dead': {
        this.ikTarget = 0;
        this.velocity.multiplyScalar(Math.exp(-6 * dt));
        this.anim.apply(track(DEATH_KEYS, Math.min(1, this.stateT / 1.6)), dt, 10);
        if (this.stateT > 2.4 && this.stateT - dt <= 2.4) this.bus.emit({ type: 'player-dead' });
        break;
      }
      case 'locked': {
        this.ikTarget = 1;
        this.velocity.multiplyScalar(Math.exp(-10 * dt));
        this.anim.apply(idle(time, { swordHeld: true }), dt, 8);
        break;
      }
    }

    if (this.state !== 'ride') {
      this.pos.x += this.velocity.x * dt;
      this.pos.z += this.velocity.z * dt;
      this.pathIndex = this.nav.resolve(this.pos, 0.45, this.pathIndex);
    }
    if (this.state === 'ride') this.ikTarget = 0;
    this.ikWeight = damp(this.ikWeight, this.ikTarget, this.ikTarget > this.ikWeight ? 10 : 18, dt);
    this.group.rotation.y = this.yaw;
    this.group.updateMatrixWorld(true);
    this.rig.secondary(dt, Math.hypot(this.velocity.x, this.velocity.z), this.ikWeight);
    this.cloak.wind.set(Math.sin(time * 0.3) * 1.2 + 0.8, 0, 0.6);
  }

  private updateRide(dt: number, time: number, input: Input, wish: THREE.Vector3, wishLen: number): void {
    const gallop = input.sprintHeld();
    const targetSpeed = wishLen > 0.1 ? wishLen * (gallop ? 17 : 8.5) : 0;
    this.horseSpeed = damp(this.horseSpeed, targetSpeed, targetSpeed > this.horseSpeed ? 1.4 : 2.5, dt);
    if (wishLen > 0.1) {
      const desired = Math.atan2(wish.x, wish.z);
      const diff = wrapAngle(desired - this.yaw);
      const maxTurn = (1.4 + (1 - Math.min(1, this.horseSpeed / 17)) * 1.4) * dt;
      this.yaw += clamp(diff, -maxTurn, maxTurn);
    }
    // Gentle road assist: lean toward the path tangent near the verges.
    const near = this.nav.path.samples[this.pathIndex];
    const lateral = (this.pos.x - near.pos.x) * near.right.x + (this.pos.z - near.pos.z) * near.right.z;
    if (Math.abs(lateral) > near.width * 0.3 && this.horseSpeed > 2) {
      const along = Math.atan2(near.tangent.x, near.tangent.z);
      this.yaw = dampAngle(this.yaw, along - Math.sign(lateral) * 0.15, 1.2, dt);
    }
    this.pos.x += Math.sin(this.yaw) * this.horseSpeed * dt;
    this.pos.z += Math.cos(this.yaw) * this.horseSpeed * dt;
    this.pathIndex = this.nav.resolve(this.pos, 0.9, this.pathIndex);
    this.velocity.set(Math.sin(this.yaw) * this.horseSpeed, 0, Math.cos(this.yaw) * this.horseSpeed);
    this.horse.update(dt, this.horseSpeed, time);
    // Rider follows the saddle with a little lag on the bounce.
    this.rig.root.position.y = damp(this.rig.root.position.y, this.saddleRootY(), 20, dt);
    const lean = Math.min(1, this.horseSpeed / 17);
    this.anim.apply({ ...RIDE_POSE, spine: [0.12 + lean * 0.3, 0, 0], head: [-0.2 * lean, 0, 0] }, dt, 10);
    const step = this.horseSpeed * 0.5;
    this.phase += dt * (1.6 + Math.min(1, this.horseSpeed / 16) * 2.6) * Math.PI * 2 * (this.horseSpeed > 0.3 ? 1 : 0);
    if (Math.floor(this.phase / Math.PI) !== Math.floor(this.lastStepPhase / Math.PI) && step > 0.2) {
      this.bus.emit({ type: 'hoof', pos: this.pos.clone() });
    }
    this.lastStepPhase = this.phase;
  }

  private footsteps(heavy: boolean): void {
    if (Math.floor(this.phase / Math.PI) !== Math.floor(this.lastStepPhase / Math.PI)) {
      this.bus.emit({ type: 'footstep', pos: this.pos.clone(), heavy });
    }
    this.lastStepPhase = this.phase;
  }

  private startAttack(def: AttackDef, combo: number): void {
    this.state = 'attack';
    this.stateT = 0;
    this.attack = def;
    this.combo = combo;
    this.hitThisSwing.clear();
    this.bus.emit({ type: 'swing', heavy: def.heavy, pos: this.pos.clone() });
  }

  private sweep(enemies: Combatant[], a: AttackDef): void {
    const fwd = this.forward;
    for (const e of enemies) {
      if (!e.alive || this.hitThisSwing.has(e)) continue;
      const dx = e.pos.x - this.pos.x;
      const dz = e.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > a.reach + e.radius) continue;
      const ang = Math.acos(clamp((dx * fwd.x + dz * fwd.z) / Math.max(0.001, d), -1, 1));
      if (ang > a.arc && d > e.radius + 0.4) continue;
      if (Math.abs(e.pos.y - this.pos.y) > 3) continue;
      this.hitThisSwing.add(e);
      e.takeHit({ damage: a.damage, poise: a.poise, from: this.pos.clone(), heavy: a.heavy });
    }
  }

  toggleLock(enemies: Combatant[], camYaw: number): void {
    if (this.lockTarget) {
      this.lockTarget = null;
      return;
    }
    let best: Combatant | null = null;
    let bestScore = Infinity;
    const cf = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = e.pos.distanceTo(this.pos);
      if (d > 22) continue;
      const dir = new THREE.Vector3().copy(e.pos).sub(this.pos).setY(0).normalize();
      const score = d * (2 - dir.dot(cf));
      if (score < bestScore) {
        bestScore = score;
        best = e;
      }
    }
    this.lockTarget = best;
  }

  /** Swing trail sampling helpers. */
  isSwinging(): boolean {
    if (this.state !== 'attack') return false;
    const k = this.stateT / this.attack.duration;
    return k > this.attack.active[0] - 0.12 && k < this.attack.active[1] + 0.08;
  }

  get attackHeavy(): boolean {
    return this.attack.heavy;
  }

  blendTo(pose: Pose, t: number): Pose {
    return mix(GUARD, pose, t);
  }
}
