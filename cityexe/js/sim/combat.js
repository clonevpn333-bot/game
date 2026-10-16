// Combat: weapons, bullets, wounds, witnesses and the police response.
// Shots are rays tested against people (capsules), vehicles (boxes) and
// buildings; wounds become real injuries or deaths with EMS calls, homicide
// investigations and grieving families. Witnesses run and phone it in. Your
// wanted level (stars) rises with what police and witnesses see and drains
// when you break line of sight; officers draw and return fire when you're armed
// and dangerous.
import { clamp, dist } from '../core/math.js';
import { rand } from '../core/rng.js';

export const WEAPONS = {
  fists: { label: 'Fists', melee: true, dmg: 0.1, range: 1.6, rate: 0.55, noise: 0, legal: true },
  knife: { label: 'Knife', melee: true, dmg: 0.32, range: 1.8, rate: 0.6, noise: 0, price: 60, legal: true },
  bat: { label: 'Baseball bat', melee: true, dmg: 0.25, range: 2.0, rate: 0.8, noise: 0, price: 45, legal: true },
  taser: { label: 'Taser', dmg: 0, stun: 6, range: 7, rate: 1.4, mag: 1, noise: 0.2, police: true },
  pistol: { label: '9mm pistol', dmg: 0.36, range: 50, rate: 0.32, mag: 15, spread: 0.018, noise: 1, price: 520, licence: true },
  revolver: { label: '.357 revolver', dmg: 0.55, range: 55, rate: 0.6, mag: 6, spread: 0.014, noise: 1.1, price: 780, licence: true },
  shotgun: { label: 'Pump shotgun', dmg: 0.22, pellets: 8, range: 22, rate: 0.9, mag: 6, spread: 0.07, noise: 1.3, price: 650, licence: true },
  smg: { label: 'SMG', dmg: 0.24, range: 40, rate: 0.08, mag: 30, spread: 0.035, noise: 1.2, auto: true, price: 2400, illegal: true },
  rifle: { label: 'Assault rifle', dmg: 0.42, range: 110, rate: 0.11, mag: 30, spread: 0.012, noise: 1.5, auto: true, price: 4200, illegal: true },
};

export class Combat {
  constructor(W) {
    this.W = W;
    this.heat = 0;          // your wanted level, 0..5
    this.lastSeen = -1e9;    // game time police last saw you
    this.lastShot = -1e9;
    this.inc = null;         // the open incident tracking you
    this.cool = 0;
  }
  get player() { return this.W.life && this.W.life.player || (this.W.possessed && this.W.possessed.c) || null; }

  // ------------------------------------------------------------ shooting
  // from/dir in world space; returns { hit: 'ped'|'veh'|'wall'|null, point, c, v }
  ray(from, dir, range, ignoreCid = -1) {
    const W = this.W;
    let best = null, bt = range;
    // people: vertical capsules
    for (const p of W.peds.near(from.x + dir.x * range * 0.5, from.z + dir.z * range * 0.5, range * 0.55 + 2)) {
      if (p.cid === ignoreCid || p.dead) continue;
      const ox = p.x - from.x, oz = p.z - from.z;
      const t = (ox * dir.x + oz * dir.z) / Math.max(1e-6, dir.x * dir.x + dir.z * dir.z);
      if (t < 0 || t > bt) continue;
      const cx = from.x + dir.x * t - p.x, cz = from.z + dir.z * t - p.z;
      const y = from.y + dir.y * t - (p.y || 0);
      const lying = p.fallen > 0 || p.action === 'down';
      if (cx * cx + cz * cz < (lying ? 0.5 : 0.12) && y > -0.1 && y < (lying ? 0.5 : 1.85)) { bt = t; best = { hit: 'ped', p, c: W.citizens[p.cid], head: y > 1.55 }; }
    }
    // vehicles: oriented boxes in 2D + height
    for (const v of W.traffic.vehicles) {
      if (v.hidden || v.state === 'garage' || v.state === 'abstract' || v.state === 'gone') continue;
      const dx0 = v.x - from.x, dz0 = v.z - from.z;
      if (dx0 * dx0 + dz0 * dz0 > (bt + 6) ** 2) continue;
      const ch = Math.cos(v.h), sh = Math.sin(v.h);
      const lx0 = -dx0 * ch + dz0 * sh, lz0 = -dx0 * sh - dz0 * ch; // from relative to vehicle, in vehicle frame
      const ldx = dir.x * ch - dir.z * sh, ldz = dir.x * sh + dir.z * ch;
      let t0 = 0, t1 = bt;
      for (const [o, d, h] of [[lx0, ldx, v.wid / 2], [lz0, ldz, v.len / 2]]) {
        if (Math.abs(d) < 1e-6) { if (Math.abs(o) > h) { t0 = 1e9; break; } continue; }
        let a = (-h - o) / d, b = (h - o) / d; if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      }
      if (t0 < t1 && t0 < bt) { const y = from.y + dir.y * t0 - (v.y || 0); if (y > 0.2 && y < v.T.hgt) { bt = t0; best = { hit: 'veh', v }; } }
    }
    // buildings & ground: march
    for (let t = 0.5; t < bt; t += 0.6) {
      const x = from.x + dir.x * t, y = from.y + dir.y * t, z = from.z + dir.z * t;
      if (y < W.groundHeight(x, z, y) + 0.02) { bt = t; best = { hit: 'ground' }; break; }
      if (W.collideBox(x, z, 0.05, y - 0.05)) { bt = t; best = { hit: 'wall' }; break; }
    }
    const point = { x: from.x + dir.x * bt, y: from.y + dir.y * bt, z: from.z + dir.z * bt };
    return { ...(best || { hit: null }), point, t: bt };
  }

  // shooter fires their weapon from `from` along `dir` (normalised)
  fire(shooter, wid, from, dir) {
    const W = this.W;
    const wp = WEAPONS[wid];
    if (!wp) return [];
    const out = [];
    const n = wp.pellets || 1;
    for (let i = 0; i < n; i++) {
      const s = wp.spread || 0;
      const d = { x: dir.x + (rand.float() - 0.5) * s * 2, y: dir.y + (rand.float() - 0.5) * s, z: dir.z + (rand.float() - 0.5) * s * 2 };
      const L = Math.hypot(d.x, d.y, d.z); d.x /= L; d.y /= L; d.z /= L;
      const r = this.ray(from, d, wp.range, shooter ? shooter.id : -1);
      if (r.hit === 'ped') this.wound(r.c, wp.dmg * (r.head ? 2.2 : 1) * (wp.pellets ? clamp(1.4 - r.t / wp.range, 0.3, 1.2) : 1), shooter, wid, wp.stun);
      if (r.hit === 'veh') { this.damageVehicle(r.v, wp.dmg * 0.14 * (wp.pellets ? 0.5 : 1), shooter, r.point); if (r.v.driver != null && !r.v.player && rand.chance(0.15)) this.wound(W.citizens[r.v.driver], wp.dmg * 0.7, shooter, wid); if (r.v.alarm === 0 && r.v.state === 'parked') r.v.alarm = 4; }
      out.push({ from, to: r.point, hit: r.hit });
    }
    W.emit('shot', { shooter, wid, from, shots: out, noise: wp.noise });
    if (wp.noise > 0) this.gunshotHeard(shooter, from, wp.noise);
    return out;
  }

  // cars take punishment, stall into wrecks, and finally go up in flames
  damageVehicle(v, amt, attacker, at) {
    const W = this.W;
    if (!v || v.burnt) return;
    v.damage = clamp((v.damage || 0) + amt, 0, 1);
    W.emit('impact', { x: at ? at.x : v.x, z: at ? at.z : v.z, v, power: 1 + amt * 20 });
    if (v.damage > 0.6 && !v.player && (v.state === 'lane' || v.state === 'parked' || v.state === 'merging')) { W.traffic.toFree(v, 'shot'); v.state = 'wreck'; v.wreck = true; v.input = null; }
    if (v.damage >= 1) {
      v.burnt = true; v.state = v.player ? v.state : 'wreck'; v.wreck = true; v.input = null;
      W.emit('explosion', { x: v.x, z: v.z, y: (v.y || 0) + 1 });
      W.emit('shot', { shooter: attacker, wid: 'shotgun', from: { x: v.x, y: 1, z: v.z }, shots: [], noise: 3 });
      if (attacker) this.gunshotHeard(attacker, { x: v.x, z: v.z }, 3);
      for (const p of W.peds.near(v.x, v.z, 5)) { const o = W.citizens[p.cid]; if (o) this.wound(o, 0.8 * (1 - dist(p.x, p.z, v.x, v.z) / 6), attacker, 'shotgun'); }
      if (v.driver != null) { const d = W.citizens[v.driver]; if (d && !d.possessed) this.wound(d, 2, attacker, 'shotgun'); }
      W.history.cityEvent(`A ${v.T?.label || 'car'} exploded on the street`, { type: 'crime', x: v.x, z: v.z, minor: true });
      if (attacker && attacker === this.player) this.raiseHeat(1.5);
    }
  }

  melee(attacker, wid, target) {
    const wp = WEAPONS[wid];
    this.wound(target, wp.dmg * (0.7 + rand.float() * 0.6), attacker, wid);
    this.W.emit('melee', { attacker, target, wid });
  }

  // a person takes damage
  wound(c, dmg, attacker, wid, stun = 0) {
    const W = this.W;
    if (!c || c.status === 'dead') return;
    const pos = W.citizenPos(c) || { x: 0, z: 0 };
    // children are never harmed: they scream and run
    if (c.age < 16) { if (c.ped && !c.possessed) W.peds.walkTo(c.ped, c.ped.x + (rand.float() - 0.5) * 60, c.ped.z + (rand.float() - 0.5) * 60, () => W.citizenAI.resume(c), { run: true, direct: true }); return; }
    if (stun) { if (c.ped) { c.ped.fallen = stun; W.peds.stop(c.ped, 'down'); } this.crimeAgainst(c, attacker, 'tased', pos, 0); return; }
    const armour = c.life?.inv?.armour ? 0.5 : 1;
    c.health = clamp((c.health ?? 1) - dmg * armour, 0, 1);
    if (c.life) c.life.stats.health = clamp(c.life.stats.health - dmg * 40 * armour, 0, 100);
    if (c.ped) { c.ped.fallen = Math.max(c.ped.fallen || 0, dmg > 0.2 ? 1.2 : 0.3); }
    W.emit('wounded', { c, dmg, attacker, x: pos.x, z: pos.z });
    const lethal = c.health <= 0;
    if (lethal || c.health < 0.35) {
      // down: dead, or critically injured waiting for EMS
      const dies = lethal && (c.possessed ? rand.chance(0.35) : true);
      if (dies) {
        const cause = WEAPONS[wid]?.melee ? 'violent assault' : 'gunshot wound';
        if (c.isPlayer && W.life && W.life.pid === c.id) W.life.die(c, cause);
        else { W.citizenAI.die(c, cause); }
        this.homicide(c, attacker, pos, cause);
      } else {
        W.incidents.injure(c, clamp(1 - c.health, 0.5, 1), wid === 'fists' ? 'a fight' : 'a shooting');
        if (c.ped) { W.peds.stop(c.ped, 'down'); c.ped.fallen = 999; }
      }
    }
    if (attacker && attacker !== c) this.crimeAgainst(c, attacker, lethal ? 'killed' : 'attacked', pos, WEAPONS[wid]?.melee ? 1 : 2);
  }

  // record the crime, wanted level, witnesses
  crimeAgainst(victim, attacker, what, pos, severity) {
    const W = this.W;
    if (!attacker) return;
    const onDuty = attacker.duty != null && attacker.job && attacker.job.role === 'officer';
    if (onDuty && (victim.record.wanted || victim.flags.suspectOf)) return; // lawful force
    attacker.record.crimes++;
    const witnesses = W.peds.near(pos.x, pos.z, 35).filter((p) => p.cid !== attacker.id && p.cid !== victim.id).length;
    const copVictim = victim.duty != null && victim.job?.role === 'officer';
    let inc = attacker.flags.suspectOf ? W.incidents.get(attacker.flags.suspectOf) : null;
    if (!inc || inc.closed) {
      inc = W.incidents.create(what === 'killed' ? 'homicide' : 'shooting', { x: pos.x, z: pos.z, suspects: [attacker.id], victims: [victim.id], reported: witnesses > 0 || severity >= 2, reportAt: W.time + (witnesses ? 1 : 6), priority: 2, needs: { police: severity >= 2 ? 3 : 1 }, title: what === 'killed' ? 'Homicide' : severity >= 2 ? 'Shots fired' : 'Assault' });
      attacker.flags.suspectOf = inc.id;
    } else { inc.needs.police = Math.min(6, inc.needs.police + 1); if (!inc.victims.includes(victim.id)) inc.victims.push(victim.id); }
    W.history.citizenLog(attacker, what === 'killed' ? `Killed ${victim.name}` : `Attacked ${victim.name}`, true);
    if (attacker === this.player) {
      const add = what === 'killed' ? (copVictim ? 5 : 3.5) : severity >= 2 ? 2 : 1;
      if (witnesses > 0 || W.incidents.anyPoliceSees(pos.x, pos.z, 60)) this.raiseHeat(add, inc);
      if (attacker.life) attacker.life.stats.karma = Math.max(0, attacker.life.stats.karma - (what === 'killed' ? 25 : 6));
    }
  }

  homicide(victim, attacker, pos, cause) {
    const W = this.W;
    W.history.cityEvent(`${victim.name} was killed (${cause})`, { type: 'death', x: pos.x, z: pos.z, who: victim.id });
    for (const id in victim.rel) { const o = W.citizens[id]; if (o && (victim.rel[id].t === 'family' || victim.rel[id].t === 'partner')) W.history.citizenLog(o, `Lost ${victim.first} to violence`, true); }
    if (W.investigations) W.investigations.open('homicide', victim, attacker, pos, cause);
  }

  gunshotHeard(shooter, from, noise) {
    const W = this.W;
    const R = 45 * noise;
    for (const p of W.peds.near(from.x, from.z, R)) {
      const c = W.citizens[p.cid];
      if (!c || c === shooter || c.possessed || p.fallen > 0 || c.duty != null || p.action === 'down' || p.action === 'cuffed') continue;
      // run away from the noise, then carry on with life
      const dx = p.x - from.x, dz = p.z - from.z, d = Math.hypot(dx, dz) || 1;
      const tx = p.x + dx / d * 40, tz = p.z + dz / d * 40;
      W.peds.walkTo(p, tx, tz, () => { if (!c.possessed) W.citizenAI.resume(c); }, { run: true, direct: true });
      p.speed = 3.2;
      c.stress = Math.min(1, (c.stress || 0) + 0.3);
      if (rand.chance(0.02)) W.history.citizenLog(c, 'Heard gunshots nearby', false);
    }
    if (shooter === this.player) { this.lastShot = W.time; if (W.incidents.anyPoliceSees(from.x, from.z, 80)) this.raiseHeat(1); }
  }

  // ------------------------------------------------------------ wanted level
  raiseHeat(n, inc = null) {
    const W = this.W, c = this.player;
    if (!c) return;
    this.heat = clamp(Math.max(this.heat, 0) + n, 0, 5);
    this.lastSeen = W.time;
    c.record.wanted = Math.ceil(this.heat);
    if (inc) this.inc = inc;
    if (!this.inc || this.inc.closed) {
      const pos = W.citizenPos(c) || { x: 0, z: 0 };
      this.inc = W.incidents.create('wanted', { x: pos.x, z: pos.z, suspects: [c.id], priority: 2, needs: { police: 1 }, title: 'Wanted suspect' });
      c.flags.suspectOf = this.inc.id;
    }
    this.inc.needs.police = Math.min(8, Math.ceil(this.heat * 1.6));
    this.inc.priority = 2;
    W.emit('heat', { heat: this.heat });
  }

  update(dt, dtMin) {
    const W = this.W, c = this.player;
    if (!c || c.status === 'dead') { this.heat = 0; return; }
    if (this.heat > 0) {
      const pos = W.citizenPos(c);
      const seen = pos && !pos.inside && W.incidents.anyPoliceSees(pos.x, pos.z, 55 + this.heat * 10);
      if (seen) { this.lastSeen = W.time; if (this.inc) { this.inc.x = pos.x; this.inc.z = pos.z; } }
      else if (W.time - this.lastSeen > 25 + this.heat * 8) {
        this.heat = Math.max(0, this.heat - dtMin / 20);
        c.record.wanted = Math.ceil(this.heat);
        if (this.heat <= 0) { if (this.inc && !this.inc.closed) W.incidents.close(this.inc, 'suspect evaded police'); this.inc = null; c.flags.suspectOf = null; W.emit('heat', { heat: 0, lost: true }); }
      }
      if (c.status === 'jail' || c.flags.cuffed) { this.heat = 0; c.record.wanted = 0; this.inc = null; }
    }
    // armed officers return fire when you're dangerous
    this.cool -= dt;
    if (this.heat >= 3 && this.cool <= 0 && c.status === 'ok') {
      this.cool = 0.25;
      const pos = W.citizenPos(c);
      if (!pos || pos.inside) return;
      for (const p of W.peds.near(pos.x, pos.z, 38)) {
        const o = W.citizens[p.cid];
        if (!o || o === c || o.status !== 'ok' || p.fallen > 0 || o.duty == null || o.job?.role !== 'officer') continue;
        p.action = 'aim';
        p.h = Math.atan2(pos.x - p.x, pos.z - p.z);
        p.fireT = (p.fireT || 0) - 0.25;
        if (p.fireT > 0) continue;
        p.fireT = 0.9 + rand.float() * 0.6;
        const d = dist(p.x, p.z, pos.x, pos.z);
        const from = { x: p.x, y: (p.y || 0) + 1.45, z: p.z };
        const tgt = { x: pos.x + (rand.float() - 0.5) * (0.6 + d * 0.05), y: (pos.y || 0) + 1.1, z: pos.z + (rand.float() - 0.5) * (0.6 + d * 0.05) };
        const L = Math.hypot(tgt.x - from.x, tgt.y - from.y, tgt.z - from.z) || 1;
        this.fire(o, 'pistol', from, { x: (tgt.x - from.x) / L, y: (tgt.y - from.y) / L, z: (tgt.z - from.z) / L });
      }
    }
  }

  serialize() { return { h: this.heat }; }
  deserialize(o) { if (o) this.heat = o.h || 0; }
}
