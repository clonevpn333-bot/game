// 01 · hook · T 0–5.6 · FRAME 0: torchlight on an engraved cell wall; the 3D masked bust fills the frame, eyes glinting
// in the slits. The whole fact is on screen within half a second: HIS FACE WAS HIDDEN / FOR 34 YEARS. "nobody" (3.8):
// NOBODY KNOWS / WHO HE WAS. Exit: the camera pushes into the left eye slit (5.3) — the keyhole transition takes over.
(function () {
  'use strict';
  FILM.scene({ id: 'hook', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    let punch = 0; for (const h of [0.0, 0.15, 0.38, 3.8, 4.7]) { const d = T - h; if (d >= 0 && d < 0.3) punch = Math.max(punch, 1 - d / 0.3); }
    const flick = 0.85 + 0.15 * L.noise1(T * 7, 3);
    const push = L.ease.inCubic(L.clamp((T - 5.0) / 0.6));
    ctx.save();
    const z = 1 + 0.03 * punch + 0.04 * (t / 5) + 1.6 * push;
    ctx.translate(470, 900); ctx.scale(z, z); ctx.translate(-470, -900);
    D.plate(ctx);
    const lit = D.lights([{ x: 150, y: 1350, r: 1300, k: 0.6 * flick }, { x: 980, y: 500, r: 700, k: 0.18 }], 0.03);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.12, spacing: 6.5, width: 1.1, color: '#A8A0B0', alpha: 0.8, seed: 11, density: (x, y) => lit(x, y) * 0.7, length: [30, 120] });
    for (let row = 0, y = 40; y < 1920; y += 112, row++) { L.inkPath(ctx, [[-10, y], [1090, y + 6]], { width: 3, color: '#000', seed: 200 + row, taper: 0 }); for (let x = (row % 2) * 120 - 60; x < 1080; x += 240) L.inkPath(ctx, [[x, y], [x + 4, y + 112]], { width: 2.6, color: '#000', seed: 300 + row * 9 + x, taper: 0 }); }
    D.glow(ctx, 160, 1300, 900, C.candle, 0.45 * flick);
    D.bust(ctx, 540, 900, 820, { yaw: -0.32 + 0.22 * L.ease.inOutSine(L.clamp(t / 5.6)) + 0.03 * Math.sin(T * 1.3), pitch: 0.06, key: [-0.7, 0.2, 0.65], glint: 0.6 + 0.4 * Math.abs(Math.sin(T * 1.7)), res: 0.36 });
    D.candle(ctx, 150, 1600, 1.3, T, { seed: 3, h: 300 });
    D.mist(ctx, T, { y: 1760, h: 400, a: 0.3, speed: 30 });
    ctx.restore();
    D.grain(ctx, T, 1);
    if (T < 3.75) {
      D.word(ctx, 'HIS FACE WAS', 540, 150, 92, T / 0.12, { under: false, seed: 4 });
      D.word(ctx, 'HIDDEN', 540, 290, 160, (T - 0.15) / 0.14, { seed: 5 });
      D.word(ctx, 'FOR 34 YEARS', 540, 440, 104, (T - 0.38) / 0.16, { color: C.yellow, seed: 6 });
    } else {
      D.word(ctx, 'NOBODY KNOWS', 540, 200, 108, (T - 3.8) / 0.16, { seed: 7 });
      D.word(ctx, 'WHO HE WAS', 540, 345, 120, (T - 4.7) / 0.16, { color: C.yellow, seed: 8 });
    }
  } });
})();
