export default async ({ shot, ev, log }) => {
  await ev(() => { __game.player.char.group.visible = false; });
  const views = {
    v_reveal: [[208, -36.4, -185], [190, -90, -235], 55],
    v_leg: [[230, -60, -300], [174, -200, -228], 50],
    v_down: [[212, -50, -230], [230, -400, -150], 60],
    v_far: [[700, 100, -900], [100, -150, -100], 40],
    v_market: [[155, 1.7, -50], [155, 2.5, -90], 60],
    v_apt: [[183.5, 15.6, -18], [191, 15, -23], 60],
    v_bay: [[164, -36, -200], [185, -36, -180], 60],
    v_under: [[195, -90, -270], [150, -120, -295], 55],
  };
  for (const [name, [p, l, fov]] of Object.entries(views)) {
    if (process.env.ONLY && !process.env.ONLY.split(',').includes(name)) continue;
    await ev(([p, l, fov]) => { const g = __game; const V = g.player.pos.constructor; g.director.begin({ letterbox: false }); g.director.shot({ pos: new V(...p), look: new V(...l), fov }); g.advance(0.6); }, [p, l, fov]);
    log(name, await ev(() => ({ calls: __game.engine.renderer.info.render.calls, tris: __game.engine.renderer.info.render.triangles })));
    await shot(name);
  }
};
