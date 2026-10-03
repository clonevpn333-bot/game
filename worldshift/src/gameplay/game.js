// Game orchestration: per-frame system updates, pause, save/load.
import { G } from '../core/state.js';
import * as THREE from 'three';
import { landmarkCenter } from '../world/layout.js';
import { STORY, playPrologue } from '../story/story.js';

const SAVE_KEY = 'worldshift.save.v1';
const NOINPUT = { axis: () => 0, key: () => false, keyPressed: () => false, keyReleased: () => false, btn: () => false, btnPressed: () => false, btnReleased: () => false, wheel: 0, mouseDX: 0, mouseDY: 0, locked: false };

export class Game {
  constructor() {
    this.systems = [];   // { update(dt), name } registered by gameplay modules
    this.saveTimer = 30;
    this.pauseEl = document.getElementById('pause');
  }

  register(sys) { this.systems.push(sys); return sys; }

  init(params) {
    this.setupHooks();
    const home = landmarkCenter('home');
    G.era = params.has('era') ? +params.get('era') : 0;
    G.dayTime = params.has('t') ? +params.get('t') : 17.6;
    const x = params.has('x') ? +params.get('x') : home.x - 2;
    const z = params.has('z') ? +params.get('z') : home.z - 45;
    G.player.teleport(x, 0.2, z, Math.PI / 2);
    G.cam.yaw = Math.PI / 2 + 0.3;
    G.cam.pitch = 0.12;
    G.lastSafe = { x, y: 0.2, z };
    G.shift.lastEra = G.era === 0 ? 2 : 0;
    G.shift.peekEra = G.shift.lastEra;
  }

  newGame() {
    G.events.emit('game:new');
    playPrologue(() => G.missions.start('seed'));
  }

  setupHooks() {
    G.events.on('player:died', () => {
      G.hud.showBanner('FLATLINED', 'The harness pulls you back…', 4, '#ff4040');
      setTimeout(() => {
        if (G.level) {
          const L = G.level, s = L.def.checkpoint || L.def.spawn;
          const w = L.W(s[0], s[1], s[2]);
          G.player.revive(w.x, w.y + 0.3, w.z);
          return;
        }
        const p = G.player;
        // respawn close by and keep mission progress
        const s = G.lastSafe || landmarkCenter('home');
        p.revive(s.x, (s.y || 0) + 0.3, s.z);
        G.authority.clear(G.era);
        const lost = Math.floor(G.inventory.cash[G.era] * 0.2);
        G.inventory.cash[G.era] -= lost;
        for (const n of G.crowd.npcs) if (n.alive && n.ai && n.ai.hostile && n.pos.distanceTo(p.pos) < 25 && !n.persistent) n.alive = false;
        G.hud.toast('Back on your feet — mission progress kept.', 'info', 3);
      }, 4000);
    });
    G.events.on('shift', (from, to) => {
      const p = G.player;
      G.fx.shiftMotes(p.pos.clone().setY(p.pos.y + 1), G.sky ? new THREE.Color(1, 1, 1) : null);
    });
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
    if (G.cutscene) {
      const was = G.cutscene.playing;
      G.cutscene.update(dt, input);
      if (was || G.cutscene.playing) {
        const p = G.player;
        p.update(dt, NOINPUT, G.cam.yaw);
        for (const s of this.systems) if (s !== G.interact && s !== G.combat && s !== G.missions) s.update(dt, NOINPUT);
        G.combat._updateDrones(dt);
        G.chunks.update(p.pos.x, p.pos.z, G.era);
        G.world.update(dt);
        G.hud.update(dt);
        G.audio.update(dt);
        G.audio.updateListener(G.camera, G.cam.yaw);
        G.shift.update(dt, NOINPUT);
        return;
      }
    }
    if (input.keyPressed('Escape') || (input.keyPressed('KeyP'))) { this.pause(true); return; }
    if (input.keyPressed('F3') || input.keyPressed('Backquote')) G.debug = !G.debug;
    if (input.keyPressed('KeyJ')) { this.pause(true); G.menus.journal(); return; }
    if (input.keyPressed('KeyM')) { this.pause(true); G.menus.map(); return; }
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
