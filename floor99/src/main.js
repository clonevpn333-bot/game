// FLOOR 99 — application shell: boot, menus, lounge, elevator transitions, floor flow.
import * as THREE from 'three';
import { Renderer } from './engine/renderer.js';
import { Input } from './engine/input.js';
import { AudioEngine } from './audio/audio.js';
import { Music } from './audio/music.js';
import { Host } from './game/host.js';
import { HUD } from './ui/hud.js';
import { Save } from './save.js';
import { FLOORS, PLAYABLE_ORDER } from './config.js';
import { MenuScene, LoungeScene, ElevatorScene } from './ui/scenes.js';
import { floorSelect, loadout, settings, soundtrack, credits, loungeTab, bindHover, isUnlocked } from './ui/menus.js';
import { Game } from './game/game.js';
import { BUILD } from './build.js';
import { StudioChat } from './ui/chat.js';
import { AnimationStudio } from './ui/studio.js';

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TICKER = [
  ['BREAKING', 'Contestant 99 refuses to die. Producers "thrilled", "concerned".'],
  ['RATINGS', 'Floor 99 is the #1 show on every channel. There are no other channels.'],
  ['SPONSOR', 'Halo Brand Dustpans — for when the contestant is the mess.'],
  ['WEATHER', 'Floor 12: 100% chance of indoor flooding.'],
  ['VOTE', 'The audience decides! Text CHAOS to 99-99-99.'],
  ['SAFETY', 'The Tower has gone 0 days without an incident. A new record!'],
  ['HALO SAYS', '"I love every single one of my contestants. All ninety-eight of them. Loved."'],
  ['CLASSIFIED', 'Who is IRIS? Halo says: "Who?"'],
];

class App {
  constructor() {
    this.save = new Save();
    this.settings = this.save.data.settings;
    // each build has its own tuned quality ladder; start on that build's default rung
    if (!this.settings.qualityPicked) this.settings.quality = BUILD.fast ? 'medium' : 'high';
    document.title = `FLOOR 99 — ${BUILD.name}`;
    this.renderer = new Renderer($('app'), this.settings.quality);
    this.input = new Input(this.renderer.renderer.domElement);
    this.audio = new AudioEngine();
    this.music = new Music(this.audio);
    this.host = new Host(this);
    this.hud = new HUD(this);
    this.chat = new StudioChat(this);
    this.state = 'boot';
    this.game = null;
    this.clock = new THREE.Clock();
    this.panelReturn = 'menu';
    this.applySettings();
    this.input.onLockChange = (locked) => this._onLock(locked);
    window.__floor99 = this; // handy for debugging & automated tests
    this._bindUI();
    this._boot();
    this._initStudio();
    this.renderer.renderer.setAnimationLoop(() => this._frame());
  }

  _initStudio() {
    const btn = document.createElement('button');
    btn.id = 'animationStudioLaunch'; btn.textContent = 'ANIMATION STUDIO · F8';
    $('app').appendChild(btn); this.studioButton = btn;
    const open = () => { this.animationStudio ??= new AnimationStudio(this); this.animationStudio.open(); };
    btn.onclick = open;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F8' && !e.repeat) {
        e.preventDefault();
        if (this._starting || ['boot', 'elevator'].includes(this.state)) return;
        if (this.animationStudio?.active) this.animationStudio.close(); else open();
      } else if (e.code === 'Escape' && this.animationStudio?.active) { e.preventDefault(); this.animationStudio.close(); }
    });
  }
  applySettings(changed) {
    if (changed === 'quality') this.settings.qualityPicked = true;
    const s = this.settings;
    this.input.sensitivity = s.sensitivity;
    this.input.invertY = s.invertY;
    this.audio.vol = { master: s.master, music: s.music, sfx: s.sfx, voice: s.voiceVol };
    this.audio.applyVolumes();
    if (changed === 'quality' && this.renderer.qualityName !== s.quality) {
      this.renderer.setQuality(s.quality);
      // shadow/AA changes need shader rebuilds
      for (const sc of [this.game?.scene, this.menuScene?.scene, this.lounge?.scene, this.elevator?.scene]) sc?.traverse((o) => { if (o.material) for (const m of [].concat(o.material)) m.needsUpdate = true; });
      if (this.game?.keyLight) this.game.keyLight.castShadow = this.renderer.q.shadows;
    }
    if (!s.voice) this.host.stopVoice();
  }

  async _boot() {
    $('bootStatus').textContent = 'TUNING THE BAND · POLISHING THE ROBOTS…';
    try { await document.fonts.load('80px Anton'); await document.fonts.load('16px "Chakra Petch"'); } catch (e) { }
    this.menuScene = new MenuScene(this.host);
    this.elevator = new ElevatorScene(this.host);
    this.elevator.scene.environment = this.renderer.envMap;
    this.menuScene.scene.environment = this.renderer.envMap;
    // pre-warm the menu scene shaders
    this.renderer.renderer.compile(this.menuScene.scene, this.menuScene.camera);
    $('bootStatus').textContent = 'READY. THE AUDIENCE IS WAITING.';
    $('bootBtn').disabled = false;
    $('bootBtn').addEventListener('click', () => this._goLive(), { once: true });
    if (new URLSearchParams(location.search).has('autostart')) this._goLive();
  }
  _goLive() {
    this.audio.init();
    this.audio.setCrowd(true, 0.4);
    this.audio.play('cheer', { big: 1.4 });
    this.audio.play('jingle');
    $('boot').classList.remove('active');
    this.showMenu();
    const q = new URLSearchParams(location.search);
    if (q.has('floor')) this.startFloor(+q.get('floor'), { skipElevator: true, checkpoint: +(q.get('cp') || 0) });
  }

  // ------------------------------------------------------------------ screens
  _screen(id) {
    for (const s of ['menu', 'panel', 'lounge', 'hud', 'card', 'pause']) $(s).classList.toggle('active', s === id || (Array.isArray(id) && id.includes(s)));
  }
  showMenu() {
    this.state = 'menu';
    this.input.unlock();
    this._screen('menu');
    this.music.play('menu', 'full');
    this.audio.setCrowd(true, 0.25);
    const started = this.save.data.progress.started;
    document.querySelector('[data-act=continue]').classList.toggle('disabled', !started);
    $('menuFoot').innerHTML = `${Object.keys(this.save.data.progress.completed).length} / ${PLAYABLE_ORDER.length} BUILT FLOORS CLEARED · ${this.save.totalStars()}★ · ${this.save.data.fans} FANS<br>Two-finger click toggles aim · WASD move · SHIFT sprint · SPACE jump · C slide · Q dodge · E grapple · F melee · RMB aim · LMB fire`;
    $('ticker').innerHTML = TICKER.concat(TICKER).map(([a, b]) => `<span><b>${a}</b>${b}</span>`).join('');
    bindHover($('menu'), this.audio);
    if (!this._menuGreeted) { this._menuGreeted = true; setTimeout(() => this.host.say('halo', 'Welcome, welcome, WELCOME to FLOOR NINETY-NINE! The show where the audience decides and the building wants you dead!', { mood: 'gleeful' }), 800); }
  }
  openPanel(kind, from = 'menu') {
    this.panelReturn = from;
    this.state = from === 'game' ? 'game' : this.state;
    $('panel').classList.add('active');
    const titles = { floors: 'FLOOR SELECT', loadout: 'LOADOUT', settings: 'SETTINGS', soundtrack: 'SOUNDTRACK', credits: 'CREDITS' };
    $('panelTitle').textContent = titles[kind];
    $('panelTabs').innerHTML = '';
    const body = $('panelBody');
    ({ floors: floorSelect, loadout, settings, soundtrack, credits })[kind](this, body);
    this.audio.play('uiClick');
  }
  closePanel() {
    $('panel').classList.remove('active');
    this.audio.play('uiBack');
    if (this.panelReturn === 'menu') this.showMenu();
  }
  _bindUI() {
    $('menuItems').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const act = b.dataset.act;
      this.audio.play('uiClick');
      if (act === 'play') { if (!this.save.data.progress.started) this.startFloor(1); else this.showLounge(); }
      else if (act === 'continue') this.showLounge();
      else this.openPanel(act, 'menu');
    });
    $('panelClose').addEventListener('click', () => this.closePanel());
    $('loungeGo').addEventListener('click', () => {
      const nf = this.nextFloor();
      if (!nf) { this.audio.play('uiDeny'); this.host.say('halo', 'The elevator is closed for renovations. Floors above twelve are still being... decorated.', { mood: 'nervous' }); return; }
      this.audio.play('uiClick');
      this.startFloor(nf);
    });
    document.querySelector('.pause-items').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      this.audio.play('uiClick');
      const act = b.dataset.act;
      if (act === 'resume') this.resume();
      else if (act === 'restart') this.retry(true);
      else if (act === 'restartFloor') this.retry(false);
      else if (act === 'settings') this.openPanel('settings', 'game');
      else if (act === 'lounge') { this.endGame(); this.showLounge(); }
      else if (act === 'menu') { this.endGame(); this.showMenu(); }
    });
    bindHover($('pause'), this.audio);
    $('controlsRef').innerHTML = [['Move', 'W A S D'], ['Sprint', 'SHIFT'], ['Jump / double jump / wall-jump', 'SPACE'], ['Slide (while running)', 'C'], ['Dodge (also in air)', 'Q'], ['Grapple / chain-yank robots', 'E'], ['Melee (blades / hammer)', 'F or V'], ['Fire / Aim', 'LMB / RMB'], ['Reload', 'R'], ['Weapons', '1 2 3 / wheel'], ['Wall-run', 'jump at a wall, hold W'], ['Vault', 'run at a ledge']].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
    // canvas click: lock pointer in game
    // any click during gameplay captures the mouse (HUD overlays included; the intro card is passive)
    window.addEventListener('mousedown', () => {
      const cardBlocking = $('card').classList.contains('active') && !$('card').classList.contains('passive');
      if (this.state === 'game' && !this.input.locked && !$('pause').classList.contains('active') && !$('panel').classList.contains('active') && !cardBlocking) this.input.lock();
    });
    $('clickToResume').addEventListener('click', () => this.input.lock());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        if ($('panel').classList.contains('active')) { this.closePanel(); return; }
        if (this.state === 'game' && $('pause').classList.contains('active')) { /* browsers need a click to re-lock */ }
      }
      if (this.state === 'dead' && (e.code === 'KeyR' || e.code === 'Space' || e.code === 'Enter')) this.retry(true);
      if (this.state === 'complete' && (e.code === 'Enter' || e.code === 'Space')) this.showLounge();
    });
  }
  _onLock(locked) {
    $('clickToResume').classList.toggle('on', !locked && this.state === 'game' && !$('pause').classList.contains('active') && !!this.game && !this.game.ended && !this._resumeGrace);
    if (locked) { $('clickToResume').classList.remove('on'); if (this.game) this.game.paused = false; $('pause').classList.remove('active'); this.music.setDuck(1, 0.2); }
    else if (this.state === 'game' && this.game && !this.game.ended && this._started) this.pause();
  }
  pause() {
    if (!this.game || this.game.ended) return;
    this.input?.clearAim?.();
    this.game.paused = true;
    $('pause').classList.add('active');
    $('clickToResume').classList.remove('on');
    this.music.setDuck(0.35, 0.2);
    for (const l of ['slide', 'rail', 'grapple']) this.audio.loop(l, 0, { tc: 0.015 });
    this.host.pauseVoice();
  }
  resume() {
    $('pause').classList.remove('active');
    $('panel').classList.remove('active');
    this.input.lock();
    if (this.game) this.game.paused = false;
    this.music.setDuck(1, 0.2);
    this.host.resumeVoice();
  }

  // ------------------------------------------------------------------ lounge
  nextFloor() {
    for (const f of PLAYABLE_ORDER) if (!this.save.data.progress.completed[f]) return f;
    return null;
  }
  updateFans() { $('loungeFans').innerHTML = `${this.save.data.fans.toLocaleString()} FANS<small>${this.save.totalStars()}★ RATING</small>`; }
  showLounge(tab = 'next') {
    this.endGame();
    this.state = 'lounge';
    this.input.unlock();
    if (!this.lounge) { this.lounge = new LoungeScene(this.host, this.save.data.look); this.lounge.scene.environment = this.renderer.envMap; }
    this.lounge.setLook(this.save.data.look);
    this._screen('lounge');
    this.music.play('lounge', 'full');
    this.audio.setCrowd(false);
    this.updateFans();
    const tabs = [['next', 'NEXT FLOOR'], ['loadout', 'LOADOUT'], ['wardrobe', 'WARDROBE'], ['shop', 'SHOP'], ['records', 'RECORDS'], ['jukebox', 'JUKEBOX'], ['challenges', 'FLOORS & CHALLENGES']];
    const tl = $('loungeTabs');
    tl.innerHTML = tabs.map(([k, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('');
    tl.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => { tl.querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === b)); this.audio.play('uiClick'); loungeTab(this, b.dataset.tab, $('loungeBody')); }));
    loungeTab(this, tab, $('loungeBody'));
    bindHover($('lounge'), this.audio);
    $('loungeGo').style.display = this.nextFloor() ? '' : 'none';
    const lines = ['Welcome to the Contestant Lounge! Complimentary towels. Mandatory smiling.', 'Relax! Hydrate! Sign this waiver!', 'The lounge is a safe space. Mostly. Do not touch the minibar.', 'Fresh outfit? The audience loves a costume change!', 'Take a breather, champ. The building is reloading.'];
    setTimeout(() => this.host.say('halo', lines[(Math.random() * lines.length) | 0], { mood: 'happy' }), 600);
  }

  // ------------------------------------------------------------------ floor flow
  async startFloor(id, opts = {}) {
    const def = FLOORS[id];
    if (!def || (!isUnlocked(this, id) && !opts.force && !new URLSearchParams(location.search).has('floor'))) { this.audio.play('uiDeny'); return; }
    if (this._starting) return;
    this._starting = true;
    $('fade').classList.add('on');
    await sleep(500);
    this.endGame();
    this._screen(null);
    $('panel').classList.remove('active');
    const mod = await def.load();
    const floorDef = { ...mod.default, id, name: def.name, tier: def.tier, music: def.music };
    this.save.data.progress.started = true;
    this.save.data.progress.lastFloor = id;
    this.save.write();
    // elevator ride (not for floor 1, which begins in the holding cell)
    if (id !== 1 && !opts.skipElevator) {
      this.state = 'elevator';
      const prev = PLAYABLE_ORDER[PLAYABLE_ORDER.indexOf(id) - 1] || 1;
      this.elevator.setRide(prev, id);
      this.music.play('lounge', 'full');
      $('fade').classList.remove('on');
      this.audio.play('doors', { slam: true });
      this.audio.loop('hum', 0.15);
      const lines = floorDef.elevatorLines || [];
      lines.forEach(([who, text, at]) => setTimeout(() => this.host.say(who, text, { priority: 2 }), at * 1000));
      const rideDur = floorDef.elevatorDur || 6;
      const t0 = performance.now();
      while (performance.now() - t0 < rideDur * 1000) { this.elevator.progress = (performance.now() - t0) / (rideDur * 1000 - 1500); await sleep(30); }
      this.audio.loop('hum', 0);
      this.audio.play('elevatorDing');
      await sleep(500);
      this.elevator.open = 0;
      const t1 = performance.now();
      this.audio.play('doors');
      while (performance.now() - t1 < 700) { this.elevator.open = (performance.now() - t1) / 700; await sleep(16); }
      this.renderer.flash(1, 0xffffff, 1.5);
    }
    this._launch(floorDef, opts);
    this._starting = false;
  }
  _launch(floorDef, opts = {}) {
    const S = this.save.data;
    const modifiers = Object.fromEntries((S.challenges || []).map((c) => [c, true]));
    this.game = new Game(this, floorDef, { checkpoint: opts.checkpoint || 0, deaths: opts.deaths || 0, modifiers });
    if (modifiers.lowGrav) { this.game.gravityScalePlayer = 0.55; this.game.gravityScaleEnemies = 0.55; this.game.physics.gravityScaleBodies = 0.5; }
    if (modifiers.chaos) this.game.audience.chaos = true;
    this.renderer.renderer.compile(this.game.scene, this.game.camera);
    this.state = 'game';
    this._started = false;
    this._screen('hud');
    $('fade').classList.remove('on');
    this.music.play(floorDef.music, 'calm');
    this.game.musicState = 'calm';
    this.audio.setCrowd(true, 0.4);
    if (!opts.checkpoint && !opts.retry) this.floorIntro(floorDef);
    $('clickToResume').classList.toggle('on', !this.input.locked);
    this.input.lock();
    setTimeout(() => { this._started = true; }, 400);
  }
  floorIntro(def) {
    const c = $('card');
    c.classList.add('active', 'passive');
    $('cardInner').className = 'card-inner floor-intro';
    $('cardInner').innerHTML = `<div class="fi-num">NOW BROADCASTING</div><div class="fi-big">FLOOR ${String(def.id).padStart(2, '0')}</div><div class="fi-name">${def.name}</div><div class="fi-tag">${FLOORS[def.id].tagline}</div>`;
    clearTimeout(this._introT);
    this._introT = setTimeout(() => { if ($('cardInner').classList.contains('floor-intro')) c.classList.remove('active', 'passive'); }, 3400);
  }
  endGame() {
    this.chat?.clear();
    if (this.game) { this.game.dispose(); this.game = null; }
    this.host.detach();
    this.hud.show(false);
    $('card').classList.remove('active', 'passive');
    $('pause').classList.remove('active');
    $('clickToResume').classList.remove('on');
    this.renderer.fx.uLetterbox.value = 0; this.renderer.fx.uUnderwater.value = 0; this.renderer.fx.uDamage.value = 0; this.renderer.fx.uGlitch.value = 0; this.renderer.fx.uSat.value = 1; this.renderer.fx.uSpeed.value = 0;
    this.audio.setMuffle(0);
    this.audio.stopLoops();
  }
  retry(fromCheckpoint) {
    if (!this.game) return;
    const def = this.game.floorDef;
    const cp = fromCheckpoint ? this.game.checkpointId : 0;
    const deaths = this.game.stats.deaths;
    $('fade').classList.add('on');
    this.audio.play('tvOff');
    setTimeout(() => {
      this.endGame();
      this._launch(def, { checkpoint: cp, deaths, retry: true });
      this.host.say('halo', ['And we are BACK!', 'Take two! Action!', 'Rewind! Replay! Relive the pain!', 'The audience demands a rematch!'][(Math.random() * 4) | 0], { priority: 1 });
    }, 450);
  }
  onDeath(game, info) {
    this.state = 'dead';
    this.input.unlock();
    const tips = ['Slide (C) under hydraulic presses — and into robots for a SLIDE KILL bonus.', 'Clankers telegraph with a red eye flash. Dodge (Q) through the swing — you are invulnerable mid-dodge.', 'Bruisers are armored in front. Bait a charge into a wall, then shoot the glowing core on its back.', 'Your blades can swat drone bolts straight back at them.', 'Press E on a light robot to chain-yank it to you. Then hit F.', 'Melee kills always drop repair cells.', 'Break line of sight to let your suit recover.', 'Robots short-circuit in deep water. Make the water work for you.', 'Hold LMB with the gravity cannon to grab a barrel. Release to throw it.'];
    $('card').classList.add('active'); $('card').classList.remove('passive');
    $('cardInner').className = 'card-inner death';
    $('cardInner').innerHTML = `<div class="d-big">CANCELLED</div><div class="d-sub">CONTESTANT 99 HAS BEEN ELIMINATED · DEATHS THIS FLOOR: ${game.stats.deaths}</div><div class="d-tip">TIP: ${tips[(Math.random() * tips.length) | 0]}</div><div class="c-btns"><button class="btn primary" id="bRetry">RETRY FROM CHECKPOINT [R]</button><button class="btn" id="bRestart">RESTART FLOOR</button><button class="btn" id="bLounge">LOUNGE</button></div>`;
    $('bRetry').onclick = () => this.retry(true);
    $('bRestart').onclick = () => this.retry(false);
    $('bLounge').onclick = () => this.showLounge();
    this.audio.play('tvOff');
    this.audio.play('boo', { vol: 0.6 });
  }
  onFloorComplete(game) {
    this.state = 'complete';
    this.input.unlock();
    const S = this.save.data;
    const st = game.stats;
    const def = game.floorDef;
    const acc = st.shots ? Math.min(1, st.hits / st.shots) : 0;
    const score = game.score + Math.round(Math.max(0, 600 - st.time) * 5) + Math.round(acc * 2000);
    const target = def.scoreTarget || 8000;
    const stars = 1 + (score >= target ? 1 : 0) + (score >= target && st.deaths === 0 ? 1 : 0);
    const fans = Math.round(score / 10);
    S.fans += fans;
    const first = !S.progress.completed[def.id];
    this.save.record(def.id, { time: st.time, score, stars, combo: st.bestCombo, kills: st.kills, accuracy: acc });
    const unlocks = [];
    if (def.rewards) for (const r of def.rewards) {
      if (r.type === 'weapon' && this.save.unlockWeapon(r.id)) unlocks.push(r.label);
      if (r.type === 'melee' && this.save.unlockMelee(r.id)) unlocks.push(r.label);
      if (r.type === 'ability' && this.save.unlockAbility(r.id)) unlocks.push(r.label);
      if (r.type === 'track') this.save.unlockTrack(r.id);
    }
    this.save.unlockTrack(def.music);
    this.save.write();
    this.music.sting('victory');
    this.audio.play('cheer', { big: 2 });
    this.audio.play('airhorn');
    setTimeout(() => this.audio.play('chant'), 1200);
    const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    $('card').classList.add('active'); $('card').classList.remove('passive');
    $('cardInner').className = 'card-inner complete';
    $('cardInner').innerHTML = `<div class="c-top">FLOOR ${String(def.id).padStart(2, '0')} · ${def.name}</div><div class="c-big">FLOOR COMPLETE</div>
      <div class="c-stars">${[0, 1, 2].map((i) => `<span class="${i < stars ? '' : 'off'}" style="animation-delay:${0.5 + i * 0.25}s">★</span>`).join('')}</div>
      <div class="c-grid">
        <div class="c-stat" style="animation-delay:.2s"><b>${score.toLocaleString()}</b><span>SCORE</span></div>
        <div class="c-stat" style="animation-delay:.3s"><b>${fmt(st.time)}</b><span>TIME</span></div>
        <div class="c-stat" style="animation-delay:.4s"><b>${st.kills}</b><span>ROBOTS CANCELLED</span></div>
        <div class="c-stat" style="animation-delay:.5s"><b>${Math.round(acc * 100)}%</b><span>ACCURACY</span></div>
        <div class="c-stat" style="animation-delay:.6s"><b>${st.bestCombo}</b><span>BEST COMBO</span></div>
        <div class="c-stat" style="animation-delay:.7s"><b>${st.headshots}</b><span>HEADSHOTS</span></div>
        <div class="c-stat" style="animation-delay:.8s"><b>${st.envKills}</b><span>ENVIRONMENTAL</span></div>
        <div class="c-stat" style="animation-delay:.9s"><b>+${fans}</b><span>FANS EARNED</span></div>
      </div>
      ${unlocks.length ? `<div class="c-unlock">UNLOCKED: ${unlocks.join(' · ')}</div>` : ''}
      <div class="note">${score >= target ? 'Score target reached.' : `Score target for ★★: ${target.toLocaleString()}.`} ${st.deaths ? `Deaths: ${st.deaths}.` : 'No deaths!'}</div>
      <div class="c-btns"><button class="btn primary" id="bNext">CONTINUE TO LOUNGE</button><button class="btn" id="bReplay">REPLAY FLOOR</button></div>`;
    $('bNext').onclick = () => { this.audio.play('uiClick'); this.showLounge(); };
    $('bReplay').onclick = () => { this.audio.play('uiClick'); this.startFloor(def.id, { skipElevator: true }); };
    if (first && def.completeLine) setTimeout(() => this.host.say('halo', def.completeLine, { mood: 'gleeful' }), 1500);
  }

  // Test hook: advance the simulation deterministically without rendering every step.
  debugStep(seconds, bot) {
    const g = this.game;
    if (!g) return null;
    const steps = Math.round(seconds * 60);
    this.audio.muteSfx = true; // fast-forward: don't stack minutes of audio into seconds
    for (let i = 0; i < steps; i++) {
      if (bot) bot(g, this.input);
      this.host.update(1 / 60);
      if (this.game !== g) break;
      g.update(1 / 60);
      this.input.endFrame();
    }
    this.audio.muteSfx = false;
    return { t: g.time, hp: g.player.hp, obj: g.objective.text, enemies: g.aliveEnemies(), state: this.state };
  }
  debugRender() {
    const g = this.game;
    if (g) this.renderer.render(g.scene, g.camera, 1 / 60, g.time);
  }

  // ------------------------------------------------------------------ frame
  _frame() {
    if (this.frozen) return;
    if (this.state === 'animationStudio') {
      const dt = Math.min(0.05, this.clock.getDelta());
      this.animationStudio.update(dt);
      this.renderer.render(this.animationStudio.scene, this.animationStudio.camera, dt, this.clock.elapsedTime);
      this.input.endFrame(); this.studioButton.style.display = 'none';
      return;
    }
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const t = this.clock.elapsedTime;
    this.audio.update(dt);
    this.host.update(dt);
    let scene, camera;
    if (this.state === 'game' || this.state === 'dead' || this.state === 'complete') {
      if (this.game) {
        if (this.state === 'game') this.game.update(dt * (this.game.modifiers.turbo ? 1.2 : 1));
        else { this.game.update(dt * 0.25); }
        scene = this.game.scene; camera = this.game.camera;
      }
    } else if (this.state === 'lounge') { this.lounge.update(dt); scene = this.lounge.scene; camera = this.lounge.camera; }
    else if (this.state === 'elevator') { this.elevator.update(dt); scene = this.elevator.scene; camera = this.elevator.camera; }
    else if (this.menuScene) { this.menuScene.update(dt); scene = this.menuScene.scene; camera = this.menuScene.camera; }
    if (scene) this.renderer.render(scene, camera, dt, t);
    this.input.endFrame();
    if (this.music._pending && this.audio.ready) this.music.resumePending();
    this.chat.update(Math.min(dt, 0.05), this.state, !!this.game?.paused);
    this.studioButton.style.display = this.state === 'menu' || $('pause').classList.contains('active') ? '' : 'none';
  }
}

new App();
