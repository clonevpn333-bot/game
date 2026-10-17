// Organised crime. Three gangs hold turf, wear their colours and feud; their
// members are ordinary citizens with homes, families and jobs (or not). With
// the right contacts your computer opens an underground board: buy tools and
// illegal weapons, launder dirty cash, join a crew and run missions for them,
// or move "product" on the street at night — where undercover cops and rival
// crews are a real risk.
import { WEAPONS } from './combat.js';
import { GEAR } from './heists.js';
import { ensureLife } from './lifeState.js';
import { money, esc } from '../ui/panels.js';
import { rand } from '../core/rng.js';
import { dist } from '../core/math.js';
import { VTYPES } from './traffic.js';

export const GANGS = [
  { id: 'kings', name: 'Harbor Kings', color: '#6a2aa8', turf: ['H', 'W'], boss: null },
  { id: 'syndicate', name: 'Ironworks Syndicate', color: '#d8701e', turf: ['I'], boss: null },
  { id: 'saints', name: 'Old Town Saints', color: '#b81e2a', turf: ['O'], boss: null },
];
const RANKS = ['Associate', 'Soldier', 'Lieutenant', 'Captain'];

export class Crime {
  constructor(W) {
    this.W = W;
    this.mission = null;
    this.setup = false;
    W.on('day', () => this.daily());
    W.on('hour', ({ hour }) => this.hourly(hour));
  }
  gang(id) { return GANGS.find((g) => g.id === id); }

  // recruit members from the population (lazily, once)
  ensure() {
    if (this.setup) return;
    this.setup = true;
    const W = this.W;
    for (const g of GANGS) {
      const pool = W.citizens.filter((c) => c.status === 'ok' && !c.isPlayer && c.age >= 17 && c.age <= 42 && !c.gang && c.traits.honesty < 0.55 && g.turf.includes(W.city.buildings[c.home]?.code) && !(c.job && ['officer', 'mayor', 'doctor'].includes(c.job.role)));
      rand.shuffle(pool);
      const members = pool.slice(0, 10 + rand.int(0, 6));
      members.forEach((c, i) => { c.gang = g.id; c.gangRank = i === 0 ? 3 : i < 3 ? 2 : i < 7 ? 1 : 0; c.look.shirt = g.color; c.traits.caution = Math.min(c.traits.caution, 0.4); });
      if (members[0]) g.boss = members[0].id;
    }
  }
  members(gid) { return this.W.citizens.filter((c) => c.gang === gid && c.status !== 'dead' && c.status !== 'left'); }
  turfOf(code) { return GANGS.find((g) => g.turf.includes(code)); }

  // ------------------------------------------------------------ the world
  daily() {
    const W = this.W;
    if (!this.setup) this.ensure();
    // feuds: rival members clash now and then at night spots
    if (rand.chance(0.35)) {
      const [a, b] = rand.shuffle(GANGS.slice()).slice(0, 2);
      const ma = this.members(a.id).filter((c) => c.status === 'ok' && !c.possessed), mb = this.members(b.id).filter((c) => c.status === 'ok' && !c.possessed);
      if (ma.length && mb.length) {
        const x = rand.pick(ma), y = rand.pick(mb);
        const bld = W.city.buildings[x.at ?? x.home];
        if (bld) { W.incidents.fight(x, y, bld); W.history.cityEvent(`${a.name} and ${b.name} members brawl in ${bld.name || 'the street'}`, { type: 'crime', x: bld.x, z: bld.z, minor: true }); }
        if (rand.chance(0.12)) { W.combat.wound(y, 0.5, x, 'pistol'); W.history.cityEvent(`Shots fired as the ${a.name} and ${b.name} feud`, { type: 'crime', x: bld?.x, z: bld?.z }); }
      }
    }
    // gangs recruit to replace losses
    for (const g of GANGS) if (this.members(g.id).length < 8) { const c = W.citizens.find((o) => o.status === 'ok' && !o.gang && !o.isPlayer && o.age >= 18 && o.age < 30 && o.traits.honesty < 0.45 && !o.job); if (c) { c.gang = g.id; c.gangRank = 0; c.look.shirt = g.color; } }
    // mission expiry
    if (this.mission && W.day > this.mission.until) { const c = W.life?.player; if (c) { this.rep(c, -6); W.life.msg('📵', `${this.gang(c.gang)?.name || 'Your contact'}: "You blew the job. Don't make us regret you."`); } this.mission = null; }
  }
  hourly(hour) {
    const c = this.W.life?.player;
    if (!c || !this.mission) return;
    this.checkMission(c);
    void hour;
  }
  rep(c, d) {
    const L = ensureLife(c, this.W);
    L.gangRep = Math.max(0, (L.gangRep || 0) + d);
    const rank = Math.min(3, Math.floor(L.gangRep / 30));
    if (c.gang && rank > (c.gangRank || 0)) { c.gangRank = rank; this.W.life.msg('🕶', `You've been made a ${RANKS[rank]} of the ${this.gang(c.gang).name}.`); }
  }

  // ------------------------------------------------------------ missions
  offerMission(c) {
    const W = this.W, g = this.gang(c.gang);
    const rank = c.gangRank || 0;
    const types = ['delivery', 'collect', 'car', 'store'];
    const t = rand.pick(types.slice(0, 2 + Math.min(2, rank + 1)));
    const pay = Math.round((400 + rank * 450) * (0.8 + rand.float() * 0.6));
    if (t === 'delivery') {
      const dest = rand.pick(W.city.buildings.filter((b) => b.state === 'ok' && b.resUnits > 0 && b.kind !== 'house' && !g.turf.includes(b.code)));
      return { type: t, b: dest.id, pay, text: `Drop a package at ${W.citizenAI.buildingName(dest.id)}. No questions.`, until: W.day + 2 };
    }
    if (t === 'collect') {
      const debtor = rand.pick(W.citizens.filter((o) => o.status === 'ok' && !o.gang && o.age > 22 && o.money > 300 && !o.isPlayer && !o.duty));
      debtor.owesGang = { gang: g.id, amt: Math.round(300 + rand.float() * 1200) };
      return { type: t, cid: debtor.id, amt: debtor.owesGang.amt, pay: Math.round(pay * 0.6), text: `${debtor.name} owes us $${debtor.owesGang.amt}. Collect it (talk to them — persuade or scare them).`, until: W.day + 3 };
    }
    if (t === 'car') {
      const type = rand.pick(['sports', 'suv', 'sedan', 'pickup']);
      const yard = W.city.special.towyard?.[0] ?? rand.pick(W.city.buildings.filter((b) => b.kind === 'warehouse')).id;
      return { type: t, vtype: type, b: yard, pay: pay + (type === 'sports' ? 1200 : 300), text: `Bring us ${/^[aeiou]/i.test(VTYPES[type].label) || type === 'suv' ? 'an' : 'a'} ${VTYPES[type].label} to ${W.citizenAI.buildingName(yard)}. Any one will do.`, until: W.day + 2 };
    }
    const store = rand.pick(W.economy.biz.filter((b) => b.status === 'open' && ['convenience', 'gas', 'electronics', 'pharmacy'].includes(b.type)));
    return { type: 'store', biz: store.id, pay: Math.round(pay * 0.5), text: `Hit ${store.name}. Keep half of whatever's in the register.`, until: W.day + 2, since: W.time };
  }
  startMission(c, game) {
    const m = this.offerMission(c);
    this.mission = m;
    if (m.b != null || m.cid != null || m.biz != null) {
      const W = this.W;
      const b = m.b != null ? W.city.buildings[m.b] : m.biz != null ? W.city.buildings[W.economy.biz[m.biz].b] : null;
      if (b && W.tasks) W.tasks.add({ key: 'gang', icon: '🕶', label: m.type === 'delivery' ? 'Drop the package' : m.type === 'car' ? `Deliver a ${m.vtype}` : m.type === 'store' ? 'Hit the store' : 'Gang job', b: b.id, until: (m.until + 1) * 1440 });
      if (b) game.waypoint = { x: b.door[0], z: b.door[1], b: b.id, label: m.type === 'delivery' ? 'Drop the package' : m.type === 'car' ? 'Deliver the car' : 'The target' };
    }
    W_msg(this.W, '🕶', m.text);
    return m;
  }
  checkMission(c) {
    const W = this.W, m = this.mission;
    if (!m) return;
    let done = false;
    if (m.type === 'delivery' && c.at === m.b) done = true;
    if (m.type === 'car') {
      const v = c.veh != null ? W.traffic.byId.get(c.veh) : null;
      const b = W.city.buildings[m.b];
      if (v && v.type === m.vtype && v.owner !== c.id && dist(v.x, v.z, b.door[0], b.door[1]) < 30) { done = true; v.state === 'free' && (v.input = { brake: 1, handbrake: 1, throttle: 0, steer: 0 }); }
    }
    if (m.type === 'collect' && W.citizens[m.cid] && !W.citizens[m.cid].owesGang) done = true;
    if (m.type === 'store' && W.economy.biz[m.biz].robbedAt > m.since) done = true;
    if (done) {
      c.money += m.pay;
      ensureLife(c, W).dirty = (ensureLife(c, W).dirty || 0) + m.pay;
      this.rep(c, 10 + (c.gangRank || 0) * 2);
      W_msg(W, '💼', `Job done. ${money(m.pay)} in your pocket.`);
      W.history.citizenLog(c, `Did a job for the ${this.gang(c.gang)?.name}`, false);
      this.mission = null;
      W.tasks && W.tasks.remove('gang');
    }
  }

  // collecting a debt (called from the talk dialog)
  collect(c, o, scare) {
    const W = this.W;
    if (!o.owesGang) return null;
    const P = o.traits.caution;
    const pays = scare ? rand.chance(0.7) : rand.chance(0.25 + P * 0.3);
    if (pays) { const amt = Math.min(o.money, o.owesGang.amt); o.money -= amt; o.owesGang = null; W.history.citizenLog(o, `Paid off a debt to a gang`, true); if (scare) W.combat.crimeAgainst(o, c, 'threatened', W.citizenPos(o) || { x: 0, z: 0 }, 1); this.checkMission(c); return `${o.first} hands over $${amt}.`; }
    return scare ? `${o.first} calls your bluff.` : `${o.first}: "I don't have it. Tell them I need more time."`;
  }

  // ------------------------------------------------------------ dealing
  // near pedestrians at night with product on you: B to make a sale
  dealPrompt(game, P, p) {
    const W = this.W, c = P.c, L = ensureLife(c, W);
    if (!(L.inv.product > 0)) return;
    const h = W.minuteOfDay / 60;
    if (h > 4 && h < 20) return;
    let near = null, nd = 2.4;
    for (const o of W.peds.near(p.x, p.z, 3)) { if (o.cid === c.id || o.action === 'down') continue; const d = dist(o.x, o.z, p.x, p.z); if (d < nd) { nd = d; near = o; } }
    if (!near) return;
    const o = W.citizens[near.cid];
    if (!o || o.duty != null || o.age < 18) return;
    P.prompts.push({ key: 'B', text: `Offer product to ${o.first} (${L.inv.product} left)`, danger: true });
    if (!game.input.hit('KeyB')) return;
    near.h = Math.atan2(p.x - near.x, p.z - near.z);
    // undercover cops work the night spots
    if (rand.chance(0.05 + (W.combat.heat > 0 ? 0.05 : 0))) {
      game.toast(`${o.first} flashes a badge. "You're under arrest." Undercover cop!`, 5);
      L.inv.product = 0;
      W.combat.raiseHeat(2.5);
      const inc = W.incidents.create('wanted', { x: p.x, z: p.z, suspects: [c.id], priority: 2, needs: { police: 3 }, title: 'Drug bust' });
      c.flags.suspectOf = inc.id;
      return;
    }
    const want = o.traits.caution < 0.5 && (o.age < 45 || o.traits.social > 0.6) && rand.chance(0.45);
    if (!want) { game.toast(rand.pick([`${o.first}: "Get away from me."`, `${o.first} shakes their head and keeps walking.`, `${o.first}: "Not my thing."`]), 2.5); if (rand.chance(0.15)) W.combat.raiseHeat(0.5); return; }
    const n = Math.min(L.inv.product, 1 + rand.int(0, 2));
    const price = n * Math.round(45 + rand.float() * 30);
    if (o.money < price) { game.toast(`${o.first} can't afford it.`); return; }
    o.money -= price; c.money += price; L.inv.product -= n;
    L.dirty = (L.dirty || 0) + price;
    L.dealt = (L.dealt || 0) + n;
    // selling on another crew's turf is asking for trouble
    const nb = W.city.buildings.find((b) => dist(b.x, b.z, p.x, p.z) < 60);
    const turf = nb ? this.turfOf(nb.code) : null;
    if (turf && c.gang && turf.id !== c.gang && rand.chance(0.2)) {
      const enforcer = this.members(turf.id).find((m) => m.ped && dist(m.ped.x, m.ped.z, p.x, p.z) < 120);
      if (enforcer) { game.toast(`A ${turf.name} member saw that. "This is our corner."`, 4); setTimeout(() => W.combat.melee(enforcer, 'fists', c), 1200); }
    }
    game.toast(`Sold ${n} to ${o.first} for $${price}.`, 2);
    this.rep(c, 0.5);
  }

  // ------------------------------------------------------------ the underground board (computer)
  undergroundHTML(c) {
    const W = this.W, L = ensureLife(c, W);
    if (!L.gangContact) return '<p class="muted">An encrypted forum. You don\'t have an invite. (Meet the right people…)</p>';
    this.ensure();
    const g = c.gang ? this.gang(c.gang) : null;
    const illegal = Object.entries(WEAPONS).filter(([, w]) => w.price);
    const m = this.mission;
    return `<p class="muted">Cash only. Dirty money on you: ${money(L.dirty || 0)}</p>
      <h4>Crews</h4>${g ? `<p>You're a <b>${RANKS[c.gangRank || 0]}</b> of the <b style="color:${g.color}">${esc(g.name)}</b> · rep ${Math.round(L.gangRep || 0)}</p>${m ? `<p>Current job: ${esc(m.text)} (pays ${money(m.pay)})</p>` : '<button data-mission>Ask for a job</button>'} <button data-leave class="danger">Leave the crew</button>`
        : GANGS.map((x) => `<div class="job"><span><b style="color:${x.color}">${esc(x.name)}</b><br><small>Turf: ${x.turf.join(', ')} · ${this.members(x.id).length} members</small></span><button data-join="${x.id}">Ask to join</button></div>`).join('')}
      <h4>Gear</h4><div class="menu">${Object.entries(GEAR).map(([k, gr]) => `<button data-gear="${k}" ${c.money < gr.price * 1.2 ? 'disabled' : ''}><span>${gr.label} <small>${esc(gr.desc)}</small></span><b>${money(Math.round(gr.price * 1.2))}</b></button>`).join('')}</div>
      <h4>Hardware (no licence, no questions)</h4><div class="menu">${illegal.map(([k, w]) => `<button data-gun="${k}" ${c.money < Math.round(w.price * 1.6) ? 'disabled' : ''}><span>${w.label}${(L.inv.weapons || []).includes(k) ? ' (owned)' : ''}</span><b>${money(Math.round(w.price * 1.6))}</b></button>`).join('')}<button data-ammo ${c.money < 80 ? 'disabled' : ''}><span>Ammo for everything you carry</span><b>${money(80)}</b></button></div>
      <h4>Product</h4><div class="menu"><button data-product ${c.money < 250 || !c.gang ? 'disabled' : ''}><span>10 units from your crew${c.gang ? '' : ' (crew members only)'} <small>sell at night on the street (B)</small></span><b>${money(250)}</b></button></div>
      <h4>Laundering</h4><div class="menu"><button data-launder ${(L.dirty || 0) < 500 ? 'disabled' : ''}><span>Wash ${money(L.dirty || 0)} through a laundromat (−20%)</span><b>→ bank</b></button></div>`;
  }
  bindUnderground(api, c, re) {
    const W = this.W, L = ensureLife(c, W), game = W.__game;
    const q = (s) => api.el.querySelectorAll(s);
    q('[data-join]').forEach((b) => b.onclick = () => {
      const g = this.gang(b.dataset.join);
      if (c.duty != null || (c.job && c.job.role === 'officer')) return re('They laugh. "We don\'t hire cops."');
      if (rand.chance(0.35 + (100 - L.stats.karma) / 250 + (L.skills.combat || 0) / 200)) { c.gang = g.id; c.gangRank = 0; L.gangRep = 0; W.history.citizenLog(c, `Joined the ${g.name}`, true); re(`You're in. Welcome to the ${g.name}. Ask for a job when you're ready.`); }
      else re(`${g.name}: "Prove yourself first." (Try again after a few days, or get tougher.)`);
    });
    q('[data-leave]').forEach((b) => b.onclick = () => { const g = this.gang(c.gang); c.gang = null; c.gangRank = 0; this.mission = null; W.history.citizenLog(c, `Left the ${g.name}`, true); re('You walk away. They won\'t forget it.'); });
    q('[data-mission]').forEach((b) => b.onclick = () => { const m = this.startMission(c, game); re(`New job: ${m.text}`); });
    q('[data-gear]').forEach((b) => b.onclick = () => { const k = b.dataset.gear, gr = GEAR[k], pr = Math.round(gr.price * 1.2); if (c.money < pr) return; c.money -= pr; if (k === 'drill' || k === 'thermite' || k === 'lockpicks') L.inv[k] = (L.inv[k] || 0) + 1; else L.inv[k] = true; re(`Bought: ${gr.label}.`); });
    q('[data-gun]').forEach((b) => b.onclick = () => { const k = b.dataset.gun, w = WEAPONS[k], pr = Math.round(w.price * 1.6); if (c.money < pr) return; c.money -= pr; L.inv.weapons = Array.from(new Set([...(L.inv.weapons || []), k])); L.ammo = L.ammo || {}; L.ammo[k] = (L.ammo[k] || 0) + (w.mag || 0) * 2; re(`${w.label} acquired. X on foot to draw.`); });
    q('[data-ammo]').forEach((b) => b.onclick = () => { if (c.money < 80) return; c.money -= 80; L.ammo = L.ammo || {}; for (const k of L.inv.weapons || []) if (WEAPONS[k] && WEAPONS[k].mag) L.ammo[k] = (L.ammo[k] || 0) + WEAPONS[k].mag * 2; re('Ammo restocked.'); });
    q('[data-product]').forEach((b) => b.onclick = () => { if (c.money < 250) return; c.money -= 250; L.inv.product = (L.inv.product || 0) + 10; re('10 units. Night-time, busy streets. Watch out for cops.'); });
    q('[data-launder]').forEach((b) => b.onclick = () => { const d = L.dirty || 0; const out = Math.round(Math.min(d, c.money) * 0.8); c.money -= Math.min(d, c.money); c.bank = (c.bank || 0) + out; L.dirty = 0; re(`Laundered. ${money(out)} is in your bank account, clean.`); });
  }
}

function W_msg(W, icon, text) { if (W.life) W.life.msg(icon, text); }
