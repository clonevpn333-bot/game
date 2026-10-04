// 04 · the-sun · T 8.0–10.25 · the Sun in 3D, 1,400,000 KM wide. "into" (9.81) → two blueprint press plates slam
// in and squeeze it to a white-hot pellet; a dashed guide keeps its old size.
(function () {
  'use strict';
  FILM.scene({ id: 'the-sun', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, SP = FILM.sp, M = FILM.mk;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    SP.space(ctx, T, { zoom: 1.05 });
    const C = [540, 840], R0 = 360;
    const sq = L.ease.inCubic(L.clamp((T - 9.81) / 0.36));
    const R = L.lerp(R0 * L.ease.outBack(L.clamp(t / 0.35)), 28, sq);
    if (sq > 0) L.guideCircle(ctx, C[0], C[1], R0, { alpha: 0.45, width: 2, dash: [8, 10] });
    SP.star(ctx, 'sun', C[0], C[1], R, T * 0.3, { glow: 1, glowR: 1.7, heat: 0.8 * sq, glowColor: sq > 0.7 ? '#FFF2D0' : undefined });
    // press plates
    const pa = L.clamp((T - 9.55) / 0.2);
    if (pa > 0) {
      const gap = sq > 0 ? R + 4 : L.lerp(700, R0 + 6, L.ease.outCubic(pa));
      for (const s of [-1, 1]) {
        const x = C[0] + s * gap;
        const px = s < 0 ? x - 90 : x;
        ctx.fillStyle = '#16244C'; ctx.fillRect(px, C[1] - 300, 90, 600);
        L.hatch(ctx, [[px, C[1] - 300], [px + 90, C[1] - 300], [px + 90, C[1] + 300], [px, C[1] + 300]], { angle: 0.8, spacing: 9, width: 1.5, color: '#F2E8D0', alpha: 0.35, seed: 50 + s });
        ctx.strokeStyle = P.hcIvory; ctx.lineWidth = 5; ctx.strokeRect(px, C[1] - 300, 90, 600);
        ctx.strokeStyle = P.hcYellow; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(px + (s < 0 ? -10 : 100), C[1]); ctx.lineTo(px + (s < 0 ? -140 : 230), C[1]); ctx.stroke();
      }
    }
    const la = L.clamp((T - 8.2) / 0.25) * (1 - sq);
    M.label(ctx, 'THE SUN', 540, 330, { size: 44, align: 'center', alpha: la });
    L.text(ctx, '1,400,000 KM WIDE', 540, 1300, { size: 34, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: P.hcYellow, alpha: L.clamp((T - 8.6) / 0.25) * (1 - sq), tracking: '0.14em' });
  } });
})();
