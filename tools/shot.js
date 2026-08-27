/* Headless smoke test + screenshot. Usage: node tools/shot.js <url> <out.png> [waitMs] */
import { chromium } from 'playwright';
const [, , url, out, wait = '2500'] = process.argv;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('requestfailed', (r) => errors.push('reqfail: ' + r.url() + ' ' + (r.failure()?.errorText || '')));
await page.goto(url, { waitUntil: 'load', timeout: 30000 }).catch((e) => errors.push('goto: ' + e.message));
await page.waitForTimeout(Number(wait));
if (out) await page.screenshot({ path: out });
console.log(errors.length ? errors.slice(0, 14).join('\n') : 'no errors');
await browser.close();
