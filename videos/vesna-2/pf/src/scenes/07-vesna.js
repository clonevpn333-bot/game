// 07 · vesna · T 21.5–24.25 · Vesna herself, warm light, turning toward us; the shoot-down dossier beside her is stamped
// REJECTED (22.67).
(function () {
  'use strict';
  FILM.scene({ id: 'vesna', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 261, color: '#100C10' });
    PB.burst(ctx, 420, 900, 900, 0.25, '255,200,140');
    PB.fem(ctx, 400, 1000, 900, { yaw: 0.65 - 0.2 * L.ease.outCubic(L.clamp((T - 21.5) / 2.5)), key: [-0.2, 0.5, 0.85], rim: [0.9, 0.3, -0.4], res: 0.34, slot: 18, warm: [1.05, 0.95, 0.85] });
    const dp = L.ease.outCubic(L.clamp((T - 21.75) / 0.3));
    if (dp > 0) {
      ctx.save(); ctx.translate(L.lerp(1400, 840, dp), 1250); ctx.rotate(0.08);
      D.engrave(ctx, L.rectPts(-200, -270, 400, 540, 40), { ink: '#E8E2D2', base: '#CFC6B2', light: () => 0.12, angle: 0.3, spacing: 5, seed: 350, smooth: false, outW: 3, cross: false, stip: false });
      L.text(ctx, 'THEORY', 0, -200, { size: 42, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: '#1A1A1A', tracking: '0.08em' });
      L.text(ctx, 'SHOT DOWN', 0, -145, { size: 30, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#3A3A3A', tracking: '0.15em' });
      L.text(ctx, 'AT ~800 M', 0, -105, { size: 30, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#3A3A3A', tracking: '0.15em' });
      for (let k = 0; k < 6; k++) L.inkPath(ctx, [[-150, -40 + k * 44], [k === 5 ? 20 : 150, -40 + k * 44]], { width: 6, color: '#8A8478', seed: 351 + k, taper: 0 });
      const st = L.clamp((T - 22.67) / 0.07);
      if (st > 0) { ctx.save(); ctx.rotate(-0.3); const g = 1 + 0.5 * (1 - L.ease.outCubic(st)); ctx.scale(g, g); ctx.globalAlpha = L.clamp(st * 1.5); L.inkPath(ctx, L.rrectPts(-200, -60, 400, 120, 12), { closed: true, width: 9, color: PB.RED, seed: 360 }); L.text(ctx, 'REJECTED', 0, 6, { size: 66, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: PB.RED }); ctx.restore(); }
      ctx.restore();
    }
  } });
})();
