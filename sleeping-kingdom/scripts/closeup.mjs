// Dev QA: frame the knight (and optionally an enemy) with the cinematic camera from several angles.
import { chromium } from '@playwright/test';
const stage = process.argv[2] ?? 'gate';
const target = process.argv[3] ?? 'player';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto('http://127.0.0.1:5188');
await page.waitForFunction(() => (window.__THREE_GAME_DIAGNOSTICS__?.frame ?? 0) > 5, null, { timeout: 120000 });
await page.evaluate(async (s) => { await window.__THREE_GAME_TEST_HOOKS__.setState(s); }, stage);
for (const [i, ang] of [0, 1.9, 3.14, 4.4].entries()) {
  await page.evaluate(([a, tgt]) => {
    const g = window.__GAME__;
    const T = g.camera.position.constructor;
    let pos = g.player.pos, h = 1.2, dist = 3.6;
    if (tgt !== 'player') { const e = g.enemies.find((x) => x.kind === tgt) ?? g.boss; pos = e.pos; h = tgt === 'boss' ? 3 : 1; dist = tgt === 'boss' ? 9 : 3.2; }
    const w = g.worldRoot.localToWorld(new T().copy(pos));
    g.hud.show(false);
    g.cam.cinePos.set(w.x + Math.sin(a) * dist, w.y + h + 0.4, w.z + Math.cos(a) * dist);
    g.cam.cineLook.set(w.x, w.y + h, w.z);
    g.cam.setCinematic(true);
    g.cam.cineWeight = 1;
    g.player.yaw = 0;
  }, [ang, target]);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `artifacts/shots/closeup-${target}-${i}.png` });
}
await browser.close();
