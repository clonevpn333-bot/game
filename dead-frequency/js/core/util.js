'use strict';
// Shared helpers and global game state.

const G = {
  time: 0,          // game time in seconds (pauses with the game)
  dt: 0,
  paused: true,
  running: false,
  mode: 'walk',     // walk | car | ui | hide | cutscene
  level: null,
  scene: null,
  camera: null,
  renderer: null,
  settings: { sens: 1.0, volume: 0.8, brightness: 1.0, vhs: 1.0, invertY: false, quality: 2 },
};

const U = {
  clamp: (v, a, b) => v < a ? a : (v > b ? b : v),
  lerp: (a, b, t) => a + (b - a) * t,
  damp: (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt)),
  smooth: t => t * t * (3 - 2 * t),
  rand: (a = 0, b = 1) => a + Math.random() * (b - a),
  randi: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
  pick: arr => arr[Math.floor(Math.random() * arr.length)],
  angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; },
  dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); },
  // deterministic PRNG so the world is the same every time
  seeded(seed) {
    let s = seed >>> 0;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  },
  // value noise 2D (for terrain)
  noise2(x, y, seed = 0) {
    const h = (i, j) => { let n = i * 374761393 + j * 668265263 + seed * 1442695041; n = (n ^ (n >> 13)) * 1274126177; return ((n ^ (n >> 16)) & 0xffff) / 65535; };
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  },
  fbm(x, y, seed = 0, oct = 4) {
    let v = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { v += amp * U.noise2(x * f, y * f, seed + i * 17); amp *= 0.5; f *= 2; }
    return v;
  },
  fmtClock(min) { // minutes since 00:00 (can exceed 1440)
    let m = Math.floor(min) % 1440; if (m < 0) m += 1440;
    let h = Math.floor(m / 60), mm = m % 60;
    const ap = h >= 12 ? 'PM' : 'AM';
    let h12 = h % 12; if (h12 === 0) h12 = 12;
    return `${h12}:${String(mm).padStart(2, '0')} ${ap}`;
  },
  fmtClock24(min) { let m = Math.floor(min) % 1440; if (m < 0) m += 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; },
  esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); },
  v3: (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z),
};

// tiny event bus
const Bus = {
  map: {},
  on(ev, fn) { (this.map[ev] = this.map[ev] || []).push(fn); return () => this.off(ev, fn); },
  off(ev, fn) { const a = this.map[ev]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } },
  emit(ev, ...args) { const a = this.map[ev]; if (a) for (const f of a.slice()) f(...args); },
  clear() { this.map = {}; },
};
