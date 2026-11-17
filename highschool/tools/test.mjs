// Headless smoke test for Highschool.
// Runs every mission scene many times with random choices, then autoplays a few whole days.
// Usage: node highschool/tools/test.mjs [runsPerHook] [days]
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.resolve(here, '..', 'index.html');
const RUNS = +process.argv[2] || 14, DAYS = +process.argv[3] || 6;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.addInitScript(() => {
  localStorage.clear();
  window.HS_TEST = { errs: [], logs: [], err(e) { this.errs.push(String(e && e.stack || e)); }, log(k, v) { this.logs.push(k + ': ' + v); } };
});
await page.goto(url);
await page.waitForFunction(() => window.HS && window.HS.MIS);

const info = await page.evaluate(() => ({ missions: Object.keys(HS.MIS).length, hooks: HS.HOOKS.length, spots: HS.SPOTS.length, coll: Object.keys(HS.COLL).length, deaths: Object.keys(HS.DEATHS).length, endings: Object.keys(HS.ENDINGS).length }));
console.log('content:', JSON.stringify(info));

// 1) every hook, many times, with everything it could want
const res = await page.evaluate(async (RUNS) => {
  const out = { ran: 0, deaths: {}, outcomes: {}, errs: [] };
  const ITEMS = ['video', 'ball', 'powder', 'spare', 'plan', 'tape', 'energy', 'key', 'padlock', 'swap', 'detention', 'compass', 'chucks', 'extinguisher', 'soaker'];
  for (let hi = 0; hi < HS.HOOKS.length; hi++) {
    const h = HS.HOOKS[hi];
    for (let r = 0; r < RUNS; r++) {
      const D = HS.freshD();
      D.period = Array.isArray(h.period) ? h.period[0] : h.period; D.room = h.room;
      // a rich random state
      for (const f of ['seat1', 'seat2', 'fight', 'stella1', 'corey1', 'swap', 'beep1', 'beepRig', 'loach1', 'detention', 'rewired', 'angelo1', 'dheva1', 'hold', 'padlock', 'bullied', 'aidanIncluded', 'adam1', 'adam2', 'adamKind', 'tez1', 'ollie1', 'kay1', 'tea1', 'tea3', 'teaProof', 'jess1', 'jess2', 'kai1', 'gc1', 'rum1', 'leak1', 'leak2']) if (Math.random() < .6) D.f[f] = 1;
      D.f.crowd = Math.random() < .5 ? 2 : 1;
      for (const it of ITEMS) if (Math.random() < .5) D.items.push(it);
      D.money = Math.floor(Math.random() * 6);
      if (h.mis === 'calling' && Math.random() < .3) D.f.aidanDead = 1;
      if (Math.random() < .5) { D.done.instella = 1; D.done.corey = 'kiss'; }
      if (Math.random() < .5) HS.P.coll.overdue = 1;
      HS.D = D;
      HS.P.intel.aidanPoem = 1; HS.P.intel.aidanJars = 1;
      try { HS.buildRoom(h.room); } catch (e) { out.errs.push('build ' + e); }
      let outcome = 'ok';
      try {
        const v = await Promise.race([h.run(), new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), 30000))]);
        outcome = 'ret:' + v;
      } catch (e) {
        if (e && e.death) { outcome = 'death'; }
        else { out.errs.push((h.mis || '?') + '#' + hi + ' ' + (e && e.stack || e)); outcome = 'error'; }
      }
      out.ran++;
      const key = h.mis + '#' + hi;
      out.outcomes[key] = out.outcomes[key] || {}; out.outcomes[key][outcome] = (out.outcomes[key][outcome] || 0) + 1;
    }
  }
  for (const s of HS.SPOTS) { const D = HS.freshD(); D.period = Array.isArray(s.period) ? s.period[0] : (s.period ?? 1); D.room = s.room; HS.D = D; try { await s.run(); } catch (e) { if (!e.death && !e.endday) out.errs.push('spot ' + s.label + ' ' + (e.stack || e)); } }
  out.deaths = HS.P.deaths;
  return out;
}, RUNS);
console.log('hook runs:', res.ran);
for (const [k, v] of Object.entries(res.outcomes)) console.log('  ', k.padEnd(14), JSON.stringify(v));
console.log('deaths seen:', Object.keys(res.deaths).join(', '));

// 2) autoplay whole days through the real flow
const auto = await page.evaluate(async (DAYS) => {
  const log = [];
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  HS.reset(); document.getElementById('menu').hidden = true;
  const startLoops = HS.P.loops;
  HS.newDay();
  let guard = 0;
  while (HS.P.loops - startLoops < DAYS && guard++ < 4000) {
    await sleep(15);
    const D = HS.D;
    const map = document.getElementById('map');
    if (!map.hidden) {
      const btns = [...map.querySelectorAll('.loc')];
      const withIcon = btns.filter(b => b.querySelector('em'));
      const b = (withIcon.length && Math.random() < .8) ? withIcon[Math.floor(Math.random() * withIcon.length)] : btns[Math.floor(Math.random() * btns.length)];
      log.push('D' + D.day + ' P' + D.period + ' → ' + b.querySelector('b').textContent);
      b.click(); continue;
    }
    if (!document.getElementById('menu').hidden) { break; }
    if (HS.busy || HS.panelMode !== 'roam') continue;
    // roam: talk to someone with a mission, or use a spot, or move on
    const ids = Object.keys(HS.A).filter(id => id !== 'you' && !HS.A[id].dead && HS.availableHooks(D.room, id).length);
    if (ids.length && Math.random() < .85) { const id = ids[Math.floor(Math.random() * ids.length)]; HS.A.you.x = HS.A[id].x; log.push('  talk ' + id); HS.talkTo(id); continue; }
    const sp = HS.SPOTS.filter(s => s.room === D.room && (s.period == null || s.period === D.period || (Array.isArray(s.period) && s.period.includes(D.period))) && (!s.cond || s.cond()));
    if (sp.length && Math.random() < .5) { log.push('  spot ' + sp[0].label); HS.useSpot(sp[0]); continue; }
    if (D.period === 7) { if (Math.random() < .5) { const bus = HS.SPOTS.find(s => s.label.startsWith('Get on')); HS.useSpot(bus); } else HS.endPeriod(); continue; }
    if (D.period === 8) { HS.boardBus(true); continue; }
    HS.endPeriod();
  }
  return { log: log.slice(-60), loops: HS.P.loops - startLoops, done: Object.keys(HS.P.done), parts: HS.P.parts, coll: Object.keys(HS.P.coll).length, guard };
}, DAYS);
console.log('autoplay: days', auto.loops, 'guard', auto.guard, 'missions done', auto.done.join(','), 'collectibles', auto.coll);
console.log(auto.log.slice(-25).join('\n'));

const testErrs = await page.evaluate(() => window.HS_TEST.errs);
const all = [...errors, ...res.errs, ...testErrs];
if (all.length) { console.log('\nERRORS (' + all.length + '):'); for (const e of [...new Set(all)].slice(0, 30)) console.log(e + '\n'); }
else console.log('\nNo errors.');
await browser.close();
process.exit(all.length ? 1 : 0);
