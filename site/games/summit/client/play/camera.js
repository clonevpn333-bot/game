/* Third-person follow camera with a first-person toggle, terrain collision and
 * impact shake. */
import * as THREE from '../../../../vendor/three/three.module.js';
import { PLAYER } from '../../shared/constants.js';

export class CameraRig {
  constructor(camera, world) {
    this.camera = camera;
    this.world = world;
    this.yaw = 0;
    this.pitch = -0.08;
    this.first = false;
    this.dist = 3.4;
    this.curDist = 3.4;
    this.shake = 0;
    this.shakeFreq = 26;
    this.height = 1.52;
    this.side = 0.42;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this._d = new THREE.Vector3();
    this._t = new THREE.Vector3();
    this.fovBase = camera.fov;
    this.fovBoost = 0;
    this.roll = 0;
  }

  addLook(dx, dy) {
    this.yaw -= dx;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy, -1.35, 1.30);
  }
  toggleView() { this.first = !this.first; }
  kick(amount) { this.shake = Math.min(1.4, this.shake + amount); }

  /** @param target world position of the climber's feet */
  update(dt, target, opts = {}) {
    this.shake = Math.max(0, this.shake - dt * 1.9);
    const wanted = opts.dist ?? this.dist;
    this.curDist += (wanted - this.curDist) * Math.min(1, dt * 6);
    const eye = this._t.copy(target);
    eye.y += this.first ? PLAYER.eye : this.height;

    if (this.first) {
      this.pos.copy(eye);
    } else {
      const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      this._d.set(Math.sin(this.yaw) * cp, sp, Math.cos(this.yaw) * cp);
      const side = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).multiplyScalar(this.side);
      const desired = eye.clone().add(side).addScaledVector(this._d, this.curDist);
      // keep the camera out of the mountain
      const steps = 8;
      let hit = this.curDist;
      for (let i = 1; i <= steps; i++) {
        const k = (i / steps) * this.curDist;
        const p = eye.clone().add(side).addScaledVector(this._d, k);
        const h = this.world ? this.world.height(p.x, p.z) + 0.42 : -1e9;
        if (p.y < h) { hit = k * 0.92; break; }
      }
      this.pos.copy(eye).add(side).addScaledVector(this._d, hit);
      void desired;
    }

    if (this.shake > 0) {
      const t = performance.now() * 0.001;
      const s = this.shake * this.shake * 0.16;
      this.pos.x += Math.sin(t * this.shakeFreq) * s;
      this.pos.y += Math.sin(t * this.shakeFreq * 1.37 + 1.2) * s;
      this.pos.z += Math.cos(t * this.shakeFreq * 0.91) * s;
    }

    this.camera.position.copy(this.pos);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    this.look.set(this.pos.x - Math.sin(this.yaw) * cp, this.pos.y + -sp, this.pos.z - Math.cos(this.yaw) * cp);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(this.look);
    if (this.roll) this.camera.rotateZ(this.roll);

    const fov = this.fovBase + this.fovBoost + (opts.speed ? Math.min(10, opts.speed * 0.55) : 0);
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 4); this.camera.updateProjectionMatrix(); }
  }

  /** Forward vector on the horizontal plane, matching the movement convention. */
  forward(out = new THREE.Vector3()) { return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }
}
