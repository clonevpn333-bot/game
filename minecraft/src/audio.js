// ============================================================================
//  Procedural WebAudio sound effects (no asset files needed)
// ============================================================================
export class GameAudio {
  constructor() { this.ctx = null; this.enabled = true; this.volume = 0.4; this._last = {}; }
  init() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.enabled = false; } }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
  _env(type, freq, dur, vol, slide = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(vol * this.volume, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t); o.stop(t + dur);
  }
  _noise(dur, vol, filterFreq = 1200) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filterFreq;
    const g = this.ctx.createGain(); g.gain.value = vol * this.volume;
    src.connect(f); f.connect(g); g.connect(this.ctx.destination);
    src.start(t);
  }
  play(name) {
    if (!this.ctx || !this.enabled) return;
    switch (name) {
      case 'break': this._noise(0.18, 0.6, 1800); break;
      case 'place': this._env('square', 240, 0.08, 0.3, 60); break;
      case 'hurt': this._env('sawtooth', 200, 0.25, 0.4, -120); break;
      case 'hit': this._env('square', 160, 0.08, 0.3, -40); this._noise(0.06, 0.3); break;
      case 'explode': this._noise(0.7, 0.9, 600); this._env('sawtooth', 90, 0.6, 0.5, -50); break;
      case 'pop': this._env('sine', 600, 0.06, 0.25, 200); break;
      case 'mobdeath': this._env('sawtooth', 300, 0.3, 0.35, -180); break;
      case 'step': this._noise(0.05, 0.15, 800); break;
      case 'splash': this._noise(0.3, 0.4, 1000); break;
      case 'click': this._env('square', 500, 0.04, 0.2); break;
      case 'level': this._env('sine', 500, 0.15, 0.3, 200); break;
    }
  }
  tick(name) {
    const now = performance.now();
    if (this._last[name] && now - this._last[name] < 180) return;
    this._last[name] = now;
    if (name === 'dig') this._noise(0.06, 0.25, 1400);
    if (name === 'step') this.play('step');
  }
}
