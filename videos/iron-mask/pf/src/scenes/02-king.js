// 02 · king · T 3.0–7.375 · NOBODY KNOWS / WHO HE WAS (3.06 / 3.92) over the medallion, then royal blue plate stamped with engraved gold fleurs-de-lis; the Sun King's gold medallion flips
// in (3D coin flip), rays turning behind it. 1669 (6.18) · KING LOUIS XIV (6.96) · OF FRANCE (7.74).
(function () {
  'use strict';
  FILM.scene({ id: 'king', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    D.plate(ctx, { color: '#0E1636' });
    const lit = D.lights([{ x: 540, y: 820, r: 1100, k: 0.55 }], 0.06);
    // fleur-de-lis field (engraved gold stamps)
    for (let j = 0; j < 9; j++) for (let i = 0; i < 6; i++) { const x = 90 + i * 180 + (j % 2) * 90, y = 120 + j * 210; D.fleur(ctx, x, y, 0.55, (a, b) => lit(a, b) * 0.55, 700 + j * 10 + i); }
    // sun rays
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2 + T * 0.15, r0 = 330, r1 = 560 + (k % 2) * 90; L.inkPath(ctx, [[540 + Math.cos(a) * r0, 820 + Math.sin(a) * r0], [540 + Math.cos(a) * r1, 820 + Math.sin(a) * r1]], { width: k % 2 ? 4 : 7, color: C.gold, alpha: 0.75, seed: 800 + k, taper: [4, 30] }); }
    const flip = L.ease.outBack(L.clamp(t / 0.45));
    D.medallion(ctx, 540, 820, 300, Math.cos((1 - flip) * Math.PI * 0.95), T);
    D.grain(ctx, T, 1);
    if (T < 5.45) { D.word(ctx, 'NOBODY KNOWS', 540, 190, 104, (T - 3.06) / 0.15, { under: false, seed: 20 }); D.word(ctx, 'WHO HE WAS', 540, 320, 118, (T - 3.92) / 0.15, { color: C.yellow, seed: 21 }); }
    else D.word(ctx, '1669', 540, 250, 170, (T - 5.56) / 0.15, { color: C.yellow, seed: 9 });
    const MONO = '"JetBrains Mono", monospace';
    L.text(ctx, 'KING LOUIS XIV', 540, 1240, { size: 52, family: MONO, weight: 600, align: 'center', color: C.ivory, alpha: L.clamp((T - 6.34) / 0.2), tracking: '0.18em' });
    L.text(ctx, 'OF FRANCE', 540, 1310, { size: 40, family: MONO, weight: 600, align: 'center', color: C.gold, alpha: L.clamp((T - 7.0) / 0.2), tracking: '0.4em' });
  } });
})();
