// Headless screenshot helper: node tests/shot.mjs "<query>" out.png [waitMs] [w] [h]
import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const [,, query = '', out = 'shot.png', wait = '4000', w = '1280', h = '720'] = process.argv;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
await page.goto(`http://localhost:8080/${query.startsWith("tests/") ? query : "index.html" + query}`);
try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 }); } catch (e) { logs.push('TIMEOUT waiting for __ready'); }
await page.waitForTimeout(+wait);
console.log(logs.slice(0, 60).join('\n'));
const t0 = Date.now(); await page.screenshot({ path: out, timeout: 180000 }); console.log('screenshot ms', Date.now() - t0);
const frames = await page.evaluate(() => window.__frames || 0);
console.log('frames', frames);
await browser.close();
