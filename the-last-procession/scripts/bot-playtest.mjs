#!/usr/bin/env node
// Headless bot playtest: starts each chapter and drives it with the in-game Bot
// (real input intents) on a fixed-step simulation, then reports progression.
// Usage: node scripts/bot-playtest.mjs [url] [index:seconds ...]
//   e.g. node scripts/bot-playtest.mjs http://127.0.0.1:4188 0:260 1:320 7:700
// Set PW_EXECUTABLE_PATH to use a specific Chromium build.
import { chromium } from '@playwright/test';

const [url = 'http://127.0.0.1:4188', ...argSpecs] = process.argv.slice(2);
const specs = argSpecs.length ? argSpecs : ['0:260', '1:320', '2:320', '3:320', '4:320', '5:320', '6:320', '7:700'];
const exe = process.env.PW_EXECUTABLE_PATH;
const browser = await chromium.launch(exe ? { executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } : { channel: 'chromium' });
const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url);
await page.waitForFunction(() => !!window.__LAST_PROCESSION_QA__, null, { timeout: 30000 });
let ok = true;
for (const spec of specs) {
  const [i, secs] = spec.split(':').map(Number);
  await page.evaluate((i) => window.__LAST_PROCESSION_QA__.start(i, ''), i);
  await page.waitForFunction((i) => window.__THREE_GAME_DIAGNOSTICS__?.score === i, i, { timeout: 30000 });
  const r = await page.evaluate(async ([s, i]) => window.__LAST_PROCESSION_QA__.simulate(s, { stopAtChapter: i + 1 }), [secs, i]);
  const done = r.index > i || (i === 7 && r.checkpoint === 'epilogue');
  ok &&= done;
  console.log(`${done ? 'PASS' : 'FAIL'} chapter ${i} -> ${r.chapter}/${r.checkpoint} fails=${r.fails}`);
  for (const e of r.events.filter((e) => /win|fail /.test(e) && !e.includes('checkpoint'))) console.log('   ' + e);
}
if (errors.length) console.log('page errors:\n' + errors.slice(0, 10).join('\n'));
await browser.close();
process.exit(ok && !errors.length ? 0 : 1);
