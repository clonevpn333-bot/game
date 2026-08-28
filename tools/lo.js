import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 800, height: 500 } });
const errs = [];
p.on('pageerror', e => errs.push('page: ' + e.message));
await p.goto(process.argv[2], { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForTimeout(Number(process.argv[3] || 12000));
console.log('canvas:', await p.evaluate('document.querySelectorAll("canvas").length').catch(()=>'busy'));
console.log('title:', await p.title().catch(()=>'?'));
console.log(errs.length ? errs.slice(0,4).join('\n') : 'no errors');
await b.close();
