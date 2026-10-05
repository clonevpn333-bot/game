import * as THREE from 'three';
import { createSeededRandom } from '../utils/random';

type Ctx = CanvasRenderingContext2D;

function hashP(x: number, y: number, seed: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Tileable value noise with integer period. */
function tnoise(x: number, y: number, period: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const m = (n: number) => ((n % period) + period) % period;
  const a = hashP(m(xi), m(yi), seed);
  const b = hashP(m(xi + 1), m(yi), seed);
  const c = hashP(m(xi), m(yi + 1), seed);
  const d = hashP(m(xi + 1), m(yi + 1), seed);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}

export function tfbm(x: number, y: number, period: number, seed: number, oct = 4): number {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < oct; i += 1) {
    sum += amp * tnoise(x * f, y * f, period * f, seed + i * 13);
    f *= 2;
    amp *= 0.5;
  }
  return sum;
}

type TexOpts = { nearest?: boolean; repeat?: boolean; srgb?: boolean };

function make(w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void, opts: TexOpts = {}): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) tex.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat !== false) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  if (opts.nearest) {
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestMipmapLinearFilter;
  }
  tex.anisotropy = 4;
  return tex;
}

/** Per-pixel painter with tileable noise. */
function pixels(
  ctx: Ctx,
  w: number,
  h: number,
  fn: (x: number, y: number) => [number, number, number, number?],
): void {
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const [r, g, b, a] = fn(x, y);
      const o = (y * w + x) * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = a ?? 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

const cache = new Map<string, THREE.Texture>();
function cached<T extends THREE.Texture>(key: string, build: () => T): T {
  const hit = cache.get(key);
  if (hit) return hit as T;
  const t = build();
  cache.set(key, t);
  return t;
}

export const Tex = {
  cobble: () =>
    cached('cobble', () =>
      make(256, 256, (ctx, w, h) => {
        const rng = createSeededRandom(11);
        pixels(ctx, w, h, (x, y) => {
          const n = tfbm(x / 32, y / 32, 8, 3);
          const v = 38 + n * 30;
          return [v * 0.9, v * 0.92, v * 1.0];
        });
        // Irregular setts with dark mortar.
        for (let row = 0; row < 8; row += 1) {
          const off = (row % 2) * 16;
          for (let col = -1; col < 9; col += 1) {
            const x = col * 32 + off + (rng() - 0.5) * 4;
            const y = row * 32 + (rng() - 0.5) * 3;
            const tone = 70 + rng() * 45;
            ctx.fillStyle = `rgb(${tone * 0.92},${tone * 0.93},${tone})`;
            ctx.beginPath();
            const r = 4 + rng() * 3;
            ctx.roundRect(x + 2, y + 2, 28 - rng() * 3, 28 - rng() * 3, r);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.fillRect(x + 5, y + 4, 18, 3);
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.fillRect(x + 4, y + 24, 22, 4);
          }
        }
        // Moss in the joints.
        for (let i = 0; i < 260; i += 1) {
          ctx.fillStyle = `rgba(${40 + rng() * 30},${70 + rng() * 40},${30},${0.25 + rng() * 0.3})`;
          ctx.fillRect(rng() * w, rng() * h, 2 + rng() * 3, 1 + rng() * 2);
        }
      }),
    ),

  dirt: () =>
    cached('dirt', () =>
      make(256, 256, (ctx, w, h) => {
        const rng = createSeededRandom(13);
        pixels(ctx, w, h, (x, y) => {
          const n = tfbm(x / 24, y / 24, 10, 61, 5);
          const rut = Math.abs(Math.sin((x / w) * Math.PI * 4)) < 0.12 ? 0.75 : 1;
          const v = (48 + n * 40) * rut;
          return [v * 1.0, v * 0.86, v * 0.66];
        });
        for (let i = 0; i < 300; i += 1) {
          ctx.fillStyle = `rgba(${30 + rng() * 40},${60 + rng() * 40},${25},${0.3 + rng() * 0.4})`;
          ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 4, 1 + rng() * 2);
        }
        for (let i = 0; i < 70; i += 1) {
          ctx.fillStyle = `rgba(110,100,90,${0.3 + rng() * 0.4})`;
          ctx.beginPath();
          ctx.ellipse(rng() * w, rng() * h, 1 + rng() * 3, 1 + rng() * 2, rng() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }),
    ),

  rock: () =>
    cached('rock', () =>
      make(256, 256, (ctx, w, h) => {
        pixels(ctx, w, h, (x, y) => {
          const n = tfbm(x / 24, y / 48, 10, 7, 5);
          const strata = Math.sin((y / h) * Math.PI * 14 + n * 6) * 0.5 + 0.5;
          const v = 50 + n * 70 + strata * 22;
          const crack = tfbm(x / 12, y / 12, 21, 9, 2) < 0.28 ? 0.55 : 1;
          return [v * 0.86 * crack, v * 0.9 * crack, v * 1.0 * crack];
        });
      }),
    ),

  /** Grass tuft card: tapered blades on transparent background (alpha-tested). */
  grass: () =>
    cached('grass', () =>
      make(128, 128, (ctx, w, h) => {
        const rng = createSeededRandom(21);
        ctx.clearRect(0, 0, w, h);
        for (let i = 0; i < 46; i += 1) {
          const x = 8 + rng() * (w - 16);
          const top = h * (0.05 + rng() * 0.45);
          const lean = (rng() - 0.5) * 40;
          const g = ctx.createLinearGradient(0, h, 0, top);
          const tone = 0.7 + rng() * 0.5;
          g.addColorStop(0, `rgb(${30 * tone},${42 * tone},${22 * tone})`);
          g.addColorStop(1, `rgb(${120 * tone},${140 * tone},${70 * tone})`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x - 3, h);
          ctx.quadraticCurveTo(x + lean * 0.3, (h + top) / 2, x + lean, top);
          ctx.quadraticCurveTo(x + lean * 0.3 + 2, (h + top) / 2, x + 3, h);
          ctx.fill();
        }
      }, { repeat: false }),
    ),

  /** 4x4 bays of half-timbered plaster; some windows lit. Emissive companion via `windowsEmissive`. */
  houseWall: (variant: number) =>
    cached(`house${variant}`, () =>
      make(256, 256, (ctx, w, h) => {
        const rng = createSeededRandom(100 + variant);
        const base = [
          [148, 132, 108],
          [118, 110, 104],
          [132, 112, 96],
        ][variant % 3];
        pixels(ctx, w, h, (x, y) => {
          const n = tfbm(x / 20, y / 20, 13, 30 + variant, 4);
          const grime = Math.pow(y / h, 1.5) * 0.25 + (y % 64) / 64 * 0.12;
          const k = 0.72 + n * 0.45 - grime;
          return [base[0] * k, base[1] * k, base[2] * k];
        });
        for (let by = 0; by < 4; by += 1) {
          for (let bx = 0; bx < 4; bx += 1) {
            const x0 = bx * 64;
            const y0 = by * 64;
            // Timber frame.
            ctx.fillStyle = '#2a1d15';
            ctx.fillRect(x0, y0, 64, 5);
            ctx.fillRect(x0, y0, 5, 64);
            if (variant !== 1) {
              ctx.save();
              ctx.strokeStyle = '#2f2118';
              ctx.lineWidth = 4;
              ctx.beginPath();
              if ((bx + by + variant) % 2 === 0) {
                ctx.moveTo(x0 + 4, y0 + 60);
                ctx.lineTo(x0 + 18, y0 + 40);
              } else {
                ctx.moveTo(x0 + 60, y0 + 60);
                ctx.lineTo(x0 + 46, y0 + 40);
              }
              ctx.stroke();
              ctx.restore();
            }
            // Window: a lancet with a dark frame.
            const wx = x0 + 22;
            const wy = y0 + 16;
            ctx.fillStyle = '#1b130e';
            ctx.beginPath();
            ctx.moveTo(wx - 3, wy + 34);
            ctx.lineTo(wx - 3, wy + 6);
            ctx.quadraticCurveTo(wx + 10, wy - 8, wx + 23, wy + 6);
            ctx.lineTo(wx + 23, wy + 34);
            ctx.fill();
            const lit = rng() < 0.42;
            ctx.fillStyle = lit ? '#e7a050' : '#141820';
            ctx.beginPath();
            ctx.moveTo(wx, wy + 32);
            ctx.lineTo(wx, wy + 7);
            ctx.quadraticCurveTo(wx + 10, wy - 4, wx + 20, wy + 7);
            ctx.lineTo(wx + 20, wy + 32);
            ctx.fill();
            ctx.fillStyle = '#1b130e';
            ctx.fillRect(wx + 9, wy, 2, 32);
            ctx.fillRect(wx, wy + 18, 20, 2);
            // Sill shadow.
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(wx - 4, wy + 34, 28, 4);
            // Mark lit windows in the canvas alpha-free way: remember in userData via pattern below.
            if (lit) {
              ctx.fillStyle = 'rgba(255,220,150,0.35)';
              ctx.fillRect(wx + 2, wy + 9, 6, 8);
            }
          }
        }
      }),
    ),

  /** Emissive mask matching `houseWall` (same RNG sequence decides lit windows). */
  houseEmissive: (variant: number) =>
    cached(`houseE${variant}`, () =>
      make(256, 256, (ctx) => {
        const rng = createSeededRandom(100 + variant);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 256, 256);
        for (let by = 0; by < 4; by += 1) {
          for (let bx = 0; bx < 4; bx += 1) {
            const wx = bx * 64 + 22;
            const wy = by * 64 + 16;
            const lit = rng() < 0.42;
            if (!lit) continue;
            const g = ctx.createLinearGradient(0, wy, 0, wy + 32);
            g.addColorStop(0, '#ffb45a');
            g.addColorStop(1, '#c4561c');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(wx, wy + 32);
            ctx.lineTo(wx, wy + 7);
            ctx.quadraticCurveTo(wx + 10, wy - 4, wx + 20, wy + 7);
            ctx.lineTo(wx + 20, wy + 32);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.fillRect(wx + 9, wy, 2, 32);
            ctx.fillRect(wx, wy + 18, 20, 2);
          }
        }
      }),
    ),

  stoneBlocks: (tint = 0) =>
    cached(`stone${tint}`, () =>
      make(256, 256, (ctx, w, h) => {
        const rng = createSeededRandom(50 + tint);
        pixels(ctx, w, h, (x, y) => {
          const n = tfbm(x / 16, y / 16, 16, 40 + tint, 4);
          const v = 70 + n * 60;
          return tint === 1 ? [v * 1.05, v * 0.95, v * 0.82] : [v * 0.86, v * 0.88, v * 0.95];
        });
        for (let row = 0; row < 8; row += 1) {
          const off = (row % 2) * 24;
          ctx.fillStyle = 'rgba(10,10,14,0.55)';
          ctx.fillRect(0, row * 32, w, 3);
          for (let x = -off; x < w; x += 48) ctx.fillRect(x, row * 32, 3, 32);
          for (let x = -off; x < w; x += 48) {
            ctx.fillStyle = `rgba(255,255,255,${0.03 + rng() * 0.05})`;
            ctx.fillRect(x + 4, row * 32 + 4, 40, 3);
            ctx.fillStyle = `rgba(0,0,0,${rng() * 0.18})`;
            ctx.fillRect(x + 3, row * 32 + 3, 45, 29);
          }
        }
        // Streaks of grime running down.
        for (let i = 0; i < 40; i += 1) {
          const x = rng() * w;
          const g = ctx.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(1, 'rgba(10,14,10,0.25)');
          ctx.fillStyle = g;
          ctx.fillRect(x, rng() * h * 0.5, 2 + rng() * 4, h);
        }
      }),
    ),

  slate: () =>
    cached('slate', () =>
      make(128, 128, (ctx, w, h) => {
        const rng = createSeededRandom(77);
        ctx.fillStyle = '#23262f';
        ctx.fillRect(0, 0, w, h);
        for (let row = 0; row < 16; row += 1) {
          const off = (row % 2) * 8;
          for (let x = -off; x < w; x += 16) {
            const t = 30 + rng() * 26;
            ctx.fillStyle = `rgb(${t},${t + 3},${t + 12})`;
            ctx.beginPath();
            ctx.roundRect(x + 1, row * 8, 14, 9, [0, 0, 5, 5]);
            ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(x + 1, row * 8 + 7, 14, 2);
            if (rng() < 0.1) {
              ctx.fillStyle = 'rgba(80,110,60,0.5)';
              ctx.fillRect(x + 3, row * 8 + 2, 6, 4);
            }
          }
        }
      }),
    ),

  wood: () =>
    cached('wood', () =>
      make(64, 128, (ctx, w, h) => {
        pixels(ctx, w, h, (x, y) => {
          const n = tfbm(x / 4, y / 32, 16, 5, 3);
          const plank = x % 16 === 0 ? 0.4 : 1;
          const v = (60 + n * 50) * plank;
          return [v * 1.0, v * 0.72, v * 0.5];
        });
      }, { nearest: true }),
    ),

  armor: () =>
    cached('armor', () =>
      make(64, 64, (ctx, w, h) => {
        const rng = createSeededRandom(5);
        pixels(ctx, w, h, (x, y) => {
          const n = tfbm(x / 8, y / 8, 8, 61, 3);
          const v = 120 + n * 70;
          return [v * 0.86, v * 0.9, v];
        });
        ctx.strokeStyle = 'rgba(30,25,20,0.55)';
        for (let i = 0; i < 22; i += 1) {
          ctx.beginPath();
          const x = rng() * w;
          const y = rng() * h;
          ctx.moveTo(x, y);
          ctx.lineTo(x + (rng() - 0.5) * 14, y + (rng() - 0.5) * 6);
          ctx.stroke();
        }
        // Rust and dents.
        for (let i = 0; i < 14; i += 1) {
          ctx.fillStyle = `rgba(${110 + rng() * 40},${50 + rng() * 20},20,${0.15 + rng() * 0.25})`;
          ctx.beginPath();
          ctx.arc(rng() * w, rng() * h, 1 + rng() * 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(0, 0, w, 2);
      }, { nearest: true }),
    ),

  chainmail: () =>
    cached('mail', () =>
      make(32, 32, (ctx, w, h) => {
        ctx.fillStyle = '#2b2c30';
        ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 4) {
          for (let x = (y / 4) % 2 ? 2 : 0; x < w; x += 4) {
            ctx.fillStyle = '#8e9299';
            ctx.fillRect(x, y, 3, 2);
            ctx.fillStyle = '#4a4c52';
            ctx.fillRect(x, y + 2, 3, 1);
          }
        }
      }, { nearest: true }),
    ),

  leather: () =>
    cached('leather', () =>
      make(64, 64, (ctx, w, h) => {
        pixels(ctx, w, h, (x, y) => {
          const n = tfbm(x / 6, y / 6, 10, 81, 3);
          const v = 60 + n * 40;
          return [v * 1.0, v * 0.68, v * 0.45];
        });
        ctx.fillStyle = 'rgba(220,190,140,0.35)';
        for (let x = 2; x < w; x += 6) ctx.fillRect(x, 3, 3, 1);
      }, { nearest: true }),
    ),

  cloth: (r: number, g: number, b: number, key: string) =>
    cached(`cloth${key}`, () =>
      make(64, 64, (ctx, w, h) => {
        pixels(ctx, w, h, (x, y) => {
          const n = tfbm(x / 8, y / 8, 8, 91, 3);
          const weave = (x + y) % 2 === 0 ? 1.06 : 0.94;
          const k = (0.7 + n * 0.5) * weave;
          const fray = y > h - 6 ? 0.65 : 1;
          return [r * k * fray, g * k * fray, b * k * fray];
        });
      }, { nearest: true }),
    ),

  /** Order of the Still Bell tabard: closed eye above a bell, on deep blue. */
  sigil: () =>
    cached('sigil', () =>
      make(64, 64, (ctx, w, h) => {
        pixels(ctx, w, h, (x, y) => {
          const n = tfbm(x / 8, y / 8, 8, 17, 3);
          const k = 0.75 + n * 0.4;
          return [28 * k, 34 * k, 70 * k];
        });
        ctx.strokeStyle = '#c9a75a';
        ctx.fillStyle = '#c9a75a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(18, 20);
        ctx.quadraticCurveTo(32, 30, 46, 20);
        ctx.stroke();
        for (let i = 0; i < 5; i += 1) {
          ctx.fillRect(21 + i * 5, 25, 1.5, 4);
        }
        ctx.beginPath();
        ctx.moveTo(24, 50);
        ctx.quadraticCurveTo(24, 34, 32, 33);
        ctx.quadraticCurveTo(40, 34, 40, 50);
        ctx.closePath();
        ctx.fill();
        ctx.fillRect(22, 49, 20, 3);
        ctx.strokeRect(3, 3, w - 6, h - 6);
      }, { nearest: true, repeat: false }),
    ),

  face: (skin: string, mood: 'calm' | 'fear' | 'grim' | 'old') =>
    cached(`face${skin}${mood}`, () =>
      make(32, 32, (ctx, w, h) => {
        ctx.fillStyle = skin;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(0, 22, w, 10);
        // Eyes on the front half (u 0.25..0.75 maps to the face on a lathe head).
        ctx.fillStyle = '#16120f';
        const eyeY = mood === 'fear' ? 12 : 13;
        ctx.fillRect(11, eyeY, 3, mood === 'fear' ? 3 : 2);
        ctx.fillRect(18, eyeY, 3, mood === 'fear' ? 3 : 2);
        ctx.fillStyle = '#2a1c14';
        if (mood === 'grim' || mood === 'old') {
          ctx.fillRect(10, 10, 5, 1);
          ctx.fillRect(17, 10, 5, 1);
        } else if (mood === 'fear') {
          ctx.fillRect(10, 9, 4, 1);
          ctx.fillRect(18, 9, 4, 1);
        }
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(15, 14, 2, 5);
        ctx.fillStyle = '#3a1a14';
        if (mood === 'fear') ctx.fillRect(14, 21, 4, 3);
        else ctx.fillRect(13, 21, 6, 1);
        if (mood === 'old') {
          ctx.fillStyle = '#cfc8bd';
          ctx.fillRect(9, 22, 14, 8);
          ctx.fillStyle = '#3a1a14';
          ctx.fillRect(13, 21, 6, 1);
        }
      }, { nearest: true, repeat: false }),
    ),

  bone: () =>
    cached('bone', () =>
      make(64, 64, (ctx, w, h) => {
        pixels(ctx, w, h, (x, y) => {
          const n = tfbm(x / 8, y / 16, 8, 33, 4);
          const v = 170 + n * 70;
          return [v, v * 0.94, v * 0.8];
        });
        ctx.strokeStyle = 'rgba(90,60,40,0.4)';
        for (let i = 0; i < 8; i += 1) {
          ctx.beginPath();
          ctx.moveTo(i * 8, 0);
          ctx.bezierCurveTo(i * 8 + 4, 20, i * 8 - 4, 40, i * 8 + 2, 64);
          ctx.stroke();
        }
      }, { nearest: true }),
    ),

  bronze: () =>
    cached('bronze', () =>
      make(64, 64, (ctx, w, h) => {
        pixels(ctx, w, h, (x, y) => {
          const n = tfbm(x / 8, y / 8, 8, 12, 4);
          const verd = tfbm(x / 5, y / 10, 13, 44, 3);
          const v = 0.6 + n * 0.6;
          if (verd > 0.62) return [70 * v, 120 * v, 100 * v];
          return [150 * v, 104 * v, 56 * v];
        });
      }, { nearest: true }),
    ),

  horse: () =>
    cached('horse', () =>
      make(64, 64, (ctx, w, h) => {
        pixels(ctx, w, h, (x, y) => {
          const n = tfbm(x / 8, y / 8, 8, 55, 3);
          const v = 0.7 + n * 0.5;
          return [52 * v, 38 * v, 30 * v];
        });
      }, { nearest: true }),
    ),

  /** Soft radial sprite used for glows, flames, contact shadows. */
  radial: (inner: string, outer: string, key: string) =>
    cached(`radial${key}`, () =>
      make(64, 64, (ctx, w) => {
        const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        g.addColorStop(0, inner);
        g.addColorStop(1, outer);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, w);
      }, { repeat: false }),
    ),

  flame: () =>
    cached('flame', () =>
      make(32, 64, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h * 0.7, 1, w / 2, h * 0.62, h * 0.5);
        g.addColorStop(0, 'rgba(255,250,220,1)');
        g.addColorStop(0.25, 'rgba(255,190,80,0.95)');
        g.addColorStop(0.6, 'rgba(230,80,20,0.55)');
        g.addColorStop(1, 'rgba(120,20,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(w / 2, 0);
        ctx.quadraticCurveTo(w, h * 0.6, w / 2, h);
        ctx.quadraticCurveTo(0, h * 0.6, w / 2, 0);
        ctx.fill();
      }, { repeat: false }),
    ),

  fogNoise: () =>
    cached('fog', () =>
      make(256, 256, (ctx, w, h) => {
        pixels(ctx, w, h, (x, y) => {
          const n = tfbm(x / 32, y / 32, 8, 99, 5);
          const a = Math.max(0, n - 0.3) * 1.8;
          return [255, 255, 255, Math.min(255, a * 255)];
        });
      }, { srgb: false }),
    ),

  rose: () =>
    cached('rose', () =>
      make(256, 256, (ctx, w) => {
        const c = w / 2;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, w);
        const colors = ['#ffbf50', '#c43c2a', '#3c56c8', '#e8a030', '#7a3cc0'];
        for (let ring = 6; ring >= 1; ring -= 1) {
          const segs = ring * 6;
          for (let i = 0; i < segs; i += 1) {
            ctx.fillStyle = colors[(i + ring) % colors.length];
            ctx.beginPath();
            ctx.moveTo(c, c);
            ctx.arc(c, c, ring * 20, (i / segs) * Math.PI * 2, ((i + 0.85) / segs) * Math.PI * 2);
            ctx.fill();
          }
          ctx.strokeStyle = '#120a06';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(c, c, ring * 20, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = '#fff2c0';
        ctx.beginPath();
        ctx.arc(c, c, 12, 0, Math.PI * 2);
        ctx.fill();
      }, { repeat: false }),
    ),

  lancet: () =>
    cached('lancet', () =>
      make(64, 128, (ctx, w, h) => {
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#ffd27a');
        g.addColorStop(0.5, '#f08a30');
        g.addColorStop(1, '#a8341c');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(6, h - 4);
        ctx.lineTo(6, 34);
        ctx.quadraticCurveTo(w / 2, -10, w - 6, 34);
        ctx.lineTo(w - 6, h - 4);
        ctx.fill();
        ctx.fillStyle = '#100804';
        ctx.fillRect(w / 2 - 2, 10, 4, h);
        for (let y = 40; y < h; y += 22) ctx.fillRect(4, y, w - 8, 3);
      }, { repeat: false }),
    ),

  crack: () =>
    cached('crack', () =>
      make(128, 128, (ctx, w, h) => {
        const rng = createSeededRandom(9);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        ctx.lineCap = 'round';
        const branch = (x: number, y: number, a: number, len: number, wd: number) => {
          if (len < 6 || wd < 0.6) return;
          const nx = x + Math.cos(a) * len;
          const ny = y + Math.sin(a) * len;
          ctx.strokeStyle = `rgba(255,${120 + wd * 20},40,1)`;
          ctx.lineWidth = wd;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(nx, ny);
          ctx.stroke();
          branch(nx, ny, a + (rng() - 0.5) * 0.9, len * 0.8, wd * 0.8);
          if (rng() < 0.4) branch(nx, ny, a + (rng() - 0.5) * 2.2, len * 0.6, wd * 0.55);
        };
        branch(0, h / 2, 0, 22, 6);
        branch(w, h / 2, Math.PI, 22, 5);
      }, { repeat: false }),
    ),
};
