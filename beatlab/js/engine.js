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

  /** stereo hall: 18 ms pre-delay, decorrelated L/R, highs die faster than lows (like a real room) */
  function makeIR(c, secs) {
    const sr = c.sampleRate, len = Math.floor(sr * secs), pre = Math.floor(sr * 0.018);
    const b = c.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let lp = 0;
      for (let i = pre; i < len; i++) {
        const t = (i - pre) / (len - pre);
        const n = Math.random() * 2 - 1;
        const k = 0.15 + 0.8 * t; // one-pole damping that closes over time
        lp += (n - lp) * (1 - k);
        const early = i < pre + sr * 0.06 && Math.random() < 0.004 ? (Math.random() * 2 - 1) * 0.8 : 0;
        d[i] = (lp * 1.6 + early) * Math.pow(1 - t, 2.4);
      }
    }
    return b;
  }

  const clipCurves = {};
  function softClip(c, amount) {
    const key = Math.round(amount * 100);
    if (!clipCurves[key]) {
      const n = 2048, cv = new Float32Array(n), a = 1 + amount * 6;
      for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; cv[i] = Math.tanh(a * x) / Math.tanh(a); }
      clipCurves[key] = cv;
    }
    const w = c.createWaveShaper();
    w.curve = clipCurves[key];
    w.oversample = '4x';
    return w;
  }

  function createGraph(c, realtime) {
    const p = getProject() || {};
    const master = c.createGain();
    // master colour chain: low shelf -> high shelf -> low cut -> tone -> saturation -> width -> glue -> limiter
    const lowShelf = c.createBiquadFilter(); lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 110;
    const highShelf = c.createBiquadFilter(); highShelf.type = 'highshelf'; highShelf.frequency.value = 4200;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.Q.value = 0.7;
    const lofi = c.createBiquadFilter(); lofi.type = 'lowpass'; lofi.Q.value = 0.6;
    const drive = c.createWaveShaper(); drive.oversample = '4x';
    const driveGain = c.createGain();
    // stereo width (mid/side): L' = L(1+w)/2 + R(1-w)/2
    const split = c.createChannelSplitter(2), merge = c.createChannelMerger(2);
    const ll = c.createGain(), lr = c.createGain(), rl = c.createGain(), rr = c.createGain();
    split.connect(ll, 0); split.connect(lr, 0); split.connect(rl, 1); split.connect(rr, 1);
    ll.connect(merge, 0, 0); rl.connect(merge, 0, 0); lr.connect(merge, 0, 1); rr.connect(merge, 0, 1);
    const comp = c.createDynamicsCompressor();
    comp.knee.value = 8; comp.attack.value = 0.008; comp.release.value = 0.16;
    const loud = c.createGain();
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -1.2; limiter.knee.value = 0; limiter.ratio.value = 20;
    limiter.attack.value = 0.001; limiter.release.value = 0.05;
    master.connect(lowShelf); lowShelf.connect(highShelf); highShelf.connect(hp); hp.connect(lofi);
    lofi.connect(drive); drive.connect(driveGain); driveGain.connect(split); merge.connect(comp); comp.connect(loud); loud.connect(limiter);
    let analyser = null;
    if (realtime) {
      analyser = c.createAnalyser();
      analyser.fftSize = 2048;
      limiter.connect(analyser);
    }
    limiter.connect(c.destination);
    const revIn = c.createGain();
    const revHp = c.createBiquadFilter(); revHp.type = 'highpass'; revHp.frequency.value = 220;
    const conv = c.createConvolver();
    conv.buffer = makeIR(c, 2.8);
    const revOut = c.createGain();
    revOut.gain.value = 0.85;
    revIn.connect(revHp); revHp.connect(conv); conv.connect(revOut); revOut.connect(master);
    const preview = c.createGain();
    preview.gain.value = 0.9;
    preview.connect(master);
    const g = { ctx: c, master, lowShelf, highShelf, hp, lofi, drive, driveGain, width: { ll, lr, rl, rr }, comp, loud, limiter, analyser, revIn, preview, strips: {}, voices: {} };
    applyMaster(g, p);
    return g;
  }

  /** p.master.color: { low, high (dB shelves), hp, lp (Hz), drive 0-1, width 0-1.6, loud 0-1 } */
  function applyMaster(g, p) {
    const m = (p && p.master) || {};
    const col = m.color || {};
    const punch = m.punch == null ? 0.5 : m.punch;
    g.master.gain.value = m.vol == null ? 0.85 : m.vol;
    g.comp.threshold.value = -6 - punch * 22;
    g.comp.ratio.value = 1.5 + punch * 5;
    g.lowShelf.gain.value = col.low || 0;
    g.highShelf.gain.value = col.high || 0;
    g.hp.frequency.value = col.hp || 18;
    g.lofi.frequency.value = m.lofi ? 3800 : col.lp || 20000;
    const dr = col.drive || 0;
    g.drive.curve = dr > 0.01 ? softClip(g.ctx, dr).curve : null;
    g.driveGain.gain.value = dr > 0.01 ? 1 / (1 + dr * 0.8) : 1;
    const w = col.width == null ? 1 : col.width;
    g.width.ll.gain.value = (1 + w) / 2; g.width.rr.gain.value = (1 + w) / 2;
    g.width.lr.gain.value = (1 - w) / 2; g.width.rl.gain.value = (1 - w) / 2;
    g.loud.gain.value = Math.pow(10, ((col.loud || 0) * 9) / 20);
  }

  /** each channel: drive -> tone (low-pass) -> low-cut -> pan, plus a reverb send */
  function stripFor(g, track, anySolo) {
    let s = g.strips[track.id];
    const c = g.ctx;
    if (!s) {
      const input = c.createGain();
      const drive = c.createWaveShaper(); drive.oversample = '2x';
      const tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.Q.value = 0.5;
      const lowcut = c.createBiquadFilter(); lowcut.type = 'highpass'; lowcut.Q.value = 0.6;
      const pan = c.createStereoPanner ? c.createStereoPanner() : c.createGain();
      const send = c.createGain();
      input.connect(drive); drive.connect(tone); tone.connect(lowcut); lowcut.connect(pan); pan.connect(g.master);
      lowcut.connect(send);
      send.connect(g.revIn);
      s = g.strips[track.id] = { input, drive, tone, lowcut, pan, send, dk: -1 };
    }
    const audible = !track.mute && (!anySolo || track.solo);
    const vol = track.vol == null ? 0.8 : track.vol;
    const dr = track.drive || 0;
    s.input.gain.value = audible ? (vol * vol * 1.4) / (1 + dr * 0.6) : 0;
    if (s.dk !== dr) { s.drive.curve = dr > 0.01 ? softClip(c, dr).curve : null; s.dk = dr; }
    s.tone.frequency.value = track.tone || 20000;
    s.lowcut.frequency.value = track.lowcut || 10;
    if (s.pan.pan) s.pan.pan.value = track.pan || 0;
    s.send.gain.value = (track.rev || 0) * 0.9;
    s.audible = audible;
    return s;
  }

  function soloing(p) {
    return p.tracks.some((t) => t.solo) || (p.lanes || []).some((l) => l.solo);
  }

  function refreshMix() {
    const p = getProject();
    if (!graph || !p) return;
    const anySolo = soloing(p);
    for (const t of p.tracks) stripFor(graph, t, anySolo);
    for (const l of p.lanes || []) stripFor(graph, l, anySolo);
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
    const anySolo = soloing(p);
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

  /** length of the arrangement in steps (end of the last clip, at least one bar) */
  function songSteps(p) {
    let end = 16;
    for (const c of p.clips || []) end = Math.max(end, Math.round((c.start + c.len) * 16));
    return end;
  }

  /** play one 16th-note step of the Playlist: every clip that covers it */
  function scheduleAbs(g, p, abs, t, sd, startAbs) {
    const patSteps = p.bars * 16;
    const anySolo = soloing(p);
    for (const c of p.clips || []) {
      const s0 = Math.round(c.start * 16), s1 = Math.round((c.start + c.len) * 16);
      if (abs < s0 || abs >= s1) continue;
      const lane = (p.lanes || []).find((l) => l.id === c.lane);
      if (lane) { const st = stripFor(g, lane, anySolo); if (!st.audible) continue; }
      if (c.kind === 'pattern') {
        const local = abs - s0;
        const step = local % patSteps;
        scheduleStep(g, p, p.patterns[c.pat], step, t + swingOffset(p, step), sd, local);
      } else if (c.kind === 'audio') {
        if (abs !== s0 && abs !== startAbs) continue;
        const buf = BL.media && BL.media.audioBuffer(c.audio);
        if (!buf || !lane) continue;
        const offset = (c.offset || 0) + (abs - s0) * sd;
        if (offset >= buf.duration - 0.01) continue;
        const dur = Math.min((s1 - abs) * sd, buf.duration - offset);
        const ch = chokeNode(g.ctx, stripFor(g, lane, anySolo).input);
        playBuffer(g.ctx, ch, buf, t, { offset, dur, vel: 1 });
        g.voices['clip:' + c.id] = { choke: ch, end: t + dur };
      }
    }
  }

  function tick() {
    const p = getProject();
    if (!p || !state.playing) return;
    const ahead = 0.14;
    while (state.nextTime < ctx.currentTime + ahead) {
      const sd = stepDuration(p);
      if (p.songMode) {
        const total = songSteps(p);
        if (state.abs >= total) {
          state.abs = 0;
          Object.values(graph.voices).forEach((v) => choke(v, state.nextTime));
          graph.voices = {};
          state.startAbs = 0;
        }
        scheduleAbs(graph, p, state.abs, state.nextTime, sd, state.startAbs);
        uiQueue.push({ time: state.nextTime, abs: state.abs, song: true });
        state.abs++;
      } else {
        const steps = p.bars * 16;
        if (state.step >= steps) state.step = 0;
        const t = state.nextTime + swingOffset(p, state.step);
        scheduleStep(graph, p, p.patterns[p.current], state.step, t, sd, state.abs);
        uiQueue.push({ time: state.nextTime, step: state.step, abs: state.abs, song: false });
        state.abs++;
        state.step++;
        if (state.step >= steps) state.step = 0;
      }
      state.nextTime += sd;
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

  function play(fromStep) {
    audio();
    if (state.playing) return;
    refreshMix();
    state.playing = true;
    state.step = 0;
    state.abs = fromStep || 0;
    state.startAbs = state.abs;
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
    const song = !!opts.song;
    const order = new Array(opts.loops || 4).fill(p.current);
    const ending = opts.ending || 'none';
    const sd = stepDuration(p);
    const steps = p.bars * 16;
    const songLen = song ? songSteps(p) * sd : order.length * steps * sd;
    const total = songLen + (ending === 'slowmo' ? 7 : 3);
    const OAC = root.OfflineAudioContext || root.webkitOfflineAudioContext;
    const oc = new OAC(2, Math.ceil(total * 44100), 44100);
    const prevGet = getProject;
    getProject = () => p;
    const g = createGraph(oc, false);
    getProject = prevGet;
    let t = 0.05, abs = 0;
    if (song) {
      const n = songSteps(p);
      for (abs = 0; abs < n; abs++) { scheduleAbs(g, p, abs, t, sd, 0); t += sd; }
    } else {
      for (const idx of order) {
        for (let st = 0; st < steps; st++) {
          scheduleStep(g, p, p.patterns[idx], st, t + swingOffset(p, st), sd, abs++);
          t += sd;
        }
      }
    }
    const finalT = t;
    if (ending === 'slowmo') {
      // one last downbeat (kick, 808, chord, sample) plus a boom, which then gets slowed right down
      const first = song ? ((p.clips || []).filter((c) => c.kind === 'pattern').sort((a, b) => a.start - b.start)[0] || { pat: p.current }).pat : order[0];
      scheduleStep(g, p, p.patterns[first], 0, finalT, sd, 0);
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
    audio, play, stop, state, refreshMix, scheduleStep, scheduleAbs, songSteps, render, renderEndingPreview, ENDINGS, varispeed, noteMidi,
    previewDrum, previewNote, previewBuffer, stopPreviewBuffer, previewPosition,
    onStep(fn) { listeners.add(fn); },
    setProjectGetter(fn) { getProject = fn; },
    analyser() { return graph && graph.analyser; },
    get ctx() { return ctx; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
