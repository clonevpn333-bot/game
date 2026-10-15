// City services: fleet vehicles crewed by on-shift citizens. Police patrol and
// pursue, firefighters fight fires, paramedics transport patients, tow trucks
// clear wrecks, utility crews fix the grid, delivery vans restock stores.
import { C } from './config.js';
import { clamp, dist } from '../core/math.js';
import { rand } from '../core/rng.js';
import { setTimeoutGame } from './citizens.js';

const KIND_OF_ROLE = { officer: 'police', firefighter: 'fire', paramedic: 'ems', 'tow operator': 'tow', lineworker: 'utility', 'taxi driver': 'taxi', driver: 'delivery', builder: 'construction', 'bus driver': 'bus', pilot: 'heli' };
const VTYPE = { police: 'police', fire: 'firetruck', ems: 'ambulance', tow: 'tow', utility: 'utility', taxi: 'taxi', delivery: 'delivery', construction: 'construction', bus: 'bus' };
const MIN_CREW = { police: 1, fire: 2, ems: 2, tow: 1, utility: 1, taxi: 1, delivery: 1, construction: 2, bus: 1 };
const MAX_CREW = { police: 1, fire: 3, ems: 2, tow: 1, utility: 2, taxi: 1, delivery: 1, construction: 3, bus: 1 };
const LABEL = { police: 'Patrol', fire: 'Engine', ems: 'Medic', tow: 'Tow', utility: 'Utility', taxi: 'Cab', delivery: 'Delivery', construction: 'Crew', bus: 'Bus' };
export const COLORS = { police: '#f2f2f2', fire: '#c8221a', ems: '#f4f4f4', tow: '#e8a020', utility: '#f0c020', taxi: '#f2c21a', delivery: '#e8e4dc', construction: '#e88a20', bus: '#2a6ad0' };

let UID = 1;
export class Services {
  constructor(world) {
    this.world = world;
    this.units = [];
    this.byVeh = new Map();
    this.timer = 0;
  }

  init() {
    const W = this.world;
    const sp = W.city.special;
    const make = (kind, bid, n) => {
      for (let i = 0; i < n; i++) {
        const v = W.traffic.add(VTYPE[kind], { color: COLORS[kind], fleet: kind, base: bid, personality: 1.0, reckless: 0 });
        W.traffic.parkInGarage(v, bid);
        const u = { id: UID++, kind, v: v.id, base: bid, crew: [], state: 'base', incident: null, task: null, t: 0, callsign: `${LABEL[kind]} ${kind === 'police' ? (bid === sp.police[0] ? 'A' : 'W') : ''}${i + 1}`, patrolArea: null, pursuit: null, cargo: null, stats: { calls: 0 } };
        v.unit = u.id;
        v.name = u.callsign;
        this.units.push(u);
        (this.byId ||= new Map()).set(u.id, u);
        this.byVeh.set(v.id, u);
      }
    };
    (sp.police || []).forEach((b, i) => make('police', b, i === 0 ? 7 : 4));
    (sp.fire || []).forEach((b, i) => make('fire', b, i === 0 ? 2 : 2));
    (sp.hospital || []).forEach((b) => make('ems', b, 4));
    (sp.towyard || []).forEach((b) => make('tow', b, 2));
    (sp.utility || []).forEach((b) => make('utility', b, 2));
    (sp.taxi || []).forEach((b) => make('taxi', b, 10));
    (sp.construction || []).forEach((b) => make('construction', b, 2));
    for (const biz of W.economy.biz) if (biz.type === 'warehouse') make('delivery', biz.b, 1);
  }

  unit(id) { return this.byId ? this.byId.get(id) : this.units.find((u) => u.id === id); }
  veh(u) { return this.world.traffic.byId.get(u.v); }

  // ---------------------------------------------------------------- crew
  onArriveWork(c) {
    const W = this.world;
    const kind = KIND_OF_ROLE[c.job.role];
    if (!kind || kind === 'bus' || kind === 'heli') { if (kind === 'bus') W.transit && W.transit.onDriverArrive(c); if (kind === 'heli') W.helis && W.helis.onPilotArrive(c); return; }
    const bid = W.economy.biz[c.job.biz].b;
    const u = this.units.find((u) => u.kind === kind && u.base === bid && u.crew.length < MAX_CREW[kind] && (u.state === 'base' || u.crew.length < MIN_CREW[kind]));
    if (!u) { if (kind === 'police' && W.helis) W.helis.onPilotArrive(c); return; }
    u.crew.push(c.id);
    c.duty = u.id;
    if (u.state === 'base' && u.crew.length >= MIN_CREW[kind]) this.deploy(u);
  }
  onShiftEnd(c) {
    // handled by duty check in update
  }
  endDuty(c) {
    const W = this.world;
    if (c.duty == null) return;
    const u = this.unit(c.duty);
    if (u) {
      u.crew = u.crew.filter((id) => id !== c.id);
      const v = this.veh(u);
      if (v && v.driver === c.id) v.driver = u.crew[0] ?? null;
    }
    c.duty = null;
    if (c.veh != null) c.veh = null;
  }
  dutyLabel(c) {
    const u = this.unit(c.duty);
    if (!u) {
      if (c.duty === 'bus') return 'Driving a city bus';
      if (c.duty === 'heli') { const h = c.dutyHeli; return h ? (h.state === 'pad' ? `On standby with ${h.name}` : h.story ? `Flying ${h.name} over a breaking story` : `Flying ${h.name}`) : 'Flying'; }
      return 'On duty';
    }
    const inc = u.incident != null ? this.world.incidents.get(u.incident) : null;
    switch (u.state) {
      case 'base': return `On standby at ${this.world.citizenAI.buildingName(u.base)}`;
      case 'patrol': return `On patrol (${u.callsign})`;
      case 'respond': return `Responding: ${inc ? inc.title : 'call'}`;
      case 'scene': return `On scene: ${inc ? inc.title : 'incident'}`;
      case 'pursuit': return `In pursuit of a suspect`;
      case 'transport': return u.kind === 'ems' ? 'Transporting a patient to hospital' : u.kind === 'police' ? 'Taking a suspect to jail' : 'Hauling';
      case 'return': return 'Returning to base';
      case 'job': return u.task ? u.task.label : 'Working';
      default: return u.state;
    }
  }
  available(u) { return (u.state === 'base' || u.state === 'patrol' || (u.kind === 'taxi' && u.state === 'cruise')) && u.crew.length >= MIN_CREW[u.kind] && !this.world.isPossessedUnit(u); }

  // crew leave the station in the vehicle
  deploy(u) {
    const W = this.world;
    const v = this.veh(u);
    if (!v) return;
    for (const cid of u.crew) {
      const c = W.citizens[cid];
      if (c.at != null) W.city.buildings[c.at].occupants.delete(c.id);
      c.at = null; c.state = c.id === u.crew[0] ? 'driving' : 'passenger'; c.veh = v.id; c.working = true;
    }
    v.driver = u.crew[0];
    v.passengers = u.crew.slice(1);
    if (u.kind === 'police') this.patrol(u);
    else if (u.kind === 'taxi') { u.state = 'cruise'; this.cruise(u); }
    else { u.state = 'base'; this.parkAtBase(u, true); }
  }

  parkAtBase(u, inside) {
    const W = this.world;
    const v = this.veh(u);
    if (v.state !== 'garage') {
      const b = W.city.buildings[u.base];
      const lane = W.city.net.links[b.laneNear];
      v.siren = false;
      W.traffic.driveTo(v, lane.id, Math.min(lane.length - 2, lane.length * 0.5), () => { W.traffic.parkInGarage(v, u.base); this.atBase(u); });
      u.state = 'return';
    } else this.atBase(u);
  }
  atBase(u) {
    const W = this.world;
    u.state = 'base';
    u.incident = null;
    const v = this.veh(u);
    v.siren = false;
    // crew wait inside the station
    for (const cid of u.crew) {
      const c = W.citizens[cid];
      if (c.ped) W.peds.despawn(c.ped);
      c.veh = null;
      W.citizenAI.placeInside(c, u.base);
      c.duty = u.id; c.working = true;
    }
    if (v.cargo != null) this.unloadCargo(u);
  }

  // ---------------------------------------------------------------- patrol / cruise
  patrol(u) {
    const W = this.world;
    const v = this.veh(u);
    u.state = 'patrol';
    v.siren = false;
    const b = W.city.buildings[u.base];
    // patrol around a random point within ~350m of base
    let lane = null;
    for (let k = 0; k < 10 && !lane; k++) {
      const x = b.x + (rand.float() - 0.5) * 700, z = b.z + (rand.float() - 0.5) * 700;
      const nl = W.city.net.nearestLane(x, z, { noHighway: true });
      if (nl && nl.lane.kind === 'street') lane = nl;
    }
    if (!lane) return;
    const ok = W.traffic.driveTo(v, lane.lane.id, lane.s, () => { if (u.state === 'patrol') { u.pauseT = 4 + rand.float() * 10; } });
    if (!ok) u.pauseT = 5;
  }
  cruise(u) {
    const W = this.world;
    const v = this.veh(u);
    const lanes = W.city.net.lanes.filter((l) => l.kind === 'street');
    const l = lanes[rand.int(0, lanes.length - 1)];
    W.traffic.driveTo(v, l.id, l.length * 0.5, () => { if (u.state === 'cruise') this.cruise(u); });
  }

  // ---------------------------------------------------------------- dispatch
  dispatch(inc, kind) {
    const W = this.world;
    let best = null, bd = Infinity;
    for (const u of this.units) {
      if (u.kind !== kind || !this.available(u)) continue;
      const v = this.veh(u);
      const p = v.state === 'garage' ? W.city.buildings[v.garage] : v;
      const d = dist(p.x, p.z, inc.x, inc.z) + (u.state === 'base' ? 60 : 0);
      if (d < bd) { bd = d; best = u; }
    }
    if (!best) return null;
    this.respond(best, inc);
    return best;
  }

  respond(u, inc) {
    const W = this.world;
    const v = this.veh(u);
    u.state = 'respond';
    u.incident = inc.id;
    u.stats.calls++;
    inc.units.push(u.id);
    if (u.kind === 'taxi') return;
    // crew get in if waiting at base
    if (v.state === 'garage') {
      for (const cid of u.crew) {
        const c = W.citizens[cid];
        if (c.at != null) W.city.buildings[c.at].occupants.delete(c.id);
        c.at = null; c.state = 'passenger'; c.veh = v.id;
      }
      v.driver = u.crew[0];
    }
    v.siren = inc.priority >= 1;
    v.lightsOn = true;
    if (u.kind === 'police' && inc.data.pursuitBy != null && W.incidents.joinPursuit(u, inc)) { W.emit('dispatch', { u, inc }); return; }
    this.routeTo(u, inc.x, inc.z, () => this.arriveScene(u));
    W.emit('dispatch', { u, inc });
  }

  routeTo(u, x, z, cb) {
    const W = this.world;
    const v = this.veh(u);
    const nl = W.city.net.nearestLane(x, z, { noHighway: true });
    if (!nl) return false;
    const s = clamp(nl.s, 3, nl.lane.length - 3);
    const ok = W.traffic.driveTo(v, nl.lane.id, s, cb);
    if (!ok) { u.retry = 3; }
    return ok;
  }

  // vehicle stops on scene, pulls to the side and becomes a static obstacle
  pullOver(v) {
    const W = this.world;
    if (v.state === 'lane') {
      W.traffic.toFree(v);
      v.x += -Math.cos(v.h) * 1.2; v.z += Math.sin(v.h) * 1.2;
      v.vx = v.vz = 0;
    }
    v.input = { throttle: 0, brake: 1, steer: 0, handbrake: 1 };
    v.isStaticObstacle = true;
  }

  crewOut(u, filter) {
    const W = this.world;
    const v = this.veh(u);
    const out = [];
    u.crew.forEach((cid, i) => {
      const c = W.citizens[cid];
      if (filter && !filter(c, i)) return;
      if (c.ped) { out.push(c.ped); return; }
      const side = i % 2 === 0 ? 1 : -1;
      const x = v.x - Math.cos(v.h) * 1.6 * side - Math.sin(v.h) * (i * 1.2 - 1), z = v.z + Math.sin(v.h) * 1.6 * side - Math.cos(v.h) * (i * 1.2 - 1);
      const p = W.peds.spawn(c, x, z, v.h);
      p.speed = 1.6;
      c.state = 'scene';
      c.veh = null;
      out.push(p);
    });
    if (v.driver != null && !u.crew.includes(v.driver)) v.driver = null;
    return out;
  }

  crewIn(u, cb) {
    const W = this.world;
    const v = this.veh(u);
    let pending = 0;
    const fin = () => {
      for (const cid of u.crew) {
        const c = W.citizens[cid];
        if (c.ped) W.peds.despawn(c.ped);
        c.veh = v.id; c.state = 'passenger';
      }
      v.driver = u.crew[0] ?? null;
      if (v.driver != null) W.citizens[v.driver].state = 'driving';
      cb && cb();
    };
    for (const cid of u.crew) {
      const c = W.citizens[cid];
      if (!c.ped) continue;
      if (c.possessed) continue;
      pending++;
      const tx = v.x - Math.cos(v.h) * 1.4, tz = v.z + Math.sin(v.h) * 1.4;
      W.peds.walkTo(c.ped, tx, tz, () => { W.peds.despawn(c.ped); if (--pending === 0) fin(); }, { direct: true });
    }
    if (pending === 0) fin();
  }

  release(u) {
    // unit done with incident
    const W = this.world;
    const inc = u.incident != null ? W.incidents.get(u.incident) : null;
    if (inc) inc.units = inc.units.filter((id) => id !== u.id);
    u.incident = null;
    u.task = null;
    const v = this.veh(u);
    v.siren = false;
    v.isStaticObstacle = false;
    v.input = null;
    this.crewIn(u, () => {
      if (W.isPossessedUnit(u)) return;
      if (u.kind === 'police') this.patrol(u);
      else if (u.kind === 'taxi') { u.state = 'cruise'; this.cruise(u); }
      else this.parkAtBase(u);
    });
    u.state = 'mounting';
  }

  arriveScene(u) {
    const W = this.world;
    const inc = W.incidents.get(u.incident);
    const v = this.veh(u);
    if (!inc || inc.closed) { this.release(u); return; }
    u.state = 'scene';
    v.siren = inc.priority >= 1 && u.kind !== 'tow';
    v.sceneLights = true;
    if (u.kind !== 'tow' && !v.player) this.pullOver(v);
    W.incidents.unitArrived(inc, u);
  }

  // ---------------------------------------------------------------- cargo (patients, suspects, wrecks)
  loadCargo(u, cid, cb) {
    const W = this.world;
    const v = this.veh(u);
    const c = W.citizens[cid];
    if (c.ped) W.peds.despawn(c.ped);
    c.state = 'passenger'; c.veh = v.id;
    v.cargo = cid;
    cb && cb();
  }
  unloadCargo(u) {
    const W = this.world;
    const v = this.veh(u);
    const cid = v.cargo;
    v.cargo = null;
    if (cid == null) return;
    const c = W.citizens[cid];
    c.veh = null;
    if (u.kind === 'ems') W.incidents.admitHospital(c, u.base);
    if (u.kind === 'police') W.incidents.jail(c, u.base);
  }
  transport(u, cb) {
    const W = this.world;
    const v = this.veh(u);
    u.state = 'transport';
    v.siren = u.kind === 'ems' && v.cargo != null && W.citizens[v.cargo].injured > 0.6;
    v.isStaticObstacle = false; v.input = null;
    const b = W.city.buildings[u.base];
    const lane = W.city.net.links[b.laneNear];
    W.traffic.driveTo(v, lane.id, Math.min(lane.length - 2, lane.length * 0.5), () => {
      W.traffic.parkInGarage(v, u.base);
      this.unloadCargo(u);
      const inc = u.incident != null ? W.incidents.get(u.incident) : null;
      if (inc) inc.units = inc.units.filter((id) => id !== u.id);
      u.incident = null;
      cb && cb();
      this.atBase(u);
    });
  }

  // ---------------------------------------------------------------- deliveries
  requestDelivery(biz) {
    const W = this.world;
    const u = this.units.find((u) => u.kind === 'delivery' && u.state === 'base' && u.crew.length);
    if (!u) return false;
    biz.orderPending = true;
    const b = W.city.buildings[biz.b];
    const v = this.veh(u);
    for (const cid of u.crew) { const c = W.citizens[cid]; if (c.at != null) W.city.buildings[c.at].occupants.delete(c.id); c.at = null; c.state = 'driving'; c.veh = v.id; }
    v.driver = u.crew[0];
    u.state = 'job';
    u.task = { type: 'delivery', biz: biz.id, label: `Delivering stock to ${biz.name}` };
    const nl = W.city.net.links[b.laneNear];
    W.traffic.driveTo(v, b.laneNear, clamp(nl.length * 0.5, 3, nl.length - 3), () => {
      this.pullOver(v);
      const peds = this.crewOut(u);
      const p = peds[0];
      const [dx, dz] = W.citizenAI.doorOut(b);
      if (!p) { biz.stock = 1; biz.orderPending = false; this.release(u); return; }
      p.action = 'carry';
      W.peds.walkTo(p, dx, dz, () => {
        setTimeoutGame(W, 6, () => {
          biz.stock = 1; biz.orderPending = false; biz.cash -= 180;
          p.action = '';
          this.release(u);
        });
      }, { direct: true });
    });
    return true;
  }

  // a unit's vehicle lost its route: pick up the current objective again
  recover(u) {
    const W = this.world;
    const v = this.veh(u);
    if (u.state === 'patrol') this.patrol(u);
    else if (u.state === 'cruise') this.cruise(u);
    else if (u.state === 'respond') { const inc = W.incidents.get(u.incident); if (inc && !inc.closed) this.routeTo(u, inc.x, inc.z, () => this.arriveScene(u)); else this.release(u); }
    else if (u.state === 'return' || u.state === 'transport') this.parkAtBase(u);
    else if (u.state === 'base' && v.state !== 'garage') this.parkAtBase(u);
  }

  // ---------------------------------------------------------------- per-frame
  update(dt) {
    const W = this.world;
    this.timer += dt;
    const tick = this.timer > 0.5;
    if (tick) this.timer = 0;
    for (const u of this.units) {
      if (W.isPossessedUnit(u)) {
        // the player's crewmates still do their part on scene
        if (tick && u.state === 'scene') W.incidents.sceneTick(u);
        continue;
      }
      const v = this.veh(u);
      if (!v) continue;
      if (u.pauseT > 0) { u.pauseT -= dt; if (u.pauseT <= 0 && u.state === 'patrol') this.patrol(u); }
      if (!tick) continue;
      // shift changes: crew whose shift is over go home when the unit is idle
      if (u.state === 'base' || u.state === 'patrol' || u.state === 'cruise') {
        const leaving = u.crew.filter((cid) => !W.citizenAI.inShift(W.citizens[cid], W.minuteOfDay, 0));
        if (leaving.length) {
          if (u.state !== 'base') { this.parkAtBase(u); continue; }
          for (const cid of leaving) {
            const c = W.citizens[cid];
            this.endDuty(c);
            c.working = false;
            if (c.at == null) W.citizenAI.placeInside(c, u.base);
            c.nextThink = W.time;
            c.until = 0;
          }
        }
      }
      if (u.state === 'patrol') {
        // stuck patrol with no route
        if (v.state === 'lane' && !v.route && !(u.pauseT > 0)) this.patrol(u);
        if (v.state === 'free' && !v.player && v.speed < 0.2) { u.pauseT = 2; }
        W.incidents.scanForSuspects(u);
      }
      if (u.state === 'respond' && u.retry > 0) {
        u.retry -= 0.5;
        if (u.retry <= 0) { const inc = W.incidents.get(u.incident); if (inc) this.routeTo(u, inc.x, inc.z, () => this.arriveScene(u)); }
      }
      if (u.state === 'respond' && v.state === 'lane' && !v.route) { this.arriveScene(u); }
      if (u.state === 'pursuit') W.incidents.pursuitTick(u);
      if (u.state === 'scene') W.incidents.sceneTick(u);
    }
  }
}
