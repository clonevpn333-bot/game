#!/usr/bin/env node
/**
 * Benchmarks the portal against the §4 table on a simulated low-end profile
 * (4x CPU throttle, DPR 1, 1366x768 — a typical low-end Chromebook panel).
 *
 *   node tools/bench.mjs [--no-throttle] [--games a,b]
 *
 * Exits non-zero if any measurement crosses its fail threshold.
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const THROTTLE = !process.argv.includes('--no-throttle') ? 4 : 1;
const gamesArg = (process.argv.find((a) => a.startsWith('--games=')) || '').split('=')[1];

const SHELL_FILES = [
  'arcade.html', 'portal/css/shell.css', 'portal/js/shell.js', 'portal/js/router.js',
  'portal/js/catalog.js', 'portal/js/views.js', 'portal/js/launcher.js',
  'portal/js/storage.js', 'portal/js/capabilities.js', 'manifest.webmanifest', 'games.json',
];

const rows = [];
const record = (metric, value, unit, target, fail, better = 'lower') => {
  const ok = better === 'lower' ? value <= fail : value >= fail;
  const good = better === 'lower' ? value <= target : value >= target;
  rows.push({ metric, value, unit, target, fail, ok, good });
};

// ---- static: shell transfer size ----------------------------------------
let shellGz = 0;
for (const f of SHELL_FILES) {
  shellGz += gzipSync(readFileSync(f), { level: 9 }).length;
}
record('Shell transfer (gzipped)', +(shellGz / 1024).toFixed(1), 'KB', 150, 250);

const manifest = JSON.parse(readFileSync('games.json', 'utf8'));
const games = manifest.games.filter((g) => !g.hidden && (!gamesArg || gamesArg.split(',').includes(g.id)));

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

async function newPage(context) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  await cdp.send('Performance.enable');
  return { page, cdp };
}

/**
 * Real heap accounting. performance.memory is bucketed to ~10 MB and cannot
 * see the difference the ±10% criterion is about, so measurements go through
 * CDP with an explicit collection first.
 */
async function heapMB(cdp, { gc = true } = {}) {
  if (gc) { try { await cdp.send('HeapProfiler.collectGarbage'); } catch { /* not enabled */ } }
  const { metrics } = await cdp.send('Performance.getMetrics');
  const used = metrics.find((m) => m.name === 'JSHeapUsedSize');
  return used ? +(used.value / 1048576).toFixed(1) : null;
}

// ---- cold shell load ------------------------------------------------------
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const { page } = await newPage(ctx);
  await page.goto(`${BASE}/arcade.html`, { waitUntil: 'load' });
  await page.waitForSelector('.card', { timeout: 30000 });
  const paint = await page.evaluate(() => {
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    const nav = performance.getEntriesByType('navigation')[0];
    return {
      fcp: fcp ? fcp.startTime : null,
      // The shell is interactive once the grid is in the DOM and the main
      // thread is free; the portal marks that itself.
      tti: performance.getEntriesByName('portal-interactive')[0]?.startTime ?? null,
      transfer: nav ? nav.transferSize : 0,
    };
  });
  record('Shell first contentful paint', +(paint.fcp / 1000).toFixed(2), 's', 1.0, 1.8);
  record('Shell time to interactive', +(paint.tti / 1000).toFixed(2), 's', 2.0, 3.5);
  await ctx.close();
}

// ---- per-game launch + frame rate ----------------------------------------
const perGame = [];
for (const game of games) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  const { page, cdp } = await newPage(ctx);

  // Cold: fresh profile, nothing cached.
  await page.goto(`${BASE}/arcade.html#/play/${game.id}`, { waitUntil: 'load' });
  const cold = await launchMs(page);

  // Back to the library, settle, and take the baseline the exit is judged
  // against. The service worker now holds the bundle, so the next launch is warm.
  await page.goto(`${BASE}/arcade.html#/`, { waitUntil: 'load' });
  await page.waitForTimeout(2000);
  const baseline = await heapMB(cdp);

  await page.goto(`${BASE}/arcade.html#/play/${game.id}`, { waitUntil: 'load' });
  const warm = await launchMs(page);

  // Sustained frame rate over 12 s of running.
  await page.waitForTimeout(12000);
  const stats = await page.evaluate(() => window.__portal?.lastStats || null);
  const heapPlaying = await heapMB(cdp, { gc: false });

  // Exit and let the heap settle: the frame is gone, so this is the portal's
  // own footprint again.
  await page.goto(`${BASE}/arcade.html#/`, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const heapAfter = await heapMB(cdp);

  perGame.push({
    id: game.id, cold, warm,
    fps: stats?.fps ?? null, scale: stats?.scale ?? null,
    heapPlaying, heapAfter, baseline,
    reboundPct: baseline ? +(((heapAfter - baseline) / baseline) * 100).toFixed(1) : null,
  });
  await ctx.close();
}

async function launchMs(page) {
  await page.waitForSelector('iframe.game-frame', { timeout: 30000 });
  await page.waitForFunction(() => window.__portal?.lastLaunch, null, { timeout: 30000 });
  return page.evaluate(() => Math.round(window.__portal.lastLaunch.ms));
}

await browser.close();

// ---- roll up -------------------------------------------------------------
const worstCold = Math.max(...perGame.map((g) => g.cold));
const worstWarm = Math.max(...perGame.map((g) => g.warm));
const worstFps = Math.min(...perGame.map((g) => g.fps ?? 0));
const worstHeap = Math.max(...perGame.map((g) => g.heapPlaying ?? 0));

record('Cold launch to interactive (worst)', worstCold, 'ms', 3000, 6000);
record('Warm launch to interactive (worst)', worstWarm, 'ms', 500, 1200);
record('Sustained frame rate (worst)', +worstFps.toFixed(1), 'fps', 60, 30, 'higher');
record('Per-game steady-state heap (worst)', worstHeap, 'MB', 400, 400);

const worstRebound = Math.max(...perGame.map((g) => Math.abs(g.reboundPct ?? 0)));
record('Heap after exit vs baseline (worst)', worstRebound, '%', 10, 10);

console.log(`\nLowspec Arcade benchmark — CPU throttle ${THROTTLE}x, ${games.length} titles\n`);
const pad = (s, n) => String(s).padEnd(n);
console.log(pad('metric', 38) + pad('value', 12) + pad('target', 12) + pad('fail at', 12) + 'status');
console.log('-'.repeat(84));
for (const r of rows) {
  const status = !r.ok ? 'FAIL' : r.good ? 'pass' : 'pass (over target)';
  console.log(pad(r.metric, 38) + pad(`${r.value} ${r.unit}`, 12) + pad(r.target, 12) + pad(r.fail, 12) + status);
}

console.log('\nper title:');
console.log(pad('game', 20) + pad('cold ms', 10) + pad('warm ms', 10) + pad('fps', 8) + pad('res', 8) +
  pad('heap MB', 10) + pad('baseline', 10) + pad('after', 10) + 'rebound');
for (const g of perGame) {
  console.log(pad(g.id, 20) + pad(g.cold, 10) + pad(g.warm, 10) +
    pad(g.fps ? g.fps.toFixed(1) : '—', 8) + pad(g.scale ? Math.round(g.scale * 100) + '%' : '—', 8) +
    pad(g.heapPlaying ?? '—', 10) + pad(g.baseline ?? '—', 10) + pad(g.heapAfter ?? '—', 10) +
    (g.reboundPct == null ? '—' : (g.reboundPct > 0 ? '+' : '') + g.reboundPct + '%'));
}

const failed = rows.filter((r) => !r.ok);
if (failed.length) {
  console.error(`\n${failed.length} metric(s) past the fail threshold.`);
  process.exit(1);
}
console.log('\nAll metrics within thresholds.');
