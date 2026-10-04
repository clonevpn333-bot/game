// 08 · fear · T 27–32.75 · the print goes dark: three woodcut vignettes — famine (28.96), sickness (29.64), a curse (31.48)
(function () {
  'use strict';
  FILM.scene({ id: 'fear', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, W = FILM.wc, M = FILM.mk;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    ctx.fillStyle = '#0B0806'; ctx.fillRect(0, 0, 1080, 1920);
    W.gouge(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.2, spacing: 8, width: 1.4, color: '#2A2018', alpha: 0.9, seed: 81 });
    const panel = (i, at, label, draw) => {
      const pp = L.clamp((T - at) / 0.3);
      const x = [90, 560, 300][i], y = [330, 330, 820][i], w = [430, 430, 480][i], h = [430, 430, 520][i];
      M.pip(ctx, { kind: 'rect', x, y, w, h, p: pp, label, plate: 'paper' }, (g) => { g.fillStyle = P.parch; g.fillRect(x, y, w, h); W.gouge(g, null, { bounds: { x, y, w, h }, angle: 0, spacing: 10, width: 1.2, alpha: 0.4, seed: 82 + i }); draw(g, x, y, w, h); });
    };
    panel(0, 28.85, 'FAMINE', (g, x, y, w, h) => {
      // an empty bread basket, a single crust
      g.fillStyle = P.wcInk; g.beginPath(); g.ellipse(x + w / 2, y + h * 0.62, 150, 60, 0, 0, Math.PI); g.fill();
      g.strokeStyle = P.parch; g.lineWidth = 3; for (let k = -5; k <= 5; k++) { g.beginPath(); g.moveTo(x + w / 2 + k * 26, y + h * 0.62); g.lineTo(x + w / 2 + k * 22, y + h * 0.62 + 55); g.stroke(); }
      g.strokeStyle = P.wcInk; g.lineWidth = 8; g.beginPath(); g.ellipse(x + w / 2, y + h * 0.62, 150, 30, 0, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#C9A65A'; g.beginPath(); g.ellipse(x + w / 2 + 40, y + h * 0.6, 26, 12, 0.3, 0, Math.PI * 2); g.fill(); g.lineWidth = 3; g.stroke();
    });
    panel(1, 29.55, 'SICKNESS', (g, x, y, w, h) => {
      // a shut door marked with a cross
      g.fillStyle = P.wcInk; g.fillRect(x + w * 0.3, y + h * 0.18, w * 0.4, h * 0.7);
      g.strokeStyle = P.parch; g.lineWidth = 3; for (let k = 1; k < 5; k++) { g.beginPath(); g.moveTo(x + w * 0.3 + k * w * 0.08, y + h * 0.2); g.lineTo(x + w * 0.3 + k * w * 0.08, y + h * 0.86); g.stroke(); }
      L.inkPath(g, [[x + w * 0.38, y + h * 0.3], [x + w * 0.62, y + h * 0.62]], { width: 14, color: P.wcRed, seed: 83 });
      L.inkPath(g, [[x + w * 0.62, y + h * 0.3], [x + w * 0.38, y + h * 0.62]], { width: 14, color: P.wcRed, seed: 84 });
    });
    panel(2, 31.4, 'A CURSE', (g, x, y, w, h) => {
      // a horned shadow looming over a tiny dancing town
      g.fillStyle = P.wcInk;
      g.beginPath(); g.moveTo(x + w * 0.15, y + h); g.quadraticCurveTo(x + w * 0.2, y + h * 0.3, x + w * 0.38, y + h * 0.22);
      g.lineTo(x + w * 0.34, y + h * 0.04); g.lineTo(x + w * 0.45, y + h * 0.18); g.quadraticCurveTo(x + w * 0.5, y + h * 0.15, x + w * 0.55, y + h * 0.18);
      g.lineTo(x + w * 0.66, y + h * 0.04); g.lineTo(x + w * 0.62, y + h * 0.22); g.quadraticCurveTo(x + w * 0.8, y + h * 0.3, x + w * 0.85, y + h); g.closePath(); g.fill();
      g.fillStyle = P.wcRed; [[0.44, 0.3], [0.56, 0.3]].forEach(([a, b]) => { g.beginPath(); g.ellipse(x + w * a, y + h * b, 12, 6, 0, 0, Math.PI * 2); g.fill(); });
      for (let k = 0; k < 7; k++) W.dancer(g, x + w * (0.12 + k * 0.13), y + h * 0.98, 0.12, T * 10 + k, { kind: k % 2 ? 'man' : 'woman' });
    });
  } });
})();
