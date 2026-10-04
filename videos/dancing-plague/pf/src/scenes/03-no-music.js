// 03 · no-music · T 7.5–9.75 · woodcut + Pip has stepped INTO the print, in 3D (front, right)
(function () {
  'use strict';
  FILM.scene({ id: 'no-music', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, W = FILM.wc;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    W.paper(ctx);
    W.gouge(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: -0.35, spacing: 14, width: 1.2, alpha: 0.35, seed: 31 });
    const tw = info.shot.start + L.onTwos(t);
    W.dancer(ctx, 330, 1500, 0.95, (tw - 7.0) * 9);
    // notes: drawn, then struck out on "music"
    const notes = [[640, 640], [780, 520], [900, 700], [700, 820]];
    notes.forEach(([x, y], i) => {
      const yy = y - (T - 7.5) * 30;
      ctx.fillStyle = P.wcInk; ctx.beginPath(); ctx.ellipse(x, yy, 26, 19, -0.4, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x + 20, yy - 120, 8, 120);
      ctx.beginPath(); ctx.moveTo(x + 28, yy - 120); ctx.quadraticCurveTo(x + 70, yy - 90, x + 50, yy - 50); ctx.lineWidth = 8; ctx.strokeStyle = P.wcInk; ctx.stroke();
    });
    const x1 = L.ease.outCubic(L.clamp((T - 7.85) / 0.2)), x2 = L.ease.outCubic(L.clamp((T - 8.0) / 0.2));
    if (x1 > 0) L.inkPath(ctx, [[560, 420], [L.lerp(560, 990, x1), L.lerp(420, 900, x1)]], { width: 16, color: P.wcRed, seed: 1 });
    if (x2 > 0) L.inkPath(ctx, [[990, 420], [L.lerp(990, 560, x2), L.lerp(420, 900, x2)]], { width: 16, color: P.wcRed, seed: 2 });
    // day counter tablet: days tick by while she dances
    const day = Math.min(6, 1 + Math.floor(Math.max(0, T - 8.5) * 5));
    ctx.fillStyle = P.parch; ctx.fillRect(560, 1000, 380, 170);
    ctx.strokeStyle = P.wcInk; ctx.lineWidth = 6; ctx.strokeRect(560, 1000, 380, 170);
    L.text(ctx, 'DAY ' + day, 750, 1090, { size: 76, family: '"Fraunces", Georgia, serif', weight: 600, align: 'center', baseline: 'middle', color: day > 1 ? P.wcRed : P.wcInk });
    W.frame(ctx);
  } });
})();
