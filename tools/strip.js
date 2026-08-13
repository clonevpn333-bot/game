#!/usr/bin/env node
/* Animation / motion contact-sheet harness.
 * Captures N canvas frames at a fixed interval INSIDE the page and tiles them into
 * one PNG grid so a critic can judge motion from a single image.
 *
 * node tools/strip.js <out.png> [--file game.html] [--w 1280] [--h 720]
 *      [--frames 9] [--every 110]  (ms between captures)
 *      [--wait 6000] [--q "?cap=1&mission=m01"]
 *      [--seq "..."]   (input driven BEFORE capture starts; same syntax as shot.js)
 *      [--during "key:KeyW:1200"] (input driven while capturing, fire-and-forget)
 *      [--cols 3] [--scale 0.5]
 * NOTE: requires the page to create its WebGLRenderer with preserveDrawingBuffer
 *       when the `cap` query flag is present (see src/CONTRACT.md).
 */
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/node22/lib/node_modules/playwright'); }
const path = require('path'), fs = require('fs');
function arg(n, d) { const i = process.argv.indexOf('--' + n); return i > -1 ? process.argv[i + 1] : d; }

async function drive(page, seq, errs) {
  for (const step of (seq || '').split(',').filter(Boolean)) {
    const p = step.trim().split(':');
    try {
      if (p[0] === 'key') { await page.keyboard.down(p[1]); await page.waitForTimeout(+p[2] || 200); await page.keyboard.up(p[1]); }
      else if (p[0] === 'tap') { await page.keyboard.press(p[1]); await page.waitForTimeout(+p[2] || 120); }
      else if (p[0] === 'down') { await page.keyboard.down(p[1]); }
      else if (p[0] === 'up') { await page.keyboard.up(p[1]); }
      else if (p[0] === 'move') { await page.mouse.move(+p[1], +p[2]); }
      else if (p[0] === 'click') { await page.mouse.move(+p[1], +p[2]); await page.mouse.down(); await page.waitForTimeout(+p[3] || 90); await page.mouse.up(); }
      else if (p[0] === 'hold') { await page.mouse.move(+p[1], +p[2]); await page.mouse.down(); await page.waitForTimeout(+p[3] || 500); await page.mouse.up(); }
      else if (p[0] === 'mdown') { await page.mouse.move(+p[1], +p[2]); await page.mouse.down(); }
      else if (p[0] === 'mup') { await page.mouse.up(); }
      else if (p[0] === 'wait') { await page.waitForTimeout(+p[1] || 300); }
    } catch (e) { errs.push('[seq] ' + step + ' -> ' + e.message); }
  }
}

(async () => {
  const out = path.resolve(process.argv[2] || 'strip.png');
  const file = path.resolve(arg('file', path.join(__dirname, '..', 'volthaven.html')));
  const W = +arg('w', 1280), H = +arg('h', 720);
  const frames = +arg('frames', 9), every = +arg('every', 110);
  const cols = +arg('cols', 3), scale = +arg('scale', 0.5);
  const wait = +arg('wait', 6000);
  let q = arg('q', '');
  if (!/cap=1/.test(q)) q = (q ? q.replace(/^\?/, '') + '&' : '') + 'cap=1';

  const browser = await pw.chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
           '--ignore-gpu-blocklist', '--enable-webgl', '--disable-dev-shm-usage', '--no-sandbox'],
  });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const localThree = path.join(__dirname, 'three.r128.min.js');
  if (fs.existsSync(localThree)) {
    await page.route('**/three.js/r128/three.min.js', r =>
      r.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(localThree, 'utf8') }));
  }
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push('[error] ' + m.text()); });
  page.on('pageerror', e => errs.push('[pageerror] ' + e.message));

  await page.goto('file://' + file + '?' + q, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.VH && window.VH.booted === true, null, { timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(wait);

  await drive(page, arg('seq', ''), errs);

  const during = arg('during', '');
  const capturePromise = page.evaluate(async ({ frames, every, cols, scale }) => {
    const src = document.querySelector('canvas');
    const fw = Math.round(src.width * scale), fh = Math.round(src.height * scale);
    const rows = Math.ceil(frames / cols);
    const sheet = document.createElement('canvas');
    sheet.width = fw * cols; sheet.height = fh * rows;
    const g = sheet.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, sheet.width, sheet.height);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < frames; i++) {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const x = (i % cols) * fw, y = Math.floor(i / cols) * fh;
      g.drawImage(src, 0, 0, src.width, src.height, x, y, fw, fh);
      g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(x + 4, y + 4, 34, 20);
      g.fillStyle = '#0ff'; g.font = '13px monospace'; g.fillText(String(i + 1), x + 12, y + 19);
      g.strokeStyle = 'rgba(0,255,255,.25)'; g.strokeRect(x + .5, y + .5, fw - 1, fh - 1);
      if (i < frames - 1) await sleep(every);
    }
    return sheet.toDataURL('image/png');
  }, { frames, every, cols, scale });

  if (during) drive(page, during, errs).catch(() => {});
  const dataUrl = await capturePromise;

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await browser.close();
  console.log('strip -> ' + out + '  (' + frames + ' frames @ ' + every + 'ms)');
  const uniq = [...new Set(errs)].slice(0, 20);
  if (uniq.length) { console.log('--- console ---'); uniq.forEach(e => console.log(e)); } else console.log('--- console clean ---');
})().catch(e => { console.error('HARNESS FAIL: ' + e.message); process.exit(2); });
