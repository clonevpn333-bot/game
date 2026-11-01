// GETAWAY! — vehicle simulation: bicycle-model tire physics with weight transfer, virtual gearbox, suspension
// following terrain/ramps, airborne flight + air control, rigid-body tumbling for rollovers, damage model
// (deformation, glass, detachable parts, smoke/fire/explosion) and the light rig.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, lerp, approach, smoothstep, wrapAngle, rand, sign } from '../core/utils.js';
import { VEHICLES } from './types.js';
import { buildCarModel, buildBikeModel } from './models.js';
import { RigidBody } from '../fx/rigid.js';
import { crackedGlass } from '../world/textures.js';

const GRAV = 9.81 * 1.6;
const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _up = new THREE.Vector3(0, 1, 0);
let VID = 0;

export class Vehicle {
  constructor(type, { x = 0, y = 0, z = 0, yaw = 0, color = null, parked = false } = {}) {
    const spec = this.spec = VEHICLES[type]; this.type = type; this.id = ++VID;
    this.color = color ?? spec.colors[(Math.random() * spec.colors.length) | 0];
    this.model = spec.bike ? buildBikeModel(spec, this.color) : buildCarModel(spec, this.color);
    this.root = this.model.root; this.root.userData.vehicle = this;
    this.pos = new THREE.Vector3(x, y, z); this.vel = new THREE.Vector3(); this.yaw = yaw; this.yawRate = 0;
    this.pitch = 0; this.roll = 0; this.pitchV = 0; this.rollV = 0; this.airborne = false; this.airTime = 0; this.airRot = 0; this.maxAirH = 0;
    this.bP = 0; this.bR = 0; this.bPV = 0; this.bRV = 0; this.heave = 0; this.heaveV = 0; // body suspension visuals
    this.ctrl = { steer: 0, throttle: 0, brake: 0, handbrake: false, boost: false, airPitch: 0, airRoll: 0 };
    this.steerAngle = 0; this.rpm = 900; this.gear = 1; this.shiftT = 0; this.axPrev = 0; this.ayPrev = 0; this.vF = 0; this.vL = 0;
    this.maxHp = spec.hp; this.hp = spec.hp; this.armor = spec.armor || 1; this.dead = false; this.burnT = 0; this.smoking = 0; this.drowned = false;
    this.driver = null; this.passengers = []; this.ai = null; this.isPlayer = false; this.parked = parked; this.engineOn = !parked;
    this.mode = 'drive'; this.rigid = null; this.flipped = false; this.wreck = false;
    this.L = spec.L; this.W = spec.W; this.H = spec.H; this.mass = spec.mass;
    const wh = spec.wheels; this.a = (wh.f - 0.5) * spec.L; this.b = (0.5 - wh.b) * spec.L; this.wb = this.a + this.b; this.track = wh.track * spec.W;
    this.I = spec.mass * (spec.L * spec.L + spec.W * spec.W) / 12 * 1.15;
    this.slip = 0; this.spin = 0; this.lastImpact = 0; this.siren = false; this.sirenT = 0; this.indicator = 0; this.hazard = false; this.lightsOn = false; this.horn = 0;
    this.glassLevel = 0; this.surface = 'asphalt'; this.wet = 0; this.gres = { h: 0 }; this.heat = 0; this.tag = null;
    this.ground = [0, 0, 0, 0];
    this.boost = 0; // nitrous meter 0..1 (player)
    this.syncModel();
  }
  get speed() { return Math.hypot(this.vel.x, this.vel.z); }
  get forward() { return _v.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); }
  isPolice() { return !!this.spec.police; }
  local(lx, lz, out = new THREE.Vector3()) { const s = Math.sin(this.yaw), c = Math.cos(this.yaw); return out.set(this.pos.x + c * lx + s * lz, this.pos.y, this.pos.z - s * lx + c * lz); }

  // ------------------------------------------------------------------ physics step
  step(h, S) {
    if (this.mode === 'rigid') return;
    const sp = this.spec, c = this.ctrl, m = this.mass;
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    let vF = this.vel.x * sy + this.vel.z * cy, vL = this.vel.x * cy - this.vel.z * sy, r = this.yawRate;
    const dmgF = this.dead || this.drowned ? 0 : 0.55 + 0.45 * clamp(this.hp / (this.maxHp * 0.5), 0, 1);
    const throttle = this.engineOn && !this.wreck ? c.throttle : 0;
    // steering (speed sensitive)
    const lock = sp.steer / (1 + Math.abs(vF) / (this.isPlayer ? 40 : 32));
    const tgt = -c.steer * lock; this.steerAngle = approach(this.steerAngle, tgt, (this.isPlayer ? 5.5 : 2.6) * h);
    const d = this.steerAngle;
    if (!this.airborne) {
      // --- virtual gearbox ---
      const vt = sp.top * (c.boost ? 1.18 : 1); const frac = clamp(Math.abs(vF) / vt, 0, 1); const ng = sp.gears || 5;
      let gear = 1; while (gear < ng && frac > Math.pow(gear / ng, 0.85)) gear++;
      const lo = gear === 1 ? 0 : Math.pow((gear - 1) / ng, 0.85), hi = Math.pow(gear / ng, 0.85);
      const gf = clamp((frac - lo) / (hi - lo), 0, 1);
      if (gear !== this.gear) { if (this.voice && this.isPlayer) { this.voice.shift(); if (gear < this.gear && throttle < 0.2) this.voice.backfire(); } this.shiftT = gear > this.gear ? 0.16 : 0.08; this.gear = gear; G.emit && this.isPlayer && G.emit('shift', gear); }
      const idle = 850, red = sp.engine === 'truck' || sp.engine === 'bus' || sp.engine === 'armored' ? 3200 : sp.engine === 'super' ? 8800 : 7200;
      let rpm = idle + (red - idle) * (0.25 + 0.75 * gf);
      if (Math.abs(vF) < 1.5) rpm = idle + throttle * (red - idle) * 0.55;
      if (this.spin > 0.5) rpm = lerp(rpm, red * 0.95, 0.6);
      this.rpm = lerp(this.rpm, rpm, 1 - Math.exp(-14 * h)); this.shiftT -= h;
      // --- longitudinal forces ---
      let drive = 0, brake = 0; const rev = c.brake > 0.1 && vF < 1.2 && throttle < 0.1;
      if (rev) { drive = -c.brake * m * sp.accel * 0.45 * (vF > -11 ? 1 : 0) * dmgF; this.reversing = true; } else this.reversing = false;
      if (throttle > 0) drive = throttle * m * sp.accel * (1 - Math.pow(frac, 2.1)) * (this.shiftT > 0 ? (this.isPlayer ? 0.7 : 0.35) : 1) * (c.boost ? 1.55 : 1) * dmgF * (vF < -0.5 ? 1.6 : 1);
      if (!rev && c.brake > 0 && Math.abs(vF) > 0.2) brake = c.brake * m * sp.brake * Math.sign(vF);
      if (c.handbrake && Math.abs(vF) > 0.2) brake += m * sp.brake * (throttle > 0.2 ? 0.05 : 0.18) * Math.sign(vF);
      const drag = 0.38 * sp.W * sp.H * vF * Math.abs(vF) + m * 0.11 * vF + (this.engineOn ? 0 : m * 0.4 * vF);
      // --- loads ---
      const down = sp.cls === 'Super' || sp.cls === 'Sports' ? 0.9 * vF * vF : 0.3 * vF * vF;
      const Wt = m * GRAV + down; let Wf = Wt * this.b / this.wb - m * this.axPrev * sp.cgH / this.wb; Wf = clamp(Wf, Wt * 0.15, Wt * 0.85); const Wr = Wt - Wf;
      const surf = this.surface === 'ground' ? 0.72 : this.surface === 'sand' ? 0.6 : this.surface === 'dirt' ? 0.8 : 1;
      const mu = sp.grip * surf * (1 - this.wet * 0.14) * (this.drowned ? 0.2 : 1);
      let muF = mu, muR = mu * (c.handbrake ? 0.42 + 0.2 * (1 - sp.drift) : 1);
      // drive split & wheelspin
      const rearShare = sp.drive === 'FWD' ? 0 : sp.drive === 'AWD' ? 0.6 : 1;
      const Fxr = drive * rearShare, Fxf = drive * (1 - rearShare);
      const spinR = Math.abs(Fxr) / (muR * Wr * 1.05), spinF = Math.abs(Fxf) / (muF * Wf * 1.05);
      this.spin = Math.max(spinR, spinF) > 1 && Math.abs(vF) < 25 ? Math.max(spinR, spinF) - 1 : 0;
      const combR = Math.sqrt(Math.max(0.08, 1 - Math.min(1, spinR) ** 2)), combF = Math.sqrt(Math.max(0.15, 1 - Math.min(1, spinF) ** 2));
      // --- lateral tire forces (Pacejka-lite) ---
      const vx = Math.max(Math.abs(vF), 2.5);
      const af = Math.atan2(vL + r * this.a, vx) - d * Math.sign(vF || 1);
      const ar = Math.atan2(vL - r * this.b, vx);
      const Bf = 10, Br = 10 * (1.1 - 0.3 * sp.drift), Cc = 1.45;
      let Fyf = -muF * Wf * Math.sin(Cc * Math.atan(Bf * af)) * combF;
      let Fyr = -muR * Wr * Math.sin(Cc * Math.atan(Br * ar)) * combR;
      if (sp.bike) { Fyf *= 1.05; Fyr *= 1.05; }
      const Fx = clamp(Fxr, -muR * Wr * 1.1, muR * Wr * 1.1) + clamp(Fxf, -muF * Wf * 1.1, muF * Wf * 1.1) - brake - drag;
      let dvF = (Fx - Fyf * Math.sin(d)) / m + r * vL;
      let dvL = (Fyf * Math.cos(d) + Fyr) / m - r * vF;
      let dr = (this.a * Fyf * Math.cos(d) - this.b * Fyr) / this.I;
      vF += dvF * h; vL += dvL * h; r += dr * h;
      // braking cannot reverse direction
      if (brake !== 0 && Math.sign(vF) !== Math.sign(this.vF) && Math.abs(this.vF) > 0) vF = 0;
      // low-speed kinematic blend
      const s = smoothstep(0.8, 4, Math.abs(vF));
      const rk = vF * Math.tan(d) / this.wb; r = lerp(rk, r, s); vL *= 1 - (1 - s) * 12 * h;
      // ARCADE HANDLING (player): turn where you steer, up to the grip limit; slides only when you ask for them
      if (this.isPlayer) {
        const rMax = (sp.grip * GRAV * 1.25 + (c.boost ? 2 : 0)) / Math.max(4, Math.abs(vF));
        const rWant = clamp(vF * Math.tan(d) / this.wb, -rMax, rMax);
        if (c.handbrake && Math.abs(vF) > 6) { r += -c.steer * 3.2 * h * clamp(Math.abs(vF) / 18, 0, 1.2); vF *= 1 - 0.05 * h; this.drifting = 0.6; }
        else {
          this.drifting = Math.max(0, (this.drifting || 0) - h);
          const grip = this.drifting > 0 && throttle > 0.3 ? 0.3 : clamp(1.25 - this.slip / 20, 0.6, 1);
          r = lerp(r, rWant, 1 - Math.exp(-h * 10 * grip));
          vL *= 1 - Math.min(1, h * 5 * grip);
        }
      }
      if (Math.abs(vF) < 0.08 && throttle === 0 && !rev) vF *= 0.5;
      this.axPrev = lerp(this.axPrev, clamp(dvF - r * vL, -25, 25), 0.3); this.ayPrev = lerp(this.ayPrev, clamp(dvL + r * vF, -25, 25), 0.3);
      this.slip = Math.abs(vL - r * this.b);
      this.vel.x = sy * vF + cy * vL; this.vel.z = cy * vF - sy * vL;
      // tipping for top-heavy vehicles
      if (!sp.bike && sp.cgH > 0.75 && Math.abs(this.ayPrev) > GRAV * (this.track / 2) / sp.cgH * 1.25 && Math.abs(vF) > 13 && !this.isPlayerSafe) this.toRigid(new THREE.Vector3(0, 0, -Math.sign(this.ayPrev) * 2.5));
    } else {
      r *= 1 - 0.4 * h; this.slip = 0; this.spin = 0;
      this.rpm = lerp(this.rpm, 3000 + throttle * 4000, 1 - Math.exp(-6 * h));
    }
    // ROSTR cold-gas thrusters: extra shove that works even in mid-air
    if (sp.thrusters && c.boost && this.engineOn) { const k = (this.airborne ? 11 : 7) * h; this.vel.x += sy * k; this.vel.z += cy * k; if (this.airborne) this.vel.y += 5.5 * h; else { vF += k; } this.thrusting = true; } else this.thrusting = false;
    this.vF = vF; this.vL = vL; this.yawRate = r;
    this.yaw = wrapAngle(this.yaw + r * h);
    this.pos.x += this.vel.x * h; this.pos.z += this.vel.z * h;
    this._vertical(h, S);
  }
  _vertical(h, S) {
    const sp = this.spec, sy = Math.sin(this.yaw), cy = Math.cos(this.yaw); const ws = this.model.wheels;
    const yRef = this.pos.y + (this.airborne ? 0.2 : 0.55);
    let gF = 0, gR = 0, gLt = 0, gRt = 0, nf = 0, nr = 0, nl = 0, nrt = 0;
    for (let i = 0; i < ws.length; i++) {
      const w = ws[i]; const wx = this.pos.x + cy * w.x + sy * w.z, wz = this.pos.z - sy * w.x + cy * w.z;
      const g = S.groundAt(wx, wz, yRef, 0.0, this.gres).h; this.ground[i] = g; if (i === 0) this.surface = this.gres.mat;
      if (w.front) { gF += g; nf++; } else { gR += g; nr++; }
      if (w.side > 0) { gLt += g; nl++; } else { gRt += g; nrt++; }
    }
    gF /= nf; gR /= nr; gLt /= nl; gRt /= nrt;
    const tY = (gF * this.b + gR * this.a) / this.wb; // ground under CG
    const tP = Math.atan2(gF - gR, this.wb), tR = this.track > 0.1 ? Math.atan2(gLt - gRt, this.track) : 0;
    this.groundY = tY;
    // water
    const wl = S.waterLevel(this.pos.x, this.pos.z);
    if (this.pos.y < wl - 0.6 && !this.drowned) { this.drowned = true; this.engineOn = false; G.emit('vehicleDrowned', this); if (G.audio) G.audio.splash(this.pos, 2); if (G.fx) G.fx.splash(this.pos, 3); }
    if (!this.airborne) {
      const dy = tY - this.pos.y;
      if (dy < -0.45 && this.vel.y > -GRAV * h * 6) { this.airborne = true; this.airTime = 0; this.airRot = 0; this.launchY = this.pos.y; this.maxAirH = 0; this.pitchV *= 0.9; this.rollV *= 0.5; }
      else {
        this.vel.y = clamp(Math.tan(tP) * this.vF, -30, 30);
        this.pos.y = tY;
        const np = lerp(this.pitch, tP, 1 - Math.exp(-18 * h)), nr = lerp(this.roll, tR, 1 - Math.exp(-18 * h));
        this.pitchV = (np - this.pitch) / h; this.rollV = (nr - this.roll) / h; this.pitch = np; this.roll = nr;
        if (dy > 0.08) { this.heaveV -= dy * 8; if (dy > 0.12 && this.speed > 6) G.emit('bump', this, dy); }
      }
    }
    if (this.airborne) {
      this.vel.y -= GRAV * h; this.pos.y += this.vel.y * h; this.airTime += h;
      this.maxAirH = Math.max(this.maxAirH, this.pos.y - tY);
      this.pitchV += (this.ctrl.airPitch * 3.2 - 0.35) * h; this.rollV += this.ctrl.airRoll * 3.2 * h;
      if (this.ctrl.airPitch === 0) this.pitchV *= 1 - 0.3 * h;
      this.pitch += this.pitchV * h; this.roll += this.rollV * h; this.airRot += Math.abs(this.pitchV * h) + Math.abs(this.rollV * h) + Math.abs(this.yawRate * h) * 0.5;
      if (this.pos.y <= tY) {
        const impact = -this.vel.y; this.pos.y = tY; this.airborne = false;
        const dp = Math.abs(wrapAngle(this.pitch - tP)), dr2 = Math.abs(wrapAngle(this.roll - tR));
        G.emit('landed', this, { airTime: this.airTime, height: this.maxAirH, impact, rot: this.airRot });
        if ((dp > 1.0 || dr2 > 1.0) && !this.spec.bike) { this.toRigid(); return; }
        this.pitch = tP; this.roll = tR; this.pitchV = 0; this.rollV = 0; this.vel.y = 0;
        this.heaveV -= impact * 0.35; this.bPV -= impact * 0.25;
        if (impact > 7 && G.audio) G.audio.impact(this.pos, Math.min(1.5, impact / 18), 'metal');
        if (impact > 14) this.damage((impact - 14) * 2.2, null, null);
        if (this.spec.bike && (dp > 0.8 || dr2 > 0.9)) G.emit('bikeCrash', this, impact);
      }
    }
    // body suspension springs (visual)
    const tgtP = clamp(-this.axPrev * 0.006 * (this.spec.cgH / 0.5), -0.08, 0.08), tgtR = clamp(this.ayPrev * 0.007 * (this.spec.cgH / 0.5), -0.09, 0.09);
    this.bPV += ((tgtP - this.bP) * 90 - this.bPV * 11) * h; this.bP += this.bPV * h;
    this.bRV += ((tgtR - this.bR) * 90 - this.bRV * 11) * h; this.bR += this.bRV * h;
    this.heaveV += (-this.heave * 160 - this.heaveV * 14) * h; this.heave = clamp(this.heave + this.heaveV * h, -0.15, 0.12);
  }

  // ------------------------------------------------------------------ rollover / tumbling
  toRigid(extraAng = null) {
    if (this.mode === 'rigid') return; const sp = this.spec;
    const half = new THREE.Vector3(sp.W / 2 * 0.95, sp.H / 2 * 0.9, sp.L / 2 * 0.95);
    _e.set(-this.pitch, this.yaw, this.roll); const q = new THREE.Quaternion().setFromEuler(_e);
    const center = new THREE.Vector3(0, sp.H / 2, 0).applyQuaternion(q).add(this.pos);
    const ang = new THREE.Vector3(-this.pitchV, this.yawRate, this.rollV).applyQuaternion(new THREE.Quaternion().setFromAxisAngle(_up, this.yaw));
    if (extraAng) ang.add(extraAng.clone().applyQuaternion(q));
    this.rigid = new RigidBody({ half, mass: sp.mass, pos: center, quat: q, vel: this.vel.clone(), angVel: ang, kind: 'vehicle', life: 0, restitution: 0.15, friction: 0.55 });
    this.rigid.onImpact = (b, imp) => { this.damage(Math.max(0, imp - 5) * 2.5, null, null); if (G.audio) G.audio.impact(b.pos, Math.min(1.6, imp / 12), 'metal'); if (G.fx && imp > 4) { G.fx.spark(b.pos, null, 14, 6); G.fx.glass(b.pos, 8); } if (imp > 6) this.crackGlass(imp > 12 ? 2 : 1); G.emit('vehicleImpact', this, imp, b.pos); };
    G.rigid.add(this.rigid); this.mode = 'rigid'; this.airborne = false; G.emit('rollover', this);
  }
  _fromRigid() {
    const b = this.rigid; const up = _v.set(0, 1, 0).applyQuaternion(b.quat);
    if (up.y > 0.75) {
      const f = new THREE.Vector3(0, 0, 1).applyQuaternion(b.quat); this.yaw = Math.atan2(f.x, f.z); this.pitch = 0; this.roll = 0;
      this.pos.copy(b.pos).y -= this.spec.H / 2; this.vel.copy(b.vel); this.vel.y = 0; this.yawRate = 0; G.rigid.remove(b); this.rigid = null; this.mode = 'drive'; this.flipped = false;
    } else { this.flipped = true; this.wreck = this.wreck || !this.isPlayer; b.vel.set(0, 0, 0); b.angVel.set(0, 0, 0); b.sleeping = true; }
  }
  isUpsideDown() { if (this.mode === 'rigid' && this.rigid) return new THREE.Vector3(0, 1, 0).applyQuaternion(this.rigid.quat).y < 0.8; return Math.abs(this.roll) > 0.9 || Math.abs(this.pitch) > 0.9 || this.flipped; }
  flipUpright() { if (this.mode !== 'rigid') { this.roll = 0; this.pitch = 0; this.flipped = false; this.pos.y += 0.3; return; } const b = this.rigid; const f = new THREE.Vector3(0, 0, 1).applyQuaternion(b.quat); this.yaw = Math.atan2(f.x, f.z); this.pitch = this.roll = 0; this.pos.copy(b.pos); this.pos.y = this.groundY ?? b.pos.y; this.vel.set(0, 0, 0); G.rigid.remove(b); this.rigid = null; this.mode = 'drive'; this.flipped = false; this.wreck = false; }

  // ------------------------------------------------------------------ damage
  damage(amount, worldPoint, dirWorld, source = null) {
    if (amount <= 0 || this.dead) return;
    amount /= this.armor; if (this.isPlayer) amount *= 0.5; this.hp -= amount; this.lastHitBy = source || this.lastHitBy;
    if (worldPoint) this.deform(worldPoint, dirWorld, amount);
    if (this.hp < this.maxHp * 0.3 && !this.dead) this.smoking = 1;
    if (this.hp <= 0 && !this.dead) { this.hp = 0; this.burnT = this.burnT || 4.5; }
    G.emit('vehicleDamaged', this, amount, source);
  }
  deform(worldPoint, dirWorld, amount) {
    const md = this.model; if (!md.bodyMesh) return;
    const inv = new THREE.Matrix4().copy(md.body.matrixWorld).invert(); const lp = worldPoint.clone().applyMatrix4(inv);
    const ld = dirWorld ? dirWorld.clone().transformDirection(inv).normalize() : lp.clone().setY(0).negate().normalize();
    const R = 0.7 + Math.min(1.2, amount * 0.025); const depth = Math.min(0.32, amount * 0.006);
    for (const [mesh, orig] of [[md.bodyMesh, md.origBody], [md.cabMesh, md.origCab]]) {
      const pa = mesh.geometry.attributes.position; const arr = pa.array; let changed = false;
      for (let i = 0; i < arr.length; i += 3) {
        const dx = arr[i] - lp.x, dy = arr[i + 1] - lp.y, dz = arr[i + 2] - lp.z; const dd = Math.sqrt(dx * dx + dy * dy + dz * dz); if (dd > R) continue;
        const f = (1 - dd / R) ** 2 * depth; arr[i] += ld.x * f; arr[i + 1] += ld.y * f * 0.6 - f * 0.15; arr[i + 2] += ld.z * f;
        // clamp total displacement
        const ox = arr[i] - orig[i], oy = arr[i + 1] - orig[i + 1], oz = arr[i + 2] - orig[i + 2]; const ol = Math.sqrt(ox * ox + oy * oy + oz * oz);
        if (ol > 0.45) { const k = 0.45 / ol; arr[i] = orig[i] + ox * k; arr[i + 1] = orig[i + 1] + oy * k; arr[i + 2] = orig[i + 2] + oz * k; }
        changed = true;
      }
      if (changed) { pa.needsUpdate = true; mesh.geometry.computeVertexNormals(); }
    }
    // detach parts near impact
    const zf = this.spec.L / 2; const front = lp.z > zf * 0.55, rear = lp.z < -zf * 0.55;
    if (amount > 9) {
      if (front) this.detach(this.model.bumpers[0], dirWorld); else if (rear) this.detach(this.model.bumpers[1], dirWorld);
      else { const side = lp.x > 0 ? 1 : -1; const dr = this.model.doors.find((d) => d.side === side && d.attached); if (dr && amount > 16) this.detachDoor(dr, dirWorld); }
    }
    if (amount > 6) this.crackGlass(amount > 18 ? 2 : 1);
  }
  detach(mesh, dir) {
    if (!mesh || !mesh.visible || !G.rigid) return; mesh.updateMatrixWorld(); mesh.visible = false;
    const m = new THREE.Mesh(mesh.geometry, mesh.material); m.castShadow = true; G.scene.add(m);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(); mesh.matrixWorld.decompose(p, q, _v);
    const bb = mesh.geometry.boundingBox || (mesh.geometry.computeBoundingBox(), mesh.geometry.boundingBox); const half = bb.getSize(new THREE.Vector3()).multiplyScalar(0.5).max(new THREE.Vector3(0.06, 0.06, 0.06));
    const b = new RigidBody({ half, mass: 18, pos: p, quat: q, vel: this.vel.clone().multiplyScalar(0.7).add(new THREE.Vector3(rand(-2, 2), rand(2, 4), rand(-2, 2))).addScaledVector(dir || _v.set(0, 0, 0), -3), angVel: new THREE.Vector3(rand(-6, 6), rand(-6, 6), rand(-6, 6)), mesh: m, life: 25 });
    b.onRemove = () => G.scene.remove(m); b.onImpact = (bb2, imp) => G.audio && G.audio.impact(bb2.pos, Math.min(0.5, imp / 15), 'metal'); G.rigid.add(b);
    if (G.audio) G.audio.impact(p, 0.6, 'metal');
  }
  detachDoor(dr, dir) { dr.attached = false; const mesh = dr.pivot.children[0]; this.detach(mesh, dir); }
  crackGlass(level) {
    const gm = this.model.glass; if (!gm || level <= this.glassLevel) return; this.glassLevel = level;
    if (level === 1) { gm.map = crackedGlass(); gm.color.set(0x8a9aa2); gm.opacity = 0.92; gm.needsUpdate = true; if (G.audio) G.audio.glass(this.pos, 0.5); }
    else { gm.visible = false; if (G.fx) G.fx.glass(_v.copy(this.pos).setY(this.pos.y + this.spec.cabin.belt + 0.3), 40, null, 4); if (G.audio) G.audio.glass(this.pos, 1); }
  }
  explode() {
    if (this.dead) return; this.dead = true; this.hp = 0; this.engineOn = false; this.siren = false; this.wreck = true;
    const p = this.pos.clone().setY(this.pos.y + 1); G.emit('explosion', p, 1.3, 'vehicle', this);
    this.model.paint.color.set(0x1a1816); if (this.model.paint.clearcoat !== undefined) this.model.paint.clearcoat = 0; this.model.paint.roughness = 0.95; this.model.paint.metalness = 0.2;
    this.crackGlass(2); for (const b of this.model.bumpers) if (Math.random() < 0.7) this.detach(b, null);
    this.model.lightU.fill(0); this.burnT = -1; this.fireLeft = 25;
    if (!this.spec.bike) { this.toRigid(new THREE.Vector3(rand(-2, 2), rand(-1, 1), rand(-2, 2))); this.rigid.vel.y += 9; }
  }

  // ------------------------------------------------------------------ per-frame visual update
  update(dt, night, time) {
    if (this.mode === 'rigid' && this.rigid) {
      const b = this.rigid; this.vel.copy(b.vel);
      this.restT = b.vel.length() < 1.2 && b.angVel.length() < 1.2 ? (this.restT || 0) + dt : 0;
      if ((b.sleeping || this.restT > 1.2) && !this.dead) this._fromRigid();
      if (this.mode === 'rigid') { this.pos.copy(b.pos).addScaledVector(_v.set(0, -this.spec.H / 2, 0).applyQuaternion(b.quat), 1); }
    }
    // fire / smoke
    if (this.smoking && G.fx && Math.random() < 0.5) { const p = this.local(0, this.spec.L * 0.38).setY(this.pos.y + this.spec.H * 0.75); G.fx.smokePuff(p, { size: 1, life: 2.5, color: this.hp < this.maxHp * 0.15 ? 0.18 : 0.55, alpha: 0.35, rise: 2 }); }
    if (this.burnT > 0 && !this.dead) { this.burnT -= dt; if (G.fx) G.fx.fire(this.local(0, this.spec.L * 0.36).setY(this.pos.y + this.spec.H * 0.7), 0.9); if (this.burnT <= 0) this.explode(); }
    if (this.dead && this.fireLeft > 0) { this.fireLeft -= dt; if (G.fx) G.fx.fire(this.local(rand(-0.5, 0.5), rand(-1, 1)).setY(this.pos.y + 0.8), 1.2, 1); }
    // lights
    const L = this.model.lightU; const c = this.ctrl;
    if (!this.dead) {
      const on = (this.engineOn && (night > 0.4 || this.lightsOn)) ? 1 : (this.engineOn ? 0.12 : 0);
      L[0] = on; L[1] = this.engineOn ? (c.brake > 0.1 && !this.reversing ? 1 : on * 0.35) : 0; L[4] = this.reversing ? 1 : 0;
      const blink = (Math.floor(time * 2.6) % 2) === 0 ? 1 : 0;
      L[2] = (this.hazard || this.indicator === -1) && blink ? 1 : 0; L[3] = (this.hazard || this.indicator === 1) && blink ? 1 : 0;
      if (this.siren && this.spec.police) { const ph = (time * 4.5) % 2; L[5] = ph < 1 ? (Math.sin(time * 40) > 0 ? 1.4 : 0.2) : 0; L[6] = ph >= 1 ? (Math.sin(time * 40) > 0 ? 1.4 : 0.2) : 0; } else { L[5] = L[6] = 0; }
      L[7] = this.engineOn ? 0.5 + night * 0.6 : 0;
    }
    // doors
    for (const d of this.model.doors) { if (!d.attached) continue; d.open = approach(d.open, d.target, dt * 3.5); d.pivot.rotation.y = -d.side * d.open * 1.15; }
    this.syncModel();
  }
  syncModel() {
    const r = this.root;
    if (this.mode === 'rigid' && this.rigid) { r.quaternion.copy(this.rigid.quat); r.position.copy(this.pos); }
    else {
      let lean = 0; if (this.spec.bike) { this.lean = lerp(this.lean || 0, clamp(Math.atan2(this.ayPrev, GRAV) * 1.1, -0.85, 0.85), 0.2); lean = this.lean; }
      _e.set(-this.pitch, this.yaw, this.roll + lean); r.quaternion.setFromEuler(_e); r.position.copy(this.pos);
    }
    const b = this.model.body; b.position.y = this.heave; b.rotation.set(-this.bP, 0, this.bR);
    r.updateMatrixWorld();
  }
  // world-space corners (XZ) for collision
  corners(out) {
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw); const hl = this.spec.L / 2, hw = this.spec.W / 2; let i = 0;
    for (const [lx, lz] of [[hw, hl], [-hw, hl], [-hw, -hl], [hw, -hl]]) { out[i++] = this.pos.x + c * lx + s * lz; out[i++] = this.pos.z - s * lx + c * lz; }
    return out;
  }
  setDoor(side, open) { const d = this.model.doors.find((x) => x.side === side); if (d) d.target = open ? 1 : 0; }
  dispose() {
    if (this.rigid) { G.rigid.remove(this.rigid); this.rigid = null; }
    if (this.voice) { this.voice.dispose(); this.voice = null; }
    if (this.sirenVoice) { this.sirenVoice.dispose(); this.sirenVoice = null; }
    this.root.parent && this.root.parent.remove(this.root);
    this.root.traverse((o) => { if (o.geometry && (o === this.model.bodyMesh || o === this.model.cabMesh)) o.geometry.dispose(); });
  }
}
