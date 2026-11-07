// Arcade boat: the hull rides a plane fitted to the wave surface under it (the way a car
// follows the ground), so the deck never sinks into the sea. Thrust, rudder, keel drag and
// planing act in the horizontal plane; launching off a falling crest makes the boat
// ballistic until it slams back down. Simple sphere/AABB collisions.
import * as THREE from 'three';
import { waterHeight } from '../chapters/ch2/ocean.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const G = 9.81 * 1.4;

export class BoatBody {
  constructor(mesh, o = {}) {
    this.mesh = mesh;
    this.mass = o.mass ?? 2600;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3(); this.vy = 0;
    this.yawA = 0; this.yawRate = 0; this.pitch = 0; this.roll = 0;
    this.quat = new THREE.Quaternion();
    this.thrust = o.thrust ?? 26000; this.boost = o.boost ?? 16000;
    this.len = o.length ?? 9; this.beam = o.beam ?? 2.6;
    this.draft = o.draft ?? 0.4;   // waterline height above the hull origin
    this.sink = 0;                 // > 0 settles a wreck into the sea
    this.input = { throttle: 0, brake: 0, rudder: 0, boost: 0, trim: 0 };
    this.rudder = 0;
    this.radius = o.radius ?? 4.6;
    this.health = 1; this.boostFuel = 1;
    this.submerged = 1; this.airborne = false; this.airTime = 0;
    this.slam = 0; this.spray = 0; this.rpm = 900;
    this.points = []; // kept for compatibility (unused)
  }

  get forward() { return new THREE.Vector3(0, 0, 1).applyQuaternion(this.quat); }
  get right() { return new THREE.Vector3(1, 0, 0).applyQuaternion(this.quat); }
  get up() { return new THREE.Vector3(0, 1, 0).applyQuaternion(this.quat); }
  get speed() { return Math.hypot(this.vel.x, this.vel.z); }
  get yaw() { return this.yawA; }

  place(x, z, yaw) {
    this.yawA = yaw; this.vel.set(0, 0, 0); this.vy = 0; this.yawRate = 0; this.airborne = false;
    const s = this.surface(x, z, OCEAN_T());
    this.pos.set(x, s.y, z); this.pitch = s.pitch; this.roll = s.roll;
    this.sync();
  }

  /** Plane fitted to the water under the hull: height for the origin, pitch, roll. */
  surface(x, z, t) {
    const fx = Math.sin(this.yawA), fz = Math.cos(this.yawA), rx = Math.cos(this.yawA), rz = -Math.sin(this.yawA);
    const L = this.len * 0.42, B = this.beam * 0.45;
    const hb = waterHeight(x + fx * L, z + fz * L, t), hs = waterHeight(x - fx * L, z - fz * L, t);
    const hp = waterHeight(x + rx * B, z + rz * B, t), hst = waterHeight(x - rx * B, z - rz * B, t);
    const hc = waterHeight(x, z, t);
    const mean = (hb + hs + hp + hst + hc * 2) / 6;
    return { y: Math.max(mean, hc - 0.3) - this.draft - this.sink, pitch: Math.atan2(hb - hs, 2 * L), roll: Math.atan2(hp - hst, 2 * B) };
  }

  update(dt, t) {
    const inp = this.input;
    const fwd = new THREE.Vector3(Math.sin(this.yawA), 0, Math.cos(this.yawA)), right = new THREE.Vector3(Math.cos(this.yawA), 0, -Math.sin(this.yawA));
    let vf = this.vel.dot(fwd), vs = this.vel.dot(right);
    const inWater = !this.airborne;
    // ---- horizontal dynamics
    const planing = clamp((vf - 8) / 12, 0, 1);
    if (inWater) {
      let T = 0;
      if (inp.throttle > 0) T += inp.throttle * this.thrust * clamp(1 - vf / 34, 0, 1);
      if (inp.brake > 0) T -= inp.brake * this.thrust * (vf > 1 ? 0.8 : 0.45);
      if (inp.boost && this.boostFuel > 0) { T += this.boost; this.boostFuel = Math.max(0, this.boostFuel - dt * 0.25); }
      vf += (T / this.mass) * dt;
      vf -= vf * Math.abs(vf) * (0.012 - planing * 0.005) * dt * 6;
      vs -= vs * Math.min(1, (2.2 + Math.abs(vs) * 0.25) * dt);         // the keel
      this.rudder += (inp.rudder - this.rudder) * Math.min(1, dt * 6);
      const yawAcc = this.rudder * (Math.abs(vf) * 0.09 + inp.throttle * 0.6) * Math.sign(vf + 0.5) * 1.4;
      this.yawRate += yawAcc * dt;
      this.yawRate -= this.yawRate * Math.min(1, dt * 2.6);
    } else this.yawRate -= this.yawRate * Math.min(1, dt * 0.4);
    if (!inp.boost) this.boostFuel = Math.min(1, this.boostFuel + dt * 0.06);
    this.yawA += this.yawRate * dt;
    const f2 = new THREE.Vector3(Math.sin(this.yawA), 0, Math.cos(this.yawA)), r2 = new THREE.Vector3(Math.cos(this.yawA), 0, -Math.sin(this.yawA));
    this.vel.set(f2.x * vf + r2.x * vs, 0, f2.z * vf + r2.z * vs);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    // ---- vertical: ride the surface; ballistic off falling crests
    const s = this.surface(this.pos.x, this.pos.z, t);
    const lift = planing * 0.18 + (inp.trim && inWater && vf > 6 ? 0.15 : 0);
    const targetY = s.y + lift;
    if (this.airborne) {
      this.vy -= G * dt; this.pos.y += this.vy * dt; this.airTime += dt;
      this.pitch += (-0.06 - inp.trim * 0.4 - this.pitch * 0.3) * dt; // nose drops, trim lifts it
      if (this.pos.y <= targetY) {
        this.slam = this.airTime > 0.35 ? Math.min(1.5, -this.vy * 0.15) : 0;
        this.airborne = false; this.airTime = 0; this.pos.y = targetY; this.vy = 0;
      }
    } else {
      const vyT = (targetY - this.pos.y) / Math.max(dt, 1e-3);
      // the surface drops away faster than the hull can follow at speed: launch
      if (vf > 9 && vyT < this.vy - G * dt * 2.2 && this.vy > 1.5) { this.airborne = true; this.airTime = 0; }
      else {
        // trim (Space) pops the bow up a swell for a deliberate jump
        if (inp.trim && vf > 10 && this.trimCd <= 0) { this.airborne = true; this.vy = 4.5 + vf * 0.08; this.trimCd = 1.2; }
        else { this.vy = clamp(vyT, -20, 20); this.pos.y = targetY; }
      }
      this.trimCd = (this.trimCd ?? 0) - dt;
      // pitch/roll follow the surface with a little lag and bank into turns
      const kP = 1 - Math.exp(-dt * 7);
      this.pitch += (s.pitch + planing * 0.06 - this.pitch) * kP;
      this.roll += (s.roll - this.rudder * clamp(vf / 25, 0, 1) * 0.12 - this.roll) * kP;
    }
    this.submerged = this.airborne ? 0 : 1;
    this.spray = clamp(vf / 25, 0, 1) * (inWater ? 1 : 0);
    const targetRpm = 900 + clamp(Math.abs(vf) / 30, 0, 1) * 5200 + inp.throttle * 1200 + (this.airborne ? inp.throttle * 2000 : 0);
    this.rpm += (targetRpm - this.rpm) * Math.min(1, dt * 5);
    this.sync();
  }

  collideBox(b, restitution = 0.3) {
    const cx = clamp(this.pos.x, b.minX, b.maxX), cz = clamp(this.pos.z, b.minZ, b.maxZ);
    const dx = this.pos.x - cx, dz = this.pos.z - cz, d = Math.hypot(dx, dz);
    if (d > this.radius || (b.maxY !== undefined && this.pos.y > b.maxY)) return 0;
    const nx = d > 1e-4 ? dx / d : 1, nz = d > 1e-4 ? dz / d : 0;
    this.pos.x += nx * (this.radius - d); this.pos.z += nz * (this.radius - d);
    const vn = this.vel.x * nx + this.vel.z * nz;
    if (vn >= 0) return 0;
    this.vel.x -= (1 + restitution) * vn * nx; this.vel.z -= (1 + restitution) * vn * nz;
    this.yawRate += clamp(vn * 0.05, -1, 1) * Math.sign(nx * Math.cos(this.yawA) - nz * Math.sin(this.yawA));
    return -vn;
  }

  sync() {
    // yaw, then pitch (bow up = positive), then roll
    this.quat.setFromEuler(new THREE.Euler(-this.pitch, this.yawA, this.roll, 'YXZ'));
    this.mesh.position.copy(this.pos); this.mesh.quaternion.copy(this.quat);
  }
}

import { OCEAN } from '../chapters/ch2/ocean.js';
function OCEAN_T() { return OCEAN.time; }
