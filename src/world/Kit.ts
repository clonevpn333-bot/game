import * as THREE from 'three';
import { createSeededRandom } from '../core/rng';
import { boxGeo, puffGeo, roundedGeo } from './Geo';
import type { Layer, LevelBuilder } from './LevelBuilder';

/**
 * Reusable procedural prop kit. Each function bakes geometry into the level
 * batches (static) and optionally adds colliders.
 */

const C = (c: THREE.ColorRepresentation) => new THREE.Color(c);

export function cloudCluster(
  b: LevelBuilder,
  x: number, y: number, z: number,
  w: number, d: number, count: number, seed: number,
  o: { color?: THREE.ColorRepresentation; top?: THREE.ColorRepresentation; scale?: number; layer?: Layer; flat?: number; detail?: number } = {},
): void {
  const rnd = createSeededRandom(seed);
  const s = o.scale ?? 1;
  for (let i = 0; i < count; i++) {
    const px = x + (rnd() - 0.5) * w;
    const pz = z + (rnd() - 0.5) * d;
    const edge = Math.max(Math.abs(px - x) / (w / 2 + 0.01), Math.abs(pz - z) / (d / 2 + 0.01));
    const r = (0.7 + rnd() * 0.9) * s * (1.15 - edge * 0.45);
    b.add(puffGeo(Math.floor(rnd() * 6), o.detail ?? ((o.layer ?? 'play') === 'play' ? 2 : 1)), {
      x: px, y: y + (rnd() - 0.3) * r * 0.4, z: pz,
      sx: r * (1 + rnd() * 0.4), sy: r * (o.flat ?? 0.75), sz: r * (1 + rnd() * 0.4),
      ry: rnd() * Math.PI,
      mat: b.mats.cloud,
      color: o.color ?? '#fff8f4',
      top: o.top ?? '#ffffff',
      ao: 0.45,
      layer: o.layer ?? 'play',
      shadow: (o.layer ?? 'play') === 'play',
    });
  }
}

/** Walkable fluffy island: slab collider + puffy rim and belly. */
export function cloudIsland(
  b: LevelBuilder,
  x: number, z: number, w: number, d: number, top: number, seed: number,
  o: { color?: THREE.ColorRepresentation; belly?: number; surfaceColor?: THREE.ColorRepresentation; layer?: Layer } = {},
): void {
  const layer = o.layer ?? 'play';
  if (layer === 'play') {
    b.physics.addBox(x, top - 0.6, z, w, 1.2, d, { surface: 'cloud', climbable: true });
  }
  // flat walk surface (soft rounded slab)
  b.add(roundedGeo(w, 0.9, d, 0.42, 3), {
    x, y: top - 0.45, z, mat: b.mats.cloud, color: o.surfaceColor ?? o.color ?? '#fff6f2', top: '#ffffff', ao: 0.2, layer,
  });
  const rnd = createSeededRandom(seed);
  // rim puffs
  const per = Math.max(6, Math.round(((w + d) * 2) / 1.6));
  for (let i = 0; i < per; i++) {
    const t = i / per;
    let px: number, pz: number;
    const perim = 2 * (w + d);
    let s = t * perim;
    if (s < w) { px = x - w / 2 + s; pz = z - d / 2; }
    else if ((s -= w) < d) { px = x + w / 2; pz = z - d / 2 + s; }
    else if ((s -= d) < w) { px = x + w / 2 - s; pz = z + d / 2; }
    else { s -= w; px = x - w / 2; pz = z + d / 2 - s; }
    const r = 0.7 + rnd() * 0.7;
    b.add(puffGeo(Math.floor(rnd() * 6), layer === 'play' ? 2 : 1), {
      x: px, y: top - 0.55 - rnd() * 0.3, z: pz, sx: r * 1.2, sy: r * 0.7, sz: r * 1.2, ry: rnd() * 3,
      mat: b.mats.cloud, color: o.color ?? '#fff3f0', top: '#ffffff', ao: 0.35, layer,
    });
  }
  // soft pillow lumps along the walkable rim (low enough to step over)
  const lumps = Math.round(((w + d) * 2) / 2.2);
  for (let i = 0; i < lumps; i++) {
    const t = (i + rnd() * 0.5) / lumps;
    const perim = 2 * (w + d);
    let s = t * perim;
    let px: number, pz: number;
    const inset = 0.5;
    if (s < w) { px = x - w / 2 + s; pz = z - d / 2 + inset; }
    else if ((s -= w) < d) { px = x + w / 2 - inset; pz = z - d / 2 + s; }
    else if ((s -= d) < w) { px = x + w / 2 - s; pz = z + d / 2 - inset; }
    else { s -= w; px = x - w / 2 + inset; pz = z + d / 2 - s; }
    const r = 0.45 + rnd() * 0.4;
    b.add(puffGeo(Math.floor(rnd() * 6), layer === 'play' ? 2 : 1), {
      x: px, y: top - 0.12, z: pz, sx: r * 1.3, sy: r * 0.42, sz: r * 1.3, ry: rnd() * 3,
      mat: b.mats.cloud, color: o.color ?? '#ffeef6', top: '#ffffff', ao: 0.25, layer,
    });
  }
  // belly
  const belly = o.belly ?? 1;
  const n = Math.round((w * d) / 7 * belly) + 3;
  for (let i = 0; i < n; i++) {
    const r = (1 + rnd() * 1.4) * Math.min(1.6, Math.sqrt(w * d) / 5 + 0.6);
    b.add(puffGeo(Math.floor(rnd() * 6), 1), {
      x: x + (rnd() - 0.5) * w * 0.85, y: top - 1.0 - r * 0.8 - rnd() * 1.2 * belly, z: z + (rnd() - 0.5) * d * 0.85,
      sx: r, sy: r * 0.8, sz: r, ry: rnd() * 3,
      mat: b.mats.cloud, color: o.color ?? '#efe2f2', top: '#fff6f6', ao: 0.5, layer, shadow: false,
    });
  }
}

export interface HouseOpts {
  w?: number; d?: number; h?: number; ry?: number;
  wall?: THREE.ColorRepresentation; roof?: THREE.ColorRepresentation; trim?: THREE.ColorRepresentation;
  lit?: boolean; layer?: Layer; collide?: boolean; chimney?: boolean; door?: THREE.ColorRepresentation;
}

/** Pastel storybook house with pitched roof, windows, door and chimney. */
export function house(b: LevelBuilder, x: number, y: number, z: number, o: HouseOpts = {}): void {
  const w = o.w ?? 4, d = o.d ?? 4, h = o.h ?? 3.2;
  const ry = o.ry ?? 0;
  const layer = o.layer ?? 'play';
  const wall = o.wall ?? '#ffd9e2';
  const roof = o.roof ?? '#8e7cc3';
  const trim = o.trim ?? '#fff6ec';
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const P = (lx: number, lz: number) => ({ x: x + lx * cos + lz * sin, z: z - lx * sin + lz * cos });
  b.box({ x, y: y + h / 2, z, w, h, d, ry, r: 0.18, color: wall, ao: 0.3, layer, collide: o.collide ?? layer === 'play', surface: 'wood' });
  // roof: triangular prism
  const roofG = new THREE.CylinderGeometry(1, 1, 1, 3, 1);
  roofG.rotateZ(Math.PI / 2);
  roofG.rotateX(-Math.PI / 2);
  const rh = Math.min(w, d) * 0.55;
  const rsy = rh / 1.5;
  b.add(roofG, { x, y: y + h + 0.5 * rsy - 0.05, z, sx: w * 1.08, sy: rsy, sz: (d / 2) * 1.18 / 0.866, ry, color: roof, top: C(roof).lerp(C('#ffffff'), 0.25), ao: 0.1, layer, mat: b.mats.satin });
  if (o.collide ?? layer === 'play') b.physics.addBox(x, y + h + rh * 0.25, z, Math.abs(cos) > 0.5 ? w : d, rh * 0.6, Math.abs(cos) > 0.5 ? d : w, { climbable: false });
  // windows
  const win = o.lit ? b.mats.glow : b.mats.satin;
  const winColor = o.lit ? '#ffd9a0' : '#9fc4ff';
  for (const side of [-1, 1]) {
    const p = P(side * w * 0.25, d / 2 + 0.02);
    b.add(roundedGeo(0.8, 0.9, 0.08, 0.06, 2), { x: p.x, y: y + h * 0.6, z: p.z, ry, color: winColor, mat: win, layer, ao: 0 });
    const f = P(side * w * 0.25, d / 2 + 0.06);
    b.add(boxGeo(0.95, 0.1, 0.1), { x: f.x, y: y + h * 0.6 - 0.5, z: f.z, ry, color: trim, layer });
  }
  const sp = P(w / 2 + 0.02, 0);
  b.add(roundedGeo(0.08, 0.9, 0.8, 0.04, 2), { x: sp.x, y: y + h * 0.6, z: sp.z, ry, color: winColor, mat: win, layer, ao: 0 });
  // door
  const dp = P(0, d / 2 + 0.04);
  b.add(roundedGeo(0.9, 1.7, 0.12, 0.08, 2), { x: dp.x, y: y + 0.85, z: dp.z, ry, color: o.door ?? '#7a5c9e', layer });
  const kp = P(0.3, d / 2 + 0.12);
  b.add(new THREE.SphereGeometry(0.06, 8, 6), { x: kp.x, y: y + 0.85, z: kp.z, color: '#ffe08a', mat: b.mats.metal, layer });
  if (o.chimney ?? true) {
    const cp = P(w * 0.25, -d * 0.15);
    b.add(roundedGeo(0.5, 1.2, 0.5, 0.08, 2), { x: cp.x, y: y + h + rh * 0.55, z: cp.z, ry, color: trim, layer });
  }
}

/** Tall soft apartment tower with window grid (glowing windows when lit). */
export function tower(
  b: LevelBuilder, x: number, y: number, z: number, w: number, d: number, h: number,
  o: { color?: THREE.ColorRepresentation; top?: THREE.ColorRepresentation; windows?: THREE.ColorRepresentation; lit?: number; layer?: Layer; seed?: number; collide?: boolean; r?: number } = {},
): void {
  const layer = o.layer ?? 'far';
  b.box({ x, y: y + h / 2, z, w, h, d, r: o.r ?? Math.min(w, d) * 0.12, color: o.color ?? '#f3c7d9', top: o.top, ao: 0.35, layer, collide: o.collide ?? false });
  const rnd = createSeededRandom(o.seed ?? Math.floor(x * 13 + z * 7));
  const rows = Math.floor(h / 2.6);
  const cols = Math.max(1, Math.floor(w / 1.8));
  const lit = o.lit ?? 0.35;
  const winC = o.windows ?? '#ffe3b0';
  for (let r = 1; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const on = rnd() < lit;
      const wx = x - w / 2 + (c + 0.5) * (w / cols);
      const wy = y + r * 2.6;
      b.add(boxGeo(0.9, 1.2, 0.1), { x: wx, y: wy, z: z + d / 2 + 0.03, color: on ? winC : '#6b6488', mat: on ? b.mats.glow : b.mats.satin, layer, ao: 0, shadow: false });
    }
  }
}

/** Cotton-candy tree: curved trunk + puffy canopy. */
export function tree(b: LevelBuilder, x: number, y: number, z: number, s = 1, o: { trunk?: THREE.ColorRepresentation; leaf?: THREE.ColorRepresentation; layer?: Layer; seed?: number; collide?: boolean } = {}): void {
  const layer = o.layer ?? 'play';
  const rnd = createSeededRandom(o.seed ?? Math.floor(x * 31 + z * 17));
  b.add(new THREE.CylinderGeometry(0.12 * s, 0.22 * s, 2.2 * s, 8), { x, y: y + 1.1 * s, z, color: o.trunk ?? '#b98b8b', layer, rz: (rnd() - 0.5) * 0.15 });
  const leaf = o.leaf ?? '#ffb8d6';
  for (let i = 0; i < 5; i++) {
    const r = (0.7 + rnd() * 0.5) * s;
    b.add(puffGeo(Math.floor(rnd() * 6), layer === 'play' ? 2 : 1), {
      x: x + (rnd() - 0.5) * 1.3 * s, y: y + (2.4 + rnd() * 0.8) * s, z: z + (rnd() - 0.5) * 1.3 * s,
      s: r, color: leaf, top: C(leaf).lerp(C('#ffffff'), 0.4), mat: b.mats.cloud, layer, ao: 0.4,
    });
  }
  if ((o.collide ?? true) && layer === 'play') b.physics.addBox(x, y + 1.1 * s, z, 0.4 * s, 2.2 * s, 0.4 * s, { climbable: false });
}

/** Street lamp with glowing bulb. */
export function lamp(b: LevelBuilder, x: number, y: number, z: number, o: { h?: number; color?: THREE.ColorRepresentation; bulb?: THREE.ColorRepresentation; layer?: Layer } = {}): void {
  const h = o.h ?? 3.2;
  const layer = o.layer ?? 'play';
  b.add(new THREE.CylinderGeometry(0.06, 0.09, h, 8), { x, y: y + h / 2, z, color: o.color ?? '#6d5a8c', mat: b.mats.metal, layer });
  b.add(new THREE.SphereGeometry(0.22, 12, 10), { x, y: y + h + 0.1, z, color: o.bulb ?? '#fff0c4', mat: b.mats.glow, layer, ao: 0 });
  b.add(new THREE.ConeGeometry(0.3, 0.25, 10), { x, y: y + h + 0.35, z, color: o.color ?? '#6d5a8c', mat: b.mats.metal, layer });
  if (layer === 'play') b.physics.addBox(x, y + h / 2, z, 0.2, h, 0.2, { climbable: false, noCamera: true });
}

export function bench(b: LevelBuilder, x: number, y: number, z: number, ry = 0, color: THREE.ColorRepresentation = '#c28f6e'): void {
  b.box({ x, y: y + 0.45, z, w: 1.8, h: 0.12, d: 0.5, ry, color, r: 0.04, collide: false });
  const cos = Math.cos(ry), sin = Math.sin(ry);
  b.box({ x: x - sin * 0.22, y: y + 0.8, z: z - cos * 0.22, w: 1.8, h: 0.5, d: 0.08, ry, color, r: 0.03, collide: false });
  for (const s of [-0.75, 0.75]) b.box({ x: x + cos * s, y: y + 0.22, z: z - sin * s, w: 0.1, h: 0.44, d: 0.45, ry, color: '#5e4a6e', collide: false });
  b.physics.addBox(x, y + 0.45, z, Math.abs(cos) > 0.5 ? 1.8 : 0.6, 0.9, Math.abs(cos) > 0.5 ? 0.6 : 1.8, { climbable: true });
}

/** Little picket fence line from a to b. */
export function fence(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number, color: THREE.ColorRepresentation = '#fff4ea', collide = true): void {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const ry = Math.atan2(-(z1 - z0), x1 - x0);
  const n = Math.max(2, Math.round(len / 0.45));
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    b.add(roundedGeo(0.12, 0.8, 0.06, 0.04, 1), { x: x0 + (x1 - x0) * t, y: y + 0.4, z: z0 + (z1 - z0) * t, ry, color });
  }
  b.add(boxGeo(len, 0.08, 0.05), { x: (x0 + x1) / 2, y: y + 0.55, z: (z0 + z1) / 2, ry, color });
  if (collide) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const ax = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    b.physics.addBox(cx, y + 0.45, cz, ax ? len : 0.2, 0.9, ax ? 0.2 : len, { climbable: true });
  }
}

/** Flower patch (static batch of little blooms). */
export function flowers(b: LevelBuilder, x: number, y: number, z: number, w: number, d: number, n: number, seed: number, palette: THREE.ColorRepresentation[]): void {
  const rnd = createSeededRandom(seed);
  for (let i = 0; i < n; i++) {
    const px = x + (rnd() - 0.5) * w, pz = z + (rnd() - 0.5) * d;
    const h = 0.25 + rnd() * 0.35;
    b.add(new THREE.CylinderGeometry(0.015, 0.02, h, 4), { x: px, y: y + h / 2, z: pz, color: '#8fc29a', shadow: false, ao: 0 });
    b.add(new THREE.IcosahedronGeometry(0.09 + rnd() * 0.05, 0), { x: px, y: y + h, z: pz, color: palette[Math.floor(rnd() * palette.length)], mat: b.mats.satin, shadow: false, ao: 0 });
  }
}

/** A ring of distant silhouettes (towers / floating districts) around a centre. */
export function skylineRing(
  b: LevelBuilder, cx: number, cz: number, radius: number, count: number, seed: number,
  o: { y?: number; hMin?: number; hMax?: number; color?: THREE.ColorRepresentation; top?: THREE.ColorRepresentation; windows?: THREE.ColorRepresentation; lit?: number; puffs?: boolean; spread?: number; arc?: [number, number] } = {},
): void {
  const rnd = createSeededRandom(seed);
  const [a0, a1] = o.arc ?? [0, Math.PI * 2];
  for (let i = 0; i < count; i++) {
    const a = a0 + (a1 - a0) * ((i + rnd() * 0.6) / count);
    const r = radius + (rnd() - 0.5) * (o.spread ?? radius * 0.3);
    const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
    const h = (o.hMin ?? 20) + rnd() * ((o.hMax ?? 60) - (o.hMin ?? 20));
    const w = 5 + rnd() * 9;
    const y = (o.y ?? -10) + (rnd() - 0.5) * 8;
    tower(b, x, y, z, w, w * (0.7 + rnd() * 0.5), h, { color: o.color, top: o.top, windows: o.windows, lit: o.lit ?? 0.3, layer: 'far', seed: i + seed });
    if (o.puffs ?? true) cloudCluster(b, x, y + 1, z, w * 2.2, w * 2.2, 5, seed + i, { scale: w * 0.28, layer: 'far', detail: 1 });
  }
}

/** Floating mini-district: island with houses (distant layer). */
export function floatingDistrict(b: LevelBuilder, x: number, y: number, z: number, s: number, seed: number, palette: { wall: string[]; roof: string[] }): void {
  const rnd = createSeededRandom(seed);
  cloudIsland(b, x, z, 14 * s, 10 * s, y, seed, { layer: 'far', belly: 1.6 });
  const n = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    house(b, x + (rnd() - 0.5) * 10 * s, y, z + (rnd() - 0.5) * 6 * s, {
      w: (2.6 + rnd() * 2) * s, d: (2.6 + rnd() * 2) * s, h: (2.4 + rnd() * 2.4) * s, ry: rnd() * Math.PI,
      wall: palette.wall[Math.floor(rnd() * palette.wall.length)], roof: palette.roof[Math.floor(rnd() * palette.roof.length)],
      layer: 'far', lit: rnd() > 0.5, chimney: rnd() > 0.4,
    });
  }
  if (rnd() > 0.4) tree(b, x + (rnd() - 0.5) * 8 * s, y, z + (rnd() - 0.5) * 6 * s, s * 1.2, { layer: 'far' });
}

/** Simple archway (decorative gateway) — two pillars + rounded top. */
export function arch(b: LevelBuilder, x: number, y: number, z: number, w: number, h: number, ry: number, color: THREE.ColorRepresentation, layer: Layer = 'play'): void {
  const cos = Math.cos(ry), sin = Math.sin(ry);
  for (const s of [-1, 1]) {
    b.box({ x: x + cos * s * w / 2, y: y + h / 2, z: z - sin * s * w / 2, w: 0.6, h, d: 0.6, ry, r: 0.12, color, layer, collide: layer === 'play' });
  }
  const t = new THREE.TorusGeometry(w / 2, 0.3, 8, 24, Math.PI);
  b.add(t, { x, y: y + h, z, ry, color, layer });
}

/** Distant giant shapes for interior "room beyond room" layers. */
export function repeatingRooms(b: LevelBuilder, x0: number, z0: number, nx: number, nz: number, size: number, h: number, y: number, color: THREE.ColorRepresentation, mat?: THREE.Material): void {
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < nz; j++) {
      const x = x0 + i * size, z = z0 + j * size;
      // pillars at cell corners
      b.add(boxGeo(size * 0.12, h, size * 0.12), { x, y: y + h / 2, z, color, layer: 'far', mat });
      // partial walls
      if ((i + j) % 2 === 0) b.add(boxGeo(size * 0.6, h, 0.3), { x: x + size * 0.3, y: y + h / 2, z, color, layer: 'far', mat });
      if ((i * 3 + j) % 3 === 0) b.add(boxGeo(0.3, h, size * 0.5), { x, y: y + h / 2, z: z + size * 0.25, color, layer: 'far', mat });
    }
}
