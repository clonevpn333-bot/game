// Chapter 1 tileset. 16x16 tiles, drawn per (kind, neighbour mask, variant)
// and cached as canvases. Two themes: ROOF (brick/concrete) and FACT (steel).
import { Pix } from './pix.js';
import { hash2 } from '../core/util.js';

export const TS = 16;
export const T = { EMPTY: 0, SOLID: 1, ONEWAY: 2, CRUMBLE: 3, SPIKE: 4, CONV_R: 5, CONV_L: 6, TRAIN: 7, GLASS: 8, GIRDER: 9 };
export const isSolid = (t) => t === T.SOLID || t === T.CONV_R || t === T.CONV_L || t === T.TRAIN || t === T.GLASS || t === T.GIRDER;

// mask bits: 1 = up exposed, 2 = right, 4 = down, 8 = left
function solidFact(mask, v) {
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, 'g');
  // interior panelling
  if (v % 5 === 0) { p.frame(2, 2, 12, 12, 'G'); p.rect(3, 3, 10, 1, 'h'); p.set(3, 3, 'G'); p.set(12, 12, 'K'); for (const [x, y] of [[4, 5], [11, 5], [4, 10], [11, 10]]) p.set(x, y, 'h'); }
  else if (v % 5 === 1) { for (let y = 3; y < 14; y += 3) { p.rect(3, y, 10, 1, 'K'); p.rect(3, y + 1, 10, 1, 'G'); } p.frame(1, 1, 14, 14, 'G'); } // vent
  else if (v % 5 === 2) { p.rect(0, 7, 16, 1, 'K'); p.rect(0, 8, 16, 1, 'G'); p.rect(7, 0, 1, 7, 'K'); p.rect(8, 0, 1, 7, 'G'); p.set(3, 3, 'h'); p.set(12, 12, 'h'); }
  else if (v % 5 === 3) { p.rect(0, 5, 16, 5, 'n'); p.rect(0, 5, 16, 1, 'N'); p.rect(0, 9, 16, 1, 'K'); p.rect(5, 4, 2, 7, 'G'); p.rect(5, 4, 2, 1, 'h'); } // pipe run
  else { p.rect(0, 15, 16, 1, 'K'); p.rect(15, 0, 1, 16, 'K'); p.rect(0, 0, 16, 1, 'G'); p.rect(0, 0, 1, 16, 'G'); p.set(2, 2, 'h'); p.set(13, 13, 'K'); }
  if (mask & 8) { p.rect(0, 0, 2, 16, 'h'); p.rect(0, 0, 1, 16, 'H'); p.rect(2, 0, 1, 16, 'K'); }
  if (mask & 2) { p.rect(14, 0, 2, 16, 'G'); p.rect(15, 0, 1, 16, 'K'); p.rect(13, 0, 1, 16, 'K'); }
  if (mask & 4) { p.rect(0, 13, 16, 3, 'G'); p.rect(0, 15, 16, 1, 'K'); p.rect(0, 12, 16, 1, 'K'); for (let x = 2; x < 16; x += 5) p.set(x, 14, 'h'); }
  if (mask & 1) {
    p.rect(0, 0, 16, 4, 'h'); p.rect(0, 0, 16, 1, 'W'); p.rect(0, 1, 16, 1, 'i'); p.rect(0, 2, 16, 1, 'H'); p.rect(0, 4, 16, 1, 'K');
    if (v % 3 === 0) { p.set(3, 2, 'G'); p.set(12, 2, 'G'); }
    if (v % 7 === 3) for (let x = 0; x < 16; x++) p.set(x, 3, (x >> 1) % 2 ? 'y' : 'K'); // hazard edging
  }
  return p;
}
function solidRoof(mask, v) {
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, 'e');
  for (let row = 0; row < 4; row++) {
    const y = row * 4, off = row % 2 ? 4 : 0;
    p.rect(0, y + 3, 16, 1, 'd');
    for (let x = off; x < 16 + 8; x += 8) { p.rect((x + 7) % 16, y, 1, 3, 'd'); }
    for (let bx = 0; bx < 2; bx++) { const x0 = (off + bx * 8) % 16, h = hash2(v * 7 + row, bx + v); if (h > 0.6) { for (let i = 0; i < 7; i++) p.set((x0 + i) % 16, y, 'E'); } if (h < 0.2) { for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) p.set((x0 + i) % 16, y + j, 'D'); } }
  }
  if (mask & 8) { p.rect(0, 0, 1, 16, 'E'); }
  if (mask & 2) { p.rect(15, 0, 1, 16, 'd'); }
  if (mask & 4) { p.rect(0, 14, 16, 2, 'd'); p.rect(0, 15, 16, 1, 'K'); }
  if (mask & 1) { // concrete cap with drip shadow
    p.rect(0, 0, 16, 5, 'H'); p.rect(0, 0, 16, 1, 'W'); p.rect(0, 1, 16, 1, 'i'); p.rect(0, 4, 16, 1, 'h'); p.rect(0, 5, 16, 1, 'K'); p.rect(0, 6, 16, 1, 'd');
    if (v % 4 === 1) { p.set(5, 2, 'h'); p.set(6, 3, 'h'); } if (v % 4 === 2) { p.rect(9, 2, 3, 1, 'h'); }
  }
  return p;
}
function oneway(v, theme) {
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 2, theme ? 'i' : 'a'); p.rect(0, 0, 16, 1, theme ? 'W' : 'A'); p.rect(0, 2, 16, 1, theme ? 'h' : 'e'); p.rect(0, 3, 16, 1, 'K');
  for (let x = 1; x < 16; x += 4) { p.rect(x, 3, 2, 2, theme ? 'G' : 'D'); }
  if (v % 2) { p.rect(0, 3, 1, 4, 'G'); p.rect(15, 3, 1, 4, 'G'); }
  return p;
}
function crumble(stage) {
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 7, 'e'); p.rect(0, 0, 16, 1, 'A'); p.rect(0, 1, 16, 1, 'a'); p.rect(0, 6, 16, 1, 'D'); p.rect(0, 7, 16, 1, 'K');
  p.rect(0, 0, 1, 7, 'D'); p.rect(15, 0, 1, 7, 'D'); p.set(3, 3, 'D'); p.set(11, 4, 'D');
  if (stage >= 1) { p.line(5, 0, 7, 3, 'K'); p.line(7, 3, 6, 6, 'K'); p.line(11, 0, 10, 2, 'K'); }
  if (stage >= 2) { p.line(2, 2, 4, 6, 'K'); p.line(12, 2, 13, 6, 'K'); p.rect(8, 5, 2, 2, 0); p.rect(0, 5, 1, 2, 0); }
  return p;
}
function spike(f) {
  const p = new Pix(16, 16);
  p.rect(0, 12, 16, 4, 'G'); p.rect(0, 12, 16, 1, 'h'); p.rect(0, 15, 16, 1, 'K');
  for (const x of [1, 6, 11]) { p.rect(x, 9, 4, 3, 'N'); p.rect(x + 1, 6, 2, 3, 'B'); p.set(x + 1, 6, 'L'); }
  // arcs between prongs
  const c = f % 2 ? 'w' : 'C';
  if (f === 0) { p.line(3, 5, 7, 3, c); p.line(7, 3, 8, 5, c); p.line(8, 5, 12, 4, c); }
  if (f === 1) { p.line(3, 4, 5, 6, c); p.line(5, 6, 8, 2, c); p.line(8, 2, 12, 5, c); }
  if (f === 2) { p.line(2, 5, 6, 4, c); p.line(7, 5, 10, 3, c); p.line(10, 3, 13, 5, c); }
  return p;
}
function conveyor(f, dir) {
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, 'g'); p.rect(0, 0, 16, 5, 'G'); p.rect(0, 0, 16, 1, 'i'); p.rect(0, 4, 16, 1, 'K');
  for (let x = -4; x < 20; x += 4) { const xx = x + (dir > 0 ? f : 3 - f); p.rect(xx, 1, 2, 3, 'y'); p.set(xx, 1, 'Y'); p.rect(xx + 2, 1, 1, 3, 'K'); }
  // rollers underneath
  for (const x of [3, 11]) { p.ellipse(x + 0.5, 9.5, 3, 3, 'h'); p.ellipse(x + 0.5, 9.5, 1, 1, 'K'); const a = (f / 4) * Math.PI * 0.5 * dir; p.set(Math.round(x + 0.5 + Math.cos(a) * 2), Math.round(9.5 + Math.sin(a) * 2), 'W'); }
  p.rect(0, 14, 16, 2, 'K');
  return p;
}
function glass(mask) {
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, 'n'); p.frame(0, 0, 16, 16, 'h'); p.rect(1, 1, 14, 1, 'i');
  p.line(3, 12, 8, 3, 'N'); p.line(5, 13, 10, 4, 'b'); p.line(9, 13, 12, 8, 'N');
  if (mask & 1) p.rect(0, 0, 16, 1, 'W');
  return p;
}
function girder(mask) {
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 3, 'e'); p.rect(0, 0, 16, 1, 'a'); p.rect(0, 13, 16, 3, 'e'); p.rect(0, 15, 16, 1, 'D'); p.rect(0, 2, 16, 1, 'D'); p.rect(0, 13, 16, 1, 'E');
  p.line(0, 3, 15, 12, 'e', 2); p.line(15, 3, 0, 12, 'D', 2); p.line(0, 3, 15, 12, 'E', 1);
  for (const x of [2, 13]) { p.set(x, 1, 'A'); p.set(x, 14, 'a'); }
  return p;
}

// --- back wall (non-colliding interior backdrop) -----------------------------------
function backWall(kind, v, f = 0) {
  const p = new Pix(16, 16);
  p.rect(0, 0, 16, 16, 'k');
  p.rect(0, 15, 16, 1, 'K'); p.rect(15, 0, 1, 16, 'K');
  if ((v & 3) === 0) { p.set(2, 2, 'n'); p.set(12, 12, 'n'); }
  if (kind === 1) { /* plain */ if (v % 6 === 0) { p.rect(3, 4, 10, 1, 'n'); p.rect(3, 9, 10, 1, 'n'); } }
  if (kind === 2) { // lit window
    p.rect(2, 2, 12, 12, 'K'); p.rect(3, 3, 10, 10, v % 3 === 0 ? 'u' : 'N'); p.rect(3, 3, 10, 1, v % 3 === 0 ? 'U' : 'b'); p.rect(7, 3, 1, 10, 'K'); p.rect(3, 8, 10, 1, 'K');
    if (v % 3 === 0) { p.rect(4, 4, 2, 3, 'm'); }
  }
  if (kind === 3) { p.rect(0, 5, 16, 6, 'n'); p.rect(0, 5, 16, 1, 'N'); p.rect(0, 6, 16, 1, 'b'); p.rect(0, 10, 16, 1, 'K'); if (v % 3 === 0) { p.rect(6, 4, 3, 8, 'N'); p.rect(6, 4, 3, 1, 'b'); p.set(7, 7, 'K'); } } // h pipe
  if (kind === 4) { p.rect(5, 0, 6, 16, 'n'); p.rect(5, 0, 1, 16, 'N'); p.rect(6, 0, 1, 16, 'b'); p.rect(10, 0, 1, 16, 'K'); if (v % 3 === 0) { p.rect(4, 6, 8, 3, 'N'); p.rect(4, 6, 8, 1, 'b'); } } // v pipe
  if (kind === 5) { p.line(0, 0, 15, 15, 'n', 2); p.line(15, 0, 0, 15, 'n', 2); p.rect(0, 0, 16, 2, 'N'); p.rect(0, 14, 16, 2, 'n'); } // truss
  if (kind === 6) { // fan (4 frames)
    p.ellipse(7.5, 7.5, 7, 7, 'K'); p.ellipse(7.5, 7.5, 6, 6, 'n');
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + (f / 4) * (Math.PI * 2 / 3); p.line(7.5, 7.5, 7.5 + Math.cos(a) * 5.5, 7.5 + Math.sin(a) * 5.5, 'N', 2); }
    p.ellipse(7.5, 7.5, 1.5, 1.5, 'b');
  }
  if (kind === 7) { p.rect(6, 0, 4, 3, 'N'); p.rect(5, 3, 6, 4, f % 2 ? 'Y' : 'y'); p.rect(5, 3, 6, 1, 'W'); p.rect(4, 7, 8, 1, 'N'); } // lamp
  if (kind === 8) { for (let y = 0; y < 16; y += 4) { p.rect(7, y, 2, 3, 'N'); p.set(7, y, 'b'); p.rect(6, y + 3, 4, 1, 'n'); } } // chain
  if (kind === 9) { // warning sign
    p.rect(2, 3, 12, 10, 'K'); p.rect(3, 4, 10, 8, 'y'); p.poly([[8, 5], [11, 10], [5, 10]], 'K'); p.set(8, 8, 'y'); p.rect(3, 4, 10, 1, 'Y');
  }
  return p;
}

export class Tileset {
  constructor() { this.cache = new Map(); }
  _get(key, make) { let c = this.cache.get(key); if (!c) { c = make().toCanvas(); this.cache.set(key, c); } return c; }
  solid(theme, mask, v) { return this._get(`s${theme}_${mask}_${v % 20}`, () => (theme === 0 ? solidRoof(mask, v % 20) : solidFact(mask, v % 20))); }
  tile(t, { theme = 1, mask = 0, v = 0, f = 0, stage = 0 } = {}) {
    switch (t) {
      case T.SOLID: return this.solid(theme, mask, v);
      case T.ONEWAY: return this._get(`o${theme}_${v % 2}`, () => oneway(v, theme));
      case T.CRUMBLE: return this._get(`c${stage}`, () => crumble(stage));
      case T.SPIKE: return this._get(`k${f % 3}`, () => spike(f % 3));
      case T.CONV_R: return this._get(`cr${f % 4}`, () => conveyor(f % 4, 1));
      case T.CONV_L: return this._get(`cl${f % 4}`, () => conveyor(f % 4, -1));
      case T.GLASS: return this._get(`g${mask & 1}`, () => glass(mask));
      case T.GIRDER: return this._get(`gd`, () => girder(mask));
      default: return null;
    }
  }
  back(kind, v, f = 0) { return this._get(`b${kind}_${v % 12}_${kind === 6 ? f % 4 : kind === 7 ? f % 2 : 0}`, () => backWall(kind, v % 12, f)); }
}

// For the preview tool.
export function addTileFrames(atlas) {
  for (const m of [0, 1, 2, 4, 8, 3, 9, 5, 15]) for (let v = 0; v < 5; v++) atlas.add(`fact_${m}_${v}`, solidFact(m, v));
  for (const m of [0, 1, 9, 3]) for (let v = 0; v < 4; v++) atlas.add(`roof_${m}_${v}`, solidRoof(m, v));
  atlas.add('oneway0', oneway(0, 0)); atlas.add('oneway1', oneway(1, 1));
  for (let i = 0; i < 3; i++) atlas.add('crumble' + i, crumble(i));
  for (let i = 0; i < 3; i++) atlas.add('spike' + i, spike(i));
  for (let i = 0; i < 4; i++) atlas.add('conv' + i, conveyor(i, 1));
  atlas.add('glass', glass(1)); atlas.add('girder', girder(0));
  for (let k = 1; k <= 9; k++) atlas.add('back' + k, backWall(k, k === 2 ? 0 : 3, 0));
}
