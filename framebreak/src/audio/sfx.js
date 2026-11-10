// Procedural sound effects, grouped by medium so each reality has its own
// sonic vocabulary. Usage: sfx.play('px.hit', { pitch: 1.1, vol: 0.8, pan: -0.3 })
import { clamp } from '../core/util.js';

export class Sfx {
  constructor(engine) { this.E = engine; this.last = {}; }
  play(name, o = {}) {
    const E = this.E; if (!E.ctx || E.ctx.state !== 'running') return;
    const def = SOUNDS[name]; if (!def) return;
    // throttle identical sounds fired in the same few ms (prevents phasing blasts)
    const t = E.t; if (this.last[name] && t - this.last[name] < (def.gap ?? 0.03)) return; this.last[name] = t;
    const g = E.ctx.createGain(); g.gain.value = (o.vol ?? 1) * (def.vol ?? 1);
    let out = g;
    if (o.pan) { const p = E.ctx.createStereoPanner(); p.pan.value = clamp(o.pan, -1, 1); g.connect(p); p.connect(E.sfxBus); if (def.send) { const s = E.ctx.createGain(); s.gain.value = def.send; p.connect(s); s.connect(E.sfxSend); } }
    else { g.connect(E.sfxBus); if (def.send) { const s = E.ctx.createGain(); s.gain.value = def.send; g.connect(s); s.connect(E.sfxSend); } }
    const pitch = (o.pitch ?? 1) * (def.rand ? 1 + (Math.random() * 2 - 1) * def.rand : 1);
    def.fn(E, t + 0.001, out, pitch, o);
    setTimeout(() => { try { g.disconnect(); } catch { /* */ } }, (def.len ?? 1.5) * 1000 + 600);
  }
}

const sq = (E, t, o, f, d, vol, opt = {}) => E.osc(opt.wave || 'p0.5', f, t, d, o, { vol, a: 0.001, d: d, s: 0.3, r: 0.02, ...opt });
const sweep = (E, t, o, f0, f1, d, vol, wave = 'p0.5') => {
  const { o: osc } = E.osc(wave, f0, t, d, o, { vol, a: 0.001, d, s: 0.4, r: 0.02 });
  osc.frequency.setValueAtTime(f0, t); osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + d);
};

const SOUNDS = {
  // ---- UI ----
  'ui.move': { vol: 0.5, fn: (E, t, o, p) => sq(E, t, o, 660 * p, 0.03, 0.12, { wave: 'p0.25' }) },
  'ui.ok': { vol: 0.6, fn: (E, t, o, p) => { sq(E, t, o, 660 * p, 0.05, 0.12); sq(E, t + 0.06, o, 990 * p, 0.09, 0.12); } },
  'ui.back': { vol: 0.5, fn: (E, t, o, p) => { sq(E, t, o, 520 * p, 0.05, 0.1); sq(E, t + 0.05, o, 390 * p, 0.08, 0.1); } },
  'ui.talk': { vol: 0.35, gap: 0.045, rand: 0.08, fn: (E, t, o, p) => sq(E, t, o, 420 * p, 0.025, 0.1, { wave: 'p0.25' }) },

  // ---- PIXEL (16-bit) ----
  'px.jump': { rand: 0.03, fn: (E, t, o, p) => sweep(E, t, o, 280 * p, 620 * p, 0.11, 0.13, 'p0.25') },
  'px.djump': { fn: (E, t, o, p) => { sweep(E, t, o, 420 * p, 900 * p, 0.1, 0.12, 'p0.125'); sweep(E, t + 0.03, o, 640 * p, 1300 * p, 0.09, 0.07, 'p0.5'); } },
  'px.land': { vol: 0.6, fn: (E, t, o) => E.noise(t, 0.05, o, { vol: 0.2, type: 'lowpass', freq: 900 }) },
  'px.step': { vol: 0.25, gap: 0.08, rand: 0.1, fn: (E, t, o, p) => E.noise(t, 0.02, o, { vol: 0.2, type: 'bandpass', freq: 1800 * p, q: 2 }) },
  'px.dash': { fn: (E, t, o) => { E.noise(t, 0.16, o, { vol: 0.22, type: 'bandpass', freq: 900, q: 1, sweep: 5 }); sweep(E, t, o, 200, 90, 0.12, 0.1, 'triangle'); } },
  'px.slide': { fn: (E, t, o) => E.noise(t, 0.22, o, { vol: 0.16, type: 'bandpass', freq: 2600, q: 0.8, sweep: 0.4 }) },
  'px.wall': { vol: 0.5, fn: (E, t, o) => E.noise(t, 0.04, o, { vol: 0.2, type: 'bandpass', freq: 1200, q: 2 }) },
  'px.swing': { rand: 0.08, fn: (E, t, o, p) => E.noise(t, 0.09, o, { vol: 0.2, type: 'bandpass', freq: 2400 * p, q: 1.2, sweep: 0.35 }) },
  'px.hit': { rand: 0.07, gap: 0.02, fn: (E, t, o, p) => { E.noise(t, 0.07, o, { vol: 0.34, type: 'lowpass', freq: 3200 * p, sweep: 0.2 }); sweep(E, t, o, 320 * p, 110 * p, 0.07, 0.2, 'p0.5'); } },
  'px.hitbig': { fn: (E, t, o, p) => { E.noise(t, 0.2, o, { vol: 0.42, type: 'lowpass', freq: 2600, sweep: 0.1 }); sweep(E, t, o, 240 * p, 50, 0.2, 0.3, 'p0.5'); sweep(E, t, o, 120, 40, 0.18, 0.3, 'triangle'); } },
  'px.launch': { fn: (E, t, o) => { sweep(E, t, o, 200, 1100, 0.16, 0.16, 'p0.25'); E.noise(t, 0.1, o, { vol: 0.2, type: 'highpass', freq: 3000 }); } },
  'px.slam': { fn: (E, t, o) => { E.noise(t, 0.28, o, { vol: 0.5, type: 'lowpass', freq: 1400, sweep: 0.1 }); sweep(E, t, o, 160, 35, 0.25, 0.4, 'triangle'); } },
  'px.shot': { rand: 0.04, fn: (E, t, o, p) => { sweep(E, t, o, 1500 * p, 340 * p, 0.1, 0.14, 'p0.125'); E.noise(t, 0.03, o, { vol: 0.12, type: 'highpass', freq: 5000 }); } },
  'px.charge': { fn: (E, t, o) => { sweep(E, t, o, 500, 1900, 0.2, 0.16, 'p0.25'); sweep(E, t + 0.05, o, 1100, 300, 0.25, 0.14, 'p0.125'); E.noise(t, 0.2, o, { vol: 0.2, type: 'highpass', freq: 2500 }); } },
  'px.hurt': { fn: (E, t, o) => { sweep(E, t, o, 520, 130, 0.22, 0.2, 'p0.5'); E.noise(t, 0.12, o, { vol: 0.22, type: 'lowpass', freq: 2000 }); } },
  'px.die': { len: 2, fn: (E, t, o) => { for (let i = 0; i < 6; i++) sweep(E, t + i * 0.09, o, 700 - i * 90, 200 - i * 20, 0.09, 0.16, 'p0.25'); E.noise(t + 0.5, 0.5, o, { vol: 0.25, type: 'lowpass', freq: 1800, sweep: 0.1 }); } },
  'px.explode': { rand: 0.1, fn: (E, t, o, p) => { E.noise(t, 0.4, o, { vol: 0.5, type: 'lowpass', freq: 2400 * p, sweep: 0.06 }); sweep(E, t, o, 180 * p, 30, 0.35, 0.3, 'triangle'); } },
  'px.clank': { rand: 0.1, fn: (E, t, o, p) => { sq(E, t, o, 190 * p, 0.04, 0.15); sq(E, t, o, 287 * p, 0.05, 0.1, { wave: 'p0.25' }); E.noise(t, 0.05, o, { vol: 0.2, type: 'bandpass', freq: 3200, q: 3 }); } },
  'px.guard': { fn: (E, t, o) => { sq(E, t, o, 1400, 0.03, 0.12, { wave: 'p0.125' }); sq(E, t + 0.02, o, 2100, 0.05, 0.1, { wave: 'p0.125' }); } },
  'px.pickup': { fn: (E, t, o, p) => { sq(E, t, o, 880 * p, 0.05, 0.12, { wave: 'p0.25' }); sq(E, t + 0.05, o, 1320 * p, 0.05, 0.12, { wave: 'p0.25' }); sq(E, t + 0.1, o, 1760 * p, 0.1, 0.12, { wave: 'p0.25' }); } },
  'px.checkpoint': { fn: (E, t, o) => { [523, 659, 784, 1047].forEach((f, i) => sq(E, t + i * 0.07, o, f, 0.1, 0.12, { wave: 'p0.25' })); } },
  'px.crumble': { rand: 0.15, fn: (E, t, o, p) => { E.noise(t, 0.25, o, { vol: 0.28, type: 'lowpass', freq: 1300 * p, sweep: 0.3 }); sq(E, t, o, 90, 0.08, 0.15, { wave: 'triangle' }); } },
  'px.alarm': { fn: (E, t, o) => { sweep(E, t, o, 600, 900, 0.18, 0.1, 'p0.5'); sweep(E, t + 0.2, o, 600, 900, 0.18, 0.1, 'p0.5'); } },
  'px.laser': { len: 1.2, fn: (E, t, o) => { sweep(E, t, o, 2200, 500, 0.6, 0.14, 'sawtooth'); E.noise(t, 0.6, o, { vol: 0.14, type: 'bandpass', freq: 3000, q: 4 }); } },
  'px.telegraph': { fn: (E, t, o, p) => { sq(E, t, o, 1200 * p, 0.04, 0.1, { wave: 'p0.125' }); sq(E, t + 0.08, o, 1200 * p, 0.04, 0.1, { wave: 'p0.125' }); } },
  'px.train': { len: 0.6, gap: 0.2, fn: (E, t, o) => { E.noise(t, 0.08, o, { vol: 0.2, type: 'lowpass', freq: 500 }); E.noise(t + 0.12, 0.08, o, { vol: 0.16, type: 'lowpass', freq: 420 }); } },
  'px.horn': { len: 1.6, fn: (E, t, o) => { for (const f of [233, 277, 349]) E.osc('sawtooth', f, t, 0.9, E.filt('lowpass', 1300, 1, o), { vol: 0.09, a: 0.03, s: 0.9, r: 0.2 }); } },
  'px.bossroar': { len: 2, send: 0.4, fn: (E, t, o) => { sweep(E, t, o, 130, 45, 1.1, 0.3, 'sawtooth'); E.noise(t, 1.1, o, { vol: 0.35, type: 'bandpass', freq: 500, q: 1.5, sweep: 0.4 }); sweep(E, t, o, 65, 30, 1.1, 0.4, 'triangle'); } },
  'px.tear': { len: 1.5, fn: (E, t, o) => { for (let i = 0; i < 10; i++) sq(E, t + i * 0.035, o, 200 + Math.random() * 2400, 0.03, 0.11, { wave: 'p0.125' }); E.noise(t, 0.5, o, { vol: 0.3, type: 'bandpass', freq: 800, q: 0.7, sweep: 6 }); } },
  'px.glitch': { rand: 0.3, gap: 0.05, fn: (E, t, o, p) => { for (let i = 0; i < 4; i++) sq(E, t + i * 0.02, o, (300 + Math.random() * 1800) * p, 0.02, 0.08, { wave: 'p0.125' }); } },

  // ---- INK (cartoon) ----
  'ink.boing': { rand: 0.08, fn: (E, t, o, p) => { const { o: osc } = E.osc('sine', 180 * p, t, 0.4, o, { vol: 0.3, a: 0.003, d: 0.4, s: 0.05, r: 0.1 }); osc.frequency.setValueAtTime(140 * p, t); osc.frequency.exponentialRampToValueAtTime(520 * p, t + 0.07); osc.frequency.exponentialRampToValueAtTime(260 * p, t + 0.4); const l = E.ctx.createOscillator(), lg = E.ctx.createGain(); l.frequency.value = 26; lg.gain.value = 180; l.connect(lg); lg.connect(osc.detune); l.start(t); l.stop(t + 0.5); } },
  'ink.jump': { rand: 0.05, fn: (E, t, o, p) => sweep(E, t, o, 300 * p, 950 * p, 0.16, 0.2, 'sine') },
  'ink.land': { fn: (E, t, o) => { E.noise(t, 0.07, o, { vol: 0.25, type: 'lowpass', freq: 700 }); sweep(E, t, o, 200, 80, 0.1, 0.2, 'sine'); } },
  'ink.stretch': { len: 0.6, rand: 0.06, fn: (E, t, o, p) => { sweep(E, t, o, 240 * p, 880 * p, 0.2, 0.14, 'triangle'); E.noise(t, 0.2, o, { vol: 0.05, type: 'bandpass', freq: 1400, q: 5, sweep: 2.5 }); } },
  'ink.snap': { fn: (E, t, o, p) => { sweep(E, t, o, 1300 * p, 160, 0.09, 0.22, 'triangle'); E.noise(t, 0.04, o, { vol: 0.26, type: 'highpass', freq: 2500 }); } },
  'ink.grab': { fn: (E, t, o) => { E.osc('sine', 600, t, 0.02, o, { vol: 0.3, d: 0.05, s: 0.01 }); E.noise(t, 0.04, o, { vol: 0.18, type: 'bandpass', freq: 1500, q: 2 }); } },
  'ink.throw': { rand: 0.06, fn: (E, t, o, p) => { sweep(E, t, o, 500 * p, 1700 * p, 0.22, 0.14, 'sine'); E.noise(t, 0.2, o, { vol: 0.12, type: 'bandpass', freq: 2000, q: 1, sweep: 2 }); } },
  'ink.bonk': { rand: 0.1, gap: 0.04, fn: (E, t, o, p) => { E.osc('sine', 520 * p, t, 0.02, o, { vol: 0.45, d: 0.06, s: 0.01 }); E.osc('sine', 780 * p, t, 0.02, o, { vol: 0.2, d: 0.04, s: 0.01 }); E.noise(t, 0.03, o, { vol: 0.2, type: 'lowpass', freq: 1800 }); } },
  'ink.punch': { rand: 0.08, fn: (E, t, o, p) => { E.noise(t, 0.09, o, { vol: 0.4, type: 'lowpass', freq: 1600 * p, sweep: 0.2 }); sweep(E, t, o, 260 * p, 70, 0.1, 0.35, 'sine'); } },
  'ink.splat': { rand: 0.15, fn: (E, t, o, p) => { E.noise(t, 0.2, o, { vol: 0.36, type: 'lowpass', freq: 900 * p, sweep: 0.3, q: 2 }); E.noise(t + 0.03, 0.1, o, { vol: 0.15, type: 'bandpass', freq: 2400, q: 3 }); } },
  'ink.squash': { fn: (E, t, o) => { sweep(E, t, o, 500, 90, 0.16, 0.24, 'sine'); E.noise(t, 0.12, o, { vol: 0.2, type: 'lowpass', freq: 600 }); } },
  'ink.pop': { rand: 0.1, fn: (E, t, o, p) => { sweep(E, t, o, 300 * p, 1400 * p, 0.05, 0.3, 'sine'); } },
  'ink.honk': { fn: (E, t, o, p) => { const f = E.filt('bandpass', 900, 3, o); E.osc('sawtooth', 311 * p, t, 0.16, f, { vol: 0.5, a: 0.01, s: 0.9, r: 0.03 }); E.osc('sawtooth', 392 * p, t, 0.16, f, { vol: 0.4, a: 0.01, s: 0.9, r: 0.03 }); } },
  'ink.whistle': { len: 1, fn: (E, t, o, p) => { const { o: osc } = E.osc('sine', 800, t, 0.5, o, { vol: 0.16, a: 0.02, s: 1, r: 0.05 }); osc.frequency.setValueAtTime((p > 1 ? 500 : 1800), t); osc.frequency.exponentialRampToValueAtTime((p > 1 ? 1900 : 420), t + 0.5); } },
  'ink.hurt': { fn: (E, t, o) => { const f = E.filt('bandpass', 1100, 3, o); const { o: osc } = E.osc('sawtooth', 500, t, 0.25, f, { vol: 0.5, a: 0.01, s: 0.9, r: 0.05 }); osc.frequency.setValueAtTime(620, t); osc.frequency.exponentialRampToValueAtTime(250, t + 0.25); } },
  'ink.hammer': { send: 0.2, fn: (E, t, o) => { E.noise(t, 0.25, o, { vol: 0.5, type: 'lowpass', freq: 1000, sweep: 0.15 }); sweep(E, t, o, 120, 36, 0.3, 0.5, 'sine'); E.osc('sine', 1900, t, 0.01, o, { vol: 0.08, d: 0.4, s: 0.01 }); } },
  'ink.steam': { fn: (E, t, o) => E.noise(t, 0.4, o, { vol: 0.2, type: 'highpass', freq: 3500, a: 0.03 }) },
  'ink.crank': { gap: 0.05, rand: 0.1, fn: (E, t, o, p) => { E.osc('square', 300 * p, t, 0.01, o, { vol: 0.12, d: 0.02, s: 0.01 }); E.noise(t, 0.02, o, { vol: 0.1, type: 'bandpass', freq: 2500, q: 4 }); } },
  'ink.pipe': { fn: (E, t, o) => { sweep(E, t, o, 150, 600, 0.3, 0.3, 'sine'); E.noise(t, 0.3, o, { vol: 0.12, type: 'bandpass', freq: 500, q: 4, sweep: 3 }); } },
  'ink.print': { gap: 0.1, fn: (E, t, o) => { for (let i = 0; i < 4; i++) E.noise(t + i * 0.05, 0.03, o, { vol: 0.16, type: 'bandpass', freq: 1800 + i * 300, q: 3 }); } },
  'ink.roar': { len: 2, send: 0.3, fn: (E, t, o) => { const f = E.filt('bandpass', 500, 2, o); const { o: osc } = E.osc('sawtooth', 110, t, 1, f, { vol: 0.8, a: 0.05, s: 1, r: 0.2, vib: 60, vibRate: 11, vibDelay: 0 }); osc.frequency.setValueAtTime(90, t); osc.frequency.linearRampToValueAtTime(170, t + 0.3); osc.frequency.linearRampToValueAtTime(70, t + 1); f.frequency.setValueAtTime(400, t); f.frequency.linearRampToValueAtTime(1200, t + 0.3); f.frequency.linearRampToValueAtTime(350, t + 1); } },
  'ink.flood': { len: 3, send: 0.3, fn: (E, t, o) => { E.noise(t, 2.5, o, { vol: 0.4, type: 'lowpass', freq: 300, sweep: 3, a: 0.5 }); } },

  // ---- PAPER ----
  'pp.step': { vol: 0.5, gap: 0.09, rand: 0.15, fn: (E, t, o, p) => E.noise(t, 0.03, o, { vol: 0.16, type: 'bandpass', freq: 2800 * p, q: 1.5 }) },
  'pp.jump': { fn: (E, t, o) => { E.noise(t, 0.09, o, { vol: 0.16, type: 'bandpass', freq: 3000, q: 1, sweep: 2 }); } },
  'pp.land': { fn: (E, t, o) => { E.noise(t, 0.05, o, { vol: 0.24, type: 'bandpass', freq: 1500, q: 1 }); E.osc('sine', 150, t, 0.02, o, { vol: 0.2, d: 0.06, s: 0.01 }); } },
  'pp.fold': { len: 1, rand: 0.1, fn: (E, t, o, p) => { E.noise(t, 0.35, o, { vol: 0.24, type: 'bandpass', freq: 2200 * p, q: 0.8, sweep: 0.5, a: 0.05 }); E.noise(t + 0.3, 0.06, o, { vol: 0.2, type: 'highpass', freq: 4000 }); } },
  'pp.thunk': { rand: 0.08, fn: (E, t, o, p) => { E.osc('sine', 140 * p, t, 0.02, o, { vol: 0.5, d: 0.1, s: 0.01 }); E.noise(t, 0.05, o, { vol: 0.3, type: 'lowpass', freq: 1500 }); E.osc('triangle', 420 * p, t, 0.01, o, { vol: 0.12, d: 0.05, s: 0.01 }); } },
  'pp.crank': { gap: 0.04, rand: 0.08, fn: (E, t, o, p) => { E.osc('square', 1500 * p, t, 0.004, o, { vol: 0.07, d: 0.012, s: 0.01, r: 0.01 }); E.noise(t, 0.015, o, { vol: 0.1, type: 'bandpass', freq: 4200, q: 3 }); } },
  'pp.string': { fn: (E, t, o, p) => { E.osc('triangle', 196 * p, t, 0.02, o, { vol: 0.3, d: 0.4, s: 0.01, r: 0.2 }); E.osc('sine', 392 * p, t, 0.02, o, { vol: 0.1, d: 0.2, s: 0.01 }); } },
  'pp.slide': { len: 0.8, fn: (E, t, o) => { E.noise(t, 0.5, o, { vol: 0.14, type: 'bandpass', freq: 1200, q: 2, a: 0.08 }); } },
  'pp.tear': { fn: (E, t, o) => { E.noise(t, 0.3, o, { vol: 0.34, type: 'highpass', freq: 2500, sweep: 0.5 }); } },
  'pp.chime': { send: 0.5, fn: (E, t, o, p) => { [1, 1.5, 2].forEach((m, i) => E.osc('sine', 880 * p * m, t + i * 0.08, 0.02, o, { vol: 0.14, d: 0.7, s: 0.01, r: 0.4 })); } },
  'pp.hurt': { fn: (E, t, o) => { E.noise(t, 0.2, o, { vol: 0.34, type: 'bandpass', freq: 2600, q: 1, sweep: 0.3 }); sweep(E, t, o, 400, 150, 0.15, 0.15, 'triangle'); } },
  'pp.pin': { fn: (E, t, o, p) => { E.osc('sine', 2100 * p, t, 0.01, o, { vol: 0.16, d: 0.15, s: 0.01 }); E.osc('square', 600 * p, t, 0.005, o, { vol: 0.08, d: 0.02, s: 0.01 }); } },
  'pp.rumble': { len: 3, send: 0.3, fn: (E, t, o) => { E.noise(t, 2.4, o, { vol: 0.4, type: 'lowpass', freq: 160, a: 0.4 }); for (let i = 0; i < 14; i++) E.osc('square', 1300 + Math.random() * 500, t + i * 0.16, 0.004, o, { vol: 0.05, d: 0.012, s: 0.01, r: 0.01 }); } },

  // ---- transformation / shared ----
  'fx.whoosh': { len: 1.2, fn: (E, t, o) => E.noise(t, 0.9, o, { vol: 0.34, type: 'bandpass', freq: 300, q: 1.2, sweep: 9, a: 0.3 }) },
  'fx.rise': { len: 3, fn: (E, t, o) => { sweep(E, t, o, 80, 1600, 2.4, 0.12, 'sawtooth'); E.noise(t, 2.4, o, { vol: 0.25, type: 'bandpass', freq: 200, q: 2, sweep: 20, a: 1.5 }); } },
  'fx.boom': { len: 3, send: 0.6, fn: (E, t, o) => { E.noise(t, 1.6, o, { vol: 0.7, type: 'lowpass', freq: 900, sweep: 0.05 }); sweep(E, t, o, 110, 24, 1.2, 0.7, 'sine'); } },
  'fx.shimmer': { len: 2.5, send: 0.7, fn: (E, t, o) => { for (let i = 0; i < 9; i++) E.osc('sine', 1200 + Math.random() * 3200, t + i * 0.07, 0.02, o, { vol: 0.05, d: 0.6, s: 0.01, r: 0.3 }); } },
};
