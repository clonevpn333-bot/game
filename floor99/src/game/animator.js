// Character animation: clip-based pose targets blended per joint, analytic leg IK that plants the
// feet (stance / swing phases), two-bone arm IK onto weapon grips, landing absorption, and tuning
// that the Animation Studio (F8) can edit live.
import * as THREE from 'three';

export const AnimationTuning = { blend: 18, grips: {} };
try {
  const saved = JSON.parse(localStorage.getItem('floor99.animation.v3') || 'null');
  if (saved && Number.isFinite(saved.blend)) AnimationTuning.blend = Math.max(8, Math.min(30, saved.blend));
  if (saved?.grips && typeof saved.grips === 'object') {
    for (const [key, p] of Object.entries(saved.grips)) {
      if (Array.isArray(p) && p.length === 3 && p.every((v) => Number.isFinite(v) && Math.abs(v) <= 0.08)) AnimationTuning.grips[key] = p;
    }
  }
} catch { /* storage unavailable */ }
export function saveAnimationTuning() { try { localStorage.setItem('floor99.animation.v3', JSON.stringify(AnimationTuning)); } catch { /* ignore */ } }

export const poseDefaults = {
  bodyRX: 0, bodyRZ: 0, bodyY: 0, bodyZ: 0, hipsY: 0.98, hipsRX: 0, hipsRY: 0, hipsRZ: 0, spineRX: 0,
  chestRX: 0, chestRY: 0, chestRZ: 0, headRX: 0, headRY: 0, hipLX: 0, hipRX: 0, hipLZ: 0.04, hipRZ: -0.04,
  kneeL: 0.06, kneeR: 0.06, footL: 0, footR: 0, shLX: 0, shRX: 0, shLZ: 0.12, shRZ: -0.12, shLY: 0, shRY: 0, elL: -0.25, elR: -0.25,
};
const jointRotationMap = {
  body: ['bodyRX', null, 'bodyRZ'], hips: ['hipsRX', 'hipsRY', 'hipsRZ'], spine: ['spineRX'], chest: ['chestRX', 'chestRY', 'chestRZ'],
  head: ['headRX', 'headRY'], hipL: ['hipLX', null, 'hipLZ'], hipR: ['hipRX', null, 'hipRZ'], kneeL: ['kneeL'], kneeR: ['kneeR'],
  footL: ['footL'], footR: ['footR'], shoulderL: ['shLX', 'shLY', 'shLZ'], shoulderR: ['shRX', 'shRY', 'shRZ'], elbowL: ['elL'], elbowR: ['elR'],
};
const AXES = ['x', 'y', 'z'];
export const clamp01 = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };

// leg geometry (thigh = shin = 0.42, ankle 0.12 above the sole, toe 0.245 / heel 0.115 from the ankle)
const LEG = 0.42, ANKLE = 0.12, TOE = 0.245, HEEL = 0.115;

// Run cadence (strides per second) rises with speed: ~2.1 at a jog, ~2.7 flat-out.
const runCadence = (speed) => 1.55 + 0.085 * Math.min(speed, 16);
export function movementPhaseRate(speed, clip) {
  if (clip === 'swim') return 2.1 + Math.min(2, speed * 0.24);
  if (speed < 0.3) return 0.2;
  return clip === 'run' || clip === 'wallrun' ? 2 * Math.PI * runCadence(speed) : Math.min(10, 3.8 + speed * 0.6);
}

// Running legs. The planted foot slides back at exactly ground speed (no skating): stance time and
// stride come from speed + cadence and are clamped to what the leg can reach. Swing = toe-off, heel
// kick, high knee drive, reach, then a little paw-back before the next strike.
function runLegs(p, s, phase) {
  const sp = Math.max(0.5, s.speed), f = runCadence(sp), sprint = clamp01((sp - 8) / 5);
  const stance = clamp01(0.42 - 0.016 * sp, 0.2, 0.4), back = s.moveBack ? -1 : 1;
  const H = p.hipsY - 0.07 - ANKLE, reach = Math.sqrt(Math.max(0, (2 * LEG * 0.985) ** 2 - H * H));
  const half = Math.min(reach * 0.94, sp * (stance / f) / 2);
  for (const [side, offset] of [['L', 0], ['R', Math.PI]]) {
    const u = ((phase + offset) / (2 * Math.PI) % 1 + 1) % 1;
    let z, y, foot;
    if (u < stance) {
      const a = u / stance, roll = ease((a - 0.62) / 0.38);
      z = half * (1 - 2 * a);
      foot = roll * (0.55 + 0.25 * sprint);            // roll up onto the toe for push-off
      y = ANKLE + Math.sin(foot) * TOE;
    } else {
      const v = (u - stance) / (1 - stance);
      const reachZ = half * (1.12 + 0.1 * sprint);
      z = v < 0.86 ? -half + (reachZ + half) * ease(v / 0.86) : reachZ - (reachZ - half) * ease((v - 0.86) / 0.14);
      const lift = (0.32 + 0.26 * sprint) * Math.pow(Math.sin(Math.PI * Math.pow(v, 0.6)), 1.5); // early, high heel recovery; comes down for the strike
      foot = (0.75 + 0.2 * sprint) * (1 - ease(v / 0.45)) - 0.18 * ease((v - 0.55) / 0.45);
      y = ANKLE + TOE * Math.max(0, Math.sin(foot)) + HEEL * Math.max(0, -Math.sin(foot)) + lift;
    }
    solveLeg(p, side, z * back, y - (p.hipsY - 0.07), foot);
  }
}

// Solve hip/knee/foot so each ankle follows a stance (planted, sliding back) / swing (lifted, forward) path.
function parkourLegs(p, s, phase, running = false) {
  const stride = (running ? 0.33 : 0.24) * clamp01(s.speed / (running ? 8 : 4)), back = s.moveBack ? -1 : 1;
  for (const [side, offset] of [['L', 0], ['R', Math.PI]]) {
    const u = ((phase + offset) / (2 * Math.PI) % 1 + 1) % 1, stance = running ? 0.38 : 0.62, v = clamp01((u - stance) / (1 - stance));
    let z, ankleY, foot;
    if (s.speed < 0.35) { z = side === 'L' ? 0.025 : -0.025; ankleY = ANKLE; foot = 0; }
    else if (u < stance) {
      const push = ease((u / stance - 0.65) / 0.35);
      z = stride * (1 - 2 * u / stance) * back; foot = 0.03 + push * (running ? 0.48 : 0.28); ankleY = ANKLE + Math.sin(foot) * TOE;
    } else {
      z = (-stride + 2 * stride * ease(v)) * back;
      foot = (running ? 0.51 : 0.31) * (1 - ease(v)) + 0.03 * ease(v) - (running ? 0.75 : 0.5) * Math.sin(v * Math.PI);
      ankleY = ANKLE + TOE * Math.max(0, Math.sin(foot)) + HEEL * Math.max(0, -Math.sin(foot)) + Math.sin(v * Math.PI) * (running ? 0.4 : 0.18);
    }
    solveLeg(p, side, z, ankleY - (p.hipsY - 0.07), foot);
  }
}
function solveLeg(p, side, z, y, footPitch) {
  const length = Math.hypot(y, z), d = clamp01(length, 0.1, 2 * LEG - 0.002), scale = d / Math.max(0.001, length);
  const knee = Math.acos(clamp01((d * d - LEG * LEG * 2) / (LEG * LEG * 2), -1, 1));
  p['hip' + side + 'X'] = Math.atan2(-z * scale, -y * scale) - Math.atan2(LEG * Math.sin(knee), LEG + LEG * Math.cos(knee));
  p['knee' + side] = knee;
  p['foot' + side] = footPitch - p['hip' + side + 'X'] - knee;
}
// Blending safe poses can still put a boot through the floor; resolve contact after blending.
function keepFeetAboveFloor(p) {
  for (const side of ['L', 'R']) {
    let hip = p['hip' + side + 'X'], knee = p['knee' + side];
    const pitch = hip + knee + p['foot' + side];
    let y = -LEG * Math.cos(hip) - LEG * Math.cos(hip + knee);
    const z = -LEG * Math.sin(hip) - LEG * Math.sin(hip + knee);
    const sole = p.hipsY - 0.07 + y - ANKLE * Math.cos(pitch) - Math.max(TOE * Math.sin(pitch), -HEEL * Math.sin(pitch));
    if (sole >= 0.008) continue;
    y += 0.008 - sole;
    const d = clamp01(Math.hypot(y, z), 0.1, 2 * LEG - 0.002);
    knee = Math.acos(clamp01((d * d - LEG * LEG * 2) / (LEG * LEG * 2), -1, 1));
    hip = Math.atan2(-z, -y) - Math.atan2(LEG * Math.sin(knee), LEG + LEG * Math.cos(knee));
    p['hip' + side + 'X'] = hip; p['knee' + side] = knee; p['foot' + side] = pitch - hip - knee;
  }
}

export const AnimationClips = {
  idle(p, s, t) {
    p.hipsY = 1.015 + Math.sin(t * 1.6) * 0.004; p.chestRX = Math.sin(t * 1.6) * 0.014; p.hipsRZ = Math.sin(t * 0.65) * 0.018;
    p.headRY = Math.sin(t * 0.31) * 0.12; p.shLX = -0.08; p.shRX = -0.08; p.elL = -0.28; p.elR = -0.28;
    parkourLegs(p, { ...s, speed: 0 }, 0);
  },
  walk(p, s, t, phase) {
    const amount = clamp01(s.speed / 5), a = Math.cos(phase + Math.PI * 0.2);
    p.hipsY = 0.985 - Math.pow(Math.sin(phase), 2) * 0.018 * amount; p.hipsRY = a * 0.07 * amount; p.chestRY = -a * 0.1 * amount;
    p.shLX = a * 0.44 * amount; p.shRX = -a * 0.44 * amount; p.elL = -0.45; p.elR = -0.45; p.spineRX = 0.07 * amount; p.chestRZ = -s.strafe * 0.045;
    parkourLegs(p, s, phase);
  },
  run(p, s, t, phase) {
    const sp = s.speed, sprint = clamp01((sp - 8) / 5), turn = s.turn || 0, drive = clamp01((s.accel || 0) / 18, -1, 1);
    const stance = clamp01(0.42 - 0.016 * sp, 0.2, 0.4);
    // pelvis: dips through each mid-stance, rises in the flight phase
    const w = ((phase / Math.PI) % 1 + 1) % 1;
    const bob = w < stance ? -Math.sin(Math.PI * w / stance) : Math.sin(Math.PI * (w - stance) / (1 - stance)) * 0.8;
    p.hipsY = 0.94 - 0.045 * sprint + bob * (0.03 + 0.012 * sprint);
    const a = Math.cos(phase + 0.25), side = Math.sin(phase) >= 0 ? 1 : -1;
    // torso: forward lean (more when sprinting / accelerating), counter-rotation, lean into turns
    p.spineRX = 0.2 + sprint * 0.16 + drive * 0.1; p.chestRX = 0.04 + bob * 0.03;
    p.headRX = -(p.spineRX + p.chestRX) * 0.75;
    p.hipsRY = a * (0.13 + 0.05 * sprint); p.chestRY = -a * (0.2 + 0.06 * sprint); p.headRY = a * 0.06;
    p.hipsRZ = -side * 0.045 * (1 - Math.abs(bob)) - turn * 0.02; p.chestRZ = -turn * 0.1 - s.strafe * 0.05;
    p.bodyRZ = -turn * (0.16 + 0.08 * sprint);
    // arms: big counter-swing (hand to chin in front, past the hip behind), elbows tighter when forward
    for (const [sd, sign] of [['L', 1], ['R', -1]]) {
      const k = a * sign, fwd = Math.max(0, -k), bk = Math.max(0, k);
      p['sh' + sd + 'X'] = -0.15 - fwd * (1.05 + 0.3 * sprint) + bk * (0.62 + 0.2 * sprint);
      p['el' + sd] = -1.2 - fwd * (0.45 + 0.15 * sprint) + bk * 0.2;
      p['sh' + sd + 'Z'] = sign * (0.16 + fwd * 0.08);
      p['sh' + sd + 'Y'] = sign * fwd * 0.18;
    }
    runLegs(p, s, phase);
  },
  crouch(p, s, t, phase) { AnimationClips.walk(p, s, t, phase); p.hipsY = 0.74; p.spineRX = 0.18; p.headRX = -0.12; parkourLegs(p, s, phase); },
  jump(p, s) {
    const drive = ease((s.airAge || 0) / 0.18), apex = 1 - clamp01(Math.abs(s.vy) / 5), fast = clamp01(s.speed / 8);
    const lead = s.leadSide > 0 ? 'L' : 'R', trail = lead === 'L' ? 'R' : 'L';
    p.spineRX = 0.08 + fast * 0.14; p.headRX = -0.1; p.hipsRY = (s.leadSide || 1) * 0.12 * drive; p.chestRY = -p.hipsRY * 0.6;
    p['hip' + lead + 'X'] = -0.1 - drive * (0.65 + apex * 0.25); p['knee' + lead] = 0.2 + drive * (0.9 + apex * 0.3);
    p['hip' + trail + 'X'] = 0.45 * (1 - drive) - 0.12 * apex; p['knee' + trail] = 0.25 + 0.6 * drive;
    p.footL = p.footR = 0.18; p.shLX = -1.3 + drive * 0.6; p.shRX = -1.15 + drive * 0.45; p.shLZ = 0.3; p.shRZ = -0.3; p.elL = -0.65; p.elR = -0.65;
  },
  doubleJump(p, s) {
    const u = 1 - clamp01(s.flip), tuck = Math.sin(u * Math.PI), side = s.leadSide || 1;
    p.spineRX = 0.12 + tuck * 0.16; p.hipsRY = Math.sin(u * Math.PI * 2) * 0.28 * side; p.chestRY = -p.hipsRY * 0.5;
    p.hipLX = -0.55 - 0.7 * tuck; p.hipRX = -0.45 - 0.85 * tuck; p.kneeL = 0.7 + 1.1 * tuck; p.kneeR = 0.6 + 1.2 * tuck; p.footL = p.footR = 0.25;
    p.shLX = -1.8 + tuck * 0.9; p.shRX = -1.65 + tuck * 0.85; p.shLZ = 0.4; p.shRZ = -0.4; p.elL = p.elR = -0.6;
  },
  fall(p, s) {
    const reach = ease((-s.vy - 1) / 8), lead = (s.leadSide || 1) * clamp01(s.speed / 10);
    p.spineRX = 0.08; p.headRX = -0.08; p.hipLX = -0.25 - 0.25 * reach - 0.12 * lead; p.hipRX = -0.25 - 0.25 * reach + 0.12 * lead;
    p.kneeL = 0.7 - 0.34 * reach; p.kneeR = 0.7 - 0.34 * reach; p.footL = p.footR = 0.14;
    p.shLX = -0.45; p.shRX = -0.45; p.shLZ = 0.5; p.shRZ = -0.5; p.elL = -0.65; p.elR = -0.65;
  },
  landing(p, s, t, phase) {
    const duration = 0.26 + 0.13 * s.landingSeverity, u = clamp01(s.landingAge / duration);
    const absorb = ease(u / 0.25) * (1 - ease((u - 0.25) / 0.75)) * s.landingSeverity;
    (s.speed > 6.8 ? AnimationClips.run : s.speed > 0.5 ? AnimationClips.walk : AnimationClips.idle)(p, s, t, phase);
    p.hipsY -= absorb * 0.24; p.spineRX += absorb * 0.32; p.headRX -= absorb * 0.2; p.shLX -= absorb * 0.5; p.shRX -= absorb * 0.5; p.shLZ += absorb * 0.24; p.shRZ -= absorb * 0.24;
    if (s.speed > 6.8) runLegs(p, s, phase); else parkourLegs(p, s, phase);
  },
  slide(p) { p.hipsY = 0.46; p.bodyRX = -0.24; p.spineRX = 0.13; p.hipLX = -0.5; p.kneeL = 1.65; p.hipRX = -1.25; p.kneeR = 0.18; p.footR = -0.25; p.hipLZ = 0.2; p.shLZ = 0.42; p.elL = -0.65; },
  dodge(p, s) {
    const u = clamp01(s.dodgeT), pulse = Math.sin(u * Math.PI);
    p.hipsY = 0.98 - 0.28 * pulse; p.bodyRX = -0.2 * pulse; p.bodyRZ = (s.dodgeBack ? 1 : -1) * 0.3 * pulse;
    p.hipLX = -0.5 * pulse; p.hipRX = -0.65 * pulse; p.kneeL = 1.2 * pulse; p.kneeR = 1.35 * pulse; p.shLX = -0.8 * pulse; p.shRX = -0.8 * pulse; p.elL = -1.1; p.elR = -1.1;
  },
  vault(p, s) {
    const u = clamp01(s.vaultProgress ?? 0.5), clear = Math.sin(u * Math.PI);
    p.spineRX = 0.15 + clear * 0.25; p.hipLX = -0.3 - clear * 1.05; p.hipRX = -0.15 - clear * 0.8; p.kneeL = 0.4 + clear * 1.4; p.kneeR = 0.3 + clear * 1.25;
    p.hipsRY = clear * 0.2; p.headRX = -0.22; p.shLX = -1.6 + u * 0.8; p.shRX = -1.35 + u * 0.75; p.elL = -0.2 - clear * 0.4; p.elR = -0.2 - clear * 0.4;
  },
  wallrun(p, s, t, phase) {
    AnimationClips.run(p, s, t, phase); p.bodyRZ = -0.32 * s.wallSide; p.spineRX = 0.08;
    if (s.wallSide > 0) { p.shRZ = -1.2; p.elR = -0.25; } else { p.shLZ = 1.2; p.elL = -0.25; }
  },
  grapple(p, s) { AnimationClips.fall(p, s); p.shLX = -2.75; p.shLZ = 0.1; p.elL = -0.05; p.hipLX = -0.65; p.kneeL = 1.1; p.hipRX = -0.1; p.kneeR = 0.55; },
  swim(p, s, t, phase) {
    const blend = ease(clamp01(s.speed / 2.4));
    p.bodyRX = 0.16 + 1.18 * blend + clamp01(s.aimPitch || 0, -0.4, 0.4) * blend * 0.4; p.hipsY = 0.94; p.headRX = -p.bodyRX * 0.82;
    p.bodyRZ = Math.sin(phase) * 0.045 * blend; p.hipsRY = Math.sin(phase) * 0.025 * blend;
    // rotate around the hips, keeping the swimmer beside the collision capsule and waterline
    p.bodyY = p.hipsY * (1 - Math.cos(p.bodyRX) * Math.cos(p.bodyRZ)) + (s.underwater ? 0 : 0.12) * blend;
    p.bodyZ = -p.hipsY * Math.sin(p.bodyRX) * Math.cos(p.bodyRZ);
    p.hipLX = Math.sin(phase * 2) * 0.18 * blend - 0.08; p.hipRX = -Math.sin(phase * 2) * 0.18 * blend - 0.08;
    p.kneeL = 0.18 + Math.max(0, Math.sin(phase * 2)) * 0.23; p.kneeR = 0.18 + Math.max(0, -Math.sin(phase * 2)) * 0.23; p.footL = 0.24; p.footR = 0.24;
    for (const [side, offset] of [['L', 0], ['R', Math.PI]]) {
      const u = ((phase + offset) / (Math.PI * 2) % 1 + 1) % 1;
      let shoulder, elbow, spread;
      if (s.underwater) {
        const pull = ease((u - 0.12) / 0.5), recover = ease((u - 0.62) / 0.38);
        shoulder = -2.85 + 2.2 * pull - 2.2 * recover; elbow = -0.2 - 0.65 * Math.sin(u * Math.PI); spread = (side === 'L' ? 1 : -1) * (0.18 + 0.48 * Math.sin(u * Math.PI));
      } else {
        if (u < 0.22) { shoulder = -2.9 + 0.5 * ease(u / 0.22); elbow = -0.15 - 0.35 * ease(u / 0.22); }
        else if (u < 0.62) { const a = ease((u - 0.22) / 0.4); shoulder = -2.4 + 2.05 * a; elbow = -0.5 - 0.55 * Math.sin(a * Math.PI); }
        else { const a = ease((u - 0.62) / 0.38); shoulder = -0.35 - 2.55 * a; elbow = -0.5 - Math.sin(a * Math.PI) + 0.35 * a; }
        spread = (side === 'L' ? 1 : -1) * (0.29 + (u > 0.62 ? 0.5 * Math.sin((u - 0.62) / 0.38 * Math.PI) : 0));
      }
      const idleShoulder = -0.55 + Math.sin(t * 2.4 + offset) * 0.18, idleElbow = -0.7 - Math.sin(t * 2.4 + offset) * 0.18;
      p['sh' + side + 'X'] = idleShoulder + (shoulder - idleShoulder) * blend;
      p['sh' + side + 'Z'] = (side === 'L' ? 0.75 : -0.75) * (1 - blend) + spread * blend;
      p['el' + side] = idleElbow + (elbow - idleElbow) * blend;
    }
  },
  dead(p) { p.bodyRX = -1.35; p.hipsY = 0.35; p.hipLX = -0.45; p.hipRX = 0.2; p.kneeL = 0.8; p.kneeR = 0.35; p.shLX = -1.8; p.shRX = -1.4; },
};

// Melee poses (blade 3-hit combo, overhead hammer slam), applied on top of the movement clip.
export function meleePose(pose, state) {
  const t = clamp01(state.meleeT);
  if (state.meleeKind === 'hammer') {
    const lift = ease(t / 0.37), strike = ease((t - 0.37) / 0.14), settle = ease((t - 0.56) / 0.44);
    const angle = (-0.6 - 2.5 * lift + 3.4 * strike) * (1 - settle) - 0.6 * settle;
    pose.shRX = pose.shLX = angle; pose.shLZ = -0.3; pose.shRZ = 0.3; pose.shLY = -0.15; pose.elR = -0.35; pose.elL = -0.65;
    pose.spineRX = -0.2 * lift + 0.64 * strike * (1 - settle); pose.chestRX = -0.12 * lift + 0.24 * strike * (1 - settle); pose.hipsY -= 0.12 * strike * (1 - settle);
    return;
  }
  const step = state.meleeStep % 3, wind = ease(t / 0.2), cut = ease((t - 0.2) / 0.19), recover = ease((t - 0.43) / 0.57);
  const swing = (-0.8 * wind + 1.8 * cut) * (1 - recover), side = step === 1 ? -1 : 1;
  pose.chestRY = -swing * 0.7 * side; pose.hipsRY = -swing * 0.18 * side; pose.spineRX = 0.12 + 0.15 * cut * (1 - recover);
  pose.hipLX = -0.32; pose.kneeL = 0.48; pose.hipRX = 0.2; pose.kneeR = 0.24;
  if (step === 2) { pose.shRX = pose.shLX = -1.35; pose.shRZ = -1.05 * (1 - recover); pose.shLZ = 1.05 * (1 - recover); pose.shRY = -swing * 0.75; pose.shLY = -swing * 0.75; pose.elR = pose.elL = -0.25; return; }
  if (step === 0) { pose.shRX = -1.4; pose.shRY = -swing * 1.3; pose.shRZ = -0.24; pose.elR = -0.25; pose.shLX = -0.5; pose.shLZ = 0.45; }
  else { pose.shLX = -1.4; pose.shLY = swing * 1.3; pose.shLZ = 0.24; pose.elL = -0.25; pose.shRX = -0.5; pose.shRZ = -0.45; }
}

const _q0 = new THREE.Quaternion();
export class CharacterAnimator {
  constructor(rig) {
    this.rig = rig; this.time = 0; this.phase = 0;
    this.pose = { ...poseDefaults }; this.target = { ...poseDefaults };
    this.speed = 0; this.clip = 'idle'; this.transition = 1; this.gripErrors = { right: 0, left: 0 };
    this.wasGrounded = true; this.previousVy = 0; this.airAge = 0; this.leadSide = 1;
    this.landingAge = 99; this.landingSeverity = 0; this.accel = 0; this.previousSpeed = 0;
  }
  choose(s) {
    if (s.mode === 'dead') return 'dead';
    if (['swim', 'slide', 'dodge', 'vault', 'wallrun', 'grapple'].includes(s.mode)) return s.mode;
    if (!s.grounded) return s.flip > 0 ? 'doubleJump' : s.vy > 0 ? 'jump' : 'fall';
    if (s.crouch) return 'crouch';
    if (s.landingAge < 0.26 + 0.13 * s.landingSeverity) return 'landing';
    if (s.speed > 0.5) return s.sprint || s.speed > 6.8 ? 'run' : 'walk';
    return 'idle';
  }
  update(dt, state = {}) {
    dt = clamp01(dt, 0.0001, 0.05);
    const s = { speed: 0, grounded: true, vy: 0, mode: 'normal', strafe: 0, aimPitch: 0, ...state };
    this.state = s;
    this.action = s.melee > 0 ? 'melee' : s.reloading > 0 ? 'reload' : (s.recoil || 0) > 0.01 ? 'fire' : s.aiming ? 'aim' : s.weaponHand ? 'ready' : 'free';
    if (s.sample) { this.time = s.sample.time; this.phase = s.sample.phase; this.speed = s.speed; }
    else { this.time += dt; this.speed += (s.speed - this.speed) * (1 - Math.exp(-dt * 16)); }
    s.speed = this.speed;
    const acceleration = clamp01(((state.speed || 0) - this.previousSpeed) / dt, -24, 24);
    this.accel += (acceleration - this.accel) * (1 - Math.exp(-dt * 10)); this.previousSpeed = state.speed || 0; s.accel = state.accel ?? this.accel;
    if (!s.grounded && (this.wasGrounded || s.vy - this.previousVy > 4.5)) { this.airAge = 0; this.leadSide = Math.sin(this.phase) >= 0 ? 1 : -1; }
    if (s.grounded && !this.wasGrounded && s.mode === 'normal') { this.landingAge = 0; this.landingSeverity = clamp01(Math.abs(this.previousVy) / 16, 0.25, 1); }
    else this.landingAge += dt;
    if (s.grounded) this.airAge = 0; else this.airAge += dt;
    s.airAge = state.airAge ?? this.airAge; s.leadSide = state.leadSide ?? this.leadSide;
    s.landingAge = state.landingAge ?? this.landingAge; s.landingSeverity = state.landingSeverity ?? this.landingSeverity;
    this.wasGrounded = s.grounded; this.previousVy = s.vy;

    const clip = this.choose(s);
    if (clip !== this.clip) { this.previous = this.clip; this.clip = clip; this.transition = 0; }
    this.transition = Math.min(1, this.transition + dt * 8);
    if (!s.sample) this.phase += dt * movementPhaseRate(s.speed, clip);
    this.rig.phase = this.phase; this.rig.time = this.time;

    const p = this.target;
    Object.assign(p, poseDefaults);
    AnimationClips[clip](p, s, this.time, this.phase);
    if (s.melee > 0 && !['swim', 'dodge', 'dead', 'vault'].includes(clip)) meleePose(p, s);
    else if (s.weaponHand && !['swim', 'dead', 'vault', 'dodge'].includes(clip)) {
      const aim = s.aiming ? 1 : 0;
      p.chestRX -= s.aimPitch * 0.34 + p.spineRX * 0.25; p.chestRY *= 0.4; p.headRX -= s.aimPitch * 0.5;
      p.chestRX -= (s.recoil || 0) * 0.11; p.spineRX -= (s.recoil || 0) * 0.05;
      p.shRX = -0.8 - aim * 0.35; p.elR = -0.8;
      if (s.twoHanded) { p.shLX = -0.9; p.elL = -0.85; }
    }
    p.headRY += clamp01(s.headYaw || 0, -0.5, 0.5);
    const rate = s.melee > 0 ? Math.max(28, AnimationTuning.blend) : AnimationTuning.blend, alpha = s.snap ? 1 : 1 - Math.exp(-dt * rate);
    for (const key of Object.keys(this.pose)) this.pose[key] += (p[key] - this.pose[key]) * alpha;
    if (s.grounded && ['idle', 'walk', 'run', 'crouch', 'landing'].includes(clip)) keepFeetAboveFloor(this.pose);

    const j = this.rig.j;
    for (const [name, keys] of Object.entries(jointRotationMap)) {
      const joint = j[name]; if (!joint) continue;
      for (let i = 0; i < keys.length; i++) if (keys[i]) joint.rotation[AXES[i]] = this.pose[keys[i]];
    }
    j.shoulderL.position.z = 0; j.shoulderR.position.z = 0;
    j.hips.position.y = this.pose.hipsY; j.body.position.y = this.pose.bodyY; j.body.position.z = this.pose.bodyZ;
    j.body.scale.setScalar(1);
    this.rig.root.updateMatrixWorld(true);
    j.handR?.quaternion.slerp(_q0, 1 - Math.exp(-dt * 12)); j.handL?.quaternion.slerp(_q0, 1 - Math.exp(-dt * 12));
    this.updateFingers(s, dt);
    // weapon carry bob: the gun rides the torso's bounce and sway instead of floating rigidly
    const moving = (clip === 'run' || clip === 'walk' || clip === 'landing') ? clamp01(s.speed / 9) : 0;
    const cb = this.rig.carryBob || (this.rig.carryBob = { x: 0, y: 0, roll: 0 });
    cb.x += (Math.sin(this.phase) * 0.018 * moving - cb.x) * (1 - Math.exp(-dt * 20));
    cb.y += ((Math.abs(Math.cos(this.phase)) - 0.6) * 0.03 * moving - cb.y) * (1 - Math.exp(-dt * 20));
    cb.roll += (Math.sin(this.phase) * 0.06 * moving - cb.roll) * (1 - Math.exp(-dt * 12));
    if (s.melee > 0 && s.meleeKind === 'hammer') animateHammer(this.rig, s);
  }
  updateFingers(s, dt) {
    if (!this.rig.fingers) return;
    for (const side of ['R', 'L']) {
      for (let i = 0; i < this.rig.fingers[side].length; i++) {
        const finger = this.rig.fingers[side][i], holding = s.weaponHand && s.mode !== 'swim' && (side === 'R' || s.twoHanded || s.aiming);
        const curl = s.mode === 'swim' ? 0.18 : s.melee > 0 ? 0.9 : holding ? (i === 0 ? 0.45 : 1.05) : 0.32;
        finger.rotation.x += (curl - finger.rotation.x) * (1 - Math.exp(-dt * 24));
        finger.children[1].rotation.x = finger.rotation.x * 0.55;
      }
    }
  }
}

// Two-bone world-space IK that preserves the actual upper-arm and forearm lengths.
const _s = new THREE.Vector3(), _sc = new THREE.Vector3(), _d = new THREE.Vector3(), _pole = new THREE.Vector3(), _mid = new THREE.Vector3(), _end = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0), _w = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _rq = new THREE.Quaternion(), _hp = new THREE.Vector3();
export function solveArmIK(rig, side, target, gripQuaternion) {
  const shoulder = rig.j['shoulder' + side], elbow = rig.j['elbow' + side], hand = rig.j['hand' + side];
  if (!shoulder || !elbow || !hand) return 0;
  shoulder.updateWorldMatrix(true, true);
  const start = shoulder.getWorldPosition(_s), scale = shoulder.getWorldScale(_sc).x;
  const l1 = elbow.position.length() * scale, l2 = hand.position.length() * scale;
  const delta = _d.copy(target).sub(start), distance = delta.length();
  const d = clamp01(distance, Math.abs(l1 - l2) + 0.0001, l1 + l2 - 0.0001);
  const direction = distance > 0.0001 ? delta.divideScalar(distance) : delta.set(0, -1, 0);
  const pole = _pole.set(side === 'R' ? -0.55 : 0.55, -0.8, -0.25).applyQuaternion(rig.root.getWorldQuaternion(_rq));
  pole.addScaledVector(direction, -pole.dot(direction));
  if (pole.lengthSq() < 0.0001) pole.set(0, 0, 1);
  pole.normalize();
  const along = (l1 * l1 + d * d - l2 * l2) / (2 * d), height = Math.sqrt(Math.max(0, l1 * l1 - along * along));
  const mid = _mid.copy(start).addScaledVector(direction, along).addScaledVector(pole, height);
  const end = _end.copy(start).addScaledVector(direction, d);
  _w.setFromUnitVectors(_down, _hp.copy(mid).sub(start).normalize());
  shoulder.parent.getWorldQuaternion(_pq).invert(); shoulder.quaternion.copy(_pq.multiply(_w)); shoulder.updateWorldMatrix(true, true);
  _w.setFromUnitVectors(_down, _hp.copy(end).sub(mid).normalize());
  elbow.parent.getWorldQuaternion(_pq).invert(); elbow.quaternion.copy(_pq.multiply(_w)); elbow.updateWorldMatrix(true, true);
  if (gripQuaternion) { hand.parent.getWorldQuaternion(_pq).invert(); hand.quaternion.copy(_pq.multiply(gripQuaternion)); hand.updateWorldMatrix(true, true); }
  return hand.getWorldPosition(_hp).distanceTo(target);
}

// Shock hammer: both hands follow the handle along a shared chest-space path.
export function animateHammer(rig, state) {
  const hammer = rig.weaponMount?.children.find((o) => o.userData.weaponId === 'hammer');
  if (!hammer) return;
  const t = clamp01(state.meleeT), lift = ease(t / 0.37), strike = ease((t - 0.37) / 0.14), settle = ease((t - 0.56) / 0.44), impact = strike * (1 - settle);
  const angle = (-0.4 - 1.6 * lift + 2.6 * strike) * (1 - settle) - 0.4 * settle;
  rig.weaponMount.position.set(0, 0, 0);
  hammer.rotation.set(angle, 0, 0);
  const right = new THREE.Vector3(0, 0.11 + 0.12 * lift * (1 - settle) - 0.06 * impact, 0.29 - 0.08 * lift * (1 - settle) - 0.05 * impact);
  hammer.position.copy(right).sub(hammer.userData.rightGrip.position.clone().applyQuaternion(hammer.quaternion));
  rig.root.updateMatrixWorld(true);
  const wrist = hammer.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2));
  for (const [side, key] of [['R', 'rightGrip'], ['L', 'leftGrip']]) {
    rig.animator.gripErrors[side === 'R' ? 'right' : 'left'] = solveArmIK(rig, side, hammer.userData[key].getWorldPosition(new THREE.Vector3()), wrist);
  }
}
