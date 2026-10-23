export default async ({ shot, wait, ev, log, page }) => {
  const beats = (process.env.BEATS || 'wake,court,market,edge,station,lower,gallery,bay,apron,galleryB,deck,under').split(',');
  for (const b of beats) {
    await ev(async (b) => { await __game.menu.quickStart(b); }, b);
    await ev(() => __game.advance(1.0));
    log(b, await ev(() => ({ p: [__game.player.pos.x.toFixed(1), __game.player.pos.y.toFixed(1), __game.player.pos.z.toFixed(1)], st: __game.player.state, calls: __game.engine.renderer.info.render.calls, tris: __game.engine.renderer.info.render.triangles })));
    await shot('w_' + b);
  }
};
