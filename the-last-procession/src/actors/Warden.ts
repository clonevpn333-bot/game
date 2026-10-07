import * as THREE from 'three';
import { Actor } from './Actor';
import type { Hero, WorldQuery } from './Hero';
import type { Audio } from '../engine/Audio';
import type { Particles } from '../fx/Particles';
import { distXZ } from '../util/math';

type WState = 'approach' | 'windup' | 'strike' | 'recover' | 'stagger' | 'dead' | 'idle';

/**
 * Bellwarden zealot. Readable melee: walk in → glowing visor + raised halberd
 * wind-up (0.65 s) → sweeping strike → long recovery (the punish window).
 * A shared token limits how many attack at once so fights stay fair.
 */
export class Warden {
  readonly char: Actor;
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  state: WState = 'approach';
  t = 0;
  hp = 3;
  lastHitId = -1;
  removed = false;
  deadT = 0;
  static attackTokens = 0;
  private hasToken = false;
  aggression = 1;
  active = true;

  constructor(private readonly audio: Audio, private readonly particles: Particles, look: 'warden' | 'guard' = 'warden') {
    this.char = new Actor(look);
    this.char.attachWeapon('halberd');
    this.char.turnSpeed = 7;
    this.char.setGlow(1.4);
  }

  get object(): THREE.Group {
    return this.char.root;
  }

  get alive(): boolean {
    return this.state !== 'dead';
  }

  spawn(p: THREE.Vector3, yaw: number): void {
    this.pos.copy(p);
    this.char.place(p, yaw);
    this.state = 'approach';
    this.hp = 3;
    this.t = Math.random() * 0.5;
    this.removed = false;
    this.char.mesh.visible = true;
    this.char.root.visible = true;
    this.char.setMode('idle', 0);
  }

  private releaseToken(): void {
    if (this.hasToken) {
      Warden.attackTokens--;
      this.hasToken = false;
    }
  }

  update(dt: number, hero: Hero, world: WorldQuery, maxAttackers = 1): void {
    if (this.removed) return;
    const c = this.char;
    this.t += dt;
    const toHero = hero.pos.clone().sub(this.pos).setY(0);
    const dist = toHero.length();
    const dir = dist > 0.001 ? toHero.clone().divideScalar(dist) : new THREE.Vector3(0, 0, 1);

    // sword hits
    const hb = hero.hitbox();
    if (hb && this.state !== 'dead' && hb.id !== this.lastHitId && hb.center.distanceTo(this.pos.clone().setY(this.pos.y + 1)) < hb.radius + 0.5) {
      this.lastHitId = hb.id;
      this.hp--;
      this.audio.sfx(this.state === 'windup' ? 'clang' : 'hit', 1, 0.9 + Math.random() * 0.2);
      this.particles.sparks(this.pos.clone().setY(this.pos.y + 1.2).addScaledVector(dir, -0.3));
      const kb = dir.clone().multiplyScalar(-6);
      this.vel.x = kb.x;
      this.vel.z = kb.z;
      this.releaseToken();
      if (this.hp <= 0) {
        this.state = 'dead';
        this.t = 0;
        c.setMode('dead', 0.12);
        this.vel.addScaledVector(dir, -6);
        this.audio.sfx('clang', 0.6, 0.7);
      } else {
        this.state = 'stagger';
        this.t = 0;
        c.setMode('hurt', 0.05);
      }
      hitStop.value = 0.06;
    }

    let speed = 0;
    switch (this.state) {
      case 'idle':
        c.setMode('idle');
        break;
      case 'approach': {
        c.targetYaw = Math.atan2(dir.x, dir.z);
        if (!this.active) {
          c.setMode('idle');
          break;
        }
        if (dist > 2.1) {
          speed = Math.min(4.4, dist) * this.aggression;
          c.setMode('locomotion');
        } else {
          c.setMode('idle');
          if (Warden.attackTokens < maxAttackers && this.t > 0.5) {
            Warden.attackTokens++;
            this.hasToken = true;
            this.state = 'windup';
            this.t = 0;
            c.setMode('raise', 0.2);
            this.audio.sfx('creak', 0.4, 2);
          }
        }
        break;
      }
      case 'windup': {
        c.targetYaw = Math.atan2(dir.x, dir.z);
        c.setGlow(1.4 + this.t * 6);
        if (this.t > 0.65) {
          this.state = 'strike';
          this.t = 0;
          c.attackVariant = 0;
          c.setMode('attack', 0.04);
          this.audio.sfx('swing', 1.2, 0.7);
        }
        break;
      }
      case 'strike': {
        c.setGlow(1.4);
        if (this.t > 0.08 && this.t < 0.2 && dist < 2.8) {
          const fwd = new THREE.Vector3(Math.sin(c.yaw), 0, Math.cos(c.yaw));
          if (fwd.dot(dir) > 0.2 && hero.damage(1, this.pos)) {
            this.particles.sparks(hero.pos.clone().setY(1.2), '#ff7a5a');
          }
        }
        if (this.t > 0.32) {
          this.state = 'recover';
          this.t = 0;
          c.setMode('idle', 0.2);
        }
        break;
      }
      case 'recover':
        if (this.t > 0.9) {
          this.releaseToken();
          this.state = 'approach';
          this.t = 0;
        }
        break;
      case 'stagger':
        if (this.t > 0.45) {
          this.state = 'approach';
          this.t = -0.2;
        }
        break;
      case 'dead':
        this.deadT += dt;
        if (this.t > 1.6) {
          this.char.root.position.y -= dt * 0.8;
          if (this.t > 3) {
            this.removed = true;
            this.char.root.visible = false;
          }
        }
        break;
    }

    const want = dir.clone().multiplyScalar(speed);
    this.vel.x += (want.x - this.vel.x) * Math.min(1, dt * 8);
    this.vel.z += (want.z - this.vel.z) * Math.min(1, dt * 8);
    this.pos.addScaledVector(this.vel, dt);
    if (this.state !== 'dead' && dist < 1.1) this.pos.addScaledVector(dir, -(1.1 - dist));
    world.collide(this.pos, 0.45);
    const gy = world.ground(this.pos.x, this.pos.z);
    this.pos.y = gy;
    c.speed = Math.hypot(this.vel.x, this.vel.z);
    if (this.state !== 'dead' || this.t < 1.6) c.root.position.copy(this.pos);
  }

  /** Environmental defeat (fell off the train, crushed by a gantry...). */
  kill(): void {
    if (this.state === 'dead') return;
    this.hp = 0;
    this.state = 'dead';
    this.t = 0;
    this.releaseToken();
    this.char.setMode('dead', 0.1);
  }

  separate(others: Warden[]): void {
    for (const o of others) {
      if (o === this || !o.alive || !this.alive) continue;
      const d = distXZ(this.pos, o.pos);
      if (d < 1.2 && d > 0.001) {
        const push = this.pos.clone().sub(o.pos).setY(0).normalize().multiplyScalar((1.2 - d) * 0.5);
        this.pos.add(push);
      }
    }
  }

  dispose(): void {
    this.releaseToken();
    this.char.dispose();
  }
}

/** Global hit-stop request (consumed by the game loop for impact feel). */
export const hitStop = { value: 0 };
