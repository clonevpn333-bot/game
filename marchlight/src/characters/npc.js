// Actors (named characters & ambient citizens) and the crowd system that sells
// the illusion of a living city: routines, lanes, barks, reactions, LOD.
import * as THREE from 'three';
import { buildCharacter, randomLook } from './rig.js';
import { Animator } from './anim.js';
import { G, groups } from '../core/physics.js';
import { clamp, damp, dampAngle, rng, sleep } from '../core/util.js';

const _v = new THREE.Vector3();

export class Actor {
  constructor(game, { name = null, look = {}, pos = new THREE.Vector3(), yaw = 0, collide = false, parent = null } = {}) {
    this.game = game; this.name = name;
    this.char = buildCharacter(look); this.anim = new Animator(this.char);
    this.pos = pos.clone(); this.yaw = yaw; this.vel = new THREE.Vector3();
    this.target = null; this.path = null; this.speed = 1.4; this.arrive = null;
    this.parent = parent || game.engine.cityRoot; this.parent.add(this.char.group);
    this.visible = true; this.lodT = 0; this.cull = 95;
    this.faceTarget = null; this.lookTargetFn = null;
    this.mount = null; // Object3D to ride (tram seats etc.)
    this.barkCd = 0; this.react = null;
    if (collide) this.makeCollider();
    this.sync();
  }
  makeCollider() {
    const P = this.game.physics, R = P.R;
    this.body = P.world.createRigidBody(R.RigidBodyDesc.kinematicPositionBased().setTranslation(this.pos.x, this.pos.y + 0.9, this.pos.z));
    this.collider = P.world.createCollider(R.ColliderDesc.capsule(0.55, 0.28).setCollisionGroups(groups(G.NPC, G.PLAYER)), this.body);
    P.setMeta(this.collider, { kind: 'npc', actor: this, noBullet: true });
  }
  setLook(look) { this.char.group.removeFromParent(); this.char = buildCharacter(look); this.anim = new Animator(this.char); this.parent.add(this.char.group); this.sync(); }
  get head() { return this.pos.clone().add(new THREE.Vector3(0, 1.62 * this.char.group.scale.y, 0)); }

  place(p, yaw) { this.pos.copy(p); if (yaw !== undefined) this.yaw = yaw; this.target = null; this.path = null; this.sync(); return this; }
  goTo(p, speed = 1.4) {
    this.target = p.clone(); this.speed = speed; this.path = null;
    return new Promise(res => { this.arrive = res; });
  }
  follow(points, speed = 1.4, loop = false) {
    this.path = points.map(p => p.clone()); this.pathI = 0; this.loop = loop; this.speed = speed; this.target = this.path[0];
    return new Promise(res => { this.arrive = res; });
  }
  stop() { this.target = null; this.path = null; this.vel.set(0, 0, 0); const a = this.arrive; this.arrive = null; a?.(); }
  face(t) { this.faceTarget = t; }
  lookAt(t) { this.anim.lookTarget = t ? (t.isVector3 ? t : null) : null; this.lookTargetFn = t && !t.isVector3 ? t : null; }
  lookAtPlayer() { this.lookTargetFn = () => this.game.player.headPos.clone(); }
  lookAtSpeaker() { /* conversations set explicit looks */ }
  activity(name) { if (!name) { this.anim.setMode('loco'); this.anim.activity = null; return; } this.anim.setMode('activity'); this.anim.activity = name; }
  pose(mode, param) { this.anim.setMode(mode, param); }

  update(dt) {
    const g = this.game;
    // LOD: distance culling
    const d = this.pos.distanceTo(g.engine.camera.position);
    const vis = d < this.cull && (!this.hidden);
    if (vis !== this.visible) { this.visible = vis; this.char.group.visible = vis; }
    // movement
    if (this.mount) {
      this.mount.updateMatrixWorld(); this.pos.setFromMatrixPosition(this.mount.matrixWorld);
      const e = new THREE.Euler().setFromRotationMatrix(this.mount.matrixWorld, 'YXZ'); this.yaw = e.y + (this.mountYaw || 0);
      this.anim.speed = 0;
    } else if (this.target) {
      const to = _v.copy(this.target).sub(this.pos); to.y = 0; const dist = to.length();
      if (dist < 0.15) {
        this.pos.x = this.target.x; this.pos.z = this.target.z;
        if (this.path && this.pathI < this.path.length - 1) { this.pathI++; this.target = this.path[this.pathI]; }
        else if (this.path && this.loop) { this.pathI = 0; this.target = this.path[0]; }
        else { this.target = null; this.path = null; this.vel.set(0, 0, 0); const a = this.arrive; this.arrive = null; a?.(); }
      } else {
        to.divideScalar(dist);
        const sp = Math.min(this.speed, dist * 3 + 0.3);
        // soft avoidance of the player
        const pp = g.player.pos; const ap = _v.clone().set(this.pos.x - pp.x, 0, this.pos.z - pp.z); const ad = ap.length();
        if (ad < 1.3 && ad > 0.01) to.addScaledVector(ap.normalize(), (1.3 - ad) * 1.5).normalize();
        this.vel.x = damp(this.vel.x, to.x * sp, 8, dt); this.vel.z = damp(this.vel.z, to.z * sp, 8, dt);
        this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
        if (this.target.y !== undefined) this.pos.y = damp(this.pos.y, this.target.y, 6, dt);
        this.yaw = dampAngle(this.yaw, Math.atan2(this.vel.x, this.vel.z), 8, dt);
      }
      this.anim.speed = Math.hypot(this.vel.x, this.vel.z);
    } else {
      this.anim.speed = damp(this.anim.speed, 0, 10, dt);
      if (this.faceTarget) {
        const ft = this.faceTarget.isVector3 ? this.faceTarget : (this.faceTarget.pos || this.faceTarget());
        const to = _v.copy(ft).sub(this.pos);
        if (to.lengthSq() > 0.01) this.yaw = dampAngle(this.yaw, Math.atan2(to.x, to.z), 5, dt);
      }
    }
    if (this.lookTargetFn) this.anim.lookTarget = this.lookTargetFn();
    this.barkCd -= dt;
    this.sync();
    if (this.visible) {
      // cheaper animation far away
      this.lodT += dt;
      const step = d > 45 ? 0.1 : d > 25 ? 0.05 : 0;
      if (this.lodT >= step) { this.anim.update(this.lodT); this.lodT = 0; }
      // three LODs; telephoto shots keep detail. Only nearby actors cast shadows (far ones are
      // a handful of pixels and their shadows cost more than they draw).
      const de = d * Math.min(1, g.engine.camera.fov / 50);
      this.char.setLOD?.(de < (this.lodDist ?? 9) ? 'high' : de < 24 ? 'low' : 'far');
      const cast = !this.noShadow && de < 18;
      for (const k in this.char.meshes || { high: 1 }) (this.char.meshes ? this.char.meshes[k] : this.char.mesh).castShadow = cast && k !== 'far';
    }
  }
  sync() {
    this.char.group.position.copy(this.pos); this.char.group.rotation.y = this.yaw;
    if (this.body) this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y + 0.9, z: this.pos.z });
  }
  remove() { this.char.group.removeFromParent(); if (this.body) this.game.physics.world.removeRigidBody(this.body); this.removed = true; }
}

// --------------------------------------------------------------------------- crowd
// lanes: arrays of points; spots: { pos, yaw, activity, mode }
export class Crowd {
  constructor(game) { this.game = game; this.actors = []; this.r = rng(321); this.barks = []; this.reactT = 0; }
  spawnWalker(lane, seed, opts = {}) {
    const look = randomLook(seed, opts.look);
    const t = this.r(); const i = Math.floor(t * (lane.length - 1));
    const p = lane[i].clone().lerp(lane[i + 1], this.r());
    const a = new Actor(this.game, { look, pos: p });
    a.cull = opts.cull ?? 80;
    a.lane = lane; a.laneDir = this.r() < 0.5 ? 1 : -1; a.laneI = a.laneDir > 0 ? i + 1 : i;
    a.offset = (this.r() - 0.5) * (opts.width ?? 2.5);
    a.speed = 1.05 + this.r() * 0.5; a.walker = true; a.pauseT = 0;
    a.barks = opts.barks;
    this.nextLaneTarget(a);
    this.actors.push(a); return a;
  }
  nextLaneTarget(a) {
    const L = a.lane;
    if (a.laneI >= L.length) { a.laneDir = -1; a.laneI = L.length - 2; }
    if (a.laneI < 0) { a.laneDir = 1; a.laneI = 1; }
    const p = L[a.laneI].clone();
    const next = L[Math.min(L.length - 1, Math.max(0, a.laneI + a.laneDir))] || p;
    const dir = next.clone().sub(p).setY(0); if (dir.lengthSq() < 1e-4) dir.set(1, 0, 0);
    dir.normalize(); p.x += -dir.z * a.offset; p.z += dir.x * a.offset;
    a.target = p; a.laneI += a.laneDir;
  }
  spawnSpot(spot, seed, opts = {}) {
    const a = new Actor(this.game, { look: randomLook(seed, opts.look), pos: spot.pos, yaw: spot.yaw ?? 0 });
    a.cull = opts.cull ?? 80;
    if (spot.mode) a.pose(spot.mode, spot.param); else if (spot.activity) a.activity(spot.activity);
    a.barks = opts.barks || spot.barks; a.spot = spot;
    this.actors.push(a); return a;
  }
  clear() { this.actors.forEach(a => a.remove()); this.actors = []; }
  update(dt) {
    const g = this.game, p = g.player;
    for (const a of this.actors) {
      if (a.walker && !a.target && !a.frozen) {
        a.pauseT -= dt;
        if (a.pauseT <= 0) { if (this.r() < 0.12) { a.pauseT = 1.5 + this.r() * 4; a.anim.activity = this.r() < 0.5 ? 'phone' : 'watch'; a.anim.setMode('activity'); } else { a.anim.setMode('loco'); this.nextLaneTarget(a); } }
      }
      if (a.frozen) { a.target = null; }
      a.update(dt);
      // greet / look at the player when close
      const d = a.pos.distanceTo(p.pos);
      if (d < 4.5 && !a.lookTargetFn && !a.frozen) { a.anim.lookTarget = p.headPos.clone(); }
      else if (!a.lookTargetFn && d >= 4.5) a.anim.lookTarget = null;
      if (d < 3.2 && a.barks && a.barkCd <= 0 && g.time - (this.lastBark || 0) > 6 && !g.director.active) {
        const line = a.barks[Math.floor(this.r() * a.barks.length)];
        g.dialogue.bark(line[0] || 'VENDOR', line[1], 3, a); a.barkCd = 30; this.lastBark = g.time;
      }
    }
  }
}
