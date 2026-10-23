// Thin wrapper over Rapier: static/dynamic/kinematic bodies, metadata, queries.
import RAPIER from 'rapier';
import * as THREE from 'three';

export const G = {
  STATIC: 0x0001, PLAYER: 0x0002, PROP: 0x0004, ENEMY: 0x0008, NPC: 0x0010, SENSOR: 0x0020, NOCAM: 0x0040, PLATFORM: 0x0080,
};
export const groups = (member, filter) => ((member & 0xffff) << 16) | (filter & 0xffff);
const ALL = 0xffff;

export async function initPhysics() { await RAPIER.init(); return RAPIER; }

export class Physics {
  constructor() {
    this.R = RAPIER;
    this.world = new RAPIER.World({ x: 0, y: -15, z: 0 });
    this.world.timestep = 1 / 60;
    this.meta = new Map();     // collider handle -> metadata
    this.bodies = [];          // dynamic bodies with visual meshes { body, mesh }
    this.acc = 0;
    this.kinematics = [];      // { body, obj } synced from Object3D each step
    this.eventQueue = new RAPIER.EventQueue(true);
    this.contactHandlers = new Map();
  }

  setMeta(collider, m) { this.meta.set(collider.handle, m); return collider; }
  getMeta(collider) { return collider ? this.meta.get(collider.handle) : null; }

  fixed(pos = { x: 0, y: 0, z: 0 }, quat = null) {
    const d = RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z);
    if (quat) d.setRotation(quat);
    return this.world.createRigidBody(d);
  }
  addBox(pos, half, quat = null, meta = {}, body = null) {
    const b = body || this.fixed();
    const d = RAPIER.ColliderDesc.cuboid(half.x, half.y, half.z).setTranslation(pos.x, pos.y, pos.z).setFriction(meta.friction ?? 0.8);
    if (quat) d.setRotation(quat);
    d.setCollisionGroups(groups(meta.group ?? G.STATIC, ALL));
    const c = this.world.createCollider(d, b);
    return this.setMeta(c, { kind: 'static', surface: 'metal', ...meta });
  }
  addCylinder(pos, halfH, r, quat = null, meta = {}) {
    const b = this.fixed();
    const d = RAPIER.ColliderDesc.cylinder(halfH, r).setTranslation(pos.x, pos.y, pos.z);
    if (quat) d.setRotation(quat);
    d.setCollisionGroups(groups(meta.group ?? G.STATIC, ALL));
    return this.setMeta(this.world.createCollider(d, b), { kind: 'static', surface: 'metal', ...meta });
  }
  addTrimesh(geometry, matrix, meta = {}) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    g.applyMatrix4(matrix);
    const pos = g.attributes.position.array;
    const idx = new Uint32Array(pos.length / 3); for (let i = 0; i < idx.length; i++) idx[i] = i;
    const d = RAPIER.ColliderDesc.trimesh(new Float32Array(pos), idx).setCollisionGroups(groups(meta.group ?? G.STATIC, ALL));
    return this.setMeta(this.world.createCollider(d, this.fixed()), { kind: 'static', surface: 'metal', ...meta });
  }

  // Dynamic body following a mesh. Returns the body.
  addDynamic(mesh, shape, opts = {}) {
    const p = mesh.position, q = mesh.quaternion;
    const d = RAPIER.RigidBodyDesc.dynamic().setTranslation(p.x, p.y, p.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
      .setLinearDamping(opts.linDamp ?? 0.05).setAngularDamping(opts.angDamp ?? 0.2).setCcdEnabled(!!opts.ccd);
    const body = this.world.createRigidBody(d);
    let cd;
    if (shape.type === 'box') cd = RAPIER.ColliderDesc.cuboid(shape.hx, shape.hy, shape.hz);
    else if (shape.type === 'ball') cd = RAPIER.ColliderDesc.ball(shape.r);
    else if (shape.type === 'cyl') cd = RAPIER.ColliderDesc.cylinder(shape.hh, shape.r);
    else if (shape.type === 'capsule') cd = RAPIER.ColliderDesc.capsule(shape.hh, shape.r);
    cd.setDensity(opts.density ?? 1).setFriction(opts.friction ?? 0.6).setRestitution(opts.restitution ?? 0.1)
      .setCollisionGroups(groups(opts.group ?? G.PROP, opts.filter ?? ALL));
    if (opts.events) cd.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS | RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS);
    const col = this.world.createCollider(cd, body);
    this.setMeta(col, { kind: 'prop', mesh, body, surface: opts.surface ?? 'metal', tether: opts.tether ?? true, mass: body.mass(), ...opts.meta });
    const entry = { body, mesh, col, offset: opts.offset || null };
    this.bodies.push(entry);
    mesh.userData.body = body; mesh.userData.collider = col;
    return body;
  }
  removeDynamic(body) {
    const i = this.bodies.findIndex(b => b.body === body);
    if (i >= 0) { const e = this.bodies[i]; this.meta.delete(e.col.handle); this.bodies.splice(i, 1); }
    this.world.removeRigidBody(body);
  }

  // Kinematic body driven by an Object3D (position/quaternion in city frame).
  addKinematic(obj, colliders, meta = {}) {
    obj.updateMatrixWorld(true);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    obj.matrixWorld.decompose(p, q, s);
    const body = this.world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(p.x, p.y, p.z).setRotation(q));
    const cols = colliders.map(c => {
      let d;
      if (c.type === 'box') d = RAPIER.ColliderDesc.cuboid(c.hx, c.hy, c.hz);
      else if (c.type === 'cyl') d = RAPIER.ColliderDesc.cylinder(c.hh, c.r);
      else if (c.type === 'ball') d = RAPIER.ColliderDesc.ball(c.r);
      if (c.pos) d.setTranslation(c.pos.x, c.pos.y, c.pos.z);
      if (c.rot) d.setRotation(c.rot);
      d.setCollisionGroups(groups(c.group ?? G.PLATFORM, ALL)).setFriction(1);
      const col = this.world.createCollider(d, body);
      this.setMeta(col, { kind: 'platform', obj, body, surface: 'metal', ...meta, ...(c.meta || {}) });
      return col;
    });
    const k = { body, obj, cols, prev: new THREE.Matrix4().copy(obj.matrixWorld), cur: new THREE.Matrix4().copy(obj.matrixWorld), enabled: true };
    this.kinematics.push(k);
    obj.userData.kinematic = k;
    return k;
  }

  syncKinematics() {
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    for (const k of this.kinematics) {
      k.obj.updateMatrixWorld(true);
      k.prev.copy(k.cur); k.cur.copy(k.obj.matrixWorld);
      k.cur.decompose(p, q, s);
      k.body.setNextKinematicTranslation({ x: p.x, y: p.y, z: p.z });
      k.body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
    }
  }

  step(dt, onStep) {
    this.acc += Math.min(dt, 0.1);
    let n = 0;
    while (this.acc >= this.world.timestep && n < 4) {
      onStep?.(this.world.timestep);
      this.world.step(this.eventQueue);
      this.eventQueue.drainCollisionEvents((h1, h2, started) => {
        if (!started) return;
        const f1 = this.contactHandlers.get(h1), f2 = this.contactHandlers.get(h2);
        if (f1) f1(h2); if (f2) f2(h1);
      });
      this.acc -= this.world.timestep; n++;
    }
    if (n === 4) this.acc = 0;
    // sync visuals
    for (const e of this.bodies) {
      if (e.body.isSleeping()) continue;
      const t = e.body.translation(), r = e.body.rotation();
      e.mesh.position.set(t.x, t.y, t.z); e.mesh.quaternion.set(r.x, r.y, r.z, r.w);
    }
    return n;
  }
  onContact(collider, fn) { this.contactHandlers.set(collider.handle, fn); }

  // Raycast in city frame. Returns { point, normal, toi, collider, meta } or null.
  raycast(origin, dir, maxToi = 100, mask = ALL, exclude = null, solid = true) {
    const ray = new RAPIER.Ray({ x: origin.x, y: origin.y, z: origin.z }, { x: dir.x, y: dir.y, z: dir.z });
    const hit = this.world.castRayAndGetNormal(ray, maxToi, solid, undefined, groups(ALL, mask), exclude || undefined, exclude ? undefined : undefined);
    if (!hit) return null;
    const p = ray.pointAt(hit.timeOfImpact);
    return { point: new THREE.Vector3(p.x, p.y, p.z), normal: new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z), toi: hit.timeOfImpact, collider: hit.collider, meta: this.getMeta(hit.collider) };
  }
  // raycast with predicate excluding colliders
  raycastFilter(origin, dir, maxToi, mask, pred) {
    const ray = new RAPIER.Ray({ x: origin.x, y: origin.y, z: origin.z }, { x: dir.x, y: dir.y, z: dir.z });
    const hit = this.world.castRayAndGetNormal(ray, maxToi, true, undefined, groups(ALL, mask), undefined, undefined, c => pred(c, this.getMeta(c)));
    if (!hit) return null;
    const p = ray.pointAt(hit.timeOfImpact);
    return { point: new THREE.Vector3(p.x, p.y, p.z), normal: new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z), toi: hit.timeOfImpact, collider: hit.collider, meta: this.getMeta(hit.collider) };
  }
  sphereOverlap(center, r, mask, fn) {
    const shape = new RAPIER.Ball(r);
    this.world.intersectionsWithShape({ x: center.x, y: center.y, z: center.z }, { x: 0, y: 0, z: 0, w: 1 }, shape, c => { fn(c, this.getMeta(c)); return true; }, undefined, groups(ALL, mask));
  }
}
