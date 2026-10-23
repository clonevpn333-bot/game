// End-to-end prologue run. Drives the story with "cheated" inputs (teleports, direct
// interaction calls, simulated tether use) and screenshots the key beats.
// node tools/play.mjs tests/playthrough.mjs "http://localhost:8080/index.html?beat=wake"
export default async ({ shot, ev, log, page }) => {
  const adv = (s) => ev(s => __game.advance(s), s);
  const st = () => ev(() => ({ cp: __game.state.checkpoint, obj: __game.hud.objective?.text, p: [__game.player.pos.x.toFixed(1), __game.player.pos.y.toFixed(1), __game.player.pos.z.toFixed(1)], ps: __game.player.state, dir: __game.director.active, hp: Math.round(__game.player.health) }));
  await ev(() => { window.__game.godMode = true; window.__game.skipAll = true; __game.autoChoose = (opts, pick) => setTimeout(() => pick(0), 50); });
  const until = async (label, pred, maxSec = 120, step = 0.5, every = null) => {
    for (let t = 0; t < maxSec; t += step) {
      if (await ev(pred)) { log('✓', label, JSON.stringify(await st())); return true; }
      if (every) await ev(every);
      await adv(step); await page.waitForTimeout(20);
    }
    log('✗ TIMEOUT', label, JSON.stringify(await st())); return false;
  };
  const use = (label) => ev((label) => { const it = [...__game.interact.items].find(i => (typeof i.label === 'function' ? i.label() : i.label).includes(label)); if (!it) return 'missing ' + label; it.onUse(it); if (it.once) __game.interact.remove(it); return 'ok'; }, label);
  const tp = (x, y, z, yaw = 0) => ev(([x, y, z, yaw]) => { const g = __game; g.player.teleport(new (g.player.pos.constructor)(x, y, z), yaw); g.camera.snapBehind(yaw, 0.1); }, [x, y, z, yaw]);

  // ---- wake
  await until('wake: control given', () => !__game.director.active && __game.hud.objective?.text?.includes('Get ready'), 60);
  await shot('p01_apartment');
  log('gear', await use('Gear up')); await adv(1.5);
  await shot('p02_geared');
  log('door', await use('Leave the apartment'));
  await until('terraces', () => __game.state.checkpoint === 'terraces' || __game.hud.objective?.text?.includes('Market'), 20);
  await adv(3); await shot('p03_walkway');
  log('okafor', await use('Talk to Mrs. Okafor')); await until('okafor done', () => !__game.director.active, 30);
  log('kids', await use('Talk to Pell')); await until('kids done', () => !__game.director.active, 30);
  await tp(162, 7, -26, Math.PI); await adv(1); await shot('p04_courtyard');
  await tp(155, 0, -56, Math.PI); await adv(1);
  await until('market', () => __game.state.checkpoint === 'market' || __game.hud.objective?.text?.includes('Bram'), 20);
  await adv(2); await shot('p05_market');
  log('bakery', await use('honey knot'));
  await tp(165.5, 0, -63.8, Math.PI / 2); await adv(0.5);
  log('bram', await use('Talk to Bram'));
  await adv(1); await shot('p06_bram');
  await until('bram convo done', () => __game.hud.objective?.text?.includes('tram'), 90, 0.5);
  // ---- tram
  await tp(155, 5.55, -124.2, Math.PI); await adv(0.5);
  log('board', await use('Board the tram'));
  await adv(6); await shot('p07_tram_ride');
  await until('arrive lower', () => __game.state.checkpoint === 'lower' || __game.hud.objective?.text?.includes('Tomas'), 120, 1);
  await adv(1); await shot('p08_lowerdecks');
  await tp(97, -30, -168, -Math.PI / 2); await adv(0.5);
  log('tomas', await use('Talk to Tomas')); await adv(1); await shot('p09_tomas');
  await until('tomas done', () => __game.hud.objective?.text?.includes('Nia'), 120);
  // ---- hangar
  await tp(174, -38, -178, Math.PI / 2); await adv(1);
  log('nia', await use('Talk to Nia')); await adv(3); await shot('p10_nia');
  await until('nia done', () => __game.hud.objective?.text?.includes('range'), 150);
  await shot('p11_bram_nia');
  // ---- range
  await tp(158.2, -38, -240, -Math.PI / 2); await adv(1);
  await until('range start', () => __game.weapons.owned.pistol, 20);
  const shootAll = () => ev(() => { const P = __game.physics; for (const k of P.kinematics) for (const c of k.cols) { const m = P.getMeta(c); if (m?.onShot) m.onShot(); } });
  await shootAll(); await adv(4); await shot('p12_range');
  await shootAll(); await adv(4);
  await until('weight', () => [...__game.tether.targets].some(t => t.label === 'Weight'), 20);
  await ev(() => { __game.tether.cells = 1; }); await adv(4);
  await ev(() => { const t = [...__game.tether.targets].find(t => t.label === 'Target plate'); t?.push(new (__game.player.pos.constructor)(1, 0, 0), 1); }); await adv(3);
  await tp(141, -33, -238.2, 0); await adv(2);
  await until('spine objective', () => __game.hud.objective?.text?.includes('Spine'), 30);
  await tp(185, -38, -190, Math.PI / 2); await adv(1);
  // ---- spine
  await until('spine beat', () => __game.state.checkpoint === 'spine', 20);
  await adv(6); await shot('p13_doors');
  await adv(5); await shot('p14_reveal');
  await until('spine control', () => !__game.director.active, 60, 1);
  await shot('p15_spine_walk');
  await tp(202, -38, -211.4, Math.PI); await adv(0.5); await shot('p16_ledge');
  await tp(205.6, -45.6, -284.5, Math.PI); await adv(1);
  await until('galleryB', () => __game.state.checkpoint === 'galleryB' && __game.enemies.list.length > 0, 20);
  await adv(3); await shot('p17_scavs');
  await ev(() => __game.enemies.list.forEach(e => e.damage(9999, e.pos, e.pos)));
  await until('gallery cleared', () => __game.hud.objective?.text?.includes('lift'), 60);
  await tp(207, -52, -296, Math.PI); await adv(0.5);
  log('lift', await use('Operate the cargo lift')); await adv(5); await shot('p18_lift');
  await until('relay', () => __game.state.checkpoint === 'relay' || __game.hud.objective?.text?.includes('couplings'), 60, 1);
  await adv(2); await shot('p19_relay');
  await until('couplings registered', () => [...__game.tether.targets].filter(t => t.label === 'Coupling').length === 3, 30);
  await ev(() => [...__game.tether.targets].filter(t => t.label === 'Coupling').forEach(t => t.push(null, 1)));
  await until('shearer', () => __game.enemies.list.some(e => e.type === 'shearer'), 60);
  await adv(3); await shot('p20_shearer');
  await ev(() => __game.enemies.list.forEach(e => e.damage(9999, e.pos, e.pos)));
  await until('rescue', () => __game.state.checkpoint === 'rescue', 40);
  // ---- rescue A
  await until('tram slides', () => __game.story.workTram?.state === 'slide', 60);
  await adv(0.5); await shot('p21_snap');
  for (let i = 0; i < 2; i++) {
    await ev((i) => { const t = [...__game.tether.targets].filter(t => t.label === 'Brake clamp')[i]; t?.push(null, 1); }, i);
    await until('braked ' + i, () => __game.story.workTram.state === 'braked', 20, 0.25);
    await adv(0.5);
  }
  await until('fall', () => __game.story.workTram.state === 'fall', 30, 0.25);
  await shot('p22_fall');
  await ev(() => { const T = __game.tether; T.cells = 3; const c = [...T.targets].find(t => t.label === 'Undercroft crane'); c.push(null, 3); });
  await until('hang', () => __game.story.workTram.state === 'hang', 20, 0.25);
  await adv(2); await shot('p23_caught');
  await ev(() => { const h = [...__game.tether.targets].find(t => t.label === 'Jammed hatch'); h.push(null, 1); });
  await until('ivo falls', () => [...__game.tether.targets].some(t => t.label === 'Ivo' && t.enabled()), 30, 0.25);
  await ev(() => { const t = [...__game.tether.targets].find(t => t.label === 'Ivo'); for (let i = 0; i < 20; i++) t.capture(0.05); });
  await until('tram drop', () => __game.story.workTram.state === 'drop' || __game.story.workTram.state === 'gone', 40, 0.25);
  await adv(1.5); await shot('p24_drop');
  await until('settlement view', () => __game.hud.objective?.text?.includes('Look closer'), 60, 0.5);
  await shot('p25_settlement');
  await ev(() => { const g = __game; const s = g.ground.settlementCityPos(); g.input.keys.add('KeyZ'); });
  await until('watching', () => __game.hud.objective == null, 30, 0.25, () => { const g = __game; const s = g.ground.settlementCityPos(); const c = g.engine.camera.position; const d = s.clone().sub(c); g.camera.yaw = Math.atan2(d.x, d.z); g.camera.pitch = Math.atan2(-d.y, Math.hypot(d.x, d.z)); });
  await adv(2); await shot('p26_zoom');
  await ev(() => __game.input.keys.delete('KeyZ'));
  await until('title', () => !!document.querySelector('#title.show'), 120, 1);
  await adv(3); await shot('p27_title');
  await until('endcard', () => !!document.querySelector('.endcard'), 60, 1);
  await shot('p28_end');
  log('FLAGS', JSON.stringify(await ev(() => __game.state.flags)));
};
