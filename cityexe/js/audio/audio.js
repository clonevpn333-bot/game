// Procedural audio (no asset files): city ambience, traffic, weather, wildlife,
// sirens with stereo + distance, the possessed vehicle's engine, footsteps,
// impacts, horns, alarms, thunder, transitions.
import { clamp, dist, lerp } from '../core/math.js';

export class Audio {
  constructor(game) {
    this.game = game;
    this.volume = 0.7;
    try { const v = localStorage.getItem('cityexe.volume'); if (v != null) this.volume = +v; } catch (e) { /* ignore */ }
    this.ctx = null;
    this.started = false;
    const start = () => { this.start(); removeEventListener('pointerdown', start); removeEventListener('keydown', start); };
    addEventListener('pointerdown', start);
    addEventListener('keydown', start);
    this.sirens = [];
    this.chirpT = 2;
    this.crackT = 0;
  }

  start() {
    if (this.started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.started = true;
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    // noise buffers
    const len = ctx.sampleRate * 2;
    this.white = ctx.createBuffer(1, len, ctx.sampleRate);
    const w = this.white.getChannelData(0);
    for (let i = 0; i < len; i++) w[i] = Math.random() * 2 - 1;
    this.brown = ctx.createBuffer(1, len, ctx.sampleRate);
    const b = this.brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; b[i] = last * 3.5; }
    const loop = (buf, filterType, freq, q = 0.7) => {
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(f).connect(g).connect(this.master);
      src.start(0, Math.random() * 1.5);
      return { src, f, g };
    };
    this.hum = loop(this.brown, 'lowpass', 320);
    this.traffic = loop(this.white, 'bandpass', 700, 0.6);
    this.rain = loop(this.white, 'highpass', 1800);
    this.wind = loop(this.brown, 'bandpass', 500, 1.2);
    this.room = loop(this.brown, 'lowpass', 180);
    // crickets: a pulsing tone
    this.crick = ctx.createOscillator(); this.crick.type = 'sine'; this.crick.frequency.value = 4400;
    this.crickG = ctx.createGain(); this.crickG.gain.value = 0;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 22; const lfoG = ctx.createGain(); lfoG.gain.value = 0.5;
    const am = ctx.createGain(); am.gain.value = 0.5;
    lfo.connect(lfoG).connect(am.gain);
    this.crick.connect(am).connect(this.crickG).connect(this.master);
    this.crick.start(); lfo.start();
    // sirens: two voices
    for (let i = 0; i < 2; i++) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 800;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
      const g = ctx.createGain(); g.gain.value = 0;
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      o.connect(f).connect(g).connect(p).connect(this.master);
      o.start();
      this.sirens.push({ o, g, p, phase: Math.random() * 3 });
    }
    // engine voice
    this.eng = { a: ctx.createOscillator(), b: ctx.createOscillator(), f: ctx.createBiquadFilter(), g: ctx.createGain() };
    this.eng.a.type = 'sawtooth'; this.eng.b.type = 'square';
    this.eng.f.type = 'lowpass'; this.eng.f.frequency.value = 600;
    this.eng.g.gain.value = 0;
    this.eng.a.connect(this.eng.f); this.eng.b.connect(this.eng.f);
    this.eng.f.connect(this.eng.g).connect(this.master);
    this.eng.a.start(); this.eng.b.start();
    this.game.world.on('thunder', (e) => setTimeout(() => this.thunder(), e.delay * 1000));
    this.game.world.on('impact', (e) => { const cam = this.game.renderer.camera.position; const d = dist(cam.x, cam.z, e.x, e.z); if (d < 160) this.impact(e.power * clamp(1 - d / 160, 0, 1)); });
    this.game.world.on('meteorImpact', () => { this.impact(40); this.thunder(true); });
    this.game.world.on('crime', (e) => { const cam = this.game.renderer.camera.position; if (e.inc && dist(cam.x, cam.z, e.inc.x, e.inc.z) < 120) this.alarm(); });
  }

  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; try { localStorage.setItem('cityexe.volume', v); } catch (e) { /* ignore */ } }
  get t() { return this.ctx.currentTime; }

  env(g, peak, attack, decay, at = this.t) {
    g.gain.cancelScheduledValues(at);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
  }
  burst(buf, type, freq, q, peak, attack, decay, rate = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    s.connect(f).connect(g).connect(this.master);
    this.env(g, peak, attack, decay);
    s.start(0, Math.random()); s.stop(this.t + attack + decay + 0.05);
    return f;
  }
  tone(type, freq, peak, attack, decay, freqEnd) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, this.t + attack + decay);
    const g = this.ctx.createGain();
    o.connect(g).connect(this.master);
    this.env(g, peak, attack, decay);
    o.start(); o.stop(this.t + attack + decay + 0.05);
  }

  // ---------------------------------------------------------------- one-shots
  whoosh(inward) {
    if (!this.ctx) return;
    const f = this.burst(this.white, 'bandpass', inward ? 400 : 2400, 1.2, 0.35, 0.6, 1.3);
    if (f) f.frequency.exponentialRampToValueAtTime(inward ? 2600 : 300, this.t + 1.8);
  }
  footstep(run, wet, snow, indoor) {
    if (!this.ctx) return;
    this.burst(this.white, 'bandpass', snow > 0.4 ? 900 : indoor ? 1500 : 2200 + Math.random() * 600, wet > 0.3 ? 0.8 : 2.5, run ? 0.12 : 0.07, 0.005, wet > 0.3 ? 0.12 : 0.07);
    this.tone('sine', 90 + Math.random() * 20, run ? 0.08 : 0.04, 0.003, 0.06);
  }
  impact(power) {
    if (!this.ctx || power < 1) return;
    const p = clamp(power / 20, 0.05, 1);
    this.tone('sine', 70, 0.6 * p, 0.005, 0.5, 35);
    this.burst(this.white, 'lowpass', 1800, 0.7, 0.5 * p, 0.003, 0.35);
    if (power > 6) setTimeout(() => this.burst(this.white, 'highpass', 4000, 0.5, 0.15 * p, 0.01, 0.6), 60);
    if (this.game.rig) this.game.rig.shake = Math.max(this.game.rig.shake, p * 1.2);
  }
  horn(v) {
    if (!this.ctx) return;
    const big = v && (v.type === 'bus' || v.type === 'firetruck');
    this.tone('square', big ? 220 : 392, 0.12, 0.01, 0.45);
    this.tone('square', big ? 277 : 494, 0.1, 0.01, 0.45);
  }
  door() { if (!this.ctx) return; this.tone('sine', 140, 0.15, 0.003, 0.12, 80); this.burst(this.white, 'bandpass', 600, 2, 0.08, 0.002, 0.08); }
  alarm() {
    if (!this.ctx) return;
    for (let i = 0; i < 10; i++) setTimeout(() => this.tone('square', 1250, 0.06, 0.005, 0.12), i * 180);
  }
  thunder(close) {
    if (!this.ctx) return;
    const f = this.burst(this.brown, 'lowpass', close ? 900 : 300, 0.5, close ? 1.0 : 0.6, 0.05, 4.5, 0.6);
    this.tone('sine', 45, 0.4, 0.05, 2.5, 30);
  }
  siren(on) { this.forceSiren = on ? 6 : 0; }

  engineStart(v) { this.engineOn = true; this.engineV = v; if (this.ctx) this.tone('sawtooth', 60, 0.08, 0.05, 0.4, 120); }
  engineStop() { this.engineOn = false; if (this.eng) this.eng.g.gain.setTargetAtTime(0, this.t, 0.15); }
  engine(v, fwd, throttle) {
    if (!this.ctx || !this.engineOn) return;
    const big = v.T.mass > 2.5;
    const sp = Math.abs(fwd);
    const gear = Math.min(5, Math.floor(sp / 9));
    const rpm = 0.25 + (sp - gear * 9) / 9 * 0.75 * (gear ? 0.7 : 1) + throttle * 0.1;
    const base = big ? 34 : 48;
    const f = base + rpm * (big ? 70 : 110);
    this.eng.a.frequency.setTargetAtTime(f, this.t, 0.05);
    this.eng.b.frequency.setTargetAtTime(f * 0.5, this.t, 0.05);
    this.eng.f.frequency.setTargetAtTime(400 + throttle * 900 + sp * 20, this.t, 0.08);
    this.eng.g.gain.setTargetAtTime(0.05 + throttle * 0.06 + sp * 0.001, this.t, 0.1);
    // tire screech when sliding
    const side = Math.abs(v.vx * Math.cos(v.h) - v.vz * Math.sin(v.h));
    if (side > 4 && Math.random() < 0.3) this.burst(this.white, 'bandpass', 2600, 6, 0.05 * Math.min(1, side / 10), 0.02, 0.12);
  }

  // ---------------------------------------------------------------- per frame
  update(dt) {
    if (!this.ctx) return;
    const g = this.game, W = g.world;
    const cam = g.renderer.camera.position;
    const alt = cam.y;
    const indoor = g.interiors && g.interiors.active;
    const T = this.t;
    const k = 0.25;
    // nearby traffic energy
    let energy = 0;
    if (!indoor) for (const v of g.vehicleView.visible) { const d = dist(v.x, v.z, cam.x, cam.z) + Math.abs(alt - v.y); if (d < 90) energy += (v.speed || 0) / (8 + d); }
    const altF = clamp(1 - (alt - 30) / 500, 0.15, 1);
    const night = W.env.night;
    const paused = g.paused;
    const mute = paused ? 0.25 : 1;
    this.hum.g.gain.setTargetAtTime((indoor ? 0.04 : 0.09 + (1 - night) * 0.05) * mute, T, k);
    this.traffic.g.gain.setTargetAtTime(indoor ? 0.005 : clamp(energy * 0.12, 0, 0.18) * altF * mute, T, k);
    this.traffic.f.frequency.setTargetAtTime(500 + clamp(energy * 400, 0, 900), T, k);
    this.rain.g.gain.setTargetAtTime((W.weather.precip > 0.05 && !W.weather.snowing ? W.weather.precip * (indoor ? 0.04 : 0.16) : 0) * mute, T, k);
    let windAmt = W.weather.wind * 0.12 + (alt > 150 ? 0.03 : 0);
    for (const tor of W.disasters.tornadoes) windAmt += clamp(1 - dist(tor.x, tor.z, cam.x, cam.z) / 400, 0, 1) * 0.5;
    this.wind.g.gain.setTargetAtTime((indoor ? windAmt * 0.15 : windAmt) * mute, T, 0.5);
    this.wind.f.frequency.setTargetAtTime(300 + Math.sin(T * 0.7) * 150 + windAmt * 400, T, 0.3);
    this.room.g.gain.setTargetAtTime(indoor ? 0.07 : 0, T, 0.3);
    this.crickG.gain.setTargetAtTime(!indoor && night > 0.7 && W.season !== 3 && W.weather.precip < 0.2 ? 0.006 * altF * mute : 0, T, 1);
    // birds by day near trees
    this.chirpT -= dt;
    if (this.chirpT <= 0 && !indoor && !paused) {
      this.chirpT = 0.6 + Math.random() * 3;
      if (night < 0.3 && W.weather.precip < 0.3 && alt < 120 && W.season !== 3) {
        const f0 = 2600 + Math.random() * 1800;
        const n = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) setTimeout(() => this.tone('sine', f0, 0.025, 0.01, 0.09, f0 * (1.2 + Math.random() * 0.3)), i * 110);
      }
    }
    // fire crackle
    this.crackT -= dt;
    if (this.crackT <= 0) {
      this.crackT = 0.05 + Math.random() * 0.15;
      let fire = 0;
      for (const b of W.city.buildings) if (b.fire > 0) fire = Math.max(fire, b.fire * clamp(1 - dist(b.x, b.z, cam.x, cam.z) / 120, 0, 1));
      if (fire > 0.05 && !indoor) this.burst(this.white, 'highpass', 2500 + Math.random() * 2000, 1, 0.08 * fire, 0.002, 0.04);
    }
    // sirens: nearest two
    const list = W.sirens.slice().sort((a, b) => dist(a.x, a.z, cam.x, cam.z) - dist(b.x, b.z, cam.x, cam.z));
    this.sirens.forEach((s, i) => {
      const v = list[i];
      if (this.forceSiren > 0 && i === 0) {
        this.forceSiren -= dt;
        s.phase += dt;
        s.o.frequency.setTargetAtTime(500 + (Math.sin(s.phase * 0.8) * 0.5 + 0.5) * 400, T, 0.05);
        s.g.gain.setTargetAtTime(0.06, T, 0.2);
        return;
      }
      if (!v || indoor) { s.g.gain.setTargetAtTime(0, T, 0.3); return; }
      const d = dist(v.x, v.z, cam.x, cam.z) + Math.abs(alt - v.y) * 0.5;
      const vol = clamp(1 - d / 380, 0, 1) ** 2 * 0.09;
      s.phase += dt;
      const wail = v.type === 'police' ? (Math.floor(s.phase * 3) % 2 ? 1 : 0) * 0.6 + (Math.sin(s.phase * 2.3) * 0.5 + 0.5) * 0.4 : Math.sin(s.phase * 1.6) * 0.5 + 0.5;
      const base = v.type === 'firetruck' ? 520 : v.type === 'ambulance' ? 700 : 760;
      // doppler-ish shift
      const rx = v.x - cam.x, rz = v.z - cam.z, L = Math.hypot(rx, rz) || 1;
      const closing = -((v.vx || Math.sin(v.h) * v.speed) * rx + (v.vz || Math.cos(v.h) * v.speed) * rz) / L;
      s.o.frequency.setTargetAtTime((base + wail * base * 0.75) * (1 + closing / 340), T, 0.03);
      s.g.gain.setTargetAtTime(vol, T, 0.1);
      if (s.p.pan) {
        const cd = g.renderer.camera.matrixWorld.elements;
        const pan = clamp((rx * cd[0] + rz * cd[2]) / L, -1, 1);
        s.p.pan.setTargetAtTime(pan * 0.8, T, 0.1);
      }
    });
  }
}
