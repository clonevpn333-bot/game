#!/usr/bin/env node
/** Screenshot a game running inside the portal, after N seconds of play. */
import { chromium } from 'playwright';
const [id, secs = '4', keys = ''] = process.argv.slice(2);
const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const OUT = process.env.OUT || `/tmp/claude-0/-home-user-game/8ae06583-6754-5b02-a3ba-0e9f4b5cc83d/scratchpad/${id}.png`;
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
p.on('pageerror', (e) => console.log('[pageerror]', e.message));
p.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('[game]')) console.log('[' + m.type() + ']', m.text().slice(0, 200)); });
await p.goto(`${BASE}/arcade.html#/play/${id}`, { waitUntil: 'load' });
await p.waitForSelector('iframe.game-frame');
await p.waitForTimeout(1500);
for (const k of keys.split(',').filter(Boolean)) { await p.keyboard.press(k); await p.waitForTimeout(300); }
await p.waitForTimeout(Number(secs) * 1000);
console.log('hud:', await p.textContent('.hud'));
await p.screenshot({ path: OUT });
console.log('wrote', OUT);
await b.close();
