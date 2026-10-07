// 11 · outro · T 30.75–35.5 · her head alone in the dark, slowly turning; the two certificate halves drift at the edges.
// Kinetic: SUBSCRIBE / FOR PART 2 over a red pill; teaser WAS IT A COVER-UP?; the curiosity line writes WHY WE WONDER small.
(function () {
  'use strict';
  FILM.scene({ id: 'outro', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb, HC = FILM.hc;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    ctx.fillStyle = '#04060B'; ctx.fillRect(0, 0, 1080, 1920);
    const v = ctx.createRadialGradient(540, 760, 20, 540, 760, 900); v.addColorStop(0, 'rgba(26,34,60,0.9)'); v.addColorStop(1, 'rgba(4,6,11,0)'); ctx.fillStyle = v; ctx.fillRect(0, 0, 1080, 1920);
    // certificate halves drifting at the edges
    for (const side of [-1, 1]) { ctx.save(); ctx.globalAlpha = 0.35; ctx.translate(540 + side * 560, 900 + 40 * Math.sin(T + side)); ctx.rotate(side * 0.4); ctx.scale(0.6, 0.6); ctx.beginPath(); ctx.rect(side < 0 ? -400 : 0, -300, 400, 600); ctx.clip(); FILM.pbCert(ctx, L, D, PB, 0, 0, 1); ctx.restore(); }
    const open = L.ease.outCubic(L.clamp((T - 30.75) / 0.5));
    PB.fem(ctx, 540, 690, 620 * open + 1, { win: [-1.9, 1.9, -1.55, 1.4], yaw: -0.6 + 0.18 * (T - 30.75), key: [-0.3, 0.5, 0.8], rim: [0.9, 0.3, -0.4], res: 0.4, slot: 16 });
    // red pill behind SUBSCRIBE (kinetic type sits on it)
    const pp = L.ease.outBack(L.clamp((T - 30.95) / 0.25));
    if (pp > 0) { ctx.save(); ctx.translate(540, 1120); ctx.scale(pp, pp); ctx.fillStyle = '#D0281E'; ctx.beginPath(); ctx.roundRect(-330, -78, 660, 156, 78); ctx.fill(); ctx.restore(); }
    // small WHY WE WONDER mark written by the curiosity line under it
    const wa = L.clamp((T - 32.6) / 0.6);
    if (wa > 0) L.text(ctx, 'WHY WE WONDER', 540, 1430, { size: 34, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: PB.Y, alpha: wa, tracking: '0.4em' });
    if (T > 32.4) { const u = L.clamp((T - 32.4) / 0.8); PB.beam(ctx, [200, 1470], [L.lerp(200, 880, u), 1470], { T, w: 3, dots: false, k: 0.9 }); }
    const f = L.clamp((T - 35.1) / 0.4); if (f > 0) { ctx.fillStyle = `rgba(4,6,11,${0.85 * f})`; ctx.fillRect(0, 0, 1080, 1920); }
  } });
})();
