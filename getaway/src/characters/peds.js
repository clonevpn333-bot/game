// GETAWAY! — ambient pedestrians: sidewalk loops with signal-controlled crossings, plaza wandering,
// reactions (flee, cower, hands up, dive, phone the police), vehicle knockdowns (ragdoll), carjack ejection.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { inView } from '../core/perf.js';
import { clamp, rand, pick, chance, dampAngle, SpatialHash, lerp } from '../core/utils.js';
import { Human, randomLook, LOOKS, J } from './humanoid.js';
import { walkSignal } from '../world/signals.js';
import { voice } from '../core/streetaudio.js';

const _v = new THREE.Vector3();
let PID = 0;
class Ped {
  constructor(look, x, y, z, yaw) {
    this.id = ++PID; this.human = new Human(look, { x, y, z, yaw }); this.pos = this.human.pos; this.health = 60; this.alive = true; this.state = 'walk'; this.t = 0;
    this.speed = rand(1.15, 1.6); this.fear = 0; this.threat = null; this.route = null; this.goal = null; this.vel = new THREE.Vector3(); this.down = false; this.stateT = 0; this.witness = null; this.updT = 0;
    this.target = { human: this.human, team: 'civ', ped: this, alive: () => this.alive && this.human.visible, hit: (d, dir, p, head, src, kind, push) => this.hit(d, dir, p, head, src, kind, push) };
  }
  hit(dmg, dir, point, head, src, kind, push) {
    if (!this.alive) return; this.health -= dmg; this.fear = 1;
    if (this.health <= 0 || push || kind === 'melee' && dmg > 30) {
      const v = push || dir.clone().multiplyScalar(kind === 'melee' ? 4 : 2.5).setY(kind === 'melee' ? 2 : 1);
      this.human.ragdoll(v, G.world.static, rand(-2, 2)); this.state = 'ragdoll'; this.stateT = 0;
      if (this.health <= 0) { this.alive = false; this.down = true; }
    } else { this.human.upper = { name: 'hit', dur: 0.4 }; this.human.upperT = 0; this.flee(src && src.human ? src.human.pos : point); }
    if (src && src.team === 'player') G.emit('crime', { type: kind === 'vehicle' ? 'hitrun' : this.alive ? 'assault' : 'murder', pos: this.pos.clone(), sev: this.alive ? 1 : 3 });
  }
  flee(from, t = rand(7, 14)) {
    if (this.state === 'ragdoll' || !this.alive) return; this.threat = from.clone(); this.state = 'flee'; this.stateT = t; this.fear = 1; this.human.state = 'flee';
    if (!this.screamed && chance(0.35) && G.audio) { this.screamed = true; voice(G.audio, this.pos, chance(0.6) ? 'scream' : 'shout', this.human.look.hairStyle === 'long' || this.human.look.hairStyle === 'bun' ? 1.35 : 1); }
  }
}

export class Peds {
  constructor(world) {
    this.world = world; this.list = []; this.hash = new SpatialHash(10); this.max = 170; this.t = 0; this.enabled = true;
    this.rects = world.wander; this.nodeMap = new Map(); for (const n of world.graph.nodes) if (n.kind === 'isect') this.nodeMap.set(n.x + ',' + n.z, n);
    this.weights = this.rects.map((r) => (r.density || 1) * Math.sqrt((r.x1 - r.x0) * (r.z1 - r.z0)));
    G.on('gunshot', (p, shooter) => this.alarm(p, 40, shooter));
    G.on('explosion', (p) => this.alarm(p, 80, null, true));
    G.on('vehicleImpact', (v, imp, p) => { if (imp > 12) this.alarm(p, 18, null); else if (imp > 5) this.gawk(p, 16, 0.6); });
    this.groups = [];
    // crimes the player commits get noticed: people stop and stare, point, pull out phones to film, shout, call it in
    G.on('crime', (e) => { if (!e || !e.pos) return; if (e.type === 'murder' || e.sev >= 3) this.alarm(e.pos, 32, null); else if (e.type !== 'gunfire') this.gawk(e.pos, 26, 0.85, true); });
    G.on('pedHit', (ped, v, sp) => { if (G.audio && chance(0.8)) voice(G.audio, ped.pos, 'scream', rand(0.9, 1.4)); this.gawk(ped.pos, 22, 0.9, v && v.isPlayer); });
    G.on('enterVehicle', (v, occupied) => { if (occupied) this.gawk(v.pos, 20, 0.8, true); });
  }
  setDensity(q) { this.max = Math.round(170 * q); }
  alarm(p, r, shooter, big = false) {
    for (const ped of this.list) {
      if (!ped.alive || ped.state === 'ragdoll') continue; const d = ped.pos.distanceTo(p); if (d > r) continue;
      if (d < 9 && chance(big ? 0.15 : 0.35)) { ped.state = 'cower'; ped.stateT = rand(3, 7); ped.human.state = 'cower'; ped.threat = p.clone(); }
      else ped.flee(shooter && shooter.human ? shooter.human.pos : p);
      if (shooter && shooter.isPlayer && !ped.witness && chance(0.25)) ped.witness = { delay: rand(4, 9), pos: p.clone() };
    }
  }
  // stop and watch something happen (film it / point at it / stare), maybe shout, maybe call the cops
  gawk(p, r, odds = 0.7, crime = false) {
    let shouted = 0;
    for (const ped of this.list) {
      if (!ped.alive || ped.state === 'ragdoll' || ped.state === 'flee' || ped.state === 'cower' || ped.state === 'dive' || ped.keep) continue; const d = ped.pos.distanceTo(p); if (d > r || !chance(odds)) continue;
      if (d < 5 && chance(0.5)) { ped.flee(p, rand(3, 6)); continue; }
      this._leaveGroup(ped); ped.state = 'gawk'; ped.stateT = rand(4, 10); ped.look = p.clone(); ped.gawkKind = chance(0.4) ? 'film' : chance(0.55) ? 'point' : 'stare';
      if (shouted < 2 && chance(0.35) && G.audio) { shouted++; setTimeout(() => voice(G.audio, ped.pos, chance(0.3) ? 'gasp' : 'shout', rand(0.9, 1.3)), rand(150, 900)); }
      if (crime && !ped.witness && chance(0.3)) ped.witness = { delay: ped.stateT + rand(0.5, 2), pos: p.clone() };
    }
  }
  _makeGroup(x, y, z, members, t) {
    const g = { pos: new THREE.Vector3(x, y, z), members, t, speaker: members[0], speakT: rand(2, 5), hushed: false };
    members.forEach((ped, i) => { const a = (i / members.length) * Math.PI * 2 + rand(-0.3, 0.3); const R = members.length > 2 ? 0.75 : 0.6; if (!ped.groupInPlace) { ped.pos.x = x + Math.sin(a) * R; ped.pos.z = z + Math.cos(a) * R; } ped.group = g; ped.state = 'chat'; ped.stateT = t; ped.goal = null; });
    this.groups.push(g); return g;
  }
  _leaveGroup(ped) { const g = ped.group; if (!g) return; ped.group = null; ped.human.lookAt = null; ped.human.speaking = false; g.members = g.members.filter((m) => m !== ped); if (g.speaker === ped) g.speaker = g.members[0] || null;
    if (g.members.length < 2) { for (const m of g.members) { m.group = null; m.human.lookAt = null; m.human.speaking = false; if (m.state === 'chat') { m.state = 'walk'; this._reattach(m); } } g.members = []; this.groups = this.groups.filter((q) => q !== g); } }
  pickRect(P) {
    let tot = 0; const cand = []; for (let i = 0; i < this.rects.length; i++) { const r = this.rects[i]; const cx = clamp(P.x, r.x0, r.x1), cz = clamp(P.z, r.z0, r.z1); const d = Math.hypot(cx - P.x, cz - P.z); if (d < 120) { cand.push(i); tot += this.weights[i]; } }
    let x = Math.random() * tot; for (const i of cand) { x -= this.weights[i]; if (x <= 0) return this.rects[i]; } return null;
  }
  perim(r, u, out) { const w = r.x1 - r.x0, h = r.z1 - r.z0; const P = 2 * (w + h); u = ((u % P) + P) % P; if (u < w) return out.set(r.x0 + u, 0, r.z0); u -= w; if (u < h) return out.set(r.x1, 0, r.z0 + u); u -= h; if (u < w) return out.set(r.x1 - u, 0, r.z1); u -= w; return out.set(r.x0, 0, r.z1 - u); }
  populate() { this.fillNow = true; this.t = 0; }
  spawn(P, cam, camDir, fill = false) {
    const r = this.pickRect(P); if (!r) return; const area = r.indoor || r.beach || r.y !== undefined || (r.x1 - r.x0 < 60 && r.z1 - r.z0 < 60 && r.density > 1.2);
    let x, z, u = 0; if (area) { x = rand(r.x0, r.x1); z = rand(r.z0, r.z1); } else { const w = r.x1 - r.x0, h = r.z1 - r.z0; u = Math.random() * 2 * (w + h); this.perim(r, u, _v); x = _v.x; z = _v.z; }
    const d = Math.hypot(x - P.x, z - P.z); if (d < (fill ? 6 : 30) || d > 115) return;
    const dx = x - cam.x, dz = z - cam.z; const dl = Math.hypot(dx, dz) || 1; if (!fill && (dx * camDir.x + dz * camDir.z) / dl > 0.5 && d < 60) return;
    const y = r.y ?? this.world.static.groundAt(x, z, 50, 0).h;
    const look = r.workers ? LOOKS.worker() : randomLook(); if (r.beach && chance(0.6)) { look.shirt = pick([0xffffff, 0xf1c40f, 0xe74c3c, 0x3498db]); look.sleeve = 'short'; }
    const ped = new Ped(look, x, y, z, rand(0, 6.28)); ped.rect = r; ped.area = area; ped.u = u; ped.dir = chance(0.5) ? 1 : -1;
    if (chance(0.06) && !area) { ped.state = 'phone'; ped.stateT = rand(3, 8); }
    this.list.push(ped); G.combat.addTarget(ped.target);
    if (chance(area ? 0.12 : 0.07) && this.list.length < this.max - 3) { // friends hanging out: 2-4 people talking on the sidewalk / plaza
      const n = chance(0.5) ? 2 : chance(0.6) ? 3 : 4; const ms = [ped]; for (let k = 1; k < n; k++) { const o = new Ped(r.workers ? LOOKS.worker() : randomLook(), x, y, z, 0); o.rect = r; o.area = area; o.u = u; o.dir = ped.dir; this.list.push(o); G.combat.addTarget(o.target); ms.push(o); }
      this._makeGroup(x, y, z, ms, rand(25, 80));
    }
  }
  spawnCivilian(x, y, z, yaw, state = 'cower') { const ped = new Ped(randomLook(), x, y, z, yaw); ped.state = state; ped.stateT = 1e6; ped.keep = true; ped.human.state = state; ped.area = true; ped.rect = { x0: x - 2, x1: x + 2, z0: z - 2, z1: z + 2 }; this.list.push(ped); G.combat.addTarget(ped.target); return ped; }
  remove(ped) { this._leaveGroup(ped); const i = this.list.indexOf(ped); if (i >= 0) this.list.splice(i, 1); G.combat.removeTarget(ped.target); }
  ejectDriver(v, player) {
    const p = v.local(v.spec.W / 2 + 0.4, (v.spec.cabin ? (v.spec.cabin.r0 - 0.5) * v.spec.L + 0.2 : 0));
    const look = v.isPolice() ? LOOKS.police() : randomLook(); const ped = new Ped(look, p.x, v.pos.y, p.z, v.yaw + Math.PI / 2);
    this.list.push(ped); G.combat.addTarget(ped.target);
    const side = new THREE.Vector3(Math.cos(v.yaw), 0, -Math.sin(v.yaw)); ped.human.animate(0.016);
    ped.human.ragdoll(side.multiplyScalar(4.5).add(v.vel.clone().multiplyScalar(0.6)).setY(2.5), this.world.static, rand(-3, 3)); ped.state = 'ragdoll'; ped.stateT = 0; ped.fear = 1; ped.threat = player.pos.clone(); ped.wasDriver = true;
    if (G.audio) { G.audio.thud(p, 0.8); G.audio.voiceChirp(1.4, 4); }
    return ped;
  }
  // forward gap to nearest pedestrian in a vehicle's path
  obstacleAhead(v, range) {
    const s = Math.sin(v.yaw), c = Math.cos(v.yaw); let gap = 99; const near = this.hash.query(v.pos.x + s * range * 0.5, v.pos.z + c * range * 0.5, range * 0.6, this._q || (this._q = []));
    for (const p of near) { if (!p.alive || p.state === 'ragdoll') continue; const dx = p.pos.x - v.pos.x, dz = p.pos.z - v.pos.z; const f = dx * s + dz * c, l = dx * c - dz * s; if (f > 0 && f < range && Math.abs(l) < v.spec.W / 2 + 0.7) gap = Math.min(gap, f - v.spec.L / 2 - 1); }
    return gap;
  }
  update(dt) {
    const P = G.player ? G.player.focus : null; if (!P) return; const cam = G.camera.position; const camDir = G.camera.getWorldDirection(_v.clone());
    this.t -= dt; if (this.t <= 0 && this.enabled) { this.t = 0.12; const n = this.fillNow ? 4000 : 14; this.fillNow = false; for (let k = 0; k < n && this.list.length < this.max; k++) this.spawn(P, cam, camDir, n > 100); }
    this.hash.clear(); for (const p of this.list) this.hash.insert(p, p.pos.x, p.pos.z, 0.5);
    const S = this.world.static; const time = G.time;
    for (const g of this.groups) { g.speakT -= dt; if (g.speakT <= 0 && g.members.length) { g.speaker = pick(g.members); g.speakT = rand(1.8, 5); if (chance(0.06) && G.audio) voice(G.audio, g.pos, 'laugh', rand(0.9, 1.3)); } g.hushed = false; }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const ped = this.list[i]; const h = ped.human; const d2 = (ped.pos.x - cam.x) ** 2 + (ped.pos.z - cam.z) ** 2;
      if (d2 > 135 * 135 && !ped.keep) { this.remove(ped); continue; }
      const far = d2 > 70 * 70; ped.updT += dt; if (far && ((ped.id + G.frame) & 1)) { h.visible = d2 < 140 * 140; continue; }
      const step = ped.updT; ped.updT = 0;
      this.think(ped, step, S, time);
      h.visible = d2 < 140 * 140;
    }
    this._vehicleHits();
  }
  think(ped, dt, S, time) {
    const h = ped.human; ped.t += dt; ped.stateT -= dt;
    if (ped.state === 'ragdoll') {
      h.animate(dt); ped.stateT += dt * 2;
      if (h.settled && ped.alive) { if (ped.stateT > 3) { h.getUp(S); ped.state = 'flee'; ped.stateT = rand(6, 10); if (!ped.threat) ped.threat = ped.pos.clone(); } }
      return;
    }
    if (!ped.alive) return;
    // witness phone call
    if (ped.witness && ped.state !== 'phone') { ped.witness.delay -= dt; if (ped.witness.delay <= 0 && ped.state !== 'cower') { ped.state = 'phone'; ped.stateT = 4; ped.calling = true; } }
    // player aiming at me -> hands up
    const pl = G.player; if (pl && pl.aiming && ped.state !== 'flee' && ped.state !== 'cower') { const d = ped.pos.distanceTo(pl.pos); if (d < 14) { const cd = G.camera.getWorldDirection(_v); const tx = ped.pos.x - G.camera.position.x, tz = ped.pos.z - G.camera.position.z; const tl = Math.hypot(tx, tz) || 1; if ((tx * cd.x + tz * cd.z) / tl > 0.97) { ped.state = 'hands'; ped.stateT = 1.5; } } }
    // dodge speeding vehicles
    if (ped.state !== 'dive' && ped.state !== 'cower') {
      const near = G.vehicles.query(ped.pos.x, ped.pos.z, 14, this._vq || (this._vq = []));
      for (const v of near) { const sp = v.speed; if (sp < 9 || v.mode !== 'drive') continue; const dx = ped.pos.x - v.pos.x, dz = ped.pos.z - v.pos.z; const fx = v.vel.x / sp, fz = v.vel.z / sp; const f = dx * fx + dz * fz, l = dx * fz - dz * fx; if (f > 0 && f < sp * 0.7 && Math.abs(l) < v.spec.W / 2 + 0.8 && chance(0.5 * dt * 10)) { ped.state = 'dive'; ped.stateT = 0.9; const side = Math.sign(l) || 1; ped.diveV = new THREE.Vector3(fz * side, 0, -fx * side).multiplyScalar(6.5); ped.human.yaw = Math.atan2(ped.diveV.x, ped.diveV.z); if (G.audio && chance(0.5)) G.audio.voiceChirp(2.2, 2); break; } }
    }
    if (ped.group && ped.state !== 'chat') this._leaveGroup(ped);
    // an armed / sprinting player close by: heads turn, people get out of the way
    if (pl && !pl.vehicle && pl.alive && ped.state !== 'flee' && ped.state !== 'cower' && ped.state !== 'gawk') { const d = Math.hypot(ped.pos.x - pl.pos.x, ped.pos.z - pl.pos.z); const armed = !!pl.human.weapon && pl.weapon !== 'fists';
      if (d < (armed ? 9 : 3.2)) { ped.human.lookAt = pl.pos; if (ped.group) ped.group.hushed = armed; if (armed && d < 4 && chance(dt * 0.4)) ped.flee(pl.pos, rand(2.5, 4)); } else if (!ped.group && ped.state !== 'gawk') ped.human.lookAt = null; }
    let move = 0, tx = 0, tz = 0, spd = ped.speed;
    switch (ped.state) {
      case 'chat': { const g = ped.group; if (!g) { ped.state = 'walk'; break; } h.state = 'talk'; h.speed = 0; h.speaking = g.speaker === ped && !g.hushed;
        if (!h.lookAt || h.lookAt === (g.speaker && g.speaker.pos) || chance(dt * 0.3)) h.lookAt = g.speaker && g.speaker !== ped ? g.speaker.pos : (g.members.find((m) => m !== ped) || ped).pos;
        h.yaw = dampAngle(h.yaw, Math.atan2(g.pos.x - ped.pos.x, g.pos.z - ped.pos.z), 4, dt);
        if (ped.stateT <= 0) { this._leaveGroup(ped); ped.state = 'walk'; this._reattach(ped); } break; }
      case 'gawk': { const k = ped.gawkKind; h.state = k === 'film' ? 'film' : k === 'point' ? 'point' : 'idle'; h.speed = 0; h.lookAt = ped.look; h.yaw = dampAngle(h.yaw, Math.atan2(ped.look.x - ped.pos.x, ped.look.z - ped.pos.z), 5, dt);
        if (ped.stateT <= 0) { h.lookAt = null; if (ped.witness && !ped.calledIn) { ped.state = 'phone'; ped.stateT = 4; ped.calling = true; } else { ped.state = 'walk'; this._reattach(ped); } } break; }
      case 'flee': {
        h.state = 'flee'; spd = 6.2; const th = ped.threat || ped.pos; let ax = ped.pos.x - th.x, az = ped.pos.z - th.z; const al = Math.hypot(ax, az) || 1; ax /= al; az /= al;
        // bias along sidewalk: steer away + wall avoidance handled by pushCircle
        tx = ped.pos.x + ax * 10; tz = ped.pos.z + az * 10; move = 1;
        if (ped.stateT <= 0) { ped.state = ped.witness && !ped.calledIn ? 'phone' : 'walk'; ped.stateT = 4; ped.fear = 0.3; if (ped.state === 'phone') ped.calling = true; this._reattach(ped); }
        break;
      }
      case 'cower': h.state = 'cower'; h.speed = 0; if (ped.stateT <= 0) ped.flee(ped.threat || ped.pos); break;
      case 'hands': h.state = 'handsUp'; h.speed = 0; if (ped.stateT <= 0) ped.flee(G.player.pos); break;
      case 'phone': h.state = 'phone'; h.speed = 0; if (ped.stateT <= 0) { if (ped.calling && !ped.calledIn) { ped.calledIn = true; G.emit('witnessCall', ped.pos.clone(), ped.witness); } ped.calling = false; ped.witness = null; ped.state = 'walk'; } break;
      case 'dive': { h.state = 'dive'; h.stateT = 1 - ped.stateT / 0.9; const k = ped.stateT / 0.9; ped.pos.x += ped.diveV.x * dt * k; ped.pos.z += ped.diveV.z * dt * k; if (ped.stateT <= 0) { h.ragdoll(ped.diveV.clone().multiplyScalar(0.3), S); ped.state = 'ragdoll'; ped.stateT = 1.5; } break; }
      case 'idle': h.state = 'idle'; h.speed = 0; if (ped.stateT <= 0) ped.state = 'walk'; break;
      case 'wait': { h.state = 'idle'; h.speed = 0; const c = ped.cross; if (walkSignal(c.node, c.axis, G.time) || ped.stateT < -25) { ped.state = 'cross'; } break; }
      case 'cross': { const c = ped.cross; tx = c.to.x; tz = c.to.z; move = 1; spd = ped.speed * 1.15; if (Math.hypot(tx - ped.pos.x, tz - ped.pos.z) < 0.6) { ped.rect = c.rect; ped.u = c.u; ped.state = 'walk'; ped.cross = null; } break; }
      default: { // walk
        h.state = 'run';
        if (ped.area) {
          if (!ped.goal || Math.hypot(ped.goal.x - ped.pos.x, ped.goal.z - ped.pos.z) < 0.8) { if (ped.goal && chance(0.35)) { ped.state = 'idle'; ped.stateT = rand(2, 7); } const r = ped.rect; ped.goal = new THREE.Vector3(rand(r.x0, r.x1), 0, rand(r.z0, r.z1)); }
          tx = ped.goal.x; tz = ped.goal.z; move = 1;
        } else {
          const r = ped.rect; const w = r.x1 - r.x0, hh = r.z1 - r.z0; const Pm = 2 * (w + hh);
          const corners = [0, w, w + hh, 2 * w + hh]; const before = ((ped.u % Pm) + Pm) % Pm;
          ped.u += ped.dir * spd * dt; const after = ((ped.u % Pm) + Pm) % Pm;
          for (const cu of corners) { const passed = ped.dir > 0 ? (before < cu && after >= cu) || (before > after && cu === 0) : (before > cu && after <= cu) || (before < after && cu === 0); if (passed && chance(0.4)) { if (this._tryCross(ped, cu)) break; } }
          if (ped.state === 'walk') { this.perim(r, ped.u + ped.dir * 1.5, _v); tx = _v.x; tz = _v.z; move = 1; if (chance(0.002)) { ped.state = 'idle'; ped.stateT = rand(1.5, 5); } }
        }
      }
    }
    if (move) {
      let dx = tx - ped.pos.x, dz = tz - ped.pos.z; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      // separation from other peds & player
      const near = this.hash.query(ped.pos.x, ped.pos.z, 1.2, this._sq || (this._sq = []));
      if (ped.state === 'walk' && !ped.area && !ped.chatted && chance(dt * 0.05)) for (const o of near) { if (o !== ped && o.alive && o.state === 'walk' && !o.group && !o.chatted && o.pos.distanceTo(ped.pos) < 1.3) { ped.chatted = o.chatted = true; ped.groupInPlace = o.groupInPlace = true; this._makeGroup((ped.pos.x + o.pos.x) / 2, ped.pos.y, (ped.pos.z + o.pos.z) / 2, [ped, o], rand(6, 16)); ped.groupInPlace = o.groupInPlace = false; return; } }
      for (const o of near) { if (o === ped) continue; const ox = ped.pos.x - o.pos.x, oz = ped.pos.z - o.pos.z; const ol = Math.hypot(ox, oz); if (ol < 0.9 && ol > 0.01) { dx += ox / ol * 0.6; dz += oz / ol * 0.6; } }
      if (G.player && !G.player.vehicle) { const ox = ped.pos.x - G.player.pos.x, oz = ped.pos.z - G.player.pos.z; const ol = Math.hypot(ox, oz); if (ol < 1.2 && ol > 0.01) { dx += ox / ol * 1.2; dz += oz / ol * 1.2; if (ol < 0.7 && G.player.sprinting && ped.state !== 'flee') { ped.human.ragdoll(new THREE.Vector3(G.player.vel.x, 1.5, G.player.vel.z), G.world.static); ped.state = 'ragdoll'; ped.stateT = 0; G.audio && G.audio.thud(ped.pos, 0.5); G.emit('pedShoved', ped); } } }
      const nl = Math.hypot(dx, dz) || 1; ped.pos.x += dx / nl * spd * dt; ped.pos.z += dz / nl * spd * dt;
      h.yaw = dampAngle(h.yaw, Math.atan2(dx, dz), 8, dt); h.speed = spd;
    } else if (ped.state !== 'dive') h.speed = 0;
    if (ped.state !== 'dive') { const c = S.pushCircle(ped.pos.x, ped.pos.z, 0.3, ped.pos.y + 0.45, ped.pos.y + 1.7); if (c.hit) { ped.pos.x = c.x; ped.pos.z = c.z; if (ped.state === 'flee' && ped.threat) { ped.threat.x += c.nz * 6; ped.threat.z -= c.nx * 6; } } }
    const g = S.groundAt(ped.pos.x, ped.pos.z, ped.pos.y + 0.5, 0).h; ped.pos.y = lerp(ped.pos.y, g, 0.5);
    h.animate(dt);
  }
  _tryCross(ped, cu) {
    const r = ped.rect; this.perim(r, cu, _v); const cx = _v.x, cz = _v.z; const opts = [];
    for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const tx = cx + dx * 20, tz = cz + dz * 20;
      const nr = this.rects.find((q) => q !== r && !q.indoor && q.y === undefined && Math.abs(tx - clamp(tx, q.x0, q.x1)) < 1.5 && Math.abs(tz - clamp(tz, q.z0, q.z1)) < 1.5 && (Math.abs(tx - q.x0) < 1.5 || Math.abs(tx - q.x1) < 1.5) && (Math.abs(tz - q.z0) < 1.5 || Math.abs(tz - q.z1) < 1.5));
      if (!nr) continue;
      const nx = Math.round((cx + dx * 10) / 100) * 100, nz = Math.round((cz + dz * 10) / 100) * 100; const node = this.nodeMap.get(nx + ',' + nz);
      const w = nr.x1 - nr.x0, hh = nr.z1 - nr.z0; const ncs = [[nr.x0, nr.z0, 0], [nr.x1, nr.z0, w], [nr.x1, nr.z1, w + hh], [nr.x0, nr.z1, 2 * w + hh]]; const nc = ncs.find(([x, z]) => Math.abs(x - tx) < 2 && Math.abs(z - tz) < 2);
      if (!nc) continue; opts.push({ to: new THREE.Vector3(nc[0], 0, nc[1]), rect: nr, u: nc[2], node, axis: dx !== 0 ? 'ns' : 'ew' });
    }
    if (!opts.length) return false; ped.cross = pick(opts); ped.state = 'wait'; ped.stateT = 0; return true;
  }
  _reattach(ped) { // after fleeing, find nearest rect to resume walking
    let best = null, bd = 1e9; for (const r of this.rects) { const cx = clamp(ped.pos.x, r.x0, r.x1), cz = clamp(ped.pos.z, r.z0, r.z1); const d = Math.hypot(cx - ped.pos.x, cz - ped.pos.z); if (d < bd) { bd = d; best = r; } }
    if (!best) return; ped.rect = best; ped.area = best.indoor || best.beach || best.y !== undefined || (best.x1 - best.x0 < 60 && best.z1 - best.z0 < 60 && best.density > 1.2);
    if (!ped.area) { const r = best; const w = r.x1 - r.x0, h = r.z1 - r.z0; const px = clamp(ped.pos.x, r.x0, r.x1), pz = clamp(ped.pos.z, r.z0, r.z1); const ds = [Math.abs(pz - r.z0), Math.abs(px - r.x1), Math.abs(pz - r.z1), Math.abs(px - r.x0)]; const m = ds.indexOf(Math.min(...ds)); ped.u = m === 0 ? px - r.x0 : m === 1 ? w + pz - r.z0 : m === 2 ? w + h + (r.x1 - px) : 2 * w + h + (r.z1 - pz); }
    ped.goal = null;
  }
  _vehicleHits() {
    for (const v of G.vehicles.list) {
      const sp = v.speed; if (sp < 1.2) continue; const s = Math.sin(v.yaw), c = Math.cos(v.yaw); const hw = v.spec.W / 2 + 0.25, hl = v.spec.L / 2 + 0.25;
      const near = this.hash.query(v.pos.x, v.pos.z, hl + 1, this._hq || (this._hq = []));
      for (const ped of near) {
        if (ped.state === 'ragdoll' && ped.human.ragT < 0.3) continue; if (ped.pos.y > v.pos.y + v.spec.H || ped.pos.y + 1.7 < v.pos.y) continue;
        const dx = ped.pos.x - v.pos.x, dz = ped.pos.z - v.pos.z; const lx = c * dx - s * dz, lz = s * dx + c * dz; if (Math.abs(lx) > hw || Math.abs(lz) > hl) continue;
        if (sp > 3.5) {
          const push = v.vel.clone().multiplyScalar(1.1); push.y = 2.5 + sp * 0.2; const wasAlive = ped.alive;
          ped.human.ragdoll(push, G.world.static, rand(-4, 4)); ped.state = 'ragdoll'; ped.stateT = 0; ped.health -= sp * 3.5; if (ped.health <= 0) { ped.alive = false; ped.down = true; }
          if (G.audio) G.audio.thud(ped.pos, clamp(sp / 20, 0.4, 1.2)); if (G.fx) G.fx.dust(ped.pos, 2, 0.8);
          v.vel.multiplyScalar(0.97); if (sp > 10 && Math.random() < 0.3) v.crackGlass(1);
          G.emit('pedHit', ped, v, sp, wasAlive);
          if (v.isPlayer) G.emit('crime', { type: 'hitrun', pos: ped.pos.clone(), sev: sp > 14 ? 2 : 1 });
        } else { const nx = Math.sign(lx) * hw, nz = lz; ped.pos.x = v.pos.x + c * nx + s * nz; ped.pos.z = v.pos.z - s * nx + c * nz; }
      }
    }
  }
  clear() { for (const p of [...this.list]) if (!p.keep) this.remove(p); this.groups = this.groups.filter((g) => g.members.length >= 2); }
  draw(R) { for (const p of this.list) if (p.human.visible && inView(p.pos, 1.2, 110)) R.draw(p.human); } // far / off-screen people aren't drawn (was ~1M triangles a frame)
}
