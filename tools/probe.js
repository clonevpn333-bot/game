import { chromium } from 'playwright';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 640, height: 400 } });
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await page.goto(process.argv[2], { waitUntil: 'load' });
await page.waitForFunction('window.__ready === true', { timeout: 30000 }).catch(() => errs.push('no ready'));
const info = await page.evaluate(() => {
  const t = window.__terrain;
  const sh = t?.material?.userData?.shader;
  const chunk = [...t.chunks.values()][0];
  const attr = chunk?.mesh?.geometry?.attributes?.color;
  return {
    compiled: !!sh,
    fragHasSnow: sh ? sh.fragmentShader.includes('uSnowMap') : null,
    fragHasFog: sh ? sh.fragmentShader.includes('uFogDensity') : null,
    vertHasNW: sh ? sh.vertexShader.includes('vNW') : null,
    itemSize: attr?.itemSize,
    firstColor: attr ? Array.from(attr.array.slice(0, 8)).map(v => +v.toFixed(2)) : null,
    vertexColors: t.material.vertexColors,
    programs: window.__stage.renderer.info.programs.map(p => p.cacheKey.slice(0, 60)),
  };
});
console.log(JSON.stringify(info, null, 1));
console.log(errs.join('\n'));
await browser.close();
