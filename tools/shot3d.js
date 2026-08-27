/* Screenshot a WebGL page once it reports __ready. */
import { chromium } from 'playwright';
const [, , url, out, wait = '15000'] = process.argv;
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-gpu-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
await page.goto(url, { waitUntil: 'load', timeout: 40000 }).catch((e) => errs.push('goto: ' + e.message));
await page.waitForFunction('window.__ready === true', { timeout: Number(wait) }).catch(() => errs.push('timeout waiting for __ready'));
await page.screenshot({ path: out });
console.log(errs.length ? errs.slice(0, 12).join('\n') : 'no errors');
await browser.close();
