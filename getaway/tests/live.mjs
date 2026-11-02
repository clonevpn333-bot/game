// node tests/live.mjs "<query>" <script.js>  — runs the script in the page, streaming console.log live (survives page crashes)
import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright'); import fs from 'fs';
const [,, query = '', file] = process.argv;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
page.on('console', (m) => console.log(`[${m.type()}] ${m.text()}`)); page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}\n${e.stack}`)); page.on('crash', () => console.log('!!! PAGE CRASHED'));
await page.goto(`http://localhost:8080/index.html${query}`);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
try { const r = await page.evaluate(fs.readFileSync(file, 'utf8')); console.log('RESULT', r); } catch (e) { console.log('EVAL ERR', e.message); }
await browser.close();
