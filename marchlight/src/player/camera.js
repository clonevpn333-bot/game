// Third-person camera rig: orbit, shoulder offset, aim zoom, collision,
// trauma shake, landing dips, recoil kicks, and blending with cinematic shots.
import * as THREE from 'three';
import { G } from '../core/physics.js';
import { clamp, damp, dampAngle, lerp, noise2, smoothstep } from '../core/util.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _q = new THREE.Quaternion();

export class CameraRig {
  constructor(game) {
    this.game = game; this.cam = game.engine.camera;
    this.yaw = 0; this.pitch = 0.1;
    this.pivot = new THREE.Vector3(); this.pivotY = 0;
    this.dist = 3.3; this.distS = 3.3; this.side = 0.55; this.sideS = 0.55; this.fov = 62; this.fovS = 62;
    this.trauma = 0; this.t = 0; this.dipV = 0; this.dipS = 0; this.kickV = 0; this.kickYaw = 0;
    this.pos = new THREE.Vector3(); this.look = new THREE.Vector3();
    this.shoulderSwap = 1;
    this.blend = 0; // 0 = gameplay, 1 = cinematic
    this.cine = { pos: new THREE.Vector3(), look: new THREE.Vector3(), fov: 45, roll: 0 };
    this.zoomFov = null; // binocular zoom
    this.extraDist = 0;
    this.offsetY = 0;
  }
  forwardFlat(out) { return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  forward(out) { const cp = Math.cos(this.pitch); return out.set(Math.sin(this.yaw) * cp, -Math.sin(this.pitch), Math.cos(this.yaw) * cp); }
  shake(a) { this.trauma = Math.min(1, this.trauma + a); }
  dip(a) { this.dipV -= a * 6; }
  kick(pitch, yaw = 0) { this.kickV += pitch; this.kickYaw += yaw; }
  snapBehind(yaw, pitch = 0.12) { this.yaw = yaw; this.pitch = pitch; }

  update(dt) {
    const g = this.game, p = g.player, inp = g.input;
    this.t += dt;
    const cin = g.director.active && g.director.cam;
    if (!cin || g.director.freeLook) {
      const ld = inp.lookDelta(dt);
      const aimMul = (g.weapons?.aiming || g.tether?.aiming) ? 0.6 : 1;
      const zoomMul = this.zoomFov ? this.zoomFov / 60 : 1;
      this.yaw -= ld.x * aimMul * zoomMul; this.pitch += ld.y * aimMul * zoomMul;
      this.pitch = clamp(this.pitch, -1.25, 1.35);
    }
    // recoil kick recovery
    this.pitch -= this.kickV * dt * 14; this.yaw += this.kickYaw * dt * 14;
    this.kickV = damp(this.kickV, 0, 12, dt); this.kickYaw = damp(this.kickYaw, 0, 12, dt);

    // targets by state
    const aiming = g.weapons?.aiming || g.tether?.aiming;
    const sprint = p.state === 'ground' && Math.hypot(p.vel.x, p.vel.z) > 6;
    let dist = 3.3, side = 0.55, fov = 62, height = 1.55;
    if (p.state === 'hang' || p.state === 'climb' || p.state === 'ladder') { dist = 3.9; side = 0.2; height = 1.4; }
    if (p.state === 'latch') { dist = 4.2; side = 0.3; fov = 70; }
    if (p.state === 'seated') { dist = 2.6; side = 0.4; height = 1.2; }
    if (p.crouchS > 0.5) { height = 1.15; }
    if (sprint) { dist = 3.7; fov = 68; }
    if (p.state === 'air' && p.vel.length() > 10) { fov = 72; dist = 4; }
    if (aiming) { dist = 1.75; side = 0.62; fov = 50; height = 1.52 - p.crouchS * 0.35; }
    if (g.cameraZoneDist) dist = Math.min(dist, g.cameraZoneDist);
    dist += this.extraDist;
    if (this.zoomFov) fov = this.zoomFov;
    this.distS = damp(this.distS, dist, aiming ? 14 : 6, dt);
    this.sideS = damp(this.sideS, side * this.shoulderSwap, 8, dt);
    this.fovS = damp(this.fovS, fov, this.zoomFov ? 10 : 6, dt);

    // pivot follow: smooth vertical, tight horizontal
    const tgt = _v.set(p.pos.x, p.pos.y + height + this.offsetY, p.pos.z);
    if (p.state === 'seated' || p.platformVel) this.pivot.copy(tgt);
    else {
      this.pivot.x = damp(this.pivot.x, tgt.x, 25, dt); this.pivot.z = damp(this.pivot.z, tgt.z, 25, dt);
      this.pivot.y = damp(this.pivot.y, tgt.y, p.state === 'ground' ? 14 : 20, dt);
    }
    if (this.pivot.distanceTo(tgt) > 4) this.pivot.copy(tgt);
    // landing dip spring
    this.dipV += (-this.dipS * 120 - this.dipV * 14) * dt; this.dipS += this.dipV * dt;

    const fwd = this.forward(_v2);
    const right = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const desired = this.pivot.clone().addScaledVector(fwd, -this.distS).addScaledVector(right, this.sideS);
    desired.y += this.dipS;
    // collision: from pivot (offset to the shoulder) to desired
    const origin = this.pivot.clone().addScaledVector(right, this.sideS * 0.5);
    const dir = desired.clone().sub(origin); const len = dir.length(); dir.divideScalar(len || 1);
    const hit = g.physics.raycastFilter(origin, dir, len + 0.25, G.STATIC | G.PLATFORM, (c, m) => !m?.nocam);
    let gp = desired;
    if (hit) gp = origin.clone().addScaledVector(dir, Math.max(0.3, hit.toi - 0.25));
    const gl = this.pivot.clone().addScaledVector(fwd, 8).addScaledVector(right, this.sideS * 0.5);

    // shake
    const tr = this.trauma * this.trauma;
    this.trauma = Math.max(0, this.trauma - dt * 1.4);
    const sx = noise2(this.t * 22, 1) * tr * 0.18, sy = noise2(this.t * 22, 2) * tr * 0.18, sr = noise2(this.t * 18, 3) * tr * 0.05;
    const city = g.city?.shakeAmount || 0;
    const cx = noise2(this.t * 9, 7) * city * 0.03, cy = noise2(this.t * 9, 8) * city * 0.04;

    // blend gameplay <-> cinematic
    const tb = cin ? 1 : 0;
    const blendSpeed = g.director.blendSpeed ?? 3.5;
    this.blend = g.director.cut ? tb : damp(this.blend, tb, blendSpeed, dt);
    if (g.director.cut) g.director.cut = false;
    const b = smoothstep(0, 1, this.blend);
    this.pos.lerpVectors(gp, this.cine.pos, b);
    this.look.lerpVectors(gl, this.cine.look, b);
    const finalFov = lerp(this.fovS, this.cine.fov, b);

    const cam = this.cam;
    cam.position.copy(this.pos); cam.position.x += sx + cx; cam.position.y += sy + cy;
    cam.up.set(0, 1, 0);
    cam.lookAt(this.look);
    cam.rotateZ(sr + this.cine.roll * b);
    if (Math.abs(cam.fov - finalFov) > 0.01) { cam.fov = finalFov; cam.updateProjectionMatrix(); }
  }
}
