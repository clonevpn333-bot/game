/* The mountain. One deterministic function of the run seed, imported by BOTH the
 * authoritative server and every client, so nobody can disagree about the world.
 *
 *  - radial cone profile + ridged multifractal for dramatic crests
 *  - a guaranteed climbing route spiralling to the summit, carved as a corridor
 *    with periodic rest ledges so every run is climbable and readable
 *  - campfire checkpoints at each biome boundary, a helipad plateau at the top  */
import { Noise, rng, lerp, clamp, smoothstep, seedFromString } from './rng.js';
import { WORLD, BIOMES } from './constants.js';

const TAU = Math.PI * 2;
const R = WORLD.radius, RB = WORLD.beachRadius, SUMMIT = WORLD.summit;
const CELL = 70;                 // route spatial-hash cell size (m)
const CORRIDOR = 26;             // corridor half width (m)
const LEDGE_R = 7.5;

export function createWorld(seedInput) {
  const seed = typeof seedInput === 'string' ? seedFromString(seedInput) : (seedInput >>> 0);
  const nRidge = new Noise(seed ^ 0x9e3779b9);
  const nDetail = new Noise(seed ^ 0x51ed270b);
  const nWarp = new Noise(seed ^ 0x27d4eb2f);
  const nCliff = new Noise(seed ^ 0x165667b1);
  const rand = rng(seed ^ 0xdeadbeef);

  /* ---- radial profile (no route, no crater): the raw mountain ---- */
  function baseHeight(x, z) {
    const r = Math.hypot(x, z);
    const u = clamp(1 - r / RB, 0, 1);
    // warped domain keeps ridges from looking radially symmetric
    const wx = x + nWarp.n2(x * 0.00042, z * 0.00042) * 260;
    const wz = z + nWarp.n2(x * 0.00042 + 41.3, z * 0.00042 - 17.7) * 260;
    const cone = SUMMIT * Math.pow(u, 1.42);
    const ridgeAmp = SUMMIT * 0.36 * smoothstep(0.008, 0.30, u) * (1 - u * 0.34);
    const ridge = (nRidge.ridged(wx * 0.00078, wz * 0.00078, 6) - 0.42) * ridgeAmp;
    const cliffs = nCliff.fbm(wx * 0.0031, wz * 0.0031, 4) * 34 * smoothstep(0.02, 0.32, u);
    const detail = nDetail.fbm(wx * 0.011, wz * 0.011, 4) * 3.4;
    let h = cone + ridge + cliffs + detail;
    // terraced cliff bands: shelves with steep risers, strongest across the rock face
    const terrace = smoothstep(230, 430, h) * (1 - smoothstep(840, 1090, h)) *
      (0.30 + 0.50 * (nCliff.n2(wx * 0.0009, wz * 0.0009) * 0.5 + 0.5));
    if (terrace > 0.01) {
      const T = 27;
      const f = h / T, fi = Math.floor(f), fr = f - fi;
      h = lerp(h, (fi + smoothstep(0.42, 0.78, fr)) * T, terrace * 0.8);
    }
    // shoreline: a wide flat apron of sand, then a shelf into the water
    if (r > 2100) {
      const sand = smoothstep(2100, 2430, r);
      h = lerp(h, 2.2 + nDetail.fbm(x * 0.006, z * 0.006, 3) * 1.5, sand);
      const shelf = smoothstep(2440, 2920, r);
      h = lerp(h, -27, shelf);
    }
    // caldera: crater bowl inside the summit rim
    const crater = 250;
    if (r < crater) {
      const k = 1 - r / crater;
      h -= Math.pow(k, 1.7) * 210 * smoothstep(0, 0.22, k);
      h += Math.pow(smoothstep(0.55, 0.98, 1 - Math.abs(r / crater - 0.86) * 6), 1) * 46; // rim lip
    }
    return h;
  }

  /* ---- the guaranteed route ---- */
  const route = buildRoute();
  const grid = new Map();
  route.forEach((n, i) => {
    const key = cellKey(n.x, n.z);
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const k = `${(key.cx + dx)},${(key.cz + dz)}`;
      let list = grid.get(k); if (!list) grid.set(k, (list = []));
      list.push(i);
    }
  });
  function cellKey(x, z) { return { cx: Math.floor(x / CELL), cz: Math.floor(z / CELL) }; }
  function nearNodes(x, z) {
    const { cx, cz } = cellKey(x, z);
    return grid.get(`${cx},${cz}`) || null;
  }

  function buildRoute() {
    const nodes = [];
    const N = 168;
    const theta0 = rand() * TAU;
    const turns = 1.05 + rand() * 0.5;
    const dir = rand() < 0.5 ? 1 : -1;
    let prevY = 4;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const targetY = lerp(6, SUMMIT - 8, Math.pow(t, 1.18));
      const u = Math.pow(clamp(targetY / SUMMIT, 0, 1), 1 / 1.42);
      const rad = Math.max(34, RB * (1 - u));
      const wob = nWarp.n2(t * 5.1, 12.7) * 0.34 + nWarp.n2(t * 13.3, 4.1) * 0.12;
      const th = theta0 + dir * (t * turns * TAU + wob);
      const x = Math.cos(th) * rad, z = Math.sin(th) * rad;
      const bh = baseHeight(x, z);
      const y = clamp(bh, prevY + 1.2, prevY + 34);
      prevY = y;
      nodes.push({ i, t, x, y, z, ledge: i % 4 === 0, camp: false, r: rad });
    }
    // campfire checkpoints at each biome boundary
    for (let b = 1; b < BIOMES.length; b++) {
      const target = BIOMES[b].from;
      let best = 0, bd = Infinity;
      for (const n of nodes) { const d = Math.abs(n.y - target); if (d < bd) { bd = d; best = n.i; } }
      nodes[best].camp = true; nodes[best].ledge = true;
      nodes[best].campIndex = b - 1;
    }
    nodes[0].camp = false;
    return nodes;
  }

  const beachPad = (() => {
    const n = route[0];
    const th = Math.atan2(n.z, n.x);
    const rad = RB - 55;
    return { x: Math.cos(th) * rad, z: Math.sin(th) * rad, theta: th };
  })();

  /* ---- final height: base + corridor carving ---- */
  function height(x, z) {
    let h = baseHeight(x, z);
    const list = nearNodes(x, z);
    if (list) {
      let bestD = Infinity, best = null;
      for (const i of list) {
        const n = route[i];
        const d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
        if (d < bestD) { bestD = d; best = n; }
      }
      if (best) {
        const d = Math.sqrt(bestD);
        // wide soft corridor: pulls terrain toward the route line so the way up reads
        const w = smoothstep(CORRIDOR * 2.4, CORRIDOR * 0.35, d) * 0.62;
        if (w > 0.001) h = lerp(h, best.y + nDetail.fbm(x * 0.02, z * 0.02, 3) * 1.6, w);
        // rest ledges: small flat shelves the climb can breathe on
        if (best.ledge) {
          const lw = smoothstep(best.camp ? 17 : LEDGE_R, 0, d);
          if (lw > 0.001) h = lerp(h, best.y + 0.15, lw * (best.camp ? 0.98 : 0.8));
        }
      }
    }
    // helipad plateau at the summit, landing beach at the bottom
    const r = Math.hypot(x, z);
    if (r < 40) h = lerp(h, SUMMIT + 6, smoothstep(40, 16, r));
    const bd = Math.hypot(x - beachPad.x, z - beachPad.z);
    if (bd < 90) h = lerp(h, 2.6 + nDetail.fbm(x * 0.03, z * 0.03, 2) * 0.5, smoothstep(90, 30, bd));
    return h;
  }

  /** 0..1 — how strongly this point sits on the marked route (used for path wear). */
  function routeInfluence(x, z) {
    const list = nearNodes(x, z);
    if (!list) return 0;
    let bestD = Infinity;
    for (const i of list) {
      const n = route[i];
      const d = (n.x - x) * (n.x - x) + (n.z - z) * (n.z - z);
      if (d < bestD) bestD = d;
    }
    return smoothstep(CORRIDOR * 1.3, 4, Math.sqrt(bestD));
  }

  const EPS = 0.7;
  function normal(x, z, out = { x: 0, y: 1, z: 0 }) {
    const hL = height(x - EPS, z), hR = height(x + EPS, z);
    const hD = height(x, z - EPS), hU = height(x, z + EPS);
    let nx = hL - hR, ny = 2 * EPS, nz = hD - hU;
    const inv = 1 / Math.hypot(nx, ny, nz);
    out.x = nx * inv; out.y = ny * inv; out.z = nz * inv;
    return out;
  }
  const slope = (x, z) => normal(x, z).y; // cos(angle from vertical); 1 = flat

  const campfires = route.filter((n) => n.camp).map((n) => ({
    index: n.campIndex, x: n.x, y: height(n.x, n.z), z: n.z, biome: BIOMES[n.campIndex + 1].id,
  }));

  const beach = { ...beachPad, y: height(beachPad.x, beachPad.z), theta: beachPad.theta };

  /** Deterministic loot placements near the route (crates, luggage, food). */
  function lootSpots(count = 90) {
    const r2 = rng(seed ^ 0x1b873593);
    const out = [];
    for (let i = 0; i < count; i++) {
      const n = route[Math.floor(r2() * (route.length - 6)) + 3];
      const a = r2() * TAU, d = 6 + r2() * 30;
      const x = n.x + Math.cos(a) * d, z = n.z + Math.sin(a) * d;
      const y = height(x, z);
      if (slope(x, z) < 0.72) { i--; continue; }
      out.push({ id: 'l' + i, x, y, z, biome: BIOMES.findIndex((b) => y >= b.from && y < b.to), rollA: r2(), rollB: r2() });
      if (out.length >= count) break;
    }
    return out;
  }

  return {
    seed, route, campfires, beach,
    height, normal, slope, routeInfluence, baseHeight, lootSpots,
    summitPos: { x: 0, y: height(0, 0), z: 0 },
    noise: { detail: nDetail, ridge: nRidge, warp: nWarp },
  };
}
