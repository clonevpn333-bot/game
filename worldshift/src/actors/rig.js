// Procedural humanoid: a small skeleton driven by blended procedural poses.
// Used by the player (detailed mesh) and NPCs (same rig, cheaper materials).
import * as THREE from 'three';
import { clamp, lerp } from '../core/mathx.js';

// Joint indices
export const J = {
  hips: 0, spine: 1, chest: 2, neck: 3, head: 4,
  shL: 5, elL: 6, haL: 7, shR: 8, elR: 9, haR: 10,
  thL: 11, knL: 12, ftL: 13, thR: 14, knR: 15, ftR: 16,
};
export const NJ = 17;
const PARENT = [-1, 0, 1, 2, 3, 2, 5, 6, 2, 8, 9, 0, 11, 12, 0, 14, 15];
// rest offsets from parent (metres)
const OFFS = [
  [0, 0.98, 0], [0, 0.12, 0], [0, 0.2, 0], [0, 0.26, 0], [0, 0.09, 0],
  [0.19, 0.2, 0], [0, -0.29, 0], [0, -0.26, 0],
  [-0.19, 0.2, 0], [0, -0.29, 0], [0, -0.26, 0],
  [0.1, -0.06, 0], [0, -0.44, 0], [0, -0.43, 0],
  [-0.1, -0.06, 0], [0, -0.44, 0], [0, -0.43, 0],
];

// A pose: Float32Array of NJ*3 euler angles (XYZ) + root offset (y, x/z lean) + body pitch/roll
export class Pose {
  constructor() {
    this.r = new Float32Array(NJ * 3);
    this.rootY = 0; this.rootX = 0; this.rootZ = 0;
    this.pitch = 0; this.roll = 0; this.yawOff = 0;
  }
  clear() {
    this.r.fill(0);
    this.rootY = this.rootX = this.rootZ = 0;
    this.pitch = this.roll = this.yawOff = 0;
    return this;
  }
  set(j, x, y = 0, z = 0) { const i = j * 3; this.r[i] = x; this.r[i + 1] = y; this.r[i + 2] = z; return this; }
  add(j, x, y = 0, z = 0) { const i = j * 3; this.r[i] += x; this.r[i + 1] += y; this.r[i + 2] += z; return this; }
  // this = this*(1-w) + p*w
  blend(p, w) {
    if (w <= 0) return this;
    if (w >= 1) { this.r.set(p.r); this.rootY = p.rootY; this.rootX = p.rootX; this.rootZ = p.rootZ; this.pitch = p.pitch; this.roll = p.roll; this.yawOff = p.yawOff; return this; }
    for (let i = 0; i < this.r.length; i++) this.r[i] += (p.r[i] - this.r[i]) * w;
    this.rootY = lerp(this.rootY, p.rootY, w); this.rootX = lerp(this.rootX, p.rootX, w); this.rootZ = lerp(this.rootZ, p.rootZ, w);
    this.pitch = lerp(this.pitch, p.pitch, w); this.roll = lerp(this.roll, p.roll, w); this.yawOff = lerp(this.yawOff, p.yawOff, w);
    return this;
  }
  // blend only the upper body joints
  blendUpper(p, w) {
    if (w <= 0) return this;
    for (let j = J.spine; j <= J.haR; j++) {
      for (let k = 0; k < 3; k++) { const i = j * 3 + k; this.r[i] += (p.r[i] - this.r[i]) * w; }
    }
    return this;
  }
  addPose(p, w) {
    for (let i = 0; i < this.r.length; i++) this.r[i] += p.r[i] * w;
    this.rootY += p.rootY * w; this.pitch += p.pitch * w; this.roll += p.roll * w;
    return this;
  }
}

// ----------------------------------------------------------- animations ---
// All functions write into `p` (cleared beforehand by caller unless noted)
const S = Math.sin, Cc = Math.cos;

export function poseIdle(p, t, breathe = 1, relax = 0) {
  const b = S(t * 1.8) * 0.02 * breathe;
  p.set(J.spine, b * 0.5, 0, 0);
  p.set(J.chest, -b, 0, 0);
  p.set(J.neck, 0.05 + b, S(t * 0.37) * 0.08, 0);
  p.set(J.head, 0.02, S(t * 0.23) * 0.1, 0);
  p.set(J.shL, 0.05, 0, 0.12 + relax * 0.05 + b);
  p.set(J.shR, 0.05, 0, -0.12 - relax * 0.05 - b);
  p.set(J.elL, -0.15, 0, 0);
  p.set(J.elR, -0.15, 0, 0);
  p.set(J.thL, 0.02, 0, 0.04);
  p.set(J.thR, -0.02, 0, -0.04);
  p.set(J.knL, 0.05);
  p.set(J.knR, 0.08);
  p.set(J.ftL, -0.05);
  p.set(J.ftR, -0.08);
  p.rootY = -0.01 + b * 0.2;
  return p;
}

// speed: 0..1 walk, 1..2 run, 2..3 sprint (blended)
export function poseLocomotion(p, phase, speedN) {
  const run = clamp(speedN - 1, 0, 1);
  const sprint = clamp(speedN - 2, 0, 1);
  const walk = clamp(speedN, 0, 1);
  const s = S(phase), c = Cc(phase);
  const legAmp = lerp(0.45, 0.75, run) + sprint * 0.18;
  const kneeAmp = lerp(0.6, 1.25, run) + sprint * 0.3;
  const armAmp = lerp(0.35, 0.85, run) + sprint * 0.25;
  const lean = lerp(0.04, 0.16, run) + sprint * 0.14;
  // legs
  p.set(J.thL, -s * legAmp * walk - 0.05 * run, 0, 0.03);
  p.set(J.thR, s * legAmp * walk - 0.05 * run, 0, -0.03);
  const kl = Math.max(0, -Cc(phase + 0.6)) * kneeAmp + 0.1 * walk + run * 0.25 * Math.max(0, s);
  const kr = Math.max(0, Cc(phase + 0.6)) * kneeAmp + 0.1 * walk + run * 0.25 * Math.max(0, -s);
  p.set(J.knL, kl * walk);
  p.set(J.knR, kr * walk);
  p.set(J.ftL, (-0.15 * s - kl * 0.25) * walk);
  p.set(J.ftR, (0.15 * s - kr * 0.25) * walk);
  // arms (opposite to legs)
  p.set(J.shL, s * armAmp * walk + 0.05, 0, 0.1 + run * 0.08);
  p.set(J.shR, -s * armAmp * walk + 0.05, 0, -0.1 - run * 0.08);
  p.set(J.elL, -0.25 - run * 0.9 - Math.max(0, s) * 0.3 * walk);
  p.set(J.elR, -0.25 - run * 0.9 - Math.max(0, -s) * 0.3 * walk);
  // torso
  const bob = Math.abs(c) * lerp(0.035, 0.07, run) * walk;
  p.rootY = -bob + 0.02 * walk - run * 0.04;
  p.set(J.spine, lean * 0.5, s * 0.08 * walk, 0);
  p.set(J.chest, lean * 0.5, -s * lerp(0.12, 0.22, run) * walk, 0);
  p.set(J.neck, -lean * 0.6, s * 0.05 * walk, 0);
  p.set(J.head, -lean * 0.3, 0, 0);
  p.roll = s * 0.03 * walk;
  return p;
}

export function poseCrouch(p, phase, speedN) {
  const m = clamp(speedN, 0, 1);
  const s = S(phase);
  p.set(J.thL, -1.1 - s * 0.35 * m, 0, 0.12);
  p.set(J.thR, -1.0 + s * 0.35 * m, 0, -0.12);
  p.set(J.knL, 1.9 + Math.max(0, -Cc(phase)) * 0.3 * m);
  p.set(J.knR, 1.8 + Math.max(0, Cc(phase)) * 0.3 * m);
  p.set(J.ftL, -0.7);
  p.set(J.ftR, -0.7);
  p.set(J.spine, 0.35, 0, 0);
  p.set(J.chest, 0.2, s * 0.08 * m, 0);
  p.set(J.neck, -0.4);
  p.set(J.head, -0.15);
  p.set(J.shL, 0.4 + s * 0.2 * m, 0, 0.18);
  p.set(J.shR, 0.4 - s * 0.2 * m, 0, -0.18);
  p.set(J.elL, -0.9);
  p.set(J.elR, -0.9);
  p.rootY = -0.42 - Math.abs(Cc(phase)) * 0.03 * m;
  return p;
}

export function poseAir(p, vy, t) {
  const up = clamp(vy / 6, -1, 1);
  const tuck = clamp(1 - Math.abs(up), 0, 1);
  p.set(J.thL, -0.6 - tuck * 0.4, 0, 0.1);
  p.set(J.thR, 0.1 - tuck * 0.5, 0, -0.1);
  p.set(J.knL, 1.0 + tuck * 0.5);
  p.set(J.knR, 0.5 + tuck * 0.5);
  p.set(J.ftL, -0.3);
  p.set(J.ftR, -0.2);
  p.set(J.shL, -0.4 - up * 0.6, 0, 0.5 + S(t * 9) * 0.05);
  p.set(J.shR, 0.3 - up * 0.6, 0, -0.5 - S(t * 9) * 0.05);
  p.set(J.elL, -0.6);
  p.set(J.elR, -0.6);
  p.set(J.spine, 0.1 - up * 0.1);
  p.set(J.neck, -0.1);
  return p;
}

export function poseFall(p, t) {
  // flailing long fall
  p.set(J.thL, -0.5 + S(t * 7) * 0.4, 0, 0.2);
  p.set(J.thR, -0.2 - S(t * 7) * 0.4, 0, -0.2);
  p.set(J.knL, 0.8 + S(t * 9) * 0.3);
  p.set(J.knR, 0.6 - S(t * 9) * 0.3);
  p.set(J.shL, -2.2 + S(t * 8) * 0.6, 0, 0.6);
  p.set(J.shR, -2.2 - S(t * 8) * 0.6, 0, -0.6);
  p.set(J.elL, -0.4);
  p.set(J.elR, -0.4);
  p.set(J.spine, -0.2);
  p.set(J.neck, 0.2);
  return p;
}

export function poseLand(p, k) {
  // k: 0..1 compression
  p.set(J.thL, -1.0 * k, 0, 0.12);
  p.set(J.thR, -0.9 * k, 0, -0.12);
  p.set(J.knL, 1.7 * k);
  p.set(J.knR, 1.6 * k);
  p.set(J.ftL, -0.7 * k);
  p.set(J.ftR, -0.7 * k);
  p.set(J.spine, 0.45 * k);
  p.set(J.shL, 0.3 * k, 0, 0.3 * k);
  p.set(J.shR, 0.3 * k, 0, -0.3 * k);
  p.set(J.elL, -0.6 * k);
  p.set(J.elR, -0.6 * k);
  p.rootY = -0.45 * k;
  return p;
}

export function poseSlide(p, t) {
  p.set(J.thL, -1.5, 0, 0.1);
  p.set(J.knL, 0.15);
  p.set(J.ftL, 0.3);
  p.set(J.thR, -0.4, 0, -0.3);
  p.set(J.knR, 2.2);
  p.set(J.ftR, -0.6);
  p.set(J.spine, -0.5);
  p.set(J.chest, -0.2, 0.25, 0);
  p.set(J.neck, 0.5);
  p.set(J.head, 0.2);
  p.set(J.shL, -0.6, 0, 0.6);
  p.set(J.elL, -0.4);
  p.set(J.shR, 0.6, 0, -0.9);
  p.set(J.elR, -0.2);
  p.rootY = -0.62 + S(t * 30) * 0.01;
  p.pitch = -0.15;
  return p;
}

export function poseVault(p, k) {
  // k 0..1 through the vault; one hand planted, legs swing sideways
  const a = S(k * Math.PI);
  p.set(J.thL, -1.2 * a - 0.2, 0, 0.6 * a);
  p.set(J.thR, -1.0 * a - 0.1, 0, 0.5 * a);
  p.set(J.knL, 1.2 * a + 0.3);
  p.set(J.knR, 1.0 * a + 0.3);
  p.set(J.shL, -0.6 - 0.6 * a, 0, -0.1);
  p.set(J.elL, -0.1);
  p.set(J.shR, -0.3, 0, -0.9 * a);
  p.set(J.elR, -0.4);
  p.set(J.spine, 0.3 * a);
  p.set(J.chest, 0, -0.3 * a, 0);
  p.roll = -0.35 * a;
  p.rootY = -0.15 * a;
  return p;
}

export function poseMantle(p, k) {
  // k 0..1: hands up, pull, knee up, stand
  const reach = 1 - clamp(k * 2, 0, 1);
  const push = clamp(k * 2 - 0.3, 0, 1);
  p.set(J.shL, -2.6 * reach - 0.4 * push, 0, 0.2);
  p.set(J.shR, -2.6 * reach - 0.4 * push, 0, -0.2);
  p.set(J.elL, -0.3 * reach - 1.2 * push * (1 - k));
  p.set(J.elR, -0.3 * reach - 1.2 * push * (1 - k));
  const knee = S(clamp(k, 0, 1) * Math.PI);
  p.set(J.thL, -1.4 * knee, 0, 0.1);
  p.set(J.knL, 2.0 * knee);
  p.set(J.thR, -0.3 * knee, 0, -0.1);
  p.set(J.knR, 0.9 * knee);
  p.set(J.spine, 0.5 * knee);
  p.set(J.neck, -0.3 * reach);
  p.rootY = -0.2 * knee;
  return p;
}

export function poseClimb(p, phase) {
  const s = S(phase);
  p.set(J.shL, -2.5 + s * 0.5, 0, 0.25);
  p.set(J.shR, -2.5 - s * 0.5, 0, -0.25);
  p.set(J.elL, -0.6 - Math.max(0, s) * 0.8);
  p.set(J.elR, -0.6 - Math.max(0, -s) * 0.8);
  p.set(J.thL, -0.9 - s * 0.5, 0, 0.15);
  p.set(J.thR, -0.9 + s * 0.5, 0, -0.15);
  p.set(J.knL, 1.4 + s * 0.4);
  p.set(J.knR, 1.4 - s * 0.4);
  p.set(J.ftL, 0.3);
  p.set(J.ftR, 0.3);
  p.set(J.neck, -0.3);
  p.rootY = -0.05;
  return p;
}

export function poseHang(p, t) {
  p.set(J.shL, -2.9, 0, 0.3);
  p.set(J.shR, -2.9, 0, -0.3);
  p.set(J.elL, -0.25);
  p.set(J.elR, -0.25);
  p.set(J.thL, -0.3 + S(t * 2) * 0.1);
  p.set(J.thR, -0.1 - S(t * 2) * 0.1);
  p.set(J.knL, 0.6);
  p.set(J.knR, 0.4);
  p.set(J.neck, -0.35);
  return p;
}

export function poseSwim(p, phase) {
  const s = S(phase);
  p.pitch = 1.25;
  p.set(J.shL, -1.5 + s * 1.6, 0, 0.3);
  p.set(J.shR, -1.5 - s * 1.6, 0, -0.3);
  p.set(J.elL, -0.3);
  p.set(J.elR, -0.3);
  p.set(J.thL, S(phase * 2) * 0.3);
  p.set(J.thR, -S(phase * 2) * 0.3);
  p.set(J.knL, 0.3);
  p.set(J.knR, 0.3);
  p.set(J.neck, -0.9);
  p.rootY = -0.6;
  return p;
}

export function poseSit(p, driving = true) {
  p.set(J.thL, -1.5, 0, 0.12);
  p.set(J.thR, -1.5, 0, -0.12);
  p.set(J.knL, 1.4);
  p.set(J.knR, 1.4);
  p.set(J.spine, -0.15);
  if (driving) {
    p.set(J.shL, -1.1, 0, 0.15);
    p.set(J.shR, -1.1, 0, -0.15);
    p.set(J.elL, -0.6);
    p.set(J.elR, -0.6);
  } else {
    p.set(J.shL, -0.3, 0, 0.2);
    p.set(J.shR, -0.3, 0, -0.2);
    p.set(J.elL, -1.0);
    p.set(J.elR, -1.0);
  }
  p.rootY = -0.5;
  return p;
}

// Upper-body aim (pitch: aim pitch, rifle: two-handed)
export function poseAim(p, pitch, rifle, recoil = 0) {
  const a = -1.45 - pitch;
  p.set(J.chest, -pitch * 0.3, rifle ? 0.25 : 0.1, 0);
  p.set(J.spine, 0, rifle ? 0.15 : 0.05, 0);
  p.set(J.neck, pitch * 0.2, rifle ? -0.3 : -0.1, 0);
  p.set(J.shR, a - recoil * 0.3, 0.0, -0.05);
  p.set(J.elR, -0.05 - recoil * 0.4);
  p.set(J.haR, 0, 0, 0);
  if (rifle) {
    p.set(J.shL, a + 0.15 - recoil * 0.2, -0.5, 0.25);
    p.set(J.elL, -0.9);
  } else {
    p.set(J.shL, a + 0.1 - recoil * 0.2, -0.35, 0.15);
    p.set(J.elL, -0.4);
  }
  return p;
}

// Melee swing. kind: 0 punch-left, 1 punch-right, 2 hook, 3 weapon swing; k 0..1
export function poseMelee(p, kind, k) {
  const wind = clamp(k / 0.3, 0, 1);
  const strike = clamp((k - 0.3) / 0.25, 0, 1);
  const rec = clamp((k - 0.55) / 0.45, 0, 1);
  const e = strike * (1 - rec);
  const w = wind * (1 - strike);
  p.set(J.thL, -0.3, 0, 0.15);
  p.set(J.thR, 0.25, 0, -0.1);
  p.set(J.knL, 0.35);
  p.set(J.knR, 0.25);
  if (kind === 0) {
    p.set(J.shL, -0.9 - e * 0.7 + w * 0.3, 0, 0.3);
    p.set(J.elL, -1.8 + e * 1.6);
    p.set(J.shR, -0.7, 0, -0.3);
    p.set(J.elR, -2.0);
    p.set(J.chest, 0, -0.35 * e + 0.2 * w, 0);
  } else if (kind === 1) {
    p.set(J.shR, -0.9 - e * 0.75 + w * 0.3, 0, -0.3);
    p.set(J.elR, -1.8 + e * 1.65);
    p.set(J.shL, -0.7, 0, 0.3);
    p.set(J.elL, -2.0);
    p.set(J.chest, 0, 0.45 * e - 0.25 * w, 0);
    p.set(J.spine, 0.1 * e, 0.2 * e, 0);
  } else if (kind === 2) {
    p.set(J.shR, -1.3, 0.6 * e - 0.3 * w, -1.0 + 0.4 * e);
    p.set(J.elR, -1.4);
    p.set(J.shL, -0.8, 0, 0.3);
    p.set(J.elL, -2.0);
    p.set(J.chest, 0, 0.7 * e - 0.4 * w, 0);
    p.set(J.spine, 0, 0.3 * e - 0.2 * w, 0);
  } else {
    // two-handed overhead/side weapon swing
    const sw = e - w;
    p.set(J.shR, -1.6 - w * 1.0 + e * 0.8, 0.8 * sw, -0.4);
    p.set(J.elR, -0.8 + e * 0.6);
    p.set(J.shL, -1.4 - w * 0.9 + e * 0.7, 0.9 * sw, 0.5);
    p.set(J.elL, -1.0 + e * 0.5);
    p.set(J.chest, 0.1 * e, -0.6 * w + 0.9 * e, 0);
    p.set(J.spine, 0.15 * e, -0.3 * w + 0.4 * e, 0);
  }
  return p;
}

export function poseBlock(p) {
  p.set(J.shL, -1.4, 0, 0.6);
  p.set(J.elL, -2.2);
  p.set(J.shR, -1.4, 0, -0.6);
  p.set(J.elR, -2.2);
  p.set(J.chest, 0.15);
  p.set(J.neck, 0.15);
  return p;
}

export function poseDodge(p, k) {
  // forward roll: body pitches 360°
  const tuck = S(clamp(k, 0, 1) * Math.PI);
  p.pitch = k * Math.PI * 2;
  p.set(J.thL, -1.8 * tuck, 0, 0.1);
  p.set(J.thR, -1.8 * tuck, 0, -0.1);
  p.set(J.knL, 2.2 * tuck);
  p.set(J.knR, 2.2 * tuck);
  p.set(J.spine, 0.8 * tuck);
  p.set(J.neck, 0.6 * tuck);
  p.set(J.shL, -1.0 * tuck, 0, 0.3);
  p.set(J.shR, -1.0 * tuck, 0, -0.3);
  p.set(J.elL, -1.5 * tuck);
  p.set(J.elR, -1.5 * tuck);
  p.rootY = -0.5 * tuck;
  return p;
}

export function poseHit(p, dirSide, k) {
  const a = S(clamp(k, 0, 1) * Math.PI) * 0.6;
  p.add(J.spine, -a * 0.6, dirSide * a * 0.5, dirSide * a * 0.3);
  p.add(J.chest, -a * 0.4, 0, 0);
  p.add(J.neck, -a * 0.5, 0, 0);
  p.add(J.shL, a * 0.4, 0, a * 0.5);
  p.add(J.shR, a * 0.4, 0, -a * 0.5);
  return p;
}

export function poseCower(p, t) {
  poseCrouch(p, 0, 0);
  p.set(J.shL, -2.4, 0.5, 0.6);
  p.set(J.shR, -2.4, -0.5, -0.6);
  p.set(J.elL, -2.3 + S(t * 20) * 0.05);
  p.set(J.elR, -2.3 - S(t * 20) * 0.05);
  p.set(J.neck, 0.4);
  p.set(J.head, 0.3);
  return p;
}

export function poseTalk(p, t, seed) {
  const g = S(t * 2.3 + seed * 10);
  p.set(J.shR, -0.5 - Math.max(0, g) * 0.6, 0, -0.3);
  p.set(J.elR, -1.3 - g * 0.3);
  p.set(J.shL, -0.2 + S(t * 1.7 + seed) * 0.2, 0, 0.2);
  p.set(J.elL, -0.6);
  p.set(J.head, S(t * 3 + seed) * 0.08, S(t * 0.9 + seed) * 0.2, 0);
  return p;
}

export function posePhone(p) {
  p.set(J.shR, -0.4, 0.2, -1.2);
  p.set(J.elR, -2.4);
  p.set(J.neck, 0.1, 0, -0.15);
  return p;
}

export function posePanic(p, phase) {
  poseLocomotion(p, phase, 2.2);
  p.set(J.shL, -2.0 + S(phase) * 0.6, 0, 0.6);
  p.set(J.shR, -2.0 - S(phase) * 0.6, 0, -0.6);
  p.set(J.elL, -0.8);
  p.set(J.elR, -0.8);
  return p;
}

export function poseDead(p, side, k) {
  // fall to ground
  const f = clamp(k, 0, 1);
  const e = 1 - (1 - f) * (1 - f);
  p.pitch = -side * 1.5 * e;
  p.rootY = -0.75 * e;
  p.set(J.shL, -0.5 * e, 0, 1.2 * e);
  p.set(J.shR, -0.3 * e, 0, -1.0 * e);
  p.set(J.elL, -0.4 * e);
  p.set(J.elR, -0.6 * e);
  p.set(J.thL, -0.2 * e, 0, 0.3 * e);
  p.set(J.thR, 0.1 * e, 0, -0.2 * e);
  p.set(J.knL, 0.4 * e);
  p.set(J.knR, 0.2 * e);
  p.set(J.neck, 0.3 * e * side, 0.4 * e, 0);
  return p;
}

// --------------------------------------------------------------- solver ---
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1);

// Computes world matrices for each joint into out[] (Matrix4 array)
export function solveSkeleton(pose, rootMatrix, out, scale = 1) {
  for (let j = 0; j < NJ; j++) {
    const o = OFFS[j];
    if (j === 0) {
      _v.set(pose.rootX, o[1] * scale + pose.rootY * scale, pose.rootZ);
      _e.set(pose.pitch + pose.r[0], pose.r[1] + pose.yawOff, pose.roll + pose.r[2], 'YXZ');
    } else {
      _v.set(o[0] * scale, o[1] * scale, o[2] * scale);
      _e.set(pose.r[j * 3], pose.r[j * 3 + 1], pose.r[j * 3 + 2], 'XYZ');
    }
    _q.setFromEuler(_e);
    _m.compose(_v, _q, _s);
    if (j === 0) {
      // pivot body pitch around the hips: rotate about hip height
      out[j].multiplyMatrices(rootMatrix, _m);
    } else {
      out[j].multiplyMatrices(out[PARENT[j]], _m);
    }
  }
  return out;
}

export function makeJointMatrices() {
  const a = [];
  for (let i = 0; i < NJ; i++) a.push(new THREE.Matrix4());
  return a;
}

// ----------------------------------------------------------- appearance ---
// Body part definitions: [joint, geometry key, local offset/rotation, material slot]
export const PART_DEFS = [
  // joint, key, ox, oy, oz, sx, sy, sz, slot
  [J.hips, 'pelvis', 0, -0.02, 0, 1, 1, 1, 'legs'],
  [J.spine, 'abdomen', 0, 0.08, 0, 1, 1, 1, 'top'],
  [J.chest, 'chest', 0, 0.12, 0, 1, 1, 1, 'top'],
  [J.neck, 'neck', 0, 0.04, 0, 1, 1, 1, 'skin'],
  [J.head, 'head', 0, 0.11, 0.01, 1, 1, 1, 'skin'],
  [J.head, 'hair', 0, 0.11, 0.01, 1, 1, 1, 'hair'],
  [J.shL, 'upperArm', 0, -0.14, 0, 1, 1, 1, 'sleeve'],
  [J.elL, 'foreArm', 0, -0.13, 0, 1, 1, 1, 'forearm'],
  [J.haL, 'hand', 0, -0.06, 0, 1, 1, 1, 'skin'],
  [J.shR, 'upperArm', 0, -0.14, 0, 1, 1, 1, 'sleeve'],
  [J.elR, 'foreArm', 0, -0.13, 0, 1, 1, 1, 'forearm'],
  [J.haR, 'hand', 0, -0.06, 0, 1, 1, 1, 'skin'],
  [J.thL, 'thigh', 0, -0.22, 0, 1, 1, 1, 'legs'],
  [J.knL, 'shin', 0, -0.21, 0, 1, 1, 1, 'legs'],
  [J.ftL, 'foot', 0, -0.03, 0.06, 1, 1, 1, 'shoes'],
  [J.thR, 'thigh', 0, -0.22, 0, 1, 1, 1, 'legs'],
  [J.knR, 'shin', 0, -0.21, 0, 1, 1, 1, 'legs'],
  [J.ftR, 'foot', 0, -0.03, 0.06, 1, 1, 1, 'shoes'],
];

function taperedCapsule(r0, r1, len, seg = 10) {
  // lathe profile from bottom (r0) to top (r1), centred
  const pts = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * r0, -len / 2 + Math.sin(a) * r0));
  }
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.cos(a) * r1, len / 2 + Math.sin(a) * r1));
  }
  const g = new THREE.LatheGeometry(pts, seg);
  g.computeVertexNormals();
  return g;
}

let _geoCache = null;
export function bodyGeometries() {
  if (_geoCache) return _geoCache;
  const g = {};
  g.pelvis = new THREE.SphereGeometry(1, 14, 10); g.pelvis.scale(0.17, 0.12, 0.115);
  g.abdomen = taperedCapsule(0.13, 0.145, 0.08, 14); g.abdomen.scale(1.05, 1, 0.75);
  const ch = taperedCapsule(0.14, 0.17, 0.16, 14); ch.scale(1.15, 1, 0.72); g.chest = ch;
  g.neck = taperedCapsule(0.05, 0.045, 0.06, 10);
  const head = new THREE.SphereGeometry(1, 20, 16);
  {
    // shape: jaw narrower, back of head rounder, a nose bump
    const p = head.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const jaw = y < -0.2 ? 1 - (-0.2 - y) * 0.45 : 1;
      x *= jaw; z *= y < 0 ? 0.95 : 1;
      if (z > 0.75 && Math.abs(x) < 0.18 && y > -0.35 && y < 0.15) z += 0.12 * (1 - Math.abs(x) / 0.18) * (1 - Math.abs(y + 0.1) / 0.25);
      p.setXYZ(i, x * 0.098, y * 0.125, z * 0.112);
    }
    head.computeVertexNormals();
  }
  g.head = head;
  const hair = new THREE.SphereGeometry(1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
  hair.scale(0.106, 0.13, 0.12);
  hair.translate(0, 0.012, -0.008);
  g.hair = hair;
  g.upperArm = taperedCapsule(0.045, 0.058, 0.2, 10);
  g.foreArm = taperedCapsule(0.036, 0.046, 0.18, 10);
  const hand = new THREE.BoxGeometry(0.075, 0.1, 0.035, 2, 2, 1);
  g.hand = hand;
  g.thigh = taperedCapsule(0.062, 0.088, 0.3, 12);
  g.shin = taperedCapsule(0.045, 0.06, 0.3, 10);
  const foot = new THREE.BoxGeometry(0.095, 0.075, 0.25, 2, 1, 3);
  {
    const p = foot.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i), y = p.getY(i);
      if (z > 0.05 && y > 0) p.setY(i, y - (z - 0.05) * 0.3);
    }
    foot.computeVertexNormals();
  }
  g.foot = foot;
  // accessories
  const coat = new THREE.CylinderGeometry(0.2, 0.27, 0.62, 16, 3, true);
  coat.translate(0, -0.31, 0);
  g.coat = coat;
  const cap = new THREE.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  cap.scale(0.115, 0.08, 0.125);
  g.cap = cap;
  const brim = new THREE.CylinderGeometry(0.11, 0.11, 0.01, 12, 1, false, -Math.PI / 2, Math.PI);
  brim.translate(0, 0, 0.06);
  g.brim = brim;
  const visor = new THREE.BoxGeometry(0.2, 0.05, 0.04);
  g.visor = visor;
  const mask = new THREE.SphereGeometry(1, 12, 8, -Math.PI / 2, Math.PI, Math.PI * 0.45, Math.PI * 0.35);
  mask.scale(0.105, 0.13, 0.12);
  g.mask = mask;
  const helmet = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
  helmet.scale(0.125, 0.14, 0.135);
  g.helmet = helmet;
  const pack = new THREE.BoxGeometry(0.28, 0.36, 0.14, 2, 2, 2);
  pack.translate(0, 0.05, -0.17);
  g.backpack = pack;
  const ring = new THREE.TorusGeometry(0.11, 0.018, 8, 24);
  ring.translate(0, 0.06, -0.165);
  g.harness = ring;
  const longhair = new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.75);
  longhair.scale(0.112, 0.17, 0.125);
  longhair.translate(0, -0.02, -0.015);
  g.longhair = longhair;
  _geoCache = g;
  return g;
}
