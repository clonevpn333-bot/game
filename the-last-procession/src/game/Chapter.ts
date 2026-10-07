import * as THREE from 'three';
import type { Game } from './Game';
import type { CamMode } from './CameraDirector';
import { Character } from '../actors/Character';
import { Hero, type WorldQuery } from '../actors/Hero';
import { Warden } from '../actors/Warden';
import type { Mood } from '../core/Audio';
import { PALETTES } from '../render/Sky';
import { clamp, damp, distXZ } from '../utils/math';

export class Aborted extends Error {
  constructor() {
    super('aborted');
  }
}

interface Waiter {
  check: () => boolean;
  resolve: () => void;
  reject: (e: Error) => void;
}

export type SegmentResult = 'win' | 'fail' | void;

export interface Circle {
  x: number;
  z: number;
  r: number;
}
export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/**
 * A chapter is one reel of the film: it builds its set, then runs an async script
 * that interleaves cutscene beats and playable segments. Every awaitable helper
 * checks an abort flag so chapter-select / retries can tear a reel down cleanly.
 */
export abstract class Chapter implements WorldQuery {
  abstract readonly id: string;
  abstract readonly num: string;
  abstract readonly title: string;
  abstract readonly subtitle: string;
  abstract readonly checkpoints: string[];
  readonly group = new THREE.Group();
  hero!: Hero;
  lyra!: Character;
  readonly wardens: Warden[] = [];
  protected waiters: Waiter[] = [];
  aborted = false;
  time = 0;
  colliders: Circle[] = [];
  solids: Rect[] = [];
  bounds: Rect | null = null;
  frame: ((dt: number) => void) | null = null; // per-frame segment logic
  lyraFollow = false;
  lyraFollowOffset = new THREE.Vector3(1.4, 0, -1.6);
  /** Focus point for the sun's shadow frustum. */
  readonly focus = new THREE.Vector3();
  heroActive = false;
  lastCheckpoint = '';
  readyFlag = '';

  constructor(protected readonly g: Game) {}

  // ----------------------------------------------------------------- lifecycle
  abstract build(): void;
  abstract script(from: string): Promise<void>;
  tick(_dt: number): void {}

  mount(): void {
    this.g.scene.add(this.group);
    this.hero = new Hero(this.g.audio, this.g.particles);
    this.lyra = new Character('lyra');
    this.group.add(this.hero.object, this.lyra.root);
    this.hero.object.visible = false;
    this.lyra.root.visible = false;
    Warden.attackTokens = 0;
    this.build();
  }

  dispose(): void {
    this.abort();
    for (const w of this.wardens) w.dispose();
    this.group.removeFromParent();
    this.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && m.geometry) m.geometry.dispose();
    });
  }

  abort(): void {
    this.aborted = true;
    const ws = this.waiters;
    this.waiters = [];
    for (const w of ws) w.reject(new Aborted());
  }

  update(dt: number): void {
    this.time += dt;
    this.frame?.(dt);
    if (this.heroActive) this.hero.update(dt, this.g.input, this);
    if (this.lyraFollow) this.followLyra(dt);
    this.lyra.update(dt, this.time);
    this.hero.char.update(dt, this.time);
    for (const w of this.wardens) w.char.update(dt, this.time);
    this.tick(dt);
    if (this.heroActive || this.hero.object.visible) this.focus.copy(this.hero.pos);
    // resolve waiters
    if (this.waiters.length) {
      const list = this.waiters;
      this.waiters = [];
      for (const w of list) {
        if (w.check()) w.resolve();
        else this.waiters.push(w);
      }
    }
  }

  // ----------------------------------------------------------------- world query
  ground(_x: number, _z: number): number {
    return 0;
  }

  collide(p: THREE.Vector3, r: number): void {
    for (const c of this.colliders) {
      const dx = p.x - c.x;
      const dz = p.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + r;
      if (d < min && d > 1e-4) {
        p.x = c.x + (dx / d) * min;
        p.z = c.z + (dz / d) * min;
      }
    }
    for (const b of this.solids) {
      if (p.x > b.x0 - r && p.x < b.x1 + r && p.z > b.z0 - r && p.z < b.z1 + r) {
        const pushes = [b.x0 - r - p.x, b.x1 + r - p.x, b.z0 - r - p.z, b.z1 + r - p.z];
        const abs = pushes.map(Math.abs);
        const i = abs.indexOf(Math.min(...abs));
        if (i < 2) p.x += pushes[i];
        else p.z += pushes[i];
      }
    }
    if (this.bounds) {
      p.x = clamp(p.x, this.bounds.x0, this.bounds.x1);
      p.z = clamp(p.z, this.bounds.z0, this.bounds.z1);
    }
  }

  // ----------------------------------------------------------------- script helpers
  protected check(): void {
    if (this.aborted) throw new Aborted();
  }

  until(cond: () => boolean): Promise<void> {
    this.check();
    if (cond()) return Promise.resolve();
    return new Promise((resolve, reject) => this.waiters.push({ check: cond, resolve, reject }));
  }

  wait(seconds: number): Promise<void> {
    const end = this.time + seconds;
    return this.until(() => this.time >= end);
  }

  /** True if this checkpoint should run when starting from `from`. */
  reached(from: string, name: string): boolean {
    const a = this.checkpoints.indexOf(from);
    const b = this.checkpoints.indexOf(name);
    return b >= Math.max(0, a);
  }

  protected checkpoint(name: string): void {
    this.lastCheckpoint = name;
    this.g.log(`checkpoint ${this.id}/${name}`);
    this.g.onCheckpoint(this, name);
  }

  cut(mode: CamMode, blend = 0, label = ''): void {
    this.g.cam.set(mode, blend, label);
  }

  music(m: Mood): void {
    this.g.audio.setMusic(m);
  }

  sky(name: keyof typeof PALETTES, blend = 0): void {
    this.g.sky.setPalette(PALETTES[name], blend);
  }

  cinematic(on: boolean): void {
    this.g.setCinematic(on);
  }

  /**
   * Subtitle line with retro voice babble. Auto-advances after a reading time;
   * the advance input completes typing, then skips.
   */
  async say(speaker: string, text: string, opts: { actor?: Character | null; hold?: number; wait?: boolean } = {}): Promise<void> {
    this.check();
    const ui = this.g.ui;
    const input = this.g.input;
    const actor = opts.actor === undefined ? this.speakerActor(speaker) : opts.actor;
    const plain = text.replace(/<[^>]+>/g, '');
    const typeTime = plain.length * 0.028;
    const readTime = opts.hold ?? Math.max(1.8, 1.1 + plain.length * 0.055);
    input.consume('advance');
    let t = 0;
    let typed = 0;
    let done = false;
    let skipped = false;
    let lastBlip = 0;
    await new Promise<void>((resolve, reject) => {
      const w: Waiter = {
        check: () => {
          const rdt = this.g.realDt;
          t += rdt;
          const adv = input.consume('advance');
          if (!done) {
            typed = Math.min(plain.length, Math.floor((t / typeTime) * plain.length));
            if (adv) typed = plain.length;
            if (typed >= plain.length) {
              done = true;
              t = 0;
            }
            if (t - lastBlip > 0.075 && !done) {
              lastBlip = t;
              if (plain[typed] && plain[typed] !== ' ') this.g.audio.voiceBlip(speaker);
            }
            if (actor) actor.say(0.2);
            ui.subtitle(speaker, done ? text : this.partial(text, typed), done);
            return false;
          }
          if (adv) skipped = true;
          return skipped || (opts.wait !== true && t >= readTime);
        },
        resolve,
        reject,
      };
      this.waiters.push(w);
    });
    ui.subtitle(null);
    void skipped;
  }

  /** Run a beat in parallel; swallow the abort if the reel is torn down mid-beat. */
  go(p: Promise<unknown>): void {
    p.catch((e) => {
      if (!(e instanceof Aborted)) console.error(e);
    });
  }

  /** Fire-and-forget line during gameplay (safe if the reel is aborted). */
  bark(speaker: string, text: string, hold = 2.6): void {
    this.say(speaker, text, { hold }).catch(() => {});
  }

  private partial(html: string, n: number): string {
    // reveal n visible characters while keeping simple tags intact
    let out = '';
    let count = 0;
    for (let i = 0; i < html.length; i++) {
      const ch = html[i];
      if (ch === '<') {
        const end = html.indexOf('>', i);
        out += html.slice(i, end + 1);
        i = end;
        continue;
      }
      if (count >= n) break;
      out += ch;
      count++;
    }
    return out + '<span style="opacity:0">' + html.replace(/<[^>]+>/g, '').slice(n) + '</span>';
  }

  protected speakerActor(speaker: string): Character | null {
    if (speaker === 'KAEL') return this.hero.char;
    if (speaker === 'LYRA') return this.lyra;
    return null;
  }

  async choose(options: string[]): Promise<number> {
    this.check();
    const ui = this.g.ui;
    const input = this.g.input;
    let picked = -1;
    ui.choices(options, (i) => (picked = i));
    this.g.audio.sfx('ui', 1, 1.2);
    await this.until(() => {
      if (input.consume('choice1')) picked = 0;
      if (input.consume('choice2') && options.length > 1) picked = 1;
      if (input.consume('choice3') && options.length > 2) picked = 2;
      return picked >= 0;
    });
    ui.choices(null);
    this.g.audio.sfx('confirm');
    return picked;
  }

  async card(num: string, name: string, sub: string, hold = 3.2): Promise<void> {
    this.g.ui.chapterCard(num, name, sub);
    this.g.audio.sfx('bell', 0.5, 1.5);
    await this.wait(hold);
    this.g.ui.chapterCard(null);
  }

  async caption(text: string, hold = 3.5): Promise<void> {
    this.g.ui.caption(text);
    await this.wait(hold);
    this.g.ui.caption(null);
    await this.wait(1);
  }

  /** Fades run on game time so slow-motion, pause and the QA simulator stay in sync. */
  async fadeOut(s = 1): Promise<void> {
    this.check();
    void this.g.ui.fade(1, s);
    await this.wait(s);
  }

  async fadeIn(s = 1): Promise<void> {
    this.check();
    void this.g.ui.fade(0, s);
    await this.wait(s);
  }

  /**
   * A playable segment. `setup` must fully (re)stage the segment so a failure can
   * restart it instantly; `step` returns 'win' or 'fail'.
   */
  async segment(name: string, setup: () => void, step: (dt: number) => SegmentResult, opts: { resolve?: boolean; onFoot?: boolean } = {}): Promise<void> {
    this.check();
    this.checkpoint(name);
    const st: { result: SegmentResult } = { result: undefined };
    const run = () => {
      st.result = undefined;
      this.hero.resolve = this.hero.maxResolve;
      setup();
      this.cinematic(false);
      this.heroActive = opts.onFoot !== false;
      this.g.input.enabled = true;
      this.g.ui.resolve(opts.resolve === false ? null : this.hero.resolve, this.hero.maxResolve);
      this.frame = (dt) => {
        if (st.result) return;
        const r = step(dt);
        if (opts.resolve !== false) this.g.ui.resolve(this.hero.resolve, this.hero.maxResolve);
        if (r) st.result = r;
        else if (opts.resolve !== false && this.hero.resolve <= 0) st.result = 'fail';
      };
    };
    run();
    this.readyFlag = name;
    const t0 = this.time;
    let minResolve = this.hero.resolve;
    for (;;) {
      await this.until(() => {
        minResolve = Math.min(minResolve, this.hero.resolve);
        return !!st.result;
      });
      if (st.result === 'win') {
        this.g.log(`win ${this.id}/${name} in ${(this.time - t0).toFixed(1)}s, lowest resolve ${minResolve}/${this.hero.maxResolve}`);
        break;
      }
      // failure: brief slow-mo, overlay, fade, restage
      this.g.failCount++;
      this.g.log(`fail ${this.id}/${name}`);
      this.frame = null;
      this.g.input.enabled = false;
      this.g.timeScale = 0.3;
      this.g.ui.showScreen(this.g.ui.failEl, true);
      this.g.audio.sfx('boom', 0.4);
      await this.wait(0.55);
      await this.fadeOut(0.5);
      this.g.timeScale = 1;
      this.g.ui.showScreen(this.g.ui.failEl, false);
      this.clearWardens();
      run();
      await this.wait(0.15);
      await this.fadeIn(0.6);
    }
    this.frame = null;
    this.g.ui.clearGameplay();
  }

  protected clearWardens(): void {
    for (const w of this.wardens) w.dispose();
    this.wardens.length = 0;
    Warden.attackTokens = 0;
  }

  protected spawnWarden(p: THREE.Vector3, yaw = 0, look: 'warden' | 'guard' = 'warden'): Warden {
    const w = new Warden(this.g.audio, this.g.particles, look);
    w.spawn(p, yaw);
    this.group.add(w.object);
    this.wardens.push(w);
    return w;
  }

  protected updateWardens(dt: number, maxAttackers = 1): number {
    let alive = 0;
    for (const w of this.wardens) {
      w.update(dt, this.hero, this, maxAttackers);
      w.separate(this.wardens);
      if (w.alive) alive++;
    }
    return alive;
  }

  /** Lyra trails Kael at an offset in his local frame, running to keep up. */
  protected followLyra(dt: number): void {
    const h = this.hero;
    const yaw = Math.atan2(h.facing.x, h.facing.z);
    const off = this.lyraFollowOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    const target = h.pos.clone().add(off);
    const lp = this.lyra.root.position;
    const d = distXZ(lp, target);
    if (d > 25) {
      lp.copy(target);
      this.lyra.place(target);
    }
    const dir = target.clone().sub(lp).setY(0);
    const speed = d > 0.6 ? Math.min(8.2, d * 2.6) : 0;
    if (d > 0.05) dir.normalize();
    lp.addScaledVector(dir, speed * dt);
    const p = lp.clone();
    this.collide(p, 0.35);
    lp.x = p.x;
    lp.z = p.z;
    const gy = this.ground(lp.x, lp.z);
    lp.y += (gy + Math.max(0, h.pos.y - h.char.groundY) * 0.6 - lp.y) * damp(12, dt);
    this.lyra.groundY = gy;
    this.lyra.speed = speed;
    if (speed > 0.4) {
      this.lyra.targetYaw = Math.atan2(dir.x, dir.z);
      this.lyra.setMode('locomotion');
    } else {
      this.lyra.targetYaw = yaw;
      this.lyra.setMode('idle', 0.3);
    }
  }

  /** Place both leads for a cutscene. */
  protected stage(kael: THREE.Vector3 | null, kaelYaw: number, lyra: THREE.Vector3 | null, lyraYaw: number): void {
    this.heroActive = false;
    this.lyraFollow = false;
    if (kael) {
      this.hero.reset(kael, kaelYaw);
      this.hero.object.visible = true;
    }
    if (lyra) {
      this.lyra.place(lyra, lyraYaw);
      this.lyra.root.visible = true;
    }
  }

  /** Drive a 0..1 parameter over `seconds` of game time. */
  async animate(seconds: number, fn: (k: number) => void): Promise<void> {
    const t0 = this.time;
    await this.until(() => {
      const k = clamp((this.time - t0) / seconds, 0, 1);
      fn(k);
      return k >= 1;
    });
  }

  /** White-out flash that decays (post grade). */
  async flash(strength: number, seconds: number): Promise<void> {
    const u = this.g.pipeline.grade.uniforms.uFlash;
    await this.animate(seconds, (k) => (u.value = strength * (1 - k) * (1 - k)));
  }

  /** Walk a character to a point over time (cutscene blocking). */
  async walkTo(c: Character, to: THREE.Vector3, speed = 1.6): Promise<void> {
    const from = c.root.position.clone();
    const dist = distXZ(from, to);
    const dir = to.clone().sub(from).setY(0).normalize();
    c.targetYaw = Math.atan2(dir.x, dir.z);
    c.setMode('locomotion');
    c.speed = speed;
    const start = this.time;
    const dur = dist / speed;
    await this.until(() => {
      const k = clamp((this.time - start) / dur, 0, 1);
      c.root.position.lerpVectors(from, to, k);
      c.root.position.y = this.ground(c.root.position.x, c.root.position.z);
      c.speed = speed;
      return k >= 1;
    });
    c.setMode('idle', 0.3);
    c.speed = 0;
    if (c === this.hero.char) this.hero.pos.copy(c.root.position);
  }
}
