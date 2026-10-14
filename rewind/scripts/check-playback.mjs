#!/usr/bin/env node
// Plays each post in a real Chrome and records whether TikTok's player actually reaches "playing".
//   node scripts/check-playback.mjs --chrome="/path/to/chrome" [--only=verified] [--limit=40] [--out=rewind-health.json]
//   node scripts/apply-health.mjs rewind-health.json        # writes playback:"ok" into the library
// Needs: npm i (playwright-core) and a Chrome with H.264 (Google Chrome — NOT the bundled open-source Chromium,
// which cannot decode TikTok video). Audio output isn't checked; only that the stream decodes and advances.
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
import { readLib } from './lib.mjs';
import { start } from './serve.mjs';
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split(/=(.*)/s).slice(0, 2)).map(([k, v]) => [k, v ?? true]));
const chrome = args.chrome || process.env.CHROME_BIN;
if (!chrome) { console.error('Pass --chrome=/path/to/google-chrome'); process.exit(1); }
const vids = readLib().videos.filter((v) => v.status !== 'broken' && (!args.only || v.status === args.only)).slice(0, Number(args.limit) || 1e9);
const srv = await start(0);
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } : undefined;
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'], proxy });
const results = {}; let i = 0;
const save = () => writeFileSync(args.out || 'rewind-health.json', JSON.stringify({ exportedAt: new Date().toISOString(), results }, null, 1));
async function probe(page, id) {
  return page.evaluate((id) => new Promise((resolve) => {
    const f = document.createElement('iframe'); f.allow = 'autoplay'; f.style.cssText = 'width:360px;height:640px;border:0';
    f.src = `https://www.tiktok.com/player/v1/${id}?autoplay=1&controls=0`;
    const done = (r) => { removeEventListener('message', on); clearTimeout(t); f.remove(); resolve(r); };
    const on = (e) => { if (e.origin !== 'https://www.tiktok.com' || e.source !== f.contentWindow || !e.data || e.data['x-tiktok-player'] !== true) return;
      if (e.data.type === 'onStateChange' && e.data.value === 1) done({ state: 'ok' });
      if (e.data.type === 'onPlayerError') { const v = e.data.value || {}; done({ state: 'error', code: v.errorCode ?? v.code ?? null, kind: v.errorCode === 1001 ? 'invalid' : 'error' }); } };
    const t = setTimeout(() => done({ state: 'timeout', kind: 'timeout' }), 15000);
    addEventListener('message', on); document.body.appendChild(f);
  }), id);
}
async function worker() {
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.route('**/__probe', (r) => r.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }));
  await page.goto(`http://localhost:${srv.address().port}/__probe`);
  while (i < vids.length) {
    const v = vids[i++]; let r = await probe(page, v.id);
    if (r.state !== 'ok' && r.kind !== 'invalid') r = await probe(page, v.id);   // one retry
    results[v.id] = { ...r, at: new Date().toISOString() };
    if (Object.keys(results).length % 20 === 0) save();   // incremental, so a long run survives interruption
    console.log(`${r.state.padEnd(7)} ${v.id} ${r.code ?? ''} ${v.creator ? '@' + v.creator : ''}`);
  }
  await ctx.close();
}
await Promise.all(Array.from({ length: Number(args.workers) || 4 }, worker));
await browser.close(); srv.close();
const tally = Object.values(results).reduce((m, r) => ((m[r.state] = (m[r.state] || 0) + 1), m), {});
console.log('\n', tally); save();
