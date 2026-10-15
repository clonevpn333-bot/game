export default async function ({ page, shot, wait }) {
  await page.evaluate(() => document.querySelector('.modal [data-ok]')?.click());
  await shot('40-welcome-closed');
  // fire + blackout + meteor + tornado through the god tool API
  const r = await page.evaluate(() => {
    const g = window.game, W = g.world;
    const b = W.city.buildings.find((b) => b.kind === 'brick' && b.code === 'O');
    g.godTool.run({ id: 'fire' }, { kind: 'building', id: b.id }, null);
    g.godTool.run({ id: 'blackout' }, null, { x: -350, z: -200 });
    g.godTool.run({ id: 'meteor' }, null, { x: 160, z: 260 });
    g.godTool.run({ id: 'tornado' }, null, { x: 250, z: 330 });
    g.godTool.run({ id: 'animals' }, null, null);
    g.flyTo(b.x, b.z, 120);
    return { b: b.id, x: b.x, z: b.z };
  });
  // let the simulation respond (fast, no render)
  await page.evaluate(() => { const W = window.game.world; for (let i = 0; i < 900; i++) W.update(1 / 30, 3); });
  await wait(2500);
  await shot('41-fire');
  await page.evaluate(() => window.game.flyTo(200, 300, 260));
  await wait(2500);
  await shot('42-tornado-meteor');
  await page.evaluate(() => { const W = window.game.world; W.time = Math.floor(W.time / 1440) * 1440 + 22 * 60; window.game.flyTo(-300, -150, 380); });
  await wait(2500);
  await shot('43-blackout-night');
  const st = await page.evaluate(() => { const W = window.game.world; return { inc: W.incidents.active().map((i) => i.title + ':' + i.units.length), ev: W.history.events.slice(-8).map((e) => e.text), animals: W.animals.list.length }; });
  console.log(JSON.stringify(st, null, 1));
}
