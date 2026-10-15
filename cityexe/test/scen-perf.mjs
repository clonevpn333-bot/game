export default async function ({ page, shot, wait }) {
  await page.evaluate(() => document.querySelector('.modal [data-ok]')?.click());
  await page.evaluate(() => {
    const g = window.game;
    window.__T = {};
    const wrap = (obj, name, label) => { const f = obj[name].bind(obj); obj[name] = (...a) => { const t0 = performance.now(); const r = f(...a); window.__T[label] = (window.__T[label] || 0) + performance.now() - t0; return r; }; };
    wrap(g.world, 'update', 'world'); wrap(g.vehicleView, 'update', 'veh'); wrap(g.peopleView, 'update', 'ppl'); wrap(g.fx, 'update', 'fx');
    wrap(g.cityView, 'updateBuildings', 'bld'); wrap(g.cityView, 'update', 'city'); wrap(g.renderer, 'render', 'render'); wrap(g.renderer, 'updateEnvironment', 'env');
    wrap(g.eventView, 'update', 'evt'); wrap(g.hud, 'update', 'hud'); wrap(g.audio, 'update', 'aud'); wrap(g, 'update', 'total');
    g.rig.flyTo(20, 20, 70);
  });
  await wait(15000);
  await page.evaluate(() => { window.__T = {}; window.__f0 = window.game.frame; window.__t0 = performance.now(); });
  await wait(15000);
  console.log(JSON.stringify(await page.evaluate(() => { const n = window.game.frame - window.__f0; const r = { frames: n, wall: Math.round(performance.now() - window.__t0) }; for (const k in window.__T) r[k] = +(window.__T[k] / Math.max(1, n)).toFixed(1); return r; })));
  // try without bloom/shadows
  await page.evaluate(() => { window.game.renderer.setQuality('low'); window.__T = {}; window.__f0 = window.game.frame; window.__t0 = performance.now(); });
  await wait(15000);
  console.log('low', JSON.stringify(await page.evaluate(() => { const n = window.game.frame - window.__f0; const r = { frames: n, wall: Math.round(performance.now() - window.__t0) }; for (const k in window.__T) r[k] = +(window.__T[k] / Math.max(1, n)).toFixed(1); return r; })));
}
