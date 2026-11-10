// Game shell: owns the stage (two stacked canvases + DOM UI), the fixed-step
// loop, shared services, and the Director that sequences realities.
import { Input } from './input.js';
import { Save } from './save.js';
import { Events } from './events.js';
import { Perf } from './perf.js';
import { Director } from './director.js';
import { Dialogue } from './dialogue.js';
import { AudioEngine, Music } from '../audio/audio.js';
import { Sfx } from '../audio/sfx.js';

export const STEP = 1 / 60;

export class Game {
  constructor() {
    this.stage = document.getElementById('stage');
    this.gl = document.getElementById('gl');
    this.c2d = document.getElementById('c2d');
    this.ui = document.getElementById('ui');
    this.ctx = this.c2d.getContext('2d');
    this.save = new Save();
    this.settings = this.save.settings;
    this.events = new Events();
    this.input = new Input(this.stage);
    this.audio = new AudioEngine(this.settings);
    this.music = new Music(this.audio);
    this.sfx = new Sfx(this.audio);
    this.perf = new Perf(this);
    this.dialogue = new Dialogue(this);
    this.director = new Director(this);
    this.time = 0; this.acc = 0; this.last = 0; this.frame = 0;
    this.paused = false; this.timeScale = 1;
    this.W = 1280; this.H = 720; this.dpr = 1;
    this.overlay = null; // menu / pause controller with update(dt)
    window.addEventListener('resize', () => this.resize());
    const wake = () => { this.audio.resume(); };
    window.addEventListener('keydown', wake); window.addEventListener('mousedown', wake); window.addEventListener('touchstart', wake);
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.director.current && !this.overlay) this.director.pause(); });
    this.resize();
  }

  resize() {
    const ww = window.innerWidth, wh = window.innerHeight;
    let w = ww, h = Math.round((ww * 9) / 16);
    if (h > wh) { h = wh; w = Math.round((wh * 16) / 9); }
    this.stage.style.width = w + 'px'; this.stage.style.height = h + 'px';
    this.stage.style.left = ((ww - w) >> 1) + 'px'; this.stage.style.top = ((wh - h) >> 1) + 'px';
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = this.dpr * (this.settings.resScale || 1);
    this.W = Math.max(320, Math.round(w * scale)); this.H = Math.max(180, Math.round(h * scale));
    this.cssW = w; this.cssH = h;
    this.c2d.width = this.W; this.c2d.height = this.H;
    this.stage.style.setProperty('--u', w / 1280 + 'px');
    this.events.emit('resize', { w: this.W, h: this.H, cssW: w, cssH: h });
  }

  start() {
    this.last = performance.now();
    const tick = (now) => {
      requestAnimationFrame(tick);
      let dt = (now - this.last) / 1000; this.last = now;
      if (dt > 0.25) dt = 0.25; if (dt < 0) dt = 0;
      this.perf.begin(dt);
      this.acc += dt;
      let steps = 0;
      while (this.acc >= STEP && steps < 5) {
        this.input.step();
        this.update(STEP);
        this.acc -= STEP; steps++;
      }
      if (steps === 5) this.acc = 0;
      this.input.endFrame();
      this.render(dt);
      this.perf.end();
      this.frame++;
    };
    requestAnimationFrame(tick);
  }

  update(dt) {
    if (this.input.pressed.pause && this.director.current && !this.overlay && this.director.canPause()) { this.director.pause(); return; }
    if (this.overlay) this.overlay.update?.(dt);
    if (this.paused) return;
    const sdt = dt * this.timeScale;
    this.time += sdt;
    this.dialogue.update(sdt);
    this.director.update(sdt);
    if (this.director.current) this.save.data.stats.time += dt;
  }
  render(dt) {
    this.director.render(dt);
    if (this.overlay) this.overlay.render?.(dt);
  }

  // Clear the 2D canvas (it floats above the WebGL canvas).
  clear2d() { this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.clearRect(0, 0, this.W, this.H); }
  show3d(on) { this.gl.style.visibility = on ? 'visible' : 'hidden'; }
}
