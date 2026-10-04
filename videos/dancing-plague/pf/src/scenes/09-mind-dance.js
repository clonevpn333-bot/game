// 09 · mind-dance · T 32.75–35.75 · a woodcut head; the curiosity line runs from the mind to the feet; on "dance" she dances
(function () {
  'use strict';
  FILM.scene({ id: 'mind-dance', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, W = FILM.wc, HC = FILM.hc;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const tw = info.shot.start + L.onTwos(t);
    W.paper(ctx);
    // the head in profile (left), brain gouged inside
    const head = L.smoothPts([[120, 560], [260, 380], [470, 360], [600, 470], [640, 640], [600, 720], [640, 800], [600, 830], [610, 900], [560, 960], [470, 990], [430, 1160], [200, 1160], [210, 1000], [130, 860], [100, 700]], true, 6);
    ctx.beginPath(); L.tracePath(ctx, head, true); ctx.fillStyle = '#EFE4CA'; ctx.fill();
    W.gouge(ctx, head, { spacing: 7, width: 1.6, angle: 0.5, seed: 91, density: (x) => L.clamp((260 - x) / 160) });
    ctx.strokeStyle = P.wcInk; ctx.lineWidth = 8; ctx.beginPath(); L.tracePath(ctx, head, true); ctx.stroke();
    const brain = L.ellipsePts(380, 600, 190, 140, 60);
    ctx.beginPath(); L.tracePath(ctx, brain, true); ctx.fillStyle = '#E7C9B4'; ctx.fill();
    ctx.strokeStyle = P.wcInk; ctx.lineWidth = 4;
    for (let k = 0; k < 9; k++) { ctx.beginPath(); for (let a = 0; a < 6; a += 0.2) { const x = 240 + k * 34 + Math.sin(a * 3 + k) * 10, y = 480 + a * 40; if (a === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.lineWidth = 6; ctx.beginPath(); L.tracePath(ctx, brain, true); ctx.stroke();
    const glow = 0.5 + 0.5 * Math.sin(T * 9);
    L.glowDot(ctx, 420, 600, 14, { color: P.hcRed, rays: 10, rayLen: 4, additive: false, intensity: 0.6 + 0.4 * glow });
    // the line: from the mind, down a nerve, to the dancer's feet
    const path = L.smoothPts([[420, 600], [520, 760], [560, 1100], [700, 1300], [760, 1560], [800, 1700]], false, 6);
    const u = L.ease.inOutCubic(L.clamp((T - 33.0) / 1.9));
    HC.line(ctx, path, { plate: 'paper', to: Math.max(0.02, u), width: 7, seed: 5 });
    const dancing = T >= 35.15;
    W.dancer(ctx, 800, 1720, 0.85, dancing ? (tw - 35.15) * 10 : 0, { still: !dancing });
    W.frame(ctx);
  } });
})();
