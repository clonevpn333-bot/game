// Game orchestration: per-frame system updates, pause, save/load.
import { G } from '../core/state.js';
import { landmarkCenter } from '../world/layout.js';

const SAVE_KEY = 'worldshift.save.v1';

export class Game {
  constructor() {
    this.systems = [];   // { update(dt), name } registered by gameplay modules
    this.saveTimer = 30;
    this.pauseEl = document.getElementById('pause');
  }

  register(sys) { this.systems.push(sys); return sys; }

  init(params) {
    const home = landmarkCenter('home');
    G.era = params.has('era') ? +params.get('era') : 0;
    G.dayTime = params.has('t') ? +params.get('t') : 17.6;
    const x = params.has('x') ? +params.get('x') : home.x - 2;
    const z = params.has('z') ? +params.get('z') : home.z - 40;
    G.player.teleport(x, 0.2, z, Math.PI / 2);
    G.cam.yaw = Math.PI / 2 + 0.3;
    G.cam.pitch = 0.12;
    G.lastSafe = { x, y: 0.2, z };
    G.shift.lastEra = G.era === 0 ? 2 : 0;
    G.shift.peekEra = G.shift.lastEra;
  }

  newGame() {
    G.events.emit('game:new');
  }

  hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (_) { return false; }
  }

  save() {
    try {
      const p = G.player;
      const data = {
        era: G.era, dayTime: G.dayTime, time: G.time,
        player: { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw, health: p.health },
        chronicle: G.chronicle.serialize(),
        missions: G.missions ? G.missions.serialize() : null,
        inventory: G.inventory ? G.inventory.serialize() : null,
        progression: G.progress ? G.progress.serialize() : null,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('save failed', e);
      return false;
    }
  }

  loadGame() {
    let data = null;
    try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (_) {}
    if (!data) { this.newGame(); return; }
    G.chronicle.load(data.chronicle);
    G.chunks.invalidateAll([0, 1, 2]);
    G.world.farDirty = [true, true, true];
    G.era = data.era;
    G.dayTime = data.dayTime;
    G.chunks.visibleEra = G.era;
    G.chunks.setVisibleEras([G.era]);
    G.world.setEraVisible([G.era]);
    G.sky.setEra(G.era);
    G.audio.setEraAmbience(G.era);
    const p = data.player;
    G.player.teleport(p.x, p.y + 0.3, p.z, p.yaw);
    G.player.health = p.health || 100;
    if (data.missions && G.missions) G.missions.load(data.missions);
    if (data.inventory && G.inventory) G.inventory.load(data.inventory);
    if (data.progression && G.progress) G.progress.load(data.progression);
    G.events.emit('game:loaded');
  }

  pause(on) {
    G.paused = on;
    if (on) {
      G.input.exitLock();
      if (G.menus) G.menus.openPause();
      else this.pauseEl.classList.remove('hidden');
    } else {
      if (G.menus) G.menus.close();
      this.pauseEl.classList.add('hidden');
      G.input.requestLock();
    }
  }

  update(dt, input) {
    if (input.keyPressed('Escape') || (input.keyPressed('KeyP'))) { this.pause(true); return; }
    if (input.keyPressed('F3') || input.keyPressed('Backquote')) G.debug = !G.debug;
    const p = G.player;
    G.shift.update(dt, input);
    for (const s of this.systems) if (s.preUpdate) s.preUpdate(dt, input);
    p.update(dt, input, G.cam.yaw);
    for (const s of this.systems) s.update(dt, input);
    G.cam.update(dt, input);
    const f = p.vehicle ? p.vehicle.pos : p.pos;
    G.chunks.update(f.x, f.z, G.era);
    G.world.update(dt);
    G.hud.update(dt);
    G.audio.update(dt);
    G.audio.updateListener(G.camera, G.cam.yaw);
    if (p.state === 'ground' && !p.vehicle && G.frame % 30 === 0) G.lastSafe = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
    this.saveTimer -= dt;
    if (this.saveTimer <= 0) { this.saveTimer = 45; this.save(); }
  }

  updatePaused(dt, input) {
    if (G.started && G.paused && input.keyPressed('Escape') && !(G.menus && G.menus.sub)) this.pause(false);
    if (G.started) G.cam.update(0, { locked: false, mouseDX: 0, mouseDY: 0, key: () => false });
    if (G.menus) G.menus.update(dt, input);
  }
}
