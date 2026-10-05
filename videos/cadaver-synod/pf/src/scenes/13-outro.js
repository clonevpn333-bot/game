// 13 · outro · T 32.5–39.25 · the engraved 3D skull alone in the dark, turning. A POPE PUT A CORPSE / ON TRIAL.
// Then its burning eye becomes the curiosity line's head and writes WHY WE / WONDER (the channel's drawn monoline
// capitals); STAY CURIOUS. lands under it, and the film ends clean. (Paced like episode 2's outro.)
(function () {
  'use strict';
  const ID = 'outro';
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
    const T0 = 36.45, T1 = 37.85, hop = 0.015, avail = T1 - T0 - hop * (strokes.length - 1);
    let tt = T0;
    PLAN = strokes.map((s) => { const d = (avail * len(s)) / tot; const o = { pts: s, t0: tt, t1: tt + d }; tt += d + hop; return o; });
    return PLAN;
  }
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, HC = FILM.hc, D = FILM.df;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t + FILM.SHIFT;
      ctx.fillStyle = '#04060B';
      ctx.fillRect(0, 0, 1080, 1920);
      const v = ctx.createRadialGradient(540, 700, 20, 540, 700, 900);
      v.addColorStop(0, 'rgba(26,34,60,0.9)');
      v.addColorStop(1, 'rgba(4,6,11,0)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, 1080, 1920);
      // the skull: slow push and turn, then it shrinks into its own ember — the line's head
      const textOut = L.clamp((T - 35.9) / 0.35);
      const H = (420 + 60 * L.ease.inOutSine(L.clamp((T - 32.5) / 3.4))) * (1 - L.ease.inCubic(textOut));
      let eye = [540, 700];
      if (H > 12) {
        D.glow(ctx, 540, 760, H * 1.4, D.C.candle, 0.25);
        const r = D.skull(ctx, 540, 720, H, { yaw: -0.55 + 0.32 * (T - 32.5), pitch: 0.1, jaw: 0.2, ember: 0.9, res: 0.4, slot: 9 });
        eye = r.proj(-0.29, -0.16, 0.5);
      }
      const ta = 1 - textOut;
      if (ta > 0) {
        const a1 = L.clamp((T - 32.75) / 0.3) * ta, a2 = L.clamp((T - 33.5) / 0.3) * ta;
        L.text(ctx, 'A POPE PUT', 540, 1110, { size: 70, family: SERIF, weight: 600, align: 'center', color: P.hcIvory, alpha: a1, tracking: '0.04em' });
        L.text(ctx, 'A CORPSE', 540, 1200, { size: 70, family: SERIF, weight: 600, align: 'center', color: P.hcIvory, alpha: a1 });
        L.text(ctx, 'ON TRIAL.', 540, 1290, { size: 70, family: SERIF, weight: 600, align: 'center', color: P.hcYellow, alpha: a2 });
        const la = L.clamp((T - 34.0) / 0.3) * ta;
        if (la > 0) L.text(ctx, 'ROME · JANUARY 897', 540, 1380, { size: 28, family: MONO, weight: 600, align: 'center', color: '#C9D1E6', alpha: la, tracking: '0.3em' });
      }
      const pl = plan();
      const fade = 1 - L.clamp((T - 38.85) / 0.4);
      ctx.save();
      ctx.globalAlpha = fade;
      if (T > 36.3 && T < pl[0].t0 + 0.05) {
        const u = L.clamp((T - 36.3) / (pl[0].t0 - 36.3));
        HC.line(ctx, L.smoothPts([eye, [eye[0] - 160, eye[1] + 220], pl[0].pts[0]], false, 4), { plate: 'blueprint', to: Math.max(0.02, u), width: 6, seed: 5 });
      }
      pl.forEach((s, i) => {
        if (T < s.t0) return;
        const u = L.clamp((T - s.t0) / (s.t1 - s.t0));
        HC.line(ctx, s.pts, { plate: 'blueprint', to: Math.max(0.02, u), width: 7, seed: 10 + i, head: u < 1, wobble: 0.7 });
      });
      const sa = L.clamp((T - 38.0) / 0.35);
      if (sa > 0) L.text(ctx, 'STAY CURIOUS.', 540, 1420, { size: 34, family: MONO, weight: 600, align: 'center', color: P.hcIvory, alpha: sa, tracking: '0.4em' });
      ctx.restore();
    },
  });
})();
