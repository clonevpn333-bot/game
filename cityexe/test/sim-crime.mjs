// Headless check of gangs, feuds, missions and dark personalities over a few days.
import { World } from '../js/sim/world.js';
import { GANGS } from '../js/sim/crime.js';
import { rand } from '../js/core/rng.js';
rand.reseed(7);
const days = parseFloat(process.argv[2] || '2.5');
const W = new World(12345); W.init();
const ev = []; W.on('cityEvent', (e) => ev.push(`${W.history.timeStr(W.time)} ${e.text}`));
const end = W.time + days * 1440;
const t0 = performance.now(); let frames = 0;
while (W.time < end) { W.focus = { x: 0, z: 0 }; W.update(1 / 30, 30); frames++; }
console.log('avg ms', ((performance.now() - t0) / frames).toFixed(2));
for (const g of GANGS) console.log(g.name, W.crime.members(g.id).length, 'boss', g.boss);
console.log(ev.filter((t) => /brawl|Shots|feud|kill|murder|dead|body|stalk|arson|scam|missing|arrest/i.test(t)).join('\n'));
const c = W.citizens.find((o) => o.gang);
for (let i = 0; i < 6; i++) { c.gangRank = i % 4; console.log(W.crime.offerMission(c).text); }
if (W.dark) console.log('dark', JSON.stringify(W.dark.stats()));
if (W.investigations) console.log('cases', JSON.stringify(W.investigations.list.map((k) => [k.type, k.status, k.victimName])));
