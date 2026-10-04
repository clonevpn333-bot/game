import * as THREE from 'three';
import { Blocky, Gen1Bot, type Look } from '../actors/Blocky';
import type { Collider, PhysicsWorld } from '../core/Physics';
import { audio } from '../audio/AudioEngine';
import { damp, dampAngle, angleDiff, clamp } from '../render/Globals';

export type CitizenMode = 'path' | 'idle' | 'goto' | 'follow' | 'hold' | 'flee' | 'scripted';

export interface CitizenOpts {
  name?: string;
  path?: THREE.Vector3[];
  loop?: boolean;
  speed?: number;
  /** stop briefly at path points */
  pause?: number;
  /** spoken when the player first comes close */
  greet?: string[];
  greetRadius?: number;
  /** face this yaw when idle */
  yaw?: number;
  idleGesture?: Parameters<Blocky['gesture']>[0];
  solid?: boolean;
}

const _v = new THREE.Vector3();

/** A Bellwether resident (or one of the team): a Blocky body with simple, readable behaviour. */
export class Citizen {
  readonly body: Blocky;
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  yaw = 0;
  faceYaw: number | null = null;
  mode: CitizenMode = 'idle';
  name: string;
  speed: number;
  path: THREE.Vector3[];
  loop: boolean;
  private pathIdx = 0;
  private pauseT = 0;
  private pauseAt: number;
  target = new THREE.Vector3();
  followOffset = new THREE.Vector3(1.2, 0, 1.4);
  arrived = true;
  greet: string[];
  greetRadius: number;
  greeted = false;
  lookAtPlayer = true;
  collider: Collider | null = null;
  removed = false;
  private blockedT = 0;
  private servoT = Math.random() * 3;
  onGreet: ((c: Citizen, line: string) => void) | null = null;

  constructor(look: Look, pos: THREE.Vector3, readonly phys: PhysicsWorld, o: CitizenOpts = {}) {
    this.body = new Blocky(look);
    this.pos.copy(pos);
    this.name = o.name ?? '';
    this.speed = o.speed ?? 1.25 + Math.random() * 0.3;
    this.path = o.path ?? [];
    this.loop = o.loop ?? true;
    this.pauseAt = o.pause ?? 0;
    this.greet = o.greet ?? [];
    this.greetRadius = o.greetRadius ?? 3.2;
    this.yaw = o.yaw ?? 0;
    this.faceYaw = o.yaw ?? null;
    if (this.path.length) {
      this.mode = 'path';
      // start at the nearest point of the route
      let best = 0;
      let bd = 1e9;
      this.path.forEach((p, i) => {
        const d = p.distanceToSquared(pos);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      this.pathIdx = (best + 1) % this.path.length;
    }
    if (o.idleGesture) this.body.gesture(o.idleGesture, 999, true);
    if (o.solid !== false) this.collider = phys.add({ cx: pos.x, cy: pos.y + 0.9, cz: pos.z, hx: 0.24, hy: 0.9, hz: 0.24, noVault: true, tag: 'citizen' });
    this.sync();
  }

  get head(): THREE.Vector3 {
    return this.body.head;
  }

  get chest(): THREE.Vector3 {
    return this.pos.clone().add(new THREE.Vector3(0, this.body.P.chestY, 0));
  }

  place(p: THREE.Vector3, yaw = this.yaw): void {
    this.pos.copy(p);
    this.yaw = yaw;
    this.faceYaw = yaw;
    this.vel.set(0, 0, 0);
    this.sync();
  }

  goto(p: THREE.Vector3, speed?: number): Promise<void> {
    this.mode = 'goto';
    this.target.copy(p);
    this.arrived = false;
    if (speed) this.speed = speed;
    return new Promise((res) => {
      const iv = window.setInterval(() => {
        if (this.arrived || this.removed || this.mode !== 'goto') {
          clearInterval(iv);
          res();
        }
      }, 60);
    });
  }

  follow(offset?: THREE.Vector3): void {
    this.mode = 'follow';
    if (offset) this.followOffset.copy(offset);
  }

  hold(yaw?: number): void {
    this.mode = 'hold';
    if (yaw !== undefined) this.faceYaw = yaw;
  }

  faceTowards(p: THREE.Vector3): void {
    this.faceYaw = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
  }

  update(dt: number, player: { pos: THREE.Vector3; camPos: THREE.Vector3 }, others: Citizen[]): void {
    const b = this.body;
    let want = new THREE.Vector3();
    let spd = 0;
    const toPlayer = _v.copy(player.pos).sub(this.pos);
    toPlayer.y = 0;
    const pd = toPlayer.length();
    switch (this.mode) {
      case 'path': {
        if (!this.path.length) break;
        if (this.pauseT > 0) {
          this.pauseT -= dt;
          break;
        }
        const tgt = this.path[this.pathIdx];
        const d = Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z);
        if (d < 0.45) {
          this.pathIdx++;
          if (this.pathIdx >= this.path.length) {
            if (this.loop) this.pathIdx = 0;
            else {
              this.mode = 'idle';
              this.pathIdx = this.path.length - 1;
            }
          }
          if (this.pauseAt) this.pauseT = this.pauseAt * (0.5 + Math.random());
          break;
        }
        want.set(tgt.x - this.pos.x, 0, tgt.z - this.pos.z).normalize();
        spd = this.speed;
        break;
      }
      case 'goto': {
        const d = Math.hypot(this.target.x - this.pos.x, this.target.z - this.pos.z);
        if (d < 0.35) {
          this.arrived = true;
          this.mode = 'hold';
          break;
        }
        want.set(this.target.x - this.pos.x, 0, this.target.z - this.pos.z).normalize();
        spd = d < 1.2 ? this.speed * Math.max(0.35, d / 1.2) : this.speed;
        break;
      }
      case 'follow': {
        // trail behind and to the side of the player
        const fx = -Math.sin((player as unknown as { yaw: number }).yaw ?? 0);
        const fz = -Math.cos((player as unknown as { yaw: number }).yaw ?? 0);
        const rx = -fz;
        const rz = fx;
        const tgt = new THREE.Vector3(
          player.pos.x - fx * this.followOffset.z + rx * this.followOffset.x,
          0,
          player.pos.z - fz * this.followOffset.z + rz * this.followOffset.x,
        );
        const d = Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z);
        if (pd > 28) {
          // teleport discreetly when left far behind
          this.pos.set(tgt.x, player.pos.y, tgt.z);
        } else if (d > 0.8) {
          want.set(tgt.x - this.pos.x, 0, tgt.z - this.pos.z).normalize();
          spd = clamp(d * 0.9, 0.8, 5.2);
        }
        break;
      }
      case 'flee': {
        want.copy(toPlayer).multiplyScalar(-1).normalize();
        spd = 4.2;
        break;
      }
      default:
        break;
    }
    // simple separation: give the player and others a little room
    if (spd > 0) {
      if (pd < 1.4 && pd > 0.01) {
        const away = toPlayer.clone().multiplyScalar(-1 / pd);
        const side = new THREE.Vector3(-want.z, 0, want.x);
        want.addScaledVector(side, Math.sign(side.dot(away)) * (1.4 - pd) * 1.6);
        if (toPlayer.dot(want) > 0 && pd < 0.9) {
          spd *= 0.2;
          this.blockedT += dt;
        }
      } else this.blockedT = Math.max(0, this.blockedT - dt);
      for (const o of others) {
        if (o === this) continue;
        const dx = this.pos.x - o.pos.x;
        const dz = this.pos.z - o.pos.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < 0.8 && d2 > 1e-4) {
          const d = Math.sqrt(d2);
          want.x += (dx / d) * (0.9 - d) * 1.2;
          want.z += (dz / d) * (0.9 - d) * 1.2;
        }
      }
      if (want.lengthSq() > 1e-4) want.normalize();
    }
    // move (team members collide with the world; street extras glide along authored paths)
    const targetVx = want.x * spd;
    const targetVz = want.z * spd;
    this.vel.x = damp(this.vel.x, targetVx, 6, dt);
    this.vel.z = damp(this.vel.z, targetVz, 6, dt);
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.mode === 'follow' || this.mode === 'goto' || this.mode === 'flee') {
      if (this.collider) this.collider.enabled = false;
      this.vel.y -= 16 * dt;
      this.phys.moveCapsule(this.pos, this.vel, dt, 0.26, 1.7, 0.42, true);
      if (this.collider) this.collider.enabled = true;
    } else {
      this.pos.x += this.vel.x * dt;
      this.pos.z += this.vel.z * dt;
    }
    // facing
    if (hs > 0.15) {
      const ty = Math.atan2(this.vel.x, this.vel.z);
      b.turn = angleDiff(this.yaw, ty) / Math.max(dt, 1e-3);
      this.yaw = dampAngle(this.yaw, ty, 8, dt);
    } else if (this.faceYaw !== null) {
      this.yaw = dampAngle(this.yaw, this.faceYaw, 5, dt);
      b.turn = 0;
    }
    b.speed = hs;
    // look at the player when close (people notice Elias)
    const notice = this.lookAtPlayer && pd < 6 && this.mode !== 'flee';
    b.lookTarget = notice ? player.camPos : null;
    if (!this.greeted && this.greet.length && pd < this.greetRadius) {
      this.greeted = true;
      this.onGreet?.(this, this.greet[Math.floor(Math.random() * this.greet.length)]);
    }
    // machines hum a little when they move
    if (b.look.gen === 'gen2' || b.look.gen === 'security') {
      this.servoT -= dt * (hs > 0.2 ? 2 : 0.4);
      if (this.servoT < 0 && pd < 12) {
        this.servoT = 1 + Math.random() * 2;
        audio.servo(this.chest, 0.025, Math.random() < 0.5);
      }
    }
    b.update(dt);
    this.sync();
  }

  private sync(): void {
    this.body.root.position.copy(this.pos);
    this.body.root.rotation.y = this.yaw;
    if (this.collider) {
      this.collider.cx = this.pos.x;
      this.collider.cy = this.pos.y + 0.9;
      this.collider.cz = this.pos.z;
    }
  }

  dispose(): void {
    this.removed = true;
    this.body.dispose();
    if (this.collider) this.phys.remove(this.collider);
  }
}

/** A Gen 1 maintenance machine trundling a route. */
export class Worker {
  readonly bot: Gen1Bot;
  readonly pos = new THREE.Vector3();
  yaw = 0;
  private idx = 0;
  private t = 0;
  collider: Collider;
  constructor(readonly path: THREE.Vector3[], readonly phys: PhysicsWorld, readonly speed = 0.8) {
    this.bot = new Gen1Bot({ gen: 'gen2', shell: '#e0a526' });
    this.pos.copy(path[0]);
    this.collider = phys.add({ cx: this.pos.x, cy: 0.8, cz: this.pos.z, hx: 0.6, hy: 0.8, hz: 0.6, noVault: true, tag: 'bot' });
  }
  update(dt: number, player: THREE.Vector3): void {
    this.t += dt;
    const tgt = this.path[this.idx];
    const d = Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z);
    const block = Math.hypot(player.x - this.pos.x, player.z - this.pos.z) < 2.2;
    if (d < 0.3) this.idx = (this.idx + 1) % this.path.length;
    else if (!block) {
      const ty = Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z);
      this.yaw = dampAngle(this.yaw, ty, 2, dt);
      if (Math.abs(angleDiff(this.yaw, ty)) < 0.3) {
        this.pos.x += Math.sin(this.yaw) * this.speed * dt;
        this.pos.z += Math.cos(this.yaw) * this.speed * dt;
      }
    }
    this.bot.speed = block ? 0 : this.speed;
    this.bot.lookTarget = block ? player.clone().add(new THREE.Vector3(0, 1.6, 0)) : null;
    this.bot.update(dt);
    this.bot.root.position.copy(this.pos);
    this.bot.root.rotation.y = this.yaw;
    this.collider.cx = this.pos.x;
    this.collider.cz = this.pos.z;
  }
  dispose(): void {
    this.bot.dispose();
    this.phys.remove(this.collider);
  }
}
