// Street life: the sidewalks are where the city happens. Food carts and
// newsstands draw little crowds, hustlers run three-card monte, famous people
// turn up and get mobbed for photos, gangs hold their corners at night, people
// struggling with addiction drift and beg, and busy businesses keep hiring.
import { rand, RNG } from '../core/rng.js';
import { dist, clamp } from '../core/math.js';
import { newCitizen } from './citizens.js';
import { ensureLife, stat } from './lifeState.js';

export const STAND_KINDS = {
  hotdog: { label: 'Hot dog cart', menu: [['Hot dog', 5, 0.45], ['Soda', 2, 0.1]] },
  tacos: { label: 'Taco truck', menu: [['Three tacos', 9, 0.6], ['Horchata', 3, 0.1]] },
  coffee: { label: 'Coffee cart', menu: [['Coffee', 3, 0.05], ['Bagel', 4, 0.3]] },
  flowers: { label: 'Flower stand', menu: [['Bouquet', 15, 0]] },
  news: { label: 'Newsstand', menu: [['Paper', 2, 0], ['Gum', 1, 0]] },
  monte: { label: 'Three-card monte', hustle: true },
  flyers: { label: 'Flyer guy', flyers: true },
};
const CELEB_TITLES = ['pop star', 'rapper', 'movie star', 'pro athlete', 'influencer', 'TV chef', 'supermodel', 'DJ'];
const CELEB_FIRST = ['Nova', 'Jax', 'Skye', 'Remy', 'Dante', 'Lux', 'Kai', 'Sienna', 'Zion', 'Vega', 'Marlo', 'Echo'];
const CELEB_LAST = ['Reyes', 'Monroe', 'Vale', 'Kingsley', 'Starr', 'Royale', 'Blaze', 'Sterling', 'Knox', 'Diamond'];
const HANG_ACTS = { crowd: ['talk', 'phone', '', 'talk'], fan: ['film', 'cheer', 'film'], gang: ['talk', 'watch', 'talk', ''], addict: ['stumble', 'beg', 'stumble', 'sit'] };

export class StreetLife {
  constructor(W) {
    this.W = W;
    this.stands = [];
    this.hang = new Map();   // cid -> { x, z, until, kind, act }
    this.celeb = null;       // { cid, title, until, b }
    this.addicts = [];
    this.corners = {};       // gang id -> [x, z]
    this.tick = 0;
    W.on('hour', ({ hour }) => this.hourly(hour));
    W.on('day', () => this.daily());
  }

  init() {
    const W = this.W;
    if (this.ready) return;
    this.ready = true;
    const rng = new RNG((W.seed || 1) + 7771);
    // stands on busy sidewalks in front of shops
    const shops = W.city.buildings.filter((b) => b.sw && b.shop && ['C', 'D', 'W', 'O', 'H'].includes(b.code));
    const kinds = Object.keys(STAND_KINDS);
    const used = [];
    for (const b of rng.shuffle(shops.slice())) {
      if (this.stands.length >= 46) break;
      const off = { N: [5, -1.4], S: [-5, 1.4], W: [-1.4, 5], E: [1.4, -5] }[b.front] || [0, 0];
      const x = b.sw[0] + (b.front === 'N' || b.front === 'S' ? off[0] : off[0]), z = b.sw[1] + (b.front === 'N' || b.front === 'S' ? off[1] : off[1]);
      if (used.some(([ux, uz]) => dist(ux, uz, x, z) < 70)) continue;
      used.push([x, z]);
      const kind = this.stands.length < 4 ? ['monte', 'flyers', 'monte', 'flyers'][this.stands.length] : kinds[rng.int(0, kinds.length - 3)];
      const h = { N: 0, S: Math.PI, W: -Math.PI / 2, E: Math.PI / 2 }[b.front] ?? 0;
      this.stands.push({ id: this.stands.length, kind, x, z, h, b: b.id, model: rng.int(0, W.citizens.length - 1), open: [kind === 'coffee' ? 6 : 10, kind === 'monte' ? 23 : 21] });
    }
  }
  isOpen(s) { const h = this.W.minuteOfDay / 60; return h >= s.open[0] && h < s.open[1]; }

  // ------------------------------------------------------------ hourly / daily
  hourly(hour) {
    const W = this.W;
    if (W.abstract) return;
    // gangs hold their corners after dark
    if (W.crime && (hour >= 20 || hour < 3)) {
      W.crime.ensure();
      for (const g of this.gangs()) {
        const corner = this.cornerOf(g);
        if (!corner) continue;
        const free = W.crime.members(g.id).filter((c) => this.free(c) && c.state === 'inside' && !c.working && !this.hang.has(c.id));
        const want = 3 + rand.int(0, 2) - this.countAt(corner, 'gang');
        for (const c of free.slice(0, Math.max(0, want))) this.sendTo(c, corner[0] + (rand.float() - 0.5) * 6, corner[1] + (rand.float() - 0.5) * 6, 'gang', 90 + rand.float() * 120, `Holding the ${g.name} corner`);
      }
      // rival crews roll up on each other's corners
      if (rand.chance(0.22)) this.gangShooting();
    }
    // people struggling with addiction drift between corners and parks
    if (hour >= 9 || hour < 3) {
      for (const c of this.addicts) {
        if (!this.free(c) || c.state !== 'inside' || this.hang.has(c.id) || !rand.chance(0.35)) continue;
        const s = rand.pick(this.stands);
        if (s) this.sendTo(c, s.x + (rand.float() - 0.5) * 16, s.z + (rand.float() - 0.5) * 16, 'addict', 120 + rand.float() * 180, 'Wandering the block');
      }
    }
    // a celebrity heads out on the town
    if (this.celeb && hour === this.celeb.outAt) this.celebOut();
  }
  daily() {
    const W = this.W;
    // who is struggling right now
    this.addicts = W.citizens.filter((c) => c.status === 'ok' && !c.isPlayer && c.age >= 18 && (c.homeless || !c.job) && c.traits.caution < 0.35 && (c.id % 17 === 3 || c.drugs));
    for (const c of this.addicts) {
      if (rand.chance(0.03)) {
        W.history.citizenLog(c, 'Overdosed and was rushed to hospital', true);
        W.incidents.injure(c, 0.85, 'an overdose');
        if (rand.chance(0.4)) W.history.cityEvent(`Overdose on the street — ${c.name} rushed to St. Aurelia`, { type: 'medical', minor: true });
      }
    }
    // business is booming: busy places hire more people (and put flyers up)
    let hired = 0;
    const want = Math.min(30, Math.max(6, 90 - W.economy.openJobs().length));
    for (const biz of rand.shuffle(W.economy.biz.filter((b) => b.status === 'open' && b.jobs.length && (b.cash || 0) > 800)).slice(0, want)) {
      const tmpl = W.economy.jobs[rand.pick(biz.jobs)];
      if (!tmpl || biz.jobs.length > 40) continue;
      const job = { ...tmpl, id: W.economy.jobs.length, holder: null, posted: W.time, days: tmpl.days ? tmpl.days.slice() : tmpl.days, shift: tmpl.shift.slice() };
      W.economy.jobs.push(job); biz.jobs.push(job.id);
      biz.hiring = W.day;
      hired++;
    }
    if (hired >= 4 && rand.chance(0.5)) W.history.cityEvent(`Hiring spree: ${hired} businesses posted new openings today`, { type: 'economy', minor: true });
    // celebrities pass through town now and then
    if (this.celeb && W.day > this.celeb.leaveDay) this.celebLeave();
    if (!this.celeb && rand.chance(0.45)) this.celebArrive();
    // con artists work the street too
    if (W.dark) for (const c of W.dark.roster) { const s = W.dark.st[c.id]; if (s && s.kind === 'con artist' && rand.chance(0.08)) W.dark.scam(c, s); }
  }

  // ------------------------------------------------------------ helpers
  gangs() { return this.W.crime ? (this.W.crime.gangsList || (this.W.crime.gangsList = ['kings', 'syndicate', 'saints'].map((id) => this.W.crime.gang(id)))) : []; }
  cornerOf(g) {
    if (this.corners[g.id]) return this.corners[g.id];
    const W = this.W;
    const blds = W.city.buildings.filter((b) => b.sw && g.turf.includes(b.code) && b.resUnits > 0);
    const b = blds[Math.floor(blds.length / 2)];
    return (this.corners[g.id] = b ? [b.sw[0], b.sw[1]] : null);
  }
  countAt(p, kind) { let n = 0; for (const h of this.hang.values()) if (h.kind === kind && dist(h.x, h.z, p[0], p[1]) < 20) n++; return n; }
  free(c) {
    const inc = c.flags.suspectOf ? this.W.incidents.get(c.flags.suspectOf) : null;
    return c.status === 'ok' && !c.possessed && c.duty == null && !c.flags.cuffed && !(inc && !inc.closed) && c.veh == null;
  }
  sendTo(c, x, z, kind, minutes, label) {
    const W = this.W;
    c.goal = { type: 'lurk', label, point: [x, z] };
    W.citizenAI.startTrip(c, null, [x, z]);
    this.hang.set(c.id, { x, z, until: W.time + minutes, kind, act: rand.pick(HANG_ACTS[kind] || ['']) });
  }
  // a walker steps aside to join a crowd (stand queue, celebrity mob)
  divert(c, x, z, kind, seconds) {
    const W = this.W, p = c.ped;
    if (!p || this.hang.has(c.id)) return;
    c.trip = null;
    W.peds.walkTo(p, x, z, null, { direct: dist(p.x, p.z, x, z) < 30, run: kind === 'fan' });
    this.hang.set(c.id, { x, z, until: W.time + seconds / 60 * 20, kind, act: rand.pick(HANG_ACTS[kind] || ['']), soft: true });
  }

  // ------------------------------------------------------------ gangs
  gangShooting() {
    const W = this.W;
    const gs = this.gangs().filter(Boolean);
    if (gs.length < 2) return;
    const [a, b] = rand.shuffle(gs.slice()).slice(0, 2);
    const corner = this.cornerOf(b);
    const shooter = W.crime.members(a.id).find((c) => c.status === 'ok' && !c.possessed);
    if (!corner || !shooter) return;
    const on = [...this.hang.entries()].filter(([, h]) => h.kind === 'gang' && dist(h.x, h.z, corner[0], corner[1]) < 20).map(([cid]) => W.citizens[cid]).filter((c) => c && c.ped && c.gang === b.id);
    if (!on.length) return;
    const v = rand.pick(on);
    // shots ring out from a passing car: real tracers, witnesses scatter, police respond
    const from = { x: v.ped.x + (rand.float() - 0.5) * 14, y: 1.2, z: v.ped.z + 9 };
    for (let i = 0; i < 4; i++) {
      const dx = v.ped.x - from.x + (rand.float() - 0.5) * 3, dz = v.ped.z - from.z + (rand.float() - 0.5) * 3, L = Math.hypot(dx, dz) || 1;
      setTimeout(() => W.combat.fire(shooter, 'pistol', from, { x: dx / L, y: -0.02, z: dz / L }), i * 180);
    }
    if (rand.chance(0.5)) W.combat.wound(v, 0.45 + rand.float() * 0.4, shooter, 'pistol');
    W.history.cityEvent(`Drive-by at the ${b.name} corner — ${a.name} suspected`, { type: 'crime', x: corner[0], z: corner[1] });
    // the crew on the corner shoots back or scatters
    for (const c of on) if (c !== v && c.ped) { if (rand.chance(0.4)) W.combat.fire(c, 'pistol', { x: c.ped.x, y: 1.4, z: c.ped.z }, { x: 0, y: 0, z: 1 }); this.hang.delete(c.id); W.peds.walkTo(c.ped, c.ped.x + (rand.float() - 0.5) * 60, c.ped.z - 40, () => W.citizenAI.resume(c), { run: true, direct: true }); }
  }

  // ------------------------------------------------------------ celebrities
  celebArrive() {
    const W = this.W;
    const hotel = W.economy.biz.find((b) => b.type === 'hotel');
    if (!hotel) return;
    const form = rand.chance(0.5) ? 1 : 0;
    const c = newCitizen(rand, { id: W.citizens.length, age: 22 + rand.int(0, 18), form });
    c.look.form = form;
    c.first = rand.pick(CELEB_FIRST); c.last = rand.pick(CELEB_LAST); c.name = `${c.first} ${c.last}`;
    c.look.shirt = rand.pick(['#e8d24a', '#d02a6a', '#f0f0f0', '#1a1a1a', '#7a2ad0']); c.look.outfit = rand.pick(['suit', 'hoodie', 'dress', 'tee']);
    if (c.look.outfit === 'dress' && !form) c.look.outfit = 'suit';
    c.money = 250000; c.celeb = rand.pick(CELEB_TITLES); c.visitor = true;
    W.citizens.push(c);
    W.citizenAI.setHome(c, hotel.b);
    W.citizenAI.placeInside(c, hotel.b);
    const venues = W.economy.biz.filter((b) => ['nightclub', 'casino', 'lounge', 'restaurant', 'mall'].includes(b.type) && b.status === 'open');
    const v = rand.pick(venues);
    this.celeb = { cid: c.id, title: c.celeb, leaveDay: W.day + 1 + rand.int(0, 1), outAt: v && ['nightclub', 'casino', 'lounge'].includes(v.type) ? 21 : 13, venue: v ? v.b : null };
    W.history.cityEvent(`${c.celeb[0].toUpperCase() + c.celeb.slice(1)} ${c.name} is in town, staying at ${hotel.name}`, { type: 'celebrity', who: c.id });
    if (W.life) W.life.msg('⭐', `OMG ${c.name} (the ${c.celeb}) is in the city! Fans say they're staying at ${hotel.name}.`);
  }
  celebOut() {
    const W = this.W, C = this.celeb, c = W.citizens[C.cid];
    if (!c || c.status !== 'ok' || C.venue == null) return;
    const vb = W.city.buildings[C.venue];
    W.citizenAI.go(c, C.venue, 'party');
    W.tasks && W.tasks.add({ key: 'celeb', icon: '⭐', label: `${c.name} is at ${W.citizenAI.buildingName(C.venue)}`, b: C.venue, until: W.time + 240 });
    W.history.cityEvent(`${c.name} spotted heading to ${W.citizenAI.buildingName(C.venue)} — fans gathering`, { type: 'celebrity', x: vb.x, z: vb.z, who: c.id });
  }
  celebLeave() {
    const W = this.W, c = W.citizens[this.celeb.cid];
    if (c && c.status === 'ok' && !c.possessed) {
      if (c.ped) W.peds.despawn(c.ped);
      if (c.at != null) W.city.buildings[c.at]?.occupants.delete(c.id);
      W.citizenAI.setHome && c.home != null && W.city.buildings[c.home]?.residents && (W.city.buildings[c.home].residents = W.city.buildings[c.home].residents.filter((id) => id !== c.id));
      c.status = 'left'; c.at = null;
    }
    this.celeb = null;
  }

  // ------------------------------------------------------------ per frame
  update(dt) {
    const W = this.W;
    if (!this.ready) this.init();
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = 0.5;
    // people standing around: keep them put and posed, then send them on their way
    for (const [cid, h] of this.hang) {
      const c = W.citizens[cid];
      if (!c || c.status !== 'ok' || c.possessed || c.duty != null) { this.hang.delete(cid); continue; }
      if (W.parkLife.list.has(cid)) { W.parkLife.list.delete(cid); if (c.ped) W.peds.stop(c.ped); }
      if (W.time > h.until) {
        this.hang.delete(cid);
        if (c.ped) c.ped.action = '';
        if (c.state === 'walking' && (!c.trip || h.soft)) W.citizenAI.resume(c);
        continue;
      }
      const p = c.ped;
      if (p && p.state === 'idle' && dist(p.x, p.z, h.x, h.z) < 5) {
        p.action = h.act;
        if (h.face) p.h = Math.atan2(h.face[0] - p.x, h.face[1] - p.z);
        else if (h.kind !== 'addict') { p.h = Math.atan2(h.x - p.x, h.z - p.z) + (cid % 2 ? 0.6 : -0.6); }
      }
    }
    if (W.abstract) return;
    // stands pull in passers-by
    for (const s of this.stands) {
      if (!this.isOpen(s) || rand.float() > 0.15) continue;
      if (this.countAt([s.x, s.z], 'crowd') >= (s.kind === 'monte' ? 5 : 4)) continue;
      for (const p of W.peds.near(s.x, s.z, 26)) {
        const c = W.citizens[p.cid];
        if (!c || p.player || !this.free(c) || p.state !== 'walk' || this.hang.has(c.id) || W.parkLife.list.has(c.id) || c.goal?.run) continue;
        if (rand.chance(0.5)) continue;
        const a = rand.float() * Math.PI * 2, r = 1.6 + rand.float() * 1.2;
        this.divert(c, s.x + Math.sin(s.h) * 1.2 + Math.cos(a) * r, s.z + Math.cos(s.h) * 1.2 + Math.sin(a) * r, 'crowd', 60 + rand.float() * 150);
        const h = this.hang.get(c.id);
        if (h) h.face = [s.x, s.z];
        if (s.kind === 'monte' && rand.chance(0.3)) { const lose = Math.min(c.money, 20 + rand.int(0, 60)); c.money -= lose; if (lose > 40) W.history.citizenLog(c, `Lost $${lose} at three-card monte`, false); }
        else if (STAND_KINDS[s.kind].menu) { const [, price] = rand.pick(STAND_KINDS[s.kind].menu); c.money = Math.max(0, c.money - price); c.needs.hunger = clamp(c.needs.hunger + 0.2, 0, 1); }
        break;
      }
    }
    // fans mob a celebrity on the street
    const C = this.celeb && W.citizens[this.celeb.cid];
    if (C && C.ped && C.status === 'ok') {
      const cp = C.ped;
      let fans = 0;
      for (const h of this.hang.values()) if (h.kind === 'fan') fans++;
      if (fans < 14) for (const p of W.peds.near(cp.x, cp.z, 40)) {
        const c = W.citizens[p.cid];
        if (!c || c === C || p.player || !this.free(c) || this.hang.has(c.id) || rand.chance(0.6)) continue;
        const a = rand.float() * Math.PI * 2;
        this.divert(c, cp.x + Math.cos(a) * 2.6, cp.z + Math.sin(a) * 2.6, 'fan', 90);
        const h = this.hang.get(c.id); if (h) h.face = [cp.x, cp.z];
        if (++fans >= 14) break;
      }
      // the mob follows them down the street
      for (const [cid, h] of this.hang) if (h.kind === 'fan' && dist(h.x, h.z, cp.x, cp.z) > 6) { const a = (cid * 2.4) % 6.28; h.x = cp.x + Math.cos(a) * 2.8; h.z = cp.z + Math.sin(a) * 2.8; h.face = [cp.x, cp.z]; const c = W.citizens[cid]; if (c.ped) W.peds.walkTo(c.ped, h.x, h.z, null, { direct: true, run: true }); }
    }
  }

  // ------------------------------------------------------------ the player on foot
  footPrompts(game, P, p) {
    const W = this.W, c = P.c, I = game.input;
    // stands
    for (const s of this.stands) {
      if (dist(s.x, s.z, p.x, p.z) > 3.2) continue;
      const K = STAND_KINDS[s.kind];
      if (!this.isOpen(s)) { P.prompts.push({ key: '', text: `${K.label} (closed)` }); return; }
      if (K.hustle) {
        P.prompts.push({ key: 'B', text: 'Three-card monte: bet $50 (find the queen)', danger: true });
        if (I.hit('KeyB')) {
          if (c.money < 50) { game.toast('"No cash, no game, friend."'); return; }
          const L = ensureLife(c, W);
          const win = rand.chance(0.12 + (L.skills?.charisma || 0) / 1000);
          c.money += win ? 50 : -50;
          game.toast(win ? 'You point. The queen! The dealer\'s smile tightens. +$50' : rand.pick(['Wrong card. You were SURE. -$50', 'The shill next to you wins. You lose. -$50', '"So close!" -$50']), 3);
        }
        return;
      }
      if (K.flyers) {
        P.prompts.push({ key: 'B', text: 'Take a flyer' });
        if (I.hit('KeyB')) {
          const open = W.economy.openJobs ? W.economy.openJobs().filter((j) => j.role !== 'mayor') : [];
          const j = rand.pick(open);
          game.toast(j ? `NOW HIRING: ${j.role} at ${W.economy.biz[j.biz].name}, $${Math.round(j.wage)}/h. Apply on JobLink.` : rand.pick(['PARTY TONIGHT at the club. Ladies free before 11.', 'GRAND OPENING this weekend — 50% off!', 'LOST DOG: answers to Biscuit. Reward.']), 5);
        }
        return;
      }
      const item = K.menu[0];
      P.prompts.push({ key: 'B', text: `${K.label}: ${item[0]} ($${item[1]})` });
      if (I.hit('KeyB')) {
        if (c.money < item[1]) { game.toast('Not enough cash.'); return; }
        c.money -= item[1];
        c.needs.hunger = clamp(c.needs.hunger + item[2], 0, 1);
        if (s.kind === 'flowers' && c.life) c.life.inv.gift = 'flowers';
        game.toast(s.kind === 'flowers' ? 'A bouquet. Someone\'s going to love these.' : `${item[0]}. Exactly what you needed.`, 2);
      }
      return;
    }
    // panhandlers and celebrities
    for (const o of W.peds.near(p.x, p.z, 2.6)) {
      const oc = W.citizens[o.cid];
      if (!oc || oc === c) continue;
      if (this.celeb && oc.id === this.celeb.cid) {
        P.prompts.push({ key: 'B', text: `Ask ${oc.name} for a selfie` });
        if (I.hit('KeyB')) {
          const L = ensureLife(c, W);
          if (rand.chance(0.55 + (L.skills?.charisma || 0) / 250)) { L.fame = (L.fame || 0) + 2; stat(c, 'happy', 6); game.toast(`${oc.first} grins and leans in. The selfie goes viral on FriendFace.`, 4); }
          else game.toast(`${oc.first}'s bodyguard steps between you. "No photos."`, 3);
        }
        return;
      }
      const h = this.hang.get(oc.id);
      if (h && h.kind === 'addict') {
        P.prompts.push({ key: 'B', text: `${oc.first} asks for spare change — give $5` });
        if (I.hit('KeyB') && c.money >= 5) { c.money -= 5; oc.money += 5; stat(c, 'karma', 1.5); game.toast(`${oc.first}: "God bless you. Seriously."`, 2.5); }
        return;
      }
    }
  }

  serialize() { return { celeb: this.celeb }; }
  deserialize(d) { this.celeb = d && d.celeb && this.W.citizens[d.celeb.cid] ? d.celeb : null; }
}
