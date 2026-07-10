/* Scripted Mission 1 playthrough: boot → menu → start mission →
 * skip cutscene → engage → walk/warp through objectives → fire weapons →
 * complete mission. Captures screenshots + console errors.
 * Usage: node playtest.js [missionIdx] [shotPrefix] */
const { launch } = require('./harness');
const OUT = '/tmp/claude-0/-home-user-game/ad34b3df-5365-54e0-bbeb-bdacb676b279/scratchpad/';
(async () => {
  const mi = parseInt(process.argv[2] || '0', 10);
  const prefix = process.argv[3] || ('play_m' + (mi + 1));
  const { browser, page, errors } = await launch();
  const fail = async (msg) => {
    console.log('FAIL:', msg, '| errors:', errors.length ? errors.slice(0, 6) : 'none');
    await page.screenshot({ path: OUT + prefix + '_fail.png' });
    await browser.close();
    process.exit(1);
  };
  await page.waitForFunction('window.RT_BOOT === "ok"', null, { timeout: 20000 }).catch(() => fail('boot'));
  await page.waitForTimeout(1200);

  // start mission
  await page.evaluate(`RT_DEBUG.start(${mi})`);
  await page.waitForTimeout(1800);
  const st1 = await page.evaluate('RT.game.state');
  console.log('after start:', st1);
  if (st1 === 'cutscene') {
    await page.screenshot({ path: OUT + prefix + '_cutscene.png' });
    await page.evaluate('RT_DEBUG.skipCutscene()');
    await page.waitForTimeout(400);
  }
  // engage
  await page.waitForFunction('RT.game.state === "engage"', null, { timeout: 8000 }).catch(() => fail('engage state, got ' + undefined));
  await page.mouse.click(640, 360);
  await page.waitForTimeout(300);
  const st2 = await page.evaluate('RT.game.state');
  if (st2 !== 'play') return fail('play state, got ' + st2);
  console.log('playing. objectives running.');
  await page.evaluate('RT_DEBUG.god(true)');

  // helper to run steps with logging
  const objText = () => page.evaluate('(RT.missionRuntime.obj()||{}).text');
  const steps = await page.evaluate('RT.map.def.testSteps ? true : false');
  // generic driver: repeatedly warp to current waypoint, kill hostile groups, up to N iterations
  for (let iter = 0; iter < 26; iter++) {
    const state = await page.evaluate('RT.game.state');
    if (state === 'end') break;
    if (state !== 'play') {
      // maybe waiting cutscene mid-mission
      const cs = await page.evaluate('!!RT.game.cutscene');
      if (cs) { await page.evaluate('RT_DEBUG.skipCutscene()'); await page.waitForTimeout(500); continue; }
      if (state === 'engage') { await page.mouse.click(640, 360); await page.waitForTimeout(300); continue; }
    }
    const cur = await objText();
    console.log('iter', iter, '| objective:', JSON.stringify(cur));
    // move to waypoint if any
    const wp = await page.evaluate('RT.ui.waypointTargets[0] ? [RT.ui.waypointTargets[0].x, RT.ui.waypointTargets[0].z] : null');
    if (wp) await page.evaluate(`RT_DEBUG.warp(${wp[0]}, ${wp[1]})`);
    await page.waitForTimeout(900);
    // fire a burst (exercises weapons + combat)
    if (iter === 1) {
      const magBefore = await page.evaluate('RT.weapons.state().ammo.mag');
      await page.mouse.down(); await page.waitForTimeout(500); await page.mouse.up();
      const magAfter = await page.evaluate('RT.weapons.state().ammo.mag');
      console.log('fired:', magBefore, '->', magAfter, magAfter < magBefore ? 'OK' : 'NOT FIRING');
      await page.screenshot({ path: OUT + prefix + '_combat.png' });
    }
    // fast-forward wave timers (defend set-pieces)
    await page.evaluate('(function(){const o = RT.missionRuntime.obj(); if (o && o.waveT > 1) o.waveT = 0.2;})()');
    // clear any group blocking: kill everything alive (playtest shortcut)
    await page.evaluate('RT_DEBUG.killAll()');
    await page.waitForTimeout(1300);
  }
  const finalState = await page.evaluate('RT.game.state');
  await page.screenshot({ path: OUT + prefix + '_end.png' });
  const stats = await page.evaluate('RT.game.stats');
  const prog = await page.evaluate('RT.ui.progress');
  console.log('final state:', finalState, '| stats:', JSON.stringify(stats), '| progress:', JSON.stringify(prog));
  console.log('console errors:', errors.length ? errors.slice(0, 10) : 'none');
  await browser.close();
  process.exit(finalState === 'end' && errors.length === 0 ? 0 : 1);
})();
