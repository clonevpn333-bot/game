/* BeatLab — sample processing: speed / pitch / time-stretch, key + tempo detection,
 * smart chopping, WAV + ZIP encoding. Pure functions on Float32Arrays so they also run in Node tests. */
(function (root) {
  const BL = (root.BL = root.BL || {});

  // ---------- FFT (in-place, radix-2) ----------
  function fft(re, im, inverse) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = ((inverse ? 2 : -2) * Math.PI) / len;
      const wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        const half = len >> 1;
        for (let k = 0; k < half; k++) {
          const a = i + k, b = a + half;
          const xr = re[b] * cr - im[b] * ci;
          const xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi;
          re[a] += xr; im[a] += xi;
          const nr = cr * wr - ci * wi;
          ci = cr * wi + ci * wr;
          cr = nr;
        }
      }
    }
    if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
  }

  const winCache = {};
  function hann(n) {
    if (!winCache[n]) {
      const w = new Float32Array(n);
      for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
      winCache[n] = w;
    }
    return winCache[n];
  }

  // ---------- Phase-vocoder time stretch (keeps pitch) ----------
  /** factor > 1 = longer/slower, < 1 = shorter/faster. Pitch is unchanged. */
  function timeStretch(x, factor, N) {
    N = N || 2048;
    const outLenTarget = Math.max(1, Math.round(x.length * factor));
    if (Math.abs(factor - 1) < 1e-4) return x.slice(0);
    const Hs = N / 4;
    const Ha = Hs / factor;
    const win = hann(N);
    const half = N / 2;
    const y = new Float32Array(outLenTarget + N * 2);
    const wsum = new Float32Array(outLenTarget + N * 2);
    const lastPhase = new Float32Array(half + 1);
    const sumPhase = new Float32Array(half + 1);
    const re = new Float32Array(N), im = new Float32Array(N);
    const TWO_PI = 2 * Math.PI;
    let prevPos = 0, first = true, o = 0;
    for (let t = 0; o < outLenTarget + N; t += Ha, o += Hs) {
      const pos = Math.floor(t);
      for (let i = 0; i < N; i++) {
        const idx = pos + i;
        re[i] = (idx < x.length ? x[idx] : 0) * win[i];
        im[i] = 0;
      }
      fft(re, im, false);
      const hopA = pos - prevPos;
      for (let k = 0; k <= half; k++) {
        const mag = Math.hypot(re[k], im[k]);
        const ph = Math.atan2(im[k], re[k]);
        const omega = (TWO_PI * k) / N;
        if (first) {
          sumPhase[k] = ph;
        } else {
          let d = ph - lastPhase[k] - omega * hopA;
          d -= TWO_PI * Math.round(d / TWO_PI);
          const inst = omega + (hopA > 0 ? d / hopA : 0);
          sumPhase[k] += inst * Hs;
        }
        lastPhase[k] = ph;
        re[k] = mag * Math.cos(sumPhase[k]);
        im[k] = mag * Math.sin(sumPhase[k]);
      }
      for (let k = 1; k < half; k++) { re[N - k] = re[k]; im[N - k] = -im[k]; }
      fft(re, im, true);
      for (let i = 0; i < N; i++) {
        const j = o + i;
        if (j >= y.length) break;
        y[j] += re[i] * win[i];
        wsum[j] += win[i] * win[i];
      }
      prevPos = pos;
      first = false;
      if (pos > x.length + N) break;
    }
    const out = new Float32Array(outLenTarget);
    for (let i = 0; i < outLenTarget; i++) out[i] = wsum[i] > 0.05 ? y[i] / wsum[i] : y[i] / 1.5;
    return out;
  }

  /** Resample by ratio (ratio 2 = twice as fast / one octave up / half as long). Cubic interpolation. */
  function resample(x, ratio) {
    if (Math.abs(ratio - 1) < 1e-6) return x.slice(0);
    const outLen = Math.max(1, Math.floor(x.length / ratio));
    const y = new Float32Array(outLen);
    const n = x.length;
    for (let i = 0; i < outLen; i++) {
      const p = i * ratio;
      const i1 = Math.floor(p);
      const f = p - i1;
      const x0 = x[i1 - 1 < 0 ? 0 : i1 - 1];
      const x1 = x[i1 < n ? i1 : n - 1];
      const x2 = x[i1 + 1 < n ? i1 + 1 : n - 1];
      const x3 = x[i1 + 2 < n ? i1 + 2 : n - 1];
      const c1 = 0.5 * (x2 - x0);
      const c2 = x0 - 2.5 * x1 + 2 * x2 - 0.5 * x3;
      const c3 = 0.5 * (x3 - x0) + 1.5 * (x1 - x2);
      y[i] = ((c3 * f + c2) * f + c1) * f + x1;
    }
    // gentle anti-alias when speeding up a lot: simple one-pole smoothing
    if (ratio > 1.3) {
      const a = Math.min(0.6, (ratio - 1) * 0.35);
      let prev = y[0];
      for (let i = 0; i < outLen; i++) { prev = prev * a + y[i] * (1 - a); y[i] = prev; }
    }
    return y;
  }

  /**
   * The one function behind every Sample Lab knob.
   * speed: 0.25..4 (1 = original). keepPitch: false = classic "tape" (faster = higher).
   * semis: extra pitch shift that does NOT change the length.
   */
  function processChannel(x, opts) {
    const speed = opts.speed || 1;
    const semis = opts.semis || 0;
    let data = x;
    if (opts.reverse) { data = x.slice(0).reverse(); }
    const pitchRatio = (opts.keepPitch ? 1 : speed) * Math.pow(2, semis / 12);
    const durFactor = 1 / speed;
    const stretch = durFactor * pitchRatio; // stretch first, then resample by pitchRatio
    if (Math.abs(stretch - 1) > 1e-3) data = timeStretch(data, stretch);
    if (Math.abs(pitchRatio - 1) > 1e-6) data = resample(data, pitchRatio);
    if (data === x) data = x.slice(0);
    // tiny fades to avoid clicks
    const f = Math.min(64, data.length >> 2);
    for (let i = 0; i < f; i++) { const g = i / f; data[i] *= g; data[data.length - 1 - i] *= g; }
    return data;
  }

  function mono(channels) {
    if (channels.length === 1) return channels[0];
    const n = channels[0].length;
    const out = new Float32Array(n);
    for (const c of channels) for (let i = 0; i < n; i++) out[i] += c[i] / channels.length;
    return out;
  }

  // ---------- Analysis ----------
  /** 12-bin pitch-class energy profile (C..B) */
  function chroma(x, sr) {
    const N = 8192;
    const hop = 4096;
    const out = new Float64Array(12);
    const maxLen = Math.min(x.length, sr * 40);
    const re = new Float32Array(N), im = new Float32Array(N);
    const win = hann(N);
    const binPc = new Int8Array(N / 2);
    const binW = new Float32Array(N / 2);
    for (let k = 1; k < N / 2; k++) {
      const f = (k * sr) / N;
      if (f < 60 || f > 2500) { binPc[k] = -1; continue; }
      const midi = 69 + 12 * Math.log2(f / 440);
      const nearest = Math.round(midi);
      const dev = Math.abs(midi - nearest);
      binPc[k] = ((nearest % 12) + 12) % 12;
      binW[k] = dev < 0.35 ? 1 - dev * 2 : 0; // only bins close to a real note
    }
    for (let p = 0; p + N <= maxLen || p === 0; p += hop) {
      for (let i = 0; i < N; i++) { re[i] = (x[p + i] || 0) * win[i]; im[i] = 0; }
      fft(re, im, false);
      let frameMax = 0;
      const mags = new Float32Array(N / 2);
      for (let k = 1; k < N / 2; k++) { mags[k] = Math.hypot(re[k], im[k]); if (mags[k] > frameMax) frameMax = mags[k]; }
      if (frameMax < 1e-4) continue;
      for (let k = 2; k < N / 2 - 1; k++) {
        if (binPc[k] < 0 || !binW[k]) continue;
        const m = mags[k];
        if (m > mags[k - 1] && m >= mags[k + 1] && m > frameMax * 0.05) out[binPc[k]] += Math.sqrt(m / frameMax) * binW[k];
      }
      if (p + N > maxLen) break;
    }
    return Array.from(out);
  }

  /** onset-strength envelope, one value per hop */
  function onsetEnvelope(x, sr, hop) {
    hop = hop || 512;
    const N = 1024;
    const frames = Math.max(1, Math.floor((x.length - N) / hop));
    const env = new Float32Array(frames);
    const re = new Float32Array(N), im = new Float32Array(N);
    const win = hann(N);
    let prev = new Float32Array(N / 2);
    for (let f = 0; f < frames; f++) {
      const p = f * hop;
      for (let i = 0; i < N; i++) { re[i] = x[p + i] * win[i]; im[i] = 0; }
      fft(re, im, false);
      let flux = 0;
      const cur = new Float32Array(N / 2);
      for (let k = 1; k < N / 2; k++) {
        cur[k] = Math.log1p(10 * Math.hypot(re[k], im[k]));
        const d = cur[k] - prev[k];
        if (d > 0) flux += d;
      }
      env[f] = flux;
      prev = cur;
    }
    return env;
  }

  /** estimate tempo in 70..180 BPM range */
  function detectBPM(x, sr) {
    const hop = 512;
    const env = onsetEnvelope(x, sr, hop);
    if (env.length < 32) return 0;
    let mean = 0;
    for (const v of env) mean += v;
    mean /= env.length;
    const e = env.map((v) => Math.max(0, v - mean));
    const fps = sr / hop;
    let best = 0, bestScore = -1;
    for (let bpm = 70; bpm <= 180; bpm += 0.5) {
      const lag = (60 / bpm) * fps;
      let s = 0;
      for (const mult of [1, 2, 4]) {
        const L = lag * mult;
        const li = Math.floor(L), lf = L - li;
        let acc = 0;
        for (let i = 0; i + li + 1 < e.length; i++) acc += e[i] * (e[i + li] * (1 - lf) + e[i + li + 1] * lf);
        s += acc / mult;
      }
      // mild preference for the common hip-hop range
      const pref = Math.exp(-Math.pow(Math.log2(bpm / 100), 2) * 1.2);
      s *= 0.75 + 0.25 * pref;
      if (s > bestScore) { bestScore = s; best = bpm; }
    }
    return Math.round(best);
  }

  /** find the n strongest hits, returned as sample offsets (always includes 0) */
  function detectOnsets(x, sr, n) {
    const hop = 512;
    const env = onsetEnvelope(x, sr, hop);
    const minGap = Math.floor((0.08 * sr) / hop);
    const peaks = [];
    for (let i = 1; i < env.length - 1; i++) {
      if (env[i] > env[i - 1] && env[i] >= env[i + 1]) peaks.push({ i, v: env[i] });
    }
    peaks.sort((a, b) => b.v - a.v);
    const chosen = [0];
    for (const p of peaks) {
      if (chosen.length >= n) break;
      if (chosen.every((c) => Math.abs(c - p.i) >= minGap)) chosen.push(p.i);
    }
    return chosen.sort((a, b) => a - b).map((i) => i * hop);
  }

  // ---------- Encoding ----------
  function encodeWAV(channels, sr) {
    const nCh = channels.length;
    const len = channels[0].length;
    const buf = new ArrayBuffer(44 + len * nCh * 2);
    const v = new DataView(buf);
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); v.setUint32(4, 36 + len * nCh * 2, true); ws(8, 'WAVE');
    ws(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, nCh, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * nCh * 2, true); v.setUint16(32, nCh * 2, true); v.setUint16(34, 16, true);
    ws(36, 'data'); v.setUint32(40, len * nCh * 2, true);
    let o = 44;
    for (let i = 0; i < len; i++) {
      for (let c = 0; c < nCh; c++) {
        const s = Math.max(-1, Math.min(1, channels[c][i]));
        v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        o += 2;
      }
    }
    return new Uint8Array(buf);
  }

  let crcTable = null;
  function crc32(bytes) {
    if (!crcTable) {
      crcTable = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crcTable[n] = c >>> 0;
      }
    }
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  /** minimal "stored" (uncompressed) zip of a list of {name, bytes} */
  function makeZip(files) {
    const enc = new TextEncoder();
    const parts = [];
    const central = [];
    let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name);
      const crc = crc32(f.bytes);
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0, true); h.setUint16(8, 0, true);
      h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true);
      h.setUint32(18, f.bytes.length, true); h.setUint32(22, f.bytes.length, true);
      h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, f.bytes);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0, true);
      c.setUint16(10, 0, true); c.setUint16(12, 0, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true);
      c.setUint32(20, f.bytes.length, true); c.setUint32(24, f.bytes.length, true); c.setUint16(28, name.length, true);
      c.setUint32(42, offset, true);
      central.push(new Uint8Array(c.buffer), name);
      offset += 30 + name.length + f.bytes.length;
    }
    const cdSize = central.reduce((s, p) => s + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    const all = [...parts, ...central, new Uint8Array(end.buffer)];
    const total = all.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(total);
    let o = 0;
    for (const p of all) { out.set(p, o); o += p.length; }
    return out;
  }

  BL.dsp = {
    fft, hann, timeStretch, resample, processChannel, mono,
    chroma, onsetEnvelope, detectBPM, detectOnsets, encodeWAV, crc32, makeZip,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = BL.dsp;
})(typeof window !== 'undefined' ? window : globalThis);
