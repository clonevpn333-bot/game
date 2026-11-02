// GETAWAY! — police heat system: crimes & witnesses, stars, dispatch (spawned out of sight, never teleported
// next to you), pursuit AI (graph pathing, ramming, PIT, flanking, boxing), roadblocks, helicopter with
// searchlight, line-of-sight search & evasion, fair arrests, and campaign pursuit memory.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { clamp, rand, chance, pick, lerp, damp, dampAngle, wrapAngle } from '../core/utils.js';
import { driveTo, edgePoint, laneOffset, edgeDir } from '../vehicles/traffic.js';
import { mergeParts } from '../world/props.js';
import { HWY, TUNNEL } from '../world/layout.js';

const _v = new THREE.Vector3();
// ---------------- graph helpers ----------------
export function nearestNode(graph, x, z, filter) { let best = null, bd = 1e18; for (const n of graph.nodes) { if (!n.out.length || (filter && !filter(n))) continue; const d = (n.x - x) ** 2 + (n.z - z) ** 2; if (d < bd) { bd = d; best = n; } } return best; }
export function astar(graph, a, b) {
  if (!a || !b) return null; if (a === b) return [a];
  const open = new Map([[a.id, 0]]), came = new Map(), gS = new Map([[a.id, 0]]); const H = (n) => Math.hypot(n.x - b.x, n.z - b.z);
  let guard = 0;
  while (open.size && guard++ < 2500) {
    let cur = null, cf = 1e18; for (const [id, f] of open) if (f < cf) { cf = f; cur = id; } open.delete(cur);
    if (cur === b.id) { const path = [b]; let c = b.id; while (came.has(c)) { c = came.get(c); path.unshift(graph.nodes[c]); } return path; }
    const n = graph.nodes[cur];
    for (const eid of n.out) { const e = graph.edges[eid]; const g2 = gS.get(cur) + e.len; if (g2 < (gS.get(e.b) ?? 1e18)) { gS.set(e.b, g2); came.set(e.b, cur); open.set(e.b, g2 + H(graph.nodes[e.b])); } }
  }
  return null;
}

// ---------------- pursuit driver ----------------
export class PursuitAI {
  constructor(v, police, role = 'chase') { this.v = v; this.p = police; this.role = role; this.kind = 'pursuit'; this.path = null; this.pathT = 0; this.wp = 0; this.stuckT = 0; this.revT = 0; this.side = chance(0.5) ? 1 : -1; this.dismounted = false; v.ai = this; v.siren = true; v.keep = true; v.lightsOn = true; }
  update(dt) {
    const v = this.v; if (v.dead || v.removed) return;
    if (v.mode !== 'drive' || v.flipped) { this.dismount(); v.ctrl.throttle = 0; return; }
    const P = G.player; const tgtV = P.vehicle; const tp = this.p.state === 'pursuit' ? (tgtV ? tgtV.pos : P.pos) : this.p.searchPoint(this);
    const d = Math.hypot(tp.x - v.pos.x, tp.z - v.pos.z);
    if (this.revT > 0) { this.revT -= dt; v.ctrl.throttle = 0; v.ctrl.brake = 1; v.ctrl.steer = -this.side; v.ctrl.handbrake = false; return; }
    if (this.parked) { v.ctrl.throttle = 0; v.ctrl.brake = 1; return; }
    // on-foot suspect nearby -> stop & dismount
    if (this.p.state === 'pursuit' && !tgtV && d < 28) { v.ctrl.throttle = 0; v.ctrl.brake = 1; if (v.speed < 3) this.dismount(); return; }
    let aim; const direct = d < 85 && (this.p.state !== 'pursuit' || this.p.losUnits.has(this) || d < 45);
    if (direct) {
      const tv = tgtV ? tgtV.vel : P.vel; const lead = clamp(d / 35, 0.2, 1.3); aim = _v.set(tp.x + tv.x * lead, 0, tp.z + tv.z * lead);
      if (tgtV && this.p.state === 'pursuit') {
        const s = Math.sin(tgtV.yaw), c = Math.cos(tgtV.yaw); const rx = -c, rz = s; // right of target
        if (this.role === 'flank') { aim.x += rx * this.side * 4 + s * 7; aim.z += rz * this.side * 4 + c * 7; }
        else if (this.role === 'block' && tgtV.speed > 10) { aim.x += s * 18; aim.z += c * 18; }
        else if (d < 16 && this.p.tactics.pit) { const behind = (v.pos.x - tp.x) * s + (v.pos.z - tp.z) * c < 0; if (behind) { aim.set(tp.x + rx * this.side * 1.3 - s * 1.2, 0, tp.z + rz * this.side * 1.3 - c * 1.2); } }
      }
    } else {
      // follow road graph
      this.pathT -= dt; if (!this.path || this.pathT <= 0) { this.pathT = 2.5; this.path = astar(this.p.graph, nearestNode(this.p.graph, v.pos.x, v.pos.z), nearestNode(this.p.graph, tp.x, tp.z)); this.wp = 1; }
      const path = this.path; if (path && this.wp < path.length) { const n = path[this.wp]; aim = _v.set(n.x, 0, n.z); if (Math.hypot(n.x - v.pos.x, n.z - v.pos.z) < 14) this.wp++; } else aim = _v.set(tp.x, 0, tp.z);
    }
    const tgtSpeed = this.p.state === 'pursuit' ? Math.max(24, (tgtV ? tgtV.speed : 0) + (d > 60 ? 18 : d > 25 ? 8 : 2)) * this.p.speedMul : 18;
    driveTo(v, aim.x, aim.z, Math.min(tgtSpeed, v.spec.top * 0.97), { aggressive: true, reverseOk: true });
    if (d < 10 && tgtV && tgtV.speed < 2) { v.ctrl.throttle = 0; v.ctrl.brake = 1; if (v.speed < 1) this.dismount(); }
    // stuck recovery
    if (v.speed < 1.2 && v.ctrl.throttle > 0.4) { this.stuckT += dt; if (this.stuckT > 1.4) { this.stuckT = 0; this.revT = 1.1; this.side = -this.side; } } else this.stuckT = Math.max(0, this.stuckT - dt);
  }
  dismount() {
    if (this.dismounted) return; this.dismounted = true; const v = this.v; if (!G.npcs) return;
    const n = v.spec.mass > 5000 ? 4 : 2; const kind = v.spec.mass > 5000 || this.p.tier >= 3 && chance(0.5) ? 'swat' : 'police';
    for (let i = 0; i < n; i++) { const side = i % 2 ? -1 : 1; const p = v.local(side * (v.spec.W / 2 + 0.9), -0.5 * (i >> 1) * 2); const o = G.npcs.spawn(kind, p.x, v.pos.y, p.z, v.yaw, { role: i % 2 ? 'flank' : 'hold' }); o.fromUnit = this; this.p.officers.push(o); }
    v.setDoor(1, true); v.setDoor(-1, true);
  }
}

// ---------------- helicopter ----------------
export function heliModel() {
  const B = (w, h, d, x, y, z, c) => ({ geo: new THREE.BoxGeometry(w, h, d).translate(x, y, z), c }); const parts = [];
  const body = new THREE.SphereGeometry(1, 16, 12); body.scale(1.3, 1.15, 2.4); parts.push({ geo: body, c: 0x1d2c4f });
  const canopy = new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2); canopy.scale(1.15, 0.9, 1.3); canopy.rotateX(0.5); canopy.translate(0, 0.25, 1.4); parts.push({ geo: canopy, c: 0x0d1418 });
  const boom = new THREE.CylinderGeometry(0.35, 0.18, 5, 10); boom.rotateX(Math.PI / 2); boom.translate(0, 0.3, -3.8); parts.push({ geo: boom, c: 0x1d2c4f });
  parts.push(B(0.12, 1.5, 0.9, 0, 1.0, -6.2, 0x1d2c4f), B(0.12, 0.12, 2.6, 0.9, -1.25, 0, 0x222222), B(0.12, 0.12, 2.6, -0.9, -1.25, 0, 0x222222), B(1.9, 0.08, 0.1, 0, -1.1, 0.8, 0x222222), B(1.9, 0.08, 0.1, 0, -1.1, -0.8, 0x222222), B(2.65, 0.25, 0.05, 0, 0, 2.2, 0xffffff), B(0.4, 0.3, 0.6, 0, 1.25, 0, 0x333333));
  const m = new THREE.Mesh(mergeParts(parts), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.5 })); m.castShadow = true;
  const g = new THREE.Group(); g.add(m);
  const rotor = new THREE.Mesh(mergeParts([B(11, 0.06, 0.3, 0, 0, 0, 0x111111), B(0.3, 0.06, 11, 0, 0, 0, 0x111111)]), new THREE.MeshStandardMaterial({ vertexColors: true, transparent: true, opacity: 0.85 })); rotor.position.y = 1.45; g.add(rotor);
  const tr = new THREE.Mesh(mergeParts([B(0.05, 1.8, 0.15, 0, 0, 0, 0x111111)]), m.material); tr.position.set(0.15, 1.0, -6.3); g.add(tr);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false })); beacon.position.set(0, -1.15, -1); g.add(beacon);
  return { g, rotor, tr, beacon };
}
export class Helicopter {
  constructor(police, pos) {
    this.p = police; const m = heliModel(); this.m = m; this.g = m.g; G.scene.add(this.g); this.pos = pos.clone(); this.vel = new THREE.Vector3(); this.yaw = 0; this.t = 0; this.fireT = 4; this.alive = true; this.hp = 260;
    this.spot = G.heliSpot; this.spot.intensity = 0;
    const cone = new THREE.ConeGeometry(1, 1, 24, 1, true); cone.translate(0, -0.5, 0); cone.rotateX(-Math.PI / 2);
    this.beam = new THREE.Mesh(cone, new THREE.MeshBasicMaterial({ color: 0xdfe8ff, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); G.scene.add(this.beam);
    this.snd = G.audio && G.audio.createLoop('rotor', { ref: 40, wet: 0.3 });
    this.target = { human: { pos: this.pos, visible: true, scale: 1, joint: (j, o = new THREE.Vector3()) => o.copy(this.pos), look: { build: 3 } }, team: 'police', alive: () => this.alive, hit: (d) => { this.hp -= d; if (this.hp <= 0) this.crash(); } };
  }
  get sees() { return this._sees; }
  update(dt) {
    this.t += dt; const P = G.player; const tp = P.vehicle ? P.vehicle.pos : P.pos; if (!this.alive) return this.updateCrash(dt);
    const leaving = this.p.state === 'none'; const r = 26 + Math.sin(this.t * 0.2) * 6, alt = 42 + Math.sin(this.t * 0.3) * 6;
    const goal = leaving ? _v.set(this.pos.x + 200, 120, this.pos.z + 200) : this.p.state === 'search' ? _v.copy(this.p.searchCenter).add(new THREE.Vector3(Math.cos(this.t * 0.25) * this.p.searchR * 0.7, alt + 10, Math.sin(this.t * 0.25) * this.p.searchR * 0.7)) : _v.set(tp.x + Math.cos(this.t * 0.3) * r + (P.vehicle ? P.vehicle.vel.x * 1.5 : 0), tp.y + alt, tp.z + Math.sin(this.t * 0.3) * r + (P.vehicle ? P.vehicle.vel.z * 1.5 : 0));
    const acc = goal.sub(this.pos).multiplyScalar(0.6).sub(this.vel.clone().multiplyScalar(1.1)); acc.clampLength(0, 22); this.vel.addScaledVector(acc, dt); this.pos.addScaledVector(this.vel, dt);
    const look = this.p.state === 'search' ? this.p.searchCenter : tp; this.yaw = dampAngle(this.yaw, Math.atan2(look.x - this.pos.x, look.z - this.pos.z), 1.5, dt);
    this.g.position.copy(this.pos); this.g.rotation.set(clamp(acc.dot(new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw))) * 0.03, -0.35, 0.35), this.yaw, 0, 'YXZ');
    this.m.rotor.rotation.y += dt * 38; this.m.tr.rotation.x += dt * 50; this.m.beacon.visible = Math.floor(this.t * 2) % 2 === 0;
    // searchlight
    const night = G.sky.night; const sweep = this.p.state === 'search' ? new THREE.Vector3(Math.sin(this.t * 0.9) * this.p.searchR * 0.5, 0, Math.cos(this.t * 0.7) * this.p.searchR * 0.5).add(this.p.searchCenter) : tp;
    this.spot.position.copy(this.pos).y -= 1.3; this.spot.target.position.lerp(sweep, 0.1); this.spot.intensity = 400 * Math.max(0.15, night) * 10;
    const dir = this.spot.target.position.clone().sub(this.spot.position); const len = dir.length(); this.beam.position.copy(this.spot.position); this.beam.lookAt(this.spot.target.position); this.beam.scale.set(len * 0.16, len * 0.16, len); this.beam.material.opacity = 0.05 + night * 0.07; this.beam.visible = night > 0.3;
    // vision: from above, blocked by roofs/tunnels/highway decks
    const covered = G.world.static.ceilingAt(tp.x, tp.z, tp.y + 2) < this.pos.y; const d = this.pos.distanceTo(tp);
    this._sees = !covered && d < 170 && (G.frame % 8 ? this._sees : G.world.static.lineOfSight(this.pos.x, this.pos.y - 2, this.pos.z, tp.x, tp.y + 1, tp.z));
    if (this.snd) this.snd.update(this.pos, 0.9, 16);
    // marksman at high heat
    if (this.p.stars >= 4 && this._sees && P.alive) { this.fireT -= dt; if (this.fireT <= 0) { this.fireT = rand(1.5, 3); const W = { id: 'rifle', kind: 'rifle', dmg: 22, pellets: 1, range: 220, spread: 0.03, aimSpread: 0.03, tracer: 1, shake: 0 }; const from = this.pos.clone().setY(this.pos.y - 1.5); const aim = tp.clone().setY(tp.y + 1); if (Math.random() > 0.35) aim.add(new THREE.Vector3(rand(-2, 2), rand(0, 1.5), rand(-2, 2))); G.combat.fire({ human: null, team: 'police', target: this.target, inaccuracy: 0.5 }, W, from, aim.sub(from).normalize(), from); } }
  }
  crash() { if (!this.alive) return; this.alive = false; this.spin = 0; G.emit('heliDown', this); if (G.fx) G.fx.explosion(this.pos, 0.6); if (G.audio) G.audio.explosion(this.pos, 0.6); }
  updateCrash(dt) { this.vel.y -= 12 * dt; this.pos.addScaledVector(this.vel, dt); this.spin += dt * 4; this.g.rotation.y += this.spin * dt * 3; this.g.position.copy(this.pos); if (G.fx) G.fx.fire(this.pos, 1); const gh = G.world.static.groundAt(this.pos.x, this.pos.z, this.pos.y, 0).h; if (this.pos.y < gh + 1) { G.emit('explosion', this.pos.clone(), 1.6, 'heli'); this.dispose(); } }
  dispose() { this.alive = false; this.disposed = true; G.scene.remove(this.g); this.spot.intensity = 0; G.scene.remove(this.beam); if (this.snd) this.snd.dispose(); }
}

// ---------------- police system ----------------
export class Police {
  constructor(world) {
    this.world = world; this.graph = world.graph; this.heat = 0; this.stars = 0; this.state = 'none'; this.units = []; this.officers = []; this.heli = null; this.lastKnown = new THREE.Vector3(); this.searchCenter = new THREE.Vector3(); this.searchR = 30;
    this.unseenT = 0; this.evadeT = 0; this.evadeNeed = 10; this.dispatchT = 0; this.roadblockT = 15; this.losUnits = new Set(); this.maxStars = 5; this.minStars = 0; this.enabled = true; this.locked = false;
    this.tier = 0; this.speedMul = 1; this.difficulty = 1; this.tactics = { pit: true, roadblocks: true, heli: true }; this.identified = true; this.arrestT = 0; this.bustedT = 0; this.stats = this._freshStats();
    G.on('crime', (c) => this.crime(c));
    G.on('witnessCall', (p) => this.report(p));
    G.on('gunshot', (p, shooter) => { if (shooter && shooter.isPlayer) this.lastPlayerShot = G.time; });
    G.on('npcDied', (n) => { if (n.team === 'police') this.addHeat(1.2, n.pos); });
    G.on('vehicleDamaged', (v, amt, src) => { if (v.ai && v.ai.kind === 'pursuit' && G.player.vehicle && src === G.player.human && amt > 6) this.addHeat(0.15); });
    G.on('playerEnteredVehicle', (v) => { if (this.state === 'search' && !this.anyLOS()) { const mem = G.save.pursuit; const p = clamp(0.85 - mem.swaps * 0.12, 0.25, 0.85); if (Math.random() < p) { this.identified = false; G.emit('policeIntel', 'Suspect vehicle unknown — units are looking for the old car.'); } else G.emit('policeIntel', 'Dispatch: "They switch cars. Watch for handoffs."'); this.stats.swaps++; } });
  }
  _freshStats() { return { swaps: 0, highwayT: 0, tunnelT: 0, footT: 0, offroadT: 0, waterT: 0, total: 0 }; }
  get wanted() { return this.stars > 0; }
  setTier(t) { this.tier = clamp(t, 0, 5); this.speedMul = 1 + this.tier * 0.04; this.difficulty = 0.85 + this.tier * 0.06; }
  addHeat(n, at = null) {
    if (!this.enabled) return; const before = this.stars;
    this.heat = clamp(this.heat + n, 0, this.maxStars + 0.99); this.stars = clamp(Math.floor(this.heat), this.minStars, this.maxStars);
    if (this.stars > 0 && this.state === 'none') { this.state = at ? 'search' : 'pursuit'; this.lastKnown.copy(at || G.player.focus); this.searchCenter.copy(this.lastKnown); this.searchR = 40; this.stats = this._freshStats(); this.identified = true; this.evadeT = 0; G.emit('wantedStart', this.stars); this.dispatchT = 0; }
    if (this.stars > before) { G.emit('starsUp', this.stars); if (G.audio) G.audio.ui('star'); if (G.music) G.music.stinger('heat'); this.evadeT = 0; }
  }
  setStars(n) { this.heat = n + 0.5; const b = this.stars; this.stars = n; if (n > 0 && this.state === 'none') { this.state = 'pursuit'; this.lastKnown.copy(G.player.focus); this.stats = this._freshStats(); G.emit('wantedStart', n); } if (n > b) G.emit('starsUp', n); if (n === 0) this.clear(false); }
  crime(c) {
    if (!this.enabled) return; const sev = c.sev || 1;
    if (this.witnessedBy(c.pos)) { this.addHeat(sev * (this.stars ? 0.5 : 1)); this.state = 'pursuit'; this.lastKnown.copy(G.player.focus); this.unseenT = 0; }
    else if (c.type === 'gunfire' && this.stars === 0 && Math.random() < 0.02) this.report(c.pos);
  }
  report(p) { if (!this.enabled) return; if (this.stars === 0) { this.addHeat(1, p); G.emit('policeIntel', 'A witness called it in. Units responding.'); } else { this.searchCenter.copy(p); } }
  witnessedBy(p) {
    for (const u of this.units) if (!u.v.dead && u.v.pos.distanceTo(p) < 75 && G.world.static.lineOfSight(u.v.pos.x, u.v.pos.y + 1.4, u.v.pos.z, p.x, p.y + 1, p.z)) return true;
    for (const o of this.officers) if (o.alive && o.pos.distanceTo(p) < 60 && G.world.static.lineOfSight(o.pos.x, o.pos.y + 1.6, o.pos.z, p.x, p.y + 1, p.z)) return true;
    if (this.heli && this.heli.alive && this.heli.sees) return true;
    // any parked/traffic police car nearby
    for (const v of G.vehicles.query(p.x, p.z, 60, [])) if (v.isPolice() && !v.isPlayer && !v.dead && G.world.static.lineOfSight(v.pos.x, v.pos.y + 1.4, v.pos.z, p.x, p.y + 1, p.z)) return true;
    return false;
  }
  anyLOS() {
    const P = G.player; const tp = P.vehicle ? P.vehicle.pos : P.pos; let seen = false; this.losUnits.clear();
    const known = this.identified || !P.vehicle;
    for (const u of this.units) { if (u.v.dead || u.v.removed) continue; const d = u.v.pos.distanceTo(tp); if (d < 110 && (known || d < 20) && G.world.static.lineOfSight(u.v.pos.x, u.v.pos.y + 1.4, u.v.pos.z, tp.x, tp.y + 1.1, tp.z)) { this.losUnits.add(u.ai); seen = true; } }
    for (const o of this.officers) if (o.alive && o.seesPlayer && (known || o.pos.distanceTo(tp) < 20)) seen = true;
    if (this.heli && this.heli.alive && this.heli.sees && known) seen = true;
    return seen;
  }
  update(dt) {
    // cleanup
    this.units = this.units.filter((u) => !u.v.removed); this.officers = this.officers.filter((o) => G.npcs.list.includes(o));
    if (this.heli && this.heli.disposed) this.heli = null; if (this.heli) this.heli.update(dt);
    for (const u of this.units) u.ai.update(dt);
    if (this.state === 'none') { this.retire(dt); return; }
    const P = G.player; const tp = P.vehicle ? P.vehicle.pos : P.pos;
    // vision every few frames
    if (G.frame % 4 === 0) this._seen = this.anyLOS();
    if (this._seen) { this.lastKnown.copy(tp); this.unseenT = 0; if (this.state === 'search') { this.state = 'pursuit'; G.emit('spotted'); } this.evadeT = 0; }
    else { this.unseenT += dt; if (this.state === 'pursuit' && this.unseenT > 2.5) { this.state = 'search'; this.searchCenter.copy(this.lastKnown); this.searchR = 30; G.emit('searching'); } }
    if (this.state === 'search') {
      this.searchR = Math.min(260, this.searchR + dt * (6 + this.tier));
      this.evadeNeed = (6 + this.stars * 4) * (1 + this.tier * 0.12) * (this.locked ? 1e9 : 1);
      const far = tp.distanceTo(this.searchCenter) > this.searchR; this.evadeT += dt * (far ? 1.6 : 1);
      if (this.evadeT >= this.evadeNeed && this.stars > this.minStars) this.escaped();
    }
    // memory stats
    this.stats.total += dt;
    if (P.vehicle && Math.abs(tp.z - HWY.z) < 14 && tp.y > 8) this.stats.highwayT += dt;
    if (Math.abs(tp.z - TUNNEL.z) < 9 && tp.y < -3 && tp.x > TUNNEL.x0 && tp.x < TUNNEL.x1) { this.stats.tunnelT += dt; this._tunnelReact(); }
    if (!P.vehicle) this.stats.footT += dt; if (P.swimming) this.stats.waterT += dt; if (P.vehicle && P.vehicle.surface === 'ground') this.stats.offroadT += dt;
    // dispatch
    this.dispatchT -= dt; if (this.dispatchT <= 0) { this.dispatchT = 2.2; this.dispatch(); }
    if (this.stars >= 2 && this.tactics.roadblocks && this.state === 'pursuit') { this.roadblockT -= dt; if (this.roadblockT <= 0) { this.roadblockT = rand(22, 35) / (1 + this.tier * 0.15); this.roadblock(); } }
    if (!this.heli && this.tactics.heli && (this.stars >= 4 || (this.stars >= 3 && this.tier >= 1))) { const p = tp.clone().add(new THREE.Vector3(rand(-1, 1), 0, rand(-1, 1)).normalize().multiplyScalar(260)); p.y = 110; this.heli = new Helicopter(this, p); G.emit('policeIntel', 'Air support inbound.'); }
    // vehicle bust: stopped & boxed in
    if (P.vehicle && this.state === 'pursuit') { const close = this.officers.some((o) => o.alive && o.pos.distanceTo(tp) < 4) || this.units.filter((u) => u.v.pos.distanceTo(tp) < 6).length >= 2; if (P.vehicle.speed < 0.6 && close) { this.bustedT += dt; if (this.bustedT > 4.5) this.busted(); } else this.bustedT = Math.max(0, this.bustedT - dt * 2); }
    else if (!P.vehicle) { if (!this.officers.some((o) => o.alive && o.pos.distanceTo(tp) < 2.2)) this.arrestT = Math.max(0, this.arrestT - dt); }
  }
  arrestable() { const P = G.player; return this.stars > 0 && this.stars <= 2 && !P.aiming && G.time - (this.lastPlayerShot || -99) > 6 && !P.vehicle; }
  arrestTick(dt) { const P = G.player; if (Math.hypot(P.vel.x, P.vel.z) < 1.5) { this.arrestT += dt; if (this.arrestT > 1.8) this.busted(); } else this.arrestT = Math.max(0, this.arrestT - dt * 2); }
  busted() { if (this.locked === 'noBust') return; this.bustedT = 0; this.arrestT = 0; G.emit('busted'); }
  searchPoint(ai) { if (!ai.sp || ai.v.pos.distanceTo(ai.sp) < 15 || (ai.spT = (ai.spT || 0) + G.dt) > 14) { ai.spT = 0; const a = rand(0, Math.PI * 2), r = rand(0.2, 1) * this.searchR; ai.sp = new THREE.Vector3(this.searchCenter.x + Math.cos(a) * r, 0, this.searchCenter.z + Math.sin(a) * r); } return ai.sp; }
  wantedUnits() { const s = this.stars; return s === 0 ? 0 : s === 1 ? 2 : s === 2 ? 3 : s === 3 ? 5 : s === 4 ? 6 : 8; }
  dispatch() {
    const want = this.wantedUnits() + Math.floor(this.tier / 2); const active = this.units.filter((u) => !u.v.dead && u.v.mode === 'drive').length;
    if (active >= want) return;
    const P = G.player; const tp = P.vehicle ? P.vehicle.pos : P.pos; const cam = G.camera; const cd = cam.getWorldDirection(new THREE.Vector3());
    const pv = P.vehicle; const ahead = pv ? new THREE.Vector3(pv.vel.x, 0, pv.vel.z).normalize() : null;
    const cands = this.graph.nodes.filter((n) => { if (!n.out.length) return false; const d = Math.hypot(n.x - tp.x, n.z - tp.z); if (d < 170 || d > 340) return false; const dx = n.x - cam.position.x, dz = n.z - cam.position.z; const dl = Math.hypot(dx, dz); if ((dx * cd.x + dz * cd.z) / dl > 0.55 && dl < 250) return false; return true; });
    if (!cands.length) return;
    // interceptors prefer nodes ahead of the suspect
    cands.sort((a, b) => (ahead ? -((b.x - tp.x) * ahead.x + (b.z - tp.z) * ahead.z) + ((a.x - tp.x) * ahead.x + (a.z - tp.z) * ahead.z) : 0) * 0.002 + Math.random() - 0.5);
    const n = cands[0]; const e = this.graph.edges[pick(n.out)];
    const type = this.unitType(); const p = edgePoint(e, 6, laneOffset(e, 0), new THREE.Vector3());
    const v = G.vehicles.spawn(type, { x: p.x, y: p.y, z: p.z, yaw: Math.atan2(tp.x - p.x, tp.z - p.z) }); v.pos.y = this.world.static.groundAt(p.x, p.z, p.y + 2, 0.5).h;
    const roles = ['chase', 'chase', 'flank', 'block', 'flank']; const ai = new PursuitAI(v, this, roles[this.units.length % roles.length]);
    this.units.push({ v, ai }); v.hasDriver = true; G.emit('policeDispatched', v);
  }
  unitType() { const s = this.stars, t = this.tier; const r = Math.random(); if (s >= 4 && r < 0.2) return 'armored'; if (s >= 3 && r < 0.25 && t >= 1) return 'policebike'; if ((s >= 3 || t >= 2) && r < 0.55) return 'interceptor'; if (s >= 2 && r < 0.2) return 'suv'; return 'police'; }
  roadblock() {
    const P = G.player; const pv = P.vehicle; if (!pv || pv.speed < 8) return; const mem = G.save.pursuit;
    const fx = pv.vel.x / pv.speed, fz = pv.vel.z / pv.speed; const tp = pv.pos;
    let best = null, bs = -1e9;
    for (const e of this.graph.live) {
      if (e.tunnel) continue; const m = edgePoint(e, e.len / 2, 0, new THREE.Vector3()); const dx = m.x - tp.x, dz = m.z - tp.z; const d = Math.hypot(dx, dz); if (d < 140 || d > 280) continue;
      const along = (dx * fx + dz * fz) / d; if (along < 0.85) continue; let score = along * 10 - Math.abs(d - 200) * 0.05 + (e.hwy && mem.highway >= 2 ? 8 : 0);
      const cdx = m.x - G.camera.position.x, cdz = m.z - G.camera.position.z; if (Math.hypot(cdx, cdz) < 130) continue; if (score > bs) { bs = score; best = e; }
    }
    if (!best) return; const s = best.len * 0.5; const yaw = edgeDir(best, s) + Math.PI / 2;
    const placed = [];
    for (const off of best.kind === 'hwy' ? [-9, -4.5, 4.5, 9] : [-3.6, 3.6]) { const p = edgePoint(best, s, off, new THREE.Vector3()); const v = G.vehicles.spawn(pick(['police', 'police', 'suv']), { x: p.x, y: p.y, z: p.z, yaw: yaw + rand(-0.25, 0.25) }); v.pos.y = this.world.static.groundAt(p.x, p.z, p.y + 2, 0.5).h; v.siren = true; v.lightsOn = true; v.keep = true; const ai = new PursuitAI(v, this, 'roadblock'); ai.parked = true; this.units.push({ v, ai }); placed.push(v); }
    for (let i = 0; i < 2; i++) { const p = edgePoint(best, s - 6, (i ? 1 : -1) * 2.5, new THREE.Vector3()); const o = G.npcs.spawn(this.tier >= 3 ? 'swat' : 'police', p.x, p.y, p.z, edgeDir(best, s)); this.officers.push(o); }
    G.emit('policeIntel', best.hwy ? 'Roadblock on the highway — they know you love it.' : 'Roadblock ahead!'); G.emit('roadblock', placed);
  }
  _tunnelReact() { const mem = G.save.pursuit; if (mem.tunnel >= 2 && !this.tunnelBlocked && this.state !== 'none') { this.tunnelBlocked = true; const exitX = G.player.focus.x < 400 ? TUNNEL.x1 + 20 : TUNNEL.x0 - 20; for (const off of [-3.5, 3.5]) { const v = G.vehicles.spawn('police', { x: exitX, y: 0, z: TUNNEL.z + off, yaw: 0 }); v.siren = true; const ai = new PursuitAI(v, this, 'roadblock'); ai.parked = true; this.units.push({ v, ai }); } G.emit('policeIntel', '"Not the tunnel again." Units sealing the far portal.'); } }
  escaped() {
    const st = this.stats; const mem = G.save.pursuit; mem.escapes++;
    const method = st.highwayT > 8 ? 'highway' : st.tunnelT > 3 ? 'tunnel' : st.swaps > 0 ? 'swaps' : st.waterT > 3 ? 'water' : st.footT > st.total * 0.5 ? 'onfoot' : st.offroadT > 8 ? 'offroad' : 'alley';
    mem[method] = (mem[method] || 0) + 1; G.save.stats.escapes++; if (G.game) G.game.saveNow();
    G.emit('escaped', method, this.stars); if (G.music) G.music.stinger('escape');
    this.clear(true);
  }
  clear(retire = true) { this.heat = 0; this.stars = 0; this.state = 'none'; this.tunnelBlocked = false; this.evadeT = 0; this.identified = true; for (const u of this.units) { u.v.siren = false; u.ai.retiring = true; } }
  retire(dt) {
    // units drive off / despawn when out of sight
    const cam = G.camera.position;
    for (const u of [...this.units]) { const d = u.v.pos.distanceTo(cam); if (d > 120 || u.v.dead) { if (d > 90) { G.vehicles.remove(u.v); this.units.splice(this.units.indexOf(u), 1); } } else if (u.ai) { u.v.siren = false; u.v.ctrl.throttle = 0.3; u.v.ctrl.steer = 0; } }
    for (const o of this.officers) if (o.alive && o.pos.distanceTo(cam) > 80) { o.dispose(); G.npcs.list.splice(G.npcs.list.indexOf(o), 1); }
    if (this.heli) { this.heli.update(dt); if (this.heli && this.heli.pos.distanceTo(cam) > 300) { this.heli.dispose(); this.heli = null; } }
  }
  reset() { for (const u of this.units) G.vehicles.remove(u.v); this.units = []; for (const o of this.officers) { o.dispose(); const i = G.npcs.list.indexOf(o); if (i >= 0) G.npcs.list.splice(i, 1); } this.officers = []; if (this.heli) { this.heli.dispose(); this.heli = null; } this.heat = 0; this.stars = 0; this.state = 'none'; this.minStars = 0; this.maxStars = 5; this.locked = false; this.enabled = true; }
}
