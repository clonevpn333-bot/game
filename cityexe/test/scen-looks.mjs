// Visual review shots: characters up close, street level, golden hour, night, aerial.
const setTime = (page, h) => page.evaluate((h) => { const W = window.game.world; W.time = Math.floor(W.time / 1440) * 1440 + h * 60; }, h);
const cam = (page, x, z, dist, pitch, yaw) => page.evaluate(([x, z, dist, pitch, yaw]) => { const r = window.game.rig; r.follow = null; r.goal.target.set(x, 0, z); r.goal.dist = dist; r.goal.pitch = pitch; r.userPitch = true; if (yaw != null) r.goal.yaw = yaw; r.target.copy(r.goal.target); r.dist = dist; r.pitch = pitch; if (yaw != null) r.yaw = yaw; }, [x, z, dist, pitch, yaw]);
export default async function ({ page, shot, wait }) {
  await page.evaluate(() => { document.querySelector('.modal [data-ok]')?.click(); window.game.qualityLocked = true; window.game.renderer.setQuality('high'); });
  await setTime(page, 12.5);
  await page.evaluate(() => { const W = window.game.world; for (let i = 0; i < 300; i++) W.update(1 / 30, 3); });
  // a pedestrian up close
  const ped = await page.evaluate(() => { const W = window.game.world; const p = W.peds.list.find((p) => p.state === 'walk' && !p.hidden); return p ? { x: p.x, z: p.z, h: p.h, id: p.cid } : null; });
  // a lineup of real citizens in the park, photographed up close
  await page.evaluate(() => {
    const g = window.game, W = g.world, pv = g.peopleView;
    const P = W.city.park; const cx = P ? (P.x0 + P.x1) / 2 : 300, cz = P ? (P.z0 + P.z1) / 2 - 30 : 100;
    const picks = W.citizens.filter((c) => c.status === 'ok').slice(0, 400).filter((c, i) => i % 37 === 0).slice(0, 8);
    pv.extra.length = 0;
    pv._lineup = picks.map((c, i) => ({ id: 90000 + i, cid: c.id, x: cx - 3.5 + i, y: 0, z: cz, h: Math.PI, v: 0, anim: i, action: i === 2 ? 'phone' : i === 5 ? 'talk' : '', state: 'idle', look: pv.lookFor(c) }));
    const orig = pv.update.bind(pv);
    pv.update = (dt) => { pv.extra.length = 0; pv.extra.push(...pv._lineup); orig(dt); };
    const r = g.rig; r.follow = null; r.goal.target.set(cx, 1.0, cz); r.target.copy(r.goal.target); r.goal.dist = r.dist = 7; r.goal.pitch = r.pitch = 0.12; r.userPitch = true; r.goal.yaw = r.yaw = Math.PI;
    window._lineCenter = { cx, cz };
  });
  await wait(3000);
  await shot('30-people-close');
  await page.evaluate(() => { const r = window.game.rig, L = window._lineCenter; r.goal.target.set(L.cx - 1.5, 1.3, L.cz); r.target.copy(r.goal.target); r.goal.dist = r.dist = 2.6; r.goal.pitch = r.pitch = 0.08; });
  await wait(2500);
  await shot('30b-people-faces');
  await page.evaluate(() => { const pv = window.game.peopleView; pv._lineup = []; });
  // street level with cars, trees, storefronts
  const road = await page.evaluate(() => { const W = window.game.world; const v = W.traffic.vehicles.find((v) => v.state === 'lane' && !v.fleet && Math.abs(v.x) < 250 && Math.abs(v.z) < 250); return v ? { x: v.x, z: v.z, h: v.h } : { x: 0, z: 0, h: 0 }; });
  await cam(page, road.x, road.z, 22, 0.22, road.h + 2.2);
  await wait(3000);
  await shot('31-street-day');
  await cam(page, 120, 60, 140, 0.55, 0.7);
  await wait(3000);
  await shot('32-midtown-day');
  await setTime(page, 19.3);
  await wait(2500);
  await shot('33-golden-hour');
  await setTime(page, 22.5);
  await cam(page, road.x, road.z, 30, 0.25, road.h + 2.2);
  await wait(3000);
  await shot('34-street-night');
  await cam(page, 40, 30, 380, 0.75, 0.6);
  await wait(3000);
  await shot('35-aerial-night');
  const info = await page.evaluate(() => ({ details: window.game.cityView.detailCounts, calls: window.game.renderer.r.info.render.calls, tris: window.game.renderer.r.info.render.triangles }));
  console.log('info', JSON.stringify(info));
}
