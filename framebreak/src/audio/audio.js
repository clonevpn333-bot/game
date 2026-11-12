// FRAMEBREAK audio engine.
// Everything is synthesised live with WebAudio: there are no sample files.
// - a library of instruments (chip pulse, FM, brass, music box, strings, drums…)
// - a bar-based adaptive sequencer with intensity layers and section queues
// - one-shot stingers quantised to the beat
import { clamp } from '../core/util.js';

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteToMidi(n) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
  if (!m) return null;
  return NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3], 10) + 1) * 12;
}
export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

export class AudioEngine {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.ready = false;
    this.pitchMul = 1;         // global detune multiplier (transformations bend it)
    this.music = null;
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC({ latencyHint: 'interactive' }));
    this.master = ctx.createGain();
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.knee.value = 18; this.comp.ratio.value = 5;
    this.comp.attack.value = 0.004; this.comp.release.value = 0.18;
    this.master.connect(this.comp); this.comp.connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.musicFilter = ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass'; this.musicFilter.frequency.value = 20000; this.musicFilter.Q.value = 0.7;
    this.musicBus.connect(this.musicFilter); this.musicFilter.connect(this.master);
    this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.master);

    // Shared reverb (generated impulse response).
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.2, 2.6);
    this.reverbGain = ctx.createGain(); this.reverbGain.gain.value = 0.9;
    this.reverb.connect(this.reverbGain); this.reverbGain.connect(this.master);
    this.musicSend = ctx.createGain(); this.musicSend.gain.value = 1; this.musicSend.connect(this.reverb);
    this.sfxSend = ctx.createGain(); this.sfxSend.gain.value = 1; this.sfxSend.connect(this.reverb);

    // Noise sources.
    this.noiseBuf = this._noise(2);
    this.waves = {};
    for (const d of [0.125, 0.25, 0.5]) this.waves['p' + d] = this._pulseWave(d);
    this.applyVolumes();
    this.ready = true;
  }
  resume() { this.init(); if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); }
  get t() { return this.ctx ? this.ctx.currentTime : 0; }
  applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings;
    this.master.gain.value = s.master;
    this.musicBus.gain.value = s.music * 0.55;
    this.sfxBus.gain.value = s.sfx * 0.8;
  }
  // Muffle music (pause menus, transformations). 0 = open, 1 = fully muffled.
  muffle(amount, time = 0.3) {
    if (!this.ctx) return;
    const f = 20000 * Math.pow(0.02, clamp(amount, 0, 1));
    this.musicFilter.frequency.cancelScheduledValues(this.t);
    this.musicFilter.frequency.setTargetAtTime(f, this.t, time / 3);
  }
  _noise(sec) {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  _impulse(sec, decay) {
    const sr = this.ctx.sampleRate, len = sr * sec, b = this.ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay) * (i < 400 ? i / 400 : 1);
    }
    return b;
  }
  _pulseWave(duty) {
    const n = 48, re = new Float32Array(n), im = new Float32Array(n);
    for (let i = 1; i < n; i++) re[i] = (2 / (i * Math.PI)) * Math.sin(i * Math.PI * duty);
    return this.ctx.createPeriodicWave(re, im, { disableNormalization: false });
  }

  // ---- low level voices -------------------------------------------------
  osc(type, freq, t, dur, out, { a = 0.004, d = 0.1, s = 0.6, r = 0.05, vol = 0.3, detune = 0, slide = 0, slideT = 0.08, vib = 0, vibRate = 5.5, vibDelay = 0.15 } = {}) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    if (type.startsWith('p0')) o.setPeriodicWave(this.waves[type]); else o.type = type;
    const f = freq * this.pitchMul;
    if (slide) { o.frequency.setValueAtTime(f * slide, t); o.frequency.exponentialRampToValueAtTime(f, t + slideT); } else o.frequency.setValueAtTime(f, t);
    o.detune.value = detune;
    if (vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = vibRate; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(vib, t + vibDelay + 0.1);
      l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(t + dur + r + 0.05);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(vol * s, 0.0001), t + a + d);
    g.gain.setValueAtTime(Math.max(vol * s, 0.0001), Math.max(t + dur, t + a + d));
    g.gain.exponentialRampToValueAtTime(0.0001, Math.max(t + dur, t + a + d) + r);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(Math.max(t + dur, t + a + d) + r + 0.03);
    return { o, g };
  }
  noise(t, dur, out, { vol = 0.3, type = 'highpass', freq = 4000, q = 0.8, a = 0.001, sweep = 0, rate = 1 } = {}) {
    const ctx = this.ctx, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noiseBuf; src.loop = true; src.playbackRate.value = rate;
    f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(out);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.03);
    return { src, f, g };
  }
  fm(freq, t, dur, out, { ratio = 2, index = 3, idxDecay = 0.15, a = 0.003, d = 0.3, s = 0.3, r = 0.1, vol = 0.3, detune = 0 } = {}) {
    const ctx = this.ctx, c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    const f = freq * this.pitchMul;
    c.frequency.value = f; c.detune.value = detune; m.frequency.value = f * ratio;
    mg.gain.setValueAtTime(f * index, t); mg.gain.exponentialRampToValueAtTime(Math.max(f * index * 0.08, 0.01), t + idxDecay);
    m.connect(mg); mg.connect(c.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(vol * s, 0.0001), t + a + d);
    const end = Math.max(t + dur, t + a + d);
    g.gain.setValueAtTime(Math.max(vol * s, 0.0001), end); g.gain.exponentialRampToValueAtTime(0.0001, end + r);
    c.connect(g); g.connect(out); c.start(t); m.start(t); c.stop(end + r + 0.03); m.stop(end + r + 0.03);
    return { c, g };
  }
  filt(type, freq, q, out) {
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; f.connect(out); return f;
  }
}

// ---- instrument library ---------------------------------------------------
// signature: (E, t, freq, dur, vel, out, p)
let _dist = null; const distCurve = () => _dist || (_dist = (() => { const n = 4096, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * 3.2) * 0.95; } return c; })());
export const INST = {
  // 16-bit console voices
  lead: (E, t, f, d, v, out, p = {}) => E.osc(p.wave || 'p0.25', f, t, d, out, { vol: 0.16 * v, a: 0.004, d: 0.08, s: 0.7, r: 0.06, vib: p.vib ?? 14, vibDelay: 0.14 }),
  lead2: (E, t, f, d, v, out, p = {}) => { E.osc('p0.125', f, t, d, out, { vol: 0.11 * v, s: 0.75, r: 0.05, vib: 10 }); E.osc('p0.5', f * 2, t, d * 0.5, out, { vol: 0.03 * v, s: 0.3 }); },
  arp: (E, t, f, d, v, out) => E.osc('p0.5', f, t, Math.min(d, 0.09), out, { vol: 0.09 * v, a: 0.002, d: 0.05, s: 0.25, r: 0.04 }),
  chipbass: (E, t, f, d, v, out) => { E.osc('triangle', f, t, d, out, { vol: 0.34 * v, a: 0.003, d: 0.12, s: 0.8, r: 0.03 }); E.osc('p0.5', f, t, Math.min(d, 0.06), out, { vol: 0.05 * v, s: 0.2 }); },
  // analog-ish
  saw: (E, t, f, d, v, out, p = {}) => {
    const fl = E.filt('lowpass', 400, 4, out);
    fl.frequency.setValueAtTime(p.cut0 || 3600, t); fl.frequency.exponentialRampToValueAtTime(p.cut1 || 700, t + Math.max(0.05, d * 0.8));
    E.osc('sawtooth', f, t, d, fl, { vol: 0.13 * v, s: 0.7, r: 0.06, detune: -7 }); E.osc('sawtooth', f, t, d, fl, { vol: 0.13 * v, s: 0.7, r: 0.06, detune: 8 });
  },
  acid: (E, t, f, d, v, out) => {
    const fl = E.filt('lowpass', 300, 12, out);
    fl.frequency.setValueAtTime(200 + 2600 * v, t); fl.frequency.exponentialRampToValueAtTime(180, t + Math.max(0.06, d));
    E.osc('sawtooth', f, t, d, fl, { vol: 0.2 * v, s: 0.6, r: 0.03 });
  },
  subbass: (E, t, f, d, v, out) => { E.osc('sine', f, t, d, out, { vol: 0.4 * v, a: 0.005, d: 0.2, s: 0.8, r: 0.05 }); E.osc('sawtooth', f, t, d, E.filt('lowpass', 500, 1, out), { vol: 0.1 * v, s: 0.6 }); },
  pad: (E, t, f, d, v, out) => {
    const fl = E.filt('lowpass', 1500, 0.7, out);
    for (const dt of [-11, 0, 9]) E.osc('sawtooth', f, t, d, fl, { vol: 0.04 * v, a: Math.min(0.35, d * 0.4), d: 0.2, s: 0.9, r: 0.4, detune: dt });
  },
  strings: (E, t, f, d, v, out) => {
    const fl = E.filt('lowpass', 2600, 0.6, out);
    for (const dt of [-9, 6]) E.osc('sawtooth', f, t, d, fl, { vol: 0.055 * v, a: Math.min(0.12, d * 0.3), d: 0.2, s: 0.85, r: 0.25, detune: dt, vib: 9, vibDelay: 0.2 });
  },
  stab: (E, t, f, d, v, out) => { const fl = E.filt('lowpass', 2400, 1, out); for (const dt of [-8, 8]) E.osc('sawtooth', f, t, Math.min(d, 0.18), fl, { vol: 0.07 * v, a: 0.004, d: 0.1, s: 0.4, r: 0.08, detune: dt }); },
  // FM family
  epiano: (E, t, f, d, v, out) => E.fm(f, t, d, out, { ratio: 1, index: 1.4 * v, idxDecay: 0.3, vol: 0.2 * v, d: 0.5, s: 0.25, r: 0.2 }),
  bell: (E, t, f, d, v, out) => E.fm(f, t, d, out, { ratio: 3.5, index: 2.2, idxDecay: 0.5, vol: 0.13 * v, d: 0.9, s: 0.05, r: 0.5 }),
  musicbox: (E, t, f, d, v, out) => { E.osc('sine', f, t, 0.02, out, { vol: 0.22 * v, a: 0.002, d: 0.7, s: 0.02, r: 0.5 }); E.osc('sine', f * 4.02, t, 0.02, out, { vol: 0.05 * v, a: 0.001, d: 0.18, s: 0.01, r: 0.1 }); },
  fmbass: (E, t, f, d, v, out) => E.fm(f, t, d, out, { ratio: 1, index: 2.5, idxDecay: 0.12, vol: 0.32 * v, d: 0.2, s: 0.5, r: 0.05 }),
  // acoustic imitations
  brass: (E, t, f, d, v, out) => {
    const fl = E.filt('lowpass', 500, 2.2, out);
    fl.frequency.setValueAtTime(350, t); fl.frequency.linearRampToValueAtTime(900 + 2600 * v, t + 0.05); fl.frequency.exponentialRampToValueAtTime(1100, t + Math.max(0.1, d));
    for (const dt of [-6, 5]) E.osc('sawtooth', f, t, d, fl, { vol: 0.12 * v, a: 0.02, d: 0.1, s: 0.8, r: 0.07, detune: dt, vib: 16, vibDelay: 0.22, slide: 0.94, slideT: 0.05 });
  },
  mute: (E, t, f, d, v, out) => { // wah-muted trumpet
    const fl = E.filt('bandpass', 1300, 5, out);
    fl.frequency.setValueAtTime(700, t); fl.frequency.linearRampToValueAtTime(1900, t + Math.min(0.14, d)); fl.frequency.linearRampToValueAtTime(900, t + d + 0.05);
    E.osc('sawtooth', f, t, d, fl, { vol: 0.34 * v, a: 0.015, s: 0.8, r: 0.06, vib: 18, vibDelay: 0.15, slide: 0.92, slideT: 0.06 });
  },
  clarinet: (E, t, f, d, v, out) => E.osc('p0.5', f, t, d, E.filt('lowpass', 1700, 1, out), { vol: 0.14 * v, a: 0.025, s: 0.85, r: 0.07, vib: 8, vibDelay: 0.25 }),
  upright: (E, t, f, d, v, out) => {
    const fl = E.filt('lowpass', 900, 1, out);
    E.osc('triangle', f, t, Math.min(d, 0.3), fl, { vol: 0.42 * v, a: 0.004, d: 0.28, s: 0.25, r: 0.12, slide: 0.9, slideT: 0.03 });
    E.osc('sine', f * 2, t, 0.05, fl, { vol: 0.08 * v, d: 0.06, s: 0.05 });
    E.noise(t, 0.02, out, { vol: 0.04 * v, type: 'bandpass', freq: 1800, q: 1 });
  },
  piano: (E, t, f, d, v, out) => { E.fm(f, t, d, out, { ratio: 2, index: 1.1 * v, idxDecay: 0.08, vol: 0.2 * v, d: 0.6, s: 0.12, r: 0.25 }); E.osc('triangle', f, t, d, out, { vol: 0.07 * v, d: 0.5, s: 0.1, r: 0.2 }); },
  pizz: (E, t, f, d, v, out) => E.osc('triangle', f, t, 0.03, E.filt('lowpass', 2200, 1, out), { vol: 0.26 * v, a: 0.002, d: 0.16, s: 0.02, r: 0.1 }),
  marimba: (E, t, f, d, v, out) => { E.osc('sine', f, t, 0.02, out, { vol: 0.26 * v, a: 0.002, d: 0.22, s: 0.02, r: 0.1 }); E.osc('sine', f * 3.9, t, 0.01, out, { vol: 0.07 * v, d: 0.05, s: 0.01 }); },
  flute: (E, t, f, d, v, out) => { E.osc('sine', f, t, d, out, { vol: 0.16 * v, a: 0.04, s: 0.9, r: 0.08, vib: 12, vibDelay: 0.2 }); E.noise(t, Math.min(d, 0.08), out, { vol: 0.02 * v, type: 'bandpass', freq: f * 2, q: 2 }); },
  organ: (E, t, f, d, v, out) => { for (const [m, a] of [[1, 0.1], [2, 0.06], [3, 0.03]]) E.osc('sine', f * m, t, d, out, { vol: a * v, a: 0.01, s: 1, r: 0.05 }); },
  celesta: (E, t, f, d, v, out) => E.fm(f, t, d, out, { ratio: 4, index: 1.2, idxDecay: 0.2, vol: 0.14 * v, d: 0.5, s: 0.03, r: 0.3 }),
  ukulele: (E, t, f, d, v, out) => { const fl = E.filt('lowpass', 3000, 1, out); E.osc('triangle', f, t, 0.02, fl, { vol: 0.2 * v, a: 0.002, d: 0.3, s: 0.03, r: 0.1 }); E.osc('p0.25', f, t, 0.02, fl, { vol: 0.04 * v, d: 0.1, s: 0.01 }); },
  // concert voices for the finale: a grand piano and a small synthetic orchestra
  grand: (E, t, f, d, v, out) => {
    const fl = E.filt('lowpass', Math.min(9000, 1400 + 5200 * Math.min(1.3, v) * (f < 260 ? 0.55 : 1)), 0.4, out), sus = Math.max(d, 0.25);
    E.fm(f, t, sus, fl, { ratio: 1, index: 1.5 * v, idxDecay: 0.14, vol: 0.17 * v, a: 0.002, d: 1.6, s: 0.1, r: 0.45 });
    E.fm(f, t, sus, fl, { ratio: 2.003, index: 0.8 * v, idxDecay: 0.07, vol: 0.06 * v, a: 0.002, d: 0.6, s: 0.05, r: 0.25, detune: 3 });
    E.osc('triangle', f, t, sus, fl, { vol: 0.09 * v, a: 0.003, d: 2.2, s: 0.16, r: 0.5, detune: -4 });
    if (f < 220) E.osc('sine', f, t, sus, out, { vol: 0.08 * v, a: 0.004, d: 1.8, s: 0.2, r: 0.4 });
    E.noise(t, 0.025, out, { vol: 0.02 * v, type: 'bandpass', freq: Math.min(7000, f * 7), q: 1.4 });
  },
  spic: (E, t, f, d, v, out) => { const fl = E.filt('lowpass', 2000 + 1800 * v, 0.7, out); for (const dt of [-13, 0, 12]) E.osc('sawtooth', f, t, Math.min(d, 0.11), fl, { vol: 0.045 * v, a: 0.006, d: 0.09, s: 0.3, r: 0.08, detune: dt }); },
  celli: (E, t, f, d, v, out) => { const fl = E.filt('lowpass', 900 + 900 * v, 0.8, out); for (const dt of [-10, 8]) E.osc('sawtooth', f, t, d, fl, { vol: 0.075 * v, a: Math.min(0.1, d * 0.3), d: 0.25, s: 0.85, r: 0.25, detune: dt, vib: 8, vibDelay: 0.3 }); },
  horns: (E, t, f, d, v, out) => {
    const fl = E.filt('lowpass', 500, 1.4, out); fl.frequency.setValueAtTime(420, t); fl.frequency.linearRampToValueAtTime(700 + 1500 * v, t + 0.09); fl.frequency.exponentialRampToValueAtTime(900 + 600 * v, t + Math.max(0.2, d));
    for (const dt of [-7, 0, 6]) E.osc('sawtooth', f, t, d, fl, { vol: 0.07 * v, a: 0.045, d: 0.15, s: 0.85, r: 0.18, detune: dt, vib: 10, vibDelay: 0.35, slide: 0.97, slideT: 0.06 });
  },
  choir: (E, t, f, d, v, out) => {
    const g = E.ctx.createGain(); g.gain.value = 1; g.connect(out); const F = [[740, 5, 1], [1180, 6, 0.75], [2650, 7, 0.3]].map(([fr, q, a]) => [E.filt('bandpass', fr, q, g), a]);
    for (const dt of [-11, 9]) for (const [fl, a] of F) E.osc('sawtooth', f, t, d, fl, { vol: 0.16 * a * v, a: Math.min(0.35, d * 0.4), d: 0.3, s: 0.9, r: 0.5, detune: dt, vib: 13, vibRate: 5.2, vibDelay: 0.25 });
    setTimeout(() => { try { g.disconnect(); } catch { /* */ } }, (t - E.t + d + 2) * 1000);
  },
  timp: (E, t, f, d, v, out) => { E.osc('sine', f, t, 0.02, out, { vol: 0.5 * v, a: 0.002, d: 1.1, s: 0.02, r: 0.5, slide: 1.07, slideT: 0.07 }); E.osc('sine', f * 1.51, t, 0.02, out, { vol: 0.12 * v, d: 0.45, s: 0.02, r: 0.2 }); E.noise(t, 0.3, out, { vol: 0.1 * v, type: 'lowpass', freq: 800, q: 0.7 }); },
  // distorted electric guitar: drop-D power chords (one note in, root + fifth + octave out) and a singing lead
  gtr: (E, t, f, d, v, out) => {
    const c = E.ctx, pre = c.createGain(), ws = c.createWaveShaper(), post = c.createGain(), hp = c.createBiquadFilter(), cab = E.filt('lowpass', d < 0.12 ? 1700 : 3400, 1.1, out); hp.type = 'highpass'; hp.frequency.value = 85; hp.connect(cab);
    pre.gain.value = 7; ws.curve = distCurve(); ws.oversample = '2x'; post.gain.value = 0.085 * v; pre.connect(ws); ws.connect(post); post.connect(hp); const mute = d < 0.12;
    for (const [m, a] of [[1, 1], [1.4983, 0.8], [2, 0.55]]) for (const dt of [-7, 6]) E.osc('sawtooth', f * m, t, d, pre, { vol: 0.12 * a, a: 0.002, d: mute ? 0.07 : 0.6, s: mute ? 0.12 : 0.7, r: mute ? 0.04 : 0.12, detune: dt });
    setTimeout(() => { for (const n of [pre, ws, post, hp, cab]) try { n.disconnect(); } catch { /* */ } }, (t - E.t + d + 1.5) * 1000);
  },
  shred: (E, t, f, d, v, out) => {
    const c = E.ctx, pre = c.createGain(), ws = c.createWaveShaper(), post = c.createGain(), cab = E.filt('lowpass', 4300, 1.4, out), pk = E.filt('peaking', 1600, 1, cab); pk.gain.value = 5;
    pre.gain.value = 9; ws.curve = distCurve(); ws.oversample = '2x'; post.gain.value = 0.075 * v; pre.connect(ws); ws.connect(post); post.connect(pk);
    E.osc('sawtooth', f, t, d, pre, { vol: 0.16, a: 0.003, d: 0.4, s: 0.85, r: 0.14, vib: d > 0.3 ? 24 : 0, vibRate: 6.2, vibDelay: 0.22, slide: d > 0.3 ? 0.944 : 0.985, slideT: d > 0.3 ? 0.12 : 0.03 }); E.osc('square', f * 2, t, d, pre, { vol: 0.035, a: 0.003, d: 0.2, s: 0.6, r: 0.1 });
    setTimeout(() => { for (const n of [pre, ws, post, cab, pk]) try { n.disconnect(); } catch { /* */ } }, (t - E.t + d + 1.5) * 1000);
  },
  kazoo: (E, t, f, d, v, out) => E.osc('sawtooth', f, t, d, E.filt('bandpass', 1500, 3, out), { vol: 0.3 * v, a: 0.02, s: 0.9, r: 0.05, vib: 25, vibRate: 7, vibDelay: 0.05 }),
};

// ---- drum kits ---------------------------------------------------------------
const kick = (E, t, out, v, { f0 = 150, f1 = 42, len = 0.22, click = true } = {}) => {
  const o = E.ctx.createOscillator(), g = E.ctx.createGain();
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + 0.09);
  g.gain.setValueAtTime(0.9 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + len);
  o.connect(g); g.connect(out); o.start(t); o.stop(t + len + 0.02);
  if (click) E.noise(t, 0.012, out, { vol: 0.2 * v, type: 'highpass', freq: 2500 });
};
export const DRUMS = {
  // orchestral percussion: T taiko, k gran cassa, l low timpani, s snare, r snare roll, c crash, w cymbal swell, h rim, b big hit
  rock: {
    k: (E, t, o, v) => kick(E, t, o, v * 1.05, { f0: 130, f1: 48, len: 0.32, click: true }),
    s: (E, t, o, v) => { E.noise(t, 0.2, o, { vol: 0.34 * v, type: 'bandpass', freq: 1900, q: 0.7 }); E.osc('triangle', 190, t, 0.04, o, { vol: 0.2 * v, d: 0.09, s: 0.05, slide: 1.3, slideT: 0.03 }); E.noise(t, 0.08, o, { vol: 0.12 * v, type: 'highpass', freq: 5000 }); },
    h: (E, t, o, v) => E.noise(t, 0.04, o, { vol: 0.1 * v, type: 'highpass', freq: 8500 }),
    o: (E, t, o, v) => E.noise(t, 0.22, o, { vol: 0.1 * v, type: 'highpass', freq: 7000 }),
    c: (E, t, o, v) => { E.noise(t, 1.8, o, { vol: 0.22 * v, type: 'highpass', freq: 4500, q: 0.5 }); },
    t: (E, t, o, v) => E.osc('sine', 150, t, 0.05, o, { vol: 0.4 * v, d: 0.2, s: 0.02, slide: 1.4, slideT: 0.04 }),
    m: (E, t, o, v) => E.osc('sine', 110, t, 0.05, o, { vol: 0.42 * v, d: 0.24, s: 0.02, slide: 1.4, slideT: 0.04 }),
  },
  orch: {
    T: (E, t, o, v) => { kick(E, t, o, v * 0.95, { f0: 120, f1: 46, len: 0.65, click: false }); E.noise(t, 0.12, o, { vol: 0.22 * v, type: 'lowpass', freq: 600, q: 0.8 }); },
    k: (E, t, o, v) => kick(E, t, o, v, { f0: 95, f1: 36, len: 1.1, click: false }),
    l: (E, t, o, v) => { E.osc('sine', 73, t, 0.02, o, { vol: 0.55 * v, a: 0.002, d: 1.2, s: 0.02, r: 0.5, slide: 1.08, slideT: 0.08 }); E.noise(t, 0.35, o, { vol: 0.12 * v, type: 'lowpass', freq: 700 }); },
    s: (E, t, o, v) => { E.noise(t, 0.22, o, { vol: 0.28 * v, type: 'bandpass', freq: 2200, q: 0.6 }); E.osc('triangle', 210, t, 0.03, o, { vol: 0.12 * v, d: 0.08, s: 0.05 }); },
    r: (E, t, o, v) => { for (let i = 0; i < 6; i++) E.noise(t + i * 0.025, 0.06, o, { vol: (0.08 + i * 0.02) * v, type: 'bandpass', freq: 2400, q: 0.7 }); },
    c: (E, t, o, v) => { E.noise(t, 2.2, o, { vol: 0.24 * v, type: 'highpass', freq: 4200, q: 0.5 }); E.noise(t, 0.6, o, { vol: 0.1 * v, type: 'bandpass', freq: 7000, q: 1 }); },
    w: (E, t, o, v) => E.noise(t, 1.35, o, { vol: 0.2 * v, type: 'highpass', freq: 3000, a: 1.3 }),
    h: (E, t, o, v) => E.noise(t, 0.05, o, { vol: 0.18 * v, type: 'bandpass', freq: 3200, q: 2 }),
    b: (E, t, o, v) => { kick(E, t, o, v * 1.2, { f0: 140, f1: 32, len: 1.6, click: true }); E.noise(t, 2.6, o, { vol: 0.28 * v, type: 'highpass', freq: 3500 }); E.noise(t, 0.5, o, { vol: 0.25 * v, type: 'lowpass', freq: 400 }); },
  },
  chip: {
    k: (E, t, o, v) => { E.osc('triangle', 60, t, 0.05, o, { vol: 0.7 * v, a: 0.001, d: 0.09, s: 0.01, r: 0.02, slide: 4, slideT: 0.06 }); },
    s: (E, t, o, v) => { E.noise(t, 0.13, o, { vol: 0.34 * v, type: 'bandpass', freq: 2200, q: 0.6 }); E.osc('triangle', 190, t, 0.03, o, { vol: 0.25 * v, d: 0.05, s: 0.01, slide: 1.6, slideT: 0.04 }); },
    h: (E, t, o, v) => E.noise(t, 0.035, o, { vol: 0.14 * v, type: 'highpass', freq: 7500 }),
    o: (E, t, o, v) => E.noise(t, 0.16, o, { vol: 0.13 * v, type: 'highpass', freq: 6500 }),
    c: (E, t, o, v) => E.noise(t, 0.7, o, { vol: 0.22 * v, type: 'highpass', freq: 5000 }),
    t: (E, t, o, v) => E.osc('triangle', 180, t, 0.08, o, { vol: 0.4 * v, d: 0.12, s: 0.01, slide: 1.8, slideT: 0.1 }),
    m: (E, t, o, v) => E.osc('triangle', 130, t, 0.08, o, { vol: 0.4 * v, d: 0.12, s: 0.01, slide: 1.8, slideT: 0.1 }),
    l: (E, t, o, v) => E.osc('triangle', 90, t, 0.1, o, { vol: 0.45 * v, d: 0.14, s: 0.01, slide: 1.8, slideT: 0.12 }),
  },
  electro: {
    k: (E, t, o, v) => kick(E, t, o, v, { f0: 170, f1: 45, len: 0.26 }),
    s: (E, t, o, v) => { E.noise(t, 0.16, o, { vol: 0.36 * v, type: 'bandpass', freq: 1900, q: 0.5 }); E.osc('sine', 210, t, 0.03, o, { vol: 0.3 * v, d: 0.07, s: 0.01, slide: 1.5 }); },
    p: (E, t, o, v) => { for (const dt of [0, 0.011, 0.024]) E.noise(t + dt, 0.09, o, { vol: 0.22 * v, type: 'bandpass', freq: 1300, q: 1.2 }); },
    h: (E, t, o, v) => E.noise(t, 0.03, o, { vol: 0.13 * v, type: 'highpass', freq: 8500 }),
    o: (E, t, o, v) => E.noise(t, 0.2, o, { vol: 0.12 * v, type: 'highpass', freq: 7000 }),
    c: (E, t, o, v) => E.noise(t, 1.1, o, { vol: 0.2 * v, type: 'highpass', freq: 4200 }),
    t: (E, t, o, v) => E.osc('sine', 200, t, 0.1, o, { vol: 0.45 * v, d: 0.16, s: 0.01, slide: 1.7, slideT: 0.12 }),
    m: (E, t, o, v) => E.osc('sine', 140, t, 0.1, o, { vol: 0.45 * v, d: 0.18, s: 0.01, slide: 1.7, slideT: 0.12 }),
    l: (E, t, o, v) => E.osc('sine', 95, t, 0.12, o, { vol: 0.5 * v, d: 0.2, s: 0.01, slide: 1.7, slideT: 0.14 }),
    i: (E, t, o, v) => E.osc('triangle', 1700, t, 0.01, o, { vol: 0.2 * v, d: 0.02, s: 0.01 }),
    x: (E, t, o, v) => { E.osc('square', 3200, t, 0.006, o, { vol: 0.07 * v, d: 0.012, s: 0.01, r: 0.01 }); },
    z: (E, t, o, v) => { E.noise(t, 0.2, o, { vol: 0.3 * v, type: 'lowpass', freq: 3000, sweep: 0.1 }); }, // metal clank
    w: (E, t, o, v) => E.osc('sine', 880, t, 0.02, o, { vol: 0.25 * v, d: 0.04, s: 0.01 }),
  },
  jazz: {
    k: (E, t, o, v) => kick(E, t, o, v * 0.7, { f0: 110, f1: 48, len: 0.18, click: false }),
    s: (E, t, o, v) => { E.noise(t, 0.12, o, { vol: 0.24 * v, type: 'bandpass', freq: 2600, q: 0.5 }); E.osc('triangle', 220, t, 0.02, o, { vol: 0.14 * v, d: 0.05, s: 0.01 }); },
    b: (E, t, o, v) => E.noise(t, 0.09, o, { vol: 0.1 * v, type: 'bandpass', freq: 3800, q: 0.7, a: 0.02 }), // brush
    h: (E, t, o, v) => E.noise(t, 0.05, o, { vol: 0.11 * v, type: 'highpass', freq: 7000 }),
    o: (E, t, o, v) => E.noise(t, 0.22, o, { vol: 0.1 * v, type: 'highpass', freq: 6000 }),
    r: (E, t, o, v) => { E.noise(t, 0.3, o, { vol: 0.09 * v, type: 'bandpass', freq: 5600, q: 2.5 }); E.osc('sine', 5200, t, 0.01, o, { vol: 0.02 * v, d: 0.2, s: 0.01 }); },
    c: (E, t, o, v) => E.noise(t, 1.2, o, { vol: 0.2 * v, type: 'highpass', freq: 3800 }),
    w: (E, t, o, v) => E.osc('sine', 1100, t, 0.012, o, { vol: 0.35 * v, d: 0.03, s: 0.01 }), // woodblock
    q: (E, t, o, v) => E.osc('sine', 760, t, 0.012, o, { vol: 0.35 * v, d: 0.035, s: 0.01 }), // low woodblock
    g: (E, t, o, v) => { E.osc('square', 560, t, 0.05, o, { vol: 0.12 * v, d: 0.12, s: 0.01 }); E.osc('square', 845, t, 0.05, o, { vol: 0.1 * v, d: 0.12, s: 0.01 }); }, // cowbell
    t: (E, t, o, v) => E.osc('sine', 190, t, 0.08, o, { vol: 0.4 * v, d: 0.14, s: 0.01, slide: 1.4, slideT: 0.09 }),
    l: (E, t, o, v) => E.osc('sine', 110, t, 0.1, o, { vol: 0.45 * v, d: 0.18, s: 0.01, slide: 1.4, slideT: 0.1 }),
    y: (E, t, o, v) => { E.noise(t, 0.5, o, { vol: 0.18 * v, type: 'bandpass', freq: 900, q: 6, sweep: 4 }); }, // cartoon siren-swish
    x: (E, t, o, v) => E.osc('square', 2600, t, 0.006, o, { vol: 0.06 * v, d: 0.012, s: 0.01, r: 0.01 }),
  },
  clock: {
    k: (E, t, o, v) => kick(E, t, o, v * 0.5, { f0: 120, f1: 55, len: 0.14, click: false }),
    x: (E, t, o, v) => { E.osc('square', 2400, t, 0.004, o, { vol: 0.09 * v, d: 0.01, s: 0.01, r: 0.01 }); E.noise(t, 0.012, o, { vol: 0.06 * v, type: 'bandpass', freq: 5200, q: 3 }); }, // tick
    y: (E, t, o, v) => { E.osc('square', 1700, t, 0.004, o, { vol: 0.08 * v, d: 0.012, s: 0.01, r: 0.01 }); E.noise(t, 0.012, o, { vol: 0.05 * v, type: 'bandpass', freq: 3800, q: 3 }); }, // tock
    w: (E, t, o, v) => E.osc('sine', 1250, t, 0.01, o, { vol: 0.3 * v, d: 0.03, s: 0.01 }),
    q: (E, t, o, v) => E.osc('sine', 830, t, 0.01, o, { vol: 0.3 * v, d: 0.04, s: 0.01 }),
    s: (E, t, o, v) => E.noise(t, 0.06, o, { vol: 0.12 * v, type: 'bandpass', freq: 3200, q: 1.2 }),  // paper rustle snare
    h: (E, t, o, v) => E.noise(t, 0.025, o, { vol: 0.07 * v, type: 'highpass', freq: 8000 }),
    g: (E, t, o, v) => { E.osc('sine', 1976, t, 0.01, o, { vol: 0.12 * v, d: 0.5, s: 0.01, r: 0.3 }); E.osc('sine', 3951, t, 0.01, o, { vol: 0.04 * v, d: 0.25, s: 0.01 }); }, // triangle/glock ding
    r: (E, t, o, v) => { for (let i = 0; i < 5; i++) E.osc('square', 1500 + i * 90, t + i * 0.022, 0.004, o, { vol: 0.05 * v, d: 0.01, s: 0.01, r: 0.01 }); }, // ratchet
    c: (E, t, o, v) => E.noise(t, 0.8, o, { vol: 0.1 * v, type: 'highpass', freq: 5000 }),
    t: (E, t, o, v) => E.osc('sine', 160, t, 0.08, o, { vol: 0.35 * v, d: 0.2, s: 0.01, slide: 1.3, slideT: 0.08 }), // timpani-ish
  },
};

// ---- sequencer ---------------------------------------------------------------
function parseTokens(str) { return str.replace(/\|/g, ' ').trim().split(/\s+/); }

export class Music {
  constructor(engine) {
    this.E = engine;
    this.song = null;
    this.intensity = 1;
    this.tracks = {};
    this.timer = null;
    this.nextBarTime = 0;
    this.section = null; this.barIndex = 0; this.queued = null;
    this.onBar = null; this.onBeat = null;
    this.beatTimes = [];
    this.playing = false;
    this.songGain = null;
  }
  get barDur() { return (60 / this.song.bpm) * (this.song.beats || 4); }

  play(song, { section, intensity = 1, fade = 0.6, delay = 0.05 } = {}) {
    const E = this.E; if (!E.ctx) return;
    if (this.song === song && this.playing) { if (section) this.queue(section); this.setIntensity(intensity); return; }
    this.stop(fade);
    this.song = song; this.playing = true; this.intensity = intensity;
    const ctx = E.ctx;
    this.songGain = ctx.createGain(); this.songGain.gain.setValueAtTime(0.0001, E.t);
    this.songGain.gain.exponentialRampToValueAtTime(song.gain || 1, E.t + Math.max(0.05, fade));
    this.songGain.connect(E.musicBus);
    this.songSend = ctx.createGain(); this.songSend.gain.value = song.reverb ?? 0.15; this.songSend.connect(E.musicSend);
    this.tracks = {};
    for (const name in song.tracks) {
      const def = song.tracks[name], g = ctx.createGain(), pan = ctx.createStereoPanner();
      pan.pan.value = def.pan || 0; g.gain.value = this._layerGain(def) * (def.vol ?? 1);
      g.connect(pan); pan.connect(this.songGain);
      if (def.send) { const s = ctx.createGain(); s.gain.value = def.send; pan.connect(s); s.connect(this.songSend); }
      this.tracks[name] = { def, g };
    }
    this.section = section || song.start; this.barIndex = 0; this.queued = null;
    this.nextBarTime = E.t + delay;
    this._tick();
    this.timer = setInterval(() => this._tick(), 30);
  }
  stop(fade = 0.5) {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
    if (this.songGain) {
      const g = this.songGain, s = this.songSend, t = this.E.t;
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, fade));
      setTimeout(() => { try { g.disconnect(); s.disconnect(); } catch { /* */ } }, (fade + 2.5) * 1000);
    }
    this.songGain = null; this.playing = false; this.song = null; this.tracks = {};
  }
  _layerGain(def) {
    const lo = def.layer ?? 0, hi = def.maxLayer ?? 99;
    return this.intensity >= lo && this.intensity <= hi ? 1 : 0;
  }
  setIntensity(n, time = 0.5) {
    if (this.intensity === n) return;
    this.intensity = n;
    if (!this.playing) return;
    for (const k in this.tracks) {
      const tr = this.tracks[k];
      tr.g.gain.cancelScheduledValues(this.E.t);
      tr.g.gain.setTargetAtTime(this._layerGain(tr.def) * (tr.def.vol ?? 1), this.E.t, time / 3);
    }
  }
  // Switch section at the next bar line (or immediately on next section end).
  queue(section, { atEnd = false } = {}) { if (this.section !== section) this.queued = { section, atEnd }; }
  _tick() {
    if (!this.playing) return;
    const E = this.E;
    while (this.nextBarTime < E.t + 0.18) {
      const song = this.song;
      let bars = song.sections[this.section];
      if (this.queued && (!this.queued.atEnd || this.barIndex >= bars.length)) {
        this.section = this.queued.section; this.barIndex = 0; this.queued = null; bars = song.sections[this.section];
      }
      if (this.barIndex >= bars.length) {
        const nxt = song.next?.[this.section];
        if (nxt) { this.section = nxt; bars = song.sections[this.section]; }
        this.barIndex = 0;
      }
      this._scheduleBar(song.bars[bars[this.barIndex]], Math.max(this.nextBarTime, E.t + 0.01));
      const bt = this.nextBarTime, bd = this.barDur, beats = song.beats || 4;
      for (let b = 0; b < beats; b++) this.beatTimes.push(bt + (b * bd) / beats);
      if (this.beatTimes.length > 64) this.beatTimes.splice(0, this.beatTimes.length - 64);
      this.barIndex++;
      this.nextBarTime += bd;
    }
  }
  // 0..1 pulse that peaks on each beat — for syncing visuals to the music.
  beatPulse() {
    if (!this.playing) return 0;
    const t = this.E.t; let best = 9;
    for (const b of this.beatTimes) { const d = t - b; if (d >= 0 && d < best) best = d; }
    return Math.max(0, 1 - best * 4);
  }
  _scheduleBar(bar, t0) {
    if (!bar) return;
    const E = this.E, song = this.song, barDur = this.barDur;
    for (const name in bar) {
      const tr = this.tracks[name]; if (!tr) continue;
      const toks = parseTokens(bar[name]), n = toks.length, stepDur = barDur / n;
      const def = tr.def, swing = song.swing || 0; // fraction of an 8th note
      for (let i = 0; i < n; i++) {
        let tok = toks[i];
        if (tok === '.' || tok === '-') continue;
        let t = t0 + i * stepDur;
        if (swing) {
          if (n === 8 && i % 2 === 1) t += stepDur * swing;
          else if (n === 16 && i % 4 === 2) t += stepDur * 2 * swing;
          else if (n === 16 && i % 4 === 3) t += stepDur * swing;
        }
        let vel = 1;
        if (tok.endsWith('!')) { vel = 1.3; tok = tok.slice(0, -1); }
        else if (tok.endsWith('~')) { vel = 0.6; tok = tok.slice(0, -1); }
        if (def.kit) {
          const kit = DRUMS[def.kit];
          for (const ch of tok) kit[ch]?.(E, t, tr.g, vel * (def.vel ?? 1));
          continue;
        }
        let len = 1;
        while (i + len < n && toks[i + len] === '-') len++;
        const dur = stepDur * len * (def.gate ?? 0.92);
        const inst = INST[def.inst];
        for (const nn of tok.split('+')) {
          const m = noteToMidi(nn); if (m == null) continue;
          inst(E, t, midiToFreq(m + (def.transpose || 0)), dur, vel * (def.vel ?? 1), tr.g, def.params);
        }
      }
    }
  }
  // One-shot phrase: [{inst, notes:"C5 E5 G5", step: seconds per token, vol}]
  stinger(parts, { quantize = false } = {}) {
    const E = this.E; if (!E.ctx) return;
    let t0 = E.t + 0.02;
    if (quantize && this.playing) {
      const beat = this.barDur / (this.song.beats || 4);
      const since = (E.t - (this.nextBarTime - this.barDur * 8)) % beat;
      t0 = E.t + (beat - since) % beat + 0.01;
    }
    for (const p of parts) {
      const toks = parseTokens(p.notes), g = E.ctx.createGain(); g.gain.value = p.vol ?? 1; g.connect(E.musicBus);
      if (p.send) { const s = E.ctx.createGain(); s.gain.value = p.send; g.connect(s); s.connect(E.musicSend); }
      for (let i = 0; i < toks.length; i++) {
        const tok = toks[i]; if (tok === '.' || tok === '-') continue;
        let len = 1; while (i + len < toks.length && toks[i + len] === '-') len++;
        if (p.kit) { for (const ch of tok) DRUMS[p.kit][ch]?.(E, t0 + i * p.step, g, 1); continue; }
        for (const nn of tok.split('+')) { const m = noteToMidi(nn); if (m != null) INST[p.inst](E, t0 + i * p.step, midiToFreq(m), p.step * len * 0.95, 1, g, p.params); }
      }
      setTimeout(() => { try { g.disconnect(); } catch { /* */ } }, (toks.length * p.step + 4) * 1000);
    }
  }
}
