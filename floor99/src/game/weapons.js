// The arsenal: definitions, procedural models, animation, firing logic.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/three/addons/geometries/RoundedBoxGeometry.js';
import { FXColors } from '../engine/fx.js';
import { armorTextures } from '../engine/textures.js';
import { GUN_BUILDERS, GUN_FEEL, buildGun } from './gunModels.js';
import { CharacterAnimator, AnimationTuning, solveArmIK } from './animator.js';

const rbox = (w, h, d, r = 0.01) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
const cyl = (r1, r2, h, s = 12) => { const g = new THREE.CylinderGeometry(r1, r2, h, s); g.rotateX(Math.PI / 2); return g; };
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const rand = (a, b) => a + Math.random() * (b - a);

export const WEAPONS = {
  revolver: {
    id: 'revolver', name: 'PEACEMAKER .99', short: 'REVOLVER', kind: 'gun', mag: 6, reserve: Infinity, interval: 0.28, auto: false,
    damage: 48, head: 2.2, spread: 0.0015, bloomAdd: 0.004, bloomMax: 0.014, pellets: 1, range: 140, knock: 7, reload: 1.25,
    recoilPitch: 0.075, kick: 0.16, shake: 0.22, sound: 'revolver', tracer: 0xffe0a0, twoHanded: false, flash: 1.3,
    blurb: 'Six heavy rounds. Every shot lands like a plot twist.',
  },
  rifle: {
    id: 'rifle', name: 'RATINGS RIFLE', short: 'RIFLE', kind: 'gun', mag: 32, reserve: 224, interval: 0.088, auto: true,
    damage: 14, head: 1.8, spread: 0.004, bloomAdd: 0.004, bloomMax: 0.035, pellets: 1, range: 120, knock: 2.2, reload: 1.55,
    recoilPitch: 0.016, kick: 0.05, shake: 0.06, sound: 'rifle', tracer: 0x9fe8ff, twoHanded: true, flash: 0.8, ejectMag: true,
    blurb: 'Fast, accurate, responsive. Number one in its time slot.',
  },
  shotgun: {
    id: 'shotgun', name: "SPONSOR'S CHOICE", short: 'SHOTGUN', kind: 'gun', mag: 6, reserve: 42, interval: 0.62, auto: false,
    damage: 12, head: 1.4, spread: 0.055, bloomAdd: 0, bloomMax: 0, pellets: 10, range: 40, knock: 2.5, reload: 0.42, shellReload: true,
    recoilPitch: 0.11, kick: 0.28, shake: 0.42, sound: 'shotgun', tracer: 0xffc070, twoHanded: true, flash: 1.8, falloff: 18,
    blurb: 'Ten pellets of close-range sponsorship. Sends robots into syndication.',
  },
  rail: {
    id: 'rail', name: 'PRIME TIME RAILGUN', short: 'RAILGUN', kind: 'gun', mag: 4, reserve: 24, interval: 0.95, auto: false,
    damage: 170, head: 1.5, spread: 0, bloomAdd: 0, bloomMax: 0, pellets: 1, range: 220, knock: 22, reload: 2.0, charge: 0.45, pierce: true,
    recoilPitch: 0.14, kick: 0.4, shake: 0.6, sound: 'railgun', tracer: 0x55f0ff, twoHanded: true, flash: 2.2,
    blurb: 'Charge, release, punch a hole through everything on the line — including the shield guys.',
  },
  smg: {
    id: 'smg', name: 'AD-BREAK SMG', short: 'SMG', kind: 'gun', mag: 40, reserve: 320, interval: 0.062, auto: true,
    damage: 9, head: 1.6, spread: 0.009, bloomAdd: 0.003, bloomMax: 0.03, pellets: 1, range: 70, knock: 1.4, reload: 1.3,
    recoilPitch: 0.011, kick: 0.04, shake: 0.04, sound: 'smg', tracer: 0xff8ad0, twoHanded: false, flash: 0.6,
    blurb: 'A hose of tiny commercial interruptions. Strafe, spray, keep the show moving.',
  },
  launcher: {
    id: 'launcher', name: 'CONFETTI CANNON', short: 'LAUNCHER', kind: 'gun', mag: 4, reserve: 20, interval: 0.75, auto: false,
    damage: 90, head: 1, spread: 0, bloomAdd: 0, bloomMax: 0, pellets: 1, range: 60, knock: 14, reload: 2.1,
    recoilPitch: 0.12, kick: 0.35, shake: 0.4, sound: 'launcher', tracer: null, twoHanded: true, flash: 1.4,
    projectile: { speed: 30, gravity: 14, lift: 2.5, blast: 1.25, radius: 0.18, color: 0xffd400 },
    blurb: 'Lobs party bombs. Splash damage, knockdown, and a frankly irresponsible amount of confetti.',
  },
  beam: {
    id: 'beam', name: 'PRIME-TIME SPOTLIGHT', short: 'SPOTLIGHT', kind: 'gun', mag: 90, reserve: 360, interval: 0.045, auto: true,
    damage: 6.2, head: 1.5, spread: 0.0008, bloomAdd: 0, bloomMax: 0, pellets: 1, range: 90, knock: 0.6, reload: 1.7,
    recoilPitch: 0.003, kick: 0.02, shake: 0.015, sound: 'beam', tracer: 0x7ff6ff, tracerWidth: 0.05, twoHanded: true, flash: 0.35,
    blurb: 'A stage spotlight tuned to "melt". Hold it on target; it never misses its mark.',
  },
  arc: {
    id: 'arc', name: 'ARC CASTER', short: 'ARC', kind: 'gun', mag: 12, reserve: 96, interval: 0.34, auto: false,
    damage: 30, head: 1.5, spread: 0.002, bloomAdd: 0.004, bloomMax: 0.012, pellets: 1, range: 70, knock: 4, reload: 1.6, chain: 3,
    recoilPitch: 0.05, kick: 0.16, shake: 0.18, sound: 'arc', tracer: 0x9fd8ff, tracerWidth: 0.05, twoHanded: true, flash: 0.9,
    blurb: 'A tesla coil with a trigger. Every bolt jumps to the next three robots. Crowds hate it.',
  },
  gravity: {
    id: 'gravity', name: 'APPLAUSE GRAV-CANNON', short: 'GRAVITY', kind: 'gravity', mag: 100, reserve: Infinity, interval: 0.55, auto: false,
    damage: 25, range: 22, knock: 30, energy: true, regen: 14, cost: 28, grabCost: 34, twoHanded: true, recoilPitch: 0.08, kick: 0.3, shake: 0.35, sound: 'gravity',
    blurb: 'Tap: concussive blast. Hold: grab a robot, barrel or crate. Release: deliver it to the audience.',
  },
  blades: {
    id: 'blades', name: 'HARDLIGHT BLADES', short: 'BLADES', kind: 'melee', damage: [34, 34, 70], range: 2.9, arc: 1.2, lunge: 7.5, interval: 0.32,
    blurb: 'Three-hit combo. Lunges at targets. The third hit is a spin that clears a crowd.',
  },
  hammer: {
    id: 'hammer', name: 'SHOCK HAMMER', short: 'HAMMER', kind: 'melee', damage: [95], range: 4.2, arc: 3.2, lunge: 3, interval: 0.85, aoe: 4.5,
    blurb: 'Slow, enormous, electrifying. Use it in the air for a ground-pound shockwave.',
  },
};

// ---------------------------------------------------------------- models
function mats() {
  if (mats.c) return mats.c;
  const A = armorTextures();
  const W = (o) => new THREE.MeshStandardMaterial({ map: A.map, normalMap: A.normalMap, roughnessMap: A.roughnessMap, ...o });
  mats.c = {
    gun: W({ color: '#2a2e36', metalness: 0.85, roughness: 0.4 }),
    dark: W({ color: '#121418', metalness: 0.6, roughness: 0.55 }),
    steel: new THREE.MeshStandardMaterial({ color: '#b8c0c8', metalness: 1, roughness: 0.22 }),
    brass: new THREE.MeshStandardMaterial({ color: '#c9a03a', metalness: 1, roughness: 0.3 }),
    grip: new THREE.MeshStandardMaterial({ color: '#5b2e1a', metalness: 0.1, roughness: 0.6 }),
    red: W({ color: '#d4233b', metalness: 0.4, roughness: 0.45 }),
    yellow: W({ color: '#f2c230', metalness: 0.3, roughness: 0.5 }),
    white: W({ color: '#e8ebee', metalness: 0.2, roughness: 0.45 }),
    glowPink: new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2d6f', emissiveIntensity: 3 }),
    pink: W({ color: '#ff4f9a', metalness: 0.35, roughness: 0.4 }),
    glowCyan: new THREE.MeshStandardMaterial({ color: '#000', emissive: '#25f4ff', emissiveIntensity: 3 }),
    glowYellow: new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ffd400', emissiveIntensity: 3 }),
    glowPurple: new THREE.MeshStandardMaterial({ color: '#000', emissive: '#a050ff', emissiveIntensity: 3.5 }),
  };
  return mats.c;
}
function add(parent, geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  parent.add(m);
  return m;
}

export function buildWeaponModel(id) {
  const M = mats();
  if (GUN_BUILDERS[id]) return buildGun(id, M);
  const g = new THREE.Group();
  const parts = {};
  const muzzle = new THREE.Object3D();
  const eject = new THREE.Object3D();
  if (id === 'revolver') {
    add(g, rbox(0.045, 0.11, 0.07, 0.015), M.grip, 0, -0.07, -0.05, 0.35);
    add(g, rbox(0.05, 0.07, 0.16, 0.012), M.gun, 0, 0.0, 0.03);
    parts.cyl = new THREE.Group(); parts.cyl.position.set(0, 0.0, 0.04); g.add(parts.cyl);
    add(parts.cyl, cyl(0.035, 0.035, 0.06, 16), M.steel);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(parts.cyl, cyl(0.009, 0.009, 0.062, 6), M.dark, Math.cos(a) * 0.022, Math.sin(a) * 0.022, 0); }
    add(g, cyl(0.016, 0.016, 0.24, 12), M.steel, 0, 0.012, 0.2);
    add(g, rbox(0.022, 0.018, 0.24, 0.005), M.gun, 0, 0.034, 0.2);
    add(g, rbox(0.008, 0.016, 0.02, 0.003), M.glowPink, 0, 0.05, 0.31);
    add(g, rbox(0.012, 0.03, 0.02, 0.004), M.gun, 0, 0.05, -0.04, -0.4); // hammer
    add(g, new THREE.TorusGeometry(0.025, 0.005, 6, 12, Math.PI), M.gun, 0, -0.04, 0.02, 0, Math.PI / 2, 0);
    add(g, rbox(0.052, 0.012, 0.1, 0.004), M.glowPink, 0, -0.025, 0.06);
    muzzle.position.set(0, 0.012, 0.33);
    eject.position.set(0.03, 0.02, 0.04);
  } else if (id === 'rifle') {
    add(g, rbox(0.06, 0.09, 0.46, 0.015), M.gun, 0, 0, 0.1);
    add(g, rbox(0.065, 0.05, 0.22, 0.01), M.white, 0, 0.025, 0.22); // handguard
    for (let i = 0; i < 5; i++) add(g, rbox(0.067, 0.012, 0.02, 0.003), M.dark, 0, 0.02, 0.14 + i * 0.035);
    add(g, cyl(0.014, 0.014, 0.2), M.steel, 0, 0.01, 0.42);
    add(g, cyl(0.022, 0.022, 0.06, 8), M.dark, 0, 0.01, 0.53); // muzzle brake
    add(g, rbox(0.05, 0.11, 0.05, 0.01), M.grip, 0, -0.08, 0.0, 0.3);
    add(g, rbox(0.05, 0.08, 0.16, 0.015), M.gun, 0, -0.0, -0.2);
    add(g, rbox(0.05, 0.03, 0.12, 0.01), M.dark, 0, 0.0, -0.3);
    parts.mag = new THREE.Group(); parts.mag.position.set(0, -0.07, 0.1); g.add(parts.mag);
    add(parts.mag, rbox(0.04, 0.14, 0.06, 0.008), M.dark, 0, -0.04, 0, 0.15);
    add(parts.mag, rbox(0.042, 0.02, 0.062, 0.004), M.glowCyan, 0, -0.1, 0.01, 0.15);
    // holo sight
    add(g, rbox(0.04, 0.03, 0.06, 0.008), M.dark, 0, 0.065, 0.05);
    const ring = add(g, new THREE.TorusGeometry(0.018, 0.003, 6, 20), M.glowCyan, 0, 0.1, 0.06);
    add(g, rbox(0.004, 0.035, 0.004, 0.001), M.dark, 0.022, 0.085, 0.06); add(g, rbox(0.004, 0.035, 0.004, 0.001), M.dark, -0.022, 0.085, 0.06);
    parts.ring = ring;
    add(g, rbox(0.062, 0.008, 0.3, 0.003), M.glowCyan, 0, -0.035, 0.12);
    muzzle.position.set(0, 0.01, 0.57);
    eject.position.set(0.035, 0.02, 0.0);
  } else if (id === 'shotgun') {
    add(g, rbox(0.07, 0.1, 0.3, 0.02), M.gun, 0, 0, 0.0);
    add(g, cyl(0.022, 0.022, 0.55), M.steel, 0, 0.02, 0.38);
    add(g, cyl(0.018, 0.018, 0.48), M.dark, 0, -0.03, 0.34);
    parts.pump = new THREE.Group(); parts.pump.position.set(0, -0.03, 0.3); g.add(parts.pump);
    add(parts.pump, rbox(0.07, 0.06, 0.18, 0.02), M.yellow);
    for (let i = 0; i < 4; i++) add(parts.pump, rbox(0.072, 0.008, 0.012, 0.002), M.dark, 0, 0, -0.06 + i * 0.04);
    add(g, rbox(0.06, 0.12, 0.06, 0.015), M.grip, 0, -0.09, -0.08, 0.35);
    add(g, rbox(0.06, 0.09, 0.26, 0.025), M.yellow, 0, -0.02, -0.27, -0.12);
    add(g, rbox(0.064, 0.05, 0.1, 0.01), M.dark, 0, -0.03, -0.4, -0.12);
    for (let i = 0; i < 3; i++) add(g, cyl(0.012, 0.012, 0.05, 8), M.red, 0.04, 0.01 - i * 0.025, -0.02);
    add(g, rbox(0.072, 0.016, 0.06, 0.004), M.glowYellow, 0, 0.055, 0.02);
    muzzle.position.set(0, 0.02, 0.66);
    eject.position.set(0.04, 0.02, 0.05);
  } else if (id === 'rail') {
    add(g, rbox(0.08, 0.12, 0.42, 0.02), M.white, 0, 0, 0.0);
    add(g, rbox(0.024, 0.03, 0.72, 0.006), M.steel, 0.03, 0.03, 0.45);
    add(g, rbox(0.024, 0.03, 0.72, 0.006), M.steel, -0.03, 0.03, 0.45);
    parts.coils = [];
    for (let i = 0; i < 6; i++) {
      const c = add(g, new THREE.TorusGeometry(0.055, 0.012, 8, 20), M.glowCyan.clone(), 0, 0.03, 0.2 + i * 0.1);
      parts.coils.push(c);
    }
    add(g, rbox(0.05, 0.12, 0.06, 0.015), M.dark, 0, -0.1, -0.05, 0.3);
    add(g, rbox(0.07, 0.09, 0.22, 0.02), M.dark, 0, -0.01, -0.3);
    add(g, cyl(0.03, 0.03, 0.18), M.gun, 0, 0.1, 0.05);
    add(g, new THREE.CircleGeometry(0.028, 16), M.glowCyan, 0, 0.1, 0.141);
    add(g, rbox(0.06, 0.05, 0.12, 0.01), M.glowCyan, 0, -0.075, 0.12);
    muzzle.position.set(0, 0.03, 0.82);
    eject.position.set(0.05, 0.03, 0.0);
  } else if (id === 'gravity') {
    add(g, rbox(0.12, 0.13, 0.32, 0.04), M.gun, 0, 0, 0);
    const bell = add(g, new THREE.CylinderGeometry(0.15, 0.08, 0.18, 20, 1, true), M.steel, 0, 0.02, 0.27, Math.PI / 2);
    bell.material = M.steel;
    parts.rings = [];
    for (let i = 0; i < 3; i++) {
      const r = add(g, new THREE.TorusGeometry(0.1 + i * 0.02, 0.01, 6, 24), M.glowPurple, 0, 0.02, 0.14 + i * 0.07);
      parts.rings.push(r);
    }
    parts.core = add(g, new THREE.SphereGeometry(0.055, 16, 12), M.glowPurple, 0, 0.02, 0.2);
    add(g, rbox(0.05, 0.12, 0.06, 0.015), M.grip, 0, -0.1, -0.02, 0.3);
    add(g, rbox(0.04, 0.03, 0.14, 0.01), M.dark, 0, 0.1, -0.02);
    add(g, rbox(0.14, 0.04, 0.12, 0.01), M.red, 0, -0.03, -0.12);
    muzzle.position.set(0, 0.02, 0.38);
  } else if (id === 'blades') {
    for (const s of [0]) {
      add(g, cyl(0.02, 0.02, 0.16, 10), M.gun, 0, 0, -0.02);
      add(g, rbox(0.1, 0.02, 0.03, 0.006), M.steel, 0, 0, 0.065);
      parts.blade = add(g, rbox(0.012, 0.05, 0.85, 0.006), M.glowPink, 0, 0, 0.5);
    }
    muzzle.position.set(0, 0, 0.9);
  } else if (id === 'bladeL') {
    add(g, cyl(0.02, 0.02, 0.16, 10), M.gun, 0, 0, -0.02);
    add(g, rbox(0.1, 0.02, 0.03, 0.006), M.steel, 0, 0, 0.065);
    parts.blade = add(g, rbox(0.012, 0.05, 0.75, 0.006), M.glowCyan, 0, 0, 0.45);
  } else if (id === 'hammer') {
    add(g, cyl(0.025, 0.025, 1.1, 10), M.dark, 0, 0, 0.25);
    const head = new THREE.Group(); head.position.set(0, 0, 0.8); g.add(head);
    add(head, rbox(0.42, 0.22, 0.22, 0.05), M.gun, 0, 0, 0);
    add(head, cyl(0.12, 0.12, 0.05, 16), M.steel, 0.23, 0, 0, 0, Math.PI / 2, 0);
    add(head, cyl(0.12, 0.12, 0.05, 16), M.steel, -0.23, 0, 0, 0, Math.PI / 2, 0);
    for (let i = -1; i <= 1; i++) add(head, new THREE.TorusGeometry(0.115, 0.012, 6, 18), M.glowYellow, i * 0.1, 0, 0, 0, Math.PI / 2, 0);
    parts.head = head;
    add(g, rbox(0.06, 0.06, 0.2, 0.02), M.grip, 0, 0, -0.2);
    muzzle.position.set(0, 0, 0.8);
  }
  g.add(muzzle); g.add(eject);
  g.userData = { parts, muzzle, eject, weaponId: id };
  if (id === 'hammer') {
    // two-hand grip points on the handle (the hammer swing is IK-driven, see animator.animateHammer)
    for (const [name, z] of [['rightGrip', -0.14], ['leftGrip', 0.06]]) { const grip = new THREE.Object3D(); grip.position.z = z; g.add(grip); g.userData[name] = grip; }
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// ---------------------------------------------------------------- weapon state
export class WeaponState {
  constructor(id) {
    this.def = WEAPONS[id];
    this.id = id;
    this.ammo = this.def.mag ?? 0;
    this.reserve = this.def.reserve ?? 0;
    this.cool = 0;
    this.reloading = 0;
    this.reloadShells = false;
    this.bloom = 0;
    this.charge = 0;
    this.model = buildWeaponModel(id);
    this.recoil = 0; // visual kick 0..1
    this.anim = 0;
  }
  canFire() { return this.cool <= 0 && this.reloading <= 0 && this.ammo > 0; }
}

// Weapon handling for the player (guns + melee).
export class Arsenal {
  constructor(player, game, loadout) {
    this.player = player;
    this.game = game;
    this.slots = loadout.guns.map((id) => new WeaponState(id));
    this.melee = new WeaponState(loadout.melee || 'blades');
    this.bladeL = loadout.melee === 'blades' || !loadout.melee ? buildWeaponModel('bladeL') : null;
    this.index = 0;
    this.switchT = 0;
    this.meleeT = 0;
    this.meleeStep = 0;
    this.meleeCombo = 0;
    this.meleeHitDone = false;
    this.grabbed = null;
    this.holdT = 0;
    this.aimTarget = new THREE.Vector3();
    this.mounted = null;
    this.mods = player.mods || {};
  }
  get current() { return this.slots[this.index]; }
  mount() {
    const pm = this.player.model;
    for (const w of this.slots) w.model.removeFromParent();
    this.melee.model.removeFromParent();
    this.bladeL?.removeFromParent();
    const w = this.current;
    if (this.meleeT > 0) {
      if (this.melee.id === 'hammer') { pm.weaponMount.add(this.melee.model); this.mounted = 'melee'; return; }
      pm.socketR.add(this.melee.model);
      this.melee.model.rotation.set(Math.PI / 2, 0, 0);
      this.melee.model.position.set(0, 0, 0);
      if (this.bladeL && this.melee.id === 'blades') { pm.socketL.add(this.bladeL); this.bladeL.rotation.set(Math.PI / 2, 0, 0); }
      this.mounted = 'melee';
    } else if (w) {
      // guns hang off the chest mount; orientToTarget aims them and IKs both hands onto the grips
      pm.weaponMount.add(w.model);
      w.model.position.set(0, 0, 0);
      w.model.rotation.set(0, 0, 0);
      this.mounted = w.id;
    }
  }
  addWeapon(id) {
    if (this.slots.find((s) => s.id === id)) { const s = this.slots.find((x) => x.id === id); s.reserve = Math.min(999, s.reserve + (s.def.mag || 0) * 3); return false; }
    const ws = new WeaponState(id);
    if (this.slots.length < 3) { this.slots.push(ws); this.select(this.slots.length - 1); }
    else { this.slots[this.index] = ws; this.select(this.index, true); }
    return true;
  }
  select(i, force) {
    if (i < 0 || i >= this.slots.length || (i === this.index && !force)) return;
    this.dropGrab(false);
    this.index = i;
    this.fireBuffer = 0;
    this.switchT = 0.22;
    this.current.reloading = 0;
    this.game.audio.play('switch');
    this.mount();
    this.game.emit('weaponSwitch', this.current.id);
  }
  cycle(d) { if (this.slots.length > 1) this.select((this.index + d + this.slots.length) % this.slots.length); }
  refill(fraction = 0.5) {
    for (const s of this.slots) {
      if (s.def.energy) { s.ammo = s.def.mag; continue; }
      if (s.reserve === Infinity) continue;
      s.reserve = Math.min(s.def.reserve * 1.5, s.reserve + Math.ceil(s.def.reserve * fraction));
    }
  }
  reload() {
    const w = this.current;
    if (!w || w.def.energy || w.reloading > 0 || w.ammo >= w.def.mag || w.reserve <= 0) return;
    if (w.def.shellReload) { w.reloading = w.def.reload; w.reloadShells = true; }
    else {
      w.reloading = w.def.reload * (this.mods.fastHands ? 0.7 : 1);
      this.game.audio.play('reloadOut', { pos: this.player.pos });
      if (w.id === 'revolver') this.game.audio.play('cylinderSpin', { pos: this.player.pos, delay: 0.35 });
    }
  }

  update(dt, input, aimTarget, wantsFire, firePressed, fireReleased) {
    const w = this.current;
    const P = this.player;
    this.aimTarget.copy(aimTarget);
    // short input buffer so a click slightly before the gun is ready still fires
    this.fireBuffer = firePressed ? 0.13 : Math.max(0, (this.fireBuffer || 0) - dt);
    for (const s of this.slots) {
      s.cool = Math.max(0, s.cool - dt);
      s.recoil = Math.max(0, s.recoil - dt / (GUN_FEEL[s.id]?.returnTime || 0.17));
      s.bloom = Math.max(0, s.bloom - dt * 0.12);
      if (s.def.energy && s !== w) s.ammo = Math.min(s.def.mag, s.ammo + s.def.regen * dt);
    }
    if (this.switchT > 0) this.switchT -= dt;
    // melee
    if (this.meleeT > 0) {
      this._updateMelee(dt);
      return;
    }
    if (!w) return;
    if (w.def.energy) w.ammo = Math.min(w.def.mag, w.ammo + w.def.regen * dt * (this.grabbed ? 0 : 1));
    // reload progression
    if (w.reloading > 0) {
      w.reloading -= dt;
      if (w.reloadShells) {
        if (w.reloading <= 0) {
          if (w.ammo < w.def.mag && w.reserve > 0) {
            w.ammo++; w.reserve--;
            this.game.audio.play('reloadIn', { pos: P.pos });
            if (w.ammo < w.def.mag && w.reserve > 0 && !wantsFire) w.reloading = w.def.reload;
            else { w.reloadShells = false; this.game.audio.play('pump', { pos: P.pos, delay: 0.05 }); w.cool = 0.25; }
          } else w.reloadShells = false;
        } else if (wantsFire && w.ammo > 0 && firePressed) { w.reloading = 0; w.reloadShells = false; }
      } else if (w.reloading <= 0) {
        const need = w.def.mag - w.ammo;
        const take = Math.min(need, w.reserve);
        w.ammo += take;
        if (w.reserve !== Infinity) w.reserve -= take;
        this.game.audio.play('reloadIn', { pos: P.pos });
        this.game.emit('reloaded', w.id);
      }
    }
    this._animateWeapon(dt, w);
    if (this.switchT > 0) return;
    if (w.def.kind === 'gravity') { this._updateGravity(dt, w, wantsFire, firePressed, fireReleased); return; }
    // railgun charge
    if (w.def.charge) {
      if (wantsFire && w.canFire()) {
        if (w.charge === 0) this.game.audio.play('railCharge', { pos: P.pos });
        w.charge = Math.min(1, w.charge + dt / w.def.charge);
        this.game.audio.loop('rail', 0.12 * w.charge, { rate: w.charge });
        if (w.charge >= 1 && fireReleased) { /* handled below */ }
      }
      if (!wantsFire && w.charge > 0) {
        this.game.audio.loop('rail', 0);
        if (w.charge >= 0.98) this._fire(w);
        w.charge = 0;
      }
      if (w.model.userData.parts.coils) w.model.userData.parts.coils.forEach((c, i) => { c.material.emissiveIntensity = 1 + w.charge * 6 * (i / 6 + 0.3) + Math.sin(performance.now() * 0.03 + i) * w.charge; });
      return;
    }
    if (w.ammo <= 0 && w.reloading <= 0 && w.reserve > 0) { if (firePressed || w.cool <= 0) this.reload(); }
    const trigger = w.def.auto ? wantsFire : this.fireBuffer > 0;
    if (trigger) {
      if (w.ammo <= 0 && w.reloading <= 0) { if (firePressed) this.game.audio.play('dryFire', { pos: P.pos }); }
      else if (w.canFire()) this._fire(w);
    }
  }

  _fire(w) {
    const d = w.def;
    const P = this.player;
    const G = this.game;
    this.fireBuffer = 0;
    w.ammo--;
    w.cool = d.interval * (this.mods.trigger ? 0.85 : 1);
    w.recoil = 1;
    // aim the gun at the target first so the muzzle position is exact even on the first shot
    P.model.root.position.copy(P.pos); P.model.root.rotation.y = P.yaw; P.model.root.updateMatrixWorld(true);
    this.orientToTarget(this.aimTarget, 1);
    const muzzle = w.model.userData.muzzle.getWorldPosition(new THREE.Vector3());
    const dirMain = _v2.subVectors(this.aimTarget, muzzle).normalize();
    // if aim target is behind muzzle (very close geometry), fall back to camera direction
    if (dirMain.dot(P.camForward) < 0.2) dirMain.copy(P.camForward);
    const spread = d.spread + w.bloom + (P.aiming ? 0 : d.spread * 0.6 + 0.004) + (P.grounded ? 0 : 0.006);
    w.bloom = Math.min(d.bloomMax, w.bloom + d.bloomAdd);
    const dmgMult = P.damageMult();
    let anyHit = false;
    if (d.projectile) {
      const pj = d.projectile;
      G.spawnProjectile({
        pos: muzzle.clone(), vel: dirMain.clone().multiplyScalar(pj.speed).add(_v.set(0, pj.lift || 0, 0)), damage: d.damage * dmgMult,
        radius: pj.radius, owner: 'player', color: pj.color, gravity: pj.gravity, weapon: d.id, life: 3,
        explode: { scale: pj.blast, damage: d.damage * dmgMult, confetti: true },
      });
    }
    for (let i = 0; i < (d.projectile ? 0 : d.pellets); i++) {
      const dir = new THREE.Vector3().copy(dirMain);
      if (spread > 0) {
        dir.x += (Math.random() - 0.5) * 2 * spread; dir.y += (Math.random() - 0.5) * 2 * spread; dir.z += (Math.random() - 0.5) * 2 * spread;
        dir.normalize();
      }
      const res = G.shoot(muzzle, dir, {
        damage: d.damage * dmgMult, head: d.head, range: d.range, knock: d.knock, pierce: d.pierce, weapon: d.id,
        tracer: d.tracer, tracerWidth: d.tracerWidth || (d.id === 'rail' ? 0.09 : d.id === 'shotgun' ? 0.018 : 0.025), falloff: d.falloff, source: 'player',
        quietImpact: d.pellets > 1 && i > 2,
      });
      if (res && res.enemy) { anyHit = true; if (d.chain && res.enemy) G.chainArc(res.enemy, d.damage * dmgMult * 0.7, d.chain); }
    }
    G.audio.play(d.sound, { vol: d.id === 'rifle' ? 0.9 : 1 });
    G.fx.muzzle(muzzle, dirMain, d.id === 'rail' ? FXColors.cyan : FXColors.fire, d.flash);
    G.fx.flashLight(muzzle, d.id === 'rail' ? 0x55f0ff : 0xffb060, 42 * d.flash, 0.085, 8);
    if (d.id !== 'rail' && d.id !== 'revolver' && d.id !== 'beam' && d.id !== 'arc') G.fx.ejectShell(w.model.userData.eject.getWorldPosition(_v), P.rightVec, d.id === 'shotgun');
    if (d.id === 'shotgun') setTimeout(() => G.audio.play('pump', { pos: P.pos }), 260);
    if (d.id === 'rail') { G.fx.ring(muzzle, 0.1, 1.2, 0.3, 0x55f0ff, dirMain); G.renderer.kick(0.6); }
    P.addRecoil(d.recoilPitch, d.shake);
    if (anyHit && !d.auto) G.hitStop(d.id === 'shotgun' ? 0.035 : d.id === 'rail' ? 0.045 : 0.022);
    G.stats.shots++;
    G.emit('fired', { weapon: d.id, hit: anyHit });
  }

  _animateWeapon(dt, w) {
    // moving parts only; the gun's pose comes from orientToTarget (recoil travel / pitch / roll from GUN_FEEL)
    const p = w.model.userData.parts, k = w.recoil;
    if (p.pump) {
      const progress = w.cool > 0 ? 1 - w.cool / w.def.interval : 1;
      const stroke = progress > 0.28 && progress < 0.82 ? Math.sin((progress - 0.28) / 0.54 * Math.PI) : 0;
      p.pump.position.z = p.pump.userData.restZ - stroke * 0.075 - (w.reloadShells ? 0.02 : 0);
    }
    if (p.cyl) {
      if (k > 0.95 && !w.cylinderTurned) { p.cyl.rotation.z += Math.PI / 3; w.cylinderTurned = true; }
      if (k < 0.9) w.cylinderTurned = false;
      p.cyl.position.x = w.reloading > 0 ? Math.sin(Math.PI * (1 - w.reloading / w.def.reload)) * 0.095 : 0;
      if (w.reloading > 0) p.cyl.rotation.z += dt * 20;
    }
    if (p.mag) {
      const progress = w.reloading > 0 ? 1 - w.reloading / w.def.reload : 1;
      p.mag.position.y = -0.07 - (progress > 0.12 && progress < 0.76 ? Math.sin((progress - 0.12) / 0.64 * Math.PI) * 0.12 : 0);
    }
    if (p.rings) for (let i = 0; i < p.rings.length; i++) p.rings[i].rotation.z += dt * (1.5 + i) * (this.grabbed ? 3 : 1);
    if (p.core) p.core.scale.setScalar(0.9 + Math.sin(performance.now() * 0.006) * 0.045);
    if (p.ring) p.ring.rotation.z += dt;
    if (p.spin) { w.spin = Math.max(0, (w.spin || 0) - dt * 2); p.spin.rotation.z += dt * w.spin * 40; }
  }

  // ---------------- gravity cannon
  _updateGravity(dt, w, wantsFire, firePressed, fireReleased) {
    const G = this.game, P = this.player;
    if (firePressed && w.cool <= 0) {
      // try to grab
      const target = G.findGrabTarget(P.camPos, P.camForward, w.def.range);
      if (target && w.ammo >= w.def.grabCost) {
        this.grabbed = target;
        this.holdT = 0;
        w.ammo -= w.def.grabCost;
        G.audio.play('gravGrab', { pos: P.pos });
        G.grab(target, true);
        G.emit('grab', target);
      } else if (w.ammo >= w.def.cost) {
        w.ammo -= w.def.cost;
        w.cool = w.def.interval;
        w.recoil = 1;
        const muzzle = w.model.userData.muzzle.getWorldPosition(new THREE.Vector3());
        G.gravityBlast(muzzle, P.camForward, w.def.range * 0.6, w.def.knock, w.def.damage * P.damageMult());
        G.audio.play('gravity', { pos: P.pos });
        P.addRecoil(w.def.recoilPitch, w.def.shake);
        G.renderer.kick(0.5);
        G.stats.shots++;
      } else G.audio.play('dryFire', { pos: P.pos });
    }
    if (this.grabbed) {
      this.holdT += dt;
      G.audio.loop('tractor', 0.25);
      const holdPos = _v.copy(P.camPos).addScaledVector(P.camForward, 4.2 + (this.grabbed.r || 0.5) * 2).add(_v2.set(0, -0.3, 0));
      const ok = G.holdGrabbed(this.grabbed, holdPos, dt);
      if (!ok) this.dropGrab(false);
      else if (!wantsFire && this.holdT > 0.08) {
        // launch
        const dir = new THREE.Vector3().subVectors(this.aimTarget, holdPos).normalize();
        G.launchGrabbed(this.grabbed, dir, 42);
        this.grabbed = null;
        w.cool = w.def.interval;
        w.recoil = 1;
        G.audio.loop('tractor', 0);
        G.audio.play('gravity', { pos: P.pos });
        P.addRecoil(w.def.recoilPitch * 1.4, w.def.shake);
        G.renderer.kick(0.5);
      }
    } else G.audio.loop('tractor', 0);
  }
  dropGrab(throwIt) {
    if (!this.grabbed) return;
    this.game.grab(this.grabbed, false);
    this.grabbed = null;
    this.game.audio.loop('tractor', 0);
  }

  // ---------------- melee
  startMelee(air) {
    const m = this.melee;
    if (this.meleeT > 0 && this.meleeT > 0.45 * m.def.interval / 0.32) return false;
    if (m.cool > 0) return false;
    if (this.meleeT > 0) { this.meleeStep++; } else { this.meleeStep = this.meleeCombo > 0 ? this.meleeStep + 1 : 0; }
    const dur = m.def.id === 'hammer' ? 0.66 : (this.meleeStep % 3 === 2 ? 0.42 : 0.29);
    this.meleeT = dur;
    this.meleeDur = dur;
    this.meleeHitDone = false;
    this.meleeCombo = 0.7;
    this.meleeAir = air;
    this.mount();
    this.game.audio.play('swing', { pos: this.player.pos });
    this.player.fovKick = Math.min(4, this.player.fovKick + 0.7);
    return true;
  }
  _updateMelee(dt) {
    const m = this.melee;
    this.meleeT -= dt;
    const prog = 1 - this.meleeT / this.meleeDur;
    const hitAt = m.def.id === 'hammer' ? 0.48 : 0.3;
    if (!this.meleeHitDone && prog >= hitAt) {
      this.meleeHitDone = true;
      const dmgArr = m.def.damage;
      const dmg = dmgArr[Math.min(this.meleeStep % 3, dmgArr.length - 1)] * this.player.damageMult();
      const spin = m.def.id === 'blades' && this.meleeStep % 3 === 2;
      this.game.meleeStrike(this.player, {
        damage: dmg, range: m.def.range * (spin ? 1.25 : 1), arc: spin ? Math.PI : m.def.arc, weapon: m.def.id,
        aoe: m.def.aoe, air: this.meleeAir, spin,
      });
    }
    // blade trail fx
    if (m.def.id === 'blades' && prog > 0.2 && prog < 0.6) {
      const tip = m.model.userData.muzzle.getWorldPosition(_v);
      this.game.fx.trail(tip, FXColors.pink, 0.3, 0.18);
      if (this.bladeL) { const t2 = this.bladeL.localToWorld(_v2.set(0, 0, 0.8)); this.game.fx.trail(t2, FXColors.cyan, 0.3, 0.18); }
    }
    if (this.meleeT <= 0) {
      this.meleeT = 0;
      this.mount();
    }
  }
  tick(dt) { this.meleeCombo = Math.max(0, this.meleeCombo - dt); this.melee.cool = Math.max(0, this.melee.cool - dt); }

  // Aim the gun at the target from a chest-space anchor, then IK the hands onto its grips.
  // Relaxed (not aiming / not recently fired) the muzzle dips toward the ground ahead.
  orientToTarget(target, weight = 1) {
    const w = this.current, rig = this.player.model;
    if (!w || this.meleeT > 0 || weight <= 0 || !w.model.userData.rightGrip) return;
    const P = this.player, forced = P.previewAim, aim = forced ?? (P.aiming || P.lastShotT < 0.85 || P.fireHold > 0);
    const twoHanded = w.def.twoHanded || aim, id = w.id;
    const feel = GUN_FEEL[id] || GUN_FEEL.rifle, k = Math.min(1, w.recoil || 0), recoil = k * k * (3 - 2 * k);
    const anchor = rig.weaponMount;
    anchor.position.set(id === 'revolver' ? -0.13 : -0.015, aim ? 0.155 : 0.105, id === 'revolver' ? (aim ? 0.46 : 0.36) : (aim ? 0.38 : 0.3));
    if (w.reloading > 0) { const lift = Math.sin(Math.PI * (1 - w.reloading / (w.def.reload || 1))); anchor.position.y += 0.09 * lift; anchor.position.x += 0.025 * lift; }
    const cb = rig.carryBob; if (cb) { const k = aim ? 0.35 : 1; anchor.position.x += cb.x * k; anchor.position.y += cb.y * k; }
    w.model.position.set(0, (this.switchT > 0 ? -this.switchT * 0.35 : 0) + recoil * 0.025, -recoil * feel.travel);
    rig.root.updateMatrixWorld(true);
    const pos = w.model.getWorldPosition(_v), look = _v2.copy(target);
    if (!aim) { const dir = _v3.copy(target).sub(pos).normalize(); dir.y -= 0.3; look.copy(pos).addScaledVector(dir.normalize(), 10); }
    _m.lookAt(look, pos, THREE.Object3D.DEFAULT_UP);
    _q.setFromRotationMatrix(_m);
    w.model.parent.getWorldQuaternion(_q2).invert();
    w.model.quaternion.copy(_q2.multiply(_q));
    w.model.rotateX(-recoil * feel.pitch); w.model.rotateZ(recoil * feel.roll);
    if (rig.carryBob && !aim) w.model.rotateZ(rig.carryBob.roll);
    if (w.reloading > 0) { const pr = 1 - w.reloading / (w.def.reload || 1); w.model.rotateZ(0.25 * Math.sin(pr * Math.PI)); w.model.rotateX(-0.2 * Math.sin(pr * Math.PI)); }
    rig.j.shoulderR.position.z = 0.025;
    if (twoHanded) rig.j.shoulderL.position.z = 0.1;
    rig.root.updateMatrixWorld(true);
    const gripQ = w.model.getWorldQuaternion(new THREE.Quaternion()), right = w.model.userData.rightGrip.getWorldPosition(new THREE.Vector3());
    rig.animator ??= new CharacterAnimator(rig);
    rig.animator.gripErrors.right = solveArmIK(rig, 'R', right, gripQ);
    if (twoHanded) {
      let left = w.model.userData.leftGrip.getWorldPosition(new THREE.Vector3());
      const adj = AnimationTuning.grips[id] || [0, 0, 0];
      left.add(new THREE.Vector3(...adj).applyQuaternion(gripQ));
      if (w.reloading > 0 && w.model.userData.parts.mag) {
        const pr = 1 - w.reloading / w.def.reload;
        if (pr > 0.15 && pr < 0.75) left = w.model.userData.parts.mag.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0.015, -0.035, 0.025).applyQuaternion(gripQ));
      }
      rig.animator.gripErrors.left = solveArmIK(rig, 'L', left, gripQ);
    } else rig.animator.gripErrors.left = 0;
    rig.root.updateMatrixWorld(true);
  }
}
