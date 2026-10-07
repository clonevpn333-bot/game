import * as THREE from 'three';
import { Sculpt, type Material } from '../sculpt/Sculpt';
import { toonMaterial } from '../gfx/Toon';
import { skirt as clothSkirt, ribbon } from '../sculpt/Cloth';
import { HUMANOID, mirrorJoints, type JointDef } from '../anim/Rig';

type V = [number, number, number];
type Mat = Material;

/** Material palette builder: returns slot indices. */
class Pal {
  readonly list: Mat[] = [];
  add(m: Mat): number {
    this.list.push(m);
    return this.list.length - 1;
  }
}

export interface FaceDef {
  iris: string;
  brow: string;
  skin: string;
  lip: string;
  /** brow thickness 0..1 */
  browWeight: number;
  lashes: boolean;
  beard?: boolean;
}

export interface CharDef {
  id: string;
  scale: number;
  cell: number;
  joints: JointDef[];
  chains: { bones: string[]; tip: V; stiffness: number; damping: number; gravity?: number }[];
  face: FaceDef | null;
  weapon?: 'sword' | 'halberd' | 'hammer' | 'spear' | null;
  sculpt: () => Sculpt;
  /** voice pitch for babble */
  voice: string;
}

interface BodyOpts {
  fem?: boolean;
  skin: number; // material slot
  lip: number;
  bulk?: number; // muscle/fat 0.85..1.2
  noHead?: boolean; // helmeted characters
  bald?: boolean;
}

// ============================================================================
// anatomy
// ============================================================================
function both(f: (m: number, s: 'L' | 'R') => void): void {
  f(1, 'L');
  f(-1, 'R');
}

/** Base human body, sculpted with smooth unions so joints read as anatomy. */
function body(sc: Sculpt, o: BodyOpts): void {
  const S = o.skin;
  const b = o.bulk ?? 1;
  const sw = o.fem ? 0.9 : 1; // shoulder width
  const hw = o.fem ? 1.08 : 1; // hip width
  // pelvis & torso
  sc.ellipsoid([0, 0.94, 0], [0.155 * hw, 0.12, 0.11], { mat: S, bone: 'hips', k: 0.04 });
  both((m) => sc.ellipsoid([m * 0.075 * hw, 0.89, -0.05], [0.08 * hw, 0.09, 0.07], { mat: S, bone: 'hips', k: 0.05 }));
  sc.cone([0, 0.98, -0.005], [0, 1.17, -0.01], 0.125 * b * (o.fem ? 0.92 : 1), 0.13 * b, { mat: S, bone: 'hips', bone2: 'spine', k: 0.05 });
  sc.cone([0, 1.15, -0.01], [0, 1.36, -0.015], 0.13 * b, 0.145 * sw * b, { mat: S, bone: 'spine', bone2: 'chest', k: 0.05 });
  sc.ellipsoid([0, 1.33, -0.005], [0.165 * sw * b, 0.11, 0.105 * b], { mat: S, bone: 'chest', k: 0.05 });
  if (o.fem) both((m) => sc.ellipsoid([m * 0.055, 1.3, 0.055], [0.05, 0.045, 0.04], { mat: S, bone: 'chest', k: 0.04 }));
  else sc.ellipsoid([0, 1.31, 0.045], [0.13, 0.07, 0.06], { mat: S, bone: 'chest', k: 0.05 });
  sc.ellipsoid([0, 1.405, -0.04], [0.15 * sw, 0.06, 0.075], { mat: S, bone: 'chest', k: 0.05 });
  // neck
  sc.cone([0, 1.4, -0.025], [0, 1.585, -0.005], o.fem ? 0.046 : 0.054, o.fem ? 0.042 : 0.049, { mat: S, bone: 'neck', bone2: 'head', k: 0.04 });
  // shoulders & arms
  both((m, s) => {
    sc.sphere([m * 0.172 * sw, 1.402, -0.02], 0.058 * b, { mat: S, bone: `upperArm.${s}`, k: 0.05 });
    sc.cone([m * 0.185 * sw, 1.405, -0.025], [m * 0.212, 1.135, -0.03], 0.047 * b, 0.037, { mat: S, bone: `upperArm.${s}`, k: 0.03 });
    sc.ellipsoid([m * 0.2, 1.27, -0.008], [0.038 * b, 0.08, 0.04 * b], { mat: S, bone: `upperArm.${s}`, k: 0.03 });
    sc.cone([m * 0.212, 1.135, -0.03], [m * 0.234, 0.895, -0.008], 0.039, 0.026, { mat: S, bone: `foreArm.${s}`, k: 0.025 });
    sc.ellipsoid([m * 0.222, 1.065, -0.016], [0.036 * b, 0.07, 0.037 * b], { mat: S, bone: `foreArm.${s}`, k: 0.03 });
    hand(sc, m, s, S);
  });
  // legs
  both((m, s) => {
    sc.cone([m * 0.095 * hw, 0.93, 0], [m * 0.102, 0.52, 0.012], 0.088 * b * (o.fem ? 1.02 : 1), 0.055, { mat: S, bone: `thigh.${s}`, k: 0.045 });
    sc.sphere([m * 0.102, 0.505, 0.028], 0.049, { mat: S, bone: `shin.${s}`, k: 0.03 });
    sc.cone([m * 0.102, 0.505, 0.012], [m * 0.106, 0.11, -0.018], 0.054, 0.035, { mat: S, bone: `shin.${s}`, k: 0.03 });
    sc.ellipsoid([m * 0.1, 0.36, -0.034], [0.05 * b, 0.1, 0.05 * b], { mat: S, bone: `shin.${s}`, k: 0.04 });
    sc.sphere([m * 0.106, 0.052, -0.05], 0.04, { mat: S, bone: `foot.${s}`, k: 0.03 });
    sc.cone([m * 0.106, 0.075, -0.045], [m * 0.11, 0.036, 0.105], 0.042, 0.035, { mat: S, bone: `foot.${s}`, k: 0.03 });
    sc.cone([m * 0.11, 0.032, 0.09], [m * 0.11, 0.029, 0.15], 0.033, 0.03, { mat: S, bone: `toe.${s}`, k: 0.02 });
  });
  if (!o.noHead) head(sc, o);
}

function hand(sc: Sculpt, m: number, s: 'L' | 'R', S: number): void {
  const bone = `hand.${s}`;
  sc.box([m * 0.24, 0.835, 0.004], [0.013, 0.042, 0.033], 0.012, { mat: S, bone, k: 0.02 });
  for (let f = 0; f < 4; f++) {
    const z = -0.022 + f * 0.0145;
    const len = f === 0 || f === 3 ? 0.85 : 1;
    sc.cone([m * 0.244, 0.797, z], [m * 0.249, 0.797 - 0.05 * len, z + 0.012], 0.0085, 0.0078, { mat: S, bone, k: 0.006 });
    sc.cone([m * 0.249, 0.797 - 0.05 * len, z + 0.012], [m * 0.244, 0.797 - 0.072 * len, z + 0.024], 0.0078, 0.007, { mat: S, bone, k: 0.005 });
  }
  sc.cone([m * 0.232, 0.85, 0.028], [m * 0.238, 0.81, 0.052], 0.0115, 0.0095, { mat: S, bone, k: 0.01 });
}

/** Stylised head: big expressive eye sockets, soft features. */
function head(sc: Sculpt, o: BodyOpts): void {
  const S = o.skin;
  const f = o.fem ? 0.94 : 1;
  sc.ellipsoid([0, 1.685, -0.005], [0.106 * f, 0.118, 0.118], { mat: S, bone: 'head', k: 0 });
  sc.ellipsoid([0, 1.625, 0.035], [0.086 * f, 0.08, 0.085], { mat: S, bone: 'head', k: 0.05 });
  sc.ellipsoid([0, 1.574, 0.06], [o.fem ? 0.042 : 0.052, 0.038, 0.048], { mat: S, bone: 'head', k: 0.045 });
  both((m) => sc.sphere([m * 0.056, 1.643, 0.07], 0.034, { mat: S, bone: 'head', k: 0.03 }));
  // brow ridge
  sc.ellipsoid([0, 1.704, 0.083], [0.08 * f, 0.02, 0.032], { mat: S, bone: 'head', k: 0.03 });
  // nose
  sc.ellipsoid([0, 1.645, 0.112], [0.015, 0.03, 0.02], { mat: S, bone: 'head', k: 0.014, rot: [-0.32, 0, 0] });
  sc.sphere([0, 1.626, 0.124], o.fem ? 0.014 : 0.016, { mat: S, bone: 'head', k: 0.012 });
  both((m) => sc.sphere([m * 0.013, 1.622, 0.115], 0.01, { mat: S, bone: 'head', k: 0.01 }));
  // ears
  both((m) => {
    sc.ellipsoid([m * 0.106, 1.655, -0.002], [0.014, 0.031, 0.023], { mat: S, bone: 'head', k: 0.012, rot: [0, m * 0.35, 0] });
    sc.sphere([m * 0.112, 1.655, 0.002], 0.008, { mat: S, bone: 'head', k: 0.006, sub: true });
  });
  // lips
  sc.ellipsoid([0, 1.592, 0.098], [0.03, 0.009, 0.014], { mat: o.lip, bone: 'head', k: 0.008, priority: 1 });
  sc.ellipsoid([0, 1.581, 0.094], [0.026, 0.01, 0.014], { mat: o.lip, bone: 'head', k: 0.008, priority: 1 });
  // eye sockets (eyeballs are separate rigged meshes)
  both((m) => sc.sphere([m * 0.04, 1.668, 0.094], 0.027, { mat: S, bone: 'head', k: 0.012, sub: true }));
}

// ============================================================================
// clothing & gear (inflated shells with higher ownership priority)
// ============================================================================
function shirt(sc: Sculpt, mat: number, o: { sleeves?: 'long' | 'short' | 'none'; fem?: boolean; inflate?: number }): void {
  const i = o.inflate ?? 0.014;
  const sw = o.fem ? 0.9 : 1;
  sc.cone([0, 0.96, -0.005], [0, 1.17, -0.01], 0.128 + i, 0.133 + i, { mat, bone: 'hips', bone2: 'spine', k: 0.025, priority: 2 });
  sc.cone([0, 1.15, -0.01], [0, 1.36, -0.015], 0.133 + i, 0.148 * sw + i, { mat, bone: 'spine', bone2: 'chest', k: 0.025, priority: 2 });
  sc.ellipsoid([0, 1.33, -0.005], [0.168 * sw + i, 0.112 + i, 0.108 + i], { mat, bone: 'chest', k: 0.025, priority: 2 });
  sc.ellipsoid([0, 1.405, -0.04], [0.152 * sw + i, 0.062 + i, 0.078 + i], { mat, bone: 'chest', k: 0.025, priority: 2 });
  if (o.sleeves !== 'none') {
    both((m, s) => {
      sc.sphere([m * 0.172 * sw, 1.402, -0.02], 0.064, { mat, bone: `upperArm.${s}`, k: 0.025, priority: 2 });
      sc.cone([m * 0.185 * sw, 1.405, -0.025], [m * 0.212, 1.135, -0.03], 0.054, 0.046, { mat, bone: `upperArm.${s}`, k: 0.02, priority: 2 });
      if (o.sleeves === 'long') sc.cone([m * 0.212, 1.135, -0.03], [m * 0.232, 0.93, -0.012], 0.046, 0.036, { mat, bone: `foreArm.${s}`, k: 0.02, priority: 2 });
    });
  }
}

function trousers(sc: Sculpt, mat: number, toAnkle = true): void {
  both((m, s) => {
    sc.cone([m * 0.095, 0.95, 0], [m * 0.102, 0.52, 0.012], 0.098, 0.064, { mat, bone: `thigh.${s}`, k: 0.025, priority: 1 });
    sc.sphere([m * 0.102, 0.505, 0.028], 0.057, { mat, bone: `shin.${s}`, k: 0.02, priority: 1 });
    if (toAnkle) sc.cone([m * 0.102, 0.505, 0.012], [m * 0.106, 0.14, -0.018], 0.062, 0.044, { mat, bone: `shin.${s}`, k: 0.02, priority: 1 });
  });
  sc.ellipsoid([0, 0.94, 0], [0.165, 0.125, 0.118], { mat, bone: 'hips', k: 0.02, priority: 1 });
}

function boots(sc: Sculpt, mat: number, cuffMat: number, high = 0.36): void {
  both((m, s) => {
    sc.cone([m * 0.103, high, -0.02], [m * 0.106, 0.1, -0.02], 0.058, 0.047, { mat, bone: `shin.${s}`, k: 0.02, priority: 3 });
    sc.torus([m * 0.103, high - 0.01, -0.02], 0.056, 0.012, { mat: cuffMat, bone: `shin.${s}`, k: 0.01, priority: 4 });
    sc.sphere([m * 0.106, 0.052, -0.05], 0.048, { mat, bone: `foot.${s}`, k: 0.03, priority: 3 });
    sc.cone([m * 0.106, 0.075, -0.045], [m * 0.11, 0.04, 0.11], 0.05, 0.042, { mat, bone: `foot.${s}`, k: 0.03, priority: 3 });
    sc.cone([m * 0.11, 0.036, 0.09], [m * 0.11, 0.034, 0.158], 0.041, 0.036, { mat, bone: `toe.${s}`, k: 0.02, priority: 3 });
    sc.box([m * 0.108, 0.008, 0.03], [0.05, 0.01, 0.14], 0.008, { mat: cuffMat, bone: `foot.${s}`, k: 0.01, priority: 4 });
  });
}

/**
 * Tunic / dress skirt as a thin cloth shell (not a sculpted volume) so it hangs
 * close to the body and its hem swings with the legs.
 */
function skirt(sc: Sculpt, mat: number, hem: number, flare: number, top = 0.98, o: { hemMat?: number; depth?: number; rTop?: number } = {}): void {
  const m = sc.materials[mat];
  const hm = o.hemMat !== undefined ? sc.materials[o.hemMat] : undefined;
  const len = top - hem;
  sc.extras.push((bones) =>
    clothSkirt({ yTop: top, yHem: hem, rTop: o.rTop ?? 0.165, rHem: 0.18 + flare + len * 0.12, depth: o.depth ?? 0.8, zOff: 0.0, mat: m, hemMat: hm, folds: 7 + Math.round(len * 8), foldDepth: 0.006 + len * 0.012 }, bones),
  );
}

/** Flat cloth strip skinned along a simulated chain (cape, scarf tail, hair). */
function chainRibbon(sc: Sculpt, joints: JointDef[], tip: V, mat: number, w0: number, w1: number, edge?: number): void {
  const pts = joints.map((j) => j.at).concat([tip]);
  const widths = pts.map((_, i) => w0 + (w1 - w0) * (i / (pts.length - 1)));
  const names = joints.map((j) => j.name);
  names.push(names[names.length - 1]);
  sc.extras.push((bones) => ribbon({ pts, widths, bones: names, mat: sc.materials[mat], edgeMat: edge !== undefined ? sc.materials[edge] : undefined }, bones));
}

/** Front + back tabard panels hanging from the shoulders. */
function tabard(sc: Sculpt, mat: number, edge: number, hem: number): void {
  for (const z of [1, -1]) {
    sc.extras.push((bones) =>
      ribbon(
        { pts: [[0, 1.42, 0.128 * z], [0, 1.2, 0.162 * z], [0, 0.97, 0.188 * z], [0, hem, 0.178 * z]], widths: [0.2, 0.25, 0.26, 0.25], bones: ['chest', 'spine', 'hips', 'hips'], mat: sc.materials[mat], edgeMat: sc.materials[edge] },
        bones,
      ),
    );
  }
}

/** Static shoulder cloak for crowd characters (no simulated chain). */
function backCloth(sc: Sculpt, mat: number, hem: number): void {
  sc.extras.push((bones) =>
    ribbon({ pts: [[0, 1.44, -0.13], [0, 1.15, -0.16], [0, 0.9, -0.19], [0, hem, -0.23]], widths: [0.28, 0.38, 0.42, 0.46], bones: ['chest', 'spine', 'hips', 'hips'], mat: sc.materials[mat] }, bones),
  );
}

function belt(sc: Sculpt, mat: number, buckle: number, y = 0.975, R = 0.158): void {
  sc.torus([0, y, 0], R, 0.016, { mat, bone: 'hips', k: 0.008, priority: 5 });
  sc.box([0, y, R + 0.008], [0.03, 0.022, 0.008], 0.005, { mat: buckle, bone: 'hips', k: 0.005, priority: 6 });
}

function scarfChain(): JointDef[] {
  return [
    { name: 'scarf0', parent: 'chest', at: [0.05, 1.45, -0.085] },
    { name: 'scarf1', parent: 'scarf0', at: [0.07, 1.33, -0.14] },
    { name: 'scarf2', parent: 'scarf1', at: [0.08, 1.19, -0.16] },
    { name: 'scarf3', parent: 'scarf2', at: [0.085, 1.05, -0.17] },
  ];
}

function capeChain(prefix = 'cape'): JointDef[] {
  return [
    { name: `${prefix}0`, parent: 'chest', at: [0, 1.43, -0.12] },
    { name: `${prefix}1`, parent: `${prefix}0`, at: [0, 1.18, -0.17] },
    { name: `${prefix}2`, parent: `${prefix}1`, at: [0, 0.9, -0.2] },
    { name: `${prefix}3`, parent: `${prefix}2`, at: [0, 0.6, -0.22] },
  ];
}

function hairChain(): JointDef[] {
  return [
    { name: 'hair0', parent: 'head', at: [0, 1.67, -0.1] },
    { name: 'hair1', parent: 'hair0', at: [0, 1.55, -0.13] },
    { name: 'hair2', parent: 'hair1', at: [0, 1.4, -0.14] },
    { name: 'hair3', parent: 'hair2', at: [0, 1.25, -0.135] },
  ];
}

function chainCloth(sc: Sculpt, joints: JointDef[], tip: V, mat: number, w: number, thick: number, edge?: number): void {
  const pts = joints.map((j) => j.at).concat([tip]);
  for (let i = 0; i < joints.length; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const c: V = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const tilt = Math.atan2(b[2] - a[2], -(b[1] - a[1]));
    const ww = w * (1 + i * 0.12);
    sc.box(c, [ww / 2, len / 2 + 0.02, thick], thick * 0.9, { mat, bone: joints[i].name, k: 0.03, priority: 3, rot: [-tilt, 0, 0] });
    if (edge !== undefined) sc.box([c[0], c[1], c[2] - thick * 0.6], [ww / 2 + 0.006, len / 2 + 0.02, thick * 0.5], thick * 0.4, { mat: edge, bone: joints[i].name, k: 0.01, priority: 2, rot: [-tilt, 0, 0] });
  }
}

// ============================================================================
// the cast
// ============================================================================
const rigWith = (...extra: JointDef[][]) => mirrorJoints(HUMANOID).concat(...extra);

function kael(): CharDef {
  const scarf = scarfChain();
  return {
    id: 'kael',
    scale: 1,
    cell: 0.0085,
    joints: rigWith(scarf),
    chains: [{ bones: scarf.map((j) => j.name), tip: [0.0, -0.13, -0.01], stiffness: 0.06, damping: 0.9 }],
    face: { iris: '#5a3a1e', brow: '#3a2216', skin: '#e9b38c', lip: '#c27a6a', browWeight: 1, lashes: false },
    weapon: 'sword',
    voice: 'KAEL',
    sculpt: () => {
      const P = new Pal();
      const SKIN = P.add({ color: '#e9b38c', rough: 0.55, sss: 1 });
      const LIP = P.add({ color: '#c27a6a', rough: 0.4, sss: 1 });
      const TUNIC = P.add({ color: '#24406e', rough: 0.85 });
      const TRIM = P.add({ color: '#d4a64a', rough: 0.35, metal: 0.8 });
      const TROUS = P.add({ color: '#3b2c26', rough: 0.9 });
      const BOOT = P.add({ color: '#4a2c1a', rough: 0.55 });
      const LEATHER = P.add({ color: '#6a4026', rough: 0.6 });
      const STEEL = P.add({ color: '#c9d2dc', rough: 0.28, metal: 0.95 });
      const SCARF = P.add({ color: '#b8302a', rough: 0.85 });
      const HAIR = P.add({ color: '#4a2a1a', rough: 0.6 });
      const sc = new Sculpt(P.list);
      body(sc, { skin: SKIN, lip: LIP });
      shirt(sc, TUNIC, { sleeves: 'long' });
      skirt(sc, TUNIC, 0.66, 0.01, 1.0, { hemMat: TRIM, rTop: 0.175 });
      trousers(sc, TROUS);
      boots(sc, BOOT, LEATHER);
      belt(sc, LEATHER, TRIM);
      // quilted gambeson ridges + chest trim
      for (let k = 0; k < 4; k++) sc.torus([0, 1.08 + k * 0.075, -0.008], 0.142 + k * 0.004, 0.006, { mat: TUNIC, bone: 'spine', k: 0.006, priority: 3 });
      sc.box([0, 1.3, 0.122], [0.014, 0.13, 0.008], 0.006, { mat: TRIM, bone: 'chest', k: 0.008, priority: 4 });
      // bracers
      both((m, s) => sc.cone([m * 0.224, 1.0, -0.02], [m * 0.233, 0.91, -0.01], 0.042, 0.036, { mat: LEATHER, bone: `foreArm.${s}`, k: 0.01, priority: 4 }));
      // pauldron on the sword arm
      sc.ellipsoid([-0.185, 1.43, -0.02], [0.082, 0.052, 0.08], { mat: STEEL, bone: 'upperArm.R', k: 0.012, priority: 5, rot: [0, 0, -0.35] });
      sc.ellipsoid([-0.195, 1.395, -0.02], [0.072, 0.04, 0.075], { mat: STEEL, bone: 'upperArm.R', k: 0.012, priority: 5, rot: [0, 0, -0.5] });
      sc.torus([-0.19, 1.405, -0.02], 0.072, 0.008, { mat: TRIM, bone: 'upperArm.R', k: 0.004, priority: 6, rot: [0, 0, -0.45] });
      // baldric strap
      sc.cone([0.13, 1.4, 0.07], [-0.13, 0.99, 0.13], 0.014, 0.014, { mat: LEATHER, bone: 'chest', bone2: 'hips', k: 0.008, priority: 5 });
      // scarf: wrap + trailing tail
      sc.torus([0, 1.465, -0.015], 0.066, 0.032, { mat: SCARF, bone: 'neck', k: 0.02, priority: 4, rot: [0.15, 0, 0] });
      chainRibbon(sc, scarf, [0.09, 0.92, -0.17], SCARF, 0.07, 0.085);
      // tousled hair
      sc.ellipsoid([0, 1.728, -0.028], [0.117, 0.098, 0.12], { mat: HAIR, bone: 'head', k: 0.02, priority: 3 });
      const spikes: [V, V][] = [
        [[0.0, 1.8, -0.02], [0.02, 1.84, -0.09]],
        [[0.06, 1.79, 0.0], [0.12, 1.8, -0.06]],
        [[-0.06, 1.79, 0.0], [-0.12, 1.81, -0.07]],
        [[0.07, 1.74, -0.08], [0.13, 1.7, -0.15]],
        [[-0.07, 1.74, -0.08], [-0.12, 1.68, -0.16]],
        [[0.0, 1.72, -0.11], [0.0, 1.64, -0.17]],
        [[0.09, 1.69, 0.03], [0.125, 1.64, 0.02]],
        [[-0.09, 1.69, 0.03], [-0.125, 1.64, 0.0]],
      ];
      for (const [a, b2] of spikes) sc.cone(a, b2, 0.038, 0.007, { mat: HAIR, bone: 'head', k: 0.02, priority: 3 });
      // fringe locks swept to one side
      sc.cone([0.02, 1.79, 0.06], [0.07, 1.735, 0.118], 0.032, 0.006, { mat: HAIR, bone: 'head', k: 0.015, priority: 3 });
      sc.cone([-0.03, 1.79, 0.07], [0.02, 1.74, 0.122], 0.03, 0.006, { mat: HAIR, bone: 'head', k: 0.015, priority: 3 });
      sc.cone([-0.07, 1.78, 0.05], [-0.06, 1.73, 0.115], 0.026, 0.006, { mat: HAIR, bone: 'head', k: 0.015, priority: 3 });
      return sc;
    },
  };
}

function lyra(): CharDef {
  const hair = hairChain();
  return {
    id: 'lyra',
    scale: 0.9,
    cell: 0.0085,
    joints: rigWith(hair),
    chains: [{ bones: hair.map((j) => j.name), tip: [0, -0.15, 0.01], stiffness: 0.08, damping: 0.88 }],
    face: { iris: '#2fa8b8', brow: '#c8d4e4', skin: '#f2d4c0', lip: '#d48a8a', browWeight: 0.6, lashes: true },
    weapon: null,
    voice: 'LYRA',
    sculpt: () => {
      const P = new Pal();
      const SKIN = P.add({ color: '#f2d4c0', rough: 0.5, sss: 1 });
      const LIP = P.add({ color: '#d48a8a', rough: 0.4, sss: 1 });
      const DRESS = P.add({ color: '#6a87a8', rough: 0.85 });
      const CREAM = P.add({ color: '#e2d8c4', rough: 0.85 });
      const UNDER = P.add({ color: '#2c3a4e', rough: 0.85 });
      const GLOW = P.add({ color: '#7ff3ff', rough: 0.3, glow: 0.35 });
      const SHOE = P.add({ color: '#c9b49a', rough: 0.7 });
      const HAIR = P.add({ color: '#cbd5e3', rough: 0.5 });
      const GOLD = P.add({ color: '#e0c27a', rough: 0.3, metal: 0.9 });
      const sc = new Sculpt(P.list);
      body(sc, { skin: SKIN, lip: LIP, fem: true, bulk: 0.9 });
      shirt(sc, DRESS, { sleeves: 'short', fem: true, inflate: 0.01 });
      skirt(sc, DRESS, 0.48, 0.04, 1.0, { hemMat: CREAM });
      // cream collar & cuffs
      sc.torus([0, 1.43, -0.025], 0.1, 0.018, { mat: CREAM, bone: 'chest', k: 0.012, priority: 5, rot: [0.12, 0, 0] });
      // leggings + soft boots
      both((m, s) => {
        sc.cone([m * 0.102, 0.52, 0.012], [m * 0.106, 0.14, -0.018], 0.058, 0.04, { mat: UNDER, bone: `shin.${s}`, k: 0.03, priority: 1 });
        sc.cone([m * 0.104, 0.2, -0.02], [m * 0.106, 0.09, -0.02], 0.048, 0.044, { mat: SHOE, bone: `shin.${s}`, k: 0.02, priority: 3 });
        sc.cone([m * 0.106, 0.07, -0.045], [m * 0.11, 0.038, 0.105], 0.046, 0.038, { mat: SHOE, bone: `foot.${s}`, k: 0.03, priority: 3 });
        sc.cone([m * 0.11, 0.034, 0.09], [m * 0.11, 0.031, 0.15], 0.036, 0.032, { mat: SHOE, bone: `toe.${s}`, k: 0.02, priority: 3 });
        // glowing circuitry lines on the forearms
        sc.torus([m * 0.224, 1.04, -0.018], 0.04, 0.0045, { mat: GLOW, bone: `foreArm.${s}`, k: 0.003, priority: 6 });
        sc.torus([m * 0.231, 0.96, -0.012], 0.035, 0.0045, { mat: GLOW, bone: `foreArm.${s}`, k: 0.003, priority: 6 });
      });
      // glowing seams on the dress
      sc.cone([0, 1.4, 0.115], [0, 1.0, 0.145], 0.006, 0.006, { mat: GLOW, bone: 'chest', bone2: 'hips', k: 0.004, priority: 6 });
      sc.torus([0, 1.455, -0.02], 0.062, 0.012, { mat: GOLD, bone: 'neck', k: 0.006, priority: 5 });
      // long silver hair: crown, side locks, and a simulated tail
      sc.ellipsoid([0, 1.715, -0.025], [0.121, 0.114, 0.125], { mat: HAIR, bone: 'head', k: 0.02, priority: 3 });
      sc.ellipsoid([0, 1.745, 0.05], [0.115, 0.05, 0.075], { mat: HAIR, bone: 'head', k: 0.03, priority: 3, rot: [0.4, 0, 0] });
      both((m) => {
        sc.cone([m * 0.1, 1.7, 0.03], [m * 0.105, 1.5, 0.04], 0.034, 0.016, { mat: HAIR, bone: 'head', k: 0.02, priority: 3 });
        sc.cone([m * 0.075, 1.75, 0.09], [m * 0.088, 1.62, 0.11], 0.028, 0.008, { mat: HAIR, bone: 'head', k: 0.015, priority: 3 });
      });
      // soft fringe of bangs across the forehead
      for (let b = 0; b < 6; b++) {
        const x = -0.07 + b * 0.028;
        sc.cone([x * 0.8, 1.79, 0.07], [x * 1.08, 1.705 - Math.abs(x) * 0.25, 0.116], 0.022, 0.005, { mat: HAIR, bone: 'head', k: 0.012, priority: 3 });
      }
      chainCloth(sc, hair, [0, 1.1, -0.12], HAIR, 0.16, 0.035);
      // forehead sigil
      sc.sphere([0, 1.735, 0.108], 0.009, { mat: GLOW, bone: 'head', k: 0.004, priority: 7 });
      return sc;
    },
  };
}

function maren(): CharDef {
  const cape = capeChain();
  return {
    id: 'maren',
    scale: 1.02,
    cell: 0.0095,
    joints: rigWith(cape),
    chains: [{ bones: cape.map((j) => j.name), tip: [0, -0.28, -0.02], stiffness: 0.05, damping: 0.9 }],
    face: { iris: '#3a4a5a', brow: '#2b1e18', skin: '#c99272', lip: '#9a5a4a', browWeight: 0.9, lashes: true },
    weapon: 'sword',
    voice: 'MAREN',
    sculpt: () => {
      const P = new Pal();
      const SKIN = P.add({ color: '#c99272', rough: 0.55, sss: 1 });
      const LIP = P.add({ color: '#9a5a4a', rough: 0.5, sss: 1 });
      const STEEL = P.add({ color: '#d0d7df', rough: 0.25, metal: 0.95 });
      const BLUE = P.add({ color: '#1f3460', rough: 0.85 });
      const GOLD = P.add({ color: '#e0b040', rough: 0.3, metal: 0.9 });
      const RED = P.add({ color: '#a82a26', rough: 0.85 });
      const BOOT = P.add({ color: '#2a1a12', rough: 0.55 });
      const HAIR = P.add({ color: '#2b1e18', rough: 0.6 });
      const sc = new Sculpt(P.list);
      body(sc, { skin: SKIN, lip: LIP, fem: true });
      shirt(sc, BLUE, { sleeves: 'long', fem: true });
      skirt(sc, BLUE, 0.7, 0.02, 0.98, { hemMat: GOLD, rTop: 0.172 });
      trousers(sc, BLUE);
      boots(sc, BOOT, STEEL, 0.42);
      belt(sc, BOOT, GOLD);
      // cuirass + pauldrons
      sc.ellipsoid([0, 1.3, 0.008], [0.182, 0.165, 0.142], { mat: STEEL, bone: 'chest', k: 0.02, priority: 5 });
      sc.ellipsoid([0, 1.12, 0.01], [0.16, 0.07, 0.13], { mat: STEEL, bone: 'spine', k: 0.02, priority: 5 });
      sc.box([0, 1.3, 0.13], [0.008, 0.11, 0.004], 0.003, { mat: GOLD, bone: 'chest', k: 0.004, priority: 6 });
      both((m, s) => {
        sc.ellipsoid([m * 0.185, 1.43, -0.02], [0.082, 0.05, 0.08], { mat: STEEL, bone: `upperArm.${s}`, k: 0.012, priority: 6, rot: [0, 0, m * 0.35] });
        sc.cone([m * 0.222, 1.02, -0.02], [m * 0.232, 0.91, -0.01], 0.043, 0.037, { mat: STEEL, bone: `foreArm.${s}`, k: 0.01, priority: 5 });
      });
      chainRibbon(sc, cape, [0, 0.34, -0.23], RED, 0.3, 0.5, GOLD);
      // short hair in a tight bun
      sc.ellipsoid([0, 1.725, -0.02], [0.116, 0.104, 0.12], { mat: HAIR, bone: 'head', k: 0.02, priority: 3 });
      sc.sphere([0, 1.7, -0.135], 0.045, { mat: HAIR, bone: 'head', k: 0.02, priority: 3 });
      return sc;
    },
  };
}

function vesk(): CharDef {
  const cape = capeChain('mantle');
  return {
    id: 'vesk',
    scale: 1.08,
    cell: 0.0095,
    joints: rigWith(cape),
    chains: [{ bones: cape.map((j) => j.name), tip: [0, -0.3, -0.02], stiffness: 0.07, damping: 0.88 }],
    face: { iris: '#7a5a3a', brow: '#d8d8d8', skin: '#e2c0a8', lip: '#a8706a', browWeight: 1.3, lashes: false, beard: true },
    weapon: 'hammer',
    voice: 'VESK',
    sculpt: () => {
      const P = new Pal();
      const SKIN = P.add({ color: '#e2c0a8', rough: 0.6, sss: 1 });
      const LIP = P.add({ color: '#a8706a', rough: 0.5, sss: 1 });
      const ROBE = P.add({ color: '#d9cdb8', rough: 0.85 });
      const CRIMSON = P.add({ color: '#8c1f24', rough: 0.8 });
      const GOLD = P.add({ color: '#d8a640', rough: 0.3, metal: 0.9 });
      const BEARD = P.add({ color: '#dcdcdc', rough: 0.7 });
      const GLOW = P.add({ color: '#ffb347', glow: 1 });
      const sc = new Sculpt(P.list);
      body(sc, { skin: SKIN, lip: LIP, bulk: 0.95 });
      shirt(sc, ROBE, { sleeves: 'long', inflate: 0.02 });
      skirt(sc, ROBE, 0.1, 0.05, 1.0, { hemMat: CRIMSON, rTop: 0.178 });
      both((m, s) => sc.cone([m * 0.212, 1.12, -0.03], [m * 0.235, 0.93, -0.01], 0.06, 0.075, { mat: CRIMSON, bone: `foreArm.${s}`, k: 0.02, priority: 4 }));
      sc.box([0, 1.0, 0.15], [0.07, 0.36, 0.01], 0.008, { mat: CRIMSON, bone: 'hips', k: 0.02, priority: 4 });
      belt(sc, GOLD, GOLD, 0.99, 0.165);
      chainRibbon(sc, cape, [0, 0.25, -0.24], CRIMSON, 0.34, 0.56, GOLD);
      // bell mitre
      sc.cone([0, 1.75, -0.01], [0, 1.95, -0.02], 0.115, 0.06, { mat: GOLD, bone: 'head', k: 0.02, priority: 4 });
      sc.torus([0, 1.76, -0.01], 0.115, 0.012, { mat: GOLD, bone: 'head', k: 0.005, priority: 5 });
      sc.sphere([0, 1.98, -0.02], 0.025, { mat: GOLD, bone: 'head', k: 0.01, priority: 5 });
      sc.sphere([0, 1.83, 0.098], 0.014, { mat: GLOW, bone: 'head', k: 0.004, priority: 6 });
      // beard & moustache
      sc.ellipsoid([0, 1.56, 0.07], [0.07, 0.07, 0.05], { mat: BEARD, bone: 'head', k: 0.03, priority: 3 });
      sc.cone([0, 1.53, 0.08], [0, 1.43, 0.08], 0.05, 0.012, { mat: BEARD, bone: 'head', k: 0.03, priority: 3 });
      both((m) => sc.cone([m * 0.01, 1.605, 0.112], [m * 0.045, 1.585, 0.098], 0.011, 0.005, { mat: BEARD, bone: 'head', k: 0.008, priority: 4 }));
      return sc;
    },
  };
}

function warden(): CharDef {
  return {
    id: 'warden',
    scale: 1.03,
    cell: 0.013,
    joints: rigWith(),
    chains: [],
    face: null,
    weapon: 'halberd',
    voice: 'WARDEN',
    sculpt: () => {
      const P = new Pal();
      const SKIN = P.add({ color: '#c99272', sss: 1 });
      const ROBE = P.add({ color: '#8c1f24', rough: 0.85 });
      const DARK = P.add({ color: '#4a1418', rough: 0.85 });
      const BRONZE = P.add({ color: '#b88a3a', rough: 0.35, metal: 0.9 });
      const GLOW = P.add({ color: '#ffa040', glow: 1 });
      const BOOT = P.add({ color: '#2a1612', rough: 0.6 });
      const sc = new Sculpt(P.list);
      body(sc, { skin: SKIN, lip: SKIN, noHead: true });
      sc.cone([0, 1.56, 0], [0, 1.6, 0.01], 0.07, 0.07, { mat: SKIN, bone: 'head', k: 0.03 });
      shirt(sc, ROBE, { sleeves: 'long', inflate: 0.02 });
      skirt(sc, ROBE, 0.2, 0.04, 0.98, { hemMat: DARK, rTop: 0.178 });
      boots(sc, BOOT, DARK, 0.3);
      sc.ellipsoid([0, 1.39, -0.01], [0.21, 0.07, 0.15], { mat: BRONZE, bone: 'chest', k: 0.03, priority: 5 });
      belt(sc, BRONZE, BRONZE);
      // the bell helm: their unmistakable silhouette
      sc.cone([0, 1.58, -0.005], [0, 1.83, -0.005], 0.165, 0.09, { mat: BRONZE, bone: 'head', k: 0.04, priority: 5 });
      sc.torus([0, 1.575, -0.005], 0.17, 0.018, { mat: BRONZE, bone: 'head', k: 0.01, priority: 6 });
      sc.sphere([0, 1.87, -0.005], 0.035, { mat: BRONZE, bone: 'head', k: 0.02, priority: 6 });
      sc.box([0, 1.66, 0.155], [0.075, 0.009, 0.03], 0.006, { mat: GLOW, bone: 'head', k: 0.004, priority: 7 });
      return sc;
    },
  };
}

function guard(): CharDef {
  return {
    id: 'guard',
    scale: 1,
    cell: 0.013,
    joints: rigWith(),
    chains: [],
    face: { iris: '#4a3a2a', brow: '#3a2a20', skin: '#d9a582', lip: '#b07060', browWeight: 1, lashes: false },
    weapon: 'halberd',
    voice: 'GUARD',
    sculpt: () => {
      const P = new Pal();
      const SKIN = P.add({ color: '#d9a582', sss: 1 });
      const LIP = P.add({ color: '#b07060', sss: 1 });
      const MAIL = P.add({ color: '#5e656e', rough: 0.6, metal: 0.55 });
      const TABARD = P.add({ color: '#2a4a80', rough: 0.85 });
      const GOLD = P.add({ color: '#d8b04a', rough: 0.3, metal: 0.9 });
      const STEEL = P.add({ color: '#c0c8d0', rough: 0.25, metal: 0.95 });
      const BOOT = P.add({ color: '#2c1f17', rough: 0.6 });
      const sc = new Sculpt(P.list);
      body(sc, { skin: SKIN, lip: LIP });
      shirt(sc, MAIL, { sleeves: 'long' });
      trousers(sc, MAIL);
      boots(sc, BOOT, BOOT);
      tabard(sc, TABARD, GOLD, 0.8);
      sc.box([0, 1.25, 0.152], [0.03, 0.03, 0.006], 0.004, { mat: GOLD, bone: 'chest', k: 0.003, priority: 5, rot: [0, 0, Math.PI / 4] });
      belt(sc, BOOT, GOLD);
      sc.ellipsoid([0, 1.73, -0.01], [0.125, 0.09, 0.13], { mat: STEEL, bone: 'head', k: 0.02, priority: 5 });
      sc.torus([0, 1.7, -0.01], 0.135, 0.02, { mat: STEEL, bone: 'head', k: 0.01, priority: 5 });
      sc.box([0, 1.67, 0.118], [0.008, 0.05, 0.01], 0.004, { mat: STEEL, bone: 'head', k: 0.006, priority: 6 });
      return sc;
    },
  };
}

/** Townsfolk & soldiers: same anatomy, lower mesh resolution, recolourable cloth. */
export function citizen(kind: 'man' | 'woman' | 'elder' | 'soldierBlue' | 'soldierRed'): CharDef {
  return {
    id: `citizen-${kind}`,
    scale: kind === 'elder' ? 0.95 : kind === 'woman' ? 0.93 : 1,
    cell: 0.02,
    joints: rigWith(),
    chains: [],
    face: { iris: '#3a2a20', brow: '#3a2a20', skin: '#d9a582', lip: '#b07060', browWeight: 0.8, lashes: kind === 'woman' },
    weapon: null,
    voice: 'CROWD',
    sculpt: () => {
      const P = new Pal();
      const SKIN = P.add({ color: kind === 'elder' ? '#c99a7a' : '#d9a582', sss: 1 });
      const CLOTH = P.add({ color: '#d8d0c4', rough: 0.85, tint: 1 });
      const CLOTH2 = P.add({ color: '#8a7a6a', rough: 0.9 });
      const HAIR = P.add({ color: '#4a3020', rough: 0.6 });
      const BOOT = P.add({ color: '#3a2618', rough: 0.7 });
      const STEEL = P.add({ color: '#b8c0c8', rough: 0.3, metal: 0.9 });
      const BRONZE = P.add({ color: '#b88a3a', rough: 0.35, metal: 0.9 });
      const EYE = P.add({ color: '#1a1214', rough: 0.3 });
      const sc = new Sculpt(P.list);
      const fem = kind === 'woman';
      // painted eyes (crowd instances have no face rig)
      if (kind !== 'soldierRed') both((m) => sc.sphere([m * 0.04, 1.664, 0.09], 0.021, { mat: EYE, bone: 'head', k: 0.004, priority: 1 }));
      body(sc, { skin: SKIN, lip: SKIN, fem, noHead: kind === 'soldierRed' });
      shirt(sc, CLOTH, { sleeves: 'long', fem });
      if (fem) skirt(sc, CLOTH, 0.15, 0.04, 0.98, { hemMat: CLOTH2 });
      else {
        trousers(sc, CLOTH2);
        skirt(sc, CLOTH, 0.76, 0.0, 0.98, { rTop: 0.175 });
      }
      boots(sc, BOOT, BOOT, 0.25);
      if (kind === 'man') {
        sc.ellipsoid([0, 1.75, -0.01], [0.12, 0.06, 0.13], { mat: CLOTH2, bone: 'head', k: 0.02, priority: 4 });
      } else if (kind === 'woman') {
        sc.ellipsoid([0, 1.715, -0.02], [0.122, 0.112, 0.128], { mat: CLOTH, bone: 'head', k: 0.03, priority: 3 });
        sc.cone([0, 1.62, -0.08], [0, 1.4, -0.12], 0.09, 0.12, { mat: CLOTH, bone: 'head', bone2: 'chest', k: 0.04, priority: 3 });
      } else if (kind === 'elder') {
        sc.ellipsoid([0, 1.72, -0.03], [0.112, 0.09, 0.11], { mat: HAIR, bone: 'head', k: 0.02, priority: 3 });
        backCloth(sc, CLOTH2, 0.35);
      } else if (kind === 'soldierBlue') {
        sc.ellipsoid([0, 1.73, -0.01], [0.125, 0.09, 0.13], { mat: STEEL, bone: 'head', k: 0.02, priority: 5 });
        backCloth(sc, CLOTH, 0.5);
        sc.ellipsoid([0, 1.3, 0.0], [0.17, 0.15, 0.125], { mat: STEEL, bone: 'chest', k: 0.03, priority: 5 });
      } else {
        sc.cone([0, 1.55, -0.005], [0, 1.8, -0.005], 0.16, 0.09, { mat: BRONZE, bone: 'head', k: 0.04, priority: 5 });
        backCloth(sc, CLOTH, 0.5);
      }
      return sc;
    },
  };
}

export const CAST: Record<string, () => CharDef> = { kael, lyra, maren, vesk, warden, guard };

// ============================================================================
// props
// ============================================================================
const steel = () => toonMaterial({ color: '#dfe6ee', metal: true, brushScale: 0.1 });
const gold = () => toonMaterial({ color: '#e0aa4a', metal: true, brushScale: 0.1 });
const wood = () => toonMaterial({ color: '#5a3a24', brushScale: 0.1 });
const leather = () => toonMaterial({ color: '#4a2c1c', brushScale: 0.1 });

function bladeShape(len: number, w: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.lineTo(-w / 2, len * 0.82);
  s.quadraticCurveTo(-w * 0.4, len * 0.95, 0, len);
  s.quadraticCurveTo(w * 0.4, len * 0.95, w / 2, len * 0.82);
  s.lineTo(w / 2, 0);
  s.lineTo(-w / 2, 0);
  return s;
}

/** Weapon/prop meshes, built in hand space: grip at origin, pointing along +Y. */
export function buildProp(kind: 'sword' | 'halberd' | 'hammer' | 'spear'): THREE.Group {
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, p: V = [0, 0, 0], r: V = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(...p);
    mesh.rotation.set(...r);
    mesh.castShadow = true;
    g.add(mesh);
    return mesh;
  };
  if (kind === 'sword') {
    const blade = new THREE.ExtrudeGeometry(bladeShape(0.82, 0.055), { depth: 0.008, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 2 });
    blade.translate(0, 0, -0.004);
    add(blade, steel(), [0, 0.12, 0]);
    add(new THREE.BoxGeometry(0.008, 0.6, 0.004), toonMaterial({ color: '#9aa4ae', metal: true, brushScale: 0.1 }), [0, 0.45, 0.009]);
    add(new THREE.CylinderGeometry(0.018, 0.022, 0.23, 10, 1), gold(), [0, 0.105, 0], [0, 0, Math.PI / 2]).scale.set(1, 1, 0.6);
    add(new THREE.CylinderGeometry(0.017, 0.017, 0.16, 10), leather(), [0, 0.02, 0]);
    add(new THREE.SphereGeometry(0.026, 12, 8), gold(), [0, -0.07, 0]);
  } else if (kind === 'halberd' || kind === 'spear') {
    add(new THREE.CylinderGeometry(0.018, 0.022, 2.1, 8), wood(), [0, 0.55, 0]);
    add(new THREE.ConeGeometry(0.035, 0.32, 8), steel(), [0, 1.75, 0]);
    if (kind === 'halberd') {
      const axe = new THREE.Shape();
      axe.moveTo(0, -0.12);
      axe.quadraticCurveTo(0.22, -0.16, 0.24, 0.0);
      axe.quadraticCurveTo(0.22, 0.16, 0, 0.12);
      axe.lineTo(0, -0.12);
      const ag = new THREE.ExtrudeGeometry(axe, { depth: 0.01, bevelEnabled: true, bevelThickness: 0.005, bevelSize: 0.006, bevelSegments: 1 });
      add(ag, gold(), [0.02, 1.45, -0.005]);
    }
    add(new THREE.TorusGeometry(0.026, 0.008, 6, 12), gold(), [0, 1.58, 0], [Math.PI / 2, 0, 0]);
  } else {
    add(new THREE.CylinderGeometry(0.022, 0.026, 1.5, 8), wood(), [0, 0.45, 0]);
    const bell = new THREE.LatheGeometry([0.0, 0.08, 0.14, 0.17, 0.2, 0.235, 0.24].map((r, i) => new THREE.Vector2(r, 0.3 - i * 0.05)), 18);
    add(bell, gold(), [0, 1.3, 0], [0, 0, Math.PI / 2]);
    add(new THREE.TorusGeometry(0.24, 0.02, 8, 24), gold(), [-0.0, 1.3, 0], [0, Math.PI / 2, 0]);
  }
  return g;
}
