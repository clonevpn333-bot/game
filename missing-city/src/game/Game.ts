import * as THREE from 'three';
import { Engine } from '../core/Engine';
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
import { coneMaterial } from '../render/Materials';
import { World, type EnvSettings, type Interactable } from '../world/World';
import { Hud, type Settings } from '../ui/Hud';
import { Player } from './Player';
import { Combat } from './Combat';
import { EchoSystem, Ghost } from './Echo';
import { Npc } from './Npc';
import { Remnant, type RemnantKind } from './Remnant';
import { loadCharacter, type CharName } from '../actors/Characters';
import { CHAPTERS, type Chapter } from '../levels';

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
const SAVE_KEY = 'tmc-save-v1';
const SET_KEY = 'tmc-settings-v1';

interface CineCam {
  active: boolean;
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  tween: { t: number; dur: number; p0: THREE.Vector3; p1: THREE.Vector3; l0: THREE.Vector3; l1: THREE.Vector3; f0: number; f1: number; ease: (t: number) => number; done: () => void } | null;
  shake: number;
}

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
  player!: Player;
  combat!: Combat;
  readonly echo: EchoSystem;
  world: World | null = null;
  npcs = new Map<string, Npc>();
  enemies: Remnant[] = [];
  chapter: Chapter | null = null;
  chapterIndex = 0;
  readonly hemi = new THREE.HemisphereLight(0x8899aa, 0x111111, 0.3);
  readonly moon = new THREE.DirectionalLight(0x9fb4d0, 0.0);
  readonly fill = new THREE.PointLight(0xc8d4ff, 1.6, 7, 2);
  state: 'loading' | 'title' | 'playing' | 'paused' | 'ending' = 'loading';
  control = true;
  cine: CineCam = { active: false, pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50, tween: null, shake: 0 };
  checkpoint = { pos: new THREE.Vector3(), yaw: 0 };
  private envCache = new Map<string, THREE.Texture>();
  private billboards: THREE.Object3D[] = [];
  scriptToken = 0;
  private deathHandling = false;
  encounterEpoch = 0;
  private skipLine: (() => void) | null = null;
  private time = 0;
  private frame = 0;
  private paused4shot = false;
  settings: Settings = { master: 0.9, music: 0.7, sfx: 0.9, sensitivity: 1, invertY: false, quality: 'high', subtitles: true, subSize: 1 };
  save = { chapter: 0, unlocked: 0, started: false };
  private titleT = 0;
  hurtFlash = 0;
  private heartT = 0;
  indoorK = 0;
  private lastTime = performance.now();
  onCutsceneSkip: (() => void) | null = null;
  flashlightAllowed = true;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.engine = new Engine(canvas);
    this.input = new Input(canvas);
    this.hud = new Hud(uiRoot);
    this.hud.onKeyCapture = (fn) => (this.input.onKey = fn);
    this.lights = new LightPool(this.lightGroup, 10);
    this.echo = new EchoSystem(this.physics, this.lights);
    const s = this.engine.scene;
    s.add(this.fill);
    s.add(this.lightGroup, this.sky.mesh, this.rain.group, this.fx.group, this.hemi, this.moon, this.moon.target);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(2048, 2048);
    this.moon.shadow.camera.left = -40;
    this.moon.shadow.camera.right = 40;
    this.moon.shadow.camera.top = 40;
    this.moon.shadow.camera.bottom = -40;
    this.moon.shadow.camera.far = 160;
    this.moon.shadow.bias = -0.0005;
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
      if (!this.input.locked && this.state === 'playing' && !this.input.onKey && !this.paused4shot) this.pause(true);
    });
    this.installHooks();
  }

  // ================================================================ boot
  async boot(): Promise<void> {
    this.hud.loading(0.05, 'LOADING BELLWETHER');
    const need: CharName[] = ['elias', 'maya', 'reyes', 'voss'];
    let done = 0;
    for (const n of need) {
      await loadCharacter(n);
      this.hud.loading(0.1 + (++done / need.length) * 0.75, 'RESTORING ' + n.toUpperCase());
    }
    this.player = new Player(this.engine.scene);
    this.combat = new Combat(this.player, this.fx);
    this.combat.camRef = this.engine.camera;
    this.combat.meleeHit = () => this.combat.resolveMelee(this.enemies);
    this.player.actor.root.visible = false;
    // preload the rest in the background
    void (async () => {
      for (const n of ['ellie', 'remnant', 'civ_man', 'civ_woman', 'civ_office', 'civ_nurse', 'civ_kid', 'elias_teen', 'elias_child'] as CharName[]) await loadCharacter(n);
    })();
    this.hud.loading(1, '02:17 AM');
    this.buildMenus();
    this.loop();
    await this.showTitle();
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
    this.hud.cluster(false);
    this.hud.hints(null);
    this.hud.hideSub();
    await loadCharacter('ellie');
    await this.loadWorld(CHAPTERS[0], 'title');
    this.player.actor.root.visible = false;
    for (const n of this.npcs.values()) n.actor.root.visible = false;
    this.cine.active = true;
    this.titleT = 0;
    this.buildMenus();
    this.hud.showTitle(true);
    this.hud.setFade(1);
    void this.hud.fade(0, 2.5);
    audio.stopAllLoops(0.5);
    window.setTimeout(() => {
      if (this.state !== 'title') return;
      audio.setRain(0.9, false);
      audio.drone(0.08, 36, 0.3);
      audio.thunder(0.7);
    }, 300);
  }

  // ================================================================ chapters
  async startChapter(i: number): Promise<void> {
    audio.unlock();
    this.hud.showTitle(false);
    this.hud.showPause(false);
    this.state = 'playing';
    const token = ++this.scriptToken;
    await this.hud.fade(1, 0.8);
    const ch = CHAPTERS[i];
    this.chapterIndex = i;
    this.save.chapter = i;
    this.save.started = true;
    this.save.unlocked = Math.max(this.save.unlocked, i);
    this.persist();
    for (const c of ch.chars) await loadCharacter(c);
    await this.loadWorld(ch);
    if (token !== this.scriptToken) return;
    this.input.requestLock();
    this.state = 'playing';
    const s = new Script(this, token);
    try {
      await ch.run(s);
      if (token === this.scriptToken) {
        if (i + 1 < CHAPTERS.length) await this.startChapter(i + 1);
        else await this.showTitle();
      }
    } catch (e) {
      if (!(e instanceof Abort)) console.error(e);
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

  async loadWorld(ch: Chapter, mode: 'play' | 'title' | 'state' = 'play'): Promise<void> {
    // tear down
    this.world?.dispose();
    this.world = null;
    for (const n of this.npcs.values()) n.dispose();
    this.npcs.clear();
    for (const e of this.enemies) e.actor.dispose();
    this.enemies = [];
    this.echo.clearGhosts();
    this.echo.reset();
    this.echo.unlocked = ch.echoUnlocked ?? false;
    this.physics.clear();
    this.lights.clear();
    this.fx.clearDecals();
    audio.stopAllLoops(0.6);
    this.cine.active = false;
    this.cine.tween = null;
    G.uWarp.value = 0;
    G.uRainDir.value = 1;
    this.engine.post.uGlitch.value = 0;
    this.engine.post.uWhite.value = 0;
    // build
    R.seed(ch.seed ?? 217);
    const env = ch.env;
    const world = new World(this.physics, this.lights, env);
    this.world = world;
    this.chapter = ch;
    ch.build(world, this);
    world.finalize();
    this.engine.scene.add(world.root);
    this.billboards = [];
    world.root.traverse((o) => {
      if (o.userData.billboard) this.billboards.push(o);
    });
    this.applyEnv(env);
    this.combat.hasGun = ch.gun ?? false;
    this.player.canFlashlight = true;
    this.player.flashlightOn = ch.flashlight ?? false;
    this.player.revive();
    this.player.teleport(world.spawn, world.spawnYaw);
    this.player.actor.root.visible = mode !== 'title';
    this.checkpoint.pos.copy(world.spawn);
    this.checkpoint.yaw = world.spawnYaw;
    this.player.moveScale = 1;
    this.control = mode === 'play';
    if (mode !== 'title') ch.ambience?.(this);
    this.input.endFrame();
    // compile shaders up-front to avoid hitches
    this.engine.renderer.compile(this.engine.scene, this.engine.camera);
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

  async respawn(): Promise<void> {
    if (this.deathHandling) return;
    this.deathHandling = true;
    await this.hud.fade(1, 0.6);
    for (const e of this.enemies) e.actor.dispose();
    this.enemies = [];
    this.encounterEpoch++;
    this.echo.reset();
    this.echo.unlocked = this.chapter?.echoUnlocked ?? this.echo.unlocked;
    this.player.revive();
    this.player.teleport(this.checkpoint.pos, this.checkpoint.yaw);
    this.combat.mag = this.combat.magSize;
    this.combat.reserve = Math.max(this.combat.reserve, 24);
    this.hud.hurt(0);
    await sleep(400);
    void this.hud.fade(0, 0.8);
    this.deathHandling = false;
  }

  // ================================================================ spawning helpers
  npc(name: CharName, p: THREE.Vector3, yaw = 0): Npc {
    const existing = this.npcs.get(name);
    if (existing) {
      existing.place(p, yaw);
      return existing;
    }
    const n = new Npc(name, this.world!.dynamic, p, yaw);
    this.npcs.set(name, n);
    return n;
  }

  spawn(kind: RemnantKind, p: THREE.Vector3, yaw = 0): Remnant {
    const r = new Remnant(kind, this.world!.dynamic, p, yaw, this.fx);
    this.enemies.push(r);
    return r;
  }

  ghost(name: CharName, path: THREE.Vector3[], o: { speed?: number; loop?: boolean; clip?: string; always?: boolean } = {}): Ghost {
    const g = new Ghost(name, path, o.speed ?? 1.3, o.loop ?? true, o.clip ?? 'walk', this.world!.dynamic);
    g.always = o.always ?? false;
    this.echo.ghosts.push(g);
    return g;
  }

  // ================================================================ loop
  private loop = (): void => {
    requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.frame++;
    this.input.pollGamepad();
    if (!this.paused4shot) this.update(dt);
    this.engine.render();
    this.input.endFrame();
  };

  private update(dt: number): void {
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
    if (this.input.wasPressed('skip')) {
      this.skipLine?.();
      this.onCutsceneSkip?.();
    }
    const ctl = playing && this.control && !this.cine.active && !this.input.onKey;
    const world = this.world;
    // echo
    if (playing && ctl && this.input.wasPressed('echo')) {
      if (this.echo.tryEnter()) {
        this.player.fovPunch = 8;
        this.fx.burst('echo', this.player.chest, undefined, 40);
      } else if (this.echo.unlocked && !this.echo.active) {
        this.hud.chip('ECHO RECHARGING', 1);
      }
    }
    this.echo.update(dt, world);
    // player
    if (this.player && world) {
      this.player.update(dt, this.input, this.physics, cam, ctl);
      this.combat.update(dt, this.input, this.physics, this.enemies, ctl);
    }
    // npcs and enemies
    if (world) {
      for (const n of this.npcs.values()) n.update(dt, this.physics, this.player, cam.position);
      const camDir = cam.getWorldDirection(new THREE.Vector3());
      for (const e of this.enemies) e.update(dt, this.physics, this.player, { camPos: cam.position, camDir, flashlightOn: this.player.flashlightOn, echo: this.echo.t });
      this.enemies = this.enemies.filter((e) => !e.removed);
      for (const u of world.updaters) u(dt, this.time);
      // reyes covering fire
      const reyes = this.npcs.get('reyes');
      if (reyes?.shooter) this.companionFire(reyes, dt);
    }
    // triggers + interactables
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
    // cinematic camera overrides gameplay camera
    if (this.cine.active) this.updateCine(dt, cam);
    if (this.state === 'title') this.updateTitleCam(dt, cam);
    // death
    if (playing && this.player?.state === 'dead' && !this.deathHandling) {
      this.deathHandling = true;
      window.setTimeout(() => {
        this.deathHandling = false;
        void this.respawn();
      }, 2200);
    }
    // environment
    this.sky.update(cam);
    const indoor = world?.isIndoor(cam.position) ? 1 : 0;
    this.indoorK = damp(this.indoorK, indoor, 4, dt);
    this.rain.update(cam, this.indoorK);
    if (world && Math.floor(this.time * 2) !== Math.floor((this.time - dt) * 2)) audio.setRain(world.env.rain * (G.uRainDir.value < 0 ? 0.6 : 1), indoor > 0.5);
    this.lights.update(dt, this.time, this.player?.pos ?? cam.position);
    for (const b of this.billboards) b.quaternion.copy(cam.quaternion);
    if (this.moon.intensity > 0) {
      const d = (this.moon.userData.dir as THREE.Vector3) ?? new THREE.Vector3(0.3, 1, 0.2);
      const c = this.player?.pos ?? cam.position;
      this.moon.target.position.copy(c);
      this.moon.position.copy(c).addScaledVector(d, 60);
    }
    this.fx.update(dt, cam);
    // soft key/fill hovering near the camera so characters never read as pure silhouettes
    if (this.player) {
      const f = this.player.pos.clone().lerp(cam.position, 0.55);
      f.y = this.player.pos.y + 2.2;
      this.fill.position.copy(f);
      this.fill.intensity = 1.4 + (this.world?.env.hemi[2] ?? 0.3) * 0.5;
    }
    for (const m of coneMaterial.all) m.uniforms.uInt.value = m.uniforms.uInt.value; // keep reference warm
    // lightning
    if (world && world.env.rain > 0.5 && G.uRainDir.value > 0 && Math.random() < dt * 0.025) this.lightning();
    G.uFlash.value = Math.max(0, G.uFlash.value - dt * 3);
    // HUD
    if (this.player) {
      const hurt = 1 - this.player.health / this.player.maxHealth;
      this.hud.hurt(hurt * 1.1);
      this.engine.post.uDamage.value = damp(this.engine.post.uDamage.value, hurt * 0.9, 5, dt);
      if (hurt > 0.55 && playing) {
        this.heartT -= dt;
        if (this.heartT <= 0) {
          this.heartT = 1.1 - hurt * 0.4;
          audio.heartbeat(0.35 * hurt);
        }
      }
      const showCluster = playing && !this.cine.active && (this.echo.unlocked || this.combat.hasGun);
      this.hud.cluster(showCluster);
      this.hud.echo(this.echo.active ? 1 : this.echo.energy, this.echo.ready, this.echo.unlocked);
      this.hud.ammo(this.combat.hasGun && (this.player.aiming || this.enemies.length > 0), this.combat.mag, this.combat.reserve);
      this.hud.reticle(playing && this.player.aiming && !this.cine.active, this.combat.hitMarker > 0);
    }
    audio.updateListener(cam);
    if (this.echo.active) audio.setDuck(0.55);
    else audio.setDuck(1);
  }

  private companionFire(reyes: Npc, dt: number): void {
    reyes.shootCd -= dt;
    if (reyes.shootCd > 0) return;
    const live = this.enemies.filter((e) => !e.dead && e.pos.distanceTo(reyes.pos) < 25);
    if (!live.length) return;
    live.sort((a, b) => a.pos.distanceTo(reyes.pos) - b.pos.distanceTo(reyes.pos));
    const t = live[0];
    const from = reyes.pos.clone().add(new THREE.Vector3(0, 1.45, 0));
    if (!this.physics.lineOfSight(from, t.chest)) return;
    reyes.shootCd = 0.9 + Math.random() * 0.8;
    reyes.faceYaw = Math.atan2(t.pos.x - reyes.pos.x, t.pos.z - reyes.pos.z);
    const dir = t.chest.clone().sub(from).normalize();
    const muzzle = from.clone().addScaledVector(dir, 0.6);
    this.fx.muzzle(muzzle, dir, this.engine.camera);
    this.fx.tracer(muzzle, t.chest, this.engine.camera);
    audio.gunshot(muzzle, 0.8);
    if (Math.random() < 0.75) t.damage(22, from);
  }

  private updateInteract(ctl: boolean): void {
    const world = this.world!;
    const p = this.player.pos;
    let best: Interactable | null = null;
    let bestD = 1e9;
    const camDir = this.player.aimDir;
    for (const it of world.interactables) {
      if (!it.enabled) continue;
      if (it.layer === 'echo' && this.echo.t < 0.5) continue;
      if (it.layer === 'present' && this.echo.t > 0.5) continue;
      const d = it.pos.distanceTo(new THREE.Vector3(p.x, it.pos.y, p.z));
      if (Math.abs(it.pos.y - p.y - 1) > 2.2) continue;
      if (d > it.radius) continue;
      const to = it.pos.clone().sub(this.player.camPos).normalize();
      const facing = to.dot(camDir);
      const score = d - facing * 1.2;
      if (facing > 0.2 && score < bestD) {
        bestD = score;
        best = it;
      }
    }
    if (best && ctl && !this.cine.active) {
      this.hud.prompt(best.prompt, 'E', best.layer === 'echo');
      if (this.input.wasPressed('interact')) {
        this.input.consume('interact');
        best.onUse();
      }
    } else this.hud.prompt(null);
  }

  lightning(): void {
    G.uFlash.value = 1;
    this.hemi.intensity += 0.6;
    const base = this.world?.env.hemi[2] ?? 0.3;
    window.setTimeout(() => (this.hemi.intensity = base), 120);
    audio.thunder(0.3 + Math.random() * 0.6);
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
    cam.position.copy(c.pos);
    if (c.shake > 0) {
      c.shake = Math.max(0, c.shake - dt * 1.5);
      const s = c.shake * c.shake;
      cam.position.add(new THREE.Vector3(Math.sin(this.time * 37) * 0.1 * s, Math.sin(this.time * 29) * 0.1 * s, 0));
    }
    // gentle handheld drift
    cam.position.y += Math.sin(this.time * 0.9) * 0.012;
    cam.lookAt(c.look);
    if (Math.abs(cam.fov - c.fov) > 0.01) {
      cam.fov = c.fov;
      cam.updateProjectionMatrix();
    }
  }

  private updateTitleCam(dt: number, cam: THREE.PerspectiveCamera): void {
    this.titleT += dt;
    const t = this.titleT * 0.02;
    const path = this.chapter?.titleCam;
    if (path) {
      const { pos, look } = path(t);
      this.cine.pos.copy(pos);
      this.cine.look.copy(look);
      this.cine.fov = 52;
    }
    void cam;
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
        return { state: g.state, chapter: g.chapter?.id, pos: g.player?.pos.toArray(), health: g.player?.health, enemies: g.enemies.length, echo: g.echo.t };
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
        for (const c of ch.chars) await loadCharacter(c);
        g.state = 'playing';
        await g.loadWorld(ch, 'state');
        g.control = false;
        def(g);
        for (let i = 0; i < 40; i++) g.update(1 / 60);
        return { state: name };
      },
      game: g,
    };
  }

  setSkip(fn: (() => void) | null): void {
    this.skipLine = fn;
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

  async wait(sec: number): Promise<void> {
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

  async until(pred: () => boolean, poll = 80): Promise<void> {
    while (!pred()) {
      await sleep(poll);
      this.check();
    }
  }

  /** Spoken line. who: speaker label; actor names map to NPC talk animation. */
  async say(who: string, text: string, o: { radio?: boolean; dur?: number; actor?: string } = {}): Promise<void> {
    this.check();
    const dur = o.dur ?? Math.max(1.9, 1.0 + text.length * 0.056);
    const key = (o.actor ?? who).toLowerCase();
    const npc = this.g.npcs.get(key);
    const speaker = npc?.actor ?? (key === 'elias' ? this.g.player.actor : null);
    if (speaker) speaker.talking = 1;
    if (o.radio) audio.click('switch');
    this.g.hud.showSub(who, text, o.radio);
    let skipped = false;
    this.g.setSkip(() => (skipped = true));
    const end = performance.now() + dur * 1000;
    while (performance.now() < end && !skipped) {
      await sleep(50);
      this.check();
    }
    this.g.setSkip(null);
    if (speaker) speaker.talking = 0;
    this.g.hud.hideSub();
    await sleep(160);
    this.check();
  }

  async lines(list: [string, string, number?][]): Promise<void> {
    for (const [w, t, d] of list) await this.say(w, t, d ? { dur: d } : {});
  }

  thought(text: string, dur = 3.2): Promise<void> {
    return this.say('', text, { dur });
  }

  objective(loc: string, text: string): void {
    this.g.hud.objective(loc, text);
  }

  control(on: boolean): void {
    this.g.control = on;
    if (!on) {
      this.g.player.aiming = false;
      this.g.player.vel.set(0, this.g.player.vel.y, 0);
    }
  }

  async zone(min: [number, number, number], max: [number, number, number]): Promise<void> {
    const box = new THREE.Box3(new THREE.Vector3(...min), new THREE.Vector3(...max));
    await this.until(() => box.containsPoint(this.g.player.pos.clone().add(new THREE.Vector3(0, 0.9, 0))));
  }

  near(p: THREE.Vector3, r: number): Promise<void> {
    return this.until(() => this.g.player.pos.distanceTo(p) < r);
  }

  /** Register an interactable and await its use. */
  use(id: string, pos: THREE.Vector3, prompt: string, o: { radius?: number; layer?: 'echo' | 'present'; keep?: boolean } = {}): Promise<void> {
    return new Promise((res, rej) => {
      const it = this.world.interact({
        id, pos, prompt, radius: o.radius ?? 1.8, layer: o.layer,
        onUse: () => {
          if (!o.keep) it.enabled = false;
          res();
        },
      });
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
    this.g.player.snapCamera();
    if (o.keepControlAfter !== false) this.control(true);
  }

  cam(pos: THREE.Vector3, look: THREE.Vector3, fov = 45): void {
    const c = this.g.cine;
    c.active = true;
    c.tween = null;
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
    return new Promise<void>((res) => {
      c.tween = { t: 0, dur, p0: c.pos.clone(), p1: pos.clone(), l0: c.look.clone(), l1: look.clone(), f0: c.fov, f1: fov ?? c.fov, ease, done: res };
    }).then(() => this.check());
  }

  shake(v: number): void {
    this.g.cine.shake = Math.max(this.g.cine.shake, v);
    this.g.player.trauma = Math.min(1, this.g.player.trauma + v * 0.5);
  }

  async fade(to: number, sec = 1, white = false): Promise<void> {
    await this.g.hud.fade(to, sec, white);
    this.check();
  }

  async card(num: string, title: string, sub = ''): Promise<void> {
    await this.g.hud.chapterCard(num, title, sub);
    this.check();
  }

  checkpoint(pos?: THREE.Vector3, yaw?: number): void {
    this.g.checkpoint.pos.copy(pos ?? this.g.player.pos);
    this.g.checkpoint.yaw = yaw ?? this.g.player.yaw;
  }

  /** Encounter: spawns, waits until all dead; on death the whole wave restarts at the checkpoint. */
  async fight(spawns: { kind: RemnantKind; pos: THREE.Vector3; yaw?: number; delay?: number }[], o: { music?: boolean } = {}): Promise<void> {
    const bed = o.music !== false ? audio.tensionBed(0.1) : null;
    try {
      while (true) {
        const epoch = this.g.encounterEpoch;
        const mine: Remnant[] = [];
        for (const sp of spawns) {
          if (sp.delay) await this.wait(sp.delay);
          if (epoch !== this.g.encounterEpoch) break;
          mine.push(this.g.spawn(sp.kind, sp.pos, sp.yaw ?? 0));
        }
        await this.until(() => epoch !== this.g.encounterEpoch || mine.every((m) => m.dead));
        if (epoch === this.g.encounterEpoch) break;
        await this.wait(1.5);
      }
    } finally {
      bed?.stop(2);
    }
    await this.wait(0.8);
  }

  async waitEcho(active = true): Promise<void> {
    await this.until(() => this.g.echo.active === active);
  }
}
