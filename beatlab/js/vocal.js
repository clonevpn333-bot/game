/* BeatLab — one-click vocal clean-up.
 * Pitch correction (YIN pitch tracking + PSOLA re-pitching to the song's key), a soft noise gate, then a vocal chain:
 * rumble cut, de-mud, presence, air, de-ess, compression, a short plate reverb and loudness. Everything is offline. */
(function (root) {
  const BL = (root.BL = root.BL || {});

  /** YIN pitch track on a decimated copy. returns { hop, f0: Float32Array (0 = unvoiced), rms } at the original rate */
  function trackPitch(x, sr) {
    const D = Math.max(1, Math.round(sr / 11025)), dsr = sr / D;
    // one-pole high-pass (80 Hz) + simple low-pass (1.5 kHz) while decimating
    const n = Math.floor(x.length / D), y = new Float32Array(n);
    let hp = 0, prev = 0, lp = 0;
    const aH = Math.exp((-2 * Math.PI * 80) / sr), aL = 1 - Math.exp((-2 * Math.PI * 1500) / sr);
    for (let i = 0, j = 0; i < x.length; i++) {
      hp = aH * (hp + x[i] - prev); prev = x[i];
      lp += aL * (hp - lp);
      if (i % D === 0 && j < n) y[j++] = lp;
    }
    const W = 512, hop = 128, minL = Math.floor(dsr / 900), maxL = Math.ceil(dsr / 70);
    const frames = Math.max(0, Math.floor((n - W - maxL) / hop));
    const f0 = new Float32Array(frames), rms = new Float32Array(frames), d = new Float32Array(maxL + 1);
    for (let k = 0; k < frames; k++) {
      const s = k * hop;
      let e = 0; for (let i = 0; i < W; i++) e += y[s + i] * y[s + i];
      rms[k] = Math.sqrt(e / W);
      let run = 0, best = -1;
      for (let l = 1; l <= maxL; l++) {
        let sum = 0; for (let i = 0; i < W; i++) { const q = y[s + i] - y[s + i + l]; sum += q * q; }
        run += sum; d[l] = (sum * l) / (run || 1);
      }
      for (let l = minL; l < maxL; l++) if (d[l] < 0.15 && d[l] <= d[l + 1]) { best = l; break; }
      if (best > 0) { // parabolic refine
        const a = d[best - 1], b = d[best], c = d[best + 1];
        const off = (a - c) / (2 * (a - 2 * b + c) || 1);
        f0[k] = dsr / (best + (Math.abs(off) < 1 ? off : 0));
      }
    }
    // voice only where there is level; drop single-frame blips
    let mx = 0; for (const v of rms) mx = Math.max(mx, v);
    for (let k = 0; k < frames; k++) if (rms[k] < mx * 0.04) f0[k] = 0;
    for (let k = 1; k < frames - 1; k++) if (f0[k] && !f0[k - 1] && !f0[k + 1]) f0[k] = 0;
    return { hop: hop * D, f0, rms, W: W * D };
  }

  /** target midi for every voiced frame: snap to the key's scale after removing the singer's overall detune */
  function targets(f0, key, steps, strength) {
    const m = Array.from(f0, (f) => (f ? 69 + 12 * Math.log2(f / 440) : NaN));
    // the singer's overall detune (circular mean of cents) so a voice that sits 40 cents sharp lands on notes, not between them
    let cs = 0, sn = 0, cnt = 0;
    m.forEach((v) => { if (!isNaN(v)) { const a = 2 * Math.PI * (v - Math.round(v)); cs += Math.cos(a); sn += Math.sin(a); cnt++; } });
    // only trust it when the voice is consistently off by the same amount (wobbly singers average out to noise)
    const R = cnt ? Math.hypot(cs, sn) / cnt : 0;
    const detune = R > 0.55 ? Math.atan2(sn, cs) / (2 * Math.PI) : 0;
    const allowed = new Set(steps.map((s) => (((s + key) % 12) + 12) % 12));
    const out = new Float32Array(m.length);
    let held = NaN;
    for (let k = 0; k < m.length; k++) {
      if (isNaN(m[k])) { out[k] = 0; held = NaN; continue; }
      const v = m[k] - detune;
      // nearest allowed note, with a little hysteresis so vibrato does not flip between notes
      let best = NaN, bd = 99;
      for (let n = Math.floor(v) - 2; n <= Math.ceil(v) + 2; n++) if (allowed.has(((n % 12) + 12) % 12) && Math.abs(n - v) < bd) { bd = Math.abs(n - v); best = n; }
      if (!isNaN(held) && Math.abs(v - held) < 0.75 && allowed.has(((held % 12) + 12) % 12)) best = held;
      held = best;
      out[k] = (best - m[k]) * strength; // semitones of correction
    }
    // retune speed: smooth the correction (~35 ms) so it glides like a natural voice, not a robot
    const a = 0.45;
    for (let k = 1; k < out.length; k++) if (out[k] && out[k - 1]) out[k] = out[k - 1] + a * (out[k] - out[k - 1]);
    return { corr: out, detune };
  }

  /** PSOLA: re-pitch voiced parts by corr (semitones per frame) while keeping timing */
  function psola(x, sr, tr, corr) {
    const N = x.length, out = new Float32Array(N), wsum = new Float32Array(N);
    const frameAt = (i) => Math.min(tr.f0.length - 1, Math.max(0, Math.floor((i - tr.W / 2) / tr.hop)));
    const periodAt = (i) => { const f = tr.f0[frameAt(i)]; return f ? sr / f : 0; };
    // analysis marks, snapped to the waveform peak of each period
    const marks = [];
    let t = 0;
    while (t < N) {
      const P = periodAt(t) || Math.round(sr * 0.006);
      let best = Math.round(t), bv = -1;
      if (periodAt(t)) for (let i = Math.max(0, Math.round(t - P / 3)); i < Math.min(N, t + P / 3); i++) if (Math.abs(x[i]) > bv) { bv = Math.abs(x[i]); best = i; }
      if (marks.length && best <= marks[marks.length - 1] + P * 0.5) best = Math.round(marks[marks.length - 1] + P);
      marks.push(best);
      t = Math.round(best + P);
    }
    let ts = 0, mi = 0;
    while (ts < N) {
      while (mi < marks.length - 1 && Math.abs(marks[mi + 1] - ts) < Math.abs(marks[mi] - ts)) mi++;
      const m0 = Math.round(marks[mi]), P = Math.max(16, Math.round(periodAt(m0) || sr * 0.006));
      const c = periodAt(m0) ? corr[frameAt(m0)] || 0 : 0;
      const r = Math.pow(2, c / 12);
      for (let i = -P; i < P; i++) {
        const src = m0 + i, dst = Math.round(ts) + i;
        if (src < 0 || src >= N || dst < 0 || dst >= N) continue;
        const w = 0.5 + 0.5 * Math.cos((Math.PI * i) / P);
        out[dst] += x[src] * w; wsum[dst] += w;
      }
      ts += P / r;
    }
    for (let i = 0; i < N; i++) out[i] = wsum[i] > 0.05 ? out[i] / wsum[i] : x[i];
    return out;
  }

  /** soft gate: pulls room noise between phrases down ~24 dB */
  function gate(x, sr) {
    const w = Math.round(sr * 0.01), n = Math.ceil(x.length / w), lv = new Float32Array(n);
    for (let k = 0; k < n; k++) { let e = 0; for (let i = k * w; i < Math.min(x.length, (k + 1) * w); i++) e += x[i] * x[i]; lv[k] = Math.sqrt(e / w); }
    const sorted = Array.from(lv).sort((a, b) => a - b);
    const floor = sorted[Math.floor(n * 0.1)] || 0, peak = sorted[Math.floor(n * 0.98)] || 1;
    const thr = Math.max(floor * 3, peak * 0.03);
    const g = new Float32Array(n);
    let hold = 0, cur = 0;
    for (let k = 0; k < n; k++) {
      const open = lv[k] > thr;
      if (open) hold = 12; else if (hold > 0) hold--;
      const want = open || hold > 0 ? 1 : 0.06;
      cur += (want - cur) * (want > cur ? 0.7 : 0.12);
      g[k] = cur;
    }
    const out = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) { const k = i / w, a = Math.floor(k), b = Math.min(n - 1, a + 1); out[i] = x[i] * (g[a] + (g[b] - g[a]) * (k - a)); }
    return out;
  }

  function plateIR(ctx, secs) {
    const sr = ctx.sampleRate, len = Math.floor(sr * secs), ir = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) { const t = i / sr; lp += 0.35 * ((Math.random() * 2 - 1) - lp); d[i] = lp * Math.pow(1 - t / secs, 2.2) * (t < 0.012 ? t / 0.012 : 1); }
    }
    return ir;
  }

  /**
   * Clean up a vocal. buffer: AudioBuffer. opts: { key, scale ('minor' …), tune 0..1 (default 0.8), reverb 0..1 }
   * resolves to { channels: [L, R], sampleRate, detune } ready for encodeWAV.
   */
  async function clean(buffer, opts = {}) {
    const sr = buffer.sampleRate;
    const mono = new Float32Array(buffer.length);
    for (let c = 0; c < buffer.numberOfChannels; c++) { const d = buffer.getChannelData(c); for (let i = 0; i < d.length; i++) mono[i] += d[i] / buffer.numberOfChannels; }
    let x = mono, detune = 0;
    const tune = opts.tune == null ? 0.8 : opts.tune;
    if (tune > 0) {
      const tr = trackPitch(mono, sr);
      const steps = (BL.theory && BL.theory.SCALES[opts.scale || 'minor'] || { steps: [0, 2, 3, 5, 7, 8, 10] }).steps;
      const t = targets(tr.f0, opts.key || 0, steps, tune);
      detune = t.detune;
      x = psola(mono, sr, tr, t.corr);
    }
    x = gate(x, sr);
    const ctx = new OfflineAudioContext(2, x.length + Math.floor(sr * 1.5), sr);
    const b = ctx.createBuffer(1, x.length, sr);
    b.getChannelData(0).set(x);
    const src = ctx.createBufferSource();
    src.buffer = b;
    const f = (type, freq, q, g) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = freq; if (q != null) n.Q.value = q; if (g != null) n.gain.value = g; return n; };
    const nodes = [f('highpass', 95, 0.7), f('highpass', 95, 0.7), f('peaking', 260, 1.1, -4), f('peaking', 3200, 0.8, 3.5), f('highshelf', 10000, null, 4), f('peaking', 7200, 2.5, -5)];
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -26; comp.knee.value = 8; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.14;
    const make = ctx.createGain(); make.gain.value = 2.2;
    let node = src; for (const n of nodes) { node.connect(n); node = n; }
    node.connect(comp); comp.connect(make);
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
    make.connect(lim);
    const conv = ctx.createConvolver(); conv.buffer = plateIR(ctx, 1.6);
    const pre = ctx.createDelay(0.1); pre.delayTime.value = 0.025;
    const send = ctx.createGain(); send.gain.value = 0.22 * (opts.reverb == null ? 1 : opts.reverb);
    const verbHp = f('highpass', 350, 0.7);
    make.connect(send); send.connect(pre); pre.connect(verbHp); verbHp.connect(conv); conv.connect(lim);
    lim.connect(ctx.destination);
    src.start(0);
    const r = await ctx.startRendering();
    const L = r.getChannelData(0), R = r.getChannelData(1);
    let pk = 0; for (let i = 0; i < L.length; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
    const k = pk > 0 ? 0.89 / pk : 1; // -1 dBFS
    for (let i = 0; i < L.length; i++) { L[i] *= k; R[i] *= k; }
    return { channels: [L, R], sampleRate: sr, detune };
  }

  /** make any dialogue sound like a 1950s film: band-limited mono, a little saturation, projector crackle and hiss, small room */
  async function oldFilm(buffer) {
    const sr = buffer.sampleRate, n = buffer.length + Math.floor(sr * 0.8);
    const ctx = new OfflineAudioContext(2, n, sr);
    const src = ctx.createBufferSource(); src.buffer = buffer;
    const toMono = ctx.createGain(); toMono.channelCount = 1; toMono.channelCountMode = 'explicit';
    const f = (type, freq, q, g) => { const x = ctx.createBiquadFilter(); x.type = type; x.frequency.value = freq; if (q != null) x.Q.value = q; if (g != null) x.gain.value = g; return x; };
    const hp = f('highpass', 330, 0.8), lp = f('lowpass', 3300, 0.9), mid = f('peaking', 1500, 0.9, 4), lp2 = f('lowpass', 4200, 0.7);
    const sat = ctx.createWaveShaper(); const cv = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 511.5) - 1; cv[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
    sat.curve = cv;
    const vol = ctx.createGain(); vol.gain.value = 0.9;
    src.connect(toMono); toMono.connect(hp); hp.connect(mid); mid.connect(lp); lp.connect(sat); sat.connect(lp2); lp2.connect(vol);
    const room = ctx.createConvolver(); room.buffer = plateIR(ctx, 0.6);
    const wet = ctx.createGain(); wet.gain.value = 0.16;
    vol.connect(ctx.destination); vol.connect(wet); wet.connect(room); room.connect(ctx.destination);
    // projector: hiss + random crackles
    const nb = ctx.createBuffer(1, n, sr), nd = nb.getChannelData(0);
    let b0 = 0;
    for (let i = 0; i < n; i++) {
      b0 = 0.9 * b0 + 0.1 * (Math.random() * 2 - 1);
      nd[i] = b0 * 0.012 + (Math.random() < 9 / sr ? (Math.random() * 2 - 1) * 0.35 : 0);
    }
    const ns = ctx.createBufferSource(); ns.buffer = nb;
    const nf = f('bandpass', 2200, 0.6);
    ns.connect(nf); nf.connect(ctx.destination);
    src.start(0); ns.start(0);
    const r = await ctx.startRendering();
    const L = r.getChannelData(0), R = r.getChannelData(1);
    let pk = 0; for (let i = 0; i < L.length; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
    const k = pk > 0 ? 0.89 / pk : 1;
    for (let i = 0; i < L.length; i++) { L[i] *= k; R[i] *= k; }
    return { channels: [L, R], sampleRate: sr };
  }

  BL.vocal = { clean, oldFilm, trackPitch, targets, psola, gate };
})(typeof window !== 'undefined' ? window : globalThis);
