/* The climber skeleton. Bone names are the contract between the mesh builder,
 * the animator and the IK solver. Lengths are in metres for a 1.78 m climber. */
import * as THREE from '../../../../vendor/three/three.module.js';

/** [name, parent, x, y, z] — offsets are local to the parent, rest pose. */
export const BONES = [
  ['hips', null, 0, 0.98, 0],
  ['spine1', 'hips', 0, 0.12, 0],
  ['spine2', 'spine1', 0, 0.13, 0],
  ['chest', 'spine2', 0, 0.14, 0],
  ['neck', 'chest', 0, 0.11, 0.01],
  ['head', 'neck', 0, 0.09, 0.005],
  ['headTop', 'head', 0, 0.20, 0],

  ['clavicleL', 'chest', 0.05, 0.08, 0.01],
  ['armL', 'clavicleL', 0.13, 0.01, 0],
  ['foreL', 'armL', 0.28, 0, 0],
  ['handL', 'foreL', 0.26, 0, 0],
  ['fingerL', 'handL', 0.10, 0, 0],

  ['clavicleR', 'chest', -0.05, 0.08, 0.01],
  ['armR', 'clavicleR', -0.13, 0.01, 0],
  ['foreR', 'armR', -0.28, 0, 0],
  ['handR', 'foreR', -0.26, 0, 0],
  ['fingerR', 'handR', -0.10, 0, 0],

  ['thighL', 'hips', 0.09, -0.06, 0],
  ['shinL', 'thighL', 0, -0.44, 0],
  ['footL', 'shinL', 0, -0.42, 0],
  ['toeL', 'footL', 0, -0.06, 0.15],

  ['thighR', 'hips', -0.09, -0.06, 0],
  ['shinR', 'thighR', 0, -0.44, 0],
  ['footR', 'shinR', 0, -0.42, 0],
  ['toeR', 'footR', 0, -0.06, 0.15],
];

export const CHAIN = {
  armL: ['armL', 'foreL', 'handL'],
  armR: ['armR', 'foreR', 'handR'],
  legL: ['thighL', 'shinL', 'footL'],
  legR: ['thighR', 'shinR', 'footR'],
};

/** Builds a THREE.Skeleton plus a name->bone map and rest-pose world positions. */
export function makeSkeleton() {
  const bones = [];
  const byName = new Map();
  for (const [name, parent, x, y, z] of BONES) {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    byName.set(name, b);
    if (parent) byName.get(parent).add(b);
    bones.push(b);
  }
  const root = byName.get('hips');
  root.updateMatrixWorld(true);

  const rest = new Map();
  const v = new THREE.Vector3();
  for (const b of bones) rest.set(b.name, b.getWorldPosition(new THREE.Vector3()).clone());

  const skeleton = new THREE.Skeleton(bones);
  return { skeleton, bones, byName, root, rest };
}

/** Segment list used for skin weighting: [boneName, from, to, radius]. */
export function segments(rest) {
  const seg = (bone, from, to, r) => ({ bone, a: rest.get(from), b: rest.get(to), r });
  return [
    seg('hips', 'hips', 'spine1', 0.19),
    seg('spine1', 'spine1', 'spine2', 0.19),
    seg('spine2', 'spine2', 'chest', 0.20),
    seg('chest', 'chest', 'neck', 0.20),
    seg('neck', 'neck', 'head', 0.075),
    seg('head', 'head', 'headTop', 0.115),
    seg('clavicleL', 'clavicleL', 'armL', 0.10),
    seg('armL', 'armL', 'foreL', 0.075),
    seg('foreL', 'foreL', 'handL', 0.062),
    seg('handL', 'handL', 'fingerL', 0.055),
    seg('clavicleR', 'clavicleR', 'armR', 0.10),
    seg('armR', 'armR', 'foreR', 0.075),
    seg('foreR', 'foreR', 'handR', 0.062),
    seg('handR', 'handR', 'fingerR', 0.055),
    seg('thighL', 'thighL', 'shinL', 0.105),
    seg('shinL', 'shinL', 'footL', 0.078),
    seg('footL', 'footL', 'toeL', 0.07),
    seg('thighR', 'thighR', 'shinR', 0.105),
    seg('shinR', 'shinR', 'footR', 0.078),
    seg('footR', 'footR', 'toeR', 0.07),
  ];
}

/** Distance from point p to segment ab, and the parametric position along it. */
export function segDistance(p, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const apx = p.x - a.x, apy = p.y - a.y, apz = p.z - a.z;
  const len2 = abx * abx + aby * aby + abz * abz || 1e-6;
  let t = (apx * abx + apy * aby + apz * abz) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = apx - abx * t, dy = apy - aby * t, dz = apz - abz * t;
  return { d: Math.sqrt(dx * dx + dy * dy + dz * dz), t };
}
