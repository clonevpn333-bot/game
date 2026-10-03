// 01 · cave-hand · T 0.00–2.75 · paper
// Layers: (1) limestone wall (FILM.hx.wall, camera push 1.08→1 by 2.25) (2) cast shadow of the hand
// (3) the hand descending from top-right, foreshortened, pressing flat on G1 at T 2.25 (on twos)
// (4) rock-dust puff at the press (5) torch light + darkness (6) dust motes (7) engraved tick-arc annotation.
(function () {
  'use strict';
  const ID = 'cave-hand';
  const T_PRESS = 2.25;
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, X = FILM.hx, HC = FILM.hc;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.T;
      const tw = L.onTwos(t);
      const G = HC.HAND;
      // camera push toward G1, landing unscaled on the press
      const zoom = 1 + 0.08 * (1 - L.ease.inOutCubic(L.clamp(t / T_PRESS)));
      X.wall(ctx, { zoom, cx: G.cx, cy: G.cy });

      // hand approach: 0 = far (off top-right, lifted, foreshortened), 1 = flat on the wall
      const k = L.ease.outCubic(L.clamp((tw - 0.35) / (T_PRESS - 0.35)));
      const lift = 1 - k;
      const squash = t >= T_PRESS ? 1 - 0.035 * Math.exp(-(t - T_PRESS) * 9) : 1;
      const ox = 260 * lift, oy = -520 * lift;
      const sc = 1 + 0.32 * lift;
      const rot = -0.22 * lift;
      const fore = 1 - 0.38 * lift; // foreshortening along the hand's length

      // cast shadow: the torch is lower-left, so the shadow falls up-right of the hand and shrinks onto it
      ctx.save();
      ctx.filter = `blur(${(4 + 26 * lift).toFixed(1)}px)`;
      ctx.translate(G.cx + ox * 1.2 + 110 * lift + 14, G.cy + oy * 1.2 - 90 * lift - 10);
      ctx.rotate(rot * 0.6);
      ctx.scale(sc * 0.95, sc * fore * 0.95);
      ctx.translate(-G.cx, -G.cy);
      L.tracePath(ctx, HC.hand().outline, true);
      ctx.fillStyle = L.rgba('#1a0c04', 0.62 * (0.45 + 0.55 * k));
      ctx.fill();
      ctx.restore();

      // the hand
      ctx.save();
      ctx.translate(G.cx + ox, G.cy + oy);
      ctx.rotate(rot);
      ctx.scale(sc, sc * fore * squash);
      ctx.translate(-G.cx, -G.cy);
      X.skinHand(ctx, { seed: 31 });
      ctx.restore();

      // dust puff at the press
      if (t >= T_PRESS) {
        const u = t - T_PRESS;
        const h = HC.hand();
        const r = L.rng(L.hash(ID, 'puff'));
        for (let i = 0; i < 140; i++) {
          const p = h.outline[Math.floor(r() * h.outline.length)];
          const a = Math.atan2(p[1] - G.cy, p[0] - G.cx) + (r() - 0.5) * 0.8;
          const sp = 40 + r() * 160;
          const d = sp * (1 - Math.exp(-u * 4));
          const al = (0.55 * (1 - u / 0.5)) * (0.4 + r() * 0.6);
          if (al <= 0) continue;
          ctx.fillStyle = L.rgba(P.stoneLight, al);
          ctx.beginPath();
          ctx.arc(p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d - u * 30, 1 + r() * 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      X.torch(ctx, T, { amount: 1 });
      X.motes(ctx, T, { n: 300, seed: 77 });

      // engraved arc annotation: a tick scale counting back through time; a red tick lands on the press
      const ac = [250, 300], R = 150;
      const pa = L.ease.outExpo(L.clamp(t / 0.6));
      L.arcAnnotation(ctx, ac[0], ac[1], R, Math.PI * 0.95, Math.PI * (0.95 + 0.75 * pa), { color: P.annYellow, width: 2, endTicks: 8, alpha: 0.85 });
      for (let i = 0; i <= 24; i++) {
        const a = Math.PI * (0.95 + (0.75 * i) / 24);
        if (i / 24 > pa) break;
        const long = i % 6 === 0;
        ctx.strokeStyle = L.rgba(P.stoneLight, 0.8);
        ctx.lineWidth = long ? 2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(ac[0] + Math.cos(a) * R, ac[1] + Math.sin(a) * R);
        ctx.lineTo(ac[0] + Math.cos(a) * (R - (long ? 20 : 10)), ac[1] + Math.sin(a) * (R - (long ? 20 : 10)));
        ctx.stroke();
      }
      // the sweeping needle counts back while the hand comes in, and the red tick lands at the press
      const na = Math.PI * (0.95 + 0.75 * L.clamp(t / T_PRESS));
      ctx.strokeStyle = t >= T_PRESS ? P.hcRed : L.rgba(P.stoneLight, 0.9);
      ctx.lineWidth = t >= T_PRESS ? 4 : 2;
      ctx.beginPath();
      ctx.moveTo(ac[0] + Math.cos(na) * (R - 34), ac[1] + Math.sin(na) * (R - 34));
      ctx.lineTo(ac[0] + Math.cos(na) * (R + 14), ac[1] + Math.sin(na) * (R + 14));
      ctx.stroke();
      if (t >= T_PRESS) {
        const u = (t - T_PRESS) / 0.35;
        if (u < 1) {
          ctx.strokeStyle = L.rgba(P.hcRed, 1 - u);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(G.cx, G.cy - 80, 380 + 260 * L.ease.outExpo(u), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    },
  });
})();
