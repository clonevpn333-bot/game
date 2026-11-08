// Chapter 4 cast: armoured block characters on MARCHLIGHT's rig (src/characters/ml/rig.js)
// and their weapons. Everything is rounded boxes and cylinders — no sculpted shapes.
import * as THREE from 'three';
import { buildCharacter, rbox, cyl, MAT } from '../../characters/ml/rig.js';

const C = (c) => new THREE.Color(c);

/**
 * Armour as extra blocks merged into the character mesh.
 * o: { plate, plateDark, tabard, trim, helm: 'open'|'great'|'kettle'|'crown'|'hood'|'none', plume, pauldrons, heavy }
 */
function armour(o) {
  return ({ add, at, HM, rest, sh, hw, bw }) => {
    const plate = C(o.plate || '#8c9196'), dark = C(o.plateDark || '#4a4e54'), tab = C(o.tabard || '#2c4a7a'), trim = C(o.trim || '#d8b45a');
    const heavy = o.heavy ? 1.12 : 1;
    // torso: breastplate, backplate edge, fauld, tabard front and back with an emblem
    if (o.chest !== false) {
      add(rbox(0.385 * sh * heavy, 0.27, 0.235 * heavy, 0.25), at('chest', 0, 1.252, 0.004), plate, 'chest', MAT.metal, 0.22);
      add(rbox(0.3 * hw, 0.11, 0.215), at('spine', 0, 1.07, 0), dark, 'spine', MAT.metal, 0.18);
      add(rbox(0.33 * hw * heavy, 0.1, 0.225), at('hips', 0, 0.955, 0), plate, 'hips', MAT.metal, 0.18);
      add(rbox(0.34 * hw, 0.035, 0.232), at('hips', 0, 0.995, 0), C('#2a221b'), 'hips', MAT.leather, 0); // belt
    }
    if (o.tabard !== null) {
      add(rbox(0.25 * sh, 0.3, 0.02), at('chest', 0, 1.2, 0.124 * heavy), tab, 'chest', MAT.cloth, 0.1);
      add(rbox(0.21 * hw, 0.36, 0.02), at('hips', 0, 0.78, 0.118), tab, 'hips', MAT.cloth, 0.12);
      add(rbox(0.21 * hw, 0.36, 0.02), at('hips', 0, 0.78, -0.118), tab.clone().multiplyScalar(0.8), 'hips', MAT.cloth, 0.12);
      add(rbox(0.07, 0.09, 0.012), at('chest', 0, 1.23, 0.136 * heavy), trim, 'chest', o.emblemGlow ? MAT.glow : MAT.metal, 0);
      add(rbox(0.12, 0.022, 0.012), at('chest', 0, 1.23, 0.136 * heavy), trim, 'chest', o.emblemGlow ? MAT.glow : MAT.metal, 0);
    }
    // shoulders
    if (o.pauldrons !== false) for (const s of [1, -1]) {
      const S = s > 0 ? 'L' : 'R';
      add(rbox(0.16 * heavy, 0.1, 0.21 * heavy, 0.35), at('shoulder', s * 0.2 * sh, 1.39, 0, 0, 0, s * 0.35), plate, 'shoulder' + S, MAT.metal, 0.2);
      add(rbox(0.15 * heavy, 0.05, 0.2 * heavy, 0.35), at('shoulder', s * 0.23 * sh, 1.33, 0, 0, 0, s * 0.55), dark, 'shoulder' + S, MAT.metal, 0.1);
      if (o.heavy) add(rbox(0.04, 0.09, 0.15), at('shoulder', s * 0.2 * sh, 1.46, 0, 0, 0, s * 0.2), trim, 'shoulder' + S, MAT.metal, 0);
    }
    // arms and legs
    for (const s of [1, -1]) {
      const S = s > 0 ? 'L' : 'R', x = s * 0.183 * sh, lx = s * 0.093 * hw;
      add(rbox(0.105 * bw, 0.14, 0.11 * bw), at('arm', x, 1.25, -0.005), plate, 'arm' + S, MAT.metal, 0.15);
      add(rbox(0.1 * bw, 0.06, 0.105 * bw), at('fore', x, 1.075, -0.005), dark, 'fore' + S, MAT.metal, 0.1); // couter
      add(rbox(0.1 * bw, 0.19, 0.106 * bw), at('fore', x, 0.93, -0.003), plate, 'fore' + S, MAT.metal, 0.15);
      add(rbox(0.078, 0.085, 0.097), at('hand', x, 0.79, 0.005), dark, 'hand' + S, MAT.metal, 0.1);
      add(rbox(0.068, 0.066, 0.084), at('fingers', x, 0.72, 0.012), dark, 'fingers' + S, MAT.metal, 0.1);
      add(rbox(0.155 * hw, 0.3, 0.165), at('thigh', lx, 0.7, 0.005), plate, 'thigh' + S, MAT.metal, 0.18);
      add(rbox(0.13, 0.08, 0.14), at('shin', lx, 0.47, 0.02), dark, 'shin' + S, MAT.metal, 0.1); // poleyn
      add(rbox(0.128, 0.3, 0.138), at('shin', lx, 0.27, 0.004), plate, 'shin' + S, MAT.metal, 0.16);
      add(rbox(0.125, 0.09, 0.21), at('foot', lx, 0.06, 0.035), dark, 'foot' + S, MAT.metal, 0.1);
      add(rbox(0.12, 0.07, 0.09, 0.3), at('toe', lx, 0.045, 0.16), dark, 'toe' + S, MAT.metal, 0.1);
    }
    // helmets (head-bone space, scaled with the big block head)
    const h = o.helm || 'open';
    if (h === 'open') {
      add(rbox(0.235, 0.09, 0.235, 0.3), HM(0, 0.225, 0.0), plate, 'head', MAT.metal, 0.15); // skull cap
      add(rbox(0.235, 0.12, 0.05, 0.25), HM(0, 0.16, -0.105), plate, 'head', MAT.metal, 0.15);
      for (const s of [1, -1]) add(rbox(0.03, 0.13, 0.12, 0.3), HM(s * 0.112, 0.11, 0.03), dark, 'head', MAT.metal, 0.1); // cheek guards
      add(rbox(0.03, 0.06, 0.03), HM(0, 0.17, 0.118), dark, 'head', MAT.metal, 0); // nasal
    } else if (h === 'great' || h === 'crown') {
      add(rbox(0.25, 0.275, 0.25, 0.18), HM(0, 0.112, 0.005), plate, 'head', MAT.metal, 0.22);
      add(rbox(0.19, 0.022, 0.012), HM(0, 0.128, 0.128), C('#08090b'), 'head', MAT.rubber, 0); // eye slit
      add(rbox(0.012, 0.11, 0.02), HM(0, 0.07, 0.128), dark, 'head', MAT.metal, 0); // ridge
      for (let i = 0; i < 3; i++) for (const s of [1, -1]) add(rbox(0.012, 0.012, 0.008), HM(s * (0.03 + i * 0.022), 0.05, 0.128), C('#08090b'), 'head', MAT.rubber, 0); // breaths
      if (o.glowEyes) add(rbox(0.15, 0.012, 0.006), HM(0, 0.128, 0.132), C(o.glowEyes), 'head', MAT.glow, 0);
      if (h === 'crown') for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; add(rbox(0.03, 0.075, 0.03), HM(Math.sin(a) * 0.105, 0.28, Math.cos(a) * 0.105), trim, 'head', MAT.metal, 0); }
      if (h === 'crown') add(rbox(0.235, 0.03, 0.235, 0.3), HM(0, 0.255, 0.005), trim, 'head', MAT.metal, 0);
    } else if (h === 'kettle') {
      add(rbox(0.23, 0.11, 0.23, 0.35), HM(0, 0.22, 0.0), plate, 'head', MAT.metal, 0.15);
      add(rbox(0.36, 0.02, 0.36, 0.4), HM(0, 0.17, 0.0), dark, 'head', MAT.metal, 0);
    } else if (h === 'hood') {
      add(rbox(0.245, 0.12, 0.245, 0.35), HM(0, 0.21, -0.01), C(o.hoodColor || '#3b4a3a'), 'head', MAT.cloth, 0.12);
      add(rbox(0.245, 0.2, 0.06, 0.3), HM(0, 0.12, -0.11), C(o.hoodColor || '#3b4a3a'), 'head', MAT.cloth, 0.12);
    }
    if (o.plume) add(rbox(0.035, 0.12, 0.2, 0.4), HM(0, 0.3, -0.03), C(o.plume), 'head', MAT.cloth, 0.2);
    if (o.cape) {
      add(rbox(0.36 * sh, 0.55, 0.03), at('chest', 0, 1.1, -0.15), C(o.cape), 'chest', MAT.cloth, 0.25);
      add(rbox(0.34 * sh, 0.35, 0.03), at('hips', 0, 0.68, -0.17), C(o.cape).multiplyScalar(0.85), 'hips', MAT.cloth, 0.25);
    }
  };
}

// ---------------------------------------------------------------- looks
export const LOOKS = {
  kai: { skin: '#c99272', hair: '#1f1914', hairStyle: 'swept', eyes: '#4a3424', height: 1.0, build: 0.6, frame: 0.4, outfit: 'casual', primary: '#3a3f46', pants: '#2b2d33',
    armour: { plate: '#9aa1a8', plateDark: '#575d64', tabard: '#2b2f36', trim: '#e07a2a', helm: 'none', emblemGlow: true } },
  sera: { skin: '#e3b897', hair: '#7a3b22', hairStyle: 'ponytail', eyes: '#3e5a2a', height: 0.95, build: 0.4, frame: 0.7, outfit: 'runnerLight', primary: '#3d5a48', secondary: '#c8a05a', pants: '#3b3226', boots: '#3a2a20', freckles: true,
    armour: { plate: '#7a6a52', plateDark: '#4a3b2a', tabard: '#3d5a48', trim: '#c8a05a', helm: 'none', chest: false, pauldrons: false, tabard: null } },
  ally: (i) => ({ skin: ['#e8b896', '#d29a72', '#b7794f', '#8e5a3a', '#f3d6c4'][i % 5], hair: '#3a2618', hairStyle: 'crop', height: 0.96 + (i % 4) * 0.025, build: 0.5 + (i % 3) * 0.15, beard: i % 3 === 0,
    armour: { plate: '#8c949c', plateDark: '#50565d', tabard: '#2c4a7a', trim: '#d8b45a', helm: i % 2 ? 'open' : 'kettle', plume: i === 0 ? '#3a64b0' : null } }),
  footman: (i) => ({ skin: '#b7794f', height: 0.98 + (i % 3) * 0.03, build: 0.55 + (i % 3) * 0.12, noHair: true,
    armour: { plate: '#5c5f63', plateDark: '#2c2e31', tabard: '#7a1e1e', trim: '#1a1a1a', helm: 'great', glowEyes: null } }),
  spearman: (i) => ({ skin: '#d29a72', height: 1.02, build: 0.45, noHair: true,
    armour: { plate: '#64584a', plateDark: '#33291f', tabard: '#7a1e1e', trim: '#1a1a1a', helm: 'kettle', pauldrons: false } }),
  brute: () => ({ skin: '#8e5a3a', height: 1.16, build: 1.0, frame: 0.2, noHair: true,
    armour: { plate: '#3d3f43', plateDark: '#1e1f22', tabard: '#5a1414', trim: '#7a1e1e', helm: 'great', heavy: true, glowEyes: '#ff5a30' } }),
  king: () => ({ skin: '#888', height: 1.34, build: 1.0, frame: 0.15, noHair: true,
    armour: { plate: '#2b2d31', plateDark: '#111214', tabard: '#3a0d10', trim: '#c8a24a', helm: 'crown', heavy: true, glowEyes: '#ffb347', emblemGlow: true, cape: '#4a0c12', plume: null } }),
};

export function buildKnight(look) {
  const L = typeof look === 'function' ? look(0) : look;
  const char = buildCharacter({ ...L, extra: L.armour ? armour(L.armour) : null });
  return char;
}

// ---------------------------------------------------------------- weapons
const wMats = {};
function wmat(kind) {
  if (wMats[kind]) return wMats[kind];
  const m = {
    steel: new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.9, roughness: 0.28 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2a2c30, metalness: 0.7, roughness: 0.45 }),
    leather: new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.8 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6b4a2c, roughness: 0.85 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd8b45a, metalness: 0.9, roughness: 0.35 }),
    blue: new THREE.MeshStandardMaterial({ color: 0x2c4a7a, roughness: 0.7 }),
    red: new THREE.MeshStandardMaterial({ color: 0x7a1e1e, roughness: 0.7 }),
    black: new THREE.MeshStandardMaterial({ color: 0x1a1214, roughness: 0.6, metalness: 0.4 }),
    ember: new THREE.MeshStandardMaterial({ color: 0x2a1008, emissive: 0xff6a20, emissiveIntensity: 0, metalness: 0.6, roughness: 0.4 }),
  }[kind];
  return (wMats[kind] = m);
}
function part(group, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const m = new THREE.Mesh(geo, wmat(mat)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.castShadow = true; group.add(m); return m; }

/**
 * Weapons are built along +z out of the fist (the rig's grip socket), so a hanging arm carries
 * the blade forward. Returns { group, length, tipLocal, baseLocal } (blade in socket space).
 */
export function makeWeapon(kind) {
  const g = new THREE.Group();
  let len = 0.9, base = 0.12;
  if (kind === 'sword') {
    part(g, rbox(0.032, 0.032, 0.17), 'leather', 0, 0, 0.0);
    part(g, rbox(0.05, 0.05, 0.05, 0.4), 'gold', 0, 0, -0.1);
    part(g, rbox(0.22, 0.035, 0.035), 'gold', 0, 0, 0.1);
    part(g, rbox(0.055, 0.012, 0.82, 0.1), 'steel', 0, 0, 0.53);
    part(g, rbox(0.02, 0.014, 0.8, 0.1), 'dark', 0, 0, 0.52).scale.set(1, 1.2, 1);
    len = 0.94; base = 0.13;
  } else if (kind === 'greatsword') {
    part(g, rbox(0.04, 0.04, 0.34), 'black', 0, 0, 0.05);
    part(g, rbox(0.07, 0.07, 0.07, 0.4), 'gold', 0, 0, -0.14);
    part(g, rbox(0.42, 0.05, 0.05), 'gold', 0, 0, 0.24);
    const blade = part(g, rbox(0.11, 0.022, 1.55, 0.08), 'ember', 0, 0, 1.03);
    g.userData.ember = blade.material;
    len = 1.8; base = 0.27;
  } else if (kind === 'axe') {
    part(g, cyl(0.022, 0.022, 1.1, 8), 'wood', 0, 0, 0.35, Math.PI / 2);
    part(g, rbox(0.03, 0.34, 0.24, 0.15), 'dark', 0, -0.12, 0.8);
    part(g, rbox(0.035, 0.36, 0.05, 0.1), 'steel', 0, -0.2, 0.84);
    len = 0.95; base = 0.6;
  } else if (kind === 'spear') {
    part(g, cyl(0.018, 0.018, 2.2, 8), 'wood', 0, 0, 0.55, Math.PI / 2);
    part(g, rbox(0.06, 0.012, 0.28, 0.1), 'steel', 0, 0, 1.75);
    part(g, rbox(0.03, 0.03, 0.05), 'dark', 0, 0, 1.6);
    len = 1.9; base = 1.3;
  } else if (kind === 'bow') {
    for (let i = 0; i < 7; i++) { const a = (i - 3) / 3; part(g, rbox(0.025, 0.2, 0.03), 'wood', 0, a * 0.55, -Math.abs(a) * Math.abs(a) * 0.14, a * 0.5); }
    part(g, rbox(0.004, 1.15, 0.004), 'leather', 0, 0, -0.16);
    len = 0; base = 0;
  }
  return { group: g, length: len, base, kind };
}

/** Round centre-grip shield held in the left fist: its face points where the forearm points. */
export function makeShield(color = 'blue', emblem = 'gold') {
  const g = new THREE.Group();
  const face = part(g, cyl(0.34, 0.34, 0.04, 18), 'wood', 0, -0.07, 0);
  part(g, cyl(0.31, 0.31, 0.012, 18), color, 0, -0.095, 0);
  part(g, cyl(0.355, 0.355, 0.03, 18), 'dark', 0, -0.07, 0).scale.set(1, 1, 1);
  part(g, cyl(0.09, 0.06, 0.07, 12), emblem, 0, -0.12, 0); // boss
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; part(g, rbox(0.05, 0.016, 0.24), emblem, Math.sin(a) * 0.17, -0.1, Math.cos(a) * 0.17, 0, a, 0); }
  g.userData.face = face;
  return g;
}

/** Attach a weapon to the right grip and (optionally) a shield on the left forearm. */
export function arm(char, weaponKind, shieldColor = null) {
  const w = makeWeapon(weaponKind);
  char.sockets.gripR.add(w.group);
  let shield = null;
  if (shieldColor) {
    shield = makeShield(shieldColor);
    char.sockets.gripL.add(shield);
  }
  return { weapon: w, shield };
}
