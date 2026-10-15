// Tour of authored interiors: enter one building of each type and photograph it.
export default async function ({ page, shot, wait }) {
  await page.evaluate(() => { document.querySelector('.modal [data-ok]')?.click(); window.game.qualityLocked = true; window.game.renderer.setQuality('high'); });
  const name = await page.evaluate(() => {
    const g = window.game, W = g.world;
    for (let i = 0; i < 300; i++) W.update(1 / 30, 3);
    W.time = Math.floor(W.time / 1440) * 1440 + 21.5 * 60;
    const c = W.citizens.find((c) => c.ped && !c.duty && c.age > 25 && c.home != null && W.city.buildings[c.home].kind !== 'house');
    g.select({ kind: 'citizen', id: c.id }); g.possessSelected();
    return c.name;
  });
  console.log('player', name);
  await page.waitForFunction(() => window.game.possession.c && !window.game.rig.trans, null, { timeout: 200000, polling: 500 });
  const targets = ['apartment', 'house', 'lobby', 'store', 'boutique', 'restaurant', 'cafe', 'bar', 'club', 'lounge', 'casino', 'bank', 'office', 'school', 'police', 'hospital', 'gym', 'gunstore', 'warehouse', 'metro'];
  for (const t of targets) {
    const info = await page.evaluate((t) => {
      const g = window.game, W = g.world, c = g.possession.c;
      const want = {
        apartment: (b) => b.id === c.home, house: (b) => b.kind === 'house', lobby: (b) => b.resUnits > 0 && b.bizId == null && b.kind !== 'house' && b.id !== c.home,
        store: (b) => b.bizId != null && W.economy.biz[b.bizId].type === 'grocery', boutique: (b) => b.bizId != null && W.economy.biz[b.bizId].type === 'clothing',
      }[t];
      const byType = { restaurant: 'restaurant', cafe: 'cafe', bar: 'bar', club: 'nightclub', lounge: 'lounge', casino: 'casino', bank: 'bank', office: 'office', school: 'college', police: 'police', hospital: 'hospital', gym: 'gym', gunstore: 'gunstore', warehouse: 'warehouse', metro: 'metro' }[t];
      const b = want ? W.city.buildings.find(want) : W.city.buildings.find((b) => b.bizId != null && W.economy.biz[b.bizId].type === byType);
      if (!b) return { t, err: 'none' };
      if (g.interiors.active) g.interiors.exit(true);
      if (c.ped) W.peds.despawn(c.ped);
      W.citizenAI.placeInside(c, b.id);
      g.interiors.enter(b, c, true, t === 'apartment' ? { home: true } : { fromStreet: true });
      g.possession.mode = 'inside';
      const T = g.rig.third; T.yaw = Math.PI + 0.5; T.dist = 9;
      return { t, key: g.interiors.key, name: W.citizenAI.buildingName(b.id), figs: g.interiors.figs.size, acts: g.interiors.room.acts.length };
    }, t);
    console.log(JSON.stringify(info));
    if (info.err) continue;
    await wait(1800);
    await shot('50-room-' + t);
  }
}
