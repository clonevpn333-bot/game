import * as THREE from 'three';
import { Loop } from '../core/Loop';
import { Input } from '../core/Input';
import { clamp, damp, Tweens } from '../core/math';
import { createRenderer } from '../core/Renderer';
import { PostPipeline } from '../render/Post';
import { Atmosphere } from '../render/Atmosphere';
import { dreamUniforms } from '../render/DreamShading';
import { PhysicsWorld } from '../world/Physics';
import { Player } from '../entities/Player';
import { CameraRig } from '../systems/CameraRig';
import { Vfx } from '../systems/Vfx';
import { AudioSys } from '../systems/Audio';
import { Ui, DialogueLine } from '../ui/Ui';
import { Level } from './Level';
import { CHAPTERS } from '../chapters';
import { loadSave, SaveData, Settings, writeSave, freshSave } from './Save';
import { Actor, ActorContext, LostCourier, ParcelHusk, Resident } from '../entities/Actors';
import type { Expression } from '../entities/Rig';

type Mode = 'boot' | 'title' | 'play' | 'pause' | 'transition' | 'ending';


export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(58, 1, 0.1, 2400);
  readonly post: PostPipeline;
  readonly atmos: Atmosphere;
  readonly physics = new PhysicsWorld();
  readonly input: Input;
  readonly player: Player;
  readonly camRig: CameraRig;
  readonly vfx = new Vfx();
  readonly audio = new AudioSys();
  readonly ui: Ui;
  readonly tweens = new Tweens();
  readonly loop: Loop;
  save: SaveData;
  level: Level | null = null;
  chapterIdx = 0;
  mode: Mode = 'boot';
  lucidity = 5;
  readonly maxLucidity = 5;
  scriptLock = false;
  private waking = false;
  private time = 0;
  private screenshotPaused = false;
  private readonly mobile: boolean;
  private waiters: Array<{ t: number; res: () => void }> = [];
  private parcelColor = '#ffd46b';
  private titleT = 0;
  private detection = new Map<Actor, { amount: number; alerted: boolean }>();
  private readonly frustum = new THREE.Frustum();
  private readonly projM = new THREE.Matrix4();
  private readonly tmpV = new THREE.Vector3();
  private fps = 60;
  private reducedMotion = false;
  private frameCount = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.mobile = matchMedia('(pointer: coarse)').matches || Math.min(innerWidth, innerHeight) < 600;
    this.save = loadSave();
    this.renderer = createRenderer(canvas);
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.info.autoReset = false;
    this.post = new PostPipeline(this.renderer, this.scene, this.camera, this.mobile);
    this.atmos = new Atmosphere(this.scene, this.renderer, this.post, this.vfx, this.mobile);
    this.scene.add(this.vfx.group);
    this.input = new Input(canvas);
    this.camRig = new CameraRig(this.camera);
    this.player = new Player({
      footstep: (s, k) => this.audio.footstep(s, k),
      jump: () => {
        this.audio.jump();
        this.vfx.emit(this.player.pos.clone().setY(this.player.pos.y + 0.1), 6, { color: '#ffffff', speed: 1.2, up: 0.3, life: 0.5, size: 0.25 });
      },
      land: (sp, s) => {
        this.audio.land(sp, s);
        if (sp > 9) this.camRig.addTrauma(Math.min(0.35, sp / 50));
        this.vfx.emit(this.player.pos.clone().setY(this.player.pos.y + 0.1), Math.min(16, Math.floor(sp)), { color: s === 'cloud' ? '#ffffff' : '#e8dcff', speed: 2, up: 0.2, life: 0.6, size: 0.3, drag: 3 });
      },
      mantle: () => this.audio.whoosh(),
      vault: () => this.audio.whoosh(),
      attack: (o, d) => this.onAttack(o, d),
      pulse: (o) => this.onPulse(o),
      hurt: () => this.audio.hurt(),
    });
    this.player.rig.attachTo(this.scene);
    this.ui = new Ui({
      newGame: () => this.newGame(),
      continueGame: () => void this.loadChapter(this.save.chapter, this.save.checkpoint),
      startChapter: (i) => void this.loadChapter(i, 0),
      resume: () => this.resume(),
      restartCheckpoint: () => {
        this.resume();
        this.wake('You let the dream fold back to the last checkpoint.');
      },
      quitToTitle: () => void this.toTitle(),
      applySettings: (s) => this.applySettings(s),
      audio: this.audio,
      getSave: () => this.save,
      chapters: CHAPTERS.map((c) => ({ title: c.title, subtitle: c.subtitle })),
    });
    this.ui.onPauseButton = () => this.pause();
    this.input.bindTouch(this.ui.touchRoot);
    this.applySettings(this.save.settings, false);

    canvas.addEventListener('click', () => {
      this.audio.unlock();
      if (this.mode === 'play' && !this.ui.menuOpen) this.input.requestPointerLock();
    });
    window.addEventListener('keydown', () => this.audio.unlock(), { once: true });
    window.addEventListener('pointerdown', () => this.audio.unlock(), { once: true });
    window.addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play') this.pause();
    });
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.mode === 'play' && !this.ui.dialogueOpen && !this.input.usingTouch && this.frameCount > 10 && !this.screenshotPaused) {
        // Esc releases pointer lock; treat as pause like most games.
        this.pause();
      }
    });

    this.loop = new Loop((dt, el) => this.update(dt, el), () => this.render());
    this.installHooks();
  }

  async start(): Promise<void> {
    this.resize();
    this.loop.start();
    await this.toTitle(true);
    this.ui.loaded();
  }

  // ---------------- flow ----------------
  private newGame(): void {
    const settings = this.save.settings;
    const unlocked = this.save.unlocked;
    const stamps = this.save.stamps;
    this.save = { ...freshSave(), settings, unlocked, stamps };
    writeSave(this.save);
    void this.loadChapter(0, 0);
  }

  async toTitle(first = false): Promise<void> {
    this.mode = 'transition';
    this.input.exitPointerLock();
    if (!first) await this.ui.fade(true, true);
    this.ui.closeMenu();
    const idx = Math.min(this.save.chapter, CHAPTERS.length - 1);
    // the title screen shows the furthest dream you've reached, quietly
    this.buildChapter(first ? 0 : idx);
    this.ui.setHud(false);
    this.ui.setTouch(false);
    this.player.frozen = true;
    this.mode = 'title';
    this.titleT = 0;
    this.ui.showTitle();
    await this.ui.fade(false);
  }

  private buildChapter(idx: number): Level {
    this.level?.dispose();
    this.physics.clear();
    this.vfx.reset();
    this.ui.clearWorldLabels();
    this.detection.clear();
    const def = CHAPTERS[idx];
    this.chapterIdx = idx;
    const lv = new Level(this, def);
    this.scene.add(lv.root);
    def.build(lv);
    lv.b.finalize();
    this.level = lv;
    this.atmos.set(def.look);
    this.audio.setPreset(def.audio);
    this.ui.setDread(def.uiDread);
    this.player.dread = def.oriDread;
    this.player.teleport(lv.start.pos, lv.start.facing);
    this.camRig.snap(lv.start.pos, lv.start.camYaw);
    this.setParcel(def.parcelColor);
    this.player.rig.expression = def.oriDread > 0.6 ? 'worried' : 'happy';
    // compile shaders up front to avoid hitches
    this.renderer.compile(this.scene, this.camera);
    return lv;
  }

  async loadChapter(idx: number, cp: number, instant = false): Promise<void> {
    this.mode = 'transition';
    this.ui.closeMenu();
    if (!instant) await this.ui.fade(true, true);
    const lv = this.buildChapter(idx);
    this.save.chapter = idx;
    this.save.checkpoint = cp;
    this.save.unlocked = Math.max(this.save.unlocked, idx);
    writeSave(this.save);
    this.lucidity = this.maxLucidity;
    this.ui.setLucidity(this.lucidity, this.maxLucidity);
    this.refreshStamps();
    cp = Math.min(cp, lv.checkpoints.length - 1);
    for (let i = 1; i <= cp; i++) lv.checkpoints[i].restore?.();
    lv.cpIndex = cp;
    const c = lv.checkpoints[cp];
    this.player.teleport(c.pos, c.facing);
    this.camRig.snap(c.pos, c.facing + Math.PI);
    this.player.frozen = false;
    this.scriptLock = false;
    this.ui.setHud(true);
    this.mode = 'play';
    this.input.requestPointerLock();
    const def = CHAPTERS[idx];
    if (instant) {
      if (cp === 0 && lv.intro) lv.introRunning = lv.intro().finally(() => (lv.introRunning = null));
      else if (c.objective) lv.objective(c.objective, c.waypoint ?? null);
      return;
    }
    await this.ui.fade(false);
    const card = this.ui.chapterCard(idx === 9 ? 'Final Chapter' : `Chapter ${idx + 1}`, def.title, def.subtitle);
    if (cp === 0 && lv.intro) {
      lv.introRunning = lv.intro().finally(() => (lv.introRunning = null));
    } else if (c.objective) {
      lv.objective(c.objective, c.waypoint ?? null);
    }
    await card;
  }

  async completeChapter(): Promise<void> {
    const next = this.chapterIdx + 1;
    if (next >= CHAPTERS.length) return;
    this.audio.chime(0.75);
    this.save.unlocked = Math.max(this.save.unlocked, next);
    this.save.chapter = next;
    this.save.checkpoint = 0;
    writeSave(this.save);
    await this.loadChapter(next, 0);
  }

  saveCheckpoint(idx: number): void {
    this.save.chapter = this.chapterIdx;
    this.save.checkpoint = idx;
    writeSave(this.save);
    if (idx > 0) this.ui.toast('Checkpoint');
  }

  collectStamp(ch: number, id: string, pos: THREE.Vector3): void {
    const k = String(ch);
    const list = (this.save.stamps[k] ??= []);
    if (!list.includes(id)) list.push(id);
    writeSave(this.save);
    this.audio.stamp();
    this.vfx.emit(pos, 40, { color: '#ffe2a8', color2: '#ffb8dc', speed: 4, life: 1.1, size: 0.25 });
    this.vfx.ring(pos, '#ffe2a8', 3, 0.6, true);
    this.ui.toast('Dream Stamp found');
    this.refreshStamps(true);
  }

  private refreshStamps(pop = false): void {
    const n = this.save.stamps[String(this.chapterIdx)]?.length ?? 0;
    this.ui.setStamps(n, 3, pop);
  }

  refreshObjective(): void {
    const def = CHAPTERS[this.chapterIdx];
    this.ui.setObjective(this.chapterIdx === 9 ? def.title : `Ch.${this.chapterIdx + 1} · ${def.title}`, this.level?.objectiveText ?? '', this.parcelColor);
  }

  setParcel(color: string | null): void {
    if (color) this.parcelColor = color;
    this.player.rig.setParcelColor(color);
    this.refreshObjective();
  }

  dialogue(lines: DialogueLine[]): Promise<void> {
    this.ui.onLine = (l) => {
      const ex = l.expr as Expression | undefined;
      if (l.who === 'Ori' && ex) this.player.rig.expression = ex;
    };
    this.input.consume('advance');
    return this.ui.say(lines);
  }

  /** Seamlessly move the player and camera by an offset (looping spaces). */
  warp(dx: number, dy: number, dz: number): void {
    const d = new THREE.Vector3(dx, dy, dz);
    this.player.body.pos.add(d);
    this.player.rig.root.position.add(d);
    this.camRig.shift(d);
    this.player.rig.resetSecondary();
  }

  wait(sec: number): Promise<void> {
    return new Promise((res) => this.waiters.push({ t: sec, res }));
  }

  pause(): void {
    if (this.mode !== 'play') return;
    this.mode = 'pause';
    this.input.exitPointerLock();
    this.audio.suspend(true);
    const def = CHAPTERS[this.chapterIdx];
    this.ui.showPause(`${this.chapterIdx === 9 ? 'Final' : `Chapter ${this.chapterIdx + 1}`} — ${def.title}`, `${this.save.stamps[String(this.chapterIdx)]?.length ?? 0}/3`);
    this.ui.setTouch(false);
  }

  resume(): void {
    if (this.mode !== 'pause') return;
    this.ui.closeMenu();
    this.audio.suspend(false);
    this.mode = 'play';
    this.input.requestPointerLock();
  }

  async ending(): Promise<'restore' | 'shutdown'> {
    this.mode = 'ending';
    this.input.exitPointerLock();
    this.ui.setHud(false);
    const choice = await this.ui.showEnding();
    this.save.ending = choice;
    writeSave(this.save);
    this.mode = 'play';
    this.ui.setHud(false);
    return choice;
  }

  showCredits(kind: 'restore' | 'shutdown'): void {
    this.mode = 'ending';
    this.input.exitPointerLock();
    this.ui.showCredits(kind, () => {
      this.save.chapter = 0;
      this.save.checkpoint = 0;
      writeSave(this.save);
      void this.toTitle();
    });
  }

  applySettings(s: Settings, persist = true): void {
    this.save.settings = { ...s };
    if (persist) writeSave(this.save);
    this.audio.volume = { master: s.master, music: s.music, sfx: s.sfx };
    this.audio.applyVolumes();
    this.input.sensitivity = s.sensitivity;
    this.input.invertY = s.invertY;
    this.reducedMotion = s.reducedMotion;
    this.camRig.reducedMotion = s.reducedMotion;
    const dpr = s.highQuality ? Math.min(devicePixelRatio, this.mobile ? 1.5 : 2) : Math.min(devicePixelRatio, 1);
    this.renderer.setPixelRatio(dpr);
    this.resize();
  }

  // ---------------- wake / damage ----------------
  wake(reason: string): void {
    if (this.waking || !this.level || this.mode !== 'play') return;
    this.waking = true;
    this.player.frozen = true;
    this.audio.wake();
    this.post.setFlashColor('#ffffff');
    this.post.aberrationPulse = 1;
    void (async () => {
      this.ui.wake(reason, true);
      await this.ui.fade(true, false);
      await new Promise((r) => setTimeout(r, 1100));
      const lv = this.level!;
      lv.respawn();
      const c = lv.checkpoints[lv.cpIndex];
      this.player.teleport(c.pos, c.facing);
      this.camRig.snap(c.pos, c.facing + Math.PI);
      this.lucidity = this.maxLucidity;
      this.ui.setLucidity(this.lucidity, this.maxLucidity);
      this.ui.wake(reason, false);
      this.ui.setAlert(false);
      this.ui.clearWorldLabels();
      this.detection.clear();
      await this.ui.fade(false);
      this.player.frozen = false;
      this.waking = false;
    })();
  }

  hurtPlayer(from: THREE.Vector3, amount: number): void {
    if (this.waking) return;
    if (!this.player.hurt(from)) return;
    this.lucidity = Math.max(0, this.lucidity - amount);
    this.ui.setLucidity(this.lucidity, this.maxLucidity);
    this.camRig.addTrauma(0.45);
    this.post.aberrationPulse = 0.8;
    this.post.setFlashColor('#ff9ab8');
    this.post.flash = 0.25;
    if (this.lucidity <= 0) this.wake('Your lucidity faded.');
  }

  /** Lose lucidity without knockback (decay effects). */
  drainLucidity(amount: number, reason: string): void {
    if (this.waking) return;
    this.lucidity = Math.max(0, this.lucidity - amount);
    this.ui.setLucidity(this.lucidity, this.maxLucidity);
    this.post.aberrationPulse = 0.6;
    this.audio.hurt();
    if (this.lucidity <= 0) this.wake(reason);
  }

  private onAttack(origin: THREE.Vector3, dir: THREE.Vector3): void {
    this.audio.swing();
    const tip = origin.clone().addScaledVector(dir, 1.1);
    this.vfx.emit(tip, 10, { color: '#ffd8ec', color2: '#fff1c8', speed: 2.5, life: 0.35, size: 0.18, dir: new THREE.Vector3(dir.z, 0, -dir.x), spread: 0.8 });
    if (!this.level) return;
    for (const a of this.level.actors) {
      if (!(a instanceof ParcelHusk) || !a.alive) continue;
      const to = a.position.clone().sub(this.player.pos);
      to.y = 0;
      const d = to.length();
      if (d < 2.1 && to.normalize().dot(dir) > 0.2) {
        a.takeHit(this.player.pos, this.actorCtx());
        this.camRig.addTrauma(0.2);
        this.hitstop = 0.06;
      }
    }
  }

  private hitstop = 0;

  private onPulse(origin: THREE.Vector3): void {
    this.audio.pulse();
    const c = this.parcelColor;
    this.vfx.ring(origin.clone().setY(this.player.pos.y + 0.1), c, 6.5, 0.9);
    this.vfx.ring(origin, c, 3.5, 0.6, true);
    this.vfx.emit(origin, 40, { color: c, color2: '#ffffff', speed: 6, life: 0.9, size: 0.22, drag: 2.2 });
    this.post.aberrationPulse = Math.max(this.post.aberrationPulse, 0.35);
    this.camRig.fovPunch = 5;
    const lv = this.level;
    if (!lv) return;
    for (const a of lv.anchors) {
      if (!a.active || !a.enabled()) continue;
      if (a.pos.distanceTo(origin) <= a.radius) {
        a.active = false;
        a.beacon.visible = false;
        this.vfx.emit(a.pos.clone().setY(a.pos.y + 0.6), 70, { color: a.color, color2: '#ffffff', speed: 7, life: 1.4, size: 0.3 });
        this.vfx.ring(a.pos, `#${a.color.getHexString()}`, 14, 1.6);
        this.audio.stinger('reveal');
        void a.onActivate();
      }
    }
    for (const a of lv.actors) {
      const d = a.position.distanceTo(this.player.pos);
      if (a instanceof ParcelHusk && a.alive && d < 6.5) a.stun();
      if (a instanceof LostCourier && d < 5.5) a.staggerBy();
    }
    for (const h of lv.pulseHooks) h(origin);
  }

  // ---------------- per-frame ----------------
  private actorCtxCache: ActorContext | null = null;
  private actorCtx(): ActorContext {
    if (!this.actorCtxCache) {
      const self = this;
      this.actorCtxCache = {
        player: this.player,
        physics: this.physics,
        camera: this.camera,
        vfx: this.vfx,
        audio: this.audio,
        get time() { return self.time; },
        get dread() { return CHAPTERS[self.chapterIdx].oriDread; },
        get inDialogue() { return self.ui.dialogueOpen || self.scriptLock; },
        wake: (r) => this.wake(r),
        hurtPlayer: (f, a) => this.hurtPlayer(f, a),
        isObserved: (p, r) => this.isObserved(p, r),
        bark: (a, t) => this.ui.bark(a.name, t),
        setDetection: (a, amt, al) => this.detection.set(a, { amount: amt, alerted: al }),
      } as ActorContext;
    }
    return this.actorCtxCache;
  }

  isObserved(p: THREE.Vector3, r: number): boolean {
    this.projM.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projM);
    if (!this.frustum.intersectsSphere(new THREE.Sphere(p, r * 0.5))) return false;
    if (p.distanceTo(this.camera.position) > 60) return false;
    return this.physics.lineOfSight(this.camera.position, p);
  }

  private update(dt: number, _el: number): void {
    this.frameCount++;
    this.fps = damp(this.fps, 1 / Math.max(dt, 1e-3), 3, dt);
    this.input.poll();
    if (this.screenshotPaused) {
      this.input.endFrame();
      return;
    }
    const realDt = dt;
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      dt *= 0.08;
    }
    this.time += dt;
    dreamUniforms.uTime.value = this.time;
    this.tweens.update(realDt);
    for (let i = this.waiters.length - 1; i >= 0; i--) {
      const w = this.waiters[i];
      if (this.mode === 'pause') break;
      w.t -= dt;
      if (w.t <= 0) {
        this.waiters.splice(i, 1);
        w.res();
      }
    }
    this.ui.update(realDt);
    this.ui.setTouch(this.input.usingTouch && this.mode === 'play');

    if (this.mode === 'title') this.updateTitle(dt);
    else if (this.mode === 'play') this.updatePlay(dt);
    else if (this.mode === 'ending') {
      this.player.frozen = true;
      this.player.update(dt, this.input, this.camRig.forward(this.tmpV), this.physics);
      this.level?.update(dt);
      this.camRig.update(dt, new THREE.Vector2(), this.player.body.vel, false, this.physics);
    }
    if (this.mode !== 'pause') {
      this.player.lateUpdate(dt, this.time);
      this.atmos.update(dt, this.player.pos, this.camera);
      this.vfx.update(dt, this.time, this.camera, this.renderer.domElement.clientHeight);
      this.post.update(realDt, this.time, this.reducedMotion);
      this.audio.update({ chase: this.level?.chase ?? 0, dread: CHAPTERS[this.chapterIdx].oriDread });
    }
    this.input.endFrame();
    this.publishDiagnostics();
  }

  private updateTitle(dt: number): void {
    this.titleT += dt;
    const lv = this.level;
    if (!lv) return;
    this.player.frozen = true;
    this.player.update(dt, this.input, this.camRig.forward(this.tmpV), this.physics);
    const ctx = this.actorCtx();
    for (const a of lv.actors) if (a.position.distanceTo(this.player.pos) < 60) a.update(dt, ctx);
    for (const u of lv.updaters) u(dt, this.titleT);
    const p = this.player.pos;
    const ang = lv.start.camYaw + 0.6 + Math.sin(this.titleT * 0.05) * 0.5;
    const pos = new THREE.Vector3(p.x + Math.sin(ang) * 6.5, p.y + 2.2 + Math.sin(this.titleT * 0.13) * 0.4, p.z + Math.cos(ang) * 6.5);
    this.camRig.cinematic = { pos, look: new THREE.Vector3(p.x - 2.2, p.y + 1.6, p.z - 1), fov: 50 };
    this.camRig.update(dt, new THREE.Vector2(), this.player.body.vel, false, this.physics);
  }

  private updatePlay(dt: number): void {
    const lv = this.level;
    if (!lv) return;
    if (this.input.consume('pause')) {
      this.pause();
      return;
    }
    if (this.ui.dialogueOpen && this.input.consume('advance')) this.ui.advance();
    const locked = this.ui.dialogueOpen || this.scriptLock || this.waking;
    this.player.frozen = locked && !this.player.autoWalk;
    if (locked) {
      this.input.consume('jump');
      this.input.consume('attack');
      this.input.consume('pulse');
      this.input.consume('interact');
    }

    // interactables
    let best: (typeof lv.interactables)[number] | null = null;
    let bestD = Infinity;
    if (!locked) {
      for (const it of lv.interactables) {
        if ((it.once && it.used) || !it.enabled()) continue;
        const d = it.pos.distanceTo(this.player.pos.clone().setY(this.player.pos.y + 1));
        if (d < it.radius && d < bestD) {
          best = it;
          bestD = d;
        }
      }
    }
    let anchorNear = false;
    if (!locked) for (const a of lv.anchors) if (a.active && a.enabled() && a.pos.distanceTo(this.player.pos) < a.radius) anchorNear = true;
    const touch = this.input.usingTouch;
    if (best) {
      const label = typeof best.label === 'function' ? best.label() : best.label;
      this.ui.setPrompt(label, touch ? 'USE' : best.key ?? 'E');
      if (this.input.consume('interact')) {
        best.used = true;
        this.player.startAction('interact', 0.5);
        void best.onUse();
      }
    } else if (anchorNear) {
      this.ui.setPrompt('Dream Pulse the anchor', touch ? 'PULSE' : 'Q');
      if (this.input.consume('interact')) this.input.press('pulse');
    } else this.ui.setPrompt(null);

    // camera-relative player
    const look = this.input.look;
    if (this.camRig.cinematic) look.set(0, 0);
    this.player.update(dt, this.input, this.camRig.forward(this.tmpV), this.physics);
    this.camRig.target.copy(this.player.pos);
    this.camRig.update(dt, look, this.player.body.vel, this.player.sprinting, this.physics);

    lv.update(dt);
    const ctx = this.actorCtx();
    for (const a of lv.actors) {
      if (!a.active) continue;
      if (a instanceof Resident && a.position.distanceTo(this.player.pos) > 70) continue;
      a.update(dt, ctx);
    }

    if (this.player.pos.y < lv.killY) this.wake('You fell out of the dream.');

    // HUD
    this.ui.setPulse(clamp(1 - this.player.pulseCd / 1.1, 0, 1), this.player.canPulse);
    this.ui.dimHud(this.ui.dialogueOpen);
    this.updateWorldHud();
  }

  private project(p: THREE.Vector3): { x: number; y: number; behind: boolean } {
    const v = this.tmpV.copy(p).project(this.camera);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, behind: v.z > 1 };
  }

  private updateWorldHud(): void {
    const lv = this.level!;
    // waypoint
    const wp = lv.waypointPos;
    if (wp && this.save.settings.hints && !this.ui.dialogueOpen) {
      const target = wp.clone();
      target.y += 1.5;
      const pr = this.project(target);
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      let { x, y } = pr;
      const m = 40;
      if (pr.behind) {
        x = w - x;
        y = h - m;
      }
      x = clamp(x, m, w - m);
      y = clamp(y, m + 60, h - m);
      this.ui.setWaypoint(x, y, true, target.distanceTo(this.player.pos));
    } else this.ui.setWaypoint(0, 0, false, 0);

    // barks
    const byName = new Map<string, Actor>();
    for (const a of lv.actors) byName.set(a.name, a);
    this.ui.updateWorldLabels(1 / 60, (id) => {
      const a = byName.get(id);
      if (!a) return null;
      const p = a.position.clone();
      p.y += 2.3 * ((a as unknown as { rig?: { style: { scale: number } } }).rig?.style.scale ?? 1);
      const pr = this.project(p);
      if (pr.behind || p.distanceTo(this.camera.position) > 26) return null;
      return pr;
    });
    // detection eyes
    let alert = false;
    let maxChase = 0;
    for (const [a, d] of this.detection) {
      const p = a.position.clone();
      p.y += 2.5;
      const pr = this.project(p);
      this.ui.setEye(a.name, pr.behind ? null : pr, d.amount, d.alerted);
      if (d.alerted) {
        alert = true;
        maxChase = 1;
      }
    }
    lv.chase = Math.max(lv.chase * 0.98, maxChase);
    this.ui.setAlert(alert || lv.chase > 0.6);
  }

  private render(): void {
    this.renderer.info.reset();
    this.post.render(1 / 60);
    // keep the scene-pass numbers (the post passes add only a few full-screen draws)
  }

  private resize(): void {
    const w = Math.max(1, this.canvas.clientWidth);
    const h = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(w, h, false);
    this.post.setSize(w, h);
    this.camera.aspect = w / h;
    this.camRig.baseFov = w / h < 0.8 ? 70 : 58;
    this.camera.updateProjectionMatrix();
  }

  // ---------------- test hooks / diagnostics ----------------
  private publishDiagnostics(): void {
    if (this.frameCount % 10 !== 0 && this.frameCount > 2) return;
    const info = this.renderer.info;
    window.__THREE_GAME_DIAGNOSTICS__ = {
      renderer: { calls: info.render.calls, triangles: info.render.triangles, geometries: info.memory.geometries, textures: info.memory.textures },
      fps: Math.round(this.fps),
      state: {
        mode: this.mode,
        chapter: this.chapterIdx,
        checkpoint: this.level?.cpIndex ?? 0,
        objective: this.level?.objectiveText ?? '',
        lucidity: this.lucidity,
        player: { x: +this.player.pos.x.toFixed(2), y: +this.player.pos.y.toFixed(2), z: +this.player.pos.z.toFixed(2), grounded: this.player.body.grounded },
        dialogue: this.ui.dialogueOpen,
        actors: this.level?.actors.length ?? 0,
        colliders: this.physics.colliders.length,
      },
      physics: { engine: 'custom-kinematic', colliders: this.physics.colliders.length, water: this.physics.water.length },
    };
  }

  private installHooks(): void {
    const states = ['title', ...CHAPTERS.map((_c, i) => `ch${i + 1}`), ...CHAPTERS.map((_c, i) => `ch${i + 1}-mid`)];
    window.__THREE_GAME_TEST_HOOKS__ = {
      states,
      seed: (_n: number) => ({ seeded: true }),
      setPausedForScreenshot: (p: boolean) => {
        this.screenshotPaused = p;
        return { paused: p };
      },
      setReducedMotion: (on: boolean) => {
        this.reducedMotion = on;
        return { reducedMotion: on };
      },
      setState: async (name: string) => {
        if (name === 'title') {
          await this.toTitle(true);
          await this.settle(4);
          return { state: name };
        }
        const m = /^ch(\d+)(-mid)?$/.exec(name);
        if (!m) throw new Error(`Unknown state: ${name}`);
        const idx = Number(m[1]) - 1;
        if (idx < 0 || idx >= CHAPTERS.length) throw new Error(`Unknown state: ${name}`);
        this.ui.closeMenu();
        await this.loadChapter(idx, 0, true);
        const lv = this.level!;
        if (m[2]) {
          const cp = Math.max(1, Math.floor(lv.checkpoints.length / 2));
          for (let i = 1; i <= cp; i++) lv.checkpoints[i]?.restore?.();
          lv.cpIndex = Math.min(cp, lv.checkpoints.length - 1);
          const c = lv.checkpoints[lv.cpIndex];
          this.player.teleport(c.pos, c.facing);
          this.camRig.snap(c.pos, c.facing + Math.PI);
          if (c.objective) lv.objective(c.objective, c.waypoint ?? null);
        }
        // drive the intro script to completion (skipping dialogue) for captures
        let guard = 0;
        while ((lv.introRunning || this.ui.dialogueOpen) && guard++ < 4000) {
          while (this.ui.dialogueOpen) {
            this.ui.advance();
            this.ui.advance();
          }
          this.update(1 / 60, 0);
          await Promise.resolve();
        }
        this.scriptLock = false;
        this.camRig.cinematic = null;
        this.camRig.snap(this.player.pos);
        await this.settle(4);
        return { state: name };
      },
      teleport: (x: number, y: number, z: number) => this.player.teleport(new THREE.Vector3(x, y, z)),
      simulate: (seconds: number) => {
        const steps = Math.round(seconds * 60);
        for (let i = 0; i < steps; i++) this.update(1 / 60, 0);
        return window.__THREE_GAME_DIAGNOSTICS__?.state;
      },
      getState: () => window.__THREE_GAME_DIAGNOSTICS__?.state,
      hideDebugUi: () => ({ hidden: true }),
      skipDialogue: () => {
        while (this.ui.dialogueOpen) {
          this.ui.advance();
          this.ui.advance();
        }
      },
      game: this,
    };
  }

  private settle(frames: number): Promise<void> {
    return new Promise((res) => {
      let n = 0;
      const tick = () => {
        if (++n >= frames) res();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  dispose(): void {
    this.loop.stop();
    this.input.dispose();
    this.level?.dispose();
    this.post.dispose();
    this.atmos.dispose();
    this.renderer.dispose();
  }
}
