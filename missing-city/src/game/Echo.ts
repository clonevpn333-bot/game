import * as THREE from 'three';
import { Actor, type CharName } from '../actors/Characters';
import { audio, type LoopHandle } from '../audio/AudioEngine';
import { G, damp } from '../render/Globals';
import type { World } from '../world/World';
import type { PhysicsWorld } from '../core/Physics';
import type { LightPool } from '../render/LightPool';

/** A translucent recording of someone from 2:17 AM, eleven years ago. */
export class Ghost {
  readonly actor: Actor;
  private seg = 0;
  private t = 0;
  done = false;
  /** visible only during Echoes (default) or always (scripted apparitions) */
  always = false;
  alpha = 0;
  constructor(name: CharName, readonly path: THREE.Vector3[], readonly speed = 1.3, readonly loop = true, readonly clip = 'walk', parent?: THREE.Object3D) {
    this.actor = new Actor(name, 'ghost');
    this.actor.root.position.copy(path[0]);
    if (path.length > 1) this.actor.root.rotation.y = Math.atan2(path[1].x - path[0].x, path[1].z - path[0].z);
    if (clip !== 'walk' && clip !== 'run') this.actor.setPose(clip, 0);
    parent?.add(this.actor.root);
  }

  update(dt: number, visible: number): void {
    this.alpha = damp(this.alpha, this.always ? 1 : visible, 6, dt);
    this.actor.root.visible = this.alpha > 0.02;
    if (!this.actor.root.visible) return;
    const mat = this.actor.mesh?.material as THREE.Material | undefined;
    if (mat) mat.opacity = this.alpha;
    if (this.path.length > 1 && !this.done && (this.clip === 'walk' || this.clip === 'run')) {
      const a = this.path[this.seg];
      const b = this.path[(this.seg + 1) % this.path.length];
      const len = a.distanceTo(b);
      this.t += (dt * this.speed) / Math.max(0.01, len);
      if (this.t >= 1) {
        this.t = 0;
        this.seg++;
        if (this.seg >= this.path.length - 1 && !this.loop) {
          this.done = true;
          this.actor.speed = 0;
        }
        if (this.loop) this.seg %= this.path.length;
      }
      const p = this.path[this.seg];
      const q = this.path[(this.seg + 1) % this.path.length];
      this.actor.root.position.lerpVectors(p, q, this.t);
      const yaw = Math.atan2(q.x - p.x, q.z - p.z);
      this.actor.root.rotation.y = yaw;
      this.actor.speed = this.done ? 0 : this.speed;
    }
    this.actor.update(dt);
  }

  dispose(): void {
    this.actor.dispose();
  }
}

export class EchoSystem {
  unlocked = false;
  active = false;
  /** visual blend 0..1 */
  t = 0;
  energy = 1;
  duration = 6;
  private remaining = 0;
  private forced = false;
  ghosts: Ghost[] = [];
  /** late game instability: chance of short involuntary echoes */
  instability = 0;
  private murmur: LoopHandle | null = null;
  private warned = false;
  onChange: ((active: boolean) => void) | null = null;
  lockout = false;
  private instT = 8;

  constructor(private physics: PhysicsWorld, private lights: LightPool) {}

  get ready(): boolean {
    return this.unlocked && !this.active && this.energy >= 0.999 && !this.lockout;
  }

  /** Player-initiated. */
  tryEnter(): boolean {
    if (!this.ready) return false;
    this.enter(this.duration);
    return true;
  }

  /** Scripted / involuntary echoes ignore energy. */
  enter(seconds: number, forced = false): void {
    if (this.active) {
      this.remaining = Math.max(this.remaining, seconds);
      return;
    }
    this.active = true;
    this.forced = forced;
    this.remaining = seconds;
    this.warned = false;
    audio.echoEnter();
    audio.setReverb(3.5, 0.6, 2);
    this.murmur = audio.crowdMurmur(0.12);
    this.onChange?.(true);
  }

  exit(): void {
    if (!this.active) return;
    this.active = false;
    if (!this.forced) this.energy = 0;
    audio.echoExit();
    this.murmur?.stop(0.4);
    this.murmur = null;
    this.onChange?.(false);
  }

  clearGhosts(): void {
    for (const g of this.ghosts) g.dispose();
    this.ghosts = [];
  }

  update(dt: number, world: World | null): void {
    if (this.active) {
      this.remaining -= dt;
      if (this.remaining < 1.6 && !this.warned) {
        this.warned = true;
        let n = 0;
        const id = window.setInterval(() => {
          audio.echoWarn();
          if (++n >= 3) clearInterval(id);
        }, 420);
      }
      if (this.remaining <= 0) this.exit();
    } else if (this.energy < 1) {
      this.energy = Math.min(1, this.energy + dt / 7);
    }
    // involuntary flickers late in the story
    if (this.instability > 0 && !this.active) {
      this.instT -= dt * this.instability;
      if (this.instT <= 0) {
        this.instT = 6 + Math.random() * 10;
        this.enter(0.6 + Math.random() * 1.2, true);
      }
    }
    // visual blend with a slight overshoot shimmer when ending
    const target = this.active ? 1 : 0;
    this.t = damp(this.t, target, this.active ? 5 : 7, dt);
    if (this.active && this.remaining < 1.6) this.t *= 0.92 + 0.08 * Math.sin(performance.now() * 0.04);
    G.uEcho.value = this.t;
    this.physics.echoActive = this.t > 0.5;
    this.lights.echo = this.t;
    if (world) {
      for (const e of world.echoObjects) e.obj.visible = e.layer === 'echo' ? this.t > 0.02 : this.t < 0.98;
    }
    for (const g of this.ghosts) g.update(dt, this.t);
  }

  reset(): void {
    this.active = false;
    this.t = 0;
    this.energy = 1;
    this.remaining = 0;
    this.murmur?.stop(0.2);
    this.murmur = null;
    G.uEcho.value = 0;
    this.physics.echoActive = false;
    this.instability = 0;
    this.lockout = false;
  }
}
