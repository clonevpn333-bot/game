// Procedural animation for the stylized rig: locomotion, traversal, combat,
// conversation gestures, ambient activities, facial expression and look-at.
import * as THREE from 'three';
import { BONES, B } from './rig.js';
import { clamp, damp, lerp, noise2, smoothstep } from '../core/util.js';

const NB = BONES.length;
const UPPER = new Set(['spine', 'chest', 'neck', 'head', 'shoulderL', 'armL', 'foreL', 'handL', 'shoulderR', 'armR', 'foreR', 'handR'].map(n => B[n]));
const ARM_L = new Set(['shoulderL', 'armL', 'foreL', 'handL'].map(n => B[n]));
const ARM_R = new Set(['shoulderR', 'armR', 'foreR', 'handR'].map(n => B[n]));
const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _m = new THREE.Matrix4();

// Emotion presets for brows/eyes/mouth/posture
const EMO = {
  neutral: { brow: 0, tilt: 0, eye: 1, smile: 0, head: 0 },
  happy: { brow: 0.4, tilt: 0.05, eye: 0.92, smile: 1, head: -0.05 },
  amused: { brow: 0.25, tilt: -0.1, eye: 0.85, smile: 0.7, head: 0.0 },
  sad: { brow: 0.2, tilt: 0.45, eye: 0.82, smile: -0.5, head: 0.18 },
  angry: { brow: -0.6, tilt: -0.5, eye: 0.9, smile: -0.4, head: -0.06 },
  worried: { brow: 0.45, tilt: 0.4, eye: 1.05, smile: -0.3, head: 0.06 },
  surprised: { brow: 0.9, tilt: 0.1, eye: 1.25, smile: 0, head: -0.08 },
  tired: { brow: -0.1, tilt: 0.25, eye: 0.7, smile: -0.1, head: 0.12 },
  focused: { brow: -0.3, tilt: -0.2, eye: 0.95, smile: 0, head: 0.04 },
  shy: { brow: 0.3, tilt: 0.3, eye: 0.85, smile: 0.35, head: 0.15 },
};

export class Animator {
  constructor(char) {
    this.c = char; this.b = char.boneList;
    this.P = new Float32Array(NB * 3);     // target pose
    this.S = new Float32Array(NB * 3);     // smoothed pose
    this.A = new Float32Array(NB * 3);     // additive (post-smooth)
    this.hip = new THREE.Vector3(); this.hipS = new THREE.Vector3();
    this.rootOff = new THREE.Vector3(); this.rootOffS = new THREE.Vector3();
    this.rootRot = new THREE.Vector3(); this.rootRotS = new THREE.Vector3();
    this.t = Math.random() * 100; this.phase = 0;
    this.seed = Math.random() * 1000;
    // driving state (set by controller / NPC brain)
    this.speed = 0; this.moveAngle = 0; this.grounded = true; this.vy = 0; this.crouch = 0; this.sprint = false;
    this.mode = 'loco'; this.modeT = 0; this.modeParam = 0;
    this.activity = null;
    this.aim = 0; this.aimPitch = 0; this.weapon = null; this.recoil = 0; this.reload = 0;
    this.tether = 0; this.tetherPitch = 0; this.tetherYaw = 0; this.tetherStrain = 0;
    this.talking = false; this.talkAmt = 0; this.gesture = 0.6; this.emotion = 'neutral'; this.emoS = { ...EMO.neutral };
    this.lookTarget = null; this.lookW = 0; this.lookYaw = 0; this.lookPitch = 0;
    this.blinkT = 2 + Math.random() * 3; this.blink = 0;
    this.mouth = 0; this.landT = 0; this.hitT = 0; this.hitDir = 0; this.meleeT = 0;
    this.wave = 0; this.point = 0; this.carry = 0; this.armsCrossed = 0; this.handsHips = 0; this.leanRail = 0;
    this.climbPhase = 0; this.shimmy = 0; this.hangSwing = 0;
    this.lambda = 14;
    this.tailS = new THREE.Vector2();
    this.kid = !!char.look.kid;
    this.upperOverride = 0;
    this.lean = 0; this.leanS = 0; this.accelLean = 0; this.idleT = 0; this.fidget = null; this.fidgetT = 0; this.nextFidget = 6 + Math.random() * 5;
  }
  setMode(m, param = 0) { if (this.mode !== m) { this.mode = m; this.modeT = 0; } this.modeParam = param; }
  setEmotion(e) { this.emotion = EMO[e] ? e : 'neutral'; }
  land(intensity = 1) { this.landT = Math.min(1, intensity); }
  hit(dir = 0) { this.hitT = 1; this.hitDir = dir; }

  // ------------------------------------------------------------- pose helpers
  set(b, x, y, z) { const i = b * 3; this.P[i] = x; this.P[i + 1] = y; this.P[i + 2] = z; }
  add(b, x, y, z) { const i = b * 3; this.P[i] += x; this.P[i + 1] += y; this.P[i + 2] += z; }
  mix(b, x, y, z, w) { const i = b * 3; this.P[i] = lerp(this.P[i], x, w); this.P[i + 1] = lerp(this.P[i + 1], y, w); this.P[i + 2] = lerp(this.P[i + 2], z, w); }

  update(dt) {
    this.t += dt; this.modeT += dt;
    const P = this.P; P.fill(0); this.hip.set(0, 0, 0); this.rootOff.set(0, 0, 0); this.rootRot.set(0, 0, 0);
    const t = this.t;
    let lambda = this.lambda;

    // ---------- full-body base
    switch (this.mode) {
      case 'loco': this.loco(dt); break;
      case 'hang': this.hang(dt); break;
      case 'wallclimb': case 'ladder': this.wallclimb(dt); break;
      case 'mantle': this.mantle(); lambda = 22; break;
      case 'swing': this.swingPose(); break;
      case 'sit': this.sit(); break;
      case 'sitGround': this.sitGround(); break;
      case 'lie': this.lie(); break;
      case 'tinker': this.tinker(); break;
      case 'kneel': this.kneel(); break;
      case 'cower': this.cower(); break;
      case 'brace': this.brace(); break;
      case 'freeze': this.freezePose(); lambda = 60; break;
      case 'activity': this.loco(dt, true); this.doActivity(this.activity); break;
      default: this.loco(dt);
    }
    // ---------- upper-body layers
    if (this.mode === 'loco' || this.mode === 'activity' || this.mode === 'sit') {
      if (this.armsCrossed > 0.01) this.layerArmsCrossed(this.armsCrossed);
      if (this.handsHips > 0.01) this.layerHandsHips(this.handsHips);
      if (this.carry > 0.01) this.layerCarry(this.carry);
      if (this.talkAmt > 0.01 && this.aim < 0.1) this.layerTalk(this.talkAmt);
      if (this.wave > 0.01) this.layerWave(this.wave);
      if (this.point > 0.01) this.layerPoint(this.point);
    }
    if (this.aim > 0.01 && this.weapon) this.layerAim(this.aim);
    if (this.tether > 0.01) this.layerTether(this.tether);
    if (this.mode !== 'lie' && this.mode !== 'freeze') this.layerBreath();

    // ---------- banking into turns, leaning into acceleration
    this.leanS = damp(this.leanS, this.lean, 6, dt);
    if (this.mode === 'loco') { this.add(B.hips, 0, 0, this.leanS * 0.6); this.add(B.spine, this.accelLean * 0.25, 0, this.leanS * 0.5); this.add(B.head, 0, 0, -this.leanS * 0.6); }
    // ---------- idle fidgets (only when standing around in loco)
    if (this.mode === 'loco' && this.speed < 0.15 && !this.talking && this.aim < 0.1 && this.tether < 0.1 && this.fidgetsOn !== false) {
      this.idleT += dt;
      if (!this.fidget && this.idleT > this.nextFidget) { this.fidget = ['look', 'wrist', 'shift', 'neck'][Math.floor(Math.random() * 4)]; this.fidgetT = 0; this.nextFidget = this.idleT + 7 + Math.random() * 7; }
    } else { this.idleT = 0; this.fidget = null; }
    if (this.fidget) {
      this.fidgetT += dt; const f = this.fidgetT, env = Math.sin(Math.min(1, f / 2.6) * Math.PI);
      if (this.fidget === 'look') { this.add(B.head, -0.05 * env, Math.sin(f * 1.4) * 0.7 * env, 0); this.add(B.neck, 0, Math.sin(f * 1.4) * 0.25 * env, 0); }
      if (this.fidget === 'wrist') { this.mix(B.armL, -0.9, 0.3, -0.35, env); this.mix(B.foreL, -1.6, 0.5, 0, env); this.add(B.head, 0.35 * env, 0.2 * env, 0); }
      if (this.fidget === 'shift') { this.hip.x += 0.03 * env; this.add(B.hips, 0, 0, -0.06 * env); this.add(B.thighR, -0.1 * env, 0, -0.05 * env); this.add(B.shinR, 0.25 * env, 0, 0); }
      if (this.fidget === 'neck') { this.add(B.head, 0.15 * env, 0, Math.sin(f * 2.4) * 0.25 * env); this.add(B.shoulderL, 0, 0, 0.12 * env); }
      if (f > 2.6) this.fidget = null;
    }
    // ---------- emotion posture
    const em = EMO[this.emotion] || EMO.neutral; const es = this.emoS;
    for (const k of Object.keys(es)) es[k] = damp(es[k], em[k], 4, dt);
    if (this.mode !== 'lie' && this.mode !== 'freeze') { this.add(B.head, es.head, 0, 0); this.add(B.neck, es.head * 0.5, 0, 0); if (es.head > 0.1) { this.add(B.shoulderL, 0, 0, -es.head * 0.4); this.add(B.shoulderR, 0, 0, es.head * 0.4); } }

    // ---------- look-at (head/neck/eyes)
    this.lookW = damp(this.lookW, this.lookTarget && this.mode !== 'lie' && this.mode !== 'freeze' ? 1 : 0, 5, dt);
    if (this.lookTarget) {
      const g = this.c.group; g.updateMatrixWorld();
      _m.copy(g.matrixWorld).invert();
      _v.copy(this.lookTarget).applyMatrix4(_m); // local space of character
      const headY = 1.6;
      const dx = _v.x, dy = _v.y - headY, dz = _v.z;
      let yaw = Math.atan2(dx, dz), pitch = -Math.atan2(dy, Math.hypot(dx, dz));
      if (Math.abs(yaw) > 2.0) yaw = 0; // behind: ignore
      yaw = clamp(yaw, -1.2, 1.2); pitch = clamp(pitch, -0.6, 0.7);
      this.lookYaw = damp(this.lookYaw, yaw, 6, dt); this.lookPitch = damp(this.lookPitch, pitch, 6, dt);
    } else { this.lookYaw = damp(this.lookYaw, 0, 4, dt); this.lookPitch = damp(this.lookPitch, 0, 4, dt); }
    const lw = this.lookW * (1 - this.aim);
    this.add(B.head, this.lookPitch * 0.55 * lw, this.lookYaw * 0.55 * lw, 0);
    this.add(B.neck, this.lookPitch * 0.3 * lw, this.lookYaw * 0.3 * lw, 0);
    this.add(B.chest, 0, this.lookYaw * 0.15 * lw, 0);
    // saccades: small, quick eye darts
    this.sacT = (this.sacT ?? 1) - dt;
    if (this.sacT < 0) { this.sacT = 0.6 + Math.random() * 2.2; this.sac = [(Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.2]; }
    const sc = this.sac || [0, 0];
    this.add(B.eyeL, this.lookPitch * 0.3 * lw + sc[0], this.lookYaw * 0.35 * lw + sc[1], 0); this.add(B.eyeR, this.lookPitch * 0.3 * lw + sc[0], this.lookYaw * 0.35 * lw + sc[1], 0);

    // ---------- hands: finger curl (grip, support, open, relaxed) and toe roll
    {
      let cr = 0.35 + Math.sin(t * 0.7 + this.seed) * 0.05, cl = cr;
      if (this.talkAmt > 0.2) { cr = 0.2 + Math.max(0, noise2(t * 0.8, this.seed + 5)) * 0.5; cl = 0.25 + Math.max(0, noise2(t * 0.7, this.seed + 6)) * 0.4; }
      if (this.weapon && this.aim > 0.3) { cr = 1.25; cl = this.weapon === 'carbine' ? 1.0 : 0.95; }
      if (this.mode === 'hang' || this.mode === 'wallclimb' || this.mode === 'ladder' || this.mode === 'mantle') { cr = cl = 1.35; }
      if (this.carry > 0.3 || this.armsCrossed > 0.5) { cr = cl = 0.9; }
      if (this.tether > 0.3) cl = this.tetherStrain > 0.1 ? 0.15 + Math.sin(t * 30) * 0.05 : 0.05;
      if (this.meleeT > 0) cr = 1.6;
      if (this.activity === 'busk') { cr = 0.6; cl = 1.1; }
      if (this.mode === 'freeze') { cr = this.S[B.fingersR * 3]; cl = this.S[B.fingersL * 3]; }
      this.set(B.fingersR, -cr, 0, 0); this.set(B.fingersL, -cl, 0, 0);
    }
    // ---------- smoothing
    const k = 1 - Math.exp(-lambda * dt);
    for (let i = 0; i < NB * 3; i++) this.S[i] += (P[i] - this.S[i]) * k;
    this.hipS.lerp(this.hip, k); this.rootOffS.lerp(this.rootOff, 1 - Math.exp(-8 * dt)); this.rootRotS.lerp(this.rootRot, 1 - Math.exp(-6 * dt));

    // ---------- additives (unsmoothed, crisp)
    this.A.fill(0);
    if (this.recoil > 0) {
      const r = this.recoil;
      const ai = B.armR * 3, al = B.armL * 3;
      this.A[ai] -= r * 0.25; this.A[al] -= r * 0.2; this.A[B.chest * 3] -= r * 0.06; this.A[B.head * 3] -= r * 0.03;
      this.A[B.foreR * 3] -= r * 0.15;
      this.recoil = Math.max(0, this.recoil - dt * 9);
    }
    if (this.meleeT > 0) {
      const k = Math.sin((1 - this.meleeT) * Math.PI);
      this.A[B.armR * 3] -= 1.5 * k; this.A[B.armR * 3 + 2] += 0.35 * k; this.A[B.foreR * 3] += 0.9 * k - 0.4;
      this.A[B.chest * 3 + 1] -= 0.6 * k; this.A[B.spine * 3 + 1] -= 0.3 * k; this.A[B.spine * 3] += 0.15 * k;
      this.meleeT = Math.max(0, this.meleeT - dt * 3.2);
    }
    if (this.hitT > 0) {
      const h = Math.sin(this.hitT * Math.PI) * this.hitT;
      this.A[B.spine * 3] -= h * 0.25; this.A[B.chest * 3 + 1] += h * 0.3 * this.hitDir; this.A[B.head * 3] -= h * 0.3;
      this.hitT = Math.max(0, this.hitT - dt * 3.5);
    }
    // ---------- face
    this.blinkT -= dt;
    if (this.blinkT < 0) { this.blink = 1; this.blinkT = 1.8 + Math.random() * 4; if (Math.random() < 0.15) this.blinkT = 0.25; }
    this.blink = Math.max(0, this.blink - dt * 7);
    const blinkS = this.blink > 0 ? Math.max(0.08, 1 - Math.sin(this.blink * Math.PI)) : 1;
    this.talkAmt = damp(this.talkAmt, this.talking ? 1 : 0, 6, dt);
    const speakOpen = this.talking ? clamp(0.5 + 0.5 * Math.sin(t * 17 + Math.sin(t * 5.3) * 2) * (0.6 + 0.4 * noise2(t * 3, this.seed)), 0, 1) * (noise2(t * 1.3, this.seed + 3) > -0.35 ? 1 : 0.1) : 0;
    this.mouth = damp(this.mouth, speakOpen, 20, dt);

    // ---------- apply to bones
    const bl = this.b;
    for (let i = 0; i < NB; i++) {
      const j = i * 3;
      _e.set(this.S[j] + this.A[j], this.S[j + 1] + this.A[j + 1], this.S[j + 2] + this.A[j + 2], 'XYZ');
      bl[i].quaternion.setFromEuler(_e);
    }
    const rest = this.c.rest;
    bl[B.hips].position.set(rest.hips.x + this.hipS.x, rest.hips.y + this.hipS.y, rest.hips.z + this.hipS.z);
    bl[B.root].position.copy(this.rootOffS);
    _e.set(this.rootRotS.x, this.rootRotS.y, this.rootRotS.z, 'YXZ'); bl[B.root].quaternion.setFromEuler(_e);
    // face: lids (blink, tiredness, surprise), brows, jaw, mouth corners
    const lidBase = (1 - (this.c.look.lid ?? 1)) * 2.2 + (1 - es.eye) * 1.4;
    const lidRot = clamp(lidBase + (1 - blinkS) * 1.45, -0.35, 1.45);
    bl[B.lidL].rotation.x = lidRot; bl[B.lidR].rotation.x = lidRot;
    const lowLod = this.c.lod === 'low';
    const eyeS = lowLod ? es.eye * blinkS : 1;
    bl[B.eyeL].scale.set(1, eyeS, 1); bl[B.eyeR].scale.set(1, eyeS, 1);
    bl[B.browL].position.set(rest.browL.x - rest.head.x, rest.browL.y - rest.head.y + es.brow * 0.008 + this.mouth * 0.002, rest.browL.z - rest.head.z);
    bl[B.browR].position.set(rest.browR.x - rest.head.x, rest.browR.y - rest.head.y + es.brow * 0.008 + this.mouth * 0.002, rest.browR.z - rest.head.z);
    bl[B.browL].rotation.z = es.tilt * 0.4; bl[B.browR].rotation.z = -es.tilt * 0.4;
    bl[B.jaw].scale.set(1, 1, 1);
    bl[B.jaw].rotation.x = this.mouth * 0.34 + (es.smile < 0 ? 0.02 : 0);
    bl[B.jaw].position.set(0, rest.jaw.y - rest.head.y - this.mouth * 0.002, rest.jaw.z - rest.head.z);
    const sm = es.smile;
    for (const [bn, sx] of [[B.cornerL, 1], [B.cornerR, -1]]) {
      const rp = sx > 0 ? rest.cornerL : rest.cornerR;
      bl[bn].position.set(rp.x - rest.head.x + sx * (sm * 0.003 - this.mouth * 0.002), rp.y - rest.head.y + sm * 0.004 - this.mouth * 0.002, rp.z - rest.head.z - Math.max(0, sm) * 0.002);
    }
    // hair tail sway
    const sway = Math.sin(t * 3.1) * 0.08 * (0.3 + Math.min(1, this.speed / 3));
    this.tailS.x = damp(this.tailS.x, -this.vy * 0.04 + this.speed * 0.08 + sway, 6, dt);
    bl[B.hair1].rotation.set(0.25 + this.tailS.x, 0, sway * 0.5); bl[B.hair2].rotation.set(0.15 + this.tailS.x * 0.6, 0, sway);
  }

  // ------------------------------------------------------------- foot IK
  // groundAt(x, y, z) -> ground height under a world point, or null. Plants feet on steps
  // and slopes: drops the pelvis for the lower foot, then two-bone IK per leg.
  footIK(groundAt, weight = 1) {
    if (weight <= 0.01 || !(this.mode === 'loco' || this.mode === 'activity') || !this.grounded) { this.ikHip = damp(this.ikHip || 0, 0, 10, 1 / 60); return; }
    const g = this.c.group, bl = this.b; g.updateMatrixWorld(true);
    const s = g.scale.y, baseY = g.position.y;
    const legs = [['thighL', 'shinL', 'footL'], ['thighR', 'shinR', 'footR']].map(n => n.map(k => bl[B[k]]));
    const offs = legs.map(([th, sh, ft]) => {
      const a = ft.getWorldPosition(new THREE.Vector3());
      const gy = groundAt(a.x, a.y + 0.45 * s, a.z);
      if (gy === null || gy === undefined) return 0;
      const lift = Math.max(0, a.y - baseY - 0.075 * s);
      return clamp(gy + 0.075 * s + lift - a.y, -0.45 * s, 0.45 * s);
    });
    const drop = Math.min(0, Math.min(offs[0], offs[1]));
    this.ikHip = damp(this.ikHip || 0, drop, 14, 1 / 60);
    bl[B.hips].position.y += this.ikHip / s;
    g.updateMatrixWorld(true);
    legs.forEach(([th, sh, ft], i) => {
      const need = (offs[i] - this.ikHip) * weight;
      if (Math.abs(need) < 0.004) return;
      const a = th.getWorldPosition(new THREE.Vector3()), b = sh.getWorldPosition(new THREE.Vector3()), c = ft.getWorldPosition(new THREE.Vector3());
      const t = c.clone(); t.y += need;
      const footQ = ft.getWorldQuaternion(new THREE.Quaternion());
      twoBoneIK(th, sh, a, b, c, t);
      // keep the foot's world orientation (flat on the step)
      g.updateMatrixWorld(true);
      const pq = ft.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
      ft.quaternion.copy(pq.multiply(footQ));
    });
  }

  // ------------------------------------------------------------- base modes
  loco(dt, keepStill = false) {
    const t = this.t, sp = keepStill ? 0 : this.speed;
    const walkW = smoothstep(0.05, 1.4, sp), runW = smoothstep(2.6, 5.2, sp), sprintW = smoothstep(5.4, 7.2, sp);
    const stride = lerp(1.35, 2.5, runW) + sprintW * 0.4;
    this.phase += (sp * dt / stride) * Math.PI * 2;
    const ph = this.phase, s = Math.sin(ph), c = Math.cos(ph);
    const fwd = Math.cos(this.moveAngle), side = Math.sin(this.moveAngle);
    const dir = fwd >= -0.2 ? 1 : -1;
    const sgn = dir;
    // amplitudes
    const thA = lerp(0.42, 0.85, runW) + sprintW * 0.2;
    const knA = lerp(0.75, 1.55, runW) + sprintW * 0.25;
    const armA = lerp(0.32, 0.75, runW);
    const elb = lerp(0.18, 1.35, runW);
    const lean = lerp(0.04, 0.2, runW) + sprintW * 0.12;
    const fs = Math.abs(fwd), ss = Math.abs(side);

    // idle
    const idleW = 1 - walkW;
    const ws = noise2(t * 0.15, this.seed) * 0.6;
    if (idleW > 0) {
      this.set(B.thighL, -0.03 * idleW, 0, 0.03 + ws * 0.04); this.set(B.thighR, -0.03 * idleW, 0, -0.03 + ws * 0.04);
      this.set(B.shinL, 0.07 * idleW, 0, 0); this.set(B.shinR, 0.07 * idleW, 0, 0);
      this.hip.x += ws * 0.012 * idleW; this.set(B.hips, 0, 0, -ws * 0.03 * idleW);
      this.set(B.armL, 0.05, 0, 0.09); this.set(B.armR, 0.05, 0, -0.09);
      this.set(B.foreL, -0.18, 0, 0); this.set(B.foreR, -0.18, 0, 0);
      this.set(B.handL, 0, 0.1, 0.05); this.set(B.handR, 0, -0.1, -0.05);
    }
    if (walkW > 0) {
      const w = walkW;
      const swingL = -s * thA * sgn, swingR = s * thA * sgn;
      this.mix(B.thighL, swingL * fs, 0.0, 0.04 + s * side * 0.35, w); this.mix(B.thighR, swingR * fs, 0.0, -0.04 - s * side * 0.35, w);
      const kL = Math.max(0, c * sgn) ** 1.2 * knA + 0.1, kR = Math.max(0, -c * sgn) ** 1.2 * knA + 0.1;
      this.mix(B.shinL, kL, 0, 0, w); this.mix(B.shinR, kR, 0, 0, w);
      this.mix(B.footL, -swingL * 0.4 - kL * 0.3 + Math.max(0, -s * sgn) * 0.4, 0, 0, w); this.mix(B.footR, -swingR * 0.4 - kR * 0.3 + Math.max(0, s * sgn) * 0.4, 0, 0, w);
      // toe-off: the toes bend as the heel lifts behind the body
      this.mix(B.toeL, -Math.max(0, s * sgn) * 0.7 * (0.5 + runW * 0.5), 0, 0, w); this.mix(B.toeR, -Math.max(0, -s * sgn) * 0.7 * (0.5 + runW * 0.5), 0, 0, w);
      this.mix(B.armL, s * armA * sgn * fs, 0, 0.1 + runW * 0.08, w); this.mix(B.armR, -s * armA * sgn * fs, 0, -0.1 - runW * 0.08, w);
      this.mix(B.foreL, -elb - Math.max(0, -s) * 0.2 * runW, 0, 0, w); this.mix(B.foreR, -elb - Math.max(0, s) * 0.2 * runW, 0, 0, w);
      this.mix(B.hips, 0, s * 0.12 * fs, s * 0.035, w);
      this.mix(B.spine, lean * dir * fs, -s * 0.08, 0, w);
      this.mix(B.chest, lean * 0.4, -s * 0.12 * fs, -s * 0.02, w);
      this.mix(B.head, -lean * 0.6, s * 0.12 * fs, 0, w); // counter the chest twist: the head stays on target
      this.mix(B.neck, 0, s * 0.05 * fs, 0, w);
      const bob = lerp(0.03, 0.07, runW);
      this.hip.y += (Math.abs(c) - 0.7) * bob * w - runW * 0.05;
      this.hip.x += s * 0.015 * w * (1 - runW);
    }
    // crouch
    if (this.crouch > 0.01) {
      const k = this.crouch;
      this.add(B.thighL, -0.8 * k, 0, 0.05 * k); this.add(B.thighR, -0.8 * k, 0, -0.05 * k);
      this.add(B.shinL, 1.2 * k, 0, 0); this.add(B.shinR, 1.2 * k, 0, 0);
      this.add(B.footL, -0.4 * k, 0, 0); this.add(B.footR, -0.4 * k, 0, 0);
      this.add(B.spine, 0.35 * k, 0, 0); this.add(B.head, -0.25 * k, 0, 0);
      this.hip.y -= 0.32 * k;
    }
    // airborne
    if (!this.grounded) {
      const rise = clamp(this.vy / 6, -1, 1);
      const air = 1;
      this.mix(B.thighL, -0.7 + rise * 0.1, 0, 0.1, air); this.mix(B.thighR, -0.2 - rise * 0.3, 0, -0.1, air);
      this.mix(B.shinL, 1.0, 0, 0, air); this.mix(B.shinR, 0.6 + Math.max(0, -rise) * 0.4, 0, 0, air);
      const flail = rise < -0.6 ? Math.sin(t * 9) * 0.3 : 0;
      this.mix(B.armL, -0.5 - rise * 0.4 + flail, 0, 0.6 + flail * 0.5, air); this.mix(B.armR, -0.3 - rise * 0.4 - flail, 0, -0.6 - flail * 0.5, air);
      this.mix(B.foreL, -0.6, 0, 0, air); this.mix(B.foreR, -0.6, 0, 0, air);
      this.mix(B.spine, 0.15, 0, 0, air);
    }
    // landing squash
    if (this.landT > 0) {
      const l = Math.sin(this.landT * Math.PI * 0.5) * this.landT;
      this.hip.y -= l * 0.22; this.add(B.thighL, -l * 0.6, 0, 0); this.add(B.thighR, -l * 0.6, 0, 0);
      this.add(B.shinL, l * 1.0, 0, 0); this.add(B.shinR, l * 1.0, 0, 0); this.add(B.spine, l * 0.3, 0, 0);
      this.landT = Math.max(0, this.landT - dt * 3.2);
    }
  }

  hang(dt) { // hanging from a ledge, arms overhead, legs dangling. modeParam = shimmy direction
    const t = this.t, sh = this.shimmy;
    const swing = Math.sin(t * 1.7) * 0.05 + this.hangSwing;
    const reach = Math.sin(t * 6) * Math.abs(sh);
    this.set(B.armL, -2.85 + Math.max(0, reach) * 0.2 * Math.sign(sh), 0, 0.25 + (sh > 0 ? 0.15 * Math.abs(reach) : 0));
    this.set(B.armR, -2.85 - Math.min(0, reach) * 0.2 * Math.sign(sh), 0, -0.25 - (sh < 0 ? 0.15 * Math.abs(reach) : 0));
    this.set(B.foreL, -0.35, 0, 0); this.set(B.foreR, -0.35, 0, 0);
    this.set(B.handL, -0.4, 0, 0); this.set(B.handR, -0.4, 0, 0);
    this.set(B.shoulderL, 0, 0, 0.2); this.set(B.shoulderR, 0, 0, -0.2);
    this.set(B.chest, -0.05, 0, sh * 0.06); this.set(B.spine, -0.08, 0, 0);
    this.set(B.head, -0.25, 0, 0);
    this.set(B.thighL, -0.15 + swing, 0, 0.05 + sh * 0.1 * Math.sin(t * 6)); this.set(B.thighR, -0.05 - swing, 0, -0.05 + sh * 0.1 * Math.cos(t * 6));
    this.set(B.shinL, 0.35, 0, 0); this.set(B.shinR, 0.2, 0, 0);
    this.set(B.footL, 0.4, 0, 0); this.set(B.footR, 0.4, 0, 0);
    this.hip.y -= 0.0;
  }
  wallclimb(dt) {
    const p = this.climbPhase, s = Math.sin(p), c = Math.cos(p);
    this.set(B.armL, -2.4 - s * 0.45, 0, 0.3); this.set(B.armR, -2.4 + s * 0.45, 0, -0.3);
    this.set(B.foreL, -0.7 + s * 0.4, 0, 0); this.set(B.foreR, -0.7 - s * 0.4, 0, 0);
    this.set(B.thighL, -0.9 + s * 0.45, 0, 0.18); this.set(B.thighR, -0.9 - s * 0.45, 0, -0.18);
    this.set(B.shinL, 1.3 - s * 0.4, 0, 0); this.set(B.shinR, 1.3 + s * 0.4, 0, 0);
    this.set(B.footL, -0.2, 0, 0); this.set(B.footR, -0.2, 0, 0);
    this.set(B.spine, -0.05, s * 0.05, 0); this.set(B.chest, 0, 0, c * 0.04);
    this.set(B.head, -0.35, 0, 0);
    this.hip.z -= 0.05;
  }
  mantle() { // modeT 0..0.45
    const k = clamp(this.modeT / 0.45, 0, 1);
    const push = smoothstep(0.2, 0.8, k);
    this.set(B.armL, lerp(-2.6, -0.2, push), 0, 0.3); this.set(B.armR, lerp(-2.6, -0.2, push), 0, -0.3);
    this.set(B.foreL, lerp(-0.5, -0.9, push), 0, 0); this.set(B.foreR, lerp(-0.5, -0.9, push), 0, 0);
    this.set(B.spine, lerp(0.1, 0.55, push), 0, 0);
    this.set(B.thighL, lerp(-0.4, -1.4, push), 0, 0.1); this.set(B.thighR, lerp(-0.2, -0.5, k), 0, -0.1);
    this.set(B.shinL, lerp(0.8, 1.8, push), 0, 0); this.set(B.shinR, 0.9, 0, 0);
    this.set(B.head, -0.3 + push * 0.2, 0, 0);
    this.hip.y -= push * 0.15;
  }
  swingPose() {
    const t = this.t, p = this.tetherPitch;
    this.set(B.armL, -2.6 - p * 0.5, 0, 0.15); this.set(B.foreL, -0.1, 0, 0);
    this.set(B.armR, -0.4, 0, -0.8); this.set(B.foreR, -0.8, 0, 0);
    this.set(B.thighL, -0.7, 0, 0.1); this.set(B.thighR, -0.25, 0, -0.1); this.set(B.shinL, 1.1, 0, 0); this.set(B.shinR, 0.5, 0, 0);
    this.set(B.spine, -0.1, 0, Math.sin(t * 2) * 0.05); this.set(B.head, -0.2, 0, 0);
  }
  sit() {
    const t = this.t;
    this.set(B.thighL, -1.5, 0, 0.08); this.set(B.thighR, -1.5, 0, -0.08);
    this.set(B.shinL, 1.45, 0, 0); this.set(B.shinR, 1.5, 0, 0); this.set(B.footL, 0.0, 0, 0); this.set(B.footR, 0.0, 0, 0);
    this.set(B.spine, 0.08, 0, 0); this.set(B.chest, 0.06 + Math.sin(t * 0.9) * 0.01, 0, 0);
    this.set(B.armL, -0.55, 0, 0.12); this.set(B.armR, -0.55, 0, -0.12);
    this.set(B.foreL, -0.9, 0, 0); this.set(B.foreR, -0.9, 0, 0);
    this.set(B.handL, 0, 0, 0.3); this.set(B.handR, 0, 0, -0.3);
    this.hip.y -= 0.44; this.hip.z -= 0.05;
  }
  sitGround() { // sitting on an edge with legs hanging (modeParam=1) or cross-legged (0)
    const dangle = this.modeParam > 0.5;
    if (dangle) {
      const t = this.t;
      this.set(B.thighL, -1.45, 0, 0.12); this.set(B.thighR, -1.45, 0, -0.12);
      this.set(B.shinL, 1.2 + Math.sin(t * 1.3) * 0.15, 0, 0); this.set(B.shinR, 1.1 + Math.sin(t * 1.3 + 2) * 0.15, 0, 0);
      this.set(B.armL, -0.1, 0, 0.35); this.set(B.armR, -0.1, 0, -0.35); this.set(B.foreL, -0.3, 0, 0); this.set(B.foreR, -0.3, 0, 0);
      this.set(B.handL, 0.6, 0, 0); this.set(B.handR, 0.6, 0, 0);
      this.set(B.spine, 0.15, 0, 0);
      this.hip.y -= 0.86; this.hip.z -= 0.0;
    } else {
      this.set(B.thighL, -1.3, 0.6, 0.9); this.set(B.thighR, -1.3, -0.6, -0.9);
      this.set(B.shinL, 2.2, 0, 0); this.set(B.shinR, 2.2, 0, 0);
      this.set(B.armL, -0.5, 0, 0.2); this.set(B.armR, -0.5, 0, -0.2); this.set(B.foreL, -0.8, 0, 0); this.set(B.foreR, -0.8, 0, 0);
      this.set(B.spine, 0.2, 0, 0); this.hip.y -= 0.8;
    }
  }
  lie() { // on back, head toward -z of local. modeParam: 0 sleeping, 1 stirring
    const t = this.t, stir = this.modeParam;
    this.rootRot.set(-Math.PI / 2, 0, 0);
    this.rootOff.set(0, 0.25, 0.9);
    this.set(B.armL, -0.1, 0, 0.25 + Math.sin(t * 0.8) * 0.03 * stir); this.set(B.armR, -0.6 - stir * Math.max(0, Math.sin(t * 1.2)) * 0.8, 0, -0.5);
    this.set(B.foreL, -0.3, 0, 0); this.set(B.foreR, -1.8, 0, 0);
    this.set(B.thighL, -0.05, 0, 0.06); this.set(B.thighR, -0.25, 0, -0.05); this.set(B.shinR, 0.4, 0, 0);
    this.set(B.head, 0.1, 0.3 + Math.sin(t * 0.4) * 0.1 * stir, 0);
    this.set(B.chest, Math.sin(t * 1.1) * 0.02, 0, 0);
    this.emoS.eye = lerp(0.1, 0.9, stir);
  }
  tinker() { // lying on a creeper under a vehicle, working overhead
    const t = this.t;
    this.rootRot.set(-Math.PI / 2, 0, 0); this.rootOff.set(0, 0.22, 0.9);
    const w = Math.sin(t * 5) * 0.12, w2 = Math.sin(t * 3.3 + 1) * 0.1;
    this.set(B.armL, -2.6 + w, 0, 0.3); this.set(B.foreL, -0.9 - w2, 0, 0);
    this.set(B.armR, -2.4 - w2, 0, -0.35); this.set(B.foreR, -1.1 + w, 0, 0);
    this.set(B.thighL, -0.9, 0, 0.25); this.set(B.thighR, -0.3, 0, -0.1); this.set(B.shinL, 1.6, 0, 0); this.set(B.shinR, 0.4, 0, 0);
    this.set(B.head, -0.2, 0.1, 0);
  }
  kneel() {
    this.set(B.thighL, -1.4, 0, 0.1); this.set(B.shinL, 1.45, 0, 0);
    this.set(B.thighR, 0.1, 0, -0.1); this.set(B.shinR, 1.7, 0, 0); this.set(B.footR, 0.6, 0, 0);
    this.set(B.spine, 0.3, 0, 0); this.set(B.head, 0.1, 0, 0);
    this.set(B.armL, -0.6, 0, 0.1); this.set(B.armR, -0.7, 0, -0.1); this.set(B.foreL, -0.8, 0, 0); this.set(B.foreR, -0.9, 0, 0);
    this.hip.y -= 0.42;
  }
  cower() {
    const t = this.t, sh = Math.sin(t * 20) * 0.02;
    this.set(B.thighL, -1.6, 0, 0.2); this.set(B.thighR, -1.6, 0, -0.2); this.set(B.shinL, 2.2, 0, 0); this.set(B.shinR, 2.2, 0, 0);
    this.set(B.spine, 0.6 + sh, 0, 0); this.set(B.chest, 0.3, 0, 0); this.set(B.head, 0.3, 0, 0);
    this.set(B.armL, -2.2, 0, -0.4); this.set(B.armR, -2.2, 0, 0.4); this.set(B.foreL, -1.8, 0, 0); this.set(B.foreR, -1.8, 0, 0);
    this.hip.y -= 0.6;
  }
  brace() { // bracing against shaking / holding a rail
    const t = this.t, sh = Math.sin(t * 13) * 0.02;
    this.set(B.thighL, -0.5, 0, 0.25); this.set(B.thighR, -0.3, 0, -0.25); this.set(B.shinL, 0.8, 0, 0); this.set(B.shinR, 0.7, 0, 0);
    this.set(B.spine, 0.35 + sh, 0, 0); this.set(B.armL, -1.2, 0, 0.5); this.set(B.armR, -1.3, 0, -0.5); this.set(B.foreL, -0.6, 0, 0); this.set(B.foreR, -0.6, 0, 0);
    this.hip.y -= 0.2;
  }
  freezePose() { // held pose for Stillness victims (keeps S as-is)
    for (let i = 0; i < NB * 3; i++) this.P[i] = this.S[i];
    this.hip.copy(this.hipS);
  }

  // ------------------------------------------------------------- activities (ambient)
  doActivity(a) {
    const t = this.t + this.seed;
    switch (a) {
      case 'sweep': {
        const s = Math.sin(t * 2.4);
        this.set(B.spine, 0.25, s * 0.25, 0); this.set(B.armL, -0.9, 0, -0.3); this.set(B.armR, -0.6, 0, 0.2);
        this.set(B.foreL, -0.6, 0, 0); this.set(B.foreR, -0.9, 0, 0); this.set(B.head, 0.2, s * 0.15, 0); break;
      }
      case 'cook': {
        const s = Math.sin(t * 4), c = Math.cos(t * 4);
        this.set(B.armR, -0.9 + s * 0.15, 0, -0.1 + c * 0.15); this.set(B.foreR, -1.0 + c * 0.2, 0, 0);
        this.set(B.armL, -0.6 + Math.max(0, Math.sin(t * 1.3)) * 0.4, 0, 0.1); this.set(B.foreL, -1.2, 0, 0);
        this.set(B.spine, 0.12, 0, 0); this.set(B.head, 0.3, Math.sin(t * 0.5) * 0.3, 0); break;
      }
      case 'hammer': {
        const k = Math.pow(Math.max(0, Math.sin(t * 3.5)), 3);
        this.set(B.armR, -1.4 - k * 0.9, 0, -0.1); this.set(B.foreR, -0.6 - k * 0.8, 0, 0);
        this.set(B.armL, -0.8, 0, -0.2); this.set(B.foreL, -0.9, 0, 0); this.set(B.spine, 0.35, 0, 0); this.set(B.head, 0.35, 0, 0); break;
      }
      case 'console': case 'type': {
        const a1 = Math.sin(t * 9) * 0.05, a2 = Math.sin(t * 7.3 + 1) * 0.05;
        this.set(B.armL, -0.7 + a1, 0, -0.15); this.set(B.armR, -0.7 + a2, 0, 0.15); this.set(B.foreL, -0.9, 0, 0); this.set(B.foreR, -0.9, 0, 0);
        this.set(B.handL, 0.3, 0, 0); this.set(B.handR, 0.3, 0, 0); this.set(B.spine, 0.15, 0, 0); this.set(B.head, 0.25, Math.sin(t * 0.3) * 0.2, 0); break;
      }
      case 'lean': { // forearms on a railing
        this.set(B.spine, 0.45, 0, 0); this.set(B.chest, 0.15, 0, 0);
        this.set(B.armL, -1.3, 0, -0.1); this.set(B.armR, -1.3, 0, 0.1); this.set(B.foreL, -1.4, 0.3, 0); this.set(B.foreR, -1.4, -0.3, 0);
        this.set(B.thighL, -0.1, 0, 0.05); this.set(B.thighR, 0.15, 0, -0.08); this.set(B.shinR, 0.25, 0, 0);
        this.set(B.head, -0.25, Math.sin(t * 0.2) * 0.3, 0); this.hip.z -= 0.12; break;
      }
      case 'eat': {
        const k = Math.max(0, Math.sin(t * 1.4));
        this.set(B.armR, -0.8 - k * 0.6, 0, 0.1); this.set(B.foreR, -1.2 - k * 0.8, 0, 0); this.set(B.armL, -0.6, 0, -0.1); this.set(B.foreL, -1.1, 0, 0);
        this.set(B.head, 0.2 - k * 0.1, 0, 0); this.set(B.spine, 0.15, 0, 0); break;
      }
      case 'drink': {
        const k = smoothstep(0.3, 0.7, (Math.sin(t * 0.6) + 1) / 2);
        this.set(B.armR, -0.5 - k * 0.7, 0, 0.15); this.set(B.foreR, -1.4 - k * 0.6, 0, 0); this.set(B.head, -k * 0.25, 0, 0); break;
      }
      case 'busk': { // strumming a lap instrument
        const s = Math.sin(t * 6.4);
        this.set(B.armR, -0.4, 0, 0.15); this.set(B.foreR, -1.3 + s * 0.25, 0, 0); this.set(B.handR, s * 0.3, 0, 0);
        this.set(B.armL, -0.8, 0, -0.5); this.set(B.foreL, -1.6, 0, 0);
        this.set(B.head, 0.15 + Math.sin(t * 1.6) * 0.08, Math.sin(t * 0.8) * 0.2, Math.sin(t * 1.6) * 0.08); this.set(B.spine, 0.05, 0, Math.sin(t * 1.6) * 0.04); break;
      }
      case 'water': { // watering plants
        this.set(B.armR, -0.9, 0, -0.1); this.set(B.foreR, -0.4, 0, 0); this.set(B.handR, 0.5 + Math.sin(t) * 0.1, 0, 0);
        this.set(B.spine, 0.25, 0, 0); this.set(B.head, 0.3, 0, 0); break;
      }
      case 'phone': {
        this.set(B.armR, -0.7, 0, 0.2); this.set(B.foreR, -1.4, 0, 0); this.set(B.head, 0.45, 0, 0); this.set(B.armL, 0.05, 0, 0.1); break;
      }
      case 'kidPlay': { // bouncing on toes, waving
        const b = Math.abs(Math.sin(t * 6));
        this.hip.y += b * 0.06; this.set(B.armL, -1.0 - b * 0.8, 0, 0.6); this.set(B.armR, -0.4, 0, -0.5); this.set(B.foreL, -0.4, 0, 0);
        this.set(B.head, -0.1, Math.sin(t * 2) * 0.4, 0); break;
      }
      case 'stretch': {
        const k = (Math.sin(t * 0.7) + 1) / 2;
        this.set(B.armL, -2.9 * k, 0, 0.3); this.set(B.armR, -2.9 * k, 0, -0.3); this.set(B.foreL, -0.4, 0, 0); this.set(B.foreR, -0.4, 0, 0); this.set(B.spine, -0.15 * k, 0, 0); this.set(B.head, -0.3 * k, 0, 0); break;
      }
      case 'crate': { // lifting / stacking
        const k = (Math.sin(t * 1.5) + 1) / 2;
        this.set(B.spine, 0.2 + k * 0.6, 0, 0); this.set(B.thighL, -0.6 * k, 0, 0.1); this.set(B.thighR, -0.6 * k, 0, -0.1); this.set(B.shinL, 0.9 * k, 0, 0); this.set(B.shinR, 0.9 * k, 0, 0);
        this.set(B.armL, -1.0, 0, -0.1); this.set(B.armR, -1.0, 0, 0.1); this.set(B.foreL, -0.7, 0, 0); this.set(B.foreR, -0.7, 0, 0); this.hip.y -= k * 0.25; break;
      }
      case 'weld': {
        const j = Math.sin(t * 30) * 0.01;
        this.set(B.spine, 0.4, 0, 0); this.set(B.armR, -1.2 + j, 0, 0.1); this.set(B.foreR, -0.5, 0, 0); this.set(B.armL, -1.0, 0, -0.2); this.set(B.foreL, -0.8, 0, 0); this.set(B.head, 0.4, 0, 0); break;
      }
      case 'watch': this.layerArmsCrossed(1); this.set(B.head, -0.05, Math.sin(t * 0.25) * 0.25, 0); break;
      case 'talkIdle': this.layerTalk(0.6); break;
      case 'wait': this.layerHandsHips(Math.sin(t * 0.1) > 0.5 ? 1 : 0); break;
      default: break;
    }
  }

  // ------------------------------------------------------------- upper layers
  layerBreath() {
    const t = this.t, b = Math.sin(t * (this.speed > 3 ? 3.4 : 1.5)) * (this.speed > 3 ? 0.035 : 0.018);
    this.add(B.chest, -b, 0, 0); this.add(B.shoulderL, 0, 0, b * 0.6); this.add(B.shoulderR, 0, 0, -b * 0.6); this.add(B.head, b * 0.5, 0, 0);
  }
  layerTalk(w) {
    const t = this.t, sd = this.seed, g = this.gesture;
    const n1 = noise2(t * 0.55, sd), n2 = noise2(t * 0.45, sd + 10), n3 = noise2(t * 0.8, sd + 20), n4 = noise2(t * 0.3, sd + 30);
    const rA = Math.max(0, n1 + 0.15) * g, lA = Math.max(0, n2 - 0.05) * g;
    this.mix(B.armR, -0.25 - rA * 0.9, 0.2 * rA, -0.12 - rA * 0.25, w); this.mix(B.foreR, -0.6 - rA * 1.1, 0.3 * rA, 0, w); this.mix(B.handR, -0.2, -0.6 * rA + n3 * 0.4, 0, w);
    this.mix(B.armL, -0.2 - lA * 0.8, -0.2 * lA, 0.12 + lA * 0.25, w); this.mix(B.foreL, -0.5 - lA * 1.1, -0.3 * lA, 0, w); this.mix(B.handL, -0.2, 0.6 * lA - n3 * 0.3, 0, w);
    this.add(B.head, n3 * 0.08 * w + Math.max(0, Math.sin(t * 2.3 + sd)) * 0.04 * w, n4 * 0.12 * w, n2 * 0.06 * w);
    this.add(B.chest, 0, n4 * 0.08 * w, 0);
    // shrug pulses
    const shrug = Math.max(0, noise2(t * 0.35, sd + 40) - 0.4) * 2 * g;
    this.add(B.shoulderL, 0, 0, shrug * 0.25 * w); this.add(B.shoulderR, 0, 0, -shrug * 0.25 * w);
  }
  layerArmsCrossed(w) {
    this.mix(B.armL, -0.55, 0.3, -0.25, w); this.mix(B.foreL, -1.85, 0.5, 0, w);
    this.mix(B.armR, -0.6, -0.3, 0.25, w); this.mix(B.foreR, -1.8, -0.5, 0, w);
  }
  layerHandsHips(w) {
    this.mix(B.armL, 0.25, 0, 0.55, w); this.mix(B.foreL, -1.4, 0.4, 0, w); this.mix(B.handL, 0, 0, -0.5, w);
    this.mix(B.armR, 0.25, 0, -0.55, w); this.mix(B.foreR, -1.4, -0.4, 0, w); this.mix(B.handR, 0, 0, 0.5, w);
  }
  layerCarry(w) {
    this.mix(B.armL, -0.75, 0, -0.18, w); this.mix(B.armR, -0.75, 0, 0.18, w); this.mix(B.foreL, -0.9, 0, 0, w); this.mix(B.foreR, -0.9, 0, 0, w);
    this.add(B.spine, -0.08 * w, 0, 0);
  }
  layerWave(w) {
    const s = Math.sin(this.t * 9);
    this.mix(B.armR, -0.3, 0, -2.4, w); this.mix(B.foreR, -0.4 + s * 0.35, 0, 0, w); this.mix(B.handR, 0, 0, s * 0.3, w);
    this.add(B.head, -0.05 * w, 0, 0.08 * w);
  }
  layerPoint(w) {
    this.mix(B.armR, -1.45, 0, -0.15, w); this.mix(B.foreR, -0.05, 0, 0, w);
    this.add(B.chest, 0, -0.15 * w, 0);
  }
  layerAim(w) {
    const p = this.aimPitch; // + = looking down
    const rifle = this.weapon === 'carbine';
    // distribute pitch through spine/chest and arms
    this.mix(B.spine, p * 0.25 + 0.04, -0.12, 0, w); this.mix(B.chest, p * 0.25, -0.12, 0, w);
    this.mix(B.neck, p * 0.2, 0.12, 0, w); this.mix(B.head, p * 0.25, 0.12, 0, w);
    const ap = -p * 0.6;
    if (rifle) {
      this.mix(B.armR, -0.45 + ap * 0.7, 0, -0.38, w); this.mix(B.foreR, -1.75, 0.45, 0, w); this.mix(B.handR, 0.1, 0, 0.2, w);
      this.mix(B.armL, -1.05 + ap, 0.05, -0.18, w); this.mix(B.foreL, -0.55, -0.35, 0, w); this.mix(B.handL, 0, 0, -0.3, w);
    } else {
      this.mix(B.armR, -1.45 + ap, 0, 0.15, w); this.mix(B.foreR, -0.1, 0, 0, w); this.mix(B.handR, 0.05, 0, 0.0, w);
      this.mix(B.armL, -1.3 + ap, 0, -0.38, w); this.mix(B.foreL, -0.55, -0.3, 0, w); this.mix(B.handL, 0.1, 0, -0.5, w);
    }
    if (this.reload > 0) { // reload pose overlays left arm reaching to weapon / belt
      const r = this.reload; const k = Math.sin(r * Math.PI);
      this.mix(B.armL, -0.6, 0.2, -0.2, k * w); this.mix(B.foreL, -1.6, 0, 0, k * w);
      this.add(B.head, 0.2 * k * w, 0, 0);
    }
  }
  layerTether(w) {
    const p = this.tetherPitch, y = this.tetherYaw, st = this.tetherStrain;
    const shake = st * Math.sin(this.t * 40) * 0.03;
    this.mix(B.armL, -1.5 + p + shake, y * 0.5, 0.05, w); this.mix(B.foreL, -0.08, 0, 0, w); this.mix(B.handL, -0.6 + shake, 0, 0, w);
    this.mix(B.shoulderL, 0, 0.1, 0.05, w);
    this.add(B.chest, 0, y * 0.35 * w - 0.2 * w, 0); this.add(B.spine, st * 0.15 * w, 0, 0);
    if (!this.weapon || this.aim < 0.5) { this.mix(B.armR, -0.3 - st * 0.5, 0, -0.4, w * 0.7); this.mix(B.foreR, -1.4, 0, 0, w * 0.7); }
  }
}

// Analytic two-bone IK (thigh→shin→ankle) toward target t, in world space.
const _ia = new THREE.Vector3(), _ib = new THREE.Vector3(), _ic = new THREE.Vector3(), _iq = new THREE.Quaternion(), _iq2 = new THREE.Quaternion();
function rotateWorld(bone, axis, angle) {
  if (!isFinite(angle) || Math.abs(angle) < 1e-5 || axis.lengthSq() < 1e-10) return;
  const wq = bone.getWorldQuaternion(_iq2);
  const r = _iq.setFromAxisAngle(axis, angle);
  const parentInv = bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  bone.quaternion.copy(parentInv.multiply(r.multiply(wq)));
  bone.updateMatrixWorld(true);
}
function twoBoneIK(thigh, shin, a, b, c, t) {
  const lab = b.distanceTo(a), lcb = c.distanceTo(b);
  const lat = clamp(t.distanceTo(a), 0.01, lab + lcb - 0.002);
  const ca = _ia.copy(c).sub(a).normalize(), ba = _ib.copy(b).sub(a).normalize(), ta = _ic.copy(t).sub(a).normalize();
  const ac_ab_0 = Math.acos(clamp(ca.dot(ba), -1, 1));
  const ab_ = b.clone().sub(a).negate().normalize(), cb_ = c.clone().sub(b).normalize();
  const ba_bc_0 = Math.acos(clamp(ab_.dot(cb_.clone()), -1, 1));
  const ac_at_0 = Math.acos(clamp(ca.dot(ta), -1, 1));
  const ac_ab_1 = Math.acos(clamp((lcb * lcb - lab * lab - lat * lat) / (-2 * lab * lat), -1, 1));
  const ba_bc_1 = Math.acos(clamp((lat * lat - lab * lab - lcb * lcb) / (-2 * lab * lcb), -1, 1));
  const axis0 = new THREE.Vector3().crossVectors(c.clone().sub(a), b.clone().sub(a)).normalize();
  const axis1 = new THREE.Vector3().crossVectors(c.clone().sub(a), t.clone().sub(a)).normalize();
  rotateWorld(thigh, axis0, ac_ab_1 - ac_ab_0);
  rotateWorld(shin, axis0, ba_bc_1 - ba_bc_0);
  rotateWorld(thigh, axis1, ac_at_0);
}
