// GETAWAY! — player controller (on foot + driving + combat + vehicle entry/hijack/bail)
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, lerp, damp, dampAngle, wrapAngle, approach, rand } from '../core/utils.js';
import { Human, LOOKS, J } from './humanoid.js';
import { WEAPONS, WEAPON_ORDER, makeWeaponMesh, poseWeapon, muzzlePoint } from '../combat/combat.js';

const GRAV = 15.7;
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _o = new THREE.Vector3(), _d = new THREE.Vector3();
export class Player {
  constructor() {
    this.human = new Human(LOOKS.kit); this.pos = this.human.pos; this.vel = new THREE.Vector3(); this.vy = 0;
    this.health = 100; this.maxHealth = 100; this.armor = 50; this.alive = true; this.godMode = false;
    this.vehicle = null; this.entering = null; this.grounded = true; this.crouching = false; this.sprinting = false; this.aiming = false; this.swimming = false;
    this.inv = { fists: { mag: 0, res: 0 }, pistol: { mag: 15, res: 90 } }; this.weapon = 'pistol'; this.fireT = 0; this.reloading = 0;
    this.mesh = null; this.boost = 0.6; this.lastHit = 0; this.platform = null; this.stamina = 1; this.action = null; this.controlsLocked = false;
    this.money = 0; this.carrying = null; this.gres = { h: 0 };
    this.target = { human: this.human, team: 'player', alive: () => this.alive && !this.vehicle, hit: (...a) => this.hit(...a) };
    this.human.onFootstep = (sp) => { if (G.audio) G.audio.footstep(this.pos, sp > 4, this.surface === 'metal' ? 'metal' : this.surface === 'sand' ? 'sand' : this.swimming ? 'water' : 'concrete'); };
    this.camYaw = 0;
  }
  get focus() { return this.vehicle ? this.vehicle.pos : this.pos; }
  get W() { return WEAPONS[this.weapon]; }
  give(id, ammo = 60) { if (!this.inv[id]) this.inv[id] = { mag: WEAPONS[id].mag || 0, res: 0 }; this.inv[id].res += ammo; if (G.audio) G.audio.ui('pickup'); G.emit('weaponPickup', id); }
  setWeapon(id) { if (!this.inv[id]) return; this.weapon = id; this.reloading = 0; if (this.mesh) { this.mesh.parent && this.mesh.parent.remove(this.mesh); this.mesh = null; } if (id !== 'fists') { this.mesh = makeWeaponMesh(WEAPONS[id].kind); G.scene.add(this.mesh); } this.human.weapon = id === 'fists' ? null : WEAPONS[id].kind; G.emit('weaponSwitch', id); }
  teleport(x, y, z, yaw = 0) { if (this.vehicle) this.leaveVehicleInstant(); this.pos.set(x, y, z); this.vel.set(0, 0, 0); this.vy = 0; this.human.yaw = yaw; this.human.mode = 'anim'; this.human.state = 'idle'; if (G.cam) { G.cam.yaw = yaw; G.cam.pos.set(x - Math.sin(yaw) * 4, y + 2, z - Math.cos(yaw) * 4); } }
  hit(dmg, dir, point, head, source, kind, push) {
    if (!this.alive || this.godMode) return; if (source && source.team === 'player') return; dmg *= G.dmgScale ?? 1;
    if (this.vehicle) { this.vehicle.damage(dmg * 0.3, point, dir, source && source.human); dmg *= 0.25; if (this.vehicle.glassLevel < 2) dmg *= 0.5; }
    if (this.riding && !this.riding.fullDamage) { if (this.riding.damage) this.riding.damage(dmg * 0.5, point); dmg *= 0.2; } // the airframe takes it
    const a = Math.min(this.armor, dmg * 0.65); this.armor -= a; this.health -= dmg - a; this.lastHit = G.time;
    G.emit('playerDamaged', dmg, dir, source);
    if (G.cam) G.cam.shake(clamp(dmg / 60, 0.08, 0.5)); if (G.input) G.input.rumble(0.6, 0.3, 120);
    if (push && !this.vehicle) { this.human.ragdoll(push, G.world.static); this.ragT = 0; }
    if (this.health <= 0) this.die(kind);
  }
  die(kind) { if (!this.alive) return; this.alive = false; this.health = 0; if (this.vehicle) this.leaveVehicleInstant(true); if (this.human.mode !== 'ragdoll') this.human.ragdoll(_v.set(this.vel.x, 2, this.vel.z), G.world.static); G.emit('playerDied', kind); }
  revive() { this.alive = true; this.health = this.maxHealth; this.armor = Math.max(this.armor, 25); this.human.mode = 'anim'; this.human.state = 'idle'; this.ragT = 0; }

  update(dt, input) {
    const h = this.human; this.fireT -= dt;
    if (!this.alive) { h.animate(dt); this.syncWeapon(); return; }
    if (this.health < 100 && G.time - this.lastHit > 4) this.health = Math.min(100, this.health + dt * 12);
    if (this.riding) { const r = this.riding; this.pos.copy(r.seat ? r.seat() : r.pos); this.vel.set(0, 0, 0); this.vy = 0; h.visible = !!r.showHuman; return; } // in an aircraft / gunner seat
    if (this.entering) return this.updateEntering(dt, input);
    if (this.vehicle) return this.updateDriving(dt, input);
    if (h.mode === 'ragdoll') { this.ragT = (this.ragT || 0) + dt; h.animate(dt); if (h.settled || this.ragT > 4) { h.getUp(G.world.static); } this.syncWeapon(); return; }
    this.updateFoot(dt, input);
  }
  // ---------------------------------------------------------------- on foot
  updateFoot(dt, input) {
    const h = this.human, S = G.world.static, cam = G.cam; const locked = this.controlsLocked;
    // weapon selection
    if (!locked) {
      for (let i = 1; i <= 6; i++) if (input.pressed('w' + i)) { const id = WEAPON_ORDER[i]; if (this.inv[id]) this.setWeapon(id); else if (i === 1) this.setWeapon('pistol'); }
      if (input.pressed('nextWeapon') || input.wheel) { const owned = WEAPON_ORDER.filter((w) => this.inv[w]); let i = owned.indexOf(this.weapon); i = (i + (input.wheel < 0 ? -1 : 1) + owned.length) % owned.length; this.setWeapon(owned[i]); }
    }
    const W = this.W; const act = this.action;
    this.aiming = !locked && input.aim() && W.kind !== 'fists' && !this.swimming && !act && !this.carrying?.heavy;
    let mx = locked ? 0 : input.moveX(), my = locked ? 0 : input.moveY(); const mag = Math.min(1, Math.hypot(mx, my));
    if (input.pressed('crouch') && !locked) { if (this.sprinting && this.grounded && !act) this.startAction('slide', 0.9); else this.crouching = !this.crouching; }
    this.sprinting = !locked && input.down('sprint') && mag > 0.3 && !this.aiming && !this.crouching && !this.swimming && this.stamina > 0.05;
    if (this.sprinting) { this.crouching = false; this.stamina = Math.max(0, this.stamina - dt * 0.07); } else this.stamina = Math.min(1, this.stamina + dt * 0.2);
    const cy = cam.yaw; const fx = Math.sin(cy), fz = Math.cos(cy), rx = -Math.cos(cy), rz = Math.sin(cy);
    let wx = fx * my + rx * mx, wz = fz * my + rz * mx; const wl = Math.hypot(wx, wz); if (wl > 1) { wx /= wl; wz /= wl; }
    let speed = this.swimming ? 2.6 : this.aiming ? 2.7 : this.crouching ? 1.9 : this.sprinting ? 9.4 : mag < 0.5 ? 2.0 : 5.2;
    if (this.carrying && this.carrying.heavy) speed = Math.min(speed, 4.4);
    // platform (standing on vehicle roof) -> carry along
    if (this.platform && this.grounded) { const v = this.platform; this.pos.x += v.vel.x * dt; this.pos.z += v.vel.z * dt; const dy = v.yawRate * dt; if (dy) { const ox = this.pos.x - v.pos.x, oz = this.pos.z - v.pos.z; const c = Math.cos(dy), s = Math.sin(dy); this.pos.x = v.pos.x + ox * c + oz * s; this.pos.z = v.pos.z - ox * s + oz * c; h.yaw += dy; } }
    // actions (vault / mantle / slide)
    if (act) { this.updateAction(dt, wx, wz); }
    else {
      const k = this.grounded ? (this.swimming ? 3 : 14) : 4.5;
      this.vel.x = damp(this.vel.x, wx * speed, k, dt); this.vel.z = damp(this.vel.z, wz * speed, k, dt);
      if (this.aiming || (W.kind !== 'fists' && input.fire() && !locked)) h.yaw = dampAngle(h.yaw, cy, 20, dt);
      else if (wl > 0.1) h.yaw = dampAngle(h.yaw, Math.atan2(wx, wz), this.sprinting ? 9 : 12, dt);
      // jump / climb
      this.coyote = Math.max(0, (this.coyote || 0) - dt);
      if (!locked && input.pressed('jump') && !this.swimming) { if (!this.tryClimb(true) && (this.grounded || this.coyote > 0)) { this.coyote = 0; const run = Math.hypot(this.vel.x, this.vel.z); h.leap = run > 6; this.vy = h.leap ? 7.3 : 6.6; if (h.leap) { this.vel.x *= 1.15; this.vel.z *= 1.15; } this.grounded = false; h.state = 'jump'; if (G.audio) G.audio.whoosh(this.pos, 0.12, 0.3); this.platform = null; } }
      else if (!this.grounded && !this.swimming && this.vy < 2 && mag > 0.5) this.tryClimb(false);
    }
    // integrate
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    const col = S.pushCircle(this.pos.x, this.pos.z, 0.32, this.pos.y + 0.45, this.pos.y + (this.crouching ? 1.1 : 1.75));
    if (col.hit) { this.pos.x = col.x; this.pos.z = col.z; const vn = this.vel.x * col.nx + this.vel.z * col.nz; if (vn < 0) { this.vel.x -= vn * col.nx; this.vel.z -= vn * col.nz; } if (col.box && col.box.glass && this.sprinting && col.box.onBreak) col.box.onBreak(col.box, this.vel); }
    this._vehiclePush();
    // vertical
    let g = S.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.5, 0, this.gres).h; this.surface = this.gres.mat; this.platform = null;
    const plat = this._platform(); if (plat && plat.h > g && plat.h <= this.pos.y + 0.6) { g = plat.h; this.platform = plat.v; }
    const wl2 = S.waterLevel(this.pos.x, this.pos.z);
    if (wl2 - g > 1.3 && this.pos.y < wl2 - 1.0) { // swimming
      if (!this.swimming) { this.swimming = true; if (G.audio) G.audio.splash(this.pos, 0.8); if (G.fx) G.fx.splash(_v.copy(this.pos).setY(wl2), 1); this.setWeapon(this.inv.pistol ? 'pistol' : 'fists'); }
      this.pos.y = damp(this.pos.y, wl2 - 1.25, 4, dt); this.vy = 0; this.grounded = true; h.state = 'swim';
      if (G.audio) G.audio.setUnderwater(false);
    } else {
      this.swimming = false;
      if (this.grounded) { if (g < this.pos.y - 0.45) {
          this.grounded = false; this.vy = 0; this.coyote = 0.22;
          // PARKOUR ASSIST: running off a ledge = automatic full leap in the direction you're going
          const run = Math.hypot(this.vel.x, this.vel.z);
          if (run > 4.2 && this.pos.y - g > 1.2 && !act && !this.locked) { const k2 = Math.max(run, 8.8) / run; this.vel.x *= k2; this.vel.z *= k2; this.vy = 7.0; this.human.leap = true; h.state = 'jump'; this.coyote = 0; if (G.audio) G.audio.whoosh(this.pos, 0.14, 0.35); }
        } else { this.pos.y = g; this.vy = 0; } }
      if (!this.grounded) {
        this.vy -= GRAV * dt; this.pos.y += this.vy * dt; const ceil = S.ceilingAt(this.pos.x, this.pos.z, this.pos.y + 1.0); if (this.pos.y + 1.8 > ceil && this.vy > 0) this.vy = 0;
        if (this.pos.y <= g) { const impact = -this.vy; this.pos.y = g; this.grounded = true; this.vy = 0; this.onLand(impact); }
      }
      if (!act) h.state = !this.grounded ? (this.vy > 0 ? 'jump' : (this.airT > 0.6 ? 'fall' : 'jump')) : this.crouching ? 'crouch' : 'run';
    }
    this.airT = this.grounded ? 0 : (this.airT || 0) + dt;
    if (this.pos.y < -30) this.die('fall');
    h.speed = Math.hypot(this.vel.x, this.vel.z); h.vy = this.vy;
    // aim / weapons
    const camDir = cam.cam.getWorldDirection(_d);
    h.aim = this.aiming ? { kind: W.kind, pitch: Math.asin(clamp(camDir.y, -1, 1)), recoil: h.aim ? h.aim.recoil : 0 } : null;
    this.carryUpdate();
    h.animate(dt);
    this.syncWeapon();
    if (!locked) this.weaponInput(dt, input, camDir);
    // vehicle entry
    if (!locked && input.pressed('enter')) this.tryEnter();
    if (G.audio) G.audio.setUnderwater(false);
  }
  _platform() {
    const near = G.vehicles.query(this.pos.x, this.pos.z, 8, this._pn || (this._pn = [])); let best = null;
    for (const v of near) { if (v.mode !== 'drive') continue; const s = Math.sin(v.yaw), c = Math.cos(v.yaw); const dx = this.pos.x - v.pos.x, dz = this.pos.z - v.pos.z; const lx = c * dx - s * dz, lz = s * dx + c * dz; if (Math.abs(lx) < v.spec.W / 2 - 0.05 && Math.abs(lz) < v.spec.L / 2 - 0.1) { const top = v.pos.y + (v.spec.cabin && Math.abs(lz - ((v.spec.cabin.r0 + v.spec.cabin.r1) / 2 - 0.5) * v.spec.L) < (v.spec.cabin.r1 - v.spec.cabin.r0) * v.spec.L / 2 + 0.3 ? v.spec.cabin.roof : v.spec.body ? Math.max(...v.spec.body.map((b) => b[2])) * 0.95 : v.spec.H); if (!best || top > best.h) best = { h: top, v }; } }
    return best;
  }
  _vehiclePush() {
    const near = G.vehicles.query(this.pos.x, this.pos.z, 6, this._vn || (this._vn = []));
    for (const v of near) {
      if (v === this.platform) continue; if (this.pos.y > v.pos.y + v.spec.H * 0.8 || this.pos.y + 1.7 < v.pos.y) continue;
      const s = Math.sin(v.yaw), c = Math.cos(v.yaw); const dx = this.pos.x - v.pos.x, dz = this.pos.z - v.pos.z; let lx = c * dx - s * dz, lz = s * dx + c * dz;
      const hw = v.spec.W / 2 + 0.3, hl = v.spec.L / 2 + 0.3; if (Math.abs(lx) > hw || Math.abs(lz) > hl) continue;
      const rel = v.speed; if (rel > 4.5 && v.mode === 'drive') { this.getHitByVehicle(v); return; }
      if (hw - Math.abs(lx) < hl - Math.abs(lz)) lx = Math.sign(lx) * hw; else lz = Math.sign(lz) * hl;
      this.pos.x = v.pos.x + c * lx + s * lz; this.pos.z = v.pos.z - s * lx + c * lz;
    }
  }
  getHitByVehicle(v) {
    const sp = v.speed; const push = v.vel.clone().multiplyScalar(1.05); push.y = 2 + sp * 0.18;
    this.hit(clamp((sp - 4) * 3.2, 5, 90), v.vel.clone().normalize(), this.pos.clone(), false, v.driver ? { human: v.driver.human, team: v.driver.team } : null, 'vehicle', push);
    if (G.audio) G.audio.thud(this.pos, 1); G.emit('playerRunOver', v);
  }
  onLand(impact) {
    if (impact > 6 && G.audio) G.audio.footstep(this.pos, true);
    const mv = Math.hypot(this.vel.x, this.vel.z);
    this.human.leap = false;
    if (impact > 8.5 && mv > 2.5 && impact < 24) { this.startAction('roll', 0.55, { dir: new THREE.Vector3(this.vel.x / mv, 0, this.vel.z / mv), sp: Math.max(5, mv) }); if (G.audio) G.audio.whoosh(this.pos, 0.2, 0.4); G.emit('parkour', 'roll'); return; }
    if (impact > 13.5) { this.hit((impact - 13.5) * 9, _v.set(0, -1, 0), this.pos, false, null, 'fall'); if (impact > 19 && this.alive) { this.human.ragdoll(_v.set(this.vel.x, 1, this.vel.z), G.world.static); this.ragT = 0; } }
  }
  // vault over low obstacles, mantle up ledges
  tryClimb(pressed) {
    const S = G.world.static; const h = this.human; const fx = Math.sin(h.yaw), fz = Math.cos(h.yaw);
    for (const probeY of [0.6, 1.1, 1.7]) {
      const oy = this.pos.y + probeY; const hit = S.raycast(this.pos.x, oy, this.pos.z, fx, 0, fz, 0.95, { noGround: true });
      if (!hit || !hit.box || !hit.box.surface) continue; const b = hit.box; const top = b.maxY; const dh = top - this.pos.y;
      if (dh < 0.4) continue;
      if (dh > 3.1 && !(b.climb && dh < 3.6)) return false;
      // vault if thin and low
      const depth = Math.abs(fx) > Math.abs(fz) ? (b.maxX - b.minX) : (b.maxZ - b.minZ);
      const land = new THREE.Vector3(hit.x + fx * 0.45, top, hit.z + fz * 0.45);
      const clear = S.pushCircle(land.x, land.z, 0.28, top + 0.1, top + 1.6); if (clear.hit) return false;
      if (dh < 1.5 && depth < 1.7 && Math.hypot(this.vel.x, this.vel.z) > 4) {
        const beyond = new THREE.Vector3(hit.x + fx * (depth + 0.7), 0, hit.z + fz * (depth + 0.7)); beyond.y = S.groundAt(beyond.x, beyond.z, top + 0.2, 0).h;
        this.startAction('vault', 0.5, { from: this.pos.clone(), to: beyond, top }); return true;
      }
      if (!pressed && dh > 2.2) return false;
      this.startAction('mantle', dh > 1.4 ? 0.5 : 0.32, { from: this.pos.clone(), to: land }); return true;
    }
    return false;
  }
  startAction(name, dur, data = {}) { this.action = { name, t: 0, dur, ...data }; if (name === 'slide') { const f = Math.hypot(this.vel.x, this.vel.z) || 1; this.action.dir = new THREE.Vector3(this.vel.x / f, 0, this.vel.z / f); if (G.audio) G.audio.whoosh(this.pos, 0.2, 0.6); } if (name === 'mantle' || name === 'vault') { this.vy = 0; if (G.audio) G.audio.whoosh(this.pos, 0.18, 0.3); G.emit('parkour', name); } }
  updateAction(dt, wx, wz) {
    const a = this.action, h = this.human; a.t += dt; const k = clamp(a.t / a.dur, 0, 1);
    if (a.name === 'slide') { const sp = lerp(11, 3.5, k); this.vel.x = a.dir.x * sp; this.vel.z = a.dir.z * sp; h.state = 'slide'; this.crouching = false; if (G.fx && Math.random() < 0.6) G.fx.dust(this.pos, 1, 0.9, 0.7); }
    else if (a.name === 'roll') { h.state = 'crouch'; h.tumble = Math.min(1, k * 1.1) * Math.PI * 2; this.vel.x = a.dir.x * a.sp * 0.95; this.vel.z = a.dir.z * a.sp * 0.95; }
    else if (a.name === 'mantle') { this.vel.set(0, 0, 0); const e = k < 0.6 ? k / 0.6 : 1; this.pos.y = lerp(a.from.y, a.to.y, Math.sin(e * Math.PI / 2)); const e2 = clamp((k - 0.4) / 0.6, 0, 1); this.pos.x = lerp(a.from.x, a.to.x, e2); this.pos.z = lerp(a.from.z, a.to.z, e2); h.state = 'mantle'; h.stateT = k; this.grounded = true; this.vy = 0; }
    else if (a.name === 'vault') { this.vel.set(0, 0, 0); this.pos.x = lerp(a.from.x, a.to.x, k); this.pos.z = lerp(a.from.z, a.to.z, k); this.pos.y = lerp(a.from.y, a.to.y, k) + Math.sin(k * Math.PI) * (a.top - a.from.y + 0.3); h.state = 'vault'; this.grounded = true; this.vy = 0; }
    if (a.t >= a.dur) { this.action = null; h.tumble = 0; if (a.name === 'mantle' || a.name === 'vault') { this.pos.copy(a.to); this.grounded = true; } }
  }
  carryUpdate() { this.human.carryBag = !!(this.carrying && this.carrying.bag); }
  syncWeapon() {
    if (!this.mesh) return; const h = this.human; this.mesh.visible = !this.vehicle || this.driveAim;
    if (this.mesh.visible) { poseWeapon(this.mesh, h, this.aiming || this.driveAim ? G.cam.cam.getWorldDirection(_w) : null); this.mesh.updateMatrixWorld(); }
  }
  weaponInput(dt, input, camDir) {
    const W = this.W, inv = this.inv[this.weapon], h = this.human;
    if (this.reloading > 0) { this.reloading -= dt; if (this.reloading <= 0) { const need = W.mag - inv.mag; const take = Math.min(need, inv.res); inv.mag += take; inv.res -= take; } return; }
    if (W.melee || this.weapon === 'fists') { if ((input.firePressed() || input.pressed('melee')) && this.fireT <= 0) { this.fireT = 0.45; h.upper = { name: 'punch', dur: 0.4, right: Math.random() < 0.5 }; h.upperT = 0; setTimeout(() => G.combat.melee({ human: h, target: this.target, team: 'player' }), 150); } return; }
    if (input.pressed('melee') && this.fireT <= 0) { this.fireT = 0.5; h.upper = { name: 'punch', dur: 0.4, right: false }; h.upperT = 0; setTimeout(() => G.combat.melee({ human: h, target: this.target, team: 'player' }, 1.6, 45), 150); return; }
    if (input.pressed('reload') && inv.mag < W.mag && inv.res > 0) return this.startReload();
    const want = W.auto ? input.fire() : input.firePressed();
    if (want && this.fireT <= 0) {
      if (inv.mag <= 0) { if (G.audio) G.audio.dryFire(); this.fireT = 0.25; if (inv.res > 0) this.startReload(); return; }
      this.shoot(camDir); inv.mag--; this.fireT = 60 / W.rpm;
      if (inv.mag === 0 && inv.res > 0) setTimeout(() => this.reloading <= 0 && this.startReload(), 250);
    }
  }
  startReload() { const W = this.W; this.reloading = W.reload; this.human.upper = { name: 'reload', dur: W.reload }; this.human.upperT = 0; if (G.audio) G.audio.reload(this.pos, W.kind); }
  shoot(camDir) {
    const W = this.W; const cam = G.camera; if (!this.mesh) return;
    // aim point: what the crosshair looks at
    const o = cam.position; const hit = G.world.static.raycast(o.x, o.y, o.z, camDir.x, camDir.y, camDir.z, W.range + 10);
    const aimPt = hit ? new THREE.Vector3(hit.x, hit.y, hit.z) : o.clone().addScaledVector(camDir, W.range);
    const hh = G.combat.rayHumans(o, camDir, hit ? hit.t : W.range, this.target); if (hh) aimPt.copy(hh.point);
    const hv = G.combat.rayVehicles(o, camDir, hh ? hh.t : hit ? hit.t : W.range, this.vehicle); if (hv) aimPt.copy(hv.point);
    this.mesh.updateMatrixWorld(); const mz = muzzlePoint(this.mesh, W.kind);
    const origin = this.vehicle ? mz.clone() : new THREE.Vector3(this.pos.x, this.human.joint(J.rSh).y, this.pos.z).lerp(mz, 0.6);
    const dir = aimPt.clone().sub(origin).normalize();
    G.combat.fire({ human: this.human, team: 'player', isPlayer: true, target: this.target, aiming: this.aiming || this.driveAim, moving: Math.hypot(this.vel.x, this.vel.z) > 3, vehicle: this.vehicle }, W, origin, dir, mz);
    if (this.human.aim) this.human.aim.recoil = (this.human.aim.recoil || 0) + W.recoil; G.cam.pitch += W.kick; G.cam.yaw += rand(-1, 1) * W.kick * 0.4;
    G.emit('crime', { type: 'gunfire', pos: this.pos.clone(), sev: 2 });
  }
  // ---------------------------------------------------------------- vehicles
  nearestVehicle(r = 4.5) {
    const near = G.vehicles.query(this.pos.x, this.pos.z, r + 3, []); let best = null, bd = 1e9;
    for (const v of near) { if (v.dead || v.drowned || (v.flipped && !v.spec.bike) || v.noEnter) continue; const d = v.pos.distanceTo(this.pos) - v.spec.W * 0.5; if (d < r && d < bd && Math.abs(v.pos.y - this.pos.y) < 2.5) { bd = d; best = v; } }
    return best;
  }
  tryEnter() {
    if (this.platform && this.platform.speed > 2 && !this.platform.spec.bike) { const v = this.platform; this.beginEnter(v, true); return; }
    const v = this.nearestVehicle(); if (v) this.beginEnter(v, false);
  }
  beginEnter(v, fromRoof) {
    const s = Math.sin(v.yaw), c = Math.cos(v.yaw); const dx = this.pos.x - v.pos.x, dz = this.pos.z - v.pos.z; const lx = c * dx - s * dz;
    const side = v.spec.bike ? 1 : 1; // driver door on the left (+x)
    const occupied = v.hasDriver && !v.isPlayer && !v.dead;
    this.entering = { v, t: 0, side, fromRoof, occupied, dur: v.spec.bike ? 0.55 : occupied ? 1.35 : 0.9, yanked: false, start: this.pos.clone() };
    v.hazard = false; if (v.ai) v.ai.state = 'abandoned';
    G.emit('enterVehicle', v, occupied);
  }
  updateEntering(dt, input) {
    const e = this.entering, v = e.v, h = this.human; e.t += dt; if (input.pressed('enter') && e.t > 0.15) e.t = Math.max(e.t, e.dur - 0.15); // skip
    const W2 = v.spec.W / 2; const door = v.local(W2 + 0.55, (v.spec.cabin ? (v.spec.cabin.r0 - 0.5) * v.spec.L + 0.2 : 0), _o); door.y = v.pos.y;
    const k1 = clamp(e.t / 0.3, 0, 1);
    if (!e.fromRoof) { this.pos.lerpVectors(e.start, door, k1); h.yaw = dampAngle(h.yaw, v.yaw - Math.PI / 2, 12, dt); } else { this.pos.lerp(door, 0.2); this.pos.y = lerp(this.pos.y, v.pos.y, 0.2); }
    h.state = e.t < 0.3 ? 'run' : 'idle'; h.speed = e.t < 0.3 ? 4 : 0;
    if (e.t > 0.25 && !e.doorOpen) { e.doorOpen = true; v.setDoor(1, true); if (G.audio) G.audio.door(v.pos, true); }
    if (e.occupied && e.t > 0.5 && !e.yanked) { e.yanked = true; h.upper = { name: 'punch', dur: 0.35, right: true }; h.upperT = 0; if (G.peds) G.peds.ejectDriver(v, this); v.hasDriver = false; G.emit('crime', { type: 'carjack', pos: v.pos.clone(), sev: v.isPolice() ? 3 : 1, vehicle: v }); }
    h.animate(dt); this.syncWeapon();
    if (e.t >= e.dur) { this.entering = null; this.enterVehicle(v); setTimeout(() => { v.setDoor(1, false); if (G.audio) G.audio.door(v.pos, false); }, 250); }
  }
  enterVehicle(v) {
    if (v.ai && G.traffic) { const i = G.traffic.cars.indexOf(v); if (i >= 0) G.traffic.cars.splice(i, 1); const j = G.traffic.parked.indexOf(v); if (j >= 0) G.traffic.parked.splice(j, 1); }
    if (v.parkSpot) { v.parkSpot.taken = false; v.parkSpot = null; }
    v.ai = null; v.isPlayer = true; v.parked = false; v.engineOn = true; v.driver = this; v.hasDriver = false; v.keep = true; this.vehicle = v; G.vehicles.playerVehicle = v;
    this.human.state = v.spec.bike ? 'ride' : 'sit'; this.aiming = false; this.crouching = false;
    G.cam.yaw = v.yaw; if (!v.boost) v.boost = this.boost;
    G.emit('playerEnteredVehicle', v);
  }
  leaveVehicleInstant(dead = false) {
    const v = this.vehicle; if (!v) return; v.isPlayer = false; v.driver = null; v.ctrl.throttle = 0; v.ctrl.brake = v.speed < 3 ? 1 : 0; v.ctrl.steer = 0; v.ctrl.boost = false; v.engineOn = v.speed > 3; this.vehicle = null; G.vehicles.playerVehicle = null; this.boost = v.boost; this.driveAim = false;
    this.human.visible = true; this.human.mode = 'anim'; const cpos = v.rigid ? v.rigid.pos : v.pos; const sy0 = v.rigid ? Math.atan2(new THREE.Vector3(0, 0, 1).applyQuaternion(v.rigid.quat).x, new THREE.Vector3(0, 0, 1).applyQuaternion(v.rigid.quat).z) : v.yaw;
    const p = new THREE.Vector3(cpos.x + Math.cos(sy0) * (v.spec.W / 2 + 0.8), 0, cpos.z - Math.sin(sy0) * (v.spec.W / 2 + 0.8)); this.pos.set(p.x, G.world.static.groundAt(p.x, p.z, cpos.y + 2, 0.5).h, p.z); const col = G.world.static.pushCircle(this.pos.x, this.pos.z, 0.35, this.pos.y + 0.4, this.pos.y + 1.7); if (col.hit) { const q = v.local(-v.spec.W / 2 - 0.7, 0); this.pos.set(q.x, v.pos.y, q.z); }
    this.human.state = 'idle'; this.human.yaw = v.yaw; this.vel.set(0, 0, 0); this.grounded = false; this.vy = 0;
    G.emit('playerExitedVehicle', v, dead);
  }
  updateDriving(dt, input) {
    const v = this.vehicle, c = v.ctrl, h = this.human; const locked = this.controlsLocked;
    const sx = locked ? 0 : input.moveX();
    const kb = !input.usingPad; if (kb) c.steer = approach(c.steer, sx, (Math.sign(sx) !== Math.sign(c.steer) || sx === 0 ? 10 : 6) * dt); else c.steer = sx;
    c.throttle = locked ? 0 : input.throttle(); c.brake = locked ? (v.speed > 1 ? 0.6 : 1) : input.brake(); c.handbrake = !locked && input.down('handbrake');
    const wantBoost = !locked && input.down('boost') && c.throttle > 0.1;
    if (!locked && v.spec.thrusters && input.down('boost') && input.pressed('handbrake') && v.thrusterHop()) { c.handbrake = false; G.stunts && G.stunts.award('THRUSTER HOP', 150); }
    c.boost = (wantBoost || (v.spec.thrusters && v.airborne && input.down('boost'))) && v.boost > 0.02; if (c.boost) v.boost = Math.max(0, v.boost - dt * (v.spec.thrusters ? 0.2 : 0.28));
    c.airPitch = v.airborne ? input.moveY() : 0; c.airRoll = v.airborne ? -input.moveX() : 0;
    if (!locked && input.pressed('horn') && G.audio) G.audio.horn(v.pos, 0.35);
    if (!locked && input.key('KeyH') && v.isPolice()) v.siren = true;
    if (!locked && input.pressed('interact') && v.isUpsideDown() && v.speed < 6) { v.flipUpright(); v.vel.y = 2; G.emit('flipped', v); if (G.audio) G.audio.impact(v.pos, 0.5, 'metal'); }
    // drive-by
    this.driveAim = !locked && input.aim() && !v.spec.bike !== undefined; const W = WEAPONS[this.weapon === 'fists' || this.weapon === 'shotgun' || this.weapon === 'rifle' || this.weapon === 'heavy' ? (this.inv.smg ? 'smg' : 'pistol') : this.weapon];
    if (this.driveAim && this.inv.pistol) {
      if (!this.mesh || this.human.weapon !== W.kind) this.setWeapon(W.id);
      const inv = this.inv[W.id]; const camDir = G.cam.cam.getWorldDirection(_d);
      if (this.reloading > 0) { this.reloading -= dt; if (this.reloading <= 0) { const take = Math.min(W.mag - inv.mag, inv.res); inv.mag += take; inv.res -= take; } }
      else if ((W.auto ? input.fire() : input.firePressed()) && this.fireT <= 0) { if (inv.mag > 0) { this.shoot(camDir); inv.mag--; this.fireT = 60 / W.rpm; } else if (inv.res > 0) this.startReload(); }
    }
    // seat the visible driver
    const seat = v.spec.bike ? v.local(0, -0.1) : v.local(v.spec.W * 0.19, (v.spec.cabin.r0 - 0.5) * v.spec.L + 0.15);
    h.pos.set(seat.x, v.pos.y + (v.spec.bike ? 0.05 : Math.max(0.45, v.spec.cabin.belt - 0.55) - 0.48 + v.heave), seat.z); h.yaw = v.yaw;
    h.state = v.spec.bike ? 'ride' : 'sit'; h.speed = 0; h.aim = this.driveAim ? { kind: W.kind, pitch: 0 } : null; h.visible = !v.spec.bike ? v.mode === 'drive' : true;
    if (v.mode === 'drive') h.animate(dt); this.syncWeapon();
    // exit / bail
    if (!locked && input.pressed('enter')) {
      if (v.speed < 9 || v.flipped) { v.setDoor(1, true); this.leaveVehicleInstant(); setTimeout(() => v.setDoor(1, false), 900); }
      else this.bail(v);
    }
    if (v.drowned && v.pos.y < -2) { this.leaveVehicleInstant(); this.pos.y = -1.5; }
  }
  bail(v) {
    const vel = v.vel.clone(); this.leaveVehicleInstant(); const side = new THREE.Vector3(Math.cos(v.yaw), 0, -Math.sin(v.yaw)).multiplyScalar(5);
    this.human.visible = true; this.human.ragdoll(vel.multiplyScalar(0.75).add(side).setY(4), G.world.static, 2); this.ragT = 0;
    this.hit(clamp(v.speed * 0.6, 4, 25), side, this.pos, false, null, 'bail');
    if (G.audio) G.audio.whoosh(this.pos, 0.6, 0.6); G.emit('bailout', v);
  }
}
