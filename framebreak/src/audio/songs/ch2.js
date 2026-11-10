// "INK & VIOLENCE" — cartoon swing. 12 tokens per bar = triplet eighths, so
// the swing is written into the grid. The Framekeeper theme on muted trumpet
// over walking bass, ride cymbal and woodblock gags.
const walk = { Am: 'A2 . . C3 . . E3 . . G3 . .', F: 'F2 . . A2 . . C3 . . D3 . .', G: 'G2 . . B2 . . D3 . . F3 . .', E: 'E2 . . G#2 . . B2 . . D3 . .', Dm: 'D2 . . F2 . . A2 . . C3 . .', C: 'C2 . . E2 . . G2 . . A2 . .', A2m: 'A2 . . G2 . . E2 . . G#2 . .' };
const comp = { Am: 'A3+C4+E4', F: 'A3+C4+F4', G: 'B3+D4+G4', E: 'G#3+B3+D4', Dm: 'A3+D4+F4', C: 'G3+C4+E4' };
const cmp = (c) => `. . ${comp[c]} . . . . . ${comp[c]} . . .`, cmp2 = (c) => `${comp[c]} . . . . ${comp[c]} . . . ${comp[c]} . .`;
const RIDE = 'kr . . rh . r r . . rh . r', RIDE2 = 'r . . rh . r kr . . rh . r', FILL = 'kr . . s . s s . s t . l', JUNGLE = 'l . l t . l l . t l . t';
const bars = {};
const sec = (p, mel, ch, extra = {}) => mel.map((m, i) => { const n = p + i, c = ch[i]; bars[n] = { horn: m, bass: walk[c] || walk.Am, piano: i % 2 ? cmp2(c) : cmp(c), drums: i === mel.length - 1 ? FILL : i % 2 ? RIDE2 : RIDE, ...(extra[i] || {}) }; return n; });
const A = sec('a', [
  'A4 . . E5 . D5 C5 . D5 E5 . .', 'C5 . . A4 . . . . G4 A4 . C5', 'D5 . . B4 . D5 G5 . F5 E5 . D5', 'E5 . . . . . G#4 . B4 E5 . .',
  'A5 . . E5 . D5 C5 . A4 C5 . E5', 'F5 . E5 D5 . C5 A4 . . . . .', 'B4 . D5 G5 . . F5 . D5 B4 . G4', 'A4 . . . . . . . . E5 A5 .',
], ['Am', 'F', 'G', 'E', 'Am', 'F', 'G', 'A2m'], { 1: { wood: '. . . . . . w . q . . .' }, 3: { wood: '. . . . . . . . . w w q' }, 5: { reed: '. . . . . . . . E5 D5 . C5' }, 7: { wood: 'w . . q . . g . . . . .' } });
const B = sec('b', [
  'F5 . . . . A5 . . F5 D5 . .', 'G5 . . . . B5 . . G5 D5 . .', 'E5 . G5 C6 . . B5 . G5 E5 . .', 'A5 . . . . . F5 . C5 A4 . .',
  'D5 . F5 A5 . . G5 . F5 D5 . .', 'G#5 . . . . B5 . . E5 G#5 . B5', 'C6 . . A5 . . E5 . . C5 . A4', 'B4 . . . . G#4 . . E5 . . .',
], ['Dm', 'G', 'C', 'F', 'Dm', 'E', 'Am', 'E']);
B.forEach((n, i) => { bars[n].reed = bars[n].horn; bars[n].horn = i % 2 ? '. . . . . . . . . . . .' : '. . . . . . A4 . C5 . . .'; });
// boss: jungle toms, growling low brass, the theme in stabs
const X = sec('x', [
  'A4 . . . . . A4 . C5 . . .', 'D#5 . . E5 . . . . . . . .', 'A4 . . . . . A4 . C5 . . .', 'F5 . E5 D#5 . E5 . . . . . .',
  'A5 . . . . . A5 . G5 . . .', 'F5 . . E5 . . D#5 . . E5 . .', 'A4 . C5 E5 . A5 . . G#5 . . .', 'A5 . . . . . . . . . . .',
], ['Am', 'Am', 'Am', 'E', 'Am', 'F', 'Am', 'E']);
X.forEach((n, i) => { bars[n].drums = i === 7 ? 'kc . . s . s l . l t . t' : 'k . l t . l ks . t l . t'; bars[n].low = i % 2 ? 'A2 . . . . . G2 . . G#2 . .' : 'A2 . . . . . . . . A2 . .'; bars[n].bass = 'A2 . A2 C3 . A2 D3 . A2 D#3 . E3'; });
// flood: the band is going under — half-time, sinking bass
bars.f0 = { bass: 'A2 . . . . . G2 . . . . .', drums: 'k . . . . . s . . . . .', horn: 'A4 . . . . . E5 . . . . .', piano: cmp('Am') };
bars.f1 = { bass: 'F2 . . . . . E2 . . . . .', drums: 'k . . . . . s . . t . l', horn: 'C5 . . . . . A4 . . . . .', piano: cmp('F') };
bars.i0 = { wood: 'w . . . . . w . . . . .', drums: '. . . . . . . . . . . .' };
bars.i1 = { wood: 'w . . w . . w . . w . .', drums: '. . . . . . s . s s . s' };

export const SONG_CH2 = {
  bpm: 172, gain: 1, reverb: 0.16, start: 'count',
  tracks: {
    horn: { inst: 'mute', vol: 0.95, pan: 0.15, send: 0.2 }, reed: { inst: 'clarinet', vol: 0.8, pan: -0.25, send: 0.2 },
    low: { inst: 'brass', vol: 0.8, pan: -0.1, transpose: -12 }, piano: { inst: 'piano', vol: 0.55, pan: 0.3, layer: 1 },
    bass: { inst: 'upright', vol: 1 }, drums: { kit: 'jazz', vol: 0.85 }, wood: { kit: 'jazz', vol: 0.8, pan: -0.4 },
  },
  bars, sections: { count: ['i0', 'i1'], A, B, boss: X, flood: ['f0', 'f1'] }, next: { count: 'A', A: 'B', B: 'A', boss: 'boss', flood: 'flood' },
};
export const STING2 = {
  wah: [{ inst: 'mute', notes: 'E5 D#5 D5 C#5 - - -', step: 0.16, vol: 0.7 }],
  tada: [{ inst: 'brass', notes: 'A4+C5+E5 . A4+C5+E5 A4+C#5+E5+A5 - - -', step: 0.13, vol: 0.6 }, { kit: 'jazz', notes: 's . s c', step: 0.13, vol: 0.8 }],
  vell: [{ inst: 'celesta', notes: 'E6 G6 F#6 D#6 E6 - -', step: 0.1, vol: 0.6, send: 0.4 }],
};
