import flows from './scen-flows.mjs';
import perf from './scen-perf.mjs';
import debug from './scen-debug.mjs';
import god from './scen-god.mjs';
import interior from './scen-interior.mjs';
import police from './scen-police.mjs';
const setTime = (page, h) => page.evaluate((h) => { const W = window.game.world; W.time = Math.floor(W.time / 1440) * 1440 + h * 60; }, h);
export default {
  flows,
  perf,
  debug,
  god,
  interior,
  police,
  closeup: (a) => closeup(a),
  async overview({ page, shot, wait }) {
    await setTime(page, 13);
    await page.evaluate(() => window.game.rig.flyTo(60, 40, 420));
    await wait(2500);
    await shot('01-overview-day');
    await page.evaluate(() => window.game.rig.flyTo(0, 0, 32));
    await wait(2500);
    await shot('03-street');
    await setTime(page, 22);
    await page.evaluate(() => window.game.rig.flyTo(30, 20, 300));
    await wait(2500);
    await shot('05-night');
  },
  async possess({ page, shot, wait }) {
    await wait(3000);
    // pick a driving citizen
    const name = await page.evaluate(() => {
      const g = window.game, W = g.world;
      const v = W.traffic.vehicles.find((v) => v.state === 'lane' && v.driver != null && !v.fleet) || W.traffic.vehicles.find((v) => v.state === 'lane' && v.driver != null);
      if (!v) return 'none: ' + JSON.stringify(W.traffic.vehicles.reduce((a, v) => (a[v.state] = (a[v.state] || 0) + 1, a), {}));
      g.select({ kind: 'citizen', id: v.driver });
      g.followSelected();
      return W.citizens[v.driver].name;
    });
    console.log('selected', name);
    await wait(2500);
    await shot('10-selected');
    await page.evaluate(() => window.game.possessSelected());
    await wait(900);
    await shot('11-swoop');
    await wait(2500);
    await shot('12-driving');
    await page.keyboard.down('KeyW');
    await wait(2500);
    await page.keyboard.up('KeyW');
    await shot('13-drove');
    await page.keyboard.press('KeyF');
    await wait(1500);
    await shot('14-onfoot');
    await page.keyboard.press('KeyQ');
    await wait(2500);
    await shot('15-released');
  },
};
const closeup = async ({ page, shot, wait }) => {
  await page.evaluate(() => { const W = window.game.world; W.time = Math.floor(W.time / 1440) * 1440 + 12 * 60; const g = window.game; g.rig.goal.pitch = 0.15; g.rig.userPitch = true; g.rig.flyTo(20, 20, 30); });
  await wait(3000);
  await shot('20-closeup-env');
  await page.evaluate(() => { const g = window.game; g.renderer.scene.environment = null; g.renderer.envTimer = 1e9; });
  await wait(1500);
  await shot('21-closeup-noenv');
  await page.evaluate(() => { const g = window.game; g.renderer.sun.castShadow = false; g.renderer.quality = 'low'; });
  await wait(1500);
  await shot('22-closeup-noshadow');
};
