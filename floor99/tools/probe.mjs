// Fast-forward probe: node tools/probe.mjs <floor> <seconds> [cp] — prints state every 5 s of game time.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [floor = '4', secs = '40', cp = '0'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text().slice(0, 300)); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 4).join(' | ')));
page.on('crash', () => console.log('CRASH'));
await page.addInitScript(() => { try { localStorage.setItem('floor99.save.v1', JSON.stringify({ settings: { quality: 'low', qualityPicked: true, voice: true } })); } catch (e) {} });
await page.goto(`http://localhost:8099/?autostart&floor=${floor}&cp=${cp}${process.env.FAST ? '&fast' : ''}`);
await page.waitForFunction(() => window.__floor99 && window.__floor99.game, null, { timeout: 60000 });
for (let t = 0; t < +secs; t += 5) {
  const r = await page.evaluate(() => { const A = window.__floor99; A.frozen = true; A.debugStep(5); const g = A.game; return { t: g?.time?.toFixed(1), hp: g?.player?.hp, en: g?.enemies.filter((e) => e.alive).length, obj: g?.objective?.text + ' | ' + g?.objective?.sub, mem: (performance.memory.usedJSHeapSize / 1e6).toFixed(0) + 'MB', st: A.state, line: A.host.current?.text?.slice(0, 40), q: A.host.queue.length, scripts: g?.scripts?.length }; });
  console.log(JSON.stringify(r));
}
console.log(errs.slice(0, 15).join('\n'));
await browser.close();
