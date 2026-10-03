// Pause menu, Chronicle journal (cause → effect), city map, settings, choices.
import { G, ERA_YEARS, ERA_NAMES } from '../core/state.js';
import { GRID, CHUNK, HALF, district, LANDMARKS, landmarkCenter } from '../world/layout.js';

const DCOL = { M: '#3a3a34', F: '#2a4a2a', W: '#5a6a4a', S: '#6a6a5a', D: '#7a7a82', G: '#8a7a6a', A: '#6a5a4a', I: '#5a6070', B: '#6a7a8a', P: '#3a6a3a', H: '#4a4a4a', R: '#1a3a5a', '~': '#16324a' };

export class Menus {
  constructor() {
    this.root = document.getElementById('pause');
    this.modal = false;
    this.sub = null;
    this.root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-a]');
      if (b) this.action(b.dataset.a, b.dataset.v);
    });
  }

  openPause() {
    this.modal = true;
    this.sub = null;
    this.root.classList.remove('hidden');
    this.root.innerHTML = `<div class="menu"><h1>PAUSED</h1>
      <button data-a="resume">RESUME</button>
      <button data-a="journal">CHRONICLE</button>
      <button data-a="map">MAP</button>
      <button data-a="settings">SETTINGS</button>
      <button data-a="save">SAVE</button>
      <button data-a="help">CONTROLS</button></div>`;
  }
  close() {
    this.modal = false;
    this.sub = null;
    this.root.classList.add('hidden');
    this.root.innerHTML = '';
  }

  action(a, v) {
    G.audio.play('ui');
    if (a === 'resume') G.game.pause(false);
    else if (a === 'back') this.openPause();
    else if (a === 'journal') this.journal();
    else if (a === 'map') this.map();
    else if (a === 'settings') this.settings();
    else if (a === 'help') this.help();
    else if (a === 'save') { G.game.save(); G.hud.toast('Game saved', 'good'); }
    else if (a === 'quality') { G.settings.quality = v; G.engine.applyQuality(v); this.settings(); }
    else if (a === 'sens') { G.settings.sensitivity = +v; this.settings(); }
    else if (a === 'vol') { G.settings.volume = +v; this.settings(); }
    else if (a === 'invert') { G.settings.invertY = !G.settings.invertY; this.settings(); }
    else if (a === 'choice') {
      const c = this._choices[+v];
      this.close();
      G.paused = false;
      G.input.requestLock();
      c.fn();
    }
  }

  _panel(title, body) {
    this.sub = title;
    this.root.innerHTML = `<div class="panel"><div class="tabs"><button data-a="back">◀ BACK</button></div><h2>${title}</h2>${body}</div>`;
  }

  journal() {
    const j = G.chronicle.journal;
    const facts = [...G.chronicle.facts.keys()].length;
    let html = `<p style="opacity:.75">Every change you make in one era ripples forward. ${facts} facts recorded.</p>`;
    if (!j.length) html += '<p style="opacity:.6">Nothing yet. Plant something. Save someone. Break something.</p>';
    for (const e of [...j].reverse()) {
      if (e.kind === 'cause') html += `<div class="entry"><span class="yr">${ERA_YEARS[e.era]}</span>${e.text}</div>`;
      else html += `<div class="entry" style="border-color:#fff;margin-left:30px"><span class="yr">${ERA_YEARS[e.era]}</span>→ ${e.text} <span style="opacity:.55">(because: ${e.cause})</span></div>`;
    }
    const pend = G.chronicle.pending.filter((p) => !p.discovered);
    if (pend.length) html += `<h3 style="letter-spacing:4px;opacity:.8">UNSEEN ECHOES</h3>` + pend.map((p) => `<div class="entry" style="opacity:.6"><span class="yr">${ERA_YEARS[p.era]}</span>Something changed because: ${p.cause}. Go and look.</div>`).join('');
    const ms = G.missions;
    html += `<h3 style="letter-spacing:4px;opacity:.8">MISSIONS</h3>` + Object.entries(ms.state).filter(([, s]) => s !== 'locked').map(([id, s]) => `<div class="entry"><span class="yr">${s.toUpperCase()}</span>${ms.defs[id].title}${ms.defs[id].where && s === 'available' ? ' — start at ' + ms.defs[id].where : ''}</div>`).join('');
    this._panel('CHRONICLE', html);
  }

  map() {
    this._panel('MAP — ' + ERA_YEARS[G.era], '<canvas id="mapc" width="900" height="640" style="width:100%;max-width:900px"></canvas><p style="opacity:.6">Markers: white = mission start, colour = objective. Grey markers belong to another era.</p>');
    const cv = document.getElementById('mapc');
    const c = cv.getContext('2d');
    const s = Math.min(cv.width, cv.height) / (GRID * CHUNK);
    const ox = (cv.width - GRID * CHUNK * s) / 2, oy = 0;
    c.fillStyle = '#05060a'; c.fillRect(0, 0, cv.width, cv.height);
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) {
      c.fillStyle = DCOL[district(i, j)] || '#222';
      c.fillRect(ox + i * CHUNK * s + 1, oy + j * CHUNK * s + 1, CHUNK * s - 2, CHUNK * s - 2);
    }
    c.font = '11px monospace';
    c.fillStyle = '#fff';
    for (const [id, l] of Object.entries(LANDMARKS)) {
      const p = landmarkCenter(id);
      const x = ox + (p.x + HALF) * s, y = oy + (p.z + HALF) * s;
      c.fillStyle = '#ffb347'; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.fillText(l.name, x + 5, y + 4);
    }
    for (const m of G.hud.markers) {
      const x = ox + (m.x + HALF) * s, y = oy + (m.z + HALF) * s;
      c.fillStyle = m.era !== undefined && m.era !== G.era ? '#777' : m.color || '#3cf2ff';
      c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill();
    }
    const p = G.player.pos;
    c.fillStyle = '#ff3a3a';
    c.beginPath(); c.arc(ox + (p.x + HALF) * s, oy + (p.z + HALF) * s, 5, 0, 7); c.fill();
  }

  settings() {
    const S = G.settings;
    const q = ['low', 'medium', 'high'].map((v) => `<button data-a="quality" data-v="${v}" style="${S.quality === v ? 'background:var(--accent);color:#000' : ''}">${v.toUpperCase()}</button>`).join(' ');
    const sens = [0.5, 0.75, 1, 1.5, 2].map((v) => `<button data-a="sens" data-v="${v}" style="${S.sensitivity === v ? 'background:var(--accent);color:#000' : ''}">${v}</button>`).join(' ');
    const vol = [0, 0.4, 0.8, 1].map((v) => `<button data-a="vol" data-v="${v}" style="${S.volume === v ? 'background:var(--accent);color:#000' : ''}">${Math.round(v * 100)}%</button>`).join(' ');
    this._panel('SETTINGS', `<div class="menu" style="gap:18px"><div>GRAPHICS<br>${q}</div><div>MOUSE SENSITIVITY<br>${sens}</div><div>VOLUME<br>${vol}</div><div><button data-a="invert">INVERT Y: ${S.invertY ? 'ON' : 'OFF'}</button></div></div>`);
  }

  help() {
    this._panel('CONTROLS', document.querySelector('.controls').innerHTML.replace(/ · /g, '<br>'));
  }

  // Modal choice for branching decisions
  choice(title, options) {
    this._choices = options;
    G.paused = true;
    G.input.exitLock();
    this.modal = true;
    this.sub = 'choice';
    this.root.classList.remove('hidden');
    this.root.innerHTML = `<div class="menu"><h1 style="font-size:28px">${title}</h1>${options.map((o, i) => `<button data-a="choice" data-v="${i}">${o.label}</button>`).join('')}</div>`;
  }

  update() {}
}
