// Public transit: bus lines driven by on-shift bus drivers, an underground metro
// (abstract travel between physical station buildings), and taxis.
import { C, nodeX, nodeZ } from './config.js';
import { clamp, dist } from '../core/math.js';
import { rand } from '../core/rng.js';
import { setTimeoutGame } from './citizens.js';

const LINES = [
  { name: '1 Crosstown', color: '#2a6ad0', nodes: [[1, 1], [6, 1], [6, 4], [9, 4], [9, 7], [4, 7], [4, 4], [1, 4]] },
  { name: '2 Maple Loop', color: '#2aa05a', nodes: [[4, 6], [9, 6], [9, 9], [4, 9]] },
  { name: '3 Westside', color: '#d0602a', nodes: [[0, 1], [3, 1], [3, 6], [5, 6], [5, 9], [0, 9]] },
];

export class Transit {
  constructor(world) {
    this.world = world;
    this.lines = [];
    this.buses = [];
    this.stops = [];
    this.metroRide = [];
    this.taxiQueue = [];
  }

  init() {
    const W = this.world;
    const net = W.city.net;
    const G = W.city.grid;
    LINES.forEach((L, li) => {
      // lanes visiting nodes in order (closed loop)
      const path = [];
      for (let k = 0; k < L.nodes.length; k++) {
        const [ai, aj] = L.nodes[k], [bi, bj] = L.nodes[(k + 1) % L.nodes.length];
        const a = G[ai][aj], b = G[bi][bj];
        // first lane out of node a toward b direction
        const A = net.nodes[a], B = net.nodes[b];
        const startLane = A.outLanes.map((id) => net.links[id]).find((l) => { const t = net.nodes[l.to]; return Math.sign(t.x - A.x) === Math.sign(B.x - A.x) && Math.sign(t.z - A.z) === Math.sign(B.z - A.z); });
        const endLane = B.inLanes.map((id) => net.links[id]).find((l) => { const f = net.nodes[l.from]; return Math.sign(B.x - f.x) === Math.sign(B.x - A.x) && Math.sign(B.z - f.z) === Math.sign(B.z - A.z); });
        if (!startLane || !endLane) continue;
        const r = net.route(startLane.id, endLane.id);
        if (r) path.push(...r.filter((id) => net.links[id].type === 'lane'));
      }
      const uniq = [];
      for (const id of path) if (uniq[uniq.length - 1] !== id) uniq.push(id);
      const line = { id: li, name: L.name, color: L.color, lanes: uniq, stops: [], bus: [] };
      // stops: every other street lane, on curb slots near the far end
      uniq.forEach((lid, k) => {
        if (k % 2 !== 0) return;
        const lane = net.links[lid];
        if (lane.kind !== 'street' || !lane.slots.length) return;
        const sid = lane.slots[lane.slots.length - 1];
        const s2 = lane.slots.length > 1 ? lane.slots[lane.slots.length - 2] : null;
        const sl = net.slots[sid];
        if (sl.busStop) return;
        sl.busStop = true; if (s2 != null) net.slots[s2].busStop = true;
        const ox = -Math.cos(sl.h) * 2.9, oz = Math.sin(sl.h) * 2.9;
        const stop = { id: this.stops.length, line: li, lane: lid, s: sl.s - 3, x: sl.x, z: sl.z, h: sl.h, wx: sl.x + ox, wz: sl.z + oz, waiting: [], name: `${net.roads[lane.road].name} stop` };
        this.stops.push(stop);
        line.stops.push(stop.id);
      });
      this.lines.push(line);
    });
    // buses parked at the depot
    const depot = (W.city.special.busdepot || [])[0];
    for (const line of this.lines) {
      for (let k = 0; k < 2; k++) {
        const v = W.traffic.add('bus', { color: line.color, fleet: 'bus', base: depot, personality: 0.95, reckless: 0 });
        W.traffic.parkInGarage(v, depot);
        v.name = `Bus ${line.name}`;
        const bus = { v: v.id, line: line.id, driver: null, next: k * Math.floor(line.stops.length / 2), state: 'depot', riders: [], dwell: 0 };
        v.bus = bus;
        this.buses.push(bus);
        line.bus.push(bus);
      }
    }
  }

  // ---------------------------------------------------- buses
  onDriverArrive(c) {
    const W = this.world;
    const bus = this.buses.find((b) => b.driver == null && b.state === 'depot');
    if (!bus) return;
    bus.driver = c.id;
    c.duty = 'bus';
    c.dutyBus = bus;
    const v = W.traffic.byId.get(bus.v);
    if (c.at != null) W.city.buildings[c.at].occupants.delete(c.id);
    c.at = null; c.state = 'driving'; c.veh = v.id;
    v.driver = c.id;
    bus.state = 'run';
    this.toNextStop(bus);
  }

  toNextStop(bus) {
    const W = this.world;
    const line = this.lines[bus.line];
    const v = W.traffic.byId.get(bus.v);
    const stop = this.stops[line.stops[bus.next % line.stops.length]];
    const ok = W.traffic.driveTo(v, stop.lane, stop.s, () => this.atStop(bus, stop));
    if (!ok) { bus.next++; setTimeoutGame(W, 2, () => this.toNextStop(bus)); }
  }

  atStop(bus, stop) {
    const W = this.world;
    const v = W.traffic.byId.get(bus.v);
    bus.state = 'dwell';
    v.doorsOpen = true;
    v.hold = true;
    // alight
    for (const cid of bus.riders.slice()) {
      const c = W.citizens[cid];
      if (c.busLeg && c.busLeg.stopB === stop.id) {
        bus.riders.splice(bus.riders.indexOf(cid), 1);
        c.veh = null;
        v.passengers = v.passengers.filter((x) => x !== cid);
        W.peds.spawn(c, stop.wx + (rand.float() - 0.5) * 2, stop.wz + (rand.float() - 0.5) * 2, stop.h);
        c.state = 'walking';
        const cb = c.busLeg.done; c.busLeg = null;
        cb && cb();
      }
    }
    // board
    const boarding = stop.waiting.slice();
    stop.waiting.length = 0;
    let i = 0;
    for (const cid of boarding) {
      const c = W.citizens[cid];
      if (!c.busLeg || c.possessed || !c.ped) continue;
      i++;
      const p = c.ped;
      W.peds.walkTo(p, v.x - Math.cos(v.h) * 1.6 + Math.sin(v.h) * 3, v.z + Math.sin(v.h) * 1.6 + Math.cos(v.h) * 3, () => {
        W.peds.despawn(p);
        c.state = 'passenger'; c.veh = v.id;
        v.passengers.push(cid);
        bus.riders.push(cid);
        c.money -= 2.5;
      }, { direct: true });
    }
    const driver = bus.driver != null ? W.citizens[bus.driver] : null;
    setTimeoutGame(W, 6 + i * 1.2, () => {
      v.doorsOpen = false;
      v.hold = false;
      bus.next++;
      // shift over? return to depot
      if (driver && !W.citizenAI.inShift(driver, W.minuteOfDay, 0) && bus.riders.length === 0) { this.returnToDepot(bus); return; }
      if (driver && driver.possessed) return;
      bus.state = 'run';
      this.toNextStop(bus);
    });
  }

  returnToDepot(bus) {
    const W = this.world;
    const v = W.traffic.byId.get(bus.v);
    const depot = W.city.buildings[v.base];
    bus.state = 'return';
    const lane = W.city.net.links[depot.laneNear];
    W.traffic.driveTo(v, lane.id, lane.length * 0.5, () => {
      W.traffic.parkInGarage(v, v.base);
      bus.state = 'depot';
      const c = bus.driver != null ? W.citizens[bus.driver] : null;
      bus.driver = null;
      v.driver = null;
      if (c) { c.duty = null; c.dutyBus = null; c.veh = null; W.citizenAI.placeInside(c, v.base); c.working = false; c.nextThink = W.time; c.until = 0; }
    });
  }

  busOption(fx, fz, tx, tz) {
    let best = null, bc = Infinity;
    for (const line of this.lines) {
      if (!line.bus.some((b) => b.state !== 'depot')) continue;
      let a = null, ad = Infinity, b = null, bd = Infinity;
      for (const sid of line.stops) {
        const s = this.stops[sid];
        const d1 = dist(s.wx, s.wz, fx, fz), d2 = dist(s.wx, s.wz, tx, tz);
        if (d1 < ad) { ad = d1; a = s; }
        if (d2 < bd) { bd = d2; b = s; }
      }
      if (!a || !b || a === b || ad > 280 || bd > 280) continue;
      const c = ad + bd;
      if (c < bc && c < dist(fx, fz, tx, tz) * 0.7) { bc = c; best = { line: line.id, stopA: a, stopB: b }; }
    }
    return best;
  }

  // ---------------------------------------------------- metro (underground, abstract travel between stations)
  stations() { return this.world.city.special.metro || []; }
  metroOption(fx, fz, tx, tz) {
    const W = this.world;
    let a = null, ad = Infinity, b = null, bd = Infinity;
    for (const id of this.stations()) {
      const s = W.city.buildings[id];
      if (s.state !== 'ok') continue;
      const d1 = dist(s.x, s.z, fx, fz), d2 = dist(s.x, s.z, tx, tz);
      if (d1 < ad) { ad = d1; a = id; }
      if (d2 < bd) { bd = d2; b = id; }
    }
    if (a == null || b == null || a === b || ad > 330 || bd > 330) return null;
    if (!W.power.isPoweredAt(W.city.buildings[a].x, W.city.buildings[a].z)) return null;
    return { from: a, to: b };
  }

  // ---------------------------------------------------- generic ride entry
  ride(c, leg, done) {
    const W = this.world;
    if (leg.k === 'metro') {
      if (c.ped) W.peds.despawn(c.ped);
      W.citizenAI.placeInside(c, leg.from);
      c.state = 'inside'; c.activity = 'metro'; c.inTransit = true;
      const A = W.city.buildings[leg.from], B = W.city.buildings[leg.to];
      const mins = 4 + rand.float() * 6 + (dist(A.x, A.z, B.x, B.z) / 18) * C.TIME_SCALE / 60;
      this.metroRide.push({ c: c.id, from: leg.from, to: leg.to, board: W.time + 3 + rand.float() * 4, arrive: W.time + mins, done });
      c.metroTrip = { to: leg.to, arrive: W.time + mins };
      return;
    }
    if (leg.k === 'bus') {
      const o = leg.opt;
      const stop = o.stopA;
      c.busLeg = { line: o.line, stopA: stop.id, stopB: o.stopB.id, done, since: W.time };
      stop.waiting.push(c.id);
      if (c.ped) { c.ped.action = 'wait'; }
      return;
    }
    if (leg.k === 'taxi') {
      c.taxiReq = { since: W.time, done };
      if (c.ped) c.ped.action = 'hail';
      this.taxiQueue.push(c.id);
      return;
    }
    done();
  }

  // ---------------------------------------------------- taxis
  serveTaxi(cid) {
    const W = this.world;
    const c = W.citizens[cid];
    if (!c.taxiReq || !c.ped || c.possessed) return true;
    const S = W.services;
    let best = null, bd = Infinity;
    for (const u of S.units) {
      if (u.kind !== 'taxi' || u.state !== 'cruise' || !u.crew.length || W.isPossessedUnit(u)) continue;
      const v = S.veh(u);
      const d = dist(v.x, v.z, c.ped.x, c.ped.z);
      if (d < bd) { bd = d; best = u; }
    }
    if (!best) return false;
    const u = best;
    const v = S.veh(u);
    u.state = 'job';
    u.task = { type: 'fare', cid, label: `Picking up ${c.first}` };
    const p = c.ped;
    const nl = W.city.net.nearestLane(p.x, p.z, { noHighway: true });
    if (!nl) { u.state = 'cruise'; return false; }
    W.traffic.driveTo(v, nl.lane.id, clamp(nl.s, 2, nl.lane.length - 2), () => {
      if (!c.taxiReq || !c.ped) { u.state = 'cruise'; S.cruise(u); return; }
      v.doorsOpen = true;
      W.peds.walkTo(c.ped, v.x - Math.cos(v.h) * 1.5, v.z + Math.sin(v.h) * 1.5, () => {
        W.peds.despawn(c.ped);
        c.state = 'passenger'; c.veh = v.id; v.passengers.push(c.id);
        v.doorsOpen = false;
        u.task = { type: 'fare', cid, label: `Driving ${c.first} to ${c.trip && c.trip.dest != null ? W.citizenAI.buildingName(c.trip.dest) : 'a destination'}` };
        const [tx, tz] = c.trip ? c.trip.point : [v.x, v.z];
        const dl = W.city.net.nearestLane(tx, tz, { noHighway: true });
        const startX = v.x, startZ = v.z;
        W.traffic.driveTo(v, dl.lane.id, clamp(dl.s, 2, dl.lane.length - 2), () => {
          const fare = Math.round(6 + dist(startX, startZ, v.x, v.z) * 0.02);
          c.money -= fare;
          const biz = W.economy.biz[W.city.buildings[u.base].bizId];
          if (biz) { biz.cash += fare; biz.revToday += fare; biz.custToday++; }
          v.passengers = v.passengers.filter((x) => x !== c.id);
          c.veh = null;
          W.peds.spawn(c, v.x - Math.cos(v.h) * 1.7, v.z + Math.sin(v.h) * 1.7, v.h);
          c.state = 'walking';
          const cb = c.taxiReq?.done; c.taxiReq = null;
          u.state = 'cruise';
          S.cruise(u);
          cb && cb();
        });
      }, { direct: true });
    });
    return true;
  }

  update(dt) {
    const W = this.world;
    // metro riders: board (vanish into the tunnel) then arrive at the destination station
    for (let i = this.metroRide.length - 1; i >= 0; i--) {
      const r = this.metroRide[i];
      const c = W.citizens[r.c];
      if (c.possessed) { this.metroRide.splice(i, 1); continue; }
      if (W.time >= r.arrive) {
        this.metroRide.splice(i, 1);
        c.inTransit = false; c.metroTrip = null;
        W.citizenAI.placeInside(c, r.to);
        c.state = 'inside';
        if (c.trip) {
          // exit the station toward the destination
          W.citizenAI.leaveBuilding(c);
          if (c.ped) c.trip.from = [c.ped.x, c.ped.z];
          r.done();
        }
      }
    }
    // bus waiters give up after a long wait
    for (const s of this.stops) {
      for (let i = s.waiting.length - 1; i >= 0; i--) {
        const c = W.citizens[s.waiting[i]];
        if (!c.busLeg || W.time - c.busLeg.since > 75 || !c.ped) {
          s.waiting.splice(i, 1);
          if (c.busLeg && c.ped) { const cb = c.busLeg.done; c.busLeg = null; c.ped.action = ''; c.lastThought = 'The bus never came'; if (c.trip) c.trip.from = [c.ped.x, c.ped.z]; cb && cb(); }
        }
      }
    }
    // taxi requests
    for (let i = this.taxiQueue.length - 1; i >= 0; i--) {
      const c = W.citizens[this.taxiQueue[i]];
      if (!c.taxiReq) { this.taxiQueue.splice(i, 1); continue; }
      if (W.time - c.taxiReq.since > 50) {
        this.taxiQueue.splice(i, 1);
        const cb = c.taxiReq.done; c.taxiReq = null; if (c.ped) c.ped.action = ''; c.lastThought = 'Couldn\'t get a cab';
        cb && cb();
        continue;
      }
      if (!c._taxiTry || W.time - c._taxiTry > 2) { c._taxiTry = W.time; if (this.serveTaxi(c.id)) this.taxiQueue.splice(i, 1); }
    }
  }
}
