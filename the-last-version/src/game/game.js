// The director: owns engine services, runs the main loop, loads chapters and
// hands control between them without ever returning to a menu.
import * as THREE from 'three';
import { state, save, load as loadSave, reset, settings, saveSettings, hasSave, CHAPTERS } from './state.js';
import { el, wait } from '../engine/ui.js';

const CHAPTER_MODULES = {
  1: () => import('../chapters/ch1/chapter1.js'),
  2: () => import('../chapters/ch2/chapter2.js'),
  3: () => import('../chapters/ch3/chapter3.js'),
  4: () => import('../chapters/ch4/chapter4.js'),
  5: () => import('../chapters/ch5/chapter5.js'),
};

export class Game {
  constructor({ renderer, input, audio, music, ui }) {
    Object.assign(this, { renderer, input, audio, music, ui });
    this.state = state;
    this.chapter = null;
    this.mode = 'menu';
    this.paused = false;
    this.clock = new THREE.Clock();
    this.time = 0;
    this.timeScale = 1;
    this.frames = 0; this.fpsT = 0;
    this.menuScene = null;
    this.transitioning = false;
    addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.mode === 'play' && !this.transitioning) this.togglePause();
      }
    });
    document.addEventListener('pointerlockchange', () => {
      // losing pointer lock in a mouse-look chapter pauses the game
      if (!document.pointerLockElement && this.mode === 'play' && this.chapter?.usesPointerLock && !this.paused && !this.transitioning && !this.ui.choiceOpen) this.togglePause(true);
    });
  }

  /** Debug/QA: advance the active chapter without rendering. */
  simulate(seconds, dt = 1 / 30) { for (let t = 0; t < seconds; t += dt) { this.time += dt; this.chapter.update(dt * this.timeScale, this.time); this.input.endFrame(); } }

  capture() { this.renderer.render(0, this.time); return this.renderer.renderer.domElement.toDataURL('image/jpeg', 0.88); }

  loop() {
    if (window.__holdLoop) { setTimeout(() => this.loop(), 100); return; }
    requestAnimationFrame(() => this.loop());
    let dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.input.poll();
    this.time += dt;
    this.frames++; this.fpsT += dt;
    if (this.fpsT > 0.5) { if (settings.showFps) this.ui.setFps(Math.round(this.frames / this.fpsT) + ' fps'); else this.ui.setFps(''); this.frames = 0; this.fpsT = 0; }
    const sdt = this.paused ? 0 : dt * this.timeScale;
    try {
      if (this.mode === 'menu' && this.menuScene) this.menuScene.update(dt, this.time);
      else if (this.chapter && this.mode === 'play') { this.chapter.update(sdt, this.time); state.playTime += sdt; }
    } catch (e) { console.error(e); }
    if (this.renderer.camera) this.audio.updateListener(this.renderer.camera);
    this.renderer.render(dt, this.time);
    this.input.endFrame();
  }

  // ---------- chapter flow ----------
  async startNew() {
    reset(); save();
    await this.enterChapter(1, 'start', { fromMenu: true });
  }
  async continueGame() {
    loadSave();
    await this.enterChapter(state.chapter, state.checkpoint, { fromMenu: true });
  }

  async enterChapter(n, checkpoint = 'start', opts = {}) {
    this.transitioning = true;
    if (opts.fromMenu) { await this.ui.fade(1, 1.2); this.menu?.hide(); this.menuScene?.dispose(); this.menuScene = null; }
    this.music.stop(1);
    this.ui.clearHud();
    this.boot(true, `Loading chapter ${n}…`);
    if (this.chapter) { this.chapter.dispose(); this.chapter = null; }
    state.chapter = n; state.checkpoint = checkpoint; save();
    const mod = await CHAPTER_MODULES[n]();
    const ch = new mod.default(this);
    await ch.load(checkpoint, opts);
    this.chapter = ch;
    this.boot(false);
    this.mode = 'play';
    this.transitioning = false;
    this.input.setPointerLock(!!ch.usesPointerLock);
    ch.start(checkpoint, opts);
  }

  /** Called by a chapter when its final transformation completes. */
  async nextChapter(opts = {}) {
    const n = state.chapter + 1;
    if (!CHAPTER_MODULES[n]) return this.endOfSlice();
    await this.enterChapter(n, 'start', { ...opts, transition: true });
  }

  checkpoint(id, label = 'CHECKPOINT') {
    state.checkpoint = id; save();
    this.ui.toast(label + ' SAVED');
    this.audio.ui('checkpoint');
  }

  /** Fast retry from the last checkpoint. */
  async fail(message = 'YOU DIDN\'T MAKE IT') {
    if (this.transitioning) return;
    this.transitioning = true;
    state.deaths++;
    this.ui.fadeColor('#000');
    await this.ui.fade(1, 0.6);
    const card = el('div', 'chapter-card show', this.ui.root, `<div class="num">REALITY UNSTABLE</div><div class="name" style="font-size:44px">${message}</div><div class="genre">Restoring last stable version</div>`);
    await wait(1100);
    card.remove();
    this.ui.clearHud();
    await this.chapter.restart(state.checkpoint);
    this.transitioning = false;
    await this.ui.fade(0, 0.6);
  }

  boot(show, msg) {
    const b = document.getElementById('boot');
    if (msg) document.getElementById('boot-msg').textContent = msg;
    b.classList.toggle('gone', !show);
  }

  async endOfSlice() {
    this.mode = 'menu';
    this.input.setPointerLock(false);
    this.ui.clearHud();
    await this.ui.fade(1, 2);
    if (this.chapter) { this.chapter.dispose(); this.chapter = null; }
    const NEXT = { 4: ['THE FALLEN KING', 'Medieval action RPG'], 5: ['RUNNING OUT OF TIME', '2.5D precision platformer'], 6: ['THE GENERAL', 'Real-time tactical strategy'] };
    const n = Object.keys(CHAPTER_MODULES).length + 1, [name, genre] = NEXT[n] || ['TO BE CONTINUED', ''];
    state.chapter = n - 1; state.checkpoint = 'start'; save();
    const c = el('div', 'chapter-card show', this.ui.root, `<div class="num">END OF THE PLAYABLE CHAPTERS</div><div class="name">${name}</div><div class="genre">Chapter ${n} · ${genre} · in development</div><div class="rule" style="width:420px"></div>`);
    this.music.play('menu');
    await this.ui.fade(0, 1);
    await wait(6000);
    await this.ui.fade(1, 1.5);
    c.remove();
    location.reload();
  }

  // ---------- pause ----------
  togglePause(force) {
    const want = force ?? !this.paused;
    if (want === this.paused) return;
    this.paused = want;
    if (want) {
      this.input.setPointerLock(false);
      this.audio.ctx?.suspend();
      this.pausePanel = el('div', 'panel interactive', this.ui.menuRoot);
      const ch = CHAPTERS.find((c) => c.n === state.chapter);
      this.pausePanel.innerHTML = `<div class="box"><h2>Paused</h2>
        <p style="margin-top:-8px">Chapter ${ch.n} — ${ch.name}<br><span style="font-size:14px">${ch.genre}</span></p>
        <div class="btns" style="flex-direction:column;align-items:flex-start">
          <button data-a="resume">Resume</button>
          <button data-a="retry">Restart from checkpoint</button>
          <button data-a="settings">Settings</button>
          <button data-a="controls">Controls</button>
          <button data-a="quit">Save &amp; quit to title</button>
        </div></div>`;
      this.pausePanel.onclick = (e) => {
        const a = e.target.dataset.a; if (!a) return;
        this.audio.ctx?.resume(); this.audio.ui('click');
        if (a === 'resume') this.togglePause(false);
        if (a === 'retry') { this.togglePause(false); this.fail('CHECKPOINT RESTORED'); }
        if (a === 'settings') this.menu.settings(() => {});
        if (a === 'controls') this.menu.controls();
        if (a === 'quit') { save(); location.reload(); }
      };
    } else {
      this.pausePanel?.remove();
      this.audio.ctx?.resume();
      if (this.chapter?.usesPointerLock) { this.input.setPointerLock(true); this.input.lock(); }
    }
  }
}

export { hasSave };
