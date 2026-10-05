// Dev QA capture: loads the game, jumps to story stages via test hooks, saves screenshots + diagnostics.
import { chromium } from '@playwright/test';
const url = process.env.URL ?? 'http://127.0.0.1:5188';
const stages = (process.argv[2] ?? 'title,ride,gate,market,tremor,combat,stair,boss,ending').split(',');
const mobile = process.argv.includes('--mobile');
const out = process.env.OUT ?? 'artifacts/shots';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
await page.goto(url);
await page.waitForFunction(() => (window.__THREE_GAME_DIAGNOSTICS__?.frame ?? 0) > 5, null, { timeout: 120000 });
for (const st of stages) {
  const t0 = Date.now();
  await page.evaluate(async (s) => { await window.__THREE_GAME_TEST_HOOKS__.setState(s); }, st);
  await page.waitForTimeout(st === 'title' ? 1500 : 800);
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(true));
  await page.waitForTimeout(300);
  const tag = `${mobile ? 'mobile' : 'desktop'}-${st}`;
  await page.screenshot({ path: `${out}/${tag}.png` });
  const d = await page.evaluate(() => window.__THREE_GAME_DIAGNOSTICS__);
  console.log(tag, `${Date.now() - t0}ms`, JSON.stringify({ r: d.renderer, mode: d.mode, stage: d.stage, s: Math.round(d.s), en: d.enemies, hp: d.hp }));
  await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(false));
}
console.log('ERRORS', errors.length);
for (const e of errors.slice(0, 20)) console.log(e);
await browser.close();
