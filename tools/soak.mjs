#!/usr/bin/env node
/**
 * Multi-game soak (§1.1 acceptance): cycle through the library for N minutes
 * and prove there are no crashes and no monotonic heap growth.
 *
 *   node tools/soak.mjs --minutes=30          # the acceptance run
 *   node tools/soak.mjs --minutes=5           # the CI run
 *   node tools/soak.mjs --minutes=30 --no-diagnostics
 *
 * The leak-test bundle is included by default: a soak that only cycles
 * well-behaved titles proves much less.
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const arg = (name, dflt) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : dflt;
};
const MINUTES = Number(arg('minutes', 5));
const PER_GAME_MS = Number(arg('per-game', 40)) * 1000;
const INCLUDE_DIAG = !process.argv.includes('--no-diagnostics');
const THROTTLE = Number(arg('throttle', 4));

const manifest = JSON.parse(readFileSync('games.json', 'utf8'));
const games = manifest.games.filter((g) => INCLUDE_DIAG || !g.hidden)
  .filter((g) => g.id !== 'pointer-lock-probe');   // needs a click to do anything

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Performance.enable');
if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

let crashed = false;
const errors = [];
page.on('crash', () => { crashed = true; });
page.on('pageerror', (e) => errors.push(e.message));

async function sample(gc = true) {
  if (gc) { try { await cdp.send('HeapProfiler.collectGarbage'); } catch { /* ignore */ } }
  const { metrics } = await cdp.send('Performance.getMetrics');
  const pick = (n) => metrics.find((m) => m.name === n)?.value ?? 0;
  return {
    heapMB: +(pick('JSHeapUsedSize') / 1048576).toFixed(2),
    nodes: pick('Nodes'),
    listeners: pick('JSEventListeners'),
    documents: pick('Documents'),
    contexts: pick('JSHeapTotalSize') / 1048576,
  };
}

await page.goto(`${BASE}/arcade.html`, { waitUntil: 'load' });
await page.waitForSelector('.card', { timeout: 30000 });
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForTimeout(2000);

const baseline = await sample();
console.log(`soak: ${MINUTES} min, ${games.length} titles, ${PER_GAME_MS / 1000}s each, CPU throttle ${THROTTLE}x`);
console.log(`baseline heap ${baseline.heapMB} MB, ${baseline.nodes} nodes, ${baseline.listeners} listeners\n`);
console.log('cycle  game                 fps    heap MB  Δ base   nodes  listeners  docs');

const samples = [];
const deadline = Date.now() + MINUTES * 60000;
let cycle = 0, launches = 0, failedLaunches = 0;

while (Date.now() < deadline && !crashed) {
  const game = games[cycle % games.length];
  cycle++;
  try {
    await page.goto(`${BASE}/arcade.html#/play/${game.id}`, { waitUntil: 'load' });
    // Dispose the handle: a retained ElementHandle keeps its node (and its
    // ancestors) alive in the renderer and shows up as a fake DOM leak.
    const handle = await page.waitForSelector('iframe.game-frame', { timeout: 20000 });
    await handle.dispose();
    await page.waitForFunction((id) => window.__portal?.lastLaunch?.id === id, game.id, { timeout: 25000 });
    launches++;
    // Give each title a nudge so it is actually simulating, not sitting on a
    // title screen.
    await page.keyboard.press('Enter');
    const until = Math.min(Date.now() + PER_GAME_MS, deadline);
    while (Date.now() < until && !crashed) await page.waitForTimeout(1000);
  } catch (err) {
    failedLaunches++;
    errors.push(`${game.id}: ${err.message}`);
  }

  const stats = await page.evaluate(() => window.__portal?.lastStats || null).catch(() => null);
  await page.goto(`${BASE}/arcade.html#/`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(2500);
  const s = await sample();
  s.game = game.id;
  s.fps = stats?.fps ?? null;
  samples.push(s);

  const pad = (v, n) => String(v).padEnd(n);
  console.log(
    pad(cycle, 7) + pad(game.id, 21) + pad(s.fps ? s.fps.toFixed(0) : '—', 7) +
    pad(s.heapMB.toFixed(2), 9) + pad(((s.heapMB - baseline.heapMB) >= 0 ? '+' : '') + (s.heapMB - baseline.heapMB).toFixed(2), 9) +
    pad(s.nodes, 7) + pad(s.listeners, 11) + s.documents
  );
}

await browser.close();

// The first cycle is warm-up, not leakage: launching any game once populates
// caches, compiles code and builds the player view. Growth is judged from the
// first sample onward, with the baseline step reported separately.
const n = samples.length;
const warm = samples.slice(1);
const first = samples[0];
const last = samples[n - 1];

// Least-squares slope over the warm samples: the leak signal is a positive
// trend, not any single high reading.
let slope = 0;
if (warm.length > 1) {
  const meanX = (warm.length - 1) / 2;
  const meanY = warm.reduce((a, s) => a + s.heapMB, 0) / warm.length;
  let num = 0, den = 0;
  warm.forEach((s, i) => { num += (i - meanX) * (s.heapMB - meanY); den += (i - meanX) ** 2; });
  slope = den ? num / den : 0;
}
const growth = last.heapMB - first.heapMB;
const growthPct = (growth / Math.max(0.1, first.heapMB)) * 100;
const nodeGrowth = last.nodes - first.nodes;
const nodesPerCycle = warm.length ? nodeGrowth / warm.length : 0;
const warmupHeap = first.heapMB - baseline.heapMB;
const warmupNodes = first.nodes - baseline.nodes;

console.log(`\ncycles ${cycle} · launches ${launches} (${failedLaunches} failed) · crashes ${crashed ? 1 : 0}`);
console.log(`warm-up (baseline → cycle 1): heap +${warmupHeap.toFixed(2)} MB, nodes +${warmupNodes}`);
console.log(`heap  cycle 1 → ${n}: ${first.heapMB} → ${last.heapMB} MB (${growthPct >= 0 ? '+' : ''}${growthPct.toFixed(1)}%), trend ${slope.toFixed(3)} MB/cycle`);
console.log(`nodes cycle 1 → ${n}: ${first.nodes} → ${last.nodes} (${nodeGrowth >= 0 ? '+' : ''}${nodeGrowth}, ${nodesPerCycle.toFixed(1)}/cycle)`);
if (errors.length) {
  console.log(`\n${errors.length} page error(s):`);
  for (const e of [...new Set(errors)].slice(0, 10)) console.log('  ' + e);
}

const problems = [];
if (crashed) problems.push('the tab crashed');
if (failedLaunches) problems.push(`${failedLaunches} launch(es) failed`);
if (slope > 0.5) problems.push(`heap trends up ${slope.toFixed(2)} MB per cycle after warm-up`);
if (growthPct > 25) problems.push(`heap grew ${growthPct.toFixed(1)}% after the first cycle`);
// Judged as a rate, not a total: a long run should not fail merely for being long.
if (nodesPerCycle > 12) problems.push(`DOM nodes grew ${nodesPerCycle.toFixed(1)} per cycle (${nodeGrowth} total)`);

if (problems.length) {
  console.error('\nSOAK FAILED: ' + problems.join('; '));
  process.exit(1);
}
console.log('\nSoak clean: no crashes, no monotonic growth.');
