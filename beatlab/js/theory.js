/* BeatLab — music theory helpers.
 * Notes in melodic tracks are stored as SCALE DEGREES (0 = root of the key),
 * so changing the key or scale re-tunes the whole beat and you can never play a wrong note. */
(function (root) {
  const BL = (root.BL = root.BL || {});

  const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const SCALES = {
    minor: { name: 'Minor', vibe: 'sad, dark, emotional', steps: [0, 2, 3, 5, 7, 8, 10] },
    major: { name: 'Major', vibe: 'happy, bright, uplifting', steps: [0, 2, 4, 5, 7, 9, 11] },
    harmonicMinor: { name: 'Harmonic Minor', vibe: 'evil, drill, cinematic', steps: [0, 2, 3, 5, 7, 8, 11] },
    phrygian: { name: 'Phrygian', vibe: 'spooky, menacing', steps: [0, 1, 3, 5, 7, 8, 10] },
    dorian: { name: 'Dorian', vibe: 'soulful, smooth, jazzy', steps: [0, 2, 3, 5, 7, 9, 10] },
    mixolydian: { name: 'Mixolydian', vibe: 'bluesy, funky', steps: [0, 2, 4, 5, 7, 9, 10] },
  };

  /** semitones above the key root for a scale degree (degrees can be negative / span octaves) */
  function degreeToSemi(deg, scale) {
    const st = (SCALES[scale] || SCALES.minor).steps;
    const n = st.length;
    const oct = Math.floor(deg / n);
    const i = ((deg % n) + n) % n;
    return oct * 12 + st[i];
  }

  function midiToFreq(m) {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  function noteName(midi) {
    const m = Math.round(midi);
    return NOTE_NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  }

  function keyName(root, scale) {
    return NOTE_NAMES[((root % 12) + 12) % 12] + ' ' + (SCALES[scale] ? SCALES[scale].name : scale);
  }

  /** triad (or 7th) built on a scale degree, as degrees */
  function chordDegrees(deg, size) {
    const out = [deg, deg + 2, deg + 4];
    if (size === 4) out.push(deg + 6);
    return out;
  }

  /** Chord progressions as scale degrees (0-based). Every one sounds good in any key. */
  const PROGRESSIONS = [
    { id: 'sad', name: 'Sad & Emotional', degs: [0, 5, 2, 6], scale: 'minor' },
    { id: 'dark', name: 'Dark Trap', degs: [0, 0, 5, 4], scale: 'minor' },
    { id: 'heaven', name: 'Heavenly', degs: [5, 6, 0, 0], scale: 'minor' },
    { id: 'soul', name: 'Soul Classic', degs: [1, 4, 0, 5], scale: 'major' },
    { id: 'hope', name: 'Hopeful Anthem', degs: [0, 4, 5, 3], scale: 'major' },
    { id: 'spooky', name: 'Spooky', degs: [0, 1, 0, 6], scale: 'phrygian' },
    { id: 'drill', name: 'Drill Menace', degs: [0, 5, 4, 4], scale: 'harmonicMinor' },
    { id: 'smooth', name: 'Smooth R&B', degs: [3, 2, 1, 0], scale: 'dorian' },
    { id: 'rage', name: 'Rage Loop', degs: [0, 0, 5, 6], scale: 'minor' },
  ];

  // Krumhansl–Kessler key profiles
  const MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
  const MIN = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

  function corr(a, b) {
    const n = a.length;
    let ma = 0, mb = 0;
    for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
    ma /= n; mb /= n;
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < n; i++) {
      const x = a[i] - ma, y = b[i] - mb;
      num += x * y; da += x * x; db += y * y;
    }
    return da && db ? num / Math.sqrt(da * db) : 0;
  }

  /** chroma: 12 energies C..B -> best {root, mode:'major'|'minor', score} */
  function detectKey(chroma) {
    let best = { root: 0, mode: 'minor', score: -2 };
    for (let r = 0; r < 12; r++) {
      const rot = [];
      for (let i = 0; i < 12; i++) rot.push(chroma[(i + r) % 12]);
      const sMaj = corr(rot, MAJ), sMin = corr(rot, MIN);
      if (sMaj > best.score) best = { root: r, mode: 'major', score: sMaj };
      if (sMin > best.score) best = { root: r, mode: 'minor', score: sMin };
    }
    return best;
  }

  /** is the scale "minor flavoured" (b3) */
  function isMinorish(scale) {
    return degreeToSemi(2, scale) === 3;
  }

  /**
   * Semitones to move a sample in key (sRoot,sMode) so it fits the project key.
   * Relative major/minor share the same notes, so we line up the matching mode.
   * Result is in [-6, +5] so the shift stays as small as possible.
   */
  function semitonesToKey(sRoot, sMode, pRoot, pScale) {
    let target = pRoot;
    const pMinor = isMinorish(pScale);
    if (sMode === 'major' && pMinor) target = pRoot + 3; // relative major of the project
    if (sMode === 'minor' && !pMinor) target = pRoot - 3; // relative minor of the project
    let d = (((target - sRoot) % 12) + 12) % 12;
    if (d > 5) d -= 12;
    return d;
  }

  BL.theory = {
    NOTE_NAMES, SCALES, PROGRESSIONS,
    degreeToSemi, midiToFreq, noteName, keyName, chordDegrees,
    detectKey, semitonesToKey, isMinorish,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = BL.theory;
})(typeof window !== 'undefined' ? window : globalThis);
