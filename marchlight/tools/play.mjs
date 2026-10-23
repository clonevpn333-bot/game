// Scenario runner: node tools/play.mjs <scenario.mjs> [url] — scenario default export async ({page, shot, wait, key, ev, log})
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'node:path';
const [scen, url = 'http://localhost:8080/index.html'] = process.argv.slice(2);
const outDir = process.env.OUT || '/tmp/claude-0/-home-user-game/d07be3d3-70a3-5fb5-b77a-ef8b8d9dfbe9/scratchpad/shots';
import fs from 'node:fs'; fs.mkdirSync(outDir, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await b.newPage({ viewport: { width: +(process.env.W || 1280), height: +(process.env.H || 720) } });
const logs = [];
page.on('console', m => { const t = `[${m.type()}] ${m.text()}`; logs.push(t); if (m.type() === 'error' || process.env.VERBOSE) console.log(t); });
page.on('pageerror', e => { const t = `[pageerror] ${e.message}\n${e.stack}`; logs.push(t); console.log(t); });
await page.goto(url);
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
const wait = ms => page.waitForTimeout(ms);
const shot = async name => { const f = path.join(outDir, name + '.png'); await page.screenshot({ path: f }); console.log('shot', f); };
const ev = (fn, arg) => page.evaluate(fn, arg);
const key = async (code, ms = 100) => { await ev(c => window.__game.input.keys.add(c), code); await wait(ms); await ev(c => window.__game.input.keys.delete(c), code); };
const log = (...a) => console.log(...a);
const mod = await import(path.resolve(scen));
try { await mod.default({ page, shot, wait, key, ev, log }); } catch (e) { console.log('SCENARIO ERROR', e); }
await b.close();
