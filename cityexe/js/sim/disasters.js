// Large events. Each one acts on the simulation (buildings, power, traffic,
// citizens, emergency services, history), not just on visuals.
import { C } from './config.js';
import { clamp, dist } from '../core/math.js';
import { rand } from '../core/rng.js';
import { setTimeoutGame } from './citizens.js';

export const ANIMALS = {
  elephant: { len: 4.2, wid: 2.0, hgt: 3.0, speed: 1.6, color: '#8a8a8e', label: 'elephant' },
  zebra: { len: 2.2, wid: 0.8, hgt: 1.5, speed: 3.4, color: '#e8e8e8', label: 'zebra' },
  ostrich: { len: 1.2, wid: 0.7, hgt: 2.2, speed: 4.4, color: '#2a2422', label: 'ostrich' },
  giraffe: { len: 2.4, wid: 1.0, hgt: 4.8, speed: 2.4, color: '#d8a850', label: 'giraffe' },
  bear: { len: 2.0, wid: 1.0, hgt: 1.3, speed: 2.8, color: '#4a3020', label: 'bear' },
};

export class Disasters {
  constructor(world) {
    this.world = world;
    this.tornadoes = [];
    this.meteors = [];
    this.riots = [];
    this.flood = { level: 0, target: 0, until: 0, active: false };
    this.downTrees = new Set();
    this.surgeUntil = 0;
    this.crimeWaveUntil = 0;
  }

  // ---------------------------------------------------------------- tornado
  tornado(x, z) {
    const W = this.world;
    const a = rand.float() * Math.PI * 2;
    const t = { x, z, vx: Math.cos(a) * 7, vz: Math.sin(a) * 7, r: 24, life: 0, max: 85 + rand.float() * 40, damaged: new Set(), injured: 0, cars: 0, district: W.blockOf(x, z)?.district || 'the outskirts' };
    this.tornadoes.push(t);
    W.weather.set('storm', 240);
    W.history.cityEvent(`Tornado touched down near ${t.district}`, { type: 'disaster', x, z });
    W.emit('tornado', t);
    return t;
  }

  updateTornado(t, dt) {
    const W = this.world;
    t.life += dt;
    // wander
    const turn = (rand.float() - 0.5) * 0.8 * dt;
    const c = Math.cos(turn), s = Math.sin(turn);
    [t.vx, t.vz] = [t.vx * c - t.vz * s, t.vx * s + t.vz * c];
    t.x += t.vx * dt; t.z += t.vz * dt;
    const L = C.HALF + 120;
    if (Math.abs(t.x) > L) t.vx = -t.vx;
    if (Math.abs(t.z) > L) t.vz = -t.vz;
    const fade = t.life > t.max - 10 ? (t.max - t.life) / 10 : Math.min(1, t.life / 4);
    const R = t.r * fade;
    // buildings
    for (const b of W.city.buildings) {
      if (b.state === 'ruin' || b.state === 'construction') continue;
      const cx = clamp(t.x, b.x0, b.x1), cz = clamp(t.z, b.z0, b.z1);
      const d = dist(cx, cz, t.x, t.z);
      if (d > R) continue;
      const k = (1 - d / R) * dt * (b.kind === 'house' || b.kind === 'substation' ? 0.28 : b.kind === 'tower' ? 0.05 : 0.12);
      b.damage = clamp(b.damage + k, 0, 1);
      t.damaged.add(b.id);
      if (b.kind === 'substation' && b.damage > 0.3) W.power.cut(b.zoneFeeds, 'tornado damage', { repairNeed: 240 });
      if (b.damage >= 1) W.evolution.onDestroyed(b, 'the tornado');
      else if (b.damage > 0.35 && b.state === 'ok') { b.state = 'damaged'; W.evolution.onDamaged(b); }
    }
    // vehicles get thrown
    for (const v of W.traffic.vehicles) {
      if (v.state === 'garage' || v.state === 'repair' || v.state === 'abstract' || v.state === 'gone') continue;
      const d = dist(v.x, v.z, t.x, t.z);
      if (d > R * 0.9) continue;
      if (v.state !== 'free' && v.state !== 'wreck') { W.traffic.toFree(v); t.cars++; }
      const ax = t.x - v.x, az = t.z - v.z;
      const k = (1 - d / R) * 22 / v.T.mass;
      v.vx += (-az / (d + 1) * 1.6 + ax / (d + 1) * 0.6) * k * dt * 6;
      v.vz += (ax / (d + 1) * 1.6 + az / (d + 1) * 0.6) * k * dt * 6;
      if (v.y < 0.5 && rand.chance(dt * 0.8)) v.vy = 4 + rand.float() * 8 / v.T.mass;
      v.spin = (v.spin || 0) + dt * 3;
      W.traffic.damage(v, dt * 0.25);
      if (v.damage > 0.45 && !v.player && !v.fleet) { v.state = 'wreck'; v.wreck = true; }
    }
    // people
    for (const p of W.peds.near(t.x, t.z, R * 0.7)) {
      const c = W.citizens[p.cid];
      if (c.flags.tornadoHit) continue;
      c.flags.tornadoHit = true;
      p.fallen = 3;
      if (rand.chance(0.45)) { W.incidents.injure(c, 0.4 + rand.float() * 0.5, 'the tornado'); t.injured++; }
    }
    // trees
    for (let i = 0; i < W.city.props.trees.length; i++) {
      if (this.downTrees.has(i)) continue;
      const tr = W.city.props.trees[i];
      if (dist(tr.x, tr.z, t.x, t.z) < R * 0.8 && rand.chance(dt * 2)) { this.downTrees.add(i); this.treesDirty = true; }
    }
    if (t.life >= t.max) {
      const n = Array.from(t.damaged).filter((id) => W.city.buildings[id].damage > 0.2).length;
      W.history.cityEvent(`Tornado tore through ${t.district}: ${n} buildings damaged, ${t.cars} vehicles thrown, ${t.injured} injured`, { type: 'disaster', x: t.x, z: t.z });
      W.history.landmark('memorial', t.x, t.z, `Tornado memorial (${W.history.dateStr(W.time)})`);
      for (const c of W.citizens) c.flags.tornadoHit = false;
      this.tornadoes.splice(this.tornadoes.indexOf(t), 1);
    }
  }

  // ---------------------------------------------------------------- flood
  startFlood() {
    const W = this.world;
    this.flood.active = true;
    this.flood.target = 0.55;
    this.flood.until = W.time + 1440 * 0.8;
    W.weather.set('storm', 600);
    W.history.cityEvent('The Silver River burst its banks — Riverside and Westpoint flooding', { type: 'disaster', x: (W.riverX[0] + W.riverX[1]) / 2, z: 0 });
    W.emit('flood', {});
  }

  floodZone(x, z) {
    // low-lying land on both banks
    const W = this.world;
    const m = 60 + this.flood.level * 60;
    return x > W.riverX[0] - m && x < W.riverX[1] + m;
  }

  updateFlood(dtMin) {
    const W = this.world;
    const F = this.flood;
    if (!F.active && F.level <= 0) return;
    if (F.active && W.time > F.until) { F.target = 0; F.active = false; W.history.cityEvent('Floodwaters receded from Riverside', { type: 'disaster', minor: true }); }
    const prev = F.level;
    F.level += clamp(F.target - F.level, -dtMin * 0.004, dtMin * 0.006);
    const wet = F.level > 0.15;
    // lanes, buildings, parked cars
    if ((prev > 0.15) !== wet || (wet && Math.floor(W.time) % 10 === 0)) {
      for (const lane of W.city.net.lanes) {
        const [x, z] = W.city.net.laneStart(lane), [x2, z2] = W.city.net.laneEnd(lane);
        lane.flooded = wet && (this.floodZone(x, z) || this.floodZone(x2, z2)) && lane.kind !== 'highway' && lane.kind !== 'ramp';
      }
      for (const b of W.city.buildings) {
        const fl = wet && this.floodZone(b.x, b.z);
        if (fl && !b.flooded) { b.flooded = true; b.damage = Math.min(0.6, b.damage + 0.2); if (b.state === 'ok' && b.damage > 0.35) { b.state = 'damaged'; W.evolution.onDamaged(b); } }
        if (!fl) b.flooded = false;
      }
      if (wet) for (const v of W.traffic.vehicles) if (v.state === 'parked' && this.floodZone(v.x, v.z) && !v.floodDmg) { v.floodDmg = true; v.damage = Math.max(v.damage, 0.5); }
    }
    W.floodLevel = F.level;
  }

  // ---------------------------------------------------------------- meteor
  meteor(x, z) {
    const W = this.world;
    const m = { x, z, t: 0, eta: 4.5, sx: x + 600, sz: z - 300, sy: 900, done: false };
    this.meteors.push(m);
    W.emit('meteorIncoming', m);
    return m;
  }
  impact(m) {
    const W = this.world;
    m.done = true;
    const R = 20;
    let destroyed = 0, injured = 0;
    for (const b of W.city.buildings) {
      const cx = clamp(m.x, b.x0, b.x1), cz = clamp(m.z, b.z0, b.z1);
      const d = dist(cx, cz, m.x, m.z);
      if (d < R) { if (b.state !== 'ruin') { W.evolution.onDestroyed(b, 'a meteor strike'); destroyed++; } }
      else if (d < R * 2.2) { b.damage = clamp(b.damage + 0.45, 0, 1); W.incidents.ignite(b, 'meteor debris', 0.3); if (b.state === 'ok') { b.state = 'damaged'; W.evolution.onDamaged(b); } }
    }
    for (const v of W.traffic.vehicles) {
      const d = dist(v.x, v.z, m.x, m.z);
      if (d > R * 2.5 || v.state === 'garage' || v.state === 'repair' || v.state === 'abstract') continue;
      W.traffic.toFree(v);
      const k = (1 - d / (R * 2.5)) * 30 / v.T.mass;
      v.vx += (v.x - m.x) / (d + 1) * k; v.vz += (v.z - m.z) / (d + 1) * k; v.vy = k * 0.5;
      v.spin = (rand.float() - 0.5) * 4;
      W.traffic.damage(v, 0.6 * (1 - d / (R * 2.5)));
      if (v.damage > 0.45 && !v.fleet) { v.state = 'wreck'; v.wreck = true; }
    }
    for (const p of W.peds.near(m.x, m.z, R * 3)) {
      const c = W.citizens[p.cid];
      p.fallen = 3;
      if (dist(p.x, p.z, m.x, m.z) < R * 1.8 && rand.chance(0.7)) { W.incidents.injure(c, 0.5 + rand.float() * 0.5, 'the meteor impact'); injured++; }
    }
    // roads in the crater are closed until repaired
    for (const lane of W.city.net.lanes) {
      const p = lane.pl;
      for (let i = 0; i < p.n; i++) if (dist(p.pts[i * 2], p.pts[i * 2 + 1], m.x, m.z) < R) { lane.closed = true; lane.closedBy = 'crater'; break; }
    }
    const inc = W.incidents.create('fire', { x: m.x, z: m.z, priority: 1, needs: { fire: 2, police: 2, ems: Math.min(3, injured) }, title: 'Meteor impact' });
    inc.data.meteor = true;
    setTimeoutGame(W, 120, () => { W.incidents.close(inc, 'scene secured'); });
    const blk = W.blockOf(m.x, m.z);
    W.history.cityEvent(`A meteor struck ${blk ? blk.district : 'the edge of the city'}${destroyed ? `, destroying ${destroyed} building${destroyed > 1 ? 's' : ''}` : ''}`, { type: 'disaster', x: m.x, z: m.z });
    W.history.landmark('crater', m.x, m.z, `Meteor crater (${W.history.dateStr(W.time)})`, { r: R });
    this.roadRepairs = (this.roadRepairs || 0) + 1;
    setTimeoutGame(W, 60 * 30 / (C.TIME_SCALE / 20), () => { for (const lane of W.city.net.lanes) if (lane.closedBy === 'crater') { lane.closed = false; lane.closedBy = null; } W.history.cityEvent('Roads around the meteor crater reopened', { type: 'building', minor: true }); });
    W.emit('meteorImpact', m);
  }

  // ---------------------------------------------------------------- riots
  riot(x, z) {
    const W = this.world;
    const ai = W.citizenAI;
    const cands = W.citizens.filter((c) => c.status === 'ok' && !c.possessed && !c.duty && c.age < 60 && (c.state === 'inside' || c.state === 'walking') && (c.happiness < 0.55 || c.traits.honesty < 0.45));
    cands.sort((a, b) => (W.citizenPos(a) ? dist(W.citizenPos(a).x, W.citizenPos(a).z, x, z) : 1e9) - (W.citizenPos(b) ? dist(W.citizenPos(b).x, W.citizenPos(b).z, x, z) : 1e9));
    const crowd = cands.slice(0, 22);
    const riot = { x, z, members: [], t: 0, max: 240, arrests: 0, damage: 0, district: W.blockOf(x, z)?.district || 'the city' };
    const inc = W.incidents.create('riot', { x, z, priority: 1, needs: { police: 6, ems: 0 }, suspects: [], title: `Riot in ${riot.district}` });
    riot.inc = inc.id;
    for (const c of crowd) {
      c.flags.rioter = riot;
      c.trip = null;
      if (c.state === 'inside') ai.leaveBuilding(c);
      if (W.abstract) continue;
      if (!c.ped) continue;
      c.state = 'scene';
      riot.members.push(c.id);
      inc.suspects.push(c.id);
      W.peds.walkTo(c.ped, x + (rand.float() - 0.5) * 20, z + (rand.float() - 0.5) * 20, null, { run: true });
    }
    this.riots.push(riot);
    W.history.cityEvent(`Riot broke out in ${riot.district}`, { type: 'riot', x, z });
    return riot;
  }

  updateRiot(r, dt) {
    const W = this.world;
    r.t += dt;
    const inc = W.incidents.get(r.inc);
    const police = W.incidents.policeNear(r.x, r.z, 70);
    for (const id of r.members.slice()) {
      const c = W.citizens[id];
      if (!c.ped || c.flags.cuffed || c.status !== 'ok') { r.members.splice(r.members.indexOf(id), 1); continue; }
      const p = c.ped;
      if (c.possessed) continue;
      // mill around, smash things
      if (p.state === 'idle' && rand.chance(dt * 0.5)) {
        p.action = rand.pick(['', '', 'direct', 'hail']);
        W.peds.walkTo(p, r.x + (rand.float() - 0.5) * 50, r.z + (rand.float() - 0.5) * 50, null, { run: rand.chance(0.4), direct: true });
      }
      if (rand.chance(dt * 0.02)) this.vandalize(r, c);
      // police presence breaks it up; arrests come from officers on scene
      if (police > 1 && rand.chance(dt * 0.015 * police)) {
        const u = W.services.units.find((u) => u.kind === 'police' && u.incident === r.inc && (u.state === 'scene' || u.state === 'respond') && u.crew.length);
        if (u && u.state === 'scene' && !W.isPossessedUnit(u)) { r.arrests++; W.incidents.beginArrest(u, inc, c); r.members.splice(r.members.indexOf(id), 1); }
        else if (rand.chance(0.3)) { c.flags.rioter = null; r.members.splice(r.members.indexOf(id), 1); c.state = 'walking'; p.action = ''; W.citizenAI.resume(c); }
      }
    }
    if (r.t > r.max || r.members.length < 3) {
      for (const id of r.members) { const c = W.citizens[id]; c.flags.rioter = null; if (c.ped && !c.possessed) { c.ped.action = ''; c.state = 'walking'; W.citizenAI.resume(c); } }
      W.history.cityEvent(`Riot in ${r.district} ended: ${r.arrests} arrests, ${r.damage} properties damaged`, { type: 'riot', x: r.x, z: r.z });
      if (inc) W.incidents.close(inc, 'dispersed');
      this.riots.splice(this.riots.indexOf(r), 1);
    }
  }

  vandalize(r, c) {
    const W = this.world;
    const p = c.ped;
    if (rand.chance(0.5)) {
      // set a parked car on fire
      const v = W.traffic.vehicles.find((v) => v.state === 'parked' && dist(v.x, v.z, p.x, p.z) < 25);
      if (v) { W.traffic.toFree(v); v.damage = 0.9; v.state = 'wreck'; v.wreck = true; v.burning = 60; r.damage++; if (v.owner != null) W.history.citizenLog(W.citizens[v.owner], 'Car destroyed in a riot', true); return; }
    }
    const b = W.city.buildings.find((b) => b.bizId != null && dist(b.door[0], b.door[1], p.x, p.z) < 20 && b.state === 'ok');
    if (b) {
      const biz = W.economy.biz[b.bizId];
      b.damage = clamp(b.damage + 0.15, 0, 1); biz.cash -= 400; biz.rep = clamp(biz.rep - 0.08, 0, 1);
      r.damage++;
      if (rand.chance(0.12)) W.incidents.ignite(b, 'rioters', 0.1);
      if (biz.owner != null) W.history.citizenLog(W.citizens[biz.owner], `${biz.name} was vandalized during a riot`, true);
      W.history.citizenLog(c, `Vandalized ${biz.name} during a riot`, false);
    }
  }

  // ---------------------------------------------------------------- escaped animals
  escapeAnimals() {
    const W = this.world;
    const P = W.city.park;
    const kinds = ['elephant', 'zebra', 'zebra', 'ostrich', 'giraffe', 'bear'];
    W.animals.spawn(kinds, (P.zoo.x0 + P.zoo.x1) / 2, P.zoo.z1 + 4);
    W.history.cityEvent('Animals escaped from the Greenway Zoo', { type: 'animal', x: P.zoo.x0, z: P.zoo.z1 });
  }

  // ---------------------------------------------------------------- economy & society
  economy(dir) {
    const W = this.world;
    W.economy.trend = dir > 0 ? 0.35 : -0.38;
    W.economy.trendUntil = W.day + 6;
    W.history.cityEvent(dir > 0 ? 'Economic boom: spending surges across the city' : 'Economic crash: the city enters a recession', { type: 'business' });
    if (dir < 0) {
      // layoffs at shaky businesses
      for (const biz of W.economy.biz) if (biz.status === 'open' && !biz.civic && biz.cash < 3000 && rand.chance(0.25)) {
        const holders = biz.jobs.map((j) => W.economy.jobs[j]).filter((j) => j.holder != null);
        const j = holders[rand.int(0, holders.length - 1)];
        if (j) W.citizenAI.loseJob(W.citizens[j.holder], `laid off by ${biz.name} in the recession`);
      }
    }
  }

  trafficSurge() {
    const W = this.world;
    this.surgeUntil = W.time + 120;
    let n = 0;
    for (const c of W.citizens) {
      if (c.state !== 'inside' || c.possessed || c.duty || c.vehicle == null || c.working || c.activity === 'sleep') continue;
      if (!rand.chance(0.45)) continue;
      const biz = W.economy.biz[rand.int(0, W.economy.biz.length - 1)];
      if (!biz || biz.status !== 'open') continue;
      c.until = 0;
      W.citizenAI.go(c, biz.b, 'shop', { biz: biz.id });
      n++;
    }
    W.history.cityEvent(`Gridlock: ${n} drivers hit the road at once`, { type: 'accident', minor: n < 50 });
    return n;
  }

  crimeWave() {
    const W = this.world;
    this.crimeWaveUntil = W.time + 1440;
    for (const c of W.citizens) if (c.status === 'ok' && c.traits.honesty < 0.5 && rand.chance(0.3)) { c.money = Math.min(c.money, 80); c.nextThink = W.time + rand.float() * 120; }
    W.history.cityEvent('A crime wave is sweeping the city', { type: 'robbery' });
  }

  // ---------------------------------------------------------------- update
  update(dt, dtMin) {
    const W = this.world;
    for (const t of this.tornadoes.slice()) this.updateTornado(t, dt);
    for (const m of this.meteors.slice()) {
      m.t += dt;
      if (!m.done && m.t >= m.eta) this.impact(m);
      if (m.t > m.eta + 4) this.meteors.splice(this.meteors.indexOf(m), 1);
    }
    for (const r of this.riots.slice()) this.updateRiot(r, dt);
    this.updateFlood(dtMin);
    for (const v of W.traffic.vehicles) if (v.burning > 0) v.burning -= dt;
    if (W.economy.trendUntil && W.day >= W.economy.trendUntil) { W.economy.trend = 0; W.economy.trendUntil = 0; W.history.cityEvent('The economy settled back to normal', { type: 'business', minor: true }); }
  }
}

// Escaped animals wander the streets; cars stop for them; police capture them.
let AID = 0;
export class Animals {
  constructor(world) { this.world = world; this.list = []; }
  spawn(kinds, x, z) {
    const W = this.world;
    for (const k of kinds) {
      const T = ANIMALS[k];
      const a = { id: AID++, kind: k, T, x: x + (rand.float() - 0.5) * 8, z: z + (rand.float() - 0.5) * 6, h: rand.float() * 6.28, v: 0, tx: x, tz: z, anim: 0, caught: 0, radius: T.len / 2, isStaticObstacle: false, animal: true, y: 0, wait: 0 };
      this.list.push(a);
      const inc = W.incidents.create('animal', { x: a.x, z: a.z, priority: 0, needs: { police: 1 }, title: `Escaped ${T.label} on the loose`, data: { animal: a.id } });
      a.inc = inc.id;
    }
  }
  addObstacles(out) { for (const a of this.list) out.push(a); }
  update(dt) {
    const W = this.world;
    for (const a of this.list.slice()) {
      const inc = W.incidents.get(a.inc);
      if (inc) { inc.x = a.x; inc.z = a.z; }
      // wander toward random nearby points, preferring open space
      if (dist(a.x, a.z, a.tx, a.tz) < 2 || a.wait > 8) {
        const ang = rand.float() * Math.PI * 2;
        a.tx = a.x + Math.cos(ang) * 40; a.tz = a.z + Math.sin(ang) * 40;
        a.wait = 0;
      }
      const dx = a.tx - a.x, dz = a.tz - a.z;
      const scared = W.peds.near(a.x, a.z, 6).length > 2 || W.sirens.some((s) => dist(s.x, s.z, a.x, a.z) < 25);
      const sp = a.T.speed * (scared ? 1.8 : 1) * (a.caught > 0 ? 0.2 : 1);
      a.h += Math.atan2(Math.sin(Math.atan2(dx, dz) - a.h), Math.cos(Math.atan2(dx, dz) - a.h)) * Math.min(1, dt * 2);
      let nx = a.x + Math.sin(a.h) * sp * dt, nz = a.z + Math.cos(a.h) * sp * dt;
      const hit = W.collideBox(nx, nz, a.T.wid * 0.6, 0);
      if (hit || W.inWater(nx, nz)) { a.wait += 3; nx = a.x; nz = a.z; } else a.wait += dt * 0.1;
      a.x = nx; a.z = nz; a.v = sp;
      a.anim += dt * sp * 2;
      // capture: an officer on foot close by for a few seconds
      const officer = W.peds.near(a.x, a.z, 5).find((p) => { const c = W.citizens[p.cid]; return c.job && c.job.role === 'officer' && c.duty != null; });
      if (officer) a.caught += dt; else a.caught = Math.max(0, a.caught - dt * 0.5);
      if (a.caught > 5) {
        this.list.splice(this.list.indexOf(a), 1);
        W.history.cityEvent(`The escaped ${a.T.label} was captured and returned to the zoo`, { type: 'animal', x: a.x, z: a.z, minor: true });
        W.history.citizenLog(W.citizens[officer.cid], `Captured an escaped ${a.T.label}`, true);
        if (inc) W.incidents.close(inc, 'animal captured');
      }
    }
  }
}
