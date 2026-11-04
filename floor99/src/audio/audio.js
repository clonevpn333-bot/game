// FLOOR 99 audio engine: buses, reverb, spatialized synthesized SFX, arena crowd, host voice.
// Everything is synthesized in WebAudio — no external audio files.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.listener = { x: 0, y: 0, z: 0, rx: 1, rz: 0 };
    this.vol = { master: 0.8, music: 0.7, sfx: 0.85, voice: 0.9 };
    this.lastPlay = new Map();
    this.crowdExcite = 0.3;
    this.crowdTarget = 0.3;
    this.muffle = 0;
    this.voices = 0;
    this.muteSfx = false;
  }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = ctx.createGain();
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.knee.value = 8; this.comp.ratio.value = 4;
    this.comp.attack.value = 0.003; this.comp.release.value = 0.18;
    this.muffleFilter = ctx.createBiquadFilter();
    this.muffleFilter.type = 'lowpass'; this.muffleFilter.frequency.value = 20000; this.muffleFilter.Q.value = 0.5;
    this.master.connect(this.muffleFilter).connect(this.comp).connect(ctx.destination);

    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.voiceBus = ctx.createGain();
    this.crowdBus = ctx.createGain();
    this.uiBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.voiceBus.connect(this.comp); // voice bypasses underwater muffle
    this.crowdBus.connect(this.master);
    this.uiBus.connect(this.comp);

    // reverb send
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._impulse(2.6, 2.2);
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 1;
    this.reverbSend.connect(this.reverb).connect(this.master);
    // big hall reverb for crowd
    this.hall = ctx.createConvolver();
    this.hall.buffer = this._impulse(3.8, 1.8);
    this.hallSend = ctx.createGain();
    this.hallSend.connect(this.hall).connect(this.crowdBus);

    // noise buffers
    this.white = this._noise(2, 'white');
    this.pink = this._noise(4, 'pink');
    this.brown = this._noise(4, 'brown');
    // distortion curves
    this.drive = this._curve(8);
    this.hardDrive = this._curve(40);
    this.applyVolumes();
    this._startCrowd();
    this._startLoops();
    this.ready = true;
  }
  now() { return this.ctx ? this.ctx.currentTime : 0; }
  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.6, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
    this.voiceBus.gain.setTargetAtTime(this.vol.voice, t, 0.05);
    this.crowdBus.gain.setTargetAtTime(this.vol.sfx * 0.9, t, 0.05);
    this.uiBus.gain.setTargetAtTime(this.vol.sfx * 0.7, t, 0.05);
  }
  setMuffle(m) {
    if (!this.ctx) return;
    if (Math.abs(m - this.muffle) < 0.01) return;
    this.muffle = m;
    this.muffleFilter.frequency.setTargetAtTime(m > 0.5 ? 650 : 20000, this.ctx.currentTime, 0.08);
  }
  _impulse(seconds, decay) {
    const ctx = this.ctx, rate = ctx.sampleRate, len = Math.floor(seconds * rate);
    const b = ctx.createBuffer(2, len, rate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * (i < rate * 0.01 ? i / (rate * 0.01) : 1);
      }
    }
    return b;
  }
  _noise(seconds, type) {
    const ctx = this.ctx, len = Math.floor(seconds * ctx.sampleRate);
    const b = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'white') d[i] = w;
      else if (type === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    }
    return b;
  }
  _curve(k) {
    const n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = i * 2 / n - 1; c[i] = (1 + k) * x / (1 + k * Math.abs(x)); }
    return c;
  }

  // --- spatial helpers ---
  setListener(pos, yaw) {
    const l = this.listener;
    l.x = pos.x; l.y = pos.y; l.z = pos.z;
    // camera right vector for yaw (camera looks along -Z rotated)
    l.rx = Math.cos(yaw); l.rz = -Math.sin(yaw);
  }
  _spatial(pos, range = 40) {
    if (!pos) return { g: 1, pan: 0, lp: 20000 };
    const l = this.listener;
    const dx = pos.x - l.x, dy = pos.y - l.y, dz = pos.z - l.z;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const g = 1 / (1 + (d / range) * (d / range) * 6);
    const pan = d > 0.5 ? clamp((dx * l.rx + dz * l.rz) / d, -1, 1) * 0.8 : 0;
    const lp = 20000 * Math.pow(0.4, d / range * 2) + 400;
    return { g, pan, lp };
  }
  // output chain for a one-shot: returns input node; handles gain/pan/lowpass/reverb send
  _out(opts = {}) {
    const ctx = this.ctx;
    const sp = this._spatial(opts.pos, opts.range || 40);
    const g = ctx.createGain();
    g.gain.value = (opts.vol ?? 1) * sp.g;
    let node = g;
    if (sp.pan !== 0 && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = sp.pan;
      node.connect(p); node = p;
    }
    if (opts.pos && sp.lp < 18000) {
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = sp.lp;
      node.connect(f); node = f;
    }
    node.connect(opts.bus || this.sfxBus);
    if (opts.verb !== 0) {
      const s = ctx.createGain();
      s.gain.value = (opts.verb ?? 0.18) * (opts.pos ? 1 + (1 - sp.g) : 1);
      g.connect(s).connect(this.reverbSend);
    }
    return g;
  }
  _throttle(name, ms) {
    const t = performance.now();
    const last = this.lastPlay.get(name) || 0;
    if (t - last < ms) return true;
    this.lastPlay.set(name, t);
    return false;
  }

  // --- primitives ---
  noise(out, t, dur, { type = 'white', filter = 'bandpass', f0 = 1000, f1 = null, q = 1, a = 0.002, vol = 1, curve = 'exp' } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = type === 'pink' ? this.pink : type === 'brown' ? this.brown : this.white;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filter; f.frequency.setValueAtTime(f0, t); f.Q.value = q;
    if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    else g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
    return g;
  }
  tone(out, t, dur, { type = 'sine', f0 = 440, f1 = null, a = 0.002, vol = 1, glide = 'exp', detune = 0 } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.detune.value = detune;
    if (f1) { if (glide === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur); else o.frequency.linearRampToValueAtTime(f1, t + dur); }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  fm(out, t, dur, { f = 440, ratio = 1.4, index = 400, vol = 0.5, a = 0.001, idxDecay = null } = {}) {
    const ctx = this.ctx;
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    car.frequency.value = f; mod.frequency.value = f * ratio;
    mg.gain.setValueAtTime(index, t);
    mg.gain.exponentialRampToValueAtTime(Math.max(1, idxDecay ?? index * 0.05), t + dur);
    mod.connect(mg).connect(car.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    car.connect(g).connect(out);
    car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  }
  shaper(out, curve) {
    const s = this.ctx.createWaveShaper();
    s.curve = curve || this.drive; s.oversample = '2x';
    s.connect(out);
    return s;
  }

  // --- public SFX API ---
  play(name, opts = {}) {
    if (!this.ready || this.muteSfx) return;
    const fn = SFX[name];
    if (!fn) return;
    // voice limiter: never let simultaneous one-shots pile up (barrel rain + chain explosions)
    const heavy = HEAVY.has(name);
    const cost = heavy ? 3 : 1;
    if (this.voices + cost > (heavy ? 60 : 48) && !PRIORITY.has(name)) return;
    this.voices = (this.voices || 0) + cost;
    setTimeout(() => { this.voices -= cost; }, heavy ? 2500 : 900);
    try { fn(this, this.ctx.currentTime + (opts.delay || 0), opts); } catch (e) { /* never crash on audio */ }
  }

  // --- crowd ---
  _startCrowd() {
    const ctx = this.ctx;
    this.crowd = { layers: [] };
    const bands = [[260, 0.9], [620, 0.8], [1350, 0.55], [2800, 0.25]];
    for (const [f, v] of bands) {
      const src = ctx.createBufferSource();
      src.buffer = this.pink; src.loop = true;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = 0.9;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(bp).connect(g);
      g.connect(this.crowdBus);
      const s = ctx.createGain(); s.gain.value = 0.6; g.connect(s).connect(this.hallSend);
      src.start(0, Math.random() * 3);
      this.crowd.layers.push({ g, base: v, f, bp, wob: Math.random() * 10 });
    }
    this.crowdOn = 0;
  }
  setCrowd(on, excite) {
    this.crowdOn = on ? 1 : 0;
    if (excite !== undefined) this.crowdTarget = excite;
  }
  _startLoops() {
    this.loops = {};
  }
  // continuous loops (machinery, water rush, slide scrape, alarm, wind)
  loop(name, vol, opts = {}) {
    if (!this.ready) return;
    let L = this.loops[name];
    if (!L) {
      if (vol <= 0.001) return;
      L = this.loops[name] = this._makeLoop(name);
      if (!L) return;
    }
    L.g.gain.setTargetAtTime(Math.max(0, vol), this.ctx.currentTime, opts.tc || 0.08);
    if (opts.rate && L.rate) L.rate(opts.rate);
  }
  _makeLoop(name) {
    const ctx = this.ctx;
    const g = ctx.createGain(); g.gain.value = 0;
    g.connect(this.sfxBus);
    const L = { g };
    const noiseSrc = (buf, type, f, q) => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
      s.connect(fl); s.start(0, Math.random() * 2);
      return fl;
    };
    if (name === 'water') {
      noiseSrc(this.pink, 'lowpass', 900, 0.7).connect(g);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.3; const lg = ctx.createGain(); lg.gain.value = 0.25;
      lfo.connect(lg).connect(g.gain); lfo.start();
    } else if (name === 'machinery') {
      const f = noiseSrc(this.brown, 'lowpass', 300, 1); f.connect(g);
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 55;
      const og = ctx.createGain(); og.gain.value = 0.05; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 200;
      o.connect(lp).connect(og).connect(g); o.start();
      const lfo = ctx.createOscillator(); lfo.frequency.value = 2.1; const lg = ctx.createGain(); lg.gain.value = 0.3;
      lfo.connect(lg).connect(og.gain); lfo.start();
      L.rate = (r) => { o.frequency.setTargetAtTime(55 * r, ctx.currentTime, 0.3); lfo.frequency.setTargetAtTime(2.1 * r, ctx.currentTime, 0.3); };
    } else if (name === 'slide') {
      noiseSrc(this.white, 'bandpass', 2400, 0.8).connect(g);
    } else if (name === 'wind') {
      noiseSrc(this.pink, 'bandpass', 600, 0.6).connect(g);
    } else if (name === 'alarm') {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 660;
      const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 1.6; const lg = ctx.createGain(); lg.gain.value = 220;
      lfo.connect(lg).connect(o.frequency); lfo.start();
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
      const og = ctx.createGain(); og.gain.value = 0.12;
      o.connect(lp).connect(og).connect(g); o.start();
      const s = ctx.createGain(); s.gain.value = 0.5; og.connect(s).connect(this.reverbSend);
    } else if (name === 'fire') {
      noiseSrc(this.brown, 'lowpass', 500, 0.8).connect(g);
      noiseSrc(this.white, 'highpass', 3000, 0.5).connect(g);
    } else if (name === 'grapple') {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 180;
      const lp = ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 900; lp.Q.value = 3;
      o.connect(lp).connect(g); o.start();
      L.rate = (r) => o.frequency.setTargetAtTime(120 + r * 200, ctx.currentTime, 0.05);
    } else if (name === 'heartbeat') {
      // handled via pulses
      const o = ctx.createOscillator(); o.frequency.value = 50; const og = ctx.createGain(); og.gain.value = 0;
      o.connect(og).connect(g); o.start();
      const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 1.6; const lg = ctx.createGain(); lg.gain.value = 0.5;
      lfo.connect(lg).connect(og.gain); lfo.start();
    } else if (name === 'hum') {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 60;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 160;
      o.connect(lp).connect(g); o.start();
    } else if (name === 'rail') {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 200;
      const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = 400;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 4;
      o.connect(bp).connect(g); o2.connect(g); o.start(); o2.start();
      L.rate = (r) => { o.frequency.setTargetAtTime(200 + r * 900, ctx.currentTime, 0.03); o2.frequency.setTargetAtTime(400 + r * 1800, ctx.currentTime, 0.03); bp.frequency.setTargetAtTime(1500 + r * 3000, ctx.currentTime, 0.03); };
    } else if (name === 'tractor') {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = 70;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 9; const lg = ctx.createGain(); lg.gain.value = 25;
      lfo.connect(lg).connect(o.frequency); lfo.start();
      const f = noiseSrc(this.pink, 'bandpass', 400, 2); f.connect(g);
      o.connect(g); o.start();
    } else if (name === 'drone') {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 140;
      const lp = ctx.createBiquadFilter(); lp.type = 'bandpass'; lp.frequency.value = 600; lp.Q.value = 2;
      o.connect(lp).connect(g); o.start();
    } else return null;
    return L;
  }
  stopLoops() { if (!this.loops) return; for (const k in this.loops) this.loops[k].g.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1); }

  update(dt) {
    if (!this.ready) return;
    this.crowdExcite += (this.crowdTarget - this.crowdExcite) * Math.min(1, dt * 1.5);
    const t = this.ctx.currentTime;
    const e = this.crowdExcite;
    for (const L of this.crowd.layers) {
      L.wob += dt * (0.6 + e);
      const mod = 0.75 + 0.25 * Math.sin(L.wob * 1.3) * Math.sin(L.wob * 0.71);
      const bright = L.f > 1000 ? e * e : 1;
      const v = this.crowdOn * L.base * (0.3 + e * 1.1) * mod * bright * (this.voiceActive ? 0.18 : 1);
      L.g.gain.setTargetAtTime(v, t, 0.15);
    }
  }
}

// ---------------------------------------------------------------------------
// SFX library
const HEAVY = new Set(['cheer', 'boo', 'ooh', 'chant', 'explosion', 'glassShatter', 'waterBurst', 'confetti', 'drumroll', 'airhorn', 'sting']);
const PRIORITY = new Set(['voteStart', 'voteResult', 'hurt', 'jingle', 'uiClick', 'uiBack', 'tvOff', 'elevatorDing', 'doors']);
// ---------------------------------------------------------------------------
export const SFX = {
  revolver(A, t, o) {
    const out = A._out({ ...o, verb: 0.3 });
    const d = A.shaper(out, A.hardDrive);
    A.noise(d, t, 0.35, { filter: 'lowpass', f0: 6000, f1: 300, vol: 1.2, q: 0.7 });
    A.tone(d, t, 0.25, { type: 'sine', f0: 140, f1: 38, vol: 1.4 });
    A.noise(out, t, 0.04, { filter: 'highpass', f0: 3000, vol: 0.6 });
    A.noise(out, t + 0.015, 0.32, { filter: 'lowpass', type: 'brown', f0: 700, f1: 90, vol: 0.42, a: 0.008 });
    A.noise(out, t, 0.018, { filter: 'highpass', f0: 4500, vol: 0.8 });
  },
  shotgun(A, t, o) {
    const out = A._out({ ...o, verb: 0.35 });
    const d = A.shaper(out, A.hardDrive);
    A.noise(d, t, 0.55, { filter: 'lowpass', f0: 4500, f1: 200, vol: 1.6, q: 0.5 });
    A.tone(d, t, 0.35, { type: 'sine', f0: 110, f1: 30, vol: 1.8 });
    A.noise(out, t, 0.58, { type: 'brown', filter: 'lowpass', f0: 600, f1: 60, vol: 0.65, a: 0.005 });
    A.noise(out, t, 0.025, { filter: 'highpass', f0: 3500, vol: 1.0 });
  },
  rifle(A, t, o) {
    const out = A._out({ ...o, verb: 0.15 });
    const d = A.shaper(out, A.drive);
    A.noise(d, t, 0.14, { filter: 'bandpass', f0: 2200, f1: 500, q: 0.8, vol: 1.1 });
    A.tone(d, t, 0.1, { type: 'triangle', f0: 220, f1: 60, vol: 0.9 });
    A.noise(out, t + 0.01, 0.25, { type: 'pink', filter: 'lowpass', f0: 1200, f1: 200, vol: 0.25 });
  },
  smg(A, t, o) {
    const out = A._out({ ...o, vol: (o.vol ?? 1) * 0.75, verb: 0.12 });
    const d = A.shaper(out, A.drive);
    A.noise(d, t, 0.08, { filter: 'bandpass', f0: 3200, f1: 900, q: 0.9, vol: 1.0 });
    A.tone(d, t, 0.06, { type: 'square', f0: 330, f1: 90, vol: 0.45 });
    A.noise(out, t, 0.012, { filter: 'highpass', f0: 5000, vol: 0.5 });
  },
  launcher(A, t, o) {
    const out = A._out({ ...o, verb: 0.3 });
    A.tone(out, t, 0.22, { type: 'sine', f0: 180, f1: 55, vol: 1.6 });
    A.noise(out, t, 0.18, { type: 'brown', filter: 'lowpass', f0: 900, f1: 150, vol: 0.9 });
    A.noise(out, t + 0.02, 0.06, { filter: 'bandpass', f0: 2600, q: 2, vol: 0.4 });
    A.tone(out, t + 0.03, 0.12, { type: 'triangle', f0: 1200, f1: 2400, vol: 0.15 });
  },
  enemyShot(A, t, o) {
    const out = A._out({ ...o, vol: (o.vol ?? 1) * 0.6, verb: 0.2 });
    A.tone(out, t, 0.18, { type: 'square', f0: 1400, f1: 260, vol: 0.35 });
    A.tone(out, t, 0.12, { type: 'sawtooth', f0: 900, f1: 120, vol: 0.2 });
  },
  railCharge(A, t, o) {
    const out = A._out({ ...o, verb: 0.2 });
    A.tone(out, t, 0.6, { type: 'sawtooth', f0: 120, f1: 1800, vol: 0.18, a: 0.05 });
  },
  railgun(A, t, o) {
    const out = A._out({ ...o, verb: 0.5 });
    const d = A.shaper(out, A.hardDrive);
    A.tone(d, t, 0.6, { type: 'sawtooth', f0: 2400, f1: 80, vol: 0.7 });
    A.tone(d, t, 0.5, { type: 'sine', f0: 90, f1: 25, vol: 1.6 });
    A.noise(out, t, 0.9, { filter: 'highpass', f0: 6000, f1: 1500, vol: 0.5 });
    A.fm(out, t, 1.2, { f: 220, ratio: 3.17, index: 1200, vol: 0.25 });
  },
  gravity(A, t, o) {
    const out = A._out({ ...o, verb: 0.4 });
    const d = A.shaper(out, A.drive);
    A.tone(d, t, 0.6, { type: 'sine', f0: 180, f1: 28, vol: 1.6 });
    A.noise(out, t, 0.5, { type: 'pink', filter: 'bandpass', f0: 300, f1: 2400, q: 3, vol: 0.8 });
    A.tone(out, t, 0.3, { type: 'square', f0: 60, f1: 40, vol: 0.3 });
  },
  gravGrab(A, t, o) {
    const out = A._out({ ...o, verb: 0.2 });
    A.tone(out, t, 0.3, { type: 'sine', f0: 400, f1: 900, vol: 0.4 });
    A.noise(out, t, 0.3, { filter: 'bandpass', f0: 600, f1: 2000, q: 4, vol: 0.4 });
  },
  swing(A, t, o) {
    const out = A._out({ ...o, verb: 0.1 });
    A.noise(out, t, 0.18, { filter: 'bandpass', f0: 600, f1: 4000, q: 2, vol: 0.7, a: 0.03, curve: 'lin' });
    A.tone(out, t, 0.15, { type: 'sawtooth', f0: 300, f1: 1200, vol: 0.08 });
  },
  bladeHit(A, t, o) {
    const out = A._out({ ...o, verb: 0.25 });
    A.fm(out, t, 0.4, { f: 1800, ratio: 2.76, index: 3000, vol: 0.35 });
    A.noise(out, t, 0.12, { filter: 'highpass', f0: 3000, vol: 0.6 });
    A.tone(out, t, 0.15, { f0: 200, f1: 60, vol: 0.8 });
  },
  hammer(A, t, o) {
    const out = A._out({ ...o, verb: 0.5 });
    const d = A.shaper(out, A.hardDrive);
    A.tone(d, t, 0.6, { f0: 90, f1: 22, vol: 2 });
    A.noise(d, t, 0.7, { type: 'brown', filter: 'lowpass', f0: 1800, f1: 80, vol: 1.3 });
    A.fm(out, t, 1.0, { f: 160, ratio: 1.41, index: 700, vol: 0.3 });
    A.noise(out, t, 0.4, { filter: 'bandpass', f0: 4000, f1: 1000, q: 0.5, vol: 0.5 });
  },
  punch(A, t, o) {
    const out = A._out({ ...o, verb: 0.15 });
    A.tone(out, t, 0.12, { f0: 160, f1: 50, vol: 1 });
    A.noise(out, t, 0.08, { filter: 'lowpass', f0: 2500, vol: 0.6 });
  },
  dryFire(A, t, o) { const out = A._out({ ...o, verb: 0 }); A.noise(out, t, 0.03, { filter: 'highpass', f0: 4000, vol: 0.5 }); A.tone(out, t, 0.04, { type: 'square', f0: 1800, vol: 0.08 }); },
  reloadOut(A, t, o) {
    const out = A._out({ ...o, verb: 0.05, vol: 0.6 });
    A.noise(out, t, 0.05, { filter: 'bandpass', f0: 3000, q: 3, vol: 0.6 });
    A.fm(out, t + 0.02, 0.12, { f: 900, ratio: 2.1, index: 600, vol: 0.18 });
  },
  reloadIn(A, t, o) {
    const out = A._out({ ...o, verb: 0.05, vol: 0.7 });
    A.noise(out, t, 0.04, { filter: 'bandpass', f0: 1800, q: 2, vol: 0.7 });
    A.tone(out, t, 0.06, { type: 'square', f0: 300, f1: 180, vol: 0.15 });
    A.noise(out, t + 0.07, 0.04, { filter: 'highpass', f0: 3500, vol: 0.5 });
  },
  pump(A, t, o) {
    const out = A._out({ ...o, verb: 0.08 });
    A.noise(out, t, 0.08, { filter: 'bandpass', f0: 1200, q: 2, vol: 0.9 });
    A.noise(out, t + 0.12, 0.07, { filter: 'bandpass', f0: 1800, q: 2, vol: 0.9 });
    A.tone(out, t + 0.12, 0.05, { type: 'square', f0: 200, vol: 0.2 });
  },
  cylinderSpin(A, t, o) {
    const out = A._out({ ...o, verb: 0 });
    for (let i = 0; i < 6; i++) A.noise(out, t + i * 0.035, 0.02, { filter: 'highpass', f0: 5000, vol: 0.35 });
  },
  switch(A, t, o) {
    const out = A._out({ ...o, verb: 0, vol: 0.5 });
    A.noise(out, t, 0.06, { filter: 'bandpass', f0: 2500, q: 1.5, vol: 0.6 });
    A.tone(out, t + 0.05, 0.05, { type: 'triangle', f0: 600, f1: 900, vol: 0.12 });
  },
  shell(A, t, o) {
    const out = A._out({ ...o, verb: 0.05, vol: (o.vol ?? 1) * 0.25 });
    A.fm(out, t, 0.15, { f: o.shot ? 900 : 3200 + Math.random() * 800, ratio: 2.3, index: 900, vol: 0.4 });
  },
  impactMetal(A, t, o) {
    if (A._throttle('impactMetal', 25)) return;
    const out = A._out({ ...o, verb: 0.15, vol: (o.vol ?? 1) * 0.6 });
    A.fm(out, t, 0.25, { f: 1200 + Math.random() * 1600, ratio: 1.73, index: 1500, vol: 0.3 });
    A.noise(out, t, 0.05, { filter: 'highpass', f0: 2500, vol: 0.5 });
  },
  impactSoft(A, t, o) {
    if (A._throttle('impactSoft', 25)) return;
    const out = A._out({ ...o, verb: 0.1, vol: (o.vol ?? 1) * 0.5 });
    A.noise(out, t, 0.08, { filter: 'lowpass', f0: 1500, vol: 0.8 });
  },
  robotHit(A, t, o) {
    if (A._throttle('robotHit', 20)) return;
    const out = A._out({ ...o, verb: 0.15 });
    A.fm(out, t, 0.18, { f: 300 + Math.random() * 300, ratio: 2.41, index: 800, vol: 0.5 });
    A.noise(out, t, 0.06, { filter: 'bandpass', f0: 2000, q: 1, vol: 0.6 });
    A.tone(out, t, 0.08, { type: 'square', f0: 120, f1: 60, vol: 0.25 });
  },
  hitmarker(A, t, o) {
    const out = A._out({ bus: A.uiBus, verb: 0, vol: 0.35 });
    A.tone(out, t, 0.05, { type: 'square', f0: 2600, vol: 0.2 });
  },
  headshot(A, t, o) {
    const out = A._out({ bus: A.uiBus, verb: 0.2, vol: 0.5 });
    A.fm(out, t, 0.6, { f: 1568, ratio: 3.5, index: 500, vol: 0.4 });
    A.tone(out, t + 0.06, 0.4, { f0: 2093, vol: 0.2 });
  },
  kill(A, t, o) {
    const out = A._out({ bus: A.uiBus, verb: 0.2, vol: 0.6 });
    A.tone(out, t, 0.1, { type: 'square', f0: 880, vol: 0.15 });
    A.tone(out, t + 0.07, 0.25, { type: 'square', f0: 1320, vol: 0.15 });
  },
  robotDie(A, t, o) {
    const out = A._out({ ...o, verb: 0.3 });
    const d = A.shaper(out, A.hardDrive);
    A.noise(d, t, 0.5, { filter: 'lowpass', f0: 3000, f1: 200, vol: 1 });
    A.tone(d, t, 0.4, { type: 'square', f0: 400, f1: 40, vol: 0.4 });
    for (let i = 0; i < 4; i++) A.fm(out, t + 0.05 + i * 0.06, 0.2, { f: 400 + Math.random() * 1500, ratio: 2.7, index: 1200, vol: 0.18 });
    A.noise(out, t + 0.1, 0.4, { filter: 'highpass', f0: 5000, vol: 0.3, curve: 'lin' });
  },
  explosion(A, t, o) {
    const big = o.big ?? 1;
    const out = A._out({ ...o, verb: 0.55, range: 70 });
    const d = A.shaper(out, A.hardDrive);
    A.tone(d, t, 1.2 * big, { f0: 70, f1: 20, vol: 2.2 });
    A.noise(d, t, 1.6 * big, { type: 'brown', filter: 'lowpass', f0: 2400, f1: 60, vol: 2 });
    A.noise(out, t, 0.5, { filter: 'highpass', f0: 2000, f1: 400, vol: 0.6 });
    A.noise(out, t + 0.1, 2.5 * big, { type: 'pink', filter: 'lowpass', f0: 800, f1: 100, vol: 0.5, a: 0.1 });
  },
  glassCrack(A, t, o) {
    const out = A._out({ ...o, verb: 0.4 });
    for (let i = 0; i < 5; i++) A.fm(out, t + i * 0.03 * Math.random(), 0.12, { f: 2000 + Math.random() * 3000, ratio: 1.5, index: 2000, vol: 0.25 });
    A.noise(out, t, 0.15, { filter: 'highpass', f0: 4000, vol: 0.5 });
  },
  glassShatter(A, t, o) {
    const out = A._out({ ...o, verb: 0.6, range: 70 });
    A.noise(out, t, 0.9, { filter: 'highpass', f0: 3000, f1: 1500, vol: 1.2 });
    for (let i = 0; i < 26; i++) A.fm(out, t + Math.random() * 0.9, 0.2 + Math.random() * 0.3, { f: 2500 + Math.random() * 5000, ratio: 1.41 + Math.random(), index: 1500, vol: 0.12 });
    A.tone(out, t, 0.4, { f0: 100, f1: 40, vol: 1 });
  },
  splash(A, t, o) {
    const out = A._out({ ...o, verb: 0.2 });
    const p = o.power ?? 1;
    A.noise(out, t, 0.4 * p + 0.1, { type: 'pink', filter: 'bandpass', f0: 800, f1: 300, q: 0.8, vol: 0.8 * p });
    A.noise(out, t + 0.03, 0.3, { filter: 'highpass', f0: 3000, vol: 0.3 * p });
    A.tone(out, t, 0.15, { f0: 600, f1: 200, vol: 0.2 * p });
  },
  waterBurst(A, t, o) {
    const out = A._out({ ...o, verb: 0.5, range: 80 });
    A.noise(out, t, 3.5, { type: 'pink', filter: 'lowpass', f0: 3000, f1: 500, vol: 1.6, a: 0.1, curve: 'lin' });
    A.noise(out, t, 2, { type: 'brown', filter: 'lowpass', f0: 400, vol: 1.4, a: 0.05 });
  },
  step(A, t, o) {
    const out = A._out({ ...o, verb: 0.05, vol: (o.vol ?? 1) * 0.28 });
    if (o.wet) { A.noise(out, t, 0.12, { type: 'pink', filter: 'bandpass', f0: 1000 + Math.random() * 400, q: 1.2, vol: 0.9 }); return; }
    A.noise(out, t, 0.06, { filter: 'bandpass', f0: 1800 + Math.random() * 900, q: 1.4, vol: 0.8 });
    A.tone(out, t, 0.05, { f0: 110 + Math.random() * 30, f1: 60, vol: 0.5 });
    if (o.metal) A.fm(out, t, 0.08, { f: 700 + Math.random() * 300, ratio: 2.1, index: 400, vol: 0.12 });
  },
  land(A, t, o) {
    const out = A._out({ ...o, verb: 0.1, vol: (o.vol ?? 1) * 0.8 });
    A.tone(out, t, 0.2, { f0: 120, f1: 40, vol: 0.8 });
    A.noise(out, t, 0.15, { filter: 'lowpass', f0: 1500, vol: 0.6 });
  },
  bigLand(A, t, o) {
    const out = A._out({ ...o, verb: 0.4 });
    const d = A.shaper(out, A.drive);
    A.tone(d, t, 0.5, { f0: 80, f1: 25, vol: 1.6 });
    A.noise(d, t, 0.6, { type: 'brown', filter: 'lowpass', f0: 1200, f1: 80, vol: 1.2 });
  },
  jump(A, t, o) {
    const out = A._out({ ...o, verb: 0.02, vol: 0.35 });
    A.noise(out, t, 0.12, { filter: 'bandpass', f0: 900, f1: 2000, q: 1, vol: 0.5 });
  },
  doubleJump(A, t, o) {
    const out = A._out({ ...o, verb: 0.2, vol: 0.5 });
    A.tone(out, t, 0.25, { type: 'sine', f0: 300, f1: 900, vol: 0.35 });
    A.noise(out, t, 0.25, { filter: 'bandpass', f0: 500, f1: 3000, q: 2, vol: 0.5 });
  },
  dash(A, t, o) {
    const out = A._out({ ...o, verb: 0.15, vol: 0.6 });
    A.noise(out, t, 0.3, { type: 'pink', filter: 'bandpass', f0: 3000, f1: 400, q: 1.2, vol: 1, a: 0.01 });
    A.tone(out, t, 0.2, { type: 'sawtooth', f0: 500, f1: 120, vol: 0.08 });
  },
  slide(A, t, o) {
    const out = A._out({ ...o, verb: 0.05, vol: 0.5 });
    A.noise(out, t, 0.5, { filter: 'bandpass', f0: 3500, f1: 1200, q: 0.7, vol: 0.6, a: 0.02, curve: 'lin' });
  },
  grappleFire(A, t, o) {
    const out = A._out({ ...o, verb: 0.2 });
    A.noise(out, t, 0.15, { filter: 'highpass', f0: 2000, vol: 0.6 });
    A.tone(out, t, 0.25, { type: 'sawtooth', f0: 1200, f1: 300, vol: 0.15 });
  },
  grappleHit(A, t, o) {
    const out = A._out({ ...o, verb: 0.2 });
    A.fm(out, t, 0.3, { f: 600, ratio: 3.1, index: 900, vol: 0.4 });
    A.noise(out, t, 0.05, { filter: 'highpass', f0: 2500, vol: 0.5 });
  },
  vault(A, t, o) { const out = A._out({ ...o, verb: 0.05, vol: 0.4 }); A.noise(out, t, 0.15, { filter: 'bandpass', f0: 1200, f1: 600, q: 1, vol: 0.6 }); },
  hurt(A, t, o) {
    const out = A._out({ bus: A.uiBus, verb: 0.1, vol: 0.8 });
    const d = A.shaper(out, A.drive);
    A.tone(d, t, 0.2, { type: 'sine', f0: 140, f1: 60, vol: 0.9 });
    A.noise(out, t, 0.15, { filter: 'lowpass', f0: 1200, vol: 0.6 });
  },
  pickup(A, t, o) {
    const out = A._out({ bus: A.uiBus, verb: 0.2, vol: 0.5 });
    A.tone(out, t, 0.1, { type: 'square', f0: 988, vol: 0.12 });
    A.tone(out, t + 0.06, 0.18, { type: 'square', f0: 1319, vol: 0.12 });
  },
  heal(A, t, o) {
    const out = A._out({ bus: A.uiBus, verb: 0.3, vol: 0.5 });
    [523, 659, 784].forEach((f, i) => A.tone(out, t + i * 0.05, 0.3, { type: 'triangle', f0: f, vol: 0.18 }));
  },
  powerup(A, t, o) {
    const out = A._out({ bus: A.uiBus, verb: 0.4, vol: 0.7 });
    [392, 523, 659, 784, 1047].forEach((f, i) => A.tone(out, t + i * 0.06, 0.4, { type: 'square', f0: f, vol: 0.1 }));
    A.tone(out, t, 0.6, { type: 'sawtooth', f0: 200, f1: 1200, vol: 0.06 });
  },
  hydraulic(A, t, o) {
    const out = A._out({ ...o, verb: 0.3, range: 50 });
    A.noise(out, t, 0.9, { filter: 'highpass', f0: 2500, f1: 5000, vol: 0.6, a: 0.05, curve: 'lin' });
    A.tone(out, t, 0.6, { type: 'sawtooth', f0: 60, f1: 45, vol: 0.12 });
  },
  pressSlam(A, t, o) {
    const out = A._out({ ...o, verb: 0.5, range: 60 });
    const d = A.shaper(out, A.hardDrive);
    A.tone(d, t, 0.7, { f0: 65, f1: 22, vol: 2.4 });
    A.noise(d, t, 0.5, { type: 'brown', filter: 'lowpass', f0: 1500, f1: 60, vol: 1.6 });
    A.fm(out, t, 1.2, { f: 110, ratio: 1.41, index: 600, vol: 0.35 });
    A.noise(out, t + 0.05, 0.8, { filter: 'highpass', f0: 3000, f1: 6000, vol: 0.25, curve: 'lin' });
  },
  clank(A, t, o) {
    const out = A._out({ ...o, verb: 0.35, range: 50 });
    A.fm(out, t, 0.5, { f: 180 + Math.random() * 120, ratio: 2.73, index: 1400, vol: 0.4 });
    A.noise(out, t, 0.06, { filter: 'bandpass', f0: 1500, vol: 0.5 });
  },
  servo(A, t, o) {
    if (A._throttle('servo', 80)) return;
    const out = A._out({ ...o, verb: 0.05, vol: (o.vol ?? 1) * 0.25 });
    A.tone(out, t, 0.25, { type: 'sawtooth', f0: 300 + Math.random() * 200, f1: 600 + Math.random() * 300, vol: 0.12, glide: 'lin' });
  },
  alert(A, t, o) {
    if (A._throttle('alert', 120)) return;
    const out = A._out({ ...o, verb: 0.2, vol: 0.6 });
    A.tone(out, t, 0.08, { type: 'square', f0: 1200, vol: 0.2 });
    A.tone(out, t + 0.1, 0.12, { type: 'square', f0: 1600, vol: 0.2 });
  },
  windup(A, t, o) {
    const out = A._out({ ...o, verb: 0.1, vol: 0.6 });
    A.tone(out, t, 0.4, { type: 'sawtooth', f0: 200, f1: 900, vol: 0.18, glide: 'lin' });
  },
  stomp(A, t, o) {
    const out = A._out({ ...o, verb: 0.3, range: 50 });
    A.tone(out, t, 0.3, { f0: 70, f1: 30, vol: 1.2 });
    A.fm(out, t, 0.3, { f: 120, ratio: 2.2, index: 400, vol: 0.2 });
  },
  zap(A, t, o) {
    if (A._throttle('zap', 60)) return;
    const out = A._out({ ...o, verb: 0.2 });
    A.noise(out, t, 0.2, { filter: 'bandpass', f0: 3000 + Math.random() * 2000, q: 6, vol: 0.6 });
    A.tone(out, t, 0.15, { type: 'square', f0: 90, f1: 50, vol: 0.2 });
  },
  laserHum(A, t, o) {
    const out = A._out({ ...o, verb: 0.1, vol: 0.3 });
    A.tone(out, t, 0.6, { type: 'sawtooth', f0: 110, vol: 0.15, a: 0.1 });
  },
  fireJet(A, t, o) {
    const out = A._out({ ...o, verb: 0.2, range: 40 });
    A.noise(out, t, 1.4, { type: 'brown', filter: 'lowpass', f0: 900, f1: 300, vol: 1.2, a: 0.05, curve: 'lin' });
    A.noise(out, t, 1.2, { filter: 'highpass', f0: 2500, vol: 0.3, a: 0.05, curve: 'lin' });
  },
  meteor(A, t, o) {
    const out = A._out({ ...o, verb: 0.3, range: 70 });
    A.noise(out, t, 1.2, { type: 'pink', filter: 'bandpass', f0: 3000, f1: 300, q: 1, vol: 0.6, a: 0.6, curve: 'lin' });
  },
  warning(A, t, o) {
    const out = A._out({ bus: A.uiBus, verb: 0.3, vol: 0.7 });
    for (let i = 0; i < 3; i++) { A.tone(out, t + i * 0.32, 0.22, { type: 'sawtooth', f0: 523, vol: 0.12 }); A.tone(out, t + i * 0.32, 0.22, { type: 'sawtooth', f0: 554, vol: 0.12 }); }
  },
  spawnHatch(A, t, o) {
    const out = A._out({ ...o, verb: 0.3, range: 50 });
    A.noise(out, t, 0.6, { filter: 'highpass', f0: 2000, f1: 800, vol: 0.5, a: 0.02 });
    A.tone(out, t, 0.5, { type: 'sawtooth', f0: 80, f1: 160, vol: 0.12 });
    A.fm(out, t + 0.5, 0.4, { f: 150, ratio: 2.7, index: 600, vol: 0.3 });
  },
  // --- crowd one-shots ---
  cheer(A, t, o) {
    const out = A._out({ bus: A.crowdBus, verb: 0, vol: (o.vol ?? 1) });
    const s = A.ctx.createGain(); s.gain.value = 0.8; out.connect(s).connect(A.hallSend);
    const big = o.big ?? 1;
    A.noise(out, t, 2.8 * big, { type: 'pink', filter: 'bandpass', f0: 1100, f1: 800, q: 0.6, vol: 0.9, a: 0.25, curve: 'exp' });
    A.noise(out, t, 2.4 * big, { type: 'pink', filter: 'bandpass', f0: 2600, f1: 1800, q: 0.8, vol: 0.4, a: 0.2 });
    // whistles
    for (let i = 0; i < 3 + big * 3; i++) {
      const st = t + Math.random() * 1.2, f = 1800 + Math.random() * 1400;
      A.tone(out, st, 0.5 + Math.random() * 0.4, { type: 'sine', f0: f, f1: f * (Math.random() > 0.5 ? 1.25 : 0.8), vol: 0.04, a: 0.05 });
    }
    // claps
    for (let i = 0; i < 40 * big; i++) A.noise(out, t + 0.2 + Math.random() * 2, 0.03, { filter: 'bandpass', f0: 1500 + Math.random() * 1500, q: 1.5, vol: 0.12 });
  },
  boo(A, t, o) {
    const out = A._out({ bus: A.crowdBus, verb: 0, vol: (o.vol ?? 1) * 0.5 });
    const s = A.ctx.createGain(); s.gain.value = 0.8; out.connect(s).connect(A.hallSend);
    const f1 = A.ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 380; f1.Q.value = 3;
    const f2 = A.ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 800; f2.Q.value = 4;
    f1.connect(out); f2.connect(out);
    for (let i = 0; i < 14; i++) {
      const o2 = A.ctx.createOscillator(); o2.type = 'sawtooth';
      const f = 95 + Math.random() * 90; o2.frequency.setValueAtTime(f, t); o2.frequency.linearRampToValueAtTime(f * 0.85, t + 2);
      const g = A.ctx.createGain(); const st = t + Math.random() * 0.3;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, st + 0.3); g.gain.linearRampToValueAtTime(0, st + 2.2);
      o2.connect(g); g.connect(f1); g.connect(f2);
      o2.start(t); o2.stop(t + 2.6);
    }
  },
  ooh(A, t, o) {
    const out = A._out({ bus: A.crowdBus, verb: 0, vol: (o.vol ?? 1) * 0.5 });
    const s = A.ctx.createGain(); s.gain.value = 0.8; out.connect(s).connect(A.hallSend);
    const f1 = A.ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 3;
    f1.frequency.setValueAtTime(350, t); f1.frequency.linearRampToValueAtTime(700, t + 1.2);
    f1.connect(out);
    for (let i = 0; i < 14; i++) {
      const o2 = A.ctx.createOscillator(); o2.type = 'sawtooth';
      const f = 140 + Math.random() * 160; o2.frequency.setValueAtTime(f, t); o2.frequency.linearRampToValueAtTime(f * 1.35, t + 0.8); o2.frequency.linearRampToValueAtTime(f * 1.1, t + 1.6);
      const g = A.ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.25); g.gain.linearRampToValueAtTime(0, t + 1.8);
      o2.connect(g).connect(f1);
      o2.start(t); o2.stop(t + 2);
    }
  },
  gasp(A, t, o) {
    const out = A._out({ bus: A.crowdBus, verb: 0, vol: (o.vol ?? 1) * 0.8 });
    const s = A.ctx.createGain(); s.gain.value = 1; out.connect(s).connect(A.hallSend);
    A.noise(out, t, 0.7, { type: 'pink', filter: 'bandpass', f0: 1800, f1: 2600, q: 1.5, vol: 0.9, a: 0.08 });
  },
  chant(A, t, o) {
    // "NINE-TY NINE!" x2
    const out = A._out({ bus: A.crowdBus, verb: 0, vol: (o.vol ?? 1) * 0.55 });
    const s = A.ctx.createGain(); s.gain.value = 0.9; out.connect(s).connect(A.hallSend);
    const beat = 0.28;
    const sylls = [[0, 1, 160, 'ai'], [1, 0.8, 140, 'i'], [2, 1.6, 170, 'ai']];
    for (let rep = 0; rep < 2; rep++) for (const [b, len, pitch, v] of sylls) {
      const st = t + (rep * 4 + b) * beat;
      const ff = A.ctx.createBiquadFilter(); ff.type = 'bandpass'; ff.frequency.value = v === 'ai' ? 750 : 450; ff.Q.value = 2.5;
      const ff2 = A.ctx.createBiquadFilter(); ff2.type = 'bandpass'; ff2.frequency.value = v === 'ai' ? 1500 : 2200; ff2.Q.value = 3;
      ff.connect(out); ff2.connect(out);
      for (let i = 0; i < 10; i++) {
        const os = A.ctx.createOscillator(); os.type = 'sawtooth';
        os.frequency.value = pitch * (0.8 + Math.random() * 0.5);
        const g = A.ctx.createGain(); const off = Math.random() * 0.05;
        g.gain.setValueAtTime(0, st + off); g.gain.linearRampToValueAtTime(0.05, st + off + 0.04); g.gain.linearRampToValueAtTime(0, st + off + len * beat * 0.9);
        os.connect(g); g.connect(ff); g.connect(ff2);
        os.start(st); os.stop(st + len * beat + 0.2);
      }
      A.noise(out, st, len * beat * 0.8, { filter: 'bandpass', f0: 2500, q: 1, vol: 0.15 });
    }
  },
  airhorn(A, t, o) {
    const out = A._out({ bus: A.crowdBus, verb: 0.3, vol: 0.4 });
    const d = A.shaper(out, A.drive);
    const pat = [0, 0.18, 0.36, 0.5];
    pat.forEach((p, i) => {
      [466, 470, 233].forEach((f) => A.tone(d, t + p, i === 3 ? 0.9 : 0.14, { type: 'sawtooth', f0: f, vol: 0.12, a: 0.01 }));
    });
  },
  // --- broadcast / UI ---
  jingle(A, t, o) {
    const out = A._out({ bus: A.uiBus, verb: 0.35, vol: 0.8 });
    const notes = [[659, 0], [784, 0.09], [988, 0.18], [1319, 0.3]];
    for (const [f, d] of notes) { A.fm(out, t + d, 0.6, { f, ratio: 3.5, index: 300, vol: 0.18 }); A.tone(out, t + d, 0.3, { type: 'square', f0: f / 2, vol: 0.06 }); }
  },
  voteStart(A, t, o) {
    const out = A._out({ bus: A.uiBus, verb: 0.4, vol: 0.9 });
    const d = A.shaper(out, A.drive);
    A.tone(d, t, 0.5, { type: 'sawtooth', f0: 110, vol: 0.2 });
    A.tone(d, t, 0.5, { type: 'sawtooth', f0: 165, vol: 0.2 });
    A.tone(out, t + 0.12, 0.6, { type: 'square', f0: 880, f1: 1760, vol: 0.06 });
    A.noise(out, t, 0.6, { filter: 'highpass', f0: 4000, vol: 0.3 });
  },
  voteTick(A, t, o) { const out = A._out({ bus: A.uiBus, verb: 0.1, vol: 0.5 }); A.tone(out, t, 0.05, { type: 'square', f0: o.high ? 1760 : 1320, vol: 0.12 }); },
  voteResult(A, t, o) {
    const out = A._out({ bus: A.uiBus, verb: 0.5, vol: 1 });
    const d = A.shaper(out, A.drive);
    A.tone(d, t, 0.9, { f0: 60, f1: 30, vol: 1.2 });
    [[392, 0], [523, 0], [659, 0], [784, 0]].forEach(([f]) => A.tone(out, t, 1.0, { type: 'sawtooth', f0: f, vol: 0.06, a: 0.01 }));
    A.noise(out, t, 1.4, { filter: 'highpass', f0: 6000, f1: 3000, vol: 0.4 });
  },
  drumroll(A, t, o) {
    const out = A._out({ bus: A.uiBus, verb: 0.3, vol: 0.6 });
    const dur = o.dur || 1.5;
    for (let x = 0; x < dur; x += 0.04) A.noise(out, t + x, 0.05, { filter: 'bandpass', f0: 1800, q: 0.8, vol: 0.2 + 0.5 * (x / dur) });
  },
  uiHover(A, t) { const out = A._out({ bus: A.uiBus, verb: 0.05, vol: 0.3 }); A.tone(out, t, 0.04, { type: 'square', f0: 2200, vol: 0.06 }); },
  uiClick(A, t) { const out = A._out({ bus: A.uiBus, verb: 0.15, vol: 0.5 }); A.tone(out, t, 0.08, { type: 'square', f0: 660, f1: 1320, vol: 0.12 }); A.noise(out, t, 0.03, { filter: 'highpass', f0: 3000, vol: 0.3 }); },
  uiBack(A, t) { const out = A._out({ bus: A.uiBus, verb: 0.1, vol: 0.5 }); A.tone(out, t, 0.08, { type: 'square', f0: 990, f1: 440, vol: 0.12 }); },
  uiDeny(A, t) { const out = A._out({ bus: A.uiBus, verb: 0.1, vol: 0.5 }); A.tone(out, t, 0.15, { type: 'sawtooth', f0: 180, vol: 0.15 }); A.tone(out, t + 0.12, 0.2, { type: 'sawtooth', f0: 150, vol: 0.15 }); },
  purchase(A, t) { const out = A._out({ bus: A.uiBus, verb: 0.3, vol: 0.6 }); A.fm(out, t, 0.5, { f: 1760, ratio: 3, index: 400, vol: 0.2 }); A.fm(out, t + 0.08, 0.6, { f: 2637, ratio: 3, index: 400, vol: 0.2 }); },
  elevatorDing(A, t) { const out = A._out({ bus: A.uiBus, verb: 0.5, vol: 0.8 }); A.fm(out, t, 1.6, { f: 1318, ratio: 3.5, index: 300, vol: 0.25 }); A.fm(out, t + 0.35, 1.8, { f: 1046, ratio: 3.5, index: 300, vol: 0.25 }); },
  doors(A, t, o) {
    const out = A._out({ ...o, verb: 0.3 });
    A.noise(out, t, 0.7, { type: 'pink', filter: 'bandpass', f0: 500, f1: 900, q: 1, vol: 0.6, a: 0.1, curve: 'lin' });
    if (o.slam) { const d = A.shaper(out, A.hardDrive); A.tone(d, t + 0.6, 0.5, { f0: 80, f1: 25, vol: 1.8 }); A.noise(d, t + 0.6, 0.4, { type: 'brown', filter: 'lowpass', f0: 1500, vol: 1.2 }); }
  },
  tvOff(A, t) {
    const out = A._out({ bus: A.uiBus, verb: 0.2, vol: 0.8 });
    A.tone(out, t, 0.4, { type: 'sine', f0: 8000, f1: 200, vol: 0.2 });
    A.noise(out, t, 0.3, { filter: 'highpass', f0: 3000, vol: 0.5 });
    A.tone(out, t, 0.3, { f0: 60, f1: 30, vol: 0.8 });
  },
  static(A, t, o) { const out = A._out({ bus: A.voiceBus, verb: 0, vol: (o.vol ?? 0.3) }); A.noise(out, t, o.dur || 0.25, { filter: 'bandpass', f0: 2500, q: 0.6, vol: 0.5, curve: 'lin' }); },
  irisBlip(A, t) { const out = A._out({ bus: A.voiceBus, verb: 0.05, vol: 0.4 }); A.tone(out, t, 0.06, { type: 'square', f0: 1046, vol: 0.08 }); A.tone(out, t + 0.07, 0.06, { type: 'square', f0: 1568, vol: 0.08 }); A.noise(out, t, 0.2, { filter: 'bandpass', f0: 3000, q: 1, vol: 0.15 }); },
  haloBlip(A, t, o) {
    // formant babble syllable (used when TTS is off)
    const out = A._out({ bus: A.voiceBus, verb: 0.1, vol: 0.5 });
    const f = (o.pitch || 180) * (0.9 + Math.random() * 0.25);
    const os = A.ctx.createOscillator(); os.type = 'sawtooth'; os.frequency.setValueAtTime(f, t); os.frequency.linearRampToValueAtTime(f * (0.85 + Math.random() * 0.3), t + 0.09);
    const f1 = A.ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 500 + Math.random() * 500; f1.Q.value = 5;
    const f2 = A.ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1400 + Math.random() * 1000; f2.Q.value = 6;
    const g = A.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.015); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    os.connect(f1).connect(g); os.connect(f2).connect(g); g.connect(out);
    os.start(t); os.stop(t + 0.12);
  },
  confetti(A, t, o) {
    const out = A._out({ ...o, verb: 0.3 });
    A.tone(out, t, 0.3, { f0: 120, f1: 50, vol: 1.2 });
    A.noise(out, t, 0.4, { filter: 'highpass', f0: 2000, f1: 6000, vol: 0.6 });
    for (let i = 0; i < 12; i++) A.noise(out, t + 0.1 + Math.random() * 1.2, 0.03, { filter: 'highpass', f0: 5000, vol: 0.06 });
  },
  sting(A, t, o) {
    // big orchestral hit
    const out = A._out({ bus: A.musicBus, verb: 0.6, vol: 1 });
    const d = A.shaper(out, A.drive);
    A.tone(d, t, 1.5, { f0: 55, f1: 40, vol: 1.6 });
    A.noise(d, t, 1.2, { type: 'brown', filter: 'lowpass', f0: 2000, f1: 100, vol: 1 });
    (o.chord || [146.8, 220, 293.7, 349.2]).forEach((f) => { A.tone(out, t, 1.6, { type: 'sawtooth', f0: f, vol: 0.07, a: 0.01 }); A.tone(out, t, 1.6, { type: 'sawtooth', f0: f * 1.005, vol: 0.07, a: 0.01 }); });
  },
};
