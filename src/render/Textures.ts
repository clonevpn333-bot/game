import * as THREE from 'three';
import { createSeededRandom } from '../core/rng';

type Painter = (g: CanvasRenderingContext2D, s: number, rnd: () => number) => void;

const cache = new Map<string, THREE.CanvasTexture>();

function make(name: string, size: number, tileMeters: number, paint: Painter, srgb = true): THREE.CanvasTexture {
  const key = `${name}:${size}:${tileMeters}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  paint(g, size, createSeededRandom(name.length * 977 + size));
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / tileMeters, 1 / tileMeters);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  cache.set(key, t);
  return t;
}

function speckle(g: CanvasRenderingContext2D, s: number, rnd: () => number, n: number, alpha: number, light = false): void {
  for (let i = 0; i < n; i++) {
    const v = light ? 255 : 0;
    g.fillStyle = `rgba(${v},${v},${v},${rnd() * alpha})`;
    const r = rnd() * 2 + 0.5;
    g.fillRect(rnd() * s, rnd() * s, r, r);
  }
}

export const Tex = {
  /** Backrooms wallpaper: mono-yellow with faint chevron stripes and damp stains. */
  yellowWallpaper(): THREE.CanvasTexture {
    return make('yellowWallpaper', 256, 1.6, (g, s, rnd) => {
      g.fillStyle = '#d9c46a';
      g.fillRect(0, 0, s, s);
      g.strokeStyle = 'rgba(150,120,40,0.28)';
      g.lineWidth = 3;
      for (let x = 0; x <= s; x += s / 8) {
        g.beginPath();
        for (let y = 0; y <= s; y += s / 16) {
          const xx = x + ((y / (s / 16)) % 2 === 0 ? 0 : s / 32);
          if (y === 0) g.moveTo(xx, y);
          else g.lineTo(xx, y);
        }
        g.stroke();
      }
      g.fillStyle = 'rgba(255,240,170,0.25)';
      for (let x = 0; x < s; x += s / 8) g.fillRect(x + s / 16 - 2, 0, 4, s);
      for (let i = 0; i < 5; i++) {
        const grd = g.createRadialGradient(rnd() * s, rnd() * s, 2, rnd() * s, rnd() * s, 40 + rnd() * 60);
        grd.addColorStop(0, 'rgba(120,95,30,0.18)');
        grd.addColorStop(1, 'rgba(120,95,30,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, s, s);
      }
      speckle(g, s, rnd, 900, 0.08);
    });
  },
  /** Damp low-pile carpet. */
  carpet(color = '#a8955a', name = 'carpet'): THREE.CanvasTexture {
    return make(`${name}${color}`, 256, 2, (g, s, rnd) => {
      g.fillStyle = color;
      g.fillRect(0, 0, s, s);
      speckle(g, s, rnd, 6000, 0.16);
      speckle(g, s, rnd, 3000, 0.08, true);
      for (let i = 0; i < 3; i++) {
        const x = rnd() * s, y = rnd() * s;
        const grd = g.createRadialGradient(x, y, 4, x, y, 50 + rnd() * 50);
        grd.addColorStop(0, 'rgba(60,45,20,0.2)');
        grd.addColorStop(1, 'rgba(60,45,20,0)');
        g.fillStyle = grd;
        g.fillRect(0, 0, s, s);
      }
    });
  },
  /** Hotel carpet with an ornamental repeat. */
  hotelCarpet(base = '#6b2a3a', ink = '#d8a35a'): THREE.CanvasTexture {
    return make(`hotelCarpet${base}`, 256, 2.4, (g, s, rnd) => {
      g.fillStyle = base;
      g.fillRect(0, 0, s, s);
      g.strokeStyle = ink;
      g.globalAlpha = 0.55;
      g.lineWidth = 3;
      for (let i = 0; i < 2; i++)
        for (let j = 0; j < 2; j++) {
          const cx = s / 4 + (i * s) / 2, cy = s / 4 + (j * s) / 2;
          g.beginPath();
          g.moveTo(cx, cy - 40); g.lineTo(cx + 40, cy); g.lineTo(cx, cy + 40); g.lineTo(cx - 40, cy); g.closePath();
          g.stroke();
          g.beginPath();
          g.arc(cx, cy, 14, 0, Math.PI * 2);
          g.stroke();
        }
      g.globalAlpha = 1;
      speckle(g, s, rnd, 4000, 0.15);
    });
  },
  /** Polished mall tile (checker with grout). */
  mallTile(a = '#efe6dc', b = '#d9cfe0'): THREE.CanvasTexture {
    return make(`mallTile${a}${b}`, 256, 2, (g, s, rnd) => {
      const n = 4;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          g.fillStyle = (i + j) % 2 ? a : b;
          g.fillRect((i * s) / n, (j * s) / n, s / n, s / n);
        }
      g.strokeStyle = 'rgba(90,80,100,0.35)';
      g.lineWidth = 2;
      for (let i = 0; i <= n; i++) {
        g.beginPath(); g.moveTo((i * s) / n, 0); g.lineTo((i * s) / n, s); g.stroke();
        g.beginPath(); g.moveTo(0, (i * s) / n); g.lineTo(s, (i * s) / n); g.stroke();
      }
      speckle(g, s, rnd, 1500, 0.05);
    });
  },
  /** Office drop ceiling with light panels (emissive-friendly). */
  ceilingTiles(): THREE.CanvasTexture {
    return make('ceilingTiles', 256, 2.4, (g, s, rnd) => {
      g.fillStyle = '#ddd6bf';
      g.fillRect(0, 0, s, s);
      speckle(g, s, rnd, 3000, 0.12);
      g.strokeStyle = '#9d957d';
      g.lineWidth = 5;
      g.strokeRect(0, 0, s, s);
      g.beginPath(); g.moveTo(s / 2, 0); g.lineTo(s / 2, s); g.moveTo(0, s / 2); g.lineTo(s, s / 2); g.stroke();
    });
  },
  /** Wood planks (giant bedroom floor, station benches). */
  wood(base = '#c99a6b'): THREE.CanvasTexture {
    return make(`wood${base}`, 256, 3, (g, s, rnd) => {
      g.fillStyle = base;
      g.fillRect(0, 0, s, s);
      const rows = 6;
      for (let r = 0; r < rows; r++) {
        const y = (r * s) / rows;
        g.fillStyle = `rgba(80,40,20,${0.05 + rnd() * 0.12})`;
        g.fillRect(0, y, s, s / rows);
        g.strokeStyle = 'rgba(70,35,15,0.45)';
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke();
        const off = rnd() * s;
        g.beginPath(); g.moveTo(off, y); g.lineTo(off, y + s / rows); g.stroke();
        for (let k = 0; k < 12; k++) {
          g.strokeStyle = `rgba(90,50,25,${rnd() * 0.15})`;
          g.lineWidth = 1;
          const yy = y + rnd() * (s / rows);
          g.beginPath(); g.moveTo(0, yy); g.bezierCurveTo(s * 0.3, yy + 3, s * 0.6, yy - 3, s, yy); g.stroke();
        }
      }
    });
  },
  /** Velvet fabric (station curtains, seats). */
  velvet(base = '#7a2a52'): THREE.CanvasTexture {
    return make(`velvet${base}`, 128, 1.2, (g, s, rnd) => {
      const grd = g.createLinearGradient(0, 0, s, 0);
      for (let i = 0; i <= 8; i++) grd.addColorStop(i / 8, i % 2 ? base : shade(base, -0.25));
      g.fillStyle = grd;
      g.fillRect(0, 0, s, s);
      speckle(g, s, rnd, 1500, 0.08, true);
    });
  },
  /** Cardboard with tape strip (Parcel Husks). */
  cardboard(): THREE.CanvasTexture {
    return make('cardboard', 128, 0.8, (g, s, rnd) => {
      g.fillStyle = '#b98a58';
      g.fillRect(0, 0, s, s);
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = `rgba(120,80,40,${rnd() * 0.25})`;
        g.beginPath(); g.moveTo(0, rnd() * s); g.lineTo(s, rnd() * s); g.stroke();
      }
      g.fillStyle = 'rgba(230,210,170,0.7)';
      g.fillRect(s * 0.42, 0, s * 0.16, s);
      speckle(g, s, rnd, 600, 0.15);
    });
  },
  /** Grid of lit windows for distant towers (use as emissive). */
  windows(lit = '#ffe0a8', dark = '#5b4f72', density = 0.5, name = 'win'): THREE.CanvasTexture {
    return make(`${name}${lit}${dark}${density}`, 256, 8, (g, s, rnd) => {
      g.fillStyle = dark;
      g.fillRect(0, 0, s, s);
      const n = 8;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          const on = rnd() < density;
          g.fillStyle = on ? lit : shade(dark, 0.18);
          g.fillRect((i * s) / n + 6, (j * s) / n + 6, s / n - 12, s / n - 14);
        }
    });
  },
  /** Kids' wallpaper with stars and moons. */
  nursery(base = '#bfe3f2', ink = '#fff7c9'): THREE.CanvasTexture {
    return make(`nursery${base}`, 256, 3, (g, s, rnd) => {
      g.fillStyle = base;
      g.fillRect(0, 0, s, s);
      g.fillStyle = ink;
      for (let i = 0; i < 14; i++) star(g, rnd() * s, rnd() * s, 6 + rnd() * 8);
      g.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        const x = rnd() * s, y = rnd() * s;
        g.arc(x, y, 14, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = base;
        g.beginPath(); g.arc(x + 6, y - 4, 12, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.5)';
      }
    });
  },
  /** Stained concrete (maintenance layer). */
  concrete(base = '#7d8a8c'): THREE.CanvasTexture {
    return make(`concrete${base}`, 256, 4, (g, s, rnd) => {
      g.fillStyle = base;
      g.fillRect(0, 0, s, s);
      speckle(g, s, rnd, 8000, 0.12);
      speckle(g, s, rnd, 3000, 0.07, true);
      for (let i = 0; i < 6; i++) {
        const x = rnd() * s;
        const grd = g.createLinearGradient(x, 0, x + 20, s);
        grd.addColorStop(0, 'rgba(60,40,30,0.0)');
        grd.addColorStop(0.5, 'rgba(60,40,30,0.18)');
        grd.addColorStop(1, 'rgba(60,40,30,0.0)');
        g.fillStyle = grd;
        g.fillRect(x, 0, 18, s);
      }
      g.strokeStyle = 'rgba(30,30,30,0.3)';
      g.strokeRect(1, 1, s - 2, s - 2);
    });
  },
  /** Soft grey "unfinished" checker (Ch9 placeholder-world look, used deliberately). */
  unfinished(): THREE.CanvasTexture {
    return make('unfinished', 128, 2, (g, s) => {
      g.fillStyle = '#c9c9cf';
      g.fillRect(0, 0, s, s);
      g.fillStyle = '#b4b4bc';
      g.fillRect(0, 0, s / 2, s / 2);
      g.fillRect(s / 2, s / 2, s / 2, s / 2);
      g.strokeStyle = 'rgba(40,40,60,0.5)';
      g.lineWidth = 2;
      g.strokeRect(0, 0, s, s);
    });
  },
  /** Painted sign / label texture. */
  sign(text: string, opts: { bg?: string; fg?: string; w?: number; h?: number; font?: string } = {}): THREE.CanvasTexture {
    const w = opts.w ?? 512;
    const h = opts.h ?? 128;
    const key = `sign:${text}:${opts.bg}:${opts.fg}:${w}x${h}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d')!;
    g.fillStyle = opts.bg ?? '#2a1e3a';
    g.fillRect(0, 0, w, h);
    g.fillStyle = opts.fg ?? '#ffe7b8';
    g.font = opts.font ?? `600 ${Math.floor(h * 0.5)}px "Fredoka Variable", "Nunito", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    cache.set(key, t);
    return t;
  },
  /** Radial soft dot (particles, blob shadows, glows). */
  softDot(): THREE.CanvasTexture {
    return make('softDot', 64, 1, (g, s) => {
      const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      grd.addColorStop(0, 'rgba(255,255,255,1)');
      grd.addColorStop(0.4, 'rgba(255,255,255,0.5)');
      grd.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grd;
      g.fillRect(0, 0, s, s);
    }, false);
  },
  clear(): void {
    for (const t of cache.values()) t.dispose();
    cache.clear();
  },
};

function star(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

function shade(hex: string, amt: number): string {
  const c = new THREE.Color(hex);
  if (amt < 0) c.multiplyScalar(1 + amt);
  else c.lerp(new THREE.Color(1, 1, 1), amt);
  return `#${c.getHexString()}`;
}
