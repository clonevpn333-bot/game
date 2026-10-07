import * as THREE from 'three';

/** Rest pose joint positions (world space, metres) for a 1.78 m adult facing +Z. */
export interface JointDef {
  name: string;
  parent: string | null;
  at: [number, number, number];
}

export const HUMANOID: JointDef[] = [
  { name: 'hips', parent: null, at: [0, 0.96, 0] },
  { name: 'spine', parent: 'hips', at: [0, 1.07, -0.005] },
  { name: 'chest', parent: 'spine', at: [0, 1.24, -0.01] },
  { name: 'neck', parent: 'chest', at: [0, 1.47, -0.02] },
  { name: 'head', parent: 'neck', at: [0, 1.56, -0.01] },
  { name: 'shoulder.L', parent: 'chest', at: [0.04, 1.43, -0.02] },
  { name: 'upperArm.L', parent: 'shoulder.L', at: [0.185, 1.42, -0.025] },
  { name: 'foreArm.L', parent: 'upperArm.L', at: [0.215, 1.13, -0.03] },
  { name: 'hand.L', parent: 'foreArm.L', at: [0.235, 0.885, -0.005] },
  { name: 'thigh.L', parent: 'hips', at: [0.095, 0.92, 0] },
  { name: 'shin.L', parent: 'thigh.L', at: [0.1, 0.505, 0.01] },
  { name: 'foot.L', parent: 'shin.L', at: [0.105, 0.085, -0.02] },
  { name: 'toe.L', parent: 'foot.L', at: [0.11, 0.025, 0.11] },
];

export function mirrorJoints(defs: JointDef[]): JointDef[] {
  const out = [...defs];
  for (const d of defs) {
    if (!d.name.endsWith('.L')) continue;
    out.push({ name: d.name.replace('.L', '.R'), parent: d.parent && d.parent.endsWith('.L') ? d.parent.replace('.L', '.R') : d.parent, at: [-d.at[0], d.at[1], d.at[2]] });
  }
  return out;
}

export interface Rig {
  root: THREE.Bone;
  bones: THREE.Bone[];
  byName: Map<string, THREE.Bone>;
  index: Map<string, number>;
  rest: Map<string, THREE.Vector3>; // world rest positions
  skeleton: THREE.Skeleton;
}

/**
 * Build a bone hierarchy whose bind pose has identity rotations, so every
 * animation value is simply the bone's local rotation.
 */
export function buildRig(defs: JointDef[], scale = 1): Rig {
  const byName = new Map<string, THREE.Bone>();
  const rest = new Map<string, THREE.Vector3>();
  const bones: THREE.Bone[] = [];
  const index = new Map<string, number>();
  for (const d of defs) {
    const b = new THREE.Bone();
    b.name = d.name;
    const w = new THREE.Vector3(...d.at).multiplyScalar(scale);
    rest.set(d.name, w);
    const p = d.parent ? rest.get(d.parent)! : new THREE.Vector3();
    b.position.copy(w).sub(p);
    if (d.parent) byName.get(d.parent)!.add(b);
    byName.set(d.name, b);
    index.set(d.name, bones.length);
    bones.push(b);
  }
  const root = bones[0];
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  return { root, bones, byName, index, rest, skeleton };
}

/** Bone-name → index map used by the sculptor to emit skin weights. */
export function boneIndex(rig: Rig): Map<string, number> {
  const m = new Map(rig.index);
  m.set('root', 0);
  return m;
}
