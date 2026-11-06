// Rigid-body boat: buoyancy sampled at hull points on the Gerstner surface,
// thrust from submerged props, rudder side-force, planing lift, keel drag,
// airborne ballistics off swells, and simple sphere/AABB collisions.
import * as THREE from 'three';
import { waterHeight } from '../chapters/ch2/ocean.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _f = new THREE.Vector3(), _q = new THREE.Quaternion();

export class BoatBody {
  constructor(mesh, o = {}) {
    this.mesh = mesh;
    this.mass = o.mass ?? 2600;
    this.inertia = new THREE.Vector3(o.ix ?? 4500, o.iy ?? 9000, o.iz ?? 7000);
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.quat = new THREE.Quaternion(); this.angVel = new THREE.Vector3();
    this.thrust = o.thrust ?? 26000; this.boost = o.boost ?? 16000;
    this.len = o.length ?? 9; this.beam = o.beam ?? 2.6;
    this.points = o.points ?? [];
    if (!this.points.length) for (const z of [-0.45, -0.15, 0.15, 0.4]) for (const x of [-0.42, 0.42]) this.points.push(new THREE.Vector3(x * this.beam, 0.1, z * this.len));
    this.buoy = o.buoy ?? (this.mass * 9.81 * 2.6) / this.points.length;
    this.input = { throttle: 0, brake: 0, rudder: 0, boost: 0, trim: 0 };
    this.rudder = 0;
    this.radius = o.radius ?? 4.6;
    this.health = 1; this.boostFuel = 1;
    this.submerged = 0; this.airborne = false; this.airTime = 0;
    this.slam = 0; this.spray = 0;
    this.rpm = 900;
  }

  get forward() { return _f.set(0, 0, 1).applyQuaternion(this.quat).clone(); }
  get right() { return new THREE.Vector3(1, 0, 0).applyQuaternion(this.quat); }
  get up() { return new THREE.Vector3(0, 1, 0).applyQuaternion(this.quat); }
  get speed() { return Math.hypot(this.vel.x, this.vel.z); }
  get yaw() { const f = this.forward; return Math.atan2(f.x, f.z); }

  place(x, z, yaw) {
    this.pos.set(x, waterHeight(x, z), z); this.vel.set(0, 0, 0); this.angVel.set(0, 0, 0);
    this.quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    this.sync();
  }

  /** Apply a force (world) at a world point. */
  applyForce(F, P, dt, torqueAcc) {
    this.vel.addScaledVector(F, dt / this.mass);
    const r = _w.copy(P).sub(this.pos);
    torqueAcc.add(r.cross(F));
  }

  update(dt, t) {
    const inp = this.input;
    const torque = new THREE.Vector3();
    // gravity
    this.vel.y -= 9.81 * dt;
    // buoyancy at hull points
    let wet = 0;
    const fwd = this.forward, up = this.up, right = this.right;
    for (const lp of this.points) {
      const p = _v.copy(lp).applyQuaternion(this.quat).add(this.pos);
      const h = waterHeight(p.x, p.z, t);
      const depth = h - p.y;
      if (depth > 0) {
        wet++;
        // point velocity
        const r = p.clone().sub(this.pos);
        const pv = new THREE.Vector3().crossVectors(this.angVel, r).add(this.vel);
        const fy = Math.min(depth, 1.6) * this.buoy - pv.y * this.buoy * 0.45;
        this.applyForce(new THREE.Vector3(0, fy, 0), p, dt, torque);
      }
    }
    this.submerged = wet / this.points.length;
    const inWater = this.submerged > 0.15;
    if (!inWater) { this.airTime += dt; } else { if (this.airTime > 0.45) this.slam = Math.min(1.5, this.airTime); this.airTime = 0; }
    this.airborne = this.airTime > 0.25;
    // hydrodynamics in the boat frame
    const vf = this.vel.dot(fwd), vs = this.vel.dot(right);
    if (inWater) {
      const sub = this.submerged;
      // thrust from the stern props
      const stern = fwd.clone().multiplyScalar(-this.len * 0.48).add(this.pos);
      const sternWet = waterHeight(stern.x, stern.z, t) > stern.y - 0.6;
      let T = 0;
      if (sternWet) {
        if (inp.throttle > 0) T += inp.throttle * this.thrust * clamp(1 - vf / 34, 0, 1);
        if (inp.brake > 0) T -= inp.brake * this.thrust * (vf > 1 ? 0.8 : 0.45);
        if (inp.boost && this.boostFuel > 0) { T += this.boost; this.boostFuel = Math.max(0, this.boostFuel - dt * 0.25); }
      }
      if (!inp.boost) this.boostFuel = Math.min(1, this.boostFuel + dt * 0.06);
      this.vel.addScaledVector(fwd, (T / this.mass) * dt);
      // drag: low along the hull, very high sideways (the keel)
      const planing = clamp((vf - 8) / 12, 0, 1);
      this.vel.addScaledVector(fwd, -vf * Math.abs(vf) * (0.012 - planing * 0.005) * sub * dt * 6);
      this.vel.addScaledVector(right, -vs * (2.2 + Math.abs(vs) * 0.25) * sub * dt);
      this.vel.y -= this.vel.y * 0.6 * sub * dt;
      // rudder / outboard steering: yaw torque grows with speed and thrust
      this.rudder += (inp.rudder - this.rudder) * Math.min(1, dt * 6);
      const steer = this.rudder * (Math.abs(vf) * 0.09 + inp.throttle * 0.6) * Math.sign(vf + 0.5);
      torque.addScaledVector(up, steer * this.inertia.y * 1.4);
      // bank into turns, bow lift when planing, trim (Space)
      torque.addScaledVector(fwd, -this.rudder * Math.abs(vf) * 0.06 * this.inertia.z);
      torque.addScaledVector(right, (-planing * 0.18 - inp.trim * 0.5) * this.inertia.x);
      if (inp.trim && this.submerged > 0.4 && vf > 6) { this.vel.y += 4.5 * dt * 10 * 0.6; }
      // angular damping in water
      this.angVel.multiplyScalar(1 - Math.min(1, dt * 2.6 * sub));
    } else {
      this.angVel.multiplyScalar(1 - Math.min(1, dt * 0.4));
      // a little air control
      torque.addScaledVector(up, inp.rudder * this.inertia.y * 0.25);
      torque.addScaledVector(right, -inp.trim * this.inertia.x * 0.4);
    }
    this.angVel.x += (torque.x / this.inertia.x) * dt; this.angVel.y += (torque.y / this.inertia.y) * dt; this.angVel.z += (torque.z / this.inertia.z) * dt;
    // integrate
    this.pos.addScaledVector(this.vel, dt);
    const w = this.angVel, wl = w.length();
    if (wl > 1e-6) { _q.setFromAxisAngle(_w.copy(w).divideScalar(wl), wl * dt); this.quat.premultiply(_q).normalize(); }
    // self-righting: keep it from capsizing (arcade)
    const u = this.up;
    if (u.y < 0.35) { const axis = new THREE.Vector3().crossVectors(u, new THREE.Vector3(0, 1, 0)).normalize(); this.angVel.addScaledVector(axis, dt * 6); }
    this.spray = clamp(vf / 25, 0, 1) * (inWater ? 1 : 0);
    const targetRpm = 900 + clamp(Math.abs(vf) / 30, 0, 1) * 5200 + inp.throttle * 1200 + (inWater ? 0 : inp.throttle * 2000);
    this.rpm += (targetRpm - this.rpm) * Math.min(1, dt * 5);
    this.sync();
  }

  collideBox(b, restitution = 0.3) {
    // circle vs AABB in XZ
    const cx = clamp(this.pos.x, b.minX, b.maxX), cz = clamp(this.pos.z, b.minZ, b.maxZ);
    const dx = this.pos.x - cx, dz = this.pos.z - cz, d = Math.hypot(dx, dz);
    if (d > this.radius || (b.maxY !== undefined && this.pos.y > b.maxY)) return 0;
    const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0;
    this.pos.x += nx * (this.radius - d); this.pos.z += nz * (this.radius - d);
    const vn = this.vel.x * nx + this.vel.z * nz;
    if (vn >= 0) return 0;
    this.vel.x -= (1 + restitution) * vn * nx; this.vel.z -= (1 + restitution) * vn * nz;
    this.angVel.y += clamp(vn * 0.05, -1, 1) * Math.sign(nx * this.forward.z - nz * this.forward.x);
    return -vn;
  }

  sync() { this.mesh.position.copy(this.pos); this.mesh.quaternion.copy(this.quat); }
}
