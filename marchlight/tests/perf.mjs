export default async ({ ev, log, shot, page }) => {
  await ev(() => { __game.skipAll = true; });
  for (let i = 0; i < 6; i++) {
    const r = await ev(() => { const t0 = performance.now(); __game.advance(0.1, 0.1); const t1 = performance.now(); return { ms: Math.round(t1 - t0), calls: __game.engine.renderer.info.render.calls, tris: __game.engine.renderer.info.render.triangles, actors: __game.actors.size + __game.crowd.actors.length, dir: __game.director.active, obj: __game.hud.objective?.text }; });
    log(JSON.stringify(r));
  }
  const t0 = Date.now(); await shot('perf'); log('shot ms', Date.now() - t0);
};
