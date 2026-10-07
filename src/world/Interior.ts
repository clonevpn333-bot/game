import * as THREE from 'three';
import { boxGeo, roundedGeo } from './Geo';
import type { Layer, LevelBuilder } from './LevelBuilder';
import type { Surface } from './Physics';

export type Side = 'n' | 's' | 'e' | 'w';

export interface ShellOpts {
  floorMat?: THREE.Material;
  wallMat?: THREE.Material;
  ceilMat?: THREE.Material;
  floorColor?: THREE.ColorRepresentation;
  wallColor?: THREE.ColorRepresentation;
  wallTop?: THREE.ColorRepresentation;
  ceilColor?: THREE.ColorRepresentation;
  /** Door/opening gaps: along a side, from..to in world coords on that wall's axis, optional height. */
  openings?: Array<{ side: Side; from: number; to: number; h?: number }>;
  noCeiling?: boolean;
  noFloor?: boolean;
  skipWalls?: Side[];
  thick?: number;
  surface?: Surface;
  lights?: { spacing: number; color: THREE.ColorRepresentation; w?: number; d?: number; mat?: THREE.Material } | null;
  layer?: Layer;
  baseboard?: THREE.ColorRepresentation;
}

/**
 * Rectangular room shell between (x0,z0)-(x1,z1) with floor at y and height h.
 * North = -Z side (z0), South = +Z (z1), West = -X (x0), East = +X (x1).
 */
export function shell(b: LevelBuilder, x0: number, z0: number, x1: number, z1: number, y: number, h: number, o: ShellOpts = {}): void {
  const t = o.thick ?? 0.4;
  const w = x1 - x0, d = z1 - z0;
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const layer = o.layer ?? 'play';
  const collide = layer === 'play';
  if (!o.noFloor) b.box({ x: cx, y: y - 0.25, z: cz, w, h: 0.5, d, mat: o.floorMat, color: o.floorColor ?? '#ffffff', ao: 0, surface: o.surface ?? 'stone', layer, collide });
  if (!o.noCeiling) b.box({ x: cx, y: y + h + 0.2, z: cz, w, h: 0.4, d, mat: o.ceilMat, color: o.ceilColor ?? '#ffffff', ao: 0, layer, collide, climbable: false });
  const wallSeg = (side: Side, a: number, bnd: number, yb: number, yt: number) => {
    if (bnd - a < 0.01 || yt - yb < 0.01) return;
    const len = bnd - a;
    const mid = (a + bnd) / 2;
    const hh = yt - yb;
    const opts = { mat: o.wallMat, color: o.wallColor ?? '#ffffff', top: o.wallTop, ao: 0.18, layer, collide, climbable: false };
    if (side === 'n') b.box({ ...opts, x: mid, y: yb + hh / 2, z: z0 - t / 2, w: len, h: hh, d: t });
    if (side === 's') b.box({ ...opts, x: mid, y: yb + hh / 2, z: z1 + t / 2, w: len, h: hh, d: t });
    if (side === 'w') b.box({ ...opts, x: x0 - t / 2, y: yb + hh / 2, z: mid, w: t, h: hh, d: len });
    if (side === 'e') b.box({ ...opts, x: x1 + t / 2, y: yb + hh / 2, z: mid, w: t, h: hh, d: len });
    if (o.baseboard && yb <= y + 0.01) {
      const bb = { color: o.baseboard, layer, collide: false, ao: 0 } as const;
      if (side === 'n') b.box({ ...bb, x: mid, y: y + 0.12, z: z0 + 0.03, w: len, h: 0.24, d: 0.06 });
      if (side === 's') b.box({ ...bb, x: mid, y: y + 0.12, z: z1 - 0.03, w: len, h: 0.24, d: 0.06 });
      if (side === 'w') b.box({ ...bb, x: x0 + 0.03, y: y + 0.12, z: mid, w: 0.06, h: 0.24, d: len });
      if (side === 'e') b.box({ ...bb, x: x1 - 0.03, y: y + 0.12, z: mid, w: 0.06, h: 0.24, d: len });
    }
  };
  for (const side of ['n', 's', 'w', 'e'] as Side[]) {
    if (o.skipWalls?.includes(side)) continue;
    const horiz = side === 'n' || side === 's';
    const lo = horiz ? x0 : z0;
    const hi = horiz ? x1 : z1;
    const gaps = (o.openings ?? []).filter((g) => g.side === side).sort((a, c) => a.from - c.from);
    let cur = lo;
    for (const g of gaps) {
      wallSeg(side, cur, g.from, y, y + h);
      const gh = g.h ?? h;
      if (gh < h && gh > 0) wallSeg(side, g.from, g.to, y + gh, y + h); // lintel (h:0 = full-height hole)
      cur = g.to;
    }
    wallSeg(side, cur, hi, y, y + h);
  }
  if (o.lights) {
    const L = o.lights;
    for (let x = x0 + L.spacing / 2; x < x1; x += L.spacing)
      for (let z = z0 + L.spacing / 2; z < z1; z += L.spacing) {
        b.add(boxGeo(L.w ?? 1.2, 0.06, L.d ?? 0.6), { x, y: y + h - 0.03, z, color: L.color, mat: L.mat ?? b.mats.glow, ao: 0, shadow: false, layer });
      }
  }
  void d;
}

/** Decorative door (frame + panel + knob), facing +Z when ry=0. */
export function door(b: LevelBuilder, x: number, y: number, z: number, ry: number, o: { color?: THREE.ColorRepresentation; frame?: THREE.ColorRepresentation; w?: number; h?: number; number?: boolean; layer?: Layer } = {}): void {
  const w = o.w ?? 1.1, h = o.h ?? 2.2;
  const cos = Math.cos(ry), sin = Math.sin(ry);
  const off = (f: number) => ({ x: x + sin * f, z: z + cos * f });
  const layer = o.layer ?? 'play';
  const f = off(0.03);
  b.box({ x: f.x, y: y + h / 2 + 0.05, z: f.z, w: w + 0.24, h: h + 0.12, d: 0.08, ry, color: o.frame ?? '#f2e6d0', collide: false, layer });
  const p = off(0.08);
  b.box({ x: p.x, y: y + h / 2, z: p.z, w, h, d: 0.06, ry, color: o.color ?? '#7a5c9e', collide: false, layer, r: 0.02 });
  const k = off(0.14);
  b.add(new THREE.SphereGeometry(0.05, 8, 6), { x: k.x + cos * w * 0.38, y: y + h * 0.48, z: k.z - sin * w * 0.38, color: '#e8c27a', mat: b.mats.metal, layer });
}

export function pillar(b: LevelBuilder, x: number, y: number, z: number, h: number, o: { r?: number; color?: THREE.ColorRepresentation; square?: boolean; mat?: THREE.Material; layer?: Layer; collide?: boolean } = {}): void {
  const r = o.r ?? 0.4;
  const layer = o.layer ?? 'play';
  if (o.square) b.box({ x, y: y + h / 2, z, w: r * 2, h, d: r * 2, color: o.color ?? '#ffffff', mat: o.mat, layer, collide: o.collide ?? layer === 'play', climbable: false });
  else {
    b.add(new THREE.CylinderGeometry(r, r * 1.05, h, 16), { x, y: y + h / 2, z, color: o.color ?? '#ffffff', mat: o.mat, layer });
    b.add(new THREE.CylinderGeometry(r * 1.35, r * 1.35, 0.3, 16), { x, y: y + 0.15, z, color: o.color ?? '#ffffff', mat: o.mat, layer });
    b.add(new THREE.CylinderGeometry(r * 1.35, r * 1.1, 0.3, 16), { x, y: y + h - 0.15, z, color: o.color ?? '#ffffff', mat: o.mat, layer });
    if ((o.collide ?? true) && layer === 'play') b.physics.addBox(x, y + h / 2, z, r * 2, h, r * 2, { climbable: false });
  }
}

/** Long corridor along -Z from z0 to z1 (z1 < z0), width w, with side doors and lights. */
export function corridor(
  b: LevelBuilder, cx: number, z0: number, z1: number, y: number, w: number, h: number,
  o: ShellOpts & { doorEvery?: number; doorColor?: THREE.ColorRepresentation; doorFrame?: THREE.ColorRepresentation; endOpen?: boolean; startOpen?: boolean },
): void {
  const openings = [...(o.openings ?? [])];
  if (o.endOpen) openings.push({ side: 'n', from: cx - w / 2, to: cx + w / 2 });
  if (o.startOpen) openings.push({ side: 's', from: cx - w / 2, to: cx + w / 2 });
  shell(b, cx - w / 2, z1, cx + w / 2, z0, y, h, { ...o, openings });
  if (o.doorEvery) {
    let i = 0;
    for (let z = z0 - o.doorEvery / 2; z > z1 + 0.6; z -= o.doorEvery) {
      door(b, cx - w / 2 + 0.01, y, z, Math.PI / 2, { color: o.doorColor, frame: o.doorFrame });
      door(b, cx + w / 2 - 0.01, y, z - o.doorEvery / 2, -Math.PI / 2, { color: o.doorColor, frame: o.doorFrame });
      i++;
    }
    void i;
  }
}

/** Fluorescent tube fixture (glow + housing). */
export function tubeLight(b: LevelBuilder, x: number, y: number, z: number, ry = 0, color: THREE.ColorRepresentation = '#fff8e0', len = 1.4, mat?: THREE.Material): void {
  b.add(boxGeo(len + 0.1, 0.08, 0.36), { x, y: y + 0.02, z, ry, color: '#d8d2c0', shadow: false });
  b.add(roundedGeo(len, 0.05, 0.12, 0.02, 1), { x, y: y - 0.04, z, ry, color, mat: mat ?? b.mats.glow, ao: 0, shadow: false });
}
