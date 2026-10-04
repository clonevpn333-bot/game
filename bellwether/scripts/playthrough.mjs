// Autopilot playthrough: runs the story scripts from chapter N with objectives auto-completed.
import { chromium } from '@playwright/test';
const start = Number(process.argv[2] ?? 0);
const limitMin = Number(process.argv[3] ?? 20);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
await page.addInitScript(() => { window.__shot = true; });
await page.goto(process.env.URL || 'http://127.0.0.1:5190/');
await page.waitForFunction(() => window.__THREE_GAME_DIAGNOSTICS__?.frame > 5 && !document.getElementById('boot-msg'), null, { timeout: 300000 });
await page.evaluate((start) => { const g = window.__THREE_GAME_TEST_HOOKS__.game; g.autopilot = true; g.hud.autopilot = true; g.startChapter(start); }, start);
const t0 = Date.now();
let last = '';
while (Date.now() - t0 < limitMin * 60000) {
  await page.waitForTimeout(2000);
  const st = await page.evaluate(() => { const g = window.__THREE_GAME_TEST_HOOKS__.game; return { ch: g.chapter?.id, state: g.state, obj: document.querySelector('.objective .obj')?.textContent ?? '', log: g.autoLog.splice(0), err: document.getElementById('error-report')?.innerText ?? '' }; });
  for (const l of st.log) console.log('  ' + l);
  const key = `${st.ch}/${st.state}/${st.obj}`;
  if (key !== last) { console.log(`${((Date.now() - t0) / 1000).toFixed(0)}s  ${key}`); last = key; }
  if (st.err) console.log('ERROR PANEL: ' + st.err);
  if (errs.length) console.log(errs.splice(0).join('\n'));
  if (st.state === 'title' && Date.now() - t0 > 10000) { console.log('REACHED TITLE (story complete)'); break; }
}
await browser.close();
