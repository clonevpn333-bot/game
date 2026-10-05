import * as THREE from 'three';
import { retro, Mats } from '../world/Materials';
import { Tex } from '../world/Textures';
import { bakeMeshes, latheG, limb, skeleton, type FolkStyle, type Rig } from './Rig';
import { createSeededRandom } from '../utils/random';

/**
 * Townsfolk of Velmour: sculpted heads (cranium, jaw, nose, brow, ears, eyes), hair and
 * beards, layered period clothing and articulated hands. Stylised dark fantasy, not blocks.
 */

let counter = 0;

const HAIR = ['#2a1c14', '#4a3020', '#6a4a2a', '#1a1614', '#8a7a6a', '#b8b0a4'];
const SHIRT = ['#cbbfa4', '#a8a090', '#8a8070'];

function cloth(color: THREE.Color, key: string): THREE.MeshStandardMaterial {
  const t = Tex.cloth(Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255), key);
  return retro(new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: 1.5, roughness: 0.95, side: THREE.DoubleSide }), 'folk');
}

function part(parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, p: [number, number, number] = [0, 0, 0], r: [number, number, number] = [0, 0, 0], s: [number, number, number] = [1, 1, 1]): THREE.Mesh {
  const me = new THREE.Mesh(g, m);
  me.position.set(...p);
  me.rotation.set(...r);
  me.scale.set(...s);
  me.castShadow = true;
  parent.add(me);
  return me;
}

export function buildTownsfolk(style: FolkStyle): Rig & { lantern?: THREE.Object3D } {
  const seed = (counter += 1);
  const rng = createSeededRandom(seed * 977 + 13);
  const m = Mats();
  const old = style.mood === 'old';
  const feminine = !style.guard && rng() < 0.45;
  const rig = skeleton({ scale: (style.scale ?? 0.97) * (feminine ? 0.95 : 1), hipY: 0.96, thigh: 0.45, shin: 0.43, spine: 0.26, chest: 0.34, shoulderW: feminine ? 0.19 : 0.215 });
  const { j } = rig;
  const skinCol = new THREE.Color(style.skin);
  const skin = retro(new THREE.MeshStandardMaterial({ color: skinCol, roughness: 0.72 }), 'skin');
  const lip = new THREE.MeshStandardMaterial({ color: skinCol.clone().multiplyScalar(0.62).lerp(new THREE.Color('#7a3028'), 0.3), roughness: 0.6 });
  const dark = new THREE.MeshStandardMaterial({ color: '#120c0a', roughness: 0.4 });
  const white = new THREE.MeshStandardMaterial({ color: '#d8d0c4', roughness: 0.4 });
  const hairCol = old ? HAIR[4 + Math.floor(rng() * 2)] : HAIR[Math.floor(rng() * 4)];
  const hairMat = retro(new THREE.MeshStandardMaterial({ color: hairCol, roughness: 0.85 }), 'hair');
  const outerColor = ((style.robe as THREE.MeshStandardMaterial).map ? new THREE.Color('#ffffff') : (style.robe as THREE.MeshStandardMaterial).color).clone();
  const outer = style.robe;
  const shirt = cloth(new THREE.Color(SHIRT[Math.floor(rng() * 3)]), `shirt${seed % 3}`);
  const hose = cloth(new THREE.Color(rng() < 0.5 ? '#3a3430' : '#4a3a2a'), `hose${seed % 2}`);
  const leather = m.leatherDark;
  void outerColor;

  // ------------------------------------------------------------ head
  const H = j.head;
  part(H, new THREE.SphereGeometry(0.104, 16, 12), skin, [0, 0.135, -0.008], [0, 0, 0], [0.9, 1.06, 1.02]);
  part(H, new THREE.SphereGeometry(0.084, 14, 10), skin, [0, 0.078, 0.026], [0, 0, 0], [feminine ? 0.8 : 0.88, 0.95, 0.9]);
  part(H, new THREE.SphereGeometry(0.03, 8, 6), skin, [0, 0.022, 0.07], [0, 0, 0], [1.1, 0.9, 1]);
  part(H, new THREE.ConeGeometry(0.019, 0.055, 4), skin, [0, 0.098, 0.106], [Math.PI / 2 + 0.35, Math.PI / 4, 0], [1, 1, 1.3]);
  part(H, new THREE.CapsuleGeometry(0.014, 0.07, 3, 6), skin, [0, 0.14, 0.088], [0, 0, Math.PI / 2]);
  for (const sx of [-1, 1]) {
    part(H, new THREE.SphereGeometry(0.014, 8, 6), white, [sx * 0.034, 0.12, 0.088]);
    part(H, new THREE.SphereGeometry(0.008, 6, 5), dark, [sx * 0.034, 0.12, 0.099]);
    part(H, new THREE.SphereGeometry(0.028, 8, 6), skin, [sx * 0.097, 0.11, 0.0], [0, 0, 0], [0.35, 1, 0.65]);
    part(H, new THREE.SphereGeometry(0.02, 6, 5), skin, [sx * 0.045, 0.085, 0.085], [0, 0, 0], [1.1, 0.8, 0.7]);
    if (style.mood === 'fear') part(H, new THREE.BoxGeometry(0.03, 0.006, 0.01), dark, [sx * 0.034, 0.142, 0.094], [0, 0, sx * -0.4]);
    if (style.mood === 'grim' || old) part(H, new THREE.BoxGeometry(0.03, 0.007, 0.01), hairMat, [sx * 0.034, 0.142, 0.096], [0, 0, sx * 0.15]);
  }
  part(H, new THREE.BoxGeometry(style.mood === 'fear' ? 0.025 : 0.034, style.mood === 'fear' ? 0.018 : 0.008, 0.012), lip, [0, 0.052, 0.088]);
  // Hair / hood / beard.
  if (style.hood) {
    const hood = new THREE.SphereGeometry(0.135, 16, 12, Math.PI * 0.72, Math.PI * 1.56, 0, Math.PI * 0.72);
    part(H, hood, outer, [0, 0.12, -0.01], [0, 0, 0], [1, 1.1, 1.08]);
    part(H, latheG([[0.13, 0.0], [0.16, -0.08], [0.22, -0.16]], 16), outer, [0, 0.03, -0.01]);
  } else if (style.hair !== false) {
    const cap = new THREE.SphereGeometry(0.112, 16, 10, Math.PI * 0.8, Math.PI * 1.4, 0, Math.PI * 0.55);
    part(H, cap, hairMat, [0, 0.135, -0.012], [0, 0, 0], [0.95, 1.05, 1.05]);
    part(H, new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.32), hairMat, [0, 0.14, -0.005], [-0.25, 0, 0], [0.95, 1.06, 1.06]);
    if (feminine) {
      const braid = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.12, -0.1), new THREE.Vector3(0.02, 0.0, -0.13), new THREE.Vector3(0.0, -0.15, -0.12), new THREE.Vector3(0.01, -0.3, -0.1)]);
      part(H, new THREE.TubeGeometry(braid, 10, 0.03, 6), hairMat);
    }
  }
  if (!feminine && (old || rng() < 0.4)) {
    part(H, latheG([[0.07, 0.07], [0.082, 0.03], [0.07, -0.02], [0.03, -0.06], [0.0001, -0.07]], 10), hairMat, [0, 0.035, 0.03], [0, 0, 0], [1, 1, 0.85]);
  }
  if (style.guard) {
    part(H, latheG([[0.0001, 0.31], [0.12, 0.28], [0.16, 0.2], [0.24, 0.15], [0.23, 0.13], [0.14, 0.14], [0.0001, 0.14]], 16), m.plateDark, [0, 0.02, 0]);
  }
  // Neck.
  part(j.neck, limb(0.045, 0.05, 0.12, 10), skin, [0, 0.12, 0]);

  // ------------------------------------------------------------ torso & clothing
  part(j.spine, latheG([[0.155, -0.02], [0.165, 0.1], [0.172, 0.24], [0.165, 0.3]], 14), shirt);
  const chestProfile: Array<[number, number]> = feminine
    ? [[0.165, -0.04], [0.18, 0.08], [0.185, 0.16], [0.17, 0.24], [0.13, 0.31], [0.075, 0.35]]
    : [[0.17, -0.04], [0.19, 0.08], [0.2, 0.18], [0.19, 0.26], [0.13, 0.32], [0.075, 0.35]];
  const torso = latheG(chestProfile, 16);
  torso.scale(1, 1, 0.78);
  part(j.chest, torso, style.guard ? cloth(new THREE.Color('#6a5a44'), 'gambeson') : outer);
  if (!style.guard && !style.hood) {
    // Shawl or mantle over the shoulders.
    if (rng() < 0.6) part(j.chest, latheG([[0.08, 0.36], [0.17, 0.32], [0.25, 0.24], [0.27, 0.19]], 16), cloth(new THREE.Color(rng() < 0.5 ? '#5a4232' : '#3a4048'), `shawl${seed % 2}`), [0, 0, 0], [0, 0, 0], [1, 1, 0.82]);
  }
  part(j.chest, latheG([[0.075, 0.33], [0.08, 0.37], [0.065, 0.39]], 12), shirt);
  if (style.guard) {
    part(j.chest, latheG([[0.19, -0.02], [0.215, 0.1], [0.21, 0.24], [0.12, 0.33], [0.0001, 0.34]], 16), m.plateDark, [0, 0, 0.01], [0, 0, 0], [1, 1, 0.85]);
  }
  // Belt with pouch.
  part(j.hips, new THREE.TorusGeometry(0.17, 0.02, 6, 18), leather, [0, 0.1, 0], [Math.PI / 2, 0, 0], [1, 0.82, 1]);
  part(j.hips, new THREE.BoxGeometry(0.035, 0.035, 0.012), m.gold, [0, 0.1, 0.142]);
  part(j.hips, new THREE.SphereGeometry(0.045, 8, 6), leather, [0.15, 0.04, 0.06], [0, 0, 0], [0.8, 1.1, 0.6]);
  const long = feminine || old || (style.robe === m.robeWhite || style.robe === m.robeBlack);
  if (long) {
    // Skirt / long robe to the ankles.
    part(j.hips, latheG([[0.165, 0.12], [0.19, 0.0], [0.24, -0.3], [0.3, -0.62], [0.34, -0.86], [0.35, -0.9]], 18), outer, [0, 0, 0], [0, 0, 0], [1, 1, 0.9]);
  } else {
    // Belted tunic to mid-thigh, hose and boots beneath.
    part(j.hips, latheG([[0.165, 0.12], [0.19, 0.0], [0.22, -0.18], [0.25, -0.34]], 16), outer, [0, 0, 0], [0, 0, 0], [1, 1, 0.88]);
  }
  if (!long && rng() < 0.35) {
    const apron = new THREE.PlaneGeometry(0.26, 0.5, 1, 3);
    apron.translate(0, -0.25, 0);
    part(j.hips, apron, cloth(new THREE.Color('#b8ac94'), 'apron'), [0, 0.08, 0.17], [0.08, 0, 0]);
  }

  // ------------------------------------------------------------ limbs
  for (const [side, sx] of [['L', 1], ['R', -1]] as const) {
    part(j[`shoulder${side}`], new THREE.SphereGeometry(0.068, 10, 8), outer, [0, -0.01, 0], [0, 0, 0], [1, 1, 0.9]);
    part(j[`shoulder${side}`], limb(0.062, 0.052, 0.29, 10), outer);
    part(j[`elbow${side}`], latheG([[0.05, 0.01], [0.052, -0.12], [0.064, -0.22], [0.07, -0.25]], 10), outer);
    const hand = j[`hand${side}`];
    part(hand, new THREE.SphereGeometry(0.04, 10, 8), skin, [0, -0.04, 0], [0, 0, 0], [0.75, 1.1, 1.0]);
    part(hand, new THREE.CapsuleGeometry(0.018, 0.045, 3, 6), skin, [0, -0.085, 0.012], [0.35, 0, 0], [1.35, 1, 1]);
    part(hand, new THREE.CapsuleGeometry(0.012, 0.03, 3, 5), skin, [-sx * 0.025, -0.055, 0.025], [0.8, 0, sx * 0.4]);
    void sx;
  }
  for (const side of ['L', 'R'] as const) {
    part(j[`hip${side}`], limb(0.085, 0.064, 0.44, 10), hose);
    part(j[`knee${side}`], limb(0.062, 0.045, 0.32, 10), hose);
    // Turned-down boot shaft and a shaped foot.
    part(j[`knee${side}`], latheG([[0.05, -0.2], [0.06, -0.3], [0.068, -0.4], [0.075, -0.43]], 12), leather);
    part(j[`foot${side}`], new THREE.SphereGeometry(0.062, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), leather, [0, -0.07, 0.035], [0, 0, 0], [0.95, 0.9, 1.9]);
    part(j[`foot${side}`], new THREE.BoxGeometry(0.1, 0.02, 0.24), dark, [0, -0.085, 0.04]);
  }

  let lantern: THREE.Object3D | undefined;
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
  void Tex;
  bakeMeshes(rig.root);
  return { ...rig, lantern };
}
