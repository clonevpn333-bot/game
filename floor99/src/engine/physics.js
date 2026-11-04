// FLOOR 99 — lightweight custom physics.
// Oriented-box static/kinematic colliders, sphere queries (character controllers),
// raycasts, and simple rigid "bodies" (spheres, optionally box-looking) for props/debris.
import * as THREE from 'three';

const _p = new THREE.Vector3();
const _q = new THREE.Vector3();
const _d = new THREE.Vector3();
const _o = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _eul = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);

let QUERY_STAMP = 1;

export class Box {
  constructor(o = {}) {
    this.center = new THREE.Vector3();
    this.half = new THREE.Vector3(0.5, 0.5, 0.5);
    this.quat = new THREE.Quaternion();
    this.m = new THREE.Matrix4();
    this.inv = new THREE.Matrix4();
    this.prevM = new THREE.Matrix4();
    this.deltaM = new THREE.Matrix4();
    this.min = new THREE.Vector3();
    this.max = new THREE.Vector3();
    this.tag = o.tag || 'solid';
    this.surface = o.surface || 'metal';
    this.conveyor = o.conveyor || null; // world-space surface velocity
    this.ice = false;
    this.wallrun = o.wallrun !== false;
    this.grapple = o.grapple !== false;
    this.hazard = o.hazard || null; // { dps, type }
    this.enabled = true;
    this.dynamic = !!o.dynamic;
    this.object = null; // Object3D this collider follows (kinematic)
    this.local = new THREE.Vector3(); // local center offset in object space
    this.localQuat = new THREE.Quaternion();
    this.owner = o.owner || null; // gameplay owner (e.g. destructible)
    this.blocksBullets = o.blocksBullets !== false;
    this.stamp = 0;
    this.moved = false;
    if (o.pos) this.center.copy(o.pos);
    if (o.size) this.half.set(o.size[0] / 2, o.size[1] / 2, o.size[2] / 2);
    if (o.half) this.half.copy(o.half);
    if (o.rot) { _eul.set(o.rot[0] || 0, o.rot[1] || 0, o.rot[2] || 0); this.quat.setFromEuler(_eul); }
    if (o.quat) this.quat.copy(o.quat);
    this.updateMatrix(true);
  }
  updateMatrix(resetPrev) {
    this.prevM.copy(this.m);
    this.m.compose(this.center, this.quat, _scale);
    this.inv.copy(this.m).invert();
    if (resetPrev) this.prevM.copy(this.m);
    // delta transform = M * prevM^-1
    _m.copy(this.prevM).invert();
    this.deltaM.multiplyMatrices(this.m, _m);
    // world AABB
    const e = this.m.elements;
    const hx = this.half.x, hy = this.half.y, hz = this.half.z;
    const ex = Math.abs(e[0]) * hx + Math.abs(e[4]) * hy + Math.abs(e[8]) * hz;
    const ey = Math.abs(e[1]) * hx + Math.abs(e[5]) * hy + Math.abs(e[9]) * hz;
    const ez = Math.abs(e[2]) * hx + Math.abs(e[6]) * hy + Math.abs(e[10]) * hz;
    this.min.set(this.center.x - ex, this.center.y - ey, this.center.z - ez);
    this.max.set(this.center.x + ex, this.center.y + ey, this.center.z + ez);
  }
  // Follow an Object3D (kinematic). localCenter in object space.
  attach(object, localCenter, localQuat) {
    this.object = object;
    this.dynamic = true;
    if (localCenter) this.local.copy(localCenter);
    if (localQuat) this.localQuat.copy(localQuat);
    this.syncFromObject(true);
    return this;
  }
  syncFromObject(reset) {
    if (!this.object) return;
    this.object.updateWorldMatrix(true, false);
    this.object.matrixWorld.decompose(_o, _quat, _d);
    this.quat.copy(_quat).multiply(this.localQuat);
    this.center.copy(this.local).applyQuaternion(_quat).add(_o);
    this.updateMatrix(reset);
  }
  // Velocity of a world-space point riding this collider (from last frame delta)
  pointVelocity(point, dt, out) {
    out.copy(point).applyMatrix4(this.deltaM).sub(point).divideScalar(Math.max(dt, 1e-4));
    return out;
  }
  containsPoint(p, pad = 0) {
    _p.copy(p).applyMatrix4(this.inv);
    return Math.abs(_p.x) <= this.half.x + pad && Math.abs(_p.y) <= this.half.y + pad && Math.abs(_p.z) <= this.half.z + pad;
  }
  topY() { return this.max.y; }
}

export class Body {
  constructor(o = {}) {
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.spin = new THREE.Vector3();
    this.r = o.r || 0.4;
    this.mass = o.mass || 1;
    this.bounce = o.bounce ?? 0.25;
    this.friction = o.friction ?? 0.85;
    this.drag = o.drag ?? 0.02;
    this.gravityScale = o.gravityScale ?? 1;
    this.density = o.density ?? 0.6; // < 1 floats
    this.mesh = o.mesh || null;
    this.box = !!o.box; // visually a box: settle flat when resting
    this.onImpact = o.onImpact || null;
    this.onGround = false;
    this.inWater = false;
    this.alive = true;
    this.life = o.life ?? Infinity;
    this.collideBodies = o.collideBodies !== false;
    this.collideWorld = o.collideWorld !== false;
    this.kind = o.kind || 'prop';
    this.owner = o.owner || null;
    this.sleep = 0;
    this.grabbed = false;
    this.lastImpact = 0;
    this.hp = o.hp ?? Infinity;
    if (o.pos) this.pos.copy(o.pos);
    if (o.vel) this.vel.copy(o.vel);
  }
}

export class Physics {
  constructor() {
    this.colliders = [];
    this.dynamicColliders = [];
    this.grid = new Map();
    this.cell = 6;
    this.bodies = [];
    this.gravity = -26;
    this.gravityScaleBodies = 1;
    this.waterLevelAt = () => -Infinity;
    this.contacts = [];
    for (let i = 0; i < 16; i++) this.contacts.push({ n: new THREE.Vector3(), pen: 0, c: null, point: new THREE.Vector3() });
    this.contactCount = 0;
  }
  clear() {
    this.colliders.length = 0;
    this.dynamicColliders.length = 0;
    this.grid.clear();
    this.bodies.length = 0;
  }
  key(ix, iz) { return ix * 100003 + iz; }
  add(c) {
    this.colliders.push(c);
    if (c.dynamic) this.dynamicColliders.push(c);
    else this._insertGrid(c);
    return c;
  }
  addBox(o) { return this.add(new Box(o)); }
  remove(c) {
    let i = this.colliders.indexOf(c);
    if (i >= 0) this.colliders.splice(i, 1);
    i = this.dynamicColliders.indexOf(c);
    if (i >= 0) this.dynamicColliders.splice(i, 1);
    else this._removeGrid(c);
  }
  // Make a static collider dynamic (e.g. a floor slab that starts falling)
  makeDynamic(c) {
    if (c.dynamic) return;
    this._removeGrid(c);
    c.dynamic = true;
    this.dynamicColliders.push(c);
  }
  _insertGrid(c) {
    const s = this.cell;
    const x0 = Math.floor(c.min.x / s), x1 = Math.floor(c.max.x / s);
    const z0 = Math.floor(c.min.z / s), z1 = Math.floor(c.max.z / s);
    c._cells = [];
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const k = this.key(x, z);
      let a = this.grid.get(k);
      if (!a) { a = []; this.grid.set(k, a); }
      a.push(c);
      c._cells.push(k);
    }
  }
  _removeGrid(c) {
    if (!c._cells) return;
    for (const k of c._cells) {
      const a = this.grid.get(k);
      if (!a) continue;
      const i = a.indexOf(c);
      if (i >= 0) a.splice(i, 1);
    }
    c._cells = null;
  }
  // Gather colliders overlapping an AABB into out[]
  query(minX, minY, minZ, maxX, maxY, maxZ, out) {
    out.length = 0;
    const stamp = ++QUERY_STAMP;
    const s = this.cell;
    const x0 = Math.floor(minX / s), x1 = Math.floor(maxX / s);
    const z0 = Math.floor(minZ / s), z1 = Math.floor(maxZ / s);
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) {
      const a = this.grid.get(this.key(x, z));
      if (!a) continue;
      for (let i = 0; i < a.length; i++) {
        const c = a[i];
        if (c.stamp === stamp || !c.enabled) continue;
        c.stamp = stamp;
        if (c.max.x < minX || c.min.x > maxX || c.max.y < minY || c.min.y > maxY || c.max.z < minZ || c.min.z > maxZ) continue;
        out.push(c);
      }
    }
    for (let i = 0; i < this.dynamicColliders.length; i++) {
      const c = this.dynamicColliders[i];
      if (!c.enabled) continue;
      if (c.max.x < minX || c.min.x > maxX || c.max.y < minY || c.min.y > maxY || c.max.z < minZ || c.min.z > maxZ) continue;
      out.push(c);
    }
    return out;
  }
  // Sphere vs one box. Writes into contact. Returns true if overlapping.
  sphereBox(center, r, c, contact) {
    _p.copy(center).applyMatrix4(c.inv);
    const h = c.half;
    _q.set(
      Math.max(-h.x, Math.min(h.x, _p.x)),
      Math.max(-h.y, Math.min(h.y, _p.y)),
      Math.max(-h.z, Math.min(h.z, _p.z)),
    );
    _d.subVectors(_p, _q);
    const dist2 = _d.lengthSq();
    if (dist2 > r * r) return false;
    if (dist2 > 1e-10) {
      const dist = Math.sqrt(dist2);
      _n.copy(_d).divideScalar(dist);
      contact.pen = r - dist;
    } else {
      // center inside box: push out along the shallowest axis
      const dx = h.x - Math.abs(_p.x), dy = h.y - Math.abs(_p.y), dz = h.z - Math.abs(_p.z);
      if (dy <= dx && dy <= dz) { _n.set(0, Math.sign(_p.y) || 1, 0); contact.pen = r + dy; }
      else if (dx <= dz) { _n.set(Math.sign(_p.x) || 1, 0, 0); contact.pen = r + dx; }
      else { _n.set(0, 0, Math.sign(_p.z) || 1); contact.pen = r + dz; }
    }
    contact.n.copy(_n).applyQuaternion(c.quat);
    contact.point.copy(_q).applyMatrix4(c.m);
    contact.c = c;
    return true;
  }
  _tmpList = [];
  // Collide a sphere against the world, resolving penetration on `pos` in place.
  // Returns number of contacts (stored in this.contacts).
  collideSphere(pos, r, filter) {
    const list = this.query(pos.x - r, pos.y - r, pos.z - r, pos.x + r, pos.y + r, pos.z + r, this._tmpList);
    let count = 0;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (filter && !filter(c)) continue;
      const ct = this.contacts[count < 15 ? count : 15];
      if (this.sphereBox(pos, r, c, ct)) {
        pos.addScaledVector(ct.n, ct.pen);
        if (count < 15) count++;
      }
    }
    this.contactCount = count;
    return count;
  }
  // Ray vs world colliders. dir must be normalized.
  raycast(origin, dir, maxDist, out = {}, filter) {
    let best = maxDist;
    let hit = null;
    const list = this.colliders;
    const ox = origin.x, oy = origin.y, oz = origin.z;
    const ex = ox + dir.x * maxDist, ey = oy + dir.y * maxDist, ez = oz + dir.z * maxDist;
    const minX = Math.min(ox, ex), maxX = Math.max(ox, ex);
    const minY = Math.min(oy, ey), maxY = Math.max(oy, ey);
    const minZ = Math.min(oz, ez), maxZ = Math.max(oz, ez);
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (!c.enabled) continue;
      if (c.max.x < minX || c.min.x > maxX || c.max.y < minY || c.min.y > maxY || c.max.z < minZ || c.min.z > maxZ) continue;
      if (filter && !filter(c)) continue;
      // local ray
      _o.copy(origin).applyMatrix4(c.inv);
      _dir.copy(dir).transformDirection(c.inv);
      const h = c.half;
      let tmin = -Infinity, tmax = Infinity, axis = -1, sgn = 1;
      // slab x
      for (let a = 0; a < 3; a++) {
        const o = a === 0 ? _o.x : a === 1 ? _o.y : _o.z;
        const d = a === 0 ? _dir.x : a === 1 ? _dir.y : _dir.z;
        const hh = a === 0 ? h.x : a === 1 ? h.y : h.z;
        if (Math.abs(d) < 1e-9) {
          if (o < -hh || o > hh) { tmin = Infinity; break; }
        } else {
          let t1 = (-hh - o) / d, t2 = (hh - o) / d;
          let s = -1;
          if (t1 > t2) { const t = t1; t1 = t2; t2 = t; s = 1; }
          if (t1 > tmin) { tmin = t1; axis = a; sgn = s; }
          if (t2 < tmax) tmax = t2;
          if (tmin > tmax) { tmin = Infinity; break; }
        }
      }
      if (tmin === Infinity || tmax < 0) continue;
      const t = tmin >= 0 ? tmin : 0;
      if (t < best) {
        best = t;
        hit = c;
        if (tmin < 0) _n.copy(dir).negate();
        else {
          _n.set(axis === 0 ? sgn : 0, axis === 1 ? sgn : 0, axis === 2 ? sgn : 0).applyQuaternion(c.quat);
        }
        out.normal = (out.normal || new THREE.Vector3()).copy(_n);
      }
    }
    if (!hit) { out.hit = false; out.dist = maxDist; out.collider = null; return out; }
    out.hit = true;
    out.dist = best;
    out.collider = hit;
    out.point = (out.point || new THREE.Vector3()).copy(origin).addScaledVector(dir, best);
    return out;
  }
  lineOfSight(a, b) {
    _dir.subVectors(b, a);
    const len = _dir.length();
    if (len < 1e-4) return true;
    _dir.divideScalar(len);
    const r = this.raycast(a, _dir, len, this._losOut || (this._losOut = {}), (c) => c.blocksBullets);
    return !r.hit;
  }
  addBody(b) { this.bodies.push(b); return b; }
  // deferred: bodies are spliced out at the start of the next step (safe during callbacks)
  removeBody(b) { b.alive = false; }

  syncDynamic() {
    for (const c of this.dynamicColliders) {
      if (c.object) c.syncFromObject(false);
      else c.updateMatrix(false);
    }
  }

  step(dt) {
    const steps = dt > 1 / 50 ? 2 : 1;
    const h = dt / steps;
    for (let s = 0; s < steps; s++) this._stepBodies(h);
  }
  _stepBodies(dt) {
    const g = this.gravity * this.gravityScaleBodies;
    const bodies = this.bodies;
    for (let i = bodies.length - 1; i >= 0; i--) {
      const b = bodies[i];
      if (!b.alive) { bodies.splice(i, 1); continue; }
      b.life -= dt;
      if (b.life <= 0) { b.alive = false; if (b.onExpire) b.onExpire(b); bodies.splice(i, 1); continue; }
      if (b.grabbed) continue;
      const wl = this.waterLevelAt(b.pos.x, b.pos.z);
      b.inWater = b.pos.y < wl;
      if (b.sleep > 0.6 && !b.inWater && b.vel.lengthSq() < 0.01) {
        // sleeping: check still supported occasionally
        b.sleep += dt;
        if (b.sleep < 2.5) continue;
        b.sleep = 0.61;
      }
      b.vel.y += g * b.gravityScale * dt;
      if (b.inWater) {
        const depth = Math.min(1, (wl - b.pos.y) / (b.r * 2));
        b.vel.y += (-g) * (1 / Math.max(0.15, b.density)) * depth * dt * 0.95;
        b.vel.multiplyScalar(Math.max(0, 1 - 2.2 * dt));
        b.spin.multiplyScalar(Math.max(0, 1 - 1.5 * dt));
        if (this.waterFlow) { const f = this.waterFlow(b.pos); if (f) b.vel.addScaledVector(f, dt * 2); }
      }
      b.vel.multiplyScalar(Math.max(0, 1 - b.drag * dt));
      b.pos.addScaledVector(b.vel, dt);
      b.onGround = false;
      if (b.collideWorld) {
        const list = this.query(b.pos.x - b.r, b.pos.y - b.r, b.pos.z - b.r, b.pos.x + b.r, b.pos.y + b.r, b.pos.z + b.r, this._tmpList);
        for (let k = 0; k < list.length; k++) {
          const c = list[k];
          if (c.tag === 'trigger' || c.tag === 'nobody') continue;
          const ct = this.contacts[0];
          if (!this.sphereBox(b.pos, b.r, c, ct)) continue;
          b.pos.addScaledVector(ct.n, ct.pen);
          const vn = b.vel.dot(ct.n);
          if (vn < 0) {
            if (-vn > 3 && b.onImpact && b.lastImpact <= 0) { b.onImpact(b, -vn, ct.c); b.lastImpact = 0.08; }
            b.vel.addScaledVector(ct.n, -vn * (1 + b.bounce));
            // friction on tangential velocity
            const f = Math.max(0, 1 - b.friction * 6 * dt);
            const vy = b.vel.dot(ct.n);
            _d.copy(b.vel).addScaledVector(ct.n, -vy).multiplyScalar(f);
            b.vel.copy(_d).addScaledVector(ct.n, vy);
            // spin from rolling
            if (ct.n.y > 0.5) {
              b.spin.x = b.spin.x * 0.9 + (b.vel.z / b.r) * 0.1;
              b.spin.z = b.spin.z * 0.9 + (-b.vel.x / b.r) * 0.1;
            }
          }
          if (ct.n.y > 0.5) {
            b.onGround = true;
            if (c.conveyor) b.pos.addScaledVector(c.conveyor, dt);
            if (c.dynamic) { c.pointVelocity(b.pos, dt, _q); b.pos.addScaledVector(_q, dt); }
          }
        }
      }
      if (b.lastImpact > 0) b.lastImpact -= dt;
      if (b.onGround && b.vel.lengthSq() < 0.04 && !c_conveyor(b)) b.sleep += dt; else b.sleep = 0;
    }
    // body-body (small n)
    const n = bodies.length;
    for (let i = 0; i < n; i++) {
      const a = bodies[i];
      if (!a || !a.alive || !a.collideBodies || a.grabbed) continue;
      for (let j = i + 1; j < n; j++) {
        const b = bodies[j];
        if (!b || !b.alive || !b.collideBodies || b.grabbed) continue;
        const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, dz = b.pos.z - a.pos.z;
        const rr = a.r + b.r;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 >= rr * rr || d2 < 1e-8) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d, ny = dy / d, nz = dz / d;
        const pen = rr - d;
        const ta = b.mass / (a.mass + b.mass), tb = 1 - ta;
        a.pos.x -= nx * pen * ta; a.pos.y -= ny * pen * ta; a.pos.z -= nz * pen * ta;
        b.pos.x += nx * pen * tb; b.pos.y += ny * pen * tb; b.pos.z += nz * pen * tb;
        const rv = (b.vel.x - a.vel.x) * nx + (b.vel.y - a.vel.y) * ny + (b.vel.z - a.vel.z) * nz;
        if (rv < 0) {
          const imp = -(1.3) * rv / (1 / a.mass + 1 / b.mass);
          a.vel.x -= nx * imp / a.mass; a.vel.y -= ny * imp / a.mass; a.vel.z -= nz * imp / a.mass;
          b.vel.x += nx * imp / b.mass; b.vel.y += ny * imp / b.mass; b.vel.z += nz * imp / b.mass;
          a.sleep = 0; b.sleep = 0;
          if (-rv > 6) {
            if (a.onImpact && a.lastImpact <= 0) { a.onImpact(a, -rv, null, b); a.lastImpact = 0.08; }
            if (b.onImpact && b.lastImpact <= 0) { b.onImpact(b, -rv, null, a); b.lastImpact = 0.08; }
          }
        }
      }
    }
    // sync meshes
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (!b.alive || !b.mesh) continue;
      b.mesh.position.copy(b.pos);
      if (b.box && b.onGround && b.spin.lengthSq() < 4) {
        // settle to nearest flat orientation
        settleFlat(b.mesh, dt * 8);
        b.spin.multiplyScalar(0.8);
      } else if (b.spin.lengthSq() > 1e-6) {
        _eul.set(b.spin.x * dt, b.spin.y * dt, b.spin.z * dt);
        _quat.setFromEuler(_eul);
        b.mesh.quaternion.premultiply(_quat);
      }
    }
  }
}

function c_conveyor() { return false; }

const _qa = new THREE.Quaternion();
const _axes = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
const _tmpV = new THREE.Vector3();
function settleFlat(mesh, t) {
  // find which local axis is most vertical and rotate so it aligns with world up
  let best = 0, bestDot = 0, bestSign = 1;
  for (let i = 0; i < 3; i++) {
    _tmpV.copy(_axes[i]).applyQuaternion(mesh.quaternion);
    const d = _tmpV.y;
    if (Math.abs(d) > Math.abs(bestDot)) { bestDot = d; best = i; bestSign = Math.sign(d); }
  }
  _tmpV.copy(_axes[best]).applyQuaternion(mesh.quaternion).multiplyScalar(bestSign);
  _qa.setFromUnitVectors(_tmpV, UP);
  const target = _qa.multiply(mesh.quaternion);
  mesh.quaternion.slerp(target, Math.min(1, t));
}

export { UP };
