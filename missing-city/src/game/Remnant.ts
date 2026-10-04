import * as THREE from 'three';
import { Actor } from '../actors/Characters';
import type { PhysicsWorld } from '../core/Physics';
import { audio } from '../audio/AudioEngine';
import { damp, dampAngle, angleDiff, G } from '../render/Globals';
import type { Effects } from '../render/Effects';

/**
 * Remnants: people whose consciousness partially escaped, trapped between moments.
 *  rusher   – charges aggressively
 *  watcher  – freezes while you look at it (or light it)
 *  crawler  – low and fast, comes along walls and floors
 *  echo     – only moves while an Echo is active
 *  mimic    – blind; hunts by sound, calls out in borrowed voices
 *  splitter – blinks between positions
 *  disguised– looks like a frozen citizen until you get close
 */
export type RemnantKind = 'rusher' | 'watcher' | 'crawler' | 'echo' | 'mimic' | 'splitter' | 'disguised';

export interface RemnantTarget {
  pos: THREE.Vector3;
  chest: THREE.Vector3;
  noiseLevel: number;
  hurt(amount: number, from?: THREE.Vector3): boolean;
  state: string;
}

export class Remnant {
  readonly actor: Actor;
  readonly pos = new THREE.Vector3();
  readonly vel = new THREE.Vector3();
  yaw = 0;
  health: number;
  state: 'idle' | 'alert' | 'chase' | 'attack' | 'stagger' | 'dead' | 'frozen' = 'idle';
  private stateT = 0;
  private attackHit = false;
  private blinkT = 3;
  private voiceT = 4;
  private stepAcc = 0;
  dead = false;
  removed = false;
  awareness = 0;
  hearing = 14;
  sight = 22;
  speed: number;
  private deathT = 0;
  revealed: boolean;

  constructor(readonly kind: RemnantKind, scene: THREE.Object3D, p: THREE.Vector3, yaw = 0, private fx?: Effects) {
    this.revealed = kind !== 'disguised';
    this.actor = new Actor(kind === 'disguised' ? 'civ_man' : 'remnant', kind === 'disguised' ? 'frozen' : 'remnant');
    scene.add(this.actor.root);
    this.pos.copy(p);
    this.yaw = yaw;
    this.health = kind === 'crawler' ? 55 : kind === 'rusher' ? 80 : kind === 'watcher' ? 140 : 90;
    this.speed = kind === 'rusher' ? 5.4 : kind === 'crawler' ? 4.6 : kind === 'watcher' ? 5.8 : kind === 'mimic' ? 4.2 : 4.2;
    if (kind === 'crawler') this.actor.setPose('rem_crawl', 0);
    if (kind === 'disguised') this.actor.setPose('idle', 0);
    this.actor.root.position.copy(p);
    this.actor.root.rotation.y = yaw;
    this.state = kind === 'mimic' ? 'idle' : 'alert';
    fx?.burst('shards', p.clone().add(new THREE.Vector3(0, 1, 0)), undefined, 30);
    audio.stutterClicks(p, 0.12, 12);
  }

  get chest(): THREE.Vector3 {
    return this.pos.clone().add(new THREE.Vector3(0, this.kind === 'crawler' ? 0.5 : 1.35, 0));
  }

  get headPos(): THREE.Vector3 {
    return this.pos.clone().add(new THREE.Vector3(0, this.kind === 'crawler' ? 0.6 : 1.72, 0));
  }

  /** Bullet hit test: returns damage multiplier (0 miss, 1 body, 2.5 head). */
  hitTest(origin: THREE.Vector3, dir: THREE.Vector3, maxDist: number): { dist: number; mult: number } | null {
    if (this.dead) return null;
    const test = (c: THREE.Vector3, r: number) => {
      const oc = c.clone().sub(origin);
      const t = oc.dot(dir);
      if (t < 0 || t > maxDist) return -1;
      const d2 = oc.lengthSq() - t * t;
      return d2 <= r * r ? t : -1;
    };
    const h = test(this.headPos, 0.17);
    if (h >= 0) return { dist: h, mult: 2.5 };
    const body = this.kind === 'crawler' ? [this.pos.clone().add(new THREE.Vector3(0, 0.45, 0))] : [this.pos.clone().add(new THREE.Vector3(0, 1.3, 0)), this.pos.clone().add(new THREE.Vector3(0, 0.85, 0)), this.pos.clone().add(new THREE.Vector3(0, 0.4, 0))];
    let best = -1;
    for (const b of body) {
      const t = test(b, 0.32);
      if (t >= 0 && (best < 0 || t < best)) best = t;
    }
    return best >= 0 ? { dist: best, mult: 1 } : null;
  }

  damage(amount: number, from: THREE.Vector3, stagger = false): void {
    if (this.dead) return;
    if (!this.revealed) this.reveal();
    this.health -= amount;
    this.awareness = 1;
    this.fx?.burst('shards', this.chest, from.clone().sub(this.chest).normalize(), 14);
    if (this.health <= 0) {
      this.die();
      return;
    }
    if (stagger || amount > 50) {
      this.state = 'stagger';
      this.stateT = 0;
      this.actor.play('rem_hit', { fade: 0.05 });
      const push = this.pos.clone().sub(from).setY(0).normalize().multiplyScalar(stagger ? 4 : 2);
      this.vel.add(push);
    } else if (this.state !== 'attack') this.state = 'chase';
    audio.screech(this.chest, 0.15, 1.3);
  }

  private reveal(): void {
    this.revealed = true;
    // swap to the true form
    const scene = this.actor.root.parent;
    this.actor.dispose();
    (this as { actor: Actor }).actor = new Actor('remnant', 'remnant');
    scene?.add(this.actor.root);
    this.fx?.burst('shards', this.chest, undefined, 40);
    audio.screech(this.chest, 0.4, 0.8);
    this.state = 'chase';
  }

  private die(): void {
    this.dead = true;
    this.state = 'dead';
    this.actor.setPose(null, 0.05);
    this.actor.play('rem_death', { hold: true, fade: 0.05 });
    audio.screech(this.chest, 0.25, 0.6);
    audio.stutterClicks(this.chest, 0.1, 8);
  }

  update(dt: number, phys: PhysicsWorld, target: RemnantTarget, ctx: { camPos: THREE.Vector3; camDir: THREE.Vector3; flashlightOn: boolean; echo: number }): void {
    if (this.dead) {
      this.deathT += dt;
      if (this.deathT > 1.6) {
        const s = Math.max(0, 1 - (this.deathT - 1.6) / 0.6);
        this.actor.root.scale.set(1 + (1 - s) * 0.6, s, 1 + (1 - s) * 0.6);
        if (this.deathT > 1.7 && this.deathT - dt <= 1.7) this.fx?.burst('shards', this.chest, undefined, 40);
        if (s <= 0) {
          this.removed = true;
          this.actor.dispose();
        }
      }
      this.actor.update(dt);
      return;
    }
    this.stateT += dt;
    const toP = target.pos.clone().sub(this.pos);
    const dist = toP.setY(0).length();
    const dirP = toP.clone().normalize();

    // perception
    if (this.kind === 'mimic') {
      if (target.noiseLevel > 0 && dist < target.noiseLevel * 1.6) this.awareness = Math.min(1, this.awareness + dt * 1.5);
      else if (dist < 1.6) this.awareness = 1;
      else this.awareness = Math.max(0, this.awareness - dt * 0.15);
      this.voiceT -= dt;
      if (this.voiceT <= 0) {
        this.voiceT = 5 + Math.random() * 6;
        const lines = ['eao', 'eiu', 'oaeo', 'ieea'];
        audio.voice(this.headPos, { pitch: 140 + Math.random() * 120, vowels: lines[Math.floor(Math.random() * lines.length)], dur: 1.1, vol: 0.18, distort: 0.4, stutter: 0.25 });
      }
    } else if (this.kind === 'disguised') {
      if (dist < 4.5) this.reveal();
      this.actor.update(dt);
      return;
    } else {
      this.awareness = 1;
    }

    // watcher: frozen when looked at
    let frozen = false;
    if (this.kind === 'watcher') {
      const toMe = this.chest.clone().sub(ctx.camPos);
      const d = toMe.length();
      toMe.normalize();
      const look = toMe.dot(ctx.camDir);
      const lit = ctx.flashlightOn ? 0.86 : 0.93;
      frozen = look > lit && d < 40 && phys.lineOfSight(ctx.camPos, this.chest);
    }
    if (this.kind === 'echo') frozen = ctx.echo < 0.5;
    if (frozen) {
      if (this.state !== 'frozen') {
        this.state = 'frozen';
        this.actor.timeScale = 0;
        audio.stutterClicks(this.chest, 0.08, 4);
      }
      this.vel.set(0, this.vel.y, 0);
    } else if (this.state === 'frozen') {
      this.state = 'chase';
      this.actor.timeScale = 1;
    }

    // splitter: blink to a new spot around the player
    if (this.kind === 'splitter' && this.state === 'chase') {
      this.blinkT -= dt;
      if (this.blinkT <= 0 && dist > 3) {
        this.blinkT = 2.2 + Math.random() * 2;
        const a = Math.random() * Math.PI * 2;
        const np = target.pos.clone().add(new THREE.Vector3(Math.cos(a) * 5, 0, Math.sin(a) * 5));
        if (!phys.overlaps(np, 0.35, 1.8, 0.2) && phys.lineOfSight(np.clone().setY(np.y + 1), target.chest)) {
          this.fx?.burst('shards', this.chest, undefined, 20);
          this.pos.copy(np);
          this.fx?.burst('shards', this.chest, undefined, 20);
          audio.stutterClicks(this.pos, 0.15, 10);
        }
      }
    }

    let wantSpeed = 0;
    switch (this.state) {
      case 'idle':
        if (this.awareness > 0.6) {
          this.state = 'chase';
          audio.screech(this.chest, 0.3, 1);
        }
        break;
      case 'alert':
        if (this.stateT > 0.6) {
          this.state = 'chase';
          if (this.kind !== 'echo') audio.screech(this.chest, 0.28, this.kind === 'crawler' ? 1.4 : 1);
        }
        this.yaw = dampAngle(this.yaw, Math.atan2(dirP.x, dirP.z), 6, dt);
        break;
      case 'chase':
        if (this.kind === 'mimic' && this.awareness < 0.2) {
          this.state = 'idle';
          break;
        }
        wantSpeed = this.speed * (this.kind === 'mimic' && this.awareness < 0.9 ? 0.5 : 1);
        this.yaw = dampAngle(this.yaw, Math.atan2(dirP.x, dirP.z), 7, dt);
        if (dist < (this.kind === 'crawler' ? 1.9 : 2.1) && target.state !== 'dead') {
          this.state = 'attack';
          this.stateT = 0;
          this.attackHit = false;
          if (this.kind !== 'crawler') this.actor.play('rem_lunge', { fade: 0.06 });
          audio.screech(this.chest, 0.35, 1.2);
          audio.growl(this.chest, 0.2);
        }
        break;
      case 'attack': {
        const t = this.stateT;
        this.yaw = dampAngle(this.yaw, Math.atan2(dirP.x, dirP.z), t < 0.45 ? 6 : 0.5, dt);
        if (t > 0.4 && t < 0.62) wantSpeed = 5.5;
        if (!this.attackHit && t > 0.55) {
          this.attackHit = true;
          const f = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
          if (dist < 2.3 && Math.abs(angleDiff(this.yaw, Math.atan2(dirP.x, dirP.z))) < 1.0) {
            target.hurt(this.kind === 'rusher' ? 24 : this.kind === 'watcher' ? 34 : 18, this.pos);
          }
          void f;
        }
        if (t > (this.kind === 'crawler' ? 0.8 : 1.1)) {
          this.state = 'chase';
          this.stateT = 0;
        }
        break;
      }
      case 'stagger':
        if (this.stateT > 0.5) this.state = 'chase';
        break;
    }
    const f = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    this.vel.x = damp(this.vel.x, f.x * wantSpeed, 6, dt);
    this.vel.z = damp(this.vel.z, f.z * wantSpeed, 6, dt);
    this.vel.y -= 22 * dt;
    phys.moveCapsule(this.pos, this.vel, dt, 0.35, this.kind === 'crawler' ? 0.9 : 1.8);
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.kind !== 'crawler') this.actor.speed = hs;
    else this.actor.timeScale = this.state === 'frozen' ? 0 : Math.max(0.3, hs / 3);
    if (hs > 1 && this.state !== 'frozen') {
      this.stepAcc += hs * dt;
      if (this.stepAcc > 1.2) {
        this.stepAcc = 0;
        audio.footstep('concrete', 0.5, this.pos);
        if (Math.random() < 0.3) audio.stutterClicks(this.pos, 0.05, 3);
      }
    }
    this.actor.root.position.copy(this.pos);
    this.actor.root.rotation.y = this.yaw;
    // slight time-smear jitter of the whole body
    if (Math.random() < 0.02 + G.uWarp.value * 0.05) this.actor.root.position.x += (Math.random() - 0.5) * 0.15;
    this.actor.update(dt);
  }
}
