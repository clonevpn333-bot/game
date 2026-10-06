// WHY WE WONDER · ep6 vertical cover: the engraved 3D iron-masked bust in torchlight.
(function () {
  'use strict';
  FILM.scene({ id: 'thumb', draw(ctx) {
    const L = FILM.lib, D = FILM.df, C = D.C, T = 2.0;
    D.plate(ctx);
    const lit = D.lights([{ x: 150, y: 1350, r: 1300, k: 0.65 }, { x: 980, y: 500, r: 800, k: 0.2 }], 0.03);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.12, spacing: 6.5, width: 1.1, color: '#A8A0B0', alpha: 0.8, seed: 11, density: (x, y) => lit(x, y) * 0.7, length: [30, 120] });
    for (let row = 0, y = 40; y < 1920; y += 112, row++) { L.inkPath(ctx, [[-10, y], [1090, y + 6]], { width: 3, color: '#000', seed: 200 + row, taper: 0 }); for (let x = (row % 2) * 120 - 60; x < 1080; x += 240) L.inkPath(ctx, [[x, y], [x + 4, y + 112]], { width: 2.6, color: '#000', seed: 300 + row * 9 + x, taper: 0 }); }
    D.glow(ctx, 160, 1300, 1000, C.candle, 0.5);
    D.bust(ctx, 540, 930, 880, { yaw: -0.25, pitch: 0.05, key: [-0.7, 0.2, 0.65], glint: 1, res: 0.5 });
    D.candle(ctx, 140, 1620, 1.3, T, { seed: 3, h: 300 });
    D.mist(ctx, T, { y: 1780, h: 380, a: 0.3 });
    D.grain(ctx, T, 0.9);
    D.word(ctx, 'NOBODY SAW', 540, 165, 128, 1, { under: false, seed: 2 });
    D.word(ctx, 'HIS FACE', 540, 315, 160, 1, { color: C.yellow, seed: 3 });
    D.word(ctx, 'FOR 34 YEARS', 540, 1690, 118, 1, { color: '#E8443A', under: false, seed: 4 });
    L.text(ctx, 'WHY WE WONDER', 540, 1850, { size: 30, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: C.ivory, alpha: 0.8, tracking: '0.4em' });
  } });
})();
