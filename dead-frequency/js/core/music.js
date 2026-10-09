'use strict';
// Procedural songs for KTLR's playlist + the broadcast chain (program -> transmitter -> receivers).
// Every song and artist here is fictional.

const SONGS = {
  highway_hymnal:  { title: 'Highway Hymnal', artist: 'The Dalton Brothers', year: 1998, style: 'country', bpm: 112, root: 55, minor: false, seed: 11, bars: 56 },
  cold_front:      { title: 'Cold Front', artist: 'Wren Avenue', year: 2003, style: 'rock', bpm: 128, root: 52, minor: true, seed: 22, bars: 64 },
  porch_light:     { title: 'Porch Light', artist: 'Shelby Cain', year: 2001, style: 'ballad', bpm: 72, root: 57, minor: false, seed: 33, bars: 40 },
  kerosene_summer: { title: 'Kerosene Summer', artist: 'Tommy Lee Harlan', year: 1996, style: 'country', bpm: 118, root: 50, minor: false, seed: 44, bars: 56 },
  glass_houses:    { title: 'Glass Houses in July', artist: 'The Northerlies', year: 2002, style: 'pop', bpm: 108, root: 60, minor: false, seed: 55, bars: 56 },
  diesel_prayer:   { title: 'Diesel Prayer', artist: 'Colt Ramsey', year: 2000, style: 'country', bpm: 104, root: 52, minor: false, seed: 66, bars: 52 },
  paper_moon:      { title: 'Paper Moon Motel', artist: 'June Callaway', year: 1994, style: 'ballad', bpm: 68, root: 53, minor: true, seed: 77, bars: 40 },
  turnpike_hearts: { title: 'Turnpike Hearts', artist: 'Mercy Lane', year: 2004, style: 'pop', bpm: 116, root: 62, minor: false, seed: 88, bars: 60 },
  whiskey_wire:    { title: 'Whiskey & Wire', artist: 'Red Ash Revival', year: 1999, style: 'rock', bpm: 122, root: 50, minor: false, seed: 99, bars: 60 },
  northbound:      { title: 'Northbound', artist: 'Carly Ames', year: 2003, style: 'country', bpm: 120, root: 57, minor: false, seed: 101, bars: 56 },
  slow_burn:       { title: 'Slow Burn Avenue', artist: 'The Halfway Kings', year: 1997, style: 'rock', bpm: 96, root: 52, minor: true, seed: 202, bars: 52 },
  if_you_call:     { title: 'If You Call Tonight', artist: 'Danielle Rourke', year: 2004, style: 'ballad', bpm: 76, root: 55, minor: false, seed: 303, bars: 44 },
  gravel_road:     { title: 'Gravel Road Gospel', artist: 'Wade Kimmel', year: 1993, style: 'country', bpm: 100, root: 48, minor: false, seed: 404, bars: 52 },
  static_love:     { title: 'Static Love', artist: 'Polaroid Kids', year: 2004, style: 'pop', bpm: 124, root: 57, minor: true, seed: 505, bars: 60 },
  harbor_lights:   { title: 'Harbor Lights', artist: 'Marian Tell', year: 1979, style: 'waltz', bpm: 84, root: 52, minor: true, seed: 1979, bars: 48, beatsPerBar: 3, vinyl: true },
  nocturne:        { title: 'Nocturne in E-flat', artist: 'KSOR Classical', year: 0, style: 'classical', bpm: 60, root: 51, minor: false, seed: 606, bars: 64 },
};

const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// --- instruments: (S, out, t, ...) ---
const INST = {
  pad(S, out, t, notes, dur, v = 0.05, cut = 1400) {
    const f = S.filt('lowpass', cut, 0.6); const g = S.gain(0); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + Math.min(0.4, dur * 0.3)); g.gain.setValueAtTime(v, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
    for (const m of notes) for (const dt of [-7, 7]) { const o = S.osc('sawtooth', mtof(m)); o.detune.value = dt; o.connect(f); o.start(t); o.stop(t + dur + 0.05); }
  },
  pluck(S, out, t, m, dur, v = 0.06, bright = 2600) {
    const o = S.osc('sawtooth', mtof(m)); const f = S.filt('lowpass', bright, 1); const g = S.gain(0);
    o.connect(f); f.connect(g); g.connect(out);
    f.frequency.setValueAtTime(bright, t); f.frequency.exponentialRampToValueAtTime(400, t + Math.min(dur, 0.6));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.start(t); o.stop(t + dur + 0.05);
  },
  strum(S, out, t, notes, dur, v = 0.035, down = true) {
    const arr = down ? notes : [...notes].reverse();
    arr.forEach((m, i) => INST.pluck(S, out, t + i * 0.012, m, dur, v, 3000));
  },
  bass(S, out, t, m, dur, v = 0.13) {
    const o = S.osc('triangle', mtof(m)); const o2 = S.osc('sine', mtof(m)); const g = S.gain(0); const f = S.filt('lowpass', 700, 1);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(v * 0.4, t + dur * 0.6); g.gain.linearRampToValueAtTime(0, t + dur);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  },
  piano(S, out, t, m, dur, v = 0.06) {
    const fq = mtof(m); const g = S.gain(0); g.connect(out);
    for (const [h, a] of [[1, 1], [2, 0.35], [3, 0.15], [4, 0.06]]) { const o = S.osc(h === 1 ? 'triangle' : 'sine', fq * h); const og = S.gain(a); o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.05); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(v * 0.25, t + 0.4); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  },
  vibe(S, out, t, m, dur, v = 0.04) {
    const o = S.osc('sine', mtof(m)); const g = S.gain(0); const trem = S.osc('sine', 5.5); const tg = S.gain(v * 0.4);
    trem.connect(tg); tg.connect(g.gain); o.connect(g); g.connect(out);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.start(t); trem.start(t); o.stop(t + dur + 0.05); trem.stop(t + dur + 0.05);
  },
  steel(S, out, t, m, dur, v = 0.045) { // pedal steel-ish slide
    const o = S.osc('sine', mtof(m - 1)); const o2 = S.osc('triangle', mtof(m - 1) * 2); const g = S.gain(0); const og2 = S.gain(0.2);
    o.connect(g); o2.connect(og2); og2.connect(g); g.connect(out);
    o.frequency.setValueAtTime(mtof(m - 1), t); o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.18);
    o2.frequency.setValueAtTime(mtof(m - 1) * 2, t); o2.frequency.exponentialRampToValueAtTime(mtof(m) * 2, t + 0.18);
    const vib = S.osc('sine', 5); const vg = S.gain(mtof(m) * 0.008); vib.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.12); g.gain.setValueAtTime(v, t + dur * 0.7); g.gain.linearRampToValueAtTime(0, t + dur);
    o.start(t); o2.start(t); vib.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
  },
  lead(S, out, t, m, dur, v = 0.035) {
    const o = S.osc('square', mtof(m)); const f = S.filt('lowpass', 1800, 1); const g = S.gain(0);
    o.connect(f); f.connect(g); g.connect(out);
    const vib = S.osc('sine', 5.5); const vg = S.gain(mtof(m) * 0.006); vib.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.02); g.gain.setValueAtTime(v * 0.8, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
    o.start(t); vib.start(t); o.stop(t + dur + 0.05); vib.stop(t + dur + 0.05);
  },
  dist(S, out, t, notes, dur, v = 0.03) { // power chord, overdriven
    if (!S._ws) { S._ws = S.ctx.createWaveShaper(); const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = Math.tanh(x * 6); } S._wsCurve = c; }
    const ws = S.ctx.createWaveShaper(); ws.curve = S._wsCurve;
    const f = S.filt('lowpass', 2200, 0.8); const g = S.gain(0);
    ws.connect(f); f.connect(g); g.connect(out);
    for (const m of notes) { const o = S.osc('sawtooth', mtof(m)); const og = S.gain(0.4); o.connect(og); og.connect(ws); o.start(t); o.stop(t + dur + 0.05); }
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.setValueAtTime(v * 0.7, t + dur * 0.85); g.gain.linearRampToValueAtTime(0, t + dur);
  },
  kick(S, out, t, v = 0.5) { const o = S.osc('sine', 120); const g = S.gain(0); o.connect(g); g.connect(out); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.start(t); o.stop(t + 0.32); },
  snare(S, out, t, v = 0.22) { S.burst(out, t, 0.18, 'bandpass', 1800, 0.6, v); S.tone(out, t, 0.08, 'triangle', 190, v * 0.6); },
  brush(S, out, t, v = 0.08) { S.burst(out, t, 0.2, 'highpass', 2500, 0.5, v, 0.02); },
  hat(S, out, t, v = 0.06, open = false) { S.burst(out, t, open ? 0.25 : 0.04, 'highpass', 7000, 0.7, v); },
  rim(S, out, t, v = 0.1) { S.burst(out, t, 0.03, 'bandpass', 3200, 4, v); },
};

const PROGS = {
  major: [[0, 7, 9, 5], [0, 5, 7, 5], [0, 9, 5, 7], [9, 5, 0, 7], [0, 5, 0, 7], [0, 4, 5, 7]],
  minor: [[0, 8, 3, 10], [0, 5, 10, 3], [0, 10, 8, 10], [0, 3, 8, 7], [0, 8, 5, 7]],
};
function chordNotes(root, deg, minorKey) {
  // triad on scale-relative semitone offset; quality from diatonic context
  const majDeg = { 0: 'M', 2: 'm', 4: 'm', 5: 'M', 7: 'M', 9: 'm', 10: 'M', 3: 'M', 8: 'M' };
  const minDeg = { 0: 'm', 3: 'M', 5: 'm', 7: 'M', 8: 'M', 10: 'M', 2: 'd' };
  const q = (minorKey ? minDeg : majDeg)[deg] || 'M';
  const r = root + deg;
  return q === 'M' ? [r, r + 4, r + 7] : q === 'm' ? [r, r + 3, r + 7] : [r, r + 3, r + 6];
}

class SongPlayer {
  constructor(id, out, startAt) {
    this.id = id; this.def = SONGS[id]; this.out = out;
    const d = this.def;
    this.bpb = d.beatsPerBar || 4;
    this.spb = 60 / d.bpm;
    this.totalBeats = d.bars * this.bpb;
    this.duration = this.totalBeats * this.spb + 1.5;
    this.startAt = startAt;
    this.beat = 0;
    this.nextT = startAt;
    const rnd = U.seeded(d.seed);
    this.rnd = rnd;
    const progs = d.minor ? PROGS.minor : PROGS.major;
    this.progVerse = progs[Math.floor(rnd() * progs.length)];
    this.progChorus = progs[Math.floor(rnd() * progs.length)];
    const scale = d.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
    this.scale = scale;
    // melodic motifs: arrays of [scaleDegree or null, lengthInBeats]
    const motif = (len, lift) => { const m = []; let b = 0; while (b < len) { const l = [0.5, 1, 1, 1.5, 2][Math.floor(rnd() * 5)]; m.push([rnd() < 0.15 ? null : Math.floor(rnd() * 6) + lift, Math.min(l, len - b)]); b += l; } return m; };
    this.mVerse = motif(this.bpb * 2, 0); this.mVerse2 = motif(this.bpb * 2, 0);
    this.mChorus = motif(this.bpb * 2, 2); this.mChorus2 = motif(this.bpb * 2, 3);
    this.stopped = false;
  }
  section(bar) {
    const B = this.def.bars;
    if (bar < 4) return 'intro';
    if (bar >= B - 4) return 'outro';
    const k = Math.floor((bar - 4) / 8) % 5;
    return ['verse', 'chorus', 'verse', 'chorus', 'bridge'][k];
  }
  schedule(S, until) {
    while (!this.stopped && this.nextT < until && this.beat < this.totalBeats) {
      this.playBeat(S, this.beat, this.nextT);
      this.beat++; this.nextT += this.spb;
    }
  }
  playBeat(S, i, t) {
    const d = this.def, bpb = this.bpb, spb = this.spb, out = this.out;
    const bar = Math.floor(i / bpb), b = i % bpb, sec = this.section(bar);
    const prog = (sec === 'chorus' || sec === 'bridge') ? this.progChorus : this.progVerse;
    const deg = prog[bar % prog.length];
    const ch = chordNotes(d.root, deg, d.minor);
    const bassN = d.root - 12 + deg;
    const fade = sec === 'outro' ? Math.max(0.15, 1 - (bar - (d.bars - 4)) / 4 - b / (bpb * 4)) : 1;
    const o = S.gain(fade); o.connect(out); setTimeout(() => { try { o.disconnect(); } catch (e) { /* */ } }, (t - S.now() + spb * 4) * 1000 + 500);
    const melody = (mot) => { let acc = 0; for (const [deg2, len] of mot) { const pos = acc; acc += len; const beatInPhrase = (bar % 2) * bpb + b; if (Math.abs(pos - beatInPhrase) < 0.01 || (pos > beatInPhrase && pos < beatInPhrase + 1)) { if (deg2 == null) continue; const oct = Math.floor(deg2 / 7); const n = d.root + 12 + this.scale[deg2 % 7] + oct * 12; const tt = t + (pos - beatInPhrase) * spb; return [n, tt, len * spb * 0.95]; } } return null; };
    const phrase = (sec === 'chorus') ? ((Math.floor(bar / 2) % 2) ? this.mChorus2 : this.mChorus) : ((Math.floor(bar / 2) % 2) ? this.mVerse2 : this.mVerse);
    // collect all melody notes starting within this beat
    const melNotes = [];
    { let acc = 0; const beatInPhrase = (bar % 2) * bpb + b; for (const [dg, len] of phrase) { const pos = acc; acc += len; if (pos >= beatInPhrase && pos < beatInPhrase + 1 && dg != null) { const n = d.root + 12 + this.scale[dg % 7] + Math.floor(dg / 7) * 12; melNotes.push([n, t + (pos - beatInPhrase) * spb, len * spb * 0.95]); } } }
    void melody;
    const playMel = sec !== 'intro' && sec !== 'outro' && sec !== 'bridge';

    switch (d.style) {
      case 'country': {
        if (b === 0 || b === 2) INST.bass(S, o, t, b === 0 ? bassN : bassN + 7, spb * 0.9);
        if (b === 1 || b === 3) { INST.strum(S, o, t, ch.map(n => n + 12), spb * 0.8, 0.03); INST.snare(S, o, t, 0.12); }
        if (b === 0 || b === 2) INST.kick(S, o, t, 0.35);
        INST.hat(S, o, t + spb / 2, 0.025);
        if (playMel) for (const [n, tt, len] of melNotes) INST.steel(S, o, tt, n, len, 0.04);
        if (sec === 'bridge' && b === 0) INST.steel(S, o, t, ch[2] + 12, spb * 3.5, 0.04);
        break;
      }
      case 'rock': {
        INST.kick(S, o, t, b % 2 === 0 ? 0.5 : 0.0001);
        if (b % 2 === 1) INST.snare(S, o, t, 0.2);
        INST.hat(S, o, t, 0.04); INST.hat(S, o, t + spb / 2, 0.03);
        INST.bass(S, o, t, bassN, spb * 0.45, 0.12); INST.bass(S, o, t + spb / 2, bassN, spb * 0.45, 0.1);
        if (sec !== 'intro' || bar >= 2) INST.dist(S, o, t, [ch[0], ch[0] + 7, ch[0] + 12], spb * 0.95, sec === 'chorus' ? 0.03 : 0.02);
        if (playMel) for (const [n, tt, len] of melNotes) INST.lead(S, o, tt, n, len, 0.028);
        break;
      }
      case 'ballad': {
        if (b === 0) { INST.pad(S, o, t, ch, spb * bpb, 0.025, 900); INST.bass(S, o, t, bassN, spb * 2, 0.1); }
        const arp = [ch[0], ch[1], ch[2], ch[1] + 12][b]; INST.piano(S, o, t, arp + 12, spb * 1.8, 0.04);
        if (sec === 'chorus') { if (b === 0 || b === 2) INST.kick(S, o, t, 0.25); if (b === 1 || b === 3) INST.brush(S, o, t, 0.06); }
        if (playMel) for (const [n, tt, len] of melNotes) INST.vibe(S, o, tt, n + 12, len * 1.4, 0.03);
        break;
      }
      case 'pop': {
        INST.kick(S, o, t, 0.45); if (b % 2 === 1) INST.snare(S, o, t, 0.16);
        INST.hat(S, o, t + spb / 2, 0.035);
        INST.bass(S, o, t, bassN, spb * 0.5); INST.bass(S, o, t + spb * 0.75, bassN + 12, spb * 0.2, 0.08);
        for (let k = 0; k < 2; k++) INST.pluck(S, o, t + k * spb / 2, ch[(b * 2 + k) % 3] + 12, spb * 0.4, 0.03, 2200);
        if (b === 0) INST.pad(S, o, t, ch, spb * bpb, 0.015, 1100);
        if (playMel) for (const [n, tt, len] of melNotes) INST.lead(S, o, tt, n, len, 0.025);
        break;
      }
      case 'waltz': { // Harbor Lights — slow 3/4, piano + strings + vibraphone
        if (b === 0) { INST.bass(S, o, t, bassN, spb * 1.2, 0.09); INST.pad(S, o, t, ch.map(n => n + 12), spb * 3, 0.022, 1000); }
        else INST.piano(S, o, t, ch[b] + 12, spb * 0.9, 0.035);
        if (b === 0) INST.brush(S, o, t, 0.03);
        if (playMel || sec === 'bridge') for (const [n, tt, len] of melNotes) INST.vibe(S, o, tt, n + 12, len * 1.6, 0.04);
        break;
      }
      case 'classical': {
        if (b === 0) INST.pad(S, o, t, [ch[0] - 12, ...ch], spb * 4, 0.02, 800);
        INST.piano(S, o, t, ch[b % 3] + 12 + (b === 3 ? 12 : 0), spb * 2, 0.03);
        if (playMel) for (const [n, tt, len] of melNotes) INST.piano(S, o, tt, n + 12, len * 1.5, 0.035);
        break;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// The broadcast chain.
const Radio = {
  ready: false,
  onAir: true,          // transmitter state
  speakers: new Set(),
  player: null,
  queue: [],
  history: [],
  rotation: ['highway_hymnal', 'cold_front', 'porch_light', 'kerosene_summer', 'glass_houses', 'northbound', 'paper_moon', 'whiskey_wire', 'turnpike_hearts', 'gravel_road', 'slow_burn', 'if_you_call', 'static_love'],
  rotIdx: 0,
  playing: false,
  gap: 0,

  init() {
    if (this.ready || !SND.ready) return;
    const S = SND, ctx = S.ctx;
    this.program = S.gain(1);           // what the station sends to the transmitter
    this.musicIn = S.gain(0.9); this.musicIn.connect(this.program);
    this.voiceIn = S.gain(1); this.voiceIn.connect(this.program);
    this.whisperIn = S.gain(0); this.whisperIn.connect(this.program);
    this.air = S.gain(1); this.program.connect(this.air);     // gated by transmitter
    // receiver static
    const n = S.noiseSrc('white', true); const f = S.filt('bandpass', 2400, 0.35);
    this.staticOut = S.gain(0.22); n.connect(f); f.connect(this.staticOut); n.start();
    // other stations a car radio can tune to
    this.feeds = {};
    this.feeds.preacher = S.gain(1);
    const m = LOOPS.murmur(S, this.feeds.preacher); m.set('talk', true); this._preacher = m;
    this.feeds.classical = S.gain(0.8);
    this.classical = new SongPlayer('nocturne', this.feeds.classical, S.now() + 0.1);
    // whisper generator (a woman whispering into a mic far from the station)
    this.whisperGen = LOOPS.murmur(S, this.whisperIn);
    this._wf = S.filt('highpass', 900, 0.7);
    this.ready = true;
    this._tick = setInterval(() => this.schedule(), 60);
  },

  // -------- speakers --------
  // kind: 'monitor' (station speakers: program when on-air, faint hiss when off) | 'radio' (receiver: tuned feed or static)
  addSpeaker(o = {}) {
    if (!this.ready) return LOOP_DUMMY;
    const S = SND;
    const input = S.gain(1);
    const tone = S.filt('bandpass', o.small ? 1400 : 1000, o.small ? 0.9 : 0.25);
    const lo = S.filt('highpass', o.small ? 250 : 70, 0.7);
    const vol = S.gain(0);
    input.connect(lo); lo.connect(tone); tone.connect(vol);
    let panner = null, occ = null;
    if (o.pos) {
      panner = S.panner(o.pos, o.ref || 2, o.rolloff || 1.3, 50);
      occ = S.filt('lowpass', 20000, 0.5);
      vol.connect(occ); occ.connect(panner); panner.connect(S.bus.amb);
      if (o.verb !== false) panner.connect(S.reverbSend);
    } else vol.connect(o.bus ? S.bus[o.bus] : S.bus.radio);
    // feed mixers
    const gAir = S.gain(0), gStatic = S.gain(0), gPre = S.gain(0), gCla = S.gain(0), gProg = S.gain(0);
    this.air.connect(gAir); this.staticOut.connect(gStatic); this.feeds.preacher.connect(gPre); this.feeds.classical.connect(gCla); this.program.connect(gProg);
    for (const g of [gAir, gStatic, gPre, gCla, gProg]) g.connect(input);
    const h = {
      kind: o.kind || 'monitor', tune: o.tune || 94.1, reception: o.reception == null ? 1 : o.reception, o, pos: o.pos ? o.pos.clone() : null,
      vol, occ, panner, base: o.vol == null ? 0.5 : o.vol, occluded: false, alive: true, direct: !!o.direct,
      gAir, gStatic, gPre, gCla, gProg,
      volume(v, ramp = 0.3) { this.base = v; vol.gain.setTargetAtTime(this.occluded ? v * 0.45 : v, S.now(), ramp / 3); return this; },
      setPos(p) { if (panner) { this.pos.copy(p); S.setPannerPos(panner, p); } return this; },
      set(k, v) { if (k === 'tune') this.tune = v; if (k === 'reception') this.reception = v; Radio.route(this); return this; },
      stop() { if (!this.alive) return; this.alive = false; Radio.speakers.delete(this); S.loops.delete(this); vol.gain.setTargetAtTime(0, S.now(), 0.05); setTimeout(() => { try { vol.disconnect(); for (const g of [gAir, gStatic, gPre, gCla, gProg]) g.disconnect(); if (panner) panner.disconnect(); } catch (e) { /* */ } }, 400); },
    };
    vol.gain.setTargetAtTime(h.base, S.now(), 0.1);
    this.speakers.add(h);
    if (o.pos) S.loops.add(h); // reuse occlusion
    this.route(h);
    return h;
  },
  route(h) {
    const S = SND, t = S.now(), k = 0.08;
    let air = 0, st = 0, pre = 0, cla = 0, prog = 0;
    if (h.direct) prog = 1; // headphones in the studio: straight program feed
    else if (h.kind === 'monitor') { if (this.onAir) air = 1; else st = 0.12; }
    else {
      const tune = h.tune, rec = h.reception;
      if (Math.abs(tune - 94.1) < 0.05) { if (this.onAir) { air = rec; st = (1 - rec) * 0.9; } else st = 1; }
      else if (Math.abs(tune - 88.3) < 0.05) { pre = 0.7 * rec; st = 0.4 + (1 - rec) * 0.5; }
      else if (Math.abs(tune - 101.5) < 0.05) { cla = 0.8 * rec; st = 0.25 + (1 - rec) * 0.5; }
      else st = 1;
    }
    h.gAir.gain.setTargetAtTime(air, t, k); h.gStatic.gain.setTargetAtTime(st, t, k); h.gPre.gain.setTargetAtTime(pre, t, k); h.gCla.gain.setTargetAtTime(cla, t, k); h.gProg.gain.setTargetAtTime(prog, t, k);
  },
  setOnAir(on) { this.onAir = on; for (const h of this.speakers) this.route(h); Bus.emit('onair', on); },
  setWhisper(level) { if (!this.ready) return; this.whisperIn.gain.setTargetAtTime(level, SND.now(), 0.5); this.whisperGen.set('talk', level > 0.001); },
  // voice on the air (DJ, liners, intruder) — murmur through the program
  voice(on) {
    if (!this.ready) return;
    if (!this._voice) this._voice = LOOPS.murmur(SND, this.voiceIn);
    this._voice.set('talk', on);
    this.musicIn.gain.setTargetAtTime(on ? 0.3 : 0.9, SND.now(), 0.2);
  },
  duck(v) { if (this.ready) this.musicIn.gain.setTargetAtTime(v, SND.now(), 0.3); },

  // -------- automation --------
  start(songId) {
    this.playing = true;
    if (songId) this.playNow(songId);
    else this.next();
  },
  stop() { this.playing = false; if (this.player) { this.player.stopped = true; this.player = null; } },
  playNow(id, offset = 0) {
    if (!this.ready) return;
    if (this.player) this.player.stopped = true;
    this.player = new SongPlayer(id, this.musicIn, SND.now() + 0.15);
    if (offset) { const skip = Math.floor(offset / this.player.spb); this.player.beat = skip; }
    this.player.startedAt = SND.now() + 0.15 - offset;
    this.history.push(id);
    if (SONGS[id].vinyl) { if (!this._crackle) this._crackle = LOOPS.crackle(SND, this.musicIn); }
    else if (this._crackle) { this._crackle.stop(); this._crackle = null; }
    Bus.emit('songStart', id);
  },
  queueNext(id) { this.queue.unshift(id); Bus.emit('queue'); },
  queueLater(id) { this.queue.push(id); Bus.emit('queue'); },
  next() {
    let id = this.queue.shift();
    if (!id) { id = this.rotation[this.rotIdx % this.rotation.length]; this.rotIdx++; }
    this.playNow(id);
  },
  upcoming(n = 4) {
    const list = [...this.queue]; let k = this.rotIdx;
    while (list.length < n) { list.push(this.rotation[k % this.rotation.length]); k++; }
    return list.slice(0, n);
  },
  info() {
    if (!this.player) return null;
    const el = SND.now() - this.player.startedAt;
    return { id: this.player.id, ...this.player.def, elapsed: Math.max(0, el), duration: this.player.duration, remaining: Math.max(0, this.player.duration - el) };
  },
  schedule() {
    if (!this.ready) return;
    const now = SND.now();
    if (this.player) {
      this.player.schedule(SND, now + 0.3);
      if (now > this.player.startedAt + this.player.duration) {
        const ended = this.player.id; this.player = null;
        Bus.emit('songEnd', ended);
        if (this.playing) { this.gap = now + 1.2; }
      }
    } else if (this.playing && now > this.gap) this.next();
    if (this.classical) {
      this.classical.schedule(SND, now + 0.3);
      if (this.classical.beat >= this.classical.totalBeats) this.classical = new SongPlayer('nocturne', this.feeds.classical, now + 2);
    }
  },
};
