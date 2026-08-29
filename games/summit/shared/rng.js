/* Deterministic randomness shared by server and client. Same seed => same world. */

export function hash32(n) {
  n = Math.imul(n ^ (n >>> 16), 2246822507);
  n = Math.imul(n ^ (n >>> 13), 3266489909);
  return (n ^ (n >>> 16)) >>> 0;
}
export function seedFromString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** mulberry32 — small, fast, good enough, identical everywhere. */
export function rng(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const randRange = (r, a, b) => a + r() * (b - a);
export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

/* ---------- Perlin-style gradient noise ---------- */
export class Noise {
  constructor(seed) {
    const r = rng(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }
  static fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  grad2(hash, x, y) {
    switch (hash & 7) {
      case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y;
      case 4: return x; case 5: return -x; case 6: return y; default: return -y;
    }
  }
  /** 2D gradient noise in [-1,1]. */
  n2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = Noise.fade(xf), v = Noise.fade(yf);
    const p = this.perm;
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    const x1 = lerp(this.grad2(aa, xf, yf), this.grad2(ba, xf - 1, yf), u);
    const x2 = lerp(this.grad2(ab, xf, yf - 1), this.grad2(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v);
  }
  fbm(x, y, oct = 5, lac = 2.03, gain = 0.5) {
    let f = 1, a = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) { sum += this.n2(x * f, y * f) * a; norm += a; f *= lac; a *= gain; }
    return sum / norm;
  }
  /** Ridged multifractal — makes sharp crests and smooth valleys. */
  ridged(x, y, oct = 5, lac = 2.07, gain = 0.5) {
    let f = 1, a = 1, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) {
      const n = 1 - Math.abs(this.n2(x * f, y * f));
      sum += n * n * a; norm += a; f *= lac; a *= gain;
    }
    return sum / norm;
  }
}
export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const smoothstep = (a, b, t) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
