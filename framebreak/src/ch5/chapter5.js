// CHAPTER 5 — 1996. A genuine software raycaster: 320x148 view, DDA walls
// with 64px hand-pixelled textures (two variants per wall type), textured
// floor and ceiling casting, lamp-lit sectors with banded lighting,
// billboard sprites with a z-buffer and 10-frame enemy animation, sliding
// doors, a push-wall secret and a room section that rotates.
import { Pix, PAL, ptext } from '../ch1/pix.js';
import { makeCanvas, clamp, hash2 } from '../core/util.js';
import { wrapText } from '../core/dialogue.js';

const VW = 320, VH = 180, RH = 148, TX = 64, TM = TX - 1;
const MAP = [
  '########################', '#P..#..l..#...l..T..l..#', '#...D..e..#..e...T..h..#', '#...#.....D......D.....#', '##S##..a..#......T..m..#', '#m.a#######......TTTDTT#',
  '#####.....####D###.....#', '#..l..e....l...e..#..i.#', '#.###.............D....#', '#.#a####.....11111#....#', '#.#.S..#.....1...1###D##', '#.####.R.....1.k..#....#',
  '#..l...#.....1...1#.e..#', '#####D##.....11111#....#', '#.......#.........####D#', '#..i....#.e...e..o.#...#', '#.......D..........X...#', '#..a....#..m..o....#.a.#', '#.......#..........#..E#', '########################',
];
const SONG = (() => { const bars = {}, riff = ['E2 E2 E3 E2 F2 E2 G2 E2 E2 E3 E2 F2 E2 A#2 A2 G2', 'E2 E2 E3 E2 F2 E2 G2 E2 E2 E3 E2 G2 A2 A#2 B2 D3'], lead = ['E4 . . G4 . . A4 . A#4 . A4 . G4 . E4 .', 'E4 . . B4 . . A#4 . A4 . . . G4 . F4 .', 'E5 . . D5 . . B4 . A4 . B4 . D5 . . .', 'E5 . F5 . E5 . D5 . B4 . A#4 . A4 . G4 .'];
  const A = [0, 1, 2, 3].map((i) => { bars['a' + i] = { bass: riff[i % 2], lead: lead[i], drums: i === 3 ? 'k . h k s . h k k . s k s s t l' : 'k . h . s . h k . k h . s . h h', stab: i % 2 ? '. . . . E3+B3 . . . . . . . E3+B3 . . .' : 'E3+B3 . . . . . . . . . E3+A#3 . . . . .' }; return 'a' + i; });
  return { bpm: 136, gain: 0.95, reverb: 0.08, start: 'A', tracks: { bass: { inst: 'fmbass', vol: 0.9 }, lead: { inst: 'saw', vol: 0.6, pan: 0.1, layer: 1 }, stab: { inst: 'stab', vol: 0.7, pan: -0.2 }, drums: { kit: 'electro', vol: 0.9 } }, bars, sections: { A }, next: { A: 'A' } }; })();
export { SONG as SONG_CH5 };

function toTex(p) { const c = p.toCanvas().getContext('2d').getImageData(0, 0, p.w, p.h).data, o = new Uint32Array(p.w * p.h); for (let i = 0; i < o.length; i++) o[i] = c[i * 4 + 3] ? (255 << 24) | (c[i * 4 + 2] << 16) | (c[i * 4 + 1] << 8) | c[i * 4] : 0; return o; }
// shaded plate: [dark, mid, light, hi]
function plate(p, x, y, w, h, r) { p.rect(x, y, w, h, r[1]); p.rect(x, y, w, 1, r[2]); p.rect(x, y, 1, h, r[2]); p.rect(x, y + h - 1, w, 1, r[0]); p.rect(x + w - 1, y, 1, h, r[0]); p.set(x, y, r[3]); }
const ST = ['g', 'G', 'h', 'i'], BL = ['k', 'N', 'b', 'l'], RU = ['D', 'e', 'E', 'a'];
function brick(p, v) { p.rect(0, 0, TX, TX, 'd'); for (let r = 0; r < 8; r++) for (let i = -1; i < 4; i++) { const x = i * 16 + (r % 2) * 8, h = hash2(i * 3 + v * 9, r * 7), c = h > 0.75 ? 'E' : h < 0.2 ? 'D' : 'e'; p.rect(x + 1, r * 8 + 1, 15, 7, c); p.rect(x + 1, r * 8 + 1, 15, 1, h > 0.5 ? 'a' : 'E'); p.rect(x + 1, r * 8 + 7, 15, 1, 'D'); if (h > 0.9) { p.set(x + 5, r * 8 + 4, 'D'); p.set(x + 6, r * 8 + 5, 'D'); } } for (let i = 0; i < 26; i++) p.set((hash2(i, v) * 64) | 0, 50 + ((hash2(i, v + 3) * 14) | 0), 'd'); }
function wallTex(kind, v = 0) {
  const p = new Pix(TX, TX);
  if (kind === '#') { brick(p, v); if (v) { for (const x of [14, 40]) { p.rect(x, 0, 6, 64, 'G'); p.rect(x, 0, 2, 64, 'i'); p.rect(x + 5, 0, 1, 64, 'g'); for (const y of [10, 42]) { p.rect(x - 1, y, 8, 4, 'h'); p.rect(x - 1, y, 8, 1, 'W'); } } p.rect(22, 24, 16, 6, 'G'); p.ellipse(30, 27, 4, 4, 'R'); p.ellipse(30, 27, 2, 2, 'o'); p.rect(29, 20, 2, 6, 'h'); } else { p.rect(20, 16, 24, 30, 'A'); p.frame(20, 16, 24, 30, 'D'); p.frame(25, 21, 14, 12, 'k'); p.rect(24, 37, 16, 2, 'k'); p.rect(24, 41, 11, 2, 'k'); p.set(20, 16, 'W'); p.set(43, 16, 'W'); } }
  else if (kind === 'T' || kind === '1') { const c = kind === '1' ? BL : ST, a = kind === '1' ? 'c' : 'y'; p.rect(0, 0, TX, TX, c[0]); plate(p, 1, 1, 62, 62, c); plate(p, 5, 12, 26, 46, c); plate(p, 33, 12, 26, 46, c); p.rect(4, 4, 56, 5, 'K'); p.rect(5, 5, 54, 3, a); p.rect(5, 5, 54, 1, kind === '1' ? 'C' : 'Y'); for (let x = 8; x < 58; x += 10) p.rect(x, 5, 3, 3, 'K'); for (const [x, y] of [[7, 14], [28, 14], [7, 55], [28, 55], [35, 14], [56, 14], [35, 55], [56, 55]]) { p.set(x, y, c[3]); p.set(x + 1, y + 1, 'K'); }
    if (v) { p.rect(9, 20, 18, 14, 'K'); p.rect(10, 21, 16, 12, 'j'); for (let i = 0; i < 6; i++) p.rect(11, 22 + i * 2, 4 + ((i * 5) % 9), 1, 'p'); p.rect(37, 20, 18, 30, 'K'); for (let y = 22; y < 49; y += 3) { p.rect(38, y, 16, 2, c[1]); p.rect(38, y, 16, 1, c[2]); } p.rect(10, 40, 4, 4, 'R'); p.set(11, 41, 'O'); p.rect(17, 40, 4, 4, 'J'); p.set(18, 41, 'p'); } else { for (let y = 18; y < 52; y += 4) { p.rect(9, y, 18, 2, 'K'); p.rect(9, y + 2, 18, 1, c[2]); } p.frame(41, 22, 10, 12, a); p.frame(43, 24, 6, 8, kind === '1' ? 'C' : 'Y'); p.rect(38, 42, 16, 8, 'K'); p.rect(39, 43, 14, 2, a); } }
  else if (kind === 'D' || kind === 'X') { const a = kind === 'X' ? 'R' : 'y'; plate(p, 0, 0, 64, 64, ST); for (let y = 4; y < 60; y += 6) { p.rect(3, y, 58, 4, 'G'); p.rect(3, y, 58, 1, 'i'); p.rect(3, y + 3, 58, 1, 'g'); } p.rect(0, 26, 64, 12, a); p.rect(0, 26, 64, 1, kind === 'X' ? 'O' : 'Y'); for (let x = -8; x < 64; x += 12) p.poly([[x, 37], [x + 5, 37], [x + 13, 27], [x + 8, 27]], 'K'); plate(p, 24, 42, 16, 14, ['K', 'g', 'G', 'h']); p.rect(28, 46, 8, 6, 'K'); p.rect(29, 47, 6, 4, kind === 'X' ? 'R' : 'J'); p.rect(30, 48, 2, 2, kind === 'X' ? 'O' : 'p'); if (kind === 'X') { p.frame(27, 8, 10, 10, 'y'); p.rect(31, 18, 2, 6, 'y'); p.rect(33, 21, 3, 2, 'y'); } }
  else if (kind === 'S') { brick(p, 5); p.line(30, 0, 34, 20, 'K'); p.line(34, 20, 29, 38, 'K'); p.line(29, 38, 33, 63, 'K'); p.line(31, 0, 35, 20, 'D'); p.set(36, 30, 'K'); }
  else if (kind === 'R') { p.blit(wallTex('T', 0)); plate(p, 18, 14, 28, 40, ['K', 'g', 'G', 'h']); p.rect(22, 18, 20, 12, 'K'); p.rect(23, 19, 18, 10, 'r'); p.frame(27, 21, 10, 6, 'O'); p.rect(30, 34, 4, 14, 'h'); p.rect(30, 34, 1, 14, 'W'); p.ellipse(32, 34, 4, 4, 'R'); p.ellipse(31, 33, 2, 2, 'O'); p.arc(32, 44, 9, 11, 0.4, 2.7, 'y'); }
  return p;
}
function flatTex(ceil) { const p = new Pix(TX, TX); if (ceil) { p.rect(0, 0, TX, TX, 'n'); for (const o of [0, 32]) { plate(p, o + 1, 1, 30, 62, ['k', 'n', 'N', 'b']); p.rect(o + 12, 6, 8, 52, 'K'); p.rect(o + 13, 7, 6, 50, 'L'); p.rect(o + 14, 8, 4, 48, 'W'); } } else { p.rect(0, 0, TX, TX, 'g'); for (const [a, b] of [[0, 0], [32, 32]]) plate(p, a, b, 32, 32, ['K', 'G', 'h', 'i']); for (const [a, b] of [[32, 0], [0, 32]]) { plate(p, a, b, 32, 32, ['K', 'g', 'G', 'h']); for (let i = 4; i < 28; i += 6) for (let j = 4; j < 28; j += 6) { p.set(a + i, b + j, 'h'); p.set(a + i + 1, b + j + 1, 'h'); p.set(a + i + 2, b + j, 'K'); } } for (let i = 0; i < 40; i++) p.set((hash2(i, 5) * 64) | 0, (hash2(i, 9) * 64) | 0, 'K'); } return p; }
// 64x64 billboard frames: 0-3 walk, 4 wind-up, 5 fire, 6 pain, 7-9 death
function botSprite(type, f) {
  const p = new Pix(64, 64), C = { e: RU, i: ['V', 'u', 'U', 'm'], h: ST }[type], wide = type === 'h' ? 5 : 0, X = 32;
  if (f >= 7) { const k = f - 7, y = 62 - [20, 10, 4][k]; p.ellipse(X, y + 4, 18 + k * 3, [14, 8, 4][k], C[1]); p.ellipse(X - 4, y + 2, 10 + k * 2, [8, 4, 2][k], C[2]); if (k < 2) { p.rect(X - 8, y - 6 + k * 4, 16, 6, 'K'); p.rect(X - 6, y - 5 + k * 4, 5, 3, 'R'); p.rect(X + 2, y - 4 + k * 4, 4, 2, 'r'); for (let i = 0; i < 9; i++) { const a = i * 0.7 + k; p.rect((X + Math.cos(a) * (14 + k * 8)) | 0, (y - 8 + Math.sin(a) * (10 + k * 5)) | 0, 2, 2, i % 2 ? 'O' : 'Y'); } } else { p.rect(X - 12, 58, 9, 3, 'G'); p.rect(X + 6, 59, 8, 2, 'G'); p.set(X, 56, 'O'); } return p.outline('K'); }
  const ph = f < 4 ? f : 0, bob = ph % 2 ? 1 : 0, la = [3, 0, -3, 0][ph], atk = f === 4 || f === 5, hurt = f === 6;
  for (const s of [-1, 1]) { const lx = X + s * (7 + wide) + (s > 0 ? la : -la), lift = (s > 0 ? ph === 0 : ph === 2) ? 3 : 0; p.rect(lx - 3, 40 + bob, 7, 9, C[1]); p.rect(lx - 3, 40 + bob, 2, 9, C[2]); p.ellipse(lx, 49 + bob, 3, 2, 'G'); p.rect(lx - 2, 50 + bob, 5, 8 - lift, C[0]); p.rect(lx - 2, 50 + bob, 1, 8 - lift, C[1]); p.rect(lx - 4, 58 - lift, 9, 4, 'G'); p.rect(lx - 4, 58 - lift, 9, 1, 'i'); }
  p.rect(X - 8 - wide, 37 + bob, 16 + wide * 2, 5, 'G'); p.rect(X - 8 - wide, 37 + bob, 16 + wide * 2, 1, 'h');
  const ty = 18 + bob + (hurt ? 2 : 0), tw = 11 + wide; p.ellipse(X, ty + 10, tw, 11, C[1]); p.ellipse(X - 3, ty + 7, tw - 4, 7, C[2]); p.ellipse(X - 5, ty + 4, 3, 2, C[3]); p.rect(X + tw - 3, ty + 4, 2, 13, C[0]); p.rect(X - tw + 2, ty + 18, tw * 2 - 4, 2, C[0]);
  p.rect(X - 4, ty + 9, 8, 7, 'K'); for (let i = 0; i < 3; i++) p.rect(X - 3 + i * 3, ty + 10, 2, 5, atk ? 'Y' : i % 2 ? 'o' : 'O');
  for (const s of [-1, 1]) { const sx = X + s * (tw + 1), ay = atk ? ty - 2 : ty + 16 + (s > 0 ? -la : la), ax = sx + s * (atk ? 5 : 2); p.ellipse(sx, ty + 4, 4, 4, C[2]); p.line(sx, ty + 5, ax, ay, 'G', 3); p.line(sx, ty + 5, ax, ay, 'h', 1); if (type === 'i') { p.poly([[ax - 2, ay], [ax + 2, ay], [ax + s * 2, ay + 7]], 'W'); p.poly([[ax - 3 * s, ay], [ax - s, ay], [ax - 2 * s, ay + 5]], 'i'); } else { p.rect(ax - 3, ay - 2, 6, 6, 'G'); p.rect(ax - 3, ay - 2, 6, 1, 'i'); p.rect(ax - 1, ay + 3, 3, 4, 'K'); if (f === 5) { p.ellipse(ax, ay + 8, 4, 4, 'Y'); p.ellipse(ax, ay + 8, 2, 2, 'W'); } } }
  const hy = ty - 12 + (hurt ? 3 : 0);
  if (type === 'e') { plate(p, X - 9, hy, 18, 14, ST); p.rect(X - 7, hy + 2, 14, 9, 'K'); p.rect(X - 6, hy + 3, 12, 7, hurt ? 'W' : 'r'); p.rect(X - 5, hy + 5, 4, 3, atk ? 'Y' : 'O'); p.rect(X + 1, hy + 5, 4, 3, atk ? 'Y' : 'O'); p.rect(X - 2, hy + 14, 4, 3, 'G'); p.line(X + 6, hy, X + 10, hy - 6, 'h'); p.set(X + 10, hy - 7, 'R'); }
  else if (type === 'i') { p.ellipse(X, hy + 8, 9, 8, C[1]); p.ellipse(X - 2, hy + 6, 6, 5, C[2]); p.poly([[X - 8, hy + 4], [X - 13, hy - 6], [X - 4, hy + 1]], 'M'); p.poly([[X + 8, hy + 4], [X + 13, hy - 6], [X + 4, hy + 1]], 'M'); p.rect(X - 6, hy + 7, 4, 3, hurt ? 'W' : 'Y'); p.rect(X + 2, hy + 7, 4, 3, hurt ? 'W' : 'Y'); p.set(X - 4, hy + 8, 'K'); p.set(X + 4, hy + 8, 'K'); p.rect(X - 4, hy + 12, 8, 2, 'K'); for (let i = 0; i < 4; i++) p.set(X - 3 + i * 2, hy + 12, 'W'); }
  else { plate(p, X - 8, hy + 3, 16, 11, ST); p.rect(X - 6, hy + 7, 12, 3, 'K'); p.rect(X - 5, hy + 8, 10, 1, hurt ? 'W' : atk ? 'Y' : 'R'); for (const s of [-1, 1]) { plate(p, X + s * 15 - 5, hy + 4, 10, 9, ['K', 'g', 'G', 'h']); p.ellipse(X + s * 15, hy + 9, 2, 2, 'K'); if (f === 5) p.ellipse(X + s * 15, hy + 9, 3, 3, 'Y'); } p.rect(X - 13, ty + 19, 26, 3, 'y'); for (let x = X - 12; x < X + 13; x += 5) p.rect(x, ty + 19, 2, 3, 'K'); }
  if (hurt) p.remapAll({ [C[1]]: 'i', [C[2]]: 'W' });
  return p.outline('K');
}
function thing(k) { const p = new Pix(64, 64);
  if (k === 'a') { plate(p, 18, 42, 28, 18, ST); p.rect(22, 46, 20, 9, 'y'); p.rect(22, 46, 20, 1, 'Y'); p.frame(28, 47, 8, 7, 'K'); p.rect(18, 40, 28, 3, 'G'); p.rect(28, 37, 8, 3, 'h'); }
  if (k === 'm') { plate(p, 18, 40, 28, 20, ['H', 'i', 'W', 'W']); p.rect(29, 43, 6, 14, 'R'); p.rect(25, 47, 14, 6, 'R'); p.rect(29, 43, 6, 1, 'O'); p.rect(26, 37, 12, 3, 'h'); }
  if (k === 'k') { p.frame(22, 22, 20, 20, 'y'); p.frame(23, 23, 18, 18, 'Y'); p.frame(24, 24, 16, 16, 'y'); p.rect(30, 42, 4, 16, 'y'); p.rect(30, 42, 1, 16, 'Y'); p.rect(34, 50, 6, 3, 'y'); p.rect(34, 55, 4, 3, 'y'); }
  if (k === 'o') { p.ellipse(32, 32, 9, 9, 'R'); p.ellipse(32, 32, 6, 6, 'O'); p.ellipse(30, 30, 3, 3, 'Y'); p.set(29, 29, 'W'); return p; }
  if (k === 'b') { plate(p, 20, 30, 24, 32, ['r', 'R', 'o', 'O']); for (const y of [30, 40, 52, 60]) p.rect(19, y, 26, 2, 'G'); p.rect(24, 43, 16, 8, 'y'); p.poly([[28, 50], [32, 44], [36, 50]], 'K'); }
  if (k === 'l') { p.rect(30, 0, 4, 8, 'G'); plate(p, 22, 8, 20, 6, ST); p.rect(24, 14, 16, 5, 'Y'); p.rect(26, 15, 12, 3, 'W'); for (let i = 0; i < 26; i++) p.set(20 + ((i * 7) % 24), 20 + ((i * 5) % 18), i % 3 ? 'y' : 'Y'); return p; }
  if (k === 'v') { p.rect(18, 20, 28, 24, 'U'); p.rect(20, 18, 24, 28, 'U'); p.rect(20, 20, 20, 6, 'm'); p.rect(21, 20, 8, 2, 'M'); p.rect(18, 38, 28, 4, 'u'); p.rect(20, 42, 24, 4, 'u'); p.rect(40, 40, 6, 6, 0); p.rect(21, 26, 11, 11, 'W'); p.rect(25, 28, 5, 7, 'K'); p.rect(36, 28, 5, 5, 'W'); p.rect(38, 30, 2, 2, 'K'); p.line(34, 18, 38, 11, 'U', 2); p.rect(37, 8, 3, 3, 'Y'); p.rect(22, 46, 5, 4, 'V'); p.rect(34, 46, 5, 4, 'V'); }
  return p.outline('K'); }
function gunFrame(f) { const p = new Pix(96, 80), y = f === 1 ? 6 : f === 2 ? 3 : 0, X = 48;
  if (f === 1) { for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283; p.line(X, 10, X + Math.cos(a) * (i % 2 ? 22 : 13), 10 + Math.sin(a) * (i % 2 ? 18 : 10), 'Y', 2); } p.ellipse(X, 10, 9, 8, 'W'); }
  if (f === 2) p.ellipse(X, 12, 6, 5, 'Y');
  plate(p, X - 14, 16 + y, 28, 64, ST); p.rect(X - 14, 16 + y, 5, 64, 'W'); p.rect(X + 9, 16 + y, 5, 64, 'G'); plate(p, X - 9, 12 + y, 18, 10, ['K', 'g', 'G', 'h']); p.rect(X - 6, 14 + y, 12, 5, 'K'); p.frame(X - 5, 14 + y, 10, 5, f ? 'W' : 'C'); p.rect(X - 3, 15 + y, 6, 3, f ? 'Y' : 'c');
  p.rect(X - 14, 34 + y, 28, 6, 'y'); p.rect(X - 14, 34 + y, 28, 1, 'Y'); for (let x = X - 12; x < X + 14; x += 8) p.poly([[x, 39 + y], [x + 3, 39 + y], [x + 7, 35 + y], [x + 4, 35 + y]], 'K'); p.rect(X - 8, 44 + y, 16, 12, 'K'); for (let i = 0; i < 4; i++) p.rect(X - 6, 46 + i * 3 + y, [10, 7, 12, 5][i], 1, f ? 'O' : 'c');
  p.rect(X - 24, 52 + y, 12, 28, 'f'); p.rect(X - 24, 52 + y, 3, 28, 'S'); p.rect(X - 13, 56 + y, 4, 10, 'f'); p.rect(X - 26, 46 + y, 16, 8, 'T'); p.rect(X - 26, 46 + y, 16, 2, 'c'); p.rect(X + 12, 60 + y, 10, 20, 'f'); p.rect(X + 19, 60 + y, 3, 20, 'S');
  return p.outline('K'); }

export default class Chapter5 {
  constructor(game) { this.game = game; this.id = 5; this.compositesOutgoing = true; }
  async load() {
    this.buf = makeCanvas(VW, VH); this.bx = this.buf.getContext('2d'); this.img = this.bx.createImageData(VW, RH); this.px = new Uint32Array(this.img.data.buffer); this.zb = new Float32Array(VW);
    this.tex = {}; for (const k of ['#', 'T', '1', 'D', 'X', 'S', 'R']) this.tex[k] = [toTex(wallTex(k, 0)), toTex(wallTex(k, 1))]; this.floorT = toTex(flatTex(false)); this.ceilT = toTex(flatTex(true));
    this.spr = {}; for (const t of ['e', 'i', 'h']) this.spr[t] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((f) => toTex(botSprite(t, f))); for (const k of ['a', 'm', 'k', 'o', 'v', 'b', 'l']) this.spr[k] = [toTex(thing(k))];
    this.gun = [0, 1, 2].map((f) => gunFrame(f).toCanvas());
  }
  controlsHelp() { return '<b>W/S</b> move · <b>A/D</b> strafe · <b>← →</b> or mouse: turn · <b>J</b> / click: fire · <b>L</b>: wide blast (4 ammo) · <b>E</b>: use doors, switches, suspicious walls'; }
  start({ handoff } = {}) {
    const g = this.game; this.snap = handoff ? g.snapshot() : null; this.introT = handoff ? 0 : 9; g.show3d(false); g.c2d.style.imageRendering = 'pixelated'; g.c2d.style.opacity = '1';
    this.map = MAP.map((r) => r.split('')); this.doors = {}; this.things = []; this.shots = []; this.t = 0; this.said = {}; this.fin = null; this.noPause = false; this.msg = null; this.title = 3.5;
    this.p = { x: 1.5, y: 1.5, a: 0.4, hp: 100, ammo: 40, key: false, bob: 0, fire: 0, hurt: 0, kick: 0, flash: 0 }; this.lit = new Float32Array(24 * 20);
    this.map.forEach((row, y) => row.forEach((c, x) => { if (c === 'P') { this.p.x = x + 0.5; this.p.y = y + 0.5; row[x] = '.'; } else if ('eih'.includes(c)) { this.things.push({ k: c, x: x + 0.5, y: y + 0.5, hp: c === 'h' ? 9 : c === 'i' ? 2 : 4, st: 'idle', t: Math.random() * 2, cool: 1 }); row[x] = '.'; } else if ('amk'.includes(c)) { this.things.push({ k: c, x: x + 0.5, y: y + 0.5, item: true }); row[x] = '.'; } else if (c === 'o' || c === 'l') { this.things.push({ k: c === 'o' ? 'b' : 'l', x: x + 0.5, y: y + 0.5, item: true, decor: true }); if (c === 'l') for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) { const X = x + i, Y = y + j; if (X >= 0 && Y >= 0 && X < 24 && Y < 20) this.lit[Y * 24 + X] = Math.max(this.lit[Y * 24 + X], 1 - Math.hypot(i, j) / 4.6); } row[x] = '.'; } else if (c === 'D' || c === 'X' || c === 'S') this.doors[x + ',' + y] = { open: 0, dir: 0 }; }));
    this.vell = { k: 'v', x: 2.5, y: 2.5, item: true, vell: true, decor: true }; this.things.push(this.vell);
    g.director.releaseOutgoing(); g.audio.muffle(0); g.music.play(SONG, { intensity: 1, fade: 0.3 });
    g.dialogue.say([{ who: 'vell', text: "Everything's flat again but it THINKS it's deep. Don't tell it." }, { who: 'rin', text: 'I have a gun for a hand.' }, { who: 'vell', text: 'It was 1996. Everyone did.' }]);
    g.director.preload(6);
  }
  stop() { this.game.c2d.style.imageRendering = ''; this.game.input.exitLock(); }
  respawn() { this.start(); }
  solid(x, y) { const c = this.map[y | 0]?.[x | 0]; if (!c || c === '.' || c === 'E') return false; const d = this.doors[(x | 0) + ',' + (y | 0)]; return !(d && d.open > 0.8); }
  los(x0, y0, x1, y1) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 4); for (let i = 1; i < n; i++) if (this.solid(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n)) return false; return true; }
  tryMove(o, dx, dy, r = 0.22) { if (!this.solid(o.x + dx + Math.sign(dx) * r, o.y - r) && !this.solid(o.x + dx + Math.sign(dx) * r, o.y + r)) o.x += dx; if (!this.solid(o.x - r, o.y + dy + Math.sign(dy) * r) && !this.solid(o.x + r, o.y + dy + Math.sign(dy) * r)) o.y += dy; }
  note(s) { this.msg = { s, t: 2.4 }; }

  update(dt, outgoing) {
    if (outgoing) return; const g = this.game, inp = g.input, p = this.p, sfx = g.sfx; this.t += dt; this.title -= dt; if (this.msg && (this.msg.t -= dt) <= 0) this.msg = null;
    if (this.fin) return this.updateFinale(dt);
    if (inp.mouse.left && !inp.locked) inp.requestLock();
    p.a += ((inp.keys.has('ArrowRight') ? 1 : 0) - (inp.keys.has('ArrowLeft') ? 1 : 0)) * 2.6 * dt + (inp.locked ? inp.mouse.dx * 0.0035 : 0); inp.mouse.dx = 0;
    const f = (inp.keys.has('KeyW') || inp.keys.has('ArrowUp') ? 1 : 0) - (inp.keys.has('KeyS') || inp.keys.has('ArrowDown') ? 1 : 0), s = (inp.keys.has('KeyD') ? 1 : 0) - (inp.keys.has('KeyA') ? 1 : 0), sp = 3.6 * dt;
    const ca = Math.cos(p.a), sa = Math.sin(p.a); this.tryMove(p, (ca * f - sa * s) * sp, (sa * f + ca * s) * sp); if (f || s) p.bob += dt * 10;
    p.fire -= dt; p.hurt -= dt; p.flash -= dt; p.kick = Math.max(0, p.kick - dt * 6);
    if (inp.pressed.interact) { const ux = (p.x + ca * 0.9) | 0, uy = (p.y + sa * 0.9) | 0, c = this.map[uy]?.[ux], d = this.doors[ux + ',' + uy];
      if (c === 'X' && !p.key) { this.note('LOCKED. NEEDS THE FRAME KEY.'); sfx.play('ui.back'); } else if (d && d.dir === 0 && d.open < 0.1) { d.dir = 1; d.hold = c === 'S' ? 1e9 : 4; sfx.play(c === 'S' ? 'pp.rumble' : 'px.clank'); if (c === 'S') this.note('A SECRET!'); }
      else if (c === 'R') this.rotateBlock(); else sfx.play('ui.move', { pitch: 0.5 }); }
    for (const k in this.doors) { const d = this.doors[k]; if (d.dir > 0) { d.open = Math.min(1, d.open + dt * 1.6); if (d.open >= 1) { d.hold -= dt; if (d.hold <= 0) { const [x, y] = k.split(',').map(Number); if (Math.hypot(p.x - x - 0.5, p.y - y - 0.5) > 1.1) d.dir = -1; } } } else if (d.dir < 0) { d.open -= dt * 1.6; if (d.open <= 0) { d.open = 0; d.dir = 0; } } }
    const fire = inp.pressed.attack || inp.pressed.mouseL, blast = inp.pressed.shoot || inp.pressed.mouseR;
    if ((fire || blast) && p.fire <= 0) { const cost = blast ? 4 : 1; if (p.ammo >= cost) { p.ammo -= cost; p.fire = blast ? 0.55 : 0.2; p.kick = 1; p.flash = 0.1; sfx.play(blast ? 'px.charge' : 'px.shot', { pitch: 0.8 }); this.hitscan(blast ? 0.3 : 0.05, blast ? 4 : 2, blast); } else { sfx.play('ui.back'); this.note('OUT OF AMMO'); } }
    for (const e of this.things) {
      if (e.vell) { e.x += (p.x + ca * 1.6 + sa * 0.5 - e.x) * dt * 2; e.y += (p.y + sa * 1.6 - ca * 0.5 - e.y) * dt * 2; continue; } if (e.decor) continue;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if (e.item) { if (d < 0.6) { e.dead = true; sfx.play('px.pickup'); if (e.k === 'a') { p.ammo += 20; this.note('AMMO +20'); } if (e.k === 'm') { p.hp = Math.min(100, p.hp + 25); this.note('HEALTH +25'); } if (e.k === 'k') { p.key = true; this.note('FRAME KEY'); } } continue; }
      e.t += dt; if (e.st === 'dead') continue; if (e.st === 'hurt') { if (e.t > 0.22) e.st = 'chase'; continue; }
      const see = d < 11 && this.los(e.x, e.y, p.x, p.y); if (e.st === 'idle' && see) { e.st = 'chase'; sfx.play('px.telegraph', { pitch: 0.5, vol: 0.5 }); }
      if (e.st === 'chase') { const sp2 = (e.k === 'i' ? 2.6 : e.k === 'h' ? 1 : 1.6) * dt, min = e.k === 'i' ? 0.7 : 3; if (d > min) this.tryMove(e, ((p.x - e.x) / d) * sp2, ((p.y - e.y) / d) * sp2, 0.25); e.cool -= dt; if (e.cool <= 0 && see && (e.k !== 'i' || d < 1)) { e.st = 'atk'; e.t = 0; } }
      if (e.st === 'atk' && e.t > 0.4) { e.st = 'chase'; e.cool = e.k === 'h' ? 0.7 : 1.4; if (e.k === 'i') { if (d < 1.1) this.hurt(8); } else { const a = Math.atan2(p.y - e.y, p.x - e.x); this.shots.push({ k: 'o', x: e.x, y: e.y, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, item: true }); sfx.play('px.shot', { pitch: 0.5, vol: 0.5 }); } }
    }
    for (const s2 of this.shots) { s2.x += s2.vx * dt; s2.y += s2.vy * dt; if (this.solid(s2.x, s2.y)) s2.dead = true; else if (Math.hypot(p.x - s2.x, p.y - s2.y) < 0.35) { s2.dead = true; this.hurt(10); } }
    this.shots = this.shots.filter((q) => !q.dead); this.things = this.things.filter((q) => !q.dead);
    if (this.map[p.y | 0][p.x | 0] === 'E') this.startFinale();
    if (p.x > 10 && p.y < 5) this.say('a', 'vell', 'Doors open with E. So do walls that look a little TOO innocent.');
    if (p.y > 8 && p.y < 13 && p.x > 7 && p.x < 13) this.say('b', 'vell', 'The key is inside that ring and the opening faces a wall. Find the switch. Rooms rotate here.');
    if (p.hp <= 0) { g.save.data.stats.deaths++; g.sfx.play('px.die'); this.start(); }
  }
  say(k, who, text) { if (!this.said[k]) { this.said[k] = true; this.game.dialogue.say(who, text); } }
  hurt(n) { const p = this.p; p.hp -= this.game.easy ? n * 0.35 : n; p.hurt = 0.3; this.game.sfx.play('px.hurt'); }
  hitscan(spread, dmg, wide) {
    const p = this.p; let best = null, bd = 99;
    for (const e of this.things) { if (e.item || e.st === 'dead') continue; const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy); let da = Math.atan2(dy, dx) - p.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; if (Math.abs(da) < spread + 0.3 / d && this.los(p.x, p.y, e.x, e.y)) { if (wide) this.damage(e, dmg); else if (d < bd) { bd = d; best = e; } } }
    if (best) this.damage(best, dmg);
  }
  damage(e, n) { e.hp -= n; e.st = 'hurt'; e.t = 0; this.game.sfx.play('px.hit'); if (e.hp <= 0) { e.st = 'dead'; e.t = 0; this.game.sfx.play('px.explode', { vol: 0.6 }); if (Math.random() < 0.4) this.things.push({ k: 'a', x: e.x + 0.2, y: e.y, item: true }); } }
  rotateBlock() {
    const x0 = 13, y0 = 9, n = 5, old = []; for (let y = 0; y < n; y++) old.push(this.map[y0 + y].slice(x0, x0 + n));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) this.map[y0 + y][x0 + x] = old[x][n - 1 - y];
    this.rot = 0.9; this.game.sfx.play('pp.rumble'); this.game.sfx.play('px.clank'); this.note('THE ROOM TURNS');
    for (const e of this.things) if (e.x > x0 && e.x < x0 + n && e.y > y0 && e.y < y0 + n) { const lx = e.x - x0, ly = e.y - y0; e.x = x0 + ly; e.y = y0 + n - lx; }
  }
  startFinale() { const g = this.game; this.fin = { t: 0 }; this.noPause = true; g.input.exitLock(); g.sfx.play('fx.rise'); g.dialogue.clear(); g.dialogue.say([{ who: 'rin', text: 'That one has a SIDE. Sprites do not have sides.' }, { who: 'vell', text: 'The walls are coming apart into... cubes. Oh, this is the blocky one!' }]); }
  updateFinale(dt) { const f = this.fin, g = this.game; f.t += dt; this.p.a += dt * 0.25; g.audio.muffle(clamp(f.t / 6, 0, 0.6)); if (f.t > 6.5 && !f.done) { f.done = true; const ok = g.director.handoff(6, { from5: true }); if (!ok) { g.save.complete(5); g.audio.muffle(0); g.director.end({ chapter: 5 }); } } }

  render() {
    const g = this.game, p = this.p, px = this.px, zb = this.zb, k = this.fin ? clamp(this.fin.t / 5, 0, 1) : 0, t = this.t, lit = this.lit;
    const rot = this.rot > 0 ? (this.rot -= 1 / 60, Math.sin(this.rot * 40) * this.rot * 0.05) : 0, pa = p.a + rot;
    const dirX = Math.cos(pa), dirY = Math.sin(pa), plX = -dirY * 0.72, plY = dirX * 0.72, horizon = (RH >> 1) + Math.round(Math.sin(p.bob) * 1.5), flash = p.flash > 0 ? 0.25 : 0;
    // banded light: distance falloff + lamp pools, quantised to ten steps
    const light = (dist, cell, side) => { const v = clamp(0.84 - dist * 0.105 + (lit[cell] || 0) * 0.55 - side * 0.12 + flash, 0.1, 1); return Math.round(v * 10) / 10; };
    // floor + ceiling casting
    const r0x = dirX - plX, r0y = dirY - plY, r1x = dirX + plX, r1y = dirY + plY, FT = this.floorT, CT = this.ceilT;
    for (let y = 0; y < RH; y++) { const pr = y - horizon, ceil = pr < 0, ap = Math.abs(pr) || 1, rd = (RH * 0.5) / ap, sx = (rd * (r1x - r0x)) / VW, sy = (rd * (r1y - r0y)) / VW; let fx = p.x + rd * r0x, fy = p.y + rd * r0y; const T = ceil ? CT : FT, row = y * VW;
      for (let x = 0; x < VW; x++) { const cx = fx | 0, cy = fy | 0, c = T[(((fy - cy) * TX) & TM) * TX + (((fx - cx) * TX) & TM)], l = light(rd, cx >= 0 && cy >= 0 && cx < 24 && cy < 20 ? cy * 24 + cx : 0, ceil ? 0.6 : 0); px[row + x] = (255 << 24) | ((((c >> 16) & 255) * l) << 16) | ((((c >> 8) & 255) * l) << 8) | ((c & 255) * l); fx += sx; fy += sy; } }
    for (let x = 0; x < VW; x++) {
      const cam = (2 * x) / VW - 1, rx = dirX + plX * cam, ry = dirY + plY * cam; let mx = p.x | 0, my = p.y | 0; const ddx = Math.abs(1 / rx), ddy = Math.abs(1 / ry), sx = rx < 0 ? -1 : 1, sy = ry < 0 ? -1 : 1; let sdx = (rx < 0 ? p.x - mx : mx + 1 - p.x) * ddx, sdy = (ry < 0 ? p.y - my : my + 1 - p.y) * ddy, side = 0, c = '.', dist = 0, u = 0;
      for (let i = 0; i < 48; i++) { if (sdx < sdy) { sdx += ddx; mx += sx; side = 0; } else { sdy += ddy; my += sy; side = 1; } c = this.map[my]?.[mx] || '#'; if (c === '.' || c === 'E') continue; dist = side ? sdy - ddy : sdx - ddx; u = side ? p.x + dist * rx : p.y + dist * ry; u -= Math.floor(u); const d = this.doors[mx + ',' + my]; if (d && u < d.open) continue; if (d) u -= d.open; break; }
      zb[x] = dist; const h = RH / Math.max(dist, 0.05), y0 = horizon - h / 2, set = this.tex[c] || this.tex['#'], tex = set[hash2(mx, my) > 0.62 ? 1 : 0], tx = (u * TX) & TM, pc = side ? (ry > 0 ? my - 1 : my + 1) * 24 + mx : my * 24 + (rx > 0 ? mx - 1 : mx + 1), l = light(dist, pc >= 0 && pc < 480 ? pc : 0, side);
      const ys = Math.max(0, Math.floor(y0)), ye = Math.min(RH, Math.floor(y0 + h));
      for (let y = ys; y < ye; y++) {
        let ty = ((y - y0) / h) * TX; if (k > 0) { const gx = (tx & 15) / 16, gy = (ty & 15) / 16, gap = k * 0.42; if (gx < gap || gy < gap || gx > 1 - gap * 0.3) { px[y * VW + x] = 0xff1f0f0d | 0; continue; } ty += Math.sin(t * 3 + (tx >> 4) * 2 + (ty >> 4)) * k * 6; }
        const col = tex[((ty & TM) << 6) | tx]; px[y * VW + x] = (255 << 24) | ((((col >> 16) & 255) * l) << 16) | ((((col >> 8) & 255) * l) << 8) | ((col & 255) * l);
      }
    }
    // sprites (far to near)
    const list = [...this.things, ...this.shots].map((e) => ({ e, d: (e.x - p.x) ** 2 + (e.y - p.y) ** 2 })).sort((a, b) => b.d - a.d);
    for (const { e } of list) {
      const dx = e.x - p.x, dy = e.y - p.y, inv = 1 / (plX * dirY - dirX * plY), tx2 = inv * (dirY * dx - dirX * dy), tz = inv * (-plY * dx + plX * dy); if (tz < 0.15) continue;
      const scr = (VW / 2) * (1 + tx2 / tz), sz = RH / tz, fat = e.item ? 1 : 1 + k * 1.6, w = sz * fat, x0 = Math.floor(scr - w / 2), y0 = Math.floor(horizon - sz / 2 + (e.vell ? Math.sin(t * 3) * sz * 0.06 - sz * 0.1 : 0));
      let fr = 0; if (!e.item) fr = e.st === 'dead' ? Math.min(9, 7 + Math.floor(e.t * 7)) : e.st === 'hurt' ? 6 : e.st === 'atk' ? (e.t > 0.28 ? 5 : 4) : e.st === 'idle' ? 0 : Math.floor(e.t * 7) % 4;
      const tex = this.spr[e.k][fr], cell = ((e.y | 0) * 24 + (e.x | 0)), sh = e.k === 'o' || e.k === 'l' ? 1 : light(tz, cell >= 0 && cell < 480 ? cell : 0, 0);
      for (let x = Math.max(0, x0); x < Math.min(VW, x0 + w); x++) { if (zb[x] < tz) continue; const u = (((x - x0) / w) * 64) | 0; for (let y = Math.max(0, y0); y < Math.min(RH, y0 + sz); y++) { const col = tex[((((y - y0) / sz) * 64) | 0) * 64 + u]; if (col) { let r = (col & 255) * sh, gg = ((col >> 8) & 255) * sh, b = ((col >> 16) & 255) * sh; if (k > 0 && !e.item && (u < 10 || u > 53)) { r *= 0.6; gg *= 0.6; b *= 0.6; } px[y * VW + x] = (255 << 24) | (Math.min(255, b) << 16) | (Math.min(255, gg) << 8) | Math.min(255, r); } } }
    }
    const bx = this.bx; bx.putImageData(this.img, 0, 0); bx.imageSmoothingEnabled = false;
    // weapon
    const gf = p.flash > 0.04 ? 1 : p.fire > 0.05 ? 2 : 0; bx.drawImage(this.gun[gf], Math.round(112 + Math.sin(p.bob * 0.5) * 5), Math.round(RH - 74 + Math.abs(Math.sin(p.bob * 0.5)) * 4 + p.kick * 5));
    // chunky status bar
    bx.fillStyle = PAL.g; bx.fillRect(0, RH, VW, VH - RH); bx.fillStyle = PAL.i; bx.fillRect(0, RH, VW, 1); bx.fillStyle = PAL.K; bx.fillRect(0, RH + 1, VW, 1); for (let x = 2; x < VW; x += 12) { bx.fillStyle = PAL.G; bx.fillRect(x, RH + 2, 2, 1); }
    const cell = (x, w, label, val, col) => { bx.fillStyle = PAL.K; bx.fillRect(x, RH + 4, w, 24); bx.fillStyle = PAL.n; bx.fillRect(x + 1, RH + 5, w - 2, 22); bx.fillStyle = PAL.N; bx.fillRect(x + 1, RH + 5, w - 2, 1); ptext(bx, label, x + w / 2, RH + 7, PAL.h, 0.5, null); bx.save(); bx.translate(x + w / 2, RH + 15); bx.scale(1.5, 1.5); ptext(bx, val, 0, 0, col, 0.5, PAL.K); bx.restore(); };
    cell(4, 70, 'HEALTH', Math.max(0, p.hp | 0) + '%', p.hp > 30 ? PAL.J : PAL.R); cell(78, 60, 'AMMO', p.ammo, PAL.y); cell(246, 70, 'KEY', p.key ? 'FRAME' : '----', p.key ? PAL.y : PAL.G);
    bx.fillStyle = PAL.K; bx.fillRect(142, RH + 4, 100, 24); const at = g.director.modules[1]?.atlas; if (at) { bx.save(); bx.beginPath(); bx.rect(143, RH + 5, 52, 22); bx.clip(); bx.translate(168, RH + 60); bx.scale(2, 2); at.draw(bx, p.hurt > 0 ? 'rin_hurt0' : 'rin_idle0', 0, 0, Math.sin(t * 0.7) > 0); bx.restore(); } ptext(bx, 'RIN', 200, RH + 8, PAL.c, 0, null); ptext(bx, '1996', 200, RH + 18, PAL.O, 0, null);
    if (p.hurt > 0) { bx.fillStyle = 'rgba(194,54,47,0.35)'; bx.fillRect(0, 0, VW, RH); }
    bx.fillStyle = PAL.W; bx.fillRect(159, horizon - 3, 2, 2); bx.fillRect(159, horizon + 2, 2, 2); bx.fillRect(155, horizon, 2, 1); bx.fillRect(163, horizon, 2, 1);
    if (this.msg) ptext(bx, this.msg.s, VW / 2, 12, PAL.Y, 0.5);
    if (this.title > 0) { ptext(bx, 'CHAPTER 5', VW / 2, 40, PAL.O, 0.5); bx.save(); bx.translate(VW / 2, 52); bx.scale(3, 3); ptext(bx, '1996', 0, 0, PAL.W, 0.5); bx.restore(); }
    const d = g.dialogue.current; if (d) { const lines = wrapText(g.dialogue.visibleText, 44), full = wrapText(d.text, 44), h = 14 + full.length * 9, y = this.title > 0 ? 78 : 22; bx.globalAlpha = 0.85; bx.fillStyle = PAL.K; bx.fillRect(20, y, VW - 40, h); bx.globalAlpha = 1; bx.fillStyle = d.speaker.color; bx.fillRect(20, y, 2, h); ptext(bx, d.speaker.name, 26, y + 3, d.speaker.color, 0, null); lines.forEach((ln, i) => ptext(bx, ln, 26, y + 12 + i * 9, PAL.W, 0, null)); }
    if (this.introT < 3.2) { this.introT += 1 / 60; const it = this.introT, step = it < 0.8 ? 32 : it < 1.3 ? 16 : it < 1.8 ? 8 : it < 2.3 ? 4 : it < 2.8 ? 2 : 1;
      if (this.snap && it < 1.3) { bx.globalAlpha = Math.min(1, (1.3 - it) / 0.7); bx.drawImage(this.snap, 0, 0, this.snap.width, this.snap.height, 0, 0, VW, RH); bx.globalAlpha = 1; }
      if (step > 1) { for (let x = 0; x < VW; x += step) bx.drawImage(this.buf, x, 0, 1, RH, x, 0, step, RH); for (let y = 0; y < RH; y += step) bx.drawImage(this.buf, 0, y, VW, 1, 0, y, VW, step); }
      if (Math.floor(it * 2) !== Math.floor((it - 1 / 60) * 2) && it < 2.8) g.sfx.play('px.glitch', { vol: 0.5, pitch: 0.6 + it * 0.3 }); }
    const ctx = g.ctx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, g.W, g.H); const sc = Math.max(1, Math.floor(Math.min(g.W / VW, g.H / VH))); ctx.drawImage(this.buf, 0, 0, VW, VH, (g.W - VW * sc) >> 1, (g.H - VH * sc) >> 1, VW * sc, VH * sc);
  }
}
