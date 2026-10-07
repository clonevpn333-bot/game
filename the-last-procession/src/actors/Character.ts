import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getToonRamp } from '../render/Materials';
import { blobShadow } from '../render/Materials';
import { clamp, damp, dampAngle, lerp } from '../utils/math';

/**
 * Stylized, slightly-retro humanoid. Each bone owns ONE merged vertex-colored toon
 * mesh (+ an inverted-hull ink outline), so a full character is ~25 draw calls.
 * All animation is procedural pose blending, which keeps motion readable and
 * lets cutscenes pose characters directly.
 */

export type JointName = 'hips' | 'spine' | 'head' | 'uArmL' | 'fArmL' | 'uArmR' | 'fArmR' | 'thighL' | 'shinL' | 'thighR' | 'shinR';
const JOINTS: JointName[] = ['hips', 'spine', 'head', 'uArmL', 'fArmL', 'uArmR', 'fArmR', 'thighL', 'shinL', 'thighR', 'shinR'];

export type AnimMode =
  | 'idle' | 'locomotion' | 'jump' | 'attack' | 'hurt' | 'dodge' | 'sit' | 'climb' | 'ride' | 'fall' | 'carry'
  | 'kneel' | 'reach' | 'hang' | 'float' | 'lie' | 'piggy' | 'cower' | 'point' | 'brace' | 'slide' | 'dead' | 'raise';

interface Pose {
  r: Float32Array; // 3 per joint
  bob: number;
  bodyPitch: number;
  bodyRoll: number;
}
const newPose = (): Pose => ({ r: new Float32Array(JOINTS.length * 3), bob: 0, bodyPitch: 0, bodyRoll: 0 });

export interface CharacterLook {
  skin: string;
  hair: string;
  primary: string; // tunic/dress
  secondary: string; // trousers/underlayer
  accent: string; // scarf/sash
  metal: string;
  boots: string;
  style: 'kael' | 'lyra' | 'guard' | 'warden' | 'vesk' | 'maren';
  scale?: number;
  outline?: boolean;
}

export const LOOKS: Record<string, CharacterLook> = {
  kael: { skin: '#e9b48c', hair: '#4a2a1a', primary: '#24406e', secondary: '#3a2b26', accent: '#c4302b', metal: '#c9d2dc', boots: '#3b2418', style: 'kael' },
  lyra: { skin: '#f3d2bd', hair: '#e8f2ff', primary: '#f1ead8', secondary: '#c9d8e4', accent: '#7ff3ff', metal: '#e0c27a', boots: '#d8c7aa', style: 'lyra', scale: 0.88 },
  maren: { skin: '#c99272', hair: '#2b1e18', primary: '#1f3460', secondary: '#2a2a33', accent: '#e0b040', metal: '#d8dde4', boots: '#2a1a12', style: 'maren', scale: 1.05 },
  guard: { skin: '#d9a582', hair: '#3a2a20', primary: '#2a4a80', secondary: '#33302e', accent: '#d8b04a', metal: '#b9c2cc', boots: '#2c1f17', style: 'guard', outline: false },
  warden: { skin: '#c99272', hair: '#222', primary: '#8c1f24', secondary: '#4a1418', accent: '#e0a040', metal: '#b88a3a', boots: '#2a1612', style: 'warden', outline: false },
  vesk: { skin: '#e2c0a8', hair: '#ddd', primary: '#efe6d6', secondary: '#8c1f24', accent: '#e8b84a', metal: '#d8a640', boots: '#3a1e14', style: 'vesk', scale: 1.15 },
};

type PartList = { geo: THREE.BufferGeometry; color: THREE.Color }[];

const outlineMat = (() => {
  const m = new THREE.MeshBasicMaterial({ color: 0x140c16, side: THREE.BackSide });
  m.onBeforeCompile = (s) => {
    s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normal * 0.022;');
  };
  m.customProgramCacheKey = () => 'ink-outline';
  return m;
})();

const toonVC = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: getToonRamp() });

function colorize(geo: THREE.BufferGeometry, color: THREE.Color): THREE.BufferGeometry {
  const g = geo.index ? geo : geo;
  const n = g.attributes.position.count;
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) c.set([color.r, color.g, color.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}

function xf(geo: THREE.BufferGeometry, p: [number, number, number], r: [number, number, number] = [0, 0, 0], s: [number, number, number] = [1, 1, 1]): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
  geo.applyMatrix4(m);
  return geo;
}

const SEG = 8;
const cyl = (rt: number, rb: number, h: number, seg = SEG) => new THREE.CylinderGeometry(rt, rb, h, seg, 1);
const sph = (r: number, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
const cap = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 3, SEG);
const cone = (r: number, h: number, seg = SEG) => new THREE.ConeGeometry(r, h, seg, 1);

export class Character {
  readonly root = new THREE.Group(); // position + yaw
  readonly body = new THREE.Group(); // pitch/roll for rolls, skydive, lying
  readonly bones = {} as Record<JointName, THREE.Group>;
  readonly hand = new THREE.Group(); // right-hand socket
  readonly handL = new THREE.Group();
  readonly back = new THREE.Group(); // back socket (piggyback etc.)
  private readonly eyes: THREE.Mesh;
  private readonly mouth: THREE.Mesh;
  private trail: THREE.Group | null = null; // scarf / hair tail / cape
  private trailSegs: THREE.Group[] = [];
  readonly shadow: THREE.Mesh;
  readonly look: CharacterLook;
  weapon: THREE.Group | null = null;
  glowMats: THREE.MeshBasicMaterial[] = [];

  mode: AnimMode = 'idle';
  modeT = 0; // time in mode
  modeP = 0; // explicit progress 0..1 for authored poses
  speed = 0; // horizontal m/s for locomotion
  runSpeed = 7;
  attackVariant = 0;
  yaw = 0;
  targetYaw = 0;
  talking = 0; // >0 while speaking
  lookAtTarget: THREE.Vector3 | null = null;
  private phase = 0;
  private blink = 2;
  private pose = newPose();
  private prevPose = newPose();
  private targetPose = newPose();
  private blendT = 1;
  private lastMode: AnimMode = 'idle';
  private trailAngle = new THREE.Vector2();
  private readonly lastPos = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  onStep: ((foot: number) => void) | null = null;
  private lastStepSign = 0;

  constructor(lookKey: keyof typeof LOOKS | CharacterLook) {
    const look = typeof lookKey === 'string' ? LOOKS[lookKey] : lookKey;
    this.look = look;
    const sc = look.scale ?? 1;
    this.root.add(this.body);
    this.body.scale.setScalar(sc);

    const C = (c: string) => new THREE.Color(c);
    const parts: Record<string, PartList> = {};
    const glow: Record<string, THREE.BufferGeometry[]> = {};
    const add = (bone: string, geo: THREE.BufferGeometry, color: string) => {
      (parts[bone] ??= []).push({ geo, color: C(color) });
    };
    const addGlow = (bone: string, geo: THREE.BufferGeometry) => {
      (glow[bone] ??= []).push(geo);
    };

    // --- skeleton (pivots in body space, units = meters for a 1.8m figure)
    const mk = (name: JointName, parent: THREE.Object3D, p: [number, number, number]) => {
      const g = new THREE.Group();
      g.name = name;
      g.position.set(...p);
      parent.add(g);
      this.bones[name] = g;
      return g;
    };
    const hips = mk('hips', this.body, [0, 0.95, 0]);
    const spine = mk('spine', hips, [0, 0.12, 0]);
    const head = mk('head', spine, [0, 0.62, 0]);
    const uArmL = mk('uArmL', spine, [0.25, 0.5, 0]);
    const fArmL = mk('fArmL', uArmL, [0, -0.3, 0]);
    const uArmR = mk('uArmR', spine, [-0.25, 0.5, 0]);
    const fArmR = mk('fArmR', uArmR, [0, -0.3, 0]);
    const thighL = mk('thighL', hips, [0.11, -0.04, 0]);
    mk('shinL', thighL, [0, -0.44, 0]);
    const thighR = mk('thighR', hips, [-0.11, -0.04, 0]);
    mk('shinR', thighR, [0, -0.44, 0]);
    this.hand.position.set(0, -0.3, 0.02);
    fArmR.add(this.hand);
    this.handL.position.set(0, -0.3, 0.02);
    fArmL.add(this.handL);
    this.back.position.set(0, 0.25, -0.2);
    spine.add(this.back);

    const s = look.style;
    const robed = s === 'warden' || s === 'vesk';
    const dress = s === 'lyra';

    // --- hips / pelvis
    add('hips', xf(cyl(0.17, 0.15, 0.2), [0, -0.02, 0]), look.secondary);
    add('hips', xf(cyl(0.175, 0.175, 0.06), [0, 0.06, 0]), s === 'kael' || s === 'guard' || s === 'maren' ? '#3a2416' : look.accent); // belt
    if (s === 'kael' || s === 'guard' || s === 'maren') add('hips', xf(box(0.08, 0.06, 0.03), [0, 0.06, 0.17]), look.metal); // buckle
    if (dress) {
      add('hips', xf(cyl(0.17, 0.36, 0.62, 10), [0, -0.3, 0]), look.primary);
      add('hips', xf(cyl(0.362, 0.37, 0.05, 10), [0, -0.6, 0]), look.secondary);
      addGlow('hips', xf(cyl(0.372, 0.372, 0.018, 10), [0, -0.56, 0]));
    }
    if (robed) {
      add('hips', xf(cyl(0.2, 0.42, 0.85, 10), [0, -0.42, 0]), look.primary);
      add('hips', xf(cyl(0.43, 0.43, 0.06, 10), [0, -0.83, 0]), look.accent);
      add('hips', xf(box(0.16, 0.7, 0.02), [0, -0.4, 0.22], [-0.2, 0, 0]), look.secondary); // tabard
    }
    if (s === 'kael' || s === 'maren' || s === 'guard') {
      // tunic skirt flaps
      add('hips', xf(cyl(0.19, 0.25, 0.26, 8), [0, -0.12, 0]), look.primary);
    }

    // --- torso
    if (dress) {
      add('spine', xf(cyl(0.2, 0.15, 0.48), [0, 0.24, 0]), look.primary);
      add('spine', xf(cyl(0.15, 0.2, 0.08), [0, 0.5, 0]), look.secondary);
      addGlow('spine', xf(box(0.025, 0.36, 0.02), [0, 0.24, 0.17]));
      addGlow('spine', xf(box(0.22, 0.02, 0.02), [0, 0.38, 0.165]));
    } else {
      add('spine', xf(cyl(0.25, 0.18, 0.5), [0, 0.25, 0]), look.primary);
      add('spine', xf(cyl(0.2, 0.25, 0.08), [0, 0.53, 0]), look.primary);
    }
    add('spine', xf(cyl(0.07, 0.08, 0.1), [0, 0.6, 0]), look.skin); // neck
    if (s === 'kael') {
      add('spine', xf(box(0.06, 0.52, 0.02), [0.06, 0.28, 0.2], [0, 0, 0.5]), '#3a2416'); // strap
      // scarf collar
      add('spine', xf(new THREE.TorusGeometry(0.13, 0.06, 6, 10), [0, 0.56, 0], [Math.PI / 2, 0, 0]), look.accent);
      add('spine', xf(box(0.3, 0.05, 0.03), [0, 0.12, 0.19]), '#d8b04a'); // chest trim
    }
    if (s === 'guard' || s === 'maren') {
      add('spine', xf(cyl(0.255, 0.2, 0.36), [0, 0.32, 0]), look.metal); // cuirass
      add('spine', xf(box(0.08, 0.08, 0.02), [0, 0.35, 0.25]), look.accent);
    }
    if (robed) {
      add('spine', xf(cyl(0.3, 0.2, 0.5), [0, 0.27, 0]), look.primary);
      add('spine', xf(cyl(0.34, 0.3, 0.1), [0, 0.52, 0]), look.accent); // mantle
      add('spine', xf(box(0.12, 0.42, 0.02), [0, 0.28, 0.21]), look.secondary);
    }

    // --- head
    const isHelm = s === 'warden' || s === 'guard';
    if (!isHelm || s === 'guard') {
      add('head', xf(sph(0.2, 10, 8), [0, 0.18, 0.01], [0, 0, 0], [1, 1.08, 1]), look.skin);
      add('head', xf(sph(0.05, 6, 4), [0, 0.13, 0.2]), look.skin); // nose
      add('head', xf(sph(0.05, 6, 4), [0.2, 0.17, 0]), look.skin); // ears
      add('head', xf(sph(0.05, 6, 4), [-0.2, 0.17, 0]), look.skin);
    }
    if (s === 'kael') {
      add('head', xf(sph(0.215, 10, 6), [0, 0.25, -0.03], [0, 0, 0], [1.02, 0.85, 1.05]), look.hair);
      // tousled spikes
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 1.6 - 0.8;
        add('head', xf(cone(0.07, 0.2, 5), [Math.sin(a) * 0.14, 0.38, -Math.cos(a) * 0.12 + 0.04], [-0.5 + Math.cos(a) * 0.4, 0, Math.sin(a) * -0.6]), look.hair);
      }
      add('head', xf(cone(0.09, 0.22, 5), [0.06, 0.33, 0.15], [1.2, 0, -0.4]), look.hair); // fringe
      add('head', xf(cone(0.08, 0.2, 5), [-0.08, 0.33, 0.15], [1.25, 0, 0.5]), look.hair);
      add('head', xf(box(0.08, 0.018, 0.02), [0.075, 0.27, 0.19], [0, 0, -0.15]), look.hair); // brows
      add('head', xf(box(0.08, 0.018, 0.02), [-0.075, 0.27, 0.19], [0, 0, 0.15]), look.hair);
    }
    if (s === 'lyra') {
      add('head', xf(sph(0.22, 10, 6), [0, 0.23, -0.03], [0, 0, 0], [1.03, 0.92, 1.05]), look.hair);
      add('head', xf(box(0.42, 0.12, 0.1), [0, 0.3, 0.12], [0.3, 0, 0]), look.hair); // bangs
      add('head', xf(box(0.12, 0.42, 0.1), [0.18, 0.0, 0.04]), look.hair); // side locks
      add('head', xf(box(0.12, 0.42, 0.1), [-0.18, 0.0, 0.04]), look.hair);
      addGlow('head', xf(new THREE.OctahedronGeometry(0.035), [0, 0.3, 0.2])); // forehead sigil
      add('head', xf(box(0.07, 0.015, 0.02), [0.075, 0.26, 0.195], [0, 0, 0.1]), '#c9d4e4');
      add('head', xf(box(0.07, 0.015, 0.02), [-0.075, 0.26, 0.195], [0, 0, -0.1]), '#c9d4e4');
    }
    if (s === 'maren') {
      add('head', xf(sph(0.22, 10, 6), [0, 0.24, 0], [0, 0, 0], [1.05, 0.8, 1.08]), look.metal); // helm
      add('head', xf(box(0.04, 0.2, 0.32), [0, 0.42, -0.04]), '#c4302b'); // crest
      add('head', xf(box(0.08, 0.018, 0.02), [0.075, 0.25, 0.19], [0, 0, -0.2]), look.hair);
      add('head', xf(box(0.08, 0.018, 0.02), [-0.075, 0.25, 0.19], [0, 0, 0.2]), look.hair);
    }
    if (s === 'guard') {
      add('head', xf(sph(0.23, 8, 6), [0, 0.22, 0], [0, 0, 0], [1.05, 0.85, 1.08]), look.metal);
      add('head', xf(cyl(0.3, 0.3, 0.02, 10), [0, 0.15, 0]), look.metal);
    }
    if (s === 'warden') {
      // bronze bell helm: the Bellwarden silhouette
      const bell = new THREE.LatheGeometry(
        [new THREE.Vector2(0.0, 0.48), new THREE.Vector2(0.12, 0.46), new THREE.Vector2(0.2, 0.36), new THREE.Vector2(0.22, 0.15), new THREE.Vector2(0.28, -0.02), new THREE.Vector2(0.3, -0.06)],
        10,
      );
      add('head', xf(bell, [0, 0.08, 0]), look.metal);
      add('head', xf(sph(0.04, 6, 4), [0, 0.58, 0]), look.metal);
      addGlow('head', xf(box(0.26, 0.035, 0.03), [0, 0.2, 0.215]));
    }
    if (s === 'vesk') {
      add('head', xf(sph(0.2, 10, 8), [0, 0.18, 0], [0, 0, 0], [1, 1.12, 1]), look.skin);
      add('head', xf(cyl(0.16, 0.22, 0.26, 8), [0, 0.42, 0]), look.metal); // mitre
      add('head', xf(cone(0.16, 0.22, 8), [0, 0.66, 0]), look.metal);
      add('head', xf(box(0.36, 0.05, 0.06), [0, 0.06, 0.15]), look.hair); // beard band
      add('head', xf(cone(0.13, 0.3, 6), [0, -0.08, 0.13], [Math.PI, 0, 0]), look.hair); // beard
      add('head', xf(box(0.08, 0.02, 0.02), [0.075, 0.25, 0.19], [0, 0, -0.3]), '#777');
      add('head', xf(box(0.08, 0.02, 0.02), [-0.075, 0.25, 0.19], [0, 0, 0.3]), '#777');
      addGlow('head', xf(sph(0.035, 6, 4), [0, 0.45, 0.18]));
    }

    // --- arms
    const sleeve = dress ? look.secondary : robed ? look.primary : look.primary;
    for (const side of ['L', 'R'] as const) {
      const u = `uArm${side}`;
      const f = `fArm${side}`;
      add(u, xf(cap(0.075, 0.2), [0, -0.14, 0]), sleeve);
      add(f, xf(cap(0.065, 0.18), [0, -0.12, 0]), robed ? look.primary : dress ? look.skin : look.secondary);
      add(f, xf(sph(0.07, 6, 5), [0, -0.29, 0]), robed ? look.skin : s === 'lyra' ? look.skin : '#5a3a26'); // hand / glove
      if (robed) add(u, xf(cyl(0.1, 0.16, 0.28, 8), [0, -0.2, 0]), look.primary);
      if (dress) addGlow(f, xf(cyl(0.068, 0.068, 0.02, 8), [0, -0.2, 0]));
    }
    if (s === 'kael' || s === 'maren') {
      add('uArmR', xf(new THREE.SphereGeometry(0.13, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0.0, 0], [0, 0, 0], [1.1, 0.8, 1.1]), look.metal); // pauldron
      add('uArmR', xf(box(0.2, 0.02, 0.18), [0, -0.02, 0]), '#d8b04a');
      add('fArmL', xf(cyl(0.075, 0.08, 0.14, 8), [0, -0.16, 0]), '#5a3a26'); // bracers
      add('fArmR', xf(cyl(0.075, 0.08, 0.14, 8), [0, -0.16, 0]), '#5a3a26');
    }
    if (s === 'guard') add('uArmR', xf(new THREE.SphereGeometry(0.12, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0, 0]), look.metal);

    // --- legs
    for (const side of ['L', 'R'] as const) {
      const t = `thigh${side}`;
      const sh = `shin${side}`;
      add(t, xf(cap(0.09, 0.28), [0, -0.2, 0]), look.secondary);
      add(sh, xf(cap(0.075, 0.26), [0, -0.18, 0]), dress ? look.skin : look.secondary);
      add(sh, xf(cyl(0.09, 0.1, 0.24), [0, -0.3, 0]), look.boots); // boot
      add(sh, xf(box(0.14, 0.08, 0.26), [0, -0.44, 0.05]), look.boots); // foot
    }

    // --- build merged meshes
    for (const [bone, list] of Object.entries(parts)) {
      const geos = list.map((p) => colorize(p.geo.index ? p.geo.toNonIndexed() : p.geo, p.color));
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeVertexNormals();
      const mesh = new THREE.Mesh(merged, toonVC);
      mesh.castShadow = true;
      mesh.receiveShadow = false;
      this.bones[bone as JointName].add(mesh);
      if (look.outline !== false) {
        const o = new THREE.Mesh(merged, outlineMat);
        this.bones[bone as JointName].add(o);
      }
    }
    for (const [bone, list] of Object.entries(glow)) {
      const merged = mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => { g.deleteAttribute('uv'); return g; }), false);
      if (!merged) continue;
      const gc = new THREE.Color(look.accent).multiplyScalar(s === 'lyra' ? 2.2 : 2.6);
      const mat = new THREE.MeshBasicMaterial({ color: gc });
      this.glowMats.push(mat);
      this.bones[bone as JointName].add(new THREE.Mesh(merged, mat)); // emissive trim never casts shadows
    }

    // eyes + mouth (separate so they can blink / talk)
    const eyeGeo = mergeGeometries([
      xf(sph(0.034, 6, 6), [0.075, 0.19, 0.185], [0, 0, 0], [0.8, 1.25, 0.6]).toNonIndexed(),
      xf(sph(0.034, 6, 6), [-0.075, 0.19, 0.185], [0, 0, 0], [0.8, 1.25, 0.6]).toNonIndexed(),
    ])!;
    eyeGeo.translate(0, -0.19, 0);
    this.eyes = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: s === 'lyra' ? '#2a6f86' : '#1a1218' }));
    this.eyes.position.y = 0.19;
    const mouthGeo = xf(box(0.07, 0.02, 0.02), [0, 0, 0]);
    this.mouth = new THREE.Mesh(mouthGeo, new THREE.MeshBasicMaterial({ color: '#5a2228' }));
    this.mouth.position.set(0, 0.07, 0.19);
    if (s !== 'warden') {
      head.add(this.eyes);
      head.add(this.mouth);
    }

    // trailing cloth: scarf (Kael), hair (Lyra), cape (Maren/Vesk)
    if (s === 'kael' || s === 'lyra' || s === 'maren' || s === 'vesk') {
      this.trail = new THREE.Group();
      const n = s === 'kael' ? 4 : s === 'lyra' ? 4 : 3;
      const color = s === 'kael' ? look.accent : s === 'lyra' ? look.hair : s === 'maren' ? '#c4302b' : look.secondary;
      const w = s === 'kael' ? 0.12 : s === 'lyra' ? 0.3 : 0.5;
      const len = s === 'kael' ? 0.2 : s === 'lyra' ? 0.16 : 0.32;
      let parent: THREE.Object3D = this.trail;
      for (let i = 0; i < n; i++) {
        const seg = new THREE.Group();
        seg.position.y = i === 0 ? 0 : -len;
        const g = colorize(xf(box(w * (1 - i * 0.12), len, 0.03), [0, -len / 2, 0]).toNonIndexed(), new THREE.Color(color));
        const m = new THREE.Mesh(g, toonVC);
        m.castShadow = true;
        seg.add(m);
        parent.add(seg);
        this.trailSegs.push(seg);
        parent = seg;
      }
      if (s === 'kael') {
        this.trail.position.set(0.08, 0.56, -0.14);
        spine.add(this.trail);
      } else if (s === 'lyra') {
        this.trail.position.set(0, 0.24, -0.17);
        head.add(this.trail);
      } else {
        this.trail.position.set(0, 0.55, -0.22);
        spine.add(this.trail);
      }
    }

    this.shadow = blobShadow(0.45, 0.4);
    this.shadow.position.y = 0.02;
    this.root.add(this.shadow);
    this.capturePose(this.pose);
  }

  attachWeapon(kind: 'sword' | 'halberd' | 'hammer'): void {
    const g = new THREE.Group();
    const steel = new THREE.MeshStandardMaterial({ color: '#d9e2ea', metalness: 0.9, roughness: 0.25 });
    const gold = new THREE.MeshStandardMaterial({ color: '#d6a24a', metalness: 0.9, roughness: 0.35 });
    const wood = new THREE.MeshToonMaterial({ color: '#5a3a22', gradientMap: getToonRamp() });
    if (kind === 'sword') {
      // merged per material: 3 draw calls for the whole sword
      const blade = new THREE.Mesh(mergeGeometries([xf(new THREE.BoxGeometry(0.06, 0.95, 0.018), [0, 0.6, 0]).toNonIndexed(), xf(new THREE.ConeGeometry(0.043, 0.14, 4), [0, 1.14, 0], [0, Math.PI / 4, 0], [1, 1, 0.3]).toNonIndexed()])!, steel);
      const guard = new THREE.Mesh(mergeGeometries([xf(new THREE.BoxGeometry(0.3, 0.05, 0.06), [0, 0.11, 0]).toNonIndexed(), xf(new THREE.SphereGeometry(0.04, 6, 4), [0, -0.11, 0]).toNonIndexed()])!, gold);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 6), wood);
      g.add(blade, guard, grip);
    } else if (kind === 'halberd') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.1, 6), wood);
      shaft.position.y = 0.5;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.03), gold);
      head.position.set(0.12, 1.45, 0);
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.35, 4), steel);
      spike.position.y = 1.72;
      g.add(shaft, head, spike);
    } else {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), wood);
      shaft.position.y = 0.4;
      const bell = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0, 0.3), new THREE.Vector2(0.18, 0.25), new THREE.Vector2(0.25, 0), new THREE.Vector2(0.32, -0.15)], 10), gold);
      bell.rotation.z = Math.PI / 2;
      bell.position.y = 1.25;
      g.add(shaft, bell);
    }
    g.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
    g.rotation.x = Math.PI / 2;
    g.position.z = 0.02;
    this.hand.add(g);
    this.weapon = g;
  }

  setGlow(intensity: number): void {
    for (const m of this.glowMats) {
      m.color.set(this.look.accent).multiplyScalar(intensity);
    }
  }

  setMode(mode: AnimMode, blend = 0.18): void {
    if (mode === this.mode) return;
    this.lastMode = this.mode;
    this.mode = mode;
    this.modeT = 0;
    this.modeP = 0;
    this.capturePose(this.prevPose);
    this.blendT = blend > 0 ? 0 : 1;
    this.blendDur = blend;
  }
  private blendDur = 0.18;

  /** Restart the current mode (e.g. a second attack in a combo). */
  restartMode(blend = 0.08): void {
    this.capturePose(this.prevPose);
    this.modeT = 0;
    this.blendT = 0;
    this.blendDur = blend;
  }

  get previousMode(): AnimMode {
    return this.lastMode;
  }

  private capturePose(p: Pose): void {
    JOINTS.forEach((j, i) => {
      const b = this.bones[j];
      p.r[i * 3] = b.rotation.x;
      p.r[i * 3 + 1] = b.rotation.y;
      p.r[i * 3 + 2] = b.rotation.z;
    });
    p.bob = this.bones.hips.position.y - 0.95;
    p.bodyPitch = this.body.rotation.x;
    p.bodyRoll = this.body.rotation.z;
  }

  snapYaw(y: number): void {
    this.yaw = this.targetYaw = y;
    this.root.rotation.y = y;
  }

  place(p: THREE.Vector3, yaw?: number): void {
    this.root.position.copy(p);
    this.lastPos.copy(p);
    if (yaw !== undefined) this.snapYaw(yaw);
  }

  update(dt: number, time: number): void {
    this.modeT += dt;
    if (dt > 0) {
      this.velocity.subVectors(this.root.position, this.lastPos).divideScalar(Math.max(dt, 1e-4));
    }
    this.lastPos.copy(this.root.position);
    this.yaw = dampAngle(this.yaw, this.targetYaw, 12, dt);
    this.root.rotation.y = this.yaw;

    const tp = this.targetPose;
    tp.r.fill(0);
    tp.bob = 0;
    tp.bodyPitch = 0;
    tp.bodyRoll = 0;
    this.computePose(tp, time, dt);

    // blend from captured previous pose into the live target
    this.blendT = Math.min(1, this.blendT + dt / Math.max(0.001, this.blendDur));
    const k = this.blendT * this.blendT * (3 - 2 * this.blendT);
    const p = this.pose;
    for (let i = 0; i < p.r.length; i++) p.r[i] = lerp(this.prevPose.r[i], tp.r[i], k);
    p.bob = lerp(this.prevPose.bob, tp.bob, k);
    p.bodyPitch = lerp(this.prevPose.bodyPitch, tp.bodyPitch, k);
    p.bodyRoll = lerp(this.prevPose.bodyRoll, tp.bodyRoll, k);
    JOINTS.forEach((j, i) => this.bones[j].rotation.set(p.r[i * 3], p.r[i * 3 + 1], p.r[i * 3 + 2]));
    this.bones.hips.position.y = 0.95 + p.bob;
    this.body.rotation.x = p.bodyPitch;
    this.body.rotation.z = p.bodyRoll;

    // head look-at (additive, clamped)
    if (this.lookAtTarget && this.mode !== 'lie' && this.mode !== 'fall') {
      const hp = new THREE.Vector3();
      this.bones.head.getWorldPosition(hp);
      const d = this.lookAtTarget.clone().sub(hp);
      const localYaw = Math.atan2(d.x, d.z) - this.yaw;
      let ly = localYaw;
      while (ly > Math.PI) ly -= Math.PI * 2;
      while (ly < -Math.PI) ly += Math.PI * 2;
      const pitch = -Math.atan2(d.y, Math.hypot(d.x, d.z));
      this.bones.head.rotation.y += clamp(ly, -1.1, 1.1);
      this.bones.head.rotation.x += clamp(pitch, -0.6, 0.5);
    }

    // face: blink + talk
    this.blink -= dt;
    let eyeScale = 1;
    if (this.blink < 0.12) eyeScale = Math.abs(this.blink - 0.06) / 0.06;
    if (this.blink < 0) this.blink = 2 + Math.random() * 3;
    if (this.mode === 'lie') eyeScale = 0.1;
    this.eyes.scale.y = Math.max(0.1, eyeScale);
    if (this.talking > 0) {
      this.talking -= dt;
      this.mouth.scale.y = 1 + Math.abs(Math.sin(time * 18)) * 2.5;
    } else this.mouth.scale.y = 1;

    // shadow follows feet on the ground plane
    this.shadow.position.y = 0.02 - this.root.position.y + this.groundY;
    const h = this.root.position.y - this.groundY;
    const s = clamp(1 - h * 0.15, 0.4, 1);
    this.shadow.scale.setScalar(s);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.4 * s;

    this.updateTrail(dt, time);
  }

  groundY = 0;

  private updateTrail(dt: number, time: number): void {
    if (!this.trail) return;
    const v = this.velocity;
    // world velocity -> local; cloth swings opposite to motion
    const cos = Math.cos(-this.yaw);
    const sin = Math.sin(-this.yaw);
    const lz = v.x * sin + v.z * cos;
    const lx = v.x * cos - v.z * sin;
    const targetX = clamp(lz * 0.16, -0.2, 1.35) + 0.15 + (this.mode === 'fall' ? -1.2 : 0);
    const targetZ = clamp(-lx * 0.08, -0.6, 0.6);
    this.trailAngle.x += (targetX - this.trailAngle.x) * damp(6, dt);
    this.trailAngle.y += (targetZ - this.trailAngle.y) * damp(6, dt);
    const flutter = Math.min(1, v.length() / 6);
    this.trailSegs.forEach((seg, i) => {
      seg.rotation.x = (i === 0 ? this.trailAngle.x : this.trailAngle.x * 0.22) + Math.sin(time * 14 - i * 1.3) * 0.12 * flutter;
      seg.rotation.z = this.trailAngle.y * (i === 0 ? 1 : 0.3) + Math.sin(time * 9 - i) * 0.05 * flutter;
    });
  }

  private set(p: Pose, j: JointName, x: number, y = 0, z = 0): void {
    const i = JOINTS.indexOf(j) * 3;
    p.r[i] = x;
    p.r[i + 1] = y;
    p.r[i + 2] = z;
  }

  private computePose(p: Pose, time: number, dt: number): void {
    const S = (j: JointName, x: number, y = 0, z = 0) => this.set(p, j, x, y, z);
    const t = this.modeT;
    const breathe = Math.sin(time * 1.8) * 0.03;
    switch (this.mode) {
      case 'idle': {
        S('spine', breathe * 0.5, 0, 0);
        S('head', -breathe * 0.4, Math.sin(time * 0.4) * 0.08);
        S('uArmL', 0.05, 0, -0.12 - breathe);
        S('uArmR', 0.05, 0, 0.12 + breathe);
        S('fArmL', -0.15);
        S('fArmR', -0.25);
        S('thighL', 0.02, 0, 0.04);
        S('thighR', -0.04, 0, -0.04);
        S('shinR', 0.06);
        p.bob = breathe * 0.2;
        if (this.talking > 0) {
          S('uArmR', -0.3 + Math.sin(time * 3) * 0.15, 0, 0.3);
          S('fArmR', -0.9);
        }
        break;
      }
      case 'locomotion': {
        const sp = this.speed;
        const run = clamp((sp - 2.2) / 3.5, 0, 1);
        const freq = lerp(1.7, 2.75, run) * (sp > 0.1 ? 1 : 0);
        this.phase += dt * freq * Math.PI * 2 * clamp(sp / 2.2, 0.4, 1.6) * lerp(1, 0.75, run);
        const ph = this.phase;
        const sw = lerp(0.45, 0.95, run) * clamp(sp / 1.5, 0, 1);
        const sinp = Math.sin(ph);
        S('thighL', -sinp * sw, 0, 0.03);
        S('thighR', sinp * sw, 0, -0.03);
        S('shinL', Math.max(0, Math.cos(ph)) * sw * 1.5 + 0.1);
        S('shinR', Math.max(0, -Math.cos(ph)) * sw * 1.5 + 0.1);
        S('uArmL', sinp * sw * 0.8, 0, -0.12);
        S('uArmR', -sinp * sw * 0.8, 0, 0.12);
        S('fArmL', -0.3 - run * 1.0);
        S('fArmR', -0.3 - run * 1.0);
        S('spine', 0.08 + run * 0.22, sinp * 0.12 * sw, 0);
        S('head', -0.05 - run * 0.15, -sinp * 0.08 * sw);
        p.bob = -Math.abs(Math.cos(ph)) * 0.06 * (0.5 + run) + 0.02;
        p.bodyRoll = 0;
        const sign = Math.sign(sinp);
        if (sign !== this.lastStepSign && sp > 0.5) {
          this.lastStepSign = sign;
          this.onStep?.(sign);
        }
        break;
      }
      case 'jump': {
        S('thighL', -0.9);
        S('shinL', 1.3);
        S('thighR', -0.2);
        S('shinR', 0.6);
        S('uArmL', -2.2, 0, -0.3);
        S('uArmR', -0.5, 0, 0.6);
        S('fArmL', -0.4);
        S('fArmR', -0.6);
        S('spine', 0.15);
        S('head', 0.1);
        break;
      }
      case 'attack': {
        const v = this.attackVariant % 3;
        const a = clamp(t / 0.32, 0, 1);
        const wind = a < 0.3 ? a / 0.3 : 1;
        const strike = a < 0.3 ? 0 : (a - 0.3) / 0.7;
        const e = 1 - Math.pow(1 - strike, 3);
        if (v === 0) {
          S('uArmR', lerp(-1.2 * wind, -1.0, e), lerp(0.9 * wind, -1.2, e), lerp(0.6, 1.6, e) * wind);
          S('fArmR', -0.5);
          S('spine', 0.1, lerp(0.6 * wind, -0.7, e));
        } else if (v === 1) {
          S('uArmR', lerp(-1.4 * wind, -1.2, e), lerp(-1.0 * wind, 1.1, e), lerp(1.2, 0.4, e));
          S('fArmR', -0.4);
          S('spine', 0.1, lerp(-0.6 * wind, 0.7, e));
        } else {
          S('uArmR', lerp(-2.9 * wind, -0.6, e), 0, 0.2);
          S('uArmL', lerp(-2.9 * wind, -0.6, e), 0, -0.2);
          S('fArmR', -0.3);
          S('fArmL', -0.3);
          S('spine', lerp(-0.25 * wind, 0.45, e));
        }
        S('uArmL', v < 2 ? -0.4 : this.get(p, 'uArmL'), 0, -0.6);
        S('thighL', -0.6, 0, 0.1);
        S('shinL', 0.6);
        S('thighR', 0.4, 0, -0.1);
        S('shinR', 0.3);
        p.bob = -0.1;
        break;
      }
      case 'hurt': {
        const a = clamp(t / 0.35, 0, 1);
        const k = Math.sin(a * Math.PI);
        S('spine', -0.5 * k);
        S('head', -0.4 * k);
        S('uArmL', -0.6 * k, 0, -0.8 * k);
        S('uArmR', -0.6 * k, 0, 0.8 * k);
        S('thighL', -0.3 * k);
        S('shinL', 0.5 * k);
        p.bob = -0.05 * k;
        break;
      }
      case 'dodge': {
        const a = clamp(t / 0.45, 0, 1);
        p.bodyPitch = a * Math.PI * 2;
        S('thighL', -1.8);
        S('thighR', -1.8);
        S('shinL', 2.2);
        S('shinR', 2.2);
        S('uArmL', -1.2, 0, -0.3);
        S('uArmR', -1.2, 0, 0.3);
        S('spine', 0.8);
        S('head', 0.6);
        p.bob = -0.4 * Math.sin(a * Math.PI);
        break;
      }
      case 'slide': {
        p.bodyPitch = -0.9;
        S('thighL', -1.2);
        S('shinL', 0.2);
        S('thighR', -0.6);
        S('shinR', 1.6);
        S('uArmL', -0.5, 0, -1.2);
        S('uArmR', 0.6, 0, 0.8);
        S('spine', 0.5);
        S('head', 0.6);
        p.bob = -0.55;
        break;
      }
      case 'sit': {
        S('thighL', -1.5, 0.2);
        S('thighR', -1.5, -0.2);
        S('shinL', 1.6);
        S('shinR', 1.6);
        S('spine', 0.15 + breathe);
        S('uArmL', -0.7, 0, -0.1);
        S('uArmR', -0.7, 0, 0.1);
        S('fArmL', -0.9);
        S('fArmR', -0.9);
        S('head', 0.05 + Math.sin(time * 0.5) * 0.03);
        p.bob = -0.62;
        break;
      }
      case 'climb': {
        const ph = this.phase;
        if (this.speed > 0.05) this.phase += dt * 5 * this.speed;
        const s = Math.sin(ph);
        S('uArmL', -2.6 - s * 0.35, 0, -0.25);
        S('uArmR', -2.6 + s * 0.35, 0, 0.25);
        S('fArmL', -0.5 - Math.max(0, s) * 0.6);
        S('fArmR', -0.5 - Math.max(0, -s) * 0.6);
        S('thighL', -0.7 + s * 0.5, 0, 0.15);
        S('thighR', -0.7 - s * 0.5, 0, -0.15);
        S('shinL', 1.1);
        S('shinR', 1.1);
        S('head', -0.45);
        S('spine', -0.05);
        break;
      }
      case 'hang': {
        S('uArmL', -2.9, 0, -0.15);
        S('uArmR', -2.9, 0, 0.15);
        S('fArmL', -0.1);
        S('fArmR', -0.1);
        S('thighL', -0.2 + Math.sin(time * 4) * 0.25);
        S('thighR', -0.2 - Math.sin(time * 4) * 0.25);
        S('shinL', 0.4);
        S('shinR', 0.4);
        S('head', -0.3);
        break;
      }
      case 'brace': {
        // clinging tight to a surface while the giant steps
        S('uArmL', -2.4, 0, -0.5);
        S('uArmR', -2.4, 0, 0.5);
        S('fArmL', -1.4);
        S('fArmR', -1.4);
        S('thighL', -1.0, 0, 0.2);
        S('thighR', -1.0, 0, -0.2);
        S('shinL', 1.6);
        S('shinR', 1.6);
        S('head', 0.3);
        S('spine', 0.25);
        break;
      }
      case 'ride': {
        const b = Math.sin(time * 11) * 0.04 * clamp(this.speed / 10, 0, 1);
        S('thighL', -1.3, 0, 0.45);
        S('thighR', -1.3, 0, -0.45);
        S('shinL', 1.3);
        S('shinR', 1.3);
        S('spine', 0.3 + b * 2);
        S('uArmL', -0.9, 0, -0.1);
        S('uArmR', -0.9, 0, 0.1);
        S('fArmL', -0.9);
        S('fArmR', -0.9);
        S('head', -0.25);
        p.bob = -0.35 + b;
        break;
      }
      case 'fall': {
        p.bodyPitch = 1.35;
        const w = Math.sin(time * 9) * 0.06;
        S('uArmL', -0.3 + w, 0, -1.4);
        S('uArmR', -0.3 - w, 0, 1.4);
        S('fArmL', -0.4);
        S('fArmR', -0.4);
        S('thighL', 0.35 + w, 0, 0.25);
        S('thighR', 0.35 - w, 0, -0.25);
        S('shinL', 0.9);
        S('shinR', 0.9);
        S('head', -1.0);
        break;
      }
      case 'float': {
        S('head', -0.5);
        S('uArmL', 0.1, 0, -0.6 + Math.sin(time) * 0.05);
        S('uArmR', 0.1, 0, 0.6 - Math.sin(time) * 0.05);
        S('fArmL', -0.2);
        S('fArmR', -0.2);
        S('thighL', 0.1);
        S('shinL', 0.4);
        S('thighR', -0.05);
        S('shinR', 0.2);
        S('spine', -0.25);
        break;
      }
      case 'lie': {
        p.bodyPitch = -Math.PI / 2;
        S('head', 0.6);
        S('uArmL', 0.4, 0, -0.5);
        S('uArmR', 0.2, 0, 0.3);
        S('thighL', -0.5);
        S('shinL', 0.8);
        S('thighR', -0.3);
        S('shinR', 0.5);
        p.bob = -0.4;
        break;
      }
      case 'carry': {
        S('uArmL', -1.2, 0, -0.1);
        S('uArmR', -1.2, 0, 0.1);
        S('fArmL', -1.0, 0, 0);
        S('fArmR', -1.0, 0, 0);
        S('spine', -0.08 + breathe);
        S('thighL', -0.2, 0, 0.1);
        S('thighR', 0.1, 0, -0.1);
        S('shinL', 0.3);
        p.bob = -0.05;
        break;
      }
      case 'piggy': {
        S('uArmL', -1.6, 0, 0.5);
        S('uArmR', -1.6, 0, -0.5);
        S('fArmL', -1.3);
        S('fArmR', -1.3);
        S('thighL', -1.4, 0, 0.6);
        S('thighR', -1.4, 0, -0.6);
        S('shinL', 1.2);
        S('shinR', 1.2);
        S('head', 0.15);
        break;
      }
      case 'kneel': {
        S('thighL', -1.5);
        S('shinL', 1.5);
        S('thighR', 0.3);
        S('shinR', 1.85);
        S('spine', 0.25 + breathe);
        S('head', 0.3);
        S('uArmL', -0.8, 0, -0.1);
        S('uArmR', -0.4, 0, 0.1);
        S('fArmL', -0.6);
        p.bob = -0.48;
        break;
      }
      case 'reach': {
        const a = clamp(t / 1.2, 0, 1);
        S('uArmR', -1.5 * a, 0, 0.1);
        S('fArmR', -0.1);
        S('uArmL', -0.2, 0, -0.2);
        S('spine', 0.1 * a);
        S('head', -0.1);
        S('thighL', -0.3);
        S('shinL', 0.3);
        break;
      }
      case 'point': {
        S('uArmR', -1.6, 0.3, 0.1);
        S('fArmR', -0.05);
        S('uArmL', 0.1, 0, -0.15);
        S('head', -0.1, 0.2);
        break;
      }
      case 'raise': {
        // arms raised in invocation (Vesk / Lyra singing to the machines)
        const k = clamp(t / 0.8, 0, 1);
        S('uArmL', -2.6 * k, 0, -0.5 * k);
        S('uArmR', -2.6 * k, 0, 0.5 * k);
        S('fArmL', -0.2);
        S('fArmR', -0.2);
        S('head', -0.45 * k);
        S('spine', -0.12 * k);
        break;
      }
      case 'cower': {
        S('spine', 0.6);
        S('head', 0.5);
        S('uArmL', -1.9, 0, 0.4);
        S('uArmR', -1.9, 0, -0.4);
        S('fArmL', -1.8);
        S('fArmR', -1.8);
        S('thighL', -1.3);
        S('thighR', -1.3);
        S('shinL', 2.1);
        S('shinR', 2.1);
        p.bob = -0.55;
        break;
      }
      case 'dead': {
        p.bodyPitch = -Math.PI / 2;
        S('head', 0.3, 0.6);
        S('uArmL', -1.2, 0, -1);
        S('uArmR', -0.4, 0, 1.2);
        p.bob = -0.8;
        break;
      }
    }
  }

  private get(p: Pose, j: JointName): number {
    return p.r[JOINTS.indexOf(j) * 3];
  }

  say(seconds: number): void {
    this.talking = seconds;
  }

  dispose(): void {
    this.root.removeFromParent();
  }
}
