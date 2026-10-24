// Title screen, character creation ("Who is Rook?"), pause, settings, journal, controls.
import * as THREE from 'three';
import { SKIN_TONES, HAIR_COLORS, HAIR_STYLES, defaultLook } from '../characters/rig.js';
import { StoryState } from '../story/state.js';
import { sleep } from '../core/util.js';

const OUTFIT_SETS = {
  'Runner Blue': { primary: '#2f4858', secondary: '#c8692b', pants: '#2b2d33' },
  'Ash & Amber': { primary: '#4a4a48', secondary: '#e0a040', pants: '#2a2622' },
  'Rust Line': { primary: '#7a3a2a', secondary: '#d8c8a8', pants: '#33302c' },
  'Moss': { primary: '#3d4f3a', secondary: '#c8a050', pants: '#2b2d26' },
  'Night Shift': { primary: '#22262e', secondary: '#7fdcff', pants: '#1e2024' },
};

export class Menu {
  constructor(game) {
    this.game = game; this.el = null;
    game.onRequestPause = () => this.pause();
    window.addEventListener('keydown', e => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.journalOpen) { this.closeJournal(); return; }
        if (this.game.paused && this.el && this.paused) { this.resume(); return; }
      }
      if ((e.code === 'KeyJ' || e.code === 'Tab') && this.game.running && !this.game.paused && !this.game.menuOpen && !this.game.director.active) { this.journalOpen ? this.closeJournal() : this.openJournal(); }
    });
    game.input.canvas.addEventListener('click', () => { if (this.game.running && !this.game.menuOpen && !this.game.paused) { this.game.input.wantLock = true; this.game.input.lock(); } });
  }
  clear() { this.el?.remove(); this.el = null; this.game.menuOpen = false; }
  mount(html, cls = 'menu') {
    this.clear();
    const d = document.createElement('div'); d.className = cls; d.innerHTML = html;
    document.getElementById('ui').appendChild(d); this.el = d; this.game.menuOpen = true;
    d.querySelectorAll('button').forEach(b => b.addEventListener('mouseenter', () => this.game.audio.ui('tick')));
    return d;
  }

  // ------------------------------------------------------------ title
  async showTitle() {
    const g = this.game;
    g.input.unlock(); g.input.wantLock = false;
    // a slow aerial shot of Meridian walking at dawn
    g.director.begin({ letterbox: false, hideHud: true });
    g.player.char.group.visible = false;
    const t0 = g.time;
    const orbit = () => { const a = 0.9 + (g.time - t0) * 0.012; return new THREE.Vector3(260 + Math.cos(a) * 520, -20 + Math.sin((g.time - t0) * 0.05) * 20, -260 + Math.sin(a) * 520); };
    g.director.shot({ pos: orbit, look: () => new THREE.Vector3(80, -60, -120), fov: 42 });
    this.titleShot = orbit;
    const has = StoryState.exists();
    const d = this.mount(`<div class="col">
      <h1>MARCHLIGHT</h1><h2>NOTHING STAYS STILL. NOT EVEN HOME.</h2>
      ${has ? '<button class="btn" data-a="continue">Continue</button>' : ''}
      <button class="btn" data-a="new">New Game</button>
      <button class="btn" data-a="settings">Settings</button>
      <button class="btn" data-a="controls">Controls</button>
      <div class="note">Headphones recommended. Click anywhere in the game to capture the mouse; Esc to pause.</div>
    </div>`, 'menu');
    d.onclick = async (e) => {
      const a = e.target.dataset?.a; if (!a) return;
      g.audio.init(); g.audio.ui('select');
      if (!g.audio.music.cue) g.audio.music.play('menu', 3);
      if (a === 'new') { StoryState.clear(); g.state.reset(); this.customize(true); }
      if (a === 'continue') { g.state.load(); this.clear(); await this.beginGame(g.state.checkpoint); }
      if (a === 'settings') this.settings(() => this.showTitle());
      if (a === 'controls') this.controls(() => this.showTitle());
    };
    const startAudio = () => { g.audio.init(); if (!g.audio.music.cue) g.audio.music.play('menu', 3); window.removeEventListener('pointerdown', startAudio); };
    window.addEventListener('pointerdown', startAudio);
  }

  // ------------------------------------------------------------ customization
  customize(isNew, onDone) {
    const g = this.game, p = g.player;
    const look = Object.assign(defaultLook({ outfit: 'runner', backpack: false, hairStyle: 'swept', skin: '#c58c64', hair: '#1b1512' }), g.state.look || {});
    p.char.group.visible = true;
    // stage: Rook in the apartment by the window, morning light
    const stagePos = new THREE.Vector3(188.6, 14.0, -20.2);
    p.teleport(stagePos, -Math.PI / 2 + 0.35); p.setScripted(true); p.anim.setMode('loco'); p.anim.speed = 0;
    g.director.begin({ letterbox: false, hideHud: true });
    let spin = 0;
    const camFor = () => new THREE.Vector3(186.0, 15.3, -20.6);
    g.director.shot({ pos: camFor, look: () => stagePos.clone().add(new THREE.Vector3(0, 1.05, 0)), fov: 38, cut: true });
    const rebuild = () => { p.setLook({ ...look }); p.char.group.visible = true; p.teleport(stagePos, -Math.PI / 2 + 0.35 + spin); p.setScripted(true); };
    rebuild();
    const swatch = (key, list) => list.map(c => `<button style="background:${c}" data-k="${key}" data-v="${c}" class="${look[key] === c ? 'on' : ''}"></button>`).join('');
    const opts = (key, list, labels) => list.map((v, i) => `<button data-k="${key}" data-v="${v}" class="${look[key] === v ? 'on' : ''}">${labels ? labels[i] : v}</button>`).join('');
    const render = () => {
      const d = this.mount(`<div id="custom">
        <h3>MERIDIAN · RUNNER REGISTRY</h3><h2>WHO IS ROOK?</h2>
        <div class="grp"><label>Skin</label><div class="sw">${swatch('skin', SKIN_TONES)}</div></div>
        <div class="grp"><label>Hair</label><div class="opt">${opts('hairStyle', HAIR_STYLES, ['Crop', 'Swept', 'Ponytail', 'Bun', 'Curls', 'Long', 'Shaved', 'Braid'])}</div></div>
        <div class="grp"><label>Hair colour</label><div class="sw">${swatch('hair', HAIR_COLORS)}</div></div>
        <div class="grp"><label>Eyes</label><div class="sw">${swatch('eyes', ['#4a3424', '#2d5a7a', '#3e5a2a', '#6b4b24', '#2a2a2a', '#7a7a8a'])}</div></div>
        <div class="grp"><label>Build</label><input type="range" min="0" max="1" step="0.05" value="${look.build}" data-r="build"></div>
        <div class="grp"><label>Frame</label><input type="range" min="0" max="1" step="0.05" value="${look.frame}" data-r="frame"></div>
        <div class="grp"><label>Height</label><input type="range" min="0.93" max="1.07" step="0.01" value="${look.height}" data-r="height"></div>
        <div class="grp"><label>Runner kit</label><div class="opt">${Object.keys(OUTFIT_SETS).map(n => `<button data-set="${n}">${n}</button>`).join('')}</div></div>
        <div class="grp"><label>Details</label><div class="opt"><button data-t="freckles" class="${look.freckles ? 'on' : ''}">Freckles</button><button data-t="earrings" class="${look.earrings ? 'on' : ''}">Earrings</button><button data-t="beard" class="${look.beard ? 'on' : ''}">Beard</button></div></div>
        <button class="go">${isNew ? 'WAKE UP' : 'DONE'}</button>
      </div>`, 'menu');
      d.querySelectorAll('[data-k]').forEach(btn => btn.onclick = () => { look[btn.dataset.k] = btn.dataset.v; g.audio.ui('tick'); rebuild(); render(); });
      d.querySelectorAll('[data-r]').forEach(inp => inp.oninput = () => { look[inp.dataset.r] = parseFloat(inp.value); rebuild(); });
      d.querySelectorAll('[data-set]').forEach(btn => btn.onclick = () => { Object.assign(look, OUTFIT_SETS[btn.dataset.set]); g.audio.ui('tick'); rebuild(); });
      d.querySelectorAll('[data-t]').forEach(btn => btn.onclick = () => { look[btn.dataset.t] = !look[btn.dataset.t]; g.audio.ui('tick'); rebuild(); render(); });
      d.querySelector('.go').onclick = async () => {
        g.audio.ui('select'); g.state.look = { ...look }; g.state.save(g);
        clearInterval(this.spinT); this.clear();
        if (isNew) await this.beginGame('wake'); else { g.director.end(); p.setScripted(false); onDone?.(); }
      };
    };
    render();
    clearInterval(this.spinT);
    this.spinT = setInterval(() => { spin += 0.004; p.yaw = -Math.PI / 2 + 0.35 + Math.sin(spin * 3) * 0.6; }, 16);
  }

  async beginGame(beat) {
    const g = this.game;
    g.audio.init();
    g.player.setLook(g.state.look || defaultLook());
    if (g.state._weapons) { g.weapons.owned = g.state._weapons.owned || {}; g.weapons.ammo = g.state._weapons.ammo || {}; g.weapons.current = Object.keys(g.weapons.owned)[0] || null; }
    g.input.wantLock = true;
    await g.story.start(beat);
  }
  async quickStart(beat) {
    const g = this.game; g.audio.init();
    g.state.look = g.state.look || defaultLook({ outfit: 'runner', hairStyle: 'swept', skin: '#c58c64' });
    await this.beginGame(beat);
  }

  // ------------------------------------------------------------ pause
  pause() {
    const g = this.game; if (g.paused || g.menuOpen) return;
    g.paused = true; this.paused = true; g.input.unlock();
    g.audio.ctx?.suspend?.();
    const d = this.mount(`<div class="col"><h1 style="font-size:40px">PAUSED</h1><h2>${g.state.chapter === 'prologue' ? 'PROLOGUE — THE CITY THAT NEVER SLEEPS' : ''}</h2>
      <button class="btn" data-a="resume">Resume</button>
      <button class="btn" data-a="journal">Journal</button>
      <button class="btn" data-a="look">Appearance</button>
      <button class="btn" data-a="settings">Settings</button>
      <button class="btn" data-a="controls">Controls</button>
      <button class="btn" data-a="checkpoint">Restart from checkpoint</button>
      <button class="btn" data-a="quit">Quit to title</button></div>`, 'menu dim');
    d.onclick = (e) => {
      const a = e.target.dataset?.a; if (!a) return; g.audio.ctx?.resume?.(); g.audio.ui('select');
      if (a === 'resume') this.resume();
      if (a === 'journal') { this.resume(); this.openJournal(); }
      if (a === 'look') { if (g.story.canCustomize?.()) { this.clear(); g.paused = false; this.paused = false; this.customize(false, () => {}); } else g.hud.notify('Change at your apartment mirror or wardrobe.'); }
      if (a === 'settings') this.settings(() => { this.clear(); g.paused = false; this.paused = false; this.pause(); });
      if (a === 'controls') this.controls(() => { this.clear(); g.paused = false; this.paused = false; this.pause(); });
      if (a === 'checkpoint') { this.resume(); g.story.restartCheckpoint(); }
      if (a === 'quit') { location.href = location.pathname; }
    };
  }
  resume() { const g = this.game; this.clear(); g.paused = false; this.paused = false; g.audio.ctx?.resume?.(); g.input.wantLock = true; g.input.lock(); g.last = performance.now(); }

  // ------------------------------------------------------------ settings & controls
  settings(back) {
    const g = this.game, q = g.engine.quality, v = g.audio.vol;
    const d = this.mount(`<div class="col" style="min-width:440px"><h1 style="font-size:36px">SETTINGS</h1><h2>&nbsp;</h2>
      <div class="row"><label>Master volume</label><input type="range" min="0" max="1" step="0.05" value="${v.master}" data-v="master"></div>
      <div class="row"><label>Music</label><input type="range" min="0" max="1" step="0.05" value="${v.music}" data-v="music"></div>
      <div class="row"><label>Effects</label><input type="range" min="0" max="1" step="0.05" value="${v.sfx}" data-v="sfx"></div>
      <div class="row"><label>Ambience</label><input type="range" min="0" max="1" step="0.05" value="${v.amb}" data-v="amb"></div>
      <div class="row"><label>Mouse sensitivity</label><input type="range" min="0.2" max="3" step="0.05" value="${g.input.sensitivity}" data-s="sens"></div>
      <div class="row"><label>Invert Y</label><input type="checkbox" ${g.input.invertY ? 'checked' : ''} data-s="invert"></div>
      <div class="row"><label>Large subtitles</label><input type="checkbox" ${g.dialogue.bigSubs ? 'checked' : ''} data-s="subs"></div>
      <div class="row"><label>Shadows</label><input type="checkbox" ${q.shadows ? 'checked' : ''} data-q="shadows"></div>
      <div class="row"><label>Bloom</label><input type="checkbox" ${q.bloom ? 'checked' : ''} data-q="bloom"></div>
      <div class="row"><label>Resolution scale</label><select data-q="pixelRatio">${[0.75, 1, 1.25, 1.5, 2].map(x => `<option ${q.pixelRatio === x ? 'selected' : ''} value="${x}">${x}×</option>`).join('')}</select></div>
      <div class="row"><label>Auto resolution (hold frame rate)</label><input type="checkbox" ${q.autoRes ? 'checked' : ''} data-q="autoRes"></div>
      <div class="row"><label>Combat difficulty</label><select data-s="diff">${[['Story', 0.5], ['Runner', 1], ['Hardened', 1.5]].map(([n, x]) => `<option ${g.settings.difficulty === x ? 'selected' : ''} value="${x}">${n}</option>`).join('')}</select></div>
      <div class="row"><label>Show FPS</label><input type="checkbox" ${document.getElementById('fps').style.display === 'block' ? 'checked' : ''} data-s="fps"></div>
      <button class="btn" data-a="back" style="margin-top:20px">Back</button></div>`, 'menu dim');
    d.querySelectorAll('[data-v]').forEach(i => i.oninput = () => { v[i.dataset.v] = parseFloat(i.value); g.audio.applyVolumes(); });
    d.querySelectorAll('[data-q]').forEach(i => i.onchange = () => { const k = i.dataset.q; g.engine.applyQuality({ [k]: i.type === 'checkbox' ? i.checked : parseFloat(i.value) }); });
    d.querySelectorAll('[data-s]').forEach(i => i.oninput = i.onchange = () => {
      const k = i.dataset.s;
      if (k === 'sens') { g.input.sensitivity = parseFloat(i.value); localStorage.setItem('marchlight.sens', i.value); }
      if (k === 'invert') { g.input.invertY = i.checked; localStorage.setItem('marchlight.invertY', i.checked ? '1' : '0'); }
      if (k === 'subs') { g.dialogue.bigSubs = i.checked; document.body.classList.toggle('bigsubs', i.checked); localStorage.setItem('marchlight.bigsubs', i.checked ? '1' : '0'); }
      if (k === 'diff') g.settings.difficulty = parseFloat(i.value);
      if (k === 'fps') document.getElementById('fps').style.display = i.checked ? 'block' : 'none';
    });
    d.querySelector('[data-a=back]').onclick = () => { g.audio.ui('select'); back(); };
  }
  controls(back) {
    const rows = [['W A S D', 'Move'], ['Mouse', 'Look'], ['Shift', 'Hurry / sprint'], ['Space', 'Jump · climb · (airborne, charged) Kinetic Leap'], ['C', 'Crouch · drop from a ledge'], ['F', 'Talk · use · latch tether line'],
      ['E (hold)', 'Tether: capture momentum'], ['Q', 'Tether: release momentum'], ['RMB', 'Aim'], ['LMB', 'Fire'], ['R', 'Reload'], ['V', 'Melee'], ['1 / 2 · X · Wheel', 'Switch weapon'], ['H', 'Holster'], ['Z (hold)', 'Visor zoom'], ['J', 'Journal'], ['Esc', 'Pause']];
    const d = this.mount(`<div class="col" style="min-width:480px"><h1 style="font-size:36px">CONTROLS</h1><h2>KEYBOARD & MOUSE · GAMEPAD SUPPORTED</h2>
      <div class="controls-grid">${rows.map(([k, v]) => `<span class="key">${k}</span><span>${v}</span>`).join('')}</div>
      <button class="btn" data-a="back" style="margin-top:24px">Back</button></div>`, 'menu dim');
    d.querySelector('[data-a=back]').onclick = () => { this.game.audio.ui('select'); back(); };
  }

  // ------------------------------------------------------------ journal (objective, people, story so far)
  openJournal() {
    const g = this.game, s = g.state;
    this.journalOpen = true; g.input.unlock(); g.paused = true;
    const people = Object.entries(s.people).map(([n, t]) => `<div class="person"><b>${n}</b><p>${t}</p></div>`).join('') || '<p>No one yet.</p>';
    const log = s.log.map(t => `<p>${t}</p>`).join('') || '<p>…</p>';
    const obj = g.hud.objective ? `<p><b style="color:#ffb35c">${g.hud.objective.text}</b><br>${g.hud.objective.sub || ''}</p>` : '<p>Nothing pressing.</p>';
    const el = document.createElement('div'); el.id = 'journal'; el.className = 'show';
    el.innerHTML = `<h1>JOURNAL</h1><div class="cols"><div><h4>NOW</h4>${obj}<h4 style="margin-top:28px">WHAT HAPPENED</h4>${log}</div><div><h4>PEOPLE</h4>${people}</div></div><p style="margin-top:30px;color:#888">J or Esc to close</p>`;
    document.getElementById('ui').appendChild(el); this.journalEl = el;
    el.onclick = () => this.closeJournal();
  }
  closeJournal() { this.journalEl?.remove(); this.journalOpen = false; this.game.paused = false; this.game.last = performance.now(); this.game.input.wantLock = true; }
}
