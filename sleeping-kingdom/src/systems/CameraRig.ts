import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../utils/math';

function pseudoNoise(t: number, seed: number): number {
  const x = Math.sin(t * 12.9898 + seed * 78.233) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

export class CameraRig {
  yaw = Math.PI;
  pitch = -0.12;
  private dist = 4.8;
  private readonly focus = new THREE.Vector3();
  private trauma = 0;
  private shakeTime = 0;
  private fovPunch = 0;
  private idleLook = 0;
  baseFov = 55;
  reducedMotion = false;
  // Cinematic override (world space).
  readonly cinePos = new THREE.Vector3();
  readonly cineLook = new THREE.Vector3();
  cineWeight = 0;
  private cineTarget = 0;
  private readonly curPos = new THREE.Vector3();
  private readonly curLook = new THREE.Vector3();
  private readonly tmp = new THREE.Vector3();
  private readonly lookTmp = new THREE.Vector3();
  roll = 0;

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  addTrauma(a: number): void {
    this.trauma = Math.min(1, this.trauma + a);
  }

  punch(deg: number): void {
    this.fovPunch = Math.min(10, this.fovPunch + deg);
  }

  setCinematic(on: boolean): void {
    this.cineTarget = on ? 1 : 0;
  }

  snap(focus: THREE.Vector3, yaw: number): void {
    this.focus.copy(focus);
    this.yaw = yaw;
    this.curPos.set(0, 0, 0);
    this.place(1, true);
  }

  update(
    dt: number,
    focusWorld: THREE.Vector3,
    look: THREE.Vector2,
    opts: { mounted: boolean; moving: boolean; heading: number; lock: THREE.Vector3 | null; groundY: number },
  ): void {
    const sens = 0.0026;
    if (Math.abs(look.x) + Math.abs(look.y) > 0.01) this.idleLook = 0;
    else this.idleLook += dt;
    this.yaw -= look.x * sens;
    this.pitch = clamp(this.pitch - look.y * sens, -0.95, 0.45);
    if (opts.lock) {
      const dx = opts.lock.x - focusWorld.x;
      const dz = opts.lock.z - focusWorld.z;
      this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 7, dt);
      const dy = opts.lock.y - (focusWorld.y + 1.2);
      const target = clamp(Math.atan2(dy, Math.hypot(dx, dz)) - 0.12, -0.6, 0.3);
      this.pitch = damp(this.pitch, target, 4, dt);
    } else if (opts.moving && this.idleLook > (opts.mounted ? 0.6 : 1.6)) {
      this.yaw = dampAngle(this.yaw, opts.heading, opts.mounted ? 1.6 : 0.7, dt);
      this.pitch = damp(this.pitch, opts.mounted ? -0.1 : -0.14, 0.8, dt);
    }
    const targetDist = opts.mounted ? 7.4 : opts.lock ? 5.4 : 4.8;
    this.dist = damp(this.dist, targetDist, 3, dt);
    this.focus.x = damp(this.focus.x, focusWorld.x, 12, dt);
    this.focus.z = damp(this.focus.z, focusWorld.z, 12, dt);
    this.focus.y = damp(this.focus.y, focusWorld.y, 8, dt);
    this.groundY = opts.groundY;
    this.mounted = opts.mounted;
    this.cineWeight = damp(this.cineWeight, this.cineTarget, 1.6, dt);
    this.place(dt, false);
  }

  private groundY = 0;
  private mounted = false;

  private place(dt: number, instant: boolean): void {
    const cam = this.camera;
    const cp = Math.cos(this.pitch);
    const fwd = this.tmp.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    const lift = this.mounted ? 2.6 : 1.55;
    const shoulder = this.mounted ? 0 : 0.55;
    const rightX = -Math.cos(this.yaw);
    const rightZ = Math.sin(this.yaw);
    const look = this.lookTmp.set(this.focus.x + rightX * shoulder, this.focus.y + lift, this.focus.z + rightZ * shoulder);
    const pos = new THREE.Vector3().copy(look).addScaledVector(fwd, -this.dist);
    pos.y = Math.max(pos.y, this.groundY + 0.5);
    const lookAt = look.clone().addScaledVector(fwd, 4);
    // Blend with cinematic shot.
    if (this.cineWeight > 0.001) {
      const w = this.cineWeight * this.cineWeight * (3 - 2 * this.cineWeight);
      pos.lerp(this.cinePos, w);
      lookAt.lerp(this.cineLook, w);
    }
    if (instant || this.curPos.lengthSq() === 0) {
      this.curPos.copy(pos);
      this.curLook.copy(lookAt);
    } else {
      this.curPos.lerp(pos, 1 - Math.exp(-30 * dt));
      this.curLook.lerp(lookAt, 1 - Math.exp(-30 * dt));
    }
    cam.position.copy(this.curPos);
    cam.lookAt(this.curLook);
    cam.rotation.z += this.roll;
    // Trauma shake (trauma²), deterministic noise.
    this.shakeTime += dt;
    this.trauma = Math.max(0, this.trauma - 1.3 * dt);
    if (this.trauma > 0 && !this.reducedMotion) {
      const s = this.trauma * this.trauma;
      const f = this.shakeTime * 30;
      cam.position.x += 0.45 * s * pseudoNoise(f, 1);
      cam.position.y += 0.45 * s * pseudoNoise(f, 2);
      cam.rotation.z += 0.07 * s * pseudoNoise(f, 3);
    }
    this.fovPunch *= Math.exp(-dt / 0.22);
    const fov = this.baseFov + this.fovPunch + ((cam.userData.aspectFovBoost as number) ?? 0);
    if (Math.abs(cam.fov - fov) > 0.01) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  }
}
