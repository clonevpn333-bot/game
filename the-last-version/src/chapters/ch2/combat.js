// Naval combat: tracer projectiles, ATLAS patrol RIB AI, and ship turrets.
import * as THREE from 'three';
import { buildRIB } from '../../vehicles/boats.js';
import { BoatBody } from '../../vehicles/boatPhysics.js';
import { waterHeight } from './ocean.js';
import { EngineSound } from '../../audio/audio.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

const TRACER_VS = `
attribute vec3 aA, aB; attribute vec4 aC;
varying vec2 vP; varying float vL, vW, vT; varying vec4 vC;
void main(){
  mat4 vp = projectionMatrix * viewMatrix;
  vec4 ca = vp * vec4(aA, 1.0), cb = vp * vec4(aB, 1.0);
  // clip the segment to the near plane so a round flying at the camera never flips
  if (ca.w < 0.15) ca = mix(ca, cb, clamp((0.15 - ca.w) / (cb.w - ca.w), 0.0, 1.0));
  if (cb.w < 0.15) cb = mix(cb, ca, clamp((0.15 - cb.w) / (ca.w - cb.w), 0.0, 1.0));
  float aspect = projectionMatrix[1][1] / projectionMatrix[0][0];
  vec2 sa = ca.xy / ca.w * vec2(aspect, 1.0), sb = cb.xy / cb.w * vec2(aspect, 1.0);
  vec2 d = sb - sa; float L = length(d);
  vec2 dir = L > 1e-5 ? d / L : vec2(0.0, 1.0), nrm = vec2(-dir.y, dir.x);
  // world width at the head, never thinner than ~2 px; a little wider for a round coming at you
  float w = max(aC.w * 0.5 * projectionMatrix[1][1] / cb.w, 0.0028);
  float along = mix(-w, L + w, position.y);
  vec2 sp = sa + dir * along + nrm * position.x * w;
  vec4 c = mix(ca, cb, clamp(along / max(L, 1e-5), 0.0, 1.0));
  gl_Position = vec4(sp / vec2(aspect, 1.0) * c.w, c.z, c.w);
  vP = vec2(along, position.x * w); vL = L; vW = w; vT = clamp(along / max(L, 1e-5), 0.0, 1.0); vC = aC;
}`;
const TRACER_FS = `
varying vec2 vP; varying float vL, vW, vT; varying vec4 vC;
void main(){
  // distance to the segment in units of its half-width: a soft capsule
  float dx = max(0.0, max(-vP.x, vP.x - vL));
  float r = length(vec2(dx, vP.y)) / vW;
  float core = exp(-r * r * 3.0);
  float a = core * mix(0.12, 1.0, vT * vT);
  if (a < 0.003) discard;
  gl_FragColor = vec4(vC.rgb * a, 1.0);
}`;

export class Tracers {
  constructor(scene, max = 300) {
    this.max = max;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, 0, 1, 0, 0, -1, 1, 0, 1, 1, 0], 3));
    g.setIndex([0, 1, 2, 2, 1, 3]);
    this.aA = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3); this.aA.setUsage(THREE.DynamicDrawUsage);
    this.aB = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3); this.aB.setUsage(THREE.DynamicDrawUsage);
    this.aC = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.aC.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aA', this.aA); g.setAttribute('aB', this.aB); g.setAttribute('aC', this.aC);
    g.instanceCount = 0;
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({ vertexShader: TRACER_VS, fragmentShader: TRACER_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 5;
    scene.add(this.mesh);
    this.items = [];
  }
  /** Instant visual streak for hitscan shots (muzzle → impact), fades in ~70 ms. */
  streak(from, to) { this.items.push({ p: to.clone(), prev: from.clone(), v: new THREE.Vector3(), life: 0.07, streak: true }); }
  fire(from, dir, { speed = 420, enemy = false, damage = 0.06, life = 1.6, spread = 0.004 } = {}) {
    const d = dir.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread)).normalize();
    this.items.push({ p: from.clone(), v: d.multiplyScalar(speed), life, enemy, damage, prev: from.clone(), from: from.clone() });
    if (this.items.length > this.max) this.items.shift();
  }
  _put(n, tail, head, r, g, b, width) {
    this.aA.array.set([tail.x, tail.y, tail.z], n * 3); this.aB.array.set([head.x, head.y, head.z], n * 3);
    this.aC.array.set([r, g, b, width], n * 4);
  }
  /** targets: [{pos, radius, hit(p, dmg)}] for each side. onWater(p) for splashes. */
  update(dt, playerTargets, enemyTargets, onWater, near = null) {
    let n = 0;
    const tail = new THREE.Vector3(), head = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      if (it.streak) {
        it.life -= dt; if (it.life <= 0) { this.items.splice(i, 1); continue; }
        d.copy(it.p).sub(it.prev); const L = d.length(), k = it.life / 0.07;
        // the bright head travels from the muzzle to the impact over the streak's life
        head.copy(it.prev).addScaledVector(d, 1 - k * 0.6);
        tail.copy(head).addScaledVector(d.normalize(), -Math.min(L * (1 - k * 0.6), 16));
        if (n < this.max) this._put(n++, tail, head, 3.2, 2.4, 1.2, 0.09);
        continue;
      }
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
      // enemy guns sit low on small boats: let their rounds skim through crest tops instead of every
      // wave between you and them eating the burst
      if (!dead && it.p.y < waterHeight(it.p.x, it.p.z) - (it.enemy ? 1.3 : 0.2)) { onWater?.(it.p); dead = true; }
      // enemy rounds passing close to the listener snap and whine past
      if (!dead && near && it.enemy && !it.whizzed) {
        const ab = it.p.clone().sub(it.prev), ap = near.pos.clone().sub(it.prev);
        const tt = clamp(ap.dot(ab) / Math.max(ab.lengthSq(), 1e-6), 0, 1), c = it.prev.clone().addScaledVector(ab, tt);
        if (c.distanceTo(near.pos) < 6) { it.whizzed = true; near.cb(c); }
      }
      if (dead) { this.items.splice(i, 1); continue; }
      const sp = it.v.length(), len = Math.min(sp * 0.03, 9, it.p.distanceTo(it.from));
      head.copy(it.p); tail.copy(it.p).addScaledVector(it.v, -len / Math.max(sp, 1e-3));
      if (n < this.max) {
        if (it.enemy) this._put(n++, tail, head, 3.4, 0.9, 0.55, 0.16);
        else this._put(n++, tail, head, 3.2, 2.4, 1.2, 0.09);
      }
    }
    this.geo.instanceCount = n;
    this.aA.needsUpdate = this.aB.needsUpdate = this.aC.needsUpdate = true;
  }
  clear() { this.items.length = 0; this.geo.instanceCount = 0; }
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
      b.sink = this.sinkT * 0.5;
      b.update(dt, t);
      if (Math.random() < 0.5) this.fx.smoke(b.pos.clone().add(new THREE.Vector3(0, 1.5, 0)), true);
      if (this.sinkT > 7) { this.alive = false; this.mesh.visible = false; b.sink = 0; }
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
    const lead = pp.clone().addScaledVector(player.vel, dist / 260).add(new THREE.Vector3(0, 1.4, 0));
    const localT = gun.group.worldToLocal(lead.clone());
    gun.yaw.rotation.y = Math.atan2(localT.x, localT.z);
    gun.pitch.rotation.x = -Math.atan2(localT.y - 1, Math.hypot(localT.x, localT.z));
    this.fireT -= dt;
    if (this.parts.gunner > 0 && this.state !== 'flee' && dist < 120) {
      if (this.fireT <= 0) { this.burst = 6 + Math.floor(Math.random() * 6); this.fireT = 1.6 + Math.random() * 1.4; }
      if (this.burst > 0 && Math.random() < dt * 12) {
        this.burst--;
        const mz = gun.muzzles[this.burst % 2].getWorldPosition(new THREE.Vector3());
        const dir = lead.clone().sub(mz).normalize();
        tracers.fire(mz, dir, { enemy: true, speed: 260, damage: 0.026, spread: 0.03 + dist * 0.0003 });
        this.audio.gunshotFar(mz);
        this.fx.muzzle(mz, dir);
      }
    }
    // strobe
    this.mesh.userData.strobe.material.emissiveIntensity = Math.sin(t * 20) > 0.6 ? 5 : 0;
    this.engine?.update(1500 + b.speed * 160, b.input.throttle, b.pos);
  }
  dispose() { this.engine?.stop(); }
}
