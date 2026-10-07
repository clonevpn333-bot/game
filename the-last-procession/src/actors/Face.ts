import * as THREE from 'three';
import type { FaceDef } from './Cast';
import { eyeTexture } from '../gfx/Materials';
import { toonMaterial } from '../gfx/Toon';
import { damp } from '../util/math';

export type Expression = 'neutral' | 'smile' | 'sad' | 'worried' | 'angry' | 'surprised' | 'determined' | 'sleep';

interface ExprShape {
  browIn: number; // inner brow raise (+) / furrow (−)
  browOut: number;
  lid: number; // 0 open .. 1 closed (resting lid height)
  smile: number; // mouth corner curve
  open: number;
}

const EXPR: Record<Expression, ExprShape> = {
  neutral: { browIn: 0, browOut: 0, lid: 0.12, smile: 0.1, open: 0 },
  smile: { browIn: 0.2, browOut: 0.15, lid: 0.25, smile: 1, open: 0.1 },
  sad: { browIn: 0.8, browOut: -0.4, lid: 0.3, smile: -0.6, open: 0 },
  worried: { browIn: 0.7, browOut: 0, lid: 0.05, smile: -0.25, open: 0.15 },
  angry: { browIn: -0.9, browOut: 0.3, lid: 0.28, smile: -0.5, open: 0.1 },
  surprised: { browIn: 0.9, browOut: 0.9, lid: -0.15, smile: 0, open: 0.6 },
  determined: { browIn: -0.45, browOut: 0.1, lid: 0.2, smile: -0.1, open: 0 },
  sleep: { browIn: 0.1, browOut: 0, lid: 1, smile: 0.2, open: 0 },
};

/**
 * Animated face: tracking eyeballs, blinking lids, expressive brows and a
 * curved mouth that shapes for expressions and talks while lines play.
 * Everything is parented to the head bone (head-local coordinates).
 */
export class Face {
  readonly group = new THREE.Group();
  private readonly eyes: THREE.Object3D[] = [];
  private readonly lids: THREE.Mesh[] = [];
  private readonly brows: THREE.Mesh[] = [];
  private readonly mouth: THREE.Mesh;
  private readonly mouthInner: THREE.Mesh;
  private shape: ExprShape = { ...EXPR.neutral };
  private target: Expression = 'neutral';
  private blinkT = 2;
  private blinkK = 0;
  private gaze = new THREE.Vector2();
  private gazeTarget = new THREE.Vector2();
  private saccade = 0;
  talk = 0;
  private talkPhase = 0;
  lookWorld: THREE.Vector3 | null = null;
  private readonly mouthCurve: THREE.QuadraticBezierCurve3;
  private lastSmile = 99;

  constructor(def: FaceDef, private readonly headBone: THREE.Bone, headRest: THREE.Vector3, scale: number) {
    headBone.add(this.group);
    // sculpt coordinates are world-rest for a 1.78 m body; convert to head-local
    const L = (x: number, y: number, z: number) => new THREE.Vector3(x * scale - headRest.x, y * scale - headRest.y, z * scale - headRest.z);
    const r = 0.0245 * scale;
    const eyeGeo = new THREE.SphereGeometry(r, 24, 16);
    eyeGeo.rotateX(Math.PI / 2); // +Y pole (iris) now faces +Z
    const eyeMat = new THREE.MeshBasicMaterial({ map: eyeTexture(def.iris) });
    const lidMat = toonMaterial({ color: def.skin, brushScale: 0.1 });
    const lashMat = new THREE.MeshBasicMaterial({ color: '#2a1416' });
    const browMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(def.brow).multiplyScalar(0.75) });
    for (const m of [1, -1]) {
      const pivot = new THREE.Object3D();
      pivot.position.copy(L(m * 0.04, 1.668, 0.091));
      this.group.add(pivot);
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      pivot.add(eye);
      // specular catch-light: makes the eyes feel alive
      const spark = new THREE.Mesh(new THREE.SphereGeometry(r * 0.17, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.6) }));
      spark.position.set(m * r * 0.18, r * 0.32, r * 0.93);
      pivot.add(spark);
      this.eyes.push(pivot);
      // upper lid: a skin shell that rotates down over the eye
      const lidGeo = new THREE.SphereGeometry(r * 1.12, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
      const lid = new THREE.Mesh(lidGeo, lidMat);
      lid.position.copy(pivot.position);
      if (def.lashes) {
        const lash = new THREE.Mesh(new THREE.TorusGeometry(r * 1.13, r * 0.09, 4, 16, Math.PI), lashMat);
        lash.rotation.x = Math.PI / 2;
        lash.rotation.z = Math.PI;
        lid.add(lash);
      }
      this.group.add(lid);
      this.lids.push(lid);
      const lower = new THREE.Mesh(new THREE.SphereGeometry(r * 1.08, 20, 6, 0, Math.PI * 2, Math.PI * 0.72, Math.PI * 0.28), lidMat);
      lower.position.copy(pivot.position);
      this.group.add(lower);
      const bw = 0.034 * scale * (0.8 + def.browWeight * 0.2);
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.0055 * scale * (0.7 + def.browWeight * 0.5), bw, 4, 8), browMat);
      brow.rotation.z = Math.PI / 2;
      brow.position.copy(L(m * 0.042, 1.703, 0.108));
      brow.userData.side = m;
      brow.userData.base = brow.position.clone();
      this.group.add(brow);
      this.brows.push(brow);
    }
    const mw = 0.022 * scale;
    const mouthY = L(0, 1.5865, 0.107);
    this.mouthCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-mw, 0, 0), new THREE.Vector3(0, 0, 0.004), new THREE.Vector3(mw, 0, 0));
    this.mouth = new THREE.Mesh(new THREE.TubeGeometry(this.mouthCurve, 8, 0.0028 * scale, 5), new THREE.MeshBasicMaterial({ color: '#5a2224' }));
    this.mouth.position.copy(mouthY);
    this.group.add(this.mouth);
    this.mouthInner = new THREE.Mesh(new THREE.SphereGeometry(mw * 0.8, 12, 8), new THREE.MeshBasicMaterial({ color: '#2a0e10' }));
    this.mouthInner.scale.set(1, 0.05, 0.35);
    this.mouthInner.position.copy(mouthY).add(new THREE.Vector3(0, -0.001, -0.002));
    this.group.add(this.mouthInner);
    this.group.traverse((o) => ((o as THREE.Mesh).castShadow = false));
  }

  set(e: Expression): void {
    this.target = e;
  }

  update(dt: number): void {
    const t = EXPR[this.target];
    const k = damp(8, dt);
    const s = this.shape;
    s.browIn += (t.browIn - s.browIn) * k;
    s.browOut += (t.browOut - s.browOut) * k;
    s.lid += (t.lid - s.lid) * k;
    s.smile += (t.smile - s.smile) * k;
    s.open += (t.open - s.open) * k;
    // blinks (double blinks now and then)
    this.blinkT -= dt;
    if (this.blinkT < 0) {
      this.blinkK = 0.16;
      this.blinkT = Math.random() < 0.2 ? 0.25 : 2 + Math.random() * 3.5;
    }
    this.blinkK = Math.max(0, this.blinkK - dt);
    const blink = this.blinkK > 0 ? Math.sin((this.blinkK / 0.16) * Math.PI) : 0;
    const lidClose = Math.min(1, Math.max(s.lid, blink));
    // gaze: look target (world) or idle saccades
    this.saccade -= dt;
    if (this.lookWorld) {
      const local = this.headBone.worldToLocal(this.lookWorld.clone());
      const yaw = Math.atan2(local.x, local.z);
      const pitch = Math.atan2(local.y - 0.1, Math.hypot(local.x, local.z));
      this.gazeTarget.set(THREE.MathUtils.clamp(yaw, -0.5, 0.5), THREE.MathUtils.clamp(pitch, -0.35, 0.35));
    } else if (this.saccade < 0) {
      this.saccade = 0.6 + Math.random() * 2;
      this.gazeTarget.set((Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.15);
    }
    this.gaze.x += (this.gazeTarget.x - this.gaze.x) * damp(25, dt);
    this.gaze.y += (this.gazeTarget.y - this.gaze.y) * damp(25, dt);
    for (const e of this.eyes) e.rotation.set(-this.gaze.y, this.gaze.x, 0);
    // lid cap pole: tilted back (open) → pointing forward over the eye (closed)
    for (const l of this.lids) l.rotation.x = THREE.MathUtils.lerp(-0.42, Math.PI / 2 - 0.08, lidClose) - this.gaze.y * 0.4;
    for (const b of this.brows) {
      const m = b.userData.side as number;
      const base = b.userData.base as THREE.Vector3;
      b.position.y = base.y + (s.browIn + s.browOut) * 0.0045;
      b.rotation.z = Math.PI / 2 + m * (s.browIn - s.browOut) * 0.28;
    }
    // talking: syllable-like jaw rhythm
    if (this.talk > 0) {
      this.talk -= dt;
      this.talkPhase += dt * 13;
    }
    const talking = this.talk > 0 ? Math.max(0, Math.sin(this.talkPhase) * 0.7 + Math.sin(this.talkPhase * 2.7) * 0.3) : 0;
    const open = Math.max(s.open, talking * 0.8);
    this.mouthInner.scale.y = 0.05 + open * 0.55;
    if (Math.abs(s.smile - this.lastSmile) > 0.03) {
      this.lastSmile = s.smile;
      const mw = Math.abs(this.mouthCurve.v0.x);
      this.mouthCurve.v0.set(-mw, s.smile * 0.006, -0.002);
      this.mouthCurve.v2.set(mw, s.smile * 0.006, -0.002);
      this.mouthCurve.v1.set(0, -s.smile * 0.004, 0.004);
      this.mouth.geometry.dispose();
      this.mouth.geometry = new THREE.TubeGeometry(this.mouthCurve, 8, 0.0028, 5);
    }
  }
}
