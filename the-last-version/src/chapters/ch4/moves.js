// Sword-and-shield move set for the MARCHLIGHT rig: key poses (Euler offsets per bone, the rig's
// conventions: +X bends a limb forward/down, arm -X raises it forward, fore -X bends the elbow,
// armL +Z / armR -Z lift the arms out to the side, chest +Y turns the chest to the left) and
// attack definitions (timing, reach, arc, damage, posture, lunge, parry/block rules).
import { B } from '../../characters/ml/rig.js';

const lerp = (a, b, t) => a + (b - a) * t;
const ease = { out: (t) => 1 - (1 - t) * (1 - t), in: (t) => t * t, io: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), snap: (t) => 1 - Math.pow(1 - t, 4) };

const LEGS = new Set(['thighL', 'shinL', 'footL', 'thighR', 'shinR', 'footR', 'toeL', 'toeR']);

// ---------------------------------------------------------------- key poses
export const POSES = {
  // ready stance: sword low and forward, shield up across the chest, left foot forward
  guard: {
    armR: [-0.42, 0.1, -0.3], foreR: [-1.0, 0, 0], handR: [0.35, 0, 0],
    armL: [-0.45, 0, 0.2], foreL: [-1.1, 0.3, 0], handL: [0, 0, 0],
    spine: [0.12, 0.12, 0], chest: [0.04, 0.1, 0], neck: [0, -0.08, 0], head: [-0.06, -0.12, 0],
    thighL: [-0.32, 0, 0.1], shinL: [0.5, 0, 0], footL: [-0.18, 0, 0],
    thighR: [0.12, 0, -0.12], shinR: [0.42, 0, 0], footR: [-0.25, 0, 0],
    hip: [0, -0.07, 0],
  },
  // two-handed (greatsword, axe, spear): both hands on the haft
  guard2h: {
    armR: [-0.55, 0.3, -0.15], foreR: [-1.15, 0.2, 0], handR: [0.4, 0, 0],
    armL: [-0.75, -0.3, 0.05], foreL: [-1.0, -0.2, 0], handL: [0.2, 0, 0],
    spine: [0.15, 0.25, 0], chest: [0.05, 0.15, 0], head: [-0.08, -0.3, 0],
    thighL: [-0.35, 0, 0.12], shinL: [0.5, 0, 0], footL: [-0.15, 0, 0],
    thighR: [0.15, 0, -0.14], shinR: [0.45, 0, 0], footR: [-0.25, 0, 0],
    hip: [0, -0.08, 0],
  },
  block: {
    armR: [-0.3, 0.1, -0.35], foreR: [-1.2, 0, 0], handR: [0.4, 0, 0],
    armL: [-0.95, 0.1, 0.1], foreL: [-0.85, 0.3, 0], handL: [-0.2, 0, 0],
    spine: [0.2, 0.25, 0], chest: [0.08, 0.15, 0], head: [0.05, -0.2, 0],
    thighL: [-0.4, 0, 0.12], shinL: [0.6, 0, 0], footL: [-0.2, 0, 0],
    thighR: [0.2, 0, -0.14], shinR: [0.55, 0, 0], footR: [-0.3, 0, 0],
    hip: [0, -0.1, 0],
  },
  // the shield snaps out to meet the blow
  parry: {
    armR: [-0.2, 0.1, -0.4], foreR: [-1.1, 0, 0], handR: [0.4, 0, 0],
    armL: [-1.3, 0.2, 0.35], foreL: [-0.45, 0.3, 0], handL: [-0.3, 0, 0],
    spine: [0.05, 0.45, 0], chest: [0.0, 0.25, 0], head: [-0.05, -0.35, 0],
    thighL: [-0.5, 0, 0.12], shinL: [0.5, 0, 0], footL: [-0.1, 0, 0],
    thighR: [0.25, 0, -0.14], shinR: [0.45, 0, 0], footR: [-0.3, 0, 0],
    hip: [0, -0.09, 0.04],
  },
  // light 1: diagonal cut from high right to low left
  l1w: { armR: [-1.9, 0.2, -1.0], foreR: [-1.6, 0, 0], handR: [0.5, 0, 0], spine: [0.0, -0.35, 0], chest: [-0.05, -0.35, 0], head: [-0.05, 0.4, 0], armL: [-0.6, 0, 0.3], foreL: [-1.3, 0, 0], hip: [0, -0.06, 0] },
  l1h: { armR: [-1.0, -0.2, 0.55], foreR: [-0.25, 0, 0], handR: [0.1, 0, 0], spine: [0.25, 0.45, 0], chest: [0.1, 0.35, 0], head: [-0.1, -0.5, 0], armL: [-0.3, 0, 0.45], foreL: [-1.0, 0, 0], thighL: [-0.6, 0, 0.1], shinL: [0.65, 0, 0], thighR: [0.35, 0, -0.1], shinR: [0.4, 0, 0], hip: [0, -0.12, 0.06] },
  // light 2: backhand from low left to high right
  l2w: { armR: [-0.9, -0.3, 0.6], foreR: [-1.7, 0, 0], handR: [0.4, 0, 0], spine: [0.15, 0.55, 0], chest: [0.05, 0.4, 0], head: [-0.05, -0.6, 0], armL: [-0.4, 0, 0.4], foreL: [-1.0, 0, 0], hip: [0, -0.1, 0] },
  l2h: { armR: [-1.6, 0.3, -1.25], foreR: [-0.2, 0, 0], handR: [0.0, 0, 0], spine: [0.05, -0.45, 0], chest: [0.0, -0.35, 0], head: [-0.05, 0.5, 0], armL: [-0.5, 0, 0.5], foreL: [-1.2, 0, 0], thighL: [-0.5, 0, 0.12], shinL: [0.55, 0, 0], thighR: [0.3, 0, -0.12], shinR: [0.4, 0, 0], hip: [0, -0.1, 0.05] },
  // light 3: overhead chop
  l3w: { armR: [-2.85, 0, -0.25], foreR: [-1.4, 0, 0], handR: [0.6, 0, 0], spine: [-0.15, 0.1, 0], chest: [-0.1, 0.05, 0], head: [-0.2, 0, 0], armL: [-0.7, 0, 0.35], foreL: [-1.0, 0.3, 0], hip: [0, -0.02, -0.04] },
  l3h: { armR: [-0.75, 0, -0.1], foreR: [-0.15, 0, 0], handR: [0.1, 0, 0], spine: [0.55, 0.05, 0], chest: [0.2, 0, 0], head: [-0.35, 0, 0], armL: [-0.5, 0, 0.25], foreL: [-0.9, 0, 0], thighL: [-0.85, 0, 0.1], shinL: [0.9, 0, 0], thighR: [0.45, 0, -0.1], shinR: [0.6, 0, 0], hip: [0, -0.2, 0.12] },
  // heavy: coiled thrust
  hvw: { armR: [0.35, 0.3, -0.45], foreR: [-1.9, 0, 0], handR: [0.9, 0, 0], spine: [0.2, -0.75, 0], chest: [0.05, -0.45, 0], head: [-0.1, 0.9, 0], armL: [-1.0, 0, 0.3], foreL: [-1.0, 0, 0], thighL: [-0.25, 0, 0.12], shinL: [0.9, 0, 0], thighR: [0.2, 0, -0.14], shinR: [0.9, 0, 0], hip: [0, -0.22, -0.06] },
  hvh: { armR: [-1.6, 0, -0.05], foreR: [-0.05, 0, 0], handR: [1.45, 0, 0], spine: [0.35, 0.35, 0], chest: [0.1, 0.2, 0], head: [-0.25, -0.35, 0], armL: [0.3, 0, 0.5], foreL: [-0.6, 0, 0], thighL: [-1.0, 0, 0.1], shinL: [0.9, 0, 0], thighR: [0.6, 0, -0.1], shinR: [0.2, 0, 0], hip: [0, -0.24, 0.2] },
  // shield bash (enemy footmen)
  bashw: { armL: [-0.3, 0.3, 0.4], foreL: [-1.6, 0, 0], spine: [0.0, 0.45, 0], chest: [0, 0.3, 0], armR: [-0.3, 0, -0.35], foreR: [-1.1, 0, 0], hip: [0, -0.08, -0.05] },
  bashh: { armL: [-1.25, 0.2, 0.0], foreL: [-1.2, 0, 0], spine: [0.35, -0.25, 0], chest: [0.1, -0.2, 0], armR: [-0.2, 0, -0.4], foreR: [-1.0, 0, 0], thighL: [-0.8, 0, 0.1], shinL: [0.7, 0, 0], thighR: [0.4, 0, -0.1], shinR: [0.4, 0, 0], hip: [0, -0.14, 0.2] },
  // two-handed overhead (axe, greatsword)
  ohw: { armR: [-2.9, 0.1, -0.1], foreR: [-1.2, 0, 0], handR: [0.5, 0, 0], armL: [-2.85, -0.1, 0.1], foreL: [-1.2, 0, 0], handL: [0.5, 0, 0], spine: [-0.25, 0, 0], chest: [-0.12, 0, 0], head: [-0.15, 0, 0], hip: [0, 0.02, -0.06] },
  ohh: { armR: [-0.7, 0.2, 0.05], foreR: [-0.2, 0, 0], handR: [0.3, 0, 0], armL: [-0.75, -0.2, -0.05], foreL: [-0.25, 0, 0], handL: [0.3, 0, 0], spine: [0.7, 0, 0], chest: [0.25, 0, 0], head: [-0.4, 0, 0], thighL: [-0.9, 0, 0.12], shinL: [1.0, 0, 0], thighR: [0.5, 0, -0.12], shinR: [0.8, 0, 0], hip: [0, -0.3, 0.12] },
  // two-handed horizontal sweep, right to left
  swpw: { armR: [-1.4, 0.4, -1.3], foreR: [-0.6, 0, 0], handR: [0.2, 0, 0], armL: [-1.2, 0.2, -0.5], foreL: [-0.9, 0, 0], spine: [0.05, -0.85, 0], chest: [0, -0.5, 0], head: [0, 0.8, 0], hip: [0, -0.1, 0] },
  swph: { armR: [-1.35, -0.3, 0.6], foreR: [-0.2, 0, 0], handR: [0.1, 0, 0], armL: [-1.3, -0.1, 0.9], foreL: [-0.4, 0, 0], spine: [0.15, 0.9, 0], chest: [0.05, 0.55, 0], head: [-0.1, -0.8, 0], thighL: [-0.5, 0, 0.15], shinL: [0.6, 0, 0], thighR: [0.25, 0, -0.15], shinR: [0.5, 0, 0], hip: [0, -0.16, 0] },
  // spear thrust
  thrw: { armR: [0.2, 0.2, -0.3], foreR: [-1.7, 0, 0], handR: [0.8, 0, 0], armL: [-0.8, -0.4, 0.1], foreL: [-0.9, 0, 0], spine: [0.1, -0.5, 0], chest: [0, -0.3, 0], head: [0, 0.6, 0], hip: [0, -0.1, -0.08] },
  thrh: { armR: [-1.4, 0.1, -0.1], foreR: [-0.05, 0, 0], handR: [1.4, 0, 0], armL: [-1.45, -0.3, 0.2], foreL: [-0.25, 0, 0], spine: [0.3, 0.2, 0], chest: [0.1, 0.1, 0], head: [-0.2, -0.2, 0], thighL: [-0.9, 0, 0.1], shinL: [0.8, 0, 0], thighR: [0.55, 0, -0.1], shinR: [0.25, 0, 0], hip: [0, -0.2, 0.22] },
  // reactions
  hit: { spine: [-0.35, 0.2, 0.1], chest: [-0.2, 0.15, 0], head: [-0.3, 0.2, 0], armR: [-0.2, 0, -0.6], foreR: [-0.6, 0, 0], armL: [-0.3, 0, 0.6], foreL: [-0.8, 0, 0], hip: [0, -0.05, -0.08] },
  stagger: { spine: [-0.5, -0.2, 0.15], chest: [-0.3, -0.1, 0], head: [-0.4, 0.3, 0], armR: [-0.6, 0, -1.2], foreR: [-0.4, 0, 0], armL: [-0.5, 0, 1.15], foreL: [-0.5, 0, 0], thighL: [-0.2, 0, 0.15], shinL: [0.6, 0, 0], thighR: [0.4, 0, -0.15], shinR: [0.7, 0, 0], hip: [0, -0.18, -0.12] },
  // posture broken: on one knee, open for the deathblow
  broken: { spine: [0.55, 0, 0], chest: [0.25, 0, 0], head: [0.35, 0, 0], armR: [0.0, 0, -0.35], foreR: [-0.3, 0, 0], armL: [0.1, 0, 0.35], foreL: [-0.3, 0, 0], thighL: [-1.35, 0, 0.1], shinL: [1.5, 0, 0], footL: [-0.1, 0, 0], thighR: [0.25, 0, -0.1], shinR: [1.85, 0, 0], footR: [0.5, 0, 0], hip: [0, -0.42, 0] },
  dodge: { spine: [0.45, 0, 0], chest: [0.2, 0, 0], head: [-0.2, 0, 0], armR: [-0.8, 0, -0.5], foreR: [-1.3, 0, 0], armL: [-0.9, 0, 0.5], foreL: [-1.5, 0, 0], thighL: [-1.1, 0, 0.1], shinL: [1.4, 0, 0], thighR: [-0.6, 0, -0.1], shinR: [1.6, 0, 0], hip: [0, -0.35, 0] },
  dead: { spine: [0.2, 0, 0], chest: [0.1, 0, 0], head: [0.3, 0.4, 0], armR: [-0.2, 0, -0.5], foreR: [-0.3, 0, 0], armL: [-0.1, 0, 0.6], foreL: [-0.4, 0, 0], thighL: [-0.3, 0, 0.1], shinL: [0.4, 0, 0], thighR: [-0.1, 0, -0.1], shinR: [0.2, 0, 0] },
  // bow (Sera)
  bowDraw: { armL: [-1.55, 0.0, 0.1], foreL: [-0.05, 0, 0], handL: [0, 0, -1.4], armR: [-1.45, 0.0, -1.2], foreR: [-2.1, 0, 0], handR: [0, 0, 0], spine: [0.05, 0.7, 0], chest: [0, 0.55, 0], head: [-0.05, -1.15, 0], thighL: [-0.2, 0, 0.18], shinL: [0.3, 0, 0], thighR: [0.15, 0, -0.18], shinR: [0.3, 0, 0], hip: [0, -0.04, 0] },
  // victory / taunt: sword raised
  raise: { armR: [-2.9, 0.0, -0.4], foreR: [-0.2, 0, 0], handR: [0.2, 0, 0], armL: [-0.3, 0, 0.3], foreL: [-1.3, 0, 0], spine: [-0.1, 0, 0], head: [-0.3, 0, 0] },
};

// ---------------------------------------------------------------- attacks
// t = seconds: windup (telegraph), active (the blade is live), recover (punish window).
// arc: half-angle (rad) in front of the attacker that the blade sweeps; reach in metres.
// kind: 'parry' = can be blocked and parried; 'red' = unblockable (dodge it); 'bash' breaks guard.
export const ATTACKS = {
  // player
  p1: { w: 'l1w', h: 'l1h', windup: 0.16, active: 0.12, recover: 0.26, reach: 2.25, arc: 1.2, dmg: 14, post: 16, lunge: 2.6, combo: 'p2', stam: 12 },
  p2: { w: 'l2w', h: 'l2h', windup: 0.14, active: 0.12, recover: 0.26, reach: 2.25, arc: 1.2, dmg: 14, post: 16, lunge: 2.4, combo: 'p3', stam: 12 },
  p3: { w: 'l3w', h: 'l3h', windup: 0.24, active: 0.1, recover: 0.42, reach: 2.4, arc: 0.7, dmg: 24, post: 30, lunge: 3.2, stam: 16, heavyHit: true },
  ph: { w: 'hvw', h: 'hvh', windup: 0.42, active: 0.12, recover: 0.45, reach: 2.9, arc: 0.45, dmg: 38, post: 55, lunge: 6.5, stam: 26, heavyHit: true, guardBreak: true },
  // footman (sword + shield)
  f1: { w: 'l1w', h: 'l1h', windup: 0.55, active: 0.12, recover: 0.55, reach: 2.2, arc: 1.1, dmg: 12, post: 18, lunge: 2.2, kind: 'parry' },
  f2: { w: 'l2w', h: 'l2h', windup: 0.3, active: 0.12, recover: 0.7, reach: 2.2, arc: 1.1, dmg: 12, post: 18, lunge: 2.0, kind: 'parry' },
  fb: { w: 'bashw', h: 'bashh', windup: 0.6, active: 0.14, recover: 0.8, reach: 1.7, arc: 0.9, dmg: 6, post: 60, lunge: 3.5, kind: 'bash' },
  // spearman
  s1: { w: 'thrw', h: 'thrh', windup: 0.6, active: 0.14, recover: 0.7, reach: 3.4, arc: 0.35, dmg: 15, post: 22, lunge: 2.5, kind: 'parry', twoHand: true },
  s2: { w: 'swpw', h: 'swph', windup: 0.75, active: 0.16, recover: 0.8, reach: 3.1, arc: 1.6, dmg: 16, post: 25, lunge: 1.0, kind: 'red', twoHand: true },
  // brute (axe)
  b1: { w: 'ohw', h: 'ohh', windup: 0.95, active: 0.14, recover: 1.0, reach: 2.6, arc: 0.5, dmg: 30, post: 45, lunge: 2.5, kind: 'red', twoHand: true, shake: 0.8 },
  b2: { w: 'swpw', h: 'swph', windup: 0.7, active: 0.16, recover: 0.8, reach: 2.7, arc: 1.7, dmg: 20, post: 45, lunge: 1.5, kind: 'parry', twoHand: true },
  // the Fallen King (greatsword)
  k1: { w: 'swpw', h: 'swph', windup: 0.5, active: 0.14, recover: 0.25, reach: 3.4, arc: 1.5, dmg: 18, post: 26, lunge: 2.8, kind: 'parry', twoHand: true, combo: 'k2' },
  k2: { w: 'l2w', h: 'l2h', windup: 0.32, active: 0.14, recover: 0.25, reach: 3.4, arc: 1.4, dmg: 18, post: 26, lunge: 2.4, kind: 'parry', twoHand: true, combo: 'k3' },
  k3: { w: 'ohw', h: 'ohh', windup: 0.62, active: 0.14, recover: 0.95, reach: 3.5, arc: 0.6, dmg: 28, post: 35, lunge: 3.2, kind: 'parry', twoHand: true, shake: 0.6 },
  kt: { w: 'thrw', h: 'thrh', windup: 0.7, active: 0.16, recover: 0.8, reach: 4.0, arc: 0.4, dmg: 24, post: 30, lunge: 9.0, kind: 'parry', twoHand: true },
  kj: { w: 'ohw', h: 'ohh', windup: 1.0, active: 0.16, recover: 1.2, reach: 4.2, arc: 3.2, dmg: 34, post: 50, lunge: 7.5, kind: 'red', twoHand: true, shake: 1.2, leap: 2.6, shock: 4.5 },
  ks: { w: 'swpw', h: 'swph', windup: 0.85, active: 0.3, recover: 0.9, reach: 4.0, arc: 3.2, dmg: 26, post: 40, lunge: 0.5, kind: 'red', twoHand: true, spin: true },
};

// ---------------------------------------------------------------- the layer
/**
 * The fighter's animation state (set by gameplay each frame):
 *   f.anim.base   'guard' | 'guard2h' | 'bow' | null      stance when idle/moving
 *   f.act         { pose: 'block'|'hit'|..., w } a held pose (block, stagger, dead...)
 *   f.atk         { def, t } the running attack (phase timing from ATTACKS)
 * Returns a high smoothing rate while an attack is running so the swing reads crisply.
 */
export function installLayer(f) {
  f.anim.extraLayer = (a, dt) => {
    const moving = a.speed > 0.4;
    // base stance (upper body always; legs only when standing)
    const base = f.stance && POSES[f.stance];
    if (base) apply(a, base, null, 0, 0.85, moving);
    let lambda = 0;
    if (f.atk) {
      const d = f.atk.def, t = f.atk.t, P0 = POSES[f.stance] || {}, W = POSES[d.w], H = POSES[d.h];
      if (t < d.windup) apply(a, P0, W, ease.out(t / d.windup), 1, false);
      else if (t < d.windup + d.active) apply(a, W, H, ease.snap((t - d.windup) / d.active), 1, false);
      else apply(a, H, P0, ease.io(Math.min(1, (t - d.windup - d.active) / d.recover)), 1, false);
      lambda = t < d.windup ? 18 : 38;
    } else if (f.act && POSES[f.act.pose]) {
      apply(a, POSES[f.act.pose], null, 0, f.act.w ?? 1, f.act.pose === 'block' && moving);
      lambda = f.act.lambda || 22;
    }
    // falling: tip the whole body over around the feet
    if (f.state === 'dead') { const k = Math.min(1, (f.deadT || 0) * 2.2); a.rootRot.x = -1.42 * k; a.rootOff.z = -0.3 * k; a.rootOff.y = -0.05 * k; }
    return lambda;
  };
}

/** Blend pose p (or p→q at k) into the animator's target with weight w. */
function apply(a, p, q, k, w, skipLegs) {
  const keys = new Set(Object.keys(p)); if (q) for (const n of Object.keys(q)) keys.add(n);
  for (const n of keys) {
    if (n === 'hip') continue;
    if (skipLegs && LEGS.has(n)) continue;
    const bi = B[n]; if (bi === undefined) continue;
    const u = p[n] || [0, 0, 0], v = q ? q[n] || [0, 0, 0] : u;
    a.mix(bi, lerp(u[0], v[0], k), lerp(u[1] || 0, v[1] || 0, k), lerp(u[2] || 0, v[2] || 0, k), w);
  }
  if (!skipLegs) {
    const u = p.hip || [0, 0, 0], v = q ? q.hip || [0, 0, 0] : u;
    a.hip.x += lerp(u[0], v[0], k) * w; a.hip.y += lerp(u[1], v[1], k) * w; a.hip.z += lerp(u[2], v[2], k) * w;
  }
}
