// Objectives: there is always something to go and do. Three at a time, a mix
// of building a life and burning it down, each with a reward. Plus reputation:
// how the city sees you, which your actions (and witnesses) keep rewriting.
import { ensureLife, stat } from './lifeState.js';
import { rand } from '../core/rng.js';
import { money } from '../ui/panels.js';

const GOALS = [
  { id: 'job', text: 'Get a job (computer → JobLink)', ok: (c) => !!c.job, pay: 150 },
  { id: 'date', text: 'Get a partner (phone → Spark)', ok: (c, W) => !!W.citizenAI.partner(c), pay: 100 },
  { id: 'rich', text: 'Have $5,000 (cash + bank)', ok: (c) => c.money + (c.bank || 0) >= 5000, pay: 500 },
  { id: 'fight', text: 'Knock someone out (V to attack)', ok: (c, W, L, b) => (L.kos || 0) > b.kos, pay: 120, rep: -3 },
  { id: 'rob', text: 'Rob a store (G at the counter)', ok: (c, W, L, b) => c.record.crimes > b.crimes, pay: 200, rep: -4 },
  { id: 'steal', text: 'Steal a car (F next to one)', ok: (c, W) => { const v = c.veh != null ? W.traffic.byId.get(c.veh) : null; return !!(v && v.owner !== c.id && !v.fleet); }, pay: 150 },
  { id: 'stars', text: 'Reach 3 wanted stars', ok: (c, W) => (W.combat?.heat || 0) >= 3, pay: 300 },
  { id: 'escape', text: 'Lose the cops with 2+ stars', ok: (c, W, L, b) => (L.escapes || 0) > b.escapes, pay: 400 },
  { id: 'boom', text: 'Blow up a car (shoot or beat it)', ok: (c, W, L, b) => (L.carsBlown || 0) > b.carsBlown, pay: 250, rep: -5 },
  { id: 'party', text: 'Go clubbing after 10pm', ok: (c, W) => { const b = W.city.buildings[c.at]; const biz = b && b.bizId != null ? W.economy.biz[b.bizId] : null; return !!(biz && biz.type === 'nightclub' && (W.minuteOfDay >= 22 * 60 || W.minuteOfDay < 4 * 60)); }, pay: 80 },
  { id: 'gang', text: 'Join a gang (ask a gang member about "opportunities")', ok: (c) => !!c.gang, pay: 300 },
  { id: 'famous', text: 'Get a selfie with a celebrity (B)', ok: (c, W, L, b) => (L.fame || 0) > b.fame, pay: 150 },
  { id: 'knife', text: 'Grab a knife from a kitchen drawer', ok: (c, W, L) => (L.inv.weapons || []).includes('knife'), pay: 40 },
  { id: 'hated', text: 'Drop your reputation below 20', ok: (c, W, L) => (L.rep ?? 50) < 20, pay: 250 },
  { id: 'saint', text: 'Raise your reputation above 75', ok: (c, W, L) => (L.rep ?? 50) > 75, pay: 300 },
  { id: 'lotto', text: 'Buy a lottery ticket', ok: (c, W) => W.lottery.tickets.some((t) => t.cid === c.id), pay: 20 },
  { id: 'gun', text: 'Get a gun (gun store or the underground)', ok: (c, W, L) => (L.inv.weapons || []).some((w) => ['pistol', 'revolver', 'shotgun', 'smg', 'rifle'].includes(w)), pay: 100 },
];

export class Goals {
  constructor(W) { this.W = W; this.t = 0; }
  base(c, L) { return { kos: L.kos || 0, crimes: c.record.crimes, escapes: L.escapes || 0, carsBlown: L.carsBlown || 0, fame: L.fame || 0 }; }
  list(c) {
    const W = this.W, L = ensureLife(c, W);
    L.goals = L.goals || [];
    while (L.goals.length < 3) {
      const taken = new Set([...L.goals.map((g) => g.id), ...(L.goalsDone || []).slice(-6)]);
      const cand = GOALS.filter((g) => !taken.has(g.id) && !g.ok(c, W, L, this.base(c, L)));
      if (!cand.length) break;
      const g = rand.pick(cand);
      L.goals.push({ id: g.id, b: this.base(c, L) });
    }
    return L.goals.map((x) => ({ ...x, def: GOALS.find((g) => g.id === x.id) })).filter((x) => x.def);
  }
  update(dt) {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 1;
    const W = this.W, c = W.life?.player;
    if (!c || c.status === 'dead') return;
    const L = ensureLife(c, W);
    // escaping the police counts when a 2+ star level drops to nothing
    const heat = W.combat?.heat || 0;
    if ((L.peakHeat || 0) >= 2 && heat <= 0 && c.status === 'ok') { L.escapes = (L.escapes || 0) + 1; L.peakHeat = 0; }
    L.peakHeat = heat > 0 ? Math.max(L.peakHeat || 0, heat) : (c.status === 'jail' ? 0 : L.peakHeat || 0);
    for (const g of this.list(c)) {
      if (!g.def.ok(c, W, L, g.b)) continue;
      L.goals = L.goals.filter((x) => x.id !== g.id);
      L.goalsDone = [...(L.goalsDone || []), g.id].slice(-12);
      c.money += g.def.pay;
      if (g.def.rep) this.rep(c, g.def.rep);
      stat(c, 'happy', 3);
      W.life.msg('🎯', `Objective complete: ${g.def.text.replace(/ \(.*\)$/, '')}. +${money(g.def.pay)}`);
      W.emit('goal', { c, id: g.id });
    }
  }
  rep(c, d) {
    const L = ensureLife(c, this.W);
    const before = L.rep ?? 50;
    L.rep = Math.max(0, Math.min(100, before + d));
    const tier = (r) => (r < 15 ? 0 : r < 35 ? 1 : r < 65 ? 2 : r < 85 ? 3 : 4);
    if (tier(L.rep) !== tier(before)) this.W.life && this.W.life.msg(L.rep < before ? '📉' : '📈', `Your reputation: ${repLabel(L.rep)}.`);
  }
}
export function repLabel(r) { return r < 15 ? 'Public menace' : r < 35 ? 'Bad news' : r < 65 ? 'Nobody special' : r < 85 ? 'Well liked' : 'Pillar of the community'; }
