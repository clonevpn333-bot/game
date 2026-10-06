import * as THREE from 'three';
import { retro, Mats } from '../world/Materials';
import { Tex } from '../world/Textures';
import { bakeMeshes, latheG, limb, skeleton, type Rig } from './Rig';

/**
 * Archdeacon Morvane, head of the Waking Choir. White-and-gold vestments, a crimson stole,
 * a crown shaped like an inverted bell, and a golden mask engraved with the Church's
 * closed eye, worn by the man who chose to open it.
 */
export type MorvaneRig = Rig & { staffTop: THREE.Object3D; halo: THREE.Mesh; glow: THREE.MeshStandardMaterial };

function part(parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number] = [0, 0, 0], r: [number, number, number] = [0, 0, 0], s: [number, number, number] = [1, 1, 1]): THREE.Mesh {
  const me = new THREE.Mesh(g, m);
  me.position.set(...p);
  me.rotation.set(...r);
  me.scale.set(...s);
  me.castShadow = true;
  parent.add(me);
  return me;
}

export function buildMorvane(scale = 1.22): MorvaneRig {
  const m = Mats();
  const white = retro(new THREE.MeshStandardMaterial({ map: Tex.cloth(196, 188, 170, 'morvWhite'), bumpMap: Tex.cloth(196, 188, 170, 'morvWhite'), bumpScale: 1.2, roughness: 0.85, side: THREE.DoubleSide }));
  const crimson = retro(new THREE.MeshStandardMaterial({ map: Tex.cloth(130, 24, 30, 'morvRed'), roughness: 0.8, side: THREE.DoubleSide }));
  const gold = retro(new THREE.MeshStandardMaterial({ color: '#d8a850', metalness: 0.9, roughness: 0.28 }));
  const glow = new THREE.MeshStandardMaterial({ color: '#2a1a04', emissive: '#ffc850', emissiveIntensity: 2.4 });
  const skin = retro(new THREE.MeshStandardMaterial({ color: '#c8b8a4', roughness: 0.7 }));
  const rig = skeleton({ scale, hipY: 0.98, thigh: 0.46, shin: 0.44, spine: 0.28, chest: 0.36, shoulderW: 0.22 });
  const { j } = rig;
  // Long cope that sweeps the floor, with a gold-embroidered hem.
  part(j.hips, latheG([[0.18, 0.14], [0.22, 0], [0.3, -0.35], [0.4, -0.75], [0.48, -0.96], [0.5, -0.99]], 20), white);
  part(j.hips, new THREE.TorusGeometry(0.49, 0.018, 4, 28), gold, [0, -0.97, 0], [Math.PI / 2, 0, 0]);
  // Crimson stole hanging down the front.
  for (const sx of [-1, 1]) {
    const g = new THREE.PlaneGeometry(0.1, 1.05, 1, 4);
    g.translate(0, -0.52, 0);
    part(j.chest, g, crimson, [sx * 0.07, 0.34, 0.2], [0.08, 0, 0]);
  }
  part(j.spine, limb(0.18, 0.17, 0.3, 14), white, [0, 0.3, 0]);
  part(j.chest, latheG([[0.17, -0.04], [0.21, 0.1], [0.22, 0.24], [0.14, 0.34], [0.07, 0.37]], 16), white);
  // Mantle with a gold collar.
  part(j.chest, latheG([[0.08, 0.38], [0.2, 0.33], [0.3, 0.2], [0.33, 0.12]], 18), crimson, [0, 0, 0], [0, 0, 0], [1, 1, 0.85]);
  part(j.chest, new THREE.TorusGeometry(0.11, 0.025, 6, 18), gold, [0, 0.37, 0], [Math.PI / 2, 0, 0]);
  part(j.chest, new THREE.CylinderGeometry(0.05, 0.05, 0.01, 12), gold, [0, 0.22, 0.2], [Math.PI / 2, 0, 0]);
  // Head: golden mask with the closed eye, under a bell-shaped crown.
  part(j.head, new THREE.SphereGeometry(0.11, 16, 12), skin, [0, 0.12, -0.01], [0, 0, 0], [0.9, 1.1, 1]);
  const mask = new THREE.SphereGeometry(0.118, 16, 12, Math.PI * 0.1, Math.PI * 0.8, Math.PI * 0.2, Math.PI * 0.62);
  part(j.head, mask, gold, [0, 0.12, 0.0], [0, -Math.PI / 2, 0], [0.92, 1.12, 1.05]);
  for (const sx of [-1, 1]) {
    const lid = new THREE.TorusGeometry(0.03, 0.006, 4, 10, Math.PI);
    part(j.head, lid, m.ironDark, [sx * 0.04, 0.14, 0.108], [0, 0, Math.PI]);
  }
  part(j.head, latheG([[0.13, 0.22], [0.12, 0.3], [0.09, 0.42], [0.1, 0.5], [0.16, 0.56], [0.15, 0.6], [0.0001, 0.6]], 16), white);
  for (const y of [0.24, 0.5]) part(j.head, new THREE.TorusGeometry(y > 0.4 ? 0.155 : 0.125, 0.012, 4, 18), gold, [0, y, 0], [Math.PI / 2, 0, 0]);
  part(j.head, latheG([[0.0001, 0.06], [0.03, 0.05], [0.05, 0.0], [0.06, -0.05], [0.0001, -0.04]], 10), gold, [0, 0.74, 0]);
  const halo = part(j.head, new THREE.TorusGeometry(0.3, 0.012, 4, 40), glow, [0, 0.36, -0.14]);
  halo.userData.keep = true;
  // Arms: wide sleeves, long pale hands.
  for (const side of ['L', 'R'] as const) {
    part(j[`shoulder${side}`], limb(0.07, 0.08, 0.3, 10), white);
    part(j[`elbow${side}`], latheG([[0.07, 0], [0.11, -0.14], [0.17, -0.27]], 12), white);
    part(j[`elbow${side}`], new THREE.TorusGeometry(0.165, 0.01, 4, 14), gold, [0, -0.27, 0], [Math.PI / 2, 0, 0]);
    part(j[`hand${side}`], new THREE.SphereGeometry(0.042, 8, 6), skin, [0, -0.05, 0], [0, 0, 0], [0.7, 1.4, 0.9]);
  }
  // Crozier topped by a small bell.
  const staff = new THREE.Group();
  part(staff, new THREE.CylinderGeometry(0.022, 0.026, 2.3, 8), gold, [0, 0.45, 0]);
  const hook = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 1.6, 0), new THREE.Vector3(0.05, 1.82, 0), new THREE.Vector3(0.2, 1.9, 0), new THREE.Vector3(0.26, 1.76, 0), new THREE.Vector3(0.18, 1.66, 0)]);
  part(staff, new THREE.TubeGeometry(hook, 14, 0.02, 6), gold);
  part(staff, latheG([[0.0001, 0.0], [0.04, -0.01], [0.06, -0.06], [0.075, -0.13], [0.0001, -0.12]], 10), gold, [0.18, 1.62, 0]);
  const staffTop = new THREE.Object3D();
  staffTop.position.set(0.18, 1.58, 0);
  staff.add(staffTop);
  part(staff, new THREE.SphereGeometry(0.035, 8, 6), glow, [0.18, 1.52, 0]);
  staff.position.set(0, -0.06, 0.02);
  staff.rotation.x = Math.PI / 2 - 0.1;
  j.handR.add(staff);
  bakeMeshes(rig.root);
  rig.flashMats.push(glow);
  return { ...rig, staffTop, halo, glow };
}
