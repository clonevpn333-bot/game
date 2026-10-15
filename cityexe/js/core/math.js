export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
export const smoothstep = (a, b, v) => { const t = invLerp(a, b, v); return t * t * (3 - 2 * t); };
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t) => 1 - Math.pow(1 - t, 3);
export const dist2 = (ax, az, bx, bz) => { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
export const dist = (ax, az, bx, bz) => Math.sqrt(dist2(ax, az, bx, bz));
export const TAU = Math.PI * 2;

export function wrapAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}
export function approachAngle(a, target, maxStep) {
  const d = wrapAngle(target - a);
  return a + clamp(d, -maxStep, maxStep);
}
export function damp(a, b, lambda, dt) { return lerp(a, b, 1 - Math.exp(-lambda * dt)); }

// Polyline helpers. A polyline is {pts: Float32Array [x0,z0,x1,z1...], cum: Float32Array cumulative lengths, length}
export function makePolyline(points) {
  const n = points.length;
  const pts = new Float32Array(n * 2);
  const cum = new Float32Array(n);
  let L = 0;
  for (let i = 0; i < n; i++) {
    pts[i * 2] = points[i][0];
    pts[i * 2 + 1] = points[i][1];
    if (i > 0) L += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    cum[i] = L;
  }
  return { pts, cum, length: L, n };
}

// Sample position + heading at distance s. Writes into out {x,z,h}. hint speeds up sequential lookups.
export function samplePolyline(pl, s, out) {
  const { pts, cum, n } = pl;
  if (s <= 0) s = 0;
  if (s >= pl.length) s = pl.length;
  let i = 1;
  // binary search
  let lo = 1, hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < s) lo = mid + 1; else hi = mid;
  }
  i = lo;
  const s0 = cum[i - 1], s1 = cum[i];
  const t = s1 > s0 ? (s - s0) / (s1 - s0) : 0;
  const x0 = pts[(i - 1) * 2], z0 = pts[(i - 1) * 2 + 1], x1 = pts[i * 2], z1 = pts[i * 2 + 1];
  out.x = x0 + (x1 - x0) * t;
  out.z = z0 + (z1 - z0) * t;
  out.h = Math.atan2(x1 - x0, z1 - z0);
  return out;
}

// Closest point on polyline to (x,z): returns {s, d2}
export function projectPolyline(pl, x, z) {
  const { pts, cum, n } = pl;
  let best = Infinity, bestS = 0;
  for (let i = 1; i < n; i++) {
    const x0 = pts[(i - 1) * 2], z0 = pts[(i - 1) * 2 + 1], x1 = pts[i * 2], z1 = pts[i * 2 + 1];
    const dx = x1 - x0, dz = z1 - z0;
    const L2 = dx * dx + dz * dz;
    let t = L2 > 0 ? ((x - x0) * dx + (z - z0) * dz) / L2 : 0;
    t = clamp(t, 0, 1);
    const px = x0 + dx * t, pz = z0 + dz * t;
    const d2 = (px - x) * (px - x) + (pz - z) * (pz - z);
    if (d2 < best) { best = d2; bestS = cum[i - 1] + (cum[i] - cum[i - 1]) * t; }
  }
  return { s: bestS, d2: best };
}

export function quadBezierPoints(p0, p1, p2, segs) {
  const out = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs, u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
  return out;
}

// Segment-segment intersection test for conflict detection
export function segmentsIntersect(ax, az, bx, bz, cx, cz, dx, dz) {
  const d1 = (dx - cx) * (az - cz) - (dz - cz) * (ax - cx);
  const d2 = (dx - cx) * (bz - cz) - (dz - cz) * (bx - cx);
  const d3 = (bx - ax) * (cz - az) - (bz - az) * (cx - ax);
  const d4 = (bx - ax) * (dz - az) - (bz - az) * (dx - ax);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}

// Min-heap for A*
export class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(key, val) {
    const k = this.k, v = this.v;
    let i = k.length; k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v;
    const top = v[0];
    const lk = k.pop(), lv = v.pop();
    if (k.length > 0) {
      let i = 0; const n = k.length;
      while (true) {
        let l = 2 * i + 1, r = l + 1, m = i;
        let mk = lk;
        if (l < n && k[l] < mk) { m = l; mk = k[l]; }
        if (r < n && k[r] < mk) { m = r; mk = k[r]; }
        if (m === i) break;
        k[i] = k[m]; v[i] = v[m]; i = m;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
}

// Uniform spatial hash for dynamic objects (rebuilt per frame)
export class SpatialHash {
  constructor(cell = 16) { this.cell = cell; this.map = new Map(); }
  clear() { this.map.clear(); }
  key(cx, cz) { return (cx + 4096) * 8192 + (cz + 4096); }
  insert(obj, x, z) {
    const k = this.key(Math.floor(x / this.cell), Math.floor(z / this.cell));
    let a = this.map.get(k);
    if (!a) { a = []; this.map.set(k, a); }
    a.push(obj);
  }
  query(x, z, r, out) {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const z0 = Math.floor((z - r) / c), z1 = Math.floor((z + r) / c);
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
      const a = this.map.get(this.key(i, j));
      if (a) for (let n = 0; n < a.length; n++) out.push(a[n]);
    }
    return out;
  }
}
