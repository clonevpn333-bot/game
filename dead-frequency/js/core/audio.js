'use strict';
// Procedural audio. Every sound in the game is synthesized with WebAudio.

const SND = {
  ctx: null,
  ready: false,
  loops: new Set(),
  occTimer: 0,

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain();
    this.master.gain.value = G.settings.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(ctx.destination);

    // buses
    this.bus = {};
    for (const b of ['sfx', 'amb', 'radio', 'ui', 'voice', 'music']) {
      const g = ctx.createGain(); g.connect(this.master); this.bus[b] = g;
    }
    // global "muffle" filter used for ducking world sound (hiding, headphones, car interior)
    this.worldFilter = ctx.createBiquadFilter();
    this.worldFilter.type = 'lowpass'; this.worldFilter.frequency.value = 20000;
    this.worldGain = ctx.createGain();
    this.worldFilter.connect(this.worldGain); this.worldGain.connect(this.master);
    this.bus.sfx.disconnect(); this.bus.sfx.connect(this.worldFilter);
    this.bus.amb.disconnect(); this.bus.amb.connect(this.worldFilter);

    // reverb send
    this.reverb = ctx.createConvolver();
    this.reverbSend = ctx.createGain(); this.reverbSend.gain.value = 0.25;
    this.reverbSend.connect(this.reverb); this.reverb.connect(this.worldFilter);
    this.setReverb(0.6, 3);

    // noise buffers
    const len = ctx.sampleRate * 3;
    const mk = () => ctx.createBuffer(1, len, ctx.sampleRate);
    this.white = mk(); this.brown = mk(); this.pink = mk();
    const w = this.white.getChannelData(0), br = this.brown.getChannelData(0), pk = this.pink.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const r = Math.random() * 2 - 1; w[i] = r;
      last = (last + 0.02 * r) / 1.02; br[i] = last * 3.5;
      b0 = 0.99886 * b0 + r * 0.0555179; b1 = 0.99332 * b1 + r * 0.0750759; b2 = 0.96900 * b2 + r * 0.1538520;
      b3 = 0.86650 * b3 + r * 0.3104856; b4 = 0.55000 * b4 + r * 0.5329522; b5 = -0.7616 * b5 - r * 0.0168980;
      pk[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + r * 0.5362) * 0.11; b6 = r * 0.115926;
    }
    this.ready = true;
  },

  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume(); },
  now() { return this.ctx ? this.ctx.currentTime : 0; },
  setVolume(v) { if (this.master) this.master.gain.setTargetAtTime(v, this.now(), 0.05); },

  setReverb(seconds, decay) {
    if (!this.ctx) return;
    const ctx = this.ctx, rate = ctx.sampleRate, n = Math.max(1, Math.floor(rate * seconds));
    const buf = ctx.createBuffer(2, n, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay);
    }
    this.reverb.buffer = buf;
  },
  setReverbMix(v) { if (this.reverbSend) this.reverbSend.gain.setTargetAtTime(v, this.now(), 0.3); },
  // muffle all world sounds (hiding in a locker, wearing headphones, etc.)
  muffle(freq = 20000, gain = 1, time = 0.3) {
    if (!this.ctx) return;
    this.worldFilter.frequency.setTargetAtTime(freq, this.now(), time / 3);
    this.worldGain.gain.setTargetAtTime(gain, this.now(), time / 3);
  },

  setListener(cam) {
    if (!this.ready) return;
    const l = this.ctx.listener, p = cam.getWorldPosition(this._v || (this._v = new THREE.Vector3()));
    const f = cam.getWorldDirection(this._f || (this._f = new THREE.Vector3()));
    const u = (this._u || (this._u = new THREE.Vector3())).set(0, 1, 0).applyQuaternion(cam.getWorldQuaternion(this._q || (this._q = new THREE.Quaternion())));
    if (l.positionX) {
      const t = this.now();
      l.positionX.setValueAtTime(p.x, t); l.positionY.setValueAtTime(p.y, t); l.positionZ.setValueAtTime(p.z, t);
      l.forwardX.setValueAtTime(f.x, t); l.forwardY.setValueAtTime(f.y, t); l.forwardZ.setValueAtTime(f.z, t);
      l.upX.setValueAtTime(u.x, t); l.upY.setValueAtTime(u.y, t); l.upZ.setValueAtTime(u.z, t);
    } else {
      l.setPosition(p.x, p.y, p.z); l.setOrientation(f.x, f.y, f.z, u.x, u.y, u.z);
    }
  },

  // ---- node helpers ----
  panner(pos, ref = 1.5, rolloff = 1.2, max = 60) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF'; p.distanceModel = 'inverse';
    p.refDistance = ref; p.rolloffFactor = rolloff; p.maxDistance = max;
    this.setPannerPos(p, pos);
    return p;
  },
  setPannerPos(p, pos) {
    if (p.positionX) { const t = this.now(); p.positionX.setValueAtTime(pos.x, t); p.positionY.setValueAtTime(pos.y, t); p.positionZ.setValueAtTime(pos.z, t); }
    else p.setPosition(pos.x, pos.y, pos.z);
  },
  // destination for a one-shot: optional 3D position, reverb send
  dest(o = {}) {
    const ctx = this.ctx;
    const g = ctx.createGain(); g.gain.value = (o.vol == null ? 1 : o.vol);
    let out = g;
    if (o.pos) {
      const p = this.panner(o.pos, o.ref || 1.5, o.rolloff || 1.2);
      g.connect(p);
      let last = p;
      if (o.muffle) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.muffle; p.connect(lp); last = lp; }
      last.connect(this.bus[o.bus || 'sfx']);
      if (o.verb !== false) last.connect(this.reverbSend);
    } else {
      g.connect(this.bus[o.bus || 'sfx']);
      if (o.verb) g.connect(this.reverbSend);
    }
    return out;
  },
  noiseSrc(type = 'white', loop = false) {
    const s = this.ctx.createBufferSource();
    s.buffer = this[type]; s.loop = loop;
    if (loop) s.loopStart = Math.random() * 2;
    return s;
  },
  filt(type, freq, q = 1) { const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; },
  gain(v = 1) { const g = this.ctx.createGain(); g.gain.value = v; return g; },
  osc(type, freq) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq; return o; },

  // percussive noise burst
  burst(out, t, dur, ftype, freq, q, peak, attack = 0.002, src = 'white') {
    const n = this.noiseSrc(src); const f = this.filt(ftype, freq, q); const g = this.gain(0);
    n.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.start(t, Math.random() * 2); n.stop(t + dur + 0.05);
    return f;
  },
  tone(out, t, dur, type, freq, peak, attack = 0.005, freqEnd = null) {
    const o = this.osc(type, freq); const g = this.gain(0);
    o.connect(g); g.connect(out);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  },

  // ---- public one-shots ----
  sfx(name, o = {}) {
    if (!this.ready) return;
    const fn = SFX[name];
    if (!fn) { console.warn('no sfx', name); return; }
    try { fn(this, this.dest(o), this.now() + (o.delay || 0), o); } catch (e) { console.warn(e); }
  },

  // ---- loops ----
  loop(name, o = {}) {
    if (!this.ready) return LOOP_DUMMY;
    const fn = LOOPS[name];
    if (!fn) { console.warn('no loop', name); return LOOP_DUMMY; }
    const ctx = this.ctx;
    const vol = this.gain(0);
    const target = o.vol == null ? 1 : o.vol;
    let panner = null, occ = null;
    if (o.pos) {
      panner = this.panner(o.pos, o.ref || 2, o.rolloff || 1.1, o.max || 60);
      occ = this.filt('lowpass', 20000, 0.5);
      vol.connect(occ); occ.connect(panner);
      panner.connect(this.bus[o.bus || 'amb']);
      if (o.verb !== false) panner.connect(this.reverbSend);
    } else {
      vol.connect(this.bus[o.bus || 'amb']);
    }
    const inner = fn(this, vol, o) || {};
    const h = {
      name, o, vol, panner, occ, inner, pos: o.pos ? o.pos.clone() : null, alive: true, occluded: false, base: target,
      volume(v, ramp = 0.3) { this.base = v; if (!this.alive) return; vol.gain.setTargetAtTime(this.occluded ? v * 0.45 : v, SND.now(), Math.max(0.01, ramp / 3)); return this; },
      set(k, v) { if (inner.set) inner.set(k, v); return this; },
      setPos(p) { if (panner) { this.pos.copy(p); SND.setPannerPos(panner, p); } return this; },
      stop(fade = 0.3) {
        if (!this.alive) return; this.alive = false; SND.loops.delete(this);
        const t = SND.now(); vol.gain.cancelScheduledValues(t); vol.gain.setTargetAtTime(0, t, Math.max(0.01, fade / 4));
        setTimeout(() => { try { if (inner.stop) inner.stop(); vol.disconnect(); if (panner) panner.disconnect(); } catch (e) { /* */ } }, fade * 1000 + 300);
      },
    };
    vol.gain.setTargetAtTime(target, this.now(), (o.fadeIn || 0.2) / 3);
    this.loops.add(h);
    return h;
  },
  stopAll(fade = 0.5) { for (const h of [...this.loops]) h.stop(fade); },
  stopLevelLoops(fade = 0.5) { for (const h of [...this.loops]) if (!h.o.persist) h.stop(fade); },

  // occlusion for positional loops (muffle sounds behind walls)
  update(dt) {
    if (!this.ready) return;
    this.occTimer -= dt;
    if (this.occTimer > 0) return;
    this.occTimer = 0.15;
    const cam = G.camera; if (!cam) return;
    const cp = cam.getWorldPosition(this._cp || (this._cp = new THREE.Vector3()));
    for (const h of this.loops) {
      if (!h.pos || !h.occ || h.o.occlude === false) continue;
      const blocked = Phys.ready && !Phys.lineOfSight(cp.x, cp.z, h.pos.x, h.pos.z, 1.2, true);
      if (blocked !== h.occluded) {
        h.occluded = blocked;
        h.occ.frequency.setTargetAtTime(blocked ? 700 : 20000, this.now(), 0.08);
        h.vol.gain.setTargetAtTime(blocked ? h.base * 0.45 : h.base, this.now(), 0.08);
      }
    }
  },
};
const LOOP_DUMMY = { volume() { return this; }, set() { return this; }, setPos() { return this; }, stop() {}, alive: false };

// ---------------------------------------------------------------------------
// One-shot sound definitions: fn(S, out, t, opts)
const SFX = {
  step(S, out, t, o) {
    const s = o.surface || 'tile', v = o.v || 1;
    switch (s) {
      case 'carpet': S.burst(out, t, 0.09, 'lowpass', 500, 0.7, 0.35 * v); S.burst(out, t, 0.06, 'bandpass', 1400, 1, 0.05 * v); break;
      case 'tile': S.burst(out, t, 0.05, 'bandpass', 2600, 1.2, 0.22 * v); S.burst(out, t, 0.07, 'lowpass', 300, 1, 0.4 * v); break;
      case 'wood': S.burst(out, t, 0.08, 'bandpass', 500, 1.5, 0.5 * v); S.burst(out, t, 0.04, 'bandpass', 2200, 1, 0.08 * v); break;
      case 'concrete': S.burst(out, t, 0.06, 'bandpass', 1800, 0.9, 0.18 * v); S.burst(out, t, 0.08, 'lowpass', 250, 1, 0.35 * v); break;
      case 'asphalt': S.burst(out, t, 0.07, 'bandpass', 1300, 0.8, 0.18 * v); S.burst(out, t + 0.02, 0.05, 'highpass', 4000, 0.5, 0.05 * v); break;
      case 'gravel':
        for (let i = 0; i < 6; i++) S.burst(out, t + i * 0.018 + Math.random() * 0.01, 0.04, 'bandpass', 2500 + Math.random() * 2500, 2, 0.15 * v);
        S.burst(out, t, 0.08, 'lowpass', 300, 1, 0.2 * v); break;
      case 'grass': S.burst(out, t, 0.14, 'bandpass', 2400, 0.6, 0.08 * v, 0.03); S.burst(out, t, 0.08, 'lowpass', 220, 1, 0.18 * v); break;
      case 'leaves':
        for (let i = 0; i < 5; i++) S.burst(out, t + i * 0.025 + Math.random() * 0.015, 0.05, 'bandpass', 3000 + Math.random() * 3000, 1.5, 0.1 * v);
        S.burst(out, t, 0.1, 'lowpass', 250, 1, 0.2 * v); break;
      case 'metal': S.burst(out, t, 0.05, 'bandpass', 3000, 2, 0.2 * v); S.tone(out, t, 0.25, 'sine', 420 + Math.random() * 60, 0.05 * v); S.burst(out, t, 0.08, 'lowpass', 200, 1, 0.3 * v); break;
      case 'mud': S.burst(out, t, 0.12, 'lowpass', 400, 2, 0.3 * v, 0.01); S.burst(out, t + 0.03, 0.08, 'bandpass', 900, 4, 0.08 * v); break;
      default: S.burst(out, t, 0.06, 'bandpass', 1500, 1, 0.2 * v);
    }
  },
  doorOpen(S, out, t, o) {
    S.burst(out, t, 0.06, 'bandpass', 1800, 2, 0.4); // latch click
    S.burst(out, t + 0.02, 0.1, 'lowpass', 300, 1, 0.3);
    if (o.creak !== false) {
      const c = S.osc('sawtooth', 90 + Math.random() * 40); const f = S.filt('bandpass', 900, 8); const g = S.gain(0);
      c.connect(f); f.connect(g); g.connect(out);
      c.frequency.setValueAtTime(c.frequency.value, t + 0.1);
      c.frequency.linearRampToValueAtTime(c.frequency.value * 1.6, t + 0.5);
      c.frequency.linearRampToValueAtTime(c.frequency.value * 1.1, t + 0.8);
      g.gain.setValueAtTime(0, t + 0.08); g.gain.linearRampToValueAtTime(0.05 * (o.creakAmt || 1), t + 0.2); g.gain.linearRampToValueAtTime(0.0001, t + 0.85);
      c.start(t + 0.08); c.stop(t + 0.9);
    }
  },
  doorClose(S, out, t, o) {
    S.burst(out, t, 0.18, 'lowpass', 180, 1, 0.9 * (o.v || 1));
    S.burst(out, t, 0.05, 'bandpass', 2200, 2, 0.35 * (o.v || 1));
    S.burst(out, t + 0.05, 0.04, 'bandpass', 3000, 3, 0.15);
  },
  doorSlam(S, out, t) {
    S.burst(out, t, 0.4, 'lowpass', 140, 1, 1.4); S.burst(out, t, 0.12, 'bandpass', 1200, 1, 0.6); S.burst(out, t + 0.06, 0.06, 'bandpass', 3500, 3, 0.2);
  },
  doorLocked(S, out, t) {
    for (let i = 0; i < 3; i++) { S.burst(out, t + i * 0.09, 0.05, 'bandpass', 1600 + i * 200, 3, 0.3); S.burst(out, t + i * 0.09, 0.07, 'lowpass', 250, 1, 0.25); }
  },
  doorStuck(S, out, t) {
    S.burst(out, t, 0.25, 'lowpass', 160, 1, 0.8); S.burst(out, t + 0.02, 0.1, 'bandpass', 900, 2, 0.3);
    S.burst(out, t + 0.12, 0.08, 'bandpass', 2000, 3, 0.15);
  },
  knock(S, out, t, o) {
    const n = o.n || 3;
    for (let i = 0; i < n; i++) { S.burst(out, t + i * (o.gap || 0.22), 0.09, 'lowpass', 350, 2, 0.9 * (o.v || 1)); S.burst(out, t + i * (o.gap || 0.22), 0.04, 'bandpass', 1200, 2, 0.2); }
  },
  bang(S, out, t, o) {
    S.burst(out, t, 0.5, 'lowpass', 120, 1, 1.6 * (o.v || 1)); S.burst(out, t, 0.2, 'bandpass', 700, 1, 0.7 * (o.v || 1));
    if (o.metal) { S.tone(out, t, 1.2, 'sine', 180, 0.15); S.tone(out, t, 0.9, 'sine', 410, 0.08); }
  },
  click(S, out, t, o) { S.burst(out, t, 0.025, 'bandpass', o.f || 3000, 2, 0.35 * (o.v || 1)); S.burst(out, t, 0.03, 'lowpass', 500, 1, 0.15 * (o.v || 1)); },
  switch(S, out, t) { S.burst(out, t, 0.03, 'bandpass', 2500, 3, 0.5); S.burst(out, t + 0.012, 0.04, 'lowpass', 400, 1, 0.3); },
  button(S, out, t) { S.burst(out, t, 0.02, 'bandpass', 4000, 3, 0.25); },
  beep(S, out, t, o) { S.tone(out, t, o.dur || 0.12, 'square', o.f || 1800, 0.06 * (o.v || 1), 0.002); },
  uiSelect(S, out, t) { S.tone(out, t, 0.05, 'square', 1200, 0.03, 0.002); },
  uiBack(S, out, t) { S.tone(out, t, 0.05, 'square', 700, 0.03, 0.002); },
  pickup(S, out, t) { S.burst(out, t, 0.08, 'bandpass', 1400, 1, 0.2); S.burst(out, t + 0.03, 0.05, 'bandpass', 3000, 1, 0.08); },
  putdown(S, out, t) { S.burst(out, t, 0.06, 'lowpass', 600, 1, 0.4); S.burst(out, t, 0.03, 'bandpass', 2500, 2, 0.15); },
  paper(S, out, t) { for (let i = 0; i < 4; i++) S.burst(out, t + i * 0.04 + Math.random() * 0.02, 0.07, 'highpass', 3000 + Math.random() * 2000, 0.5, 0.08); },
  mugClink(S, out, t) { S.tone(out, t, 0.4, 'sine', 2600, 0.08); S.tone(out, t, 0.3, 'sine', 3900, 0.04); S.burst(out, t, 0.02, 'highpass', 5000, 1, 0.1); },
  pour(S, out, t, o) {
    const d = o.dur || 2; const n = S.noiseSrc('pink'); const f = S.filt('bandpass', 1100, 2); const g = S.gain(0);
    n.connect(f); f.connect(g); g.connect(out);
    f.frequency.setValueAtTime(700, t); f.frequency.linearRampToValueAtTime(1600, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.15); g.gain.setValueAtTime(0.35, t + d - 0.2); g.gain.linearRampToValueAtTime(0, t + d);
    n.start(t); n.stop(t + d + 0.1);
  },
  water(S, out, t, o) {
    const d = o.dur || 2; const n = S.noiseSrc('white'); const f = S.filt('bandpass', 2200, 0.7); const g = S.gain(0);
    n.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.1); g.gain.setValueAtTime(0.18, t + d - 0.2); g.gain.linearRampToValueAtTime(0, t + d);
    n.start(t); n.stop(t + d + 0.1);
  },
  flush(S, out, t) {
    S.burst(out, t, 0.08, 'bandpass', 900, 2, 0.4);
    const n = S.noiseSrc('pink'); const f = S.filt('lowpass', 1800, 1); const g = S.gain(0);
    n.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t + 0.1); g.gain.linearRampToValueAtTime(0.6, t + 0.6); g.gain.linearRampToValueAtTime(0.25, t + 3); g.gain.linearRampToValueAtTime(0, t + 6);
    f.frequency.setValueAtTime(2200, t); f.frequency.linearRampToValueAtTime(700, t + 6);
    n.start(t); n.stop(t + 6.2);
  },
  zip(S, out, t) { // generator pull cord
    const n = S.noiseSrc('white'); const f = S.filt('bandpass', 600, 2); const g = S.gain(0);
    n.connect(f); f.connect(g); g.connect(out);
    f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.35);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5, t + 0.05); g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    n.start(t); n.stop(t + 0.45);
    for (let i = 0; i < 5; i++) S.burst(out, t + 0.05 + i * 0.06, 0.05, 'lowpass', 200, 2, 0.4);
  },
  sputter(S, out, t, o) {
    const n = o.n || 6;
    for (let i = 0; i < n; i++) { const tt = t + i * (0.07 + Math.random() * 0.05); S.burst(out, tt, 0.07, 'lowpass', 180, 2, 0.7 * (1 - i / n)); S.burst(out, tt, 0.04, 'bandpass', 900, 1, 0.12); }
  },
  prime(S, out, t) { S.burst(out, t, 0.12, 'lowpass', 400, 4, 0.3); S.burst(out, t + 0.05, 0.06, 'bandpass', 1500, 6, 0.06); },
  keys(S, out, t) { for (let i = 0; i < 7; i++) S.tone(out, t + Math.random() * 0.15, 0.12, 'sine', 3500 + Math.random() * 3000, 0.02); },
  carDoorOpen(S, out, t) { S.burst(out, t, 0.06, 'bandpass', 1500, 2, 0.3); S.burst(out, t + 0.03, 0.15, 'lowpass', 220, 1, 0.4); },
  carDoorClose(S, out, t) { S.burst(out, t, 0.3, 'lowpass', 120, 1, 1.2); S.burst(out, t, 0.06, 'bandpass', 1600, 2, 0.3); },
  ignition(S, out, t, o) {
    const dur = o.dur || 1.1;
    const c = S.osc('sawtooth', 11); const f = S.filt('lowpass', 500, 2); const g = S.gain(0);
    c.connect(f); f.connect(g); g.connect(out);
    const n = S.noiseSrc('brown'); const ng = S.gain(0); n.connect(ng); ng.connect(f);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.05); g.gain.setValueAtTime(0.35, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.1);
    ng.gain.setValueAtTime(0.4, t); ng.gain.linearRampToValueAtTime(0, t + dur + 0.1);
    c.start(t); c.stop(t + dur + 0.2); n.start(t); n.stop(t + dur + 0.2);
    // starter whine
    S.tone(out, t, dur, 'square', 140, 0.03, 0.02);
  },
  horn(S, out, t, o) {
    const d = o.dur || 0.6;
    for (const fq of [392, 494]) {
      const c = S.osc('sawtooth', fq); const f = S.filt('lowpass', 1800, 1); const g = S.gain(0);
      c.connect(f); f.connect(g); g.connect(out);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.02); g.gain.setValueAtTime(0.12, t + d); g.gain.linearRampToValueAtTime(0, t + d + 0.05);
      c.start(t); c.stop(t + d + 0.1);
    }
  },
  thud(S, out, t, o) { S.burst(out, t, 0.25, 'lowpass', 100, 1, 1.2 * (o.v || 1)); S.burst(out, t, 0.08, 'bandpass', 500, 1, 0.3 * (o.v || 1)); },
  glass(S, out, t) {
    S.burst(out, t, 0.6, 'highpass', 3000, 0.5, 0.6);
    for (let i = 0; i < 14; i++) S.tone(out, t + Math.random() * 0.4, 0.2 + Math.random() * 0.3, 'sine', 2500 + Math.random() * 5000, 0.04);
    S.burst(out, t, 0.2, 'lowpass', 400, 1, 0.5);
  },
  smsTone(S, out, t) { // generic two-note message alert
    S.tone(out, t, 0.13, 'square', 1568, 0.05, 0.003); S.tone(out, t + 0.16, 0.2, 'square', 2093, 0.05, 0.003);
  },
  vibrate(S, out, t, o) {
    const n = o.n || 2;
    for (let i = 0; i < n; i++) {
      const c = S.osc('sawtooth', 150); const f = S.filt('lowpass', 300, 1); const g = S.gain(0);
      c.connect(f); f.connect(g); g.connect(out);
      const tt = t + i * 0.55; g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(0.3, tt + 0.02); g.gain.setValueAtTime(0.3, tt + 0.35); g.gain.linearRampToValueAtTime(0, tt + 0.38);
      c.start(tt); c.stop(tt + 0.4);
    }
  },
  hangup(S, out, t) { S.burst(out, t, 0.08, 'lowpass', 400, 2, 0.6); S.burst(out, t, 0.03, 'bandpass', 2000, 3, 0.25); },
  pickupPhone(S, out, t) { S.burst(out, t, 0.06, 'lowpass', 500, 2, 0.4); S.burst(out, t + 0.02, 0.03, 'bandpass', 2500, 3, 0.2); },
  lineClick(S, out, t) { S.burst(out, t, 0.02, 'bandpass', 1500, 2, 0.4); },
  dtmf(S, out, t, o) {
    const map = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], 0: [941, 1336], '*': [941, 1209], '#': [941, 1477] };
    const digits = String(o.digits || '1'); let tt = t;
    for (const d of digits) { const fr = map[d]; if (fr) { S.tone(out, tt, 0.12, 'sine', fr[0], 0.06, 0.002); S.tone(out, tt, 0.12, 'sine', fr[1], 0.06, 0.002); } tt += 0.16; }
  },
  modem(S, out, t) { // dial-up remote control handshake
    S.tone(out, t, 0.6, 'sine', 2100, 0.05); S.burst(out, t + 0.6, 1.0, 'bandpass', 1800, 0.5, 0.06, 0.05);
    for (let i = 0; i < 12; i++) S.tone(out, t + 0.7 + i * 0.08, 0.07, 'square', 1200 + (i % 3) * 600, 0.02);
  },
  vend(S, out, t) { // motor + can drop
    const c = S.osc('sawtooth', 60); const f = S.filt('lowpass', 300, 1); const g = S.gain(0); c.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.15, t + 0.05); g.gain.setValueAtTime(0.15, t + 0.9); g.gain.linearRampToValueAtTime(0, t + 1);
    c.start(t); c.stop(t + 1.05);
    S.burst(out, t + 1.1, 0.3, 'lowpass', 250, 1, 1.0); S.tone(out, t + 1.1, 0.4, 'sine', 900, 0.05);
  },
  coinReturn(S, out, t) { for (let i = 0; i < 3; i++) S.tone(out, t + i * 0.07, 0.15, 'sine', 4000 + i * 300, 0.03); },
  billFeed(S, out, t) {
    const c = S.osc('square', 220); const f = S.filt('bandpass', 800, 2); const g = S.gain(0); c.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.03); g.gain.setValueAtTime(0.06, t + 0.7); g.gain.linearRampToValueAtTime(0, t + 0.75);
    c.start(t); c.stop(t + 0.8);
  },
  microDing(S, out, t) { S.tone(out, t, 1.4, 'sine', 2350, 0.12); S.tone(out, t, 1.0, 'sine', 4700, 0.03); },
  register(S, out, t) { S.burst(out, t, 0.05, 'bandpass', 3000, 3, 0.2); S.tone(out, t + 0.08, 0.5, 'sine', 3100, 0.06); S.burst(out, t + 0.3, 0.2, 'lowpass', 400, 1, 0.5); },
  bell(S, out, t) { for (let i = 0; i < 3; i++) { S.tone(out, t + i * 0.09, 0.8, 'sine', 2800 + i * 150, 0.06); S.tone(out, t + i * 0.09, 0.6, 'sine', 4100, 0.02); } },
  buzzer(S, out, t, o) {
    const c = S.osc('sawtooth', 120); const f = S.filt('bandpass', 600, 1); const g = S.gain(0); c.connect(f); f.connect(g); g.connect(out);
    const d = o.dur || 0.8;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.15, t + 0.01); g.gain.setValueAtTime(0.15, t + d); g.gain.linearRampToValueAtTime(0, t + d + 0.02);
    c.start(t); c.stop(t + d + 0.05);
  },
  tapeIn(S, out, t) { S.burst(out, t, 0.05, 'bandpass', 2500, 2, 0.4); S.burst(out, t + 0.12, 0.08, 'lowpass', 600, 1, 0.5); S.burst(out, t + 0.14, 0.03, 'bandpass', 3500, 3, 0.2); },
  tapePlay(S, out, t) { S.burst(out, t, 0.05, 'bandpass', 1800, 2, 0.5); S.burst(out, t + 0.03, 0.12, 'lowpass', 300, 1, 0.4); },
  cdTray(S, out, t) {
    const c = S.osc('sawtooth', 90); const f = S.filt('bandpass', 700, 3); const g = S.gain(0); c.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.05); g.gain.setValueAtTime(0.05, t + 0.5); g.gain.linearRampToValueAtTime(0, t + 0.55);
    c.start(t); c.stop(t + 0.6); S.burst(out, t + 0.55, 0.05, 'lowpass', 500, 1, 0.3);
  },
  needle(S, out, t) { S.burst(out, t, 0.08, 'lowpass', 200, 2, 0.4); for (let i = 0; i < 6; i++) S.burst(out, t + 0.1 + Math.random() * 0.4, 0.01, 'highpass', 3000, 1, 0.1); },
  zipper(S, out, t) { for (let i = 0; i < 16; i++) S.burst(out, t + i * 0.022, 0.015, 'bandpass', 3500, 4, 0.12); },
  fluoroStart(S, out, t) {
    for (let i = 0; i < 3; i++) { S.burst(out, t + i * 0.18, 0.05, 'bandpass', 3000, 2, 0.15); S.tone(out, t + i * 0.18, 0.12, 'sawtooth', 120, 0.05); }
  },
  breakerOff(S, out, t) { S.burst(out, t, 0.04, 'bandpass', 2200, 3, 0.7); S.burst(out, t, 0.12, 'lowpass', 220, 1, 0.8); },
  powerDown(S, out, t) { S.tone(out, t, 1.6, 'sawtooth', 240, 0.08, 0.01, 30); S.burst(out, t, 0.2, 'lowpass', 150, 1, 0.8); },
  powerUp(S, out, t) { S.tone(out, t, 1.2, 'sawtooth', 40, 0.06, 0.2, 180); S.burst(out, t, 0.1, 'bandpass', 2000, 2, 0.3); },
  relay(S, out, t) { S.burst(out, t, 0.03, 'bandpass', 1800, 4, 0.6); S.burst(out, t + 0.01, 0.06, 'lowpass', 300, 2, 0.5); },
  contactor(S, out, t) { S.burst(out, t, 0.1, 'lowpass', 160, 1, 1.2); S.burst(out, t, 0.04, 'bandpass', 1400, 3, 0.6); S.tone(out, t + 0.05, 1.2, 'sawtooth', 60, 0.08, 0.05); },
  fax(S, out, t) {
    S.tone(out, t, 0.5, 'sine', 1100, 0.04); S.tone(out, t + 0.7, 0.6, 'sine', 2100, 0.04);
    S.burst(out, t + 1.4, 1.5, 'bandpass', 1700, 0.7, 0.05, 0.1);
    for (let i = 0; i < 20; i++) S.tone(out, t + 3 + i * 0.25, 0.2, 'square', 300 + (i % 2) * 80, 0.012);
  },
  heartbeat(S, out, t, o) { const v = o.v || 1; S.tone(out, t, 0.18, 'sine', 55, 0.5 * v, 0.01, 40); S.tone(out, t + 0.28, 0.2, 'sine', 48, 0.38 * v, 0.01, 36); },
  gasp(S, out, t) {
    const n = S.noiseSrc('pink'); const f = S.filt('bandpass', 1200, 1.5); const g = S.gain(0); n.connect(f); f.connect(g); g.connect(out);
    f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1800, t + 0.35);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.08); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    n.start(t); n.stop(t + 0.55);
  },
  exhale(S, out, t, o) {
    const d = o.dur || 1.2; const n = S.noiseSrc('pink'); const f = S.filt('bandpass', 700, 1.2); const g = S.gain(0); n.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.15 * (o.v || 1), t + 0.15); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    n.start(t); n.stop(t + d + 0.05);
  },
  // tension stinger: a slow low swell, never a loud scare
  swell(S, out, t, o) {
    const d = o.dur || 4, v = o.v || 1;
    for (const [fq, ty] of [[41.2, 'sawtooth'], [61.7, 'sawtooth'], [82.4, 'triangle'], [87.3, 'sine']]) {
      const c = S.osc(ty, fq); c.detune.value = (Math.random() - 0.5) * 20; const f = S.filt('lowpass', 120, 1); const g = S.gain(0);
      c.connect(f); f.connect(g); g.connect(out);
      f.frequency.setValueAtTime(100, t); f.frequency.exponentialRampToValueAtTime(900, t + d * 0.8);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09 * v, t + d * 0.85); g.gain.linearRampToValueAtTime(0, t + d);
      c.start(t); c.stop(t + d + 0.05);
    }
  },
  sting(S, out, t, o) { // sharper, reserved for a handful of moments
    const v = o.v || 1;
    S.burst(out, t, 1.6, 'bandpass', 2500, 0.7, 0.4 * v, 0.005);
    for (const fq of [146.8, 155.6, 207.7, 311]) { const c = S.osc('sawtooth', fq); const f = S.filt('lowpass', 2500, 1); const g = S.gain(0); c.connect(f); f.connect(g); g.connect(out);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06 * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 2.2); c.start(t); c.stop(t + 2.3); }
    S.burst(out, t, 0.5, 'lowpass', 90, 1, 1.2 * v);
  },
  staticBurst(S, out, t, o) { S.burst(out, t, o.dur || 0.4, 'bandpass', 2200, 0.4, 0.25 * (o.v || 1), 0.005); },
  rustle(S, out, t, o) { const v = o.v || 1; for (let i = 0; i < 8; i++) S.burst(out, t + Math.random() * 0.5, 0.12, 'bandpass', 2500 + Math.random() * 3000, 0.8, 0.07 * v, 0.02); },
  twig(S, out, t, o) { S.burst(out, t, 0.03, 'bandpass', 2800, 3, 0.7 * (o.v || 1)); S.burst(out, t + 0.02, 0.06, 'bandpass', 1500, 2, 0.3 * (o.v || 1)); },
  owl(S, out, t) {
    const hoot = (tt, d) => { const c = S.osc('sine', 380); const g = S.gain(0); c.connect(g); g.connect(out);
      c.frequency.setValueAtTime(400, tt); c.frequency.linearRampToValueAtTime(350, tt + d);
      g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(0.1, tt + 0.05); g.gain.linearRampToValueAtTime(0, tt + d); c.start(tt); c.stop(tt + d + 0.05); };
    hoot(t, 0.35); hoot(t + 0.6, 0.2); hoot(t + 0.85, 0.2); hoot(t + 1.15, 0.5);
  },
  dog(S, out, t) {
    for (let i = 0; i < 2; i++) { const tt = t + i * 0.45; const c = S.osc('sawtooth', 380); const f = S.filt('bandpass', 900, 2); const g = S.gain(0);
      c.connect(f); f.connect(g); g.connect(out); c.frequency.setValueAtTime(420, tt); c.frequency.exponentialRampToValueAtTime(250, tt + 0.15);
      g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(0.12, tt + 0.01); g.gain.exponentialRampToValueAtTime(0.001, tt + 0.18); c.start(tt); c.stop(tt + 0.2); }
  },
  carPass(S, out, t, o) { // distant car passing on the highway
    const d = o.dur || 7; const n = S.noiseSrc('brown'); const f = S.filt('lowpass', 400, 1); const g = S.gain(0); n.connect(f); f.connect(g);
    const p = S.ctx.createStereoPanner(); g.connect(p); p.connect(out);
    p.pan.setValueAtTime(o.dir || -1, t); p.pan.linearRampToValueAtTime(-(o.dir || -1), t + d);
    f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(900, t + d * 0.5); f.frequency.linearRampToValueAtTime(250, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5 * (o.v || 1), t + d * 0.5); g.gain.linearRampToValueAtTime(0, t + d);
    n.start(t); n.stop(t + d + 0.1);
  },
  engineStartup(S, out, t) { SFX.ignition(S, out, t, { dur: 0.9 }); S.burst(out, t + 0.9, 0.4, 'lowpass', 200, 1, 0.9); },
  hit(S, out, t) { S.burst(out, t, 0.3, 'lowpass', 160, 1, 1.4); S.burst(out, t, 0.1, 'bandpass', 900, 1, 0.5); },
  glassPot(S, out, t) { SFX.glass(S, out, t); S.burst(out, t + 0.05, 0.5, 'bandpass', 900, 1, 0.3); },
  scream(S, out, t, o) { // human cry of pain (short, formant-filtered)
    const d = o.dur || 0.7;
    const c = S.osc('sawtooth', 300); const f1 = S.filt('bandpass', 800, 5); const f2 = S.filt('bandpass', 1300, 6); const g = S.gain(0);
    c.connect(f1); c.connect(f2); f1.connect(g); f2.connect(g); g.connect(out);
    c.frequency.setValueAtTime(260, t); c.frequency.linearRampToValueAtTime(380, t + 0.15); c.frequency.linearRampToValueAtTime(200, t + d);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.3, t + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    c.start(t); c.stop(t + d + 0.05);
  },
};

// ---------------------------------------------------------------------------
// Looping sound definitions: fn(S, out, opts) -> { set(k,v), stop() }
function lfo(S, freq, depth, target, type = 'sine') {
  const o = S.osc(type, freq); const g = S.gain(depth); o.connect(g); g.connect(target); o.start(); return o;
}
const LOOPS = {
  roomTone(S, out) {
    const n = S.noiseSrc('brown', true); const f = S.filt('lowpass', 180, 0.7); const g = S.gain(0.28);
    n.connect(f); f.connect(g); g.connect(out); n.start();
    return { stop() { n.stop(); } };
  },
  hvac(S, out) {
    const n = S.noiseSrc('pink', true); const f = S.filt('bandpass', 400, 0.6); const g = S.gain(0.12);
    n.connect(f); f.connect(g); g.connect(out); n.start();
    const o = S.osc('sine', 58); const og = S.gain(0.02); o.connect(og); og.connect(out); o.start();
    return { stop() { n.stop(); o.stop(); } };
  },
  fluoro(S, out) {
    const nodes = [];
    for (const [fq, a] of [[120, 0.05], [240, 0.025], [360, 0.012]]) { const o = S.osc('sine', fq); const g = S.gain(a); o.connect(g); g.connect(out); o.start(); nodes.push(o); }
    const b = S.osc('sawtooth', 120); const bf = S.filt('bandpass', 3200, 6); const bg = S.gain(0.006); b.connect(bf); bf.connect(bg); bg.connect(out); b.start(); nodes.push(b);
    return { stop() { nodes.forEach(n => n.stop()); } };
  },
  wind(S, out, o) {
    const n = S.noiseSrc('pink', true); const f = S.filt('bandpass', 500, 0.8); const g = S.gain(0.35);
    n.connect(f); f.connect(g); g.connect(out); n.start();
    const l1 = lfo(S, 0.07, 250, f.frequency); const l2 = lfo(S, 0.11, 0.18, g.gain);
    const n2 = S.noiseSrc('brown', true); const g2 = S.gain(0.25 * (o.low || 1)); n2.connect(g2); g2.connect(out); n2.start();
    return { set(k, v) { if (k === 'strength') g.gain.setTargetAtTime(0.35 * v, S.now(), 0.5); }, stop() { n.stop(); n2.stop(); l1.stop(); l2.stop(); } };
  },
  creek(S, out) {
    const n = S.noiseSrc('white', true); const f = S.filt('bandpass', 1800, 0.5); const g = S.gain(0.12);
    n.connect(f); f.connect(g); g.connect(out); n.start(); const l = lfo(S, 0.6, 0.04, g.gain);
    const n2 = S.noiseSrc('pink', true); const f2 = S.filt('lowpass', 600, 1); const g2 = S.gain(0.15); n2.connect(f2); f2.connect(g2); g2.connect(out); n2.start();
    return { stop() { n.stop(); n2.stop(); l.stop(); } };
  },
  phoneRing(S, out, o) { // multi-line business phone trill: 1s on / 2.5s off
    const a = S.osc('square', o.f1 || 1020); const b = S.osc('square', o.f2 || 1280);
    const ga = S.gain(0), gb = S.gain(0); const gate = S.gain(0); const f = S.filt('lowpass', 3500, 0.7);
    a.connect(ga); b.connect(gb); ga.connect(f); gb.connect(f); f.connect(gate); gate.connect(out);
    // alternate the two tones at 16Hz
    const tr = S.osc('square', 16); const trg = S.gain(0.5); tr.connect(trg); trg.connect(ga.gain); const inv = S.gain(-0.5); tr.connect(inv); inv.connect(gb.gain);
    ga.gain.value = 0.5; gb.gain.value = 0.5;
    a.start(); b.start(); tr.start();
    const period = o.period || 3.5, on = o.on || 1.1, amp = 0.09 * (o.amp || 1);
    let next = S.now() + 0.05;
    const sched = () => { const now = S.now(); while (next < now + 0.5) { gate.gain.setValueAtTime(amp, next); gate.gain.setValueAtTime(0, next + on); next += period; } };
    sched(); const iv = setInterval(sched, 200);
    return { stop() { clearInterval(iv); a.stop(); b.stop(); tr.stop(); } };
  },
  oldRing(S, out) { // classic bell ring (payphone / wall phone): 2s on, 4s off
    const nodes = []; const gate = S.gain(0); gate.connect(out);
    for (const fq of [440, 480]) { const o = S.osc('sine', fq); const g = S.gain(0.25); o.connect(g); g.connect(gate); o.start(); nodes.push(o); }
    const bell = S.osc('triangle', 1900); const bg = S.gain(0.06); bell.connect(bg); bg.connect(gate); bell.start(); nodes.push(bell);
    const am = S.osc('square', 20); const amg = S.gain(0.05); am.connect(amg); amg.connect(bg.gain); am.start(); nodes.push(am);
    let next = S.now() + 0.05;
    const sched = () => { const now = S.now(); while (next < now + 0.6) { gate.gain.setValueAtTime(0.35, next); gate.gain.setValueAtTime(0, next + 2); next += 6; } };
    sched(); const iv = setInterval(sched, 250);
    return { stop() { clearInterval(iv); nodes.forEach(n => n.stop()); } };
  },
  cellRing(S, out) { // an original polyphonic ringtone
    const notes = [76, 79, 83, 81, 79, 76, 74, 76, 0, 0, 79, 81, 83, 86, 83, 0];
    const gate = S.gain(1); gate.connect(out);
    let next = S.now() + 0.05, i = 0;
    const sched = () => { const now = S.now(); while (next < now + 0.4) { const m = notes[i % notes.length]; if (m) { const fq = 440 * Math.pow(2, (m - 69) / 12); S.tone(gate, next, 0.14, 'square', fq, 0.05, 0.003); S.tone(gate, next, 0.14, 'sine', fq / 2, 0.04, 0.003); } next += 0.13; i++; if (i % notes.length === 0) next += 0.9; } };
    sched(); const iv = setInterval(sched, 120);
    return { stop() { clearInterval(iv); } };
  },
  dialTone(S, out) { const n = []; for (const f of [350, 440]) { const o = S.osc('sine', f); const g = S.gain(0.06); o.connect(g); g.connect(out); o.start(); n.push(o); } return { stop() { n.forEach(x => x.stop()); } }; },
  ringback(S, out) { // what you hear when calling someone: 2s on 4s off
    const gate = S.gain(0); gate.connect(out); const n = [];
    for (const f of [440, 480]) { const o = S.osc('sine', f); const g = S.gain(0.05); o.connect(g); g.connect(gate); o.start(); n.push(o); }
    let next = S.now() + 0.3;
    const sched = () => { const now = S.now(); while (next < now + 0.6) { gate.gain.setValueAtTime(1, next); gate.gain.setValueAtTime(0, next + 2); next += 6; } };
    sched(); const iv = setInterval(sched, 250);
    return { stop() { clearInterval(iv); n.forEach(x => x.stop()); } };
  },
  busy(S, out) {
    const gate = S.gain(0); gate.connect(out); const n = [];
    for (const f of [480, 620]) { const o = S.osc('sine', f); const g = S.gain(0.05); o.connect(g); g.connect(gate); o.start(); n.push(o); }
    let next = S.now();
    const sched = () => { const now = S.now(); while (next < now + 0.6) { gate.gain.setValueAtTime(1, next); gate.gain.setValueAtTime(0, next + 0.5); next += 1; } };
    sched(); const iv = setInterval(sched, 250);
    return { stop() { clearInterval(iv); n.forEach(x => x.stop()); } };
  },
  lineHiss(S, out) { // phone line noise while on a call
    const n = S.noiseSrc('white', true); const f = S.filt('bandpass', 1800, 0.6); const g = S.gain(0.012);
    n.connect(f); f.connect(g); g.connect(out); n.start();
    const h = S.osc('sine', 60); const hg = S.gain(0.006); h.connect(hg); hg.connect(out); h.start();
    return { stop() { n.stop(); h.stop(); } };
  },
  murmur(S, out) { // muffled speech on the other end of a phone line
    const n = S.noiseSrc('pink', true); const f1 = S.filt('bandpass', 600, 4); const f2 = S.filt('bandpass', 1400, 5); const g = S.gain(0);
    n.connect(f1); n.connect(f2); f1.connect(g); f2.connect(g); g.connect(out); n.start();
    let active = false, next = S.now();
    const sched = () => {
      const now = S.now(); if (next < now) next = now;
      while (next < now + 0.4) {
        const d = 0.08 + Math.random() * 0.16;
        if (active && Math.random() > 0.12) { g.gain.setTargetAtTime(0.25 + Math.random() * 0.3, next, 0.02); f1.frequency.setTargetAtTime(400 + Math.random() * 500, next, 0.03); f2.frequency.setTargetAtTime(1100 + Math.random() * 900, next, 0.03); }
        else g.gain.setTargetAtTime(0, next, 0.03);
        next += d;
      }
    };
    const iv = setInterval(sched, 100);
    return { set(k, v) { if (k === 'talk') active = v; }, stop() { clearInterval(iv); n.stop(); } };
  },
  generator(S, out, o) {
    const c = S.osc('sawtooth', o.f || 29); const f = S.filt('lowpass', 260, 2); const g = S.gain(0.5);
    c.connect(f); f.connect(g); g.connect(out);
    const am = S.osc('square', o.fire || 14.5); const amg = S.gain(0.25); am.connect(amg); amg.connect(g.gain);
    const n = S.noiseSrc('brown', true); const nf = S.filt('bandpass', 700, 0.8); const ng = S.gain(0.25); n.connect(nf); nf.connect(ng); ng.connect(out);
    const c2 = S.osc('square', (o.f || 29) * 2); const c2g = S.gain(0.04); c2.connect(c2g); c2g.connect(f); c.start(); c2.start(); am.start(); n.start();
    return { stop() { c.stop(); c2.stop(); am.stop(); n.stop(); } };
  },
  engine(S, out) {
    const c = S.osc('sawtooth', 30); const c2 = S.osc('square', 15); const f = S.filt('lowpass', 300, 3); const g = S.gain(0.35); const g2 = S.gain(0.15);
    c.connect(f); c2.connect(g2); g2.connect(f); f.connect(g); g.connect(out);
    const n = S.noiseSrc('brown', true); const nf = S.filt('lowpass', 500, 1); const ng = S.gain(0.15); n.connect(nf); nf.connect(ng); ng.connect(out);
    const road = S.noiseSrc('pink', true); const rf = S.filt('lowpass', 300, 0.7); const rg = S.gain(0); road.connect(rf); rf.connect(rg); rg.connect(out);
    c.start(); c2.start(); n.start(); road.start();
    return {
      set(k, v) {
        const t = S.now();
        if (k === 'rpm') { const fq = v / 30; c.frequency.setTargetAtTime(fq, t, 0.08); c2.frequency.setTargetAtTime(fq / 2, t, 0.08); f.frequency.setTargetAtTime(160 + v * 0.18, t, 0.1); }
        if (k === 'load') g.gain.setTargetAtTime(0.25 + v * 0.25, t, 0.1);
        if (k === 'speed') { rg.gain.setTargetAtTime(Math.min(0.6, v / 30), t, 0.2); rf.frequency.setTargetAtTime(200 + v * 25, t, 0.2); }
        if (k === 'gravel') nf.frequency.setTargetAtTime(v ? 2000 : 500, t, 0.2);
      },
      stop() { c.stop(); c2.stop(); n.stop(); road.stop(); },
    };
  },
  coffeeBrew(S, out) {
    const n = S.noiseSrc('pink', true); const f = S.filt('bandpass', 700, 3); const g = S.gain(0);
    n.connect(f); f.connect(g); g.connect(out); n.start();
    let next = S.now();
    const sched = () => { const now = S.now(); if (next < now) next = now; while (next < now + 0.5) { const d = 0.05 + Math.random() * 0.25; g.gain.setTargetAtTime(Math.random() < 0.5 ? 0.25 + Math.random() * 0.4 : 0.03, next, 0.02); f.frequency.setTargetAtTime(400 + Math.random() * 900, next, 0.02); next += d; } };
    const iv = setInterval(sched, 120);
    const h = S.osc('sine', 120); const hg = S.gain(0.02); h.connect(hg); hg.connect(out); h.start();
    return { stop() { clearInterval(iv); n.stop(); h.stop(); } };
  },
  microwave(S, out) {
    const o = S.osc('sawtooth', 60); const f = S.filt('lowpass', 400, 1); const g = S.gain(0.15); o.connect(f); f.connect(g); g.connect(out); o.start();
    const n = S.noiseSrc('pink', true); const ng = S.gain(0.05); n.connect(ng); ng.connect(out); n.start();
    return { stop() { o.stop(); n.stop(); } };
  },
  vendHum(S, out) {
    const o = S.osc('sine', 60); const g = S.gain(0.04); o.connect(g); g.connect(out); o.start();
    const o2 = S.osc('sawtooth', 180); const f = S.filt('lowpass', 400, 1); const g2 = S.gain(0.015); o2.connect(f); f.connect(g2); g2.connect(out); o2.start();
    return { stop() { o.stop(); o2.stop(); } };
  },
  fridge(S, out) {
    const o = S.osc('sawtooth', 50); const f = S.filt('lowpass', 200, 1); const g = S.gain(0.06); o.connect(f); f.connect(g); g.connect(out); o.start();
    return { stop() { o.stop(); } };
  },
  rackFans(S, out) {
    const n = S.noiseSrc('pink', true); const f = S.filt('bandpass', 900, 0.5); const g = S.gain(0.18); n.connect(f); f.connect(g); g.connect(out); n.start();
    const o = S.osc('sine', 240); const og = S.gain(0.01); o.connect(og); og.connect(out); o.start();
    return { stop() { n.stop(); o.stop(); } };
  },
  transmitterHum(S, out) {
    const n = []; for (const [fq, a] of [[60, 0.08], [180, 0.04], [360, 0.015]]) { const o = S.osc('sine', fq); const g = S.gain(a); o.connect(g); g.connect(out); o.start(); n.push(o); }
    const b = S.noiseSrc('pink', true); const f = S.filt('lowpass', 1200, 0.6); const g = S.gain(0.22); b.connect(f); f.connect(g); g.connect(out); b.start();
    return { stop() { n.forEach(x => x.stop()); b.stop(); } };
  },
  upsBeep(S, out) {
    let next = S.now(); const sched = () => { const now = S.now(); while (next < now + 0.5) { S.tone(out, next, 0.25, 'square', 2900, 0.05, 0.002); next += 2; } };
    sched(); const iv = setInterval(sched, 250);
    return { stop() { clearInterval(iv); } };
  },
  silenceAlarm(S, out) {
    let next = S.now(); const sched = () => { const now = S.now(); while (next < now + 0.5) { S.tone(out, next, 0.18, 'square', 2200, 0.06, 0.002); S.tone(out, next + 0.25, 0.18, 'square', 2200, 0.06, 0.002); next += 1.5; } };
    sched(); const iv = setInterval(sched, 250);
    return { stop() { clearInterval(iv); } };
  },
  heartbeat(S, out, o) {
    let bpm = o.bpm || 70, next = S.now(), v = 1;
    const sched = () => { const now = S.now(); while (next < now + 0.5) { SFX.heartbeat(S, out, next, { v }); next += 60 / bpm; } };
    sched(); const iv = setInterval(sched, 150);
    return { set(k, val) { if (k === 'bpm') bpm = val; if (k === 'v') v = val; }, stop() { clearInterval(iv); } };
  },
  breath(S, out, o) {
    let rate = o.rate || 0.3, next = S.now(), v = 1;
    const sched = () => { const now = S.now(); while (next < now + 0.6) { const per = 1 / rate; SFX.exhale(S, out, next, { dur: per * 0.4, v: 0.6 * v }); SFX.exhale(S, out, next + per * 0.5, { dur: per * 0.45, v: v }); next += per; } };
    sched(); const iv = setInterval(sched, 200);
    return { set(k, val) { if (k === 'rate') rate = val; if (k === 'v') v = val; }, stop() { clearInterval(iv); } };
  },
  drone(S, out, o) { // low unease bed
    const nodes = []; const f = S.filt('lowpass', o.cut || 220, 1); const g = S.gain(1); f.connect(g); g.connect(out);
    for (const [fq, a] of [[36.7, 0.18], [55, 0.12], [73.4, 0.06], [77.8, 0.05]]) { const c = S.osc('sawtooth', fq * (o.pitch || 1)); c.detune.value = (Math.random() - 0.5) * 14; const cg = S.gain(a); c.connect(cg); cg.connect(f); c.start(); nodes.push(c); }
    const l = lfo(S, 0.05, 80, f.frequency); nodes.push(l);
    return { set(k, v) { if (k === 'cut') f.frequency.setTargetAtTime(v, S.now(), 1); }, stop() { nodes.forEach(n => n.stop()); } };
  },
  tapeHiss(S, out) { const n = S.noiseSrc('white', true); const f = S.filt('highpass', 3000, 0.5); const g = S.gain(0.03); n.connect(f); f.connect(g); g.connect(out); n.start(); return { stop() { n.stop(); } }; },
  crackle(S, out) { // vinyl surface noise
    const n = S.noiseSrc('white', true); const f = S.filt('highpass', 2500, 0.5); const g = S.gain(0.01); n.connect(f); f.connect(g); g.connect(out); n.start();
    let next = S.now(); const sched = () => { const now = S.now(); while (next < now + 0.4) { if (Math.random() < 0.5) S.burst(out, next, 0.004, 'highpass', 2000, 1, 0.08 + Math.random() * 0.15); next += 0.04 + Math.random() * 0.15; } };
    const iv = setInterval(sched, 150);
    return { stop() { clearInterval(iv); n.stop(); } };
  },
  siren(S, out) {
    const c = S.osc('sawtooth', 700); const f = S.filt('lowpass', 2500, 1); const g = S.gain(0.12); c.connect(f); f.connect(g); g.connect(out); c.start();
    const l = S.osc('triangle', 0.22); const lg = S.gain(450); l.connect(lg); lg.connect(c.frequency); l.start(); c.frequency.value = 1050;
    return { stop() { c.stop(); l.stop(); } };
  },
  rain(S, out) { const n = S.noiseSrc('pink', true); const f = S.filt('highpass', 800, 0.4); const g = S.gain(0.2); n.connect(f); f.connect(g); g.connect(out); n.start(); return { stop() { n.stop(); } }; },
  fire(S, out) { const n = S.noiseSrc('brown', true); const g = S.gain(0.2); n.connect(g); g.connect(out); n.start(); return { stop() { n.stop(); } }; },
  tinnitus(S, out) { const o = S.osc('sine', 6200); const g = S.gain(0.012); o.connect(g); g.connect(out); o.start(); return { stop() { o.stop(); } }; },
};
