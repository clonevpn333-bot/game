// Headless screenshot helper: node tools/shot.mjs <url> <out.png> [waitMs] [w] [h] [evalJS]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [url, out, wait = '4000', w = '1280', h = '720', js = ''] = process.argv.slice(2);
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
p.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
p.on('pageerror', e => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
await p.goto(url);
await p.waitForTimeout(+wait);
if (js) { const r = await p.evaluate(js); if (r !== undefined) console.log('eval:', JSON.stringify(r)); await p.waitForTimeout(1500); }
await p.screenshot({ path: out });
console.log(logs.slice(-40).join('\n'));
await b.close();
