import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 1200, height: 720 } });
const errs = [];
p.on('pageerror', e => errs.push('page: ' + e.message));
p.on('console', m => { if (m.type()==='error' && !/favicon|fonts\.g|ERR_/.test(m.text())) errs.push('con: ' + m.text()); });
await p.goto('http://localhost:4399/', { waitUntil: 'load' });
await p.waitForTimeout(2500);
await p.evaluate(`location.hash = location.hash.replace(/\\/play\\/.*$/,'') + '/play/summit'`);
await p.waitForTimeout(16000);
console.log('frames:', p.frames().length);
const inner = p.frames().find(f => f !== p.mainFrame());
console.log('summit booted:', inner ? await inner.evaluate('!!window.__summit').catch(e => 'err ' + e.message) : 'no iframe');
await p.screenshot({ path: process.argv[2] });
console.log(errs.length ? errs.slice(0,6).join('\n') : 'no errors');
await b.close();
