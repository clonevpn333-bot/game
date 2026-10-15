export default async function ({ page, shot, wait }) {
  await page.evaluate(() => { document.querySelector('.modal [data-ok]')?.click(); window.game.qualityLocked = true; window.game.renderer.setQuality('high'); });
  await page.evaluate(() => { const r = window.game.rig; r.follow = null; r.goal.target.set(0, 0, 0); r.goal.dist = 60; r.goal.pitch = 0.4; r.userPitch = true; });
  await wait(2500);
  await shot('40-dbg-all');
  await page.evaluate(() => { window.game.renderer.grade.enabled = false; });
  await wait(1500); await shot('41-dbg-nograde');
  await page.evaluate(() => { window.game.renderer.ao.enabled = false; });
  await wait(1500); await shot('42-dbg-noao');
  const px = await page.evaluate(() => { const R = window.game.renderer; return { passes: R.composer.passes.map((p) => p.constructor.name + ':' + p.enabled + ':' + p.renderToScreen) }; });
  console.log(JSON.stringify(px));
}
