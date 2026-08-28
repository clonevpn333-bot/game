/* Two-bone IK. Used to plant feet on the ground and put climbing hands on the
 * rock the player is actually holding. */
import * as THREE from '../../../../vendor/three/three.module.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();
const _t = new THREE.Vector3(), _axis = new THREE.Vector3(), _q = new THREE.Quaternion();
const _m = new THREE.Matrix4(), _inv = new THREE.Matrix4();
const _dir = new THREE.Vector3(), _pole = new THREE.Vector3(), _perp = new THREE.Vector3();

/**
 * Solves a 2-bone chain so `end` reaches `target` (world space).
 * @param root  upper bone (shoulder / hip)
 * @param mid   lower bone (elbow / knee)
 * @param end   effector bone (hand / foot)
 * @param target THREE.Vector3 in world space
 * @param poleDir world-space hint for which way the joint bends
 * @param weight 0..1 blend against the current pose
 */
export function solveTwoBone(root, mid, end, target, poleDir, weight = 1) {
  if (weight <= 0.001) return;
  root.updateWorldMatrix(true, false);
  mid.updateWorldMatrix(false, false);
  end.updateWorldMatrix(false, false);

  _a.setFromMatrixPosition(root.matrixWorld);
  _b.setFromMatrixPosition(mid.matrixWorld);
  _c.setFromMatrixPosition(end.matrixWorld);

  const lenAB = _a.distanceTo(_b);
  const lenBC = _b.distanceTo(_c);
  const maxLen = (lenAB + lenBC) * 0.995;

  _t.copy(target).sub(_a);
  let dist = _t.length();
  if (dist < 1e-4) return;
  if (dist > maxLen) { _t.multiplyScalar(maxLen / dist); dist = maxLen; }
  _t.add(_a);

  // interior angles from the law of cosines
  const d = dist;
  const cosA = clampC((lenAB * lenAB + d * d - lenBC * lenBC) / (2 * lenAB * d));
  const cosB = clampC((lenAB * lenAB + lenBC * lenBC - d * d) / (2 * lenAB * lenBC));
  const angA = Math.acos(cosA);
  const angB = Math.acos(cosB);

  // current angles
  _dir.copy(_t).sub(_a).normalize();
  const curDirAC = _c.clone().sub(_a).normalize();
  const curDirAB = _b.clone().sub(_a).normalize();
  const curA = Math.acos(clampC(curDirAB.dot(curDirAC)));
  const curB = Math.acos(clampC(_b.clone().sub(_a).normalize().dot(_c.clone().sub(_b).normalize())));

  // 1. bend the joint
  _pole.copy(poleDir).normalize();
  _axis.crossVectors(curDirAB, curDirAC);
  if (_axis.lengthSq() < 1e-8) _axis.crossVectors(curDirAB, _pole);
  if (_axis.lengthSq() < 1e-8) _axis.set(0, 0, 1);
  _axis.normalize();
  rotateBoneWorld(mid, _axis, (Math.PI - angB) - (Math.PI - curB), weight);

  // 2. aim the chain at the target
  mid.updateWorldMatrix(false, false);
  end.updateWorldMatrix(false, false);
  _c.setFromMatrixPosition(end.matrixWorld);
  const aim = _c.clone().sub(_a).normalize();
  _q.setFromUnitVectors(aim, _dir);
  applyWorldQuat(root, _q, weight);

  // 3. swing the joint toward the pole so knees and elbows point sensibly
  root.updateWorldMatrix(false, false);
  mid.updateWorldMatrix(false, false);
  _b.setFromMatrixPosition(mid.matrixWorld);
  _perp.copy(_b).sub(_a);
  const along = _dir.clone().multiplyScalar(_perp.dot(_dir));
  _perp.sub(along);
  const poleFlat = _pole.clone().sub(_dir.clone().multiplyScalar(_pole.dot(_dir)));
  if (_perp.lengthSq() > 1e-8 && poleFlat.lengthSq() > 1e-8) {
    _perp.normalize(); poleFlat.normalize();
    let ang = Math.acos(clampC(_perp.dot(poleFlat)));
    if (_perp.clone().cross(poleFlat).dot(_dir) < 0) ang = -ang;
    rotateBoneWorld(root, _dir, ang, weight * 0.85);
  }
  void angA; void curA;
}

function clampC(v) { return v < -1 ? -1 : v > 1 ? 1 : v; }

function rotateBoneWorld(bone, axisWorld, angle, weight) {
  if (Math.abs(angle) < 1e-5) return;
  _q.setFromAxisAngle(axisWorld, angle * weight);
  applyWorldQuat(bone, _q, 1);
}

/** Applies a world-space rotation to a bone by converting through its parent. */
function applyWorldQuat(bone, worldQuat, weight) {
  const parent = bone.parent;
  const pq = new THREE.Quaternion();
  if (parent) parent.getWorldQuaternion(pq);
  const inv = pq.clone().invert();
  const local = inv.multiply(worldQuat).multiply(pq);
  const target = bone.quaternion.clone().premultiply(local);
  bone.quaternion.slerp(target, weight);
  bone.updateMatrix();
  bone.updateWorldMatrix(false, false);
}

/** Where a hand should land on the rock in front of the climber. */
export function wallHold(world, origin, forward, side, up, reach = 0.62) {
  const p = origin.clone()
    .addScaledVector(forward, 0.30)
    .addScaledVector(side, 0.28)
    .addScaledVector(up, reach);
  const h = world.height(p.x, p.z);
  if (p.y < h) p.y = h;
  return p;
}
