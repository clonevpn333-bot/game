// ACT I — THE BLEED. The seams between the worlds have split and everything
// is leaking into everything else, badly. The floor is a patchwork of every
// format, and each tile behaves like the thing it is: glass cracks under you,
// wool unravels, pixels blink out, wireframe has no floor, ink swallows you,
// paper folds up into walls. Behind you the Curator's "correction" greys the
// world out, and riding it comes the Composite — every old villain glued
// together wrong — whose every slam reshuffles the floor ahead.
import * as THREE from 'three';
import { V, buildVell, bar, Particles } from './kit.js';
import { buildRin3D, animateRin } from '../ch7/rig.js';
import { buildHand } from '../fx/hand.js';
import { JEWEL, hand2d } from './atelierkit.js';
import { LastFrame } from './lastframe.js';
import { pbr, normalFromHeight } from '../fx/tex.js';
import { tex, glassTex, stitchTex, goldFrame } from './atelierkit.js';
import { clamp, lerp, hash2, TAU, ease } from '../core/util.js';

const R1 = (i, s) => hash2(i * 3.7 + 1, s * 1.3 + 2) - 0.5;
const W = 9, L = 112, TS = 4, END = L * TS - 8, CPS = [6, 110, 220, 330];
const VOX = 0, CLAY = 1, PAPER = 2, GLASS = 3, WOOL = 4, PIXEL = 5, WIRE = 6, INK = 7, GREY = 8, NF = 9;
const NAME = ['VOXEL', 'CLAY', 'PAPER', 'GLASS', 'WOOL', 'PIXEL', 'WIREFRAME', 'INK'];
// THE COMPOSITE — the boss theme. It opens as a grand classical piano piece (maestoso, then a
// virtuosic section with the orchestra), and dives steadily more modern: electronic creeping in
// under a Baroque prelude, the full drop, then indie and chip on top of everything.
// D minor, 140 bpm. intro (8 bars, solo piano) scores the cinematic; A orchestral; B electronic
// creeping in; C the drop; D everything; then C and D alternate for the rest of the run.
const SONG = (() => {
  const R16 = '. . . . . . . . . . . . . . . .', up = (n, k = 1) => n.replace(/-?\d/, (d) => +d + k), hold = (n) => `${n} ${'- '.repeat(15).trim()}`;
  const PV = { Dm: ['D3', 'A3', 'D4', 'F4', 'A4'], Dm2: ['D3', 'A3', 'D4', 'F4', 'D5'], Bb: ['A#2', 'F3', 'A#3', 'D4', 'F4'], Gm: ['G2', 'D3', 'G3', 'A#3', 'D4'], A: ['A2', 'E3', 'A3', 'C#4', 'E4'], F: ['F2', 'C3', 'F3', 'A3', 'C4'], C: ['C3', 'G3', 'C4', 'E4', 'G4'] };
  const prel = (c, o = 1) => { const v = PV[c].map((n) => up(n, o)); return [1, 2, 3, 4, 2, 3, 4, 2, 1, 2, 3, 4, 2, 3, 4, 2].map((k, i) => v[k] + (i === 0 ? '!' : i % 4 ? '~' : '')).join(' '); };
  const T = { Dm: ['D', 'F', 'A'], Bb: ['A#', 'D', 'F'], F: ['F', 'A', 'C'], C: ['C', 'E', 'G'], Gm: ['G', 'A#', 'D'], A: ['A', 'C#', 'E'] }, root = (c) => T[c][0], chord = (c, o = 4) => `${T[c][0]}${o}+${T[c][1]}${o}+${T[c][2]}${o}`;
  const oct = (c, o = 2) => `${root(c)}${o}+${root(c)}${o + 1}`, lhHold = (c) => `${oct(c)}! - - - - - - - ${root(c)}${2} - - - - - - -`;
  const pump = (c) => { const ch = `${T[c][0]}3+${T[c][1]}4+${T[c][2]}4`; return `${ch} - - - ${ch} - - - ${ch} - - - ${ch} - - -`; };
  const arp = (c) => { const n = [`${T[c][0]}5`, `${T[c][1]}5`, `${T[c][2]}5`, `${T[c][0]}6`]; return [0, 2, 1, 3, 2, 1, 0, 2, 1, 3, 2, 1, 0, 2, 3, 1].map((k, i) => n[k] + (i % 4 === 0 ? '' : '~')).join(' '); };
  const offsub = (c) => Array.from({ length: 16 }, (_, i) => (i % 4 === 2 ? `${root(c)}2` : '.')).join(' '), onsub = (c) => `${root(c)}2 - - - - - - - ${root(c)}2 - - - - - - -`;
  const jangle = (c) => { const n = [`${T[c][0]}4`, `${T[c][2]}4`, `${T[c][1]}5`, `${T[c][2]}4`]; return Array.from({ length: 16 }, (_, i) => (i % 2 ? '.' : n[(i / 2) % 4] + (i % 8 === 0 ? '!' : '~'))).join(' '); };
  const pbass = (c) => { const r = root(c), f = T[c][2]; return `${r}2! . ${r}2 . ${f}2 . ${r}2 . ${r}2! . ${r}2 . ${f}2 . ${r}3 .`; };
  const MEL = ['A4 - - - D5 - - - E5 - F5 - E5 - D5 -', 'D5 - - - - - - - C5 - A#4 - A4 - - -', 'A4 - - - C5 - - - F5 - - - E5 - D5 -', 'E5 - - - - - - - G5 - - - - - - -', 'A5 - - - G5 - F5 - E5 - - - D5 - - -', 'F5 - - - E5 - D5 - C5 - - - A#4 - A4 -', 'C5 - - - D5 - - - F5 - - - A5 - G5 -', 'G5 - - - - - - - E5 - - - . . . .'];
  const CHIP = ['D5 - A#4 - G4 - A#4 - D5 - - - C5 - A#4 -', 'A4 - - - F4 - - - A#4 - C5 - D5 - - -', 'C5 - A4 - F4 - A4 - C5 - - - D5 - C5 -', 'C#5 - - - E5 - - - A5 - - - G5 - E5 -', 'D5 - A#4 - G4 - A#4 - D5 - - - F5 - D5 -', 'F5 - - - D5 - - - A#4 - C5 - D5 - - -', 'E5 - - - G5 - - - C6 - - - A#5 - G5 -', 'A5 - - - - - - - E5 - C#5 - A4 - - -'];
  const bars = {}, add = (k, b) => { bars[k] = { rh: R16, lh: R16, str: R16, cel: R16, cho: R16, timp: R16, orch: R16, pump: R16, arp: R16, sub: R16, edm: R16, gtr: R16, bas: R16, ind: R16, chip: R16, glk: R16, lead: R16, ...b }; return k; };
  // ---- intro: maestoso, solo piano
  const IRH = ['D5+F5+A5+D6! - - - - - - - - - - - A4+D5+F5 - A5 -', 'A#4+D5+F5+A#5! - - - - - - - A4+C#5+E5+A5! - - - - - - -', 'D6+D5! - - - C6+C5 - A#5+A#4 - A5+A4 - - - G5+G4 - F5+F4 -', 'E5+E4 - - - F5+F4 - G5+G4 - A5+A4! - - - - - - -',
    'D6+A#5+F5! - - - C6 - D6 - F6+D6+A#5! - - - D6 - C6 -', 'A#5+G5+D5 - - - A5 - G5 - D6+A#5+G5! - - - - - - -', 'C#6+A5+E5! - - - D6 - E6 - A6+E6+C#6! - - - G6 - F6 -', 'A3 C#4 E4 G4 A4 C#5 E5 G5 A5 C#6 E6 G6 A6! - - -'];
  const ILH = ['D2+D3! - - - - - - - A2 - D3 - F3 - A3 -', 'A#1+A#2! - - - F2 - A#2 - A1+A2! - - - E2 - A2 -', 'D2 A2 D3 F3 A3 F3 D3 A2 D2 A2 D3 F3 A3 F3 D3 A2', 'A1 E2 A2 C#3 E3 C#3 A2 E2 A1 E2 A2 C#3 E3 C#3 A2 E2',
    'A#1 F2 A#2 D3 F3 D3 A#2 F2 A#1 F2 A#2 D3 F3 D3 A#2 F2', 'G2 D3 G3 A#3 D4 A#3 G3 D3 G2 D3 G3 A#3 D4 A#3 G3 D3', 'A1 E2 A2 C#3 E3 C#3 A2 E2 A1 E2 A2 C#3 E3 C#3 A2 E2', 'A1+A2! - - - - - - - E2+E3 - - - A1+A2! - - -'];
  const intro = IRH.map((r, i) => add('i' + i, { rh: r, lh: ILH[i], orch: i === 7 ? '. . . . . . . . l . l . l l l l' : R16 }));
  // ---- A: virtuosic, the orchestra comes in
  const AC = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Gm', 'Dm'];
  const ARH = ['A5+D6+F6! - - - - - E6 - D6 - C6 - A#5 - A5 -', 'A#5+D6! - - - A5 - G5 - F5+A#5 - - - D5 - F5 -', 'G5+A#5+D6! - - - - - C6 - A#5 - A5 - G5 - F5 -', 'E5+A5+C#6! - - - D6 - E6 - F6 - E6 - D6 - C#6 -',
    'D6+D5! - - - - - - - F6+F5 - E6+E5 - D6+D5 - C6+C5 -', 'A#5+A#4 - - - A5+A4 - - - G5+G4 - F5+F4 - E5+E4 - F5+F4 -', 'G5+G4 - - - A#5+A#4 - - - E5+E4! - - - C#6+C#5 - - -', 'D6+F6+A6! - - - - - - - D6 A5 F5 D5 A4 F4 D4 A3'];
  const ALH = ['D2 A2 F3 D3 A2 F3 D4 A3 F3 D4 A3 F3 D3 A2 F2 A2', 'A#1 F2 D3 A#2 F2 D3 A#3 F3 D3 A#3 F3 D3 A#2 F2 D2 F2', 'G2 D3 A#3 G3 D3 A#3 G3 D3 A#2 D3 G3 D3 A#2 G2 D2 G2', 'A1 E2 C#3 A2 E2 C#3 A3 E3 C#3 A3 E3 C#3 A2 E2 C#2 E2',
    'D2 A2 F3 D3 A2 F3 D4 A3 F3 D4 A3 F3 D3 A2 F2 A2', 'A#1 F2 D3 A#2 F2 D3 A#3 F3 D3 A#3 F3 D3 A#2 F2 D2 F2', 'G2 D3 A#3 D4 G3 D3 A#2 D3 A1 E2 C#3 E3 A3 E3 C#3 E2', 'D2+D3! - - - - - - - D2 A2 D3 F3 A3 D4 F4 A4'];
  const A = ARH.map((r, i) => { const c = AC[i]; return add('a' + i, { rh: r, lh: ALH[i], str: hold(chord(c, 3)), cel: hold(root(c) + '2'), cho: i > 3 ? hold(chord(c)) : R16, timp: `${root(c)}2 . . . . . . . ${i % 2 ? root(c) + '2' : '.'} . . . . . . .`, orch: i === 0 ? 'k . . . . . . . . . . . . . . .' : i === 7 ? 'T . . . T . . . T . T . T T T T' : R16 }); });
  // ---- B: the prelude, and the electronics creep in underneath
  const BC = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A'], BV = ['Dm2', 'Bb', 'F', 'C', 'Dm2', 'Bb', 'Gm', 'A'];
  const B = BC.map((c, i) => add('b' + i, { rh: prel(BV[i]), lh: lhHold(c), str: hold(chord(c, 3)), cel: hold(root(c) + '2'), pump: i > 1 ? pump(c) : R16, sub: i > 3 ? onsub(c) : R16, arp: i > 5 ? arp(c) : R16, edm: i < 2 ? R16 : i < 4 ? '. . h . . . h . . . h . . . h .' : i < 7 ? 'k . h . . . h . k . h . . . h .' : 'k . h . k . h . k k k k s s s w' }));
  // ---- C: the drop — classical and electronic at full strength
  const CC = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C'], CV = ['Dm2', 'Bb', 'F', 'C', 'Dm2', 'Bb', 'F', 'C'], EDM = 'k . h . kc . h . k . h . kc . h o', EDMF = 'k . h . kc . h . k . h . kc s s s';
  const C1 = CC.map((c, i) => add('c' + i, { rh: prel(CV[i]), lh: `${oct(c)}! - - - - - - - ${oct(c)} - - - - - - -`, cel: hold(root(c) + '2'), pump: pump(c), arp: arp(c), sub: offsub(c), edm: i === 0 ? 'b . h . kc . h . k . h . kc . h o' : EDM, orch: i === 0 ? 'b . . . . . . . . . . . . . . .' : R16 }));
  const C2 = CC.map((c, i) => add('m' + i, { rh: prel(CV[i]), lh: `${oct(c)}! - - - - - - - ${oct(c)} - - - - - - -`, str: MEL[i], cel: hold(root(c) + '2'), pump: pump(c), arp: arp(c), sub: offsub(c), edm: i === 7 ? EDMF : EDM, glk: MEL[i].replace(/(\D)(\d)/g, (q, x, d) => x + (+d + 1)).split(' ').map((k, j) => (j % 4 === 0 && k !== '-' ? k : '.')).join(' '), cho: i > 3 ? hold(chord(c)) : R16 }));
  // ---- D: everything — indie guitar, picked bass, chip lead, choir, taiko, and the lead guitar
  const DC = ['Gm', 'Bb', 'F', 'A', 'Gm', 'Bb', 'C', 'A'];
  const D = DC.map((c, i) => add('d' + i, { rh: `${chord(c, 5)}! - - - . . ${chord(c, 5)} - . . . . ${chord(c, 5)}~ - - -`, lh: `${oct(c)}! - - - - - - - ${oct(c)} - - - - - - -`, gtr: jangle(c), bas: pbass(c), chip: CHIP[i], lead: i > 3 ? CHIP[i] : R16, cho: hold(chord(c)), str: hold(chord(c, 3)), pump: pump(c), sub: offsub(c), edm: i === 7 ? EDMF : 'k . . . kc . . . k . k . kc . . .', ind: '. . t . . . t . . . t . . . t .', orch: (i % 4 === 0 ? 'b' : 'T') + ' . . . . . . . T . T . . . . .' }));
  return { bpm: 140, gain: 0.95, reverb: 0.4, start: 'intro', tracks: {
      rh: { inst: 'concert', vol: 1.05, send: 0.45 }, lh: { inst: 'concert', vol: 1.05, send: 0.45 }, str: { inst: 'strings', vol: 0.85, pan: -0.15, send: 0.55 }, cel: { inst: 'celli', vol: 0.7, pan: -0.2, send: 0.4 }, cho: { inst: 'choir', vol: 0.7, send: 0.7 }, timp: { inst: 'timp', vol: 0.75, send: 0.35 }, orch: { kit: 'orch', vol: 0.85, send: 0.3 },
      pump: { inst: 'pump', vol: 0.7, pan: 0.1, send: 0.2 }, arp: { inst: 'pluck', vol: 0.55, pan: 0.3, send: 0.3 }, sub: { inst: 'subbass', vol: 0.85 }, edm: { kit: 'edm', vol: 0.9, send: 0.1 },
      gtr: { inst: 'jangle', vol: 0.8, pan: -0.35, send: 0.35 }, bas: { inst: 'pbass', vol: 0.8 }, ind: { kit: 'indie', vol: 0.8, send: 0.25 }, chip: { inst: 'lead', vol: 0.7, pan: 0.2, send: 0.2 }, glk: { inst: 'bell', vol: 0.6, pan: 0.35, send: 0.6 }, lead: { inst: 'shred', vol: 0.55, pan: 0.25, send: 0.45 } },
    bars, sections: { intro, A, B, C: [...C1, ...C2], D }, next: { intro: 'A', A: 'B', B: 'C', C: 'D', D: 'C' } };
})();
const CARDS = ['PIXEL PANIC', 'INK & VIOLENCE', 'FOLD THE WORLD', 'DOMINO CITY', '1996', 'BLOCK COLLAPSE', 'FULL RESOLUTION', 'CLAY HEART', 'BREAK THE PAGE', 'LAMPLIGHT', 'LEAD & LIGHT', 'LOOSE THREADS', 'PHOSPHOR', 'ONE BREATH', 'PERSISTENCE', "CAT'S CRADLE", 'COUNTERWEIGHT'];
function card(i) {
  if (i === 0) return tex(80, 45, (c) => { const g = c.createLinearGradient(0, 0, 0, 45); g.addColorStop(0, '#232a4d'); g.addColorStop(1, '#5876c9'); c.fillStyle = g; c.fillRect(0, 0, 80, 45); for (let k = 0; k < 9; k++) { const h = 10 + hash2(k, 1) * 22; c.fillStyle = '#2f3a6b'; c.fillRect(k * 9, 45 - h, 8, h); c.fillStyle = '#ffd166'; for (let j = 0; j < h / 4; j++) if (hash2(k, j) > 0.5) c.fillRect(k * 9 + 2, 47 - h + j * 4, 2, 2); } c.fillStyle = '#f4f6ff'; c.fillRect(62, 6, 6, 6); c.fillStyle = '#2fd3c6'; c.fillRect(20, 33, 3, 5); c.fillStyle = '#f4f6ff'; c.fillRect(20, 31, 3, 2); }, true);
  return tex(320, 180, (c) => { const W = 320, H = 180, J = JEWEL;
    if (i === 1) { c.fillStyle = '#f3ead2'; c.fillRect(0, 0, W, H); c.fillStyle = '#17131f'; for (let k = 0; k < 8; k++) { c.beginPath(); c.arc(40 + k * 36, 130 + Math.sin(k) * 20, 14 + hash2(k, 2) * 14, 0, 7); c.fill(); } c.strokeStyle = '#17131f'; c.lineWidth = 8; c.beginPath(); c.arc(240, 60, 34, 0, 7); c.stroke(); c.fillStyle = '#e8483c'; c.beginPath(); c.arc(240, 60, 14, 0, 7); c.fill(); }
    else if (i === 2) { c.fillStyle = '#bfe3df'; c.fillRect(0, 0, W, H); ['#f6efe0', '#e8a87c', '#9cc9c0', '#d98b5f'].forEach((col, k) => { c.fillStyle = 'rgba(40,30,20,0.25)'; c.beginPath(); c.moveTo(0, H); c.quadraticCurveTo(160, 40 + k * 30 + 8, W, H); c.fill(); c.fillStyle = col; c.beginPath(); c.moveTo(0, H); c.quadraticCurveTo(160, 40 + k * 30, W, H); c.fill(); }); }
    else if (i === 3) { c.fillStyle = '#255c40'; c.fillRect(0, 0, W, H); for (let k = 0; k < 9; k++) { c.save(); c.translate(30 + k * 32, 120); c.rotate(k > 5 ? (k - 5) * 0.35 : 0); c.fillStyle = '#f3ead2'; c.fillRect(-9, -50, 18, 50); c.fillStyle = '#17131f'; c.fillRect(-9, -26, 18, 2); c.beginPath(); c.arc(0, -38, 3, 0, 7); c.arc(0, -12, 3, 0, 7); c.fill(); c.restore(); } }
    else if (i === 4) { c.fillStyle = '#3a2330'; c.fillRect(0, 0, W, H); c.fillStyle = '#8a4a44'; c.beginPath(); c.moveTo(0, 0); c.lineTo(120, 60); c.lineTo(120, 120); c.lineTo(0, H); c.moveTo(W, 0); c.lineTo(200, 60); c.lineTo(200, 120); c.lineTo(W, H); c.fill(); c.fillStyle = '#5c3340'; c.fillRect(120, 60, 80, 60); c.fillStyle = '#2b3040'; c.fillRect(0, 150, W, 30); c.fillStyle = '#3fae4f'; c.font = '700 16px monospace'; c.fillText('100%', 12, 171); c.fillStyle = '#ffd166'; c.fillText('AMMO 40', 90, 171); }
    else if (i === 5) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#f2b08a'); g.addColorStop(1, '#ffd9b0'); c.fillStyle = g; c.fillRect(0, 0, W, H); for (let k = 0; k < 24; k++) { const x = (k % 8) * 40, y = 100 + ((k / 8) | 0) * 26 - (k % 3) * 18; c.fillStyle = ['#8f949f', '#b85c48', '#7fae5a'][k % 3]; c.fillRect(x, y, 40, 26); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x, y + 20, 40, 6); } }
    else if (i === 6) { const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#141a33'); g.addColorStop(1, '#b0603f'); c.fillStyle = g; c.fillRect(0, 0, W, H); for (let k = 0; k < 7; k++) { const h = 60 + hash2(k, 3) * 90, x = k * 48; c.fillStyle = '#1b2238'; c.fillRect(x, H - h, 40, h); c.fillStyle = '#ffd696'; for (let j = 0; j < h / 14; j++) if (hash2(k, j + 9) > 0.5) c.fillRect(x + 8, H - h + 6 + j * 14, 10, 6); } c.fillStyle = '#ff5ad0'; c.fillRect(150, 50, 6, 50); }
    else if (i === 7) { c.fillStyle = '#f6e6c8'; c.fillRect(0, 0, W, H); ['#e8742a', '#9cc28a', '#c96a8a', '#e3c28f'].forEach((col, k) => { const g = c.createRadialGradient(60 + k * 70 - 10, 110 - 12, 4, 60 + k * 70, 110, 34); g.addColorStop(0, '#fff'); g.addColorStop(0.3, col); g.addColorStop(1, col); c.fillStyle = g; c.beginPath(); c.ellipse(60 + k * 70, 110, 34, 28, 0, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(52 + k * 70, 104, 6, 0, 7); c.arc(68 + k * 70, 104, 6, 0, 7); c.fill(); c.fillStyle = '#17131f'; c.beginPath(); c.arc(53 + k * 70, 105, 3, 0, 7); c.arc(69 + k * 70, 105, 3, 0, 7); c.fill(); }); }
    else if (i === 8) { c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.strokeStyle = '#17131f'; c.lineWidth = 6; [[8, 8, 140, 80], [156, 8, 156, 80], [8, 96, 304, 76]].forEach(([x, y, w, h]) => c.strokeRect(x, y, w, h)); c.fillStyle = '#17131f'; for (let y = 104; y < 168; y += 9) for (let x = 14; x < 300; x += 9) { c.beginPath(); c.arc(x, y, 2, 0, 7); c.fill(); } c.fillStyle = '#e8483c'; c.font = '900 30px sans-serif'; c.fillText('POW!', 190, 60); }
    else if (i === 9) { const g = c.createRadialGradient(160, 80, 20, 160, 90, 200); g.addColorStop(0, '#ffe9b0'); g.addColorStop(1, '#8a4a22'); c.fillStyle = g; c.fillRect(0, 0, W, H); c.fillStyle = '#1a110c'; c.fillRect(0, 150, W, 30); hand2d(c, 90, 110, 60, -0.2); c.beginPath(); c.arc(220, 96, 14, 0, 7); c.fill(); c.fillRect(214, 108, 12, 40); }
    else if (i === 10) { c.fillStyle = '#0d0c14'; c.fillRect(0, 0, W, H); for (let r = 3; r >= 0; r--) for (let k = 0; k < 12; k++) { const a0 = (k * Math.PI * 2) / 12; c.beginPath(); c.arc(160, 90, 20 + r * 22, a0, a0 + Math.PI / 6); c.arc(160, 90, r * 22, a0 + Math.PI / 6, a0, true); c.closePath(); c.fillStyle = J[(k + r) % 7]; c.fill(); c.strokeStyle = '#0b0a0d'; c.lineWidth = 4; c.stroke(); } }
    else if (i === 11) { for (let y = 0; y < H; y += 12) { c.fillStyle = J[(y / 12) % 7 | 0]; c.fillRect(0, y, W, 12); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; for (let x = 0; x < W; x += 10) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 5, y + 8); c.lineTo(x + 10, y); c.stroke(); } } }
    else if (i === 12) { c.fillStyle = '#03080c'; c.fillRect(0, 0, W, H); c.strokeStyle = '#7ff5e6'; c.lineWidth = 3; c.shadowColor = '#7ff5e6'; c.shadowBlur = 8; c.beginPath(); c.moveTo(150, 70); c.lineTo(178, 90); c.lineTo(150, 110); c.lineTo(158, 90); c.closePath(); c.stroke(); c.strokeStyle = '#ffd166'; c.strokeRect(60, 40, 50, 36); c.strokeRect(230, 100, 40, 30); }
    else if (i === 13) { c.fillStyle = '#ece3cf'; c.fillRect(0, 0, W, H); c.strokeStyle = '#15110f'; c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); c.arc(160, 90, 52, 0.5, 5.9); c.stroke(); c.fillStyle = '#c83c32'; c.fillRect(256, 132, 30, 30); }
    else if (i === 14) { c.fillStyle = '#f5f2e9'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(80,110,190,0.5)'; c.lineWidth = 2; c.strokeRect(96, 62, 70, 40); c.strokeStyle = '#26262e'; c.lineWidth = 3; c.strokeRect(110, 56, 70, 40); c.beginPath(); c.moveTo(0, 140); c.lineTo(W, 136); c.stroke(); for (let k = 0; k < 30; k++) { c.beginPath(); c.moveTo(k * 11, 140); c.lineTo(k * 11 + 8, 180); c.stroke(); } }
    else if (i === 15) { c.fillStyle = '#f1cdbc'; c.fillRect(0, 0, W, H); c.fillStyle = '#e6ab8a'; hand2d(c, 30, 90, 70, 1.57); hand2d(c, 290, 90, 70, -1.57); c.strokeStyle = '#d23a44'; c.lineWidth = 4; c.beginPath(); c.moveTo(60, 50); c.lineTo(260, 120); c.moveTo(60, 130); c.lineTo(260, 60); c.moveTo(60, 90); c.lineTo(260, 90); c.stroke(); }
    else { c.fillStyle = '#f6f2ea'; c.fillRect(0, 0, W, H); c.strokeStyle = '#17151a'; c.lineWidth = 3; c.beginPath(); c.moveTo(160, 0); c.lineTo(160, 30); c.moveTo(60, 40); c.lineTo(260, 26); c.moveTo(120, 90); c.lineTo(240, 100); c.stroke(); [['#d8362f', 60, 70, 26], ['#f2b61e', 260, 56, 20], ['#1f4fa8', 120, 120, 16], ['#17151a', 240, 130, 12]].forEach(([col, x, y, r]) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, r, r * 0.8, 0.3, 0, 7); c.fill(); }); }
    c.fillStyle = 'rgba(13,15,31,0.6)'; c.fillRect(0, H - 22, W, 22); c.fillStyle = '#fff'; c.font = '700 13px sans-serif'; c.fillText(String(i + 1).padStart(2, '0') + '  ' + CARDS[i], 8, H - 7); });
}

export class Bleed {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.name = 'THE BLEED'; this.done = false; }
  help() { return '<b>W/A/S/D</b> run · <b>SHIFT</b> sprint · <b>SPACE</b> jump (again in the air to double jump)<br>Glass cracks · wool unravels · pixels blink · wireframe has no floor · ink swallows you · paper folds up. Outrun the grey.'; }
  build() {
    const g = this.game, ch = this.ch, S = (this.scene = new THREE.Scene()); this.t = 0; this.said = {};
    S.fog = new THREE.FogExp2('#2a1430', 0.0085); this.cam = new THREE.PerspectiveCamera(60, g.W / g.H, 0.2, 1400);
    // sky: the worlds' palettes in torn sectors, turning against each other, with bright seams between
    this.skyM = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { t: { value: 0 }, k: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vP; uniform float t, k; vec3 pal(float i){ i = mod(i, 7.0); return i < 1.0 ? vec3(0.95,0.55,0.2) : i < 2.0 ? vec3(0.2,0.45,0.95) : i < 3.0 ? vec3(0.93,0.84,0.6) : i < 4.0 ? vec3(0.55,0.2,0.75) : i < 5.0 ? vec3(0.1,0.7,0.65) : i < 6.0 ? vec3(0.85,0.25,0.3) : vec3(0.98,0.9,0.4); }
        void main(){ vec3 d = normalize(vP); float a = atan(d.z, d.x), y = d.y; float s1 = floor((a + t * 0.05) * 7.0 / 6.2832 * 2.0 + y * 3.0), s2 = floor((a - t * 0.08) * 5.0 / 6.2832 * 2.0 - y * 4.0);
          vec3 c = mix(pal(s1), pal(s2 + 3.0), 0.5 + 0.5 * sin(y * 6.0 + t * 0.3)); c *= 0.22 + 0.25 * smoothstep(-0.2, 0.8, y);
          float e1 = abs(fract((a + t * 0.05) * 7.0 / 6.2832 * 2.0 + y * 3.0) - 0.5), e2 = abs(fract((a - t * 0.08) * 5.0 / 6.2832 * 2.0 - y * 4.0) - 0.5); c += vec3(1.0, 0.3, 0.9) * smoothstep(0.485, 0.5, e1) * 1.6 + vec3(0.3, 1.0, 0.95) * smoothstep(0.485, 0.5, e2) * 1.4;
          float sc = step(0.995, fract(sin(floor((y + t * 0.4) * 60.0)) * 9999.0)); c += sc * vec3(0.9) * (0.5 + k); gl_FragColor = vec4(c, 1.0); }` });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 20), this.skyM); this.sky.frustumCulled = false; S.add(this.sky);
    // the void under the floor: every palette churning together
    this.voidM = new THREE.ShaderMaterial({ fog: false, uniforms: { t: { value: 0 } }, vertexShader: 'varying vec2 vU; void main(){ vU = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec2 vU; uniform float t; void main(){ vec2 p = vU * 0.02; float v = sin(p.x * 3.0 + t) + sin(p.y * 2.3 - t * 1.3) + sin((p.x + p.y) * 4.1 + t * 0.7) + sin(length(p) * 5.0 - t * 2.0); vec3 c = 0.5 + 0.5 * cos(6.2832 * (v * 0.25 + vec3(0.0, 0.33, 0.67) + t * 0.05)); gl_FragColor = vec4(c * c * (0.35 + 0.65 * smoothstep(0.2, 1.0, sin(v * 3.0))) * 0.9, 1.0); }' });
    const vo = new THREE.Mesh(new THREE.PlaneGeometry(400, 900), this.voidM); vo.rotation.x = -Math.PI / 2; vo.position.set(0, -36, END / 2); S.add(vo);
    S.add(new THREE.HemisphereLight('#c9b8ff', '#3a1a2a', 0.85)); const sun = (this.sun = new THREE.DirectionalLight('#ffe0c0', 2.4)); sun.castShadow = g.settings.shadows > 0; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05; S.add(sun, sun.target);
    // ---- one material per format
    const rep = (t, a) => { if (!t) return null; const c = t.clone(); c.needsUpdate = true; c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(a, a); return c; }, cl = pbr('clay'), knit = stitchTex(), knitN = normalFromHeight(knit.image, 3.2);
    const grass = tex(16, 16, (c) => { for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const h = hash2(x, y); c.fillStyle = y < 3 ? (h > 0.5 ? '#6fbf4a' : '#5aa63c') : h > 0.6 ? '#8a6a4a' : h > 0.25 ? '#7a5a3c' : '#6a4a30'; c.fillRect(x, y, 1, 1); } c.fillStyle = '#7fd05a'; for (let x = 0; x < 16; x++) if (hash2(x, 9) > 0.5) c.fillRect(x, 3, 1, 1); }, true);
    const paperT = tex(128, 128, (c) => { c.fillStyle = '#f3ead6'; c.fillRect(0, 0, 128, 128); c.strokeStyle = 'rgba(120,100,70,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(64, 0); c.lineTo(64, 128); c.moveTo(0, 64); c.lineTo(128, 64); c.stroke(); c.fillStyle = 'rgba(40,30,50,0.55)'; for (let i = 0; i < 9; i++) c.fillRect(12, 12 + i * 5, 30 + hash2(i, 1) * 16, 2); c.strokeStyle = '#d23a44'; c.lineWidth = 3; c.strokeRect(80, 80, 34, 34); });
    const pixT = tex(16, 16, (c) => { c.fillStyle = '#c84c0c'; c.fillRect(0, 0, 16, 16); c.fillStyle = '#ffb08a'; c.fillRect(0, 0, 16, 1); c.fillRect(0, 8, 16, 1); c.fillStyle = '#5a1e04'; c.fillRect(0, 7, 16, 1); c.fillRect(0, 15, 16, 1); c.fillRect(7, 0, 1, 7); c.fillRect(15, 8, 1, 7); c.fillStyle = '#ffd166'; c.fillRect(3, 2, 2, 2); }, true);
    const wireT = tex(128, 128, (c) => { c.clearRect(0, 0, 128, 128); c.strokeStyle = '#7ff5e6'; c.lineWidth = 6; c.strokeRect(3, 3, 122, 122); c.lineWidth = 1.5; c.globalAlpha = 0.6; c.beginPath(); for (let i = 32; i < 128; i += 32) { c.moveTo(i, 0); c.lineTo(i, 128); c.moveTo(0, i); c.lineTo(128, i); } c.stroke(); });
    const greyT = tex(128, 128, (c) => { c.fillStyle = '#9a9aa2'; c.fillRect(0, 0, 128, 128); c.strokeStyle = '#c9c9d0'; c.lineWidth = 1; c.beginPath(); for (let i = 0; i <= 128; i += 16) { c.moveTo(i, 0); c.lineTo(i, 128); c.moveTo(0, i); c.lineTo(128, i); } c.stroke(); });
    const gT = glassTex(1); gT.wrapS = gT.wrapT = THREE.RepeatWrapping;
    this.MAT = [new THREE.MeshStandardMaterial({ map: grass, roughness: 0.9 }), new THREE.MeshStandardMaterial({ color: '#d98a5f', normalMap: rep(cl.normalMap, 1.5), roughness: 0.95 }), new THREE.MeshStandardMaterial({ map: paperT, roughness: 1 }),
      new THREE.MeshStandardMaterial({ map: gT, emissiveMap: gT, emissive: '#ffffff', emissiveIntensity: 1.1, roughness: 0.08, transparent: true, opacity: 0.88 }), new THREE.MeshPhysicalMaterial({ color: '#c9605a', map: rep(knit, 1.5), normalMap: rep(knitN, 1.5), roughness: 1, sheen: 1, sheenColor: new THREE.Color('#ffb0a0') }),
      new THREE.MeshStandardMaterial({ map: pixT, emissiveMap: pixT, emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.7 }), new THREE.MeshBasicMaterial({ map: wireT, transparent: true, depthWrite: false, color: new THREE.Color('#ffffff').multiplyScalar(2.2) }),
      new THREE.MeshPhysicalMaterial({ color: '#08070b', roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0.2 }), new THREE.MeshStandardMaterial({ map: greyT, roughness: 0.6, emissive: '#555560', emissiveIntensity: 0.4 })];
    const tg = new THREE.BoxGeometry(TS - 0.14, 1.2, TS - 0.14); this.IM = this.MAT.map((m) => { const im = new THREE.InstancedMesh(tg, m, W * L); im.count = 0; im.castShadow = im.receiveShadow = m !== this.MAT[WIRE]; im.frustumCulled = false; S.add(im); return im; });
    // ---- tiles
    const N = W * L; this.F = new Int8Array(N); this.Y = new Float32Array(N); this.T = new Float32Array(N); this.WALL = new Float32Array(N); this.FOLD = new Uint8Array(N); this.GONE = new Uint8Array(N); this.POP = new Float32Array(N); this.STOOD = new Uint8Array(N);
    this.spine = []; let c = 4; for (let j = 0; j < L; j++) { if (j > 6 && hash2(j, 77) > 0.6) c = clamp(c + (hash2(j, 78) > 0.5 ? 1 : -1), 1, W - 2); this.spine.push(c); } this.gen(0, L);
    // ---- the far worlds, hung up badly: fragments of every format mis-assembled
    this.junk = []; const JM = this.MAT; for (let n = 0; n < 46; n++) { const s = n % 2 ? 1 : -1, z = n * 10 + hash2(n, 1) * 8, G = new THREE.Group(), k = n % 6, m1 = JM[(n * 3) % 6], m2 = JM[(n * 5 + 2) % 6];
      if (k === 0) { const a = new THREE.Mesh(new THREE.BoxGeometry(6, 9, 6), m1), b = new THREE.Mesh(new THREE.ConeGeometry(5, 5, 4), m2); b.position.y = 7; b.rotation.y = 0.8; G.add(a, b); }
      else if (k === 1) { const a = new THREE.Mesh(new THREE.TorusKnotGeometry(3, 1, 60, 10), m1); G.add(a); }
      else if (k === 2) { for (let i = 0; i < 4; i++) { const a = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 3), JM[(n + i) % 6]); a.position.set(i * 2.2 - 3, Math.sin(i) * 2, i * 0.7); a.rotation.set(i, i * 0.5, 0); G.add(a); } }
      else if (k === 3) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 14, 8), m1), b = new THREE.Mesh(new THREE.SphereGeometry(3.5, 16, 12), m2); b.position.y = 8; b.scale.y = 0.7; G.add(a, b); }
      else if (k === 4) { const a = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), new THREE.MeshBasicMaterial({ map: paperT, side: THREE.DoubleSide })); a.rotation.z = 0.3; G.add(a); }
      else { const a = new THREE.Mesh(new THREE.IcosahedronGeometry(4, 0), m1), e = new THREE.LineSegments(new THREE.EdgesGeometry(a.geometry), new THREE.LineBasicMaterial({ color: new THREE.Color('#ff5ad0').multiplyScalar(2) })); e.scale.setScalar(1.05); G.add(a, e); }
      G.position.set(s * (36 + hash2(n, 2) * 40), 6 + hash2(n, 3) * 30, z); G.rotation.set(hash2(n, 4) * 3, hash2(n, 5) * 3, hash2(n, 6) * 3); G.traverse((o) => (o.castShadow = true)); S.add(G); this.junk.push({ G, b: G.position.clone(), r: G.rotation.clone(), sp: (hash2(n, 7) - 0.5) * 0.6 }); }
    // ---- the correction: a grey wall of finished-ness, and the thing riding it
    this.cz = -24; this.wave = new THREE.Mesh(new THREE.PlaneGeometry(80, 60), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { t: { value: 0 } }, vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'varying vec2 vU; uniform float t; void main(){ vec2 g = abs(fract(vU * vec2(40.0, 30.0)) - 0.5); float l = step(0.46, max(g.x, g.y)); float scan = 0.5 + 0.5 * sin(vU.y * 200.0 - t * 20.0); vec3 c = vec3(0.85, 0.86, 0.9) * (0.35 + 0.4 * l + 0.1 * scan); gl_FragColor = vec4(c * 1.6, 0.55 + 0.3 * l); }' })); S.add(this.wave);
    this.comp = this.buildComposite(); S.add(this.comp.G); this.slamT = 5; this.ripples = [];
    this.portal = goldFrame(12, 9, 0.7); this.portal.position.set(0, 4.5, END + 4); S.add(this.portal); { const pm = new THREE.Mesh(new THREE.PlaneGeometry(12, 9), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff6dc').multiplyScalar(3) })); pm.position.copy(this.portal.position); S.add(pm); this.portalPane = pm; }
    // ---- Rin and Vell
    this.rin = buildRin3D(pbr('fabric').map); S.add(this.rin); this.vell = buildVell(); S.add(this.vell);
    this.cp = CPS[0]; this.p = { x: 0, y: 0, z: CPS[0], vy: 0, gr: true, jumps: 1, coy: 0, buf: 0, yaw: 0, sp: 0, slow: 1 }; this.camPos = V(0, 7, -6); this.shake = 0;
    g.music.play(SONG, { intensity: 2, fade: 0.2 }); g.save.setCheckpoint(18, null); this.DROP = new Float32Array(N); this.buildCine();
  }
  // ---- THE GRIP: why any of this happens. Every world, framed, hanging in the dark around Rin.
  // The Curator's two grey hands rise and crush them all together on the downbeat.
  buildCine() {
    const g = this.game, S = new THREE.Scene(), C = (this.cine = { S, t: 0, cam: new THREE.PerspectiveCamera(50, g.W / g.H, 0.3, 4000), frames: [], impact: false, said: false, shake: 0 }), M = this.MAT;
    S.fog = new THREE.FogExp2('#06050c', 0.0028); S.background = new THREE.Color('#06050c');
    { const n = 1400, p = new Float32Array(n * 3), c = new Float32Array(n * 3), col = new THREE.Color(); for (let i = 0; i < n; i++) { const a = Math.random() * TAU, e = Math.asin(Math.random() * 2 - 1), r = 600 + Math.random() * 600; p.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3); col.set(JEWEL[i % 7]).lerp(new THREE.Color('#ffffff'), 0.6); c.set([col.r, col.g, col.b], i * 3); } const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(p, 3)); gg.setAttribute('color', new THREE.BufferAttribute(c, 3)); S.add(new THREE.Points(gg, new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, vertexColors: true, fog: false }))); }
    S.add(new THREE.HemisphereLight('#7a7ab8', '#140a14', 0.7)); const key = new THREE.DirectionalLight('#ffe2c0', 1.6); key.position.set(30, 80, 60); S.add(key); const rim = new THREE.DirectionalLight('#8a7aff', 1.2); rim.position.set(-60, 20, -80); S.add(rim);
    const tg = new THREE.BoxGeometry(TS - 0.14, 1.2, TS - 0.14); for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const m = new THREE.Mesh(tg, M[[VOX, CLAY, PAPER, GLASS, VOX, WOOL, PIXEL, CLAY, VOX][(i + 1) * 3 + j + 1]]); m.position.set(i * TS, -0.6, j * TS); S.add(m); }
    C.rin = buildRin3D(pbr('fabric').map); S.add(C.rin); C.vell = buildVell(); S.add(C.vell);
    for (let i = 0; i < 17; i++) { const G = new THREE.Group(), t = i === 16 && this.ch.snap0 ? new THREE.CanvasTexture(this.ch.snap0) : card(i); t.colorSpace = THREE.SRGBColorSpace; const pm = new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }); pm.color.setScalar(1.3); const pl = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), pm); G.add(pl, goldFrame(16, 9, 0.7)); G.scale.setScalar(1.75); const a = -Math.PI / 2 + ((i - 16) * TAU) / 17, y = i === 16 ? 9 : 12 + Math.sin(i * 1.9) * 14; G.position.set(Math.cos(a) * 84, y, Math.sin(a) * 84); G.lookAt(0, y, 0); S.add(G); C.frames.push({ G, a, y, q: G.quaternion.clone(), spin: V(R1(i, 1), R1(i, 2), R1(i, 3)) }); }
    const grey = new THREE.MeshStandardMaterial({ map: M[GREY].map, color: '#b4b4bc', metalness: 0.55, roughness: 0.35, emissive: '#3a3a44', emissiveIntensity: 0.6 }); C.hands = [-1, 1].map((sd) => { const h = buildHand(grey, { left: sd < 0 }); h.scale.setScalar(55); h.rotation.y = -sd * Math.PI / 2; h.position.set(sd * 80, -230, -6); h.userData.curl(0.08); h.userData.splay(1.1); S.add(h); return h; });
    C.sparks = new Particles(S, 900, 1.6); C.sparks.g = 6; const ac = g.audio.ctx; C.a0 = ac && ac.state === 'running' ? ac.currentTime : null; this.ch.noPause = true; C.camPos = this.cineCam(0).p.clone(); C.look = this.cineCam(0).l.clone();
  }
  cineCam(t) { const f = this.cine.frames[16].G.position, k1 = ease.inOutCubic(clamp((t - 1.2) / 5, 0, 1)), k2 = ease.inOutCubic(clamp((t - 6.5) / 4.5, 0, 1)), k3 = ease.inCubic(clamp((t - 11) / 2.2, 0, 1));
    const p = V(f.x, f.y, f.z + 22.5).lerp(V(0, 42, 128), k1).lerp(V(0, 12, 112), k2).lerp(V(0, 6, 42), k3), l = f.clone().lerp(V(0, 8, -10), k1).lerp(V(0, 26, 0), k2).lerp(V(0, 12, 0), k3); return { p, l }; }
  updateCine(dt) {
    const g = this.game, C = this.cine, sfx = g.sfx, ac = g.audio.ctx; if (C.a0 != null && ac?.state === 'running') C.t = Math.max(C.t + dt * 0.2, ac.currentTime - C.a0); else C.t += dt; const t = C.t; C.sparks.update(dt);
    if (!C.said && t > 0.9) { C.said = true; g.dialogue.say([{ who: 'curator', text: 'Seventeen worlds. Not one of them stayed finished.' }, { who: 'rin', text: 'Then leave them unfinished.' }, { who: 'curator', text: 'No. If they will not hold apart, they will hold TOGETHER.' }, { who: 'vell', text: "He's crushing them into ONE — hold on!" }]); }
    if (t > 6.6 && !C.rose) { C.rose = true; sfx.play('pp.rumble'); sfx.play('px.bossroar', { pitch: 0.6, vol: 0.7 }); }
    if (t > 10.6 && !C.grip) { C.grip = true; sfx.play('fx.rise'); }
    C.shake = t > 10.6 ? ease.inCubic(clamp((t - 10.6) / 2.4, 0, 1)) * 1.4 : t > 6.6 && t < 9 ? 0.3 : 0;
    if (C.grip && Math.random() < dt * 30) { const F = C.frames[(Math.random() * 17) | 0]; C.sparks.emit(F.G.position, V((Math.random() - 0.5) * 30, Math.random() * 20, (Math.random() - 0.5) * 30), new THREE.Color(JEWEL[(Math.random() * 7) | 0]), 1.2, 6); }
    const cue = g.music.section === 'A' && t > 9, skip = g.input.pressed.confirm && t > 1.5 && !g.input.pressed.jump;
    if (!C.impact && (cue || t > 14.2 || skip)) this.startRun();
  }
  frameCine(dt) {
    const g = this.game, C = this.cine, t = C.t, u = ease.inCubic(clamp((t - 10.6) / 2.3, 0, 1));
    C.frames.forEach((F, i) => { const r = lerp(84, 8 + (i % 3) * 2.5, u), a = F.a + u * 1.4 + Math.sin(t * 0.2 + i) * 0.02; F.G.position.set(Math.cos(a) * r, lerp(F.y + Math.sin(t * 0.6 + i) * 0.6, 7 + (i % 5) * 1.5, u), Math.sin(a) * r); F.G.quaternion.copy(F.q); F.G.rotateX(F.spin.x * u * 3 + Math.sin(t * 0.4 + i) * 0.03); F.G.rotateY(F.spin.y * u * 4); F.G.rotateZ(F.spin.z * u * 5); F.G.scale.setScalar(1 - u * 0.4); });
    const rise = ease.outCubic(clamp((t - 6.6) / 3.6, 0, 1)); C.hands.forEach((h, i) => { const sd = i ? 1 : -1; h.position.set(sd * lerp(80, 44, u), lerp(-230, -48, rise) + u * 6, -6); h.rotation.z = sd * u * 0.25; h.userData.curl(0.08 + u * 1.15); h.userData.thumb(u); });
    C.rin.position.set(0, 0, 0); C.rin.rotation.y = Math.PI + Math.sin(t * 0.5) * (t > 6 ? 0.6 : 0.2); animateRin(C.rin, { speed: 0, ground: true, vy: 0, slide: false, climb: 0, grapple: false, strike: 0, hurt: t > 11 ? 1 : 0, t, dt, lookAt: t > 6.6 ? C.hands[1].position : C.frames[16].G.position, talk: false });
    C.vell.position.set(1.4 + Math.sin(t * 3) * 0.1, 2.4 + Math.sin(t * 2.2) * 0.2, 0.6); C.vell.rotation.y = t; C.vell.userData.tick(t);
    const k = this.cineCam(t), sh = C.shake * (g.settings.shake ?? 1); C.camPos.lerp(k.p, 1 - Math.exp(-5 * dt)); C.look.lerp(k.l, 1 - Math.exp(-5 * dt)); C.cam.position.copy(C.camPos).add(V((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, 0)); C.cam.lookAt(C.look); C.cam.fov = 50 + u * 14; C.cam.aspect = g.W / g.H; C.cam.updateProjectionMatrix();
    this.ch.hud.set(t > 2 && t < 6 ? 'ENTER — skip' : '', []);
    return { scene: C.S, cam: C.cam, fx: { bloom: 0.6 + u * 1.6, threshold: 1.0, vig: 0.5, sat: 1.1 + u * 0.5, con: 1.08, grain: 0.04 + u * 0.06, tint: u > 0.5 && Math.floor(t * 20) % 3 === 0 ? [1.3, 0.8, 1.2] : [1, 1, 1] } };
  }
  startRun() {
    const g = this.game, C = this.cine, p = this.p; C.impact = true; this.cine = null; this.ch.noPause = false; g.sfx.play('fx.boom'); g.sfx.play('px.explode'); g.sfx.play('px.crumble', { vol: 0.8 }); this.shake = 1.4; this.flash = 1.5; g.dialogue.clear();
    const o = document.createElement('div'); o.style.cssText = 'position:absolute;inset:0;background:#fff;opacity:1;transition:opacity 1.4s ease-in;pointer-events:none'; this.ch.hud.ui.appendChild(o); requestAnimationFrame(() => requestAnimationFrame(() => (o.style.opacity = '0'))); setTimeout(() => o.remove(), 1600);
    for (let j = 0; j < Math.min(L, 60); j++) for (let i = 0; i < W; i++) { const k = this.key(i, j), d = Math.hypot((i - 4) * TS - p.x, j * TS + 2 - p.z); this.DROP[k] = d < 3 ? 0 : 14 + d * 0.45 + Math.random() * 6; }
    this.debris = [GLASS, PAPER, PIXEL, WOOL].map((f) => { const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), this.MAT[f], 60); im.frustumCulled = false; this.scene.add(im); return { im, b: Array.from({ length: 60 }, () => ({ x: (Math.random() - 0.5) * 50, y: 20 + Math.random() * 70, z: p.z + Math.random() * 90 - 10, vy: -10 - Math.random() * 25, r: Math.random() * 6 })) }; });
    this.ch.hud.title('FINALE', 'THE BLEED'); g.dialogue.say([{ who: 'vell', text: "Everything's leaking into everything — glass, wool, pixels, INK. Rin, run!" }, { who: 'vell', text: 'Glass cracks, wool comes undone, pixels blink out, wireframe is not there at all. And stay OUT of the ink!' }]);
  }
  buildComposite() {
    const G = new THREE.Group(), M = this.MAT, parts = [];
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(6, 3), M[CLAY]); { const a = core.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const x = a.getX(i), y = a.getY(i), z = a.getZ(i), d = 1 + Math.sin(x * 0.9) * 0.08 + Math.sin(y * 1.3 + z) * 0.08; a.setXYZ(i, x * d, y * d, z * d); } core.geometry.computeVertexNormals(); } G.add(core); parts.push(core);
    const faceT = tex(16, 12, (c) => { c.fillStyle = '#17131f'; c.fillRect(0, 0, 16, 12); c.fillStyle = '#ff3a3a'; c.fillRect(3, 3, 3, 2); c.fillRect(10, 3, 3, 2); c.fillStyle = '#ffd166'; c.fillRect(4, 3, 1, 1); c.fillRect(11, 3, 1, 1); c.fillStyle = '#f4f6ff'; for (let x = 3; x < 13; x += 2) c.fillRect(x, 8, 1, 2); c.fillRect(3, 7, 10, 1); }, true);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(9, 6.75), new THREE.MeshBasicMaterial({ map: faceT })); face.position.set(0, 1.5, -6.4); face.rotation.y = Math.PI; G.add(face); parts.push(face);
    const drums = [-1, 1].map((s) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 10, 12), M[VOX]); d.rotation.z = Math.PI / 2; d.position.set(s * 8, -4, -2); G.add(d); parts.push(d); return d; });
    const tent = []; for (let k = 0; k < 6; k++) { const segs = []; let par = G; for (let i = 0; i < 7; i++) { const sg = new THREE.Mesh(new THREE.SphereGeometry(1.1 - i * 0.12, 10, 8), M[INK]); sg.position.set(i ? 0 : Math.cos(k) * 5, i ? -1.6 : -4, i ? 0 : Math.sin(k) * 4); par.add(sg); segs.push(sg); par = sg; } tent.push(segs); }
    const pen = new THREE.Group(), pb = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 16, 10), new THREE.MeshStandardMaterial({ color: '#d23a44', roughness: 0.4 })), pt = new THREE.Mesh(new THREE.ConeGeometry(0.9, 3, 10), new THREE.MeshStandardMaterial({ color: '#17131f' })); pb.position.y = -8; pt.position.y = -17.5; pt.rotation.x = Math.PI; pen.add(pb, pt); pen.position.set(7, 4, -2); G.add(pen);
    const cur = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ConeGeometry(2.4, 6, 3)), new THREE.LineBasicMaterial({ color: new THREE.Color('#ff3a3a').multiplyScalar(2.5) })); cur.position.set(-6, 7, -3); G.add(cur);
    const shards = []; for (let i = 0; i < 10; i++) { const s = new THREE.Mesh(new THREE.TetrahedronGeometry(1.2 + (i % 3) * 0.5), M[i % 2 ? GLASS : PAPER]); G.add(s); shards.push(s); }
    G.traverse((o) => (o.castShadow = true)); return { G, core, face, drums, tent, pen, cur, shards, parts };
  }
  key(i, j) { return j * W + i; }
  pick(i, j, safe) { const d = clamp(j / L, 0, 1), w = safe ? [3, 2, 2, 1, 0, 0, 0, 0] : [2.6, 1.6, 2, 0.8 + 1.2 * d, 0.8 + 0.8 * d, 0.7 + 1.1 * d, 0.3 + 1.3 * d, 0.2 + 1.1 * d]; let r = Math.random() * w.reduce((a, b) => a + b, 0); for (let f = 0; f < 8; f++) if ((r -= w[f]) < 0) return f; return VOX; }
  set(i, j, f) { const k = this.key(i, j); this.F[k] = f; this.T[k] = 0; this.WALL[k] = 0; this.GONE[k] = 0; this.STOOD[k] = 0; this.Y[k] = 0; this.FOLD[k] = f === PAPER && i !== this.spine[j] && Math.random() < 0.35 ? 1 : 0; }
  gen(j0, j1) { for (let j = Math.max(0, j0); j < Math.min(L, j1); j++) for (let i = 0; i < W; i++) { const start = CPS.some((c) => Math.abs(j * TS + 2 - c) < 7); this.set(i, j, start ? (i % 2 ? VOX : CLAY) : this.pick(i, j, Math.abs(i - this.spine[j]) < 1)); } }
  tileAt(x, z) { const i = Math.round(x / TS) + 4, j = Math.floor(z / TS); return i < 0 || i >= W || j < 0 || j >= L ? -1 : this.key(i, j); }
  solid(k) { if (k < 0 || this.GONE[k] || this.DROP?.[k] > 0.6) return false; const f = this.F[k], t = this.t, i = k % W, j = (k / W) | 0; if (f === WIRE || f === INK) return false; if (f === PIXEL) return (t + i * 0.37 + j * 0.21) % 2.6 < 1.7; if (f === WOOL) return (t * 0.45 + j * 0.11 + i * 0.07) % 1 < 0.72; return true; }
  respawn() { const g = this.game, p = this.p; g.save.data.stats.deaths++; p.x = 0; p.z = this.cp; p.y = 0; p.vy = 0; this.cz = this.cp - 30; const j0 = Math.floor((this.cp - 40) / TS); this.gen(j0, L); this.ripples = []; g.sfx.play('px.die'); this.flash = 0.8; }
  update(dt) {
    if (this.cine) return this.updateCine(dt);
    if (this.last) { this.last.update(dt); if (this.last.done && !this.done) { this.last.dispose(); this.done = true; } return; }
    const g = this.game, inp = g.input, p = this.p, sfx = g.sfx; this.t += dt; const t = this.t;
    if (this.debris) { for (const D of this.debris) for (const d of D.b) { d.vy -= 30 * dt; d.y += d.vy * dt; d.r += dt * 4; } if (this.t > 30) { this.debris.forEach((D) => this.scene.remove(D.im)); this.debris = null; } }
    for (let j = 0; j < Math.min(L, 60); j++) for (let i = 0; i < W; i++) { const k = this.key(i, j); if (this.DROP[k] > 0) this.DROP[k] = Math.max(0, this.DROP[k] - dt * 26); } this.shake = Math.max(0, this.shake - dt * 2); this.flash = Math.max(0, (this.flash || 0) - dt * 2);
    if (this.out) { this.out += dt; p.z += 9 * dt; if (this.out > 1.6) this.done = true; return; }
    // the correction advances; the Composite slams and the floor reshuffles
    const spd = (3.9 + clamp(p.z / END, 0, 1) * 1.9) * (g.easy ? 0.72 : 1); this.cz = Math.max(this.cz + spd * dt, p.z - 70);
    this.slamT -= dt; if (this.slamT <= 0) { this.slamT = 4.2 + Math.random() * 1.5; this.slam = 1; this.ripples.push({ z: this.compZ ?? p.z + 34, r: 0 }); sfx.play('px.slam'); sfx.play('fx.boom', { vol: 0.6 }); this.shake = Math.max(this.shake, 0.6); }
    for (const R of this.ripples) { const r0 = R.r; R.r += 34 * dt; for (let j = Math.max(0, Math.floor((R.z - R.r - 8) / TS)); j < Math.min(L, Math.floor((R.z + R.r + 8) / TS)); j++) for (let i = 0; i < W; i++) { const k = this.key(i, j), d = Math.hypot((i - 4) * TS, j * TS + 2 - R.z); if (d >= r0 && d < R.r && j * TS + 2 > this.cz + 6 && this.F[k] !== GREY) { const mine = k === this.tileAt(p.x, p.z); this.set(i, j, this.pick(i, j, mine || Math.abs(i - this.spine[j]) < 1)); this.POP[k] = 1; } } }
    this.ripples = this.ripples.filter((R) => R.r < 90);
    // tiles: glass cracks, paper folds up, the correction greys and drops what it passes
    const pk = this.tileAt(p.x, p.z); for (let j = Math.max(0, Math.floor((p.z - 80) / TS)); j < Math.min(L, Math.floor((p.z + 100) / TS)); j++) for (let i = 0; i < W; i++) { const k = this.key(i, j), zc = j * TS + 2; this.POP[k] = Math.max(0, this.POP[k] - dt * 2.5);
      if (zc < this.cz && this.F[k] !== GREY) { this.F[k] = GREY; this.T[k] = 0; this.WALL[k] = 0; }
      if (this.F[k] === GREY) { this.T[k] += dt; if (this.T[k] > 1.1) { this.Y[k] -= (this.T[k] - 1.1) * 30 * dt; if (this.Y[k] < -40) this.GONE[k] = 1; } continue; }
      if (this.F[k] === GLASS && this.STOOD[k]) { this.T[k] += dt; if (this.T[k] > 0.75) { this.Y[k] -= (this.T[k] - 0.75) * 40 * dt; if (!this.GONE[k] && this.T[k] > 0.8) { this.GONE[k] = 1; sfx.play('px.crumble', { vol: 0.5, pitch: 1.6 }); } } }
      if (this.FOLD[k]) { const want = zc > p.z + 2 && zc < p.z + 16 ? 1 : this.WALL[k]; if (want > this.WALL[k] && this.WALL[k] === 0) sfx.play('pp.fold', { vol: 0.5 }); this.WALL[k] = Math.min(want, this.WALL[k] + dt * 2.2); } }
    // Rin
    const iz = (inp.keys.has('KeyW') || inp.keys.has('ArrowUp') ? 1 : 0) - (inp.keys.has('KeyS') || inp.keys.has('ArrowDown') ? 1 : 0), ix = (inp.keys.has('KeyD') || inp.keys.has('ArrowRight') ? 1 : 0) - (inp.keys.has('KeyA') || inp.keys.has('ArrowLeft') ? 1 : 0), slow = pk >= 0 && this.F[pk] === CLAY && p.gr ? 0.62 : 1, sp = (inp.down.dash ? 10.5 : 7.4) * slow;
    let nx = clamp(p.x - ix * sp * 0.85 * dt, -17.6, 17.6), nz = p.z + iz * sp * dt; const blocked = (x, z) => { const k = this.tileAt(x, z); return k >= 0 && this.WALL[k] > 0.6 && p.y < 3.6 && this.F[k] === PAPER; };
    if (blocked(nx, p.z)) nx = p.x; if (blocked(p.x, nz)) nz = p.z; p.x = nx; p.z = Math.max(1, nz);
    if (inp.pressed.jump) p.buf = 0.15; else p.buf -= dt; if (p.gr) { p.coy = 0.12; p.jumps = 1; } else p.coy -= dt;
    if (p.buf > 0 && (p.coy > 0 || p.jumps > 0)) { const dbl = p.coy <= 0; if (dbl) p.jumps--; p.vy = dbl ? 8 : 9.4; p.buf = 0; p.coy = 0; p.gr = false; sfx.play('pp.jump', { pitch: dbl ? 1.35 : 1 }); }
    const k = this.tileAt(p.x, p.z), vy0 = p.vy, py = p.y; p.vy -= (p.vy > 0 && inp.down.jump ? 22 : 34) * dt; p.y += p.vy * dt; const top = k >= 0 && this.solid(k) && this.WALL[k] < 0.3 ? this.Y[k] : -999;
    if (p.vy <= 0 && py >= top - 0.25 && p.y <= top) { p.y = top; p.vy = 0; if (!p.gr && vy0 < -7) sfx.play('pp.land', { vol: 0.5 }); p.gr = true; if (k >= 0 && !this.STOOD[k]) { this.STOOD[k] = 1; if (this.F[k] === GLASS) sfx.play('ink.squash', { pitch: 2, vol: 0.4 }); } } else p.gr = false;
    if (k >= 0 && this.F[k] === INK && p.y <= 0.05 && !this.GONE[k]) { if (!this.said.ink) { this.said.ink = true; g.dialogue.say('vell', 'The ink took you! Black tiles are not floor, they are HOLES that look like floor.'); } return this.respawn(); }
    if (p.y < -14) return this.respawn(); if (p.z < this.cz + 1.2) { if (!this.said.grey) { this.said.grey = true; g.dialogue.say('curator', 'There. Finished. Was that so bad?'); } return this.respawn(); }
    p.sp = lerp(p.sp, Math.hypot(ix, iz) * sp, Math.min(1, dt * 8)); if (iz || ix) p.yaw = Math.atan2(-ix, Math.max(0.01, iz) + (iz < 0 ? -2 : 0));
    for (const c of CPS) if (p.z > c && c > this.cp && p.gr) { this.cp = c; sfx.play('px.checkpoint'); }
    const say = (key, z, who, text) => { if (!this.said[key] && p.z > z) { this.said[key] = true; g.dialogue.say(who, text); } };
    say('a', 60, 'vell', "That's... every boss we ever beat. Glued together WRONG. It's what you get when nothing matches and you force it to."); say('b', 150, 'rin', 'Every time it slams, the floor changes its mind.'); say('c', 250, 'curator', 'I am trying to HOLD it. It will not hold.'); say('d', 360, 'vell', 'There — a frame! Straight through it!');
    if (p.z > END + 2 && !this.last) { this.last = new LastFrame(this); this.last.build(); sfx.play('fx.whoosh'); sfx.play('fx.shimmer'); const o = document.createElement('div'); o.style.cssText = 'position:absolute;inset:0;background:#fff;opacity:1;transition:opacity 1s ease-in;pointer-events:none'; this.ch.hud.ui.appendChild(o); requestAnimationFrame(() => requestAnimationFrame(() => (o.style.opacity = '0'))); setTimeout(() => o.remove(), 1200); }
  }
  frame(dt) {
    if (this.cine) return this.frameCine(dt);
    if (this.last) return this.last.frame(dt);
    const g = this.game, p = this.p, t = this.t, S = this.scene;
    if (this.debris) { const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1, 1, 1), ps = new THREE.Vector3(); for (const D of this.debris) { D.b.forEach((d, i) => { e.set(d.r, d.r * 0.7, 0); q.setFromEuler(e); ps.set(d.x, d.y, d.z); sc.setScalar(d.y < -2 ? 0.001 : 1); m4.compose(ps, q, sc); D.im.setMatrixAt(i, m4); }); D.im.instanceMatrix.needsUpdate = true; } } this.skyM.uniforms.t.value = t; this.skyM.uniforms.k.value = this.shake; this.voidM.uniforms.t.value = t; this.wave.material.uniforms.t.value = t;
    // instances
    const cnt = new Array(NF).fill(0), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), sc = new THREE.Vector3();
    for (let j = Math.max(0, Math.floor((p.z - 40) / TS)); j < Math.min(L, Math.floor((p.z + 110) / TS)); j++) for (let i = 0; i < W; i++) { const k = this.key(i, j); if (this.GONE[k] && this.Y[k] < -38) continue; const f = this.F[k], x = (i - 4) * TS, z = j * TS + 2, pop = this.POP[k], on = this.solid(k);
      let y = this.Y[k] - 0.6 + Math.sin(pop * Math.PI) * 0.8 + this.DROP[k], a = 0; if (f === INK) y -= 0.15; if (f === GLASS && this.STOOD[k] && this.T[k] < 0.75) { x + Math.sin(t * 60) * 0.03; }
      sc.set(1, 1, 1); if (f === WOOL) { const u = (t * 0.45 + j * 0.11 + i * 0.07) % 1; const s = u < 0.72 ? 1 : Math.max(0.05, 1 - (u - 0.72) * 8); sc.set(s, 1, s); } if (f === PIXEL && !on) { sc.set(0.001, 0.001, 0.001); } else if (f === PIXEL && (t + i * 0.37 + j * 0.21) % 2.6 > 1.3 && Math.floor(t * 14) % 2) sc.set(0.94, 1, 0.94);
      if (f === PAPER && this.WALL[k] > 0) { a = ease.outBack(this.WALL[k]) * Math.PI / 2; pos.set(x, -0.6 * Math.cos(a) + 2 * Math.sin(a), z + 2 - 0.6 * Math.sin(a) - 2 * Math.cos(a)); } else pos.set(x, y, z);
      e.set(a, 0, f === GREY ? (this.T[k] > 1.1 ? (this.T[k] - 1.1) * (i % 2 ? 0.6 : -0.6) : 0) : 0); q.setFromEuler(e); m4.compose(pos, q, sc); this.IM[f].setMatrixAt(cnt[f]++, m4); }
    this.IM.forEach((im, f) => { im.count = cnt[f]; im.instanceMatrix.needsUpdate = true; });
    for (const J of this.junk) { const gl = Math.floor(t * 3 + J.b.x) % 17 === 0; J.G.position.set(J.b.x + (gl ? (Math.random() - 0.5) * 3 : 0), J.b.y + Math.sin(t * 0.5 + J.b.z) * 2, J.b.z); J.G.rotation.set(J.r.x + t * J.sp, J.r.y + t * J.sp * 0.7, J.r.z); }
    // the Composite
    { const C = this.comp, sl = this.slam = Math.max(0, (this.slam || 0) - dt * 1.6); this.compZ = lerp(this.compZ ?? p.z + 40, Math.min(END - 10, p.z + 38), Math.min(1, dt * 1.5)); const z = this.compZ; C.G.position.set(Math.sin(t * 0.7) * 7, 10.5 + Math.sin(t * 2.1) * 1.5 - Math.sin(sl * Math.PI) * 6, z + 10); C.G.scale.setScalar(1.25); C.G.rotation.set(-Math.sin(t * 1.3) * 0.15 - sl * 0.5, Math.sin(t * 0.5) * 0.3, Math.sin(t * 0.9) * 0.1);
      C.drums.forEach((d, i) => (d.rotation.x = t * (i ? 6 : -6))); C.pen.rotation.x = 0.6 + Math.sin(sl * Math.PI) * 1.4; C.cur.rotation.y = t * 3; C.face.scale.x = Math.floor(t * 9) % 11 === 0 ? -1 : 1;
      C.tent.forEach((segs, k) => segs.forEach((s, i) => { s.rotation.x = Math.sin(t * 2.4 + k + i * 0.6) * 0.5; s.rotation.z = Math.cos(t * 1.9 + k * 2 + i * 0.5) * 0.5; }));
      C.shards.forEach((s, i) => { const a = t * (0.6 + i * 0.07) + i; s.position.set(Math.cos(a) * (9 + i % 3), Math.sin(a * 1.3) * 5, Math.sin(a) * (9 + i % 3)); s.rotation.set(a, a * 2, 0); });
      if (Math.random() < dt * 6) { const pt = C.parts[(Math.random() * C.parts.length) | 0]; if (pt.material && pt !== C.face) pt.material = this.MAT[(Math.random() * 8) | 0]; } }
    this.wave.position.set(0, 18, this.cz); this.portal.rotation.z = Math.sin(t * 0.8) * 0.03; this.portalPane.material.color.setScalar(2.5 + Math.sin(t * 3) * 0.5);
    // Rin, Vell, camera
    this.rin.position.set(p.x, p.y, p.z); let dy = p.yaw - this.rin.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.rin.rotation.y += dy * Math.min(1, dt * 12); animateRin(this.rin, { speed: p.sp, ground: p.gr, vy: p.vy, slide: false, climb: 0, grapple: false, strike: 0, hurt: 0, t, dt, lookAt: null, talk: false });
    this.vell.position.lerp(V(p.x + 1.4, p.y + 2.4 + Math.sin(t * 3) * 0.2, p.z - 0.5), Math.min(1, dt * 5)); this.vell.rotation.y = t; this.vell.userData.tick(t);
    const sh = this.shake * (g.settings.shake ?? 1), want = V(p.x * 0.55, p.y * 0.6 + 6.8, p.z - 11.5 - (this.out || 0) * 6); this.camPos.lerp(want, 1 - Math.exp(-6 * dt)); this.cam.position.copy(this.camPos).add(V((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, 0)); this.cam.lookAt(p.x * 0.7, p.y * 0.7 + 1.6, p.z + 9); this.cam.fov = 60 + Math.min(8, p.sp * 0.6) + (this.out || 0) * 30; this.cam.aspect = g.W / g.H; this.cam.updateProjectionMatrix(); this.sky.position.copy(this.cam.position);
    this.sun.position.set(p.x - 20, 40, p.z - 24); this.sun.target.position.set(p.x, 0, p.z + 8);
    const behind = p.z - this.cz; this.ch.hud.set(this.out ? '' : 'Reach the frame', [(behind < 14 ? '!' : '') + bar('GREY', clamp(1 - behind / 40, 0, 1), 12), `<kbd>→</kbd>${Math.max(0, Math.round(END - p.z))} m`]);
    const f = this.flash + (this.out || 0) * 0.6; return { scene: S, cam: this.cam, fx: { bloom: 0.75 + this.shake * 0.6 + f, threshold: 1.0, vig: 0.42, sat: 1.15 + this.shake * 0.4, grain: 0.05, con: 1.08, tint: this.slam > 0.5 ? [1.2, 0.85, 1.15] : [1, 1, 1] } };
  }
}
export { SONG as SONG_BOSS };
