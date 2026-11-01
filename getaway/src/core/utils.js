// GETAWAY! — shared math / helpers
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
export const smoothstep = (a, b, v) => { const t = invLerp(a, b, v); return t * t * (3 - 2 * t); };
// frame-rate independent exponential smoothing
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export const sign = (v) => (v < 0 ? -1 : 1);
export const wrapAngle = (a) => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
export const dampAngle = (a, b, lambda, dt) => a + wrapAngle(b - a) * (1 - Math.exp(-lambda * dt));
export const approach = (v, target, rate) => (v < target ? Math.min(target, v + rate) : Math.max(target, v - rate));

export function rand(a = 0, b = 1) { return a + Math.random() * (b - a); }
export function randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); }
export function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
export function chance(p) { return Math.random() < p; }

// deterministic RNG (mulberry32)
export function makeRng(seed) {
  let s = seed >>> 0;
  const r = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a, b) => a + r() * (b - a);
  r.int = (a, b) => Math.floor(a + r() * (b - a + 1));
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.chance = (p) => r() < p;
  return r;
}

// cheap value noise 1D / 2D for camera shake, wind etc.
const PERM = new Uint8Array(512);
{ const r = makeRng(1337); const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; }
const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const grad1 = (h, x) => ((h & 1) ? -x : x) * (1 + (h & 7) / 7);
export function noise1(x) {
  const i = Math.floor(x); const f = x - i; const u = fade(f);
  return lerp(grad1(PERM[i & 255], f), grad1(PERM[(i + 1) & 255], f - 1), u) * 0.5;
}
export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y); const xf = x - xi, yf = y - yi;
  const h = (a, b) => PERM[(PERM[a & 255] + b) & 255] / 255;
  const u = fade(xf), v = fade(yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}

export function distXZ(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); }
export function dist2XZ(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }

// Spatial hash for dynamic objects (rebuilt each frame)
export class SpatialHash {
  constructor(cell = 16) { this.cell = cell; this.map = new Map(); this.stamp = 0; }
  key(ix, iz) { return ix * 73856093 ^ iz * 19349663; }
  clear() { this.map.clear(); }
  insert(obj, x, z, r = 0) {
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const k = this.key(ix, iz); let l = this.map.get(k); if (!l) { l = []; this.map.set(k, l); } l.push(obj);
    }
  }
  query(x, z, r, out = []) {
    out.length = 0; this.stamp++;
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const l = this.map.get(this.key(ix, iz)); if (!l) continue;
      for (const o of l) { if (o._hs !== this.stamp) { o._hs = this.stamp; out.push(o); } }
    }
    return out;
  }
}

export class Pool {
  constructor(create) { this.create = create; this.free = []; }
  get() { return this.free.pop() || this.create(); }
  release(o) { this.free.push(o); }
}

export function fmtTime(t) {
  t = Math.max(0, t); const m = Math.floor(t / 60); const s = Math.floor(t % 60); const cs = Math.floor((t * 100) % 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export function hsl(h, s, l) { return `hsl(${h},${s}%,${l}%)`; }
