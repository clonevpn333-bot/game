// 08 · evidence · T 27.75–30.50 · 2D board + PiP
// The investigators' board (FILM.mk.board): cards and the red curiosity string. On "found" an X-ray PiP opens
// over it: the thigh, the femur, and — circled on "thigh" — one bright dot in the soft tissue.
(function () {
  'use strict';
  const ID = 'evidence';
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, M = FILM.mk;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const drift = L.ease.inOutSine(L.clamp(t / info.dur));
      ctx.save();
      ctx.translate(540, 900); ctx.scale(1.04 - 0.04 * drift, 1.04 - 0.04 * drift); ctx.translate(-540, -900);
      M.board(ctx, T);
      ctx.restore();
      const pp = L.clamp((T - 28.55) / 0.35);
      const DOT = [680, 900];
      M.pip(ctx, { kind: 'rect', x: 140, y: 560, w: 800, h: 620, p: pp, label: 'X-RAY · RIGHT THIGH', plate: 'navy' }, (g) => {
        g.fillStyle = '#04121A';
        g.fillRect(140, 560, 800, 620);
        // soft tissue: the thigh in profile, glowing cyan
        const thigh = [[300, 560], [790, 560], [760, 760], [700, 1000], [650, 1180], [440, 1180], [390, 1000], [330, 780]];
        L.tracePath(g, L.smoothPts(thigh, true, 6), true);
        g.fillStyle = L.rgba(P.xray, 0.12);
        g.fill();
        g.strokeStyle = L.rgba(P.xray, 0.6); g.lineWidth = 3; g.stroke();
        // femur
        const fem = L.capsulePts(545, 860, 560, 34, Math.PI / 2 + 0.08, 50);
        L.tracePath(g, fem, true);
        const gr = g.createLinearGradient(510, 0, 610, 0);
        gr.addColorStop(0, 'rgba(235,252,255,0.95)'); gr.addColorStop(0.5, 'rgba(190,230,240,0.75)'); gr.addColorStop(1, 'rgba(235,252,255,0.95)');
        g.fillStyle = gr; g.fill();
        [[515, 1140], [585, 1146]].forEach(([x, y]) => { g.fillStyle = 'rgba(230,250,255,0.9)'; g.beginPath(); g.ellipse(x, y, 40, 30, 0, 0, Math.PI * 2); g.fill(); });
        g.fillStyle = 'rgba(235,252,255,0.9)'; g.beginPath(); g.ellipse(520, 590, 60, 46, -0.3, 0, Math.PI * 2); g.fill();
        // scan lines
        g.fillStyle = 'rgba(0,0,0,0.18)';
        for (let y = 560; y < 1180; y += 4) g.fillRect(140, y, 800, 1);
        // the pellet: a bright dot in the back of the thigh
        const tw = 0.7 + 0.3 * Math.sin(T * 20);
        L.glowDot(g, DOT[0], DOT[1], 5, { color: '#FFFFFF', core: '#FFFFFF', rays: 8, rayLen: 3, glow: 6, intensity: tw });
      });
      if (pp > 0.9) {
        M.callout(ctx, DOT[0], DOT[1], 54, L.clamp((T - 29.4) / 0.3), { color: P.hcYellow, width: 5 });
        M.label(ctx, 'FOREIGN BODY', DOT[0] - 70, DOT[1] - 70, { size: 26, align: 'right', alpha: L.clamp((T - 29.5) / 0.2) });
      }
    },
  });
})();
