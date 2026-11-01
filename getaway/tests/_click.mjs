import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const [,, url, shot] = process.argv;
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1100, height: 620 } }); const errs = [];
p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message + ' ' + e.stack)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ' ' + m.text()); });
await p.goto(url); await p.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
await p.waitForTimeout(1500);
const st = async (l) => console.log(l, JSON.stringify(await p.evaluate(() => ({ mode: __G.mode, top: document.elementFromPoint(550, 310)?.className, menu: document.querySelector('.menu')?.className, btns: [...document.querySelectorAll('.mbtn')].map((b) => b.textContent.slice(0, 20)) }))));
await st('title');
await p.mouse.click(550, 310); await p.waitForTimeout(1500); await st('after click 1');
const btn = await p.$('.mbtn.primary'); if (btn) { const bb = await btn.boundingBox(); console.log('play btn', JSON.stringify(bb)); await p.mouse.click(bb.x + 40, bb.y + bb.height / 2); await p.waitForTimeout(3000); await st('after PLAY'); }
await p.screenshot({ path: shot, timeout: 120000 }); console.log(errs.slice(0, 10).join('\n') || 'no errors'); await b.close();
