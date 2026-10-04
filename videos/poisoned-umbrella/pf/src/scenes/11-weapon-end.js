// 11 · weapon-end · T 35.25–42.00 · darkness, the 3D pellet + 2D type
// The pellet alone in the dark, a hand-drawn dimension under it. THE MURDER WEAPON / WAS 1.7 MILLIMETRES WIDE.
// Then the pellet's glint becomes the curiosity line's head and writes WHY WE / WONDER (the channel's drawn
// monoline capitals), STAY CURIOUS. lands under it, and the film ends clean.
(function () {
  'use strict';
  const ID = 'weapon-end';
  const PC = [540, 760];
  const TAU = Math.PI * 2;
  const SERIF = '"Fraunces", Georgia, serif';
  const MONO = '"JetBrains Mono", ui-monospace, monospace';
  const arc = (cx, cy, rx, ry, a0, a1, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
  const GLYPH = {
    H: { w: 0.72, s: [[[0, 0], [0, 1]], [[0.72, 0], [0.72, 1]], [[0, 0.52], [0.72, 0.52]]] },
    O: { w: 0.86, s: [arc(0.43, 0.5, 0.43, 0.5, -Math.PI / 2, -Math.PI / 2 - TAU, 48)] },
    R: { w: 0.72, s: [[[0, 1], [0, 0], [0.4, 0]].concat(arc(0.4, 0.26, 0.28, 0.26, -Math.PI / 2, Math.PI / 2, 18)).concat([[0, 0.52]]), [[0.32, 0.52], [0.72, 1]]] },
    W: { w: 1.0, s: [[[0, 0], [0.22, 1], [0.5, 0.22], [0.78, 1], [1.0, 0]]] },
    Y: { w: 0.74, s: [[[0, 0], [0.37, 0.5]], [[0.74, 0], [0.37, 0.5], [0.37, 1]]] },
    E: { w: 0.62, s: [[[0.62, 0], [0, 0], [0, 1], [0.62, 1]], [[0, 0.5], [0.5, 0.5]]] },
    N: { w: 0.74, s: [[[0, 1], [0, 0], [0.74, 1], [0.74, 0]]] },
    D: { w: 0.78, s: [[[0, 1], [0, 0], [0.3, 0]].concat(arc(0.3, 0.5, 0.48, 0.5, -Math.PI / 2, Math.PI / 2, 26)).concat([[0, 1]])] },
    ' ': { w: 0.3, s: [] },
  };
  let PLAN = null;
  function plan() {
    if (PLAN) return PLAN;
    const lay = (word, cap, base, gap) => {
      let tot = 0;
      for (const ch of word) tot += GLYPH[ch].w * cap;
      tot += gap * (word.length - 1);
      let x = 540 - tot / 2;
      const out = [];
      for (const ch of word) { GLYPH[ch].s.forEach((st) => out.push(FILM.hc.resample(st.map(([u, v]) => [x + u * cap, base - cap + v * cap]), 3))); x += GLYPH[ch].w * cap + gap; }
      return out;
    };
    const strokes = lay('WHY WE', 130, 1120, 26).concat(lay('WONDER', 120, 1300, 24));
    const len = (p) => p.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
    const tot = strokes.reduce((a, s) => a + len(s), 0);
    const T0 = 39.2, T1 = 40.6, hop = 0.015, avail = T1 - T0 - hop * (strokes.length - 1);
    let tt = T0;
    PLAN = strokes.map((s) => { const d = (avail * len(s)) / tot; const o = { pts: s, t0: tt, t1: tt + d }; tt += d + hop; return o; });
    return PLAN;
  }
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, M = FILM.mk, HC = FILM.hc;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      ctx.fillStyle = '#04060B';
      ctx.fillRect(0, 0, 1080, 1920);
      const v = ctx.createRadialGradient(PC[0], PC[1], 20, PC[0], PC[1], 900);
      v.addColorStop(0, 'rgba(26,34,60,0.9)');
      v.addColorStop(1, 'rgba(4,6,11,0)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, 1080, 1920);
      // the pellet: slow push, then it shrinks to a spark that becomes the line's head
      const textOut = L.clamp((T - 38.9) / 0.35);
      const R = 40 + 18 * L.ease.inOutSine(L.clamp((T - 35.25) / 3.6)) - 52 * L.ease.inCubic(textOut);
      if (R > 2) {
        const g = ctx.createRadialGradient(PC[0], PC[1], R * 0.8, PC[0], PC[1], R * 5);
        g.addColorStop(0, L.rgba(P.hcYellow, 0.28));
        g.addColorStop(1, L.rgba(P.hcYellow, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 1080, 1920);
        M.sphere(ctx, M.pelletTex(), 'pellet', PC[0], PC[1], R, T * 0.7, { spec: 1, ambient: 0.3, tilt: 0.25 });
      }
      // dimension + words
      const ta = 1 - textOut;
      if (ta > 0) {
        const d = L.ease.outExpo(L.clamp((T - 36.6) / 0.4));
        if (d > 0) {
          L.bracket(ctx, PC[0] - 58, PC[1] + 100, PC[0] + 58, PC[1] + 100, { color: P.hcYellow, alpha: ta, width: 2.5, p: d });
          L.text(ctx, '1.7 mm', PC[0], PC[1] + 160, { size: 34, family: MONO, weight: 600, align: 'center', color: P.hcYellow, alpha: ta * d });
        }
        const a1 = L.clamp((T - 35.5) / 0.3) * ta, a2 = L.clamp((T - 36.35) / 0.3) * ta;
        L.text(ctx, 'THE MURDER WEAPON', 540, 1080, { size: 66, family: SERIF, weight: 600, align: 'center', color: P.hcIvory, alpha: a1, tracking: '0.04em' });
        L.text(ctx, 'WAS', 540, 1170, { size: 66, family: SERIF, weight: 600, align: 'center', color: P.hcIvory, alpha: a2 });
        L.text(ctx, '1.7 MILLIMETRES WIDE.', 540, 1260, { size: 66, family: SERIF, weight: 600, align: 'center', color: P.hcYellow, alpha: L.clamp((T - 36.9) / 0.3) * ta });
      }
      // WHY WE WONDER, written by the line
      const pl = plan();
      const fade = 1 - L.clamp((T - 41.6) / 0.4);
      ctx.save();
      ctx.globalAlpha = fade;
      if (T > 39.05 && T < pl[0].t0 + 0.05) {
        const u = L.clamp((T - 39.05) / (pl[0].t0 - 39.05));
        HC.line(ctx, L.smoothPts([PC, [PC[0] - 200, PC[1] + 120], pl[0].pts[0]], false, 4), { plate: 'blueprint', to: Math.max(0.02, u), width: 6, seed: 5 });
      }
      pl.forEach((s, i) => {
        if (T < s.t0) return;
        const u = L.clamp((T - s.t0) / (s.t1 - s.t0));
        HC.line(ctx, s.pts, { plate: 'blueprint', to: Math.max(0.02, u), width: 7, seed: 10 + i, head: u < 1, wobble: 0.7 });
      });
      const sa = L.clamp((T - 40.75) / 0.35);
      if (sa > 0) L.text(ctx, 'STAY CURIOUS.', 540, 1420, { size: 34, family: MONO, weight: 600, align: 'center', color: P.hcIvory, alpha: sa, tracking: '0.4em' });
      ctx.restore();
    },
  });
})();
