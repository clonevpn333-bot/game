import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { M, facadeMaterial, signMaterial, glowMaterial, texturedMaterial } from '../render/Materials';
import * as T from '../render/Textures';
import type { World } from './World';
import { R } from '../render/Globals';

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const rbox = (w: number, h: number, d: number, r = 0.05) => new RoundedBoxGeometry(w, h, d, 2, r);
const cyl = (r1: number, r2: number, h: number, s = 12) => new THREE.CylinderGeometry(r1, r2, h, s);

function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): THREE.Mesh {
  const o = new THREE.Mesh(g, m);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  return o;
}

// ============================================================================ city
export type Style = T.FacadeStyle;

/** A building occupying [x0,x1]x[z0,z1], with facade windows, cornice, roof clutter and optional storefront. */
export function building(W: World, x0: number, z0: number, x1: number, z1: number, h: number, style: Style, seed: number, o: {
  store?: { side: 'n' | 's' | 'e' | 'w'; sign?: string; color?: string; lit?: boolean }; emissive?: number; base?: number; noRoof?: boolean;
} = {}): void {
  const L = M();
  const fm = facadeMaterial(style, seed % 6, o.emissive ?? 1.6);
  const base = o.base ?? 0;
  W.box([x0, base, z0], [x1, base + h, z1], fm, { uv: style === 'office' ? 24 : 22, surface: 'concrete' });
  // cornice + parapet
  const trim = style === 'office' ? L.metalDark : L.trimLight;
  W.box([x0 - 0.25, base + h - 0.5, z0 - 0.25], [x1 + 0.25, base + h, z1 + 0.25], trim, { collide: false });
  W.box([x0 - 0.15, base + 3.6, z0 - 0.15], [x1 + 0.15, base + 4.0, z1 + 0.15], trim, { collide: false });
  if (!o.noRoof) {
    const r = R.next;
    const cx = (x0 + x1) / 2;
    const cz = (z0 + z1) / 2;
    const units = 1 + Math.floor(r() * 3);
    for (let i = 0; i < units; i++) {
      const ux = x0 + 2 + r() * Math.max(0.5, x1 - x0 - 4);
      const uz = z0 + 2 + r() * Math.max(0.5, z1 - z0 - 4);
      W.box([ux - 1, base + h, uz - 1.2], [ux + 1, base + h + 1.4, uz + 1.2], L.metal, { collide: false });
    }
    if (h > 30 && r() < 0.6) {
      W.box([cx - 0.15, base + h, cz - 0.15], [cx + 0.15, base + h + 8, cz + 0.15], L.metalDark, { collide: false });
      W.light({ x: cx, y: base + h + 8.2, z: cz }, '#ff2010', { noLight: true, glow: 1.6, pool: false, flicker: 0.5 });
    }
  }
  if (o.store) {
    const s = o.store;
    const sideLen = s.side === 'n' || s.side === 's' ? x1 - x0 : z1 - z0;
    const yaw = s.side === 's' ? 0 : s.side === 'n' ? Math.PI : s.side === 'e' ? Math.PI / 2 : -Math.PI / 2;
    const out = s.side === 's' ? V(0, 0, z1) : s.side === 'n' ? V(0, 0, z0) : s.side === 'e' ? V(x1, 0, 0) : V(x0, 0, 0);
    const c = s.side === 's' || s.side === 'n' ? V((x0 + x1) / 2, 0, out.z) : V(out.x, 0, (z0 + z1) / 2);
    const nrm = V(Math.sin(yaw), 0, Math.cos(yaw));
    // dark display glass band with mullions
    const glassC = c.clone().addScaledVector(nrm, 0.02);
    W.quad(L.glassDark, { x: glassC.x, y: base + 1.7, z: glassC.z }, sideLen - 1, 2.8, yaw);
    if (s.lit) W.quad(glowMaterial(s.color ?? '#ffe8c0', 0.25, 'shop'), { x: glassC.x - nrm.x * 0.01, y: base + 1.6, z: glassC.z - nrm.z * 0.01 }, sideLen - 1.2, 2.6, yaw);
    // awning
    const aw = c.clone().addScaledVector(nrm, 0.8);
    W.boxC([aw.x, base + 3.35, aw.z], s.side === 'n' || s.side === 's' ? [sideLen - 0.6, 0.12, 1.6] : [1.6, 0.12, sideLen - 0.6], L.paintRed, 0, { collide: false });
    if (s.sign) {
      const sp = c.clone().addScaledVector(nrm, 0.06);
      W.quad(signMaterial(s.sign, { bg: '#0a0a0a', fg: s.color ?? '#ffd27a', glow: s.color ?? '#ffb040', w: 512, h: 96, intensity: 2.6 }), { x: sp.x, y: base + 3.9, z: sp.z }, Math.min(sideLen - 1, 7), 1.0, yaw);
      W.light({ x: sp.x + nrm.x * 0.8, y: base + 3.6, z: sp.z + nrm.z * 0.8 }, s.color ?? '#ffb060', { intensity: 6, distance: 9, glow: 0, pool: true, streak: false });
    }
  }
}

/** Distant skyline: big boxes with lit facades, no colliders. */
export function skyline(W: World, cx: number, cz: number, rMin: number, rMax: number, count: number, seed: number, hMax = 140): void {
  const r = T as unknown; void r;
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const styles: Style[] = ['office', 'apartment', 'concrete', 'office', 'brick'];
  for (let i = 0; i < count; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rMin + rnd() * (rMax - rMin);
    const x = cx + Math.cos(a) * d;
    const z = cz + Math.sin(a) * d;
    const w = 10 + rnd() * 22;
    const dd = 10 + rnd() * 22;
    const h = 15 + Math.pow(rnd(), 2.2) * hMax;
    const st = styles[Math.floor(rnd() * styles.length)];
    W.box([x - w / 2, 0, z - dd / 2], [x + w / 2, h, z + dd / 2], facadeMaterial(st, Math.floor(rnd() * 6), 2.2), { collide: false, uv: 22, cast: false });
    if (h > 80 && rnd() < 0.5) W.light({ x, y: h + 2, z }, '#ff2010', { noLight: true, glow: 3, pool: false });
  }
}

/** Street segment along x or z with asphalt, lane markings, curbs and sidewalks. */
export function street(W: World, x0: number, z0: number, x1: number, z1: number, o: { sidewalk?: number; axis?: 'x' | 'z'; crosswalks?: number[] } = {}): void {
  const L = M();
  const sw = o.sidewalk ?? 4;
  const axis = o.axis ?? (x1 - x0 > z1 - z0 ? 'x' : 'z');
  W.box([x0, -0.2, z0], [x1, 0, z1], L.asphalt, { uv: 8, surface: 'wet', cast: false });
  if (axis === 'x') {
    const cz = (z0 + z1) / 2;
    for (let x = x0 + 1; x < x1 - 3; x += 6) W.box([x, 0, cz - 0.08], [x + 3, 0.012, cz + 0.08], L.laneYellow, { collide: false, cast: false });
    W.box([x0, 0, z0 - sw], [x1, 0.15, z0], L.sidewalk, { uv: 2, surface: 'concrete', cast: false });
    W.box([x0, 0, z1], [x1, 0.15, z1 + sw], L.sidewalk, { uv: 2, surface: 'concrete', cast: false });
    W.box([x0, 0, z0 - 0.25], [x1, 0.17, z0], L.curb, { collide: false });
    W.box([x0, 0, z1], [x1, 0.17, z1 + 0.25], L.curb, { collide: false });
    for (const cx of o.crosswalks ?? []) for (let z = z0 + 0.5; z < z1 - 0.5; z += 1.1) W.box([cx - 2, 0, z], [cx + 2, 0.012, z + 0.55], L.lane, { collide: false, cast: false });
  } else {
    const cx = (x0 + x1) / 2;
    for (let z = z0 + 1; z < z1 - 3; z += 6) W.box([cx - 0.08, 0, z], [cx + 0.08, 0.012, z + 3], L.laneYellow, { collide: false, cast: false });
    W.box([x0 - sw, 0, z0], [x0, 0.15, z1], L.sidewalk, { uv: 2, surface: 'concrete', cast: false });
    W.box([x1, 0, z0], [x1 + sw, 0.15, z1], L.sidewalk, { uv: 2, surface: 'concrete', cast: false });
    W.box([x0 - 0.25, 0, z0], [x0, 0.17, z1], L.curb, { collide: false });
    W.box([x1, 0, z0], [x1 + 0.25, 0.17, z1], L.curb, { collide: false });
    for (const cz of o.crosswalks ?? []) for (let x = x0 + 0.5; x < x1 - 0.5; x += 1.1) W.box([x, 0, cz - 2], [x + 0.55, 0.012, cz + 2], L.lane, { collide: false, cast: false });
  }
}

/** Sodium street lamp: pole, curved arm, lamp head, volumetric cone + pooled light. */
export function streetLight(W: World, x: number, z: number, yaw: number, o: { color?: string; flicker?: number; layer?: 'echo' | 'present'; on?: boolean } = {}): void {
  const L = M();
  const g = new THREE.Group();
  g.add(mesh(cyl(0.09, 0.14, 7.5, 10), L.metalDark, 0, 3.75, 0));
  g.add(mesh(cyl(0.2, 0.25, 0.5, 10), L.metalDark, 0, 0.25, 0));
  g.add(mesh(box(0.12, 0.12, 2.2), L.metalDark, 0, 7.4, 1.0));
  g.add(mesh(rbox(0.5, 0.18, 0.9, 0.06), L.metalDark, 0, 7.35, 2.0));
  W.prop(g, V(x, 0, z), yaw, { echo: o.layer });
  W.physics.add({ cx: x, cy: 3.75, cz: z, hx: 0.16, hy: 3.75, hz: 0.16 });
  const head = V(x + Math.sin(yaw) * 2.0, 7.2, z + Math.cos(yaw) * 2.0);
  const col = o.color ?? '#ffb468';
  W.quad(new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(5) }), { x: head.x, y: 7.24, z: head.z }, 0.4, 0.75, yaw, { pitch: Math.PI / 2, echo: o.layer });
  if (o.on !== false) W.light(head, col, { intensity: 34, distance: 20, cone: 3.4, flicker: o.flicker ?? 0, glow: 1.4, layer: o.layer });
}

/** Traffic signal that keeps cycling forever. */
export function trafficLight(W: World, x: number, z: number, yaw: number, phase = 0): void {
  const L = M();
  const g = new THREE.Group();
  g.add(mesh(cyl(0.08, 0.1, 5.2, 10), L.metalDark, 0, 2.6, 0));
  g.add(mesh(box(0.1, 0.1, 3.4), L.metalDark, 0, 5.1, 1.7));
  g.add(mesh(rbox(0.36, 1.05, 0.3, 0.04), L.paintYellow, 0, 4.4, 3.2));
  W.prop(g, V(x, 0, z), yaw);
  W.physics.add({ cx: x, cy: 2.6, cz: z, hx: 0.12, hy: 2.6, hz: 0.12 });
  const dir = V(Math.sin(yaw), 0, Math.cos(yaw));
  const head = V(x, 0, z).addScaledVector(dir, 3.2);
  const right = V(dir.z, 0, -dir.x);
  const mats = [L.signalRed.clone(), L.signalAmber.clone(), L.signalGreen.clone()];
  const base = mats.map((m) => m.color.clone());
  const lamps = mats.map((m, i) => {
    const q = new THREE.Mesh(new THREE.CircleGeometry(0.11, 14), m);
    q.position.copy(head).add(V(0, 4.72 - i * 0.32, 0)).addScaledVector(right, 0).addScaledVector(V(-dir.z, 0, dir.x), 0);
    q.position.addScaledVector(V(0, 0, 0), 0);
    q.position.add(V(-Math.cos(yaw) * 0, 0, 0));
    q.lookAt(q.position.clone().add(V(Math.cos(yaw + Math.PI / 2) * -1, 0, Math.sin(yaw + Math.PI / 2) * 1)));
    q.position.addScaledVector(V(-Math.cos(yaw) * -1, 0, Math.sin(yaw) * -1), 0.0);
    W.add(q);
    return q;
  });
  // face the lamps down the street (perpendicular to the arm)
  const face = V(-dir.z, 0, dir.x);
  lamps.forEach((q) => {
    q.position.addScaledVector(face, 0.16);
    q.lookAt(q.position.clone().add(face));
  });
  const glows = mats.map((_m, i) => {
    const gm = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMaterial(base[i], 1.2, `sig${i}`).clone());
    gm.position.copy(lamps[i].position).addScaledVector(face, 0.05);
    gm.scale.setScalar(0.9);
    gm.userData.billboard = true;
    W.add(gm);
    return gm;
  });
  const sock = W.lights.add(lamps[0].position.clone().addScaledVector(face, 0.6), '#ff2010', 3, 7);
  let t = phase;
  W.onUpdate((dt) => {
    t = (t + dt) % 22;
    const state = t < 10 ? 2 : t < 13 ? 1 : 0;
    mats.forEach((m, i) => m.color.copy(base[i]).multiplyScalar(i === state ? 1 : 0.025));
    glows.forEach((g2, i) => (g2.visible = i === state));
    sock.color.copy(state === 0 ? new THREE.Color('#ff2010') : state === 1 ? new THREE.Color('#ff8a10') : new THREE.Color('#20ff90'));
  });
}

// ============================================================================ vehicles
const carGeoCache = new Map<string, THREE.BufferGeometry>();
function carBody(kind: 'sedan' | 'hatch' | 'suv' | 'van'): THREE.BufferGeometry {
  const hit = carGeoCache.get(kind);
  if (hit) return hit;
  const L = kind === 'van' ? 5.2 : kind === 'suv' ? 4.8 : kind === 'hatch' ? 4.0 : 4.6;
  const H = kind === 'van' ? 2.1 : kind === 'suv' ? 1.75 : 1.45;
  const s = new THREE.Shape();
  const h0 = 0.32;
  const belt = kind === 'van' ? 1.1 : kind === 'suv' ? 1.05 : 0.88;
  s.moveTo(-L / 2, h0);
  s.lineTo(-L / 2, belt - 0.15);
  s.quadraticCurveTo(-L / 2, belt, -L / 2 + 0.25, belt);
  if (kind === 'van') {
    s.lineTo(-L / 2 + 0.35, H - 0.1);
    s.lineTo(L / 2 - 0.7, H);
    s.quadraticCurveTo(L / 2 - 0.25, H - 0.2, L / 2 - 0.15, belt + 0.1);
  } else {
    const roofBack = kind === 'hatch' ? -L / 2 + 0.35 : -L / 2 + 0.95;
    const roofFront = kind === 'hatch' ? L / 2 - 1.55 : L / 2 - 1.75;
    s.lineTo(roofBack - 0.3, belt + 0.05);
    s.quadraticCurveTo(roofBack, H, roofBack + 0.4, H);
    s.lineTo(roofFront, H);
    s.quadraticCurveTo(roofFront + 0.5, H - 0.05, roofFront + 0.95, belt + 0.06);
    s.lineTo(L / 2 - 0.25, belt - 0.02);
  }
  s.quadraticCurveTo(L / 2, belt - 0.05, L / 2, belt - 0.25);
  s.lineTo(L / 2, h0);
  // wheel arches
  s.lineTo(L / 2 - 0.55, h0);
  s.absarc(L / 2 - 0.95, h0, 0.4, 0, Math.PI, false);
  s.lineTo(-L / 2 + 1.35, h0);
  s.absarc(-L / 2 + 0.95, h0, 0.4, 0, Math.PI, false);
  s.lineTo(-L / 2, h0);
  const g = new THREE.ExtrudeGeometry(s, { depth: 1.76, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 3, curveSegments: 10 });
  g.translate(0, 0, -0.88);
  g.rotateY(-Math.PI / 2); // length along z, front = +z
  g.computeVertexNormals();
  carGeoCache.set(kind, g);
  return g;
}

const paintCache = new Map<string, THREE.MeshPhysicalMaterial>();
function paint(c: string): THREE.MeshPhysicalMaterial {
  let m = paintCache.get(c);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.38, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.5 });
    paintCache.set(c, m);
  }
  return m;
}

export const CAR_COLORS = ['#7a1414', '#1c2a44', '#d8d8d4', '#2a2a2c', '#5a6066', '#3a4a2a', '#a07a2a', '#14343a'];

/** An abandoned car: body, glass, wheels, lights (optionally still on). */
export function car(W: World, x: number, z: number, yaw: number, color: string, o: { kind?: 'sedan' | 'hatch' | 'suv' | 'van'; lights?: boolean; door?: boolean; layer?: 'echo' | 'present'; dynamic?: boolean; collide?: boolean } = {}): THREE.Group {
  const L = M();
  const kind = o.kind ?? 'sedan';
  const len = kind === 'van' ? 5.2 : kind === 'suv' ? 4.8 : kind === 'hatch' ? 4.0 : 4.6;
  const hgt = kind === 'van' ? 2.1 : kind === 'suv' ? 1.75 : 1.45;
  const g = new THREE.Group();
  g.add(new THREE.Mesh(carBody(kind), paint(color)));
  // glass greenhouse (inset box)
  const gl = mesh(rbox(1.62, hgt - 1.0, kind === 'van' ? len - 1.2 : len * 0.48, 0.12), L.glassDark, 0, (hgt + 0.95) / 2, kind === 'van' ? 0.1 : -0.1);
  g.add(gl);
  for (const sx of [-0.83, 0.83]) {
    for (const sz of [len / 2 - 0.95, -len / 2 + 0.95]) {
      const w = mesh(cyl(0.36, 0.36, 0.26, 16), L.rubber, sx, 0.36, sz, 0, 0, Math.PI / 2);
      g.add(w);
      g.add(mesh(cyl(0.2, 0.2, 0.27, 10), L.steel, sx, 0.36, sz, 0, 0, Math.PI / 2));
    }
  }
  g.add(mesh(box(1.7, 0.18, 0.12), L.plasticDark, 0, 0.45, len / 2 + 0.05));
  g.add(mesh(box(1.7, 0.18, 0.12), L.plasticDark, 0, 0.45, -len / 2 - 0.05));
  const headM = o.lights ? L.lightWarm : L.plasticWhite;
  const tailM = o.lights ? L.signalRed : L.paintRed;
  for (const sx of [-0.62, 0.62]) {
    g.add(mesh(rbox(0.36, 0.14, 0.06, 0.03), headM, sx, 0.78, len / 2 + 0.06));
    g.add(mesh(rbox(0.32, 0.12, 0.06, 0.03), tailM, sx, 0.82, -len / 2 - 0.06));
  }
  if (o.dynamic) {
    g.position.set(x, 0, z);
    g.rotation.y = yaw;
    g.traverse((c) => ((c as THREE.Mesh).castShadow = true));
    W.add(g, o.layer);
  } else {
    W.prop(g, V(x, 0, z), yaw, { echo: o.layer });
  }
  if (o.collide !== false) {
    W.physics.add({ cx: x, cy: 0.75, cz: z, hx: 0.95, hy: 0.75, hz: len / 2, yaw, layer: o.layer ?? 'always', surface: 'metal', tag: 'car' });
  }
  if (o.lights) {
    const f = V(Math.sin(yaw), 0, Math.cos(yaw));
    const hp = V(x, 0.8, z).addScaledVector(f, len / 2 + 0.3);
    W.light(hp, '#ffe2b0', { intensity: 10, distance: 14, glow: 0.8, pool: false, layer: o.layer });
    W.quad(glowMaterial('#ffe0b0', 0.35, 'hl'), { x: hp.x + f.x * 4, y: 0.02, z: hp.z + f.z * 4 }, 3, 7, yaw, { pitch: -Math.PI / 2, echo: o.layer });
  }
  return g;
}

// ============================================================================ street furniture
export function phoneBooth(W: World, x: number, z: number, yaw: number): THREE.Vector3 {
  const L = M();
  const g = new THREE.Group();
  g.add(mesh(box(1.0, 0.1, 1.0), L.metalDark, 0, 2.45, 0));
  for (const [px, pz] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) g.add(mesh(box(0.06, 2.4, 0.06), L.metalDark, px, 1.2, pz));
  g.add(mesh(box(0.5, 0.7, 0.18), L.metal, 0, 1.4, -0.38));
  g.add(mesh(box(0.12, 0.25, 0.08), L.plasticDark, 0.15, 1.5, -0.27));
  for (const side of [[0, 0.47, 0], [-0.47, 0, Math.PI / 2], [0.47, 0, Math.PI / 2]] as const) {
    g.add(mesh(box(0.9, 1.6, 0.02), L.glass, side[0], 1.3, side[1], 0, side[2], 0));
  }
  W.prop(g, V(x, 0, z), yaw);
  W.quad(signMaterial('PHONE', { bg: '#0b2a6a', fg: '#ffffff', w: 256, h: 64, intensity: 2 }), { x, y: 2.62, z: z + 0.51 }, 0.8, 0.2, yaw);
  W.physics.add({ cx: x, cy: 1.25, cz: z, hx: 0.5, hy: 1.25, hz: 0.5, yaw });
  W.light({ x, y: 2.35, z }, '#e8f4ff', { intensity: 4, distance: 5, glow: 0.4, pool: false });
  return V(x, 1.4, z);
}

export function bench(W: World, x: number, z: number, yaw: number): void {
  const L = M();
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) g.add(mesh(box(1.8, 0.05, 0.12), L.wood, 0, 0.45, -0.15 + i * 0.15));
  for (let i = 0; i < 2; i++) g.add(mesh(box(1.8, 0.1, 0.05), L.wood, 0, 0.65 + i * 0.15, -0.28, -0.2));
  for (const sx of [-0.8, 0.8]) g.add(mesh(box(0.06, 0.5, 0.5), L.metalDark, sx, 0.25, -0.05));
  W.prop(g, V(x, 0, z), yaw);
  W.physics.add({ cx: x, cy: 0.4, cz: z, hx: 0.9, hy: 0.4, hz: 0.3, yaw });
}

export function trashCan(W: World, x: number, z: number): void {
  const L = M();
  W.geo(cyl(0.3, 0.27, 0.9, 12), L.metalDark, { x, y: 0.45, z });
  W.geo(cyl(0.32, 0.32, 0.06, 12), L.metal, { x, y: 0.92, z });
  W.physics.add({ cx: x, cy: 0.45, cz: z, hx: 0.3, hy: 0.45, hz: 0.3 });
}

export function hydrant(W: World, x: number, z: number): void {
  const L = M();
  W.geo(cyl(0.13, 0.15, 0.6, 10), L.paintRed, { x, y: 0.3, z });
  W.geo(new THREE.SphereGeometry(0.14, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), L.paintRed, { x, y: 0.6, z });
  W.geo(cyl(0.05, 0.05, 0.42, 8), L.paintRed, { x, y: 0.42, z }, new THREE.Euler(0, 0, Math.PI / 2));
}

export function tree(W: World, x: number, z: number, s = 1): void {
  const L = M();
  W.geo(cyl(0.12 * s, 0.2 * s, 3.2 * s, 8), L.bark, { x, y: 1.6 * s, z });
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7;
    const g = new THREE.IcosahedronGeometry((1.4 + (i % 2) * 0.4) * s, 1);
    W.geo(g, L.leaves, { x: x + Math.cos(a) * 0.6 * s, y: (3.4 + (i % 3) * 0.5) * s, z: z + Math.sin(a) * 0.6 * s });
  }
  W.physics.add({ cx: x, cy: 1.5, cz: z, hx: 0.2, hy: 1.5, hz: 0.2 });
}

export function barrier(W: World, x: number, z: number, yaw: number): void {
  const L = M();
  const g = new THREE.Group();
  g.add(mesh(box(2.2, 0.3, 0.08), L.paintYellow, 0, 0.9, 0));
  g.add(mesh(box(2.2, 0.3, 0.08), L.paintRed, 0, 0.55, 0));
  for (const sx of [-0.9, 0.9]) g.add(mesh(box(0.08, 1.1, 0.5), L.metalDark, sx, 0.55, 0));
  W.prop(g, V(x, 0, z), yaw);
  W.physics.add({ cx: x, cy: 0.55, cz: z, hx: 1.1, hy: 0.55, hz: 0.15, yaw });
}

export function billboard(W: World, x: number, y: number, z: number, yaw: number, text: string, sub: string, color: string, flicker = 0.4): void {
  const L = M();
  W.boxC([x, y / 2, z - Math.cos(yaw) * 0.4], [0.4, y, 0.4], L.metalDark, yaw, { collide: false });
  const m = signMaterial(text, { bg: '#101418', fg: color, glow: color, w: 1024, h: 384, sub, intensity: 2.2, border: color });
  const q = W.quad(m.clone(), { x, y: y + 2.5, z }, 10, 3.75, yaw, { dynamic: true }) as THREE.Mesh;
  const base = (q.material as THREE.MeshBasicMaterial).color.clone();
  const sock = W.light({ x: x + Math.sin(yaw) * 3, y: y + 2, z: z + Math.cos(yaw) * 3 }, color, { intensity: 12, distance: 16, glow: 0, pool: false });
  W.onUpdate((_dt, t) => {
    const off = flicker > 0 && Math.sin(t * 1.3) > 0.85 && Math.sin(t * 37) > 0;
    (q.material as THREE.MeshBasicMaterial).color.copy(base).multiplyScalar(off ? 0.1 : 1);
    if (sock) sock.dim = off ? 0.1 : 1;
  });
}

export function neon(W: World, x: number, y: number, z: number, yaw: number, text: string, color: string, w = 3, flicker = 0): void {
  const m = signMaterial(text, { bg: '#000000', fg: color, glow: color, w: 512, h: 128, intensity: 3.5 });
  m.transparent = true;
  m.blending = THREE.AdditiveBlending;
  m.depthWrite = false;
  W.quad(m, { x, y, z }, w, w / 4, yaw);
  W.light({ x: x + Math.sin(yaw) * 1.2, y, z: z + Math.cos(yaw) * 1.2 }, color, { intensity: 8, distance: 10, glow: 0, pool: false, flicker });
}

// ============================================================================ interiors
/** Rectangular room shell. openings: list of wall gaps {wall,center,width,height}. */
export function room(W: World, x0: number, z0: number, x1: number, z1: number, h: number, wall: THREE.Material, floor: THREE.Material, ceil: THREE.Material | null, openings: { wall: 'n' | 's' | 'e' | 'w'; c: number; w: number; h?: number }[] = [], o: { floorSurface?: 'tile' | 'wood' | 'carpet' | 'concrete' | 'metal'; y?: number; t?: number; noFloor?: boolean } = {}): void {
  const y = o.y ?? 0;
  const t = o.t ?? 0.2;
  if (!o.noFloor) W.box([x0, y - 0.2, z0], [x1, y, z1], floor, { uv: 2, surface: o.floorSurface ?? 'tile', cast: false });
  if (ceil) W.box([x0, y + h, z0], [x1, y + h + 0.2, z1], ceil, { uv: 2, collide: true });
  const wallSeg = (side: 'n' | 's' | 'e' | 'w') => {
    const along = side === 'n' || side === 's';
    const a0 = along ? x0 : z0;
    const a1 = along ? x1 : z1;
    const fixed = side === 'n' ? z0 : side === 's' ? z1 : side === 'w' ? x0 : x1;
    const gaps = openings.filter((op) => op.wall === side).sort((a, b) => a.c - b.c);
    let cur = a0;
    const seg = (s0: number, s1: number, yb: number, yt: number) => {
      if (s1 - s0 < 0.01 || yt - yb < 0.01) return;
      if (along) W.box([s0, y + yb, fixed - t / 2], [s1, y + yt, fixed + t / 2], wall, { uv: 2, noVault: true });
      else W.box([fixed - t / 2, y + yb, s0], [fixed + t / 2, y + yt, s1], wall, { uv: 2, noVault: true });
    };
    for (const gp of gaps) {
      seg(cur, gp.c - gp.w / 2, 0, h);
      seg(gp.c - gp.w / 2, gp.c + gp.w / 2, gp.h ?? 2.3, h);
      cur = gp.c + gp.w / 2;
    }
    seg(cur, a1, 0, h);
  };
  (['n', 's', 'e', 'w'] as const).forEach(wallSeg);
}

/** Recessed fluorescent ceiling panel with pooled light. */
export function ceilingLight(W: World, x: number, y: number, z: number, o: { color?: string; flicker?: number; intensity?: number; distance?: number; layer?: 'echo' | 'present'; long?: boolean } = {}): void {
  const L = M();
  const len = o.long ? 2.4 : 1.2;
  W.box([x - 0.3, y - 0.04, z - len / 2], [x + 0.3, y, z + len / 2], L.lightFluor, { collide: false, cast: false });
  W.light({ x, y: y - 0.1, z }, o.color ?? '#e6fff6', { intensity: o.intensity ?? 10, distance: o.distance ?? 9, flicker: o.flicker ?? 0, glow: 0.6, pool: false, layer: o.layer });
}

export function shelf(W: World, x: number, z: number, yaw: number, len = 3): void {
  const L = M();
  const g = new THREE.Group();
  g.add(mesh(box(len, 1.7, 0.08), L.metalDark, 0, 0.85, 0));
  for (let i = 0; i < 4; i++) {
    g.add(mesh(box(len, 0.04, 0.9), L.metal, 0, 0.15 + i * 0.45, 0));
    for (const s of [-0.25, 0.25]) {
      const p = mesh(box(len - 0.1, 0.32, 0.3), L.products, 0, 0.33 + i * 0.45, s);
      g.add(p);
    }
  }
  W.prop(g, V(x, 0, z), yaw);
  W.physics.add({ cx: x, cy: 0.85, cz: z, hx: len / 2, hy: 0.85, hz: 0.48, yaw, noVault: true });
}

export function fridge(W: World, x: number, z: number, yaw: number, n = 3): void {
  const L = M();
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const cx = (i - (n - 1) / 2) * 0.95;
    g.add(mesh(box(0.92, 2.1, 0.85), L.metalDark, cx, 1.05, 0));
    g.add(mesh(box(0.8, 1.8, 0.02), L.lightCool, cx, 1.1, 0.25));
    for (let s = 0; s < 4; s++) g.add(mesh(box(0.78, 0.3, 0.3), L.products, cx, 0.45 + s * 0.42, 0.08));
    g.add(mesh(box(0.8, 1.8, 0.02), L.glass, cx, 1.1, 0.44));
  }
  W.prop(g, V(x, 0, z), yaw);
  W.physics.add({ cx: x, cy: 1.05, cz: z, hx: n * 0.47, hy: 1.05, hz: 0.45, yaw, noVault: true });
  W.light({ x: x + Math.sin(yaw) * 1.2, y: 1.6, z: z + Math.cos(yaw) * 1.2 }, '#bfe8ff', { intensity: 5, distance: 6, glow: 0, pool: false });
}

export function counter(W: World, x: number, z: number, yaw: number, len = 3): void {
  const L = M();
  const g = new THREE.Group();
  g.add(mesh(box(len, 1.0, 0.7), L.woodPaint, 0, 0.5, 0));
  g.add(mesh(box(len + 0.1, 0.05, 0.8), L.plasticDark, 0, 1.03, 0));
  g.add(mesh(box(0.45, 0.25, 0.35), L.plasticDark, len / 2 - 0.5, 1.18, 0));
  W.prop(g, V(x, 0, z), yaw);
  W.physics.add({ cx: x, cy: 0.5, cz: z, hx: len / 2, hy: 0.5, hz: 0.38, yaw });
}

export function table(W: World, x: number, z: number, yaw: number, w = 1.4, d = 0.8, mat?: THREE.Material): void {
  const L = M();
  const g = new THREE.Group();
  g.add(mesh(box(w, 0.05, d), mat ?? L.wood, 0, 0.75, 0));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(box(0.05, 0.75, 0.05), mat ?? L.wood, sx * (w / 2 - 0.06), 0.375, sz * (d / 2 - 0.06)));
  W.prop(g, V(x, 0, z), yaw);
  W.physics.add({ cx: x, cy: 0.4, cz: z, hx: w / 2, hy: 0.4, hz: d / 2, yaw });
}

export function chair(W: World, x: number, z: number, yaw: number, mat?: THREE.Material): void {
  const L = M();
  const g = new THREE.Group();
  g.add(mesh(box(0.45, 0.05, 0.45), mat ?? L.wood, 0, 0.45, 0));
  g.add(mesh(box(0.45, 0.5, 0.05), mat ?? L.wood, 0, 0.72, -0.2));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(mesh(box(0.04, 0.45, 0.04), mat ?? L.wood, sx * 0.19, 0.22, sz * 0.19));
  W.prop(g, V(x, 0, z), yaw);
}

export function sofa(W: World, x: number, z: number, yaw: number, col?: THREE.Material): void {
  const L = M();
  const m = col ?? L.fabric;
  const g = new THREE.Group();
  g.add(mesh(rbox(2.0, 0.45, 0.9, 0.08), m, 0, 0.25, 0));
  g.add(mesh(rbox(2.0, 0.6, 0.25, 0.08), m, 0, 0.7, -0.35));
  for (const sx of [-0.95, 0.95]) g.add(mesh(rbox(0.22, 0.6, 0.9, 0.08), m, sx, 0.45, 0));
  for (const sx of [-0.45, 0.45]) g.add(mesh(rbox(0.85, 0.18, 0.7, 0.07), m, sx, 0.55, 0.05));
  W.prop(g, V(x, 0, z), yaw);
  W.physics.add({ cx: x, cy: 0.45, cz: z, hx: 1.05, hy: 0.45, hz: 0.48, yaw });
}

export function bed(W: World, x: number, z: number, yaw: number, kid = false, sheet = '#6a8ab0'): void {
  const L = M();
  const w = kid ? 1.0 : 1.6;
  const g = new THREE.Group();
  g.add(mesh(box(w, 0.35, 2.0), L.wood, 0, 0.18, 0));
  g.add(mesh(rbox(w - 0.05, 0.22, 1.95, 0.06), L.mattress, 0, 0.45, 0));
  g.add(mesh(rbox(w - 0.02, 0.12, 1.3, 0.05), new THREE.MeshStandardMaterial({ color: sheet, roughness: 0.95 }), 0, 0.58, 0.3));
  g.add(mesh(rbox(0.55, 0.14, 0.35, 0.06), L.plasticWhite, kid ? 0 : -0.35, 0.62, -0.75));
  g.add(mesh(box(w, 0.9, 0.08), L.wood, 0, 0.6, -1.0));
  W.prop(g, V(x, 0, z), yaw);
  W.physics.add({ cx: x, cy: 0.35, cz: z, hx: w / 2, hy: 0.35, hz: 1.0, yaw });
}

export function desk(W: World, x: number, z: number, yaw: number, monitor = true, lit = false): void {
  const L = M();
  const g = new THREE.Group();
  g.add(mesh(box(1.6, 0.05, 0.8), L.plasticWhite, 0, 0.74, 0));
  for (const sx of [-0.75, 0.75]) g.add(mesh(box(0.05, 0.74, 0.75), L.metalDark, sx, 0.37, 0));
  if (monitor) {
    g.add(mesh(box(0.6, 0.38, 0.03), L.plasticDark, 0, 1.05, -0.2));
    g.add(mesh(box(0.56, 0.32, 0.01), lit ? L.lightCool : L.black, 0, 1.05, -0.18));
    g.add(mesh(box(0.08, 0.15, 0.08), L.plasticDark, 0, 0.83, -0.22));
    g.add(mesh(box(0.45, 0.02, 0.15), L.plasticDark, 0, 0.77, 0.05));
  }
  W.prop(g, V(x, 0, z), yaw);
  W.physics.add({ cx: x, cy: 0.4, cz: z, hx: 0.8, hy: 0.4, hz: 0.4, yaw });
}

export function crateProp(W: World, x: number, y: number, z: number, s = 1, yaw = 0): void {
  const L = M();
  W.boxC([x, y + 0.5 * s, z], [s, s, s], L.wood, yaw, { uv: 1, surface: 'wood' });
}

export function picture(W: World, tex: THREE.Texture, x: number, y: number, z: number, yaw: number, w = 0.5, h = 0.4): void {
  const L = M();
  W.boxC([x - Math.sin(yaw) * 0.01, y, z - Math.cos(yaw) * 0.01], [w + 0.06, h + 0.06, 0.03], L.wood, yaw, { collide: false });
  W.quad(texturedMaterial(tex, 0.5), { x: x + Math.sin(yaw) * 0.01, y, z: z + Math.cos(yaw) * 0.01 }, w, h, yaw);
}

export function poster(W: World, tex: THREE.Texture, x: number, y: number, z: number, yaw: number, w = 0.6, h = 0.8): void {
  W.quad(texturedMaterial(tex, 0.8), { x: x + Math.sin(yaw) * 0.015, y, z: z + Math.cos(yaw) * 0.015 }, w, h, yaw);
}

/** Simple ladder (climbable collider). */
export function ladder(W: World, x: number, z: number, yaw: number, h: number, y0 = 0): void {
  const L = M();
  const g = new THREE.Group();
  for (const sx of [-0.25, 0.25]) g.add(mesh(box(0.05, h, 0.05), L.metal, sx, h / 2, 0));
  for (let i = 0.3; i < h; i += 0.3) g.add(mesh(cyl(0.02, 0.02, 0.5, 6), L.metal, 0, i, 0, 0, 0, Math.PI / 2));
  W.prop(g, V(x, y0, z), yaw);
  W.physics.add({ cx: x, cy: y0 + h / 2, cz: z, hx: 0.3, hy: h / 2, hz: 0.12, yaw, ladder: true });
}

export { mesh, box, rbox, cyl, V };
