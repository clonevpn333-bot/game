// The living city. Owns every simulation system and advances them on a shared
// clock. Rendering/UI only read from it (and listen to its events).
import { C, nodeX, nodeZ, BRIDGE_ROWS } from './config.js';
import { generateCity } from './cityGen.js';
import { Sidewalks } from './sidewalks.js';
import { Traffic } from './traffic.js';
import { Peds } from './peds.js';
import { Economy, BTYPES } from './economy.js';
import { CitizenAI } from './citizens.js';
import { Lottery } from './lottery.js';
import { LifeSim } from './life.js';
import { Combat } from './combat.js';
import { Heists } from './heists.js';
import { Crime } from './crime.js';
import { DarkSide, Investigations } from './dark.js';
import { StreetLife } from './street.js';
import { Love } from './love.js';
import { Goals } from './goals.js';
import { Drama } from './drama.js';
import { Tasks } from './tasks.js';
import { History } from './history.js';
import { Weather } from './weather.js';
import { Power } from './power.js';
import { Services } from './services.js';
import { Incidents } from './incidents.js';
import { Transit } from './transit.js';
import { Evolution } from './evolution.js';
import { Disasters, Animals } from './disasters.js';
import { Helis } from './helis.js';
import { Bus } from '../core/bus.js';
import { RNG, rand } from '../core/rng.js';
import { clamp } from '../core/math.js';

const CIVIC_TYPE = { police: 'police', fire: 'fire', hospital: 'hospital', cityhall: 'cityhall', mall: 'mall', busdepot: 'busdepot', powerplant: 'powerplant', utility: 'utility', construction: 'construction', towyard: 'towyard', taxi: 'taxi', casino: 'casino', college: 'college', school: 'school', county: 'farm' };
export const HYPER = 50;

export class World {
  constructor(seed = 20261015, opts = {}) {
    this.seed = seed;
    this.ev = new Bus();
    this.city = generateCity(seed);
    this.sidewalks = new Sidewalks(this.city);
    this.time = opts.time ?? 7.6 * 60; // game minutes since Y1 Spring 1 00:00 (Monday)
    this.physT = 0;
    this.timers = [];
    this.citizens = [];
    this.focus = { x: 0, z: 0 };
    this.extraObstacles = [];
    this.env = { night: 0 };
    this.abstract = false;
    this.offline = false;
    this.groundGrip = 1;
    this.targetPop = opts.population ?? C.POPULATION;
    this.exeMode = false;
    this.history = new History(this);
    this.traffic = new Traffic(this);
    this.peds = new Peds(this);
    this.economy = new Economy(this);
    this.citizenAI = new CitizenAI(this);
    this.weather = new Weather(this);
    this.power = new Power(this);
    this.services = new Services(this);
    this.incidents = new Incidents(this);
    this.transit = new Transit(this);
    this.evolution = new Evolution(this);
    this.parkLife = new ParkLife(this);
    this.disasters = new Disasters(this);
    this.animals = new Animals(this);
    this.helis = new Helis(this);
    this.lottery = new Lottery(this);
    this.life = new LifeSim(this);
    this.combat = new Combat(this);
    this.heists = new Heists(this);
    this.crime = new Crime(this);
    this.investigations = new Investigations(this);
    this.dark = new DarkSide(this);
    this.street = new StreetLife(this);
    this.love = new Love(this);
    this.goals = new Goals(this);
    this.tasks = new Tasks(this);
    this.drama = new Drama(this);
    this.driverCtrl = { onLink: () => {}, idle: (v) => {} };
    this.lastHour = Math.floor(this.time / 60);
    this.lastDay = Math.floor(this.time / 1440);
    this.buildBuildingGrid();
    this.sirens = [];
    this.possessed = null; // set by game
  }

  init(opts = {}) {
    const rng = new RNG(this.seed ^ 0xa5a5);
    // destination venues: banks, clubs, lounges and gun stores take over suitable shop lots
    const VENUES = { bank: [5, ['C', 'D', 'O', 'SE', 'SW']], nightclub: [3, ['O', 'W', 'C', 'H']], lounge: [2, ['O', 'H', 'W', 'I']], gunstore: [2, ['O', 'C', 'I', 'SW', 'SE']] };
    const lots = rng.shuffle(this.city.buildings.filter((b) => b.shop && b.bizType && b.bizType !== 'gas' && b.w * b.d > 260));
    for (const type in VENUES) {
      const [n, districts] = VENUES[type];
      let placed = 0;
      for (const b of lots) {
        if (placed >= n) break;
        if (b.venue || !districts.includes(b.code)) continue;
        b.bizType = type; b.venue = true; placed++;
      }
    }
    // businesses
    for (const b of this.city.buildings) {
      if (b.civic && CIVIC_TYPE[b.civic]) this.economy.create(CIVIC_TYPE[b.civic], b.id, { rng, name: b.name });
      else if (b.metro) this.economy.create('metro', b.id, { rng, name: b.name });
      else if (b.jobsOverride && b.jobsOverride.news) this.economy.create('news', b.id, { rng, name: b.name });
      else if (b.bizType) {
        if (b.shop && !b.venue && rng.chance(0.38)) { b.vacantSince = -rng.int(1, 30); continue; }
        this.economy.create(b.bizType, b.id, { rng, founded: -rng.int(30, 4000) });
      }
    }
    const jobs = this.economy.jobs.length;
    this.targetPop = opts.population ?? Math.round(Math.min(2700, Math.max(1100, jobs / 0.68)));
    this.citizenAI.generate(rng, this.targetPop);
    this.services.init();
    this.transit.init();
    this.helis.init();
    this.street.init();
    for (const c of this.citizens) if (c.working && c.job) this.services.onArriveWork(c);
    this.power.apply();
    this.weather.set('clear', 300, false);
    this.history.cityEvent('CITY.EXE initialized. The city wakes up.', { type: 'system' });
    for (const c of this.citizens) c.lastNeedT = this.time;
  }

  // ------------------------------------------------------------ clock
  get day() { return Math.floor(this.time / 1440); }
  get minuteOfDay() { return ((this.time % 1440) + 1440) % 1440; }
  get season() { return Math.floor((this.day % C.YEAR_DAYS) / C.SEASON_DAYS); }
  get year() { return Math.floor(this.day / C.YEAR_DAYS) + 1; }
  get dow() { return this.day % 7; }
  on(t, f) { return this.ev.on(t, f); }
  emit(t, d) { this.ev.emit(t, d); }

  // ------------------------------------------------------------ main update
  update(realDt, speed) {
    if (speed <= 0) return;
    const hyper = speed >= HYPER;
    if (hyper !== this.abstract) this.setAbstract(hyper);
    const phys = Math.min(realDt, 0.1) * speed;
    const maxStep = 0.1;
    const steps = Math.min(hyper ? 12 : 6, Math.ceil(phys / maxStep));
    const dt = phys / steps;
    const t0 = this.time;
    this.timeScaleMul = 1;
    for (let i = 0; i < steps; i++) this.step(dt);
    const dMin = this.time - t0;
    this.citizenAI.update(dMin);
    this.weather.update(dMin, phys);
    this.power.update(dMin);
    this.evolution.update(phys, dMin);
    this.anomalies && this.anomalies.update(dMin);
    // hourly & daily
    const hour = Math.floor(this.time / 60);
    if (hour !== this.lastHour) { this.lastHour = hour; this.hourly(); }
    const day = this.day;
    if (day !== this.lastDay) { this.lastDay = day; this.daily(); }
  }

  step(dt) {
    this.physT += dt;
    this.time += (dt * C.TIME_SCALE) / 60;
    const dtMin = (dt * C.TIME_SCALE) / 60;
    // timers
    if (this.timers.length) {
      const due = [];
      this.timers = this.timers.filter((t) => (t.t <= this.physT ? (due.push(t), false) : true));
      for (const t of due) t.fn();
    }
    this.extraObstacles = this.playerObstacles ? this.playerObstacles.slice() : [];
    if (this.animals) this.animals.addObstacles(this.extraObstacles);
    this.peds.update(dt);
    this.signalsChanged = this.city.net.updateSignals(dt) || this.signalsChanged;
    this.collectSirens();
    this.traffic.update(dt);
    this.services.update(dt);
    this.transit.update(dt);
    this.incidents.update(dt, dtMin);
    this.parkLife.update(dt);
    this.disasters && this.disasters.update(dt, dtMin);
    this.animals && this.animals.update(dt);
    this.helis && this.helis.update(dt);
    this.combat && this.combat.update(dt, dtMin);
    this.dark && this.dark.update(dt);
    this.street && this.street.update(dt);
    this.love && this.love.update(dt);
    this.goals && this.goals.update(dt);
    this.drama && this.drama.update(dt);
    this.restCheck(dt);
  }

  // Simulate time that passed while the player was away (abstract, no physics).
  catchUp(minutes, onProgress) {
    this.offline = true;
    this.setAbstract(true);
    const end = this.time + minutes;
    let i = 0;
    while (this.time < end) {
      const dm = Math.min(5, end - this.time);
      this.time += dm;
      this.physT += (dm * 60) / C.TIME_SCALE;
      if (this.timers.length) { const due = this.timers.filter((t) => t.t <= this.physT); this.timers = this.timers.filter((t) => t.t > this.physT); for (const t of due) { try { t.fn(); } catch (e) { /* stale */ } } }
      this.citizenAI.update(dm);
      this.weather.update(dm, 0);
      this.power.update(dm);
      for (const z of Object.values(this.power.zones)) if (!z.on) this.power.work(z.id, dm * 1.5);
      this.incidents.offlineUpdate(dm);
      this.evolution.offlineUpdate(dm);
      this.disasters.updateFlood(dm);
      const hour = Math.floor(this.time / 60);
      if (hour !== this.lastHour) { this.lastHour = hour; this.hourly(); }
      if (this.day !== this.lastDay) { this.lastDay = this.day; this.daily(); }
      if (onProgress && ++i % 12 === 0) onProgress(1 - (end - this.time) / minutes);
    }
    this.offline = false;
    this.setAbstract(false);
    for (const c of this.citizens) if (c.state === 'abstract') this.citizenAI.finishAbstract(c);
  }

  hourly() {
    this.economy.hourly();
    this.emit('hour', { hour: Math.floor(this.minuteOfDay / 60) });
  }
  daily() {
    this.economy.daily();
    this.citizenAI.daily();
    this.evolution.daily();
    this.anomalies && this.anomalies.daily();
    this.history.richest && 0;
    const rich = this.citizens.reduce((a, c) => (c.status === 'ok' && c.money > (a?.money || 0) ? c : a), null);
    if (rich) this.history.record('richest', Math.round(rich.money), `Richest citizen: ${rich.name} ($${Math.round(rich.money).toLocaleString()})`, { who: rich.id, silent: true });
    if (this.day % 10 === 0) this.emit('season', { season: this.season });
    if (this.day % C.YEAR_DAYS === 0) this.history.cityEvent(`Year ${this.year} begins. Population ${this.citizens.filter((c) => c.status === 'ok' || c.status === 'hospital' || c.status === 'jail').length}.`, { type: 'system' });
    this.emit('day', { day: this.day });
  }

  // Abstract mode (hyper speed): citizen trips resolve by ETA instead of physically.
  setAbstract(on) {
    this.abstract = on;
    if (on) {
      for (const c of this.citizens) {
        if (c.possessed || c.duty) continue;
        if (c.trip && (c.state === 'walking' || c.state === 'driving') && !c.flags.cuffed) {
          const v = c.veh != null ? this.traffic.byId.get(c.veh) : null;
          if (v && (v.fleeing || v.state === 'wreck' || v.state === 'free')) continue;
          this.citizenAI.toAbstract(c);
        } else if (c.state === 'walking' && c.ped && !c.trip && this.parkLife.has(c)) {
          this.parkLife.end(c, true);
        }
      }
    } else {
      this.citizenAI.settleAbstract();
    }
  }

  // ------------------------------------------------------------ queries used by many systems
  buildBuildingGrid() {
    this.bgrid = new Map();
    for (const b of this.city.buildings) {
      const key = b.block;
      if (!this.bgrid.has(key)) this.bgrid.set(key, []);
      this.bgrid.get(key).push(b);
    }
    this.hwSegs = [];
    for (const r of this.city.net.roads) {
      if (r.kind !== 'highway' && r.kind !== 'ramp') continue;
      for (let i = 1; i < r.pts.length; i++) this.hwSegs.push({ x0: r.pts[i - 1][0], z0: r.pts[i - 1][1], x1: r.pts[i][0], z1: r.pts[i][1], y0: r.ys[i - 1], y1: r.ys[i], w: r.width / 2 + 0.3 });
    }
    const rx0 = nodeX(2) + C.CURB + C.SIDEWALK_W + 0.4, rx1 = nodeX(3) - C.CURB - C.SIDEWALK_W - 0.4;
    this.riverX = [rx0, rx1];
  }

  blockOf(x, z) {
    const bx = Math.floor(x / C.BLOCK + C.NB / 2), bz = Math.floor(z / C.BLOCK + C.NB / 2);
    return this.city.blockAt(bx, bz);
  }

  groundHeight(x, z, y = 0) {
    let best = 0;
    if (y > 0.8) {
      for (const s of this.hwSegs) {
        const dx = s.x1 - s.x0, dz = s.z1 - s.z0, L2 = dx * dx + dz * dz;
        let t = L2 ? ((x - s.x0) * dx + (z - s.z0) * dz) / L2 : 0;
        if (t < -0.02 || t > 1.02) continue;
        t = clamp(t, 0, 1);
        const px = s.x0 + dx * t, pz = s.z0 + dz * t;
        if ((px - x) ** 2 + (pz - z) ** 2 > s.w * s.w) continue;
        const h = s.y0 + (s.y1 - s.y0) * t;
        if (h <= y + 1.2 && h > best) best = h;
      }
    } else {
      // ramps start at ground level: allow driving up from the bottom
      for (const s of this.hwSegs) {
        if (Math.min(s.y0, s.y1) > 1.0) continue;
        const dx = s.x1 - s.x0, dz = s.z1 - s.z0, L2 = dx * dx + dz * dz;
        let t = L2 ? ((x - s.x0) * dx + (z - s.z0) * dz) / L2 : 0;
        if (t < 0 || t > 1) continue;
        const px = s.x0 + dx * t, pz = s.z0 + dz * t;
        if ((px - x) ** 2 + (pz - z) ** 2 > s.w * s.w) continue;
        const h = s.y0 + (s.y1 - s.y0) * t;
        if (h <= y + 1.2 && h > best) best = h;
      }
    }
    if (best <= 0.01 && this.inWater(x, z)) return -3.6;
    return best;
  }

  inWater(x, z) {
    if (x > this.riverX[0] && x < this.riverX[1]) {
      for (const j of BRIDGE_ROWS) { const zz = nodeZ(j); if (Math.abs(z - zz) < 9.6) return false; }
      return true;
    }
    const P = this.city.park;
    if (P && Math.hypot(x - P.pond.x, z - P.pond.z) < P.pond.r) return true;
    return false;
  }

  surfaceGrip(x, z) { return this.groundGrip * (this.inWater(x, z) ? 0.3 : 1); }

  // circle vs building AABBs. Returns {nx, nz, pen, b} or null
  collideBox(x, z, r, y = 0) {
    let best = null;
    const check = (b) => {
      if (b.state === 'construction' && (b.built || 0) < 0.05) return;
      const top = b.state === 'ruin' ? 2 : b.state === 'construction' ? b.h * (b.built || 0) : b.h;
      if (y > top + 0.5) return;
      const cx = clamp(x, b.x0, b.x1), cz = clamp(z, b.z0, b.z1);
      const dx = x - cx, dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 > r * r) return;
      let nx, nz, pen;
      if (d2 < 1e-6) {
        // inside: push out along the shortest axis
        const l = x - b.x0, rr = b.x1 - x, t = z - b.z0, bo = b.z1 - z;
        const m = Math.min(l, rr, t, bo);
        if (m === l) { nx = -1; nz = 0; pen = l + r; } else if (m === rr) { nx = 1; nz = 0; pen = rr + r; } else if (m === t) { nx = 0; nz = -1; pen = t + r; } else { nx = 0; nz = 1; pen = bo + r; }
      } else { const d = Math.sqrt(d2); nx = dx / d; nz = dz / d; pen = r - d; }
      if (!best || pen > best.pen) best = { nx, nz, pen, b };
    };
    const bx = Math.floor(x / C.BLOCK + C.NB / 2), bz = Math.floor(z / C.BLOCK + C.NB / 2);
    for (let i = bx - 1; i <= bx + 1; i++) for (let j = bz - 1; j <= bz + 1; j++) {
      const bl = this.city.blockAt(i, j);
      if (!bl) continue;
      const list = this.bgrid.get(bl.id);
      if (list) for (const b of list) check(b);
    }
    // river embankment: can't drive along the water edge into it except off a bridge (cars just fall in)
    return best;
  }

  // per-building visual state for the renderer
  buildingVisual(b) {
    const hour = this.minuteOfDay / 60;
    let light = 0;
    const biz = b.bizId != null ? this.economy.biz[b.bizId] : null;
    if (b.state === 'ok' || b.state === 'damaged') {
      const occ = b.occupants.size;
      if (b.resUnits > 0) {
        const home = b.residents.length ? clamp(occ / Math.max(1, b.residents.length), 0, 1) : 0;
        const awake = hour > 6 && hour < 23.5 ? 1 : 0.15;
        light = clamp(home * awake * 0.85 + 0.06, 0, 0.9) * clamp(b.residents.length / Math.max(1, b.resUnits) * 1.5, 0.15, 1);
      }
      if (biz) {
        const open = this.economy.isOpen(biz, this.minuteOfDay);
        const t = BTYPES[biz.type];
        const officeL = t.office || b.kind === 'tower' ? clamp(occ / 25, 0.08, 0.85) : 0.6;
        light = Math.max(light, open ? officeL : t.office ? 0.1 : 0.05);
      }
      if (b.civic && b.kind !== 'substation') light = Math.max(light, 0.55);
      if (!b.bizId && !b.resUnits && !b.civic) light = 0.25;
      if (!b.powered) light = b.backup ? light * 0.4 : 0;
    }
    let shop = 0;
    if (b.shop) shop = biz ? (this.economy.isOpen(biz, this.minuteOfDay) ? 1 : 0.5) : 0.2;
    const boarded = b.state === 'abandoned' ? 1 : 0;
    const constr = b.state === 'construction' ? 1 : 0;
    const scaleY = b.state === 'ruin' ? 0.22 : b.state === 'construction' ? Math.max(0.04, b.built || 0) : 1;
    const damage = b.state === 'ruin' ? 1 : b.state === 'construction' ? 0 : b.damage;
    let sign = null;
    if (biz && biz.color && b.shop) sign = biz.color;
    return { light: Math.round(light * 20) / 20, shop, damage, fire: Math.round(b.fire * 20) / 20, boarded, constr, scaleY, sign };
  }

  collectSirens() {
    this.sirens.length = 0;
    for (const u of this.services.units) {
      const v = this.traffic.byId.get(u.v);
      if (v && v.siren && v.speed > 2) this.sirens.push(v);
    }
    if (this.possessed && this.possessed.veh && this.possessed.veh.siren) this.sirens.push(this.possessed.veh);
  }

  // is there a siren vehicle coming up behind v?
  sirenNear(v) {
    for (const s of this.sirens) {
      if (s === v) continue;
      const dx = v.x - s.x, dz = v.z - s.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 45 * 45 || d2 < 1) continue;
      const along = dx * Math.sin(s.h) + dz * Math.cos(s.h);
      if (along < 0) continue;
      // same direction of travel
      if (Math.cos(v.h - s.h) > 0.6) return true;
    }
    return false;
  }

  vehicleCollision(a, b, impact) { this.incidents.vehicleCollision(a, b, impact); }

  citizenPos(c) {
    if (c.ped) return { x: c.ped.x, z: c.ped.z, y: c.ped.y || 0 };
    if (c.veh != null) { const v = this.traffic.byId.get(c.veh); if (v && v.state !== 'garage' && v.state !== 'abstract') return { x: v.x, z: v.z, y: v.y, inCar: true }; if (v && v.state === 'garage') { const b = this.city.buildings[v.garage]; return { x: b.x, z: b.z, inside: true }; } }
    if (c.at != null) { const b = this.city.buildings[c.at]; return { x: b.x, z: b.z, inside: true }; }
    return null;
  }

  isPossessedUnit(u) {
    const p = this.possessed;
    if (!p) return false;
    if (p.c && u.crew.includes(p.c.id)) return true;
    if (p.veh && p.veh.id === u.v) return true;
    return false;
  }

  nodeName(n) {
    const names = new Set();
    for (const rid of n.arms) { const r = this.city.net.roads[rid]; if (r.name && r.kind !== 'ramp') names.add(r.name); }
    return Array.from(names).slice(0, 2).join(' & ') || 'an intersection';
  }

  addCitizenCar(c, type, rng = rand) {
    const PAINT = ['#b8bcc0', '#2a2c30', '#f0f0ec', '#8a1a1a', '#1a3a6a', '#3a5a3a', '#c8a040', '#6a6a70', '#4a2a5a', '#d06a2a', '#2a6a8a', '#a8a090', '#5a1a20', '#1e1e22'];
    const v = this.traffic.add(type, { color: rng.pick(PAINT), owner: c.id, reckless: clamp(1 - c.traits.caution - 0.4, 0, 0.6) * 0.8 });
    v.ownerName = c.name;
    c.vehicle = v.id;
    const hb = this.city.buildings[c.home];
    const sl = hb ? this.traffic.findSlotNear(hb.door[0], hb.door[1], [hb.laneNear, hb.laneFar], 180) : null;
    if (sl) this.traffic.parkAtSlot(v, sl.id);
    else {
      const g = this.citizenAI.nearestGarage(hb ? hb.x : 0, hb ? hb.z : 0);
      this.traffic.parkInGarage(v, g);
    }
    return v;
  }

  findVacancy(filter) {
    const cands = [];
    for (const b of this.city.buildings) {
      if (b.resUnits > b.residents.length && (b.state === 'ok' || b.state === 'abandoned') && filter(b)) cands.push(b.id);
    }
    if (!cands.length) return null;
    return cands[rand.int(0, cands.length - 1)];
  }
  vacancyCount() { let n = 0; for (const b of this.city.buildings) if (b.state === 'ok') n += Math.max(0, b.resUnits - b.residents.length); return n; }

  // vehicles knocked out of their lane come to rest, then drivers carry on
  restCheck(dt) {
    for (const v of this.traffic.vehicles) {
      if (v.state !== 'free' || v.player || v.isStaticObstacle || v.hold) { v.restT = 0; continue; }
      if (v.speed > 0.4) { v.restT = 0; continue; }
      v.restT = (v.restT || 0) + dt;
      if (v.restT < 3) continue;
      v.restT = -5;
      this.vehicleIdle(v);
    }
  }

  // a vehicle has no route (or came to rest off-lane): get it moving again
  vehicleIdle(v) {
    const c = v.driver != null ? this.citizens[v.driver] : null;
    if (c && c.possessed) return;
    if (v.lastDest) { const d = v.lastDest; if (this.traffic.driveTo(v, d.lane, d.s, d.cb, d.opts)) return; }
    if (v.unit != null) { const u = this.services.unit(v.unit); if (u && !this.isPossessedUnit(u)) this.services.recover(u); return; }
    if (v.bus) { if (v.bus.state === 'run') this.transit.toNextStop(v.bus); return; }
    if (c && c.trip) {
      const leg = c.trip.legs[c.trip.li];
      if (leg && leg.k === 'drive') { c.trip.li--; this.citizenAI.nextLeg(c); return; }
    }
    if (c && !c.trip && !c.flags.cuffed && !c.flags.suspectOf) { this.citizenAI.resume(c); return; }
    if (!c && v.state === 'lane') {
      const sl = this.traffic.findSlotNear(v.x, v.z, [], 120);
      if (sl) this.traffic.parkAtSlot(v, sl.id);
    }
  }
}

// Citizens relaxing in the park: wander the paths, sit on benches, then leave.
class ParkLife {
  constructor(world) { this.world = world; this.list = new Map(); }
  has(c) { return this.list.has(c.id); }
  loiter(c) {
    const W = this.world;
    if (!c.ped) return;
    const dur = 40 + rand.float() * 80;
    this.list.set(c.id, { until: W.time + dur, next: 0 });
    c.activity = 'park';
  }
  end(c, abstract) {
    const W = this.world;
    this.list.delete(c.id);
    if (c.possessed) return;
    if (c.ped) c.ped.action = '';
    c.goal = null;
    if (abstract) { W.citizenAI.go(c, c.homeless ? (W.city.special.metro || [c.home])[0] : c.home, 'home'); return; }
    if (c.homeless && W.env.night > 0.5) { this.list.set(c.id, { until: W.time + 300, next: 0, sleep: true }); return; }
    W.citizenAI.go(c, c.homeless ? (W.city.special.metro || [0])[0] : c.home, 'home');
  }
  update(dt) {
    const W = this.world;
    const P = W.city.park;
    for (const [cid, s] of this.list) {
      const c = W.citizens[cid];
      if (!c.ped || c.possessed || c.state !== 'walking') { if (!c.possessed) this.list.delete(cid); continue; }
      if (W.time > s.until) { this.end(c); continue; }
      if (c.ped.state === 'idle' && W.physT > s.next) {
        if (s.sleep) { c.ped.action = 'sleep'; s.next = W.physT + 999; continue; }
        if (rand.chance(0.35)) {
          const b = W.city.props.benches[rand.int(0, W.city.props.benches.length - 1)];
          if (b && b.park) { W.peds.walkPoints(c.ped, [[b.x + Math.sin(b.h) * 0.6, b.z + Math.cos(b.h) * 0.6]], (p) => { p.action = 'sit'; p.h = b.h + Math.PI; }); s.next = W.physT + 25 + rand.float() * 40; continue; }
        }
        let x, z;
        for (let k = 0; k < 6; k++) {
          x = P.x0 + 6 + rand.float() * (P.x1 - P.x0 - 12); z = P.z0 + 6 + rand.float() * (P.z1 - P.z0 - 12);
          if (Math.hypot(x - P.pond.x, z - P.pond.z) > P.pond.r + 3 && !(x > P.zoo.x0 - 2 && x < P.zoo.x1 + 2 && z > P.zoo.z0 - 2 && z < P.zoo.z1 + 2)) break;
        }
        c.ped.action = '';
        W.peds.walkPoints(c.ped, [[x, z]], null);
        s.next = W.physT + 8 + rand.float() * 20;
      }
    }
  }
}
