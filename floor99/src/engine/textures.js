// Procedural canvas textures (no external image assets needed).
import * as THREE from 'three';

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

export function panelTextures(base = '#2b3038', key = 'panel') {
  const k = key + base;
  if (cache.has(k)) return cache.get(k);
  const S = 512;
  const c = canvas(S, S), hc = canvas(S, S);
  const ctx = c.getContext('2d'), hx = hc.getContext('2d');
  ctx.fillStyle = base; ctx.fillRect(0, 0, S, S);
  hx.fillStyle = '#808080'; hx.fillRect(0, 0, S, S);
  noiseFill(ctx, S, S, 6000, 0.12);
  // panels
  const cells = [[0, 0, 256, 256], [256, 0, 256, 128], [256, 128, 256, 128], [0, 256, 128, 256], [128, 256, 384, 256]];
  for (const [x, y, w, h] of cells) {
    const shade = (rnd() - 0.5) * 18;
    ctx.fillStyle = `rgba(${shade > 0 ? 255 : 0},${shade > 0 ? 255 : 0},${shade > 0 ? 255 : 0},${Math.abs(shade) / 255})`;
    ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    // seams
    ctx.strokeStyle = 'rgba(0,0,0,0.65)'; ctx.lineWidth = 4; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.strokeRect(x + 5, y + 5, w - 10, h - 10);
    hx.strokeStyle = '#303030'; hx.lineWidth = 5; hx.strokeRect(x + 2, y + 2, w - 4, h - 4);
    hx.fillStyle = '#8a8a8a'; hx.fillRect(x + 6, y + 6, w - 12, h - 12);
    // rivets
    for (const [rx, ry] of [[x + 12, y + 12], [x + w - 12, y + 12], [x + 12, y + h - 12], [x + w - 12, y + h - 12]]) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.beginPath(); ctx.arc(rx + 1, ry + 1, 4, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(200,210,220,0.35)'; ctx.beginPath(); ctx.arc(rx, ry, 3.5, 0, 7); ctx.fill();
      hx.fillStyle = '#e0e0e0'; hx.beginPath(); hx.arc(rx, ry, 4, 0, 7); hx.fill();
    }
  }
  // vents
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(300, 300 + i * 14, 150, 6);
    hx.fillStyle = '#404040'; hx.fillRect(300, 300 + i * 14, 150, 6);
  }
  grime(ctx, S, S, 40);
  // scratches
  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  for (let i = 0; i < 60; i++) {
    ctx.lineWidth = rnd() * 1.5;
    ctx.beginPath(); const x = rnd() * S, y = rnd() * S; ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 60, y + (rnd() - 0.5) * 20); ctx.stroke();
  }
  const out = { map: tex(c), normalMap: normalFromHeight(hc, 3) };
  cache.set(k, out);
  return out;
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
export function fabricTextures() {
  if (cache.has('fabric')) return cache.get('fabric');
  const S = 256;
  const c = canvas(S, S), hc = canvas(S, S);
  const x = c.getContext('2d'), h = hc.getContext('2d');
  x.fillStyle = '#f2f2f2'; x.fillRect(0, 0, S, S);
  h.fillStyle = '#909090'; h.fillRect(0, 0, S, S);
  // weave
  for (let i = 0; i < S; i += 2) { x.fillStyle = `rgba(0,0,0,${0.02 + rnd() * 0.03})`; x.fillRect(0, i, S, 1); x.fillRect(i, 0, 1, S); }
  // quilt pads: soft pillows between seams
  const P = 64;
  for (let yy = 0; yy < S; yy += P) for (let xx = 0; xx < S; xx += P) {
    const gr = h.createRadialGradient(xx + P / 2, yy + P / 2, 2, xx + P / 2, yy + P / 2, P * 0.7);
    gr.addColorStop(0, '#d0d0d0'); gr.addColorStop(1, '#707070');
    h.fillStyle = gr; h.fillRect(xx, yy, P, P);
    const sh = x.createRadialGradient(xx + P / 2, yy + P / 2, 2, xx + P / 2, yy + P / 2, P * 0.75);
    sh.addColorStop(0, 'rgba(255,255,255,0.08)'); sh.addColorStop(1, 'rgba(0,0,0,0.22)');
    x.fillStyle = sh; x.fillRect(xx, yy, P, P);
  }
  // stitched seams
  for (let i = 0; i <= S; i += P) {
    h.fillStyle = '#303030'; h.fillRect(i - 2, 0, 4, S); h.fillRect(0, i - 2, S, 4);
    for (let k = 0; k < S; k += 8) { x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(i - 1, k, 2, 5); x.fillRect(k, i - 1, 5, 2); }
  }
  noiseFill(x, S, S, 2500, 0.06);
  const out = { map: tex(c, 5), normalMap: normalFromHeight(hc, 3.5) };
  out.normalMap.repeat.set(5, 5);
  cache.set('fabric', out);
  return out;
}

// Worn armor plating: painted base (tinted by material.color) with chipped edges, scratches, rivets.
export function armorTextures() {
  if (cache.has('armor')) return cache.get('armor');
  const S = 256;
  const c = canvas(S, S), hc = canvas(S, S), rc = canvas(S, S);
  const x = c.getContext('2d'), h = hc.getContext('2d'), r = rc.getContext('2d');
  x.fillStyle = '#e8e8e8'; x.fillRect(0, 0, S, S);
  h.fillStyle = '#808080'; h.fillRect(0, 0, S, S);
  r.fillStyle = '#707070'; r.fillRect(0, 0, S, S); // roughness (G channel used)
  // panel border bevel + chipped bare-metal edges
  h.strokeStyle = '#e0e0e0'; h.lineWidth = 10; h.strokeRect(5, 5, S - 10, S - 10);
  h.strokeStyle = '#404040'; h.lineWidth = 3; h.strokeRect(13, 13, S - 26, S - 26);
  for (let i = 0; i < 70; i++) {
    const side = (rnd() * 4) | 0, t = rnd() * S, w = 3 + rnd() * 14;
    const px = side === 0 ? t : side === 1 ? t : side === 2 ? rnd() * 10 : S - rnd() * 10;
    const py = side === 0 ? rnd() * 10 : side === 1 ? S - rnd() * 10 : t;
    x.fillStyle = `rgba(${200 + rnd() * 40},${200 + rnd() * 40},${210 + rnd() * 40},0.9)`; // bare metal shows through
    x.beginPath(); x.ellipse(px, py, w, w * 0.45, rnd() * 3, 0, 7); x.fill();
    r.fillStyle = '#303030'; r.beginPath(); r.ellipse(px, py, w, w * 0.45, 0, 0, 7); r.fill();
  }
  // scratches
  for (let i = 0; i < 40; i++) {
    const sx = rnd() * S, sy = rnd() * S, l = 10 + rnd() * 50, a = rnd() * 6.28;
    x.strokeStyle = `rgba(255,255,255,${0.15 + rnd() * 0.25})`; x.lineWidth = 0.6 + rnd();
    x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); x.stroke();
    h.strokeStyle = '#606060'; h.lineWidth = 1; h.beginPath(); h.moveTo(sx, sy); h.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l); h.stroke();
  }
  // rivets in the corners
  for (const [px, py] of [[22, 22], [S - 22, 22], [22, S - 22], [S - 22, S - 22]]) {
    const gr = h.createRadialGradient(px, py, 0, px, py, 6); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#808080');
    h.fillStyle = gr; h.beginPath(); h.arc(px, py, 6, 0, 7); h.fill();
    x.fillStyle = 'rgba(40,40,40,0.5)'; x.beginPath(); x.arc(px + 1, py + 1, 5, 0, 7); x.fill();
  }
  grime(x, S, S, 18);
  const out = { map: tex(c), normalMap: normalFromHeight(hc, 2.5), roughnessMap: tex(rc, 1, false) };
  cache.set('armor', out);
  return out;
}
