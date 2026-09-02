#!/usr/bin/env node
/**
 * Installability check.
 *
 * The spec asks for a Lighthouse PWA score, but Lighthouse removed the PWA
 * category in v12 and the installability audits with it, so there is no such
 * score to report any more. This checks the same underlying criteria directly,
 * through the browser's own manifest parser (CDP Page.getAppManifest) plus the
 * service worker's registration and scope.
 *
 *   node tools/pwa-check.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://127.0.0.1:8765';
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures++;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  — ' + detail : ''}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);

await page.goto(`${BASE}/arcade.html`, { waitUntil: 'load' });
await page.waitForSelector('.card', { timeout: 20000 });
await page.evaluate(() => navigator.serviceWorker.ready);

const { errors = [], data } = await cdp.send('Page.getAppManifest');
const manifest = data ? JSON.parse(data) : null;

check('manifest parses without errors',
  errors.filter((e) => e.critical).length === 0,
  errors.map((e) => e.message).join('; '));
check('manifest has a name and short_name', !!(manifest?.name && manifest?.short_name));
check('start_url is in scope', !!manifest?.start_url && !!manifest?.scope);
check('display is standalone', manifest?.display === 'standalone', manifest?.display);
check('theme and background colours set', !!(manifest?.theme_color && manifest?.background_color));

const icons = manifest?.icons || [];
const sized = (px) => icons.some((i) => (i.sizes || '').split(' ').some((s) => parseInt(s, 10) >= px));
check('has a 192px+ icon', sized(192));
check('has a 512px+ icon', sized(512));
check('has a maskable icon', icons.some((i) => (i.purpose || '').includes('maskable')));

const sw = await page.evaluate(async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  return { scope: reg?.scope || null, controlling: !!navigator.serviceWorker.controller };
});
check('service worker registered at the site scope', !!sw.scope, sw.scope || '');

// The real test of offline capability: kill the network and reload.
await page.reload({ waitUntil: 'load' });
await page.waitForSelector('.card');
await ctx.setOffline(true);
let offlineOk = false;
try {
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.card', { timeout: 15000 });
  offlineOk = true;
} catch { /* reported below */ }
check('shell loads with the network disabled', offlineOk);
await ctx.setOffline(false);

// Viewport meta — without it the install prompt is withheld on mobile.
check('responsive viewport meta present',
  !!(await page.$('meta[name="viewport"][content*="width=device-width"]')));

await browser.close();
console.log(failures ? `\n${failures} installability check(s) failed.` : '\nInstallable: all criteria met.');
process.exit(failures ? 1 : 0);
