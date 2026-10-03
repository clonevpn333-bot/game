// 09 · homo-curiosus · T 21.75–24.25 · navy
// Layers: (1) blueprint plate (2) construction geometry: cap/base lines, compass arcs, golden rectangle, ticks
// (3) five orbiting engraved vignettes on a faint curiosity-line ellipse (hand, star, gear, flyer, Moon)
// (4) THE WORDMARK written by the curiosity line: HOMO done 22.5, CURIOSUS done 23.125, pen-up travel dotted
// (5) letter glints (6) 23.95–24.25: everything collapses into a yellow G1 hand (G8 → shot 10).
(function () {
  'use strict';
  const ID = 'homo-curiosus';
  const T0 = 21.75, HOMO = 23.05, CUR = 23.62, COLLAPSE = 23.95; // line 1 lands on "We", line 2 on "Wonder"
  const TAU = Math.PI * 2;
  const arc = (cx, cy, rx, ry, a0, a1, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
  // monoline capitals, unit cap height (y down, 0 = cap line, 1 = baseline)
  const GLYPH = {
    H: { w: 0.72, s: [[[0, 0], [0, 1]], [[0.72, 0], [0.72, 1]], [[0, 0.52], [0.72, 0.52]]] },
    O: { w: 0.86, s: [arc(0.43, 0.5, 0.43, 0.5, -Math.PI / 2, -Math.PI / 2 - TAU, 48)] },
    M: { w: 0.9, s: [[[0, 1], [0.08, 0], [0.45, 0.82], [0.82, 0], [0.9, 1]]] },
    C: { w: 0.84, s: [arc(0.45, 0.5, 0.45, 0.5, -0.27 * Math.PI, -1.73 * Math.PI, 40)] },
    U: { w: 0.74, s: [[[0, 0], [0, 0.6]].concat(arc(0.37, 0.6, 0.37, 0.4, Math.PI, 0, 24)).concat([[0.74, 0]])] },
    R: { w: 0.72, s: [[[0, 1], [0, 0], [0.4, 0]].concat(arc(0.4, 0.26, 0.28, 0.26, -Math.PI / 2, Math.PI / 2, 18)).concat([[0, 0.52]]), [[0.32, 0.52], [0.72, 1]]] },
    I: { w: 0.24, s: [[[0, 0], [0.24, 0]], [[0.12, 0], [0.12, 1]], [[0, 1], [0.24, 1]]] },
    W: { w: 1.0, s: [[[0, 0], [0.22, 1], [0.5, 0.22], [0.78, 1], [1.0, 0]]] },
    Y: { w: 0.74, s: [[[0, 0], [0.37, 0.5]], [[0.74, 0], [0.37, 0.5], [0.37, 1]]] },
    E: { w: 0.62, s: [[[0.62, 0], [0, 0], [0, 1], [0.62, 1]], [[0, 0.5], [0.5, 0.5]]] },
    N: { w: 0.74, s: [[[0, 1], [0, 0], [0.74, 1], [0.74, 0]]] },
    D: { w: 0.78, s: [[[0, 1], [0, 0], [0.3, 0]].concat(arc(0.3, 0.5, 0.48, 0.5, -Math.PI / 2, Math.PI / 2, 26)).concat([[0, 1]])] },
    ' ': { w: 0.3, s: [] },
    S: { w: 0.72, s: [arc(0.37, 0.25, 0.33, 0.25, -0.15 * Math.PI, -1.5 * Math.PI, 22).concat(arc(0.37, 0.75, 0.35, 0.25, -0.5 * Math.PI, 0.82 * Math.PI, 26))] },
  };
  function layout(word, cap, baseY, gap) {
    let total = 0;
    for (const ch of word) total += GLYPH[ch].w * cap;
    total += gap * (word.length - 1);
    let x = 540 - total / 2;
    const letters = [];
    for (const ch of word) {
      const g = GLYPH[ch];
      letters.push({ ch, strokes: g.s.map((st) => st.map(([u, v]) => [x + u * cap, baseY - cap + v * cap])), x0: x, x1: x + g.w * cap });
      x += g.w * cap + gap;
    }
    return letters;
  }
  let PLAN = null;
  function plan() {
    if (PLAN) return PLAN;
    const homo = layout('WHY WE', 160, 860, 30);
    const cur = layout('WONDER', 150, 1080, 28);
    const strokes = [];
    const len = (p) => p.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
    homo.forEach((l, li) => l.strokes.forEach((s, si) => strokes.push({ pts: FILM.hc.resample(s, 3), word: 0, letter: li, last: si === l.strokes.length - 1 })));
    cur.forEach((l, li) => l.strokes.forEach((s, si) => strokes.push({ pts: FILM.hc.resample(s, 3), word: 1, letter: li, last: si === l.strokes.length - 1 })));
    // timing: each word's strokes share its window in proportion to length (pen-up hops take a fixed sliver)
    [[0, 21.92, HOMO], [1, HOMO + 0.02, CUR]].forEach(([w, a, b]) => {
      const ws = strokes.filter((s) => s.word === w);
      const tot = ws.reduce((acc, s) => acc + len(s.pts), 0);
      const hop = 0.018;
      const avail = b - a - hop * (ws.length - 1);
      let tt = a;
      ws.forEach((s) => { s.t0 = tt; s.t1 = tt + (avail * len(s.pts)) / tot; tt = s.t1 + hop; });
    });
    PLAN = { homo, cur, strokes };
    return PLAN;
  }
  function vignette(ctx, L, P, X, i, x, y, a) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = L.rgba(P.lavender, 0.85 * a);
    ctx.fillStyle = L.rgba(P.lavender, 0.15 * a);
    ctx.lineWidth = 1.8;
    const circ = () => { ctx.beginPath(); ctx.arc(0, 0, 58, 0, TAU); ctx.stroke(); };
    circ();
    if (i === 0) {
      const h = FILM.hc.hand({ cx: 0, cy: 6, s: 0.1, narrow: 0.55 });
      L.tracePath(ctx, h.outline, true);
      ctx.fill();
      ctx.stroke();
    } else if (i === 1) {
      X.star8(ctx, 0, 0, 34, { fill: 'rgba(0,0,0,0)', stroke: L.rgba(P.lavender, 0.9 * a), width: 1.8 });
    } else if (i === 2) {
      const gg = X.gear(24, 3.4).pts;
      L.tracePath(ctx, gg, true);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 9, 0, TAU); ctx.stroke();
    } else if (i === 3) {
      ctx.beginPath();
      ctx.moveTo(-40, -10); ctx.lineTo(40, -10); ctx.moveTo(-40, 8); ctx.lineTo(40, 8);
      for (let k = -3; k <= 3; k++) { ctx.moveTo(k * 12, -10); ctx.lineTo(k * 12, 8); }
      ctx.moveTo(-40, -1); ctx.lineTo(-54, -1); ctx.moveTo(40, -1); ctx.lineTo(50, -1);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 32, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.arc(-14, 0, 26, Math.PI * 0.45, -Math.PI * 0.45, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, X = FILM.hx, HC = FILM.hc;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const pl = plan();
      L.blueprint(ctx, { color: P.hcNavy, seed: 99, center: [540, 900], circles: 5 });
      const fadeAll = 1 - L.ease.inQuad(L.clamp((T - COLLAPSE) / 0.22));

      // construction geometry
      const cg = L.ease.outExpo(L.clamp((T - T0) / 0.45)) * fadeAll;
      if (cg > 0) {
        ctx.save();
        ctx.strokeStyle = L.rgba(P.lavender, 0.3 * cg);
        ctx.lineWidth = 1.2;
        [[700, 0.3], [860, 0.45], [780, 0.15], [930, 0.3], [1080, 0.45], [1005, 0.15]].forEach(([y, al]) => {
          ctx.strokeStyle = L.rgba(P.lavender, al * cg);
          ctx.beginPath();
          ctx.moveTo(L.lerp(540, 60, cg), y);
          ctx.lineTo(L.lerp(540, 1020, cg), y);
          ctx.stroke();
        });
        ctx.setLineDash([5, 7]);
        ctx.strokeStyle = L.rgba(P.lavender, 0.25 * cg);
        ctx.strokeRect(118, 590, 844, 540);
        ctx.beginPath();
        ctx.arc(118 + 540, 1130, 540, Math.PI, Math.PI * 1.5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        pl.homo.concat(pl.cur).forEach((l) => {
          if (l.ch === 'O' || l.ch === 'D') {
            const big = pl.homo.includes(l);
            L.guideCircle(ctx, (l.x0 + l.x1) / 2, big ? 780 : 1005, (big ? 80 : 75) + 14, { alpha: 0.2 * cg, width: 1, cross: 8, p: cg });
          }
        });
        L.ticks(ctx, 118, 1150, { kind: 'linear', length: 844, angle: 0, n: 60, major: 5, p: cg, color: P.lineWhite, alpha: 0.4 });
      }

      // orbiting vignettes on a faint curiosity-line ellipse
      const va = L.ease.outCubic(L.clamp((T - 22.1) / 0.5)) * fadeAll;
      if (va > 0) {
        const orbit = [];
        for (let k = 0; k <= 120; k++) { const a = (k / 120) * TAU; orbit.push([540 + Math.cos(a) * 470, 880 + Math.sin(a) * 620]); }
        HC.line(ctx, orbit, { plate: 'blueprint', width: 2, alpha: 0.22 * va, head: false, seed: 9 });
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU + (T - 21.75) * 0.45 - Math.PI / 2;
          vignette(ctx, L, P, X, i, 540 + Math.cos(a) * 470, 880 + Math.sin(a) * 620, va);
        }
      }

      // the wordmark
      const ss = pl.strokes;
      ctx.save();
      ctx.globalAlpha = fadeAll;
      // entry: the line arrives from the left edge at y 760 (G7) and runs into the first stroke
      if (T < ss[0].t0 + 0.02) {
        const u = L.ease.outCubic(L.clamp((T - T0) / (ss[0].t0 - T0)));
        const s0 = ss[0].pts[0];
        HC.line(ctx, L.smoothPts([[-20, 760], [80, 760], [s0[0] - 40, s0[1] + 60], s0], false, 4), { plate: 'blueprint', to: Math.max(0.02, u), width: 7, seed: 5 });
      }
      for (let i = 0; i < ss.length; i++) {
        const s = ss[i];
        if (T < s.t0) {
          // pen-up travel from the previous stroke end, dotted
          if (i > 0 && T >= ss[i - 1].t1) {
            const a = ss[i - 1].pts[ss[i - 1].pts.length - 1], b = s.pts[0];
            ctx.save();
            ctx.setLineDash([3, 7]);
            ctx.strokeStyle = L.rgba(P.hcYellow, 0.6);
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
            ctx.restore();
          }
          break;
        }
        const u = L.clamp((T - s.t0) / (s.t1 - s.t0));
        HC.line(ctx, s.pts, { plate: 'blueprint', to: Math.max(0.02, u), width: s.word ? 6 : 8, seed: 11 + i, head: u < 1, wobble: 0.7 });
        if (u >= 1 && s.last && T - s.t1 < 0.25) {
          const e = s.pts[s.pts.length - 1];
          L.glowDot(ctx, e[0], e[1], 6, { color: P.hcYellow, rays: 8, rayLen: 4, intensity: 1 - (T - s.t1) / 0.25, seed: 30 + i });
        }
      }
      // underline sweep after the name lands
      if (T > CUR + 0.05) {
        const u = L.ease.inOutCubic(L.clamp((T - CUR - 0.05) / 0.45));
        HC.line(ctx, [[130, 1118], [540, 1126], [950, 1118]].map((p) => p), { plate: 'blueprint', to: Math.max(0.02, u), width: 3, seed: 40, head: u < 1 });
      }
      ctx.restore();

      // collapse into the G1 hand (G8)
      if (T > COLLAPSE - 0.05) {
        const h = HC.hand({ narrow: 0.55 });
        const u = L.ease.inOutCubic(L.clamp((T - COLLAPSE + 0.05) / 0.27));
        HC.line(ctx, h.outline.concat([h.outline[0]]), { plate: 'blueprint', to: Math.max(0.02, u), width: 5, seed: 50, head: u < 1 });
      }
    },
  });
})();
