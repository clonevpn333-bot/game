import * as THREE from 'three';

export const TAU = Math.PI * 2;

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const invLerp = (a: number, b: number, v: number): number => clamp((v - a) / (b - a), 0, 1);
export const smoothstep = (a: number, b: number, v: number): number => {
  const t = invLerp(a, b, v);
  return t * t * (3 - 2 * t);
};
/** Frame-rate independent exponential damping toward target. */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

export const dampAngle = (current: number, target: number, lambda: number, dt: number): number => {
  const d = wrapAngle(target - current);
  return current + d * (1 - Math.exp(-lambda * dt));
};

export const wrapAngle = (a: number): number => {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
};

export const dampVec3 = (v: THREE.Vector3, target: THREE.Vector3, lambda: number, dt: number): THREE.Vector3 =>
  v.lerp(target, 1 - Math.exp(-lambda * dt));

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
export const easeInOutSine = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Deterministic hash noise in [0,1). */
export const hash1 = (n: number): number => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
};

/** Smooth 1D value noise in [-1,1]. */
export const noise1 = (x: number): number => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash1(i), hash1(i + 1), u) * 2 - 1;
};

/** Smooth 3D value noise in [-1,1] (for baking geometry displacement). */
export function noise3(x: number, y: number, z: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
  const h = (a: number, b: number, c: number) => hash1(a * 157 + b * 113 + c * 271);
  const x00 = lerp(h(ix, iy, iz), h(ix + 1, iy, iz), ux);
  const x10 = lerp(h(ix, iy + 1, iz), h(ix + 1, iy + 1, iz), ux);
  const x01 = lerp(h(ix, iy, iz + 1), h(ix + 1, iy, iz + 1), ux);
  const x11 = lerp(h(ix, iy + 1, iz + 1), h(ix + 1, iy + 1, iz + 1), ux);
  return lerp(lerp(x00, x10, uy), lerp(x01, x11, uy), uz) * 2 - 1;
}

export interface Tween {
  t: number;
  dur: number;
  fn: (k: number) => void;
  ease: (t: number) => number;
  done?: () => void;
}

export class Tweens {
  private list: Tween[] = [];
  add(dur: number, fn: (k: number) => void, ease: (t: number) => number = easeOutCubic, done?: () => void): void {
    this.list.push({ t: 0, dur: Math.max(0.0001, dur), fn, ease, done });
  }
  /** Promise-based tween for scripted sequences. */
  to(dur: number, fn: (k: number) => void, ease: (t: number) => number = easeInOutSine): Promise<void> {
    return new Promise((resolve) => this.add(dur, fn, ease, resolve));
  }
  update(dt: number): void {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const tw = this.list[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(tw.ease(k));
      if (k >= 1) {
        this.list.splice(i, 1);
        tw.done?.();
      }
    }
  }
  clear(): void {
    this.list = [];
  }
}
