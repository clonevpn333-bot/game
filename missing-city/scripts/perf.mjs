// Per-chapter frame-rate and draw-call probe (software GL numbers are only relative).
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 800, height: 450 } });
await page.addInitScript(() => { window.__shot = true; });
await page.goto(process.env.URL || 'http://127.0.0.1:5188/');
await page.waitForFunction(() => window.__THREE_GAME_DIAGNOSTICS__?.frame > 5, null, { timeout: 180000 });
const chapters = process.argv.slice(2).map(Number);
for (const i of chapters.length ? chapters : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
  await page.evaluate((i) => window.__THREE_GAME_TEST_HOOKS__.game.startChapter(i), i);
  await page.waitForFunction(() => window.__THREE_GAME_TEST_HOOKS__.game.state === 'playing', null, { timeout: 120000 });
  await page.waitForTimeout(3000);
  const r = await page.evaluate(async () => {
    const g = window.__THREE_GAME_TEST_HOOKS__.game;
    const f0 = window.__THREE_GAME_DIAGNOSTICS__.frame, t0 = performance.now();
    await new Promise((res) => setTimeout(res, 4000));
    const info = g.engine.renderer.info;
    return { id: g.chapter.id, fps: ((window.__THREE_GAME_DIAGNOSTICS__.frame - f0) / ((performance.now() - t0) / 1000)).toFixed(1), calls: info.render.calls, tris: info.render.triangles, geos: info.memory.geometries, tex: info.memory.textures };
  });
  console.log(JSON.stringify(r));
}
await browser.close();
