/* Shared Playwright harness: opens rolling_thunder.html with the cdnjs
 * three.js request served from the local copy, collects console errors. */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const HTML = path.join(ROOT, 'rolling_thunder.html');
const THREE_LOCAL = path.join(__dirname, 'three.r128.min.js');

async function launch(opts = {}) {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--no-sandbox'],
  });
  const page = await browser.newPage({ viewport: opts.viewport || { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  await page.route('**/cdnjs.cloudflare.com/**three.min.js', route =>
    route.fulfill({ body: fs.readFileSync(THREE_LOCAL, 'utf8'), contentType: 'application/javascript' }));
  await page.goto('file://' + (opts.html || HTML));
  return { browser, page, errors };
}

module.exports = { launch, ROOT, HTML };
