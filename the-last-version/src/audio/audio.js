// Web Audio engine: buses, reverb, synthesised instruments and sound effects.
// Everything here is generated at runtime — no third-party audio.
import * as THREE from 'three';

const rand = (a, b) => a + Math.random() * (b - a);

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.volumes = { master: 0.9, music: 0.7, sfx: 0.9, amb: 0.8 };
  }

  /** Must be called from a user gesture. */
  start() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14; this.comp.knee.value = 12; this.comp.ratio.value = 4;
    this.comp.attack.value = 0.004; this.comp.release.value = 0.2;
    this.muffle = ctx.createBiquadFilter(); this.muffle.type = 'lowpass'; this.muffle.frequency.value = 20000; this.muffle.Q.value = 0.5;
    this.master = ctx.createGain(); this.master.gain.value = this.volumes.master;
    this.muffle.connect(this.comp); this.comp.connect(this.master); this.master.connect(ctx.destination);
    const bus = (v) => { const g = ctx.createGain(); g.gain.value = v; g.connect(this.muffle); return g; };
    this.music = bus(this.volumes.music); this.sfx = bus(this.volumes.sfx); this.amb = bus(this.volumes.amb);
    this.reverb = ctx.createConvolver();
    this.reverbOut = ctx.createGain(); this.reverbOut.gain.value = 0.35;
    this.reverb.connect(this.reverbOut); this.reverbOut.connect(this.muffle);
    this.setReverb(2.2, 2.5);
    // shared noise buffers
    this.white = this.noiseBuffer('white', 4); this.pink = this.noiseBuffer('pink', 4); this.brown = this.noiseBuffer('brown', 4);
    this.listener = ctx.listener;
    this.shaper = ctx.createWaveShaper(); this.shaper.curve = this.distCurve(2.5);
  }

  get t() { return this.ctx ? this.ctx.currentTime : 0; }

  setVolumes(v) {
    Object.assign(this.volumes, v);
    if (!this.ctx) return;
    const now = this.t;
    this.master.gain.setTargetAtTime(this.volumes.master, now, 0.05);
    this.music.gain.setTargetAtTime(this.volumes.music, now, 0.05);
    this.sfx.gain.setTargetAtTime(this.volumes.sfx, now, 0.05);
    this.amb.gain.setTargetAtTime(this.volumes.amb, now, 0.05);
  }

  setMuffle(freq, time = 0.4) { if (this.ctx) this.muffle.frequency.setTargetAtTime(freq, this.t, time / 3); }

  noiseBuffer(type, seconds) {
    const ctx = this.ctx, n = ctx.sampleRate * seconds;
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
      for (let i = 0; i < n; i++) {
        const w = Math.random() * 2 - 1;
        if (type === 'white') d[i] = w;
        else if (type === 'pink') {
          b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
          b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
          d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
        } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      }
    }
    return buf;
  }

  setReverb(seconds, decay) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        // early reflections then diffuse tail
        const er = i < ctx.sampleRate * 0.08 && Math.random() < 0.004 ? (Math.random() * 2 - 1) * 2 : 0;
        d[i] = ((Math.random() * 2 - 1) * Math.pow(1 - t, decay) + er) * 0.6;
      }
    }
    this.reverb.buffer = buf;
  }
  setReverbMix(v) { if (this.ctx) this.reverbOut.gain.setTargetAtTime(v, this.t, 0.3); }

  distCurve(k) {
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / n) * 2 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
    return c;
  }

  // ---------- building blocks ----------
  noise(buf = this.white, loop = true) {
    const s = this.ctx.createBufferSource(); s.buffer = buf; s.loop = loop;
    s.loopStart = 0; s.loopEnd = buf.duration;
    return s;
  }
  osc(type, freq) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq; return o; }
  gain(v = 0) { const g = this.ctx.createGain(); g.gain.value = v; return g; }
  filter(type, freq, q = 1) { const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; }
  env(param, t, a, peak, d, sustain = 0, hold = 0, r = 0.1) {
    param.cancelScheduledValues(t);
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(peak, t + a);
    if (hold > 0 || sustain > 0) {
      param.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
      param.setValueAtTime(Math.max(sustain, 0.0001), t + a + d + hold);
      param.exponentialRampToValueAtTime(0.0001, t + a + d + hold + r);
    } else param.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  /** Creates a positional output node chain. Returns { input, panner }. */
  spatial(dest = this.sfx, { ref = 8, rolloff = 1.2, max = 400 } = {}) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse';
    p.refDistance = ref; p.rolloffFactor = rolloff; p.maxDistance = max;
    p.connect(dest);
    return p;
  }
  setPos(panner, v) {
    if (!panner) return;
    const t = this.t;
    if (panner.positionX) { panner.positionX.setTargetAtTime(v.x, t, 0.02); panner.positionY.setTargetAtTime(v.y, t, 0.02); panner.positionZ.setTargetAtTime(v.z, t, 0.02); }
    else panner.setPosition(v.x, v.y, v.z);
  }

  updateListener(camera) {
    if (!this.ctx) return;
    const l = this.listener, p = camera.getWorldPosition(_v1), f = camera.getWorldDirection(_v2);
    const up = _v3.set(0, 1, 0).applyQuaternion(camera.getWorldQuaternion(_q));
    const t = this.t;
    if (l.positionX) {
      l.positionX.setTargetAtTime(p.x, t, 0.02); l.positionY.setTargetAtTime(p.y, t, 0.02); l.positionZ.setTargetAtTime(p.z, t, 0.02);
      l.forwardX.setTargetAtTime(f.x, t, 0.02); l.forwardY.setTargetAtTime(f.y, t, 0.02); l.forwardZ.setTargetAtTime(f.z, t, 0.02);
      l.upX.setTargetAtTime(up.x, t, 0.02); l.upY.setTargetAtTime(up.y, t, 0.02); l.upZ.setTargetAtTime(up.z, t, 0.02);
    } else { l.setPosition(p.x, p.y, p.z); l.setOrientation(f.x, f.y, f.z, up.x, up.y, up.z); }
  }

  // ---------- one-shot SFX ----------
  /** Generic noise burst with filter sweep. */
  burst({ dest = this.sfx, pos = null, dur = 0.3, freq = 1200, freqEnd = null, q = 1, type = 'bandpass', vol = 0.5, buf = this.white, attack = 0.002, at = 0, reverb = 0.2 } = {}) {
    if (!this.ctx) return;
    const t = this.t + at;
    const s = this.noise(buf, false), f = this.filter(type, freq, q), g = this.gain();
    s.playbackRate.value = rand(0.9, 1.1);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    this.env(g.gain, t, attack, vol, dur);
    s.connect(f); f.connect(g);
    const out = pos ? this.spatial(dest) : dest;
    if (pos) this.setPos(out, pos);
    g.connect(out);
    if (reverb > 0) { const rs = this.gain(reverb); g.connect(rs); rs.connect(this.reverb); }
    s.start(t, rand(0, 3)); s.stop(t + dur + 0.1);
  }

  tone({ dest = this.sfx, pos = null, type = 'sine', freq = 440, freqEnd = null, dur = 0.3, vol = 0.3, attack = 0.005, at = 0, reverb = 0.1 } = {}) {
    if (!this.ctx) return;
    const t = this.t + at;
    const o = this.osc(type, freq), g = this.gain();
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    this.env(g.gain, t, attack, vol, dur);
    o.connect(g);
    const out = pos ? this.spatial(dest) : dest;
    if (pos) this.setPos(out, pos);
    g.connect(out);
    if (reverb > 0) { const rs = this.gain(reverb); g.connect(rs); rs.connect(this.reverb); }
    o.start(t); o.stop(t + dur + 0.05);
  }

  /** Metallic resonance — a cluster of tuned high-Q bandpasses excited by noise. */
  metal({ pos = null, base = 300, vol = 0.4, dur = 0.8, at = 0, dest = this.sfx } = {}) {
    if (!this.ctx) return;
    const t = this.t + at;
    const s = this.noise(this.white, false), g = this.gain();
    const out = pos ? this.spatial(dest) : dest; if (pos) this.setPos(out, pos);
    const ratios = [1, 1.47, 2.09, 2.56, 3.71, 4.9];
    for (const r of ratios) {
      const f = this.filter('bandpass', base * r * rand(0.97, 1.03), 40 + Math.random() * 60);
      const fg = this.gain(); this.env(fg.gain, t, 0.001, vol * rand(0.5, 1.4), dur * rand(0.4, 1));
      s.connect(f); f.connect(fg); fg.connect(g);
    }
    g.gain.value = 3; g.connect(out);
    const rs = this.gain(0.3); g.connect(rs); rs.connect(this.reverb);
    s.start(t, rand(0, 3)); s.stop(t + dur + 0.1);
  }

  crash(pos, power = 1) {
    // car/structure impact: thud + crunch + rattling metal + glass
    this.tone({ pos, freq: 90 * rand(0.8, 1.2), freqEnd: 35, dur: 0.5, vol: 0.9 * power, type: 'sine' });
    this.burst({ pos, freq: 900, freqEnd: 200, q: 0.7, dur: 0.35, vol: 0.9 * power, type: 'lowpass', buf: this.pink });
    this.burst({ pos, freq: 2500, q: 2, dur: 0.2, vol: 0.4 * power, at: 0.01 });
    this.metal({ pos, base: rand(180, 320), vol: 0.35 * power, dur: 0.9 });
    if (power > 0.6) for (let i = 0; i < 6; i++) this.tone({ pos, type: 'triangle', freq: rand(3000, 7000), dur: 0.08, vol: 0.06, at: 0.03 + i * rand(0.01, 0.05) });
  }

  explosion(pos, power = 1) {
    this.tone({ pos, freq: 60, freqEnd: 22, dur: 1.6, vol: 1.2 * power });
    this.burst({ pos, freq: 1600, freqEnd: 120, q: 0.5, type: 'lowpass', dur: 2.2, vol: 1.1 * power, buf: this.brown, reverb: 0.6 });
    this.burst({ pos, freq: 4000, freqEnd: 600, q: 0.6, dur: 0.6, vol: 0.5 * power });
    this.metal({ pos, base: 140, vol: 0.2, dur: 1.4, at: 0.15 });
  }

  gunshot(pos, heavy = false) {
    this.burst({ pos, freq: heavy ? 1200 : 2400, freqEnd: 300, q: 0.6, type: 'lowpass', dur: heavy ? 0.25 : 0.12, vol: heavy ? 0.9 : 0.6, reverb: 0.4 });
    this.tone({ pos, freq: heavy ? 110 : 160, freqEnd: 40, dur: 0.15, vol: 0.7 });
    this.burst({ pos, freq: 6000, q: 1, dur: 0.04, vol: 0.4 });
  }

  splash(pos, size = 1) {
    this.burst({ pos, freq: 1400, freqEnd: 300, q: 0.4, type: 'lowpass', dur: 0.6 * size, vol: 0.6 * size, buf: this.pink, reverb: 0.3 });
    this.burst({ pos, freq: 4000, q: 0.8, dur: 0.3 * size, vol: 0.25 * size, at: 0.05 });
  }

  thunder(dist = 1) {
    if (!this.ctx) return;
    const at = dist * 0.8;
    this.burst({ dest: this.amb, freq: 2000 / (1 + dist), freqEnd: 60, q: 0.3, type: 'lowpass', dur: 4.5, vol: 1.2 / (0.6 + dist * 0.4), buf: this.brown, attack: 0.05, at, reverb: 0.8 });
    for (let i = 0; i < 4; i++) this.burst({ dest: this.amb, freq: rand(200, 600), type: 'lowpass', dur: rand(0.6, 1.5), vol: 0.5 / (0.5 + dist), buf: this.brown, at: at + rand(0.2, 2.2), reverb: 0.8 });
  }

  footstep(surface = 'concrete', pos = null, vol = 0.35) {
    const s = {
      concrete: { freq: 1800, q: 0.9, dur: 0.09 }, carpet: { freq: 500, q: 0.5, dur: 0.12 },
      wood: { freq: 700, q: 2.5, dur: 0.12 }, metal: { freq: 2200, q: 3, dur: 0.12 }, wet: { freq: 2600, q: 0.5, dur: 0.16 }, tile: { freq: 3200, q: 1.5, dur: 0.06 },
    }[surface] || { freq: 1500, q: 1, dur: 0.1 };
    this.burst({ pos, freq: s.freq * rand(0.85, 1.15), q: s.q, dur: s.dur, vol, reverb: 0.25 });
    this.tone({ pos, freq: rand(70, 110), freqEnd: 40, dur: 0.08, vol: vol * 0.6, reverb: 0 });
    if (surface === 'metal') this.metal({ pos, base: rand(400, 700), vol: vol * 0.2, dur: 0.25 });
    if (surface === 'wood' && Math.random() < 0.3) this.creakShort(pos, vol * 0.5);
  }

  creakShort(pos, vol = 0.2) {
    if (!this.ctx) return;
    const t = this.t, o = this.osc('sawtooth', rand(40, 70)), f = this.filter('bandpass', rand(700, 1400), 8), g = this.gain();
    o.frequency.linearRampToValueAtTime(rand(30, 90), t + 0.4);
    this.env(g.gain, t, 0.05, vol, 0.4);
    o.connect(f); f.connect(g);
    const out = pos ? this.spatial(this.sfx, { ref: 3 }) : this.sfx; if (pos) this.setPos(out, pos);
    g.connect(out); o.start(t); o.stop(t + 0.5);
  }

  heartbeat(rate = 1, vol = 0.5) {
    this.tone({ freq: 55, freqEnd: 35, dur: 0.18, vol, type: 'sine', reverb: 0 });
    this.tone({ freq: 50, freqEnd: 32, dur: 0.16, vol: vol * 0.7, type: 'sine', at: 0.28 / rate, reverb: 0 });
  }

  ui(kind = 'click') {
    if (kind === 'click') this.tone({ type: 'triangle', freq: 1400, freqEnd: 900, dur: 0.05, vol: 0.08, reverb: 0 });
    else if (kind === 'hover') this.tone({ type: 'sine', freq: 2200, dur: 0.03, vol: 0.03, reverb: 0 });
    else if (kind === 'objective') { [587, 880, 1175].forEach((f, i) => this.tone({ type: 'sine', freq: f, dur: 0.9, vol: 0.07, at: i * 0.07, reverb: 0.5 })); }
    else if (kind === 'checkpoint') { [440, 659].forEach((f, i) => this.tone({ type: 'triangle', freq: f, dur: 0.4, vol: 0.06, at: i * 0.09, reverb: 0.4 })); }
    else if (kind === 'choice') this.tone({ type: 'sine', freq: 660, freqEnd: 990, dur: 0.15, vol: 0.06, reverb: 0.3 });
  }

  /** Reality-rewrite sound: descending detuned sweep + granular crackle + sub drop. */
  rewrite(dur = 3) {
    if (!this.ctx) return;
    const t = this.t;
    for (let i = 0; i < 5; i++) {
      const o = this.osc('sawtooth', 220 * Math.pow(1.5, i % 3) * rand(0.98, 1.02)), f = this.filter('lowpass', 3000, 2), g = this.gain();
      o.frequency.exponentialRampToValueAtTime(30 + i * 7, t + dur);
      f.frequency.exponentialRampToValueAtTime(200, t + dur);
      this.env(g.gain, t, dur * 0.4, 0.06, dur * 0.6);
      o.connect(f); f.connect(g); g.connect(this.sfx); const rs = this.gain(0.6); g.connect(rs); rs.connect(this.reverb);
      o.start(t); o.stop(t + dur + 0.1);
    }
    for (let i = 0; i < 40; i++) this.burst({ freq: rand(1000, 9000), q: 8, dur: 0.03, vol: rand(0.03, 0.12), at: rand(0, dur) });
    this.tone({ freq: 80, freqEnd: 20, dur: dur + 1, vol: 0.8, at: dur * 0.6 });
  }
}

const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q = new THREE.Quaternion();

// ---------- continuous sound sources ----------

/** Combustion engine: firing harmonics, intake noise, load-dependent distortion. */
export class EngineSound {
  constructor(audio, { cylinders = 8, base = 1, positional = false, dest, vol = 0.3, boat = false } = {}) {
    this.a = audio; const ctx = audio.ctx; this.cyl = cylinders; this.base = base; this.boat = boat;
    this.out = audio.gain(0);
    this.panner = positional ? audio.spatial(dest || audio.sfx, { ref: 6, rolloff: 1.4 }) : null;
    this.out.connect(this.panner || dest || audio.sfx);
    this.vol = vol;
    this.lp = audio.filter('lowpass', 1200, 1.5);
    this.shaper = ctx.createWaveShaper(); this.shaper.curve = audio.distCurve(3);
    this.pre = audio.gain(0.5);
    this.pre.connect(this.shaper); this.shaper.connect(this.lp); this.lp.connect(this.out);
    this.oscs = [['sawtooth', 1, 0.5], ['square', 0.5, 0.35], ['sawtooth', 2.01, 0.18], ['sine', 0.25, 0.6]].map(([type, mult, g]) => {
      const o = audio.osc(type, 50), og = audio.gain(g); o.connect(og); og.connect(this.pre); o.start(); return { o, mult };
    });
    // amplitude modulation gives the "lumpy" idle of a big engine / the slap of a hull
    this.am = audio.osc('sine', 12); this.amG = audio.gain(0.25); this.am.connect(this.amG); this.amG.connect(this.pre.gain); this.am.start();
    this.nz = audio.noise(audio.pink); this.nzF = audio.filter('bandpass', 800, 0.8); this.nzG = audio.gain(0.05);
    this.nz.connect(this.nzF); this.nzF.connect(this.nzG); this.nzG.connect(this.out); this.nz.start();
  }
  update(rpm, throttle, pos) {
    const t = this.a.t;
    const fire = (rpm / 60) * (this.cyl / 2) * this.base * 0.5;
    for (const { o, mult } of this.oscs) o.frequency.setTargetAtTime(Math.max(fire * mult, 20), t, 0.03);
    this.am.frequency.setTargetAtTime(Math.max(rpm / 60 / 2, 4), t, 0.05);
    this.lp.frequency.setTargetAtTime(400 + throttle * 2400 + rpm * 0.15, t, 0.05);
    this.nzF.frequency.setTargetAtTime(500 + rpm * 0.3, t, 0.05);
    this.nzG.gain.setTargetAtTime(0.03 + throttle * (this.boat ? 0.2 : 0.08), t, 0.05);
    this.out.gain.setTargetAtTime(this.vol * (0.55 + throttle * 0.45), t, 0.05);
    if (pos && this.panner) this.a.setPos(this.panner, pos);
  }
  stop() { try { this.out.gain.setTargetAtTime(0, this.a.t, 0.1); setTimeout(() => { for (const { o } of this.oscs) o.stop(); this.am.stop(); this.nz.stop(); this.out.disconnect(); }, 600); } catch {} }
}

/** Looping filtered noise with controllable level/frequency (wind, rain, tyres, sea). */
export class NoiseLoop {
  constructor(audio, { buf, type = 'lowpass', freq = 800, q = 0.7, dest, positional = false, ref = 6 } = {}) {
    this.a = audio;
    this.s = audio.noise(buf || audio.pink); this.f = audio.filter(type, freq, q); this.g = audio.gain(0);
    this.panner = positional ? audio.spatial(dest || audio.sfx, { ref }) : null;
    this.s.connect(this.f); this.f.connect(this.g); this.g.connect(this.panner || dest || audio.sfx);
    this.s.start(0, Math.random() * 3);
  }
  set(level, freq, time = 0.08) {
    const t = this.a.t; this.g.gain.setTargetAtTime(level, t, time);
    if (freq) this.f.frequency.setTargetAtTime(freq, t, time);
  }
  pos(p) { if (this.panner) this.a.setPos(this.panner, p); }
  stop() { this.g.gain.setTargetAtTime(0, this.a.t, 0.2); setTimeout(() => { try { this.s.stop(); this.g.disconnect(); } catch {} }, 1200); }
}

/** Police siren with wail / yelp modes and doppler. */
export class Siren {
  constructor(audio) {
    this.a = audio; const ctx = audio.ctx;
    this.panner = audio.spatial(audio.sfx, { ref: 10, rolloff: 1.1 });
    this.o = audio.osc('square', 700); this.o2 = audio.osc('sawtooth', 703);
    this.f = audio.filter('bandpass', 1300, 1.2); this.g = audio.gain(0);
    this.lfo = audio.osc('sine', 0.25); this.lfoG = audio.gain(350);
    this.lfo.connect(this.lfoG); this.lfoG.connect(this.o.frequency); this.lfoG.connect(this.o2.frequency);
    this.o.connect(this.f); this.o2.connect(this.f); this.f.connect(this.g); this.g.connect(this.panner);
    this.o.start(); this.o2.start(); this.lfo.start();
    this.mode = 0; this.timer = 0;
  }
  update(dt, pos, doppler = 1, level = 0.12) {
    this.timer -= dt;
    if (this.timer < 0) { this.mode = Math.random() < 0.6 ? 0 : 1; this.timer = rand(3, 7); this.lfo.frequency.setTargetAtTime(this.mode ? 3.2 : 0.28, this.a.t, 0.1); }
    const base = 950 * doppler;
    this.o.frequency.setTargetAtTime(base, this.a.t, 0.05); this.o2.frequency.setTargetAtTime(base * 1.004, this.a.t, 0.05);
    this.g.gain.setTargetAtTime(level, this.a.t, 0.1);
    this.a.setPos(this.panner, pos);
  }
  stop() { this.g.gain.setTargetAtTime(0, this.a.t, 0.1); setTimeout(() => { try { this.o.stop(); this.o2.stop(); this.lfo.stop(); this.g.disconnect(); } catch {} }, 800); }
}

/** Helicopter: blade-slap pulses + turbine whine. */
export class RotorSound {
  constructor(audio) {
    this.a = audio;
    this.panner = audio.spatial(audio.sfx, { ref: 20, rolloff: 0.9 });
    this.n = audio.noise(audio.brown); this.f = audio.filter('lowpass', 500, 1.5); this.g = audio.gain(0);
    this.am = audio.osc('square', 18); this.amG = audio.gain(0.5); this.am.connect(this.amG); this.amG.connect(this.g.gain);
    this.n.connect(this.f); this.f.connect(this.g); this.g.connect(this.panner);
    this.w = audio.osc('sawtooth', 2400); this.wf = audio.filter('bandpass', 2400, 10); this.wg = audio.gain(0.02);
    this.w.connect(this.wf); this.wf.connect(this.wg); this.wg.connect(this.panner);
    this.n.start(); this.am.start(); this.w.start();
  }
  update(pos, level = 0.6) { this.g.gain.setTargetAtTime(level, this.a.t, 0.2); this.a.setPos(this.panner, pos); }
  stop() { this.g.gain.setTargetAtTime(0, this.a.t, 0.2); this.wg.gain.setTargetAtTime(0, this.a.t, 0.2); setTimeout(() => { try { this.n.stop(); this.am.stop(); this.w.stop(); } catch {} }, 1000); }
}
