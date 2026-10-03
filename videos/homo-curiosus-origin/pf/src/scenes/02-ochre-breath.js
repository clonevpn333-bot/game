// 02 · ochre-breath · T 2.75–5.75 · paper
// Layers: (1) wall (2) ochre halo accumulating as droplets land (3) the retouch narrowing 5.0–5.6
// (4) the hand flat on G1 until it lifts at 5.0 (3 drawings) (5) bird-bone blow tube from lower-left (in at 3.25)
// (6) droplets in flight 3.5–4.9, each flying onto its own halo dot (7) ochre haze (8) torch + motes
// (9) overlays: dashed spray cone guides, hand-height bracket (10) the curiosity line ignites at G2, 5.25.
(function () {
  'use strict';
  const ID = 'ochre-breath';
  const T_TUBE = 3.25, T_SPRAY = 3.5, T_END = 4.9, T_LIFT = 5.0, T_IGNITE = 5.25;
  const NOZ = [176, 1452];
  const FLIGHT = 0.24;
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, X = FILM.hx, HC = FILM.hc;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const Tw = info.shot.start + L.onTwos(t);
      const G = HC.HAND;
      const sprayP = L.clamp((T - T_SPRAY) / (T_END - T_SPRAY));
      const shake = T > T_SPRAY && T < T_END ? 2.6 : 0;
      ctx.save();
      ctx.translate(L.noise1(T * 9, 3) * shake, L.noise1(T * 9, 4) * shake);

      X.wall(ctx);
      const narrow = 0.55 * L.ease.inOutCubic(L.clamp((Tw - T_LIFT) / 0.6));
      X.halo(ctx, { p: sprayP, narrow });
      // retouch strokes: the painter drags ochre down the finger edges
      [[5.17, 1], [5.33, 2], [5.5, 0]].forEach(([at, fi], j) => {
        if (Tw < at) return;
        const f = X.fingers(G)[fi];
        const side = j % 2 ? 1 : -1;
        const a = L.clamp((Tw - at) / 0.17);
        const p0 = [f.base[0] + f.d[0] * f.len * 0.95 + side * f.n[0] * f.hw * 0.9, f.base[1] + f.d[1] * f.len * 0.95 + side * f.n[1] * f.hw * 0.9];
        const p1 = [f.base[0] + f.d[0] * f.len * 0.25 + side * f.n[0] * f.hw * 1.0, f.base[1] + f.d[1] * f.len * 0.25 + side * f.n[1] * f.hw * 1.0];
        L.inkPath(ctx, [p0, [L.lerp(p0[0], p1[0], 0.5), L.lerp(p0[1], p1[1], 0.5)], p1], { width: 13, color: P.ochre, alpha: 0.55, draw: a, seed: 60 + j, taper: [4, 30] });
      });

      // the hand: flat until the lift, then 3 drawings up and out to the top right
      const di = T < T_LIFT ? -1 : Math.floor((T - T_LIFT) * 12 + 1e-6);
      if (di < 3) {
        const step = [0, 0.18, 0.5][Math.max(0, di)];
        const k = di < 0 ? 0 : step;
        ctx.save();
        ctx.translate(G.cx + 420 * k, G.cy - 900 * k);
        ctx.rotate(0.35 * k);
        ctx.scale(1 + 0.25 * k, (1 + 0.25 * k) * (1 - 0.3 * k));
        ctx.translate(-G.cx, -G.cy);
        // ochre settles on the back of the hand too
        X.skinHand(ctx, { seed: 31 });
        if (sprayP > 0) {
          const h = HC.hand();
          L.stipple(ctx, h.outline, { spacing: 10, r: [0.6, 1.6], color: P.ochre, alpha: 0.55, seed: 33, density: (x, y) => L.clamp(sprayP * 1.4 - 0.2) * L.clamp(1 - Math.hypot(x - 300, y - 1300) / 1100) });
        }
        ctx.restore();
      }

      // blow tube (a hollow bird bone): slides in on twos, held during the spray, withdraws after
      const tin = L.ease.outCubic(L.clamp((Tw - T_TUBE) / 0.25));
      const tout = L.ease.inCubic(L.clamp((Tw - 4.95) / 0.3));
      const tk = tin * (1 - tout);
      if (tk > 0.001) {
        const ang = Math.atan2(G.cy - NOZ[1], G.cx - NOZ[0]);
        const tip = [NOZ[0] - Math.cos(ang) * 420 * (1 - tk), NOZ[1] - Math.sin(ang) * 420 * (1 - tk)];
        const back = [tip[0] - Math.cos(ang) * 460, tip[1] - Math.sin(ang) * 460];
        const nx = -Math.sin(ang) * 17, ny = Math.cos(ang) * 17;
        const body = [[tip[0] + nx, tip[1] + ny], [back[0] + nx * 1.25, back[1] + ny * 1.25], [back[0] - nx * 1.25, back[1] - ny * 1.25], [tip[0] - nx, tip[1] - ny]];
        L.tracePath(ctx, body, true);
        ctx.fillStyle = '#E8D9BC';
        ctx.fill();
        L.hatch(ctx, body, { angle: ang + Math.PI / 2, spacing: 6, width: 1.2, color: P.stoneDeep, alpha: 0.8, seed: 41, density: (x, y) => L.clamp(((x - tip[0]) * nx + (y - tip[1]) * ny) / (17 * 17) * 0.8 + 0.3) });
        for (let i = 1; i < 4; i++) {
          const q = [L.lerp(tip[0], back[0], i * 0.22), L.lerp(tip[1], back[1], i * 0.22)];
          L.inkPath(ctx, [[q[0] + nx * 1.1, q[1] + ny * 1.1], [q[0] + Math.cos(ang) * 5, q[1] + Math.sin(ang) * 5], [q[0] - nx * 1.1, q[1] - ny * 1.1]], { width: 1.5, color: P.hcInkSoft, seed: 44 + i });
        }
        L.inkPath(ctx, body, { closed: true, width: 3.6, color: P.hcInk, seed: 42 });
        L.inkPath(ctx, L.ellipsePts(tip[0], tip[1], 7, 17, 20, ang), { closed: true, width: 2.2, color: P.hcInk, seed: 43, fill: P.ochreDeep });
      }

      // droplets in flight, each landing on its halo dot
      if (T > T_SPRAY - 0.05 && T < T_END + FLIGHT) {
        const dots = X.haloDots();
        const ang = Math.atan2(G.cy - NOZ[1], G.cx - NOZ[0]);
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = 0; i < dots.length; i += 2) {
          const d = dots[i];
          const tl = T_SPRAY + (T_END - T_SPRAY) * (d.t0 * 0.9 + 0.05);
          const u = (T - (tl - FLIGHT)) / FLIGHT;
          if (u <= 0 || u >= 1) continue;
          const e = 1 - Math.pow(1 - u, 2.2); // drag
          const lift = Math.sin(u * Math.PI) * 40 * (L.hash(ID, i) % 100) / 100;
          const x = L.lerp(NOZ[0], d.x, e) - Math.sin(ang) * lift;
          const y = L.lerp(NOZ[1], d.y, e) + Math.cos(ang) * lift * 0.3;
          const e2 = 1 - Math.pow(1 - Math.max(0, u - 0.06), 2.2);
          const x2 = L.lerp(NOZ[0], d.x, e2), y2 = L.lerp(NOZ[1], d.y, e2);
          ctx.strokeStyle = L.rgba(d.col, 0.75);
          ctx.lineWidth = d.r * 1.3 * (0.6 + u * 0.5);
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        ctx.restore();
        // breath mist cone + haze on the wall
        const mist = Math.sin(L.clamp((T - T_SPRAY) / (T_END - T_SPRAY + 0.2)) * Math.PI);
        ctx.save();
        ctx.globalAlpha = 0.5 * mist;
        let g = ctx.createRadialGradient(NOZ[0] + 120, NOZ[1] - 160, 10, NOZ[0] + 220, NOZ[1] - 320, 520);
        g.addColorStop(0, L.rgba(P.ochreDust, 0.55));
        g.addColorStop(1, L.rgba(P.ochreDust, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 1080, 1920);
        g = ctx.createRadialGradient(G.cx, G.cy, 200, G.cx, G.cy, 640);
        g.addColorStop(0, L.rgba(P.ochre, 0.28));
        g.addColorStop(1, L.rgba(P.ochre, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 1080, 1920);
        ctx.restore();
      }

      X.torch(ctx, T, { amount: 0.95 });
      X.motes(ctx, T, { n: 260, seed: 78 });

      // overlays: spray cone guides during the breath, a measuring bracket on the revealed stencil
      if (tk > 0.5 && T < T_END) {
        const h = HC.hand();
        const a = L.ease.outExpo(L.clamp((T - T_SPRAY) / 0.25));
        ctx.save();
        ctx.setLineDash([14, 10]);
        ctx.strokeStyle = L.rgba(P.annBlue, 0.75 * a);
        ctx.lineWidth = 2.5;
        [[h.bounds.x + 10, h.bounds.y + h.bounds.h * 0.25], [h.bounds.x + h.bounds.w, h.bounds.y + h.bounds.h]].forEach(([x, y]) => {
          ctx.beginPath();
          ctx.moveTo(NOZ[0], NOZ[1]);
          ctx.lineTo(L.lerp(NOZ[0], x, a), L.lerp(NOZ[1], y, a));
          ctx.stroke();
        });
        ctx.restore();
      }
      if (T > 5.2) {
        const h = HC.hand();
        L.bracket(ctx, h.bounds.x - 40, h.bounds.y, h.bounds.x - 40, h.bounds.y + h.bounds.h, { color: P.annYellow, alpha: 0.9, width: 2, p: L.ease.outExpo(L.clamp((T - 5.2) / 0.25)) });
      }
      ctx.restore();

      // the curiosity line is born at the index fingertip
      if (T >= T_IGNITE) {
        const tip = HC.hand({ narrow }).tips.index;
        const pts = [tip, [tip[0] + 26, tip[1] - 50], [tip[0] + 14, tip[1] - 100], [tip[0] - 10, tip[1] - 140]];
        const u = L.ease.outCubic(L.clamp((T - T_IGNITE) / 0.5));
        HC.line(ctx, L.smoothPts(pts, false, 4), { plate: 'paper', to: Math.max(0.02, u * 0.98), width: 7, seed: 5 });
        const fl = L.clamp(1 - (T - T_IGNITE) / 0.2);
        if (fl > 0) L.glowDot(ctx, tip[0], tip[1], 10, { color: P.hcYellow, rays: 12, rayLen: 5, intensity: fl, additive: false });
      }
    },
  });
})();
