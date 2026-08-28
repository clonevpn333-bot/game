/* Two real browser clients, one room: proves the multiplayer path end to end. */
import { chromium } from 'playwright';

const URL = 'http://localhost:4321/games/summit/index.html';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const errs = [];
async function client(name) {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 560 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(`${name} pageerror: ` + (e.stack || e.message).split('\n').slice(0, 3).join(' | ')));
  page.on('console', (m) => { if (m.type() === 'error' && !/favicon|fonts\.g/.test(m.text())) errs.push(`${name} console: ` + m.text()); });
  await page.goto(URL, { waitUntil: 'load', timeout: 40000 });
  await page.waitForTimeout(11000);
  return page;
}
const log = (...a) => console.log(...a);

const a = await client('A');
await a.evaluate(`(() => { const s = window.__summit; s.menu.nameInput.value='Ada'; s.menu.serverInput.value='ws://localhost:8787/ws'; s.menu.host(); })()`);
await a.waitForTimeout(3500);
const code = await a.evaluate('window.__summit.net.room?.code');
log('room code:', code);

const b = await client('B');
await b.evaluate(`(() => { const s = window.__summit; s.menu.nameInput.value='Bo'; s.menu.serverInput.value='ws://localhost:8787/ws'; s.menu.codeInput.value='${code}'; s.menu.join(); })()`);
await b.waitForTimeout(4500);

const rosterA = await a.evaluate('window.__summit.net.room?.players?.map(p => p.n)');
const rosterB = await b.evaluate('window.__summit.net.room?.players?.map(p => p.n)');
log('A sees:', JSON.stringify(rosterA), '| B sees:', JSON.stringify(rosterB));

// walk B forward so A sees movement
await b.evaluate(`(() => { const s = window.__summit; s.panels.lobby.hide(); s.input.locked = true; })()`);
await b.keyboard.down('KeyW');
await b.waitForTimeout(6000);
await b.keyboard.up('KeyW');
await a.waitForTimeout(1500);

const seenByA = await a.evaluate(`(() => {
  const s = window.__summit;
  const others = s.net.sampleOthers(performance.now());
  const rendered = [...(s.lobby?.climbers?.map?.keys() || [])];
  return { others: others.map(o => ({ n: o.n, x: Math.round(o.x), z: Math.round(o.z), anim: o.e })), rendered };
})()`);
log('A sees B at:', JSON.stringify(seenByA));

// B reconnects mid-session
await b.evaluate('window.__summit.net.ws.close()');
await b.waitForTimeout(4500);
log('B resumed as:', await b.evaluate('window.__summit.net.id'), 'status', await b.evaluate('window.__summit.net.status'));
log('A still sees:', JSON.stringify(await a.evaluate('window.__summit.net.room?.players?.map(p => p.n + (p.o ? "" : " (offline)"))')));

await a.screenshot({ path: '/tmp/duo-a.png' });
await b.screenshot({ path: '/tmp/duo-b.png' });
log(errs.length ? errs.slice(0, 10).join('\n') : 'no errors');
await browser.close();
