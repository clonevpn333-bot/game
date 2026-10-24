// Frame-cost profiler: per-subsystem CPU time (update) and render submission cost, with scene
// statistics. Run at a busy beat:  node tools/play.mjs tests/profile.mjs "...index.html?beat=market"
export default async ({ ev, log }) => {
  const adv = (s) => ev(s => __game.advance(s), s);
  await adv(6); // let the crowd spawn and settle its LODs
  const r = await ev(() => {
    const g = __game, T = {}, wrap = (obj, name, label) => { const f = obj[name].bind(obj); obj[name] = (...a) => { const t = performance.now(); const r = f(...a); T[label] = (T[label] || 0) + performance.now() - t; return r; }; };
    wrap(g.city, 'update', 'city'); if (g.world?.update) wrap(g.world, 'update', 'world');
    wrap(g.director, 'update', 'director'); wrap(g.physics, 'syncKinematics', 'physSync'); wrap(g.player, 'update', 'player');
    wrap(g.tether, 'update', 'tether'); wrap(g.weapons, 'update', 'weapons'); wrap(g.enemies, 'update', 'enemies'); wrap(g.crowd, 'update', 'crowd');
    wrap(g.physics, 'step', 'physStep'); wrap(g.fx, 'update', 'fx'); wrap(g.camera, 'update', 'camera'); wrap(g.interact, 'update', 'interact');
    if (g.sky) wrap(g.sky, 'update', 'sky'); wrap(g.hud, 'update', 'hud'); wrap(g.engine, 'render', 'render');
    // actors (cast etc.) and every Animator.update
    const A = [...g.actors, ...g.crowd.actors]; let animT = 0;
    const protoAnim = Object.getPrototypeOf(g.player.anim), au = protoAnim.update; protoAnim.update = function (dt) { const t = performance.now(); au.call(this, dt); animT += performance.now() - t; };
    const N = 60; const t0 = performance.now();
    for (let i = 0; i < N; i++) { g.last = performance.now() - 1000 / 60; g.frame(performance.now(), false); }
    const total = performance.now() - t0;
    protoAnim.update = au;
    const out = {}; for (const k in T) out[k] = +(T[k] / N).toFixed(2);
    out.anim_inside_updates = +(animT / N).toFixed(2); out.totalPerFrame = +(total / N).toFixed(2);
    // scene stats
    let skinV = 0, skinVis = 0, casters = 0, meshes = 0, hi = 0, lo = 0; const sc = g.engine.scene;
    sc.traverse(o => { if (!o.isMesh) return; let vis = o.visible; for (let p = o.parent; p && vis; p = p.parent) vis = p.visible; if (!vis) return; meshes++; if (o.castShadow) casters++; if (o.isSkinnedMesh) { skinVis++; skinV += o.geometry.attributes.position.count; } });
    for (const a of A) { if (!a.char) continue; if (a.char.lod === 'high') hi++; else lo++; }
    const info = g.engine.renderer.info;
    return { perFrameMs: out, actors: A.length, lodHigh: hi, lodLow: lo, visibleMeshes: meshes, shadowCasters: casters, skinnedMeshesVisible: skinVis, skinnedVerts: skinV, calls: info.render.calls, tris: info.render.triangles, programs: info.programs?.length, geometries: info.memory.geometries, textures: info.memory.textures, pixelRatio: g.engine.renderer.getPixelRatio(), size: [innerWidth, innerHeight] };
  });
  log(JSON.stringify(r, null, 1));
};
