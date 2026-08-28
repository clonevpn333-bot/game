/* Hides the UI panels and screenshots the 3D scene behind them. */
import { chromium } from 'playwright';
const [, , url, out, script = '', waitMs = '11000'] = process.argv;
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
await page.goto(url, { waitUntil: 'load', timeout: 40000 });
await page.waitForTimeout(Number(waitMs));
if (script) await page.evaluate(script).catch((e) => errs.push('script: ' + e.message));
await page.waitForTimeout(Number(process.env.POST_MS || 3500));
await page.screenshot({ path: out });
console.log(errs.length ? errs.slice(0, 10).join('\n') : 'no errors');
await browser.close();
