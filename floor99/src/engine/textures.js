// Procedural canvas textures (no external image assets needed).
import * as THREE from 'three';
import { BUILD } from '../build.js';

const cache = new Map();
let seed = 1337;
function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
function tex(c, repeat = 1, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// Height canvas -> normal map texture (Sobel)
function normalFromHeight(hc, strength = 2) {
  const w = hc.width, h = hc.height;
  const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const out = canvas(w, h);
  const ctx = out.getContext('2d');
  const img = ctx.createImageData(w, h);
  const H = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength;
    const dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1);
    const i = (y * w + x) * 4;
    img.data[i] = (-dx / l * 0.5 + 0.5) * 255;
    img.data[i + 1] = (dy / l * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / l * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = tex(out, 1, false);
  return t;
}
function noiseFill(ctx, w, h, amount, alpha = 0.08) {
  for (let i = 0; i < amount; i++) {
    const v = rnd() * 255 | 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rnd()})`;
    ctx.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3);
  }
}
function grime(ctx, w, h, n = 30, color = '0,0,0') {
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, r = 10 + rnd() * 80;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${color},${0.08 + rnd() * 0.12})`);
    g.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

// Panelled hull plating: plates with bevel shading, edge gaps, rivets and a vent strip, multiplied by
// the shared paint grain. (Codex v2 panels.)
export function panelTextures(base = '#2b3038', key = 'panel') {
  const ck = 'v2panel' + base + key;
  if (cache.has(ck)) return cache.get(ck);
  const n = BUILD.fast ? 256 : 512, k = n / 512;
  const cv = canvas(n, n), hc = canvas(n, n), rc = canvas(n, n);
  const c = cv.getContext('2d'), h = hc.getContext('2d'), r = rc.getContext('2d');
  c.fillStyle = base; c.fillRect(0, 0, n, n); h.fillStyle = '#808080'; h.fillRect(0, 0, n, n); r.fillStyle = '#c8c8c8'; r.fillRect(0, 0, n, n);
  for (const [px, py, pw, ph] of [[0, 0, 256, 256], [256, 0, 256, 128], [256, 128, 256, 128], [0, 256, 128, 256], [128, 256, 384, 256]]) {
    const x = px * k, y = py * k, w = pw * k, hg = ph * k;
    const g = c.createLinearGradient(x, y, x + w, y + hg);
    g.addColorStop(0, 'rgba(255,255,255,.09)'); g.addColorStop(0.5, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
    c.fillStyle = g; c.fillRect(x + 2 * k, y + 2 * k, w - 4 * k, hg - 4 * k);
    c.strokeStyle = 'rgba(0,0,0,.8)'; c.lineWidth = 2 * k; c.strokeRect(x + k, y + k, w - 2 * k, hg - 2 * k);
    c.strokeStyle = 'rgba(205,220,233,.19)'; c.lineWidth = k; c.strokeRect(x + 4 * k, y + 4 * k, w - 8 * k, hg - 8 * k);
    h.strokeStyle = '#484848'; h.lineWidth = 3 * k; h.strokeRect(x + k, y + k, w - 2 * k, hg - 2 * k);
    h.fillStyle = '#888888'; h.fillRect(x + 4 * k, y + 4 * k, w - 8 * k, hg - 8 * k);
    for (const [sx, sy] of [[x + 12 * k, y + 12 * k], [x + w - 12 * k, y + 12 * k], [x + 12 * k, y + hg - 12 * k], [x + w - 12 * k, y + hg - 12 * k]]) {
      c.fillStyle = 'rgba(0,0,0,.55)'; c.beginPath(); c.arc(sx, sy, 4 * k, 0, 7); c.fill();
      c.fillStyle = '#89939d'; c.beginPath(); c.arc(sx - k * 0.5, sy - k * 0.5, 2 * k, 0, 7); c.fill();
      h.fillStyle = '#bababa'; h.beginPath(); h.arc(sx, sy, 2 * k, 0, 7); h.fill();
    }
  }
  c.globalCompositeOperation = 'multiply'; c.drawImage(detailedSurface('paint').map.image, 0, 0, n, n); c.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 6; i++) { c.fillStyle = '#10151b'; c.fillRect(300 * k, (295 + i * 15) * k, 150 * k, 5 * k); h.fillStyle = '#505050'; h.fillRect(300 * k, (295 + i * 15) * k, 150 * k, 5 * k); }
  const maps = { map: tex(cv), normalMap: normalFromHeight(hc, 0.9), roughnessMap: tex(rc, 1, false) };
  cache.set(ck, maps);
  return maps;
}

// Cached physically-based surface maps (near-white albedo grain, height-derived normals, roughness),
// generated once and shared by every material of that kind; the material colour tints them.
function surfaceNoise(x, y, sd = 0) {
  let n = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263) ^ Math.imul(sd + 7, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
export function detailedSurface(kind) {
  const ck = 'surface:' + kind;
  if (cache.has(ck)) return cache.get(ck);
  const n = BUILD.fast ? 256 : 512;
  const albedo = canvas(n, n), height = canvas(n, n), rough = canvas(n, n);
  const c = albedo.getContext('2d'), h = height.getContext('2d'), r = rough.getContext('2d');
  const px = c.createImageData(n, n), bumps = h.createImageData(n, n), grain = r.createImageData(n, n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const i = (y * n + x) * 4, a = surfaceNoise(x, y), b = surfaceNoise(x >> 4, y >> 4, 9), edge = Math.min(x, y, n - 1 - x, n - 1 - y);
    let v = kind === 'metal' ? 206 : 231, z = 128, ro = kind === 'metal' ? 180 : 220;
    if (kind === 'metal') { v += (a - 0.5) * 8 + (surfaceNoise(0, y, 3) - 0.5) * 12; z += (a - 0.5) * 5; ro += (a - 0.5) * 30 + (b - 0.5) * 18; }
    else if (kind === 'fabric') { const weave = ((x + y) % 4 === 0 ? 1 : 0) - ((x - y + 4 * n) % 4 === 0 ? 1 : 0); v += weave * 8 + (a - 0.5) * 5; z += weave * 8; ro = 235 + (a - 0.5) * 10; }
    else if (kind === 'rubber') { const dot = x % 6 === 2 && y % 6 === 2; v += (a - 0.5) * 9 - (dot ? 12 : 0); z += (dot ? 8 : 0) + (a - 0.5) * 3; ro = 240; }
    else if (kind === 'concrete') { v = 224 + (a - 0.5) * 14 + (b - 0.5) * 16; z += (a - 0.5) * 12 + (b - 0.5) * 5; ro = 240 + (a - 0.5) * 10; }
    else { v += (a - 0.5) * 6 + (b - 0.5) * 4; z += (a - 0.5) * 3; ro += (a - 0.5) * 14; if (edge < 3 && a > 0.62) { v = 180 + a * 35; ro = 145; z = 119; } }
    for (let q = 0; q < 3; q++) { px.data[i + q] = v; bumps.data[i + q] = z; grain.data[i + q] = ro; }
    px.data[i + 3] = bumps.data[i + 3] = grain.data[i + 3] = 255;
  }
  c.putImageData(px, 0, 0); h.putImageData(bumps, 0, 0); r.putImageData(grain, 0, 0);
  if (kind === 'metal' || kind === 'paint') {
    c.strokeStyle = 'rgba(235,241,245,.22)'; h.strokeStyle = '#898989'; r.strokeStyle = '#a0a0a0';
    for (let i = 0; i < (BUILD.fast ? 24 : 55); i++) {
      const x = surfaceNoise(i, 5) * n, y = surfaceNoise(i, 7) * n, len = 3 + surfaceNoise(i, 2) * n * 0.1;
      for (const ctx of [c, h, r]) { ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + (kind === 'metal' ? 0.2 : len * 0.12)); ctx.stroke(); }
    }
  }
  const maps = { map: tex(albedo), normalMap: normalFromHeight(height, kind === 'fabric' ? 1.1 : 0.65), roughnessMap: tex(rough, 1, false) };
  for (const t of Object.values(maps)) t.anisotropy = BUILD.fast ? 2 : 8;
  cache.set(ck, maps);
  return maps;
}

export function hazardTexture(a = '#f5b400', b = '#141414') {
  const k = 'hazard' + a + b;
  if (cache.has(k)) return cache.get(k);
  const S = 256;
  const c = canvas(S, S); const ctx = c.getContext('2d');
  ctx.fillStyle = b; ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = a;
  for (let i = -S; i < S * 2; i += 64) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 32, 0); ctx.lineTo(i + 32 - S, S); ctx.lineTo(i - S, S); ctx.closePath(); ctx.fill();
  }
  noiseFill(ctx, S, S, 3000, 0.2);
  grime(ctx, S, S, 12);
  const t = tex(c);
  cache.set(k, t);
  return t;
}

export function gratingTextures() {
  if (cache.has('grate')) return cache.get('grate');
  const S = 256;
  const c = canvas(S, S), hc = canvas(S, S);
  const ctx = c.getContext('2d'), hx = hc.getContext('2d');
  ctx.fillStyle = '#121418'; ctx.fillRect(0, 0, S, S);
  hx.fillStyle = '#202020'; hx.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 16) for (let x = 0; x < S; x += 32) {
    const off = (y / 16) % 2 ? 16 : 0;
    ctx.fillStyle = '#4a5260'; ctx.fillRect(x + off, y + 2, 26, 4);
    ctx.fillStyle = '#6a7380'; ctx.fillRect(x + off, y + 2, 26, 1);
    hx.fillStyle = '#e0e0e0'; hx.fillRect(x + off, y + 2, 26, 4);
  }
  noiseFill(ctx, S, S, 2000, 0.15);
  const out = { map: tex(c), normalMap: normalFromHeight(hc, 4) };
  cache.set('grate', out);
  return out;
}

export function stageFloorTextures() {
  if (cache.has('stage')) return cache.get('stage');
  const S = 512;
  const c = canvas(S, S), hc = canvas(S, S), ec = canvas(S, S);
  const ctx = c.getContext('2d'), hx = hc.getContext('2d'), ex = ec.getContext('2d');
  ctx.fillStyle = '#0d0f16'; ctx.fillRect(0, 0, S, S);
  hx.fillStyle = '#888'; hx.fillRect(0, 0, S, S);
  ex.fillStyle = '#000'; ex.fillRect(0, 0, S, S);
  const T = 128;
  for (let y = 0; y < S; y += T) for (let x = 0; x < S; x += T) {
    const v = 14 + rnd() * 8;
    ctx.fillStyle = `rgb(${v},${v + 2},${v + 8})`; ctx.fillRect(x + 2, y + 2, T - 4, T - 4);
    hx.fillStyle = '#404040'; hx.fillRect(x, y, T, 3); hx.fillRect(x, y, 3, T);
  }
  ex.strokeStyle = '#ff2fa0'; ex.lineWidth = 2;
  for (let i = 0; i <= S; i += T) { ex.beginPath(); ex.moveTo(i, 0); ex.lineTo(i, S); ex.stroke(); ex.beginPath(); ex.moveTo(0, i); ex.lineTo(S, i); ex.stroke(); }
  noiseFill(ctx, S, S, 4000, 0.06);
  const out = { map: tex(c), normalMap: normalFromHeight(hc, 2), emissiveMap: tex(ec) };
  cache.set('stage', out);
  return out;
}

export function concreteTextures(base = '#5a5c60') {
  const k = 'concrete' + base;
  if (cache.has(k)) return cache.get(k);
  const S = 512;
  const c = canvas(S, S), hc = canvas(S, S);
  const ctx = c.getContext('2d'), hx = hc.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, S, S);
  hx.fillStyle = '#808080'; hx.fillRect(0, 0, S, S);
  noiseFill(ctx, S, S, 30000, 0.15);
  grime(ctx, S, S, 60);
  grime(ctx, S, S, 20, '255,255,255');
  for (let i = 0; i < 2000; i++) { hx.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},0,0,0.1)`; hx.fillRect(rnd() * S, rnd() * S, 2, 2); }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, S, S);
  hx.strokeStyle = '#303030'; hx.lineWidth = 4; hx.strokeRect(0, 0, S, S);
  const out = { map: tex(c), normalMap: normalFromHeight(hc, 1.2) };
  cache.set(k, out);
  return out;
}

export function tileTextures(base = '#d8e4ea', grout = '#7c8a92', tiles = 8) {
  const k = 'tile' + base + grout + tiles;
  if (cache.has(k)) return cache.get(k);
  const S = 512;
  const c = canvas(S, S), hc = canvas(S, S);
  const ctx = c.getContext('2d'), hx = hc.getContext('2d');
  ctx.fillStyle = grout; ctx.fillRect(0, 0, S, S);
  hx.fillStyle = '#202020'; hx.fillRect(0, 0, S, S);
  const T = S / tiles;
  for (let y = 0; y < tiles; y++) for (let x = 0; x < tiles; x++) {
    const col = new THREE.Color(base).offsetHSL(0, 0, (rnd() - 0.5) * 0.06);
    ctx.fillStyle = '#' + col.getHexString();
    ctx.fillRect(x * T + 2, y * T + 2, T - 4, T - 4);
    hx.fillStyle = '#c0c0c0'; hx.fillRect(x * T + 3, y * T + 3, T - 6, T - 6);
  }
  noiseFill(ctx, S, S, 3000, 0.08);
  grime(ctx, S, S, 25);
  const out = { map: tex(c), normalMap: normalFromHeight(hc, 2) };
  cache.set(k, out);
  return out;
}

export function textTexture(lines, opts = {}) {
  const w = opts.w || 1024, h = opts.h || 256;
  const c = canvas(w, h); const ctx = c.getContext('2d');
  ctx.fillStyle = opts.bg || 'rgba(0,0,0,0)'; ctx.fillRect(0, 0, w, h);
  if (opts.border) { ctx.strokeStyle = opts.border; ctx.lineWidth = 10; ctx.strokeRect(8, 8, w - 16, h - 16); }
  const arr = Array.isArray(lines) ? lines : [lines];
  const size = opts.size || h * 0.5 / arr.length;
  ctx.font = `${opts.weight || ''} ${size}px ${opts.font || 'Anton, Impact, sans-serif'}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  arr.forEach((ln, i) => {
    const y = h / 2 + (i - (arr.length - 1) / 2) * size * 1.15;
    if (opts.glow) { ctx.shadowColor = opts.glow; ctx.shadowBlur = 24; }
    ctx.fillStyle = opts.color || '#fff';
    ctx.fillText(ln, w / 2, y);
  });
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

export function logoTexture() {
  if (cache.has('logo')) return cache.get('logo');
  const S = 1024;
  const c = canvas(S, S); const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  ctx.translate(S / 2, S / 2);
  // outer ring
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = ['#ff2d6f', '#ffd400', '#00e5ff'][i];
    ctx.lineWidth = 18 - i * 4;
    ctx.beginPath(); ctx.arc(0, 0, 470 - i * 34, 0, Math.PI * 2); ctx.stroke();
  }
  // tick marks
  ctx.fillStyle = '#ffd400';
  for (let i = 0; i < 99; i++) {
    ctx.save(); ctx.rotate(i / 99 * Math.PI * 2); ctx.fillRect(-3, -440, 6, i % 11 === 0 ? 40 : 18); ctx.restore();
  }
  ctx.font = 'bold 120px Anton, Impact, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('FLOOR', 0, -150);
  ctx.font = '420px Anton, Impact, sans-serif';
  ctx.fillStyle = '#ff2d6f';
  ctx.fillText('99', 0, 70);
  ctx.font = 'bold 54px Anton, Impact, sans-serif';
  ctx.fillStyle = '#ffd400';
  ctx.fillText('THE AUDIENCE WANTS A SHOW', 0, 300);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  cache.set('logo', t);
  return t;
}

export function glowTexture() {
  if (cache.has('glow')) return cache.get('glow');
  const S = 128;
  const c = canvas(S, S); const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.6)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  cache.set('glow', t);
  return t;
}

export function softTexture() {
  if (cache.has('soft')) return cache.get('soft');
  const S = 128;
  const c = canvas(S, S); const ctx = c.getContext('2d');
  // smoky blob with noise
  for (let i = 0; i < 18; i++) {
    const x = S / 2 + (rnd() - 0.5) * 40, y = S / 2 + (rnd() - 0.5) * 40, r = 20 + rnd() * 30;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  }
  const t = new THREE.CanvasTexture(c);
  cache.set('soft', t);
  return t;
}

export function crackTexture() {
  if (cache.has('crack')) return cache.get('crack');
  const S = 512;
  const c = canvas(S, S); const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, S, S);
  ctx.strokeStyle = 'rgba(230,250,255,0.95)';
  const branch = (x, y, a, len, w, d) => {
    if (d > 6 || len < 6) return;
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x, y);
    let cx = x, cy = y;
    const segs = 4 + (rnd() * 4 | 0);
    for (let i = 0; i < segs; i++) { a += (rnd() - 0.5) * 0.7; cx += Math.cos(a) * len / segs; cy += Math.sin(a) * len / segs; ctx.lineTo(cx, cy); }
    ctx.stroke();
    const n = 1 + (rnd() * 2 | 0);
    for (let i = 0; i < n; i++) branch(cx, cy, a + (rnd() - 0.5) * 1.6, len * 0.6, w * 0.7, d + 1);
  };
  for (let i = 0; i < 12; i++) branch(S / 2, S / 2, i / 12 * Math.PI * 2, 120 + rnd() * 120, 3, 0);
  // concentric
  for (let r = 40; r < 220; r += 50 + rnd() * 30) {
    ctx.lineWidth = 1.5; ctx.beginPath();
    for (let a = 0; a < Math.PI * 2; a += 0.3) ctx.lineTo(S / 2 + Math.cos(a) * r * (0.9 + rnd() * 0.2), S / 2 + Math.sin(a) * r * (0.9 + rnd() * 0.2));
    ctx.closePath(); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  cache.set('crack', t);
  return t;
}

export function numberTexture(text, color = '#ffffff', bg = '#ff2d6f') {
  const c = canvas(256, 256); const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 256);
  ctx.font = '180px Anton, Impact, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color; ctx.fillText(text, 128, 140);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function velvetTextures(base = '#5a0f2a') {
  const k = 'velvet' + base;
  if (cache.has(k)) return cache.get(k);
  const S = 256;
  const c = canvas(S, S); const ctx = c.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 8000; i++) { ctx.fillStyle = `rgba(255,255,255,${rnd() * 0.04})`; ctx.fillRect(rnd() * S, rnd() * S, 1, 3); }
  for (let y = 0; y < S; y += 32) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, y, S, 3); }
  const out = { map: tex(c) };
  cache.set(k, out);
  return out;
}

// Quilted suit fabric: tinted by material.color (map is near-white), stitched seams in the normal map.
export function fabricTextures() { return detailedSurface('fabric'); }

export function armorTextures() { return detailedSurface('paint'); }

// ---------------------------------------------------------------- set dressing surfaces (new floors)
function mapsFrom(c, hc, nStrength = 1.4, rough = null) {
  const m = { map: tex(c), normalMap: normalFromHeight(hc, nStrength) };
  if (rough) m.roughnessMap = tex(rough, 1, false);
  for (const t of Object.values(m)) t.anisotropy = BUILD.fast ? 2 : 8;
  return m;
}
// Brick wall with mortar lines, chipped bricks and soot.
export function brickTextures(base = '#7a3b2c', mortar = '#2b2522') {
  const ck = 'brick' + base + mortar; if (cache.has(ck)) return cache.get(ck);
  const S = BUILD.fast ? 256 : 512, k = S / 512, c = canvas(S, S), hc = canvas(S, S), x = c.getContext('2d'), h = hc.getContext('2d');
  x.fillStyle = mortar; x.fillRect(0, 0, S, S); h.fillStyle = '#404040'; h.fillRect(0, 0, S, S);
  const bw = 128 * k, bh = 48 * k, gap = 7 * k;
  const col = new THREE.Color(base);
  for (let row = 0; row * bh < S; row++) for (let i = -1; i * bw < S; i++) {
    const ox = (row % 2) * bw / 2, bx = i * bw + ox + gap / 2, by = row * bh + gap / 2;
    const v = 0.78 + rnd() * 0.32, c2 = col.clone().multiplyScalar(v);
    x.fillStyle = `#${c2.getHexString()}`; x.fillRect(bx, by, bw - gap, bh - gap);
    h.fillStyle = `rgb(${170 + rnd() * 40 | 0},${170 + rnd() * 40 | 0},${170 + rnd() * 40 | 0})`; h.fillRect(bx, by, bw - gap, bh - gap);
    if (rnd() < 0.25) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(bx + rnd() * bw * 0.6, by, bw * 0.3, bh * 0.4); }
  }
  noiseFill(x, S, S, 9000 * k, 0.1); grime(x, S, S, 18);
  const m = mapsFrom(c, hc, 2.2); cache.set(ck, m); return m;
}
// Patterned studio carpet (diamonds + border stripes).
export function carpetTexture(a = '#5a1430', b = '#2a0816', accent = '#d4a53a') {
  const ck = 'carpet' + a + b + accent; if (cache.has(ck)) return cache.get(ck);
  const S = 256, c = canvas(S, S), x = c.getContext('2d');
  x.fillStyle = a; x.fillRect(0, 0, S, S);
  x.fillStyle = b;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const cx = i * 64 + 32, cy = j * 64 + 32; x.beginPath(); x.moveTo(cx, cy - 26); x.lineTo(cx + 26, cy); x.lineTo(cx, cy + 26); x.lineTo(cx - 26, cy); x.fill(); }
  x.strokeStyle = accent; x.lineWidth = 2;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const cx = i * 64 + 32, cy = j * 64 + 32; x.beginPath(); x.moveTo(cx, cy - 12); x.lineTo(cx + 12, cy); x.lineTo(cx, cy + 12); x.lineTo(cx - 12, cy); x.closePath(); x.stroke(); }
  noiseFill(x, S, S, 7000, 0.12);
  const t = tex(c); cache.set(ck, t); return t;
}
// Rows of contestant lockers with numbers and vents.
export function lockerTexture(base = '#2f5a72', first = 1) {
  const ck = 'locker' + base + first; if (cache.has(ck)) return cache.get(ck);
  const W = 512, H = 512, c = canvas(W, H), hc = canvas(W, H), x = c.getContext('2d'), h = hc.getContext('2d');
  x.fillStyle = '#15181c'; x.fillRect(0, 0, W, H); h.fillStyle = '#202020'; h.fillRect(0, 0, W, H);
  for (let i = 0; i < 4; i++) {
    const lx = i * 128 + 4, n = first + i;
    const g = x.createLinearGradient(lx, 0, lx + 120, 0); g.addColorStop(0, base); g.addColorStop(0.5, '#ffffff22'); g.addColorStop(1, base);
    x.fillStyle = base; x.fillRect(lx, 6, 120, H - 12); x.fillStyle = g; x.globalAlpha = 0.35; x.fillRect(lx, 6, 120, H - 12); x.globalAlpha = 1;
    h.fillStyle = '#a0a0a0'; h.fillRect(lx, 6, 120, H - 12);
    for (let v = 0; v < 6; v++) { x.fillStyle = '#0a0c0e'; x.fillRect(lx + 30, 40 + v * 12, 60, 5); h.fillStyle = '#404040'; h.fillRect(lx + 30, 40 + v * 12, 60, 5); }
    x.fillStyle = '#e8e2d0'; x.fillRect(lx + 36, 130, 48, 26); x.fillStyle = '#1a1a1a'; x.font = 'bold 20px "Chakra Petch", monospace'; x.textAlign = 'center'; x.fillText(String(n).padStart(2, '0'), lx + 60, 150);
    x.fillStyle = '#b8bec6'; x.fillRect(lx + 98, 230, 8, 46); h.fillStyle = '#ffffff'; h.fillRect(lx + 98, 230, 8, 46);
    for (let v = 0; v < 6; v++) { x.fillStyle = '#0a0c0e'; x.fillRect(lx + 30, 420 + v * 12, 60, 5); }
  }
  noiseFill(x, W, H, 8000, 0.08); grime(x, W, H, 14);
  const m = mapsFrom(c, hc, 1.6); cache.set(ck, m); return m;
}
// Archive shelving: binders and file boxes with labels.
export function shelfTexture() {
  const ck = 'shelf'; if (cache.has(ck)) return cache.get(ck);
  const W = 512, H = 512, c = canvas(W, H), x = c.getContext('2d');
  x.fillStyle = '#16120e'; x.fillRect(0, 0, W, H);
  const cols = ['#c9b48a', '#a8916a', '#d8cba8', '#7a6a50', '#b0a080', '#4a5a6a', '#6a2a2a'];
  for (let row = 0; row < 4; row++) {
    const y0 = row * 128;
    x.fillStyle = '#3a2c20'; x.fillRect(0, y0 + 116, W, 12);
    let px = 4;
    while (px < W - 10) {
      const w = 18 + rnd() * 40, hh = 70 + rnd() * 40;
      x.fillStyle = cols[(rnd() * cols.length) | 0]; x.fillRect(px, y0 + 116 - hh, w - 2, hh);
      x.fillStyle = 'rgba(255,255,255,.75)'; x.fillRect(px + 3, y0 + 116 - hh + 10, w - 8, 10);
      x.fillStyle = 'rgba(0,0,0,.6)'; x.font = '8px monospace'; x.fillText(String((rnd() * 99) | 0).padStart(2, '0'), px + 4, y0 + 116 - hh + 18);
      px += w;
    }
  }
  grime(x, W, H, 20);
  const t = tex(c); cache.set(ck, t); return t;
}
// Polished wood planks.
export function woodFloorTextures(base = '#6a4426') {
  const ck = 'woodfloor' + base; if (cache.has(ck)) return cache.get(ck);
  const S = BUILD.fast ? 256 : 512, c = canvas(S, S), hc = canvas(S, S), x = c.getContext('2d'), h = hc.getContext('2d');
  const col = new THREE.Color(base), pw = S / 8;
  h.fillStyle = '#808080'; h.fillRect(0, 0, S, S);
  for (let i = 0; i < 8; i++) {
    let y = -rnd() * S;
    while (y < S) {
      const len = S * (0.35 + rnd() * 0.5), c2 = col.clone().multiplyScalar(0.75 + rnd() * 0.4);
      x.fillStyle = `#${c2.getHexString()}`; x.fillRect(i * pw, y, pw, len);
      for (let gl = 0; gl < 10; gl++) { x.strokeStyle = `rgba(0,0,0,${0.05 + rnd() * 0.08})`; x.beginPath(); const gx = i * pw + rnd() * pw; x.moveTo(gx, y); x.bezierCurveTo(gx + 3, y + len * 0.3, gx - 3, y + len * 0.6, gx, y + len); x.stroke(); }
      x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(i * pw, y, pw, 2); h.fillStyle = '#404040'; h.fillRect(i * pw, y, pw, 2);
      y += len;
    }
    x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(i * pw, 0, 2, S); h.fillStyle = '#404040'; h.fillRect(i * pw, 0, 2, S);
  }
  const m = mapsFrom(c, hc, 1.2); cache.set(ck, m); return m;
}
// Checkerboard tiles (game-show floors).
export function checkerTextures(a = '#e8e2d6', b = '#1c1c22', n = 8) {
  const ck = 'checker' + a + b + n; if (cache.has(ck)) return cache.get(ck);
  const S = BUILD.fast ? 256 : 512, c = canvas(S, S), hc = canvas(S, S), x = c.getContext('2d'), h = hc.getContext('2d'), t = S / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? a : b; x.fillRect(i * t, j * t, t, t); h.fillStyle = '#909090'; h.fillRect(i * t + 1, j * t + 1, t - 2, t - 2); }
  noiseFill(x, S, S, 5000, 0.06);
  const m = mapsFrom(c, hc, 1.0); cache.set(ck, m); return m;
}
// Glowing advertising billboard.
export function billboardTexture(title, sub = '', o = {}) {
  const ck = 'bill' + title + sub + (o.bg || '') + (o.color || ''); if (cache.has(ck)) return cache.get(ck);
  const W = 512, H = 256, c = canvas(W, H), x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, o.bg || '#2a0a3a'); g.addColorStop(1, o.bg2 || '#0a0418');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.strokeStyle = o.color || '#ff2d6f'; x.lineWidth = 6; x.strokeRect(8, 8, W - 16, H - 16);
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = o.color || '#ff2d6f'; x.shadowBlur = 18;
  x.fillStyle = o.text || '#ffffff'; x.font = `${o.size || 70}px Anton, Impact, sans-serif`; x.fillText(title, W / 2, sub ? 105 : H / 2);
  if (sub) { x.shadowBlur = 8; x.font = '26px "Chakra Petch", sans-serif'; x.fillStyle = o.subColor || '#ffd400'; x.fillText(sub, W / 2, 180); }
  for (let y = 0; y < H; y += 3) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, y, W, 1); }
  const t = tex(c); cache.set(ck, t); return t;
}
// Server rack faces with LED rows.
export function rackTexture(led = '#25f4ff') {
  const ck = 'rack' + led; if (cache.has(ck)) return cache.get(ck);
  const W = 256, H = 512, c = canvas(W, H), x = c.getContext('2d');
  x.fillStyle = '#0d0f13'; x.fillRect(0, 0, W, H);
  for (let u = 0; u < 20; u++) {
    const y = 8 + u * 25;
    x.fillStyle = '#1c2028'; x.fillRect(10, y, W - 20, 21);
    for (let i = 0; i < 26; i++) { x.fillStyle = '#07080a'; x.fillRect(16 + i * 6, y + 6, 3, 9); }
    for (let i = 0; i < 4; i++) { x.fillStyle = rnd() < 0.7 ? led : '#ff8a1f'; x.globalAlpha = 0.5 + rnd() * 0.5; x.fillRect(W - 60 + i * 10, y + 8, 5, 5); x.globalAlpha = 1; }
  }
  const t = tex(c); cache.set(ck, t); return t;
}
