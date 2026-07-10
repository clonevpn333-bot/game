const { launch } = require('./harness');
const path = require('path');
const SHOT = process.env.RT_SHOT || '/tmp/claude-0/-home-user-game/ad34b3df-5365-54e0-bbeb-bdacb676b279/scratchpad/boot.png';
(async () => {
  const { browser, page, errors } = await launch();
  await page.waitForFunction('window.RT_BOOT === "ok"', null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const boot = await page.evaluate('window.RT_BOOT');
  await page.screenshot({ path: SHOT });
  console.log('BOOT:', boot, '| console errors:', errors.length ? errors : 'none');
  await browser.close();
  process.exit(boot === 'ok' && !errors.length ? 0 : 1);
})();
