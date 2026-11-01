// GETAWAY! — adaptive procedural soundtrack.
// Every track is an original composition rendered live by a Web Audio sequencer with
// intensity layers (0 ambient … 4 full set-piece) that cross in on bar boundaries.
import { makeRng, clamp } from './utils.js';

const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11], major: [0, 2, 4, 5, 7, 9, 11], mixolydian: [0, 2, 4, 5, 7, 9, 10],
  phrygdom: [0, 1, 4, 5, 7, 8, 10],
};
const DRUMS = {
  four: { k: 'x...x...x...x...', s: '....x.......x...', h: '..x...x...x...x.', c: 'x.x.x.x.x.x.x.x.' },
  break: { k: 'x.....x...x.....', s: '....x..g.g..x..g', h: 'x.x.xgx.x.x.xgx.', c: 'xxxxxxxxxxxxxxxx' },
  break2: { k: 'x..x......x..x..', s: '....x.......x.g.', h: 'x.xgx.x.x.xgx.xx', c: 'x.x.x.x.x.x.x.x.' },
  dnb: { k: 'x.........x.....', s: '....x.......x...', h: 'x.xgx.xgx.xgx.xg', c: 'xxxxxxxxxxxxxxxx' },
  dnb2: { k: 'x.........xx....', s: '....x..g....x.g.', h: 'xgxgxgxgxgxgxgxg', c: 'xxxxxxxxxxxxxxxx' },
  half: { k: 'x.....x...x.....', s: '........x.......', h: 'x.x.x.x.x.x.x.x.', c: 'x...x...x...x...' },
  funk: { k: 'x..x..x...x..x..', s: '....x..g.g..x...', h: 'xxxxxxxxxxxxxxxx', c: 'x.x.x.x.x.x.x.x.' },
  march: { k: 'x.......x.......', s: 'x.gx..x.x.gx..xg', h: '....x.......x...', c: 'x...x...x...x...' },
  tick: { k: 'x.......x.......', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx', c: 'x.x.x.x.x.x.x.x.' },
};
const midiHz = (m) => 440 * Math.pow(2, (m - 69) / 12);

export const TRACKS = [
  { id: 'main', title: 'GETAWAY! (Main Theme)', bpm: 128, root: 45, scale: 'minor', prog: [0, 5, 2, 6], drums: 'break', bass: 'pulse8', arp: [0, 2, 1, 2, 3, 2, 1, 2],
    lead: [[0, 7, 3], [3, 9, 1], [4, 11, 4], [8, 9, 2], [10, 7, 2], [12, 6, 4], [16, 7, 3], [19, 11, 1], [20, 12, 4], [24, 11, 2], [26, 9, 2], [28, 7, 4]], strings: true, brass: 'x.......x.....x.', mood: 'Heroic breakbeat anthem' },
  { id: 'freeroam', title: 'Port Sol Cruise', bpm: 108, root: 50, scale: 'dorian', prog: [0, 3, 0, 4], drums: 'four', bass: 'funk', arp: [0, 1, 2, 3, 2, 1], arpRate: 8, lead: 'gen', seed: 11, pad: true, mood: 'Sun-bleached free roam groove' },
  { id: 'wrongcar', title: 'Wrong Car', bpm: 142, root: 40, scale: 'minor', prog: [0, 6, 5, 6], drums: 'break2', bass: 'roll16', reese: true, lead: [[0, 7, 2], [2, 8, 2], [4, 7, 2], [6, 4, 2], [8, 7, 6], [16, 9, 2], [18, 10, 2], [20, 9, 2], [22, 7, 2], [24, 4, 8]], strings: true, brass: 'x..x....x.......', mood: 'Mission 01 — panic and horsepower' },
  { id: 'bankroll', title: 'Bankroll', bpm: 122, root: 43, scale: 'minor', prog: [0, 3, 4, 3], drums: 'funk', bass: 'funk', brass: 'x..x..x...x.....', lead: 'gen', seed: 23, strings: true, mood: 'Mission 02 — heist funk with brass' },
  { id: 'mall', title: 'Shopping Spree', bpm: 126, root: 48, scale: 'mixolydian', prog: [0, 6, 3, 0], drums: 'four', bass: 'offbeat', arp: [0, 2, 3, 2], lead: 'gen', seed: 37, mood: 'Mission 03 — escalator disco chase' },
  { id: 'armored', title: 'Armored Delivery', bpm: 132, root: 38, scale: 'phrygian', prog: [0, 1, 0, 6], drums: 'break', bass: 'reese', reese: true, lead: 'gen', seed: 41, strings: true, mood: 'Mission 04 — industrial steel' },
  { id: 'skyline', title: 'The Skyline Job', bpm: 130, root: 48, scale: 'minor', prog: [0, 5, 3, 4], drums: 'half', bass: 'pulse8', strings: true, brass: 'x.......x.......', timpani: true, lead: 'gen', seed: 53, mood: 'Mission 05 — orchestral demolition' },
  { id: 'fivestar', title: 'Five-Star City', bpm: 174, root: 41, scale: 'minor', prog: [0, 0, 5, 6], drums: 'dnb', bass: 'reese', reese: true, arp: [0, 1, 2, 3, 2, 1, 0, 1], lead: 'gen', seed: 61, strings: true, mood: 'Mission 06 — drum & bass pursuit' },
  { id: 'desert', title: 'Desert Thunder', bpm: 116, root: 40, scale: 'phrygdom', prog: [0, 1, 0, 6], drums: 'half', bass: 'pulse8', twang: true, lead: 'gen', seed: 71, mood: 'Act II — heat-haze twang' },
  { id: 'italia', title: 'Ciao, Trouble', bpm: 138, root: 50, scale: 'harmonic', prog: [0, 3, 4, 0], drums: 'break2', bass: 'walk', mandolin: true, accordion: true, strings: true, lead: 'gen', seed: 83, mood: 'Act III — mandolins at full throttle' },
  { id: 'twominutes', title: 'Two Minutes', bpm: 150, root: 47, scale: 'minor', prog: [0, 5, 0, 6], drums: 'tick', bass: 'roll16', reese: true, ticking: true, strings: true, timpani: true, lead: 'gen', seed: 97, mood: 'Mission 16 — the clock is the enemy' },
  { id: 'whiteout', title: 'Whiteout', bpm: 100, root: 42, scale: 'minor', prog: [0, 5, 2, 4], drums: 'half', bass: 'reese', choir: true, bells: true, lead: 'gen', seed: 103, mood: 'Act IV — avalanche hymn' },
  { id: 'lastexit', title: 'Last Exit', bpm: 136, root: 45, scale: 'minor', prog: [0, 5, 6, 4], drums: 'break', bass: 'reese', reese: true, strings: true, brass: 'x.......x...x...', timpani: true, choir: true,
    lead: [[0, 7, 3], [3, 9, 1], [4, 11, 4], [8, 12, 4], [12, 11, 4], [16, 9, 3], [19, 11, 1], [20, 14, 6], [26, 12, 2], [28, 11, 4]], mood: 'Finale — everything at once' },
];

export class Music {
  constructor(audio) {
    this.audio = audio; this.track = null; this.intensity = 0; this.target = 0; this.playing = false;
    this.step = 0; this.bar = 0; this.nextTime = 0; this.timer = null; this.volume = 1;
    this.listeners = [];
  }
  init() {
    if (this.ctx || !this.audio.ready) return; const a = this.audio, ctx = this.ctx = a.ctx;
    this.out = ctx.createGain(); this.out.gain.value = 0.0;
    this.comp = ctx.createDynamicsCompressor(); this.comp.threshold.value = -14; this.comp.ratio.value = 3; this.comp.attack.value = 0.01; this.comp.release.value = 0.15;
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 256;
    this.out.connect(this.comp); this.comp.connect(this.analyser); this.analyser.connect(a.musicBus);
    this.drums = ctx.createGain(); this.drums.gain.value = 0.9; this.drums.connect(this.out);
    this.pump = ctx.createGain(); this.pump.connect(this.out); // sidechained (ducks on kick)
    this.melody = ctx.createGain(); this.melody.gain.value = 0.8; this.melody.connect(this.out);
    this.verb = ctx.createConvolver(); this.verb.buffer = a._impulse(3.4, 3.2); this.verbIn = ctx.createGain(); this.verbIn.gain.value = 0.5;
    this.verbIn.connect(this.verb); this.verb.connect(this.out);
    this.delay = ctx.createDelay(2); this.delayFb = ctx.createGain(); this.delayFb.gain.value = 0.38; this.delayLp = a._filt('lowpass', 2800);
    this.delayIn = ctx.createGain(); this.delayIn.gain.value = 0.35;
    this.delayIn.connect(this.delay); this.delay.connect(this.delayLp); this.delayLp.connect(this.delayFb); this.delayFb.connect(this.delay); this.delayLp.connect(this.out);
    this.vib = ctx.createOscillator(); this.vib.frequency.value = 5.2; this.vibG = ctx.createGain(); this.vibG.gain.value = 4; this.vib.connect(this.vibG); this.vib.start();
  }
  get t() { return this.ctx.currentTime; }
  _vib(o) { this.vibG.connect(o.detune); o.onended = () => { try { this.vibG.disconnect(o.detune); } catch (e) {} }; }
  play(id, { intensity = null, fade = 1.5 } = {}) {
    this.init(); if (!this.ctx) return;
    const tr = TRACKS.find((x) => x.id === id) || TRACKS[0];
    if (this.track === tr && this.playing) { if (intensity !== null) this.setIntensity(intensity); return; }
    this.track = tr; this.rng = makeRng(tr.seed || 7); this.scale = SCALES[tr.scale] || SCALES.minor;
    this.genLead = tr.lead === 'gen' ? this._genMotif(tr) : null;
    this.delay.delayTime.value = (60 / tr.bpm) * 0.75;
    if (intensity !== null) { this.intensity = this.target = intensity; }
    this.step = 0; this.bar = 0; this.nextTime = this.t + 0.12; this.playing = true;
    this.out.gain.cancelScheduledValues(this.t); this.out.gain.setTargetAtTime(this.volume * 0.85, this.t, fade / 3);
    if (!this.timer) this.timer = setInterval(() => this._tick(), 25);
    for (const l of this.listeners) l(tr);
  }
  stop(fade = 1.5) { if (!this.ctx) return; this.out.gain.setTargetAtTime(0, this.t, fade / 3); this.playing = false; setTimeout(() => { if (!this.playing && this.timer) { clearInterval(this.timer); this.timer = null; } }, fade * 1000 + 100); }
  setIntensity(v) { this.target = clamp(Math.round(v), 0, 4); }
  duck(amount = 0.5, dur = 1) { if (!this.ctx) return; const t = this.t; this.out.gain.cancelScheduledValues(t); this.out.gain.setTargetAtTime(this.volume * 0.85 * amount, t, 0.05); this.out.gain.setTargetAtTime(this.volume * 0.85, t + dur, 0.4); }

  _tick() {
    if (!this.playing || !this.track) return;
    const spb = 60 / this.track.bpm / 4; // seconds per 16th
    if (!(spb > 0.01)) return;
    if (this.nextTime < this.t - 0.1) this.nextTime = this.t + 0.02; // after a hitch: resume cleanly instead of firing every missed note at once
    while (this.nextTime < this.t + 0.15) {
      if (this.step % 16 === 0) this._bar(this.nextTime);
      this._step(this.nextTime, this.step % 16, spb);
      this.nextTime += spb * ((this.step % 2 === 0) ? (1 + (this.track.swing || 0)) : (1 - (this.track.swing || 0)));
      this.step++;
    }
  }
  _bar(t) {
    const prev = this.intensity;
    if (this.target !== this.intensity) {
      this.intensity = this.target;
      if (this.intensity >= 3 && prev < 3) this._impact(t);
    }
    this.bar = Math.floor(this.step / 16);
    const tr = this.track, I = this.intensity, chord = this._chord(this.bar);
    const barLen = (60 / tr.bpm) * 4;
    // sustained layers
    if (tr.pad !== false) this._pad(t, chord, barLen, I >= 3 ? 0.10 : 0.16);
    if (tr.choir && I >= 1) this._choir(t, chord, barLen);
    if (tr.strings && I >= 3) this._strings(t, chord, barLen, I >= 4 ? 0.12 : 0.07);
    if (tr.accordion && I >= 1 && I <= 3) this._accordion(t, chord, barLen);
    if (tr.bass === 'reese' && I >= 1) this._reese(t, chord[0] - 12, barLen * 0.98, 0.22);
    else if (tr.reese && I >= 3) this._reese(t, chord[0] - 12, barLen * 0.98, 0.14);
    if (I >= 4 && this.bar % 4 === 0) this._crash(t, 0.35);
    if (tr.timpani && I >= 3 && this.bar % 2 === 0) this._timpani(t, chord[0] - 24, 0.6);
    if (I >= 2 && this.bar % 8 === 7 && this.target >= 2) this._riser(t, barLen);
    for (const l of this.listeners) l(this.track, this.bar, this.intensity);
  }
  _step(t, s, spb) {
    const tr = this.track, I = this.intensity, bar = this.bar;
    const pat = DRUMS[tr.drums] || DRUMS.four;
    const fill = I >= 2 && bar % 4 === 3 && s >= 12;
    const vel = (p, i) => { const c = p[i]; return c === 'x' ? 1 : c === 'o' ? 0.6 : c === 'g' ? 0.3 : 0; };
    // drums
    if (I >= 1) {
      const halfTime = I === 1;
      let k = vel(pat.k, s); if (halfTime && s % 8 !== 0) k = 0;
      if (k) this._kick(t, k * (I >= 2 ? 1 : 0.7));
      if (I >= 2) { const sn = fill ? (s % 2 === 0 ? 0.8 : 0.4) : vel(pat.s, s); if (sn) this._snare(t, sn); }
      const hv = vel(I >= 3 ? pat.c : pat.h, s); if (hv) this._hat(t, hv * (I >= 3 ? 0.5 : 0.4), I >= 2 && s % 8 === 6 && pat !== DRUMS.dnb);
      if (I >= 3 && s === 0 && bar % 2 === 0) this._clapAccent(t);
      if (fill && I >= 4 && s % 2 === 0) this._tom(t, 50 - (s - 12) * 2, 0.6);
    }
    if (tr.ticking && I >= 0 && s % 4 === 0) this._tick2(t, s === 0 ? 1 : 0.5);
    const chord = this._chord(bar);
    // bass
    if (I >= 1 && tr.bass !== 'reese') this._bassStep(t, s, chord, spb, I);
    // arpeggio / plucks
    if (tr.arp && I >= 2) {
      const rate = tr.arpRate === 8 ? 2 : 1; if (s % rate === 0) {
        const idx = tr.arp[(s / rate) % tr.arp.length]; const n = this._tone(chord, idx) + 12;
        this._pluck(t, n, spb * rate * 0.9, I >= 3 ? 0.13 : 0.1);
      }
    }
    if (tr.mandolin && I >= 1 && s % 4 === 0) { const n = this._tone(chord, [0, 2, 1, 2][s / 4]) + 24; this._mandolin(t, n, spb * 3.6, 0.06); }
    if (tr.twang && I >= 1 && (s === 0 || s === 6 || s === 10)) this._twang(t, chord[0] + 12 + (s === 10 ? 7 : 0), spb * 5, 0.14);
    if (tr.bells && s % 8 === 0 && I <= 3) this._bell(t, this._tone(chord, s === 0 ? 2 : 1) + 24, 0.05);
    // brass stabs
    if (tr.brass && I >= 4) { const b = tr.brass[s]; if (b === 'x') this._brass(t, chord, spb * 2.5, 0.12); }
    // lead melody (2-bar phrases)
    if (I >= 3) {
      const motif = this.genLead || tr.lead; if (Array.isArray(motif)) {
        const ps = (bar % 2) * 16 + s;
        for (const [st, deg, len] of motif) if (st === ps) this._lead(t, this._deg(deg) + 12, len * spb * 0.95, 0.11);
      }
    }
  }
  _bassStep(t, s, chord, spb, I) {
    const tr = this.track, r = chord[0] - 12; let n = null, d = spb * 0.9, v = 0.5;
    switch (tr.bass) {
      case 'pulse8': if (s % 2 === 0) { n = r + (s === 14 && I >= 3 ? 12 : 0); d = spb * 1.6; } break;
      case 'roll16': n = r + ((s % 8 === 6) ? 12 : 0); v = s % 4 === 0 ? 0.6 : 0.35; d = spb * 0.8; break;
      case 'offbeat': if (s % 4 === 2) { n = r; d = spb * 1.8; } break;
      case 'funk': { const m = { 0: 0, 3: 0, 6: 12, 8: 7, 10: 0, 11: 10, 14: 12 }; if (m[s] !== undefined) { n = r + m[s]; d = spb * (s === 0 ? 2.5 : 1.2); v = s === 0 ? 0.6 : 0.45; } break; }
      case 'walk': if (s % 4 === 0) { n = this._tone(chord, [0, 1, 2, 1][s / 4]) - 12; d = spb * 3.5; } break;
    }
    if (n !== null) this._bass(t, n, d, v * (I >= 2 ? 1 : 0.8));
  }
  // ---- harmony helpers ----
  _deg(d) { const sc = this.scale; const o = Math.floor(d / 7); const i = ((d % 7) + 7) % 7; return this.track.root + 12 + sc[i] + 12 * o; }
  _chord(bar) { const tr = this.track; const d = tr.prog[bar % tr.prog.length]; return [this._deg(d), this._deg(d + 2), this._deg(d + 4), this._deg(d + 6)]; }
  _tone(chord, idx) { return idx >= 3 ? chord[0] + 12 : chord[idx]; }
  _genMotif(tr) {
    const r = this.rng; const rhythms = [[0, 2, 4, 6, 8, 12], [0, 3, 6, 8, 10, 14], [0, 4, 6, 10, 12], [0, 2, 3, 6, 8, 11, 14], [0, 6, 8, 12, 14]];
    const out = []; let deg = 7 + r.int(0, 4);
    for (let half = 0; half < 2; half++) {
      const rh = r.pick(rhythms);
      rh.forEach((st, i) => { const nx = rh[i + 1] ?? 16; deg = clamp(deg + r.pick([-2, -1, -1, 1, 1, 2, 3, -3, 0]), 5, 13); out.push([half * 16 + st, deg, Math.max(1, nx - st)]); });
    }
    out[out.length - 1][1] = 7; return out;
  }
  // ---- instruments ----
  _env(p, t, a, peak, d) { p.setValueAtTime(0.0001, t); p.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); p.exponentialRampToValueAtTime(0.0001, t + a + d); }
  _kick(t, v) {
    const c = this.ctx; const o = c.createOscillator(); o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.11);
    const g = c.createGain(); this._env(g.gain, t, 0.002, 0.95 * v, 0.34); o.connect(g); g.connect(this.drums); o.start(t); o.stop(t + 0.42);
    const cl = c.createOscillator(); cl.type = 'square'; cl.frequency.value = 1400; const cg = c.createGain(); this._env(cg.gain, t, 0.001, 0.12 * v, 0.008); cl.connect(cg); cg.connect(this.drums); cl.start(t); cl.stop(t + 0.02);
    // sidechain pump
    const pg = this.pump.gain; pg.cancelScheduledValues(t); pg.setValueAtTime(0.35, t); pg.linearRampToValueAtTime(1, t + 0.22);
  }
  _snare(t, v) {
    const c = this.ctx, a = this.audio; const n = c.createBufferSource(); n.buffer = a.noiseW; const f = a._filt('bandpass', 1900, 0.7); const g = c.createGain(); this._env(g.gain, t, 0.001, 0.55 * v, 0.17);
    n.connect(f); f.connect(g); g.connect(this.drums); const s = c.createGain(); s.gain.value = 0.25; g.connect(s); s.connect(this.verbIn); n.start(t, Math.random()); n.stop(t + 0.25);
    const o = c.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.08); const og = c.createGain(); this._env(og.gain, t, 0.001, 0.35 * v, 0.09); o.connect(og); og.connect(this.drums); o.start(t); o.stop(t + 0.15);
  }
  _clapAccent(t) { const c = this.ctx, a = this.audio; for (let i = 0; i < 3; i++) { const tt = t + i * 0.011; const n = c.createBufferSource(); n.buffer = a.noiseW; const f = a._filt('bandpass', 1300, 1.2); const g = c.createGain(); this._env(g.gain, tt, 0.001, 0.22, i === 2 ? 0.14 : 0.01); n.connect(f); f.connect(g); g.connect(this.drums); g.connect(this.verbIn); n.start(tt, Math.random()); n.stop(tt + 0.2); } }
  _hat(t, v, open) {
    const c = this.ctx, a = this.audio; const n = c.createBufferSource(); n.buffer = a.noiseW; const f = a._filt('highpass', 7500, 0.8); const g = c.createGain(); this._env(g.gain, t, 0.001, 0.22 * v, open ? 0.28 : 0.035);
    n.connect(f); f.connect(g); g.connect(this.drums); n.start(t, Math.random()); n.stop(t + (open ? 0.35 : 0.06));
  }
  _crash(t, v) { const c = this.ctx, a = this.audio; const n = c.createBufferSource(); n.buffer = a.noiseW; const f = a._filt('highpass', 4500); const g = c.createGain(); this._env(g.gain, t, 0.002, v, 1.9); n.connect(f); f.connect(g); g.connect(this.drums); g.connect(this.verbIn); n.start(t, Math.random()); n.stop(t + 2); }
  _tom(t, m, v) { const c = this.ctx; const o = c.createOscillator(); const f = midiHz(m); o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08); const g = c.createGain(); this._env(g.gain, t, 0.002, 0.5 * v, 0.3); o.connect(g); g.connect(this.drums); g.connect(this.verbIn); o.start(t); o.stop(t + 0.4); }
  _timpani(t, m, v) { const c = this.ctx; const f = midiHz(m); [1, 1.5, 1.98].forEach((mul, i) => { const o = c.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.setValueAtTime(f * mul * 1.03, t); o.frequency.exponentialRampToValueAtTime(f * mul, t + 0.15); const g = c.createGain(); this._env(g.gain, t, 0.004, (0.5 * v) / (i + 1), 1.4); o.connect(g); g.connect(this.drums); g.connect(this.verbIn); o.start(t); o.stop(t + 1.6); }); }
  _tick2(t, v) { const c = this.ctx; const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 3800; const g = c.createGain(); this._env(g.gain, t, 0.001, 0.07 * v, 0.02); o.connect(g); g.connect(this.drums); o.start(t); o.stop(t + 0.04); }
  _bass(t, m, d, v) {
    const c = this.ctx, a = this.audio; const f = midiHz(m);
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = f / 2;
    const lp = a._filt('lowpass', 300, 6); lp.frequency.setValueAtTime(220, t); lp.frequency.exponentialRampToValueAtTime(900 + 1500 * v, t + 0.015); lp.frequency.exponentialRampToValueAtTime(260, t + Math.max(0.06, d));
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.42 * v, t + 0.006); g.gain.setValueAtTime(0.42 * v, t + d * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.03);
    const g2 = c.createGain(); g2.gain.value = 0.5; o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(this.pump); o.start(t); o2.start(t); o.stop(t + d + 0.05); o2.stop(t + d + 0.05);
  }
  _reese(t, m, d, v) {
    const c = this.ctx, a = this.audio; const f = midiHz(m); const lp = a._filt('lowpass', 500, 3);
    const lfo = c.createOscillator(); lfo.frequency.value = this.track.bpm / 60; const lg = c.createGain(); lg.gain.value = 250; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t); lfo.stop(t + d + 0.1);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.04); g.gain.setValueAtTime(v, t + d - 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    [-9, 9].forEach((cents) => { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = cents; o.connect(lp); o.start(t); o.stop(t + d + 0.05); });
    const sub = c.createOscillator(); sub.frequency.value = f / 2; const sg = c.createGain(); sg.gain.value = 0.6; sub.connect(sg); sg.connect(g); sub.start(t); sub.stop(t + d + 0.05);
    lp.connect(g); g.connect(this.pump);
  }
  _pad(t, chord, d, v) {
    const c = this.ctx, a = this.audio; const lp = a._filt('lowpass', 1300, 0.7); const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + d * 0.25); g.gain.setValueAtTime(v, t + d * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + d * 1.15);
    lp.connect(g); g.connect(this.pump); const s = c.createGain(); s.gain.value = 0.6; g.connect(s); s.connect(this.verbIn);
    for (const m of chord.slice(0, 3)) for (const dt of [-7, 7]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midiHz(m); o.detune.value = dt; const og = c.createGain(); og.gain.value = 0.18; o.connect(og); og.connect(lp); o.start(t); o.stop(t + d * 1.2); }
  }
  _strings(t, chord, d, v) {
    const c = this.ctx, a = this.audio; const lp = a._filt('lowpass', 2600, 0.5); const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.25); g.gain.setValueAtTime(v, t + d * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + d * 1.1);
    lp.connect(g); g.connect(this.melody); const s = c.createGain(); s.gain.value = 0.9; g.connect(s); s.connect(this.verbIn);
    const notes = [chord[0], chord[1], chord[2], chord[0] + 12, chord[2] + 12];
    for (const m of notes) for (const dt of [-11, 0, 11]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midiHz(m); o.detune.value = dt; this._vib(o); const og = c.createGain(); og.gain.value = 0.07; o.connect(og); og.connect(lp); o.start(t); o.stop(t + d * 1.15); }
  }
  _choir(t, chord, d) {
    const c = this.ctx, a = this.audio; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + d * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + d * 1.1);
    const f1 = a._filt('bandpass', 700, 5), f2 = a._filt('bandpass', 1150, 6); f1.connect(g); f2.connect(g); g.connect(this.melody); g.connect(this.verbIn);
    for (const m of [chord[0], chord[1], chord[2]]) for (const dt of [-6, 6]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midiHz(m); o.detune.value = dt; this._vib(o); o.connect(f1); o.connect(f2); o.start(t); o.stop(t + d * 1.15); }
  }
  _accordion(t, chord, d) {
    const c = this.ctx, a = this.audio; const bp = a._filt('bandpass', 1500, 0.8); const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.05); g.gain.setValueAtTime(0.06, t + d * 0.45); g.gain.exponentialRampToValueAtTime(0.0001, t + d * 0.5);
    const trem = c.createOscillator(); trem.frequency.value = 6; const tg = c.createGain(); tg.gain.value = 0.02; trem.connect(tg); tg.connect(g.gain); trem.start(t); trem.stop(t + d);
    bp.connect(g); g.connect(this.melody);
    for (const m of chord.slice(0, 3)) for (const [type, dt] of [['square', -4], ['sawtooth', 5]]) { const o = c.createOscillator(); o.type = type; o.frequency.value = midiHz(m); o.detune.value = dt; o.connect(bp); o.start(t); o.stop(t + d * 0.55); }
  }
  _pluck(t, m, d, v) {
    const c = this.ctx, a = this.audio; const o = c.createOscillator(); o.type = 'square'; o.frequency.value = midiHz(m);
    const lp = a._filt('lowpass', 3000, 4); lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.18);
    const g = c.createGain(); this._env(g.gain, t, 0.002, v, Math.min(0.3, d + 0.1)); o.connect(lp); lp.connect(g); g.connect(this.melody); g.connect(this.delayIn); o.start(t); o.stop(t + 0.4);
  }
  _mandolin(t, m, d, v) { // tremolo-picked
    const c = this.ctx, a = this.audio; const spb32 = 60 / this.track.bpm / 8; const f = midiHz(m);
    for (let tt = t; tt < t + d; tt += spb32) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const lp = a._filt('lowpass', 3500, 2); const g = c.createGain(); this._env(g.gain, tt, 0.001, v * (0.7 + 0.3 * Math.random()), 0.07); o.connect(lp); lp.connect(g); g.connect(this.melody); o.start(tt); o.stop(tt + 0.1); }
  }
  _twang(t, m, d, v) {
    const c = this.ctx, a = this.audio; const f = midiHz(m); const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.94, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    this._vib(o); const lp = a._filt('lowpass', 2200, 3); const g = c.createGain(); this._env(g.gain, t, 0.003, v, d); o.connect(lp); lp.connect(g); g.connect(this.melody); g.connect(this.delayIn); g.connect(this.verbIn); o.start(t); o.stop(t + d + 0.1);
  }
  _bell(t, m, v) { const c = this.ctx; const f = midiHz(m); [1, 2.76, 5.4].forEach((mul, i) => { const o = c.createOscillator(); o.frequency.value = f * mul; const g = c.createGain(); this._env(g.gain, t, 0.002, v / (i + 1), 1.6 / (i + 1)); o.connect(g); g.connect(this.melody); g.connect(this.verbIn); o.start(t); o.stop(t + 2); }); }
  _brass(t, chord, d, v) {
    const c = this.ctx, a = this.audio; const lp = a._filt('lowpass', 400, 2); lp.frequency.setValueAtTime(350, t); lp.frequency.exponentialRampToValueAtTime(3200, t + 0.05); lp.frequency.exponentialRampToValueAtTime(1100, t + d);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.03); g.gain.setValueAtTime(v, t + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    lp.connect(g); g.connect(this.melody); const s = c.createGain(); s.gain.value = 0.6; g.connect(s); s.connect(this.verbIn);
    for (const m of [chord[0] - 12, chord[0], chord[1], chord[2]]) for (const dt of [-8, 8]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midiHz(m); o.detune.setValueAtTime(dt - 40, t); o.detune.linearRampToValueAtTime(dt, t + 0.06); const og = c.createGain(); og.gain.value = 0.1; o.connect(og); og.connect(lp); o.start(t); o.stop(t + d + 0.05); }
  }
  _lead(t, m, d, v) {
    const c = this.ctx, a = this.audio; const lp = a._filt('lowpass', 2000, 3); lp.frequency.setValueAtTime(1200, t); lp.frequency.exponentialRampToValueAtTime(4200, t + 0.04); lp.frequency.exponentialRampToValueAtTime(1800, t + d);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.setValueAtTime(v * 0.85, t + Math.max(0.02, d - 0.03)); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.08);
    lp.connect(g); g.connect(this.melody); g.connect(this.delayIn); const s = c.createGain(); s.gain.value = 0.4; g.connect(s); s.connect(this.verbIn);
    for (const dt of [-12, 0, 12]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = midiHz(m); o.detune.value = dt; this._vib(o); o.connect(lp); o.start(t); o.stop(t + d + 0.1); }
  }
  _riser(t, d) {
    const c = this.ctx, a = this.audio; const n = c.createBufferSource(); n.buffer = a.noiseW; const bp = a._filt('bandpass', 400, 2); bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(7000, t + d);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + d * 0.95); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    n.connect(bp); bp.connect(g); g.connect(this.out); g.connect(this.verbIn); n.start(t, Math.random()); n.stop(t + d);
  }
  _impact(t) {
    const c = this.ctx; const o = c.createOscillator(); o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(30, t + 1); const g = c.createGain(); this._env(g.gain, t, 0.005, 0.7, 1.2); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 1.3);
    this._crash(t, 0.4);
  }
  // ---- stingers ----
  stinger(kind) {
    this.init(); if (!this.ctx) return; const t = this.t + 0.05; const spb = 0.42;
    const root = this.track ? this.track.root + 12 : 57;
    const maj = (r) => [r, r + 4, r + 7, r + 12];
    if (kind === 'escape') {
      this._crash(t, 0.4); this._timpani(t, root - 12, 0.8);
      this._brass(t, maj(root + 3), spb * 1.2, 0.14); this._brass(t + spb * 1.5, maj(root + 5), spb * 1.2, 0.14); this._brass(t + spb * 3, maj(root + 7), spb * 3.5, 0.16);
      this._strings(t + spb * 3, maj(root + 7), spb * 4, 0.1);
    } else if (kind === 'complete') {
      this._crash(t, 0.5); [0, 0.25, 0.5, 0.75].forEach((x) => this._timpani(t + x, root - 12, 0.6));
      this._brass(t, maj(root), spb * 1.5, 0.15); this._brass(t + spb * 2, maj(root + 5), spb * 1.5, 0.15); this._brass(t + spb * 4, maj(root + 7), spb * 1.5, 0.15); this._brass(t + spb * 6, maj(root + 12), spb * 6, 0.17);
      this._strings(t + spb * 6, maj(root + 12), spb * 7, 0.12); this._crash(t + spb * 6, 0.5);
    } else if (kind === 'fail') {
      this._impact(t); this._brass(t, [root - 12, root - 9, root - 5], spb * 2, 0.12); this._brass(t + spb * 2, [root - 13, root - 10, root - 6], spb * 4, 0.12);
    } else if (kind === 'heat') { this._tom(t, 45, 0.7); this._tom(t + 0.12, 41, 0.7); }
    else if (kind === 'objective') { this._bell(t, root + 19, 0.06); this._bell(t + 0.12, root + 24, 0.06); }
    else if (kind === 'boom') this._impact(t);
  }
  level() { if (!this.analyser) return 0; const d = this._fd || (this._fd = new Uint8Array(this.analyser.frequencyBinCount)); this.analyser.getByteFrequencyData(d); let s = 0; for (let i = 0; i < 24; i++) s += d[i]; return s / (24 * 255); }
  spectrum() { if (!this.analyser) return null; const d = this._fd || (this._fd = new Uint8Array(this.analyser.frequencyBinCount)); this.analyser.getByteFrequencyData(d); return d; }
}
