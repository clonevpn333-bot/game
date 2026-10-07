// 10 · outro · T 32.0–40.0 · the U-70 ring (from lift) collapses to a point; from it, his head alone in the dark, turning,
// the beam's scar on him and a thin line through it: THE ONLY PERSON / KNOWN TO BE HIT / BY A PARTICLE BEAM.
// Then the beam's exit point becomes the curiosity line's head and writes WHY WE / WONDER; STAY CURIOUS. lands under it.
(function () {
  'use strict';
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
    const T0 = 36.95, T1 = 38.3, hop = 0.015, avail = T1 - T0 - hop * (strokes.length - 1);
    let tt = T0;
    PLAN = strokes.map((s) => { const d = (avail * len(s)) / tot; const o = { pts: s, t0: tt, t1: tt + d }; tt += d + hop; return o; });
    return PLAN;
  }
  FILM.scene({
    id: 'outro',
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, HC = FILM.hc, PB = FILM.pb;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      ctx.fillStyle = '#04060B';
      ctx.fillRect(0, 0, 1080, 1920);
      const v = ctx.createRadialGradient(540, 700, 20, 540, 700, 900);
      v.addColorStop(0, 'rgba(26,34,60,0.9)');
      v.addColorStop(1, 'rgba(4,6,11,0)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, 1080, 1920);
      // the ring collapses into a point (32.0–32.35)
      const col = L.ease.inCubic(L.clamp((T - 32.0) / 0.35));
      if (col < 1) { const R = 300 * (1 - col); L.inkCircle(ctx, 540, L.lerp(1100, 720, col), Math.max(2, R), { width: 6, color: PB.Y, seed: 95 }); PB.burst(ctx, 540, L.lerp(1100, 720, col), 200, 0.6); }
      const textOut = L.clamp((T - 36.45) / 0.35);
      const open = L.ease.outCubic(L.clamp((T - 32.25) / 0.5));
      const H = (560 + 60 * L.ease.inOutSine(L.clamp((T - 32.3) / 4))) * open * (1 - L.ease.inCubic(textOut));
      let eye = [540, 720];
      if (H > 12) {
        const r = PB.head(ctx, 540, 720, H, { win: [-2.1, 2.1, -1.55, 1.25], yaw: 1.05 + 0.1 * (T - 32.3), key: [-0.3, 0.5, 0.8], rim: [0.9, 0.3, -0.4], res: 0.4, slot: 16, scar: 1, swell: 0.2 });
        const a = r.proj(...PB.BEAM_IN), b = r.proj(...PB.BEAM_OUT);
        const [p, q] = PB.extend(a, b, 1600);
        PB.beam(ctx, p, q, { T, w: 3, k: 0.4 * open, dots: false });
        eye = b;
        PB.burst(ctx, b[0], b[1], 90, 0.6 * open);
      }
      const ta = 1 - textOut;
      if (ta > 0) {
        const a1 = L.clamp((T - 32.35) / 0.3) * ta, a2 = L.clamp((T - 33.15) / 0.3) * ta, a3 = L.clamp((T - 34.2) / 0.3) * ta;
        L.text(ctx, 'THE ONLY PERSON', 540, 1130, { size: 72, family: SERIF, weight: 600, align: 'center', color: P.hcIvory, alpha: a1, tracking: '0.04em' });
        L.text(ctx, 'KNOWN TO BE HIT', 540, 1225, { size: 72, family: SERIF, weight: 600, align: 'center', color: P.hcIvory, alpha: a2, tracking: '0.04em' });
        L.text(ctx, 'BY A PARTICLE BEAM.', 540, 1320, { size: 72, family: SERIF, weight: 600, align: 'center', color: P.hcYellow, alpha: a3 });
        const la = L.clamp((T - 34.9) / 0.3) * ta;
        if (la > 0) L.text(ctx, 'ANATOLI BUGORSKI · U-70 · 1978', 540, 1410, { size: 26, family: MONO, weight: 600, align: 'center', color: '#C9D1E6', alpha: la, tracking: '0.22em' });
      }
      const pl = plan();
      const fade = 1 - L.clamp((T - 39.6) / 0.4);
      ctx.save();
      ctx.globalAlpha = fade;
      if (T > 36.75 && T < pl[0].t0 + 0.05) {
        const u = L.clamp((T - 36.75) / (pl[0].t0 - 36.75));
        HC.line(ctx, L.smoothPts([eye, [eye[0] - 160, eye[1] + 220], pl[0].pts[0]], false, 4), { plate: 'blueprint', to: Math.max(0.02, u), width: 6, seed: 5 });
      }
      pl.forEach((s, i) => {
        if (T < s.t0) return;
        const u = L.clamp((T - s.t0) / (s.t1 - s.t0));
        HC.line(ctx, s.pts, { plate: 'blueprint', to: Math.max(0.02, u), width: 7, seed: 10 + i, head: u < 1, wobble: 0.7 });
      });
      const sa = L.clamp((T - 38.4) / 0.35);
      if (sa > 0) L.text(ctx, 'STAY CURIOUS.', 540, 1420, { size: 34, family: MONO, weight: 600, align: 'center', color: P.hcIvory, alpha: sa, tracking: '0.4em' });
      ctx.restore();
    },
  });
})();
