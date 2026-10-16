// Street life check: stands, crowds, gang corners, celebrities, hiring.
import { World } from '../js/sim/world.js';
import { rand } from '../js/core/rng.js';
rand.reseed(5);
const W = new World(12345); W.init();
const ev = []; W.on('cityEvent', (e) => ev.push(`${W.history.timeStr(W.time)} ${e.text}`));
const open0 = W.economy.openJobs().length;
let maxHang = 0; const kinds = {};
const end = W.time + 1.5 * 1440;
while (W.time < end) { W.focus = { x: 0, z: 0 }; W.update(1 / 30, 8); maxHang = Math.max(maxHang, W.street.hang.size); for (const h of W.street.hang.values()) kinds[h.kind] = Math.max(kinds[h.kind] || 0, [...W.street.hang.values()].filter((x) => x.kind === h.kind).length); }
console.log('stands', W.street.stands.length, 'max hanging', maxHang, JSON.stringify(kinds), 'open jobs', open0, '->', W.economy.openJobs().length, 'celeb', W.street.celeb && W.citizens[W.street.celeb.cid].name);
console.log(ev.filter((t) => /Drive-by|in town|spotted|Hiring|Overdose|brawl|Shots/.test(t)).join('\n'));
