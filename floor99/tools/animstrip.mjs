// Renders a clip from the Animation Studio as a filmstrip: node tools/animstrip.mjs <clip> <out.png> [frames] [orbit] [weapon]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const [clip = 'run', out = 'strip.png', frames = '8', orbit = '1.5708', weapon = 'shotgun'] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 640, height: 640 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${process.env.PORT || 8099}/?autostart${process.env.FAST ? '&fast' : ''}`);
await page.waitForFunction(() => window.__floor99 && window.__floor99.state === 'menu', null, { timeout: 60000 });
await page.keyboard.press('F8');
await page.waitForFunction(() => window.__floor99.animationStudio?.active, null, { timeout: 30000 });
const n = +frames;
for (let i = 0; i < n; i++) {
  await page.evaluate(([clip, i, n, orbit, weapon]) => {
    const A = window.__floor99, st = A.animationStudio;
    A.frozen = true;
    if (st.weaponId !== weapon) st.setWeapon(weapon);
    st.clip = clip; st.orbit = +orbit; st.distance = 4.2; st.playing = false;
    st.clock = (i / n) * st.duration();
    st.ui.style.display = 'none';
    for (let k = 0; k < 3; k++) st.update(0.001, true);
    A.renderer.render(st.scene, st.camera, 1 / 60, 0);
  }, [clip, i, n, orbit, weapon]);
  await page.screenshot({ path: `${out}.${i}.png`, timeout: 120000 });
}
await browser.close();
