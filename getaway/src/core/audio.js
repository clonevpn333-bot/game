// GETAWAY! — procedural spatial audio engine (Web Audio). Every sound is synthesized live.
import { clamp, rand, lerp } from './utils.js';

const SPEED_OF_SOUND = 343;

export class AudioEngine {
  constructor() {
    this.ctx = null; this.ready = false; this.voices = 0; this.maxVoices = 56;
    this.listener = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 };
    this.underwater = false; this.slowmo = 1;
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -8; this.limiter.knee.value = 6; this.limiter.ratio.value = 12; this.limiter.attack.value = 0.003; this.limiter.release.value = 0.2;
    this.masterFilter = ctx.createBiquadFilter(); this.masterFilter.type = 'lowpass'; this.masterFilter.frequency.value = 20000;
    this.master.connect(this.masterFilter); this.masterFilter.connect(this.limiter); this.limiter.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    this.musicBus = ctx.createGain(); this.musicBus.connect(this.master);
    this.amb = ctx.createGain(); this.amb.gain.value = 0.6; this.amb.connect(this.sfx);
    this.uiBus = ctx.createGain(); this.uiBus.gain.value = 0.6; this.uiBus.connect(this.master);
    // shared reverb (generated impulse response)
    this.reverb = ctx.createConvolver(); this.reverb.buffer = this._impulse(2.6, 2.8);
    this.reverbSend = ctx.createGain(); this.reverbSend.gain.value = 0.35;
    this.reverbSend.connect(this.reverb); this.reverb.connect(this.sfx);
    this.noiseW = this._noise('white'); this.noiseP = this._noise('pink'); this.noiseB = this._noise('brown');
    this.distCurve = this._distCurve(3.5); this.hardCurve = this._distCurve(12);
    this.ready = true;
    this._startAmbience();
  }
  get t() { return this.ctx ? this.ctx.currentTime : 0; }
  setVolumes(master, music, sfx) {
    if (!this.ready) return;
    this.master.gain.setTargetAtTime(master, this.t, 0.05);
    this.musicBus.gain.setTargetAtTime(music, this.t, 0.05);
    this.sfx.gain.setTargetAtTime(sfx, this.t, 0.05);
  }
  _noise(kind) {
    const len = this.ctx.sampleRate * 2; const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate); const d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w;
      else if (kind === 'pink') { b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
      else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    }
    return b;
  }
  _impulse(sec, decay) {
    const rate = this.ctx.sampleRate, len = Math.floor(rate * sec); const b = this.ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) { const t = i / len; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < rate * 0.01 ? i / (rate * 0.01) : 1); } }
    return b;
  }
  _distCurve(k) { const n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); } return c; }

  updateListener(p, f, vel) {
    if (!this.ready) return;
    const l = this.ctx.listener, t = this.t;
    if (l.positionX) {
      l.positionX.setTargetAtTime(p.x, t, 0.02); l.positionY.setTargetAtTime(p.y, t, 0.02); l.positionZ.setTargetAtTime(p.z, t, 0.02);
      l.forwardX.setTargetAtTime(f.x, t, 0.02); l.forwardY.setTargetAtTime(f.y, t, 0.02); l.forwardZ.setTargetAtTime(f.z, t, 0.02);
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else { l.setPosition(p.x, p.y, p.z); l.setOrientation(f.x, f.y, f.z, 0, 1, 0); }
    this.listener.x = p.x; this.listener.y = p.y; this.listener.z = p.z;
    if (vel) { this.listener.vx = vel.x; this.listener.vy = vel.y; this.listener.vz = vel.z; }
  }
  setUnderwater(on) {
    if (!this.ready || on === this.underwater) return; this.underwater = on;
    this.masterFilter.frequency.setTargetAtTime(on ? 600 : 20000, this.t, 0.1);
  }
  setSlowmo(s) { // muffles and pitches world during slow motion
    if (!this.ready) return; this.slowmo = s;
    if (!this.underwater) this.masterFilter.frequency.setTargetAtTime(s < 0.9 ? 2200 : 20000, this.t, 0.08);
  }
  doppler(pos, vel) {
    const L = this.listener; const dx = pos.x - L.x, dy = pos.y - L.y, dz = pos.z - L.z; const d = Math.hypot(dx, dy, dz) || 1;
    const nx = dx / d, ny = dy / d, nz = dz / d;
    const vs = vel ? vel.x * nx + vel.y * ny + vel.z * nz : 0; const vl = L.vx * nx + L.vy * ny + L.vz * nz;
    return clamp((SPEED_OF_SOUND + vl) / (SPEED_OF_SOUND + vs), 0.6, 1.6);
  }
  dist(pos) { const L = this.listener; return Math.hypot(pos.x - L.x, pos.y - L.y, pos.z - L.z); }

  // ---------- routing helpers ----------
  _panner(pos, ref = 6, rolloff = 1) {
    const p = this.ctx.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse';
    p.refDistance = ref; p.maxDistance = 2000; p.rolloffFactor = rolloff;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
    return p;
  }
  // creates an output chain for a one-shot: returns input node
  _out(pos, { ref = 6, wet = 0.25, gain = 1, bus = null, life = 2 } = {}) {
    const ctx = this.ctx; const g = ctx.createGain(); g.gain.value = gain;
    let tail = g;
    if (pos) {
      const d = this.dist(pos);
      if (d > 30) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = clamp(18000 * Math.pow(30 / d, 0.9), 900, 18000); g.connect(lp); tail = lp; }
      const p = this._panner(pos, ref); tail.connect(p); p.connect(bus || this.sfx);
    } else tail.connect(bus || this.sfx);
    if (wet > 0) { const s = ctx.createGain(); s.gain.value = wet; g.connect(s); s.connect(this.reverbSend); }
    this.voices++; setTimeout(() => { this.voices--; try { g.disconnect(); } catch (e) {} }, life * 1000 + 200);
    return g;
  }
  _src(buf, rate = 1, loop = false, offset = Math.random() * 1.5) {
    const s = this.ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate; s.loop = loop; s._off = loop ? 0 : offset; return s;
  }
  _start(s, t, dur) { s.start(t, s._off || 0); if (dur) s.stop(t + dur); }
  _filt(type, f, q = 1) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
  _env(param, t, a, peak, d, end = 0.0001) { param.cancelScheduledValues(t); param.setValueAtTime(0.0001, t); param.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); param.exponentialRampToValueAtTime(Math.max(end, 0.0001), t + a + d); }
  _can(pos, maxD = 400) { return this.ready && this.voices < this.maxVoices && (!pos || this.dist(pos) < maxD); }

  // ---------- one-shot SFX ----------
  gunshot(pos, kind = 'pistol', isPlayer = false) {
    if (!this._can(pos, 600)) return; const ctx = this.ctx, t = this.t;
    const cfg = { pistol: [1.0, 2400, 0.18, 120], smg: [0.8, 3200, 0.12, 140], rifle: [1.25, 1800, 0.22, 90], shotgun: [1.5, 1200, 0.32, 70], heavy: [1.6, 700, 0.4, 55], sniper: [1.6, 1500, 0.35, 70] }[kind] || [1, 2000, 0.2, 100];
    const [vol, fc, dur, thump] = cfg;
    const out = this._out(isPlayer ? null : pos, { ref: 10, wet: 0.5, gain: vol * (isPlayer ? 0.55 : 1), life: 2.5 });
    // crack
    const n = this._src(this.noiseW, rand(0.9, 1.1)); const f = this._filt('bandpass', fc * rand(0.9, 1.1), 0.7); const g = ctx.createGain();
    this._env(g.gain, t, 0.001, 1, dur); n.connect(f); f.connect(g); g.connect(out); this._start(n, t, dur + 0.05);
    // body thump
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(thump * 2.2, t); o.frequency.exponentialRampToValueAtTime(thump * 0.6, t + 0.09);
    const og = ctx.createGain(); this._env(og.gain, t, 0.001, 0.9, 0.12); const ws = ctx.createWaveShaper(); ws.curve = this.hardCurve;
    o.connect(ws); ws.connect(og); og.connect(out); o.start(t); o.stop(t + 0.2);
    // tail rumble
    const n2 = this._src(this.noiseB, 1); const g2 = ctx.createGain(); this._env(g2.gain, t + 0.01, 0.01, 0.35, 0.6); n2.connect(g2); g2.connect(out); this._start(n2, t, 0.8);
  }
  dryFire() { this.click(null, 3000, 0.25); }
  click(pos, f = 2000, vol = 0.3) {
    if (!this._can(pos)) return; const ctx = this.ctx, t = this.t; const out = this._out(pos, { ref: 3, wet: 0.05, gain: vol, life: 0.3 });
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f; const g = ctx.createGain(); this._env(g.gain, t, 0.001, 0.5, 0.03);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.06);
  }
  reload(pos, kind) {
    if (!this._can(pos)) return; const t = this.t;
    [0, 0.35, 0.8].forEach((dt, i) => setTimeout(() => this.metalTick(pos, i === 2 ? 1400 : 900 + i * 300, 0.4), dt * 1000));
  }
  metalTick(pos, f = 1200, vol = 0.3) {
    if (!this._can(pos)) return; const ctx = this.ctx, t = this.t; const out = this._out(pos, { ref: 3, wet: 0.1, gain: vol, life: 0.4 });
    [1, 2.76, 5.4].forEach((m, i) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * m * rand(0.98, 1.02); const g = ctx.createGain(); this._env(g.gain, t, 0.001, 0.4 / (i + 1), 0.08 + 0.05 / (i + 1)); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.2); });
  }
  shell(pos) { if (Math.random() < 0.6) setTimeout(() => this.metalTick(pos, rand(3000, 4200), 0.12), rand(250, 450)); }
  ricochet(pos) {
    if (!this._can(pos, 120)) return; const ctx = this.ctx, t = this.t; const out = this._out(pos, { ref: 4, wet: 0.3, gain: 0.25, life: 0.6 });
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(rand(2500, 4000), t); o.frequency.exponentialRampToValueAtTime(rand(700, 1100), t + 0.35);
    const g = ctx.createGain(); this._env(g.gain, t, 0.002, 0.4, 0.35); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.4);
  }
  bulletImpact(pos, mat = 'concrete') {
    if (!this._can(pos, 150)) return; const ctx = this.ctx, t = this.t; const out = this._out(pos, { ref: 4, wet: 0.2, gain: 0.5, life: 0.4 });
    const n = this._src(this.noiseW, 1); const f = this._filt(mat === 'metal' ? 'bandpass' : 'lowpass', mat === 'metal' ? 3500 : 2200, mat === 'metal' ? 3 : 0.7);
    const g = ctx.createGain(); this._env(g.gain, t, 0.001, 0.8, 0.06); n.connect(f); f.connect(g); g.connect(out); this._start(n, t, 0.1);
    if (mat === 'metal') this.metalTick(pos, rand(1800, 2600), 0.25);
    if (mat === 'glass') this.glass(pos, 0.4);
    if (Math.random() < 0.15 && mat !== 'flesh') this.ricochet(pos);
  }
  explosion(pos, size = 1) {
    if (!this.ready) return; const ctx = this.ctx, t = this.t; const d = this.dist(pos);
    const out = this._out(pos, { ref: 25 * size, wet: 0.7, gain: 1.5 * size, life: 5 });
    // initial blast
    const n = this._src(this.noiseW, 0.8); const lp = this._filt('lowpass', 5000, 0.5); lp.frequency.setValueAtTime(6000, t); lp.frequency.exponentialRampToValueAtTime(300, t + 1.2);
    const g = ctx.createGain(); this._env(g.gain, t, 0.003, 1.2, 1.4); const ws = ctx.createWaveShaper(); ws.curve = this.distCurve;
    n.connect(lp); lp.connect(ws); ws.connect(g); g.connect(out); this._start(n, t, 2);
    // sub boom
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(28, t + 0.8);
    const og = ctx.createGain(); this._env(og.gain, t, 0.005, 1.6, 1.3); o.connect(og); og.connect(out); o.start(t); o.stop(t + 1.5);
    // rolling rumble + crackle
    const n2 = this._src(this.noiseB, 0.6); const g2 = ctx.createGain(); this._env(g2.gain, t + 0.05, 0.2, 0.9, 3.2); n2.connect(g2); g2.connect(out); this._start(n2, t, 4);
    for (let i = 0; i < 10; i++) { const tt = t + 0.1 + Math.random() * 1.6; const c = this._src(this.noiseW, 1); const cf = this._filt('highpass', 2500); const cg = ctx.createGain(); this._env(cg.gain, tt, 0.001, rand(0.1, 0.35), 0.03); c.connect(cf); cf.connect(cg); cg.connect(out); this._start(c, tt, 0.06); }
    if (d < 60) setTimeout(() => this.debrisRain(pos), 500);
  }
  debrisRain(pos) { for (let i = 0; i < 6; i++) setTimeout(() => this.impact({ x: pos.x + rand(-8, 8), y: pos.y, z: pos.z + rand(-8, 8) }, rand(0.15, 0.4), 'metal'), rand(0, 1500)); }
  impact(pos, intensity = 1, mat = 'metal') {
    if (!this._can(pos, 250)) return; const ctx = this.ctx, t = this.t; intensity = clamp(intensity, 0.05, 2);
    const out = this._out(pos, { ref: 8, wet: 0.35, gain: 0.9 * intensity, life: 1.6 });
    const n = this._src(this.noiseW, 0.7); const lp = this._filt('lowpass', 900 + 2500 * intensity); const g = ctx.createGain(); this._env(g.gain, t, 0.002, 1, 0.15 + 0.3 * intensity);
    n.connect(lp); lp.connect(g); g.connect(out); this._start(n, t, 0.6);
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.25); const og = ctx.createGain(); this._env(og.gain, t, 0.002, 1.1 * intensity, 0.3); o.connect(og); og.connect(out); o.start(t); o.stop(t + 0.4);
    if (mat === 'metal') { // crunchy panel resonances
      const base = rand(180, 420);
      [1, 1.47, 2.09, 2.83, 3.9].forEach((m, i) => { const oo = ctx.createOscillator(); oo.type = i % 2 ? 'triangle' : 'sine'; oo.frequency.value = base * m * rand(0.97, 1.03); const gg = ctx.createGain(); this._env(gg.gain, t + i * 0.006, 0.002, 0.25 * intensity / (1 + i * 0.4), 0.25 + 0.4 * intensity); oo.connect(gg); gg.connect(out); oo.start(t); oo.stop(t + 1.2); });
      if (intensity > 0.6) this.glass(pos, intensity * 0.5);
    }
  }
  scrape(pos, intensity = 0.5) { // grinding metal (called repeatedly while scraping)
    if (!this._can(pos, 120)) return; const ctx = this.ctx, t = this.t; const out = this._out(pos, { ref: 6, wet: 0.2, gain: 0.35 * intensity, life: 0.5 });
    const n = this._src(this.noiseW, 1); const f = this._filt('bandpass', rand(2000, 4500), 6); const g = ctx.createGain(); this._env(g.gain, t, 0.01, 1, 0.2); n.connect(f); f.connect(g); g.connect(out); this._start(n, t, 0.3);
  }
  glass(pos, intensity = 1) {
    if (!this._can(pos, 200)) return; const ctx = this.ctx, t = this.t; const out = this._out(pos, { ref: 6, wet: 0.4, gain: 0.7 * intensity, life: 1.8 });
    const n = this._src(this.noiseW, 1.2); const hp = this._filt('highpass', 3000); const g = ctx.createGain(); this._env(g.gain, t, 0.001, 1, 0.25); n.connect(hp); hp.connect(g); g.connect(out); this._start(n, t, 0.3);
    for (let i = 0; i < 14; i++) { const tt = t + Math.random() * 0.9; const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = rand(2500, 7500); const gg = ctx.createGain(); this._env(gg.gain, tt, 0.001, rand(0.05, 0.25), rand(0.03, 0.15)); o.connect(gg); gg.connect(out); o.start(tt); o.stop(tt + 0.2); }
  }
  thud(pos, intensity = 0.5) { // body / soft impact (non-graphic)
    if (!this._can(pos, 120)) return; const ctx = this.ctx, t = this.t; const out = this._out(pos, { ref: 5, wet: 0.15, gain: 0.8 * intensity, life: 0.5 });
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.12); const g = ctx.createGain(); this._env(g.gain, t, 0.002, 1, 0.15); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.2);
    const n = this._src(this.noiseP, 1); const lp = this._filt('lowpass', 700); const ng = ctx.createGain(); this._env(ng.gain, t, 0.002, 0.6, 0.1); n.connect(lp); lp.connect(ng); ng.connect(out); this._start(n, t, 0.15);
  }
  punch(pos) { this.thud(pos, 0.9); const ctx = this.ctx; if (!this.ready) return; const t = this.t; const out = this._out(pos, { ref: 4, wet: 0.1, gain: 0.5, life: 0.3 }); const n = this._src(this.noiseW, 1); const f = this._filt('bandpass', 1500, 1); const g = ctx.createGain(); this._env(g.gain, t, 0.001, 1, 0.05); n.connect(f); f.connect(g); g.connect(out); this._start(n, t, 0.08); }
  footstep(pos, run = false, surface = 'concrete') {
    if (!this._can(pos, 40)) return; const ctx = this.ctx, t = this.t; const out = this._out(pos, { ref: 2, wet: 0.08, gain: run ? 0.32 : 0.18, life: 0.2 });
    const n = this._src(this.noiseW, 1); const f = this._filt(surface === 'metal' ? 'bandpass' : 'lowpass', surface === 'metal' ? 2200 : surface === 'sand' ? 900 : 1600, surface === 'metal' ? 4 : 0.8); const g = ctx.createGain(); this._env(g.gain, t, 0.002, 1, surface === 'sand' ? 0.09 : 0.05);
    n.connect(f); f.connect(g); g.connect(out); this._start(n, t, 0.12);
    if (surface === 'water') this.splash(pos, 0.15);
  }
  splash(pos, size = 1) {
    if (!this._can(pos, 200)) return; const ctx = this.ctx, t = this.t; const out = this._out(pos, { ref: 6, wet: 0.3, gain: 0.8 * size, life: 2 });
    const n = this._src(this.noiseW, 1); const f = this._filt('lowpass', 2500); f.frequency.setValueAtTime(5000, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.9 * size + 0.2);
    const g = ctx.createGain(); this._env(g.gain, t, 0.01, 1, 0.5 + size); n.connect(f); f.connect(g); g.connect(out); this._start(n, t, 2);
  }
  whoosh(pos, vol = 0.5, dur = 0.5) {
    if (!this._can(pos)) return; const ctx = this.ctx, t = this.t; const out = this._out(pos, { ref: 4, wet: 0.2, gain: vol, life: dur + 0.3 });
    const n = this._src(this.noiseP, 1); const f = this._filt('bandpass', 400, 1.5); f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + dur * 0.6); f.frequency.exponentialRampToValueAtTime(600, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(out); this._start(n, t, dur + 0.1);
  }
  door(pos, open = true) { this.thud(pos, open ? 0.25 : 0.55); if (!open) this.metalTick(pos, 600, 0.15); }
  horn(pos, dur = 0.4, pitch = 1) {
    if (!this._can(pos, 250)) return; const ctx = this.ctx, t = this.t; const out = this._out(pos, { ref: 10, wet: 0.25, gain: 0.35, life: dur + 0.2 });
    [370, 466].forEach((f) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * pitch; const lp = this._filt('lowpass', 1800); const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.4, t + 0.02); g.gain.setValueAtTime(0.4, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.05); o.connect(lp); lp.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.1); });
  }
  ui(kind = 'click') {
    if (!this.ready) return; const ctx = this.ctx, t = this.t; const g = ctx.createGain(); g.connect(this.uiBus);
    const tone = (f, dt, d, type = 'sine', v = 0.3) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; const gg = ctx.createGain(); this._env(gg.gain, t + dt, 0.003, v, d); o.connect(gg); gg.connect(g); o.start(t + dt); o.stop(t + dt + d + 0.05); };
    if (kind === 'click') tone(1800, 0, 0.04, 'triangle', 0.2);
    else if (kind === 'hover') tone(1200, 0, 0.03, 'sine', 0.08);
    else if (kind === 'back') { tone(900, 0, 0.05, 'triangle', 0.2); tone(600, 0.04, 0.06, 'triangle', 0.15); }
    else if (kind === 'objective') { tone(880, 0, 0.12, 'triangle', 0.25); tone(1320, 0.09, 0.2, 'triangle', 0.2); }
    else if (kind === 'cash') { [1500, 2000, 2600].forEach((f, i) => tone(f, i * 0.05, 0.12, 'square', 0.08)); }
    else if (kind === 'stunt') { tone(660, 0, 0.08, 'square', 0.08); tone(990, 0.06, 0.15, 'square', 0.08); }
    else if (kind === 'beep') tone(2200, 0, 0.07, 'square', 0.12);
    else if (kind === 'beepUrgent') { tone(2600, 0, 0.05, 'square', 0.16); tone(2600, 0.09, 0.05, 'square', 0.16); }
    else if (kind === 'radio') { const n = this._src(this.noiseW, 1); const f = this._filt('bandpass', 2500, 2); const gg = ctx.createGain(); this._env(gg.gain, t, 0.002, 0.12, 0.08); n.connect(f); f.connect(gg); gg.connect(g); this._start(n, t, 0.1); tone(1400, 0.02, 0.05, 'square', 0.05); }
    else if (kind === 'star') { tone(520, 0, 0.1, 'sawtooth', 0.08); tone(390, 0.1, 0.18, 'sawtooth', 0.08); }
    else if (kind === 'pickup') { tone(1046, 0, 0.06, 'triangle', 0.2); tone(1568, 0.05, 0.1, 'triangle', 0.2); }
    else if (kind === 'hit') tone(3200, 0, 0.03, 'square', 0.06);
    else if (kind === 'fail') { tone(300, 0, 0.3, 'sawtooth', 0.1); tone(200, 0.2, 0.5, 'sawtooth', 0.1); }
    setTimeout(() => g.disconnect(), 1500);
  }
  // radio "voice" chirps that accompany subtitles (abstract, non-verbal)
  voiceChirp(pitch = 1, n = 3) {
    if (!this.ready) return; const ctx = this.ctx; let t = this.t + 0.05; const g = ctx.createGain(); g.gain.value = 0.05; g.connect(this.uiBus);
    const bp = this._filt('bandpass', 1400, 1.2); bp.connect(g);
    for (let i = 0; i < n; i++) { const o = ctx.createOscillator(); o.type = 'sawtooth'; const f = 160 * pitch * rand(0.85, 1.25); o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * rand(0.8, 1.2), t + 0.08); const gg = ctx.createGain(); this._env(gg.gain, t, 0.01, 1, 0.07); o.connect(gg); gg.connect(bp); o.start(t); o.stop(t + 0.12); t += rand(0.08, 0.13); }
    setTimeout(() => g.disconnect(), 2000);
  }
  thunder(delay = 0) {
    if (!this.ready) return; setTimeout(() => { const ctx = this.ctx, t = this.t; const g = ctx.createGain(); g.connect(this.sfx); const n = this._src(this.noiseB, 0.5); const lp = this._filt('lowpass', 400); const gg = ctx.createGain(); gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(1.4, t + 0.15); gg.gain.exponentialRampToValueAtTime(0.0001, t + 5); n.connect(lp); lp.connect(gg); gg.connect(g); this._start(n, t, 5.5); const s2 = ctx.createGain(); s2.gain.value = 0.6; gg.connect(s2); s2.connect(this.reverbSend); setTimeout(() => g.disconnect(), 6000); }, delay * 1000);
  }
  creak(pos, dur = 2) { // structural groan for collapses
    if (!this._can(pos, 600)) return; const ctx = this.ctx, t = this.t; const out = this._out(pos, { ref: 30, wet: 0.8, gain: 1, life: dur + 1 });
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(45, t + dur); const lfo = ctx.createOscillator(); lfo.frequency.value = 7; const lg = ctx.createGain(); lg.gain.value = 12; lfo.connect(lg); lg.connect(o.frequency);
    const bp = this._filt('bandpass', 300, 3); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(bp); bp.connect(g); g.connect(out); o.start(t); lfo.start(t); o.stop(t + dur); lfo.stop(t + dur);
  }
  rumble(pos, dur = 3, vol = 1) {
    if (!this.ready) return; const ctx = this.ctx, t = this.t; const out = this._out(pos, { ref: 40, wet: 0.6, gain: vol, life: dur + 1 });
    const n = this._src(this.noiseB, 0.5); const lp = this._filt('lowpass', 250); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1.2, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(lp); lp.connect(g); g.connect(out); this._start(n, t, dur + 0.2);
  }

  // ---------- continuous voices ----------
  createEngine(profile) { return this.ready ? new EngineVoice(this, profile) : null; }
  createLoop(kind, opts) { return this.ready ? new LoopVoice(this, kind, opts) : null; }
  createSiren(kind) { return this.ready ? new SirenVoice(this, kind) : null; }

  _startAmbience() {
    // city bed: brown noise rumble + distant traffic wash
    const ctx = this.ctx;
    this.ambCity = ctx.createGain(); this.ambCity.gain.value = 0.0; this.ambCity.connect(this.amb);
    const n = this._src(this.noiseB, 0.7, true); const lp = this._filt('lowpass', 500); n.connect(lp); lp.connect(this.ambCity); n.start();
    const n2 = this._src(this.noiseP, 1, true); const bp = this._filt('bandpass', 900, 0.6); const g2 = ctx.createGain(); g2.gain.value = 0.25; n2.connect(bp); bp.connect(g2); g2.connect(this.ambCity); n2.start();
    this.ambRain = ctx.createGain(); this.ambRain.gain.value = 0; this.ambRain.connect(this.amb);
    const r = this._src(this.noiseW, 1, true); const rh = this._filt('highpass', 1200); const rl = this._filt('lowpass', 9000); r.connect(rh); rh.connect(rl); rl.connect(this.ambRain); r.start();
    this.ambWind = ctx.createGain(); this.ambWind.gain.value = 0; this.ambWind.connect(this.amb);
    const w = this._src(this.noiseP, 1, true); this.windFilter = this._filt('bandpass', 500, 0.8); w.connect(this.windFilter); this.windFilter.connect(this.ambWind); w.start();
    this.ambSea = ctx.createGain(); this.ambSea.gain.value = 0; this.ambSea.connect(this.amb);
    const s = this._src(this.noiseP, 0.5, true); const sl = this._filt('lowpass', 700); const sg = ctx.createGain(); s.connect(sl); sl.connect(sg); sg.connect(this.ambSea); s.start();
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.12; const lg = ctx.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(sg.gain); lfo.start();
    this._birdT = 0;
  }
  updateAmbience(dt, { city = 0.5, rain = 0, wind = 0, sea = 0, day = 1 } = {}) {
    if (!this.ready) return; const t = this.t;
    this.ambCity.gain.setTargetAtTime(city * 0.35, t, 0.5); this.ambRain.gain.setTargetAtTime(rain * 0.22, t, 0.5);
    this.ambWind.gain.setTargetAtTime(wind * 0.5, t, 0.2); this.windFilter.frequency.setTargetAtTime(300 + wind * 1500, t, 0.2);
    this.ambSea.gain.setTargetAtTime(sea * 0.3, t, 0.5);
    this._birdT -= dt;
    if (day > 0.5 && city < 0.8 && this._birdT < 0 && rain < 0.2) { this._birdT = rand(1.5, 6); this._bird(); }
  }
  _bird() {
    const ctx = this.ctx; let t = this.t; const g = ctx.createGain(); g.gain.value = 0.03; g.connect(this.amb);
    const base = rand(2500, 4500); for (let i = 0; i < (2 + Math.random() * 4) | 0; i++) { const o = ctx.createOscillator(); o.frequency.setValueAtTime(base, t); o.frequency.exponentialRampToValueAtTime(base * rand(1.2, 1.6), t + 0.06); const gg = ctx.createGain(); this._env(gg.gain, t, 0.005, 1, 0.07); o.connect(gg); gg.connect(g); o.start(t); o.stop(t + 0.1); t += rand(0.08, 0.16); }
    setTimeout(() => g.disconnect(), 2000);
  }
}

// --- Engine: layered oscillators + distortion + intake noise, driven by rpm/throttle ---
export const ENGINE_PROFILES = {
  sedan: { cyl: 4, mix: [0.6, 0.3, 0.2], cut: 900, drive: 2, burble: 0.15, vol: 0.5, noise: 0.25 },
  hatch: { cyl: 4, mix: [0.5, 0.2, 0.3], cut: 1200, drive: 2.5, burble: 0.1, vol: 0.45, noise: 0.3 },
  muscle: { cyl: 8, mix: [0.5, 0.6, 0.25], cut: 700, drive: 5, burble: 0.6, vol: 0.7, noise: 0.25 },
  sports: { cyl: 6, mix: [0.6, 0.3, 0.4], cut: 1400, drive: 3.5, burble: 0.25, vol: 0.6, noise: 0.3, turbo: 0.5 },
  super: { cyl: 12, mix: [0.7, 0.2, 0.5], cut: 2000, drive: 3, burble: 0.15, vol: 0.65, noise: 0.25 },
  truck: { cyl: 6, mix: [0.4, 0.7, 0.1], cut: 450, drive: 6, burble: 0.5, vol: 0.75, noise: 0.4, diesel: true },
  bus: { cyl: 6, mix: [0.4, 0.6, 0.1], cut: 420, drive: 4, burble: 0.4, vol: 0.6, noise: 0.35, diesel: true },
  moto: { cyl: 2, mix: [0.7, 0.2, 0.5], cut: 1800, drive: 6, burble: 0.5, vol: 0.55, noise: 0.35 },
  police: { cyl: 8, mix: [0.5, 0.5, 0.3], cut: 900, drive: 4, burble: 0.35, vol: 0.65, noise: 0.25 },
  armored: { cyl: 8, mix: [0.4, 0.7, 0.1], cut: 500, drive: 6, burble: 0.5, vol: 0.8, noise: 0.4, diesel: true },
  boat: { cyl: 8, mix: [0.4, 0.6, 0.2], cut: 600, drive: 4, burble: 0.3, vol: 0.6, noise: 0.5 },
  electric: { cyl: 24, mix: [0.15, 0.05, 0.6], cut: 3200, drive: 1.2, burble: 0, vol: 0.4, noise: 0.15, turbo: 2.2 },
  heli: { cyl: 3, mix: [0.2, 0.3, 0.1], cut: 1500, drive: 2, burble: 0, vol: 0.4, noise: 0.6 },
};

class EngineVoice {
  constructor(eng, profile = 'sedan') {
    const ctx = eng.ctx; this.eng = eng; this.p = ENGINE_PROFILES[profile] || ENGINE_PROFILES.sedan;
    this.out = ctx.createGain(); this.out.gain.value = 0;
    this.panner = eng._panner({ x: 0, y: 0, z: 0 }, 8, 1.2); this.out.connect(this.panner); this.panner.connect(eng.sfx);
    this.send = ctx.createGain(); this.send.gain.value = 0.08; this.out.connect(this.send); this.send.connect(eng.reverbSend);
    this.filter = eng._filt('lowpass', this.p.cut, 2.2);
    this.shaper = ctx.createWaveShaper(); this.shaper.curve = eng._distCurve(this.p.drive); this.shaper.oversample = '2x';
    this.pre = ctx.createGain(); this.pre.gain.value = 0.5; this.pre.connect(this.shaper); this.shaper.connect(this.filter);
    this.amp = ctx.createGain(); this.amp.gain.value = 1; this.filter.connect(this.amp); this.amp.connect(this.out);
    const mk = (type, g) => { const o = ctx.createOscillator(); o.type = type; const gg = ctx.createGain(); gg.gain.value = g; o.connect(gg); gg.connect(this.pre); o.start(); return o; };
    this.o1 = mk('sawtooth', this.p.mix[0]); this.o2 = mk('square', this.p.mix[1]); this.o3 = mk('sawtooth', this.p.mix[2]);
    // firing-order burble: AM via low-frequency oscillator
    this.lfo = ctx.createOscillator(); this.lfo.type = 'square'; this.lfoG = ctx.createGain(); this.lfoG.gain.value = this.p.burble * 0.5;
    this.lfo.connect(this.lfoG); this.lfoG.connect(this.amp.gain); this.lfo.start();
    // intake / mechanical noise
    this.nsrc = eng._src(eng.noiseP, 1, true); this.nf = eng._filt('bandpass', 800, 1.2); this.ng = ctx.createGain(); this.ng.gain.value = 0;
    this.nsrc.connect(this.nf); this.nf.connect(this.ng); this.ng.connect(this.out); this.nsrc.start();
    if (this.p.turbo) { this.turbo = ctx.createOscillator(); this.turbo.type = 'sine'; this.tg = ctx.createGain(); this.tg.gain.value = 0; this.turbo.connect(this.tg); this.tg.connect(this.out); this.turbo.start(); }
    this.vol = 0; this.alive = true;
  }
  update(pos, vel, rpm, throttle, load = 1, volume = 1, isPlayer = false) {
    if (!this.alive) return; const eng = this.eng, t = eng.t, p = this.p;
    const dop = isPlayer ? 1 : eng.doppler(pos, vel);
    const fire = (rpm / 60) * (p.cyl / 2) * dop * (eng.slowmo < 0.9 ? 0.7 : 1);
    const tc = 0.03;
    this.o1.frequency.setTargetAtTime(fire, t, tc); this.o2.frequency.setTargetAtTime(fire * 0.5, t, tc); this.o3.frequency.setTargetAtTime(fire * 1.502, t, tc);
    this.lfo.frequency.setTargetAtTime(Math.max(4, fire / p.cyl * 1.5), t, tc);
    this.lfoG.gain.setTargetAtTime(p.burble * 0.5 * (1 - Math.min(1, rpm / 5000)) * (1 - throttle * 0.5), t, 0.05);
    this.filter.frequency.setTargetAtTime(p.cut + throttle * p.cut * 2.2 + rpm * 0.25, t, 0.05);
    this.pre.gain.setTargetAtTime(0.3 + throttle * 0.6 * load, t, 0.05);
    this.ng.gain.setTargetAtTime(p.noise * (0.15 + throttle * 0.5) * (rpm / 6000), t, 0.05);
    this.nf.frequency.setTargetAtTime(500 + rpm * 0.35, t, 0.05);
    if (this.turbo) { this.turbo.frequency.setTargetAtTime(2500 + rpm * 0.9, t, 0.1); this.tg.gain.setTargetAtTime(p.turbo * 0.015 * throttle * (rpm / 7000), t, 0.15); }
    this.out.gain.setTargetAtTime(p.vol * volume * (0.55 + 0.45 * throttle), t, 0.04);
    if (this.panner.positionX) { this.panner.positionX.setTargetAtTime(pos.x, t, 0.02); this.panner.positionY.setTargetAtTime(pos.y, t, 0.02); this.panner.positionZ.setTargetAtTime(pos.z, t, 0.02); }
    else this.panner.setPosition(pos.x, pos.y, pos.z);
  }
  backfire() { // pops on lift-off / gear change
    const eng = this.eng; if (!eng.ready) return; const ctx = eng.ctx, t = eng.t;
    for (let i = 0; i < 1 + Math.random() * 3; i++) { const tt = t + i * rand(0.05, 0.12); const n = eng._src(eng.noiseW, 1); const f = eng._filt('lowpass', 1500); const g = ctx.createGain(); eng._env(g.gain, tt, 0.001, 0.7, 0.05); n.connect(f); f.connect(g); g.connect(this.out); eng._start(n, tt, 0.08); }
  }
  shift() { const t = this.eng.t; this.amp.gain.cancelScheduledValues(t); this.amp.gain.setValueAtTime(0.35, t); this.amp.gain.linearRampToValueAtTime(1, t + 0.18); }
  silence() { if (this.alive) this.out.gain.setTargetAtTime(0, this.eng.t, 0.05); }
  dispose() {
    if (!this.alive) return; this.alive = false; const t = this.eng.t; this.out.gain.setTargetAtTime(0, t, 0.05);
    setTimeout(() => { try { [this.o1, this.o2, this.o3, this.lfo, this.nsrc, this.turbo].forEach((o) => o && o.stop()); this.out.disconnect(); this.panner.disconnect(); } catch (e) {} }, 400);
  }
}

// --- generic positional loops: tire squeal, fire, water spray, helicopter rotor, alarm, wind ---
class LoopVoice {
  constructor(eng, kind, opts = {}) {
    const ctx = eng.ctx; this.eng = eng; this.kind = kind; this.alive = true;
    this.out = ctx.createGain(); this.out.gain.value = 0;
    this.panner = eng._panner({ x: 0, y: 0, z: 0 }, opts.ref || 6, 1); this.out.connect(this.panner); this.panner.connect(opts.bus || eng.sfx);
    const s = ctx.createGain(); s.gain.value = opts.wet ?? 0.15; this.out.connect(s); s.connect(eng.reverbSend);
    this.nodes = [];
    if (kind === 'skid') {
      const n = eng._src(eng.noiseW, 1, true); this.f = eng._filt('bandpass', 1800, 8); const f2 = eng._filt('bandpass', 3100, 6);
      const g1 = ctx.createGain(); g1.gain.value = 1; const g2 = ctx.createGain(); g2.gain.value = 0.5;
      n.connect(this.f); this.f.connect(g1); n.connect(f2); f2.connect(g2); g1.connect(this.out); g2.connect(this.out); n.start(); this.nodes.push(n);
      this.lfo = ctx.createOscillator(); this.lfo.frequency.value = 18; const lg = ctx.createGain(); lg.gain.value = 200; this.lfo.connect(lg); lg.connect(this.f.frequency); this.lfo.start(); this.nodes.push(this.lfo);
    } else if (kind === 'fire') {
      const n = eng._src(eng.noiseB, 1, true); const f = eng._filt('lowpass', 800); n.connect(f); f.connect(this.out); n.start(); this.nodes.push(n);
      const c = eng._src(eng.noiseW, 1, true); const cf = eng._filt('highpass', 3000); const cg = ctx.createGain(); cg.gain.value = 0.15; c.connect(cf); cf.connect(cg); cg.connect(this.out); c.start(); this.nodes.push(c);
    } else if (kind === 'water') {
      const n = eng._src(eng.noiseW, 1, true); const f = eng._filt('bandpass', 2000, 0.6); n.connect(f); f.connect(this.out); n.start(); this.nodes.push(n);
    } else if (kind === 'rotor') {
      const n = eng._src(eng.noiseB, 1, true); const f = eng._filt('lowpass', 600); this.amp = ctx.createGain(); this.amp.gain.value = 0.5;
      n.connect(f); f.connect(this.amp); this.amp.connect(this.out); n.start(); this.nodes.push(n);
      this.lfo = ctx.createOscillator(); this.lfo.type = 'sawtooth'; this.lfo.frequency.value = 18; const lg = ctx.createGain(); lg.gain.value = 0.5; this.lfo.connect(lg); lg.connect(this.amp.gain); this.lfo.start(); this.nodes.push(this.lfo);
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 95; const of = eng._filt('lowpass', 300); const og = ctx.createGain(); og.gain.value = 0.15; o.connect(of); of.connect(og); og.connect(this.out); o.start(); this.nodes.push(o); this.turbine = o;
    } else if (kind === 'alarm') {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 900; const f = eng._filt('lowpass', 2500); o.connect(f); f.connect(this.out); o.start(); this.nodes.push(o);
      const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 2.2; const lg = ctx.createGain(); lg.gain.value = 200; lfo.connect(lg); lg.connect(o.frequency); lfo.start(); this.nodes.push(lfo);
    } else if (kind === 'wind') {
      const n = eng._src(eng.noiseP, 1, true); this.f = eng._filt('bandpass', 600, 0.7); n.connect(this.f); this.f.connect(this.out); n.start(); this.nodes.push(n);
    } else if (kind === 'hum') {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = opts.freq || 60; const f = eng._filt('lowpass', 300); o.connect(f); f.connect(this.out); o.start(); this.nodes.push(o);
    } else if (kind === 'ticking') {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 3; const hp = eng._filt('highpass', 4000); o.connect(hp); hp.connect(this.out); o.start(); this.nodes.push(o);
    }
  }
  update(pos, level, param = 0) {
    if (!this.alive) return; const t = this.eng.t;
    this.out.gain.setTargetAtTime(level, t, 0.05);
    if (pos) { if (this.panner.positionX) { this.panner.positionX.setTargetAtTime(pos.x, t, 0.02); this.panner.positionY.setTargetAtTime(pos.y, t, 0.02); this.panner.positionZ.setTargetAtTime(pos.z, t, 0.02); } else this.panner.setPosition(pos.x, pos.y, pos.z); }
    if (this.kind === 'skid' && this.f) this.f.frequency.setTargetAtTime(1500 + param * 900, t, 0.05);
    if (this.kind === 'rotor' && this.lfo) { this.lfo.frequency.setTargetAtTime(param || 18, t, 0.1); }
    if (this.kind === 'wind' && this.f) this.f.frequency.setTargetAtTime(300 + param * 1800, t, 0.1);
  }
  dispose() {
    if (!this.alive) return; this.alive = false; this.out.gain.setTargetAtTime(0, this.eng.t, 0.05);
    setTimeout(() => { try { this.nodes.forEach((n) => n.stop()); this.out.disconnect(); this.panner.disconnect(); } catch (e) {} }, 300);
  }
}

// --- Sirens with manual doppler: wail / yelp / hi-lo (police), two-tone (Euro), ambulance ---
class SirenVoice {
  constructor(eng, kind = 'wail') {
    const ctx = eng.ctx; this.eng = eng; this.kind = kind; this.alive = true; this.mode = kind; this.phase = Math.random() * 10;
    this.out = ctx.createGain(); this.out.gain.value = 0;
    this.panner = eng._panner({ x: 0, y: 0, z: 0 }, 14, 1); this.out.connect(this.panner); this.panner.connect(eng.sfx);
    const s = ctx.createGain(); s.gain.value = 0.3; this.out.connect(s); s.connect(eng.reverbSend);
    this.o = ctx.createOscillator(); this.o.type = 'sawtooth'; this.o2 = ctx.createOscillator(); this.o2.type = 'square';
    const f = eng._filt('lowpass', 2600, 1); const bp = eng._filt('peaking', 1200, 1); bp.gain.value = 6;
    const g2 = ctx.createGain(); g2.gain.value = 0.3; this.o.connect(f); this.o2.connect(g2); g2.connect(f); f.connect(bp); bp.connect(this.out); this.o.start(); this.o2.start();
  }
  update(dt, pos, vel, level = 1) {
    if (!this.alive) return; const eng = this.eng, t = eng.t; this.phase += dt;
    let f;
    if (this.mode === 'wail') f = 700 + 550 * (0.5 - 0.5 * Math.cos(this.phase * 2 * Math.PI / 4.2));
    else if (this.mode === 'yelp') f = 750 + 500 * (0.5 - 0.5 * Math.cos(this.phase * 2 * Math.PI * 3.2));
    else if (this.mode === 'hilo') f = (Math.floor(this.phase * 1.6) % 2) ? 960 : 720;
    else f = (Math.floor(this.phase * 1.4) % 2) ? 880 : 660;
    f *= eng.doppler(pos, vel);
    this.o.frequency.setTargetAtTime(f, t, 0.012); this.o2.frequency.setTargetAtTime(f * 1.005, t, 0.012);
    this.out.gain.setTargetAtTime(level * 0.14, t, 0.05);
    if (this.panner.positionX) { this.panner.positionX.setTargetAtTime(pos.x, t, 0.02); this.panner.positionY.setTargetAtTime(pos.y, t, 0.02); this.panner.positionZ.setTargetAtTime(pos.z, t, 0.02); } else this.panner.setPosition(pos.x, pos.y, pos.z);
  }
  dispose() { if (!this.alive) return; this.alive = false; this.out.gain.setTargetAtTime(0, this.eng.t, 0.05); setTimeout(() => { try { this.o.stop(); this.o2.stop(); this.out.disconnect(); } catch (e) {} }, 300); }
}
