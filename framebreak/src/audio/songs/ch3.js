// "FOLD THE WORLD" — a clockwork music-box waltz (3/4). The Framekeeper theme
// again, now on tines and pizzicato, with escapement ticks for percussion.
const oom = { Am: 'A2 . E3 . E3 .', F: 'F2 . C3 . C3 .', G: 'G2 . D3 . D3 .', E: 'E2 . B2 . B2 .', C: 'C3 . G3 . G3 .', Dm: 'D3 . A3 . A3 .', Em: 'E2 . B2 . B2 .' };
const pah = { Am: 'C4+E4', F: 'A3+C4', G: 'B3+D4', E: 'G#3+B3', C: 'E4+G4', Dm: 'F4+A4', Em: 'G3+B3' };
const pad = { Am: 'A3+E4', F: 'F3+C4', G: 'G3+D4', E: 'E3+B3', C: 'C4+G4', Dm: 'D4+A4', Em: 'E3+B3' };
const bars = {};
const sec = (p, mel, ch) => mel.map((m, i) => { const c = ch[i], n = p + i; bars[n] = { box: m, bass: oom[c], pizz: `. . ${pah[c]} . ${pah[c]} .`, pad: `${pad[c]} - - - - -`, tick: i % 4 === 3 ? 'x . y . r .' : 'x . y . y .', cel: m.replace(/([A-G]#?)(\d)/g, (_, a, o) => a + (+o + 1)).replace(/ \. /g, ' . ') }; return n; });
const A = sec('a', ['A4 . E5 . D5 C5', 'C5 . A4 . . .', 'D5 . B4 . G5 F5', 'E5 . . . G#4 B4', 'A4 . E5 . A5 G5', 'F5 . E5 . C5 .', 'D5 . G5 . B4 D5', 'A4 . . . . .'], ['Am', 'F', 'G', 'E', 'Am', 'F', 'G', 'Am']);
const B = sec('b', ['E5 . G5 . C6 .', 'D5 . G5 . B5 .', 'C5 . E5 . A5 .', 'B4 . E5 . G5 .', 'A5 . F5 . C5 .', 'G5 . E5 . C5 .', 'F5 . A5 . D6 .', 'E5 . G#5 . B5 .'], ['C', 'G', 'Am', 'Em', 'F', 'C', 'Dm', 'E']);
B.forEach((n) => { bars[n].flute = bars[n].box; });
A.forEach((n, i) => { if (i % 2) bars[n].glock = '. . . . g .'; });
export const SONG_CH3 = {
  bpm: 138, beats: 3, gain: 1, reverb: 0.4, start: 'A',
  tracks: {
    box: { inst: 'musicbox', vol: 1, send: 0.5 }, cel: { inst: 'celesta', vol: 0.3, pan: 0.35, send: 0.5, layer: 2 }, flute: { inst: 'flute', vol: 0.5, pan: -0.3, send: 0.4, layer: 2 },
    pizz: { inst: 'pizz', vol: 0.5, pan: 0.2, layer: 1 }, bass: { inst: 'pizz', vol: 0.9, transpose: 0, pan: -0.1 }, pad: { inst: 'strings', vol: 0.5, send: 0.5, layer: 2 },
    tick: { kit: 'clock', vol: 0.7 }, glock: { kit: 'clock', vol: 0.6, pan: 0.4 },
  },
  bars, sections: { A, B }, next: { A: 'B', B: 'A' },
};
export const STING3 = {
  solve: [{ inst: 'musicbox', notes: 'C5 E5 G5 C6 E6 - -', step: 0.09, vol: 0.8, send: 0.5 }],
  curator: [{ inst: 'organ', notes: 'D3+A3+D4 - - - A3+E4+A4 - - - D3+A3+C#4 - - - - -', step: 0.22, vol: 0.5, send: 0.7 }],
};
