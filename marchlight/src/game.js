// The Game: owns every system and runs the frame loop.
import * as THREE from 'three';
import { Engine } from './core/engine.js';
import { Input } from './core/input.js';
import { Audio } from './core/audio.js';
import { Physics } from './core/physics.js';
import { buildTextures } from './core/textures.js';
import { buildMaterials } from './core/materials.js';
import { Emitter, clamp } from './core/util.js';
import { Player } from './player/player.js';
import { CameraRig } from './player/camera.js';
import { Tether } from './player/tether.js';
import { Weapons } from './combat/weapons.js';
import { Enemies } from './combat/enemies.js';
import { FX } from './combat/fx.js';
import { HUD } from './ui/hud.js';
import { Director } from './story/director.js';
import { Dialogue } from './story/dialogue.js';
import { Interact } from './story/interact.js';
import { StoryState } from './story/state.js';
import { Crowd } from './characters/npc.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.engine = new Engine(canvas);
    this.input = new Input(canvas);
    this.audio = new Audio();
    this.events = new Emitter();
    this.state = new StoryState();
    this.time = 0; this.dt = 0; this.timeScale = 1; this.hitStop = 0; this.slowmo = 1; this.paused = false;
    this.killY = -1e9;
    this.actors = new Set();
    this.updaters = new Set();
    this.cast = {};
    this.settings = { difficulty: 1 };
    this.fpsAcc = 0; this.fpsN = 0;
  }

  async init(progress) {
    this.physics = new Physics();
    progress?.(0.05, 'Forging steel…');
    await tick();
    this.textures = buildTextures(p => progress?.(0.05 + p * 0.35, 'Painting the city…'));
    this.materials = buildMaterials(this.textures);
    await tick();
    this.hud = new HUD(this);
    this.director = new Director(this);
    this.dialogue = new Dialogue(this);
    this.interact = new Interact(this);
    this.fx = new FX(this);
    this.camera = new CameraRig(this);
    this.tether = new Tether(this);
    this.weapons = new Weapons(this);
    this.enemies = new Enemies(this);
    this.crowd = new Crowd(this);
    this.noise = (pos, radius) => this.enemies.noise(pos, radius);
    this.player = new Player(this, this.state.look || {});
    this.input.onLockChange = locked => { if (!locked && this.running && !this.paused && !this.menuOpen && !this.dialogue.choosing && !this.noPauseOnUnlock) this.onRequestPause?.(); };
  }

  add(fn) { this.updaters.add(fn); return () => this.updaters.delete(fn); }
  addActor(a) { this.actors.add(a); return a; }
  removeActor(a) { this.actors.delete(a); a.remove?.(); }

  timeScaleHit(d) { this.hitStop = Math.max(this.hitStop, d); }

  start() {
    this.running = true; this.last = performance.now();
    const loop = (now) => { requestAnimationFrame(loop); if (this.manual) { this.last = now; return; } this.frame(now); };
    requestAnimationFrame(loop);
  }

  // Deterministic stepping for automated playtests: advance(seconds) without rAF.
  advance(sec, step = 1 / 30) {
    this.manual = true;
    const n = Math.max(1, Math.round(sec / step));
    for (let i = 0; i < n; i++) { this.last = performance.now() - step * 1000; this.frame(performance.now(), i < n - 1); }
  }

  frame(now, skipRender = false) {
    const dtReal = clamp((now - this.last) / 1000, 0, 1 / 20); this.last = now;
    this.input.update();
    if (!this.paused) {
      let ts = this.timeScale * this.slowmo;
      if (this.hitStop > 0) { this.hitStop -= dtReal; ts *= 0.05; }
      const dt = dtReal * ts; this.dt = dt;
      this.time += dt; this.rtime = (this.rtime || 0) + dtReal; this.state.playtime += dtReal;
      this.city?.update(dt, dtReal);
      this.world?.update?.(dt);
      for (const f of this.updaters) f(dt, dtReal);
      this.director.update(dt);
      this.physics.syncKinematics();
      this.player.update(dt);
      this.tether.update(dt);
      this.weapons.update(dt);
      this.enemies.update(dt);
      this.crowd.update(dt);
      for (const a of this.actors) a.update(dt);
      this.physics.step(dt);
      this.fx.update(dt);
      this.camera.update(dtReal * (this.slowmo < 1 ? Math.max(0.35, this.slowmo) : 1) * (this.hitStop > 0 ? 0.3 : 1) || dt);
      this.interact.update();
      this.sky?.update(dt);
      // audio listener follows the camera
      const cam = this.engine.camera; const f = cam.getWorldDirection(new THREE.Vector3());
      this.audio.setListener(cam.position, f, cam.up);
    }
    this.hud.update(dtReal);
    if (!skipRender) this.engine.render(dtReal);
    this.input.endFrame();
    // fps meter
    this.fpsAcc += dtReal; this.fpsN++;
    if (this.fpsAcc > 0.5) { this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0; const el = document.getElementById('fps'); if (el && el.style.display === 'block') el.textContent = this.fps.toFixed(0) + ' fps · ' + this.engine.renderer.info.render.calls + ' calls'; }
  }
}

function tick() { return new Promise(r => setTimeout(r, 0)); }
