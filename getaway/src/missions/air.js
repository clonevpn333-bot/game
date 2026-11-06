// GETAWAY! — everything that flies or shoots big: player-flown plane + helicopter (arcade flight), door-gunner seat,
// rockets, enemy attack helicopters, and a flight HUD. Materials match ones compiled at boot (no mid-game shader builds).
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, lerp, damp, dampAngle, rand, wrapAngle } from '../core/utils.js';
import { mergeParts } from '../world/props.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);
let MAT = null, ROTOR = null;
function mats() { if (!MAT) { MAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 }); ROTOR = new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.85 }); } return MAT; }
const B = (w, h, d, x, y, z, c, rx = 0, ry = 0, rz = 0) => { const g = new THREE.BoxGeometry(w, h, d); if (rx || ry || rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz))); g.translate(x, y, z); return { geo: g, c }; };
const CYL = (r1, r2, l, x, y, z, c, axis = 'z', seg = 14) => { const g = new THREE.CylinderGeometry(r1, r2, l, seg); if (axis === 'z') g.rotateX(Math.PI / 2); if (axis === 'x') g.rotateZ(Math.PI / 2); g.translate(x, y, z); return { geo: g, c }; };
const SPH = (r, sx, sy, sz, x, y, z, c) => { const g = new THREE.SphereGeometry(r, 16, 12); g.scale(sx, sy, sz); g.translate(x, y, z); return { geo: g, c }; };

// ---------------- models ----------------
export function heliMesh(body = 0x111317, accent = 0xd8a020) {
  mats(); const p = [SPH(1, 1.35, 1.2, 2.6, 0, 0, 0, body), SPH(1, 1.2, 0.95, 1.3, 0, 0.3, 1.5, 0x0b1218), CYL(0.38, 0.18, 5.4, 0, 0.35, -4, body), B(0.14, 1.7, 1.0, 0, 1.1, -6.6, body), B(2.4, 0.1, 0.6, 0, 0.5, -6.3, body),
    B(0.14, 0.14, 3, 1.0, -1.3, 0.2, 0x1a1a1a), B(0.14, 0.14, 3, -1.0, -1.3, 0.2, 0x1a1a1a), B(2.1, 0.1, 0.12, 0, -1.15, 1.0, 0x1a1a1a), B(2.1, 0.1, 0.12, 0, -1.15, -0.7, 0x1a1a1a),
    B(3.4, 0.12, 0.5, 0, -0.2, -0.2, body), CYL(0.18, 0.18, 1.4, 1.75, -0.35, 0.1, 0x262626), CYL(0.18, 0.18, 1.4, -1.75, -0.35, 0.1, 0x262626), // stub wings + rocket pods
    B(2.7, 0.06, 0.12, 0, 0.62, 0.9, accent), B(0.3, 0.5, 0.6, 0, 1.25, 0, 0x202020)];
  const g = new THREE.Group(); const m = new THREE.Mesh(mergeParts(p), MAT); m.castShadow = true; g.add(m);
  const rotor = new THREE.Mesh(mergeParts([B(12, 0.06, 0.32, 0, 0, 0, 0x101010), B(0.32, 0.06, 12, 0, 0, 0, 0x101010)]), ROTOR); rotor.position.y = 1.55; g.add(rotor);
  const tr = new THREE.Mesh(mergeParts([B(0.05, 2, 0.16, 0, 0, 0, 0x101010)]), MAT); tr.position.set(0.2, 1.1, -6.6); g.add(tr);
  return { g, rotor, tr };
}
export function planeMesh(body = 0xe9ecef, stripe = 0xc0392b) {
  mats(); const p = [CYL(1.25, 1.1, 14, 0, 0, 0, body), SPH(1, 1.25, 1.2, 2.4, 0, 0, 7, body), SPH(1, 1.0, 0.7, 1.6, 0, 0.55, 6.6, 0x0d1520), CYL(1.1, 0.25, 6, 0, 0.35, -10, body),
    B(22, 0.32, 3.2, 0, -0.2, 0.6, body), B(22, 0.06, 0.35, 0, -0.02, -0.9, stripe), B(8, 0.2, 2, 0, 0.6, -12, body), B(0.25, 3.4, 2.4, 0, 2.2, -12, body), B(0.27, 1.2, 1.4, 0, 3.0, -12.3, stripe),
    CYL(0.75, 0.6, 3.2, 5, -0.9, 1.4, 0x9aa0a6), CYL(0.75, 0.6, 3.2, -5, -0.9, 1.4, 0x9aa0a6), CYL(0.5, 0.5, 0.2, 5, -0.9, 3.05, 0x111111), CYL(0.5, 0.5, 0.2, -5, -0.9, 3.05, 0x111111),
    B(2.4, 0.1, 14.2, 0, 1.0, 0, stripe), B(0.25, 1.4, 0.25, 0, -1.4, 4.5, 0x333333), B(0.25, 1.3, 0.25, 2.2, -1.5, 0, 0x333333), B(0.25, 1.3, 0.25, -2.2, -1.5, 0, 0x333333),
    CYL(0.4, 0.4, 0.35, 0, -2.0, 4.5, 0x111111, 'x'), CYL(0.45, 0.45, 0.4, 2.2, -2.1, 0, 0x111111, 'x'), CYL(0.45, 0.45, 0.4, -2.2, -2.1, 0, 0x111111, 'x')];
  const g = new THREE.Group(); const m = new THREE.Mesh(mergeParts(p), MAT); m.castShadow = true; g.add(m); return { g };
}
function rocketMesh() { mats(); return new THREE.Mesh(mergeParts([CYL(0.12, 0.12, 1.1, 0, 0, 0, 0x30343a), { geo: new THREE.ConeGeometry(0.12, 0.35, 10).rotateX(Math.PI / 2).translate(0, 0, 0.72), c: 0xc0392b }]), MAT); }

// ---------------- projectiles ----------------
export class Rockets {
  constructor() { this.list = []; }
  // homing: a function returning a Vector3 to steer toward (or null)
  fire(from, dir, { team = 'player', speed = 95, homing = null, size = 1.5, src = null } = {}) {
    const m = rocketMesh(); m.position.copy(from); G.scene.add(m); m.lookAt(from.clone().add(dir));
    this.list.push({ m, p: from.clone(), v: dir.clone().normalize().multiplyScalar(speed), life: 4.5, team, homing, size, src, speed });
    if (G.audio) G.audio.gunshot(from, 'heavy', team === 'player'); if (G.fx) G.fx.muzzle(from, dir, 1.6, 0xffb060);
  }
  update(dt) {
    const S = G.world.static;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const r = this.list[i]; r.life -= dt;
      let prox = null;
      if (r.homing) { const t = r.homing(); if (t) { const to = t.clone().sub(r.p); const want = to.clone().normalize().multiplyScalar(r.speed); r.v.lerp(want, clamp(dt * 7, 0, 1)).setLength(r.speed); if (to.length() < 6) prox = t.clone(); } }
      if (!prox) for (const sp of G.combat.spheres || []) if (sp.team !== r.team && sp.alive() && sp.pos.distanceTo(r.p) < sp.r + 2.5) { prox = sp.pos.clone(); break; } // proximity fuse
      if (prox) { const sp = [...(G.combat.spheres || [])].find((q) => q.team !== r.team && q.alive() && q.pos.distanceTo(r.p) < q.r + 6); if (sp) sp.hit(160 * r.size, r.p.clone(), r.src || { team: r.team }, 'rocket'); G.emit('explosion', r.p.clone(), r.size, 'rocket', r.src || null); G.scene.remove(r.m); this.list.splice(i, 1); continue; }
      const step = r.v.clone().multiplyScalar(dt); const L = step.length(); const d = step.clone().divideScalar(L || 1);
      const hs = S.raycast(r.p.x, r.p.y, r.p.z, d.x, d.y, d.z, L); const hv = G.combat.rayVehicles(r.p, d, L, r.team === 'player' ? G.player.vehicle : null); const hp = G.combat.raySpheres(r.p, d, L + 2, r.team);
      const hh = G.combat.rayHumans(r.p, d, L, r.team === 'player' ? G.player.target : null);
      if (hs || hv || hp || hh || r.life <= 0 || r.p.y < -2) {
        const at = hp ? hp.point : hv ? hv.point : hh ? hh.point : hs ? V(hs.x, hs.y, hs.z) : r.p.clone();
        if (hp) hp.sp.hit(160 * r.size, at, r.src || { team: r.team }, 'rocket');
        G.emit('explosion', at, r.size, 'rocket', r.src || null); G.scene.remove(r.m); this.list.splice(i, 1); continue;
      }
      r.p.add(step); r.m.position.copy(r.p); r.m.lookAt(r.p.clone().add(r.v));
      if (G.fx) { G.fx.smokePuff(r.p, { size: 0.7, life: 1.4, alpha: 0.35, rise: 0.3 }); if (Math.random() < 0.7) G.fx.glow.emit(r.p.x, r.p.y, r.p.z, 0, 0, 0, { life: 0.12, size: 0.5, r: 1, g: 0.7, b: 0.3, a: 1, fade: 2 }); }
    }
  }
  clear() { for (const r of this.list) G.scene.remove(r.m); this.list = []; }
}

// ---------------- player aircraft ----------------
const GUN = { id: 'minigun', name: 'Minigun', kind: 'rifle', dmg: 24, rpm: 1800, auto: true, spread: 0.012, aimSpread: 0.008, range: 320, pellets: 1, recoil: 0, kick: 0, shake: 0.05, tracer: 1 };
export class Aircraft {
  constructor(kind, { pos, yaw = 0, color, accent } = {}) {
    this.kind = kind; this.pos = pos.clone(); this.yaw = yaw; this.pitch = 0; this.roll = 0; this.vel = V(0, 0, 0); this.speed = 0; this.throttle = kind === 'plane' ? 0 : 0.5;
    this.hp = this.maxHp = kind === 'plane' ? 420 : 460; this.alive = true; this.grounded = true; this.gunT = 0; this.rocketT = 0; this.ammo = 24; this.heat = 0; this.t = 0;
    const m = kind === 'plane' ? planeMesh(color, accent) : heliMesh(color, accent); this.m = m; this.g = m.g; G.scene.add(this.g);
    this.gear = kind === 'plane' ? 2.2 : 1.45;
    this.sphere = G.combat.addSphere({ pos: this.pos, r: kind === 'plane' ? 6 : 3.6, team: 'player', alive: () => this.alive, hit: (d, p) => this.damage(d * 0.6, p) });
    this.snd = G.audio && G.audio.createLoop(kind === 'plane' ? 'fire' : 'rotor', { ref: 60, wet: 0.2 });
    this.rockets = new Rockets(); this.shooter = { isPlayer: true, team: 'player', human: G.player.human, target: G.player.target, aiming: true };
    this.sync();
  }
  get fwd() { return V(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)); }
  seat() { return this.pos; }
  damage(d, p) { if (!this.alive) return; d *= this.dmgMul ?? 1; this.hp -= d; G.cam.shake(Math.min(0.4, d / 80)); if (G.fx && p) G.fx.spark(p, V(0, 1, 0), 6, 6); if (this.hp <= 0) { if (this.invuln) this.hp = 20; else this.destroy(); } }
  destroy() { if (!this.alive) return; this.alive = false; this.hp = 0; G.emit('explosion', this.pos.clone(), 2.2, 'aircraft', null); G.emit('aircraftDown', this); }
  // pilot input → flight
  control(dt, input) {
    const K = (c) => input.key(c); const up = input.down('jump'), down = K('KeyC') || K('ControlLeft'), fwdK = input.down('up'), backK = input.down('down');
    const left = input.down('left'), right = input.down('right'), boost = input.down('sprint');
    if (this.kind === 'plane') {
      if (fwdK) this.throttle = Math.min(1, this.throttle + dt * 0.6); if (backK) this.throttle = Math.max(0, this.throttle - dt * 0.6);
      const target = 26 + this.throttle * 64 + (boost ? 34 : 0); this.speed = damp(this.speed, this.grounded && this.throttle < 0.05 ? 0 : target, this.grounded ? 0.5 : 0.8, dt);
      const rollT = (left ? 1 : 0) - (right ? 1 : 0); this.roll = damp(this.roll, rollT * 0.95, 3, dt);
      let pitchIn = (up ? 1 : 0) - (down ? 1 : 0) + clamp(-input.lookY() * 8, -1, 1);
      if (this.grounded) { if (this.speed < 34) pitchIn = Math.max(0, pitchIn) * 0; this.roll = 0; }
      this.pitch = clamp(this.pitch + pitchIn * dt * 0.65 - (pitchIn === 0 ? this.pitch * dt * 1.4 : 0), -0.75, 0.6); // gentle stick, auto-levels when released
      if (!this.grounded && this.speed < 30) this.pitch = damp(this.pitch, -0.5, 1.5, dt); // stall: nose drops
      this.yaw += this.roll * dt * 0.75 * clamp(this.speed / 50, 0.3, 1.2) + (this.grounded ? rollT * dt * 0.6 * clamp(this.speed / 10, 0, 1) : 0);
      this.speed -= Math.sin(this.pitch) * 9.8 * dt * 0.35; this.vel.copy(this.fwd).multiplyScalar(this.speed);
      if (!this.grounded) this.vel.y -= clamp(1 - this.speed / 40, 0, 1) * 9; // too slow to fly: sink
    } else {
      const sp = boost ? 52 : 34; const fwd = ((fwdK ? 1 : 0) - (backK ? 1 : 0)) * sp; const vy = ((up ? 1 : 0) - (down ? 1 : 0)) * 14;
      const turn = ((left ? 1 : 0) - (right ? 1 : 0)) * 1.5 - input.lookX() * 0.8 / Math.max(dt, 1e-3) * 0.0; this.yaw += turn * dt;
      const f = V(Math.sin(this.yaw), 0, Math.cos(this.yaw)); const want = f.multiplyScalar(fwd); want.y = vy;
      this.vel.x = damp(this.vel.x, want.x, 1.6, dt); this.vel.z = damp(this.vel.z, want.z, 1.6, dt); this.vel.y = damp(this.vel.y, want.y, 2.5, dt);
      const lf = this.vel.x * Math.sin(this.yaw) + this.vel.z * Math.cos(this.yaw); this.pitch = damp(this.pitch, -lf / 140, 3, dt); this.roll = damp(this.roll, turn * 0.18, 3, dt);
    }
    // weapons: guns (LMB / E), rockets (RMB / Q)
    this.gunT -= dt; this.rocketT -= dt; this.heat = Math.max(0, this.heat - dt * 0.35);
    if ((input.fire() || K('KeyE')) && this.gunT <= 0 && this.heat < 1) { this.gunT = 60 / GUN.rpm; this.heat += 0.012; this.shoot(); }
    if ((input.aim() || input.pressed('nextWeapon')) && this.rocketT <= 0 && this.ammo > 0) { this.rocketT = 0.35; this.ammo--; const t = this.lockTarget(); const off = (this.ammo % 2 ? 1 : -1) * (this.kind === 'plane' ? 4 : 1.8);
      const from = this.pos.clone().add(V(Math.cos(this.yaw) * off, -0.6, -Math.sin(this.yaw) * off)); this.rockets.fire(from, this.aimDir(t), { team: 'player', homing: t ? () => (t.alive() ? t.pos : null) : null, size: 1.6, src: { human: G.player.human, team: 'player' } }); }
  }
  lockTarget() { // nearest live enemy sphere / vehicle in a forward cone
    const f = this.kind === 'plane' ? this.fwd : V(Math.sin(this.yaw), -0.25, Math.cos(this.yaw)).normalize(); let best = null, bs = 0.93;
    for (const sp of G.combat.spheres || []) { if (sp.team === 'player' || !sp.alive()) continue; const d = sp.pos.clone().sub(this.pos); const L = d.length(); if (L > 420) continue; const c = d.divideScalar(L).dot(f); if (c > bs) { bs = c; best = sp; } }
    if (!best) for (const v of G.vehicles.list) { if (v.dead || !(v.ai && (v.ai.kind === 'pursuit' || v.ai.hostile))) continue; const d = v.pos.clone().sub(this.pos); const L = d.length(); if (L > 300) continue; const c = d.divideScalar(L).dot(f); if (c > bs) { bs = c; best = { pos: v.pos, alive: () => !v.dead }; } }
    return best;
  }
  aimDir(t) { const f = this.kind === 'plane' ? this.fwd : V(Math.sin(this.yaw), -0.22, Math.cos(this.yaw)).normalize(); return t ? t.pos.clone().sub(this.pos).normalize().lerp(f, 0.3).normalize() : f; }
  shoot() { const t = this.lockTarget(); const d = this.aimDir(t); const o = this.pos.clone().addScaledVector(d, this.kind === 'plane' ? 8 : 3.5).add(V(0, -0.6, 0)); G.combat.fire(this.shooter, GUN, o, d, o); }
  update(dt, input) {
    this.t += dt; const S = G.world.static;
    if (this.alive && input) this.control(dt, input);
    if (!this.alive) { this.vel.y -= 14 * dt; this.roll += dt * 2; if (G.fx) G.fx.fire(this.pos, 1.5); }
    // move + collide
    const step = this.vel.clone().multiplyScalar(dt); const L = step.length();
    if (L > 0.001) { const d = step.clone().divideScalar(L); const hit = S.raycast(this.pos.x, this.pos.y, this.pos.z, d.x, d.y, d.z, L + (this.kind === 'plane' ? 5 : 3), { noGround: true });
      if (hit && !(hit.box && hit.box.glass) && this.t - (this.hitT || -9) > 0.5) { this.hitT = this.t; const hard = this.speed > 1 ? this.speed : this.vel.length(); this.damage(clamp(hard * (this.kind === 'plane' ? 1.6 : 1.4), 6, 400), V(hit.x, hit.y, hit.z)); if (G.fx) G.fx.explosion(V(hit.x, hit.y, hit.z), 0.5); if (G.audio) G.audio.impact(V(hit.x, hit.y, hit.z), 1, 'metal'); /* visual only: the hull damage above is the cost */
        const n = V(hit.nx, hit.ny, hit.nz); this.vel.reflect(n).multiplyScalar(0.3); this.speed *= 0.35; this.pos.addScaledVector(n, 2); if (this.kind === 'plane') { this.yaw += Math.PI * 0.5 * Math.sign(Math.random() - 0.5); } }
      else this.pos.add(step); } // within the 0.5 s after a hit it keeps moving, so it can never stick inside a wall
    const gnd = S.groundAt(this.pos.x, this.pos.z, this.pos.y + 1, 0).h; const water = S.waterLevel ? S.waterLevel(this.pos.x, this.pos.z) : -99; const floor = Math.max(gnd, water > gnd ? water : -99);
    if (this.pos.y - this.gear < floor) {
      const vy = this.vel.y; this.pos.y = floor + this.gear;
      if (!this.alive) { this.done = true; return; }
      if (this.kind === 'plane') { const soft = vy > -7 && Math.abs(this.roll) < 0.4 && this.pitch > -0.25 && water < gnd; if (!soft) { this.damage(60 + Math.abs(vy) * 6, this.pos.clone()); this.vel.y = 6; } else { this.grounded = true; this.pitch = Math.max(0, this.pitch); this.vel.y = 0; } }
      else { if (vy < -12) this.damage(-vy * 3, this.pos.clone()); this.vel.y = Math.max(0, this.vel.y); this.grounded = true; }
    } else if (this.pos.y - this.gear > floor + 0.6) this.grounded = false;
    if (this.kind === 'heli') this.grounded = this.pos.y - this.gear <= floor + 0.25; // resting on any surface = landed
    if (this.kind === 'plane' && this.grounded) { this.vel.y = 0; this.pitch = Math.max(this.speed > 34 ? this.pitch : 0, 0); }
    this.pos.y = Math.min(this.pos.y, 900);
    this.sync(dt);
  }
  sync(dt = 0) {
    this.g.position.copy(this.pos); this.g.rotation.set(-this.pitch, this.yaw, -this.roll, 'YXZ');
    if (this.m.rotor) { this.m.rotor.rotation.y += dt * 40; this.m.tr.rotation.x += dt * 55; }
    if (this.snd) this.snd.update(this.pos, this.alive ? 1 : 0.4, this.kind === 'plane' ? clamp(this.speed / 60, 0.2, 1) : 18);
  }
  // chase camera
  camShot(dt) {
    const back = this.kind === 'plane' ? 22 : 15, upO = this.kind === 'plane' ? 6 : 5; const f = V(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const want = this.pos.clone().addScaledVector(f, -back).add(V(0, upO + (this.kind === 'plane' ? -this.pitch * 8 : 0), 0));
    this._cp = this._cp ? this._cp.lerp(want, clamp(dt * 5, 0, 1)) : want.clone(); const gnd = G.world.static.groundAt(this._cp.x, this._cp.z, this._cp.y + 2, 0).h; if (this._cp.y < gnd + 1.5) this._cp.y = gnd + 1.5;
    return { pos: this._cp, look: this.pos.clone().addScaledVector(this.kind === 'plane' ? this.fwd : f, 20), fov: 70 + clamp(this.speed - 50, 0, 50) * 0.25, roll: this.kind === 'plane' ? -this.roll * 0.4 : 0 };
  }
  dispose() { this.disposed = true; G.scene.remove(this.g); G.combat.removeSphere(this.sphere); if (this.snd) this.snd.dispose(); this.rockets.clear(); }
}

// put the player in / out of an aircraft (camera, controls, HUD)
export function board(craft) { const P = G.player; if (P.vehicle) P.leaveVehicleInstant(); P.riding = craft; P.human.visible = false; G.cam.custom = (dt) => craft.camShot(dt); FlightHUD.show(craft); }
export function unboard(at) { const P = G.player; P.riding = null; P.human.visible = true; G.cam.custom = null; FlightHUD.hide(); if (at) P.teleport(at.x, at.y, at.z, 0); }

// ---------------- enemy attack helicopter ----------------
export class Gunship {
  constructor(pos, { hp = 240, team = 'halcyon', color = 0x15171b, accent = 0xc0392b, aggro = 1, rockets = true, bulletMul = 0.15, rocketMul = 1 } = {}) {
    this.bulletMul = bulletMul; this.rocketMul = rocketMul; // armoured: bullets chip, rockets kill
    const m = heliMesh(color, accent); this.m = m; this.g = m.g; G.scene.add(this.g); this.pos = pos.clone(); this.vel = V(0, 0, 0); this.yaw = 0; this.t = rand(0, 10); this.hp = hp; this.maxHp = hp; this.alive = true; this.team = team;
    this.aggro = aggro; this.useRockets = rockets; this.fireT = rand(1.5, 3); this.rockT = rand(4, 8); this.orbit = rand(0, 6.28); this.rad = rand(40, 70); this.alt = rand(22, 40);
    this.sphere = G.combat.addSphere({ pos: this.pos, r: 4.2, team, alive: () => this.alive, hit: (d, p, sh, kind) => this.damage(kind === 'rocket' ? d * this.rocketMul : d * this.bulletMul, p) });
    this.snd = G.audio && G.audio.createLoop('rotor', { ref: 50, wet: 0.3 }); this.rockets = new Rockets();
    this.shooter = { isPlayer: false, team, human: null, target: null, aiming: false, inaccuracy: 1.6 / aggro };
  }
  damage(d, p) { if (!this.alive) return; this.hp -= d; if (G.fx && p) G.fx.spark(p, V(0, 1, 0), 5, 6); if (this.hp <= 0) { this.alive = false; this.spin = 0; G.emit('gunshipDown', this); if (G.fx) G.fx.explosion(this.pos, 0.9); if (G.audio) G.audio.explosion(this.pos, 0.9); if (G.stunts) G.stunts.award('GUNSHIP DOWN!', 800); } }
  update(dt, tgt) {
    this.t += dt; this.rockets.update(dt);
    if (!this.alive) { this.vel.y -= 13 * dt; this.pos.addScaledVector(this.vel, dt); this.spin += dt * 5; this.yaw += this.spin * dt; if (G.fx) { G.fx.fire(this.pos, 1.4); G.fx.smokePuff(this.pos, { size: 2, life: 2.5, color: 0.15, alpha: 0.5 }); }
      const g = G.world.static.groundAt(this.pos.x, this.pos.z, this.pos.y + 1, 0).h; if (this.pos.y < g + 1 || G.world.static.raycast(this.pos.x, this.pos.y, this.pos.z, 0, -1, 0, 1.5)) { G.emit('explosion', this.pos.clone(), 2.4, 'heli', null); this.dispose(); this.gone = true; }
      this.g.position.copy(this.pos); this.g.rotation.set(0.4, this.yaw, 0.6, 'YXZ'); return; }
    if (!tgt) return; this.orbit += dt * 0.35 * this.aggro;
    const goal = tgt.clone().add(V(Math.cos(this.orbit) * this.rad, this.alt, Math.sin(this.orbit) * this.rad)); const gnd = G.world.static.groundAt(goal.x, goal.z, 400, 0).h; goal.y = Math.max(goal.y, gnd + 18);
    const acc = goal.sub(this.pos).multiplyScalar(0.7).sub(this.vel.clone().multiplyScalar(1.2)); acc.clampLength(0, 26); this.vel.addScaledVector(acc, dt); this.pos.addScaledVector(this.vel, dt);
    this.yaw = dampAngle(this.yaw, Math.atan2(tgt.x - this.pos.x, tgt.z - this.pos.z), 2, dt);
    this.g.position.copy(this.pos); this.g.rotation.set(clamp(acc.dot(V(Math.sin(this.yaw), 0, Math.cos(this.yaw))) * 0.03, -0.35, 0.35), this.yaw, 0, 'YXZ'); this.m.rotor.rotation.y += dt * 40; this.m.tr.rotation.x += dt * 50;
    if (this.snd) this.snd.update(this.pos, 0.8, 17);
    const d = this.pos.distanceTo(tgt); const los = d < 260 && G.world.static.lineOfSight(this.pos.x, this.pos.y - 2, this.pos.z, tgt.x, tgt.y + 1, tgt.z);
    if (!los) return; this.fireT -= dt;
    if (this.fireT <= 0) { this.burst = (this.burst || 0) + 1; this.fireT = this.burst % 8 ? 0.09 : rand(1.4, 2.6) / this.aggro; const W = { id: 'rifle', kind: 'rifle', dmg: 9 * this.aggro, pellets: 1, range: 280, spread: 0.035, aimSpread: 0.035, tracer: 1, shake: 0 };
      const from = this.pos.clone().add(V(0, -1.4, 0)); const aim = tgt.clone().add(V(rand(-2, 2), rand(0, 2), rand(-2, 2))); G.combat.fire(this.shooter, W, from, aim.sub(from).normalize(), from); }
    if (this.useRockets) { this.rockT -= dt; if (this.rockT <= 0 && d > 30) { this.rockT = rand(6, 11) / this.aggro; const from = this.pos.clone().add(V(0, -1, 0)); const aim = tgt.clone().add(V(rand(-6, 6), 0, rand(-6, 6))); this.rockets.fire(from, aim.sub(from), { team: this.team, speed: 60, size: 1.1 }); } }
  }
  dispose() { G.scene.remove(this.g); G.combat.removeSphere(this.sphere); if (this.snd) this.snd.dispose(); this.rockets.clear(); }
}

// ---------------- enemy fighter: circles, then makes gun runs at you ----------------
export class EnemyJet {
  constructor(pos, { hp = 300, team = 'halcyon', color = 0x22262c, accent = 0xc0392b, aggro = 1 } = {}) {
    const m = planeMesh(color, accent); this.m = m; this.g = m.g; this.g.scale.setScalar(0.62); G.scene.add(this.g); this.pos = pos.clone(); this.yaw = rand(0, 6.28); this.pitch = 0; this.roll = 0; this.speed = 68;
    this.hp = this.maxHp = hp; this.alive = true; this.team = team; this.aggro = aggro; this.state = 'circle'; this.stT = rand(3, 7); this.fireT = 0; this.ang = rand(0, 6.28);
    this.sphere = G.combat.addSphere({ pos: this.pos, r: 5, team, alive: () => this.alive, hit: (d, p, sh, kind) => this.damage(kind === 'rocket' ? d : d * 0.3, p) });
    this.snd = G.audio && G.audio.createLoop('fire', { ref: 70, wet: 0.2 }); this.shooter = { isPlayer: false, team, human: null, target: null, inaccuracy: 1.4 / aggro };
  }
  damage(d, p) { if (!this.alive) return; this.hp -= d; if (G.fx && p) G.fx.spark(p, V(0, 1, 0), 5, 6); if (this.hp <= 0) { this.alive = false; G.emit('jetDown', this); if (G.fx) G.fx.explosion(this.pos, 1.2); if (G.audio) G.audio.explosion(this.pos, 1.2); if (G.stunts) G.stunts.award('SPLASH ONE!', 700); } }
  update(dt, tgt) {
    if (!this.alive) { this.pitch = Math.max(-1.2, this.pitch - dt * 0.6); this.roll += dt * 3; this.pos.addScaledVector(V(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)), this.speed * dt); if (G.fx) { G.fx.fire(this.pos, 1.3); G.fx.smokePuff(this.pos, { size: 2.2, life: 2.5, color: 0.12, alpha: 0.5 }); }
      const g = G.world.static.groundAt(this.pos.x, this.pos.z, this.pos.y + 1, 0).h; if (this.pos.y < g + 1) { G.emit('explosion', this.pos.clone(), 2.6, 'jet', null); this.dispose(); this.gone = true; } this.sync(); return; }
    if (!tgt) return; this.stT -= dt; const to = tgt.clone().sub(this.pos); const dist = to.length();
    let aim; if (this.state === 'circle') { this.ang += dt * 0.5; aim = tgt.clone().add(V(Math.cos(this.ang) * 220, 40, Math.sin(this.ang) * 220)); if (this.stT <= 0) { this.state = 'attack'; this.stT = 9; } }
    else { aim = tgt.clone(); if (dist < 70 || this.stT <= 0) { this.state = 'circle'; this.stT = rand(4, 8) / this.aggro; this.ang = Math.atan2(this.pos.z - tgt.z, this.pos.x - tgt.x); } }
    const gnd = G.world.static.groundAt(aim.x, aim.z, 600, 0).h; aim.y = Math.max(aim.y, gnd + 25);
    const d = aim.sub(this.pos); const wantYaw = Math.atan2(d.x, d.z), wantPitch = clamp(Math.atan2(d.y, Math.hypot(d.x, d.z)), -0.5, 0.5);
    const dy = ((wantYaw - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; this.yaw += clamp(dy, -1, 1) * dt * 1.1; this.roll = damp(this.roll, -clamp(dy, -1, 1) * 0.9, 3, dt); this.pitch = damp(this.pitch, wantPitch, 1.5, dt);
    this.pos.addScaledVector(V(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)), this.speed * dt);
    if (this.state === 'attack' && dist < 320) { const f = V(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)); if (f.dot(to.clone().normalize()) > 0.96) { this.fireT -= dt; if (this.fireT <= 0) { this.fireT = 0.08; const W = { id: 'rifle', kind: 'rifle', dmg: 7 * this.aggro, pellets: 1, range: 340, spread: 0.03, aimSpread: 0.03, tracer: 1, shake: 0 }; const o = this.pos.clone().addScaledVector(f, 5); G.combat.fire(this.shooter, W, o, tgt.clone().add(V(rand(-3, 3), rand(-2, 2), rand(-3, 3))).sub(o).normalize(), o); } } }
    this.sync();
  }
  sync() { this.g.position.copy(this.pos); this.g.rotation.set(-this.pitch, this.yaw, -this.roll, 'YXZ'); if (this.snd) this.snd.update(this.pos, this.alive ? 1 : 0.5, 0.8); }
  dispose() { G.scene.remove(this.g); G.combat.removeSphere(this.sphere); if (this.snd) this.snd.dispose(); }
}

// ---------------- door gunner: ride a scripted path, aim with mouse/arrows ----------------
export class GunnerSeat {
  constructor(craft) { this.c = craft; this.yaw = 0; this.pitch = -0.3; this.gunT = 0; this.rocketT = 0; this.ammo = 40; this.heat = 0; this.shooter = craft.shooter; }
  update(dt, input) {
    const K = (c) => input.key(c); this.yaw -= input.lookX() + ((K('ArrowLeft') || input.down('left') ? 1 : 0) - (K('ArrowRight') || input.down('right') ? 1 : 0)) * dt * 1.6;
    this.pitch = clamp(this.pitch - input.lookY() + ((K('ArrowUp') || input.down('up') ? 1 : 0) - (K('ArrowDown') || input.down('down') ? 1 : 0)) * dt * 1.2, -1.2, 0.5);
    this.gunT -= dt; this.rocketT -= dt; this.heat = Math.max(0, this.heat - dt * 0.3);
    const dir = this.aim(); if ((input.fire() || K('KeyE') || input.down('jump')) && this.gunT <= 0 && this.heat < 1) { this.gunT = 60 / GUN.rpm; this.heat += 0.009; const o = this.c.pos.clone().add(V(0, -0.8, 0)).addScaledVector(dir, 2.5); G.combat.fire(this.shooter, GUN, o, this.assist(dir), o); }
    if ((input.aim() || input.pressed('nextWeapon') || K('KeyR')) && this.rocketT <= 0 && this.ammo > 0) { this.rocketT = 0.45; this.ammo--; const o = this.c.pos.clone().add(V(0, -1, 0)).addScaledVector(dir, 2.5); const t = this.lock(dir); this.c.rockets.fire(o, this.assist(dir), { team: 'player', homing: t ? () => (t.alive() ? t.pos : null) : null, size: 1.7, src: { human: G.player.human, team: 'player' } }); }
  }
  aim() { const y = this.c.yaw + this.yaw; return V(Math.sin(y) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(y) * Math.cos(this.pitch)); }
  lock(dir) { let best = null, bs = 0.985; const consider = (pos, alive) => { const d = pos.clone().sub(this.c.pos); const L = d.length(); if (L > 380) return; const c = d.divideScalar(L).dot(dir); if (c > bs) { bs = c; best = { pos, alive }; } };
    for (const sp of G.combat.spheres || []) if (sp.team !== 'player' && sp.alive()) consider(sp.pos, sp.alive);
    for (const v of G.vehicles.list) if (!v.dead && v.ai && (v.ai.kind === 'pursuit' || v.ai.hostile)) consider(v.pos, () => !v.dead);
    for (const n of G.npcs ? G.npcs.list : []) if (n.alive && n.team !== 'player' && n.team !== 'crew') consider(n.pos.clone().setY(n.pos.y + 1), () => n.alive);
    return best; }
  assist(dir) { const t = this.lock(dir); return t ? t.pos.clone().sub(this.c.pos).normalize() : dir; } // gentle aim assist inside a tight cone
  camShot() { const d = this.aim(); const o = this.c.pos.clone().add(V(0, -0.2, 0)).addScaledVector(V(Math.cos(this.c.yaw + this.yaw), 0, -Math.sin(this.c.yaw + this.yaw)), 0); return { pos: o.clone().addScaledVector(d, -3.5).add(V(0, 0.9, 0)), look: o.clone().addScaledVector(d, 30), fov: 68 }; }
}

// ---------------- flight / gunner HUD ----------------
export const FlightHUD = {
  el: null, craft: null, gunner: null,
  show(craft, gunner = null) { this.craft = craft; this.gunner = gunner; if (!this.el) { this.el = document.createElement('div'); this.el.style.cssText = 'position:fixed;right:22px;bottom:150px;z-index:50;font:700 15px Rajdhani,system-ui,sans-serif;color:#fff;text-shadow:0 1px 3px #000;text-align:right;letter-spacing:.06em;pointer-events:none;line-height:1.35'; document.body.appendChild(this.el);
      this.x = document.createElement('div'); this.x.style.cssText = 'position:fixed;left:50%;top:50%;width:34px;height:34px;margin:-17px 0 0 -17px;border:2px solid rgba(255,211,107,.85);border-radius:50%;z-index:50;pointer-events:none;box-shadow:0 0 6px rgba(0,0,0,.6)'; document.body.appendChild(this.x); }
    this.el.style.display = 'block'; this.x.style.display = gunner ? 'block' : 'none'; },
  hide() { if (this.el) { this.el.style.display = 'none'; this.x.style.display = 'none'; } this.craft = null; this.gunner = null; },
  update() { const c = this.craft; if (!c || !this.el) return; const gnd = G.world.static.groundAt(c.pos.x, c.pos.z, c.pos.y, 0).h; const hp = Math.max(0, c.hp / c.maxHp); const col = hp > 0.5 ? '#7bd88f' : hp > 0.25 ? '#ffb02e' : '#ff3b2f';
    const ammo = this.gunner ? this.gunner.ammo : c.ammo; const heat = this.gunner ? this.gunner.heat : c.heat;
    this.el.innerHTML = `${this.extra ? this.extra + '<br>' : ''}${c.kind === 'plane' ? `SPD <b>${(c.speed * 3.6).toFixed(0)}</b> KM/H<br>THR <b>${(c.throttle * 100).toFixed(0)}%</b><br>` : ''}ALT <b>${Math.max(0, c.pos.y - gnd).toFixed(0)}</b> M<br>HULL <b style="color:${col}">${(hp * 100).toFixed(0)}%</b><br>ROCKETS <b>${ammo}</b> · GUN <b style="color:${heat > 0.8 ? '#ff3b2f' : '#fff'}">${heat > 0.95 ? 'OVERHEAT' : (100 - heat * 100).toFixed(0) + '%'}</b>`; },
};
