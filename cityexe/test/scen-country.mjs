// Outskirts: start as a country kid in Pinewood Hollow, look around the homestead by day and night,
// drive into the city, then visit the farm.
export default async function ({ page, shot, wait }) {
  await page.waitForSelector('.title-screen [data-life]', { timeout: 60000 });
  await page.click('.title-screen [data-life]');
  await page.waitForSelector('[data-go]');
  await page.fill('#cr-first', 'Wren');
  await page.click('[data-bg="rural"]');
  await shot('80-creator-rural');
  await page.click('[data-go]');
  await page.waitForFunction(() => window.game.possession.c && window.game.possession.c.isPlayer && !window.game.rig.trans, null, { timeout: 200000, polling: 500 });
  await page.evaluate(() => { const W = window.game.world; W.time = Math.floor(W.time / 1440) * 1440 + 13 * 60; W.weather.set('clear', 600); });
  await wait(4000);
  console.log('home', JSON.stringify(await page.evaluate(() => { const g = window.game, c = g.possession.c, I = g.interiors; return { key: I.key, b: I.b && I.b.name, fam: g.world.life.family().map((f) => f.role).join(','), figs: I.figs.size }; })));
  await shot('81-homestead-day');
  await page.evaluate(() => { const T = window.game.rig.third; T.dist = 22; T.pitch = 0.62; });
  await wait(2500);
  await shot('82-homestead-wide');
  await page.evaluate(() => { const W = window.game.world; W.time = Math.floor(W.time / 1440) * 1440 + 22 * 60; });
  await wait(3000);
  await shot('83-homestead-night');
  // drive into the city and come back out to the farm
  await page.evaluate(() => { const g = window.game, W = g.world; W.time = Math.floor(W.time / 1440) * 1440 + 1440 + 9 * 60; g.interiors.exit(); });
  await wait(3000);
  await shot('84-city-limits');
  await page.evaluate(() => { const g = window.game, W = g.world; const b = W.city.buildings.find((x) => x.civic === 'county'); g.possession.enterBuilding(b, { fromStreet: true }); });
  await wait(4000);
  console.log('farm', JSON.stringify(await page.evaluate(() => { const I = window.game.interiors; return { key: I.key, figs: I.figs.size }; })));
  await page.evaluate(() => { const T = window.game.rig.third; T.dist = 20; T.pitch = 0.7; });
  await wait(2500);
  await shot('85-farm');
}
