// Renders cast lineups from preview.html: node scripts/preview-shot.mjs out.png "set=humans&anim=walk" [w h]
import { chromium } from '@playwright/test';
const [out, qs = 'set=humans', w = '1600', h = '700'] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto(`http://127.0.0.1:5190/preview.html?${qs}`);
try { await p.waitForFunction(() => (window.__frames ?? 0) > 2, null, { timeout: 120000 }); } catch (e) { console.log('ERRS', errs.join('\n')); throw e; }
const step = /step=([\d.]+)/.exec(qs);
if (step) await p.evaluate((s) => window.__step(s), +step[1]);
await p.waitForTimeout(800);
await p.screenshot({ path: out });
if (errs.length) console.log(errs.join('\n'));
await b.close();
