// Third-person on-foot controller: camera-relative movement with smoothed
// acceleration and turning, capsule-vs-box collisions in a local frame
// (so it works on a rolling ship deck), slope "list" pushes, orbit camera.
import * as THREE from 'three';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export class OnFoot {
  constructor(character, animator, frame) {
    this.ch = character; this.anim = animator;
    this.frame = frame; // Object3D the character walks in (e.g. the ship); null = world
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.yaw = 0;
    this.camYaw = 0; this.camPitch = 0.25; this.camDist = 3.6;
    this.boxes = []; // {minX,maxX,minZ,maxZ,minY?,maxY?} in frame space
    this.floors = []; // {minX,maxX,minZ,maxZ,y} walkable heights
    this.radius = 0.32;
    this.list = new THREE.Vector2(); // extra slide acceleration (deck tilt)
    this.enabled = true;
    this.camPos = new THREE.Vector3(); this.camLook = new THREE.Vector3();
    this.stepT = 0;
  }

  floorAt(x, z) { let y = 0; for (const f of this.floors) if (x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ) y = Math.max(y, typeof f.y === 'function' ? f.y(x, z) : f.y); return y; }

  update(dt, input, camera, { speedMul = 1, onStep } = {}) {
    if (!this.enabled) return;
    const [lx, ly] = input.lookDelta();
    this.camYaw -= lx; this.camPitch = clamp(this.camPitch + ly, -0.5, 1.1);
    const mx = input.moveX, my = input.moveY;
    const run = input.any('ShiftLeft', 'ShiftRight');
    const len = Math.min(1, Math.hypot(mx, my));
    const maxV = (run ? 4.6 : 1.9) * speedMul;
    // camera-relative direction
    const dir = new THREE.Vector3(mx, 0, my).normalize();
    const cy = this.camYaw;
    const wish = new THREE.Vector3(-(dir.x * Math.cos(cy) - dir.z * Math.sin(cy)) * -1, 0, dir.x * Math.sin(cy) + dir.z * Math.cos(cy));
    wish.set(Math.sin(cy) * dir.z - Math.cos(cy) * dir.x, 0, Math.cos(cy) * dir.z + Math.sin(cy) * dir.x);
    const target = wish.multiplyScalar(maxV * len);
    const acc = len > 0 ? 10 : 12;
    this.vel.x += (target.x - this.vel.x) * Math.min(1, dt * acc) + this.list.x * dt;
    this.vel.z += (target.z - this.vel.z) * Math.min(1, dt * acc) + this.list.y * dt;
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    // collisions (circle vs boxes)
    for (const b of this.boxes) {
      const cx = clamp(this.pos.x, b.minX, b.maxX), cz = clamp(this.pos.z, b.minZ, b.maxZ);
      const dx = this.pos.x - cx, dz = this.pos.z - cz, d = Math.hypot(dx, dz);
      if (d < this.radius) {
        if (d < 1e-5) { this.pos.x += this.radius; continue; }
        this.pos.x += (dx / d) * (this.radius - d); this.pos.z += (dz / d) * (this.radius - d);
        const vn = (this.vel.x * dx + this.vel.z * dz) / d; if (vn < 0) { this.vel.x -= (dx / d) * vn; this.vel.z -= (dz / d) * vn; }
      }
    }
    const fy = this.floorAt(this.pos.x, this.pos.z);
    this.pos.y += (fy - this.pos.y) * Math.min(1, dt * 14);
    // facing: turn toward velocity
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > 0.2) {
      const want = Math.atan2(this.vel.x, this.vel.z);
      let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.anim.turnRate = d * 6;
      this.yaw += d * Math.min(1, dt * 10);
    } else this.anim.turnRate = 0;
    this.anim.mode = sp > 0.25 ? (sp > 3 ? 'run' : 'walk') : 'idle';
    this.anim.speed = sp;
    // footsteps
    if (sp > 0.3) { this.stepT -= dt * sp / (run ? 1.6 : 1.0); if (this.stepT < 0) { this.stepT = 0.62; onStep?.(); } }
    // place the character in its frame
    this.ch.position.copy(this.pos); this.ch.rotation.set(0, this.yaw, 0);
    // orbit camera (in frame space, then to world)
    const head = this.pos.clone().add(new THREE.Vector3(0, 1.55, 0));
    const off = new THREE.Vector3(Math.sin(this.camYaw) * Math.cos(this.camPitch), Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch)).multiplyScalar(-this.camDist);
    let cp = head.clone().add(off).add(new THREE.Vector3(0.45 * Math.cos(this.camYaw), 0, -0.45 * Math.sin(this.camYaw)));
    // pull the camera in front of walls
    for (const b of this.boxes) {
      if (cp.x > b.minX && cp.x < b.maxX && cp.z > b.minZ && cp.z < b.maxZ && (b.maxY === undefined || cp.y < b.maxY)) cp.lerp(head, 0.6);
    }
    const toW = (v) => (this.frame ? this.frame.localToWorld(v.clone()) : v.clone());
    const wc = toW(cp), wl = toW(head.clone().add(new THREE.Vector3(Math.sin(this.camYaw) * 2, -0.2, Math.cos(this.camYaw) * 2)));
    if (!this.camPos.lengthSq()) { this.camPos.copy(wc); this.camLook.copy(wl); }
    this.camPos.lerp(wc, 1 - Math.exp(-dt * 14)); this.camLook.lerp(wl, 1 - Math.exp(-dt * 18));
    camera.position.copy(this.camPos);
    camera.up.set(0, 1, 0);
    camera.lookAt(this.camLook);
  }
}
