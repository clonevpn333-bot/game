// Automated smoke/play test: boots the game in headless Chromium, captures console errors,
// drives the player with real keyboard input, and saves screenshots.
// Usage: node tools/smoke.mjs [floor] [seconds] [outDir]
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { console.error('Playwright is needed for the smoke test: npm i -D playwright'); process.exit(1); }
import fs from 'node:fs';

const floor = process.argv[2] || '1';
const seconds = +(process.argv[3] || 20);
const out = process.argv[4] || 'shots';
const port = process.env.PORT || 8099;
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text(); if (!/GL_|WebGL|GPU stall|swiftshader|Automatic fallback/i.test(t)) errors.push(`[${m.type()}] ${t}`); } });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + e.stack));
const url = floor === 'menu' ? `http://localhost:${port}/?autostart` : `http://localhost:${port}/?autostart&floor=${floor}${process.env.CP ? '&cp=' + process.env.CP : ''}`;
await page.goto(url);
const t0 = Date.now();
let shot = 0;
const snap = async (name) => { await page.screenshot({ path: `${out}/${String(shot++).padStart(2, '0')}-${name}.png` }); };
await page.waitForTimeout(4000);
await snap('start');
const keys = ['KeyW', 'KeyA', 'KeyD', 'KeyS'];
let i = 0;
while (Date.now() - t0 < seconds * 1000) {
  const k = keys[i % keys.length];
  await page.keyboard.down(k);
  if (i % 3 === 0) await page.keyboard.press('Space');
  if (i % 5 === 1) await page.keyboard.press('KeyC');
  await page.waitForTimeout(700);
  await page.keyboard.up(k);
  i++;
  if (i % 4 === 0) await snap('t' + Math.round((Date.now() - t0) / 1000));
  const st = await page.evaluate(() => { const a = window.__floor99; const g = a.game; return g ? { state: a.state, t: g.time.toFixed(1), hp: Math.round(g.player.hp), pos: g.player.pos.toArray().map((v) => +v.toFixed(1)), enemies: g.enemies.length, obj: g.objective.text, fps: Math.round(1 / Math.max(1e-3, a.clock.getDelta())) } : { state: a.state }; });
  console.log(JSON.stringify(st));
}
await snap('end');
console.log('ERRORS:', errors.length);
for (const e of errors.slice(0, 30)) console.log(e);
await browser.close();
