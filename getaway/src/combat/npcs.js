// GETAWAY! — armed NPCs (police, SWAT, Halcyon contractors, thugs): cover, peek & shoot, flank,
// retreat, drive-by shooting from vehicles, arrests. Difficulty comes from tactics, not bullet sponges.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, rand, chance, dampAngle, pick, lerp } from '../core/utils.js';
import { Human, LOOKS, J } from '../characters/humanoid.js';
import { WEAPONS, makeWeaponMesh, poseWeapon, muzzlePoint } from './combat.js';

const KINDS = {
  police: { look: () => LOOKS.police(), hp: 80, armor: 0, acc: 0.42, weapons: ['pistol', 'pistol', 'shotgun'], team: 'police', speed: 4.6, burst: [1, 3] },
  swat: { look: () => LOOKS.swat(), hp: 90, armor: 60, acc: 0.55, weapons: ['rifle', 'smg'], team: 'police', speed: 4.8, burst: [3, 6] },
  halcyon: { look: () => LOOKS.halcyon(), hp: 85, armor: 30, acc: 0.5, weapons: ['smg', 'rifle', 'pistol'], team: 'halcyon', speed: 5.0, burst: [3, 7] },
  guard: { look: () => ({ ...LOOKS.police(), shirt: 0x5d6d7e, pants: 0x2c3e50, hatColor: 0x2c3e50 }), hp: 70, armor: 0, acc: 0.3, weapons: ['pistol'], team: 'guard', speed: 4.4, burst: [1, 2] },
  thug: { look: () => LOOKS.thug(), hp: 70, armor: 0, acc: 0.33, weapons: ['pistol', 'smg', 'shotgun'], team: 'thug', speed: 5.0, burst: [2, 5] },
};
const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();

export class Combatant {
  constructor(kind, x, y, z, yaw = 0, opts = {}) {
    const K = this.K = KINDS[kind]; this.kind = kind; this.team = K.team; this.human = new Human(opts.look || K.look(), { x, y, z, yaw }); this.pos = this.human.pos;
    this.hp = (opts.hp || K.hp); this.maxHp = this.hp; this.armor = K.armor; this.alive = true; this.state = opts.state || 'engage'; this.stateT = 0; this.t = rand(0, 2);
    this.weaponId = opts.weapon || pick(K.weapons); this.W = WEAPONS[this.weaponId]; this.mag = this.W.mag; this.fireT = rand(0.5, 1.5); this.burstLeft = 0; this.reloadT = 0;
    this.mesh = makeWeaponMesh(this.W.kind); G.scene.add(this.mesh); this.human.weapon = this.W.kind;
    this.cover = null; this.peek = false; this.engagedT = 0; this.role = opts.role || (chance(0.3) ? 'flank' : 'hold'); this.acc = (opts.acc ?? K.acc); this.seat = null; this.vehicle = null;
    this.lastSeen = null; this.seesPlayer = false; this.stuckT = 0; this.lastPos = new THREE.Vector3(x, y, z); this.calm = opts.calm || false; this.speed = K.speed; this.gres = { h: 0 };
    this.target = { human: this.human, team: this.team, npc: this, alive: () => this.alive, hit: (...a) => this.hit(...a) };
    G.combat.addTarget(this.target);
  }
  hit(dmg, dir, point, head, src, kind, push) {
    if (!this.alive) return; if (src && src.team === this.team && kind !== 'explosion' && kind !== 'vehicle') return;
    const ab = Math.min(this.armor, dmg * (head ? 0.2 : 0.6)); this.armor -= ab; this.hp -= dmg - ab; this.calm = false; this.alert();
    if (this.seat && this.vehicle) { if (this.hp <= 0) this.die(dir, push); return; }
    if (this.hp <= 0) return this.die(dir, push, kind);
    if (push || dmg > 45) { this.human.ragdoll(push || dir.clone().multiplyScalar(3).setY(1.5), G.world.static); this.state = 'ragdoll'; this.stateT = 0; }
    else { this.human.upper = { name: 'hit', dur: 0.35 }; this.human.upperT = 0; this.fireT = Math.max(this.fireT, 0.4); if (this.cover && this.peek) this.peek = false; }
    G.emit('npcHit', this, dmg, head, src);
  }
  die(dir, push, kind) {
    this.alive = false; this.state = 'dead'; this.mesh.visible = false;
    if (this.seat) { this.leaveVehicle(); }
    this.human.ragdoll(push || (dir ? dir.clone().multiplyScalar(kind === 'shotgun' ? 6 : 3).setY(1.2) : _v.set(0, 1, 0)), G.world.static, rand(-2, 2));
    G.emit('npcDied', this, kind); G.combat.removeTarget(this.target);
  }
  alert() { if (this.passive) return; if (this.state === 'idle' || this.state === 'patrol' || this.calm) { this.state = 'engage'; this.calm = false; } }
  enterVehicleSeat(v, seat) { this.vehicle = v; this.seat = seat; this.human.state = 'sit'; (v.crew || (v.crew = [])).push(this); }
  leaveVehicle() {
    const v = this.vehicle; if (!v) return; const side = this.seat.x > 0 ? 1 : -1; const p = v.local(side * (v.spec.W / 2 + 0.8), this.seat.z);
    this.pos.set(p.x, v.pos.y, p.z); this.human.yaw = v.yaw; this.human.state = 'idle'; this.human.visible = true; if (v.crew) v.crew.splice(v.crew.indexOf(this), 1); this.vehicle = null; this.seat = null; this.state = this.alive ? 'engage' : 'dead';
  }
  // ---------------------------------------------------------------- AI
  update(dt) {
    const h = this.human; this.t += dt; this.fireT -= dt; this.stateT += dt;
    if (this.state === 'dead') { h.animate(dt); return; }
    if (this.state === 'ragdoll') { h.animate(dt); if (h.settled || this.stateT > 3.5) { h.getUp(G.world.static); this.state = 'engage'; this.stateT = 0; } this.mesh.visible = false; return; }
    const P = G.player; const ptarget = P.vehicle ? P.vehicle.pos : P.pos; const tgtH = P.vehicle ? 1.0 : (P.crouching ? 0.9 : 1.3);
    // perception
    const eye = _a.set(this.pos.x, this.pos.y + (this.peek || !this.cover ? 1.6 : 1.0), this.pos.z); if (this.seat) eye.copy(this.vehicle.local(this.seat.x, this.seat.z)).setY(this.vehicle.pos.y + 1.3);
    const dist = Math.hypot(ptarget.x - this.pos.x, ptarget.z - this.pos.z);
    this.seesPlayer = P.alive && dist < 90 && (this.t * 7 % 1 < 0.5 ? (this._los = G.world.static.lineOfSight(eye.x, eye.y, eye.z, ptarget.x, ptarget.y + tgtH, ptarget.z)) : this._los);
    if (this.passive) this.seesPlayer = false; // scripted bystander (mission-controlled), never reacts on sight
    if (this.seesPlayer) { this.lastSeen = ptarget.clone(); this.engagedT += dt; this.alert(); } else this.engagedT = Math.max(0, this.engagedT - dt * 0.5);
    if (this.seat) return this.updateSeated(dt, dist);
    if (this.calm) { h.state = 'idle'; h.speed = 0; h.animate(dt); this._weapon(); return; }
    // arrest attempt (police, player unarmed / surrendering)
    const canArrest = this.team === 'police' && G.police && G.police.arrestable() && !P.vehicle && dist < 25;
    let goal = null, speed = 0, faceP = this.seesPlayer || dist < 30;
    if (canArrest) { goal = ptarget; speed = dist > 3 ? this.speed : 0; this.cover = null; if (dist < 1.8) G.police.arrestTick(dt, this); }
    else if (this.state === 'engage' || this.state === 'cover') {
      const hurt = this.hp < this.maxHp * 0.35;
      if (!this.cover || this.stateT > rand(7, 12) || (this.cover && this._coverCompromised(ptarget)) || (hurt && !this.retreated)) { this.cover = this.findCover(ptarget, hurt); this.stateT = 0; this.peek = false; if (hurt) this.retreated = true; }
      if (this.cover) { const d = Math.hypot(this.cover.x - this.pos.x, this.cover.z - this.pos.z); if (d > 0.6) { goal = this.cover; speed = this.speed; this.peek = true; } else { // at cover: peek cycle
          this.peekT = (this.peekT ?? rand(0.5, 1.5)) - dt; if (this.peekT <= 0) { this.peek = !this.peek; this.peekT = this.peek ? rand(1.2, 2.6) : rand(0.8, 2.2); if (this.peek) this.burstLeft = Math.round(rand(...this.K.burst)); } } }
      else if (!this.seesPlayer && this.lastSeen) { goal = this.lastSeen; speed = this.speed; this.peek = true; }
      else { this.peek = true; if (dist > 22) { goal = ptarget; speed = this.speed * 0.8; } }
    }
    // movement
    if (goal) {
      let dx = goal.x - this.pos.x, dz = goal.z - this.pos.z; const dl = Math.hypot(dx, dz);
      if (dl > 0.3) {
        dx /= dl; dz /= dl; if (this.detour > 0) { this.detour -= dt; const s = this.detourSide; const ndx = dx * 0.3 - dz * s, ndz = dz * 0.3 + dx * s; dx = ndx; dz = ndz; }
        const st = Math.min(speed * dt, dl); this.pos.x += dx * st; this.pos.z += dz * st; h.speed = speed; if (!faceP || dl > 6) h.yaw = dampAngle(h.yaw, Math.atan2(dx, dz), 10, dt);
        if (this.t % 0.5 < dt) { if (this.lastPos.distanceTo(this.pos) < speed * 0.12) { this.detour = 0.8; this.detourSide = chance(0.5) ? 1 : -1; } this.lastPos.copy(this.pos); }
      } else h.speed = 0;
    } else h.speed = 0;
    const c = G.world.static.pushCircle(this.pos.x, this.pos.z, 0.32, this.pos.y + 0.45, this.pos.y + 1.7); if (c.hit) { this.pos.x = c.x; this.pos.z = c.z; }
    for (const v of G.vehicles.query(this.pos.x, this.pos.z, 5, this._vq || (this._vq = []))) { const s = Math.sin(v.yaw), cc = Math.cos(v.yaw); const dx = this.pos.x - v.pos.x, dz = this.pos.z - v.pos.z; let lx = cc * dx - s * dz, lz = s * dx + cc * dz; const hw = v.spec.W / 2 + 0.35, hl = v.spec.L / 2 + 0.35; if (Math.abs(lx) < hw && Math.abs(lz) < hl && Math.abs(this.pos.y - v.pos.y) < 1.5) { if (v.speed > 5 && v.mode === 'drive') { this.hit(v.speed * 4, v.vel.clone().normalize(), this.pos, false, v.driver || null, 'vehicle', v.vel.clone().multiplyScalar(1.1).setY(3)); if (G.audio) G.audio.thud(this.pos, 1); G.emit('npcRunOver', this, v); return; } if (hw - Math.abs(lx) < hl - Math.abs(lz)) lx = Math.sign(lx) * hw; else lz = Math.sign(lz) * hl; this.pos.x = v.pos.x + cc * lx + s * lz; this.pos.z = v.pos.z - s * lx + cc * lz; } }
    this.pos.y = G.world.static.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.6, 0, this.gres).h;
    if (faceP) h.yaw = dampAngle(h.yaw, Math.atan2(ptarget.x - this.pos.x, ptarget.z - this.pos.z), 8, dt);
    // stance & shooting
    const inCover = this.cover && Math.hypot(this.cover.x - this.pos.x, this.cover.z - this.pos.z) < 0.7;
    h.state = inCover && !this.peek ? 'crouch' : 'run';
    const aiming = this.seesPlayer && (!inCover || this.peek) && !canArrest && dist < this.W.range * 0.9;
    h.aim = aiming || canArrest ? { kind: this.W.kind, pitch: Math.atan2(ptarget.y + tgtH - (this.pos.y + 1.45), Math.max(1, dist)), recoil: h.aim ? h.aim.recoil : 0 } : null;
    h.animate(dt); this._weapon();
    if (aiming && !canArrest) this.tryShoot(dt, ptarget, tgtH, dist);
  }
  updateSeated(dt, dist) {
    const v = this.vehicle; const h = this.human; if (!v || v.dead) { this.leaveVehicle(); return; }
    const p = v.local(this.seat.x, this.seat.z); h.pos.set(p.x, v.pos.y + (this.seat.y ?? 0.1), p.z); h.yaw = v.yaw; h.visible = v.mode === 'drive';
    const P = G.player; const tp = P.vehicle ? P.vehicle.pos : P.pos;
    const lean = this.seat.shooter && this.seesPlayer && dist < 70;
    if (lean) { const ang = Math.atan2(tp.x - p.x, tp.z - p.z); h.yaw = ang; h.state = 'idle'; h.pos.y += 0.35; h.aim = { kind: this.W.kind, pitch: Math.atan2(tp.y + 1 - h.pos.y - 1.4, Math.max(1, dist)) }; }
    else { h.state = 'sit'; h.aim = null; }
    h.speed = 0; h.animate(dt); this._weapon();
    if (lean) this.tryShoot(dt, tp, 1.0, dist, 0.6);
    if (v.speed < 1 && (v.stoppedT = (v.stoppedT || 0) + dt) > 1.5 && dist < 60 && this.seat.canExit !== false) { this.leaveVehicle(); }
  }
  tryShoot(dt, tp, tgtH, dist, accMul = 1) {
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) this.mag = this.W.mag; return; }
    if (this.fireT > 0) return; if (this.cover && this.burstLeft <= 0 && !this.seat) return;
    if (this.mag <= 0) { this.reloadT = this.W.reload * 1.3; this.human.upper = { name: 'reload', dur: this.W.reload }; this.human.upperT = 0; if (G.audio) G.audio.reload(this.pos); return; }
    const W = this.W; this.fireT = 60 / W.rpm * (W.auto ? 1.15 : rand(1.6, 2.6)); this.mag--; this.burstLeft--;
    const P = G.player; const warm = clamp(this.engagedT / 1.8, 0.15, 1); const pmov = P.vehicle ? clamp(1 - P.vehicle.speed / 45, 0.3, 1) : clamp(1 - Math.hypot(P.vel.x, P.vel.z) / 14, 0.45, 1);
    const acc = this.acc * accMul * warm * pmov * clamp(1.3 - dist / 70, 0.3, 1.2) * (P.crouching ? 0.7 : 1) * (G.police ? G.police.difficulty : 1) * (G.enemyAcc ?? 1);
    this.mesh.updateMatrixWorld(); const mz = muzzlePoint(this.mesh, W.kind);
    const aim = _b.set(tp.x, tp.y + tgtH, tp.z); if (Math.random() > acc) { const off = rand(0.7, 1.8); aim.x += rand(-1, 1) * off; aim.y += rand(-0.3, 1.2) * off; aim.z += rand(-1, 1) * off; }
    const dir = aim.sub(mz).normalize();
    G.combat.fire({ human: this.human, team: this.team, target: this.target, vehicle: this.vehicle, inaccuracy: 0.6 }, W, mz.clone(), dir, mz.clone());
    if (this.human.aim) this.human.aim.recoil = (this.human.aim.recoil || 0) + W.recoil * 0.6;
  }
  _weapon() { const h = this.human; const vis = h.visible && h.mode !== 'ragdoll' && (!this.seat || h.aim); this.mesh.visible = vis; if (vis) { poseWeapon(this.mesh, h, h.aim ? _v.set(Math.sin(h.yaw), Math.sin(h.aim.pitch), Math.cos(h.yaw)).normalize() : null); this.mesh.updateMatrixWorld(); } }
  _coverCompromised(tp) { const c = this.cover; return Math.hypot(this.cover.x - this.pos.x, this.cover.z - this.pos.z) < 0.8 && G.world.static.lineOfSight(tp.x, tp.y + 1.4, tp.z, c.x, c.y + 0.9, c.z) && this.stateT > 1.5; }
  findCover(tp, retreat) {
    const S = G.world.static; let best = null, bs = -1e9; const used = G.npcs ? G.npcs.coverTaken : new Set();
    const toP = Math.atan2(tp.x - this.pos.x, tp.z - this.pos.z);
    const cands = [];
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; for (const r of [3, 6, 10, 14]) cands.push(new THREE.Vector3(this.pos.x + Math.sin(a) * r, 0, this.pos.z + Math.cos(a) * r)); }
    for (const v of G.vehicles.query(this.pos.x, this.pos.z, 18, [])) { if (v.speed > 1) continue; const away = Math.atan2(v.pos.x - tp.x, v.pos.z - tp.z); cands.push(new THREE.Vector3(v.pos.x + Math.sin(away) * (v.spec.W / 2 + 0.9), 0, v.pos.z + Math.cos(away) * (v.spec.W / 2 + 0.9))); }
    for (const c of cands) {
      const key = Math.round(c.x) + ',' + Math.round(c.z); if (used.has(key)) continue;
      c.y = S.groundAt(c.x, c.z, this.pos.y + 1, 0.5).h; if (Math.abs(c.y - this.pos.y) > 1.2) continue;
      if (S.pushCircle(c.x, c.z, 0.35, c.y + 0.5, c.y + 1.6).hit) continue;
      const dp = Math.hypot(c.x - tp.x, c.z - tp.z); if (dp < (retreat ? 18 : 7)) continue;
      const hidden = !S.lineOfSight(tp.x, tp.y + 1.4, tp.z, c.x, c.y + 0.9, c.z); if (!hidden) continue;
      const canPeek = S.lineOfSight(tp.x, tp.y + 1.2, tp.z, c.x, c.y + 1.65, c.z);
      const dSelf = Math.hypot(c.x - this.pos.x, c.z - this.pos.z);
      let score = -dSelf * 0.6 + (canPeek ? 6 : 0) + (retreat ? dp * 0.4 : -Math.abs(dp - 16) * 0.3);
      if (this.role === 'flank') { const ang = Math.atan2(c.x - tp.x, c.z - tp.z); const mine = Math.atan2(this.pos.x - tp.x, this.pos.z - tp.z); score += Math.min(1.6, Math.abs(Math.atan2(Math.sin(ang - mine), Math.cos(ang - mine)))) * 6; }
      if (score > bs) { bs = score; best = c; }
    }
    if (this.coverKey) used.delete(this.coverKey); if (best) { this.coverKey = Math.round(best.x) + ',' + Math.round(best.z); used.add(this.coverKey); }
    return best;
  }
  dispose() { G.combat.removeTarget(this.target); this.mesh.parent && this.mesh.parent.remove(this.mesh); if (this.coverKey && G.npcs) G.npcs.coverTaken.delete(this.coverKey); }
}

export class Npcs {
  constructor() { this.list = []; this.coverTaken = new Set(); G.on('gunshot', (p, shooter) => { if (shooter && shooter.isPlayer) for (const n of this.list) if (n.alive && n.calm && n.pos.distanceTo(p) < 45) n.alert(); }); }
  spawn(kind, x, y, z, yaw, opts) { const n = new Combatant(kind, x, y, z, yaw, opts); this.list.push(n); return n; }
  crewVehicle(v, kind, n = 2, opts = {}) {
    const seats = [{ x: -v.spec.W * 0.19, z: (v.spec.cabin.r0 - 0.5) * v.spec.L + 0.15, shooter: true }, { x: v.spec.W * 0.19, z: (v.spec.cabin.r0 - 0.5) * v.spec.L - 0.8, shooter: true }, { x: -v.spec.W * 0.19, z: (v.spec.cabin.r0 - 0.5) * v.spec.L - 0.8, shooter: true }];
    const crew = []; for (let i = 0; i < n && i < seats.length; i++) { const c = this.spawn(kind, v.pos.x, v.pos.y, v.pos.z, v.yaw, opts); c.enterVehicleSeat(v, { ...seats[i], canExit: opts.canExit }); crew.push(c); } return crew;
  }
  update(dt) {
    const cam = G.camera.position;
    for (let i = this.list.length - 1; i >= 0; i--) { const n = this.list[i]; n.update(dt); if (!n.alive && n.human.ragT > 25 && n.pos.distanceTo(cam) > 60) { n.dispose(); this.list.splice(i, 1); } else if (n.pos.distanceTo(cam) > 400 && !n.keep) { n.dispose(); this.list.splice(i, 1); } }
  }
  draw(R) { for (const n of this.list) if (n.human.visible) R.draw(n.human); }
  clear() { for (const n of this.list) n.dispose(); this.list = []; this.coverTaken.clear(); }
  get aliveCount() { return this.list.filter((n) => n.alive).length; }
}
