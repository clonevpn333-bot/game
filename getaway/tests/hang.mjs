// node tests/hang.mjs "<query>" <script.js>  — runs the script; if the page stops responding, pauses it via CDP and prints the JS stack
import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright'); import fs from 'fs';
const [,, query = '', file] = process.argv;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } }); let lastHB = Date.now(), hb = '';
page.on('console', (m) => { const t = m.text(); if (t.startsWith('HB ')) { lastHB = Date.now(); hb = t; return; } if (!t.includes('404') && !t.includes('Canvas2D')) console.log(`[${m.type()}] ${t}`); });
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}\n${e.stack}`)); page.on('crash', () => { console.log('!!! PAGE CRASHED, last heartbeat: ' + hb); process.exit(1); });
await page.goto(`http://localhost:8080/index.html${query}`); await page.waitForFunction(() => window.__ready === true, null, { timeout: 90000 });
const cdp = await page.context().newCDPSession(page); await cdp.send('Debugger.enable');
cdp.on('Debugger.paused', async (ev) => { console.log('=== PAUSED (hang) — last heartbeat: ' + hb); for (const f of ev.callFrames.slice(0, 25)) console.log(`  at ${f.functionName || '(anon)'} ${f.url.replace(/^.*\/src\//, 'src/')}:${f.location.lineNumber + 1}:${f.location.columnNumber + 1}`);
  try { const r = await cdp.send('Debugger.evaluateOnCallFrame', { callFrameId: ev.callFrames[0].callFrameId, expression: 'JSON.stringify(Object.fromEntries(Object.entries(this||{}).filter(([k,v])=>typeof v!=="object"&&typeof v!=="function").slice(0,20)))' }); console.log('  this:', r.result.value); } catch (e) {}
  for (const sc of ev.callFrames[0].scopeChain.slice(0, 1)) { try { const p = await cdp.send('Runtime.getProperties', { objectId: sc.object.objectId }); console.log('  locals:', p.result.slice(0, 25).map((x) => `${x.name}=${x.value ? (x.value.value ?? x.value.description) : '?'}`.slice(0, 80)).join(' | ')); } catch (e) {} }
  process.exit(2); });
await page.evaluate(() => { const g = __game; const f = g.frame.bind(g); let n = 0; g.frame = (...a) => { if (++n % 15 === 0) console.log('HB f=' + n + ' t=' + __G.time.toFixed(2)); return f(...a); }; });
const job = page.evaluate(fs.readFileSync(file, 'utf8')).then((r) => { console.log('RESULT', r); process.exit(0); }).catch((e) => console.log('EVAL ERR', e.message));
setInterval(async () => { if (Date.now() - lastHB > 12000) { lastHB = Date.now() + 1e9; console.log('no heartbeat for 12s → pausing'); await cdp.send('Debugger.pause'); } }, 1000);
