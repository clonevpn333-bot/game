// GETAWAY! — camera rig: chase cam (dynamic FOV, speed shake, collision, orbit, look-back, alt views),
// third-person over-shoulder on foot (aim zoom), scripted cinematic shots and trauma-based shake.
import * as THREE from 'three';
import { G } from './context.js';
import { clamp, lerp, damp, dampAngle, noise1, wrapAngle } from './utils.js';

const _t = new THREE.Vector3(), _d = new THREE.Vector3(), _l = new THREE.Vector3(), _cd = new THREE.Vector3();
export class CameraRig {
  constructor(camera) {
    this.cam = camera; this.mode = 'foot'; this.yaw = 0; this.pitch = 0.25; this.dist = 4; this.fov = 72; this.trauma = 0; this.t = 0;
    this.pos = new THREE.Vector3(0, 10, 10); this.look = new THREE.Vector3(); this.orbitT = 0; this.view = 0; // vehicle view index
    this.cine = null; this.letterbox = 0; this.aimBlend = 0; this.shoulder = 1; this.lastVehYaw = 0; this.vel = new THREE.Vector3(); this.prev = new THREE.Vector3();
    this.baseFov = 72;
  }
  shake(amount) { this.trauma = clamp(this.trauma + amount * (G.settings ? G.settings.shake : 1), 0, 1); }
  // scripted shot: { pos: fn(t)->Vector3 | Vector3, look: fn|Vector3, dur, fov, onEnd, letterbox }
  play(shot) { this.cine = { ...shot, t: 0 }; }
  stopCine() { if (this.cine && this.cine.onEnd) { const f = this.cine.onEnd; this.cine = null; f(); } this.cine = null; }
  update(dt, input) {
    this.t += dt; const cam = this.cam; const P = G.player;
    this.trauma = Math.max(0, this.trauma - dt * 1.1);
    if (this.cine) {
      const c = this.cine; c.t += dt; const k = clamp(c.t / c.dur, 0, 1);
      const p = typeof c.pos === 'function' ? c.pos(k, c.t) : c.pos; const l = typeof c.look === 'function' ? c.look(k, c.t) : c.look;
      this.pos.copy(p); this.look.copy(l); this.fov = c.fov || 60; this.letterbox = damp(this.letterbox, c.letterbox === false ? 0 : 1, 6, dt);
      if (c.t >= c.dur) { const f = c.onEnd; this.cine = null; if (f) f(); }
    } else if (this.mode === 'menu') {
      const a = this.t * 0.04; const r = 380; this.pos.set(Math.cos(a) * r + 60, 150 + Math.sin(this.t * 0.07) * 25, Math.sin(a) * r - 40); this.look.set(0, 40, -40); this.fov = 55; this.letterbox = damp(this.letterbox, 0, 4, dt);
    } else if (this.custom) { // aircraft / gunner seats: the mission supplies the shot each frame
      const r = this.custom(dt, input); if (r) { this.pos.copy(r.pos); this.look.copy(r.look); this.fov = r.fov || 70; this.roll = r.roll || 0; }
    } else if (P && P.vehicle) this._vehicle(dt, input, P.vehicle);
    else if (P) this._foot(dt, input, P);
    // shake
    const tr = this.trauma * this.trauma; const pvv = P && P.vehicle; const sp = pvv ? clamp((pvv.speed - 18) / 45, 0, 1) * 0.09 + (pvv.ctrl.boost && pvv.ctrl.throttle ? 0.05 : 0) : 0;
    const sx = (noise1(this.t * 18) * tr * 0.9 + noise1(this.t * 7 + 3) * sp), sy = (noise1(this.t * 19 + 10) * tr * 0.7 + noise1(this.t * 8 + 13) * sp * 0.6);
    cam.position.copy(this.pos);
    cam.lookAt(this.look); cam.rotateX(sy * 0.08); cam.rotateY(sx * 0.08); cam.rotateZ(noise1(this.t * 15 + 30) * tr * 0.05 + (((P && P.vehicle) || this.custom) && !this.cine ? (this.roll || 0) : 0));
    this.punch = Math.max(0, (this.punch || 0) - dt * 30); const fov = this.fov + Math.min(6, this.punch);
    if (Math.abs(cam.fov - fov) > 0.01) { cam.fov = fov; cam.updateProjectionMatrix(); }
    this.vel.subVectors(cam.position, this.prev).divideScalar(Math.max(dt, 1e-3)); this.prev.copy(cam.position);
    if (!this.cine) this.letterbox = damp(this.letterbox, 0, 4, dt);
  }
  _collide(from, to, pad = 0.35) {
    _cd.subVectors(to, from); const len = _cd.length(); if (len < 0.01) return to;
    const hit = G.world.static.raycast(from.x, from.y, from.z, _cd.x, _cd.y, _cd.z, len, { ignoreGlass: true });
    if (hit && hit.t < len) { const t = Math.max(0.3, hit.t - pad); to.copy(from).addScaledVector(_cd, t / len); }
    return to;
  }
  _vehicle(dt, input, v) {
    const sp = v.spec; const speed = v.speed; const lx = input.lookX(), ly = input.lookY();
    if (input.pressed('camera')) this.view = (this.view + 1) % 4;
    if (Math.abs(lx) > 0.0005 || Math.abs(ly) > 0.0005) { this.yaw -= lx * 1.1; this.pitch = clamp(this.pitch + ly, -0.3, 1.1); this.orbitT = 1.8; }
    this.orbitT -= dt;
    // heading: car yaw, blending toward velocity direction while drifting fast
    let head = v.mode === 'rigid' ? Math.atan2(v.vel.x, v.vel.z) : v.yaw;
    if (speed > 8 && v.mode === 'drive') { const vh = Math.atan2(v.vel.x, v.vel.z); const fwd = v.vF > 0; if (fwd) head = v.yaw + wrapAngle(vh - v.yaw) * 0.45; }
    if (v.vF < -3 && v.mode === 'drive') head = v.yaw; // reversing keeps behind
    if (this.orbitT <= 0) { this.yaw = dampAngle(this.yaw, head, v.airborne ? 1.5 : 6.5, dt); this.pitch = damp(this.pitch, 0.2, 2, dt); }
    const back = input.down('lookBack') ? Math.PI : 0;
    const L = sp.L, H = sp.H; const target = _t.set(v.pos.x, v.pos.y + H * 0.85 + 0.4, v.pos.z);
    if (v.mode === 'rigid' && v.rigid) target.copy(v.rigid.pos).y += 1.2;
    let dist = 2.6 + L * 0.7 + clamp(speed * 0.05, 0, 3.2) + (v.airborne ? 1.4 : 0) + (v.ctrl.boost && v.ctrl.throttle ? 0.8 : 0); let height = 0.85 + H * 0.5;
    let fovT = this.baseFov + clamp(speed - 8, 0, 70) * 0.42 + (v.ctrl.boost && v.ctrl.throttle ? 13 : 0);
    this.roll = damp(this.roll || 0, v.mode === 'drive' ? clamp(-v.yawRate * clamp(speed / 35, 0, 1.2) * 0.07, -0.1, 0.1) : 0, 4, dt);
    const view = this.view;
    if (view === 1) { dist *= 1.7; height *= 1.8; }
    const yaw = this.yaw + back;
    if (view === 2) { // hood cam
      const s = Math.sin(v.yaw + back), c = Math.cos(v.yaw + back); this.pos.set(v.pos.x + s * (L * 0.15), v.pos.y + H * 0.8 + 0.25, v.pos.z + c * (L * 0.15));
      this.look.set(this.pos.x + s * 20, this.pos.y - 0.6 - v.pitch * 8, this.pos.z + c * 20); this.fov = damp(this.fov, fovT + 6, 3, dt); return;
    }
    if (view === 3) { // cinematic trackside: hold position, re-place when car gets far
      if (!this.track || this.track.distanceTo(v.pos) > 55 || this.trackT > 6) { const f = _l.set(Math.sin(v.yaw), 0, Math.cos(v.yaw)); this.track = new THREE.Vector3(v.pos.x + f.x * 35 + f.z * 8, v.pos.y + 1.4, v.pos.z + f.z * 35 - f.x * 8); this.track.y = G.world.static.groundAt(this.track.x, this.track.z, v.pos.y + 6, 1).h + 1.6; this.trackT = 0; }
      this.trackT += dt; this.pos.lerp(this.track, 1); this.look.copy(target); this.fov = damp(this.fov, clamp(55 - v.pos.distanceTo(this.pos) * 0.3, 25, 55), 3, dt); return;
    }
    const desired = _d.set(target.x - Math.sin(yaw) * dist * Math.cos(this.pitch * 0.6), target.y + height + Math.sin(this.pitch) * dist * 0.6 - 0.2, target.z - Math.cos(yaw) * dist * Math.cos(this.pitch * 0.6));
    this._collide(target, desired);
    const k = v.airborne ? 6 : 8.5; this.pos.x = damp(this.pos.x, desired.x, k, dt); this.pos.z = damp(this.pos.z, desired.z, k, dt); this.pos.y = damp(this.pos.y, desired.y, 6, dt);
    // never let the lag put the camera inside a wall
    this._collide(target, this.pos);
    const ahead = _l.copy(v.vel).multiplyScalar(0.12); ahead.y = 0;
    this.look.set(target.x + ahead.x, target.y + 0.2, target.z + ahead.z);
    this.fov = damp(this.fov, fovT, 2.5, dt);
  }
  _foot(dt, input, P) {
    const h = P.human; const aiming = P.aiming;
    this.yaw -= input.lookX() * (aiming ? 0.7 : 1); this.pitch = clamp(this.pitch + input.lookY() * (aiming ? 0.7 : 1), -0.9, 1.25);
    this.aimBlend = damp(this.aimBlend, aiming ? 1 : 0, 12, dt);
    const ab = this.aimBlend; const dist = lerp(3.7, 1.75, ab) + (P.sprinting ? 0.4 : 0); const sh = lerp(0.45, 0.62, ab) * this.shoulder;
    const crouch = P.crouching || h.state === 'slide' ? 0.55 : 0;
    const target = _t.set(P.pos.x, P.pos.y + 1.6 - crouch, P.pos.z);
    // shoulder offset (to the right of view)
    const rx = -Math.cos(this.yaw), rz = Math.sin(this.yaw);
    const pivot = _l.copy(target); pivot.x += rx * sh; pivot.z += rz * sh;
    this._collide(target, pivot, 0.2);
    const cp = Math.cos(this.pitch), spt = Math.sin(this.pitch);
    const desired = _d.set(pivot.x - Math.sin(this.yaw) * dist * cp, pivot.y + spt * dist, pivot.z - Math.cos(this.yaw) * dist * cp);
    this._collide(pivot, desired, 0.25);
    this.pos.lerp(desired, 1 - Math.exp(-25 * dt));
    this.look.set(pivot.x + Math.sin(this.yaw) * 10 * cp, pivot.y - spt * 10 + 0.0, pivot.z + Math.cos(this.yaw) * 10 * cp);
    this.fov = damp(this.fov, lerp(this.baseFov, 52, ab) + (P.sprinting ? 6 : 0), 8, dt);
  }
  // world aim ray from screen center
  aimRay(origin, dir) { origin.copy(this.cam.position); this.cam.getWorldDirection(dir); return dir; }
}
