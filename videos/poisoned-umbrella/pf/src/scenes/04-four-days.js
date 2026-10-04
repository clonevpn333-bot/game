// 04 · four-days · T 12.00–15.25 · 2D (illustrated)
// A hospital temperature chart on a clipboard, inked on ivory. The curiosity line IS the fever: it climbs
// over 7–11 September and stops on "dead" (14.61) with a red cross; an ECG trace below flatlines with it.
(function () {
  'use strict';
  const ID = 'four-days';
  const MONO = '"JetBrains Mono", ui-monospace, monospace';
  const DEAD = 14.61;
  const G = { x: 150, y: 560, w: 800, h: 640 }; // chart grid
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, HC = FILM.hc;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const push = 1 + 0.05 * L.ease.inOutSine(L.clamp(t / info.dur));
      ctx.save();
      ctx.translate(540, 900); ctx.scale(push, push); ctx.rotate(-0.02); ctx.translate(-540, -900);
      L.paper(ctx, { color: '#E6DCC6', seed: 41, vignette: 0.5 });
      // clipboard + chart sheet
      const board = [[80, 260], [1000, 260], [1000, 1640], [80, 1640]];
      L.inkPath(ctx, board, { closed: true, width: 4, color: P.hcInk, seed: 1, fill: '#B89A6E' });
      L.hatch(ctx, board, { angle: 0.1, spacing: 7, width: 1.1, color: P.hcInkSoft, alpha: 0.5, seed: 2 });
      const sheet = [[120, 330], [960, 330], [960, 1600], [120, 1600]];
      L.inkPath(ctx, sheet, { closed: true, width: 2.4, color: P.hcInk, seed: 3, fill: P.hcIvory });
      L.inkPath(ctx, [[400, 230], [680, 230], [680, 330], [400, 330]], { closed: true, width: 3, color: P.hcInk, seed: 4, fill: '#9AA0A8' });
      L.text(ctx, 'ST JAMES’ HOSPITAL · BALHAM', 540, 410, { size: 26, family: MONO, weight: 600, align: 'center', color: P.hcInk, tracking: '0.14em' });
      L.text(ctx, 'TEMPERATURE °C', 150, 500, { size: 20, family: MONO, weight: 600, color: P.hcInkSoft, tracking: '0.14em' });
      // grid
      ctx.strokeStyle = L.rgba('#5C7FA8', 0.35);
      ctx.lineWidth = 1;
      for (let i = 0; i <= 20; i++) { const x = G.x + (G.w * i) / 20; ctx.beginPath(); ctx.moveTo(x, G.y); ctx.lineTo(x, G.y + G.h); ctx.stroke(); }
      for (let i = 0; i <= 16; i++) { const y = G.y + (G.h * i) / 16; ctx.beginPath(); ctx.moveTo(G.x, y); ctx.lineTo(G.x + G.w, y); ctx.stroke(); }
      ctx.strokeStyle = L.rgba('#5C7FA8', 0.8);
      ctx.lineWidth = 2;
      for (let d = 0; d <= 4; d++) {
        const x = G.x + (G.w * d) / 4;
        ctx.beginPath(); ctx.moveTo(x, G.y); ctx.lineTo(x, G.y + G.h); ctx.stroke();
        L.text(ctx, String(7 + d) + ' SEPT', x, G.y + G.h + 40, { size: 20, family: MONO, weight: 600, align: 'center', color: P.hcInk, tracking: '0.08em' });
      }
      [36, 37, 38, 39, 40].forEach((c) => {
        const y = G.y + G.h - ((c - 35.5) / 5) * G.h;
        L.text(ctx, String(c), G.x - 18, y + 7, { size: 20, family: MONO, weight: 600, align: 'right', color: P.hcInk });
      });
      // the fever (the curiosity line), drawn on through the shot
      const temps = [[0, 37.0], [0.15, 37.4], [0.3, 39.2], [0.55, 39.8], [0.8, 39.4], [1.1, 40.1], [1.5, 39.0], [2.0, 39.6], [2.4, 38.4], [2.8, 37.6], [3.2, 36.4], [3.6, 35.9], [3.95, 35.6]];
      const pts = temps.map(([d, c]) => [G.x + (G.w * d) / 4, G.y + G.h - ((c - 35.5) / 5) * G.h]);
      const sm = L.smoothPts(pts, false, 5);
      const u = L.clamp((T - 12.15) / (DEAD - 12.15));
      HC.line(ctx, sm, { plate: 'paper', to: Math.max(0.01, u), width: 6, seed: 5, head: u < 1 });
      // the 37° line: body heat (it matters later)
      const y37 = G.y + G.h - ((37 - 35.5) / 5) * G.h;
      ctx.save();
      ctx.setLineDash([12, 8]);
      ctx.strokeStyle = L.rgba(P.hcRed, 0.7);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(G.x, y37); ctx.lineTo(G.x + G.w, y37); ctx.stroke();
      ctx.restore();
      // ECG trace that flatlines
      const ey = 1420;
      const ecg = [];
      const end = G.x + G.w * L.clamp((T - 12.0) / (DEAD - 12.0 + 0.4));
      for (let x = G.x; x <= end; x += 3) {
        const ph = ((x - G.x) / 110) % 1;
        const alive = x < G.x + G.w * 0.86;
        let y = ey;
        if (alive) y += ph > 0.4 && ph < 0.44 ? -70 : ph > 0.44 && ph < 0.47 ? 40 : ph > 0.6 && ph < 0.7 ? -14 * Math.sin((ph - 0.6) * 31) : 0;
        ecg.push([x, y]);
      }
      if (ecg.length > 1) L.inkPath(ctx, ecg, { width: 3, color: P.hcInk, seed: 20, smooth: false });
      // the red cross on "dead"
      if (T >= DEAD) {
        const k = L.ease.outBack(L.clamp((T - DEAD) / 0.2));
        const e = pts[pts.length - 1];
        const s = 34 * k;
        L.inkPath(ctx, [[e[0] - s, e[1] - s], [e[0] + s, e[1] + s]], { width: 7, color: P.hcRed, seed: 30 });
        L.inkPath(ctx, [[e[0] + s, e[1] - s], [e[0] - s, e[1] + s]], { width: 7, color: P.hcRed, seed: 31 });
        L.text(ctx, '11 SEPT 1978', e[0] - 20, e[1] - 60, { size: 26, family: MONO, weight: 700, align: 'right', color: P.hcRed, alpha: k, tracking: '0.1em' });
      }
      ctx.restore();
    },
  });
})();
