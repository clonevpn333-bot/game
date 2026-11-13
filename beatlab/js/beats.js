/* BeatLab — the beat library. Each preset is a full, playable project.
 * Drum rows:  x = hit, X = loud hit, o = soft hit, 2/3/4 = hi-hat roll, . = rest  ( | and spaces are ignored )
 * Chop rows:  0-9 a-f = which slice of the sample to play
 * Notes:      [step, scale degree, length in steps]   (degree 0 = key root, 7 = an octave up) */
(function (root) {
  const BL = (root.BL = root.BL || {});

  const clean = (s) => s.replace(/[\s|]/g, '');
  const rep = (s, n) => new Array(n).fill(clean(s)).join('');

  function drumRow(str) {
    const s = clean(str);
    const steps = [], rolls = [];
    for (const ch of s) {
      let v = 0, r = 1;
      if (ch === 'x') v = 0.8;
      else if (ch === 'X') v = 1;
      else if (ch === 'o') v = 0.45;
      else if (ch >= '2' && ch <= '4') { v = 0.75; r = +ch; }
      steps.push(v);
      rolls.push(r);
    }
    return { steps, rolls };
  }
  function chopRow(str) {
    return { steps: clean(str).split('').map((ch) => (ch === '.' ? -1 : parseInt(ch, 16))) };
  }
  /** chord helper: returns notes for a triad / 7th on a scale degree */
  const C = (s, d, l, size) => BL.theory.chordDegrees(d, size || 3).map((dd) => [s, dd, l]);
  const flat = (arr) => arr.flatMap((n) => (Array.isArray(n[0]) ? n : [n]));
  const notes = (arr) => ({ notes: flat(arr).map(([s, d, l]) => ({ s, d, l })) });

  /** arpeggio over chord blocks: blocks = [[startStep, degree, lengthSteps]], pattern = degree offsets */
  function arp(blocks, pattern, every, len) {
    const out = [];
    for (const [start, deg, blen] of blocks) {
      for (let i = 0; i * every < blen; i++) out.push([start + i * every, deg + pattern[i % pattern.length], len || every]);
    }
    return out;
  }

  const PRESETS = [
    {
      id: 'chipmunk-soul', name: 'Chipmunk Soul', color: '#f2a541',
      tags: ['Kanye-type', 'soul sample', 'chipmunk soul', '2000s', 'boom bap'],
      desc: 'A dusty Rhodes record sped up until it sings high, over knocking boom-bap drums.',
      bpm: 88, key: 9, scale: 'minor', swing: 0.28, bars: 2, song: 'ABAB',
      samples: { soul: { builtin: 'soul_keys', fit: true, autoKey: true, chops: 8 } },
      tracks: [
        { type: 'drum', sound: 'kick_boombap', name: 'Kick', A: 'x.........x.....|x......x..x..x..' },
        { type: 'drum', sound: 'snare_boombap', name: 'Snare', A: '....x.......x...|....x.......x...' },
        { type: 'drum', sound: 'clap_lofi', name: 'Clap', vol: 0.55, A: '................|................', B: '....x.......x...|....x.......x...' },
        { type: 'drum', sound: 'hat_dusty', name: 'Hats', A: 'X.x.X.x.X.x.X.x.|X.x.X.x.X.x.X.xo' },
        { type: 'drum', sound: 'ohat_dusty', name: 'Open Hat', vol: 0.5, A: '................|................', B: '..............x.|..............x.' },
        { type: 'sample', sample: 'soul', mode: 'loop', name: 'Soul Sample', vol: 0.75 },
        { type: 'synth', inst: 'sub', name: 'Bass', vol: 0.75, A: [], B: [[0, 0, 7], [8, 5, 7], [16, 2, 7], [24, 6, 7]] },
      ],
    },
    {
      id: 'rage', name: 'Rage', color: '#ff3d6e',
      tags: ['Yeat-type', 'Carti-type', 'rage', 'distorted', 'hyper'],
      desc: 'Blown-out 808s, a bright supersaw lead and hard half-time drums.',
      bpm: 160, key: 6, scale: 'minor', swing: 0, bars: 2, song: 'ABAB',
      tracks: [
        { type: 'drum', sound: 'kick_rage', name: 'Kick', A: 'x.......x.x.....|x.......x.....x.' },
        { type: 'drum', sound: 'snare_rage', name: 'Snare', A: '........x.......|........x.......' },
        { type: 'drum', sound: 'clap_trap', name: 'Clap', vol: 0.6, A: '................|................', B: '........x.......|........x.......' },
        { type: 'drum', sound: 'hat_trap', name: 'Hats', A: 'x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x.', B: 'x.x.x.x2x.x.x.x.|x.x.x.x.x.x.4.3.' },
        { type: 'drum', sound: 'ohat', name: 'Open Hat', vol: 0.45, A: '..............x.|..............x.' },
        { type: 'synth', inst: 'rage', name: 'Rage Lead', vol: 0.62, rev: 0.3,
          A: arp([[0, 0, 8], [8, 0, 8], [16, 5, 8], [24, 6, 8]], [7, 4, 2, 4], 2),
          B: [...arp([[0, 0, 8], [8, 0, 8], [16, 5, 8], [24, 6, 8]], [7, 4, 2, 4], 2), ...[0, 8, 16, 24].flatMap((s, i) => C(s, [0, 0, 5, 6][i], 6))] },
        { type: 'synth', inst: 'b808dist', name: '808', vol: 0.8, A: [[0, 0, 6], [8, 0, 2], [10, 0, 4], [16, 5, 6], [24, 6, 4], [30, 6, 2]] },
      ],
    },
    {
      id: 'dark-trap', name: 'Dark Trap', color: '#8f6bff',
      tags: ['Atlanta', 'Future-type', 'Metro-type', 'trap', 'dark', 'bells'],
      desc: 'Haunting bells, a cold pad, rolling hi-hats and a punchy 808.',
      bpm: 140, key: 1, scale: 'harmonicMinor', swing: 0, bars: 2, song: 'ABBA',
      tracks: [
        { type: 'drum', sound: 'kick_trap', name: 'Kick', A: 'x......x..x.....|x.........x..x..' },
        { type: 'drum', sound: 'clap_trap', name: 'Clap', A: '........x.......|........x.......' },
        { type: 'drum', sound: 'snare_trap', name: 'Snare', vol: 0.55, A: '................|................', B: '........x.......|........x.....o.' },
        { type: 'drum', sound: 'hat_trap', name: 'Hats', A: 'x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x.', B: 'x.x.x.3.x.x.xxx.|x.x.x.x.x.4.x.3.' },
        { type: 'drum', sound: 'ohat', name: 'Open Hat', vol: 0.4, A: '................|................', B: '......x.........|......x.........' },
        { type: 'synth', inst: 'bell', name: 'Bells', vol: 0.6, rev: 0.4,
          A: [[0, 7, 2], [2, 9, 2], [4, 8, 2], [6, 7, 2], [8, 4, 4], [12, 7, 4], [16, 7, 2], [18, 9, 2], [20, 10, 2], [22, 9, 2], [24, 6, 8]] },
        { type: 'synth', inst: 'pad', name: 'Pad', vol: 0.5, octave: -1, rev: 0.5, A: [C(0, 0, 16), C(16, 5, 16)] },
        { type: 'synth', inst: 'b808punch', name: '808', vol: 0.8, A: [[0, 0, 7], [7, 0, 3], [10, 0, 6], [16, 5, 10], [26, 4, 3], [29, 4, 3]] },
      ],
    },
    {
      id: 'drill', name: 'Drill', color: '#4fb3ff',
      tags: ['UK drill', 'NY drill', 'Pop Smoke-type', 'sliding 808', 'flute'],
      desc: 'Sliding 808s, a sinister flute and skippy drill hats.',
      bpm: 142, key: 4, scale: 'harmonicMinor', swing: 0, bars: 2, song: 'ABAB',
      tracks: [
        { type: 'drum', sound: 'kick_punch', name: 'Kick', A: 'x.....x.........|x...x.....x.....' },
        { type: 'drum', sound: 'snare_drill', name: 'Snare', A: '........x.......|........x.....x.' },
        { type: 'drum', sound: 'hat_drill', name: 'Hats', A: 'x..x..x.x..x..x.|x..x..x.x..x.3x.', B: 'x..x..x.x..x..3.|x..x..x.x.3x..4.' },
        { type: 'drum', sound: 'perc_rim', name: 'Perc', vol: 0.5, A: '...x.......x....|...x......x.....' },
        { type: 'synth', inst: 'flute', name: 'Flute', vol: 0.55, octave: -1, rev: 0.35,
          A: [[0, 4, 4], [4, 5, 2], [6, 6, 4], [10, 4, 2], [12, 2, 4], [16, 4, 4], [20, 5, 2], [22, 4, 2], [24, 2, 4], [28, 0, 4]] },
        { type: 'synth', inst: 'strings', name: 'Strings', vol: 0.45, octave: -1, rev: 0.4, A: [C(0, 0, 16), C(16, 5, 8), C(24, 4, 8)] },
        { type: 'synth', inst: 'b808', name: '808 (slides)', vol: 0.85, A: [[0, 0, 6], [6, 0, 6], [10, 2, 5], [16, 0, 4], [20, -2, 6], [24, -3, 8]] },
      ],
    },
    {
      id: 'boom-bap', name: '90s Boom Bap', color: '#e2c35a',
      tags: ['boom bap', 'golden era', 'chops', 'horns', 'New York'],
      desc: 'Chopped soul horns flipped over swung, dusty drums.',
      bpm: 92, key: 7, scale: 'minor', swing: 0.35, bars: 2, song: 'AABB',
      samples: { horns: { builtin: 'soul_horns', fit: true, autoKey: true, chops: 8 } },
      tracks: [
        { type: 'drum', sound: 'kick_boombap', name: 'Kick', A: 'x......x..x.....|x.x.......x.....' },
        { type: 'drum', sound: 'snare_boombap', name: 'Snare', A: '....x.......x...|....x.......x...' },
        { type: 'drum', sound: 'hat_dusty', name: 'Hats', A: 'X.o.x.o.X.o.x.o.|X.o.x.o.X.o.x.oo' },
        { type: 'drum', sound: 'rim', name: 'Rim', vol: 0.5, A: '................|................', B: '..x.......x.....|..x.......x...x.' },
        { type: 'sample', sample: 'horns', mode: 'chop', name: 'Horn Chops', vol: 0.75,
          A: '0.....0...3.....|4.....4...7.....', B: '0...0.1.....3...|6...6.7...3.2...' },
      ],
    },
    {
      id: 'lofi', name: 'Lo-Fi Study', color: '#7fc8a9',
      tags: ['lo-fi', 'chill', 'study', 'jazzy', 'guitar'],
      desc: 'Lazy swung drums, a nylon-guitar loop and soft Rhodes, all through a warm filter.',
      bpm: 80, key: 9, scale: 'dorian', swing: 0.45, bars: 2, song: 'ABAB', lofi: true,
      samples: { gtr: { builtin: 'lofi_guitar', fit: true, autoKey: true, chops: 8 } },
      tracks: [
        { type: 'drum', sound: 'kick_lofi', name: 'Kick', A: 'x......x..x.....|x......x...x....' },
        { type: 'drum', sound: 'snare_lofi', name: 'Snare', A: '....x.......x...|....x.......x..o' },
        { type: 'drum', sound: 'hat_dusty', name: 'Hats', vol: 0.6, A: 'x.xox.xox.xox.xo|x.xox.xox.xox.x.' },
        { type: 'drum', sound: 'shaker', name: 'Shaker', vol: 0.4, A: '................|................', B: '..x...x...x...x.|..x...x...x...x.' },
        { type: 'sample', sample: 'gtr', mode: 'loop', name: 'Guitar Loop', vol: 0.75 },
        { type: 'synth', inst: 'rhodes', name: 'Rhodes', vol: 0.5, rev: 0.4, A: [], B: [[2, 4, 2], [6, 6, 2], [12, 7, 4], [18, 9, 2], [22, 7, 2], [26, 6, 6]] },
        { type: 'synth', inst: 'sub', name: 'Bass', vol: 0.7, A: [[0, 3, 7], [8, 6, 7], [16, 1, 7], [24, 4, 7]] },
      ],
    },
    {
      id: 'pluggnb', name: 'Pluggnb', color: '#ff8fd0',
      tags: ['pluggnb', 'plugg', 'melodic', 'sliding 808', 'dreamy'],
      desc: 'Dreamy 7th chords, a music-box melody and an 808 that slides between notes.',
      bpm: 150, key: 10, scale: 'major', swing: 0, bars: 2, song: 'ABAB',
      tracks: [
        { type: 'drum', sound: 'kick_trap', name: 'Kick', A: 'x.........x.....|x.....x...x.....' },
        { type: 'drum', sound: 'clap_snare', name: 'Snare', A: '........x.......|........x.......' },
        { type: 'drum', sound: 'hat_crisp', name: 'Hats', A: 'x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x.', B: 'x.x.x.x.x.x.x3x.|x.x.x.x.x.x.4.x.' },
        { type: 'drum', sound: 'snap', name: 'Snap', vol: 0.5, A: '......x.........|......x.......x.' },
        { type: 'synth', inst: 'synthkeys', name: 'Keys', vol: 0.55, rev: 0.35, A: [C(0, 3, 7, 4), C(8, 4, 7, 4), C(16, 2, 7, 4), C(24, 5, 7, 4)] },
        { type: 'synth', inst: 'musicbox', name: 'Music Box', vol: 0.45, rev: 0.5, A: [],
          B: [[0, 7, 2], [2, 9, 2], [4, 11, 4], [8, 9, 2], [10, 8, 2], [12, 7, 4], [16, 7, 2], [18, 8, 2], [20, 9, 4], [24, 11, 6]] },
        { type: 'synth', inst: 'b808', name: '808 (slides)', vol: 0.85, A: [[0, 3, 6], [6, 3, 4], [8, 4, 6], [14, 4, 4], [16, 2, 6], [22, 2, 4], [24, 5, 8]] },
      ],
    },
    {
      id: 'pain', name: 'Pain Piano', color: '#9fb4d6',
      tags: ['melodic trap', 'Rod Wave-type', 'Durk-type', 'emotional', 'piano'],
      desc: 'A sad piano progression with a long, deep 808 underneath.',
      bpm: 136, key: 4, scale: 'minor', swing: 0, bars: 2, song: 'ABAB',
      tracks: [
        { type: 'drum', sound: 'kick_deep', name: 'Kick', A: 'x.........x.....|x.......x.x.....' },
        { type: 'drum', sound: 'clap_big', name: 'Clap', A: '........x.......|........x.......' },
        { type: 'drum', sound: 'hat_trap', name: 'Hats', vol: 0.6, A: 'x.x.x.x.x.x.x.x.|x.x.x.x.x.x.3.x.', B: 'x.x.x.x2x.x.x.x.|x.x.x3x.x.x.4.x.' },
        { type: 'synth', inst: 'piano', name: 'Piano', vol: 0.65, rev: 0.45,
          A: [...arp([[0, 0, 8], [8, 5, 8], [16, 2, 8], [24, 6, 8]], [0, 2, 4, 7], 2, 3), [0, -7, 8], [8, -2, 8], [16, -5, 8], [24, -1, 8]] },
        { type: 'synth', inst: 'strings', name: 'Strings', vol: 0.35, octave: -1, rev: 0.5, A: [], B: [C(0, 0, 8), C(8, 5, 8), C(16, 2, 8), C(24, 6, 8)] },
        { type: 'synth', inst: 'b808long', name: '808', vol: 0.8, A: [[0, 0, 8], [10, 0, 6], [16, 5, 8], [24, 6, 2], [26, 6, 6]] },
      ],
    },
    {
      id: 'gospel', name: 'Sunday Gospel', color: '#ffd166',
      tags: ['Kanye-type', 'gospel', 'church', 'organ', 'choir', 'soul'],
      desc: 'A church organ sample, a soul choir and hand claps.',
      bpm: 84, key: 5, scale: 'major', swing: 0.2, bars: 2, song: 'ABAB',
      samples: { organ: { builtin: 'gospel_organ', fit: true, autoKey: true, chops: 8 } },
      tracks: [
        { type: 'drum', sound: 'kick_boombap', name: 'Kick', A: 'x.......x.......|x.......x..x....' },
        { type: 'drum', sound: 'clap_big', name: 'Claps', A: '....x.......x...|....x.......x...' },
        { type: 'drum', sound: 'tamb', name: 'Tambourine', vol: 0.45, A: '..x...x...x...x.|..x...x...x...x.' },
        { type: 'drum', sound: 'hat_dusty', name: 'Hats', vol: 0.5, A: 'x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x.' },
        { type: 'sample', sample: 'organ', mode: 'loop', name: 'Organ Sample', vol: 0.7 },
        { type: 'synth', inst: 'choir', name: 'Choir', vol: 0.5, rev: 0.6, A: [], B: [[0, 4, 8], [8, 3, 8], [16, 2, 8], [24, 1, 8]] },
        { type: 'synth', inst: 'sub', name: 'Bass', vol: 0.7, A: [[0, 0, 7], [8, 3, 7], [16, 1, 7], [24, 4, 7]] },
      ],
    },
    {
      id: 'jersey', name: 'Jersey Club', color: '#3ee0c8',
      tags: ['jersey club', 'club', 'bouncy', 'dance', 'vocal chops'],
      desc: 'Bouncing kick patterns, vocal "hey" chops and stabby plucks.',
      bpm: 140, key: 7, scale: 'minor', swing: 0, bars: 2, song: 'ABAB',
      tracks: [
        { type: 'drum', sound: 'kick_punch', name: 'Kick', A: 'x...x...x..x.x..|x...x...x..x.x.x' },
        { type: 'drum', sound: 'clap_trap', name: 'Clap', A: '....x.......x...|....x.......x...' },
        { type: 'drum', sound: 'vox_hey', name: 'Vox Hey', vol: 0.6, A: '..........x.....|..........x...x.' },
        { type: 'drum', sound: 'hat_crisp', name: 'Hats', vol: 0.6, A: 'x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x.' },
        { type: 'drum', sound: 'riser', name: 'Riser', vol: 0.5, A: '................|................', B: '................|x...............' },
        { type: 'synth', inst: 'pluck', name: 'Pluck', vol: 0.55, rev: 0.3,
          A: [[0, 3, 6, 10, 12].flatMap((s) => C(s, 0, 2)), [16, 19, 22, 26, 28].flatMap((s) => C(s, 5, 2))] },
        { type: 'synth', inst: 'b808punch', name: '808', vol: 0.75,
          A: [[0, 0, 2], [4, 0, 2], [8, 0, 2], [11, 0, 2], [13, 0, 2], [16, 5, 2], [20, 5, 2], [24, 5, 2], [27, 5, 2], [29, 5, 2], [31, 5, 1]] },
      ],
    },
    {
      id: 'afro', name: 'Afrobeats', color: '#ff9f43',
      tags: ['afrobeats', 'afro', 'amapiano', 'log drum', 'percussion'],
      desc: 'Bouncy log-drum bass, congas, shaker and bright chords.',
      bpm: 104, key: 9, scale: 'major', swing: 0.15, bars: 2, song: 'ABAB',
      tracks: [
        { type: 'drum', sound: 'kick_punch', name: 'Kick', A: 'x.....x...x.....|x.....x...x.....' },
        { type: 'drum', sound: 'rim', name: 'Rim', vol: 0.6, A: '...x..x....x..x.|...x..x....x..x.' },
        { type: 'drum', sound: 'snap', name: 'Snap', vol: 0.6, A: '....x.......x...|....x.......x...' },
        { type: 'drum', sound: 'shaker', name: 'Shaker', vol: 0.5, A: 'xoxoxoxoxoxoxoxo|xoxoxoxoxoxoxoxo' },
        { type: 'drum', sound: 'conga_hi', name: 'Conga Hi', vol: 0.55, A: '......x.......x.|..x...x.......x.' },
        { type: 'drum', sound: 'conga_lo', name: 'Conga Lo', vol: 0.55, A: '..x.......x.....|..........x...x.' },
        { type: 'synth', inst: 'rhodes', name: 'Keys', vol: 0.55, rev: 0.3,
          A: [0, 8, 16, 24].flatMap((s, i) => [...C(s, [0, 5, 3, 4][i], 3), ...C(s + 3, [0, 5, 3, 4][i], 2), ...C(s + 6, [0, 5, 3, 4][i], 2)]) },
        { type: 'synth', inst: 'b808punch', name: 'Log Drum', vol: 0.75,
          A: [[0, 0, 2], [3, 0, 2], [6, 4, 2], [10, 5, 2], [12, 4, 2], [16, 3, 2], [19, 3, 2], [22, 4, 2], [26, 1, 2], [28, 0, 2]] },
      ],
    },
    {
      id: 'cinematic', name: 'Villain Strings', color: '#d65a5a',
      tags: ['cinematic', 'orchestral', 'Travis-type', 'dark', 'strings', 'epic'],
      desc: 'A dramatic string sample, huge impacts and a distorted 808. Four-bar loop.',
      bpm: 145, key: 0, scale: 'harmonicMinor', swing: 0, bars: 4, song: 'AB',
      samples: { str: { builtin: 'vintage_strings', fit: true, autoKey: true, chops: 8 } },
      tracks: [
        { type: 'drum', sound: 'kick_trap', name: 'Kick', A: rep('x.........x.....|x......x..x.....', 2) },
        { type: 'drum', sound: 'snare_crack', name: 'Snare', A: rep('........x.......', 4) },
        { type: 'drum', sound: 'hat_drill', name: 'Hats', A: rep('x.x.x.x.x.x.x.x.|x.x.x.x.x.x2x.x.', 2), B: rep('x.x.x3x.x.x.x.x.|x.x.x.x.x.x.4.3.', 2) },
        { type: 'drum', sound: 'impact', name: 'Impact', vol: 0.7, A: 'x' + '.'.repeat(63), B: '.'.repeat(64) },
        { type: 'drum', sound: 'crash_rev', name: 'Rev Crash', vol: 0.5, A: '.'.repeat(64), B: '.'.repeat(56) + 'x.......' },
        { type: 'sample', sample: 'str', mode: 'loop', name: 'String Sample', vol: 0.75 },
        { type: 'synth', inst: 'b808dist', name: '808', vol: 0.8,
          A: [[0, 0, 12], [12, 0, 4], [16, 5, 12], [28, 5, 4], [32, 3, 14], [48, 4, 12], [60, 4, 4]] },
      ],
    },
  ];

  // BeatLab Packs: original sounds + a starter beat in the style of a specific song.
  // Nothing here is copied from the records: tempo, key and melodies are original, written in the style.
  const KITS = [
    { id: 'msb', name: 'Big Money Pack', inspired: 'Money So Big · Yeat', color: '#ff375f', preset: 'kit-msb',
      blurb: 'Blown-out 808s, a shiny rage bell and hard, bright drums.' },
    { id: 'fev', name: 'Fever Pack', inspired: 'Fever · fakemink', color: '#64d2ff', preset: 'kit-fev',
      blurb: 'Airy pads, glassy bells, ticking hats and sliding 808s.' },
    { id: 'jbx', name: 'Jukebox Pack', inspired: 'Jukebox Joints · A$AP Rocky & Kanye West', color: '#ffb340', preset: 'kit-jbx',
      blurb: 'A sped-up soul record, dusty drums and a warm bassline.' },
  ];

  PRESETS.push(
    {
      id: 'kit-msb', name: 'Big Money', color: '#ff375f', kit: 'msb',
      tags: ['Yeat-type', 'Money So Big type', 'rage', 'bell', 'BeatLab Pack'],
      desc: 'In the style of “Money So Big”: a bright rage bell over a blown-out 808 and hard drums.',
      bpm: 150, key: 1, scale: 'minor', swing: 0, bars: 2, song: 'AABBAB',
      tracks: [
        { type: 'drum', sound: 'msb_kick', name: 'Kick', A: 'x.......x.x.....|x.....x...x.....' },
        { type: 'drum', sound: 'msb_clap', name: 'Clap', A: '........x.......|........x.......' },
        { type: 'drum', sound: 'msb_hat', name: 'Hats', A: 'x.x.x.x.x.x.x.x.|x.x.x.x.x.x.x.x.', B: 'x.x.x3x.x.x.x.x.|x.x.x.x.x.4.x.3.' },
        { type: 'drum', sound: 'msb_ohat', name: 'Open Hat', vol: 0.45, A: '................|................', B: '......x.......x.|......x.......x.' },
        { type: 'drum', sound: 'msb_ping', name: 'Ping', vol: 0.4, A: '...x......x.....|...x.........x..' },
        { type: 'synth', inst: 'tonka', name: 'Rage Bell', vol: 0.6, rev: 0.35,
          A: [[0, 7, 2], [2, 9, 2], [4, 7, 2], [6, 4, 2], [8, 7, 2], [10, 9, 2], [12, 11, 4], [16, 5, 2], [18, 7, 2], [20, 5, 2], [22, 4, 2], [24, 2, 2], [26, 4, 2], [28, 6, 4]] },
        { type: 'synth', inst: 'b808hard', name: '808', vol: 0.8, A: [[0, 0, 6], [8, 0, 2], [10, 0, 4], [16, -2, 6], [22, -1, 4], [26, -1, 6]] },
      ],
    },
    {
      id: 'kit-fev', name: 'Fever', color: '#64d2ff', kit: 'fev',
      tags: ['fakemink-type', 'Fever type', 'jerk', 'plugg', 'airy', 'BeatLab Pack'],
      desc: 'In the style of fakemink’s “Fever”: airy pads, glassy bells, ticking hats and a sliding 808.',
      bpm: 155, key: 8, scale: 'major', swing: 0, bars: 2, song: 'ABAB',
      tracks: [
        { type: 'drum', sound: 'fev_kick', name: 'Kick', A: 'x.........x.....|x.....x.........' },
        { type: 'drum', sound: 'fev_snare', name: 'Snare', A: '........x.......|........x.......' },
        { type: 'drum', sound: 'fev_hat', name: 'Hats', A: 'x.xxx.x.x.xxx.x.|x.xxx.x.x.x.3.x.' },
        { type: 'drum', sound: 'fev_ohat', name: 'Air Hat', vol: 0.4, A: '..............x.|..............x.' },
        { type: 'drum', sound: 'fev_vox', name: 'Vox Chop', vol: 0.45, A: '................|................', B: '......x.......x.|..x...x.........' },
        { type: 'synth', inst: 'airpad', name: 'Air Pad', vol: 0.5, octave: -1, rev: 0.6, A: [C(0, 3, 16, 4), C(16, 4, 8, 4), C(24, 5, 8, 4)] },
        { type: 'synth', inst: 'musicbox', name: 'Glass Bells', vol: 0.45, rev: 0.5, A: [],
          B: [[0, 9, 2], [3, 11, 2], [6, 12, 2], [8, 11, 4], [16, 9, 2], [19, 8, 2], [22, 7, 2], [24, 9, 6]] },
        { type: 'synth', inst: 'b808', name: '808 (slides)', vol: 0.85, A: [[0, 3, 7], [6, 3, 5], [10, 4, 6], [16, 4, 6], [20, 5, 6], [24, 5, 8]] },
      ],
    },
    {
      id: 'kit-jbx', name: 'Jukebox', color: '#ffb340', kit: 'jbx',
      tags: ['Kanye-type', 'A$AP-type', 'Jukebox Joints type', 'soul sample', 'boom bap', 'BeatLab Pack'],
      desc: 'In the style of “Jukebox Joints”: a sped-up soul record over dusty, swung drums.',
      bpm: 90, key: 9, scale: 'dorian', swing: 0.3, bars: 2, song: 'ABAB',
      samples: { soul: { builtin: 'jukebox_soul', fit: true, autoKey: true, chops: 8 } },
      tracks: [
        { type: 'drum', sound: 'jbx_kick', name: 'Kick', A: 'x.........x.....|x......x..x.....' },
        { type: 'drum', sound: 'jbx_snare', name: 'Snare', A: '....x.......x...|....x.......x...' },
        { type: 'drum', sound: 'jbx_hat', name: 'Hats', A: 'X.o.x.o.X.o.x.o.|X.o.x.o.X.o.x.xo' },
        { type: 'drum', sound: 'jbx_tamb', name: 'Tambourine', vol: 0.4, A: '................|................', B: '....x.......x...|....x.......x.x.' },
        { type: 'sample', sample: 'soul', mode: 'loop', name: 'Soul Record', vol: 0.75 },
        { type: 'synth', inst: 'sub', name: 'Bass', vol: 0.7, A: [], B: [[0, 0, 7], [8, 3, 7], [16, 1, 7], [24, 4, 7]] },
      ],
    },
  );

  BL.beats = { PRESETS, KITS, drumRow, chopRow, notes, rep, clean };
})(typeof window !== 'undefined' ? window : globalThis);
