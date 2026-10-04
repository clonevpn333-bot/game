// Named-state screenshots: node scripts/shot.mjs ch1:avenue prologue:reveal ...
import { chromium } from '@playwright/test';
const states = process.argv.slice(2);
const OUT = process.env.OUT || '/tmp/claude-0/bw';
const W = +(process.env.W || 1280), H = +(process.env.H || 720);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
await page.addInitScript(() => { window.__shot = true; });
await page.goto(process.env.URL || 'http://127.0.0.1:5190/', { waitUntil: 'load', timeout: 300000 });
await page.waitForFunction(() => window.__THREE_GAME_DIAGNOSTICS__ && window.__THREE_GAME_DIAGNOSTICS__.frame > 5 && !document.getElementById('boot-msg'), null, { timeout: 300000 });
for (const st of states) {
  const t0 = Date.now();
  try {
    await page.evaluate(async (s) => { await window.__THREE_GAME_TEST_HOOKS__.setState(s); }, st);
    await page.evaluate(() => window.__THREE_GAME_TEST_HOOKS__.setPausedForScreenshot(false));
    await page.waitForTimeout(st === 'title' ? 3000 : 2500);
    await page.screenshot({ path: `${OUT}/${st.replace(':', '_')}.png`, timeout: 180000 });
    const info = await page.evaluate(() => { const r = window.__THREE_GAME_DIAGNOSTICS__.renderer; return { calls: r.render.calls, tris: r.render.triangles, geo: r.memory.geometries, tex: r.memory.textures }; });
    console.log(st, JSON.stringify(info), (Date.now() - t0) + 'ms');
  } catch (e) { console.log('FAIL', st, e.message.split('\n')[0]); }
}
console.log(errors.slice(0, 20).join('\n'));
await browser.close();
