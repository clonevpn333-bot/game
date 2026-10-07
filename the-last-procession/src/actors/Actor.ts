import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildRig, boneIndex, type Rig } from '../anim/Rig';
import { Animator } from '../anim/Animator';
import { SpringChain, twoBoneIK } from '../anim/Secondary';
import { Face, type Expression } from './Face';
import { CAST, buildProp, type CharDef } from './Cast';
import { sculptMaterial } from '../gfx/Materials';
import { addOutline } from '../gfx/Toon';
import { damp, dampAngle } from '../util/math';

const geoCache = new Map<string, THREE.BufferGeometry>();

/** Sculpt (once) and cache a character's skinned geometry. */
export function characterGeometry(def: CharDef): THREE.BufferGeometry {
  const hit = geoCache.get(def.id);
  if (hit) return hit;
  const rig = buildRig(def.joints, 1);
  const sc = def.sculpt();
  const bones = boneIndex(rig);
  let { geometry } = sc.mesh(def.cell, bones);
  if (sc.extras.length) geometry = mergeGeometries([geometry, ...sc.extras.map((f) => f(bones))])!;
  geometry.scale(def.scale, def.scale, def.scale);
  geometry.computeBoundingSphere();
  geoCache.set(def.id, geometry);
  return geometry;
}

const tmpV = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();

/**
 * A living character: one continuous skinned sculpt driven by the layered
 * animator, with head/eye look-at, foot IK, spring-simulated cloth and hair,
 * and an expressive face.
 */
export class Actor {
  readonly root = new THREE.Group();
  readonly mesh: THREE.SkinnedMesh;
  readonly rig: Rig;
  readonly anim: Animator;
  readonly face: Face | null;
  readonly chains: SpringChain[] = [];
  readonly material: THREE.MeshToonMaterial;
  outline: THREE.Mesh | null = null;
  prop: THREE.Group | null = null;
  yaw = 0;
  targetYaw = 0;
  turnSpeed = 9;
  lookAt: THREE.Vector3 | null = null;
  private lookYaw = 0;
  private lookPitch = 0;
  ground: ((x: number, z: number) => number) | null = null;
  footIK = true;
  private lastYaw = 0;
  readonly velocity = new THREE.Vector3();
  private readonly lastPos = new THREE.Vector3();
  onStep: ((side: number) => void) | null = null;
  private lastPhaseHalf = 0;
  readonly def: CharDef;

  constructor(idOrDef: string | CharDef) {
    const def = typeof idOrDef === 'string' ? CAST[idOrDef]() : idOrDef;
    this.def = def;
    this.rig = buildRig(def.joints, def.scale);
    this.material = sculptMaterial();
    this.mesh = new THREE.SkinnedMesh(characterGeometry(def), this.material);
    this.mesh.add(this.rig.root);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.updateMatrixWorld(true);
    this.mesh.bind(this.rig.skeleton);
    this.root.add(this.mesh);
    this.outline = addOutline(this.mesh, 0.01 * def.scale, 1);
    this.anim = new Animator(this.rig);
    this.anim.stride = { walk: 1.5 * def.scale, run: 4.6 * def.scale };
    for (const c of def.chains) {
      const bones = c.bones.map((n) => this.rig.byName.get(n)!);
      const ch = new SpringChain(bones, new THREE.Vector3(...c.tip).multiplyScalar(def.scale), c.stiffness, c.damping, c.gravity ?? 9.8);
      const chest = this.rig.byName.get('chest')!;
      const hips = this.rig.byName.get('hips')!;
      ch.colliders.push({ bone: chest, offset: new THREE.Vector3(0, 0.06, -0.01).multiplyScalar(def.scale), r: 0.19 * def.scale });
      ch.colliders.push({ bone: hips, offset: new THREE.Vector3(0, -0.02, 0).multiplyScalar(def.scale), r: 0.19 * def.scale });
      this.chains.push(ch);
    }
    this.rig.byName.get('chest')!.add(this.back);
    this.back.position.set(0, 0.05 * def.scale, -0.2 * def.scale);
    this.face = def.face ? new Face(def.face, this.rig.byName.get('head')!, this.rig.rest.get('head')!, def.scale) : null;
    if (def.weapon) this.holdProp(def.weapon);
  }

  // -------------------------------------------------------------- scripting API
  /** Clip names by story-script mode. */
  static readonly MODES: Record<string, string> = {
    idle: 'idle', locomotion: 'move', move: 'move', raise: 'invoke', invoke: 'invoke', attack: 'attack', ride: 'ride', sit: 'sit', point: 'point',
    fall: 'skydive', skydive: 'skydive', climb: 'climb', kneel: 'kneel', hurt: 'hurt', dead: 'dead', piggy: 'piggyback', piggyback: 'piggyback',
    jump: 'air', air: 'air', hang: 'hang', float: 'float', reach: 'reach', lie: 'lie', dodge: 'roll', roll: 'roll', cower: 'cower', carry: 'carry',
    carried: 'carried', brace: 'brace', slide: 'slide', guard: 'guard', crouch: 'crouch', land: 'land', pillion: 'pillion', talk: 'talk',
  };
  mode = 'idle';
  attackVariant = 0;
  /** script-provided ground height (vehicles, roofs) */
  groundY = 0;
  /** anchor on the upper back (piggyback rider) */
  readonly back = new THREE.Object3D();
  private propKind: 'sword' | 'halberd' | 'hammer' | 'spear' | null = null;
  sheathed = false;

  setMode(m: string, fade = 0.25): void {
    const clip = Actor.MODES[m] ?? m;
    if (this.mode === m && this.anim.current === clip) return;
    this.mode = m;
    this.anim.play(clip, { fade, variant: this.attackVariant });
  }

  restartMode(fade = 0.06): void {
    this.anim.play(Actor.MODES[this.mode] ?? this.mode, { fade, variant: this.attackVariant, restart: true });
  }

  get lookAtTarget(): THREE.Vector3 | null {
    return this.lookAt;
  }
  set lookAtTarget(v: THREE.Vector3 | null) {
    this.lookAt = v;
  }
  get speed(): number {
    return this.anim.params.speed;
  }
  set speed(v: number) {
    this.anim.params.speed = v;
  }
  get weapon(): THREE.Group | null {
    return this.prop;
  }
  get body(): THREE.SkinnedMesh {
    return this.mesh;
  }
  /** Lip-flap + a conversational gesture now and then. */
  say(seconds: number): void {
    this.speak(seconds);
    if (Math.random() < 0.02 && (this.mode === 'idle' || this.mode === 'guard')) this.anim.overlay('talk', { mask: 'arms', duration: 1.6, variant: Math.floor(Math.random() * 3) });
  }
  attachWeapon(kind: 'sword' | 'halberd' | 'hammer' | 'spear' | null): void {
    this.holdProp(kind);
  }

  /** Sword to the hip (exploration) or back in hand (combat). */
  sheathe(on: boolean): void {
    if (this.sheathed === on || !this.prop || this.propKind !== 'sword') {
      this.sheathed = on;
      return;
    }
    this.sheathed = on;
    const s = this.def.scale;
    if (on) {
      this.rig.byName.get('hips')!.add(this.prop);
      this.prop.position.set(0.17 * s, -0.04 * s, 0.03 * s);
      this.prop.rotation.set(Math.PI + 0.55, 0, -0.18);
    } else {
      this.rig.byName.get('hand.R')!.add(this.prop);
      this.prop.position.set(-0.004, -0.058 * s, 0.012);
      this.prop.rotation.set(Math.PI / 2, 0, 0);
    }
  }

  holdProp(kind: 'sword' | 'halberd' | 'hammer' | 'spear' | null): void {
    this.propKind = kind;
    this.sheathed = false;
    if (this.prop) this.prop.removeFromParent();
    this.prop = null;
    if (!kind) return;
    const g = buildProp(kind);
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !m.userData.isOutline) addOutline(m, 0.008, 0.9);
    });
    const hand = this.rig.byName.get('hand.R')!;
    if (kind === 'sword') {
      g.position.set(-0.004, -0.058 * this.def.scale, 0.012);
      g.rotation.set(Math.PI / 2, 0, 0);
    } else {
      // staffs stand upright in the fist, butt near the ground
      g.position.set(-0.004, -0.06 * this.def.scale, 0.02);
      g.rotation.set(0.12, 0, 0);
      g.position.y -= kind === 'hammer' ? 0.2 : 0.35;
    }
    hand.add(g);
    this.prop = g;
  }

  place(p: THREE.Vector3, yaw?: number): void {
    this.root.position.copy(p);
    this.lastPos.copy(p);
    if (yaw !== undefined) this.yaw = this.targetYaw = yaw;
    this.root.rotation.y = this.yaw;
    for (const c of this.chains) c.reset();
  }

  play(clip: string, fade = 0.3, variant = 0): void {
    this.anim.play(clip, { fade, variant });
  }

  express(e: Expression): void {
    this.face?.set(e);
  }

  speak(seconds: number): void {
    if (this.face) this.face.talk = seconds;
  }

  setGlow(v: number): void {
    (this.material.userData.glow as { value: number }).value = v;
  }

  update(dt: number, _time = 0): void {
    // facing: critically-damped turn (never snaps)
    this.yaw = dampAngle(this.yaw, this.targetYaw, this.turnSpeed, dt);
    const turn = dt > 0 ? (this.yaw - this.lastYaw) / dt : 0;
    this.lastYaw = this.yaw;
    this.root.rotation.y = this.yaw;
    if (dt > 0) this.velocity.subVectors(this.root.position, this.lastPos).divideScalar(dt);
    this.lastPos.copy(this.root.position);
    const p = this.anim.params;
    p.turn += (THREE.MathUtils.clamp(turn, -6, 6) - p.turn) * damp(10, dt);

    this.anim.update(dt);
    this.mesh.updateMatrixWorld(true);
    this.applyLook(dt);
    if (this.footIK && this.ground && this.root.visible && (this.anim.current === 'move' || this.anim.current === 'idle' || this.anim.current === 'guard' || this.anim.current === 'talk')) this.applyFootIK();
    for (const c of this.chains) c.update(dt);
    if (this.face) {
      this.face.lookWorld = this.lookAt;
      this.face.update(dt);
    }
    // footstep events from the locomotion phase
    if (this.onStep && this.anim.current === 'move' && p.speed > 0.6) {
      const half = Math.floor(this.anim.phase * 2);
      if (half !== this.lastPhaseHalf) {
        this.lastPhaseHalf = half;
        this.onStep(half);
      }
    }
  }

  private applyLook(dt: number): void {
    let ty = 0;
    let tp = 0;
    if (this.lookAt) {
      const head = this.rig.byName.get('head')!;
      head.getWorldPosition(tmpV);
      const d = this.lookAt.clone().sub(tmpV);
      const local = d.applyQuaternion(this.root.getWorldQuaternion(tmpQ).invert());
      ty = THREE.MathUtils.clamp(Math.atan2(local.x, local.z), -1.2, 1.2);
      tp = THREE.MathUtils.clamp(-Math.atan2(local.y, Math.hypot(local.x, local.z)), -0.6, 0.5);
    }
    this.lookYaw += (ty - this.lookYaw) * damp(5, dt);
    this.lookPitch += (tp - this.lookPitch) * damp(5, dt);
    if (Math.abs(this.lookYaw) + Math.abs(this.lookPitch) < 1e-3) return;
    const spread: [string, number][] = [
      ['chest', 0.2],
      ['neck', 0.35],
      ['head', 0.45],
    ];
    for (const [name, w] of spread) {
      const b = this.rig.byName.get(name)!;
      tmpE.set(this.lookPitch * w, this.lookYaw * w, 0, 'YXZ');
      tmpQ.setFromEuler(tmpE);
      b.quaternion.premultiply(tmpQ);
    }
    this.rig.byName.get('chest')!.updateMatrixWorld(true);
  }

  private applyFootIK(): void {
    const g = this.ground!;
    const base = this.root.position.y;
    const offs: number[] = [];
    const feet: THREE.Bone[] = [];
    for (const s of ['L', 'R']) {
      const foot = this.rig.byName.get(`foot.${s}`)!;
      foot.getWorldPosition(tmpV);
      offs.push(g(tmpV.x, tmpV.z) - base);
      feet.push(foot);
    }
    const drop = Math.min(0, Math.min(offs[0], offs[1]));
    if (Math.abs(offs[0]) < 0.01 && Math.abs(offs[1]) < 0.01) return;
    const hips = this.rig.byName.get('hips')!;
    hips.position.y += drop / this.root.scale.y;
    hips.updateMatrixWorld(true);
    ['L', 'R'].forEach((s, i) => {
      const raise = offs[i] - drop;
      if (raise < 0.005) return;
      const thigh = this.rig.byName.get(`thigh.${s}`)!;
      const shin = this.rig.byName.get(`shin.${s}`)!;
      const target = feet[i].getWorldPosition(new THREE.Vector3());
      target.y += Math.min(raise, 0.45);
      twoBoneIK(thigh, shin, feet[i], target);
    });
  }

  dispose(): void {
    this.root.removeFromParent();
    this.material.dispose();
  }
}
