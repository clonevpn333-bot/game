// Street life: a busy stand by day, a gang corner at night.
export default async function ({ page, shot, wait }) {
  await page.waitForFunction(() => window.game && window.game.world && window.game.world.street, null, { timeout: 120000 });
  await wait(1500); await page.evaluate(() => { for (const b of document.querySelectorAll('button')) if (b.textContent.trim() === 'Continue') b.click(); });
  await page.evaluate(() => { const W = window.game.world; W.time = Math.floor(W.time / 1440) * 1440 + 14 * 60; W.weather.set('clear', 600); });
  // let crowds form
  await page.evaluate(() => { const W = window.game.world; for (let i = 0; i < 900; i++) W.update(1 / 30, 1); });
  const s = await page.evaluate(() => { const S = window.game.world.street; const best = S.stands.map((st) => [st, [...S.hang.values()].filter((h) => Math.hypot(h.x - st.x, h.z - st.z) < 8).length]).sort((a, b) => b[1] - a[1])[0]; return { x: best[0].x, z: best[0].z, kind: best[0].kind, n: best[1] }; });
  console.log('stand', JSON.stringify(s));
  await page.evaluate(({ x, z }) => window.game.rig.flyTo(x, z, 14), s);
  await wait(5000);
  await shot('90-stand');
  await page.evaluate(() => { const W = window.game.world; W.time = Math.floor(W.time / 1440) * 1440 + 22 * 60 + 30; for (let i = 0; i < 1200; i++) W.update(1 / 30, 1); });
  const g = await page.evaluate(() => { const S = window.game.world.street; const h = [...S.hang.values()].filter((x) => x.kind === 'gang'); return h.length ? { x: h[0].x, z: h[0].z, n: h.length } : null; });
  console.log('gang', JSON.stringify(g));
  if (g) { await page.evaluate(({ x, z }) => window.game.rig.flyTo(x, z, 14), g); await wait(5000); await shot('91-corner'); }
}
