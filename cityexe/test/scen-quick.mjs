// quick look: lineup faces + night aerial
export default async function ({ page, shot, wait }) {
  await page.evaluate(() => { document.querySelector('.modal [data-ok]')?.click(); window.game.qualityLocked = true; window.game.renderer.setQuality('high'); });
  await page.evaluate(() => {
    const g = window.game, W = g.world, pv = g.peopleView;
    W.time = Math.floor(W.time / 1440) * 1440 + 12.6 * 60;
    const P = W.city.park; const cx = (P.x0 + P.x1) / 2, cz = (P.z0 + P.z1) / 2 - 30;
    const picks = W.citizens.filter((c) => c.status === 'ok').slice(0, 400).filter((c, i) => i % 37 === 0).slice(0, 8);
    pv._lineup = picks.map((c, i) => ({ id: 90000 + i, cid: c.id, x: cx - 3.5 + i, y: 0, z: cz, h: Math.PI, v: 0, anim: i, action: i === 2 ? 'phone' : '', state: 'idle', look: pv.lookFor(c) }));
    const orig = pv.update.bind(pv);
    pv.update = (dt) => { pv.extra.length = 0; pv.extra.push(...pv._lineup); orig(dt); };
    const r = g.rig; r.follow = null; r.goal.target.set(cx - 1.5, 1.3, cz); r.target.copy(r.goal.target); r.goal.dist = r.dist = 2.6; r.goal.pitch = r.pitch = 0.08; r.userPitch = true; r.goal.yaw = r.yaw = Math.PI;
  });
  await wait(3000);
  await shot('36-faces');
  await page.evaluate(() => { const g = window.game, W = g.world; g.peopleView._lineup = []; W.weather.set('clear', 600, false); W.time = Math.floor(W.time / 1440) * 1440 + 22.5 * 60; const r = g.rig; r.goal.target.set(40, 0, 30); r.target.copy(r.goal.target); r.goal.dist = r.dist = 380; r.goal.pitch = r.pitch = 0.75; });
  await wait(3500);
  await shot('37-night');
}
