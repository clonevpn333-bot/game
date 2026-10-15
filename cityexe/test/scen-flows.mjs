const st = (page) => page.evaluate(() => { const P = window.game.possession; return { c: P.c && P.c.name, mode: P.mode, speed: P.veh ? +P.veh.speed.toFixed(1) : null, alt: P.heli ? +P.heli.y.toFixed(1) : null, prompts: P.prompts.map((p) => p.text) }; });
export default async function ({ page, shot, wait }) {
  await page.evaluate(() => document.querySelector('.modal [data-ok]')?.click());
  // 1. walker next to their own parked car
  const name = await page.evaluate(() => {
    const g = window.game, W = g.world;
    for (let i = 0; i < 600; i++) W.update(1 / 30, 3);
    const c = W.citizens.find((c) => c.ped && c.vehicle != null && W.traffic.byId.get(c.vehicle)?.state === 'parked' && !c.duty);
    const v = W.traffic.byId.get(c.vehicle);
    const [x, z] = W.citizenAI.carSidePoint(v);
    c.ped.x = x; c.ped.z = z;
    g.select({ kind: 'citizen', id: c.id }); g.possessSelected();
    return c.name;
  });
  console.log('walker', name);
  await page.waitForFunction(() => window.game.possession.c && !window.game.rig.trans, null, { timeout: 200000, polling: 500 });
  console.log('possessed', JSON.stringify(await st(page)));
  await page.keyboard.press('KeyF'); await wait(1500);
  console.log('after F', JSON.stringify(await st(page)));
  await page.keyboard.down('KeyW'); await wait(4000); await page.keyboard.up('KeyW');
  console.log('after W', JSON.stringify(await st(page)));
  await shot('80-own-car');
  await page.keyboard.down('KeyS'); await wait(4000); await page.keyboard.up('KeyS');
  await page.keyboard.press('KeyF'); await wait(1500);
  console.log('exit car', JSON.stringify(await st(page)));
  await page.keyboard.press('KeyQ'); await wait(3000);
  console.log('released', JSON.stringify(await page.evaluate(() => ({ mode: window.game.mode, sel: window.game.selected }))));
  // 2. helicopter
  const pilot = await page.evaluate(() => { const g = window.game, W = g.world; const h = W.helis.list.find((h) => h.pilot != null); if (!h) return null; g.select({ kind: 'citizen', id: h.pilot }); g.possessSelected(); return W.citizens[h.pilot].name + ' / ' + h.name; });
  console.log('pilot', pilot);
  if (pilot) {
    await page.waitForFunction(() => window.game.possession.c && !window.game.rig.trans, null, { timeout: 200000, polling: 500 });
    await page.keyboard.down('Space'); await wait(3000); await page.keyboard.up('Space');
    await page.keyboard.down('KeyW'); await wait(2000); await page.keyboard.up('KeyW');
    console.log('flying', JSON.stringify(await st(page)));
    await shot('81-heli');
    await page.keyboard.press('KeyQ'); await wait(2500);
  }
  // 3. save + reload
  const t = await page.evaluate(async () => { await window.game.save(); return window.game.world.time; });
  await page.reload();
  await page.waitForFunction(() => window.game && window.game.renderer && !document.getElementById('boot'), null, { timeout: 300000 });
  const t2 = await page.evaluate(() => ({ time: window.game.world.time, pop: window.game.world.citizens.length, modal: !!document.querySelector('.modal') }));
  console.log('reload', t.toFixed(1), JSON.stringify(t2));
}
