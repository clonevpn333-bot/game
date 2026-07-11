/* ============================================================
 * Audio: 100% procedural WebAudio. Gunshots, foley, explosions,
 * radio crackle, ambient beds, stingers, menu music.
 * ============================================================ */
RT.audio = (() => {
  const AU = {};
  let ctx = null, master, comp, sfx, amb, mus, duck, verb, verbGain, shaper;
  let noiseBuf = null;
  let ambNodes = [], ambType = null, ambTimer = 0;
  let musicNodes = [], musicOn = false, musicTimer = 0;
  let distantVoices = 0;
  AU._nodes = 0;   // synthesis-layer counter (test hook)

  AU.ensure = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return false; }
    /* mix bus: master gain → compressor glue → destination */
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 14; comp.ratio.value = 5;
    comp.attack.value = 0.004; comp.release.value = 0.18;
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = RT.settings.volume; master.connect(comp);
    sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
    duck = ctx.createGain(); duck.gain.value = 1;          // ambient duck bus
    duck.connect(master);
    amb = ctx.createGain(); amb.gain.value = 0.5; amb.connect(duck);
    mus = ctx.createGain(); mus.gain.value = 0.42; mus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    /* convolution reverb with a GENERATED impulse response:
     * 2s stereo decaying noise burst = outdoor tail */
    const irLen = ctx.sampleRate * 2;
    const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const cd = ir.getChannelData(ch);
      for (let i = 0; i < irLen; i++) {
        const t = i / irLen;
        cd[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.4) * Math.exp(-3.2 * t) * 0.5;
      }
    }
    verb = ctx.createConvolver(); verb.buffer = ir;
    verbGain = ctx.createGain(); verbGain.gain.value = 0.6;
    verb.connect(verbGain); verbGain.connect(master);
    /* distortion waveshaper for gunshot cracks */
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 3.2); }
    shaper = ctx.createWaveShaper(); shaper.curve = curve; shaper.connect(sfx);
    return true;
  };
  AU.setVolume = v => { if (master) master.gain.value = v; };

  /* ---------- layer helpers (each = one voice in the stack) ---------- */
  function nLayer(t0, o) {
    if (!ctx) return;
    AU._nodes++;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    src.playbackRate.value = (o.rate || 1) * (0.94 + Math.random() * 0.12);
    const f = ctx.createBiquadFilter();
    f.type = o.type || 'bandpass';
    f.frequency.setValueAtTime(o.f0, t0);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(25, o.f1), t0 + o.dur);
    f.Q.value = o.q || 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain, t0 + (o.att || 0.0015));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f); f.connect(g);
    g.connect(o.shaped ? shaper : sfx);
    if (o.verb) { const vs = ctx.createGain(); vs.gain.value = o.verb; g.connect(vs); vs.connect(verb); }
    src.start(t0); src.stop(t0 + o.dur + 0.05);
  }
  function tLayer(t0, o) {
    if (!ctx) return;
    AU._nodes++;
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t0);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t0 + o.dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.gain, t0 + (o.att || 0.002));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g); g.connect(sfx);
    if (o.verb) { const vs = ctx.createGain(); vs.gain.value = o.verb; g.connect(vs); vs.connect(verb); }
    osc.start(t0); osc.stop(t0 + o.dur + 0.05);
  }
  /* gunshots duck the ambient bed ~4dB for 200ms */
  function duckAmbient(t0) {
    if (!ctx) return;
    duck.gain.cancelScheduledValues(t0);
    duck.gain.setTargetAtTime(0.62, t0, 0.012);
    duck.gain.setTargetAtTime(1.0, t0 + 0.2, 0.09);
  }

  function noise(dest, t0, dur, { type = 'lowpass', freq = 1000, q = 1, gain = 0.5, att = 0.002, decay = null, freqEnd = null } = {}) {
    if (!ctx) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    src.playbackRate.value = 0.7 + Math.random() * 0.6;
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (decay || dur));
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }
  function tone(dest, t0, dur, { type = 'sine', freq = 440, freqEnd = null, gain = 0.4, att = 0.002 } = {}) {
    if (!ctx) return;
    const o = ctx.createOscillator();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const now = () => ctx ? ctx.currentTime : 0;

  /* ---------- weapons: layered synthesis (crack/body/sub/tick/tail) ---------- */
  const SHOT_RECIPES = {
    rifle:   { crackDur: 0.011, crackG: 0.5, bodyDur: 0.085, bodyF: 850, bodyG: 0.55, subF: 42, subDur: 0.055, subG: 0.62, verb: 0.32 },
    dmr:     { crackDur: 0.014, crackG: 0.62, bodyDur: 0.12, bodyF: 700, bodyG: 0.68, subF: 40, subDur: 0.09, subG: 0.8, verb: 0.52 },
    shotgun: { crackDur: 0.012, crackG: 0.45, bodyDur: 0.13, bodyF: 600, bodyG: 0.85, subF: 38, subDur: 0.1, subG: 0.95, verb: 0.42, wide: true },
    pistol:  { crackDur: 0.009, crackG: 0.42, bodyDur: 0.06, bodyF: 1000, bodyG: 0.42, subF: 48, subDur: 0.04, subG: 0.4, verb: 0.16 },
  };
  AU.gunshot = function (profile) {
    if (!AU.ensure()) return;
    const t = now();
    const r = SHOT_RECIPES[profile] || SHOT_RECIPES.rifle;
    const v = 0.96 + Math.random() * 0.08;                              // ±4% per shot
    /* 1. crack: hard-attack HP noise through the waveshaper */
    nLayer(t, { dur: r.crackDur, type: 'highpass', f0: 2500, gain: r.crackG * v, att: 0.001, shaped: true, verb: r.verb * 0.5 });
    /* 2. body: bandpass sweep 800→300 */
    nLayer(t, { dur: r.bodyDur, type: 'bandpass', f0: r.bodyF * v, f1: 300, q: 0.8, gain: r.bodyG * v, verb: r.verb });
    if (r.wide) nLayer(t, { dur: r.bodyDur * 1.3, type: 'bandpass', f0: 420, f1: 200, q: 0.7, gain: r.bodyG * 0.7, verb: r.verb });
    /* 3. sub-thump: pitch-dropping sine, felt more than heard */
    tLayer(t, { f0: r.subF * v, f1: 25, dur: r.subDur, gain: r.subG * v, verb: r.verb * 0.4 });
    /* 4. mechanical tick (bolt cycling) */
    nLayer(t + 0.012, { dur: 0.005, type: 'bandpass', f0: 3200, q: 2.5, gain: 0.16 });
    duckAmbient(t);
  };
  AU.enemyShot = function (dist) {
    if (!AU.ensure()) return;
    if (distantVoices > 6) return;                                      // voice pool cap
    distantVoices++;
    setTimeout(() => { distantVoices--; }, 350);
    const t = now();
    const att = clamp(1 - dist / 120, 0.1, 0.85);
    /* distant = lowpassed body + long tail, no crack */
    nLayer(t, { dur: 0.1 + dist * 0.0006, type: 'lowpass', f0: clamp(1600 - dist * 11, 320, 1600), gain: 0.4 * att, verb: clamp(dist / 90, 0.25, 0.75) });
    tLayer(t, { f0: 46, f1: 26, dur: 0.06, gain: 0.32 * att, verb: 0.2 });
    if (dist < 30) nLayer(t, { dur: 0.008, type: 'highpass', f0: 2600, gain: 0.2, shaped: true });
  };
  AU.allyShot = function () {
    if (!AU.ensure()) return;
    const t = now();
    nLayer(t, { dur: 0.075, type: 'bandpass', f0: 800, f1: 320, gain: 0.3, verb: 0.25 });
    tLayer(t, { f0: 44, f1: 27, dur: 0.045, gain: 0.3 });
  };
  AU.crack = function () {
    /* supersonic near-miss snap: 2ms HP tick */
    if (!ctx) return;
    nLayer(now(), { dur: 0.0025, type: 'highpass', f0: 3600, gain: 0.34, att: 0.0006, shaped: true, verb: 0.12 });
  };
  AU.dryClick = () => { if (AU.ensure()) tone(sfx, now(), 0.03, { type: 'square', freq: 900, gain: 0.12 }); };
  AU.magOut = () => { if (ctx) { tone(sfx, now(), 0.04, { type: 'square', freq: 500, gain: 0.1 }); noise(sfx, now(), 0.05, { freq: 1200, gain: 0.08 }); } };
  AU.magIn = () => { if (ctx) { tone(sfx, now(), 0.05, { type: 'square', freq: 350, gain: 0.14 }); tone(sfx, now() + 0.03, 0.04, { type: 'square', freq: 620, gain: 0.1 }); } };
  AU.boltRack = () => { if (ctx) { noise(sfx, now(), 0.06, { type: 'bandpass', freq: 1800, q: 2, gain: 0.16 }); tone(sfx, now() + 0.05, 0.04, { type: 'square', freq: 800, gain: 0.12 }); } };
  AU.reloadStart = () => { if (ctx) noise(sfx, now(), 0.05, { type: 'bandpass', freq: 900, q: 1.4, gain: 0.1 }); };
  AU.shellLoad = () => { if (ctx) { tone(sfx, now(), 0.035, { type: 'square', freq: 480, gain: 0.1 }); noise(sfx, now(), 0.04, { freq: 900, gain: 0.06 }); } };
  AU.shellTink = () => { if (ctx && Math.random() < 0.6) tone(sfx, now(), 0.05, { type: 'triangle', freq: 3400 + Math.random() * 1800, gain: 0.05 }); };
  AU.hitFeedback = function (kill) {
    if (!ctx) return;
    const t = now();
    tone(sfx, t, 0.045, { type: 'triangle', freq: kill ? 620 : 900, gain: 0.13 });
    if (kill) tone(sfx, t + 0.05, 0.07, { type: 'triangle', freq: 420, gain: 0.13 });
  };
  AU.footstep = function (f) {
    if (!ctx) return;
    const t = now();
    noise(sfx, t, 0.07, { type: 'lowpass', freq: 320 + Math.random() * 200, gain: 0.1 + f * 0.1, decay: 0.06 });
  };
  AU.hurt = function () {
    if (!ctx) return;
    tone(sfx, now(), 0.12, { freq: 160, freqEnd: 70, gain: 0.3 });
    noise(sfx, now(), 0.1, { type: 'lowpass', freq: 500, gain: 0.15, decay: 0.09 });
  };
  AU.explosion = function (dist) {
    if (!AU.ensure()) return;
    const t = now();
    const att = clamp(1 - (dist || 0) / 130, 0.15, 1);
    tone(sfx, t, 1.1, { freq: 55, freqEnd: 26, gain: 0.8 * att });
    noise(sfx, t, 0.7, { type: 'lowpass', freq: 1300 * att + 200, freqEnd: 120, gain: 0.7 * att, decay: 0.6 });
    noise(sfx, t + 0.08, 1.4, { type: 'lowpass', freq: 600, freqEnd: 90, gain: 0.3 * att, decay: 1.3 });
    if (dist < 25) noise(sfx, t, 0.25, { type: 'highpass', freq: 1800, gain: 0.2, decay: 0.2 });
  };
  AU.thunder = function (delay) {
    if (!ctx) return;
    const t = now() + (delay || 0);
    tone(sfx, t, 2.2, { freq: 48, freqEnd: 22, gain: 0.5 });
    noise(sfx, t, 2.8, { type: 'lowpass', freq: 420, freqEnd: 70, gain: 0.4, decay: 2.5 });
    noise(sfx, t + 0.35, 1.4, { type: 'lowpass', freq: 240, gain: 0.22, decay: 1.3 });
  };
  AU.mortarWhistle = function (dur) {
    if (!AU.ensure()) return;
    tone(sfx, now(), dur || 1.1, { type: 'sine', freq: 2400, freqEnd: 700, gain: 0.09 });
  };
  AU.chargeBeep = function (n) {
    if (!ctx) return;
    for (let i = 0; i < (n || 3); i++) tone(sfx, now() + i * 0.5, 0.09, { type: 'square', freq: 1800, gain: 0.07 });
  };
  AU.radioCrackle = function () {
    if (!ctx) return;
    const t = now();
    noise(sfx, t, 0.05, { type: 'highpass', freq: 2200, gain: 0.07 });
    noise(sfx, t + 0.07, 0.03, { type: 'highpass', freq: 3000, gain: 0.05 });
  };
  AU.doorCreak = function () {
    if (!ctx) return;
    tone(sfx, now(), 0.35, { type: 'sawtooth', freq: 180 + Math.random() * 80, freqEnd: 120, gain: 0.045 });
  };
  AU.doorKick = function () {
    if (!ctx) return;
    tone(sfx, now(), 0.09, { freq: 120, freqEnd: 55, gain: 0.4 });
    noise(sfx, now(), 0.14, { type: 'lowpass', freq: 900, gain: 0.3, decay: 0.13 });
  };
  AU.gBounce = () => { if (ctx) tone(sfx, now(), 0.05, { type: 'triangle', freq: 1300 + Math.random() * 500, gain: 0.07 }); };
  AU.throwWhoosh = () => { if (ctx) noise(sfx, now(), 0.18, { type: 'bandpass', freq: 700, q: 1.6, gain: 0.08, decay: 0.16 }); };
  AU.glassBreak = function () {
    if (!ctx) return;
    const t = now();
    noise(sfx, t, 0.4, { type: 'highpass', freq: 3200, gain: 0.12, decay: 0.34 });
    for (let i = 0; i < 5; i++) tone(sfx, t + Math.random() * 0.12, 0.09, { type: 'triangle', freq: 2400 + Math.random() * 2600, gain: 0.05 });
  };
  AU.metalPing = () => { if (ctx) tone(sfx, now(), 0.12, { type: 'triangle', freq: 1800 + Math.random() * 900, freqEnd: 900, gain: 0.06 }); };
  AU.objectiveStinger = function () {
    if (!ctx) return;
    const t = now();
    tone(mus, t, 0.5, { type: 'triangle', freq: 220, gain: 0.16 });
    tone(mus, t + 0.16, 0.7, { type: 'triangle', freq: 293.7, gain: 0.16 });
  };
  AU.combatStinger = function () {
    if (!ctx) return;
    const t = now();
    tone(mus, t, 0.6, { freq: 73.4, gain: 0.3 });
    noise(mus, t, 0.3, { type: 'lowpass', freq: 400, gain: 0.2, decay: 0.28 });
    tone(mus, t + 0.28, 0.8, { type: 'triangle', freq: 87.3, gain: 0.2 });
  };
  AU.missionCompleteStinger = function () {
    if (!ctx) return;
    const t = now();
    [[220, 0], [277, 0.22], [330, 0.44], [440, 0.66]].forEach(([f, d]) =>
      tone(mus, t + d, 0.9, { type: 'triangle', freq: f, gain: 0.15 }));
  };

  /* ---------- ambient beds ---------- */
  function stopAmbient() {
    for (const n of ambNodes) { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} }
    ambNodes = [];
  }
  AU.setAmbient = function (type) {
    if (!AU.ensure()) { ambType = type; return; }
    if (ambType === type && ambNodes.length) return;
    stopAmbient();
    ambType = type;
    if (!type || type === 'none') return;
    /* wind base for all */
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    const g = ctx.createGain();
    const lfo = ctx.createOscillator(); const lg = ctx.createGain();
    lfo.frequency.value = 0.13; lg.gain.value = 60;
    lfo.connect(lg); lg.connect(f.frequency);
    src.connect(f); f.connect(g); g.connect(amb);
    src.start(); lfo.start();
    ambNodes.push(src, lfo);
    if (type === 'birds') { f.frequency.value = 240; g.gain.value = 0.13; }
    else if (type === 'rain') {
      f.frequency.value = 900; g.gain.value = 0.3;
      const src2 = ctx.createBufferSource(); src2.buffer = noiseBuf; src2.loop = true; src2.playbackRate.value = 1.7;
      const f2 = ctx.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 2500;
      const g2 = ctx.createGain(); g2.gain.value = 0.05;
      src2.connect(f2); f2.connect(g2); g2.connect(amb); src2.start();
      ambNodes.push(src2);
    } else if (type === 'storm') {
      f.frequency.value = 350; g.gain.value = 0.4;
      const src2 = ctx.createBufferSource(); src2.buffer = noiseBuf; src2.loop = true; src2.playbackRate.value = 1.6;
      const f2 = ctx.createBiquadFilter(); f2.type = 'highpass'; f2.frequency.value = 2200;
      const g2 = ctx.createGain(); g2.gain.value = 0.06;
      src2.connect(f2); f2.connect(g2); g2.connect(amb); src2.start();
      ambNodes.push(src2);
    } else if (type === 'night') { f.frequency.value = 180; g.gain.value = 0.1; }
  };
  /* random one-shots per ambient type */
  function ambientTick(dt) {
    ambTimer -= dt;
    if (ambTimer > 0 || !ctx) return;
    ambTimer = 2 + Math.random() * 5;
    const t = now();
    if (ambType === 'birds') {
      // chirp cluster
      const base = 2400 + Math.random() * 1600;
      for (let i = 0; i < 2 + Math.random() * 3; i++)
        tone(amb, t + i * 0.09 + Math.random() * 0.04, 0.06, { type: 'sine', freq: base + Math.random() * 500, freqEnd: base - 300, gain: 0.035 });
    } else if (ambType === 'night') {
      for (let i = 0; i < 4; i++)
        tone(amb, t + i * 0.12, 0.05, { type: 'sine', freq: 3800 + Math.random() * 300, gain: 0.018 });
    } else if (ambType === 'storm') {
      if (Math.random() < 0.25) AU.thunder(Math.random() * 0.8);
      ambTimer = 4 + Math.random() * 7;
    }
  }

  /* ---------- menu music: low drone + slow pulse ---------- */
  AU.menuMusic = function (on) {
    if (!ctx && on && !AU.ensure()) { musicOn = on; return; }
    musicOn = on;
    for (const n of musicNodes) { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} }
    musicNodes = [];
    if (!on || !ctx) return;
    const mkDrone = (freq, det, gv) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.value = freq; o.detune.value = det;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 240;
      const g = ctx.createGain(); g.gain.value = gv;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
      const lg = ctx.createGain(); lg.gain.value = 90;
      lfo.connect(lg); lg.connect(f.frequency);
      o.connect(f); f.connect(g); g.connect(mus);
      o.start(); lfo.start();
      musicNodes.push(o, lfo);
    };
    mkDrone(55, 0, 0.1); mkDrone(55, 9, 0.08); mkDrone(82.4, -6, 0.05);
  };
  function musicTick(dt) {
    if (!musicOn || !ctx) return;
    musicTimer -= dt;
    if (musicTimer > 0) return;
    musicTimer = 2.6;
    const t = now();
    noise(mus, t, 0.16, { type: 'bandpass', freq: 200, q: 0.8, gain: 0.1, decay: 0.15 });   // slow snare-ish pulse
    if (Math.random() < 0.35) tone(mus, t + 1.3, 1.6, { type: 'triangle', freq: [110, 130.8, 164.8][(Math.random() * 3) | 0], gain: 0.04 });
  }

  /* ---------- dynamic combat music: driving bass bed + percussion ---------- */
  let combatOn = false, combatGain = null, combatOsc = null, combatTimer = 0, combatBeat = 0;
  AU.combatMusic = function (on) {
    if (on === combatOn) return;
    if (on && !AU.ensure()) return;
    combatOn = on;
    if (on && ctx) {
      combatGain = ctx.createGain(); combatGain.gain.value = 0.0001; combatGain.connect(mus);
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 49;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 170; f.Q.value = 3;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 2.0; const lg = ctx.createGain(); lg.gain.value = 40;
      lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      o.connect(f); f.connect(combatGain); o.start();
      combatOsc = [o, lfo];
      combatGain.gain.setTargetAtTime(0.42, now(), 0.7);
    } else if (ctx && combatGain) {
      const cg = combatGain, co = combatOsc; combatGain = null; combatOsc = null;
      cg.gain.setTargetAtTime(0.0001, now(), 0.9);
      setTimeout(() => { for (const n of co || []) { try { n.stop(); } catch (e) {} } try { cg.disconnect(); } catch (e) {} }, 1500);
    }
  };
  function combatTick(dt) {
    if (!combatOn || !ctx || !combatGain) return;
    combatTimer -= dt;
    if (combatTimer > 0) return;
    combatTimer = 0.48;
    const t = now();
    noise(combatGain, t, 0.07, { type: 'bandpass', freq: 2000, q: 1.4, gain: 0.14, decay: 0.06 });   // hat
    combatBeat = (combatBeat + 1) % 4;
    if (combatBeat === 0) noise(combatGain, t, 0.16, { type: 'lowpass', freq: 150, gain: 0.5, decay: 0.14 }); // kick
    if (combatBeat === 2) tone(combatGain, t, 0.14, { type: 'triangle', freq: 98, gain: 0.3 });              // pulse
  }

  /* vehicle engine loop: filtered saw + noise, RPM-pitched */
  let engineNodes = null;
  AU.engineStart = function () {
    if (!AU.ensure() || engineNodes) return;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 55;
    const osc2 = ctx.createOscillator(); osc2.type = 'square'; osc2.frequency.value = 28;
    const nsrc = ctx.createBufferSource(); nsrc.buffer = noiseBuf; nsrc.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 300;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 480; f.Q.value = 2;
    const g = ctx.createGain(); g.gain.value = 0.0001;
    osc.connect(f); osc2.connect(f); nsrc.connect(nf); nf.connect(g); f.connect(g); g.connect(sfx);
    osc.start(); osc2.start(); nsrc.start();
    g.gain.setTargetAtTime(0.14, now(), 0.1);
    engineNodes = { osc, osc2, nsrc, g, f };
  };
  AU.engineRPM = function (t) { // 0..1
    if (!engineNodes) return;
    engineNodes.osc.frequency.setTargetAtTime(55 + t * 130, now(), 0.06);
    engineNodes.osc2.frequency.setTargetAtTime(28 + t * 60, now(), 0.06);
    engineNodes.f.frequency.setTargetAtTime(480 + t * 900, now(), 0.08);
    engineNodes.g.gain.setTargetAtTime(0.1 + t * 0.12, now(), 0.08);
  };
  AU.engineStop = function () {
    if (!engineNodes) return;
    const e = engineNodes; engineNodes = null;
    e.g.gain.setTargetAtTime(0.0001, now(), 0.12);
    setTimeout(() => { try { e.osc.stop(); e.osc2.stop(); e.nsrc.stop(); } catch (x) {} }, 600);
  };
  AU.stormRumble = function (intensity) {
    if (!ctx) return;
    nLayer(now(), { dur: 0.8, type: 'lowpass', f0: 120, f1: 60, gain: 0.12 * intensity, att: 0.2, verb: 0.3 });
  };

  AU.update = function (dt) { ambientTick(dt); musicTick(dt); combatTick(dt); };
  return AU;
})();
