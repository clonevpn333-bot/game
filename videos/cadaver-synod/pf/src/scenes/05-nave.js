// 05 · nave · T 11.25–13.25 · 3D: the camera dollies down a candle-lit nave toward the throne. "robes" (11.41) → the
// robes drop onto the skeleton with a gold flash; "throne" (12.86) → the dolly settles on the enthroned corpse.
(function () {
  'use strict';
  FILM.scene({ id: 'nave', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const k = L.ease.inOutCubic(L.clamp(t / 1.9));
    const cam = { z: L.lerp(-600, 2600, k), y: L.lerp(-120, -260, k), f: 900, cy: 1000 };
    const P3 = D.nave(ctx, T, cam);
    const at = P3(0, 300, 4300);
    if (at) {
      const s = 900 / at[2] * 2.1;
      const robe = L.clamp((T - 11.41) / 0.35);
      D.glow(ctx, at[0], at[1] - 500 * s, 900 * s, C.candle, 0.5);
      D.corpse(ctx, at[0], at[1] - 110 * s, s, T, { robe, ember: 0.35 });
      const gf = Math.max(0, 1 - Math.abs(T - 11.6) / 0.25);
      if (gf > 0) D.glow(ctx, at[0], at[1] - 400 * s, 700 * s, C.gold, gf);
    }
    D.fog(ctx, T, { y: 1500, h: 600, a: 0.3, speed: 25 });
    D.grain(ctx, T, 1);
  } });
})();
