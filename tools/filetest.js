/* Opens the built single file the way a person would: straight off disk. */
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1200, height: 720 } });
const errs = [];
p.on('pageerror', e => errs.push('page: ' + (e.stack||e.message).split('\n').slice(0,3).join(' | ')));
p.on('console', m => { if (m.type()==='error' && !/fonts\.g|favicon|ERR_/.test(m.text())) errs.push('con: ' + m.text()); });
await p.goto('file:///home/user/game/dist/nova-arcade.html', { waitUntil: 'load' });
await p.waitForTimeout(4000);
console.log('url:', await p.evaluate('location.href'));
console.log('origin:', await p.evaluate('String(location.origin)'));
console.log('cards rendered:', await p.evaluate('document.querySelectorAll(".card").length'));
// go straight into Summit, the hardest case (sandboxed srcdoc iframe)
await p.evaluate(`location.hash = location.hash.replace(/\\/play\\/.*$/, '') + '/play/summit'`);
await p.waitForTimeout(16000);
const inner = p.frames().find(f => f !== p.mainFrame());
console.log('summit booted:', inner ? await inner.evaluate('!!window.__summit').catch(e => 'err ' + e.message) : 'no iframe');
console.log('summit menu:', inner ? await inner.evaluate('!!document.querySelector(".screen")').catch(() => 'n/a') : 'n/a');
await p.screenshot({ path: process.argv[2] });
console.log(errs.length ? errs.slice(0,6).join('\n') : 'no errors');
await b.close();
