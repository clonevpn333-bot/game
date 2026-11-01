// GETAWAY! — lightweight rigid-body boxes (debris, loose props, tumbling vehicles, collapsing structures)
import * as THREE from 'three';
import { clamp } from '../core/utils.js';

const _r = new THREE.Vector3(), _p = new THREE.Vector3(), _vp = new THREE.Vector3(), _t = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _qi = new THREE.Quaternion(), _dq = new THREE.Quaternion();
const CORNERS = [[-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1], [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]];
const G_ACC = 9.81 * 1.6;

export class RigidBody {
  constructor({ half, mass = 50, pos, quat, vel, angVel, mesh = null, restitution = 0.25, friction = 0.6, life = 30, extraPoints = null, kind = 'debris' }) {
    this.half = half.clone(); this.mass = mass; this.invMass = 1 / mass;
    const hx = half.x * 2, hy = half.y * 2, hz = half.z * 2;
    this.invI = new THREE.Vector3(12 / (mass * (hy * hy + hz * hz)), 12 / (mass * (hx * hx + hz * hz)), 12 / (mass * (hx * hx + hy * hy)));
    this.pos = pos ? pos.clone() : new THREE.Vector3(); this.quat = quat ? quat.clone() : new THREE.Quaternion();
    this.vel = vel ? vel.clone() : new THREE.Vector3(); this.angVel = angVel ? angVel.clone() : new THREE.Vector3();
    this.mesh = mesh; this.restitution = restitution; this.friction = friction; this.life = life; this.age = 0;
    this.sleeping = false; this.sleepT = 0; this.onImpact = null; this.kind = kind; this.dead = false; this.grounded = false; this.lastImpact = 0;
    this.points = CORNERS.map((c) => new THREE.Vector3(c[0] * half.x, c[1] * half.y, c[2] * half.z));
    if (extraPoints) this.points.push(...extraPoints);
    if (half.x > 1.2 || half.z > 1.2) { // edge midpoints for long bodies (vehicles)
      for (const [x, z] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) for (const y of [-1, 1]) this.points.push(new THREE.Vector3(x * half.x, y * half.y, z * half.z));
    }
  }
  applyInvI(v, out) { // world inverse inertia * v
    _qi.copy(this.quat).invert(); out.copy(v).applyQuaternion(_qi); out.x *= this.invI.x; out.y *= this.invI.y; out.z *= this.invI.z; return out.applyQuaternion(this.quat);
  }
  applyImpulse(imp, point) {
    this.vel.addScaledVector(imp, this.invMass);
    _r.subVectors(point, this.pos); _a.crossVectors(_r, imp); this.applyInvI(_a, _b); this.angVel.add(_b);
    this.wake();
  }
  wake() { this.sleeping = false; this.sleepT = 0; }
  sync() { if (this.mesh) { this.mesh.position.copy(this.pos); this.mesh.quaternion.copy(this.quat); } }
}

export class RigidWorld {
  constructor(staticWorld) { this.S = staticWorld; this.bodies = []; this.max = 140; this.gres = { h: 0 }; }
  add(b) {
    this.bodies.push(b);
    if (this.bodies.length > this.max) { // recycle oldest debris
      const i = this.bodies.findIndex((x) => x.kind === 'debris' || x.kind === 'prop'); if (i >= 0) this.remove(this.bodies[i]);
    }
    return b;
  }
  remove(b) { const i = this.bodies.indexOf(b); if (i >= 0) this.bodies.splice(i, 1); b.dead = true; if (b.onRemove) b.onRemove(b); }
  step(dt) {
    const sub = dt > 1 / 45 ? 2 : 1; const h = dt / sub;
    for (let s = 0; s < sub; s++) for (const b of this.bodies) if (!b.sleeping) this._integrate(b, h);
    for (let i = this.bodies.length - 1; i >= 0; i--) {
      const b = this.bodies[i]; b.age += dt; b.sync();
      if (b.life > 0 && b.age > b.life && b.kind !== 'vehicle') this.remove(b);
      else if (b.pos.y < -60) this.remove(b);
    }
  }
  _integrate(b, h) {
    b.vel.y -= G_ACC * h;
    // water drag
    const wl = this.S.waterLevel(b.pos.x, b.pos.z); if (b.pos.y < wl) { b.vel.multiplyScalar(1 - 2.5 * h); b.angVel.multiplyScalar(1 - 2 * h); b.vel.y += G_ACC * 0.7 * h; }
    b.pos.addScaledVector(b.vel, h);
    const w = b.angVel; const wl2 = w.length();
    if (wl2 > 1e-6) { _dq.setFromAxisAngle(_t.copy(w).divideScalar(wl2), wl2 * h); b.quat.premultiply(_dq).normalize(); }
    b.angVel.multiplyScalar(1 - 0.4 * h); b.vel.multiplyScalar(1 - 0.02 * h);
    // contacts
    let contacts = 0, maxImpact = 0; b.grounded = false;
    for (const lp of b.points) {
      _p.copy(lp).applyQuaternion(b.quat).add(b.pos);
      let nx = 0, ny = 0, nz = 0, pen = 0, mat = 'ground';
      const g = this.S.groundAt(_p.x, _p.z, _p.y + 0.6, 0.6, this.gres);
      if (_p.y < g.h) { ny = 1; pen = g.h - _p.y; mat = g.mat; }
      else {
        const boxes = this.S.boxesIn(_p.x - 0.05, _p.z - 0.05, _p.x + 0.05, _p.z + 0.05);
        for (const bx of boxes) {
          if (!bx.solid || _p.y <= bx.minY || _p.y >= bx.maxY || _p.x <= bx.minX || _p.x >= bx.maxX || _p.z <= bx.minZ || _p.z >= bx.maxZ) continue;
          const d = [_p.x - bx.minX, bx.maxX - _p.x, _p.y - bx.minY, bx.maxY - _p.y, _p.z - bx.minZ, bx.maxZ - _p.z]; let m = 0; for (let k = 1; k < 6; k++) if (d[k] < d[m]) m = k;
          pen = d[m]; nx = m === 0 ? -1 : m === 1 ? 1 : 0; ny = m === 2 ? -1 : m === 3 ? 1 : 0; nz = m === 4 ? -1 : m === 5 ? 1 : 0; mat = bx.mat;
          if (bx.glass && bx.onBreak && b.vel.length() > 4) { bx.onBreak(bx, b.vel); pen = 0; }
          break;
        }
      }
      if (pen <= 0) continue;
      contacts++; if (ny > 0.5) b.grounded = true;
      _t.set(nx, ny, nz);
      _r.subVectors(_p, b.pos);
      _vp.crossVectors(b.angVel, _r).add(b.vel);
      const vn = _vp.dot(_t);
      // positional correction
      b.pos.addScaledVector(_t, pen * 0.5);
      if (vn < 0) {
        _a.crossVectors(_r, _t); b.applyInvI(_a, _b); _b.cross(_r);
        const k = b.invMass + _t.dot(_b);
        const e = vn < -2 ? b.restitution : 0;
        const j = -(1 + e) * vn / k;
        const imp = _a.copy(_t).multiplyScalar(j);
        // friction
        const vt = _vp.addScaledVector(_t, -vn); const vtl = vt.length();
        if (vtl > 1e-4) { const jt = Math.min(b.friction * j, vtl / k); imp.addScaledVector(vt, -jt / vtl); }
        b.vel.addScaledVector(imp, b.invMass); _b.crossVectors(_r, imp); b.applyInvI(_b, _b); b.angVel.add(_b);
        if (-vn > maxImpact) maxImpact = -vn;
      }
    }
    if (maxImpact > 2.5 && b.onImpact && b.age - b.lastImpact > 0.12) { b.lastImpact = b.age; b.onImpact(b, maxImpact); }
    // sleeping
    if (contacts > 0 && b.vel.lengthSq() < 0.04 && b.angVel.lengthSq() < 0.05) { b.sleepT += h; if (b.sleepT > 0.6) { b.sleeping = true; b.vel.set(0, 0, 0); b.angVel.set(0, 0, 0); } } else b.sleepT = 0;
  }
  // explosion / shockwave impulse to all bodies in radius
  blast(pos, radius, power) {
    for (const b of this.bodies) {
      const d = b.pos.distanceTo(pos); if (d > radius) continue;
      const f = power * (1 - d / radius) * clamp(b.mass, 1, 400) ** 0.15;
      _t.subVectors(b.pos, pos).normalize(); _t.y = Math.abs(_t.y) + 0.6; _t.normalize();
      b.vel.addScaledVector(_t, f * 30 / Math.max(5, b.mass) ** 0.5);
      b.angVel.add(_a.set((Math.random() - 0.5) * f, (Math.random() - 0.5) * f, (Math.random() - 0.5) * f)); b.wake();
    }
  }
}
