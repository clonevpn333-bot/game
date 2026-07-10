/* Generic screenshot tool.
 * Usage: node shot.js <out.png> [hash] [waitMs] [w] [h] [query]
 * e.g. node shot.js /tmp/x.png "#soldier" 2000 1280 720 "dist=3"
 */
const { launch, HTML } = require('./harness');
(async () => {
  const [, , out, hash = '', wait = '2000', w = '1280', h = '720', query = ''] = process.argv;
  const { browser, page, errors } = await launch({
    viewport: { width: +w, height: +h },
    html: HTML + (query ? '?' + query : '') + hash,
  });
  await page.waitForFunction('window.RT_BOOT === "ok"', null, { timeout: 20000 }).catch(e => console.log('boot wait failed'));
  await page.waitForTimeout(+wait);
  await page.screenshot({ path: out });
  const info = await page.evaluate('RT.engine.renderer.info.render').catch(() => null);
  console.log('SHOT', out, '| errors:', errors.length ? errors.join(' || ') : 'none',
    info ? `| tris=${info.triangles} calls=${info.calls}` : '');
  await browser.close();
})();
