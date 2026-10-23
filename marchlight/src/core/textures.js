// Procedural, tileable material textures (albedo / normal / roughness-metalness).
// Everything is generated at boot so the game ships with zero image assets.
import * as THREE from 'three';
import { rng } from './util.js';

// Tileable value noise with integer period
function makeNoise(seed) {
  const r = rng(seed); const P = new Float32Array(4096); for (let i = 0; i < 4096; i++) P[i] = r();
  const h = (x, y) => P[((x * 73856093) ^ (y * 19349663)) & 4095];
  return (x, y, period) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const m = a => ((a % period) + period) % period;
    const a = h(m(xi), m(yi)), b = h(m(xi + 1), m(yi)), c = h(m(xi), m(yi + 1)), d = h(m(xi + 1), m(yi + 1));
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
const N1 = makeNoise(11), N2 = makeNoise(23), N3 = makeNoise(37);
function fbm(n, x, y, period, oct = 5) { let s = 0, a = 0.5, f = 1, t = 0; for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f, period * f); t += a; a *= 0.5; f *= 2; } return s / t; }

class TexBuilder {
  constructor(size = 512) {
    this.s = size;
    this.alb = new Float32Array(size * size * 3);
    this.h = new Float32Array(size * size);
    this.rough = new Float32Array(size * size).fill(0.7);
    this.metal = new Float32Array(size * size).fill(0);
    this.alpha = null; this.emis = null;
  }
  each(fn) { const s = this.s; for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) fn(x, y, y * s + x, x / s, y / s); }
  finish(name, { normalStrength = 2, repeat = 1 } = {}) {
    const s = this.s, out = {};
    const mk = (data, fmt = 'rgba') => {
      const c = document.createElement('canvas'); c.width = c.height = s; const ctx = c.getContext('2d');
      const img = ctx.createImageData(s, s); img.data.set(data); ctx.putImageData(img, 0, 0);
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.repeat.set(repeat, repeat);
      return t;
    };
    const A = new Uint8ClampedArray(s * s * 4), NM = new Uint8ClampedArray(s * s * 4), RM = new Uint8ClampedArray(s * s * 4);
    for (let i = 0; i < s * s; i++) {
      A[i * 4] = Math.pow(Math.min(1, this.alb[i * 3]), 1 / 2.2) * 255; A[i * 4 + 1] = Math.pow(Math.min(1, this.alb[i * 3 + 1]), 1 / 2.2) * 255; A[i * 4 + 2] = Math.pow(Math.min(1, this.alb[i * 3 + 2]), 1 / 2.2) * 255;
      A[i * 4 + 3] = this.alpha ? this.alpha[i] * 255 : 255;
      const x = i % s, y = (i / s) | 0;
      const hl = this.h[y * s + ((x - 1 + s) % s)], hr = this.h[y * s + ((x + 1) % s)], hu = this.h[((y - 1 + s) % s) * s + x], hd = this.h[((y + 1) % s) * s + x];
      let nx = (hl - hr) * normalStrength, ny = (hu - hd) * normalStrength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      NM[i * 4] = (nx * 0.5 + 0.5) * 255; NM[i * 4 + 1] = (ny * 0.5 + 0.5) * 255; NM[i * 4 + 2] = (nz * 0.5 + 0.5) * 255; NM[i * 4 + 3] = 255;
      RM[i * 4] = 255; RM[i * 4 + 1] = this.rough[i] * 255; RM[i * 4 + 2] = this.metal[i] * 255; RM[i * 4 + 3] = 255;
    }
    out.map = mk(A); out.map.colorSpace = THREE.SRGBColorSpace;
    out.normalMap = mk(NM); out.roughnessMap = mk(RM);
    if (this.emis) {
      const E = new Uint8ClampedArray(s * s * 4);
      for (let i = 0; i < s * s; i++) { E[i * 4] = this.emis[i * 3] * 255; E[i * 4 + 1] = this.emis[i * 3 + 1] * 255; E[i * 4 + 2] = this.emis[i * 3 + 2] * 255; E[i * 4 + 3] = 255; }
      out.emissiveMap = mk(E); out.emissiveMap.colorSpace = THREE.SRGBColorSpace;
    }
    out.name = name;
    return out;
  }
}

function setA(t, i, r, g, b) { t.alb[i * 3] = r; t.alb[i * 3 + 1] = g; t.alb[i * 3 + 2] = b; }

function panelMetal() {
  const t = new TexBuilder(512), r = rng(5);
  const scratches = [];
  for (let i = 0; i < 70; i++) scratches.push({ x: r() * 512, y: r() * 512, a: r() * Math.PI, l: 10 + r() * 60 });
  t.each((x, y, i, u, v) => {
    const n = fbm(N1, u * 8, v * 8, 8), n2 = fbm(N2, u * 32, v * 32, 32, 3);
    const px = x % 256, py = y % 128;
    const seam = Math.min(px, 256 - px, py, 128 - py);
    const seamH = seam < 2 ? -1 : seam < 4 ? -0.4 : 0;
    // rivets
    let riv = 0;
    const rx = (px % 32) - 16, ry = py < 64 ? py - 8 : py - 120;
    if ((py < 16 || py > 112) && rx * rx + ry * ry < 9) riv = 0.8;
    const grime = Math.pow(fbm(N3, u * 4, v * 4, 4), 2) * 0.6;
    let c = 0.62 + n * 0.12 + n2 * 0.06 - grime * 0.35 + (seam < 3 ? -0.25 : 0);
    t.h[i] = seamH + riv + n2 * 0.15;
    t.rough[i] = 0.5 + n2 * 0.3 + grime * 0.3;
    t.metal[i] = 0.35;
    setA(t, i, c, c, c * 0.98);
  });
  // scratches
  for (const s of scratches) for (let k = 0; k < s.l; k++) {
    const x = Math.floor(s.x + Math.cos(s.a) * k) & 511, y = Math.floor(s.y + Math.sin(s.a) * k) & 511, i = y * 512 + x;
    t.alb[i * 3] += 0.12; t.alb[i * 3 + 1] += 0.12; t.alb[i * 3 + 2] += 0.12; t.rough[i] = 0.3; t.metal[i] = 0.8;
  }
  return t.finish('panel', { normalStrength: 3 });
}

function rust() {
  const t = new TexBuilder(512);
  t.each((x, y, i, u, v) => {
    const n = fbm(N1, u * 6, v * 6, 6), n2 = fbm(N2, u * 24, v * 24, 24, 4), n3 = fbm(N3, u * 3, v * 3, 3, 3);
    const rustAmt = Math.min(1, Math.max(0, (n3 - 0.4) * 3 + n2 * 0.6));
    const base = [0.38, 0.37, 0.36].map(c => c + n * 0.1);
    const rc = [0.42 + n2 * 0.2, 0.2 + n2 * 0.1, 0.08];
    setA(t, i, ...base.map((c, k) => c + (rc[k] - c) * rustAmt));
    t.h[i] = n2 * 0.6 + rustAmt * 0.4;
    t.rough[i] = 0.6 + rustAmt * 0.35; t.metal[i] = 0.5 * (1 - rustAmt);
  });
  return t.finish('rust', { normalStrength: 3 });
}

function concrete() {
  const t = new TexBuilder(512), r = rng(9);
  t.each((x, y, i, u, v) => {
    const n = fbm(N1, u * 5, v * 5, 5), n2 = fbm(N2, u * 40, v * 40, 40, 3), n3 = fbm(N3, u * 2, v * 2, 2, 3);
    const speck = r() < 0.04 ? (r() - 0.5) * 0.15 : 0;
    const c = 0.55 + n * 0.12 + n2 * 0.08 - Math.pow(n3, 3) * 0.25 + speck;
    // formwork lines
    const line = (y % 256) < 2 ? -0.06 : 0;
    setA(t, i, c + line, c * 0.99 + line, c * 0.96 + line);
    t.h[i] = n2 * 0.5 + n * 0.2 + line * 4; t.rough[i] = 0.85 + n2 * 0.1; t.metal[i] = 0;
  });
  return t.finish('concrete', { normalStrength: 1.5 });
}

function grate() {
  const t = new TexBuilder(256);
  t.alpha = new Float32Array(256 * 256);
  t.each((x, y, i, u, v) => {
    const gx = x % 32, gy = y % 16;
    const bar = gx < 5 || gy < 3;
    const n = fbm(N1, u * 8, v * 8, 8, 3);
    t.alpha[i] = bar ? 1 : 0;
    const c = 0.4 + n * 0.2;
    setA(t, i, c, c, c);
    t.h[i] = bar ? (gx < 5 ? 1 - Math.abs(gx - 2) * 0.2 : 0.7) : 0;
    t.rough[i] = 0.5 + n * 0.3; t.metal[i] = 0.7;
  });
  return t.finish('grate', { normalStrength: 3 });
}

function tiles() {
  const t = new TexBuilder(512), r = rng(3);
  const tint = []; for (let k = 0; k < 64; k++) tint.push(0.9 + r() * 0.18);
  t.each((x, y, i, u, v) => {
    const tx = Math.floor(x / 64), ty = Math.floor(y / 64), px = x % 64, py = y % 64;
    const grout = px < 2 || py < 2;
    const n = fbm(N1, u * 16, v * 16, 16, 3);
    const k = tint[(tx + ty * 8) & 63];
    const c = grout ? 0.3 : (0.72 + n * 0.08) * k;
    setA(t, i, c, c * 0.97, c * 0.92);
    t.h[i] = grout ? -0.6 : n * 0.1; t.rough[i] = grout ? 0.95 : 0.35 + n * 0.2; t.metal[i] = 0;
  });
  return t.finish('tiles', { normalStrength: 2 });
}

function wood() {
  const t = new TexBuilder(512), r = rng(4);
  const plank = []; for (let k = 0; k < 16; k++) plank.push({ off: r() * 100, tone: 0.85 + r() * 0.3 });
  t.each((x, y, i, u, v) => {
    const pk = Math.floor(y / 64), p = plank[pk & 15];
    const grain = Math.sin((x + p.off * 10) * 0.05 + fbm(N1, u * 4 + p.off, v * 40, 4) * 12) * 0.5 + 0.5;
    const n = fbm(N2, u * 30, v * 4, 30, 3);
    const gap = (y % 64) < 2 || ((x + pk * 173) % 512) < 2;
    const c = (0.42 + grain * 0.12 + n * 0.08) * p.tone;
    setA(t, i, gap ? 0.08 : c, gap ? 0.05 : c * 0.72, gap ? 0.03 : c * 0.48);
    t.h[i] = gap ? -1 : grain * 0.2; t.rough[i] = 0.6 + n * 0.2; t.metal[i] = 0;
  });
  return t.finish('wood', { normalStrength: 2 });
}

function plaster() {
  const t = new TexBuilder(512);
  t.each((x, y, i, u, v) => {
    const n = fbm(N1, u * 10, v * 10, 10), n2 = fbm(N2, u * 60, v * 60, 60, 2), n3 = fbm(N3, u * 3, v * 3, 3, 3);
    const stain = Math.max(0, n3 - 0.55) * 1.2;
    const c = 0.82 + n * 0.08 + n2 * 0.05 - stain * 0.3;
    setA(t, i, c, c * 0.97, c * 0.92);
    t.h[i] = n2 * 0.5 + n * 0.3; t.rough[i] = 0.9; t.metal[i] = 0;
  });
  return t.finish('plaster', { normalStrength: 1.2 });
}

function fabric() {
  const t = new TexBuilder(256);
  t.each((x, y, i, u, v) => {
    const w = ((x % 4) < 2) ^ ((y % 4) < 2) ? 1 : 0;
    const n = fbm(N1, u * 8, v * 8, 8, 3);
    const stripe = (Math.floor(x / 32) % 2) ? 0.85 : 1;
    const c = (0.75 + w * 0.08 + n * 0.1) * stripe;
    setA(t, i, c, c, c); t.h[i] = w * 0.3; t.rough[i] = 0.95; t.metal[i] = 0;
  });
  return t.finish('fabric', { normalStrength: 1 });
}

function hazard() {
  const t = new TexBuilder(256);
  t.each((x, y, i, u, v) => {
    const s = ((x + y) % 64) < 32;
    const n = fbm(N1, u * 8, v * 8, 8, 4), wear = fbm(N2, u * 16, v * 16, 16, 3) > 0.62;
    let c = s ? [0.85, 0.62, 0.05] : [0.06, 0.06, 0.06];
    if (wear) c = [0.35, 0.33, 0.3];
    setA(t, i, ...c.map(k => k * (0.85 + n * 0.3)));
    t.h[i] = wear ? -0.2 : 0; t.rough[i] = wear ? 0.5 : 0.6; t.metal[i] = wear ? 0.6 : 0.1;
  });
  return t.finish('hazard', { normalStrength: 2 });
}

// Building facade with windows; emissive map lights a random subset.
function facade() {
  const t = new TexBuilder(512), r = rng(8);
  t.emis = new Float32Array(512 * 512 * 3);
  const lit = []; for (let k = 0; k < 256; k++) lit.push(r() < 0.35 ? [1, 0.75 + r() * 0.2, 0.45 + r() * 0.3] : r() < 0.1 ? [0.5, 0.8, 1] : null);
  t.each((x, y, i, u, v) => {
    const wx = Math.floor(x / 32), wy = Math.floor(y / 32), px = x % 32, py = y % 32;
    const win = px > 6 && px < 26 && py > 8 && py < 26;
    const n = fbm(N1, u * 6, v * 6, 6, 4);
    const c = 0.4 + n * 0.12;
    if (win) {
      const l = lit[(wx * 7 + wy * 13) & 255];
      setA(t, i, 0.08, 0.1, 0.12);
      if (l) { t.emis[i * 3] = l[0] * 0.9; t.emis[i * 3 + 1] = l[1] * 0.9; t.emis[i * 3 + 2] = l[2] * 0.9; }
      t.rough[i] = 0.1; t.metal[i] = 0.5; t.h[i] = -0.5;
    } else { setA(t, i, c, c * 0.98, c * 0.94); t.rough[i] = 0.8; t.h[i] = py === 28 ? 0.6 : 0; }
  });
  return t.finish('facade', { normalStrength: 2 });
}

function leaf() {
  const t = new TexBuilder(256);
  t.alpha = new Float32Array(256 * 256);
  const r = rng(12); const leaves = []; for (let k = 0; k < 26; k++) leaves.push({ x: r() * 256, y: r() * 256, a: r() * Math.PI * 2, s: 18 + r() * 22, g: 0.6 + r() * 0.5 });
  t.each((x, y, i) => { setA(t, i, 0.15, 0.3, 0.1); t.rough[i] = 0.8; });
  for (const L of leaves) {
    const ca = Math.cos(L.a), sa = Math.sin(L.a);
    for (let yy = -L.s; yy <= L.s; yy++) for (let xx = -L.s; xx <= L.s; xx++) {
      const lx = xx * ca + yy * sa, ly = -xx * sa + yy * ca;
      const w = (1 - Math.pow(lx / L.s, 2)) * L.s * 0.35;
      if (Math.abs(ly) < w && Math.abs(lx) < L.s) {
        const X = Math.floor(L.x + xx), Y = Math.floor(L.y + yy); if (X < 0 || Y < 0 || X > 255 || Y > 255) continue;
        const i = Y * 256 + X; t.alpha[i] = 1;
        const vein = Math.abs(ly) < 1 ? 0.7 : 1;
        setA(t, i, 0.12 * L.g * vein, 0.32 * L.g * vein, 0.08 * L.g * vein);
        t.h[i] = 1 - Math.abs(ly) / (w + 0.01);
      }
    }
  }
  return t.finish('leaf', { normalStrength: 1 });
}

function brick() {
  const t = new TexBuilder(512), r = rng(21);
  const tones = []; for (let k = 0; k < 256; k++) tones.push(0.75 + r() * 0.4);
  t.each((x, y, i, u, v) => {
    const row = Math.floor(y / 32), off = (row % 2) * 32, bx = Math.floor((x + off) / 64) % 8, px = (x + off) % 64, py = y % 32;
    const mortar = px < 3 || py < 3;
    const n = fbm(N1, u * 16, v * 16, 16, 3), n2 = fbm(N2, u * 64, v * 64, 64, 2);
    const k = tones[(bx + row * 8) & 255];
    if (mortar) { const c = 0.62 + n * 0.1; setA(t, i, c, c * 0.97, c * 0.92); t.h[i] = -0.8; t.rough[i] = 0.95; }
    else { setA(t, i, (0.55 + n2 * 0.1) * k, (0.3 + n2 * 0.06) * k, (0.22 + n2 * 0.05) * k); t.h[i] = n2 * 0.3; t.rough[i] = 0.85; }
    t.metal[i] = 0;
  });
  return t.finish('brick', { normalStrength: 2.5 });
}
function corrugated() {
  const t = new TexBuilder(512);
  t.each((x, y, i, u, v) => {
    const wave = Math.sin(u * Math.PI * 2 * 16);
    const n = fbm(N1, u * 6, v * 6, 6), n3 = fbm(N3, u * 4, v * 12, 4, 3);
    const streak = Math.max(0, fbm(N2, u * 40, v * 3, 40, 3) - 0.5) * 2;
    const rustAmt = Math.min(1, Math.max(0, (n3 - 0.5) * 3) + streak * 0.6);
    const base = 0.6 + n * 0.1 + wave * 0.04;
    setA(t, i, base + (0.45 - base) * rustAmt, base + (0.24 - base) * rustAmt, base * 0.98 + (0.1 - base) * rustAmt);
    t.h[i] = wave; t.rough[i] = 0.45 + rustAmt * 0.45; t.metal[i] = 0.6 * (1 - rustAmt);
  });
  return t.finish('corrugated', { normalStrength: 3 });
}

export function buildTextures(progress) {
  const list = [['panel', panelMetal], ['rust', rust], ['concrete', concrete], ['grate', grate], ['tiles', tiles], ['wood', wood], ['plaster', plaster], ['fabric', fabric], ['hazard', hazard], ['facade', facade], ['leaf', leaf], ['brick', brick], ['corrugated', corrugated]];
  const out = {};
  list.forEach(([n, f], i) => { out[n] = f(); progress?.((i + 1) / list.length); });
  return out;
}

// Text / neon sign textures --------------------------------------------------
export function signTexture(text, { w = 512, h = 128, bg = null, color = '#ff5a8a', font = '700 72px "Trebuchet MS", sans-serif', glow = true, border = false, sub = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font;
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 18; }
  ctx.fillStyle = color; ctx.fillText(text, w / 2, sub ? h * 0.4 : h / 2);
  if (sub) { ctx.font = font.replace(/\d+px/, m => Math.round(parseInt(m) * 0.38) + 'px'); ctx.fillText(sub, w / 2, h * 0.8); }
  if (border) { ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.strokeRect(8, 8, w - 16, h - 16); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// Paper / poster / note texture with handwriting-ish text
export function paperTexture(lines, { w = 512, h = 512, ink = '#2a2a3a', paper = '#efe6d2', font = 'italic 34px Georgia, serif', title = null } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  ctx.fillStyle = paper; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 3000; i++) { ctx.fillStyle = `rgba(120,100,70,${Math.random() * 0.05})`; ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  ctx.fillStyle = ink; ctx.font = font; ctx.textBaseline = 'top';
  let y = 40;
  if (title) { ctx.font = font.replace(/\d+px/, m => Math.round(parseInt(m) * 1.3) + 'px'); ctx.fillText(title, 36, y); y += 60; ctx.font = font; }
  for (const l of lines) { ctx.fillText(l, 36, y); y += 44; }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Soft radial sprite for particles, light shafts, glows
export function radialTexture(size = 128, stops = [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]) {
  const c = document.createElement('canvas'); c.width = c.height = size; const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
export function gradientTexture(w = 4, h = 256, stops) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, h); stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
