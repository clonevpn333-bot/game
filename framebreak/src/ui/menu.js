// Menus: main menu, chapter replay, settings, soundtrack, credits, pause and
// the honest "to be continued" card. DOM for text, canvas for the backdrop.
import { MenuBackground } from './menubg.js';
import { CHAPTERS } from '../core/director.js';
import { SONG_MENU } from '../audio/songs/menu.js';
import { SONG_CH1 } from '../audio/songs/ch1.js';
import { SONG_CH2 } from '../audio/songs/ch2.js';
import { SONG_CH3 } from '../audio/songs/ch3.js';
import { DEFAULT_SETTINGS } from '../core/save.js';

const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const LV = ['LOW', 'MEDIUM', 'HIGH'];

export const TRACKS = [
  { name: 'One Universe', sub: 'title theme', song: () => SONG_MENU, section: 'B', intensity: 1 },
  { name: 'Pixel Panic', sub: 'chapter 1 · city', song: () => SONG_CH1, section: 'A', intensity: 2 },
  { name: 'The 5:15 Express', sub: 'chapter 1 · train', song: () => SONG_CH1, section: 'train', intensity: 2 },
  { name: 'Gridlock', sub: 'chapter 1 · boss', song: () => SONG_CH1, section: 'boss1', intensity: 3 },
  { name: 'Off-Grid', sub: 'chapter 1 · final phase', song: () => SONG_CH1, section: 'boss3', intensity: 3 },
  { name: 'Ink & Violence', sub: 'chapter 2 · factory swing', song: () => SONG_CH2, section: 'A', intensity: 1 },
  { name: 'Hot Off The Press', sub: 'chapter 2 · boss', song: () => SONG_CH2, section: 'boss', intensity: 1 },
  { name: 'Fold The World', sub: 'chapter 3 · music-box waltz', song: () => SONG_CH3, section: 'A', intensity: 2 },
];

export class Menu {
  constructor(game) {
    this.game = game; this.bg = new MenuBackground(game); this.root = null; this.mode = null; this.items = []; this.sel = 0; this.rows = null; this.rowSel = 0; this.repeat = 0;
    game.director.onPause = () => this.openPause();
    game.director.onEnd = (info) => this.openEnd(info);
  }
  get ui() { return this.game.ui; }
  clearDom() { if (this.root) { this.root.remove(); this.root = null; } this.items = []; this.rows = null; this.panel = null; }
  close() { this.clearDom(); this.mode = null; this.game.overlay = null; }

  // ---------------------------------------------------------------- main
  openMain() {
    const g = this.game; g.director.stop(); g.paused = false; g.overlay = this; this.mode = 'main'; this.clearDom();
    g.c2d.style.imageRendering = ''; g.show3d(false);
    g.music.play(SONG_MENU, { section: 'A', intensity: 1, fade: 1.2 });
    this.root = el('div', 'menu'); const col = el('div', 'menu-col'); this.root.appendChild(col);
    const cont = g.save.hasProgress() && g.director.available(Math.max(1, g.save.data.checkpoint?.chapter || g.save.data.chapter));
    const cpc = g.save.data.checkpoint?.chapter || g.save.data.chapter;
    this.setItems(col, [
      { label: 'NEW GAME', act: () => this.newGame() },
      { label: 'CONTINUE' + (cont ? `<small>CH ${cpc} · ${CHAPTERS[cpc].title}</small>` : ''), off: !cont, act: () => this.continueGame() },
      { label: 'CHAPTER REPLAY', act: () => this.openChapters() },
      { label: 'SETTINGS', act: () => this.openSettings() },
      { label: 'SOUNDTRACK', act: () => this.openSoundtrack() },
      { label: 'CREDITS', act: () => this.openCredits() },
    ]);
    this.sel = cont ? 1 : 0; this.refresh();
    this.root.appendChild(el('div', 'menu-foot', 'W/S · ↑/↓ &nbsp;SELECT &nbsp;&nbsp; ENTER &nbsp;CONFIRM &nbsp;&nbsp; ESC &nbsp;BACK<br>F3 &nbsp;PERFORMANCE OVERLAY'));
    this.ui.appendChild(this.root);
  }
  setItems(parent, defs) {
    this.items = defs.map((d, i) => { const e = el('div', 'menu-item' + (d.off ? ' off' : ''), d.label); e.addEventListener('mouseenter', () => { if (!d.off && !this.rows) { this.sel = i; this.refresh(); } }); e.addEventListener('click', () => { if (!d.off) { this.sel = i; this.refresh(); this.activate(); } }); parent.appendChild(e); return { ...d, e }; });
  }
  refresh() { this.items.forEach((it, i) => it.e.classList.toggle('sel', i === this.sel && !this.rows)); if (this.rows) this.rows.forEach((r, i) => r.e.classList.toggle('sel', i === this.rowSel)); }
  activate() { const it = this.items[this.sel]; if (!it || it.off) return; this.game.sfx.play('ui.ok'); it.act(); }
  async newGame() { const g = this.game; g.save.newGame(); this.close(); await g.director.startChapter(1); }
  async continueGame() { const g = this.game, cp = g.save.data.checkpoint || { chapter: Math.max(1, g.save.data.chapter), id: null }; this.close(); await g.director.startChapter(cp.chapter, { checkpoint: cp.id }); }

  // ---------------------------------------------------------------- panels
  openPanel(title, build, hint) {
    if (this.panel) this.panel.remove();
    const p = (this.panel = el('div', 'panel')); p.appendChild(el('h2', null, title)); this.rows = []; this.rowSel = 0; build(p);
    p.appendChild(el('div', 'hint', hint || 'ESC · BACK')); this.root.appendChild(p); this.refresh();
  }
  closePanel() { if (this.panel) { this.panel.remove(); this.panel = null; } this.rows = null; this.refresh(); if (this.previewing) { this.previewing = false; if (this.mode === 'main') this.game.music.play(SONG_MENU, { section: 'B', intensity: 1, fade: 0.8 }); } }
  addRow(p, html, { act = null, adj = null, off = false, val = null } = {}) {
    const e = el('div', 'row' + (off ? ' off' : ''), html), i = this.rows.length;
    if (val) { const v = el('span', 'val'); e.appendChild(v); e._val = v; }
    e.addEventListener('mouseenter', () => { this.rowSel = i; this.refresh(); });
    e.addEventListener('click', (ev) => { this.rowSel = i; this.refresh(); if (adj) { const r = e.getBoundingClientRect(); adj(ev.clientX < r.left + r.width * 0.72 ? 1 : ev.clientX < r.left + r.width * 0.86 ? -1 : 1); this.updateVals(); } else if (act && !off) { this.game.sfx.play('ui.ok'); act(); } });
    p.appendChild(e); this.rows.push({ e, act, adj, off, val }); return e;
  }
  updateVals() { if (this.rows) for (const r of this.rows) if (r.val) { const v = r.val(); if (typeof v === 'number') { r.e._val.innerHTML = `<span class="bar"><i style="width:${Math.round(v * 100)}%"></i></span>`; r.e._val.style.minWidth = '0'; } else r.e._val.textContent = v; } }

  openChapters() {
    const g = this.game, reached = Math.max(g.save.data.chapter, ...g.save.data.completed, 0);
    this.openPanel('CHAPTER REPLAY', (p) => {
      for (let i = 1; i <= 10; i++) {
        const c = CHAPTERS[i], built = !!c.load, open = built && (i <= Math.max(1, reached) || g.save.data.completed.includes(i - 1));
        const tag = !built ? '<span class="tag plan">IN DEVELOPMENT</span>' : open ? '<span class="tag ok">PLAY</span>' : '<span class="tag lock">NOT REACHED</span>';
        this.addRow(p, `<span><b>${String(i).padStart(2, '0')} · ${c.title}</b><span class="sub">${c.format}</span></span>${tag}`, { off: !open, act: async () => { this.close(); await g.director.startChapter(i, { replay: true }); } });
      }
    }, 'ENTER · PLAY &nbsp;&nbsp; ESC · BACK — replay never overwrites your story progress');
  }
  openSettings() {
    const g = this.game, s = g.settings, save = () => { g.save.write(); g.audio.applyVolumes(); };
    const vol = (k) => ({ val: () => s[k], adj: (d) => { s[k] = Math.max(0, Math.min(1, Math.round((s[k] + d * 0.1) * 10) / 10)); save(); g.sfx.play('ui.move'); } });
    const lvl = (k, names = LV) => ({ val: () => names[s[k]] ?? String(s[k]), adj: (d) => { s[k] = (s[k] + d + names.length) % names.length; save(); g.events.emit('settings', s); } });
    this.openPanel('SETTINGS', (p) => {
      this.addRow(p, '<b>MASTER VOLUME</b>', { ...vol('master'), }); this.addRow(p, '<b>MUSIC</b>', vol('music')); this.addRow(p, '<b>SOUND EFFECTS</b>', vol('sfx'));
      this.addRow(p, '<b>RENDER SCALE</b><span class="sub">3D chapters · pixel art always stays integer-sharp</span>', { val: () => Math.round(s.resScale * 100) + '%', adj: (d) => { const o = [0.5, 0.75, 1], i = (o.indexOf(s.resScale) + d + 3) % 3; s.resScale = o[i]; save(); g.resize(); } });
      this.addRow(p, '<b>SHADOW QUALITY</b>', lvl('shadows', ['OFF', 'MEDIUM', 'HIGH']));
      this.addRow(p, '<b>EFFECTS QUALITY</b>', lvl('effects'));
      this.addRow(p, '<b>TEXTURE QUALITY</b>', lvl('textures'));
      this.addRow(p, '<b>POST-PROCESSING</b>', lvl('post', ['OFF', 'MEDIUM', 'HIGH']));
      this.addRow(p, '<b>PARTICLE LIMIT</b>', { val: () => ['50%', '100%', '200%'][[0.5, 1, 2].indexOf(s.particles)] || '100%', adj: (d) => { const o = [0.5, 1, 2]; s.particles = o[(o.indexOf(s.particles) + d + 3) % 3]; save(); } });
      this.addRow(p, '<b>PHYSICS BUDGET</b>', lvl('physics'));
      this.addRow(p, '<b>DRAW DISTANCE</b>', lvl('drawDistance', ['NEAR', 'NORMAL', 'FAR']));
      this.addRow(p, '<b>SCREEN SHAKE</b>', { val: () => ['OFF', '50%', '100%'][[0, 0.5, 1].indexOf(s.shake)] || '100%', adj: (d) => { const o = [0, 0.5, 1]; s.shake = o[(o.indexOf(s.shake) + d + 3) % 3]; save(); } });
      this.addRow(p, '<b>PERFORMANCE OVERLAY</b>', { val: () => (s.showPerf ? 'ON' : 'OFF'), adj: () => { s.showPerf = !s.showPerf; save(); } });
      this.addRow(p, '<b>FULLSCREEN</b>', { val: () => (document.fullscreenElement ? 'ON' : 'OFF'), adj: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); setTimeout(() => this.updateVals(), 300); } });
      this.addRow(p, '<b>RESTORE DEFAULTS</b>', { act: () => { Object.assign(s, DEFAULT_SETTINGS); save(); g.resize(); this.updateVals(); } });
      this.rows.forEach((r) => { if (r.val && !r.e._val) { const v = el('span', 'val'); r.e.appendChild(v); r.e._val = v; } });
      this.updateVals();
    }, 'A/D · ←/→ ADJUST &nbsp;&nbsp; ESC · BACK');
  }
  openSoundtrack() {
    const g = this.game;
    this.openPanel('SOUNDTRACK', (p) => {
      p.appendChild(el('p', null, 'Every cue is original and synthesised live by the game\'s own audio engine — no samples, no recordings.'));
      for (const t of TRACKS) this.addRow(p, `<span><b>${t.name}</b><span class="sub">${t.sub}</span></span><span class="tag ok">▶ PLAY</span>`, { act: () => { this.previewing = true; g.music.stop(0.25); setTimeout(() => g.music.play(t.song(), { section: t.section, intensity: t.intensity, fade: 0.1 }), 300); } });
    }, 'ENTER · PLAY &nbsp;&nbsp; ESC · BACK');
  }
  openCredits() {
    this.openPanel('CREDITS', (p) => {
      p.appendChild(el('p', null, '<b>FRAMEBREAK</b> — one universe, too many ways to exist.'));
      p.appendChild(el('p', null, 'Design, code, pixel art, cartoon rigs, papercraft models, music and sound: authored entirely in code for this project. Sprites are hand-placed palette bitmaps and keyframed poses baked at load; music is written as note data and synthesised live with WebAudio.'));
      p.appendChild(el('p', null, '3D rendering uses <b>three.js</b> (MIT licence). No other third-party assets, fonts, samples or textures are used.'));
      p.appendChild(el('p', null, 'RIN — a Framekeeper who fell between formats.<br>VELL — looks different everywhere. Remembers you anyway.<br>THE CURATOR — believes one format is enough.'));
      p.appendChild(el('p', null, 'Thank you for playing.'));
    });
  }

  // ---------------------------------------------------------------- pause / end
  openPause() {
    const g = this.game; if (this.mode) return; g.paused = true; g.overlay = this; this.mode = 'pause'; this.clearDom(); g.audio.muffle(0.75); g.input.exitLock();
    this.root = el('div', 'pause'); this.root.appendChild(el('h1', null, 'PAUSED'));
    this.setItems(this.root, [
      { label: 'RESUME', act: () => this.resume() },
      { label: 'RESTART FROM CHECKPOINT', act: () => { const ch = g.director.current; this.resume(); ch.respawn?.(); } },
      { label: 'SETTINGS', act: () => this.openSettings() },
      { label: 'QUIT TO MENU', act: () => { g.audio.muffle(0); this.mode = null; this.openMain(); } },
    ]);
    const keys = g.director.current?.controlsHelp?.() || '';
    this.root.appendChild(el('div', 'keys', keys));
    this.sel = 0; this.refresh(); this.ui.appendChild(this.root);
  }
  resume() { const g = this.game; g.audio.muffle(0); this.close(); g.paused = false; g.director.current?.onResume?.(); }
  openEnd(info) {
    const g = this.game; g.overlay = this; this.mode = 'end'; this.clearDom(); g.music.play(SONG_MENU, { section: 'B', intensity: 1, fade: 2 }); g.audio.muffle(0); g.input.exitLock();
    const next = CHAPTERS[info.chapter + 1];
    this.root = el('div', 'card');
    this.root.appendChild(el('h1', null, 'TO BE CONTINUED')); this.root.appendChild(el('h3', null, `chapter ${info.chapter} complete`));
    this.root.appendChild(el('p', null, info.text || `Rin falls onward${next ? ` — toward <b>${next.title}</b> (${next.format.toLowerCase()})` : ''}.`));
    if (next && !next.load) this.root.appendChild(el('p', null, 'That reality is not built yet. Everything up to this point is the finished vertical slice; your progress is saved.'));
    this.setItems(this.root, [{ label: 'RETURN TO MENU', act: () => { this.mode = null; this.openMain(); } }]);
    this.sel = 0; this.refresh(); this.ui.appendChild(this.root);
  }

  // ---------------------------------------------------------------- loop
  update(dt) {
    const inp = this.game.input, sfx = this.game.sfx;
    let dy = (inp.pressed.down ? 1 : 0) - (inp.pressed.up ? 1 : 0), dx = (inp.pressed.right ? 1 : 0) - (inp.pressed.left ? 1 : 0);
    if (this.rows) {
      if (dy) { let n = this.rowSel; for (let k = 0; k < this.rows.length; k++) { n = (n + dy + this.rows.length) % this.rows.length; if (!this.rows[n].off) break; } this.rowSel = n; this.refresh(); sfx.play('ui.move'); this.rows[n].e.scrollIntoView({ block: 'nearest' }); }
      const r = this.rows[this.rowSel];
      if (r && dx && r.adj) { r.adj(dx); this.updateVals(); }
      if (r && inp.pressed.confirm && !inp.pressed.jump) { if (r.adj) { r.adj(1); this.updateVals(); } else if (r.act && !r.off) { sfx.play('ui.ok'); r.act(); } }
      if (inp.pressed.back) { sfx.play('ui.back'); this.closePanel(); }
      return;
    }
    if (dy && this.items.length) { let n = this.sel; for (let k = 0; k < this.items.length; k++) { n = (n + dy + this.items.length) % this.items.length; if (!this.items[n].off) break; } this.sel = n; this.refresh(); sfx.play('ui.move'); }
    if (inp.pressed.confirm) this.activate();
    else if (inp.pressed.back && this.mode === 'pause') this.resume();
  }
  render(dt) {
    if (this.mode === 'main') { const g = this.game; g.ctx.setTransform(1, 0, 0, 1, 0, 0); this.bg.render(g.ctx, g.W, g.H, dt); }
  }
}
