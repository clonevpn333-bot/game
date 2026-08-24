// Headless smoke test: loads minecraft.html, captures console + errors, screenshots.
const { chromium } = require('/tmp/claude-0/-home-user-game/8e46908c-6722-519f-95f9-a35325cb275d/scratchpad/node_modules/playwright-core');
const path = require('path');

(async () => {
  const wait = parseInt(process.argv[2] || '9000', 10);
  const shot = process.argv[3] || '/tmp/claude-0/-home-user-game/8e46908c-6722-519f-95f9-a35325cb275d/scratchpad/shot.png';
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-gpu-sandbox','--ignore-gpu-blocklist','--enable-webgl','--disable-dev-shm-usage']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const logs = [];
  page.on('console', m => logs.push('['+m.type()+'] ' + m.text()));
  page.on('pageerror', e => logs.push('[PAGEERROR] ' + (e && e.stack ? e.stack.split('\n').slice(0,4).join(' | ') : e)));
  await page.goto('file://' + path.resolve(__dirname, '..', 'minecraft.html'));
  await page.waitForTimeout(wait);
  const info = await page.evaluate(() => {
    try { return (window.DIAG && window.DIAG()) || {note:'no DIAG'}; } catch(e) { return {err: String(e)}; }
  });
  await page.screenshot({ path: shot });
  console.log(logs.slice(0, 120).join('\n'));
  console.log('--- DIAG ---');
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
})();
