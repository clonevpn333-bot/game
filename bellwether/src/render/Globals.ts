import * as THREE from 'three';

/**
 * Uniforms shared by every material that reacts to world state.
 * uEcho: 0 = present day, 1 = fully inside an Echo of 2:17 AM, eleven years ago.
 * uWarp: late-game reality instability (vertex wobble / glitch strength).
 */
export const G = {
  uTime: { value: 0 },
  uEcho: { value: 0 },
  uWarp: { value: 0 },
  uRainDir: { value: 1 },
  uFlash: { value: 0 },
};

export const tmpV1 = new THREE.Vector3();
export const tmpV2 = new THREE.Vector3();
export const tmpV3 = new THREE.Vector3();
export const tmpQ = new THREE.Quaternion();
export const UP = new THREE.Vector3(0, 1, 0);

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const damp = (a: number, b: number, lambda: number, dt: number) => lerp(a, b, 1 - Math.exp(-lambda * dt));
export function dampAngle(a: number, b: number, lambda: number, dt: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * (1 - Math.exp(-lambda * dt));
}
export function angleDiff(a: number, b: number): number {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Deterministic RNG (mulberry32). All gameplay/world randomness goes through this. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let globalRand = rng(217);
export const R = {
  next: () => globalRand(),
  range: (a: number, b: number) => a + (b - a) * globalRand(),
  int: (a: number, b: number) => Math.floor(a + (b - a + 1) * globalRand()),
  pick: <T>(arr: readonly T[]): T => arr[Math.floor(globalRand() * arr.length)],
  seed: (s: number) => {
    globalRand = rng(s);
  },
};
