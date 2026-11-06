// Naval combat: tracer projectiles, ATLAS patrol RIB AI, and ship turrets.
import * as THREE from 'three';
import { buildRIB } from '../../vehicles/boats.js';
import { BoatBody } from '../../vehicles/boatPhysics.js';
import { waterHeight } from './ocean.js';
import { EngineSound } from '../../audio/audio.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export class Tracers {
  constructor(scene, max = 300) {
    this.max = max;
    const geo = new THREE.BoxGeometry(0.06, 0.06, 1); geo.translate(0, 0, -0.5);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffd28a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    this.matEnemy = new THREE.MeshBasicMaterial({ color: 0xff6a5a, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(geo, this.mat, max); this.mesh.frustumCulled = false; this.mesh.count = 0;
    this.meshE = new THREE.InstancedMesh(geo, this.matEnemy, max); this.meshE.frustumCulled = false; this.meshE.count = 0;
    scene.add(this.mesh, this.meshE);
    this.items = [];
  }
  fire(from, dir, { speed = 420, enemy = false, damage = 0.06, life = 1.6, spread = 0.004 } = {}) {
    const d = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread)).normalize();
    this.items.push({ p: from.clone(), v: d.multiplyScalar(speed), life, enemy, damage, prev: from.clone() });
    if (this.items.length > this.max * 2) this.items.shift();
  }
  /** targets: [{pos, radius, hit(p, dmg)}] for each side. onWater(p) for splashes. */
  update(dt, playerTargets, enemyTargets, onWater) {
    const M = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), z = new THREE.Vector3(0, 0, 1);
    let n = 0, ne = 0;
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.prev.copy(it.p);
      it.v.y -= 9.81 * dt * 0.3;
      it.p.addScaledVector(it.v, dt);
      it.life -= dt;
      let dead = it.life <= 0;
      const list = it.enemy ? playerTargets : enemyTargets;
      for (const t of list) {
        if (dead) break;
        // segment-sphere test
        const ab = it.p.clone().sub(it.prev), ap = t.pos.clone().sub(it.prev);
        const tt = clamp(ap.dot(ab) / Math.max(ab.lengthSq(), 1e-6), 0, 1);
        const c = it.prev.clone().addScaledVector(ab, tt);
        if (c.distanceTo(t.pos) < t.radius) { t.hit(c, it.damage); dead = true; }
      }
      if (!dead && it.p.y < waterHeight(it.p.x, it.p.z) - 0.2) { onWater?.(it.p); dead = true; }
      if (dead) { this.items.splice(i, 1); continue; }
      const len = Math.min(it.v.length() * 0.025, 9);
      q.setFromUnitVectors(z, it.v.clone().normalize()); s.set(1, 1, len);
      M.compose(it.p, q, s);
      if (it.enemy) this.meshE.setMatrixAt(ne++, M); else this.mesh.setMatrixAt(n++, M);
    }
    this.mesh.count = n; this.meshE.count = ne;
    this.mesh.instanceMatrix.needsUpdate = true; this.meshE.instanceMatrix.needsUpdate = true;
  }
  clear() { this.items.length = 0; this.mesh.count = this.meshE.count = 0; }
}

/** ATLAS patrol RIB: approaches, circle-strafes, fires leading bursts, breaks off when hurt. */
export class Patrol {
  constructor(scene, audio, fx) {
    this.mesh = buildRIB(); scene.add(this.mesh);
    this.body = new BoatBody(this.mesh, { mass: 1600, thrust: 21000, boost: 0, length: 7.6, beam: 2.1, radius: 3.8 });
    this.audio = audio; this.fx = fx;
    this.alive = false; this.mesh.visible = false;
    this.parts = { hull: 1, engine: 1, gunner: 1 };
    this.state = 'approach'; this.orbitDir = Math.random() < 0.5 ? 1 : -1;
    this.fireT = 0; this.burst = 0; this.sinkT = 0; this.flash = 0;
    this.engine = null;
  }
  spawn(pos, yaw) {
    this.alive = true; this.mesh.visible = true; this.sinking = false; this.sinkT = 0;
    this.parts = { hull: 1, engine: 1, gunner: 1 };
    this.body.place(pos.x, pos.z, yaw); this.state = 'approach';
    if (this.audio.ctx && !this.engine) this.engine = new EngineSound(this.audio, { cylinders: 4, positional: true, vol: 0.25, boat: true, base: 1.3 });
  }
  get hp() { return this.parts.hull; }
  hitAt(p, dmg) {
    if (!this.alive || this.sinking) return;
    // which component? stern = engine, bow = gunner, otherwise hull
    const local = this.mesh.worldToLocal(p.clone());
    let part = 'hull';
    if (local.z < -2.6) part = 'engine'; else if (local.z > 0.9 && local.y > 0.6) part = 'gunner';
    this.parts[part] = Math.max(0, this.parts[part] - dmg * (part === 'hull' ? 1 : 1.6));
    this.parts.hull = Math.max(0, this.parts.hull - dmg * 0.35);
    this.flash = 0.08;
    this.fx.spark(p);
    if (this.parts.hull <= 0) this.kill(p);
    else if (this.parts.hull < 0.4 && this.state !== 'flee') { this.state = 'flee'; this.fleeT = 3; }
  }
  kill(p) {
    this.sinking = true; this.sinkT = 0;
    this.audio.explosion(p, 0.9);
    this.fx.explode(p);
    this.engine?.stop(); this.engine = null;
  }
  update(dt, t, player, tracers, avoid) {
    if (!this.alive) return;
    const b = this.body;
    if (this.sinking) {
      this.sinkT += dt;
      b.input = { throttle: 0, brake: 0, rudder: 0, boost: 0, trim: 0 };
      b.points.forEach((pt) => (pt.y = 0.1 + this.sinkT * 0.5));
      b.update(dt, t);
      if (Math.random() < 0.5) this.fx.smoke(b.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), true);
      if (this.sinkT > 7) { this.alive = false; this.mesh.visible = false; b.points.forEach((pt) => (pt.y = 0.1)); }
      return;
    }
    const pp = player.pos;
    const to = pp.clone().sub(b.pos); to.y = 0;
    const dist = to.length();
    // pick a steering target
    let target;
    if (this.state === 'approach') { target = pp.clone().addScaledVector(player.vel, 1.5); if (dist < 70) this.state = 'strafe'; }
    if (this.state === 'strafe') {
      // orbit the player at ~45 m
      const tangent = new THREE.Vector3(-to.z, 0, to.x).normalize().multiplyScalar(this.orbitDir);
      const radial = to.clone().normalize().multiplyScalar(dist - 45);
      target = b.pos.clone().add(tangent.multiplyScalar(30)).add(radial);
      if (dist > 110) this.state = 'approach';
      if (Math.random() < dt * 0.05) this.orbitDir *= -1;
    }
    if (this.state === 'flee') { target = b.pos.clone().sub(to.clone().normalize().multiplyScalar(60)); this.fleeT -= dt; if (this.fleeT < 0) this.state = 'approach'; }
    // avoid towers
    for (const c of avoid) {
      const cx = clamp(b.pos.x, c.minX, c.maxX), cz = clamp(b.pos.z, c.minZ, c.maxZ);
      const dd = Math.hypot(b.pos.x - cx, b.pos.z - cz);
      if (dd < 18) target.add(new THREE.Vector3(b.pos.x - cx, 0, b.pos.z - cz).normalize().multiplyScalar((18 - dd) * 3));
    }
    const want = Math.atan2(target.x - b.pos.x, target.z - b.pos.z);
    let d = want - b.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
    const engineOK = this.parts.engine > 0;
    b.input = { throttle: engineOK ? (Math.abs(d) > 1.4 ? 0.4 : 0.95) : 0.15, brake: 0, rudder: clamp(d * 2, -1, 1), boost: 0, trim: 0 };
    b.update(dt, t);
    for (const c of avoid) b.collideBox(c);
    if (this.parts.engine <= 0 && Math.random() < 0.3) this.fx.smoke(b.pos.clone().add(b.forward.multiplyScalar(-3.4)).add(new THREE.Vector3(0, 1.2, 0)), true);
    // gun: aim with lead, fire bursts when in the arc
    const gun = this.mesh.userData.gun;
    const lead = pp.clone().addScaledVector(player.vel, dist / 260).add(new THREE.Vector3(0, 1, 0));
    const localT = gun.group.worldToLocal(lead.clone());
    gun.yaw.rotation.y = Math.atan2(localT.x, localT.z);
    gun.pitch.rotation.x = -Math.atan2(localT.y - 1, Math.hypot(localT.x, localT.z));
    this.fireT -= dt;
    if (this.parts.gunner > 0 && this.state !== 'flee' && dist < 120) {
      if (this.fireT <= 0) { this.burst = 6 + Math.floor(Math.random() * 6); this.fireT = 2.2 + Math.random() * 1.8; }
      if (this.burst > 0 && Math.random() < dt * 12) {
        this.burst--;
        const mz = gun.muzzles[this.burst % 2].getWorldPosition(new THREE.Vector3());
        const dir = lead.clone().sub(mz).normalize();
        tracers.fire(mz, dir, { enemy: true, speed: 260, damage: 0.022, spread: 0.035 + dist * 0.0004 });
        this.audio.gunshot(mz, false);
        this.fx.muzzle(mz, dir);
      }
    }
    // strobe
    this.mesh.userData.strobe.material.emissiveIntensity = Math.sin(t * 20) > 0.6 ? 5 : 0;
    this.engine?.update(1500 + b.speed * 160, b.input.throttle, b.pos);
  }
  dispose() { this.engine?.stop(); }
}
