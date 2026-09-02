#!/usr/bin/env node
/* Grabs a set of framed screenshots at different altitudes. */
const fs = require('fs'), path = require('path');
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
  });

  const views = JSON.parse(process.argv[2] || '[]');
  for (const v of views) {
    await page.evaluate((v) => {
      const C = window.CRUX, P = C.P;
      const c = v.camp !== undefined ? C.Camps.list[v.camp] : null;
      const x = c ? c.x + (v.dx || 0) : v.x, z = c ? c.z + (v.dz || 0) : v.z;
      const y = C.groundH(x, z);
      P.pos.set(x, y + 0.05, z);
      P.vel.set(0, 0, 0); P.state = 0; P.grounded = true; P.fallFrom = y + 0.05;
      P.hp = v.hp === undefined ? 100 : v.hp;
      P.st = v.st === undefined ? 100 : v.st;
      P.hunger = v.hu === undefined ? 82 : v.hu;
      P.temp = v.tp === undefined ? 100 : v.tp;
      if (v.inv) P.inv = v.inv.map(k => k ? { k: k, n: 1 } : null);
      C.CAM.yaw = v.yaw === undefined ? Math.atan2(-x, -z) : v.yaw;
      C.CAM.pitch = v.pitch || 0;
      C.CAM.lift = 0;
      C.CAM.first = !!v.first;
      C.CAM.dist = 4.7;
      C.CAM.smoothTgt.set(P.pos.x, P.pos.y + C.K.EYE, P.pos.z);
      if (v.climb) { P.state = 2; }
      if (v.mates) {
        for (let i = 0; i < v.mates; i++) {
          const a = C.Remote.add('m' + i, ['bo', 'wren', 'pike'][i] || ('m' + i), i + 1);
          const ang = C.CAM.yaw + (i - 1) * 0.5;
          const mx = P.pos.x + Math.sin(ang) * (4 + i * 2.5), mz = P.pos.z + Math.cos(ang) * (4 + i * 2.5);
          a.pos.set(mx, C.groundH(mx, mz), mz);
          a.yaw = ang + Math.PI; a.hp = 100 - i * 22; a.st = 90 - i * 30;
          a.buf = [{ t: 0, x: a.pos.x, y: a.pos.y, z: a.pos.z, yaw: a.yaw }];
          a.state = i === 2 ? 3 : 0;
        }
      }
      if (v.ping) { const px = P.pos.x + Math.sin(C.CAM.yaw) * 26, pz = P.pos.z + Math.cos(C.CAM.yaw) * 26; C.Coop.addPing(px, C.groundH(px, pz) + 1, pz, 1, false, 'wren'); }
    }, v);
    await page.waitForTimeout(v.wait || 2600);
    await page.screenshot({ path: path.join(ROOT, 'dist', 'shot-' + v.name + '.png') });
    console.log('shot ' + v.name);
    if (v.mates) await page.evaluate(() => window.CRUX.Remote.clear());
  }
  await browser.close();
})();
