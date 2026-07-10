/* GATE E: full playthrough smoke test.
 * boot → menu → mission select (real clicks) → M1 → real aimed kills →
 * death + checkpoint restore → complete mission → end screen. Zero errors. */
const { launch } = require('./harness');
const OUT = '/tmp/claude-0/-home-user-game/ad34b3df-5365-54e0-bbeb-bdacb676b279/scratchpad/';
(async () => {
  const { browser, page, errors } = await launch({ lowQuality: true, viewport: { width: 960, height: 540 } });
  let failMsg = null;
  const check = (cond, msg) => { if (!cond && !failMsg) failMsg = msg; console.log((cond ? 'PASS' : 'FAIL') + ': ' + msg); };

  await page.waitForFunction('window.RT_BOOT === "ok"', null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  check(await page.evaluate('RT.game.state') === 'menu', 'boots to main menu');
  await page.screenshot({ path: OUT + 'gateE_menu.png' });

  /* menu → campaign → mission select */
  await page.click('#btn-campaign');
  await page.waitForTimeout(700);
  const cards = await page.$$eval('#mission-grid .mission-card', els => els.length);
  check(cards === 5, 'mission select shows 5 missions (got ' + cards + ')');
  await page.screenshot({ path: OUT + 'gateE_select.png' });

  /* start mission 1 via card click */
  await page.click('#mission-grid .mission-card');
  await page.waitForTimeout(2000);
  check(await page.evaluate('RT.game.state') === 'cutscene', 'intro cutscene plays');
  await page.evaluate('RT_DEBUG.skipCutscene()');
  await page.waitForFunction('RT.game.state === "engage"', null, { timeout: 8000 });
  await page.mouse.click(640, 360);
  await page.waitForTimeout(400);
  check(await page.evaluate('RT.game.state') === 'play', 'gameplay engaged');

  /* REAL combat: warp near the farm patrol, ADS, re-aim before each burst.
   * Enemies frozen in place: software rendering runs ~20fps so moving targets
   * make the check nondeterministic; the input→fire→hitscan pipeline is what
   * this verifies. */
  await page.evaluate('RT_DEBUG.warp(-24, 48)');
  await page.evaluate('RT.ai._testFreeze = true');
  await page.evaluate('RT.input.aim = true');
  await page.waitForTimeout(600);
  const killsBefore = await page.evaluate('RT.game.stats.kills');
  let shotFight = false;
  for (let attempt = 0; attempt < 14; attempt++) {
    const tgt = await page.evaluate(`(() => {
      const p = RT.player.pos; let best = null, bd = 1e9;
      for (const e of RT.ai.enemies) { if (e.dead) continue;
        const d = Math.hypot(e.x - p.x, e.z - p.z); if (d < bd) { bd = d; best = e; } }
      if (!best) return null;
      return { dx: best.x - p.x, dy: (best.y + 1.1) - RT.player.eyeY(), dz: best.z - p.z, d: bd };
    })()`);
    if (!tgt) break;
    if (tgt.d > 45) { await page.evaluate('RT_DEBUG.warp(-26, 55)'); continue; }
    const yaw = Math.atan2(-tgt.dx, -tgt.dz);
    const pitch = Math.atan2(tgt.dy, Math.hypot(tgt.dx, tgt.dz));
    await page.evaluate(`RT_DEBUG.look(${yaw}, ${pitch})`);
    await page.mouse.down();
    await page.waitForTimeout(450);
    await page.mouse.up();
    if (!shotFight) { await page.screenshot({ path: OUT + 'gateE_fight.png' }); shotFight = true; }
    await page.waitForTimeout(150);
    const kills = await page.evaluate('RT.game.stats.kills');
    if (kills > killsBefore) break;
  }
  await page.evaluate('RT.input.aim = false');
  await page.evaluate('RT.ai._testFreeze = false');
  const stats1 = await page.evaluate('RT.game.stats');
  check(stats1.kills > killsBefore, `real aimed gunfire kills an enemy (kills=${stats1.kills}, shots=${stats1.shots}, hits=${stats1.hits})`);

  /* death → checkpoint restore */
  await page.evaluate('RT.player.damage(500, new THREE.Vector3(0,1,0))');
  await page.waitForTimeout(300);
  check(await page.evaluate('RT.player.dead'), 'player death registers');
  await page.waitForFunction('RT.game.state === "engage"', null, { timeout: 12000 });
  await page.mouse.click(640, 360);
  await page.waitForTimeout(400);
  check(await page.evaluate('RT.game.state') === 'play' && await page.evaluate('RT.player.health') === 100,
    'checkpoint respawn restores play at full health');

  /* finish the mission fast (speed up sim to compensate for software rendering) */
  await page.evaluate('RT_DEBUG.god(true)');
  await page.evaluate('RT.engine.timeScale = 3');
  for (let iter = 0; iter < 24; iter++) {
    const state = await page.evaluate('RT.game.state');
    if (state === 'end') break;
    if (state === 'cutscene') { await page.evaluate('RT_DEBUG.skipCutscene()'); await page.waitForTimeout(400); continue; }
    if (state === 'engage') { await page.mouse.click(640, 360); await page.waitForTimeout(300); continue; }
    const wp = await page.evaluate('RT.ui.waypointTargets[0] ? [RT.ui.waypointTargets[0].x, RT.ui.waypointTargets[0].z] : null');
    if (wp) await page.evaluate(`RT_DEBUG.warp(${wp[0]}, ${wp[1]})`);
    await page.evaluate('RT_DEBUG.useNearest()');
    await page.evaluate('(function(){const o = RT.missionRuntime.obj(); if (o && o.waveT > 1) o.waveT = 0.2;})()');
    await page.evaluate('RT_DEBUG.killAll()');
    await page.waitForTimeout(1200);
  }
  await page.evaluate('RT.engine.timeScale = 1');
  check(await page.evaluate('RT.game.state') === 'end', 'mission 1 completes');
  await page.waitForTimeout(900);
  const endVisible = await page.evaluate('!document.getElementById("end-screen").classList.contains("hidden")');
  check(endVisible, 'mission-complete stats screen shown');
  const stTime = await page.evaluate('document.getElementById("st-time").textContent');
  check(stTime !== '–', 'stats populated (time=' + stTime + ')');
  await page.screenshot({ path: OUT + 'gateE_end.png' });

  const perf = await page.evaluate('RT.engine.frameMS');
  console.log('INFO: frameMS (software renderer) =', perf && perf.toFixed(1));
  check(errors.length === 0, 'zero console errors' + (errors.length ? ' — ' + errors.slice(0, 5).join(' || ') : ''));

  console.log(failMsg ? ('GATE E FAILED: ' + failMsg) : 'GATE E PASSED');
  await browser.close();
  process.exit(failMsg ? 1 : 0);
})();
