/* Summit — application shell. Owns the renderer, the connection, the screens
 * and the frame loop, and hands each frame to whichever scene is active. */
import * as THREE from '../../../vendor/three/three.module.js';
import { Stage } from './gfx/scene.js';
import { Input } from './play/input.js';
import { CameraRig } from './play/camera.js';
import { Audio } from './audio.js';
import { Net } from './net.js';
import { createWorld } from '../shared/mountain.js';
import { PHASE } from '../shared/constants.js';
import { HUD } from './ui/hud.js';
import { Loading, MainMenu, Settings, Pause } from './ui/screens.js';
import { LobbyPanel } from './ui/lobby.js';
import { Shop } from './ui/shop.js';
import { Results } from './ui/results.js';
import { Social } from './ui/social.js';
import { RunScene } from './flow/run.js';
import { LobbyScene, makeFlatWorld } from './flow/lobbyscene.js';
import { loadProfile, saveProfile } from './ui/kit.js';
import { ITEMS } from '../shared/items.js';

class App {
  constructor() {
    this.ui = document.getElementById('ui');
    this.canvas = document.getElementById('view');
    this.loading = new Loading(this.ui);
    this.profile = loadProfile();
    this.name = this.profile.name || 'Climber';
    this.look = this.profile.look;

    const quality = localStorage.getItem('summit.quality') || 'high';
    this.stage = new Stage(this.canvas, quality);
    this.input = new Input(this.canvas);
    this.audio = new Audio();
    this.cam = new CameraRig(this.stage.camera, null);
    this.hud = new HUD(this.ui);
    this.hud.show(false);
    this.social = new Social(this.ui, {
      onChat: (t) => this.net.chat(t),
      onEmote: (k) => { this.net.emote(k); this.playEmote(this.net.id, k); },
    });
    this.social.bindInput(this.input);

    this.flatWorld = makeFlatWorld();
    this.world = null;
    this.run = null;
    this.lobby = null;
    this.mode = 'menu';
    this.roster = [];
    this.panels = {};
    this.runStart = 0;

    this.net = new Net({
      url: 'ws://localhost:8787/ws',
      onWelcome: (d) => this.onWelcome(d),
      onRoom: (r) => this.onRoom(r),
      onPhase: (p) => this.onPhase(p),
      onEvent: (e) => this.onEvent(e),
      onChat: (c) => this.social.push(c.name, c.text),
      onResults: (r) => this.onResults(r),
    });

    this.input.onUnlock = () => {
      if (this.mode === 'run') this.openPause();
      else if (this.mode === 'lobby') this.panels.lobby?.show();
    };
    addEventListener('keydown', (e) => this.onKey(e));
    addEventListener('keyup', (e) => { if (e.code === 'KeyC' && this.social.wheelOpen) this.social.closeWheel(); });

    this.buildMenu();
    this.loading.set(0.15, 'Generating textures…');
    requestAnimationFrame(() => this.warmUp());
  }

  async warmUp() {
    // Force the heavy procedural work to happen behind the loading screen.
    const { materials } = await import('./gfx/materials.js');
    materials();
    this.loading.set(0.55, 'Building the airfield…');
    await frame();
    this.lobbyWorldReady();
    this.loading.set(1, 'Ready');
    setTimeout(() => this.loading.done(), 250);
    this.loop();
  }

  lobbyWorldReady() {
    this.lobby = new LobbyScene(this, this.flatWorld);
    this.lobby.setVisible(false);
  }

  buildMenu() {
    this.menu = new MainMenu(this.ui, {
      onHost: (v) => this.connect(v, null),
      onJoin: (v) => this.connect(v, v.code),
      onShop: () => this.openShop(),
      onSettings: () => this.openSettings(),
    });
  }

  connect(v, code) {
    this.name = v.name;
    this.audio.start();
    this.net.url = v.server;
    this.net.name = v.name;
    this.net.cos = this.look;
    this.net.wantsReconnect = true;
    this.net.connect();
    const go = () => {
      if (this.net.status !== 'online') { setTimeout(go, 120); return; }
      if (code) this.net.joinRoom(code, v.name, this.look, this.look.pack);
      else this.net.createRoom(v.name, this.look, this.look.pack);
    };
    go();
    this.menu.setError('Connecting…');
    this.connectTimeout = setTimeout(() => {
      if (!this.net.id) this.menu.setError('No answer from ' + v.server + ' — is the server running?');
    }, 6000);
  }

  onWelcome(d) {
    clearTimeout(this.connectTimeout);
    this.menu.setError('');
    this.menu.hide();
    this.seed = d.seed;
    this.ensureWorld(d.seed);
    this.openLobbyPanel();
    this.mode = 'lobby';
    this.lobby?.setVisible(true);
    this.hud.show(false);
  }

  ensureWorld(seed) {
    if (this.world && this.world.seed === (seed >>> 0)) return;
    this.world = createWorld(seed);
    this.cam.world = this.world;
    if (this.run) { this.run.dispose(); this.run = null; }
  }

  openLobbyPanel() {
    if (this.panels.lobby) this.panels.lobby.show();
    else {
      this.panels.lobby = new LobbyPanel(this.ui, {
        onReady: (v) => this.net.setReady(v),
        onShop: () => this.openShop(),
        onLeave: () => location.reload(),
        onWalk: () => { this.panels.lobby.hide(); this.input.requestLock(); this.audio.start(); },
        onCopy: () => {
          const text = `Join my Summit run — server ${this.net.url}, room code ${this.net.room?.code}`;
          navigator.clipboard?.writeText(text);
          this.social.push('System', 'Invite copied to the clipboard', '#e9c68c');
        },
      });
    }
    this.panels.lobby.setRoom(this.net.room, this.net.id);
  }

  onRoom(room) {
    this.roster = room?.players || [];
    this.panels.lobby?.setRoom(room, this.net.id);
  }

  onPhase(p) {
    const phase = p.phase;
    if (p.seed != null) this.ensureWorld(p.seed);
    if (phase === PHASE.FLIGHT) {
      this.runStart = Date.now();
      this.panels.lobby?.hide();
      this.startRun();
    }
    if (phase === PHASE.LOBBY) {
      this.mode = 'lobby';
      this.run?.setVisible(false);
      this.lobby?.setVisible(true);
      this.hud.show(false);
      this.openLobbyPanel();
      this.panels.lobby.ready = false;
      this.panels.lobby.readyBtn.textContent = 'Ready up';
      this.panels.lobby.readyBtn.className = 'btn btn--primary';
    }
    if (phase === PHASE.CLIMB) this.hud.showBanner('The beach', 'Start climbing');
    if (phase === PHASE.EXTRACT) { this.hud.showBanner('Helicopter inbound', 'Get to the summit'); this.audio.heli(); }
  }

  startRun() {
    this.ensureWorld(this.seed);
    if (!this.run) this.run = new RunScene(this);
    this.mode = 'run';
    this.lobby?.setVisible(false);
    this.run.setVisible(true);
    this.hud.show(true);
    this.panels.lobby?.hide();
    this.run.prime(this.world.beach);
    this.input.requestLock();
  }

  onEvent(e) {
    const who = (id) => this.roster.find((p) => p.i === id)?.n || 'Someone';
    switch (e.e) {
      case 'countdown': this.panels.lobby?.setCountdown(e.t); break;
      case 'jumped': if (e.id === this.net.id) this.hud.showBanner('Out the door', 'Space opens the canopy'); break;
      case 'camp': this.hud.pushFeed(`<b>${who(e.by)}</b> lit a campfire`); this.audio.fireLit(); break;
      case 'respawn': this.hud.pushFeed(`<b>${who(e.id)}</b> is back on their feet`); break;
      case 'downed': this.hud.pushFeed(`<b>${who(e.id)}</b> went down`); if (e.id === this.net.id) this.audio.hurt(); break;
      case 'death': this.hud.pushFeed(`<b>${who(e.id)}</b> died`); if (e.id === this.net.id) this.audio.death(); break;
      case 'revived': this.hud.pushFeed(`<b>${who(e.id)}</b> was brought back`); break;
      case 'fall': if (e.d > 12) this.hud.pushFeed(`<b>${who(e.id)}</b> took a ${e.d} point fall`); break;
      case 'pickup': if (e.by === this.net.id) this.audio.pickup(); break;
      case 'use': if (e.by === this.net.id) this.hud.pushFeed(`Used <b>${ITEMS[e.item]?.name || e.item}</b>`); break;
      case 'give': this.hud.pushFeed(`<b>${who(e.by)}</b> passed ${ITEMS[e.item]?.name || 'an item'} to <b>${who(e.to)}</b>`); break;
      case 'boost': this.hud.pushFeed(`<b>${who(e.by)}</b> boosted <b>${who(e.id)}</b> up`); break;
      case 'ropethrow': this.hud.pushFeed(`<b>${who(e.by)}</b> threw a rope to <b>${who(e.id)}</b>`); break;
      case 'grab': this.hud.pushFeed(`<b>${who(e.by)}</b> picked up <b>${who(e.id)}</b>`); break;
      case 'mark': this.audio.ping(); break;
      case 'horn': this.audio.horn(); this.hud.pushFeed(`<b>${who(e.by)}</b> sounded the horn`); break;
      case 'anchor': this.hud.pushFeed('Anchor placed'); break;
      case 'zipline': this.hud.pushFeed('Zipline rigged'); break;
      case 'heli': if (e.state === 'landed') this.hud.showBanner('Helicopter down', 'Board it — press E'); break;
      case 'board': this.hud.pushFeed(`<b>${who(e.id)}</b> is aboard`); break;
      case 'emote': this.playEmote(e.id, e.k); break;
      case 'note': this.hud.pushFeed(e.text); break;
      case 'error': this.menu?.setError(e.text); this.hud.pushFeed(e.text); break;
      default: break;
    }
  }

  playEmote(id, k) {
    const set = this.mode === 'run' ? this.run?.climbers : this.lobby?.climbers;
    const c = set?.get(id);
    c?.anim.playEmote(k);
    if (k === 'horn') this.audio.horn();
  }

  onResults(r) {
    this.mode = 'results';
    this.input.releaseLock();
    this.hud.show(false);
    this.panels.results = new Results(this.ui, r, this.net.id, { onClose: () => { this.panels.results = null; } });
    if (r.extracted) this.audio.win();
  }

  onKey(e) {
    if (this.social.chatting) return;
    if (e.code === 'KeyT' && this.mode !== 'menu') { e.preventDefault(); this.social.openChat(this.input); return; }
    if (e.code === 'KeyV') this.cam.toggleView();
    if (e.code === 'Tab' && this.mode === 'lobby' && this.panels.lobby) {
      e.preventDefault();
      const hidden = this.panels.lobby.el.classList.contains('hide');
      if (hidden) { this.panels.lobby.show(); this.input.releaseLock(); }
      else { this.panels.lobby.hide(); this.input.requestLock(); }
    }
    if (e.code === 'KeyC' && !this.social.wheelOpen && this.mode !== 'menu') this.social.openWheel();
    if (e.code === 'Escape') {
      if (this.social.wheelOpen) this.social.closeWheel();
      else if (this.mode === 'run' && this.input.locked) this.input.releaseLock();
      else if (this.mode === 'lobby' && this.panels.lobby?.el.classList.contains('hide')) { this.panels.lobby.show(); this.input.releaseLock(); }
    }
  }

  openPause() {
    if (this.panels.pause || this.mode !== 'run') return;
    this.panels.pause = new Pause(this.ui, {
      onResume: () => { this.panels.pause = null; this.input.requestLock(); },
      onSettings: () => this.openSettings(),
      onLeave: () => location.reload(),
    });
  }
  openSettings() {
    if (this.panels.settings) return;
    this.panels.settings = new Settings(this.ui, {
      input: this.input, stage: this.stage,
      onClose: () => { this.panels.settings = null; },
    });
  }
  openShop() {
    if (this.panels.shop) return;
    this.panels.shop = new Shop(this.ui, {
      onClose: () => { this.panels.shop = null; },
      onLook: (look) => {
        this.look = look;
        this.profile = loadProfile();
        this.net.setCosmetics(look, look.pack);
        const set = this.mode === 'run' ? this.run?.climbers : this.lobby?.climbers;
        set?.get(this.net.id)?.setLook(look);
      },
    });
  }

  uiBlocking() {
    return !!(this.panels.pause || this.panels.settings || this.panels.shop || this.panels.results ||
      this.social.chatting || this.social.wheelOpen || (this.panels.lobby && !this.panels.lobby.el.classList.contains('hide')) ||
      !this.input.locked);
  }

  loop() {
    let last = performance.now();
    const frameFn = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.net.world = (this.net.phase === PHASE.LOBBY || this.net.phase === PHASE.RESULTS) ? this.flatWorld : this.world;
      this.cam.world = this.net.world;   // camera collision must use the same ground the sim does

      let focus = FOCUS;
      if (this.mode === 'run' && this.run) focus = this.run.update(dt).clone();
      else if (this.lobby && (this.mode === 'lobby' || this.mode === 'results')) focus = this.lobby.update(dt).clone();
      else { this.cam.yaw += dt * 0.06; this.cam.update(dt, MENU_FOCUS, { dist: 9 }); focus = MENU_FOCUS; }

      if (this.social.wheelOpen) {
        const l = this.input.takeLook();
        this.social.updateWheel(l.dx, l.dy);
      }
      this.stage.update(dt, focus, this.stage.dayT);
      this.stage.render();
      this.input.endFrame();
      requestAnimationFrame(frameFn);
    };
    requestAnimationFrame(frameFn);
  }
}

const FOCUS = new THREE.Vector3(0, 2, 0);
const MENU_FOCUS = new THREE.Vector3(0, 3, 0);
const frame = () => new Promise((r) => requestAnimationFrame(r));

window.__summit = new App();
