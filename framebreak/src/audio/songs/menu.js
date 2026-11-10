// Title theme — "One Universe". The Framekeeper theme at half speed over
// warm pads; each reality's instrument gets a small voice in the texture.
const hold = (ch) => `${ch} - - - - - - - - - - - - - - -`;
const ar = (a, b, c, d) => `${a} . ${b} . ${c} . ${d} . ${c} . ${b} . ${a} . ${c} .`;
const CH = [
  ['A3+C4+E4', 'A1', ['A4', 'C5', 'E5', 'A5']], ['F3+A3+C4', 'F1', ['F4', 'A4', 'C5', 'F5']], ['C4+E4+G4', 'C2', ['C5', 'E5', 'G5', 'C6']], ['G3+B3+D4', 'G1', ['G4', 'B4', 'D5', 'G5']],
  ['A3+C4+E4', 'A1', ['A4', 'C5', 'E5', 'A5']], ['F3+A3+C4', 'F1', ['F4', 'A4', 'C5', 'F5']], ['G3+B3+D4', 'G1', ['G4', 'B4', 'D5', 'G5']], ['E3+G#3+B3', 'E1', ['E4', 'G#4', 'B4', 'E5']],
];
const MEL = [
  'A4 - - - - - E5 - - - - - D5 - C5 -', 'C5 - - - - - A4 - - - - - - - - -', 'E5 - - - - - G5 - - - - - E5 - D5 -', 'D5 - - - - - B4 - - - - - - - - -',
  'A4 - - - - - E5 - - - - - D5 - C5 -', 'C5 - - - - - F5 - - - - - E5 - - -', 'D5 - - - B4 - - - G5 - - - - - - -', 'E5 - - - - - - - G#5 - - - B5 - - -',
];
const bars = {};
const A = CH.map((c, i) => { bars['a' + i] = { pad: hold(c[0]), bass: hold(c[1]) }; return 'a' + i; });
const B = CH.map((c, i) => { bars['b' + i] = { pad: hold(c[0]), bass: hold(c[1]), bell: MEL[i], arp: ar(...c[2]) }; return 'b' + i; });
const C = CH.map((c, i) => { bars['c' + i] = { pad: hold(c[0]), bass: `${c[1]} - - - - - ${c[1]} - - - ${c[1]} - - - - -`, bell: MEL[i], chip: MEL[i].replace(/4/g, '5').replace(/5 -/g, '5 -'), arp: ar(...c[2]), drums: i === 7 ? 'k . . . . . h . s . . h k . s s' : 'k . . . . . h . s . . . . . h .', box: i % 2 ? '. . . . . . . . . . E6 . C6 . A5 .' : '. . . . . . . . . . . . . . . .' }; return 'c' + i; });

export const SONG_MENU = {
  bpm: 92, gain: 0.95, reverb: 0.5, start: 'A',
  tracks: {
    pad: { inst: 'pad', vol: 1, send: 0.4 }, bass: { inst: 'subbass', vol: 0.75 },
    bell: { inst: 'bell', vol: 0.8, send: 0.6, pan: -0.15 }, arp: { inst: 'celesta', vol: 0.45, send: 0.5, pan: 0.3 },
    chip: { inst: 'lead2', vol: 0.3, pan: 0.4 }, box: { inst: 'musicbox', vol: 0.8, send: 0.6, pan: -0.4 },
    drums: { kit: 'electro', vol: 0.5 },
  },
  bars, sections: { A, B, C }, next: { A: 'B', B: 'C', C: 'B' },
};
