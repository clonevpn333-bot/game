// 13 · outro · T 32.5–37.0 · the skull in its tiara alone in darkness → A POPE PUT A CORPSE / ON TRIAL. → the curiosity
// line writes WHY WE / WONDER → STAY CURIOUS.
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
    const tot = strokes.reduce((a, s) => a + len(s), 0), T0 = 34.7, T1 = 36.0, hop = 0.012, avail = T1 - T0 - hop * (strokes.length - 1);
    let tt = T0;
    PLAN = strokes.map((s) => { const d = (avail * len(s)) / tot; const o = { pts: s, t0: tt, t1: tt + d }; tt += d + hop; return o; });
    return PLAN;
  }
  FILM.scene({ id: 'outro', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, HC = FILM.hc;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    ctx.fillStyle = '#04060B'; ctx.fillRect(0, 0, 1080, 1920);
    const v = ctx.createRadialGradient(540, 760, 20, 540, 760, 900); v.addColorStop(0, 'rgba(26,34,60,0.9)'); v.addColorStop(1, 'rgba(4,6,11,0)'); ctx.fillStyle = v; ctx.fillRect(0, 0, 1080, 1920);
    const out = L.clamp((T - 34.4) / 0.35);
    if (out < 1) {
      const D = FILM.df;
      ctx.save(); ctx.globalAlpha = 1 - out;
      const g = L.ease.outCubic(L.clamp(t / 0.5));
      D.glow(ctx, 540, 900, 600, D.C.candle, 0.35);
      const ss = L.lerp(1.0, 1.15, g) * (1 - 0.4 * out);
      D.skull3d(ctx, 540, 760, 340 * ss, { yaw: -0.6 + 0.45 * (T - 32.5), pitch: 0.1, jaw: 0.2, ember: 0.9 });
      ctx.restore();
      const a = L.clamp((T - 32.7) / 0.3) * (1 - out);
      L.text(ctx, 'A POPE PUT A CORPSE', 540, 1080, { size: 60, family: '"Cinzel", serif', weight: 900, align: 'center', color: P.hcIvory, alpha: a, tracking: '0.04em' });
      L.text(ctx, 'ON TRIAL.', 540, 1170, { size: 72, family: '"Cinzel", serif', weight: 900, align: 'center', color: '#FF3B30', alpha: L.clamp((T - 33.1) / 0.3) * (1 - out), tracking: '0.08em' });
    }
    const pl = plan();
    const fade = 1 - L.clamp((T - 36.65) / 0.35);
    ctx.save(); ctx.globalAlpha = fade;
    if (T > 34.5 && T < pl[0].t0 + 0.05) { const u = L.clamp((T - 34.5) / (pl[0].t0 - 34.5)); HC.line(ctx, L.smoothPts([[540, 800], [340, 950], pl[0].pts[0]], false, 4), { plate: 'blueprint', to: Math.max(0.02, u), width: 6, seed: 5 }); }
    pl.forEach((s, i) => { if (T < s.t0) return; const u = L.clamp((T - s.t0) / (s.t1 - s.t0)); HC.line(ctx, s.pts, { plate: 'blueprint', to: Math.max(0.02, u), width: 7, seed: 10 + i, head: u < 1, wobble: 0.7 }); });
    const sa = L.clamp((T - 36.1) / 0.3);
    if (sa > 0) L.text(ctx, 'STAY CURIOUS.', 540, 1420, { size: 34, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: P.hcIvory, alpha: sa, tracking: '0.4em' });
    ctx.restore();
  } });
})();
