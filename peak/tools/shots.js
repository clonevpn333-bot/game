#!/usr/bin/env node
/* Framed screenshots at chosen spots. */
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.join(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1180, height: 700 } });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto('file://' + path.join(ROOT, 'dist', 'test.html'));
  await page.waitForFunction(() => !!window.CRUX, null, { timeout: 30000 });
  await page.screenshot({ path: path.join(ROOT, 'dist', 'shot-0-menu.png') });

  await page.click('#btn-solo');
  await page.waitForFunction(() => window.CRUX.Game.built && window.CRUX.Game.mode === 'play', null, { timeout: 90000 });
  await page.evaluate(() => {
    document.getElementById('pause').classList.add('hidden');
    window.CRUX.HUD.blocked = false;
    window.CRUX.Walls.list.forEach(w => { w.open = true; });   // see the whole island
  });

  for (const v of JSON.parse(process.argv[2] || '[]')) {
    await page.evaluate((v) => {
      const C = window.CRUX, P = C.P;
      let x, z, y;
      if (v.camp !== undefined) {
        const c = C.Camps.list[v.camp];
        x = c.x + (v.dx || 0); z = c.z + (v.dz || 0);
      } else { x = v.x; z = v.z; }
      P.spawnAt(x, z, v.hint || 10);
      P.hp = 100;
      for (const k in P.status) P.status[k] = 0;
      if (v.status) for (const k in v.status) P.status[k] = v.status[k];
      C.Survive.recalcMax();
      P.st = v.st === undefined ? P.stMax : v.st;
      P.extra = v.extra || 0;
      if (v.inv) P.inv = v.inv.map(k => k ? { k: k, n: 1 } : null);
      C.CAM.yaw = v.yaw === undefined ? Math.atan2(-P.pos.x, -P.pos.z) : v.yaw;
      C.CAM.pitch = v.pitch || 0;
      C.CAM.lift = 0; C.CAM.dist = C.CAM.want; C.CAM.first = !!v.first;
      C.CAM.smoothTgt.set(P.pos.x, P.pos.y + C.K.EYE, P.pos.z);
      if (v.grab) { C.IN.keys[C.IN.grabKey] = true; C.IN.keys['KeyW'] = true; }
      else { C.IN.keys[C.IN.grabKey] = false; C.IN.keys['KeyW'] = false; }
      if (v.mates) {
        for (let i = 0; i < v.mates; i++) {
          const a = C.Remote.add('m' + i, ['bo', 'wren', 'pike'][i] || ('m' + i), i + 1);
          const ang = C.CAM.yaw + (i - 1) * 0.55;
          const mx = P.pos.x + Math.sin(ang) * (3.5 + i * 2), mz = P.pos.z + Math.cos(ang) * (3.5 + i * 2);
          const g = C.T.findGround(mx, mz, 4, 0.5) || { x: mx, y: P.pos.y, z: mz };
          a.pos.set(g.x, g.y, g.z);
          a.yaw = ang + Math.PI; a.st = 90 - i * 30; a.stMax = 100 - i * 12;
          a.buf = [{ t: 0, x: a.pos.x, y: a.pos.y, z: a.pos.z, yaw: a.yaw }];
          a.state = i === 2 ? C.ST.OUT : 0;
        }
      }
    }, v);
    await page.waitForTimeout(v.wait || 2800);
    await page.screenshot({ path: path.join(ROOT, 'dist', 'shot-' + v.name + '.png') });
    console.log('shot ' + v.name);
    await page.evaluate(() => { window.CRUX.Remote.clear(); window.CRUX.IN.keys = {}; });
  }
  await browser.close();
})();
