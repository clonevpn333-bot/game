// Contestant 99 — procedurally modeled, jointed, procedurally animated character.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/three/addons/geometries/RoundedBoxGeometry.js';
import { numberTexture, fabricTextures, armorTextures } from '../engine/textures.js';
import { CharacterAnimator, meleePose } from './animator.js';

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
const FINGER_A = new THREE.CylinderGeometry(0.013, 0.015, 0.042, 8), FINGER_B = new THREE.CylinderGeometry(0.012, 0.013, 0.033, 8);
FINGER_A.userData.shared = FINGER_B.userData.shared = true;

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
    // guns ride a chest-space mount and the hands are IK'd onto their grip points
    this.weaponMount = new THREE.Group(); this.weaponMount.name = 'weapon-mount';
    this.j.chest.add(this.weaponMount);
    // articulated fingers (two segments each) replace the static glove fingers so hands can wrap grips
    this.fingers = { R: [], L: [] };
    for (const side of ['R', 'L']) {
      const hand = this.j['hand' + side];
      for (const child of hand.children.slice(2, 6)) child.visible = false;
      for (let i = 0; i < 5; i++) {
        const finger = new THREE.Group();
        finger.position.set(i === 4 ? (side === 'R' ? 0.065 : -0.065) : -0.045 + i * 0.03, i === 4 ? -0.025 : -0.065, 0.045);
        if (i === 4) finger.rotation.z = side === 'R' ? -0.65 : 0.65;
        hand.add(finger);
        let seg = new THREE.Mesh(FINGER_A, this.mats.rubber); seg.position.y = -0.02; seg.castShadow = true; finger.add(seg);
        const knuckle = new THREE.Group(); knuckle.position.y = -0.04; finger.add(knuckle);
        seg = new THREE.Mesh(FINGER_B, this.mats.rubber); seg.position.y = -0.015; knuckle.add(seg);
        this.fingers[side].push(finger);
      }
    }
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
    this.animator ??= new CharacterAnimator(this);
    this.animator.update(dt, s0);
    const s = this.animator.state, j = this.j;
    this.time = this.animator.time;
    // squash & stretch: stretch on take-off, squash on landing / slide
    let sy = 1;
    if (!s.grounded && s.vy > 4 && s.mode !== 'grapple' && s.mode !== 'swim') sy = 1.06;
    if (this.animator.clip === 'landing') sy = 1 - 0.1 * s.landingSeverity * Math.max(0, 1 - s.landingAge / 0.2);
    if (s.mode === 'slide') sy = 0.96;
    this._sq = damp(this._sq ?? 1, sy, 16, dt);
    j.body.scale.set(1 / Math.sqrt(this._sq), this._sq, 1 / Math.sqrt(this._sq));
    // secondary motion: antenna + backpack spring from root acceleration
    const run = clamp(s.speed / 7, 0, 1) * (s.grounded || s.mode === 'wallrun' ? 1 : 0), ph = this.phase;
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
  _meleePose(T, s) { meleePose(T, s); }
  // Mech frame for Mech City: chunky shoulder armour with missile pods, back thrusters, a canopy ring
  setMech(on) {
    if (on && !this.mechParts) {
      const M = this.mats, plate = new THREE.MeshStandardMaterial({ color: '#d8dce4', metalness: 0.7, roughness: 0.3 }), pink = new THREE.MeshStandardMaterial({ color: '#000', emissive: '#ff2d6f', emissiveIntensity: 3 });
      const g = this.mechParts = new THREE.Group();
      for (const side of [1, -1]) {
        const sh = this.j['shoulder' + (side === 1 ? 'L' : 'R')];
        const pad = new THREE.Mesh(rbox(0.36, 0.22, 0.42, 0.06), plate); pad.position.set(0.04 * side, 0.12, 0); sh.add(pad);
        const pod = new THREE.Mesh(rbox(0.18, 0.16, 0.3, 0.04), M.armor); pod.position.set(0.08 * side, 0.3, -0.02); sh.add(pod);
        for (let i = 0; i < 2; i++) { const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8), pink); tube.rotation.x = Math.PI / 2; tube.position.set(0.08 * side + (i - 0.5) * 0.07, 0.3, 0.14); sh.add(tube); }
        const thr = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.32, 10), plate); thr.position.set(0.12 * side, 0.05, -0.28); this.j.chest.add(thr);
        const fl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.02, 0.18, 8), pink); fl.position.set(0.12 * side, -0.15, -0.28); this.j.chest.add(fl);
        g.userData[side] = [pad, pod, thr, fl];
      }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 24), plate); ring.rotation.x = Math.PI / 2; ring.position.y = 0.05; this.j.head.add(ring);
      g.userData.ring = ring;
    }
    if (this.mechParts) { for (const side of [1, -1]) for (const m of this.mechParts.userData[side]) m.visible = on; this.mechParts.userData.ring.visible = on; }
  }

}
