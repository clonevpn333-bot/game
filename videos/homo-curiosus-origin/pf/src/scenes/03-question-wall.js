// 03 · question-wall · T 5.75–8.25 · blueprint
// Layers: (1) blueprint plate (2) the diagram group in G1 coordinates — rock contour map inside the hand,
// halo stipple, calcite strata + U-series core, hematite lattice node, brackets — easing to the lower left 6.0–6.5
// (3) faint star field from 7.0 (4) the curiosity line: tail from shot 02, then the G3 "?" by 6.875, dot at 7.0
// (5) progress glyph, labels.
(function () {
  'use strict';
  const ID = 'question-wall';
  const NARROW = 0.55;
  const MOVE0 = 6.0, MOVE1 = 6.5, CURL0 = 6.375, CURL1 = 6.875, DOT = 7.0;
  const TARGET = { cx: 300, cy: 1260, k: 0.42 / 0.78 };
  const MONO = '"JetBrains Mono", ui-monospace, monospace';
  let GEO = null;
  function geo(L, HC) {
    if (GEO) return GEO;
    const h = HC.hand({ narrow: NARROW });
    const contours = [];
    for (let i = 1; i <= 6; i++) contours.push(HC.hand({ narrow: NARROW, s: 0.78 * (1 - i * 0.12), cy: 900 + i * 14, cx: 540 + i * 6 }).outline);
    const strata = [];
    for (let i = 0; i < 7; i++) {
      const pts = [];
      for (let x = 230; x <= 860; x += 14) pts.push([x, 1250 + i * 15 + Math.sin(x * 0.02 + i * 0.7) * 5 + L.noise1(x * 0.015, 30 + i) * 6]);
      strata.push(pts);
    }
    GEO = { h, contours, strata };
    return GEO;
  }
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, X = FILM.hx, HC = FILM.hc;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const g = geo(L, HC);
      L.blueprint(ctx, { color: P.hcNavy, seed: 33, center: [650, 900] });

      // diagram transform
      const m = L.ease.inOutCubic(L.clamp((T - MOVE0) / (MOVE1 - MOVE0)));
      const k = L.lerp(1, TARGET.k, m);
      const ox = L.lerp(540, TARGET.cx, m), oy = L.lerp(900, TARGET.cy, m);
      const toScreen = (p) => [(p[0] - 540) * k + ox, (p[1] - 900) * k + oy];
      ctx.save();
      ctx.translate(ox, oy);
      ctx.scale(k, k);
      ctx.translate(-540, -900);
      const lw = 1 / k;
      // guide circles + crosshair
      L.guideCircle(ctx, 540, 860, 470, { alpha: 0.14, width: 1.5 * lw, cross: 30 });
      L.guideCircle(ctx, 540, 860, 330, { alpha: 0.1, width: 1 * lw, dash: [6, 8] });
      // halo as stipple field
      const dots = X.haloDots();
      ctx.fillStyle = L.rgba(P.lavender, 0.55);
      for (let i = 0; i < dots.length; i += 2) {
        const d = dots[i];
        ctx.fillRect(d.x - 0.9, d.y - 0.9, 1.8, 1.8);
      }
      // contour map of the rock inside the hand
      g.contours.forEach((c, i) => {
        ctx.strokeStyle = L.rgba(P.paleBlue, 0.32 - i * 0.04);
        ctx.lineWidth = 1 * lw;
        L.tracePath(ctx, c, true);
        ctx.stroke();
      });
      // the stencil outline, double
      ctx.strokeStyle = L.rgba(P.lavender, 0.9);
      ctx.lineWidth = 2.5 * lw;
      L.tracePath(ctx, g.h.outline, true);
      ctx.stroke();
      ctx.save();
      ctx.translate(540, 900);
      ctx.scale(0.975, 0.975);
      ctx.translate(-540, -900);
      ctx.strokeStyle = L.rgba(P.lavender, 0.5);
      ctx.lineWidth = 1.5 * lw;
      L.tracePath(ctx, g.h.outline, true);
      ctx.stroke();
      ctx.restore();
      // calcite strata across the wrist + the drilled U-series core
      g.strata.forEach((s, i) => {
        ctx.strokeStyle = L.rgba(i % 2 ? P.lavender : P.paleBlue, 0.55);
        ctx.lineWidth = 1.2 * lw;
        L.tracePath(ctx, s, false);
        ctx.stroke();
      });
      const core = L.capsulePts(720, 1295, 150, 18, Math.PI / 2, 40);
      ctx.fillStyle = L.rgba(P.navyLight, 0.9);
      L.tracePath(ctx, core, true);
      ctx.fill();
      L.hatch(ctx, core, { angle: 0, spacing: 6, width: 1, color: P.lavender, alpha: 0.6, seed: 9 });
      ctx.strokeStyle = L.rgba(P.lineWhite, 0.85);
      ctx.lineWidth = 1.8 * lw;
      L.tracePath(ctx, core, true);
      ctx.stroke();
      // hematite node: lattice in a circle, leader to the halo
      const nd = [905, 640], nr = 110;
      const lat = L.ellipsePts(nd[0], nd[1], nr, nr, 64);
      L.hexLattice(ctx, lat, { r: 14, color: P.paleBlue, alpha: 0.55, width: 1 * lw, dots: 2.2, seed: 12,
        cellFn: (x, y, i, j) => ((i + j) % 3 === 0 ? { fill: L.rgba(P.hcRed, 0.35) } : true) });
      ctx.strokeStyle = L.rgba(P.lavender, 0.8);
      ctx.lineWidth = 2 * lw;
      L.tracePath(ctx, lat, true);
      ctx.stroke();
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(nd[0] - nr * 0.7, nd[1] + nr * 0.7);
      ctx.lineTo(820, 840);
      ctx.stroke();
      ctx.setLineDash([]);
      L.bracket(ctx, 300, 474, 300, 1209, { color: P.lavender, alpha: 0.6, width: 1.5 * lw, cap: 16 });
      ctx.restore();

      // labels (screen space, never in the caption band y 250–350)
      const la = 1 - m;
      if (la > 0.02) {
        const s1 = toScreen([760, 1400]);
        L.text(ctx, 'U-SERIES ≥ 67.8 KA', s1[0], s1[1], { size: 24, family: MONO, weight: 500, color: P.lavender, alpha: 0.8 * la, tracking: '0.18em' });
        const s2 = toScreen([840, 800]);
        L.text(ctx, 'Fe₂O₃', s2[0], s2[1], { size: 26, family: MONO, weight: 500, color: P.lavender, alpha: 0.8 * la, tracking: '0.18em' });
      }
      const fin = L.clamp((T - 6.6) / 0.3);
      if (fin > 0) {
        const s3 = toScreen([300, 1460]);
        L.text(ctx, 'LIANG METANDUNO · MUNA', 90, 1515, { size: 22, family: MONO, weight: 500, color: P.lavender, alpha: 0.7 * fin, tracking: '0.18em' });
      }

      // star field fades up around the dot (it becomes Orion in shot 04)
      const sf = L.clamp((T - DOT) / 0.8);
      if (sf > 0) {
        const r = L.rng(L.hash(ID, 'stars'));
        for (let i = 0; i < 160; i++) {
          const x = r() * 1080, y = 380 + r() * 1150, s = r();
          ctx.fillStyle = L.rgba(P.lineWhite, sf * (0.25 + s * 0.6));
          ctx.beginPath();
          ctx.arc(x, y, 0.8 + s * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        [[420, 640], [640, 680], [500, 900], [545, 890], [590, 878], [450, 1160], [540, 560]].forEach(([x, y], i) => {
          L.glowDot(ctx, x, y, 3.5, { color: P.lineWhite, rays: 6, rayLen: 2.5, intensity: sf * 0.8, seed: 40 + i });
        });
      }

      // the curiosity line: the tail from shot 02, then the question mark
      const tip = toScreen(g.h.tips.index);
      const tailEnd = [tip[0] - 10, tip[1] - 140];
      const tail = L.smoothPts([tip, [tip[0] + 26, tip[1] - 50], [tip[0] + 14, tip[1] - 100], tailEnd], false, 4);
      const q = HC.question(650, 820, 820);
      const bridge = L.smoothPts([tailEnd, [tailEnd[0] - 20, tailEnd[1] - 160], [380, 700], q.hook[0]], false, 4);
      const path = tail.concat(bridge.slice(1), q.hook.slice(1));
      const lenOf = (pts) => pts.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);
      const total = lenOf(path), tailF = lenOf(tail) / total, leadF = (lenOf(tail) + lenOf(bridge)) / total;
      const u = L.ease.inOutCubic(L.clamp((T - CURL0) / (CURL1 - CURL0)));
      // the lead-in retracts into the question mark as it forms, so only the "?" remains
      const from = leadF * L.ease.inOutCubic(L.clamp((T - CURL0 - 0.15) / (CURL1 - CURL0 + 0.1)));
      HC.line(ctx, path, { plate: 'blueprint', from, to: L.lerp(tailF, 1, u), width: 7, seed: 5 });
      // construction geometry of the question mark
      const cg = L.ease.outExpo(L.clamp((T - 6.5) / 0.5));
      if (cg > 0) {
        const kq = 820 / 600;
        L.guideCircle(ctx, 650, 820 - 150 * kq, 150 * kq, { alpha: 0.28 * cg, width: 1.5, dash: [8, 8], cross: 18 });
        L.guideCircle(ctx, 650, 820 - 150 * kq, 150 * kq + 26, { alpha: 0.12 * cg, width: 1, p: cg });
        L.bracket(ctx, 930, 410, 930, 1221, { color: P.lavender, alpha: 0.6 * cg, width: 1.5, p: cg });
        L.ticks(ctx, 960, 410, { kind: 'linear', length: 811, angle: Math.PI / 2, n: 28, major: 4, p: cg, color: P.lineWhite, alpha: 0.45 });
        ctx.strokeStyle = L.rgba(P.lavender, 0.18 * cg);
        ctx.setLineDash([4, 10]);
        ctx.beginPath();
        ctx.moveTo(650, 380); ctx.lineTo(650, 1300);
        ctx.moveTo(380, 615); ctx.lineTo(920, 615);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      // the dot lands
      if (T >= DOT) {
        const d = q.dot;
        const pop = [0.72, 1.12, 1][Math.min(2, Math.floor((T - DOT) * 12 + 1e-6))];
        const breathe = 1 + 0.05 * Math.sin((T - DOT) * 5);
        ctx.save();
        ctx.fillStyle = P.hcYellow;
        ctx.beginPath();
        ctx.arc(d[0], d[1], q.dotR * pop * breathe, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        L.glowDot(ctx, d[0], d[1], 12 * pop, { color: P.hcYellow, core: '#FFFBEA', rays: 12, rayLen: 4.5, glow: 7, seed: 7 });
        const rr = (T - DOT) / 0.34;
        if (rr < 1) {
          ctx.strokeStyle = L.rgba(P.hcRed, 1 - rr);
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(d[0], d[1], q.dotR + 160 * L.ease.outExpo(rr), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      X.progress(ctx, 0, T);
    },
  });
})();
