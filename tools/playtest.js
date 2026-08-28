/* Drives the real game in a headless browser: host a room, ready up, fly, jump,
 * land, climb. Reports every console error along the way. */
import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://localhost:4321/games/summit/index.html';
const SHOT = process.argv[3] || '/tmp/summit-play.png';
const STAGE = process.argv[4] || 'lobby';

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
await page.goto(URL, { waitUntil: 'load', timeout: 40000 }).catch((e) => errs.push('goto: ' + e.message));

const log = (...a) => console.log(...a);
await page.waitForTimeout(9000);           // procedural asset build
await page.evaluate(() => {
  const app = window.__summit;
  app.menu.nameInput.value = 'Ada';
  app.menu.serverInput.value = 'ws://localhost:8787/ws';
});
await page.click('text=Host a run').catch(() => errs.push('no host button'));
await page.waitForTimeout(4000);
const room = await page.evaluate(() => ({ id: window.__summit.net.id, code: window.__summit.net.room?.code, mode: window.__summit.mode }));
log('joined:', JSON.stringify(room));

if (STAGE !== 'lobby') {
  await page.click('text=Ready up').catch(() => errs.push('no ready button'));
  await page.waitForTimeout(8000);
  log('phase after ready:', await page.evaluate(() => window.__summit.net.phase));
  // jump out of the plane, then fly down
  await page.evaluate(() => { window.__summit.input.locked = true; });
  for (let i = 0; i < 6; i++) {
    await page.keyboard.down('Space'); await page.waitForTimeout(120); await page.keyboard.up('Space');
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(Number(process.env.FALL_MS || 30000));
  log('phase:', await page.evaluate(() => window.__summit.net.phase),
      'y:', await page.evaluate(() => Math.round(window.__summit.net.pred.y)));
}
await page.screenshot({ path: SHOT });
log(errs.length ? errs.slice(0, 14).join('\n') : 'no errors');
await browser.close();
