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
    v_terrace: [[176, 15.7, -24], [160, 8, -8], 62],
    v_court: [[153, 9, -12], [168, 7.5, -32], 62],
    v_market2: [[150, 2.2, -100], [165, 3, -64], 60],
    v_odile: [[163, 1.7, -60], [170, 1.2, -66], 62],
    v_station: [[150, 7.3, -118], [158, 6, -128], 62],
    v_lower: [[110, -35.5, -228], [150, -32, -200], 62],
    v_hangar: [[168, -36, -186], [180, -36.5, -176], 62],
    v_range: [[158, -36.3, -238.5], [140, -36, -242.5], 62],
    v_walk: [[204, -36.3, -205], [206, -38, -240], 62],
    v_gallery: [[203, -44, -270], [206, -45, -290], 62],
    v_coil: [[172, 9, -34], [150, 14, -16], 62],
    v_lantern: [[160, 8.7, -30], [168, 13, 0], 62],
    v_customs: [[155, 2, -105], [155, 9, -132], 62],
    v_east: [[222, 10, 4], [194, 8, -22], 55],
    v_hop: [[203.6, -36.3, -207], [201.8, -37.6, -222], 62],
    v_stairs: [[203.7, -36.2, -244], [202.2, -34.5, -262], 62],
    v_net: [[203.6, -36.6, -229.5], [202.2, -41.2, -240], 62],
    v_relay: [[200, -94.3, -286], [212, -95, -298], 62],
  };
  for (const [name, [p, l, fov]] of Object.entries(views)) {
    if (process.env.ONLY && !process.env.ONLY.split(',').includes(name)) continue;
    await ev(([p, l, fov]) => { const g = __game; const V = g.player.pos.constructor; g.director.begin({ letterbox: false }); g.director.shot({ pos: new V(...p), look: new V(...l), fov }); g.advance(0.6); }, [p, l, fov]);
    log(name, await ev(() => ({ calls: __game.engine.renderer.info.render.calls, tris: __game.engine.renderer.info.render.triangles })));
    await shot(name);
  }
};
