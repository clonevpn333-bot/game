// 10 · outro · T 35.75–40 · the dancer alone in darkness (inverted print) → THE DANCING PLAGUE · 1518 → the curiosity
// line writes WHY WE / WONDER → STAY CURIOUS. (Pip pops up to wave from the 3D layer.)
(function () {
  'use strict';
  const TAU = Math.PI * 2;
  const arc = (cx, cy, rx, ry, a0, a1, n = 28) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]; });
  const G = {
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
    const lay = (word, cap, base, gap) => { let tot = 0; for (const ch of word) tot += G[ch].w * cap; tot += gap * (word.length - 1); let x = 540 - tot / 2; const out = []; for (const ch of word) { G[ch].s.forEach((st) => out.push(FILM.hc.resample(st.map(([u, v]) => [x + u * cap, base - cap + v * cap]), 3))); x += G[ch].w * cap + gap; } return out; };
    const strokes = lay('WHY WE', 130, 1120, 26).concat(lay('WONDER', 120, 1300, 24));
    const len = (p) => p.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
    const tot = strokes.reduce((a, s) => a + len(s), 0), T0 = 37.7, T1 = 39.0, hop = 0.012, avail = T1 - T0 - hop * (strokes.length - 1);
    let tt = T0;
    PLAN = strokes.map((s) => { const d = (avail * len(s)) / tot; const o = { pts: s, t0: tt, t1: tt + d }; tt += d + hop; return o; });
    return PLAN;
  }
  FILM.scene({ id: 'outro', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, W = FILM.wc, HC = FILM.hc;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const tw = info.shot.start + L.onTwos(t);
    ctx.fillStyle = '#04060B'; ctx.fillRect(0, 0, 1080, 1920);
    const v = ctx.createRadialGradient(540, 760, 20, 540, 760, 900); v.addColorStop(0, 'rgba(26,34,60,0.9)'); v.addColorStop(1, 'rgba(4,6,11,0)'); ctx.fillStyle = v; ctx.fillRect(0, 0, 1080, 1920);
    const out = L.clamp((T - 37.4) / 0.35);
    // the dancer as an inverted print: ivory ink on black
    if (out < 1) {
      ctx.save(); ctx.globalAlpha = 1 - out;
      ctx.filter = 'invert(1)';
      W.dancer(ctx, 540, 900, 0.45 - 0.2 * out, (tw - 35) * 8);
      ctx.restore();
      const a = L.clamp((T - 36.0) / 0.3) * (1 - out);
      L.text(ctx, 'THE DANCING PLAGUE', 540, 1060, { size: 70, family: '"Fraunces", Georgia, serif', weight: 600, align: 'center', color: P.hcIvory, alpha: a, tracking: '0.04em' });
      L.text(ctx, 'STRASBOURG · 1518', 540, 1140, { size: 36, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: P.hcYellow, alpha: L.clamp((T - 36.4) / 0.3) * (1 - out), tracking: '0.3em' });
    }
    const pl = plan();
    const fade = 1 - L.clamp((T - 39.65) / 0.35);
    ctx.save(); ctx.globalAlpha = fade;
    if (T > 37.5 && T < pl[0].t0 + 0.05) { const u = L.clamp((T - 37.5) / (pl[0].t0 - 37.5)); HC.line(ctx, L.smoothPts([[540, 900], [340, 1000], pl[0].pts[0]], false, 4), { plate: 'blueprint', to: Math.max(0.02, u), width: 6, seed: 5 }); }
    pl.forEach((s, i) => { if (T < s.t0) return; const u = L.clamp((T - s.t0) / (s.t1 - s.t0)); HC.line(ctx, s.pts, { plate: 'blueprint', to: Math.max(0.02, u), width: 7, seed: 10 + i, head: u < 1, wobble: 0.7 }); });
    const sa = L.clamp((T - 39.1) / 0.3);
    if (sa > 0) L.text(ctx, 'STAY CURIOUS.', 540, 1420, { size: 34, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: P.hcIvory, alpha: sa, tracking: '0.4em' });
    ctx.restore();
  } });
})();
