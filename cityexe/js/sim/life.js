// Life mode: you are one person in the city, born into a real family who live
// here. Everything else keeps simulating around you. This module owns your life:
// family, bills, loans, job performance, promotions and firings, stats drifting
// with how you live, relationships fading if you ignore people, partners,
// marriage, pregnancy and children, ageing, BitLife-style life events with
// choices, your parents growing old, inheritance, death and continuing as your heir.
import { newCitizen } from './citizens.js';
import { ensureLife, stat } from './lifeState.js';
import { BTYPES, ROLE_TITLE } from './economy.js';
import { clamp } from '../core/math.js';
import { rand } from '../core/rng.js';
import { C } from './config.js';
import { formOf } from '../core/names.js';

export const BACKGROUNDS = {
  poor: { label: 'Struggling', desc: 'A cramped apartment in Old Town or the Ironworks. Every dollar counts.', cash: 120, bank: 0, districts: ['O', 'I', 'H'], house: false, parentMoney: [100, 900] },
  working: { label: 'Working class', desc: 'Your parents work hard for a modest apartment.', cash: 400, bank: 300, districts: ['O', 'W', 'C', 'H'], house: false, parentMoney: [600, 3000] },
  middle: { label: 'Middle class', desc: 'A house in the suburbs, a car in the driveway.', cash: 900, bank: 2500, districts: ['SW', 'SE'], house: true, parentMoney: [3000, 9000], car: 'hatch' },
  rural: { label: 'Country kid', desc: 'A homestead out in Pinewood Hollow, past the city limits. Pines, chores, a long drive to anything.', cash: 300, bank: 800, districts: [], county: true, house: false, parentMoney: [800, 4000], car: 'pickup' },
  rich: { label: 'Wealthy', desc: 'Maple Heights. Private tutors. A trust fund.', cash: 2500, bank: 25000, districts: ['SE'], house: true, parentMoney: [20000, 60000], car: 'suv' },
};
export const START_TRAITS = {
  ambitious: { label: 'Ambitious', fx: (c, L) => { c.traits.ambition = 0.9; L.stats.smarts += 5; } },
  charming: { label: 'Charming', fx: (c, L) => { c.traits.social = 0.9; L.skills.charisma += 25; L.stats.looks += 8; } },
  athletic: { label: 'Athletic', fx: (c, L) => { L.stats.fitness += 25; L.stats.health += 8; L.skills.fitness += 20; } },
  brainy: { label: 'Brainy', fx: (c, L) => { L.stats.smarts += 22; c.traits.curiosity = 0.9; } },
  streetwise: { label: 'Streetwise', fx: (c, L) => { L.skills.stealth += 25; L.skills.combat += 15; L.stats.karma -= 15; c.traits.honesty = 0.35; } },
  kind: { label: 'Kind-hearted', fx: (c, L) => { L.stats.karma += 20; c.traits.honesty = 0.95; } },
  creative: { label: 'Creative', fx: (c, L) => { L.skills.music += 25; c.traits.curiosity = 0.85; L.stats.happy += 5; } },
  party: { label: 'Party animal', fx: (c, L) => { c.traits.social = 0.95; c.traits.caution = 0.15; L.addictions.alcohol = 10; L.stats.happy += 6; } },
  frugal: { label: 'Frugal', fx: (c) => { c.traits.thrift = 0.95; } },
};

export class LifeSim {
  constructor(W) {
    this.W = W;
    this.pid = null;
    this.gen = 1;
    this.inbox = [];
    this.pending = [];   // life events waiting for a decision
    this.lastHour = -1;
    this.absentToday = false;
    this.dead = null;
    W.on('day', () => this.daily());
    W.on('hour', ({ hour }) => this.hourly(hour));
    W.on('birthday', ({ c }) => { if (c.id === this.pid) this.msg('🎂', `Happy birthday! You're ${c.age} today.`); else if (this.isFamily(c)) this.msg('🎂', `It's ${c.first}'s birthday — ${formOf(c) ? 'she' : 'he'} turned ${c.age}.`); });
    W.on('lottoDraw', (rec) => this.onDraw(rec));
  }
  get active() { return this.pid != null; }
  get player() { return this.pid != null ? this.W.citizens[this.pid] : null; }

  // ---------------------------------------------------------------- character creation
  createCharacter(spec) {
    const W = this.W;
    const B = BACKGROUNDS[spec.background] || BACKGROUNDS.working;
    const age = clamp(spec.age || 18, 18, 30);
    // find parents: a real household of the right kind, with two adults old enough
    const fits = (b) => b.state === 'ok' && (B.county ? b.civic === 'county' : B.districts.includes(b.code) && b.civic !== 'county' && (B.house ? b.kind === 'house' : b.kind !== 'house' && b.resUnits > 0));
    let parents = null, home = null;
    const cands = rand.shuffle(W.city.buildings.filter(fits));
    for (const b of cands) {
      const adults = b.residents.map((id) => W.citizens[id]).filter((o) => o && o.status === 'ok' && o.age >= age + 19 && o.age <= age + 40);
      for (const a of adults) {
        const pr = W.citizenAI.partner(a);
        if (pr && pr.home === a.home && pr.age >= age + 18) { parents = [a, pr]; home = b; break; }
      }
      if (parents) break;
    }
    if (!parents) {
      // nobody suitable: a single parent in a fitting home, or a couple that just moved in
      home = cands.find((b) => b.resUnits > b.residents.length) || cands[0] || W.city.buildings.find((b) => b.resUnits > 0);
      const mk = (form) => { const p = newCitizen(rand, { id: W.citizens.length, age: age + 22 + rand.int(0, 12), form }); p.look.form = form; W.citizens.push(p); W.citizenAI.setHome(p, home.id); p.unit = 0; W.citizenAI.placeInside(p, home.id); return p; };
      parents = [mk(0), mk(1)];
      parents[1].last = parents[0].last; parents[1].name = `${parents[1].first} ${parents[1].last}`;
      W.citizenAI.setRel(parents[0], parents[1], 0.85, 'partner');
    }
    const last = parents[0].last;
    const c = newCitizen(rand, { id: W.citizens.length, first: spec.first || undefined, last: spec.last || last, age, form: spec.form ?? (rand.chance(0.5) ? 1 : 0) });
    W.citizens.push(c);
    c.isPlayer = true;
    c.bookmarked = true;
    c.look.form = spec.form ?? c.look.form ?? 0;
    if (spec.skin) c.look.skin = spec.skin;
    if (spec.hair) c.look.hair = spec.hair;
    if (spec.hairStyle != null) c.look.hairStyle = spec.hairStyle;
    if (spec.outfit) c.look.outfit = spec.outfit;
    if (spec.shirt) c.look.shirt = spec.shirt;
    // skin tones of parents & child should agree
    for (const p of parents) if (spec.skin) p.look.skin = spec.skin;
    c.home = home.id; c.unit = parents[0].unit;
    home.residents.push(c.id);
    W.citizenAI.placeInside(c, home.id);
    c.parents = parents.map((p) => p.id);
    c.money = B.cash; c.bank = B.bank;
    for (const p of parents) {
      W.citizenAI.setRel(c, p, 0.75 + rand.float() * 0.2, 'family');
      p.kids = Array.from(new Set([...(p.kids || []), c.id]));
      p.money = Math.max(p.money, rand.range(...B.parentMoney));
      if (spec.background === 'rich') p.bank = (p.bank || 0) + rand.range(80000, 300000);
    }
    // siblings: real people who grew up with you
    const sibs = [];
    const nSib = rand.weighted([0, 1, 2], (n) => [0.3, 0.45, 0.25][n]);
    for (let i = 0; i < nSib; i++) {
      const sAge = clamp(age + rand.int(-8, 8), 8, parents[0].age - 19);
      const taken = new Set([c.first, ...parents.map((p) => p.first), ...sibs.map((x) => x.first)]);
      let s = newCitizen(rand, { id: W.citizens.length, last, age: sAge });
      for (let k = 0; k < 6 && taken.has(s.first); k++) s = newCitizen(rand, { id: W.citizens.length, last, age: sAge, form: s.look.form });
      s.look.skin = c.look.skin;
      W.citizens.push(s);
      s.parents = c.parents.slice();
      for (const p of parents) p.kids.push(s.id);
      if (sAge < 18 || rand.chance(0.4)) { W.citizenAI.setHome(s, home.id); s.unit = c.unit; W.citizenAI.placeInside(s, home.id); }
      else { const v = W.findVacancy(() => true); if (v != null) { W.citizenAI.setHome(s, v); W.citizenAI.placeInside(s, v); } else { W.citizenAI.setHome(s, home.id); W.citizenAI.placeInside(s, home.id); } }
      if (sAge >= 18) { const j = W.citizenAI.findJobFor(s); if (j && rand.chance(0.7)) W.citizenAI.hire(s, j, false, true); }
      s.money = sAge < 18 ? 40 : rand.range(200, 3000);
      W.citizenAI.setRel(c, s, 0.4 + rand.float() * 0.4, 'family');
      for (const p of parents) W.citizenAI.setRel(s, p, 0.7, 'family');
      sibs.push(s);
    }
    c.siblings = sibs.map((s) => s.id);
    for (const s of sibs) s.siblings = [c.id, ...sibs.filter((x) => x !== s).map((x) => x.id)];
    // life stats
    const L = ensureLife(c, W);
    L.stats = { health: 85, happy: 65, smarts: 45 + rand.int(-8, 8), looks: 45 + rand.int(-10, 10), fitness: 40 + rand.int(-8, 8), karma: 55 };
    L.edu = { level: 'highschool', degrees: ['High School Diploma'], enrolled: null, credits: 0, need: 0 };
    L.skills.driving = spec.background === 'poor' ? 10 : 35;
    L.license.driver = spec.background !== 'poor';
    if (spec.background === 'rich') { L.stats.looks += 6; L.stats.smarts += 6; }
    for (const t of spec.traits || []) START_TRAITS[t]?.fx(c, L);
    for (const k in L.stats) L.stats[k] = clamp(L.stats[k], 5, 100);
    c.health = L.stats.health / 85;
    L.withParents = true;
    L.groceries = 6;
    L.born = W.day - age * C.YEAR_DAYS;
    if (B.car) W.addCitizenCar(c, B.car, rand);
    W.history.citizenLog(c, `Moved back in with ${parents[0].first} and ${parents[1].first} at ${W.citizenAI.homeName(c)}`, true);
    this.pid = c.id;
    this.gen = spec.gen || 1;
    this.msg('🏠', `Welcome to the city, ${c.first}. You live with your parents ${parents[0].first} and ${parents[1].first}${sibs.length ? ` and ${sibs.map((s) => s.first).join(' & ')}` : ''}. Find a job on your computer, make friends, and live your life.`);
    return c;
  }

  // ---------------------------------------------------------------- messages & family
  msg(icon, text, from = null) {
    this.inbox.push({ t: this.W.time, icon, text, from, read: false });
    if (this.inbox.length > 80) this.inbox.shift();
    this.W.emit('lifeMsg', { icon, text, from });
  }
  isFamily(o) { const c = this.player; return c && o && (c.parents?.includes(o.id) || c.siblings?.includes(o.id) || c.kids?.includes(o.id) || (c.rel[o.id] && c.rel[o.id].t === 'partner')); }
  family() {
    const c = this.player, W = this.W;
    if (!c) return [];
    const out = [];
    const add = (id, role) => { const o = W.citizens[id]; if (o) out.push({ o, role }); };
    const f = (id) => W.citizens[id] && formOf(W.citizens[id]);
    (c.parents || []).forEach((id) => add(id, f(id) ? 'Mother' : 'Father'));
    (c.siblings || []).forEach((id) => add(id, f(id) ? 'Sister' : 'Brother'));
    const pr = W.citizenAI.partner(c);
    if (pr) out.push({ o: pr, role: c.life.married === pr.id ? (formOf(pr) ? 'Wife' : 'Husband') : 'Partner' });
    (c.kids || []).forEach((id) => add(id, f(id) ? 'Daughter' : 'Son'));
    return out;
  }

  // ---------------------------------------------------------------- hourly
  hourly(hour) {
    const c = this.player, W = this.W;
    if (!c || c.status === 'dead') return;
    const L = ensureLife(c, W);
    const N = c.needs;
    const awake = c.activity !== 'sleep';
    const warn = (k, icon, text) => { L.warned = L.warned || {}; if (awake && W.time - (L.warned[k] ?? -1e9) > 360) { L.warned[k] = W.time; this.msg(icon, text); } };
    if (N.hunger < 0.12) { stat(c, 'health', -0.6); stat(c, 'happy', -0.5); warn('food', '🍽', 'You\'re starving. Eat something.'); }
    if (N.energy < 0.08) { stat(c, 'happy', -0.4); warn('sleep', '😴', 'You\'re exhausted. Get some sleep.'); }
    if (N.fun < 0.15) stat(c, 'happy', -0.2);
    if (N.social < 0.1) stat(c, 'happy', -0.2);
    if ((L.hygiene ?? 1) < 0.2) stat(c, 'looks', -0.05);
    // work attendance
    if (c.job && W.citizenAI.inShift(c, W.minuteOfDay, 0)) {
      const into = (W.minuteOfDay - (c.job.shift[0] % 1440) + 1440) % 1440;
      if (!c.working && into >= 50 && into < 70 && c.status === 'ok' && !L.calledIn) { this.absentToday = true; this.msg('📞', `Your manager at ${W.economy.biz[c.job.biz].name}: "Where are you? Your shift started an hour ago."`); }
    }
    if (hour === 6 && c.job && c.job.days[W.day % 7]) this.msg('🗓', `You work today at ${W.economy.biz[c.job.biz].name}, ${fmtH(c.job.shift[0])}–${fmtH(c.job.shift[1])}.`);
    if (hour === 7 && L.edu.enrolled && W.day % 7 < 5) this.msg('🎓', 'You have lectures at Silver River College today (8:00–21:00).');
  }

  // ---------------------------------------------------------------- daily
  daily() {
    const c = this.player, W = this.W;
    if (!c) return;
    if (c.status === 'dead') return;
    const L = ensureLife(c, W);
    // housing costs
    const hb = W.city.buildings[c.home];
    const withParents = c.parents && c.parents.some((id) => W.citizens[id]?.home === c.home && W.citizens[id]?.status !== 'dead');
    L.withParents = !!withParents;
    if (!withParents && hb && !(L.owns || []).includes(c.home)) {
      const rent = Math.round((hb.rent || 25) * (hb.kind === 'house' ? 1.8 : 1.0) * (1 + (W.economy.multiplier - 1) * 0.5));
      const pr = W.citizenAI.partner(c);
      const share = pr && pr.home === c.home ? 0.5 : 1;
      this.pay(c, rent * share, 'rent');
    }
    if ((L.owns || []).length) this.pay(c, 6 * L.owns.length, 'property tax');
    this.pay(c, 6 + (c.vehicle != null ? 4 : 0), 'bills');
    // loans
    for (const l of L.loans) { const d = Math.min(l.daily, l.left); this.pay(c, d, `${l.kind} loan`); l.left -= d; }
    L.loans = L.loans.filter((l) => l.left > 0);
    // debt spiral
    if (c.money + (c.bank || 0) < -500) { L.debtDays = (L.debtDays || 0) + 1; if (L.debtDays === 3) this.msg('⚠', 'You\'re deep in debt. Collectors are calling. You could lose your home.'); if (L.debtDays >= 7 && !withParents) this.evictPlayer(c); } else L.debtDays = 0;
    // job performance, promotion, firing
    if (c.job) {
      const worked = c.job.days[(W.day + 6) % 7];
      if (worked && this.absentToday) { L.perf = clamp((L.perf ?? 55) - 14, 0, 100); L.strikes = (L.strikes || 0) + 1; this.msg('📉', `You missed your shift. Strike ${L.strikes} of 3.`); }
      else if (worked) { L.perf = clamp((L.perf ?? 55) + 1.5 + L.stats.smarts / 100 - (L.drunk > 0.3 ? 5 : 0), 0, 100); }
      if (L.strikes >= 3 || L.perf < 12) { const biz = W.economy.biz[c.job.biz]; W.citizenAI.loseJob(c, 'fired for poor attendance'); L.strikes = 0; L.perf = 50; this.msg('🔥', `You've been fired from ${biz.name}.`); stat(c, 'happy', -15); }
      else if (L.perf > 85 && W.day - (L.lastPromo ?? -99) > 12 && rand.chance(0.25)) {
        L.lastPromo = W.day; c.job.wage = Math.round(c.job.wage * 1.15 * 10) / 10; c.job.title = (c.job.title ? 'Lead ' : 'Senior ') + (ROLE_TITLE[c.job.role] || c.job.role); L.perf = 65;
        W.history.citizenLog(c, `Promoted to ${c.job.title} ($${c.job.wage}/h)`, true); this.msg('🏆', `You've been promoted to ${c.job.title}! New wage: $${c.job.wage}/h.`); stat(c, 'happy', 10);
      }
    }
    this.absentToday = false;
    L.calledIn = false;
    // stats drift with how you live
    const N = c.needs;
    const target = 30 + N.fun * 15 + N.social * 15 + (c.job ? 10 : -5) + Math.min(15, Math.log10(Math.max(10, c.money + (c.bank || 0))) * 3) + (W.citizenAI.partner(c) ? 8 : 0) - (L.debtDays ? 10 : 0);
    L.stats.happy = clamp(L.stats.happy + (target - L.stats.happy) * 0.15, 0, 100);
    const age = c.age;
    stat(c, 'fitness', -0.25 - (age > 40 ? 0.15 : 0));
    if (age > 45) stat(c, 'health', -0.1 * (age - 45) / 10);
    if (age > 35) stat(c, 'looks', -0.04);
    stat(c, 'health', (L.stats.fitness - 50) * 0.01 - (L.addictions.nicotine || 0) * 0.008 - Math.max(0, (L.addictions.alcohol || 0) - 30) * 0.01);
    for (const k in L.addictions) L.addictions[k] = Math.max(0, L.addictions[k] - 0.8);
    // relationships fade if you never see people (family slower)
    for (const id in c.rel) {
      const r = c.rel[id];
      if (r.t === 'acq') continue;
      const decay = r.t === 'family' ? 0.003 : r.t === 'partner' ? 0.006 : 0.008;
      if ((r.seen ?? -99) < W.day - 2) { r.a = clamp(r.a - decay, -1, 1); const o = W.citizens[id]; if (o && o.rel[c.id]) o.rel[c.id].a = clamp(o.rel[c.id].a - decay, -1, 1); }
      if (r.t === 'partner' && r.a < 0.25 && rand.chance(0.15)) { const o = W.citizens[id]; this.breakUp(c, o, `${o.first} broke up with you. "We never see each other anymore."`); }
    }
    // people who owe you money
    for (const id in c.rel) {
      const o = W.citizens[id];
      if (!o || !o.owes || o.owes.to !== c.id || W.day < o.owes.day) continue;
      if (o.owes.honest && o.money > o.owes.amt) { o.money -= o.owes.amt; c.money += o.owes.amt; this.msg('💸', `${o.first} paid you back $${o.owes.amt}.`); }
      else { W.citizenAI.addAff(c, o, -0.15); this.msg('💸', `${o.first} still hasn't paid back the $${o.owes.amt}. Doesn't look like they will.`); }
      o.owes = null;
    }
    // pregnancy
    if (L.pregnant) { L.pregnant.days--; if (L.pregnant.days <= 0) this.birth(c); else if (L.pregnant.days === 3) this.msg('🤰', 'The baby is due in a few days.'); }
    // family members' lives reach you
    for (const { o, role } of this.family()) {
      const ev = o.log.slice(-3).find((e) => e.major && W.time - e.t < 1440 && !e.told);
      if (ev) { ev.told = true; this.msg('👪', `Your ${role.toLowerCase()} ${o.first}: ${ev.text}.`); }
      if (o.status === 'dead' && !o.mourned) { o.mourned = true; this.onFamilyDeath(c, o, role); }
    }
    // a life event (about every other day)
    if (rand.chance(0.45) && this.pending.length < 3) { const ev = this.rollEvent(c); if (ev && !this.pending.some((p) => p.text === ev.text)) this.pending.push(ev); }
    // natural death risk late in life, or health collapse
    if (L.stats.health <= 0) this.die(c, 'health complications');
    else if (c.age > 80 && rand.chance((c.age - 78) * 0.004 * (1.3 - L.stats.health / 100))) this.die(c, 'old age');
  }

  pay(c, amt, what) {
    if (amt <= 0) return;
    if (c.money >= amt) c.money -= amt;
    else if ((c.bank || 0) >= amt - Math.max(0, c.money)) { c.bank -= amt - Math.max(0, c.money); c.money = Math.min(c.money, 0); }
    else c.money -= amt;
    void what;
  }

  evictPlayer(c) {
    const W = this.W;
    const old = W.citizenAI.homeName(c);
    W.citizenAI.leaveHome(c);
    const p = (c.parents || []).map((id) => W.citizens[id]).find((o) => o && o.status !== 'dead');
    if (p) { W.citizenAI.setHome(c, p.home); c.unit = p.unit; this.msg('📦', `Evicted from ${old}. You move back in with ${p.first}.`); }
    else { c.homeless = true; this.msg('📦', `Evicted from ${old}. You have nowhere to go.`); }
    W.history.citizenLog(c, `Evicted from ${old}`, true);
    stat(c, 'happy', -20);
  }

  // ---------------------------------------------------------------- relationships
  breakUp(c, o, text) {
    if (!o) return;
    c.rel[o.id].t = 'ex'; o.rel[c.id].t = 'ex'; c.rel[o.id].a = -0.1; o.rel[c.id].a = -0.1;
    if (c.life.married === o.id) { c.life.married = null; this.W.history.citizenLog(c, `Divorced ${o.name}`, true); }
    else this.W.history.citizenLog(c, `Broke up with ${o.name}`, true);
    if (o.home === c.home) this.W.citizenAI.moveOut(o);
    this.msg('💔', text);
    stat(c, 'happy', -12);
  }
  marry(c, o) {
    const W = this.W;
    c.life.married = o.id; o.married = c.id;
    W.history.citizenLog(c, `Married ${o.name}`, true);
    W.history.citizenLog(o, `Married ${c.name}`, true);
    W.history.cityEvent(`${c.name} and ${o.name} got married`, { type: 'life', who: c.id, minor: true });
    stat(c, 'happy', 20);
  }
  tryForBaby(c, o) {
    const L = c.life;
    if (L.pregnant || (o.pregnant)) return 'You\'re already expecting.';
    const fertile = Math.max(c.age, o.age) < 48 && (formOf(c) !== formOf(o));
    if (!fertile) return 'It doesn\'t happen. You could look into adoption.';
    if (rand.chance(0.45)) { L.pregnant = { days: 9, with: o.id, carrier: formOf(c) === 1 ? c.id : o.id }; this.msg('🍼', `${formOf(c) === 1 ? 'You\'re' : o.first + ' is'} pregnant! The baby is due in 9 days.`); return null; }
    return 'Not this time.';
  }
  adopt(c) {
    if (c.money + (c.bank || 0) < 15000) return 'Adoption fees are $15,000.';
    this.pay(c, 15000, 'adoption');
    this.birth(c, true);
    return null;
  }
  birth(c, adopted = false) {
    const W = this.W, L = c.life;
    const o = L.pregnant ? W.citizens[L.pregnant.with] : W.citizenAI.partner(c);
    L.pregnant = null;
    const kid = newCitizen(rand, { id: W.citizens.length, last: c.last, age: adopted ? rand.int(1, 6) : 0 });
    kid.look.skin = adopted ? kid.look.skin : (rand.chance(0.5) || !o ? c.look.skin : o.look.skin);
    kid.look.height = 1.0;
    W.citizens.push(kid);
    W.citizenAI.setHome(kid, c.home); kid.unit = c.unit; W.citizenAI.placeInside(kid, c.home);
    kid.parents = [c.id, ...(o ? [o.id] : [])];
    c.kids = [...(c.kids || []), kid.id];
    if (o) o.kids = [...(o.kids || []), kid.id];
    kid.money = 0; kid.bday = W.day % C.YEAR_DAYS;
    W.citizenAI.setRel(c, kid, 0.95, 'family');
    if (o) W.citizenAI.setRel(o, kid, 0.95, 'family');
    W.history.citizenLog(c, adopted ? `Adopted ${kid.first}` : `${formOf(kid) ? 'Daughter' : 'Son'} ${kid.first} was born`, true);
    this.msg('👶', adopted ? `You adopted ${kid.first} (${kid.age}).` : `${kid.first} ${kid.last} was born! A healthy ${formOf(kid) ? 'girl' : 'boy'}.`);
    stat(c, 'happy', 18);
  }
  onFamilyDeath(c, o, role) {
    const W = this.W;
    this.msg('🕯', `Your ${role.toLowerCase()} ${o.name} has died (${o.deathCause || 'natural causes'}).`);
    stat(c, 'happy', role === 'Mother' || role === 'Father' || role === 'Wife' || role === 'Husband' ? -30 : -18);
    // inheritance from parents: split among their living children
    if (role === 'Mother' || role === 'Father') {
      const estate = Math.max(0, (o.money || 0) + (o.bank || 0));
      const heirs = (o.kids || []).map((id) => W.citizens[id]).filter((k) => k && k.status !== 'dead');
      const pr = W.citizenAI.partner(o);
      const share = pr && pr.status !== 'dead' ? 0 : Math.round(estate / Math.max(1, heirs.length));
      if (share > 0) { c.bank = (c.bank || 0) + share; o.money = 0; o.bank = 0; this.msg('📜', `You inherit ${'$' + share.toLocaleString()} from ${o.first}'s estate.`); }
    }
  }

  // ---------------------------------------------------------------- death & legacy
  die(c, cause) {
    const W = this.W;
    if (c.status === 'dead') return;
    W.citizenAI.die(c, cause);
    this.dead = { id: c.id, cause, age: c.age, day: W.day };
    W.emit('playerDied', { c, cause });
  }
  heirs() {
    const c = this.player || (this.dead ? this.W.citizens[this.dead.id] : null);
    if (!c) return [];
    return (c.kids || []).map((id) => this.W.citizens[id]).filter((k) => k && k.status !== 'dead' && k.status !== 'left');
  }
  continueAs(k) {
    const W = this.W, prev = this.dead ? W.citizens[this.dead.id] : this.player;
    // the estate passes to the heir
    if (prev) { const estate = Math.max(0, prev.money) + Math.max(0, prev.bank || 0); const heirs = Math.max(1, (prev.kids || []).filter((id) => W.citizens[id]?.status !== 'dead').length); k.bank = (k.bank || 0) + Math.round(estate / heirs); prev.isPlayer = false; }
    k.isPlayer = true; k.bookmarked = true;
    ensureLife(k, W);
    this.pid = k.id; this.gen++; this.dead = null;
    this.msg('🕊', `You continue as ${k.name}, generation ${this.gen}.`);
    return k;
  }

  // ---------------------------------------------------------------- lottery
  onDraw(rec) {
    const c = this.player;
    if (!c) return;
    const mine = rec.winners.filter((w) => w.cid === c.id);
    if (mine.length) for (const w of mine) this.msg('🎉', w.m === 6 ? `YOU WON THE JACKPOT! $${w.prize.toLocaleString()} (after tax ${'$' + w.net.toLocaleString()} into your account).` : `Lotto: you matched ${w.m} numbers and won $${w.prize.toLocaleString()}!`);
    const others = rec.winners.filter((w) => w.m === 6 && w.cid !== c.id);
    if (others.length) this.msg('📰', `Someone in the city won the $${rec.jackpot.toLocaleString()} jackpot: ${this.W.citizens[others[0].cid].name}.`);
  }

  // ---------------------------------------------------------------- life events
  rollEvent(c) {
    const W = this.W, L = c.life;
    const friends = W.citizenAI.friends(c);
    const pool = [
      { w: 1, when: () => true, text: 'You find a wallet on the sidewalk with $180 inside and an ID.', choices: [['Keep the cash', () => { c.money += 180; stat(c, 'karma', -6); return 'You pocket the money.'; }], ['Return it', () => { stat(c, 'karma', 6); stat(c, 'happy', 2); return 'The owner is so grateful they hug you.'; }]] },
      { w: 1, when: () => friends.length > 0, text: () => `${this.ctx.f.first} asks to borrow $300 until next week.`, pre: () => { this.ctx = { f: rand.pick(friends) }; }, choices: [['Lend it', () => { const f = this.ctx.f; if (c.money < 300) return 'You don\'t have it.'; c.money -= 300; W.citizenAI.addAff(c, f, 0.12); f.owes = { to: c.id, amt: 300, day: W.day + 7, honest: rand.chance(0.4 + f.traits.honesty * 0.5) }; return `${f.first} promises to pay you back.`; }], ['Refuse', () => { W.citizenAI.addAff(c, this.ctx.f, -0.08); return `${this.ctx.f.first} seems hurt.`; }]] },
      { w: 1, when: () => !!c.job, text: 'Your manager offers you overtime this weekend (+$400).', choices: [['Take it', () => { c.money += 400; c.needs.energy = Math.max(0, c.needs.energy - 0.3); c.life.perf = Math.min(100, (c.life.perf || 50) + 6); stat(c, 'happy', -2); return 'Exhausting, but your boss noticed.'; }], ['Decline', () => 'You keep your weekend.']] },
      { w: 0.7, when: () => true, text: 'A stranger pitches you a "can\'t-lose" business opportunity. Buy in for $500?', choices: [['Invest $500', () => { if (c.money < 500) return 'You can\'t afford it.'; c.money -= 500; if (rand.chance(0.1)) { c.money += 2500; return 'It actually paid off — $2,500 back!'; } return 'It was a pyramid scheme. The money is gone.'; }], ['Walk away', () => { stat(c, 'smarts', 0.5); return 'Smart.'; }]] },
      { w: 0.6, when: () => c.vehicle != null, text: 'You got a parking ticket ($60).', choices: [['Pay it', () => { this.pay(c, 60, 'ticket'); return 'Paid.'; }], ['Ignore it', () => { L.fines = (L.fines || 0) + 150; return 'The fine grows to $150. Pay at a police station.'; }]] },
      { w: 0.8, when: () => true, text: 'You wake up with a sore throat and a fever.', choices: [['See a doctor ($80)', () => { this.pay(c, 80, 'doctor'); stat(c, 'health', 3); return 'Antibiotics. You\'ll be fine.'; }], ['Tough it out', () => { stat(c, 'health', rand.chance(0.7) ? -2 : -10); return rand.chance(0.7) ? 'You recover in a few days.' : 'It turns into pneumonia. Ouch.'; }]] },
      { w: 0.5, when: () => L.stats.looks > 72, text: 'A talent scout stops you on the street — a modelling gig, $900.', choices: [['Do it', () => { c.money += 900; L.fame = (L.fame || 0) + 2; stat(c, 'happy', 5); return 'You\'re on a billboard in Midtown!'; }], ['Not my thing', () => 'You pass.']] },
      { w: 0.6, when: () => !c.job && c.age < 60, text: () => `A recruiter from ${this.ctx.biz.name} messages you about an opening.`, pre: () => { const j = W.economy.openJobs()[rand.int(0, Math.max(0, W.economy.openJobs().length - 1))]; this.ctx = { j, biz: j ? W.economy.biz[j.biz] : { name: 'a local firm' } }; }, choices: [['Interview', () => { const j = this.ctx.j; if (!j || j.holder != null) return 'The position was filled.'; if (rand.chance(0.55 + L.stats.smarts / 300)) { W.citizenAI.hire(c, j); return `You got the job: ${ROLE_TITLE[j.role] || j.role} at ${this.ctx.biz.name}, $${Math.round(j.wage)}/h.`; } return 'They went with someone else.'; }], ['Ignore', () => 'You leave them on read.']] },
      { w: 0.5, when: () => (c.siblings || []).length > 0, text: () => `Your sibling ${this.ctx.s.first} wants to hang out this week.`, pre: () => { this.ctx = { s: W.citizens[rand.pick(c.siblings)] }; }, choices: [['Make time', () => { W.citizenAI.addAff(c, this.ctx.s, 0.15); c.rel[this.ctx.s.id] && (c.rel[this.ctx.s.id].seen = W.day); stat(c, 'happy', 4); return 'You catch up over burgers. It\'s good to see them.'; }], ['Too busy', () => { W.citizenAI.addAff(c, this.ctx.s, -0.08); return 'They say "sure, whatever."'; }]] },
      { w: 0.5, when: () => (c.parents || []).some((id) => W.citizens[id]?.status === 'ok'), text: () => `Your ${formOf(this.ctx.p) ? 'mom' : 'dad'} calls: "We never hear from you anymore."`, pre: () => { this.ctx = { p: W.citizens[rand.pick(c.parents.filter((id) => W.citizens[id]?.status === 'ok'))] }; }, choices: [['Call for an hour', () => { W.citizenAI.addAff(c, this.ctx.p, 0.12); c.rel[this.ctx.p.id] && (c.rel[this.ctx.p.id].seen = W.day); stat(c, 'happy', 3); return 'They tell you they\'re proud of you.'; }], ['"I\'m busy"', () => { W.citizenAI.addAff(c, this.ctx.p, -0.1); return 'Click.'; }]] },
      { w: 0.3, when: () => c.age >= 18 && (c.bank || 0) > 1500 && W.dark?.scamPlayer(), text: 'A polite caller from your bank\'s "fraud department" says your account is compromised. They need your PIN to "secure" it.', choices: [['Give them the PIN', () => { const amt = Math.round((c.bank || 0) * (0.3 + rand.float() * 0.4)); c.bank -= amt; W.history.citizenLog(c, `Lost $${amt} to a phone scam`, true); stat(c, 'happy', -10); return `Two hours later your account is $${amt} lighter. It was a scam. You report it, but the money is gone.`; }], ['Hang up and call the bank', () => { stat(c, 'smarts', 2); return 'The real bank confirms: scam. Nicely dodged.'; }]] },
      { w: 0.45, when: () => c.age < 40 && (L.stats.karma < 45 || c.money < 300), text: 'A guy from the Harbor crew says you could make "easy money" running packages.', choices: [['Hear him out', () => { L.gangContact = true; stat(c, 'karma', -4); return 'He gives you a number. (Your computer now shows the underground board.)'; }], ['No thanks', () => { stat(c, 'karma', 2); return 'He shrugs. "Offer stands."'; }]] },
      { w: 0.4, when: () => L.drunk > 0.4, text: 'You wake up with a brutal hangover and a vague memory of karaoke.', choices: [['Coffee & aspirin', () => { c.needs.energy = Math.min(1, c.needs.energy + 0.2); return 'You survive. Barely.'; }], ['Hair of the dog', () => { L.addictions.alcohol = (L.addictions.alcohol || 0) + 5; stat(c, 'health', -2); return 'That\'s a slippery slope.'; }]] },
      { w: 0.35, when: () => (L.addictions.gambling || 0) > 25, text: 'You can\'t stop thinking about the casino. One more night could turn it around…', choices: [['Seek help', () => { L.addictions.gambling = Math.max(0, L.addictions.gambling - 25); stat(c, 'happy', 2); return 'You join a support group.'; }], ['It\'s fine', () => { stat(c, 'happy', -3); return 'The itch stays.'; }]] },
      { w: 0.4, when: () => !!W.citizenAI.partner(c), text: () => `${W.citizenAI.partner(c).first} wants a romantic night out.`, choices: [['Fancy dinner ($120)', () => { const pr = W.citizenAI.partner(c); this.pay(c, 120, 'date'); W.citizenAI.addAff(c, pr, 0.15); c.rel[pr.id].seen = W.day; stat(c, 'happy', 6); return 'The best night you\'ve had in ages.'; }], ['Stay in', () => { const pr = W.citizenAI.partner(c); W.citizenAI.addAff(c, pr, 0.03); c.rel[pr.id].seen = W.day; return 'Takeout and a movie. Cozy.'; }]] },
      { w: 0.3, when: () => true, text: 'You\'re summoned for jury duty next week.', choices: [['Serve', () => { stat(c, 'karma', 4); stat(c, 'smarts', 1); return 'A fascinating trial. Justice served.'; }], ['Dodge it', () => { stat(c, 'karma', -4); L.fines = (L.fines || 0) + 200; return 'The court fines you $200.'; }]] },
    ];
    const ok = pool.filter((e) => { try { return e.when(); } catch (er) { return false; } });
    if (!ok.length) return null;
    let r = rand.float() * ok.reduce((a, e) => a + e.w, 0);
    let ev = ok[0];
    for (const e of ok) { if ((r -= e.w) < 0) { ev = e; break; } }
    if (ev.pre) ev.pre();
    const ctx = this.ctx;
    return { text: typeof ev.text === 'function' ? ev.text() : ev.text, choices: ev.choices.map(([l, fn]) => [l, () => { this.ctx = ctx; return fn(); }]) };
  }

  serialize() { return { pid: this.pid, gen: this.gen, inbox: this.inbox.slice(-40), dead: this.dead }; }
  deserialize(o) { if (!o) return; this.pid = o.pid; this.gen = o.gen || 1; this.inbox = o.inbox || []; this.dead = o.dead || null; if (this.pid != null && this.W.citizens[this.pid]) this.W.citizens[this.pid].isPlayer = true; }
}

const fmtH = (m) => { const h = Math.floor((m % 1440) / 60), mm = Math.round(m % 60); return `${h}:${String(mm).padStart(2, '0')}`; };
void BTYPES;
