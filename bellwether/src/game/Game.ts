import * as THREE from 'three';
import { Engine } from '../core/Engine';
import { reportError } from '../core/Report';
import { Input } from '../core/Input';
import { PhysicsWorld } from '../core/Physics';
import { audio } from '../audio/AudioEngine';
import { G, R, damp } from '../render/Globals';
import { Sky } from '../render/Sky';
import { Rain } from '../render/Rain';
import { LightPool } from '../render/LightPool';
import { Effects } from '../render/Effects';
import { makeEnvironment } from '../render/EnvMap';
import { setMaxAnisotropy } from '../render/Textures';
import { World, type EnvSettings, type Interactable } from '../world/World';
import { Hud, type Settings } from '../ui/Hud';
import { Player, type Weapon } from './Player';
import { Citizen, Worker, type CitizenOpts } from './Citizen';
import { Traffic } from './Traffic';
import { Machine, type MachineKind } from './Machine';
import { Combat } from './Combat';
import type { Look } from '../actors/Blocky';
import { CHAPTERS, type Chapter } from '../levels';

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const SAVE_KEY = 'bellwether-save-v1';
const SET_KEY = 'bellwether-settings-v1';

interface CineCam {
  active: boolean;
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  tween: { t: number; dur: number; p0: THREE.Vector3; p1: THREE.Vector3; l0: THREE.Vector3; l1: THREE.Vector3; f0: number; f1: number; ease: (t: number) => number; done: () => void } | null;
  shake: number;
  /** follow a moving target each frame (look) */
  track: (() => THREE.Vector3) | null;
}

/** Voice character for the formant murmur under subtitles. */
const VOICES: Record<string, { pitch: number; vowels: string }> = {
  elias: { pitch: 0.82, vowels: 'aeo' },
  maya: { pitch: 1.25, vowels: 'eia' },
  reyes: { pitch: 0.72, vowels: 'aou' },
  cole: { pitch: 0.78, vowels: 'oae' },
  ellie: { pitch: 1.7, vowels: 'iea' },
  civic: { pitch: 1.0, vowels: 'eeo' },
};

export class Game {
  readonly engine: Engine;
  readonly input: Input;
  readonly physics = new PhysicsWorld();
  readonly lightGroup = new THREE.Group();
  readonly lights: LightPool;
  readonly sky = new Sky();
  readonly rain = new Rain();
  readonly fx = new Effects();
  readonly hud: Hud;
  readonly player: Player;
  world: World | null = null;
  people = new Map<string, Citizen>();
  crowd: Citizen[] = [];
  workers: Worker[] = [];
  traffic: Traffic | null = null;
  machines: Machine[] = [];
  readonly combat: Combat;
  /** stealth sections: machines start unaware */
  stealth = false;
  encounterEpoch = 0;
  chapter: Chapter | null = null;
  chapterIndex = 0;
  readonly hemi = new THREE.HemisphereLight(0x8899aa, 0x111111, 0.3);
  readonly moon = new THREE.DirectionalLight(0x9fb4d0, 0.0);
  state: 'loading' | 'title' | 'playing' | 'paused' = 'loading';
  control = true;
  cine: CineCam = { active: false, pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50, tween: null, shake: 0, track: null };
  checkpoint = { pos: new THREE.Vector3(), yaw: 0 };
  waypoint: { target: THREE.Vector3 | (() => THREE.Vector3); label: string } | null = null;
  private envCache = new Map<string, THREE.Texture>();
  private billboards: THREE.Object3D[] = [];
  scriptToken = 0;
  private deathHandling = false;
  private skipLine: (() => void) | null = null;
  time = 0;
  private frame = 0;
  private paused4shot = false;
  private sdt = 0.016;
  private lastTime = performance.now();
  private titleT = 0;
  private ambient: { greetBusyUntil: number } = { greetBusyUntil: 0 };
  indoorK = 0;
  settings: Settings = { master: 0.9, music: 0.7, sfx: 0.9, sensitivity: 1, invertY: false, quality: 'high', subtitles: true, subSize: 1 };
  save = { chapter: 0, unlocked: 0, started: false };
  /** test-only: scripts fast-forward and objectives auto-complete */
  autopilot = false;
  autoLog: string[] = [];

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.engine = new Engine(canvas);
    this.input = new Input(canvas);
    this.hud = new Hud(uiRoot);
    this.hud.onKeyCapture = (fn) => (this.input.onKey = fn);
    this.lights = new LightPool(this.lightGroup, 10);
    this.player = new Player(this.engine.camera);
    this.player.onDeath = () => this.onPlayerDeath();
    this.combat = new Combat(this.player, this.fx, this.engine.camera);
    const s = this.engine.scene;
    s.add(this.lightGroup, this.sky.mesh, this.rain.group, this.fx.group, this.hemi, this.moon, this.moon.target);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(2048, 2048);
    const sc = this.moon.shadow.camera;
    sc.left = -45;
    sc.right = 45;
    sc.top = 45;
    sc.bottom = -45;
    sc.far = 180;
    this.moon.shadow.bias = -0.0005;
    this.moon.shadow.normalBias = 0.02;
    setMaxAnisotropy(this.engine.renderer.capabilities.getMaxAnisotropy());
    try {
      const sv = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (sv) this.save = { ...this.save, ...sv };
      const st = JSON.parse(localStorage.getItem(SET_KEY) || 'null');
      if (st) this.settings = { ...this.settings, ...st };
    } catch {
      /* private mode */
    }
    this.applySettings();
    canvas.addEventListener('click', () => {
      audio.unlock();
      if (this.state === 'playing') this.input.requestLock();
    });
    window.addEventListener('keydown', () => audio.unlock(), { once: true });
    document.addEventListener('pointerlockchange', () => {
      if (!this.input.locked && this.state === 'playing' && !this.input.onKey && !this.paused4shot && !this.autopilot) this.pause(true);
    });
    this.installHooks();
  }

  // ================================================================ boot
  async boot(): Promise<void> {
    this.hud.loading(0.2, 'CONNECTING TO CIVIC');
    await sleep(30);
    this.buildMenus();
    this.loop();
    this.hud.loading(0.6, 'RESTORING BELLWETHER');
    await this.showTitle();
    this.hud.loading(1, 'WELCOME HOME');
    this.hud.hideLoading();
  }

  private buildMenus(): void {
    this.hud.buildMenus({
      onContinue: () => void this.startChapter(this.save.chapter),
      onNewGame: () => void this.startChapter(0),
      onChapter: (i) => void this.startChapter(i),
      onResume: () => this.pause(false),
      onRestartCheckpoint: () => {
        this.pause(false);
        void this.respawn();
      },
      onQuitToTitle: () => {
        this.pause(false);
        void this.showTitle();
      },
      onSettings: (s) => {
        this.settings = s;
        this.applySettings();
      },
    }, this.settings, this.save.started, this.save.unlocked, CHAPTERS.map((c) => ({ num: c.num, title: c.title })));
  }

  private applySettings(): void {
    const s = this.settings;
    audio.volumes.master = s.master;
    audio.volumes.music = s.music;
    audio.volumes.sfx = s.sfx;
    audio.volumes.amb = s.sfx;
    audio.setVolumes();
    this.input.sensitivity = s.sensitivity;
    this.input.invertY = s.invertY;
    this.hud.subtitlesOn = s.subtitles;
    if (this.engine.quality !== s.quality) this.engine.setQuality(s.quality);
    try {
      localStorage.setItem(SET_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch {
      /* ignore */
    }
  }

  // ================================================================ title
  async showTitle(): Promise<void> {
    this.scriptToken++;
    this.state = 'title';
    this.input.exitLock();
    this.hud.showPause(false);
    this.hud.bars(false);
    this.hud.hints(null);
    this.hud.hideSub();
    this.hud.civic(null);
    this.waypoint = null;
    const ch = CHAPTERS.find((c) => c.titleCam) ?? CHAPTERS[1];
    await this.loadWorld(ch, 'title');
    await this.precompile();
    this.cine.active = true;
    this.titleT = 0;
    this.buildMenus();
    this.hud.showTitle(true);
    this.hud.setFade(1);
    void this.hud.fade(0, 2.5);
    ch.ambience?.(this);
  }

  // ================================================================ chapters
  async startChapter(i: number): Promise<void> {
    const token = ++this.scriptToken;
    try {
      audio.unlock();
      this.hud.showTitle(false);
      this.hud.showPause(false);
      this.state = 'playing';
      await this.hud.fade(1, 0.8);
      const ch = CHAPTERS[i];
      this.chapterIndex = i;
      this.save.chapter = i;
      this.save.started = true;
      this.save.unlocked = Math.max(this.save.unlocked, i);
      this.persist();
      this.hud.showLoading(`${ch.num} · ${ch.title}`.toUpperCase());
      await sleep(30);
      await this.loadWorld(ch);
      this.hud.loading(0.7);
      await this.precompile();
      this.hud.loading(1);
      this.hud.hideLoading();
      if (token !== this.scriptToken) return;
      this.input.requestLock();
      this.state = 'playing';
      ch.ambience?.(this);
      const s = new Script(this, token);
      await ch.run(s);
      if (token === this.scriptToken) {
        if (i + 1 < CHAPTERS.length) await this.startChapter(i + 1);
        else await this.showTitle();
      }
    } catch (e) {
      if (e instanceof Abort) return;
      reportError(`chapter ${CHAPTERS[i]?.id ?? i}`, e);
      if (token === this.scriptToken) {
        this.cine.active = false;
        this.cine.tween = null;
        this.control = true;
        this.hud.setFade(0);
        this.hud.bars(false);
      }
    }
  }

  private envFor(kind: EnvSettings['envKind']): THREE.Texture {
    let t = this.envCache.get(kind);
    if (!t) {
      t = makeEnvironment(this.engine.renderer, kind);
      this.envCache.set(kind, t);
    }
    return t;
  }

  private async precompile(): Promise<void> {
    const r = this.engine.renderer as THREE.WebGLRenderer & { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> };
    try {
      if (r.compileAsync) await r.compileAsync(this.engine.scene, this.engine.camera);
      else r.compile(this.engine.scene, this.engine.camera);
    } catch (e) {
      console.warn('precompile skipped', e);
    }
  }

  clearActors(): void {
    for (const c of this.people.values()) c.dispose();
    this.people.clear();
    for (const c of this.crowd) c.dispose();
    this.crowd = [];
    for (const w of this.workers) w.dispose();
    this.workers = [];
    this.traffic?.dispose();
    this.traffic = null;
    for (const m of this.machines) m.dispose();
    this.machines = [];
  }

  spawnMachine(kind: MachineKind, p: THREE.Vector3, yaw = 0, o: { patrol?: THREE.Vector3[]; aware?: boolean; seed?: number } = {}): Machine {
    const m = new Machine(kind, p, yaw, this.physics, o);
    this.world!.dynamic.add(m.root);
    this.machines.push(m);
    return m;
  }

  get anyAlert(): boolean {
    return this.machines.some((m) => !m.dead && m.alerted);
  }

  async loadWorld(ch: Chapter, mode: 'play' | 'title' | 'state' = 'play'): Promise<void> {
    this.world?.dispose();
    this.world = null;
    this.clearActors();
    this.physics.clear();
    this.lights.clear();
    this.lights.master = 1;
    this.lights.tintMix = 0;
    this.fx.clearDecals();
    audio.stopAllLoops(0.6);
    this.cine.active = false;
    this.cine.tween = null;
    this.cine.track = null;
    this.waypoint = null;
    this.hud.civic(null);
    this.engine.post.uGlitch.value = 0;
    this.engine.post.uWhite.value = 0;
    R.seed(ch.seed ?? 217);
    const env = ch.env;
    const world = new World(this.physics, this.lights, env);
    this.world = world;
    this.chapter = ch;
    ch.build(world, this, mode);
    world.finalize();
    this.engine.scene.add(world.root);
    this.billboards = [];
    world.root.traverse((o) => {
      if (o.userData.billboard) this.billboards.push(o);
    });
    this.applyEnv(env);
    this.player.weapon = ch.weapon ?? 'none';
    this.player.canFlashlight = ch.flashlight ?? false;
    this.player.flashlightOn = false;
    this.player.revive();
    this.player.teleport(world.spawn, world.spawnYaw);
    this.checkpoint.pos.copy(world.spawn);
    this.checkpoint.yaw = world.spawnYaw;
    this.player.moveScale = 1;
    this.control = mode === 'play';
    this.input.endFrame();
  }

  applyEnv(env: EnvSettings): void {
    const scene = this.engine.scene;
    this.sky.set(env.sky);
    scene.fog = new THREE.FogExp2(new THREE.Color(env.fog), env.fogDensity);
    scene.environment = this.envFor(env.envKind);
    scene.environmentIntensity = 1;
    this.engine.renderer.toneMappingExposure = env.exposure;
    this.hemi.color.set(env.hemi[0]);
    this.hemi.groundColor.set(env.hemi[1]);
    this.hemi.intensity = env.hemi[2];
    if (env.moon) {
      this.moon.color.set(env.moon.color);
      this.moon.intensity = env.moon.intensity;
      this.moon.userData.dir = new THREE.Vector3(...env.moon.dir).normalize();
      this.moon.castShadow = env.moon.shadow !== false;
    } else {
      this.moon.intensity = 0;
      this.moon.castShadow = false;
    }
    this.rain.intensity = env.rain;
    this.rain.groundY = env.floorY ?? 0;
    this.physics.floorY = env.floorY ?? 0;
    if (env.floorSurface) this.physics.floorSurface = env.floorSurface;
    this.engine.bloom.strength = env.bloom ?? 0.55;
    this.fx.setMotes(env.motes ?? 0);
    const p = this.engine.post;
    p.uSat.value = env.grade?.sat ?? 1;
    p.uTint.value.set(env.grade?.tint ?? '#ffffff');
    p.uVignette.value = env.grade?.vignette ?? 0.9;
    audio.setReverb(env.reverb[0], env.reverb[1]);
    audio.setRain(env.rain, false);
  }

  // ================================================================ actors
  /** A named character (team, story citizens). */
  person(name: string, look: Look, p: THREE.Vector3, yaw = 0, o: CitizenOpts = {}): Citizen {
    this.people.get(name)?.dispose();
    const c = new Citizen(look, p, this.physics, { name, yaw, ...o });
    this.world!.dynamic.add(c.body.root);
    this.people.set(name, c);
    c.onGreet = (who, line) => this.ambientLine(who, line);
    return c;
  }

  /** A background resident. */
  extra(look: Look, p: THREE.Vector3, o: CitizenOpts = {}): Citizen {
    const c = new Citizen(look, p, this.physics, o);
    this.world!.dynamic.add(c.body.root);
    this.crowd.push(c);
    c.onGreet = (who, line) => this.ambientLine(who, line);
    return c;
  }

  worker(path: THREE.Vector3[], speed = 0.8): Worker {
    const w = new Worker(path, this.physics, speed);
    this.world!.dynamic.add(w.bot.root);
    this.workers.push(w);
    return w;
  }

  ensureTraffic(): Traffic {
    if (!this.traffic) {
      this.traffic = new Traffic(this.physics);
      this.world!.dynamic.add(this.traffic.group);
    }
    return this.traffic;
  }

  /** Overheard line from a passer-by: never interrupts story dialogue. */
  ambientLine(c: Citizen, line: string): void {
    if (this.state !== 'playing' || this.cine.active) return;
    if (this.hud.subBusy || performance.now() < this.ambient.greetBusyUntil) return;
    this.ambient.greetBusyUntil = performance.now() + 4200;
    c.body.talking = 1;
    c.body.gesture(Math.random() < 0.5 ? 'wave' : 'nod', 1.2);
    this.voice(c, line);
    this.hud.showSub(c.name || 'RESIDENT', line, false, 2.6);
    window.setTimeout(() => (c.body.talking = 0), 1800);
  }

  voice(c: Citizen | null, text: string): void {
    const key = (c?.name ?? '').toLowerCase();
    const v = VOICES[key] ?? { pitch: c?.body.look.child ? 1.6 : c?.body.look.female ? 1.2 : 0.85, vowels: 'aeiou' };
    const robot = c && (c.body.look.gen === 'gen2' || c.body.look.gen === 'security');
    audio.voice(c?.chest, { pitch: v.pitch, vowels: v.vowels, dur: Math.min(3, 0.4 + text.length * 0.035), vol: 0.06, distort: robot ? 0.35 : 0 });
  }

  // ================================================================ pause / death
  pause(on: boolean): void {
    if (on && this.state === 'playing') {
      this.state = 'paused';
      this.input.exitLock();
      this.hud.showPause(true);
      audio.setMuffle(0.85);
      audio.ctx?.suspend?.();
    } else if (!on && this.state === 'paused') {
      this.state = 'playing';
      this.hud.showPause(false);
      audio.ctx?.resume?.();
      audio.setMuffle(0);
      this.input.requestLock();
    }
  }

  private onPlayerDeath(): void {
    if (this.deathHandling) return;
    window.setTimeout(() => void this.respawn(), 1800);
  }

  async respawn(): Promise<void> {
    if (this.deathHandling) return;
    this.deathHandling = true;
    await this.hud.fade(1, 0.6);
    this.encounterEpoch++;
    this.combat.mag = this.combat.magSize;
    this.combat.reserve = Math.max(this.combat.reserve, 24);
    this.player.revive();
    this.player.teleport(this.checkpoint.pos, this.checkpoint.yaw);
    await sleep(300);
    void this.hud.fade(0, 0.8);
    this.deathHandling = false;
  }

  // ================================================================ loop
  private loop = (): void => {
    requestAnimationFrame(this.loop);
    const now = performance.now();
    const real = (now - this.lastTime) / 1000;
    const dt = Math.min(0.05, real);
    this.sdt = Math.min(0.25, real);
    if (this.state !== 'loading') this.engine.adapt(real * 1000);
    this.lastTime = now;
    this.frame++;
    this.input.pollGamepad();
    try {
      if (!this.paused4shot) this.update(dt);
    } catch (e) {
      reportError('update', e);
    }
    try {
      this.engine.render();
    } catch (e) {
      reportError('render', e);
    }
    this.input.endFrame();
  };

  update(dt: number): void {
    if (this.state === 'paused') {
      if (this.input.wasPressed('pause')) this.pause(false);
      return;
    }
    this.time += dt;
    G.uTime.value = this.time;
    const cam = this.engine.camera;
    const playing = this.state === 'playing';
    if (playing && this.input.wasPressed('pause') && !this.input.onKey) {
      this.pause(true);
      return;
    }
    if (this.input.wasPressed('skip')) this.skipLine?.();
    const ctl = playing && this.control && !this.cine.active && !this.input.onKey;
    const world = this.world;
    this.player.update(dt, this.input, this.physics, ctl);
    this.combat.update(dt, this.input, this.physics, this.machines, ctl);
    if (world) {
      const pl = { pos: this.player.pos, camPos: this.player.camPos, yaw: this.player.yaw };
      const all = [...this.crowd, ...this.people.values()];
      for (const c of this.people.values()) c.update(dt, pl, all);
      // background residents far away update at a lower rate
      for (let i = 0; i < this.crowd.length; i++) {
        const c = this.crowd[i];
        const d2 = c.pos.distanceToSquared(this.player.pos);
        const far = d2 > 60 * 60;
        c.body.mesh.castShadow = d2 < 28 * 28;
        if (!far || (this.frame + i) % 4 === 0) c.update(far ? dt * 4 : dt, pl, all);
      }
      for (const w of this.workers) w.update(dt, this.player.pos);
      const mctx = { player: this.player, phys: this.physics, fx: this.fx, camera: cam, stealth: this.stealth, others: this.machines };
      for (const m of this.machines) m.update(dt, mctx);
      for (const c of this.people.values()) if (c.shooter) this.companionFire(c, dt);
      for (const m of this.machines) if (m.dead && m.deadT > 25) m.dispose();
      this.machines = this.machines.filter((m) => !m.removed);
      this.traffic?.update(dt, this.player.pos);
      for (const u of world.updaters) u(this.sdt, this.time);
    }
    if (world && playing && this.player.state !== 'dead') {
      const pp = this.player.pos.clone().add(new THREE.Vector3(0, 0.9, 0));
      for (const t of world.triggers) {
        if (!t.enabled || (t.once && t.fired)) continue;
        const inside = t.box.containsPoint(pp);
        if (inside && !t.inside) {
          t.fired = true;
          t.onEnter();
        } else if (!inside && t.inside) t.onExit?.();
        t.inside = inside;
      }
      this.updateInteract(ctl);
    } else this.hud.prompt(null);
    this.player.view.visible = !this.cine.active;
    if (this.cine.active) this.updateCine(this.sdt, cam);
    if (this.state === 'title') this.updateTitleCam(dt);
    // environment
    this.sky.update(cam);
    const indoor = world?.isIndoor(cam.position) ? 1 : 0;
    this.indoorK = damp(this.indoorK, indoor, 4, dt);
    this.rain.update(cam, this.indoorK);
    if (world && Math.floor(this.time * 2) !== Math.floor((this.time - dt) * 2)) audio.setRain(world.env.rain, indoor > 0.5);
    this.lights.update(dt, this.time, cam.position);
    for (const b of this.billboards) {
      b.quaternion.copy(cam.quaternion);
      const base = (b.userData.baseScale as number | undefined) ?? (b.userData.baseScale = b.scale.x);
      const d = b.getWorldPosition(new THREE.Vector3()).distanceTo(cam.position);
      b.scale.setScalar(base * THREE.MathUtils.smoothstep(d, 0.8, 3.5));
    }
    if (this.moon.intensity > 0) {
      const d = (this.moon.userData.dir as THREE.Vector3) ?? new THREE.Vector3(0.3, 1, 0.2);
      const c = cam.position;
      this.moon.target.position.copy(c);
      this.moon.position.copy(c).addScaledVector(d, 70);
    }
    this.fx.update(dt, cam);
    G.uFlash.value = Math.max(0, G.uFlash.value - dt * 3);
    // HUD
    const hurt = 1 - this.player.health / this.player.maxHealth;
    this.hud.hurt(hurt * 1.1);
    this.engine.post.uDamage.value = damp(this.engine.post.uDamage.value, hurt * 0.9, 5, dt);
    const fpUi = playing && !this.cine.active && this.control;
    this.hud.fpDot(fpUi && this.player.ads < 0.5);
    this.hud.reticle(fpUi && this.player.ads > 0.5, this.combat.hitMarker > 0);
    this.hud.cluster(fpUi && this.player.weapon === 'pistol');
    this.hud.ammo(fpUi && this.player.weapon === 'pistol', this.combat.mag, this.combat.reserve);
    this.updateWaypoint(cam, playing && !this.cine.active);
    audio.updateListener(cam);
  }

  private companionFire(c: Citizen, dt: number): void {
    c.shootCd -= dt;
    if (c.shootCd > 0) return;
    const live = this.machines.filter((m) => !m.dead && m.alerted && m.pos.distanceTo(c.pos) < 24);
    if (!live.length) return;
    live.sort((a, b) => a.pos.distanceTo(c.pos) - b.pos.distanceTo(c.pos));
    const t = live[0];
    const from = c.pos.clone().add(new THREE.Vector3(0, 1.45, 0));
    if (!this.physics.lineOfSight(from, t.chest)) {
      c.shootCd = 0.5;
      return;
    }
    c.shootCd = 1.1 + Math.random() * 0.9;
    c.faceYaw = Math.atan2(t.pos.x - c.pos.x, t.pos.z - c.pos.z);
    c.body.gesture('aim', 0.8);
    const dir = t.chest.clone().sub(from).normalize();
    const muzzle = from.clone().addScaledVector(dir, 0.6);
    this.fx.muzzle(muzzle, dir, this.engine.camera);
    this.fx.tracer(muzzle, t.chest, this.engine.camera);
    audio.gunshot(muzzle, 0.7);
    if (Math.random() < 0.6) t.damage(t.kind === 'maintenance' ? 12 : 20, from, this.fx);
  }

  private updateWaypoint(cam: THREE.PerspectiveCamera, on: boolean): void {
    const wp = this.waypoint;
    if (!wp || !on) {
      this.hud.waypoint(false);
      return;
    }
    const t = typeof wp.target === 'function' ? wp.target() : wp.target;
    const dist = t.distanceTo(this.player.pos);
    if (dist < 2.2) {
      this.hud.waypoint(false);
      return;
    }
    const p = t.clone().project(cam);
    const w = window.innerWidth;
    const h = window.innerHeight;
    const behind = p.z > 1;
    let x = (p.x * 0.5 + 0.5) * w;
    let y = (-p.y * 0.5 + 0.5) * h;
    const m = 48;
    const off = behind || x < m || x > w - m || y < m || y > h - m;
    if (off) {
      // pin to the screen edge in the target's direction
      let dx = behind ? -(p.x || 0.0001) : p.x;
      let dy = behind ? -p.y : p.y;
      if (behind && Math.abs(dx) < 0.2) dx = 0.2 * Math.sign(dx || 1);
      const k = Math.min((w / 2 - m) / Math.max(1e-3, Math.abs(dx * w / 2)), (h / 2 - m) / Math.max(1e-3, Math.abs(dy * h / 2)));
      dy = behind ? Math.min(0, dy) : dy;
      x = w / 2 + dx * (w / 2) * k;
      y = h / 2 - dy * (h / 2) * k;
    }
    this.hud.waypoint(true, x, y, dist, off, wp.label);
  }

  private updateInteract(ctl: boolean): void {
    const world = this.world!;
    let best: Interactable | null = null;
    let bestScore = 1e9;
    const camDir = this.player.aimDir;
    for (const it of world.interactables) {
      if (!it.enabled) continue;
      const d = it.pos.distanceTo(this.player.camPos);
      if (d > it.radius + 0.6) continue;
      const to = it.pos.clone().sub(this.player.camPos).normalize();
      const facing = to.dot(camDir);
      const score = d * 0.4 - facing * 2;
      if (facing > 0.55 && score < bestScore) {
        bestScore = score;
        best = it;
      }
    }
    // stealth takedown: close behind an unaware unit
    if (ctl) {
      for (const m of this.machines) {
        if (m.dead || m.alerted || m.kind === 'maintenance') continue;
        const to = this.player.pos.clone().sub(m.pos).setY(0);
        const d = to.length();
        if (d > 1.8) continue;
        const behind = to.normalize().dot(new THREE.Vector3(Math.sin(m.yaw), 0, Math.cos(m.yaw))) < -0.2;
        if (!behind) continue;
        this.hud.prompt('Disable unit', 'E');
        if (this.input.wasPressed('interact')) {
          this.input.consume('interact');
          this.player.reach();
          audio.glitchZap(m.head, 0.14);
          this.fx.burst('sparks', m.head, new THREE.Vector3(0, 1, 0), 24);
          m.damage(999, this.player.camPos, this.fx);
        }
        return;
      }
    }
    if (best && ctl) {
      this.hud.prompt(best.prompt, 'E');
      if (this.input.wasPressed('interact')) {
        this.input.consume('interact');
        this.player.reach();
        best.onUse();
      }
    } else this.hud.prompt(null);
  }

  // ================================================================ cinematic camera
  private updateCine(dt: number, cam: THREE.PerspectiveCamera): void {
    const c = this.cine;
    if (c.tween) {
      const tw = c.tween;
      tw.t += dt;
      const k = tw.ease(Math.min(1, tw.t / tw.dur));
      c.pos.lerpVectors(tw.p0, tw.p1, k);
      c.look.lerpVectors(tw.l0, tw.l1, k);
      c.fov = THREE.MathUtils.lerp(tw.f0, tw.f1, k);
      if (tw.t >= tw.dur) {
        c.tween = null;
        tw.done();
      }
    }
    if (c.track) c.look.lerp(c.track(), 1 - Math.exp(-6 * dt));
    cam.position.copy(c.pos);
    if (c.shake > 0) {
      c.shake = Math.max(0, c.shake - dt * 1.5);
      const s = c.shake * c.shake;
      cam.position.add(new THREE.Vector3(Math.sin(this.time * 37) * 0.1 * s, Math.sin(this.time * 29) * 0.1 * s, 0));
    }
    cam.position.y += Math.sin(this.time * 0.9) * 0.01;
    cam.lookAt(c.look);
    if (Math.abs(cam.fov - c.fov) > 0.01) {
      cam.fov = c.fov;
      cam.updateProjectionMatrix();
    }
    // the viewmodel belongs to gameplay only
    this.player.view.visible = false;
  }

  private updateTitleCam(dt: number): void {
    this.titleT += dt;
    const path = this.chapter?.titleCam;
    if (path) {
      const { pos, look } = path(this.titleT * 0.02);
      this.cine.pos.copy(pos);
      this.cine.look.copy(look);
      this.cine.fov = 52;
    }
  }

  setSkip(fn: (() => void) | null): void {
    this.skipLine = fn;
  }

  // ================================================================ test hooks
  private installHooks(): void {
    const g = this;
    const w = window as unknown as Record<string, unknown>;
    w.__THREE_GAME_DIAGNOSTICS__ = {
      get frame() {
        return g.frame;
      },
      renderer: this.engine.renderer.info,
      get state() {
        return { state: g.state, chapter: g.chapter?.id, pos: g.player.pos.toArray(), health: g.player.health, people: g.people.size + g.crowd.length, cars: g.traffic?.cars.length ?? 0 };
      },
    };
    w.__THREE_GAME_TEST_HOOKS__ = {
      seed: (n: number) => R.seed(n),
      setPausedForScreenshot: (p: boolean) => {
        g.paused4shot = p;
      },
      states: () => CHAPTERS.flatMap((c) => Object.keys(c.shots ?? {}).map((k) => `${c.id}:${k}`)).concat(['title']),
      setState: async (name: string) => {
        g.scriptToken++;
        g.hud.showTitle(false);
        g.hud.showPause(false);
        g.hud.setFade(0);
        g.hud.hideLoading();
        if (name === 'title') {
          await g.showTitle();
          g.hud.setFade(0);
          for (let i = 0; i < 30; i++) g.update(1 / 60);
          return { state: name };
        }
        const [id, shot] = name.split(':');
        const ch = CHAPTERS.find((c) => c.id === id);
        const def = ch?.shots?.[shot];
        if (!ch || !def) throw new Error(`unknown state ${name}`);
        g.state = 'playing';
        await g.loadWorld(ch, 'state');
        g.control = false;
        ch.ambience?.(g);
        def(g);
        for (let i = 0; i < 40; i++) g.update(1 / 60);
        return { state: name };
      },
      game: g,
    };
  }
}

// ==================================================================== script API
export class Abort extends Error {}

const easeIO = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** The story-scripting surface used by chapters. Every await checks the chapter token. */
export class Script {
  constructor(readonly g: Game, private token: number) {}

  private check(): void {
    if (this.token !== this.g.scriptToken) throw new Abort();
  }

  get world(): World {
    return this.g.world!;
  }

  get player(): Player {
    return this.g.player;
  }

  private get ap(): boolean {
    return this.g.autopilot;
  }

  async wait(sec: number): Promise<void> {
    if (this.ap) sec *= 0.05;
    const end = performance.now() + sec * 1000;
    while (performance.now() < end) {
      await sleep(Math.min(100, end - performance.now()));
      this.check();
      while (this.g.state === 'paused') {
        await sleep(100);
        this.check();
      }
    }
  }

  async until(pred: () => boolean, poll = 80, label = 'until'): Promise<void> {
    const t0 = performance.now();
    while (!pred()) {
      await sleep(poll);
      this.check();
      while (this.g.state === 'paused') {
        await sleep(100);
        this.check();
      }
      if (this.ap && performance.now() - t0 > 6000) {
        this.g.autoLog.push(`[${this.g.chapter?.id}] stuck at ${label} → forced`);
        return;
      }
    }
  }

  /** Spoken line. `who` is a person's name (drives their mouth) or a label. */
  async say(who: string, text: string, o: { radio?: boolean; dur?: number; label?: string } = {}): Promise<void> {
    this.check();
    const dur = this.ap ? 0.03 : o.dur ?? Math.max(2.0, 1.1 + text.length * 0.058);
    const c = this.g.people.get(who.toLowerCase()) ?? null;
    if (c) c.body.talking = 1;
    if (who.toLowerCase() !== 'elias' || !o.radio) this.g.voice(c, text);
    if (o.radio) audio.click('switch');
    this.g.hud.showSub(o.label ?? who.toUpperCase(), text, o.radio);
    let skipped = false;
    this.g.setSkip(() => (skipped = true));
    const end = performance.now() + dur * 1000;
    while (performance.now() < end && !skipped) {
      await sleep(50);
      this.check();
    }
    this.g.setSkip(null);
    if (c) c.body.talking = 0;
    this.g.hud.hideSub();
    await sleep(160);
    this.check();
  }

  thought(text: string, dur = 3.2): Promise<void> {
    return this.say('', text, { dur, label: '' });
  }

  /** Objective line + optional world waypoint. */
  objective(loc: string, text: string, target?: THREE.Vector3 | (() => THREE.Vector3), label = ''): void {
    this.g.hud.objective(loc, text);
    this.g.waypoint = target ? { target, label } : null;
  }

  clearWaypoint(): void {
    this.g.waypoint = null;
  }

  async civic(text: string, sub = '', dur = 4.5): Promise<void> {
    audio.civicChime();
    this.g.hud.civic(text, sub);
    this.g.voice(null, text);
    await this.wait(dur);
    this.g.hud.civic(null);
  }

  control(on: boolean): void {
    this.g.control = on;
    if (!on) this.g.player.vel.set(0, this.g.player.vel.y, 0);
  }

  async zone(min: [number, number, number], max: [number, number, number]): Promise<void> {
    const box = new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max));
    if (this.ap) {
      const c = box.getCenter(new THREE.Vector3());
      this.g.player.teleport(new THREE.Vector3(c.x, min[1] + 0.2, c.z), this.g.player.yaw);
    }
    await this.until(() => box.containsPoint(this.g.player.pos.clone().add(new THREE.Vector3(0, 0.9, 0))), 80, `zone ${min.join(',')}`);
  }

  near(p: THREE.Vector3, r: number): Promise<void> {
    if (this.ap) this.g.player.teleport(p.clone().add(new THREE.Vector3(0.4, 0, 0.4)), this.g.player.yaw);
    return this.until(() => Math.hypot(this.g.player.pos.x - p.x, this.g.player.pos.z - p.z) < r, 80, 'near');
  }

  /** Register an interactable and await its use. */
  use(id: string, pos: THREE.Vector3, prompt: string, o: { radius?: number; keep?: boolean } = {}): Promise<void> {
    return new Promise((res, rej) => {
      const it = this.world.interact({
        id, pos, prompt, radius: o.radius ?? 1.8,
        onUse: () => {
          if (!o.keep) it.enabled = false;
          res();
        },
      });
      if (this.ap) window.setTimeout(() => it.enabled && it.onUse(), 150);
      const tk = this.token;
      const poll = window.setInterval(() => {
        if (tk !== this.g.scriptToken) {
          clearInterval(poll);
          it.enabled = false;
          rej(new Abort());
        }
        if (!it.enabled && !o.keep) clearInterval(poll);
      }, 200);
    });
  }

  // ---------------------------------------------------------------- cinematics
  async cut(fn: () => Promise<void>, o: { bars?: boolean; keepControlAfter?: boolean } = {}): Promise<void> {
    this.check();
    this.control(false);
    if (o.bars !== false) this.g.hud.bars(true);
    this.g.hud.prompt(null);
    try {
      await fn();
    } finally {
      this.g.hud.bars(false);
    }
    this.check();
    this.g.cine.active = false;
    this.g.cine.track = null;
    this.g.player.snapCamera();
    if (o.keepControlAfter !== false) this.control(true);
  }

  private endTween(): void {
    const tw = this.g.cine.tween;
    this.g.cine.tween = null;
    tw?.done();
  }

  cam(pos: THREE.Vector3, look: THREE.Vector3, fov = 45): void {
    const c = this.g.cine;
    c.active = true;
    this.endTween();
    c.pos.copy(pos);
    c.look.copy(look);
    c.fov = fov;
  }

  camTo(pos: THREE.Vector3, look: THREE.Vector3, dur: number, fov?: number, ease = easeIO): Promise<void> {
    const c = this.g.cine;
    if (!c.active) {
      c.active = true;
      c.pos.copy(this.g.engine.camera.position);
      c.look.copy(this.g.engine.camera.position.clone().add(this.g.engine.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5)));
      c.fov = this.g.engine.camera.fov;
    }
    if (this.ap) dur = 0.05;
    this.endTween();
    return new Promise<void>((res) => {
      c.tween = { t: 0, dur, p0: c.pos.clone(), p1: pos.clone(), l0: c.look.clone(), l1: look.clone(), f0: c.fov, f1: fov ?? c.fov, ease, done: res };
    }).then(() => this.check());
  }

  /** First-person "look at" a point for a moment without taking full camera control. */
  async lookAt(p: THREE.Vector3, sec = 1.2): Promise<void> {
    const pl = this.g.player;
    const d = p.clone().sub(pl.camPos);
    const ty = Math.atan2(-d.x, -d.z);
    const tp = Math.atan2(d.y, Math.hypot(d.x, d.z));
    const y0 = pl.yaw;
    const p0 = pl.pitch;
    let dy = ty - y0;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    const steps = Math.max(1, Math.round((this.ap ? 0.05 : sec) * 30));
    for (let i = 1; i <= steps; i++) {
      const k = easeIO(i / steps);
      pl.yaw = y0 + dy * k;
      pl.pitch = p0 + (tp - p0) * k;
      await sleep(33);
      this.check();
    }
  }

  shake(v: number): void {
    this.g.cine.shake = Math.max(this.g.cine.shake, v);
    this.g.player.trauma = Math.min(1, this.g.player.trauma + v * 0.5);
  }

  async fade(to: number, sec = 1, white = false): Promise<void> {
    await this.g.hud.fade(to, this.ap ? 0.02 : sec, white);
    this.check();
  }

  async card(num: string, title: string, sub = ''): Promise<void> {
    if (this.ap) return;
    await this.g.hud.chapterCard(num, title, sub);
    this.check();
  }

  checkpoint(pos?: THREE.Vector3, yaw?: number): void {
    this.g.checkpoint.pos.copy(pos ?? this.g.player.pos);
    this.g.checkpoint.yaw = yaw ?? this.g.player.yaw;
  }

  weapon(w: Weapon): void {
    this.g.player.weapon = w;
  }

  /**
   * Encounter: spawn a wave, wait until every machine is down. If Elias dies the wave is
   * cleared and restarts from the checkpoint.
   */
  async fight(spawns: { kind: MachineKind; pos: THREE.Vector3; yaw?: number; delay?: number; patrol?: THREE.Vector3[]; aware?: boolean }[], o: { music?: boolean; stealth?: boolean } = {}): Promise<void> {
    const bed = o.music !== false ? audio.tensionBed(0.1) : null;
    this.g.stealth = !!o.stealth;
    try {
      while (true) {
        const epoch = this.g.encounterEpoch;
        const mine: Machine[] = [];
        for (const sp of spawns) {
          if (sp.delay) await this.wait(sp.delay);
          if (epoch !== this.g.encounterEpoch) break;
          mine.push(this.g.spawnMachine(sp.kind, sp.pos, sp.yaw ?? 0, { patrol: sp.patrol, aware: sp.aware ?? !o.stealth }));
        }
        if (this.ap) for (const m of mine) m.damage(999, m.pos);
        await this.until(() => epoch !== this.g.encounterEpoch || mine.every((m) => m.dead), 120, 'fight');
        if (epoch === this.g.encounterEpoch) break;
        for (const m of mine) m.dispose();
        await this.wait(1.2);
      }
    } finally {
      bed?.stop(2);
      this.g.stealth = false;
    }
    await this.wait(0.6);
  }

  /** Ammo box pickup. */
  ammo(id: string, pos: THREE.Vector3, amount = 24): void {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.26), new THREE.MeshStandardMaterial({ color: '#3a4a2e', roughness: 0.6 }));
    box.position.copy(pos);
    this.world.add(box);
    const it = this.world.interact({
      id, pos: pos.clone().add(new THREE.Vector3(0, 0.2, 0)), prompt: `Take ammo (+${amount})`, radius: 1.8,
      onUse: () => {
        this.g.combat.reserve += amount;
        audio.pickup();
        box.visible = false;
        it.enabled = false;
      },
    });
  }
}
