// Long-horizon evolution check: abstract-simulate N days and summarize how the city changed.
import { World } from '../js/sim/world.js';
import { rand } from '../js/core/rng.js';
rand.reseed(+(process.argv[3] || 11));
const days = +(process.argv[2] || 30);
const W = new World(12345); W.init();
const sample = W.citizens.filter((c, i) => i % 300 === 7).slice(0, 5);
for (const c of sample) c.bookmarked = true;
const bizOpen0 = W.economy.biz.filter((b) => b.status === 'open').length;
const t0 = performance.now();
W.catchUp(days * 1440);
console.log(`${days} days in ${Math.round(performance.now() - t0)} ms`);
const alive = W.citizens.filter((c) => c.status !== 'dead' && c.status !== 'left');
console.log('population', W.citizens.length, 'alive/in city', alive.length, 'unemployment', Math.round(W.economy.stats.unemployment * 100) + '%', 'homeless', alive.filter((c) => c.homeless).length);
console.log('businesses open', bizOpen0, '->', W.economy.biz.filter((b) => b.status === 'open').length, 'closed', W.economy.biz.filter((b) => b.status === 'closed').length);
const money = alive.map((c) => c.money).sort((a, b) => a - b);
console.log('money p10/p50/p90', Math.round(money[Math.floor(money.length * 0.1)]), Math.round(money[Math.floor(money.length * 0.5)]), Math.round(money[Math.floor(money.length * 0.9)]));
console.log('counters', JSON.stringify(W.history.counters));
const ev = W.history.events.filter((e) => !e.minor);
console.log('major events', ev.length);
for (const e of ev.slice(-30)) console.log('  ', W.history.dateStr(e.t), e.text);
for (const c of sample) {
  console.log(`\n★ ${c.name} (${c.age}) — ${W.citizenAI.jobTitle(c)} — $${Math.round(c.money)} — ${W.citizenAI.homeName(c)} — status ${c.status}`);
  for (const l of c.log.slice(-10)) console.log('    ', W.history.dateStr(l.t), l.text);
}
