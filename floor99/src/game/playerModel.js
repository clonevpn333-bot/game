// Contestant 99 — procedurally modeled, jointed, procedurally animated character.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/three/addons/geometries/RoundedBoxGeometry.js';
import { numberTexture } from '../engine/textures.js';

const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const LOOKS = {
  suit: ['#e8572a', '#2a6fe8', '#1fbf75', '#d42d6f', '#f2c230', '#222831', '#eeeeee', '#7a3cff'],
  armor: ['#1c1f26', '#e6e9ee', '#c49a2c', '#3b4250', '#8a1c2b', '#0f5c4a'],
  visor: ['#25f4ff', '#ff2d6f', '#ffd400', '#7dff4f', '#b46bff', '#ff8a1f'],
  helmet: ['DOME', 'CREST', 'ANTENNA', 'VISORLESS'],
};

function rbox(w, h, d, r = 0.04, s = 3) { return new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)); }
function cap(r, len, seg = 10) { return new THREE.CapsuleGeometry(r, len, 4, seg); }

export class PlayerModel {
  constructor(look = {}) {
    this.root = new THREE.Group();
    this.look = { suit: 0, armor: 0, visor: 0, helmet: 0, ...look };
    this.mats = {
      suit: new THREE.MeshStandardMaterial({ color: '#e8572a', roughness: 0.6, metalness: 0.05 }),
      armor: new THREE.MeshStandardMaterial({ color: '#1c1f26', roughness: 0.35, metalness: 0.6 }),
      rubber: new THREE.MeshStandardMaterial({ color: '#16181d', roughness: 0.85, metalness: 0.0 }),
      metal: new THREE.MeshStandardMaterial({ color: '#9aa3ad', roughness: 0.3, metalness: 0.9 }),
      visor: new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#25f4ff', emissiveIntensity: 2.2, roughness: 0.1, metalness: 0.3 }),
      glow: new THREE.MeshStandardMaterial({ color: '#000000', emissive: '#25f4ff', emissiveIntensity: 2.5 }),
      skin: new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.7 }),
    };
    this.numberTex = numberTexture('99', '#ffffff', '#00000000');
    this.mats.number = new THREE.MeshStandardMaterial({ map: this.numberTex, transparent: true, roughness: 0.5, emissive: '#ffffff', emissiveMap: this.numberTex, emissiveIntensity: 0.4 });
    this.j = {};
    this._build();
    this.applyLook(this.look);
    this.phase = 0;
    this.time = 0;
    this.pose = {};
    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
  }
  _mesh(geo, mat, parent, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
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
  _build() {
    const M = this.mats;
    const body = this._joint('body', this.root, 0, 0, 0); // for whole-body rotations (rolls)
    const hips = this._joint('hips', body, 0, 0.98, 0);
    // pelvis + belt
    this._mesh(rbox(0.38, 0.2, 0.24, 0.06), M.suit, hips, 0, 0, 0);
    this._mesh(rbox(0.42, 0.07, 0.28, 0.03), M.rubber, hips, 0, 0.07, 0);
    this._mesh(rbox(0.1, 0.07, 0.03, 0.01), M.glow, hips, 0, 0.07, 0.145);
    // pouches
    this._mesh(rbox(0.09, 0.1, 0.07, 0.02), M.armor, hips, 0.2, 0.02, 0.06);
    this._mesh(rbox(0.09, 0.1, 0.07, 0.02), M.armor, hips, -0.2, 0.02, 0.06);

    const spine = this._joint('spine', hips, 0, 0.1, 0);
    this._mesh(rbox(0.36, 0.2, 0.22, 0.07), M.suit, spine, 0, 0.1, 0);
    const chest = this._joint('chest', spine, 0, 0.2, 0);
    this._mesh(rbox(0.5, 0.36, 0.3, 0.1), M.suit, chest, 0, 0.14, 0);
    // chest armor plate
    const plate = this._mesh(rbox(0.42, 0.26, 0.08, 0.04), M.armor, chest, 0, 0.17, 0.13);
    plate.rotation.x = -0.08;
    this._mesh(rbox(0.16, 0.04, 0.02, 0.01), M.glow, chest, 0, 0.22, 0.175);
    // back plate + number
    this._mesh(rbox(0.38, 0.3, 0.06, 0.03), M.armor, chest, 0, 0.16, -0.15);
    const num = this._mesh(new THREE.PlaneGeometry(0.26, 0.26), M.number, chest, 0, 0.17, -0.185);
    num.rotation.y = Math.PI;
    // grapple reel backpack
    const pack = this._mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 16), M.metal, chest, 0, 0.1, -0.24);
    pack.rotation.z = Math.PI / 2;
    this._mesh(new THREE.TorusGeometry(0.09, 0.015, 8, 20), M.glow, chest, 0.0, 0.1, -0.24).rotation.y = Math.PI / 2;
    this._mesh(rbox(0.06, 0.24, 0.06, 0.02), M.rubber, chest, 0.14, 0.12, -0.22);
    this._mesh(rbox(0.06, 0.24, 0.06, 0.02), M.rubber, chest, -0.14, 0.12, -0.22);
    // collar
    this._mesh(new THREE.TorusGeometry(0.11, 0.035, 8, 16), M.armor, chest, 0, 0.32, 0).rotation.x = Math.PI / 2;

    const neck = this._joint('neck', chest, 0, 0.34, 0);
    this._mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 10), M.skin, neck, 0, 0.03, 0);
    const head = this._joint('head', neck, 0, 0.08, 0);
    this.helmetGroup = new THREE.Group();
    head.add(this.helmetGroup);

    // shoulders + arms
    // NB: the model faces +Z, so its anatomical right side is -X (screen-right in an over-shoulder view)
    for (const side of [1, -1]) {
      const s = side === 1 ? 'L' : 'R';
      const sh = this._joint('shoulder' + s, chest, 0.3 * side, 0.24, 0);
      sh.position.x = 0.3 * side;
      const pad = this._mesh(new THREE.SphereGeometry(0.12, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.armor, sh, 0.02 * side, 0.02, 0);
      pad.rotation.z = -0.4 * side;
      pad.scale.set(1.05, 0.9, 1.05);
      this._mesh(cap(0.07, 0.2), M.suit, sh, 0, -0.15, 0);
      const el = this._joint('elbow' + s, sh, 0, -0.3, 0);
      this._mesh(new THREE.SphereGeometry(0.065, 10, 8), M.armor, el, 0, 0, -0.01);
      this._mesh(cap(0.062, 0.16), M.suit, el, 0, -0.13, 0);
      this._mesh(rbox(0.14, 0.14, 0.14, 0.04), M.armor, el, 0, -0.16, 0); // bracer
      this._mesh(rbox(0.03, 0.08, 0.02, 0.01), M.glow, el, 0.072 * side, -0.16, 0);
      const hand = this._joint('hand' + s, el, 0, -0.29, 0);
      this._mesh(rbox(0.11, 0.12, 0.13, 0.04), M.rubber, hand, 0, -0.03, 0.01);
      this._mesh(rbox(0.04, 0.07, 0.05, 0.015), M.rubber, hand, -0.06 * side, -0.02, 0.05); // thumb
    }
    // legs
    for (const side of [1, -1]) {
      const s = side === 1 ? 'L' : 'R';
      const hp = this._joint('hip' + s, hips, 0.12 * side, -0.06, 0);
      this._mesh(cap(0.095, 0.26), M.suit, hp, 0, -0.2, 0);
      this._mesh(rbox(0.16, 0.18, 0.1, 0.04), M.armor, hp, 0.02 * side, -0.16, 0.06); // thigh plate
      const kn = this._joint('knee' + s, hp, 0, -0.42, 0);
      this._mesh(rbox(0.15, 0.13, 0.12, 0.05), M.armor, kn, 0, 0, 0.05); // knee pad
      this._mesh(cap(0.08, 0.24), M.suit, kn, 0, -0.2, 0);
      this._mesh(rbox(0.17, 0.2, 0.17, 0.05), M.armor, kn, 0, -0.29, 0.0); // shin guard / boot top
      const ft = this._joint('foot' + s, kn, 0, -0.42, 0);
      this._mesh(rbox(0.17, 0.12, 0.3, 0.05), M.rubber, ft, 0, -0.03, 0.06);
      this._mesh(rbox(0.18, 0.04, 0.32, 0.02), M.armor, ft, 0, -0.085, 0.06); // sole
      this._mesh(rbox(0.12, 0.03, 0.04, 0.01), M.glow, ft, 0, -0.07, 0.22);
    }
    // weapon sockets
    this.socketR = new THREE.Group();
    this.socketR.position.set(0, -0.06, 0.04);
    this.j.handR.add(this.socketR);
    this.socketL = new THREE.Group();
    this.socketL.position.set(0, -0.06, 0.04);
    this.j.handL.add(this.socketL);
    // grapple emitter
    this.grappleOrigin = new THREE.Object3D();
    this.grappleOrigin.position.set(0, -0.16, 0.08);
    this.j.elbowL.add(this.grappleOrigin);
  }
  buildHelmet(style) {
    const g = this.helmetGroup;
    while (g.children.length) g.remove(g.children[0]);
    const M = this.mats;
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 18), M.armor);
    shell.scale.set(1, 1.08, 1.1);
    shell.position.y = 0.11;
    g.add(shell);
    if (style !== 3) {
      const visor = new THREE.Mesh(new THREE.SphereGeometry(0.172, 24, 12, -1.1, 2.2, 1.15, 0.62), M.visor);
      visor.scale.set(1.04, 1.1, 1.14);
      visor.position.y = 0.11;
      visor.rotation.y = 0;
      g.add(visor);
    } else {
      // visorless: two glowing eye slits
      for (const s of [-1, 1]) { const e = new THREE.Mesh(rbox(0.07, 0.025, 0.02, 0.008), M.visor); e.position.set(0.055 * s, 0.12, 0.175); g.add(e); }
    }
    // ear pods
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 16), M.suit);
      ear.rotation.z = Math.PI / 2; ear.position.set(0.17 * s, 0.1, 0);
      g.add(ear);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.008, 6, 16), M.glow);
      ring.rotation.y = Math.PI / 2; ring.position.set(0.197 * s, 0.1, 0);
      g.add(ring);
    }
    // chin guard
    const chin = new THREE.Mesh(rbox(0.2, 0.08, 0.1, 0.03), M.armor);
    chin.position.set(0, -0.0, 0.1);
    g.add(chin);
    if (style === 1) {
      const crest = new THREE.Mesh(rbox(0.04, 0.12, 0.3, 0.02), M.suit);
      crest.position.set(0, 0.29, -0.02);
      g.add(crest);
    } else if (style === 2) {
      for (const s of [-1, 1]) {
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.26, 6), M.metal);
        ant.position.set(0.09 * s, 0.34, -0.03); ant.rotation.z = -0.35 * s;
        g.add(ant);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), M.glow);
        tip.position.set(0.135 * s, 0.46, -0.03);
        g.add(tip);
      }
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }
  applyLook(look) {
    this.look = { ...this.look, ...look };
    const L = this.look;
    this.mats.suit.color.set(LOOKS.suit[L.suit % LOOKS.suit.length]);
    this.mats.armor.color.set(LOOKS.armor[L.armor % LOOKS.armor.length]);
    const v = LOOKS.visor[L.visor % LOOKS.visor.length];
    this.mats.visor.emissive.set(v);
    this.mats.glow.emissive.set(v);
    this.buildHelmet(L.helmet % LOOKS.helmet.length);
  }
  setOpacity(o) {
    const vis = o > 0.05;
    this.root.visible = vis;
  }

  // ---------------------------------------------------------------
  // Procedural animation. s = state snapshot from the controller.
  // ---------------------------------------------------------------
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
      // grounded locomotion
      const amp = 0.95 * run;
      const sw = Math.sin(ph) * dir;
      const sw2 = Math.sin(ph + Math.PI) * dir;
      T.hipRX = -sw * amp;
      T.hipLX = -sw2 * amp;
      T.kneeR = (Math.max(0, Math.sin(ph - 1.2)) * 1.6 + 0.1) * run;
      T.kneeL = (Math.max(0, Math.sin(ph + Math.PI - 1.2)) * 1.6 + 0.1) * run;
      T.footR = -0.25 * run * Math.cos(ph);
      T.footL = -0.25 * run * Math.cos(ph + Math.PI);
      T.hipsY = 0.98 - Math.abs(Math.cos(ph)) * 0.07 * run - (s.crouch ? 0.25 : 0);
      T.hipsRY = Math.sin(ph) * 0.12 * run;
      T.chestRY = -Math.sin(ph) * 0.18 * run;
      T.spineRX = 0.18 * run + (s.sprint ? 0.15 : 0);
      T.shRX = sw * 0.9 * run; T.shLX = -sw * 0.9 * run;
      T.elR = -0.3 - 0.9 * run; T.elL = -0.3 - 0.9 * run;
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
    T.headRY = clamp(s.headYaw || 0, -0.7, 0.7);

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
