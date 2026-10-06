import * as THREE from 'three';
import { tfbm } from '../world/Textures';
import { createSeededRandom } from '../utils/random';

/**
 * Hand-painted style textures for Ser Calder: low-to-medium resolution, painted light baked
 * into the albedo (old-RPG style) so forms still read under dim moonlight.
 */
type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

const cache = new Map<string, THREE.CanvasTexture>();

function paint(key: string, w: number, h: number, draw: Draw, opts: { nearest?: boolean; repeat?: boolean } = {}): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('no 2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat !== false) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  // PS2 look: small textures, bilinear-filtered (soft, not pixelated), no anisotropic sharpening.
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 1;
  void opts.nearest;
  cache.set(key, t);
  return t;
}

function noiseFill(ctx: CanvasRenderingContext2D, w: number, h: number, fn: (x: number, y: number, n: number) => [number, number, number, number?], scale = 10, seed = 1): void {
  const img = ctx.createImageData(w, h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const n = tfbm(x / scale, y / scale, Math.round(w / scale), seed, 4);
      const [r, g, b, a] = fn(x, y, n);
      const o = (y * w + x) * 4;
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = a ?? 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

export const HeroTex = {
  /** Worn steel plate: vertical painted gradient (lit from above), scratches, dents, rust in the low edge. */
  plate: () =>
    paint('h-plate', 128, 128, (ctx, w, h) => {
      const rng = createSeededRandom(404);
      noiseFill(ctx, w, h, (_x, y, n) => {
        const v = y / h; // v = 0 at top of canvas = top of a lathe profile (flipY)
        const light = 1.18 - v * 0.45;
        const base = (118 + n * 60) * light;
        return [base * 0.92, base * 0.95, base * 1.04];
      }, 12, 7);
      // Specular streak (brushed highlight).
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.42, 'rgba(255,255,255,0.0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.18)');
      g.addColorStop(0.58, 'rgba(255,255,255,0.0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Scratches.
      ctx.lineWidth = 1;
      for (let i = 0; i < 70; i += 1) {
        const x = rng() * w;
        const y = rng() * h;
        const l = 3 + rng() * 14;
        const a = (rng() - 0.5) * 1.2;
        ctx.strokeStyle = rng() < 0.6 ? 'rgba(20,18,22,0.45)' : 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
        ctx.stroke();
      }
      // Dents: dark crescent + light rim.
      for (let i = 0; i < 9; i += 1) {
        const x = rng() * w;
        const y = rng() * h;
        const r = 2 + rng() * 4;
        ctx.fillStyle = 'rgba(10,10,14,0.35)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(x - 1, y - 1, r * 0.6, Math.PI, Math.PI * 1.7);
        ctx.fill();
      }
      // Rust and grime collecting low.
      for (let i = 0; i < 60; i += 1) {
        const y = h * (0.6 + rng() * 0.4);
        ctx.fillStyle = `rgba(${90 + rng() * 50},${40 + rng() * 20},${18},${0.12 + rng() * 0.25})`;
        ctx.beginPath();
        ctx.ellipse(rng() * w, y, 1 + rng() * 4, 1 + rng() * 6, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      // Bright rolled edge at the top of the profile.
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(0, 0, w, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, 3, w, 2);
    }),

  /** Blackened plate variant with gold-leaf filigree remnants. */
  plateDark: () =>
    paint('h-plateDark', 128, 128, (ctx, w, h) => {
      const rng = createSeededRandom(405);
      noiseFill(ctx, w, h, (_x, y, n) => {
        const light = 1.1 - (y / h) * 0.4;
        const b = (52 + n * 40) * light;
        return [b * 0.95, b * 0.96, b * 1.08];
      }, 10, 9);
      ctx.strokeStyle = 'rgba(200,160,80,0.45)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 6; i += 1) {
        const y = 10 + rng() * (h - 20);
        ctx.beginPath();
        for (let x = 0; x <= w; x += 4) ctx.lineTo(x, y + Math.sin(x * 0.2 + i) * 3);
        ctx.stroke();
      }
      for (let i = 0; i < 40; i += 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        const x = rng() * w;
        const y = rng() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rng() - 0.5) * 12, y + (rng() - 0.5) * 4);
        ctx.stroke();
      }
    }),

  /** Brass trim with dark engraved bands. */
  trim: () =>
    paint('h-trim', 64, 32, (ctx, w, h) => {
      noiseFill(ctx, w, h, (x, y, n) => {
        const band = Math.abs(Math.sin((y / h) * Math.PI));
        const v = 0.55 + band * 0.5 + n * 0.2;
        const engr = x % 8 < 1 ? 0.6 : 1;
        return [200 * v * engr, 150 * v * engr, 70 * v * engr];
      }, 6, 3);
    }),

  /** Riveted butted mail, painted with a soft top-light. */
  mail: () =>
    paint('h-mail', 64, 64, (ctx, w, h) => {
      ctx.fillStyle = '#1a1b20';
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4) {
        for (let x = (y / 4) % 2 ? 2 : 0; x < w; x += 4) {
          const light = 1.1 - (y / h) * 0.4;
          ctx.fillStyle = `rgb(${150 * light},${155 * light},${165 * light})`;
          ctx.fillRect(x, y, 3, 1);
          ctx.fillStyle = `rgb(${90 * light},${92 * light},${100 * light})`;
          ctx.fillRect(x, y + 1, 1, 2);
          ctx.fillRect(x + 2, y + 1, 1, 2);
          ctx.fillStyle = `rgb(${60 * light},${60 * light},${68 * light})`;
          ctx.fillRect(x, y + 3, 3, 1);
        }
      }
    }),

  /** Dark oiled leather with stitch lines. */
  leather: () =>
    paint('h-leather', 64, 64, (ctx, w, h) => {
      noiseFill(ctx, w, h, (_x, _y, n) => {
        const v = 50 + n * 40;
        return [v * 1.05, v * 0.72, v * 0.5];
      }, 6, 22);
      ctx.fillStyle = 'rgba(225,200,150,0.5)';
      for (let x = 1; x < w; x += 5) {
        ctx.fillRect(x, 4, 2, 1);
        ctx.fillRect(x + 2, h - 6, 2, 1);
      }
    }),

  /** Heavy wool cloak: crimson weave, darker hem, ragged alpha hem. */
  cloak: () =>
    paint('h-cloak', 128, 128, (ctx, w, h) => {
      const rng = createSeededRandom(77);
      noiseFill(ctx, w, h, (x, y, n) => {
        const weave = (x + y) % 2 === 0 ? 1.05 : 0.95;
        const fold = 0.8 + 0.25 * Math.sin((x / w) * Math.PI * 7 + n * 2);
        const hem = y > h * 0.8 ? 0.7 : 1;
        const k = (0.75 + n * 0.4) * weave * fold * hem;
        return [120 * k, 26 * k, 26 * k, 255];
      }, 10, 31);
      // Ragged hem: punch holes into the bottom rows.
      ctx.globalCompositeOperation = 'destination-out';
      for (let x = 0; x < w; x += 3) {
        const depth = 3 + rng() * 16 + (Math.sin(x * 0.3) > 0.6 ? 12 : 0);
        ctx.fillRect(x, h - depth, 2 + rng() * 3, depth);
      }
      for (let i = 0; i < 14; i += 1) {
        ctx.beginPath();
        ctx.arc(rng() * w, h * (0.7 + rng() * 0.25), 1 + rng() * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      // Gold border stitching near the hem.
      ctx.fillStyle = 'rgba(200,160,80,0.6)';
      for (let x = 0; x < w; x += 4) ctx.fillRect(x, h * 0.74, 2, 1);
    }),

  /** Surcoat panel: deep blue with the Order's sigil (closed eye above a bell), ragged hem. */
  tabard: () =>
    paint('h-tabard', 64, 128, (ctx, w, h) => {
      const rng = createSeededRandom(12);
      noiseFill(ctx, w, h, (x, y, n) => {
        const weave = (x + y) % 2 === 0 ? 1.06 : 0.94;
        const light = 1.1 - (y / h) * 0.35;
        const k = (0.7 + n * 0.45) * weave * light;
        return [30 * k, 38 * k, 84 * k, 255];
      }, 8, 41);
      ctx.strokeStyle = '#c9a75a';
      ctx.lineWidth = 2;
      ctx.strokeRect(4, 4, w - 8, h - 24);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(16, 40);
      ctx.quadraticCurveTo(32, 52, 48, 40);
      ctx.stroke();
      ctx.fillStyle = '#c9a75a';
      for (let i = 0; i < 5; i += 1) ctx.fillRect(19 + i * 6, 46, 2, 5);
      ctx.beginPath();
      ctx.moveTo(22, 82);
      ctx.quadraticCurveTo(22, 62, 32, 61);
      ctx.quadraticCurveTo(42, 62, 42, 82);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(19, 81, 26, 4);
      ctx.beginPath();
      ctx.arc(32, 89, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'destination-out';
      for (let x = 0; x < w; x += 4) {
        const d = 2 + rng() * 14;
        ctx.fillRect(x, h - d, 2 + rng() * 2, d);
      }
      ctx.globalCompositeOperation = 'source-over';
    }),

  /** Dark fur for the mantle trim. */
  fur: () =>
    paint('h-fur', 64, 64, (ctx, w, h) => {
      const rng = createSeededRandom(9);
      ctx.fillStyle = '#1c1612';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i += 1) {
        const x = rng() * w;
        const y = rng() * h;
        const t = 40 + rng() * 60;
        ctx.strokeStyle = `rgb(${t},${t * 0.85},${t * 0.7})`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (rng() - 0.5) * 3, y + 3 + rng() * 6);
        ctx.stroke();
      }
    }),

  /** Horsehair crest strands (alpha). */
  crest: () =>
    paint('h-crest', 32, 64, (ctx, w, h) => {
      const rng = createSeededRandom(3);
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < 26; i += 1) {
        const x = rng() * w;
        const t = 120 + rng() * 80;
        ctx.strokeStyle = `rgb(${t},${20 + rng() * 15},${18})`;
        ctx.lineWidth = 1 + rng();
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.quadraticCurveTo(x + (rng() - 0.5) * 8, h * 0.5, x + (rng() - 0.5) * 6, h * (0.7 + rng() * 0.3));
        ctx.stroke();
      }
    }, { repeat: false }),

  /** Blade: polished steel with a dark fuller down the centre, bright edges. */
  blade: () =>
    paint('h-blade', 32, 128, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, '#f2f6ff');
      g.addColorStop(0.18, '#9aa4b4');
      g.addColorStop(0.4, '#5a6270');
      g.addColorStop(0.5, '#2a2e36');
      g.addColorStop(0.6, '#5a6270');
      g.addColorStop(0.82, '#9aa4b4');
      g.addColorStop(1, '#f2f6ff');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const rng = createSeededRandom(5);
      for (let i = 0; i < 18; i += 1) {
        ctx.fillStyle = `rgba(30,20,10,${0.1 + rng() * 0.2})`;
        ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 2, 1 + rng() * 3);
      }
    }, { repeat: false }),
};
