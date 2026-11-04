// FLOOR 99 — Original Soundtrack.
// Composed for this game as step patterns. 16 steps per bar. `res` = steps per note token.
// Layers: pad, pulse, drums, perc, bass, lead, orch, choir (+ generated 'susp' suspense layer).
// The game crossfades layers by intensity: calm → combat → vote → disaster → boss.

const dots = (bars) => '.'.repeat(16 * bars);
const rep = (s, n) => Array(n).fill(s).join('');
const rest = (bars, res = 2) => Array(Math.round(16 / res * bars)).fill('.').join(' ');

// The leitmotif — "THE AU-DI-ENCE WANTS A SHOW" — over Dm | Bb | Gm | A (2 bars each)
const MOTIF = [
  'a4 d5 d5 e5 f5! e5 d5 -', '- - - - . . a4 c5',
  'bb4 d5 d5 e5 f5! g5 f5 -', '- - - - . . f5 g5',
  'bb5! - a5 g5 f5 - e5 -', 'd5 - - - . . e5 f5',
  'e5! - - - c#5 - a4 -', 'c#5 - d5 - e5 - - -',
].join(' | ');

export const TRACKS = {
  menu: {
    id: 'menu', title: 'The Audience Wants A Show', subtitle: 'Main Theme', bpm: 96, swing: 0,
    chords: ['d3 f3 a3', 'bb2 d3 f3', 'g2 bb2 d3', 'a2 c#3 e3'], chordBars: 2,
    parts: [
      { layer: 'pad', chord: true, inst: 'pad', every: 2, bright: 1100 },
      { layer: 'choir', chord: true, inst: 'choir', every: 2, octave: 12, vol: 0.8 },
      { layer: 'bass', bassline: 'x...............|x.......x.......', kind: 'sub', octave: -24 },
      { layer: 'pulse', arp: [0, 1, 2, 3, 2, 1, 2, 3, 4, 3, 2, 3, 4, 5, 4, 3], inst: 'pluck', kind: 'soft', octave: 12, vol: 0.55 },
      { layer: 'drums', inst: 'kick', hits: dots(8) + rep('x.........x.....', 7) + 'x.........x.x.x.' },
      { layer: 'drums', inst: 'clap', hits: dots(8) + rep('........x.......', 8) },
      { layer: 'drums', inst: 'hat', hits: dots(8) + rep('..x...x...x...xo', 8), vol: 0.7 },
      { layer: 'perc', inst: 'taiko', hits: dots(7) + '....x.x.xxxxXXXX' + rep('x.....x.........', 8) },
      { layer: 'perc', inst: 'crash', hits: dots(8) + 'X' + dots(8).slice(1) },
      { layer: 'orch', inst: 'strings', notes: rest(8, 16) + ' ' + ['d3+a3', 'bb2+f3', 'g2+d3', 'a2+e3'].map((c) => c + ' -').join(' '), res: 16, vol: 0.9 },
      { layer: 'lead', inst: 'lead', notes: rest(8) + ' ' + MOTIF, res: 2, vol: 0.9 },
    ],
  },

  f1: {
    id: 'f1', title: 'Welcome To The Show', subtitle: 'Floor 1', bpm: 140, swing: 0.03,
    chords: ['e3 g3 b3', 'e3 g3 b3', 'c3 e3 g3', 'c3 e3 g3', 'd3 f#3 a3', 'd3 f#3 a3', 'b2 d#3 f#3', 'b2 d#3 f#3 a3'],
    parts: [
      { layer: 'drums', inst: 'kick', hits: rep('x.....x...x.....x.x.......x..x..', 4) },
      { layer: 'drums', inst: 'snare', hits: rep('....x..g.g..x.......x..g.g..x..g', 4) },
      { layer: 'drums', inst: 'hat', hits: 'x.o.x.oxx.o.x.ox', vol: 0.8 },
      { layer: 'drums', inst: 'crash', hits: 'X' + dots(8).slice(1) },
      { layer: 'perc', inst: 'metal', hits: '..........x...........x.......x.', note: 'e4', vol: 0.55 },
      { layer: 'perc', inst: 'shaker', hits: 'gxgxgxgxgxgxgxgx', vol: 0.7 },
      { layer: 'bass', bassline: 'x.xo..x.x.xo..xox.xo..x.x.x.o.xf', kind: 'bass', octave: -24 },
      { layer: 'pad', chord: true, inst: 'pad', bright: 900 },
      { layer: 'pulse', arp: [0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5, 3, 4, 5, 6], inst: 'pluck', octave: 12, vol: 0.5 },
      { layer: 'orch', inst: 'stab', hits: '...x..x.....x.......x..x....x...', octave: 12, len: 2, vol: 0.85 },
      { layer: 'choir', chord: true, inst: 'choir', every: 2, octave: 12, vol: 0.8 },
      {
        layer: 'lead', inst: 'lead', res: 2, notes: [
          'b4 . e5 . g5! . f#5 e5', 'b4 . . . e5 d5 b4 .',
          'c5 . e5 . g5! . f#5 e5', 'c5 . . . g4 a4 b4 .',
          'd5 . f#5 . a5! . g5 f#5', 'd5 . . . e5 f#5 a5 .',
          'b5! . a5 . f#5 . d#5 .', 'b4 . c5 . d#5 . f#5 .',
        ].join(' | '),
      },
    ],
  },

  f4: {
    id: 'f4', title: 'Assembly Line', subtitle: 'Floor 4', bpm: 126, swing: 0,
    chords: ['c3 eb3 g3', 'c3 eb3 g3', 'db3 f3 ab3', 'c3 eb3 g3', 'c3 eb3 g3', 'c3 eb3 g3', 'bb2 d3 f3', 'ab2 c3 eb3'],
    parts: [
      { layer: 'drums', inst: 'kick', hits: 'x...x...x...x...' },
      { layer: 'drums', inst: 'clap', hits: '....x.......x...' },
      { layer: 'drums', inst: 'hat', hits: 'g.o.g.o.g.o.g.og', vol: 0.9 },
      { layer: 'drums', inst: 'crash', hits: 'X' + dots(8).slice(1) },
      { layer: 'perc', inst: 'metal', hits: 'x..x..x..x..x..x..x..x..x..x..x..x..x..x..x..x..', note: 'c4', vary: true, vol: 0.65 },
      { layer: 'perc', inst: 'hiss', hits: '............x...' + dots(1), vol: 0.9 },
      { layer: 'perc', inst: 'tom', hits: dots(3) + '..........x.x.xx', note: 'c3', vol: 0.8 },
      { layer: 'bass', bassline: 'xxoxxfxoxxoxxfxo', kind: 'acid', octave: -24, maxLen: 1 },
      { layer: 'pad', chord: true, inst: 'pad', bright: 700 },
      { layer: 'pulse', arp: [0, 2, 1, 2, 0, 2, 1, 3], res: 2, inst: 'pluck', kind: 'soft', octave: 24, vol: 0.55 },
      { layer: 'orch', inst: 'stab', hits: 'x.....x.........' + dots(1), octave: 0, len: 3, vol: 0.8 },
      { layer: 'orch', arp: [0, 0, 2, 0, 1, 0, 2, 1], res: 2, inst: 'strings', octave: -12, vol: 0.55 },
      { layer: 'choir', chord: true, inst: 'choir', every: 2, octave: 12, vol: 0.7 },
      {
        layer: 'lead', inst: 'lead', res: 2, notes: [
          'c5! . . . eb5 . db5 .', 'c5 . . . g4 . . .',
          'c5! . . . eb5 . f5 .', 'g5 . f5 . eb5 . db5 .',
          'c5! . . . eb5 . db5 .', 'c5 . . . g4 . . .',
          'bb4 . . . d5 . f5 .', 'eb5 . d5 . c5 . . .',
        ].join(' | '),
      },
    ],
  },

  f12: {
    id: 'f12', title: 'Pressure Drop', subtitle: 'Floor 12', bpm: 172, swing: 0,
    chords: ['f#3 a3 c#4', 'd3 f#3 a3', 'a2 c#3 e3', 'e3 g#3 b3'], chordBars: 2,
    parts: [
      { layer: 'drums', inst: 'kick', hits: 'x.........x.....x.x.......x.....' },
      { layer: 'drums', inst: 'snare', hits: '....x.......x.......x..g.g..x..g' },
      { layer: 'drums', inst: 'hat', hits: 'xgxgxgxgxgxgxgxg', vol: 0.7 },
      { layer: 'drums', inst: 'crash', hits: 'X' + dots(8).slice(1) },
      { layer: 'perc', inst: 'shaker', hits: 'g.x.g.x.g.x.g.x.', vol: 0.9 },
      { layer: 'perc', inst: 'rim', hits: '......x.......x.......x...x...x.', vol: 0.6 },
      { layer: 'bass', bassline: 'x...........x...x.....x.....o...', kind: 'reese', octave: -24 },
      { layer: 'pad', chord: true, inst: 'pad', every: 2, bright: 1300 },
      { layer: 'pulse', arp: [0, 2, 4, 2, 1, 3, 5, 3], res: 2, inst: 'bell', octave: 12, vol: 0.6 },
      { layer: 'orch', chord: true, inst: 'strings', every: 2, octave: 12, vol: 0.8 },
      { layer: 'choir', chord: true, inst: 'choir', every: 2, octave: 12, vol: 0.7 },
      {
        layer: 'lead', inst: 'lead', res: 2, notes: [
          'c#5 - - e5 - - f#5! -', 'e5 - c#5 - - - . .',
          'a4 - - c#5 - - d5! -', 'c#5 - a4 - - - . .',
          'e5 - - c#5 - - a4 -', 'b4 - c#5 - - - . .',
          'g#4 - - b4 - - e5! -', 'd#5 - e5 - f#5 - g#5 -',
        ].join(' | '),
      },
    ],
  },

  boss: {
    id: 'boss', title: 'Mr. Halo Will See You Now', subtitle: 'Boss Theme', bpm: 150, swing: 0,
    chords: ['d3 f3 a3', 'bb2 d3 f3', 'g2 bb2 d3', 'a2 c#3 e3'], chordBars: 2,
    parts: [
      { layer: 'drums', inst: 'kick', hits: 'x.........x.....x.....x.x.......' },
      { layer: 'drums', inst: 'snare', hits: '........x...............x.....x.' },
      { layer: 'drums', inst: 'hat', hits: 'xgxgxgxgxgxgxgxg', vol: 0.75 },
      { layer: 'drums', inst: 'crash', hits: 'X' + dots(4).slice(1) },
      { layer: 'perc', inst: 'taiko', hits: 'x..x..x.....x...x..x..x...x.x.x.' },
      { layer: 'bass', bassline: 'x.xx.xx.x.xx.xxo', kind: 'bass', octave: -24 },
      { layer: 'pad', chord: true, inst: 'pad', every: 2, bright: 900 },
      { layer: 'orch', arp: [0, 0, 2, 0, 1, 0, 2, 0, 0, 0, 2, 0, 3, 2, 1, 0], inst: 'strings', octave: 12, vol: 0.5 },
      { layer: 'orch', inst: 'stab', hits: 'x.....x.....x...x.....x...x.x...', octave: 0, len: 3, vol: 0.9 },
      { layer: 'pulse', arp: [0, 1, 2, 3, 2, 1, 2, 3], res: 2, inst: 'pluck', octave: 24, vol: 0.4 },
      { layer: 'choir', chord: true, inst: 'choir', every: 2, octave: 12, vol: 1 },
      { layer: 'lead', inst: 'lead', res: 2, notes: MOTIF },
    ],
  },

  lounge: {
    id: 'lounge', title: 'Elevator To Heaven', subtitle: 'Contestant Lounge', bpm: 104, swing: 0.1,
    chords: ['f3 a3 c4 e4', 'd3 f3 a3 c4', 'g3 bb3 d4 f4', 'c3 e3 g3 bb3', 'a3 c4 e4 g4', 'd3 f#3 a3 c4', 'g3 bb3 d4 f4', 'c3 e3 g3 bb3'],
    states: {
      calm: { pulse: 1, perc: 1, bass: 1, lead: 1, drums: 0.8, pad: 0.6 },
      full: { pulse: 1, perc: 1, bass: 1, lead: 1, drums: 0.8, pad: 0.6 },
    },
    parts: [
      { layer: 'pulse', inst: 'chordpluck', kind: 'epiano', hits: 'x..x..x...x..x..', octave: 0, len: 3, vol: 0.9 },
      { layer: 'bass', bassline: 'x.....f.x.....f.', kind: 'upright', octave: -24 },
      { layer: 'perc', inst: 'rim', hits: 'x..x..x...x..x..', vol: 0.7 },
      { layer: 'perc', inst: 'shaker', hits: 'xgxgxgxgxgxgxgxg', vol: 0.6 },
      { layer: 'drums', inst: 'kick', hits: 'x......xx.......', vol: 0.45 },
      { layer: 'pad', chord: true, inst: 'pad', octave: 12, vol: 0.35, bright: 1500 },
      {
        layer: 'lead', inst: 'vibes', res: 2, notes: [
          'e5 - - c5 - - a4 -', 'c5 - - a4 - - f4 -',
          'bb4 - - a4 - - g4 -', 'e4 - g4 - bb4 - d5 -',
          'e5 - - - . . g5 -', 'f#5 - - e5 - - c5 -',
          'd5 - - bb4 - - g4 -', 'bb4 - - - g4 - e4 -',
        ].join(' | '),
      },
    ],
  },
};

export const SOUNDTRACK = [
  { id: 'menu', unlock: null },
  { id: 'f1', unlock: 1 },
  { id: 'f4', unlock: 4 },
  { id: 'f12', unlock: 12 },
  { id: 'boss', unlock: 4 },
  { id: 'lounge', unlock: 1 },
];
