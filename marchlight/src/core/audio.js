// Fully procedural audio: ambience beds, spatial SFX, synthesized weapons,
// the giant footfalls of Meridian, and a small adaptive score.
import { clamp, rng } from './util.js';

const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
const N = name => { // "D4" -> midi
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name); const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  return base + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (parseInt(m[3]) + 1) * 12;
};

export class Audio {
  constructor() {
    this.ctx = null; this.ready = false;
    this.vol = { master: 0.9, music: 0.55, sfx: 0.9, amb: 0.8 };
    try { Object.assign(this.vol, JSON.parse(localStorage.getItem('marchlight.vol') || '{}')); } catch { /* */ }
    this.loops = new Map();
    this.listenerPos = { x: 0, y: 0, z: 0 };
    this.r = rng(99);
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.ratio.value = 4; this.comp.attack.value = 0.004; this.comp.release.value = 0.25;
    this.master = ctx.createGain(); this.master.gain.value = this.vol.master;
    this.master.connect(this.comp); this.comp.connect(ctx.destination);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.vol.music; this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = this.vol.sfx; this.sfxBus.connect(this.master);
    this.ambBus = ctx.createGain(); this.ambBus.gain.value = this.vol.amb; this.ambBus.connect(this.master);
    // "Stillness" duck: everything except music passes through this so moments of silence can be authored.
    this.worldDuck = ctx.createGain(); this.worldDuck.connect(this.master);
    this.sfxBus.disconnect(); this.sfxBus.connect(this.worldDuck);
    this.ambBus.disconnect(); this.ambBus.connect(this.worldDuck);
    this.uiBus = ctx.createGain(); this.uiBus.gain.value = 0.6; this.uiBus.connect(this.master);

    // Reverbs
    this.verb = ctx.createConvolver(); this.verb.buffer = this._ir(2.4, 2.6);
    this.verbSend = ctx.createGain(); this.verbSend.gain.value = 0.32;
    this.verbSend.connect(this.verb); this.verb.connect(this.worldDuck);
    this.bigVerb = ctx.createConvolver(); this.bigVerb.buffer = this._ir(6.5, 1.6);
    this.bigSend = ctx.createGain(); this.bigSend.gain.value = 0.5; this.bigSend.connect(this.bigVerb); this.bigVerb.connect(this.worldDuck);
    this.musicVerb = ctx.createConvolver(); this.musicVerb.buffer = this._ir(3.5, 2.2);
    this.musicSend = ctx.createGain(); this.musicSend.gain.value = 0.45; this.musicSend.connect(this.musicVerb); this.musicVerb.connect(this.musicBus);

    // Noise buffers
    const len = ctx.sampleRate * 3;
    this.white = ctx.createBuffer(1, len, ctx.sampleRate);
    this.pink = ctx.createBuffer(1, len, ctx.sampleRate);
    this.brown = ctx.createBuffer(1, len, ctx.sampleRate);
    const w = this.white.getChannelData(0), p = this.pink.getChannelData(0), b = this.brown.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const x = Math.random() * 2 - 1; w[i] = x;
      b0 = 0.99886 * b0 + x * 0.0555179; b1 = 0.99332 * b1 + x * 0.0750759; b2 = 0.969 * b2 + x * 0.153852; b3 = 0.8665 * b3 + x * 0.3104856; b4 = 0.55 * b4 + x * 0.5329522; b5 = -0.7616 * b5 - x * 0.016898;
      p[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + x * 0.5362) * 0.11; b6 = x * 0.115926;
      last = (last + 0.02 * x) / 1.02; b[i] = last * 3.5;
    }
    this.ready = true;
    this.music = new Score(this);
    this.applyVolumes();
  }

  applyVolumes() {
    try { localStorage.setItem('marchlight.vol', JSON.stringify(this.vol)); } catch { /* */ }
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.vol.amb, t, 0.05);
  }

  _ir(seconds, decay) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) { const t = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < 200 ? i / 200 : 1); }
    }
    return buf;
  }

  get t() { return this.ctx ? this.ctx.currentTime : 0; }

  setListener(pos, fwd, up) {
    if (!this.ready) return;
    const L = this.ctx.listener; this.listenerPos = pos;
    if (L.positionX) {
      const t = this.ctx.currentTime;
      L.positionX.setTargetAtTime(pos.x, t, 0.02); L.positionY.setTargetAtTime(pos.y, t, 0.02); L.positionZ.setTargetAtTime(pos.z, t, 0.02);
      L.forwardX.setTargetAtTime(fwd.x, t, 0.02); L.forwardY.setTargetAtTime(fwd.y, t, 0.02); L.forwardZ.setTargetAtTime(fwd.z, t, 0.02);
      L.upX.setTargetAtTime(up.x, t, 0.02); L.upY.setTargetAtTime(up.y, t, 0.02); L.upZ.setTargetAtTime(up.z, t, 0.02);
    } else { L.setPosition(pos.x, pos.y, pos.z); L.setOrientation(fwd.x, fwd.y, fwd.z, up.x, up.y, up.z); }
  }

  // Authored world silence (Stillness / title moments)
  duck(level, time = 1.5) { if (!this.ready) return; this.worldDuck.gain.setTargetAtTime(level, this.t, time / 3); }

  panner(pos, ref = 4, max = 400, roll = 1) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = ref; p.maxDistance = max; p.rolloffFactor = roll;
    this.setPannerPos(p, pos);
    return p;
  }
  setPannerPos(p, pos) {
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
  }
  // Output node for a one-shot. pos=null => non-spatial.
  out(pos, { verb = 0.25, big = 0, ref = 4, bus = null } = {}) {
    const g = this.ctx.createGain();
    let node = g;
    if (pos) { const p = this.panner(pos, ref); g.connect(p); node = p; }
    node.connect(bus || this.sfxBus);
    if (verb > 0) { const s = this.ctx.createGain(); s.gain.value = verb; node.connect(s); s.connect(this.verbSend); }
    if (big > 0) { const s = this.ctx.createGain(); s.gain.value = big; node.connect(s); s.connect(this.bigSend); }
    return g;
  }
  noise(type = 'white', dur = 1, when = 0) {
    const s = this.ctx.createBufferSource();
    s.buffer = type === 'pink' ? this.pink : type === 'brown' ? this.brown : this.white;
    s.loop = true;
    const t = when || this.t;
    s.start(t, Math.random() * 2); s.stop(t + dur + 0.05);
    return s;
  }
  osc(type, freq, dur, when = 0) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const t = when || this.t; o.start(t); o.stop(t + dur + 0.05); return o;
  }
  env(g, t, a, peak, d, sustain = 0) {
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
  }
  filter(type, freq, q = 1) { const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; }

  // ---------------------------------------------------------------- SFX
  footstep(pos, surface = 'metal', intensity = 1) {
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.12, ref: 2 });
    o.gain.value = 0.32 * intensity;
    const n = this.noise('white', 0.15), f = this.filter('bandpass', surface === 'metal' ? 2600 + this.r() * 900 : surface === 'grate' ? 3400 : 1200 + this.r() * 400, surface === 'metal' ? 2.5 : 0.9);
    const g = this.ctx.createGain(); this.env(g, t, 0.002, 0.7, 0.09);
    n.connect(f); f.connect(g); g.connect(o);
    const th = this.osc('sine', surface === 'metal' ? 140 : 90, 0.12); const tg = this.ctx.createGain(); this.env(tg, t, 0.002, 0.5, 0.07);
    th.frequency.exponentialRampToValueAtTime(50, t + 0.08); th.connect(tg); tg.connect(o);
    if (surface === 'metal' || surface === 'grate') { const r = this.osc('triangle', 900 + this.r() * 700, 0.2); const rg = this.ctx.createGain(); this.env(rg, t, 0.001, 0.05, 0.18); r.connect(rg); rg.connect(o); }
  }
  land(pos, heavy = 1) {
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.2 }); o.gain.value = 0.5 * heavy;
    const n = this.noise('brown', 0.3); const f = this.filter('lowpass', 600); const g = this.ctx.createGain(); this.env(g, t, 0.003, 1, 0.25);
    n.connect(f); f.connect(g); g.connect(o);
    this.footstep(pos, 'metal', 0.8 * heavy);
  }

  // Meridian's footfall. Delay by speed of sound for distant feet.
  giantStep(pos, intensity = 1, distance = 0) {
    if (!this.ready) return;
    const delay = clamp(distance / 343, 0, 2.5);
    const t = this.t + delay;
    const o = this.out(null, { verb: 0, big: 0.6 });
    o.gain.value = 0.9 * intensity * clamp(1.2 - distance / 900, 0.25, 1);
    // sub boom
    const s = this.osc('sine', 58, 3.2, t); s.frequency.setValueAtTime(58, t); s.frequency.exponentialRampToValueAtTime(24, t + 2.2);
    const sg = this.ctx.createGain(); this.env(sg, t, 0.02, 1.0, 2.8); s.connect(sg); sg.connect(o);
    // crunch
    const n = this.noise('brown', 2.5, t); const f = this.filter('lowpass', 380, 0.7); f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(120, t + 1.8);
    const ng = this.ctx.createGain(); this.env(ng, t, 0.01, 0.9, 2.2); n.connect(f); f.connect(ng); ng.connect(o);
    // metallic ring of the structure
    for (let i = 0; i < 3; i++) {
      const m = this.osc('sine', [97, 151, 233][i] * (0.97 + this.r() * 0.06), 4, t + 0.05);
      const mg = this.ctx.createGain(); this.env(mg, t + 0.05, 0.05, 0.07 / (i + 1), 3.6); m.connect(mg); mg.connect(o);
    }
  }
  // Structural groan before a step: the hull flexing.
  creak(pos, amount = 1) {
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.3, big: 0.3, ref: 30 }); o.gain.value = 0.12 * amount;
    const s = this.osc('sawtooth', 55 + this.r() * 30, 2.2); s.frequency.linearRampToValueAtTime(42 + this.r() * 25, t + 2);
    const f = this.filter('bandpass', 300 + this.r() * 300, 8); f.frequency.linearRampToValueAtTime(180 + this.r() * 200, t + 2);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 0.6); g.gain.linearRampToValueAtTime(0.0001, t + 2.1);
    s.connect(f); f.connect(g); g.connect(o);
  }
  clank(pos, vol = 1, pitch = 1) {
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.35, ref: 8 }); o.gain.value = 0.35 * vol;
    const freqs = [320, 487, 711, 1190].map(f => f * pitch * (0.9 + this.r() * 0.2));
    freqs.forEach((fr, i) => { const s = this.osc('sine', fr, 1.2); const g = this.ctx.createGain(); this.env(g, t, 0.001, 0.4 / (i + 1), 0.6 + this.r() * 0.6); s.connect(g); g.connect(o); });
    const n = this.noise('white', 0.05); const nf = this.filter('highpass', 2000); const ng = this.ctx.createGain(); this.env(ng, t, 0.001, 0.5, 0.04); n.connect(nf); nf.connect(ng); ng.connect(o);
  }
  hiss(pos, dur = 1.5, vol = 1) {
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.2, ref: 5 }); o.gain.value = 0.18 * vol;
    const n = this.noise('white', dur); const f = this.filter('highpass', 3000); const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    n.connect(f); f.connect(g); g.connect(o);
  }

  gunshot(kind, pos, isPlayer = true) {
    if (!this.ready) return;
    const t = this.t;
    const o = this.out(isPlayer ? null : pos, { verb: 0.35, big: 0.25 });
    const P = { pistol: { v: 0.75, f: 1900, body: 180, len: 0.18 }, carbine: { v: 0.8, f: 2600, body: 120, len: 0.22 }, drone: { v: 0.4, f: 3800, body: 400, len: 0.1 } }[kind] || { v: 0.6, f: 2000, body: 150, len: 0.2 };
    o.gain.value = P.v * (isPlayer ? 1 : 0.7);
    // transient crack
    const n = this.noise('white', P.len); const hf = this.filter('highpass', 800); const nf = this.filter('lowpass', P.f + this.r() * 600);
    const ng = this.ctx.createGain(); this.env(ng, t, 0.0005, 1.2, P.len);
    n.connect(hf); hf.connect(nf); nf.connect(ng); ng.connect(o);
    // body thump
    const s = this.osc('sine', P.body, 0.2); s.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    const sg = this.ctx.createGain(); this.env(sg, t, 0.001, 1.0, 0.14); s.connect(sg); sg.connect(o);
    // mechanical click
    const c = this.osc('square', 2200 + this.r() * 400, 0.02, t + 0.01); const cg = this.ctx.createGain(); this.env(cg, t + 0.01, 0.0005, 0.08, 0.015); c.connect(cg); cg.connect(o);
    // outdoor tail
    const tail = this.noise('pink', 0.9); const tf = this.filter('bandpass', 500, 0.6); const tg = this.ctx.createGain();
    tg.gain.setValueAtTime(0.0001, t); tg.gain.linearRampToValueAtTime(0.25, t + 0.04); tg.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
    tail.connect(tf); tf.connect(tg); tg.connect(o);
  }
  dryFire() { if (!this.ready) return; const t = this.t, o = this.out(null, { verb: 0.05 }); o.gain.value = 0.25; const c = this.osc('square', 1800, 0.02); const g = this.ctx.createGain(); this.env(g, t, 0.0005, 0.3, 0.02); c.connect(g); g.connect(o); }
  reloadPart(step) {
    if (!this.ready) return;
    const t = this.t, o = this.out(null, { verb: 0.08 }); o.gain.value = 0.3;
    const f = { out: 900, in: 1300, rack: 650, tap: 2000 }[step] || 1000;
    const n = this.noise('white', 0.08); const bf = this.filter('bandpass', f, 3); const g = this.ctx.createGain(); this.env(g, t, 0.001, 0.9, 0.06);
    n.connect(bf); bf.connect(g); g.connect(o);
    const s = this.osc('triangle', f * 0.5, 0.05); const sg = this.ctx.createGain(); this.env(sg, t, 0.001, 0.25, 0.04); s.connect(sg); sg.connect(o);
  }
  shell(pos) {
    if (!this.ready) return;
    const t = this.t + 0.25 + this.r() * 0.2, o = this.out(pos, { verb: 0.1, ref: 1 }); o.gain.value = 0.08;
    for (let i = 0; i < 3; i++) { const s = this.osc('sine', 4200 + this.r() * 2000, 0.06, t + i * 0.07); const g = this.ctx.createGain(); this.env(g, t + i * 0.07, 0.0005, 0.6 / (i + 1), 0.05); s.connect(g); g.connect(o); }
  }
  impact(pos, mat = 'metal', vol = 1) {
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.2, ref: 3 }); o.gain.value = 0.3 * vol;
    const n = this.noise('white', 0.12); const f = this.filter('bandpass', mat === 'metal' ? 3000 + this.r() * 2000 : 900, mat === 'metal' ? 4 : 1);
    const g = this.ctx.createGain(); this.env(g, t, 0.0005, 1, 0.09); n.connect(f); f.connect(g); g.connect(o);
    if (mat === 'metal') { const s = this.osc('sine', 1800 + this.r() * 2400, 0.25); const sg = this.ctx.createGain(); this.env(sg, t, 0.0005, 0.2, 0.2); s.connect(sg); sg.connect(o); }
    if (mat === 'drone') { const s = this.osc('square', 600 + this.r() * 300, 0.06); const sg = this.ctx.createGain(); this.env(sg, t, 0.0005, 0.25, 0.05); s.connect(sg); sg.connect(o); }
  }
  ricochet(pos) {
    if (!this.ready || this.r() > 0.35) return;
    const t = this.t, o = this.out(pos, { verb: 0.2 }); o.gain.value = 0.12;
    const s = this.osc('sine', 3800, 0.35); s.frequency.exponentialRampToValueAtTime(1200, t + 0.3); const g = this.ctx.createGain(); this.env(g, t, 0.002, 0.6, 0.3); s.connect(g); g.connect(o);
  }
  explosion(pos, size = 1) {
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.4, big: 0.5, ref: 10 * size }); o.gain.value = 0.9 * size;
    const n = this.noise('brown', 2.2); const f = this.filter('lowpass', 1800); f.frequency.exponentialRampToValueAtTime(150, t + 1.5);
    const g = this.ctx.createGain(); this.env(g, t, 0.003, 1.4, 1.9); n.connect(f); f.connect(g); g.connect(o);
    const s = this.osc('sine', 90, 1.2); s.frequency.exponentialRampToValueAtTime(28, t + 0.9); const sg = this.ctx.createGain(); this.env(sg, t, 0.002, 1.2, 1.0); s.connect(sg); sg.connect(o);
    const c = this.noise('white', 0.3); const cf = this.filter('highpass', 1500); const cg = this.ctx.createGain(); this.env(cg, t, 0.001, 0.8, 0.25); c.connect(cf); cf.connect(cg); cg.connect(o);
  }
  cableSnap(pos) {
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.5, big: 0.5, ref: 20 }); o.gain.value = 1;
    const n = this.noise('white', 0.4); const f = this.filter('highpass', 1200); const g = this.ctx.createGain(); this.env(g, t, 0.0005, 1.5, 0.3); n.connect(f); f.connect(g); g.connect(o);
    const w = this.osc('sawtooth', 1400, 1.4); w.frequency.exponentialRampToValueAtTime(60, t + 1.3); const wf = this.filter('bandpass', 900, 3); wf.frequency.exponentialRampToValueAtTime(200, t + 1.3);
    const wg = this.ctx.createGain(); this.env(wg, t, 0.001, 0.6, 1.3); w.connect(wf); wf.connect(wg); wg.connect(o);
    this.clank(pos, 1.5, 0.6);
  }
  metalStress(pos, dur = 2) {
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.4, big: 0.3, ref: 15 }); o.gain.value = 0.5;
    const s = this.osc('sawtooth', 70, dur); s.frequency.linearRampToValueAtTime(45, t + dur);
    const f = this.filter('bandpass', 700, 12); f.frequency.linearRampToValueAtTime(250, t + dur);
    const lfo = this.osc('sine', 9, dur); const lg = this.ctx.createGain(); lg.gain.value = 120; lfo.connect(lg); lg.connect(f.frequency);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 0.2); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(o);
  }
  // Tether
  tetherFire(pos) {
    if (!this.ready) return;
    const t = this.t, o = this.out(null, { verb: 0.15 }); o.gain.value = 0.35;
    const s = this.osc('sawtooth', 240, 0.3); s.frequency.exponentialRampToValueAtTime(1600, t + 0.12);
    const f = this.filter('bandpass', 1400, 2); const g = this.ctx.createGain(); this.env(g, t, 0.002, 0.6, 0.25); s.connect(f); f.connect(g); g.connect(o);
    const n = this.noise('white', 0.15); const nf = this.filter('highpass', 4000); const ng = this.ctx.createGain(); this.env(ng, t, 0.001, 0.4, 0.12); n.connect(nf); nf.connect(ng); ng.connect(o);
  }
  tetherRelease(power = 1) {
    if (!this.ready) return;
    const t = this.t, o = this.out(null, { verb: 0.3, big: 0.2 }); o.gain.value = 0.6 * (0.6 + power * 0.4);
    const s = this.osc('sine', 160, 0.6); s.frequency.exponentialRampToValueAtTime(42, t + 0.45); const g = this.ctx.createGain(); this.env(g, t, 0.003, 1.2, 0.5); s.connect(g); g.connect(o);
    const n = this.noise('pink', 0.5); const f = this.filter('lowpass', 2500); f.frequency.exponentialRampToValueAtTime(200, t + 0.4); const ng = this.ctx.createGain(); this.env(ng, t, 0.002, 0.9, 0.4); n.connect(f); f.connect(ng); ng.connect(o);
    const z = this.osc('square', 880, 0.15); z.frequency.exponentialRampToValueAtTime(220, t + 0.12); const zf = this.filter('lowpass', 3000); const zg = this.ctx.createGain(); this.env(zg, t, 0.001, 0.15, 0.12); z.connect(zf); zf.connect(zg); zg.connect(o);
  }
  cellChime(i) {
    if (!this.ready) return;
    const t = this.t, o = this.out(null, { verb: 0.3, bus: this.uiBus }); o.gain.value = 0.25;
    const s = this.osc('sine', NOTE([74, 78, 81, 86][Math.min(i, 3)]), 0.5); const g = this.ctx.createGain(); this.env(g, t, 0.003, 0.5, 0.45); s.connect(g); g.connect(o);
  }
  // A continuous, controllable loop: returns an object with set(param) & stop()
  loop(id, builder) {
    if (!this.ready) return null;
    if (this.loops.has(id)) return this.loops.get(id);
    const l = builder(); this.loops.set(id, l); return l;
  }
  stopLoop(id, fade = 0.3) {
    const l = this.loops.get(id); if (!l) return;
    this.loops.delete(id);
    const t = this.t; l.gain.gain.cancelScheduledValues(t); l.gain.gain.setTargetAtTime(0.0001, t, fade / 3);
    setTimeout(() => { l.nodes.forEach(n => { try { n.stop(); } catch { /* */ } }); try { l.gain.disconnect(); } catch { /* */ } }, fade * 1000 + 300);
  }
  tetherHum() {
    return this.loop('tetherHum', () => {
      const ctx = this.ctx, g = ctx.createGain(); g.gain.value = 0.0001; g.connect(this.sfxBus);
      const a = ctx.createOscillator(); a.type = 'sawtooth'; a.frequency.value = 110;
      const b = ctx.createOscillator(); b.type = 'sine'; b.frequency.value = 220.7;
      const f = this.filter('lowpass', 900, 6);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 7; const lg = ctx.createGain(); lg.gain.value = 300; lfo.connect(lg); lg.connect(f.frequency);
      a.connect(f); b.connect(f); f.connect(g); a.start(); b.start(); lfo.start();
      g.gain.setTargetAtTime(0.12, this.t, 0.05);
      return { gain: g, nodes: [a, b, lfo], set: (p) => { a.frequency.setTargetAtTime(90 + p * 160, this.t, 0.05); b.frequency.setTargetAtTime(180 + p * 330, this.t, 0.05); f.frequency.setTargetAtTime(500 + p * 2200, this.t, 0.05); } };
    });
  }
  droneBuzz(id, pos) {
    return this.loop('drone' + id, () => {
      const ctx = this.ctx, g = ctx.createGain(); g.gain.value = 0.0001;
      const p = this.panner(pos, 3, 120, 1.4); g.connect(p); p.connect(this.sfxBus);
      const a = ctx.createOscillator(); a.type = 'sawtooth'; a.frequency.value = 180 + this.r() * 40;
      const b = ctx.createOscillator(); b.type = 'square'; b.frequency.value = a.frequency.value * 1.502;
      const f = this.filter('bandpass', 1200, 1.5);
      const am = ctx.createOscillator(); am.frequency.value = 38; const ag = ctx.createGain(); ag.gain.value = 0.4; am.connect(ag); ag.connect(g.gain);
      a.connect(f); b.connect(f); f.connect(g); a.start(); b.start(); am.start();
      g.gain.setTargetAtTime(0.08, this.t, 0.2);
      return { gain: g, nodes: [a, b, am], panner: p, set: (pos, rev = 0) => { this.setPannerPos(p, pos); a.frequency.setTargetAtTime(170 + rev * 120, this.t, 0.1); b.frequency.setTargetAtTime((170 + rev * 120) * 1.502, this.t, 0.1); } };
    });
  }
  ui(kind = 'tick') {
    if (!this.ready) return;
    const t = this.t, o = this.out(null, { verb: 0.1, bus: this.uiBus });
    if (kind === 'tick') { o.gain.value = 0.18; const s = this.osc('sine', 1400, 0.05); const g = this.ctx.createGain(); this.env(g, t, 0.001, 0.4, 0.04); s.connect(g); g.connect(o); }
    else if (kind === 'select') { o.gain.value = 0.25; [880, 1320].forEach((f, i) => { const s = this.osc('triangle', f, 0.15, t + i * 0.05); const g = this.ctx.createGain(); this.env(g, t + i * 0.05, 0.002, 0.4, 0.12); s.connect(g); g.connect(o); }); }
    else if (kind === 'objective') { o.gain.value = 0.3; [N('D5'), N('A5'), N('D6')].forEach((n, i) => { const s = this.osc('sine', NOTE(n), 0.8, t + i * 0.09); const g = this.ctx.createGain(); this.env(g, t + i * 0.09, 0.005, 0.35, 0.7); s.connect(g); g.connect(o); }); }
    else if (kind === 'radio') { o.gain.value = 0.2; const n = this.noise('white', 0.18); const f = this.filter('bandpass', 2500, 1); const g = this.ctx.createGain(); this.env(g, t, 0.002, 0.6, 0.16); n.connect(f); f.connect(g); g.connect(o); const s = this.osc('square', 1800, 0.04); const sg = this.ctx.createGain(); this.env(sg, t, 0.001, 0.1, 0.03); s.connect(sg); sg.connect(o); }
    else if (kind === 'hit') { o.gain.value = 0.22; const s = this.osc('square', 2600, 0.04); const f = this.filter('bandpass', 2600, 4); const g = this.ctx.createGain(); this.env(g, t, 0.0005, 0.6, 0.035); s.connect(f); f.connect(g); g.connect(o); }
    else if (kind === 'kill') { o.gain.value = 0.25; [2000, 1500].forEach((fr, i) => { const s = this.osc('square', fr, 0.05, t + i * 0.06); const f = this.filter('bandpass', fr, 3); const g = this.ctx.createGain(); this.env(g, t + i * 0.06, 0.0005, 0.6, 0.05); s.connect(f); f.connect(g); g.connect(o); }); }
    else if (kind === 'hurt') { o.gain.value = 0.4; const s = this.osc('sine', 120, 0.3); s.frequency.exponentialRampToValueAtTime(60, t + 0.25); const g = this.ctx.createGain(); this.env(g, t, 0.002, 1, 0.25); s.connect(g); g.connect(o); }
    else if (kind === 'heart') { o.gain.value = 0.5; [0, 0.18].forEach(d => { const s = this.osc('sine', 55, 0.15, t + d); const g = this.ctx.createGain(); this.env(g, t + d, 0.005, 1, 0.12); s.connect(g); g.connect(o); }); }
  }
  whoosh(vol = 1) {
    if (!this.ready) return;
    const t = this.t, o = this.out(null, { verb: 0.1 }); o.gain.value = 0.25 * vol;
    const n = this.noise('pink', 0.5); const f = this.filter('bandpass', 400, 1.2); f.frequency.exponentialRampToValueAtTime(2200, t + 0.2); f.frequency.exponentialRampToValueAtTime(500, t + 0.45);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45); n.connect(f); f.connect(g); g.connect(o);
  }
  punch(pos) {
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.15 }); o.gain.value = 0.5;
    const s = this.osc('sine', 140, 0.15); s.frequency.exponentialRampToValueAtTime(50, t + 0.1); const g = this.ctx.createGain(); this.env(g, t, 0.001, 1, 0.12); s.connect(g); g.connect(o);
    this.impact(pos, 'drone', 1);
  }
  kettle(pos) {
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.1, ref: 1.5 }); o.gain.value = 0.06;
    const s = this.osc('sine', 1900, 4); s.frequency.linearRampToValueAtTime(2400, t + 3.5);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.7, t + 2.5); g.gain.linearRampToValueAtTime(0.0001, t + 4); s.connect(g); g.connect(o);
    this.hiss(pos, 4, 0.4);
  }
  rattle(pos, vol = 1) {
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.05, ref: 1 }); o.gain.value = 0.05 * vol;
    for (let i = 0; i < 6; i++) { const s = this.osc('sine', 3000 + this.r() * 3000, 0.03, t + i * 0.035 + this.r() * 0.02); const g = this.ctx.createGain(); this.env(g, t + i * 0.035, 0.0005, 0.5, 0.025); s.connect(g); g.connect(o); }
  }
  chime(pos) { // tram / PA chime
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.4, ref: 15 }); o.gain.value = 0.25;
    [N('E5'), N('C5'), N('G4')].forEach((n, i) => { const s = this.osc('sine', NOTE(n), 1.2, t + i * 0.35); const g = this.ctx.createGain(); this.env(g, t + i * 0.35, 0.005, 0.5, 1.1); s.connect(g); g.connect(o); });
  }
  doorSlide(pos) {
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.2, ref: 3 }); o.gain.value = 0.3;
    const n = this.noise('brown', 0.9); const f = this.filter('bandpass', 300, 1); const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + 0.1); g.gain.linearRampToValueAtTime(0.0001, t + 0.85); n.connect(f); f.connect(g); g.connect(o);
    this.clank(pos, 0.4, 0.8);
  }

  // ---------------------------------------------------------------- AMBIENCE
  // Ambience beds are named loops with a target gain set every frame by the world.
  bed(id, kind) {
    return this.loop('bed:' + id, () => {
      const ctx = this.ctx, g = ctx.createGain(); g.gain.value = 0.0001; g.connect(this.ambBus);
      const nodes = [];
      if (kind === 'hum') { // deep city drone
        const n = this.noise('brown', 1e5); n.loop = true; const f = this.filter('lowpass', 140, 0.5); n.connect(f); f.connect(g); nodes.push(n);
        const o = ctx.createOscillator(); o.frequency.value = 41; const og = ctx.createGain(); og.gain.value = 0.25; o.connect(og); og.connect(g); o.start(); nodes.push(o);
        const o2 = ctx.createOscillator(); o2.frequency.value = 61.7; const og2 = ctx.createGain(); og2.gain.value = 0.08; o2.connect(og2); og2.connect(g); o2.start(); nodes.push(o2);
      } else if (kind === 'wind') {
        const n = this.noise('pink', 1e5); const f = this.filter('bandpass', 500, 0.7); n.connect(f); f.connect(g); nodes.push(n);
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13; const lg = ctx.createGain(); lg.gain.value = 300; lfo.connect(lg); lg.connect(f.frequency); lfo.start(); nodes.push(lfo);
        const n2 = this.noise('white', 1e5); const f2 = this.filter('bandpass', 2200, 3); const g2 = ctx.createGain(); g2.gain.value = 0.15; n2.connect(f2); f2.connect(g2); g2.connect(g); nodes.push(n2);
        const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 0.31; const lg2 = ctx.createGain(); lg2.gain.value = 0.12; lfo2.connect(lg2); lg2.connect(g2.gain); lfo2.start(); nodes.push(lfo2);
      } else if (kind === 'crowd') {
        for (let i = 0; i < 4; i++) {
          const n = this.noise('pink', 1e5); const f = this.filter('bandpass', 350 + i * 260, 4); const vg = ctx.createGain(); vg.gain.value = 0.5;
          const lfo = ctx.createOscillator(); lfo.frequency.value = 0.6 + i * 0.37; const lg = ctx.createGain(); lg.gain.value = 0.4; lfo.connect(lg); lg.connect(vg.gain); lfo.start();
          const lfo2 = ctx.createOscillator(); lfo2.frequency.value = 2.3 + i * 0.9; const lg2 = ctx.createGain(); lg2.gain.value = 120; lfo2.connect(lg2); lg2.connect(f.frequency); lfo2.start();
          n.connect(f); f.connect(vg); vg.connect(g); nodes.push(n, lfo, lfo2);
        }
      } else if (kind === 'machinery') {
        const n = this.noise('brown', 1e5); const f = this.filter('bandpass', 220, 2); n.connect(f); f.connect(g); nodes.push(n);
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 50; const of = this.filter('lowpass', 200, 3); const og = ctx.createGain(); og.gain.value = 0.12; o.connect(of); of.connect(og); og.connect(g); o.start(); nodes.push(o);
        const am = ctx.createOscillator(); am.frequency.value = 1.6; const ag = ctx.createGain(); ag.gain.value = 0.5; am.connect(ag); ag.connect(og.gain); am.start(); nodes.push(am);
      } else if (kind === 'room') { // quiet interior tone
        const n = this.noise('pink', 1e5); const f = this.filter('lowpass', 400, 0.5); const vg = ctx.createGain(); vg.gain.value = 0.3; n.connect(f); f.connect(vg); vg.connect(g); nodes.push(n);
      } else if (kind === 'engine') {
        const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 36; const f = this.filter('lowpass', 160, 4); o.connect(f); f.connect(g); o.start(); nodes.push(o);
        const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 72.4; const og = ctx.createGain(); og.gain.value = 0.3; o2.connect(og); og.connect(g); o2.start(); nodes.push(o2);
        const n = this.noise('white', 1e5); const nf = this.filter('bandpass', 5200, 8); const ng = ctx.createGain(); ng.gain.value = 0.04; n.connect(nf); nf.connect(ng); ng.connect(g); nodes.push(n);
      }
      return { gain: g, nodes, set: () => {} };
    });
  }
  setBed(id, kind, level, time = 0.8) {
    if (!this.ready) return;
    const b = this.bed(id, kind); if (!b) return;
    b.gain.gain.setTargetAtTime(Math.max(level, 0.0001), this.t, time / 3);
  }

  // Birds / distant chatter one-shots
  bird(pos) {
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.25, ref: 10 }); o.gain.value = 0.06;
    const n = 2 + Math.floor(this.r() * 4); const base = 2400 + this.r() * 1800;
    for (let i = 0; i < n; i++) { const s = this.osc('sine', base, 0.12, t + i * 0.13); s.frequency.setValueAtTime(base, t + i * 0.13); s.frequency.exponentialRampToValueAtTime(base * (1.3 + this.r() * 0.4), t + i * 0.13 + 0.08); const g = this.ctx.createGain(); this.env(g, t + i * 0.13, 0.005, 0.6, 0.08); s.connect(g); g.connect(o); }
  }
  // "voice" texture for dialogue: soft murmur under subtitles so lines have presence.
  voice(pos, pitch = 1, chars = 20) {
    if (!this.ready) return;
    const t = this.t, o = this.out(pos, { verb: 0.08, ref: 2, bus: pos ? null : this.uiBus }); o.gain.value = 0.045;
    const syl = Math.min(18, Math.max(2, Math.round(chars / 5)));
    for (let i = 0; i < syl; i++) {
      const st = t + i * (0.11 + this.r() * 0.05);
      const s = this.osc('triangle', (140 + this.r() * 40) * pitch, 0.12, st);
      const f = this.filter('bandpass', (700 + this.r() * 900) * pitch, 3);
      const g = this.ctx.createGain(); this.env(g, st, 0.015, 0.8, 0.09);
      s.connect(f); f.connect(g); g.connect(o);
    }
  }
}

// ---------------------------------------------------------------- SCORE
// A lookahead sequencer with a handful of synthesized instruments and cues.
class Score {
  constructor(audio) {
    this.a = audio; this.ctx = audio.ctx;
    this.cue = null; this.next = 0; this.step = 0; this.bpm = 70;
    this.cueGain = this.ctx.createGain(); this.cueGain.gain.value = 0.0001; this.cueGain.connect(audio.musicBus); this.cueGain.connect(audio.musicSend);
    this.intensity = 0;
    this.timer = setInterval(() => this._tick(), 50);
    this.r = rng(7);
    this.diegetic = new Map();
  }
  play(name, fade = 2) {
    if (this.cue === name) return;
    const t = this.a.t;
    // crossfade: fade old gain then switch
    const old = this.cueGain;
    old.gain.cancelScheduledValues(t); old.gain.setTargetAtTime(0.0001, t, fade / 3);
    setTimeout(() => { try { old.disconnect(); } catch { /* */ } }, fade * 1000 + 2000);
    this.cueGain = this.ctx.createGain(); this.cueGain.gain.value = 0.0001;
    this.cueGain.connect(this.a.musicBus); this.cueGain.connect(this.a.musicSend);
    this.cue = name; this.step = 0; this.next = t + 0.1;
    const def = CUES[name];
    if (def) { this.bpm = def.bpm; this.cueGain.gain.setTargetAtTime(def.gain ?? 0.8, t, fade / 3); }
  }
  stop(fade = 2) { this.play(null, fade); this.cue = null; }
  _tick() {
    if (!this.cue || !CUES[this.cue]) return;
    const def = CUES[this.cue];
    const spb = 60 / this.bpm / 4; // 16th notes
    while (this.next < this.a.t + 0.25) {
      def.step(this, this.step, this.next, spb);
      this.step++; this.next += spb;
    }
  }
  // ---- instruments
  piano(midi, t, dur = 1.5, vel = 0.5, dest = this.cueGain) {
    const ctx = this.ctx, f = NOTE(midi), g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel * 0.5, t + 0.006); g.gain.exponentialRampToValueAtTime(vel * 0.18, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
    const lp = this.a.filter('lowpass', 1800 + vel * 2500, 0.5); lp.frequency.exponentialRampToValueAtTime(600, t + dur);
    [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12], [4.01, 'sine', 0.06]].forEach(([m, type, a]) => {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * m; o.detune.value = (this.r() - 0.5) * 6;
      const og = ctx.createGain(); og.gain.value = a; o.connect(og); og.connect(lp); o.start(t); o.stop(t + dur + 1.3);
    });
    lp.connect(g); g.connect(dest);
  }
  pad(midis, t, dur, vel = 0.2, bright = 900) {
    const ctx = this.ctx, g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + dur * 0.35); g.gain.linearRampToValueAtTime(vel * 0.8, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.8);
    const lp = this.a.filter('lowpass', bright, 0.7);
    midis.forEach(m => [-7, 7].forEach(d => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(m); o.detune.value = d + (this.r() - 0.5) * 4; o.connect(lp); o.start(t); o.stop(t + dur + 1); }));
    const sg = ctx.createGain(); sg.gain.value = 0.18; lp.connect(sg); sg.connect(g); g.connect(this.cueGain);
  }
  strings(midi, t, dur, vel = 0.25) {
    const ctx = this.ctx, g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + Math.min(0.5, dur * 0.4)); g.gain.setValueAtTime(vel, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    const lp = this.a.filter('lowpass', 2200, 0.8);
    const vib = ctx.createOscillator(); vib.frequency.value = 5.2; const vg = ctx.createGain(); vg.gain.value = 5; vib.connect(vg); vib.start(t); vib.stop(t + dur + 0.7);
    [-5, 5, 0].forEach(d => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(midi); o.detune.value = d; vg.connect(o.detune); o.connect(lp); o.start(t); o.stop(t + dur + 0.7); });
    const sg = ctx.createGain(); sg.gain.value = 0.15; lp.connect(sg); sg.connect(g); g.connect(this.cueGain);
  }
  bass(midi, t, dur, vel = 0.5) {
    const ctx = this.ctx, g = ctx.createGain(); this.a.env(g, t, 0.01, vel, dur, 0.0001);
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(midi);
    const lp = this.a.filter('lowpass', 380, 4); lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(200, t + dur);
    const s = ctx.createOscillator(); s.type = 'sine'; s.frequency.value = NOTE(midi - 12); const sg = ctx.createGain(); sg.gain.value = 0.6; s.connect(sg); sg.connect(g);
    o.connect(lp); lp.connect(g); g.connect(this.cueGain); o.start(t); o.stop(t + dur + 0.1); s.start(t); s.stop(t + dur + 0.1);
  }
  kick(t, vel = 0.9) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.18); this.a.env(g, t, 0.002, vel, 0.32);
    o.connect(g); g.connect(this.cueGain); o.start(t); o.stop(t + 0.4);
  }
  snare(t, vel = 0.5) {
    const n = this.a.noise('white', 0.25, t), f = this.a.filter('bandpass', 1900, 0.8), g = this.ctx.createGain(); this.a.env(g, t, 0.001, vel, 0.18);
    n.connect(f); f.connect(g); g.connect(this.cueGain);
    const o = this.a.osc('triangle', 190, 0.12, t), og = this.ctx.createGain(); this.a.env(og, t, 0.001, vel * 0.6, 0.09); o.connect(og); og.connect(this.cueGain);
  }
  hat(t, vel = 0.15) {
    const n = this.a.noise('white', 0.06, t), f = this.a.filter('highpass', 7000), g = this.ctx.createGain(); this.a.env(g, t, 0.001, vel, 0.04);
    n.connect(f); f.connect(g); g.connect(this.cueGain);
  }
  metal(t, vel = 0.3, pitch = 1) { // industrial percussion
    [1, 1.47, 2.09, 2.76].forEach((m, i) => { const o = this.a.osc('sine', 330 * pitch * m, 0.9, t), g = this.ctx.createGain(); this.a.env(g, t, 0.001, vel / (i + 1.5), 0.5 + i * 0.1); o.connect(g); g.connect(this.cueGain); });
  }
  boom(t, vel = 0.9) {
    const o = this.a.osc('sine', 70, 3, t), g = this.ctx.createGain(); o.frequency.exponentialRampToValueAtTime(30, t + 2); this.a.env(g, t, 0.02, vel, 2.6);
    o.connect(g); g.connect(this.cueGain);
    const n = this.a.noise('brown', 2.5, t), f = this.a.filter('lowpass', 300), ng = this.ctx.createGain(); this.a.env(ng, t, 0.01, vel * 0.6, 2.2); n.connect(f); f.connect(ng); ng.connect(this.cueGain);
  }
  // Diegetic instrument for the street musician (spatialized)
  busker(pos, active) {
    if (!this.a.ready) return;
    let d = this.diegetic.get('busker');
    if (!d && active) {
      const g = this.ctx.createGain(); g.gain.value = 0.0001; const p = this.a.panner(pos, 3, 80, 1.2);
      g.connect(p); p.connect(this.a.sfxBus); const s = this.ctx.createGain(); s.gain.value = 0.3; p.connect(s); s.connect(this.a.verbSend);
      d = { g, p, next: this.a.t + 0.2, step: 0 }; this.diegetic.set('busker', d);
      d.timer = setInterval(() => {
        const spb = 60 / 96 / 2;
        while (d.next < this.a.t + 0.3) { buskerStep(this, d, d.step, d.next, spb); d.step++; d.next += spb; }
      }, 60);
    }
    if (d) { d.g.gain.setTargetAtTime(active ? 0.55 : 0.0001, this.a.t, 0.4); this.a.setPannerPos(d.p, pos); }
  }
  pluck(midi, t, vel, dest) { // lyre-like pluck
    const ctx = this.ctx, f = NOTE(midi), g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    const lp = this.a.filter('lowpass', 3500, 1); lp.frequency.exponentialRampToValueAtTime(700, t + 0.6);
    [[1, 'sawtooth', 0.4], [2, 'triangle', 0.3], [3.0, 'sine', 0.15]].forEach(([m, type, a]) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * m; o.detune.value = (this.r() - 0.5) * 8; const og = ctx.createGain(); og.gain.value = a; o.connect(og); og.connect(lp); o.start(t); o.stop(t + 1.7); });
    lp.connect(g); g.connect(dest);
  }
}

// Theme: D dorian. The four-note "footstep" figure D–A–G–F recurs in every cue.
const THEME = ['D4', 'A4', 'G4', 'F4', 'E4', 'F4', 'D4', 'C4', 'D4', 'F4', 'A4', 'C5', 'Bb4', 'A4', 'G4', 'A4'].map(N);
const CHORDS = [['D3', 'A3', 'F4'], ['Bb2', 'F3', 'D4'], ['F3', 'C4', 'A4'], ['C3', 'G3', 'E4']].map(c => c.map(N));

const CUES = {
  // gentle morning: sparse piano over a warm pad
  morning: { bpm: 66, gain: 0.7, step(s, i, t, spb) {
    const bar = Math.floor(i / 16), b = i % 16;
    if (b === 0) s.pad(CHORDS[bar % 4], t, spb * 16, 0.16, 700);
    if (b === 0 || b === 6 || b === 10) { const n = THEME[(bar * 3 + b / 2) % THEME.length | 0]; s.piano(n + 12, t, 1.6, 0.32); }
    if (b === 8 && bar % 2 === 1) s.piano(CHORDS[bar % 4][0] + 12, t, 2, 0.18);
  } },
  // the exterior: vast, slow, a pulse like footsteps
  exterior: { bpm: 60, gain: 0.75, step(s, i, t, spb) {
    const bar = Math.floor(i / 16), b = i % 16;
    if (b === 0) { s.pad(CHORDS[bar % 4].map(n => n - 12).concat([CHORDS[bar % 4][2]]), t, spb * 16, 0.2, 1200); s.bass(CHORDS[bar % 4][0] - 12, t, spb * 14, 0.25); }
    if (b === 0 && bar % 2 === 0) s.boom(t, 0.35);
    if (bar >= 2 && (b === 4 || b === 12)) s.strings(THEME[(bar * 2 + (b === 12 ? 1 : 0)) % THEME.length] + 12, t, spb * 7, 0.12);
  } },
  // combat: driving industrial percussion and ostinato bass
  combat: { bpm: 128, gain: 0.7, step(s, i, t, spb) {
    const bar = Math.floor(i / 16), b = i % 16;
    if (b === 0 || b === 6 || b === 10) s.kick(t, 0.8);
    if (b === 4 || b === 12) s.snare(t, 0.45);
    if (b % 2 === 0) s.hat(t, b % 4 === 0 ? 0.08 : 0.04);
    if (b === 14 && bar % 2 === 1) s.metal(t, 0.25, 0.8);
    const root = CHORDS[bar % 4][0] - 12; const pat = [0, 0, 12, 0, 7, 0, 10, 0];
    if (b % 2 === 0) s.bass(root + pat[(b / 2) % 8], t, spb * 1.6, 0.32);
    if (b === 0) s.pad(CHORDS[bar % 4], t, spb * 16, 0.1, 1400);
    if (bar % 4 >= 2 && b % 4 === 0) s.strings(THEME[(bar * 4 + b / 4) % THEME.length] + 12, t, spb * 3.5, 0.08);
  } },
  // rescue: urgent string ostinato, rising
  rescue: { bpm: 140, gain: 0.8, step(s, i, t, spb) {
    const bar = Math.floor(i / 16), b = i % 16;
    const ch = CHORDS[bar % 4];
    if (b % 2 === 0) s.strings(ch[(b / 2) % 3] + 12, t, spb * 1.6, 0.09);
    if (b === 0 || b === 8) s.kick(t, 0.9);
    if (b === 0) { s.bass(ch[0] - 12, t, spb * 15, 0.35); s.boom(t, 0.4); }
    if (b === 12) s.snare(t, 0.4);
    if (b === 4 || b === 12) s.metal(t, 0.18, 1.2);
  } },
  // stillness: almost nothing. A glassy, held tone.
  stillness: { bpm: 40, gain: 0.6, step(s, i, t, spb) {
    const b = i % 32;
    if (b === 0) { s.pad([N('D5'), N('A5')], t, spb * 30, 0.08, 3000); }
    if (b === 16) s.piano(N('E6'), t, 3, 0.12);
  } },
  // tension: low drone + heartbeat pulses
  tension: { bpm: 72, gain: 0.7, step(s, i, t, spb) {
    const bar = Math.floor(i / 16), b = i % 16;
    if (b === 0) { s.pad([N('D2'), N('A2'), N('Eb3')], t, spb * 16, 0.18, 500); }
    if (b === 0 || b === 3) s.kick(t, 0.35);
    if (b === 8 && bar % 2) s.metal(t, 0.1, 0.5);
  } },
  // title: the full theme on piano with strings, synced to booms
  title: { bpm: 58, gain: 0.95, step(s, i, t, spb) {
    const bar = Math.floor(i / 16), b = i % 16;
    if (b === 0) { s.boom(t, 0.8); s.pad(CHORDS[bar % 4], t, spb * 16, 0.22, 1500); s.bass(CHORDS[bar % 4][0] - 12, t, spb * 15, 0.3); }
    if (b % 4 === 0) s.piano(THEME[(bar * 4 + b / 4) % THEME.length] + 12, t, 1.8, 0.4);
    if (bar >= 1 && b === 0) s.strings(THEME[(bar * 4) % THEME.length] + 12, t, spb * 15, 0.16);
    if (bar >= 2 && b === 8) s.strings(THEME[(bar * 4 + 2) % THEME.length] + 24, t, spb * 7, 0.08);
  } },
  menu: { bpm: 54, gain: 0.6, step(s, i, t, spb) {
    const bar = Math.floor(i / 16), b = i % 16;
    if (b === 0) s.pad(CHORDS[bar % 4], t, spb * 16, 0.14, 800);
    if (b === 0 && bar % 2 === 0) s.boom(t, 0.3);
    if (b === 8) s.piano(THEME[bar % THEME.length] + 12, t, 2.5, 0.22);
  } },
};

// The market busker: a looping folk tune in the same key so the theme is "of the city".
const BUSK = ['D5', 'F5', 'A5', 'G5', 'F5', 'E5', 'D5', '-', 'C5', 'D5', 'E5', 'F5', 'E5', 'C5', 'A4', '-', 'D5', 'F5', 'A5', 'C6', 'Bb5', 'A5', 'G5', 'A5', 'F5', 'E5', 'D5', 'C5', 'D5', '-', '-', '-'];
function buskerStep(s, d, i, t, spb) {
  const n = BUSK[i % BUSK.length];
  if (n !== '-') s.pluck(N(n), t, 0.22, d.g);
  if (i % 4 === 0) { const ch = CHORDS[Math.floor(i / 8) % 4]; s.pluck(ch[0], t, 0.14, d.g); s.pluck(ch[1], t + 0.03, 0.1, d.g); }
}
