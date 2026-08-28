/* Drives the real game in a headless browser through a whole run and reports
 * every console error on the way. Usage: node tools/playtest.js [url] [out.png] */
import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://localhost:4321/games/summit/index.html';
const SHOT = process.argv[3] || '/tmp/summit-play.png';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts\.g/.test(m.text())) errs.push('console: ' + m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 4).join(' | ')));
const log = (...a) => console.log(...a);
const phase = () => page.evaluate('window.__summit?.net?.phase');
const info = () => page.evaluate('({ y: Math.round(window.__summit.net.pred.y), mode: window.__summit.mode, hp: window.__summit.net.meState()?.h, st: Math.round(window.__summit.net.pred.stamina) })');
async function waitPhase(p, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await phase() === p) return true; await page.waitForTimeout(700); }
  return false;
}

await page.goto(URL, { waitUntil: 'load', timeout: 40000 });
await page.waitForTimeout(11000);
await page.evaluate(`(() => { const a = window.__summit; a.menu.nameInput.value='Ada'; a.menu.serverInput.value=''; a.menu.host(); })()`);
await page.waitForTimeout(4000);
log('room:', await page.evaluate('window.__summit.net.room?.code'), '| mode:', await page.evaluate('window.__summit.mode'));

await page.evaluate(`window.__summit.panels.lobby.toggle()`);
log('flight:', await waitPhase('flight', 22000));
await page.evaluate(`(() => { window.__summit.input.locked = true; document.querySelectorAll('.screen').forEach(e => e.style.display='none'); })()`);

// hold the jump key through the window so we leave the plane
for (let i = 0; i < 26; i++) {
  if (await phase() !== 'flight') break;
  await page.keyboard.press('Space');
  await page.waitForTimeout(900);
}
log('dive:', await phase(), JSON.stringify(await info()));
log('climb:', await waitPhase('climb', 150000), JSON.stringify(await info()));

// walk uphill for a bit with the grip held
await page.evaluate(`(() => { const a = window.__summit; const m = a.net.pred; a.cam.yaw = Math.atan2(m.x, m.z); })()`);
await page.keyboard.down('KeyW');
await page.mouse.down().catch(() => {});
await page.waitForTimeout(25000);
await page.keyboard.up('KeyW');
await page.mouse.up().catch(() => {});
log('after climbing:', JSON.stringify(await info()));
log('items seen:', await page.evaluate('window.__summit.run?.objects?.itemNodes?.size ?? 0'));
log('climbers:', await page.evaluate('window.__summit.run?.climbers?.map?.size ?? 0'));
await page.screenshot({ path: SHOT });
log(errs.length ? errs.slice(0, 12).join('\n') : 'no errors');
await browser.close();
