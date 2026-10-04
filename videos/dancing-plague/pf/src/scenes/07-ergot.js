// 07 · ergot · T 21.25–27 · woodcut rye; a microscope PiP finds the ergot spurs (22.52); hallucination warp (25.2+)
(function () {
  'use strict';
  const PH = [880, 330, 130];
  // a rye ear with its head at (x, y), kernels down 16 rows, stem running to the bottom of the frame
  const KY = (i) => 20 + i * 26;
  function ear(ctx, L, P, x, y, s, sway, ergot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(sway); ctx.scale(s, s);
    ctx.strokeStyle = P.wcInk; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(0, 2000); ctx.stroke();
    for (let i = 0; i < 16; i++) for (const sd of [-1, 1]) {
      const isE = ergot && (i === 6 || i === 10) && sd === 1;
      ctx.save(); ctx.translate(sd * 15, KY(i)); ctx.rotate(-sd * 0.45);
      ctx.beginPath(); ctx.ellipse(0, isE ? -16 : 0, isE ? 13 : 14, isE ? 46 : 26, 0, 0, Math.PI * 2);
      ctx.fillStyle = isE ? P.ergot : '#E6CE8E'; ctx.fill(); ctx.strokeStyle = P.wcInk; ctx.lineWidth = 3.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -26); ctx.lineTo(0, -90); ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  FILM.scene({ id: 'ergot', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, W = FILM.wc, M = FILM.mk;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const warp = L.ease.inOutSine(L.clamp((T - 25.2) / 0.8));
    W.paper(ctx);
    W.gouge(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0, spacing: 11, width: 1.2, alpha: 0.4, seed: 71 });
    for (let i = 0; i < 10; i++) { const sway = Math.sin(T * 1.5 + i) * 0.05 + warp * Math.sin(T * 7 + i) * 0.25 + (i - 4.5) * 0.03; ear(ctx, L, P, 60 + i * 108, 1180 + (i % 3) * 70, 0.85, sway, false); }
    ear(ctx, L, P, 430, 820, 1.35, Math.sin(T * 1.2) * 0.03 + warp * Math.sin(T * 6) * 0.15, true);
    // the microscope PiP on the dark kernel
    const target = [430 + 15 * 1.35, 820 + KY(6) * 1.35 - 20];
    const pp = L.clamp((T - 22.4) / 0.35) * (1 - L.clamp((T - 26.6) / 0.3));
    M.pip(ctx, { kind: 'circle', x: 760, y: 700, r: 240, p: pp, label: 'CLAVICEPS PURPUREA · ERGOT', target, plate: 'paper' }, (g) => {
      g.translate(60, -60); g.fillStyle = '#2A1420'; g.fillRect(440, 500, 520, 520);
      for (let i = 0; i < 5; i++) {
        const a = -0.8 + i * 0.4;
        g.save(); g.translate(700 + Math.cos(a) * 60, 900 + Math.sin(a) * 20); g.rotate(a - Math.PI / 2 + 0.2);
        g.beginPath(); g.moveTo(-26, 0); g.quadraticCurveTo(-30, -180, 10, -300 - i * 20); g.quadraticCurveTo(34, -180, 26, 0); g.closePath();
        g.fillStyle = i % 2 ? '#4B2238' : '#3A1E2E'; g.fill(); g.strokeStyle = '#120810'; g.lineWidth = 4; g.stroke();
        g.strokeStyle = 'rgba(255,220,240,0.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-8, -20); g.quadraticCurveTo(-10, -150, 8, -260 - i * 18); g.stroke();
        g.restore();
      }
      g.strokeStyle = L.rgba(P.hcYellow, 0.8); g.lineWidth = 2;
      g.beginPath(); g.arc(700, 760, 200, 0, Math.PI * 2); g.stroke();
    });
    // hallucination: swirling woodcut rings + violet bleed
    if (warp > 0) {
      ctx.save();
      ctx.globalAlpha = 0.55 * warp;
      ctx.strokeStyle = P.hcViolet; ctx.lineWidth = 5;
      for (let k = 0; k < 9; k++) { ctx.beginPath(); for (let a = 0; a < Math.PI * 2; a += 0.05) { const rr = 120 + k * 90 + Math.sin(a * 6 + T * 4 + k) * 22; const xx = 540 + Math.cos(a + T * 0.6) * rr, yy = 960 + Math.sin(a + T * 0.6) * rr * 1.3; if (a === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy); } ctx.closePath(); ctx.stroke(); }
      ctx.restore();
    }
    W.frame(ctx);
  } });
  FILM.scene({ id: 'ergot-fg', draw(ctx) { FILM.wc.porthole(ctx, PH[0], PH[1], PH[2], { ring: true }); } });
})();
