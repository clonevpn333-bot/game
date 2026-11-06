// GETAWAY! — street sound: people murmuring in groups, music leaking out of passing cars, shouts and screams.
// Everything is synthesised (no samples): babble = noise + a voiced buzz through moving vowel formants gated at a
// syllable rate; radios = a small step sequencer (drums, bass, chords, lead) per genre, muffled by the car body.
import { G } from './context.js';
import { rand, pick, clamp } from './utils.js';

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
// ---------- babble (one loop per group of people talking) ----------
export class Murmur {
  constructor(A, voices = 2) {
    const ctx = A.ctx; this.A = A; this.alive = true; this.out = ctx.createGain(); this.out.gain.value = 0; this.nodes = [];
    this.pan = A._panner({ x: 0, y: 0, z: 0 }, 3, 1.4); this.out.connect(this.pan); this.pan.connect(A.amb);
    for (let v = 0; v < voices; v++) {
      const g = ctx.createGain(); g.gain.value = 0; g.connect(this.out);
      // voiced buzz (pitch wanders like speech) + breath noise, through two vowel formants
      const o = ctx.createOscillator(); o.type = 'sawtooth'; const f0 = rand(105, 230); o.frequency.value = f0;
      const vib = ctx.createOscillator(); vib.frequency.value = rand(2.2, 3.6); const vg = ctx.createGain(); vg.gain.value = f0 * 0.18; vib.connect(vg); vg.connect(o.frequency);
      const n = A._src(A.noiseP, 1, true); const ng = ctx.createGain(); ng.gain.value = 0.35; n.connect(ng);
      const f1 = A._filt('bandpass', rand(450, 750), 4), f2 = A._filt('bandpass', rand(1100, 1900), 5); const mix = ctx.createGain(); mix.gain.value = 0.5;
      o.connect(f1); o.connect(f2); ng.connect(f1); ng.connect(f2); f1.connect(mix); f2.connect(mix); mix.connect(g);
      const fl = ctx.createOscillator(); fl.frequency.value = rand(1.5, 3); const fg = ctx.createGain(); fg.gain.value = 260; fl.connect(fg); fg.connect(f1.frequency); const fg2 = ctx.createGain(); fg2.gain.value = 500; fl.connect(fg2); fg2.connect(f2.frequency);
      // syllables: two LFOs multiplied-ish (summed into the gain) at speech rate, plus slow turn-taking
      const s1 = ctx.createOscillator(); s1.frequency.value = rand(3.8, 5.6); const s1g = ctx.createGain(); s1g.gain.value = 0.5; s1.connect(s1g); s1g.connect(g.gain);
      const s2 = ctx.createOscillator(); s2.type = 'triangle'; s2.frequency.value = rand(0.12, 0.3); const s2g = ctx.createGain(); s2g.gain.value = 0.5; s2.connect(s2g); s2g.connect(g.gain);
      for (const x of [o, vib, n, fl, s1, s2]) { x.start(A.t + rand(0, 0.5)); this.nodes.push(x); }
    }
  }
  update(pos, level) { if (!this.alive) return; const t = this.A.t; this.out.gain.setTargetAtTime(level * 0.11, t, 0.15); const P = this.pan; if (P.positionX) { P.positionX.setTargetAtTime(pos.x, t, 0.05); P.positionY.setTargetAtTime(pos.y + 1.6, t, 0.05); P.positionZ.setTargetAtTime(pos.z, t, 0.05); } }
  dispose() { if (!this.alive) return; this.alive = false; this.out.gain.setTargetAtTime(0, this.A.t, 0.1); setTimeout(() => { try { this.nodes.forEach((n) => n.stop()); this.out.disconnect(); this.pan.disconnect(); } catch (e) {} }, 600); }
}

// ---------- car radio: a tiny step sequencer per genre ----------
const GENRES = {
  hiphop: { bpm: 88, kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.xx', bass: [0, null, null, 0, null, null, 3, null, 5, null, null, 3, null, 0, null, null], chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], stab: '..x.......x.....', root: 33, lead: null, tone: 'triangle' },
  synth: { bpm: 112, kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', bass: [0, 0, 12, 0, 0, 12, 0, 12, 0, 0, 12, 0, 0, 12, 0, 12], chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], stab: null, root: 33, lead: [0, 4, 7, 12, 7, 4, 0, 4, 7, 12, 16, 12, 7, 4, 7, 12], tone: 'sawtooth' },
  latin: { bpm: 100, kick: 'x.......x.......', snare: null, clave: 'x..x..x...x.x...', hat: 'x.xxx.xxx.xxx.xx', bass: [null, null, null, 0, null, null, 7, null, null, null, null, 0, null, null, 7, null], chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], stab: 'x..x..x.x..x..x.', root: 36, lead: null, tone: 'square' },
  rock: { bpm: 124, kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', bass: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], chords: [[40, 47, 52], [43, 50, 55], [45, 52, 57], [38, 45, 50]], stab: 'x.x.x.x.x.x.x.x.', root: 28, lead: null, tone: 'square', dist: true },
};
export const RADIO_GENRES = Object.keys(GENRES);
export class Radio {
  constructor(A, genre) {
    const ctx = A.ctx; this.A = A; this.alive = true; this.g = GENRES[genre] || GENRES.hiphop; this.step = 0; this.bar = Math.floor(rand(0, 4)); this.next = A.t + 0.05;
    this.out = ctx.createGain(); this.out.gain.value = 0; this.muffle = A._filt('lowpass', 1600, 0.7); this.out.connect(this.muffle);
    this.pan = A._panner({ x: 0, y: 0, z: 0 }, 4, 1.3); this.muffle.connect(this.pan); this.pan.connect(A.sfx);
    if (this.g.dist) { this.ws = ctx.createWaveShaper(); this.ws.curve = A.distCurve; this.ws.connect(this.out); }
  }
  _tone(type, f, t, d, v, dest = this.out, a = 0.005) { const c = this.A.ctx; const o = c.createOscillator(); o.type = type; o.frequency.value = f; const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g); g.connect(dest); o.start(t); o.stop(t + d + 0.02); }
  _noise(t, d, v, f, type = 'highpass') { const A = this.A, c = A.ctx; const s = A._src(A.noiseW, 1, false, rand(0, 1)); const fl = A._filt(type, f, 1); const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(fl); fl.connect(g); g.connect(this.out); s.start(t, s._off); s.stop(t + d + 0.02); }
  _kick(t) { const c = this.A.ctx; const o = c.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); const g = c.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.3); }
  _schedule(t) {
    const g = this.g, i = this.step % 16, sp = 60 / g.bpm / 4; const ch = g.chords[this.bar % g.chords.length]; const root = g.root + (ch[0] - g.chords[0][0]);
    if (g.kick && g.kick[i] === 'x') this._kick(t);
    if (g.snare && g.snare[i] === 'x') { this._noise(t, 0.16, 0.45, 1800, 'bandpass'); this._tone('triangle', 190, t, 0.08, 0.25); }
    if (g.hat && g.hat[i] === 'x') this._noise(t, i % 4 === 2 ? 0.09 : 0.035, 0.18, 7500);
    if (g.clave && g.clave[i] === 'x') this._tone('sine', 2400, t, 0.05, 0.25);
    if (g.bass && g.bass[i] !== null) this._tone(g.dist ? 'square' : 'sawtooth', NOTE(root + g.bass[i]), t, sp * 1.7, 0.32, this.ws || this.out);
    if (g.stab && g.stab[i] === 'x') for (const n of ch) this._tone(g.tone, NOTE(n), t, sp * (g.dist ? 1.2 : 1.6), 0.09, this.ws || this.out);
    if (!g.stab && i === 0) for (const n of ch) this._tone(g.tone, NOTE(n), t, sp * 15, 0.06, this.out, 0.05);
    if (g.lead && g.lead[i] !== null) this._tone('square', NOTE(ch[0] + 12 + g.lead[i]), t, sp * 0.9, 0.05);
    this.step++; if (this.step % 16 === 0) this.bar++;
  }
  update(pos, level) {
    if (!this.alive) return; const A = this.A, t = A.t; this.out.gain.setTargetAtTime(level * 0.5, t, 0.2);
    if (this.pan.positionX) { this.pan.positionX.setTargetAtTime(pos.x, t, 0.03); this.pan.positionY.setTargetAtTime(pos.y + 1, t, 0.03); this.pan.positionZ.setTargetAtTime(pos.z, t, 0.03); }
    if (this.next < t) this.next = t + 0.02; const sp = 60 / this.g.bpm / 4; let n = 0;
    while (this.next < t + 0.22 && n++ < 8) { this._schedule(this.next); this.next += sp; }
  }
  dispose() { if (!this.alive) return; this.alive = false; this.out.gain.setTargetAtTime(0, this.A.t, 0.1); setTimeout(() => { try { this.out.disconnect(); this.muffle.disconnect(); this.pan.disconnect(); } catch (e) {} }, 800); }
}

// ---------- positional voices: scream / shout / gasp / laugh ----------
export function voice(A, pos, kind = 'shout', pitch = 1) {
  if (!A || !A.ready || !A._can(pos, 90)) return; const ctx = A.ctx, t = A.t + 0.02;
  const dur = kind === 'scream' ? rand(0.7, 1.2) : kind === 'gasp' ? 0.25 : kind === 'laugh' ? 0.9 : rand(0.35, 0.6);
  const out = A._out(pos, { ref: 5, wet: 0.2, gain: kind === 'scream' ? 0.5 : 0.35, life: dur + 0.5 });
  const o = ctx.createOscillator(); o.type = 'sawtooth'; const f0 = (kind === 'scream' ? rand(520, 820) : rand(140, 260)) * pitch; o.frequency.setValueAtTime(f0 * 0.8, t);
  if (kind === 'scream') { o.frequency.exponentialRampToValueAtTime(f0 * 1.25, t + dur * 0.3); o.frequency.exponentialRampToValueAtTime(f0 * 0.7, t + dur); }
  else if (kind === 'laugh') { for (let k = 0; k < 5; k++) o.frequency.setValueAtTime(f0 * (1.1 - k * 0.05), t + k * 0.16); }
  else { o.frequency.exponentialRampToValueAtTime(f0 * 1.3, t + dur * 0.4); o.frequency.exponentialRampToValueAtTime(f0 * 0.85, t + dur); }
  const f1 = A._filt('bandpass', kind === 'scream' ? 1100 : 700, 3), f2 = A._filt('bandpass', kind === 'scream' ? 2600 : 1600, 4); const g = ctx.createGain();
  if (kind === 'laugh') { g.gain.setValueAtTime(0.0001, t); for (let k = 0; k < 5; k++) { g.gain.exponentialRampToValueAtTime(1, t + k * 0.16 + 0.03); g.gain.exponentialRampToValueAtTime(0.05, t + k * 0.16 + 0.13); } g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  else { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.04); g.gain.setTargetAtTime(0.0001, t + dur * 0.7, dur * 0.15); }
  const n = A._src(A.noiseP, 1, false); const ng = ctx.createGain(); ng.gain.value = kind === 'gasp' ? 1.2 : 0.25; n.connect(ng);
  o.connect(f1); o.connect(f2); ng.connect(f1); ng.connect(f2); f1.connect(g); f2.connect(g); g.connect(out);
  o.start(t); o.stop(t + dur + 0.1); n.start(t, n._off); n.stop(t + dur + 0.1);
}

// ---------- manager: picks which groups / cars are audible ----------
export class StreetAudio {
  constructor() { this.murmurs = new Map(); this.radios = new Map(); this.t = 0; }
  update(dt, groups, cars) {
    const A = G.audio; if (!A || !A.ready) return; this.t -= dt; const L = A.listener;
    if (this.t <= 0) { this.t = 0.3; // re-pick the closest few (cheap) — at most 3 murmuring groups and 2 radios at once
      const near = (list, R, n) => list.map((x) => [Math.hypot(x.pos.x - L.x, x.pos.z - L.z), x]).filter((a) => a[0] < R).sort((a, b) => a[0] - b[0]).slice(0, n).map((a) => a[1]);
      const gs = new Set(near(groups, 26, 3)); for (const [k, m] of this.murmurs) if (!gs.has(k)) { m.dispose(); this.murmurs.delete(k); } for (const g of gs) if (!this.murmurs.has(g)) this.murmurs.set(g, new Murmur(A, Math.min(3, g.members.length)));
      const cs = new Set(near(cars, 38, 2)); for (const [k, r] of this.radios) if (!cs.has(k) || k.dead) { r.dispose(); this.radios.delete(k); } for (const c of cs) if (!this.radios.has(c)) this.radios.set(c, new Radio(A, c.radio));
    }
    for (const [g, m] of this.murmurs) { const d = Math.hypot(g.pos.x - L.x, g.pos.z - L.z); m.update(g.pos, clamp(1 - d / 26, 0, 1) * (g.hushed ? 0.15 : 1)); }
    for (const [c, r] of this.radios) { const d = Math.hypot(c.pos.x - L.x, c.pos.z - L.z); r.update(c.pos, clamp(1 - d / 38, 0, 1) * (c.isPlayer ? 0 : 1)); }
  }
  clear() { for (const m of this.murmurs.values()) m.dispose(); for (const r of this.radios.values()) r.dispose(); this.murmurs.clear(); this.radios.clear(); }
}
export { pick };
