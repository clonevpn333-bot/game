// 01 · street-1518 · T 0–3.25 · woodcut + Pip's porthole
(function () {
  'use strict';
  const PH = [850, 1180, 150];
  FILM.scene({ id: 'street-1518', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, W = FILM.wc;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const z = 1 + 0.06 * L.ease.inOutSine(t / info.dur);
    ctx.save(); ctx.translate(540, 1100); ctx.scale(z, z); ctx.translate(-540, -1100);
    W.street(ctx, T);
    const wk = L.clamp(t / 3.25);
    W.dancer(ctx, L.lerp(470, 540, wk), L.lerp(1360, 1520, wk), L.lerp(0.32, 0.46, wk), L.onTwos(t) * 7, { walk: true });
    ctx.restore();
    // the printed title ribbon
    const a = L.clamp((T - 0.4) / 0.3);
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = P.parch; ctx.fillRect(200, 250, 680, 120);
      ctx.strokeStyle = P.wcInk; ctx.lineWidth = 6; ctx.strokeRect(200, 250, 680, 120); ctx.lineWidth = 2; ctx.strokeRect(212, 262, 656, 96);
      L.text(ctx, 'ANNO · 1518', 540, 312, { size: 64, family: '"Fraunces", Georgia, serif', weight: 600, align: 'center', baseline: 'middle', color: P.wcInk, tracking: '0.12em' });
      ctx.restore();
      L.text(ctx, 'STRASSBURG', 540, 410, { size: 26, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: P.wcInk, alpha: a, tracking: '0.6em' });
    }
    W.frame(ctx);
  } });
  FILM.scene({ id: 'street-1518-fg', draw(ctx, tIn, info) {
    const L = info.lib, T = info.shot.start + L.clamp(tIn, 0, info.dur);
    FILM.wc.porthole(ctx, PH[0], PH[1], PH[2] * L.ease.outBack(L.clamp((T - 1.1) / 0.35)), { ring: true });
  } });
})();
