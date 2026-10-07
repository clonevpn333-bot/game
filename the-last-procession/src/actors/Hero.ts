import * as THREE from 'three';
import { Actor } from './Actor';
import type { Input } from '../engine/Input';
import type { Audio } from '../engine/Audio';
import type { Particles } from '../fx/Particles';
import { clamp, damp } from '../util/math';

export interface WorldQuery {
  ground(x: number, z: number): number;
  /** Push `p` out of solid geometry (xz only). */
  collide(p: THREE.Vector3, radius: number): void;
}

export interface HeroTuning {
  runSpeed: number;
  walkSpeed: number;
  accel: number;
  jumpVel: number;
  gravity: number;
}

/**
 * Kael on foot. Movement is relative to a "control basis" yaw supplied by the
 * set piece (the path in rail sequences, the camera in free exploration), so
 * camera cuts never flip what "forward" means mid-run. The body turns with a
 * critically damped yaw and banks into curves; landings, swings and rolls are
 * real animation states with anticipation and recovery.
 */
export class Hero {
  readonly char = new Actor('kael');
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  onGround = true;
  maxResolve = 4;
  resolve = 4;
  invuln = 0;
  private attackT = -1;
  private attackQueued = false;
  combo = 0;
  attackId = 0;
  private dodgeT = -1;
  private hurtT = -1;
  private readonly dodgeDir = new THREE.Vector3();
  private coyote = 0;
  private airT = 0;
  canAttack = true;
  canJump = true;
  canDodge = true;
  controllable = true;
  walkOnly = false;
  basisYaw: () => number = () => 0;
  tuning: HeroTuning = { runSpeed: 7.4, walkSpeed: 2.6, accel: 26, jumpVel: 9.2, gravity: 26 };
  autoForward = 0;
  readonly facing = new THREE.Vector3(0, 0, 1);
  onLand: (() => void) | null = null;
  private combatT = 0;
  groundY = 0;

  constructor(private readonly audio: Audio, private readonly particles: Particles) {
    this.char.attachWeapon('sword');
    this.char.turnSpeed = 10;
    this.char.onStep = () => {
      if (this.onGround) this.audio.sfx('step', 0.7, 0.9 + Math.random() * 0.3);
    };
  }

  get object(): THREE.Group {
    return this.char.root;
  }
  get dodging(): boolean {
    return this.dodgeT >= 0;
  }
  get attacking(): boolean {
    return this.attackT >= 0;
  }
  get hurting(): boolean {
    return this.hurtT >= 0;
  }

  reset(p: THREE.Vector3, yaw: number): void {
    this.pos.copy(p);
    this.vel.set(0, 0, 0);
    this.resolve = this.maxResolve;
    this.invuln = 0;
    this.attackT = this.dodgeT = this.hurtT = -1;
    this.char.place(p, yaw);
    this.char.setMode('idle', 0);
    this.facing.set(Math.sin(yaw), 0, Math.cos(yaw));
    this.onGround = true;
  }

  /** Active sword hitbox this frame (null outside the active frames). */
  hitbox(): { center: THREE.Vector3; radius: number; id: number } | null {
    if (this.attackT < 0) return null;
    const t = this.attackT;
    if (t < 0.1 || t > 0.27) return null;
    const c = this.pos.clone().addScaledVector(this.facing, 1.3);
    c.y += 1;
    return { center: c, radius: 1.45, id: this.attackId };
  }

  damage(amount: number, from: THREE.Vector3 | null): boolean {
    if (this.invuln > 0 || this.dodgeT >= 0 || this.resolve <= 0) return false;
    this.resolve = Math.max(0, this.resolve - amount);
    this.invuln = 1.1;
    this.hurtT = 0;
    this.attackT = -1;
    this.char.setMode('hurt', 0.05);
    this.char.express('angry');
    if (from) {
      const k = this.pos.clone().sub(from).setY(0).normalize().multiplyScalar(7);
      this.vel.x = k.x;
      this.vel.z = k.z;
    }
    this.audio.sfx('hurt');
    return true;
  }

  update(dt: number, input: Input, world: WorldQuery): void {
    const c = this.char;
    this.invuln = Math.max(0, this.invuln - dt);
    c.mesh.visible = this.invuln <= 0 || Math.floor(this.invuln * 16) % 2 === 0 || this.hurtT >= 0;

    const basis = this.basisYaw();
    const fwd = new THREE.Vector3(Math.sin(basis), 0, Math.cos(basis));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const mv = this.controllable ? input.move : new THREE.Vector2();
    const wish = new THREE.Vector3().addScaledVector(fwd, mv.y + this.autoForward).addScaledVector(right, mv.x);
    if (wish.lengthSq() > 1) wish.normalize();

    const ctrl = this.controllable;
    if (ctrl && this.canAttack && input.consume('attack')) {
      if (this.attackT < 0 && this.dodgeT < 0 && this.hurtT < 0) this.startAttack(wish);
      else if (this.attackT > 0.16) this.attackQueued = true;
    }
    if (ctrl && this.canDodge && input.consume('dodge') && this.dodgeT < 0 && this.hurtT < 0 && this.onGround) {
      this.dodgeT = 0;
      this.attackT = -1;
      this.dodgeDir.copy(wish.lengthSq() > 0.01 ? wish : this.facing).normalize();
      this.facing.copy(this.dodgeDir);
      c.yaw = c.targetYaw = Math.atan2(this.dodgeDir.x, this.dodgeDir.z);
      c.setMode('dodge', 0.06);
      this.audio.sfx('whoosh', 0.5);
      this.particles.impactDust(this.pos.clone().setY(this.pos.y + 0.2), 0.5);
    }
    if (ctrl && this.canJump && input.consume('jump') && (this.onGround || this.coyote > 0) && this.dodgeT < 0 && this.hurtT < 0) {
      this.vel.y = this.tuning.jumpVel;
      this.onGround = false;
      this.coyote = 0;
      this.attackT = -1;
      this.airT = 0;
      c.setMode('jump', 0.1);
      this.audio.sfx('jump');
    }

    const maxSpeed = this.walkOnly ? this.tuning.walkSpeed : this.tuning.runSpeed;
    let target = wish.clone().multiplyScalar(maxSpeed);
    if (this.attackT >= 0) target.multiplyScalar(0.15);
    if (this.hurtT >= 0) target.set(0, 0, 0);
    if (this.dodgeT >= 0) {
      const k = 1 - this.dodgeT / 0.55;
      target = this.dodgeDir.clone().multiplyScalar(11 * Math.max(0.3, k));
    }
    // accelerate smoothly; turning hard bleeds a little speed (feels weighty)
    const turnPenalty = wish.lengthSq() > 0.01 ? clamp(this.facing.dot(wish.clone().normalize()), 0.35, 1) : 1;
    target.multiplyScalar(this.dodgeT >= 0 ? 1 : 0.55 + 0.45 * turnPenalty);
    const a = this.onGround ? this.tuning.accel : this.tuning.accel * 0.45;
    const blend = damp(this.hurtT >= 0 ? 4 : a / Math.max(1, maxSpeed), dt);
    this.vel.x += (target.x - this.vel.x) * blend;
    this.vel.z += (target.z - this.vel.z) * blend;

    this.vel.y -= this.tuning.gravity * dt;
    this.pos.addScaledVector(this.vel, dt);
    world.collide(this.pos, 0.45);
    const gy = world.ground(this.pos.x, this.pos.z);
    this.groundY = gy;
    c.groundY = gy;
    if (this.pos.y <= gy) {
      if (!this.onGround && this.vel.y < -6) {
        this.audio.sfx('land', 0.7);
        this.particles.impactDust(this.pos.clone().setY(gy + 0.1), 0.4);
        c.anim.overlay('land', { mask: 'full', duration: 0.28, fade: 0.06 });
        this.onLand?.();
      }
      this.pos.y = gy;
      this.vel.y = 0;
      this.onGround = true;
      this.coyote = 0.12;
    } else if (this.pos.y > gy + 0.25) {
      if (this.onGround) this.coyote = 0.12;
      this.onGround = false;
      this.airT += dt;
    } else if (this.vel.y <= 0) {
      this.pos.y = gy;
      this.onGround = true;
    }
    this.coyote = Math.max(0, this.coyote - dt);

    // facing (gameplay) turns briskly; the body follows with damped yaw
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.attackT < 0 && this.dodgeT < 0 && this.hurtT < 0 && wish.lengthSq() > 0.02) {
      this.facing.lerp(wish.clone().normalize(), damp(12, dt)).normalize();
    }
    c.targetYaw = Math.atan2(this.facing.x, this.facing.z);

    // state timers
    if (this.attackT >= 0) {
      this.attackT += dt;
      if (this.attackT > 0.38) {
        if (this.attackQueued && this.combo < 3) this.startAttack(wish);
        else {
          this.attackT = -1;
          this.combo = 0;
        }
      }
    }
    if (this.dodgeT >= 0) {
      this.dodgeT += dt;
      if (this.dodgeT > 0.55) this.dodgeT = -1;
    }
    if (this.hurtT >= 0) {
      this.hurtT += dt;
      if (this.hurtT > 0.42) this.hurtT = -1;
    }
    if (this.attackT < 0 && this.dodgeT < 0 && this.hurtT < 0) {
      if (!this.onGround && this.airT > 0.08) c.setMode('jump', 0.15);
      else if (hs > 0.35) c.setMode('locomotion', 0.22);
      else c.setMode(this.combatT > 0 ? 'guard' : 'idle', 0.35);
    }
    // sword: drawn in fights, sheathed while exploring
    this.combatT = this.canAttack ? 4 : Math.max(0, this.combatT - dt);
    c.sheathe(this.combatT <= 0);
    c.anim.params.vy = this.vel.y;
    c.speed = hs;
    c.root.position.copy(this.pos);
  }

  private startAttack(wish: THREE.Vector3): void {
    if (wish.lengthSq() > 0.02) this.facing.copy(wish).normalize();
    this.char.yaw = this.char.targetYaw = Math.atan2(this.facing.x, this.facing.z);
    this.attackT = 0;
    this.attackQueued = false;
    this.attackId++;
    this.char.attackVariant = this.combo % 3;
    this.combo++;
    if (this.char.mode === 'attack') this.char.restartMode(0.06);
    else this.char.setMode('attack', 0.06);
    this.char.express('determined');
    this.audio.sfx('swing', 1, 0.9 + this.combo * 0.12);
    this.vel.addScaledVector(this.facing, 3);
  }

  get grounded(): boolean {
    return this.onGround && this.pos.y - this.groundY < 0.3;
  }

  clampSpeed(max: number): void {
    const h = Math.hypot(this.vel.x, this.vel.z);
    if (h > max) {
      this.vel.x *= max / h;
      this.vel.z *= max / h;
    }
  }

  get speed01(): number {
    return clamp(Math.hypot(this.vel.x, this.vel.z) / this.tuning.runSpeed, 0, 1);
  }
}
