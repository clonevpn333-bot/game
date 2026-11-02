(async () => { try {
  const G = __G, g = __game, K = G.input.keys; const log = []; const R = G.renderer; G.player.godMode = true;
  const run = async (s) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(s * 30); i++) { g.frame(true); await Promise.resolve(); } window.__fixedDt = 0; };
  const time = () => { const t0 = performance.now(); R.render(G.scene, G.camera); return Math.round(performance.now() - t0); };
  await run(1); time();
  const s = G.mission.ctx.vars.saetta; G.player.teleport(s.pos.x - 2.2, 0.15, s.pos.z, Math.PI / 2); await run(0.5); K.add('KeyF'); await run(0.1); K.delete('KeyF'); await run(3); time();
  const fx = G.fx, L = G.lighting; const pv = () => G.player.vehicle;
  const cands = { none: [], skids: [fx.skids && fx.skids.mesh], playerCar: [pv().root], allCars: G.vehicles.list.map((v) => v.root), fxAll: [fx.smoke.points, fx.glow.points, fx.fireL.points, fx.chunks.mesh, fx.shards.mesh], lighting: [L.cones, L.pools, L.shadowV, L.shadowH], decals: [G.decals.crack.mesh, G.decals.hole.mesh, G.decals.scorch.mesh] };
  for (const [k, objs] of Object.entries(cands)) {
    K.add('KeyW'); K.add(Math.random() < 0.5 ? 'KeyA' : 'KeyD'); await run(1.2); K.delete('KeyW'); K.delete('KeyA'); K.delete('KeyD');
    for (const o of objs) if (o) o.visible = false; const t = time(); for (const o of objs) if (o) o.visible = true; time();
    log.push(`first render after driving, hidden=${k}: ${t}ms`);
  }
  log.push('skid info: ' + (fx.skids ? JSON.stringify({ n: fx.skids.n, max: fx.skids.max, verts: fx.skids.mesh && fx.skids.mesh.geometry.attributes.position.count }) : 'none'));
  return log.join('\n'); } catch (e) { return 'ERR ' + e.stack; } })()
