#!/usr/bin/env node
/**
 * Capture a thumbnail per game by running it in the portal and screenshotting
 * the frame. Real gameplay beats hand-drawn art, and JPEG at 640x360 keeps
 * each card's image in the tens of kilobytes on a metered connection.
 *
 *   node tools/gen-thumbs.mjs            # all games
 *   node tools/gen-thumbs.mjs voxel-drift
 */
import { readFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const OUT = 'portal/thumbs';
mkdirSync(OUT, { recursive: true });

const manifest = JSON.parse(readFileSync('games.json', 'utf8'));
const only = process.argv.slice(2);
const games = manifest.games.filter((g) => !only.length || only.includes(g.id));

// Per-game warm-up: keys to press and how long to let the game run first.
const WARMUP = {
  'schedule-i': { keys: ['Enter'], wait: 3500 },
  // The imported titles decode an embedded Three.js build before they draw
  // anything, and do it on a software rasteriser here, so they need real time.
  'summit': { keys: [], wait: 11000 },
  'voxel-sandbox': { keys: [], wait: 12000 },
  'bonecrown': { keys: [], wait: 11000 },
  'night-city': { keys: [], wait: 14000 },
  'neon-drift': { keys: [], wait: 10000 },
  'vector-siege': { keys: ['Enter'], wait: 4000 },
  'lumen': { keys: ['Enter'], wait: 4000 },
  'leak-test': { keys: [], wait: 2500 },
  'pointer-lock-probe': { keys: [], wait: 1500 },
};

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

for (const game of games) {
  // Sized so the game frame lands on exactly 640x360 after the two chrome bars.
  const page = await browser.newPage({ viewport: { width: 640, height: 360 + 56 + 44 }, deviceScaleFactor: 1 });
  try {
    await page.goto(`${BASE}/arcade.html#/play/${game.id}`, { waitUntil: 'load' });
    await page.waitForSelector('iframe.game-frame', { timeout: 15000 });
    const w = WARMUP[game.id] || { keys: [], wait: 3000 };
    await page.waitForTimeout(1200);
    for (const k of w.keys) { await page.keyboard.press(k); await page.waitForTimeout(200); }
    await page.waitForTimeout(w.wait);
    const frame = await page.$('iframe.game-frame');
    const box = await frame.boundingBox();
    await frame.screenshot({ path: `${OUT}/${game.id}.jpg`, type: 'jpeg', quality: 72 });
    console.log(`${game.id.padEnd(20)} ${Math.round(box.width)}x${Math.round(box.height)}`);
  } catch (err) {
    console.error(`${game.id}: ${err.message}`);
  } finally {
    await page.close();
  }
}
await browser.close();
