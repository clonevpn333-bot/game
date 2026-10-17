// 09 · outro · T 30.75–36 · Roy in the storm, bolts snapping around him on the beats (WOULD YOU STAND NEXT TO HIM IN A
// STORM?). 33.0 the classic WHY WE WONDER transition: a last bolt hits his hat, he shrinks into that point of light, and the
// point becomes the curiosity line's head and WRITES "WHY WE / WONDER" in monoline capitals; SUBSCRIBE FOR MORE slams on a
// red pill under it (kinetic).
(function () {
  'use strict';
  const TAU = Math.PI * 2;
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
    const T0 = 33.35, T1 = 34.7, hop = 0.015, avail = T1 - T0 - hop * (strokes.length - 1);
    let tt = T0;
    PLAN = strokes.map((s) => { const d = (avail * len(s)) / tot; const o = { pts: s, t0: tt, t1: tt + d }; tt += d + hop; return o; });
    return PLAN;
  }
  FILM.scene({ id: 'outro', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb, HC = FILM.hc;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const hits = [31.0, 32.0, 32.95];
    let fk = 0, hi = -1; hits.forEach((h, j) => { const d = T - h; if (d >= 0 && d < 0.5) { fk = Math.max(fk, Math.exp(-d * 8)); hi = j; } });
    const shrink = L.ease.inCubic(L.clamp((T - 33.0) / 0.35));
    PB.plate(ctx, { seed: 990, color: '#070A16' });
    const dim = L.clamp((T - 33.0) / 0.4);
    PB.flash(ctx, fk * 0.45 * (1 - dim), 540, 0);
    ctx.save(); ctx.globalAlpha = 1 - dim * 0.85;
    PB.storm(ctx, 540, 380, 1400, T, { glow: fk, seed: 9 });
    PB.ridges(ctx, (T - 30.75) * 60, T, { y: 1250 });
    ctx.restore();
    let top = [540, 800];
    const H = 640 * (1 - shrink);
    if (H > 10) {
      const z = 1 + 0.04 * (T - 30.75);
      ctx.save(); ctx.translate(540, 1150); ctx.scale(z, z); ctx.translate(-540, -1150);
      const r = PB.head(ctx, 540, 1150, H, { win: [-2.1, 2.1, -1.6, 1.6], yaw: -0.4 + 0.15 * (T - 30.75), hat: true, key: [-0.3, 0.5, 0.8], rim: [0.6, 0.6, -0.4], res: 0.36, slot: 5, warm: [1 + 0.2 * fk, 1 + 0.15 * fk, 1 + 0.3 * fk] });
      ctx.restore();
      const tp = r.proj(0.1, 1.28, -0.05); top = [540 + (tp[0] - 540) * z, 1150 + (tp[1] - 1150) * z];
    } else top = [540, 1150 - 380];
    if (hi >= 0 && hi < 2) { const d = T - hits[hi], gx = [140, 950][hi]; PB.bolt(ctx, [gx + 80, 450], [gx, 1500], { seed: 140 + hi, k: d < 0.07 ? 1 : Math.max(0, 0.6 - d * 2), w: 7, branches: 3 }); }
    if (hi === 2) { const d = T - hits[2]; PB.bolt(ctx, [700, -60], top, { seed: 150, k: d < 0.08 ? 1 : Math.max(0, 0.7 - d * 2), w: 10, branches: 5 }); }
    PB.rain(ctx, T, { n: 200, a: 0.35 * (1 - dim * 0.7), seed: 11 });
    // the point of light he shrinks into → the line's head → it writes WHY WE / WONDER
    if (T > 33.0) PB.burst(ctx, top[0], top[1], 120, 0.9 * (1 - L.clamp((T - 33.6) / 0.4)), '220,230,255');
    const pl = plan();
    const fade = 1 - L.clamp((T - 35.6) / 0.4);
    ctx.save(); ctx.globalAlpha = fade;
    if (T > 33.2 && T < pl[0].t0 + 0.05) { const u = L.clamp((T - 33.2) / (pl[0].t0 - 33.2)); HC.line(ctx, L.smoothPts([top, [top[0] - 160, top[1] + 140], pl[0].pts[0]], false, 4), { plate: 'blueprint', to: Math.max(0.02, u), width: 6, seed: 5 }); }
    pl.forEach((s, i) => { if (T < s.t0) return; const u = L.clamp((T - s.t0) / (s.t1 - s.t0)); HC.line(ctx, s.pts, { plate: 'blueprint', to: Math.max(0.02, u), width: 7, seed: 10 + i, head: u < 1, wobble: 0.7 }); });
    // red pill under the wordmark for SUBSCRIBE FOR MORE (kinetic type sits on it)
    const pp = L.ease.outBack(L.clamp((T - 34.75) / 0.25));
    if (pp > 0) { ctx.save(); ctx.translate(540, 1426); ctx.scale(pp, pp); ctx.fillStyle = '#D0281E'; ctx.beginPath(); ctx.roundRect(-380, -64, 760, 128, 64); ctx.fill(); ctx.restore(); }
    ctx.restore();
  } });
})();
