// 07 · burned · T 23.45–25.85 · his cell's few things, engraved — chair, bed frame, folded coat, papers, a lute — then
// on "burned" (24.0) engraved flames sweep in from the floor and consume them; embers rise.
(function () {
  'use strict';
  FILM.scene({ id: 'burned', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const f = L.clamp((T - 23.95) / 0.9);
    D.plate(ctx);
    const lit = D.lights([{ x: 540, y: 1250, r: 1100, k: 0.7 + 0.4 * f }, { x: 200, y: 600, r: 900, k: 0.35 }], 0.1);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.1, spacing: 6, width: 1, color: '#A89890', alpha: 0.75, seed: 61, density: (x, y) => lit(x, y) * 0.65 });
    D.engrave(ctx, [[-20, 1380], [1100, 1380], [1100, 1940], [-20, 1940]], { ink: '#9A8A7A', light: (x, y) => lit(x, y) * 0.7, angle: 0.05, spacing: 5, seed: 62, smooth: false, outline: false });
    ctx.save(); ctx.translate(540, 1380); ctx.scale(1.55, 1.55); ctx.translate(-540, -1380);
    const burnt = (x) => L.clamp((f * 1.4 - Math.abs(x - 540) / 900));
    const obj = (pts, ink, seed) => D.engrave(ctx, pts, { ink, light: (x, y) => lit(x, y) * (1 - 0.7 * burnt(x)), spacing: 4.4, seed, outW: 2.6, smooth: false });
    obj([[140, 1380], [140, 1100], [170, 1100], [170, 1240], [330, 1240], [330, 1380], [300, 1380], [300, 1270], [170, 1270], [170, 1380]], C.wood, 63);     // chair
    obj([[420, 1380], [420, 1200], [440, 1200], [440, 1300], [900, 1300], [900, 1220], [920, 1220], [920, 1380]], C.wood, 64);                              // bed frame
    obj([[480, 1300], [860, 1300], [850, 1270], [490, 1262]], '#C8C0D0', 65);                                                                                 // blanket
    obj([[600, 1262], [760, 1262], [740, 1225], [610, 1228]], '#3A4E86', 66);                                                                                 // folded coat
    for (let k = 0; k < 5; k++) obj([[200 + k * 14, 1240 - k * 6], [300 + k * 12, 1236 - k * 6], [302 + k * 12, 1228 - k * 6], [202 + k * 14, 1232 - k * 6]], '#E8DCC0', 67 + k);   // papers
    // flames: engraved tongues rising where it burns
    if (f > 0) {
      const fr = L.rng(L.hash('flames'));
      for (let i = 0; i < 14; i++) {
        const x0 = 140 + i * 62 + (fr() - 0.5) * 30, b = burnt(x0), wv = 30 + fr() * 40;
        if (b <= 0) continue;
        const h = (180 + 360 * fr()) * b * (0.8 + 0.2 * L.noise1(T * 7, i));
        const sway = 40 * L.noise1(T * 3, i + 9), curl = 22 * L.noise1(T * 5, i + 20);
        const flame = [[x0 - wv, 1380], [x0 - wv * 0.7 + curl, 1380 - h * 0.35], [x0 - wv * 0.2 + sway * 0.5, 1380 - h * 0.7], [x0 + sway, 1380 - h], [x0 + wv * 0.3 + sway * 0.6 - curl, 1380 - h * 0.62], [x0 + wv * 0.7, 1380 - h * 0.3], [x0 + wv, 1380]];
        D.glow(ctx, x0, 1380 - h * 0.4, h * 0.9, C.candle, 0.35 * b);
        D.engrave(ctx, flame, { ink: '#FFD27A', base: '#C8521A', light: (x, y) => L.clamp(0.9 - (1380 - y) / (h * 1.6)), angle: 1.5, spacing: 3.4, seed: 80 + i, outW: 1.6, cross: false });
      }
      D.embers(ctx, T, { n: 60, seed: 5 });
    }
    ctx.restore();
    D.grain(ctx, T, 1);
  } });
})();
