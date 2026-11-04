// Adaptive soundtrack: a lookahead step sequencer driving synthesized instruments.
// Tracks are composed as patterns (see tracks.js) arranged into layers whose gains follow
// the game's intensity state: calm / combat / vote / disaster / boss.
import { TRACKS } from './tracks.js';

const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);
const NOTE = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
export function noteToMidi(s) {
  const m = /^([a-g])(#|b)?(-?\d)$/.exec(s);
  if (!m) return null;
  let n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return n + (parseInt(m[3], 10) + 1) * 12;
}

const STATES = {
  silent: {},
  calm: { pad: 1, pulse: 0.9, perc: 0.45, bass: 0.35, susp: 0 },
  explore: { pad: 0.9, pulse: 1, perc: 0.8, bass: 0.7, drums: 0.45, lead: 0 },
  combat: { pad: 0.6, pulse: 0.75, drums: 1, perc: 1, bass: 1, lead: 0.85, orch: 0.55 },
  vote: { pad: 1, pulse: 0.45, bass: 0.35, orch: 0.25, susp: 1 },
  disaster: { pad: 0.7, pulse: 0.8, drums: 1, perc: 1, bass: 1, lead: 1, orch: 1, choir: 0.65 },
  boss: { pad: 0.8, pulse: 0.8, drums: 1, perc: 1, bass: 1, lead: 1, orch: 1, choir: 1 },
  full: { pad: 1, pulse: 1, drums: 1, perc: 1, bass: 1, lead: 1, orch: 1, choir: 1 },
};
const LAYERS = ['pad', 'pulse', 'drums', 'perc', 'bass', 'lead', 'orch', 'choir', 'susp'];

// ---------------- pattern parsing ----------------
function parseHits(str) {
  const s = str.replace(/[\s|]/g, '');
  const out = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const v = c === 'X' ? 1.2 : c === 'x' ? 1 : c === 'o' ? 0.6 : c === 'g' ? 0.28 : c === 'f' ? 0.8 : c === 't' ? 0.8 : 0;
    out.push(v ? { v, c } : null);
  }
  return out;
}
function parseNotes(str, res = 1) {
  const toks = str.replace(/\|/g, ' ').trim().split(/\s+/);
  const ev = [];
  let step = 0;
  let last = null;
  for (const tk of toks) {
    if (tk === '-') { if (last) last.len += res; step += res; continue; }
    if (tk === '.') { last = null; step += res; continue; }
    let vel = 0.85, t = tk;
    if (t.endsWith('!')) { vel = 1.05; t = t.slice(0, -1); }
    if (t.endsWith('?')) { vel = 0.55; t = t.slice(0, -1); }
    const notes = t.split('+').map(noteToMidi).filter((n) => n !== null);
    last = { step, notes, len: res, vel };
    ev.push(last);
    step += res;
  }
  return { ev, length: step };
}
function parseChords(arr) { return arr.map((c) => c.split(/\s+/).map(noteToMidi)); }

// ---------------- instruments ----------------
class Inst {
  constructor(A, delaySend) { this.A = A; this.ctx = A.ctx; this.delay = delaySend; }
  env(g, t, a, d, s, r, dur, peak = 1) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(peak * s, t + a, d / 3 + 0.001);
    g.gain.setTargetAtTime(0.0001, t + Math.max(dur, a), r / 4 + 0.001);
  }
  kick(out, t, v) {
    const c = this.ctx, A = this.A;
    const o = c.createOscillator(); o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.09);
    const g = c.createGain(); g.gain.setValueAtTime(1.3 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    const d = c.createWaveShaper(); d.curve = A.drive;
    o.connect(g).connect(d).connect(out); o.start(t); o.stop(t + 0.55);
    A.noise(out, t, 0.015, { filter: 'highpass', f0: 3000, vol: 0.35 * v });
  }
  snare(out, t, v, verb) {
    const A = this.A;
    A.tone(out, t, 0.12, { type: 'triangle', f0: 210, f1: 150, vol: 0.55 * v });
    A.noise(out, t, 0.22, { filter: 'bandpass', f0: 2200, q: 0.6, vol: 0.85 * v });
    A.noise(out, t, 0.09, { filter: 'highpass', f0: 5000, vol: 0.4 * v });
    if (verb) A.noise(verb, t, 0.25, { filter: 'bandpass', f0: 1800, q: 0.7, vol: 0.5 * v });
  }
  clap(out, t, v, verb) {
    const A = this.A;
    for (let i = 0; i < 3; i++) A.noise(out, t + i * 0.011, 0.02, { filter: 'bandpass', f0: 1400, q: 1.2, vol: 0.8 * v });
    A.noise(out, t + 0.033, 0.2, { filter: 'bandpass', f0: 1300, q: 1, vol: 0.6 * v });
    if (verb) A.noise(verb, t, 0.3, { filter: 'bandpass', f0: 1300, q: 1, vol: 0.4 * v });
  }
  hat(out, t, v, open) {
    this.A.noise(out, t, open ? 0.28 : 0.045, { filter: 'highpass', f0: open ? 7000 : 8000, vol: (open ? 0.32 : 0.38) * v });
  }
  shaker(out, t, v) { this.A.noise(out, t, 0.06, { filter: 'bandpass', f0: 6000, q: 1.5, vol: 0.25 * v, a: 0.015 }); }
  rim(out, t, v) { this.A.tone(out, t, 0.04, { type: 'square', f0: 1700, vol: 0.12 * v }); this.A.noise(out, t, 0.02, { filter: 'bandpass', f0: 3500, q: 3, vol: 0.4 * v }); }
  crash(out, t, v) { this.A.noise(out, t, 2.2, { filter: 'highpass', f0: 4500, f1: 3000, vol: 0.45 * v }); }
  tom(out, t, v, n = 45) {
    this.A.tone(out, t, 0.4, { f0: mtof(n) * 1.6, f1: mtof(n), vol: 0.9 * v });
    this.A.noise(out, t, 0.08, { filter: 'lowpass', f0: 1200, vol: 0.3 * v });
  }
  taiko(out, t, v, verb) {
    const A = this.A;
    A.tone(out, t, 0.9, { f0: 95, f1: 48, vol: 1.3 * v });
    A.noise(out, t, 0.25, { type: 'brown', filter: 'lowpass', f0: 900, vol: 0.9 * v });
    if (verb) A.tone(verb, t, 0.9, { f0: 95, f1: 48, vol: 0.8 * v });
  }
  metal(out, t, v, n = 57) {
    this.A.fm(out, t, 0.35, { f: mtof(n), ratio: 2.73, index: 1600, vol: 0.32 * v, idxDecay: 40 });
    this.A.noise(out, t, 0.03, { filter: 'bandpass', f0: 2500, vol: 0.4 * v });
  }
  hiss(out, t, v, dur) { this.A.noise(out, t, dur || 0.6, { filter: 'highpass', f0: 3000, f1: 7000, vol: 0.35 * v, a: 0.08, curve: 'lin' }); }
  tick(out, t, v) { this.A.fm(out, t, 0.05, { f: 2400, ratio: 1.5, index: 800, vol: 0.18 * v }); }
  riser(out, t, v, dur) { this.A.noise(out, t, dur, { filter: 'bandpass', f0: 300, f1: 6000, q: 2, vol: 0.35 * v, a: dur * 0.9, curve: 'lin' }); }

  // tonal
  bass(out, t, n, dur, v, kind = 'bass') {
    const c = this.ctx;
    const f = mtof(n);
    const g = c.createGain();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    const sh = c.createWaveShaper(); sh.curve = this.A.drive;
    const oscs = [];
    if (kind === 'reese') {
      for (const dt of [-14, 14]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; oscs.push(o); }
      const s = c.createOscillator(); s.type = 'sine'; s.frequency.value = f; oscs.push(s);
      lp.frequency.setValueAtTime(380, t); lp.frequency.linearRampToValueAtTime(900, t + dur * 0.5); lp.frequency.linearRampToValueAtTime(400, t + dur);
      lp.Q.value = 2;
      this.env(g, t, 0.02, 0.2, 0.85, 0.12, dur, 0.5 * v);
    } else if (kind === 'acid') {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; oscs.push(o);
      lp.Q.value = 11; lp.frequency.setValueAtTime(200 + 2600 * v, t); lp.frequency.exponentialRampToValueAtTime(180, t + 0.16);
      this.env(g, t, 0.003, 0.12, 0.4, 0.05, dur, 0.42 * v);
    } else if (kind === 'sub') {
      const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = f; oscs.push(o);
      lp.frequency.value = 400;
      this.env(g, t, 0.01, 0.3, 0.9, 0.15, dur, 0.85 * v);
    } else if (kind === 'upright') {
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = f; oscs.push(o);
      const o2 = c.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2; oscs.push(o2);
      lp.frequency.value = 700;
      this.env(g, t, 0.005, 0.25, 0.3, 0.1, dur, 0.7 * v);
    } else {
      for (const dt of [-7, 7]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; oscs.push(o); }
      const sq = c.createOscillator(); sq.type = 'square'; sq.frequency.value = f / 2; oscs.push(sq);
      lp.Q.value = 4; lp.frequency.setValueAtTime(300 + 1400 * v, t); lp.frequency.exponentialRampToValueAtTime(220, t + Math.min(0.25, dur));
      this.env(g, t, 0.004, 0.15, 0.6, 0.06, dur, 0.38 * v);
    }
    for (const o of oscs) { o.connect(lp); o.start(t); o.stop(t + dur + 0.5); }
    lp.connect(sh).connect(g).connect(out);
  }
  pad(out, t, notes, dur, v, verb, bright = 900) {
    const c = this.ctx;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = bright; lp.Q.value = 0.7;
    const g = c.createGain();
    this.env(g, t, Math.min(0.6, dur * 0.3), 0.5, 0.85, 0.9, dur, 0.09 * v);
    lp.connect(g); g.connect(out);
    if (verb) { const s = c.createGain(); s.gain.value = 0.8; g.connect(s).connect(verb); }
    for (const n of notes) for (const dt of [-10, 0, 10]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = dt + (Math.random() - 0.5) * 4;
      o.connect(lp); o.start(t); o.stop(t + dur + 1.2);
    }
  }
  strings(out, t, notes, dur, v, verb, tremolo = false) {
    const c = this.ctx;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
    const g = c.createGain();
    this.env(g, t, tremolo ? 0.02 : 0.12, 0.3, 0.8, 0.4, dur, 0.07 * v);
    lp.connect(g).connect(out);
    if (verb) { const s = c.createGain(); s.gain.value = 0.6; g.connect(s).connect(verb); }
    const vib = c.createOscillator(); vib.frequency.value = 5.3; const vg = c.createGain(); vg.gain.value = 7;
    vib.connect(vg); vib.start(t); vib.stop(t + dur + 0.6);
    if (tremolo) {
      const tr = c.createOscillator(); tr.type = 'square'; tr.frequency.value = 12; const tg = c.createGain(); tg.gain.value = 0.035 * v;
      tr.connect(tg).connect(g.gain); tr.start(t); tr.stop(t + dur + 0.6);
    }
    for (const n of notes) for (const dt of [-6, 6]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = dt;
      vg.connect(o.detune);
      o.connect(lp); o.start(t); o.stop(t + dur + 0.6);
    }
  }
  brass(out, t, notes, dur, v, verb) {
    const c = this.ctx;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.5;
    lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(3200 * v, t + 0.06); lp.frequency.setTargetAtTime(1300, t + 0.08, 0.15);
    const g = c.createGain();
    this.env(g, t, 0.025, 0.2, 0.7, 0.15, dur, 0.12 * v);
    const sh = c.createWaveShaper(); sh.curve = this.A.drive;
    lp.connect(sh).connect(g).connect(out);
    if (verb) { const s = c.createGain(); s.gain.value = 0.5; g.connect(s).connect(verb); }
    for (const n of notes) for (const dt of [-8, 0, 8]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = dt;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.4);
    }
  }
  choir(out, t, notes, dur, v, verb) {
    const c = this.ctx;
    const g = c.createGain();
    this.env(g, t, 0.35, 0.5, 0.9, 1.0, dur, 0.05 * v);
    g.connect(out);
    if (verb) { const s = c.createGain(); s.gain.value = 1.4; g.connect(s).connect(verb); }
    const forms = [[800, 1, 8], [1150, 0.6, 10], [2900, 0.25, 12]];
    const fs = forms.map(([f, gain, q]) => { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const bg = c.createGain(); bg.gain.value = gain * 3; b.connect(bg).connect(g); return b; });
    const vib = c.createOscillator(); vib.frequency.value = 4.8; const vg = c.createGain(); vg.gain.value = 9;
    vib.connect(vg); vib.start(t); vib.stop(t + dur + 1.2);
    for (const n of notes) for (const dt of [-12, 0, 12]) {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); o.detune.value = dt + (Math.random() - 0.5) * 6;
      vg.connect(o.detune);
      for (const f of fs) o.connect(f);
      o.start(t); o.stop(t + dur + 1.2);
    }
  }
  lead(out, t, n, dur, v, verb, kind = 'saw') {
    const c = this.ctx;
    const g = c.createGain();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass';
    if (kind === 'saw') {
      lp.frequency.setValueAtTime(1200, t); lp.frequency.linearRampToValueAtTime(3800 * v, t + 0.03); lp.frequency.setTargetAtTime(2000, t + 0.05, 0.2);
      this.env(g, t, 0.008, 0.2, 0.75, 0.12, dur, 0.11 * v);
      const vib = c.createOscillator(); vib.frequency.value = 5.5; const vg = c.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(12, t + 0.35);
      vib.connect(vg); vib.start(t); vib.stop(t + dur + 0.4);
      for (const [type, dt] of [['sawtooth', -6], ['sawtooth', 6], ['square', 0]]) {
        const o = c.createOscillator(); o.type = type; o.frequency.value = mtof(n); o.detune.value = dt; vg.connect(o.detune);
        o.connect(lp); o.start(t); o.stop(t + dur + 0.4);
      }
    } else if (kind === 'square') {
      lp.frequency.value = 2400;
      this.env(g, t, 0.004, 0.1, 0.5, 0.08, dur, 0.09 * v);
      const o = c.createOscillator(); o.type = 'square'; o.frequency.value = mtof(n); o.connect(lp); o.start(t); o.stop(t + dur + 0.3);
    }
    lp.connect(g).connect(out);
    if (this.delay) { const s = c.createGain(); s.gain.value = 0.3; g.connect(s).connect(this.delay); }
    if (verb) { const s = c.createGain(); s.gain.value = 0.3; g.connect(s).connect(verb); }
  }
  pluck(out, t, n, dur, v, verb, kind = 'pluck') {
    const c = this.ctx;
    const g = c.createGain();
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3;
    lp.frequency.setValueAtTime(kind === 'soft' ? 1500 : 4200, t); lp.frequency.exponentialRampToValueAtTime(300, t + 0.22);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.13 * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.18, Math.min(dur, 0.5)));
    const o = c.createOscillator(); o.type = kind === 'soft' ? 'triangle' : 'sawtooth'; o.frequency.value = mtof(n);
    const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.value = mtof(n) * 1.003;
    o.connect(lp); o2.connect(lp); lp.connect(g).connect(out);
    o.start(t); o2.start(t); o.stop(t + 0.6); o2.stop(t + 0.6);
    if (this.delay) { const s = c.createGain(); s.gain.value = 0.35; g.connect(s).connect(this.delay); }
  }
  epiano(out, t, notes, dur, v, verb) {
    const A = this.A;
    for (const n of notes) {
      A.fm(out, t, Math.max(0.6, dur), { f: mtof(n), ratio: 1, index: mtof(n) * 1.4, vol: 0.09 * v, a: 0.003, idxDecay: 5 });
      A.fm(out, t, 0.25, { f: mtof(n), ratio: 14, index: 300, vol: 0.015 * v });
      if (verb) A.fm(verb, t, Math.max(0.6, dur), { f: mtof(n), ratio: 1, index: 100, vol: 0.04 * v });
    }
  }
  bell(out, t, n, dur, v, verb) {
    this.A.fm(out, t, 1.6, { f: mtof(n), ratio: 3.5, index: mtof(n) * 2, vol: 0.09 * v, idxDecay: 20 });
    if (this.delay) this.A.fm(this.delay, t, 1.2, { f: mtof(n), ratio: 3.5, index: mtof(n), vol: 0.05 * v });
    if (verb) this.A.fm(verb, t, 1.6, { f: mtof(n), ratio: 3.5, index: mtof(n), vol: 0.05 * v });
  }
  vibes(out, t, n, dur, v, verb) {
    this.A.fm(out, t, 1.2, { f: mtof(n), ratio: 4, index: mtof(n) * 0.6, vol: 0.12 * v, idxDecay: 3 });
    if (verb) this.A.tone(verb, t, 1.2, { f0: mtof(n), vol: 0.05 * v });
  }
}

// ---------------- engine ----------------
export class Music {
  constructor(audio) {
    this.A = audio;
    this.track = null;
    this.state = 'calm';
    this.playing = false;
    this.step = 0;
    this.nextTime = 0;
    this.layers = {};
    this.timer = null;
    this.onBar = null;
    this.barCount = 0;
  }
  _setup() {
    if (this.out) return;
    const A = this.A, c = A.ctx;
    this.out = c.createGain();
    this.out.gain.value = 1;
    this.duck = c.createGain();
    // voiceGain: music (and its reverb + stingers) yields to Mr. Halo / Iris while a voice clip plays
    this.voiceGain = c.createGain();
    this.out.connect(this.duck).connect(this.voiceGain).connect(A.musicBus);
    this.voiceVerb = c.createGain();
    this.verb = c.createGain(); this.verb.gain.value = 0.32; this.verb.connect(this.voiceVerb).connect(A.reverbSend);
    this.stingOut = c.createGain(); this.stingOut.connect(A.musicBus);
    this.delayNode = c.createDelay(2);
    this.delayFb = c.createGain(); this.delayFb.gain.value = 0.38;
    this.delayLp = c.createBiquadFilter(); this.delayLp.type = 'lowpass'; this.delayLp.frequency.value = 3000;
    this.delayIn = c.createGain();
    this.delayIn.connect(this.delayNode).connect(this.delayLp).connect(this.delayFb).connect(this.delayNode);
    this.delayLp.connect(this.out);
    for (const L of LAYERS) {
      const g = c.createGain(); g.gain.value = 0;
      g.connect(this.out);
      this.layers[L] = g;
    }
    this.inst = new Inst(A, this.delayIn);
    this.setVoiceActive(!!this.voiceActive, true);
  }
  setVoiceActive(active, force = false) {
    if (this.voiceActive === active && !force) return;
    this.voiceActive = active; this.A.voiceActive = active;
    const c = this.A.ctx; if (!c || !this.voiceGain) return;
    const now = c.currentTime, target = active ? 0.085 : 1, tc = active ? 0.025 : 0.5;
    for (const g of [this.voiceGain, this.stingOut]) { g.gain.cancelScheduledValues(now); g.gain.setTargetAtTime(target, now, tc); }
    this.voiceVerb.gain.cancelScheduledValues(now); this.voiceVerb.gain.setTargetAtTime(target * (this.contextDuck ?? 1), now, tc);
    this.A.sfxBus.gain.setTargetAtTime(this.A.vol.sfx * (active ? 0.55 : 1), now, tc);
  }
  play(id, state) {
    if (!this.A.ready) { this._pending = [id, state]; return; }
    this.duckEpoch = (this.duckEpoch || 0) + 1; // cancels pending stinger un-ducks
    if (this.A.ctx?.state === 'suspended') this.A.ctx.resume().catch(() => {});
    this._setup();
    const tr = TRACKS[id];
    if (!tr) return;
    if (state) this.state = state;
    this.setDuck(1, 0.12);
    if (this.track && this.track.id === id && this.playing) {
      const c = this.A.ctx; this.out.gain.cancelScheduledValues(c.currentTime); this.out.gain.setTargetAtTime(1, c.currentTime, 0.1);
      this.setState(this.state, 0.6); return;
    }
    const c = this.A.ctx;
    // fade out current
    const wasPlaying = this.playing;
    this.track = this._compile(tr);
    this.step = 0;
    this.barCount = 0;
    this.delayNode.delayTime.value = (60 / tr.bpm) * 0.75;
    if (wasPlaying) {
      this.out.gain.cancelScheduledValues(c.currentTime);
      this.out.gain.setTargetAtTime(0, c.currentTime, 0.12);
      this.out.gain.setTargetAtTime(1, c.currentTime + 0.45, 0.05);
      this.nextTime = c.currentTime + 0.5;
    } else {
      this.out.gain.value = 1;
      this.nextTime = c.currentTime + 0.08;
    }
    this.setState(this.state, wasPlaying ? 0.5 : 0.05);
    this.playing = true;
    if (!this.timer) this.timer = setInterval(() => this._schedule(), 25);
  }
  stop(fade = 0.6) {
    if (!this.playing) return;
    const c = this.A.ctx;
    this.out.gain.setTargetAtTime(0, c.currentTime, fade / 3);
    this.playing = false;
    setTimeout(() => { if (!this.playing && this.timer) { clearInterval(this.timer); this.timer = null; } }, fade * 1000 + 200);
  }
  resumePending() { if (this._pending) { const [i, s] = this._pending; this._pending = null; this.play(i, s); } }
  setState(state, fade = 1.2) {
    this.state = state;
    if (!this.out) return;
    const table = (this.track && this.track.states && this.track.states[state]) || STATES[state] || STATES.calm;
    const c = this.A.ctx;
    for (const L of LAYERS) {
      const v = table[L] || 0;
      this.layers[L].gain.cancelScheduledValues(c.currentTime);
      this.layers[L].gain.setTargetAtTime(v, c.currentTime, fade / 3);
    }
  }
  setDuck(v, tc = 0.1) {
    this.contextDuck = v;
    const c = this.A.ctx; if (!c || !this.duck) return;
    this.duck.gain.cancelScheduledValues(c.currentTime); this.duck.gain.setTargetAtTime(v, c.currentTime, tc);
    this.voiceVerb?.gain.setTargetAtTime(v * (this.voiceActive ? 0.085 : 1), c.currentTime, tc);
  }
  _compile(tr) {
    const chords = tr.chords ? parseChords(tr.chords) : null;
    const parts = tr.parts.map((p) => {
      const q = { ...p };
      if (p.hits) {
        const arr = Array.isArray(p.hits) ? p.hits.join('') : p.hits;
        q.h = parseHits(arr);
        q.length = q.h.length;
      } else if (p.notes) {
        const src = Array.isArray(p.notes) ? p.notes.join(' ') : p.notes;
        const parsed = parseNotes(src, p.res || 1);
        q.ev = new Map();
        for (const e of parsed.ev) q.ev.set(e.step, e);
        q.length = parsed.length;
      } else if (p.bassline) {
        q.h = parseHits(Array.isArray(p.bassline) ? p.bassline.join('') : p.bassline);
        q.length = q.h.length;
      } else if (p.arp) {
        q.length = p.arp.length * (p.res || 1);
      } else if (p.chord) {
        q.length = 16 * (p.every || 1);
      }
      return q;
    });
    // generic suspense part (ticking clock + tremolo) in track key
    parts.push({ layer: 'susp', inst: 'tick', h: parseHits('x...o...x...o...'), length: 16, generic: true });
    parts.push({ layer: 'susp', inst: 'tremolo', length: 32, generic: true });
    parts.push({ layer: 'susp', inst: 'kick', h: parseHits('x...............x.......x.......'), length: 32, generic: true });
    return { ...tr, chordsM: chords, parts, stepDur: 60 / tr.bpm / 4 };
  }
  chordAt(bar) {
    const ch = this.track.chordsM;
    if (!ch) return [60, 64, 67];
    const per = this.track.chordBars || 1;
    return ch[Math.floor(bar / per) % ch.length];
  }
  _schedule() {
    if (!this.playing || !this.track || this.A.ctx.state === 'suspended') return;
    const now = this.A.ctx.currentTime;
    // after a stall (tab hidden, long frame), skip ahead instead of firing a burst of stale notes
    if (this.nextTime < now - 0.1) {
      this.step += Math.max(0, Math.floor((now - this.nextTime) / this.track.stepDur));
      this.nextTime = now + 0.025; this.barCount = Math.floor(this.step / 16);
    }
    const ahead = now + 0.2;
    for (let n = 0; this.nextTime < ahead && n < 24; n++) {
      this._playStep(this.step, this.nextTime);
      let d = this.track.stepDur;
      // swing: lengthen even 16ths, shorten odd
      const sw = this.track.swing || 0;
      d *= (this.step % 2 === 0) ? 1 + sw : 1 - sw;
      this.nextTime += d;
      this.step++;
      if (this.step % 16 === 0) { this.barCount++; if (this.onBar) this.onBar(this.barCount); }
    }
  }
  _layerLive(L) { return this.layers[L] && this.layers[L].gain.value > 0.003 || ((STATES[this.state] || {})[L] || 0) > 0; }
  _playStep(step, t) {
    const tr = this.track, I = this.inst;
    const bar = Math.floor(step / 16);
    const chord = this.chordAt(bar);
    const sd = tr.stepDur;
    for (const p of tr.parts) {
      if (!this._layerLive(p.layer)) continue;
      const out = this.layers[p.layer];
      const verb = this.verb;
      const ls = step % p.length;
      if (p.inst === 'tremolo') {
        if (ls === 0) { const root = chord[0] + 12; I.strings(out, t, [root, root + 7], sd * 32 * 0.98, 0.9, verb, true); }
        continue;
      }
      if (p.h) {
        const hit = p.h[ls];
        if (!hit) continue;
        const v = hit.v * (p.vol ?? 1);
        if (p.bassline) {
          // root-follow bass: x=root, o=octave up, f=fifth, t=third
          let n = chord[0] + (p.octave ?? -24);
          if (hit.c === 'o') n += 12; else if (hit.c === 'f') n += 7; else if (hit.c === 't') n = chord[1] + (p.octave ?? -24);
          // length: until next hit
          let len = 1;
          while (len < 16 && !p.h[(ls + len) % p.length]) len++;
          I.bass(out, t, n, sd * Math.min(len, p.maxLen || 16) * 0.95, Math.min(1, v), p.kind);
          continue;
        }
        switch (p.inst) {
          case 'kick': I.kick(out, t, v); break;
          case 'snare': I.snare(out, t, v, verb); break;
          case 'clap': I.clap(out, t, v, verb); break;
          case 'hat': I.hat(out, t, v, hit.c === 'o'); break;
          case 'shaker': I.shaker(out, t, v); break;
          case 'rim': I.rim(out, t, v); break;
          case 'crash': I.crash(out, t, v); break;
          case 'tom': I.tom(out, t, v, p.note ? noteToMidi(p.note) : 45); break;
          case 'taiko': I.taiko(out, t, v, verb); break;
          case 'metal': I.metal(out, t, v, (p.note ? noteToMidi(p.note) : 57) + (p.vary ? [0, 3, 7, 5][(ls / 3 | 0) % 4] : 0)); break;
          case 'hiss': I.hiss(out, t, v, sd * 6); break;
          case 'tick': I.tick(out, t, v); break;
          case 'riser': I.riser(out, t, v, sd * (p.dur || 16)); break;
          case 'stab': { const notes = chord.map((n) => n + (p.octave ?? 12)); I.brass(out, t, notes, sd * (p.len || 2), v, verb); break; }
          case 'chordpluck': { const notes = chord.map((n) => n + (p.octave ?? 12)); (p.kind === 'epiano' ? I.epiano(out, t, notes, sd * (p.len || 3), v, verb) : notes.forEach((n) => I.pluck(out, t, n, sd * 2, v * 0.7, verb))); break; }
        }
        continue;
      }
      if (p.ev) {
        const e = p.ev.get(ls);
        if (!e) continue;
        const dur = e.len * sd;
        const v = e.vel * (p.vol ?? 1);
        const tr8 = p.transpose || 0;
        const notes = e.notes.map((n) => n + tr8);
        switch (p.inst) {
          case 'bass': I.bass(out, t, notes[0], dur * 0.95, v, p.kind); break;
          case 'lead': I.lead(out, t, notes[0], dur * 0.95, v, verb, p.kind); break;
          case 'pluck': I.pluck(out, t, notes[0], dur, v, verb, p.kind); break;
          case 'bell': I.bell(out, t, notes[0], dur, v, verb); break;
          case 'vibes': I.vibes(out, t, notes[0], dur, v, verb); break;
          case 'brass': I.brass(out, t, notes, dur, v, verb); break;
          case 'strings': I.strings(out, t, notes, dur, v, verb); break;
          case 'choir': I.choir(out, t, notes, dur, v, verb); break;
          case 'pad': I.pad(out, t, notes, dur, v, verb); break;
          case 'epiano': I.epiano(out, t, notes, dur, v, verb); break;
        }
        continue;
      }
      if (p.chord) {
        if (ls !== 0) continue;
        const dur = sd * p.length;
        const notes = chord.map((n) => n + (p.octave || 0));
        const v = p.vol ?? 1;
        if (p.inst === 'pad') I.pad(out, t, notes, dur, v, verb, p.bright);
        else if (p.inst === 'choir') I.choir(out, t, notes, dur, v, verb);
        else if (p.inst === 'strings') I.strings(out, t, notes, dur, v, verb);
        else if (p.inst === 'epiano') I.epiano(out, t, notes, dur, v, verb);
        continue;
      }
      if (p.arp) {
        const r = p.res || 1;
        if (ls % r !== 0) continue;
        const idx = p.arp[ls / r];
        if (idx === null || idx === undefined || idx < 0) continue;
        const tones = [];
        for (let o = 0; o < 3; o++) for (const n of chord) tones.push(n + 12 * o);
        const n = tones[idx % tones.length] + (p.octave || 0);
        const v = (p.vol ?? 1) * (ls % 4 === 0 ? 1 : 0.75);
        if (p.inst === 'bell') I.bell(out, t, n, sd * r, v, verb);
        else if (p.inst === 'strings') I.strings(out, t, [n], sd * r * 0.9, v, verb);
        else if (p.inst === 'lead') I.lead(out, t, n, sd * r * 0.8, v, verb, p.kind || 'square');
        else I.pluck(out, t, n, sd * r, v, verb, p.kind);
      }
    }
  }
  // One-shot musical stingers (victory, death, vote result)
  sting(kind) {
    if (!this.A.ready) return;
    this._setup();
    const c = this.A.ctx, I = this.inst, t = c.currentTime + 0.03;
    const out = this.stingOut || this.A.musicBus;
    const verb = this.verb, epoch = this.duckEpoch;
    if (kind === 'victory') {
      this.setDuck(0.15, 0.05);
      setTimeout(() => { if (epoch === this.duckEpoch) this.setDuck(1, 0.8); }, 3600);
      const seq = [[62, 0], [66, 0.12], [69, 0.24], [74, 0.36]];
      for (const [n, d] of seq) I.brass(out, t + d, [n, n + 12], 0.2, 1, verb);
      I.brass(out, t + 0.5, [62, 66, 69, 74, 78], 2.4, 1.1, verb);
      I.choir(out, t + 0.5, [62, 66, 69, 74], 2.8, 1.2, verb);
      I.strings(out, t + 0.5, [74, 78, 81, 86], 2.6, 1, verb);
      I.crash(out, t + 0.5, 1.2);
      I.taiko(out, t + 0.5, 1.2, verb);
      I.taiko(out, t + 0.36, 0.8, verb);
      I.kick(out, t + 0.5, 1.2);
      for (let i = 0; i < 6; i++) I.bell(out, t + 0.5 + i * 0.09, 86 + [0, 4, 7, 12, 7, 12][i], 0.4, 0.8, verb);
    } else if (kind === 'death') {
      this.setDuck(0.0, 0.05);
      setTimeout(() => { if (epoch === this.duckEpoch) this.setDuck(1, 1.5); }, 3500);
      const seq = [[67, 0], [66, 0.35], [65, 0.7], [64, 1.05]];
      for (const [n, d] of seq) I.brass(out, t + d, [n - 12, n], d === 1.05 ? 1.4 : 0.32, 0.9, verb);
      I.taiko(out, t + 1.05, 1.2, verb);
      I.pad(out, t + 1.05, [40, 47, 52], 2.4, 1.2, verb, 500);
    } else if (kind === 'vote') {
      I.brass(out, t, [57, 61, 64, 69], 0.9, 1, verb);
      I.taiko(out, t, 1, verb);
      I.crash(out, t, 0.8);
    } else if (kind === 'reveal') {
      I.choir(out, t, [50, 57, 62, 65], 3.5, 1.2, verb);
      I.taiko(out, t, 1.2, verb);
      I.strings(out, t, [38, 45, 50], 3.5, 1.2, verb);
    } else if (kind === 'unlock') {
      [72, 76, 79, 84].forEach((n, i) => I.bell(out, t + i * 0.08, n, 0.6, 0.9, verb));
      I.brass(out, t + 0.32, [60, 64, 67, 72], 0.9, 0.9, verb);
    }
  }
}

export { STATES };
