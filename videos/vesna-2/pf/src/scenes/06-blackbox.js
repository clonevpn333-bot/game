// 06 · blackbox · T 18.5–21.5 · PIVOT on the hit: the flight recorder (engraved orange box) slams in; its altitude trace —
// the curiosity line — draws across a chart, flat at cruising height, and the BLAST marker lands up there (20.07),
// not near the ground.
(function () {
  'use strict';
  FILM.scene({ id: 'blackbox', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 251, color: '#0A0E18' });
    PB.grid(ctx, 0.07, 60);
    // the recorder slams down (scale + shake)
    const sl = L.clamp((T - 18.5) / 0.1), sh = T < 18.8 ? (1 - (T - 18.5) / 0.3) * 12 : 0;
    ctx.save(); ctx.translate(540 + Math.sin(T * 90) * sh, 600); const g = 1 + 0.5 * (1 - L.ease.outCubic(sl)); ctx.scale(g * 0.95, g * 0.95);
    D.engrave(ctx, L.rrectPts(-260, -170, 520, 340, 26), { ink: '#FFB060', base: '#C85A10', light: () => 0.35, angle: 0.8, spacing: 4.5, seed: 330, smooth: false, outW: 5 });
    for (const dy of [-110, 110]) { ctx.fillStyle = '#F2E8D0'; ctx.fillRect(-260, dy - 14, 520, 28); for (let k = 0; k < 12; k++) { ctx.fillStyle = '#1A1A1A'; ctx.beginPath(); ctx.moveTo(-260 + k * 44, dy - 14); ctx.lineTo(-240 + k * 44, dy - 14); ctx.lineTo(-218 + k * 44, dy + 14); ctx.lineTo(-238 + k * 44, dy + 14); ctx.fill(); } }
    L.text(ctx, 'FLIGHT RECORDER', 0, -28, { size: 46, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: '#1A0A00', tracking: '0.04em' });
    L.text(ctx, 'DO NOT OPEN', 0, 30, { size: 30, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#1A0A00', tracking: '0.2em' });
    ctx.restore();
    // the chart
    const X0 = 110, X1 = 970, Y0 = 900, Y1 = 1500;
    L.inkPath(ctx, [[X0, Y0], [X0, Y1], [X1, Y1]], { width: 3, color: PB.IV, seed: 340, taper: 0, smooth: false });
    L.text(ctx, 'ALTITUDE', X0 + 10, Y0 - 30, { size: 24, family: PB.MONO, weight: 600, align: 'left', baseline: 'middle', color: PB.IV, tracking: '0.2em' });
    const yc = Y0 + 80, yl = Y1 - 50;
    L.inkPath(ctx, [[X0, yc], [X1, yc]], { width: 1.5, color: PB.Y, alpha: 0.35, seed: 341, taper: 0 });
    L.text(ctx, '33,330 FT', X1, yc - 26, { size: 22, family: PB.MONO, weight: 600, align: 'right', baseline: 'middle', color: PB.Y });
    const u = L.clamp((T - 18.95) / 1.1), xe = L.lerp(X0, X0 + (X1 - X0) * 0.72, u);
    PB.beam(ctx, [X0, yc + 40], [X0 + 60, yc], { T, w: 4, dots: false, k: u > 0 ? 1 : 0 });
    if (u > 0) PB.beam(ctx, [X0 + 60, yc], [Math.max(X0 + 61, xe), yc], { T, w: 4, dots: false });
    const bp = L.clamp((T - 20.07) / 0.12);
    if (bp > 0) {
      const bx = X0 + (X1 - X0) * 0.72;
      PB.burst(ctx, bx, yc, 200 * bp, 0.9, '255,140,60');
      L.inkPath(ctx, [[bx, yc], [bx, yc + 120]], { width: 3, color: '#FF7A5A', seed: 342 });
      PB.label(ctx, 'BLAST · AT CRUISING HEIGHT', bx - 470, yc + 160, bp, { size: 26, col: '#FF7A5A' });
      // what the theory needs: a low line, shown faint and empty
      L.inkPath(ctx, [[X0, yl], [X1, yl]], { width: 2, color: '#8A92A8', alpha: 0.4, seed: 343, taper: 0 });
      L.text(ctx, 'THEORY: ~800 M', X1, yl - 24, { size: 22, family: PB.MONO, weight: 600, align: 'right', baseline: 'middle', color: '#8A92A8' });
    }
  } });
})();
