import * as THREE from 'three';
import { clamp, damp, dampAngle, lerp, smoothstep } from '../core/math';
import type { Input } from '../core/Input';
import { Body, PhysicsWorld, Surface } from '../world/Physics';
import { Rig } from './Rig';
import { ActionName, Animator } from './Animator';

export interface PlayerEvents {
  footstep(surface: Surface, strength: number): void;
  jump(): void;
  land(speed: number, surface: Surface): void;
  mantle(): void;
  vault(): void;
  attack(origin: THREE.Vector3, dir: THREE.Vector3): void;
  pulse(origin: THREE.Vector3): void;
  hurt(): void;
}

export const TUNING = {
  walk: 3.0,
  run: 6.2,
  sprint: 9.0,
  crouch: 2.1,
  accelGround: 38,
  accelAir: 11,
  decelGround: 30,
  jumpV: 8.6,
  coyote: 0.13,
  jumpBuffer: 0.16,
  turnRate: 14,
};

/** Ori: the courier. Owns body, rig, animator, and the action state machine. */
export class Player {
  readonly body = new Body();
  readonly rig: Rig;
  readonly anim: Animator;
  facing = 0;
  crouch = false;
  sprinting = false;
  action: ActionName = 'none';
  actionT = 0;
  private actionDur = 0;
  private actionFired = false;
  private mantleFrom = new THREE.Vector3();
  private mantleTo = new THREE.Vector3();
  private mantleTop = 0;
  private coyote = 0;
  private buffer = 0;
  private jumpCut = false;
  private stepAcc = 0;
  private lastPhase = 0;
  private attackCd = 0;
  pulseCd = 0;
  invuln = 0;
  /** Gameplay locks (dialogue, cutscenes). */
  frozen = false;
  /** Allowed by story (pulse unlocked once Ori has a parcel). */
  canPulse = true;
  canAttack = true;
  dread = 0;
  speedMul = 1;
  private turnRate = 0;
  readonly events: PlayerEvents;
  private readonly tmp = new THREE.Vector3();
  private readonly fwd = new THREE.Vector3();
  private readonly right = new THREE.Vector3();
  private readonly wish = new THREE.Vector3();
  /** External scripted movement target (cutscenes). */
  autoWalk: { to: THREE.Vector3; speed: number; done?: () => void } | null = null;

  constructor(events: PlayerEvents) {
    this.events = events;
    this.rig = new Rig({
      scale: 1,
      headSize: 0.27,
      skin: '#ffdcc8',
      top: '#3e47a6',
      topAccent: '#ffcf6b',
      bottom: '#2a2d5c',
      shoes: '#fff0e4',
      hair: '#6a4296',
      hat: 'courier',
      hatColor: '#4b58c8',
      face: 'ori',
      scarf: '#ffc74d',
      bag: true,
    });
    this.anim = new Animator(this.rig);
  }

  get pos(): THREE.Vector3 {
    return this.body.pos;
  }

  teleport(p: THREE.Vector3, facing?: number): void {
    this.body.pos.copy(p);
    this.body.vel.set(0, 0, 0);
    this.body.grounded = false;
    this.body.ghost = false;
    if (facing !== undefined) this.facing = facing;
    this.action = 'none';
    this.autoWalk = null;
    this.rig.root.position.copy(p);
    this.rig.root.rotation.y = this.facing;
    this.rig.resetSecondary();
  }

  startAction(a: ActionName, dur: number): void {
    this.action = a;
    this.actionT = 0;
    this.actionDur = dur;
    this.actionFired = false;
  }

  hurt(from: THREE.Vector3, strength = 1): boolean {
    if (this.invuln > 0) return false;
    this.invuln = 1.1;
    const away = this.tmp.subVectors(this.body.pos, from).setY(0).normalize();
    this.body.vel.x = away.x * 7 * strength;
    this.body.vel.z = away.z * 7 * strength;
    this.body.vel.y = 4.5;
    this.body.grounded = false;
    this.body.ghost = false;
    this.startAction('hurt', 0.45);
    this.rig.expression = 'scared';
    this.events.hurt();
    return true;
  }

  update(dt: number, input: Input, camFwd: THREE.Vector3, physics: PhysicsWorld): void {
    const b = this.body;
    this.attackCd -= dt;
    this.pulseCd -= dt;
    this.invuln -= dt;

    // ---- input → wish direction ----
    this.fwd.copy(camFwd).setY(0).normalize();
    this.right.set(-this.fwd.z, 0, this.fwd.x);
    this.wish.set(0, 0, 0);
    let mag = 0;
    if (!this.frozen && this.action !== 'mantle' && this.action !== 'vault') {
      this.wish.addScaledVector(this.fwd, input.move.y).addScaledVector(this.right, input.move.x);
      mag = Math.min(1, input.move.length());
      if (this.wish.lengthSq() > 1e-4) this.wish.normalize();
    }
    if (this.autoWalk) {
      const d = this.tmp.subVectors(this.autoWalk.to, b.pos).setY(0);
      if (d.length() < 0.25) {
        const done = this.autoWalk.done;
        this.autoWalk = null;
        done?.();
      } else {
        this.wish.copy(d.normalize());
        mag = this.autoWalk.speed / TUNING.run;
      }
    }

    if (!this.frozen && input.consume('crouch')) this.crouch = !this.crouch;
    this.sprinting = !this.frozen && input.sprint && mag > 0.3 && !this.crouch;
    if (this.sprinting) this.crouch = false;

    let target = mag < 0.55 && !this.sprinting ? lerp(0, TUNING.walk, mag / 0.55) : lerp(TUNING.walk, TUNING.run, smoothstep(0.55, 0.95, mag));
    if (this.sprinting) target = TUNING.sprint;
    if (this.crouch) target = TUNING.crouch * Math.min(1, mag * 1.4);
    if (b.inWater) target *= b.waterDepth > 0.5 ? 0.55 : 0.78;
    target *= this.speedMul;
    if (this.autoWalk) target = this.autoWalk.speed;

    // ---- actions in progress ----
    if (this.action !== 'none') {
      this.actionT += dt / this.actionDur;
      const k = this.actionT;
      if (this.action === 'mantle') {
        b.ghost = true;
        b.vel.set(0, 0, 0);
        const up = smoothstep(0, 0.6, k);
        const over = smoothstep(0.45, 1, k);
        b.pos.x = lerp(this.mantleFrom.x, this.mantleTo.x, over);
        b.pos.z = lerp(this.mantleFrom.z, this.mantleTo.z, over);
        b.pos.y = lerp(this.mantleFrom.y, this.mantleTop, up);
      } else if (this.action === 'vault') {
        b.ghost = true;
        const arc = Math.sin(Math.PI * clamp(k, 0, 1));
        b.pos.x = lerp(this.mantleFrom.x, this.mantleTo.x, k);
        b.pos.z = lerp(this.mantleFrom.z, this.mantleTo.z, k);
        b.pos.y = lerp(this.mantleFrom.y, Math.max(this.mantleTo.y, this.mantleFrom.y), k) + arc * (this.mantleTop - this.mantleFrom.y + 0.15);
      } else if (this.action === 'attack' && !this.actionFired && k > 0.32) {
        this.actionFired = true;
        const o = b.pos.clone();
        o.y += 0.9;
        this.events.attack(o, new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing)));
      } else if (this.action === 'pulse' && !this.actionFired && k > 0.38) {
        this.actionFired = true;
        const o = b.pos.clone();
        o.y += 1.0;
        this.events.pulse(o);
      }
      if (k >= 1) {
        if (this.action === 'mantle' || this.action === 'vault') {
          b.ghost = false;
          b.grounded = false;
          b.pos.y = this.action === 'mantle' ? this.mantleTop + 0.02 : b.pos.y;
          if (this.action === 'vault') {
            b.vel.x = Math.sin(this.facing) * TUNING.run;
            b.vel.z = Math.cos(this.facing) * TUNING.run;
          }
        }
        this.action = 'none';
      }
    }

    const locked = this.action === 'mantle' || this.action === 'vault';

    if (!locked) {
      // ---- horizontal velocity ----
      const accel = b.grounded ? (mag > 0.01 ? TUNING.accelGround : TUNING.decelGround) : TUNING.accelAir;
      const tvx = this.wish.x * target;
      const tvz = this.wish.z * target;
      const hurtLock = this.action === 'hurt' ? 0.15 : 1;
      b.vel.x = moveToward(b.vel.x, tvx, accel * dt * hurtLock);
      b.vel.z = moveToward(b.vel.z, tvz, accel * dt * hurtLock);

      // ---- facing ----
      const prevFacing = this.facing;
      if (mag > 0.05 && this.action !== 'attack') {
        const want = Math.atan2(this.wish.x, this.wish.z);
        this.facing = dampAngle(this.facing, want, b.grounded ? TUNING.turnRate : TUNING.turnRate * 0.5, dt);
      }
      this.turnRate = damp(this.turnRate, clamp(((this.facing - prevFacing + Math.PI * 3) % (Math.PI * 2) - Math.PI) / Math.max(dt, 1e-4) / 6, -1, 1), 10, dt);

      // ---- jump ----
      if (b.grounded) this.coyote = TUNING.coyote;
      else this.coyote -= dt;
      if (!this.frozen && input.consume('jump')) this.buffer = TUNING.jumpBuffer;
      else this.buffer -= dt;

      const fwdDir = this.tmp.set(Math.sin(this.facing), 0, Math.cos(this.facing));
      // Mantle from ground: jump facing a tall ledge
      if (this.buffer > 0 && b.grounded && mag > 0.2) {
        const ledge = physics.findLedge(b, fwdDir, 1.1, 2.45);
        if (ledge) {
          this.beginMantle(ledge.top, ledge.x, ledge.z);
          this.buffer = 0;
        }
      }
      if (this.action !== 'mantle' && this.buffer > 0 && this.coyote > 0) {
        b.vel.y = TUNING.jumpV * (this.crouch ? 0.85 : 1);
        b.grounded = false;
        this.coyote = 0;
        this.buffer = 0;
        this.jumpCut = false;
        this.crouch = false;
        this.rig.stretch(1.14);
        this.events.jump();
      }
      if (!b.grounded && b.vel.y > 0 && !input.jumpHeld && !this.jumpCut) {
        b.vel.y *= 0.55;
        this.jumpCut = true;
      }
      // Air mantle: grab ledges while airborne and pushing forward
      if (!b.grounded && mag > 0.3 && b.vel.y < 4 && this.action === 'none') {
        const ledge = physics.findLedge(b, fwdDir, 0.25, 1.9);
        if (ledge) this.beginMantle(ledge.top, ledge.x, ledge.z);
      }
      // Vault: running into a low obstacle
      if (b.grounded && this.action === 'none' && Math.hypot(b.vel.x, b.vel.z) > 4.2 && mag > 0.5 && b.hitWall) {
        const v = physics.findVault(b, fwdDir);
        if (v) {
          this.mantleFrom.copy(b.pos);
          this.mantleTo.copy(v.land);
          this.mantleTop = v.top + 0.1;
          this.startAction('vault', 0.48);
          this.events.vault();
        }
      }

      // ---- combat / pulse ----
      if (!this.frozen && this.canAttack && input.consume('attack') && this.attackCd <= 0 && this.action === 'none') {
        this.startAction('attack', 0.42);
        this.attackCd = 0.5;
      }
      if (!this.frozen && this.canPulse && input.consume('pulse') && this.pulseCd <= 0 && this.action === 'none') {
        this.startAction('pulse', 0.65);
        this.pulseCd = 1.1;
      }

      physics.step(b, dt);
      if (b.landed) {
        const s = clamp(b.landSpeed / 14, 0, 1);
        this.rig.stretch(1 - 0.08 - s * 0.14);
        this.events.land(b.landSpeed, b.ground?.surface ?? 'stone');
      }
    }

    // ---- footsteps from the walk phase ----
    const hs = Math.hypot(b.vel.x, b.vel.z);
    if (b.grounded && hs > 0.5) {
      const ph = Math.floor(this.anim.phase / Math.PI);
      if (ph !== this.lastPhase) {
        this.lastPhase = ph;
        this.events.footstep(b.inWater ? 'water' : b.ground?.surface ?? 'stone', clamp(hs / TUNING.sprint, 0.2, 1) * (this.crouch ? 0.35 : 1));
      }
    }
    this.stepAcc += hs * dt;

    // ---- visuals ----
    this.rig.root.position.copy(b.pos);
    this.rig.root.rotation.y = this.facing;
    this.anim.update(dt, {
      speed: locked ? 0 : hs,
      grounded: b.grounded || locked,
      vy: b.vel.y,
      crouch: this.crouch,
      sprint: this.sprinting,
      action: this.action,
      actionT: clamp(this.actionT, 0, 1),
      dread: this.dread,
      inWater: b.inWater,
      turn: this.turnRate,
    });
    // invulnerability flicker
    this.rig.setVisible(!(this.invuln > 0 && Math.floor(this.invuln * 14) % 2 === 0 && this.invuln < 0.9));
  }

  private beginMantle(top: number, x: number, z: number): void {
    this.mantleFrom.copy(this.body.pos);
    this.mantleTo.set(x, top, z);
    this.mantleTop = top;
    const rise = top - this.body.pos.y;
    this.startAction('mantle', 0.42 + clamp(rise, 0, 2.4) * 0.12);
    this.body.vel.set(0, 0, 0);
    this.crouch = false;
    this.events.mantle();
  }

  /** Post-physics visual update (rig springs). */
  lateUpdate(dt: number, time: number): void {
    this.rig.update(dt, time);
  }
}

function moveToward(v: number, t: number, maxDelta: number): number {
  if (Math.abs(t - v) <= maxDelta) return t;
  return v + Math.sign(t - v) * maxDelta;
}
