// Businesses, jobs, wages, customers, money flow, bankruptcies and new ventures.
import { genBizName } from '../core/names.js';
import { RNG, rand } from '../core/rng.js';
import { clamp } from '../core/math.js';

const H = 60;
// role: [count, wage/hour]; open: [openHour, closeHour] (close may exceed 24)
export const BTYPES = {
  grocery: { label: 'Grocery', roles: { cashier: [1, 15], stocker: [1, 14] }, open: [7, 22], price: 68, need: 'groceries', color: '#4caf50', cap: 14, stock: true },
  convenience: { label: 'Convenience store', roles: { clerk: [1, 13] }, open: [0, 24], price: 15, need: 'snack', color: '#ff9800', cap: 6, stock: true, robbable: 1 },
  restaurant: { label: 'Restaurant', roles: { cook: [1, 16], server: [1, 13] }, open: [11, 23], price: 34, need: 'meal', color: '#e53935', cap: 20, stock: true },
  cafe: { label: 'Cafe', roles: { barista: [1, 13] }, open: [6, 19], price: 13, need: 'coffee', color: '#a1887f', cap: 10, stock: true },
  bar: { label: 'Bar', roles: { bartender: [1, 14] }, open: [17, 26], price: 26, need: 'drink', color: '#ab47bc', cap: 20, stock: true },
  clothing: { label: 'Clothing store', roles: { clerk: [1, 14] }, open: [10, 20], price: 55, need: 'goods', color: '#ec407a', cap: 8, stock: true },
  electronics: { label: 'Electronics', roles: { clerk: [1, 16] }, open: [10, 20], price: 140, need: 'goods', color: '#29b6f6', cap: 8, stock: true, robbable: 0.6 },
  pharmacy: { label: 'Pharmacy', roles: { pharmacist: [1, 26] }, open: [8, 21], price: 38, need: 'health', color: '#26a69a', cap: 8, stock: true, robbable: 0.7 },
  gym: { label: 'Gym', roles: { trainer: [1, 16] }, open: [6, 22], price: 14, need: 'fun', color: '#ffca28', cap: 18 },
  autoshop: { label: 'Auto repair', roles: { mechanic: [2, 21] }, open: [8, 18], price: 260, need: 'repair', color: '#78909c', cap: 6 },
  gas: { label: 'Gas station', roles: { attendant: [1, 13] }, open: [0, 24], price: 38, need: 'fuel', color: '#ef6c00', cap: 6, stock: true, robbable: 0.9 },
  hotel: { label: 'Hotel', roles: { receptionist: [1, 15], housekeeper: [1, 13] }, open: [0, 24], price: 0, color: '#c5a572', cap: 40, guests: true },
  office: { label: 'Office', roles: { clerk: [10, 23], analyst: [5, 30], manager: [1, 42] }, open: [9, 17], price: 0, color: '#90a4ae', cap: 80, office: true },
  factory: { label: 'Factory', roles: { worker: [9, 19] }, open: [7, 23], price: 0, color: '#8d6e63', cap: 40, industry: true },
  warehouse: { label: 'Warehouse', roles: { worker: [5, 17], driver: [2, 18] }, open: [6, 20], price: 0, color: '#795548', cap: 20, industry: true, depot: true },
  // civic
  police: { label: 'Police', roles: { officer: [6, 26] }, open: [0, 24], civic: true, color: '#2a5bd7', cap: 60, fleet: 'police' },
  fire: { label: 'Fire Department', roles: { firefighter: [6, 25] }, open: [0, 24], civic: true, color: '#e04a2a', cap: 40, fleet: 'firetruck' },
  hospital: { label: 'Hospital', roles: { doctor: [3, 55], nurse: [4, 28], paramedic: [4, 24] }, open: [0, 24], civic: true, color: '#e03a3a', cap: 120, fleet: 'ambulance' },
  busdepot: { label: 'Transit', roles: { 'bus driver': [4, 21] }, open: [5, 24], civic: true, color: '#3a7bd5', cap: 30, fleet: 'bus' },
  taxi: { label: 'Taxi company', roles: { 'taxi driver': [8, 17] }, open: [0, 24], color: '#e0b020', cap: 20, fleet: 'taxi', civic: true },
  towyard: { label: 'Towing', roles: { 'tow operator': [2, 20] }, open: [0, 24], civic: true, color: '#6a6a70', cap: 10, fleet: 'tow' },
  utility: { label: 'City Utilities', roles: { lineworker: [3, 27] }, open: [0, 24], civic: true, color: '#c8a030', cap: 20, fleet: 'utility' },
  construction: { label: 'Construction', roles: { builder: [6, 23] }, open: [7, 16], civic: true, color: '#d08a2a', cap: 30, fleet: 'construction' },
  cityhall: { label: 'City Hall', roles: { clerk: [4, 22], mayor: [1, 60] }, open: [9, 17], civic: true, color: '#c8b070', cap: 60, office: true },
  news: { label: 'Channel 6 News', roles: { reporter: [3, 26], pilot: [1, 34] }, open: [6, 24], civic: true, color: '#d03030', cap: 30 },
  mall: { label: 'Mall', roles: { 'retail clerk': [4, 14], 'security guard': [1, 17] }, open: [10, 21], price: 48, need: 'goods', color: '#d4a020', cap: 80, stock: true, mallShop: true },
  metro: { label: 'Metro', roles: { attendant: [1, 16] }, open: [5, 25], civic: true, color: '#2e5e9e', cap: 60 },
  powerplant: { label: 'Power Station', roles: { operator: [2, 30] }, open: [0, 24], civic: true, color: '#8a8a84', cap: 20 },
};
export const ROLE_TITLE = {
  officer: 'Police Officer', firefighter: 'Firefighter', paramedic: 'Paramedic', doctor: 'Doctor', nurse: 'Nurse', 'bus driver': 'Bus Driver',
  'taxi driver': 'Taxi Driver', 'tow operator': 'Tow Operator', lineworker: 'Lineworker', builder: 'Construction Worker', mayor: 'Mayor', reporter: 'Reporter',
  pilot: 'News Pilot', driver: 'Delivery Driver', mechanic: 'Mechanic', cashier: 'Cashier', stocker: 'Stocker', clerk: 'Clerk', cook: 'Cook', server: 'Server',
  barista: 'Barista', bartender: 'Bartender', pharmacist: 'Pharmacist', trainer: 'Trainer', attendant: 'Attendant', receptionist: 'Receptionist', housekeeper: 'Housekeeper',
  analyst: 'Analyst', manager: 'Manager', worker: 'Worker', 'retail clerk': 'Retail Clerk', 'security guard': 'Security Guard', operator: 'Plant Operator', owner: 'Owner',
};

// Shift patterns. 24h operations use three 8h shifts.
function shiftsFor(t, role) {
  const [o, c] = t.open;
  const span = c - o;
  if (span >= 24) return [[6, 14], [14, 22], [22, 30]];
  if (t.office) return [[9, 17]];
  if (span > 10) return [[o, o + Math.ceil(span / 2)], [o + Math.ceil(span / 2), c]];
  return [[o, c]];
}

let BIZID = 0;
export class Economy {
  constructor(world) {
    this.world = world;
    this.biz = [];
    this.jobs = [];
    this.multiplier = 1; // boom/crash
    this.trend = 0;
    this.treasury = 250000;
    this.stats = { unemployment: 0, gdp: 0 };
  }

  create(type, buildingId, opts = {}) {
    const t = BTYPES[type];
    const W = this.world;
    const b = W.city.buildings[buildingId];
    const rng = opts.rng || rand;
    const biz = {
      id: BIZID++, type, b: buildingId, owner: opts.owner ?? null, name: opts.name || (t.civic ? b.name : genBizName(rng, type, opts.ownerObj)),
      cash: opts.cash ?? (t.civic ? 0 : 2000 + rng.float() * 4000), stock: 1, rep: 0.5 + rng.float() * 0.3, priceF: 0.85 + rng.float() * 0.3,
      status: 'open', founded: opts.founded ?? W.day, revToday: 0, custToday: 0, history: [], losingDays: 0, color: t.color,
      jobs: [], robbedAt: -1e9, closedReason: '', lifetimeRev: 0, bestDay: 0,
    };
    if (b.civic && !b.signColor) b.signColor = t.color;
    this.biz.push(biz);
    b.bizId = biz.id;
    // job slots
    for (const role in t.roles) {
      let [count, wage] = t.roles[role];
      if (type === 'office') count = Math.max(1, Math.round(count * clamp((b.h * b.w) / 2400, 0.4, 2.2)));
      if (type === 'factory' || type === 'warehouse') count = Math.max(2, Math.round(count * clamp((b.w * b.d) / 1500, 0.5, 1.6)));
      if (opts.jobsScale) count = Math.max(1, Math.round(count * opts.jobsScale));
      const shifts = shiftsFor(t, role);
      for (const sh of shifts) {
        for (let k = 0; k < count; k++) {
          const job = { id: this.jobs.length, biz: biz.id, role, wage: wage * (0.9 + rng.float() * 0.25), shift: [sh[0] * H, sh[1] * H], days: workDays(t, this.jobs.length), holder: null };
          this.jobs.push(job);
          biz.jobs.push(job.id);
        }
      }
    }
    return biz;
  }

  isOpen(biz, minuteOfDay) {
    if (!biz || biz.status !== 'open') return false;
    const t = BTYPES[biz.type];
    const b = this.world.city.buildings[biz.b];
    if (b.state !== 'ok') return false;
    if (!b.powered && !t.civic) return false;
    const h = minuteOfDay / 60;
    const [o, c] = t.open;
    if (c - o >= 24) return true;
    return (h >= o && h < c) || (c > 24 && h < c - 24);
  }

  // A citizen visits a business as a customer. Returns amount spent.
  visit(biz, c) {
    const t = BTYPES[biz.type];
    if (!t.price) return 0;
    if (t.stock && biz.stock < 0.05) { biz.rep = Math.max(0, biz.rep - 0.01); return 0; }
    const staffed = biz.jobs.some((jid) => { const j = this.jobs[jid]; return j.holder != null && this.world.citizens[j.holder].at === biz.b; });
    if (!staffed && biz.owner == null) { biz.rep = Math.max(0, biz.rep - 0.005); return 0; }
    let amt = t.price * biz.priceF * (0.7 + rand.float() * 0.6) * this.multiplier;
    if (c.money < amt) amt = Math.max(0, c.money * 0.5);
    if (amt <= 0) return 0;
    c.money -= amt;
    biz.cash += amt;
    biz.revToday += amt;
    biz.custToday++;
    biz.lifetimeRev += amt;
    if (t.stock) biz.stock = Math.max(0, biz.stock - 0.012 - rand.float() * 0.01);
    biz.rep = clamp(biz.rep + (staffed ? 0.002 : -0.004), 0, 1);
    return amt;
  }

  // hourly: pay wages for workers present, rent, restock orders
  hourly() {
    const W = this.world;
    for (const biz of this.biz) {
      if (biz.status !== 'open') continue;
      const t = BTYPES[biz.type];
      for (const jid of biz.jobs) {
        const j = this.jobs[jid];
        if (j.holder == null) continue;
        const c = W.citizens[j.holder];
        if (c.working) {
          const pay = j.wage;
          c.money += pay * 0.85;
          c.earnedToday += pay * 0.85;
          this.treasury += pay * 0.15;
          if (t.civic) this.treasury -= pay; else biz.cash -= pay;
        }
      }
      if (t.stock && biz.stock < 0.35 && !biz.orderPending) {
        W.services && W.services.requestDelivery(biz);
      }
    }
  }

  // nightly accounting
  daily() {
    const W = this.world;
    let unemployed = 0, adults = 0;
    for (const c of W.citizens) {
      if (c.status === 'dead' || c.status === 'left') continue;
      if (c.age < 66) { adults++; if (!c.job) unemployed++; }
    }
    this.stats.unemployment = adults ? unemployed / adults : 0;
    this.multiplier += (1 + this.trend - this.multiplier) * 0.15;
    for (const biz of this.biz) {
      if (biz.status !== 'open') continue;
      const t = BTYPES[biz.type];
      const b = W.city.buildings[biz.b];
      if (t.civic) { biz.history.push(biz.custToday); biz.revToday = 0; biz.custToday = 0; continue; }
      // costs
      const rent = (b.rent || 25) * (biz.type === 'office' ? 3 : 1);
      let cost = rent;
      if (t.stock) cost += biz.revToday * 0.25;
      if (t.price && !t.mallShop) {
        // shoppers from out of town (the expressway brings regional visitors)
        const draw = { D: 1.6, W: 1.5, C: 1.2, O: 1.1, SE: 0.6, SW: 0.6, I: 0.3, H: 0.5 }[b.code] || 1;
        const visitors = Math.round(draw * (2 + rand.float() * 4) * this.multiplier * (0.5 + biz.rep));
        const amt = visitors * t.price * biz.priceF;
        biz.cash += amt; biz.revToday += amt; biz.lifetimeRev += amt; biz.custToday += visitors;
      }
      if (t.office || t.industry || t.guests) {
        // B2B revenue proportional to staffed hours (offices, factories sell elsewhere)
        const staffed = biz.jobs.filter((jid) => this.jobs[jid].holder != null).length;
        const rev = staffed * (t.office ? 300 : t.guests ? 280 : 230) * this.multiplier * (0.85 + rand.float() * 0.3);
        biz.cash += rev; biz.revToday += rev; biz.lifetimeRev += rev;
      }
      biz.cash -= cost;
      this.treasury += Math.max(0, biz.revToday * 0.05);
      const profit = biz.revToday - cost;
      biz.history.push(Math.round(biz.revToday));
      if (biz.history.length > 30) biz.history.shift();
      if (biz.revToday > biz.bestDay) biz.bestDay = biz.revToday;
      if (biz.cash < 0) biz.losingDays++; else biz.losingDays = Math.max(0, biz.losingDays - 1);
      // owner draws salary if doing well
      if (biz.owner != null && biz.cash > 6000) {
        const o = W.citizens[biz.owner];
        const draw = (biz.cash - 6000) * 0.3;
        biz.cash -= draw; o.money += draw;
      }
      // success / failure
      if (biz.cash > 30000 && !biz.thriving) { biz.thriving = true; W.history.cityEvent(`${biz.name} is booming`, { type: 'business', b: biz.b, minor: true }); }
      if (biz.losingDays >= 4 && biz.cash < -1500) this.bankrupt(biz, 'bankruptcy');
      biz.revToday = 0; biz.custToday = 0;
    }
  }

  bankrupt(biz, reason) {
    const W = this.world;
    biz.status = 'closed';
    biz.closedReason = reason;
    biz.closedDay = W.day;
    const b = W.city.buildings[biz.b];
    for (const jid of biz.jobs) {
      const j = this.jobs[jid];
      if (j.holder != null) W.citizenAI.loseJob(W.citizens[j.holder], reason === 'bankruptcy' ? `${biz.name} went bankrupt` : `${biz.name} closed (${reason})`);
    }
    if (biz.owner != null) {
      const o = W.citizens[biz.owner];
      W.history.citizenLog(o, `Business ${biz.name} ${reason === 'bankruptcy' ? 'went bankrupt' : 'closed'}`, true);
      o.ownedBiz = null;
      o.money = Math.max(o.money * 0.5, o.money + biz.cash);
    }
    b.bizId = null;
    b.vacantSince = W.day;
    W.history.cityEvent(`${biz.name} ${reason === 'bankruptcy' ? 'went out of business' : 'closed: ' + reason}`, { type: 'business', b: biz.b, x: b.x, z: b.z });
    W.emit('bizClosed', { biz });
  }

  // A citizen founds a business in a vacant building
  found(c, buildingId, type) {
    const W = this.world;
    const ownerObj = { first: c.first, last: c.last };
    const biz = this.create(type, buildingId, { owner: c.id, ownerObj, cash: Math.min(c.money * 0.7, 12000), rng: rand, jobsScale: 1 });
    c.money -= biz.cash;
    c.ownedBiz = biz.id;
    const b = W.city.buildings[buildingId];
    b.vacantSince = null;
    W.history.cityEvent(`${biz.name} opened in ${b.district}`, { type: 'business', b: buildingId, x: b.x, z: b.z, who: c.id });
    W.history.citizenLog(c, `Founded ${biz.name}`, true);
    // owner works there: become manager
    if (c.job) W.citizenAI.quitJob(c, `left to run ${biz.name}`);
    const firstJob = biz.jobs.map((j) => this.jobs[j]).find((j) => j.holder == null);
    if (firstJob) W.citizenAI.hire(c, firstJob, true);
    W.emit('bizOpened', { biz });
    return biz;
  }

  openJobs(filter) {
    const out = [];
    for (const j of this.jobs) {
      if (j.holder != null) continue;
      const biz = this.biz[j.biz];
      if (biz.status !== 'open') continue;
      if (filter && !filter(j, biz)) continue;
      out.push(j);
    }
    return out;
  }

  ofType(type) { return this.biz.filter((b) => b.type === type && b.status === 'open'); }
}

function workDays(t, seed) {
  // offices Mon-Fri; others work 5 days in a rotating pattern
  if (t.office) return [1, 1, 1, 1, 1, 0, 0];
  const off = seed % 7;
  const d = [1, 1, 1, 1, 1, 1, 1];
  d[off] = 0; d[(off + 3) % 7] = 0;
  return d;
}
