// Launches the game in headless Chromium, runs scripted actions and saves screenshots.
// usage: node test/browser-shot.mjs [outDir] [scenario]
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const out = path.resolve(process.argv[2] || path.join(root, 'test', 'shots'));
const scenario = process.argv[3] || 'overview';
fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  fs.readFile(path.join(root, p), (err, data) => {
    if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(0);
const port = server.address().port;
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message + '\n' + e.stack));
await page.goto(`http://localhost:${port}/index.html${process.argv[4] || ''}`);
await page.waitForFunction(() => window.game && window.game.renderer && !document.getElementById('boot'), null, { timeout: 120000 });
const shot = async (name) => { await page.screenshot({ path: path.join(out, name + '.png') }); console.log('saved', name); };
const wait = (ms) => page.waitForTimeout(ms);
const scenarios = (await import(path.join(root, 'test', 'scenarios.mjs'))).default;
await scenarios[scenario]({ page, shot, wait });
const stats = await page.evaluate(() => ({ fps: Math.round(window.game.fps), time: window.game.world.history.timeStr(window.game.world.time), calls: window.game.renderer.r.info.render.calls, tris: window.game.renderer.r.info.render.triangles }));
console.log('stats', JSON.stringify(stats));
console.log(errors.slice(0, 30).join('\n') || 'no console errors');
await browser.close();
server.close();
