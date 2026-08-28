/* Hosts a run and screenshots the moment you are sitting in the plane. */
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1200, height: 720 } });
const errs = [];
p.on('pageerror', e => errs.push('page: ' + (e.stack||e.message).split('\n').slice(0,3).join(' | ')));
await p.goto('http://localhost:4321/games/summit/index.html', { waitUntil: 'load' });
await p.waitForTimeout(11000);
await p.evaluate(`(() => { const a = window.__summit; a.menu.nameInput.value='Ada'; a.menu.serverInput.value=''; a.menu.host(); })()`);
await p.waitForTimeout(9000);
await p.evaluate(`window.__summit.panels.lobby.toggle()`);
for (let i = 0; i < 40; i++) {
  if (await p.evaluate('window.__summit.net.phase') === 'flight') break;
  await p.waitForTimeout(700);
}
await p.evaluate(`(() => { const a = window.__summit; a.input.locked = true; document.querySelectorAll('.screen').forEach(e => e.style.display='none'); })()`);
await p.waitForTimeout(9000);
console.log(JSON.stringify(await p.evaluate(`(() => { const a = window.__summit;
  return { phase: a.net.phase, anim: a.net.meState()?.e, first: a.cam.first, seated: a.run?.wasSeated,
           camY: Math.round(a.stage.camera.position.y), planeY: Math.round(a.run?.plane?.position.y ?? -1) }; })()`)));
await p.screenshot({ path: process.argv[2] });
console.log(errs.length ? errs.slice(0,5).join('\n') : 'no errors');
await b.close();
