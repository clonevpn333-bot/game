import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../core/math';
import type { PhysicsWorld } from '../world/Physics';

/**
 * Third-person orbit camera with collision pull-in, shoulder offset, sprint FOV,
 * trauma shake, and scripted cinematic overrides.
 */
export class CameraRig {
  yaw = Math.PI;
  pitch = 0.22;
  distance = 5.2;
  private curDist = 5.2;
  readonly target = new THREE.Vector3();
  private readonly smoothTarget = new THREE.Vector3();
  baseFov = 58;
  private fovAdd = 0;
  fovPunch = 0;
  private trauma = 0;
  private shakeT = 0;
  /** When set, the camera blends to this shot. */
  cinematic: { pos: THREE.Vector3; look: THREE.Vector3; fov?: number } | null = null;
  private cineBlend = 0;
  private readonly tmp = new THREE.Vector3();
  private readonly lookAt = new THREE.Vector3();
  heightOffset = 1.45;
  reducedMotion = false;
  /** Auto-align behind the player while moving with no manual input. */
  private idleLook = 0;

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  snap(target: THREE.Vector3, yaw?: number): void {
    if (yaw !== undefined) this.yaw = yaw;
    this.target.copy(target);
    this.smoothTarget.copy(target);
    this.curDist = this.distance;
    this.cineBlend = this.cinematic ? 1 : 0;
  }

  addTrauma(a: number): void {
    this.trauma = Math.min(1, this.trauma + a);
  }

  update(dt: number, look: THREE.Vector2, playerVel: THREE.Vector3, sprinting: boolean, physics: PhysicsWorld): void {
    this.yaw -= look.x;
    this.pitch = clamp(this.pitch + look.y, -0.55, 1.15);
    if (Math.abs(look.x) + Math.abs(look.y) > 0.0005) this.idleLook = 0;
    else this.idleLook += dt;
    // gentle auto-follow when the player runs and hasn't touched the camera
    const hs = Math.hypot(playerVel.x, playerVel.z);
    if (this.idleLook > 1.6 && hs > 2) {
      const behind = Math.atan2(-playerVel.x, -playerVel.z);
      this.yaw = dampAngle(this.yaw, behind, 0.9, dt);
    }

    this.smoothTarget.x = damp(this.smoothTarget.x, this.target.x, 14, dt);
    this.smoothTarget.z = damp(this.smoothTarget.z, this.target.z, 14, dt);
    this.smoothTarget.y = damp(this.smoothTarget.y, this.target.y, 7, dt);

    const pivot = this.lookAt.copy(this.smoothTarget);
    pivot.y += this.heightOffset;
    const dir = this.tmp.set(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    // collision pull-in
    const hit = physics.raycast(pivot, dir, this.distance + 0.3, true);
    const want = Math.max(1.2, Math.min(this.distance, hit - 0.35));
    this.curDist = want < this.curDist ? damp(this.curDist, want, 30, dt) : damp(this.curDist, want, 4, dt);
    const orbitPos = pivot.clone().addScaledVector(dir, this.curDist);

    this.fovAdd = damp(this.fovAdd, sprinting ? 7 : 0, 4, dt);
    this.fovPunch *= Math.exp(-dt / 0.25);

    // cinematic blend
    this.cineBlend = damp(this.cineBlend, this.cinematic ? 1 : 0, 3.2, dt);
    let fov = this.baseFov + this.fovAdd + this.fovPunch;
    if (this.cineBlend > 0.001 && this.cinematic) {
      orbitPos.lerp(this.cinematic.pos, this.cineBlend);
      pivot.lerp(this.cinematic.look, this.cineBlend);
      if (this.cinematic.fov) fov = THREE.MathUtils.lerp(fov, this.cinematic.fov, this.cineBlend);
    }
    this.camera.position.copy(orbitPos);
    this.camera.lookAt(pivot);

    // shake
    this.trauma = Math.max(0, this.trauma - dt * 1.3);
    this.shakeT += dt;
    if (this.trauma > 0 && !this.reducedMotion) {
      const s = this.trauma * this.trauma;
      const f = this.shakeT * 30;
      this.camera.position.x += Math.sin(f * 1.1) * 0.25 * s;
      this.camera.position.y += Math.sin(f * 1.7 + 2) * 0.2 * s;
      this.camera.rotation.z += Math.sin(f * 0.9 + 4) * 0.05 * s;
    }
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /** Forward vector on the ground plane (for camera-relative movement). */
  forward(out: THREE.Vector3): THREE.Vector3 {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }
}
