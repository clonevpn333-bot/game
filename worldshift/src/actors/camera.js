// Third-person orbit camera with collision, aim zoom, vehicle chase mode,
// trauma-based shake and FOV kicks.
import * as THREE from 'three';
import { G } from '../core/state.js';
import { clamp, damp, dampAngle, lerp } from '../core/mathx.js';
import { CF } from '../world/collision.js';

export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = Math.PI;
    this.pitch = 0.15;
    this.dist = 4.2;
    this.curDist = 4.2;
    this.pivot = new THREE.Vector3();
    this.smoothPivot = new THREE.Vector3();
    this.shoulder = 0.45;
    this.curShoulder = 0.45;
    this.trauma = 0;
    this.fovKick = 0;
    this.baseFov = G.settings.fov;
    this.mode = 'foot';
    this.autoYawTimer = 0;
    this.lookTarget = null;
    this.cinematic = null;
    this.initialized = false;
  }

  shake(amount) { this.trauma = Math.min(1, this.trauma + amount); }
  kick(f) { this.fovKick = Math.max(this.fovKick, f); }

  update(dt, input) {
    const p = G.player;
    const sens = 0.0022 * G.settings.sensitivity;
    if (input.locked) {
      this.yaw -= input.mouseDX * sens;
      this.pitch += input.mouseDY * sens * (G.settings.invertY ? -1 : 1);
    }
    this.pitch = clamp(this.pitch, -1.25, 1.35);
    const veh = p.vehicle;
    let targetDist, pivotY, shoulder = 0;
    if (veh) {
      this.mode = 'vehicle';
      targetDist = veh.camDist || 7.5;
      pivotY = veh.camHeight || 1.8;
      // speed pulls the camera back a bit
      targetDist += Math.min(4, veh.speed * 0.06);
      // auto-follow behind the vehicle when not moving the mouse
      if (Math.abs(input.mouseDX) + Math.abs(input.mouseDY) > 0.5) this.autoYawTimer = 1.4;
      this.autoYawTimer -= dt;
      if (this.autoYawTimer <= 0 && veh.speed > 3) {
        const behind = veh.yaw + (veh.reversing ? Math.PI : 0);
        this.yaw = dampAngle(this.yaw, behind, 2.5, dt);
        this.pitch = damp(this.pitch, 0.18, 2, dt);
      }
      this.pivot.set(veh.pos.x, veh.pos.y + pivotY, veh.pos.z);
    } else {
      this.mode = 'foot';
      const aiming = p.aiming;
      targetDist = aiming ? 1.9 : p.state === 'climb' || p.state === 'hang' ? 3.6 : p.crouch ? 3.4 : 4.1;
      shoulder = aiming ? 0.62 : 0.42;
      pivotY = p.crouch ? 1.15 : p.action && p.action.type === 'slide' ? 0.9 : 1.62;
      if (p.state === 'swim') pivotY = 0.9;
      this.pivot.set(p.pos.x, p.pos.y + pivotY, p.pos.z);
    }
    if (!this.initialized) { this.smoothPivot.copy(this.pivot); this.initialized = true; }
    // smooth pivot (less lag vertically on stairs)
    this.smoothPivot.x = damp(this.smoothPivot.x, this.pivot.x, veh ? 14 : 22, dt);
    this.smoothPivot.z = damp(this.smoothPivot.z, this.pivot.z, veh ? 14 : 22, dt);
    this.smoothPivot.y = damp(this.smoothPivot.y, this.pivot.y, veh ? 8 : 12, dt);
    if (this.smoothPivot.distanceTo(this.pivot) > 6) this.smoothPivot.copy(this.pivot);
    this.curShoulder = damp(this.curShoulder, shoulder, 10, dt);
    this.dist = targetDist;

    const cp = Math.cos(this.pitch), spch = Math.sin(this.pitch);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    // camera sits behind (opposite of look direction)
    const backX = -fx * cp, backY = spch, backZ = -fz * cp;
    const rightX = -fz, rightZ = fx;
    const ox = this.smoothPivot.x + rightX * this.curShoulder;
    const oz = this.smoothPivot.z + rightZ * this.curShoulder;
    const oy = this.smoothPivot.y;
    // collision: ray from pivot to desired position
    let want = this.dist;
    const hit = G.collision.raycast(G.era, ox, oy, oz, backX, backY, backZ, want + 0.3, CF.NOCAM);
    if (hit) want = Math.max(0.35, hit.t - 0.3);
    this.curDist = want < this.curDist ? want : damp(this.curDist, want, 5, dt);
    let cx = ox + backX * this.curDist, cy = oy + backY * this.curDist, cz = oz + backZ * this.curDist;
    // keep the camera above ground / water surface
    const gy = G.collision.ground(G.era, cx, cz, cy + 0.5, 0.1).y;
    if (cy < gy + 0.3) cy = gy + 0.3;

    // shake
    this.trauma = Math.max(0, this.trauma - dt * 1.4);
    const sh = this.trauma * this.trauma;
    const t = G.time * 30;
    const sx = (Math.sin(t * 1.1) + Math.sin(t * 2.3) * 0.5) * sh * 0.12;
    const sy = (Math.sin(t * 1.7 + 1) + Math.sin(t * 3.1) * 0.5) * sh * 0.12;

    this.camera.position.set(cx + sx, cy + sy, cz);
    // look direction
    const lx = cx + fx * cp * 10, ly = cy - spch * 10, lz = cz + fz * cp * 10;
    this.camera.lookAt(lx, ly, lz);
    if (sh > 0) this.camera.rotateZ((Math.sin(t * 0.9) * sh) * 0.04);

    // fov: sprint / boost / shift kicks
    let fovT = this.baseFov;
    if (!veh && p.moveSpeed > 6.5) fovT += 6;
    if (veh) fovT += Math.min(14, veh.speed * 0.18);
    if (p.aiming) fovT -= 14;
    this.fovKick = Math.max(0, this.fovKick - dt * 40);
    const fov = damp(this.camera.fov, fovT + this.fovKick, 6, dt);
    if (Math.abs(fov - this.camera.fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  // Direction the crosshair points at (world)
  aimRay(outO, outD) {
    this.camera.getWorldPosition(outO);
    this.camera.getWorldDirection(outD);
    return [outO, outD];
  }
}
