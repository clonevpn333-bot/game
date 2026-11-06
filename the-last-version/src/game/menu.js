// Title screen and settings/controls panels.
import { el } from '../engine/ui.js';
import { settings, saveSettings, hasSave, state, load as loadSave, CHAPTERS } from './state.js';

export class Menu {
  constructor(game) {
    this.game = game; this.ui = game.ui;
  }

  show() {
    const g = this.game;
    this.root = el('div', 'menu interactive', this.ui.menuRoot);
    const saved = hasSave() && loadSave();
    const ch = CHAPTERS.find((c) => c.n === state.chapter);
    this.root.innerHTML = `
      <div class="logo"><span>ATLAS PROTOCOL</span>THE LAST<br>VERSION</div>
      <div class="tagline">Every time you learn the rules, the world changes them.</div>
      <div class="items">
        ${saved && ch ? `<button data-a="continue">Continue</button><div class="sub">Chapter ${ch.n} · ${ch.name} · checkpoint “${state.checkpoint}”</div>` : ''}
        <button data-a="new">${saved ? 'New game' : 'Begin'}</button>
        <button data-a="settings">Settings</button>
        <button data-a="controls">Controls</button>
        <button data-a="credits">Credits</button>
      </div>
      <div class="meta">VERTICAL SLICE · CHAPTERS 1–3<br>DRIVING · NAVAL · HORROR<br>HEADPHONES RECOMMENDED</div>`;
    requestAnimationFrame(() => this.root.classList.add('show'));
    this.root.querySelectorAll('button').forEach((b) => b.addEventListener('mouseenter', () => g.audio.ui('hover')));
    this.root.onclick = (e) => {
      const a = e.target.closest('button')?.dataset.a; if (!a) return;
      g.audio.ui('click');
      if (a === 'continue') g.continueGame();
      if (a === 'new') {
        if (saved) this.confirm('Start a new game? Your current progress will be overwritten.', () => g.startNew());
        else g.startNew();
      }
      if (a === 'settings') this.settings();
      if (a === 'controls') this.controls();
      if (a === 'credits') this.credits();
    };
  }
  hide() { this.root?.remove(); }

  panel(html) {
    const p = el('div', 'panel interactive', this.ui.menuRoot, `<div class="box">${html}</div>`);
    p.addEventListener('click', (e) => { if (e.target === p || e.target.dataset.close !== undefined) { this.game.audio.ui('click'); p.remove(); } });
    return p;
  }

  confirm(text, yes) {
    const p = this.panel(`<h2>Are you sure?</h2><p>${text}</p><div class="btns"><button data-yes>Yes</button><button data-close>Cancel</button></div>`);
    p.querySelector('[data-yes]').onclick = () => { p.remove(); yes(); };
  }

  settings(onClose) {
    const s = settings;
    const p = this.panel(`<h2>Settings</h2>
      <div class="row">Graphics quality <select id="q">${['low', 'medium', 'high', 'ultra'].map((q) => `<option ${q === s.quality ? 'selected' : ''}>${q}</option>`).join('')}</select></div>
      <div class="row">Master volume <input id="vm" type="range" min="0" max="1" step="0.05" value="${s.master}"></div>
      <div class="row">Music volume <input id="vmu" type="range" min="0" max="1" step="0.05" value="${s.music}"></div>
      <div class="row">Effects volume <input id="vs" type="range" min="0" max="1" step="0.05" value="${s.sfx}"></div>
      <div class="row">Mouse sensitivity <input id="sens" type="range" min="0.3" max="2.5" step="0.05" value="${s.sensitivity}"></div>
      <div class="row">Invert look <select id="inv"><option value="0">Off</option><option value="1" ${s.invertY ? 'selected' : ''}>On</option></select></div>
      <div class="row">Subtitle speed <input id="ss" type="range" min="0.6" max="1.6" step="0.1" value="${s.subtitleSpeed}"></div>
      <div class="row">Show FPS <select id="fps"><option value="0">Off</option><option value="1" ${s.showFps ? 'selected' : ''}>On</option></select></div>
      <div class="btns"><button data-close>Done</button></div>`);
    const g = this.game;
    const apply = () => {
      s.quality = p.querySelector('#q').value; s.master = +p.querySelector('#vm').value; s.music = +p.querySelector('#vmu').value;
      s.sfx = +p.querySelector('#vs').value; s.sensitivity = +p.querySelector('#sens').value; s.invertY = p.querySelector('#inv').value === '1';
      s.subtitleSpeed = +p.querySelector('#ss').value; s.showFps = p.querySelector('#fps').value === '1';
      saveSettings(); applySettings(g);
    };
    p.querySelectorAll('select,input').forEach((i) => i.addEventListener('input', apply));
    return p;
  }

  controls() {
    this.panel(`<h2>Controls</h2>
      <p><b>Driving</b> — <kbd>W</kbd>/<kbd>S</kbd> throttle / brake-reverse · <kbd>A</kbd>/<kbd>D</kbd> steer · <kbd>Space</kbd> handbrake · <kbd>Shift</kbd> nitrous · <kbd>C</kbd> camera · <kbd>R</kbd> reset car</p>
      <p><b>Boat</b> — <kbd>W</kbd>/<kbd>S</kbd> throttle · <kbd>A</kbd>/<kbd>D</kbd> rudder · mouse aims the bow gun · <kbd>LMB</kbd> fire · <kbd>Shift</kbd> boost · <kbd>Space</kbd> jump the swell (trim)</p>
      <p><b>On foot</b> — <kbd>WASD</kbd> move · mouse look · <kbd>Shift</kbd> run · <kbd>E</kbd> interact</p>
      <p><b>Hotel</b> — <kbd>WASD</kbd> move · mouse look · <kbd>Shift</kbd> run (noisy) · <kbd>Ctrl</kbd>/<kbd>C</kbd> crouch · <kbd>F</kbd> flashlight · <kbd>E</kbd> interact · <b>hold</b> <kbd>LMB</kbd> on a door and move the mouse to swing it · <kbd>Space</kbd> hold breath while hidden</p>
      <p>Dialogue choices: <kbd>1</kbd>–<kbd>4</kbd> or click. Pause: <kbd>Esc</kbd>. Gamepad supported for driving and boat.</p>
      <div class="btns"><button data-close>Close</button></div>`);
  }

  credits() {
    this.panel(`<h2>Credits</h2>
      <p>THE LAST VERSION — an original game. Characters, vehicles, architecture, shaders, music and sound are authored in code for this project; the score and all sound effects are synthesised live with the Web Audio API.</p>
      <p>Photo-scanned PBR textures, HDR skies and furniture/prop models from <b>Poly Haven</b> (CC0), credited per-asset in <code>ASSETS.md</code>.</p>
      <p>Rendering: three.js (MIT).</p>
      <div class="btns"><button data-close>Close</button></div>`);
  }
}

export function applySettings(g) {
  g.renderer.setQuality(settings.quality);
  g.audio.setVolumes({ master: settings.master, music: settings.music, sfx: settings.sfx });
  g.input.sensitivity = settings.sensitivity; g.input.invertY = settings.invertY;
  g.ui.subtitleSpeed = settings.subtitleSpeed;
}
