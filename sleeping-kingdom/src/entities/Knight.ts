import * as THREE from 'three';
import { retro } from '../world/Materials';
import { HeroTex } from './HeroTextures';
import { latheG, limb, skeleton, type Rig } from './Rig';
import { damp } from '../utils/math';

/** Shared rim strength so the director can boost the hero rim in dark scenes. */
export const HeroRim = { uRim: { value: 1 } };

/**
 * Hero material: PBR + painted albedo + a cool fresnel rim (keeps the silhouette readable
 * against night backgrounds) + the subtle retro vertex snap.
 */
function heroMat(params: THREE.MeshStandardMaterialParameters, rim = 0.5, rimColor = '#8fa8ff'): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial(params);
  const c = new THREE.Color(rimColor);
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = HeroRim.uRim;
    shader.uniforms.uRimColor = { value: c };
    shader.fragmentShader = 'uniform float uRim;\nuniform vec3 uRimColor;\n' + shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       float rimF = pow(1.0 - saturate(abs(dot(normalize(vNormal), normalize(vViewPosition)))), 3.0);
       totalEmissiveRadiance += uRimColor * rimF * uRim * ${rim.toFixed(2)};`,
    );
  };
  m.customProgramCacheKey = () => `hero-${rim}-${rimColor}`;
  return retro(m, `hero-${rim}`);
}

export type KnightMats = ReturnType<typeof makeMats>;

function makeMats() {
  return {
    plate: heroMat({ map: HeroTex.plate(), color: '#d8dde8', metalness: 0.72, roughness: 0.36 }, 0.42),
    plateDark: heroMat({ map: HeroTex.plateDark(), color: '#ffffff', metalness: 0.65, roughness: 0.42 }, 0.5),
    trim: heroMat({ map: HeroTex.trim(), color: '#ffffff', metalness: 0.9, roughness: 0.34 }, 0.12, '#ffd28a'),
    mail: heroMat({ map: HeroTex.mail(), color: '#ffffff', metalness: 0.6, roughness: 0.5, side: THREE.DoubleSide }, 0.35),
    leather: heroMat({ map: HeroTex.leather(), color: '#ffffff', roughness: 0.82 }, 0.25),
    cloak: heroMat({ map: HeroTex.cloak(), color: '#ffffff', roughness: 0.95, side: THREE.DoubleSide, alphaTest: 0.5 }, 0.35, '#ff8a70'),
    tabard: heroMat({ map: HeroTex.tabard(), color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide, alphaTest: 0.5 }, 0.3),
    fur: heroMat({ map: HeroTex.fur(), color: '#ffffff', roughness: 1 }, 0.4, '#c0b0a0'),
    crest: heroMat({ map: HeroTex.crest(), color: '#ffffff', roughness: 0.9, side: THREE.DoubleSide, alphaTest: 0.4 }, 0.4, '#ff7050'),
    blade: heroMat({ map: HeroTex.blade(), color: '#ffffff', metalness: 1, roughness: 0.16, emissive: '#1c2430', emissiveIntensity: 0.35 }, 0.35, '#c8d8ff'),
    dark: new THREE.MeshStandardMaterial({ color: '#050506', roughness: 1 }),
  };
}

const m4 = new THREE.Matrix4();

function part(parent: THREE.Object3D, g: THREE.BufferGeometry, mat: THREE.Material, p: [number, number, number] = [0, 0, 0], r: [number, number, number] = [0, 0, 0], s: [number, number, number] = [1, 1, 1]): THREE.Mesh {
  const mesh = new THREE.Mesh(g, mat);
  mesh.position.set(...p);
  mesh.rotation.set(...r);
  mesh.scale.set(...s);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  parent.add(mesh);
  return mesh;
}

/** Partial sphere shell. */
function shell(r: number, phiStart: number, phiLen: number, thetaStart: number, thetaLen: number, segs = 16): THREE.BufferGeometry {
  return new THREE.SphereGeometry(r, segs, Math.max(6, Math.round(segs * 0.6)), phiStart, phiLen, thetaStart, thetaLen);
}

/** Open curved plate wrapping +Z (front) by default. */
function arcPlate(rTop: number, rBot: number, h: number, arc: number, center = 0, segs = 12): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(rTop, rBot, h, segs, 1, true, center - arc / 2, arc);
}

function rivets(parent: THREE.Object3D, mat: THREE.Material, count: number, radius: number, y: number, arcStart: number, arcLen: number, size = 0.012): void {
  const g = new THREE.SphereGeometry(size, 5, 4);
  for (let i = 0; i < count; i += 1) {
    const a = arcStart + (arcLen * (i + 0.5)) / count;
    part(parent, g, mat, [Math.sin(a) * radius, y, Math.cos(a) * radius]);
  }
}

export type Knight = Rig & {
  sword: THREE.Group;
  swordTip: THREE.Object3D;
  gripB: THREE.Object3D;
  cloakAnchorL: THREE.Object3D;
  cloakAnchorR: THREE.Object3D;
  mats: KnightMats;
  /** Secondary motion + two-hand grip IK; call after the animator applied the pose. */
  secondary: (dt: number, speed: number, ikWeight: number) => void;
};

export function buildKnight(): Knight {
  const mt = makeMats();
  const rig = skeleton({ scale: 1.05, hipY: 0.98, thigh: 0.46, shin: 0.44, spine: 0.27, chest: 0.36, shoulderW: 0.27 });
  const { j } = rig;

  // ============================================================== pelvis
  part(j.hips, latheG([[0.17, 0.12], [0.205, 0.02], [0.24, -0.12], [0.272, -0.27], [0.29, -0.37]], 18), mt.mail);
  for (let i = 0; i < 3; i += 1) {
    const r = 0.218 + i * 0.014;
    part(j.hips, latheG([[r - 0.004, 0.1 - i * 0.055], [r + 0.006, 0.055 - i * 0.055], [r + 0.012, 0.02 - i * 0.055]], 18), mt.plate, [0, 0, 0], [0, 0, 0], [1, 1, 0.88]);
  }
  part(j.hips, new THREE.TorusGeometry(0.218, 0.026, 6, 22), mt.leather, [0, 0.115, 0], [Math.PI / 2, 0, 0], [1, 0.88, 1]);
  part(j.hips, new THREE.BoxGeometry(0.07, 0.06, 0.02), mt.trim, [0, 0.115, 0.198]);
  part(j.hips, new THREE.SphereGeometry(0.05, 8, 6), mt.leather, [-0.19, 0.04, 0.09], [0, 0, 0], [0.9, 1.1, 0.7]);
  // Scabbard on the left hip.
  const scab = new THREE.Group();
  scab.position.set(0.23, 0.05, -0.05);
  scab.rotation.set(0.45, 0, 0.18);
  j.hips.add(scab);
  part(scab, new THREE.CylinderGeometry(0.03, 0.022, 0.95, 8), mt.leather, [0, -0.48, 0], [0, 0, 0], [1.4, 1, 0.6]);
  part(scab, new THREE.ConeGeometry(0.03, 0.08, 8), mt.trim, [0, -0.99, 0], [Math.PI, 0, 0], [1.4, 1, 0.6]);
  part(scab, new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), mt.trim, [0, -0.02, 0], [0, 0, 0], [1.4, 1, 0.6]);
  // Tabard panels on spring pivots.
  const tabardG = new THREE.PlaneGeometry(0.34, 0.66, 1, 5);
  tabardG.translate(0, -0.33, 0);
  const tabFront = new THREE.Group();
  tabFront.position.set(0, 0.08, 0.235);
  j.hips.add(tabFront);
  part(tabFront, tabardG, mt.tabard);
  const tabBack = new THREE.Group();
  tabBack.position.set(0, 0.08, -0.225);
  tabBack.rotation.y = Math.PI;
  j.hips.add(tabBack);
  part(tabBack, tabardG.clone(), mt.tabard);

  // ============================================================== torso
  part(j.spine, latheG([[0.2, -0.02], [0.215, 0.1], [0.222, 0.22], [0.21, 0.3]], 16), mt.leather);
  const breast = shell(0.255, 0, Math.PI, Math.PI * 0.3, Math.PI * 0.62, 20);
  part(j.chest, breast, mt.plate, [0, 0.17, 0.005], [0, 0, 0], [1.05, 1.28, 0.86]);
  part(j.chest, shell(0.255, Math.PI, Math.PI, Math.PI * 0.3, Math.PI * 0.62, 20), mt.plateDark, [0, 0.17, -0.005], [0, 0, 0], [1.05, 1.28, 0.8]);
  // Medial ridge following the breastplate curve.
  const ridgePts: THREE.Vector3[] = [];
  for (let i = 0; i <= 10; i += 1) {
    const th = Math.PI * (0.32 + 0.58 * (i / 10));
    ridgePts.push(new THREE.Vector3(0, 0.17 + Math.cos(th) * 0.255 * 1.28, Math.sin(th) * 0.255 * 0.86 + 0.012));
  }
  part(j.chest, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ridgePts), 16, 0.011, 5), mt.plate);
  // Brass neckline trim.
  part(j.chest, new THREE.TorusGeometry(0.155, 0.013, 5, 20, Math.PI), mt.trim, [0, 0.355, 0.03], [-1.2, 0, 0], [1.2, 1, 1]);
  // Waist plate band where breastplate meets fauld.
  part(j.chest, latheG([[0.235, -0.06], [0.245, -0.12], [0.24, -0.16]], 18), mt.plate, [0, 0, 0], [0, 0, 0], [1, 1, 0.9]);
  // Gorget.
  part(j.chest, latheG([[0.18, 0.31], [0.165, 0.36], [0.135, 0.41], [0.115, 0.44]], 16), mt.plate);
  part(j.chest, new THREE.TorusGeometry(0.115, 0.012, 5, 18), mt.trim, [0, 0.44, 0], [Math.PI / 2, 0, 0]);
  // Fur collar: heavy, readable silhouette over the shoulders.
  part(j.chest, new THREE.TorusGeometry(0.19, 0.075, 8, 20), mt.fur, [0, 0.39, -0.03], [Math.PI / 2 + 0.25, 0, 0], [1.25, 1, 0.75]);
  // Belt strap across the chest (baldric) for asymmetry.
  const baldric = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.2, 0.36, 0.06),
    new THREE.Vector3(-0.05, 0.24, 0.235),
    new THREE.Vector3(0.12, 0.05, 0.225),
    new THREE.Vector3(0.24, -0.12, 0.12),
  ]);
  part(j.chest, new THREE.TubeGeometry(baldric, 16, 0.018, 4), mt.leather, [0, 0, 0], [0, 0, 0], [1, 1, 1]);
  part(j.chest, new THREE.CylinderGeometry(0.022, 0.022, 0.012, 10), mt.trim, [-0.03, 0.215, 0.24], [Math.PI / 2 - 0.4, 0, 0]);

  // ============================================================== head
  part(j.neck, latheG([[0.1, 0.0], [0.1, 0.12]], 12), mt.mail);
  part(j.head, latheG([[0.12, 0.02], [0.155, -0.05], [0.21, -0.13]], 16), mt.mail);
  const helmProfile: Array<[number, number]> = [
    [0.0001, 0.385], [0.06, 0.378], [0.11, 0.35], [0.148, 0.295], [0.168, 0.215], [0.174, 0.12], [0.172, 0.03], [0.166, -0.04], [0.158, -0.085],
  ];
  const helm = latheG(helmProfile, 22);
  part(j.head, helm, mt.plate, [0, 0, 0], [0, 0, 0], [1, 1, 1.12]);
  // Brass cross reinforcement on the face and a brow band.
  part(j.head, new THREE.BoxGeometry(0.03, 0.32, 0.02), mt.trim, [0, 0.13, 0.19], [-0.1, 0, 0]);
  part(j.head, new THREE.TorusGeometry(0.173, 0.011, 4, 26, Math.PI * 1.1), mt.trim, [0, 0.215, 0], [Math.PI / 2, 0, Math.PI * -0.05], [1, 1.12, 1]);
  part(j.head, new THREE.TorusGeometry(0.162, 0.012, 4, 26), mt.trim, [0, -0.075, 0], [Math.PI / 2, 0, 0], [1, 1.12, 1]);
  // Vision slits either side of the nasal, breaths on the right cheek.
  for (const sx of [-1, 1]) part(j.head, new THREE.BoxGeometry(0.1, 0.018, 0.06), mt.dark, [sx * 0.07, 0.172, 0.172], [0, sx * 0.35, 0]);
  for (let i = 0; i < 6; i += 1) {
    part(j.head, new THREE.BoxGeometry(0.012, 0.012, 0.03), mt.dark, [-0.06 - (i % 3) * 0.025, 0.06 + Math.floor(i / 3) * 0.03, 0.172 - (i % 3) * 0.012]);
  }
  // Crest: a tall horsehair comb that streams behind.
  const crest = new THREE.Group();
  crest.position.set(0, 0.37, 0.02);
  j.head.add(crest);
  part(crest, new THREE.BoxGeometry(0.03, 0.04, 0.26), mt.trim, [0, 0.0, -0.06]);
  const crestStrands: THREE.Group[] = [];
  for (let i = 0; i < 5; i += 1) {
    const sg = new THREE.Group();
    sg.position.set(0, 0.01, 0.06 - i * 0.055);
    crest.add(sg);
    const pg = new THREE.PlaneGeometry(0.11, 0.42 + i * 0.05);
    pg.translate(0, -(0.21 + i * 0.025), 0);
    const p1 = part(sg, pg, mt.crest, [0, 0, 0], [0, Math.PI / 2, 0]);
    p1.castShadow = false;
    part(sg, pg.clone(), mt.crest, [0, 0, 0], [0, Math.PI / 2 + 0.5, 0]).castShadow = false;
    sg.rotation.x = -2.3 + i * 0.12; // streaming backward
    crestStrands.push(sg);
  }

  // ============================================================== arms
  for (const [side, sx] of [['L', 1], ['R', -1]] as const) {
    const sh = j[`shoulder${side}`];
    const el = j[`elbow${side}`];
    const hd = j[`hand${side}`];
    // Pauldron: three overlapping lames with brass edges and rivets.
    const paul = new THREE.Group();
    paul.position.set(sx * 0.025, 0.035, 0);
    paul.rotation.z = sx * -0.32;
    sh.add(paul);
    // Main cop: a shallow dome with a raised brass-edged rim.
    part(paul, shell(0.16, 0, Math.PI * 2, 0, Math.PI * 0.5, 20), mt.plate, [0, -0.02, 0], [0, 0, 0], [1.25, 0.55, 1.18]);
    part(paul, new THREE.TorusGeometry(0.16, 0.01, 4, 28), mt.trim, [0, -0.02, 0], [Math.PI / 2, 0, 0], [1.25, 1.18, 1]);
    // Raised haute-piece guard standing on the outer edge (classic knightly silhouette).
    part(paul, new THREE.CylinderGeometry(0.13, 0.15, 0.07, 14, 1, true, -Math.PI * 0.42, Math.PI * 0.84), mt.plate, [-sx * 0.035, 0.035, 0], [0, sx * Math.PI / 2, 0], [1, 1, 0.9]);
    rivets(paul, mt.trim, 7, 0.19, -0.005, -1.1, 2.2, 0.01);
    // Lames cascading down the upper arm.
    for (let l = 1; l <= 3; l += 1) {
      const r = 0.155 - l * 0.012;
      part(paul, new THREE.CylinderGeometry(r * 1.02, r * 1.08, 0.055, 18, 1, true), l === 3 ? mt.plateDark : mt.plate, [sx * 0.01 * l, -0.035 - l * 0.045, 0], [0, 0, sx * 0.05 * l], [1.12, 1, 1.05]);
    }
    // Upper arm: mail sleeve + rerebrace.
    part(sh, limb(0.085, 0.075, 0.28, 12), mt.mail);
    part(sh, new THREE.CylinderGeometry(0.088, 0.082, 0.14, 12, 1, true), mt.plate, [0, -0.17, 0]);
    // Couter with a fan wing on the outside of the elbow.
    part(el, new THREE.SphereGeometry(0.07, 12, 8), mt.plate, [0, 0, -0.015]);
    part(el, new THREE.CylinderGeometry(0.075, 0.075, 0.012, 14, 1, false, 0, Math.PI), mt.plate, [sx * 0.05, 0, -0.02], [0, 0, Math.PI / 2]);
    part(el, new THREE.SphereGeometry(0.014, 5, 4), mt.trim, [sx * 0.058, 0, -0.02]);
    // Vambrace.
    part(el, latheG([[0.07, -0.01], [0.077, -0.06], [0.072, -0.17], [0.064, -0.235]], 12), mt.plate);
    part(el, new THREE.TorusGeometry(0.066, 0.008, 4, 14), mt.trim, [0, -0.235, 0], [Math.PI / 2, 0, 0]);
    // Gauntlet: flared cuff, back-plate, curled fingers around the grip axis (hand +Z), thumb.
    part(hd, latheG([[0.06, 0.04], [0.098, -0.005], [0.105, -0.03], [0.07, -0.05]], 12), mt.plate);
    const palm = new THREE.SphereGeometry(0.058, 10, 8);
    part(hd, palm, mt.leather, [0, -0.075, 0], [0, 0, 0], [0.8, 1.15, 1.0]);
    part(hd, shell(0.062, Math.PI * 0.5 - (sx > 0 ? 0 : 0), Math.PI, 0.2, Math.PI * 0.75, 10), mt.plateDark, [0, -0.07, 0], [0, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 0], [0.9, 1.2, 1.05]);
    const fingers = new THREE.TorusGeometry(0.032, 0.02, 6, 10, Math.PI * 1.35);
    part(hd, fingers, mt.plateDark, [0, -0.115, 0.0], [0, 0, sx > 0 ? -0.6 : Math.PI + 0.6]);
    part(hd, new THREE.CapsuleGeometry(0.016, 0.04, 3, 6), mt.plateDark, [-sx * 0.035, -0.08, 0.035], [0.9, 0, 0]);
  }

  // ============================================================== legs
  for (const [side, sx] of [['L', 1], ['R', -1]] as const) {
    const hp = j[`hip${side}`];
    const kn = j[`knee${side}`];
    const ft = j[`foot${side}`];
    part(hp, limb(0.128, 0.098, 0.44, 12), mt.leather);
    // Tasset (two lames) hanging over the thigh front.
    part(hp, arcPlate(0.15, 0.165, 0.13, 2.1, sx * 0.25), mt.plate, [0, 0.0, 0.01], [-0.12, 0, 0]);
    part(hp, arcPlate(0.155, 0.17, 0.11, 2.0, sx * 0.25), mt.plateDark, [0, -0.1, 0.015], [-0.12, 0, 0]);
    // Cuisse.
    part(hp, arcPlate(0.124, 0.104, 0.26, 2.7, sx * 0.2), mt.plate, [0, -0.27, 0.005]);
    // Poleyn with side wing.
    part(kn, shell(0.082, 0, Math.PI * 2, 0, Math.PI * 0.55, 12), mt.plate, [0, 0.0, 0.055], [Math.PI / 2, 0, 0], [1, 1, 0.8]);
    part(kn, new THREE.CylinderGeometry(0.06, 0.06, 0.01, 12, 1, false, 0, Math.PI), mt.plate, [sx * 0.075, 0, 0.02], [Math.PI / 2, Math.PI / 2, 0]);
    part(kn, new THREE.SphereGeometry(0.012, 5, 4), mt.trim, [0, 0.0, 0.135]);
    // Greave.
    part(kn, latheG([[0.09, -0.02], [0.102, -0.09], [0.097, -0.2], [0.082, -0.32], [0.084, -0.38]], 16), mt.plate);
    // Boot cuff of folded leather.
    part(kn, latheG([[0.085, -0.33], [0.1, -0.37], [0.112, -0.43]], 16), mt.leather);
    // Sabaton: articulated lames over the foot, pointed toe, dark sole.
    part(ft, shell(0.115, 0, Math.PI * 2, 0, Math.PI * 0.5, 14), mt.leather, [0, -0.09, 0.05], [0, 0, 0], [1, 1.05, 2.0]);
    for (let l = 0; l < 4; l += 1) {
      part(ft, new THREE.CylinderGeometry(0.105 - l * 0.01, 0.11 - l * 0.01, 0.06, 14, 1, true, -Math.PI / 2, Math.PI), mt.plate, [0, -0.085, 0.03 + l * 0.055], [Math.PI / 2, 0, 0], [1, 1, 0.85 - l * 0.12]);
    }
    part(ft, new THREE.ConeGeometry(0.06, 0.14, 12), mt.plate, [0, -0.09, 0.28], [Math.PI / 2, 0, 0], [1, 1, 0.5]);
    part(ft, new THREE.BoxGeometry(0.19, 0.03, 0.42), mt.dark, [0, -0.11, 0.07]);
  }

  // ============================================================== longsword
  const sword = new THREE.Group();
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.028, 0);
  bladeShape.lineTo(-0.026, 0.12);
  bladeShape.lineTo(-0.023, 0.85);
  bladeShape.quadraticCurveTo(-0.018, 1.0, 0, 1.12);
  bladeShape.quadraticCurveTo(0.018, 1.0, 0.023, 0.85);
  bladeShape.lineTo(0.026, 0.12);
  bladeShape.lineTo(0.028, 0);
  bladeShape.lineTo(-0.028, 0);
  const bladeG = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1, curveSegments: 6 });
  bladeG.translate(0, 0, -0.002);
  {
    const p = bladeG.attributes.position as THREE.BufferAttribute;
    const uv = bladeG.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i += 1) uv.setXY(i, (p.getX(i) + 0.034) / 0.068, p.getY(i) / 1.12);
  }
  part(sword, bladeG, mt.blade, [0, 0.03, 0]);
  part(sword, new THREE.BoxGeometry(0.06, 0.06, 0.022), mt.plate, [0, 0.05, 0]);
  const guardCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.17, 0.035, 0),
    new THREE.Vector3(-0.09, 0.012, 0),
    new THREE.Vector3(0, 0.0, 0),
    new THREE.Vector3(0.09, 0.012, 0),
    new THREE.Vector3(0.17, 0.035, 0),
  ]);
  part(sword, new THREE.TubeGeometry(guardCurve, 16, 0.014, 6), mt.trim);
  for (const sx of [-1, 1]) part(sword, new THREE.SphereGeometry(0.022, 8, 6), mt.trim, [sx * 0.17, 0.037, 0]);
  part(sword, new THREE.SphereGeometry(0.03, 8, 6), mt.trim, [0, 0.005, 0], [0, 0, 0], [1, 0.6, 0.8]);
  const gripProfile: Array<[number, number]> = [];
  for (let i = 0; i <= 12; i += 1) gripProfile.push([i % 2 ? 0.0185 : 0.0215, -0.015 - i * 0.018]);
  part(sword, latheG(gripProfile, 8), mt.leather);
  part(sword, new THREE.CylinderGeometry(0.042, 0.042, 0.026, 14), mt.trim, [0, -0.26, 0], [Math.PI / 2, 0, 0]);
  part(sword, new THREE.SphereGeometry(0.016, 6, 5), mt.trim, [0, -0.26, 0.016]);
  part(sword, new THREE.SphereGeometry(0.016, 6, 5), mt.trim, [0, -0.26, -0.016]);
  const swordTip = new THREE.Object3D();
  swordTip.position.set(0, 1.14, 0);
  sword.add(swordTip);
  const gripB = new THREE.Object3D();
  gripB.position.set(0, -0.17, 0);
  sword.add(gripB);
  // Right hand holds just under the guard; the blade continues along the hand's +Z.
  sword.position.set(0, -0.1, 0.0);
  sword.rotation.set(Math.PI / 2, 0, 0);
  sword.translateY(0.04);
  j.handR.add(sword);

  const cloakAnchorL = new THREE.Object3D();
  cloakAnchorL.position.set(0.19, 0.38, -0.15);
  const cloakAnchorR = new THREE.Object3D();
  cloakAnchorR.position.set(-0.19, 0.38, -0.15);
  j.chest.add(cloakAnchorL, cloakAnchorR);

  // ============================================================== secondary motion + IK
  const springs = { front: 0, frontV: 0, back: 0, backV: 0, crest: 0, crestV: 0 };
  const lastHead = new THREE.Vector3();
  const headPos = new THREE.Vector3();
  const sPos = new THREE.Vector3();
  const tPos = new THREE.Vector3();
  const ePos = new THREE.Vector3();
  const pole = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const perp = new THREE.Vector3();
  const u1 = new THREE.Vector3();
  const u2 = new THREE.Vector3();
  const X = new THREE.Vector3();
  const Y = new THREE.Vector3();
  const Z = new THREE.Vector3();
  const qWorld = new THREE.Quaternion();
  const qParent = new THREE.Quaternion();
  const qElbow = new THREE.Quaternion();
  const axisX = new THREE.Vector3(1, 0, 0);
  const lenA = 0.3 * 1.05;
  const lenB = (0.28 + 0.09) * 1.05;

  const spring = (key: 'front' | 'back' | 'crest', target: number, dt: number, k = 120, d = 12) => {
    const vKey = `${key}V` as 'frontV' | 'backV' | 'crestV';
    springs[vKey] += ((target - springs[key]) * k - springs[vKey] * d) * dt;
    springs[key] += springs[vKey] * dt;
  };

  const secondary = (dt: number, speed: number, ikWeight: number) => {
    const h = Math.min(dt, 1 / 30);
    if (h <= 0) return;
    // Tabard panels follow the legs and drag behind motion.
    const hl = j.hipL.rotation.x;
    const hr = j.hipR.rotation.x;
    spring('front', Math.min(0, Math.min(hl, hr)) * 0.85 + speed * 0.03, h);
    spring('back', Math.max(0, Math.max(hl, hr)) * 0.85 + speed * 0.05, h);
    tabFront.rotation.x = springs.front;
    tabBack.rotation.x = springs.back;
    // Crest reacts to head motion.
    j.head.getWorldPosition(headPos);
    const vel = headPos.distanceTo(lastHead) / h;
    lastHead.copy(headPos);
    spring('crest', Math.min(0.9, vel * 0.08) + Math.sin(performance.now() * 0.004) * 0.05, h, 60, 7);
    crestStrands.forEach((s, i) => {
      s.rotation.x = -2.3 + i * 0.12 - springs.crest * (0.6 + i * 0.15);
    });
    // Two-hand grip: left arm IK onto the lower grip.
    if (ikWeight <= 0.001) return;
    rig.root.updateMatrixWorld(true);
    const sh = j.shoulderL;
    sh.getWorldPosition(sPos);
    gripB.getWorldPosition(tPos);
    dir.subVectors(tPos, sPos);
    const scale = rig.root.getWorldScale(X).x;
    const a = lenA * scale;
    const b = lenB * scale;
    const d = THREE.MathUtils.clamp(dir.length(), Math.abs(a - b) + 1e-3, a + b - 1e-3);
    dir.normalize();
    const cosA = (a * a + d * d - b * b) / (2 * a * d);
    const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
    // Pole: elbow points down and out to the left side of the body.
    j.chest.localToWorld(pole.set(0.6, -0.5, -0.1)).sub(sPos);
    perp.copy(pole).addScaledVector(dir, -pole.dot(dir)).normalize();
    ePos.copy(sPos).addScaledVector(dir, a * cosA).addScaledVector(perp, a * sinA);
    u1.subVectors(ePos, sPos).normalize();
    u2.subVectors(tPos, ePos).normalize();
    Y.copy(u1).negate();
    Z.copy(u2).addScaledVector(u1, -u2.dot(u1));
    if (Z.lengthSq() < 1e-6) Z.copy(perp);
    Z.normalize();
    X.crossVectors(Y, Z).normalize();
    m4.makeBasis(X, Y, Z);
    qWorld.setFromRotationMatrix(m4);
    sh.parent!.getWorldQuaternion(qParent);
    qWorld.premultiply(qParent.invert());
    sh.quaternion.slerp(qWorld, ikWeight);
    const bend = Math.acos(THREE.MathUtils.clamp(u1.dot(u2), -1, 1));
    qElbow.setFromAxisAngle(axisX, -bend);
    j.elbowL.quaternion.slerp(qElbow, ikWeight);
    j.handL.quaternion.slerp(qElbow.set(0, 0, 0, 1), ikWeight);
  };

  rig.flashMats.push(mt.plate);
  return { ...rig, sword, swordTip, gripB, cloakAnchorL, cloakAnchorR, mats: mt, secondary };
}

/** Light damping helper re-exported for callers tuning spring rates. */
export const dampValue = damp;
