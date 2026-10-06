import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Mats } from '../world/Materials';
import { Tex } from '../world/Textures';
import { damp } from '../utils/math';

export const JOINTS = [
  'hips',
  'spine',
  'chest',
  'neck',
  'head',
  'shoulderL',
  'elbowL',
  'handL',
  'shoulderR',
  'elbowR',
  'handR',
  'hipL',
  'kneeL',
  'footL',
  'hipR',
  'kneeR',
  'footR',
] as const;
export type JointName = (typeof JOINTS)[number];
export type Pose = Partial<Record<JointName, [number, number, number]>> & { rootY?: number; rootPitch?: number };

export type Rig = {
  root: THREE.Group; // placed at feet, faces +Z
  body: THREE.Group; // receives rootY / rootPitch
  j: Record<JointName, THREE.Group>;
  flashMats: THREE.MeshStandardMaterial[];
  height: number;
};

// ---------------------------------------------------------------- shape helpers (smooth, stylized)

/** Rounded tapered limb segment hanging down from its joint. */
export function limb(rTop: number, rBottom: number, len: number, sides = 9, bulge = 1.08): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 6;
  pts.push(new THREE.Vector2(0.0001, 0));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const r = (rTop + (rBottom - rTop) * t) * (1 + Math.sin(t * Math.PI) * (bulge - 1));
    pts.push(new THREE.Vector2(r, -t * len));
  }
  pts.push(new THREE.Vector2(0.0001, -len - rBottom * 0.3));
  const g = new THREE.LatheGeometry(pts, sides);
  g.computeVertexNormals();
  return g;
}

export function latheG(profile: Array<[number, number]>, sides = 12): THREE.BufferGeometry {
  return new THREE.LatheGeometry(
    profile.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y)),
    sides,
  );
}

/** Dome cap (pauldron, poleyn, couter): a partial sphere. */
export function dome(r: number, sx = 1, sy = 1, sz = 1, theta = Math.PI * 0.55): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, theta);
  g.scale(sx, sy, sz);
  return g;
}

export function mesh(g: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0): THREE.Mesh {
  const me = new THREE.Mesh(g, m);
  me.position.set(x, y, z);
  me.rotation.set(rx, ry, rz);
  me.castShadow = true;
  return me;
}

// ---------------------------------------------------------------- skeleton

type Proportions = { scale: number; hipY: number; thigh: number; shin: number; spine: number; chest: number; shoulderW: number };

export function skeleton(p: Proportions): Rig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const j = {} as Record<JointName, THREE.Group>;
  const mk = (name: JointName, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, y, z);
    parent.add(g);
    j[name] = g;
    return g;
  };
  const hips = mk('hips', body, 0, p.hipY, 0);
  const spine = mk('spine', hips, 0, 0.1, 0);
  const chest = mk('chest', spine, 0, p.spine, 0);
  const neck = mk('neck', chest, 0, p.chest, 0);
  mk('head', neck, 0, 0.1, 0);
  for (const [side, sx] of [['L', 1], ['R', -1]] as const) {
    const sh = mk(`shoulder${side}`, chest, sx * p.shoulderW, p.chest - 0.06, 0);
    const el = mk(`elbow${side}`, sh, 0, -0.3, 0);
    mk(`hand${side}`, el, 0, -0.28, 0);
    const hp = mk(`hip${side}`, hips, sx * 0.12, -0.04, 0);
    const kn = mk(`knee${side}`, hp, 0, -p.thigh, 0);
    mk(`foot${side}`, kn, 0, -p.shin, 0);
  }
  root.scale.setScalar(p.scale);
  return { root, body, j, flashMats: [], height: (p.hipY + p.spine + p.chest + 0.4) * p.scale };
}

const HUMAN: Proportions = { scale: 1, hipY: 0.98, thigh: 0.46, shin: 0.44, spine: 0.27, chest: 0.36, shoulderW: 0.26 };

// ---------------------------------------------------------------- characters


export type FolkStyle = {
  robe: THREE.Material;
  skin: string;
  mood: 'calm' | 'fear' | 'grim' | 'old';
  hood?: boolean;
  hair?: boolean;
  lantern?: boolean;
  guard?: boolean;
  scale?: number;
};

/** Townsfolk / guards / priests: long robes, simple expressive faces. */
export function buildFolk(style: FolkStyle): Rig & { lantern?: THREE.Object3D } {
  const m = Mats();
  const rig = skeleton({ ...HUMAN, scale: style.scale ?? 0.96, shoulderW: 0.22 });
  const { j } = rig;
  const robeProfile: Array<[number, number]> = [[0.2, 0.14], [0.22, 0.0], [0.27, -0.4], [0.33, -0.8], [0.36, -0.94], [0, -0.94]];
  j.hips.add(mesh(latheG(robeProfile, 12), style.robe, 0, 0, 0));
  j.hips.add(mesh(new THREE.TorusGeometry(0.2, 0.025, 5, 14), m.leatherDark, 0, 0.04, 0, Math.PI / 2));
  j.spine.add(mesh(limb(0.2, 0.19, 0.3, 10, 1.05), style.robe, 0, 0.3, 0));
  j.chest.add(mesh(latheG([[0.19, -0.04], [0.23, 0.1], [0.22, 0.25], [0.12, 0.36], [0, 0.37]], 12), style.robe, 0, 0, 0));
  if (style.guard) {
    j.chest.add(mesh(latheG([[0.2, -0.02], [0.245, 0.1], [0.24, 0.24], [0.13, 0.35], [0, 0.36]], 12), m.plateDark, 0, 0, 0.01));
  }
  const headG = new THREE.SphereGeometry(0.13, 14, 10);
  headG.scale(0.95, 1.12, 1);
  const faceMat = new THREE.MeshStandardMaterial({ map: Tex.face(style.skin, style.mood), roughness: 0.8 });
  j.head.add(mesh(headG, faceMat, 0, 0.12, 0, 0, -Math.PI / 2));
  j.head.add(mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshStandardMaterial({ color: style.skin, roughness: 0.8 }), 0, 0.1, 0.13));
  if (style.hood) {
    j.head.add(mesh(latheG([[0.0, 0.33], [0.1, 0.3], [0.16, 0.2], [0.17, 0.05], [0.16, -0.06], [0.2, -0.1], [0, -0.1]], 12), style.robe, 0, 0, -0.02));
  } else if (style.hair) {
    j.head.add(mesh(dome(0.14, 1, 1, 1.05, Math.PI * 0.5), m.hair, 0, 0.14, -0.01));
  }
  if (style.guard) {
    j.head.add(mesh(latheG([[0, 0.31], [0.12, 0.28], [0.17, 0.2], [0.24, 0.14], [0.23, 0.12], [0.15, 0.13], [0, 0.13]], 12), m.plateDark, 0, 0.02, 0));
  }
  for (const [side, sx] of [['L', 1], ['R', -1]] as const) {
    j[`shoulder${side}`].add(mesh(limb(0.075, 0.08, 0.3), style.robe, 0, 0, 0));
    j[`elbow${side}`].add(mesh(limb(0.08, 0.1, 0.24, 9, 1.0), style.robe, 0, 0, 0));
    j[`hand${side}`].add(mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshStandardMaterial({ color: style.skin, roughness: 0.8 }), 0, -0.03, 0));
    void sx;
  }
  for (const side of ['L', 'R'] as const) {
    j[`foot${side}`].add(mesh(new THREE.SphereGeometry(0.07, 8, 6).scale(1, 0.7, 1.6), m.leatherDark, 0, -0.06, 0.04));
  }
  let lantern: THREE.Object3D | undefined;
  if (style.lantern) {
    const l = new THREE.Group();
    l.add(mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.16, 6), m.lanternGlow, 0, -0.18, 0));
    l.add(mesh(new THREE.ConeGeometry(0.08, 0.08, 6), m.ironDark, 0, -0.07, 0));
    l.add(mesh(new THREE.TorusGeometry(0.04, 0.008, 4, 8), m.ironDark, 0, -0.02, 0));
    j.handL.add(l);
    lantern = l;
  }
  if (style.guard) {
    const spear = new THREE.Group();
    spear.add(mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 6), m.wood, 0, 0.5, 0));
    spear.add(mesh(new THREE.ConeGeometry(0.05, 0.3, 4), m.steel, 0, 1.85, 0));
    spear.position.set(0, -0.05, 0.02);
    j.handR.add(spear);
  }
  return { ...rig, lantern };
}

/** Hushed Penitent: hunched, black-robed faithful whose head is a stone bell. Swings a censer. */
export function buildPenitent(): Rig & { censer: THREE.Object3D; maskGlow: THREE.MeshStandardMaterial } {
  const m = Mats();
  const rig = skeleton({ ...HUMAN, scale: 1.12, shoulderW: 0.24 });
  const { j } = rig;
  j.hips.add(mesh(latheG([[0.2, 0.14], [0.24, 0], [0.3, -0.45], [0.4, -0.86], [0.44, -0.95], [0, -0.95]], 10), m.robeBlack, 0, 0, 0));
  j.hips.add(mesh(new THREE.TorusGeometry(0.22, 0.03, 5, 12), m.leather, 0, 0.02, 0, Math.PI / 2));
  j.spine.add(mesh(limb(0.21, 0.2, 0.3, 10), m.robeBlack, 0, 0.3, 0));
  j.chest.add(mesh(latheG([[0.2, -0.04], [0.25, 0.1], [0.25, 0.26], [0.13, 0.36], [0, 0.37]], 10), m.robeBlack, 0, 0, 0));
  // Tattered scapular strips.
  for (let i = 0; i < 5; i += 1) {
    const g = new THREE.PlaneGeometry(0.08, 0.5 + (i % 2) * 0.2);
    g.translate(0, -0.3, 0);
    j.chest.add(mesh(g, m.robeGrey, -0.16 + i * 0.08, 0.3, 0.22, 0.1));
  }
  // Stone bell mask.
  const maskGlow = new THREE.MeshStandardMaterial({ color: '#100604', emissive: '#ff8a3a', emissiveIntensity: 1.2 });
  j.head.add(mesh(latheG([[0, 0.42], [0.08, 0.41], [0.15, 0.34], [0.18, 0.15], [0.21, 0.0], [0.25, -0.08], [0.22, -0.08], [0.0, -0.06]], 12), m.stone, 0, 0, 0));
  j.head.add(mesh(new THREE.BoxGeometry(0.2, 0.025, 0.05), maskGlow, 0, 0.16, 0.18));
  j.head.add(mesh(new THREE.TorusGeometry(0.05, 0.015, 4, 8), m.ironDark, 0, 0.45, 0));
  for (const side of ['L', 'R'] as const) {
    j[`shoulder${side}`].add(mesh(limb(0.08, 0.085, 0.3), m.robeBlack, 0, 0, 0));
    j[`elbow${side}`].add(mesh(limb(0.085, 0.11, 0.25, 9, 1.0), m.robeBlack, 0, 0, 0));
    j[`hand${side}`].add(mesh(new THREE.SphereGeometry(0.05, 8, 6), m.bone, 0, -0.03, 0));
    j[`foot${side}`].add(mesh(new THREE.SphereGeometry(0.07, 8, 6).scale(1, 0.7, 1.5), m.leatherDark, 0, -0.06, 0.04));
  }
  // Censer on a chain: a swinging iron ball with embers.
  const censer = new THREE.Group();
  const chain = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.7, 4), m.ironDark, 0, -0.35, 0);
  const ball = new THREE.Group();
  ball.position.y = -0.75;
  ball.add(mesh(new THREE.SphereGeometry(0.13, 10, 8), m.ironDark));
  const embers = mesh(new THREE.SphereGeometry(0.1, 8, 6), m.marrowGlow);
  embers.scale.set(1.05, 0.5, 1.05);
  ball.add(embers);
  censer.add(chain, ball);
  censer.position.y = -0.06;
  j.handR.add(censer);
  rig.flashMats.push(maskGlow);
  return { ...rig, censer, maskGlow };
}

// ---------------------------------------------------------------- animator

const tmpE = new THREE.Euler();
const tmpQ = new THREE.Quaternion();

export class Animator {
  rate = 14;
  constructor(private readonly rig: Rig) {}

  /** Damp all joints toward the target pose (missing joints relax to rest). */
  apply(pose: Pose, dt: number, rate = this.rate): void {
    const k = 1 - Math.exp(-rate * dt);
    for (const name of JOINTS) {
      const r = pose[name];
      tmpE.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0);
      tmpQ.setFromEuler(tmpE);
      this.rig.j[name].quaternion.slerp(tmpQ, k);
    }
    this.rig.body.position.y = damp(this.rig.body.position.y, pose.rootY ?? 0, rate, dt);
    this.rig.body.rotation.x = damp(this.rig.body.rotation.x, pose.rootPitch ?? 0, rate, dt);
  }

  snap(pose: Pose): void {
    for (const name of JOINTS) {
      const r = pose[name];
      this.rig.j[name].rotation.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0);
    }
    this.rig.body.position.y = pose.rootY ?? 0;
    this.rig.body.rotation.x = pose.rootPitch ?? 0;
  }
}

/** Blend two poses. */
export function mix(a: Pose, b: Pose, t: number): Pose {
  const out: Pose = {};
  for (const name of JOINTS) {
    const ra = a[name] ?? [0, 0, 0];
    const rb = b[name] ?? [0, 0, 0];
    out[name] = [ra[0] + (rb[0] - ra[0]) * t, ra[1] + (rb[1] - ra[1]) * t, ra[2] + (rb[2] - ra[2]) * t];
  }
  out.rootY = (a.rootY ?? 0) + ((b.rootY ?? 0) - (a.rootY ?? 0)) * t;
  out.rootPitch = (a.rootPitch ?? 0) + ((b.rootPitch ?? 0) - (a.rootPitch ?? 0)) * t;
  return out;
}

/** Sample a keyframed pose track at normalised time k in [0, 1]. */
export function track(keys: Array<[number, Pose]>, k: number): Pose {
  if (k <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i += 1) {
    const [t0, p0] = keys[i];
    const [t1, p1] = keys[i + 1];
    if (k <= t1) {
      const t = (k - t0) / (t1 - t0);
      return mix(p0, p1, t * t * (3 - 2 * t));
    }
  }
  return keys[keys.length - 1][1];
}

// ---------------------------------------------------------------- shared locomotion

const bump = (phase: number, center: number, sharp = 3): number => Math.pow(Math.max(0, Math.cos(phase - center)), sharp);
const smooth01 = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * Gait cycle (phase 0..2π = one stride = two steps). Left leg is forward at φ=π/2.
 * Walk: double-support dips, heel strike, toe-off, pelvis yaw/drop, spine counter-rotation.
 * Run (speed01 > ~0.7): flight phase, high knees, forward lean, pumping bent arms.
 */
export function locomotion(phase: number, speed01: number, opts: { armSwing?: number; swordHeld?: boolean; hunch?: number } = {}): Pose {
  const amt = Math.min(1.2, speed01);
  const run = smooth01(0.62, 1.0, speed01);
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  const hipAmp = (0.42 + 0.38 * run) * Math.min(1, amt * 1.4);
  const kneeSwing = 0.85 + 1.1 * run;
  const armAmp = (opts.armSwing ?? 0.5) * (0.6 + 0.9 * run) * Math.min(1, amt * 1.3);
  const hunch = opts.hunch ?? 0;
  // Per leg: stance knee flex just after heel strike, big flex mid-swing.
  const kneeL = 0.06 + kneeSwing * Math.pow(Math.max(0, c), 1.4) * amt + 0.18 * bump(phase, Math.PI / 2 + 0.5, 4) * amt;
  const kneeR = 0.06 + kneeSwing * Math.pow(Math.max(0, -c), 1.4) * amt + 0.18 * bump(phase, -Math.PI / 2 + 0.5, 4) * amt;
  // Foot: toe up at heel strike, push-off (toe down) as the leg trails, level mid-swing.
  const footL = (-0.28 * bump(phase, Math.PI / 2) + 0.5 * bump(phase, -Math.PI / 2 + 0.35) - 0.12 * bump(phase, 0)) * amt;
  const footR = (-0.28 * bump(phase, -Math.PI / 2) + 0.5 * bump(phase, Math.PI / 2 + 0.35) - 0.12 * bump(phase, Math.PI)) * amt;
  const bob = run > 0.5 ? -0.07 * Math.cos(2 * phase) * amt - 0.04 * run : (0.035 * Math.cos(2 * phase) - 0.035) * amt;
  const lean = 0.05 * amt + 0.28 * run + hunch;
  const p: Pose = {
    hips: [0.04 * run, 0.13 * s * amt * (1 - 0.4 * run), 0.05 * c * amt],
    spine: [lean, -0.08 * s * amt, -0.03 * c * amt],
    chest: [0.03 * amt, -0.12 * s * amt, 0],
    neck: [-lean * 0.35, 0.06 * s * amt, 0],
    head: [-0.12 * amt - hunch * 0.6, 0.06 * s * amt, 0],
    hipL: [-s * hipAmp - 0.08 * run, 0, 0.03],
    hipR: [s * hipAmp - 0.08 * run, 0, -0.03],
    kneeL: [kneeL, 0, 0],
    kneeR: [kneeR, 0, 0],
    footL: [footL, 0, 0],
    footR: [footR, 0, 0],
    shoulderL: [s * armAmp, 0, 0.1 + 0.05 * run],
    elbowL: [-(0.22 + 0.35 * Math.max(0, -s) * amt + 1.0 * run), 0, 0],
    shoulderR: opts.swordHeld ? [-0.35 - s * armAmp * 0.4, 0, -0.18] : [-s * armAmp, 0, -0.1 - 0.05 * run],
    elbowR: opts.swordHeld ? [-0.75, 0, 0] : [-(0.22 + 0.35 * Math.max(0, s) * amt + 1.0 * run), 0, 0],
    handR: opts.swordHeld ? [0.15, 0, 0] : [0, 0, 0],
    rootY: bob,
    rootPitch: 0.03 * amt + 0.06 * run,
  };
  return p;
}

/** Phase advance per second for a speed (m/s): stride length grows with speed, so feet don't skate. */
export function gaitRate(speed: number): number {
  return (speed / (1.35 + speed * 0.22)) * Math.PI * 2;
}

export function idle(t: number, opts: { swordHeld?: boolean; hunch?: number } = {}): Pose {
  const b = Math.sin(t * 1.6) * 0.025;
  const hunch = opts.hunch ?? 0;
  return {
    spine: [0.03 + b + hunch, 0, 0],
    chest: [b, 0, 0],
    head: [-b - hunch * 0.6, Math.sin(t * 0.4) * 0.15, 0],
    shoulderL: [0.05, 0, 0.14],
    elbowL: [-0.3, 0, 0],
    shoulderR: opts.swordHeld ? [-0.25, 0, -0.2] : [0.05, 0, -0.14],
    elbowR: opts.swordHeld ? [-0.7, 0, 0] : [-0.3, 0, 0],
    handR: opts.swordHeld ? [0.35, 0, 0] : [0, 0, 0],
    hipL: [0, 0, 0.04],
    hipR: [0, 0, -0.04],
    kneeL: [0.06, 0, 0],
    kneeR: [0.06, 0, 0],
    rootY: b * 0.5,
  };
}

// ---------------------------------------------------------------- draw-call baking

/**
 * Merge each node's static mesh children per material (transforms baked), recursively.
 * Characters drop from dozens of draw calls to a handful. Meshes flagged `userData.keep`
 * (animated individually) and meshes with children are left untouched.
 */
export function bakeMeshes(root: THREE.Object3D): void {
  const visit = (node: THREE.Object3D) => {
    for (const c of [...node.children]) if (!(c as THREE.Mesh).isMesh || c.children.length) visit(c);
    const byMat = new Map<THREE.Material, THREE.Mesh[]>();
    for (const c of node.children) {
      const me = c as THREE.Mesh;
      if (!me.isMesh || me.children.length || me.userData.keep || Array.isArray(me.material)) continue;
      const list = byMat.get(me.material as THREE.Material) ?? [];
      list.push(me);
      byMat.set(me.material as THREE.Material, list);
    }
    for (const [mat, list] of byMat) {
      if (list.length < 2) continue;
      const geos = list.map((me) => {
        me.updateMatrix();
        const g = (me.geometry.index ? me.geometry.toNonIndexed() : me.geometry.clone()).applyMatrix4(me.matrix);
        for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
        if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        return g;
      });
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const out = new THREE.Mesh(merged, mat);
      out.castShadow = list.some((m) => m.castShadow);
      out.receiveShadow = list.some((m) => m.receiveShadow);
      for (const me of list) node.remove(me);
      node.add(out);
    }
  };
  visit(root);
}
