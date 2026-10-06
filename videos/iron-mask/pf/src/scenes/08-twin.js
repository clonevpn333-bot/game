// 08 · twin · T 25.85–28.8 · a mirror: the King's medallion left, the masked bust right, the curiosity line drawn down the
// middle as the mirror (26.0). ONE THEORY / THE KING'S SECRET TWIN? (27.66).
(function () {
  'use strict';
  FILM.scene({ id: 'twin', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    D.plate(ctx, { color: '#0E1636' });
    D.glow(ctx, 270, 900, 600, C.gold, 0.3);
    D.glow(ctx, 810, 900, 600, '#8A9AE0', 0.25);
    D.medallion(ctx, 270, 880, 220, 1, T);
    D.bust(ctx, 810, 820, 430, { yaw: -0.45, pitch: 0.06, slot: 3, res: 0.4 });
    const mu = L.ease.inOutCubic(L.clamp((T - 25.95) / 0.6));
    if (mu > 0) FILM.hc.line(ctx, [[540, 380], [540, 1420]], { plate: 'blueprint', to: Math.max(0.02, mu), width: 5, seed: 71, head: mu < 1 });
    D.grain(ctx, T, 1);
    const MONO = '"JetBrains Mono", monospace';
    L.text(ctx, 'THE KING', 270, 1200, { size: 30, family: MONO, weight: 600, align: 'center', color: C.gold, alpha: L.clamp((T - 26.2) / 0.2), tracking: '0.2em' });
    L.text(ctx, 'THE PRISONER', 810, 1200, { size: 30, family: MONO, weight: 600, align: 'center', color: '#B8C4E8', alpha: L.clamp((T - 26.4) / 0.2), tracking: '0.2em' });
    L.text(ctx, 'ONE THEORY', 540, 230, { size: 30, family: MONO, weight: 600, align: 'center', color: C.ivory, alpha: L.clamp((T - 26.3) / 0.2), tracking: '0.4em' });
    D.word(ctx, "THE KING'S", 540, 1360, 84, (T - 27.66) / 0.16, { under: false, seed: 17 });
    D.word(ctx, 'SECRET TWIN?', 540, 1480, 100, (T - 27.92) / 0.18, { color: C.yellow, seed: 18 });
  } });
})();
