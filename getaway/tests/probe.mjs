// node tests/probe.mjs "<query>" "<js expr evaluated after wait>" [waitMs] [shot.png]
import { createRequire } from 'module'; const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const [,, query = '', expr = '1', wait = '3000', shot = ''] = process.argv;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const logs = []; page.on('console', (m) => { if (m.type() !== 'log' || logs.length < 10) logs.push(`[${m.type()}] ${m.text()}`); }); page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
await page.goto(`http://localhost:8080/${query.startsWith('tests/') ? query : 'index.html' + query}`);
try { await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 }); } catch (e) { logs.push('TIMEOUT'); }
const steps = expr.split(';;');
for (const s of steps) { if (s.startsWith('wait:')) { await page.waitForTimeout(+s.slice(5)); continue; } try { const r = await page.evaluate(s); if (r !== undefined) console.log('>', typeof r === 'string' ? r : JSON.stringify(r)); } catch (e) { console.log('EVAL ERR', e.message); } }
await page.waitForTimeout(+wait);
if (shot) await page.screenshot({ path: shot, timeout: 180000 });
console.log(logs.join('\n'));
await browser.close();
