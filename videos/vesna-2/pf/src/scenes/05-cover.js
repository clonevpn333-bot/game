// 05 · cover · T 15.0–18.5 · the certificate (whole) under a lamp; a SECRET dossier (TAJNÉ) slides in over it (15.4);
// COVER STORY? is stamped across both (16.58); 18.0–18.5 the lamp cuts — silence before the pivot.
(function () {
  'use strict';
  FILM.scene({ id: 'cover', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 241, color: '#0B0D16' });
    PB.burst(ctx, 540, 1050, 900, 0.2, '255,220,160');
    const z = 1 + 0.04 * (T - 15);
    ctx.save(); ctx.translate(540, 1050); ctx.scale(z, z); ctx.translate(-540, -1050);
    FILM.pbCert(ctx, L, D, PB, 540, 1180, 1);
    const dp = L.ease.outCubic(L.clamp((T - 15.35) / 0.35));
    if (dp > 0) {
      ctx.save(); ctx.translate(L.lerp(-500, 470, dp), 840); ctx.rotate(-0.08);
      D.engrave(ctx, L.rectPts(-300, -220, 600, 440, 40), { ink: '#D8B880', base: '#A88A50', light: () => 0.2, angle: 0.6, spacing: 5, seed: 310, smooth: false, outW: 4, cross: false, stip: false });
      L.inkPath(ctx, L.rectPts(-300, -250, 220, 40, 20), { closed: true, width: 3, color: '#5A4020', fill: '#C8A870', seed: 311 });
      L.text(ctx, 'TAJNÉ · SECRET', 0, -150, { size: 44, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: '#8A1A10', tracking: '0.08em' });
      L.text(ctx, 'ČSSR · 1972', 0, -90, { size: 24, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#3A2A10', tracking: '0.2em' });
      for (let k = 0; k < 5; k++) L.inkPath(ctx, [[-240, -30 + k * 40], [k === 4 ? 40 : 240, -30 + k * 40]], { width: 6, color: '#6A5430', seed: 312 + k, taper: 0 });
      ctx.restore();
    }
    ctx.restore();
    const st = L.clamp((T - 16.58) / 0.07);
    if (st > 0) {
      ctx.save(); ctx.translate(540, 1040); ctx.rotate(-0.2); const g = 1 + 0.5 * (1 - L.ease.outCubic(st)); ctx.scale(g, g); ctx.globalAlpha = L.clamp(st * 1.5);
      ctx.fillStyle = 'rgba(242,232,208,0.85)'; ctx.beginPath(); L.tracePath(ctx, L.rrectPts(-420, -100, 840, 200, 14), true); ctx.fill();
      L.inkPath(ctx, L.rrectPts(-420, -100, 840, 200, 14), { closed: true, width: 12, color: PB.RED, seed: 320 });
      L.text(ctx, 'COVER STORY?', 0, 8, { size: 118, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: PB.RED, tracking: '0.04em' });
      ctx.restore();
    }
    const off = L.clamp((T - 18.0) / 0.1);
    if (off > 0) { ctx.fillStyle = `rgba(2,3,8,${0.85 * off})`; ctx.fillRect(0, 0, 1080, 1920); }
  } });
})();
