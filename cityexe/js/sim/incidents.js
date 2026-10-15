// Incidents emerge from the simulation (desperate citizens, collisions, fires,
// failures, god tools) and are handled by physical responders.
import { clamp, dist } from '../core/math.js';
import { rand } from '../core/rng.js';
import { BTYPES } from './economy.js';
import { setTimeoutGame, minToPhys } from './citizens.js';

let IID = 1;
const TITLES = { robbery: 'Armed robbery', accident: 'Traffic collision', medical: 'Medical emergency', fire: 'Structure fire', fight: 'Assault in progress', power: 'Power outage', theft: 'Stolen vehicle', signal: 'Traffic signal failure', riot: 'Riot', animal: 'Escaped animal', vandalism: 'Vandalism', hitrun: 'Hit and run' };

export class Incidents {
  constructor(world) {
    this.world = world;
    this.list = [];
    this.byId = new Map();
    this.timer = 0;
    this.crimeHeat = new Map(); // block -> recent crime level
  }

  get(id) { return this.byId.get(id); }
  active() { return this.list.filter((i) => !i.closed); }

  create(type, opts = {}) {
    const W = this.world;
    const inc = {
      id: IID++, type, title: opts.title || TITLES[type] || type, x: opts.x ?? 0, z: opts.z ?? 0, b: opts.building ?? null, t: W.time,
      reported: opts.reported ?? true, reportAt: opts.reportAt ?? W.time, priority: opts.priority ?? 1,
      needs: { police: 0, fire: 0, ems: 0, tow: 0, utility: 0, ...(opts.needs || {}) }, units: [], suspects: opts.suspects || [], victims: opts.victims || [],
      injured: opts.injured || [], vehicles: opts.vehicles || [], closed: false, stage: 'new', zone: opts.zone, node: opts.node, data: opts.data || {}, log: [], severity: opts.severity || 1,
    };
    this.list.push(inc);
    this.byId.set(inc.id, inc);
    if (inc.reported) this.announce(inc);
    return inc;
  }

  announce(inc) {
    const W = this.world;
    inc.reported = true;
    if (!inc.quiet) W.emit('incident', inc);
  }

  close(inc, outcome = '') {
    if (inc.closed) return;
    const W = this.world;
    inc.closed = true;
    inc.outcome = outcome;
    if (inc.type === 'accident') this.clearAccident(inc);
    inc.closedAt = W.time;
    for (const uid of inc.units.slice()) {
      const u = W.services.unit(uid);
      if (u && u.incident === inc.id && (u.state === 'scene' || u.state === 'respond')) W.services.release(u);
    }
    W.emit('incidentClosed', inc);
    // prune
    if (this.list.length > 200) { const old = this.list.shift(); this.byId.delete(old.id); }
  }

  dangerAt(x, z) {
    let d = 0;
    for (const inc of this.list) if (!inc.closed && (inc.type === 'robbery' || inc.type === 'riot' || inc.type === 'fire') && dist(inc.x, inc.z, x, z) < 120) d += 0.6;
    return d;
  }

  // ------------------------------------------------------------ crime
  planCrime(c) {
    const W = this.world;
    const mod = W.minuteOfDay;
    const from = W.city.buildings[c.at ?? c.home];
    if (!from) return false;
    // car theft if no car
    if (c.vehicle == null && rand.chance(0.45)) {
      const cars = W.traffic.vehicles.filter((v) => v.state === 'parked' && v.owner != null && v.owner !== c.id && !v.fleet && dist(v.x, v.z, from.x, from.z) < 300);
      if (cars.length) {
        const v = cars[rand.int(0, cars.length - 1)];
        if (W.abstract) {
          // nobody is watching: the theft happens off-screen
          c.record.crimes++; c.record.lastCrime = W.time;
          const owner = v.owner != null ? W.citizens[v.owner] : null;
          W.history.citizenLog(c, `Stole a ${v.T.label} (${v.plate})`, true);
          if (owner) W.history.citizenLog(owner, `Their ${v.T.label} was stolen`, true);
          c.money += 300 + rand.int(0, 900);
          const sl = W.traffic.findSlotNear(v.x + (rand.float() - 0.5) * 600, v.z + (rand.float() - 0.5) * 600, [], 400);
          if (sl) W.traffic.parkAtSlot(v, sl.id);
          v.stolen = { by: c.id, t: W.time }; v.abandoned = W.time;
          if (rand.chance(0.35)) { c.record.arrests++; c.flags.jailFor = 2; W.history.citizenLog(c, 'Arrested for auto theft', true); W.history.counters.arrests++; this.jail(c, (W.city.special.police || [c.home])[0]); }
          return true;
        }
        c.flags.crime = { type: 'theft', v: v.id };
        c.goal = { type: 'crime', b: null, label: 'Out for a walk', point: [v.x, v.z] };
        c.record.lastCrime = W.time;
        W.citizenAI.startTrip(c, null, W.citizenAI.carSidePoint(v));
        c.trip.legs[c.trip.legs.length - 1] = { k: 'crime' };
        c.trip.legs[c.trip.legs.length - 2].park = false;
        return true;
      }
    }
    const cands = W.economy.biz.filter((b) => BTYPES[b.type].robbable && b.status === 'open' && W.economy.isOpen(b, mod) && W.time - b.robbedAt > 1440 * 2);
    if (!cands.length) return false;
    let best = null, bs = -Infinity;
    for (let k = 0; k < 10; k++) {
      const biz = cands[rand.int(0, cands.length - 1)];
      const b = W.city.buildings[biz.b];
      const d = dist(b.x, b.z, from.x, from.z);
      const police = this.policeNear(b.x, b.z, 200);
      const s = BTYPES[biz.type].robbable - d / 900 - police * 0.5 + (b.powered ? 0 : 0.8) + (W.env.night > 0.5 ? 0.3 : 0) + rand.float() * 0.4;
      if (s > bs) { bs = s; best = biz; }
    }
    if (!best) return false;
    c.flags.crime = { type: 'robbery', biz: best.id };
    c.record.lastCrime = W.time;
    W.citizenAI.go(c, best.b, 'crime', { disguise: `Heading to ${best.name}` });
    return true;
  }

  policeNear(x, z, r) {
    const W = this.world;
    let n = 0;
    for (const u of W.services.units) if (u.kind === 'police' && u.state !== 'base') { const v = W.services.veh(u); if (v && dist(v.x, v.z, x, z) < r) n++; }
    return n;
  }

  executeCrime(c) {
    const W = this.world;
    const cr = c.flags.crime;
    if (!cr) return;
    c.flags.crime = null;
    if (cr.type === 'robbery') {
      const biz = W.economy.biz[cr.biz];
      const b = W.city.buildings[biz.b];
      if (!biz || biz.status !== 'open' || c.at !== biz.b) { c.until = W.time + 10; return; }
      const take = Math.round(clamp(biz.cash * 0.25, 120, 1600) * (0.6 + rand.float() * 0.6));
      biz.cash -= take; biz.robbedAt = W.time;
      c.money += take;
      c.record.crimes++;
      W.history.counters.robberies++;
      W.history.citizenLog(c, `Robbed ${biz.name} ($${take})`, true);
      // the clerk is a victim and calls it in
      const staff = biz.jobs.map((j) => W.economy.jobs[j].holder).filter((id) => id != null && W.citizens[id].at === biz.b);
      for (const s of staff) W.history.citizenLog(W.citizens[s], `Was held up at work by a robber`, true);
      const inc = this.create('robbery', { x: b.door[0], z: b.door[1], building: b.id, suspects: [c.id], victims: staff, reported: false, reportAt: W.time + 1 + rand.float() * 2, priority: 1, needs: { police: 2 }, data: { biz: biz.id, take } });
      c.flags.suspectOf = inc.id;
      biz.rep = clamp(biz.rep - 0.05, 0, 1);
      W.emit('crime', { c, inc });
      // escape
      this.flee(c, inc, false);
    } else if (cr.type === 'theft') {
      const v = W.traffic.byId.get(cr.v);
      if (!v || v.state !== 'parked' || v.driver != null) { W.citizenAI.go(c, c.home, 'home'); return; }
      if (c.ped) W.peds.despawn(c.ped);
      v.driver = c.id; c.veh = v.id; c.state = 'driving';
      v.stolen = { by: c.id, t: W.time };
      c.record.crimes++;
      W.history.citizenLog(c, `Stole a ${v.T.label} (${v.plate})`, true);
      const owner = v.owner != null ? W.citizens[v.owner] : null;
      const inc = this.create('theft', { x: v.x, z: v.z, suspects: [c.id], victims: owner ? [owner.id] : [], reported: false, reportAt: W.time + 40 + rand.float() * 200, priority: 0, needs: { police: 1 }, data: { v: v.id } });
      c.flags.suspectOf = inc.id;
      v.alarm = rand.chance(0.35) ? 4 : 0;
      if (v.alarm) { inc.reportAt = W.time + 2; }
      // drive to a hideout far away and dump the car
      const hide = this.hideout(c, v.x, v.z);
      c.goal = { type: 'home', label: 'Driving somewhere in a hurry', b: hide };
      W.citizenAI.startTrip(c, hide);
      W.emit('crime', { c, inc });
    }
  }

  hideout(c, x, z) {
    const W = this.world;
    const far = W.city.buildings.filter((b) => b.resUnits > 0 && dist(b.x, b.z, x, z) > 400);
    return far.length ? far[rand.int(0, far.length - 1)].id : c.home;
  }

  // suspect leaves the scene (foot or getaway car)
  flee(c, inc, panic) {
    const W = this.world;
    const ai = W.citizenAI;
    if (c.possessed) return;
    const b = c.at != null ? W.city.buildings[c.at] : null;
    if (b) ai.leaveBuilding(c);
    if (W.abstract) { c.goal = { type: 'home', label: 'Laying low' }; ai.startTrip(c, c.home); return; }
    c.goal = { type: 'home', label: panic ? 'Running from the police' : 'Getting away', run: true, b: c.home };
    const v = c.vehicle != null ? W.traffic.byId.get(c.vehicle) : null;
    const p = c.ped;
    if (v && v.state === 'parked' && p && dist(v.x, v.z, p.x, p.z) < 160) {
      c.trip = null;
      const hide = this.hideout(c, p.x, p.z);
      ai.startTrip(c, hide);
      if (c.trip) c.trip.mode = 'drive';
      if (p) p.run = true;
    } else if (p) {
      // run to a random point ~250m away then walk home
      const a = rand.float() * Math.PI * 2;
      const tx = p.x + Math.cos(a) * 260, tz = p.z + Math.sin(a) * 260;
      c.trip = null;
      W.peds.walkTo(p, tx, tz, () => { if (!c.flags.cuffed) { c.goal = { type: 'home', label: 'Laying low' }; ai.startTrip(c, c.homeless ? null : c.home, c.homeless ? [tx, tz] : undefined); } }, { run: true });
      c.state = 'walking';
    }
  }

  // patrolling unit looks around for wanted suspects / stolen cars
  scanForSuspects(u) {
    const W = this.world;
    const v = W.services.veh(u);
    for (const inc of this.list) {
      if (inc.closed || !inc.suspects.length || inc.data.pursuitBy != null) continue;
      if (!inc.reported) continue;
      const s = W.citizens[inc.suspects[0]];
      if (s.status !== 'ok' || s.flags.cuffed) continue;
      const pos = W.citizenPos(s);
      if (!pos || pos.inside) continue;
      const known = s.record.wanted > 0 || inc.type === 'robbery' && W.time - inc.t < 60 || inc.type === 'theft' && inc.reported;
      if (!known) continue;
      if (dist(pos.x, pos.z, v.x, v.z) < 55) { this.startPursuit(u, inc, s); return; }
    }
  }

  joinPursuit(u, inc) {
    const W = this.world;
    const lead = W.services.unit(inc.data.pursuitBy);
    if (!lead || !lead.pursuit) return false;
    const s = W.citizens[lead.pursuit.cid];
    const v = W.services.veh(u);
    if (v.state === 'free') { v.isStaticObstacle = false; v.input = null; }
    u.state = 'pursuit';
    u.incident = inc.id;
    if (!inc.units.includes(u.id)) inc.units.push(u.id);
    u.pursuit = { cid: s.id, lostT: 0, stuckT: 0, retarget: 0, t0: W.time, foot: false, backup: true };
    v.siren = true; v.pursuing = true;
    return true;
  }

  startPursuit(u, inc, s) {
    const W = this.world;
    const v = W.services.veh(u);
    if (u.state === 'scene') { v.isStaticObstacle = false; v.input = null; }
    u.state = 'pursuit';
    u.incident = inc.id;
    if (!inc.units.includes(u.id)) inc.units.push(u.id);
    u.pursuit = { cid: s.id, lostT: 0, stuckT: 0, retarget: 0, t0: W.time, foot: false };
    v.siren = true;
    v.pursuing = true;
    inc.data.pursuitBy = u.id;
    inc.stage = 'pursuit';
    inc.data.chaseStart = inc.data.chaseStart ?? W.time;
    inc.title = s.veh != null ? 'Vehicle pursuit' : 'Foot pursuit';
    inc.needs.police = Math.max(inc.needs.police, 3);
    s.record.wanted = 1;
    const sv = s.veh != null ? W.traffic.byId.get(s.veh) : null;
    if (sv) { sv.fleeing = true; sv.ignoreLights = true; }
    if (s.ped) s.ped.run = true;
    if (!inc.data.chaseAnnounced) { inc.data.chaseAnnounced = true; W.history.counters.chases++; W.emit('pursuit', { inc, u, s }); }
    if (!s.possessed) this.suspectFleeAI(s, u);
  }

  suspectFleeAI(s, u) {
    const W = this.world;
    const sv = s.veh != null ? W.traffic.byId.get(s.veh) : null;
    const pv = W.services.veh(u);
    if (sv && (sv.state === 'lane' || sv.state === 'free' || sv.state === 'merging' || sv.state === 'parked')) {
      // pick a destination away from the pursuer
      let best = null, bd = -1;
      for (let k = 0; k < 8; k++) {
        const lane = W.city.net.lanes[rand.int(0, W.city.net.lanes.length - 1)];
        if (lane.kind !== 'street' && lane.kind !== 'highway' && lane.kind !== 'ramp') continue;
        const [x, z] = W.city.net.laneStart(lane);
        const d = dist(x, z, pv.x, pv.z) - dist(x, z, sv.x, sv.z) * 0.5;
        if (d > bd) { bd = d; best = lane; }
      }
      if (best) {
        sv.fleeing = true; sv.ignoreLights = true;
        s.trip = null;
        W.traffic.driveTo(sv, best.id, best.length * 0.5, () => { if (!s.flags.cuffed && sv.fleeing) this.suspectFleeAI(s, u); });
      }
    } else if (s.ped) {
      const p = s.ped;
      const ax = p.x - pv.x, az = p.z - pv.z, L = Math.hypot(ax, az) || 1;
      const tx = p.x + (ax / L) * 150 + (rand.float() - 0.5) * 80, tz = p.z + (az / L) * 150 + (rand.float() - 0.5) * 80;
      s.trip = null;
      W.peds.walkTo(p, tx, tz, () => { if (!s.flags.cuffed) this.suspectFleeAI(s, u); }, { run: true });
    }
  }

  pursuitTick(u) {
    const W = this.world;
    const P = u.pursuit;
    const inc = this.get(u.incident);
    const v = W.services.veh(u);
    if (!inc || !P || inc.closed) { u.pursuit = null; if (u.state === 'pursuit') W.services.release(u); return; }
    const s = W.citizens[P.cid];
    if (s.flags.cuffed || s.status !== 'ok') { u.pursuit = null; return; }
    const pos = W.citizenPos(s);
    if (!pos) { this.endPursuit(u, inc, 'escaped'); return; }
    if (pos.inside) { P.lostT += 0.5; if (P.lostT > 20) this.endPursuit(u, inc, 'escaped'); return; }
    const sv = s.veh != null ? W.traffic.byId.get(s.veh) : null;
    const officer = W.citizens[u.crew[0]];
    const op = officer && officer.ped;
    const ref = op || v;
    const d = dist(pos.x, pos.z, ref.x, ref.z);
    // visibility & escape
    const seen = d < 140 || this.anyPoliceSees(pos.x, pos.z, 120) || (W.helis && W.helis.tracking(s));
    if (!seen) P.lostT += 0.5; else P.lostT = Math.max(0, P.lostT - 1);
    if (P.lostT > 22) {
      if (inc.data.pursuitBy === u.id) this.endPursuit(u, inc, 'escaped');
      else { u.pursuit = null; v.pursuing = false; W.services.release(u); }
      return;
    }
    const speed = sv ? sv.speed : s.ped ? s.ped.v : 0;
    if (sv) {
      // vehicle chase: chase the suspect's lane position
      if (sv.state === 'wreck' || sv.damage > 0.75) {
        // suspect bails out on foot
        if (!s.possessed && s.veh != null) {
          s.veh = null; sv.driver = null; sv.fleeing = false;
          W.peds.spawn(s, sv.x - Math.cos(sv.h) * 1.7, sv.z + Math.sin(sv.h) * 1.7, sv.h);
          s.state = 'walking';
          this.suspectFleeAI(s, u);
        }
      }
      P.retarget -= 0.5;
      if (P.retarget <= 0) {
        P.retarget = 1.5;
        const nl = W.city.net.nearestLane(sv.x, sv.z, { heading: sv.h, y: sv.y });
        if (nl) W.traffic.driveTo(v, nl.lane.id, clamp(nl.s + 4, 1, nl.lane.length - 1), null);
      }
      if (d < 16 && speed < 1.5) P.stuckT += 0.5; else P.stuckT = 0;
      if (d < 10 && sv.state === 'lane') P.closeT = (P.closeT || 0) + 0.5; else P.closeT = 0;
      if (P.closeT >= 3 && !s.possessed) {
        // PIT maneuver: the suspect spins out
        P.closeT = 0;
        W.traffic.toFree(sv, 'pit');
        sv.spin = (rand.chance(0.5) ? 1 : -1) * (1.2 + rand.float());
        sv.input = { throttle: 0, brake: 0.6, steer: 0, handbrake: 1 };
        W.traffic.damage(sv, 0.15);
        W.emit('impact', { x: sv.x, z: sv.z, power: 8, v: sv, o: v });
        inc.data.pit = true;
      }
      if (P.stuckT >= 2.5) this.beginArrest(u, inc, s);
    } else if (s.ped) {
      // foot chase: officer leaves the car when close
      if (!op && d < 30) {
        this.world.services.pullOver(v);
        const peds = W.services.crewOut(u, (c, i) => i === 0);
        if (peds[0]) peds[0].run = true;
        P.foot = true;
      } else if (!op) {
        P.retarget -= 0.5;
        if (P.retarget <= 0) { P.retarget = 2; W.services.routeTo(u, pos.x, pos.z, null); }
      }
      if (op) {
        P.retarget -= 0.5;
        if (!officer.possessed && P.retarget <= 0) {
          P.retarget = 0.8;
          W.peds.walkTo(op, pos.x, pos.z, null, { run: true, direct: d < 14 });
          op.speed = 1.75;
        }
        if (d < 1.9) this.beginArrest(u, inc, s);
      }
    }
  }

  anyPoliceSees(x, z, r) {
    const W = this.world;
    for (const u of W.services.units) {
      if (u.kind !== 'police' || u.state === 'base') continue;
      const v = W.services.veh(u);
      if (v && dist(v.x, v.z, x, z) < r) return true;
    }
    return false;
  }

  endPursuit(u, inc, outcome) {
    const W = this.world;
    const s = W.citizens[u.pursuit?.cid];
    const dur = W.time - (inc.data.chaseStart || W.time);
    u.pursuit = null;
    inc.data.pursuitBy = null;
    W.services.veh(u).pursuing = false;
    if (s) {
      const sv = s.veh != null ? W.traffic.byId.get(s.veh) : null;
      if (sv) { sv.fleeing = false; sv.ignoreLights = false; }
      if (s.ped) s.ped.run = false;
    }
    if (outcome === 'escaped') {
      W.history.cityEvent(`${s ? s.name : 'A suspect'} escaped police after a ${Math.round(dur)}-minute chase`, { type: 'chase', x: s ? W.citizenPos(s)?.x : inc.x, z: s ? W.citizenPos(s)?.z : inc.z, who: s?.id });
      if (s) W.history.citizenLog(s, 'Escaped a police chase', true);
      W.emit('pursuitEnd', { inc, outcome });
      inc.stage = 'escaped';
      inc.needs.police = 0;
      setTimeoutGame(W, 2, () => this.close(inc, 'suspect escaped'));
    }
    if (u.state === 'pursuit') W.services.release(u);
  }

  beginArrest(u, inc, s) {
    const W = this.world;
    const v = W.services.veh(u);
    const dur = W.time - (inc.data.chaseStart || W.time);
    if (s.flags.cuffed) return;
    s.flags.cuffed = true;
    // suspect stops
    const sv = s.veh != null ? W.traffic.byId.get(s.veh) : null;
    if (sv) {
      if (sv.state === 'lane') { W.traffic.toFree(sv); }
      sv.fleeing = false; sv.ignoreLights = false; sv.input = { throttle: 0, brake: 1, steer: 0, handbrake: 1 };
      sv.driver = null; s.veh = null;
      W.peds.spawn(s, sv.x - Math.cos(sv.h) * 1.7, sv.z + Math.sin(sv.h) * 1.7, sv.h);
      if (sv.owner !== s.id) sv.recovered = true;
      sv.abandoned = W.time;
    }
    const sp = s.ped;
    if (sp) { W.peds.stop(sp, 'cuffed'); sp.run = false; }
    if (s.possessed) W.emit('playerArrested', { c: s });
    if (inc.data.chaseStart) {
      const mins = Math.round(dur);
      W.history.record('longestChase', mins, `Longest police chase: ${mins} minutes (${s.name})`, { x: sp?.x, z: sp?.z });
    }
    u.pursuit = null;
    inc.data.pursuitBy = null;
    inc.stage = 'arrest';
    v.pursuing = false;
    // officer walks to suspect and escorts them to the car
    if (v.state === 'lane') W.services.pullOver(v);
    const officers = W.services.crewOut(u, (c, i) => i === 0);
    const op = officers[0];
    const escort = () => {
      if (!sp || sp.dead) { this.completeArrest(u, inc, s); return; }
      const tx = v.x - Math.cos(v.h) * 1.5, tz = v.z + Math.sin(v.h) * 1.5;
      sp.action = 'cuffed';
      W.peds.walkTo(sp, tx, tz, () => { sp.action = 'cuffed'; this.completeArrest(u, inc, s); }, { direct: dist(sp.x, sp.z, tx, tz) < 40 });
      sp.speed = 1.1;
      if (op && !W.citizens[op.cid].possessed) W.peds.walkTo(op, tx + Math.sin(v.h) * 1.2, tz + Math.cos(v.h) * 1.2, () => { op.action = ''; }, { direct: dist(op.x, op.z, tx, tz) < 40 });
    };
    if (op && sp && !W.citizens[op.cid].possessed) W.peds.walkTo(op, sp.x + 0.8, sp.z + 0.8, () => { op.action = 'arrest'; setTimeoutGame(W, 2.5, escort); }, { direct: dist(op.x, op.z, sp.x, sp.z) < 30, run: true });
    else setTimeoutGame(W, 2.5, escort);
    W.emit('arrest', { u, inc, s });
  }

  completeArrest(u, inc, s) {
    const W = this.world;
    if (u.state === 'transport') return;
    for (const uid of inc.units) { const o = W.services.unit(uid); if (o && o !== u && o.state === 'pursuit') { o.pursuit = null; W.services.veh(o).pursuing = false; W.services.release(o); } }
    W.services.loadCargo(u, s.id);
    const crime = { robbery: 'armed robbery', theft: 'auto theft', fight: 'assault', riot: 'rioting', heist: 'bank robbery', homicide: 'murder', shooting: 'assault with a deadly weapon', wanted: 'evading police' }[inc.type] || 'a crime';
    s.record.arrests++;
    s.record.wanted = 0;
    W.history.counters.arrests++;
    W.history.citizenLog(s, `Arrested for ${crime}`, true);
    for (const cid of u.crew) W.history.citizenLog(W.citizens[cid], `Arrested ${s.name} for ${crime}`, inc.data.chaseStart != null);
    W.history.cityEvent(`${s.name} arrested for ${crime}${inc.data.chaseStart ? ' after a chase' : ''}`, { type: 'arrest', x: inc.x, z: inc.z, who: s.id, minor: !inc.data.chaseStart });
    s.flags.jailFor = { robbery: 3, theft: 2, heist: 18, homicide: 40, shooting: 10, wanted: Math.max(2, (s.record.wanted || 1) * 3) }[inc.type] || 1;
    if (s.isPlayer && s.record.arrests > 1) s.flags.jailFor = Math.round(s.flags.jailFor * (1 + s.record.arrests * 0.25));
    this.close(inc, 'suspect arrested');
    u.incident = null;
    W.services.crewIn(u, () => W.services.transport(u));
    u.state = 'transport';
  }

  jail(c, stationB) {
    const W = this.world;
    const days = c.flags.jailFor || 1;
    c.status = 'jail';
    c.lastJailed = W.time;
    c.flags.cuffed = false;
    c.releaseAt = W.time + days * 1440 * (0.8 + rand.float() * 0.4);
    W.citizenAI.placeInside(c, stationB);
    c.activity = 'jail';
    c.trip = null; c.goal = null;
    if (c.isPlayer) { if (c.life) { c.life.dirty = 0; } W.emit('playerJailed', { c, days }); }
    if (c.job && rand.chance(0.6)) W.citizenAI.loseJob(c, 'fired after an arrest');
  }

  admitHospital(c, hospB) {
    const W = this.world;
    c.status = 'hospital';
    c.releaseAt = W.time + (0.3 + c.injured * 2.5) * 1440;
    W.citizenAI.placeInside(c, hospB);
    c.activity = 'hospital';
    c.trip = null;
    W.history.citizenLog(c, `Admitted to ${W.citizenAI.buildingName(hospB)}`, true);
    if (c.job && c.injured > 0.8 && rand.chance(0.3)) W.citizenAI.loseJob(c, 'let go after a long hospital stay');
  }

  // ------------------------------------------------------------ collisions
  vehicleCollision(a, b, impact) {
    const W = this.world;
    if (impact < 4.5) return;
    const x = (a.x + b.x) / 2, z = (a.z + b.z) / 2;
    // merge with a recent accident nearby
    let inc = this.list.find((i) => !i.closed && i.type === 'accident' && dist(i.x, i.z, x, z) < 25 && W.time - i.t < 30);
    if (!inc) {
      inc = this.create('accident', { x, z, priority: 1, needs: { police: 1 }, reported: true });
      W.history.counters.crashes++;
      W.traffic.stats.crashes++;
    }
    for (const v of [a, b]) {
      if (!inc.vehicles.includes(v.id)) inc.vehicles.push(v.id);
      if (v.damage > 0.45 && !v.player && !v.fleet) { v.state = 'wreck'; v.wreck = true; v.input = null; v.fleeing = false; }
      // occupants
      for (const cid of [v.driver, ...(v.passengers || []), v.cargo].filter((x) => x != null)) {
        const c = W.citizens[cid];
        if (!c) continue;
        if (!c.possessed) { const hurt = clamp((impact - 5) / 18 + rand.float() * 0.25 - c.traits.caution * 0.1, 0, 1); if (hurt > 0.35) this.injure(c, hurt, 'a car crash'); }
        if (!inc.data.noted) W.history.citizenLog(c, `Was in a car crash on ${W.city.net.roads[W.city.net.nearestLane(x, z)?.lane.road]?.name || 'the road'}`, true);
      }
    }
    inc.data.noted = true;
    inc.severity = Math.max(inc.severity, impact);
    inc.needs.tow = inc.vehicles.filter((id) => { const v = W.traffic.byId.get(id); return v && v.wreck && !v.fleet; }).length;
    inc.needs.ems = inc.injured.length;
    const disaster = W.disasters.tornadoes.length || W.disasters.meteors.length;
    if (!disaster) W.history.record('worstCrash', Math.round(impact * 3.6), `Worst crash: ${Math.round(impact * 3.6)} km/h impact`, { x, z });
    if (disaster) inc.quiet = true;
    // AI drivers get out (unless injured or fleeing)
    for (const v of [a, b]) {
      const c = v.driver != null ? W.citizens[v.driver] : null;
      if (!c || c.possessed || c.duty || c.injured > 0.35) continue;
      if (c.flags.suspectOf && this.get(c.flags.suspectOf)?.data.pursuitBy != null) continue;
      if (v.fleet) continue;
      setTimeoutGame(W, 2.5, () => {
        if (c.veh !== v.id || c.possessed) return;
        v.driver = null; c.veh = null; c.trip = null;
        const p = W.peds.spawn(c, v.x - Math.cos(v.h) * 1.8, v.z + Math.sin(v.h) * 1.8, v.h);
        p.action = 'phone'; c.state = 'scene'; c.waitingIncident = inc.id; c.waitVeh = v.id;
      });
    }
  }

  injure(c, severity, cause) {
    const W = this.world;
    c.injured = Math.max(c.injured, severity);
    c.health = clamp(1 - severity, 0.05, 1);
    W.history.citizenLog(c, `Injured in ${cause}`, true);
    let inc = this.list.find((i) => !i.closed && (i.type === 'accident' || i.type === 'fire' || i.type === 'riot' || i.type === 'animal') && dist(i.x, i.z, W.citizenPos(c)?.x ?? i.x, W.citizenPos(c)?.z ?? i.z) < 40);
    if (!inc) {
      const pos = W.citizenPos(c) || { x: 0, z: 0 };
      inc = this.create('medical', { x: pos.x, z: pos.z, needs: { ems: 0 }, priority: 1 });
    }
    if (!inc.injured.includes(c.id)) inc.injured.push(c.id);
    inc.needs.ems = inc.injured.length;
    c.flags.patientOf = inc.id;
    if (c.ped && !c.possessed) { W.peds.stop(c.ped, 'down'); c.state = 'scene'; c.trip = null; }
    if (c.possessed) W.emit('playerInjured', { c, severity });
  }

  // pedestrian struck by a vehicle
  pedHit(p, v, impact) {
    const W = this.world;
    const c = W.citizens[p.cid];
    if (!c || c.flags.hitCooldown > W.time) return;
    c.flags.hitCooldown = W.time + 5;
    p.fallen = 2.5;
    const sev = clamp(impact / 14, 0.2, 1);
    if (impact > 3) this.injure(c, sev, 'being hit by a car');
    if (v && v.driver != null) {
      const d = W.citizens[v.driver];
      W.history.citizenLog(d, `Hit ${c.name} with a car`, true);
      const inc = this.list.find((i) => !i.closed && i.injured.includes(c.id));
      if (inc) { inc.needs.police = Math.max(inc.needs.police, 1); inc.title = 'Pedestrian struck'; inc.suspects = v.player ? [d.id] : inc.suspects; }
    }
  }

  // ------------------------------------------------------------ fights
  fight(a, b, building) {
    const W = this.world;
    if (!building) return;
    const aggressor = a.traits.honesty < b.traits.honesty ? a : b;
    const victim = aggressor === a ? b : a;
    this.create('fight', { x: building.door[0], z: building.door[1], building: building.id, suspects: [aggressor.id], victims: [victim.id], priority: 1, needs: { police: 1 } });
    W.history.citizenLog(aggressor, `Got into a fight with ${victim.name}`, true);
    W.history.citizenLog(victim, `Was attacked by ${aggressor.name}`, true);
    if (rand.chance(0.3)) victim.injured = 0.3;
  }

  // ------------------------------------------------------------ fires
  ignite(b, cause, amount = 0.08) {
    const W = this.world;
    if (b.state === 'ruin' || b.kind === 'substation' && false) return;
    if (b.fire <= 0) {
      b.fire = amount;
      b.fireCause = cause;
      b.fireStart = W.time;
      W.history.counters.fires++;
    } else b.fire = Math.max(b.fire, amount);
  }

  lightningStrike() {
    const W = this.world;
    const tall = W.city.buildings.filter((b) => b.h > 40 || b.kind === 'house');
    const b = tall[rand.int(0, tall.length - 1)];
    if (b) this.ignite(b, 'a lightning strike', 0.12);
  }

  updateFires(dtMin) {
    const W = this.world;
    for (const b of W.city.buildings) {
      if (b.fire <= 0) continue;
      const wind = 1 + W.weather.wind;
      const rainF = 1 - W.weather.precip * 0.6;
      b.fire = clamp(b.fire + dtMin * 0.012 * wind * rainF * (b.kind === 'brick' ? 0.8 : 1) - (b.suppress || 0) * dtMin, 0, 1);
      b.suppress = 0;
      b.damage = clamp(b.damage + dtMin * b.fire * 0.006, 0, 1);
      // report once visible
      let inc = b.fireInc ? this.get(b.fireInc) : null;
      if (!inc && b.fire > 0.15) {
        inc = this.create('fire', { x: b.door[0], z: b.door[1], building: b.id, priority: 1, needs: { fire: 1, police: 1 }, title: `Fire at ${W.citizenAI.buildingName(b.id)}` });
        b.fireInc = inc.id;
        this.evacuate(b, inc);
      }
      if (inc) {
        inc.needs.fire = b.fire > 0.55 ? 3 : b.fire > 0.3 ? 2 : 1;
        if (b.fire > 0.7 && !inc.data.big) { inc.data.big = true; W.history.cityEvent(`Major fire at ${W.citizenAI.buildingName(b.id)} in ${b.district}`, { type: 'fire', x: b.x, z: b.z, b: b.id }); }
      }
      // spread
      if (b.fire > 0.55 && rand.chance(dtMin * 0.02 * wind)) {
        for (const o of W.city.buildings) {
          if (o === b || o.fire > 0 || o.state === 'ruin') continue;
          if (Math.abs(o.x - b.x) < (o.w + b.w) / 2 + 6 && Math.abs(o.z - b.z) < (o.d + b.d) / 2 + 6) { this.ignite(o, `fire spreading from ${W.citizenAI.buildingName(b.id)}`, 0.05); break; }
        }
      }
      if (b.damage >= 1) this.burnOut(b);
      if (b.fire <= 0) this.fireOut(b);
    }
  }

  evacuate(b, inc) {
    const W = this.world;
    const ai = W.citizenAI;
    for (const cid of Array.from(b.occupants)) {
      const c = W.citizens[cid];
      if (c.possessed || c.status !== 'ok' && c.status !== 'hospital' && c.status !== 'jail') continue;
      if (W.abstract) { c.until = W.time; continue; }
      ai.leaveBuilding(c);
      const p = c.ped;
      if (!p) continue;
      const n = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }[b.front];
      const tx = b.door[0] + n[0] * 16 + (rand.float() - 0.5) * 14, tz = b.door[1] + n[1] * 16 + (rand.float() - 0.5) * 14;
      c.state = 'scene'; c.trip = null; c.duty = c.duty || null;
      c.flags.evacuated = b.id;
      W.peds.walkTo(p, tx, tz, () => { p.action = 'watch'; }, { direct: true, run: true });
      if (rand.chance(0.08 * b.fire * 4)) setTimeoutGame(W, 3, () => this.injure(c, 0.4 + rand.float() * 0.3, 'a building fire'));
      W.history.citizenLog(c, `Evacuated from a fire at ${ai.buildingName(b.id)}`, c.bookmarked);
    }
  }

  fireOut(b) {
    const W = this.world;
    b.fire = 0;
    const inc = b.fireInc ? this.get(b.fireInc) : null;
    b.fireInc = null;
    const dmg = b.damage;
    if (inc) {
      const mins = Math.round(W.time - (b.fireStart || W.time));
      W.history.record('biggestFire', Math.round(dmg * 100), `Most destructive fire: ${W.citizenAI.buildingName(b.id)} (${Math.round(dmg * 100)}% damaged)`, { x: b.x, z: b.z });
      if (dmg > 0.3) W.history.cityEvent(`Fire at ${W.citizenAI.buildingName(b.id)} put out after ${mins} min (${Math.round(dmg * 100)}% damage)`, { type: 'fire', b: b.id, x: b.x, z: b.z, minor: dmg < 0.5 });
      this.close(inc, 'fire extinguished');
    }
    if (dmg > 0.35 && b.state === 'ok') { b.state = 'damaged'; W.evolution && W.evolution.onDamaged(b); }
    this.returnEvacuees(b);
  }

  returnEvacuees(b) {
    const W = this.world;
    for (const c of W.citizens) {
      if (c.flags.evacuated !== b.id) continue;
      c.flags.evacuated = null;
      if (c.possessed || c.injured > 0.35) continue;
      if (c.state === 'scene') { c.state = 'walking'; if (c.ped) c.ped.action = ''; W.citizenAI.resume(c); }
    }
  }

  burnOut(b) {
    const W = this.world;
    b.fire = 0;
    b.state = 'ruin';
    b.damage = 1;
    const inc = b.fireInc ? this.get(b.fireInc) : null;
    b.fireInc = null;
    W.history.cityEvent(`${W.citizenAI.buildingName(b.id)} in ${b.district} was destroyed by fire`, { type: 'fire', b: b.id, x: b.x, z: b.z });
    if (inc) this.close(inc, 'building lost');
    W.evolution && W.evolution.onDestroyed(b, 'fire');
    this.returnEvacuees(b);
  }

  // ------------------------------------------------------------ responders on scene
  unitArrived(inc, u) {
    const W = this.world;
    const S = W.services;
    inc.stage = inc.stage === 'new' ? 'onscene' : inc.stage;
    u.task = { t: 0 };
    switch (u.kind) {
      case 'police': {
        if (inc.data.pursuitBy != null && inc.data.pursuitBy !== u.id && this.joinPursuit(u, inc)) return;
        if (['robbery', 'theft', 'fight', 'riot', 'shooting', 'homicide', 'wanted', 'heist'].includes(inc.type)) {
          const s = inc.suspects.length ? W.citizens[inc.suspects[0]] : null;
          const pos = s ? W.citizenPos(s) : null;
          if (s && pos && !pos.inside && !s.flags.cuffed && dist(pos.x, pos.z, inc.x, inc.z) < 160 && inc.data.pursuitBy == null) { this.startPursuit(u, inc, s); return; }
          if (inc.type === 'fight' && s && s.at === inc.b) { this.fightArrest(u, inc, s); return; }
          // investigate inside
          const peds = S.crewOut(u);
          const p = peds[0];
          const b = inc.b != null ? W.city.buildings[inc.b] : null;
          u.task = { type: 'investigate', t: 0, need: 8 };
          if (p && b) W.peds.walkTo(p, ...W.citizenAI.doorOut(b), () => { p.action = 'notes'; }, { direct: dist(p.x, p.z, b.door[0], b.door[1]) < 30 });
        } else if (inc.type === 'accident' || inc.type === 'medical' || inc.type === 'fire' || inc.type === 'animal') {
          const peds = S.crewOut(u);
          if (peds[0]) W.peds.walkTo(peds[0], inc.x + (rand.float() - 0.5) * 6, inc.z + (rand.float() - 0.5) * 6, () => { peds[0].action = 'direct'; }, { direct: true });
          u.task = { type: 'secure', t: 0, need: inc.type === 'accident' ? 18 : 25 };
        } else {
          u.task = { type: 'secure', t: 0, need: 6 };
        }
        break;
      }
      case 'fire': {
        const b = inc.b != null ? W.city.buildings[inc.b] : null;
        const peds = S.crewOut(u);
        peds.forEach((p, i) => {
          if (!b) return;
          const n = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }[b.front];
          const tx = b.door[0] + n[0] * 7 + (i - 1) * 3 * Math.abs(n[1]), tz = b.door[1] + n[1] * 7 + (i - 1) * 3 * Math.abs(n[0]);
          W.peds.walkTo(p, tx, tz, () => { p.action = 'hose'; p.hoseTarget = { x: b.x, z: b.z, y: Math.min(b.h * 0.5, 8) }; }, { direct: true });
        });
        u.task = { type: 'fire', t: 0 };
        break;
      }
      case 'ems': {
        // pick an untreated patient
        const pid = inc.injured.find((cid) => !inc.data['ems' + cid]);
        if (pid == null) { S.release(u); return; }
        inc.data['ems' + pid] = u.id;
        const pat = W.citizens[pid];
        const pos = W.citizenPos(pat) || { x: inc.x, z: inc.z };
        const peds = S.crewOut(u);
        peds.forEach((p, i) => W.peds.walkTo(p, pos.x + (i ? 0.9 : -0.9), pos.z + 0.6, () => { p.action = 'kneel'; }, { direct: dist(p.x, p.z, pos.x, pos.z) < 40 }));
        u.task = { type: 'treat', t: 0, need: 7, patient: pid };
        // patients stuck in vehicles are pulled out
        if (pat.veh != null && !pat.possessed) {
          const pv = W.traffic.byId.get(pat.veh);
          if (pv && pv.driver === pat.id) pv.driver = null;
          pat.veh = null;
          const pp = W.peds.spawn(pat, pos.x - Math.cos(pv?.h || 0) * 1.8, pos.z + Math.sin(pv?.h || 0) * 1.8);
          W.peds.stop(pp, 'down'); pat.state = 'scene';
        }
        break;
      }
      case 'tow': {
        const vid = inc.vehicles.find((id) => { const v = W.traffic.byId.get(id); return v && v.wreck && !v.towedBy && !v.player && !v.fleet; });
        if (vid == null) { S.release(u); return; }
        const wv = W.traffic.byId.get(vid);
        wv.towedBy = u.v;
        u.task = { type: 'tow', t: 0, need: 4, wreck: vid };
        S.pullOver(S.veh(u));
        break;
      }
      case 'utility': {
        const peds = S.crewOut(u);
        const sb = inc.b != null ? W.city.buildings[inc.b] : null;
        peds.forEach((p, i) => W.peds.walkTo(p, (sb ? sb.x : inc.x) + (i - 0.5) * 4, (sb ? sb.z : inc.z) + 2, () => { p.action = 'repair'; }, { direct: true }));
        u.task = { type: 'repair', t: 0 };
        break;
      }
    }
  }

  fightArrest(u, inc, s) {
    const W = this.world;
    const b = W.city.buildings[inc.b];
    const peds = W.services.crewOut(u);
    const p = peds[0];
    const go = () => {
      setTimeoutGame(W, minToPhys(6), () => {
        if (s.at === inc.b) {
          W.citizenAI.leaveBuilding(s);
          s.flags.cuffed = true;
          if (s.ped) s.ped.action = 'cuffed';
          this.beginArrestFromFoot(u, inc, s);
        } else { this.close(inc, 'suspect gone'); }
      });
    };
    if (p) W.peds.walkTo(p, ...W.citizenAI.doorOut(b), go, { direct: true }); else go();
  }

  beginArrestFromFoot(u, inc, s) {
    s.flags.cuffed = false;
    this.beginArrest(u, inc, s);
  }

  // called every 0.5s (physical) for units on scene
  sceneTick(u) {
    const W = this.world;
    const S = W.services;
    const inc = this.get(u.incident);
    if (!inc || inc.closed) { S.release(u); return; }
    const t = u.task || (u.task = { t: 0 });
    const dtMin = (0.5 * 30) / 60 * (W.timeScaleMul || 1);
    t.t += dtMin;
    switch (t.type) {
      case 'investigate':
        if (t.t > t.need) {
          if (inc.suspects.length) {
            const s = W.citizens[inc.suspects[0]];
            if (rand.chance(0.75)) { s.record.wanted = 1; inc.data.identified = true; W.history.citizenLog(s, 'Became a wanted suspect', true); }
          }
          inc.needs.police = 0;
          if (inc.data.pursuitBy == null) this.close(inc, inc.data.identified ? 'suspect identified' : 'report filed');
          else S.release(u);
        }
        break;
      case 'secure': {
        const others = inc.units.filter((id) => { const o = S.unit(id); return o && o !== u && (o.kind === 'ems' || o.kind === 'tow' || o.kind === 'fire'); });
        const waiting = (inc.needs.ems > 0 && inc.injured.some((cid) => W.citizens[cid].status === 'ok' && W.citizens[cid].injured > 0)) || (inc.type === 'fire' && inc.b != null && W.city.buildings[inc.b].fire > 0) || (inc.needs.tow > 0 && inc.vehicles.some((id) => { const v = W.traffic.byId.get(id); return v && v.wreck && !v.player && !v.fleet && v.state !== 'gone' && v.state !== 'towed' && v.state !== 'repair'; }));
        if (t.t > t.need && !waiting && !others.length) {
          if (inc.type === 'accident') this.clearAccident(inc);
          this.close(inc, 'scene cleared');
        }
        if (t.t > 240) this.close(inc, 'scene cleared');
        break;
      }
      case 'fire': {
        const b = W.city.buildings[inc.b];
        if (!b || b.fire <= 0) { S.release(u); return; }
        let hosing = 0;
        for (const cid of u.crew) { const c = W.citizens[cid]; if (c.ped && c.ped.action === 'hose') hosing++; }
        b.suppress = (b.suppress || 0) + hosing * 0.014;
        break;
      }
      case 'treat': {
        const pat = W.citizens[t.patient];
        if (pat.status !== 'ok' || !pat.injured) { S.release(u); return; }
        if (pat.possessed) { if (t.t > t.need) W.emit('playerTreated', { c: pat }); break; }
        if (t.t > t.need && !t.loading) {
          t.loading = true;
          
          S.loadCargo(u, pat.id, () => {
            inc.injured = inc.injured.filter((id) => id !== pat.id);
            inc.needs.ems = inc.injured.length;
            W.history.citizenLog(pat, 'Taken away by ambulance', false);
            S.crewIn(u, () => S.transport(u, () => { if (!inc.injured.length && inc.type === 'medical') this.close(inc, 'patient transported'); }));
          });
        }
        break;
      }
      case 'tow': {
        const wv = W.traffic.byId.get(t.wreck);
        if (!wv) { S.release(u); return; }
        const policeDone = !inc.units.some((id) => { const o = S.unit(id); return o && o.kind === 'police' && o.task && o.task.t < 6; });
        if (t.t > t.need && policeDone && !inc.injured.some((cid) => W.citizens[cid].status === 'ok' && W.citizens[cid].injured > 0 && W.citizenPos(W.citizens[cid]) && dist(W.citizenPos(W.citizens[cid]).x, W.citizenPos(W.citizens[cid]).z, wv.x, wv.z) < 6)) {
          this.towAway(u, inc, wv);
        }
        break;
      }
      case 'repair': {
        const z = inc.zone;
        let working = 0;
        for (const cid of u.crew) { const c = W.citizens[cid]; if (c.ped && c.ped.action === 'repair') working++; }
        let done = false;
        if (z) done = W.power.work(z, working * dtMin * 1.5);
        if (inc.node != null) { t.prog = (t.prog || 0) + working * dtMin; if (t.prog > 25) { const n = W.city.net.nodes[inc.node]; n.failed = false; done = true; W.history.cityEvent('Traffic signal repaired', { type: 'signal', minor: true }); } }
        if (done) this.close(inc, 'repaired');
        break;
      }
    }
  }

  towAway(u, inc, wv) {
    const W = this.world;
    const S = W.services;
    const tv = S.veh(u);
    // drivers/passengers of the wreck walk off
    if (wv.driver != null) { const d = W.citizens[wv.driver]; if (d && !d.possessed) { wv.driver = null; d.veh = null; } }
    wv.state = 'towed';
    wv.towedBy = tv.id;
    tv.isStaticObstacle = false; tv.input = null;
    inc.vehicles = inc.vehicles.filter((id) => id !== wv.id);
    inc.needs.tow = Math.max(0, inc.needs.tow - 1);
    u.state = 'transport';
    const b = W.city.buildings[u.base];
    const lane = W.city.net.links[b.laneNear];
    W.traffic.driveTo(tv, lane.id, Math.min(lane.length - 2, lane.length * 0.5), () => {
      W.traffic.parkInGarage(tv, u.base);
      W.traffic.parkInGarage(wv, u.base);
      wv.towedBy = null;
      wv.state = 'repair';
      wv.repairUntil = W.time + (1 + wv.damage * 2.5) * 1440;
      const owner = wv.owner != null ? W.citizens[wv.owner] : null;
      if (owner) {
        if (wv.damage > 0.88) {
          W.history.citizenLog(owner, `Car (${wv.T.label}) was totaled`, true);
          owner.vehicle = null;
          W.traffic.remove(wv);
        } else {
          const cost = Math.round(300 + wv.damage * 1600);
          owner.money -= cost;
          W.history.citizenLog(owner, `Car sent to the shop ($${cost})`, false);
        }
      }
      const ui = inc.units.indexOf(u.id); if (ui >= 0) inc.units.splice(ui, 1);
      u.incident = null;
      S.atBase(u);
    });
  }

  clearAccident(inc) {
    const W = this.world;
    // drivers of drivable cars continue their day
    for (const vid of inc.vehicles) {
      const v = W.traffic.byId.get(vid);
      if (!v || v.player) continue;
      if (v.state === 'wreck' && v.damage <= 0.45) v.state = 'free';
    }
    for (const c of W.citizens) {
      if (c.waitingIncident !== inc.id) continue;
      c.waitingIncident = null;
      if (c.possessed || c.injured > 0.35) continue;
      const v = W.traffic.byId.get(c.waitVeh);
      if (c.ped) c.ped.action = '';
      c.state = 'walking';
      if (v && !v.wreck && v.state === 'free' && v.driver == null) {
        if (c.ped) W.peds.despawn(c.ped);
        v.driver = c.id; c.veh = v.id; c.state = 'driving';
        v.isStaticObstacle = false;
      }
      W.citizenAI.resume(c);
    }
  }

  // ------------------------------------------------------------ random events
  randomEvents(dtMin) {
    const W = this.world;
    // medical emergencies outdoors (heat waves raise this)
    const pRate = dtMin * 0.0009 * (W.weather.heat ? 4 : 1) * (W.weather.temp < -5 ? 2 : 1);
    if (rand.chance(pRate) && W.peds.list.length) {
      const p = W.peds.list[rand.int(0, W.peds.list.length - 1)];
      const c = W.citizens[p.cid];
      if (c && !c.possessed && !c.duty && c.status === 'ok' && c.state === 'walking' && !c.flags.crime) {
        this.injure(c, 0.5 + rand.float() * 0.3, W.weather.heat ? 'heatstroke' : 'a collapse on the street');
      }
    }
    // building fires: older buildings and heat raise the chance
    if (rand.chance(dtMin * 0.00035 * (W.weather.heat ? 3 : 1))) {
      const b = W.city.buildings[rand.int(0, W.city.buildings.length - 1)];
      if (b.state === 'ok' && b.kind !== 'substation' && !b.civic) this.ignite(b, rand.pick(['faulty wiring', 'a kitchen accident', 'an unattended candle', 'a space heater']), 0.06);
    }
    // traffic signal failures
    if (rand.chance(dtMin * 0.00025 * (1 + W.weather.wind * 3))) {
      const nodes = W.city.net.nodes.filter((n) => n.signal && !n.failed);
      const n = nodes[rand.int(0, nodes.length - 1)];
      if (n) this.failSignal(n, 'malfunction');
    }
  }

  failSignal(n, cause) {
    const W = this.world;
    n.failed = true;
    const inc = this.create('signal', { x: n.x, z: n.z, node: n.id, priority: 0, needs: { utility: 1 }, title: `Traffic light out (${cause})` });
    W.history.cityEvent(`Traffic signal failed at ${W.nodeName(n)}`, { type: 'signal', x: n.x, z: n.z, minor: true });
    return inc;
  }

  // ------------------------------------------------------------ offline (catch-up) resolution
  offlineUpdate(dtMin) {
    const W = this.world;
    this.updateFires(dtMin);
    this.randomEvents(dtMin);
    // occasional traffic accidents happen even when nobody is watching
    if (rand.chance(dtMin * 0.0012)) {
      const drivers = W.citizens.filter((c) => c.state === 'abstract' && c.veh != null);
      if (drivers.length) {
        const c = drivers[rand.int(0, drivers.length - 1)];
        const v = W.traffic.byId.get(c.veh);
        W.history.counters.crashes++;
        W.history.citizenLog(c, 'Was in a car crash', true);
        if (v) { v.damage = Math.max(v.damage, 0.3 + rand.float() * 0.5); }
        if (rand.chance(0.35)) { c.injured = 0.3 + rand.float() * 0.5; c.state = 'inside'; c.trip = null; if (v) { W.traffic.parkInGarage(v, (W.city.special.towyard || [0])[0]); v.state = 'repair'; v.repairUntil = W.time + 1440 * 2; v.driver = null; } c.veh = null; this.admitHospital(c, (W.city.special.hospital || [c.home])[0]); }
      }
    }
    for (const inc of this.list) {
      if (inc.closed) continue;
      const age = W.time - inc.t;
      if (inc.type === 'fire') {
        const b = W.city.buildings[inc.b];
        if (b && age > 25 + rand.float() * 60) { b.suppress = 0.2; }
        continue;
      }
      if (age < 20) continue;
      if (inc.type === 'robbery' || inc.type === 'theft' || inc.type === 'fight') {
        const s = inc.suspects.length ? W.citizens[inc.suspects[0]] : null;
        if (s && s.status === 'ok' && rand.chance(0.5)) {
          if (s.at != null) W.city.buildings[s.at].occupants.delete(s.id);
          s.trip = null; s.state = 'inside'; s.veh = null;
          if (s.ped) W.peds.despawn(s.ped);
          s.record.arrests++; s.record.wanted = 0;
          s.flags.jailFor = inc.type === 'robbery' ? 3 : 2;
          W.history.citizenLog(s, `Arrested for ${inc.type === 'robbery' ? 'armed robbery' : inc.type === 'theft' ? 'auto theft' : 'assault'}`, true);
          W.history.cityEvent(`${s.name} arrested for ${inc.type === 'robbery' ? 'armed robbery' : inc.type === 'theft' ? 'auto theft' : 'assault'}`, { type: 'arrest', x: inc.x, z: inc.z, who: s.id, minor: true });
          W.history.counters.arrests++;
          this.jail(s, (W.city.special.police || [s.home])[0]);
          this.close(inc, 'suspect arrested');
        } else this.close(inc, 'suspect escaped');
        continue;
      }
      for (const cid of inc.injured) { const c = W.citizens[cid]; if (c.status === 'ok') { if (c.ped) W.peds.despawn(c.ped); if (c.at != null) W.city.buildings[c.at].occupants.delete(c.id); c.at = null; c.trip = null; c.state = 'inside'; this.admitHospital(c, (W.city.special.hospital || [c.home])[0]); } }
      if (inc.type === 'signal' && inc.node != null) W.city.net.nodes[inc.node].failed = false;
      for (const vid of inc.vehicles) { const v = W.traffic.byId.get(vid); if (v && v.wreck && !v.fleet) { W.traffic.parkInGarage(v, (W.city.special.towyard || [0])[0]); v.state = 'repair'; v.repairUntil = W.time + 1440 * (1 + v.damage * 2); v.driver = null; } }
      if (inc.type !== 'power') this.close(inc, 'resolved');
    }
  }

  // ------------------------------------------------------------ main update
  update(dt, dtMin) {
    const W = this.world;
    this.updateFires(dtMin);
    this.randomEvents(dtMin);
    this.timer += dt;
    if (this.timer < 0.5) return;
    this.timer = 0;
    for (const inc of this.list) {
      if (inc.closed) continue;
      if (!inc.reported && W.time >= inc.reportAt) { this.announce(inc); W.history.cityEvent(`${inc.title} reported${inc.b != null ? ' at ' + W.citizenAI.buildingName(inc.b) : ''}`, { type: inc.type, x: inc.x, z: inc.z, minor: inc.type !== 'robbery' }); }
      if (!inc.reported) continue;
      // dispatch whatever is still needed
      for (const kind of ['police', 'fire', 'ems', 'tow', 'utility']) {
        const need = inc.needs[kind] || 0;
        if (!need) continue;
        const have = inc.units.filter((id) => W.services.unit(id)?.kind === kind).length;
        if (have < need && W.time - (inc['lastTry' + kind] || -99) > 1.5) {
          inc['lastTry' + kind] = W.time;
          W.services.dispatch(inc, kind);
        }
      }
      // stale incidents
      if (W.time - inc.t > 60 * 10 && inc.type !== 'power' && inc.type !== 'fire') this.close(inc, 'timed out');
      if (inc.type === 'power' && W.power.zones[inc.zone]?.on) this.close(inc, 'power restored');
      if (inc.type === 'theft') {
        const v = W.traffic.byId.get(inc.data.v);
        if (!v || v.recovered) this.close(inc, 'vehicle recovered');
      }
      if (inc.type === 'medical' && !inc.injured.length) this.close(inc, 'resolved');
    }
  }
}
