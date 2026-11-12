/* BeatLab — the ✦ buttons: write drums, chords, melodies, 808s and chop patterns for you. */
(function (root) {
  const BL = (root.BL = root.BL || {});
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  const chance = (p) => Math.random() < p;

  function euclid(k, n, rot) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(((i + rot) * k) % n < k ? 1 : 0);
    return out;
  }

  /** drum pattern for a sound category; bars of 16 steps, last bar varied */
  function drumPattern(cat, bpm, totalSteps) {
    const bars = totalSteps / 16;
    const fast = bpm >= 118;
    const steps = new Array(totalSteps).fill(0);
    const rolls = new Array(totalSteps).fill(1);
    const set = (i, v, r) => { if (i < totalSteps) { steps[i] = v; rolls[i] = r || 1; } };
    const barBase = (b) => b * 16;
    if (cat === 'Kick') {
      const cands = fast ? [6, 7, 10, 11, 14] : [3, 7, 10, 13];
      const main = [0, ...cands.filter(() => chance(0.4))];
      if (main.length < 2) main.push(pick(cands));
      for (let b = 0; b < bars; b++) {
        const last = b === bars - 1 && bars > 1;
        const hits = last ? [0, ...cands.filter(() => chance(0.45))] : main;
        hits.forEach((s) => set(barBase(b) + s, s === 0 ? 1 : 0.8));
      }
    } else if (cat === 'Snare' || cat === 'Clap') {
      for (let b = 0; b < bars; b++) {
        (fast ? [8] : [4, 12]).forEach((s) => set(barBase(b) + s, 0.9));
        if (chance(0.35)) set(barBase(b) + pick(fast ? [14, 15, 6] : [7, 15]), 0.4);
      }
    } else if (cat === 'Hi-Hat') {
      for (let i = 0; i < totalSteps; i += 2) set(i, i % 4 === 0 ? 0.85 : 0.6);
      if (fast) {
        for (let b = 0; b < bars; b++) {
          if (chance(0.5)) { const s = barBase(b) + pick([5, 9, 13]); set(s, 0.55); }
          const r = barBase(b) + pick([6, 10, 12, 14]);
          set(r, 0.75, pick([2, 3, 4]));
          if (b === bars - 1 && chance(0.7)) set(barBase(b) + 14, 0.75, pick([3, 4]));
        }
      } else if (chance(0.5)) {
        for (let i = 1; i < totalSteps; i += 2) if (chance(0.5)) set(i, 0.35);
      }
    } else if (cat === 'Open Hat') {
      for (let b = 0; b < bars; b++) (chance(0.5) ? [14] : [6, 14]).forEach((s) => set(barBase(b) + s, 0.7));
    } else if (cat === 'Perc') {
      const k = 3 + rnd(3), rot = rnd(16);
      const e = euclid(k, 16, rot);
      for (let i = 0; i < totalSteps; i++) if (e[i % 16]) set(i, i % 4 === 0 ? 0.8 : 0.6);
    } else {
      set(0, 0.9);
    }
    return { steps, rolls };
  }

  /** keep chords close together: degrees above 3 drop an octave */
  function voice(d) { return d > 3 ? d - 7 : d; }

  function progressionNotes(prog, totalSteps, size) {
    const block = totalSteps / 4;
    const notes = [];
    prog.degs.forEach((d, i) => {
      BL.theory.chordDegrees(voice(d), size || 3).forEach((dd) => notes.push({ s: i * block, d: dd, l: block }));
    });
    return notes;
  }

  /** root degree of whatever chord/notes are sounding at a step in other melodic tracks */
  function chordRootAt(p, pat, step, exceptId) {
    let low = null;
    for (const t of p.tracks) {
      if (t.type !== 'synth' || t.id === exceptId) continue;
      const inst = BL.sounds.INSTRUMENTS[t.inst];
      if (!inst || inst.bass) continue;
      const d = pat.data[t.id];
      if (!d) continue;
      for (const n of d.notes) if (n.s <= step && step < n.s + n.l && (low == null || n.d < low)) low = n.d;
    }
    if (low == null) return null;
    let r = ((low % 7) + 7) % 7;
    if (r > 4) r -= 7;
    return r;
  }

  function chordToneSets(p, pat, totalSteps, exceptId) {
    const out = [];
    for (let s = 0; s < totalSteps; s++) {
      const r = chordRootAt(p, pat, s, exceptId);
      out.push(r == null ? [0, 5, 2, 6][Math.floor((s / totalSteps) * 4)] : r);
    }
    return out;
  }

  const RHYTHMS = [
    [[0, 2], [2, 2], [4, 3], [8, 2], [10, 2], [12, 4]],
    [[0, 3], [3, 3], [6, 2], [8, 4], [12, 2], [14, 2]],
    [[0, 1], [2, 1], [4, 2], [6, 2], [8, 1], [10, 1], [12, 4]],
    [[0, 4], [6, 2], [8, 2], [10, 6]],
    [[2, 2], [4, 2], [6, 2], [10, 2], [12, 4]],
  ];

  function melody(p, pat, totalSteps, trackId) {
    const roots = chordToneSets(p, pat, totalSteps, trackId);
    const rhythm = pick(RHYTHMS);
    const alt = pick(RHYTHMS);
    const notes = [];
    let prev = 7 + roots[0];
    const bars = totalSteps / 16;
    for (let b = 0; b < bars; b++) {
      const r = b % 2 === 1 && chance(0.5) ? alt : rhythm;
      r.forEach(([s, l], i) => {
        const step = b * 16 + s;
        const root = roots[step];
        const last = i === r.length - 1 && b === bars - 1;
        let cands = [root, root + 2, root + 4, root + 7, root + 9].map((d) => d + 7);
        if (!last && chance(0.25)) cands = cands.concat([prev + 1, prev - 1]);
        cands.sort((a, c) => Math.abs(a - prev) - Math.abs(c - prev));
        let d = last ? root + 7 : cands[Math.min(cands.length - 1, rnd(3))];
        d = Math.max(3, Math.min(14, d));
        notes.push({ s: step, d, l: Math.min(l, totalSteps - step) });
        prev = d;
      });
    }
    return notes;
  }

  function bassFromKick(p, pat, kickTrack, totalSteps, bassId) {
    const k = pat.data[kickTrack.id];
    if (!k) return [];
    const hits = [];
    k.steps.forEach((v, i) => { if (v) hits.push(i); });
    if (!hits.length) return [];
    return hits.map((s, i) => {
      const next = i + 1 < hits.length ? hits[i + 1] : totalSteps;
      const r = chordRootAt(p, pat, s, bassId);
      return { s, d: r == null ? 0 : r, l: Math.max(1, Math.min(8, next - s)) };
    });
  }

  function chopPattern(nSlices, totalSteps) {
    const steps = new Array(totalSteps).fill(-1);
    const motif = [0, 3, 6, 10, 12].map((s) => [s, rnd(nSlices)]);
    for (let b = 0; b < totalSteps / 16; b++) {
      motif.forEach(([s, sl], i) => {
        const vary = b % 2 === 1 && i >= 3 && chance(0.6);
        steps[b * 16 + s] = vary ? rnd(nSlices) : sl;
      });
    }
    return steps;
  }

  BL.magic = { drumPattern, progressionNotes, melody, bassFromKick, chopPattern, chordRootAt };
})(typeof window !== 'undefined' ? window : globalThis);
