// Adaptive, fully synthesised score. Each chapter has its own instrumentation,
// all built around one recurring five-note motif (D–F–A–G–E): "the Anchor theme".
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rand = (a, b) => a + Math.random() * (b - a);
export const MOTIF = [62, 65, 69, 67, 64]; // D F A G E
// i – VI – III – VII in D minor
const PROG = [[50, 53, 57], [46, 50, 53], [53, 57, 60], [48, 52, 55]];

class Instruments {
  constructor(a) { this.a = a; }
  get ctx() { return this.a.ctx; }
  out(dest, t, dur, peak, a = 0.005, rel = 0.1) {
    const g = this.a.gain(); g.connect(dest);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setTargetAtTime(0.0001, t + a + dur, rel / 3);
    return g;
  }
  send(node, amt) { const s = this.a.gain(amt); node.connect(s); s.connect(this.a.reverb); }

  kick(dest, t, v = 1) {
    const o = this.a.osc('sine', 150), g = this.a.gain();
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.4);
    const c = this.a.noise(this.a.white, false), cf = this.a.filter('highpass', 3000), cg = this.a.gain();
    cg.gain.setValueAtTime(v * 0.25, t); cg.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
    c.connect(cf); cf.connect(cg); cg.connect(dest); c.start(t, rand(0, 2)); c.stop(t + 0.02);
  }
  snare(dest, t, v = 1, tone = 190) {
    const n = this.a.noise(this.a.white, false), f = this.a.filter('bandpass', 2600, 0.8), g = this.a.gain();
    g.gain.setValueAtTime(v * 0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    n.connect(f); f.connect(g); g.connect(dest); n.start(t, rand(0, 3)); n.stop(t + 0.2);
    const o = this.a.osc('triangle', tone), og = this.a.gain();
    o.frequency.exponentialRampToValueAtTime(tone * 0.6, t + 0.08);
    og.gain.setValueAtTime(v * 0.6, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    o.connect(og); og.connect(dest); o.start(t); o.stop(t + 0.12);
    this.send(g, 0.15);
  }
  hat(dest, t, v = 0.3, open = false) {
    const n = this.a.noise(this.a.white, false), f = this.a.filter('highpass', 7500, 0.8), g = this.a.gain();
    const d = open ? 0.22 : 0.035;
    g.gain.setValueAtTime(v * 0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    n.connect(f); f.connect(g); g.connect(dest); n.start(t, rand(0, 3)); n.stop(t + d + 0.02);
  }
  taiko(dest, t, v = 1, pitch = 70) {
    const o = this.a.osc('sine', pitch * 1.6), g = this.a.gain();
    o.frequency.setValueAtTime(pitch * 1.6, t); o.frequency.exponentialRampToValueAtTime(pitch, t + 0.08);
    g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 1);
    const n = this.a.noise(this.a.brown, false), f = this.a.filter('lowpass', 900, 1), ng = this.a.gain();
    ng.gain.setValueAtTime(v * 0.9, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    n.connect(f); f.connect(ng); ng.connect(dest); n.start(t); n.stop(t + 0.3);
    this.send(g, 0.4); this.send(ng, 0.4);
  }
  bass(dest, t, m, dur, v = 0.5, cutoff = 600) {
    const g = this.out(dest, t, dur, v, 0.004, 0.08);
    const f = this.a.filter('lowpass', cutoff, 4); f.connect(g);
    f.frequency.setValueAtTime(cutoff * 3, t); f.frequency.exponentialRampToValueAtTime(cutoff, t + 0.15);
    for (const d of [-8, 8]) { const o = this.a.osc('sawtooth', mtof(m)); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + dur + 0.3); }
    const s = this.a.osc('sine', mtof(m - 12)), sg = this.a.gain(0.8); s.connect(sg); sg.connect(g); s.start(t); s.stop(t + dur + 0.3);
  }
  pluck(dest, t, m, v = 0.2, decay = 0.25, type = 'sawtooth') {
    const g = this.out(dest, t, 0.01, v, 0.002, decay);
    const f = this.a.filter('lowpass', 5000, 3); f.connect(g);
    f.frequency.setValueAtTime(6000, t); f.frequency.exponentialRampToValueAtTime(500, t + decay);
    const o = this.a.osc(type, mtof(m)); o.connect(f); o.start(t); o.stop(t + decay + 0.4);
    this.send(g, 0.25);
  }
  pad(dest, t, notes, dur, v = 0.08, bright = 1400) {
    const g = this.out(dest, t, dur, v, Math.min(1.2, dur * 0.4), 1.5);
    const f = this.a.filter('lowpass', bright, 0.6); f.connect(g);
    for (const m of notes) for (const d of [-12, 0, 11]) {
      const o = this.a.osc('sawtooth', mtof(m)); o.detune.value = d + rand(-3, 3); o.connect(f); o.start(t); o.stop(t + dur + 2);
    }
    this.send(g, 0.5);
  }
  strings(dest, t, notes, dur, v = 0.06, attack = 0.4) {
    const g = this.out(dest, t, dur, v, attack, 0.6);
    const f = this.a.filter('lowpass', 2600, 0.7), f2 = this.a.filter('peaking', 1100, 1); f2.gain.value = 5;
    f.connect(f2); f2.connect(g);
    const vib = this.a.osc('sine', 5.2), vg = this.a.gain(6); vib.connect(vg); vib.start(t); vib.stop(t + dur + 1);
    for (const m of notes) for (const d of [-7, 0, 7]) {
      const o = this.a.osc('sawtooth', mtof(m)); o.detune.value = d; vg.connect(o.detune); o.connect(f); o.start(t); o.stop(t + dur + 1);
    }
    this.send(g, 0.6);
  }
  stab(dest, t, notes, v = 0.1) { // staccato strings / brass hit
    const g = this.out(dest, t, 0.07, v, 0.008, 0.12);
    const f = this.a.filter('lowpass', 3000, 1); f.connect(g);
    for (const m of notes) for (const d of [-6, 6]) { const o = this.a.osc('sawtooth', mtof(m)); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + 0.4); }
    this.send(g, 0.3);
  }
  brass(dest, t, m, dur, v = 0.12) {
    const g = this.out(dest, t, dur, v, 0.06, 0.25);
    const f = this.a.filter('lowpass', 400, 2); f.connect(g);
    f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(2400, t + 0.12); f.frequency.setTargetAtTime(1300, t + 0.15, 0.3);
    for (const [k, d] of [[0, -5], [0, 5], [-12, 0]]) { const o = this.a.osc('sawtooth', mtof(m + k)); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + dur + 0.6); }
    this.send(g, 0.55);
  }
  choir(dest, t, notes, dur, v = 0.05) {
    const g = this.out(dest, t, dur, v, 0.8, 1.2);
    const formants = [[800, 6, 1], [1150, 8, 0.5], [2900, 10, 0.25]];
    const mix = this.a.gain(1); mix.connect(g);
    const src = this.a.gain(1);
    for (const [fq, q, amp] of formants) { const f = this.a.filter('bandpass', fq, q), fg = this.a.gain(amp * 4); src.connect(f); f.connect(fg); fg.connect(mix); }
    for (const m of notes) for (const d of [-9, 0, 9]) { const o = this.a.osc('sawtooth', mtof(m)); o.detune.value = d + rand(-4, 4); o.connect(src); o.start(t); o.stop(t + dur + 1.5); }
    this.send(g, 0.8);
  }
  piano(dest, t, m, v = 0.15, dur = 2.5) {
    const g = this.out(dest, t, 0.01, v, 0.003, dur);
    const car = this.a.osc('sine', mtof(m)), mod = this.a.osc('sine', mtof(m) * 2), mg = this.a.gain(mtof(m) * 1.2);
    mg.gain.setValueAtTime(mtof(m) * 1.5, t); mg.gain.exponentialRampToValueAtTime(mtof(m) * 0.1, t + 1);
    mod.connect(mg); mg.connect(car.frequency); car.connect(g);
    const h = this.a.osc('triangle', mtof(m) * 2.001), hg = this.a.gain(0.15); h.connect(hg); hg.connect(g);
    for (const o of [car, mod, h]) { o.start(t); o.stop(t + dur + 0.5); }
    this.send(g, 0.6);
  }
  musicbox(dest, t, m, v = 0.08, detune = 0) {
    const g = this.out(dest, t, 0.01, v, 0.001, 1.6);
    for (const [r, a] of [[1, 1], [2.76, 0.3], [5.4, 0.12]]) {
      const o = this.a.osc('sine', mtof(m) * r); o.detune.value = detune; const og = this.a.gain(a); o.connect(og); og.connect(g); o.start(t); o.stop(t + 2);
    }
    this.send(g, 0.9);
  }
  drone(dest, t, m, dur, v = 0.08) {
    const g = this.out(dest, t, dur, v, dur * 0.4, dur * 0.4);
    const f = this.a.filter('lowpass', 300, 2); f.connect(g);
    const lfo = this.a.osc('sine', 0.07), lg = this.a.gain(200); lfo.connect(lg); lg.connect(f.frequency); lfo.start(t); lfo.stop(t + dur * 2);
    for (const [k, d] of [[0, 0], [0, 7], [12, -5], [-12, 3], [1, 0]]) { const o = this.a.osc(k === 1 ? 'sine' : 'sawtooth', mtof(m + (k === 1 ? 13 : k))); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + dur * 2); }
    this.send(g, 0.8);
  }
  swell(dest, t, dur, v = 0.3) { // reverse-cymbal style riser
    const n = this.a.noise(this.a.white, false), f = this.a.filter('bandpass', 2000, 0.7), g = this.a.gain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    f.frequency.setValueAtTime(800, t); f.frequency.exponentialRampToValueAtTime(8000, t + dur);
    n.connect(f); f.connect(g); g.connect(dest); n.start(t); n.stop(t + dur + 0.1);
    this.send(g, 0.5);
  }
}

// ---------- tracks ----------
// A track: { bpm, layers: {name: [lo, hi]}, step(i, t, L) } where L[name] is that layer's bus.
const TRACKS = {
  menu: {
    bpm: 70, steps: 16,
    layers: { base: [0, 0.01], motif: [0, 0.01] },
    step(s, t, L, I, bar) {
      const chord = PROG[bar % 4], sp = 60 / this.bpm / 4;
      if (s === 0) { I.pad(L.base, t, chord.map((m) => m + 12), sp * 16, 0.05, 900); I.bass(L.base, t, chord[0] - 12, sp * 14, 0.12, 200); }
      if (bar % 8 < 4) {
        const pat = { 0: 0, 4: 1, 8: 2, 12: 3 };
        if (bar % 2 === 0 && s in pat) I.piano(L.motif, t, MOTIF[pat[s]] + 12, 0.12);
        if (bar % 2 === 1 && s === 0) I.piano(L.motif, t, MOTIF[4] + 12, 0.12, 4);
      } else if (s % 4 === 2) I.piano(L.motif, t, chord[(s / 4 | 0) % 3] + 24, 0.05, 2);
    },
  },

  drive: {
    bpm: 172, steps: 16,
    layers: { pad: [0, 0.05], drums: [0.15, 0.35], bass: [0.3, 0.5], lead: [0.6, 0.8], perc: [0.75, 0.95] },
    step(s, t, L, I, bar) {
      const chord = PROG[(bar >> 1) % 4], sp = 60 / this.bpm / 4;
      if (s === 0 && bar % 2 === 0) I.pad(L.pad, t, chord.map((m) => m + 12), sp * 32, 0.035, 1800);
      // two-step breakbeat
      const K = [0, 10], S = [4, 12], ghost = [7, 15];
      if (K.includes(s) || (s === 6 && bar % 2)) I.kick(L.drums, t, 0.9);
      if (S.includes(s)) I.snare(L.drums, t, 0.8);
      if (ghost.includes(s) && Math.random() < 0.6) I.snare(L.drums, t, 0.18);
      if (s % 2 === 0) I.hat(L.drums, t, s % 4 === 2 ? 0.35 : 0.2, s === 14);
      // reese bass
      if (s === 0) I.bass(L.bass, t, chord[0] - 12, sp * 6, 0.32, 380);
      if (s === 8) I.bass(L.bass, t, chord[0] - 12, sp * 3, 0.28, 380);
      if (s === 11) I.bass(L.bass, t, chord[1] - 12, sp * 4, 0.28, 420);
      // lead: motif on 8ths every 4 bars, arpeggio otherwise
      if (bar % 4 < 2) {
        const i = s / 2 | 0;
        if (s % 2 === 0 && i < 5 && bar % 4 === 0) I.pluck(L.lead, t, MOTIF[i] + 12, 0.14, 0.35, 'square');
        if (bar % 4 === 1 && s === 0) I.pluck(L.lead, t, MOTIF[4] + 12, 0.14, 0.9, 'square');
      } else if (s % 2 === 1) I.pluck(L.lead, t, chord[(s >> 1) % 3] + 24, 0.06, 0.15);
      if (s % 4 === 3) I.hat(L.perc, t, 0.25, false);
      if (s === 14 && bar % 4 === 3) I.swell(L.perc, t - sp * 12, sp * 14, 0.12);
      if (s === 0 && bar % 8 === 0) I.taiko(L.perc, t, 0.6, 55);
    },
  },

  naval: {
    bpm: 96, steps: 16,
    layers: { drone: [0, 0.05], ostinato: [0.15, 0.35], drums: [0.35, 0.55], brass: [0.55, 0.75], choir: [0.8, 1] },
    step(s, t, L, I, bar) {
      const chord = PROG[bar % 4], sp = 60 / this.bpm / 4;
      if (s === 0) { I.strings(L.drone, t, [chord[0] - 12, chord[0]], sp * 16, 0.04, 1); }
      // 16th-note low string ostinato: root, root, fifth, root...
      const ost = [0, 0, 7, 0, 0, 7, 0, 12, 0, 0, 7, 0, 3, 0, 7, 5];
      I.stab(L.ostinato, t, [chord[0] - 12 + ost[s]], s % 4 === 0 ? 0.09 : 0.055);
      if ([0, 3, 6, 10, 12].includes(s)) I.taiko(L.drums, t, s === 0 ? 1 : 0.6, s === 0 ? 50 : 72);
      if (s === 8) I.snare(L.drums, t, 0.4, 140);
      if (bar % 4 === 0 && s % 4 === 0 && s / 4 < 4) I.brass(L.brass, t, MOTIF[s / 4] - 12, sp * 3.6, 0.1);
      if (bar % 4 === 1 && s === 0) I.brass(L.brass, t, MOTIF[4] - 12, sp * 14, 0.11);
      if (bar % 4 === 2 && s === 0) I.brass(L.brass, t, chord[2] - 12, sp * 8, 0.07);
      if (s === 0 && bar % 2 === 0) I.choir(L.choir, t, chord.map((m) => m + 12), sp * 30, 0.035);
    },
  },

  onfoot: {
    bpm: 84, steps: 16,
    layers: { drone: [0, 0.05], pulse: [0.2, 0.5], strings: [0.5, 0.8] },
    step(s, t, L, I, bar) {
      const chord = PROG[(bar >> 1) % 4], sp = 60 / this.bpm / 4;
      if (s === 0 && bar % 2 === 0) I.drone(L.drone, t, chord[0] - 12, sp * 32, 0.05);
      if (s % 4 === 0) I.stab(L.pulse, t, [chord[0] - 12], 0.05);
      if (s === 0 && bar % 2 === 1) I.strings(L.strings, t, [MOTIF[bar % 5], MOTIF[(bar + 2) % 5] + 3], sp * 16, 0.04, 1.5);
      if (s === 8 && bar % 4 === 3) I.taiko(L.pulse, t, 0.5, 48);
    },
  },

  horror: {
    bpm: 60, steps: 16,
    layers: { drone: [0, 0.05], unease: [0.2, 0.45], tension: [0.45, 0.7], chase: [0.8, 0.95] },
    step(s, t, L, I, bar) {
      const sp = 60 / this.bpm / 4;
      if (s === 0 && bar % 4 === 0) { I.drone(L.drone, t, 38, sp * 64, 0.05); }
      if (s === 0 && bar % 4 === 2) I.drone(L.drone, t, 39, sp * 40, 0.025);
      // detuned music box motif, fragmentary
      if (bar % 3 === 0 && s % 4 === 0 && s / 4 < 3 && Math.random() < 0.8) I.musicbox(L.unease, t, MOTIF[s / 4] + 24, 0.06, rand(-35, 35));
      if (bar % 6 === 4 && s === 0) I.musicbox(L.unease, t, MOTIF[4] + 23, 0.05, -40);
      // dissonant string cluster
      if (s === 0 && bar % 2 === 0) I.strings(L.tension, t, [62, 63, 68], sp * 30, 0.025, 3);
      if (s === 6 && Math.random() < 0.3) I.swell(L.tension, t, sp * 10, 0.05);
      // chase: pounding low hits + screeching high strings
      if (s % 4 === 0) I.taiko(L.chase, t, 0.9, 42);
      if (s % 2 === 0) I.stab(L.chase, t, [74 + (s % 8 === 0 ? 1 : 0), 75], 0.05);
      if (s === 0) I.strings(L.chase, t, [86, 87], sp * 16, 0.03, 0.1);
    },
  },

  // Chapter 4: war drums, horns and choir; a lute-like pluck carries the Anchor motif in the quiet
  siege: {
    bpm: 100, steps: 16,
    layers: { lute: [0, 0.3], drone: [0, 0.05], drums: [0.3, 0.5], horns: [0.5, 0.75], choir: [0.75, 0.95] },
    step(s, t, L, I, bar) {
      const chord = PROG[(bar >> 1) % 4], sp = 60 / this.bpm / 4;
      if (s === 0 && bar % 2 === 0) I.strings(L.drone, t, [chord[0] - 12, chord[0] - 5], sp * 32, 0.04, 1.2);
      // lute: broken chords with the motif every fourth bar
      if (bar % 4 === 0 && s % 3 === 0 && s / 3 < 5) I.pluck(L.lute, t, MOTIF[s / 3] + 12, 0.11, 0.6, 'triangle');
      else if (s % 2 === 0) I.pluck(L.lute, t, chord[(s >> 1) % 3] + 12 + (s % 8 === 6 ? 12 : 0), 0.06, 0.4, 'triangle');
      // marching war drums
      if ([0, 4, 8, 10, 12].includes(s)) I.taiko(L.drums, t, s === 0 || s === 8 ? 1 : 0.55, s === 0 ? 48 : 64);
      if (s % 2 === 1 && Math.random() < 0.5) I.snare(L.drums, t, 0.18, 150);
      // horns: the motif, broad
      if (bar % 4 === 1 && s % 4 === 0) I.brass(L.horns, t, MOTIF[s / 4] - 12, sp * 3.8, 0.11);
      if (bar % 4 === 2 && s === 0) I.brass(L.horns, t, MOTIF[4] - 12, sp * 12, 0.12);
      if (bar % 4 === 3 && s === 0) I.brass(L.horns, t, chord[0] - 12, sp * 14, 0.09);
      if (s === 0 && bar % 2 === 0) I.choir(L.choir, t, chord.map((m) => m + 12), sp * 30, 0.04);
    },
  },

  // the Fallen King: a fast, heavy duel
  duel: {
    bpm: 132, steps: 16,
    layers: { drone: [0, 0.05], drums: [0.1, 0.35], strings: [0.35, 0.6], brass: [0.6, 0.8], choir: [0.8, 1] },
    step(s, t, L, I, bar) {
      const chord = PROG[bar % 4], sp = 60 / this.bpm / 4;
      if (s === 0) I.strings(L.drone, t, [chord[0] - 24, chord[0] - 12], sp * 16, 0.05, 0.4);
      if ([0, 3, 6, 8, 11, 14].includes(s)) I.taiko(L.drums, t, s === 0 ? 1.1 : 0.7, s % 8 === 0 ? 44 : 60);
      if (s === 4 || s === 12) I.snare(L.drums, t, 0.5, 160);
      const ost = [0, 12, 7, 12, 3, 12, 7, 12, 0, 12, 7, 12, 5, 12, 7, 15];
      I.stab(L.strings, t, [chord[0] + ost[s]], s % 4 === 0 ? 0.07 : 0.045);
      if (bar % 2 === 0 && s % 4 === 0) I.brass(L.brass, t, MOTIF[(s / 4 + bar) % 5] - 12, sp * 3.5, 0.12);
      if (s === 0 && bar % 2 === 1) I.choir(L.choir, t, [chord[0] + 12, chord[1] + 12, chord[2] + 24], sp * 16, 0.05);
    },
  },

  // Chapter 5: the Works — a driving industrial loop; the motif on a hard square lead
  works: {
    bpm: 150, steps: 16,
    layers: { drone: [0, 0.05], drums: [0, 0.1], bass: [0.1, 0.3], metal: [0.3, 0.6], lead: [0.6, 0.85], choir: [0.85, 1] },
    step(s, t, L, I, bar) {
      const chord = PROG[(bar >> 1) % 4], sp = 60 / this.bpm / 4;
      if (s === 0 && bar % 4 === 0) I.drone(L.drone, t, chord[0] - 24, sp * 64, 0.05);
      if (s % 4 === 0) I.kick(L.drums, t, 1);
      if (s === 4 || s === 12) I.snare(L.drums, t, 0.6, 210);
      if (s % 2 === 1) I.hat(L.drums, t, 0.25, s === 15);
      const ost = [0, 0, 12, 0, 7, 0, 12, 10, 0, 0, 12, 0, 7, 12, 3, 5];
      if (s % 2 === 0) I.bass(L.bass, t, chord[0] - 12 + ost[s], sp * 1.6, 0.28, 520);
      if ([2, 7, 10, 14].includes(s)) I.snare(L.metal, t, 0.25, 900 + (s * 37) % 400);
      if (s === 0 && bar % 2 === 1) I.swell(L.metal, t, sp * 14, 0.06);
      if (bar % 4 < 2 && s % 2 === 0 && s / 2 < 5 && bar % 4 === 0) I.pluck(L.lead, t, MOTIF[s / 2] + 12, 0.13, 0.25, 'square');
      if (bar % 4 === 1 && s === 0) I.pluck(L.lead, t, MOTIF[4] + 12, 0.13, 0.8, 'square');
      if (bar % 4 >= 2 && s % 4 === 2) I.pluck(L.lead, t, chord[(s >> 2) % 3] + 24, 0.06, 0.12, 'square');
      if (s === 0 && bar % 4 === 0) I.choir(L.choir, t, chord.map((m) => m + 12), sp * 60, 0.035);
    },
  },

  // Chapter 6: the war table — a ticking clock, a field snare, low strings, the motif on a music box
  table: {
    bpm: 88, steps: 16,
    layers: { clock: [0, 0.01], strings: [0, 0.2], snare: [0.3, 0.55], box: [0.15, 0.4], brass: [0.7, 0.95] },
    step(s, t, L, I, bar) {
      const chord = PROG[(bar >> 1) % 4], sp = 60 / this.bpm / 4;
      if (s % 4 === 0) I.hat(L.clock, t, s % 8 === 0 ? 0.35 : 0.2);
      if (s === 0 && bar % 2 === 0) I.strings(L.strings, t, [chord[0] - 12, chord[2] - 12], sp * 32, 0.04, 1.4);
      if ([0, 3, 4, 8, 11, 12, 14].includes(s)) I.snare(L.snare, t, s % 4 === 0 ? 0.45 : 0.2, 170);
      if (bar % 4 === 0 && s % 4 === 0 && s / 4 < 4) I.musicbox(L.box, t, MOTIF[s / 4] + 24, 0.07, 0);
      if (bar % 4 === 1 && s === 0) I.musicbox(L.box, t, MOTIF[4] + 24, 0.07, 0);
      if (bar % 4 === 2 && s === 0) I.brass(L.brass, t, chord[0] - 12, sp * 14, 0.1);
    },
  },

  // Chapter 7: Lindmere — a gentle chiptune (square melody, triangle bass), the motif as a lullaby
  village: {
    bpm: 92, steps: 16,
    layers: { bass: [0, 0.01], melody: [0, 0.05], hats: [0.3, 0.6] },
    step(s, t, L, I, bar) {
      const chord = PROG[(bar >> 1) % 4], sp = 60 / this.bpm / 4;
      if (s % 4 === 0) I.pluck(L.bass, t, chord[(s >> 2) % 3] - 12, 0.1, 0.3, 'triangle');
      if (s % 2 === 0) I.pluck(L.melody, t, chord[(s >> 1) % 3] + 12, 0.025, 0.12, 'square');
      if (bar % 4 < 2 && s % 4 === 0 && (bar % 4) * 4 + s / 4 < 5) I.pluck(L.melody, t, MOTIF[(bar % 4) * 4 + s / 4] + 12, 0.07, 0.5, 'square');
      if (s % 4 === 2) I.hat(L.hats, t, 0.12);
    },
  },

  title: { // sting for chapter cards
    bpm: 60, steps: 16, layers: { a: [0, 0.01] },
    step(s, t, L, I, bar) { if (bar === 0 && s === 0) { I.taiko(L.a, t, 0.9, 45); I.choir(L.a, t, [50, 57, 62], 3, 0.05); MOTIF.forEach((m, i) => I.piano(L.a, t + i * 0.22, m + 12, 0.1)); } },
  },
};

export class Music {
  constructor(audio) {
    this.a = audio; this.track = null; this.name = null; this.intensity = 0; this.timer = null;
  }
  get ready() { return !!this.a.ctx; }

  play(name, { intensity = 0, fade = 2 } = {}) {
    if (!this.ready || this.name === name) { this.setIntensity(intensity); return; }
    this.stop(fade);
    const def = TRACKS[name]; if (!def) return;
    this.name = name;
    const bus = this.a.gain(0); bus.connect(this.a.music);
    bus.gain.setTargetAtTime(1, this.a.t, fade / 3);
    const layers = {};
    for (const k of Object.keys(def.layers)) { layers[k] = this.a.gain(0); layers[k].connect(bus); }
    this.track = { def, bus, layers, step: 0, bar: 0, next: this.a.t + 0.1, I: new Instruments(this.a) };
    this.intensity = intensity;
    this.applyIntensity(0.01);
    this.timer = setInterval(() => this.schedule(), 25);
  }

  schedule() {
    const tr = this.track; if (!tr) return;
    const sp = 60 / tr.def.bpm / 4;
    while (tr.next < this.a.t + 0.15) {
      try { tr.def.step.call(tr.def, tr.step, tr.next, tr.layers, tr.I, tr.bar); } catch (e) { console.warn(e); }
      tr.next += sp; tr.step++;
      if (tr.step >= tr.def.steps) { tr.step = 0; tr.bar++; }
    }
  }

  setIntensity(v, time = 1.2) { this.intensity = v; this.applyIntensity(time); }
  applyIntensity(time) {
    const tr = this.track; if (!tr) return;
    for (const [k, [lo, hi]] of Object.entries(tr.def.layers)) {
      const x = Math.min(1, Math.max(0, (this.intensity - lo) / Math.max(hi - lo, 0.001)));
      tr.layers[k].gain.setTargetAtTime(x, this.a.t, time / 3);
    }
  }

  stop(fade = 1.5) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.track) { const b = this.track.bus; b.gain.setTargetAtTime(0, this.a.t, fade / 3); setTimeout(() => b.disconnect(), fade * 1000 + 3000); }
    this.track = null; this.name = null;
  }

  sting() { if (!this.ready) return; const I = new Instruments(this.a); const t = this.a.t + 0.05; I.taiko(this.a.music, t, 0.9, 45); I.choir(this.a.music, t, [50, 57, 62], 3, 0.04); MOTIF.forEach((m, i) => I.piano(this.a.music, t + 0.4 + i * 0.24, m + 12, 0.09)); }
  hit(v = 1) { if (!this.ready) return; const I = new Instruments(this.a); I.taiko(this.a.music, this.a.t + 0.01, v, 40); }
}
