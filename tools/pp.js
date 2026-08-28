import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 800, height: 500 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('http://localhost:4321/games/summit/index.html', { waitUntil: 'load' });
await p.waitForTimeout(10000);
await p.evaluate(`(() => { const a = window.__summit; a.menu.nameInput.value='Ada'; a.menu.serverInput.value=''; a.menu.host(); })()`);
await p.waitForTimeout(11000);
await p.evaluate(`window.__summit.panels.lobby.toggle()`);
await p.waitForTimeout(18000);
console.log(JSON.stringify(await p.evaluate(`(() => { const a = window.__summit; const s = a.net.latest();
  return { mode: a.mode, phase: a.net.phase, hasRun: !!a.run, climbers: a.run?.climbers?.map?.size,
    items: a.run?.objects?.itemNodes?.size, snapIt: s?.it?.length ?? null, snapPlayers: s?.p?.length ?? null,
    id: a.net.id, seed: a.seed, worldSeed: a.world?.seed }; })()`)));
await b.close();
