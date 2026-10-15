// Scenario: wait for an organic incident with police responding, possess the officer.
export default async function ({ page, shot, wait }) {
  // advance the simulation quickly (no rendering) until police respond to something organic
  const found = await page.evaluate(() => {
    const W = window.game.world;
    for (let i = 0; i < 40000; i++) {
      W.update(1 / 30, 8);
      if (i % 30 === 0) for (const u of W.services.units) if (u.kind === 'police' && (u.state === 'respond' || u.state === 'pursuit') && u.crew.length) { const inc = W.incidents.get(u.incident); if (inc && inc.type !== 'animal') return u.id; }
    }
    return null;
  });
  console.log('unit', found);
  await page.evaluate(() => window.game.setSpeed(2));
  if (!found) return;
  const info = await page.evaluate((uid) => {
    const g = window.game, W = g.world;
    const u = W.services.unit(uid);
    const inc = W.incidents.get(u.incident);
    g.select({ kind: 'citizen', id: u.crew[0] });
    g.followSelected();
    return { officer: W.citizens[u.crew[0]].name, inc: inc && inc.title, state: u.state };
  }, found);
  console.log(JSON.stringify(info));
  await wait(2000);
  await shot('30-officer-selected');
  await page.evaluate(() => window.game.possessSelected());
  await page.waitForFunction(() => !!window.game.possession.c, null, { timeout: 60000, polling: 500 });
  await wait(500);
  await shot('31-officer-possessed');
  await page.keyboard.down('KeyW');
  await wait(3000);
  await page.keyboard.up('KeyW');
  await shot('32-officer-driving');
  const st = await page.evaluate(() => { const g = window.game; const P = g.possession; return { obj: P.objective(), mode: P.mode, speed: P.veh && P.veh.speed }; });
  console.log(JSON.stringify(st));
}
