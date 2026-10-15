// Frame profiler: splits sim vs render time on the street at night in life mode.
export default async function ({ page, wait }) {
  await page.waitForSelector('.title-screen [data-life]', { timeout: 60000 });
  await page.click('.title-screen [data-life]');
  await page.waitForSelector('[data-go]');
  await page.click('[data-go]');
  await page.waitForFunction(() => window.game.possession.c && window.game.possession.c.isPlayer && !window.game.rig.trans, null, { timeout: 200000, polling: 500 });
  const prof = (label) => page.evaluate((label) => new Promise((res) => {
    const g = window.game, W = g.world, R = g.renderer;
    const acc = { sim: 0, render: 0, n: 0 };
    const u = W.update.bind(W), r = R.render.bind(R);
    W.update = (...a) => { const t = performance.now(); const o = u(...a); acc.sim += performance.now() - t; return o; };
    R.render = (...a) => { const t = performance.now(); const o = r(...a); acc.render += performance.now() - t; acc.n++; return o; };
    const t0 = performance.now();
    setTimeout(() => { W.update = u; R.render = r; res({ label, frames: acc.n, sim: Math.round(acc.sim / Math.max(1, acc.n)), render: Math.round(acc.render / Math.max(1, acc.n)), wall: Math.round((performance.now() - t0) / Math.max(1, acc.n)) }); }, 8000);
  }), label);
  console.log(JSON.stringify(await prof('home-day')));
  await page.evaluate(() => { const g = window.game, W = g.world; W.time = Math.floor(W.time / 1440) * 1440 + 23 * 60; W.weather.set('clear', 600); g.interiors.exit(); });
  await wait(3000);
  console.log(JSON.stringify(await prof('street-night')));
  await page.evaluate(() => { const g = window.game, W = g.world; W.time = Math.floor(W.time / 1440) * 1440 + 13 * 60; });
  await wait(2000);
  console.log(JSON.stringify(await prof('street-day')));
  await page.evaluate(() => { window.game.renderer.post && (window.game.renderer.postOff = true); });
}
