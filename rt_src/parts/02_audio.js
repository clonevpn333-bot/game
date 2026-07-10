/* ============================================================
 * Audio: 100% procedural WebAudio. Gunshots, foley, explosions,
 * radio crackle, ambient beds, stingers, menu music.
 * ============================================================ */
RT.audio = (() => {
  const AU = {};
  let ctx = null, master, sfx, amb, mus;
  let noiseBuf = null;
  let ambNodes = [], ambType = null, ambTimer = 0;
  let musicNodes = [], musicOn = false, musicTimer = 0;

  AU.ensure = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return true; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return false; }
    master = ctx.createGain(); master.gain.value = RT.settings.volume; master.connect(ctx.destination);
    sfx = ctx.createGain(); sfx.gain.value = 0.9; sfx.connect(master);
    amb = ctx.createGain(); amb.gain.value = 0.5; amb.connect(master);
    mus = ctx.createGain(); mus.gain.value = 0.42; mus.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  };
  AU.setVolume = v => { if (master) master.gain.value = v; };

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

  /* ---------- weapons ---------- */
  AU.gunshot = function (profile) {
    if (!AU.ensure()) return;
    const t = now();
    if (profile === 'rifle') {
      tone(sfx, t, 0.03, { type: 'square', freq: 2200, freqEnd: 300, gain: 0.18 });
      noise(sfx, t, 0.16, { type: 'bandpass', freq: 800, q: 0.8, gain: 0.5, decay: 0.14 });
      tone(sfx, t, 0.11, { freq: 110, freqEnd: 45, gain: 0.5 });
      noise(sfx, t, 0.34, { type: 'lowpass', freq: 2400, freqEnd: 300, gain: 0.2, decay: 0.32 });
    } else if (profile === 'dmr') {
      tone(sfx, t, 0.035, { type: 'square', freq: 1800, freqEnd: 200, gain: 0.2 });
      noise(sfx, t, 0.2, { type: 'bandpass', freq: 550, q: 0.7, gain: 0.62, decay: 0.18 });
      tone(sfx, t, 0.16, { freq: 90, freqEnd: 38, gain: 0.62 });
      noise(sfx, t, 0.55, { type: 'lowpass', freq: 1800, freqEnd: 200, gain: 0.24, decay: 0.5 });
    } else if (profile === 'shotgun') {
      noise(sfx, t, 0.22, { type: 'lowpass', freq: 1500, freqEnd: 250, gain: 0.75, decay: 0.2 });
      tone(sfx, t, 0.18, { freq: 75, freqEnd: 34, gain: 0.7 });
      noise(sfx, t, 0.5, { type: 'lowpass', freq: 900, freqEnd: 150, gain: 0.25, decay: 0.45 });
    } else { // pistol
      tone(sfx, t, 0.02, { type: 'square', freq: 2600, freqEnd: 500, gain: 0.16 });
      noise(sfx, t, 0.1, { type: 'bandpass', freq: 1100, q: 1, gain: 0.42, decay: 0.09 });
      tone(sfx, t, 0.07, { freq: 130, freqEnd: 60, gain: 0.35 });
      noise(sfx, t, 0.2, { type: 'lowpass', freq: 2000, freqEnd: 400, gain: 0.12, decay: 0.18 });
    }
  };
  AU.enemyShot = function (dist) {
    if (!AU.ensure()) return;
    const t = now();
    const att = clamp(1 - dist / 110, 0.12, 0.85);
    noise(sfx, t, 0.13, { type: 'bandpass', freq: clamp(900 - dist * 5, 260, 900), q: 0.9, gain: 0.34 * att, decay: 0.12 });
    tone(sfx, t, 0.09, { freq: 100, freqEnd: 45, gain: 0.3 * att });
    if (dist > 40) noise(sfx, t + 0.02, 0.3, { type: 'lowpass', freq: 500, gain: 0.1 * att, decay: 0.28 });
  };
  AU.allyShot = function () {
    if (!AU.ensure()) return;
    const t = now();
    noise(sfx, t, 0.12, { type: 'bandpass', freq: 750, q: 0.8, gain: 0.22, decay: 0.11 });
    tone(sfx, t, 0.08, { freq: 105, freqEnd: 48, gain: 0.2 });
  };
  AU.crack = function () {
    if (!ctx) return;
    const t = now();
    noise(sfx, t, 0.035, { type: 'highpass', freq: 2800, gain: 0.3, decay: 0.03 });
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

  AU.update = function (dt) { ambientTick(dt); musicTick(dt); };
  return AU;
})();
