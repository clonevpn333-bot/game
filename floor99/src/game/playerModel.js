// Contestant 99 — procedurally modeled, jointed, procedurally animated character.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/three/addons/geometries/RoundedBoxGeometry.js';
import { numberTexture, fabricTextures, armorTextures } from '../engine/textures.js';

const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const LOOKS = {
  suit: ['#e8572a', '#2a6fe8', '#1fbf75', '#d42d6f', '#f2c230', '#222831', '#eeeeee', '#7a3cff'],
  armor: ['#3a404c', '#e6e9ee', '#c49a2c', '#23272f', '#8a1c2b', '#0f5c4a'],
  visor: ['#25f4ff', '#ff2d6f', '#ffd400', '#7dff4f', '#b46bff', '#ff8a1f'],
  helmet: ['DOME', 'CREST', 'ANTENNA', 'VISORLESS'],
};

function rbox(w, h, d, r = 0.04, s = 3) { return new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)); }
function cap(r, len, seg = 10) { return new THREE.CapsuleGeometry(r, len, 4, seg); }

export class PlayerModel {
  constructor(look = {}) {
    this.root = new THREE.Group();
    this.look = { suit: 0, armor: 0, visor: 0, helmet: 0, ...look };
    const fab = fabricTextures(), arm = armorTextures();
    this.mats = {
      // quilted jumpsuit fabric (tinted per look)
      suit: new THREE.MeshStandardMaterial({ color: '#e8572a', map: fab.map, normalMap: fab.normalMap, normalScale: new THREE.Vector2(0.6, 0.6), roughness: 0.78, metalness: 0.0 }),
      // worn painted armor plates with chipped edges
      armor: new THREE.MeshStandardMaterial({ color: '#1c1f26', map: arm.map, normalMap: arm.normalMap, roughnessMap: arm.roughnessMap, roughness: 0.55, metalness: 0.55 }),
      stripe: new THREE.MeshStandardMaterial({ color: '#d4202c', map: arm.map, normalMap: arm.normalMap, roughness: 0.45, metalness: 0.3 }),
      rubber: new THREE.MeshStandardMaterial({ color: '#17181c', roughness: 0.9, metalness: 0.0 }),
      metal: new THREE.MeshStandardMaterial({ color: '#a8b0ba', roughness: 0.28, metalness: 1.0 }),
      gold: new THREE.MeshStandardMaterial({ color: '#d4a640', roughness: 0.3, metalness: 1.0 }),
      visor: new THREE.MeshPhysicalMaterial({ color: '#06121a', emissive: '#25f4ff', emissiveIntensity: 1.1, roughness: 0.05, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 }),
      glow: new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#25f4ff', emissiveIntensity: 2.6 }),
      skin: new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.75 }),
      helmet: new THREE.MeshStandardMaterial({ color: '#eef0f4', map: arm.map, normalMap: arm.normalMap, roughnessMap: arm.roughnessMap, roughness: 0.35, metalness: 0.15 }),
    };
    this.numberTex = numberTexture('99', '#ffffff', '#00000000');
    this.mats.number = new THREE.MeshStandardMaterial({ map: this.numberTex, transparent: true, roughness: 0.5, emissive: '#ffffff', emissiveMap: this.numberTex, emissiveIntensity: 0.35 });
    this.j = {};
    this.springs = {};
    this._build();
    this.applyLook(this.look);
    this.phase = 0;
    this.time = 0;
    this.pose = {};
    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  _mesh(geo, mat, parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    parent.add(m);
    return m;
  }
  _joint(name, parent, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.name = name;
    parent.add(g);
    this.j[name] = g;
    return g;
  }
  _bolts(parent, pts, r = 0.016) { for (const [x, y, z] of pts) this._mesh(new THREE.SphereGeometry(r, 8, 6), this.mats.metal, parent, x, y, z); }
  _build() {
    const M = this.mats;
    const body = this._joint('body', this.root, 0, 0, 0); // whole-body rotations (rolls, flips)
    const hips = this._joint('hips', body, 0, 0.98, 0);
    // ---------------- pelvis, belt, pouches
    this._mesh(rbox(0.42, 0.24, 0.28, 0.1, 4), M.suit, hips, 0, -0.01, 0);
    this._mesh(rbox(0.47, 0.085, 0.32, 0.035, 3), M.rubber, hips, 0, 0.075, 0);
    const buckle = this._mesh(rbox(0.13, 0.1, 0.04, 0.02, 3), M.gold, hips, 0, 0.075, 0.165);
    this._mesh(rbox(0.07, 0.035, 0.02, 0.01), M.glow, buckle, 0, 0, 0.02);
    for (const sx of [-1, 1]) {
      const pouch = this._mesh(rbox(0.1, 0.12, 0.09, 0.03, 3), M.armor, hips, 0.215 * sx, 0.02, 0.07);
      this._mesh(rbox(0.105, 0.03, 0.095, 0.01), M.stripe, pouch, 0, 0.045, 0);
      this._mesh(rbox(0.09, 0.14, 0.07, 0.03, 3), M.armor, hips, 0.23 * sx, -0.01, -0.09); // holster
    }
    const spine = this._joint('spine', hips, 0, 0.1, 0);
    this._mesh(rbox(0.42, 0.22, 0.25, 0.1, 4), M.suit, spine, 0, 0.1, 0);
    const chest = this._joint('chest', spine, 0, 0.2, 0);
    // barrel chest
    this._mesh(rbox(0.56, 0.4, 0.34, 0.15, 5), M.suit, chest, 0, 0.14, 0);
    // layered chest armor with red stripes + glowing core
    const plate = this._mesh(rbox(0.46, 0.3, 0.1, 0.06, 4), M.armor, chest, 0, 0.17, 0.15, -0.08);
    for (const sx of [-1, 1]) this._mesh(rbox(0.045, 0.27, 0.02, 0.01), M.stripe, plate, 0.12 * sx, 0, 0.052);
    const core = this._mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 18), M.glow, plate, 0, 0.04, 0.055, Math.PI / 2);
    this._mesh(new THREE.TorusGeometry(0.058, 0.012, 8, 20), M.metal, plate, 0, 0.04, 0.06);
    this._bolts(plate, [[-0.19, 0.11, 0.052], [0.19, 0.11, 0.052], [-0.19, -0.11, 0.052], [0.19, -0.11, 0.052]]);
    this._mesh(rbox(0.36, 0.08, 0.08, 0.03), M.armor, chest, 0, -0.02, 0.15); // ab plate
    // back plate + number + backpack
    const back = this._mesh(rbox(0.42, 0.32, 0.08, 0.05, 4), M.armor, chest, 0, 0.16, -0.17);
    const num = this._mesh(new THREE.PlaneGeometry(0.24, 0.24), M.number, back, 0, 0.01, -0.042);
    num.rotation.y = Math.PI;
    const pack = this._joint('pack', chest, 0, 0.12, -0.25);
    const reel = this._mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.24, 20), M.metal, pack, 0, 0.02, 0, 0, 0, Math.PI / 2);
    for (const sx of [-1, 1]) this._mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.03, 20), M.armor, reel, 0, 0.11 * sx, 0);
    this._mesh(new THREE.TorusGeometry(0.11, 0.018, 8, 24), M.glow, pack, 0, 0.02, 0, 0, Math.PI / 2);
    for (const sx of [-1, 1]) {
      const tank = this._mesh(cap(0.05, 0.22, 12), M.stripe, pack, 0.15 * sx, 0.04, 0.0);
      this._mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 10), M.metal, tank, 0, 0.17, 0);
    }
    this._mesh(rbox(0.1, 0.06, 0.04, 0.01), M.glow, pack, 0, -0.12, -0.02);
    // antenna with spring (secondary motion)
    const ant = this._joint('antenna', pack, 0.13, 0.2, -0.02);
    this._mesh(new THREE.CylinderGeometry(0.006, 0.01, 0.34, 6), M.metal, ant, 0, 0.17, 0);
    this.antTip = this._mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2030', emissiveIntensity: 3 }), ant, 0, 0.35, 0);
    // collar
    this._mesh(new THREE.TorusGeometry(0.12, 0.045, 10, 22), M.armor, chest, 0, 0.33, 0, Math.PI / 2);

    const neck = this._joint('neck', chest, 0, 0.35, 0);
    this._mesh(new THREE.CylinderGeometry(0.065, 0.08, 0.09, 12), M.skin, neck, 0, 0.03, 0);
    const head = this._joint('head', neck, 0, 0.08, 0);
    this.helmetGroup = new THREE.Group();
    head.add(this.helmetGroup);

    // ---------------- arms (model faces +Z; anatomical right is -X)
    for (const side of [1, -1]) {
      const s = side === 1 ? 'L' : 'R';
      const sh = this._joint('shoulder' + s, chest, 0.33 * side, 0.24, 0);
      // two-layer pauldron
      const pad = this._mesh(new THREE.SphereGeometry(0.14, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.armor, sh, 0.02 * side, 0.03, 0, 0, 0, -0.45 * side);
      pad.scale.set(1.1, 0.95, 1.12);
      const pad2 = this._mesh(new THREE.SphereGeometry(0.12, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.2), M.stripe, sh, 0.05 * side, -0.04, 0, 0, 0, -0.75 * side);
      pad2.scale.set(1.05, 0.7, 1.05);
      this._bolts(sh, [[0.1 * side, 0.08, 0.06], [0.1 * side, 0.08, -0.06]], 0.014);
      this._mesh(cap(0.075, 0.2, 14), M.suit, sh, 0, -0.16, 0);
      const el = this._joint('elbow' + s, sh, 0, -0.31, 0);
      const ep = this._mesh(new THREE.SphereGeometry(0.075, 14, 10), M.armor, el, 0, 0, -0.015);
      ep.scale.set(1, 1, 1.15);
      this._mesh(cap(0.066, 0.15, 14), M.suit, el, 0, -0.13, 0);
      // gauntlet with stripe + light
      const gaunt = this._mesh(rbox(0.155, 0.17, 0.155, 0.05, 4), M.armor, el, 0, -0.17, 0);
      this._mesh(rbox(0.158, 0.03, 0.158, 0.012), M.stripe, gaunt, 0, 0.06, 0);
      this._mesh(rbox(0.03, 0.08, 0.02, 0.01), M.glow, gaunt, 0.08 * side, -0.01, 0.0, 0, Math.PI / 2, 0);
      const hand = this._joint('hand' + s, el, 0, -0.3, 0);
      // big chunky glove: palm, knuckle plate, fingers, thumb
      this._mesh(rbox(0.13, 0.11, 0.14, 0.045, 4), M.rubber, hand, 0, -0.02, 0.01);
      this._mesh(rbox(0.135, 0.045, 0.06, 0.02), M.armor, hand, 0, -0.02, 0.07);
      for (let f = 0; f < 3; f++) this._mesh(cap(0.024, 0.05, 8), M.rubber, hand, (-0.04 + f * 0.04), -0.08, 0.05, 0.3, 0, 0);
      this._mesh(cap(0.026, 0.05, 8), M.rubber, hand, -0.075 * side, -0.03, 0.05, 0.6, 0, 0.4 * side);
    }
    // ---------------- legs
    for (const side of [1, -1]) {
      const s = side === 1 ? 'L' : 'R';
      const hp = this._joint('hip' + s, hips, 0.125 * side, -0.07, 0);
      this._mesh(cap(0.105, 0.24, 14), M.suit, hp, 0, -0.2, 0);
      const tp = this._mesh(rbox(0.17, 0.2, 0.11, 0.05, 4), M.armor, hp, 0.03 * side, -0.17, 0.065);
      this._mesh(rbox(0.035, 0.18, 0.02, 0.01), M.stripe, tp, 0.0, 0, 0.056);
      const kn = this._joint('knee' + s, hp, 0, -0.42, 0);
      const kp = this._mesh(rbox(0.16, 0.15, 0.12, 0.06, 4), M.armor, kn, 0, 0.0, 0.06);
      this._bolts(kp, [[0, 0.02, 0.062]], 0.02);
      this._mesh(cap(0.085, 0.22, 14), M.suit, kn, 0, -0.19, 0);
      // boot: shaft, strap, foot, toe cap, thick sole, heel light
      this._mesh(rbox(0.19, 0.22, 0.19, 0.06, 4), M.armor, kn, 0, -0.3, 0.0);
      this._mesh(rbox(0.195, 0.035, 0.195, 0.012), M.stripe, kn, 0, -0.24, 0.0);
      const ft = this._joint('foot' + s, kn, 0, -0.42, 0);
      this._mesh(rbox(0.19, 0.13, 0.33, 0.06, 4), M.rubber, ft, 0, -0.025, 0.065);
      this._mesh(rbox(0.18, 0.08, 0.12, 0.04, 3), M.armor, ft, 0, 0.0, 0.18);
      this._mesh(rbox(0.205, 0.05, 0.36, 0.02, 3), M.armor, ft, 0, -0.095, 0.065);
      for (let t = 0; t < 4; t++) this._mesh(rbox(0.2, 0.02, 0.03, 0.005), M.rubber, ft, 0, -0.123, -0.07 + t * 0.08);
      this._mesh(rbox(0.1, 0.025, 0.02, 0.008), M.glow, ft, 0, -0.06, -0.115);
    }
    // weapon sockets
    this.socketR = new THREE.Group();
    this.socketR.position.set(0, -0.06, 0.04);
    this.j.handR.add(this.socketR);
    this.socketL = new THREE.Group();
    this.socketL.position.set(0, -0.06, 0.04);
    this.j.handL.add(this.socketL);
    this.grappleOrigin = new THREE.Object3D();
    this.grappleOrigin.position.set(0, -0.16, 0.08);
    this.j.elbowL.add(this.grappleOrigin);
  }
  buildHelmet(style) {
    const g = this.helmetGroup;
    while (g.children.length) g.remove(g.children[0]);
    const M = this.mats;
    const add = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); g.add(m); return m; };
    // chunky shell, slightly oversized for a stylized silhouette
    const shell = add(new THREE.SphereGeometry(0.2, 32, 24), M.helmet, 0, 0.12, -0.01);
    shell.scale.set(1.02, 1.04, 1.08);
    // top stripe
    add(rbox(0.05, 0.03, 0.36, 0.015), M.stripe, 0, 0.32, -0.02, -0.1, 0, 0);
    if (style !== 3) {
      // wraparound visor with glossy clearcoat
      const visor = add(new THREE.SphereGeometry(0.205, 32, 16, -1.2, 2.4, 1.2, 0.62), M.visor, 0, 0.12, 0.0);
      visor.scale.set(1.05, 1.08, 1.12);
    } else {
      for (const sx of [-1, 1]) add(rbox(0.08, 0.026, 0.02, 0.008), M.visor, 0.065 * sx, 0.13, 0.205);
    }
    // ear pods with glowing rings + bolts
    for (const sx of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 20), M.stripe, 0.205 * sx, 0.11, -0.01, 0, 0, Math.PI / 2);
      add(new THREE.TorusGeometry(0.05, 0.01, 8, 20), M.glow, 0.238 * sx, 0.11, -0.01, 0, Math.PI / 2, 0);
      add(new THREE.SphereGeometry(0.018, 8, 6), M.metal, 0.24 * sx, 0.11, -0.01);
    }
    // chin guard + breathing vents
    add(rbox(0.24, 0.09, 0.12, 0.04, 4), M.armor, 0, -0.005, 0.11);
    for (let v = 0; v < 3; v++) add(rbox(0.12, 0.012, 0.01, 0.004), M.rubber, 0, -0.025 + v * 0.02, 0.172);
    if (style === 1) {
      const crest = add(rbox(0.045, 0.14, 0.34, 0.02, 3), M.stripe, 0, 0.32, -0.04);
      add(rbox(0.05, 0.02, 0.3, 0.008), M.glow, 0, 0.385, -0.04);
      crest.rotation.x = -0.05;
    } else if (style === 2) {
      for (const sx of [-1, 1]) {
        add(new THREE.CylinderGeometry(0.008, 0.014, 0.28, 6), M.metal, 0.1 * sx, 0.36, -0.04, 0, 0, -0.35 * sx);
        add(new THREE.SphereGeometry(0.03, 10, 8), M.glow, 0.148 * sx, 0.49, -0.04);
      }
    }
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  }
  applyLook(look) {
    this.look = { ...this.look, ...look };
    const L = this.look;
    this.mats.suit.color.set(LOOKS.suit[L.suit % LOOKS.suit.length]);
    this.mats.armor.color.set(LOOKS.armor[L.armor % LOOKS.armor.length]);
    const v = LOOKS.visor[L.visor % LOOKS.visor.length];
    this.mats.visor.emissive.set(v);
    this.mats.glow.emissive.set(v);
    // stripes contrast with the armor: red on dark armor, black on light armor
    const light = new THREE.Color(LOOKS.armor[L.armor % LOOKS.armor.length]).getHSL({}).l > 0.5;
    this.mats.stripe.color.set(light ? '#20232a' : '#d4202c');
    this.buildHelmet(L.helmet % LOOKS.helmet.length);
  }
  setOpacity(o) {
    this.root.visible = o > 0.05;
  }
  animate(dt, s0) {
    const s = { speed: 0, grounded: true, vy: 0, mode: 'normal', strafe: 0, headYaw: 0, land: 0, flip: 0, recoil: 0, melee: 0, meleeT: 0, meleeStep: 0, aimPitch: 0, dodgeT: 0, wallSide: 0, ...s0 };
    this.time += dt;
    const j = this.j;
    const P = this.pose;
    const k = 18;
    const speed = s.speed;
    // run cycle phase
    const cadence = s.mode === 'wallrun' ? 2.1 : s.sprint ? 1.55 : 1.75;
    if (s.grounded || s.mode === 'wallrun') this.phase += dt * Math.min(speed, 16) * cadence / 1.0;
    const ph = this.phase;
    const run = clamp(speed / 7, 0, 1) * ((s.grounded || s.mode === 'wallrun') ? 1 : 0);
    const dir = s.moveBack ? -1 : 1;

    // target pose
    const T = {
      bodyRX: 0, bodyRZ: 0, bodyY: 0,
      hipsY: 0.98, hipsRX: 0, hipsRY: 0, hipsRZ: 0,
      spineRX: 0, chestRX: 0, chestRY: 0, chestRZ: 0, headRX: 0, headRY: 0,
      hipLX: 0, hipRX: 0, hipLZ: 0.04, hipRZ: -0.04, kneeL: 0, kneeR: 0, footL: 0, footR: 0,
      shLX: 0, shRX: 0, shLZ: 0.15, shRZ: -0.15, shLY: 0, shRY: 0, elL: -0.2, elR: -0.2,
    };
    // idle breathing
    const br = Math.sin(this.time * 2.2) * 0.02;
    T.chestRX = br; T.shLZ += br; T.shRZ -= br;

    if (s.mode === 'dead') {
      T.bodyRX = -1.45; T.hipsY = 0.3; T.shLX = -2.5; T.shRX = -2.6; T.kneeL = 0.3; T.kneeR = 0.6;
    } else if (s.mode === 'slide') {
      T.hipsY = 0.48; T.bodyRX = -0.35; T.hipsRX = 0;
      T.hipRX = -1.35; T.kneeR = 0.15; T.footR = -0.4;
      T.hipLX = -0.3; T.kneeL = 1.9; T.hipLZ = 0.3;
      T.spineRX = 0.25; T.chestRX = 0.2;
      T.shLX = -0.4; T.shLZ = 0.9; T.elL = -0.5;
    } else if (s.mode === 'dodge') {
      const t = s.dodgeT; // 0..1
      T.bodyRX = t * Math.PI * 2 * (s.dodgeBack ? -1 : 1);
      T.hipsY = 0.75;
      T.hipLX = -1.6; T.hipRX = -1.6; T.kneeL = 2.2; T.kneeR = 2.2;
      T.spineRX = 0.5; T.chestRX = 0.4; T.shLX = -1.0; T.shRX = -1.0; T.elL = -1.8; T.elR = -1.8;
    } else if (s.mode === 'swim') {
      T.bodyRX = 1.25; T.hipsY = 0.9;
      const kk = Math.sin(this.time * 8) * 0.4;
      T.hipLX = kk; T.hipRX = -kk; T.kneeL = 0.3; T.kneeR = 0.3;
      T.shLX = -2.6 + Math.sin(this.time * 3) * 0.6; T.shRX = -2.6 - Math.sin(this.time * 3) * 0.6;
      T.headRX = -0.9;
    } else if (s.mode === 'vault') {
      T.hipsY = 0.9; T.hipLX = -1.4; T.hipRX = -0.9; T.kneeL = 1.6; T.kneeR = 0.7; T.hipRZ = -0.5; T.hipLZ = 0.3;
      T.shLX = -1.3; T.shLZ = 0.4; T.elL = -0.1; T.bodyRZ = -0.25;
    } else if (!s.grounded && s.mode !== 'wallrun') {
      // airborne
      if (s.vy > 0) {
        T.hipLX = -1.1; T.kneeL = 1.5; T.hipRX = 0.3; T.kneeR = 0.6; T.footR = 0.3;
        T.shLX = -0.4; T.shLZ = 0.5; T.shRZ = -0.5;
        if (s.flip > 0) { T.bodyRX = (1 - s.flip) * Math.PI * 2; T.hipLX = -1.7; T.hipRX = -1.7; T.kneeL = 2.3; T.kneeR = 2.3; T.hipsY = 0.85; }
      } else {
        T.hipLX = -0.5; T.kneeL = 0.7; T.hipRX = -0.1; T.kneeR = 0.4;
        T.shLX = -0.3; T.shLZ = 0.9; T.shRZ = -0.9; T.elL = -0.6; T.elR = -0.6;
        T.spineRX = -0.1;
      }
      if (s.mode === 'grapple') { T.shLX = -2.8; T.shLZ = 0.2; T.elL = 0; T.hipLX = -0.6; T.kneeL = 1.2; T.hipRX = -0.2; T.kneeR = 0.9; }
    } else {
      // grounded locomotion — weighty, exaggerated stylized cycle
      const amp = 1.05 * run;
      const sw = Math.sin(ph) * dir;
      const sw2 = Math.sin(ph + Math.PI) * dir;
      T.hipRX = -sw * amp;
      T.hipLX = -sw2 * amp;
      // high knee lift on the forward swing, extension at plant
      T.kneeR = (Math.max(0, Math.sin(ph - 0.7)) * 1.9 + 0.12) * run;
      T.kneeL = (Math.max(0, Math.sin(ph + Math.PI - 0.7)) * 1.9 + 0.12) * run;
      T.footR = (-0.35 * Math.cos(ph) + 0.15) * run;
      T.footL = (-0.35 * Math.cos(ph + Math.PI) + 0.15) * run;
      // bounce: drop on contact, rise at passing pose
      T.hipsY = 0.98 - (0.5 - 0.5 * Math.cos(ph * 2)) * 0.09 * run + 0.02 * run - (s.crouch ? 0.25 : 0);
      T.hipsRY = Math.sin(ph) * 0.16 * run;
      T.hipsRZ = Math.sin(ph) * 0.07 * run;                 // hip tilt over the planted leg
      T.chestRY = -Math.sin(ph) * 0.24 * run;               // counter-twist
      T.chestRZ = -Math.sin(ph) * 0.05 * run;
      T.spineRX = 0.22 * run + (s.sprint ? 0.2 : 0);        // lean into the run
      T.headRX = -T.spineRX * 0.7;                           // keep eyes level
      T.shRX = sw * 1.0 * run; T.shLX = -sw * 1.0 * run;
      T.shRZ = -0.15 - 0.12 * run; T.shLZ = 0.15 + 0.12 * run;
      T.elR = -0.45 - 0.9 * run - 0.35 * Math.max(0, sw) * run;   // pumping forearms
      T.elL = -0.45 - 0.9 * run - 0.35 * Math.max(0, -sw) * run;
      // idle: slow weight shift & glances
      const idle = 1 - run;
      T.hipsRZ += Math.sin(this.time * 0.9) * 0.03 * idle;
      T.chestRZ += -Math.sin(this.time * 0.9) * 0.035 * idle;
      T.hipLZ += Math.max(0, Math.sin(this.time * 0.9)) * 0.06 * idle;
      T.kneeL += Math.max(0, Math.sin(this.time * 0.9)) * 0.12 * idle;
      T.headRY = Math.sin(this.time * 0.37) * 0.25 * idle;
      // strafe: twist hips toward move direction
      T.hipsRY += clamp(s.strafe, -1, 1) * 0.6;
      if (s.crouch) { T.kneeL += 0.9; T.kneeR += 0.9; T.hipLX -= 0.6; T.hipRX -= 0.6; }
      // landing squash
      if (s.land > 0) { T.hipsY -= s.land * 0.25; T.kneeL += s.land * 1.0; T.kneeR += s.land * 1.0; T.hipLX -= s.land * 0.5; T.hipRX -= s.land * 0.5; }
    }
    if (s.mode === 'wallrun') {
      T.bodyRZ = -0.45 * s.wallSide;
      const amp = 1.1;
      T.hipRX = -Math.sin(ph) * amp; T.hipLX = Math.sin(ph) * amp;
      T.kneeR = Math.max(0, Math.sin(ph - 1.2)) * 1.6 + 0.2; T.kneeL = Math.max(0, Math.sin(ph + Math.PI - 1.2)) * 1.6 + 0.2;
      // wall-side arm reaches toward wall
      if (s.wallSide > 0) { T.shRZ = -1.4; T.elR = -0.2; } else { T.shLZ = 1.4; T.elL = -0.2; }
    }
    if (s.giant) T.hipsY *= 1;

    // upper body: aiming overrides arms
    const aimPitch = s.aimPitch || 0;
    if (s.mode !== 'dead' && s.mode !== 'dodge' && s.mode !== 'swim') {
      if (s.melee > 0) {
        this._meleePose(T, s);
      } else if (s.aiming || s.weaponHand) {
        T.chestRX = -aimPitch * 0.45;
        T.headRX = -aimPitch * 0.4;
        T.chestRY = (T.chestRY || 0) * 0.3;
        const recoil = s.recoil || 0;
        const ready = s.aiming ? 1 : 0.85;
        T.shRX = (-Math.PI / 2 - aimPitch * 0.55) * ready - recoil * 0.4;
        T.shRY = 0.0; T.shRZ = -0.05;
        T.elR = -0.12 - recoil * 0.5;
        if (s.twoHanded) {
          T.shLX = -Math.PI / 2 - aimPitch * 0.55 - 0.05; T.shLZ = 0.35; T.shLY = -0.75; T.elL = -0.55;
        } else if (s.mode !== 'grapple' && s.mode !== 'slide' && s.mode !== 'wallrun') {
          // free hand swings slightly
        }
      }
      if (s.mode === 'grapple') { T.shLX = -2.8 - aimPitch * 0.3; T.shLZ = 0.2; T.elL = 0; }
    }
    // head look (keep upright)
    T.headRY = clamp((T.headRY || 0) + (s.headYaw || 0), -0.7, 0.7);

    // damp toward targets
    const d = (key, t, kk = k) => { P[key] = damp(P[key] ?? t, t, kk, dt); return P[key]; };
    const fast = s.mode === 'dodge' || (s.melee > 0) ? 40 : k;
    j.body.rotation.x = s.mode === 'dodge' ? T.bodyRX : d('bodyRX', T.bodyRX, s.flip > 0 ? 60 : 10);
    if (s.mode === 'dodge') P.bodyRX = 0;
    j.body.rotation.z = d('bodyRZ', T.bodyRZ, 10);
    j.hips.position.y = d('hipsY', T.hipsY, 16);
    j.hips.rotation.x = d('hipsRX', T.hipsRX);
    j.hips.rotation.y = d('hipsRY', T.hipsRY, 12);
    j.spine.rotation.x = d('spineRX', T.spineRX);
    j.chest.rotation.x = d('chestRX', T.chestRX, 22);
    j.chest.rotation.y = d('chestRY', T.chestRY - T.hipsRY, 14);
    j.chest.rotation.z = d('chestRZ', T.chestRZ || 0, 14);
    j.head.rotation.x = d('headRX', T.headRX);
    j.head.rotation.y = d('headRY', T.headRY);
    j.hipL.rotation.x = d('hipLX', T.hipLX, fast); j.hipR.rotation.x = d('hipRX', T.hipRX, fast);
    j.hipL.rotation.z = d('hipLZ', T.hipLZ); j.hipR.rotation.z = d('hipRZ', T.hipRZ);
    j.kneeL.rotation.x = d('kneeL', T.kneeL, fast); j.kneeR.rotation.x = d('kneeR', T.kneeR, fast);
    j.footL.rotation.x = d('footL', T.footL); j.footR.rotation.x = d('footR', T.footR);
    j.shoulderL.rotation.x = d('shLX', T.shLX, fast); j.shoulderR.rotation.x = d('shRX', T.shRX, fast + 8);
    j.shoulderL.rotation.y = d('shLY', T.shLY, fast); j.shoulderR.rotation.y = d('shRY', T.shRY, fast);
    j.shoulderL.rotation.z = d('shLZ', T.shLZ, fast); j.shoulderR.rotation.z = d('shRZ', T.shRZ, fast);
    j.elbowL.rotation.x = d('elL', T.elL, fast); j.elbowR.rotation.x = d('elR', T.elR, fast + 8);
    j.hips.rotation.z = d('hipsRZ', T.hipsRZ || 0, 12);
    // squash & stretch: stretch on take-off, squash on landing
    let sy = 1;
    if (!s.grounded && s.vy > 4 && s.mode !== 'grapple') sy = 1.07;
    if (s.land > 0) sy = 1 - s.land * 0.12;
    if (s.mode === 'slide') sy = 0.96;
    const sq = d('squash', sy, 16);
    j.body.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
    // secondary motion: antenna + backpack spring from root acceleration
    const wp = this.root.position;
    const prev = this._prevPos || wp.clone();
    const vel = this._v || (this._v = new THREE.Vector3());
    const nv = new THREE.Vector3().subVectors(wp, prev).divideScalar(Math.max(dt, 1e-3));
    const acc = nv.clone().sub(vel).divideScalar(Math.max(dt, 1e-3));
    vel.copy(nv); this._prevPos = wp.clone();
    const yaw = this.root.rotation.y;
    const accF = acc.x * Math.sin(yaw) + acc.z * Math.cos(yaw), accR = acc.x * Math.cos(yaw) - acc.z * Math.sin(yaw);
    const sp = this.springs;
    for (const [key, force] of [['ax', clamp(accF * 0.004, -0.6, 0.6)], ['az', clamp(-accR * 0.004, -0.6, 0.6)], ['ay', clamp(-acc.y * 0.002, -0.4, 0.4)]]) {
      const o = sp[key] || (sp[key] = { x: 0, v: 0 });
      o.v += (force * 60 - o.x * 90) * dt - o.v * 7 * dt;
      o.x += o.v * dt;
    }
    if (j.antenna) { j.antenna.rotation.x = sp.ax.x + Math.sin(ph * 2) * 0.06 * run; j.antenna.rotation.z = sp.az.x; }
    if (j.pack) j.pack.position.y = 0.12 + clamp(sp.ay.x * 0.05, -0.02, 0.02) - Math.abs(Math.sin(ph)) * 0.01 * run;
    if (this.antTip) this.antTip.material.emissiveIntensity = Math.sin(this.time * 6) > 0.6 ? 4 : 0.6;
  }
  _meleePose(T, s) {
    const t = s.meleeT; // 0..1 progress of the swing
    const kind = s.meleeKind;
    const e = t < 0.25 ? t / 0.25 : 1; // windup -> strike
    if (kind === 'hammer') {
      // overhead slam
      const up = t < 0.35 ? t / 0.35 : Math.max(0, 1 - (t - 0.35) / 0.2);
      T.shRX = lerp(-0.6, -3.0, up); T.shLX = lerp(-0.6, -3.0, up);
      T.shRZ = -0.1; T.shLZ = 0.1; T.shLY = -0.6; T.elR = -0.3; T.elL = -0.6;
      T.spineRX = lerp(0.6, -0.3, up); T.chestRX = lerp(0.4, -0.2, up);
      T.hipsY -= (1 - up) * 0.15 * (t > 0.4 ? 1 : 0);
    } else {
      // blade combo: 0 = right slash, 1 = left slash, 2 = spin
      const step = s.meleeStep % 3;
      const sw = t < 0.2 ? -1 + t / 0.2 * 0.2 : -0.8 + Math.min(1, (t - 0.2) / 0.25) * 1.8;
      if (step === 0) {
        T.shRX = -1.5; T.shRY = -sw * 1.2; T.shRZ = -0.3 - 0.3 * e; T.elR = -0.3;
        T.chestRY = -sw * 0.6; T.shLX = -0.6; T.shLZ = 0.5;
      } else if (step === 1) {
        T.shLX = -1.5; T.shLY = sw * 1.2; T.shLZ = 0.3 + 0.3 * e; T.elL = -0.3;
        T.chestRY = sw * 0.6; T.shRX = -0.6; T.shRZ = -0.5;
      } else {
        T.shRX = -1.4; T.shLX = -1.4; T.shRZ = -1.2; T.shLZ = 1.2; T.elR = -0.1; T.elL = -0.1;
        T.chestRY = sw * 0.3;
      }
      T.spineRX = 0.25;
      T.hipLX = -0.5; T.kneeL = 0.6; T.hipRX = 0.35; T.kneeR = 0.4;
    }
  }
}
