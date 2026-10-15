export default async function ({ page, shot, wait }) {
  await page.evaluate(() => document.querySelector('.modal [data-ok]')?.click());
  // find a shop with staff and customers, possess someone inside
  const who = await page.evaluate(() => {
    const g = window.game, W = g.world;
    for (let i = 0; i < 3000; i++) W.update(1 / 30, 3);
    const b = W.city.buildings.filter((b) => b.bizId != null && ['grocery', 'restaurant', 'bar', 'cafe', 'convenience'].includes(W.economy.biz[b.bizId].type) && b.occupants.size >= 2).sort((a, b) => b.occupants.size - a.occupants.size)[0];
    if (!b) return null;
    const cid = Array.from(b.occupants)[0];
    g.select({ kind: 'citizen', id: cid });
    g.possessSelected();
    return { b: W.citizenAI.buildingName(b.id), n: b.occupants.size, c: W.citizens[cid].name };
  });
  console.log('interior', JSON.stringify(who));
  if (!who) return;
  await page.waitForFunction(() => !!window.game.possession.c && !window.game.rig.trans, null, { timeout: 200000, polling: 500 });
  await wait(1500);
  await shot('50-interior');
  await page.keyboard.down('KeyW'); await wait(1200); await page.keyboard.up('KeyW');
  await shot('51-interior-walk');
  const st = await page.evaluate(() => ({ active: window.game.interiors.active, kind: window.game.interiors.kind, figs: window.game.interiors.figs.size, prompts: window.game.possession.prompts }));
  console.log(JSON.stringify(st));
  // walk out: teleport player to door and press E
  await page.evaluate(() => { const I = window.game.interiors; I.player.x = I.room.door.x; I.player.z = I.room.door.z - 0.8; });
  await wait(300);
  await page.keyboard.press('KeyE');
  await wait(1500);
  await shot('52-outside');
  console.log(JSON.stringify(await page.evaluate(() => ({ active: window.game.interiors.active, mode: window.game.possession.mode }))));
}
