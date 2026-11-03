// GETAWAY! — game flow: title -> menu -> missions / free roam / garage, pause, results, failure & retry.
import * as THREE from 'three';
import { G } from './core/context.js';
import { HUD } from './ui/hud.js';
import { Menus } from './ui/menus.js';
import { Police } from './police/police.js';
import { Npcs } from './combat/npcs.js';
import { Stunts } from './core/stunts.js';
import { MissionRunner, makeMarkerMesh } from './missions/framework.js';
import { CAMPAIGN } from './missions/campaign.js';
import { FreeRoam } from './missions/freeroam.js';
import { headlightMaterials } from './vehicles/rostr.js';
import { buildCarModel, buildBikeModel } from './vehicles/models.js';
import { heliModel } from './police/police.js';
import { VEHICLES } from './vehicles/types.js';
import { loadCustomCars } from './vehicles/glbcars.js';
import { warmShaders } from './core/warm.js';

export async function setupFlow(game) {
  const flow = new Flow(game); G.flow = flow; G.game = game;
  await flow.init();
  return flow;
}
class Flow {
  constructor(game) { this.game = game; this.state = 'boot'; }
  async init() {
    const ui = document.getElementById('ui');
    G.hud = new HUD(ui); G.npcs = new Npcs(); G.police = new Police(G.world); G.stunts = new Stunts();
    this.menus = new Menus(ui, this); this.runner = new MissionRunner(this); this.free = new FreeRoam(this);
    G.hud.show(false); G.lighting.buildFlare(ui);
    // ESC / pause, pointer lock on click
    addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') { if (this.state === 'play') this.pause(); else if (this.state === 'paused' && this.menus.cur && this.menus.cur.querySelector('.logo')?.textContent === 'PAUSED') this.resume(); }
      if (this.state === 'play' && (e.code === 'Enter') && G.cam.cine && G.mission) { G.cam.stopCine(); this.hideIntro(); }
      if (e.code === 'F3') G.debug = !G.debug;
    });
    G.renderer.domElement.addEventListener('click', () => { if (this.state === 'play') G.input.requestLock(); });
    document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && this.state === 'play' && !this.noAutoPause) { /* keep playing; ESC handled above */ } });
    this.applySettings();
    await loadCustomCars(Object.keys(VEHICLES)); // real 3D car models imported in the garage / assets/cars/*.glb
    // shader warm-up: everything that can appear mid-game exists (hidden under the map) when we compile
    const warm = makeMarkerMesh(1, 0xffd36b, 2); warm.g.position.set(0, -300, 0); G.scene.add(warm.g);
    { const hm = headlightMaterials({ value: new Array(8).fill(0) }); const q = new THREE.PlaneGeometry(0.1, 0.1); q.setAttribute('ku', new THREE.Float32BufferAttribute(new Float32Array(8), 2)); for (const mt of [hm.lens, hm.glow]) { const w = new THREE.Mesh(q, mt); w.position.set(0, -300, 0); warm.g.add(w); } }
    // compile EVERY vehicle's shaders at boot (bikes, police bike, helicopter included): first-time compiles mid-game = multi-second freezes
    for (const id in VEHICLES) { const sp = VEHICLES[id]; const wm = sp.bike ? buildBikeModel(sp, sp.colors[0]) : buildCarModel(sp, sp.colors[0]); wm.root.position.set(0, -300, 0); warm.g.add(wm.root); }
    { const hm = heliModel(); (hm.g || hm).position.set(0, -300, 0); warm.g.add(hm.g || hm); }
    if (G.hud.updateChevrons) try { G.hud.updateChevrons(); } catch (e) {} // route chevrons: built now, not on the first GPS route
    warmShaders(warm.g);
    G.scene.remove(warm.g); // programs stay cached; the stand-ins don't need to live in the scene
    const q = new URLSearchParams(location.search);
    if (q.get('mission')) { this.startMission(CAMPAIGN.find((m) => m.id === q.get('mission')), +(q.get('cp') || 0)); return; }
    if (q.get('free') || q.get('drive')) { this.startFreeRoam(q.get('car') || null, q); return; }
    this.toMenu(true);
  }
  applySettings() {
    const s = G.settings; G.audio.setVolumes(s.master, s.music, s.sfx); G.music.volume = 1; G.input.sensitivity = s.sensitivity; G.input.invertY = !!s.invertY;
    G.cam.baseFov = s.fov; G.composer.bloom.enabled = s.bloom && s.quality !== 'low'; G.peds.setDensity(s.pedDensity); G.traffic.density = s.trafficDensity; if (G.perf) G.perf.setQuality(s); this.game.saveSettings();
  }
  toMenu(title = false) {
    this.state = 'menu'; G.mode = 'menu'; G.paused = false; G.hud.show(false); G.cam.mode = 'menu'; G.cam.cine = null; G.input.releaseLock();
    G.player.human.visible = false; if (G.player.mesh) G.player.mesh.visible = false;
    G.sky.setTime(19.2); G.sky.running = true; G.sky.dayScale = 1 / 60; G.traffic.enabled = true;
    G.player.teleport(60, 0, -40); G.traffic.populate(); G.peds.populate();
    if (title) this.menus.title(); else this.menus.main();
    if (G.audio.ready) G.music.play('main', { intensity: 2 });
  }
  onTitleContinue() { G.audio.init(); G.music.init(); this.applySettings(); G.music.play('main', { intensity: 2 }); this.menus.main(); }
  prepareWorld() {
    G.police.reset(); G.npcs.clear(); G.vehicles.clearAll(); G.traffic.clear(); G.peds.clear(); G.rigid.bodies.slice().forEach((b) => G.rigid.remove(b));
    G.player.revive(); if (G.player.vehicle) G.player.leaveVehicleInstant(); G.player.entering = null; G.player.action = null; G.player.human.visible = true; G.player.controlsLocked = false; G.player.carrying = null;
    G.hud.clearBlips(); G.hud.promptOverride = null; G.hud.warnOverride = null; G.cam.cine = null; G.cam.mode = 'foot'; G.cam.view = 0; G.traffic.enabled = true;
    // restore landmarks
    const hd = G.world.landmarks.hideout; hd.door.position.y = 3.15; hd.doorBox.disabled = false;
    const c = G.world.landmarks.construction; if (c) c.crane.hook.visible = true;
  }
  startMission(def, cp = 0) {
    if (G.perf) G.perf.grace = 4;
    if (!def || !def.impl && !def.checkpoints) return; const impl = def.impl || def; this.menus.clear(); this.endGarage(); this.free.stop();
    this.runner.abort(); this.prepareWorld(); this.state = 'play'; G.mode = 'play'; G.paused = false; G.hud.show(true); G.input.requestLock();
    this.runner.start(impl, cp);
  }
  startFreeRoam(car = null, q = null) {
    if (G.perf) G.perf.grace = 4;
    this.menus.clear(); this.endGarage(); this.runner.abort(); this.prepareWorld(); this.state = 'play'; G.mode = 'play'; G.paused = false; G.hud.show(true); G.input.requestLock();
    this.free.start(car, q);
  }
  showIntro(def) { this.menus.intro(def); }
  hideIntro() { this.menus.hideIntro(); }
  pause() { if (this.state !== 'play') return; this.state = 'paused'; G.paused = true; G.input.releaseLock(); G.music.duck(0.4, 9999); this.menus.pause(); }
  resume() { this.menus.clear(); this.state = 'play'; G.paused = false; G.music.duck(1, 0); G.input.requestLock(); }
  retry() { this.menus.clear(); this.state = 'play'; G.paused = false; G.hud.show(true); G.input.requestLock(); G.music.duck(1, 0); if (this.runner.def) this.runner.retry(); else this.startFreeRoam(); }
  restart() { this.menus.clear(); this.state = 'play'; G.paused = false; G.hud.show(true); G.input.requestLock(); G.music.duck(1, 0); this.runner.restart(); }
  quitToMenu() { this.menus.clear(); this.runner.abort(); this.free.stop(); this.prepareWorld(); G.music.duck(1, 0); this.toMenu(false); }
  missionFailed(reason) { this.state = 'paused'; G.paused = true; G.input.releaseLock(); this.menus.fail(reason); }
  missionComplete(r) { G.hud.bigText('MISSION COMPLETE', 'gold', 3, r.def.title); setTimeout(() => { this.state = 'results'; G.paused = true; G.input.releaseLock(); this.menus.results(r); }, 3200); }
  // garage preview: show selected car inside Dez's garage
  garagePreview(id) {
    const hd = G.world.landmarks.hideout; if (this.preview) G.vehicles.remove(this.preview);
    const mod = G.save.vehicleMods[id] || {}; this.preview = G.vehicles.spawn(id, { x: 552, y: 0.15, z: 152, yaw: 2.4, color: mod.color, parked: true }); this.preview.engineOn = false; this.preview.keep = true; this.preview.lightsOn = true;
    const v = this.preview; G.cam.play({ dur: 1e9, fov: 38, letterbox: false, pos: (k, t) => new THREE.Vector3(v.pos.x + Math.cos(t * 0.25) * 8, 2.1, v.pos.z + Math.sin(t * 0.25) * 8), look: () => new THREE.Vector3(v.pos.x, 0.8, v.pos.z) });
  }
  endGarage() { if (this.preview) { G.vehicles.remove(this.preview); this.preview = null; G.cam.cine = null; } }
}
