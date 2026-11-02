(async () => { try {
  const G = __G, g = __game, K = G.input.keys; const log = []; const R = G.renderer; G.player.godMode = true;
  const run = async (s) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(s * 30); i++) { g.frame(true); await Promise.resolve(); } window.__fixedDt = 0; };
  const time = () => { const t0 = performance.now(); R.render(G.scene, G.camera); return Math.round(performance.now() - t0); };
  await run(1); time(); log.push('before car: ' + time() + 'ms');
  const s = G.mission.ctx.vars.saetta; G.player.teleport(s.pos.x - 2.2, 0.15, s.pos.z, Math.PI / 2); await run(0.5); K.add('KeyF'); await run(0.1); K.delete('KeyF'); await run(3);
  log.push('in car (parked): ' + time() + 'ms');
  K.add('KeyW'); await run(2); K.delete('KeyW'); log.push('after 2s driving: ' + time() + 'ms');
  const fx = G.fx; const L = G.lighting;
  const layers = { smoke: fx.smoke.points, glow: fx.glow.points, fire: fx.fireL.points, chunks: fx.chunks.mesh, streaks: fx.streaks && (fx.streaks.mesh || fx.streaks.lines), cones: L.cones, pools: L.pools, shadowV: L.shadowV, shadowH: L.shadowH, lampPools: L.lampPools, decalCrack: G.decals.crack.mesh, decalHole: G.decals.hole.mesh, skids: fx.skids && fx.skids.mesh, sky: G.sky && G.sky.mesh };
  for (const [k, o] of Object.entries(layers)) { if (!o) { log.push(k + ': n/a'); continue; } o.visible = false; const t = time(); o.visible = true; log.push(`hide ${k}: ${t}ms`); }
  for (const v of G.vehicles.list) v.root.visible = false; log.push('hide all vehicles: ' + time() + 'ms'); for (const v of G.vehicles.list) v.root.visible = true;
  for (const sp of L.spots) { const i0 = sp.intensity; sp.intensity = 0; } log.push('spots off: ' + time() + 'ms');
  G.scene.traverse((o) => { if (o.isLight) log.push('light ' + o.type + ' i=' + (o.intensity || 0).toFixed(1) + ' shadow=' + o.castShadow); });
  log.push('pixelRatio=' + R.getPixelRatio() + ' size=' + R.domElement.width + 'x' + R.domElement.height);
  return log.join('\n'); } catch (e) { return 'ERR ' + e.stack; } })()
