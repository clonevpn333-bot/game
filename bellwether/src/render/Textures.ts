import * as THREE from 'three';
import { rng } from './Globals';

type Ctx = CanvasRenderingContext2D;
const cache = new Map<string, THREE.Texture>();
let maxAniso = 8;
export function setMaxAnisotropy(n: number): void {
  maxAniso = n;
}

export function canvasTexture(key: string, w: number, h: number, draw: (c: Ctx, w: number, h: number) => void, opts: { repeat?: boolean; srgb?: boolean; mip?: boolean } = {}): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit as THREE.CanvasTexture;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  draw(c, w, h);
  const t = new THREE.CanvasTexture(cv);
  if (opts.repeat !== false) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
  }
  t.colorSpace = opts.srgb === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  t.generateMipmaps = opts.mip !== false;
  cache.set(key, t);
  return t;
}

// ------------------------------------------------------------------ noise
function makeNoise(seed: number) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
    vals[i] = r();
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = perm[i];
    perm[i] = perm[j];
    perm[j] = t;
  }
  for (let i = 0; i < 256; i++) perm[256 + i] = perm[i];
  const v = (x: number, y: number, wrap: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X0 = ((xi % wrap) + wrap) % wrap;
    const Y0 = ((yi % wrap) + wrap) % wrap;
    const X1 = (X0 + 1) % wrap;
    const Y1 = (Y0 + 1) % wrap;
    const a = vals[perm[(X0 & 255) + perm[Y0 & 255]]];
    const b = vals[perm[(X1 & 255) + perm[Y0 & 255]]];
    const c = vals[perm[(X0 & 255) + perm[Y1 & 255]]];
    const d = vals[perm[(X1 & 255) + perm[Y1 & 255]]];
    const u = xf * xf * (3 - 2 * xf);
    const w = yf * yf * (3 - 2 * yf);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
  /** tileable fbm in [0,1] over unit square, base freq f */
  return (x: number, y: number, f: number, oct = 4) => {
    let amp = 0.5;
    let sum = 0;
    let norm = 0;
    let freq = f;
    for (let o = 0; o < oct; o++) {
      sum += v(x * freq, y * freq, freq) * amp;
      norm += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return sum / norm;
  };
}
const fbm = makeNoise(7);

function pixelMap(w: number, h: number, fn: (u: number, v: number, i: number) => [number, number, number]): ImageData {
  const id = new ImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const [r, g, b] = fn(x / w, y / h, i);
      id.data[i] = r;
      id.data[i + 1] = g;
      id.data[i + 2] = b;
      id.data[i + 3] = 255;
    }
  }
  return id;
}

// ------------------------------------------------------------------ surfaces
/** Wet asphalt: albedo, roughness (puddles low), normal-ish bump. */
export function asphalt() {
  const S = 512;
  const puddle = new Float32Array(S * S);
  const grain = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const u = x / S;
      const v = y / S;
      puddle[y * S + x] = fbm(u, v, 3, 4);
      grain[y * S + x] = fbm(u, v, 64, 2);
    }
  }
  const map = canvasTexture('asphalt-map', S, S, (c) => {
    c.putImageData(pixelMap(S, S, (u, v, i) => {
      const k = i / 4;
      const p = puddle[k];
      const g = grain[k];
      const n = Math.random() * 18;
      let base = 34 + g * 26 + n;
      if (p > 0.58) base *= 0.75;
      const crack = fbm(u, v, 9, 3);
      if (Math.abs(crack - 0.5) < 0.006) base *= 0.5;
      return [base * 0.95, base, base * 1.06];
    }), 0, 0);
  });
  const rough = canvasTexture('asphalt-rough', S, S, (c) => {
    c.putImageData(pixelMap(S, S, (_u, _v, i) => {
      const k = i / 4;
      const p = puddle[k];
      const wet = THREE.MathUtils.smoothstep(p, 0.5, 0.62);
      const r = 200 - wet * 185 + grain[k] * 40 - 20;
      return [r, r, r];
    }), 0, 0);
  }, { srgb: false });
  const bump = canvasTexture('asphalt-bump', S, S, (c) => {
    c.putImageData(pixelMap(S, S, (_u, _v, i) => {
      const k = i / 4;
      const p = puddle[k];
      const flat = THREE.MathUtils.smoothstep(p, 0.52, 0.6);
      const b = (grain[k] * 255 + (Math.random() * 60 - 30)) * (1 - flat) + 128 * flat;
      return [b, b, b];
    }), 0, 0);
  }, { srgb: false });
  return { map, rough, bump };
}

export function concreteTiles(key = 'sidewalk', tile = 4, tint = [120, 118, 112]) {
  const S = 512;
  const map = canvasTexture(key + '-map', S, S, (c) => {
    c.putImageData(pixelMap(S, S, (u, v) => {
      const n = fbm(u, v, 8, 4);
      const g = fbm(u, v, 48, 2);
      const fx = (u * tile) % 1;
      const fy = (v * tile) % 1;
      const seam = fx < 0.012 || fy < 0.012 ? 0.55 : 1;
      const stain = fbm(u + 0.3, v, 3, 3) > 0.6 ? 0.82 : 1;
      const k = (0.75 + n * 0.35 + g * 0.15) * seam * stain;
      return [tint[0] * k, tint[1] * k, tint[2] * k];
    }), 0, 0);
  });
  const rough = canvasTexture(key + '-rough', S, S, (c) => {
    c.putImageData(pixelMap(S, S, (u, v) => {
      const p = fbm(u + 0.3, v, 3, 3);
      const r = p > 0.6 ? 70 : 190 + fbm(u, v, 30, 2) * 50;
      return [r, r, r];
    }), 0, 0);
  }, { srgb: false });
  return { map, rough };
}

export function tiles(key: string, colA: string, colB: string, n = 8, grout = '#2a2a2a', checker = true, glossy = true) {
  const S = 512;
  const map = canvasTexture(key, S, S, (c) => {
    const s = S / n;
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        c.fillStyle = checker && (x + y) % 2 ? colB : colA;
        c.fillRect(x * s, y * s, s, s);
        // subtle per-tile variation + grime
        c.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
        c.fillRect(x * s, y * s, s, s);
      }
    }
    c.strokeStyle = grout;
    c.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      c.beginPath();
      c.moveTo(i * s, 0);
      c.lineTo(i * s, S);
      c.stroke();
      c.beginPath();
      c.moveTo(0, i * s);
      c.lineTo(S, i * s);
      c.stroke();
    }
    // grime gradient blotches
    for (let i = 0; i < 40; i++) {
      const g = c.createRadialGradient(Math.random() * S, Math.random() * S, 0, Math.random() * S, Math.random() * S, 30 + Math.random() * 80);
      g.addColorStop(0, 'rgba(40,30,20,0.12)');
      g.addColorStop(1, 'rgba(40,30,20,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, S, S);
    }
  });
  const rough = canvasTexture(key + '-r', 256, 256, (c) => {
    c.fillStyle = glossy ? '#3a3a3a' : '#a0a0a0';
    c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#e0e0e0';
    c.lineWidth = 2;
    const s = 256 / n;
    for (let i = 0; i <= n; i++) {
      c.beginPath();
      c.moveTo(i * s, 0);
      c.lineTo(i * s, 256);
      c.stroke();
      c.beginPath();
      c.moveTo(0, i * s);
      c.lineTo(256, i * s);
      c.stroke();
    }
  }, { srgb: false });
  return { map, rough };
}

export function brick(key = 'brick', base = [110, 52, 40]) {
  return canvasTexture(key, 512, 512, (c, w, h) => {
    c.fillStyle = '#4a4440';
    c.fillRect(0, 0, w, h);
    const bw = 64;
    const bh = 22;
    for (let y = 0; y < h / bh; y++) {
      for (let x = -1; x < w / bw + 1; x++) {
        const off = y % 2 ? bw / 2 : 0;
        const k = 0.7 + Math.random() * 0.45;
        c.fillStyle = `rgb(${base[0] * k},${base[1] * k},${base[2] * k})`;
        c.fillRect(x * bw + off + 2, y * bh + 2, bw - 4, bh - 4);
      }
    }
    // soot streaks
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * w;
      const g = c.createLinearGradient(x, 0, x, h);
      g.addColorStop(0, 'rgba(0,0,0,0.25)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(x, 0, 6 + Math.random() * 20, h * Math.random());
    }
  });
}

export function plaster(key: string, col: string, stripes = false) {
  return canvasTexture(key, 512, 512, (c, w, h) => {
    c.fillStyle = col;
    c.fillRect(0, 0, w, h);
    const id = c.getImageData(0, 0, w, h);
    for (let i = 0; i < id.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 10;
      id.data[i] += n;
      id.data[i + 1] += n;
      id.data[i + 2] += n;
    }
    c.putImageData(id, 0, 0);
    if (stripes) {
      for (let x = 0; x < w; x += 32) {
        c.fillStyle = 'rgba(255,255,255,0.05)';
        c.fillRect(x, 0, 14, h);
      }
    }
    for (let i = 0; i < 12; i++) {
      const g = c.createRadialGradient(Math.random() * w, Math.random() * h, 0, Math.random() * w, Math.random() * h, 60 + Math.random() * 120);
      g.addColorStop(0, 'rgba(60,50,30,0.10)');
      g.addColorStop(1, 'rgba(60,50,30,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
    // baseboard grime
    const gb = c.createLinearGradient(0, h, 0, h * 0.85);
    gb.addColorStop(0, 'rgba(0,0,0,0.25)');
    gb.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gb;
    c.fillRect(0, h * 0.85, w, h * 0.15);
  });
}

export function wood(key = 'wood', col = [120, 82, 50], planks = 6) {
  return canvasTexture(key, 512, 512, (c, w, h) => {
    const ph = h / planks;
    for (let p = 0; p < planks; p++) {
      const k = 0.8 + Math.random() * 0.35;
      c.fillStyle = `rgb(${col[0] * k},${col[1] * k},${col[2] * k})`;
      c.fillRect(0, p * ph, w, ph);
      for (let i = 0; i < 40; i++) {
        c.strokeStyle = `rgba(30,15,5,${Math.random() * 0.18})`;
        c.lineWidth = 1 + Math.random() * 2;
        c.beginPath();
        const y = p * ph + Math.random() * ph;
        c.moveTo(0, y);
        c.bezierCurveTo(w * 0.3, y + Math.random() * 6 - 3, w * 0.6, y + Math.random() * 6 - 3, w, y + Math.random() * 4 - 2);
        c.stroke();
      }
      c.fillStyle = 'rgba(0,0,0,0.5)';
      c.fillRect(0, p * ph, w, 2);
      const seam = Math.random() * w;
      c.fillRect(seam, p * ph, 2, ph);
    }
  });
}

export function carpet(key: string, col: string, pattern = true) {
  return canvasTexture(key, 256, 256, (c, w, h) => {
    c.fillStyle = col;
    c.fillRect(0, 0, w, h);
    const id = c.getImageData(0, 0, w, h);
    for (let i = 0; i < id.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 30;
      id.data[i] += n;
      id.data[i + 1] += n;
      id.data[i + 2] += n;
    }
    c.putImageData(id, 0, 0);
    if (pattern) {
      c.strokeStyle = 'rgba(255,255,255,0.06)';
      c.lineWidth = 3;
      for (let i = 0; i < 8; i++) {
        c.strokeRect(i * 32 + 8, 8, 16, 240);
      }
    }
  });
}

export function metalPanel(key = 'metal', col = '#5a6068') {
  return canvasTexture(key, 256, 256, (c, w, h) => {
    c.fillStyle = col;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 600; i++) {
      c.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`;
      c.fillRect(Math.random() * w, Math.random() * h, Math.random() * 40, 1);
    }
    c.strokeStyle = 'rgba(0,0,0,0.5)';
    c.lineWidth = 2;
    c.strokeRect(1, 1, w - 2, h - 2);
    c.fillStyle = 'rgba(0,0,0,0.5)';
    for (const [x, y] of [[8, 8], [w - 8, 8], [8, h - 8], [w - 8, h - 8]]) {
      c.beginPath();
      c.arc(x, y, 3, 0, Math.PI * 2);
      c.fill();
    }
    for (let i = 0; i < 6; i++) {
      const g = c.createRadialGradient(Math.random() * w, Math.random() * h, 0, Math.random() * w, Math.random() * h, 40);
      g.addColorStop(0, 'rgba(90,50,20,0.25)');
      g.addColorStop(1, 'rgba(90,50,20,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
  });
}

// ------------------------------------------------------------------ facades
export type FacadeStyle = 'office' | 'apartment' | 'brick' | 'concrete' | 'hospital';
/**
 * Facade texture: 8 cols x 8 floors, plus emissive map with randomly lit windows.
 */
export function facade(style: FacadeStyle, seed: number) {
  const key = `facade-${style}-${seed}`;
  const cols = 8;
  const rows = 8;
  const W = 512;
  const H = 512;
  const r = rng(seed);
  const lit: number[] = [];
  const warm: number[] = [];
  for (let i = 0; i < cols * rows; i++) {
    lit.push(r() < (style === 'office' ? 0.42 : 0.33) ? 1 : 0);
    warm.push(r());
  }
  const cw = W / cols;
  const rh = H / rows;
  const winRect = (x: number, y: number): [number, number, number, number] => {
    switch (style) {
      case 'office': return [x * cw + 2, y * rh + 6, cw - 4, rh - 14];
      case 'apartment': return [x * cw + 14, y * rh + 14, cw - 28, rh - 26];
      case 'brick': return [x * cw + 16, y * rh + 10, cw - 32, rh - 22];
      case 'hospital': return [x * cw + 6, y * rh + 18, cw - 12, rh - 34];
      default: return [x * cw + 8, y * rh + 16, cw - 16, rh - 30];
    }
  };
  const map = canvasTexture(key + '-map', W, H, (c) => {
    const wallCol = style === 'office' ? '#262c33' : style === 'apartment' ? '#8a7d6c' : style === 'brick' ? '#6e3a2c' : style === 'hospital' ? '#b9b8b0' : '#706d68';
    c.fillStyle = wallCol;
    c.fillRect(0, 0, W, H);
    if (style === 'brick') {
      for (let y = 0; y < H; y += 8) {
        for (let x = (y / 8) % 2 ? 0 : 10; x < W; x += 20) {
          const k = 0.75 + r() * 0.4;
          c.fillStyle = `rgb(${110 * k},${55 * k},${42 * k})`;
          c.fillRect(x, y, 18, 6);
        }
      }
    }
    // noise grime
    for (let i = 0; i < 2500; i++) {
      c.fillStyle = `rgba(0,0,0,${r() * 0.06})`;
      c.fillRect(r() * W, r() * H, 2 + r() * 6, 2 + r() * 6);
    }
    for (let y = 0; y < rows; y++) {
      // floor bands
      if (style !== 'office') {
        c.fillStyle = 'rgba(0,0,0,0.18)';
        c.fillRect(0, y * rh + rh - 6, W, 4);
      } else {
        c.fillStyle = '#3c444d';
        c.fillRect(0, y * rh, W, 6);
      }
      for (let x = 0; x < cols; x++) {
        const [wx, wy, ww, wh] = winRect(x, y);
        // sill / frame
        c.fillStyle = style === 'office' ? '#4b545e' : 'rgba(30,25,20,0.9)';
        c.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
        const g = c.createLinearGradient(wx, wy, wx + ww, wy + wh);
        g.addColorStop(0, '#1b232c');
        g.addColorStop(1, '#0a0e13');
        c.fillStyle = g;
        c.fillRect(wx, wy, ww, wh);
        if (style !== 'office') {
          c.fillStyle = 'rgba(120,110,95,0.85)';
          c.fillRect(wx - 4, wy + wh + 2, ww + 8, 4);
          c.fillStyle = 'rgba(40,36,30,0.9)';
          c.fillRect(wx + ww / 2 - 1, wy, 2, wh);
        }
        // curtains / blinds silhouette on some
        const i = y * cols + x;
        if (lit[i] && warm[i] > 0.5) {
          c.fillStyle = 'rgba(60,50,40,0.5)';
          c.fillRect(wx, wy, ww * 0.25, wh);
        }
      }
      if (style === 'office') {
        for (let x = 0; x <= cols; x++) {
          c.fillStyle = '#4b545e';
          c.fillRect(x * cw - 2, y * rh, 4, rh);
        }
      }
    }
  });
  const emissive = canvasTexture(key + '-emi', W / 2, H / 2, (c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, W, H);
    c.scale(0.5, 0.5);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x;
        if (!lit[i]) continue;
        const [wx, wy, ww, wh] = winRect(x, y);
        const w = warm[i];
        const col = w > 0.75 ? [255, 200, 130] : w > 0.4 ? [255, 228, 180] : w > 0.15 ? [180, 210, 255] : [120, 200, 255];
        const k = 0.45 + r() * 0.55;
        const g = c.createLinearGradient(wx, wy, wx, wy + wh);
        g.addColorStop(0, `rgb(${col[0] * k * 0.8},${col[1] * k * 0.8},${col[2] * k * 0.8})`);
        g.addColorStop(1, `rgb(${col[0] * k},${col[1] * k},${col[2] * k})`);
        c.fillStyle = g;
        c.fillRect(wx, wy, ww, wh);
        if (style !== 'office') {
          c.fillStyle = 'rgba(0,0,0,0.9)';
          c.fillRect(wx + ww / 2 - 1, wy, 2, wh);
        }
        if (w > 0.5) {
          c.fillStyle = 'rgba(0,0,0,0.55)';
          c.fillRect(wx, wy, ww * 0.25, wh);
        }
        // TV flicker glow / silhouettes occasionally
        if (r() < 0.12) {
          c.fillStyle = 'rgba(0,0,0,0.8)';
          c.fillRect(wx + ww * 0.55, wy + wh * 0.4, ww * 0.18, wh * 0.6);
        }
      }
    }
  }, { srgb: true });
  return { map, emissive, cols, rows };
}

// ------------------------------------------------------------------ signs & graphics
export function signTexture(text: string, opts: { w?: number; h?: number; bg?: string; fg?: string; font?: string; glow?: string; border?: string; sub?: string } = {}) {
  const w = opts.w ?? 512;
  const h = opts.h ?? 128;
  return canvasTexture(`sign-${text}-${opts.bg}-${opts.fg}-${opts.sub}-${w}x${h}`, w, h, (c) => {
    c.fillStyle = opts.bg ?? '#000000';
    c.fillRect(0, 0, w, h);
    if (opts.border) {
      c.strokeStyle = opts.border;
      c.lineWidth = Math.max(4, h * 0.05);
      c.strokeRect(c.lineWidth, c.lineWidth, w - c.lineWidth * 2, h - c.lineWidth * 2);
    }
    c.font = opts.font ?? `700 ${Math.floor(h * (opts.sub ? 0.46 : 0.62))}px "Barlow Condensed", "Arial Narrow", Arial, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    if (opts.glow) {
      c.shadowColor = opts.glow;
      c.shadowBlur = h * 0.15;
    }
    c.fillStyle = opts.fg ?? '#ffffff';
    c.fillText(text, w / 2, opts.sub ? h * 0.4 : h / 2, w * 0.92);
    if (opts.sub) {
      c.font = `500 ${Math.floor(h * 0.2)}px "Barlow", Arial, sans-serif`;
      c.fillText(opts.sub, w / 2, h * 0.78, w * 0.9);
    }
  }, { repeat: false });
}

/** "MISSING" poster for Ellie and other citizens. */
export function missingPoster(name: string, age: string, seed: number, ellie = false) {
  return canvasTexture(`poster-${name}-${seed}`, 256, 340, (c, w, h) => {
    const r = rng(seed);
    c.fillStyle = '#e8e2d4';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#b01818';
    c.font = '800 46px "Barlow Condensed", Arial, sans-serif';
    c.textAlign = 'center';
    c.fillText('MISSING', w / 2, 50);
    // portrait
    c.fillStyle = '#9a9488';
    c.fillRect(38, 66, w - 76, 160);
    const skin = ellie ? '#e3b996' : `rgb(${170 + r() * 60},${130 + r() * 50},${100 + r() * 40})`;
    c.fillStyle = ellie ? '#5b3a24' : '#2e2622';
    c.beginPath();
    c.ellipse(w / 2, 140, 44, 52, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = skin;
    c.beginPath();
    c.ellipse(w / 2, 150, 34, 42, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = ellie ? '#e8c219' : '#3a4a5a';
    c.fillRect(70, 196, w - 140, 30);
    c.fillStyle = '#222';
    c.beginPath();
    c.arc(w / 2 - 12, 146, 3, 0, Math.PI * 2);
    c.arc(w / 2 + 12, 146, 3, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#111';
    c.font = '700 24px "Barlow Condensed", Arial, sans-serif';
    c.fillText(name.toUpperCase(), w / 2, 256);
    c.font = '500 15px Arial, sans-serif';
    c.fillText(`AGE ${age} · LAST SEEN 2:17 AM`, w / 2, 280);
    c.font = '13px Arial, sans-serif';
    c.fillText('BELLWETHER, OCT 14', w / 2, 302);
    c.fillText('PLEASE CALL (555) 0142', w / 2, 322);
    // wear
    for (let i = 0; i < 20; i++) {
      c.fillStyle = `rgba(120,100,60,${r() * 0.12})`;
      c.fillRect(r() * w, r() * h, r() * 50, r() * 50);
    }
  }, { repeat: false });
}

/** Family photo (stylised figures in a frame). */
export function familyPhoto(kind: 'family' | 'siblings' | 'ellie' | 'parents' | 'beach' | 'school', seed = 1) {
  return canvasTexture(`photo-${kind}-${seed}`, 256, 200, (c, w, h) => {
    const r = rng(seed + 11);
    const sky = kind === 'beach' ? ['#8fc3e6', '#f2d9a6'] : kind === 'school' ? ['#5a6c86', '#3a4558'] : ['#c9b08a', '#7d6447'];
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, sky[0]);
    g.addColorStop(1, sky[1]);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const people: [number, number, string, string][] =
      kind === 'family' ? [[0.25, 1, '#3c4f6e', '#3a2a1e'], [0.45, 0.95, '#8a3b3b', '#5b3a24'], [0.62, 0.62, '#2f6a3f', '#3a2a1e'], [0.76, 0.5, '#e8c219', '#5b3a24']]
        : kind === 'siblings' ? [[0.38, 0.66, '#2f6a3f', '#3a2a1e'], [0.6, 0.48, '#e8c219', '#5b3a24']]
          : kind === 'ellie' ? [[0.5, 0.75, '#e8c219', '#5b3a24']]
            : kind === 'parents' ? [[0.38, 1, '#3c4f6e', '#3a2a1e'], [0.6, 0.95, '#8a3b3b', '#5b3a24']]
              : kind === 'school' ? [[0.5, 0.8, '#2f6a3f', '#3a2a1e']]
                : [[0.3, 0.9, '#3c4f6e', '#3a2a1e'], [0.5, 0.6, '#2f6a3f', '#3a2a1e'], [0.68, 0.45, '#e8c219', '#5b3a24']];
    for (const [x, s, shirt, hair] of people) {
      const cx = x * w;
      const base = h * 0.98;
      const H = h * 0.75 * s;
      c.fillStyle = shirt;
      c.beginPath();
      c.ellipse(cx, base - H * 0.3, H * 0.2, H * 0.36, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#d9a982';
      c.beginPath();
      c.arc(cx, base - H * 0.78, H * 0.13, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = hair;
      c.beginPath();
      c.arc(cx, base - H * 0.82, H * 0.135, Math.PI, Math.PI * 2);
      c.fill();
    }
    // photo grade / vignette
    const v = c.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.8);
    v.addColorStop(0, 'rgba(255,230,180,0.05)');
    v.addColorStop(1, 'rgba(40,20,0,0.45)');
    c.fillStyle = v;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      c.fillStyle = `rgba(255,255,255,${r() * 0.05})`;
      c.fillRect(r() * w, r() * h, 1, 1);
    }
    c.strokeStyle = '#f4efe4';
    c.lineWidth = 10;
    c.strokeRect(0, 0, w, h);
  }, { repeat: false });
}

/** Radial soft gradient (light pools, glows, blob shadows). */
export function radial(key = 'radial', inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  return canvasTexture(`radial-${key}`, 128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, inner);
    g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.45)'));
    g.addColorStop(1, outer);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }, { repeat: false });
}

/** Vertical streak used for wet-road light reflections. */
export function streak() {
  return canvasTexture('streak', 64, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.15, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    const id = c.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      const wob = Math.sin(y * 0.3) * 3 + (Math.random() - 0.5) * 4;
      for (let x = 0; x < w; x++) {
        const dx = Math.abs(x - w / 2 - wob) / (w / 2);
        const k = Math.max(0, 1 - dx * dx * 1.6) * (0.75 + Math.random() * 0.25);
        id.data[(y * w + x) * 4 + 3] *= k;
      }
    }
    c.putImageData(id, 0, 0);
  }, { repeat: false });
}

export function noiseTex(key = 'noise', f = 4) {
  return canvasTexture(`noise-${key}`, 256, 256, (c, w, h) => {
    c.putImageData(pixelMap(w, h, (u, v) => {
      const n = fbm(u, v, f, 5) * 255;
      return [n, n, n];
    }), 0, 0);
  }, { srgb: false });
}

export function documentTex(lines: string[], key: string) {
  return canvasTexture(`doc-${key}`, 256, 330, (c, w, h) => {
    c.fillStyle = '#efe9dc';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#333';
    c.font = '700 16px Arial';
    c.fillText(lines[0] ?? '', 16, 30);
    c.font = '11px Arial';
    for (let i = 1; i < lines.length && i < 22; i++) c.fillText(lines[i], 16, 52 + i * 13);
    for (let i = 0; i < 18; i++) {
      c.fillStyle = 'rgba(60,60,60,0.25)';
      c.fillRect(16, 120 + i * 11, 80 + Math.random() * 140, 4);
    }
  }, { repeat: false });
}

export function productsTex() {
  return canvasTexture('products', 512, 256, (c, w) => {
    const r = rng(42);
    const cols = ['#d33', '#e8a020', '#2a7', '#25c', '#eee', '#a3c', '#f6d33c', '#1aa', '#c62', '#333'];
    for (let x = 0; x < w; x += 16 + Math.floor(r() * 14)) {
      for (let row = 0; row < 2; row++) {
        const pw = 12 + Math.floor(r() * 14);
        const ph = 50 + r() * 60;
        const col = cols[Math.floor(r() * cols.length)];
        c.fillStyle = col;
        c.fillRect(x, row * 128 + 128 - ph, pw, ph);
        c.fillStyle = 'rgba(255,255,255,0.6)';
        c.fillRect(x + 2, row * 128 + 128 - ph * 0.7, pw - 4, ph * 0.18);
        c.fillStyle = 'rgba(0,0,0,0.3)';
        c.fillRect(x + pw - 3, row * 128 + 128 - ph, 3, ph);
      }
    }
  });
}

export function rainStreakTex() {
  return canvasTexture('rainstreak', 16, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(1, 'rgba(255,255,255,0.9)');
    c.fillStyle = g;
    c.fillRect(w / 2 - 1, 0, 2, h);
  }, { repeat: false });
}

export function heightMarks() {
  return canvasTexture('heightmarks', 128, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const marks: [number, string, string][] = [
      [0.62, 'ELI 5', '#1b2a6b'], [0.52, 'ELI 7', '#1b2a6b'], [0.44, 'ELI 9', '#1b2a6b'], [0.36, 'ELI 11', '#1b2a6b'], [0.27, 'ELI 13', '#1b2a6b'],
      [0.83, 'ELLIE 3', '#a31d6a'], [0.75, 'ELLIE 5', '#a31d6a'], [0.67, 'ELLIE 7', '#a31d6a'], [0.64, 'ELLIE 8!', '#a31d6a'],
    ];
    c.font = '600 15px "Comic Sans MS", "Marker Felt", cursive';
    for (const [y, t, col] of marks) {
      c.strokeStyle = col;
      c.fillStyle = col;
      c.lineWidth = 3;
      const isEllie = t.startsWith('ELLIE');
      c.beginPath();
      c.moveTo(isEllie ? 64 : 10, y * h);
      c.lineTo(isEllie ? 118 : 64, y * h);
      c.stroke();
      c.fillText(t, isEllie ? 66 : 6, y * h - 5);
    }
  }, { repeat: false });
}

export function drawingTex(key: string, kind: 'house' | 'city' | 'eye' | 'stairs') {
  return canvasTexture(`drawing-${key}`, 256, 192, (c, w, h) => {
    c.fillStyle = '#f7f3ea';
    c.fillRect(0, 0, w, h);
    c.lineWidth = 4;
    c.lineCap = 'round';
    const crayon = (col: string) => {
      c.strokeStyle = col;
      c.fillStyle = col;
    };
    if (kind === 'house') {
      crayon('#c33');
      c.strokeRect(70, 90, 110, 80);
      c.beginPath();
      c.moveTo(60, 95);
      c.lineTo(125, 40);
      c.lineTo(190, 95);
      c.stroke();
      crayon('#e8c219');
      c.beginPath();
      c.arc(215, 35, 18, 0, Math.PI * 2);
      c.fill();
      crayon('#2a6');
      c.beginPath();
      c.moveTo(0, 175);
      c.lineTo(w, 175);
      c.stroke();
      crayon('#225');
      c.font = '600 18px "Comic Sans MS", cursive';
      c.fillText('ME + ELI', 80, 30);
    } else if (kind === 'city') {
      crayon('#222');
      for (let i = 0; i < 9; i++) c.strokeRect(10 + i * 26, 170 - (40 + (i * 37) % 90), 20, 40 + (i * 37) % 90);
      crayon('#7a3ab8');
      c.beginPath();
      c.arc(128, 60, 30, 0, Math.PI * 2);
      c.stroke();
      c.beginPath();
      c.arc(128, 60, 12, 0, Math.PI * 2);
      c.fill();
      crayon('#225');
      c.font = '600 14px "Comic Sans MS", cursive';
      c.fillText('the thing under the city', 50, 185);
    } else if (kind === 'eye') {
      crayon('#111');
      for (let k = 0; k < 6; k++) {
        c.beginPath();
        c.ellipse(128, 96, 100 - k * 14, 60 - k * 9, 0, 0, Math.PI * 2);
        c.stroke();
      }
      c.beginPath();
      c.arc(128, 96, 10, 0, Math.PI * 2);
      c.fill();
    } else {
      crayon('#444');
      for (let i = 0; i < 8; i++) {
        c.beginPath();
        c.moveTo(30 + i * 24, 170 - i * 18);
        c.lineTo(54 + i * 24, 170 - i * 18);
        c.lineTo(54 + i * 24, 152 - i * 18);
        c.stroke();
      }
      crayon('#e8c219');
      c.beginPath();
      c.arc(230, 30, 8, 0, Math.PI * 2);
      c.fill();
    }
  }, { repeat: false });
}
