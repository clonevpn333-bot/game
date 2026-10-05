// 02 · rome · T 3.5–5.25 · out of the eye's darkness: an engraved Rome under a blood moon (Doré sky of ruled lines),
// three skyline planes in parallax, ravens. ROMA (3.81) · A.D. DCCCXCVII (4.19). The curiosity line falls from the moon
// to the Lateran basilica, where the trial will happen.
(function () {
  'use strict';
  FILM.scene({ id: 'rome', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const M = [700, 600];
    D.sky(ctx, T, { moon: M, h: 1500 });
    D.moon(ctx, M[0], M[1], 190, T);
    const lit = (x, y) => L.clamp(1.0 - Math.hypot(x - M[0], y - M[1]) / 1700 + 0.2 * Math.max(0, (x - 300) / 800));
    D.skyline(ctx, T, { base: 1230, h: 240, seed: 1, light: (x, y) => lit(x, y) * 0.7, ink: '#C89A8A', par: t * 60, spacing: 5.5 });
    D.mist(ctx, T, { y: 1250, h: 200, a: 0.3, speed: 30, color: '#C8A098' });
    D.skyline(ctx, T, { base: 1460, h: 320, seed: 2, light: (x, y) => lit(x, y) * 0.55, ink: '#BFA090', par: t * 140 });
    D.skyline(ctx, T, { base: 1760, h: 420, seed: 3, light: (x, y) => lit(x, y) * 0.4, ink: '#B09080', par: t * 260, spacing: 4.8 });
    const r = L.rng(L.hash('ravens'));
    for (let i = 0; i < 8; i++) { const z0 = 0.3 + r() * 0.7, x = -150 + r() * 500 + (t + r() * 0.5) * (420 + r() * 300) * (0.4 + z0), y = 420 + r() * 700 - t * 100 * z0; D.raven(ctx, x, y + Math.sin(T * 3 + i) * 16, 0.55 + z0 * 1.3, T * (12 + i) + i, i * 7); }
    // the curiosity line: moon → the Lateran
    const u = L.ease.inOutCubic(L.clamp((T - 4.35) / 0.7));
    if (u > 0) { FILM.hc.line(ctx, L.smoothPts([[M[0] - 60, M[1] + 170], [620, 1000], [470, 1220], [400, 1330]], false, 6), { plate: 'blueprint', to: Math.max(0.02, u), width: 5, seed: 12 }); if (u > 0.95) L.text(ctx, 'LATERAN', 250, 1300, { size: 26, family: '"JetBrains Mono", monospace', weight: 600, color: C.yellow, tracking: '0.2em' }); }
    D.grain(ctx, T, 1);
    const open = 0.92 * (1 - L.clamp(t / 0.25));
    if (open > 0) { ctx.fillStyle = `rgba(0,0,0,${open})`; ctx.fillRect(0, 0, 1080, 1920); }
    D.word(ctx, 'ROMA', 540, 290, 170, (T - 3.81) / 0.2, { tracking: '0.2em', seed: 8 });
    D.word(ctx, 'A.D. DCCCXCVII', 540, 430, 60, (T - 4.19) / 0.25, { color: C.candle, under: false, seed: 9 });
  } });
})();
