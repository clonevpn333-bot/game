import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Collider, PhysicsWorld } from '../core/Physics';
import { audio } from '../audio/AudioEngine';
import { damp } from '../render/Globals';

export type CarKind = 'sedan' | 'taxi' | 'hatch' | 'van' | 'police' | 'bus';

const geoCache = new Map<string, { solid: THREE.BufferGeometry; glass: THREE.BufferGeometry; lights: THREE.BufferGeometry; L: number; W: number }>();
const matCache = new Map<string, THREE.Material>();
function mat(key: string, make: () => THREE.Material): THREE.Material {
  let m = matCache.get(key);
  if (!m) matCache.set(key, (m = make()));
  return m;
}

const _col = new THREE.Color();
function colored(g: THREE.BufferGeometry, color: THREE.ColorRepresentation, k = 1): THREE.BufferGeometry {
  const n = g.getAttribute('position').count;
  const nor = g.getAttribute('normal');
  const c = new Float32Array(n * 3);
  _col.set(color);
  for (let i = 0; i < n; i++) {
    const s = k * (1 + 0.12 * nor.getY(i));
    c[i * 3] = _col.r * s;
    c[i * 3 + 1] = _col.g * s;
    c[i * 3 + 2] = _col.b * s;
  }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}

/** Stylized blocky car merged into three meshes (body, glass, lamps), cached per kind+colour. */
function carGeometry(kind: CarKind, paint: string): { solid: THREE.BufferGeometry; glass: THREE.BufferGeometry; lights: THREE.BufferGeometry; L: number; W: number } {
  const key = kind + paint;
  const hit = geoCache.get(key);
  if (hit) return hit;
  const L = kind === 'bus' ? 10 : kind === 'van' ? 4.9 : kind === 'hatch' ? 3.9 : 4.5;
  const W = kind === 'bus' ? 2.5 : kind === 'van' ? 2.0 : 1.86;
  const H0 = kind === 'bus' ? 0.5 : 0.36;
  const bodyH = kind === 'bus' ? 2.3 : kind === 'van' ? 1.55 : 0.62;
  const solid: THREE.BufferGeometry[] = [];
  const glass: THREE.BufferGeometry[] = [];
  const lights: THREE.BufferGeometry[] = [];
  const add = (list: THREE.BufferGeometry[], color: string, w: number, h: number, d: number, x: number, y: number, z: number, r = 0.08, k = 1) => {
    const g = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w * 0.45, h * 0.45, d * 0.45));
    g.translate(x, y, z);
    list.push(colored(g.index ? g.toNonIndexed() : g, color, k));
  };
  const DARK = '#17181b';
  const TRIM = '#b8bcc2';
  add(solid, paint, W, bodyH, L, 0, H0 + bodyH / 2, 0, 0.16);
  if (kind === 'sedan' || kind === 'taxi' || kind === 'police' || kind === 'hatch') {
    const cabL = kind === 'hatch' ? 2.3 : 2.2;
    const cabZ = kind === 'hatch' ? -0.35 : -0.15;
    add(solid, paint, W * 0.9, 0.56, cabL, 0, H0 + bodyH + 0.27, cabZ, 0.14);
    add(glass, '#0d1620', W * 0.92, 0.42, cabL * 0.94, 0, H0 + bodyH + 0.28, cabZ, 0.1);
    for (const z of [cabZ - cabL * 0.47, cabZ + cabL * 0.47, cabZ + 0.05]) add(solid, paint, W * 0.94, 0.44, 0.1, 0, H0 + bodyH + 0.28, z, 0.03);
    add(solid, paint, W * 0.9, 0.06, cabL * 0.96, 0, H0 + bodyH + 0.54, cabZ, 0.03);
  } else {
    add(glass, '#0d1620', W * 1.01, kind === 'bus' ? 0.9 : 0.55, L * (kind === 'bus' ? 0.92 : 0.45), 0, H0 + bodyH - (kind === 'bus' ? 0.6 : 0.42), kind === 'bus' ? 0 : L * 0.22, 0.05);
    if (kind === 'bus') for (let i = 0; i < 6; i++) add(solid, paint, W * 1.02, 0.92, 0.12, 0, H0 + bodyH - 0.6, -L * 0.42 + i * L * 0.17, 0.02);
  }
  add(solid, DARK, W * 1.02, 0.22, 0.2, 0, H0 + 0.12, L / 2 + 0.02, 0.06);
  add(solid, DARK, W * 1.02, 0.22, 0.2, 0, H0 + 0.12, -L / 2 - 0.02, 0.06);
  add(solid, DARK, W * 0.5, 0.16, 0.06, 0, H0 + bodyH * 0.55, L / 2 + 0.03, 0.03);
  for (const sx of [-1, 1]) {
    add(solid, DARK, 0.06, 0.12, L * 0.62, sx * (W / 2 + 0.01), H0 + 0.1, 0, 0.03);
    add(solid, TRIM, 0.02, bodyH * 0.7, 0.02, sx * (W / 2 + 0.005), H0 + bodyH * 0.5, 0.15, 0.005);
    add(solid, TRIM, 0.03, 0.04, 0.16, sx * (W / 2 + 0.01), H0 + bodyH * 0.72, 0.5, 0.01);
    add(solid, TRIM, 0.03, 0.04, 0.16, sx * (W / 2 + 0.01), H0 + bodyH * 0.72, -0.4, 0.01);
    if (kind !== 'bus') add(solid, DARK, 0.16, 0.1, 0.12, sx * (W / 2 + 0.1), H0 + bodyH + 0.12, 0.85, 0.03);
    add(lights, '#fff4dc', 0.36, 0.12, 0.05, sx * (W / 2 - 0.3), H0 + bodyH * 0.62, L / 2 + 0.01, 0.03, 3);
    add(lights, '#ff2a1a', 0.34, 0.12, 0.05, sx * (W / 2 - 0.28), H0 + bodyH * 0.66, -L / 2 - 0.01, 0.03, 2.4);
    for (const sz of [-1, 1]) {
      const wz = sz * (L / 2 - (kind === 'bus' ? 1.6 : 0.85));
      const tyre = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14);
      tyre.rotateZ(Math.PI / 2);
      tyre.translate(sx * (W / 2 - 0.12), 0.36, wz);
      solid.push(colored(tyre.toNonIndexed(), '#141416'));
      const hub = new THREE.CylinderGeometry(0.2, 0.2, 0.27, 8);
      hub.rotateZ(Math.PI / 2);
      hub.translate(sx * (W / 2 - 0.11), 0.36, wz);
      solid.push(colored(hub.toNonIndexed(), '#8a8f96'));
    }
  }
  if (kind === 'taxi') {
    add(lights, '#ffe9a8', 0.7, 0.2, 0.3, 0, H0 + bodyH + 0.66, -0.15, 0.04, 2);
    for (let i = 0; i < 10; i++) for (const sx of [-1, 1]) add(solid, i % 2 ? '#111111' : '#f4f1e6', 0.02, 0.08, 0.18, sx * (W / 2 + 0.005), H0 + 0.42, -0.9 + i * 0.18, 0.005);
  }
  if (kind === 'police') add(solid, '#1d2a44', W + 0.02, 0.14, 2.6, 0, H0 + 0.36, 0.1, 0.02);
  const out = {
    solid: mergeGeometries(solid)!,
    glass: glass.length ? mergeGeometries(glass)! : new THREE.BufferGeometry(),
    lights: mergeGeometries(lights)!,
    L, W,
  };
  for (const g of [...solid, ...glass, ...lights]) g.dispose();
  geoCache.set(key, out);
  return out;
}

export interface CarOpts {
  kind?: CarKind;
  color?: string;
  lights?: boolean;
}

export const CAR_COLORS = ['#c0392b', '#1f3a5f', '#e8e4dc', '#2a2a2c', '#5a6066', '#2e6b4a', '#c48a2a', '#16485a', '#8e44ad', '#d35400', '#7f8c8d'];

/** A car body you can place, light and drive. */
export function carModel(o: CarOpts = {}): THREE.Group {
  const kind = o.kind ?? 'sedan';
  const color = o.color ?? (kind === 'taxi' ? '#f2c12e' : kind === 'police' ? '#e8ecf2' : kind === 'bus' ? '#2a7ab8' : CAR_COLORS[0]);
  const g = carGeometry(kind, color);
  const grp = new THREE.Group();
  const solidM = mat('solid', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.34, metalness: 0.35 }));
  const glassM = mat('glass', () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.06, metalness: 0.9 }));
  const lit = o.lights !== false;
  const lightM = mat('lamps' + lit, () => new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, color: lit ? '#ffffff' : '#333333' }));
  const body = new THREE.Mesh(g.solid, solidM);
  body.castShadow = true;
  body.receiveShadow = true;
  grp.add(body, new THREE.Mesh(g.glass, glassM), new THREE.Mesh(g.lights, lightM));
  grp.userData.len = g.L;
  grp.userData.width = g.W;
  grp.userData.wheels = [];
  if (kind === 'police') {
    const bar = new THREE.Group();
    const red = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.12, 0.25, 2, 0.03), mat('pred', () => new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2020').multiplyScalar(2.5) })));
    const blue = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.12, 0.25, 2, 0.03), mat('pblue', () => new THREE.MeshBasicMaterial({ color: new THREE.Color('#2a5bff').multiplyScalar(2.5) })));
    red.position.x = 0.27;
    blue.position.x = -0.27;
    bar.add(red, blue);
    bar.position.set(0, 0.36 + 0.62 + 0.62, -0.15);
    grp.add(bar);
    grp.userData.bar = bar;
  }
  return grp;
}

// ---------------------------------------------------------------- traffic simulation
export interface Lane {
  /** start/end along a straight line; cars wrap from end back to start (off-screen) */
  a: THREE.Vector3;
  b: THREE.Vector3;
  /** distances along the lane where a stop line sits, keyed to a signal */
  stops: { at: number; signal: Signal }[];
}

export class Signal {
  /** true = this direction may go */
  green = true;
  /** walk = pedestrians may cross the street this signal controls */
  constructor(public phase = 0, public period = 18, public from = 0, public to = 0.45) {}
  update(t: number): void {
    const p = (((t + this.phase) % this.period) + this.period) % this.period / this.period;
    this.green = p >= this.from && p < this.to;
  }
}

interface Car {
  obj: THREE.Group;
  lane: Lane;
  s: number;
  v: number;
  max: number;
  len: number;
  collider: Collider;
  honkT: number;
  passT: number;
}

export class Traffic {
  readonly group = new THREE.Group();
  readonly cars: Car[] = [];
  readonly signals: Signal[] = [];
  /** set false to freeze all traffic (Blackout) */
  running = true;
  time = 0;

  constructor(private readonly phys: PhysicsWorld) {}

  addCar(lane: Lane, s: number, o: CarOpts = {}, max = 9): void {
    const obj = carModel(o);
    const len = obj.userData.len as number;
    const w = obj.userData.width as number;
    const collider = this.phys.add({ cx: 0, cy: 0.9, cz: 0, hx: w / 2, hy: 0.9, hz: len / 2, noVault: false, tag: 'car' });
    this.group.add(obj);
    const car: Car = { obj, lane, s, v: max * 0.8, max, len, collider, honkT: 0, passT: Math.random() * 3 };
    this.cars.push(car);
    this.place(car);
  }

  private place(c: Car): void {
    const { a, b } = c.lane;
    const L = a.distanceTo(b);
    const k = c.s / L;
    c.obj.position.lerpVectors(a, b, k);
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    c.obj.rotation.y = yaw;
    this.phys.setYaw(c.collider, yaw);
    c.collider.cx = c.obj.position.x;
    c.collider.cz = c.obj.position.z;
  }

  update(dt: number, player: THREE.Vector3, onHonk?: (p: THREE.Vector3) => void): void {
    this.time += dt;
    for (const s of this.signals) s.update(this.time);
    for (const c of this.cars) {
      const L = c.lane.a.distanceTo(c.lane.b);
      const dir = c.lane.b.clone().sub(c.lane.a).normalize();
      // gap to the car ahead in the same lane
      let gap = 1e9;
      for (const o of this.cars) {
        if (o === c || o.lane !== c.lane) continue;
        let d = o.s - c.s;
        if (d < 0) d += L;
        gap = Math.min(gap, d - (o.len + c.len) / 2);
      }
      // stop lines
      let stopGap = 1e9;
      for (const st of c.lane.stops) {
        if (st.signal.green) continue;
        const d = st.at - c.s - c.len / 2;
        if (d > -0.5 && d < 40) stopGap = Math.min(stopGap, d);
      }
      // the player standing in the road ahead
      const rel = player.clone().sub(c.obj.position);
      const along = rel.dot(dir);
      const lat = Math.abs(rel.x * dir.z - rel.z * dir.x);
      let pGap = 1e9;
      if (along > 0 && along < 18 && lat < 1.6 && player.y < 2.5) pGap = along - c.len / 2 - 1.2;
      const free = Math.min(gap - 2, stopGap, pGap);
      const want = !this.running ? 0 : free < 0.3 ? 0 : Math.min(c.max, free * 1.1);
      c.v = damp(c.v, want, want < c.v ? 4 : 1.2, dt);
      c.s += c.v * dt;
      if (c.s > L) c.s -= L;
      this.place(c);
      for (const w of c.obj.userData.wheels as THREE.Mesh[]) w.rotation.x += (c.v / 0.36) * dt;
      // honk at a blocking player
      if (pGap < 3 && this.running) {
        c.honkT += dt;
        if (c.honkT > 1.2) {
          c.honkT = -2.5;
          audio.horn(c.obj.position, Math.random() < 0.4);
          onHonk?.(c.obj.position);
        }
      } else c.honkT = Math.max(0, c.honkT - dt);
      // passing whoosh near the player
      c.passT -= dt;
      if (c.v > 4 && c.passT < 0 && c.obj.position.distanceTo(player) < 9) {
        c.passT = 4;
        audio.carPass(c.obj.position, 0.25);
      }
      const bar = c.obj.userData.bar as THREE.Group | undefined;
      if (bar) bar.children.forEach((m, i) => ((m as THREE.Mesh).visible = Math.sin(this.time * 10 + i * Math.PI) > 0));
    }
  }

  dispose(): void {
    for (const c of this.cars) this.phys.remove(c.collider);
    this.cars.length = 0;
    this.group.removeFromParent();
  }
}
