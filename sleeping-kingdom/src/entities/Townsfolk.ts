import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { retro, Mats } from '../world/Materials';
import { bakeMeshes, skeleton, type FolkStyle, type JointName, type Rig } from './Rig';
import { createSeededRandom } from '../utils/random';
import { FaceAnim } from './Face';

/**
 * Townsfolk of Velmour, carved like painted wooden figures: every piece is a bevelled block,
 * shaded light-to-dark down its height in the vertex colours, and all the blocks on one joint
 * are welded into a single mesh. Faces are modelled (eyes with lids, brows, nose, ears and a
 * mouth) so they blink, glance and speak in time with the recorded lines.
 */

let counter = 0;

const HAIR = ['#2a1c14', '#4a3020', '#6a4a2a', '#1a1614', '#7a5232'];
const GREY = ['#8a8580', '#b8b2a8'];
const SHIRT = ['#cbbfa4', '#a89c84', '#8a8070'];
const IRIS = ['#3a2a1a', '#2e4058', '#3e5030', '#4a3020'];

const FEMALE = new Set(['Washerwoman', 'Goodwife Ama', 'Mother Sallow', 'Old Tamsin', 'Wren', 'Thornwife']);
const CHILD = new Set(['Boy']);

/** Fill in who someone is from their name when the script leaves it open. */
export function styleFor(name: string, style: FolkStyle): FolkStyle {
  return { ...style, female: style.female ?? (FEMALE.has(name) ? true : undefined), child: style.child ?? CHILD.has(name) };
}

let sharedMat: THREE.MeshStandardMaterial | null = null;
function bodyMat(): THREE.MeshStandardMaterial {
  if (!sharedMat) sharedMat = retro(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0 }), 'folkvc');
  return sharedMat;
}

function robeTone(robe: THREE.Material): string {
  const m = Mats();
  const tones: Array<[THREE.Material, string]> = [
    [m.robeBrown, '#5a4430'],
    [m.robeGrey, '#4a4c56'],
    [m.robeGreen, '#33482e'],
    [m.robeRed, '#7a2c26'],
    [m.robeBlack, '#222026'],
    [m.robeWhite, '#b2aa98'],
  ];
  return tones.find(([mm]) => mm === robe)?.[1] ?? '#5a4430';
}

type V3 = [number, number, number];

/**
 * Collects blocks per joint, then welds them. `shade` paints a vertical gradient (top lit by the
 * sky, underside in shadow) plus a little per-vertex mottling so flat colours read as painted.
 */
class Carver {
  private readonly parts = new Map<THREE.Object3D, THREE.BufferGeometry[]>();
  private readonly tmp = new THREE.Color();
  constructor(private readonly rng: () => number) {}

  block(
    on: THREE.Object3D,
    size: V3,
    color: string | THREE.Color,
    at: V3,
    o: { rot?: V3; r?: number; taper?: [number, number]; topZ?: number; shade?: number; seg?: number } = {},
  ): void {
    const [w, h, d] = size;
    const r = Math.min(o.r ?? 0.018, w * 0.45, h * 0.45, d * 0.45);
    const g = (new RoundedBoxGeometry(w, h, d, o.seg ?? 2, r) as THREE.BufferGeometry).toNonIndexed();
    const pos = g.attributes.position as THREE.BufferAttribute;
    const n = g.attributes.normal as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    const base = typeof color === 'string' ? new THREE.Color(color) : color;
    const shade = o.shade ?? 1;
    for (let i = 0; i < pos.count; i += 1) {
      const t = pos.getY(i) / h + 0.5;
      if (o.taper) {
        // Width/depth scale bottom→top: skirts flare, torsos narrow to the waist.
        const k = o.taper[0] + (o.taper[1] - o.taper[0]) * t;
        pos.setX(i, pos.getX(i) * k);
        pos.setZ(i, pos.getZ(i) * (o.topZ !== undefined ? 1 + (o.topZ - 1) * t : k));
      }
      const lit = (0.74 + 0.36 * t) * (n.getY(i) < -0.5 ? 0.72 : 1) * (1 + (this.rng() - 0.5) * 0.06);
      const f = 1 + (lit - 1) * shade;
      this.tmp.copy(base).multiplyScalar(f);
      col[i * 3] = this.tmp.r;
      col[i * 3 + 1] = this.tmp.g;
      col[i * 3 + 2] = this.tmp.b;
    }
    if (o.taper) g.computeVertexNormals();
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...at),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(o.rot ?? [0, 0, 0]))),
      new THREE.Vector3(1, 1, 1),
    );
    g.applyMatrix4(m);
    const list = this.parts.get(on) ?? [];
    list.push(g);
    this.parts.set(on, list);
  }

  /** Weld each joint's blocks into one shadow-casting mesh; returns the meshes keyed by joint. */
  weld(): Map<THREE.Object3D, THREE.Mesh> {
    const out = new Map<THREE.Object3D, THREE.Mesh>();
    for (const [joint, geos] of this.parts) {
      const g = mergeGeometries(geos, false);
      if (!g) continue;
      g.computeBoundingSphere();
      const me = new THREE.Mesh(g, bodyMat());
      me.castShadow = true;
      me.userData.keep = true;
      joint.add(me);
      out.set(joint, me);
    }
    this.parts.clear();
    return out;
  }
}

/** A carved face: lids blink, eyes glance, and the mouth opens with the voice. */
export class CarvedFace {
  talking = false;
  readonly mesh = new THREE.Group();
  private readonly lids: THREE.Mesh;
  private readonly eyes: THREE.Mesh;
  private readonly mouth: THREE.Mesh;
  private blinkT = 1 + Math.random() * 3;
  private blink = 0;
  private glanceT = 1;
  private readonly glance = new THREE.Vector2();
  private flapT = 0;
  private open = 0;
  private openTarget = 0;

  constructor(lids: THREE.Mesh, eyes: THREE.Mesh, mouth: THREE.Mesh, private readonly lidRest: number) {
    this.lids = lids;
    this.eyes = eyes;
    this.mouth = mouth;
    this.mesh.add(lids, eyes, mouth);
    this.mesh.userData.keep = true;
  }

  update(dt: number): void {
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blink = 0.15;
      this.blinkT = 1.8 + Math.random() * 4;
    }
    this.blink = Math.max(0, this.blink - dt);
    const shut = this.blink > 0 ? Math.sin((this.blink / 0.15) * Math.PI) : 0;
    this.lids.scale.y = this.lidRest + (1 - this.lidRest) * shut;
    this.glanceT -= dt;
    if (this.glanceT <= 0) {
      this.glanceT = 0.8 + Math.random() * 2.6;
      this.glance.set((Math.random() - 0.5) * 0.012, (Math.random() - 0.5) * 0.006);
    }
    this.eyes.position.x += (this.glance.x - this.eyes.position.x) * Math.min(1, dt * 18);
    this.eyes.position.y += (this.glance.y - this.eyes.position.y) * Math.min(1, dt * 18);
    if (this.talking && FaceAnim.voice >= 0) this.openTarget = Math.min(1, FaceAnim.voice * 1.4);
    else if (this.talking) {
      this.flapT -= dt;
      if (this.flapT <= 0) {
        this.flapT = 0.07 + Math.random() * 0.1;
        this.openTarget = Math.random() < 0.3 ? 0 : 0.3 + Math.random() * 0.7;
      }
    } else this.openTarget = 0;
    this.open += (this.openTarget - this.open) * Math.min(1, dt * 22);
    this.mouth.scale.set(1 - this.open * 0.15, 1 + this.open * 3.2, 1);
  }
}

function colorMesh(geos: THREE.BufferGeometry[], pivot: V3): THREE.Mesh {
  const g = mergeGeometries(geos, false)!;
  g.translate(-pivot[0], -pivot[1], -pivot[2]);
  const me = new THREE.Mesh(g, bodyMat());
  me.position.set(...pivot);
  me.userData.keep = true;
  return me;
}

function face(H: THREE.Object3D, skin: THREE.Color, hair: string, mood: FolkStyle['mood'], female: boolean, rng: () => number): CarvedFace {
  const part = (size: V3, color: string | THREE.Color, at: V3, r = 0.004, rot: V3 = [0, 0, 0]) => {
    const g = (new RoundedBoxGeometry(...size, 1, Math.min(r, size[0] * 0.45, size[1] * 0.45, size[2] * 0.45)) as THREE.BufferGeometry).toNonIndexed();
    const c = typeof color === 'string' ? new THREE.Color(color) : color;
    const col = new Float32Array(g.attributes.position.count * 3);
    for (let i = 0; i < col.length; i += 3) col.set([c.r, c.g, c.b], i);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...at), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(1, 1, 1)));
    return g;
  };
  const z = 0.131;
  const eyeY = 0.142;
  const iris = IRIS[Math.floor(rng() * IRIS.length)];
  const eyes: THREE.BufferGeometry[] = [];
  const lids: THREE.BufferGeometry[] = [];
  const lidCol = skin.clone().multiplyScalar(0.86);
  for (const sx of [-1, 1]) {
    const x = sx * 0.054;
    eyes.push(part([0.026, 0.03, 0.006], iris, [x, eyeY, z + 0.004], 0.006));
    eyes.push(part([0.012, 0.016, 0.004], '#0a0806', [x, eyeY, z + 0.007], 0.003));
    eyes.push(part([0.006, 0.006, 0.003], '#f4f0e8', [x + 0.006, eyeY + 0.007, z + 0.009], 0.002));
    // Lid: hangs from the brow line, scaled down to a thin crease when open.
    lids.push(part([0.06, 0.036, 0.012], lidCol, [x, eyeY - 0.018 + 0.018, z + 0.006], 0.005));
  }
  // The static parts of the face go on the head block.
  const fixed: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) {
    fixed.push(part([0.054, 0.034, 0.008], '#e6e0d4', [sx * 0.054, eyeY, z - 0.001], 0.008));
    const tilt = mood === 'grim' ? -0.32 : mood === 'fear' ? 0.34 : mood === 'old' ? 0.12 : 0.05;
    fixed.push(part([0.064, female ? 0.012 : 0.017, 0.016], hair, [sx * 0.056, eyeY + 0.036 + (mood === 'fear' ? 0.006 : 0), z + 0.002], 0.005, [0, 0, sx * tilt]));
  }
  fixed.push(part([0.036, 0.062, 0.045], skin.clone().multiplyScalar(0.96), [0, 0.098, z + 0.012], 0.012, [-0.12, 0, 0]));
  fixed.push(part([0.044, 0.016, 0.03], skin.clone().multiplyScalar(0.8), [0, 0.072, z + 0.01], 0.007));
  const lip = skin.clone().multiplyScalar(0.7).lerp(new THREE.Color('#8a3a30'), female ? 0.35 : 0.2);
  fixed.push(part([0.07, 0.012, 0.008], lip, [0, 0.032 + 0.014, z], 0.004));
  if (mood === 'old') {
    for (const sx of [-1, 1]) fixed.push(part([0.004, 0.04, 0.006], skin.clone().multiplyScalar(0.7), [sx * 0.042, 0.06, z], 0.002, [0, 0, sx * 0.4]));
  }
  const fm = new THREE.Mesh(mergeGeometries(fixed, false)!, bodyMat());
  fm.userData.keep = true;
  H.add(fm);
  const mouthG = part([0.056, 0.012, 0.006], '#1a0c0a', [0, 0.035, z + 0.001], 0.003);
  const f = new CarvedFace(colorMesh(lids, [0, eyeY + 0.018, 0]), colorMesh(eyes, [0, 0, 0]), colorMesh([mouthG], [0, 0.035 + 0.006, 0]), 0.18);
  H.add(f.mesh);
  return f;
}

export function buildTownsfolk(style: FolkStyle): Rig & { lantern?: THREE.Object3D; face?: CarvedFace } {
  const seed = (counter += 1);
  const rng = createSeededRandom(seed * 977 + 13);
  const m = Mats();
  const old = style.mood === 'old';
  const female = style.female ?? (!style.guard && rng() < 0.4);
  const child = !!style.child;
  const scale = (style.scale ?? 1) * (child ? 0.66 : female ? 0.93 : 0.98);
  const rig = skeleton({ scale, hipY: 0.96, thigh: 0.45, shin: 0.43, spine: 0.26, chest: 0.34, shoulderW: female ? 0.18 : 0.205 });
  const { j } = rig;
  const c = new Carver(rng);
  const skin = new THREE.Color(style.skin);
  const hair = old ? GREY[Math.floor(rng() * 2)] : HAIR[Math.floor(rng() * HAIR.length)];
  const outer = robeTone(style.robe);
  const shirt = SHIRT[Math.floor(rng() * SHIRT.length)];
  const hose = rng() < 0.5 ? '#3a3430' : '#4a3a2a';
  const leather = '#3a2618';
  const boot = '#2a1c14';
  const long = female || old || style.robe === m.robeWhite || style.robe === m.robeBlack;
  const bulk = female ? 0.9 : old ? 0.96 : 1 + rng() * 0.08;

  // ------------------------------------------------------------ head
  const H = j.head;
  // Stylised: the head reads a touch large, so faces carry at gameplay distance. Children more so.
  if (child) H.scale.setScalar(1.18);
  const hw = female ? 0.22 : 0.235;
  c.block(H, [hw, 0.25, 0.25], skin, [0, 0.135, 0], { r: 0.05, shade: 0.6 });
  c.block(H, [hw * 0.82, 0.08, 0.21], skin, [0, 0.03, 0.012], { r: 0.035, shade: 0.5, taper: [0.8, 1] });
  for (const sx of [-1, 1]) c.block(H, [0.028, 0.06, 0.04], skin.clone().multiplyScalar(0.92), [sx * (hw / 2 + 0.008), 0.12, -0.005], { r: 0.012 });
  c.block(j.neck, [0.1, 0.14, 0.1], skin.clone().multiplyScalar(0.85), [0, 0.06, -0.005], { r: 0.03 });
  const f = face(H, skin, hair, style.mood, female, rng);

  if (style.hood) {
    c.block(H, [hw + 0.06, 0.07, 0.3], outer, [0, 0.275, -0.012], { r: 0.03 });
    for (const sx of [-1, 1]) c.block(H, [0.04, 0.26, 0.28], outer, [sx * (hw / 2 + 0.03), 0.14, -0.02], { r: 0.018 });
    c.block(H, [hw + 0.06, 0.28, 0.05], outer, [0, 0.14, -0.15], { r: 0.02 });
    c.block(j.chest, [0.4 * bulk, 0.1, 0.3], outer, [0, 0.33, -0.01], { r: 0.04, taper: [1.15, 0.8] });
  } else if (style.guard) {
    // Kettle hat.
    c.block(H, [hw + 0.03, 0.12, 0.27], '#4a4e58', [0, 0.27, 0], { r: 0.05 });
    c.block(H, [hw + 0.16, 0.025, 0.4], '#3a3e48', [0, 0.22, 0], { r: 0.012 });
  } else {
    const bald = !female && old && rng() < 0.4;
    c.block(H, [hw + 0.02, bald ? 0.03 : 0.07, 0.27], hair, [0, bald ? 0.26 : 0.27, -0.008], { r: 0.03 });
    c.block(H, [hw + 0.025, 0.2, 0.06], hair, [0, 0.17, -0.11], { r: 0.025 });
    for (const sx of [-1, 1]) c.block(H, [0.025, 0.1, 0.18], hair, [sx * (hw / 2 + 0.006), 0.2, -0.03], { r: 0.01 });
    if (!bald) c.block(H, [hw + 0.01, 0.04, 0.05], hair, [rng() < 0.5 ? 0.02 : -0.02, 0.25, 0.115], { r: 0.015, rot: [0.3, 0, 0] });
    if (female) {
      if (rng() < 0.5) c.block(H, [0.1, 0.09, 0.08], hair, [0, 0.2, -0.16], { r: 0.035 });
      else c.block(H, [0.2, 0.3, 0.05], hair, [0, 0.0, -0.11], { r: 0.02, taper: [0.8, 1] });
    }
  }
  if (!female && !child && (old || rng() < 0.45)) {
    const full = old || rng() < 0.5;
    c.block(H, [full ? 0.17 : 0.13, full ? 0.11 : 0.05, 0.05], hair, [0, full ? 0.0 : 0.02, 0.11], { r: 0.02, taper: [0.7, 1] });
    c.block(H, [0.08, 0.018, 0.02], hair, [0, 0.058, 0.134], { r: 0.006 });
  }

  // ------------------------------------------------------------ torso & clothing
  const chestW = (female ? 0.33 : 0.37) * bulk;
  c.block(j.spine, [chestW * 0.92, 0.28, 0.21], style.guard ? '#6a5a44' : new THREE.Color(outer).multiplyScalar(0.9), [0, 0.13, 0], { r: 0.04 });
  c.block(j.chest, [chestW, 0.32, 0.23], style.guard ? '#6a5a44' : outer, [0, 0.15, 0], { r: 0.05, taper: [0.9, 1.04] });
  c.block(j.chest, [0.14, 0.05, 0.12], shirt, [0, 0.33, 0.02], { r: 0.02 });
  if (female) c.block(j.chest, [chestW * 0.86, 0.12, 0.07], outer, [0, 0.16, 0.11], { r: 0.035 });
  if (style.guard) {
    c.block(j.chest, [chestW * 1.04, 0.3, 0.25], '#5a5e68', [0, 0.14, 0.01], { r: 0.05, taper: [0.92, 1.05] });
    c.block(j.chest, [0.03, 0.26, 0.02], '#2a2622', [0, 0.14, 0.135], { r: 0.008 });
  } else if (!style.hood && rng() < 0.55) {
    // Shawl or short cape over the shoulders.
    const sc = rng() < 0.5 ? '#5a4232' : '#3a4048';
    c.block(j.chest, [chestW + 0.12, 0.09, 0.27], sc, [0, 0.29, -0.005], { r: 0.035 });
    c.block(j.chest, [chestW + 0.06, 0.22, 0.05], sc, [0, 0.19, -0.12], { r: 0.02, taper: [1.1, 1] });
  }
  // Belt with buckle and a pouch.
  c.block(j.hips, [chestW * 0.98, 0.05, 0.23], leather, [0, 0.09, 0], { r: 0.015 });
  c.block(j.hips, [0.04, 0.04, 0.02], '#b08a40', [0, 0.09, 0.118], { r: 0.008 });
  c.block(j.hips, [0.07, 0.08, 0.04], leather, [chestW * 0.42, 0.03, 0.08], { r: 0.015 });
  if (long) {
    c.block(j.hips, [chestW * 1.0, 0.98, 0.25], outer, [0, -0.4, 0], { r: 0.04, taper: [1.65, 0.98], topZ: 0.96 });
  } else {
    c.block(j.hips, [chestW * 1.0, 0.36, 0.24], outer, [0, -0.09, 0], { r: 0.04, taper: [1.2, 0.98] });
    if (rng() < 0.35) c.block(j.hips, [0.22, 0.42, 0.015], '#b8ac94', [0, -0.12, 0.135], { r: 0.006, rot: [0.06, 0, 0] });
  }

  // ------------------------------------------------------------ limbs
  for (const side of ['L', 'R'] as const) {
    const sleeve = style.guard ? '#6a5a44' : outer;
    c.block(j[`shoulder${side}`], [0.12 * bulk, 0.12, 0.13], sleeve, [0, -0.01, 0], { r: 0.05 });
    c.block(j[`shoulder${side}`], [0.1 * bulk, 0.3, 0.1], sleeve, [0, -0.15, 0], { r: 0.035, taper: [0.9, 1] });
    c.block(j[`elbow${side}`], [0.09, 0.09, 0.09], sleeve, [0, 0, 0], { r: 0.04 });
    c.block(j[`elbow${side}`], [0.085, 0.24, 0.088], shirt, [0, -0.12, 0], { r: 0.03, taper: [0.9, 1] });
    c.block(j[`elbow${side}`], [0.1, 0.05, 0.1], sleeve, [0, -0.21, 0], { r: 0.02 });
    const hand = j[`hand${side}` as JointName];
    c.block(hand, [0.07, 0.09, 0.035], skin, [0, -0.04, 0.005], { r: 0.016, shade: 0.5 });
    c.block(hand, [0.06, 0.05, 0.03], skin.clone().multiplyScalar(0.95), [0, -0.095, 0.012], { r: 0.014, rot: [0.4, 0, 0], shade: 0.5 });
    c.block(hand, [0.022, 0.05, 0.022], skin, [side === 'L' ? -0.035 : 0.035, -0.045, 0.025], { r: 0.009, rot: [0.5, 0, side === 'L' ? 0.4 : -0.4] });
  }
  for (const side of ['L', 'R'] as const) {
    c.block(j[`hip${side}`], [0.15 * bulk, 0.44, 0.15], hose, [0, -0.2, 0], { r: 0.05, taper: [0.82, 1] });
    c.block(j[`knee${side}`], [0.12, 0.12, 0.12], hose, [0, 0, 0], { r: 0.05 });
    c.block(j[`knee${side}`], [0.11, 0.26, 0.12], hose, [0, -0.12, 0], { r: 0.04, taper: [0.85, 1] });
    c.block(j[`knee${side}`], [0.125, 0.2, 0.135], boot, [0, -0.33, 0.005], { r: 0.035 });
    c.block(j[`knee${side}`], [0.135, 0.04, 0.145], '#3a281c', [0, -0.24, 0.005], { r: 0.012 });
    c.block(j[`foot${side}`], [0.12, 0.08, 0.25], boot, [0, -0.025, 0.055], { r: 0.035 });
    c.block(j[`foot${side}`], [0.125, 0.02, 0.26], '#120c0a', [0, -0.065, 0.055], { r: 0.006, shade: 0 });
  }
  c.weld();

  let lantern: THREE.Object3D | undefined;
  const part = (parent: THREE.Object3D, g: THREE.BufferGeometry, mat: THREE.Material, p: V3) => {
    const me = new THREE.Mesh(g, mat);
    me.position.set(...p);
    me.castShadow = true;
    parent.add(me);
    return me;
  };
  if (style.lantern) {
    const l = new THREE.Group();
    part(l, new THREE.CylinderGeometry(0.055, 0.065, 0.15, 6), m.lanternGlow, [0, -0.2, 0]);
    part(l, new THREE.ConeGeometry(0.075, 0.07, 6), m.ironDark, [0, -0.1, 0]);
    part(l, new THREE.CylinderGeometry(0.07, 0.07, 0.015, 6), m.ironDark, [0, -0.28, 0]);
    part(l, new THREE.TorusGeometry(0.035, 0.007, 4, 8), m.ironDark, [0, -0.05, 0]);
    j.handL.add(l);
    lantern = l;
  }
  if (style.guard) {
    const spear = new THREE.Group();
    part(spear, new THREE.CylinderGeometry(0.018, 0.02, 2.4, 6), m.wood, [0, 0.5, 0]);
    part(spear, new THREE.ConeGeometry(0.045, 0.32, 4), m.steel, [0, 1.86, 0]);
    spear.position.set(0, -0.06, 0.02);
    j.handR.add(spear);
  }
  bakeMeshes(rig.root);
  return { ...rig, lantern, face: f };
}
