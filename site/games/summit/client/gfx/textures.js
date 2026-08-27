/* Every surface in Summit is generated at load time — no image files ship with
 * the game. Each generator returns a tiling canvas; `normalFromHeight` derives a
 * matching normal map so close-up rock, snow and cloth all catch the light. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { Noise, rng, clamp, lerp } from '../../shared/rng.js';

const SIZE = 512;
const cache = new Map();

function surface(size = SIZE) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return { c, x: c.getContext('2d', { willReadFrequently: true }) };
}

/** Height field -> tangent-space normal map canvas. */
export function normalFromHeight(heightCanvas, strength = 2.4) {
  const s = heightCanvas.width;
  const src = heightCanvas.getContext('2d').getImageData(0, 0, s, s).data;
  const out = surface(s);
  const img = out.x.createImageData(s, s);
  const at = (x, y) => src[((y & (s - 1)) * s + (x & (s - 1))) * 4] / 255;
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = (at(x - 1, y) - at(x + 1, y)) * strength;
      const dy = (at(x, y - 1) - at(x, y + 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * s + x) * 4;
      img.data[i] = ((dx / len) * 0.5 + 0.5) * 255;
      img.data[i + 1] = ((dy / len) * 0.5 + 0.5) * 255;
      img.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  out.x.putImageData(img, 0, 0);
  return out.c;
}

function fieldCanvas(size, fn) {
  const { c, x } = surface(size);
  const img = x.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let px = 0; px < size; px++) {
      const v = fn(px / size, y / size, px, y);
      const i = (y * size + px) * 4;
      if (typeof v === 'number') { const g = clamp(v, 0, 1) * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = g; img.data[i + 3] = 255; }
      else { img.data[i] = clamp(v[0], 0, 1) * 255; img.data[i + 1] = clamp(v[1], 0, 1) * 255; img.data[i + 2] = clamp(v[2], 0, 1) * 255; img.data[i + 3] = (v[3] ?? 1) * 255; }
    }
  }
  x.putImageData(img, 0, 0);
  return c;
}

/* Tiling noise: sample a torus so edges wrap seamlessly. */
function tiling(noise, freq) {
  return (u, v) => {
    const a = u * Math.PI * 2, b = v * Math.PI * 2;
    return noise.fbm(Math.cos(a) * freq + 13.7, Math.sin(a) * freq + Math.cos(b) * freq * 1.7, 5) * 0.5
         + noise.fbm(Math.sin(b) * freq * 1.3 - 8.1, Math.cos(a) * freq * 0.7 + Math.sin(b) * freq, 4) * 0.5;
  };
}

/* ---------------- material generators ---------------- */
const GEN = {
  rock(seed) {
    const n = new Noise(seed), m = new Noise(seed + 7);
    const t = tiling(n, 3.1), t2 = tiling(m, 9.4);
    const height = fieldCanvas(SIZE, (u, v) => 0.5 + t(u, v) * 0.42 + t2(u, v) * 0.16);
    const albedo = fieldCanvas(SIZE, (u, v) => {
      const h = 0.5 + t(u, v) * 0.5, d = t2(u, v);
      const base = 0.30 + h * 0.24 + d * 0.07;
      const warm = 0.020 * Math.sin(h * 9);
      return [base + warm, base * 0.965, base * 0.90 - warm * 0.4];
    });
    return { albedo, height, rough: 0.94, metal: 0.0 };
  },
  snow(seed) {
    const n = new Noise(seed), m = new Noise(seed + 3);
    const t = tiling(n, 2.2), t2 = tiling(m, 13);
    const height = fieldCanvas(SIZE, (u, v) => 0.5 + t(u, v) * 0.30 + t2(u, v) * 0.20);
    const albedo = fieldCanvas(SIZE, (u, v) => {
      const s = 0.86 + t(u, v) * 0.10 + t2(u, v) * 0.06;
      return [s * 0.985, s * 0.995, s];
    });
    return { albedo, height, rough: 0.58, metal: 0.0 };
  },
  sand(seed) {
    const n = new Noise(seed), m = new Noise(seed + 11);
    const t = tiling(n, 5.5), t2 = tiling(m, 22);
    const height = fieldCanvas(SIZE, (u, v) => 0.5 + t(u, v) * 0.22 + t2(u, v) * 0.26);
    const albedo = fieldCanvas(SIZE, (u, v) => {
      const s = 0.66 + t(u, v) * 0.13 + t2(u, v) * 0.09;
      return [s, s * 0.90, s * 0.72];
    });
    return { albedo, height, rough: 0.90, metal: 0.0 };
  },
  jungle(seed) {
    const n = new Noise(seed), m = new Noise(seed + 5);
    const t = tiling(n, 4.2), t2 = tiling(m, 16);
    const height = fieldCanvas(SIZE, (u, v) => 0.5 + t(u, v) * 0.34 + t2(u, v) * 0.22);
    const albedo = fieldCanvas(SIZE, (u, v) => {
      const a = 0.5 + t(u, v) * 0.5, b = 0.5 + t2(u, v) * 0.5;
      return [0.10 + a * 0.13 + b * 0.04, 0.19 + a * 0.24 + b * 0.06, 0.07 + a * 0.09];
    });
    return { albedo, height, rough: 0.92, metal: 0.0 };
  },
  ash(seed) {
    const n = new Noise(seed), m = new Noise(seed + 2);
    const t = tiling(n, 3.6), t2 = tiling(m, 15);
    const height = fieldCanvas(SIZE, (u, v) => 0.5 + t(u, v) * 0.40 + t2(u, v) * 0.18);
    const albedo = fieldCanvas(SIZE, (u, v) => {
      const d = 0.5 + t(u, v) * 0.5, glow = Math.pow(clamp(t2(u, v) * 1.5 + 0.4, 0, 1), 6);
      return [0.13 + d * 0.13 + glow * 0.75, 0.11 + d * 0.10 + glow * 0.22, 0.11 + d * 0.10];
    });
    return { albedo, height, rough: 0.88, metal: 0.0 };
  },
  bark(seed) {
    const n = new Noise(seed);
    const height = fieldCanvas(256, (u, v) => {
      const grooves = Math.abs(Math.sin(u * 34 + n.fbm(u * 4, v * 1.4, 3) * 5));
      return 0.35 + grooves * 0.5 + n.fbm(u * 22, v * 6, 3) * 0.16;
    });
    const albedo = fieldCanvas(256, (u, v) => {
      const g = Math.abs(Math.sin(u * 34 + n.fbm(u * 4, v * 1.4, 3) * 5));
      const b = 0.16 + g * 0.15 + n.fbm(u * 18, v * 5, 3) * 0.07;
      return [b * 1.16, b * 0.94, b * 0.70];
    });
    return { albedo, height, rough: 0.95, metal: 0.0 };
  },
  fabric(seed, hue = 0.06) {
    const n = new Noise(seed);
    const height = fieldCanvas(256, (u, v) => {
      const weave = (Math.sin(u * 180) * Math.sin(v * 180)) * 0.5 + 0.5;
      return 0.42 + weave * 0.36 + n.fbm(u * 26, v * 26, 3) * 0.14;
    });
    const albedo = fieldCanvas(256, (u, v) => {
      const weave = (Math.sin(u * 180) * Math.sin(v * 180)) * 0.5 + 0.5;
      const l = 0.55 + weave * 0.16 + n.fbm(u * 12, v * 12, 3) * 0.16;
      return hsl(hue, 0.42, l * 0.62);
    });
    return { albedo, height, rough: 0.86, metal: 0.0 };
  },
  leather(seed, hue = 0.07) {
    const n = new Noise(seed);
    const height = fieldCanvas(256, (u, v) => 0.5 + n.fbm(u * 30, v * 30, 5) * 0.5);
    const albedo = fieldCanvas(256, (u, v) => {
      const l = 0.42 + n.fbm(u * 14, v * 14, 4) * 0.24;
      return hsl(hue, 0.46, l * 0.5);
    });
    return { albedo, height, rough: 0.62, metal: 0.02 };
  },
  metal(seed, hue = 0.58) {
    const n = new Noise(seed);
    const height = fieldCanvas(256, (u, v) => 0.5 + n.fbm(u * 40, v * 9, 4) * 0.32 + (Math.sin(v * 90) > 0.98 ? 0.3 : 0));
    const albedo = fieldCanvas(256, (u, v) => {
      const l = 0.56 + n.fbm(u * 9, v * 9, 3) * 0.18;
      const grime = Math.pow(clamp(n.fbm(u * 3 + 4, v * 3, 3) + 0.35, 0, 1), 3) * 0.35;
      return hsl(hue, 0.10, l * (1 - grime));
    });
    return { albedo, height, rough: 0.42, metal: 0.85 };
  },
  wood(seed) {
    const n = new Noise(seed);
    const height = fieldCanvas(256, (u, v) => {
      const rings = Math.abs(Math.sin(v * 46 + n.fbm(u * 3, v * 3, 3) * 3));
      return 0.42 + rings * 0.36 + n.fbm(u * 30, v * 8, 3) * 0.14;
    });
    const albedo = fieldCanvas(256, (u, v) => {
      const rings = Math.abs(Math.sin(v * 46 + n.fbm(u * 3, v * 3, 3) * 3));
      const l = 0.36 + rings * 0.18 + n.fbm(u * 12, v * 6, 3) * 0.10;
      return [l * 1.1, l * 0.78, l * 0.48];
    });
    return { albedo, height, rough: 0.90, metal: 0.0 };
  },
  skin(seed, tone = 0) {
    const n = new Noise(seed);
    const TONES = [[0.86, 0.68, 0.56], [0.74, 0.55, 0.42], [0.55, 0.38, 0.28], [0.36, 0.24, 0.18], [0.92, 0.78, 0.68]];
    const t = TONES[tone % TONES.length];
    const height = fieldCanvas(128, (u, v) => 0.5 + n.fbm(u * 40, v * 40, 3) * 0.28);
    const albedo = fieldCanvas(128, (u, v) => {
      const d = n.fbm(u * 16, v * 16, 4) * 0.09;
      return [t[0] + d, t[1] + d * 0.9, t[2] + d * 0.8];
    });
    return { albedo, height, rough: 0.72, metal: 0.0 };
  },
};

function hsl(h, s, l) {
  const f = (n) => { const k = (n + h * 12) % 12; return l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(Math.min(k - 3, 9 - k), 1)); };
  return [f(0), f(8), f(4)];
}

/** Returns {map, normalMap, roughness, metalness} ready for a MeshStandardMaterial. */
export function materialMaps(kind, seed = 1, arg, repeat = 1) {
  const key = `${kind}:${seed}:${arg}:${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const gen = GEN[kind];
  if (!gen) throw new Error('no texture generator: ' + kind);
  const out = gen(seed, arg);
  const map = new THREE.CanvasTexture(out.albedo);
  const normalMap = new THREE.CanvasTexture(normalFromHeight(out.height, kind === 'snow' ? 1.4 : 2.6));
  for (const t of [map, normalMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    t.anisotropy = 8;
  }
  map.colorSpace = THREE.SRGBColorSpace;
  const res = { map, normalMap, roughness: out.rough, metalness: out.metal, heightCanvas: out.height };
  cache.set(key, res);
  return res;
}

/* ---------------- sprite textures ---------------- */
export function softBlob(size = 128, hardness = 0.55, tint = [1, 1, 1]) {
  const { c, x } = surface(size);
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const col = `${Math.round(tint[0] * 255)},${Math.round(tint[1] * 255)},${Math.round(tint[2] * 255)}`;
  g.addColorStop(0, `rgba(${col},1)`);
  g.addColorStop(hardness, `rgba(${col},0.55)`);
  g.addColorStop(1, `rgba(${col},0)`);
  x.fillStyle = g; x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Puffy cloud sprite built from overlapping blobs — reads as volume, costs one quad. */
export function cloudSprite(seed = 1, size = 256) {
  const { c, x } = surface(size);
  const r = rng(seed);
  for (let i = 0; i < 26; i++) {
    const cx = size * (0.5 + (r() - 0.5) * 0.78);
    const cy = size * (0.55 + (r() - 0.5) * 0.44);
    const rad = size * (0.10 + r() * 0.20);
    const g = x.createRadialGradient(cx, cy - rad * 0.25, 0, cx, cy, rad);
    const top = 236 + r() * 19;
    g.addColorStop(0, `rgba(255,255,255,${0.44 + r() * 0.3})`);
    g.addColorStop(0.55, `rgba(${top | 0},${top | 0},${(top + 6) | 0},0.22)`);
    g.addColorStop(1, 'rgba(210,216,228,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill();
  }
  // feather the card edges so overlapping quads never show their boundaries
  const mask = x.createRadialGradient(size / 2, size / 2, size * 0.16, size / 2, size / 2, size * 0.5);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(0.72, 'rgba(0,0,0,1)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  x.globalCompositeOperation = 'destination-in';
  x.fillStyle = mask; x.fillRect(0, 0, size, size);
  x.globalCompositeOperation = 'source-over';
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Leaf / frond card with real alpha silhouette. */
export function leafCard(seed = 1, hue = 0.28, size = 128) {
  const { c, x } = surface(size);
  const r = rng(seed);
  x.clearRect(0, 0, size, size);
  const blades = 7;
  for (let i = 0; i < blades; i++) {
    const t = i / (blades - 1);
    const cx = size * 0.5, base = size * 0.98;
    const tipX = size * (0.5 + (t - 0.5) * 1.5);
    const tipY = size * (0.06 + Math.abs(t - 0.5) * 0.5);
    const w = size * (0.055 + r() * 0.03);
    const l = hsl(hue + (r() - 0.5) * 0.03, 0.5, 0.20 + r() * 0.16);
    x.fillStyle = `rgb(${(l[0] * 255) | 0},${(l[1] * 255) | 0},${(l[2] * 255) | 0})`;
    x.beginPath();
    x.moveTo(cx, base);
    x.quadraticCurveTo(cx + (tipX - cx) * 0.4, base - size * 0.5, tipX, tipY);
    x.quadraticCurveTo(cx + (tipX - cx) * 0.5 + w, base - size * 0.45, cx + w * 0.6, base);
    x.closePath(); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function grassCard(seed = 1, hue = 0.26, size = 64) {
  const { c, x } = surface(size);
  const r = rng(seed);
  for (let i = 0; i < 12; i++) {
    const bx = r() * size, bw = 1.5 + r() * 2.4, hgt = size * (0.45 + r() * 0.5);
    const l = hsl(hue + (r() - 0.5) * 0.04, 0.46, 0.16 + r() * 0.2);
    x.strokeStyle = `rgb(${(l[0] * 255) | 0},${(l[1] * 255) | 0},${(l[2] * 255) | 0})`;
    x.lineWidth = bw; x.lineCap = 'round';
    x.beginPath(); x.moveTo(bx, size);
    x.quadraticCurveTo(bx + (r() - 0.5) * 16, size - hgt * 0.6, bx + (r() - 0.5) * 26, size - hgt);
    x.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function waterNormal(seed = 1, size = 256) {
  const n = new Noise(seed);
  const height = fieldCanvas(size, (u, v) => {
    const a = u * Math.PI * 2, b = v * Math.PI * 2;
    return 0.5 + n.fbm(Math.cos(a) * 3 + Math.cos(b) * 1.7, Math.sin(a) * 3 + Math.sin(b) * 3, 4) * 0.5;
  });
  const t = new THREE.CanvasTexture(normalFromHeight(height, 1.5));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
