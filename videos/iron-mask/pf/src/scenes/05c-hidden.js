// 05c · hidden · T 16.79–18.46 · the masked bust close in cold light — HIS FACE (16.83) / KEPT HIDDEN (17.44).
(function () {
  'use strict';
  FILM.scene({ id: 'hidden', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    D.plate(ctx, { color: '#0A0E1E' });
    const lit = D.lights([{ x: 900, y: 600, r: 1300, k: 0.5 }], 0.04);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.1, spacing: 6.5, width: 1, color: '#8A96C8', alpha: 0.7, seed: 92, density: (x, y) => lit(x, y) * 0.6 });
    D.bust(ctx, 540, 960, 900, { yaw: 0.3 - 0.12 * t, pitch: 0.05, key: [0.75, 0.3, 0.55], glint: 0.9, res: 0.34, slot: 5 });
    D.grain(ctx, T, 1);
    D.word(ctx, 'HIS FACE', 540, 220, 120, (T - 16.83) / 0.14, { under: false, seed: 23 });
    D.word(ctx, 'KEPT HIDDEN', 540, 360, 120, (T - 17.44) / 0.14, { color: C.yellow, seed: 24 });
  } });
})();
