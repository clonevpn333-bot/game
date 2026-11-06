// Vehicle dynamics: a bicycle model with slip-angle tyre forces, weight
// transfer, handbrake drifts, nitrous, an automatic gearbox, airborne
// ballistics, suspension visuals, and 2D OBB collisions with impulses.
import * as THREE from 'three';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export const HANDLING = {
  gt: { mass: 1450, inertia: 2600, a: 1.25, b: 1.37, engine: 15500, topSpeed: 74, brake: 17000, grip: 1.25, rearGrip: 1.15, cf: 95000, cr: 105000, maxSteer: 0.6, drag: 0.36, nitro: 11000, gears: [0, 16, 27, 38, 50, 62, 80] },
  police: { mass: 1750, inertia: 3300, a: 1.4, b: 1.55, engine: 16500, topSpeed: 70, brake: 18000, grip: 1.2, rearGrip: 1.15, cf: 100000, cr: 110000, maxSteer: 0.55, drag: 0.4, nitro: 0, gears: [0, 15, 26, 37, 48, 60, 74] },
  traffic: { mass: 1400, inertia: 2400, a: 1.3, b: 1.4, engine: 6000, topSpeed: 30, brake: 12000, grip: 1.0, rearGrip: 1.0, cf: 80000, cr: 85000, maxSteer: 0.6, drag: 0.5, nitro: 0, gears: [0, 10, 18, 26, 34] },
};

export class CarBody {
  constructor(mesh, handling = HANDLING.gt) {
    this.mesh = mesh; this.h = handling;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.yaw = 0; this.yawRate = 0;
    this.vy = 0; this.airborne = false; this.airTime = 0;
    this.half = mesh.halfExtents ? mesh.halfExtents.clone() : new THREE.Vector3(0.95, 0.7, 2.3);
    this.mass = handling.mass;
    this.input = { throttle: 0, brake: 0, steer: 0, handbrake: 0, nitro: 0 };
    this.steerAngle = 0;
    this.gear = 1; this.rpm = 900;
    this.health = 1; this.nitroFuel = 1;
    this.slip = 0; this.skid = 0;
    this.pitch = 0; this.roll = 0; this.pitchV = 0; this.rollV = 0;
    this.accLong = 0; this.accLat = 0;
    this.wheelSpin = 0;
    this.kinematic = false; // traffic follows a path until it is hit
    this.enabled = true;
    this.grounded = true;
    this.lastImpact = 0;
  }

  get forward() { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  get right() { return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); }
  get speed() { return Math.hypot(this.vel.x, this.vel.z); }
  get forwardSpeed() { return this.vel.x * Math.sin(this.yaw) + this.vel.z * Math.cos(this.yaw); }

  place(x, z, yaw, y = 0) { this.pos.set(x, y, z); this.yaw = yaw; this.vel.set(0, 0, 0); this.yawRate = 0; this.vy = 0; this.sync(); }

  update(dt, ground) {
    if (!this.enabled) return;
    const h = this.h, inp = this.input;
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    let vf = this.vel.x * fx + this.vel.z * fz;
    let vl = this.vel.x * rx + this.vel.z * rz;
    const speed = Math.abs(vf);
    // steering: speed-sensitive with smoothing
    const steerTarget = inp.steer * h.maxSteer * (1 / (1 + speed * 0.045));
    this.steerAngle += (steerTarget - this.steerAngle) * Math.min(1, dt * 10);
    const delta = this.steerAngle;

    let Fx = 0, Fyf = 0, Fyr = 0;
    const N = this.mass * 9.81;
    if (!this.airborne) {
      // longitudinal
      const reversing = inp.brake > 0.1 && vf < 1.5 && inp.throttle < 0.1;
      const top = h.topSpeed * (inp.nitro && this.nitroFuel > 0 ? 1.18 : 1);
      if (inp.throttle > 0) Fx += inp.throttle * h.engine * clamp(1 - vf / top, 0, 1) * (vf < 8 ? 1.25 : 1);
      if (reversing) Fx -= inp.brake * h.engine * 0.5 * clamp(1 + vf / 12, 0, 1);
      else if (inp.brake > 0) Fx -= Math.sign(vf) * inp.brake * h.brake * Math.min(1, speed / 2);
      if (inp.nitro && this.nitroFuel > 0 && h.nitro) { Fx += h.nitro; this.nitroFuel = Math.max(0, this.nitroFuel - dt * 0.22); }
      else this.nitroFuel = Math.min(1, this.nitroFuel + dt * 0.04);
      if (inp.handbrake) Fx -= Math.sign(vf) * h.brake * 0.35 * Math.min(1, speed / 3);
      Fx -= h.drag * vf * Math.abs(vf) + 140 * vf * 0.15;
      // lateral tyre forces (slip angles)
      const sv = Math.max(speed, 3);
      const af = Math.atan2(vl + h.a * this.yawRate, sv) - delta * Math.sign(vf || 1);
      const ar = Math.atan2(vl - h.b * this.yawRate, sv);
      const wf = N * h.b / (h.a + h.b), wr = N * h.a / (h.a + h.b);
      // weight transfer under braking/accel
      const transfer = clamp(-this.accLong * 0.08, -0.25, 0.25);
      const muF = h.grip * (1 + transfer), muR = h.rearGrip * (1 - transfer) * (inp.handbrake ? 0.42 : 1) * (inp.throttle > 0.9 && speed < 12 ? 0.85 : 1);
      Fyf = clamp(-h.cf * af, -muF * wf, muF * wf);
      Fyr = clamp(-h.cr * ar * (inp.handbrake ? 0.5 : 1), -muR * wr, muR * wr);
      this.slip = Math.abs(ar) + (inp.handbrake ? 0.2 : 0);
      this.skid = clamp((Math.abs(Fyr) / (muR * wr) > 0.95 ? Math.abs(ar) * 3 : 0) + (inp.handbrake && speed > 6 ? 0.6 : 0) + (inp.brake > 0.5 && speed > 15 ? 0.35 : 0) + (inp.throttle > 0.9 && speed < 10 ? 0.4 : 0), 0, 1);
    } else { this.skid = 0; Fx -= h.drag * vf * Math.abs(vf) * 0.5; }

    const m = this.mass;
    const ax = (Fx - Fyf * Math.sin(delta)) / m;
    const ay = (Fyr + Fyf * Math.cos(delta)) / m;
    let yawAcc = (h.a * Fyf * Math.cos(delta) - h.b * Fyr) / h.inertia;
    if (this.airborne) yawAcc = 0;
    this.accLong = ax; this.accLat = ay;
    vf += ax * dt; vl += ay * dt;
    this.yawRate += yawAcc * dt;
    // low-speed kinematic blend keeps parking-speed handling stable
    if (!this.airborne) {
      const kin = clamp(1 - Math.abs(vf) / 5, 0, 1);
      const kinRate = (vf * Math.tan(delta)) / (h.a + h.b);
      this.yawRate = this.yawRate * (1 - kin) + kinRate * kin;
      if (kin > 0) vl *= 1 - kin * Math.min(1, dt * 8);
      // arcade stability assist (less with handbrake so drifts hold)
      this.yawRate *= 1 - Math.min(1, dt * (inp.handbrake ? 0.4 : 1.6));
      if (inp.throttle < 0.05 && inp.brake < 0.05 && Math.abs(vf) < 0.4) vf *= 0.9;
    } else this.yawRate *= 1 - dt * 0.5;
    this.yaw += this.yawRate * dt;
    const nfx = Math.sin(this.yaw), nfz = Math.cos(this.yaw), nrx = Math.cos(this.yaw), nrz = -Math.sin(this.yaw);
    this.vel.x = nfx * vf + nrx * vl; this.vel.z = nfz * vf + nrz * vl;
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    // vertical: follow ground, or fly
    const gy = ground ? ground(this.pos.x, this.pos.z) : 0;
    if (this.airborne) {
      this.vy -= 22 * dt; this.pos.y += this.vy * dt; this.airTime += dt;
      if (this.pos.y <= gy) { this.landImpact = Math.max(0, -this.vy); this.pos.y = gy; this.vy = 0; this.airborne = false; this.airTime = 0; this.pitchV -= 1.5; }
    } else {
      const slopeVy = (gy - this.pos.y) / Math.max(dt, 1e-3);
      if (gy < this.pos.y - 0.25 || (this.lastSlopeVy !== undefined && slopeVy < this.lastSlopeVy - 9 && speed > 15)) { this.airborne = true; this.vy = Math.max(this.lastSlopeVy ?? 0, 0); }
      else { this.pos.y = gy; this.lastSlopeVy = slopeVy; }
    }
    // gearbox / rpm for audio
    const g = h.gears;
    const absV = Math.abs(vf);
    while (this.gear < g.length - 1 && absV > g[this.gear] * 0.95) this.gear++;
    while (this.gear > 1 && absV < g[this.gear - 1] * 0.7) this.gear--;
    const lo = g[this.gear - 1] * 0.7, hi = g[this.gear];
    const targetRpm = 900 + clamp((absV - lo) / Math.max(hi - lo, 1), 0, 1) * 6300 + (inp.throttle > 0 && absV < 3 ? 1500 * inp.throttle : 0) + (this.airborne ? inp.throttle * 2000 : 0);
    this.rpm += (targetRpm - this.rpm) * Math.min(1, dt * 8);
    this.wheelSpin += (vf / (this.mesh.def?.wheelR || 0.34)) * dt + (inp.throttle > 0.9 && absV < 10 ? 30 * dt : 0);
    // suspension visuals: damped springs driven by accelerations
    this.pitchV += (-this.pitch * 90 - this.pitchV * 11 - ax * 0.012) * dt;
    this.rollV += (-this.roll * 90 - this.rollV * 11 + ay * 0.01) * dt;
    this.pitch += this.pitchV * dt; this.roll += this.rollV * dt;
    this.sync(dt);
  }

  /** Path-following for kinematic traffic. */
  kinematicMove(dt, target, speed, ground) {
    const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
    const want = Math.atan2(dx, dz);
    let d = want - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yawRate = clamp(d * 3, -1.2, 1.2);
    this.yaw += this.yawRate * dt;
    const cur = this.forwardSpeed;
    const v = cur + clamp(speed - cur, -8 * dt, 3 * dt);
    this.vel.set(Math.sin(this.yaw) * v, 0, Math.cos(this.yaw) * v);
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    this.pos.y = ground ? ground(this.pos.x, this.pos.z) : 0;
    this.steerAngle = clamp(d, -0.5, 0.5);
    this.wheelSpin += (v / 0.33) * dt;
    this.accLong = (v - cur) / Math.max(dt, 1e-3);
    this.pitchV += (-this.pitch * 90 - this.pitchV * 11 - this.accLong * 0.01) * dt; this.pitch += this.pitchV * dt;
    this.sync(dt);
  }

  sync() {
    const m = this.mesh;
    m.position.copy(this.pos);
    m.rotation.set(0, this.yaw, 0);
    if (m.body) {
      m.body.rotation.set(this.pitch + (this.airborne ? clamp(-this.vy * 0.015, -0.3, 0.3) : 0), 0, this.roll);
      m.body.position.y = -Math.abs(this.pitch) * 0.2;
    }
    if (m.wheels) for (const w of m.wheels) {
      w.spin.rotation.x = this.wheelSpin;
      w.steer.rotation.y = w.front ? this.steerAngle : 0;
      w.steer.position.y = w.restY + (this.airborne ? -0.08 : (w.front ? 1 : -1) * this.pitch * 0.5 + w.side * this.roll * 0.4);
    }
    if (m.steeringWheel) m.steeringWheel.rotation.z = -this.steerAngle * 3;
  }

  /** Oriented-box corners in XZ. */
  corners(out = []) {
    const f = this.forward, r = this.right, hx = this.half.x, hz = this.half.z;
    out.length = 0;
    for (const [a, b] of [[1, 1], [-1, 1], [-1, -1], [1, -1]]) out.push({ x: this.pos.x + r.x * hx * a + f.x * hz * b, z: this.pos.z + r.z * hx * a + f.z * hz * b });
    return out;
  }
}

// ---------------- collision helpers ----------------
function project(pts, ax, az) { let mn = Infinity, mx = -Infinity; for (const p of pts) { const d = p.x * ax + p.z * az; if (d < mn) mn = d; if (d > mx) mx = d; } return [mn, mx]; }

/** SAT between two convex XZ polygons. Returns {nx, nz, depth} pushing A out of B, or null. */
export function satXZ(A, B) {
  let best = null;
  for (const poly of [A, B]) for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    let ax = -(q.z - p.z), az = q.x - p.x; const l = Math.hypot(ax, az); ax /= l; az /= l;
    const [a0, a1] = project(A, ax, az), [b0, b1] = project(B, ax, az);
    const o = Math.min(a1, b1) - Math.max(a0, b0);
    if (o <= 0) return null;
    if (!best || o < best.depth) best = { nx: ax, nz: az, depth: o };
  }
  // orient normal from B to A
  const ca = A.reduce((s, p) => [s[0] + p.x / A.length, s[1] + p.z / A.length], [0, 0]);
  const cb = B.reduce((s, p) => [s[0] + p.x / B.length, s[1] + p.z / B.length], [0, 0]);
  if ((ca[0] - cb[0]) * best.nx + (ca[1] - cb[1]) * best.nz < 0) { best.nx = -best.nx; best.nz = -best.nz; }
  return best;
}

const _ca = [], _cb = [];
/** Car vs static axis-aligned box {minX,maxX,minZ,maxZ}. Returns impact speed or 0. */
export function collideStatic(car, box, restitution = 0.25) {
  const A = car.corners(_ca);
  const B = [{ x: box.minX, z: box.minZ }, { x: box.maxX, z: box.minZ }, { x: box.maxX, z: box.maxZ }, { x: box.minX, z: box.maxZ }];
  const hit = satXZ(A, B);
  if (!hit) return 0;
  car.pos.x += hit.nx * hit.depth; car.pos.z += hit.nz * hit.depth;
  const vn = car.vel.x * hit.nx + car.vel.z * hit.nz;
  if (vn >= 0) return 0;
  car.vel.x -= (1 + restitution) * vn * hit.nx; car.vel.z -= (1 + restitution) * vn * hit.nz;
  // scrape: lose some tangential speed and induce yaw
  const tx = -hit.nz, tz = hit.nx, vt = car.vel.x * tx + car.vel.z * tz;
  car.vel.x -= tx * vt * 0.12; car.vel.z -= tz * vt * 0.12;
  car.yawRate += clamp(vn * 0.02 * Math.sign(car.forward.x * tx + car.forward.z * tz), -2, 2);
  car.lastImpact = -vn;
  return -vn;
}

/** Car vs car with mass-weighted impulse and spin. Returns impact speed. */
export function collideCars(a, b, restitution = 0.3) {
  const dx = a.pos.x - b.pos.x, dz = a.pos.z - b.pos.z;
  if (dx * dx + dz * dz > 36) return 0;
  const hit = satXZ(a.corners(_ca), b.corners(_cb));
  if (!hit) return 0;
  const ma = a.kinematic ? 1e9 : a.mass, mb = b.kinematic ? 1e9 : b.mass;
  const wa = mb / (ma + mb), wb = ma / (ma + mb);
  a.pos.x += hit.nx * hit.depth * wa; a.pos.z += hit.nz * hit.depth * wa;
  b.pos.x -= hit.nx * hit.depth * wb; b.pos.z -= hit.nz * hit.depth * wb;
  const rvx = a.vel.x - b.vel.x, rvz = a.vel.z - b.vel.z;
  const vn = rvx * hit.nx + rvz * hit.nz;
  if (vn >= 0) return 0;
  const j = (-(1 + restitution) * vn) / (1 / a.mass + 1 / b.mass);
  a.vel.x += (j / a.mass) * hit.nx; a.vel.z += (j / a.mass) * hit.nz;
  b.vel.x -= (j / b.mass) * hit.nx; b.vel.z -= (j / b.mass) * hit.nz;
  // contact point lever arm → spin
  const cx = (a.pos.x + b.pos.x) / 2, cz = (a.pos.z + b.pos.z) / 2;
  const ra = (cx - a.pos.x) * hit.nz - (cz - a.pos.z) * hit.nx, rb = (cx - b.pos.x) * hit.nz - (cz - b.pos.z) * hit.nx;
  a.yawRate += clamp((ra * j) / (a.h.inertia * 1.5), -3, 3);
  b.yawRate -= clamp((rb * j) / (b.h.inertia * 1.5), -3, 3);
  a.lastImpact = b.lastImpact = -vn;
  return -vn;
}
