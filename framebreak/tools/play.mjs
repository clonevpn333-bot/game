#!/usr/bin/env node
// Scripted playtest driver. Runs the real game in headless Chromium, feeds it
// keyboard input and captures screenshots / state for verification.
//   node tools/play.mjs <script.mjs> [outDir]
// A script exports `default async (api) => {}` with:
//   api.page, api.shot(name), api.keys(str|[codes], ms), api.wait(ms),
//   api.eval(fn), api.goto(query)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { start } from './serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const [, , scriptPath, outDir = 'shots'] = process.argv;
mkdirSync(outDir, { recursive: true });
const server = await start(0), port = server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const size = (process.env.SIZE || '1280x720').split('x').map(Number);
const page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') { errors.push(m.text()); console.log('[console.error]', m.text()); } else if (process.env.VERBOSE) console.log('[log]', m.text()); });
page.on('pageerror', (e) => { errors.push(e.message); console.log('[pageerror]', e.message, '\n', (e.stack || '').split('\n').slice(0, 4).join('\n')); });

const api = {
  page, errors,
  async goto(query = '') { await page.goto(`http://localhost:${port}/index.html${query}`); await page.waitForFunction('window.__ready === true', null, { timeout: 30000 }); },
  async shot(name) { const p = resolve(outDir, name + '.png'); await page.screenshot({ path: p }); console.log('shot', p); return p; },
  wait: (ms) => page.waitForTimeout(ms),
  async keys(codes, ms = 100) { const list = Array.isArray(codes) ? codes : [codes]; for (const c of list) await page.keyboard.down(c); await page.waitForTimeout(ms); for (const c of list) await page.keyboard.up(c); },
  async tap(code, gap = 60) { await page.keyboard.down(code); await page.waitForTimeout(40); await page.keyboard.up(code); await page.waitForTimeout(gap); },
  eval: (fn, arg) => page.evaluate(fn, arg),
};
try {
  const mod = await import(pathToFileURL(resolve(scriptPath)).href);
  await mod.default(api);
} catch (e) { console.log('[script error]', e.message); }
console.log(errors.length ? `DONE with ${errors.length} error(s)` : 'DONE clean');
await browser.close(); server.close();
