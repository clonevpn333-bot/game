// City evolution over long saves: businesses open/close/relocate, damaged buildings
// are repaired by real construction crews, ruins are cleared and rebuilt (sometimes
// as something new), empty buildings get abandoned and demolished, people move in
// and out of the city. Changes are written to the City Archive.

import { clamp, dist } from '../core/math.js';
import { rand } from '../core/rng.js';

import { genTowerName, genAptName } from '../core/names.js';

export class Evolution {
  constructor(world) {
    this.world = world;
    this.projects = []; // {b, kind: 'repair'|'rebuild', progress, need}
    this.timer = 0;
  }

  onDamaged(b) {
    const W = this.world;
    if (!this.projects.find((p) => p.b === b.id)) this.projects.push({ b: b.id, kind: 'repair', progress: 0, need: 60 + b.damage * 240, started: W.time });
  }

  onDestroyed(b, cause) {
    const W = this.world;
    const ai = W.citizenAI;
    b.state = 'ruin';
    b.ruinedAt = W.time;
    b.ruinCause = cause;
    if (b.bizId != null) { const biz = W.economy.biz[b.bizId]; if (biz.status === 'open') W.economy.bankrupt(biz, `destroyed by ${cause}`); }
    // displaced residents
    for (const cid of b.residents.slice()) {
      const c = W.citizens[cid];
      ai.leaveHome(c);
      const nb = W.findVacancy(() => true);
      if (nb != null) { ai.setHome(c, nb); W.history.citizenLog(c, `Lost their home to ${cause}; moved to ${ai.buildingName(nb)}`, true); }
      else { c.homeless = true; W.history.citizenLog(c, `Lost their home to ${cause}`, true); }
    }
    b.residents = [];
    for (const cid of Array.from(b.occupants)) { const c = W.citizens[cid]; if (!c.possessed) { if (W.abstract) { b.occupants.delete(cid); c.at = null; ai.placeInside(c, c.home); } else ai.leaveBuilding(c); } }
    this.projects = this.projects.filter((p) => p.b !== b.id);
    this.projects.push({ b: b.id, kind: 'rebuild', progress: 0, need: 600 + b.h * 6, started: W.time + 1440 });
    W.history.landmark('ruin', b.x, b.z, `Ruins of ${b.name || ai.buildingName(b.id)} (${cause})`, { b: b.id, temporary: true });
  }

  // a citizen tries to open a business
  tryFound(c) {
    const W = this.world;
    const home = W.city.buildings[c.home];
    const vac = W.city.buildings.filter((b) => b.shop && b.bizId == null && b.state === 'ok' && (b.code !== 'SE' && b.code !== 'SW' || b.bizType));
    if (!vac.length) return null;
    vac.sort((a, b) => dist(a.x, a.z, home.x, home.z) - dist(b.x, b.z, home.x, home.z));
    const b = vac[Math.min(vac.length - 1, rand.int(0, 3))];
    // choose what the neighborhood lacks
    const counts = {};
    for (const biz of W.economy.biz) if (biz.status === 'open' && W.city.buildings[biz.b].district === b.district) counts[biz.type] = (counts[biz.type] || 0) + 1;
    const options = ['cafe', 'restaurant', 'bar', 'grocery', 'convenience', 'clothing', 'electronics', 'gym', 'autoshop', 'pharmacy'];
    const job = c.career.length ? c.career[c.career.length - 1].title : c.job ? c.job.role : '';
    let type = options.sort((x, y) => (counts[x] || 0) - (counts[y] || 0) + rand.float() * 1.5 - 0.75)[0];
    if (/mechanic/i.test(job) && rand.chance(0.7)) type = 'autoshop';
    if (/cook|server/i.test(job) && rand.chance(0.6)) type = 'restaurant';
    if (/barista/i.test(job) && rand.chance(0.6)) type = 'cafe';
    if (/bartender/i.test(job) && rand.chance(0.6)) type = 'bar';
    W.history.counters.newBiz++;
    return W.economy.found(c, b.id, type);
  }

  daily() {
    const W = this.world;
    const ai = W.citizenAI;
    const econ = W.economy;
    // franchises / chains open in vacant storefronts when the economy is good
    for (const b of W.city.buildings) {
      if (!b.shop || b.bizId != null || b.state !== 'ok') continue;
      const vacantDays = W.day - (b.vacantSince ?? W.day - 3);
      const unemp = econ.stats.unemployment || 0.1;
      if (vacantDays > 3 && rand.chance(0.006 * econ.multiplier * (0.6 + unemp * 4))) {
        const type = rand.pick(['convenience', 'cafe', 'restaurant', 'pharmacy', 'clothing', 'grocery', 'bar']);
        const biz = econ.create(type, b.id, { founded: W.day });
        W.history.cityEvent(`${biz.name} opened in ${b.district}`, { type: 'business', b: b.id, x: b.x, z: b.z, minor: true });
        W.history.counters.newBiz++;
        b.vacantSince = null;
      }
    }
    // abandonment & demolition
    for (const b of W.city.buildings) {
      const declining = ['I', 'H', 'O'].includes(b.code) || b.damage > 0.3 || W.incidents.dangerAt(b.x, b.z) > 1;
      if (b.state === 'ok' && b.resUnits > 0 && !b.shop && b.residents.length === 0 && b.kind !== 'tower' && declining) {
        b.emptyDays = (b.emptyDays || 0) + 1;
        if (b.emptyDays > 14 && rand.chance(0.08)) {
          b.state = 'abandoned';
          W.history.cityEvent(`${ai.buildingName(b.id)} in ${b.district} was abandoned`, { type: 'building', b: b.id, x: b.x, z: b.z });
        }
      } else if (b.state === 'ok') b.emptyDays = 0;
      if (b.state === 'abandoned') {
        b.abDays = (b.abDays || 0) + 1;
        if (b.residents.length > 0) { b.state = 'ok'; b.abDays = 0; }
        else if (b.abDays > 20 && rand.chance(0.1)) { W.history.cityEvent(`${ai.buildingName(b.id)} was demolished`, { type: 'building', b: b.id, x: b.x, z: b.z }); this.onDestroyed(b, 'demolition'); }
      }
      // ruins sit for a while before the lot is cleared for rebuilding
      if (b.state === 'ruin' && W.time - b.ruinedAt > 1440 * 2) { b.state = 'construction'; b.built = 0; W.history.cityEvent(`Construction began on a new building in ${b.district}`, { type: 'building', b: b.id, x: b.x, z: b.z, minor: true }); }
    }
    // vehicles finished at the shop go back to their owners
    for (const v of W.traffic.vehicles) {
      if (v.state === 'repair' && W.time >= v.repairUntil) {
        v.damage = 0; v.wreck = false;
        const o = v.owner != null ? W.citizens[v.owner] : null;
        if (o && o.status !== 'dead') {
          const hb = W.city.buildings[o.home] || W.city.buildings[v.base];
          const sl = hb ? W.traffic.findSlotNear(hb.x, hb.z, [hb.laneNear, hb.laneFar], 300) : null;
          if (sl) { W.traffic.parkAtSlot(v, sl.id); W.history.citizenLog(o, 'Got their car back from the shop', false); }
        } else if (v.fleet) { W.traffic.parkInGarage(v, v.base); }
      }
      if (v.abandoned && !v.driver && W.time - v.abandoned > 300 && v.state !== 'repair') {
        // stolen/abandoned cars are returned to their owners
        const o = v.owner != null ? W.citizens[v.owner] : null;
        v.abandoned = null; v.stolen = null; v.recovered = false; v.fleeing = false; v.ignoreLights = false;
        if (o && o.status !== 'dead') {
          const hb = W.city.buildings[o.home];
          const sl = hb ? W.traffic.findSlotNear(hb.x, hb.z, [hb.laneNear, hb.laneFar], 300) : null;
          if (sl) { W.traffic.toFree(v); W.traffic.parkAtSlot(v, sl.id); W.history.citizenLog(o, 'Their stolen car was recovered', true); }
        }
      }
    }
    // population movement
    const vacancies = W.vacancyCount();
    const openJobs = econ.openJobs().length;
    const alive = W.citizens.filter((c) => c.status !== 'dead' && c.status !== 'left');
    const unemployed = alive.filter((c) => !c.job && c.age < 66).length;
    let arrivals = 0;
    if (vacancies > 20 && openJobs > unemployed * 0.5) arrivals = Math.min(6, Math.round((openJobs - unemployed * 0.5) / 15 * econ.multiplier) + (rand.chance(0.5) ? 1 : 0));
    if (alive.length < W.targetPop * 0.9) arrivals += 2;
    for (let i = 0; i < arrivals; i++) ai.immigrate();
    // the long-term unemployed and broke may leave the city
    for (const c of alive) {
      if (c.possessed || c.bookmarked && rand.chance(0.5)) continue;
      if (!c.job && c.age < 66 && c.money < 100 && c.state === 'inside' && rand.chance(0.01 + (econ.multiplier < 1 ? 0.02 : 0))) {
        W.history.citizenLog(c, 'Left the city looking for work elsewhere', true);
        if (c.at != null) W.city.buildings[c.at].occupants.delete(c.id);
        c.at = null; c.status = 'left'; c.leftDay = W.day;
        ai.leaveHome(c);
        if (c.vehicle != null) { const v = W.traffic.byId.get(c.vehicle); if (v && (v.state === 'parked' || v.state === 'garage')) W.traffic.remove(v); c.vehicle = null; }
      }
    }
    // landmarks: temporary ones vanish when rebuilt
    W.history.landmarks = W.history.landmarks.filter((l) => !(l.temporary && l.b != null && W.city.buildings[l.b].state === 'ok'));
  }

  // construction crews physically work on projects
  update(dt, dtMin) {
    const W = this.world;
    this.timer += dt;
    if (this.timer < 1) return;
    const step = this.timer; this.timer = 0;
    const S = W.services;
    for (const u of S.units) {
      if (u.kind !== 'construction' || W.isPossessedUnit(u)) continue;
      if (u.state === 'base' && u.crew.length >= 2) {
        const p = this.projects.find((p) => !p.crew && W.time >= p.started && (W.city.buildings[p.b].state !== 'ruin'));
        if (!p) continue;
        p.crew = u.id;
        const b = W.city.buildings[p.b];
        const v = S.veh(u);
        for (const cid of u.crew) { const c = W.citizens[cid]; if (c.at != null) W.city.buildings[c.at].occupants.delete(c.id); c.at = null; c.state = 'passenger'; c.veh = v.id; }
        v.driver = u.crew[0];
        u.state = 'job';
        u.task = { type: 'build', project: p, label: `${p.kind === 'repair' ? 'Repairing' : 'Building'} ${W.citizenAI.buildingName(b.id)}` };
        const lane = W.city.net.links[b.laneNear];
        W.traffic.driveTo(v, lane.id, clamp(lane.length * 0.5, 3, lane.length - 3), () => {
          S.pullOver(v);
          const peds = S.crewOut(u);
          peds.forEach((pd, i) => {
            const tx = b.x + (rand.float() - 0.5) * b.w * 0.8, tz = b.door[1] + (b.front === 'N' ? -1.5 : b.front === 'S' ? 1.5 : 0) + (b.front === 'W' || b.front === 'E' ? (rand.float() - 0.5) * b.d * 0.6 : 0);
            W.peds.walkTo(pd, b.front === 'W' || b.front === 'E' ? b.door[0] + (b.front === 'W' ? -1.5 : 1.5) : tx, tz, () => { pd.action = 'build'; }, { direct: true });
          });
          u.task.onsite = true;
        });
      }
      if (u.state === 'job' && u.task && u.task.type === 'build' && u.task.onsite) {
        const p = u.task.project;
        const b = W.city.buildings[p.b];
        let working = 0;
        for (const cid of u.crew) { const c = W.citizens[cid]; if (c.ped && c.ped.action === 'build') working++; }
        p.progress += working * step * 30 / 60;
        if (b.state === 'construction') b.built = clamp(p.progress / p.need, 0, 1);
        const shiftOver = u.crew.some((cid) => !W.citizenAI.inShift(W.citizens[cid], W.minuteOfDay, 0));
        if (p.progress >= p.need) { this.complete(p); this.projects.splice(this.projects.indexOf(p), 1); S.release(u); }
        else if (shiftOver) { p.crew = null; S.release(u); }
      }
    }
  }

  // construction progress while nobody is watching
  offlineUpdate(dtMin) {
    const W = this.world;
    const h = W.minuteOfDay / 60;
    if (h < 7 || h > 16) return;
    for (const p of this.projects.slice(0, 2)) {
      if (W.time < p.started) continue;
      const b = W.city.buildings[p.b];
      if (b.state === 'ruin') continue;
      p.progress += dtMin * 2.4;
      if (b.state === 'construction') b.built = Math.min(1, p.progress / p.need);
      if (p.progress >= p.need) { this.complete(p); this.projects.splice(this.projects.indexOf(p), 1); }
    }
  }

  complete(p) {
    const W = this.world;
    const b = W.city.buildings[p.b];
    const ai = W.citizenAI;
    if (p.kind === 'repair') {
      b.state = 'ok'; b.damage = 0;
      W.history.cityEvent(`${ai.buildingName(b.id)} was repaired`, { type: 'building', b: b.id, x: b.x, z: b.z, minor: true });
      return;
    }
    // rebuilt: maybe something new
    b.state = 'ok'; b.damage = 0; b.built = 1; b.burned = 0;
    b.rebuilt = (b.rebuilt || 0) + 1;
    if (b.kind === 'tower' && rand.chance(0.5)) {
      b.name = genTowerName(rand);
    } else if (b.resUnits > 0) b.name = rand.chance(0.5) ? genAptName(rand, b.district) : b.name;
    if (b.shop || b.bizType) { b.vacantSince = W.day - 3; }
    W.history.cityEvent(`${b.name || ai.buildingName(b.id)} completed in ${b.district} (rebuilt)`, { type: 'building', b: b.id, x: b.x, z: b.z });
  }
}
