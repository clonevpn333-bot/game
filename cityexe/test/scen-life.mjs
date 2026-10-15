// Life mode: title -> creator -> wake up at home -> HUD, phone, computer, job application, talk, a day passing.
export default async function ({ page, shot, wait }) {
  await page.waitForSelector('.title-screen [data-life]', { timeout: 60000 });
  await shot('60-title');
  await page.click('.title-screen [data-life]');
  await page.waitForSelector('[data-go]');
  await page.fill('#cr-first', 'Riley');
  await page.click('[data-bg="middle"]'); await page.click('[data-tr="brainy"]'); await page.click('[data-tr="charming"]');
  await shot('61-creator');
  await page.click('[data-go]');
  await page.waitForFunction(() => window.game.possession.c && window.game.possession.c.isPlayer && !window.game.rig.trans, null, { timeout: 200000, polling: 500 });
  await wait(2500);
  const st = await page.evaluate(() => { const g = window.game, c = g.possession.c; return { name: c.name, home: g.world.citizenAI.homeName(c), inside: g.interiors.active, key: g.interiors.key, fam: g.world.life.family().map((f) => f.role + ' ' + f.o.name).join(', ') }; });
  console.log('life', JSON.stringify(st));
  await shot('62-home');
  await page.keyboard.press('KeyP'); await wait(800);
  await shot('63-phone');
  console.log('modals', await page.evaluate(() => document.querySelectorAll('.panel-modal').length));
  await page.evaluate(() => document.querySelector('[data-app="contacts"]').click()); await wait(500); await shot('64-contacts');
  await page.keyboard.press('Escape'); await wait(400);
  await page.evaluate(() => { const g = window.game; g.lifeUI.openComputer(); });
  console.log('pc', JSON.stringify(await page.evaluate(() => Array.from(document.querySelectorAll('.panel-modal')).map((m) => ({ cls: m.className, txt: m.innerText.slice(0, 120), disp: getComputedStyle(m).display, op: getComputedStyle(m).opacity, vis: getComputedStyle(m).visibility })))));
  await page.evaluate(() => document.querySelector('[data-app="jobs"]').click()); await wait(600);
  await shot('65-joblink');
  const applied = await page.evaluate(() => { const b = Array.from(document.querySelectorAll('[data-apply]')).find((x) => !x.disabled); if (b) b.click(); return document.querySelector('.gmsg')?.textContent; });
  console.log('apply', applied);
  await wait(400); await shot('66-applied');
  await page.keyboard.press('Escape'); await wait(400);
  await page.evaluate(() => { const g = window.game, W = g.world; const p = W.citizens[W.life.player.parents[0]]; g.lifeUI.openTalk(p, null, false); });
  await page.evaluate(() => document.querySelector('[data-t="ask_life"]').click()); await page.evaluate(() => document.querySelector('[data-t="chat"]').click()); await wait(400);
  await shot('67-talk');
  await page.keyboard.press('Escape'); await wait(400);
  // let a day pass
  await page.evaluate(() => { const W = window.game.world; const end = W.time + 1440; while (W.time < end) W.update(1 / 30, 60); });
  await wait(2500);
  await shot('68-next-day');
  const s2 = await page.evaluate(() => { const L = window.game.world.life; return { inbox: L.inbox.slice(-5).map((m) => m.text), pending: L.pending.length, job: L.player.job ? L.player.job.role : null, money: Math.round(L.player.money) }; });
  console.log('day2', JSON.stringify(s2));
}
