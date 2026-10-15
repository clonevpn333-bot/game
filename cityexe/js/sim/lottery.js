// City Lotto: pick 6 numbers from 1-40, drawn every night at 20:00. Tickets cost
// $2 at convenience stores and gas stations. The jackpot starts at $1.5M and rolls
// over, growing with sales. Odds are the real combinatorial ones (1 in 3,838,380
// for the jackpot), so a win is genuinely rare, for the player and for the many
// citizens who buy a ticket on their way home.
import { rand } from '../core/rng.js';

export const PRICE = 2;
const N = 40, K = 6;
// prize by number of matches (jackpot is dynamic)
const PRIZES = { 5: 25000, 4: 400, 3: 15 };
// probability of exactly m matches with 6 picks out of 40
const C = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };
export const ODDS = Object.fromEntries([3, 4, 5, 6].map((m) => [m, C(K, m) * C(N - K, K - m) / C(N, K)]));

export function quickPick(r = rand) {
  const s = new Set();
  while (s.size < K) s.add(r.int(1, N));
  return Array.from(s).sort((a, b) => a - b);
}

export class Lottery {
  constructor(world) {
    this.world = world;
    this.jackpot = 1500000;
    this.sold = 0;          // tickets sold since the last draw (all buyers)
    this.npcTickets = 0;    // anonymous citizen tickets in the current draw
    this.tickets = [];      // named tickets: { cid, nums, day }
    this.history = [];      // past draws: { day, nums, jackpot, winners: [{cid, m, prize}] }
    this.lastDrawDay = -1;
    world.on('hour', ({ hour }) => { if (hour === 20 && this.lastDrawDay !== world.day) this.draw(); });
  }

  buy(c, nums = null, count = 1) {
    const out = [];
    for (let i = 0; i < count; i++) {
      if (c.money < PRICE) break;
      c.money -= PRICE;
      // after the 20:00 draw, tickets are for tomorrow's draw
      const t = { cid: c.id, nums: nums && i === 0 ? nums.slice().sort((a, b) => a - b) : quickPick(), day: this.world.minuteOfDay >= 1200 ? this.world.day + 1 : this.world.day };
      this.tickets.push(t);
      out.push(t);
      this.sold++;
    }
    return out;
  }
  // a citizen grabs tickets at the counter (anonymous unless they win)
  npcBuy(c) {
    const n = 1 + (rand.chance(0.3) ? rand.int(1, 4) : 0);
    if (c.money < n * PRICE * 3) return;
    c.money -= n * PRICE;
    this.npcTickets += n;
    this.sold += n;
  }

  draw() {
    const W = this.world;
    this.lastDrawDay = W.day;
    const nums = quickPick();
    const set = new Set(nums);
    const winners = [];
    let jackpotWon = false;
    // named tickets (the player, plus any citizen who kept theirs)
    for (const t of this.tickets) {
      if (t.day > W.day) continue;
      const m = t.nums.filter((n) => set.has(n)).length;
      if (m >= 3) winners.push({ cid: t.cid, m, nums: t.nums });
    }
    // anonymous citizen tickets: sample how many matched, then name the lucky ones
    for (const m of [6, 5, 4]) {
      const p = ODDS[m];
      let hits = 0;
      for (let i = 0; i < this.npcTickets; i++) if (rand.float() < p) hits++;
      for (let h = 0; h < hits; h++) {
        const pool = W.citizens.filter((c) => c.status === 'ok' && !c.possessed && c.age >= 18);
        const c = pool[rand.int(0, pool.length - 1)];
        if (c) winners.push({ cid: c.id, m, npc: true });
      }
    }
    const jackWinners = winners.filter((w) => w.m === 6);
    for (const w of winners) {
      const c = W.citizens[w.cid];
      let prize = w.m === 6 ? Math.round(this.jackpot / jackWinners.length) : PRIZES[w.m];
      if (w.m === 6) jackpotWon = true;
      w.prize = prize;
      // big prizes are paid after tax into the bank
      if (prize >= 5000) { const net = Math.round(prize * (prize > 600000 ? 0.63 : 0.76)); c.bank = (c.bank || 0) + net; w.net = net; }
      else { c.money += prize; w.net = prize; }
      if (w.m >= 5) {
        W.history.citizenLog(c, w.m === 6 ? `WON THE LOTTERY JACKPOT — $${prize.toLocaleString()}` : `Won $${prize.toLocaleString()} in the City Lotto`, true);
        W.history.cityEvent(w.m === 6 ? `${c.name} won the $${prize.toLocaleString()} City Lotto jackpot!` : `${c.name} matched 5 numbers in the City Lotto ($${prize.toLocaleString()})`, { type: 'lottery', who: c.id, minor: w.m < 6 });
        c.happiness = Math.min(1, (c.happiness || 0.6) + (w.m === 6 ? 0.5 : 0.2));
        if (w.m === 6) c.flags.lotteryWinner = W.day;
      }
    }
    const rec = { day: W.day, nums, jackpot: this.jackpot, sold: this.sold, winners: winners.map((w) => ({ cid: w.cid, m: w.m, prize: w.prize, net: w.net, npc: !!w.npc })) };
    this.history.push(rec);
    if (this.history.length > 30) this.history.shift();
    W.emit('lottoDraw', rec);
    // roll over or reset
    if (jackpotWon) this.jackpot = 1500000;
    else this.jackpot = Math.round(this.jackpot + 150000 + this.sold * PRICE * 0.5);
    this.tickets = this.tickets.filter((t) => t.day > W.day); // tickets are for one draw
    this.npcTickets = 0;
    this.sold = 0;
    return rec;
  }

  serialize() { return { j: this.jackpot, s: this.sold, n: this.npcTickets, t: this.tickets, h: this.history, d: this.lastDrawDay }; }
  deserialize(o) { if (!o) return; this.jackpot = o.j; this.sold = o.s; this.npcTickets = o.n; this.tickets = o.t || []; this.history = o.h || []; this.lastDrawDay = o.d ?? -1; }
}
