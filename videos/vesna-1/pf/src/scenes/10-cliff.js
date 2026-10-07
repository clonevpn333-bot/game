// 10 · cliff · T 26.75–30.75 · the certificate under a lamp; DECADES LATER a 2009 newspaper spins in on top (27.3);
// TWO JOURNALISTS: two press cards slide in (28.3); half a beat of silence; on LIE (30.25) the curiosity line slashes the
// certificate and it RIPS into two halves that fall apart, a red ? stamped between them.
(function () {
  'use strict';
  FILM.scene({ id: 'cliff', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 171, color: '#0B0D16' });
    PB.burst(ctx, 540, 980, 900, 0.18, '255,220,160');
    const rip = L.clamp((T - 30.25) / 0.4), re = L.ease.outCubic(rip);
    const cx = 540, cy = 1060;
    // certificate — whole, or two halves torn along a diagonal
    const cut = (side) => { ctx.beginPath(); if (side < 0) { ctx.moveTo(-100, -100); ctx.lineTo(cx + 120, -100); ctx.lineTo(cx - 120, 2100); ctx.lineTo(-100, 2100); } else { ctx.moveTo(cx + 120, -100); ctx.lineTo(1200, -100); ctx.lineTo(1200, 2100); ctx.lineTo(cx - 120, 2100); } ctx.closePath(); };
    for (const side of [-1, 1]) {
      ctx.save(); cut(side); ctx.clip();
      ctx.translate(side * 170 * re, 110 * re * re); ctx.rotate(side * 0.25 * re);
      FILM.pbCert(ctx, L, D, PB, cx, cy, 1);
      ctx.restore();
    }
    // newspaper spins in, lies across the top of the certificate
    const np = L.ease.outCubic(L.clamp((T - 27.25) / 0.35));
    if (np > 0 && rip < 1) {
      ctx.save(); ctx.globalAlpha = 1 - rip; ctx.translate(L.lerp(1400, 600, np), L.lerp(-300, 700, np)); ctx.rotate(L.lerp(3, -0.12, np));
      D.engrave(ctx, L.rectPts(-330, -210, 660, 420, 40), { ink: '#E8E2D2', base: '#CFC6B2', light: () => 0.12, angle: 0.3, spacing: 5, seed: 190, smooth: false, outW: 3, cross: false, stip: false });
      L.text(ctx, 'THE DAILY RECORD · 2009', 0, -170, { size: 22, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#3A3A3A', tracking: '0.2em' });
      L.inkPath(ctx, [[-300, -145], [300, -145]], { width: 2, color: '#1A1A1A', seed: 191, taper: 0 });
      L.text(ctx, 'FLIGHT 367:', 0, -95, { size: 52, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: '#1A1A1A' });
      L.text(ctx, 'NEW DOCUMENTS', 0, -35, { size: 52, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: '#1A1A1A' });
      for (let k = 0; k < 6; k++) L.inkPath(ctx, [[-290 + (k % 2) * 300, 20 + Math.floor(k / 2) * 50], [-30 + (k % 2) * 300, 20 + Math.floor(k / 2) * 50]], { width: 6, color: '#8A8478', seed: 192 + k, taper: 0 });
      ctx.restore();
    }
    // two press cards
    for (let i = 0; i < 2; i++) {
      const p = L.ease.outBack(L.clamp((T - 28.25 - i * 0.2) / 0.25));
      if (p <= 0 || rip >= 1) continue;
      ctx.save(); ctx.globalAlpha = 1 - rip; ctx.translate(L.lerp(i ? 1300 : -220, i ? 820 : 260, p), 1560); ctx.rotate(i ? 0.1 : -0.1);
      D.engrave(ctx, L.rectPts(-150, -90, 300, 180, 30), { ink: '#F2E8D0', base: '#D0C4A6', light: () => 0.15, spacing: 4, seed: 200 + i, smooth: false, outW: 3, cross: false, stip: false });
      ctx.fillStyle = '#C8321E'; ctx.fillRect(-142, -82, 284, 50);
      L.text(ctx, 'PRESS', 0, -56, { size: 34, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: '#F2E8D0', tracking: '0.2em' });
      L.inkCircle(ctx, -90, 30, 38, { width: 2, color: '#1A1206', fill: '#4A4A5A', seed: 205 + i });
      for (let k = 0; k < 3; k++) L.inkPath(ctx, [[-30, 0 + k * 26], [120, 0 + k * 26]], { width: 5, color: '#6A604C', seed: 206 + k + i * 3, taper: 0 });
      ctx.restore();
    }
    // the slash (the curiosity line) + red ?
    if (T > 30.2) {
      const sl = L.clamp((T - 30.2) / 0.08);
      PB.beam(ctx, [cx + 400, 300], [L.lerp(cx + 400, cx - 400, sl), L.lerp(300, 1820, sl)], { T, w: 7, dots: false, k: 1 - rip * 0.7 });
      const q = L.clamp((T - 30.32) / 0.08);
      if (q > 0) { ctx.save(); ctx.translate(cx, cy + 40); const s2 = 1 + 0.7 * (1 - L.ease.outCubic(q)); ctx.scale(s2, s2); L.text(ctx, '?', 0, 0, { size: 300, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: PB.RED }); ctx.restore(); }
    }
  } });
})();
