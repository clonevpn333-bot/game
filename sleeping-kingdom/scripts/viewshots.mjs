// Dev QA: capture model-viewer frames. Usage: node scripts/viewshots.mjs out.png "char=knight&pose=guard&yaw=0.5" ...(4 queries)
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
const [out, ...queries] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 800, height: 800 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
const files = [];
for (const [i, qs] of queries.entries()) {
  await page.goto(`http://127.0.0.1:5188/model.html?${qs}`);
  await page.waitForFunction(() => (window.__VIEW_FRAMES__ ?? 0) > 40, null, { timeout: 60000 });
  const f = `${out.replace(/\.png$/, '')}-${i}.png`;
  await page.screenshot({ path: f });
  files.push(f);
}
await browser.close();
while (files.length < 4) files.push(files[files.length - 1]);
execFileSync('node', ['scripts/grid.mjs', out, ...files.slice(0, 4)]);
console.log('wrote', out);
