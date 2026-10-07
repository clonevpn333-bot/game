import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RenderPipeline } from '../core/Renderer';
import { Input } from '../core/Input';
import { Audio } from '../core/Audio';
import { Loop } from '../core/Loop';
import { Sky } from '../render/Sky';
import { Particles } from '../render/Particles';
import { UI } from '../ui/UI';
import { CameraDirector } from './CameraDirector';
import { Aborted, type Chapter } from './Chapter';
import { hitStop } from '../actors/Warden';
import { CHAPTERS, TitleReel } from './chapters';
import { updateFogBanks } from '../world/World';
import { Bot } from './Bot';

const SAVE_KEY = 'last-procession-progress';

/** Named states for screenshot/QA hooks: [chapter index, checkpoint]. */
const STATES: Record<string, [number, string]> = {
  title: [-1, ''],
  'active-play': [1, 'escape'],
  prologue: [0, 'intro'],
  kneeling: [0, 'kneel'],
  catch: [0, 'run'],
  'city-escape': [1, 'escape'],
  'city-fight': [1, 'alley'],
  'city-bridge': [1, 'bridge'],
  'horse-ride': [2, 'ride'],
  'ridge': [2, 'ridge'],
  campfire: [3, 'explore'],
  'campfire-talk': [3, 'talk'],
  'train-talk': [4, 'deck'],
  'train-fight': [4, 'roof'],
  climb: [5, 'climb'],
  fall: [6, 'fall'],
  reveal: [6, 'reveal'],
  battlefield: [7, 'battle'],
  duel: [7, 'duel'],
  finale: [7, 'farewell'],
};

export class Game {
  readonly scene = new THREE.Scene();
  readonly cam: CameraDirector;
  readonly pipeline: RenderPipeline;
  readonly input: Input;
  readonly audio = new Audio();
  readonly sky: Sky;
  readonly particles: Particles;
  readonly ui = new UI();
  private readonly loop: Loop;
  chapter: Chapter | null = null;
  chapterIndex = -1;
  timeScale = 1;
  realDt = 0;
  paused = false;
  private pausedForScreenshot = false;
  private frameNo = 0;
  private elapsed = 0;
  private runToken = 0;
  inMenu = true;
  failCount = 0;
  private simulating = false;
  private readonly events: string[] = [];
  private unlocked = 1;
  private readonly startTime = performance.now();

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.cam = new CameraDirector(innerWidth / innerHeight);
    this.pipeline = new RenderPipeline(canvas, this.scene, this.cam.camera);
    const pmrem = new THREE.PMREMGenerator(this.pipeline.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();
    this.input = new Input(canvas, document.querySelector('#touch-controls')!);
    this.sky = new Sky(this.scene);
    this.particles = new Particles(this.scene);
    this.loop = new Loop((dt) => this.update(dt), () => this.render());
    try {
      this.unlocked = Math.max(1, Number(localStorage.getItem(SAVE_KEY) ?? '1') || 1);
    } catch {
      this.unlocked = 1;
    }
    this.bindMenus();
    this.installHooks();
  }

  start(): void {
    this.ui.setFadeInstant(1);
    this.loop.start();
    void this.showTitle();
  }

  // ------------------------------------------------------------------ menus
  private bindMenus(): void {
    const on = (sel: string, fn: () => void) => document.querySelector(sel)!.addEventListener('click', (e) => {
      e.stopPropagation();
      this.audio.unlock();
      this.audio.sfx('ui');
      fn();
    });
    on('#btn-begin', () => void this.beginFrom(0, ''));
    on('#btn-chapters', () => this.openChapterSelect());
    on('#btn-chapters-back', () => this.ui.showScreen(this.ui.chapterSelectEl, false));
    on('#btn-sound', () => this.toggleSound());
    on('#btn-pause-sound', () => this.toggleSound());
    on('#btn-resume', () => this.setPaused(false));
    on('#btn-retry', () => {
      this.setPaused(false);
      if (this.chapter) void this.runChapter(this.chapterIndex, this.chapter.lastCheckpoint || this.chapter.checkpoints[0]);
    });
    on('#btn-pause-chapters', () => this.openChapterSelect());
    on('#btn-quit', () => {
      this.setPaused(false);
      void this.showTitle();
    });
    on('#pause-button', () => this.setPaused(!this.paused));
    document.addEventListener('pointerdown', () => this.audio.unlock(), { once: false, passive: true });
    addEventListener('keydown', () => this.audio.unlock());
  }

  private toggleSound(): void {
    this.audio.setMuted(!this.audio.muted);
    const label = `Sound: ${this.audio.muted ? 'Off' : 'On'}`;
    document.querySelector('#btn-sound')!.textContent = label;
    document.querySelector('#btn-pause-sound')!.textContent = label;
  }

  private openChapterSelect(): void {
    const list = document.querySelector('#chapter-list')!;
    list.innerHTML = '';
    const debug = new URLSearchParams(location.search).has('all');
    CHAPTERS.forEach((C, i) => {
      const meta = C.meta;
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      const locked = i >= this.unlocked && !debug;
      b.disabled = locked;
      b.style.opacity = locked ? '0.35' : '1';
      b.innerHTML = `<span class="cn">${meta.num}</span><span class="ct">${locked ? '— — —' : meta.title}</span><span class="cs">${locked ? 'not yet witnessed' : meta.subtitle}</span>`;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.audio.unlock();
        this.audio.sfx('confirm');
        this.ui.showScreen(this.ui.chapterSelectEl, false);
        this.setPaused(false);
        void this.beginFrom(i, '');
      });
      li.appendChild(b);
      list.appendChild(li);
    });
    this.ui.showScreen(this.ui.chapterSelectEl, true);
  }

  setPaused(p: boolean): void {
    if (this.inMenu) return;
    this.paused = p;
    this.ui.showScreen(this.ui.pauseEl, p);
    if (!p) this.ui.showScreen(this.ui.chapterSelectEl, false);
  }

  setCinematic(on: boolean): void {
    this.ui.setLetterbox(on);
    this.ui.hudVisible(!on);
    this.input.enabled = !on;
    this.input.canvasClickAttacks = !on;
    document.body.classList.toggle('playing', !on && !this.inMenu);
  }

  // ------------------------------------------------------------------ flow
  async showTitle(): Promise<void> {
    this.inMenu = true;
    this.ui.clearGameplay();
    this.ui.subtitle(null);
    this.ui.showScreen(this.ui.creditsEl, false);
    this.ui.showScreen(this.ui.pauseEl, false);
    this.ui.pauseBtn.classList.add('hidden');
    this.ui.setLetterbox(false);
    document.body.classList.remove('playing');
    const reel = new TitleReel(this);
    this.swapChapter(reel, -1);
    reel.script('loop').catch(() => {
      /* aborted when the film starts */
    });
    this.ui.showScreen(this.ui.titleEl, true);
    await this.ui.fade(0, 2);
  }

  async beginFrom(index: number, from: string): Promise<void> {
    this.audio.unlock();
    this.ui.showScreen(this.ui.titleEl, false);
    this.ui.showScreen(this.ui.chapterSelectEl, false);
    this.inMenu = false;
    this.ui.pauseBtn.classList.remove('hidden');
    await this.runChapter(index, from);
  }

  private swapChapter(c: Chapter, index: number): void {
    if (this.chapter) this.chapter.dispose();
    this.particles.clear();
    this.audio.clearAmbience();
    this.timeScale = 1;
    this.chapter = c;
    this.chapterIndex = index;
    c.mount();
  }

  /** Wait on game time (so the QA simulator and pause stay consistent). */
  private gameWait(seconds: number): Promise<void> {
    const end = this.elapsed + seconds;
    return new Promise((resolve) => this.gameWaiters.push({ end, resolve }));
  }
  private gameWaiters: { end: number; resolve: () => void }[] = [];

  async runChapter(index: number, from: string): Promise<void> {
    const token = ++this.runToken;
    this.ui.clearGameplay();
    this.ui.subtitle(null);
    this.ui.chapterCard(null);
    this.ui.caption(null);
    void this.ui.fade(1, 0.6);
    await this.gameWait(0.6);
    if (token !== this.runToken) return;
    for (let i = index; i < CHAPTERS.length; i++) {
      const C = CHAPTERS[i];
      const ch = new C(this);
      this.swapChapter(ch, i);
      this.unlock(i + 1);
      try {
        await ch.script(i === index ? from || ch.checkpoints[0] : ch.checkpoints[0]);
      } catch (e) {
        if (e instanceof Aborted) return;
        console.error(e);
        return;
      }
      if (token !== this.runToken) return;
      this.unlock(i + 2);
      this.log(`complete ${ch.id}`);
      void this.ui.fade(1, 1.2);
      await this.gameWait(1.2);
      if (token !== this.runToken) return;
    }
    // film complete
    await this.showTitle();
  }

  private unlock(n: number): void {
    this.unlocked = Math.max(this.unlocked, Math.min(CHAPTERS.length, n));
    try {
      localStorage.setItem(SAVE_KEY, String(this.unlocked));
    } catch {
      /* storage unavailable: progress stays in memory */
    }
  }

  log(msg: string): void {
    this.events.push(`${this.elapsed.toFixed(1)}s ${msg}`);
    if (this.events.length > 400) this.events.shift();
  }

  onCheckpoint(_c: Chapter, _name: string): void {
    /* hook for analytics / autosave extensions */
  }

  // ------------------------------------------------------------------ loop
  private update(rawDt: number): void {
    if (this.simulating) return;
    this.step(rawDt);
  }

  private step(rawDt: number): void {
    this.frameNo++;
    this.realDt = this.paused || this.pausedForScreenshot ? 0 : rawDt;
    this.input.poll();
    if (this.input.consume('pause') && !this.inMenu) this.setPaused(!this.paused);
    this.pipeline.resize(this.cam.camera);
    this.particles.setViewportHeight(this.canvas.clientHeight * Math.min(devicePixelRatio, this.pipeline.maxDpr));
    if (!this.paused && !this.pausedForScreenshot) {
      let dt = rawDt * this.timeScale;
      if (hitStop.value > 0) {
        hitStop.value -= rawDt;
        dt *= 0.08;
      }
      this.elapsed += dt;
      if (this.gameWaiters.length) {
        const ready = this.gameWaiters.filter((w) => w.end <= this.elapsed);
        this.gameWaiters = this.gameWaiters.filter((w) => w.end > this.elapsed);
        for (const w of ready) w.resolve();
      }
      this.chapter?.update(dt);
      this.cam.update(dt);
      updateFogBanks(this.cam.camera.position);
      this.particles.update(dt);
      this.sky.update(dt, this.elapsed, this.cam.camera, this.chapter?.focus ?? new THREE.Vector3());
      this.pipeline.renderer.toneMappingExposure = this.sky.exposure;
    }
    this.input.endFrame();
    this.publishDiagnostics();
  }

  private render(): void {
    if (this.simulating) return;
    this.pipeline.render(this.elapsed);
  }

  // ------------------------------------------------------------------ QA hooks
  private installHooks(): void {
    window.__THREE_GAME_TEST_HOOKS__ = {
      seed: () => {
        /* the film is authored; no gameplay randomness depends on a seed */
      },
      setState: async (name: string) => {
        const s = STATES[name];
        if (!s) throw new Error(`Unknown test state: ${name}`);
        this.pausedForScreenshot = false;
        this.paused = false;
        this.ui.showScreen(this.ui.pauseEl, false);
        if (s[0] < 0) {
          await this.showTitle();
        } else {
          this.inMenu = false;
          this.ui.showScreen(this.ui.titleEl, false);
          this.ui.pauseBtn.classList.remove('hidden');
          void this.runChapter(s[0], s[1]);
        }
        // fast-forward headlessly (fixed step, no rendering) to the requested beat
        this.simulating = true;
        try {
          let settle = s[0] < 0 ? 90 : -1;
          for (let i = 0; i < 6000; i++) {
            this.step(1 / 30);
            const c = this.chapter;
            if (settle < 0 && c && this.chapterIndex === s[0] && c.lastCheckpoint === s[1]) settle = 75;
            if (settle >= 0 && settle-- === 0) break;
            if (i % 60 === 0) await new Promise((r) => setTimeout(r, 0));
          }
        } finally {
          this.simulating = false;
        }
        this.ui.setFadeInstant(0);
        this.ui.chapterCard(null);
        await this.frames(2);
        return { state: name };
      },
      setPausedForScreenshot: (p: boolean) => {
        this.pausedForScreenshot = p;
      },
      setReducedMotion: () => {
        this.cam.handheld = 0;
      },
      hideDebugUi: () => {},
    };
    // Headless bot playtest: fixed-step simulation (no rendering) driven by real input intents.
    (window as unknown as Record<string, unknown>).__LAST_PROCESSION_QA__ = {
      simulate: async (seconds: number, opts: { bot?: boolean; stopAtChapter?: number } = {}) => {
        const bot = opts.bot === false ? null : new Bot(this);
        const dt = 1 / 30;
        const steps = Math.round(seconds / dt);
        const startFails = this.failCount;
        this.simulating = true;
        try {
          for (let i = 0; i < steps; i++) {
            bot?.step(dt);
            this.step(dt);
            if (opts.stopAtChapter !== undefined && this.chapterIndex >= opts.stopAtChapter) break;
            if (i % 45 === 0) await new Promise((r) => setTimeout(r, 0));
          }
        } finally {
          bot?.release();
          this.simulating = false;
        }
        const h = this.chapter?.hero;
        return {
          chapter: this.chapter?.id,
          index: this.chapterIndex,
          checkpoint: this.chapter?.lastCheckpoint,
          fails: this.failCount - startFails,
          resolve: h?.resolve,
          hero: h ? [h.pos.x, h.pos.y, h.pos.z].map((v) => Math.round(v * 10) / 10) : null,
          events: this.events.slice(-30),
        };
      },
      start: (index: number, from = '') => {
        this.inMenu = false;
        this.ui.showScreen(this.ui.titleEl, false);
        void this.runChapter(index, from);
      },
    };
  }

  private frames(n: number): Promise<void> {
    return new Promise((resolve) => {
      let k = 0;
      const f = () => (++k >= n ? resolve() : requestAnimationFrame(f));
      requestAnimationFrame(f);
    });
  }

  private publishDiagnostics(): void {
    const info = this.pipeline.renderer.info;
    const h = this.chapter?.hero;
    window.__THREE_GAME_DIAGNOSTICS__ = {
      frame: this.frameNo,
      elapsed: this.elapsed,
      score: this.chapterIndex,
      targetScore: CHAPTERS.length,
      complete: false,
      player: {
        position: { x: h?.pos.x ?? 0, y: h?.pos.y ?? 0, z: h?.pos.z ?? 0 },
        speed: h ? Math.hypot(h.vel.x, h.vel.z) : 0,
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
        dpr: Math.min(window.devicePixelRatio || 1, this.pipeline.maxDpr),
      },
      chapter: this.chapter?.id ?? 'none',
      checkpoint: this.chapter?.lastCheckpoint ?? '',
      camera: this.cam.label,
      uptime: (performance.now() - this.startTime) / 1000,
    } as ThreeGameDiagnostics;
  }

  dispose(): void {
    this.loop.stop();
    this.chapter?.dispose();
    this.input.dispose();
    this.audio.dispose();
    this.pipeline.dispose();
  }
}
