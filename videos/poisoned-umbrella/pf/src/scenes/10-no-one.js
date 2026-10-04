// 10 · no-one · T 33.00–35.25 · 2D
// "No one was ever charged." The board comes apart: the string snaps, the cards fall away one by one, the cork
// sinks into darkness — and only the pellet is left, glowing, travelling to the centre (handoff to shot 11).
(function () {
  'use strict';
  const ID = 'no-one';
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, M = FILM.mk;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const fall = L.ease.inQuad(L.clamp((T - 33.2) / 1.5));
      const dark = L.ease.inOutCubic(L.clamp((T - 33.6) / 1.3));
      M.board(ctx, T, { fall, dark });
      // the pellet survives the collapse: it rises from its card toward the centre of the dark
      const k = L.ease.inOutCubic(L.clamp((T - 33.8) / 1.3));
      const cd = M.CARDS[3];
      const x = L.lerp(cd.x + 150, 540, k), y = L.lerp(cd.y + 120, 760, k);
      const R = L.lerp(70, 40, k);
      if (k > 0) {
        const g = ctx.createRadialGradient(x, y, R * 0.8, x, y, R * 4);
        g.addColorStop(0, L.rgba(P.hcYellow, 0.3 * k));
        g.addColorStop(1, L.rgba(P.hcYellow, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 1080, 1920);
        M.sphere(ctx, M.pelletTex(), 'pellet', x, y, R, T * 0.8, { spec: 1, ambient: 0.3, tilt: 0.25 });
      }
    },
  });
})();
