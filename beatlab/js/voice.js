/* BeatLab — your voice as the input.
 * Sing It: pitch-track a sung/hummed take, auto-tune every note to the song's key, quantize to the grid → piano-roll notes.
 * Beatbox It: find each hit in a beatboxed take, tell "boom" / "pff·ka" / "ts" apart → kick / snare / hat steps. */
(function (root) {
  const BL = (root.BL = root.BL || {});

  function mono(buffer) {
    const n = buffer.length, out = new Float32Array(n), ch = buffer.numberOfChannels;
    for (let c = 0; c < ch; c++) { const d = buffer.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i] / ch; }
    return out;
  }

  /**
   * opts: { sr, bpm, steps (pattern length in 16ths), offset (sec where step 0 starts in the take), key, scale,
   *         midiOf(degree) -> midi for the target track, tune 0..1 (auto-tune strength, default 1) }
   * returns { notes: [{ s, d, l }], tuned: n, shift: octaves moved to fit the instrument }
   */
  function toNotes(x, opts) {
    const sr = opts.sr, sd = 60 / opts.bpm / 4, steps = opts.steps;
    const tr = BL.vocal.trackPitch(x, sr);
    const hopT = tr.hop / sr;
    const steps12 = BL.theory.SCALES[opts.scale || 'minor'].steps;
    const allowed = new Set(steps12.map((s) => (s + (opts.key || 0)) % 12));
    // midi per frame, lightly median-smoothed so vibrato and scoops do not split notes
    const raw = Array.from(tr.f0, (f) => (f ? 69 + 12 * Math.log2(f / 440) : NaN));
    const m = raw.map((v, i) => {
      if (isNaN(v)) return NaN;
      const w = raw.slice(Math.max(0, i - 2), i + 3).filter((q) => !isNaN(q)).sort((a, b) => a - b);
      return w[w.length >> 1];
    });
    // energy envelope for re-attacks (same pitch sung twice)
    const rms = tr.rms;
    // segment into notes
    const segs = [];
    let cur = null;
    for (let k = 0; k < m.length; k++) {
      const v = m[k];
      const reattack = cur && rms[k] > (rms[k - 2] || 0) * 2.2 && rms[k] > 0.02;
      if (isNaN(v) || (cur && (Math.abs(v - cur.sum / cur.n) > 0.85 || reattack))) {
        if (cur) segs.push(cur);
        cur = isNaN(v) ? null : { k0: k, k1: k, sum: v, n: 1, vals: [v] };
        continue;
      }
      if (!cur) cur = { k0: k, k1: k, sum: v, n: 1, vals: [v] };
      else { cur.k1 = k; cur.sum += v; cur.n++; cur.vals.push(v); }
    }
    if (cur) segs.push(cur);
    // each note: auto-tune its pitch to the nearest note in the key, place it on the grid
    const tuneTo = (v) => {
      let best = Math.round(v), bd = 99;
      for (let n = Math.floor(v) - 2; n <= Math.ceil(v) + 2; n++) if (allowed.has(((n % 12) + 12) % 12) && Math.abs(n - v) < bd) { bd = Math.abs(n - v); best = n; }
      return best;
    };
    const placed = [];
    for (const sg of segs) {
      const t0 = (sg.k0 * tr.hop + tr.W / 2) / sr - (opts.offset || 0);
      const t1 = (sg.k1 * tr.hop + tr.W / 2) / sr + hopT - (opts.offset || 0);
      if (t1 - t0 < 0.07 || t1 < 0) continue;
      const sorted = sg.vals.slice().sort((a, b) => a - b);
      const med = sorted[sorted.length >> 1];
      const s = Math.max(0, Math.round(t0 / sd));
      if (s >= steps) continue;
      const l = Math.max(1, Math.min(steps - s, Math.round((t1 - Math.max(0, t0)) / sd)));
      placed.push({ s, l, midi: tuneTo(med) });
    }
    // merge notes that landed on the same step (keep the longer one), and close tiny gaps so lines flow
    placed.sort((a, b) => a.s - b.s);
    const merged = [];
    for (const n of placed) {
      const last = merged[merged.length - 1];
      if (last && last.s === n.s) { if (n.l > last.l) Object.assign(last, n); continue; }
      if (last && last.s + last.l > n.s) last.l = Math.max(1, n.s - last.s);
      merged.push(n);
    }
    const orig = merged.map((q) => q.midi);
    for (let i = 0; i < merged.length; i++) {
      const nb = orig.slice(Math.max(0, i - 3), i).concat(orig.slice(i + 1, i + 4)).sort((a, b) => a - b);
      if (!nb.length) continue;
      const ref = nb[nb.length >> 1];
      while (merged[i].midi - ref > 9) merged[i].midi -= 12;
      while (ref - merged[i].midi > 9) merged[i].midi += 12;
    }
    // move whole octaves so the take sits where the instrument sounds best (a low voice still plays a lead)
    const mids = merged.map((n) => n.midi).sort((a, b) => a - b);
    const centre = opts.midiOf(4);
    const shift = mids.length ? Math.round((centre - mids[mids.length >> 1]) / 12) : 0;
    // midi -> scale degree for this track
    const degOf = (midi) => { for (let d = -28; d <= 42; d++) if (opts.midiOf(d) === midi) return d; return null; };
    const notes = [];
    for (const n of merged) { const d = degOf(n.midi + shift * 12); if (d != null) notes.push({ s: n.s, d, l: n.l }); }
    return { notes, tuned: notes.length, shift };
  }

  /**
   * opts: { sr, bpm, steps, offset } → { hits: [{ s, kind: 'kick'|'snare'|'hat', v }] }
   * kick = low "boom/b", snare = mid noisy "pff/ka/ch", hat = bright "ts/t"
   */
  function toDrums(x, opts) {
    const sr = opts.sr, sd = 60 / opts.bpm / 4, steps = opts.steps;
    const N = 1024, hop = 256, frames = Math.floor((x.length - N) / hop);
    if (frames < 4) return { hits: [] };
    const win = new Float32Array(N); for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N);
    const binHz = sr / N;
    const low = new Float32Array(frames), mid = new Float32Array(frames), high = new Float32Array(frames), flux = new Float32Array(frames), cen = new Float32Array(frames);
    let prev = new Float32Array(N / 2);
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let f = 0; f < frames; f++) {
      for (let i = 0; i < N; i++) { re[i] = x[f * hop + i] * win[i]; im[i] = 0; }
      BL.dsp.fft(re, im);
      let lo = 0, mi = 0, hi = 0, fl = 0, cw = 0;
      const mag = new Float32Array(N / 2);
      for (let k = 1; k < N / 2; k++) {
        const v = Math.hypot(re[k], im[k]); mag[k] = v;
        const hz = k * binHz, e = v * v;
        cw += hz * e;
        if (hz < 220) lo += e; else if (hz < 2500) mi += e; else if (hz > 4000) hi += e;
        const d = v - prev[k]; if (d > 0) fl += d;
      }
      low[f] = lo; mid[f] = mi; high[f] = hi; flux[f] = fl; cen[f] = cw; prev = mag;
    }
    // peaks in spectral flux above an adaptive threshold, at least 70 ms apart
    const gap = Math.round((0.07 * sr) / hop), hits = [];
    let maxFlux = 0; for (const v of flux) maxFlux = Math.max(maxFlux, v);
    for (let f = 2; f < frames - 2; f++) {
      let localMean = 0, c = 0;
      for (let j = Math.max(0, f - 20); j < Math.min(frames, f + 20); j++) { localMean += flux[j]; c++; }
      localMean /= c;
      const v = flux[f];
      if (v < maxFlux * 0.12 || v < localMean * 1.6 || v < flux[f - 1] || v < flux[f + 1]) continue;
      if (hits.length && f - hits[hits.length - 1].f < gap) { if (v > hits[hits.length - 1].v) hits[hits.length - 1] = { f, v }; continue; }
      hits.push({ f, v });
    }
    // classify each hit from the 60 ms after it
    const span = Math.max(1, Math.round((0.06 * sr) / hop));
    const out = [];
    for (const h of hits) {
      let lo = 0, mi = 0, hi = 0, cw = 0, all = 0;
      for (let j = h.f; j < Math.min(frames, h.f + span); j++) { lo += low[j]; mi += mid[j]; hi += high[j]; cw += cen[j]; }
      const tot = lo + mi + hi + 1e-12;
      all = tot;
      const centroid = cw / all; // where the hit's energy sits: "ts" is up high, "pff/ka/ch" is in the middle
      const kind = lo / tot > 0.38 || centroid < 450 ? 'kick' : centroid > 5800 ? 'hat' : 'snare';
      const t = (h.f * hop + N / 4) / sr - (opts.offset || 0);
      const s = Math.round(t / sd);
      if (s < 0 || s >= steps) continue;
      out.push({ s, kind, v: Math.max(0.45, Math.min(1, Math.sqrt(h.v / maxFlux) * 1.25)) });
    }
    // one hit per sound per step
    const seen = new Set();
    return { hits: out.filter((h) => { const k = h.kind + h.s; if (seen.has(k)) return false; seen.add(k); return true; }) };
  }

  BL.voice = { mono, toNotes, toDrums };
})(typeof window !== 'undefined' ? window : globalThis);
