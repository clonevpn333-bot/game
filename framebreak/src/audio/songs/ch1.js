// "PIXEL PANIC" — original chiptune score for Chapter 1.
// A minor, 152 bpm. Sections: A/B (city), train (gallop arrangement),
// boss1-3 (GRIDLOCK), tear (the grid coming apart).
// The opening four bars are the Framekeeper theme that every later
// reality re-orchestrates.
const bass8 = (r, o = 2, last = null) => { const a = r + o, b = r + (o + 1); return `${a} - ${a} - ${b} - ${a} - ${a} - ${b} - ${a} - ${last || b} -`; };
const gallop = (r, o = 2) => { const a = r + o, b = r + (o + 1); return `${a} . ${a} ${a} ${b} . ${a} ${a} ${a} . ${a} ${a} ${b} . ${a} ${b}`; };
const arp = (n) => { const [a, b, c, d] = n; return `${a} ${b} ${c} ${d} ${c} ${b} ${a} ${b} ${c} ${d} ${c} ${b} ${a} ${b} ${c} ${b}`; };
const stab = (ch) => `. . ${ch} . . . ${ch} . . . ${ch} . . ${ch} . .`;

const CH = {
  Am: { b: 'A', arp: ['A4', 'C5', 'E5', 'A5'], st: 'C5+E5' }, F: { b: 'F', arp: ['F4', 'A4', 'C5', 'F5'], st: 'A4+C5' },
  G: { b: 'G', arp: ['G4', 'B4', 'D5', 'G5'], st: 'B4+D5' }, E: { b: 'E', arp: ['E4', 'G#4', 'B4', 'E5'], st: 'G#4+B4' },
  C: { b: 'C', arp: ['C5', 'E5', 'G5', 'C6'], st: 'E5+G5', o: 3 }, Em: { b: 'E', arp: ['E4', 'G4', 'B4', 'E5'], st: 'G4+B4' },
  Dm: { b: 'D', arp: ['D4', 'F4', 'A4', 'D5'], st: 'F4+A4', o: 3 },
};
const D1 = 'k . h . s . h . k k h . s . h h', D1b = 'k . h . s . h k . k h . s . h .', DF = 'k . h . s . h . k k s . s s t m';
const D2 = 'h h . h h h . h h h . h h h o .', DG = 'k . k k s . k k k . k k s . k s', DGF = 'k . k k s . k k s s t t m m l l';

const MEL_A = [
  'A4 - - E5 - - D5 - C5 - D5 - E5 - - -', 'C5 - - A4 - - F4 - A4 - C5 - F5 - E5 -',
  'D5 - - B4 - - G4 - B4 - D5 - G5 - - -', 'E5 - - C5 - - A4 - B4 - - - G#4 - B4 -',
  'A4 - - E5 - - D5 - C5 - D5 - E5 - A5 -', 'G5 - - F5 - - E5 - F5 - - - C5 - A4 -',
  'B4 - D5 - G5 - F5 - E5 - D5 - B4 - G4 -', 'E5 - - - G#5 - - - B5 - - G#5 - - E5 -',
];
const HAR_A = [
  'C4 - - - - - E4 - - - - - C4 - - -', 'A3 - - - - - C4 - - - - - A3 - - -', 'B3 - - - - - D4 - - - - - B3 - - -', 'C4 - - - - - A3 - G#3 - - - E4 - - -',
  'C4 - - - - - E4 - - - - - C4 - - -', 'A3 - - - - - C4 - - - - - F4 - - -', 'G4 - - - B4 - - - G4 - - - D4 - - -', 'G#4 - - - B4 - - - E5 - - - B4 - - -',
];
const CH_A = ['Am', 'F', 'G', 'Am', 'Am', 'F', 'G', 'E'];
const MEL_B = [
  'G5 - - - E5 - - - C5 - - E5 - - G5 -', 'D5 - - - B4 - - - G4 - - B4 - - D5 -', 'C5 - - - E5 - - - A5 - - G5 - - E5 -', 'B4 - - - E5 - - - G5 - - - E5 - B4 -',
  'A5 - - - F5 - - - C5 - - F5 - - A5 -', 'G5 - - - E5 - - - C5 - - E5 - - G5 -', 'F5 - - E5 - - D5 - F5 - - A5 - - D6 -', 'B5 - - - G#5 - - - E5 - G#5 - B5 - E6 -',
];
const CH_B = ['C', 'G', 'Am', 'Em', 'F', 'C', 'Dm', 'E'];

const bars = {};
const mk = (prefix, mel, chords, { drum = D1, fill = DF, drum2 = D2, bassFn = bass8, harm = null } = {}) => mel.map((m, i) => {
  const c = CH[chords[i]], name = prefix + i;
  bars[name] = { lead: m, bass: bassFn(c.b, c.o || 2), arp: arp(c.arp), stab: stab(c.st), drums: i === mel.length - 1 ? fill : i % 2 ? D1b : drum, hats: drum2 };
  if (harm) bars[name].harm = harm[i];
  if (bassFn === gallop) bars[name].drums = i === mel.length - 1 ? DGF : DG;
  return name;
});
const A = mk('a', MEL_A, CH_A, { harm: HAR_A }), B = mk('b', MEL_B, CH_B);
const TA = mk('ta', MEL_A, CH_A, { bassFn: gallop, harm: HAR_A }), TB = mk('tb', MEL_B, CH_B, { bassFn: gallop });

bars.intro0 = { bass: 'A2 - - - - - - - A2 - - - - - A2 -', drums: 'k . . . . . . . k . . . s . s s', arp: arp(CH.Am.arp) };
bars.intro1 = { bass: 'E2 - - - - - - - E2 - - - E2 - E3 -', drums: 'k . . . s . . . k . s . s s t m', arp: arp(CH.E.arp), lead: '. . . . . . . . E5 - G#5 - B5 - E6 -' };

// --- boss: chromatic ostinato + tritone lead
const BO = 'A2 A2 A3 A2 C3 A2 D3 A2 D#3 A2 D3 A2 C3 A2 G2 G#2', BO2 = 'F2 F2 F3 F2 G#2 F2 A#2 F2 B2 F2 A#2 F2 G#2 F2 E2 E3';
const BL = ['E5 - - D#5 - - E5 - A5 - - - G5 - E5 -', 'D#5 - - D5 - - D#5 - G5 - - F#5 - - D#5 -', 'E5 - - D#5 - - E5 - C6 - - - B5 - A5 -', 'G#5 - A5 - B5 - C6 - B5 - G#5 - E5 - - -',
  'F5 - - E5 - - F5 - A5 - - - G#5 - F5 -', 'E5 - - D#5 - - E5 - G#5 - - - B5 - - -', 'A5 - G5 - E5 - D5 - C5 - D5 - E5 - G5 -', 'A5 - - - - - E5 - A5 - C6 - E6 - - -'];
const BB = [BO, BO, BO, 'E2 E2 E3 E2 G#2 E2 B2 E2 D3 E2 B2 E2 G#2 E2 E3 E2', BO2, 'E2 E2 E3 E2 G#2 E2 B2 E2 D3 E2 B2 E2 G#2 E2 E3 E2', BO, BO];
const BAR = ['Am', 'Am', 'Am', 'E', 'F', 'E', 'Am', 'Am'];
const BD = 'k . h k s . h . k k h k s . h s', BDF = 'k k s k s s k s k s s k t t m l', BD2 = 'h h h h h h o . h h h h h h o .';
const boss = (prefix, tr = 0) => BL.map((m, i) => { const n = prefix + i; bars[n] = { lead: m, bass: BB[i], arp: arp(CH[BAR[i]].arp), drums: i === 7 ? BDF : BD, hats: BD2, stab: stab(CH[BAR[i]].st) }; return n; });
const B1 = boss('x'), B2 = boss('y'), B3 = boss('z');
// phase 3 doubles the lead an octave up with stutters
B3.forEach((n) => { bars[n] = { ...bars[n], harm: bars[n].lead.replace(/([A-G]#?)5/g, '$16').replace(/([A-G]#?)6 - -/g, '$16 $16 -') }; });
// the grid tearing: the theme with notes missing, bass wandering
bars.tear0 = { lead: 'A4 - - E5 . . . . C5 - . . E5 - - -', bass: 'A2 - - - - - - - . . . . A2 - - -', drums: 'k . . . . . s . . . . . . h . h' };
bars.tear1 = { lead: 'C5 . . A4 - - . . . . C5 - F5 . . .', bass: 'F2 - - - - - - - - - - - . . . .', drums: '. . . . s . . . k . . . . . . .' };
bars.tear2 = { lead: 'D5 - - . . . G4 - . . D5 - G5 - - -', bass: 'G2 - - - . . . . G2 - - - - - - -', drums: 'k . . . . . . . . . s . . . h .' };
bars.tear3 = { lead: 'E5 - - - - - - - . . . . . . . .', bass: 'A1 - - - - - - - - - - - - - - -', drums: 'k . . . . . . . . . . . . . . .' };

export const SONG_CH1 = {
  bpm: 152, gain: 1, reverb: 0.06, start: 'intro',
  tracks: {
    lead: { inst: 'lead', vol: 1, pan: 0.05 },
    harm: { inst: 'lead2', vol: 0.7, pan: -0.3, layer: 1 },
    stab: { inst: 'arp', vol: 0.75, pan: 0.35, layer: 1, maxLayer: 1 },
    arp: { inst: 'arp', vol: 0.7, pan: 0.3, layer: 2 },
    bass: { inst: 'chipbass', vol: 1, pan: 0 },
    drums: { kit: 'chip', vol: 0.9, layer: 1 },
    hats: { kit: 'chip', vol: 0.55, layer: 2, pan: -0.2 },
  },
  bars,
  sections: { intro: ['intro0', 'intro1'], A, B, train: [...TA, ...TB], boss1: B1, boss2: B2, boss3: B3, tear: ['tear0', 'tear1', 'tear2', 'tear3'] },
  next: { intro: 'A', A: 'B', B: 'A', train: 'train', boss1: 'boss1', boss2: 'boss2', boss3: 'boss3', tear: 'tear' },
};

export const STING = {
  checkpoint: [{ inst: 'lead', notes: 'C5 E5 G5 C6', step: 0.07, vol: 0.5 }],
  vell: [{ inst: 'bell', notes: 'E6 G6 F#6 D#6 E6 - -', step: 0.09, vol: 0.5, send: 0.4 }],
  danger: [{ inst: 'lead2', notes: 'A3 - D#4 - A3 - D#4 -', step: 0.11, vol: 0.6 }, { kit: 'chip', notes: 'l . l . l l t t', step: 0.11, vol: 0.8 }],
  clear: [{ inst: 'lead', notes: 'A4 C5 E5 A5 - G5 A5 - - -', step: 0.1, vol: 0.6 }, { inst: 'chipbass', notes: 'A2 - - - F2 - A2 - - -', step: 0.1, vol: 0.7 }],
};
