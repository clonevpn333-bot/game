// WHY WE WONDER · ep8 PART 2 vertical cover: the torn record certificate, the curiosity line through it, a red ?.
(function () {
  'use strict';
  FILM.scene({ id: 'thumb', draw(ctx) {
    const L = FILM.lib, D = FILM.df, PB = FILM.pb, T = 0.6;
    PB.plate(ctx, { seed: 201, color: '#0B0D16' });
    PB.burst(ctx, 540, 1050, 900, 0.22, '255,220,160');
    const cx = 540, cy = 1050, re = 1;
    const cut = (side) => { ctx.beginPath(); if (side < 0) { ctx.moveTo(-100, -100); ctx.lineTo(cx + 120, -100); ctx.lineTo(cx - 120, 2100); ctx.lineTo(-100, 2100); } else { ctx.moveTo(cx + 120, -100); ctx.lineTo(1200, -100); ctx.lineTo(1200, 2100); ctx.lineTo(cx - 120, 2100); } ctx.closePath(); };
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1.15, 1.15); ctx.translate(-cx, -cy);
    for (const side of [-1, 1]) { ctx.save(); cut(side); ctx.clip(); ctx.translate(side * 150 * re, 60 * re); ctx.rotate(side * 0.22 * re); FILM.pbCert(ctx, L, D, PB, cx, cy, 1); ctx.restore(); }
    ctx.restore();
    PB.beam(ctx, [cx + 480, 420], [cx - 480, 1720], { T, w: 8 });
    L.text(ctx, '?', cx, cy + 40, { size: 360, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: PB.RED });
    PB.word(ctx, 'THE RECORD FALL', 540, 170, 96, 1);
    PB.word(ctx, 'WAS A LIE?', 540, 320, 150, 1, { color: '#FF6A4A' });
    PB.word(ctx, 'SHOT DOWN BY MISTAKE?', 540, 1640, 66, 1, { color: PB.Y });
    L.text(ctx, 'PART 2', 540, 1770, { size: 40, family: PB.MONO, weight: 600, align: 'center', color: PB.Y, tracking: '0.4em' });
    L.text(ctx, 'WHY WE WONDER', 540, 1860, { size: 28, family: PB.MONO, weight: 600, align: 'center', color: PB.IV, alpha: 0.8, tracking: '0.4em' });
  } });
})();
