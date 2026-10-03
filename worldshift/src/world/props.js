import * as THREE from 'three';
import { GeoBuffer } from './geo.js';
import { LAYER as L } from './textures.js';
import { RNG } from '../core/mathx.js';
import { CF, SURF } from './collision.js';

// Prop templates: small multi-material models (uber / emissive / foliage /
// holo / glass) with local colliders. Placed into chunk geometry by merging.

const C = (hex) => {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
};
// aMat helpers
const M = (layer, seed = 0) => [layer, -1, seed, 0];
const E = (pattern = 0, seed = 0, night = 0) => [0, pattern, seed, night];
const F = (sway = 0) => [0, -1, 0, sway];

class Template {
  constructor(name) {
    this.name = name;
    this.parts = {}; // kind -> GeoBuffer (then BufferGeometry)
    this.colliders = []; // {x0,y0,z0,x1,y1,z1, flags, surf}
    this.lights = []; // optional point light anchors (x,y,z,color)
  }
  g(kind) {
    if (!this.parts[kind]) this.parts[kind] = new GeoBuffer();
    return this.parts[kind];
  }
  col(x0, y0, z0, x1, y1, z1, flags = CF.SOLID, surf = SURF.metal) {
    this.colliders.push({ x0, y0, z0, x1, y1, z1, flags, surf });
    return this;
  }
  finish() {
    for (const k of Object.keys(this.parts)) {
      const gb = this.parts[k];
      this.parts[k] = gb.build();
      if (!this.parts[k]) delete this.parts[k];
    }
    return this;
  }
}

// --------------------------------------------------------------------------
// Foliage helpers: clusters of leaf cards
function leafCluster(g, cx, cy, cz, radius, count, rng, tint, baseY, height, cardSize = 1.8) {
  for (let i = 0; i < count; i++) {
    // random point in ellipsoid
    let x, y, z;
    do {
      x = rng.range(-1, 1); y = rng.range(-1, 1); z = rng.range(-1, 1);
    } while (x * x + y * y + z * z > 1);
    const px = cx + x * radius, py = cy + y * radius * 0.75, pz = cz + z * radius;
    const s = cardSize * rng.range(0.75, 1.25);
    const yaw = rng.range(0, Math.PI);
    const pitch = rng.range(-0.6, 0.6);
    const sway = Math.min(1, Math.max(0.1, (py - baseY) / height)) * 0.6;
    const shade = rng.range(0.75, 1.15);
    const col = [tint[0] * shade, tint[1] * shade, tint[2] * shade];
    // two crossed cards
    for (let k = 0; k < 2; k++) {
      const a = yaw + k * Math.PI * 0.5;
      const ux = Math.cos(a) * s * 0.5, uz = Math.sin(a) * s * 0.5;
      const vy = Math.cos(pitch) * s * 0.5, vx = Math.sin(pitch) * s * 0.5 * Math.sin(a), vz = -Math.sin(pitch) * s * 0.5 * Math.cos(a);
      const nx = -Math.sin(a), nz = Math.cos(a);
      // normals point outward from canopy centre for nicer lighting
      const ox = px - cx, oy = py - cy + radius * 0.3, oz = pz - cz;
      const ol = Math.hypot(ox, oy, oz) || 1;
      const nnx = (ox / ol) * 0.8 + nx * 0.2, nny = (oy / ol) * 0.8 + 0.2, nnz = (oz / ol) * 0.8 + nz * 0.2;
      const p0 = [px - ux - vx, py - vy, pz - uz - vz];
      const p1 = [px + ux - vx, py - vy, pz + uz - vz];
      const p2 = [px + ux + vx, py + vy, pz + uz + vz];
      const p3 = [px - ux + vx, py + vy, pz - uz + vz];
      const m = [0, -1, rng.next(), sway];
      g.quad(p0, p1, p2, p3, [nnx, nny, nnz], [0, 0], [1, 0], [1, 1], [0, 1], col, m);
    }
  }
}

function trunk(g, x, z, y0, h, r0, r1, rng, branches = 4, col = C('#8a7a66')) {
  g.cylinder(x, y0, z, r0, r1, h, 7, col, M(L.bark), false);
  const tips = [];
  for (let i = 0; i < branches; i++) {
    const a = rng.range(0, Math.PI * 2);
    const by = y0 + h * rng.range(0.55, 0.9);
    const len = h * rng.range(0.3, 0.5);
    const ex = x + Math.cos(a) * len, ez = z + Math.sin(a) * len, ey = by + len * rng.range(0.4, 0.9);
    g.tube(x, by, z, ex, ey, ez, r1 * 0.9, r1 * 0.35, 5, col, M(L.bark));
    tips.push([ex, ey, ez]);
  }
  return tips;
}

// --------------------------------------------------------------------------
const T = {};

function makeTrees() {
  const variants = [
    { name: 'tree_oak', h: 4.2, r: 3.4, leaves: C('#5c8a3a'), cards: 34 },
    { name: 'tree_maple', h: 3.8, r: 3.0, leaves: C('#7a9a3c'), cards: 30 },
    { name: 'tree_autumn', h: 3.8, r: 3.0, leaves: C('#c8782e'), cards: 30 },
    { name: 'tree_street', h: 3.2, r: 2.3, leaves: C('#5f9446'), cards: 22 },
    { name: 'tree_birch', h: 4.5, r: 2.2, leaves: C('#86a84a'), cards: 22, bark: C('#e8e4da') },
  ];
  for (const v of variants) {
    for (let k = 0; k < 3; k++) {
      const t = new Template(`${v.name}_${k}`);
      const rng = new RNG(1000 + k * 77 + v.name.length * 13);
      const tips = trunk(t.g('uber'), 0, 0, 0, v.h, 0.22, 0.14, rng, 4, v.bark || C('#7d6e5c'));
      const total = v.h + v.r * 1.6;
      leafCluster(t.g('foliage'), 0, v.h + v.r * 0.55, 0, v.r, v.cards, rng, v.leaves, 0, total);
      for (const tp of tips) leafCluster(t.g('foliage'), tp[0], tp[1] + 0.4, tp[2], v.r * 0.55, 6, rng, v.leaves, 0, total);
      t.col(-0.25, 0, -0.25, 0.25, v.h, 0.25, CF.SOLID | CF.NOCAM, SURF.wood);
      T[t.name] = t.finish();
    }
  }
  // conifers
  for (let k = 0; k < 3; k++) {
    const t = new Template(`tree_pine_${k}`);
    const rng = new RNG(3000 + k);
    const h = 9 + k * 2;
    t.g('uber').cylinder(0, 0, 0, 0.25, 0.08, h, 6, C('#6b5848'), M(L.bark), false);
    const g = t.g('foliage');
    const layers = 7;
    for (let i = 0; i < layers; i++) {
      const y = 1.8 + (i / layers) * (h - 1.6);
      const r = (1 - i / layers) * 2.6 + 0.4;
      for (let j = 0; j < 7; j++) {
        const a = (j / 7) * Math.PI * 2 + rng.range(0, 0.6);
        const ex = Math.cos(a) * r, ez = Math.sin(a) * r;
        const nx = Math.cos(a), nz = Math.sin(a);
        const s = 0.9 + r * 0.35;
        const sway = (y / h) * 0.5;
        const col = C('#2f5a34').map((c) => c * rng.range(0.8, 1.15));
        // drooping card from trunk outwards
        g.quad([-nz * s * 0.5, y + 0.4, nx * s * 0.5], [ex - nz * s * 0.5, y - 0.6, ez + nx * s * 0.5],
          [ex + nz * s * 0.5, y - 0.6, ez - nx * s * 0.5], [nz * s * 0.5, y + 0.4, -nx * s * 0.5],
          [nx * 0.5, 0.85, nz * 0.5], [0, 0], [1, 0], [1, 1], [0, 1], col, [0, -1, rng.next(), sway]);
      }
    }
    t.col(-0.3, 0, -0.3, 0.3, h, 0.3, CF.SOLID | CF.NOCAM, SURF.wood);
    T[t.name] = t.finish();
  }
  // giant ancient tree (2189 street trees / the planted seed)
  for (let k = 0; k < 2; k++) {
    const t = new Template(`tree_giant_${k}`);
    const rng = new RNG(5000 + k);
    const h = 16 + k * 4;
    const tips = trunk(t.g('uber'), 0, 0, 0, h, 1.1, 0.6, rng, 6, C('#6e6252'));
    leafCluster(t.g('foliage'), 0, h + 6, 0, 9, 90, rng, C('#4f8a36'), 0, h + 14, 3.2);
    for (const tp of tips) leafCluster(t.g('foliage'), tp[0], tp[1] + 1, tp[2], 5, 20, rng, C('#5a9640'), 0, h + 14, 3.0);
    // roots
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rng.range(0, 0.5);
      t.g('uber').tube(0, 2.2, 0, Math.cos(a) * 4.5, -0.3, Math.sin(a) * 4.5, 0.7, 0.2, 5, C('#6e6252'), M(L.bark));
    }
    t.col(-1.1, 0, -1.1, 1.1, h, 1.1, CF.SOLID | CF.CLIMB, SURF.wood);
    T[t.name] = t.finish();
  }
  // bushes
  for (let k = 0; k < 3; k++) {
    const t = new Template(`bush_${k}`);
    const rng = new RNG(7000 + k);
    leafCluster(t.g('foliage'), 0, 0.7, 0, 1.0 + k * 0.2, 14, rng, k === 2 ? C('#4a7a30') : C('#5f8f3c'), 0, 2, 1.2);
    T[t.name] = t.finish();
  }
  // hedge segment (4m)
  {
    const t = new Template('hedge');
    const rng = new RNG(7100);
    t.g('uber').box(-2, 0, -0.5, 2, 1.5, 0.5, C('#3d5f2a'), M(L.moss));
    leafCluster(t.g('foliage'), -1, 1.0, 0, 1.0, 10, rng, C('#4f7d34'), 0, 2, 1.0);
    leafCluster(t.g('foliage'), 1, 1.0, 0, 1.0, 10, rng, C('#4f7d34'), 0, 2, 1.0);
    t.col(-2, 0, -0.5, 2, 1.5, 0.5, CF.SOLID | CF.NOBULLET, SURF.leaves);
    T.hedge = t.finish();
  }
  // grass tuft (crossed cards using grass texture) — uses 'grass' bucket
  {
    const t = new Template('grass_tuft');
    const g = t.g('grass');
    const rng = new RNG(7200);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI + rng.range(0, 0.3);
      const ux = Math.cos(a) * 0.7, uz = Math.sin(a) * 0.7;
      const col = C('#7aa04a');
      g.quad([-ux, 0, -uz], [ux, 0, uz], [ux, 0.8, uz], [-ux, 0.8, -uz], [0, 1, 0], [0, 0], [1, 0], [1, 1], [0, 1], col, [0, -1, rng.next(), 0.35]);
    }
    T.grass_tuft = t.finish();
  }
  // ivy curtain (2189 facades): 3m wide strip, 8m tall, leaf cards
  {
    const t = new Template('ivy');
    const g = t.g('foliage');
    const rng = new RNG(7300);
    for (let i = 0; i < 26; i++) {
      const x = rng.range(-1.5, 1.5), y = -rng.range(0, 8) * Math.sqrt(rng.next());
      const s = rng.range(0.8, 1.6);
      const col = C('#3f7a30').map((c) => c * rng.range(0.75, 1.2));
      g.quad([x - s / 2, y - s / 2, 0.08], [x + s / 2, y - s / 2, 0.08], [x + s / 2, y + s / 2, 0.08], [x - s / 2, y + s / 2, 0.08],
        [0, 0.2, 1], [0, 0], [1, 0], [1, 1], [0, 1], col, [0, -1, rng.next(), 0.12]);
    }
    T.ivy = t.finish();
  }
}

function makeStreet() {
  // 1996 cobra-head sodium lamp
  {
    const t = new Template('lamp96');
    const u = t.g('uber');
    u.cylinder(0, 0, 0, 0.13, 0.09, 8, 8, C('#6f7377'), M(L.metal));
    u.box(-0.08, 7.75, 0, 0.08, 7.9, 2.2, C('#6f7377'), M(L.metal));
    u.box(-0.22, 7.6, 1.9, 0.22, 7.85, 2.75, C('#5e6266'), M(L.metal));
    t.g('emissive').box(-0.18, 7.58, 2.0, 0.18, 7.6, 2.65, [6, 3.6, 1.4], E(0, 0, 1));
    t.col(-0.15, 0, -0.15, 0.15, 8, 0.15);
    t.lights.push([0, 7.4, 2.3]);
    T.lamp96 = t.finish();
  }
  {
    const t = new Template('lamp47');
    const u = t.g('uber');
    u.cylinder(0, 0, 0, 0.12, 0.07, 9, 8, C('#2b2f36'), M(L.metal));
    u.box(-0.06, 8.6, -0.06, 0.06, 8.7, 1.6, C('#2b2f36'), M(L.metal));
    t.g('emissive').box(-0.05, 0.6, 0.09, 0.05, 7.8, 0.12, [0.4, 2.4, 3.2], E(2, 0.3, 0));
    t.g('emissive').box(-0.25, 8.52, 0.6, 0.25, 8.56, 1.55, [3.2, 4.0, 4.6], E(0, 0, 1));
    t.col(-0.13, 0, -0.13, 0.13, 9, 0.13);
    t.lights.push([0, 8.3, 1.1]);
    T.lamp47 = t.finish();
  }
  {
    const t = new Template('lamp89');
    const u = t.g('uber');
    u.cylinder(0, 0, 0, 0.13, 0.1, 4.5, 8, C('#6a5040'), M(L.rust));
    u.tube(0, 4.4, 0, 0.6, 5.6, 1.2, 0.1, 0.08, 6, C('#6a5040'), M(L.rust));
    u.tube(0.6, 5.6, 1.2, 0.9, 4.2, 2.6, 0.08, 0.07, 6, C('#6a5040'), M(L.rust));
    t.col(-0.15, 0, -0.15, 0.15, 5, 0.15);
    T.lamp89 = t.finish();
  }
  // Traffic light: pole on corner, arm reaching over the road. axis: 0 = controls NS traffic, 1 = EW
  for (const era of [0, 1]) {
    for (const axis of [0, 1]) {
      const t = new Template(`traffic${era}_${axis}`);
      const u = t.g('uber');
      const pc = era === 0 ? C('#4a5a3a') : C('#24282e');
      u.cylinder(0, 0, 0, 0.14, 0.11, 6.4, 8, pc, M(L.metal));
      u.box(-0.07, 6.1, 0, 0.07, 6.25, 5.2, pc, M(L.metal));
      for (const zz of [2.6, 4.8]) {
        u.box(-0.2, 5.0, zz - 0.18, 0.2, 6.1, zz + 0.18, era === 0 ? C('#d9b13a') : C('#15181c'), M(L.paint));
        const e = t.g('emissive');
        const cols = [[5, 0.3, 0.15], [5, 3.2, 0.2], [0.3, 4.5, 1.6]];
        for (let li = 0; li < 3; li++) {
          const y = 5.85 - li * 0.34;
          e.box(-0.24, y - 0.12, zz - 0.12, -0.2, y + 0.12, zz + 0.12, cols[li], [0, 5, li + 3 * axis, 0]);
          e.box(0.2, y - 0.12, zz - 0.12, 0.24, y + 0.12, zz + 0.12, cols[li], [0, 5, li + 3 * axis, 0]);
        }
      }
      // pedestrian signal
      u.box(-0.18, 2.6, -0.32, 0.18, 3.1, -0.14, C('#2a2a2a'), M(L.paint));
      t.col(-0.16, 0, -0.16, 0.16, 6.4, 0.16);
      T[t.name] = t.finish();
    }
  }
  {
    const t = new Template('hydrant');
    const u = t.g('uber');
    u.cylinder(0, 0, 0, 0.17, 0.15, 0.7, 10, C('#c8321e'), M(L.paint));
    u.cylinder(0, 0.7, 0, 0.18, 0.06, 0.18, 10, C('#c8321e'), M(L.paint));
    u.tube(-0.25, 0.5, 0, 0.25, 0.5, 0, 0.06, 0.06, 6, C('#b52a18'), M(L.paint));
    t.col(-0.2, 0, -0.2, 0.2, 0.85, 0.2);
    T.hydrant = t.finish();
  }
  {
    const t = new Template('bench');
    const u = t.g('uber');
    u.box(-0.9, 0.42, -0.25, 0.9, 0.48, 0.25, C('#9a7048'), M(L.wood));
    u.box(-0.9, 0.55, 0.22, 0.9, 0.95, 0.28, C('#9a7048'), M(L.wood));
    for (const x of [-0.75, 0.75]) u.box(x - 0.04, 0, -0.22, x + 0.04, 0.45, 0.25, C('#3a3d40'), M(L.metal));
    t.col(-0.9, 0, -0.25, 0.9, 0.5, 0.28, CF.SOLID, SURF.wood);
    T.bench = t.finish();
  }
  {
    const t = new Template('trashcan');
    const u = t.g('uber');
    u.cylinder(0, 0, 0, 0.3, 0.32, 0.95, 10, C('#3d5a3a'), M(L.metal));
    u.cylinder(0, 0.95, 0, 0.34, 0.28, 0.08, 10, C('#2c3f2a'), M(L.metal));
    t.col(-0.32, 0, -0.32, 0.32, 1.0, 0.32);
    T.trashcan = t.finish();
  }
  {
    const t = new Template('mailbox');
    const u = t.g('uber');
    u.box(-0.28, 0.3, -0.25, 0.28, 1.15, 0.25, C('#2c4a8a'), M(L.paint));
    u.cylinder(0, 1.15, -0.25, 0.28, 0.28, 0.0, 10, C('#2c4a8a'), M(L.paint), false);
    for (const x of [-0.22, 0.22]) u.box(x - 0.03, 0, -0.2, x + 0.03, 0.3, 0.2, C('#222'), M(L.metal));
    t.col(-0.28, 0, -0.25, 0.28, 1.2, 0.25);
    T.mailbox = t.finish();
  }
  {
    const t = new Template('phonebooth');
    const u = t.g('uber');
    u.box(-0.45, 0, -0.45, 0.45, 0.1, 0.45, C('#777'), M(L.metal));
    for (const [x, z] of [[-0.42, -0.42], [0.42, -0.42], [-0.42, 0.42], [0.42, 0.42]]) u.box(x - 0.03, 0, z - 0.03, x + 0.03, 2.3, z + 0.03, C('#8a8f95'), M(L.metal));
    u.box(-0.45, 2.3, -0.45, 0.45, 2.45, 0.45, C('#8a8f95'), M(L.metal));
    u.box(-0.2, 1.0, -0.42, 0.2, 1.6, -0.3, C('#555'), M(L.metal));
    t.g('glass').box(-0.42, 0.4, -0.42, 0.42, 2.2, 0.42, C('#88a0b0'), M(0));
    t.g('emissive').box(-0.4, 2.32, -0.47, 0.4, 2.43, -0.45, [2.5, 2.2, 1.2], E(0, 0, 0));
    t.col(-0.45, 0, -0.45, 0.45, 2.45, 0.45);
    T.phonebooth = t.finish();
  }
  {
    const t = new Template('newsbox');
    const u = t.g('uber');
    u.box(-0.25, 0.35, -0.22, 0.25, 1.05, 0.22, C('#c43a2a'), M(L.paint));
    u.box(-0.22, 0, -0.18, 0.22, 0.35, 0.18, C('#333'), M(L.metal));
    t.col(-0.25, 0, -0.22, 0.25, 1.05, 0.22);
    T.newsbox = t.finish();
  }
  {
    const t = new Template('busstop');
    const u = t.g('uber');
    u.box(-2, 2.5, -0.8, 2, 2.62, 0.8, C('#3a3f45'), M(L.metal));
    for (const x of [-1.9, 1.9]) u.box(x - 0.05, 0, 0.65, x + 0.05, 2.5, 0.75, C('#3a3f45'), M(L.metal));
    u.box(-1.6, 0.45, 0.35, 1.6, 0.5, 0.7, C('#6a5040'), M(L.wood));
    t.g('glass').box(-1.95, 0.3, 0.7, 1.95, 2.45, 0.75, C('#9ab0c0'), M(0));
    t.g('emissive').box(1.0, 0.6, 0.62, 1.9, 2.2, 0.68, [1.8, 1.8, 2.0], E(0, 0.2, 0));
    t.col(-2, 0, 0.6, 2, 2.6, 0.8);
    T.busstop = t.finish();
  }
  {
    const t = new Template('meter');
    const u = t.g('uber');
    u.cylinder(0, 0, 0, 0.04, 0.04, 1.1, 6, C('#555'), M(L.metal));
    u.box(-0.1, 1.1, -0.08, 0.1, 1.42, 0.08, C('#7a7f84'), M(L.metal));
    T.meter = t.finish();
  }
  {
    const t = new Template('bollard');
    t.g('uber').cylinder(0, 0, 0, 0.12, 0.12, 0.9, 8, C('#3b3f44'), M(L.metal));
    t.col(-0.12, 0, -0.12, 0.12, 0.9, 0.12);
    T.bollard = t.finish();
  }
  // 2047 street furniture
  {
    const t = new Template('kiosk47');
    const u = t.g('uber');
    u.box(-0.5, 0, -0.3, 0.5, 2.2, 0.3, C('#1d2128'), M(L.panel));
    t.g('emissive').box(-0.42, 0.7, 0.3, 0.42, 2.0, 0.32, [0.8, 2.6, 3.4], E(3, 0.5, 0));
    t.g('emissive').box(-0.52, 2.2, -0.32, 0.52, 2.26, 0.32, [3.0, 0.6, 2.4], E(2, 0.1, 0));
    t.col(-0.5, 0, -0.3, 0.5, 2.2, 0.3);
    T.kiosk47 = t.finish();
  }
  {
    const t = new Template('charger47');
    const u = t.g('uber');
    u.box(-0.25, 0, -0.2, 0.25, 1.5, 0.2, C('#e8ecef'), M(L.panel));
    t.g('emissive').box(-0.18, 1.1, 0.2, 0.18, 1.35, 0.22, [0.5, 3.5, 1.5], E(2, 0.7, 0));
    t.col(-0.25, 0, -0.2, 0.25, 1.5, 0.2);
    T.charger47 = t.finish();
  }
  {
    const t = new Template('campole47');
    const u = t.g('uber');
    u.cylinder(0, 0, 0, 0.08, 0.06, 5.5, 6, C('#24282e'), M(L.metal));
    u.box(-0.12, 5.3, 0, 0.12, 5.55, 0.5, C('#e0e4e8'), M(L.panel));
    t.g('emissive').box(-0.04, 5.38, 0.5, 0.04, 5.46, 0.52, [6, 0.2, 0.2], E(4, 0.3, 0));
    T.campole47 = t.finish();
  }
  {
    const t = new Template('vending');
    const u = t.g('uber');
    u.box(-0.5, 0, -0.4, 0.5, 1.9, 0.4, C('#c03030'), M(L.paint));
    t.g('emissive').box(-0.42, 0.9, 0.4, 0.3, 1.8, 0.42, [2.6, 2.4, 2.2], E(0, 0, 0));
    t.col(-0.5, 0, -0.4, 0.5, 1.9, 0.4);
    T.vending = t.finish();
  }
  {
    const t = new Template('barrier');
    const u = t.g('uber');
    // jersey barrier, 3 m
    u.box(-1.5, 0, -0.32, 1.5, 0.3, 0.32, C('#b8b4ac'), M(L.concrete));
    u.box(-1.5, 0.3, -0.2, 1.5, 0.6, 0.2, C('#b8b4ac'), M(L.concrete));
    u.box(-1.5, 0.6, -0.12, 1.5, 0.85, 0.12, C('#b8b4ac'), M(L.concrete));
    t.col(-1.5, 0, -0.32, 1.5, 0.85, 0.32, CF.SOLID, SURF.concrete);
    T.barrier = t.finish();
  }
  {
    const t = new Template('cone');
    t.g('uber').cylinder(0, 0, 0, 0.18, 0.03, 0.7, 8, C('#ff6a1a'), M(L.paint));
    t.g('uber').box(-0.22, 0, -0.22, 0.22, 0.04, 0.22, C('#ff6a1a'), M(L.paint));
    T.cone = t.finish();
  }
  {
    const t = new Template('dumpster');
    const u = t.g('uber');
    u.box(-1.0, 0.15, -0.7, 1.0, 1.3, 0.7, C('#2f5a3a'), M(L.metal));
    u.box(-1.02, 1.3, -0.72, 1.02, 1.38, 0.72, C('#20402a'), M(L.metal));
    t.col(-1.0, 0, -0.7, 1.0, 1.38, 0.7);
    T.dumpster = t.finish();
  }
  {
    const t = new Template('drum');
    t.g('uber').cylinder(0, 0, 0, 0.3, 0.3, 0.9, 10, C('#3a5a8a'), M(L.metal));
    t.col(-0.3, 0, -0.3, 0.3, 0.9, 0.3);
    T.drum = t.finish();
  }
  {
    const t = new Template('pallet');
    const u = t.g('uber');
    u.box(-0.6, 0, -0.5, 0.6, 0.14, 0.5, C('#a07a50'), M(L.wood));
    u.box(-0.55, 0.14, -0.45, 0.55, 0.9, 0.45, C('#b09070'), M(L.wood));
    t.col(-0.6, 0, -0.5, 0.6, 0.9, 0.5, CF.SOLID, SURF.wood);
    T.pallet = t.finish();
  }
  {
    const t = new Template('crate');
    t.g('uber').box(-0.5, 0, -0.5, 0.5, 1, 0.5, C('#9a7a52'), M(L.wood));
    t.col(-0.5, 0, -0.5, 0.5, 1, 0.5, CF.SOLID, SURF.wood);
    T.crate = t.finish();
  }
  // Shipping containers (6 m) in several colours
  const contCols = ['#a8402e', '#2e5a8a', '#3a7a4a', '#c88a2a', '#6a6a6a', '#8a2a5a'];
  contCols.forEach((cc, i) => {
    const t = new Template(`container_${i}`);
    t.g('uber').box(-3.05, 0, -1.22, 3.05, 2.6, 1.22, C(cc), M(L.corrugated));
    t.col(-3.05, 0, -1.22, 3.05, 2.6, 1.22, CF.SOLID, SURF.metal);
    T[t.name] = t.finish();
  });
  // rooftop: water tank, AC, antenna, vents, billboard frame
  {
    const t = new Template('watertank');
    const u = t.g('uber');
    for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) u.box(x - 0.1, 0, z - 0.1, x + 0.1, 3, z + 0.1, C('#4a4440'), M(L.metal));
    u.box(-1.6, 3, -1.6, 1.6, 3.15, 1.6, C('#4a4440'), M(L.metal));
    u.cylinder(0, 3.15, 0, 1.7, 1.7, 3.6, 14, C('#8a6a4a'), M(L.wood), false);
    u.cylinder(0, 6.75, 0, 1.8, 0.1, 1.3, 14, C('#5a4a3a'), M(L.wood), false);
    t.col(-1.7, 0, -1.7, 1.7, 6.75, 1.7, CF.SOLID, SURF.wood);
    T.watertank = t.finish();
  }
  {
    const t = new Template('acunit');
    const u = t.g('uber');
    u.box(-0.9, 0, -0.6, 0.9, 1.1, 0.6, C('#a8acb0'), M(L.metal));
    u.cylinder(0, 1.1, 0, 0.45, 0.45, 0.06, 10, C('#3a3d40'), M(L.metal));
    t.col(-0.9, 0, -0.6, 0.9, 1.1, 0.6);
    T.acunit = t.finish();
  }
  {
    const t = new Template('antenna');
    const u = t.g('uber');
    u.cylinder(0, 0, 0, 0.08, 0.03, 9, 6, C('#9a9ea2'), M(L.metal));
    for (let i = 0; i < 4; i++) u.box(-0.6 + i * 0.1, 3 + i * 1.5, -0.03, 0.6 - i * 0.1, 3.06 + i * 1.5, 0.03, C('#9a9ea2'), M(L.metal));
    t.g('emissive').box(-0.08, 9, -0.08, 0.08, 9.16, 0.08, [8, 0.4, 0.3], E(4, 0.2, 1));
    T.antenna = t.finish();
  }
  {
    const t = new Template('vent');
    t.g('uber').cylinder(0, 0, 0, 0.3, 0.3, 1.2, 10, C('#8a8e92'), M(L.metal));
    t.g('uber').cylinder(0, 1.2, 0, 0.45, 0.05, 0.3, 10, C('#7a7e82'), M(L.metal));
    T.vent = t.finish();
  }
  {
    const t = new Template('solar');
    const u = t.g('uber');
    u.boxRot(0, 0.6, 0, 1.0, 0.04, 0.8, 0, C('#1a2a4a'), M(L.panel));
    u.box(-0.05, 0, -0.05, 0.05, 0.6, 0.05, C('#777'), M(L.metal));
    T.solar = t.finish();
  }
  // 2189 survivor props
  {
    const t = new Template('campfire');
    const u = t.g('uber');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      u.boxRot(Math.cos(a) * 0.6, 0.12, Math.sin(a) * 0.6, 0.18, 0.12, 0.14, a, C('#6a6460'), M(L.stone));
    }
    u.boxRot(0, 0.15, 0, 0.5, 0.06, 0.06, 0.4, C('#3a2a1a'), M(L.wood));
    u.boxRot(0, 0.2, 0, 0.5, 0.06, 0.06, -0.8, C('#3a2a1a'), M(L.wood));
    t.g('emissive').cylinder(0, 0.1, 0, 0.35, 0.02, 0.7, 6, [6, 2.4, 0.5], E(1, 0.4, 0));
    t.lights.push([0, 0.6, 0]);
    T.campfire = t.finish();
  }
  {
    const t = new Template('tent');
    const u = t.g('uber');
    u.gable(-1.2, -1.5, 1.2, 1.5, 0, 1.6, 'z', C('#8a7a5a'), M(L.fabric), 0);
    t.col(-1.2, 0, -1.5, 1.2, 1.4, 1.5, CF.SOLID, SURF.wood);
    T.tent = t.finish();
  }
  {
    const t = new Template('scrapwall');
    const u = t.g('uber');
    const rng = new RNG(8800);
    for (let i = 0; i < 5; i++) {
      const x = -2 + i * 1.0;
      u.boxRot(x, 1.2 + rng.range(-0.2, 0.3), 0, 0.55, 1.2 + rng.range(-0.1, 0.4), 0.04, rng.range(-0.06, 0.06), C(rng.pick(['#7a5a40', '#6a6a6a', '#8a4a30', '#5a6a5a'])), M(rng.pick([L.rust, L.corrugated, L.metal])));
    }
    u.box(-2.6, 0, -0.1, 2.6, 0.1, 0.1, C('#4a3a2a'), M(L.wood));
    t.col(-2.6, 0, -0.15, 2.6, 2.6, 0.15, CF.SOLID, SURF.metal);
    T.scrapwall = t.finish();
  }
  {
    const t = new Template('watercollector');
    const u = t.g('uber');
    u.cylinder(0, 0, 0, 0.6, 0.6, 1.6, 10, C('#4a6a7a'), M(L.metal));
    u.cylinder(0, 1.6, 0, 0.2, 1.4, 0.8, 10, C('#9aa6a8'), M(L.fabric), false);
    t.col(-0.6, 0, -0.6, 0.6, 1.6, 0.6);
    T.watercollector = t.finish();
  }
  // rubble mound (heap of chunks) — several variants
  for (let k = 0; k < 4; k++) {
    const t = new Template(`rubble_${k}`);
    const u = t.g('uber');
    const rng = new RNG(9000 + k);
    const n = 14 + k * 4;
    for (let i = 0; i < n; i++) {
      const r = rng.range(0, 2.5);
      const a = rng.range(0, Math.PI * 2);
      const s = rng.range(0.25, 0.8) * (1.4 - r / 3);
      u.boxRot(Math.cos(a) * r, s * 0.5 + (2.5 - r) * 0.18, Math.sin(a) * r, s, s * 0.5, s * rng.range(0.5, 1.2), rng.range(0, 3), C(rng.pick(['#8a8680', '#7a7670', '#9a5a40', '#6a6660'])), M(rng.chance(0.3) ? L.brick : L.rubble));
    }
    // rebar
    for (let i = 0; i < 3; i++) u.tube(rng.range(-1, 1), 0.3, rng.range(-1, 1), rng.range(-1.5, 1.5), rng.range(1, 2), rng.range(-1.5, 1.5), 0.02, 0.02, 4, C('#6a4030'), M(L.rust));
    t.col(-1.6, 0, -1.6, 1.6, 0.9, 1.6, CF.SOLID, SURF.rubble);
    T[t.name] = t.finish();
  }
  // rocks
  for (let k = 0; k < 3; k++) {
    const t = new Template(`rock_${k}`);
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const p = geo.attributes.position;
    const rng = new RNG(9500 + k);
    for (let i = 0; i < p.count; i++) {
      const s = 0.75 + rng.next() * 0.45;
      p.setXYZ(i, p.getX(i) * s * 1.3, p.getY(i) * s * 0.8 + 0.3, p.getZ(i) * s);
    }
    geo.computeVertexNormals();
    const ng = geo.toNonIndexed();
    ng.computeVertexNormals();
    const n = ng.attributes.position.count;
    const uv = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) { uv[i * 2] = ng.attributes.position.getX(i) * 1.5; uv[i * 2 + 1] = ng.attributes.position.getY(i) * 1.5 + ng.attributes.position.getZ(i); }
    ng.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    const gb = t.g('uber');
    gb.addGeometry(ng, new THREE.Matrix4(), C('#8c8a84'), M(L.stone));
    t.col(-1.1, 0, -0.9, 1.1, 1.0, 0.9, CF.SOLID, SURF.concrete);
    T[t.name] = t.finish();
  }
}

// Wrecked cars (static props, used in 2189 and junkyards)
function makeWrecks() {
  const cols = ['#7a4a30', '#5a5a5a', '#4a5a6a', '#6a5a3a'];
  cols.forEach((cc, i) => {
    const t = new Template(`wreck_${i}`);
    const u = t.g('uber');
    const rng = new RNG(9900 + i);
    const lay = M(L.rust);
    u.boxRot(0, 0.55, 0, 2.2, 0.35, 0.9, 0, C(cc), lay);
    u.boxRot(0.2, 1.05, 0, 1.1, 0.25, 0.82, 0, C(cc), lay);
    u.boxRot(-1.2, 0.3, 0, 0.05, 0.25, 0.85, 0.2, C('#3a3030'), lay);
    // flattened tyre stubs
    for (const [x, z] of [[-1.4, -0.85], [1.4, -0.85], [-1.4, 0.85], [1.4, 0.85]]) u.cylinder(x, 0, z, 0.3, 0.3, 0.2, 8, C('#222'), M(L.rubble));
    if (rng.chance(0.5)) {
      const r = rng.range(0, 1);
      t.g('foliage').quad([-1, 1.3, -0.5], [1, 1.3, -0.5], [1, 1.3 + r, 0.5], [-1, 1.3 + r, 0.5], [0, 1, 0], [0, 0], [1, 0], [1, 1], [0, 1], C('#5a8a3a'), [0, -1, 0.3, 0.2]);
    }
    t.col(-2.2, 0, -0.95, 2.2, 1.3, 0.95, CF.SOLID, SURF.metal);
    T[t.name] = t.finish();
  });
}

// Industrial / construction
function makeIndustrial() {
  {
    const t = new Template('scaffold');
    // 4m wide x 1.6 deep x 12 tall section — climbable
    const u = t.g('uber');
    const pc = C('#b0a89a');
    for (const x of [-2, 2]) for (const z of [0, 1.6]) u.cylinder(x, 0, z, 0.05, 0.05, 12, 6, pc, M(L.metal), false);
    for (let y = 2; y <= 12; y += 2) {
      u.box(-2, y - 0.05, 0, 2, y, 1.6, C('#8a6a40'), M(L.wood));
      u.box(-2, y + 0.9, 1.55, 2, y + 0.95, 1.6, pc, M(L.metal));
    }
    t.col(-2.05, 0, 0, 2.05, 12, 1.65, CF.CLIMB | CF.NOBULLET | CF.NOCAM, SURF.metal);
    for (let y = 2; y <= 12; y += 2) t.col(-2, y - 0.05, 0, 2, y, 1.6, CF.SOLID | CF.NOCAM, SURF.wood);
    T.scaffold = t.finish();
  }
  {
    const t = new Template('crane');
    const u = t.g('uber');
    const yc = C('#e0b020');
    const H = 58;
    // lattice mast
    for (const x of [-1, 1]) for (const z of [-1, 1]) u.box(x - 0.08, 0, z - 0.08, x + 0.08, H, z + 0.08, yc, M(L.paint));
    for (let y = 0; y < H; y += 2) {
      u.tube(-1, y, -1, 1, y + 2, -1, 0.04, 0.04, 4, yc, M(L.paint));
      u.tube(1, y, 1, -1, y + 2, 1, 0.04, 0.04, 4, yc, M(L.paint));
      u.tube(-1, y, 1, -1, y + 2, -1, 0.04, 0.04, 4, yc, M(L.paint));
      u.tube(1, y, -1, 1, y + 2, 1, 0.04, 0.04, 4, yc, M(L.paint));
    }
    // jib + counter jib
    u.box(-12, H, -0.8, 42, H + 1.6, 0.8, yc, M(L.paint));
    u.box(-12, H - 1.5, -2, -4, H, 2, C('#888'), M(L.concrete));
    u.box(-1.5, H + 1.6, -1.5, 1.5, H + 6, 1.5, yc, M(L.paint));
    u.box(-1.4, H - 3.5, -1.4, 1.4, H, 1.4, C('#e8e8e0'), M(L.panel));
    // cable + hook
    u.box(30 - 0.02, H - 20, -0.02, 30 + 0.02, H, 0.02, C('#333'), M(L.metal));
    u.box(29.6, H - 21, -0.4, 30.4, H - 20, 0.4, C('#d02020'), M(L.paint));
    t.g('emissive').box(41.6, H + 1.6, -0.15, 42, H + 1.9, 0.15, [8, 0.3, 0.2], E(4, 0.1, 1));
    t.col(-1.1, 0, -1.1, 1.1, H, 1.1, CF.SOLID | CF.CLIMB, SURF.metal);
    t.col(-12, H, -0.8, 42, H + 1.6, 0.8, CF.SOLID, SURF.metal);
    T.crane = t.finish();
  }
  {
    const t = new Template('trailer');
    const u = t.g('uber');
    u.box(-4, 0.6, -1.3, 4, 3.2, 1.3, C('#d8d4c8'), M(L.corrugated));
    u.box(-4, 0, -1.0, 4, 0.6, 1.0, C('#333'), M(L.metal));
    t.g('emissive').box(-1.2, 1.6, 1.3, 0.2, 2.6, 1.32, [1.6, 1.4, 0.9], E(0, 0, 1));
    t.col(-4, 0, -1.3, 4, 3.2, 1.3);
    T.trailer = t.finish();
  }
  {
    const t = new Template('tank_ind');
    const u = t.g('uber');
    u.cylinder(0, 0, 0, 5, 5, 12, 18, C('#c8c8c0'), M(L.metal), true);
    t.col(-4.6, 0, -4.6, 4.6, 12, 4.6);
    T.tank_ind = t.finish();
  }
  {
    const t = new Template('smokestack');
    t.g('uber').cylinder(0, 0, 0, 2.2, 1.4, 40, 14, C('#8a5a48'), M(L.brick), false);
    t.g('uber').cylinder(0, 36, 0, 1.5, 1.5, 1.2, 14, C('#333'), M(L.metal), false);
    t.col(-2, 0, -2, 2, 40, 2);
    T.smokestack = t.finish();
  }
  {
    const t = new Template('fence_chain');
    // 4m chain link segment
    const u = t.g('uber');
    for (const x of [-2, 2]) u.cylinder(x, 0, 0, 0.04, 0.04, 2.2, 6, C('#8a8e92'), M(L.metal), false);
    u.box(-2, 2.15, -0.02, 2, 2.2, 0.02, C('#8a8e92'), M(L.metal));
    t.g('glass').box(-2, 0.05, -0.01, 2, 2.15, 0.01, C('#6a7075'), M(0));
    t.col(-2, 0, -0.05, 2, 2.2, 0.05, CF.SOLID | CF.NOBULLET | CF.NOCAM, SURF.metal);
    T.fence_chain = t.finish();
  }
  {
    const t = new Template('fence_picket');
    const u = t.g('uber');
    for (let i = 0; i < 16; i++) u.box(-2 + i * 0.25 + 0.03, 0, -0.02, -2 + i * 0.25 + 0.13, 1.0, 0.02, C('#f0eee6'), M(L.paint));
    u.box(-2, 0.7, -0.04, 2, 0.78, -0.02, C('#f0eee6'), M(L.paint));
    t.col(-2, 0, -0.05, 2, 1.0, 0.05, CF.SOLID | CF.NOCAM, SURF.wood);
    T.fence_picket = t.finish();
  }
  {
    const t = new Template('fence_glass');
    const u = t.g('uber');
    u.box(-2, 0, -0.05, 2, 0.15, 0.05, C('#d8dce0'), M(L.metal));
    t.g('glass').box(-2, 0.15, -0.02, 2, 1.1, 0.02, C('#a8d8f0'), M(0));
    t.g('emissive').box(-2, 1.1, -0.03, 2, 1.13, 0.03, [0.6, 2.4, 3.0], E(2, 0.4, 0));
    t.col(-2, 0, -0.06, 2, 1.13, 0.06, CF.SOLID | CF.NOCAM, SURF.glass);
    T.fence_glass = t.finish();
  }
  {
    const t = new Template('railing');
    const u = t.g('uber');
    u.box(-2, 1.0, -0.04, 2, 1.06, 0.04, C('#3a4045'), M(L.metal));
    for (let i = 0; i <= 4; i++) u.box(-2 + i - 0.03, 0, -0.03, -2 + i + 0.03, 1.0, 0.03, C('#3a4045'), M(L.metal));
    u.box(-2, 0.5, -0.02, 2, 0.53, 0.02, C('#3a4045'), M(L.metal));
    t.col(-2, 0, -0.06, 2, 1.06, 0.06, CF.SOLID | CF.NOCAM | CF.NOBULLET, SURF.metal);
    T.railing = t.finish();
  }
  {
    const t = new Template('billboard');
    const u = t.g('uber');
    for (const x of [-3, 3]) u.box(x - 0.15, 0, -0.15, x + 0.15, 6, 0.15, C('#555'), M(L.metal));
    u.box(-4.2, 6, -0.25, 4.2, 10.4, -0.1, C('#444'), M(L.metal));
    u.box(-4.2, 5.8, -0.6, 4.2, 5.9, 0.4, C('#555'), M(L.metal));
    t.col(-4.2, 6, -0.25, 4.2, 10.4, -0.1);
    T.billboard = t.finish();
  }
  {
    const t = new Template('pier_post');
    t.g('uber').cylinder(0, -4, 0, 0.25, 0.25, 5.2, 8, C('#5a4a3a'), M(L.wood));
    T.pier_post = t.finish();
  }
  {
    const t = new Template('statue');
    const u = t.g('uber');
    u.box(-1.4, 0, -1.4, 1.4, 1.6, 1.4, C('#9a968e'), M(L.stone));
    u.box(-1.1, 1.6, -1.1, 1.1, 1.9, 1.1, C('#8a867e'), M(L.stone));
    // abstract figure: founder on horse-less pose
    const b = C('#5a7a6a');
    u.cylinder(0, 1.9, 0, 0.35, 0.3, 1.0, 10, b, M(L.metal));
    u.cylinder(0, 2.9, 0, 0.45, 0.35, 1.1, 10, b, M(L.metal));
    u.cylinder(0, 4.0, 0, 0.22, 0.2, 0.45, 10, b, M(L.metal));
    u.tube(0.4, 3.8, 0, 1.2, 4.6, 0.3, 0.12, 0.1, 6, b, M(L.metal));
    t.col(-1.4, 0, -1.4, 1.4, 4.4, 1.4, CF.SOLID, SURF.concrete);
    T.statue = t.finish();
  }
  {
    const t = new Template('fountain');
    const u = t.g('uber');
    u.cylinder(0, 0, 0, 4.2, 4.2, 0.6, 24, C('#a8a49c'), M(L.stone), false);
    u.cylinder(0, 0, 0, 3.8, 3.8, 0.62, 24, C('#a8a49c'), M(L.stone), true);
    u.cylinder(0, 0.6, 0, 0.5, 0.35, 2.0, 12, C('#a8a49c'), M(L.stone), true);
    u.cylinder(0, 2.0, 0, 1.4, 0.2, 0.3, 16, C('#a8a49c'), M(L.stone), true);
    t.g('glass').cylinder(0, 0.5, 0, 3.75, 3.75, 0.0, 24, C('#5a8aa0'), M(0), true);
    t.col(-4.2, 0, -4.2, 4.2, 0.62, 4.2, CF.SOLID, SURF.concrete);
    T.fountain = t.finish();
  }
  {
    const t = new Template('holopillar');
    const u = t.g('uber');
    u.cylinder(0, 0, 0, 0.8, 0.8, 0.5, 16, C('#1a1e24'), M(L.panel));
    t.g('holo').cylinder(0, 0.5, 0, 0.7, 1.8, 7, 16, [0.2, 1.4, 2.2], [0, 3, 0.3, 0], false);
    t.col(-0.8, 0, -0.8, 0.8, 0.5, 0.8);
    T.holopillar = t.finish();
  }
  {
    const t = new Template('helipad');
    const u = t.g('uber');
    u.box(-7, 0, -7, 7, 0.3, 7, C('#3a3f44'), M(L.concrete));
    t.g('emissive').box(-6.8, 0.3, -6.8, 6.8, 0.32, -6.6, [0.4, 3, 1.2], E(2, 0, 1));
    t.g('emissive').box(-6.8, 0.3, 6.6, 6.8, 0.32, 6.8, [0.4, 3, 1.2], E(2, 0, 1));
    t.g('emissive').box(-1.5, 0.3, -2.5, -0.9, 0.32, 2.5, [2, 2, 2], E(0, 0, 0));
    t.g('emissive').box(0.9, 0.3, -2.5, 1.5, 0.32, 2.5, [2, 2, 2], E(0, 0, 0));
    t.g('emissive').box(-0.9, 0.3, -0.3, 0.9, 0.32, 0.3, [2, 2, 2], E(0, 0, 0));
    t.col(-7, 0, -7, 7, 0.3, 7);
    T.helipad = t.finish();
  }
}

let built = false;
export function buildPropTemplates() {
  if (built) return T;
  makeTrees();
  makeStreet();
  makeWrecks();
  makeIndustrial();
  built = true;
  return T;
}
export const PROPS = T;

// Register an externally created template (e.g. loaded from a Blender GLB)
export function registerTemplate(name, parts, colliders = [], lights = []) {
  const t = new Template(name);
  t.parts = parts;
  t.colliders = colliders;
  t.lights = lights;
  T[name] = t;
  return t;
}

// ---------------------------------------------------------------------------
// Placement into a chunk build context
const _mat = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

export function placeProp(ctx, name, x, y, z, yaw = 0, scale = 1, tint = null, opts = {}) {
  const t = T[name];
  if (!t) return;
  _q.setFromAxisAngle(_up, yaw);
  const sx = scale * (opts.scaleX || 1);
  _s.set(sx, opts.scaleY ? scale * opts.scaleY : scale, scale);
  _p.set(x, y, z);
  _mat.compose(_p, _q, _s);
  for (const kind of Object.keys(t.parts)) {
    const geo = t.parts[kind];
    if (!geo) continue;
    ctx.geo.get(kind).addGeometry(geo, _mat, tint && kind === 'uber' ? tint : null);
  }
  if (opts.noCollide) return;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const cl of t.colliders) {
    // rotate AABB corners, take bounds (exact for 90° steps)
    let minX = 1e9, minZ = 1e9, maxX = -1e9, maxZ = -1e9;
    for (const [lx, lz] of [[cl.x0, cl.z0], [cl.x1, cl.z0], [cl.x0, cl.z1], [cl.x1, cl.z1]]) {
      const wx = x + (lx * sx * c + lz * scale * s);
      const wz = z + (-lx * sx * s + lz * scale * c);
      if (wx < minX) minX = wx; if (wx > maxX) maxX = wx;
      if (wz < minZ) minZ = wz; if (wz > maxZ) maxZ = wz;
    }
    const sy = opts.scaleY ? scale * opts.scaleY : scale;
    ctx.collider(minX, y + cl.y0 * sy, minZ, maxX, y + cl.y1 * sy, maxZ, cl.flags, cl.surf);
  }
  if (t.lights.length && ctx.lights) {
    for (const l of t.lights) {
      ctx.lights.push({ x: x + (l[0] * c + l[2] * s) * scale, y: y + l[1] * scale, z: z + (-l[0] * s + l[2] * c) * scale, kind: name });
    }
  }
}
