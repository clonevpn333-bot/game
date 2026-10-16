// Punch pose check: freeze a swing mid-strike next to a pedestrian.
export default async function ({ page, shot, wait }) {
  await page.waitForSelector('.title-screen [data-life]', { timeout: 60000 });
  await page.click('.title-screen [data-life]');
  await page.waitForSelector('[data-go]');
  await page.click('[data-go]');
  await page.waitForFunction(() => window.game.possession.c && window.game.possession.c.isPlayer && !window.game.rig.trans, null, { timeout: 200000, polling: 500 });
  await page.evaluate(() => { const g = window.game, W = g.world; W.time = Math.floor(W.time / 1440) * 1440 + 13 * 60; W.weather.set('clear', 600); g.interiors.exit(); });
  await wait(2500);
  for (const [name, k] of [['98-windup', 0.15], ['99-strike', 0.45]]) {
    await page.evaluate((k) => { const g = window.game, p = g.possession.c.ped, T = g.rig.third; T.dist = 3.4; T.pitch = 0.15; T.yaw = p.h + Math.PI / 2.2; g.hitfx.swing(p, 'fists'); const t = performance.now() / 1000; p.atk.dur = 600; p.atk.t0 = t - 600 * k; }, k);
    await wait(2500);
    await shot(name);
  }
}
