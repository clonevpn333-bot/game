/* Clicks Start on an arcade game, plays a few seconds of input, screenshots. */
import { chromium } from 'playwright';
const [, , url, out, keys = 'ArrowLeft,ArrowRight,Space'] = process.argv;
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1000, height: 640 } });
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts\.g/.test(m.text())) errs.push('console: ' + m.text()); });
await page.goto(url, { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(1200);
await page.click('button', { timeout: 4000 }).catch(() => errs.push('no start button'));
await page.mouse.move(500, 320);
for (let i = 0; i < 22; i++) {
  for (const k of keys.split(',')) { await page.keyboard.down(k); await page.waitForTimeout(60); await page.keyboard.up(k); }
  await page.mouse.move(400 + Math.sin(i) * 200, 300 + Math.cos(i) * 120);
  if (i % 4 === 0) await page.mouse.down(), await page.mouse.up();
}
await page.waitForTimeout(800);
await page.screenshot({ path: out });
console.log(errs.length ? errs.slice(0, 6).join('\n') : 'no errors');
await browser.close();
