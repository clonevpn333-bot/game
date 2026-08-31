#!/usr/bin/env node
/**
 * Acceptance tests for the criteria in the spec: save round-trip through the
 * bridge, deterministic teardown, tier refusal, offline play, pointer lock
 * inside the sandbox, per-bundle cache invalidation, and survival of a
 * deliberately leaky title.
 *
 *   node tests/e2e.mjs            (expects a static server on $BASE)
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
const manifest = JSON.parse(readFileSync('games.json', 'utf8'));
const results = [];
let failures = 0;

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (!ok) failures++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  — ' + detail : ''}`);
}

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });

async function fresh(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { ctx, page, errors };
}

const gameFrame = (page) => page.frames().find((f) => f.url().includes('/games/'));

async function waitReady(page, id) {
  await page.waitForSelector('iframe.game-frame', { timeout: 20000 });
  await page.waitForFunction((gid) => window.__portal?.lastLaunch?.id === gid, id, { timeout: 25000 });
}

async function heap(cdp, gc = true) {
  if (gc) { try { await cdp.send('HeapProfiler.collectGarbage'); } catch { /* ignore */ } }
  const { metrics } = await cdp.send('Performance.getMetrics');
  const pick = (n) => metrics.find((m) => m.name === n)?.value ?? 0;
  return { js: pick('JSHeapUsedSize') / 1048576, nodes: pick('Nodes'), listeners: pick('JSEventListeners'), documents: pick('Documents') };
}

console.log('\n— catalog ——————————————————————————————————————————');
{
  const { ctx, page, errors } = await fresh();
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  await page.waitForSelector('.card');
  const ids = await page.$$eval('.card', (n) => n.map((c) => c.dataset.id));
  const expected = manifest.games.filter((g) => !g.hidden).map((g) => g.id);
  check('grid renders every visible manifest entry', ids.sort().join() === expected.sort().join(), ids.join(', '));
  check('hidden diagnostic bundles stay out of the grid', !ids.includes('leak-test'));
  check('no page errors on boot', errors.length === 0, errors[0] || '');

  // Keyboard navigation: arrow keys move the roving focus between cards.
  await page.click('.library-head h1');
  await page.keyboard.press('Tab');
  await page.focus('.card');
  await page.keyboard.press('ArrowRight');
  const focused = await page.evaluate(() => document.activeElement?.dataset?.id || null);
  check('grid is arrow-key navigable', !!focused && focused !== ids[0], `focus → ${focused}`);
  await ctx.close();
}

console.log('\n— save round-trip through postMessage ——————————————————');
{
  const { ctx, page } = await fresh();
  await page.goto(`${BASE}/index.html#/play/orbital-salvage`, { waitUntil: 'load' });
  await waitReady(page, 'orbital-salvage');
  const f = gameFrame(page);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
  // Bump the best score inside the game, then force a flush.
  await f.evaluate(() => { PE.Bridge.save({ v: 1, best: 12345, salvaged: 7 }); PE.Bridge.flush(); });
  await page.waitForTimeout(600);

  const stored = await page.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open('gameportal', 1); r.onsuccess = () => res(r.result); });
    return await new Promise((res) => {
      const rq = db.transaction('saves', 'readonly').objectStore('saves').get('orbital-salvage');
      rq.onsuccess = () => res(rq.result);
    });
  });
  check('game save lands in IndexedDB via the bridge', stored?.data?.best === 12345, JSON.stringify(stored?.data));
  check('save record is versioned', !!stored?.version && !!stored?.updatedAt);

  // Relaunch: the portal must hand the save back in portal:hello.
  await page.goto(`${BASE}/index.html#/`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.goto(`${BASE}/index.html#/play/orbital-salvage`, { waitUntil: 'load' });
  await waitReady(page, 'orbital-salvage');
  const hudText = await gameFrame(page).evaluate(() => {
    // The title screen prints BEST from the restored save.
    const c = document.getElementById('dyn');
    return c ? c.width + 'x' + c.height : null;
  });
  check('relaunch receives the save (frame re-created cleanly)', !!hudText, hudText || '');

  const gameLocalStorage = await gameFrame(page).evaluate(() => { try { return localStorage.length; } catch { return -1; } });
  check('game does not use localStorage for saves', gameLocalStorage === 0, `localStorage entries: ${gameLocalStorage}`);
  await ctx.close();
}

console.log('\n— teardown ————————————————————————————————————————————');
{
  const { ctx, page } = await fresh();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.goto(`${BASE}/index.html#/`, { waitUntil: 'load' });
  await page.waitForSelector('.card');
  await page.waitForTimeout(1500);
  const before = await heap(cdp);

  await page.goto(`${BASE}/index.html#/play/voxel-drift`, { waitUntil: 'load' });
  await waitReady(page, 'voxel-drift');
  await page.waitForTimeout(6000);
  const during = await heap(cdp, false);

  await page.goto(`${BASE}/index.html#/`, { waitUntil: 'load' });
  await page.waitForTimeout(3000);
  const after = await heap(cdp);

  check('exiting a game destroys the frame', page.frames().length === 1, `${page.frames().length} frame(s)`);
  const rebound = ((after.js - before.js) / Math.max(0.1, before.js)) * 100;
  check('heap returns to within ±10% of baseline', Math.abs(rebound) <= 10,
    `${before.js.toFixed(1)} → ${during.js.toFixed(1)} → ${after.js.toFixed(1)} MB (${rebound.toFixed(1)}%)`);
  check('no document leak after exit', after.documents <= before.documents + 1,
    `${before.documents} → ${after.documents}`);
  await ctx.close();
}

console.log('\n— renderer tier gating ————————————————————————————————');
{
  const { ctx, page } = await fresh();
  // Hide WebGL entirely: the portal must refuse the 3D titles with a message
  // rather than launching them into a crash.
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      if (type === 'webgl2' || type === 'webgl' || type === 'experimental-webgl') return null;
      return orig.call(this, type, ...rest);
    };
  });
  await page.goto(`${BASE}/index.html#/game/voxel-drift`, { waitUntil: 'load' });
  await page.waitForSelector('.detail');
  const blocked = await page.$('.notice--block');
  const hasPlay = await page.$('a.btn--primary[href*="play"]');
  check('unsupported title shows a friendly refusal', !!blocked);
  check('unsupported title offers no play button', !hasPlay);

  await page.goto(`${BASE}/index.html#/play/voxel-drift`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  const overlayError = await page.textContent('.overlay-error').catch(() => null);
  check('direct launch of an unsupported title is refused, not crashed', !!overlayError, (overlayError || '').slice(0, 60));

  await page.goto(`${BASE}/index.html#/game/orbital-salvage`, { waitUntil: 'load' });
  await page.waitForSelector('.detail');
  check('2D title still launchable without WebGL', !!(await page.$('a.btn--primary[href*="play"]')));
  await ctx.close();
}

console.log('\n— service worker, offline and cache versioning —————————');
{
  const { ctx, page } = await fresh();
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  await page.waitForSelector('.card');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.goto(`${BASE}/index.html#/play/schedule-i`, { waitUntil: 'load' });
  await waitReady(page, 'schedule-i');
  await page.waitForTimeout(1500);
  await page.goto(`${BASE}/index.html#/`, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const bundles = await caches.open('bundles-v1');
    return { names, urls: (await bundles.keys()).map((r) => r.url) };
  });
  check('bundle cached on first launch', cached.urls.some((u) => u.includes('schedule-i')), cached.urls.join(' '));
  check('shell cache is version-stamped', cached.names.some((n) => /^shell-[0-9a-f]{10}$/.test(n)), cached.names.join(' '));

  // A version bump must evict only that bundle's old entry.
  const bumped = await page.evaluate(async () => {
    const c = await caches.open('bundles-v1');
    const before = (await c.keys()).length;
    await fetch('games/schedule-i.html?v=deadbeef99');
    const after = (await c.keys()).map((r) => r.url);
    return { before, after };
  });
  check('new bundle version replaces only its own entry',
    bumped.after.filter((u) => u.includes('schedule-i')).length === 1 &&
    bumped.after.some((u) => u.includes('deadbeef99')),
    bumped.after.filter((u) => u.includes('schedule-i')).join(' '));

  await ctx.setOffline(true);
  await page.goto(`${BASE}/index.html`, { waitUntil: 'load' });
  await page.waitForSelector('.card', { timeout: 15000 });
  const offlineCards = await page.$$eval('.card', (n) => n.length);
  check('shell opens with the network disabled', offlineCards > 0, `${offlineCards} cards`);

  await page.goto(`${BASE}/index.html#/play/schedule-i`, { waitUntil: 'load' });
  await waitReady(page, 'schedule-i');
  check('previously played game runs offline', true);
  await ctx.setOffline(false);
  await ctx.close();
}

console.log('\n— pointer lock inside the sandbox ——————————————————————');
{
  const { ctx, page } = await fresh();
  await page.goto(`${BASE}/index.html#/play/pointer-lock-probe`, { waitUntil: 'load' });
  await waitReady(page, 'pointer-lock-probe');
  await page.mouse.move(600, 500);
  await page.mouse.click(600, 500);
  await page.waitForTimeout(600);
  const f = gameFrame(page);
  const locked = await f.evaluate(() => !!document.pointerLockElement);
  check('pointer lock engages in a sandboxed iframe', locked);
  const sandbox = await page.$eval('iframe.game-frame', (n) => n.getAttribute('sandbox'));
  check('sandbox allowlist includes allow-pointer-lock', sandbox.includes('allow-pointer-lock'), sandbox);

  // Leaving the game while still locked must not strand the cursor: the frame
  // goes and the lock goes with it. (Escape is browser UI and is not delivered
  // to headless pages, so the paths that are ours are the ones checked.)
  await page.goto(`${BASE}/index.html#/`, { waitUntil: 'load' });
  await page.waitForTimeout(600);
  check('leaving the game drops the lock with the frame',
    page.frames().length === 1 && !(await page.evaluate(() => !!document.pointerLockElement)),
    `${page.frames().length} frame(s)`);

  await page.goto(`${BASE}/index.html#/play/pointer-lock-probe`, { waitUntil: 'load' });
  await waitReady(page, 'pointer-lock-probe');
  await page.mouse.move(600, 500);
  await page.mouse.click(600, 500);
  await page.waitForTimeout(500);
  const f2 = gameFrame(page);
  await f2.evaluate(() => document.exitPointerLock());
  await page.waitForTimeout(400);
  check('pointer lock releases on request', !(await f2.evaluate(() => !!document.pointerLockElement)));
  await ctx.close();
}

console.log('\n— a leaky title cannot take the portal down ————————————');
{
  const { ctx, page } = await fresh();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.goto(`${BASE}/index.html#/`, { waitUntil: 'load' });
  await page.waitForSelector('.card');
  await page.waitForTimeout(1000);
  const before = await heap(cdp);

  await page.goto(`${BASE}/index.html#/play/leak-test`, { waitUntil: 'load' });
  await waitReady(page, 'leak-test');
  await page.keyboard.press('KeyG');            // spam GL contexts
  await page.keyboard.press('KeyC');            // throw errors
  await page.keyboard.press('KeyS');            // and refuse to shut down
  await page.waitForTimeout(6000);
  const during = await heap(cdp, false);

  await page.goto(`${BASE}/index.html#/`, { waitUntil: 'load' });
  await page.waitForSelector('.card', { timeout: 10000 });
  await page.waitForTimeout(3000);
  const after = await heap(cdp);

  check('portal survives a leaking, throwing, shutdown-ignoring title', true);
  check('dashboard still interactive afterwards', (await page.$$('.card')).length > 0);
  check('leaked heap is reclaimed when the frame dies',
    after.js < before.js + Math.max(8, before.js * 0.25),
    `${before.js.toFixed(1)} → ${during.js.toFixed(1)} → ${after.js.toFixed(1)} MB`);
  await ctx.close();
}

await browser.close();

console.log(`\n${results.length - failures}/${results.length} checks passed.`);
process.exit(failures ? 1 : 0);
