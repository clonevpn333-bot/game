// Browser smoke tests. TikTok's player is SIMULATED (routed at https://www.tiktok.com so origin checks are real),
// which lets us force removed / hanging / blocked videos deterministically. Real playback is covered by scripts/check-playback.mjs.
//   node test/e2e/run.mjs            (set CHROME_BIN to use Google Chrome; defaults to Playwright's Chromium)
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { start } from '../../scripts/serve.mjs';

const srv = await start(0); const base = `http://localhost:${srv.address().port}`;
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROME_BIN || '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox'], proxy });
const behaviors = new Map();   // video id -> 'ok' | 'gone' | 'error3001' | 'hang' | 'autoplay'
const PLAYER = (mode) => `<!doctype html><body style="background:#111"><script>
const send = (m) => parent.postMessage({ 'x-tiktok-player': true, ...m }, '*');
const mode = ${JSON.stringify(mode)};
if (mode === 'hang') { /* never answers */ }
else if (mode === 'end3s') { setTimeout(() => send({ type: 'onPlayerReady' }), 60); setTimeout(() => send({ type: 'onStateChange', value: 1 }), 150); setTimeout(() => send({ type: 'onStateChange', value: 0 }), 3200); }
else if (mode === 'pauseonce') { let paused = false; addEventListener('message', (e) => { const d = e.data || {}; if (d.type === 'pause') { paused = true; send({ type: 'onStateChange', value: 2 }); } if (d.type === 'play') { paused = false; send({ type: 'onStateChange', value: 1 }); } });
  setTimeout(() => send({ type: 'onPlayerReady' }), 60); setTimeout(() => send({ type: 'onStateChange', value: 1 }), 150); setTimeout(() => send({ type: 'onStateChange', value: 2 }), 700); }   // iOS-style surprise pause
else if (mode === 'earlyend') { setTimeout(() => send({ type: 'onPlayerReady' }), 60); setTimeout(() => send({ type: 'onStateChange', value: 1 }), 150); setTimeout(() => send({ type: 'onStateChange', value: 0 }), 500); }
else if (mode === 'gone') setTimeout(() => send({ type: 'onPlayerError', value: { errorCode: 1001, errorType: 'INVALID_VIDEO' } }), 80);
else if (mode === 'error3001') setTimeout(() => send({ type: 'onPlayerError', value: { errorCode: 3001, errorType: 'PLAYBACK_ERROR' } }), 80);
else { let paused = false;
  addEventListener('message', (e) => { const d = e.data || {}; if (d.type === 'pause') { paused = true; send({ type: 'onStateChange', value: 2 }); } if (d.type === 'play') { paused = false; send({ type: 'onStateChange', value: 1 }); } });
  setTimeout(() => send({ type: 'onPlayerReady' }), 60);
  if (mode === 'autoplay') setTimeout(() => send({ type: 'onPlayerError', value: { errorCode: 3002 } }), 120);
  else { setTimeout(() => send({ type: 'onMute', value: true }), 90); setTimeout(() => send({ type: 'onStateChange', value: 3 }), 100); setTimeout(() => { if (!paused) send({ type: 'onStateChange', value: 1 }); }, 220); } }
addEventListener('message', (e) => { const d = e.data || {}; send({ type: '__cmd', value: d.type }); if (d.type === 'unMute') send({ type: 'onMute', value: false }); if (d.type === 'mute') send({ type: 'onMute', value: true }); });
</script>`;
async function newPage(url, { readyTimeout = 1500 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage();
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.route('https://www.tiktok.com/player/v1/**', (r) => { const id = new URL(r.request().url()).pathname.split('/').pop(); r.fulfill({ contentType: 'text/html', body: PLAYER(behaviors.get(id) || 'ok') }); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(`${base}/?skipIntro=1&readyTimeout=${readyTimeout}&startTimeout=1500&${url}`); await page.waitForFunction(() => window.__rewind);
  page.errors = errors; page.ctx = ctx; return page;
}
const cur = (p) => p.evaluate(() => window.__rewind.queue.current && window.__rewind.queue.current.id);
const results = []; let failed = 0;
async function t(name, fn) { behaviors.clear(); try { await fn(); results.push(['ok', name]); } catch (e) { failed++; results.push(['FAIL', name, e.message.split('\n')[0]]); } }

await t('boots without errors; 2020 and fall themes differ', async () => {
  const p = await newPage('period=2020'); assert.equal(await p.evaluate(() => document.body.dataset.theme), 'y2020');
  await p.keyboard.press('3'); await p.waitForFunction(() => document.body.dataset.period === '2023-10');
  assert.equal(await p.evaluate(() => document.body.dataset.theme), 'fall');
  const accent = await p.evaluate(() => getComputedStyle(document.body).getPropertyValue('--tint1').trim());
  await p.keyboard.press('1'); await p.waitForFunction(() => document.body.dataset.theme === 'y2020');
  assert.deepEqual(p.errors, []); await p.ctx.close(); assert.ok(accent);
});
await t('arrow keys navigate and keep exactly one visible player (plus at most one hidden preload)', async () => {
  const p = await newPage('period=2023-10'); await p.waitForSelector('.tt-frame'); const a = await cur(p);
  await p.keyboard.press('ArrowDown'); await p.waitForFunction((a) => window.__rewind.queue.current.id !== a, a);
  await p.waitForTimeout(300); assert.equal(await p.locator('.tt-frame:not(.tt-pre)').count(), 1); assert.ok(await p.locator('iframe').count() <= 2);
  await p.waitForTimeout(550); await p.keyboard.press('ArrowUp'); await p.waitForFunction((a) => window.__rewind.queue.current.id === a, a);
  assert.deepEqual(p.errors, []); await p.ctx.close();
});
await t('the next video is preloaded behind the player and a swipe reveals it without a new load', async () => {
  const p = await newPage('period=2023-10'); await p.waitForFunction(() => window.__rewind.player.pre && window.__rewind.player.pre.ready, null, { timeout: 8000 });
  assert.equal(await p.locator('iframe').count(), 2); const nextId = await p.evaluate(() => window.__rewind.player.pre.video.id);
  const src = await p.evaluate(() => window.__rewind.player.pre.frame.src);
  await p.keyboard.press('ArrowDown'); await p.waitForFunction(() => window.__rewind.player.promoted === true && window.__rewind.player.state === 'playing', null, { timeout: 4000 });
  assert.equal(await cur(p), nextId); assert.equal(await p.evaluate(() => window.__rewind.player.frame.src), src, 'same iframe element was reused');
  await p.ctx.close();
});
await t('a dead video is discovered by the preload and removed before the user reaches it', async () => {
  const p = await newPage('period=2023-10'); await p.waitForSelector('.tt-frame');
  const [cur0, nxt, after] = await p.evaluate(() => { const q = window.__rewind.queue; return [q.current.id, q.items[(q.index + 1) % q.length].id, q.items[(q.index + 2) % q.length].id]; });
  behaviors.set(nxt, 'gone');   // cur0 already playing; the NEXT one is dead
  await p.waitForFunction((id) => !window.__rewind.queue.items.some((v) => v.id === id), nxt, { timeout: 12000 });
  await p.keyboard.press('ArrowDown'); await p.waitForFunction((a) => window.__rewind.queue.current.id === a, after, { timeout: 5000 });
  assert.notEqual(cur0, nxt); await p.ctx.close();
});
await t('one swipe moves exactly one video, even if the gesture fires twice', async () => {
  const p = await newPage('period=2023-10'); await p.waitForSelector('.tt-frame'); const [a, b] = await p.evaluate(() => { const q = window.__rewind.queue; return [q.current.id, q.items[(q.index + 1) % q.length].id]; });
  await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(700);
  assert.equal(await cur(p), b, 'a duplicate trigger skipped past the next video'); assert.notEqual(a, b); await p.ctx.close();
});
await t('a spurious early "ended" does not skip the video', async () => {
  const p = await newPage('period=2023-10'); await p.waitForSelector('.tt-frame'); const first = await cur(p); behaviors.set(first, 'earlyend');
  await p.evaluate((id) => { const q = window.__rewind.queue; q.jump(q.items.findIndex((v) => v.id === id)); window.__rewind.present(1); }, first);
  await p.waitForTimeout(2200); assert.equal(await cur(p), first, 'video was skipped by an early ended event'); await p.ctx.close();
});
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
async function iphonePage(extra = '') {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: IPHONE, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  await p.addInitScript(() => { window.__cmds = []; addEventListener('message', (e) => { if (e.data && e.data.type === '__cmd') window.__cmds.push({ t: Date.now(), c: e.data.value }); }); });
  await p.route('https://www.tiktok.com/player/v1/**', (r) => { const id = new URL(r.request().url()).pathname.split('/').pop(); r.fulfill({ contentType: 'text/html', body: PLAYER(behaviors.get(id) || 'ok') }); }); await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto(`${base}/?skipIntro=1&period=2023-10${extra}`); p.ctx = ctx; return p;
}
await t('iPhone: swipes preload + play muted and NEVER send unmute/seek on their own (that pauses video on iOS)', async () => {
  const p = await iphonePage(); await p.waitForFunction(() => window.__rewind.player.state === 'playing');
  await p.waitForFunction(() => window.__rewind.player.pre && window.__rewind.player.pre.ready, null, { timeout: 8000 });
  await p.evaluate(() => { window.__cmds.length = 0; }); await p.keyboard.press('ArrowDown');
  await p.waitForFunction(() => window.__rewind.player.promoted && window.__rewind.player.state === 'playing'); await p.waitForTimeout(3000);
  const cmds = await p.evaluate(() => window.__cmds.map((x) => x.c));
  assert.ok(cmds.includes('play'), 'play not sent'); assert.ok(!cmds.includes('unMute'), 'iOS got an automatic unMute'); assert.ok(!cmds.includes('seekTo'), 'seekTo sent'); await p.ctx.close();
});
await t('iPhone: a surprise pause right after starting is resumed automatically', async () => {
  const p = await iphonePage(); await p.waitForSelector('.tt-frame'); const first = await cur(p); behaviors.set(first, 'pauseonce');
  await p.evaluate((id) => { const q = window.__rewind.queue; q.jump(q.items.findIndex((v) => v.id === id)); window.__rewind.present(1); }, first);
  await p.waitForFunction(() => window.__rewind.player.state === 'playing', null, { timeout: 4000 }); await p.waitForTimeout(1600);
  assert.equal(await p.evaluate(() => window.__rewind.player.state), 'playing', 'stayed paused after iOS paused it'); await p.ctx.close();
});
await t('iPhone: a pause the viewer chose is respected', async () => {
  const p = await iphonePage(); await p.waitForFunction(() => window.__rewind.player.state === 'playing'); await p.waitForTimeout(800);
  await p.keyboard.press(' '); await p.waitForFunction(() => window.__rewind.player.state === 'paused'); await p.waitForTimeout(2000);
  assert.equal(await p.evaluate(() => window.__rewind.player.state), 'paused', 'auto-resumed a viewer pause'); await p.ctx.close();
});
await t('the feed adapts: finishing/saving a vibe raises it, flicking past lowers it, and it persists', async () => {
  const p = await newPage('period=fall'); await p.waitForFunction(() => window.__rewind.player.state === 'playing');
  const tag = await p.evaluate(() => window.__rewind.queue.current.trends[0]);
  await p.keyboard.press('f'); await p.waitForTimeout(300);
  const taste = await p.evaluate(() => JSON.parse(localStorage.getItem('rewind.v4.taste')));
  assert.ok(taste['t:' + tag] > 0, 'favorite raised the vibe'); await p.waitForTimeout(500);
  for (let i = 0; i < 3; i++) { await p.waitForFunction(() => window.__rewind.player.state === 'playing'); await p.waitForTimeout(250); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(500); }
  const after = await p.evaluate(() => JSON.parse(localStorage.getItem('rewind.v4.taste'))); assert.ok(Object.values(after).some((x) => x < 0), 'flicking past created a dislike');
  await p.reload(); await p.waitForFunction(() => window.__rewind.queue.length);
  assert.ok(Object.keys(await p.evaluate(() => JSON.parse(localStorage.getItem('rewind.v4.taste')))).length > 3, 'taste persisted'); await p.ctx.close();
});
await t('sound stays on for the next videos even though TikTok re-mutes every new player', async () => {
  const p = await newPage('period=2023-10'); await p.waitForFunction(() => window.__rewind.player.state === 'playing');
  await p.click('#actMute'); await p.waitForFunction(() => window.__rewind.player.muted === false, null, { timeout: 4000 });
  for (let i = 0; i < 2; i++) {
    await p.waitForTimeout(550); await p.keyboard.press('ArrowDown'); await p.waitForFunction(() => window.__rewind.player.state === 'playing');
    await p.waitForFunction(() => window.__rewind.player.muted === false, null, { timeout: 5000 });
  }
  assert.equal(await p.locator('#soundHint:not([hidden])').count(), 0); await p.ctx.close();
});
await t('a finished video does not auto-advance (autoplay-next is off by default)', async () => {
  const p = await newPage('period=2023-10'); await p.waitForSelector('.tt-frame'); const first = await cur(p); behaviors.set(first, 'end3s');
  await p.evaluate((id) => { const q = window.__rewind.queue; q.jump(q.items.findIndex((v) => v.id === id)); window.__rewind.present(1); }, first);
  await p.waitForTimeout(5000); assert.equal(await cur(p), first, 'advanced by itself'); await p.ctx.close();
});
await t('debug text only appears with ?debug and a tap dismisses it', async () => {
  const a = await newPage('period=2023-10'); await a.keyboard.press('ArrowDown'); await a.waitForTimeout(500); assert.equal(await a.locator('#dbg').count(), 0, 'debug overlay shown without ?debug'); await a.ctx.close();
  const b = await newPage('period=2023-10&debug=1'); await b.keyboard.press('ArrowDown'); await b.waitForSelector('#dbg'); await b.click('#dbg'); assert.equal(await b.locator('#dbg').count(), 0); await b.ctx.close();
});
await t('a removed video (1001) auto-skips, is remembered as broken, and never returns', async () => {
  const p = await newPage('period=2023-10'); await p.waitForSelector('.tt-frame');
  const [first] = await p.evaluate(() => window.__rewind.queue.items.map((v) => v.id)); behaviors.set(first, 'gone');
  await p.evaluate((id) => { const q = window.__rewind.queue; q.jump(q.items.findIndex((v) => v.id === id)); window.__rewind.present(1); }, first);
  await p.waitForFunction((id) => window.__rewind.queue.current.id !== id && !window.__rewind.queue.items.some((v) => v.id === id), first, { timeout: 6000 });
  const health = await p.evaluate(() => JSON.parse(localStorage.getItem('rewind.v4.health')));
  assert.equal(health[first].state, 'broken'); assert.equal(health[first].kind, 'invalid');
  await p.reload(); await p.waitForFunction(() => window.__rewind.queue.length);
  assert.ok(!(await p.evaluate(() => window.__rewind.queue.items.map((v) => v.id))).includes(first), 'broken video came back after reload');
  await p.ctx.close();
});
await t('a hanging video times out (no endless loading) and skips', async () => {
  const p = await newPage('period=2023-11', { readyTimeout: 1200 }); await p.waitForSelector('.tt-frame');
  const first = await cur(p); behaviors.set(first, 'hang');
  await p.evaluate((id) => { const q = window.__rewind.queue; q.jump(q.items.findIndex((v) => v.id === id)); window.__rewind.present(1); }, first);
  await p.waitForSelector('#skipbar:not([hidden])', { timeout: 4000 });
  await p.waitForFunction((id) => window.__rewind.queue.current.id !== id, first, { timeout: 5000 });
  assert.equal((await p.evaluate(() => JSON.parse(localStorage.getItem('rewind.v4.health'))))[first].state, 'timeout'); await p.ctx.close();
});
await t('when everything is blocked, auto-skip stops and explains instead of looping', async () => {
  const p = await newPage('period=2023-12', { readyTimeout: 700 });
  const ids = await p.evaluate(() => window.__rewind.library.map((v) => v.id)); ids.forEach((id) => behaviors.set(id, 'hang'));
  await p.evaluate(() => window.__rewind.present(1));
  await p.waitForFunction(() => document.querySelector('#stPanel') && !document.querySelector('#stPanel').hidden && /isn.t responding/.test(document.querySelector('#stPanel').textContent), null, { timeout: 15000 });
  await p.waitForTimeout(2500); assert.ok(await p.locator('#stPanel:not([hidden])').count(), 'panel stays up'); await p.ctx.close();
});
await t('autoplay-blocked (3002) shows a tap-to-play button instead of failing', async () => {
  const p = await newPage('period=2020'); const first = await cur(p); behaviors.set(first, 'autoplay');
  await p.evaluate((id) => { const q = window.__rewind.queue; q.jump(q.items.findIndex((v) => v.id === id)); window.__rewind.present(1); }, first);
  await p.waitForSelector('#stTap:not([hidden])', { timeout: 4000 }); assert.equal(await cur(p), first); await p.ctx.close();
});
await t('drawer opens; clicking empty background does not reset the feed', async () => {
  const p = await newPage('period=2023-10'); await p.waitForSelector('.tt-frame'); const a = await cur(p);
  await p.mouse.click(60, 400); await p.waitForTimeout(200); assert.equal(await cur(p), a, 'background click changed the video');
  await p.click('#btnMenu'); await p.waitForFunction(() => document.body.classList.contains('menu-open')); await p.waitForFunction(() => document.getElementById('rail').getBoundingClientRect().left >= -1, null, { timeout: 4000 });
  await p.click('[data-coll="unhinged"]'); await p.waitForFunction(() => !document.body.classList.contains('menu-open')); await p.ctx.close();
});
await t('favorites persist across reload and appear in the Favorites feed', async () => {
  const p = await newPage('period=2020'); await p.waitForSelector('.tt-frame'); const id = await cur(p); await p.keyboard.press('f');
  await p.reload(); await p.waitForFunction(() => window.__rewind.queue.length);
  await p.keyboard.press('Escape'); await p.click('#btnMenu'); await p.click('#btnFavs');
  await p.waitForFunction((id) => window.__rewind.queue.items.length === 1 && window.__rewind.queue.items[0].id === id, id); await p.ctx.close();
});
await t('every visit is shuffled differently and mixes creators/trends', async () => {
  const firsts = new Set(); let queue;
  for (let i = 0; i < 4; i++) { const p = await newPage('period=fall'); queue = await p.evaluate(() => window.__rewind.queue.items.map((v) => v.id)); firsts.add(queue.slice(0, 12).join()); await p.ctx.close(); }
  assert.ok(firsts.size >= 3, 'first screens should differ between visits');
});
await t('Transport me jumps somewhere and settings (reduce motion) apply', async () => {
  const p = await newPage('period=2020'); await p.waitForSelector('.tt-frame'); const before = await cur(p);
  await p.click('#btnTransport'); await p.waitForFunction((a) => window.__rewind.queue.current && window.__rewind.queue.current.id !== a, before, { timeout: 5000 });
  await p.evaluate(() => { window.RewindStore.setSetting('reduceMotion', true); }); await p.evaluate(() => window.dispatchEvent(new Event('resize')));
  assert.deepEqual(p.errors, []); await p.ctx.close();
});
await t('mobile viewport: no horizontal scroll, actions reachable', async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }); const p = await ctx.newPage();
  await p.route('https://www.tiktok.com/player/v1/**', (r) => r.fulfill({ contentType: 'text/html', body: PLAYER('ok') }));
  await p.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await p.goto(`${base}/?skipIntro=1&period=2023-09`); await p.waitForSelector('.tt-frame');
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.ok((await p.locator('#actFav').boundingBox()).y < 844); await ctx.close();
});

await browser.close(); srv.close();
for (const r of results) console.log(r[0].padEnd(4), r[1], r[2] ? '\n     ' + r[2] : '');
console.log(`\n${results.length - failed}/${results.length} passed (TikTok player simulated)`); process.exit(failed ? 1 : 0);
