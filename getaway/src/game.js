// GETAWAY! — game orchestrator: boot, systems, main loop, slow motion, mode transitions.
import * as THREE from 'three';
import { G } from './core/context.js';
import { clamp, rand } from './core/utils.js';
import { Input } from './core/input.js';
import { AudioEngine } from './core/audio.js';
import { Music } from './core/music.js';
import { loadSave, storeSave, loadSettings, storeSettings } from './core/save.js';
import { createRenderer, createComposer } from './core/renderer.js';
import { CameraRig } from './core/camera.js';
import { generateCity } from './world/city.js';
import { Sky } from './world/sky.js';
import { Props } from './world/props.js';
import { FX } from './fx/fx.js';
import { RigidWorld } from './fx/rigid.js';
import { VehicleManager } from './vehicles/manager.js';
import { Traffic } from './vehicles/traffic.js';
import { HumanRenderer } from './characters/humanoid.js';
import { Peds } from './characters/peds.js';
import { Player } from './characters/player.js';
import { Combat } from './combat/combat.js';
import { setAniso } from './world/textures.js';

export class Game {
  constructor() { this.last = performance.now(); this.fpsT = 0; this.frames = 0; this.fps = 60; this.hooks = []; }
  async boot(progress = () => {}) {
    G.settings = loadSettings(); G.save = loadSave(); G.quality = G.settings.quality;
    const container = document.getElementById('game');
    G.renderer = createRenderer(container, G.settings); setAniso(G.renderer.capabilities.getMaxAnisotropy());
    G.scene = new THREE.Scene(); G.camera = new THREE.PerspectiveCamera(G.settings.fov, innerWidth / innerHeight, 0.2, 6000);
    G.input = new Input(G.renderer.domElement); G.input.sensitivity = G.settings.sensitivity; G.input.invertY = G.settings.invertY;
    G.audio = new AudioEngine(); G.music = new Music(G.audio);
    progress(0.1, 'Paving the streets of Port Sol…'); await tick();
    G.world = generateCity(G.scene, G.quality);
    progress(0.5, 'Planting palm trees & hydrants…'); await tick();
    G.props = new Props(G.world, G.scene); G.fx = new FX(G.scene, G.world.static); G.fx.quality = G.quality === 'low' ? 0.4 : G.quality === 'medium' ? 0.7 : 1;
    G.rigid = new RigidWorld(G.world.static);
    G.sky = new Sky(G.scene, G.renderer); G.sky.nightMats = G.world.nightMats; G.sky.registerWet([G.world.mats.road, G.world.mats.roadRes, G.world.mats.hwy, G.world.mats.isect, G.world.mats.asphalt, G.world.mats.walk]);
    progress(0.7, 'Fueling 40 cars…'); await tick();
    G.vehicles = new VehicleManager(G.scene, G.world.static); G.combat = new Combat(G.world.static);
    G.traffic = new Traffic(G.world); G.humans = new HumanRenderer(G.scene, 380); G.peds = new Peds(G.world); G.peds.setDensity(G.settings.pedDensity);
    G.player = new Player(); G.combat.addTarget(G.player.target);
    G.cam = new CameraRig(G.camera); G.cam.baseFov = G.settings.fov;
    G.composer = createComposer(G.renderer, G.scene, G.camera, G.settings);
    this.interiorLights = G.world.interiorLights.map((l) => { const p = new THREE.PointLight(l.color, l.intensity, l.distance, 1.5); p.position.set(l.x, l.y, l.z); G.scene.add(p); return p; });
    this.extraUpdaters = [];
    progress(0.9, 'Tuning engines…'); await tick();
    addEventListener('resize', () => this.resize());
    G.on('slowmo', (dur, scale) => this.slowmo(dur, scale));
    window.__game = this;
    return this;
  }
  resize() { G.camera.aspect = innerWidth / innerHeight; G.camera.updateProjectionMatrix(); G.renderer.setSize(innerWidth, innerHeight); G.composer.setSize(innerWidth, innerHeight); }
  slowmo(dur = 1.2, scale = 0.3) { this.smT = Math.max(this.smT || 0, dur); this.smScale = scale; }
  addUpdater(fn) { this.extraUpdaters.push(fn); return () => this.extraUpdaters.splice(this.extraUpdaters.indexOf(fn), 1); }
  saveNow() { storeSave(G.save); }
  saveSettings() { storeSettings(G.settings); }
  start() { const loop = () => { this.frame(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  // headless/test helper: advance the simulation without rendering
  simulate(seconds, dt = 1 / 60) { const n = Math.round(seconds / dt); window.__fixedDt = dt; for (let i = 0; i < n; i++) this.frame(true); window.__fixedDt = 0; }
  frame(noRender = false) {
    const now = performance.now(); let rdt = Math.min(0.05, (now - this.last) / 1000); this.last = now; if (window.__fixedDt) rdt = window.__fixedDt;
    this.fpsT += rdt; this.frames++; if (this.fpsT > 0.5) { this.fps = this.frames / this.fpsT; this.fpsT = 0; this.frames = 0; }
    const input = G.input; input.poll(); G.frame++;
    // slow motion
    let scale = 1; if (this.smT > 0) { this.smT -= rdt; scale = this.smT > 0.25 ? this.smScale : clamp(this.smScale + (0.25 - this.smT) * 4 * (1 - this.smScale), this.smScale, 1); }
    G.timeScale = scale; G.slowmo = 1 - scale; if (G.audio) G.audio.setSlowmo(scale);
    const dt = G.paused ? 0 : rdt * scale; G.dt = dt; G.rdt = rdt;
    if (!G.paused) G.time += dt;
    for (const fn of this.extraUpdaters) fn(dt, rdt);
    if (!G.paused && G.mode === 'play') {
      G.player.update(dt, input);
      if (G.mission) G.mission.update(dt);
      if (G.police) G.police.update(dt);
      if (G.npcs) G.npcs.update(dt);
      if (G.trains) G.trains.update(dt);
      G.traffic.update(dt); G.peds.update(dt); G.vehicles.update(dt); G.rigid.step(dt); G.combat.update(dt);
      if (G.stunts) G.stunts.update(dt);
    } else if (G.mode === 'menu' && !G.paused) { G.vehicles.update(dt); G.traffic.update(dt); G.peds.update(dt); G.rigid.step(dt); }
    if (!G.paused) { G.props.update(dt, G.time, G.sky.night); G.fx.update(dt); }
    const focus = G.mode === 'menu' ? G.cam.look : (G.player.vehicle ? G.player.vehicle.pos : G.player.pos);
    G.sky.update(G.paused ? 0 : dt, focus, G.camera.position, G.audio);
    G.cam.update(G.paused ? 0 : rdt, input);
    // pier wheel
    if (G.world.landmarks.pier) G.world.landmarks.pier.wheel.rotation.x += dt * 0.06;
    for (const l of this.interiorLights) l.visible = l.position.distanceToSquared(G.camera.position) < 120 * 120;
    // characters
    G.humans.begin(); G.peds.draw(G.humans); if (G.player.human.visible) G.humans.draw(G.player.human); if (G.npcs) G.npcs.draw(G.humans); G.humans.end();
    // audio listener + ambience
    if (G.audio.ready) {
      G.audio.updateListener(G.camera.position, G.camera.getWorldDirection(new THREE.Vector3()), G.cam.vel);
      const d = G.world.district(G.camera.position.x, G.camera.position.z); const pv = G.player.vehicle;
      G.audio.updateAmbience(rdt, { city: d === 'downtown' || d === 'shopping' ? 0.8 : d === 'hills' || d === 'airport' ? 0.2 : 0.5, rain: G.sky.w.rain, wind: pv ? clamp((pv.speed - 15) / 50, 0, 1) : clamp(G.camera.position.y / 120, 0, 0.7), sea: d === 'beach' || d === 'port' ? 1 : 0, day: G.sky.day });
    }
    if (G.hud) G.hud.update(rdt);
    // post fx uniforms
    const gr = G.composer.grade.uniforms; const pv = G.player.vehicle;
    gr.speed.value = pv && G.settings.motionBlurFx ? clamp((pv.speed - 28) / 45, 0, 1) + (pv.ctrl.boost && pv.ctrl.throttle ? 0.35 : 0) : 0;
    gr.damage.value = G.mode === 'play' ? clamp(1 - G.player.health / 55, 0, 1) * 0.8 + (G.time - G.player.lastHit < 0.25 ? 0.4 : 0) : 0;
    gr.slowmo.value = G.slowmo; gr.letterbox.value = G.cam.letterbox; gr.flash.value = G.sky.flash * 0.15 + (this.flash || 0); this.flash = Math.max(0, (this.flash || 0) - rdt * 3);
    gr.underwater.value = G.camera.position.y < -0.85 && G.world.static.waterLevel(G.camera.position.x, G.camera.position.z) > -1 ? 1 : 0;
    if (!noRender) G.composer.render(rdt);
    input.endFrame(true);
    window.__frames = (window.__frames || 0) + 1;
  }
}
function tick() { return new Promise((r) => setTimeout(r, 0)); }
