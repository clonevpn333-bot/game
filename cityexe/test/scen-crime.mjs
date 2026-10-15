// Crime: life player gets a contact + gear, uses the underground board, draws and fires a gun on the street
// (wanted stars), then robs a bank: teller hold-up, drilling the vault, grabbing the cash.
export default async function ({ page, shot, wait }) {
  await page.waitForSelector('.title-screen [data-life]', { timeout: 60000 });
  await page.click('.title-screen [data-life]');
  await page.waitForSelector('[data-go]');
  await page.fill('#cr-first', 'Dom');
  await page.click('[data-go]');
  await page.waitForFunction(() => window.game.possession.c && window.game.possession.c.isPlayer && !window.game.rig.trans, null, { timeout: 200000, polling: 500 });
  await wait(1500);
  // a contact, cash, and the underground board
  await page.evaluate(() => { const g = window.game, c = g.possession.c, L = c.life; L.gangContact = true; c.money = 20000; g.lifeUI.openComputer(); document.querySelector('[data-app="under"]').click(); });
  await wait(600); await shot('70-underground');
  await page.evaluate(() => { document.querySelector('[data-gun="smg"]')?.click(); });
  await wait(300);
  await page.evaluate(() => { document.querySelector('[data-gear="drill"]')?.click(); });
  await wait(300);
  await page.evaluate(() => { document.querySelector('[data-gear="mask"]')?.click(); });
  await wait(300);
  await page.evaluate(() => { const b = document.querySelector('[data-join]'); b && b.click(); });
  await wait(400); await shot('71-underground-bought');
  console.log('inv', JSON.stringify(await page.evaluate(() => { const c = window.game.possession.c; return { inv: c.life.inv, ammo: c.life.ammo, gang: c.gang, money: c.money }; })));
  await page.keyboard.press('Escape'); await wait(400);
  // out onto the street, 23:00
  await page.evaluate(() => { const g = window.game, W = g.world; W.time = Math.floor(W.time / 1440) * 1440 + 23 * 60; g.interiors.exit(); });
  await wait(2500);
  console.log('mode', await page.evaluate(() => window.game.possession.mode));
  await page.evaluate(() => { const g = window.game; g.input.locked = true; g.rig.third.yaw += Math.PI; g.world.weather.set('clear', 600); });
  const ft = () => page.evaluate(() => new Promise((res) => { const t0 = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => res(Math.round(performance.now() - t0)))); }));
  await wait(3000); console.log('ft clear', await ft());
  await page.keyboard.down('KeyW'); await wait(1200); await page.keyboard.up('KeyW');
  await page.evaluate(() => { window.game.weapons.cur = 'smg'; }); await wait(500);
  console.log('weapon', await page.evaluate(() => window.game.weapons.cur));
  await page.mouse.move(640, 360);
  console.log('pre', JSON.stringify(await page.evaluate(() => { const g = window.game, p = g.possession.c.ped, cam = g.renderer.camera; return { p: [p.x, p.z, p.h], cam: cam.position.toArray(), T: g.rig.third }; })));
  await page.mouse.down({ button: 'right' }); await wait(900);
  console.log('post', JSON.stringify(await page.evaluate(() => new Promise((res) => { const g = window.game, p = g.possession.c.ped, cam = g.renderer.camera; const t0 = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => res({ ft: performance.now() - t0, p: [p.x, p.z, p.h], cam: cam.position.toArray(), T: g.rig.third, act: p.action }))); }))));
  await shot('72-aim');
  await page.evaluate(() => { const I = window.game.input; I.locked = true; I.mouse.down[0] = true; I.mouse.down[2] = true; }); await wait(6000); await page.evaluate(() => { window.game.input.mouse.down[0] = false; });
  await wait(300);
  await shot('73-firing');
  await page.mouse.up({ button: 'right' });
  console.log('heat', JSON.stringify(await page.evaluate(() => { const W = window.game.world; return { heat: W.combat.heat, ammo: W.life.player.life.ammo, inc: W.combat.inc && W.combat.inc.title }; })));
  await wait(2000); await shot('74-stars');
  // lose the heat (debug) and go to a bank
  await page.evaluate(() => { const g = window.game, W = g.world; W.combat.heat = 0.01; W.time = Math.floor(W.time / 1440) * 1440 + 1440 + 11 * 60; const bank = W.economy.biz.find((b) => b.type === 'bank'); const b = W.city.buildings[bank.b]; const c = g.possession.c; const [x, z] = W.citizenAI.doorOut(b); c.ped.x = x; c.ped.z = z; g.possession.enterBuilding(b, { fromStreet: true }); window.__bank = bank.id; });
  await wait(3000);
  await shot('75-bank-lobby');
  // walk to the teller and rob them
  const tel = await page.evaluate(() => { const g = window.game, I = g.interiors; const a = (I.layout?.acts || []).filter((x) => x.kind === 'teller' || x.kind === 'counter' || x.kind === 'bank'); return a.map((x) => [x.kind, x.x, x.z]); });
  console.log('teller acts', JSON.stringify(tel));
  await page.evaluate(() => { const g = window.game, W = g.world; g.weapons.cur = 'smg'; W.heists.tellerRobbery(g.possession.c, g.interiors.b, g); });
  await wait(1500); await shot('76-teller');
  // drill the vault
  await page.evaluate(() => { const g = window.game, I = g.interiors; I.player.x = 5.0; I.player.z = -4.4; window.game.world.heists.vaultUse({ c: g.possession.c, b: I.b }, g); });
  for (let i = 0; i < 12; i++) { await page.evaluate(() => { const W = window.game.world; W.time += 5; }); await wait(400); }
  await shot('77-drilling');
  const v = await page.evaluate(() => { const W = window.game.world, I = window.game.interiors; return { vault: W.heists.vaults[I.b.id], heat: W.combat.heat, hp: W.life.player.health }; });
  console.log('vault', JSON.stringify({ open: v.vault.open, prog: v.vault.progress, heat: v.heat, hp: v.hp }));
  await page.evaluate(() => { const g = window.game, I = g.interiors; g.world.heists.grabCash({ c: g.possession.c, b: I.b }, g); });
  await wait(1200); await shot('78-cash');
  console.log('after', JSON.stringify(await page.evaluate(() => { const W = window.game.world, c = W.life.player; return { money: Math.round(c.money), dirty: c.life.dirty, heat: W.combat.heat, status: c.status }; })));
}
