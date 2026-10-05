// 07 · guilty · T 16.75–18.5 · silence; one candle beside the engraved 3D skull, slow push. THE VERDICT? (17.26).
// "Guilty" (17.81): lightning, the film's ONE slam — GUILTY — and the sockets blaze.
(function () {
  'use strict';
  FILM.scene({ id: 'guilty', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t + FILM.SHIFT;
    const hit = T >= 17.81, fl = D.flash(T, [17.79]);
    let sh = 0; { const d = T - 17.81; if (d >= 0 && d < 0.4) sh = (1 - d / 0.4) * 28; }
    ctx.save(); ctx.translate(sh * Math.sin(T * 97), sh * Math.cos(T * 83));
    D.plate(ctx, { color: '#0A0809' });
    const lit = D.lights([{ x: 790, y: 1450, r: 1100, k: 0.45 }, { x: 540, y: 800, r: 1200, k: 0.7 * fl }], 0.02);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.15, spacing: 6.5, width: 1, color: '#9A8C80', alpha: 0.8, seed: 41, density: (x, y) => lit(x, y) * 0.7 });
    const z = 1 + 0.1 * L.ease.inOutSine(t / info.dur) + (hit ? 0.05 : 0);
    ctx.save(); ctx.translate(540, 1000); ctx.scale(z, z); ctx.translate(-540, -1000);
    D.skull(ctx, 540, 1060, 640, { yaw: 0.18 * Math.sin(T * 0.9) - 0.1, pitch: 0.12, jaw: hit ? 0.25 + 0.6 * L.clamp((T - 17.81) / 0.1) : 0.15, ember: hit ? 1 : 0.15, key: [0.55 - 0.9 * fl, -0.35 + 0.7 * fl, 0.7] });
    D.candle(ctx, 800, 1500, 1.2, T, { seed: 4, h: 260 });
    ctx.restore();
    ctx.restore();
    D.grain(ctx, T, 1);
    if (!hit) D.word(ctx, 'THE VERDICT?', 540, 330, 72, (T - 17.26) / 0.25, { seed: 10 });
    const d = T - 17.81;
    if (d >= 0) { const k = 1 + 0.5 * Math.pow(1 - L.clamp(d / 0.12), 2); ctx.save(); ctx.translate(540, 330); ctx.scale(k, k); L.text(ctx, 'GUILTY', 0, 0, { size: 200, family: '"Fraunces", Georgia, serif', weight: 800, align: 'center', baseline: 'middle', color: '#E8352C', tracking: '0.06em' }); ctx.restore(); L.inkPath(ctx, [[200, 430], [880, 434]], { width: 6, color: '#E8352C', seed: 11, draw: L.clamp(d / 0.2) }); }
  } });
})();
