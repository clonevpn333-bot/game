// GETAWAY! — stylized humanoids: procedural FK animation with pose blending, verlet ragdolls,
// and a single instanced renderer that draws every character in the city in a handful of draw calls.
import * as THREE from 'three';
import { clamp, lerp, smoothstep, rand, makeRng } from '../core/utils.js';
import { mergeParts } from '../world/props.js';

// joint indices
export const J = { pelvis: 0, chest: 1, head: 2, lSh: 3, lEl: 4, lHa: 5, rSh: 6, rEl: 7, rHa: 8, lHip: 9, lKn: 10, lFt: 11, rHip: 12, rKn: 13, rFt: 14 };
const NJ = 15;
// pose parameter indices
const P = { hipH: 0, spP: 1, spY: 2, spR: 3, hdY: 4, hdP: 5, lHP: 6, lHR: 7, lKn: 8, rHP: 9, rHR: 10, rKn: 11, lSP: 12, lSR: 13, lSY: 14, lEl: 15, rSP: 16, rSR: 17, rSY: 18, rEl: 19, lean: 20, offX: 21, offZ: 22 };
const NP = 23;
const UPPER = [P.spP, P.spY, P.spR, P.hdY, P.hdP, P.lSP, P.lSR, P.lSY, P.lEl, P.rSP, P.rSR, P.rSY, P.rEl];
const ARMS_R = [P.rSP, P.rSR, P.rSY, P.rEl], ARMS = [P.lSP, P.lSR, P.lSY, P.lEl, P.rSP, P.rSR, P.rSY, P.rEl];

const DIM = { hipH: 0.95, thigh: 0.45, shin: 0.45, torso: 0.5, shW: 0.19, hipW: 0.095, upper: 0.29, fore: 0.27, neck: 0.2 };
const SKINS = [0xf1c8a4, 0xe0ac7f, 0xc68a5e, 0x9a6440, 0x6e4529, 0xf5d5bd, 0xb57e55];
const HAIRS = [0x1b120c, 0x3b2416, 0x6b4325, 0xb88a4a, 0x161616, 0x8a8a8a, 0x5a2e1a, 0xd9c08a];
const SHIRTS = [0xc0392b, 0x2980b9, 0x27ae60, 0xf1c40f, 0x8e44ad, 0xecf0f1, 0x34495e, 0xe67e22, 0x16a085, 0xd35400, 0x2c3e50, 0xbdc3c7, 0x7f8c8d, 0xff6b81, 0x1e3799];
const PANTS = [0x2c3e50, 0x34495e, 0x1b2631, 0x5d4037, 0x7f8c8d, 0x212121, 0x3b5998, 0xa1887f, 0x4e342e];

export function randomLook(rng = Math.random) {
  const r = typeof rng === 'function' ? rng : Math.random; const p = (a) => a[(r() * a.length) | 0];
  const long = r() < 0.4;
  return { skin: p(SKINS), hair: p(HAIRS), hairStyle: long ? (r() < 0.5 ? 'long' : 'bun') : r() < 0.15 ? 'bald' : 'cap', shirt: p(SHIRTS), sleeve: r() < 0.5 ? 'short' : 'long', pants: p(PANTS), shoes: p([0x111111, 0x3e2723, 0xeeeeee, 0x5d4037, 0x263238]), scale: 0.92 + r() * 0.16, build: 0.9 + r() * 0.25, hat: r() < 0.08 ? 'beanie' : null, bag: false };
}
export const LOOKS = {
  kit: { skin: 0xd9a27a, hair: 0x5a2416, hairStyle: 'bun', shirt: 0x26292e, sleeve: 'long', pants: 0x22324a, shoes: 0x111111, scale: 1.0, build: 0.95, hat: null, jacket: 0x26292e },
  police: () => ({ ...randomLook(), shirt: 0x1d2c4f, sleeve: 'short', pants: 0x151c2c, shoes: 0x0a0a0a, hat: 'cap', hatColor: 0x1d2c4f }),
  swat: () => ({ ...randomLook(), shirt: 0x22262b, sleeve: 'long', pants: 0x22262b, shoes: 0x111111, hat: 'helmet', hatColor: 0x1a1d21, vest: true, build: 1.12 }),
  halcyon: () => ({ ...randomLook(), shirt: 0x0d0f12, sleeve: 'long', pants: 0x0d0f12, shoes: 0x0a0a0a, hat: Math.random() < 0.5 ? 'beanie' : null, hatColor: 0x0d0f12, build: 1.08, shades: true }),
  thug: () => ({ ...randomLook(), shirt: [0x7a1f1f, 0x2d2d2d, 0x3e4a2f][(Math.random() * 3) | 0], hat: Math.random() < 0.4 ? 'beanie' : null, hatColor: 0x222222 }),
  worker: () => ({ ...randomLook(), shirt: 0xe67e22, hat: 'helmet', hatColor: 0xf1c40f }),
};

// ---------------- pose library ----------------
function zero(o) { o.fill(0); o[P.hipH] = DIM.hipH; return o; }
export const Poses = {
  idle(o, t, w = 0) { zero(o); const b = Math.sin(t * 1.6) * 0.012; o[P.hipH] -= 0.02 + b; o[P.spP] = 0.03 + b; o[P.lKn] = o[P.rKn] = 0.08; o[P.lHP] = o[P.rHP] = 0.04; o[P.lSR] = o[P.rSR] = 0.12; o[P.lEl] = o[P.rEl] = 0.2; o[P.lHR] = o[P.rHR] = 0.04; o[P.hdY] = Math.sin(t * 0.4 + w) * 0.3; return o; },
  walk(o, ph, k = 1) {
    zero(o); const s = Math.sin(ph), c = Math.cos(ph); const A = 0.38 * k; const sw = (x) => Math.max(0, x) ** 1.3;
    o[P.lHP] = A * s + 0.04; o[P.rHP] = -A * s + 0.04; o[P.lKn] = 0.08 + sw(c) * 0.85 * k; o[P.rKn] = 0.08 + sw(-c) * 0.85 * k;
    o[P.lSP] = -A * 0.75 * s; o[P.rSP] = A * 0.75 * s; o[P.lEl] = 0.22 + Math.max(0, -s) * 0.25; o[P.rEl] = 0.22 + Math.max(0, s) * 0.25; o[P.lSR] = o[P.rSR] = 0.09;
    o[P.hipH] -= 0.025 + Math.abs(s) * 0.03 * k; o[P.spP] = 0.04; o[P.spY] = -s * 0.1 * k; o[P.spR] = s * 0.03; o[P.lean] = 0; o[P.hdY] = s * 0.06 * k; return o;
  },
  run(o, ph, k = 1) {
    zero(o); const s = Math.sin(ph), c = Math.cos(ph); const sw = (x) => Math.max(0, x) ** 1.2; const A = 0.8 * k;
    // legs: thigh swing, knee drives up during swing, near-straight on push-off
    o[P.lHP] = 0.22 + A * s; o[P.rHP] = 0.22 - A * s;
    o[P.lKn] = 0.25 + sw(c) * 1.75 * k + sw(-s) * 0.25; o[P.rKn] = 0.25 + sw(-c) * 1.75 * k + sw(s) * 0.25;
    // arms pump opposite to legs, elbows ~90deg, slightly across the body
    o[P.lSP] = -A * 1.0 * s + 0.15; o[P.rSP] = A * 1.0 * s + 0.15; o[P.lEl] = 1.55 - s * 0.25; o[P.rEl] = 1.55 + s * 0.25;
    o[P.lSR] = o[P.rSR] = 0.12; o[P.lSY] = o[P.rSY] = 0.18;
    // torso: forward lean, shoulders counter-rotate, flight-phase bob
    o[P.spP] = 0.16 + 0.12 * k; o[P.spY] = -s * 0.2 * k; o[P.spR] = s * 0.04;
    o[P.hipH] -= 0.06 + 0.05 * k - Math.cos(2 * ph) * 0.035 * k; o[P.hdP] = -0.14 * k; o[P.hdY] = s * 0.08; return o;
  },
  crouch(o, ph, moving) { zero(o); const s = Math.sin(ph) * (moving ? 1 : 0), c = Math.cos(ph) * (moving ? 1 : 0); o[P.hipH] = 0.62; o[P.lHP] = 0.95 + s * 0.3; o[P.rHP] = 0.95 - s * 0.3; o[P.lKn] = 1.7 - Math.max(0, c) * 0.4; o[P.rKn] = 1.7 - Math.max(0, -c) * 0.4; o[P.spP] = 0.45; o[P.lEl] = o[P.rEl] = 1.0; o[P.lSP] = o[P.rSP] = 0.4; o[P.hdP] = -0.35; return o; },
  leap(o, vy) { zero(o); const t = clamp(vy / 7, -1, 1); o[P.lHP] = 1.25; o[P.lKn] = 0.35 + Math.max(0, -t) * 0.9; o[P.rHP] = -0.55; o[P.rKn] = 0.9; o[P.lSP] = 2.3 - t * 0.4; o[P.rSP] = -0.6 + t * 0.4; o[P.lSR] = 0.3; o[P.rSR] = 0.45; o[P.lEl] = 0.3; o[P.rEl] = 0.9; o[P.spP] = 0.35; o[P.hdP] = -0.3; o[P.hipH] -= 0.05; return o; },
  jump(o, vy) { zero(o); const t = clamp(vy / 6, -1, 1); o[P.lHP] = 0.7; o[P.rHP] = 0.2 - t * 0.2; o[P.lKn] = 1.2; o[P.rKn] = 0.5 + Math.max(0, -t) * 0.6; o[P.lSP] = 0.5 + t * 0.6; o[P.rSP] = -0.2 + t * 0.9; o[P.lSR] = o[P.rSR] = 0.5; o[P.lEl] = o[P.rEl] = 0.6; o[P.spP] = 0.15; return o; },
  fall(o, t) { zero(o); o[P.lHP] = 0.4 + Math.sin(t * 9) * 0.4; o[P.rHP] = 0.4 - Math.sin(t * 9) * 0.4; o[P.lKn] = o[P.rKn] = 0.7; o[P.lSP] = 1.6 + Math.sin(t * 11) * 0.5; o[P.rSP] = 1.6 - Math.sin(t * 11) * 0.5; o[P.lSR] = o[P.rSR] = 0.9; o[P.lEl] = o[P.rEl] = 0.5; o[P.spP] = -0.2; return o; },
  climb(o, t) { zero(o); const s = Math.sin(t * 7); o[P.hipH] = 0.9; o[P.lSP] = 2.6 + s * 0.3; o[P.rSP] = 2.6 - s * 0.3; o[P.lEl] = o[P.rEl] = 0.6 + Math.abs(s) * 0.5; o[P.lSR] = o[P.rSR] = 0.25; o[P.lHP] = 0.6 + s * 0.5; o[P.rHP] = 0.6 - s * 0.5; o[P.lKn] = 1.1 + s * 0.4; o[P.rKn] = 1.1 - s * 0.4; o[P.spP] = 0.1; o[P.hdP] = 0.4; return o; },
  mantle(o, t) { zero(o); const k = clamp(t, 0, 1); o[P.hipH] = 0.7 + k * 0.25; o[P.spP] = 0.9 - k * 0.8; o[P.lSP] = 1.2 - k * 1.2; o[P.rSP] = 1.2 - k * 1.2; o[P.lEl] = o[P.rEl] = 0.2; o[P.lHP] = 1.4 - k; o[P.rHP] = 0.5; o[P.lKn] = 1.8 - k * 1.4; o[P.rKn] = 0.8; return o; },
  vault(o, t) { zero(o); o[P.hipH] = 0.95; o[P.spP] = 0.5; o[P.lean] = -0.5; o[P.lSP] = 0.6; o[P.lSR] = 0.2; o[P.rSP] = 0.9; o[P.rSR] = 0.9; o[P.lHP] = 1.2; o[P.rHP] = 1.0; o[P.lHR] = 0.6; o[P.rHR] = 0.5; o[P.lKn] = 0.6; o[P.rKn] = 0.4; return o; },
  slide(o) { zero(o); o[P.hipH] = 0.35; o[P.spP] = -0.6; o[P.lHP] = 1.45; o[P.lKn] = 0.15; o[P.rHP] = 1.1; o[P.rKn] = 1.3; o[P.lSP] = -0.4; o[P.lSR] = 0.9; o[P.rSP] = 0.6; o[P.rEl] = 0.8; o[P.hdP] = 0.4; return o; },
  sit(o) { zero(o); o[P.hipH] = 0.5; o[P.lHP] = o[P.rHP] = 1.45; o[P.lKn] = o[P.rKn] = 1.35; o[P.lHR] = o[P.rHR] = 0.08; o[P.lSP] = o[P.rSP] = 1.1; o[P.lEl] = o[P.rEl] = 0.6; o[P.lSR] = o[P.rSR] = 0.15; o[P.lSY] = o[P.rSY] = 0.25; o[P.spP] = -0.15; return o; },
  ride(o) { zero(o); o[P.hipH] = 0.95; o[P.lHP] = o[P.rHP] = 1.2; o[P.lKn] = o[P.rKn] = 1.7; o[P.lHR] = o[P.rHR] = 0.25; o[P.spP] = 0.7; o[P.lSP] = o[P.rSP] = 1.25; o[P.lEl] = o[P.rEl] = 0.5; o[P.lSR] = o[P.rSR] = 0.3; o[P.hdP] = -0.6; return o; },
  handsUp(o, t) { this.idle(o, t); o[P.lSP] = o[P.rSP] = 0.3; o[P.lSR] = o[P.rSR] = 1.6; o[P.lEl] = o[P.rEl] = 1.5; o[P.lSY] = o[P.rSY] = 0.2; o[P.hdP] = 0.1; return o; },
  cower(o, t) { zero(o); o[P.hipH] = 0.5; o[P.lHP] = o[P.rHP] = 1.6; o[P.lKn] = o[P.rKn] = 2.3; o[P.spP] = 0.9 + Math.sin(t * 20) * 0.02; o[P.lSP] = o[P.rSP] = 2.6; o[P.lEl] = o[P.rEl] = 2.4; o[P.lSR] = o[P.rSR] = 0.5; o[P.hdP] = -0.6; return o; },
  flee(o, ph) { this.run(o, ph, 1.05); o[P.lSP] = 2.2 + Math.sin(ph * 2) * 0.6; o[P.rSP] = 2.0 - Math.sin(ph * 2) * 0.6; o[P.lSR] = o[P.rSR] = 0.7; o[P.lEl] = o[P.rEl] = 0.8; o[P.hdY] = Math.sin(ph * 0.5) * 0.5; return o; },
  phone(o, t) { this.idle(o, t); o[P.rSP] = 0.4; o[P.rSR] = 0.35; o[P.rEl] = 2.4; o[P.rSY] = 0.6; o[P.hdY] = 0.2; o[P.hdP] = 0.1; return o; },
  swim(o, ph) { zero(o); o[P.hipH] = 0.95; o[P.spP] = 1.35; o[P.lSP] = 2.4 + Math.sin(ph) * 1.2; o[P.rSP] = 2.4 - Math.sin(ph) * 1.2; o[P.lSR] = o[P.rSR] = 0.3; o[P.lHP] = -0.3 + Math.sin(ph * 2) * 0.3; o[P.rHP] = -0.3 - Math.sin(ph * 2) * 0.3; o[P.lKn] = o[P.rKn] = 0.3; o[P.hdP] = -0.9; return o; },
  dive(o, t) { zero(o); o[P.hipH] = 0.7 - t * 0.4; o[P.spP] = 1.1; o[P.lSP] = o[P.rSP] = 2.6; o[P.lHP] = -0.2; o[P.rHP] = 0.3; o[P.lKn] = 0.5; o[P.rKn] = 0.2; return o; },
  // upper-body overlays
  aim(o, kind, pitch) {
    const p = clamp(pitch, -1.2, 1.2);
    if (kind === 'rifle' || kind === 'shotgun' || kind === 'smg' || kind === 'heavy') { o[P.rSP] = 1.35 + p; o[P.rSR] = 0.35; o[P.rSY] = 0.25; o[P.rEl] = 1.15; o[P.lSP] = 1.5 + p; o[P.lSR] = 0.05; o[P.lSY] = 0.55; o[P.lEl] = 0.55; o[P.spY] = -0.3; o[P.hdY] = 0.3; }
    else { o[P.rSP] = 1.55 + p; o[P.rSR] = 0.0; o[P.rSY] = 0.12; o[P.rEl] = 0.08; o[P.lSP] = 1.45 + p; o[P.lSR] = 0.05; o[P.lSY] = 0.5; o[P.lEl] = 0.3; o[P.spY] = -0.12; o[P.hdY] = 0.1; }
    o[P.hdP] = -p * 0.7; o[P.spP] = Math.max(o[P.spP], 0.08); return o;
  },
  hold(o, kind) { if (kind === 'pistol') { o[P.rSP] = 0.25; o[P.rEl] = 0.6; } else { o[P.rSP] = 0.55; o[P.rSR] = 0.2; o[P.rEl] = 1.5; o[P.rSY] = 0.4; o[P.lSP] = 0.8; o[P.lSY] = 0.6; o[P.lEl] = 1.2; } return o; },
  reload(o, t) { o[P.lSP] = 1.0 + Math.sin(t * 12) * 0.3; o[P.lSY] = 0.7; o[P.lEl] = 1.6; o[P.rSP] = 0.9; o[P.rEl] = 1.3; o[P.rSY] = 0.3; o[P.hdP] = 0.4; return o; },
  punch(o, t, right = true) { const k = Math.sin(clamp(t, 0, 1) * Math.PI); const a = right ? P.rSP : P.lSP, e = right ? P.rEl : P.lEl, y2 = right ? P.rSY : P.lSY; o[a] = 0.5 + k * 1.1; o[e] = 1.6 - k * 1.5; o[y2] = 0.3 * k; o[P.spY] = (right ? -1 : 1) * 0.5 * k; o[P.spP] = 0.15; return o; },
  carry(o) { o[P.lSP] = -0.1; o[P.lSR] = 0.35; o[P.lEl] = 0.15; return o; },
  hit(o, t) { const k = Math.sin(clamp(t, 0, 1) * Math.PI); o[P.spP] -= 0.4 * k; o[P.hdP] += 0.4 * k; o[P.lSR] += 0.5 * k; o[P.rSR] += 0.5 * k; return o; },
};

// ---------------- FK ----------------
const _d = new Float32Array(3), _u = new Float32Array(3), _f = new Float32Array(3);
function limbDir(pitch, roll, yaw, side, out) {
  const cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  let x = side * sr * Math.max(0.2, Math.abs(cp)), y = -cr * cp, z = sp * (pitch > Math.PI / 2 ? 1 : 1);
  if (pitch > Math.PI / 2) { y = -cr * cp; } // arm raised overhead
  const l = Math.hypot(x, y, z) || 1; x /= l; y /= l; z /= l;
  if (yaw) { const cy = Math.cos(yaw * side), sy = Math.sin(yaw * side); const nx = x * cy - z * sy, nz = x * sy + z * cy; x = nx; z = nz; } // inward swing
  out[0] = x; out[1] = y; out[2] = z; return out;
}
function bend(u, flex, hintBackward, out) { // rotate dir u by flex toward hint plane
  const fx = 0, fyA = hintBackward ? 0 : 1, fzA = hintBackward ? -1 : 1;
  // blend hint: if u nearly parallel to forward/back axis, use vertical
  const par = Math.abs(u[2]); const mix = smoothstep(0.45, 0.92, par);
  let hx = fx, hy = hintBackward ? -mix : mix, hz = fzA * (1 - mix);
  const dp = hx * u[0] + hy * u[1] + hz * u[2]; hx -= dp * u[0]; hy -= dp * u[1]; hz -= dp * u[2]; const hl = Math.hypot(hx, hy, hz) || 1; hx /= hl; hy /= hl; hz /= hl;
  const c = Math.cos(flex), s = Math.sin(flex); out[0] = u[0] * c + hx * s; out[1] = u[1] * c + hy * s; out[2] = u[2] * c + hz * s; return out;
}
function rotSpine(v, sp, sy, sr, out) { // Euler YXZ on vector v -> out (Ry * Rx * Rz)
  let [x, y, z] = v; let c = Math.cos(sr), s = Math.sin(sr); let x1 = x * c - y * s, y1 = x * s + y * c; x = x1; y = y1;
  c = Math.cos(sp); s = Math.sin(sp); y1 = y * c - z * s; let z1 = y * s + z * c; y = y1; z = z1;
  c = Math.cos(sy); s = Math.sin(sy); x1 = x * c + z * s; z1 = -x * s + z * c; out[0] = x1; out[1] = y; out[2] = z1; return out;
}
const _tmp = new Float32Array(3), _tmp2 = new Float32Array(3);
export function solveFK(p, scale, out) { // local-space joints (x left, y up, z forward)
  const S = scale; const set = (j, x, y, z) => { out[j * 3] = x; out[j * 3 + 1] = y; out[j * 3 + 2] = z; };
  const px = p[P.offX], pz = p[P.offZ], py = p[P.hipH] * S;
  set(J.pelvis, px, py, pz);
  rotSpine([0, DIM.torso * S, 0], p[P.spP], p[P.spY], p[P.spR] + p[P.lean], _tmp); const cx = px + _tmp[0], cy = py + _tmp[1], cz = pz + _tmp[2]; set(J.chest, cx, cy, cz);
  rotSpine([Math.sin(p[P.hdY]) * 0.02, DIM.neck * S, 0.02 + Math.sin(p[P.hdP]) * -0.03], p[P.spP] + p[P.hdP] * 0.3, p[P.spY] + p[P.hdY], p[P.spR], _tmp); set(J.head, cx + _tmp[0], cy + _tmp[1], cz + _tmp[2]);
  for (const side of [1, -1]) {
    const L = side > 0; const shJ = L ? J.lSh : J.rSh, elJ = L ? J.lEl : J.rEl, haJ = L ? J.lHa : J.rHa;
    rotSpine([side * DIM.shW * S, -0.06 * S, 0], p[P.spP], p[P.spY], p[P.spR] + p[P.lean], _tmp); const sx = cx + _tmp[0], sy = cy + _tmp[1], sz = cz + _tmp[2]; set(shJ, sx, sy, sz);
    limbDir(p[L ? P.lSP : P.rSP], p[L ? P.lSR : P.rSR], p[L ? P.lSY : P.rSY], side, _u);
    bend(_u, p[L ? P.lEl : P.rEl], false, _f);
    rotSpine(_u, p[P.spP], p[P.spY], p[P.spR] + p[P.lean], _tmp); rotSpine(_f, p[P.spP], p[P.spY], p[P.spR] + p[P.lean], _tmp2);
    const ex = sx + _tmp[0] * DIM.upper * S, ey = sy + _tmp[1] * DIM.upper * S, ez = sz + _tmp[2] * DIM.upper * S; set(elJ, ex, ey, ez);
    set(haJ, ex + _tmp2[0] * DIM.fore * S, ey + _tmp2[1] * DIM.fore * S, ez + _tmp2[2] * DIM.fore * S);
    // legs
    const hJ = L ? J.lHip : J.rHip, kJ = L ? J.lKn : J.rKn, fJ = L ? J.lFt : J.rFt;
    const hx = px + side * DIM.hipW * S, hy = py - 0.05 * S, hz = pz; set(hJ, hx, hy, hz);
    limbDir(p[L ? P.lHP : P.rHP], p[L ? P.lHR : P.rHR], 0, side, _u); bend(_u, p[L ? P.lKn : P.rKn], true, _f);
    const kx = hx + _u[0] * DIM.thigh * S, ky = hy + _u[1] * DIM.thigh * S, kz = hz + _u[2] * DIM.thigh * S; set(kJ, kx, ky, kz);
    set(fJ, kx + _f[0] * DIM.shin * S, ky + _f[1] * DIM.shin * S, kz + _f[2] * DIM.shin * S);
  }
  return out;
}

// ---------------- Human ----------------
const RAG_LINKS = [[0, 1], [1, 2], [1, 3], [1, 6], [3, 4], [4, 5], [6, 7], [7, 8], [0, 9], [0, 12], [9, 10], [10, 11], [12, 13], [13, 14], [3, 6], [9, 12], [3, 9], [6, 12], [3, 12], [6, 9], [2, 3], [2, 6]];
let HID = 0;
export class Human {
  constructor(look, { x = 0, y = 0, z = 0, yaw = 0 } = {}) {
    this.id = ++HID; this.look = look; this.scale = look.scale || 1;
    this.pos = new THREE.Vector3(x, y, z); this.vel = new THREE.Vector3(); this.yaw = yaw;
    this.pose = zero(new Float32Array(NP)); this.tmpA = new Float32Array(NP); this.tmpB = new Float32Array(NP);
    this.local = new Float32Array(NJ * 3); this.joints = new Float32Array(NJ * 3);
    this.phase = Math.random() * 6; this.t = Math.random() * 10; this.speed = 0;
    this.mode = 'anim'; // anim | ragdoll | getup | hidden
    this.state = 'idle'; this.aim = null; this.weapon = null; this.upper = null; this.upperT = 0; this.carryBag = false;
    this.visible = true; this.grounded = true; this.vy = 0; this.crouch = false; this.alive = true;
    this.rp = new Float32Array(NJ * 3); this.rprev = new Float32Array(NJ * 3); this.rlen = new Float32Array(RAG_LINKS.length); this.ragT = 0; this.snap = new Float32Array(NJ * 3); this.getupT = 0;
    this.footstepT = 0; this.lastFoot = 0; this.outPose = zero(new Float32Array(NP)); this.fromPose = zero(new Float32Array(NP)); this.blendT = 1; this._lastSt = ''; this.aimW = 0; this._lastAim = null;
  }
  // locomotion animation drive (speed m/s) - called by controllers
  animate(dt, opts = {}) {
    this.t += dt; const p = this.pose; const sp = this.speed;
    if (this.mode === 'ragdoll') { this._ragdoll(dt); return; }
    const st = this.state;
    if (st === 'jump') { if (this.leap) Poses.leap(p, this.vy); else Poses.jump(p, this.vy); }
    else if (st === 'fall') Poses.fall(p, this.t);
    else if (st === 'climb') Poses.climb(p, this.t);
    else if (st === 'mantle') Poses.mantle(p, this.stateT || 0);
    else if (st === 'vault') Poses.vault(p, this.stateT || 0);
    else if (st === 'slide') Poses.slide(p);
    else if (st === 'sit') Poses.sit(p);
    else if (st === 'ride') Poses.ride(p);
    else if (st === 'handsUp') Poses.handsUp(p, this.t);
    else if (st === 'cower') Poses.cower(p, this.t);
    else if (st === 'phone') Poses.phone(p, this.t);
    else if (st === 'swim') { this.phase += dt * 3; Poses.swim(p, this.phase); }
    else if (st === 'dive') Poses.dive(p, clamp(this.stateT || 0, 0, 1));
    else if (st === 'crouch') { this.phase += dt * sp * 3.2; Poses.crouch(p, this.phase, sp > 0.3); }
    else {
      // locomotion blend: idle / walk / run / sprint
      if (sp < 0.15) Poses.idle(p, this.t, this.id);
      else {
        const stride = sp < 2.6 ? 1.35 : sp < 6.5 ? 2.2 : 2.7; this.phase += dt * sp / stride * Math.PI;
        if (st === 'flee') Poses.flee(p, this.phase);
        else if (sp < 2.6) { Poses.walk(p, this.phase, clamp(sp / 1.6, 0.4, 1.2)); if (sp < 0.8) { Poses.idle(this.tmpA, this.t, this.id); this._blend(p, this.tmpA, 1 - sp / 0.8); } }
        else { Poses.run(p, this.phase, clamp(sp / 6, 0.7, 1.25)); if (sp < 3.4) { Poses.walk(this.tmpA, this.phase, 1.2); this._blend(p, this.tmpA, (3.4 - sp) / 0.8); } }
        // footsteps
        const fs = Math.floor(this.phase / Math.PI); if (fs !== this.lastFoot) { this.lastFoot = fs; if (this.onFootstep) this.onFootstep(sp); }
      }
    }
    // upper body overlays (aim eases in/out)
    if (this.aim) this._lastAim = this.aim; this.aimW += ((this.aim ? 1 : 0) - this.aimW) * Math.min(1, dt * 14);
    if (this._lastAim && this.aimW > 0.01 && this.mode === 'anim' && st !== 'climb' && st !== 'swim' && st !== 'ride' && st !== 'sit') {
      this.tmpB.set(p); Poses.aim(this.tmpB, this._lastAim.kind, this._lastAim.pitch); this._blendIdx(p, this.tmpB, UPPER, (this._lastAim.w ?? 1) * this.aimW);
      if (this.aim && this.aim.recoil) { p[P.rSP] += this.aim.recoil * 0.4; p[P.rEl] += this.aim.recoil * 0.3; p[P.spP] -= this.aim.recoil * 0.1; this.aim.recoil *= Math.exp(-dt * 18); }
    } else if (this.weapon && (st === 'idle' || st === 'walk' || st === 'run' || st === 'flee' || st === 'crouch' || !st)) { this.tmpB.set(p); Poses.hold(this.tmpB, this.weapon); this._blendIdx(p, this.tmpB, ARMS_R, this.weapon === 'pistol' ? 0.6 : 0.9); if (this.weapon !== 'pistol') this._blendIdx(p, this.tmpB, [P.lSP, P.lSY, P.lEl], 0.85); }
    if (this.carryBag && st !== 'climb') Poses.carry(p);
    if (this.upper) { this.upperT += dt; const u = this.upper; const k = clamp(this.upperT / u.dur, 0, 1); this.tmpB.set(p); if (u.name === 'reload') Poses.reload(this.tmpB, this.upperT); else if (u.name === 'punch') Poses.punch(this.tmpB, k, u.right); else if (u.name === 'hit') Poses.hit(this.tmpB, k); else if (u.name === 'wave') { this.tmpB[P.rSP] = 0.3; this.tmpB[P.rSR] = 2.4 + Math.sin(this.upperT * 12) * 0.3; this.tmpB[P.rEl] = 0.6; }
      this._blendIdx(p, this.tmpB, UPPER, Math.min(1, Math.sin(k * Math.PI) * 3)); if (k >= 1) this.upper = null; }
    if (opts.lean) p[P.lean] += opts.lean;
    // cross-fade between states so nothing ever snaps
    const key = st === 'run' || st === 'idle' || st === 'flee' ? 'loco' : st;
    if (key !== this._lastSt) { this.fromPose.set(this.outPose); this.blendT = 0; this._lastSt = key; }
    this.blendT += dt; const bw = smoothstep(0, 1, this.blendT / (key === 'jump' ? 0.12 : 0.2));
    for (let i = 0; i < NP; i++) this.outPose[i] = bw < 1 ? lerp(this.fromPose[i], p[i], bw) : p[i];
    solveFK(this.outPose, this.scale, this.local);
    this._toWorld();
    if (this.mode === 'getup') { this.getupT += dt / 1.1; const k = smoothstep(0, 1, this.getupT); for (let i = 0; i < NJ * 3; i++) this.joints[i] = lerp(this.snap[i], this.joints[i], k); if (this.getupT >= 1) this.mode = 'anim'; }
  }
  _blend(a, b, w) { w = clamp(w, 0, 1); for (let i = 0; i < NP; i++) a[i] = lerp(a[i], b[i], w); }
  _blendIdx(a, b, idx, w) { w = clamp(w, 0, 1); for (const i of idx) a[i] = lerp(a[i], b[i], w); }
  _toWorld() {
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw), L = this.local, W = this.joints, px = this.pos.x, py = this.pos.y, pz = this.pos.z;
    if (this.tumble) { const ct = Math.cos(this.tumble), st = Math.sin(this.tumble), pv = 0.55; for (let j = 0; j < NJ; j++) { const y = L[j * 3 + 1] - pv, z = L[j * 3 + 2]; L[j * 3 + 1] = pv + y * ct - z * st; L[j * 3 + 2] = y * st + z * ct; } }
    for (let j = 0; j < NJ; j++) { const x = L[j * 3], y = L[j * 3 + 1], z = L[j * 3 + 2]; W[j * 3] = px + x * c + z * s; W[j * 3 + 1] = py + y; W[j * 3 + 2] = pz - x * s + z * c; }
  }
  joint(j, out = new THREE.Vector3()) { return out.set(this.joints[j * 3], this.joints[j * 3 + 1], this.joints[j * 3 + 2]); }
  get headPos() { return this.joint(J.head); }
  // ---------------- ragdoll ----------------
  ragdoll(vel, S, spin = 0) {
    if (this.mode === 'ragdoll') { for (let j = 0; j < NJ; j++) for (let k = 0; k < 3; k++) this.rprev[j * 3 + k] -= vel.getComponent(k) * 0.016 * 0.5; return; }
    this.S = S; this.mode = 'ragdoll'; this.ragT = 0; this.settleT = 0; this.rp.set(this.joints);
    const dt = 1 / 60;
    for (let j = 0; j < NJ; j++) { const h = (this.joints[j * 3 + 1] - this.pos.y); const sx = spin * (h - 0.9) * 0.5; for (let k = 0; k < 3; k++) this.rprev[j * 3 + k] = this.rp[j * 3 + k] - (vel.getComponent(k) + (k === 0 ? sx * Math.cos(this.yaw) : k === 2 ? -sx * Math.sin(this.yaw) : 0) * (k !== 1 ? 1 : 0)) * dt * (0.85 + Math.random() * 0.3); }
    RAG_LINKS.forEach(([a, b], i) => { this.rlen[i] = Math.hypot(this.rp[a * 3] - this.rp[b * 3], this.rp[a * 3 + 1] - this.rp[b * 3 + 1], this.rp[a * 3 + 2] - this.rp[b * 3 + 2]); });
  }
  _ragdoll(dt) {
    const S = this.S; const p = this.rp, q = this.rprev; const g = 15 * dt * dt; const n = Math.min(3, Math.ceil(dt * 120)); const h = dt / n;
    for (let it = 0; it < n; it++) {
      const gg = 15 * h * h;
      for (let j = 0; j < NJ; j++) { const i = j * 3; for (let k = 0; k < 3; k++) { const cur = p[i + k]; const v = (cur - q[i + k]) * 0.995; q[i + k] = cur; p[i + k] = cur + v - (k === 1 ? gg : 0); } }
      for (let r = 0; r < 5; r++) {
        RAG_LINKS.forEach(([a, b], li) => { const ia = a * 3, ib = b * 3; const dx = p[ib] - p[ia], dy = p[ib + 1] - p[ia + 1], dz = p[ib + 2] - p[ia + 2]; const d = Math.hypot(dx, dy, dz) || 1e-4; const diff = (d - this.rlen[li]) / d * 0.5; p[ia] += dx * diff; p[ia + 1] += dy * diff; p[ia + 2] += dz * diff; p[ib] -= dx * diff; p[ib + 1] -= dy * diff; p[ib + 2] -= dz * diff; });
        for (let j = 0; j < NJ; j++) {
          const i = j * 3; const rad = j === J.head ? 0.11 : 0.06;
          const gh = S ? S.groundAt(p[i], p[i + 2], p[i + 1] + 0.4, 0.3).h : 0;
          if (p[i + 1] < gh + rad) { p[i + 1] = gh + rad; q[i] = lerp(q[i], p[i], 0.35); q[i + 2] = lerp(q[i + 2], p[i + 2], 0.35); if (q[i + 1] < p[i + 1]) q[i + 1] = p[i + 1] - (q[i + 1] - p[i + 1]) * -0.2; }
          if (S && (j === 0 || j === 1 || j === 2)) { const r2 = S.pushCircle(p[i], p[i + 2], 0.18, p[i + 1] - 0.1, p[i + 1] + 0.1); if (r2.hit) { p[i] = r2.x; p[i + 2] = r2.z; } }
        }
      }
    }
    this.joints.set(p); this.ragT += dt;
    // track root
    this.pos.set(p[0], Math.min(p[J.lFt * 3 + 1], p[J.rFt * 3 + 1], p[1]) - 0.05, p[2]);
    let v = 0; for (let j = 0; j < NJ * 3; j++) v += Math.abs(p[j] - q[j]); this.ragSpeed = v / dt / NJ;
    if (this.ragSpeed < 0.25) this.settleT += dt; else this.settleT = 0;
  }
  get settled() { return this.mode === 'ragdoll' && this.ragT > 1.2 && this.settleT > 0.6; }
  getUp(S) {
    if (this.mode !== 'ragdoll') return; this.snap.set(this.joints);
    const p = this.rp; const fx = p[J.head * 3] - p[0], fz = p[J.head * 3 + 2] - p[2];
    this.yaw = Math.atan2(fx, fz) + Math.PI; this.pos.set(p[0], S ? S.groundAt(p[0], p[2], p[1] + 1, 0.5).h : p[1] - 0.2, p[2]);
    this.mode = 'getup'; this.getupT = 0; this.state = 'idle'; this.speed = 0;
  }
  // world forward of torso (used for rendering in ragdoll)
}

// ---------------- instanced renderer ----------------
function capsule(r0 = 1, r1 = 1) { const g = new THREE.CylinderGeometry(r1, r0, 1, 10, 1); g.translate(0, 0.5, 0); const a = new THREE.SphereGeometry(r0, 10, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2); a.scale(1, 0.14, 1); const b = new THREE.SphereGeometry(r1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); b.scale(1, 0.14, 1); b.translate(0, 1, 0); return mergeParts([{ geo: g, c: 0xffffff }, { geo: a, c: 0xffffff }, { geo: b, c: 0xffffff }]); }
export class HumanRenderer {
  constructor(scene, max = 360) {
    this.max = max; this.meshes = {}; const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.02 });
    const head = new THREE.SphereGeometry(1, 16, 12); head.scale(0.92, 1.05, 1);
    const eyeL = new THREE.SphereGeometry(0.16, 8, 6); eyeL.translate(0.36, 0.12, 0.84); const eyeR = eyeL.clone(); eyeR.translate(-0.72, 0, 0);
    const nose = new THREE.ConeGeometry(0.14, 0.35, 6); nose.rotateX(Math.PI / 2); nose.translate(0, -0.06, 1.02);
    const brow = new THREE.BoxGeometry(0.8, 0.07, 0.1); brow.translate(0, 0.33, 0.9);
    const mouth = new THREE.BoxGeometry(0.4, 0.05, 0.1); mouth.translate(0, -0.42, 0.87);
    const ears = [new THREE.SphereGeometry(0.2, 6, 5).translate(0.9, 0.05, 0), new THREE.SphereGeometry(0.2, 6, 5).translate(-0.9, 0.05, 0)];
    const torso = new THREE.CylinderGeometry(1, 0.8, 1, 12, 1); torso.translate(0, 0.5, 0); const shoulders = new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2); shoulders.scale(1, 0.35, 1); shoulders.translate(0, 0.98, 0);
    const collar = new THREE.CylinderGeometry(0.42, 0.5, 0.12, 10); collar.translate(0, 1.04, 0);
    const defs = {
      head: mergeParts([{ geo: head, c: 0xffffff }, { geo: eyeL, c: 0x15110f }, { geo: eyeR, c: 0x15110f }, { geo: nose, c: 0xe6d0c0 }, { geo: brow, c: 0x2a1c14 }, { geo: mouth, c: 0x6a3a32 }, ...ears.map((g) => ({ geo: g, c: 0xffffff }))]),
      torso: mergeParts([{ geo: torso, c: 0xffffff }, { geo: shoulders, c: 0xffffff }, { geo: collar, c: 0xd8d8d8 }]),
      pelvis: (() => { const g = new THREE.SphereGeometry(1, 12, 8); g.scale(1, 0.75, 0.75); return g; })(),
      limb: capsule(1, 0.85), hand: new THREE.SphereGeometry(1, 8, 6),
      foot: (() => { const g = new THREE.BoxGeometry(1, 1, 1); g.translate(0, 0.5, 0.32); return g; })(),
      hairCap: (() => { const g = new THREE.SphereGeometry(1.08, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55); g.rotateX(-0.25); g.translate(0, 0.08, -0.06); return g; })(),
      hairLong: (() => { const a = new THREE.SphereGeometry(1.1, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.6); a.rotateX(-0.2); a.translate(0, 0.06, -0.05); const b = new THREE.BoxGeometry(1.9, 1.6, 0.5); b.translate(0, -0.55, -0.62); return mergeParts([{ geo: a, c: 0xffffff }, { geo: b, c: 0xffffff }]); })(),
      hairBun: (() => { const a = new THREE.SphereGeometry(1.08, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55); a.rotateX(-0.25); a.translate(0, 0.08, -0.06); const b = new THREE.SphereGeometry(0.45, 10, 8); b.translate(0, 0.55, -0.85); return mergeParts([{ geo: a, c: 0xffffff }, { geo: b, c: 0xffffff }]); })(),
      cap: (() => { const a = new THREE.CylinderGeometry(1.05, 1.1, 0.55, 14); a.translate(0, 0.55, 0); const b = new THREE.BoxGeometry(1.5, 0.08, 0.9); b.translate(0, 0.35, 1.0); const badge = new THREE.BoxGeometry(0.3, 0.3, 0.1); badge.translate(0, 0.62, 1.05); return mergeParts([{ geo: a, c: 0xffffff }, { geo: b, c: 0x111111 }, { geo: badge, c: 0xd4af37 }]); })(),
      helmet: (() => { const a = new THREE.SphereGeometry(1.2, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55); a.translate(0, 0.1, -0.05); const v = new THREE.BoxGeometry(1.5, 0.35, 0.3); v.translate(0, 0.15, 1.0); return mergeParts([{ geo: a, c: 0xffffff }, { geo: v, c: 0x222222 }]); })(),
      beanie: (() => { const a = new THREE.SphereGeometry(1.12, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5); a.translate(0, 0.12, -0.04); return a; })(),
      shades: (() => { const g = new THREE.BoxGeometry(1.6, 0.28, 0.12); g.translate(0, 0.14, 0.95); return g; })(),
      bag: (() => { const g = new THREE.CylinderGeometry(1, 1, 2.4, 12); g.rotateZ(Math.PI / 2); const s = new THREE.TorusGeometry(0.9, 0.08, 6, 12, Math.PI); s.translate(0, 0.9, 0); return mergeParts([{ geo: g, c: 0xffffff }, { geo: s, c: 0x222222 }]); })(),
      joint: new THREE.SphereGeometry(1, 10, 8),
      vest: (() => { const g = new THREE.CylinderGeometry(1.08, 0.95, 0.75, 12); g.translate(0, 0.55, 0); return g; })(),
    };
    for (const [k, g0] of Object.entries(defs)) {
      const g = g0.attributes.color ? g0 : mergeParts([{ geo: g0, c: 0xffffff }]);
      const cnt = k === 'limb' ? max * 9 : k === 'joint' ? max * 6 : k === 'hand' || k === 'foot' ? max * 2 : max;
      const m = new THREE.InstancedMesh(g, mat, cnt); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(cnt * 3), 3); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true; m.count = 0; scene.add(m); this.meshes[k] = { mesh: m, n: 0, arr: m.instanceMatrix.array, col: m.instanceColor.array };
    }
    this.c = new THREE.Color();
  }
  begin() { for (const k in this.meshes) this.meshes[k].n = 0; }
  _put(k, e, col) {
    const M = this.meshes[k]; if (M.n >= M.mesh.instanceMatrix.count) return; const o = M.n * 16; const a = M.arr;
    for (let i = 0; i < 16; i++) a[o + i] = e[i];
    this.c.set(col); const ci = M.n * 3; M.col[ci] = this.c.r; M.col[ci + 1] = this.c.g; M.col[ci + 2] = this.c.b; M.n++;
  }
  end() { for (const k in this.meshes) { const M = this.meshes[k]; M.mesh.count = M.n; M.mesh.instanceMatrix.needsUpdate = true; M.mesh.instanceColor.needsUpdate = true; } }
  // basis matrix from columns X,Y,Z scaled, translation T
  static mat(e, xx, xy, xz, yx, yy, yz, zx, zy, zz, tx, ty, tz) { e[0] = xx; e[1] = xy; e[2] = xz; e[3] = 0; e[4] = yx; e[5] = yy; e[6] = yz; e[7] = 0; e[8] = zx; e[9] = zy; e[10] = zz; e[11] = 0; e[12] = tx; e[13] = ty; e[14] = tz; e[15] = 1; return e; }
  draw(h) {
    const J3 = h.joints, L = h.look, S = h.scale, b = L.build || 1; const e = this._e || (this._e = new Float32Array(16));
    const jx = (j) => J3[j * 3], jy = (j) => J3[j * 3 + 1], jz = (j) => J3[j * 3 + 2];
    // torso frame
    let ux = jx(1) - jx(0), uy = jy(1) - jy(0), uz = jz(1) - jz(0); const ul = Math.hypot(ux, uy, uz) || 1; ux /= ul; uy /= ul; uz /= ul;
    let rx = jx(3) - jx(6), ry = jy(3) - jy(6), rz = jz(3) - jz(6); let d = rx * ux + ry * uy + rz * uz; rx -= d * ux; ry -= d * uy; rz -= d * uz; const rl = Math.hypot(rx, ry, rz) || 1; rx /= rl; ry /= rl; rz /= rl;
    const fx = ry * uz - rz * uy, fy = rz * ux - rx * uz, fz = rx * uy - ry * ux; // forward = right x up (x is left here)
    const tw = 0.2 * S * b, td = 0.12 * S * b;
    const shirt = L.jacket || L.shirt;
    HumanRenderer.mat(e, rx * tw, ry * tw, rz * tw, ux * ul, uy * ul, uz * ul, fx * td, fy * td, fz * td, jx(0), jy(0), jz(0)); this._put('torso', e, shirt);
    if (L.vest) { HumanRenderer.mat(e, rx * tw * 1.05, ry * tw * 1.05, rz * tw * 1.05, ux * ul, uy * ul, uz * ul, fx * td * 1.25, fy * td * 1.25, fz * td * 1.25, jx(0), jy(0), jz(0)); this._put('vest', e, 0x2f3a2a); }
    const pw = 0.165 * S * b; HumanRenderer.mat(e, rx * pw, ry * pw, rz * pw, ux * pw * 0.9, uy * pw * 0.9, uz * pw * 0.9, fx * pw * 0.9, fy * pw * 0.9, fz * pw * 0.9, jx(0), jy(0) - 0.02, jz(0)); this._put('pelvis', e, L.pants);
    // head (yaw from torso frame + head joint)
    const hr = 0.115 * S; const hx = jx(2), hy = jy(2) + 0.02, hz = jz(2);
    let hux = hx - jx(1), huy = hy - jy(1), huz = hz - jz(1); const hul = Math.hypot(hux, huy, huz) || 1; hux /= hul; huy /= hul; huz /= hul;
    let hfx = fx, hfy = fy, hfz = fz; d = hfx * hux + hfy * huy + hfz * huz; hfx -= d * hux; hfy -= d * huy; hfz -= d * huz; const hfl = Math.hypot(hfx, hfy, hfz) || 1; hfx /= hfl; hfy /= hfl; hfz /= hfl;
    const hrx = huy * hfz - huz * hfy, hry = huz * hfx - hux * hfz, hrz = hux * hfy - huy * hfx;
    HumanRenderer.mat(e, hrx * hr, hry * hr, hrz * hr, hux * hr, huy * hr, huz * hr, hfx * hr, hfy * hr, hfz * hr, hx, hy, hz); this._put('head', e, L.skin);
    const hs = L.hairStyle; if (hs && hs !== 'bald' && L.hat !== 'helmet' && L.hat !== 'cap') this._put(hs === 'long' ? 'hairLong' : hs === 'bun' ? 'hairBun' : 'hairCap', e, L.hair);
    if (L.hat) this._put(L.hat, e, L.hatColor || 0x222222);
    if (L.shades) this._put('shades', e, 0x050505);
    // limbs
    const limb = (a, bb, r0, col) => {
      const ax = jx(a), ay = jy(a), az = jz(a); let dx = jx(bb) - ax, dy = jy(bb) - ay, dz = jz(bb) - az; const len = Math.hypot(dx, dy, dz) || 1e-3; dx /= len; dy /= len; dz /= len;
      let px = dy * fz - dz * fy, py = dz * fx - dx * fz, pz = dx * fy - dy * fx; let pl = Math.hypot(px, py, pz); if (pl < 1e-3) { px = 1; py = 0; pz = 0; pl = 1; } px /= pl; py /= pl; pz /= pl;
      const qx = py * dz - pz * dy, qy = pz * dx - px * dz, qz = px * dy - py * dx; const r = r0 * S;
      HumanRenderer.mat(e, px * r, py * r, pz * r, dx * len, dy * len, dz * len, qx * r, qy * r, qz * r, ax, ay, az); this._put('limb', e, col);
    };
    const sleeve = L.sleeve === 'long' || L.jacket ? shirt : L.skin;
    limb(3, 4, 0.065 * b, shirt); limb(4, 5, 0.052 * b, sleeve); limb(6, 7, 0.065 * b, shirt); limb(7, 8, 0.052 * b, sleeve);
    { const nr = 0.055 * S; const ax = jx(1), ay = jy(1) - 0.02, az = jz(1); let dx = hx - ax, dy = hy - 0.09 - ay, dz = hz - az; const len = Math.hypot(dx, dy, dz) || 0.1; dx /= len; dy /= len; dz /= len; let px = dy * fz - dz * fy, py = dz * fx - dx * fz, pz = dx * fy - dy * fx; const pl = Math.hypot(px, py, pz) || 1; px /= pl; py /= pl; pz /= pl; const qx = py * dz - pz * dy, qy = pz * dx - px * dz, qz = px * dy - py * dx; HumanRenderer.mat(e, px * nr, py * nr, pz * nr, dx * len, dy * len, dz * len, qx * nr, qy * nr, qz * nr, ax, ay, az); this._put('limb', e, L.skin); }
    const jt = (j, r, col) => { const rr = r * S; HumanRenderer.mat(e, rr, 0, 0, 0, rr, 0, 0, 0, rr, jx(j), jy(j), jz(j)); this._put('joint', e, col); };
    jt(3, 0.08 * b, shirt); jt(6, 0.08 * b, shirt); jt(4, 0.058 * b, sleeve); jt(7, 0.058 * b, sleeve); jt(10, 0.075 * b, L.pants); jt(13, 0.075 * b, L.pants);
    limb(9, 10, 0.085 * b, L.pants); limb(10, 11, 0.065 * b, L.pants); limb(12, 13, 0.085 * b, L.pants); limb(13, 14, 0.065 * b, L.pants);
    for (const j of [5, 8]) { const r = 0.05 * S; HumanRenderer.mat(e, r, 0, 0, 0, r, 0, 0, 0, r, jx(j), jy(j), jz(j)); this._put('hand', e, L.skin); }
    // feet: oriented along body forward (flattened)
    let ffx = fx, ffz = fz; const fl = Math.hypot(ffx, ffz) || 1; ffx /= fl; ffz /= fl;
    for (const j of [11, 14]) { const w = 0.1 * S, hh = 0.08 * S, l = 0.25 * S; HumanRenderer.mat(e, ffz * w, 0, -ffx * w, 0, hh, 0, ffx * l, 0, ffz * l, jx(j), jy(j) - 0.07, jz(j)); this._put('foot', e, L.shoes); }
    if (h.carryBag) { const r = 0.16; const bx = jx(5), by = jy(5) - 0.2, bz = jz(5); HumanRenderer.mat(e, ffz * r * 0.9, 0, -ffx * r * 0.9, 0, r, 0, ffx * r * 1.4, 0, ffz * r * 1.4, bx, by, bz); this._put('bag', e, 0x2d3436); }
  }
}
