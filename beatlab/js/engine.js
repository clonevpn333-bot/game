/* BeatLab — audio engine: mixer graph, look-ahead scheduler, and offline bounce.
 * The same scheduleStep() drives live playback and WAV export, so what you hear is what you export. */
(function (root) {
  const BL = (root.BL = root.BL || {});
  const { INSTRUMENTS, playNote } = BL.sounds;

  let ctx = null;
  let graph = null;
  let getProject = () => null;
  let timer = null;
  const state = { playing: false, step: 0, patIdx: 0, songIdx: 0, nextTime: 0 };
  const uiQueue = [];
  const listeners = new Set();

  function audio() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      ctx = new AC({ latencyHint: 'interactive' });
      graph = createGraph(ctx, true);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function makeIR(c, secs, decayPow) {
    const len = Math.floor(c.sampleRate * secs);
    const b = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decayPow);
    }
    return b;
  }

  function createGraph(c, realtime) {
    const p = getProject() || {};
    const m = p.master || {};
    const master = c.createGain();
    master.gain.value = m.vol == null ? 0.85 : m.vol;
    const comp = c.createDynamicsCompressor();
    comp.knee.value = 8; comp.attack.value = 0.006; comp.release.value = 0.16;
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.06;
    const lofi = c.createBiquadFilter();
    lofi.type = 'lowpass';
    master.connect(lofi);
    lofi.connect(comp);
    comp.connect(limiter);
    let analyser = null;
    if (realtime) {
      analyser = c.createAnalyser();
      analyser.fftSize = 2048;
      limiter.connect(analyser);
    }
    limiter.connect(c.destination);
    const revIn = c.createGain();
    const conv = c.createConvolver();
    conv.buffer = makeIR(c, 2.4, 3);
    const revOut = c.createGain();
    revOut.gain.value = 0.8;
    revIn.connect(conv); conv.connect(revOut); revOut.connect(master);
    const preview = c.createGain();
    preview.gain.value = 0.9;
    preview.connect(master);
    const g = { ctx: c, master, comp, lofi, limiter, analyser, revIn, preview, strips: {}, voices: {} };
    applyMaster(g, p);
    return g;
  }

  function applyMaster(g, p) {
    const m = (p && p.master) || {};
    const punch = m.punch == null ? 0.5 : m.punch;
    g.master.gain.value = m.vol == null ? 0.85 : m.vol;
    g.comp.threshold.value = -6 - punch * 22;
    g.comp.ratio.value = 1.5 + punch * 5;
    g.lofi.frequency.value = m.lofi ? 3800 : 20000;
  }

  function stripFor(g, track, anySolo) {
    let s = g.strips[track.id];
    const c = g.ctx;
    if (!s) {
      const input = c.createGain();
      const pan = c.createStereoPanner ? c.createStereoPanner() : null;
      const send = c.createGain();
      if (pan) { input.connect(pan); pan.connect(g.master); } else input.connect(g.master);
      input.connect(send);
      send.connect(g.revIn);
      s = g.strips[track.id] = { input, pan, send };
    }
    const audible = !track.mute && (!anySolo || track.solo);
    const vol = track.vol == null ? 0.8 : track.vol;
    s.input.gain.value = audible ? vol * vol * 1.4 : 0;
    if (s.pan) s.pan.pan.value = track.pan || 0;
    s.send.gain.value = (track.rev || 0) * 0.9;
    s.audible = audible;
    return s;
  }

  function refreshMix() {
    const p = getProject();
    if (!graph || !p) return;
    const anySolo = p.tracks.some((t) => t.solo);
    for (const t of p.tracks) stripFor(graph, t, anySolo);
    applyMaster(graph, p);
  }

  function noteMidi(p, track, deg) {
    const inst = INSTRUMENTS[track.inst] || INSTRUMENTS.piano;
    // 808s live between ~44 Hz (F1) and ~82 Hz (E2) for the root, whatever the key
    const base = inst.bass ? (p.key < 5 ? 36 : 24) : inst.base;
    return base + (track.octave || 0) * 12 + p.key + BL.theory.degreeToSemi(deg, p.scale);
  }

  function chokeNode(c, out) {
    const ch = c.createGain();
    ch.connect(out);
    return ch;
  }
  function choke(v, t) {
    if (!v || !v.choke) return;
    try {
      v.choke.gain.setValueAtTime(1, t);
      v.choke.gain.linearRampToValueAtTime(0, t + 0.012);
    } catch (e) { /* already ended */ }
  }

  function playBuffer(c, out, buf, t, opts) {
    const src = c.createBufferSource();
    src.buffer = buf;
    if (opts.rate && opts.rate !== 1) src.playbackRate.value = opts.rate;
    const g = c.createGain();
    g.gain.value = opts.vel == null ? 1 : opts.vel;
    src.connect(g);
    g.connect(out);
    const off = opts.offset || 0;
    if (opts.dur) {
      src.start(t, off, opts.dur + 0.01);
      g.gain.setValueAtTime(g.gain.value, t + Math.max(0, opts.dur - 0.008));
      g.gain.linearRampToValueAtTime(0, t + opts.dur);
    } else src.start(t, off);
    return src;
  }

  function scheduleStep(g, p, pat, step, t, stepDur, absStep) {
    if (absStep == null) absStep = step;
    if (!pat) return;
    const c = g.ctx;
    const anySolo = p.tracks.some((tr) => tr.solo);
    for (const track of p.tracks) {
      const s = stripFor(g, track, anySolo);
      if (!s.audible) continue;
      const d = pat.data[track.id];
      if (!d) continue;
      if (track.type === 'drum') {
        const v = d.steps[step];
        if (!v) continue;
        const buf = BL.sounds.drumBuffers[track.sound];
        if (!buf) continue;
        const r = (d.rolls && d.rolls[step]) || 1;
        const rate = Math.pow(2, (track.pitch || 0) / 12);
        for (let i = 0; i < r; i++) {
          playBuffer(c, s.input, buf, t + (i * stepDur) / r, { vel: v * (i ? 0.75 + 0.25 * (i / r) : 1), rate });
        }
      } else if (track.type === 'synth') {
        const inst = INSTRUMENTS[track.inst] || INSTRUMENTS.piano;
        for (const n of d.notes) {
          if (n.s !== step) continue;
          const midi = noteMidi(p, track, n.d);
          const dur = n.l * stepDur;
          if (inst.bass) {
            const prev = g.voices[track.id];
            const glide = track.glide !== false && prev && prev.noteEnd > t + 0.005 && prev.midi !== midi ? prev.midi : null;
            if (prev && prev.end > t) choke(prev, t);
            const ch = chokeNode(c, s.input);
            const v = playNote(c, ch, track.inst, midi, t, dur, n.v || 0.9, glide);
            g.voices[track.id] = { choke: ch, end: v.end, noteEnd: t + dur, midi };
          } else {
            playNote(c, s.input, track.inst, midi, t, dur, n.v || 0.8);
          }
        }
      } else if (track.type === 'sample') {
        const rt = BL.lab && BL.lab.runtime(track.sampleId);
        if (!rt || !rt.processed) continue;
        const buf = rt.processed;
        if (track.mode === 'chop') {
          const idx = d.steps[step];
          if (idx == null || idx < 0 || !rt.slices[idx]) continue;
          const sl = rt.slices[idx];
          const prev = g.voices[track.id];
          if (prev && prev.end > t) choke(prev, t);
          const ch = chokeNode(c, s.input);
          const len = sl.e - sl.s;
          playBuffer(c, ch, buf, t, { offset: sl.s, dur: len, vel: 0.9 });
          g.voices[track.id] = { choke: ch, end: t + len };
        } else {
          const prev = g.voices[track.id];
          if (d.on === false) {
            if (prev && prev.end > t) choke(prev, t);
            g.voices[track.id] = null;
            continue;
          }
          // loops run on the absolute clock, so a 4-bar sample keeps going across 2-bar patterns
          const loopSteps = Math.max(1, Math.round(buf.duration / stepDur));
          if (absStep % loopSteps !== 0 && !(prev == null && step === 0)) continue;
          if (prev && prev.end > t) choke(prev, t);
          const ch = chokeNode(c, s.input);
          const offset = absStep % loopSteps === 0 ? 0 : (absStep % loopSteps) * stepDur;
          const dur = Math.min(buf.duration - offset, (loopSteps - (absStep % loopSteps)) * stepDur);
          if (dur <= 0.01) continue;
          playBuffer(c, ch, buf, t, { offset, dur, vel: 0.9 });
          g.voices[track.id] = { choke: ch, end: t + dur };
        }
      }
    }
  }

  function stepDuration(p) {
    return 60 / p.bpm / 4;
  }
  function swingOffset(p, step) {
    return step % 2 === 1 ? (p.swing || 0) * stepDuration(p) * 0.66 : 0;
  }

  function tick() {
    const p = getProject();
    if (!p || !state.playing) return;
    const ahead = 0.14;
    while (state.nextTime < ctx.currentTime + ahead) {
      const sd = stepDuration(p);
      const steps = p.bars * 16;
      if (state.step >= steps) state.step = 0;
      let patIdx = state.patIdx;
      if (p.songMode && p.song.length) {
        state.songIdx %= p.song.length;
        patIdx = p.song[state.songIdx];
      } else patIdx = p.current;
      const t = state.nextTime + swingOffset(p, state.step);
      scheduleStep(graph, p, p.patterns[patIdx], state.step, t, sd, state.abs);
      state.abs++;
      uiQueue.push({ time: state.nextTime, step: state.step, patIdx, songIdx: state.songIdx });
      state.nextTime += sd;
      state.step++;
      if (state.step >= steps) {
        state.step = 0;
        if (p.songMode && p.song.length) state.songIdx = (state.songIdx + 1) % p.song.length;
      }
    }
  }

  function uiLoop() {
    if (!state.playing) return;
    const now = ctx.currentTime;
    let last = null;
    while (uiQueue.length && uiQueue[0].time <= now) last = uiQueue.shift();
    if (last) listeners.forEach((fn) => fn(last));
    requestAnimationFrame(uiLoop);
  }

  function play(fromSongIdx) {
    audio();
    if (state.playing) return;
    refreshMix();
    state.playing = true;
    state.step = 0;
    state.abs = 0;
    state.songIdx = fromSongIdx || 0;
    state.nextTime = ctx.currentTime + 0.06;
    uiQueue.length = 0;
    graph.voices = {};
    tick();
    timer = setInterval(tick, 25);
    requestAnimationFrame(uiLoop);
  }

  function stop() {
    state.playing = false;
    clearInterval(timer);
    timer = null;
    uiQueue.length = 0;
    // fade out anything still ringing
    if (graph) {
      const t = ctx.currentTime;
      Object.values(graph.voices).forEach((v) => choke(v, t));
      const old = graph;
      const fade = old.master.gain.value;
      old.master.gain.setValueAtTime(fade, t);
      old.master.gain.linearRampToValueAtTime(0, t + 0.08);
      // rebuild a fresh graph so stopped notes are gone for good
      setTimeout(() => {
        try { old.master.disconnect(); } catch (e) { /* ignore */ }
      }, 120);
      graph = createGraph(ctx, true);
    }
    listeners.forEach((fn) => fn(null));
  }

  // ---------- previews ----------
  function previewDrum(id, pitch) {
    audio();
    const buf = BL.sounds.drumBuffers[id];
    if (buf) playBuffer(ctx, graph.preview, buf, ctx.currentTime + 0.005, { rate: Math.pow(2, (pitch || 0) / 12) });
  }
  let previewVoice = null;
  function previewNote(instId, midi, dur) {
    audio();
    const inst = INSTRUMENTS[instId];
    const t = ctx.currentTime + 0.005;
    if (inst && inst.bass && previewVoice && previewVoice.end > t) choke(previewVoice, t);
    const ch = chokeNode(ctx, graph.preview);
    const v = playNote(ctx, ch, instId, midi, t, dur || 0.35, 0.85);
    previewVoice = { choke: ch, end: v.end };
  }
  let previewSrc = null;
  function previewBuffer(buf, offset, dur, onEnd) {
    audio();
    stopPreviewBuffer();
    const src = playBuffer(ctx, graph.preview, buf, ctx.currentTime + 0.005, { offset: offset || 0, dur: dur || buf.duration - (offset || 0) });
    previewSrc = { src, start: ctx.currentTime + 0.005, offset: offset || 0, dur: dur || buf.duration };
    src.onended = () => { if (previewSrc && previewSrc.src === src) { previewSrc = null; onEnd && onEnd(); } };
    return previewSrc;
  }
  function stopPreviewBuffer() {
    if (previewSrc) { try { previewSrc.src.stop(); } catch (e) { /* ignore */ } previewSrc = null; }
  }
  function previewPosition() {
    if (!previewSrc || !ctx) return null;
    return previewSrc.offset + (ctx.currentTime - previewSrc.start);
  }

  // ---------- endings ----------
  /** read the audio from `startT` at a changing speed (rate(t)), like a hand on a record */
  function varispeed(chs, sr, startT, outDur, rate, fade) {
    const start = Math.max(0, Math.floor(startT * sr));
    const outLen = Math.floor(outDur * sr);
    return chs.map((x) => {
      const y = new Float32Array(start + outLen);
      y.set(x.subarray(0, Math.min(start, x.length)));
      let pos = start;
      for (let i = 0; i < outLen; i++) {
        const t = i / sr;
        const i0 = Math.floor(pos), f = pos - i0;
        const a = x[i0] || 0, b = x[i0 + 1] || 0;
        y[start + i] = (a + (b - a) * f) * fade(t);
        pos += rate(t);
      }
      return y;
    });
  }

  const ENDINGS = {
    none: { name: 'Just stop' },
    slowmo: { name: 'Slow-mo final hit' },
    tapestop: { name: 'Tape stop' },
  };

  // ---------- offline bounce ----------
  async function render(p, opts) {
    const order = opts.song && p.song.length ? p.song.slice() : new Array(opts.loops || 4).fill(p.current);
    const ending = opts.ending || 'none';
    const sd = stepDuration(p);
    const steps = p.bars * 16;
    const songLen = order.length * steps * sd;
    const total = songLen + (ending === 'slowmo' ? 7 : 3);
    const OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    const oc = new OAC(2, Math.ceil(total * 44100), 44100);
    const prevGet = getProject;
    getProject = () => p;
    const g = createGraph(oc, false);
    getProject = prevGet;
    let t = 0.05, abs = 0;
    for (const idx of order) {
      for (let st = 0; st < steps; st++) {
        scheduleStep(g, p, p.patterns[idx], st, t + swingOffset(p, st), sd, abs++);
        t += sd;
      }
    }
    const finalT = t;
    if (ending === 'slowmo') {
      // one last downbeat (kick, 808, chord, sample) plus a boom, which then gets slowed right down
      scheduleStep(g, p, p.patterns[order[0]], 0, finalT, sd, 0);
      const boom = BL.sounds.drumBuffers.impact;
      if (boom) playBuffer(oc, g.master, boom, finalT, { vel: 0.55 });
      const crash = BL.sounds.drumBuffers.crash;
      if (crash) playBuffer(oc, g.master, crash, finalT, { vel: 0.45 });
    }
    const buf = await oc.startRendering();
    let chs = [buf.getChannelData(0), buf.getChannelData(1)];
    if (ending === 'slowmo') {
      const D = 4.5;
      chs = varispeed(chs, 44100, finalT, D, (x) => 0.5 - 0.12 * (x / D), (x) => Math.pow(1 - x / D, 1.6));
    } else if (ending === 'tapestop') {
      const D = Math.min(1.6, sd * 8 * 1.3);
      const start = finalT - sd * 8;
      chs = varispeed(chs, 44100, start, D, (x) => Math.pow(Math.max(0, 1 - x / D), 1.4), (x) => (x > D * 0.92 ? (D - x) / (D * 0.08) : 1));
    }
    // trim trailing silence (keeps reverb tails)
    const L = chs[0], R = chs[1];
    let end = L.length - 1;
    while (end > 0 && Math.abs(L[end]) < 1e-4 && Math.abs(R[end]) < 1e-4) end--;
    return { channels: [L.slice(0, end + 1), R.slice(0, end + 1)], sampleRate: 44100, finalT };
  }

  /** render the last pattern + the ending so people can hear it before exporting */
  async function renderEndingPreview(p, ending) {
    const out = await render(p, { song: false, loops: 1, ending });
    const from = Math.max(0, (out.finalT - stepDuration(p) * 16) * 44100) | 0;
    const chs = out.channels.map((c) => c.slice(from));
    const b = new AudioBuffer({ numberOfChannels: 2, length: Math.max(1, chs[0].length), sampleRate: 44100 });
    b.getChannelData(0).set(chs[0]);
    b.getChannelData(1).set(chs[1]);
    return b;
  }

  BL.engine = {
    audio, play, stop, state, refreshMix, scheduleStep, render, renderEndingPreview, ENDINGS, varispeed, noteMidi,
    previewDrum, previewNote, previewBuffer, stopPreviewBuffer, previewPosition,
    onStep(fn) { listeners.add(fn); },
    setProjectGetter(fn) { getProject = fn; },
    analyser() { return graph && graph.analyser; },
    get ctx() { return ctx; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
