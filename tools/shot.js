#!/usr/bin/env node
/* Screenshot harness.
 * node tools/shot.js <out.png> [--file game.html] [--w 1600] [--h 900]
 *                    [--wait 6000] [--q "?mission=m03&cap=1"]
 *                    [--js "window.VH.debug.foo()"]  (run after wait, then settle 600ms)
 *                    [--seq "key:KeyW:900,move:800:400,click:800:400,wait:500"]
 * Prints console errors / page errors to stdout. Always exits 0 unless the page never boots.
 */
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const path = require('path'), fs = require('fs');

function arg(n, d) { const i = process.argv.indexOf('--' + n); return i > -1 ? process.argv[i + 1] : d; }

(async () => {
  const out = path.resolve(process.argv[2] || 'shot.png');
  const file = path.resolve(arg('file', path.join(__dirname, '..', 'volthaven.html')));
  const W = +arg('w', 1600), H = +arg('h', 900);
  const wait = +arg('wait', 6000);
  const q = arg('q', '');
  const jsCode = arg('js', '');
  const seq = arg('seq', '');

  const browser = await pw.chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
           '--ignore-gpu-blocklist', '--enable-webgl', '--disable-dev-shm-usage', '--no-sandbox'],
  });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  // Egress policy blocks cdnjs from this sandbox. The shipped HTML still points at cdnjs;
  // for local capture we serve the identical r128 build from disk.
  const localThree = path.join(__dirname, 'three.r128.min.js');
  if (fs.existsSync(localThree)) {
    await page.route('**/three.js/r128/three.min.js', r =>
      r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(localThree, 'utf8') }));
  }
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push('[' + m.type() + '] ' + m.text()); });
  page.on('pageerror', e => errs.push('[pageerror] ' + (e && e.message ? e.message : String(e)) + '\n' + ((e && e.stack) || '').split('\n').slice(0, 4).join('\n')));

  const url = 'file://' + file + (q ? (q.startsWith('?') ? q : '?' + q) : '');
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });

  // Wait for the game to signal readiness (or just time out).
  await page.waitForFunction(() => window.VH && window.VH.booted === true, null, { timeout: Math.max(wait, 20000) }).catch(() => {});
  await page.waitForTimeout(wait);

  if (seq) {
    for (const step of seq.split(',')) {
      const p = step.trim().split(':');
      try {
        if (p[0] === 'key') { await page.keyboard.down(p[1]); await page.waitForTimeout(+p[2] || 200); await page.keyboard.up(p[1]); }
        else if (p[0] === 'tap') { await page.keyboard.press(p[1]); await page.waitForTimeout(+p[2] || 120); }
        else if (p[0] === 'move') { await page.mouse.move(+p[1], +p[2]); }
        else if (p[0] === 'click') { await page.mouse.move(+p[1], +p[2]); await page.mouse.down(); await page.waitForTimeout(+p[3] || 90); await page.mouse.up(); }
        else if (p[0] === 'hold') { await page.mouse.move(+p[1], +p[2]); await page.mouse.down(); await page.waitForTimeout(+p[3] || 500); await page.mouse.up(); }
        else if (p[0] === 'wheel') { await page.mouse.wheel(0, +p[1] || 100); }
        else if (p[0] === 'wait') { await page.waitForTimeout(+p[1] || 300); }
      } catch (e) { errs.push('[seq] ' + step + ' -> ' + e.message); }
    }
  }

  if (jsCode) {
    try { await page.evaluate(jsCode); } catch (e) { errs.push('[eval] ' + e.message); }
    await page.waitForTimeout(+arg('settle', 900));
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.screenshot({ path: out });

  const state = await page.evaluate(() => {
    try { return (window.VH && window.VH.debug && window.VH.debug.state) ? window.VH.debug.state() : null; } catch (e) { return null; }
  }).catch(() => null);

  await browser.close();
  console.log('shot -> ' + out);
  if (state) console.log('state: ' + JSON.stringify(state));
  const uniq = [...new Set(errs)].slice(0, 25);
  if (uniq.length) { console.log('--- console (' + errs.length + ') ---'); uniq.forEach(e => console.log(e)); }
  else console.log('--- console clean ---');
})().catch(e => { console.error('HARNESS FAIL: ' + e.message); process.exit(2); });
