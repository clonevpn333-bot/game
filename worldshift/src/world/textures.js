import * as THREE from 'three';
import { hash32 } from '../core/mathx.js';

// Procedural, tileable PBR surface textures packed into two texture arrays:
//   albedoRough: RGB = albedo (sRGB), A = roughness
//   normalAO:    RGB = tangent-space normal, A = ambient occlusion / cavity
// Every world surface samples these by layer index, so a whole chunk can be
// drawn with a single material.

export const TEX = 512;

export const LAYER = {
  brick: 0, brickTan: 1, concrete: 2, plaster: 3, siding: 4, corrugated: 5, stone: 6, panel: 7,
  asphalt: 8, sidewalk: 9, grass: 10, dirt: 11, moss: 12, bark: 13, rust: 14, wood: 15,
  tiles: 16, gravel: 17, metal: 18, fabric: 19, rubble: 20, paint: 21, carpet: 22, sand: 23,
};
export const LAYER_COUNT = 24;

// metres covered by one texture repeat
export const LAYER_TILE_M = [
  2.0, 2.0, 4.0, 3.0, 2.4, 2.0, 3.0, 4.0,
  6.0, 3.0, 4.0, 4.0, 3.0, 1.5, 2.0, 2.0,
  2.0, 3.0, 2.0, 1.0, 4.0, 2.0, 2.0, 4.0,
];

// ---------------------------------------------------------------- noise ----
function lat(ix, iy, P, seed) {
  ix = ((ix % P) + P) % P;
  iy = ((iy % P) + P) % P;
  return hash32((ix * 73856093) ^ (iy * 19349663) ^ (seed * 83492791)) / 4294967296;
}
function pnoise(x, y, P, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = lat(ix, iy, P, seed), b = lat(ix + 1, iy, P, seed);
  const c = lat(ix, iy + 1, P, seed), d = lat(ix + 1, iy + 1, P, seed);
  return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
}
// u,v in [0,1); base period = number of lattice cells across the tile
function fbm(u, v, P, oct, seed, gain = 0.5) {
  let s = 0, amp = 0.5, n = 0, p = P;
  for (let o = 0; o < oct; o++) {
    s += amp * pnoise(u * p, v * p, p, seed + o * 13);
    n += amp;
    amp *= gain;
    p *= 2;
  }
  return s / n;
}
// periodic worley: returns [F1, F2, cellHash]
const _w = [0, 0, 0];
function worley(u, v, C, seed) {
  const x = u * C, y = v * C;
  const ix = Math.floor(x), iy = Math.floor(y);
  let f1 = 9, f2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) {
    for (let i = -1; i <= 1; i++) {
      const cx = ix + i, cy = iy + j;
      const wx = ((cx % C) + C) % C, wy = ((cy % C) + C) % C;
      const h = hash32((wx * 92837111) ^ (wy * 689287499) ^ (seed * 283923481));
      const px = cx + (h & 1023) / 1023;
      const py = cy + ((h >>> 10) & 1023) / 1023;
      const d = Math.hypot(px - x, py - y);
      if (d < f1) { f2 = f1; f1 = d; id = h; } else if (d < f2) f2 = d;
    }
  }
  _w[0] = f1; _w[1] = f2; _w[2] = id / 4294967296;
  return _w;
}
const sat = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const mix = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, v) => { const t = sat((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const h01 = (a, b = 0, s = 0) => hash32((a * 374761393) ^ (b * 668265263) ^ (s * 1274126177)) / 4294967296;

// ------------------------------------------------------------ generators ---
// Each generator fills H (height 0..1), R,Gc,B (sRGB 0..1), RO (roughness)
function genBrick(ctx, tan) {
  const { N, H, R, Gc, B, RO } = ctx;
  const rows = 28, perRow = 9;
  const mortar = 0.11; // fraction of course height
  const base = tan ? [0.74, 0.6, 0.44] : [0.58, 0.24, 0.17];
  const alt = tan ? [0.62, 0.5, 0.38] : [0.44, 0.17, 0.13];
  const mort = tan ? [0.7, 0.68, 0.63] : [0.62, 0.6, 0.57];
  for (let py = 0; py < N; py++) {
    const v = py / N;
    const ry = v * rows;
    const row = Math.floor(ry);
    const fy = ry - row;
    for (let px = 0; px < N; px++) {
      const u = px / N;
      const off = (row & 1) * 0.5;
      const rx = u * perRow + off;
      const col = Math.floor(rx);
      const fx = rx - col;
      const bid = h01(((col % perRow) + perRow) % perRow, row, tan ? 7 : 3);
      // distance to mortar edge in course-height units
      const ex = Math.min(fx, 1 - fx) * (rows / perRow) * 3.2;
      const ey = Math.min(fy, 1 - fy);
      const e = Math.min(ex, ey);
      const n = fbm(u, v, 32, 3, 11);
      const chip = fbm(u, v, 64, 2, 21);
      const inBrick = sstep(mortar * 0.5, mortar * 0.5 + 0.06 + chip * 0.05, e);
      const i = py * N + px;
      const burnt = bid < 0.12 ? 0.55 : 1;
      const t = h01(row, ((col % perRow) + perRow) % perRow, 99);
      let br = mix(base[0], alt[0], t) * burnt, bg = mix(base[1], alt[1], t) * burnt, bb = mix(base[2], alt[2], t) * burnt;
      const sp = 0.85 + 0.3 * n;
      br *= sp; bg *= sp; bb *= sp;
      const mn = 0.9 + 0.2 * fbm(u, v, 128, 2, 5);
      R[i] = mix(mort[0] * mn, br, inBrick);
      Gc[i] = mix(mort[1] * mn, bg, inBrick);
      B[i] = mix(mort[2] * mn, bb, inBrick);
      H[i] = inBrick * (0.75 + 0.25 * n) + 0.1 * chip;
      RO[i] = mix(0.97, 0.82 + 0.1 * n, inBrick);
    }
  }
}

function genConcrete(ctx, opts = {}) {
  const { N, H, R, Gc, B, RO } = ctx;
  const tone = opts.tone || [0.62, 0.61, 0.58];
  const seams = opts.seams !== false;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N;
      const i = py * N + px;
      const big = fbm(u, v, 4, 4, 31);
      const mid = fbm(u, v, 16, 3, 41);
      const fine = pnoise(u * 256, v * 256, 256, 51);
      const pore = pnoise(u * 180, v * 180, 180, 61) > 0.86 ? 1 : 0;
      let k = 0.82 + 0.25 * (big - 0.5) + 0.12 * (mid - 0.5) + 0.06 * (fine - 0.5);
      let h = 0.6 + 0.15 * mid + 0.05 * fine - pore * 0.35;
      if (seams) {
        const su = (u * 3) % 1, sv = (v * 3) % 1;
        const sd = Math.min(su, 1 - su, sv, 1 - sv);
        const seam = 1 - sstep(0.0, 0.006, sd);
        k -= seam * 0.18;
        h -= seam * 0.4;
        // form-tie holes
        const tu = (u * 9) % 1, tv = (v * 6) % 1;
        const td = Math.hypot(tu - 0.5, tv - 0.5);
        if (td < 0.06) { k -= 0.25; h -= 0.5; }
      }
      // rain streaks
      const streak = fbm(u * 6, v * 0.5, 8, 2, 71);
      k -= sstep(0.55, 0.8, streak) * 0.12;
      R[i] = tone[0] * k; Gc[i] = tone[1] * k; B[i] = tone[2] * k;
      H[i] = sat(h);
      RO[i] = 0.86 + 0.1 * mid - pore * 0.1;
    }
  }
}

function genPlaster(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const bump = fbm(u, v, 64, 3, 81);
      const blot = fbm(u, v, 6, 4, 91);
      const w = worley(u, v, 7, 13);
      const crack = (1 - sstep(0.0, 0.02, w[1] - w[0])) * sstep(0.55, 0.7, fbm(u, v, 5, 2, 17));
      let k = 0.88 + 0.12 * (blot - 0.5) + 0.05 * (bump - 0.5) - crack * 0.35;
      R[i] = 0.86 * k; Gc[i] = 0.82 * k; B[i] = 0.74 * k;
      H[i] = sat(0.5 + 0.4 * (bump - 0.5) - crack * 0.5);
      RO[i] = 0.92;
    }
  }
}

function genSiding(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  const boards = 12;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    const bv = v * boards, bf = bv - Math.floor(bv), bi = Math.floor(bv);
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const grain = fbm(u * 1, v * 8, 16, 3, 101 + bi);
      const chip = fbm(u, v, 24, 3, 111);
      const peeled = sstep(0.68, 0.72, chip);
      const lap = bf; // thicker at bottom of each board
      const shadow = 1 - sstep(0.0, 0.08, bf);
      let k = 0.95 - shadow * 0.45 + (grain - 0.5) * 0.06;
      const paint = [0.9, 0.9, 0.86];
      const wood = [0.55, 0.42, 0.3];
      R[i] = mix(paint[0], wood[0], peeled) * k;
      Gc[i] = mix(paint[1], wood[1], peeled) * k;
      B[i] = mix(paint[2], wood[2], peeled) * k;
      H[i] = sat(0.3 + 0.6 * lap - shadow * 0.3 - peeled * 0.1);
      RO[i] = mix(0.7, 0.9, peeled);
    }
  }
}

function genCorrugated(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  const ridges = 26;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const s = Math.sin(u * ridges * Math.PI * 2);
      const streak = fbm(u * 2, v * 0.3, 16, 3, 121);
      const rustN = fbm(u, v, 8, 4, 131);
      const rust = sstep(0.6, 0.75, rustN + (1 - v) * 0.15);
      let k = 0.68 + 0.12 * s + (streak - 0.5) * 0.15;
      R[i] = mix(0.62 * k, 0.48, rust);
      Gc[i] = mix(0.64 * k, 0.26, rust);
      B[i] = mix(0.66 * k, 0.14, rust);
      H[i] = 0.5 + 0.45 * s;
      RO[i] = mix(0.45, 0.9, rust);
    }
  }
}

function genStone(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  const rows = 6, per = 3;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    const ry = v * rows, row = Math.floor(ry), fy = ry - row;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const off = h01(row, 0, 501) * 0.9;
      const rx = u * per + off, col = Math.floor(rx), fx = rx - col;
      const e = Math.min(Math.min(fx, 1 - fx) * 2.0, Math.min(fy, 1 - fy));
      const inS = sstep(0.015, 0.05, e);
      const t = h01(((col % per) + per) % per, row, 77);
      const n = fbm(u, v, 24, 4, 141);
      let k = (0.82 + 0.16 * t) * (0.88 + 0.24 * n);
      R[i] = mix(0.55, 0.8 * k, inS);
      Gc[i] = mix(0.53, 0.76 * k, inS);
      B[i] = mix(0.5, 0.68 * k, inS);
      H[i] = inS * (0.7 + 0.3 * n);
      RO[i] = 0.8 + 0.1 * n;
    }
  }
}

function genPanel(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  const cx = 4, cy = 8;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    const ry = v * cy, row = Math.floor(ry), fy = ry - row;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const rx = u * cx, col = Math.floor(rx), fx = rx - col;
      const e = Math.min(Math.min(fx, 1 - fx) * 0.5, Math.min(fy, 1 - fy));
      const seam = 1 - sstep(0.012, 0.02, e);
      const t = h01(col, row, 201);
      const n = fbm(u, v, 32, 3, 211);
      let k = 0.78 + 0.1 * t + 0.04 * n;
      let h = 0.7 - seam * 0.6;
      // vents on some panels
      if (t > 0.78) {
        const vs = Math.sin(fy * 60) > 0.4 && fx > 0.15 && fx < 0.85 && fy > 0.2 && fy < 0.8;
        if (vs) { k *= 0.35; h -= 0.3; }
      }
      // bolts
      const bd = Math.min(Math.hypot(fx - 0.04, fy - 0.08), Math.hypot(fx - 0.96, fy - 0.08), Math.hypot(fx - 0.04, fy - 0.92), Math.hypot(fx - 0.96, fy - 0.92));
      if (bd < 0.018) { h += 0.2; k *= 0.8; }
      k -= seam * 0.4;
      R[i] = 0.74 * k; Gc[i] = 0.77 * k; B[i] = 0.8 * k;
      H[i] = sat(h);
      RO[i] = 0.32 + 0.15 * n + seam * 0.4;
    }
  }
}

function genAsphalt(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const ag = pnoise(u * 300, v * 300, 300, 301);
      const ag2 = pnoise(u * 140, v * 140, 140, 311);
      const big = fbm(u, v, 5, 4, 321);
      const w = worley(u, v, 5, 331);
      const crackMask = sstep(0.58, 0.7, fbm(u, v, 6, 3, 341));
      const crack = (1 - sstep(0.0, 0.012, w[1] - w[0])) * crackMask;
      const patch = sstep(0.72, 0.74, fbm(u, v, 3, 2, 351));
      let k = 0.22 + 0.06 * (big - 0.5) + 0.07 * (ag - 0.5) + (ag2 > 0.8 ? 0.06 : 0) - patch * 0.06 - crack * 0.12;
      R[i] = k; Gc[i] = k * 1.0; B[i] = k * 1.03;
      H[i] = sat(0.55 + 0.25 * (ag - 0.5) + 0.2 * (ag2 - 0.5) - crack * 0.5);
      RO[i] = 0.88 + 0.08 * ag - patch * 0.1;
    }
  }
}

function genSidewalk(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  const per = 2;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const sx = u * per, sy = v * per;
      const fx = sx - Math.floor(sx), fy = sy - Math.floor(sy);
      const e = Math.min(fx, 1 - fx, fy, 1 - fy);
      const seam = 1 - sstep(0.004, 0.012, e);
      const t = h01(Math.floor(sx), Math.floor(sy), 401);
      const n = fbm(u, v, 24, 4, 411);
      const fine = pnoise(u * 256, v * 256, 256, 421);
      const stain = sstep(0.62, 0.8, fbm(u, v, 6, 3, 431));
      const gum = pnoise(u * 90, v * 90, 90, 441) > 0.93 ? 1 : 0;
      let k = (0.72 + 0.06 * t) * (0.92 + 0.12 * n) + (fine - 0.5) * 0.05 - stain * 0.12 - seam * 0.25 - gum * 0.2;
      R[i] = k; Gc[i] = k * 0.99; B[i] = k * 0.96;
      H[i] = sat(0.7 - seam * 0.6 + 0.1 * fine);
      RO[i] = 0.84 - stain * 0.08;
    }
  }
}

function genGrass(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const blades = pnoise(u * 220, v * 60, 220, 501) * 0.6 + pnoise(u * 60, v * 220, 220, 511) * 0.4;
      const patch = fbm(u, v, 6, 4, 521);
      const dry = sstep(0.55, 0.75, patch);
      const k = 0.7 + 0.5 * (blades - 0.5);
      R[i] = mix(0.2, 0.5, dry) * k;
      Gc[i] = mix(0.42, 0.48, dry) * k;
      B[i] = mix(0.12, 0.22, dry) * k;
      H[i] = blades;
      RO[i] = 0.95;
    }
  }
}

function genDirt(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const n = fbm(u, v, 12, 5, 601);
      const w = worley(u, v, 40, 611);
      const pebble = sstep(0.32, 0.18, w[0]) * (w[2] > 0.6 ? 1 : 0);
      const k = 0.8 + 0.35 * (n - 0.5) + pebble * 0.25;
      R[i] = 0.46 * k; Gc[i] = 0.36 * k; B[i] = 0.26 * k;
      H[i] = sat(0.4 + 0.4 * n + pebble * 0.4);
      RO[i] = 0.96;
    }
  }
}

function genMoss(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const w = worley(u, v, 24, 701);
      const clump = 1 - sat(w[0] * 1.6);
      const n = fbm(u, v, 32, 4, 711);
      const k = 0.55 + 0.6 * clump * n;
      R[i] = 0.2 * k; Gc[i] = 0.38 * k; B[i] = 0.1 * k;
      H[i] = sat(clump * 0.7 + n * 0.3);
      RO[i] = 0.9;
    }
  }
}

function genBark(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const warp = fbm(u, v, 4, 3, 801) * 0.3;
      const ridge = Math.abs(Math.sin((u + warp) * Math.PI * 14));
      const n = fbm(u * 2, v * 0.5, 16, 4, 811);
      const k = 0.55 + 0.5 * ridge * n;
      R[i] = 0.4 * k; Gc[i] = 0.32 * k; B[i] = 0.25 * k;
      H[i] = sat(ridge * 0.7 + n * 0.3);
      RO[i] = 0.95;
    }
  }
}

function genRust(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const n = fbm(u, v, 8, 5, 901);
      const pit = pnoise(u * 120, v * 120, 120, 911) > 0.82 ? 1 : 0;
      const flake = sstep(0.5, 0.7, fbm(u, v, 20, 3, 921));
      const k = 0.7 + 0.5 * (n - 0.5);
      R[i] = mix(0.52, 0.36, flake) * k;
      Gc[i] = mix(0.27, 0.2, flake) * k;
      B[i] = mix(0.13, 0.12, flake) * k;
      H[i] = sat(0.5 + 0.3 * n - pit * 0.4 + flake * 0.1);
      RO[i] = 0.85 + 0.1 * flake;
    }
  }
}

function genWood(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  const planks = 12;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const pu = u * planks, pi = Math.floor(pu), pf = pu - pi;
      const off = h01(pi, 0, 1001);
      const grain = Math.sin((v + off) * 80 + fbm(u, v, 8, 3, 1011 + pi) * 12) * 0.5 + 0.5;
      const gap = 1 - sstep(0.0, 0.03, Math.min(pf, 1 - pf));
      const endJoint = ((v + off * 3) % 1) < 0.004 ? 1 : 0;
      const t = 0.8 + 0.25 * h01(pi, 1, 1021);
      const k = t * (0.85 + 0.15 * grain) - gap * 0.5 - endJoint * 0.4;
      R[i] = 0.55 * k; Gc[i] = 0.38 * k; B[i] = 0.24 * k;
      H[i] = sat(0.7 - gap * 0.6 + grain * 0.1);
      RO[i] = 0.7;
    }
  }
}

function genTiles(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  const per = 6;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const sx = u * per, sy = v * per;
      const fx = sx - Math.floor(sx), fy = sy - Math.floor(sy);
      const e = Math.min(fx, 1 - fx, fy, 1 - fy);
      const grout = 1 - sstep(0.02, 0.035, e);
      const checker = (Math.floor(sx) + Math.floor(sy)) & 1;
      const t = h01(Math.floor(sx), Math.floor(sy), 1101) * 0.08;
      const n = fbm(u, v, 16, 3, 1111);
      const k = (checker ? 0.86 : 0.78) + t + (n - 0.5) * 0.05;
      R[i] = mix(k, 0.45, grout); Gc[i] = mix(k * 0.98, 0.44, grout); B[i] = mix(k * 0.95, 0.42, grout);
      H[i] = 1 - grout * 0.7;
      RO[i] = mix(0.25, 0.9, grout);
    }
  }
}

function genGravel(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const w = worley(u, v, 90, 1201);
      const stone = 1 - sat(w[0] * 1.8);
      const t = w[2];
      const k = 0.35 + 0.35 * stone * (0.6 + 0.4 * t);
      R[i] = k; Gc[i] = k * 0.98; B[i] = k * 0.95;
      H[i] = stone;
      RO[i] = 0.92;
    }
  }
}

function genMetal(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const brushed = pnoise(u * 400, v * 8, 400, 1301);
      const scratch = pnoise(u * 30, v * 300, 300, 1311) > 0.9 ? 1 : 0;
      const n = fbm(u, v, 6, 3, 1321);
      const k = 0.62 + 0.08 * brushed + 0.1 * (n - 0.5) + scratch * 0.08;
      R[i] = k; Gc[i] = k; B[i] = k * 1.02;
      H[i] = 0.5 + 0.1 * brushed;
      RO[i] = 0.35 + 0.15 * n - scratch * 0.1;
    }
  }
}

function genFabric(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const wx = Math.sin(u * Math.PI * 2 * 96), wy = Math.sin(v * Math.PI * 2 * 96);
      const weave = 0.5 + 0.25 * (wx * (wy > 0 ? 1 : -1));
      const n = fbm(u, v, 16, 3, 1401);
      const k = 0.8 + 0.2 * weave + 0.1 * (n - 0.5);
      R[i] = k; Gc[i] = k; B[i] = k;
      H[i] = weave;
      RO[i] = 0.95;
    }
  }
}

function genRubble(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const w = worley(u, v, 18, 1501);
      const chunk = sat((w[1] - w[0]) * 3.0);
      const w2 = worley(u, v, 60, 1511);
      const small = sat((w2[1] - w2[0]) * 3.0);
      const n = fbm(u, v, 12, 3, 1521);
      const brickBit = w[2] > 0.75;
      const k = 0.5 + 0.3 * chunk + 0.1 * small + 0.15 * (n - 0.5);
      R[i] = brickBit ? 0.5 * k : 0.58 * k;
      Gc[i] = brickBit ? 0.28 * k : 0.56 * k;
      B[i] = brickBit ? 0.2 * k : 0.52 * k;
      H[i] = sat(chunk * 0.7 + small * 0.3);
      RO[i] = 0.93;
    }
  }
}

function genPaint(ctx) {
  // smooth painted surface (car bodies, signs, painted metal), subtle orange peel
  const { N, H, R, Gc, B, RO } = ctx;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const n = fbm(u, v, 48, 2, 1601);
      const chip = fbm(u, v, 10, 4, 1611);
      const chipped = sstep(0.74, 0.76, chip);
      const k = 0.94 + 0.04 * n;
      R[i] = mix(k, 0.4, chipped); Gc[i] = mix(k, 0.38, chipped); B[i] = mix(k, 0.36, chipped);
      H[i] = 0.5 + 0.05 * n - chipped * 0.3;
      RO[i] = mix(0.4, 0.8, chipped);
    }
  }
}

function genCarpet(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const fib = pnoise(u * 300, v * 300, 300, 1701);
      const pat = (Math.floor(u * 16) + Math.floor(v * 16)) & 1;
      const n = fbm(u, v, 8, 3, 1711);
      const k = 0.75 + 0.2 * fib + 0.1 * (n - 0.5) + pat * 0.06;
      R[i] = k; Gc[i] = k; B[i] = k;
      H[i] = fib;
      RO[i] = 1.0;
    }
  }
}

function genSand(ctx) {
  const { N, H, R, Gc, B, RO } = ctx;
  for (let py = 0; py < N; py++) {
    const v = py / N;
    for (let px = 0; px < N; px++) {
      const u = px / N, i = py * N + px;
      const ripple = Math.sin((v + fbm(u, v, 4, 2, 1801) * 0.4) * Math.PI * 2 * 18) * 0.5 + 0.5;
      const g = pnoise(u * 256, v * 256, 256, 1811);
      const k = 0.85 + 0.1 * ripple + 0.1 * (g - 0.5);
      R[i] = 0.76 * k; Gc[i] = 0.68 * k; B[i] = 0.52 * k;
      H[i] = 0.4 + 0.3 * ripple + 0.2 * g;
      RO[i] = 0.95;
    }
  }
}

const GENERATORS = [
  (c) => genBrick(c, false), (c) => genBrick(c, true), (c) => genConcrete(c), genPlaster, genSiding, genCorrugated, genStone, genPanel,
  genAsphalt, genSidewalk, genGrass, genDirt, genMoss, genBark, genRust, genWood,
  genTiles, genGravel, genMetal, genFabric, genRubble, genPaint, genCarpet, genSand,
];
// normal-map strength per layer
const NSTRENGTH = [
  5, 5, 3, 3, 6, 4, 5, 4,
  3, 4, 3, 4, 5, 6, 4, 4,
  4, 5, 1.5, 2, 6, 1, 2, 3,
];

function packLayer(ctx, layer, albedo, normal) {
  const { N, H, R, Gc, B, RO } = ctx;
  const s = NSTRENGTH[layer];
  const off = layer * N * N * 4;
  for (let y = 0; y < N; y++) {
    const ym = ((y - 1 + N) % N) * N, yp = ((y + 1) % N) * N, yr = y * N;
    for (let x = 0; x < N; x++) {
      const i = yr + x;
      const xm = (x - 1 + N) % N, xp = (x + 1) % N;
      const dx = (H[yr + xp] - H[yr + xm]) * s;
      const dy = (H[yp + x] - H[ym + x]) * s;
      let nx = -dx, ny = -dy, nz = 1;
      const l = 1 / Math.hypot(nx, ny, nz);
      nx *= l; ny *= l; nz *= l;
      // cavity AO from local height vs neighbourhood
      const avg = (H[yr + xp] + H[yr + xm] + H[yp + x] + H[ym + x]) * 0.25;
      const ao = sat(0.75 + (H[i] - avg) * 3 + H[i] * 0.25);
      const o = off + i * 4;
      albedo[o] = Math.round(sat(R[i]) * 255);
      albedo[o + 1] = Math.round(sat(Gc[i]) * 255);
      albedo[o + 2] = Math.round(sat(B[i]) * 255);
      albedo[o + 3] = Math.round(sat(RO[i]) * 255);
      normal[o] = Math.round((nx * 0.5 + 0.5) * 255);
      normal[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normal[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      normal[o + 3] = Math.round(ao * 255);
    }
  }
}

// Generates all layers. Yields between layers so a loading bar can update.
export async function generateSurfaceTextures(onProgress) {
  const N = TEX;
  const albedo = new Uint8Array(N * N * 4 * LAYER_COUNT);
  const normal = new Uint8Array(N * N * 4 * LAYER_COUNT);
  const ctx = {
    N,
    H: new Float32Array(N * N), R: new Float32Array(N * N), Gc: new Float32Array(N * N),
    B: new Float32Array(N * N), RO: new Float32Array(N * N),
  };
  for (let l = 0; l < LAYER_COUNT; l++) {
    GENERATORS[l](ctx);
    packLayer(ctx, l, albedo, normal);
    if (onProgress) onProgress((l + 1) / LAYER_COUNT);
    await new Promise((r) => setTimeout(r, 0));
  }
  const albTex = new THREE.DataArrayTexture(albedo, N, N, LAYER_COUNT);
  albTex.format = THREE.RGBAFormat;
  albTex.type = THREE.UnsignedByteType;
  albTex.colorSpace = THREE.SRGBColorSpace;
  albTex.wrapS = albTex.wrapT = THREE.RepeatWrapping;
  albTex.minFilter = THREE.LinearMipmapLinearFilter;
  albTex.magFilter = THREE.LinearFilter;
  albTex.generateMipmaps = true;
  albTex.anisotropy = 8;
  albTex.needsUpdate = true;

  const nrmTex = new THREE.DataArrayTexture(normal, N, N, LAYER_COUNT);
  nrmTex.format = THREE.RGBAFormat;
  nrmTex.type = THREE.UnsignedByteType;
  nrmTex.colorSpace = THREE.NoColorSpace;
  nrmTex.wrapS = nrmTex.wrapT = THREE.RepeatWrapping;
  nrmTex.minFilter = THREE.LinearMipmapLinearFilter;
  nrmTex.magFilter = THREE.LinearFilter;
  nrmTex.generateMipmaps = true;
  nrmTex.anisotropy = 8;
  nrmTex.needsUpdate = true;
  return { albedo: albTex, normal: nrmTex };
}

// Foliage card texture: clusters of leaves with alpha.
export function makeLeafTexture() {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.clearRect(0, 0, S, S);
  let seed = 12345;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 900; i++) {
    const x = rnd() * S, y = rnd() * S;
    const cx = x - S / 2, cy = y - S / 2;
    if (cx * cx + cy * cy > (S * 0.48) ** 2) continue;
    const a = rnd() * Math.PI * 2;
    const len = 14 + rnd() * 16;
    const shade = 0.55 + rnd() * 0.45;
    const hue = 85 + rnd() * 40;
    g.save();
    g.translate(x, y);
    g.rotate(a);
    g.fillStyle = `hsl(${hue}, ${45 + rnd() * 25}%, ${22 + shade * 22}%)`;
    g.beginPath();
    g.ellipse(0, 0, len * 0.5, len * 0.22, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = `rgba(20,40,10,0.35)`;
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(-len * 0.45, 0);
    g.lineTo(len * 0.45, 0);
    g.stroke();
    g.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeGrassTexture() {
  const W = 256, Hh = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = Hh;
  const g = c.getContext('2d');
  let seed = 777;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 140; i++) {
    const x = rnd() * W;
    const h = Hh * (0.45 + rnd() * 0.55);
    const lean = (rnd() - 0.5) * 40;
    const w = 2 + rnd() * 3;
    const grad = g.createLinearGradient(0, Hh, 0, Hh - h);
    const hue = 80 + rnd() * 30;
    grad.addColorStop(0, `hsl(${hue}, 45%, 14%)`);
    grad.addColorStop(1, `hsl(${hue - 10}, 55%, ${36 + rnd() * 16}%)`);
    g.fillStyle = grad;
    g.beginPath();
    g.moveTo(x - w, Hh);
    g.quadraticCurveTo(x + lean * 0.3, Hh - h * 0.6, x + lean, Hh - h);
    g.quadraticCurveTo(x + lean * 0.3 + w * 0.4, Hh - h * 0.6, x + w, Hh);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
