// 02 · rome · T 3.5–5.25 · flying over a blood-moon Rome, ravens crossing in depth; ROMA (3.81) / DCCCXCVII (4.19).
(function () {
  'use strict';
  FILM.scene({ id: 'rome', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    ctx.save();
    const z = 1.12 - 0.08 * L.ease.outCubic(t / info.dur);
    ctx.translate(540, 1100); ctx.scale(z, z); ctx.translate(-540, -1100 + 60 * t);
    D.rome(ctx, T, { px: t * 420, moon: [700, 620], moonR: 200 });
    ctx.restore();
    // ravens: from deep to near
    const r = L.rng(L.hash('ravens'));
    for (let i = 0; i < 9; i++) {
      const z0 = 0.25 + r() * 0.75, x0 = -200 + r() * 600, y0 = 500 + r() * 700, sp = 500 + r() * 400;
      const x = x0 + (t + r() * 0.5) * sp * (0.4 + z0), y = y0 - t * 120 * z0 + Math.sin(T * 3 + i) * 20;
      D.raven(ctx, x, y, 0.6 + z0 * 1.6, T * (12 + i) + i);
    }
    D.rain(ctx, T, { n: 120, a: 0.18 });
    D.fog(ctx, T, { y: 1750, h: 500, a: 0.3, speed: 60 });
    const fl = D.flash(T, [3.5]);
    if (fl > 0) { ctx.fillStyle = `rgba(230,200,210,${0.35 * fl})`; ctx.fillRect(0, 0, 1080, 1920); }
    D.grain(ctx, T, 1);
    D.stamp(ctx, 'ROMA', 540, 300, 170, T - 3.81, { color: C.bone, tracking: '0.18em' });
    D.stamp(ctx, 'A.D. DCCCXCVII', 540, 440, 64, T - 4.19, { color: C.candle, blur: 20, tracking: '0.12em' });
  } });
})();
