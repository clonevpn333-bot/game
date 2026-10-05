import * as THREE from 'three';
import { Input } from '../core/Input';
import { Loop } from '../core/Loop';
import { createPipeline, type RenderPipeline } from '../core/Renderer';
import { Path } from '../world/Path';
import { Terrain } from '../world/Terrain';
import { BannerTime, City } from '../world/City';
import { FarWorld } from '../world/FarWorld';
import { Sky, SKY_PALETTES } from '../world/Sky';
import { Weather } from '../world/Weather';
import { Founder } from '../world/Founder';
import { RetroUniforms } from '../world/Materials';
import { Player } from '../entities/Player';
import { Enemy, Knellwarden, Marrowmite, type EnemyCtx } from '../entities/Enemies';
import { Dog, Flock, Folk } from '../entities/Npc';
import { Nav } from './Nav';
import { Chapter } from './Chapter1';
import { CameraRig } from '../systems/CameraRig';
import { Vfx } from '../systems/Vfx';
import { Audio } from '../systems/Audio';
import { Hud } from '../systems/Hud';
import { LightPool } from '../systems/LightPool';
import { EventBus } from '../systems/Combat';
import { createSeededRandom } from '../utils/random';
import { damp } from '../utils/math';

export type GameMode = 'loading' | 'title' | 'play' | 'paused' | 'dead' | 'ending';

const $ = (sel: string): HTMLElement => {
  const el = document.querySelector<HTMLElement>(sel);
  if (!el) throw new Error(`Missing ${sel}`);
  return el;
};

export class Game {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(55, 1, 0.3, 12000);
  readonly pipeline: RenderPipeline;
  readonly input: Input;
  readonly bus = new EventBus();
  readonly path = new Path();
  readonly nav = new Nav(this.path);
  /** Tilt pivot (world) → worldRoot (gameplay space). Tilting the pivot tilts the city, not the sky. */
  readonly tiltPivot = new THREE.Group();
  readonly worldRoot = new THREE.Group();
  readonly terrain: Terrain;
  readonly city: City;
  readonly far = new FarWorld();
  readonly sky = new Sky();
  readonly weather = new Weather();
  readonly founder: Founder;
  readonly player: Player;
  readonly enemies: Enemy[] = [];
  readonly folk: Folk[] = [];
  readonly dog = new Dog();
  readonly flock: Flock;
  readonly cam: CameraRig;
  readonly vfx: Vfx;
  readonly audio = new Audio();
  readonly hud = new Hud();
  readonly lights: LightPool;
  readonly moon = new THREE.DirectionalLight('#b4c4ff', 3.4);
  readonly hemi = new THREE.HemisphereLight('#5868a8', '#2a1c12', 1.5);
  readonly fill = new THREE.DirectionalLight('#c8b0a0', 0.9);
  readonly chapter: Chapter;
  readonly boss = new Knellwarden();
  mode: GameMode = 'loading';
  rng = createSeededRandom(1);
  tilt = 0;
  tiltTarget = 0;
  tiltWobble = 0;
  timeScale = 1;
  private hitstopT = 0;
  private slowmoT = 0;
  private frame = 0;
  private elapsed = 0;
  private gameTime = 0;
  pausedForScreenshot = false;
  reducedMotion = false;
  private readonly loop: Loop;
  private readonly look = new THREE.Vector2();
  private readonly tmp = new THREE.Vector3();
  private readonly tmp2 = new THREE.Vector3();
  private readonly fogColor = new THREE.Color('#1b2347');
  fogDensity = 0.0006;
  private fogDensityCur = 0.0006;
  private deathT = 0;
  readonly farTint = new THREE.Color(1, 1, 1);
  private readonly farTintTarget = new THREE.Color(1, 1, 1);
  readonly ctx: EnemyCtx;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.pipeline = createPipeline(canvas, this.scene, this.camera);
    this.input = new Input(canvas);
    this.cam = new CameraRig(this.camera);
    this.scene.add(this.tiltPivot);
    this.tiltPivot.add(this.worldRoot);
    this.scene.fog = new THREE.FogExp2(this.fogColor, this.fogDensity);
    this.scene.background = new THREE.Color('#05060c');

    this.terrain = new Terrain(this.path);
    this.city = new City(this.path);
    this.city.addCracks(['broken', 'stair']);
    this.founder = new Founder(this.city.plazaCenter);
    this.worldRoot.add(this.terrain.group, this.city.group, this.founder.group);
    this.scene.add(this.sky.mesh, this.far.group, this.weather.group);
    this.nav.obstacles.push(...this.city.obstacles);

    // Pivot the tilt on the market so the city heels over around the player, not the origin.
    const pivot = this.city.marketCenter.clone();
    this.tiltPivot.position.copy(pivot);
    this.worldRoot.position.copy(pivot).negate();

    this.player = new Player(this.nav, this.bus);
    this.worldRoot.add(this.player.group);
    this.scene.add(this.player.cloak.mesh, this.boss.cape.mesh);
    this.vfx = new Vfx(this.worldRoot);
    this.worldRoot.add(this.vfx.group);

    this.chapter = new Chapter(this);
    this.lights = new LightPool([...this.terrain.torches, ...this.city.torches, ...this.chapter.candleSpots], this.city.lanternSpots, 6);
    this.worldRoot.add(this.lights.group);
    this.chapter.bindCandles(this.lights, this.terrain.torches.length + this.city.torches.length);

    // Crows roosting on the market roofs.
    const perches: THREE.Vector3[] = [];
    const mrng = createSeededRandom(12);
    for (let i = 0; i < 26; i += 1) {
      const s = this.path.at(this.path.zoneStart('street') + 10 + mrng() * 110);
      const side = mrng() < 0.5 ? -1 : 1;
      perches.push(s.pos.clone().addScaledVector(s.right, side * (s.width / 2 + 4 + mrng() * 6)).setY(s.pos.y + 13 + mrng() * 5));
    }
    this.flock = new Flock(perches);
    this.worldRoot.add(this.flock.mesh, this.dog.group);

    // Lighting: blue moonlight key with one shadow map that follows the player.
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(2048, 2048);
    const sc = this.moon.shadow.camera;
    sc.left = -42;
    sc.right = 42;
    sc.top = 42;
    sc.bottom = -42;
    sc.near = 1;
    sc.far = 400;
    this.moon.shadow.bias = -0.0004;
    this.moon.shadow.normalBias = 0.04;
    this.scene.add(this.moon, this.moon.target, this.hemi, this.fill, this.fill.target);
    this.scene.environment = this.buildEnvironment();
    this.scene.environmentIntensity = 0.6;

    this.ctx = {
      player: this.player,
      nav: this.nav,
      bus: this.bus,
      vfx: this.vfx,
      shake: (a) => this.cam.addTrauma(a),
      hitstop: (ms) => this.hitstop(ms),
      rng: () => this.rng(),
      spawnMite: (p) => {
        const m = this.spawnMite(p, 'boss');
        m.emerge(0.2);
      },
    };
    this.wireEvents();
    this.wireUi();
    this.weather.onStrike = (d) => this.audio.thunder(d);
    this.loop = new Loop(
      (dt, t) => this.update(dt, t),
      () => this.render(),
    );
    this.installTestHooks();
  }

  private buildEnvironment(): THREE.Texture {
    const envScene = new THREE.Scene();
    const g = new THREE.SphereGeometry(10, 32, 16);
    const colors: number[] = [];
    const p = g.attributes.position as THREE.BufferAttribute;
    const top = new THREE.Color('#2a3a70');
    const hor = new THREE.Color('#8a6a5a');
    const bot = new THREE.Color('#0a0806');
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i += 1) {
      const y = p.getY(i) / 10;
      if (y > 0) c.copy(hor).lerp(top, Math.pow(y, 0.5));
      else c.copy(hor).lerp(bot, Math.pow(-y, 0.4));
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    envScene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const pmrem = new THREE.PMREMGenerator(this.pipeline.renderer);
    const tex = pmrem.fromScene(envScene, 0.02).texture;
    pmrem.dispose();
    return tex;
  }

  start(): void {
    this.pipeline.resize(this.camera, 2);
    this.chapter.setupTitle();
    this.mode = 'title';
    $('#loading').classList.add('hidden');
    this.loop.start();
  }

  // ------------------------------------------------------------------ entities
  spawnMite(p: THREE.Vector3, encounter: string): Marrowmite {
    const m = new Marrowmite();
    m.encounter = encounter;
    m.place(p, 0);
    this.worldRoot.add(m.group);
    this.enemies.push(m);
    return m;
  }

  addEnemy(e: Enemy): void {
    this.worldRoot.add(e.group);
    this.enemies.push(e);
  }

  removeEnemies(filter: (e: Enemy) => boolean): void {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const e = this.enemies[i];
      if (filter(e)) {
        e.group.removeFromParent();
        if (e !== this.boss) e.group.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
        this.enemies.splice(i, 1);
      }
    }
  }

  hitstop(ms: number): void {
    if (this.reducedMotion) return;
    this.hitstopT = Math.max(this.hitstopT, ms / 1000);
    this.audio.duck(0.6, ms / 1000 + 0.1);
  }

  slowmo(seconds: number): void {
    this.slowmoT = seconds;
  }

  // ------------------------------------------------------------------ events → feedback
  private wireEvents(): void {
    const a = this.audio;
    this.bus.on((e) => {
      switch (e.type) {
        case 'swing':
          a.swing(e.heavy);
          if (e.heavy) this.cam.punch(2);
          break;
        case 'hit-enemy':
          break;
        case 'hit-player':
          a.hurt(e.heavy);
          this.vfx.sparks(e.pos, 10, '#ff6040', 5);
          this.cam.punch(e.heavy ? 5 : 3);
          this.hurtPulse = 1;
          break;
        case 'blocked-roll':
          break;
        case 'roll':
          a.roll();
          this.vfx.dust(e.pos, 4, 0.5);
          break;
        case 'flask':
          a.flask();
          this.vfx.holyMotes(e.pos, 22);
          this.vfx.impact(e.pos.clone().setY(e.pos.y + 1.2), 0.5, '#ffb060');
          break;
        case 'footstep':
          a.footstep(e.pos, e.heavy, true);
          break;
        case 'hoof':
          a.hoof(e.pos);
          break;
        case 'enemy-telegraph':
          a.telegraph(e.pos, e.kind);
          break;
        case 'enemy-attack':
          if (e.kind.startsWith('boss') || e.kind.startsWith('penitent')) a.swing(e.kind.startsWith('boss'));
          break;
        case 'slam':
          a.slam(e.pos);
          break;
        case 'toll':
          a.toll(e.pos, this.boss.alive && e.pos.distanceTo(this.boss.pos) < 2);
          break;
        case 'player-dead':
          this.onPlayerDead();
          break;
        case 'enemy-dead':
          this.chapter.onEnemyDead(e.kind);
          if (e.kind === 'boss') a.stinger('victory');
          break;
      }
    });
    // Wrap enemy hits for contact feedback (sparks, hitstop, sound).
    const orig = Enemy.prototype.takeHit;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const game = this;
    Enemy.prototype.takeHit = function (this: Enemy, hit) {
      const wasAlive = this.alive;
      const before = this.hp;
      orig.call(this, hit);
      if (this.hp < before) {
        const p = this.focusPoint(new THREE.Vector3());
        if (this.kind === 'mite') game.vfx.ichor(p, 10);
        game.vfx.sparks(p, hit.heavy ? 22 : 12, this.kind === 'mite' ? '#ffb070' : '#ffe0b0', hit.heavy ? 9 : 7);
        game.vfx.impact(p, hit.heavy ? 1.2 : 0.7);
        game.audio.hit(p, this.kind, hit.heavy);
        game.hitstop(hit.heavy ? 95 : 55);
        game.cam.addTrauma(hit.heavy ? 0.35 : 0.18);
        if (wasAlive && !this.alive) game.cam.addTrauma(0.2);
      }
    };
  }

  hurtPulse = 0;

  // ------------------------------------------------------------------ UI wiring
  private wireUi(): void {
    const click = (id: string, fn: () => void) =>
      $(id).addEventListener('click', (e) => {
        e.stopPropagation();
        this.audio.unlock();
        this.audio.ui();
        fn();
      });
    click('#btn-begin', () => this.beginGame());
    click('#btn-controls', () => this.showScreen('#controls-screen'));
    click('#btn-controls-back', () => {
      $('#controls-screen').classList.add('hidden');
      if (this.mode === 'paused') $('#pause-screen').classList.remove('hidden');
    });
    const soundBtns = ['#btn-sound', '#btn-pause-sound'];
    const toggleSound = () => {
      this.audio.setMuted(!this.audio.muted);
      for (const b of soundBtns) $(b).textContent = `Sound: ${this.audio.muted ? 'Off' : 'On'}`;
    };
    click('#btn-sound', toggleSound);
    click('#btn-pause-sound', toggleSound);
    click('#btn-resume', () => this.setPaused(false));
    click('#btn-retry', () => {
      this.setPaused(false);
      this.chapter.respawn();
    });
    click('#btn-pause-controls', () => {
      $('#pause-screen').classList.add('hidden');
      $('#controls-screen').classList.remove('hidden');
    });
    click('#btn-again', () => window.location.reload());
    click('#pause-button', () => this.setPaused(this.mode !== 'paused'));
    window.addEventListener('pointerdown', () => this.audio.unlock(), { once: true });
    window.addEventListener('keydown', () => this.audio.unlock(), { once: true });
    if (matchMedia('(pointer: coarse)').matches) {
      $('#touch-controls').dataset.touch = '1';
      this.input.usingTouch = true;
    }
  }

  private showScreen(sel: string): void {
    $(sel).classList.remove('hidden');
  }

  beginGame(): void {
    if (this.mode !== 'title') return;
    $('#title-screen').classList.add('hidden');
    this.hud.fade(1, 0.8);
    window.setTimeout(() => {
      this.chapter.begin();
      this.mode = 'play';
      this.hud.show(true);
      if (this.input.usingTouch) $('#touch-controls').classList.remove('hidden');
      this.hud.fade(0, 2.2);
    }, 850);
  }

  setPaused(p: boolean): void {
    if (p && this.mode === 'play') {
      this.mode = 'paused';
      $('#pause-screen').classList.remove('hidden');
      this.input.releasePointer();
    } else if (!p && this.mode === 'paused') {
      this.mode = 'play';
      $('#pause-screen').classList.add('hidden');
      $('#controls-screen').classList.add('hidden');
    }
  }

  private onPlayerDead(): void {
    this.mode = 'dead';
    this.deathT = 0;
    $('#death-screen').classList.remove('hidden');
    this.audio.stinger('death');
    this.hud.setReticle(null);
  }

  showEnd(): void {
    this.mode = 'ending';
    this.input.releasePointer();
    $('#end-screen').classList.remove('hidden');
    $('#touch-controls').classList.add('hidden');
    this.hud.show(false);
  }

  // ------------------------------------------------------------------ loop
  private update(rawDt: number, _time: number): void {
    this.frame += 1;
    this.pipeline.resize(this.camera, 2);
    if (this.pausedForScreenshot) {
      this.publishDiagnostics();
      return;
    }
    this.elapsed += rawDt;
    const dt = rawDt;
    this.input.update(dt);
    if (this.input.consume('pause')) {
      if (this.mode === 'play') this.setPaused(true);
      else if (this.mode === 'paused') this.setPaused(false);
    }
    if (this.mode === 'title' && this.input.anyKeyPressed && this.input.peek('interact')) this.beginGame();

    // Hitstop scales gameplay only; camera/HUD keep the real delta.
    if (this.hitstopT > 0) {
      this.hitstopT -= dt;
      this.timeScale = 0.06;
      if (this.hitstopT <= 0) this.timeScale = 1;
    } else if (this.slowmoT > 0) {
      this.slowmoT -= dt;
      this.timeScale = 0.3;
    } else this.timeScale = 1;
    const running = this.mode === 'play' || this.mode === 'dead' || this.mode === 'ending' || this.mode === 'title';
    const gdt = running ? dt * this.timeScale : 0;
    this.gameTime += gdt;
    const t = this.gameTime;
    const animT = this.reducedMotion ? 0 : t;

    if (this.mode === 'play' || this.mode === 'dead' || this.mode === 'title' || this.mode === 'ending') {
      this.chapter.update(gdt, t);
      if (this.mode === 'play' || this.mode === 'dead') this.player.update(gdt, t, this.input, this.cam.yaw, this.enemies);
      else this.player.update(gdt, t, this.input, this.cam.yaw, []);
      for (const e of this.enemies) e.update(gdt, t, this.ctx);
      this.separate();
      this.removeEnemies((e) => e.removed);
      for (const f of this.folk) f.update(gdt, t, this.nav, this.tilt);
      this.dog.update(gdt, t, this.nav);
      this.flock.update(gdt, t);
    }
    // Tilt: the whole city heels over, with aftershock wobble.
    this.tiltWobble *= Math.exp(-0.6 * gdt);
    const wob = Math.sin(t * 3.1) * this.tiltWobble;
    this.tilt = damp(this.tilt, this.tiltTarget + wob, 1.4, gdt);
    this.tiltPivot.rotation.z = this.tilt;
    this.tiltPivot.rotation.x = this.tilt * 0.35;
    if (Math.abs(this.tilt) > 0.015 && this.player.state !== 'ride') {
      // Gravity slides the knight toward the low side.
      this.player.pos.x -= this.tilt * 9 * gdt;
    }

    // Camera.
    this.input.takeLook(this.look);
    if (this.mode !== 'play') this.look.set(0, 0);
    const focus = this.worldRoot.localToWorld(this.tmp.copy(this.player.pos));
    let lockWorld: THREE.Vector3 | null = null;
    if (this.player.lockTarget) lockWorld = this.worldRoot.localToWorld(this.player.lockTarget.focusPoint(this.tmp2));
    const sp = Math.hypot(this.player.velocity.x, this.player.velocity.z);
    this.cam.update(dt, focus, this.look, {
      mounted: this.player.mounted,
      moving: sp > 1,
      heading: this.player.yaw,
      lock: lockWorld,
      groundY: focus.y,
    });
    this.camera.updateMatrixWorld();

    // Sword trail.
    const swinging = this.player.isSwinging();
    const base = this.player.rig.sword.localToWorld(new THREE.Vector3(0, 0.15, 0));
    const tip = this.player.rig.swordTip.getWorldPosition(new THREE.Vector3());
    this.vfx.updateTrail(swinging, base, tip, this.player.attackHeavy);

    // Lights follow the player.
    const lp = focus;
    this.moon.position.set(lp.x - 50, lp.y + 70, lp.z - 95);
    this.moon.target.position.copy(lp);
    this.fill.position.copy(this.camera.position).add(new THREE.Vector3(0, 6, 0));
    this.fill.target.position.copy(lp);
    this.lights.update(dt, t, this.player.pos, 1);

    // Atmosphere.
    this.fogDensityCur = damp(this.fogDensityCur, this.fogDensity, 0.6, dt);
    const fog = this.scene.fog as THREE.FogExp2;
    fog.density = this.fogDensityCur;
    fog.color.copy(this.sky.uniforms.uHorizon.value).multiplyScalar(0.8).lerp(new THREE.Color('#ffffff'), this.weather.lightning * 0.15);
    this.farTint.lerp(this.farTintTarget, 1 - Math.exp(-dt * 0.8));
    this.sky.uniforms.uLightning.value = this.weather.lightning;
    this.sky.update(dt, t, this.camera.position);
    this.far.update(this.weather.lightning, this.farTint);
    this.weather.update(dt, t, this.camera.position);
    this.terrain.update(dt, animT);
    BannerTime.value = animT;
    this.moon.intensity = 3.4 + this.weather.lightning * 6;
    this.vfx.update(gdt);
    this.scene.updateMatrixWorld();
    this.player.cloak.update(Math.max(gdt, 0.0001), t);
    if (this.boss.group.parent) this.boss.cape.update(Math.max(gdt, 0.0001), t);
    this.founder.update(dt, t, this.chapter.stir);

    // Grade.
    this.hurtPulse = Math.max(0, this.hurtPulse - dt * 1.8);
    const g = this.pipeline.grade.uniforms;
    g.uTime.value = this.elapsed;
    const lowHp = this.player.hp / this.player.maxHp < 0.3 && this.mode === 'play' ? 0.25 + Math.sin(this.elapsed * 4) * 0.08 : 0;
    g.uHurt.value = Math.max(this.hurtPulse * 0.7, lowHp);
    g.uFlash.value = this.weather.lightning * 0.08;
    g.uChroma.value = this.hurtPulse * 0.01 + (this.hitstopT > 0 ? 0.004 : 0);

    // HUD.
    if (this.mode === 'play') {
      this.hud.setVitals(Math.ceil(this.player.hp), this.player.maxHp, this.player.stamina, this.player.maxStamina, this.player.flasks);
      if (this.player.lockTarget) {
        const p = this.worldRoot.localToWorld(this.player.lockTarget.focusPoint(new THREE.Vector3())).project(this.camera);
        if (p.z < 1) this.hud.setReticle((p.x * 0.5 + 0.5) * this.canvas.clientWidth, (-p.y * 0.5 + 0.5) * this.canvas.clientHeight);
        else this.hud.setReticle(null);
      } else this.hud.setReticle(null);
    }
    this.hud.update(dt);

    // Death flow.
    if (this.mode === 'dead') {
      this.deathT += dt;
      if (this.deathT > 2.6 && this.deathT - dt <= 2.6) this.hud.fade(1, 0.8);
      if (this.deathT > 3.5) {
        $('#death-screen').classList.add('hidden');
        this.chapter.respawn();
        this.mode = 'play';
        this.hud.fade(0, 1.2);
      }
    }

    // Audio.
    this.audio.listener.copy(this.camera.position);
    this.audio.listenerYaw = this.cam.yaw;
    this.audio.update(dt);
    RetroUniforms.uWobble.value = this.reducedMotion ? 0 : 1;
    RetroUniforms.uSnap.value.set(this.canvas.clientWidth / 3.2, this.canvas.clientHeight / 3.2);
    this.publishDiagnostics();
  }

  /** Push overlapping combatants apart. */
  private separate(): void {
    const all: Array<{ pos: THREE.Vector3; r: number; alive: boolean }> = [
      { pos: this.player.pos, r: 0.45, alive: this.player.state !== 'dead' },
      ...this.enemies.map((e) => ({ pos: e.pos, r: e.radius, alive: e.alive && e.state !== 'dormant' })),
    ];
    for (let i = 0; i < all.length; i += 1) {
      for (let j = i + 1; j < all.length; j += 1) {
        const a = all[i];
        const b = all[j];
        if (!a.alive || !b.alive) continue;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const d = Math.hypot(dx, dz);
        const min = a.r + b.r;
        if (d < min && d > 1e-4) {
          const push = (min - d) / 2;
          const wa = i === 0 ? 0.3 : 0.5;
          a.pos.x -= (dx / d) * push * wa * 2;
          a.pos.z -= (dz / d) * push * wa * 2;
          b.pos.x += (dx / d) * push * (2 - wa * 2);
          b.pos.z += (dz / d) * push * (2 - wa * 2);
        }
      }
    }
  }

  setPalette(name: keyof typeof SKY_PALETTES, instant = false): void {
    this.sky.setPalette(SKY_PALETTES[name], instant);
    const tints: Record<string, string> = { night: '#ffffff', city: '#e8d8e8', tremor: '#ffb0a0', eye: '#ffd8a0' };
    this.farTintTarget.set(tints[name]);
    if (instant) this.farTint.copy(this.farTintTarget);
    const hemi: Record<string, [string, string, number]> = {
      night: ['#5868a8', '#2a1c12', 1.5],
      city: ['#54508e', '#4a2a14', 1.5],
      tremor: ['#6a3a58', '#6a2008', 1.6],
      eye: ['#7a5a40', '#7a4a10', 1.7],
    };
    const [sky, ground, i] = hemi[name];
    this.hemi.color.set(sky);
    this.hemi.groundColor.set(ground);
    this.hemi.intensity = i;
  }

  private render(): void {
    this.pipeline.render();
  }

  private publishDiagnostics(): void {
    const info = this.pipeline.renderer.info;
    window.__THREE_GAME_DIAGNOSTICS__ = {
      frame: this.frame,
      elapsed: this.elapsed,
      score: this.chapter.progressIndex,
      targetScore: 8,
      complete: this.mode === 'ending',
      player: {
        position: { x: this.player.pos.x, y: this.player.pos.y, z: this.player.pos.z },
        speed: this.player.velocity.length(),
      },
      renderer: {
        calls: info.render.calls,
        triangles: info.render.triangles,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      },
      canvas: {
        clientWidth: this.canvas.clientWidth,
        clientHeight: this.canvas.clientHeight,
        width: this.canvas.width,
        height: this.canvas.height,
        dpr: this.pipeline.renderer.getPixelRatio(),
      },
      // Extra fields for QA.
      ...({
        mode: this.mode,
        stage: this.chapter.stage,
        hp: this.player.hp,
        stamina: this.player.stamina,
        playerState: this.player.state,
        enemies: this.enemies.filter((e) => e.alive).length,
        bossHp: this.boss.hp,
        s: this.path.samples[this.player.pathIndex]?.s ?? 0,
        flags: this.chapter.flags,
      } as object),
    } as ThreeGameDiagnostics;
  }

  private installTestHooks(): void {
    window.__THREE_GAME_TEST_HOOKS__ = {
      seed: (value: number) => {
        this.rng = createSeededRandom(value);
      },
      setState: async (name: string) => {
        const map: Record<string, string> = { 'active-play': 'combat' };
        const stage = map[name] ?? name;
        $('#title-screen').classList.add('hidden');
        $('#death-screen').classList.add('hidden');
        $('#end-screen').classList.add('hidden');
        $('#pause-screen').classList.add('hidden');
        if (stage === 'title') {
          window.location.hash = '';
        }
        this.chapter.jumpTo(stage);
        if (stage !== 'title') {
          this.mode = stage === 'ending' ? 'ending' : 'play';
          this.hud.show(stage !== 'ending');
          this.hud.fade(0, 0.01);
          if (stage === 'death') {
            this.mode = 'dead';
            this.deathT = 0;
            $('#death-screen').classList.remove('hidden');
          }
        }
        // Run simulation frames so the scene settles (cloth, cameras, fades).
        const steps = stage === 'ending' ? 260 : 90;
        for (let i = 0; i < steps; i += 1) this.update(1 / 60, 0);
        this.render();
        this.publishDiagnostics();
        return { state: name };
      },
      setPausedForScreenshot: (paused: boolean) => {
        this.pausedForScreenshot = paused;
      },
      setReducedMotion: (enabled: boolean) => {
        this.reducedMotion = enabled;
        this.cam.reducedMotion = enabled;
        this.render();
        this.publishDiagnostics();
      },
      hideDebugUi: () => undefined,
    };
  }

  dispose(): void {
    this.loop.stop();
    this.input.dispose();
    this.pipeline.renderer.dispose();
  }
}
