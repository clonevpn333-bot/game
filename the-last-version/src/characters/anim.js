// Procedural animation: gait-cycle locomotion with planted feet (two-bone IK),
// breathing/weight-shift idles with moods, arm IK targets, finger grips,
// facial expressions, blinking, eye/head look-at, talking, ponytail springs.
import * as THREE from 'three';

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const sstep = (t) => t * t * (3 - 2 * t);

export const EXPRESSIONS = {
  neutral: {},
  happy: { smile: 1, squint: 0.35, browUp: 0.2, cheek: 1 },
  amused: { smile: 0.45, squint: 0.2, browUp: -0.1, asym: 0.6, cheek: 0.5 },
  angry: { browIn: 1, frown: 0.6, squint: 0.4, sneer: 0.3, jaw: 0.02 },
  sad: { browSad: 1, frown: 0.7, lid: 0.25, jaw: 0.02 },
  fear: { browUp: 1, browSad: 0.5, lidWide: 1, jaw: 0.12, frown: 0.3 },
  surprise: { browUp: 1.2, lidWide: 0.8, jaw: 0.2, mouthO: 1 },
  confused: { browIn: 0.4, browUpL: 0.8, asym: 0.3, frown: 0.2 },
  focus: { browIn: 0.5, squint: 0.45, jaw: 0, frown: 0.1 },
  strain: { browIn: 0.9, squint: 0.8, sneer: 0.6, smile: 0.4, jaw: 0.04, teeth: 1 },
  pain: { browSad: 0.8, browIn: 0.6, squint: 0.9, sneer: 0.5, jaw: 0.08 },
};

export class Animator {
  constructor(ch) {
    this.ch = ch; this.b = ch.bones; this.rest = ch.restPose;
    this.mode = 'idle';         // idle | walk | run | sit | drive | crouch | custom
    this.speed = 0;             // m/s along facing
    this.turnRate = 0;          // rad/s (lean into turns)
    this.mood = 'neutral';      // neutral | sad | tense | confident | tired
    this.expression = 'neutral';
    this.face = {}; for (const k of ['smile', 'squint', 'browUp', 'browIn', 'browSad', 'frown', 'sneer', 'jaw', 'mouthO', 'lid', 'lidWide', 'asym', 'cheek', 'browUpL', 'teeth']) this.face[k] = 0;
    this.lookTarget = null;     // world Vector3
    this.talking = false;
    this.phase = 0; this.t = Math.random() * 10;
    this.blinkT = 2; this.blink = 0;
    this.headLook = new THREE.Vector2(); this.eyeLook = new THREE.Vector2();
    this.ik = { handL: null, handR: null, handRotL: null, handRotR: null }; // world targets
    this.grip = { L: 0.15, R: 0.15 };
    this.hit = new THREE.Vector2(); this.hitV = new THREE.Vector2();
    this.custom = null;         // fn(animator, dt) for authored poses
    this.weight = 0; this.groundY = 0;
    this.crouch = 0; this.lean = 0;
    this.tailState = (ch.tail?.bones || []).map(() => ({ x: 0, z: 0, vx: 0, vz: 0 }));
    this.prevHeadPos = new THREE.Vector3(); this.prevHeadVel = new THREE.Vector3();
    // finger curl axes per side (rest space)
    this.curlAxis = {};
    for (const s of ['L', 'R']) {
      const h = ch.hands[s];
      this.curlAxis[s] = new THREE.Vector3(...h.D).cross(new THREE.Vector3(...h.N)).normalize();
    }
    this.blend = { walk: 0, run: 0, sit: 0, drive: 0, crouch: 0 };
  }

  hitReact(dir = 1, power = 1) { this.hitV.x += dir * power * 6; this.hitV.y += power * 4; }

  resetPose() {
    for (const [n, r] of Object.entries(this.rest)) { const b = this.b[n] || this.ch.tail?.bones.find((x) => x.name === n); if (!b) continue; b.position.copy(r.p); b.quaternion.copy(r.q); }
  }
  rot(name, axis, angle) { _q.setFromAxisAngle(axis, angle); this.b[name].quaternion.multiply(_q); }
  rotPre(name, axis, angle) { _q.setFromAxisAngle(axis, angle); this.b[name].quaternion.premultiply(_q); }

  update(dt) {
    this.t += dt;
    const ch = this.ch, b = this.b;
    this.resetPose();
    // blend weights toward the current mode
    const target = { walk: 0, run: 0, sit: 0, drive: 0, crouch: 0 };
    if (this.mode === 'walk' || this.mode === 'run') { target.walk = 1; target.run = clamp((this.speed - 1.8) / 2.5, 0, 1); }
    if (this.mode === 'sit') target.sit = 1;
    if (this.mode === 'drive') target.drive = 1;
    if (this.mode === 'crouch') target.crouch = 1;
    for (const k in this.blend) this.blend[k] = damp(this.blend[k], target[k], 8, dt);
    const B = this.blend;

    if (B.drive > 0.01 || B.sit > 0.01) this.seated(Math.max(B.drive, B.sit));
    else this.locomotion(dt);
    if (this.custom) this.custom(this, dt);

    // hit reaction spring
    this.hitV.x += (-this.hit.x * 60 - this.hitV.x * 9) * dt; this.hitV.y += (-this.hit.y * 60 - this.hitV.y * 9) * dt;
    this.hit.x += this.hitV.x * dt; this.hit.y += this.hitV.y * dt;
    this.rot('spine', AZ, this.hit.x * 0.08); this.rot('chest', AX, -this.hit.y * 0.08); this.rot('head', AZ, this.hit.x * 0.1);

    ch.updateMatrixWorld(true);
    this.arms(dt);
    this.headAndEyes(dt);
    this.faceUpdate(dt);
    this.fingers();
    this.tail(dt);
  }

  // ---------------------------------------------------------------- body
  locomotion(dt) {
    const b = this.b, B = this.blend, H = this.ch.def.body.height / 1.8;
    const v = Math.max(0, this.speed) * (B.walk > 0.01 ? 1 : 0);
    const run = B.run, walk = B.walk;
    // gait cycle: stride (two steps) scales with speed
    const stride = (1.25 + run * 1.2) * H;
    const period = v > 0.05 ? stride / v : 1;
    this.phase = (this.phase + dt / period) % 1;
    const ph = this.phase * Math.PI * 2;
    const t = this.t;
    // --- moods
    const sad = this.mood === 'sad' ? 1 : 0, tense = this.mood === 'tense' ? 1 : 0, conf = this.mood === 'confident' ? 1 : 0, tired = this.mood === 'tired' ? 1 : 0;
    // --- hips
    const idle = 1 - walk;
    const breathe = Math.sin(t * (1.6 + tense * 1.2)) * (1 + run);
    const sway = Math.sin(t * 0.45) * 0.018 * idle;
    const bob = walk * (run > 0.5 ? -0.035 * Math.cos(2 * ph) - 0.03 : -0.018 * Math.cos(2 * ph) - 0.005) * H;
    const crouch = B.crouch * 0.28 * H;
    b.hips.position.y += bob - crouch - tired * 0.01 - 0.006 * idle;
    b.hips.position.x += sway + walk * Math.sin(ph) * 0.022 * (1 - run * 0.5) * H;
    this.rot('hips', AY, walk * Math.sin(ph) * (0.12 + run * 0.05));
    this.rot('hips', AZ, walk * -Math.cos(ph) * 0.04 + sway * 1.6);
    const leanF = walk * (0.04 + run * 0.18) + this.lean + B.crouch * 0.35 + sad * 0.05 + tired * 0.08;
    this.rot('hips', AX, leanF * 0.5);
    // spine counter-rotation, lean into turns
    this.rot('spine', AY, -walk * Math.sin(ph) * (0.09 + run * 0.06));
    this.rot('spine', AZ, -this.turnRate * 0.05 * (0.5 + run) - sway * 1.2);
    this.rot('spine', AX, leanF * 0.4 + sad * 0.12);
    this.rot('chest', AY, -walk * Math.sin(ph) * (0.08 + run * 0.08));
    this.rot('chest', AX, breathe * 0.012 - conf * 0.06 + sad * 0.1 + leanF * 0.2);
    this.rot('neck', AX, sad * 0.18 - conf * 0.03 - leanF * 0.5);
    // clavicles: breathing, tension, sadness
    for (const [s, sx] of [['L', 1], ['R', -1]]) {
      this.rot('clavicle' + s, AZ, sx * (breathe * 0.008 + tense * 0.08 - sad * 0.06 + run * 0.04));
      this.rot('clavicle' + s, AY, sx * (sad * 0.12 + tired * 0.05));
    }
    // --- legs: planted-foot gait via IK
    this.ch.updateMatrixWorld(true);
    const stanceF = 0.62 - run * 0.24; // fraction of cycle a foot is on the ground
    for (const [s, off] of [['L', 0], ['R', 0.5]]) {
      const tt = (this.phase + off) % 1;
      const rest = this.ch.worldRest['foot' + s];
      let z = 0, y = 0, toe = 0;
      const D = v * period * stanceF; // ground travelled during stance
      if (tt < stanceF) { const u = tt / stanceF; z = D * (0.5 - u); toe = u > 0.75 ? (u - 0.75) * 2.2 : 0; y = 0; }
      else { const u = (tt - stanceF) / (1 - stanceF); z = -D / 2 + D * sstep(u); y = Math.sin(u * Math.PI) * (0.1 + run * 0.14) * H; toe = (1 - u) * 0.5 - Math.max(0, u - 0.7) * 0.6; }
      z *= walk; y *= walk; toe *= walk;
      // idle stance: weight on one leg
      const idleShift = idle * (s === 'L' ? 1 : -1) * 0;
      const target = this.ch.localToWorld(_v.set(rest[0] + idleShift, rest[1] + y + B.crouch * 0.0, rest[2] + z + B.crouch * 0.06));
      this.legIK(s, target, toe);
    }
    // --- arms (FK swing; IK overrides happen in arms())
    const armDown = (this.ch.def.body.armAngle ?? 40) - 7 - tense * 4 + conf * 2;
    for (const [s, sx, off] of [['L', 1, 0.5], ['R', -1, 0]]) {
      const swing = walk * Math.sin(ph + off * Math.PI * 2 + Math.PI) * (0.35 + run * 0.55);
      this.rot('upperArm' + s, AZ, -sx * armDown * Math.PI / 180);
      this.rotPre('upperArm' + s, AX, -swing * 0.9 - B.crouch * 0.3 + sad * 0.05);
      this.rot('upperArm' + s, AY, sx * (0.15 + run * 0.1));
      const elbow = 0.18 + walk * 0.25 + run * 1.15 + tense * 0.25 + B.crouch * 0.4 + Math.max(0, -swing) * 0.3;
      this.rot('forearm' + s, AX, -elbow);
      this.rot('hand' + s, AX, -0.1 - run * 0.2);
      this.grip[s] = damp(this.grip[s], 0.18 + run * 0.7 + tense * 0.4, 6, dt);
    }
  }

  seated(w) {
    const b = this.b, H = this.ch.def.body.height / 1.8;
    b.hips.position.y -= 0.43 * H * w; b.hips.position.z -= 0.05 * w;
    this.rot('hips', AX, -0.12 * w);
    this.rot('spine', AX, 0.05 * w);
    this.rot('chest', AX, 0.04 * w + Math.sin(this.t * 1.6) * 0.01);
    for (const [s, sx] of [['L', 1], ['R', -1]]) {
      this.rot('thigh' + s, AX, -1.5 * w);
      this.rot('thigh' + s, AZ, sx * 0.08 * w);
      this.rot('shin' + s, AX, 1.35 * w);
      this.rot('foot' + s, AX, 0.15 * w);
      this.rot('upperArm' + s, AZ, -sx * 0.55 * w);
      this.rotPre('upperArm' + s, AX, -0.5 * w);
      this.rot('forearm' + s, AX, -0.9 * w);
    }
  }

  /** Two-bone IK for the leg: thigh/shin aim the ankle at `target` (world). */
  legIK(s, target, toeBend = 0) {
    const thigh = this.b['thigh' + s], shin = this.b['shin' + s], foot = this.b['foot' + s];
    const A = thigh.getWorldPosition(new THREE.Vector3());
    const l1 = shin.position.length(), l2 = foot.position.length();
    const pole = new THREE.Vector3(0, 0, 1).applyQuaternion(this.ch.getWorldQuaternion(_q2));
    this.twoBone(thigh, shin, foot, A, target, l1, l2, pole);
    // keep the foot level with the character's facing
    this.ch.updateMatrixWorld(true);
    const parentQ = shin.getWorldQuaternion(new THREE.Quaternion());
    const want = this.ch.getWorldQuaternion(new THREE.Quaternion());
    foot.quaternion.copy(parentQ.invert().multiply(want));
    this.rot('foot' + s, AX, -toeBend * 0.6);
    this.rot('toe' + s, AX, toeBend * 0.9);
  }

  twoBone(upper, lower, end, A, C, l1, l2, pole) {
    const d0 = C.clone().sub(A); let d = d0.length();
    d = clamp(d, Math.abs(l1 - l2) + 1e-3, (l1 + l2) * 0.9995);
    const dir = d0.normalize();
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const pd = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
    const Bk = A.clone().addScaledVector(dir, a).addScaledVector(pd, h);
    const Cc = A.clone().addScaledVector(dir, d);
    // upper: rotate rest child direction onto (B - A) in world, keep pole plane
    this.aimBone(upper, lower.position, Bk.clone().sub(A), pd);
    upper.updateMatrixWorld(true);
    this.aimBone(lower, end.position, Cc.clone().sub(Bk), pd);
    lower.updateMatrixWorld(true);
  }

  /** Rotate `bone` so its rest child offset points along worldDir; `up` controls twist. */
  aimBone(bone, childRestLocal, worldDir, up) {
    const parentQ = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const rootQ = this.ch.getWorldQuaternion(new THREE.Quaternion());
    // rest direction expressed in world (rest frames are aligned with the character)
    const restDir = childRestLocal.clone().normalize().applyQuaternion(rootQ);
    const q = new THREE.Quaternion().setFromUnitVectors(restDir, worldDir.clone().normalize());
    // twist so that the rest "forward" (character +Z) maps as close as possible to `up`
    if (up) {
      const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(rootQ).applyQuaternion(q);
      const axis = worldDir.clone().normalize();
      const f1 = fwd.sub(axis.clone().multiplyScalar(fwd.dot(axis))).normalize();
      const u1 = up.clone().sub(axis.clone().multiplyScalar(up.dot(axis))).normalize();
      if (f1.lengthSq() > 0.5 && u1.lengthSq() > 0.5) {
        let ang = Math.acos(clamp(f1.dot(u1), -1, 1));
        if (f1.clone().cross(u1).dot(axis) < 0) ang = -ang;
        q.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, ang));
      }
    }
    const worldQ = q.multiply(rootQ);
    bone.quaternion.copy(parentQ.invert().multiply(worldQ));
  }

  arms(dt) {
    for (const [s, sx] of [['L', 1], ['R', -1]]) {
      const tgt = this.ik['hand' + s];
      if (!tgt) continue;
      const up = this.b['upperArm' + s], fo = this.b['forearm' + s], ha = this.b['hand' + s];
      const A = up.getWorldPosition(new THREE.Vector3());
      const rootQ = this.ch.getWorldQuaternion(new THREE.Quaternion());
      const pole = new THREE.Vector3(sx * 0.6, -0.5, -1).normalize().applyQuaternion(rootQ);
      const l1 = fo.position.length(), l2 = ha.position.length();
      // aim with an elbow-down/back pole; the 'up' twist keeps the palm plausible
      const C = tgt.clone();
      const d0 = C.clone().sub(A); let d = clamp(d0.length(), 0.05, (l1 + l2) * 0.999); const dir = d0.normalize();
      const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
      const pd = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
      const Bk = A.clone().addScaledVector(dir, a).addScaledVector(pd, h);
      this.aimBone(up, fo.position, Bk.clone().sub(A), null);
      up.updateMatrixWorld(true);
      this.aimBone(fo, ha.position, A.clone().addScaledVector(dir, d).sub(Bk), null);
      fo.updateMatrixWorld(true);
      const rq = this.ik['handRot' + s];
      if (rq) { const pq = fo.getWorldQuaternion(new THREE.Quaternion()); ha.quaternion.copy(pq.invert().multiply(rq)); }
      ha.updateMatrixWorld(true);
    }
  }

  headAndEyes(dt) {
    const head = this.b.head, neck = this.b.neck;
    let yaw = 0, pitch = 0;
    if (this.lookTarget) {
      const hp = head.getWorldPosition(_v);
      const local = this.ch.worldToLocal(this.lookTarget.clone()).sub(this.ch.worldToLocal(hp.clone()));
      yaw = Math.atan2(local.x, local.z); pitch = -Math.atan2(local.y - 0.08, Math.hypot(local.x, local.z));
      if (Math.abs(yaw) > 2.2) yaw = 0; // behind: don't break the neck
    } else {
      yaw = Math.sin(this.t * 0.31) * 0.12 + Math.sin(this.t * 0.83) * 0.05; pitch = Math.sin(this.t * 0.27) * 0.05;
    }
    yaw = clamp(yaw, -1.2, 1.2); pitch = clamp(pitch, -0.6, 0.5);
    this.headLook.x = damp(this.headLook.x, yaw, 4, dt); this.headLook.y = damp(this.headLook.y, pitch, 4, dt);
    this.eyeLook.x = damp(this.eyeLook.x, yaw, 25, dt); this.eyeLook.y = damp(this.eyeLook.y, pitch, 25, dt);
    const talkNod = this.talking ? Math.sin(this.t * 3.1) * 0.04 + Math.sin(this.t * 7.3) * 0.015 : 0;
    _q.setFromEuler(new THREE.Euler(this.headLook.y * 0.35, this.headLook.x * 0.4, 0)); neck.quaternion.multiply(_q);
    _q.setFromEuler(new THREE.Euler(this.headLook.y * 0.45 + talkNod, this.headLook.x * 0.45, Math.sin(this.t * 0.5) * 0.02)); head.quaternion.multiply(_q);
    // eyes take the remainder plus micro-saccades
    const sacc = Math.floor(this.t * 2.3);
    const jx = (Math.sin(sacc * 12.9898) * 0.5) * 0.04, jy = (Math.sin(sacc * 78.233) * 0.5) * 0.03;
    const ey = clamp(this.eyeLook.x - this.headLook.x * 0.85 + jx, -0.45, 0.45), ep = clamp(this.eyeLook.y - this.headLook.y * 0.8 + jy, -0.3, 0.3);
    for (const e of this.ch.eyes || []) e.pivot.rotation.set(ep, ey + 0.0, 0);
    this.eyePitch = ep;
  }

  faceUpdate(dt) {
    const target = EXPRESSIONS[this.expression] || {};
    const F = this.face;
    for (const k in F) F[k] = damp(F[k], target[k] ?? 0, 6, dt);
    // blinking
    this.blinkT -= dt;
    if (this.blinkT < 0) { this.blink = 1; this.blinkT = 1.5 + Math.random() * 4 + (Math.random() < 0.2 ? -1.2 : 0); }
    this.blink = Math.max(0, this.blink - dt * 7);
    const blinkAmt = this.blink > 0 ? Math.sin(this.blink * Math.PI) : 0;
    const b = this.b, hs = this.ch.def.body.height / 1.8;
    // jaw + talking
    let jaw = F.jaw * 0.25 + F.mouthO * 0.12;
    let talkO = 0;
    if (this.talking) {
      const syl = Math.abs(Math.sin(this.t * 11.5)) * (0.55 + 0.45 * Math.sin(this.t * 3.7)) * (Math.sin(this.t * 1.9) > -0.6 ? 1 : 0.15);
      jaw += syl * 0.13; talkO = syl;
    }
    b.jaw.quaternion.multiply(_q.setFromAxisAngle(AX, jaw));
    // mouth corners
    for (const [n, sx] of [['mouthL', 1], ['mouthR', -1]]) {
      const asym = sx > 0 ? 1 : 1 - F.asym;
      const sm = F.smile * asym, fr = F.frown;
      b[n].position.x += sx * (sm * 0.005 - talkO * 0.0015 - F.mouthO * 0.004) * hs;
      b[n].position.y += (sm * 0.006 - fr * 0.0045) * hs;
      b[n].position.z += (-sm * 0.002) * hs;
    }
    b.lipU.position.y += (F.sneer * 0.0025 + F.teeth * 0.0015) * hs;
    b.lipU.position.z += (F.mouthO * 0.002) * hs;
    b.lipL.position.y += (-F.teeth * 0.002) * hs;
    for (const [n, sx] of [['browL', 1], ['browR', -1]]) {
      const up = F.browUp + (sx > 0 ? F.browUpL : 0);
      b[n].position.y += (up * 0.006 - F.browIn * 0.004) * hs;
      b[n].position.x += -sx * F.browIn * 0.0025 * hs;
      b[n].quaternion.multiply(_q.setFromAxisAngle(AZ, sx * (F.browSad * 0.25 - F.browIn * 0.22)));
    }
    for (const [n] of [['cheekL'], ['cheekR']]) b[n].position.y += (F.cheek * 0.003 + F.squint * 0.0015) * hs;
    // eyelids: open angle with squint/wide/sad, blink, and follow eye pitch
    const ep = this.eyePitch || 0;
    for (const l of this.ch.lids || []) {
      if (l.upper) {
        let open = -0.48 - F.lidWide * 0.2 + F.squint * 0.28 + F.lid * 0.25 + ep * 0.6;
        open = open + (0.08 - open) * blinkAmt;
        l.holder.rotation.x = open;
      } else {
        let open = 0.3 - F.squint * 0.18 + F.lidWide * 0.08 + ep * 0.25;
        open = open + (0.02 - open) * blinkAmt * 0.7;
        l.holder.rotation.x = open;
      }
    }
  }

  fingers() {
    for (const s of ['L', 'R']) {
      const g = this.grip[s] ?? 0.15, ax = this.curlAxis[s];
      for (const f of ['index', 'middle', 'ring', 'pinky']) {
        const spread = f === 'index' ? 0.9 : f === 'pinky' ? 1.15 : 1;
        for (let i = 0; i < 3; i++) this.b[f + i + s].quaternion.multiply(_q.setFromAxisAngle(ax, g * (i === 0 ? 1.25 : 1.35) * spread));
      }
      for (let i = 0; i < 3; i++) this.b['thumb' + i + s].quaternion.multiply(_q.setFromAxisAngle(ax, g * (i === 0 ? 0.25 : 0.5)));
    }
  }

  tail(dt) {
    const bones = this.ch.tail?.bones; if (!bones || dt <= 0) return;
    const hp = this.b.head.getWorldPosition(_v3);
    const vel = _v2.copy(hp).sub(this.prevHeadPos).divideScalar(dt);
    const acc = vel.clone().sub(this.prevHeadVel).divideScalar(dt);
    this.prevHeadPos.copy(hp); this.prevHeadVel.copy(vel);
    if (acc.length() > 200) acc.set(0, 0, 0);
    const local = acc.applyQuaternion(this.ch.getWorldQuaternion(_q2).invert());
    bones.forEach((bone, i) => {
      const st = this.tailState[i];
      const k = 70 - i * 15, c = 6;
      st.vx += (-k * st.x - c * st.vx - local.z * 0.012) * dt; st.vz += (-k * st.z - c * st.vz + local.x * 0.012) * dt;
      st.x += st.vx * dt; st.z += st.vz * dt;
      st.x = clamp(st.x, -0.8, 0.8); st.z = clamp(st.z, -0.8, 0.8);
      bone.quaternion.multiply(_q.setFromEuler(new THREE.Euler(st.x + 0.15, 0, st.z)));
    });
  }
}
