#!/usr/bin/env node
/* Builds the island once per biome variant and photographs each one. */
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');

const SETS = [
  { name: 'roots',   pick: ['shore', 'roots', 'alpine', 'caldera', 'kiln', 'peak'],   slot: 1 },
  { name: 'mesa',    pick: ['shore', 'tropics', 'mesa', 'caldera', 'kiln', 'peak'],   slot: 2 },
  { name: 'gloom',   pick: ['shore', 'tropics', 'alpine', 'gloom', 'kiln', 'peak'],   slot: 3 },
  { name: 'kiln',    pick: ['shore', 'tropics', 'alpine', 'caldera', 'kiln', 'peak'], slot: 4 },
  { name: 'citadel', pick: ['shore', 'tropics', 'alpine', 'caldera', 'citadel', 'peak'], slot: 4 },
];

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1120, height: 660 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('file://' + path.join(ROOT, 'dist', 'test.html'));
  await page.waitForFunction(() => !!window.CRUX, null, { timeout: 30000 });

  for (const set of SETS) {
    await page.evaluate((pick) => {
      const C = window.CRUX;
      C.Run.roll = function () { C.Run.pick = pick.slice(); return C.Run.pick; };
      C.P.name = 'scout'; C.P.slot = 0; C.P.id = 'solo';
      C.Net.reset(); C.Net.solo = true; C.Net.code = '';
      C.Game.runT = 0;
      // the previous world is still flagged built, so wait on a fresh token
      window.__ready = false;
      C.Game.buildWorld(20260903, 7, 1, function () { C.Game.begin(0); window.__ready = true; });
    }, set.pick);
    await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
    await page.evaluate((set) => {
      const C = window.CRUX, P = C.P;
      document.getElementById('pause').classList.add('hidden');
      C.HUD.blocked = false;
      C.Walls.list.forEach(w => { w.open = true; });
      const c = C.Camps.list[set.slot + 1] || C.Camps.list[C.Camps.list.length - 1];
      const g = P.spawnAt(c.x + 9, c.z + 9, c.y);
      window.__dbg = { camps: C.Camps.list.map(q => Math.round(q.y)), want: Math.round(c.y),
                       got: Math.round(g.y), py: Math.round(P.pos.y) };
      P.hp = 100;
      for (const k in P.status) P.status[k] = 0;
      C.Survive.recalcMax(); P.st = P.stMax * 0.7;
      C.CAM.yaw = Math.atan2(-P.pos.x, -P.pos.z);
      C.CAM.pitch = 0.1; C.CAM.lift = 0; C.CAM.dist = C.CAM.want;
      C.CAM.smoothTgt.set(P.pos.x, P.pos.y + C.K.EYE, P.pos.z);
    }, set);
    await page.waitForTimeout(3200);
    await page.screenshot({ path: path.join(ROOT, 'dist', 'biome-' + set.name + '.png') });
    const info = await page.evaluate(() => ({
      y: Math.round(window.CRUX.P.pos.y), dbg: window.__dbg,
      hp: Math.round(window.CRUX.P.hp), state: window.CRUX.P.state,
      deaths: window.CRUX.Survive.deaths, fog: Math.round(window.CRUX.Fog.level),
      runT: Math.round(window.CRUX.Game.runT),
      stMax: Math.round(window.CRUX.P.stMax),
      props: Object.keys(window.CRUX.Props.counts).length,
    }));
    console.log(set.name + ' @' + info.y + 'm hp=' + info.hp + ' st=' + info.state + ' deaths=' + info.deaths + ' fog=' + info.fog + ' runT=' + info.runT + ' stMax=' + info.stMax + ' ' + JSON.stringify(info.dbg));
  }
  await browser.close();
})();
