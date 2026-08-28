import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.goto(process.argv[2], { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', { timeout: 30000 }).catch(() => errs.push('no ready'));
const info = await page.evaluate('(' + process.argv[3] + ')()');
console.log(JSON.stringify(info, null, 1));
if (errs.length) console.log(errs.join('\n'));
await browser.close();
