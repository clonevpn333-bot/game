// GETAWAY! — procedural canvas textures (roads, facades, signage, materials)
import * as THREE from 'three';
import { makeRng } from '../core/utils.js';

const cache = new Map();
let maxAniso = 8;
export function setAniso(a) { maxAniso = a; }

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, { repeat = true, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c); if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = maxAniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}
function noiseFill(g, w, h, base, amount, rng, size = 1) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const img = g.getImageData(0, 0, w, h); const d = img.data;
  for (let y = 0; y < h; y += size) for (let x = 0; x < w; x += size) {
    const n = (rng() - 0.5) * amount;
    for (let yy = 0; yy < size; yy++) for (let xx = 0; xx < size; xx++) { const i = ((y + yy) * w + (x + xx)) * 4; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  }
  g.putImageData(img, 0, 0);
}
function speckle(g, w, h, rng, n, colors, rmin = 1, rmax = 3) {
  for (let i = 0; i < n; i++) { g.fillStyle = colors[(rng() * colors.length) | 0]; const r = rmin + rng() * (rmax - rmin); g.globalAlpha = 0.25 + rng() * 0.5; g.beginPath(); g.arc(rng() * w, rng() * h, r, 0, 7); g.fill(); }
  g.globalAlpha = 1;
}
export function getTex(key, fn) { if (!cache.has(key)) cache.set(key, fn()); return cache.get(key); }

// -------- ground --------
export const asphalt = () => getTex('asphalt', () => {
  const [c, g] = canvas(512, 512); const r = makeRng(5); noiseFill(g, 512, 512, '#3b3d40', 26, r, 2);
  speckle(g, 512, 512, r, 900, ['#55585c', '#2a2b2e', '#47494d'], 0.5, 1.6);
  for (let i = 0; i < 6; i++) { g.strokeStyle = 'rgba(20,20,22,0.5)'; g.lineWidth = 1 + r() * 1.5; g.beginPath(); let x = r() * 512, y = r() * 512; g.moveTo(x, y); for (let j = 0; j < 8; j++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 5; i++) { g.fillStyle = 'rgba(30,31,34,0.35)'; g.fillRect(r() * 512, r() * 512, 40 + r() * 90, 30 + r() * 60); }
  return tex(c);
});
// road with markings across its width: u = across (0..1 = full width), v = along (1 tile = 12m)
export const roadMarked = (lanesPerDir = 2, kind = 'city') => getTex('road' + lanesPerDir + kind, () => {
  const W = 512, H = 384; const [c, g] = canvas(W, H); const r = makeRng(9); noiseFill(g, W, H, kind === 'hwy' ? '#38393c' : '#3a3c3f', 24, r, 2);
  speckle(g, W, H, r, 600, ['#55585c', '#2a2b2e'], 0.5, 1.4);
  // tire wear tracks
  const lanes = lanesPerDir * 2; const lw = W / (lanes + 0.5);
  g.fillStyle = 'rgba(25,25,27,0.25)';
  for (let i = 0; i < lanes; i++) { const cx = W * 0.25 / (lanes + 0.5) + lw * (i + 0.5); g.fillRect(cx - lw * 0.32, 0, lw * 0.16, H); g.fillRect(cx + lw * 0.16, 0, lw * 0.16, H); }
  const mid = W / 2; const edge = W * 0.25 / (lanes + 0.5) * 0.5;
  g.fillStyle = '#e9e4d0'; g.fillRect(edge, 0, 5, H); g.fillRect(W - edge - 5, 0, 5, H);
  if (kind === 'hwy') { g.fillStyle = '#e2b434'; g.fillRect(mid - 9, 0, 5, H); g.fillRect(mid + 4, 0, 5, H); }
  else { g.fillStyle = '#e2b434'; g.fillRect(mid - 7, 0, 4, H); g.fillRect(mid + 3, 0, 4, H); }
  g.fillStyle = '#e9e4d0';
  for (let i = 1; i < lanesPerDir; i++) { for (const s of [-1, 1]) { const x = mid + s * lw * i; for (let y = 0; y < H; y += 128) g.fillRect(x - 2.5, y, 5, 64); } }
  return tex(c);
});
export const intersection = () => getTex('isect', () => {
  const W = 512; const [c, g] = canvas(W, W); const r = makeRng(13); noiseFill(g, W, W, '#3a3c3f', 24, r, 2); speckle(g, W, W, r, 700, ['#55585c', '#2a2b2e'], 0.5, 1.4);
  g.fillStyle = 'rgba(235,232,220,0.9)'; const band = 42;
  for (let i = 0; i < 12; i++) { const x = 40 + i * 37; g.fillRect(x, 4, 20, band); g.fillRect(x, W - 4 - band, 20, band); g.fillRect(4, x, band, 20); g.fillRect(W - 4 - band, x, band, 20); }
  g.fillStyle = 'rgba(235,232,220,0.85)'; g.fillRect(band + 10, band + 12, W / 2 - band - 10, 6); g.fillRect(W / 2, W - band - 18, W / 2 - band - 10, 6);
  return tex(c);
});
export const sidewalk = () => getTex('sidewalk', () => {
  const [c, g] = canvas(256, 256); const r = makeRng(17); noiseFill(g, 256, 256, '#a8a39a', 18, r, 2);
  g.strokeStyle = 'rgba(70,66,60,0.45)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 64); g.lineTo(256, i * 64); g.stroke(); g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 256); g.stroke(); }
  speckle(g, 256, 256, r, 120, ['#7d786f', '#c4bfb5'], 1, 3); return tex(c);
});
export const plaza = () => getTex('plaza', () => {
  const [c, g] = canvas(256, 256); const r = makeRng(19); noiseFill(g, 256, 256, '#c9bca6', 14, r, 2);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? 'rgba(120,100,80,0.18)' : 'rgba(255,255,255,0.05)'; g.fillRect(x * 32 + 1, y * 32 + 1, 30, 30); }
  return tex(c);
});
export const grass = () => getTex('grass', () => {
  const [c, g] = canvas(256, 256); const r = makeRng(23); noiseFill(g, 256, 256, '#4f7a35', 30, r, 2);
  speckle(g, 256, 256, r, 600, ['#3e6a2a', '#6c9444', '#5a8a3a'], 0.6, 2.2); return tex(c);
});
export const sand = () => getTex('sand', () => {
  const [c, g] = canvas(256, 256); const r = makeRng(29); noiseFill(g, 256, 256, '#d9c49a', 20, r, 1);
  speckle(g, 256, 256, r, 300, ['#c9b080', '#efdcb4'], 0.5, 1.5); return tex(c);
});
export const concrete = () => getTex('concrete', () => {
  const [c, g] = canvas(256, 256); const r = makeRng(31); noiseFill(g, 256, 256, '#8d8a85', 22, r, 2);
  g.strokeStyle = 'rgba(50,50,50,0.35)'; g.lineWidth = 1.5; g.strokeRect(0, 0, 256, 256); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.stroke();
  for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(60,55,50,0.15)'; g.beginPath(); g.arc(r() * 256, r() * 256, 10 + r() * 30, 0, 7); g.fill(); }
  return tex(c);
});
export const dirt = () => getTex('dirt', () => { const [c, g] = canvas(256, 256); const r = makeRng(37); noiseFill(g, 256, 256, '#7a6248', 30, r, 2); speckle(g, 256, 256, r, 400, ['#5e4a36', '#94795a'], 0.5, 2.5); return tex(c); });
export const rails = () => getTex('rails', () => {
  const [c, g] = canvas(256, 512); const r = makeRng(41); noiseFill(g, 256, 512, '#6a5f55', 30, r, 2); speckle(g, 256, 512, r, 800, ['#4a4440', '#8a8079'], 1, 3);
  for (let y = 0; y < 512; y += 32) { g.fillStyle = '#4b3a2c'; g.fillRect(20, y + 6, 216, 16); }
  g.fillStyle = '#9a9ca0'; g.fillRect(58, 0, 9, 512); g.fillRect(189, 0, 9, 512); g.fillStyle = '#d0d2d6'; g.fillRect(60, 0, 3, 512); g.fillRect(191, 0, 3, 512);
  return tex(c);
});
export const water = () => getTex('waterN', () => {
  const [c, g] = canvas(256, 256); const r = makeRng(43); g.fillStyle = '#8080ff'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 300; i++) { const x = r() * 256, y = r() * 256, rr = 4 + r() * 18; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, `rgba(${110 + r() * 40},${110 + r() * 40},255,0.5)`); gr.addColorStop(1, 'rgba(128,128,255,0)'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  return tex(c, { srgb: false });
});

// -------- facades (color + emissive window maps) --------
// Each facade tile covers `tw` meters horizontally and `th` meters vertically.
export const FACADES = {
  glass: { tw: 12, th: 16, floors: 4, cols: 4 }, office: { tw: 12, th: 14, floors: 4, cols: 4 }, brick: { tw: 10, th: 12, floors: 3, cols: 3 },
  plaster: { tw: 10, th: 12, floors: 3, cols: 3 }, warehouse: { tw: 16, th: 10, floors: 1, cols: 2 }, house: { tw: 8, th: 6, floors: 2, cols: 2 },
  tower: { tw: 12, th: 16, floors: 4, cols: 6 }, deco: { tw: 12, th: 16, floors: 4, cols: 3 }, garage: { tw: 12, th: 9, floors: 3, cols: 3 },
  shop: { tw: 10, th: 5, floors: 1, cols: 2 }, construction: { tw: 12, th: 12, floors: 3, cols: 3 }, bank: { tw: 12, th: 16, floors: 2, cols: 3 },
};
export function facade(style, variant = 0) {
  return getTex('fac_' + style + variant, () => {
    const W = 512, H = 512; const [c, g] = canvas(W, H); const [ce, ge] = canvas(W, H); const [cr, gr] = canvas(W, H); gr.fillStyle = 'rgb(0,225,8)'; gr.fillRect(0, 0, W, H); const win = (x, y, w, h) => { gr.fillStyle = 'rgb(0,28,215)'; gr.fillRect(x, y, w, h); }; const r = makeRng(100 + variant * 7 + style.length * 31);
    const F = FACADES[style]; const fh = H / F.floors, cw = W / F.cols;
    ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
    const lit = () => { const warm = r() < 0.7; return warm ? `rgb(${230 + r() * 25},${190 + r() * 40},${120 + r() * 60})` : `rgb(${170 + r() * 40},${200 + r() * 40},255)`; };
    const tints = {
      glass: ['#2c4a5e', '#355a6b', '#24384a', '#3a5361'], office: ['#b9b4aa', '#9e9a92', '#c8c0b0', '#8f99a0'], brick: ['#8a4b36', '#9b5a3f', '#7a4232', '#a0644a'],
      plaster: ['#e0cfa9', '#d9b48a', '#cfd5c5', '#e6c6b8'], warehouse: ['#7b8287', '#6e7a6b', '#8a7f72', '#5f6b75'], house: ['#e8e2d4', '#c9d6dc', '#e3d0b0', '#d8c2c2'],
      tower: ['#1f2f3d', '#26323a', '#2d3a45', '#1c2a33'], deco: ['#cdbfa3', '#b8a88c', '#d4c8b4', '#a8a090'], garage: ['#9a9893', '#8a8884'], shop: ['#d8d0c0'],
      construction: ['#8d8a85'], bank: ['#d8d2c4'],
    }[style] || ['#999'];
    const base = tints[variant % tints.length];
    noiseFill(g, W, H, base, style === 'glass' || style === 'tower' ? 8 : 20, r, 2);
    if (style === 'brick') { g.strokeStyle = 'rgba(60,30,20,0.35)'; g.lineWidth = 1; for (let y = 0; y < H; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (y / 8) % 2 ? 0 : 8; x < W; x += 16) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 8); g.stroke(); } } }
    if (style === 'warehouse') { for (let x = 0; x < W; x += 8) { g.fillStyle = x % 16 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)'; g.fillRect(x, 0, 4, H); } }
    for (let f = 0; f < F.floors; f++) for (let col = 0; col < F.cols; col++) {
      const x0 = col * cw, y0 = f * fh;
      if (style === 'glass' || style === 'tower') {
        const gd = g.createLinearGradient(0, y0, 0, y0 + fh); gd.addColorStop(0, 'rgba(160,200,230,0.35)'); gd.addColorStop(1, 'rgba(20,40,60,0.2)');
        g.fillStyle = gd; g.fillRect(x0 + 2, y0 + 4, cw - 4, fh - 10); win(x0 + 2, y0 + 4, cw - 4, fh - 10);
        g.fillStyle = 'rgba(15,22,30,0.85)'; g.fillRect(x0, y0 + fh - 7, cw, 7); g.fillRect(x0, y0, 3, fh);
        if (r() < 0.32) { ge.fillStyle = lit(); ge.globalAlpha = 0.5 + r() * 0.5; ge.fillRect(x0 + 3, y0 + 5, cw - 6, fh - 13); ge.globalAlpha = 1; }
      } else if (style === 'warehouse') {
        if (f === 0 && col === 0) { g.fillStyle = '#4b5158'; g.fillRect(x0 + 30, H * 0.35, cw - 60, H * 0.65); g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = H * 0.35; y < H; y += 10) g.fillRect(x0 + 30, y, cw - 60, 2); }
        else { g.fillStyle = '#2b3138'; g.fillRect(x0 + 40, 40, cw - 80, 40); win(x0 + 40, 40, cw - 80, 40); if (r() < 0.4) { ge.fillStyle = lit(); ge.fillRect(x0 + 42, 42, cw - 84, 36); } }
      } else if (style === 'garage') {
        g.fillStyle = 'rgba(20,20,20,0.85)'; g.fillRect(x0 + 6, y0 + fh * 0.3, cw - 12, fh * 0.45); gr.fillStyle = 'rgb(0,200,0)'; gr.fillRect(x0 + 6, y0 + fh * 0.3, cw - 12, fh * 0.45);
        g.fillStyle = '#d8d6d0'; g.fillRect(x0, y0 + fh * 0.75, cw, fh * 0.25);
        ge.fillStyle = 'rgba(255,230,180,0.35)'; ge.fillRect(x0 + 6, y0 + fh * 0.3, cw - 12, 6);
      } else if (style === 'construction') {
        g.fillStyle = 'rgba(30,30,30,0.9)'; g.fillRect(x0 + 6, y0 + 10, cw - 12, fh - 26); g.fillStyle = '#6d6a66'; g.fillRect(x0, y0 + fh - 16, cw, 16);
        g.fillStyle = '#c87b2a'; if (r() < 0.3) g.fillRect(x0 + 10, y0 + fh - 40, 8, 24);
      } else {
        const ww = style === 'house' ? cw * 0.45 : style === 'bank' ? cw * 0.6 : cw * 0.5, wh = style === 'bank' ? fh * 0.7 : fh * 0.52;
        const wx = x0 + (cw - ww) / 2, wy = y0 + fh * 0.2;
        if (style === 'deco' || style === 'bank') { g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x0 + cw / 2 - 4, 0, 8, H); }
        g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(wx - 4, wy - 4, ww + 8, wh + 10);
        const gl = g.createLinearGradient(0, wy, 0, wy + wh); gl.addColorStop(0, '#6b8496'); gl.addColorStop(1, '#2a3640'); g.fillStyle = gl; g.fillRect(wx, wy, ww, wh); win(wx, wy, ww, wh); gr.fillStyle = 'rgb(0,120,60)'; gr.fillRect(wx + ww / 2 - 2, wy, 4, wh); gr.fillRect(wx, wy + wh * 0.45, ww, 3);
        g.fillStyle = 'rgba(255,255,255,0.2)'; g.fillRect(wx, wy, ww, 3);
        g.fillStyle = base; g.globalAlpha = 0.8; g.fillRect(wx + ww / 2 - 2, wy, 4, wh); g.fillRect(wx, wy + wh * 0.45, ww, 3); g.globalAlpha = 1;
        if (style === 'plaster' && r() < 0.6) { g.fillStyle = ['#3d6b4f', '#6b3d3d', '#3d4f6b'][variant % 3]; g.fillRect(wx - 14, wy - 2, 12, wh + 4); g.fillRect(wx + ww + 2, wy - 2, 12, wh + 4); }
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(wx - 6, wy + wh + 4, ww + 12, 5);
        if (r() < (style === 'house' ? 0.5 : 0.38)) { ge.fillStyle = lit(); ge.globalAlpha = 0.6 + r() * 0.4; ge.fillRect(wx, wy, ww, wh); ge.globalAlpha = 1; }
      }
    }
    if (style === 'shop') { win(24, 100, W - 48, H - 110); g.fillStyle = 'rgba(20,24,28,0.9)'; g.fillRect(16, 90, W - 32, H - 90); g.fillStyle = 'rgba(140,170,190,0.25)'; g.fillRect(24, 100, W - 48, H - 110); ge.fillStyle = 'rgb(255,220,160)'; ge.globalAlpha = 0.65; ge.fillRect(24, 100, W - 48, H - 110); ge.globalAlpha = 1; }
    const t = tex(c); const e = tex(ce); const rm = tex(cr, { srgb: false }); return { map: t, emissive: e, rm, tw: F.tw, th: F.th };
  });
}

// -------- signage --------
const SIGN_FONTS = ['900 {s}px "Arial Black", Impact, sans-serif', 'bold italic {s}px Georgia, serif', 'bold {s}px "Trebuchet MS", sans-serif', '900 italic {s}px Impact, sans-serif'];
export function signTexture(text, { bg = '#c0392b', fg = '#fff', font = 0, w = 512, h = 128, border = null, glow = false } = {}) {
  return getTex('sign_' + text + bg + fg + font + w + h, () => {
    const [c, g] = canvas(w, h);
    if (bg === 'transparent') g.clearRect(0, 0, w, h); else { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    if (border) { g.strokeStyle = border; g.lineWidth = h * 0.07; g.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1); }
    let size = h * 0.62; g.font = SIGN_FONTS[font % SIGN_FONTS.length].replace('{s}', size);
    while (g.measureText(text).width > w * 0.9 && size > 8) { size *= 0.92; g.font = SIGN_FONTS[font % SIGN_FONTS.length].replace('{s}', size); }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (glow) { g.shadowColor = fg; g.shadowBlur = h * 0.15; }
    g.fillStyle = fg; g.fillText(text, w / 2, h / 2 + h * 0.03);
    const t = tex(c, { repeat: false }); return t;
  });
}
export function billboardTexture(title, sub, palette) {
  return getTex('bb_' + title, () => {
    const w = 1024, h = 512; const [c, g] = canvas(w, h); const [a, b, d] = palette;
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.08)'; for (let i = 0; i < 12; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 40 + Math.random() * 160, 0, 7); g.fill(); }
    g.fillStyle = d; g.font = '900 italic 150px Impact, "Arial Black", sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    let s = 150; while (g.measureText(title).width > w * 0.88) { s *= 0.92; g.font = `900 italic ${s}px Impact, "Arial Black", sans-serif`; }
    g.shadowColor = 'rgba(0,0,0,0.4)'; g.shadowBlur = 12; g.fillText(title, 50, h * 0.55);
    g.shadowBlur = 0; g.fillStyle = '#fff'; g.font = 'bold 54px "Trebuchet MS", sans-serif'; g.fillText(sub, 56, h * 0.78);
    return tex(c, { repeat: false });
  });
}
export const crackedGlass = () => getTex('crack', () => {
  const [c, g] = canvas(256, 256); g.fillStyle = 'rgba(255,255,255,0)'; g.clearRect(0, 0, 256, 256); const r = makeRng(55);
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.2;
  for (let k = 0; k < 3; k++) { const cx = r() * 256, cy = r() * 256; for (let i = 0; i < 14; i++) { const a = r() * 7; let x = cx, y = cy; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += Math.cos(a + (r() - 0.5)) * 18; y += Math.sin(a + (r() - 0.5)) * 18; g.lineTo(x, y); } g.stroke(); } for (let ring = 1; ring < 4; ring++) { g.beginPath(); g.arc(cx, cy, ring * 14 + r() * 8, 0, 7); g.stroke(); } }
  return tex(c);
});
export const plateTexture = (text) => signTexture(text, { bg: '#f2f2ea', fg: '#1b2a6b', font: 2, w: 256, h: 128, border: '#1b2a6b' });

export function radialGlow(color = '255,220,160') {
  return getTex('glow' + color, () => {
    const [c, g] = canvas(128, 128); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, `rgba(${color},1)`); gr.addColorStop(0.35, `rgba(${color},0.35)`); gr.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return tex(c, { repeat: false });
  });
}
export function softParticle() {
  return getTex('softp', () => {
    const [c, g] = canvas(128, 128); const r = makeRng(77);
    for (let i = 0; i < 18; i++) { const x = 34 + r() * 60, y = 34 + r() * 60, rr = 18 + r() * 30; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
    const gr = g.createRadialGradient(64, 64, 20, 64, 64, 64); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return tex(c, { repeat: false, srgb: false });
  });
}
export function sparkTexture() {
  return getTex('spark', () => { const [c, g] = canvas(64, 64); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.2, 'rgba(255,230,180,0.9)'); gr.addColorStop(1, 'rgba(255,150,50,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return tex(c, { repeat: false }); });
}
export function skidTexture() {
  return getTex('skid', () => { const [c, g] = canvas(64, 256); const r = makeRng(3); for (let y = 0; y < 256; y++) { for (let x = 0; x < 64; x++) { const a = (0.5 + r() * 0.5) * Math.sin((x / 64) * Math.PI); g.fillStyle = `rgba(10,10,10,${a})`; g.fillRect(x, y, 1, 1); } } return tex(c); });
}
export function bulletHoleTexture() {
  return getTex('bhole', () => { const [c, g] = canvas(64, 64); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(10,10,10,1)'); gr.addColorStop(0.25, 'rgba(30,28,25,0.9)'); gr.addColorStop(0.5, 'rgba(60,55,50,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return tex(c, { repeat: false }); });
}
export function scorchTexture() {
  return getTex('scorch', () => { const [c, g] = canvas(256, 256); const r = makeRng(8); for (let i = 0; i < 40; i++) { const x = 128 + (r() - 0.5) * 120, y = 128 + (r() - 0.5) * 120, rr = 20 + r() * 60; const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, 'rgba(5,5,5,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); } return tex(c, { repeat: false }); });
}
