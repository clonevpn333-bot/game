import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { EnvSettings, World } from '../world/World';
import { SKY } from '../render/Sky';
import { M, signMaterial, glowMaterial } from '../render/Materials';
import * as K from '../world/Kit';

export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const ENV = {
  /** Bellwether at night in the rain: colourful, alive. */
  rainNight: {
    sky: SKY.stormLight, fog: '#1a2230', fogDensity: 0.0105, rain: 0.85, envKind: 'city', exposure: 1.05,
    hemi: ['#8fa6c8', '#2a2018', 0.55], moon: { color: '#a8bede', intensity: 0.55, dir: [-0.35, 1, 0.45] },
    reverb: [2.2, 0.25], bloom: 0.7, grade: { sat: 1.12, vignette: 0.75 },
  } as EnvSettings,
  interior: {
    sky: SKY.stormLight, fog: '#1a1d22', fogDensity: 0.01, rain: 0.8, envKind: 'interior', exposure: 1.1,
    hemi: ['#d8e0ea', '#3a3028', 0.7], reverb: [0.8, 0.2], bloom: 0.55, grade: { sat: 1.05, vignette: 0.7 },
  } as EnvSettings,
};

// ---------------------------------------------------------------- helicopter
export function helicopter(): { group: THREE.Group; rotor: THREE.Object3D; tail: THREE.Object3D; spot: THREE.SpotLight } {
  const g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: '#2b3340', roughness: 0.45, metalness: 0.4 });
  const stripe = new THREE.MeshStandardMaterial({ color: '#d8a21c', roughness: 0.5 });
  const glass = new THREE.MeshStandardMaterial({ color: '#0d141c', roughness: 0.05, metalness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: '#15181d', roughness: 0.6 });
  const rb = (w: number, h: number, d: number, r = 0.2) => new RoundedBoxGeometry(w, h, d, 3, r);
  const m = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    o.castShadow = true;
    g.add(o);
    return o;
  };
  m(rb(2.6, 2.3, 5.4, 0.6), body, 0, 1.6, 0);
  m(rb(2.4, 1.6, 1.8, 0.6), glass, 0, 1.8, 2.7);
  m(rb(2.64, 0.25, 5.2, 0.1), stripe, 0, 1.1, 0);
  m(rb(0.9, 0.9, 6, 0.3), body, 0, 2.2, -5.2);
  m(rb(0.2, 1.6, 1.0, 0.08), body, 0, 3.0, -8.0);
  for (const sx of [-1, 1]) m(rb(0.14, 0.14, 4.4, 0.06), dark, sx * 1.1, 0.1, 0.2);
  for (const sx of [-1, 1]) for (const z of [-1.2, 1.4]) m(rb(0.1, 0.5, 0.1, 0.03), dark, sx * 1.1, 0.35, z);
  // open side door (dark interior)
  m(rb(0.06, 1.5, 2.2, 0.03), dark, 1.31, 1.55, 0.2);
  const rotor = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 6.5), dark);
    b.position.z = 3.2;
    const arm = new THREE.Group();
    arm.rotation.y = (i * Math.PI) / 2;
    arm.add(b);
    rotor.add(arm);
  }
  rotor.position.set(0, 3.0, 0);
  g.add(rotor);
  const tail = new THREE.Group();
  for (let i = 0; i < 2; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.12), dark);
    b.rotation.x = (i * Math.PI) / 2;
    tail.add(b);
  }
  tail.position.set(0.18, 3.0, -8.0);
  g.add(tail);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2a1a').multiplyScalar(4) }));
  beacon.position.set(0, 2.9, -2);
  g.add(beacon);
  const spot = new THREE.SpotLight('#eaf2ff', 0, 140, 0.32, 0.5, 1.2);
  spot.position.set(0, 0.4, 2.4);
  spot.target.position.set(0, -20, 14);
  g.add(spot, spot.target);
  return { group: g, rotor, tail, spot };
}

// ---------------------------------------------------------------- living-city props
/** An animated LED ad screen (canvas texture cycling through slides). */
export function adScreen(W: World, pos: THREE.Vector3, yaw: number, w: number, h: number, slides: { bg: string; fg: string; title: string; sub?: string; accent?: string }[], period = 5): { tex: THREE.CanvasTexture; set: (s: typeof slides) => void } {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = Math.round((512 * h) / w);
  const x = c.getContext('2d')!;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  let list = slides;
  const draw = (i: number, t: number) => {
    const s = list[i % list.length];
    x.fillStyle = s.bg;
    x.fillRect(0, 0, c.width, c.height);
    const grd = x.createLinearGradient(0, 0, c.width, c.height);
    grd.addColorStop(0, 'rgba(255,255,255,0.10)');
    grd.addColorStop(1, 'rgba(0,0,0,0.25)');
    x.fillStyle = grd;
    x.fillRect(0, 0, c.width, c.height);
    if (s.accent) {
      x.fillStyle = s.accent;
      x.beginPath();
      x.arc(c.width * 0.82, c.height * 0.5, c.height * (0.32 + Math.sin(t * 2) * 0.03), 0, Math.PI * 2);
      x.fill();
    }
    x.fillStyle = s.fg;
    x.font = `700 ${Math.round(c.height * 0.26)}px "Barlow Condensed", Arial Narrow, sans-serif`;
    x.textBaseline = 'middle';
    x.fillText(s.title, c.width * 0.06, c.height * (s.sub ? 0.4 : 0.52));
    if (s.sub) {
      x.globalAlpha = 0.85;
      x.font = `500 ${Math.round(c.height * 0.12)}px Barlow, Arial, sans-serif`;
      x.fillText(s.sub, c.width * 0.06, c.height * 0.72);
      x.globalAlpha = 1;
    }
    // LED scanlines
    x.fillStyle = 'rgba(0,0,0,0.18)';
    for (let yy = 0; yy < c.height; yy += 4) x.fillRect(0, yy, c.width, 1);
    tex.needsUpdate = true;
  };
  draw(0, 0);
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) });
  const mesh = W.quad(mat, pos, w, h, yaw, { dynamic: true }) as THREE.Mesh;
  // frame
  const L = M();
  const n = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
  W.boxC([pos.x - n.x * 0.12, pos.y, pos.z - n.z * 0.12], Math.abs(n.x) > 0.5 ? [0.2, h + 0.3, w + 0.3] : [w + 0.3, h + 0.3, 0.2], L.metalDark, 0, { collide: false });
  W.light({ x: pos.x + n.x * 2.5, y: pos.y, z: pos.z + n.z * 2.5 }, list[0].accent ?? list[0].bg, { intensity: 5, distance: Math.max(8, w * 1.4), glow: 0, pool: false });
  let i = 0;
  let acc = 0;
  let t = 0;
  W.onUpdate((dt) => {
    t += dt;
    acc += dt;
    if (acc > period) {
      acc = 0;
      i++;
      draw(i, t);
    } else if (list[i % list.length].accent && Math.floor(t * 8) !== Math.floor((t - dt) * 8)) draw(i, t);
  });
  void mesh;
  return { tex, set: (s) => {
    list = s;
    i = 0;
    draw(0, t);
  } };
}

/**
 * Storefront building: solid collider block, facade, storefront glass, awning, neon sign.
 * side = which face is the shopfront ('w' faces -x, 'e' faces +x).
 */
export function shopBlock(W: World, x0: number, z0: number, x1: number, z1: number, h: number, style: K.Style, seed: number, side: 'n' | 's' | 'e' | 'w', sign: string, color: string, awning?: string): void {
  K.building(W, x0, z0, x1, z1, h, style, seed, { store: { side, sign, color, lit: true }, emissive: 1.8 });
  if (awning) {
    const L = M();
    void L;
    const mat = new THREE.MeshStandardMaterial({ color: awning, roughness: 0.7 });
    const len = side === 'e' || side === 'w' ? z1 - z0 - 1.2 : x1 - x0 - 1.2;
    const cx = side === 'e' ? x1 + 0.9 : side === 'w' ? x0 - 0.9 : (x0 + x1) / 2;
    const cz = side === 'n' ? z0 - 0.9 : side === 's' ? z1 + 0.9 : (z0 + z1) / 2;
    // striped canvas awning, tilted
    const stripes = Math.max(3, Math.round(len / 0.9));
    for (let i = 0; i < stripes; i++) {
      const t = -len / 2 + (i + 0.5) * (len / stripes);
      const m = i % 2 ? mat : new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 0.7 });
      const g = new THREE.BoxGeometry(side === 'e' || side === 'w' ? 1.8 : len / stripes, 0.06, side === 'e' || side === 'w' ? len / stripes : 1.8);
      const rot = side === 'e' ? new THREE.Euler(0, 0, -0.32) : side === 'w' ? new THREE.Euler(0, 0, 0.32) : side === 's' ? new THREE.Euler(0.32, 0, 0) : new THREE.Euler(-0.32, 0, 0);
      W.geo(g, m, side === 'e' || side === 'w' ? V(cx, 3.15, cz + t) : V(cx + t, 3.15, cz), rot, 1, { cast: true });
    }
  }
}

export function busStop(W: World, x: number, z: number, yaw: number): void {
  const L = M();
  const g = new THREE.Group();
  const frame = L.metalDark;
  const glass = new THREE.MeshStandardMaterial({ color: '#9fc4d8', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.25 });
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, px: number, py: number, pz: number) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(px, py, pz);
    g.add(o);
  };
  add(new THREE.BoxGeometry(4, 0.12, 1.6), frame, 0, 2.5, 0);
  for (const sx of [-1.9, 1.9]) add(new THREE.BoxGeometry(0.1, 2.5, 0.1), frame, sx, 1.25, -0.7);
  add(new THREE.BoxGeometry(3.8, 2.1, 0.04), glass, 0, 1.35, -0.72);
  add(new THREE.BoxGeometry(3, 0.08, 0.45), L.wood, 0, 0.48, -0.45);
  W.prop(g, V(x, 0, z), yaw);
  W.physics.add({ cx: x - Math.sin(yaw) * 0.7, cy: 1.2, cz: z - Math.cos(yaw) * 0.7, hx: 2, hy: 1.2, hz: 0.1, yaw, noVault: true });
  // backlit ad panel
  W.quad(signMaterial('ORANGE LINE', { bg: '#e8742a', fg: '#fff', sub: 'EVERY 4 MINUTES · ALWAYS ON TIME', w: 256, h: 384, intensity: 1.6 }), { x: x + Math.cos(yaw) * 2.05, y: 1.4, z: z - Math.sin(yaw) * 2.05 }, 1.0, 1.6, yaw + Math.PI / 2);
}

export function cafeTable(W: World, x: number, z: number, umbrella: string): void {
  const L = M();
  W.boxC([x, 0.74, z], [0.9, 0.05, 0.9], L.wood, 0, { collide: false });
  W.boxC([x, 0.37, z], [0.08, 0.74, 0.08], L.metalDark, 0, { collide: false });
  W.physics.add({ cx: x, cy: 0.4, cz: z, hx: 0.45, hy: 0.4, hz: 0.45 });
  W.boxC([x, 1.4, z], [0.05, 2.2, 0.05], L.metalDark, 0, { collide: false });
  const cone = new THREE.ConeGeometry(1.4, 0.45, 8, 1, true);
  W.geo(cone, new THREE.MeshStandardMaterial({ color: umbrella, roughness: 0.6, side: THREE.DoubleSide }), V(x, 2.55, z), 0, 1, { cast: true });
  for (const [dx, dz] of [[0.75, 0], [-0.75, 0]]) {
    W.boxC([x + dx, 0.45, z + dz], [0.42, 0.05, 0.42], L.metalDark, 0, { collide: false });
    W.boxC([x + dx * 1.25, 0.75, z + dz], [0.05, 0.6, 0.42], L.metalDark, 0, { collide: false });
  }
}

/** Scaffolding frame against a facade (x = facade line, extends towards -dir). */
export function scaffold(W: World, x: number, z0: number, z1: number, dir: number, h = 6): void {
  const pole = new THREE.MeshStandardMaterial({ color: '#c8a23a', roughness: 0.5, metalness: 0.5 });
  const plank = new THREE.MeshStandardMaterial({ color: '#6b5236', roughness: 0.9 });
  const out = x + dir * 1.6;
  for (let z = z0; z <= z1 + 0.01; z += 2) {
    for (const px of [x + dir * 0.2, out]) {
      W.boxC([px, h / 2, z], [0.08, h, 0.08], pole, 0, { collide: false });
      W.physics.add({ cx: px, cy: h / 2, cz: z, hx: 0.06, hy: h / 2, hz: 0.06 });
    }
  }
  for (let y = 2.8; y < h; y += 2.8) {
    W.boxC([(x + out) / 2 + dir * 0.1, y, (z0 + z1) / 2], [1.6, 0.06, z1 - z0], plank, 0, { collide: false });
    W.boxC([out, y + 1, (z0 + z1) / 2], [0.05, 0.05, z1 - z0], pole, 0, { collide: false });
  }
  // safety netting
  W.quad(new THREE.MeshStandardMaterial({ color: '#2e7d5a', transparent: true, opacity: 0.35, side: THREE.DoubleSide, roughness: 0.9 }), { x: out + dir * 0.02, y: h * 0.62, z: (z0 + z1) / 2 }, z1 - z0, h * 0.7, Math.PI / 2);
}

/** Pedestrian crossing signal (walk / don't walk), slaved to a traffic Signal. */
export function walkSignal(W: World, x: number, z: number, yaw: number, isWalk: () => boolean): void {
  const L = M();
  W.boxC([x, 1.6, z], [0.1, 3.2, 0.1], L.metalDark, 0);
  const n = V(Math.sin(yaw), 0, Math.cos(yaw));
  const p = V(x + n.x * 0.12, 2.9, z + n.z * 0.12);
  const walk = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8f4ff').multiplyScalar(2) });
  const stop = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff6a1a').multiplyScalar(2) });
  const m = W.quad(stop, p, 0.34, 0.34, yaw, { dynamic: true }) as THREE.Mesh;
  W.onUpdate(() => {
    m.material = isWalk() ? walk : stop;
  });
}

export function glowSign(W: World, text: string, pos: THREE.Vector3, yaw: number, w: number, h: number, bg: string, fg: string, sub?: string): void {
  W.quad(signMaterial(text, { bg, fg, sub, w: 512, h: Math.round((512 * h) / w), intensity: 2.2 }), pos, w, h, yaw);
}

export { glowMaterial };

/** Traffic signal head on a mast arm, slaved to a Signal (green / amber / red). */
export function signalHead(W: World, x: number, z: number, yaw: number, sig: { green: boolean; phase: number; period: number; from: number; to: number }, t0 = () => 0): void {
  const L = M();
  const dir = V(Math.sin(yaw), 0, Math.cos(yaw));
  W.boxC([x, 2.7, z], [0.18, 5.4, 0.18], L.metalDark, 0);
  const arm = 3.4;
  W.boxC([x + dir.x * arm / 2, 5.25, z + dir.z * arm / 2], Math.abs(dir.x) > 0.5 ? [arm, 0.12, 0.12] : [0.12, 0.12, arm], L.metalDark, 0, { collide: false });
  const hp = V(x + dir.x * arm, 4.55, z + dir.z * arm);
  W.boxC([hp.x, hp.y, hp.z], [0.38, 1.1, 0.38], L.paintYellow, 0, { collide: false });
  const face = V(-dir.z, 0, dir.x); // lamps face oncoming traffic
  const fy = Math.atan2(face.x, face.z);
  const cols = ['#ff2a1a', '#ffb020', '#2aff7a'];
  const on = cols.map((c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(3), toneMapped: false }));
  const off = cols.map((c) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(0.12) }));
  const lamps = cols.map((_c, i) => W.quad(off[i], { x: hp.x + face.x * 0.2, y: hp.y + 0.32 - i * 0.32, z: hp.z + face.z * 0.2 }, 0.24, 0.24, fy, { dynamic: true }) as THREE.Mesh);
  W.onUpdate(() => {
    const p = ((((t0() + sig.phase) % sig.period) + sig.period) % sig.period) / sig.period;
    const amber = sig.green && p > sig.to - 0.06;
    const state = sig.green ? (amber ? 1 : 2) : 0;
    lamps.forEach((m, i) => (m.material = i === state ? on[i] : off[i]));
  });
}
