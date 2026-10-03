// 10 · stay-curious · T 24.25–28.00 · paper
// Layers: (1) the 01 wall (2) the finished ochre stencil on G1, fingers narrowed (3) the curiosity line circling the hand
// 24.25–24.75 (4) the "?" emblem inside the palm 24.5–25.0 (5) "stay curious." lettered by the line 24.75–25.6
// (6) the line drifts off into the dark lower right 25.6–26.6 (7) torch + motes, a slow push-in to the end.
(function () {
  'use strict';
  const ID = 'stay-curious';
  const T0 = 24.25, CIRCLE1 = 24.75, Q0 = 24.5, Q1 = 25.0, W0 = 24.75, W1 = 25.6, EXIT0 = 25.6, EXIT1 = 26.6;
  const TAU = Math.PI * 2;
  const arc = (cx, cy, rx, ry, a0, a1, n = 20) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
  // lowercase monoline letters, unit x-height (0 = x-line, 1 = baseline, y down)
  const G = {
    s: { w: 0.56, s: [arc(0.28, 0.26, 0.26, 0.25, -0.1 * Math.PI, -1.5 * Math.PI, 14).concat(arc(0.28, 0.75, 0.28, 0.25, -0.5 * Math.PI, 0.85 * Math.PI, 16))] },
    t: { w: 0.42, s: [[[0.16, -0.55], [0.16, 0.8]].concat(arc(0.34, 0.8, 0.18, 0.2, Math.PI, Math.PI * 0.4, 8)), [[0, 0.04], [0.4, 0.04]]] },
    a: { w: 0.72, s: [arc(0.33, 0.5, 0.33, 0.5, -0.1 * Math.PI, -0.1 * Math.PI - TAU, 30), [[0.68, 0], [0.68, 1]]] },
    y: { w: 0.66, s: [[[0, 0], [0.34, 0.92]], [[0.66, 0], [0.34, 0.92], [0.18, 1.42], [0.02, 1.5]]] },
    c: { w: 0.62, s: [arc(0.33, 0.5, 0.33, 0.5, -0.25 * Math.PI, -1.75 * Math.PI, 24)] },
    u: { w: 0.66, s: [[[0, 0], [0, 0.6]].concat(arc(0.31, 0.6, 0.31, 0.4, Math.PI, 0, 14)), [[0.62, 0], [0.62, 1]]] },
    r: { w: 0.5, s: [[[0, 1], [0, 0]], arc(0.36, 0.42, 0.36, 0.38, Math.PI, Math.PI * 1.55, 10)] },
    i: { w: 0.14, s: [[[0.07, 0], [0.07, 1]], [[0.06, -0.4], [0.08, -0.36]]] },
    o: { w: 0.72, s: [arc(0.36, 0.5, 0.36, 0.5, -Math.PI / 2, -Math.PI / 2 - TAU, 30)] },
    '.': { w: 0.12, s: [[[0.05, 0.95], [0.07, 0.99]]] },
    ' ': { w: 0.32, s: [] },
  };
  let PLAN = null;
  function plan() {
    if (PLAN) return PLAN;
    const word = 'stay curious.';
    const xh = 64, gap = 14, base = 1410;
    let total = 0;
    for (const ch of word) total += G[ch].w * xh + gap;
    let x = 540 - total / 2;
    const strokes = [];
    for (const ch of word) {
      G[ch].s.forEach((st) => strokes.push(FILM.hc.resample(st.map(([u, v]) => [x + u * xh, base - xh + v * xh]), 3)));
      x += G[ch].w * xh + gap;
    }
    const len = (p) => p.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
    const tot = strokes.reduce((a, s) => a + Math.max(len(s), 8), 0);
    const hop = 0.012, avail = W1 - W0 - hop * (strokes.length - 1);
    let tt = W0;
    const timed = strokes.map((s) => { const d = (avail * Math.max(len(s), 8)) / tot; const o = { pts: s, t0: tt, t1: tt + d }; tt += d + hop; return o; });
    PLAN = { timed };
    return PLAN;
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, X = FILM.hx, HC = FILM.hc;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const push = 1 + 0.045 * L.ease.inOutSine(L.clamp((T - 25.4) / 2.6));
      ctx.save();
      ctx.translate(540, 900);
      ctx.scale(push, push);
      ctx.translate(-540, -900);
      X.wall(ctx);
      X.halo(ctx, { p: 1, narrow: 0.55 });
      const h = HC.hand({ narrow: 0.55 });
      // the ring around the hand, starting at the index fingertip
      const b = h.bounds;
      const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      const tip = h.tips.index;
      const a0 = Math.atan2((tip[1] - cy) / 470, (tip[0] - cx) / 330);
      const ring = [];
      for (let k = 0; k <= 120; k++) { const a = a0 + (k / 120) * TAU; ring.push([cx + Math.cos(a) * 330, cy + Math.sin(a) * 470]); }
      const ru = L.ease.inOutCubic(L.clamp((T - T0) / (CIRCLE1 - T0)));
      HC.line(ctx, ring, { plate: 'paper', to: Math.max(0.02, ru), width: 5, seed: 5, head: ru < 1, alpha: 0.95 });
      // the emblem: a "?" in the palm
      const q = HC.question(560, 960, 300);
      const qu = L.ease.inOutCubic(L.clamp((T - Q0) / (Q1 - Q0)));
      if (qu > 0) {
        HC.line(ctx, q.hook, { plate: 'paper', to: Math.max(0.02, qu), width: 8, seed: 6, head: qu < 1 });
        if (T > Q1 - 0.05) {
          const pop = [0.7, 1.15, 1][Math.min(2, Math.floor((T - Q1 + 0.05) * 12 + 1e-6))];
          L.inkCircle(ctx, q.dot[0], q.dot[1], q.dotR * 1.2 * pop, { width: 2, color: P.hcOrangeDeep, fill: P.hcOrange, seed: 7 });
        }
      }
      // "stay curious." lettered by the line
      const pl = plan();
      pl.timed.forEach((s, i) => {
        if (T < s.t0) return;
        const u = L.clamp((T - s.t0) / (s.t1 - s.t0));
        HC.line(ctx, s.pts, { plate: 'paper', to: Math.max(0.05, u), width: 6, seed: 20 + i, head: u < 1, wobble: 0.6 });
      });
      // the line leaves for the dark
      if (T > EXIT0) {
        const last = pl.timed[pl.timed.length - 1].pts;
        const e = last[last.length - 1];
        const path = L.smoothPts([e, [e[0] + 90, e[1] + 40], [880, 1560], [1000, 1700], [1140, 1840]], false, 5);
        const u = L.ease.inOutCubic(L.clamp((T - EXIT0) / (EXIT1 - EXIT0 - 0.2)));
        const f = L.ease.inCubic(L.clamp((T - EXIT0 - 0.35) / (EXIT1 - EXIT0 - 0.35)));
        HC.line(ctx, path, { plate: 'paper', from: f, to: Math.max(f + 0.01, u), width: 6, seed: 60 });
      }
      X.torch(ctx, T, { amount: 1 });
      ctx.restore();
      X.motes(ctx, T, { n: 300, seed: 77 });
      // a last engraved tick-arc, echoing shot 01's (the loop closes)
      const ac = [250, 300], R = 150;
      L.arcAnnotation(ctx, ac[0], ac[1], R, Math.PI * 0.95, Math.PI * 1.7, { color: P.annYellow, width: 2, endTicks: 8, alpha: 0.85 * L.clamp((T - 26.5) / 0.6) });
    },
  });
})();
