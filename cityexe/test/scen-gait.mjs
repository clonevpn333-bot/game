// Gait check: close-ups of a walker and of the player running.
export default async function ({ page, shot, wait }) {
  await page.waitForSelector('.title-screen [data-life]', { timeout: 60000 });
  await page.click('.title-screen [data-life]');
  await page.waitForSelector('[data-go]');
  await page.click('[data-go]');
  await page.waitForFunction(() => window.game.possession.c && window.game.possession.c.isPlayer && !window.game.rig.trans, null, { timeout: 200000, polling: 500 });
  await page.evaluate(() => { const g = window.game, W = g.world; W.time = Math.floor(W.time / 1440) * 1440 + 13 * 60; W.weather.set('clear', 600); g.interiors.exit(); });
  await wait(2500);
  // side view of the player walking, then running (driven directly, frame-rate independent)
  // side view: strafe right relative to the camera so we see the profile
  for (const [name, run] of [['95-walk', false], ['96-run', true]]) {
    await page.evaluate(() => { const T = window.game.rig.third; T.dist = 7; T.pitch = 0.1; });
    if (run) await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyD');
    for (let i = 0; i < 3; i++) { await wait(1200); await shot(`${name}-${i}`); }
    await page.keyboard.up('KeyD');
    if (run) await page.keyboard.up('ShiftLeft');
    console.log(name, JSON.stringify(await page.evaluate(() => { const p = window.game.possession.c.ped; return { v: p.v, mv: p.mv, rk: p.rk, g: p.gait }; })));
  }
}
