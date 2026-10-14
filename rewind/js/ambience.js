/* Ambience: tiny synthesized room tones (no audio files). Off by default; starts only from a user gesture.
 *   y2020 — warm low hum + soft room noise (late-night bedroom)
 *   fall  — brown-noise wind/rain bed + gentle pad */
(function () {
  'use strict';
  class Ambience {
    constructor() { this.ctx = null; this.on = false; this.scenes = {}; this.current = null; this.master = null; }
    _noise(ctx, type) {
      const len = ctx.sampleRate * 3, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true; return src;
    }
    _build() {
      const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
      const mk = (freqs, type, lp, noiseType, noiseLp, noiseGain) => {
        const g = ctx.createGain(); g.gain.value = 0; g.connect(this.master);
        const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.connect(g);
        freqs.forEach((fr, i) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = fr; o.detune.value = (i - 1) * 6; const og = ctx.createGain(); og.gain.value = 0.05; o.connect(og); og.connect(f); o.start(); });
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07; const lg = ctx.createGain(); lg.gain.value = lp * 0.25; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
        const n = this._noise(ctx, noiseType), nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = noiseLp; const ng = ctx.createGain(); ng.gain.value = noiseGain;
        n.connect(nf); nf.connect(ng); ng.connect(g); n.start();
        return g;
      };
      this.scenes.y2020 = mk([110, 164.8, 277.2], 'sine', 500, 'brown', 260, 0.12);
      this.scenes.fall = mk([146.8, 220, 174.6], 'triangle', 700, 'brown', 900, 0.22);
    }
    async enable(scene) {
      if (!this.ctx) this._build();
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      this.on = true; this.master.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.8); this.setScene(scene || this.current || 'y2020');
    }
    disable() { if (!this.ctx) return; this.on = false; this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4); }
    setScene(scene) {
      this.current = scene; if (!this.ctx || !this.on) return;
      for (const [k, g] of Object.entries(this.scenes)) g.gain.setTargetAtTime(k === scene ? 1 : 0, this.ctx.currentTime, 1.2);
    }
  }
  window.Ambience = Ambience;
})();
