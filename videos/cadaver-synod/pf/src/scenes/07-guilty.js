// 07 · guilty · T 16.75–18.5 · silence: one candle beside the enthroned skull, slow push. "The verdict?" (17.26);
// "Guilty" (17.81) → lightning, GUILTY in blackletter slams, the sockets blaze.
(function () {
  'use strict';
  FILM.scene({ id: 'guilty', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const hit = T >= 17.81, fl = D.flash(T, [17.79]);
    let sh = 0; { const d = T - 17.81; if (d >= 0 && d < 0.4) sh = (1 - d / 0.4) * 30; }
    ctx.save(); ctx.translate(sh * Math.sin(T * 97), sh * Math.cos(T * 83));
    D.bg(ctx, { top: '#0C080C', bottom: '#030203' });
    if (fl > 0) { const lg = ctx.createRadialGradient(540, 800, 100, 540, 900, 1300); lg.addColorStop(0, `rgba(230,210,230,${0.9 * fl})`); lg.addColorStop(1, `rgba(120,60,80,${0.4 * fl})`); ctx.fillStyle = lg; ctx.fillRect(0, 0, 1080, 1920); }
    const z = 1 + 0.12 * L.ease.inOutSine(t / info.dur) + (hit ? 0.06 : 0);
    ctx.save(); ctx.translate(540, 1000); ctx.scale(z, z); ctx.translate(-540, -1000);
    D.glow(ctx, 760, 1350, 700, C.candle, hit ? 0.7 : 0.5);
    D.skull3d(ctx, 540, 1060, 620, { yaw: 0.18 * Math.sin(T * 0.9) - 0.1, pitch: 0.12, jaw: hit ? 0.25 + 0.6 * L.clamp((T - 17.81) / 0.1) : 0.15, ember: hit ? 1 : 0.15 });
    D.candle(ctx, 790, 1500, 1.2, T, { seed: 4, h: 260 });
    ctx.restore();
    ctx.restore();
    D.grain(ctx, T, 1);
    const q = L.clamp((T - 17.26) / 0.15) * (hit ? 0.0 : 1);
    if (q > 0) L.text(ctx, 'THE VERDICT?', 540, 330, { size: 64, family: '"Cinzel", serif', weight: 700, align: 'center', color: C.bone, alpha: q, tracking: '0.14em' });
    D.stamp(ctx, 'Guilty', 540, 330, 220, T - 17.81, { fraktur: true, color: '#D42A26', glowCol: 'rgba(255,40,20,0.9)', blur: 40 });
  } });
})();
