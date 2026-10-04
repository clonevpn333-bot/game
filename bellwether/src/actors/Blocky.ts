import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { damp, clamp } from '../render/Globals';

/**
 * Stylized blocky characters, built procedurally.
 * Every part is a bevelled block rigidly bound to one bone and merged into a single SkinnedMesh,
 * so a richly detailed figure costs a handful of draw calls and moves like a jointed action
 * figure: no rubbery limbs.
 */

export type Gen = 'human' | 'gen4' | 'gen3' | 'gen2' | 'security' | 'null' | 'discarded';
export type Hair = 'short' | 'side' | 'long' | 'bun' | 'pony' | 'curly' | 'buzz' | 'bald' | 'afro' | 'bob' | 'mohawk' | 'swept';
export type Top = 'tee' | 'shirt' | 'sweater' | 'hoodie' | 'polo' | 'dress' | 'tank';
export type Jacket = 'bomber' | 'blazer' | 'coat' | 'raincoat' | 'vest' | 'denim' | 'labcoat' | 'apron' | 'tactical';

export interface Look {
  gen: Gen;
  height?: number;
  build?: number;
  female?: boolean;
  child?: boolean;
  skin?: string;
  hair?: Hair;
  hairColor?: string;
  iris?: string;
  top?: Top;
  topColor?: string;
  topAccent?: string;
  jacket?: Jacket | null;
  jacketColor?: string;
  pants?: string;
  legs?: 'pants' | 'shorts' | 'skirt' | 'cargo';
  shoes?: string;
  sole?: string;
  tie?: string;
  glasses?: string;
  beard?: 'stubble' | 'full' | 'moustache';
  hat?: 'cap' | 'beanie' | 'police' | 'hardhat';
  hatColor?: string;
  backpack?: string;
  scarf?: string;
  watch?: boolean;
  /** robot shell + light colours */
  shell?: string;
  accent?: string;
  light?: string;
  /** a forearm that can be opened to show the machine inside */
  revealable?: 'L' | 'R';
  seed?: number;
}

const BONES = [
  'root', 'hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'lids',
  'shoulderL', 'upperArmL', 'lowerArmL', 'handL',
  'shoulderR', 'upperArmR', 'lowerArmR', 'handR',
  'upperLegL', 'lowerLegL', 'footL',
  'upperLegR', 'lowerLegR', 'footR',
] as const;
export type BoneName = (typeof BONES)[number];
const BI = Object.fromEntries(BONES.map((b, i) => [b, i])) as Record<BoneName, number>;

// material groups
const MATTE = 0;
const HARD = 1;
const LIGHT = 2;
const EYEGLOW = 3;

// ---------------------------------------------------------------- shared resources
const geoCache = new Map<string, THREE.BufferGeometry>();
function rbox(w: number, h: number, d: number, r = 0.012, seg = 2): THREE.BufferGeometry {
  const rr = Math.min(r, w * 0.49, h * 0.49, d * 0.49);
  const k = `b${w.toFixed(3)},${h.toFixed(3)},${d.toFixed(3)},${rr.toFixed(3)},${seg}`;
  let g = geoCache.get(k);
  if (!g) {
    g = rr > 0.002 ? new RoundedBoxGeometry(w, h, d, seg, rr) : new THREE.BoxGeometry(w, h, d);
    geoCache.set(k, g);
  }
  return g;
}
function cylG(rt: number, rb: number, h: number, seg = 10): THREE.BufferGeometry {
  const k = `c${rt.toFixed(3)},${rb.toFixed(3)},${h.toFixed(3)},${seg}`;
  let g = geoCache.get(k);
  if (!g) {
    g = new THREE.CylinderGeometry(rt, rb, h, seg);
    geoCache.set(k, g);
  }
  return g;
}

let detailTex: THREE.Texture | null = null;
/** Subtle woven grain so blocks read as fabric/skin rather than plastic. */
function grainTexture(): THREE.Texture {
  if (detailTex) return detailTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const id = x.createImageData(128, 128);
  let s = 1234567;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let j = 0; j < 128; j++)
    for (let i = 0; i < 128; i++) {
      const weave = ((i % 4 < 2) !== (j % 4 < 2) ? 6 : -6) + (rnd() - 0.5) * 26;
      const v = 222 + weave;
      const p = (j * 128 + i) * 4;
      id.data[p] = id.data[p + 1] = id.data[p + 2] = v;
      id.data[p + 3] = 255;
    }
  x.putImageData(id, 0, 0);
  detailTex = new THREE.CanvasTexture(c);
  detailTex.wrapS = detailTex.wrapT = THREE.RepeatWrapping;
  detailTex.colorSpace = THREE.SRGBColorSpace;
  return detailTex;
}

let sharedMats: THREE.Material[] | null = null;
function materials(): THREE.Material[] {
  if (!sharedMats) {
    sharedMats = [
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.84, metalness: 0, map: grainTexture() }),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.45 }),
      new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
    ];
  }
  return sharedMats;
}

// ---------------------------------------------------------------- builder
const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const ONE = new THREE.Vector3(1, 1, 1);

interface PartOpts {
  r?: number;
  seg?: number;
  rot?: [number, number, number];
  /** colour variation across the part: top faces lighter, undersides darker */
  shade?: number;
}

class FigureBuilder {
  groups: THREE.BufferGeometry[][] = [[], [], [], []];
  bonePos: Record<BoneName, THREE.Vector3> = {} as Record<BoneName, THREE.Vector3>;

  private push(bone: BoneName, grp: number, base: THREE.BufferGeometry, color: string | THREE.Color, pos: THREE.Vector3Like, o: PartOpts = {}): void {
    const g = base.index ? base.toNonIndexed() : base.clone();
    if (o.rot) _q.setFromEuler(_e.set(o.rot[0], o.rot[1], o.rot[2]));
    else _q.identity();
    g.applyMatrix4(_m.compose(_v.set(pos.x, pos.y, pos.z), _q, ONE));
    const n = g.getAttribute('position').count;
    const nor = g.getAttribute('normal');
    const col = new Float32Array(n * 3);
    const si = new Uint16Array(n * 4);
    const sw = new Float32Array(n * 4);
    _c.set(color as THREE.ColorRepresentation);
    const shade = o.shade ?? (grp === LIGHT || grp === EYEGLOW ? 0 : 0.16);
    const boost = grp === LIGHT || grp === EYEGLOW ? 2.4 : 1;
    for (let i = 0; i < n; i++) {
      const ny = nor.getY(i);
      const k = (1 + shade * (ny > 0 ? ny * 0.6 : ny)) * boost;
      col[i * 3] = _c.r * k;
      col[i * 3 + 1] = _c.g * k;
      col[i * 3 + 2] = _c.b * k;
      si[i * 4] = BI[bone];
      sw[i * 4] = 1;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    this.groups[grp].push(g);
  }

  box(bone: BoneName, grp: number, color: string | THREE.Color, size: [number, number, number], pos: THREE.Vector3Like, o: PartOpts = {}): void {
    // small details read the same with a single bevel segment (a quarter of the triangles)
    const seg = o.seg ?? (Math.min(size[0], size[1], size[2]) < 0.07 ? 1 : 2);
    this.push(bone, grp, rbox(size[0], size[1], size[2], o.r ?? Math.min(size[0], size[1], size[2]) * 0.22, seg), color, pos, o);
  }

  cyl(bone: BoneName, grp: number, color: string | THREE.Color, r: number, h: number, pos: THREE.Vector3Like, o: PartOpts & { r2?: number; sides?: number } = {}): void {
    this.push(bone, grp, cylG(r, o.r2 ?? r, h, o.sides ?? 10), color, pos, o);
  }

  build(): THREE.BufferGeometry {
    const parts: THREE.BufferGeometry[] = [];
    const idx: number[] = [];
    this.groups.forEach((list, i) => {
      if (!list.length) return;
      const m = mergeGeometries(list, false);
      for (const g of list) g.dispose();
      if (m) {
        parts.push(m);
        idx.push(i);
      }
    });
    const geo = mergeGeometries(parts, true)!;
    for (const p of parts) p.dispose();
    geo.groups.forEach((g, i) => (g.materialIndex = idx[i]));
    geo.computeBoundingSphere();
    geo.boundingSphere!.radius *= 1.35;
    return geo;
  }
}

// ---------------------------------------------------------------- proportions
interface Prop {
  hipY: number; kneeY: number; ankleY: number; waistY: number; chestY: number; shoulderY: number; neckY: number;
  headY: number; headH: number; headW: number; headD: number;
  shX: number; hipX: number; elbowY: number; wristY: number; handL: number;
  chestW: number; chestD: number; waistW: number; pelvisW: number;
  uArm: number; lArm: number; thigh: number; shin: number; footL: number;
}

function proportions(l: Look): Prop {
  const child = !!l.child;
  const f = !!l.female;
  const H = l.height ?? (child ? 1.25 : f ? 1.69 : 1.8);
  const b = l.build ?? 1;
  const t: Prop = child
    ? { hipY: 0.6, kneeY: 0.32, ankleY: 0.062, waistY: 0.7, chestY: 0.835, shoulderY: 0.93, neckY: 0.955, headY: 0.978, headH: 0.255, headW: 0.232, headD: 0.236, shX: 0.14, hipX: 0.068, elbowY: 0.76, wristY: 0.6, handL: 0.08, chestW: 0.25, chestD: 0.16, waistW: 0.23, pelvisW: 0.245, uArm: 0.085, lArm: 0.075, thigh: 0.105, shin: 0.086, footL: 0.17 }
    : { hipY: 0.93, kneeY: 0.505, ankleY: 0.085, waistY: 1.08, chestY: 1.3, shoulderY: 1.445, neckY: 1.475, headY: 1.505, headH: 0.268, headW: 0.232, headD: 0.25, shX: f ? 0.178 : 0.2, hipX: f ? 0.098 : 0.094, elbowY: 1.172, wristY: 0.925, handL: 0.115, chestW: f ? 0.315 : 0.37, chestD: f ? 0.2 : 0.22, waistW: f ? 0.27 : 0.32, pelvisW: f ? 0.34 : 0.335, uArm: f ? 0.1 : 0.12, lArm: f ? 0.088 : 0.102, thigh: f ? 0.138 : 0.142, shin: f ? 0.108 : 0.116, footL: 0.27 };
  const s = H / (child ? 1.25 : 1.8);
  const out = {} as Prop;
  for (const k of Object.keys(t) as (keyof Prop)[]) {
    const wide = /W$|D$|X$|Arm$|thigh|shin/.test(k) && !/head/.test(k);
    out[k] = t[k] * s * (wide ? b : 1);
  }
  return out;
}

// ---------------------------------------------------------------- the figure
function shadeHex(hex: string, k: number): string {
  return '#' + _c.set(hex).multiplyScalar(k).getHexString();
}

function buildHuman(B: FigureBuilder, l: Look, P: Prop): void {
  const gen = l.gen;
  const robotSkin = gen === 'gen3';
  const skin = l.skin ?? (robotSkin ? '#d9c8b4' : '#c9946f');
  const hairC = l.hairColor ?? '#2a1d16';
  const top = l.topColor ?? '#4a6a8a';
  const pants = l.pants ?? '#2c2f3a';
  const shoes = l.shoes ?? '#24201e';
  const sole = l.sole ?? '#e8e2d6';
  const jacket = l.jacket ? l.jacketColor ?? '#3a3f2a' : null;
  const sleeveLong = l.top !== 'tee' && l.top !== 'polo' && l.top !== 'tank' || !!jacket;
  const seam = '#7d6b5c';
  const dress = l.top === 'dress';

  // ---- head
  const hy = P.headY + P.headH * 0.5;
  const hw = P.headW, hh = P.headH, hd = P.headD;
  B.box('head', MATTE, skin, [hw, hh * 0.86, hd], { x: 0, y: hy + hh * 0.05, z: 0 }, { r: 0.045 });
  // jaw / chin step
  B.box('head', MATTE, skin, [hw * 0.84, hh * 0.2, hd * 0.8], { x: 0, y: P.headY + hh * 0.12, z: hd * 0.01 }, { r: 0.035 });
  // ears
  for (const sx of [-1, 1]) {
    B.box('head', MATTE, shadeHex(skin, 0.93), [0.026, hh * 0.24, 0.05], { x: sx * (hw * 0.5 + 0.008), y: hy + 0.0, z: -0.005 }, { r: 0.01 });
  }
  // nose
  const fz = hd * 0.5;
  B.box('head', MATTE, shadeHex(skin, 1.03), [0.038, 0.062, 0.04], { x: 0, y: hy - 0.006, z: fz + 0.012 }, { r: 0.012 });
  B.box('head', MATTE, shadeHex(skin, 0.9), [0.05, 0.018, 0.026], { x: 0, y: hy - 0.036, z: fz + 0.006 }, { r: 0.008 });
  // eyes: socket shadow, white, iris, pupil, highlight
  const iris = l.iris ?? '#3b2a20';
  for (const sx of [-1, 1]) {
    const ex = sx * hw * 0.21;
    const ey = hy + hh * 0.07;
    B.box('head', MATTE, shadeHex(skin, 0.82), [0.064, 0.036, 0.01], { x: ex, y: ey + 0.002, z: fz - 0.002 }, { r: 0.006, shade: 0 });
    B.box('lids', MATTE, '#f4efe8', [0.052, 0.03, 0.012], { x: ex, y: ey, z: fz + 0.002 }, { r: 0.008, shade: 0 });
    B.box('lids', MATTE, iris, [0.026, 0.028, 0.012], { x: ex + sx * -0.004, y: ey - 0.001, z: fz + 0.006 }, { r: 0.006, shade: 0 });
    B.box('lids', MATTE, '#0b0908', [0.012, 0.016, 0.01], { x: ex + sx * -0.004, y: ey - 0.001, z: fz + 0.01 }, { r: 0.003, shade: 0 });
    B.box('lids', MATTE, '#ffffff', [0.006, 0.006, 0.004], { x: ex + sx * -0.004 + 0.007, y: ey + 0.007, z: fz + 0.0125 }, { r: 0.001 });
    // glow overlay for glitches (invisible until the eye-glow material lights up)
    B.box('lids', EYEGLOW, l.light ?? '#7ff4ff', [0.03, 0.03, 0.006], { x: ex + sx * -0.004, y: ey - 0.001, z: fz + 0.0135 }, { r: 0.004 });
    // upper lid
    B.box('head', MATTE, shadeHex(skin, 0.95), [0.058, 0.012, 0.016], { x: ex, y: ey + 0.019, z: fz + 0.004 }, { r: 0.005 });
    // brow
    B.box('head', MATTE, l.hair === 'bald' ? shadeHex(skin, 0.7) : shadeHex(hairC, 0.95), [0.064, 0.014, 0.018], { x: ex, y: ey + 0.042, z: fz + 0.004 }, { r: 0.005, rot: [0, 0, sx * -0.08] });
  }
  // mouth (on the jaw bone so it can talk)
  B.box('jaw', MATTE, '#5a2c26', [0.072, 0.016, 0.01], { x: 0, y: P.headY + hh * 0.2, z: fz + 0.003 }, { r: 0.005, shade: 0 });
  B.box('jaw', MATTE, shadeHex(skin, 0.88), [0.08, 0.01, 0.014], { x: 0, y: P.headY + hh * 0.2 - 0.014, z: fz + 0.002 }, { r: 0.004 });
  // facial hair
  if (l.beard === 'stubble') B.box('head', MATTE, shadeHex(skin, 0.72), [hw * 0.8, hh * 0.2, 0.016], { x: 0, y: P.headY + hh * 0.13, z: fz - 0.002 }, { r: 0.01, shade: 0 });
  if (l.beard === 'full') {
    B.box('head', MATTE, hairC, [hw * 0.92, hh * 0.3, hd * 0.5], { x: 0, y: P.headY + hh * 0.12, z: fz * 0.55 }, { r: 0.03 });
    B.box('jaw', MATTE, shadeHex(hairC, 1.1), [0.09, 0.02, 0.02], { x: 0, y: P.headY + hh * 0.23, z: fz + 0.008 }, { r: 0.008 });
  }
  if (l.beard === 'moustache') B.box('head', MATTE, hairC, [0.09, 0.02, 0.02], { x: 0, y: P.headY + hh * 0.26, z: fz + 0.008 }, { r: 0.008 });
  if (l.glasses) {
    for (const sx of [-1, 1]) {
      const ex = sx * hw * 0.21;
      const ey = hy + hh * 0.07;
      B.box('head', HARD, l.glasses, [0.07, 0.008, 0.008], { x: ex, y: ey + 0.026, z: fz + 0.022 }, { r: 0.002 });
      B.box('head', HARD, l.glasses, [0.07, 0.008, 0.008], { x: ex, y: ey - 0.024, z: fz + 0.022 }, { r: 0.002 });
      B.box('head', HARD, l.glasses, [0.008, 0.05, 0.008], { x: ex + sx * 0.034, y: ey, z: fz + 0.022 }, { r: 0.002 });
      B.box('head', HARD, l.glasses, [0.008, 0.008, hd * 0.6], { x: sx * hw * 0.5, y: ey + 0.02, z: fz * 0.4 }, { r: 0.002 });
    }
    B.box('head', HARD, l.glasses, [0.03, 0.008, 0.008], { x: 0, y: hy + hh * 0.08, z: fz + 0.022 }, { r: 0.002 });
  }
  if (robotSkin) {
    // mannequin seams: jaw hinge lines and a crown seam
    for (const sx of [-1, 1]) B.box('head', MATTE, seam, [0.006, hh * 0.32, 0.006], { x: sx * hw * 0.38, y: P.headY + hh * 0.2, z: fz + 0.001 }, { r: 0.002, shade: 0 });
    B.box('head', MATTE, seam, [hw * 1.01, 0.006, 0.006], { x: 0, y: P.headY + hh * 0.86, z: fz * 0.3 }, { r: 0.002, shade: 0 });
  }
  hairStyle(B, l, P, hairC);
  hatStyle(B, l, P);

  // ---- neck
  B.box('neck', MATTE, shadeHex(skin, 0.94), [hw * 0.5, 0.075, hd * 0.46], { x: 0, y: P.neckY + 0.012, z: -0.005 }, { r: 0.02 });
  if (robotSkin) B.box('neck', HARD, '#8a8f98', [hw * 0.5, 0.012, hd * 0.48], { x: 0, y: P.neckY - 0.02, z: -0.005 }, { r: 0.004 });

  // ---- torso
  const cy = (P.chestY + P.shoulderY) * 0.5 - 0.02;
  const chestH = P.shoulderY - P.waistY + 0.03;
  const topC = top;
  B.box('chest', MATTE, topC, [P.chestW, chestH * 0.62, P.chestD], { x: 0, y: cy, z: 0 }, { r: 0.04 });
  // shoulders yoke
  B.box('chest', MATTE, shadeHex(topC, 1.05), [P.chestW * 1.04, 0.07, P.chestD * 0.9], { x: 0, y: P.shoulderY - 0.035, z: -0.005 }, { r: 0.03 });
  // abdomen
  B.box('spine', MATTE, shadeHex(topC, 0.97), [P.waistW, P.chestY - P.waistY + 0.02, P.chestD * 0.92], { x: 0, y: (P.chestY + P.waistY) * 0.5 - 0.02, z: 0 }, { r: 0.035 });
  // collar / neckline per top
  const style = l.top ?? 'tee';
  if (style === 'shirt' || style === 'polo') {
    for (const sx of [-1, 1]) B.box('chest', MATTE, shadeHex(topC, 1.12), [0.07, 0.05, 0.03], { x: sx * 0.04, y: P.shoulderY - 0.005, z: P.chestD * 0.5 - 0.01 }, { r: 0.008, rot: [0.3, 0, sx * 0.5] });
    for (let i = 0; i < 4; i++) B.box(i < 2 ? 'chest' : 'spine', HARD, '#ece6da', [0.012, 0.012, 0.008], { x: 0, y: P.shoulderY - 0.06 - i * 0.075, z: (i < 2 ? P.chestD : P.chestD * 0.92) * 0.5 + 0.004 }, { r: 0.004 });
    B.box('chest', MATTE, shadeHex(topC, 0.9), [0.006, chestH * 0.55, 0.006], { x: 0.006, y: cy, z: P.chestD * 0.5 + 0.002 }, { r: 0.002, shade: 0 });
  } else if (style === 'hoodie') {
    B.box('chest', MATTE, shadeHex(topC, 0.95), [P.chestW * 0.62, 0.1, P.chestD * 0.5], { x: 0, y: P.shoulderY + 0.01, z: -P.chestD * 0.42 }, { r: 0.04 });
    B.box('spine', MATTE, shadeHex(topC, 0.9), [P.waistW * 0.62, 0.09, 0.02], { x: 0, y: P.waistY + 0.07, z: P.chestD * 0.47 }, { r: 0.01 });
    for (const sx of [-1, 1]) B.box('chest', MATTE, '#e8e2d6', [0.008, 0.1, 0.008], { x: sx * 0.03, y: P.shoulderY - 0.08, z: P.chestD * 0.5 + 0.006 }, { r: 0.003 });
  } else if (style === 'sweater') {
    B.box('chest', MATTE, shadeHex(topC, 0.85), [hw * 0.62, 0.035, P.chestD * 0.6], { x: 0, y: P.shoulderY + 0.005, z: 0 }, { r: 0.015 });
    for (let i = 0; i < 3; i++) B.box('chest', MATTE, shadeHex(topC, 1.12), [P.chestW * 1.005, 0.012, P.chestD * 1.01], { x: 0, y: cy - 0.02 + i * 0.04, z: 0 }, { r: 0.004, shade: 0.05 });
  } else {
    B.box('chest', MATTE, shadeHex(topC, 0.82), [hw * 0.55, 0.02, 0.04], { x: 0, y: P.shoulderY - 0.012, z: P.chestD * 0.4 }, { r: 0.008 });
  }
  if (l.topAccent) {
    // a graphic stripe / logo block on the chest
    B.box('chest', MATTE, l.topAccent, [P.chestW * 0.42, 0.06, 0.008], { x: 0, y: cy + 0.02, z: P.chestD * 0.5 + 0.003 }, { r: 0.004, shade: 0 });
  }
  if (l.tie) {
    B.box('chest', MATTE, l.tie, [0.032, 0.028, 0.02], { x: 0, y: P.shoulderY - 0.035, z: P.chestD * 0.5 + 0.008 }, { r: 0.006 });
    B.box('chest', MATTE, l.tie, [0.044, chestH * 0.48, 0.012], { x: 0, y: cy - 0.03, z: P.chestD * 0.5 + 0.008 }, { r: 0.006 });
  }
  // ---- jacket shell
  if (jacket) jacketShell(B, l, P, jacket, cy, chestH);
  if (l.scarf) {
    B.box('neck', MATTE, l.scarf, [hw * 0.72, 0.06, hd * 0.66], { x: 0, y: P.neckY - 0.01, z: 0.005 }, { r: 0.025 });
    B.box('chest', MATTE, shadeHex(l.scarf, 0.9), [0.06, 0.16, 0.03], { x: 0.05, y: P.shoulderY - 0.1, z: P.chestD * 0.5 + 0.03 }, { r: 0.012 });
  }
  if (l.backpack) {
    B.box('chest', MATTE, l.backpack, [P.chestW * 0.78, chestH * 0.7, 0.12], { x: 0, y: cy - 0.04, z: -P.chestD * 0.5 - 0.06 }, { r: 0.03 });
    B.box('chest', MATTE, shadeHex(l.backpack, 0.8), [P.chestW * 0.6, 0.1, 0.04], { x: 0, y: cy - 0.12, z: -P.chestD * 0.5 - 0.13 }, { r: 0.015 });
    for (const sx of [-1, 1]) B.box('chest', MATTE, shadeHex(l.backpack, 0.7), [0.035, chestH * 0.6, 0.012], { x: sx * P.chestW * 0.28, y: cy, z: P.chestD * 0.5 + 0.006 }, { r: 0.004 });
  }

  // ---- pelvis, belt
  const legs = l.legs ?? 'pants';
  const lowerC = dress ? topC : pants;
  B.box('hips', MATTE, lowerC, [P.pelvisW, 0.16, P.chestD * 0.95], { x: 0, y: P.hipY + 0.02, z: 0 }, { r: 0.035 });
  if (!dress) {
    B.box('hips', MATTE, '#1d1a18', [P.pelvisW * 1.02, 0.035, P.chestD * 0.97], { x: 0, y: P.waistY - 0.02, z: 0 }, { r: 0.01 });
    B.box('hips', HARD, '#b9a77a', [0.04, 0.03, 0.01], { x: 0, y: P.waistY - 0.02, z: P.chestD * 0.485 + 0.004 }, { r: 0.004 });
    // fly seam + pockets
    B.box('hips', MATTE, shadeHex(lowerC, 0.8), [0.006, 0.08, 0.006], { x: 0.012, y: P.hipY + 0.03, z: P.chestD * 0.475 }, { r: 0.002, shade: 0 });
    for (const sx of [-1, 1]) B.box('hips', MATTE, shadeHex(lowerC, 0.86), [0.06, 0.006, 0.006], { x: sx * P.pelvisW * 0.32, y: P.waistY - 0.06, z: P.chestD * 0.475 }, { r: 0.002, shade: 0, rot: [0, 0, sx * 0.6] });
  }
  if (legs === 'skirt' || dress) {
    // flared skirt panels ride on each thigh so stride stays clean
    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1;
      B.box(`upperLeg${side}`, MATTE, shadeHex(lowerC, 0.98), [P.pelvisW * 0.56, 0.26, P.chestD * 1.08], { x: sx * P.hipX * 1.05, y: P.hipY - 0.12, z: 0 }, { r: 0.03 });
    }
  }

  // ---- arms
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    const x = sx * P.shX;
    const sleeve = jacket && l.jacket !== 'vest' && l.jacket !== 'apron' ? jacket : topC;
    // shoulder ball
    B.box(`upperArm${side}`, MATTE, shadeHex(sleeve, 1.03), [P.uArm * 1.35, 0.11, P.uArm * 1.3], { x: x + sx * 0.012, y: P.shoulderY - 0.035, z: 0 }, { r: 0.04 });
    const ul = P.shoulderY - P.elbowY;
    const longS = sleeveLong || (jacket && l.jacket !== 'vest' && l.jacket !== 'apron');
    if (longS || l.top === 'polo' || l.top === 'tee') {
      const sleeveLen = longS ? ul : ul * 0.55;
      B.box(`upperArm${side}`, MATTE, sleeve, [P.uArm * 1.08, sleeveLen, P.uArm * 1.08], { x, y: P.shoulderY - 0.04 - sleeveLen * 0.5, z: 0 }, { r: 0.02 });
      if (!longS) {
        B.box(`upperArm${side}`, MATTE, shadeHex(sleeve, 0.85), [P.uArm * 1.14, 0.02, P.uArm * 1.14], { x, y: P.shoulderY - 0.04 - sleeveLen, z: 0 }, { r: 0.006 });
        B.box(`upperArm${side}`, MATTE, skin, [P.uArm * 0.86, ul - sleeveLen, P.uArm * 0.86], { x, y: P.elbowY + (ul - sleeveLen) * 0.5 - 0.01, z: 0 }, { r: 0.018 });
      }
    } else B.box(`upperArm${side}`, MATTE, skin, [P.uArm * 0.9, ul, P.uArm * 0.9], { x, y: (P.shoulderY + P.elbowY) * 0.5 - 0.02, z: 0 }, { r: 0.02 });
    // forearm
    const ll = P.elbowY - P.wristY;
    const rev = l.revealable === side;
    const lowerBone = `lowerArm${side}` as BoneName;
    if (!rev) {
      if (longS) {
        B.box(lowerBone, MATTE, shadeHex(sleeve, 0.98), [P.lArm * 1.1, ll * 0.86, P.lArm * 1.1], { x, y: P.elbowY - ll * 0.43, z: 0 }, { r: 0.02 });
        B.box(lowerBone, MATTE, shadeHex(sleeve, 0.8), [P.lArm * 1.18, 0.035, P.lArm * 1.18], { x, y: P.wristY + 0.035, z: 0 }, { r: 0.008 });
      } else B.box(lowerBone, MATTE, skin, [P.lArm * 0.95, ll, P.lArm * 0.95], { x, y: P.elbowY - ll * 0.5, z: 0 }, { r: 0.02 });
    }
    if (l.watch && side === 'L') B.box(lowerBone, HARD, '#c8c2b4', [P.lArm * 1.06, 0.026, P.lArm * 1.06], { x, y: P.wristY + 0.012, z: 0 }, { r: 0.006 });
    if (robotSkin) B.box(lowerBone, HARD, '#8a8f98', [P.lArm * 1.0, 0.008, P.lArm * 1.0], { x, y: P.wristY + 0.003, z: 0 }, { r: 0.002 });
    // hand: palm, finger block with knuckle groove, thumb
    const hb = `hand${side}` as BoneName;
    const hy0 = P.wristY - P.handL * 0.42;
    B.box(hb, MATTE, skin, [0.04, P.handL * 0.6, 0.085], { x: x + sx * 0.002, y: hy0, z: 0.004 }, { r: 0.014 });
    B.box(hb, MATTE, shadeHex(skin, 0.97), [0.037, P.handL * 0.44, 0.08], { x: x + sx * 0.004, y: hy0 - P.handL * 0.46, z: 0.008 }, { r: 0.013, rot: [0.25, 0, 0] });
    B.box(hb, MATTE, shadeHex(skin, 0.85), [0.039, 0.004, 0.082], { x: x + sx * 0.004, y: hy0 - P.handL * 0.26, z: 0.006 }, { r: 0.001, shade: 0 });
    B.box(hb, MATTE, skin, [0.026, P.handL * 0.45, 0.028], { x: x - sx * 0.008, y: hy0 - 0.012, z: 0.048 }, { r: 0.009, rot: [0.2, 0, sx * 0.35] });
  }

  // ---- legs
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    const x = sx * P.hipX;
    const ul = P.hipY - P.kneeY;
    const ll = P.kneeY - P.ankleY;
    const thighC = legs === 'shorts' || dress || legs === 'skirt' ? (dress || legs === 'skirt' ? skin : pants) : pants;
    B.box(`upperLeg${side}`, MATTE, thighC, [P.thigh, ul + 0.02, P.thigh * 1.06], { x, y: P.kneeY + ul * 0.5, z: 0 }, { r: 0.03 });
    if (legs === 'cargo') B.box(`upperLeg${side}`, MATTE, shadeHex(pants, 0.9), [0.03, 0.11, 0.1], { x: x + sx * P.thigh * 0.55, y: P.kneeY + ul * 0.42, z: 0 }, { r: 0.012 });
    const shinC = legs === 'pants' || legs === 'cargo' ? pants : skin;
    B.box(`lowerLeg${side}`, MATTE, shinC, [P.shin, ll, P.shin * 1.05], { x, y: P.ankleY + ll * 0.5 + 0.02, z: 0 }, { r: 0.028 });
    if (legs === 'shorts') B.box(`upperLeg${side}`, MATTE, shadeHex(pants, 0.85), [P.thigh * 1.06, 0.03, P.thigh * 1.1], { x, y: P.kneeY + ul * 0.35, z: 0 }, { r: 0.008 });
    if (legs === 'shorts') {
      // shorts end above the knee: skin below
      B.box(`upperLeg${side}`, MATTE, skin, [P.thigh * 0.84, ul * 0.36, P.thigh * 0.86], { x, y: P.kneeY + ul * 0.16, z: 0 }, { r: 0.025 });
    }
    if (legs === 'pants' || legs === 'cargo') B.box(`lowerLeg${side}`, MATTE, shadeHex(pants, 0.85), [P.shin * 1.08, 0.03, P.shin * 1.12], { x, y: P.ankleY + 0.05, z: 0 }, { r: 0.008 });
    // shoe: sole, upper, toe cap, tongue + laces, heel
    const fb = `foot${side}` as BoneName;
    const fl = P.footL;
    const fz = fl * 0.22;
    B.box(fb, MATTE, sole, [P.shin * 1.12, 0.03, fl], { x, y: 0.016, z: fz }, { r: 0.012 });
    B.box(fb, MATTE, shoes, [P.shin * 1.04, 0.07, fl * 0.92], { x, y: 0.064, z: fz - 0.004 }, { r: 0.026 });
    B.box(fb, MATTE, shadeHex(shoes, 1.18), [P.shin * 0.98, 0.05, fl * 0.3], { x, y: 0.055, z: fz + fl * 0.33 }, { r: 0.022 });
    B.box(fb, MATTE, shadeHex(shoes, 0.8), [P.shin * 0.62, 0.05, fl * 0.32], { x, y: 0.095, z: fz + fl * 0.08 }, { r: 0.012, rot: [-0.35, 0, 0] });
    for (let i = 0; i < 3; i++) B.box(fb, MATTE, '#ece6da', [P.shin * 0.5, 0.008, 0.012], { x, y: 0.1 + i * 0.012 - 0.01, z: fz + fl * 0.16 - i * 0.03 }, { r: 0.003, rot: [-0.35, 0, 0] });
    B.box(fb, MATTE, shadeHex(sole, 0.85), [P.shin * 1.06, 0.02, 0.02], { x, y: 0.038, z: fz - fl * 0.46 }, { r: 0.006 });
  }
}

function jacketShell(B: FigureBuilder, l: Look, P: Prop, jc: string, cy: number, chestH: number): void {
  const kind = l.jacket!;
  const t = 0.022;
  const w = P.chestW + t * 2;
  const d = P.chestD + t * 2;
  const open = kind !== 'bomber' && kind !== 'raincoat' && kind !== 'tactical';
  const panelW = open ? w * 0.38 : w * 0.5;
  if (kind === 'apron') {
    B.box('chest', MATTE, jc, [P.chestW * 0.72, chestH * 0.5, 0.014], { x: 0, y: cy - 0.03, z: P.chestD * 0.5 + 0.008 }, { r: 0.006 });
    B.box('hips', MATTE, jc, [P.pelvisW * 0.8, 0.36, 0.014], { x: 0, y: P.hipY - 0.06, z: P.chestD * 0.5 + 0.01 }, { r: 0.006 });
    B.box('hips', MATTE, shadeHex(jc, 0.8), [P.pelvisW * 0.5, 0.08, 0.012], { x: 0, y: P.hipY - 0.04, z: P.chestD * 0.5 + 0.018 }, { r: 0.004 });
    for (const sx of [-1, 1]) B.box('chest', MATTE, jc, [0.025, chestH * 0.5, 0.012], { x: sx * 0.07, y: P.shoulderY - 0.1, z: P.chestD * 0.5 + 0.008 }, { r: 0.004 });
    return;
  }
  // back + sides
  B.box('chest', MATTE, jc, [w, chestH * 0.66, d * 0.62], { x: 0, y: cy, z: -d * 0.19 }, { r: 0.04 });
  B.box('spine', MATTE, shadeHex(jc, 0.97), [P.waistW + t * 2, P.chestY - P.waistY + 0.06, d * 0.62], { x: 0, y: (P.chestY + P.waistY) * 0.5 - 0.03, z: -d * 0.19 }, { r: 0.035 });
  // front panels
  for (const sx of [-1, 1]) {
    B.box('chest', MATTE, jc, [panelW, chestH * 0.66, d * 0.4], { x: sx * (w * 0.5 - panelW * 0.5), y: cy, z: d * 0.3 }, { r: 0.03 });
    B.box('spine', MATTE, shadeHex(jc, 0.97), [panelW * 0.95, P.chestY - P.waistY + 0.06, d * 0.4], { x: sx * ((P.waistW + t * 2) * 0.5 - panelW * 0.475), y: (P.chestY + P.waistY) * 0.5 - 0.03, z: d * 0.3 }, { r: 0.025 });
    // pockets with flaps
    B.box('spine', MATTE, shadeHex(jc, 0.88), [panelW * 0.62, 0.012, 0.012], { x: sx * P.waistW * 0.3, y: P.waistY + 0.08, z: d * 0.5 + 0.004 }, { r: 0.004, shade: 0 });
    if (kind !== 'vest') B.box('chest', MATTE, shadeHex(jc, 0.9), [panelW * 0.55, 0.05, 0.01], { x: sx * P.chestW * 0.27, y: cy + 0.04, z: d * 0.5 + 0.004 }, { r: 0.004 });
    // lapel / collar
    if (kind === 'blazer' || kind === 'labcoat' || kind === 'coat') B.box('chest', MATTE, shadeHex(jc, 1.08), [0.05, chestH * 0.42, 0.018], { x: sx * 0.07, y: P.shoulderY - 0.1, z: d * 0.5 + 0.004 }, { r: 0.008, rot: [0, 0, sx * -0.32] });
    else B.box('chest', MATTE, shadeHex(jc, 1.08), [0.08, 0.06, 0.05], { x: sx * 0.06, y: P.shoulderY + 0.005, z: d * 0.3 }, { r: 0.015, rot: [0.2, 0, sx * 0.25] });
  }
  if (!open) {
    // zip line
    B.box('chest', HARD, '#b8b2a6', [0.008, chestH * 0.62, 0.006], { x: 0, y: cy, z: d * 0.5 + 0.003 }, { r: 0.002 });
    B.box('spine', HARD, '#b8b2a6', [0.008, P.chestY - P.waistY, 0.006], { x: 0, y: (P.chestY + P.waistY) * 0.5 - 0.03, z: d * 0.5 + 0.003 }, { r: 0.002 });
  }
  if (kind === 'bomber') {
    B.box('spine', MATTE, shadeHex(jc, 0.78), [P.waistW + t * 2.4, 0.05, d * 1.02], { x: 0, y: P.waistY + 0.0, z: 0 }, { r: 0.015 });
    B.box('chest', MATTE, shadeHex(jc, 0.78), [P.chestW * 0.55, 0.05, d * 0.7], { x: 0, y: P.shoulderY + 0.01, z: 0 }, { r: 0.02 });
  }
  if (kind === 'tactical') {
    B.box('chest', MATTE, shadeHex(jc, 0.85), [P.chestW * 0.9, chestH * 0.4, 0.05], { x: 0, y: cy + 0.01, z: d * 0.5 + 0.02 }, { r: 0.015 });
    for (let i = 0; i < 3; i++) B.box('chest', MATTE, shadeHex(jc, 0.7), [0.07, 0.07, 0.03], { x: -0.1 + i * 0.1, y: cy - 0.05, z: d * 0.5 + 0.055 }, { r: 0.01 });
    B.box('chest', LIGHT, '#ffd27a', [0.09, 0.02, 0.006], { x: 0.06, y: cy + 0.08, z: d * 0.5 + 0.047 }, { r: 0.002 });
  }
  if (kind === 'raincoat') B.box('chest', MATTE, shadeHex(jc, 0.92), [P.chestW * 0.7, 0.13, d * 0.55], { x: 0, y: P.shoulderY + 0.02, z: -d * 0.36 }, { r: 0.05 });
  // long tails ride on the thighs
  if (kind === 'coat' || kind === 'labcoat' || kind === 'raincoat') {
    const len = kind === 'labcoat' ? 0.4 : 0.48;
    for (const side of ['L', 'R'] as const) {
      const sx = side === 'L' ? 1 : -1;
      B.box(`upperLeg${side}`, MATTE, jc, [P.pelvisW * 0.56, len, d * 1.0], { x: sx * P.hipX * 1.1, y: P.hipY - len * 0.5 + 0.06, z: 0 }, { r: 0.025 });
    }
    B.box('hips', MATTE, jc, [P.pelvisW + t * 2, 0.16, d], { x: 0, y: P.hipY + 0.02, z: 0 }, { r: 0.03 });
  }
}

function hairStyle(B: FigureBuilder, l: Look, P: Prop, c: string): void {
  const style = l.hair ?? 'short';
  if (style === 'bald') return;
  const hy = P.headY + P.headH * 0.5;
  const hw = P.headW, hh = P.headH, hd = P.headD;
  const top = P.headY + hh;
  const dark = shadeHex(c, 0.82);
  const lite = shadeHex(c, 1.15);
  const cap = (th: number) => B.box('head', MATTE, c, [hw * 1.06, th, hd * 1.06], { x: 0, y: top - th * 0.35, z: -0.004 }, { r: 0.035 });
  const sides = (len: number) => {
    for (const sx of [-1, 1]) B.box('head', MATTE, dark, [0.03, len, hd * 0.9], { x: sx * hw * 0.53, y: top - len * 0.5 - 0.02, z: -0.02 }, { r: 0.012 });
  };
  const back = (len: number) => B.box('head', MATTE, dark, [hw * 1.04, len, 0.04], { x: 0, y: top - len * 0.5 - 0.02, z: -hd * 0.52 }, { r: 0.015 });
  switch (style) {
    case 'buzz':
      B.box('head', MATTE, c, [hw * 1.02, 0.03, hd * 1.02], { x: 0, y: top - 0.01, z: 0 }, { r: 0.015, shade: 0.05 });
      sides(hh * 0.4);
      back(hh * 0.5);
      break;
    case 'short':
    case 'side':
    case 'swept': {
      cap(0.07);
      sides(hh * 0.42);
      back(hh * 0.62);
      // fringe clumps (stepped, chunky)
      const n = 4;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1) - 0.5;
        const lean = style === 'side' ? 0.35 : style === 'swept' ? -0.5 : 0;
        B.box('head', MATTE, i % 2 ? lite : c, [hw * 0.27, 0.05, 0.07], { x: t * hw * 0.82, y: top - 0.035 - Math.abs(t) * 0.02, z: hd * 0.43 }, { r: 0.015, rot: [-0.45, lean * 0.4, lean * 0.3 + t * 0.2] });
      }
      // crown tufts
      for (let i = 0; i < 3; i++) B.box('head', MATTE, i % 2 ? c : lite, [hw * 0.3, 0.04, hd * 0.3], { x: (i - 1) * hw * 0.28, y: top + 0.012, z: -hd * 0.08 + (i % 2) * 0.04 }, { r: 0.014, rot: [0.1 * i, 0.3 * (i - 1), 0] });
      break;
    }
    case 'mohawk':
      sides(hh * 0.2);
      for (let i = 0; i < 5; i++) B.box('head', MATTE, i % 2 ? lite : c, [0.05, 0.09 - Math.abs(i - 2) * 0.012, 0.06], { x: 0, y: top + 0.03, z: hd * 0.36 - i * hd * 0.18 }, { r: 0.012, rot: [-0.3 + i * 0.15, 0, 0] });
      break;
    case 'curly':
    case 'afro': {
      const big = style === 'afro' ? 1.35 : 1.0;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const ring = i % 2;
        const r = hw * 0.48 * big;
        B.box('head', MATTE, ring ? c : lite, [0.075 * big, 0.075 * big, 0.075 * big], { x: Math.cos(a) * r, y: top - 0.02 + (ring ? 0.035 : -0.01) * big, z: Math.sin(a) * r * 0.95 - 0.01 }, { r: 0.03 * big, rot: [a, a * 0.5, 0] });
      }
      B.box('head', MATTE, c, [hw * 0.9 * big, 0.08 * big, hd * 0.9 * big], { x: 0, y: top + 0.01 * big, z: -0.01 }, { r: 0.035 });
      back(hh * 0.6);
      break;
    }
    case 'long':
    case 'bun':
    case 'pony':
    case 'bob': {
      cap(0.075);
      // centre part
      B.box('head', MATTE, dark, [0.008, 0.01, hd * 0.6], { x: 0.02, y: top + 0.03, z: 0.02 }, { r: 0.002, shade: 0 });
      const len = style === 'long' ? hh * 1.35 : style === 'bob' ? hh * 0.8 : hh * 0.55;
      sides(len);
      back(len);
      // front curtains
      for (const sx of [-1, 1]) B.box('head', MATTE, lite, [0.05, len * 0.62, 0.05], { x: sx * hw * 0.42, y: top - len * 0.34, z: hd * 0.38 }, { r: 0.015 });
      if (style === 'bob') {
        for (let i = 0; i < 4; i++) B.box('head', MATTE, i % 2 ? c : lite, [hw * 0.24, 0.05, 0.05], { x: (i / 3 - 0.5) * hw * 0.75, y: top - 0.04, z: hd * 0.45 }, { r: 0.014, rot: [-0.3, 0, 0] });
        B.box('head', HARD, l.topAccent ?? '#ff6f9a', [0.04, 0.016, 0.016], { x: hw * 0.36, y: top - 0.03, z: hd * 0.42 }, { r: 0.005 });
      }
      if (style === 'bun') B.box('head', MATTE, c, [0.1, 0.1, 0.1], { x: 0, y: top + 0.01, z: -hd * 0.45 }, { r: 0.045 });
      if (style === 'pony') {
        B.box('head', HARD, '#c93c5b', [0.04, 0.03, 0.03], { x: 0, y: hy + 0.03, z: -hd * 0.56 }, { r: 0.01 });
        B.box('head', MATTE, c, [0.06, 0.2, 0.06], { x: 0, y: hy - 0.07, z: -hd * 0.62 }, { r: 0.025, rot: [0.25, 0, 0] });
      }
      break;
    }
  }
}

function hatStyle(B: FigureBuilder, l: Look, P: Prop): void {
  if (!l.hat) return;
  const top = P.headY + P.headH;
  const hw = P.headW, hd = P.headD;
  const c = l.hatColor ?? '#24324a';
  if (l.hat === 'cap' || l.hat === 'police') {
    B.box('head', MATTE, c, [hw * 1.1, 0.08, hd * 1.08], { x: 0, y: top + 0.0, z: -0.004 }, { r: 0.035 });
    B.box('head', MATTE, shadeHex(c, 0.75), [hw * 0.9, 0.014, 0.1], { x: 0, y: top - 0.035, z: hd * 0.58 }, { r: 0.006 });
    if (l.hat === 'police') {
      B.box('head', MATTE, '#151a24', [hw * 1.12, 0.03, hd * 1.1], { x: 0, y: top - 0.03, z: -0.004 }, { r: 0.01 });
      B.box('head', HARD, '#d9c26a', [0.04, 0.04, 0.01], { x: 0, y: top + 0.01, z: hd * 0.55 }, { r: 0.006 });
    }
  } else if (l.hat === 'beanie') {
    B.box('head', MATTE, c, [hw * 1.08, 0.12, hd * 1.08], { x: 0, y: top - 0.01, z: -0.004 }, { r: 0.045 });
    B.box('head', MATTE, shadeHex(c, 0.8), [hw * 1.12, 0.04, hd * 1.12], { x: 0, y: top - 0.065, z: -0.004 }, { r: 0.015 });
  } else if (l.hat === 'hardhat') {
    B.box('head', HARD, c, [hw * 1.15, 0.1, hd * 1.15], { x: 0, y: top + 0.01, z: 0 }, { r: 0.045 });
    B.box('head', HARD, c, [hw * 1.3, 0.016, hd * 1.32], { x: 0, y: top - 0.035, z: 0.01 }, { r: 0.008 });
  }
}

/** Gen 2 basic humanoid / Security / Null / Discarded share a robot frame. */
function buildRobot(B: FigureBuilder, l: Look, P: Prop): void {
  const gen = l.gen;
  const shell = l.shell ?? (gen === 'security' ? '#1d2a44' : gen === 'null' ? '#9a9c9e' : gen === 'discarded' ? '#a59c8c' : '#d8d6d0');
  const accent = l.accent ?? (gen === 'security' ? '#0e1422' : gen === 'null' ? '#6e7072' : '#e0752c');
  const frame = '#3a3e45';
  const light = l.light ?? (gen === 'security' ? '#ff3b3b' : gen === 'null' ? '#d8f0ff' : '#5ff0ff');
  const rnd = mulberry(l.seed ?? 7);
  const missing = (p: number) => gen === 'discarded' && rnd() < p;
  const hy = P.headY + P.headH * 0.5;
  const hw = P.headW * 1.04, hh = P.headH, hd = P.headD * 1.02;
  const fz = hd * 0.5;

  // ---- head
  if (gen === 'null') {
    B.box('head', MATTE, shell, [hw, hh, hd], { x: 0, y: hy, z: 0 }, { r: 0.07, seg: 3 });
    // wrapped bands across the blank face
    for (let i = 0; i < 3; i++) B.box('head', MATTE, shadeHex(shell, 0.85), [hw * 1.02, 0.018, hd * 1.02], { x: 0, y: hy - 0.06 + i * 0.05, z: 0 }, { r: 0.006, rot: [0, 0, (i - 1) * 0.12] });
  } else if (gen === 'security') {
    B.box('head', HARD, shell, [hw * 1.08, hh * 1.04, hd * 1.08], { x: 0, y: hy + 0.01, z: -0.005 }, { r: 0.05 });
    B.box('head', HARD, '#05070b', [hw * 0.98, hh * 0.32, 0.04], { x: 0, y: hy + 0.02, z: fz + 0.012 }, { r: 0.015 });
    B.box('lids', LIGHT, light, [hw * 0.8, 0.022, 0.01], { x: 0, y: hy + 0.025, z: fz + 0.034 }, { r: 0.004 });
    B.box('head', HARD, accent, [0.03, hh * 0.5, hd * 0.8], { x: 0, y: hy + hh * 0.36, z: -0.02 }, { r: 0.012 });
    for (const sx of [-1, 1]) B.box('head', HARD, frame, [0.03, 0.08, 0.08], { x: sx * hw * 0.56, y: hy, z: 0 }, { r: 0.012 });
    B.box('jaw', HARD, shadeHex(shell, 0.8), [hw * 0.7, 0.06, 0.05], { x: 0, y: P.headY + 0.05, z: fz }, { r: 0.015 });
    for (let i = 0; i < 4; i++) B.box('jaw', HARD, '#05070b', [0.008, 0.035, 0.01], { x: -0.03 + i * 0.02, y: P.headY + 0.05, z: fz + 0.025 }, { r: 0.002 });
  } else {
    // gen2/discarded: rounded shell with a screen face
    B.box('head', HARD, shell, [hw, hh, hd], { x: 0, y: hy, z: 0 }, { r: 0.05 });
    if (!missing(0.4)) B.box('head', HARD, '#0a0d12', [hw * 0.82, hh * 0.56, 0.02], { x: 0, y: hy + 0.01, z: fz + 0.004 }, { r: 0.02 });
    // screen eyes
    for (const sx of [-1, 1]) {
      if (gen === 'discarded' && sx > 0 && rnd() < 0.5) continue;
      B.box('lids', LIGHT, light, [0.045, 0.028, 0.006], { x: sx * hw * 0.2, y: hy + 0.03, z: fz + 0.016 }, { r: 0.005 });
    }
    B.box('jaw', LIGHT, shadeHex(light, 0.7), [0.07, 0.008, 0.006], { x: 0, y: hy - 0.05, z: fz + 0.016 }, { r: 0.002 });
    // ear discs + antenna
    for (const sx of [-1, 1]) {
      B.cyl('head', HARD, accent, 0.04, 0.025, { x: sx * hw * 0.52, y: hy, z: 0 }, { rot: [0, 0, Math.PI / 2], sides: 12 });
      B.cyl('head', LIGHT, light, 0.015, 0.03, { x: sx * hw * 0.53, y: hy, z: 0 }, { rot: [0, 0, Math.PI / 2], sides: 8 });
    }
    B.cyl('head', HARD, frame, 0.006, 0.08, { x: hw * 0.3, y: P.headY + hh + 0.04, z: -0.03 }, {});
    B.box('head', LIGHT, accent === '#e0752c' ? '#ffb070' : light, [0.02, 0.02, 0.02], { x: hw * 0.3, y: P.headY + hh + 0.085, z: -0.03 }, { r: 0.008 });
    // panel seams + bolts
    B.box('head', HARD, frame, [hw * 1.01, 0.008, hd * 1.01], { x: 0, y: hy + hh * 0.33, z: 0 }, { r: 0.003 });
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) B.cyl('head', HARD, '#9aa0a8', 0.008, 0.008, { x: sx * hw * 0.38, y: hy + sy * hh * 0.36, z: fz + 0.002 }, { rot: [Math.PI / 2, 0, 0], sides: 6 });
  }

  // ---- neck: exposed actuator
  B.cyl('neck', HARD, frame, 0.03, 0.08, { x: 0, y: P.neckY + 0.01, z: 0 }, { sides: 10 });
  for (let i = 0; i < 3; i++) B.cyl('neck', HARD, '#6a707a', 0.04, 0.008, { x: 0, y: P.neckY - 0.01 + i * 0.022, z: 0 }, { sides: 10 });

  // ---- torso
  const cy = (P.chestY + P.shoulderY) * 0.5 - 0.02;
  const chestH = P.shoulderY - P.waistY + 0.03;
  if (gen === 'null') {
    B.box('chest', MATTE, shell, [P.chestW, chestH * 0.62, P.chestD], { x: 0, y: cy, z: 0 }, { r: 0.05 });
    for (let i = 0; i < 5; i++) B.box(i < 3 ? 'chest' : 'spine', MATTE, shadeHex(shell, 0.82), [P.chestW * 1.02, 0.02, P.chestD * 1.02], { x: 0, y: cy + 0.1 - i * 0.075, z: 0 }, { r: 0.006, rot: [0, 0, (i % 2 ? 1 : -1) * 0.15] });
  } else {
    B.box('chest', HARD, shell, [P.chestW, chestH * 0.62, P.chestD], { x: 0, y: cy, z: 0 }, { r: 0.04 });
    // chest plate + vents
    B.box('chest', HARD, shadeHex(shell, 1.08), [P.chestW * 0.78, chestH * 0.4, 0.03], { x: 0, y: cy + 0.01, z: P.chestD * 0.5 + 0.01 }, { r: 0.015 });
    for (let i = 0; i < 4; i++) B.box('chest', HARD, '#14171c', [P.chestW * 0.4, 0.008, 0.01], { x: 0, y: cy - 0.04 + i * 0.022, z: P.chestD * 0.5 + 0.026 }, { r: 0.002 });
    // core light
    if (!missing(0.5)) B.cyl('chest', LIGHT, light, 0.024, 0.01, { x: P.chestW * 0.2, y: cy + 0.06, z: P.chestD * 0.5 + 0.03 }, { rot: [Math.PI / 2, 0, 0], sides: 12 });
    // serial number blocks
    for (let i = 0; i < 4; i++) B.box('chest', HARD, accent, [0.012, 0.018, 0.004], { x: -P.chestW * 0.28 + i * 0.018, y: cy + 0.07, z: P.chestD * 0.5 + 0.026 }, { r: 0.002 });
    if (gen === 'security') {
      // pauldrons light bar + emblem
      B.box('chest', HARD, '#d7dbe2', [0.06, 0.06, 0.006], { x: -P.chestW * 0.22, y: cy + 0.06, z: P.chestD * 0.5 + 0.028 }, { r: 0.01 });
      B.box('chest', HARD, '#1d2a44', [0.03, 0.03, 0.006], { x: -P.chestW * 0.22, y: cy + 0.06, z: P.chestD * 0.5 + 0.032 }, { r: 0.006 });
      B.box('chest', LIGHT, '#ff3030', [0.05, 0.016, 0.03], { x: P.chestW * 0.3, y: P.shoulderY + 0.012, z: 0 }, { r: 0.004 });
      B.box('chest', LIGHT, '#3a6bff', [0.05, 0.016, 0.03], { x: -P.chestW * 0.3, y: P.shoulderY + 0.012, z: 0 }, { r: 0.004 });
    }
    // spine: accordion abdomen / exposed frame
    if (gen === 'discarded') {
      B.cyl('spine', HARD, frame, 0.025, P.chestY - P.waistY + 0.04, { x: 0, y: (P.chestY + P.waistY) * 0.5, z: -0.02 }, {});
      for (let i = 0; i < 3; i++) B.cyl('spine', HARD, '#c0392b', 0.006, 0.18, { x: -0.04 + i * 0.04, y: (P.chestY + P.waistY) * 0.5, z: 0.03 }, { rot: [0.2, 0, (i - 1) * 0.3] });
    } else {
      const n = 4;
      for (let i = 0; i < n; i++) B.box('spine', HARD, i % 2 ? frame : shadeHex(shell, 0.9), [P.waistW * (0.92 - (i % 2) * 0.08), (P.chestY - P.waistY) / n, P.chestD * 0.86], { x: 0, y: P.waistY + 0.03 + (i + 0.5) * ((P.chestY - P.waistY) / n), z: 0 }, { r: 0.01 });
    }
  }
  // pelvis
  B.box('hips', HARD, gen === 'null' ? shell : shadeHex(shell, 0.92), [P.pelvisW, 0.15, P.chestD * 0.95], { x: 0, y: P.hipY + 0.02, z: 0 }, { r: 0.035 });
  if (gen === 'security') {
    B.box('hips', MATTE, '#11141a', [P.pelvisW * 1.04, 0.04, P.chestD], { x: 0, y: P.waistY - 0.01, z: 0 }, { r: 0.01 });
    B.box('hips', HARD, '#2b2f36', [0.03, 0.22, 0.03], { x: P.pelvisW * 0.52, y: P.hipY - 0.04, z: 0.02 }, { r: 0.01 });
  }
  if (gen === 'gen2') for (let i = 0; i < 2; i++) B.box('hips', HARD, accent, [P.pelvisW * 0.3, 0.012, 0.006], { x: (i ? 1 : -1) * P.pelvisW * 0.25, y: P.hipY + 0.06, z: P.chestD * 0.48 }, { r: 0.003 });

  // ---- limbs with joint rings and pistons
  const jointRing = (bone: BoneName, x: number, y: number, r: number) => {
    B.cyl(bone, HARD, frame, r, r * 0.9, { x, y, z: 0 }, { rot: [0, 0, Math.PI / 2], sides: 12 });
    if (gen !== 'null') B.cyl(bone, LIGHT, light, r * 0.55, r * 0.95, { x, y, z: 0 }, { rot: [0, 0, Math.PI / 2], sides: 12 });
  };
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    const x = sx * P.shX;
    const sh = gen === 'null' ? 'MATTE' : 'HARD';
    const grp = sh === 'MATTE' ? MATTE : HARD;
    B.box(`upperArm${side}`, grp, shell, [P.uArm * 1.5, 0.12, P.uArm * 1.45], { x: x + sx * 0.015, y: P.shoulderY - 0.035, z: 0 }, { r: 0.04 });
    if (gen === 'security') B.box(`upperArm${side}`, HARD, shadeHex(shell, 1.2), [P.uArm * 1.7, 0.05, P.uArm * 1.6], { x: x + sx * 0.02, y: P.shoulderY + 0.01, z: 0 }, { r: 0.02 });
    jointRing(`upperArm${side}`, x, P.shoulderY - 0.04, 0.035);
    const ul = P.shoulderY - P.elbowY;
    if (!missing(0.25)) B.box(`upperArm${side}`, grp, shadeHex(shell, 0.96), [P.uArm, ul * 0.75, P.uArm], { x, y: (P.shoulderY + P.elbowY) * 0.5 - 0.02, z: 0 }, { r: 0.02 });
    else B.cyl(`upperArm${side}`, HARD, frame, 0.015, ul, { x, y: (P.shoulderY + P.elbowY) * 0.5, z: 0 }, {});
    jointRing(`lowerArm${side}`, x, P.elbowY, 0.032);
    const ll = P.elbowY - P.wristY;
    B.box(`lowerArm${side}`, grp, shell, [P.lArm * 1.05, ll * 0.8, P.lArm * 1.05], { x, y: P.elbowY - ll * 0.5, z: 0 }, { r: 0.02 });
    if (gen !== 'null') B.cyl(`lowerArm${side}`, HARD, '#b9bec6', 0.008, ll * 0.7, { x: x + sx * P.lArm * 0.55, y: P.elbowY - ll * 0.5, z: -0.01 }, {});
    if (gen === 'security') B.box(`lowerArm${side}`, HARD, shadeHex(shell, 1.2), [P.lArm * 1.25, ll * 0.5, P.lArm * 1.25], { x, y: P.elbowY - ll * 0.55, z: 0 }, { r: 0.02 });
    // hand: three-finger claw for older units, mitten for security
    const hb = `hand${side}` as BoneName;
    const hy0 = P.wristY - P.handL * 0.4;
    B.box(hb, HARD, frame, [0.032, P.handL * 0.55, 0.07], { x, y: hy0, z: 0.004 }, { r: 0.01 });
    for (let i = 0; i < 3; i++) B.box(hb, HARD, gen === 'security' ? '#11141a' : '#6a707a', [0.02, P.handL * 0.5, 0.018], { x, y: hy0 - P.handL * 0.48, z: -0.02 + i * 0.024 }, { r: 0.006, rot: [0.15, 0, 0] });
    B.box(hb, HARD, '#6a707a', [0.018, P.handL * 0.4, 0.02], { x: x - sx * 0.01, y: hy0 - 0.01, z: 0.045 }, { r: 0.006, rot: [0.2, 0, sx * 0.4] });
  }
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    const x = sx * P.hipX;
    const ul = P.hipY - P.kneeY;
    const ll = P.kneeY - P.ankleY;
    const grp = gen === 'null' ? MATTE : HARD;
    jointRing(`upperLeg${side}`, x, P.hipY - 0.02, 0.04);
    if (!missing(0.2)) B.box(`upperLeg${side}`, grp, shell, [P.thigh * 1.05, ul * 0.78, P.thigh * 1.08], { x, y: P.kneeY + ul * 0.5, z: 0 }, { r: 0.03 });
    else B.cyl(`upperLeg${side}`, HARD, frame, 0.02, ul, { x, y: P.kneeY + ul * 0.5, z: 0 }, {});
    jointRing(`lowerLeg${side}`, x, P.kneeY, 0.038);
    if (gen === 'security') B.box(`lowerLeg${side}`, HARD, shadeHex(shell, 1.25), [P.shin * 1.15, 0.12, 0.04], { x, y: P.kneeY - 0.04, z: P.shin * 0.55 }, { r: 0.012 });
    B.box(`lowerLeg${side}`, grp, shadeHex(shell, 0.95), [P.shin * 1.02, ll * 0.8, P.shin * 1.05], { x, y: P.ankleY + ll * 0.5, z: 0 }, { r: 0.028 });
    if (gen !== 'null') B.cyl(`lowerLeg${side}`, HARD, '#b9bec6', 0.01, ll * 0.6, { x, y: P.ankleY + ll * 0.5, z: -P.shin * 0.6 }, {});
    const fb = `foot${side}` as BoneName;
    B.box(fb, HARD, gen === 'security' ? '#0c0f14' : frame, [P.shin * 1.15, 0.08, P.footL], { x, y: 0.042, z: P.footL * 0.2 }, { r: 0.02 });
    B.box(fb, HARD, accent, [P.shin * 1.1, 0.02, 0.05], { x, y: 0.07, z: P.footL * 0.62 }, { r: 0.008 });
  }
}

/** Gen 1: an industrial maintenance machine on treads. */
function buildGen1(B: FigureBuilder, l: Look): void {
  const body = l.shell ?? '#e0a526';
  const dark = '#22252b';
  const light = l.light ?? '#ffb347';
  // treads
  for (const sx of [-1, 1]) {
    B.box('hips', HARD, dark, [0.22, 0.32, 1.0], { x: sx * 0.42, y: 0.16, z: 0 }, { r: 0.08 });
    for (let i = 0; i < 4; i++) B.cyl('hips', HARD, '#4a4e56', 0.1, 0.24, { x: sx * 0.42, y: 0.16, z: -0.33 + i * 0.22 }, { rot: [0, 0, Math.PI / 2], sides: 12 });
    for (let i = 0; i < 9; i++) B.box('hips', HARD, '#15171b', [0.24, 0.025, 0.05], { x: sx * 0.42, y: 0.325, z: -0.44 + i * 0.11 }, { r: 0.005 });
  }
  // chassis with hazard stripes
  B.box('spine', HARD, body, [0.72, 0.42, 0.9], { x: 0, y: 0.56, z: 0 }, { r: 0.06 });
  for (let i = 0; i < 6; i++) B.box('spine', HARD, i % 2 ? '#15171b' : body, [0.12, 0.08, 0.012], { x: -0.3 + i * 0.12, y: 0.4, z: 0.456 }, { r: 0.004, rot: [0, 0, 0.6] });
  B.box('spine', HARD, '#15171b', [0.5, 0.1, 0.02], { x: 0, y: 0.66, z: 0.455 }, { r: 0.01 });
  for (let i = 0; i < 5; i++) B.box('spine', HARD, '#30343b', [0.08, 0.012, 0.02], { x: -0.16 + i * 0.08, y: 0.66, z: 0.462 }, { r: 0.003 });
  // upper body (chest bone so it can turn)
  B.box('chest', HARD, body, [0.6, 0.5, 0.56], { x: 0, y: 1.02, z: -0.05 }, { r: 0.07 });
  B.box('chest', HARD, shadeHex(body, 0.85), [0.62, 0.06, 0.58], { x: 0, y: 1.2, z: -0.05 }, { r: 0.02 });
  B.box('chest', HARD, dark, [0.2, 0.2, 0.06], { x: 0.15, y: 0.98, z: 0.23 }, { r: 0.02 });
  B.box('chest', LIGHT, '#9cff7a', [0.05, 0.02, 0.01], { x: 0.15, y: 1.03, z: 0.265 }, { r: 0.003 });
  B.box('chest', LIGHT, '#ff5a3a', [0.05, 0.02, 0.01], { x: 0.15, y: 0.99, z: 0.265 }, { r: 0.003 });
  // head: camera turret with lens
  B.box('head', HARD, '#2d3138', [0.34, 0.2, 0.3], { x: 0, y: 1.4, z: 0.02 }, { r: 0.05 });
  B.cyl('head', HARD, '#15171b', 0.085, 0.08, { x: 0, y: 1.4, z: 0.2 }, { rot: [Math.PI / 2, 0, 0], sides: 16 });
  B.cyl('lids', LIGHT, light, 0.05, 0.02, { x: 0, y: 1.4, z: 0.245 }, { rot: [Math.PI / 2, 0, 0], sides: 16 });
  B.cyl('head', LIGHT, '#ff7a2a', 0.035, 0.06, { x: -0.12, y: 1.53, z: -0.05 }, { sides: 10 });
  // arms with claws
  for (const side of ['L', 'R'] as const) {
    const sx = side === 'L' ? 1 : -1;
    B.box(`upperArm${side}`, HARD, '#3a3e45', [0.14, 0.14, 0.14], { x: sx * 0.37, y: 1.1, z: 0 }, { r: 0.03 });
    B.box(`upperArm${side}`, HARD, body, [0.12, 0.42, 0.12], { x: sx * 0.4, y: 0.86, z: 0 }, { r: 0.025 });
    B.cyl(`upperArm${side}`, HARD, '#b9bec6', 0.015, 0.36, { x: sx * 0.47, y: 0.86, z: -0.04 }, {});
    B.box(`lowerArm${side}`, HARD, '#3a3e45', [0.1, 0.36, 0.1], { x: sx * 0.4, y: 0.5, z: 0 }, { r: 0.02 });
    for (const dz of [-1, 1]) B.box(`hand${side}`, HARD, '#15171b', [0.04, 0.16, 0.04], { x: sx * 0.4, y: 0.25, z: dz * 0.04 }, { r: 0.01, rot: [dz * 0.3, 0, 0] });
  }
}

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- attachments
const attachCache = new Map<string, THREE.Object3D>();
function attachment(kind: string, color = '#c23a3a'): THREE.Object3D {
  const k = kind + color;
  let o = attachCache.get(k);
  if (!o) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1c1c1f', roughness: 0.5, metalness: 0.4 });
    if (kind === 'umbrella') {
      const canopy = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.26, 8, 1, true), new THREE.MeshStandardMaterial({ color, roughness: 0.45, side: THREE.DoubleSide }));
      canopy.position.y = 0.86;
      g.add(canopy);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 6), dark);
      shaft.position.y = 0.44;
      g.add(shaft);
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.012, 0.06, 6), dark);
      tip.position.y = 1.0;
      g.add(tip);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.008, 6, 10, Math.PI), dark);
      handle.position.set(0.03, 0, 0);
      handle.rotation.z = Math.PI;
      g.add(handle);
    } else if (kind === 'phone') {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.15, 0.012), dark);
      g.add(m);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.066, 0.13), new THREE.MeshBasicMaterial({ color: '#8fd3ff' }));
      scr.position.z = 0.007;
      g.add(scr);
    } else if (kind === 'bag') {
      const m = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.32, 0.14, 2, 0.02), mat);
      m.position.y = -0.2;
      g.add(m);
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 6, 10, Math.PI), dark);
      h.position.y = -0.03;
      g.add(h);
    } else if (kind === 'coffee') {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.11, 10), new THREE.MeshStandardMaterial({ color: '#f1ece4', roughness: 0.7 }));
      g.add(m);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.037, 0.037, 0.015, 10), dark);
      lid.position.y = 0.06;
      g.add(lid);
      const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.034, 0.04, 10), mat);
      g.add(sl);
    } else if (kind === 'briefcase') {
      const m = new THREE.Mesh(new RoundedBoxGeometry(0.4, 0.3, 0.1, 2, 0.015), new THREE.MeshStandardMaterial({ color: '#3a2618', roughness: 0.55 }));
      m.position.y = -0.2;
      g.add(m);
    } else if (kind === 'baton') {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 8), dark);
      m.rotation.x = Math.PI / 2;
      m.position.z = 0.2;
      g.add(m);
    } else if (kind === 'clipboard') {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.01), new THREE.MeshStandardMaterial({ color: '#8a6a44', roughness: 0.8 }));
      g.add(m);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.26), new THREE.MeshStandardMaterial({ color: '#f4f1ea' }));
      p.position.z = 0.006;
      g.add(p);
    }
    g.traverse((m) => ((m as THREE.Mesh).castShadow = true));
    attachCache.set(k, g);
    o = g;
  }
  return o.clone();
}

/** The machine inside an artificial forearm, revealed by damage. */
function mechForearm(P: Prop, x: number, sleeve: string | null, skin: string): { closed: THREE.Group; open: THREE.Group } {
  const ll = P.elbowY - P.wristY;
  const y = P.elbowY - ll * 0.5;
  const skinM = new THREE.MeshStandardMaterial({ color: sleeve ?? skin, roughness: 0.84, map: grainTexture() });
  const closed = new THREE.Group();
  const shell = new THREE.Mesh(rbox(P.lArm * 1.05, ll, P.lArm * 1.05, 0.02), skinM);
  shell.position.set(x, y, 0);
  closed.add(shell);
  const open = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#9aa2ad', roughness: 0.28, metalness: 0.9 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2a2e35', roughness: 0.5, metalness: 0.6 });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color('#5ff0ff').multiplyScalar(2.5), toneMapped: false });
  for (const dx of [-0.018, 0.018]) {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, ll * 0.95, 8), metal);
    rod.position.set(x + dx, y, -0.005);
    open.add(rod);
  }
  const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, ll * 0.5, 10), dark);
  piston.position.set(x, y + ll * 0.1, 0.018);
  open.add(piston);
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.02, ll * 0.4, 0.01), glow);
  core.position.set(x, y, 0.03);
  open.add(core);
  const cableM = new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.6 });
  for (let i = 0; i < 3; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, ll * 0.9, 5), i === 1 ? new THREE.MeshStandardMaterial({ color: '#2b6cb0' }) : cableM);
    c.position.set(x - 0.025 + i * 0.012, y, 0.02);
    c.rotation.z = (i - 1) * 0.08;
    open.add(c);
  }
  // torn shell: back half and two curled flaps
  const back = new THREE.Mesh(rbox(P.lArm * 1.05, ll, P.lArm * 0.5, 0.015), skinM);
  back.position.set(x, y, -P.lArm * 0.3);
  open.add(back);
  for (const sx of [-1, 1]) {
    const flap = new THREE.Mesh(rbox(0.012, ll * 0.8, P.lArm * 0.5, 0.004), skinM);
    flap.position.set(x + sx * P.lArm * 0.6, y, 0.02);
    flap.rotation.y = sx * 0.6;
    open.add(flap);
  }
  const pl = new THREE.PointLight('#5ff0ff', 0.6, 0.6, 2);
  pl.position.set(x, y, 0.08);
  open.add(pl);
  open.visible = false;
  open.traverse((m) => ((m as THREE.Mesh).castShadow = true));
  closed.traverse((m) => ((m as THREE.Mesh).castShadow = true));
  return { closed, open };
}

// ---------------------------------------------------------------- the character
export type Mode = 'idle' | 'sit' | 'kneel' | 'stiff' | 'cower' | 'dead' | 'lean';
type Gesture = 'wave' | 'point' | 'shrug' | 'talkhands' | 'clutch' | 'phone' | 'handshake' | 'flinch' | 'nod' | 'reach' | 'hug' | 'armsUp' | 'swing' | 'aim' | 'umbrella' | 'carry' | 'eat' | 'lookWatch' | 'hands_hips' | 'stagger';

const geoBuildCache = new Map<string, { geo: THREE.BufferGeometry; P: Prop }>();

export class Blocky {
  readonly root = new THREE.Group();
  readonly mesh: THREE.SkinnedMesh;
  readonly bones = {} as Record<BoneName, THREE.Bone>;
  readonly P: Prop;
  readonly isGen1: boolean;
  /** world-space velocity magnitude, set by the controller (m/s) */
  speed = 0;
  /** turning rate (rad/s), for lean */
  turn = 0;
  mode: Mode = 'idle';
  talking = 0;
  lookTarget: THREE.Vector3 | null = null;
  glow = 0;
  private eyeMat: THREE.MeshBasicMaterial;
  private phase = Math.random() * 10;
  private t = Math.random() * 10;
  private blinkT = 2 + Math.random() * 3;
  private blink = 0;
  private headYaw = 0;
  private headPitch = 0;
  private gestureName: Gesture | null = null;
  private gestureT = 0;
  private gestureDur = 0;
  private gestureHold = false;
  private gestureW = 0;
  private hold: Gesture | null = null;
  private holdW = 0;
  private modeW: Record<Mode, number> = { idle: 1, sit: 0, kneel: 0, stiff: 0, cower: 0, dead: 0, lean: 0 };
  private glitchT = 0;
  private reveal: { closed: THREE.Group; open: THREE.Group } | null = null;
  private attachments: THREE.Object3D[] = [];
  private restHips: number;

  constructor(readonly look: Look) {
    this.isGen1 = false;
    const key = JSON.stringify(look);
    let cached = geoBuildCache.get(key);
    const P = proportions(look);
    this.P = P;
    if (!cached) {
      const B = new FigureBuilder();
      if (look.gen === 'gen2' || look.gen === 'security' || look.gen === 'null' || look.gen === 'discarded') buildRobot(B, look, P);
      else buildHuman(B, look, P);
      cached = { geo: B.build(), P };
      geoBuildCache.set(key, cached);
    }
    const geo = cached.geo;
    this.eyeMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const mats = materials();
    this.mesh = new THREE.SkinnedMesh(geo, [mats[0], mats[1], mats[2], this.eyeMat]);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = true;
    // skeleton in bind pose
    const pos = bindPositions(P);
    const parent: Partial<Record<BoneName, BoneName>> = {
      hips: 'root', spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', jaw: 'head', lids: 'head',
      shoulderL: 'chest', upperArmL: 'shoulderL', lowerArmL: 'upperArmL', handL: 'lowerArmL',
      shoulderR: 'chest', upperArmR: 'shoulderR', lowerArmR: 'upperArmR', handR: 'lowerArmR',
      upperLegL: 'hips', lowerLegL: 'upperLegL', footL: 'lowerLegL',
      upperLegR: 'hips', lowerLegR: 'upperLegR', footR: 'lowerLegR',
    };
    const list: THREE.Bone[] = [];
    for (const n of BONES) {
      const b = new THREE.Bone();
      b.name = n;
      this.bones[n] = b;
      list.push(b);
    }
    for (const n of BONES) {
      const b = this.bones[n];
      const p = parent[n];
      const wp = pos[n];
      if (p) {
        b.position.copy(wp).sub(pos[p]);
        this.bones[p].add(b);
      } else b.position.copy(wp);
    }
    this.mesh.add(this.bones.root);
    this.mesh.bind(new THREE.Skeleton(list));
    this.root.add(this.mesh);
    this.restHips = this.bones.hips.position.y;
    if (look.revealable) {
      const side = look.revealable;
      const sx = side === 'L' ? 1 : -1;
      const sleeve = look.jacket && look.jacket !== 'vest' && look.jacket !== 'apron' ? look.jacketColor ?? null : look.top === 'tee' || look.top === 'polo' || look.top === 'tank' ? null : look.topColor ?? null;
      const r = mechForearm(P, sx * P.shX, sleeve, look.skin ?? '#c9946f');
      // attachments live in bind space relative to the forearm bone
      const bonePos = pos[`lowerArm${side}`];
      for (const g of [r.closed, r.open]) {
        g.position.set(-bonePos.x, -bonePos.y, -bonePos.z);
        this.bones[`lowerArm${side}`].add(g);
      }
      this.reveal = r;
    }
  }

  /** Attach a prop to a hand bone (or head). */
  attach(kind: 'umbrella' | 'phone' | 'bag' | 'coffee' | 'briefcase' | 'baton' | 'clipboard', side: 'L' | 'R' = 'R', color?: string): THREE.Object3D {
    const o = attachment(kind, color);
    const hand = this.bones[`hand${side}`];
    const P = this.P;
    o.position.set(0, -P.handL * 0.55, 0.02);
    if (kind === 'phone') o.rotation.set(-0.3, 0, 0);
    if (kind === 'coffee') o.position.set(0, -P.handL * 0.6, 0.05);
    hand.add(o);
    this.attachments.push(o);
    if (kind === 'umbrella') this.setHold('umbrella');
    if (kind === 'phone') this.setHold('phone');
    if (kind === 'coffee') this.setHold('carry');
    return o;
  }

  /** A held arm pose that persists under locomotion (umbrella, phone, carrying). */
  setHold(g: Gesture | null): void {
    this.hold = g;
  }

  gesture(g: Gesture, dur = 1.6, hold = false): void {
    this.gestureName = g;
    this.gestureT = 0;
    this.gestureDur = dur;
    this.gestureHold = hold;
  }

  stopGesture(): void {
    this.gestureHold = false;
    this.gestureT = this.gestureDur;
  }

  /** Eyes flicker with CIVIC light for a moment. */
  glitch(sec = 0.6): void {
    this.glitchT = sec;
  }

  openArm(): void {
    if (!this.reveal) return;
    this.reveal.closed.visible = false;
    this.reveal.open.visible = true;
  }

  get head(): THREE.Vector3 {
    return this.bones.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, this.P.headH * 0.55, 0));
  }

  bonePos(n: BoneName, out = new THREE.Vector3()): THREE.Vector3 {
    return this.bones[n].getWorldPosition(out);
  }

  update(dt: number): void {
    this.t += dt;
    const B = this.bones;
    const sp = this.speed;
    // mode weights
    for (const k of Object.keys(this.modeW) as Mode[]) this.modeW[k] = damp(this.modeW[k], this.mode === k ? 1 : 0, 6, dt);
    const idleW = this.modeW.idle;
    const loco = clamp(sp / 1.4, 0, 1) * idleW;
    const run = clamp((sp - 2.2) / 2.0, 0, 1) * idleW;
    const stride = 1.25 + run * 0.9;
    this.phase += (sp / stride) * Math.PI * 2 * dt;
    const ph = this.phase;
    const s = Math.sin(ph);
    const c = Math.cos(ph);
    const stiff = this.modeW.stiff;
    const A = loco * (0.42 + run * 0.32) * (1 - stiff * 0.5);

    // reset
    for (const n of BONES) B[n].rotation.set(0, 0, 0);
    B.jaw.scale.set(1, 1, 1);

    // ---- locomotion + idle
    const breathe = Math.sin(this.t * 1.7) * 0.012;
    B.hips.position.y = this.restHips - Math.abs(c) * 0.0 + (Math.abs(s) * 0.035 - 0.022) * loco - run * 0.04;
    B.hips.position.x = Math.sin(this.t * 0.6) * 0.012 * (1 - loco);
    B.hips.rotation.y = s * 0.1 * loco;
    B.hips.rotation.z = Math.sin(this.t * 0.6) * 0.02 * (1 - loco) + c * 0.025 * loco;
    B.spine.rotation.x = run * 0.22 + loco * 0.04;
    B.chest.rotation.y = -s * 0.14 * loco;
    B.chest.rotation.x = breathe;
    B.upperLegL.rotation.x = -s * A;
    B.upperLegR.rotation.x = s * A;
    const kneeA = loco * (0.75 + run * 0.6);
    B.lowerLegL.rotation.x = Math.max(0, Math.sin(ph + 1.25)) * kneeA + 0.04 * loco;
    B.lowerLegR.rotation.x = Math.max(0, Math.sin(ph + 1.25 + Math.PI)) * kneeA + 0.04 * loco;
    // keep the sole flat on contact, toe-off on push
    B.footL.rotation.x = -(B.upperLegL.rotation.x + B.lowerLegL.rotation.x) * 0.85;
    B.footR.rotation.x = -(B.upperLegR.rotation.x + B.lowerLegR.rotation.x) * 0.85;
    const armA = loco * (0.36 + run * 0.4);
    B.upperArmL.rotation.x = s * armA;
    B.upperArmR.rotation.x = -s * armA;
    B.upperArmL.rotation.z = 0.07 + Math.sin(this.t * 1.7) * 0.01;
    B.upperArmR.rotation.z = -0.07 - Math.sin(this.t * 1.7) * 0.01;
    B.lowerArmL.rotation.x = -0.18 - loco * 0.12 - run * 1.05 - Math.max(0, -s) * 0.15 * loco;
    B.lowerArmR.rotation.x = -0.18 - loco * 0.12 - run * 1.05 - Math.max(0, s) * 0.15 * loco;
    B.handL.rotation.x = -0.1;
    B.handR.rotation.x = -0.1;
    B.neck.rotation.x = -run * 0.15;
    // lean into turns
    B.spine.rotation.z = clamp(-this.turn * 0.05, -0.12, 0.12) * loco;

    // ---- held poses
    this.holdW = damp(this.holdW, this.hold ? 1 : 0, 6, dt);
    if (this.hold && this.holdW > 0.001) this.applyGesture(this.hold, 1, this.holdW, true);

    // ---- modes
    const sit = this.modeW.sit;
    if (sit > 0.001) {
      B.hips.position.y = THREE.MathUtils.lerp(B.hips.position.y, this.restHips - (this.P.hipY - this.P.kneeY) * 0.98 + 0.02, sit);
      B.upperLegL.rotation.x += -1.5 * sit;
      B.upperLegR.rotation.x += -1.5 * sit;
      B.lowerLegL.rotation.x += 1.5 * sit;
      B.lowerLegR.rotation.x += 1.5 * sit;
      B.footL.rotation.x = 0;
      B.footR.rotation.x = 0;
      B.upperArmL.rotation.x += -0.5 * sit;
      B.upperArmR.rotation.x += -0.5 * sit;
      B.lowerArmL.rotation.x += -0.6 * sit;
      B.lowerArmR.rotation.x += -0.6 * sit;
    }
    const kneel = this.modeW.kneel;
    if (kneel > 0.001) {
      B.hips.position.y = THREE.MathUtils.lerp(B.hips.position.y, this.restHips - 0.42, kneel);
      B.upperLegL.rotation.x += -1.45 * kneel;
      B.lowerLegL.rotation.x += 1.5 * kneel;
      B.upperLegR.rotation.x += 0.05 * kneel;
      B.lowerLegR.rotation.x += 1.55 * kneel;
      B.footR.rotation.x = -0.6 * kneel;
      B.footL.rotation.x = 0;
      B.spine.rotation.x += 0.35 * kneel;
    }
    const cower = this.modeW.cower;
    if (cower > 0.001) {
      B.hips.position.y = THREE.MathUtils.lerp(B.hips.position.y, this.restHips - 0.3, cower);
      B.upperLegL.rotation.x += -1.1 * cower;
      B.upperLegR.rotation.x += -1.1 * cower;
      B.lowerLegL.rotation.x += 1.6 * cower;
      B.lowerLegR.rotation.x += 1.6 * cower;
      B.footL.rotation.x = -0.5 * cower;
      B.footR.rotation.x = -0.5 * cower;
      B.spine.rotation.x += 0.5 * cower;
      B.upperArmL.rotation.x += -1.9 * cower;
      B.upperArmR.rotation.x += -1.9 * cower;
      B.lowerArmL.rotation.x += -1.6 * cower;
      B.lowerArmR.rotation.x += -1.6 * cower;
      B.neck.rotation.x += 0.4 * cower;
      B.head.rotation.y += Math.sin(this.t * 13) * 0.03 * cower;
    }
    const dead = this.modeW.dead;
    if (dead > 0.001) {
      B.root.rotation.x = -Math.PI / 2 * dead;
      B.root.position.y = 0.12 * dead;
      B.upperArmL.rotation.z += 0.8 * dead;
      B.upperArmR.rotation.z -= 0.8 * dead;
    } else {
      B.root.rotation.x = 0;
      B.root.position.y = 0;
    }
    const lean = this.modeW.lean;
    if (lean > 0.001) {
      B.hips.rotation.z += 0.08 * lean;
      B.upperLegR.rotation.z -= 0.12 * lean;
      B.upperArmL.rotation.x += -0.4 * lean;
      B.lowerArmL.rotation.x += -1.2 * lean;
      B.upperArmR.rotation.x += -0.4 * lean;
      B.lowerArmR.rotation.x += -1.2 * lean;
      B.upperArmL.rotation.z += -0.4 * lean;
      B.upperArmR.rotation.z += 0.4 * lean;
    }
    if (stiff > 0.001) {
      // early units: rigid, slightly mechanical twitch
      B.head.rotation.y += Math.round(Math.sin(this.t * 0.7) * 3) * 0.12 * stiff;
      B.upperArmL.rotation.z = THREE.MathUtils.lerp(B.upperArmL.rotation.z, 0.02, stiff);
      B.upperArmR.rotation.z = THREE.MathUtils.lerp(B.upperArmR.rotation.z, -0.02, stiff);
    }

    // ---- one-shot gesture
    if (this.gestureName) {
      this.gestureT += dt;
      const fin = !this.gestureHold && this.gestureT >= this.gestureDur;
      this.gestureW = damp(this.gestureW, fin ? 0 : 1, 9, dt);
      if (fin && this.gestureW < 0.01) this.gestureName = null;
      else this.applyGesture(this.gestureName, this.gestureT, this.gestureW, false);
    }

    // ---- head look
    let ty = 0;
    let tp = 0;
    if (this.lookTarget && dead < 0.5) {
      const hp = this.head;
      const d = this.lookTarget.clone().sub(hp);
      const inv = this.root.getWorldQuaternion(new THREE.Quaternion()).invert();
      d.applyQuaternion(inv);
      ty = clamp(Math.atan2(d.x, d.z), -1.1, 1.1);
      tp = clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.5, 0.45);
    }
    this.headYaw = damp(this.headYaw, ty, 5, dt);
    this.headPitch = damp(this.headPitch, tp, 5, dt);
    B.neck.rotation.y += this.headYaw * 0.4;
    B.head.rotation.y += this.headYaw * 0.6;
    B.neck.rotation.x += this.headPitch * 0.4;
    B.head.rotation.x += this.headPitch * 0.6;
    B.chest.rotation.y += this.headYaw * 0.15;
    // micro head motion
    B.head.rotation.z += Math.sin(this.t * 0.9) * 0.015;

    // ---- face: blink, talk, eye glow
    this.blinkT -= dt;
    if (this.blinkT < 0) {
      this.blink = 0.14;
      this.blinkT = 2 + Math.random() * 4;
    }
    this.blink = Math.max(0, this.blink - dt);
    const bl = this.blink > 0 ? 0.12 : 1;
    B.lids.scale.set(1, damp(B.lids.scale.y, bl, 40, dt), 1);
    if (this.talking > 0) {
      const v = Math.abs(Math.sin(this.t * 13) * Math.sin(this.t * 7.3 + 1));
      B.jaw.scale.y = 1 + v * 2.6 * this.talking;
      B.head.rotation.x += Math.sin(this.t * 4.1) * 0.03 * this.talking;
      B.head.rotation.y += Math.sin(this.t * 2.3) * 0.04 * this.talking;
    }
    this.glitchT = Math.max(0, this.glitchT - dt);
    const g = this.glitchT > 0 ? (Math.sin(this.t * 70) > 0 ? 1 : 0.15) : 0;
    this.eyeMat.opacity = Math.max(this.glow, g);
    this.eyeMat.visible = this.eyeMat.opacity > 0.01;
    if (g > 0) B.head.rotation.y += (Math.random() - 0.5) * 0.05;
  }

  private applyGesture(gname: Gesture, t: number, w: number, held: boolean): void {
    const B = this.bones;
    const L = (b: THREE.Bone, x: number, y: number, z: number) => {
      b.rotation.x = THREE.MathUtils.lerp(b.rotation.x, x, w);
      b.rotation.y = THREE.MathUtils.lerp(b.rotation.y, y, w);
      b.rotation.z = THREE.MathUtils.lerp(b.rotation.z, z, w);
    };
    const osc = (f: number, a: number) => Math.sin(t * f) * a;
    switch (gname) {
      case 'wave':
        L(B.upperArmR, -0.4, 0, -2.5);
        L(B.lowerArmR, 0, 0, osc(9, 0.45) - 0.3);
        L(B.handR, 0, 0, 0);
        break;
      case 'point':
        L(B.upperArmR, -1.45, 0.2, -0.1);
        L(B.lowerArmR, -0.1, 0, 0);
        break;
      case 'shrug':
        L(B.upperArmL, -0.3, 0, 0.35);
        L(B.upperArmR, -0.3, 0, -0.35);
        L(B.lowerArmL, -1.2, 0.6, 0);
        L(B.lowerArmR, -1.2, -0.6, 0);
        B.shoulderL.position.y = B.shoulderR.position.y = 0;
        break;
      case 'talkhands':
        L(B.upperArmL, -0.35 + osc(2.1, 0.12), 0, 0.12);
        L(B.upperArmR, -0.3 + osc(2.7, 0.15), 0, -0.12);
        L(B.lowerArmL, -1.05 + osc(3.3, 0.2), 0.4, 0);
        L(B.lowerArmR, -1.1 + osc(2.9, 0.25), -0.4, 0);
        break;
      case 'clutch':
        // holding the damaged forearm against the chest
        L(B.upperArmL, -0.7, 0, 0.1);
        L(B.lowerArmL, -1.5, 0.5, 0);
        L(B.upperArmR, -0.55, 0, -0.25);
        L(B.lowerArmR, -1.2, -0.7, 0);
        L(B.spine, 0.25, 0, 0);
        break;
      case 'phone':
        L(B.upperArmR, -0.5, 0, -0.55);
        L(B.lowerArmR, -2.4, -0.2, 0);
        L(B.handR, 0, 0, 0);
        break;
      case 'umbrella':
        L(B.upperArmR, -0.85, 0, -0.08);
        L(B.lowerArmR, -1.05, 0, 0);
        L(B.handR, 0.7 + (held ? 0.25 : 0), 0, 0);
        break;
      case 'carry':
        L(B.upperArmR, -0.3, 0, -0.08);
        L(B.lowerArmR, -1.35, 0, 0);
        break;
      case 'handshake':
        L(B.upperArmR, -0.85, 0, -0.08);
        L(B.lowerArmR, -0.3 + osc(10, 0.08), 0, 0);
        break;
      case 'flinch':
        L(B.upperArmL, -1.6, 0, 0.5);
        L(B.upperArmR, -1.6, 0, -0.5);
        L(B.lowerArmL, -1.8, 0, 0);
        L(B.lowerArmR, -1.8, 0, 0);
        L(B.spine, -0.15, 0, 0);
        break;
      case 'nod':
        B.head.rotation.x += Math.max(0, Math.sin(t * 6)) * 0.25 * w;
        break;
      case 'reach':
        L(B.upperArmR, -1.25, 0, -0.05);
        L(B.lowerArmR, -0.2, 0, 0);
        L(B.upperArmL, -1.1, 0, 0.05);
        L(B.lowerArmL, -0.3, 0, 0);
        L(B.spine, 0.3, 0, 0);
        break;
      case 'hug':
        L(B.upperArmL, -1.35, -0.7, 0.2);
        L(B.upperArmR, -1.35, 0.7, -0.2);
        L(B.lowerArmL, -0.9, 0, 0);
        L(B.lowerArmR, -0.9, 0, 0);
        break;
      case 'armsUp':
        L(B.upperArmL, -0.2, 0, 2.6);
        L(B.upperArmR, -0.2, 0, -2.6);
        L(B.lowerArmL, -0.5, 0, 0);
        L(B.lowerArmR, -0.5, 0, 0);
        break;
      case 'swing': {
        const k = Math.min(1, t / 0.5);
        L(B.upperArmR, -2.4 + k * 2.2, 0, -0.3);
        L(B.lowerArmR, -0.6, 0, 0);
        L(B.chest, 0, -0.5 + k * 0.9, 0);
        break;
      }
      case 'aim':
        L(B.upperArmR, -1.5, 0.1, 0);
        L(B.lowerArmR, -0.05, 0, 0);
        L(B.upperArmL, -1.4, -0.45, 0);
        L(B.lowerArmL, -0.45, 0, 0);
        break;
      case 'eat':
        L(B.upperArmR, -0.4, 0, -0.3);
        L(B.lowerArmR, -2.1 + Math.max(0, Math.sin(t * 2.4)) * 0.6, -0.3, 0);
        break;
      case 'lookWatch':
        L(B.upperArmL, -0.5, 0, 0.3);
        L(B.lowerArmL, -1.6, 0.9, 0);
        B.head.rotation.x += 0.35 * w;
        break;
      case 'hands_hips':
        L(B.upperArmL, 0.1, 0, 0.55);
        L(B.upperArmR, 0.1, 0, -0.55);
        L(B.lowerArmL, -1.6, -0.5, 0);
        L(B.lowerArmR, -1.6, 0.5, 0);
        break;
      case 'stagger':
        L(B.spine, -0.35 + osc(8, 0.1), 0, osc(5, 0.2));
        L(B.upperArmL, -0.6, 0, 0.9);
        L(B.upperArmR, -0.6, 0, -0.9);
        break;
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    this.eyeMat.dispose();
    for (const a of this.attachments) a.removeFromParent();
  }
}

function bindPositions(P: Prop): Record<BoneName, THREE.Vector3> {
  const V = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);
  return {
    root: V(0, 0),
    hips: V(0, P.hipY),
    spine: V(0, P.waistY),
    chest: V(0, P.chestY),
    neck: V(0, P.neckY - 0.02),
    head: V(0, P.headY),
    jaw: V(0, P.headY + P.headH * 0.2, P.headD * 0.5),
    lids: V(0, P.headY + P.headH * 0.57, P.headD * 0.5),
    shoulderL: V(P.shX * 0.45, P.shoulderY - 0.03),
    upperArmL: V(P.shX, P.shoulderY - 0.04),
    lowerArmL: V(P.shX, P.elbowY),
    handL: V(P.shX, P.wristY),
    shoulderR: V(-P.shX * 0.45, P.shoulderY - 0.03),
    upperArmR: V(-P.shX, P.shoulderY - 0.04),
    lowerArmR: V(-P.shX, P.elbowY),
    handR: V(-P.shX, P.wristY),
    upperLegL: V(P.hipX, P.hipY),
    lowerLegL: V(P.hipX, P.kneeY),
    footL: V(P.hipX, P.ankleY),
    upperLegR: V(-P.hipX, P.hipY),
    lowerLegR: V(-P.hipX, P.kneeY),
    footR: V(-P.hipX, P.ankleY),
  };
}

/** Gen 1 maintenance machine: own simple rig (hips/spine/chest/head + arms). */
export class Gen1Bot {
  readonly root = new THREE.Group();
  readonly mesh: THREE.SkinnedMesh;
  readonly bones = {} as Record<BoneName, THREE.Bone>;
  speed = 0;
  private t = Math.random() * 10;
  lookTarget: THREE.Vector3 | null = null;
  private yaw = 0;
  constructor(look: Look = { gen: 'gen2' }) {
    const B = new FigureBuilder();
    buildGen1(B, look);
    const geo = B.build();
    const mats = materials();
    this.mesh = new THREE.SkinnedMesh(geo, [mats[0], mats[1], mats[2], mats[2]]);
    this.mesh.castShadow = true;
    const pos: Partial<Record<BoneName, THREE.Vector3>> = {
      root: new THREE.Vector3(), hips: new THREE.Vector3(0, 0.16, 0), spine: new THREE.Vector3(0, 0.4, 0), chest: new THREE.Vector3(0, 0.8, 0), head: new THREE.Vector3(0, 1.3, 0), lids: new THREE.Vector3(0, 1.4, 0.24),
      upperArmL: new THREE.Vector3(0.37, 1.1, 0), lowerArmL: new THREE.Vector3(0.4, 0.68, 0), handL: new THREE.Vector3(0.4, 0.32, 0),
      upperArmR: new THREE.Vector3(-0.37, 1.1, 0), lowerArmR: new THREE.Vector3(-0.4, 0.68, 0), handR: new THREE.Vector3(-0.4, 0.32, 0),
    };
    const parent: Partial<Record<BoneName, BoneName>> = { hips: 'root', spine: 'root', chest: 'spine', head: 'chest', lids: 'head', upperArmL: 'chest', lowerArmL: 'upperArmL', handL: 'lowerArmL', upperArmR: 'chest', lowerArmR: 'upperArmR', handR: 'lowerArmR' };
    const list: THREE.Bone[] = [];
    for (const n of BONES) {
      const b = new THREE.Bone();
      this.bones[n] = b;
      list.push(b);
    }
    for (const n of BONES) {
      const p = parent[n];
      const wp = pos[n] ?? new THREE.Vector3();
      if (p) {
        this.bones[n].position.copy(wp).sub(pos[p] ?? new THREE.Vector3());
        this.bones[p].add(this.bones[n]);
      } else if (n === 'root') this.bones[n].position.copy(wp);
      else this.bones.root.add(this.bones[n]);
    }
    this.mesh.add(this.bones.root);
    this.mesh.bind(new THREE.Skeleton(list));
    this.root.add(this.mesh);
  }
  update(dt: number): void {
    this.t += dt;
    const B = this.bones;
    B.spine.position.y = 0.4 + Math.sin(this.t * 18) * 0.004 * Math.min(1, this.speed);
    B.chest.rotation.y = Math.sin(this.t * 0.4) * 0.15;
    let ty = Math.sin(this.t * 0.3) * 0.6;
    if (this.lookTarget) {
      const p = this.root.worldToLocal(this.lookTarget.clone());
      ty = clamp(Math.atan2(p.x, p.z), -1.4, 1.4);
    }
    this.yaw = damp(this.yaw, ty, 3, dt);
    B.head.rotation.y = this.yaw - B.chest.rotation.y;
    B.upperArmL.rotation.x = -0.3 + Math.sin(this.t * 1.1) * 0.15;
    B.upperArmR.rotation.x = -0.3 + Math.sin(this.t * 1.3 + 1) * 0.15;
    B.lowerArmL.rotation.x = -0.6;
    B.lowerArmR.rotation.x = -0.6;
  }
  dispose(): void {
    this.root.removeFromParent();
  }
}
