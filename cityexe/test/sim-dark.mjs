// Forces the dark-side systems to act so their street behaviour can be checked headless.
import { World } from '../js/sim/world.js';
import { rand } from '../js/core/rng.js';
rand.reseed(+(process.argv[2] || 3));
const W = new World(12345); W.init();
const ev = []; W.on('cityEvent', (e) => ev.push(`${W.history.timeStr(W.time)} ${e.text}`));
// jump to 21:30
while (W.minuteOfDay < 21 * 60 + 30) { W.focus = { x: 0, z: 0 }; W.update(1 / 30, 30); }
W.dark.refresh();
const hl = []; const sh = W.dark.startHunt.bind(W.dark); W.dark.startHunt = (k, s) => { const n = W.dark.hunts.length; sh(k, s); if (W.dark.hunts.length > n) { const h = W.dark.hunts.at(-1); hl.push(h); console.log('hunt', W.history.timeStr(W.time), k.name, '->', W.citizens[h.v].name); } };
for (const c of W.dark.roster) { const s = W.dark.st[c.id]; if (s.kind === 'killer') s.next = 0; if (s.kind === 'stalker') s.level = 0.95; }
const end = W.time + 3 * 1440;
let maxH = 0, maxL = 0;
while (W.time < end) { W.focus = { x: 0, z: 0 }; W.update(1 / 30, 8); maxH = Math.max(maxH, W.dark.hunts.length); maxL = Math.max(maxL, W.dark.lurks.size); }
for (const h of hl) console.log('hunt end', W.citizens[h.k].name, 'strikes', h.strikes, 'victim', W.citizens[h.v].status);
console.log('max hunts', maxH, 'max lurks', maxL, JSON.stringify(W.dark.stats()));
console.log(ev.filter((t) => /kill|murder|serial|stalk|arson|charged|arrest|Police|Detectives|fire/i.test(t)).join('\n'));
console.log(JSON.stringify(W.investigations.list.map((k) => [k.type, k.status, k.victimName, Math.round(k.clues * 100)])));
