// Headless simulation smoke test: runs the city without rendering.
import { World } from '../js/sim/world.js';
import { rand } from '../js/core/rng.js';
rand.reseed(+(process.argv[4] || 7));
const days = parseFloat(process.argv[2] || '0.5');
const speed = parseFloat(process.argv[3] || '8');
const t0 = performance.now();
const W = new World(12345);
W.init();
console.log('init ms', Math.round(performance.now() - t0), 'citizens', W.citizens.length, 'jobs', W.economy.jobs.length, 'filled', W.economy.jobs.filter(j=>j.holder!=null).length, 'vehicles', W.traffic.vehicles.length);
const events = [];
W.on('cityEvent', (e) => events.push(e));
let frames = 0, worst = 0;
const endT = W.time + days * 1440;
const t1 = performance.now();
let lastReport = W.time;
while (W.time < endT) {
  const f0 = performance.now();
  W.focus = { x: 0, z: 0 };
  W.update(1 / 60, speed);
  const ft = performance.now() - f0;
  if (frames > 30) worst = Math.max(worst, ft);
  frames++;
  if (W.time - lastReport > 180) {
    lastReport = W.time;
    const st = {};
    for (const c of W.citizens) st[c.state] = (st[c.state] || 0) + 1;
    const vs = {};
    for (const v of W.traffic.vehicles) vs[v.state] = (vs[v.state] || 0) + 1;
    console.log(W.history.timeStr(W.time), 'peds', W.peds.list.length, JSON.stringify(st), JSON.stringify(vs), 'inc', W.incidents.active().length, 'avg ms', ((performance.now() - t1) / frames).toFixed(2), 'worst', worst.toFixed(1));
  }
}
console.log('frames', frames, 'avg ms/frame', ((performance.now() - t1) / frames).toFixed(2), 'worst', worst.toFixed(1));
console.log('events:', events.length);
for (const e of events.slice(-40)) console.log(' ', W.history.timeStr(e.t), e.text);
const inc = {}; for (const i of W.incidents.list) inc[i.type + ':' + (i.outcome || (i.closed ? 'closed' : 'open'))] = (inc[i.type + ':' + (i.outcome || (i.closed ? 'closed' : 'open'))] || 0) + 1;
console.log(inc);
console.log('counters', W.history.counters);
const units = {}; for (const u of W.services.units) units[u.kind + ':' + u.state] = (units[u.kind + ':' + u.state] || 0) + 1;
console.log(units);
