/**
 * Hand-authored animation curves. Cycles are written like an animator's key
 * sheet (8 evenly spaced keys) and evaluated with periodic Catmull-Rom splines,
 * so motion eases through every key instead of snapping between poses.
 * Angles are degrees, applied as local rotations on an identity bind pose
 * (character faces +Z; X pitch: + leans/tips forward for spine & head, legs and
 * arms swing forward with −X; knees bend with +X, elbows with −X).
 */

export interface PoseWriter {
  r(bone: string, x: number, y?: number, z?: number): void;
  /** left/right pair: right side mirrors Y and Z */
  lr(bone: string, side: 'L' | 'R', x: number, y?: number, z?: number): void;
  hip(x: number, y: number, z: number): void;
}

export interface ClipCtx {
  t: number; // seconds in state
  dt: number;
  phase: number; // locomotion phase 0..1 (persistent)
  speed: number; // m/s
  vy: number; // vertical velocity
  turn: number; // turn rate rad/s
  p: number; // generic progress 0..1 for authored one-shots
  variant: number;
}

const rad = Math.PI / 180;
export const DEG = rad;

/** Periodic Catmull-Rom through evenly spaced keys. */
export function cyc(u: number, k: number[]): number {
  const n = k.length;
  const x = (((u % 1) + 1) % 1) * n;
  const i = Math.floor(x);
  const f = x - i;
  const p0 = k[(i - 1 + n) % n];
  const p1 = k[i % n];
  const p2 = k[(i + 1) % n];
  const p3 = k[(i + 2) % n];
  return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
}

/** Non-periodic Catmull-Rom over keyed times (clamped at the ends). */
export function keys(t: number, ts: number[], v: number[]): number {
  if (t <= ts[0]) return v[0];
  const n = ts.length;
  if (t >= ts[n - 1]) return v[n - 1];
  let i = 0;
  while (i < n - 2 && t > ts[i + 1]) i++;
  const f = (t - ts[i]) / (ts[i + 1] - ts[i]);
  const p0 = v[Math.max(0, i - 1)];
  const p1 = v[i];
  const p2 = v[i + 1];
  const p3 = v[Math.min(n - 1, i + 2)];
  return 0.5 * (2 * p1 + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
}

const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const sides: ['L', 'R'] = ['L', 'R'];

// ------------------------------------------------------------------ idle
export function idle(w: PoseWriter, c: ClipCtx): void {
  const t = c.t;
  const br = Math.sin(t * 1.7);
  const sway = Math.sin(t * 0.45);
  w.hip(sway * 0.012, br * 0.002 - 0.006, 0);
  w.r('hips', 0, sway * 2, sway * -1.6);
  w.r('spine', 1 + br * 0.6, -sway * 1.2, sway * 1);
  w.r('chest', 1.5 + br * 1.2, -sway * 0.8, sway * 0.6);
  w.r('neck', -1, Math.sin(t * 0.31) * 3, 0);
  w.r('head', 1 + Math.sin(t * 0.23) * 2, Math.sin(t * 0.17) * 6, -sway * 1);
  for (const s of sides) {
    const m = s === 'L' ? 1 : -1;
    w.lr('shoulder', s, 0, 0, -br * 0.8);
    w.lr('upperArm', s, 4 + br * 1.2, 0, 7 + br * 0.6 + sway * m * 1);
    w.lr('foreArm', s, -14 - br * 1.5, 6, 0);
    w.lr('hand', s, -4, 0, 4);
    const load = s === 'L' ? sway : -sway;
    w.lr('thigh', s, -1 - load * 1.5, 0, 1.5 + load * 1.5);
    w.lr('shin', s, 3 + Math.max(0, -load) * 6, 0, 0);
    w.lr('foot', s, -2 - Math.max(0, -load) * 4, 0, -1.5);
  }
}

/** Combat-ready stance (sword held, knees bent). */
export function guard(w: PoseWriter, c: ClipCtx): void {
  const t = c.t;
  const br = Math.sin(t * 2.4);
  w.hip(0, -0.06 + br * 0.004, 0);
  w.r('hips', 0, 18, 0);
  w.r('spine', 6, -8, 0);
  w.r('chest', 6 + br, -10, 0);
  w.r('head', 2, -14, 0);
  w.lr('upperArm', 'R', -40, 20, -14);
  w.lr('foreArm', 'R', -60, 0, 0);
  w.lr('hand', 'R', -10, 0, 0);
  w.lr('upperArm', 'L', -20, -10, 26);
  w.lr('foreArm', 'L', -55, 0, 0);
  w.lr('thigh', 'L', -26, -10, 8);
  w.lr('shin', 'L', 30, 0, 0);
  w.lr('foot', 'L', -6, 0, 0);
  w.lr('thigh', 'R', 12, 10, -6);
  w.lr('shin', 'R', 22, 0, 0);
  w.lr('foot', 'R', 4, 0, 0);
}

// ------------------------------------------------------------------ locomotion
// Walk key sheet: phase 0 = left heel strike, 0.5 = right heel strike.
const W_THIGH = [-24, -17, -7, 3, 11, 15, 1, -19];
const W_SHIN = [4, 17, 8, 5, 26, 56, 40, 12];
const W_FOOT = [-14, 1, 4, 7, 20, 6, -7, -13];
const W_ARM = [18, 13, 3, -9, -17, -12, -2, 11];
const W_ELBOW = [-12, -14, -18, -24, -28, -22, -16, -12];

// Run key sheet: contact at 0, flight phases between.
const R_THIGH = [-30, -12, 8, 24, 14, -18, -50, -44];
const R_SHIN = [14, 36, 26, 24, 78, 108, 74, 30];
const R_FOOT = [-6, 6, 14, 32, 12, -8, -14, -10];
const R_ARM = [36, 22, -8, -40, -48, -28, 6, 30];

export function walk(w: PoseWriter, c: ClipCtx): void {
  const u = c.phase;
  w.hip(cyc(u, [0.018, 0.01, 0, -0.01, -0.018, -0.01, 0, 0.01]), cyc(u * 2, [-0.014, -0.024, -0.006, 0.012]) - 0.004, 0);
  w.r('hips', 2, cyc(u, [-6, -4, 0, 4, 6, 4, 0, -4]), cyc(u, [-3, -4, -1, 2, 3, 4, 1, -2]));
  w.r('spine', 3, cyc(u, [4, 3, 0, -3, -4, -3, 0, 3]), cyc(u, [1.5, 2, 0.5, -1, -1.5, -2, -0.5, 1]));
  w.r('chest', 3 + cyc(u * 2, [0.5, -0.5, 0, 0.5]), cyc(u, [5, 4, 0, -4, -5, -4, 0, 4]), 0);
  w.r('neck', -2, 0, 0);
  w.r('head', -1 + cyc(u * 2, [1, -0.5, 0, 0.5]), cyc(u, [-4, -3, 0, 3, 4, 3, 0, -3]), cyc(u, [2, 2, 0, -1, -2, -2, 0, 1]));
  for (const s of sides) {
    const k = s === 'L' ? u : u + 0.5;
    w.lr('thigh', s, cyc(k, W_THIGH), 0, 2);
    w.lr('shin', s, cyc(k, W_SHIN), 0, 0);
    w.lr('foot', s, cyc(k, W_FOOT), 0, -2);
    w.lr('toe', s, Math.max(0, cyc(k, [0, 0, 0, -10, -26, 0, 0, 0])), 0, 0);
    w.lr('shoulder', s, 0, cyc(k, [3, 2, 0, -2, -3, -2, 0, 2]), 0);
    w.lr('upperArm', s, cyc(k, W_ARM), 0, 8);
    w.lr('foreArm', s, cyc(k, W_ELBOW), 6, 0);
    w.lr('hand', s, -6, 0, 6);
  }
}

export function run(w: PoseWriter, c: ClipCtx): void {
  const u = c.phase;
  w.hip(cyc(u, [0.02, 0.01, 0, -0.01, -0.02, -0.01, 0, 0.01]), cyc(u * 2, [-0.045, -0.06, 0.0, 0.025]) - 0.02, 0);
  w.r('hips', 6, cyc(u, [-9, -5, 1, 7, 9, 5, -1, -7]), cyc(u, [-3, -5, -2, 2, 3, 5, 2, -2]));
  w.r('spine', 9 + cyc(u * 2, [1, -1, 0, 1]), cyc(u, [8, 5, 0, -5, -8, -5, 0, 5]), 0);
  w.r('chest', 6, cyc(u, [10, 7, 0, -7, -10, -7, 0, 7]), 0);
  w.r('neck', -6, 0, 0);
  w.r('head', -4 + cyc(u * 2, [2, -1, 0, 1]), cyc(u, [-8, -5, 0, 5, 8, 5, 0, -5]), 0);
  for (const s of sides) {
    const k = s === 'L' ? u : u + 0.5;
    w.lr('thigh', s, cyc(k, R_THIGH), 0, 3);
    w.lr('shin', s, cyc(k, R_SHIN), 0, 0);
    w.lr('foot', s, cyc(k, R_FOOT), 0, -2);
    w.lr('toe', s, Math.max(0, cyc(k, [0, 0, -8, -30, 0, 0, 0, 0])), 0, 0);
    w.lr('shoulder', s, 0, cyc(k, [5, 3, 0, -3, -5, -3, 0, 3]), 0);
    w.lr('upperArm', s, cyc(k, R_ARM), cyc(k, [-10, -6, 0, 8, 12, 8, 0, -6]), 12);
    w.lr('foreArm', s, -78 + cyc(k, [-6, 0, 6, 10, 6, 0, -6, -10]), 16, 0);
    w.lr('hand', s, -12, 0, 10);
  }
}

// ------------------------------------------------------------------ jumps & falls
export function crouch(w: PoseWriter, c: ClipCtx): void {
  const k = smooth(c.t / 0.1);
  w.hip(0, -0.16 * k, 0.02 * k);
  w.r('hips', 14 * k);
  w.r('spine', 14 * k);
  w.r('chest', 8 * k);
  w.r('head', -12 * k);
  for (const s of sides) {
    w.lr('thigh', s, -44 * k, 0, 4);
    w.lr('shin', s, 70 * k);
    w.lr('foot', s, -26 * k);
    w.lr('upperArm', s, 30 * k, 0, 14);
    w.lr('foreArm', s, -30 * k);
  }
}

/** Airborne: blends from a tucked rise into a reaching fall by vertical speed. */
export function air(w: PoseWriter, c: ClipCtx): void {
  const fall = smooth((-c.vy + 2) / 8);
  const t = c.t;
  const flail = Math.sin(t * 9) * 4 * fall;
  w.hip(0, 0.02, 0);
  w.r('hips', 4 - fall * 6);
  w.r('spine', 6 - fall * 8);
  w.r('chest', 4 - fall * 6);
  w.r('head', -4 + fall * 10);
  w.lr('thigh', 'L', -58 + fall * 30, 0, 6);
  w.lr('shin', 'L', 80 - fall * 50);
  w.lr('foot', 'L', 10 - fall * 20);
  w.lr('thigh', 'R', -20 + fall * 14, 0, 6);
  w.lr('shin', 'R', 56 - fall * 30);
  w.lr('foot', 'R', 16 - fall * 22);
  w.lr('upperArm', 'L', -50 + fall * 10 + flail, 0, 30 + fall * 30);
  w.lr('foreArm', 'L', -40 + fall * 20);
  w.lr('upperArm', 'R', 20 - fall * 60 - flail, 0, 30 + fall * 40);
  w.lr('foreArm', 'R', -30 + fall * 10);
}

export function land(w: PoseWriter, c: ClipCtx): void {
  const t = c.t;
  const k = keys(t, [0, 0.06, 0.22, 0.42], [0.6, 1, 0.35, 0]);
  w.hip(0, -0.2 * k, 0);
  w.r('hips', 16 * k);
  w.r('spine', 18 * k);
  w.r('chest', 6 * k);
  w.r('head', -14 * k);
  for (const s of sides) {
    w.lr('thigh', s, -50 * k, 0, 6);
    w.lr('shin', s, 84 * k);
    w.lr('foot', s, -30 * k);
    w.lr('upperArm', s, -24 * k, 0, 22 * k + 8);
    w.lr('foreArm', s, -36 * k);
  }
}

// ------------------------------------------------------------------ combat
/** Three-hit sword combo with anticipation → strike → follow-through → recovery. */
export function attack(w: PoseWriter, c: ClipCtx): void {
  const t = c.t;
  const T = [0, 0.1, 0.17, 0.27, 0.48];
  const v = c.variant % 3;
  const kk = (vals: number[]) => keys(t, T, vals);
  if (v === 0) {
    // diagonal cut, right to left
    w.hip(0, kk([0, -0.03, -0.08, -0.07, -0.03]), kk([0, -0.02, 0.06, 0.08, 0.03]));
    w.r('hips', 4, kk([0, 24, -12, -26, -8]), 0);
    w.r('spine', kk([4, 8, 14, 14, 6]), kk([0, 26, -22, -34, -10]), 0);
    w.r('chest', kk([2, 2, 10, 8, 4]), kk([0, 20, -24, -30, -8]), 0);
    w.r('head', 0, kk([0, -18, 14, 22, 6]), 0);
    w.lr('upperArm', 'R', kk([-30, -150, -70, 10, -20]), kk([10, 40, -30, -50, -10]), kk([-10, -50, -40, -20, -12]));
    w.lr('foreArm', 'R', kk([-50, -60, -10, -20, -40]));
    w.lr('hand', 'R', kk([-10, 30, -20, -40, -10]));
    w.lr('upperArm', 'L', kk([-10, 10, -30, -40, -10]), 0, kk([20, 40, 30, 40, 18]));
    w.lr('foreArm', 'L', -40);
  } else if (v === 1) {
    // backhand sweep, left to right
    w.hip(0, kk([-0.03, -0.05, -0.09, -0.08, -0.03]), kk([0, -0.02, 0.07, 0.09, 0.03]));
    w.r('hips', 4, kk([-8, -26, 14, 30, 6]), 0);
    w.r('spine', kk([6, 8, 12, 12, 6]), kk([-10, -34, 20, 40, 8]), 0);
    w.r('chest', 6, kk([-8, -26, 22, 34, 6]), 0);
    w.r('head', 0, kk([6, 24, -12, -24, -4]), 0);
    w.lr('upperArm', 'R', kk([-20, -70, -80, -60, -25]), kk([-10, -70, 30, 60, 10]), kk([-12, 30, -60, -80, -14]));
    w.lr('foreArm', 'R', kk([-40, -90, -20, -10, -40]));
    w.lr('hand', 'R', kk([-10, 20, 0, 20, -10]));
    w.lr('upperArm', 'L', kk([-10, -30, 10, 20, -10]), 0, kk([20, 50, 20, 30, 18]));
    w.lr('foreArm', 'L', -50);
  } else {
    // overhead finisher with a step
    w.hip(0, kk([-0.03, 0.02, -0.16, -0.18, -0.06]), kk([0, -0.06, 0.16, 0.18, 0.06]));
    w.r('hips', kk([0, -8, 18, 22, 6]));
    w.r('spine', kk([4, -14, 26, 30, 8]));
    w.r('chest', kk([2, -12, 16, 18, 4]));
    w.r('head', kk([0, -18, 10, 6, 0]));
    for (const s of sides) {
      w.lr('upperArm', s, kk([-30, -175, -60, -20, -25]), 0, kk([10, 14, 6, 4, 12]));
      w.lr('foreArm', s, kk([-50, -30, -10, -20, -40]));
    }
    w.lr('thigh', 'L', kk([-10, -16, -48, -52, -20]), 0, 6);
    w.lr('shin', 'L', kk([10, 20, 50, 56, 20]));
    w.lr('thigh', 'R', kk([6, 10, 26, 28, 10]), 0, -4);
    w.lr('shin', 'R', kk([10, 16, 30, 34, 14]));
  }
  if (v !== 2) {
    w.lr('thigh', 'L', kk([-14, -18, -34, -36, -18]), -8, 8);
    w.lr('shin', 'L', kk([16, 20, 36, 38, 20]));
    w.lr('foot', 'L', kk([-4, -4, -6, -6, -4]));
    w.lr('thigh', 'R', kk([8, 10, 18, 20, 10]), 8, -6);
    w.lr('shin', 'R', kk([14, 16, 24, 26, 16]));
  }
}

/** Forward dodge roll: tuck, rotate, uncurl. Hips rotation carries the somersault. */
export function roll(w: PoseWriter, c: ClipCtx): void {
  const p = Math.min(1, c.t / 0.55);
  const spin = keys(p, [0, 0.15, 0.75, 1], [0, 30, 340, 360]);
  const tuck = keys(p, [0, 0.12, 0.7, 1], [0, 1, 1, 0]);
  w.hip(0, -0.45 * Math.sin(Math.min(1, p) * Math.PI) - 0.1 * tuck, 0);
  w.r('hips', spin + 20 * tuck);
  w.r('spine', 30 * tuck);
  w.r('chest', 26 * tuck);
  w.r('neck', 20 * tuck);
  w.r('head', 30 * tuck);
  for (const s of sides) {
    w.lr('thigh', s, -110 * tuck, 0, 8);
    w.lr('shin', s, 130 * tuck);
    w.lr('foot', s, 20 * tuck);
    w.lr('upperArm', s, -70 * tuck, 0, 20);
    w.lr('foreArm', s, -90 * tuck);
  }
}

export function hurt(w: PoseWriter, c: ClipCtx): void {
  const k = keys(c.t, [0, 0.06, 0.2, 0.42], [0, 1, 0.6, 0]);
  w.hip(0, -0.04 * k, -0.08 * k);
  w.r('hips', -10 * k, 0, 4 * k);
  w.r('spine', -16 * k, 6 * k, 0);
  w.r('chest', -12 * k, 8 * k, 0);
  w.r('head', -20 * k, -10 * k, 6 * k);
  w.lr('upperArm', 'L', -20 * k, 0, 30 * k + 8);
  w.lr('upperArm', 'R', -10 * k, 0, 24 * k + 8);
  w.lr('foreArm', 'L', -40 * k);
  w.lr('foreArm', 'R', -30 * k);
  w.lr('thigh', 'L', -16 * k);
  w.lr('shin', 'L', 24 * k);
  w.lr('thigh', 'R', 10 * k);
  w.lr('shin', 'R', 10 * k);
}

/** Slide under an obstacle (one leg tucked, leaning back). */
export function slide(w: PoseWriter, c: ClipCtx): void {
  const k = keys(c.t, [0, 0.1, 0.45, 0.6], [0, 1, 1, 0]);
  w.hip(0, -0.62 * k, 0);
  w.r('hips', -64 * k);
  w.r('spine', 10 * k);
  w.r('chest', 14 * k);
  w.r('head', 34 * k);
  w.lr('thigh', 'L', -90 * k, 0, 6);
  w.lr('shin', 'L', 10 * k);
  w.lr('thigh', 'R', -36 * k, 0, -10);
  w.lr('shin', 'R', 110 * k);
  w.lr('upperArm', 'L', 30 * k, 0, 40 * k);
  w.lr('upperArm', 'R', -50 * k, 0, 30 * k);
  w.lr('foreArm', 'R', -40 * k);
}

// ------------------------------------------------------------------ traversal
export function climb(w: PoseWriter, c: ClipCtx): void {
  const u = c.phase;
  w.hip(0, cyc(u * 2, [0, 0.03, 0.05, 0.02]), -0.06);
  w.r('hips', 10, cyc(u, [4, 0, -4, 0]), 0);
  w.r('spine', -6, 0, cyc(u, [3, 0, -3, 0]));
  w.r('chest', -8, cyc(u, [-6, 0, 6, 0]), 0);
  w.r('head', -36, cyc(u, [6, 0, -6, 0]), 0);
  for (const s of sides) {
    const k = s === 'L' ? u : u + 0.5;
    w.lr('upperArm', s, cyc(k, [-168, -150, -128, -150]), 0, cyc(k, [14, 20, 30, 20]));
    w.lr('foreArm', s, cyc(k, [-20, -50, -80, -50]));
    w.lr('hand', s, -20);
    w.lr('thigh', s, cyc(k, [-30, -55, -75, -50]), 0, 12);
    w.lr('shin', s, cyc(k, [40, 70, 90, 60]));
    w.lr('foot', s, -14);
  }
}

export function hang(w: PoseWriter, c: ClipCtx): void {
  const t = c.t;
  const sw = Math.sin(t * 3.2);
  w.hip(0, 0, -0.04);
  w.r('hips', 4 + sw * 3);
  w.r('head', -30);
  for (const s of sides) {
    w.lr('upperArm', s, -170, 0, 12);
    w.lr('foreArm', s, -10);
    w.lr('thigh', s, -12 + (s === 'L' ? sw : -sw) * 14, 0, 4);
    w.lr('shin', s, 26);
    w.lr('foot', s, 20);
  }
}

/** Clinging hard to a surface while the world moves. */
export function brace(w: PoseWriter, c: ClipCtx): void {
  const sh = Math.sin(c.t * 22) * 1.5;
  w.hip(0, 0.02, -0.12);
  w.r('hips', 26 + sh);
  w.r('spine', 18);
  w.r('chest', 12);
  w.r('head', 24 + sh);
  for (const s of sides) {
    w.lr('upperArm', s, -150, 0, 36);
    w.lr('foreArm', s, -95);
    w.lr('thigh', s, -78, 0, 16);
    w.lr('shin', s, 104);
    w.lr('foot', s, -10);
  }
}

/** Skydive: belly to the ground, arms and legs spread for steering. */
export function skydive(w: PoseWriter, c: ClipCtx): void {
  const t = c.t;
  const f = Math.sin(t * 7) * 3;
  w.hip(0, 0, 0);
  w.r('hips', 78);
  w.r('spine', -8);
  w.r('chest', -10);
  w.r('neck', -24);
  w.r('head', -30);
  for (const s of sides) {
    const m = s === 'L' ? 1 : -1;
    w.lr('upperArm', s, -20 + f * m, 0, 76);
    w.lr('foreArm', s, -40);
    w.lr('hand', s, 0, 0, -10);
    w.lr('thigh', s, 22 - f * m, 0, 20);
    w.lr('shin', s, 62);
    w.lr('foot', s, 30);
  }
}

export function float(w: PoseWriter, c: ClipCtx): void {
  const t = c.t;
  const b = Math.sin(t * 0.9);
  w.hip(0, 0, 0);
  w.r('hips', -6 + b * 2);
  w.r('spine', -8);
  w.r('chest', -10 + b * 2);
  w.r('neck', -10);
  w.r('head', -26 + b * 4);
  for (const s of sides) {
    const m = s === 'L' ? 1 : -1;
    w.lr('upperArm', s, 8 + b * 3 * m, 0, 30 + b * 4);
    w.lr('foreArm', s, -18);
    w.lr('hand', s, 10, 0, -10);
    w.lr('thigh', s, s === 'L' ? 6 : -10, 0, 2);
    w.lr('shin', s, s === 'L' ? 18 : 34);
    w.lr('foot', s, 34);
  }
}

// ------------------------------------------------------------------ seated / mounted / held
export function sit(w: PoseWriter, c: ClipCtx): void {
  const br = Math.sin(c.t * 1.5);
  w.hip(0, -0.47, -0.06);
  w.r('hips', -6);
  w.r('spine', 12 + br * 0.8);
  w.r('chest', 6 + br * 1.2);
  w.r('neck', 4);
  w.r('head', 6 + Math.sin(c.t * 0.4) * 3, Math.sin(c.t * 0.21) * 5);
  for (const s of sides) {
    w.lr('thigh', s, -86, 0, 10);
    w.lr('shin', s, 96);
    w.lr('foot', s, -8);
    w.lr('upperArm', s, -34, 0, 10);
    w.lr('foreArm', s, -58, 14);
    w.lr('hand', s, -10);
  }
}

export function ride(w: PoseWriter, c: ClipCtx): void {
  const u = c.phase;
  const g = Math.min(1, c.speed / 12);
  const b = cyc(u * 2, [0, 1, 0.3, -0.6]) * g;
  w.hip(0, -0.36 + b * 0.04, -0.02);
  w.r('hips', 8 + b * 4);
  w.r('spine', 14 * g + 6 - b * 3);
  w.r('chest', 6 * g + 2 - b * 2);
  w.r('neck', -6 * g);
  w.r('head', -10 * g + b * 2);
  for (const s of sides) {
    w.lr('thigh', s, -76, 0, 32);
    w.lr('shin', s, 92);
    w.lr('foot', s, -14);
    w.lr('upperArm', s, -44 - b * 4, 0, 6);
    w.lr('foreArm', s, -56);
    w.lr('hand', s, -10);
  }
}

/** Sitting behind a rider with arms around their waist. */
export function pillion(w: PoseWriter, c: ClipCtx): void {
  ride(w, c);
  for (const s of sides) {
    w.lr('upperArm', s, -62, 0, -6);
    w.lr('foreArm', s, -70, 0, 0);
    w.lr('hand', s, 0, 0, -20);
  }
  w.r('head', 6, 18, 8);
}

export function piggyback(w: PoseWriter, c: ClipCtx): void {
  w.hip(0, 0, 0);
  w.r('hips', 10);
  w.r('chest', -4);
  w.r('head', 10 + Math.sin(c.t) * 2, 20);
  for (const s of sides) {
    w.lr('upperArm', s, -76, 0, -14);
    w.lr('foreArm', s, -84);
    w.lr('thigh', s, -84, 0, 40);
    w.lr('shin', s, 84);
    w.lr('foot', s, 20);
  }
}

export function carry(w: PoseWriter, c: ClipCtx): void {
  const br = Math.sin(c.t * 1.6);
  w.hip(0, -0.03, 0.01);
  w.r('spine', -6 + br);
  w.r('chest', -4);
  w.r('head', 18, 0, 0);
  for (const s of sides) {
    w.lr('upperArm', s, -44, 0, -4);
    w.lr('foreArm', s, -86, 10);
    w.lr('hand', s, 20, 0, -20);
    w.lr('thigh', s, s === 'L' ? -8 : 6, 0, 3);
    w.lr('shin', s, 10);
  }
}

/** Being carried in someone's arms: limp, head resting back. */
export function carried(w: PoseWriter, c: ClipCtx): void {
  const br = Math.sin(c.t * 1.4);
  w.hip(0, 0, 0);
  w.r('hips', -90);
  w.r('spine', 14 + br);
  w.r('chest', 6);
  w.r('neck', 12);
  w.r('head', 26, 30, 0);
  w.lr('upperArm', 'L', -40, 0, 28);
  w.lr('foreArm', 'L', -70);
  w.lr('upperArm', 'R', 20, 0, 50);
  w.lr('foreArm', 'R', -10);
  for (const s of sides) {
    w.lr('thigh', s, -90, 0, 4);
    w.lr('shin', s, 70);
    w.lr('foot', s, 20);
  }
}

export function kneel(w: PoseWriter, c: ClipCtx): void {
  const br = Math.sin(c.t * 1.4);
  w.hip(0, -0.46, 0.02);
  w.r('spine', 10 + br);
  w.r('chest', 6);
  w.r('head', 14);
  w.lr('thigh', 'L', -88, 0, 6);
  w.lr('shin', 'L', 92);
  w.lr('foot', 'L', -6);
  w.lr('thigh', 'R', 6, 0, -4);
  w.lr('shin', 'R', 124);
  w.lr('foot', 'R', 56);
  w.lr('toe', 'R', -40);
  w.lr('upperArm', 'L', -42, 0, 4);
  w.lr('foreArm', 'L', -40);
  w.lr('upperArm', 'R', -6, 0, 10);
  w.lr('foreArm', 'R', -24);
}

export function cower(w: PoseWriter, c: ClipCtx): void {
  const sh = Math.sin(c.t * 18) * 1.2;
  w.hip(0, -0.5, -0.05);
  w.r('hips', 30);
  w.r('spine', 30 + sh);
  w.r('chest', 18);
  w.r('head', 30);
  for (const s of sides) {
    w.lr('thigh', s, -120, 0, 12);
    w.lr('shin', s, 140);
    w.lr('foot', s, -16);
    w.lr('upperArm', s, -120, 0, -20);
    w.lr('foreArm', s, -120);
  }
}

export function lie(w: PoseWriter, c: ClipCtx): void {
  w.hip(0, -0.82, 0);
  w.r('hips', -90);
  w.r('head', 10 + Math.sin(c.t) * 1, 20);
  w.lr('upperArm', 'L', -20, 0, 40);
  w.lr('upperArm', 'R', 10, 0, 60);
  w.lr('foreArm', 'L', -30);
  w.lr('thigh', 'L', -10);
  w.lr('thigh', 'R', 4);
  w.lr('shin', 'L', 20);
}

// ------------------------------------------------------------------ gestures (usually upper-body overlays)
export function reach(w: PoseWriter, c: ClipCtx): void {
  const k = smooth(c.t / 1.4);
  w.r('spine', 6 * k);
  w.r('chest', 6 * k);
  w.r('head', -6 * k);
  w.lr('upperArm', 'R', -84 * k, 0, 6);
  w.lr('foreArm', 'R', -8 * k);
  w.lr('hand', 'R', -20 * k);
  w.lr('upperArm', 'L', -10 * k, 0, 14);
  w.lr('foreArm', 'L', -30 * k);
}

export function point(w: PoseWriter, c: ClipCtx): void {
  const k = smooth(c.t / 0.35);
  w.r('chest', 0, 10 * k, 0);
  w.r('head', -4 * k, 8 * k, 0);
  w.lr('upperArm', 'R', -86 * k, 14 * k, 8);
  w.lr('foreArm', 'R', -6 * k);
  w.lr('hand', 'R', -6 * k);
}

/** Arms rising in invocation (Vesk, and Lyra singing to the machines). */
export function invoke(w: PoseWriter, c: ClipCtx): void {
  const k = smooth(c.t / 1.1);
  const b = Math.sin(c.t * 1.2) * 3 * k;
  w.r('spine', -6 * k);
  w.r('chest', -10 * k + b);
  w.r('head', -24 * k);
  for (const s of sides) {
    w.lr('upperArm', s, -110 * k, 0, 40 * k);
    w.lr('foreArm', s, -14 * k);
    w.lr('hand', s, 20 * k);
  }
}

/** Conversational hand gesture (overlay while speaking). */
export function talk(w: PoseWriter, c: ClipCtx): void {
  const t = c.t;
  const v = c.variant % 3;
  const k = smooth(t / 0.4);
  const g = Math.sin(t * 2.6) * k;
  if (v === 0) {
    w.lr('upperArm', 'R', (-36 + g * 8) * k, 10 * k, 14);
    w.lr('foreArm', 'R', (-70 + g * 14) * k, 30 * k, 0);
    w.lr('hand', 'R', -20 * k, 0, 20 * k);
  } else if (v === 1) {
    for (const s of sides) {
      w.lr('upperArm', s, (-30 + g * 6) * k, 0, 18);
      w.lr('foreArm', s, (-64 - g * 10) * k, 20 * k, 0);
      w.lr('hand', s, -10 * k, 0, 30 * k);
    }
  } else {
    w.lr('upperArm', 'L', (-24 + g * 10) * k, -6 * k, 12);
    w.lr('foreArm', 'L', (-80 + g * 10) * k, 26 * k, 0);
    w.lr('hand', 'L', 0, 0, 30 * k);
  }
  w.r('chest', 2 * k, g * 4, 0);
  w.r('head', g * 3, -g * 5, 0);
}

export function dead(w: PoseWriter, c: ClipCtx): void {
  const k = smooth(c.t / 0.7);
  w.hip(0, -0.86 * k, -0.2 * k);
  w.r('hips', -92 * k, 0, 8 * k);
  w.r('spine', -6 * k);
  w.r('head', 6 * k, 50 * k, 0);
  w.lr('upperArm', 'L', 20 * k, 0, 70 * k);
  w.lr('upperArm', 'R', -40 * k, 0, 40 * k);
  w.lr('foreArm', 'R', -40 * k);
  w.lr('thigh', 'L', -20 * k, 0, 8);
  w.lr('shin', 'L', 40 * k);
}

export type ClipFn = (w: PoseWriter, c: ClipCtx) => void;

export const CLIPS: Record<string, ClipFn> = {
  idle,
  guard,
  walk,
  run,
  crouch,
  air,
  land,
  attack,
  roll,
  hurt,
  slide,
  climb,
  hang,
  brace,
  skydive,
  float,
  sit,
  ride,
  pillion,
  piggyback,
  carry,
  carried,
  kneel,
  cower,
  lie,
  reach,
  point,
  invoke,
  talk,
  dead,
};
