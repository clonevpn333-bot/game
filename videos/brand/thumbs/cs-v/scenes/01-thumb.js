// WHY WE WONDER · ep5 vertical cover (engraved): the 3D engraved skull + tiara, eyes burning, crypt wall hatched by candlelight.
(function () {
  'use strict';
  FILM.scene({ id: 'thumb', draw(ctx) {
    const L = FILM.lib, D = FILM.df, C = D.C, T = 12.2;
    D.plate(ctx);
    const lit = D.lights([{ x: 150, y: 1600, r: 1100, k: 0.55 }, { x: 950, y: 1640, r: 1100, k: 0.5 }, { x: 540, y: 900, r: 900, k: 0.25 }], 0.03);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.12, spacing: 6.5, width: 1.1, color: '#A89A8E', alpha: 0.8, seed: 11, density: (x, y) => lit(x, y) * 0.75, length: [30, 120] });
    for (let row = 0, y = 40; y < 1920; y += 118, row++) { L.inkPath(ctx, [[-10, y], [1090, y + 6]], { width: 3, color: '#000', seed: 200 + row, taper: 0 }); for (let x = (row % 2) * 130 - 60; x < 1080; x += 260) L.inkPath(ctx, [[x, y], [x + 4, y + 118]], { width: 2.6, color: '#000', seed: 300 + row * 9 + x, taper: 0 }); }
    D.glow(ctx, 540, 1250, 900, C.candle, 0.4);
    D.skull(ctx, 540, 1130, 760, { yaw: -0.22, pitch: 0.1, roll: -0.05, jaw: 0.45, ember: 1, res: 0.5 });
    D.candle(ctx, 140, 1600, 1.3, T, { seed: 2, h: 300 });
    D.candle(ctx, 950, 1640, 1.2, T + 1, { seed: 5, h: 280 });
    D.mist(ctx, T, { y: 1760, h: 420, a: 0.35 });
    D.grain(ctx, T, 0.9);
    D.word(ctx, 'DEAD POPE', 540, 185, 150, 1, { under: false });
    D.word(ctx, 'ON TRIAL', 540, 1690, 160, 1, { color: '#E8443A', seed: 3 });
    L.text(ctx, 'WHY WE WONDER', 540, 1850, { size: 30, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: C.ivory, alpha: 0.8, tracking: '0.4em' });
  } });
})();
