// 06 · worse · T 19.5–21.25 · frenzy: the print shakes and tilts, dancers double-time, red ink scrawls; Pip spins out
(function () {
  'use strict';
  FILM.scene({ id: 'worse', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, W = FILM.wc;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const tw = info.shot.start + L.onTwos(t);
    const shake = 10 + 18 * L.clamp((T - 20.3) / 0.6);
    ctx.save();
    ctx.translate(540 + L.noise1(tw * 9, 1) * shake, 960 + L.noise1(tw * 9, 2) * shake);
    ctx.rotate(0.06 * Math.sin(tw * 5));
    ctx.translate(-540, -960);
    W.street(ctx, T, { rows: 3, vy: 760 });
    const r = L.rng(L.hash('worse'));
    for (let i = 0; i < 26; i++) { const k = Math.pow(r(), 0.6); W.dancer(ctx, 540 + (r() - 0.5) * L.lerp(300, 1200, k), L.lerp(860, 1900, k), L.lerp(0.12, 0.62, k), (tw - 7) * 18 + r() * 6, { kind: r() > 0.5 ? 'man' : 'woman', flip: r() > 0.5 }); }
    ctx.restore();
    // red ink scrawl radiating
    const sc = L.clamp((T - 19.9) / 1.2);
    for (let k = 0; k < 18 * sc; k++) {
      const a = (k / 18) * Math.PI * 2 + 0.3;
      L.inkPath(ctx, [[540 + Math.cos(a) * 420, 960 + Math.sin(a) * 640], [540 + Math.cos(a + 0.05) * 620, 960 + Math.sin(a + 0.05) * 900]], { width: 9, color: P.wcRed, seed: 60 + k, taper: [4, 30] });
    }
    W.frame(ctx);
  } });
})();
