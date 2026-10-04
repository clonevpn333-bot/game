// 05 · the-cure · T 15–19.5 · the city builds a stage (17.62) and hires musicians (18.46); Pip (3D) bops along
(function () {
  'use strict';
  FILM.scene({ id: 'the-cure', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, W = FILM.wc;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const tw = info.shot.start + L.onTwos(t);
    W.paper(ctx);
    W.house(ctx, -60, 1080, 420, 760, 51); W.house(ctx, 720, 1080, 420, 820, 52);
    W.gouge(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1080 }, angle: 0, spacing: 10, width: 1.3, alpha: 0.5, seed: 53 });
    // the stage: planks stamped down one by one
    const planks = Math.floor(L.clamp((T - 17.55) / 0.6) * 9);
    for (let i = 0; i < planks; i++) {
      const x = 170 + i * 82;
      ctx.fillStyle = '#D9C497'; ctx.fillRect(x, 1080, 80, 120);
      ctx.strokeStyle = P.wcInk; ctx.lineWidth = 4; ctx.strokeRect(x, 1080, 80, 120);
      W.gouge(ctx, [[x, 1080], [x + 80, 1080], [x + 80, 1200], [x, 1200]], { angle: 0, spacing: 9, width: 1.4, seed: 54 + i });
    }
    if (planks >= 9) { ctx.fillStyle = P.wcInk; ctx.fillRect(170, 1200, 738, 22); [190, 520, 880].forEach((x) => ctx.fillRect(x, 1200, 16, 140)); }
    // musicians appear on the stage
    if (T >= 18.42) {
      W.dancer(ctx, 360, 1080, 0.62, (tw - 18) * 6, { kind: 'piper' });
      W.dancer(ctx, 720, 1080, 0.62, (tw - 18) * 12, { kind: 'drummer', flip: true });
    }
    // dancers in front of the stage
    [[180, 1700, 0.62, 0], [520, 1820, 0.72, 2], [880, 1680, 0.6, 4]].forEach(([x, y, s, ph], i) => W.dancer(ctx, x, y, s, (tw - 7) * 9 + ph, { kind: i === 1 ? 'man' : 'woman', flip: i === 2 }));
    // woodcut notes from the instruments
    if (T >= 18.5) for (let k = 0; k < 6; k++) {
      const u = ((T - 18.5) * 0.8 + k / 6) % 1;
      const x = 380 + k * 70 + Math.sin(u * 6 + k) * 30, y = 700 - u * 420;
      ctx.fillStyle = L.rgba(P.wcInk, 1 - u); ctx.beginPath(); ctx.ellipse(x, y, 16, 12, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x + 12, y - 70, 5, 70);
    }
    W.frame(ctx);
  } });
})();
