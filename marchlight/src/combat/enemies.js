// Scavenger machines that strip the Marchers' hulls.
//  GNAT    — flying cutter drone. Strafes, dodges when aimed at, telegraphs bolt bursts.
//  LEECH   — clamp-crawler. Cuts cables when unaware; scuttles and lunges. Armored front.
//  SHEARER — heavy cutter rig. Telegraphed charges; capture its charge with the tether.
import * as THREE from 'three';
import { G } from '../core/physics.js';
import { clamp, damp, dampAngle, lerp, rng } from '../core/util.js';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3();
const R = rng(77);
const DOWN = new THREE.Vector3(0, -1, 0);

function mat(c, o = {}) { return new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.6, ...o }); }
function glow(c, i = 3) { return new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i) }); }

// ------------------------------------------------------------------ models
function gnatModel() {
  const g = new THREE.Group();
  const hull = mat(0x4a4f55), dark = mat(0x1f2226), paint = mat(0x8a2a22, { roughness: 0.7, metalness: 0.2 }), rust = mat(0x6a4a30, { roughness: 0.9, metalness: 0.3 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), hull); body.scale.set(1.2, 0.7, 1.4); body.castShadow = true; g.add(body);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.4), paint); plate.position.set(0.05, 0.17, -0.05); plate.rotation.z = 0.15; g.add(plate);
  const plate2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.25), rust); plate2.position.set(-0.12, 0.15, 0.1); plate2.rotation.set(0.1, 0.4, -0.2); g.add(plate2);
  const eyeHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.12, 14), dark); eyeHousing.rotation.x = Math.PI / 2; eyeHousing.position.set(0, -0.02, 0.36); g.add(eyeHousing);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), glow(0xff5a2a, 3)); eye.position.set(0, -0.02, 0.42); g.add(eye);
  const rotors = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.06), dark); arm.position.set(Math.cos(a) * 0.3, 0.05, Math.sin(a) * 0.3); arm.rotation.y = -a; g.add(arm);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 10), hull); hub.position.set(Math.cos(a) * 0.52, 0.08, Math.sin(a) * 0.52); g.add(hub);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 6, 20), dark); ring.rotation.x = Math.PI / 2; ring.position.copy(hub.position); g.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.19, 20), new THREE.MeshBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    disc.rotation.x = -Math.PI / 2; disc.position.copy(hub.position).add(new THREE.Vector3(0, 0.03, 0)); g.add(disc);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.008, 0.035), dark); blade.position.copy(disc.position); g.add(blade); rotors.push(blade);
  }
  const cutter = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 8), dark); cutter.rotation.x = Math.PI / 2 + 0.4; cutter.position.set(0, -0.18, 0.2); g.add(cutter);
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.3, 4), dark); ant.position.set(-0.1, 0.3, -0.2); ant.rotation.z = 0.3; g.add(ant);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), glow(0xff3020, 4)); tip.position.set(-0.145, 0.45, -0.2); g.add(tip);
  g.userData = { eye, rotors, tip };
  return g;
}
function leechModel() {
  const g = new THREE.Group();
  const shell = mat(0x3c4146, { roughness: 0.4 }), dark = mat(0x1a1c1f), rust = mat(0x7a4f2e, { roughness: 0.85, metalness: 0.3 }), yel = mat(0xb8902a, { roughness: 0.6, metalness: 0.3 });
  const segs = [];
  [[0, 0.35, 0.5, shell], [0, 0.32, 0.0, rust], [0, 0.3, -0.45, shell]].forEach(([x, y, z, m], i) => {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.32 - i * 0.03, 14, 10), m); s.scale.set(1.15, 0.55, 1.0); s.position.set(x, y, z); s.castShadow = true; g.add(s); segs.push(s);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.08), yel); ridge.position.set(x, y + 0.17, z); g.add(ridge);
  });
  const canister = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.28, 12), glow(0xa8ff40, 2.2)); canister.rotation.x = Math.PI / 2; canister.position.set(0, 0.42, -0.72); g.add(canister);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.05, 12), dark); cap.rotation.x = Math.PI / 2; cap.position.set(0, 0.42, -0.86); g.add(cap);
  const mands = [];
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.35), dark); m.position.set(sx * 0.12, 0.25, 0.85); m.rotation.y = -sx * 0.3; g.add(m); mands.push(m); const t = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 6), mat(0xc0c4c8, { metalness: 0.9, roughness: 0.2 })); t.rotation.x = Math.PI / 2; t.position.set(0, 0, 0.2); m.add(t); }
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), glow(0xff5020, 3)); eyes.position.set(0, 0.4, 0.82); g.add(eyes);
  const legs = [];
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? 1 : -1, row = i % 3;
    const hip = new THREE.Group(); hip.position.set(side * 0.3, 0.3, 0.4 - row * 0.45); g.add(hip);
    const upper = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.05), dark); upper.position.x = side * 0.22; hip.add(upper);
    const knee = new THREE.Group(); knee.position.x = side * 0.44; hip.add(knee);
    const lower = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.04), shell); lower.position.y = -0.2; knee.add(lower);
    const foot = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 5), dark); foot.position.y = -0.44; foot.rotation.x = Math.PI; knee.add(foot);
    legs.push({ hip, knee, side, row, phase: (i % 2) * Math.PI + row * 0.6 });
  }
  g.userData = { legs, mands, canister, eyes };
  return g;
}
// A harvest-line service crawler: six jointed legs, two climbing claws, a saw arm, and an amber
// core (the same colour as Meridian's engine) behind three armour shells that open when it's stalled.
// The serial plate says where it came from.
function serialTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 96; const x = c.getContext('2d');
  x.fillStyle = '#8a8270'; x.fillRect(0, 0, 256, 96); x.strokeStyle = '#3a362e'; x.lineWidth = 4; x.strokeRect(4, 4, 248, 88);
  x.fillStyle = '#2a2620'; x.font = '700 26px "Barlow Condensed", sans-serif'; x.fillText('MERIDIAN ENGINEERING', 16, 36);
  x.font = '600 22px "Barlow Condensed", sans-serif'; x.fillText('HARVEST SERVICE · H-7', 16, 66);
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(90,50,30,${Math.random() * 0.35})`; x.fillRect(Math.random() * 256, Math.random() * 96, 2 + Math.random() * 6, 2 + Math.random() * 4); } // rust
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function shearerModel() {
  const g = new THREE.Group(), body = new THREE.Group(); body.position.y = 1.9; g.add(body);
  const hull = mat(0x5a5248, { roughness: 0.6 }), dark = mat(0x1e1f22), paint = mat(0x8a3a22, { roughness: 0.7, metalness: 0.3 }), yel = mat(0xc8a030, { roughness: 0.6, metalness: 0.3 });
  const steel = mat(0xb0b4b8, { metalness: 0.95, roughness: 0.25 });
  const coreMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.55, 0.18).multiplyScalar(3) });
  const box = (m, w, h, d, x, y, z, parent = body) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; };
  box(hull, 2.0, 1.0, 3.0, 0, 0, 0);                         // chassis
  box(dark, 2.1, 0.25, 3.1, 0, -0.55, 0);                    // belly
  box(paint, 1.6, 0.35, 1.2, 0, 0.62, 0.9);                  // front deck
  box(hull, 1.5, 0.7, 0.9, 0, 0.5, -1.25);                   // rear power housing
  for (const sx of [-1, 1]) box(dark, 0.12, 0.5, 0.7, sx * 0.55, 0.95, -1.25);
  // jaw / plough with teeth
  const jaw = new THREE.Group(); jaw.position.set(0, -0.2, 1.55); body.add(jaw);
  box(dark, 2.2, 0.9, 0.35, 0, 0, 0.1, jaw).rotation.x = -0.3;
  for (let i = 0; i < 6; i++) { const t = box(yel, 0.14, 0.42, 0.1, -0.9 + i * 0.36, -0.42, 0.28, jaw); t.rotation.x = -0.3; }
  // eye slit and headlights
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.4, 0.15).multiplyScalar(4) })); eye.position.set(0, 0.32, 1.52); body.add(eye);
  const lights = [];
  for (const sx of [-1, 1]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.1, 10), glow(0xfff0c0, 3)); l.rotation.x = Math.PI / 2; l.position.set(sx * 0.65, 0.2, 1.52); body.add(l); lights.push(l); }
  // the core and its three armour shells
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.45, 18, 12), coreMat); core.position.set(0, 0.85, -0.2); body.add(core);
  const plates = [];
  for (const [sx, rz] of [[-1, 1], [1, -1]]) {
    const hinge = new THREE.Group(); hinge.position.set(sx * 0.62, 0.5, -0.2); body.add(hinge);
    const pl = box(paint, 0.12, 0.9, 1.3, sx * -0.05, 0.42, 0, hinge); pl.rotation.z = rz * -0.35;
    box(yel, 0.14, 0.1, 1.32, sx * -0.12, 0.82, 0, hinge);
    plates.push({ hinge, open: rz * 1.25 });
  }
  { const hinge = new THREE.Group(); hinge.position.set(0, 0.5, -0.9); body.add(hinge);
    box(hull, 1.1, 0.9, 0.12, 0, 0.42, 0.05, hinge).rotation.x = 0.3; plates.push({ hinge, open: -1.2, axis: 'x' }); }
  // serial plate on the flank (the only clue where it came from)
  const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.34), new THREE.MeshStandardMaterial({ map: serialTexture(), roughness: 0.8, metalness: 0.3 }));
  sp.position.set(-1.011, 0.05, -0.3); sp.rotation.y = -Math.PI / 2; body.add(sp);
  // climbing claws (front), each: shoulder → forearm → three hooked fingers
  const claws = [];
  for (const sx of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(sx * 1.05, 0.15, 1.05); body.add(sh);
    box(dark, 0.3, 0.3, 0.3, 0, 0, 0, sh);
    const up = box(hull, 0.22, 0.22, 1.2, 0, 0, 0.6, sh);
    const fore = new THREE.Group(); fore.position.set(0, 0, 1.2); sh.add(fore);
    box(hull, 0.18, 0.18, 1.0, 0, 0, 0.5, fore);
    const hand = new THREE.Group(); hand.position.set(0, 0, 1.0); fore.add(hand);
    const fingers = [];
    for (let k = 0; k < 3; k++) { const f = new THREE.Group(); f.rotation.z = (k - 1) * 1.6; hand.add(f); const fm = box(steel, 0.06, 0.06, 0.42, 0, 0.12, 0.18, f); fm.rotation.x = -0.6; fingers.push(f); }
    claws.push({ sh, fore, hand, fingers, sx, up });
  }
  // the saw arm
  const sawArm = new THREE.Group(); sawArm.position.set(0.7, 0.75, 0.5); body.add(sawArm);
  box(dark, 0.25, 0.25, 1.3, 0, 0, 0.55, sawArm);
  const saw = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.05, 32), steel); saw.rotation.z = Math.PI / 2; saw.position.z = 1.25; sawArm.add(saw);
  for (let i = 0; i < 16; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), dark); const a = (i / 16) * Math.PI * 2; t.position.set(0, Math.cos(a) * 0.83, Math.sin(a) * 0.83); t.rotation.x = a; saw.add(t); }
  // six jointed legs (tripod gait)
  const legs = [];
  for (const [sx, sz, grp] of [[-1, 1, 0], [1, 0, 0], [-1, -1, 0], [1, 1, 1], [-1, 0, 1], [1, -1, 1]]) {
    const hip = new THREE.Group(); hip.position.set(sx * 1.0, 1.75, sz * 1.05); g.add(hip);
    box(hull, 0.9, 0.2, 0.2, sx * 0.45, 0, 0, hip).rotation.z = sx * -0.5;
    const knee = new THREE.Group(); knee.position.set(sx * 0.82, 0.4, 0); hip.add(knee);
    box(dark, 0.18, 1.9, 0.18, sx * 0.15, -0.9, 0, knee).rotation.z = sx * 0.16;
    box(dark, 0.32, 0.18, 0.32, sx * 0.3, -1.86, 0, knee);
    legs.push({ hip, knee, sx, sz, grp });
  }
  // the kinetic shield it raises while it feeds
  const shield = new THREE.Mesh(new THREE.SphereGeometry(2.7, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.55, 0.2), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  shield.position.y = 1.9; shield.visible = false; g.add(shield);
  g.scale.setScalar(1.12);
  g.userData = { body, core, plates, claws, saw, sawArm, legs, lights, shield, eye, jaw };
  return g;
}

// ------------------------------------------------------------------ base
class Enemy {
  constructor(sys, type, pos, opts = {}) {
    this.sys = sys; this.game = sys.game; this.type = type;
    this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.yaw = opts.yaw ?? 0;
    this.state = opts.state || 'idle'; this.stateT = 0; this.alert = 0; this.aware = false;
    this.dead = false; this.stun = 0; this.tethered = false; this.falling = false;
    this.id = sys.nextId++;
    this.home = pos.clone(); this.opts = opts;
    this.seen = 0; this.lastSeen = new THREE.Vector3();
    this.flinch = 0;
  }
  get player() { return this.game.player; }
  canSee(target, range = 26, fov = 0.25) {
    const to = _v.copy(target).sub(this.pos); const d = to.length(); if (d > range) return false;
    to.divideScalar(d);
    const f = _v2.set(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    if (to.dot(f) < fov && d > 4) return false;
    const hit = this.game.physics.raycastFilter(this.pos.clone().addScaledVector(to, 0.8), to, d - 1.2, G.STATIC | G.PLATFORM, (c, m) => !m?.seeThrough);
    return !hit;
  }
  perceive(dt) {
    const p = this.player; if (p.dead) { this.aware = false; return; }
    const head = p.pos.clone().add(new THREE.Vector3(0, p.crouchS > 0.5 ? 0.9 : 1.4, 0));
    const vis = this.canSee(head, p.crouchS > 0.5 ? 16 : 26);
    if (vis) { this.alert = Math.min(1, this.alert + dt * (p.crouchS > 0.5 ? 0.6 : 1.6) * (this.aware ? 3 : 1)); this.lastSeen.copy(p.pos); this.seen = 0; }
    else { this.seen += dt; if (!this.aware) this.alert = Math.max(0, this.alert - dt * 0.25); }
    if (this.alert >= 1 && !this.aware) this.becomeAware();
    if (this.aware && this.seen > 12) { this.aware = false; this.alert = 0.5; }
  }
  becomeAware() { this.aware = true; this.alert = 1; this.sys.onAware(this); }
  hear(pos, radius) { if (this.dead) return; if (pos.distanceTo(this.pos) < radius) { this.alert = Math.min(1, this.alert + 0.6); this.lastSeen.copy(pos); if (this.alert >= 1 && !this.aware) this.becomeAware(); } }
  damage(amount, point, dir, part, melee = false) {
    if (this.dead) return 0;
    let a = amount * this.armor(point, dir, part, melee);
    this.hp -= a; this.flinch = 1;
    if (!this.aware) this.becomeAware();
    if (this.hp <= 0) this.die(dir);
    return a;
  }
  armor() { return 1; }
  knock(v) { this.vel.add(v); this.stun = Math.max(this.stun, 0.5); }
  collideMove(dt, radius = 0.5) {
    // move with simple swept collision against the static world
    const d = _v3.copy(this.vel).multiplyScalar(dt); const len = d.length(); if (len < 1e-5) return null;
    const dir = d.clone().divideScalar(len);
    const hit = this.game.physics.raycastFilter(this.pos, dir, len + radius, G.STATIC | G.PLATFORM, () => true);
    if (hit) {
      const impact = this.vel.dot(hit.normal);
      this.pos.addScaledVector(dir, Math.max(0, hit.toi - radius));
      // remove velocity into the surface
      this.vel.addScaledVector(hit.normal, -impact * 1.3);
      return { hit, speed: -impact };
    }
    this.pos.add(d);
    return null;
  }
  remove() {
    this.model.removeFromParent();
    // each enemy builds its own model: free its GPU buffers (waves of drones used to leak them)
    this.model.traverse(o => { o.geometry?.dispose(); for (const m of Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) m.dispose(); });
    if (this.body) { this.game.physics.world.removeRigidBody(this.body); this.body = null; }
    this.untether?.();
    this.game.audio.stopLoop('drone' + this.id, 0.3);
  }
  makeBody(colliders) {
    const P = this.game.physics, Rp = P.R;
    this.body = P.world.createRigidBody(Rp.RigidBodyDesc.kinematicPositionBased().setTranslation(this.pos.x, this.pos.y, this.pos.z));
    this.colliders = colliders.map(c => {
      const d = c.r ? Rp.ColliderDesc.ball(c.r) : Rp.ColliderDesc.cuboid(c.hx, c.hy, c.hz);
      if (c.pos) d.setTranslation(c.pos.x, c.pos.y, c.pos.z);
      d.setCollisionGroups(((G.ENEMY & 0xffff) << 16) | (G.PLAYER | G.PROP));
      const col = P.world.createCollider(d, this.body);
      P.setMeta(col, { kind: 'enemy', enemy: this, weak: !!c.weak, part: c.part, surface: 'drone' });
      return col;
    });
  }
  syncBody() {
    if (!this.body) return;
    this.body.setNextKinematicTranslation({ x: this.pos.x, y: this.pos.y, z: this.pos.z });
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, this.yaw, 0));
    this.body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
  }
}

// ------------------------------------------------------------------ GNAT
class Gnat extends Enemy {
  constructor(sys, pos, opts) {
    super(sys, 'gnat', pos, opts);
    this.hp = this.maxHp = 45;
    this.model = gnatModel(); this.game.engine.cityRoot.add(this.model);
    this.strafeDir = R() < 0.5 ? 1 : -1; this.strafeT = 0; this.fireT = 2 + R() * 2; this.telegraph = 0; this.burst = 0;
    this.prefDist = 9 + R() * 5; this.altitude = opts.altitude ?? 2.5 + R() * 2;
    this.aimedAt = 0; this.dodgeT = 0; this.wobble = R() * 10;
    this.makeBody([{ r: 0.38 }, { r: 0.12, pos: { x: 0, y: -0.02, z: 0.42 }, weak: true, part: 'eye' }]);
    this.untether = this.game.tether.register({
      kind: 'enemy', label: 'Gnat', enabled: () => !this.dead, getPos: () => this.pos, getVel: () => this.vel, mass: 30, colliders: this.colliders,
      capture: (dt) => { this.tethered = true; this.stun = Math.max(this.stun, 0.8); const sp = this.vel.length(); this.vel.multiplyScalar(Math.max(0, 1 - dt * 6)); return 30 * sp * dt * 6 + 420 * dt; }, // rotors fight the line: their thrust feeds the cells
      onCaptureEnd: () => { this.tethered = false; },
      push: (imp) => { this.vel.addScaledVector(imp, 1 / 30); this.stun = 1.6; this.thrown = 1.2; },
    });
    this.game.audio.droneBuzz(this.id, this.pos);
  }
  update(dt) {
    const g = this.game, p = this.player;
    this.stateT += dt; this.wobble += dt;
    if (this.dead) return this.updateDead(dt);
    this.perceive(dt);
    this.stun = Math.max(0, this.stun - dt); this.thrown = Math.max(0, (this.thrown || 0) - dt);
    const target = p.pos.clone().add(new THREE.Vector3(0, 1.3, 0));
    const toP = target.clone().sub(this.pos); const dist = toP.length();
    let desired = new THREE.Vector3();
    if (this.stun > 0) {
      // stalled: sinks, spins
      this.vel.y -= (this.tethered ? 0 : 6) * dt;
      this.yaw += dt * 6;
    } else if (this.aware) {
      // keep preferred distance, strafe, hold altitude above the player's level
      const flat = toP.clone().setY(0); const fd = flat.length(); flat.divideScalar(Math.max(fd, 0.01));
      const side = new THREE.Vector3(-flat.z, 0, flat.x).multiplyScalar(this.strafeDir);
      desired.addScaledVector(flat, (fd - this.prefDist) * 0.9);
      desired.addScaledVector(side, 3.2 + Math.sin(this.wobble * 1.3) * 1.5);
      desired.y = (p.pos.y + this.altitude + Math.sin(this.wobble * 0.9) * 0.8 - this.pos.y) * 1.5;
      this.strafeT -= dt; if (this.strafeT < 0) { this.strafeT = 1.5 + R() * 2.5; this.strafeDir *= -1; }
      // dodge when the player aims at us
      const cam = g.engine.camera; const cf = cam.getWorldDirection(_v2); const tc = this.pos.clone().sub(cam.position).normalize();
      if (g.weapons.aiming && cf.dot(tc) > 0.993) this.aimedAt += dt; else this.aimedAt = Math.max(0, this.aimedAt - dt);
      this.dodgeT -= dt;
      if (this.aimedAt > 0.45 && this.dodgeT < 0) { this.vel.addScaledVector(side, 9 * (R() < 0.5 ? 1 : -1)); this.vel.y += 2; this.dodgeT = 1.6 + R(); this.aimedAt = 0; g.audio.whoosh(0.2); }
      this.yaw = dampAngle(this.yaw, Math.atan2(toP.x, toP.z), 6, dt);
      // attack cycle: telegraph -> burst
      this.fireT -= dt;
      if (this.fireT < 0 && this.telegraph <= 0 && this.burst <= 0 && this.canSee(target, 40, 0.6)) { this.telegraph = 0.85; g.audio.creak(this.pos, 0.3); }
      if (this.telegraph > 0) { this.telegraph -= dt; desired.multiplyScalar(0.2); if (this.telegraph <= 0) { this.burst = 3; this.burstT = 0; } }
      if (this.burst > 0) { this.burstT -= dt; if (this.burstT <= 0) { this.shoot(target); this.burst--; this.burstT = 0.14; if (this.burst === 0) this.fireT = 2.2 + R() * 2.2; } }
    } else {
      // patrol: lazy orbit around home, cutting at the hull
      const a = this.stateT * 0.4 + this.id;
      const hp = this.home.clone().add(new THREE.Vector3(Math.cos(a) * 3, Math.sin(a * 1.3) * 0.6, Math.sin(a) * 3));
      desired.copy(hp).sub(this.pos).multiplyScalar(0.8);
      this.yaw = dampAngle(this.yaw, Math.atan2(desired.x, desired.z), 2, dt);
    }
    if (this.stun <= 0) {
      if (desired.length() > 7) desired.setLength(7);
      this.vel.lerp(desired, 1 - Math.exp(-2.6 * dt));
      // avoid walls
      const fwd = this.vel.clone(); const sp = fwd.length();
      if (sp > 0.5) { fwd.divideScalar(sp); const h = g.physics.raycastFilter(this.pos, fwd, 2.5, G.STATIC, () => true); if (h) this.vel.addScaledVector(h.normal, 10 * dt * (2.5 - h.toi)); }
    }
    const c = this.collideMove(dt, 0.4);
    if (c && c.speed > 7 && this.thrown > 0) { this.damage(c.speed * 6, this.pos, c.hit.normal.clone().negate()); g.fx.sparks(this.pos, c.hit.normal, 20, 6); g.audio.impact(this.pos, 'metal', 1.2); g.camera.shake(0.1); }
    this.syncVisual(dt);
  }
  shoot(target) {
    const g = this.game, p = this.player;
    const muzzle = this.pos.clone().add(new THREE.Vector3(Math.sin(this.yaw) * 0.45, -0.15, Math.cos(this.yaw) * 0.45));
    // slight lead + inaccuracy
    const lead = target.clone().addScaledVector(p.vel, 0.25).add(new THREE.Vector3((R() - 0.5) * 1.2, (R() - 0.5) * 0.8, (R() - 0.5) * 1.2));
    this.sys.bolt(muzzle, lead.sub(muzzle).normalize(), 32, 9, this);
    g.audio.gunshot('drone', muzzle, false);
    g.fx.flash(muzzle, 0xff5030, 5, 0.05, 6);
  }
  syncVisual(dt) {
    const m = this.model; m.position.copy(this.pos);
    const tilt = clamp(this.vel.x * 0.04, -0.4, 0.4), tiltz = clamp(this.vel.z * 0.04, -0.4, 0.4);
    m.rotation.set(tiltz * Math.cos(this.yaw) + 0.0, this.yaw, -tilt * Math.cos(this.yaw));
    m.userData.rotors.forEach((r, i) => (r.rotation.y += dt * (40 + i)));
    const tel = this.telegraph > 0 ? 1 + Math.sin(this.stateT * 40) * 0.5 + (0.85 - this.telegraph) * 4 : 1;
    m.userData.eye.material.color.setRGB(3 * tel, 0.9 * tel * 0.5, 0.3);
    m.userData.eye.scale.setScalar(this.telegraph > 0 ? 1.3 : 1);
    this.syncBody();
    this.game.audio.loops.get('drone' + this.id)?.set(this.pos, this.aware ? 0.8 : 0.3);
  }
  die(dir) {
    this.dead = true; this.deadT = 0;
    this.vel.addScaledVector(dir || new THREE.Vector3(), 3); this.vel.y += 2;
    this.game.audio.stopLoop('drone' + this.id, 0.6);
    this.game.audio.impact(this.pos, 'drone', 1.2);
    this.game.fx.sparks(this.pos, new THREE.Vector3(0, 1, 0), 18, 6, [0.6, 0.9, 1, 1]);
    this.game.fx.smoke(this.pos, 4, 0.5, [0.15, 0.15, 0.15, 0.6]);
    this.sys.onKilled(this);
  }
  updateDead(dt) {
    this.deadT += dt;
    this.vel.y -= 15 * dt;
    const c = this.collideMove(dt, 0.3);
    this.model.position.copy(this.pos); this.model.rotation.x += dt * 5; this.model.rotation.z += dt * 3;
    if (this.deadT % 0.08 < dt) this.game.fx.smoke(this.pos, 1, 0.4, [0.12, 0.12, 0.12, 0.5], new THREE.Vector3(0, 0.5, 0), 1.4);
    if (c || this.deadT > 6) { if (!this.exploded) { this.exploded = true; this.game.fx.explosion(this.pos, 0.6); this.game.audio.explosion(this.pos, 0.6); this.sys.splash(this.pos, 3, 25); } this.remove(); this.removed = true; }
  }
}

// ------------------------------------------------------------------ LEECH
class Leech extends Enemy {
  constructor(sys, pos, opts) {
    super(sys, 'leech', pos, opts);
    this.hp = this.maxHp = 75;
    this.model = leechModel(); this.game.engine.cityRoot.add(this.model);
    this.gait = 0; this.lungeT = 3; this.windup = 0; this.lunging = 0; this.grounded = true; this.cutT = 0;
    this.makeBody([{ hx: 0.4, hy: 0.25, hz: 0.75, pos: { x: 0, y: 0.32, z: 0 } }, { r: 0.16, pos: { x: 0, y: 0.42, z: -0.75 }, weak: true, part: 'canister' }]);
    this.untether = this.game.tether.register({
      kind: 'enemy', label: 'Leech', enabled: () => !this.dead, getPos: () => this.pos.clone().add(new THREE.Vector3(0, 0.4, 0)), getVel: () => this.vel, mass: 60, colliders: this.colliders,
      capture: (dt) => { this.tethered = true; this.stun = Math.max(this.stun, 0.6); this.vel.multiplyScalar(Math.max(0, 1 - dt * 6)); if (this.grounded) { this.vel.y = 1.5; this.grounded = false; } return 380 * dt + 60 * this.vel.length() * dt * 6; },
      onCaptureEnd: () => { this.tethered = false; },
      push: (imp) => { this.vel.addScaledVector(imp, 1 / 60); this.vel.y = Math.max(this.vel.y, 3); this.grounded = false; this.stun = 1.8; this.thrown = 2; },
    });
  }
  armor(point, dir, part, melee) {
    if (part === 'canister') return 2.2;
    if (melee) return 1;
    // frontal plates deflect: compare shot direction with facing
    const f = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    return dir && dir.dot(f) < -0.4 ? 0.45 : 1.1;
  }
  update(dt) {
    const g = this.game, p = this.player;
    this.stateT += dt; if (this.dead) return this.updateDead(dt);
    this.perceive(dt);
    this.stun = Math.max(0, this.stun - dt); this.thrown = Math.max(0, (this.thrown || 0) - dt);
    const toP = p.pos.clone().sub(this.pos); const flat = toP.clone().setY(0); const dist = flat.length(); flat.divideScalar(Math.max(dist, 0.01));
    let speed = 0;
    if (!this.grounded) {
      this.vel.y -= (this.tethered ? 2 : 18) * dt;
    } else if (this.stun > 0) {
      this.vel.multiplyScalar(Math.max(0, 1 - 6 * dt));
    } else if (this.aware) {
      this.yaw = dampAngle(this.yaw, Math.atan2(flat.x, flat.z), this.windup > 0 ? 2 : 7, dt);
      this.lungeT -= dt;
      if (this.windup > 0) {
        this.windup -= dt; this.vel.multiplyScalar(0.8);
        if (this.windup <= 0) { // lunge!
          this.vel.set(flat.x * 13, 4.5, flat.z * 13); this.grounded = false; this.lunging = 0.8; g.audio.whoosh(0.5); g.audio.creak(this.pos, 0.4);
        }
      } else if (dist < 6 && this.lungeT < 0 && Math.abs(toP.y) < 2.5) {
        this.windup = 0.65; this.lungeT = 2.5 + R() * 1.5; g.audio.hiss(this.pos, 0.6, 1.4);
      } else {
        // scuttle in a weaving approach
        const side = new THREE.Vector3(-flat.z, 0, flat.x).multiplyScalar(Math.sin(this.stateT * 2.2 + this.id) * 0.6);
        const want = flat.clone().add(side).normalize().multiplyScalar(dist > 2.2 ? 5.2 : 0);
        this.vel.x = damp(this.vel.x, want.x, 8, dt); this.vel.z = damp(this.vel.z, want.z, 8, dt);
      }
      speed = Math.hypot(this.vel.x, this.vel.z);
    } else {
      // working on a cable: stay put, cut, sparks
      this.vel.multiplyScalar(0.8);
      this.cutT -= dt; if (this.cutT < 0) { this.cutT = 0.15 + R() * 0.3; const c = this.pos.clone().add(new THREE.Vector3(Math.sin(this.yaw) * 0.9, 0.3, Math.cos(this.yaw) * 0.9)); g.fx.sparks(c, new THREE.Vector3(0, 1, 0), 3, 3); if (c.distanceTo(p.pos) < 25 && R() < 0.3) g.audio.hiss(c, 0.2, 0.5); }
    }
    // lunge contact
    if (this.lunging > 0) {
      this.lunging -= dt;
      if (p.pos.clone().add(new THREE.Vector3(0, 0.9, 0)).distanceTo(this.pos) < 1.5) { p.damage(22, this.pos.clone()); p.externalImpulse.addScaledVector(flat, 6).setY(3); this.lunging = 0; this.vel.multiplyScalar(-0.3); g.audio.punch(p.pos); }
    }
    // integrate
    const c = this.collideMove(dt, 0.45);
    if (c && c.speed > 8 && this.thrown > 0) { this.damage(c.speed * 7, this.pos, c.hit.normal.clone().negate()); g.fx.sparks(this.pos, c.hit.normal, 20, 6); g.audio.impact(this.pos, 'metal', 1.3); g.camera.shake(0.15); }
    // ground follow
    const gh = g.physics.raycastFilter(this.pos.clone().add(new THREE.Vector3(0, 0.6, 0)), DOWN, this.grounded ? 1.2 : 0.65, G.STATIC | G.PLATFORM, () => true);
    if (gh && this.vel.y <= 0.1) { if (!this.grounded && this.thrown > 0 && this.vel.y < -9) this.damage(-this.vel.y * 4, this.pos, DOWN); this.pos.y = gh.point.y; this.vel.y = 0; this.grounded = true; this.lunging = 0; }
    else if (!gh) this.grounded = false;
    if (this.pos.y < g.killY + 10) { this.hp = 0; this.die(DOWN); }
    this.gait += speed * dt * 3 + dt * 0.5;
    this.syncVisual(dt);
  }
  syncVisual(dt) {
    const m = this.model, u = m.userData;
    m.position.copy(this.pos); m.rotation.set(this.windup > 0 ? -0.25 : (!this.grounded ? 0.3 : 0), this.yaw, 0);
    u.legs.forEach(L => {
      const s = Math.sin(this.gait * 3 + L.phase);
      L.hip.rotation.y = s * 0.35 * L.side; L.hip.rotation.z = L.side * (0.15 + Math.max(0, Math.cos(this.gait * 3 + L.phase)) * 0.3);
      L.knee.rotation.z = -L.side * 0.2;
      if (!this.grounded) { L.hip.rotation.z = L.side * (0.6 + Math.sin(this.stateT * 20 + L.row) * 0.2); }
    });
    const cut = !this.aware ? Math.sin(this.stateT * 18) * 0.25 : (this.windup > 0 ? 0.5 : 0.1);
    u.mands[0].rotation.y = 0.3 + cut; u.mands[1].rotation.y = -0.3 - cut;
    u.canister.material.color.setRGB(0.65 * 2.2, 2.2, 0.25 * 2.2).multiplyScalar(1 + Math.sin(this.stateT * 4) * 0.2);
    u.eyes.material.color.setRGB(this.windup > 0 ? 5 : 3, this.windup > 0 ? 1.2 : 0.6, 0.2);
    this.syncBody();
  }
  die(dir) {
    this.dead = true; this.deadT = 0; this.game.audio.impact(this.pos, 'drone', 1.4); this.sys.onKilled(this);
    this.game.fx.sparks(this.pos.clone().add(new THREE.Vector3(0, 0.4, 0)), new THREE.Vector3(0, 1, 0), 20, 6, [0.8, 1, 0.4, 1]);
  }
  updateDead(dt) {
    this.deadT += dt;
    if (!this.grounded) { this.vel.y -= 18 * dt; this.collideMove(dt, 0.4); const gh = this.game.physics.raycastFilter(this.pos.clone().add(new THREE.Vector3(0, 0.5, 0)), DOWN, 0.55, G.STATIC | G.PLATFORM, () => true); if (gh && this.vel.y < 0) { this.pos.y = gh.point.y; this.grounded = true; this.vel.set(0, 0, 0); } }
    this.model.position.copy(this.pos);
    this.model.userData.legs.forEach(L => { L.hip.rotation.z = damp(L.hip.rotation.z, L.side * 1.2, 5, dt); });
    if (this.deadT > 0.7 && !this.exploded) { this.exploded = true; this.game.fx.explosion(this.pos.clone().add(new THREE.Vector3(0, 0.4, 0)), 0.7); this.game.audio.explosion(this.pos, 0.7); this.sys.splash(this.pos, 3, 30); this.model.visible = false; }
    if (this.deadT > 1.5 || this.pos.y < this.game.killY) { this.remove(); this.removed = true; }
  }
}

// ------------------------------------------------------------------ SHEARER
// The prologue's boss. Its moods (mode): 'intro' (driven by the script), 'hunt' (charges; phase 3
// chains them and slams a shockwave), 'feed' (clamped onto a power source, shielded), 'climb' (back
// over an edge it was thrown off), 'dying' (the script plays the finish). Armour: bullets glance off
// until a stalled charge opens its shells; in phase 3 the shells are gone.
class Shearer extends Enemy {
  constructor(sys, pos, opts) {
    super(sys, 'shearer', pos, opts);
    this.hp = this.maxHp = opts.boss ? 900 : 420;
    this.model = shearerModel(); this.game.engine.cityRoot.add(this.model);
    this.mode = opts.intro ? 'intro' : 'hunt'; this.phase = 1;
    this.chargeT = 2.5; this.windup = 0; this.charging = 0; this.chargeDir = new THREE.Vector3(); this.gait = 0; this.sawSpin = 8;
    this.open = 0; this.platesOff = false; this.chain = 0; this.slam = null; this.clamps = [true, true]; this.pose = { climb: 0, clamp: 0, reach: 0 };
    this.arena = opts.arena || null; // { x0, x1, z0, z1, y } — the deck, for climbing back when thrown off
    this.makeBody([{ hx: 1.15, hy: 0.8, hz: 1.75, pos: { x: 0, y: 2.1, z: 0 } }, { r: 0.55, pos: { x: 0, y: 3.05, z: -0.22 }, weak: true, part: 'core' }]);
    this.untether = this.game.tether.register({
      kind: 'enemy', label: 'Shearer', big: true, priority: 2, enabled: () => !this.dead && this.mode !== 'intro' && this.mode !== 'dying' && this.mode !== 'feed', getPos: () => this.pos.clone().add(new THREE.Vector3(0, 2, 0)), getVel: () => this.vel, mass: 2200, colliders: this.colliders,
      capture: (dt) => {
        if (this.mode === 'feed') return 0; // shielded: its own field throws the tether off
        // charging: its momentum floods the tether and it stalls; at rest it barely yields
        if (this.charging > 0) {
          this.vel.multiplyScalar(Math.max(0, 1 - dt * 5));
          if (this.vel.length() < 2.5) { this.charging = 0; this.chain = 0; this.windowDmg = 0; this.stun = this.phase === 3 ? 2.6 : 3.6; this.game.events.emit('shearer:stalled', this); this.game.audio.metalStress(this.pos, 1.5); }
          return 2200 * 4 * dt;
        }
        return 120 * dt;
      },
      push: (imp, cells) => {
        if (this.mode === 'feed') { this.game.events.emit('shearer:shielded', this); return; }
        const v = imp.clone().multiplyScalar(1 / 2200 * 2.6); this.vel.add(v); this.vel.y = Math.max(this.vel.y, 3); this.stun = Math.max(this.stun, 1.4); this.thrown = 1.6;
        this.damage(cells * 45 * (this.stun > 1.5 ? 1.3 : 1), this.pos, v.clone().normalize(), 'tether', true);
      },
    });
  }
  get exposed() { return this.platesOff || this.open > 0.6; }
  // a walker: sweep horizontally at body height (railings stop it; their gaps let it be thrown over),
  // then move vertically (the base sweep also aimed down at the deck and pinned it in place)
  collideMove(dt, radius = 1.5) {
    const hv = _v3.set(this.vel.x, 0, this.vel.z).multiplyScalar(dt), len = hv.length(); let res = null;
    if (len > 1e-5) {
      const dir = hv.clone().divideScalar(len), o = this.pos.clone(); o.y += 1.2;
      const hit = this.game.physics.raycastFilter(o, dir, len + radius, G.STATIC | G.PLATFORM, () => true);
      if (hit) { const impact = this.vel.x * hit.normal.x + this.vel.z * hit.normal.z; this.pos.addScaledVector(dir, Math.max(0, hit.toi - radius)); this.vel.x -= hit.normal.x * impact * 1.3; this.vel.z -= hit.normal.z * impact * 1.3; res = { hit, speed: -impact }; }
      else this.pos.add(hv);
    }
    this.pos.y += this.vel.y * dt;
    return res;
  }
  armor(point, dir, part, melee) {
    if (this.mode === 'feed' || this.mode === 'intro' || this.mode === 'dying' || this.mode === 'climb') return 0;
    if (part === 'tether') return 1;
    // overdrive: no shells, but it only really gives while stalled (stalls stay the heart of the fight)
    if (this.platesOff) return part === 'core' ? (this.stun > 0 ? 0.9 : 0.35) : (melee ? 0.6 : this.stun > 0 ? 0.4 : 0.12);
    if (part === 'core') return this.exposed ? 0.9 : 0.1;
    return this.stun > 0 ? 0.3 : (melee ? 0.25 : 0.06);
  }
  damage(amount, point, dir, part, melee = false) {
    if (this.dead || this.mode === 'dying') return 0;
    if (this.mode === 'feed') { this.shieldFlash = 0.35; if (point) this.game.fx.sparks(point, new THREE.Vector3(0, 1, 0), 3, 4, [1, 0.6, 0.2, 1]); }
    const a = amount * this.armor(point, dir, part, melee);
    if (a < amount * 0.12 && this.mode === 'hunt') { this.deflects = (this.deflects || 0) + 1; this.game.events.emit('shearer:deflect', this); if (point) this.game.fx.sparks(point, dir ? dir.clone().negate() : new THREE.Vector3(0, 1, 0), 4, 5); }
    if (a <= 0) return 0;
    let dealt = a;
    if (this.opts.boss && this.phase === 1 && part !== 'tether') { this.windowDmg = (this.windowDmg || 0) + a; if (this.windowDmg > this.maxHp * 0.2) dealt = a * 0.1; }
    this.hp -= dealt; this.flinch = 1; if (!this.aware) this.becomeAware();
    if (!this.opts.boss) { if (this.hp <= 0) this.die(dir); return a; }
    if (this.phase === 1 && this.hp <= this.maxHp * 0.62) { this.hp = this.maxHp * 0.62; this.phase = 2; this.stun = 0; this.charging = 0; this.windup = 0; this.game.events.emit('shearer:phase2', this); }
    if (this.phase === 3 && this.hp <= 0) { this.hp = 0; this.mode = 'dying'; this.charging = 0; this.windup = 0; this.game.events.emit('shearer:finisher', this); }
    return a;
  }
  // the script tears one of its feeding clamps away
  breakClamp(i) {
    if (!this.clamps[i]) return; this.clamps[i] = false; this.hp -= this.maxHp * 0.085;
    const c = this.model.userData.claws[i]; this.flail = 1.2;
    this.game.fx.sparks(c.hand.getWorldPosition(new THREE.Vector3()), new THREE.Vector3(0, 1, 0), 40, 9);
    if (!this.clamps[0] && !this.clamps[1]) this.enterPhase3();
  }
  enterPhase3() {
    this.phase = 3; this.mode = 'hunt'; this.platesOff = true; this.stun = 5; this.thrown = 0; this.chargeT = 1.2;
    this.vel.set(-Math.sin(this.yaw) * 6, 5, -Math.cos(this.yaw) * 6); // torn loose: it's thrown back off the pylon
    const u = this.model.userData;
    u.plates.forEach(pl => { pl.hinge.visible = false; });
    this.game.fx.debris(this.pos.clone().add(new THREE.Vector3(0, 2.6, 0)), 10, 0x8a3a22, 9, 0.35);
    this.game.events.emit('shearer:phase3', this);
  }
  update(dt) {
    const g = this.game, p = this.player;
    this.stateT += dt; if (this.dead) return this.updateDead(dt);
    this.perceive(dt); if (this.opts.alwaysAware && !this.aware) this.becomeAware();
    this.stun = Math.max(0, this.stun - dt); this.thrown = Math.max(0, (this.thrown || 0) - dt); this.flail = Math.max(0, (this.flail || 0) - dt);
    const toP = p.pos.clone().sub(this.pos); const flat = toP.clone().setY(0); const dist = flat.length(); flat.divideScalar(Math.max(dist, 0.01));
    const od = this.phase === 3; // overdrive
    if (this.mode === 'intro' || this.mode === 'dying') { this.syncVisual(dt); return; } // the script moves it
    if (this.mode === 'climb') { // hauling itself back over the edge it was thrown off
      this.climbT += dt; const k = Math.min(1, this.climbT / 1.6);
      this.pos.lerpVectors(this.climbFrom, this.climbTo, k * k * (3 - 2 * k)); this.pose.climb = Math.sin(k * Math.PI);
      if (k >= 1) { this.mode = 'hunt'; this.pose.climb = 0; this.vel.set(0, 0, 0); this.chargeT = 1.5; }
      this.syncVisual(dt); return;
    }
    if (this.mode === 'feed') {
      const f = this.feedSpot; const to = f.pos.clone().sub(this.pos).setY(0), d = to.length();
      if (d > 0.4 && !this.clamped) { to.divideScalar(d); this.vel.x = to.x * 7; this.vel.z = to.z * 7; this.yaw = dampAngle(this.yaw, Math.atan2(to.x, to.z), 6, dt); }
      else { if (!this.clamped) { this.clamped = true; g.events.emit('shearer:clamped', this); } this.vel.x = 0; this.vel.z = 0; this.pos.x = damp(this.pos.x, f.pos.x, 6, dt); this.pos.z = damp(this.pos.z, f.pos.z, 6, dt); this.yaw = dampAngle(this.yaw, f.yaw, 6, dt); }
      this.pose.clamp = damp(this.pose.clamp, this.clamped ? 1 : 0, 4, dt);
      this.sawSpin = damp(this.sawSpin, 30, 2, dt);
    } else if (this.stun > 0) {
      this.vel.x = damp(this.vel.x, 0, this.thrown > 0 ? 1 : 4, dt); this.vel.z = damp(this.vel.z, 0, this.thrown > 0 ? 1 : 4, dt);
      this.sawSpin = damp(this.sawSpin, 2, 2, dt);
    } else if (this.charging > 0) {
      this.charging -= dt;
      const sp = od ? 16 : 13; this.vel.x = this.chargeDir.x * sp; this.vel.z = this.chargeDir.z * sp;
      if (p.pos.clone().sub(this.pos).setY(0).length() < 2.6 && Math.abs(p.pos.y - this.pos.y) < 2.2) {
        p.damage(od ? 34 : 30, this.pos.clone()); p.externalImpulse.add(this.chargeDir.clone().multiplyScalar(11)).setY(5); g.camera.shake(0.6); g.audio.punch(p.pos); this.charging = 0; this.stun = 0.5; this.chain = 0;
      }
      if (this.charging <= 0) this.endCharge();
      if (this.stateT % 0.1 < dt) g.fx.dust(this.pos, 0.7);
    } else if (this.windup > 0) {
      this.windup -= dt; this.vel.multiplyScalar(0.85);
      this.yaw = dampAngle(this.yaw, Math.atan2(flat.x, flat.z), od ? 7 : 5, dt);
      this.sawSpin = damp(this.sawSpin, 40, 4, dt);
      if (this.windup <= 0) { this.charging = od ? 1.3 : 1.6; this.chargeDir.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)); g.audio.explosion(this.pos, 0.3); g.camera.shake(0.2); g.events.emit('shearer:charge', this); }
    } else if (this.aware) {
      this.yaw = dampAngle(this.yaw, Math.atan2(flat.x, flat.z), 2.5, dt);
      const want = flat.clone().multiplyScalar(dist > 7 ? (od ? 3.6 : 2.4) : 0);
      this.vel.x = damp(this.vel.x, want.x, 3, dt); this.vel.z = damp(this.vel.z, want.z, 3, dt);
      this.chargeT -= dt;
      if (this.chargeT < 0 && dist < 28 && Math.abs(toP.y) < 3) { this.windup = od ? 0.8 : 1.15; g.audio.metalStress(this.pos, 1.2); g.hud.hint('shearer'); }
      this.sawSpin = damp(this.sawSpin, 14, 3, dt);
    }
    // the overdrive slam: a shockwave rolling out across the deck (jump it)
    if (this.slam) {
      const sl = this.slam; sl.t += dt; const r = sl.t * 13;
      const d = p.pos.clone().sub(sl.pos).setY(0).length();
      if (!sl.hit && Math.abs(d - r) < 0.9 && p.pos.y - sl.pos.y < 0.6 && p.state === 'ground') { sl.hit = true; p.damage(16, sl.pos.clone()); p.externalImpulse.add(p.pos.clone().sub(sl.pos).setY(0).normalize().multiplyScalar(6)).setY(4); g.camera.shake(0.35); }
      if (r > 11) this.slam = null;
    }
    this.vel.y -= 20 * dt;
    const c = this.collideMove(dt, 1.5);
    if (c && this.charging > 0) { this.charging = 0; this.stun = 1.4; this.chain = 0; g.camera.shake(0.4); g.audio.clank(this.pos, 2, 0.5); g.fx.sparks(this.pos.clone().add(new THREE.Vector3(0, 1, 0)), c.hit.normal, 30, 8); }
    if (c && this.thrown > 0 && c.speed > 4) { this.damage(c.speed * 22, this.pos, c.hit.normal.clone().negate(), 'tether', true); g.camera.shake(0.5); g.audio.explosion(this.pos, 0.5); g.fx.sparks(this.pos.clone().add(new THREE.Vector3(0, 1.4, 0)), c.hit.normal, 40, 9); }
    const gh = g.physics.raycastFilter(this.pos.clone().add(new THREE.Vector3(0, 1, 0)), DOWN, 1.3, G.STATIC | G.PLATFORM, () => true);
    if (gh && this.vel.y <= 0) { this.pos.y = gh.point.y; this.vel.y = 0; }
    // thrown off the deck: it hooks the edge and hauls itself back up (and it costs it)
    const A = this.arena;
    if (A && this.opts.boss && this.pos.y < A.y - 2.5 && this.mode === 'hunt') {
      const back = new THREE.Vector3(clamp(this.pos.x, A.x0 + 1.5, A.x1 - 1.5), A.y, clamp(this.pos.z, A.z0 + 1.5, A.z1 - 1.5));
      this.mode = 'climb'; this.climbT = 0; this.climbFrom = new THREE.Vector3(this.pos.x, A.y - 3, this.pos.z).lerp(back, 0.15); this.climbTo = back; this.vel.set(0, 0, 0); this.charging = 0; this.stun = 0;
      this.yaw = Math.atan2(back.x - this.pos.x, back.z - this.pos.z);
      if (this.phase !== 2) { this.hp -= this.maxHp * 0.1; if (this.phase === 3 && this.hp <= 0) this.hp = 1; }
      if (this.phase === 1 && this.hp <= this.maxHp * 0.62) { this.hp = this.maxHp * 0.62; this.phase = 2; g.events.emit('shearer:phase2', this); }
      g.audio.metalStress(this.pos, 2); g.events.emit('shearer:edge', this);
    }
    if (this.pos.y < g.killY + 10 && !this.dead) { this.hp = 0; this.die(DOWN); }
    this.gait += Math.hypot(this.vel.x, this.vel.z) * dt * 1.1;
    this.syncVisual(dt);
  }
  endCharge() {
    const g = this.game;
    if (this.phase === 3) {
      // overdrive: slam the deck, then (once) turn and charge again
      this.slam = { pos: this.pos.clone(), t: 0, hit: false }; g.fx.shockwave(this.pos.clone().add(new THREE.Vector3(0, 0.2, 0)), 11, [1, 0.55, 0.2], new THREE.Vector3(0, 1, 0), 0.85);
      g.audio.explosion(this.pos, 0.45); g.camera.shake(0.35); g.events.emit('shearer:slam', this);
      if (this.chain < 1) { this.chain++; this.windup = 0.55; return; }
    }
    this.chain = 0; this.chargeT = this.phase === 3 ? 1.6 + R() : 2.2 + R() * 1.5;
  }
  syncVisual(dt) {
    const m = this.model, u = m.userData, t = this.stateT, od = this.phase === 3;
    m.position.copy(this.pos); m.rotation.set(this.tumble || 0, this.yaw, 0);
    // body: lean into charges, rock while walking, rear up while it climbs or clamps
    const pitch = (this.windup > 0 ? -0.12 : this.charging > 0 ? 0.1 : 0) - this.pose.climb * 0.7 - this.pose.clamp * 0.32 + (this.stun > 0 ? Math.sin(t * 9) * 0.04 : 0);
    u.body.rotation.x = damp(u.body.rotation.x, pitch, 8, dt); u.body.rotation.z = Math.sin(this.gait * 2) * 0.035 + (this.flail > 0 ? Math.sin(t * 25) * 0.08 : 0);
    u.body.position.y = 1.9 + Math.abs(Math.sin(this.gait * 2)) * 0.06 + this.pose.clamp * 0.5 + this.pose.climb * 0.6;
    u.saw.rotation.x += this.sawSpin * dt;
    u.sawArm.rotation.x = this.charging > 0 ? -0.3 : this.windup > 0 ? -0.7 : this.mode === 'feed' ? -0.9 + Math.sin(t * 3) * 0.2 : Math.sin(t) * 0.12;
    // armour shells open while it's stalled
    this.open = damp(this.open, this.stun > 0.3 && !this.platesOff ? 1 : 0, 6, dt);
    u.plates.forEach(pl => { if (pl.axis === 'x') pl.hinge.rotation.x = pl.open * this.open; else pl.hinge.rotation.z = pl.open * this.open; });
    // claws: reach while hunting, raised in windup, forward when charging, hooked onto the pylon when feeding
    u.claws.forEach((c, i) => {
      const clampHere = this.mode === 'feed' && this.clamps[i];
      const reachUp = this.windup > 0 ? 1 : 0, climb = this.pose.climb ? Math.sin(t * 8 + i * Math.PI) * 0.5 + 0.5 : 0;
      const tgtX = clampHere ? -0.55 * this.pose.clamp : this.charging > 0 ? 0.15 : -0.6 * reachUp - climb * 1.1 + Math.sin(t * 1.6 + i) * 0.06 + (this.flail > 0 && !this.clamps[i] ? Math.sin(t * 22) * 0.6 : 0);
      c.sh.rotation.x = damp(c.sh.rotation.x, tgtX, 8, dt);
      c.sh.rotation.y = damp(c.sh.rotation.y, clampHere ? -c.sx * 0.35 : c.sx * 0.15, 6, dt);
      c.fore.rotation.x = damp(c.fore.rotation.x, clampHere ? 0.9 : 0.5 + reachUp * 0.4, 8, dt);
      c.fingers.forEach((f, k) => { f.rotation.x = damp(f.rotation.x, clampHere ? 0.9 : this.windup > 0 ? -0.4 : 0.2, 10, dt); });
    });
    // tripod gait
    const moving = Math.hypot(this.vel.x, this.vel.z) > 0.3 || this.pose.climb > 0;
    u.legs.forEach(L => {
      const ph = this.gait * 2.2 + L.grp * Math.PI, sw = moving ? Math.sin(ph) : 0, lift = moving ? Math.max(0, Math.cos(ph)) : 0;
      L.hip.rotation.y = sw * 0.32 * L.sx;
      L.hip.rotation.z = L.sx * (-lift * 0.35 + this.pose.clamp * 0.15);
      L.knee.rotation.z = L.sx * lift * 0.25;
    });
    // lights: headlights strobe in windup; the core breathes, flares when exposed, burns in overdrive
    const l = this.windup > 0 ? (Math.sin(t * 30) > 0 ? 6 : 1) : 3;
    u.lights.forEach(x => x.material.color.setRGB(l, l * 0.9, l * 0.7));
    const ck = (this.exposed ? 2.2 + Math.sin(t * 12) * 0.6 : 1) * (od ? 1.8 + Math.sin(t * 20) * 0.3 : 1) * (this.mode === 'feed' ? 1.6 : 1);
    u.core.material.color.setRGB(3 * ck, 1.65 * ck, 0.55 * ck);
    u.eye.material.color.setRGB(4 * (od ? 1.6 : 1), 1.6, 0.6);
    u.shield.visible = this.mode === 'feed' && this.clamped;
    if (u.shield.visible) u.shield.material.opacity = 0.12 + Math.sin(t * 6) * 0.05 + (this.shieldFlash = Math.max(0, (this.shieldFlash || 0) - dt)) * 0.6;
    this.syncBody();
  }
  die(dir) {
    this.dead = true; this.deadT = 0; this.sys.onKilled(this);
    this.game.audio.metalStress(this.pos, 1.0);
  }
  updateDead(dt) {
    this.deadT += dt;
    if (this.opts.boss) { this.syncVisual?.(0); if (this.deadT > 0.1) { this.remove(); this.removed = true; } return; } // the script has already played its end
    this.vel.y -= 15 * dt; this.collideMove(dt, 1); this.model.position.copy(this.pos);
    if (this.deadT % 0.1 < dt) this.game.fx.sparks(this.pos.clone().add(new THREE.Vector3(0, 2, -1)), new THREE.Vector3(0, 1, 0), 6, 5, [1, 0.6, 0.2, 1]);
    if (this.deadT > 1.0 && !this.exploded) { this.exploded = true; const c = this.pos.clone().add(new THREE.Vector3(0, 1.5, 0)); this.game.fx.explosion(c, 1.6); this.game.audio.explosion(c, 1.6); this.game.camera.shake(0.8); this.sys.splash(c, 5, 45); this.model.visible = false; }
    if (this.deadT > 2) { this.remove(); this.removed = true; }
  }
}

// ------------------------------------------------------------------ system
export class Enemies {
  constructor(game) {
    this.game = game; this.list = []; this.nextId = 1; this.bolts = [];
    this.boltGeo = new THREE.CapsuleGeometry(0.05, 0.5, 4, 6); this.boltGeo.rotateX(Math.PI / 2);
    this.boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.3, 0.15).multiplyScalar(5) });
    this.killed = 0;
  }
  spawn(type, pos, opts = {}) {
    const C = { gnat: Gnat, leech: Leech, shearer: Shearer }[type];
    const e = new C(this, pos, opts); this.list.push(e);
    if (opts.aware) e.becomeAware();
    return e;
  }
  get alive() { return this.list.filter(e => !e.dead); }
  get anyAware() { return this.list.some(e => !e.dead && e.aware); }
  onAware(e) { this.game.events.emit('enemy:aware', e); for (const o of this.list) if (o !== e && !o.dead && o.pos.distanceTo(e.pos) < 18) { o.alert = 1; if (!o.aware) { o.aware = true; } } }
  onKilled(e) { this.killed++; this.game.events.emit('enemy:killed', e); }
  noise(pos, radius) { for (const e of this.list) e.hear(pos, radius); }
  splash(pos, radius, dmg) {
    const p = this.game.player; const d = p.pos.clone().add(new THREE.Vector3(0, 1, 0)).distanceTo(pos);
    if (d < radius) p.damage(dmg * (1 - d / radius), pos);
    for (const e of this.list) if (!e.dead && e.pos.distanceTo(pos) < radius) e.damage(dmg * 1.5 * (1 - e.pos.distanceTo(pos) / radius), pos, e.pos.clone().sub(pos).normalize());
  }
  bolt(from, dir, speed, dmg, owner) {
    const m = new THREE.Mesh(this.boltGeo, this.boltMat); m.position.copy(from); m.lookAt(from.clone().add(dir));
    this.game.engine.cityRoot.add(m);
    this.bolts.push({ m, pos: from.clone(), dir: dir.clone(), speed, dmg, life: 3, owner });
  }
  clear() { for (const e of this.list) if (!e.removed) e.remove(); this.list = []; for (const b of this.bolts) b.m.removeFromParent(); this.bolts = []; }
  update(dt) {
    for (const e of this.list) e.update(dt);
    this.list = this.list.filter(e => !e.removed);
    const p = this.game.player;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]; b.life -= dt;
      const step = b.speed * dt;
      const hit = this.game.physics.raycastFilter(b.pos, b.dir, step, G.STATIC | G.PLATFORM | G.PROP, () => true);
      // player hit test: closest approach of the segment to player's capsule axis
      const pc = p.pos.clone().add(new THREE.Vector3(0, 0.95, 0));
      const seg = b.dir.clone().multiplyScalar(step); const t = clamp(pc.clone().sub(b.pos).dot(seg) / seg.lengthSq(), 0, 1);
      const closest = b.pos.clone().addScaledVector(seg, t);
      const dy = Math.max(0, Math.abs(closest.y - pc.y) - 0.55); const dxz = Math.hypot(closest.x - pc.x, closest.z - pc.z);
      if (Math.hypot(dy, dxz) < 0.42 && !p.dead) { p.damage(b.dmg, b.pos.clone()); this.game.fx.sparks(closest, b.dir.clone().negate(), 6, 4, [1, 0.4, 0.2, 1]); b.life = 0; }
      else if (hit) { this.game.fx.impact(hit.point, hit.normal, 'metal'); this.game.audio.impact(hit.point, 'metal', 0.5); b.life = 0; }
      else {
        // near-miss whizz
        if (!b.whizz && closest.distanceTo(pc) < 2.5) { b.whizz = true; this.game.audio.whoosh(0.35); }
        b.pos.addScaledVector(b.dir, step); b.m.position.copy(b.pos);
      }
      if (b.life <= 0) { b.m.removeFromParent(); this.bolts.splice(i, 1); }
    }
  }
}
