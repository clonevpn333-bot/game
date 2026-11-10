// Pixel-art authoring toolkit for Chapter 1.
// Sprites are authored at native resolution as palette-indexed bitmaps:
// hand-placed stamps (strings of palette codes) + pixel-exact primitives,
// then baked once into nearest-neighbour atlases. Nothing here is ever
// filtered, rotated or scaled by a non-integer factor.
import { makeCanvas, hexToRgb } from '../core/util.js';

// Master palette — one character per colour so stamps can be typed as text.
export const PAL = {
  K: '#0d0f1f', k: '#1a1f3a',                                  // outline / deep navy
  n: '#232a4d', N: '#2f3a6b', b: '#3f5196', B: '#5876c9', l: '#7fa6ea', L: '#b4d2f7', // blues
  v: '#2a1f47', V: '#40295f', u: '#5e3a82', U: '#8a52a8', m: '#c06fc0', M: '#f09bd0', // purples
  t: '#0e4f66', T: '#168a96', c: '#2fd3c6', C: '#8ff5e3', w: '#e9fff9',               // teals
  r: '#7a1f2e', R: '#c2362f', o: '#e8642a', O: '#ff9a3c', y: '#ffd166', Y: '#fff3b0', // warm
  s: '#a85a48', S: '#e89a72', f: '#ffd0a4',                                         // skin
  g: '#2b3040', G: '#454c63', h: '#6a738f', H: '#98a2bd', i: '#c9d1e6', W: '#f4f6ff', // greys
  d: '#3a2330', D: '#5c3340', e: '#8a4a44', E: '#b8704f', a: '#d9a066', A: '#f0cf96', // rust / brick
  j: '#1f5c3d', J: '#3fae4f', p: '#9be84f',                                         // greens
};
const CODES = Object.keys(PAL);
const INDEX = {}; CODES.forEach((c, i) => (INDEX[c] = i + 1));
const RGB = [[0, 0, 0], ...CODES.map((c) => hexToRgb(PAL[c]))];
export const ci = (code) => INDEX[code] || 0;

export class Pix {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint8Array(w * h); }
  clone() { const p = new Pix(this.w, this.h); p.d.set(this.d); return p; }
  clear() { this.d.fill(0); return this; }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.d[y * this.w + x]; }
  set(x, y, c) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this; this.d[y * this.w + x] = typeof c === 'string' ? INDEX[c] || 0 : c; return this; }
  px(x, y, c) { return this.set(x, y, c); }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c); return this; }
  frame(x, y, w, h, c) { for (let i = 0; i < w; i++) { this.set(x + i, y, c); this.set(x + i, y + h - 1, c); } for (let j = 0; j < h; j++) { this.set(x, y + j, c); this.set(x + w - 1, y + j, c); } return this; }
  hline(x, y, w, c) { return this.rect(x, y, w, 1, c); }
  vline(x, y, h, c) { return this.rect(x, y, 1, h, c); }
  line(x0, y0, x1, y1, c, t = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      if (t === 1) this.set(x0, y0, c); else this.rect(x0 - ((t - 1) >> 1), y0 - ((t - 1) >> 1), t, t, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }
  // Filled / stroked ellipse using an exact inside test (no anti-aliasing).
  ellipse(cx, cy, rx, ry, c, fill = true) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x - cx) / (rx + 0.01), ny = (y - cy) / (ry + 0.01), d = nx * nx + ny * ny;
      if (d <= 1) {
        if (fill) this.set(x, y, c);
        else { const nx2 = (x - cx) / (rx - 0.99), ny2 = (y - cy) / (ry - 0.99); if (rx < 1.5 || ry < 1.5 || nx2 * nx2 + ny2 * ny2 > 1) this.set(x, y, c); }
      }
    }
    return this;
  }
  // Ring segment between angles (radians), used for slash arcs and gears.
  arc(cx, cy, r0, r1, a0, a1, c) {
    for (let y = Math.floor(cy - r1); y <= Math.ceil(cy + r1); y++) for (let x = Math.floor(cx - r1); x <= Math.ceil(cx + r1); x++) {
      const dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
      if (d < r0 || d > r1) continue;
      let a = Math.atan2(dy, dx); while (a < a0) a += Math.PI * 2; while (a > a0 + Math.PI * 2) a -= Math.PI * 2;
      if (a <= a1) this.set(x, y, c);
    }
    return this;
  }
  poly(pts, c) { // filled convex/concave polygon via scanline
    let minY = Infinity, maxY = -Infinity; for (const p of pts) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
      }
      xs.sort((p, q) => p - q);
      for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.round(xs[i]); x <= Math.round(xs[i + 1]); x++) this.set(x, y, c);
    }
    return this;
  }
  // Stamp hand-typed rows. '.' and ' ' are transparent.
  stamp(x, y, rows, { flip = false, remap = null } = {}) {
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j], n = row.length;
      for (let i = 0; i < n; i++) {
        let ch = row[flip ? n - 1 - i : i];
        if (ch === '.' || ch === ' ') continue;
        if (remap && remap[ch]) ch = remap[ch];
        this.set(x + i, y + j, ch);
      }
    }
    return this;
  }
  blit(src, x = 0, y = 0, { flip = false, sep = 0 } = {}) {
    // sep: draw a 1px separation line where src's dilation covers existing pixels
    if (sep) {
      const s = typeof sep === 'string' ? INDEX[sep] : sep;
      for (let j = -1; j <= src.h; j++) for (let i = -1; i <= src.w; i++) {
        if (src.get(flip ? src.w - 1 - i : i, j)) continue;
        const near = src.get(flip ? src.w - i : i - 1, j) || src.get(flip ? src.w - 2 - i : i + 1, j) || src.get(flip ? src.w - 1 - i : i, j - 1) || src.get(flip ? src.w - 1 - i : i, j + 1);
        if (near && this.get(x + i, y + j)) this.set(x + i, y + j, s);
      }
    }
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
      const c = src.d[j * src.w + (flip ? src.w - 1 - i : i)];
      if (c) this.set(x + i, y + j, c);
    }
    return this;
  }
  // 1px outline around the silhouette (4-neighbourhood, optional corners).
  outline(c = 'K', corners = false) {
    const col = typeof c === 'string' ? INDEX[c] : c, src = this.d.slice(), w = this.w, h = this.h;
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : src[y * w + x]);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (src[y * w + x]) continue;
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1) || (corners && (at(x - 1, y - 1) || at(x + 1, y - 1) || at(x - 1, y + 1) || at(x + 1, y + 1)))) this.d[y * w + x] = col;
    }
    return this;
  }
  replace(a, b) { const A = INDEX[a], B = INDEX[b]; for (let i = 0; i < this.d.length; i++) if (this.d[i] === A) this.d[i] = B; return this; }
  remapAll(map) { const m = new Uint8Array(64); for (let i = 0; i < 64; i++) m[i] = i; for (const k in map) m[INDEX[k]] = INDEX[map[k]]; for (let i = 0; i < this.d.length; i++) this.d[i] = m[this.d[i]]; return this; }
  // Ordered dither between two colours over a rect (t: 0..1 → amount of c2).
  dither(x, y, w, h, c1, c2, t) {
    const M = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const tt = typeof t === 'function' ? t(i, j) : t;
      this.set(x + i, y + j, (M[((y + j) & 3) * 4 + ((x + i) & 3)] + 0.5) / 16 < tt ? c2 : c1);
    }
    return this;
  }
  bounds() {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.d[y * this.w + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }
  // Write into ImageData. mode: 'normal' | 'flash' (solid white) | 'shadow'
  toImageData(img, ox, oy, flip = false, mode = 'normal') {
    const data = img.data, W = img.width;
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const c = this.d[y * this.w + (flip ? this.w - 1 - x : x)]; if (!c) continue;
      const o = ((oy + y) * W + ox + x) * 4, rgb = mode === 'flash' ? [255, 255, 255] : RGB[c];
      data[o] = rgb[0]; data[o + 1] = rgb[1]; data[o + 2] = rgb[2]; data[o + 3] = 255;
    }
  }
  toCanvas(scale = 1) {
    const c = makeCanvas(this.w, this.h), ctx = c.getContext('2d'), img = ctx.createImageData(this.w, this.h);
    this.toImageData(img, 0, 0); ctx.putImageData(img, 0, 0);
    if (scale === 1) return c;
    const s = makeCanvas(this.w * scale, this.h * scale), sc = s.getContext('2d'); sc.imageSmoothingEnabled = false; sc.drawImage(c, 0, 0, s.width, s.height); return s;
  }
}

// Atlas: packs named frames (each a Pix with an origin) into canvases.
// Three variants are baked: right-facing, left-facing (mirrored), white flash.
export class Atlas {
  constructor() { this.frames = {}; this.list = []; }
  add(name, pix, ox = 0, oy = 0, extra = {}) {
    const f = { name, pix, ox, oy, w: pix.w, h: pix.h, x: 0, y: 0, ...extra };
    this.frames[name] = f; this.list.push(f); return f;
  }
  bake(width = 1024) {
    let x = 0, y = 0, rowH = 0;
    for (const f of this.list) {
      if (x + f.w > width) { x = 0; y += rowH + 1; rowH = 0; }
      f.x = x; f.y = y; x += f.w + 1; rowH = Math.max(rowH, f.h);
    }
    const H = y + rowH + 1;
    const mk = (flip, mode) => {
      const c = makeCanvas(width, H), ctx = c.getContext('2d'), img = ctx.createImageData(width, H);
      for (const f of this.list) f.pix.toImageData(img, f.x, f.y, flip, mode);
      ctx.putImageData(img, 0, 0); return c;
    };
    this.R = mk(false, 'normal'); this.L = mk(true, 'normal');
    this.FR = mk(false, 'flash'); this.FL = mk(true, 'flash');
    return this;
  }
  // Draw frame with its origin at (x,y). All coordinates are snapped.
  draw(ctx, name, x, y, flip = false, flash = false) {
    const f = this.frames[name]; if (!f) return;
    const img = flash ? (flip ? this.FL : this.FR) : flip ? this.L : this.R;
    const dx = Math.round(x) - (flip ? f.w - f.ox : f.ox), dy = Math.round(y) - f.oy;
    ctx.drawImage(img, f.x, f.y, f.w, f.h, dx, dy, f.w, f.h);
  }
}

// 5x7 pixel font (uppercase, digits, punctuation). Rows are 5 bits wide.
const GLYPHS = {
  A: '01110100011000111111100011000110001', B: '11110100011000111110100011000111110', C: '01110100011000010000100001000101110',
  D: '11110100011000110001100011000111110', E: '11111100001000011110100001000011111', F: '11111100001000011110100001000010000',
  G: '01110100011000010111100011000101111', H: '10001100011000111111100011000110001', I: '01110001000010000100001000010001110',
  J: '00111000100001000010000101001001100', K: '10001100101010011000101001001010001', L: '10000100001000010000100001000011111',
  M: '10001110111010110101100011000110001', N: '10001110011010110011100011000110001', O: '01110100011000110001100011000101110',
  P: '11110100011000111110100001000010000', Q: '01110100011000110001101011001001101', R: '11110100011000111110101001001010001',
  S: '01111100001000001110000010000111110', T: '11111001000010000100001000010000100', U: '10001100011000110001100011000101110',
  V: '10001100011000110001100010101000100', W: '10001100011000110101101011101110001', X: '10001100010101000100010101000110001',
  Y: '10001100010101000100001000010000100', Z: '11111000010001000100010001000011111',
  0: '01110100011001110101110011000101110', 1: '00100011000010000100001000010001110', 2: '01110100010000100010001000100011111',
  3: '11110000010000101110000010000111110', 4: '00010001100101010010111110001000010', 5: '11111100001111000001000011000101110',
  6: '00110010001000011110100011000101110', 7: '11111000010001000100010000100001000', 8: '01110100011000101110100011000101110',
  9: '01110100011000101111000010001001100',
  '.': '00000000000000000000000000110001100', ',': '00000000000000000000001100010001000', '!': '00100001000010000100001000000000100',
  '?': '01110100010000100010001000000000100', ':': '00000011000110000000011000110000000', '-': '00000000000000011111000000000000000',
  "'": '00100001000100000000000000000000000', '"': '01010010100101000000000000000000000', '/': '00001000010001000100010001000010000',
  '+': '00000001000010011111001000010000000', '(': '00010001000100001000010000010000010', ')': '01000001000001000010000100010001000',
  '<': '00010001000100010000010000010000010', '>': '01000001000001000001000100010001000', '%': '11001110010001000100010001001110011',
  '*': '00000101010111011111011101010100000', '=': '00000000001111100000111110000000000', '#': '01010010101111101010111110101001010',
  '_': '00000000000000000000000000000011111', '[': '01110010000100001000010000100001110', ']': '01110000100001000010000100001001110',
  '&': '01100100101010001000101011001001101', '^': '00100010101000100000000000000000000', '~': '00000000000100010101000100000000000',
  '|': '00100001000010000100001000010000100', ';': '00000011000110000000011000010001000', '$': '00100011111010001110001011111000100',
  '@': '01110100011011110101101111000001110', ' ': '00000000000000000000000000000000000',
};
const fontCache = {};
function fontSheet(color) {
  if (fontCache[color]) return fontCache[color];
  const keys = Object.keys(GLYPHS), c = makeCanvas(keys.length * 6, 7), ctx = c.getContext('2d');
  ctx.fillStyle = color; const map = {};
  keys.forEach((k, i) => { map[k] = i; const g = GLYPHS[k]; for (let b = 0; b < 35; b++) if (g[b] === '1') ctx.fillRect(i * 6 + (b % 5), (b / 5) | 0, 1, 1); });
  return (fontCache[color] = { c, map });
}
// Draw pixel text. align: 0 left, 0.5 centre, 1 right. Returns width.
export function ptext(ctx, str, x, y, color = '#f4f6ff', align = 0, shadow = '#0d0f1f') {
  str = String(str).toUpperCase();
  const w = str.length * 6 - 1; x = Math.round(x - w * align); y = Math.round(y);
  const draw = (col, ox, oy) => { const f = fontSheet(col); for (let i = 0; i < str.length; i++) { const gi = f.map[str[i]]; if (gi == null || str[i] === ' ') continue; ctx.drawImage(f.c, gi * 6, 0, 5, 7, x + i * 6 + ox, y + oy, 5, 7); } };
  if (shadow) draw(shadow, 1, 1);
  draw(color, 0, 0);
  return w;
}
export const ptextWidth = (s) => String(s).length * 6 - 1;
