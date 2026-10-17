// The city map with a Spark date pinned.
export default async function ({ page, shot, wait }) {
  await page.waitForSelector('.title-screen [data-life]', { timeout: 60000 });
  await page.click('.title-screen [data-life]');
  await page.waitForSelector('[data-go]');
  await page.click('[data-go]');
  await page.waitForFunction(() => window.game.possession.c && window.game.possession.c.isPlayer && !window.game.rig.trans, null, { timeout: 200000, polling: 500 });
  await wait(1500);
  await page.evaluate(() => { const g = window.game, W = g.world, c = g.possession.c; let m = null; for (let i = 0; i < 80 && !m; i++) m = W.love.swipe(c, true); W.love.give(c, m, true); });
  await wait(1200);
  await page.keyboard.press('KeyM');
  await wait(1500);
  await shot('100-map');
}
