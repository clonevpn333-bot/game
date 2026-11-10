#!/usr/bin/env node
// Screenshot helper for art/gameplay verification.
//   node tools/shot.mjs "<url path>" out.png [width] [height] [waitMs]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { start } from './serve.mjs';
const [, , path = '/index.html', out = 'shot.png', w = '1280', h = '720', wait = '300'] = process.argv;
const server = await start(0);
const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[${m.type()}]`, m.text()); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}${path}`);
await page.waitForFunction('window.__done === true', null, { timeout: 15000 }).catch(() => console.log('(no __done flag)'));
await page.waitForTimeout(+wait);
await page.screenshot({ path: out, fullPage: true });
await browser.close(); server.close();
console.log('saved', out);
