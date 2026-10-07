import * as THREE from 'three';
import { clamp, damp, easeInOut, noise2 } from '../util/math';

export interface CamPose {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
  roll: number;
}

/** A camera "mode" produces a desired pose every frame. */
export type CamMode = (dt: number, t: number, out: CamPose) => void;

const newPose = (): CamPose => ({ pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 50, roll: 0 });

function copyPose(a: CamPose, b: CamPose): void {
  a.pos.copy(b.pos);
  a.look.copy(b.look);
  a.fov = b.fov;
  a.roll = b.roll;
}

/**
 * The film's cinematographer. Gameplay and cutscenes both hand it modes; switching
 * is either a hard CUT or an eased blend from the current framing. Trauma-based
 * shake, FOV punches and a "cut" event (which gameplay uses to hold the control
 * basis steady across angle changes) are layered on top.
 */
export class CameraDirector {
  readonly camera: THREE.PerspectiveCamera;
  private mode: CamMode | null = null;
  private modeT = 0;
  private readonly from = newPose();
  private readonly cur = newPose();
  private readonly want = newPose();
  private blend = 1;
  private blendDur = 0;
  private trauma = 0;
  private fovPunch = 0;
  private time = 0;
  cutCounter = 0;
  label = '';
  /** Ambient handheld drift amount (0..1). */
  handheld = 0.25;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.2, 16000);
    this.camera.position.set(0, 2, 10);
  }

  set(mode: CamMode, blendSeconds = 0, label = ''): void {
    copyPose(this.from, this.cur);
    this.mode = mode;
    this.modeT = 0;
    this.blend = blendSeconds > 0 ? 0 : 1;
    this.blendDur = blendSeconds;
    this.label = label;
    if (blendSeconds <= 0) {
      this.cutCounter++;
      // evaluate immediately so the cut lands on this frame
      mode(0, 0, this.want);
      copyPose(this.cur, this.want);
      this.apply();
    }
  }

  get modeTime(): number {
    return this.modeT;
  }

  shake(amount: number): void {
    this.trauma = clamp(this.trauma + amount, 0, 1);
  }

  punch(fovDelta: number): void {
    this.fovPunch += fovDelta;
  }

  /** Distance to what the shot is looking at (drives depth of field). */
  get focusDistance(): number {
    return this.cur.pos.distanceTo(this.cur.look);
  }

  /** Yaw of the camera's view direction on the ground plane. */
  get yaw(): number {
    const d = new THREE.Vector3();
    this.camera.getWorldDirection(d);
    return Math.atan2(d.x, d.z);
  }

  update(dt: number): void {
    this.time += dt;
    this.modeT += dt;
    if (this.mode) {
      this.mode(dt, this.modeT, this.want);
      if (this.blend < 1) {
        this.blend = Math.min(1, this.blend + dt / this.blendDur);
        const k = easeInOut(this.blend);
        this.cur.pos.lerpVectors(this.from.pos, this.want.pos, k);
        this.cur.look.lerpVectors(this.from.look, this.want.look, k);
        this.cur.fov = this.from.fov + (this.want.fov - this.from.fov) * k;
        this.cur.roll = this.from.roll + (this.want.roll - this.from.roll) * k;
      } else copyPose(this.cur, this.want);
    }
    this.trauma = Math.max(0, this.trauma - dt * 0.9);
    this.fovPunch *= Math.exp(-dt * 5);
    this.apply();
  }

  private apply(): void {
    const c = this.camera;
    c.position.copy(this.cur.pos);
    const s = this.trauma * this.trauma;
    const t = this.time;
    const hh = this.handheld;
    const ox = noise2(t * 0.35, 1.3) * 0.06 * hh + noise2(t * 22, 3.1) * s * 0.9;
    const oy = noise2(t * 0.3, 7.7) * 0.05 * hh + noise2(t * 24, 9.4) * s * 0.9;
    c.position.x += ox;
    c.position.y += oy;
    c.lookAt(this.cur.look);
    c.rotateZ(this.cur.roll + noise2(t * 18, 5.5) * s * 0.05);
    let f = this.cur.fov + this.fovPunch;
    // tall (portrait) screens: widen the vertical FOV so the shot keeps most of its horizontal framing
    if (c.aspect < 1.3) {
      const h = 2 * Math.atan(Math.tan((f * Math.PI) / 360) * (16 / 9)) * 0.72;
      f = Math.min(100, Math.max(f, ((2 * Math.atan(Math.tan(h / 2) / c.aspect)) * 180) / Math.PI));
    }
    if (Math.abs(c.fov - f) > 0.01) {
      c.fov = f;
      c.updateProjectionMatrix();
    }
  }
}

// ----------------------------------------------------------------------------- mode factories

export type Vec3Src = THREE.Vector3 | (() => THREE.Vector3);
const resolve = (v: Vec3Src) => (typeof v === 'function' ? v() : v);

/** Static framing (wide spectacle shots, establishing shots). */
export function fixedShot(pos: Vec3Src, look: Vec3Src, fov = 45, roll = 0): CamMode {
  return (_dt, _t, out) => {
    out.pos.copy(resolve(pos));
    out.look.copy(resolve(look));
    out.fov = fov;
    out.roll = roll;
  };
}

/** Animated dolly between two framings over `dur` seconds (eased). */
export function dollyShot(p0: Vec3Src, p1: Vec3Src, l0: Vec3Src, l1: Vec3Src, dur: number, fov0 = 45, fov1 = fov0, ease = easeInOut): CamMode {
  return (_dt, t, out) => {
    const k = ease(clamp(t / dur, 0, 1));
    out.pos.lerpVectors(resolve(p0), resolve(p1), k);
    out.look.lerpVectors(resolve(l0), resolve(l1), k);
    out.fov = fov0 + (fov1 - fov0) * k;
    out.roll = 0;
  };
}

/** Orbit around a target (reveals, hero moments). */
export function orbitShot(center: Vec3Src, radius: number, height: number, a0: number, a1: number, dur: number, fov = 45, lookOffset = new THREE.Vector3()): CamMode {
  return (_dt, t, out) => {
    const k = easeInOut(clamp(t / dur, 0, 1));
    const a = a0 + (a1 - a0) * k;
    const c = resolve(center);
    out.pos.set(c.x + Math.sin(a) * radius, c.y + height, c.z + Math.cos(a) * radius);
    out.look.copy(c).add(lookOffset);
    out.fov = fov;
    out.roll = 0;
  };
}

/**
 * Third-person follow: the camera sits at a yaw-relative offset from the target and
 * lags with critically damped smoothing. `yaw` is a getter so set pieces can
 * rail the camera along their path instead of the hero's facing.
 */
export function followShot(opts: {
  target: () => THREE.Vector3;
  yaw: () => number;
  distance: number;
  height: number;
  lookAhead?: number;
  lookHeight?: number;
  side?: number;
  fov?: number;
  lag?: number;
  extraLook?: () => THREE.Vector3 | null; // bias framing toward a spectacle (e.g. a giant)
  extraWeight?: number;
}): CamMode {
  const pos = new THREE.Vector3();
  const look = new THREE.Vector3();
  let init = false;
  return (dt, _t, out) => {
    const tg = opts.target();
    const yaw = opts.yaw();
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const side = opts.side ?? 0;
    const desired = new THREE.Vector3(tg.x - fx * opts.distance + fz * side, tg.y + opts.height, tg.z - fz * opts.distance - fx * side);
    const lh = opts.lookHeight ?? 1.4;
    const la = opts.lookAhead ?? 3;
    const dLook = new THREE.Vector3(tg.x + fx * la, tg.y + lh, tg.z + fz * la);
    // bias the framing *toward* a spectacle by a bounded amount (weight x 40 m lever),
    // independent of how far away the giant is
    const ex = opts.extraLook?.();
    if (ex) {
      const toEx = ex.clone().sub(dLook);
      const len = toEx.length();
      if (len > 0.001) dLook.addScaledVector(toEx, Math.min(len, (opts.extraWeight ?? 0.2) * 40) / len);
    }
    if (!init || dt === 0) {
      pos.copy(desired);
      look.copy(dLook);
      init = true;
    } else {
      const k = damp(1 / Math.max(0.02, opts.lag ?? 0.12), dt);
      pos.lerp(desired, k);
      look.lerp(dLook, Math.min(1, k * 1.4));
    }
    out.pos.copy(pos);
    out.look.copy(look);
    out.fov = opts.fov ?? 55;
    out.roll = 0;
  };
}

/** Tracking shot: camera rides at a world-space offset from a moving target. */
export function trackShot(target: () => THREE.Vector3, offset: Vec3Src, lookOffset: Vec3Src = new THREE.Vector3(0, 1.2, 0), fov = 50, lag = 0.1, lookAt?: () => THREE.Vector3): CamMode {
  const pos = new THREE.Vector3();
  let init = false;
  return (dt, _t, out) => {
    const tg = target();
    const desired = tg.clone().add(resolve(offset));
    if (!init || dt === 0) {
      pos.copy(desired);
      init = true;
    } else pos.lerp(desired, damp(1 / Math.max(0.02, lag), dt));
    out.pos.copy(pos);
    out.look.copy(lookAt ? lookAt() : tg.clone().add(resolve(lookOffset)));
    out.fov = fov;
    out.roll = 0;
  };
}
