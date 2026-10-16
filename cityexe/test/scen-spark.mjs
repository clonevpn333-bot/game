// Life HUD (objectives, reputation) and the Spark app layout.
export default async function ({ page, shot, wait }) {
  await page.waitForSelector('.title-screen [data-life]', { timeout: 60000 });
  await page.click('.title-screen [data-life]');
  await page.waitForSelector('[data-go]');
  await page.click('[data-go]');
  await page.waitForFunction(() => window.game.possession.c && window.game.possession.c.isPlayer && !window.game.rig.trans, null, { timeout: 200000, polling: 500 });
  await wait(2500);
  await page.evaluate(() => { const g = window.game; g.lifeUI.openPhone('spark'); });
  await wait(1200);
  await shot('97-spark');
}
