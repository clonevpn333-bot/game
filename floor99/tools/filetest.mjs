// Verifies a single-file build from file://: boots, loads a floor, steps the game, reports errors.
// node tools/filetest.mjs dist/floor99-performance.html [floor]
import { createRequire } from 'node:module';
import path from 'node:path';
const { chromium } = createRequire(import.meta.url)('playwright');
const file = path.resolve(process.argv[2]), floor = process.argv[3] || '6';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
await page.goto('file://' + file + `?autostart&floor=${floor}`);
await page.waitForFunction(() => window.__floor99 && window.__floor99.game, null, { timeout: 90000 });
const r = await page.evaluate(() => { const A = window.__floor99; A.frozen = true; A.debugStep(12); const g = A.game; return { title: document.title, floor: g.floorDef.name, q: A.renderer.qualityName, shadows: A.renderer.q.shadows, bloom: A.renderer.q.bloom, clips: !!A.host.clips, obj: g.objective.text, enemies: g.enemies.length, blob: !!document.getElementById('f99BlobBtn') }; });
console.log(JSON.stringify(r));
console.log('errors:', errs.length, errs.slice(0, 5));
await browser.close();
