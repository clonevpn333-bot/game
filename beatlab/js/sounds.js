/* BeatLab — every sound is synthesized right here, so the app ships with a full library
 * and works offline. Drums are rendered once into AudioBuffers; instruments play live. */
(function (root) {
  const BL = (root.BL = root.BL || {});
  const SR = 44100;

  // ---------- shared helpers ----------
  const noiseCache = new WeakMap();
  function noise(ctx) {
    let b = noiseCache.get(ctx);
    if (!b) {
      b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      noiseCache.set(ctx, b);
    }
    return b;
  }
  function noiseSrc(ctx, t, dur) {
    const s = ctx.createBufferSource();
    s.buffer = noise(ctx);
    s.loop = true;
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
    return s;
  }
  function osc(ctx, type, freq, t, dur) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.start(t);
    o.stop(t + dur + 0.05);
    return o;
  }
  function gain(ctx, v) {
    const g = ctx.createGain();
    g.gain.value = v == null ? 1 : v;
    return g;
  }
  function filter(ctx, type, freq, q) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q != null) f.Q.value = q;
    return f;
  }
  const curveCache = {};
  function shaper(ctx, amount, asym) {
    asym = asym || 0;
    const k = Math.round(amount * 100) + ':' + Math.round(asym * 100);
    if (!curveCache[k]) {
      const n = 2048, c = new Float32Array(n);
      const a = amount * 50 + 1;
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        // asym > 0 bends the positive half harder: adds 2nd/4th harmonics (warm), on top of tanh's 3rd/5th (gritty)
        const y = Math.tanh(a * x) / Math.tanh(a);
        c[i] = x >= 0 ? y : y * (1 - asym * 0.75);
      }
      curveCache[k] = c;
    }
    const s = ctx.createWaveShaper();
    s.curve = curveCache[k];
    s.oversample = '2x';
    return s;
  }
  function decay(param, t, peak, len, attack) {
    attack = attack || 0.002;
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + attack);
    param.exponentialRampToValueAtTime(0.0001, t + attack + len);
  }
  function chain(...nodes) {
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]);
    return nodes[nodes.length - 1];
  }

  // ---------- drum voices ----------
  function kick(p) {
    return (ctx, out, t) => {
      const o = osc(ctx, 'sine', p.f0, t, p.decay + 0.1);
      o.frequency.exponentialRampToValueAtTime(p.f1, t + p.pitchDecay);
      const g = gain(ctx, 0);
      decay(g.gain, t, 1, p.decay, 0.001);
      let last = chain(o, g);
      if (p.drive) last = chain(last, shaper(ctx, p.drive), gain(ctx, 0.8));
      if (p.lp) last = chain(last, filter(ctx, 'lowpass', p.lp, 0.7));
      last.connect(out);
      if (p.click) {
        const n = noiseSrc(ctx, t, 0.02);
        const ng = gain(ctx, 0);
        decay(ng.gain, t, p.click, 0.012, 0.0005);
        chain(n, filter(ctx, 'highpass', 2500), ng, out);
      }
      if (p.body) {
        const b = osc(ctx, 'triangle', p.f1 * 2.2, t, 0.15);
        const bg = gain(ctx, 0);
        decay(bg.gain, t, p.body, 0.08);
        chain(b, bg, out);
      }
    };
  }

  function snare(p) {
    return (ctx, out, t) => {
      const bus = gain(ctx, 1);
      let last = bus;
      if (p.drive) last = chain(bus, shaper(ctx, p.drive), gain(ctx, 0.7));
      if (p.lp) last = chain(last, filter(ctx, 'lowpass', p.lp, 0.5));
      last.connect(out);
      const tone = osc(ctx, 'triangle', p.tone, t, 0.3);
      tone.frequency.exponentialRampToValueAtTime(p.tone * 0.65, t + 0.08);
      const tg = gain(ctx, 0);
      decay(tg.gain, t, p.toneGain, p.toneDecay);
      chain(tone, tg, bus);
      const n = noiseSrc(ctx, t, p.noiseDecay + 0.1);
      const ng = gain(ctx, 0);
      decay(ng.gain, t, p.noiseGain, p.noiseDecay);
      chain(n, filter(ctx, 'highpass', p.hp || 1200), filter(ctx, 'peaking', p.peak || 4000, 1), ng, bus);
    };
  }

  function clap(p) {
    return (ctx, out, t) => {
      const bus = chain(gain(ctx, 1), filter(ctx, 'bandpass', p.bp || 1300, 0.9));
      const post = gain(ctx, 1.6);
      chain(bus, post);
      let last = post;
      if (p.lp) last = chain(post, filter(ctx, 'lowpass', p.lp));
      last.connect(out);
      const n = noiseSrc(ctx, t, 0.6);
      const g = gain(ctx, 0);
      chain(n, g, bus);
      const sp = p.spread || 0.011;
      for (let i = 0; i < 3; i++) {
        const tt = t + i * sp;
        g.gain.setValueAtTime(0.0001, tt);
        g.gain.exponentialRampToValueAtTime(1, tt + 0.001);
        g.gain.exponentialRampToValueAtTime(0.15, tt + sp * 0.9);
      }
      const tt = t + 3 * sp;
      g.gain.setValueAtTime(1, tt);
      g.gain.exponentialRampToValueAtTime(0.0001, tt + p.decay);
      if (p.snap) {
        const s = osc(ctx, 'triangle', 220, t, 0.1);
        const sg = gain(ctx, 0);
        decay(sg.gain, t, p.snap, 0.05);
        chain(s, sg, out);
      }
    };
  }

  const METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];
  function hat(p) {
    return (ctx, out, t) => {
      const bus = gain(ctx, 0);
      decay(bus.gain, t, p.level || 0.7, p.decay, 0.001);
      let last = chain(bus, filter(ctx, 'highpass', p.hp || 7000), filter(ctx, 'peaking', p.peak || 10000, 1.5));
      if (p.lp) last = chain(last, filter(ctx, 'lowpass', p.lp));
      last.connect(out);
      if (p.metal !== 0) {
        const mg = gain(ctx, (p.metal == null ? 0.5 : p.metal) / METAL.length);
        chain(mg, filter(ctx, 'bandpass', 10000, 0.8), bus);
        for (const f of METAL) osc(ctx, 'square', f * (p.tune || 1), t, p.decay + 0.05).connect(mg);
      }
      const n = noiseSrc(ctx, t, p.decay + 0.05);
      chain(n, gain(ctx, p.noise == null ? 0.6 : p.noise), bus);
    };
  }

  function tom(p) {
    return (ctx, out, t) => {
      const o = osc(ctx, p.type || 'sine', p.f0, t, p.decay + 0.05);
      o.frequency.exponentialRampToValueAtTime(p.f1, t + p.pd || 0.1);
      const g = gain(ctx, 0);
      decay(g.gain, t, p.level || 0.9, p.decay);
      chain(o, g, out);
      if (p.click) {
        const n = noiseSrc(ctx, t, 0.03);
        const ng = gain(ctx, 0);
        decay(ng.gain, t, p.click, 0.015);
        chain(n, filter(ctx, 'bandpass', p.f0 * 4, 1), ng, out);
      }
    };
  }

  function cowbell(ctx, out, t) {
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.15, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    chain(g, filter(ctx, 'bandpass', 900, 1.2), gain(ctx, 2.2), out);
    osc(ctx, 'square', 540, t, 0.45).connect(g);
    osc(ctx, 'square', 800, t, 0.45).connect(g);
  }

  function shaker(p) {
    return (ctx, out, t) => {
      const n = noiseSrc(ctx, t, p.decay + 0.05);
      const g = gain(ctx, 0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(p.level || 0.6, t + (p.attack || 0.012));
      g.gain.exponentialRampToValueAtTime(0.0001, t + (p.attack || 0.012) + p.decay);
      chain(n, filter(ctx, 'bandpass', p.bp || 7000, p.q || 1.2), g, out);
      if (p.jingle) {
        const jg = gain(ctx, 0);
        decay(jg.gain, t, 0.12, 0.18);
        chain(jg, filter(ctx, 'highpass', 6000), out);
        for (const f of [2637, 3520, 4186]) osc(ctx, 'square', f, t, 0.25).connect(jg);
      }
    };
  }

  function crash(p) {
    return (ctx, out, t) => {
      hat({ decay: p.decay, hp: p.hp || 4000, peak: 8000, metal: 0.8, noise: 0.8, level: p.level || 0.5, tune: p.tune || 1.3 })(ctx, out, t);
    };
  }

  function riser(p) {
    return (ctx, out, t) => {
      const n = noiseSrc(ctx, t, p.dur + 0.1);
      const f = filter(ctx, 'bandpass', p.from, 3);
      f.frequency.setValueAtTime(p.from, t);
      f.frequency.exponentialRampToValueAtTime(p.to, t + p.dur);
      const g = gain(ctx, 0);
      g.gain.setValueAtTime(0.0001, t);
      if (p.from < p.to) {
        g.gain.exponentialRampToValueAtTime(0.9, t + p.dur * 0.95);
        g.gain.exponentialRampToValueAtTime(0.0001, t + p.dur);
      } else {
        g.gain.exponentialRampToValueAtTime(0.9, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + p.dur);
      }
      chain(n, f, g, gain(ctx, 1.5), out);
    };
  }

  function impact(ctx, out, t) {
    kick({ f0: 120, f1: 30, decay: 1.4, pitchDecay: 0.4, drive: 0.4 })(ctx, out, t);
    const n = noiseSrc(ctx, t, 1.6);
    const f = filter(ctx, 'lowpass', 6000);
    f.frequency.setValueAtTime(6000, t);
    f.frequency.exponentialRampToValueAtTime(200, t + 1.2);
    const g = gain(ctx, 0);
    decay(g.gain, t, 0.6, 1.5);
    chain(n, f, g, out);
  }

  /** formant "vowel" voice — used for vocal chops and the choir */
  const VOWELS = {
    a: [[800, 1], [1150, 0.5], [2900, 0.25]],
    o: [[450, 1], [800, 0.4], [2830, 0.1]],
    e: [[400, 1], [1600, 0.4], [2700, 0.25]],
    u: [[325, 1], [700, 0.25], [2530, 0.08]],
  };
  function formantVoice(ctx, out, freq, t, dur, vowel, level, vib) {
    const src = osc(ctx, 'sawtooth', freq, t, dur + 0.5);
    if (vib) {
      const lfo = osc(ctx, 'sine', 5.2, t, dur + 0.5);
      const lg = gain(ctx, freq * 0.008);
      chain(lfo, lg, src.frequency);
    }
    const bus = gain(ctx, level);
    bus.connect(out);
    for (const [f, a] of VOWELS[vowel] || VOWELS.a) {
      chain(src, filter(ctx, 'bandpass', f, f / 90), gain(ctx, a * 3), bus);
    }
    return bus;
  }

  function voxHey(ctx, out, t) {
    const g = gain(ctx, 0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(1, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    g.connect(out);
    const b = formantVoice(ctx, g, 260, t, 0.3, 'e', 1, false);
    void b;
    const n = noiseSrc(ctx, t, 0.05);
    const ng = gain(ctx, 0);
    decay(ng.gain, t, 0.4, 0.04);
    chain(n, filter(ctx, 'highpass', 2000), ng, out);
  }

  function snap(ctx, out, t) {
    const n = noiseSrc(ctx, t, 0.1);
    const g = gain(ctx, 0);
    decay(g.gain, t, 1, 0.045, 0.0008);
    chain(n, filter(ctx, 'bandpass', 2200, 2), gain(ctx, 2), g, out);
    const o = osc(ctx, 'sine', 1800, t, 0.05);
    const og = gain(ctx, 0);
    decay(og.gain, t, 0.3, 0.02);
    chain(o, og, out);
  }

  function layer(...fns) {
    return (ctx, out, t) => fns.forEach((f) => f(ctx, out, t));
  }

  // id, name, category, synth fn, length (s), [reverse]
  const DRUMS = [
    ['kick_trap', 'Trap Kick', 'Kick', kick({ f0: 180, f1: 48, decay: 0.45, pitchDecay: 0.06, click: 0.5, drive: 0.15 }), 0.6],
    ['kick_punch', 'Punchy Kick', 'Kick', kick({ f0: 220, f1: 55, decay: 0.32, pitchDecay: 0.04, click: 0.8, drive: 0.35, body: 0.3 }), 0.5],
    ['kick_boombap', 'Boom Bap Kick', 'Kick', kick({ f0: 150, f1: 52, decay: 0.38, pitchDecay: 0.05, click: 0.35, drive: 0.25, lp: 2600, body: 0.4 }), 0.5],
    ['kick_dusty', 'Dusty Kick', 'Kick', kick({ f0: 130, f1: 50, decay: 0.3, pitchDecay: 0.05, click: 0.2, drive: 0.5, lp: 1500 }), 0.45],
    ['kick_rage', 'Rage Kick', 'Kick', kick({ f0: 240, f1: 45, decay: 0.55, pitchDecay: 0.05, click: 0.9, drive: 0.9 }), 0.7],
    ['kick_deep', 'Deep Kick', 'Kick', kick({ f0: 120, f1: 38, decay: 0.7, pitchDecay: 0.09, click: 0.25 }), 0.9],
    ['kick_lofi', 'Lo-Fi Kick', 'Kick', kick({ f0: 110, f1: 52, decay: 0.28, pitchDecay: 0.04, click: 0.1, lp: 900, drive: 0.2 }), 0.4],

    ['snare_trap', 'Trap Snare', 'Snare', snare({ tone: 200, toneGain: 0.5, toneDecay: 0.09, noiseGain: 0.75, noiseDecay: 0.17, hp: 1500, peak: 5000 }), 0.35],
    ['snare_crack', 'Crack Snare', 'Snare', snare({ tone: 240, toneGain: 0.6, toneDecay: 0.06, noiseGain: 0.9, noiseDecay: 0.12, hp: 2000, peak: 6500, drive: 0.4 }), 0.3],
    ['snare_boombap', 'Boom Bap Snare', 'Snare', snare({ tone: 180, toneGain: 0.7, toneDecay: 0.12, noiseGain: 0.7, noiseDecay: 0.22, hp: 900, peak: 3000, drive: 0.35, lp: 6000 }), 0.4],
    ['snare_drill', 'Drill Snare', 'Snare', snare({ tone: 310, toneGain: 0.55, toneDecay: 0.07, noiseGain: 0.8, noiseDecay: 0.14, hp: 2500, peak: 7000 }), 0.3],
    ['snare_lofi', 'Lo-Fi Snare', 'Snare', snare({ tone: 170, toneGain: 0.5, toneDecay: 0.1, noiseGain: 0.55, noiseDecay: 0.2, hp: 700, peak: 2500, lp: 3500, drive: 0.2 }), 0.4],
    ['snare_rage', 'Rage Snare', 'Snare', snare({ tone: 220, toneGain: 0.8, toneDecay: 0.1, noiseGain: 1, noiseDecay: 0.2, hp: 1200, peak: 4500, drive: 0.85 }), 0.4],
    ['rim', 'Rimshot', 'Snare', layer(tom({ f0: 1700, f1: 1600, decay: 0.03, level: 0.5, type: 'triangle' }), snare({ tone: 400, toneGain: 0.2, toneDecay: 0.02, noiseGain: 0.4, noiseDecay: 0.03, hp: 3000 })), 0.15],

    ['clap_trap', 'Trap Clap', 'Clap', clap({ decay: 0.18, bp: 1300 }), 0.35],
    ['clap_big', 'Big Clap', 'Clap', clap({ decay: 0.35, bp: 1100, spread: 0.014, snap: 0.3 }), 0.5],
    ['clap_lofi', 'Lo-Fi Clap', 'Clap', clap({ decay: 0.22, bp: 1000, lp: 2800 }), 0.4],
    ['snap', 'Finger Snap', 'Clap', snap, 0.15],
    ['clap_snare', 'Clap + Snare', 'Clap', layer(clap({ decay: 0.2, bp: 1400 }), snare({ tone: 210, toneGain: 0.4, toneDecay: 0.08, noiseGain: 0.5, noiseDecay: 0.15, hp: 1500 })), 0.4],

    ['hat_trap', 'Trap Hat', 'Hi-Hat', hat({ decay: 0.045, hp: 7500, metal: 0.55, level: 0.6 }), 0.12],
    ['hat_crisp', 'Crisp Hat', 'Hi-Hat', hat({ decay: 0.03, hp: 9000, metal: 0.3, noise: 0.8, level: 0.6 }), 0.1],
    ['hat_dusty', 'Dusty Hat', 'Hi-Hat', hat({ decay: 0.06, hp: 5000, metal: 0.4, lp: 9000, level: 0.55 }), 0.14],
    ['hat_drill', 'Drill Hat', 'Hi-Hat', hat({ decay: 0.035, hp: 8000, metal: 0.8, tune: 1.25, level: 0.55 }), 0.1],
    ['shaker', 'Shaker', 'Hi-Hat', shaker({ decay: 0.07, bp: 7500 }), 0.15],

    ['ohat', 'Open Hat', 'Open Hat', hat({ decay: 0.35, hp: 7000, metal: 0.55, level: 0.5 }), 0.5],
    ['ohat_long', 'Long Open Hat', 'Open Hat', hat({ decay: 0.7, hp: 6500, metal: 0.6, level: 0.45 }), 0.9],
    ['ohat_dusty', 'Dusty Open Hat', 'Open Hat', hat({ decay: 0.3, hp: 4500, metal: 0.4, lp: 8000, level: 0.45 }), 0.45],

    ['perc_rim', 'Wood Click', 'Perc', tom({ f0: 900, f1: 850, decay: 0.05, level: 0.6, type: 'triangle', click: 0.3 }), 0.1],
    ['cowbell', 'Cowbell', 'Perc', cowbell, 0.45],
    ['conga_hi', 'Conga High', 'Perc', tom({ f0: 420, f1: 330, decay: 0.18, pd: 0.03, click: 0.2 }), 0.25],
    ['conga_lo', 'Conga Low', 'Perc', tom({ f0: 260, f1: 200, decay: 0.24, pd: 0.03, click: 0.2 }), 0.3],
    ['tom', 'Floor Tom', 'Perc', tom({ f0: 160, f1: 90, decay: 0.4, pd: 0.15, click: 0.2 }), 0.5],
    ['tamb', 'Tambourine', 'Perc', shaker({ decay: 0.16, bp: 9000, jingle: true, attack: 0.004 }), 0.3],
    ['vox_hey', 'Vox "Hey"', 'Perc', voxHey, 0.35],

    ['crash', 'Crash', 'FX', crash({ decay: 1.6 }), 1.8],
    ['crash_rev', 'Reverse Crash', 'FX', crash({ decay: 1.2 }), 1.3, true],
    ['riser', 'Riser', 'FX', riser({ from: 300, to: 9000, dur: 1.8 }), 1.9],
    ['downsweep', 'Down Sweep', 'FX', riser({ from: 8000, to: 150, dur: 1.2 }), 1.3],
    ['impact', 'Impact Boom', 'FX', impact, 1.7],

    // ---- BeatLab Packs: original kits built for specific vibes ----
    // "Money So Big" kit: blown-out rage drums
    ['msb_kick', 'Big Money Kick', 'Kick', kick({ f0: 260, f1: 47, decay: 0.42, pitchDecay: 0.035, click: 1, drive: 0.95, body: 0.2 }), 0.55, false, 'msb'],
    ['msb_clap', 'Big Money Clap', 'Clap', layer(clap({ decay: 0.16, bp: 1600, spread: 0.009 }), snare({ tone: 230, toneGain: 0.5, toneDecay: 0.06, noiseGain: 0.8, noiseDecay: 0.12, hp: 2200, peak: 6000, drive: 0.7 })), 0.35, false, 'msb'],
    ['msb_hat', 'Big Money Hat', 'Hi-Hat', hat({ decay: 0.03, hp: 9000, metal: 0.9, tune: 1.4, level: 0.7 }), 0.08, false, 'msb'],
    ['msb_ohat', 'Big Money Open Hat', 'Open Hat', hat({ decay: 0.22, hp: 8000, metal: 0.8, tune: 1.4, level: 0.5 }), 0.3, false, 'msb'],
    ['msb_ping', 'Metal Ping', 'Perc', tom({ f0: 1320, f1: 1300, decay: 0.25, level: 0.5, type: 'square', click: 0.2 }), 0.3, false, 'msb'],
    ['msb_riser', 'Rage Riser', 'FX', riser({ from: 500, to: 12000, dur: 1.4 }), 1.5, false, 'msb'],
    // "Fever" kit: airy, glossy underground plugg/jerk drums
    ['fev_kick', 'Fever Kick', 'Kick', kick({ f0: 140, f1: 46, decay: 0.5, pitchDecay: 0.07, click: 0.35 }), 0.6, false, 'fev'],
    ['fev_snare', 'Fever Snap Snare', 'Snare', layer(snap, snare({ tone: 280, toneGain: 0.35, toneDecay: 0.05, noiseGain: 0.7, noiseDecay: 0.1, hp: 3000, peak: 8000 })), 0.25, false, 'fev'],
    ['fev_hat', 'Fever Tick Hat', 'Hi-Hat', hat({ decay: 0.022, hp: 10000, metal: 0.25, noise: 0.9, level: 0.6 }), 0.06, false, 'fev'],
    ['fev_ohat', 'Fever Air Hat', 'Open Hat', shaker({ decay: 0.25, bp: 9500, q: 0.8, attack: 0.03, level: 0.5 }), 0.35, false, 'fev'],
    ['fev_vox', 'Fever Vox Chop', 'Perc', (ctx, out, t) => { const g = gain(ctx, 0); decay(g.gain, t, 1, 0.22, 0.01); g.connect(out); formantVoice(ctx, g, 523, t, 0.3, 'a', 0.9, false); }, 0.3, false, 'fev'],
    ['fev_rev', 'Fever Reverse Air', 'FX', riser({ from: 2000, to: 9000, dur: 0.9 }), 1, false, 'fev'],
    // "Jukebox Joints" kit: dusty soul-sample boom bap
    ['jbx_kick', 'Jukebox Kick', 'Kick', kick({ f0: 135, f1: 50, decay: 0.34, pitchDecay: 0.05, click: 0.3, drive: 0.4, lp: 2200, body: 0.45 }), 0.45, false, 'jbx'],
    ['jbx_snare', 'Jukebox Snare', 'Snare', snare({ tone: 175, toneGain: 0.75, toneDecay: 0.14, noiseGain: 0.75, noiseDecay: 0.26, hp: 800, peak: 2800, drive: 0.45, lp: 5500 }), 0.45, false, 'jbx'],
    ['jbx_hat', 'Jukebox Hat', 'Hi-Hat', hat({ decay: 0.07, hp: 4500, metal: 0.35, lp: 8000, level: 0.5 }), 0.15, false, 'jbx'],
    ['jbx_rim', 'Jukebox Rim', 'Perc', tom({ f0: 1500, f1: 1400, decay: 0.04, level: 0.55, type: 'triangle', click: 0.4 }), 0.1, false, 'jbx'],
    ['jbx_tamb', 'Jukebox Tambourine', 'Perc', shaker({ decay: 0.14, bp: 8000, jingle: true, attack: 0.004 }), 0.25, false, 'jbx'],
    // Yeat pack extras
    ['yeat_kick', 'Rage Kick (Yeat)', 'Kick', kick({ f0: 230, f1: 50, decay: 0.32, pitchDecay: 0.03, click: 1, drive: 0.9 }), 0.45, false, 'msb'],
    ['yeat_zap', 'Laser Zap', 'FX', (ctx, out, t) => { const o = osc(ctx, 'square', 3200, t, 0.2); o.frequency.exponentialRampToValueAtTime(140, t + 0.14); const g = gain(ctx, 0); decay(g.gain, t, 0.5, 0.15, 0.001); chain(o, filter(ctx, 'lowpass', 6000), g, out); }, 0.25, false, 'msb'],
    ['yeat_ad', 'Ad-lib "Yeah"', 'FX', (ctx, out, t) => { const g = gain(ctx, 0); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1, t + 0.02); g.gain.setValueAtTime(1, t + 0.18); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4); chain(g, filter(ctx, 'highpass', 250), out); const s = osc(ctx, 'sawtooth', 210, t, 0.45); s.frequency.linearRampToValueAtTime(260, t + 0.12); s.frequency.linearRampToValueAtTime(180, t + 0.4); [[400, 1600, 1], [780, 1150, 0.6], [2500, 2800, 0.3]].forEach(([f0, f1, a]) => { const bp = filter(ctx, 'bandpass', f0, 7); bp.frequency.linearRampToValueAtTime(f1, t + 0.15); chain(s, bp, gain(ctx, a * 4), g); }); }, 0.45, false, 'msb'],
    // Drake pack: soft, dark, roomy drums
    ['dk_kick', 'OVO Kick', 'Kick', kick({ f0: 120, f1: 44, decay: 0.42, pitchDecay: 0.06, click: 0.15, lp: 1200, body: 0.2 }), 0.55, false, 'drake'],
    ['dk_snap', 'OVO Snap', 'Snare', layer(snap, tom({ f0: 1650, f1: 1550, decay: 0.03, level: 0.35, type: 'triangle' })), 0.15, false, 'drake'],
    ['dk_clap', 'OVO Clap', 'Clap', clap({ decay: 0.3, bp: 1150, spread: 0.013, lp: 6000 }), 0.45, false, 'drake'],
    ['dk_hat', 'OVO Hat', 'Hi-Hat', hat({ decay: 0.04, hp: 7000, metal: 0.3, lp: 11000, level: 0.45 }), 0.1, false, 'drake'],
    ['dk_shaker', 'OVO Shaker', 'Hi-Hat', shaker({ decay: 0.09, bp: 6500, attack: 0.02, level: 0.45 }), 0.15, false, 'drake'],
    ['dk_perc', 'Wood Tick', 'Perc', tom({ f0: 780, f1: 740, decay: 0.06, level: 0.5, type: 'triangle', click: 0.2 }), 0.12, false, 'drake'],
    ['dk_rev', 'Reverse Swell', 'FX', crash({ decay: 1.1, hp: 2500, tune: 0.9 }), 1.2, true, 'drake'],
    // A$AP pack extra
    ['jbx_scratch', 'Vinyl Scratch', 'FX', (ctx, out, t) => { const n = noiseSrc(ctx, t, 0.4); const bp = filter(ctx, 'bandpass', 900, 3); [0, 0.07, 0.14, 0.21].forEach((d, i) => bp.frequency.setValueAtTime(i % 2 ? 2600 : 700, t + d)); [0.07, 0.14, 0.21, 0.28].forEach((d, i) => bp.frequency.linearRampToValueAtTime(i % 2 ? 700 : 2600, t + d)); const g = gain(ctx, 0); decay(g.gain, t, 0.9, 0.3, 0.01); chain(n, bp, gain(ctx, 3), g, out); }, 0.4, false, 'jbx'],
    ['jbx_crash', 'Jukebox Dusty Crash', 'FX', crash({ decay: 1.3, hp: 3000, tune: 1.1 }), 1.5, false, 'jbx'],
  ].map(([id, name, cat, fn, len, rev, kit]) => ({ id, name, cat, fn, len, rev: !!rev, kit: kit || null }));

  // Pack variations: every BeatLab Pack gets a full kit of alternates (punchier, longer, darker, brighter...)
  const KIT_FAMILIES = {
    msb: { label: 'Yeat', kick: { f0: 230, f1: 50, decay: 0.32, pitchDecay: 0.03, click: 1, drive: 0.9 }, snare: { tone: 220, toneGain: 0.6, toneDecay: 0.08, noiseGain: 0.9, noiseDecay: 0.15, hp: 1800, peak: 5500, drive: 0.7 },
      clap: { decay: 0.17, bp: 1600, spread: 0.009 }, hat: { decay: 0.03, hp: 9000, metal: 0.9, tune: 1.4, level: 0.65 }, perc: { f0: 1320, f1: 1300, decay: 0.2, type: 'square' } },
    drake: { label: 'OVO', kick: { f0: 120, f1: 44, decay: 0.42, pitchDecay: 0.06, click: 0.15, lp: 1200, body: 0.2 }, snare: { tone: 260, toneGain: 0.3, toneDecay: 0.05, noiseGain: 0.5, noiseDecay: 0.09, hp: 2500, peak: 6000, lp: 9000 },
      clap: { decay: 0.3, bp: 1150, spread: 0.013, lp: 6000 }, hat: { decay: 0.04, hp: 7000, metal: 0.3, lp: 11000, level: 0.45 }, perc: { f0: 780, f1: 740, decay: 0.06, type: 'triangle' } },
    jbx: { label: 'Dusty', kick: { f0: 135, f1: 50, decay: 0.34, pitchDecay: 0.05, click: 0.3, drive: 0.4, lp: 2200, body: 0.45 }, snare: { tone: 175, toneGain: 0.75, toneDecay: 0.14, noiseGain: 0.75, noiseDecay: 0.26, hp: 800, peak: 2800, drive: 0.45, lp: 5500 },
      clap: { decay: 0.22, bp: 1000, lp: 3000 }, hat: { decay: 0.07, hp: 4500, metal: 0.35, lp: 8000, level: 0.5 }, perc: { f0: 420, f1: 330, decay: 0.18, type: 'sine' } },
    fev: { label: 'Fever', kick: { f0: 140, f1: 46, decay: 0.5, pitchDecay: 0.07, click: 0.35 }, snare: { tone: 280, toneGain: 0.35, toneDecay: 0.05, noiseGain: 0.7, noiseDecay: 0.1, hp: 3000, peak: 8000 },
      clap: { decay: 0.2, bp: 1500, spread: 0.01 }, hat: { decay: 0.022, hp: 10000, metal: 0.25, noise: 0.9, level: 0.6 }, perc: { f0: 1100, f1: 1050, decay: 0.08, type: 'sine' } },
  };
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  Object.entries(KIT_FAMILIES).forEach(([kit, f]) => {
    const add = (id, name, cat, fn, len, rev) => DRUMS.push({ id: `${kit}_${id}`, name: `${f.label} ${name}`, cat, fn, len, rev: !!rev, kit });
    [['Kick Punch', 1.15, 0.8, 0.15], ['Kick Long', 0.95, 1.5, 0], ['Kick Dirty', 1.05, 1, 0.35], ['Kick Soft', 0.85, 1.1, -0.3]].forEach(([n, fm, dm, drv], i) =>
      add('kv' + i, n, 'Kick', kick(Object.assign({}, f.kick, { f0: f.kick.f0 * fm, decay: f.kick.decay * dm, drive: clamp01((f.kick.drive || 0) + drv) })), f.kick.decay * dm + 0.25));
    [['Snare Tight', 1.15, 0.7], ['Snare Fat', 0.85, 1.4], ['Snare Crack', 1.3, 0.9]].forEach(([n, tm, dm], i) =>
      add('sv' + i, n, 'Snare', snare(Object.assign({}, f.snare, { tone: f.snare.tone * tm, noiseDecay: f.snare.noiseDecay * dm, toneDecay: f.snare.toneDecay * dm })), f.snare.noiseDecay * dm + 0.2));
    [['Clap Short', 0.7], ['Clap Big', 1.6]].forEach(([n, dm], i) => add('cv' + i, n, 'Clap', clap(Object.assign({}, f.clap, { decay: f.clap.decay * dm })), f.clap.decay * dm + 0.2));
    add('cv2', 'Clap + Snare', 'Clap', layer(clap(f.clap), snare(f.snare)), 0.4);
    [['Hat Tick', 0.6, 1.1], ['Hat Bright', 1, 1.25], ['Hat Dark', 1.3, 0.8]].forEach(([n, dm, tm], i) =>
      add('hv' + i, n, 'Hi-Hat', hat(Object.assign({}, f.hat, { decay: f.hat.decay * dm, tune: (f.hat.tune || 1) * tm })), 0.12));
    [['Open Hat', 8], ['Open Hat Long', 16]].forEach(([n, dm], i) => add('ov' + i, n, 'Open Hat', hat(Object.assign({}, f.hat, { decay: f.hat.decay * dm, level: 0.45 })), f.hat.decay * dm + 0.1));
    [['Perc High', 1.5], ['Perc', 1], ['Perc Low', 0.6]].forEach(([n, pm], i) =>
      add('pv' + i, n, 'Perc', tom({ f0: f.perc.f0 * pm, f1: f.perc.f1 * pm, decay: f.perc.decay, level: 0.6, type: f.perc.type, click: 0.25 }), f.perc.decay + 0.1));
    add('fx0', 'Riser', 'FX', riser({ from: 400, to: 10000, dur: 1.6 }), 1.7);
    add('fx1', 'Down Sweep', 'FX', riser({ from: 9000, to: 200, dur: 1 }), 1.1);
    add('fx2', 'Reverse Crash', 'FX', crash({ decay: 1.2, hp: 3500 }), 1.3, true);
  });

  const DRUM_BY_ID = Object.fromEntries(DRUMS.map((d) => [d.id, d]));
  const DRUM_CATS = ['Kick', 'Snare', 'Clap', 'Hi-Hat', 'Open Hat', 'Perc', 'FX'];

  async function renderOffline(len, channels, build) {
    const ctx = new OfflineAudioContext(channels, Math.ceil(SR * len), SR);
    const out = ctx.createGain();
    out.connect(ctx.destination);
    build(ctx, out);
    return ctx.startRendering();
  }

  const drumBuffers = {};
  async function renderDrums() {
    await Promise.all(
      DRUMS.map(async (d) => {
        const buf = await renderOffline(d.len, 1, (ctx, out) => d.fn(ctx, out, 0.001));
        const data = buf.getChannelData(0);
        // normalise each sound so the library is evenly loud
        let peak = 0;
        for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
        if (peak > 0) for (let i = 0; i < data.length; i++) data[i] *= 0.9 / peak;
        if (d.rev) data.reverse();
        drumBuffers[d.id] = buf;
      })
    );
    return drumBuffers;
  }

  // ---------- melodic instruments (live) ----------
  /** each play() returns the node the caller should fade to silence for a choke */
  function adsr(param, t, dur, a, d, s, r, peak) {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + a);
    param.exponentialRampToValueAtTime(Math.max(0.0001, peak * s), t + a + d);
    const end = Math.max(t + a + 0.01, t + dur);
    param.setValueAtTime(Math.max(0.0001, peak * s), end);
    param.exponentialRampToValueAtTime(0.0001, end + r);
    return end + r;
  }
  function decayingAdsr(param, t, dur, a, decayLen, r, peak) {
    // piano-like: decays while held, releases when let go
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + a);
    param.setTargetAtTime(0.0001, t + a, decayLen / 4);
    const end = Math.max(t + a + 0.01, t + dur);
    param.setTargetAtTime(0.0001, end, r / 4);
    return end + r;
  }

  // ---------- physically modelled instruments (rendered per pitch, cached) ----------
  const modelCache = new Map();
  function pianoBuffer(ctx, f) {
    const sr = ctx.sampleRate, key = 'p' + sr + ':' + f.toFixed(2);
    if (modelCache.has(key)) return modelCache.get(key);
    const T0 = Math.max(1.6, Math.min(9, 6 * Math.pow(261.6 / f, 0.45)));
    const secs = Math.min(5.5, T0 + 0.8), len = Math.floor(sr * secs);
    const L = new Float32Array(len), R = new Float32Array(len);
    const B = 0.00028 * Math.pow(f / 261.6, 0.6); // string stiffness: upper partials run a little sharp, like a real piano
    const nMax = Math.min(28, Math.floor((sr * 0.45) / f));
    for (let n = 1; n <= nMax; n++) {
      const fn = n * f * Math.sqrt(1 + B * n * n);
      if (fn > 9000) break;
      const a = Math.pow(n, -1.15) * Math.exp(-fn / 2600) * (n === 1 ? 1 : 0.9);
      const Tn = T0 / (1 + 0.45 * (n - 1));
      for (const [cents, pan] of [[-0.9, -0.35], [0.9, 0.35]]) {
        const w = (2 * Math.PI * fn * Math.pow(2, cents / 1200)) / sr;
        let c = Math.cos(w), sn = Math.sin(w), x = 1, y = 0;
        const d1 = Math.exp(-1 / (Tn * 0.22 * sr)), d2 = Math.exp(-1 / (Tn * sr));
        let e1 = a * 0.65, e2 = a * 0.35;
        const gl = 0.5 - pan * 0.5, gr = 0.5 + pan * 0.5;
        for (let i = 0; i < len; i++) {
          const val = y * (e1 + e2);
          L[i] += val * gl; R[i] += val * gr;
          const nx = x * c - y * sn; y = x * sn + y * c; x = nx;
          e1 *= d1; e2 *= d2;
          if ((i & 4095) === 0) { const m = Math.hypot(x, y); x /= m; y /= m; }
        }
      }
    }
    // felt hammer: a short, dark thump
    let lp = 0;
    for (let i = 0; i < Math.min(len, sr * 0.04); i++) { lp += 0.08 * ((Math.random() * 2 - 1) - lp); const e = Math.exp(-i / (sr * 0.008)) * 0.5; L[i] += lp * e; R[i] += lp * e; }
    // fade the very end, normalise
    let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
    const fadeN = Math.floor(sr * 0.3);
    for (let i = 0; i < len; i++) { const g = (0.45 / (pk || 1)) * (i > len - fadeN ? (len - i) / fadeN : 1); L[i] *= g; R[i] *= g; }
    const buf = ctx.createBuffer(2, len, sr);
    buf.getChannelData(0).set(L); buf.getChannelData(1).set(R);
    modelCache.set(key, buf);
    return buf;
  }
  function stringBuffer(ctx, f) {
    const sr = ctx.sampleRate, key = 's' + sr + ':' + f.toFixed(2);
    if (modelCache.has(key)) return modelCache.get(key);
    const secs = Math.max(1.5, Math.min(4, 3.2 * Math.pow(196 / f, 0.5))), len = Math.floor(sr * secs);
    const out = new Float32Array(len);
    const P = sr / f - 0.5; // the averaging filter adds half a sample of delay
    const N = Math.ceil(P) + 2, line = new Float32Array(N + 4);
    // a soft pluck: low-passed noise with a pluck-position notch
    const burst = new Float32Array(N); let lp = 0;
    for (let i = 0; i < N; i++) { lp += 0.45 * ((Math.random() * 2 - 1) - lp); burst[i] = lp; }
    const pos = Math.max(1, Math.round(N * 0.18));
    for (let i = 0; i < N; i++) line[i] = burst[i] - 0.6 * (burst[(i + pos) % N]);
    const T60 = secs * 1.4, loss = Math.pow(10, -3 / (T60 * f)); // per round trip
    const size = line.length;
    let w = N % size, prev = 0;
    const frac = P - Math.floor(P);
    for (let i = 0; i < len; i++) {
      const r1 = (w - Math.floor(P) + size * 4) % size, r0 = (r1 - 1 + size) % size;
      const delayed = line[r1] * (1 - frac) + line[r0] * frac;
      const yv = loss * 0.5 * (delayed + prev);
      prev = delayed;
      line[w] = yv; out[i] = yv;
      w = (w + 1) % size;
    }
    // first period comes straight from the pluck
    let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(out[i]));
    const fadeN = Math.floor(sr * 0.2);
    for (let i = 0; i < len; i++) out[i] *= (0.5 / (pk || 1)) * (i > len - fadeN ? (len - i) / fadeN : 1);
    const buf = ctx.createBuffer(1, len, sr);
    buf.getChannelData(0).set(out);
    modelCache.set(key, buf);
    return buf;
  }

  const INSTRUMENTS = {
    piano: {
      name: 'Grand Keys', cat: 'Keys', base: 60,
      play(ctx, out, f, t, dur, v) {
        const amp = gain(ctx, 0);
        const end = decayingAdsr(amp.gain, t, dur, 0.004, 2.4, 0.35, v * 0.5);
        const lp = filter(ctx, 'lowpass', 1200, 0.5);
        lp.frequency.setValueAtTime(Math.min(9000, f * 10), t);
        lp.frequency.setTargetAtTime(Math.min(4000, f * 4), t, 0.3);
        chain(lp, amp, out);
        [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12], [1.002, 'sine', 0.4]].forEach(([m, type, a]) => {
          chain(osc(ctx, type, f * m, t, end - t), gain(ctx, a), lp);
        });
        return { node: amp, end };
      },
    },
    rhodes: {
      name: 'Soul Rhodes', cat: 'Keys', base: 60,
      play(ctx, out, f, t, dur, v) {
        const amp = gain(ctx, 0);
        const end = decayingAdsr(amp.gain, t, dur, 0.005, 3, 0.4, v * 0.5);
        amp.connect(out);
        const car = osc(ctx, 'sine', f, t, end - t);
        const mod = osc(ctx, 'sine', f, t, end - t);
        const idx = gain(ctx, f * 1.4);
        idx.gain.setValueAtTime(f * 1.4, t);
        idx.gain.setTargetAtTime(f * 0.15, t, 0.15);
        chain(mod, idx, car.frequency);
        const trem = osc(ctx, 'sine', 4.5, t, end - t);
        const tg = gain(ctx, 0.12);
        const tremAmp = gain(ctx, 0.88);
        chain(trem, tg, tremAmp.gain);
        chain(car, tremAmp, amp);
        const tine = osc(ctx, 'sine', f * 7, t, 0.3);
        const tineG = gain(ctx, 0);
        decay(tineG.gain, t, 0.08, 0.12);
        chain(tine, tineG, amp);
        return { node: amp, end };
      },
    },
    organ: {
      name: 'Gospel Organ', cat: 'Keys', base: 60,
      play(ctx, out, f, t, dur, v) {
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.01, 0.05, 1, 0.08, v * 0.18);
        amp.connect(out);
        const vib = osc(ctx, 'sine', 6.2, t, end - t);
        const vg = gain(ctx, 6);
        vib.connect(vg);
        [[0.5, 0.6], [1, 1], [2, 0.7], [3, 0.35], [4, 0.3], [6, 0.12]].forEach(([m, a]) => {
          const o = osc(ctx, 'sine', f * m, t, end - t);
          vg.connect(o.detune);
          chain(o, gain(ctx, a), amp);
        });
        return { node: amp, end };
      },
    },
    pad: {
      name: 'Dark Pad', cat: 'Pads', base: 60,
      play(ctx, out, f, t, dur, v) {
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.35, 0.4, 0.8, 0.9, v * 0.16);
        const lp = filter(ctx, 'lowpass', 900, 1.5);
        lp.frequency.setValueAtTime(400, t);
        lp.frequency.linearRampToValueAtTime(1600, t + 0.8);
        chain(lp, amp, out);
        [-9, 0, 9].forEach((d) => {
          const o = osc(ctx, 'sawtooth', f, t, end - t);
          o.detune.value = d;
          o.connect(lp);
        });
        chain(osc(ctx, 'sine', f / 2, t, end - t), gain(ctx, 0.6), lp);
        return { node: amp, end };
      },
    },
    strings: {
      name: 'Movie Strings', cat: 'Pads', base: 60,
      play(ctx, out, f, t, dur, v) {
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.18, 0.3, 0.85, 0.6, v * 0.14);
        const lp = filter(ctx, 'lowpass', Math.min(5000, f * 6), 0.7);
        chain(lp, filter(ctx, 'peaking', 2500, 1), amp, out);
        const vib = osc(ctx, 'sine', 5.5, t, end - t);
        const vg = gain(ctx, 0);
        vg.gain.setValueAtTime(0, t);
        vg.gain.linearRampToValueAtTime(10, t + 0.6);
        vib.connect(vg);
        [-12, -4, 5, 12].forEach((d) => {
          const o = osc(ctx, 'sawtooth', f, t, end - t);
          o.detune.value = d;
          vg.connect(o.detune);
          o.connect(lp);
        });
        return { node: amp, end };
      },
    },
    choir: {
      name: 'Soul Choir', cat: 'Pads', base: 60,
      play(ctx, out, f, t, dur, v) {
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.15, 0.2, 0.9, 0.5, v * 0.35);
        amp.connect(out);
        formantVoice(ctx, amp, f, t, end - t, 'a', 0.5, true);
        const b = formantVoice(ctx, amp, f * 1.004, t, end - t, 'o', 0.35, true);
        void b;
        return { node: amp, end };
      },
    },
    pluck: {
      name: 'Pluck', cat: 'Synths', base: 60,
      play(ctx, out, f, t, dur, v) {
        const amp = gain(ctx, 0);
        const end = decayingAdsr(amp.gain, t, dur, 0.003, 0.7, 0.15, v * 0.3);
        const lp = filter(ctx, 'lowpass', 400, 4);
        lp.frequency.setValueAtTime(Math.min(12000, f * 16), t);
        lp.frequency.setTargetAtTime(f * 1.5, t, 0.08);
        chain(lp, amp, out);
        osc(ctx, 'sawtooth', f, t, end - t).connect(lp);
        chain(osc(ctx, 'square', f * 1.005, t, end - t), gain(ctx, 0.5), lp);
        return { node: amp, end };
      },
    },
    guitar: {
      name: 'Nylon Guitar', cat: 'Keys', base: 48,
      play(ctx, out, f, t, dur, v) {
        const amp = gain(ctx, 0);
        const end = decayingAdsr(amp.gain, t, dur, 0.002, 1.6, 0.25, v * 0.45);
        const lp = filter(ctx, 'lowpass', 400, 1);
        lp.frequency.setValueAtTime(Math.min(8000, f * 12), t);
        lp.frequency.setTargetAtTime(f * 2.5, t, 0.12);
        chain(lp, filter(ctx, 'peaking', 2800, 2), amp, out);
        chain(osc(ctx, 'triangle', f, t, end - t), lp);
        chain(osc(ctx, 'sawtooth', f, t, end - t), gain(ctx, 0.25), lp);
        const n = noiseSrc(ctx, t, 0.02);
        const ng = gain(ctx, 0);
        decay(ng.gain, t, 0.25, 0.01);
        chain(n, filter(ctx, 'bandpass', f * 3, 2), ng, amp);
        return { node: amp, end };
      },
    },
    bell: {
      name: 'Dark Bell', cat: 'Bells', base: 72,
      play(ctx, out, f, t, dur, v) {
        const amp = gain(ctx, 0);
        const end = decayingAdsr(amp.gain, t, Math.max(dur, 0.6), 0.002, 2.5, 0.8, v * 0.35);
        amp.connect(out);
        const car = osc(ctx, 'sine', f, t, end - t);
        const mod = osc(ctx, 'sine', f * 3.5, t, end - t);
        const idx = gain(ctx, f * 2);
        idx.gain.setValueAtTime(f * 2.5, t);
        idx.gain.setTargetAtTime(f * 0.2, t, 0.4);
        chain(mod, idx, car.frequency);
        chain(car, amp);
        return { node: amp, end };
      },
    },
    musicbox: {
      name: 'Music Box', cat: 'Bells', base: 72,
      play(ctx, out, f, t, dur, v) {
        const amp = gain(ctx, 0);
        const end = decayingAdsr(amp.gain, t, Math.max(dur, 0.8), 0.002, 1.3, 0.6, v * 0.3);
        amp.connect(out);
        chain(osc(ctx, 'sine', f, t, end - t), amp);
        chain(osc(ctx, 'sine', f * 4, t, end - t), gain(ctx, 0.25), amp);
        chain(osc(ctx, 'sine', f * 6.01, t, end - t), gain(ctx, 0.08), amp);
        return { node: amp, end };
      },
    },
    flute: {
      name: 'Drill Flute', cat: 'Leads', base: 72,
      play(ctx, out, f, t, dur, v) {
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.06, 0.1, 0.85, 0.15, v * 0.3);
        amp.connect(out);
        const o = osc(ctx, 'sine', f, t, end - t);
        const vib = osc(ctx, 'sine', 5.3, t, end - t);
        const vg = gain(ctx, 0);
        vg.gain.setValueAtTime(0, t);
        vg.gain.linearRampToValueAtTime(f * 0.012, t + 0.35);
        chain(vib, vg, o.frequency);
        chain(o, amp);
        chain(osc(ctx, 'triangle', f * 2, t, end - t), gain(ctx, 0.12), amp);
        const n = noiseSrc(ctx, t, end - t);
        chain(n, filter(ctx, 'bandpass', f * 2, 6), gain(ctx, 0.35), amp);
        return { node: amp, end };
      },
    },
    rage: {
      name: 'Rage Lead', cat: 'Leads', base: 60,
      play(ctx, out, f, t, dur, v) {
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.004, 0.15, 0.75, 0.12, v * 0.12);
        const lp = filter(ctx, 'lowpass', 7000, 0.8);
        const pre = gain(ctx, 0.5);
        chain(pre, shaper(ctx, 0.25), lp, amp, out);
        [-28, -14, -5, 0, 6, 15, 27].forEach((d) => {
          const o = osc(ctx, 'sawtooth', f, t, end - t);
          o.detune.value = d;
          o.connect(pre);
        });
        chain(osc(ctx, 'square', f / 2, t, end - t), gain(ctx, 0.5), pre);
        return { node: amp, end };
      },
    },
    brass: {
      name: 'Soul Horns', cat: 'Leads', base: 60,
      play(ctx, out, f, t, dur, v) {
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.04, 0.15, 0.7, 0.12, v * 0.2);
        const lp = filter(ctx, 'lowpass', 600, 2);
        lp.frequency.setValueAtTime(f * 1.5, t);
        lp.frequency.linearRampToValueAtTime(Math.min(6000, f * 8), t + 0.06);
        lp.frequency.setTargetAtTime(f * 4, t + 0.08, 0.2);
        chain(lp, amp, out);
        [-6, 6].forEach((d) => {
          const o = osc(ctx, 'sawtooth', f, t, end - t);
          o.detune.value = d;
          o.connect(lp);
        });
        return { node: amp, end };
      },
    },
    synthkeys: {
      name: 'Pluggnb Keys', cat: 'Synths', base: 60,
      play(ctx, out, f, t, dur, v) {
        const amp = gain(ctx, 0);
        const end = decayingAdsr(amp.gain, t, dur, 0.01, 1.8, 0.4, v * 0.32);
        const lp = filter(ctx, 'lowpass', Math.min(4000, f * 5), 0.5);
        chain(lp, amp, out);
        chain(osc(ctx, 'square', f, t, end - t), gain(ctx, 0.35), lp);
        chain(osc(ctx, 'sine', f * 2, t, end - t), gain(ctx, 0.4), lp);
        chain(osc(ctx, 'triangle', f * 0.5, t, end - t), gain(ctx, 0.6), lp);
        return { node: amp, end };
      },
    },
    tonka: {
      name: 'Rage Bell', cat: 'Leads', base: 72,
      play(ctx, out, f, t, dur, v) {
        // bright FM bell with a detuned saw body: the shiny rage "bell synth"
        const amp = gain(ctx, 0);
        const end = decayingAdsr(amp.gain, t, Math.max(dur, 0.35), 0.002, 1.6, 0.35, v * 0.3);
        amp.connect(out);
        const car = osc(ctx, 'sine', f, t, end - t);
        const mod = osc(ctx, 'sine', f * 2, t, end - t);
        const idx = gain(ctx, f * 3);
        idx.gain.setValueAtTime(f * 3, t);
        idx.gain.setTargetAtTime(f * 0.6, t, 0.12);
        chain(mod, idx, car.frequency);
        chain(car, amp);
        const body = gain(ctx, 0.18);
        chain(body, filter(ctx, 'lowpass', Math.min(9000, f * 6), 0.7), amp);
        [-9, 9].forEach((d) => { const o = osc(ctx, 'sawtooth', f, t, end - t); o.detune.value = d; o.connect(body); });
        return { node: amp, end };
      },
    },
    airpad: {
      name: 'Air Pad', cat: 'Pads', base: 60,
      play(ctx, out, f, t, dur, v) {
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.25, 0.3, 0.8, 0.8, v * 0.13);
        const lp = filter(ctx, 'lowpass', Math.min(7000, f * 8), 0.4);
        chain(lp, amp, out);
        const lfo = osc(ctx, 'sine', 0.3, t, end - t);
        const lg = gain(ctx, 6);
        lfo.connect(lg);
        [-14, -5, 5, 14].forEach((d) => { const o = osc(ctx, 'triangle', f * (d > 10 ? 2 : 1), t, end - t); o.detune.value = d; lg.connect(o.detune); o.connect(lp); });
        const n = noiseSrc(ctx, t, end - t);
        chain(n, filter(ctx, 'bandpass', f * 4, 3), gain(ctx, 0.25), lp);
        return { node: amp, end };
      },
    },
    bigbell: {
      name: 'Big Tonka Bell', cat: 'Bells', base: 60,
      play(ctx, out, f, t, dur, v) {
        // a big cast bell: hum an octave under the note, prime, the minor-third "tierce" that makes it sound like a
        // bell, quint, nominal and upper partials, each ringing for its own time, with slow beating; a heavy low strike.
        const amp = gain(ctx, v * 0.5);
        const tone = filter(ctx, 'lowpass', 6000, 0.4);
        chain(amp, tone, out);
        const partials = [[0.5, 0.7, 5.5], [1, 0.6, 3.6], [1.2, 0.45, 2.6], [1.5, 0.28, 2], [2, 0.6, 2.8], [2.5, 0.2, 1.2], [3, 0.32, 1.3], [4.2, 0.22, 0.8], [5.4, 0.12, 0.5]];
        const ringEnd = t + Math.max(5.6, dur + 1);
        partials.forEach(([r, a, d], i) => {
          const p = ctx.createStereoPanner ? ctx.createStereoPanner() : gain(ctx, 1);
          if (p.pan) p.pan.value = ((i % 3) - 1) * 0.45;
          const g = gain(ctx, 0);
          decay(g.gain, t, a, d, 0.002);
          chain(g, p, amp);
          // two sines a hair apart per partial = the slow "wah-wah" beating of a real bell
          [-0.6, 0.6].forEach((beat) => chain(osc(ctx, 'sine', f * r + beat * r, t, d * 2.2 + 0.1), gain(ctx, 0.5), g));
        });
        const th = osc(ctx, 'sine', f * 2, t, 0.25);
        th.frequency.exponentialRampToValueAtTime(f * 0.5, t + 0.08);
        const tg = gain(ctx, 0);
        decay(tg.gain, t, 0.9, 0.12, 0.001);
        chain(th, tg, amp);
        const n = noiseSrc(ctx, t, 0.06);
        const ng = gain(ctx, 0);
        decay(ng.gain, t, 0.35, 0.03, 0.0005);
        chain(n, filter(ctx, 'bandpass', 1800, 1.2), ng, amp);
        return { node: amp, end: ringEnd };
      },
    },
    vwow: {
      name: 'Vwow Bass', cat: 'Synths', base: 36,
      play(ctx, out, f, t, dur, v) {
        // the Fever "vwow": every note swells in (~110 ms) while its filter and an "ow" vowel open, then the
        // filter sinks back while the note holds. Written on quarter notes it pumps once per beat like the record.
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.004, 0.15, 0.85, 0.03, v * 0.42);
        const lp = filter(ctx, 'lowpass', 200, 4);
        lp.frequency.setValueAtTime(Math.max(140, f * 1.5), t);
        lp.frequency.exponentialRampToValueAtTime(Math.min(4500, f * 11), t + 0.12);
        lp.frequency.exponentialRampToValueAtTime(Math.max(200, f * 3), t + 0.45);
        const ow = filter(ctx, 'bandpass', 400, 2.5);
        ow.frequency.setValueAtTime(260, t);
        ow.frequency.exponentialRampToValueAtTime(640, t + 0.12);
        ow.frequency.exponentialRampToValueAtTime(340, t + 0.45);
        const owg = gain(ctx, 1.4);
        chain(lp, amp, out);
        chain(ow, owg, amp);
        // the swoop: every oscillator starts ~17 semitones up and dives onto the note (Fever: ~125 Hz -> 44 Hz in 0.15 s)
        const swoop = (o) => { o.frequency.setValueAtTime(f * 3.3, t); o.frequency.exponentialRampToValueAtTime(f * 1.3, t + 0.035); o.frequency.exponentialRampToValueAtTime(f, t + 0.09); return o; };
        [-9, 9].forEach((det) => {
          const o = swoop(osc(ctx, 'sawtooth', f, t, end - t));
          o.detune.value = det;
          o.connect(lp); o.connect(ow);
        });
        chain(swoop(osc(ctx, 'square', f, t, end - t)), gain(ctx, 0.3), lp);
        const body = gain(ctx, 0);
        decay(body.gain, t, 0.9, 0.12, 0.003);
        body.gain.setValueAtTime(0.0001, end);
        chain(swoop(osc(ctx, 'sine', f, t, end - t)), body, amp);
        chain(swoop(osc(ctx, 'sine', f, t, end - t)), gain(ctx, 0.5), amp);
        if (f > 70) chain(swoop(osc(ctx, 'sine', f / 2, t, end - t)), gain(ctx, 0.5), amp);
        chain(swoop(osc(ctx, 'sine', f * 2, t, end - t)), gain(ctx, 0.8), amp);
        return { node: amp, end };
      },
    },
    vwowlead: {
      name: 'Vwow Chords', cat: 'Synths', base: 60,
      play(ctx, out, f, t, dur, v) {
        // bright detuned stab that swells in and sinks a little in pitch while it holds
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.04, 0.2, 0.55, 0.08, v * 0.3);
        const lp = filter(ctx, 'lowpass', 900, 3);
        lp.frequency.setValueAtTime(700, t);
        lp.frequency.exponentialRampToValueAtTime(Math.min(5000, f * 5), t + 0.08);
        lp.frequency.exponentialRampToValueAtTime(Math.max(450, f * 2), t + 0.4);
        chain(lp, amp, out);
        // mostly clean triangle tone (the record's stabs are thin, not buzzy), a little saw for edge
        [[-6, 'triangle', 1], [6, 'triangle', 1], [0, 'sawtooth', 0.25]].forEach(([det, type, lvl]) => {
          const o = osc(ctx, type, f, t, end - t);
          const og = gain(ctx, lvl);
          o.connect(og); og.connect(lp);
          o.detune.setValueAtTime(det, t);
          o.detune.linearRampToValueAtTime(det - 25, end);
        });
        return { node: amp, end };
      },
    },
    strobe: {
      name: 'Strobe Arp', cat: 'Synths', base: 72,
      play(ctx, out, f, t, dur, v) {
        // flashing-lights arp: a glassy pluck that jumps left/right every note, with a bright glint on top
        const step = Math.round(t * 8);
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : gain(ctx, 1);
        if (pan.pan) pan.pan.value = [-0.75, 0.75, -0.35, 0.35][step % 4];
        const amp = gain(ctx, 0);
        decay(amp.gain, t, v * 0.16, Math.min(0.32, dur + 0.12), 0.002);
        const lp = filter(ctx, 'lowpass', 1200, 4);
        lp.frequency.setValueAtTime(Math.min(4000, f * 5), t);
        lp.frequency.exponentialRampToValueAtTime(Math.max(500, f * 1.3), t + 0.15);
        chain(lp, amp, pan, out);
        [[-6, 'triangle', 0.8], [6, 'sawtooth', 0.3]].forEach(([det, type, lvl]) => { const o = osc(ctx, type, f, t, 0.5); o.detune.value = det; chain(o, gain(ctx, lvl), lp); });
        const gl = gain(ctx, 0); decay(gl.gain, t, v * 0.015, 0.06, 0.001);
        chain(osc(ctx, 'sine', f * 4, t, 0.2), gl, pan);
        return { node: amp, end: t + 0.5 };
      },
    },
    feltpiano: {
      name: 'Felt Piano', cat: 'Keys', base: 60,
      // a piano built like one: struck strings with slightly stretched overtones, two strings per note beating against each
      // other, a quick first decay then a long singing tail, a soft felt hammer thump. Rendered once per pitch, then cached.
      play(ctx, out, f, t, dur, v) {
        const buf = pianoBuffer(ctx, f);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const amp = gain(ctx, 0);
        amp.gain.setValueAtTime(v * 0.9, t);
        const off = t + dur + 0.05;
        amp.gain.setValueAtTime(v * 0.9, off);
        amp.gain.setTargetAtTime(0, off, 0.35); // the damper comes down gently (soft pedal feel)
        const tone = filter(ctx, 'lowpass', 900 + v * 3800, 0.5); // softer touch = darker, like real felt
        chain(src, tone, amp, out);
        src.start(t);
        const end = Math.min(t + buf.duration, off + 1.6);
        src.stop(end);
        return { node: amp, end };
      },
    },
    nylon: {
      name: 'Nylon Guitar', cat: 'Keys', base: 48,
      // plucked-string model (Karplus-Strong): a soft pluck travels up and down a string that loses its brightness as it rings
      play(ctx, out, f, t, dur, v) {
        const buf = stringBuffer(ctx, f);
        const src = ctx.createBufferSource(); src.buffer = buf;
        const amp = gain(ctx, v * 0.8);
        const body = filter(ctx, 'peaking', 190, 1.2, 5), body2 = filter(ctx, 'peaking', 420, 1.5, 2.5);
        const off = t + Math.max(dur, 0.6);
        amp.gain.setValueAtTime(v * 0.8, off);
        amp.gain.setTargetAtTime(0, off, 0.3);
        chain(src, body, body2, amp, out);
        src.start(t);
        const end = Math.min(t + buf.duration, off + 1.2);
        src.stop(end);
        return { node: amp, end };
      },
    },
    drunk: {
      name: 'Drunk Synth', cat: 'Leads', base: 60,
      play(ctx, out, f, t, dur, v) {
        // half-conscious lead: uneven wobble (two slow LFOs that never line up), slurred glides between notes,
        // held notes sag flat as they fade, a slow left/right swirl, all under a warm filter so it never gets whiny
        const me = INSTRUMENTS.drunk;
        const prev = me._last && t - me._last.end < 0.08 && t >= me._last.t ? me._last.f : 0;
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, prev ? 0.04 : 0.09, 0.4, 0.82, 0.8, v * 0.09);
        const lp = filter(ctx, 'lowpass', 1900, 1.1);
        lp.frequency.setValueAtTime(Math.min(3200, f * 5), t);
        lp.frequency.exponentialRampToValueAtTime(Math.min(2200, Math.max(1000, f * 3)), t + 0.5);
        const swirl = ctx.createStereoPanner ? ctx.createStereoPanner() : gain(ctx, 1);
        chain(lp, amp, swirl, out);
        const life = end - t + 0.15;
        if (swirl.pan) { const sp = osc(ctx, 'sine', 0.13, t, life), sg = gain(ctx, 0.55); sp.connect(sg); sg.connect(swirl.pan); }
        const w1 = osc(ctx, 'sine', 0.23, t, life), w1g = gain(ctx, 22); w1.connect(w1g);
        const w2 = osc(ctx, 'sine', 0.37, t, life), w2g = gain(ctx, 14); w2.connect(w2g);
        const sag = Math.min(dur, 0.45);
        [[-12, 'sawtooth', 0.45], [12, 'sawtooth', 0.45], [0, 'triangle', 0.9], [-1200, 'sine', 0.35]].forEach(([det, type, lvl]) => {
          const o = osc(ctx, type, f, t, life);
          o.detune.value = det;
          w1g.connect(o.detune); w2g.connect(o.detune);
          if (prev) { o.frequency.setValueAtTime(prev, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.16); }
          else { o.frequency.setValueAtTime(f * 0.97, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.1); }
          // the sag: as the note lets go it slides ~40 cents flat, like it's slipping away
          o.frequency.setValueAtTime(f, Math.max(t + 0.17, t + dur - sag));
          o.frequency.exponentialRampToValueAtTime(f * 0.977, end);
          chain(o, gain(ctx, lvl), lp);
        });
        me._last = { f, t, end: t + dur };
        return { node: amp, end };
      },
    },
    dream: {
      name: 'Dream Synth', cat: 'Leads', base: 60,
      play(ctx, out, f, t, dur, v) {
        // lush, blurry lead: detuned saw pairs spread wide, a slow seasick wobble plus vibrato, glides from the last note
        // (or a small scoop up into it), and a long tail so the notes melt together
        const me = INSTRUMENTS.dream;
        const prev = me._last && t - me._last.end < 0.06 && t >= me._last.t ? me._last.f : 0;
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, prev ? 0.02 : 0.035, 0.35, 0.8, 0.65, v * 0.085);
        const lp = filter(ctx, 'lowpass', 2600, 0.9);
        lp.frequency.setValueAtTime(Math.min(5000, f * 7), t);
        lp.frequency.exponentialRampToValueAtTime(Math.min(3200, Math.max(1400, f * 4)), t + 0.4);
        chain(lp, amp, out);
        const wob = osc(ctx, 'sine', 0.35, t, end - t + 0.1), wg = gain(ctx, 9); wob.connect(wg);
        const vib = osc(ctx, 'sine', 5, t, end - t + 0.1), vg = gain(ctx, 0); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(9, t + 0.45); vib.connect(vg);
        const voices = [[-11, -0.85, 'sawtooth', 0.5], [11, 0.85, 'sawtooth', 0.5], [-4, -0.35, 'sawtooth', 0.45], [4, 0.35, 'sawtooth', 0.45], [0, 0, 'triangle', 0.9]];
        voices.forEach(([det, pn, type, lvl]) => {
          const o = osc(ctx, type, f, t, end - t + 0.1);
          o.detune.value = det;
          wg.connect(o.detune); vg.connect(o.detune);
          if (prev) { o.frequency.setValueAtTime(prev, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.09); }
          else { o.frequency.setValueAtTime(f * 0.944, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.07); }
          const p = ctx.createStereoPanner ? ctx.createStereoPanner() : gain(ctx, 1);
          if (p.pan) p.pan.value = pn;
          chain(o, gain(ctx, lvl), p, lp);
        });
        me._last = { f, t, end: t + dur };
        return { node: amp, end };
      },
    },
    glow: {
      name: 'Glow Pluck', cat: 'Keys', base: 60,
      play(ctx, out, f, t, dur, v) {
        // a glowing chord pluck that keeps ringing (~1.5 s) and alternates sides: the shimmer under the melody
        const step = Math.round(t * 4);
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : gain(ctx, 1);
        if (pan.pan) pan.pan.value = step % 2 ? 0.55 : -0.55;
        const amp = gain(ctx, 0);
        decay(amp.gain, t, v * 0.11, 1.5, 0.004);
        const lp = filter(ctx, 'lowpass', 2000, 1.2);
        lp.frequency.setValueAtTime(Math.min(7000, f * 9), t);
        lp.frequency.exponentialRampToValueAtTime(Math.max(700, f * 2), t + 0.6);
        chain(lp, amp, pan, out);
        [[-7, 'sawtooth', 0.45], [7, 'sawtooth', 0.45], [0, 'triangle', 0.8]].forEach(([det, type, lvl]) => { const o = osc(ctx, type, f, t, 1.9); o.detune.value = det; chain(o, gain(ctx, lvl), lp); });
        chain(osc(ctx, 'sine', f * 2, t, 1.2), gain(ctx, 0.25), lp);
        return { node: amp, end: t + 1.9 };
      },
    },
    hum: {
      name: 'Warm Hum Lead', cat: 'Leads', base: 60,
      play(ctx, out, f, t, dur, v) {
        // a warm, closed-mouth "mmm": strong fundamental, soft rounded overtones, a nasal glow around 300 Hz,
        // gentle vibrato, and a short release so notes never drag
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.025, 0.18, 0.72, 0.12, v * 0.3);
        const lp = filter(ctx, 'lowpass', Math.min(2400, f * 5), 0.5);
        const nasal = filter(ctx, 'peaking', 300, 1.4, 4);
        chain(lp, nasal, amp, out);
        const vib = osc(ctx, 'sine', 5.2, t, end - t + 0.05), vg = gain(ctx, 0);
        vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.005, t + Math.min(0.5, dur));
        vib.connect(vg);
        [['sine', 1, 1, 0], ['triangle', 1, 0.45, 4], ['sine', 2, 0.18, -3], ['sawtooth', 1, 0.07, -6]].forEach(([type, mul, lvl, det]) => {
          const o = osc(ctx, type, f * mul, t, end - t + 0.05);
          o.detune.value = det;
          vg.connect(o.frequency);
          chain(o, gain(ctx, lvl), lp);
        });
        return { node: amp, end };
      },
    },
    euphoria: {
      name: 'Euphoria Supersaw', cat: 'Leads', base: 60,
      play(ctx, out, f, t, dur, v) {
        // seven detuned saws spread across the stereo field: the big, rushing, euphoric layer
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.04, 0.25, 0.7, 0.2, v * 0.075);
        const lp = filter(ctx, 'lowpass', 2000, 0.6);
        lp.frequency.setValueAtTime(Math.min(4200, f * 6), t);
        lp.frequency.exponentialRampToValueAtTime(Math.min(2600, Math.max(900, f * 3)), t + 0.3);
        const hp = filter(ctx, 'highpass', 180, 0.7);
        chain(lp, hp, amp, out);
        [-28, -17, -8, 0, 8, 17, 28].forEach((det, i) => {
          const o = osc(ctx, 'sawtooth', f, t, end - t + 0.05);
          o.detune.value = det;
          const p = ctx.createStereoPanner ? ctx.createStereoPanner() : gain(ctx, 1);
          if (p.pan) p.pan.value = (i - 3) / 3.4;
          chain(o, p, lp);
        });
        return { node: amp, end };
      },
    },
    velvet: {
      name: 'Velvet Night Pad', cat: 'Pads', base: 60,
      play(ctx, out, f, t, dur, v) {
        // dark, slow-breathing pad: detuned saws through a resonant low-pass that drifts open and shut (purple/blue)
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.6, 0.4, 0.85, 1.2, v * 0.11);
        const lp = filter(ctx, 'lowpass', 900, 5);
        lp.frequency.setValueAtTime(500, t);
        lp.frequency.linearRampToValueAtTime(1600, t + Math.min(2, dur));
        const lfo = osc(ctx, 'sine', 0.18, t, end - t + 0.1), lg = gain(ctx, 450);
        lfo.connect(lg); lg.connect(lp.frequency);
        const hp = filter(ctx, 'highpass', 120, 0.7);
        chain(lp, hp, amp, out);
        [-14, -5, 5, 14].forEach((det, i) => {
          const o = osc(ctx, 'sawtooth', f, t, end - t + 0.1);
          o.detune.value = det;
          const p = ctx.createStereoPanner ? ctx.createStereoPanner() : gain(ctx, 1);
          if (p.pan) p.pan.value = [-0.8, -0.3, 0.3, 0.8][i];
          chain(o, p, lp);
        });
        chain(osc(ctx, 'triangle', f / 2, t, end - t + 0.1), gain(ctx, 0.5), lp);
        return { node: amp, end };
      },
    },
    squarelead: {
      name: 'Square Glide Lead', cat: 'Leads', base: 60,
      play(ctx, out, f, t, dur, v) {
        // hollow square lead (strong odd harmonics, weak even ones, as measured) that slides from the previous note
        const me = INSTRUMENTS.squarelead;
        const prev = me._last && t - me._last.end < 0.04 && t >= me._last.t ? me._last.f : 0;
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, prev ? 0.002 : 0.01, 0.2, 0.8, 0.05, v * 0.17);
        const lp = filter(ctx, 'lowpass', Math.min(9000, f * 7), 0.7);
        chain(lp, amp, out);
        [[-5, 'square', 1], [5, 'square', 0.8], [0, 'triangle', 0.6]].forEach(([det, type, lvl]) => {
          const o = osc(ctx, type, f, t, end - t);
          o.detune.value = det;
          if (prev) { o.frequency.setValueAtTime(prev, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.06); }
          const og = gain(ctx, lvl);
          o.connect(og); og.connect(lp);
        });
        // slight late vibrato on held notes
        if (dur > 0.4) { const l = osc(ctx, 'sine', 5.5, t, end - t); const lg = gain(ctx, 0); lg.gain.setValueAtTime(0, t + 0.25); lg.gain.linearRampToValueAtTime(f * 0.006, t + 0.5); l.connect(lg); }
        me._last = { f, t, end: t + dur };
        return { node: amp, end };
      },
    },
    droplead: {
      name: 'Drop Synth', cat: 'Synths', base: 60,
      play(ctx, out, f, t, dur, v) {
        // the breakdown synth in Fever: every note slides straight down ~19 semitones a second
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.005, 0.1, 0.75, 0.04, v * 0.22);
        const lp = filter(ctx, 'lowpass', Math.min(6000, f * 8), 1.5);
        chain(lp, amp, out);
        const len = end - t;
        [-8, 8].forEach((det) => {
          const o = osc(ctx, det < 0 ? 'sawtooth' : 'square', f, t, len);
          o.detune.value = det;
          o.frequency.setValueAtTime(f, t);
          o.frequency.exponentialRampToValueAtTime(f * Math.pow(2, (-19 * len) / 12), end);
          o.connect(lp);
        });
        return { node: amp, end };
      },
    },
    yeatbell: {
      name: 'Tonka Bell (small)', cat: 'Bells', base: 72,
      play(ctx, out, f, t, dur, v) {
        // struck bell: harmonic FM body + tubular-bell partials (2.76x, 5.4x, 8.93x) that die faster,
        // a metal strike, two voices detuned +-7 cents and spread L/R, tone rolled off at ~4.5 kHz like the record
        const len = Math.max(dur, 0.5);
        const amp = gain(ctx, 0);
        const end = decayingAdsr(amp.gain, t, len, 0.0015, 2.8, 1.1, v * 0.42);
        const tone = filter(ctx, 'lowpass', 4600, 0.5);
        chain(amp, tone, out);
        [[-7, -0.55], [7, 0.55]].forEach(([det, pan]) => {
          const p = ctx.createStereoPanner ? ctx.createStereoPanner() : gain(ctx, 1);
          if (p.pan) p.pan.value = pan;
          const bus = gain(ctx, 0.5);
          chain(bus, p, amp);
          const car = osc(ctx, 'sine', f, t, end - t);
          car.detune.value = det;
          const mod = osc(ctx, 'sine', f, t, end - t);
          mod.detune.value = det;
          const idx = gain(ctx, f * 1.6);
          idx.gain.setValueAtTime(f * 1.6, t);
          idx.gain.setTargetAtTime(f * 0.35, t, 0.25);
          chain(mod, idx, car.frequency);
          chain(car, bus);
        });
        [[2.76, 0.42, 0.7], [5.4, 0.22, 0.32], [8.93, 0.1, 0.16], [2, 0.18, 1.6]].forEach(([r, a, d]) => {
          const o = osc(ctx, 'sine', f * r, t, d * 3 + 0.1);
          const og = gain(ctx, 0);
          decay(og.gain, t, a, d, 0.001);
          chain(o, og, amp);
        });
        const n = noiseSrc(ctx, t, 0.04);
        const ng = gain(ctx, 0);
        decay(ng.gain, t, 0.25, 0.02, 0.0005);
        chain(n, filter(ctx, 'bandpass', Math.min(9000, f * 4), 2), ng, amp);
        return { node: amp, end };
      },
    },
    trumpet: {
      name: 'Trumpet', cat: 'Brass', base: 60,
      play(ctx, out, f, t, dur, v) {
        // brass: two saws through a swelling filter, a lip "scoop" into the note, delayed vibrato, breath noise
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.035, 0.15, 0.78, 0.12, v * 0.24);
        const lp = filter(ctx, 'lowpass', f * 2, 1.4);
        lp.frequency.setValueAtTime(f * 1.5, t);
        lp.frequency.exponentialRampToValueAtTime(Math.min(7000, f * 8), t + 0.07);
        lp.frequency.setTargetAtTime(Math.min(5000, f * 5), t + 0.08, 0.15);
        chain(lp, filter(ctx, 'peaking', 1250, 1.2), filter(ctx, 'peaking', 2600, 1.5), amp, out);
        const vib = osc(ctx, 'sine', 5.6, t, end - t);
        const vg = gain(ctx, 0);
        vg.gain.setValueAtTime(0, t);
        vg.gain.setValueAtTime(0, t + 0.25);
        vg.gain.linearRampToValueAtTime(f * 0.006, t + 0.6);
        vib.connect(vg);
        [0, 6].forEach((det) => {
          const o = osc(ctx, 'sawtooth', f, t, end - t);
          o.detune.value = det;
          o.frequency.setValueAtTime(f * 0.94, t);
          o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
          vg.connect(o.frequency);
          o.connect(lp);
        });
        const n = noiseSrc(ctx, t, end - t);
        const ng = gain(ctx, 0);
        adsr(ng.gain, t, dur, 0.02, 0.1, 0.4, 0.1, 0.05);
        chain(n, filter(ctx, 'bandpass', 2300, 2), ng, amp);
        return { node: amp, end };
      },
    },
    hornsec: {
      name: 'Horn Section', cat: 'Brass', base: 60,
      play(ctx, out, f, t, dur, v) {
        // three trumpets a few cents apart, spread across the stereo field, plus a trombone an octave down
        const bus = gain(ctx, 1);
        bus.connect(out);
        let last = null;
        [[-9, -0.5, 1], [0, 0, 1], [8, 0.5, 1], [0, 0, 0.5]].forEach(([det, pan, oct], i) => {
          const p = ctx.createStereoPanner ? ctx.createStereoPanner() : gain(ctx, 1);
          if (p.pan) p.pan.value = pan;
          const g2 = gain(ctx, i === 3 ? 0.55 : 0.5);
          chain(g2, p, bus);
          const ff = f * oct * Math.pow(2, det / 1200);
          last = INSTRUMENTS.trumpet.play(ctx, g2, ff, t + i * 0.004, dur, v);
        });
        return { node: bus, end: last.end };
      },
    },
    darkpad: {
      name: 'OVO Pad', cat: 'Pads', base: 60,
      play(ctx, out, f, t, dur, v) {
        // dark, underwater pad: detuned saws behind a low, slowly moving filter, plus a sub octave
        const amp = gain(ctx, 0);
        const end = adsr(amp.gain, t, dur, 0.6, 0.5, 0.85, 1.4, v * 0.17);
        const lp = filter(ctx, 'lowpass', 700, 0.9);
        const lfo = osc(ctx, 'sine', 0.13, t, end - t);
        const lg = gain(ctx, 260);
        chain(lfo, lg, lp.frequency);
        chain(lp, amp, out);
        [[-8, -0.6], [0, 0], [8, 0.6]].forEach(([det, pan]) => {
          const p = ctx.createStereoPanner ? ctx.createStereoPanner() : gain(ctx, 1);
          if (p.pan) p.pan.value = pan;
          const o = osc(ctx, 'sawtooth', f, t, end - t);
          o.detune.value = det;
          chain(o, p, lp);
        });
        chain(osc(ctx, 'sine', f / 2, t, end - t), gain(ctx, 0.7), lp);
        return { node: amp, end };
      },
    },
    mutedkeys: {
      name: 'Muted Keys', cat: 'Keys', base: 60,
      play(ctx, out, f, t, dur, v) {
        // electric piano heard through a wall: the Rhodes, filtered low, with a slow tremolo
        const lp = filter(ctx, 'lowpass', 1300, 0.6);
        const g2 = gain(ctx, 1.3);
        chain(g2, lp, out);
        return INSTRUMENTS.rhodes.play(ctx, g2, f, t, dur, v);
      },
    },
    bassgtr: {
      name: 'Bass Guitar', cat: '808 & Bass', base: 36,
      play(ctx, out, f, t, dur, v) {
        // electric bass: plucked, round, no sub rumble; lives around 70-250 Hz like a soul record
        const amp = gain(ctx, 0);
        const end = decayingAdsr(amp.gain, t, dur, 0.004, 1.4, 0.08, v * 0.55);
        const lp = filter(ctx, 'lowpass', 400, 1.2);
        lp.frequency.setValueAtTime(f * 7, t);
        lp.frequency.setTargetAtTime(f * 2.5, t, 0.09);
        chain(lp, amp, out);
        chain(osc(ctx, 'triangle', f, t, end - t), lp);
        chain(osc(ctx, 'sawtooth', f, t, end - t), gain(ctx, 0.35), lp);
        const n = noiseSrc(ctx, t, 0.02);
        const ng = gain(ctx, 0);
        decay(ng.gain, t, 0.3, 0.012, 0.0005);
        chain(n, filter(ctx, 'bandpass', f * 6, 2), ng, amp);
        return { node: amp, end };
      },
    },
    // ---- 808s: mono, with glide; handled specially by the engine ----
    b808: { name: '808 Clean', cat: '808 & Bass', base: 36, bass: true, drive: 0.05, punch: 1.4, len: 1.6 },
    b808punch: { name: '808 Punchy', cat: '808 & Bass', base: 36, bass: true, drive: 0.35, punch: 2.2, len: 1.1 },
    b808dist: { name: '808 Distorted', cat: '808 & Bass', base: 36, bass: true, drive: 0.9, punch: 2, len: 1.5 },
    b808longold: { name: '808 Long (Soft)', cat: '808 & Bass', base: 36, bass: true, drive: 0.15, punch: 1.3, len: 3 },
    b808yeat: { name: '808 Rage (Yeat)', cat: '808 & Bass', base: 36, bass: true, drive: 0.85, asym: 0, punch: 2.4, len: 0.6, click: 0.35, warm: 0.25 },
    b808gods: { name: '808 Short & Dirty', cat: '808 & Bass', base: 36, bass: true, drive: 1, asym: 0.9, punch: 1.8, len: 0.42, lp: 2600, warm: 0.7 },
    b808long: { name: '808 Long Warm', cat: '808 & Bass', base: 36, bass: true, drive: 0.8, asym: 0.9, punch: 1.6, len: 2.1, warm: 0.6 },
    feverbass: { name: 'Sliding Bass', cat: '808 & Bass', base: 36, bass: true, sustain: true, drive: 0.25, asym: 0.4, punch: 1, len: 0, warm: 0.1, lp: 1600 },
    b808hard: { name: '808 Blown Out', cat: '808 & Bass', base: 36, bass: true, drive: 1, punch: 2.6, len: 1.2 },
    sub: { name: 'Smooth Sub', cat: '808 & Bass', base: 36, bass: true, drive: 0, punch: 1, len: 0, sustain: true },
    reese: { name: 'Reese Bass', cat: '808 & Bass', base: 36, bass: true, drive: 0.3, punch: 1, len: 0, sustain: true, reese: true },
  };

  /** play an 808/bass note. prevFreq = glide from that pitch. */
  function play808(ctx, out, inst, f, t, dur, v, prevFreq) {
    const amp = gain(ctx, 0);
    const end = t + Math.max(dur, 0.05) + (inst.sustain ? 0.08 : 0);
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(v * 0.9, t + 0.004);
    if (inst.sustain) {
      amp.gain.setValueAtTime(v * 0.9, end - 0.08);
      amp.gain.exponentialRampToValueAtTime(0.0001, end);
    } else {
      amp.gain.setTargetAtTime(0.0001, t + 0.05, inst.len / 3.5);
      amp.gain.setTargetAtTime(0.0001, t + dur, 0.04);
    }
    const lp = filter(ctx, 'lowpass', inst.reese ? 900 : inst.lp || 5000, 0.6);
    const pre = gain(ctx, 1);
    if (inst.drive > 0) chain(pre, shaper(ctx, inst.drive, inst.asym), filter(ctx, 'highpass', 22, 0.7), gain(ctx, 1 - inst.drive * 0.35), lp);
    else chain(pre, lp);
    chain(lp, amp, out);
    if (inst.warm) chain(osc(ctx, 'triangle', f * 2, t, Math.max(dur, 0.1) + 0.3), gain(ctx, inst.warm), lp);
    if (inst.click) {
      const n = noiseSrc(ctx, t, 0.03);
      const ng = gain(ctx, 0);
      decay(ng.gain, t, inst.click * v, 0.012, 0.0005);
      chain(n, filter(ctx, 'bandpass', 1800, 1), ng, out);
    }
    const stopT = end + (inst.sustain ? 0.05 : inst.len + 0.2);
    const types = inst.reese ? [['sawtooth', -12], ['sawtooth', 12]] : [['sine', 0]];
    for (const [type, det] of types) {
      const o = osc(ctx, type, f, t, stopT - t);
      o.detune.value = det;
      if (prevFreq) {
        o.frequency.setValueAtTime(prevFreq, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
      } else if (inst.punch > 1) {
        o.frequency.setValueAtTime(f * inst.punch, t);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.045);
      }
      o.connect(pre);
    }
    if (inst.reese) chain(osc(ctx, 'sine', f, t, stopT - t), gain(ctx, 0.8), lp);
    return { node: amp, end: stopT };
  }

  function playNote(ctx, out, instId, midi, t, dur, v, prevMidi) {
    const inst = INSTRUMENTS[instId] || INSTRUMENTS.piano;
    const f = BL.theory.midiToFreq(midi);
    if (inst.bass) return play808(ctx, out, inst, f, t, dur, v, prevMidi != null ? BL.theory.midiToFreq(prevMidi) : 0);
    return inst.play(ctx, out, f, t, dur, v);
  }

  // ---------- built-in "records" to sample (rendered on demand) ----------
  function vinyl(ctx, out, len, amount) {
    const b = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.004;
      if (Math.random() < 0.0004) d[i] += (Math.random() * 2 - 1) * 0.5;
    }
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.start(0);
    chain(s, filter(ctx, 'highpass', 900), gain(ctx, amount), out);
  }

  /** chord list: [beatStart, beatLen, degrees[]] ; plays an instrument over a progression */
  function progressionRender(ctx, out, spec) {
    const beat = 60 / spec.bpm;
    const sc = spec.scale;
    for (const ev of spec.events) {
      const [b, len, degs, vel, inst] = ev;
      for (const d of degs) {
        const midi = spec.base + spec.root + BL.theory.degreeToSemi(d, sc);
        playNote(ctx, out, inst || spec.inst, midi, 0.01 + b * beat, len * beat, vel || 0.8);
      }
    }
  }

  const chordEvents = (degs, beatsEach, extra) =>
    degs.map((d, i) => [i * beatsEach, beatsEach * 0.96, BL.theory.chordDegrees(d, extra ? 4 : 3)]);

  const BUILTIN_SAMPLES = [
    {
      id: 'soul_keys', name: 'Dusty Soul Keys', desc: 'Rhodes chords off a dusty record', bpm: 68, root: 2, scale: 'minor', bars: 2,
      build(ctx, out, s) {
        const lp = chain(filter(ctx, 'lowpass', 3800, 0.7), gain(ctx, 1));
        lp.connect(out);
        progressionRender(ctx, lp, { bpm: s.bpm, root: s.root, scale: s.scale, base: 48, inst: 'rhodes',
          events: [...chordEvents([0, 5, 2, 6], 2, true), [0, 8, [-7], 0.6, 'sub']] });
        progressionRender(ctx, lp, { bpm: s.bpm, root: s.root, scale: s.scale, base: 60, inst: 'rhodes',
          events: [[0.5, 0.5, [4]], [1, 0.5, [2]], [2.5, 0.5, [5]], [4.5, 0.5, [4]], [5.5, 0.5, [6]], [6.5, 1, [7]]] });
        vinyl(ctx, out, 8, 1);
      },
    },
    {
      id: 'soul_choir', name: 'Soul Choir "Ooh"', desc: 'Gospel-style voices, perfect to pitch up', bpm: 70, root: 5, scale: 'major', bars: 2,
      build(ctx, out, s) {
        progressionRender(ctx, out, { bpm: s.bpm, root: s.root, scale: s.scale, base: 60, inst: 'choir',
          events: chordEvents([0, 3, 5, 4], 2) });
        progressionRender(ctx, out, { bpm: s.bpm, root: s.root, scale: s.scale, base: 72, inst: 'choir',
          events: [[0, 1.5, [4]], [1.5, 0.5, [2]], [2, 2, [3]], [4, 1, [2]], [5, 1, [0]], [6, 2, [1]]] });
        vinyl(ctx, out, 8, 0.8);
      },
    },
    {
      id: 'vintage_strings', name: 'Vintage Strings', desc: 'Dramatic orchestra swell', bpm: 72, root: 0, scale: 'minor', bars: 2,
      build(ctx, out, s) {
        progressionRender(ctx, out, { bpm: s.bpm, root: s.root, scale: s.scale, base: 60, inst: 'strings',
          events: [...chordEvents([0, 5, 3, 4], 2), [0, 8, [-7], 0.5, 'strings']] });
        vinyl(ctx, out, 8, 0.6);
      },
    },
    {
      id: 'gospel_organ', name: 'Church Organ', desc: 'Sunday-morning organ chords', bpm: 76, root: 3, scale: 'major', bars: 2,
      build(ctx, out, s) {
        progressionRender(ctx, out, { bpm: s.bpm, root: s.root, scale: s.scale, base: 60, inst: 'organ',
          events: [...chordEvents([0, 3, 1, 4], 2, true), [0, 2, [-7]], [2, 2, [-4]], [4, 2, [-6]], [6, 2, [-3]]] });
        vinyl(ctx, out, 8, 0.7);
      },
    },
    {
      id: 'soul_horns', name: 'Soul Horn Stabs', desc: 'Punchy brass hits from a 70s record', bpm: 92, root: 10, scale: 'mixolydian', bars: 2,
      build(ctx, out, s) {
        const ev = [];
        [[0, 0.5, 0], [0.75, 0.25, 0], [1.5, 0.5, 3], [3, 1, 4], [4, 0.5, 0], [4.75, 0.25, 0], [5.5, 0.5, 6], [6.5, 1.5, 4]].forEach(([b, l, d]) =>
          ev.push([b, l, BL.theory.chordDegrees(d)]));
        progressionRender(ctx, out, { bpm: s.bpm, root: s.root, scale: s.scale, base: 60, inst: 'brass', events: ev });
        vinyl(ctx, out, 6, 0.7);
      },
    },
    {
      id: 'lofi_guitar', name: 'Lo-Fi Guitar', desc: 'Jazzy nylon-string chords', bpm: 80, root: 9, scale: 'dorian', bars: 2,
      build(ctx, out, s) {
        const ev = [];
        [[0, 3], [2, 6], [4, 1], [6, 4]].forEach(([b, d]) => {
          BL.theory.chordDegrees(d, 4).forEach((n, i) => ev.push([b + i * 0.06, 1.9 - i * 0.06, [n]]));
          ev.push([b + 1, 0.9, [d + 4]]);
        });
        progressionRender(ctx, out, { bpm: s.bpm, root: s.root, scale: s.scale, base: 48, inst: 'guitar', events: ev });
        vinyl(ctx, out, 6.5, 0.9);
      },
    },
    {
      id: 'dark_bells', name: 'Dark Bells', desc: 'Haunting trap bell melody', bpm: 140, root: 7, scale: 'harmonicMinor', bars: 2,
      build(ctx, out, s) {
        const mel = [[0, 7], [1, 9], [1.5, 8], [2, 7], [3, 4], [4, 7], [5, 9], [5.5, 10], [6, 9], [7, 6]];
        progressionRender(ctx, out, { bpm: s.bpm, root: s.root, scale: s.scale, base: 60, inst: 'bell',
          events: mel.map(([b, d]) => [b, 0.5, [d]]) });
        progressionRender(ctx, out, { bpm: s.bpm, root: s.root, scale: s.scale, base: 48, inst: 'pad',
          events: [[0, 4, [0, 2, 4], 0.6], [4, 4, [5, 7, 9], 0.6]] });
      },
    },
    {
      id: 'rage_arp', name: 'Rage Synth Arp', desc: 'Bright supersaw arpeggio', bpm: 150, root: 6, scale: 'minor', bars: 2,
      build(ctx, out, s) {
        const pat = [0, 4, 7, 4, 9, 7, 4, 2];
        const ev = [];
        for (let i = 0; i < 16; i++) ev.push([i * 0.5, 0.45, [pat[i % 8] + (i >= 8 ? -2 : 0)]]);
        progressionRender(ctx, out, { bpm: s.bpm, root: s.root, scale: s.scale, base: 60, inst: 'rage', events: ev });
      },
    },
    {
      id: 'drill_flute', name: 'Drill Flute', desc: 'Sliding, sinister flute line', bpm: 142, root: 4, scale: 'harmonicMinor', bars: 2,
      build(ctx, out, s) {
        const mel = [[0, 1, 4], [1, 0.5, 5], [1.5, 1.5, 6], [3, 1, 4], [4, 1, 2], [5, 0.5, 3], [5.5, 0.5, 2], [6, 2, 0]];
        progressionRender(ctx, out, { bpm: s.bpm, root: s.root, scale: s.scale, base: 72, inst: 'flute',
          events: mel.map(([b, l, d]) => [b, l, [d]]) });
      },
    },
    {
      id: 'jukebox_soul', name: 'Jukebox Soul', desc: 'A soul record: Rhodes, a horn section and a high "ooh" vocal, made to be sped up', bpm: 60, root: 7, scale: 'minor', bars: 2,
      build(ctx, out, s) {
        const lp = chain(filter(ctx, 'lowpass', 5200, 0.6), filter(ctx, 'highpass', 90, 0.7), gain(ctx, 1));
        lp.connect(out);
        progressionRender(ctx, lp, { bpm: s.bpm, root: s.root, scale: s.scale, base: 60, inst: 'rhodes',
          events: chordEvents([0, 3, 1, 4], 2, true) });
        progressionRender(ctx, lp, { bpm: s.bpm, root: s.root, scale: s.scale, base: 60, inst: 'hornsec',
          events: [[1.5, 0.4, [4, 6, 9], 0.8], [3.5, 0.4, [3, 5, 7], 0.8], [5.5, 0.4, [4, 6, 8], 0.8], [6.5, 1.2, [4, 7, 9], 0.9]] });
        const beat = 60 / s.bpm;
        [[0.25, 1.25, 4, 'o'], [2, 1, 3, 'u'], [3, 0.75, 2, 'o'], [4.25, 1.5, 4, 'a'], [6, 2, 5, 'o']].forEach(([bb, l, d, vw]) => {
          const f = BL.theory.midiToFreq(67 + s.root + BL.theory.degreeToSemi(d, s.scale) - 12);
          const tt = 0.02 + bb * beat;
          const g = gain(ctx, 0);
          adsr(g.gain, tt, l * beat * 0.9, 0.08, 0.1, 0.85, 0.2, 0.75);
          g.connect(lp);
          formantVoice(ctx, g, f, tt, l * beat + 0.25, vw, 0.5, true);
        });
        vinyl(ctx, out, 8.2, 1.2);
      },
    },
    {
      id: 'vocal_ahh', name: 'Vocal "Ahh" Phrase', desc: 'Sung vowel melody — chop it up', bpm: 75, root: 11, scale: 'minor', bars: 2,
      build(ctx, out, s) {
        const beat = 60 / s.bpm;
        const mel = [[0, 1.5, 4, 'a'], [1.5, 0.5, 3, 'o'], [2, 2, 2, 'a'], [4, 1, 0, 'e'], [5, 1, 2, 'a'], [6, 2, 4, 'o']];
        for (const [b, l, d, vw] of mel) {
          const f = BL.theory.midiToFreq(60 + s.root + BL.theory.degreeToSemi(d, s.scale));
          const t = 0.02 + b * beat;
          const g = gain(ctx, 0);
          adsr(g.gain, t, l * beat * 0.95, 0.06, 0.1, 0.9, 0.15, 0.8);
          g.connect(out);
          formantVoice(ctx, g, f, t, l * beat + 0.2, vw, 0.5, true);
        }
        vinyl(ctx, out, 7, 0.5);
      },
    },
  ];
  const SAMPLE_BY_ID = Object.fromEntries(BUILTIN_SAMPLES.map((s) => [s.id, s]));

  const sampleBuffers = {};
  async function renderSample(id) {
    if (sampleBuffers[id]) return sampleBuffers[id];
    const s = SAMPLE_BY_ID[id];
    const len = (60 / s.bpm) * 4 * s.bars;
    const buf = await renderOffline(len + 0.05, 2, (ctx, out) => {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 3;
      chain(out, comp);
      comp.connect(ctx.destination);
      out.disconnect(ctx.destination);
      s.build(ctx, out, s);
    });
    // normalise
    let peak = 0;
    for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    }
    if (peak > 0) for (let c = 0; c < buf.numberOfChannels; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] *= 0.85 / peak;
    }
    sampleBuffers[id] = buf;
    return buf;
  }

  BL.sounds = {
    SR, DRUMS, DRUM_BY_ID, DRUM_CATS, drumBuffers, renderDrums,
    INSTRUMENTS, playNote, BUILTIN_SAMPLES, SAMPLE_BY_ID, renderSample,
    helpers: { noiseSrc, osc, gain, filter, shaper, chain },
  };
})(typeof window !== 'undefined' ? window : globalThis);
