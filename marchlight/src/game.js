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

  // compile every shader up front (hidden things too: guns, enemies-in-waiting, other districts) so the
  // first sight of something mid-fight doesn't stall the frame while its shader compiles
  prewarm() {
    try {
      const { scene, camera, renderer } = this.engine, hidden = [];
      scene.traverse(o => { if (!o.visible) { hidden.push(o); o.visible = true; } });
      const p = renderer.compileAsync(scene, camera);
      hidden.forEach(o => (o.visible = false));
      p?.catch?.(() => {});
    } catch (e) { console.warn('prewarm', e); }
  }
  add(fn) { this.updaters.add(fn); return () => this.updaters.delete(fn); }
  addActor(a) { this.actors.add(a); return a; }
  removeActor(a) { this.actors.delete(a); a.remove?.(); }

  timeScaleHit(d) { this.hitStop = Math.max(this.hitStop, d); }

  start() {
    this.running = true; this.last = performance.now();
    this.prewarm();
    const loop = (now) => { requestAnimationFrame(loop); if (this.manual) { this.last = now; return; } this.frame(now); };
    requestAnimationFrame(loop);
  }

  // Deterministic stepping for automated playtests: advance(seconds) without rAF.
  advance(sec, step = 1 / 30, render = true) {
    this.manual = true;
    const n = Math.max(1, Math.round(sec / step));
    for (let i = 0; i < n; i++) { this.last = performance.now() - step * 1000; this.frame(performance.now(), !render || i < n - 1); }
  }

  guard = (name, fn) => {
    try { fn(); } catch (e) {
      const key = name + ':' + e.message; (this.reported ||= new Set());
      if (!this.reported.has(key)) { this.reported.add(key); console.error('[' + name + ']', e); }
      if (this.manual && this.rethrow) throw e;
    }
  };
  frame(now, skipRender = false) {
    const raw = (now - this.last) / 1000;
    const dtReal = clamp(raw, 0, 1 / 20); this.last = now;
    if (!this.manual && !skipRender) this.engine.adapt(raw);
    this.input.update();
    if (!this.paused) {
      let ts = this.timeScale * this.slowmo;
      if (this.hitStop > 0) { this.hitStop -= dtReal; ts *= 0.05; }
      const dt = dtReal * ts; this.dt = dt;
      this.time += dt; this.rtime = (this.rtime || 0) + dtReal; this.state.playtime += dtReal;
      // each system runs guarded: an error in one is reported once and the frame still draws
      // (an uncaught error here used to freeze the picture while sound and input carried on)
      const run = this.guard;
      run('city', () => this.city?.update(dt, dtReal));
      run('world', () => this.world?.update?.(dt));
      for (const f of this.updaters) run('script', () => f(dt, dtReal));
      run('director', () => this.director.update(dt));
      run('kinematics', () => this.physics.syncKinematics());
      run('player', () => this.player.update(dt));
      run('tether', () => this.tether.update(dt));
      run('weapons', () => this.weapons.update(dt));
      run('enemies', () => this.enemies.update(dt));
      run('crowd', () => this.crowd.update(dt));
      for (const a of this.actors) run('actor', () => a.update(dt));
      run('physics', () => this.physics.step(dt));
      run('fx', () => this.fx.update(dt));
      run('camera', () => this.camera.update(dtReal * (this.slowmo < 1 ? Math.max(0.35, this.slowmo) : 1) * (this.hitStop > 0 ? 0.3 : 1) || dt));
      run('interact', () => this.interact.update());
      run('sky', () => this.sky?.update(dt));
      // audio listener follows the camera
      run('listener', () => { const cam = this.engine.camera; const f = cam.getWorldDirection(new THREE.Vector3()); this.audio.setListener(cam.position, f, cam.up); });
    }
    this.guard('hud', () => this.hud.update(dtReal));
    if (!skipRender) this.guard('render', () => this.engine.render(dtReal));
    this.input.endFrame();
    // fps meter
    this.fpsAcc += dtReal; this.fpsN++;
    if (this.fpsAcc > 0.5) { this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0; const el = document.getElementById('fps'); if (el && el.style.display === 'block') el.textContent = this.fps.toFixed(0) + ' fps · ' + this.engine.renderer.info.render.calls + ' calls · ' + Math.round(this.engine.renderer.getPixelRatio() * 100) + '% res'; }
  }
}

function tick() { return new Promise(r => setTimeout(r, 0)); }
