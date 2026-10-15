// Citizens: persistent people with homes, jobs, money, needs, traits, relationships
// and a life log. Decisions are made at a low tick rate (staggered); outdoors they
// become pedestrian agents or drive real vehicles; indoors they are abstract.
import { C } from './config.js';
import { LAST, NAMES_BY_FORM } from '../core/names.js';
import { rand } from '../core/rng.js';
import { clamp, dist } from '../core/math.js';
import { BTYPES, ROLE_TITLE } from './economy.js';

const SKIN = ['#f1d0b5', '#e3b896', '#c99a72', '#a87452', '#7c5236', '#5a3a26', '#eac4a4', '#d4a580'];
const HAIR = ['#1a1410', '#2e2018', '#4a3020', '#6a4a2a', '#a07040', '#c8a060', '#d8d0c0', '#8a8a8a', '#5a2a1a', '#2a2a3a'];
const SHIRT = ['#3a5a8a', '#8a3a3a', '#3a7a5a', '#d8d0c0', '#2a2a2e', '#c8a040', '#6a4a8a', '#d86a3a', '#4a8ab0', '#f0f0f0', '#8a8a4a', '#b04a6a', '#2e5e4e', '#e0c080'];
const PANTS = ['#2a3040', '#3a3a3a', '#4a4030', '#1e2a3a', '#6a6050', '#5a4a3a', '#2a2a2a', '#7a7a80', '#3a4a6a'];
export const UNIFORMS = {
  officer: { shirt: '#1f3a6a', pants: '#1a2438', hat: '#141c30' },
  firefighter: { shirt: '#c8a040', pants: '#3a3020', hat: '#c03020' },
  paramedic: { shirt: '#f0f0f0', pants: '#2a4a3a' },
  doctor: { shirt: '#e8f0f0', pants: '#4a6a8a' },
  nurse: { shirt: '#6aaab8', pants: '#6aaab8' },
  'bus driver': { shirt: '#3a6ab0', pants: '#2a2a3a' },
  'taxi driver': { shirt: '#e0b020', pants: '#2a2a2a' },
  builder: { shirt: '#f08a20', pants: '#3a4a6a', hat: '#f0c020' },
  lineworker: { shirt: '#e8c020', pants: '#3a3a3a', hat: '#f0f0f0' },
  'tow operator': { shirt: '#6a6a70', pants: '#2a2a2a' },
  'security guard': { shirt: '#2a2a2e', pants: '#2a2a2e' },
  mechanic: { shirt: '#3a4a6a', pants: '#3a4a6a' },
  cook: { shirt: '#f4f4f4', pants: '#2a2a2a' },
  pilot: { shirt: '#4a5a3a', pants: '#4a5a3a' },
  teller: { shirt: '#e8eef4', pants: '#2a3040' },
  'bank manager': { shirt: '#2a3448', pants: '#2a3448' },
  dealer: { shirt: '#f4f4f0', pants: '#18181a' },
  'pit boss': { shirt: '#1a1a1e', pants: '#1a1a1e' },
  bouncer: { shirt: '#111114', pants: '#111114' },
  janitor: { shirt: '#4a6a8a', pants: '#3a4a5a' },
};

const physMin = (sec) => (sec * C.TIME_SCALE) / 60;
export const minToPhys = (min) => (min * 60) / C.TIME_SCALE;
// optional per-citizen fields persisted in saves (life sim, crime, family)
export const EXTRA_KEYS = ['bank', 'lastBank', 'edu', 'skills', 'family', 'gang', 'weapons', 'heat', 'life', 'school', 'parents', 'kids', 'siblings', 'studying', 'dealer', 'drugs', 'owes', 'married', 'isPlayer', 'mourned'];

let CID = 0;
export function newCitizen(rng, opts = {}) {
  const form = opts.form ?? (rng.chance(0.5) ? 1 : 0);
  const first = opts.first || rng.pick(NAMES_BY_FORM[form]), last = opts.last || rng.pick(LAST);
  const age = opts.age ?? Math.round(clamp(rng.gauss(38, 15), 18, 86));
  const c = {
    id: opts.id ?? CID++, first, last, name: `${first} ${last}`, age, bday: rng.int(0, C.YEAR_DAYS - 1),
    look: {
      skin: rng.pick(SKIN), hair: rng.pick(HAIR), hairStyle: rng.int(0, 4), shirt: rng.pick(SHIRT), pants: rng.pick(PANTS),
      height: rng.range(0.92, 1.08) * (form ? 0.96 : 1.02), build: rng.range(0.9, 1.15), hat: rng.chance(0.08), form,
    },
    traits: { ambition: rng.float(), social: rng.float(), honesty: clamp(rng.gauss(0.68, 0.22), 0, 1), caution: rng.float(), thrift: rng.float(), curiosity: rng.float() },
    money: Math.round(clamp(rng.gauss(2600, 2200), 60, 40000)),
    home: null, job: null, career: [], vehicle: null, ownedBiz: null,
    rel: {}, needs: { energy: rng.range(0.6, 1), hunger: rng.range(0.5, 1), social: rng.range(0.3, 1), fun: rng.range(0.3, 1) },
    health: 1, injured: 0, status: 'ok', record: { arrests: 0, crimes: 0, wanted: 0, lastCrime: null }, releaseAt: 0,
    log: [], state: 'inside', at: null, activity: 'home', until: 0, goal: null, nextThink: 0, ped: null, veh: null,
    trip: null, working: false, possessed: false, duty: null, bookmarked: false, lastMeal: 0, lastShop: 0, earnedToday: 0,
    homeless: false, stress: 0, happiness: 0.6, lateCount: 0, lastNeedT: 0, sleepH: rng.range(22, 24.8), wakeH: rng.range(5.8, 8.2),
    flags: {}, born: opts.born ?? 0, moves: 0, deathCause: null, mood: '', lastThought: '',
  };
  if (c.id >= CID) CID = c.id + 1;
  return c;
}

export class CitizenAI {
  constructor(world) {
    this.world = world;
    this.cursor = 0;
  }

  get list() { return this.world.citizens; }

  // ---------------------------------------------------- generation
  generate(rng, count) {
    const W = this.world;
    const city = W.city;
    const units = [];
    for (const b of city.buildings) for (let u = 0; u < b.resUnits; u++) units.push({ b: b.id, u });
    rng.shuffle(units);
    // families fill the houses first; apartments take the rest
    units.sort((a, b) => (city.buildings[a.b].kind === 'house' ? 0 : 1) - (city.buildings[b.b].kind === 'house' ? 0 : 1));
    const citizens = [];
    // households
    let ui = 0;
    while (citizens.length < count && ui < units.length) {
      const unit = units[ui++];
      const b = city.buildings[unit.b];
      const size = b.kind === 'house' ? rng.weighted([1, 2, 3, 4], (n) => [0.2, 0.45, 0.2, 0.15][n - 1]) : rng.weighted([1, 2, 3], (n) => [0.55, 0.38, 0.07][n - 1]);
      const last = rng.pick(LAST);
      const members = [];
      for (let k = 0; k < size && citizens.length < count; k++) {
        const c = newCitizen(rng, { last: k === 0 || rng.chance(0.85) ? last : undefined, age: k >= 2 ? rng.int(18, 26) : undefined });
        c.home = unit.b; c.unit = unit.u;
        b.residents.push(c.id);
        members.push(c);
        citizens.push(c);
      }
      if (members.length >= 2) {
        const [a, bb] = members;
        if (Math.abs(a.age - bb.age) < 16 && a.age > 22) this.setRel(a, bb, 0.9, 'partner');
        else this.setRel(a, bb, 0.7, 'family');
        for (let k = 2; k < members.length; k++) { this.setRel(members[k], a, 0.7, 'family'); this.setRel(members[k], bb, 0.7, 'family'); }
      }
    }
    W.citizens = citizens;
    // jobs: civic/emergency first so the city always has responders
    const jobs = W.economy.jobs.slice();
    const priority = (j) => (BTYPES[W.economy.biz[j.biz].type].civic ? 0 : 1);
    jobs.sort((a, b) => priority(a) - priority(b) || rng.float() - 0.5);
    const workers = rng.shuffle(citizens.filter((c) => c.age >= 18 && c.age < 66));
    let wi = 0;
    for (const j of jobs) {
      // keep ~8% unemployed and some slots open (a real job market has vacancies)
      if (wi >= workers.length * 0.92) break;
      if (priority(j) === 1 && rng.chance(0.07)) continue;
      let pick = null;
      for (let k = wi; k < Math.min(workers.length, wi + 25); k++) {
        const c = workers[k];
        if (c.job) continue;
        if ((j.role === 'officer') && c.traits.honesty < 0.45) continue;
        if (['doctor', 'pharmacist', 'manager', 'mayor', 'analyst', 'pilot'].includes(j.role) && c.age < 26) continue;
        pick = k; break;
      }
      if (pick == null) continue;
      const c = workers[pick];
      [workers[wi], workers[pick]] = [workers[pick], workers[wi]];
      wi++;
      this.hire(c, j, false, true);
      c.job.since = -rng.int(10, 600);
      if (rng.chance(0.15)) c.career.push({ title: rng.pick(Object.values(ROLE_TITLE)), at: rng.pick(['a firm out of town', 'the old cannery', 'a shop in Old Town', 'the shipyard']), from: -1000, to: -600 });
    }
    // the unemployed start with little money
    for (const c of citizens) if (!c.job && c.age < 66) c.money = Math.round(Math.max(15, rng.gauss(350, 380)));
    // savings in the bank (what the bank vaults actually hold)
    for (const c of citizens) c.bank = Math.round(c.job || c.age >= 66 ? c.money * rng.range(0.6, 3.5) * (0.6 + c.traits.thrift) : c.money * rng.range(0, 0.4));
    // business owners (some small shops)
    for (const biz of W.economy.biz) {
      if (BTYPES[biz.type].civic || BTYPES[biz.type].office || BTYPES[biz.type].industry) continue;
      if (!rng.chance(0.55)) continue;
      const cands = citizens.filter((c) => c.ownedBiz == null && c.age > 28 && c.money > 1500);
      const o = cands[rng.int(0, cands.length - 1)];
      if (!o) continue;
      o.ownedBiz = biz.id; biz.owner = o.id;
      o.money += 4000;
    }
    // vehicles
    for (const c of citizens) {
      const b = city.buildings[c.home];
      const suburb = b.code === 'SE' || b.code === 'SW';
      const p = (suburb ? 0.82 : b.code === 'D' ? 0.32 : 0.5) * (c.age > 78 ? 0.4 : 1) * (c.money > 4000 ? 1.15 : c.money < 800 ? 0.6 : 1);
      // households share: partner might not need a second car
      if (!rng.chance(p)) continue;
      const rich = c.money > 9000;
      const type = rich ? rng.pick(['sedan', 'suv', 'sports', 'suv']) : c.money < 1500 ? rng.pick(['oldsedan', 'oldpickup', 'hatch']) : rng.pick(['sedan', 'hatch', 'suv', 'pickup', 'hatch', 'sedan']);
      W.addCitizenCar(c, type, rng);
    }
    // social graph: coworkers, neighbors, random friends
    for (const biz of W.economy.biz) {
      const staff = biz.jobs.map((j) => W.economy.jobs[j].holder).filter((x) => x != null);
      for (let i = 0; i < staff.length; i++) for (let k = 0; k < 2; k++) {
        const o = staff[rng.int(0, staff.length - 1)];
        if (o !== staff[i]) this.addAff(citizens[staff[i]], citizens[o], rng.range(0.15, 0.6), 'coworker');
      }
    }
    for (const c of citizens) {
      const n = Math.floor(c.traits.social * 4);
      for (let k = 0; k < n; k++) {
        const o = citizens[rng.int(0, citizens.length - 1)];
        if (o !== c && Math.abs(o.age - c.age) < 20) this.addAff(c, o, rng.range(0.5, 0.85), 'friend');
      }
    }
    // starting state: everyone at home; night-shift workers at work
    for (const c of citizens) {
      c.state = 'inside';
      const at = c.job && this.inShift(c, W.minuteOfDay, 0) ? W.economy.biz[c.job.biz].b : c.home;
      this.placeInside(c, at);
      c.working = at !== c.home;
      c.nextThink = W.time + rng.range(0, 40);
      c.lastShop = W.time - rng.range(0, 4) * 1440;
      c.lastFuel = W.time - rng.range(0, 5) * 1440;
      c.log.push({ t: W.time - rng.int(200, 30000), text: `Moved into ${this.homeName(c)}` });
      if (c.job) c.log.push({ t: W.time + c.job.since * 1440 / 100, text: `Started as ${this.jobTitle(c)} at ${W.economy.biz[c.job.biz].name}` });
    }
  }

  // ---------------------------------------------------- relationships
  setRel(a, b, aff, type) {
    a.rel[b.id] = { a: aff, t: type };
    b.rel[a.id] = { a: aff, t: type };
  }
  addAff(a, b, d, type) {
    const ra = a.rel[b.id] || (a.rel[b.id] = { a: 0, t: type || 'acq' });
    const rb = b.rel[a.id] || (b.rel[a.id] = { a: 0, t: type || 'acq' });
    ra.a = clamp(ra.a + d, -1, 1); rb.a = clamp(rb.a + d, -1, 1);
    if (type && (ra.t === 'acq' || ra.t === 'coworker' && type === 'friend')) { ra.t = type; rb.t = type; }
    return ra;
  }
  friends(c) { return Object.entries(c.rel).filter(([, r]) => r.t === 'friend' || r.t === 'partner').map(([id]) => this.world.citizens[id]).filter((o) => o && o.status !== 'dead' && o.status !== 'left'); }
  partner(c) { for (const id in c.rel) if (c.rel[id].t === 'partner') { const o = this.world.citizens[id]; if (o && o.status !== 'dead' && o.status !== 'left') return o; } return null; }

  // ---------------------------------------------------- jobs
  jobTitle(c) {
    if (!c.job) return c.age >= 66 ? 'Retired' : 'Unemployed';
    const title = ROLE_TITLE[c.job.role] || c.job.role;
    if (c.ownedBiz != null && c.ownedBiz === c.job.biz) return `Owner, ${title}`;
    return title;
  }
  inShift(c, mod, prep = 0) {
    const j = c.job;
    if (!j) return false;
    const day = this.world.day;
    const dow = day % 7;
    let [s, e] = j.shift;
    s -= prep;
    // overnight shifts that started yesterday
    if (e > 1440) {
      const prev = (dow + 6) % 7;
      if (j.days[prev] && mod < e - 1440) return true;
    }
    if (!j.days[dow]) return false;
    return mod >= s && mod < e;
  }
  hire(c, job, own = false, silent = false) {
    const W = this.world;
    if (c.job) this.quitJob(c, '', true);
    job.holder = c.id;
    const biz = W.economy.biz[job.biz];
    c.job = { id: job.id, biz: job.biz, role: job.role, shift: job.shift, days: job.days, wage: job.wage, since: W.day };
    if (!silent) {
      W.history.citizenLog(c, `Hired as ${ROLE_TITLE[job.role] || job.role} at ${biz.name}`, ['officer', 'firefighter', 'paramedic', 'doctor', 'mayor', 'pilot'].includes(job.role) || own);
      if (job.role === 'mayor') W.history.cityEvent(`${c.name} became Mayor`, { type: 'civic', who: c.id });
    }
  }
  quitJob(c, why, silent = false) {
    const W = this.world;
    if (!c.job) return;
    const j = W.economy.jobs[c.job.id];
    const biz = W.economy.biz[c.job.biz];
    c.career.push({ title: ROLE_TITLE[c.job.role] || c.job.role, at: biz.name, from: c.job.since, to: W.day });
    if (j && j.holder === c.id) j.holder = null;
    c.job = null; c.working = false;
    if (!silent && why) W.history.citizenLog(c, why, false);
  }
  loseJob(c, why) {
    const W = this.world;
    if (!c.job) return;
    const title = ROLE_TITLE[c.job.role] || c.job.role;
    this.quitJob(c, '', true);
    W.history.citizenLog(c, `Lost job as ${title} — ${why}`, true);
    c.stress = clamp(c.stress + 0.3, 0, 1);
    if (c.duty) W.services.endDuty(c);
  }

  // ---------------------------------------------------- helpers
  buildingName(bid) {
    const W = this.world;
    const b = W.city.buildings[bid];
    if (!b) return 'somewhere';
    if (b.bizId != null) return W.economy.biz[b.bizId].name;
    if (b.name) return b.name;
    if (b.kind === 'house') return `a house on ${W.city.net.roads[b.roadId]?.name || 'the street'}`;
    return `${b.district} apartments`;
  }
  homeName(c) {
    if (c.homeless) return 'No fixed address';
    const b = this.world.city.buildings[c.home];
    if (b && b.bizId != null && b.kind !== 'house') return `Apartment above ${this.buildingName(c.home)}`;
    return this.buildingName(c.home);
  }
  doorOut(b) {
    const o = 0.9;
    const [dx, dz] = b.door;
    const n = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }[b.front];
    return [dx + n[0] * o, dz + n[1] * o];
  }
  placeInside(c, bid) {
    const W = this.world;
    if (c.at != null) W.city.buildings[c.at]?.occupants.delete(c.id);
    c.at = bid; c.state = 'inside';
    if (bid != null) W.city.buildings[bid].occupants.add(c.id);
  }
  leaveBuilding(c) {
    const W = this.world;
    if (c.at != null) W.city.buildings[c.at].occupants.delete(c.id);
    const b = W.city.buildings[c.at];
    c.at = null;
    c.working = false;
    if (W.abstract) return null;
    const [x, z] = b ? this.doorOut(b) : [0, 0];
    const p = W.peds.spawn(c, x, z, b ? { N: Math.PI, S: 0, W: -Math.PI / 2, E: Math.PI / 2 }[b.front] : 0);
    c.state = 'walking';
    W.emit('leftBuilding', { c, b });
    return p;
  }

  // ---------------------------------------------------- per-frame driver
  update(gameMinutes) {
    const W = this.world;
    const list = this.list;
    const n = list.length;
    if (!n) return;
    const k = Math.min(n, Math.ceil(n * Math.max(gameMinutes, 0.02) / 4) + 2);
    const now = W.time;
    for (let i = 0; i < k; i++) {
      this.cursor = (this.cursor + 1) % n;
      const c = list[this.cursor];
      this.decay(c, now);
      if (c.status === 'dead' || c.status === 'left') continue;
      if (c.possessed) continue;
      if (c.state === 'abstract') { if (now >= c.eta) this.finishAbstract(c); continue; }
      if (c.status === 'hospital' || c.status === 'jail') { if (now >= c.releaseAt) this.release(c); continue; }
      if (c.duty) continue;
      if (c.state === 'inside' && now >= c.nextThink) this.think(c);
      // stuck safety: travelers that haven't progressed
      if (c.trip && c.state !== 'inside') {
        const pos = c.ped || (c.veh != null ? W.traffic.byId.get(c.veh) : null);
        if (pos) {
          const tr = c.trip;
          if (!tr.lp || Math.abs(pos.x - tr.lp[0]) + Math.abs(pos.z - tr.lp[1]) > 4) { tr.lp = [pos.x, pos.z]; tr.lmt = now; }
          else if (now - tr.lmt > 90 && !c.busLeg && !c.taxiReq) this.unstick(c);
        }
      }
    }
  }

  decay(c, now) {
    const dt = now - (c.lastNeedT || now);
    c.lastNeedT = now;
    if (dt <= 0) return;
    const h = dt / 60;
    const N = c.needs;
    const sleeping = c.activity === 'sleep';
    N.energy = clamp(N.energy + (sleeping ? h * 0.14 : -h * 0.055), 0, 1);
    N.hunger = clamp(N.hunger - h * (sleeping ? 0.02 : 0.06), 0, 1);
    N.social = clamp(N.social - h * 0.02 * (0.5 + c.traits.social), 0, 1);
    N.fun = clamp(N.fun - h * 0.025, 0, 1);
    if (c.injured > 0 && c.status !== 'hospital') c.health = clamp(c.health - h * 0.01 * c.injured, 0.05, 1);
    c.happiness = clamp(0.25 * (N.energy + N.hunger + N.social + N.fun) - c.stress * 0.4 + (c.job ? 0.1 : -0.1) + (c.homeless ? -0.25 : 0), 0, 1);
    c.stress = clamp(c.stress - h * 0.01, 0, 1);
  }

  // ---------------------------------------------------- decisions
  think(c) {
    const W = this.world;
    const now = W.time;
    const mod = W.minuteOfDay;
    const hour = mod / 60;
    const dow = W.day % 7;
    const N = c.needs;
    const atHome = c.at === c.home && !c.homeless;
    const atWork = c.job && c.at === W.economy.biz[c.job.biz].b;
    c.nextThink = now + 15 + rand.float() * 10;

    // finish current activity first
    if (now < c.until && c.activity !== 'home') return;
    if (c.age < 18) { this.thinkChild(c, hour, dow, atHome); return; }

    // ---- work
    if (c.job) {
      const wb = W.economy.biz[c.job.biz];
      const workB = wb.b;
      const commute = this.estimateTravel(c, c.at, workB);
      if (this.inShift(c, mod, commute + 10)) {
        if (atWork) {
          if (!c.working) this.startWork(c);
          if (!c.job) return;
          const end = this.shiftEndTime(c, mod);
          c.activity = 'work'; c.until = end; c.nextThink = Math.min(end, now + 60);
          return;
        }
        if (W.city.buildings[workB].state === 'ok' || BTYPES[wb.type].civic) { this.go(c, workB, 'work'); return; }
      }
      if (atWork && c.working) this.endWork(c);
    }
    // ---- night: go home / sleep
    const sleepTime = hour >= c.sleepH || hour < c.wakeH - (c.job && c.job.shift[0] < 7 * 60 ? 1 : 0);
    if (sleepTime || N.energy < 0.12) {
      if (atHome || (c.homeless && c.at != null)) {
        c.activity = 'sleep';
        let wake = c.wakeH;
        if (c.job && this.worksTomorrowEarly(c)) wake = Math.min(wake, c.job.shift[0] / 60 - 1.2);
        let mins = (wake * 60 - mod + 1440) % 1440;
        if (mins < 30) mins = 30;
        c.until = now + mins; c.nextThink = c.until;
        return;
      }
      if (c.homeless) { this.goHomeless(c); return; }
      this.go(c, c.home, 'home');
      return;
    }
    // ---- hungry
    if (N.hunger < 0.35) {
      const eatOut = !atHome || c.money > 400 && rand.chance(0.35 + c.traits.social * 0.3);
      if (eatOut && c.money > 30) {
        const type = hour < 10.5 ? 'cafe' : rand.chance(0.8) ? 'restaurant' : 'cafe';
        const biz = this.pickBiz(c, type, 600);
        if (biz) { this.go(c, biz.b, 'eat', { biz: biz.id }); return; }
      }
      if (!atHome && !c.homeless) { this.go(c, c.home, 'home'); return; }
      if (atHome) { N.hunger = clamp(N.hunger + 0.6, 0, 1); c.activity = 'cook'; c.until = now + 40; c.money -= 6; return; }
    }
    // ---- crime (desperation + low honesty)
    const wave = W.disasters && W.time < W.disasters.crimeWaveUntil;
    if (W.incidents && c.money < (wave ? 400 : 150) && c.traits.honesty < (wave ? 0.5 : 0.34) && c.age < 62 && rand.chance(0.08 + (1 - c.traits.honesty) * 0.1 + (W.power.anyBlackout ? 0.1 : 0)) && (hour > 9 || hour < 2) && (now - (c.record.lastCrime || -1e9)) > 1440 * 1.5) {
      if (W.incidents.planCrime(c)) return;
    }
    // ---- unemployed: look for work during the day
    if (!c.job && c.age < 66 && hour > 9 && hour < 16 && dow < 6 && rand.chance(0.45)) {
      const j = this.findJobFor(c);
      if (j) { this.go(c, W.economy.biz[j.biz].b, 'jobhunt', { job: j.id }); return; }
    }
    // ---- errands: pharmacy, gas, car service, a quick snack
    if (hour > 8 && hour < 21 && c.money > 40) {
      if ((c.health < 0.9 || c.injured > 0 || (c.age > 62 && rand.chance(0.04))) && now - (c.lastPharm || -1e9) > 1440 * 2) {
        const biz = this.pickBiz(c, 'pharmacy', 700);
        if (biz) { c.lastPharm = now; this.go(c, biz.b, 'shop', { biz: biz.id }); return; }
      }
      if (c.vehicle != null && now - (c.lastFuel || 0) > 1440 * 4 && rand.chance(0.5)) {
        const biz = this.pickBiz(c, 'gas', 2000);
        if (biz) { c.lastFuel = now; this.go(c, biz.b, 'shop', { biz: biz.id }); return; }
      }
      if (c.vehicle != null && now - (c.lastService || -rand.float() * 30 * 1440) > 1440 * 18 && rand.chance(0.3)) {
        const biz = this.pickBiz(c, 'autoshop', 2000);
        if (biz) { c.lastService = now; this.go(c, biz.b, 'shop', { biz: biz.id }); return; }
      }
      // banking: deposit spare cash, withdraw when running low
      if (dow < 5 && hour < 17 && now - (c.lastBank || -rand.float() * 12 * 1440) > 1440 * 6 && (c.money > 2500 + c.traits.thrift * 3000 || c.money < 150 && (c.bank || 0) > 300) && rand.chance(0.35)) {
        const biz = this.pickBiz(c, 'bank', 1200);
        if (biz) { c.lastBank = now; this.go(c, biz.b, 'bank', { biz: biz.id }); return; }
      }
      if (N.hunger < 0.6 && rand.chance(0.15)) {
        const biz = this.pickBiz(c, 'convenience', 300);
        if (biz) { this.go(c, biz.b, 'eat', { biz: biz.id }); return; }
      }
    }
    // late-night snack runs (24h stores)
    if ((hour > 22 || hour < 2) && N.hunger < 0.5 && c.money > 15 && rand.chance(0.25)) {
      const biz = this.pickBiz(c, 'convenience', 400);
      if (biz) { this.go(c, biz.b, 'eat', { biz: biz.id }); return; }
    }
    // ---- groceries
    if (now - c.lastShop > 1440 * 3 && c.money > 60 && hour > 8 && hour < 20) {
      const biz = this.pickBiz(c, rand.chance(0.7) ? 'grocery' : 'convenience', 500);
      if (biz) { this.go(c, biz.b, 'shop', { biz: biz.id }); return; }
    }
    // ---- social
    const weekend = dow >= 5;
    if (N.social < 0.45 && (hour > 17 || weekend) && hour < 23) {
      const fr = this.friends(c).filter((o) => o.state === 'inside' && !o.working && o.status === 'ok' && !o.possessed && !o.duty);
      if (fr.length && rand.chance(0.6)) {
        const o = fr[rand.int(0, fr.length - 1)];
        const venueType = hour > 19 ? 'bar' : rand.chance(0.5) ? 'cafe' : 'restaurant';
        const venue = this.pickBiz(c, venueType, 700);
        if (venue && c.money > 40 && rand.chance(0.6)) {
          this.go(c, venue.b, 'meet', { biz: venue.id, with: o.id });
          if (o.state === 'inside' && o.nextThink > now - 1) { this.go(o, venue.b, 'meet', { biz: venue.id, with: c.id }); }
          return;
        }
        if (!o.homeless && o.home !== c.home) { this.go(c, o.home, 'visit', { with: o.id }); return; }
      }
      // big nights out: clubs and lounges for the young and social, the casino for gamblers
      if ((hour >= 21 || hour < 2) && (weekend || dow === 4) && c.money > 120) {
        if (c.age < 40 && rand.chance(0.25 + c.traits.social * 0.4)) {
          const club = this.pickBiz(c, rand.chance(0.75) ? 'nightclub' : 'lounge', 1600);
          if (club) { this.go(c, club.b, 'party', { biz: club.id }); return; }
        }
        if (c.money > 400 && rand.chance((1 - c.traits.thrift) * 0.3 + (c.traits.caution < 0.3 ? 0.1 : 0))) {
          const cas = this.pickBiz(c, 'casino', 2500);
          if (cas) { this.go(c, cas.b, 'gamble', { biz: cas.id }); return; }
        }
      }
      if (hour > 19 && c.money > 60 && rand.chance(0.35 + c.traits.social * 0.3)) {
        const bar = this.pickBiz(c, 'bar', 700);
        if (bar) { this.go(c, bar.b, 'drink', { biz: bar.id }); return; }
      }
    }
    // ---- leisure during the day
    if (N.fun < 0.5 && hour > 8 && hour < 21) {
      const r = rand.float();
      const goodWeather = W.weather.precip < 0.2 && W.weather.temp > 4;
      if (goodWeather && r < 0.4) { this.goPark(c); return; }
      if (r < 0.6 && c.money > 300) {
        const type = rand.pick(['clothing', 'electronics', 'mall', 'gym']);
        const biz = this.pickBiz(c, type, 900);
        if (biz) { this.go(c, biz.b, type === 'gym' ? 'gym' : 'shop', { biz: biz.id }); return; }
      }
      if (r < 0.75 && c.money > 30) {
        const biz = this.pickBiz(c, 'cafe', 600);
        if (biz) { this.go(c, biz.b, 'eat', { biz: biz.id }); return; }
      }
    }
    // ---- default: go home or idle where you are
    if (!atHome && !c.homeless) { this.go(c, c.home, 'home'); return; }
    if (c.homeless && c.at == null) { this.goHomeless(c); return; }
    c.activity = 'home';
    c.until = now + 30 + rand.float() * 60;
    c.nextThink = c.until;
  }

  worksTomorrowEarly(c) {
    const dow = (this.world.day + 1) % 7;
    return c.job && c.job.days[dow] && c.job.shift[0] < 9 * 60;
  }
  shiftEndTime(c, mod) {
    const W = this.world;
    let e = c.job.shift[1];
    let end;
    if (e > 1440 && mod < e - 1440) end = W.time - mod + (e - 1440);
    else end = W.time - mod + e;
    return end;
  }
  startWork(c) {
    const W = this.world;
    c.working = true;
    c.activity = 'work';
    const mod = W.minuteOfDay;
    let late = mod - c.job.shift[0];
    if (late < -600) late += 1440;
    if (late > 45 && late < 400) {
      c.lateCount++;
      if (c.lateCount === 4) W.history.citizenLog(c, `Got a warning for being late to work`, false);
      if (c.lateCount >= 9 && rand.chance(0.3 + c.traits.caution * -0.2)) { this.loseJob(c, 'fired for repeated lateness'); return; }
    } else if (late <= 10 && c.lateCount > 0 && rand.chance(0.25)) c.lateCount--;
    W.services && W.services.onArriveWork(c);
  }
  endWork(c) {
    const W = this.world;
    c.working = false;
    if (c.job && c.lateCount > 0 && rand.chance(0.03)) c.lateCount--;
    // promotion chance
    if (c.job && rand.chance(0.004 * c.traits.ambition) && W.day - c.job.since > 20) {
      c.job.wage *= 1.12;
      const j = W.economy.jobs[c.job.id]; if (j) j.wage = c.job.wage;
      W.history.citizenLog(c, `Got a raise at ${W.economy.biz[c.job.biz].name}`, false);
    }
    W.services && W.services.onShiftEnd(c);
  }

  findJobFor(c) {
    const W = this.world;
    const open = W.economy.openJobs((j, biz) => {
      if (j.role === 'mayor') return false;
      if (j.role === 'officer' && (c.traits.honesty < 0.5 || c.record.arrests > 0)) return false;
      if (['doctor', 'pharmacist', 'manager', 'analyst', 'pilot'].includes(j.role) && (c.traits.ambition < 0.5 || c.age < 26)) return false;
      return true;
    });
    if (!open.length) return null;
    // prefer nearby, better paid
    const hb = W.city.buildings[c.home] || W.city.buildings[0];
    let best = null, bs = -Infinity;
    for (let k = 0; k < 12; k++) {
      const j = open[rand.int(0, open.length - 1)];
      const b = W.city.buildings[W.economy.biz[j.biz].b];
      const s = j.wage * 3 - dist(hb.x, hb.z, b.x, b.z) * 0.02 + rand.float() * 10;
      if (s > bs) { bs = s; best = j; }
    }
    return best;
  }

  pickBiz(c, type, maxD) {
    const W = this.world;
    const mod = W.minuteOfDay;
    const from = W.city.buildings[c.at ?? c.home] || W.city.buildings[0];
    let best = null, bs = -Infinity;
    const list = W.economy.ofType(type);
    for (let k = 0; k < Math.min(14, list.length); k++) {
      const biz = list[rand.int(0, list.length - 1)];
      if (!W.economy.isOpen(biz, mod + 30)) continue;
      const b = W.city.buildings[biz.b];
      const d = dist(from.x, from.z, b.x, b.z);
      if (d > maxD && c.vehicle == null) continue;
      const s = biz.rep * 2 - d / 400 + rand.float() * 0.8 - (biz.priceF - 1) * c.traits.thrift * 2 + (b.district === from.district ? 0.3 : 0) - (W.incidents?.dangerAt(b.x, b.z) || 0);
      if (s > bs) { bs = s; best = biz; }
    }
    return best;
  }

  goPark(c) {
    const W = this.world;
    const P = W.city.park;
    this.go(c, null, 'park', { point: [P.x0 + 10 + rand.float() * (P.x1 - P.x0 - 20), (P.z0 + P.z1) / 2 + (rand.chance(0.5) ? 2.5 : -2.5)] });
  }
  goHomeless(c) {
    c.activity = 'drift';
    this.goPark(c);
  }

  // ---------------------------------------------------- arrival effects
  arriveGoal(c) {
    const W = this.world;
    const g = c.goal || {};
    const now = W.time;
    const N = c.needs;
    const b = c.at != null ? W.city.buildings[c.at] : null;
    c.activity = g.type || 'idle';
    switch (g.type) {
      case 'work': {
        if (!c.job) { c.until = now + 20; c.nextThink = c.until; break; }
        this.startWork(c);
        if (!c.job) { c.until = now + 20; c.nextThink = c.until; break; }
        c.until = this.shiftEndTime(c, W.minuteOfDay);
        c.nextThink = Math.min(c.until, now + 60);
        break;
      }
      case 'home': c.until = now + 20; c.nextThink = now + 5; break;
      case 'eat': case 'meet': case 'drink': case 'shop': case 'gym': {
        const biz = b && b.bizId != null ? W.economy.biz[b.bizId] : null;
        const spent = biz ? W.economy.visit(biz, c) : 0;
        if (g.type === 'eat' || g.type === 'meet') N.hunger = clamp(N.hunger + (spent > 0 ? 0.7 : 0.1), 0, 1);
        if (g.type === 'drink' || g.type === 'meet') { N.social = clamp(N.social + 0.4, 0, 1); N.fun = clamp(N.fun + 0.3, 0, 1); }
        if (g.type === 'shop') { c.lastShop = now; N.fun = clamp(N.fun + 0.2, 0, 1); }
        if (biz && (biz.type === 'convenience' || biz.type === 'gas') && W.lottery && rand.chance(0.12 + (1 - c.traits.thrift) * 0.15)) W.lottery.npcBuy(c);
        if (g.type === 'gym') { N.fun = clamp(N.fun + 0.4, 0, 1); N.energy = clamp(N.energy - 0.15, 0, 1); }
        c.until = now + (g.type === 'drink' ? 90 + rand.float() * 120 : g.type === 'meet' ? 60 + rand.float() * 90 : 25 + rand.float() * 35);
        c.nextThink = c.until;
        if (spent === 0 && biz) c.lastThought = `${biz.name} couldn't serve me`;
        this.socialize(c, b);
        break;
      }
      case 'bank': {
        const biz = b && b.bizId != null ? W.economy.biz[b.bizId] : null;
        if (biz && W.economy.isOpen(biz, W.minuteOfDay)) {
          if (c.money > 1500) { const dep = Math.round(c.money * (0.4 + c.traits.thrift * 0.4)); c.money -= dep; c.bank = (c.bank || 0) + dep; W.economy.vaultChange(biz, dep); }
          else if ((c.bank || 0) > 0) { const wd = Math.min(c.bank, 400 + rand.float() * 600); c.bank -= wd; c.money += wd; W.economy.vaultChange(biz, -wd); }
        }
        c.until = now + 15 + rand.float() * 20; c.nextThink = c.until;
        break;
      }
      case 'party': case 'gamble': {
        const biz = b && b.bizId != null ? W.economy.biz[b.bizId] : null;
        const spent = biz ? W.economy.visit(biz, c) : 0;
        N.social = clamp(N.social + 0.5, 0, 1); N.fun = clamp(N.fun + 0.6, 0, 1); N.energy = clamp(N.energy - 0.2, 0, 1);
        if (g.type === 'gamble' && biz && spent > 0) {
          // the house edge is real: a few win big, most lose a little
          const stake = Math.min(c.money * 0.25 * (1.2 - c.traits.thrift), 2000);
          const r = rand.float();
          const delta = r < 0.02 ? stake * 8 : r < 0.4 ? stake * rand.range(0.3, 1.2) : -stake;
          c.money = Math.max(0, c.money + delta); biz.cash -= delta; biz.revToday -= delta;
          if (delta > 2000) W.history.citizenLog(c, `Won $${Math.round(delta).toLocaleString()} at ${biz.name}`, true);
          else if (delta < -800) W.history.citizenLog(c, `Lost $${Math.round(-delta).toLocaleString()} at ${biz.name}`, false);
        }
        c.until = now + 100 + rand.float() * 140; c.nextThink = c.until;
        this.socialize(c, b); this.socialize(c, b);
        break;
      }
      case 'visit': {
        N.social = clamp(N.social + 0.5, 0, 1);
        c.until = now + 60 + rand.float() * 120; c.nextThink = c.until;
        const o = W.citizens[g.with];
        if (o) this.addAff(c, o, 0.05);
        this.socialize(c, b);
        break;
      }
      case 'jobhunt': {
        const j = W.economy.jobs[g.job];
        const chance = 0.45 + c.traits.ambition * 0.3 - c.record.arrests * 0.15;
        if (j && j.holder == null && rand.chance(chance)) this.hire(c, j);
        else c.lastThought = 'No luck finding work today';
        c.until = now + 20; c.nextThink = c.until;
        break;
      }
      case 'park': {
        N.fun = clamp(N.fun + 0.35, 0, 1);
        c.until = now + 40; c.nextThink = c.until;
        break;
      }
      case 'crime': {
        W.incidents && W.incidents.executeCrime(c);
        break;
      }
      default: c.until = now + 20; c.nextThink = c.until;
    }
    c.goal = null;
    W.emit('arrived', { c });
  }

  socialize(c, b) {
    const W = this.world;
    if (!b || b.occupants.size < 2 || !rand.chance(0.35 + c.traits.social * 0.4)) return;
    const arr = Array.from(b.occupants);
    const o = W.citizens[arr[rand.int(0, arr.length - 1)]];
    if (!o || o === c || o.possessed) return;
    const prev = c.rel[o.id];
    const before = prev ? prev.a : 0;
    const compat = 1 - Math.abs(c.traits.social - o.traits.social) * 0.6 - Math.abs(c.age - o.age) / 80;
    const d = (0.06 + rand.float() * 0.12) * compat - (rand.chance(0.06) ? 0.25 : 0);
    const r = this.addAff(c, o, d, prev ? prev.t : 'acq');
    if (before < 0.6 && r.a >= 0.6 && r.t !== 'partner' && r.t !== 'family') {
      r.t = 'friend'; o.rel[c.id].t = 'friend';
      W.history.citizenLog(c, `Became friends with ${o.name}`, false);
      W.history.citizenLog(o, `Became friends with ${c.name}`, false);
    }
    if (r.t === 'friend' && r.a > 0.86 && !this.partner(c) && !this.partner(o) && Math.abs(c.age - o.age) < 14 && rand.chance(0.12)) {
      r.t = 'partner'; o.rel[c.id].t = 'partner';
      W.history.citizenLog(c, `Started dating ${o.name}`, true);
      W.history.citizenLog(o, `Started dating ${c.name}`, true);
    }
    if (r.a < -0.4 && before >= -0.4) {
      r.t = 'enemy'; o.rel[c.id].t = 'enemy';
      W.history.citizenLog(c, `Had a falling out with ${o.name}`, false);
      if (rand.chance(0.15) && W.incidents) W.incidents.fight(c, o, b);
    }
  }

  // children: school on weekdays from age 5, home otherwise; teens hang out after school
  thinkChild(c, hour, dow, atHome) {
    const W = this.world;
    const now = W.time;
    if (c.age >= 5 && dow < 5 && hour >= 7.2 && hour < 14.5) {
      const school = this.nearestOf(c, 'school');
      if (school && c.at !== school.b) { this.go(c, school.b, 'school', { biz: school.id }); return; }
      if (school) { c.activity = 'school'; c.until = now + (15 - hour) * 60; c.nextThink = c.until; return; }
    }
    if (c.age >= 13 && hour >= 15 && hour < 20 && c.needs.social < 0.5 && rand.chance(0.25)) {
      if (rand.chance(0.5)) { this.goPark(c); return; }
      const cafe = this.pickBiz(c, 'cafe', 500);
      if (cafe) { this.go(c, cafe.b, 'eat', { biz: cafe.id }); return; }
    }
    if (!atHome && c.home != null) { this.go(c, c.home, 'home'); return; }
    c.activity = 'home';
    c.until = now + 30 + rand.float() * 40;
    c.nextThink = c.until;
  }
  nearestOf(c, type) {
    const W = this.world;
    const hb = W.city.buildings[c.home];
    let best = null, bd = 1e9;
    for (const biz of W.economy.ofType(type)) { const b = W.city.buildings[biz.b]; const d = dist(b.x, b.z, hb.x, hb.z); if (d < bd) { bd = d; best = biz; } }
    return best;
  }

  // ---------------------------------------------------- trips
  estimateTravel(c, fromB, toB) {
    const W = this.world;
    const a = W.city.buildings[fromB], b = W.city.buildings[toB];
    if (!a || !b) return 30;
    const d = dist(a.x, a.z, b.x, b.z);
    if (d < 230) return physMin((d * 1.3) / 1.4) + 4;
    const v = c.vehicle != null ? W.traffic.byId.get(c.vehicle) : null;
    if (v && !v.stolen && v.state !== 'repair') return physMin((d * 1.35) / 8.5) + 10;
    if (W.transit && W.transit.metroOption(a.x, a.z, b.x, b.z)) return physMin(300 / 1.4) + physMin(d / 15) + 15;
    if (W.transit && W.transit.busOption(a.x, a.z, b.x, b.z)) return physMin(300 / 1.4) + physMin((d * 1.4) / 6) + 25;
    return physMin((d * 1.3) / 1.4) + 5;
  }

  go(c, destB, type, opts = {}) {
    c.goal = { type, b: destB, ...opts, label: this.goalLabel(type, destB, opts) };
    if (destB != null && c.at === destB) { this.arriveGoal(c); return; }
    this.startTrip(c, destB, opts.point);
  }

  goalLabel(type, destB, opts = {}) {
    const name = destB != null ? this.buildingName(destB) : '';
    const W = this.world;
    switch (type) {
      case 'work': return `Going to work at ${name}`;
      case 'home': return 'Heading home';
      case 'eat': return `Getting food at ${name}`;
      case 'shop': return `Shopping at ${name}`;
      case 'meet': return `Meeting ${W.citizens[opts.with]?.first || 'a friend'} at ${name}`;
      case 'visit': return `Visiting ${W.citizens[opts.with]?.first || 'a friend'}`;
      case 'drink': return `Drinks at ${name}`;
      case 'gym': return `Working out at ${name}`;
      case 'bank': return `Banking at ${name}`;
      case 'party': return `Night out at ${name}`;
      case 'gamble': return `Trying their luck at ${name}`;
      case 'school': return `At school (${name})`;
      case 'jobhunt': return `Applying for a job at ${name}`;
      case 'park': return 'Walking in Greenway Park';
      case 'crime': return opts.disguise || `Running an errand near ${name}`;
      case 'hospital': return 'Going to the hospital';
      default: return type;
    }
  }

  chooseMode(c, fx, fz, tx, tz) {
    const W = this.world;
    const d = dist(fx, fz, tx, tz);
    if (d < 230) return 'walk';
    const v = c.vehicle != null ? W.traffic.byId.get(c.vehicle) : null;
    if (v && v.state !== 'gone' && v.damage < 0.7 && v.state !== 'repair' && v.state !== 'towed' && !v.stolen && v.state !== 'abstract') {
      const vd = dist(v.x, v.z, fx, fz);
      if (vd < 260) return 'drive';
    }
    if (W.transit) {
      const m = W.transit.metroOption(fx, fz, tx, tz);
      if (m && d > 450) return 'metro';
      const bOpt = W.transit.busOption(fx, fz, tx, tz);
      if (bOpt) return 'bus';
      if (c.money > 80 && d > 400 && rand.chance(0.6)) return 'taxi';
    }
    return 'walk';
  }

  startTrip(c, destB, point) {
    const W = this.world;
    const db = destB != null ? W.city.buildings[destB] : null;
    const [tx, tz] = db ? this.doorOut(db) : point;
    let fx, fz;
    if (c.state === 'inside') { const b = W.city.buildings[c.at]; [fx, fz] = b ? this.doorOut(b) : [tx, tz]; }
    else if (c.veh != null) { const v = W.traffic.byId.get(c.veh); fx = v.x; fz = v.z; }
    else if (c.ped) { fx = c.ped.x; fz = c.ped.z; }
    else { fx = tx; fz = tz; }
    let mode = c.veh != null ? 'drive' : this.chooseMode(c, fx, fz, tx, tz);
    const trip = { dest: destB, point: [tx, tz], mode, legs: [], li: -1, start: W.time, legStart: W.time, from: [fx, fz] };
    c.trip = trip;
    if (W.abstract) { this.toAbstract(c); return; }
    const L = trip.legs;
    if (c.state === 'inside') L.push({ k: 'exit' });
    if (mode === 'drive') {
      if (c.veh == null) { L.push({ k: 'tocar' }); L.push({ k: 'carin' }); }
      L.push({ k: 'drive' });
      L.push({ k: 'carout' });
    } else if (mode === 'metro') {
      const m = W.transit.metroOption(fx, fz, tx, tz);
      L.push({ k: 'walk', to: this.doorOut(W.city.buildings[m.from]) });
      L.push({ k: 'metro', from: m.from, to: m.to });
    } else if (mode === 'bus') {
      const o = W.transit.busOption(fx, fz, tx, tz);
      L.push({ k: 'walk', to: [o.stopA.wx, o.stopA.wz] });
      L.push({ k: 'bus', opt: o });
    } else if (mode === 'taxi') {
      L.push({ k: 'taxi' });
    }
    if (db) { L.push({ k: 'walk', to: [tx, tz] }); L.push({ k: 'enter', b: destB }); }
    else L.push({ k: 'walk', to: [tx, tz], park: true }, { k: 'loiter' });
    this.nextLeg(c);
  }

  nextLeg(c) {
    const W = this.world;
    const trip = c.trip;
    if (!trip) return;
    trip.li++;
    trip.legStart = W.time;
    const leg = trip.legs[trip.li];
    if (!leg) { c.trip = null; return; }
    const done = () => { if (c.trip === trip) this.nextLeg(c); };
    switch (leg.k) {
      case 'exit': {
        this.leaveBuilding(c);
        done();
        break;
      }
      case 'walk': {
        const p = c.ped || W.peds.spawn(c, trip.from[0], trip.from[1]);
        c.state = 'walking';
        W.peds.walkTo(p, leg.to[0], leg.to[1], done, { run: c.goal?.run });
        break;
      }
      case 'tocar': {
        const v = W.traffic.byId.get(c.vehicle);
        if (v && v.stolen && !v.recovered) {
          const inc = W.incidents.list.find((i) => i.type === 'theft' && i.data.v === v.id && !i.closed);
          if (inc && !inc.reported) { inc.reportAt = W.time; W.history.citizenLog(c, `Discovered their ${v.T.label} was stolen`, true); }
        }
        if (!v || (v.stolen && !v.recovered) || v.state === 'repair' || v.state === 'towed') { trip.legs.splice(trip.li + 1, 3); trip.mode = 'walk'; done(); return; }
        const p = c.ped;
        const [cx, cz] = this.carSidePoint(v);
        W.peds.walkTo(p, cx, cz, done);
        break;
      }
      case 'carin': {
        const v = W.traffic.byId.get(c.vehicle);
        if (!v || v.driver != null && v.driver !== c.id) { trip.legs.splice(trip.li + 1, 2); done(); return; }
        if (c.ped) W.peds.despawn(c.ped);
        v.driver = c.id; c.veh = v.id; c.state = 'driving';
        v.lightsOn = W.env.night > 0.3 || W.weather.precip > 0.4;
        W.emit('carIn', { c, v });
        setTimeoutGame(W, 0.8, done);
        break;
      }
      case 'drive': {
        const v = W.traffic.byId.get(c.veh);
        if (!v) { done(); return; }
        const db = trip.dest != null ? W.city.buildings[trip.dest] : null;
        const tx = trip.point[0], tz = trip.point[1];
        let slot = W.traffic.findSlotNear(tx, tz, db ? [db.laneNear, db.laneFar] : [], 160);
        const parkOk = () => {
          v.afterPark = () => { if (c.trip === trip) this.nextLeg(c); };
          W.traffic.beginParking(v, slot.id);
        };
        if (slot) {
          slot.reserved = v.id;
          v.ctrl = W.driverCtrl;
          const ok = W.traffic.driveTo(v, slot.lane, slot.s, () => {
            if (c.trip !== trip) return;
            if (slot.car != null && slot.car !== v.id) { const s2 = W.traffic.findSlotNear(v.x, v.z, [], 140); if (s2) { slot = s2; slot.reserved = v.id; W.traffic.driveTo(v, slot.lane, slot.s, () => parkOk()); return; } }
            parkOk();
          });
          if (!ok) { slot.reserved = null; this.abortDrive(c, v); }
        } else {
          // no curb space: use the nearest parking garage
          const g = this.nearestGarage(tx, tz);
          const gb = W.city.buildings[g];
          const nl = W.city.net.links[gb.laneNear];
          const ok = W.traffic.driveTo(v, gb.laneNear, Math.min(nl.length - 2, nl.length * 0.5), () => {
            W.traffic.parkInGarage(v, g);
            if (c.trip === trip) this.nextLeg(c);
          });
          if (!ok) this.abortDrive(c, v);
        }
        break;
      }
      case 'carout': {
        const v = W.traffic.byId.get(c.veh);
        v.driver = null; c.veh = null;
        let x, z;
        if (v.state === 'garage') { const gb = W.city.buildings[v.garage]; [x, z] = this.doorOut(gb); }
        else [x, z] = this.carSidePoint(v);
        W.peds.spawn(c, x, z, v.h);
        c.state = 'walking';
        trip.from = [x, z];
        W.emit('carOut', { c, v });
        done();
        break;
      }
      case 'enter': {
        if (c.ped) W.peds.despawn(c.ped);
        this.placeInside(c, leg.b);
        c.trip = null;
        this.arriveGoal(c);
        break;
      }
      case 'loiter': {
        c.trip = null;
        c.state = 'walking';
        c.activity = c.goal?.type || 'park';
        W.parkLife && W.parkLife.loiter(c);
        break;
      }
      case 'crime': {
        c.trip = null;
        W.incidents.executeCrime(c);
        break;
      }
      case 'metro': case 'bus': case 'taxi': {
        if (!W.transit) { done(); return; }
        W.transit.ride(c, leg, done);
        break;
      }
      default: done();
    }
  }

  abortDrive(c, v) {
    // can't route: get out and walk
    const W = this.world;
    const trip = c.trip;
    if (!trip) return;
    const idx = trip.legs.findIndex((l, i) => i > trip.li && l.k === 'carout');
    if (v.state === 'lane' || v.state === 'merging') { const sl = W.traffic.findSlotNear(v.x, v.z, [], 200); if (sl) W.traffic.parkAtSlot(v, sl.id); }
    if (idx >= 0) { trip.li = idx - 1; this.nextLeg(c); }
  }

  carSidePoint(v) {
    if (v.state === 'parked' || v.state === 'merging') return [v.x - Math.cos(v.h) * 1.7, v.z + Math.sin(v.h) * 1.7];
    if (v.state === 'garage') { const b = this.world.city.buildings[v.garage]; return this.doorOut(b); }
    return [v.x - Math.cos(v.h) * 1.6, v.z + Math.sin(v.h) * 1.6];
  }

  nearestGarage(x, z) {
    const W = this.world;
    let best = null, bd = Infinity;
    for (const id of W.city.special.garage || []) { const b = W.city.buildings[id]; const d = dist(b.x, b.z, x, z); if (d < bd) { bd = d; best = id; } }
    return best;
  }

  unstick(c) {
    // a traveler made no progress for a long time (blocked path, gridlock): resolve abstractly
    const W = this.world;
    if (c.possessed || c.duty) return;
    if (c.veh != null) {
      const v = W.traffic.byId.get(c.veh);
      if (v && (v.state === 'lane' || v.state === 'free') && v.speed > 0.5) { c.trip.lmt = W.time; return; }
    }
    if (c.ped && c.ped.state === 'walk' && c.ped.v > 0.1) { c.trip.lmt = W.time; return; }
    this.toAbstract(c, 20);
  }

  // re-plan from wherever the citizen is now (after possession, accidents, chases)
  resume(c) {
    if (c.possessed || c.status !== 'ok' || c.duty) return;
    c.trip = null;
    if (c.ped) { c.ped.action = ''; c.ped.run = false; }
    const g = c.goal;
    if (g && g.type !== 'crime' && (g.b != null || g.point)) { this.go(c, g.b ?? null, g.type, { ...g }); return; }
    if (c.homeless) { this.goPark(c); return; }
    this.go(c, c.home, 'home');
  }

  // ---------------------------------------------------- abstract travel (hyper speed / off-camera recovery)
  toAbstract(c, minMinutes = 0) {
    const W = this.world;
    const trip = c.trip;
    if (!trip) return;
    const [tx, tz] = trip.point;
    let fx = trip.from[0], fz = trip.from[1];
    if (c.ped) { fx = c.ped.x; fz = c.ped.z; W.peds.despawn(c.ped); }
    if (c.at != null) { W.city.buildings[c.at].occupants.delete(c.id); c.at = null; c.working = false; }
    const d = dist(fx, fz, tx, tz);
    let mins;
    const v = c.veh != null ? W.traffic.byId.get(c.veh) : (trip.mode === 'drive' && c.vehicle != null ? W.traffic.byId.get(c.vehicle) : null);
    if (trip.mode === 'drive' && v) {
      mins = physMin((d * 1.35) / 9) + 4;
      W.traffic.detach(v);
      if (v.slot != null) { W.city.net.slots[v.slot].car = null; v.slot = null; }
      v.garage = null;
      v.state = 'abstract'; v.driver = c.id; c.veh = v.id;
      v.abs = { fx, fz, tx, tz, t0: W.time, t1: W.time + mins };
    } else if (trip.mode === 'metro' || trip.mode === 'bus' || trip.mode === 'taxi') mins = physMin((d * 1.3) / 7) + 6;
    else mins = physMin((d * 1.3) / 1.35);
    c.state = 'abstract';
    c.eta = W.time + Math.max(mins, minMinutes);
    trip.abstract = true;
  }

  finishAbstract(c) {
    const W = this.world;
    const trip = c.trip;
    c.trip = null;
    if (c.veh != null) {
      const v = W.traffic.byId.get(c.veh);
      if (v) {
        v.driver = null; v.abs = null;
        const db = trip && trip.dest != null ? W.city.buildings[trip.dest] : null;
        const [tx, tz] = trip ? trip.point : [v.x, v.z];
        const sl = W.traffic.findSlotNear(tx, tz, db ? [db.laneNear, db.laneFar] : [], 300);
        if (sl) W.traffic.parkAtSlot(v, sl.id);
        else { const g = this.nearestGarage(tx, tz); W.traffic.parkInGarage(v, g); }
      }
      c.veh = null;
    }
    if (trip && trip.dest != null) {
      this.placeInside(c, trip.dest);
      this.arriveGoal(c);
    } else {
      // park visit etc: become present outdoors if not abstract anymore
      if (!W.abstract && trip) {
        W.peds.spawn(c, trip.point[0], trip.point[1]);
        c.state = 'walking';
        c.activity = c.goal?.type || 'park';
        W.parkLife && W.parkLife.loiter(c);
      } else {
        // abstract loiter: count as park visit and head home later
        c.needs.fun = clamp(c.needs.fun + 0.3, 0, 1);
        c.state = 'inside'; c.at = null;
        this.go(c, c.homeless ? (W.city.special.metro || [0])[0] : c.home, 'home');
      }
    }
  }

  // When leaving hyper speed, finish nearly-done trips immediately.
  settleAbstract() {
    const W = this.world;
    for (const c of W.citizens) if (c.state === 'abstract' && !c.possessed && c.eta - W.time < 40) this.finishAbstract(c);
  }

  // ---------------------------------------------------- hospital / jail
  release(c) {
    const W = this.world;
    const where = c.status;
    c.status = 'ok';
    c.injured = 0;
    if (where === 'hospital') { c.health = 1; W.history.citizenLog(c, 'Released from the hospital', false); }
    if (where === 'jail') { c.record.wanted = 0; W.history.citizenLog(c, 'Released from jail', true); c.stress = 0.5; }
    c.nextThink = W.time;
    c.activity = 'idle';
    c.until = 0;
    if (c.at == null) this.placeInside(c, where === 'hospital' ? (W.city.special.hospital || [c.home])[0] : (W.city.special.police || [c.home])[0]);
    this.think(c);
  }

  // ---------------------------------------------------- daily life events
  daily() {
    const W = this.world;
    const day = W.day;
    for (const c of W.citizens) {
      if (c.status === 'dead' || c.status === 'left') continue;
      // birthdays
      if (day % C.YEAR_DAYS === c.bday && !c.flags.ageless) {
        c.age++;
        if (c.bookmarked) W.history.citizenLog(c, `Turned ${c.age}`, false);
        W.emit('birthday', { c });
      }
      // you (Life mode) and children make their own money decisions
      if (c.isPlayer || c.age < 18) continue;
      // rent & bills
      const hb = W.city.buildings[c.home];
      if (!c.homeless && hb) {
        const rent = (hb.rent || 25) * (hb.kind === 'house' ? 1.3 : 1) / Math.max(1, hb.residents.length > 1 && hb.kind === 'house' ? 2 : 1);
        c.money -= rent;
        c.money -= 8; // food & bills
      }
      if (c.age >= 66 && !c.job) c.money += 70; // pension
      if (!c.job && c.age < 66) c.money += 25; // benefits
      if (c.money < -800 && !c.homeless) this.evict(c);
      else if (c.money > 15000 && hb && hb.rent < 40 && rand.chance(0.04)) this.moveUp(c);
      c.earnedToday = 0;
      // retirement
      if (c.job && c.age >= 67 && rand.chance(0.2)) { this.quitJob(c, '', true); W.history.citizenLog(c, 'Retired', true); }
      // natural death (rare), replaced by newcomers
      if (c.age > 78 && rand.chance((c.age - 76) * 0.0006)) this.die(c, 'natural causes');
      // career ambitions: switch job occasionally
      if (c.job && rand.chance(0.003 * c.traits.ambition)) {
        const j = this.findJobFor(c);
        if (j && j.wage > c.job.wage * 1.1) { const from = W.economy.biz[c.job.biz].name; this.quitJob(c, '', true); this.hire(c, j); W.history.citizenLog(c, `Left ${from} for a better job`, false); }
      }
      // entrepreneurs
      if (c.money > 9000 && c.ownedBiz == null && c.traits.ambition > 0.6 && rand.chance(0.02 * W.economy.multiplier)) W.evolution && W.evolution.tryFound(c);
      // breakups
      const pr = this.partner(c);
      if (pr && pr.id > c.id && rand.chance(0.004)) {
        c.rel[pr.id].t = 'ex'; pr.rel[c.id].t = 'ex'; c.rel[pr.id].a = -0.2; pr.rel[c.id].a = -0.2;
        W.history.citizenLog(c, `Broke up with ${pr.name}`, true);
        W.history.citizenLog(pr, `Broke up with ${c.name}`, true);
        if (pr.home === c.home) this.moveOut(pr);
      } else if (pr && pr.id > c.id && pr.home !== c.home && rand.chance(0.03) && !c.homeless) {
        this.moveIn(pr, c);
      }
      // buy a car
      if (c.vehicle == null && c.money > 7000 && rand.chance(0.03)) {
        const v = W.addCitizenCar(c, rand.pick(['sedan', 'hatch', 'suv', 'pickup']), rand);
        if (v) { c.money -= 5000; W.history.citizenLog(c, `Bought a ${v.T.label}`, false); }
      }
    }
  }

  evict(c) {
    const W = this.world;
    const old = this.homeName(c);
    // move to the cheapest vacancy, else homeless
    const cheap = W.findVacancy((b) => b.rent <= 22);
    this.leaveHome(c);
    if (cheap != null) {
      this.setHome(c, cheap);
      W.history.citizenLog(c, `Evicted from ${old}; moved to ${this.buildingName(cheap)}`, true);
      c.money = Math.max(c.money, -200);
    } else {
      c.homeless = true;
      W.history.citizenLog(c, `Evicted from ${old} — now homeless`, true);
    }
    c.stress = 0.8;
  }
  moveUp(c) {
    const W = this.world;
    const b = W.findVacancy((bb) => bb.rent >= 45);
    if (b == null) return;
    const old = this.homeName(c);
    this.leaveHome(c);
    this.setHome(c, b);
    W.history.citizenLog(c, `Moved from ${old} to ${this.buildingName(b)}`, true);
  }
  moveOut(c) {
    const W = this.world;
    const b = W.findVacancy(() => true);
    if (b == null) return;
    this.leaveHome(c);
    this.setHome(c, b);
    W.history.citizenLog(c, `Moved out to ${this.buildingName(b)}`, false);
  }
  moveIn(a, b) {
    const W = this.world;
    this.leaveHome(a);
    this.setHome(a, b.home);
    W.history.citizenLog(a, `Moved in with ${b.name}`, true);
    W.history.citizenLog(b, `${a.first} moved in`, false);
  }
  leaveHome(c) {
    const W = this.world;
    const hb = W.city.buildings[c.home];
    if (hb) { const i = hb.residents.indexOf(c.id); if (i >= 0) hb.residents.splice(i, 1); }
    c.moves++;
  }
  setHome(c, bid) {
    const W = this.world;
    c.home = bid; c.homeless = false;
    W.city.buildings[bid].residents.push(c.id);
    // move the car closer eventually: handled when they next drive
  }

  die(c, cause) {
    const W = this.world;
    W.history.citizenLog(c, `Passed away (${cause}) at ${c.age}`, true);
    if (c.bookmarked || cause !== 'natural causes') W.history.cityEvent(`${c.name} passed away (${cause})`, { type: 'death', who: c.id, minor: cause === 'natural causes' });
    c.status = 'dead';
    W.history.counters.deaths++;
    c.deathCause = cause;
    c.diedDay = W.day;
    if (c.ped) W.peds.despawn(c.ped);
    if (c.at != null) W.city.buildings[c.at]?.occupants.delete(c.id);
    c.at = null;
    if (c.job) this.quitJob(c, '', true);
    this.leaveHome(c);
    for (const id in c.rel) {
      const o = W.citizens[id];
      if (o && (c.rel[id].t === 'partner' || c.rel[id].t === 'family' || c.rel[id].a > 0.7)) { W.history.citizenLog(o, `Mourned ${c.name}`, true); o.stress = 0.9; }
    }
    if (c.vehicle != null) { const v = W.traffic.byId.get(c.vehicle); if (v && v.state !== 'lane') W.traffic.remove(v); c.vehicle = null; }
  }

  // A new resident arrives in the city
  immigrate(rng = rand) {
    const W = this.world;
    const home = W.findVacancy(() => true);
    if (home == null) return null;
    const c = newCitizen(rng, { id: W.citizens.length, age: rng.int(20, 45) });
    W.citizens.push(c);
    this.setHome(c, home);
    c.money = rng.int(1500, 6000);
    c.lastNeedT = W.time;
    this.placeInside(c, home);
    c.nextThink = W.time + 10;
    if (rng.chance(0.45)) W.addCitizenCar(c, rng.pick(['sedan', 'hatch', 'oldsedan', 'suv']), rng);
    W.history.citizenLog(c, `Moved to the city, into ${this.buildingName(home)}`, true);
    return c;
  }

  describe(c) {
    const W = this.world;
    if (c.status === 'dead') return 'Deceased';
    if (c.status === 'left') return 'Moved away';
    if (c.status === 'hospital') return 'In the hospital';
    if (c.status === 'jail') return 'In jail';
    if (c.possessed) return 'Controlled by you';
    if (c.duty) return W.services.dutyLabel(c);
    if (c.goal && c.state !== 'inside') return c.goal.label;
    if (c.state === 'driving') return 'Driving';
    if (c.state === 'passenger') return 'Riding along';
    if (c.state === 'walking') return c.activity === 'park' ? 'Relaxing in the park' : 'Out walking';
    if (c.state === 'scene') return c.ped && c.ped.action === 'down' ? 'Lying injured' : c.ped && c.ped.action === 'watch' ? 'Watching the scene' : 'Waiting at a scene';
    const where = c.at != null ? this.buildingName(c.at) : 'outside';
    switch (c.activity) {
      case 'sleep': return `Sleeping at ${c.at === c.home ? 'home' : where}`;
      case 'work': return `Working at ${where}`;
      case 'eat': return `Eating at ${where}`;
      case 'drink': return `Having drinks at ${where}`;
      case 'meet': return `Hanging out at ${where}`;
      case 'shop': return `Shopping at ${where}`;
      case 'visit': return `Visiting a friend`;
      case 'cook': return 'Cooking at home';
      case 'park': return 'Relaxing in the park';
      case 'gym': return `Working out at ${where}`;
      case 'drift': return 'Wandering';
      default: return c.at === c.home ? 'At home' : `At ${where}`;
    }
  }
}

// schedule a callback after `sec` of physical time
export function setTimeoutGame(W, sec, fn) { W.timers.push({ t: W.physT + sec, fn }); }
