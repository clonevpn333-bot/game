// Vehicle dynamics: a bicycle model with slip-angle tyre forces, weight
// transfer, handbrake drifts, nitrous, an automatic gearbox, airborne
// ballistics, suspension visuals, and 2D OBB collisions with impulses.
import * as THREE from 'three';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// Handling specs follow GETAWAY!'s vehicle roster (src/vehicles/types.js on the getaway branch):
// top speed m/s, accel m/s², tyre grip, steering lock, drift tendency, CG height, brake m/s².
export const HANDLING = {
  gt: { mass: 1450, L: 4.55, W: 1.95, H: 1.28, wb: 2.62, top: 76, accel: 9.5, grip: 1.18, steer: 0.62, drift: 0.9, cgH: 0.45, brake: 15, drive: 'RWD', gears: 6, nitro: true },
  police: { mass: 1750, L: 5.0, W: 1.98, H: 1.47, wb: 2.95, top: 72, accel: 9.0, grip: 1.12, steer: 0.6, drift: 0.8, cgH: 0.55, brake: 16, drive: 'RWD', gears: 6 },
  traffic: { mass: 1400, L: 4.6, W: 1.85, H: 1.45, wb: 2.75, top: 34, accel: 5, grip: 1.0, steer: 0.6, drift: 0.7, cgH: 0.55, brake: 12, drive: 'FWD', gears: 5 },
};

const GRAV = 9.81 * 1.6;
const lerp = (a, b, t) => a + (b - a) * t;
const approach = (v, t, r) => (v < t ? Math.min(t, v + r) : Math.max(t, v - r));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export class CarBody {
  constructor(mesh, handling = HANDLING.gt, { player = false } = {}) {
    this.mesh = mesh; this.h = handling; this.isPlayer = player;
    this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
    this.yaw = 0; this.yawRate = 0; this.vF = 0; this.vL = 0;
    this.vy = 0; this.airborne = false; this.airTime = 0;
    this.half = mesh.halfExtents ? mesh.halfExtents.clone() : new THREE.Vector3(0.95, 0.7, 2.3);
    this.mass = handling.mass;
    this.a = handling.wb / 2; this.b = handling.wb / 2; this.wb = handling.wb;
    this.I = handling.mass * (handling.L * handling.L + handling.W * handling.W) / 12 * 1.15;
    this.input = { throttle: 0, brake: 0, steer: 0, handbrake: 0, nitro: 0 };
    this.steerAngle = 0; this.gear = 1; this.rpm = 900; this.shiftT = 0;
    this.health = 1; this.nitroFuel = 1;
    this.slip = 0; this.skid = 0; this.spin = 0; this.drifting = 0;
    this.axPrev = 0; this.ayPrev = 0;
    this.pitch = 0; this.roll = 0; this.pitchV = 0; this.rollV = 0;
    this.accLong = 0; this.accLat = 0;
    this.wheelSpin = 0;
    this.kinematic = false; // traffic follows a path until it is hit
    this.enabled = true;
    this.lastImpact = 0;
  }

  get forward() { return new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  get right() { return new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw)); }
  get speed() { return Math.hypot(this.vel.x, this.vel.z); }
  get forwardSpeed() { return this.vel.x * Math.sin(this.yaw) + this.vel.z * Math.cos(this.yaw); }

  place(x, z, yaw, y = 0) { this.pos.set(x, y, z); this.yaw = yaw; this.vel.set(0, 0, 0); this.yawRate = 0; this.vy = 0; this.vF = this.vL = 0; this.airborne = false; this.sync(); }

  /** Port of GETAWAY!'s Vehicle.step: Pacejka-lite tyres, weight transfer, gearbox, arcade player assist. */
  update(h, ground) {
    if (!this.enabled) return;
    const sp = this.h, c = this.input, m = this.mass;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let vF = this.vel.x * sy + this.vel.z * cy, vL = this.vel.x * cy - this.vel.z * sy, r = this.yawRate;
    const dmgF = 0.6 + 0.4 * clamp(this.health / 0.5, 0, 1);
    const throttle = c.throttle;
    const boost = !!(c.nitro && sp.nitro && this.nitroFuel > 0);
    if (boost) this.nitroFuel = Math.max(0, this.nitroFuel - h * 0.2); else this.nitroFuel = Math.min(1, this.nitroFuel + h * 0.05);
    // steering (speed sensitive); positive input steers right
    const lock = sp.steer / (1 + Math.abs(vF) / (this.isPlayer ? 40 : 32));
    this.steerAngle = approach(this.steerAngle, -c.steer * lock, (this.isPlayer ? 5.5 : 2.6) * h);
    const d = this.steerAngle;
    if (!this.airborne) {
      // virtual gearbox
      const vt = sp.top * (boost ? 1.18 : 1), frac = clamp(Math.abs(vF) / vt, 0, 1), ng = sp.gears;
      let gear = 1; while (gear < ng && frac > Math.pow(gear / ng, 0.85)) gear++;
      const lo = gear === 1 ? 0 : Math.pow((gear - 1) / ng, 0.85), hi = Math.pow(gear / ng, 0.85);
      const gf = clamp((frac - lo) / (hi - lo), 0, 1);
      if (gear !== this.gear) { this.shiftT = gear > this.gear ? 0.16 : 0.08; this.gear = gear; this.onShift?.(gear); }
      let rpm = 850 + 6350 * (0.25 + 0.75 * gf);
      if (Math.abs(vF) < 1.5) rpm = 850 + throttle * 6350 * 0.55;
      if (this.spin > 0.5) rpm = lerp(rpm, 7200 * 0.95, 0.6);
      this.rpm = lerp(this.rpm, rpm, 1 - Math.exp(-14 * h)); this.shiftT -= h;
      // longitudinal
      let drive = 0, brake = 0; const rev = c.brake > 0.1 && vF < 1.2 && throttle < 0.1 && !c.handbrake; // brake+handbrake = hold still
      if (rev) drive = -c.brake * m * sp.accel * 0.45 * (vF > -11 ? 1 : 0) * dmgF;
      if (throttle > 0) drive = throttle * m * sp.accel * (1 - Math.pow(frac, 2.1)) * (this.shiftT > 0 ? (this.isPlayer ? 0.7 : 0.35) : 1) * (boost ? 1.55 : 1) * dmgF * (vF < -0.5 ? 1.6 : 1);
      if (!rev && c.brake > 0 && Math.abs(vF) > 0.2) brake = c.brake * m * sp.brake * Math.sign(vF);
      if (c.handbrake && Math.abs(vF) > 0.2) brake += m * sp.brake * (throttle > 0.2 ? 0.05 : 0.18) * Math.sign(vF);
      const drag = 0.38 * sp.W * sp.H * vF * Math.abs(vF) + m * 0.11 * vF;
      // loads + weight transfer
      const down = 0.9 * vF * vF;
      const Wt = m * GRAV + down; let Wf = Wt * this.b / this.wb - m * this.axPrev * sp.cgH / this.wb; Wf = clamp(Wf, Wt * 0.15, Wt * 0.85); const Wr = Wt - Wf;
      const mu = sp.grip * 0.95; // wet streets
      const muF = mu, muR = mu * (c.handbrake ? 0.42 + 0.2 * (1 - sp.drift) : 1);
      const rearShare = sp.drive === 'FWD' ? 0 : sp.drive === 'AWD' ? 0.6 : 1;
      const Fxr = drive * rearShare, Fxf = drive * (1 - rearShare);
      const spinR = Math.abs(Fxr) / (muR * Wr * 1.05), spinF = Math.abs(Fxf) / (muF * Wf * 1.05);
      this.spin = Math.max(spinR, spinF) > 1 && Math.abs(vF) < 25 ? Math.max(spinR, spinF) - 1 : 0;
      const combR = Math.sqrt(Math.max(0.08, 1 - Math.min(1, spinR) ** 2)), combF = Math.sqrt(Math.max(0.15, 1 - Math.min(1, spinF) ** 2));
      // lateral tyre forces (Pacejka-lite)
      const vx = Math.max(Math.abs(vF), 2.5);
      const af = Math.atan2(vL + r * this.a, vx) - d * Math.sign(vF || 1);
      const ar = Math.atan2(vL - r * this.b, vx);
      const Bf = 10, Br = 10 * (1.1 - 0.3 * sp.drift), Cc = 1.45;
      const Fyf = -muF * Wf * Math.sin(Cc * Math.atan(Bf * af)) * combF;
      const Fyr = -muR * Wr * Math.sin(Cc * Math.atan(Br * ar)) * combR;
      const Fx = clamp(Fxr, -muR * Wr * 1.1, muR * Wr * 1.1) + clamp(Fxf, -muF * Wf * 1.1, muF * Wf * 1.1) - brake - drag;
      const dvF = (Fx - Fyf * Math.sin(d)) / m + r * vL;
      const dvL = (Fyf * Math.cos(d) + Fyr) / m - r * vF;
      const dr = (this.a * Fyf * Math.cos(d) - this.b * Fyr) / this.I;
      const vF0 = vF;
      vF += dvF * h; vL += dvL * h; r += dr * h;
      if (brake !== 0 && Math.sign(vF) !== Math.sign(vF0) && Math.abs(vF0) > 0) vF = 0; // braking never reverses
      // low-speed kinematic blend
      const s = sstep(0.8, 4, Math.abs(vF));
      const rk = vF * Math.tan(d) / this.wb; r = lerp(rk, r, s); vL *= 1 - (1 - s) * 12 * h;
      // ARCADE HANDLING (player): turn where you steer up to the grip limit; slide only on the handbrake
      if (this.isPlayer) {
        const rMax = (sp.grip * GRAV * 1.25 + (boost ? 2 : 0)) / Math.max(4, Math.abs(vF));
        const rWant = clamp(vF * Math.tan(d) / this.wb, -rMax, rMax);
        if (c.handbrake && Math.abs(vF) > 6) { r += -c.steer * 3.2 * h * clamp(Math.abs(vF) / 18, 0, 1.2); vF *= 1 - 0.05 * h; this.drifting = 0.6; }
        else {
          this.drifting = Math.max(0, this.drifting - h);
          const grip = this.drifting > 0 && throttle > 0.3 ? 0.3 : clamp(1.25 - this.slip / 20, 0.6, 1);
          r = lerp(r, rWant, 1 - Math.exp(-h * 10 * grip));
          vL *= 1 - Math.min(1, h * 5 * grip);
        }
      }
      if (Math.abs(vF) < 0.08 && throttle === 0 && !rev) vF *= 0.5;
      this.axPrev = lerp(this.axPrev, clamp(dvF - r * vL, -25, 25), 0.3); this.ayPrev = lerp(this.ayPrev, clamp(dvL + r * vF, -25, 25), 0.3);
      this.slip = Math.abs(vL - r * this.b);
      this.skid = clamp((this.slip - 2.5) / 6, 0, 1) * (Math.abs(vF) > 4 ? 1 : 0) + (this.spin > 0.2 ? 0.5 : 0) + (c.handbrake && Math.abs(vF) > 6 ? 0.5 : 0) + (c.brake > 0.6 && Math.abs(vF) > 14 ? 0.35 : 0);
      this.skid = clamp(this.skid, 0, 1);
      this.vel.x = sy * vF + cy * vL; this.vel.z = cy * vF - sy * vL;
    } else {
      r *= 1 - 0.4 * h; this.slip = 0; this.spin = 0; this.skid = 0;
      this.rpm = lerp(this.rpm, 3000 + throttle * 4000, 1 - Math.exp(-6 * h));
    }
    this.vF = vF; this.vL = vL; this.yawRate = r;
    this.yaw = wrap(this.yaw + r * h);
    this.pos.x += this.vel.x * h; this.pos.z += this.vel.z * h;
    this.accLong = this.axPrev; this.accLat = this.ayPrev;
    // vertical: flat streets; ballistic when launched (the flood)
    const gy = ground ? ground(this.pos.x, this.pos.z) : 0;
    if (this.airborne) {
      this.vy -= GRAV * h; this.pos.y += this.vy * h; this.airTime += h;
      if (this.pos.y <= gy) { this.landImpact = Math.max(0, -this.vy); this.pos.y = gy; this.vy = 0; this.airborne = false; this.airTime = 0; }
    } else this.pos.y = gy;
    this.wheelSpin += (vF / 0.34) * h + (this.spin > 0.3 ? 40 * h : 0);
    // body suspension springs (visual), as in Getaway
    const tgtP = clamp(-this.axPrev * 0.006 * (sp.cgH / 0.5), -0.08, 0.08), tgtR = clamp(this.ayPrev * 0.007 * (sp.cgH / 0.5), -0.09, 0.09);
    this.pitchV += ((tgtP - this.pitch) * 90 - this.pitchV * 11) * h; this.pitch += this.pitchV * h;
    this.rollV += ((tgtR - this.roll) * 90 - this.rollV * 11) * h; this.roll += this.rollV * h;
    this.sync();
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
  a.yawRate += clamp((ra * j) / (a.I * 1.5), -3, 3);
  b.yawRate -= clamp((rb * j) / (b.I * 1.5), -3, 3);
  a.lastImpact = b.lastImpact = -vn;
  return -vn;
}
