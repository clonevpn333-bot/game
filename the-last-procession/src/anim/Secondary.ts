import * as THREE from 'three';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _d = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _pq = new THREE.Quaternion();

/** Rotate `bone` (in world terms) by `delta`, writing the result into its local quaternion. */
export function rotateWorld(bone: THREE.Object3D, delta: THREE.Quaternion): void {
  const parent = bone.parent!;
  parent.getWorldQuaternion(_pq);
  bone.getWorldQuaternion(_q);
  _q.premultiply(delta); // new world rotation
  bone.quaternion.copy(_pq.invert().multiply(_q));
  bone.updateMatrixWorld(true);
}

/** Aim the bone so its child joint (at `childLocal`) points at `target` (world). */
export function aimBone(bone: THREE.Bone, childLocal: THREE.Vector3, target: THREE.Vector3, weight = 1): void {
  bone.getWorldPosition(_a);
  _b.copy(childLocal).applyMatrix4(bone.matrixWorld).sub(_a).normalize();
  _c.copy(target).sub(_a);
  if (_c.lengthSq() < 1e-10) return;
  _c.normalize();
  const delta = new THREE.Quaternion().setFromUnitVectors(_b, _c);
  if (weight < 1) delta.slerp(new THREE.Quaternion(), 1 - weight);
  rotateWorld(bone, delta);
}

/**
 * Verlet spring chain for hair, scarves and capes. The chain is posed by its
 * parent each frame; particles lag, swing and settle, then the bones are aimed
 * along the simulated curve. Spheres keep cloth from passing into the body.
 */
export class SpringChain {
  private readonly pts: THREE.Vector3[] = [];
  private readonly prev: THREE.Vector3[] = [];
  private readonly len: number[] = [];
  private readonly childLocal: THREE.Vector3[] = [];
  private init = false;
  colliders: { bone: THREE.Object3D; offset: THREE.Vector3; r: number }[] = [];
  wind = new THREE.Vector3();

  constructor(
    readonly bones: THREE.Bone[],
    tip: THREE.Vector3, // tip offset in last bone's local space
    readonly stiffness = 0.12,
    readonly damping = 0.86,
    readonly gravity = 9.8,
  ) {
    for (let i = 0; i < bones.length; i++) {
      this.childLocal.push(i < bones.length - 1 ? bones[i + 1].position.clone() : tip.clone());
      this.len.push(this.childLocal[i].length());
    }
    for (let i = 0; i <= bones.length; i++) {
      this.pts.push(new THREE.Vector3());
      this.prev.push(new THREE.Vector3());
    }
  }

  reset(): void {
    this.init = false;
  }

  update(dt: number): void {
    const n = this.bones.length;
    // rest pose (identity locals) gives the target shape the cloth springs toward
    for (const b of this.bones) b.quaternion.identity();
    this.bones[0].updateMatrixWorld(true);
    const rest: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) rest.push(this.bones[i].getWorldPosition(new THREE.Vector3()));
    rest.push(this.childLocal[n - 1].clone().applyMatrix4(this.bones[n - 1].matrixWorld));
    if (!this.init) {
      for (let i = 0; i <= n; i++) {
        this.pts[i].copy(rest[i]);
        this.prev[i].copy(rest[i]);
      }
      this.init = true;
    }
    const h = Math.min(dt, 1 / 30);
    this.pts[0].copy(rest[0]);
    this.prev[0].copy(rest[0]);
    for (let i = 1; i <= n; i++) {
      const p = this.pts[i];
      _d.subVectors(p, this.prev[i]).multiplyScalar(this.damping);
      this.prev[i].copy(p);
      p.add(_d);
      p.y -= this.gravity * h * h;
      p.addScaledVector(this.wind, h * h);
      p.lerp(rest[i], this.stiffness);
    }
    for (let it = 0; it < 2; it++) {
      for (let i = 1; i <= n; i++) {
        const a = this.pts[i - 1];
        const p = this.pts[i];
        _d.subVectors(p, a);
        const l = _d.length() || 1e-6;
        p.copy(a).addScaledVector(_d, this.len[i - 1] / l);
        for (const c of this.colliders) {
          c.bone.updateMatrixWorld();
          _c.copy(c.offset).applyMatrix4(c.bone.matrixWorld);
          _d.subVectors(p, _c);
          const dl = _d.length();
          if (dl < c.r && dl > 1e-6) p.copy(_c).addScaledVector(_d, c.r / dl);
        }
      }
    }
    for (let i = 0; i < n; i++) aimBone(this.bones[i], this.childLocal[i], this.pts[i + 1]);
  }
}

/**
 * Analytic two-bone IK (thigh → shin → foot). Moves the end joint to `target`
 * while keeping the current bend plane (knee keeps pointing forward).
 */
export function twoBoneIK(upper: THREE.Bone, lower: THREE.Bone, end: THREE.Bone, target: THREE.Vector3, weight = 1): void {
  const A = upper.getWorldPosition(new THREE.Vector3());
  const B = lower.getWorldPosition(new THREE.Vector3());
  const C = end.getWorldPosition(new THREE.Vector3());
  const T = A.clone().lerp(target, 1).sub(A);
  const la = A.distanceTo(B);
  const lb = B.distanceTo(C);
  const dist = Math.min(la + lb - 1e-4, Math.max(Math.abs(la - lb) + 1e-4, T.length()));
  // bend axis from the current pose (fallback: upper's local X in world)
  const ab = B.clone().sub(A);
  const bc = C.clone().sub(B);
  let axis = ab.clone().cross(bc);
  if (axis.lengthSq() < 1e-10) axis = new THREE.Vector3(1, 0, 0).applyQuaternion(upper.getWorldQuaternion(new THREE.Quaternion()));
  axis.normalize();
  const cur = ab.clone().normalize().negate().angleTo(bc.clone().normalize());
  const want = Math.acos(THREE.MathUtils.clamp((la * la + lb * lb - dist * dist) / (2 * la * lb), -1, 1));
  // inner angle at the knee: cur is angle between BA and BC
  const delta = (cur - want) * weight;
  rotateWorld(lower, new THREE.Quaternion().setFromAxisAngle(axis, delta));
  const C2 = end.getWorldPosition(new THREE.Vector3()).sub(A).normalize();
  const dir = T.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(C2, dir);
  if (weight < 1) q.slerp(new THREE.Quaternion(), 1 - weight);
  rotateWorld(upper, q);
}
