/* Two browser tabs, no server at all: one hosts in-tab, the other dials the code. */
import { chromium } from 'playwright';
const URL = 'http://localhost:4321/games/summit/index.html';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const errs = [];
async function tab(tag) {
  const page = await (await browser.newContext({ viewport: { width: 900, height: 560 } })).newPage();
  page.on('pageerror', (e) => errs.push(`${tag} pageerror: ` + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts\.g/.test(m.text())) errs.push(`${tag} console: ` + m.text()); });
  await page.goto(URL, { waitUntil: 'load', timeout: 40000 });
  await page.waitForTimeout(10000);
  return page;
}
const log = (...a) => console.log(...a);
const a = await tab('HOST');
await a.evaluate(`(() => { const s = window.__summit; s.menu.nameInput.value='Ada'; s.menu.host(); })()`);
await a.waitForTimeout(9000);
const code = await a.evaluate('window.__summit.net.room?.code');
log('host code:', code, '| host id:', await a.evaluate('window.__summit.net.id'));
if (!code) { log('host failed:', await a.evaluate('window.__summit.menu.error.textContent')); }

if (code) {
  const b = await tab('GUEST');
  await b.evaluate(`(() => { const s = window.__summit; s.menu.nameInput.value='Bo'; s.menu.codeInput.value='${code}'; s.menu.join(); })()`);
  await b.waitForTimeout(14000);
  log('guest id:', await b.evaluate('window.__summit.net.id'),
      '| guest err:', await b.evaluate('window.__summit.menu.error.textContent'));
  log('host roster:', JSON.stringify(await a.evaluate('window.__summit.net.room?.players?.map(p => p.n)')));
  log('guest roster:', JSON.stringify(await b.evaluate('window.__summit.net.room?.players?.map(p => p.n)')));
  log('guest snapshots:', await b.evaluate('window.__summit.net.snapshots.length'));
}
log(errs.length ? errs.slice(0, 8).join('\n') : 'no errors');
await browser.close();
