import * as THREE from 'three';
import { Blocky, Gen1Bot, mulberry, type Look } from '../actors/Blocky';
import type { Collider, PhysicsWorld } from '../core/Physics';
import type { Effects } from '../render/Effects';
import { audio } from '../audio/AudioEngine';
import { clamp, damp, dampAngle, angleDiff } from '../render/Globals';

export type MachineKind = 'security' | 'maintenance' | 'discarded' | 'null';
export type MState = 'patrol' | 'idle' | 'suspicious' | 'alert' | 'windup' | 'charge' | 'stagger' | 'dead';

export interface MachineCtx {
  player: { pos: THREE.Vector3; camPos: THREE.Vector3; crouching: boolean; speed: number; flashlightOn: boolean; state: string; hurt: (d: number, from?: THREE.Vector3) => void; noiseLevel: number };
  phys: PhysicsWorld;
  fx: Effects;
  camera: THREE.Camera;
  /** stealth sections: units start unaware and must see you */
  stealth: boolean;
  others: Machine[];
}

const LOOKS: Record<Exclude<MachineKind, 'maintenance'>, (seed: number) => Look> = {
  security: () => ({ gen: 'security', light: '#ff3b3b' }),
  discarded: (seed) => ({ gen: 'discarded', seed, shell: ['#a59c8c', '#8c8a80', '#b0a490'][seed % 3] }),
  null: (seed) => ({ gen: 'null', seed }),
};

const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

export class Machine {
  readonly body: Blocky | null;
  readonly bot: Gen1Bot | null;
  readonly root: THREE.Object3D;
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  yaw = 0;
  health: number;
  readonly maxHealth: number;
  state: MState;
  patrol: THREE.Vector3[];
  private patrolIdx = 0;
  private pauseT = 0;
  /** detection 0..1 (stealth) */
  awareness = 0;
  lastSeen = new THREE.Vector3();
  private t = Math.random() * 10;
  private actT = 0;
  private shootCd = 1 + Math.random();
  private strafeDir = Math.random() < 0.5 ? -1 : 1;
  private strafeT = 0;
  private hitFlash = 0;
  private twitchT = 0;
  private chargeDir = new THREE.Vector3();
  private voiceT = 2 + Math.random() * 4;
  collider: Collider;
  removed = false;
  dead = false;
  deadT = 0;
  readonly radius: number;
  onDeath: ((m: Machine) => void) | null = null;

  constructor(readonly kind: MachineKind, pos: THREE.Vector3, yaw: number, readonly phys: PhysicsWorld, o: { patrol?: THREE.Vector3[]; seed?: number; aware?: boolean } = {}) {
    const seed = o.seed ?? Math.floor(Math.random() * 1000);
    if (kind === 'maintenance') {
      this.bot = new Gen1Bot({ gen: 'gen2', shell: '#e0a526', light: '#ffb347' });
      this.body = null;
      this.root = this.bot.root;
      this.radius = 0.7;
    } else {
      this.body = new Blocky(LOOKS[kind](seed));
      this.bot = null;
      this.root = this.body.root;
      this.radius = 0.3;
    }
    this.maxHealth = this.health = kind === 'maintenance' ? 260 : kind === 'security' ? 90 : kind === 'null' ? 70 : 55;
    this.pos.copy(pos);
    this.yaw = yaw;
    this.patrol = o.patrol ?? [];
    this.state = o.aware ? 'alert' : this.patrol.length ? 'patrol' : 'idle';
    if (o.aware) this.awareness = 1;
    this.collider = phys.add({ cx: pos.x, cy: pos.y + 0.9, cz: pos.z, hx: this.radius, hy: kind === 'maintenance' ? 0.8 : 0.9, hz: this.radius, noVault: true, noShoot: true, tag: 'machine' });
    this.sync();
  }

  get head(): THREE.Vector3 {
    if (this.bot) return this.pos.clone().add(new THREE.Vector3(0, 1.4, 0));
    return this.body!.head;
  }

  get chest(): THREE.Vector3 {
    return this.pos.clone().add(new THREE.Vector3(0, this.bot ? 0.9 : 1.25, 0));
  }

  get alerted(): boolean {
    return this.state === 'alert' || this.state === 'windup' || this.state === 'charge';
  }

  /** Ray vs. this machine's hit spheres. Returns distance and whether it was the weak spot. */
  /** a noise somewhere: come and look (does nothing if already hunting) */
  investigate(p: THREE.Vector3): void {
    if (this.dead || this.alerted) return;
    this.awareness = Math.max(this.awareness, 0.62);
    this.lastSeen.copy(p);
    this.state = 'suspicious';
  }

  hitTest(o: THREE.Vector3, d: THREE.Vector3, max: number): { dist: number; head: boolean; point: THREE.Vector3 } | null {
    if (this.dead) return null;
    const spheres: [THREE.Vector3, number, boolean][] = this.bot
      ? [[this.head, 0.24, true], [this.pos.clone().add(new THREE.Vector3(0, 1.0, 0)), 0.45, false], [this.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), 0.55, false]]
      : [[this.head, 0.17, true], [this.chest, 0.3, false], [this.pos.clone().add(new THREE.Vector3(0, 0.9, 0)), 0.28, false], [this.pos.clone().add(new THREE.Vector3(0, 0.45, 0)), 0.25, false]];
    let best: { dist: number; head: boolean; point: THREE.Vector3 } | null = null;
    for (const [c, r, head] of spheres) {
      _v.copy(c).sub(o);
      const tca = _v.dot(d);
      if (tca < 0) continue;
      const d2 = _v.lengthSq() - tca * tca;
      if (d2 > r * r) continue;
      const t = tca - Math.sqrt(r * r - d2);
      if (t > max) continue;
      if (!best || t < best.dist) best = { dist: t, head, point: o.clone().addScaledVector(d, t) };
    }
    return best;
  }

  damage(n: number, from: THREE.Vector3, fx?: Effects): void {
    if (this.dead) return;
    this.health -= n;
    this.hitFlash = 0.12;
    this.awareness = 1;
    this.lastSeen.copy(from);
    if (this.state !== 'charge') this.state = 'alert';
    fx?.burst('sparks', this.chest, from.clone().sub(this.chest).normalize(), 10);
    audio.impact('metal', this.chest, 0.6);
    if (this.body) {
      this.body.glitch(0.25);
      if (n > 30 || Math.random() < 0.3) {
        this.state = 'stagger';
        this.actT = 0.45;
        this.body.gesture('stagger', 0.5);
      }
    }
    if (this.health <= 0) this.die(fx);
  }

  private die(fx?: Effects): void {
    this.dead = true;
    this.state = 'dead';
    this.deadT = 0;
    this.phys.remove(this.collider);
    fx?.burst('sparks', this.chest, new THREE.Vector3(0, 1, 0), 40);
    fx?.burst('smoke', this.chest, new THREE.Vector3(0, 1, 0), 8);
    audio.servo(this.chest, 0.1, false);
    audio.glitchZap(this.chest, 0.15);
    audio.impact('thud', this.pos, 0.8);
    if (this.body) {
      this.body.mode = 'dead';
      this.body.glow = 0;
    }
    this.onDeath?.(this);
  }

  /** Can this unit see the player right now (cone + range + line of sight)? */
  private sees(ctx: MachineCtx): number {
    const p = ctx.player;
    if (p.state === 'dead') return 0;
    const eye = this.head;
    _v.copy(p.camPos).sub(eye);
    const dist = _v.length();
    let range = this.kind === 'security' ? 17 : this.kind === 'null' ? 13 : 11;
    if (p.crouching) range *= 0.6;
    if (p.flashlightOn) range *= 1.5;
    if (dist > range) return 0;
    const fwd = _w.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const flat = _v.clone().setY(0).normalize();
    const cos = flat.dot(fwd);
    const fov = this.state === 'patrol' || this.state === 'idle' ? 0.62 : 0.2;
    if (cos < fov && dist > 2.2) return 0;
    if (!ctx.phys.lineOfSight(eye, p.camPos)) return 0;
    return 1 - dist / range;
  }

  update(dt: number, ctx: MachineCtx): void {
    this.t += dt;
    if (this.dead) {
      this.deadT += dt;
      if (this.bot) {
        this.bot.root.rotation.z = damp(this.bot.root.rotation.z, 0.5, 3, dt);
        if (Math.random() < dt * 3) ctx.fx.burst('smoke', this.head, new THREE.Vector3(0, 1, 0), 1);
      }
      if (Math.random() < dt * 1.5 && this.deadT < 6) ctx.fx.burst('sparks', this.chest, new THREE.Vector3(0, 1, 0), 3);
      this.body?.update(dt);
      this.bot?.update(0);
      return;
    }
    const p = ctx.player;
    const toP = _v.copy(p.pos).sub(this.pos).setY(0);
    const dist = toP.length();
    const dirP = toP.clone().normalize();
    let want = new THREE.Vector3();
    let spd = 0;
    let face: number | null = null;
    this.hitFlash = Math.max(0, this.hitFlash - dt);

    // ---- perception
    const seen = this.sees(ctx);
    const heard = p.noiseLevel > 0 && dist < p.noiseLevel * (this.kind === 'null' ? 1.4 : 1);
    if (!ctx.stealth && this.state !== 'stagger' && !this.alerted && (seen > 0 || dist < 18)) this.awareness = 1;
    if (seen > 0) {
      this.awareness = Math.min(1, this.awareness + dt * (0.6 + seen * 2.2) * (this.state === 'suspicious' ? 1.6 : 1));
      this.lastSeen.copy(p.pos);
    } else if (heard) {
      this.awareness = Math.min(1, this.awareness + dt * 0.5);
      this.lastSeen.copy(p.pos);
    } else if (!this.alerted) this.awareness = Math.max(0, this.awareness - dt * 0.12);
    if (this.awareness >= 1 && !this.alerted && this.state !== 'stagger') {
      this.state = 'alert';
      if (this.kind === 'security') audio.voice(this.head, { pitch: 0.9, vowels: 'ao', dur: 0.6, vol: 0.1, distort: 0.5 });
      audio.glitchZap(this.head, 0.08);
    } else if (this.awareness > 0.3 && (this.state === 'patrol' || this.state === 'idle')) this.state = 'suspicious';
    else if (this.awareness < 0.1 && this.state === 'suspicious') this.state = this.patrol.length ? 'patrol' : 'idle';

    // ---- behaviour
    switch (this.state) {
      case 'patrol': {
        if (this.pauseT > 0) {
          this.pauseT -= dt;
          face = this.yaw + Math.sin(this.t * 0.7) * 0.02;
          break;
        }
        const tgt = this.patrol[this.patrolIdx];
        const d = Math.hypot(tgt.x - this.pos.x, tgt.z - this.pos.z);
        if (d < 0.4) {
          this.patrolIdx = (this.patrolIdx + 1) % this.patrol.length;
          this.pauseT = 1.5 + Math.random() * 2;
        } else {
          want.set(tgt.x - this.pos.x, 0, tgt.z - this.pos.z).normalize();
          spd = this.kind === 'security' ? 1.2 : 1.0;
        }
        break;
      }
      case 'idle':
        face = this.yaw;
        break;
      case 'suspicious': {
        face = Math.atan2(this.lastSeen.x - this.pos.x, this.lastSeen.z - this.pos.z);
        const d = this.lastSeen.distanceTo(this.pos);
        if (this.awareness > 0.6 && d > 2) {
          want.copy(this.lastSeen).sub(this.pos).setY(0).normalize();
          spd = 0.9;
        }
        break;
      }
      case 'stagger':
        this.actT -= dt;
        if (this.actT <= 0) this.state = 'alert';
        break;
      case 'alert':
        this.combat(dt, ctx, dist, dirP, (w, s) => {
          want = w;
          spd = s;
        });
        face = Math.atan2(dirP.x, dirP.z);
        break;
      case 'windup':
        this.actT -= dt;
        face = Math.atan2(dirP.x, dirP.z);
        if (this.actT <= 0) {
          this.state = 'charge';
          this.actT = 0.65;
          this.chargeDir.copy(dirP);
          audio.whoosh(this.chest, 0.5);
        }
        break;
      case 'charge': {
        this.actT -= dt;
        want.copy(this.chargeDir);
        spd = 7;
        if (dist < 1.7 && this.actT > 0.05) {
          p.hurt(30, this.pos);
          audio.impact('melee', p.pos, 1.2);
          this.actT = 0;
        }
        if (this.actT <= 0) this.state = 'alert';
        break;
      }
    }
    // separation from other machines
    for (const o of ctx.others) {
      if (o === this || o.dead) continue;
      const dx = this.pos.x - o.pos.x;
      const dz = this.pos.z - o.pos.z;
      const d2 = dx * dx + dz * dz;
      const r = this.radius + o.radius + 0.3;
      if (d2 < r * r && d2 > 1e-4) {
        const d = Math.sqrt(d2);
        want.x += (dx / d) * 0.8;
        want.z += (dz / d) * 0.8;
      }
    }
    // twitchy gait for the Discarded
    if (this.kind === 'discarded') {
      this.twitchT -= dt;
      if (this.twitchT < 0) {
        this.twitchT = 0.3 + Math.random() * 0.9;
        if (Math.random() < 0.35) spd *= 0.1;
      }
      this.voiceT -= dt;
      if (this.voiceT < 0 && dist < 16) {
        this.voiceT = 3 + Math.random() * 5;
        audio.voice(this.head, { pitch: 0.7 + Math.random() * 0.8, vowels: 'oaei', dur: 0.8, vol: 0.07, distort: 0.6, stutter: 0.6 });
      }
    }
    // move with collision
    this.vel.x = damp(this.vel.x, want.x * spd, 8, dt);
    this.vel.z = damp(this.vel.z, want.z * spd, 8, dt);
    this.vel.y -= 16 * dt;
    this.collider.enabled = false;
    this.phys.moveCapsule(this.pos, this.vel, dt, this.radius, this.kind === 'maintenance' ? 1.5 : 1.75, 0.42, true);
    this.collider.enabled = true;
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (hs > 0.2 && this.state !== 'alert') face = Math.atan2(this.vel.x, this.vel.z);
    if (face !== null) this.yaw = dampAngle(this.yaw, face, this.kind === 'null' ? 10 : 6, dt);
    // animate
    if (this.body) {
      const b = this.body;
      b.speed = hs;
      b.lookTarget = this.alerted || this.state === 'suspicious' ? p.camPos : null;
      b.mode = this.kind === 'discarded' && this.t % 7 < 0.4 ? 'stiff' : 'idle';
      b.glow = this.alerted ? 0.6 + 0.4 * Math.sin(this.t * 8) : this.state === 'suspicious' ? 0.4 : 0;
      if (this.kind === 'security' && this.alerted && b.speed < 1.5) b.setHold('aim');
      else b.setHold(null);
      b.update(dt);
    }
    if (this.bot) {
      this.bot.speed = hs;
      this.bot.lookTarget = this.alerted ? p.camPos : null;
      this.bot.update(dt);
    }
    this.sync();
  }

  private combat(dt: number, ctx: MachineCtx, dist: number, dirP: THREE.Vector3, move: (w: THREE.Vector3, s: number) => void): void {
    const p = ctx.player;
    switch (this.kind) {
      case 'security': {
        // keep a working distance, strafe, shoot in bursts
        this.strafeT -= dt;
        if (this.strafeT < 0) {
          this.strafeT = 1.2 + Math.random() * 1.6;
          this.strafeDir *= -1;
        }
        const side = new THREE.Vector3(-dirP.z, 0, dirP.x).multiplyScalar(this.strafeDir);
        const w = dist > 13 ? dirP.clone() : dist < 6 ? dirP.clone().multiplyScalar(-1) : new THREE.Vector3();
        w.add(side.multiplyScalar(0.7)).normalize();
        move(w, dist < 2 ? 0 : 1.6);
        this.shootCd -= dt;
        if (dist < 1.8 && this.shootCd < 0.6) {
          this.shootCd = 1.4;
          this.body?.gesture('swing', 0.5);
          window.setTimeout(() => {
            if (!this.dead && this.pos.distanceTo(p.pos) < 2.2) {
              p.hurt(15, this.pos);
              audio.impact('melee', p.pos, 1);
            }
          }, 260);
        } else if (this.shootCd < 0 && dist < 26) {
          const muzzle = this.chest.clone().add(new THREE.Vector3(0, 0.15, 0)).addScaledVector(dirP, 0.5);
          if (ctx.phys.lineOfSight(muzzle, p.camPos)) {
            this.shootCd = 1.4 + Math.random() * 1.1;
            const hitChance = clamp(0.75 - dist * 0.025 - p.speed * 0.06 - (p.crouching ? 0.1 : 0), 0.12, 0.8);
            const hit = Math.random() < hitChance;
            const aim = p.camPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * (hit ? 0.2 : 1.6), -0.25 + (Math.random() - 0.5) * (hit ? 0.2 : 1.0), (Math.random() - 0.5) * (hit ? 0.2 : 1.6)));
            ctx.fx.muzzle(muzzle, aim.clone().sub(muzzle).normalize(), ctx.camera);
            ctx.fx.tracer(muzzle, aim, ctx.camera);
            audio.gunshot(muzzle, 0.6);
            if (hit) p.hurt(9 + Math.random() * 4, muzzle);
            else ctx.fx.burst('sparks', aim, undefined, 4);
          } else this.shootCd = 0.4;
        }
        break;
      }
      case 'maintenance': {
        move(dirP.clone(), dist > 3 ? 1.6 : 0);
        this.shootCd -= dt;
        if (dist < 7 && this.shootCd < 0) {
          this.shootCd = 3.2;
          this.state = 'windup';
          this.actT = 0.85;
          audio.servo(this.chest, 0.14, true);
          audio.growl(this.chest, 0.15);
        }
        break;
      }
      case 'discarded':
      case 'null': {
        const fast = this.kind === 'null' ? 4.6 : 2.4 + Math.sin(this.t * 3) * 0.8;
        move(dirP.clone(), dist > 1.1 ? fast : 0);
        this.shootCd -= dt;
        if (dist < 1.4 && this.shootCd < 0) {
          this.shootCd = this.kind === 'null' ? 0.9 : 1.3;
          this.body?.gesture('swing', 0.45);
          window.setTimeout(() => {
            if (!this.dead && this.pos.distanceTo(p.pos) < 1.8) {
              p.hurt(this.kind === 'null' ? 18 : 13, this.pos);
              audio.impact('melee', p.pos, 0.9);
            }
          }, 220);
        }
        break;
      }
    }
  }

  private sync(): void {
    this.root.position.copy(this.pos);
    this.root.rotation.y = this.yaw;
    this.collider.cx = this.pos.x;
    this.collider.cy = this.pos.y + (this.bot ? 0.8 : 0.9);
    this.collider.cz = this.pos.z;
  }

  dispose(): void {
    this.removed = true;
    this.body?.dispose();
    this.bot?.dispose();
    if (!this.dead) this.phys.remove(this.collider);
  }
}

export { mulberry, angleDiff };
