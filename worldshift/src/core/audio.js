// Fully synthesised audio (no assets): era ambience beds, generative music,
// footsteps, weapons, engines, sirens and the timeline shift.
import { G } from './state.js';
import { clamp } from './mathx.js';

export class Audio {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.listener = { x: 0, y: 0, z: 0, yaw: 0 };
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = G.settings.volume;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.ratio.value = 4;
    this.master.connect(this.comp);
    this.comp.connect(ctx.destination);
    // buses
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    this.warp = ctx.createBiquadFilter(); this.warp.type = 'lowpass'; this.warp.frequency.value = 20000; this.warp.connect(this.master);
    this.amb = ctx.createGain(); this.amb.gain.value = 0.5; this.amb.connect(this.warp);
    this.music = ctx.createGain(); this.music.gain.value = G.settings.music * 0.35; this.music.connect(this.warp);
    // reverb for the world
    this.verb = ctx.createConvolver();
    this.verb.buffer = this._impulse(2.4, 2.2);
    this.verbGain = ctx.createGain(); this.verbGain.gain.value = 0.22;
    this.verb.connect(this.verbGain); this.verbGain.connect(this.master);
    this.noise = this._noiseBuffer(2);
    this.brown = this._brownBuffer(4);
    this.ambLayers = [];
    this.musicState = { era: -1, next: 0, step: 0, intensity: 0 };
    this.ready = true;
    this.setEraAmbience(G.era);
  }

  _noiseBuffer(sec) {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  _brownBuffer(sec) {
    const b = this.ctx.createBuffer(1, this.ctx.sampleRate * sec, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
    return b;
  }
  _impulse(sec, decay) {
    const len = this.ctx.sampleRate * sec;
    const b = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  }

  // Spatial helper: returns a gain+panner chain end-node to connect sources to
  _spatial(pos, vol = 1, range = 60) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const pan = ctx.createStereoPanner();
    let gain = vol, p = 0;
    if (pos) {
      const L = this.listener;
      const dx = pos.x - L.x, dz = pos.z - L.z, dy = (pos.y || 0) - L.y;
      const d = Math.hypot(dx, dy, dz);
      gain = vol * clamp(1 - d / range, 0, 1) ** 1.6;
      // relative angle: camera looks along (sin yaw, cos yaw), right = (-cos, sin)
      const rx = -Math.cos(L.yaw), rz = Math.sin(L.yaw);
      p = clamp((dx * rx + dz * rz) / Math.max(1, d), -1, 1) * 0.85;
    }
    g.gain.value = gain;
    pan.pan.value = p;
    g.connect(pan);
    pan.connect(this.sfx);
    if (gain > 0.05) {
      const s = ctx.createGain();
      s.gain.value = 0.35;
      pan.connect(s); s.connect(this.verb);
    }
    return { node: g, gain };
  }

  _noiseShot(dest, t, dur, f0, f1, q = 1, type = 'bandpass', vol = 1) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }
  _tone(dest, t, dur, f0, f1, type = 'sine', vol = 1, attack = 0.005) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.05);
  }

  updateListener(cam, yaw) {
    this.listener.x = cam.position.x; this.listener.y = cam.position.y; this.listener.z = cam.position.z;
    this.listener.yaw = yaw;
  }

  footstep(surf, pos, loud = 0.6) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const sp = this._spatial(pos, 0.35 * loud, 30);
    if (sp.gain < 0.01) return;
    const d = sp.node;
    const s = { 0: [900, 2], 1: [700, 2], 2: [2400, 6], 3: [500, 3], 4: [1400, 0.7], 5: [600, 0.8], 6: [800, 0.5], 7: [3000, 4], 8: [1800, 3], 9: [400, 1], 10: [700, 1], 11: [1600, 0.6] }[surf] || [900, 2];
    this._noiseShot(d, t, 0.07 + Math.random() * 0.03, s[0] * (0.9 + Math.random() * 0.2), s[0] * 0.5, s[1], 'bandpass', 1.2);
    this._tone(d, t, 0.06, 90, 50, 'sine', 0.4);
    if (surf === 6) this._noiseShot(d, t + 0.02, 0.25, 1200, 400, 0.6, 'bandpass', 0.8);
  }

  play(name, pos = null, vol = 1) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    switch (name) {
      case 'jump': { const d = this._spatial(pos, 0.3).node; this._noiseShot(d, t, 0.12, 600, 300, 1, 'bandpass', 0.7); break; }
      case 'land': { const d = this._spatial(pos, 0.6 * vol).node; this._noiseShot(d, t, 0.18, 400, 120, 1, 'lowpass', 1); this._tone(d, t, 0.15, 110, 45, 'sine', 0.8); break; }
      case 'vault': case 'grab': { const d = this._spatial(pos, 0.35).node; this._noiseShot(d, t, 0.15, 1800, 600, 1.5, 'bandpass', 0.6); break; }
      case 'slide': { const d = this._spatial(pos, 0.4).node; this._noiseShot(d, t, 0.7, 2500, 500, 0.8, 'bandpass', 0.6); break; }
      case 'dodge': { const d = this._spatial(pos, 0.4).node; this._noiseShot(d, t, 0.35, 900, 300, 1, 'bandpass', 0.7); break; }
      case 'hurt': { const d = this._spatial(null, 0.5).node; this._tone(d, t, 0.18, 180, 70, 'sawtooth', 0.3); this._noiseShot(d, t, 0.12, 700, 200, 1, 'lowpass', 0.6); break; }
      case 'denied': { const d = this._spatial(null, 0.35).node; this._tone(d, t, 0.12, 220, 180, 'square', 0.25); this._tone(d, t + 0.13, 0.18, 160, 120, 'square', 0.25); break; }
      case 'ui': { const d = this._spatial(null, 0.2).node; this._tone(d, t, 0.06, 1200, 1500, 'triangle', 0.3); break; }
      case 'pickup': { const d = this._spatial(null, 0.35).node; this._tone(d, t, 0.12, 660, 990, 'triangle', 0.4); this._tone(d, t + 0.08, 0.2, 990, 1320, 'triangle', 0.3); break; }
      case 'objective': { const d = this._spatial(null, 0.4).node; [523, 659, 784, 1046].forEach((f, i) => this._tone(d, t + i * 0.09, 0.4, f, f, 'triangle', 0.25)); break; }
      case 'consequence': { const d = this._spatial(null, 0.45).node; [392, 494, 587, 740].forEach((f, i) => this._tone(d, t + i * 0.14, 0.9, f, f * 1.001, 'sine', 0.22)); this._noiseShot(d, t, 1.4, 6000, 2000, 2, 'bandpass', 0.15); break; }
      case 'hit': { const d = this._spatial(pos, 0.7).node; this._noiseShot(d, t, 0.08, 2500, 800, 1, 'bandpass', 1); this._tone(d, t, 0.08, 160, 60, 'sine', 0.7); break; }
      case 'punch': { const d = this._spatial(pos, 0.8).node; this._noiseShot(d, t, 0.1, 1200, 200, 0.7, 'lowpass', 1); this._tone(d, t, 0.12, 120, 40, 'sine', 1); break; }
      case 'whoosh': { const d = this._spatial(pos, 0.35).node; this._noiseShot(d, t, 0.22, 400, 2400, 2, 'bandpass', 0.6); break; }
      case 'click': { const d = this._spatial(pos, 0.3).node; this._tone(d, t, 0.03, 2000, 1500, 'square', 0.2); break; }
      case 'reload': { const d = this._spatial(pos, 0.4).node; this._noiseShot(d, t, 0.05, 3000, 2000, 4, 'bandpass', 0.8); this._noiseShot(d, t + 0.35, 0.06, 2500, 1500, 4, 'bandpass', 0.9); break; }
      case 'glass': { const d = this._spatial(pos, 0.6).node; for (let i = 0; i < 6; i++) this._tone(d, t + i * 0.03, 0.3, 3000 + Math.random() * 3000, 2000, 'triangle', 0.08); this._noiseShot(d, t, 0.3, 6000, 3000, 1, 'highpass', 0.5); break; }
      case 'crash': { const d = this._spatial(pos, Math.min(1.2, vol), 90).node; this._noiseShot(d, t, 0.6, 1800, 120, 0.6, 'lowpass', 1.2); this._tone(d, t, 0.4, 90, 30, 'sine', 1); for (let i = 0; i < 4; i++) this._tone(d, t + Math.random() * 0.2, 0.25, 1200 + Math.random() * 2000, 600, 'square', 0.05); break; }
      case 'explosion': { const d = this._spatial(pos, 1.4, 260).node; this._noiseShot(d, t, 1.8, 900, 40, 0.5, 'lowpass', 1.5); this._tone(d, t, 1.2, 70, 20, 'sine', 1.5); this._noiseShot(d, t + 0.05, 0.6, 3000, 300, 0.8, 'bandpass', 0.5); break; }
      case 'door': { const d = this._spatial(pos, 0.4).node; this._noiseShot(d, t, 0.25, 500, 200, 2, 'bandpass', 0.6); this._tone(d, t + 0.2, 0.1, 140, 90, 'sine', 0.5); break; }
      case 'plant': { const d = this._spatial(pos, 0.5).node; this._noiseShot(d, t, 0.3, 300, 150, 1, 'lowpass', 0.8); this._noiseShot(d, t + 0.35, 0.3, 300, 150, 1, 'lowpass', 0.6); break; }
      case 'spray': { const d = this._spatial(pos, 0.5).node; this._noiseShot(d, t, 0.9, 5000, 4000, 1, 'highpass', 0.5); break; }
      case 'horn': { const d = this._spatial(pos, 0.7, 120).node; this._tone(d, t, 0.45, 400, 400, 'sawtooth', 0.12); this._tone(d, t, 0.45, 500, 500, 'sawtooth', 0.1); break; }
      case 'scream': { const d = this._spatial(pos, 0.5, 70).node; const f = 600 + Math.random() * 300; this._tone(d, t, 0.6, f, f * 1.4, 'sawtooth', 0.06, 0.05); this._tone(d, t, 0.6, f * 1.5, f * 2, 'sine', 0.06, 0.05); break; }
      default: break;
    }
  }

  gunshot(kind, pos, suppressed = false) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    const sp = this._spatial(pos, suppressed ? 0.4 : 1.1, 300);
    const d = sp.node;
    if (kind === 'pistol') {
      this._noiseShot(d, t, 0.18, 3000, 300, 0.7, 'lowpass', 1.3);
      this._tone(d, t, 0.12, 180, 50, 'sine', 1.2);
    } else if (kind === 'shotgun') {
      this._noiseShot(d, t, 0.45, 2000, 100, 0.5, 'lowpass', 1.6);
      this._tone(d, t, 0.25, 110, 35, 'sine', 1.5);
    } else if (kind === 'smg' || kind === 'rifle') {
      this._noiseShot(d, t, 0.11, 4000, 500, 0.8, 'lowpass', 1.1);
      this._tone(d, t, 0.08, 220, 70, 'square', 0.25);
    } else if (kind === 'pulse') {
      this._tone(d, t, 0.18, 1800, 200, 'sawtooth', 0.35);
      this._tone(d, t, 0.22, 900, 80, 'square', 0.25);
      this._noiseShot(d, t, 0.1, 6000, 2000, 1, 'highpass', 0.4);
    } else if (kind === 'smart') {
      this._tone(d, t, 0.12, 2400, 800, 'square', 0.2);
      this._noiseShot(d, t, 0.1, 3000, 800, 1, 'bandpass', 0.8);
    } else if (kind === 'arc') {
      for (let i = 0; i < 5; i++) this._noiseShot(d, t + i * 0.025, 0.06, 7000, 3000, 2, 'bandpass', 0.6);
      this._tone(d, t, 0.25, 120, 60, 'sawtooth', 0.3);
    } else if (kind === 'scrap') {
      this._noiseShot(d, t, 0.35, 1600, 150, 0.6, 'lowpass', 1.5);
      this._tone(d, t, 0.2, 140, 40, 'sine', 1.3);
      this._tone(d, t + 0.02, 0.15, 900, 600, 'square', 0.08);
    } else if (kind === 'displacer') {
      this._tone(d, t, 0.6, 80, 1600, 'sine', 0.5);
      this._tone(d, t, 0.6, 1600, 80, 'triangle', 0.3);
    } else {
      this._noiseShot(d, t, 0.2, 3000, 300, 0.7, 'lowpass', 1.2);
    }
    // distant crack echo
    this._noiseShot(this.verb, t + 0.05, 0.6, 1500, 200, 0.5, 'lowpass', sp.gain * 0.4);
  }

  // The signature sound: reverse swell → pitch warp → deep boom + shimmer
  shift(from, to) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const d = this._spatial(null, 0.9).node;
    this._noiseShot(d, t, 0.5, 200, 8000, 2.5, 'bandpass', 0.7);
    this._tone(d, t, 0.6, 60, 900, 'sawtooth', 0.15, 0.3);
    this._tone(d, t + 0.25, 1.6, 55, 30, 'sine', 1.4, 0.02);
    this._noiseShot(d, t + 0.25, 1.4, 600, 60, 0.6, 'lowpass', 0.9);
    const base = [196, 262, 330][to];
    [1, 1.5, 2, 2.5, 3].forEach((m, i) => this._tone(d, t + 0.3 + i * 0.05, 1.8, base * m, base * m * 1.003, 'sine', 0.08));
    // warp the ambience/music bus
    const f = this.warp.frequency;
    f.cancelScheduledValues(t);
    f.setValueAtTime(20000, t);
    f.exponentialRampToValueAtTime(300, t + 0.25);
    f.exponentialRampToValueAtTime(20000, t + 1.4);
    this.setEraAmbience(to, 1.2);
  }

  setEraAmbience(era, fade = 2) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const l of this.ambLayers) {
      l.g.gain.cancelScheduledValues(t);
      l.g.gain.setValueAtTime(l.g.gain.value, t);
      l.g.gain.linearRampToValueAtTime(0, t + fade);
      setTimeout(() => { try { l.src.stop(); } catch (_) {} }, (fade + 0.5) * 1000);
    }
    this.ambLayers = [];
    const layer = (buf, type, freq, q, vol, rate = 1) => {
      const src = ctx.createBufferSource();
      src.buffer = buf; src.loop = true; src.playbackRate.value = rate;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      g.gain.linearRampToValueAtTime(vol, t + fade);
      src.connect(f); f.connect(g); g.connect(this.amb);
      src.start(t, Math.random() * 2);
      this.ambLayers.push({ src, g, f });
    };
    if (era === 0) {
      layer(this.brown, 'lowpass', 400, 0.5, 0.5);        // distant traffic rumble
      layer(this.noise, 'bandpass', 1800, 0.3, 0.05);     // city hiss
    } else if (era === 1) {
      layer(this.brown, 'lowpass', 220, 0.7, 0.55);       // megacity drone
      layer(this.noise, 'bandpass', 3200, 0.5, 0.05);
      layer(this.brown, 'bandpass', 90, 4, 0.35, 0.5);   // sub hum
    } else {
      layer(this.noise, 'lowpass', 600, 0.4, 0.18);       // wind
      layer(this.noise, 'bandpass', 5200, 3, 0.03);       // insects
    }
    this.musicState.era = era;
  }

  // ambient one-shots + generative music
  update(dt) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    this.master.gain.value = G.settings.volume;
    const ms = this.musicState;
    if (t > ms.next) {
      const era = G.era;
      const night = G.sky ? G.sky.night : 0;
      // ambient events
      const r = Math.random();
      const d = this._spatial({ x: this.listener.x + (Math.random() - 0.5) * 80, y: 5, z: this.listener.z + (Math.random() - 0.5) * 80 }, 0.25, 120).node;
      if (era === 0) {
        if (r < 0.25 && night < 0.5) this._birdChirp(d, t);
        else if (r < 0.35) this._tone(d, t, 0.4, 420, 420, 'sawtooth', 0.03);
        else if (r < 0.4) this._dogBark(d, t);
      } else if (era === 1) {
        if (r < 0.3) this._tone(d, t, 1.2, 300 + Math.random() * 200, 900, 'sine', 0.04, 0.4);
        else if (r < 0.45) this._noiseShot(d, t, 1.5, 300, 3000, 2, 'bandpass', 0.15);
      } else {
        if (r < 0.4) this._birdChirp(d, t, true);
        else if (r < 0.5) this._tone(d, t, 2.5, 110, 104, 'sine', 0.05, 1);
        else if (r < 0.58 && night > 0.5) this._tone(d, t, 0.8, 1200, 1100, 'sine', 0.03, 0.2);
      }
      this._musicStep(t);
      ms.next = t + 0.8 + Math.random() * 2.2;
    }
  }

  _birdChirp(d, t, exotic = false) {
    const n = 2 + Math.floor(Math.random() * 4);
    const base = exotic ? 1800 + Math.random() * 1500 : 2500 + Math.random() * 1500;
    for (let i = 0; i < n; i++) this._tone(d, t + i * 0.11, 0.08, base, base * (exotic ? 0.6 : 1.4), 'sine', 0.08);
  }
  _dogBark(d, t) {
    for (let i = 0; i < 2; i++) { this._tone(d, t + i * 0.25, 0.12, 380, 220, 'sawtooth', 0.05); this._noiseShot(d, t + i * 0.25, 0.1, 900, 400, 1, 'bandpass', 0.2); }
  }

  _musicStep(t) {
    const ms = this.musicState;
    const era = G.era;
    const d = this.music;
    ms.step++;
    // chord progressions per era
    const prog = era === 0 ? [[220, 277, 330], [196, 247, 294], [175, 220, 262], [196, 247, 330]]
      : era === 1 ? [[110, 131, 165], [98, 123, 147], [87, 110, 131], [104, 131, 156]]
        : [[147, 185, 220], [131, 165, 196], [110, 147, 175], [123, 156, 185]];
    const chord = prog[Math.floor(ms.step / 3) % prog.length];
    const type = era === 1 ? 'sawtooth' : era === 0 ? 'triangle' : 'sine';
    const dur = era === 2 ? 5 : 3.2;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = era === 1 ? 900 : 1600;
    f.connect(d);
    for (const n of chord) this._tone(f, t, dur, n, n * 1.002, type, 0.05, 0.8);
    if (era === 1 && ms.step % 2 === 0) {
      // arpeggio
      for (let i = 0; i < 8; i++) this._tone(f, t + i * 0.18, 0.15, chord[i % 3] * 2, chord[i % 3] * 2, 'square', 0.025);
    }
    if (era === 0 && ms.step % 3 === 0) this._tone(f, t, 0.9, chord[0] / 2, chord[0] / 2, 'sine', 0.08);
  }
}
