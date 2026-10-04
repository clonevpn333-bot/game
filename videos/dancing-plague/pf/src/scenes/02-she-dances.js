// 02 · she-dances · T 5.0–7.5 · woodcut close: she steps out of her doorway (5.8) and begins to dance (7.05)
(function () {
  'use strict';
  const PH = [860, 330, 140];
  FILM.scene({ id: 'she-dances', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, W = FILM.wc;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    W.paper(ctx);
    W.house(ctx, -120, 1560, 560, 1000, 41);
    W.house(ctx, 640, 1560, 600, 1100, 42);
    // her doorway (dark arch) in the left house
    ctx.fillStyle = P.wcInk; ctx.beginPath(); ctx.moveTo(140, 1560); ctx.lineTo(140, 1300); ctx.arc(230, 1300, 90, Math.PI, 0); ctx.lineTo(320, 1560); ctx.fill();
    // cobbles
    ctx.fillStyle = '#E2D4B4'; ctx.fillRect(0, 1560, 1080, 360);
    ctx.strokeStyle = P.wcInk; ctx.lineWidth = 2.5;
    for (let j = 0; j < 7; j++) for (let x = -40; x < 1120; x += 60) { ctx.beginPath(); ctx.arc(x + (j % 2) * 30, 1590 + j * 46, 26, Math.PI, 0); ctx.stroke(); }
    const walk = L.ease.inOutSine(L.clamp((T - 5.8) / 0.9));
    const x = L.lerp(230, 540, walk);
    const dancing = T >= 7.0;
    const tw = L.onTwos(t);
    const moving = T > 5.8 && T < 6.7;
    W.dancer(ctx, x, 1600, 1.15, dancing ? (info.shot.start + tw - 7.0) * 9 : moving ? (info.shot.start + tw) * 7 : 0, { still: !dancing && !moving, walk: moving });
    if (dancing && T < 7.4) {
      // a burst of woodcut motion lines on the first step
      ctx.strokeStyle = P.wcRed; ctx.lineWidth = 5;
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 340, 1100 + Math.sin(a) * 420); ctx.lineTo(x + Math.cos(a) * 400, 1100 + Math.sin(a) * 490); ctx.stroke(); }
    }
    W.frame(ctx);
  } });
  FILM.scene({ id: 'she-dances-fg', draw(ctx) { FILM.wc.porthole(ctx, PH[0], PH[1], PH[2], { ring: true }); } });
})();
