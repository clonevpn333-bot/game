// 05b · jailer · T 15.96–16.79 · the same jailer, close and side-lit, stepping forward — SAME JAILER (15.99).
(function () {
  'use strict';
  FILM.scene({ id: 'jailer', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    D.plate(ctx);
    const lit = D.lights([{ x: 880, y: 1000, r: 1300, k: 0.95 }], 0.16);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.1, spacing: 6, width: 1, color: '#A8A0B0', alpha: 0.75, seed: 91, density: (x, y) => lit(x, y) * 0.6 });
    const z = 1 + 0.06 * t;
    ctx.save(); ctx.translate(540, 1500); ctx.scale(z, z); ctx.translate(-540, -1500);
    D.person(ctx, 560, 2350, 4.4, T, { light: lit, hilt: 0.6, seed: 11 });
    ctx.restore();
    D.grain(ctx, T, 1);
    D.word(ctx, 'SAME JAILER', 540, 240, 120, (T - 15.99) / 0.14, { color: C.yellow, seed: 22 });
  } });
})();
