import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { prep, roundedGeo } from '../world/Geo';
import { dreamify, dreamUniforms } from '../render/DreamShading';
import { damp, dampAngle } from '../core/math';

export type JointName =
  | 'hips' | 'spine' | 'chest' | 'neck' | 'head'
  | 'shoulderL' | 'elbowL' | 'handL' | 'shoulderR' | 'elbowR' | 'handR'
  | 'thighL' | 'kneeL' | 'footL' | 'thighR' | 'kneeR' | 'footR';

export const JOINTS: JointName[] = [
  'hips', 'spine', 'chest', 'neck', 'head',
  'shoulderL', 'elbowL', 'handL', 'shoulderR', 'elbowR', 'handR',
  'thighL', 'kneeL', 'footL', 'thighR', 'kneeR', 'footR',
];

export type FaceStyle = 'ori' | 'simple' | 'mask' | 'none' | 'void' | 'husk';
export type Expression = 'happy' | 'neutral' | 'curious' | 'worried' | 'scared' | 'sad' | 'determined' | 'surprised';

export interface RigStyle {
  scale?: number;
  headSize?: number;
  bodyW?: number;
  legLen?: number;
  armLen?: number;
  torsoLen?: number;
  skin?: THREE.ColorRepresentation;
  top?: THREE.ColorRepresentation;
  topAccent?: THREE.ColorRepresentation;
  bottom?: THREE.ColorRepresentation;
  shoes?: THREE.ColorRepresentation;
  hair?: THREE.ColorRepresentation;
  hat?: 'courier' | 'top' | 'beanie' | 'bowler' | 'nurse' | 'none';
  hatColor?: THREE.ColorRepresentation;
  face?: FaceStyle;
  maskColor?: THREE.ColorRepresentation;
  scarf?: THREE.ColorRepresentation | null;
  bag?: boolean;
  lantern?: boolean;
  umbrella?: THREE.ColorRepresentation | null;
  briefcase?: boolean;
  skirt?: boolean;
  material?: 'normal' | 'static' | 'void' | 'mannequin' | 'faded';
  eyeGlow?: THREE.ColorRepresentation;
}

export type Pose = Record<JointName, THREE.Euler>;

export function emptyPose(): Pose {
  const p = {} as Pose;
  for (const j of JOINTS) p[j] = new THREE.Euler();
  return p;
}

const charMats = new Map<string, THREE.Material>();
export function charMaterial(kind: RigStyle['material'] = 'normal'): THREE.Material {
  const k = kind ?? 'normal';
  const hit = charMats.get(k);
  if (hit) return hit;
  let m: THREE.Material;
  if (k === 'static') {
    const sm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    dreamify(sm);
    const base = sm.onBeforeCompile;
    sm.onBeforeCompile = (shader, r) => {
      base(shader, r);
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         float sn = fract(sin(dot(floor(gl_FragCoord.xy / 3.0) + floor(uTimeS * 24.0), vec2(12.9898, 78.233))) * 43758.5453);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(sn), 0.55);
         if (sn > 0.93) discard;`,
      ).replace('void main() {', 'uniform float uTimeS;\nvoid main() {');
      shader.uniforms.uTimeS = dreamUniforms.uTime;
    };
    sm.customProgramCacheKey = () => 'char-static';
    m = sm;
  } else if (k === 'void') {
    const vm = new THREE.MeshStandardMaterial({ color: '#05030a', roughness: 1, metalness: 0, emissive: '#000000' });
    dreamify(vm, { rim: true, wobble: false });
    const base = vm.onBeforeCompile;
    vm.onBeforeCompile = (shader, r) => {
      base(shader, r);
      shader.uniforms.uTimeV = dreamUniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', 'uniform float uTimeV;\nvoid main() {')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          transformed += normal * (sin(position.y * 18.0 + uTimeV * 9.0) * 0.025 + sin(position.x * 23.0 - uTimeV * 13.0) * 0.02);`);
      // inverted rim: void edges glow pale
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `{ float rr = 1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
           gl_FragColor.rgb = mix(vec3(0.0), vec3(0.75, 0.7, 0.95), pow(rr, 4.0) * 0.9); }
         #include <dithering_fragment>`,
      );
    };
    vm.customProgramCacheKey = () => 'char-void';
    m = vm;
  } else if (k === 'mannequin') {
    m = dreamify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.05 }));
  } else if (k === 'faded') {
    m = dreamify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, transparent: true, opacity: 0.88 }));
  } else {
    m = dreamify(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0 }));
  }
  charMats.set(k, m);
  return m;
}

const glowMat = dreamify(new THREE.MeshBasicMaterial({ vertexColors: true, color: new THREE.Color(2.4, 2.4, 2.4), toneMapped: false }), { rim: false });
const eyeMat = new THREE.MeshBasicMaterial({ vertexColors: true });

type Part = { geo: THREE.BufferGeometry; color: THREE.ColorRepresentation; top?: THREE.ColorRepresentation; pos?: [number, number, number]; rot?: [number, number, number]; scale?: [number, number, number]; glow?: boolean };

function bake(parts: Part[], ao = 0.12): { normal: THREE.BufferGeometry | null; glow: THREE.BufferGeometry | null } {
  const n: THREE.BufferGeometry[] = [];
  const g: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  for (const p of parts) {
    const geo = prep(p.geo, p.color, p.glow ? 0 : ao, p.top);
    q.setFromEuler(new THREE.Euler(...(p.rot ?? [0, 0, 0])));
    m.compose(new THREE.Vector3(...(p.pos ?? [0, 0, 0])), q, new THREE.Vector3(...(p.scale ?? [1, 1, 1])));
    geo.applyMatrix4(m);
    (p.glow ? g : n).push(geo);
  }
  return { normal: n.length ? mergeGeometries(n) : null, glow: g.length ? mergeGeometries(g) : null };
}

const cap = (r: number, len: number) => new THREE.CapsuleGeometry(r, Math.max(0.001, len), 4, 10);
const sph = (r: number, ws = 16, hs = 12) => new THREE.SphereGeometry(r, ws, hs);

interface FaceParts {
  eyes: THREE.Mesh;
  brows: THREE.Group;
  browL: THREE.Mesh;
  browR: THREE.Mesh;
  mouths: Record<'smile' | 'flat' | 'o' | 'frown', THREE.Mesh>;
}

/** Spring chain (verlet) for scarf tails. */
class Ribbon {
  readonly pts: THREE.Vector3[] = [];
  readonly prev: THREE.Vector3[] = [];
  readonly mesh: THREE.Mesh;
  private readonly geo: THREE.BufferGeometry;
  constructor(n: number, readonly seg: number, readonly width: number, color: THREE.ColorRepresentation, material: THREE.Material) {
    for (let i = 0; i < n; i++) {
      this.pts.push(new THREE.Vector3());
      this.prev.push(new THREE.Vector3());
    }
    this.geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 2 * 3);
    const nor = new Float32Array(n * 2 * 3);
    const col = new Float32Array(n * 2 * 3);
    const c = new THREE.Color(color);
    for (let i = 0; i < n * 2; i++) {
      const k = 1 - (Math.floor(i / 2) / n) * 0.25;
      col.set([c.r * k, c.g * k, c.b * k], i * 3);
      nor.set([0, 1, 0], i * 3);
    }
    const idx: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      const a = i * 2, b2 = i * 2 + 1, cc = i * 2 + 2, d = i * 2 + 3;
      idx.push(a, cc, b2, b2, cc, d);
    }
    this.geo.setIndex(idx);
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = true;
  }
  reset(anchor: THREE.Vector3, dir: THREE.Vector3): void {
    for (let i = 0; i < this.pts.length; i++) {
      this.pts[i].copy(anchor).addScaledVector(dir, i * this.seg);
      this.prev[i].copy(this.pts[i]);
    }
  }
  update(dt: number, anchor: THREE.Vector3, side: THREE.Vector3, wind: THREE.Vector3, bodyCenter: THREE.Vector3, bodyR: number): void {
    const n = this.pts.length;
    this.pts[0].copy(anchor);
    this.prev[0].copy(anchor);
    const dt2 = dt * dt;
    for (let i = 1; i < n; i++) {
      const p = this.pts[i];
      const v = p.clone().sub(this.prev[i]).multiplyScalar(0.94);
      this.prev[i].copy(p);
      p.add(v);
      p.y -= 9.8 * dt2 * 0.6;
      p.addScaledVector(wind, dt2);
    }
    for (let it = 0; it < 4; it++) {
      for (let i = 1; i < n; i++) {
        const a = this.pts[i - 1], b = this.pts[i];
        const d = b.clone().sub(a);
        const len = d.length() || 1e-5;
        const diff = (len - this.seg) / len;
        if (i === 1) b.addScaledVector(d, -diff);
        else {
          a.addScaledVector(d, diff * 0.5);
          b.addScaledVector(d, -diff * 0.5);
        }
      }
      for (let i = 1; i < n; i++) {
        const p = this.pts[i];
        const d = p.clone().sub(bodyCenter);
        const l = d.length();
        if (l < bodyR) p.addScaledVector(d, (bodyR - l) / (l || 1));
      }
    }
    const pos = this.geo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < n; i++) {
      const w = this.width * (1 - (i / n) * 0.3);
      pos.setXYZ(i * 2, this.pts[i].x - side.x * w, this.pts[i].y - side.y * w, this.pts[i].z - side.z * w);
      pos.setXYZ(i * 2 + 1, this.pts[i].x + side.x * w, this.pts[i].y + side.y * w, this.pts[i].z + side.z * w);
    }
    pos.needsUpdate = true;
    this.geo.computeVertexNormals();
  }
}

/**
 * A stylised humanoid built from merged per-joint geometry, posed by a damped
 * procedural pose system. Faces +Z in local space.
 */
export class Rig {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly j = {} as Record<JointName, THREE.Bone>;
  /** The single skinned body mesh (all rigid parts, one draw call). */
  skinned!: THREE.SkinnedMesh;
  skinnedGlow?: THREE.SkinnedMesh;
  readonly pose: Pose = emptyPose();
  readonly target: Pose = emptyPose();
  hipsBaseY: number;
  hipsOffsetY = 0;
  targetHipsOffsetY = 0;
  readonly style: Required<Pick<RigStyle, 'scale' | 'headSize' | 'legLen' | 'armLen' | 'torsoLen' | 'bodyW'>> & RigStyle;
  face?: FaceParts;
  private blinkT = 2;
  private blinking = 0;
  expression: Expression = 'neutral';
  private ribbons: Ribbon[] = [];
  readonly bag?: THREE.Group;
  bagParcel?: THREE.Mesh;
  private bagAngle = 0;
  private bagVel = 0;
  private lastPos = new THREE.Vector3();
  private lastVel = new THREE.Vector3();
  readonly lantern?: THREE.Mesh;
  lookYaw = 0;
  lookPitch = 0;
  private headYaw = 0;
  private headPitch = 0;
  /** Joint damping rate; higher = snappier. */
  stiffness = 22;
  private readonly matNormal: THREE.Material;
  readonly squash = new THREE.Vector3(1, 1, 1);
  private readonly squashTarget = new THREE.Vector3(1, 1, 1);

  constructor(style: RigStyle = {}) {
    this.style = {
      scale: 1, headSize: 0.27, legLen: 0.72, armLen: 0.58, torsoLen: 0.44, bodyW: 0.36,
      skin: '#ffd9c4', top: '#3f4aa8', bottom: '#2c2f5e', shoes: '#fff3ea', hair: '#3b2a5c',
      hat: 'none', face: 'simple', scarf: null, bag: false, material: 'normal',
      ...style,
    };
    const s = this.style;
    this.matNormal = charMaterial(s.material);
    this.root.add(this.body);
    for (const name of JOINTS) {
      const g = new THREE.Bone();
      g.name = name;
      this.j[name] = g;
    }
    const J = this.j;
    const legL = s.legLen, armL = s.armLen, tor = s.torsoLen, bw = s.bodyW, hs = s.headSize;
    this.hipsBaseY = legL + 0.06;
    J.hips.position.y = this.hipsBaseY;
    this.body.add(J.hips);
    J.hips.add(J.spine);
    J.spine.position.y = 0.06;
    J.spine.add(J.chest);
    J.chest.position.y = tor * 0.45;
    J.chest.add(J.neck);
    J.neck.position.y = tor * 0.55;
    J.neck.add(J.head);
    J.head.position.y = 0.08;
    for (const side of [-1, 1] as const) {
      const L = side < 0 ? 'L' : 'R';
      const sh = J[`shoulder${L}` as JointName];
      const el = J[`elbow${L}` as JointName];
      const ha = J[`hand${L}` as JointName];
      J.chest.add(sh);
      sh.position.set(side * (bw * 0.5 + 0.04), tor * 0.42, 0);
      sh.add(el);
      el.position.y = -armL * 0.5;
      el.add(ha);
      ha.position.y = -armL * 0.48;
      const th = J[`thigh${L}` as JointName];
      const kn = J[`knee${L}` as JointName];
      const ft = J[`foot${L}` as JointName];
      J.hips.add(th);
      th.position.set(side * bw * 0.27, -0.02, 0);
      th.add(kn);
      kn.position.y = -legL * 0.5;
      kn.add(ft);
      ft.position.y = -legL * 0.46;
    }

    const skin = s.skin!, top = s.top!, bottom = s.bottom!;
    const accent = s.topAccent ?? new THREE.Color(top).lerp(new THREE.Color('#ffffff'), 0.35);
    const parts: Partial<Record<JointName, Part[]>> = {};
    const add = (jn: JointName, p: Part) => (parts[jn] ??= []).push(p);

    // Hips / pelvis
    if (s.skirt) {
      add('hips', { geo: new THREE.CylinderGeometry(bw * 0.42, bw * 0.75, 0.42, 14), color: bottom, pos: [0, -0.12, 0] });
    } else {
      add('hips', { geo: cap(bw * 0.46, bw * 0.3), color: bottom, rot: [0, 0, Math.PI / 2], pos: [0, 0.02, 0], scale: [1, 1, 0.78] });
    }
    // Torso
    add('chest', { geo: roundedGeo(bw * 1.08, tor * 1.08, bw * 0.78, bw * 0.34, 4), color: top, top: new THREE.Color(top).lerp(new THREE.Color('#ffffff'), 0.08), pos: [0, tor * 0.08, 0] });
    add('spine', { geo: roundedGeo(bw * 0.95, tor * 0.5, bw * 0.7, bw * 0.3, 3), color: top, pos: [0, 0.05, 0] });
    add('chest', { geo: roundedGeo(0.035, tor * 0.9, 0.02, 0.01, 1), color: accent, pos: [0, tor * 0.08, bw * 0.4] });
    // Neck
    add('neck', { geo: cap(0.06, 0.06), color: skin, pos: [0, 0.02, 0] });
    // Head
    add('head', { geo: sph(hs, 24, 18), color: skin, pos: [0, hs * 0.92, 0], scale: [1.04, 0.96, 1] });
    if (s.face !== 'void' && s.face !== 'husk') {
      // ears
      for (const side of [-1, 1]) add('head', { geo: sph(hs * 0.18, 8, 6), color: skin, pos: [side * hs * 1.0, hs * 0.9, 0], scale: [0.5, 1, 0.8] });
    }
    // Hair
    if (s.hair && s.face !== 'void' && s.face !== 'husk') {
      const hair = s.hair;
      add('head', { geo: sph(hs * 1.06, 20, 14, ), color: hair, pos: [0, hs * 1.02, -hs * 0.1], scale: [1.02, 0.98, 0.98] });
      for (let i = 0; i < 5; i++) {
        const a = (i / 4 - 0.5) * 1.6;
        add('head', { geo: sph(hs * 0.32, 10, 8), color: hair, pos: [Math.sin(a) * hs * 0.75, hs * 1.45, Math.cos(a) * hs * 0.62], scale: [1, 0.7, 0.8] });
      }
    }
    // Hats
    const hatC = s.hatColor ?? top;
    if (s.hat === 'courier') {
      add('head', { geo: sph(hs * 1.1, 20, 12), color: hatC, top: new THREE.Color(hatC).lerp(new THREE.Color('#ffffff'), 0.2), pos: [0, hs * 1.32, -hs * 0.05], scale: [1.02, 0.62, 1.04] });
      add('head', { geo: new THREE.CylinderGeometry(hs * 0.95, hs * 1.0, 0.04, 20, 1, false, -Math.PI * 0.62, Math.PI * 1.24), color: new THREE.Color(hatC).multiplyScalar(0.8), pos: [0, hs * 1.28, hs * 0.38], scale: [1, 1, 0.9] });
      add('head', { geo: sph(hs * 0.2, 10, 8), color: '#ffe9a6', pos: [0, hs * 1.62, hs * 0.92], scale: [1, 1, 0.4], glow: true });
      add('head', { geo: sph(hs * 0.16, 8, 6), color: hatC, pos: [0, hs * 1.98, -hs * 0.02] });
    } else if (s.hat === 'top') {
      add('head', { geo: new THREE.CylinderGeometry(hs * 0.7, hs * 0.72, hs * 1.3, 18), color: hatC, pos: [0, hs * 2.2, 0] });
      add('head', { geo: new THREE.CylinderGeometry(hs * 1.15, hs * 1.15, 0.04, 20), color: hatC, pos: [0, hs * 1.6, 0] });
    } else if (s.hat === 'beanie') {
      add('head', { geo: sph(hs * 1.1, 18, 12, ), color: hatC, pos: [0, hs * 1.3, -hs * 0.05], scale: [1, 0.75, 1] });
      add('head', { geo: sph(hs * 0.28, 10, 8), color: '#ffffff', pos: [0, hs * 2.05, -hs * 0.05] });
    } else if (s.hat === 'bowler') {
      add('head', { geo: sph(hs * 0.82, 18, 12), color: hatC, pos: [0, hs * 1.6, 0], scale: [1, 0.8, 1] });
      add('head', { geo: new THREE.CylinderGeometry(hs * 1.18, hs * 1.18, 0.035, 20), color: hatC, pos: [0, hs * 1.42, 0] });
    } else if (s.hat === 'nurse') {
      add('head', { geo: roundedGeo(hs * 1.4, hs * 0.5, hs * 0.9, 0.04, 2), color: hatC, pos: [0, hs * 1.75, 0] });
    }
    // Face
    if (s.face === 'mask') {
      add('head', { geo: sph(hs * 0.92, 18, 14, ), color: s.maskColor ?? '#fdf6ee', pos: [0, hs * 0.95, hs * 0.22], scale: [0.95, 1.05, 0.85] });
      for (const side of [-1, 1]) add('head', { geo: sph(hs * 0.1, 8, 6), color: '#1a1424', pos: [side * hs * 0.3, hs * 1.02, hs * 0.92], scale: [1, 0.45, 0.4] });
      add('head', { geo: new THREE.TorusGeometry(hs * 0.18, hs * 0.03, 6, 12, Math.PI), color: '#c4687c', pos: [0, hs * 0.72, hs * 0.94], rot: [0, 0, Math.PI] });
    } else if (s.face === 'void') {
      for (const side of [-1, 1]) add('head', { geo: new THREE.TorusGeometry(hs * 0.16, hs * 0.035, 6, 16), color: s.eyeGlow ?? '#e8e2ff', pos: [side * hs * 0.34, hs * 1.0, hs * 0.9], glow: true });
    } else if (s.face === 'husk') {
      // handled by Enemy factories
    } else if (s.face !== 'none') {
      this.face = this.buildFace(hs, s.face === 'ori');
    }
    if (s.face === 'ori' || s.face === 'simple') {
      for (const side of [-1, 1]) add('head', { geo: sph(hs * 0.14, 10, 8), color: '#ff9fb2', pos: [side * hs * 0.55, hs * 0.72, hs * 0.8], scale: [1, 0.55, 0.3] });
    }
    // Arms
    for (const side of [-1, 1] as const) {
      const L = side < 0 ? 'L' : 'R';
      add(`shoulder${L}` as JointName, { geo: sph(0.085, 10, 8), color: top });
      add(`shoulder${L}` as JointName, { geo: cap(0.075, armL * 0.36), color: top, pos: [0, -armL * 0.25, 0] });
      add(`elbow${L}` as JointName, { geo: cap(0.065, armL * 0.34), color: top, pos: [0, -armL * 0.22, 0] });
      add(`elbow${L}` as JointName, { geo: new THREE.CylinderGeometry(0.075, 0.075, 0.06, 10), color: accent, pos: [0, -armL * 0.42, 0] });
      add(`hand${L}` as JointName, { geo: sph(0.075, 10, 8), color: skin, pos: [0, -0.04, 0.01], scale: [0.9, 1.1, 0.8] });
      add(`thigh${L}` as JointName, { geo: cap(0.095, legL * 0.36), color: bottom, pos: [0, -legL * 0.24, 0] });
      add(`knee${L}` as JointName, { geo: cap(0.08, legL * 0.34), color: bottom, pos: [0, -legL * 0.22, 0] });
      add(`foot${L}` as JointName, { geo: roundedGeo(0.15, 0.11, 0.27, 0.05, 2), color: s.shoes!, pos: [0, -0.02, 0.05] });
      add(`foot${L}` as JointName, { geo: roundedGeo(0.155, 0.03, 0.275, 0.012, 1), color: new THREE.Color(s.shoes!).multiplyScalar(0.7), pos: [0, -0.07, 0.05] });
    }
    // Scarf collar
    if (s.scarf) {
      add('neck', { geo: new THREE.TorusGeometry(0.11, 0.055, 8, 16), color: s.scarf, rot: [Math.PI / 2, 0, 0], pos: [0, -0.02, 0], scale: [1.1, 1, 1] });
    }
    // Briefcase / umbrella / lantern held in right hand
    if (s.briefcase) add('handR', { geo: roundedGeo(0.36, 0.26, 0.09, 0.03, 2), color: '#6b4a3a', pos: [0, -0.2, 0] });
    if (s.umbrella) {
      add('handR', { geo: new THREE.CylinderGeometry(0.012, 0.012, 1.0, 6), color: '#3a2f4a', pos: [0, 0.38, 0] });
      add('handR', { geo: new THREE.SphereGeometry(0.62, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), color: s.umbrella, pos: [0, 0.82, 0] });
    }

    // ---- skin every rigid part to its joint: one SkinnedMesh (+1 for glow parts) ----
    this.root.updateMatrixWorld(true);
    const rootInv = this.root.matrixWorld.clone().invert();
    const normals: THREE.BufferGeometry[] = [];
    const glows: THREE.BufferGeometry[] = [];
    const bones = JOINTS.map((n) => this.j[n]);
    JOINTS.forEach((name, bi) => {
      const list = parts[name];
      if (!list) return;
      const baked = bake(list);
      const toRoot = rootInv.clone().multiply(this.j[name].matrixWorld);
      for (const [g, out] of [[baked.normal, normals], [baked.glow, glows]] as const) {
        if (!g) continue;
        g.applyMatrix4(toRoot);
        const n = g.getAttribute('position').count;
        const si = new Uint16Array(n * 4);
        const sw = new Float32Array(n * 4);
        for (let i = 0; i < n; i++) {
          si[i * 4] = bi;
          sw[i * 4] = 1;
        }
        g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
        g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
        out.push(g);
      }
    });
    const skeleton = new THREE.Skeleton(bones);
    const makeSkinned = (geos: THREE.BufferGeometry[], mat: THREE.Material) => {
      const merged = mergeGeometries(geos)!;
      const sm = new THREE.SkinnedMesh(merged, mat);
      this.root.add(sm);
      sm.bind(skeleton, sm.matrixWorld.clone());
      sm.castShadow = true;
      sm.receiveShadow = true;
      merged.computeBoundingSphere();
      merged.boundingSphere!.radius *= 1.6;
      sm.boundingSphere = merged.boundingSphere!.clone();
      return sm;
    };
    this.root.updateMatrixWorld(true);
    this.skinned = makeSkinned(normals, this.matNormal);
    if (glows.length) {
      this.skinnedGlow = makeSkinned(glows, glowMat);
      this.skinnedGlow.castShadow = false;
    }

    if (s.lantern) {
      const lg = prep(roundedGeo(0.16, 0.22, 0.16, 0.04, 2), '#ffcf7a', 0);
      this.lantern = new THREE.Mesh(lg, glowMat);
      this.lantern.position.set(0, -0.2, 0.05);
      this.j.handR.add(this.lantern);
      const frame = new THREE.Mesh(prep(new THREE.TorusGeometry(0.1, 0.012, 4, 8), '#3a3046', 0), this.matNormal);
      frame.position.set(0, -0.06, 0.05);
      this.j.handR.add(frame);
    }

    if (s.bag) {
      const bag = new THREE.Group();
      const bp = bake([
        { geo: roundedGeo(0.34, 0.28, 0.14, 0.06, 3), color: '#f29bb5', top: '#ffc6d6' },
        { geo: roundedGeo(0.36, 0.13, 0.155, 0.04, 2), color: '#d9708f', pos: [0, 0.09, 0.005] },
        { geo: sph(0.035, 8, 6), color: '#ffe08a', pos: [0, 0.03, 0.085] },
      ]);
      const bm = new THREE.Mesh(bp.normal!, this.matNormal);
      bm.castShadow = true;
      bm.position.y = -0.2;
      bag.add(bm);
      const parcel = new THREE.Mesh(prep(roundedGeo(0.18, 0.1, 0.1, 0.02, 2), '#ffffff', 0), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.8, 1.4), toneMapped: false }));
      parcel.position.set(0.04, -0.03, 0);
      bag.add(parcel);
      this.bagParcel = parcel;
      bag.position.set(bw * 0.62, 0.02, 0.02);
      J.hips.add(bag);
      // strap across chest
      const strap = new THREE.Mesh(prep(new THREE.TorusGeometry(bw * 0.78, 0.022, 4, 24, Math.PI * 1.15), '#d9708f', 0), this.matNormal);
      strap.rotation.set(0, Math.PI / 2, -0.6);
      strap.position.set(0.0, tor * 0.05, 0);
      strap.scale.set(1, 1.15, 1.25);
      J.chest.add(strap);
      (this as { bag?: THREE.Group }).bag = bag;
    }

    if (s.scarf) {
      const sm = charMaterial('normal');
      const r1 = new Ribbon(7, 0.075 * s.scale, 0.05 * s.scale, s.scarf, sm);
      const r2 = new Ribbon(6, 0.07 * s.scale, 0.045 * s.scale, new THREE.Color(s.scarf).multiplyScalar(0.88), sm);
      (r1.mesh.material as THREE.Material).side = THREE.DoubleSide;
      this.ribbons.push(r1, r2);
    }

    this.root.scale.setScalar(s.scale);
  }

  private buildFace(hs: number, hero: boolean): FaceParts {
    const head = this.j.head;
    const eyeW = hero ? 0.085 : 0.06;
    const eyeH = hero ? 0.12 : 0.08;
    const eyeParts: Part[] = [];
    for (const side of [-1, 1]) {
      eyeParts.push({ geo: sph(1, 14, 10), color: '#1d1530', pos: [side * hs * 0.36, 0, 0], scale: [eyeW * 0.6, eyeH * 0.6, 0.035] });
      eyeParts.push({ geo: sph(1, 8, 6), color: '#ffffff', pos: [side * hs * 0.36 + 0.015, eyeH * 0.18, 0.025], scale: [0.018, 0.022, 0.01] });
      if (hero) eyeParts.push({ geo: sph(1, 8, 6), color: '#8fd3ff', pos: [side * hs * 0.36 - 0.01, -eyeH * 0.2, 0.02], scale: [0.012, 0.012, 0.008] });
    }
    const eg = bake(eyeParts, 0).normal!;
    const eyes = new THREE.Mesh(eg, eyeMat);
    eyes.position.set(0, hs * 1.0, hs * 0.92);
    head.add(eyes);
    const brows = new THREE.Group();
    brows.position.set(0, hs * 1.0 + eyeH * 0.75, hs * 0.93);
    const browGeo = prep(cap(0.012, 0.06), this.style.hair ?? '#3b2a5c', 0);
    browGeo.rotateZ(Math.PI / 2);
    const browL = new THREE.Mesh(browGeo, this.matNormal);
    const browR = new THREE.Mesh(browGeo, this.matNormal);
    browL.position.x = -hs * 0.36;
    browR.position.x = hs * 0.36;
    brows.add(browL, browR);
    head.add(brows);
    const mk = (geo: THREE.BufferGeometry, color: THREE.ColorRepresentation) => {
      const m = new THREE.Mesh(prep(geo, color, 0), eyeMat);
      m.position.set(0, hs * 0.66, hs * 0.97);
      m.visible = false;
      head.add(m);
      return m;
    };
    const smile = mk(new THREE.TorusGeometry(0.045, 0.012, 6, 12, Math.PI), '#5c2a3e');
    smile.rotation.z = Math.PI;
    const frown = mk(new THREE.TorusGeometry(0.04, 0.011, 6, 12, Math.PI), '#5c2a3e');
    frown.position.y -= 0.03;
    const flat = mk(cap(0.01, 0.05), '#5c2a3e');
    flat.rotation.z = Math.PI / 2;
    const o = mk(sph(0.03, 10, 8), '#5c2a3e');
    o.scale.set(0.9, 1.2, 0.5);
    smile.visible = true;
    return { eyes, brows, browL, browR, mouths: { smile, flat, o, frown } };
  }

  setParcelColor(c: THREE.ColorRepresentation | null): void {
    if (!this.bagParcel) return;
    if (!c) {
      this.bagParcel.visible = false;
      return;
    }
    this.bagParcel.visible = true;
    (this.bagParcel.material as THREE.MeshBasicMaterial).color.set(c).multiplyScalar(2.2);
  }

  attachTo(scene: THREE.Object3D): void {
    scene.add(this.root);
    for (const r of this.ribbons) scene.add(r.mesh);
    this.resetSecondary();
  }

  detach(): void {
    this.root.removeFromParent();
    for (const r of this.ribbons) r.mesh.removeFromParent();
  }

  resetSecondary(): void {
    this.root.updateMatrixWorld(true);
    const a = new THREE.Vector3();
    this.scarfAnchor(a);
    const back = new THREE.Vector3(0, -0.3, -1).applyQuaternion(this.root.quaternion).normalize();
    for (const r of this.ribbons) r.reset(a, back);
    this.lastPos.copy(this.root.position);
    this.lastVel.set(0, 0, 0);
  }

  private scarfAnchor(out: THREE.Vector3, side = 0): THREE.Vector3 {
    return this.j.neck.localToWorld(out.set(side * 0.05, -0.02, -0.12));
  }

  /** Apply damped pose + secondary motion. */
  update(dt: number, time: number): void {
    const k = this.stiffness;
    for (const name of JOINTS) {
      const p = this.pose[name];
      const t = this.target[name];
      p.x = dampAngle(p.x, t.x, k, dt);
      p.y = dampAngle(p.y, t.y, k, dt);
      p.z = dampAngle(p.z, t.z, k, dt);
      this.j[name].rotation.copy(p);
    }
    this.hipsOffsetY = damp(this.hipsOffsetY, this.targetHipsOffsetY, k, dt);
    this.j.hips.position.y = this.hipsBaseY + this.hipsOffsetY;

    // head look (additive)
    this.headYaw = dampAngle(this.headYaw, THREE.MathUtils.clamp(this.lookYaw, -1.1, 1.1), 6, dt);
    this.headPitch = damp(this.headPitch, THREE.MathUtils.clamp(this.lookPitch, -0.5, 0.5), 6, dt);
    this.j.head.rotation.y += this.headYaw * 0.7;
    this.j.neck.rotation.y += this.headYaw * 0.3;
    this.j.head.rotation.x += this.headPitch;

    // squash & stretch
    this.squash.lerp(this.squashTarget, 1 - Math.exp(-14 * dt));
    this.squashTarget.lerp(new THREE.Vector3(1, 1, 1), 1 - Math.exp(-10 * dt));
    this.body.scale.copy(this.squash);

    // blink + expression
    if (this.face) {
      this.blinkT -= dt;
      if (this.blinkT <= 0) {
        this.blinking = 0.14;
        this.blinkT = 2 + ((time * 7.31) % 3);
      }
      let eyeY = 1;
      if (this.blinking > 0) {
        this.blinking -= dt;
        eyeY = 0.12;
      }
      const ex = this.expression;
      const wide = ex === 'scared' || ex === 'surprised' ? 1.25 : ex === 'determined' ? 0.8 : ex === 'sad' ? 0.85 : 1;
      this.face.eyes.scale.set(wide > 1 ? 1.1 : 1, eyeY * wide, 1);
      const bL = this.face.browL, bR = this.face.browR;
      const browTilt = ex === 'worried' || ex === 'sad' || ex === 'scared' ? 0.35 : ex === 'determined' ? -0.35 : ex === 'curious' ? 0.15 : 0;
      bL.rotation.z = -browTilt;
      bR.rotation.z = browTilt;
      this.face.brows.position.y = this.style.headSize * 1.0 + 0.09 + (ex === 'surprised' || ex === 'scared' ? 0.025 : 0);
      const m = this.face.mouths;
      m.smile.visible = ex === 'happy' || ex === 'curious';
      m.o.visible = ex === 'surprised' || ex === 'scared';
      m.frown.visible = ex === 'sad' || ex === 'worried';
      m.flat.visible = ex === 'neutral' || ex === 'determined';
    }

    // bag pendulum driven by acceleration
    this.root.updateMatrixWorld(true);
    if (this.bag && dt > 0) {
      const vel = this.root.position.clone().sub(this.lastPos).divideScalar(dt);
      const acc = vel.clone().sub(this.lastVel).divideScalar(dt);
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.root.quaternion);
      const a = THREE.MathUtils.clamp(acc.dot(fwd), -60, 60);
      this.bagVel += (-this.bagAngle * 60 - this.bagVel * 6 - a * 0.25) * dt;
      this.bagAngle += this.bagVel * dt;
      this.bagAngle = THREE.MathUtils.clamp(this.bagAngle, -1.1, 1.1);
      this.bag.rotation.x = this.bagAngle - this.j.hips.rotation.x;
      this.bag.rotation.z = Math.sin(time * 2) * 0.03;
      this.lastVel.copy(vel);
    }
    this.lastPos.copy(this.root.position);

    if (this.ribbons.length) {
      this.root.updateMatrixWorld(true);
      const side = new THREE.Vector3(1, 0, 0).applyQuaternion(this.root.quaternion);
      const wind = new THREE.Vector3(Math.sin(time * 0.7) * 2, 0.5, -1.5 + Math.sin(time * 1.3)).multiplyScalar(this.style.scale);
      const center = this.j.chest.localToWorld(new THREE.Vector3(0, 0, 0));
      const r = this.style.bodyW * 0.62 * this.style.scale;
      const a = new THREE.Vector3();
      this.ribbons[0].update(Math.min(dt, 1 / 30), this.scarfAnchor(a, -1), side, wind, center, r);
      this.ribbons[1].update(Math.min(dt, 1 / 30), this.scarfAnchor(a, 1), side, wind, center, r);
    }
  }

  stretch(y: number): void {
    const xz = 1 / Math.sqrt(y);
    this.squashTarget.set(xz, y, xz);
    this.squash.set(xz, y, xz);
  }

  /** World position of a joint. */
  jointWorld(name: JointName, out = new THREE.Vector3()): THREE.Vector3 {
    return this.j[name].getWorldPosition(out);
  }

  setVisible(v: boolean): void {
    this.root.visible = v;
    for (const r of this.ribbons) r.mesh.visible = v;
  }

  dispose(): void {
    this.detach();
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    for (const r of this.ribbons) r.mesh.geometry.dispose();
  }
}
