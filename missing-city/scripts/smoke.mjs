// Starts every chapter's real script and watches for runtime errors.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
let errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__shot = true; });
await page.goto(process.env.URL || 'http://127.0.0.1:5188/');
await page.waitForFunction(() => window.__THREE_GAME_DIAGNOSTICS__?.frame > 5, null, { timeout: 180000 });
const n = await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.game.constructor && 13);
const only = process.argv.slice(2).map(Number);
for (let i = 0; i < n; i++) {
  if (only.length && !only.includes(i)) continue;
  errs = [];
  await page.evaluate((i) => { const g = window.__THREE_GAME_TEST_HOOKS__.game; g.startChapter(i); }, i);
  // fast-forward dialogue by mashing skip
  const t0 = Date.now();
  while (Date.now() - t0 < 25000) {
    await page.evaluate(() => { const g = window.__THREE_GAME_TEST_HOOKS__.game; g.setSkip && g['skipLine']?.(); });
    await page.waitForTimeout(500);
  }
  const st = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__.state);
  console.log(`chapter ${i}`, JSON.stringify(st), errs.length ? '\n  ' + errs.slice(0, 5).join('\n  ') : 'OK');
}
await browser.close();
