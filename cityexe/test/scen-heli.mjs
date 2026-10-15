// Possess the standby news pilot, take off, fly, hand over to autopilot and back.
export default async function ({ page, shot, wait }) {
  await page.evaluate(() => document.querySelector('.modal [data-ok]')?.click());
  const hs = () => page.evaluate(() => { const P = window.game.possession, h = P.heli || P.c?.dutyHeli; return { mode: P.mode, auto: P.autopilot, frames: window.game.frame, y: h && +h.y.toFixed(1), v: h && +Math.hypot(h.vx, h.vz).toFixed(1), state: h && h.state, player: h && h.player, keys: document.querySelector('#p-keys')?.textContent }; });
  const pilot = await page.evaluate(() => { const g = window.game, W = g.world; for (let i = 0; i < 600; i++) W.update(1 / 30, 3); const h = W.helis.list.find((h) => h.pilot != null); if (!h) return null; g.select({ kind: 'citizen', id: h.pilot }); g.possessSelected(); return W.citizens[h.pilot].name + ' / ' + h.name; });
  console.log('pilot', pilot);
  if (!pilot) return;
  await page.waitForFunction(() => window.game.possession.c && !window.game.rig.trans, null, { timeout: 200000, polling: 500 });
  console.log('start', JSON.stringify(await hs()));
  await page.keyboard.down('Space'); await page.waitForFunction(() => window.game.possession.heli.y > window.game.possession.heli.pad.y + 25, null, { timeout: 120000, polling: 300 }); await page.keyboard.up('Space');
  console.log('climbed', JSON.stringify(await hs()));
  await page.keyboard.down('KeyW'); await page.keyboard.down('ShiftLeft'); await page.waitForFunction(() => Math.hypot(window.game.possession.heli.vx, window.game.possession.heli.vz) > 25, null, { timeout: 120000, polling: 300 }); await page.keyboard.up('ShiftLeft'); await page.keyboard.up('KeyW');
  console.log('cruising', JSON.stringify(await hs()));
  await shot('82-heli-fly');
  await page.keyboard.press('KeyR'); await wait(3000);
  console.log('autopilot', JSON.stringify(await hs()));
  await page.keyboard.press('KeyR'); await wait(1500);
  console.log('manual', JSON.stringify(await hs()));
  await page.keyboard.press('KeyQ'); await wait(2500);
  console.log('released', JSON.stringify(await page.evaluate(() => { const h = window.game.world.helis.list.find((h) => h.kind === 'news'); return { mode: window.game.mode, player: h.player, state: h.state, pilot: h.pilot }; })));
}
