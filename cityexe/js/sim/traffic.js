// Vehicle simulation.
// Lane mode: 1-D car following (IDM) on lanes/connectors with signals, all-way stops,
// intersection reservations, merging, yielding to sirens, passing stopped obstacles.
// Free mode: 2-D arcade rigid body (player driving, crashes, close pursuit).
// Parked: sits in a curb slot or inside a garage building.
import { C } from './config.js';
import { clamp, lerp, wrapAngle, SpatialHash, dist } from '../core/math.js';
import { rand } from '../core/rng.js';

export const VTYPES = {
  hatch: { len: 3.9, wid: 1.75, hgt: 1.45, vmax: 34, acc: 2.6, grip: 9, mass: 1.0, label: 'hatchback' },
  sedan: { len: 4.6, wid: 1.82, hgt: 1.45, vmax: 40, acc: 3.0, grip: 9.5, mass: 1.2, label: 'sedan' },
  oldsedan: { len: 4.8, wid: 1.85, hgt: 1.5, vmax: 32, acc: 2.2, grip: 8, mass: 1.3, label: 'old sedan' },
  suv: { len: 4.8, wid: 1.95, hgt: 1.75, vmax: 38, acc: 2.8, grip: 9, mass: 1.6, label: 'SUV' },
  pickup: { len: 5.3, wid: 2.0, hgt: 1.85, vmax: 36, acc: 2.7, grip: 8.5, mass: 1.7, label: 'pickup' },
  oldpickup: { len: 5.2, wid: 1.95, hgt: 1.85, vmax: 30, acc: 2.0, grip: 7.5, mass: 1.6, label: 'old pickup' },
  sports: { len: 4.4, wid: 1.9, hgt: 1.2, vmax: 55, acc: 5.0, grip: 11, mass: 1.1, label: 'sports car' },
  van: { len: 5.2, wid: 2.0, hgt: 2.3, vmax: 32, acc: 2.2, grip: 8, mass: 2.0, label: 'van' },
  taxi: { len: 4.6, wid: 1.82, hgt: 1.45, vmax: 40, acc: 3.0, grip: 9.5, mass: 1.2, label: 'taxi' },
  police: { len: 4.8, wid: 1.85, hgt: 1.5, vmax: 50, acc: 4.2, grip: 11, mass: 1.4, label: 'patrol car' },
  ambulance: { len: 6.2, wid: 2.2, hgt: 2.7, vmax: 40, acc: 3.0, grip: 9, mass: 2.6, label: 'ambulance' },
  firetruck: { len: 9.2, wid: 2.5, hgt: 3.2, vmax: 34, acc: 2.4, grip: 8.5, mass: 5.0, label: 'fire engine' },
  bus: { len: 11.5, wid: 2.6, hgt: 3.2, vmax: 28, acc: 1.6, grip: 7.5, mass: 6.0, label: 'city bus' },
  tow: { len: 6.6, wid: 2.3, hgt: 2.6, vmax: 34, acc: 2.4, grip: 8.5, mass: 3.0, label: 'tow truck' },
  utility: { len: 5.6, wid: 2.1, hgt: 2.4, vmax: 34, acc: 2.4, grip: 8.5, mass: 2.4, label: 'utility truck' },
  delivery: { len: 5.6, wid: 2.1, hgt: 2.6, vmax: 32, acc: 2.2, grip: 8, mass: 2.4, label: 'delivery van' },
  construction: { len: 6.0, wid: 2.3, hgt: 2.6, vmax: 30, acc: 2.0, grip: 8, mass: 3.0, label: 'work truck' },
};
export const EMERGENCY = new Set(['police', 'ambulance', 'firetruck']);

const IDM = { a: 2.0, b: 3.2, s0: 2.2, T: 1.25 };
const tmp = { x: 0, z: 0, h: 0, y: 0 };
let VID = 0;

export class Traffic {
  constructor(world) {
    this.world = world;
    this.net = world.city.net;
    this.vehicles = [];
    this.byId = new Map();
    this.obstacles = new SpatialHash(14); // free-mode vehicles, peds on road, animals, cones
    this.laneHash = new SpatialHash(16); // lane-mode vehicles (for free-body collisions)
    this.obsList = [];
    this.weatherFactor = 1;
    this.brakeFactor = 1;
    this.stats = { crashes: 0 };
    this._q = [];
  }

  add(type, opts = {}) {
    const T = VTYPES[type] || VTYPES.sedan;
    const v = {
      id: opts.id ?? VID++, type, T, len: T.len, wid: T.wid, color: opts.color || '#888', owner: opts.owner ?? null, fleet: opts.fleet || null,
      base: opts.base ?? null, state: 'none', slot: null, garage: null,
      link: -1, s: 0, v: 0, a: 0, route: null, ri: 0, destS: 0, onArrive: null, waiting: 0, stoppedAt: -1, stopT: 0,
      x: 0, y: 0, z: 0, h: 0, vx: 0, vz: 0, av: 0, steer: 0, speed: 0,
      driver: null, passengers: [], siren: false, lightsOn: false, brake: 0, damage: opts.damage || 0, alive: true,
      lat: 0, latT: 0, passing: null, yielding: 0, personality: opts.personality ?? (0.92 + rand.float() * 0.2), reckless: opts.reckless ?? rand.float() * 0.3,
      name: opts.name || '', plate: opts.plate || genPlate(), ctrl: null, aggressive: 0, ignoreLights: false, fleeing: false,
      trailer: null, towedBy: null, hidden: false, horn: 0, wreck: false, lastHit: 0, odometer: 0, abs: null, player: false,
      purpose: '', ownerName: '',
    };
    if (v.id >= VID) VID = v.id + 1;
    this.vehicles.push(v);
    this.byId.set(v.id, v);
    return v;
  }

  remove(v) {
    this.detach(v);
    if (v.slot != null) { this.net.slots[v.slot].car = null; v.slot = null; }
    v.alive = false;
    v.state = 'gone';
    this.byId.delete(v.id);
    const i = this.vehicles.indexOf(v);
    if (i >= 0) this.vehicles.splice(i, 1);
  }

  // ---------- link bookkeeping ----------
  insertSorted(link, v) {
    const cars = link.cars;
    let i = cars.length;
    while (i > 0 && this.byId.get(cars[i - 1])?.s < v.s) i--;
    cars.splice(i, 0, v.id);
  }
  detach(v) {
    if (v.link >= 0) {
      const cars = this.net.links[v.link].cars;
      const i = cars.indexOf(v.id);
      if (i >= 0) cars.splice(i, 1);
    }
    v.link = -1;
  }

  // ---------- parking ----------
  parkAtSlot(v, slotId) {
    this.detach(v);
    const sl = this.net.slots[slotId];
    if (v.slot != null && v.slot !== slotId) this.net.slots[v.slot].car = null;
    sl.car = v.id; sl.reserved = null;
    v.slot = slotId; v.garage = null;
    v.state = 'parked';
    v.x = sl.x; v.z = sl.z; v.h = sl.h; v.y = 0; v.v = 0; v.vx = v.vz = 0; v.speed = 0;
    v.route = null; v.siren = false;
  }
  parkInGarage(v, buildingId) {
    this.detach(v);
    if (v.slot != null) { this.net.slots[v.slot].car = null; v.slot = null; }
    v.garage = buildingId; v.state = 'garage';
    const b = this.world.city.buildings[buildingId];
    v.x = b.x; v.z = b.z; v.y = 0; v.v = 0; v.speed = 0;
    v.route = null; v.siren = false;
  }

  // find a free slot near a building (near lane first, then far lane, then neighbors)
  findSlotNear(x, z, laneIds, maxD = 120) {
    const net = this.net;
    let best = null, bd = Infinity;
    const consider = (lid) => {
      const lane = net.links[lid];
      for (const sid of lane.slots) {
        const sl = net.slots[sid];
        if (sl.car != null || sl.reserved != null || sl.busStop || sl.blocked) continue;
        const d = Math.hypot(sl.x - x, sl.z - z);
        if (d < bd) { bd = d; best = sl; }
      }
    };
    for (const lid of laneIds) if (lid != null) consider(lid);
    if (best && bd < 45) return best;
    // search nearby lanes
    for (const lane of net.lanes) {
      if (!lane.slots.length) continue;
      const mx = lane.pl.pts[0], mz = lane.pl.pts[1];
      if (Math.abs(mx - x) > maxD || Math.abs(mz - z) > maxD) continue;
      consider(lane.id);
    }
    return best && bd < maxD ? best : null;
  }

  // ---------- driving API ----------
  // Start driving to (destLane, destS). Returns false if no route.
  driveTo(v, destLane, destS, onArrive, opts = {}) {
    const net = this.net;
    v.lastDest = { lane: destLane, s: destS, cb: onArrive || null, opts };
    v.idleT = 0;
    let startLane, startS;
    if (v.state === 'lane') {
      const link = net.links[v.link];
      if (link.type === 'con') { startLane = link.outLane; startS = 0; }
      else { startLane = v.link; startS = v.s; }
    } else if (v.state === 'parked' && v.slot != null) {
      startLane = net.slots[v.slot].lane; startS = net.slots[v.slot].s;
    } else {
      const nl = net.nearestLane(v.x, v.z, { heading: v.h, y: v.y });
      if (!nl) return false;
      startLane = nl.lane.id; startS = nl.s;
    }
    let route;
    if (startLane === destLane && destS > startS + 6) route = [startLane];
    else route = net.route(startLane, destLane, { forceLoop: startLane === destLane, avoid: opts.avoid });
    if (!route) return false;
    if (v.state === 'lane' && net.links[v.link].type === 'con') route.unshift(v.link);
    v.route = route;
    v.ri = route.indexOf(v.state === 'lane' ? v.link : startLane);
    if (v.ri < 0) v.ri = 0;
    v.destS = clamp(destS, 1, net.links[destLane].length - 1);
    v.onArrive = onArrive || null;
    v.waiting = 0;
    if (v.state === 'parked' || v.state === 'garage') {
      v.state = 'merging';
      v.mergeLane = startLane; v.mergeS = startS; v.mergeT = 0;
      if (v.garage != null) { v.state = 'merging'; }
    } else if (v.state === 'free') {
      // snap into lane
      this.snapToLane(v, startLane, startS);
    }
    return true;
  }

  snapToLane(v, laneId, s) {
    this.detach(v);
    v.state = 'lane';
    v.link = laneId; v.s = s;
    v.v = Math.max(0, Math.min(v.speed, 12));
    v.lat = 0; v.latT = 0;
    this.insertSorted(this.net.links[laneId], v);
    if (v.route) { const i = v.route.indexOf(laneId); v.ri = i >= 0 ? i : 0; if (i < 0) v.route = [laneId]; }
  }

  // Convert lane vehicle to free body (player takes control / crash)
  toFree(v, why = '') {
    v.freeWhy = why || new Error().stack.split('\n')[2]?.trim();
    v.freeAt = this.world.physT;
    if (v.state === 'lane' || v.state === 'parked' || v.state === 'merging' || v.state === 'parking') {
      const sp = v.state === 'lane' ? v.v : 0;
      this.detach(v);
      if (v.slot != null) { this.net.slots[v.slot].car = null; v.slot = null; }
      v.vx = Math.sin(v.h) * sp; v.vz = Math.cos(v.h) * sp;
      v.speed = sp;
    }
    if (v.state === 'garage') {
      const b = this.world.city.buildings[v.garage];
      const sl = this.findSlotNear(b.door[0], b.door[1], [b.laneNear, b.laneFar]);
      if (sl) { v.x = sl.x; v.z = sl.z; v.h = sl.h; }
      v.garage = null;
    }
    v.state = 'free';
    v.route = null;
  }

  // ---------- main update ----------
  update(dt) {
    const net = this.net;
    // rebuild hashes
    this.obstacles.clear();
    this.laneHash.clear();
    const obs = this.obsList; obs.length = 0;
    for (const v of this.vehicles) {
      if (v.state === 'free' || v.state === 'wreck') { this.obstacles.insert(v, v.x, v.z); obs.push(v); }
      else if (v.state === 'lane' || v.state === 'merging' || v.state === 'parking') this.laneHash.insert(v, v.x, v.z);
    }
    for (const o of this.world.extraObstacles) this.obstacles.insert(o, o.x, o.z);

    // lanes
    for (const link of net.links) {
      if (!link.cars.length) continue;
      for (let i = 0; i < link.cars.length; i++) {
        const v = this.byId.get(link.cars[i]);
        if (!v || v.link !== link.id) { link.cars.splice(i, 1); i--; continue; }
        if (v._upd === this._frame) continue;
        v._upd = this._frame;
        this.stepLane(v, link, i, dt);
      }
    }
    // transitions after all moved
    for (const v of this.vehicles) {
      if (v.state === 'lane') this.advanceLinks(v);
      else if (v.state === 'merging') this.stepMerge(v, dt);
      else if (v.state === 'parking') this.stepParking(v, dt);
      else if (v.state === 'free' || v.state === 'wreck') this.stepFree(v, dt);
      if (v.state === 'lane') {
        net.sample(net.links[v.link], v.s, tmp);
        // lateral offset (yield/pull over/passing)
        v.lat = lerp(v.lat, v.latT, 1 - Math.exp(-3 * dt));
        const ox = -Math.cos(tmp.h) * v.lat, oz = Math.sin(tmp.h) * v.lat;
        v.x = tmp.x + ox; v.z = tmp.z + oz; v.y = tmp.y;
        // smooth heading
        v.h = v.h + wrapAngle(tmp.h - v.h) * Math.min(1, dt * 12);
        v.speed = v.v;
      }
      if (v.horn > 0) v.horn -= dt;
      if (v.state === 'lane' && !v.route && !v.hold) {
        v.idleT = (v.idleT || 0) + dt;
        if (v.idleT > 3) { v.idleT = -4; this.world.vehicleIdle(v); }
      }
    }
    this.detectLaneCollisions();
    this._frame = (this._frame || 0) + 1;
  }

  leaderInfo(v, link, idx) {
    // returns gap to leader and leader speed, scanning ahead along route
    const net = this.net;
    let gap = Infinity, lv = 0, leader = null;
    if (idx > 0) {
      const L = this.byId.get(link.cars[idx - 1]);
      if (L) { gap = L.s - v.s - (L.len + v.len) / 2; lv = L.state === 'lane' ? L.v : 0; leader = L; }
      if (L && L.passingThrough === v.id) gap = Infinity;
      if (L && v.siren && L.yielding > 0 && L.lat > 1.2) { gap = Infinity; leader = null; }
    }
    if (gap === Infinity && v.route) {
      let acc = link.length - v.s;
      for (let k = v.ri + 1; k < v.route.length && acc < 70; k++) {
        const nl = net.links[v.route[k]];
        if (nl.cars.length) {
          const L = this.byId.get(nl.cars[nl.cars.length - 1]);
          if (L && L !== v) {
            if (v.siren && L.yielding > 0 && L.lat > 1.2) { acc += nl.length; continue; }
            gap = acc + L.s - (L.len + v.len) / 2; lv = L.v; leader = L; break;
          }
        }
        acc += nl.length;
      }
    }
    return { gap, lv, leader };
  }

  canEnter(v, lane, con) {
    // can vehicle v leave `lane` into connector `con`?
    const net = this.net;
    const node = net.nodes[con.node];
    const emergency = v.siren;
    const reckless = v.ignoreLights || v.fleeing;
    // traffic light
    if (node.signal && !node.failed && node.powered) {
      const st = node.signal.state[lane.group];
      if (st === 'R' && !emergency && !reckless) {
        if (!(v._runRed === node.id)) return false;
      }
      if (st === 'Y' && !emergency && !reckless) {
        const dl = lane.length - v.s;
        if (dl > (v.v * v.v) / (2 * 4.5) + 1 && v._runRed !== node.id) return false;
      }
      if (st === 'R' && emergency && v.v > 7) return false; // slow before crossing
    } else if (net.isStopControlled(node) && !reckless) {
      if (!(emergency && v.v < 8)) {
        if (v.stoppedAt !== node.id || v.stopT < 0.7) return false;
      }
    }
    // merge priority on expressway: ramp yields to mainline
    if (node.control === 'merge' && net.links[con.inLane].kind === 'ramp') {
      for (const lid of node.inLanes) {
        const l2 = net.links[lid];
        if (l2.kind !== 'highway' || !l2.cars.length) continue;
        const f = this.byId.get(l2.cars[0]);
        if (f && l2.length - f.s < 10 + f.v * 2.2) return false;
      }
    }
    // reservations: conflicting connectors must be clear
    {
      const breakDeadlock = v.waiting > 25;
      for (const cid of con.conflicts) {
        const c2 = net.links[cid];
        if (c2.cars.length) {
          if (emergency) { const o = this.byId.get(c2.cars[c2.cars.length - 1]); if (o && o.s < c2.length - 3) return false; }
          else if (!breakDeadlock) return false;
          else { for (const id of c2.cars) { const o = this.byId.get(id); if (o && o.v > 0.3) return false; } }
        }
        // yield to approaching vehicles with priority (left turns yield to straight/right)
        if (con.turn === 'L' && c2.turn !== 'L') {
          const inl = net.links[c2.inLane];
          if (inl.cars.length && inl.id !== lane.id) {
            const f = this.byId.get(inl.cars[0]);
            if (f && f.route && f.route[f.ri + 1] === cid) {
              const dl = inl.length - f.s;
              const greenForThem = !node.signal || node.failed || !node.powered || node.signal.state[inl.group] === 'G';
              if (greenForThem && !net.isStopControlled(node) && dl < 8 + f.v * 2.6) return false;
            }
          }
        }
      }
    }
    // exit space: never enter the box unless there is room for the whole car beyond it
    const out = net.links[con.outLane];
    let room = out.length;
    if (out.cars.length) {
      const last = this.byId.get(out.cars[out.cars.length - 1]);
      if (last && !(v.siren && last.yielding)) room = last.s - last.len / 2 - (last.v > 3 ? -last.v * 1.5 : 0);
    }
    for (const cid of con.cars) { const o = this.byId.get(cid); if (o) room -= o.len + 2; }
    if (room < v.len + 2.5) return false;
    if (out.closed && !emergency) return false;
    return true;
  }

  stepLane(v, link, idx, dt) {
    const net = this.net;
    const W = this.world;
    let vmax = link.speed * v.personality * this.weatherFactor;
    if (v.siren) vmax = link.speed * (v.pursuing ? 1.7 : 1.45);
    if (v.fleeing) vmax = link.speed * 1.6 * (v.player ? 1 : 1);
    if (link.type === 'con') vmax = Math.min(vmax, (link.turn === 'S' ? link.speed : 7.5) * (v.siren || v.fleeing ? 1.3 : 1));
    vmax = Math.min(vmax, v.T.vmax);
    if (v.damage > 0.5) vmax *= 0.6;
    if (v.passing) vmax = Math.min(vmax, 6);
    if (v.yielding > 0) { vmax = Math.min(vmax, 3); v.yielding -= dt; if (v.yielding <= 0) { v.latT = 0; } }
    if (link.flooded) vmax = Math.min(vmax, 2.5);

    let { gap, lv, leader } = this.leaderInfo(v, link, idx);
    let stopGap = Infinity;
    // intersection control
    if (link.type === 'lane' && v.route && v.ri + 1 < v.route.length) {
      const con = net.links[v.route[v.ri + 1]];
      const dl = link.length - v.s;
      if (dl < 45) {
        const node = net.nodes[link.to];
        // all-way stop bookkeeping
        if (net.isStopControlled(node)) {
          if (dl < 3.5 && v.v < 0.6) { if (v.stoppedAt !== node.id) { v.stoppedAt = node.id; v.stopT = 0; } v.stopT += dt; }
        }
        // reckless drivers occasionally run fresh reds
        if (node.signal && node.signal.state[link.group] === 'Y' && v._runRedCheck !== node.id) {
          v._runRedCheck = node.id;
          const p = v.reckless * 0.18 + (W.weather.precip > 0.5 ? 0.02 : 0);
          if (rand.float() < p) v._runRed = node.id;
        }
        if (!this.canEnter(v, link, con)) {
          stopGap = dl + IDM.s0 - 1.0;
          v.waiting += dt;
        } else {
          v.waiting = 0;
        }
      }
    }
    // destination
    if (v.route && v.ri === v.route.length - 1) {
      const d = v.destS - v.s;
      if (d > -1) stopGap = Math.min(stopGap, d + IDM.s0 - 0.3);
    }
    // obstacles (free bodies)
    const ob = this.obstacleAhead(v);
    if (ob.gap < gap) { gap = ob.gap; lv = 0; leader = ob.o; }
    // sirens behind? yield (pull right)
    if (!v.siren && !v.player && W.sirenNear(v)) {
      v.yielding = 2.5; v.latT = 2.0;
    }
    // passing a static obstacle
    if (leader && (leader.state === 'wreck' || leader.state === 'free' && leader.speed < 0.3 || leader.isStaticObstacle) && gap < 12 && v.v < 1 && link.type === 'lane') {
      v.blockedT = (v.blockedT || 0) + dt;
      if (v.blockedT > 2.5 && !v.passing && this.oppositeClear(v, link)) { v.passing = leader.id ?? leader.oid; v.latT = -3.6; }
    } else if (!v.passing) v.blockedT = 0;
    if (v.passing != null) {
      const o = this.byId.get(v.passing) || leader;
      // ignore the obstacle we are passing
      if (ob.o && (ob.o.id === v.passing || ob.o.oid === v.passing)) { gap = idx > 0 ? this.leaderInfo(v, link, idx).gap : Infinity; }
      const done = !o || (Math.hypot(o.x - v.x, o.z - v.z) > 10 && this.isBehind(v, o));
      if (done) { v.passing = null; v.latT = 0; v.blockedT = 0; }
    }

    const a0 = (v.siren || v.fleeing ? 1.5 : 1) * Math.min(v.T.acc, IDM.a * (v.personality));
    const T = v.pursuing ? 0.45 : v.siren || v.fleeing ? 0.7 : IDM.T * (1.25 - v.reckless * 0.6);
    const b = IDM.b;
    const effGap = Math.min(gap, stopGap);
    const dv = v.v - (gap < stopGap ? lv : 0);
    const sStar = IDM.s0 + Math.max(0, v.v * T + (v.v * dv) / (2 * Math.sqrt(a0 * b)));
    let acc = a0 * (1 - Math.pow(Math.max(0, v.v) / Math.max(1, vmax), 4)) - (effGap < 200 ? a0 * Math.pow(sStar / Math.max(0.1, effGap), 2) : 0);
    const maxBrake = 9 * this.brakeFactor;
    acc = clamp(acc, -maxBrake, a0);
    v.brake = acc < -1 ? 1 : 0;
    v.a = acc;
    v.v = Math.max(0, v.v + acc * dt);
    if (effGap < 0.05 && v.v > 0 && this.brakeFactor > 0.95) v.v = 0;
    v.s += v.v * dt;
    v.odometer += v.v * dt;
    // horn when blocked a long time by a free obstacle (e.g. the player)
    if (leader && leader.player && v.v < 0.5) { v.hornWait = (v.hornWait || 0) + dt; if (v.hornWait > 3 && v.horn <= 0 && rand.chance(0.02)) v.horn = 0.6; }
    else v.hornWait = 0;
  }

  isBehind(v, o) {
    const dx = o.x - v.x, dz = o.z - v.z;
    return dx * Math.sin(v.h) + dz * Math.cos(v.h) < -2;
  }

  oppositeClear(v, link) {
    const road = this.net.roads[link.road];
    if (!road || road.oneway) return false;
    const opp = road.lanes.find((l) => l !== link.id);
    if (opp == null) return false;
    const ol = this.net.links[opp];
    for (const cid of ol.cars) {
      const o = this.byId.get(cid);
      if (!o) continue;
      if (Math.hypot(o.x - v.x, o.z - v.z) < 35) return false;
    }
    return true;
  }

  obstacleAhead(v) {
    const res = { gap: Infinity, o: null };
    const sh = Math.sin(v.h), ch = Math.cos(v.h);
    const look = 14 + v.v * 2.2;
    const cx = v.x + sh * look * 0.5, cz = v.z + ch * look * 0.5;
    const near = this.obstacles.query(cx, cz, look * 0.5 + 4, this._q);
    for (const o of near) {
      if (o === v || o.passive) continue;
      if (o.id === v.passing && o.state) continue;
      const dx = o.x - v.x, dz = o.z - v.z;
      const along = dx * sh + dz * ch;
      if (along <= 0) continue;
      const lat = Math.abs(dx * ch - dz * sh);
      const orad = o.radius ?? (o.wid ? Math.max(o.wid, o.len * Math.abs(Math.sin(o.h - v.h))) / 2 + 0.2 : 0.6);
      if (lat - v.lat * 0 > v.wid / 2 + orad + 0.25) continue;
      if (Math.abs((o.y || 0) - v.y) > 3) continue;
      const g = along - v.len / 2 - (o.len ? o.len * Math.abs(Math.cos(o.h - v.h)) / 2 : orad);
      if (g < res.gap) { res.gap = Math.max(0, g); res.o = o; }
    }
    return res;
  }

  advanceLinks(v) {
    const net = this.net;
    let link = net.links[v.link];
    let guard = 0;
    while (v.s >= link.length && guard++ < 4) {
      if (!v.route || v.ri + 1 >= v.route.length) {
        // end of route at link end: hold
        v.s = link.length - 0.01; v.v = 0;
        this.arrive(v);
        return;
      }
      const over = v.s - link.length;
      const nextId = v.route[v.ri + 1];
      const nl = net.links[nextId];
      this.detach(v);
      v.ri++;
      v.link = nextId;
      v.s = over;
      if (nl.type === 'lane') { v.stoppedAt = -1; v.stopT = 0; v._runRed = -1; v._runRedCheck = -1; }
      nl.cars.push(v.id);
      link = nl;
      if (v.ctrl && v.ctrl.onLink) v.ctrl.onLink(v, nl);
    }
    if (v.route && v.ri === v.route.length - 1 && v.v < 0.5 && Math.abs(v.destS - v.s) < 3) this.arrive(v);
  }

  arrive(v) {
    const cb = v.onArrive;
    v.onArrive = null;
    v.lastDest = null;
    v.route = null;
    if (cb) cb(v);
    else if (v.state === 'lane' && v.ctrl && v.ctrl.idle) v.ctrl.idle(v);
  }

  // Pull into a reserved slot after stopping
  beginParking(v, slotId) {
    const sl = this.net.slots[slotId];
    this.detach(v);
    v.state = 'parking';
    v.parkSlot = slotId;
    v.parkT = 0;
    v.px0 = v.x; v.pz0 = v.z; v.ph0 = v.h;
    sl.reserved = v.id;
  }
  stepParking(v, dt) {
    v.parkT += dt / 1.6;
    const sl = this.net.slots[v.parkSlot];
    const t = clamp(v.parkT, 0, 1);
    const e = t * t * (3 - 2 * t);
    v.x = lerp(v.px0, sl.x, e); v.z = lerp(v.pz0, sl.z, e);
    v.h = v.ph0 + wrapAngle(sl.h - v.ph0) * e + Math.sin(t * Math.PI) * 0.15;
    v.speed = 1.5 * (1 - t);
    if (t >= 1) {
      this.parkAtSlot(v, v.parkSlot);
      if (v.afterPark) { const f = v.afterPark; v.afterPark = null; f(v); }
    }
  }

  stepMerge(v, dt) {
    // leaving a curb slot / garage into traffic once there is a gap
    const net = this.net;
    const lane = net.links[v.mergeLane];
    v.mergeT += dt;
    let clear = true;
    for (const cid of lane.cars) {
      const o = this.byId.get(cid);
      if (!o) continue;
      const ds = o.s - v.mergeS;
      if (ds > -4 - o.v * 2.2 && ds < 9) { clear = false; break; }
    }
    if (clear || v.mergeT > 25) {
      if (v.slot != null) { net.slots[v.slot].car = null; v.slot = null; }
      if (v.garage != null) {
        v.garage = null;
      }
      v.state = 'lane';
      v.link = lane.id;
      v.s = v.mergeS;
      v.v = 0.5;
      net.sample(lane, v.s, tmp);
      v.lat = v.lat || 2.8; v.latT = 0;
      v.h = tmp.h;
      this.insertSorted(lane, v);
      const i = v.route ? v.route.indexOf(lane.id) : -1;
      v.ri = i >= 0 ? i : 0;
    } else if (v.garage == null && v.slot != null) {
      const sl = net.slots[v.slot];
      v.x = sl.x; v.z = sl.z; v.h = sl.h;
    }
  }

  // ---------- free-body physics ----------
  stepFree(v, dt) {
    const W = this.world;
    const ctl = v.input || { throttle: 0, brake: v.state === 'wreck' ? 1 : 0.4, steer: 0, handbrake: v.state === 'wreck' ? 1 : 0, reverse: 0 };
    const T = v.T;
    const sh = Math.sin(v.h), ch = Math.cos(v.h);
    // local velocities
    let fwd = v.vx * sh + v.vz * ch;
    let side = v.vx * ch - v.vz * sh;
    const dmgF = 1 - v.damage * 0.5;
    // steering
    const steerMax = 0.6 * clamp(1.2 - Math.abs(fwd) / 45, 0.35, 1);
    v.steer = lerp(v.steer, ctl.steer * steerMax, 1 - Math.exp(-10 * dt));
    // engine & brakes
    const surface = W.surfaceGrip(v.x, v.z);
    let F = 0;
    if (ctl.throttle > 0) {
      if (fwd < -0.5 && ctl.throttle > 0) F = 9 * ctl.throttle; // braking from reverse
      else F = T.acc * 2.5 * ctl.throttle * dmgF * (1 - Math.pow(Math.max(0, fwd) / (T.vmax * dmgF), 2));
    }
    if (ctl.brake > 0) {
      const bf = 9.5 * ctl.brake * this.brakeFactor;
      if (fwd > 0.05) F -= Math.min(bf, fwd / dt);
      else if (fwd < -0.05) F += Math.min(bf, -fwd / dt);
    }
    if (ctl.reverse > 0) {
      if (fwd > 0.5) F -= 12 * ctl.reverse * this.brakeFactor;
      else F -= 5 * ctl.reverse * (1 - Math.pow(Math.max(0, -fwd) / 9, 2));
    }
    fwd += F * dt;
    // drag/rolling
    fwd -= fwd * (0.05 + Math.abs(fwd) * 0.001) * dt * (ctl.throttle > 0 ? 1 : 2.5);
    if (Math.abs(fwd) < 0.05 && ctl.throttle === 0) fwd = 0;
    // lateral grip
    const grip = T.grip * surface * (ctl.handbrake ? 0.22 : 1) * (v.state === 'wreck' ? 1.5 : 1);
    const sideDecay = Math.min(1, grip * dt);
    side -= side * sideDecay;
    // yaw from steering (bicycle model)
    const wheelbase = v.len * 0.6;
    let targetAv = (fwd / wheelbase) * Math.tan(v.steer);
    // grip-limited yaw rate: sharp at low speed, planted at high speed
    const avMax = (T.grip * surface * 1.5) / Math.max(3, Math.abs(fwd));
    targetAv = clamp(targetAv, -avMax, avMax);
    if (ctl.handbrake) targetAv *= 1.9;
    v.av = lerp(v.av, targetAv, 1 - Math.exp(-(ctl.handbrake ? 3 : 8) * surface * dt));
    if (v.spin) { v.av += v.spin; v.spin *= Math.exp(-3 * dt); if (Math.abs(v.spin) < 0.01) v.spin = 0; }
    v.h = wrapAngle(v.h + v.av * dt);
    const nsh = Math.sin(v.h), nch = Math.cos(v.h);
    v.vx = nsh * fwd + nch * side;
    v.vz = nch * fwd - nsh * side;
    // gravity / ground height
    const ground = W.groundHeight(v.x, v.z, v.y);
    if (v.y > ground + 0.05 || v.vy) {
      v.vy = (v.vy || 0) - 18 * dt;
      v.y += v.vy * dt;
      if (v.y <= ground) {
        if (v.vy < -8) { this.damage(v, Math.min(0.5, -v.vy * 0.02)); W.emit('impact', { x: v.x, z: v.z, power: -v.vy * 0.5, v }); }
        v.y = ground; v.vy = 0;
      }
    } else v.y = ground;
    if (v.y < -1.5 && W.inWater(v.x, v.z)) { // sinking
      v.vx *= 1 - 2 * dt; v.vz *= 1 - 2 * dt;
      if (!v.sunk) { v.sunk = true; W.emit('splash', { x: v.x, z: v.z, v }); }
    }
    let nx = v.x + v.vx * dt, nz = v.z + v.vz * dt;
    // building collisions
    const hit = W.collideBox(nx, nz, Math.max(v.len, v.wid) * 0.45, v.y);
    if (hit) {
      nx += hit.nx * hit.pen; nz += hit.nz * hit.pen;
      const vn = v.vx * hit.nx + v.vz * hit.nz;
      if (vn < 0) {
        v.vx -= 1.4 * vn * hit.nx; v.vz -= 1.4 * vn * hit.nz;
        v.vx *= 0.7; v.vz *= 0.7;
        if (-vn > 4) {
          this.damage(v, -vn * 0.012);
          W.emit('impact', { x: nx, z: nz, power: -vn, v, building: hit.b });
        }
      }
    }
    v.x = nx; v.z = nz;
    v.speed = Math.hypot(v.vx, v.vz);
    v.odometer += v.speed * dt;
    v.brake = ctl.brake > 0 && fwd > 0.5 ? 1 : 0;
    // collisions with other vehicles (resting wrecks are passive)
    if (v.player || v.speed > 0.6) this.collideVehicle(v, dt);
  }

  collideVehicle(v, dt) {
    const W = this.world;
    const r = Math.max(v.len, v.wid) * 0.55 + 4;
    const cands = [];
    this.laneHash.query(v.x, v.z, r, cands);
    this.obstacles.query(v.x, v.z, r, this._q);
    for (const o of this._q) if (o !== v && o.T) cands.push(o);
    for (const o of cands) {
      if (o === v || !o.T || o.state === 'parked' && false) continue;
      if (Math.abs(o.y - v.y) > 2.5) continue;
      const pen = obbOverlap(v, o);
      if (!pen) continue;
      const [nx, nz, depth] = pen; // normal from o to v
      // relative velocity
      const ovx = o.state === 'lane' ? Math.sin(o.h) * o.v : o.vx || 0, ovz = o.state === 'lane' ? Math.cos(o.h) * o.v : o.vz || 0;
      const rvx = v.vx - ovx, rvz = v.vz - ovz;
      const vn = rvx * nx + rvz * nz;
      const mv = v.T.mass, mo = o.T.mass;
      v.x += nx * depth * (mo / (mv + mo)); v.z += nz * depth * (mo / (mv + mo));
      if (vn < 0) {
        const j = (-1.3 * vn) / (1 / mv + 1 / mo);
        v.vx += (j / mv) * nx; v.vz += (j / mv) * nz;
        const impact = -vn;
        if (impact > 2.5) {
          if (o.state !== 'free' && o.state !== 'wreck') this.toFree(o);
          o.vx = ovx - (j / mo) * nx; o.vz = ovz - (j / mo) * nz;
          o.spin = (rand.float() - 0.5) * impact * 0.12;
          v.spin = (rand.float() - 0.5) * impact * 0.06;
          const now = W.time;
          if (now - (v.lastHit || 0) > 0.5 || impact > 8) {
            this.damage(v, impact * 0.018); this.damage(o, impact * 0.022);
            v.lastHit = now; o.lastHit = now;
            W.emit('impact', { x: (v.x + o.x) / 2, z: (v.z + o.z) / 2, power: impact, v, o });
            W.vehicleCollision(v, o, impact);
          }
        } else {
          // light bump: the AI car stops
          if (o.state === 'lane') o.v = Math.min(o.v, 0.5);
        }
      }
    }
  }

  damage(v, amt) {
    v.damage = clamp(v.damage + amt, 0, 1);
  }

  // lane vehicles overlapping inside intersections or rear-ending -> crash
  detectLaneCollisions() {
    const net = this.net;
    for (const n of net.nodes) {
      const cons = n.connectors;
      for (let i = 0; i < cons.length; i++) {
        const a = net.links[cons[i]];
        if (!a.cars.length) continue;
        for (const cid of a.conflicts) {
          if (cid < a.id) continue;
          const b = net.links[cid];
          if (!b.cars.length || b.outLane === a.outLane) continue;
          for (const ia of a.cars) for (const ib of b.cars) {
            const va = this.byId.get(ia), vb = this.byId.get(ib);
            if (!va || !vb) continue;
            if (Math.hypot(va.x - vb.x, va.z - vb.z) < (va.wid + vb.wid) * 0.5 + 0.2 && (va.v + vb.v) > 5 && Math.max(va.v, vb.v) > 3.5) {
              this.crashPair(va, vb);
            }
          }
        }
      }
    }
  }

  crashPair(a, b) {
    const W = this.world;
    const ia = Math.max(a.v, b.v);
    const avx = Math.sin(a.h) * a.v, avz = Math.cos(a.h) * a.v, bvx = Math.sin(b.h) * b.v, bvz = Math.cos(b.h) * b.v;
    this.toFree(a); this.toFree(b);
    const ma = a.T.mass, mb = b.T.mass;
    const cx = (avx * ma + bvx * mb) / (ma + mb), cz = (avz * ma + bvz * mb) / (ma + mb);
    a.vx = cx + (rand.float() - 0.5) * 3; a.vz = cz + (rand.float() - 0.5) * 3;
    b.vx = cx + (rand.float() - 0.5) * 3; b.vz = cz + (rand.float() - 0.5) * 3;
    a.spin = (rand.float() - 0.5) * 1.8; b.spin = (rand.float() - 0.5) * 1.8;
    this.damage(a, 0.2 + ia * 0.03); this.damage(b, 0.2 + ia * 0.03);
    W.emit('impact', { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, power: ia * 1.5, v: a, o: b });
    W.vehicleCollision(a, b, ia * 1.4);
  }
}

// oriented box overlap (2-D SAT). Returns [nx, nz, depth] pushing a away from b, or null.
function obbOverlap(a, b) {
  const ax = [Math.sin(a.h), Math.cos(a.h)], ay = [Math.cos(a.h), -Math.sin(a.h)];
  const bx = [Math.sin(b.h), Math.cos(b.h)], by = [Math.cos(b.h), -Math.sin(b.h)];
  const ha = [a.len / 2, a.wid / 2], hb = [b.len / 2, b.wid / 2];
  const d = [a.x - b.x, a.z - b.z];
  if (d[0] * d[0] + d[1] * d[1] > (ha[0] + hb[0] + 1) ** 2) return null;
  let minPen = Infinity, mn = null;
  for (const axis of [ax, ay, bx, by]) {
    const ra = ha[0] * Math.abs(ax[0] * axis[0] + ax[1] * axis[1]) + ha[1] * Math.abs(ay[0] * axis[0] + ay[1] * axis[1]);
    const rb = hb[0] * Math.abs(bx[0] * axis[0] + bx[1] * axis[1]) + hb[1] * Math.abs(by[0] * axis[0] + by[1] * axis[1]);
    const dist = d[0] * axis[0] + d[1] * axis[1];
    const pen = ra + rb - Math.abs(dist);
    if (pen <= 0) return null;
    if (pen < minPen) { minPen = pen; mn = dist < 0 ? [-axis[0], -axis[1]] : [axis[0], axis[1]]; }
  }
  return [mn[0], mn[1], minPen];
}

const PL = 'ABCDEFGHJKLMNPRSTUVWXYZ';
function genPlate() {
  let s = '';
  for (let i = 0; i < 3; i++) s += PL[Math.floor(rand.float() * PL.length)];
  return s + '-' + String(Math.floor(rand.float() * 9000) + 1000);
}
