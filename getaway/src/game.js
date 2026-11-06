// GETAWAY! — game orchestrator: boot, systems, main loop, slow motion, mode transitions.
import { PerfGovernor, updateView } from './core/perf.js';
import { Guard } from './core/guard.js';
import { Rockets } from './missions/air.js';
import { Dents } from './fx/dents.js';
import { resolveQuality } from './core/quality.js';
import { InstanceCuller } from './core/instcull.js';
import { StreetAudio, RADIO_GENRES } from './core/streetaudio.js';
import { sanitize, sanitizeCamera } from './core/sanitize.js';
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
import { Decals } from './fx/decals.js';
import { RigidWorld } from './fx/rigid.js';
import { VehicleManager } from './vehicles/manager.js';
import { Traffic } from './vehicles/traffic.js';
import { HumanRenderer } from './characters/humanoid.js';
import { Peds } from './characters/peds.js';
import { Player } from './characters/player.js';
import { Combat } from './combat/combat.js';
import { setAniso } from './world/textures.js';
import { Lighting } from './fx/lighting.js';

export class Game {
  constructor() { this.last = performance.now(); this.fpsT = 0; this.frames = 0; this.fps = 60; this.hooks = []; }
  async boot(progress = () => {}) {
    G.settings = loadSettings(); G.save = loadSave(); const qOverride = new URLSearchParams(location.search).get('q'); const Q = resolveQuality(qOverride || G.settings.quality); G.quality = Q.level; G.Q = Q.preset; G.Qinfo = Q.detected;
    console.log('[quality]', G.settings.quality, '->', G.quality, Q.detected.gpu ? '(' + Q.detected.gpu + ', ' + Q.detected.cores + ' cores)' : '');
    const RS = { ...G.settings, quality: G.quality, shadows: G.settings.shadows && G.Q.shadows, bloom: G.settings.bloom && G.Q.bloom }; G.rs = RS;
    const container = document.getElementById('game');
    G.renderer = createRenderer(container, RS); setAniso(G.renderer.capabilities.getMaxAnisotropy());
    G.scene = new THREE.Scene(); G.camera = new THREE.PerspectiveCamera(G.settings.fov, innerWidth / innerHeight, 0.2, G.Q.viewFar);
    G.input = new Input(G.renderer.domElement); G.input.sensitivity = G.settings.sensitivity; G.input.invertY = G.settings.invertY;
    G.audio = new AudioEngine(); G.music = new Music(G.audio);
    progress(0.1, 'Paving the streets of Port Sol…'); await tick();
    G.world = generateCity(G.scene, G.quality);
    progress(0.5, 'Planting palm trees & hydrants…'); await tick();
    G.instCull = new InstanceCuller(); G.props = new Props(G.world, G.scene); G.fx = new FX(G.scene, G.world.static); G.decals = new Decals(G.scene); G.fx.quality = G.quality === 'low' ? 0.4 : G.quality === 'medium' ? 0.7 : 1;
    G.rigid = new RigidWorld(G.world.static);
    G.sky = new Sky(G.scene, G.renderer); G.sky.nightMats = G.world.nightMats; G.sky.registerWet([G.world.mats.road, G.world.mats.roadRes, G.world.mats.hwy, G.world.mats.isect, G.world.mats.asphalt, G.world.mats.walk]);
    progress(0.7, 'Fueling 40 cars…'); await tick();
    G.vehicles = new VehicleManager(G.scene, G.world.static); G.combat = new Combat(G.world.static); G.rockets = new Rockets(); G.dents = new Dents(G.scene); G.street = new StreetAudio();
    G.traffic = new Traffic(G.world); G.humans = new HumanRenderer(G.scene, 380); G.peds = new Peds(G.world); G.peds.setDensity(G.settings.pedDensity * G.Q.peds); G.traffic.density = G.Q.traffic;
    G.player = new Player(); G.combat.addTarget(G.player.target);
    G.cam = new CameraRig(G.camera); G.cam.baseFov = G.settings.fov;
    G.lighting = new Lighting(G.scene); G.lighting.buildLampPools(G.props);
    G.composer = createComposer(G.renderer, G.scene, G.camera, RS); G.perf = new PerfGovernor(G.renderer, G.composer, RS);
    // interior lights: 2 real lights reassigned to the nearest fixtures (every light costs every pixel of every lit shader)
    this.interiorDefs = G.world.interiorLights; this.interiorLights = [0, 1].map(() => { const p = new THREE.PointLight(0xffffff, 0, 40, 1.5); G.scene.add(p); return p; });
    // one shared searchlight for the police helicopter, created up front so no shader ever recompiles mid-game
    G.heliSpot = new THREE.SpotLight(0xf4f8ff, 0, 160, 0.16, 0.5, 1.2); G.heliSpot.castShadow = false; G.scene.add(G.heliSpot); G.scene.add(G.heliSpot.target);
    this.extraUpdaters = [];
    progress(0.9, 'Tuning engines…'); await tick();
    addEventListener('resize', () => this.resize());
    G.on('slowmo', (dur, scale) => this.slowmo(dur, scale));
    window.__game = this;
    return this;
  }
  resize() { G.camera.aspect = innerWidth / innerHeight; G.camera.updateProjectionMatrix(); G.renderer.setSize(innerWidth, innerHeight); G.composer.setSize(innerWidth, innerHeight); }
  slowmo(dur = 1.2, scale = 0.3) { this.smT = Math.max(this.smT || 0, dur); this.smScale = scale; }
  addUpdater(fn) { this.extraUpdaters.push(fn); return () => { const i = this.extraUpdaters.indexOf(fn); if (i >= 0) this.extraUpdaters.splice(i, 1); }; }
  saveNow() { storeSave(G.save); }
  saveSettings() { storeSettings(G.settings); }
  // never let one bad frame kill the game: schedule the next frame first, contain + log errors (a thrown error used to freeze everything)
  start() { let errs = 0; const loop = () => { requestAnimationFrame(loop); if (window.__fixedDt) return; /* a test is stepping frames itself */ try { this.frame(); } catch (e) { Guard.report('frame', e); } }; requestAnimationFrame(loop); }
  // headless/test helper: advance the simulation without rendering
  simulate(seconds, dt = 1 / 60) { const n = Math.round(seconds / dt); window.__fixedDt = dt; for (let i = 0; i < n; i++) this.frame(true); window.__fixedDt = 0; }
  frame(noRender = false) {
    const now = performance.now(); const rawMs = now - this.last; let rdt = Math.min(0.05, rawMs / 1000); this.last = now; if (window.__fixedDt) rdt = window.__fixedDt;
    if (!(rdt > 0)) rdt = 1 / 60;
    this.fpsT += rdt; this.frames++; if (this.fpsT > 0.5) { this.fps = this.frames / this.fpsT; this.fpsT = 0; this.frames = 0; }
    const input = G.input; const P = window.__prof; const run = P ? (n, f, r) => { const t0 = performance.now(); const x = Guard.run(n, f, r); P[n] = (P[n] || 0) + performance.now() - t0; return x; } : (n, f, r) => Guard.run(n, f, r);
    run('input', () => input.poll()); G.frame++;
    // slow motion
    let scale = 1; if (this.smT > 0) { this.smT -= rdt; scale = this.smT > 0.25 ? this.smScale : clamp(this.smScale + (0.25 - this.smT) * 4 * (1 - this.smScale), this.smScale, 1); }
    if (!(scale > 0)) scale = 1; G.timeScale = scale; G.slowmo = 1 - scale; if (G.audio) run('audio', () => G.audio.setSlowmo(scale));
    const dt = G.paused ? 0 : rdt * scale; G.dt = dt; G.rdt = rdt;
    if (!G.paused) G.time += dt;
    // every system is an isolated stage: a failure is logged + repaired, never fatal (src/core/guard.js)
    for (const fn of [...this.extraUpdaters]) run('mission updater', () => fn(dt, rdt));
    const resetFx = () => { for (const L of [G.fx.smoke, G.fx.glow, G.fx.fireL]) L.n = 0; };
    const resetDebris = () => { for (const b of [...G.rigid.bodies]) if (b.kind !== 'vehicle') G.rigid.remove(b); };
    if (!G.paused && G.mode === 'play') {
      run('player', () => G.player.update(dt, input), () => sanitize(0));
      if (G.mission) run('mission', () => G.mission.update(dt));
      if (G.police) run('police', () => G.police.update(dt), () => sanitize(0));
      if (G.npcs) run('npcs', () => G.npcs.update(dt), () => sanitize(0));
      if (G.trains) run('trains', () => G.trains.update(dt));
      run('traffic', () => G.traffic.update(dt), () => { G.traffic.clear(); G.traffic.populate(); });
      run('pedestrians', () => G.peds.update(dt), () => sanitize(0));
      run('vehicles', () => G.vehicles.update(dt), () => sanitize(0));
      run('physics', () => G.rigid.step(dt), resetDebris);
      run('combat', () => { G.combat.update(dt); G.rockets.update(dt); }, () => G.rockets.clear());
      if (G.stunts) run('stunts', () => G.stunts.update(dt));
    } else if (G.mode === 'menu' && !G.paused) { run('vehicles', () => G.vehicles.update(dt)); run('traffic', () => G.traffic.update(dt)); run('pedestrians', () => G.peds.update(dt)); run('physics', () => G.rigid.step(dt), resetDebris); }
    if (!G.paused) { run('props', () => G.props.update(dt, G.time, G.sky.night)); run('effects', () => G.fx.update(dt), resetFx); }
    run('sanitize', () => sanitize(dt));
    const focus = G.mode === 'menu' ? G.cam.look : (G.player.vehicle ? G.player.vehicle.pos : G.player.pos);
    run('sky', () => G.sky.update(G.paused ? 0 : dt, focus, G.camera.position, G.audio));
    run('camera', () => G.cam.update(G.paused ? 0 : rdt, input)); sanitizeCamera(); updateView();
    // pier wheel
    if (G.world.landmarks.pier) G.world.landmarks.pier.wheel.rotation.x += dt * 0.06;
    if ((G.frame & 7) === 0) run('lights', () => { const c = G.camera.position; const near = this.interiorDefs.map((d) => [d, (d.x - c.x) ** 2 + (d.y - c.y) ** 2 + (d.z - c.z) ** 2]).filter((e) => e[1] < 120 * 120).sort((a, b) => a[1] - b[1]);
      this.interiorLights.forEach((l, i) => { const e = near[i]; if (!e) { l.intensity = 0; return; } const d = e[0]; l.position.set(d.x, d.y, d.z); l.color.set(d.color); l.intensity = d.intensity; l.distance = d.distance; }); });
    // characters
    run('characters', () => { G.humans.begin(); G.peds.draw(G.humans); if (G.player.human.visible) G.humans.draw(G.player.human); if (G.npcs) G.npcs.draw(G.humans); if (G.extraHumans) for (const h of G.extraHumans) if (h.visible) G.humans.draw(h); }); run('characters', () => G.humans.end());
    if (G.lighting) run('lighting', () => G.lighting.update(rdt));
    // audio listener + ambience
    if (G.audio.ready && G.mode === 'play') run('street audio', () => { // murmuring groups + radios in passing cars
      const cars = this._radioCars || (this._radioCars = []); cars.length = 0;
      for (const v of G.vehicles.list) { if (v.isPlayer || v.dead || v.wreck || v.mode !== 'drive' || !v.ai || (v.isPolice && v.isPolice())) continue; if (v.radio === undefined) v.radio = Math.random() < 0.45 ? RADIO_GENRES[(Math.random() * RADIO_GENRES.length) | 0] : null; if (v.radio) cars.push(v); }
      G.street.update(rdt, G.peds.groups || [], cars); }, () => G.street && G.street.clear());
    if (G.audio.ready) run('audio', () => {
      G.audio.updateListener(G.camera.position, G.camera.getWorldDirection(new THREE.Vector3()), G.cam.vel);
      const d = G.world.district(G.camera.position.x, G.camera.position.z); const pv = G.player.vehicle;
      G.audio.updateAmbience(rdt, { city: d === 'downtown' || d === 'shopping' ? 0.8 : d === 'hills' || d === 'airport' ? 0.2 : 0.5, rain: G.sky.w.rain, wind: pv ? clamp((pv.speed - 15) / 50, 0, 1) : clamp(G.camera.position.y / 120, 0, 0.7), sea: d === 'beach' || d === 'port' ? 1 : 0, day: G.sky.day });
    });
    if (G.hud) run('hud', () => G.hud.update(rdt));
    // post fx uniforms
    run('post', () => {
      const gr = G.composer.grade.uniforms; const pv = G.player.vehicle;
      gr.speed.value = pv && G.settings.motionBlurFx ? clamp((pv.speed - 28) / 45, 0, 1) + (pv.ctrl.boost && pv.ctrl.throttle ? 0.35 : 0) : 0;
      gr.damage.value = G.mode === 'play' ? clamp(1 - G.player.health / 55, 0, 1) * 0.8 + (G.time - G.player.lastHit < 0.25 ? 0.4 : 0) : 0;
      gr.slowmo.value = G.slowmo; gr.letterbox.value = G.cam.letterbox; gr.flash.value = G.sky.flash * 0.15 + (this.flash || 0); this.flash = Math.max(0, (this.flash || 0) - rdt * 3);
      gr.underwater.value = G.camera.position.y < -0.85 && G.world.static.waterLevel(G.camera.position.x, G.camera.position.z) > -1 ? 1 : 0;
      if (gr.underwater.value > 0) { // under the sea: murk instead of sky, light fading with depth (a mission can tune it via G.underwater)
        const U = G.underwater || {}; const depth = Math.max(0, -0.8 - G.camera.position.y); const k = Math.exp(-depth / (U.att || 16)); const fc = (this._uwc || (this._uwc = new THREE.Color())).set(U.color ?? 0x0f4f5c).multiplyScalar((0.2 + 0.8 * k) * (0.25 + 0.75 * G.sky.day));
        G.scene.fog.color.copy(fc); G.scene.fog.near = U.near ?? 1; G.scene.fog.far = U.far ?? 55; const su = G.sky.uniforms; su.zenith.value.copy(fc); su.horizon.value.copy(fc); su.ground.value.copy(fc);
        G.sky.sun.intensity *= 0.12 + 0.45 * k; G.sky.hemi.intensity *= 0.35 + 0.45 * k; }
      for (const k in gr) if (typeof gr[k].value === 'number' && !Number.isFinite(gr[k].value)) gr[k].value = 0;
    });
    if (G.instCull) run('cull', () => G.instCull.update(rdt));
    if (!noRender && !G.perf.lost) run('render', () => { G.perf.tick(G.frame); G.composer.render(rdt); if (!window.__fixedDt) G.perf.frame(rawMs); }, () => G.perf.apply(G.perf.pr * 0.8));
    run('input', () => input.endFrame(true));
    window.__frames = (window.__frames || 0) + 1;
  }
}
function tick() { return new Promise((r) => setTimeout(r, 0)); }
