import { chromium } from '@playwright/test';
const states = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__shot = true; });
await page.goto('http://127.0.0.1:5188/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__THREE_GAME_DIAGNOSTICS__ && window.__THREE_GAME_DIAGNOSTICS__.frame > 5, null, { timeout: 180000 });
for (const st of states) {
  const t0 = Date.now();
  try {
    await page.evaluate(async (s) => { await window.__THREE_GAME_TEST_HOOKS__.setState(s); }, st);
    await page.waitForTimeout(st === 'title' ? 4000 : 2500);
    await page.screenshot({ path: `/tmp/claude-0/shots/${st.replace(':', '_')}.png` });
    const info = await page.evaluate(() => { const r = window.__THREE_GAME_DIAGNOSTICS__.renderer; return { calls: r.render.calls, tris: r.render.triangles, geo: r.memory.geometries, tex: r.memory.textures }; });
    const fps = await page.evaluate(async () => { const d = window.__THREE_GAME_DIAGNOSTICS__; const f0 = d.frame, t = performance.now(); await new Promise((r) => setTimeout(r, 4000)); return ((d.frame - f0) / ((performance.now() - t) / 1000)).toFixed(1); });
    console.log(st, JSON.stringify(info), 'fps', fps, (Date.now() - t0) + 'ms');
  } catch (e) { console.log('FAIL', st, e.message); }
}
console.log(errors.slice(0, 30).join('\n'));
await browser.close();
