// 09 · outro · T 27.5–34 · the torn certificate halves slide back together (27.5–28.3): OFFICIALLY, SHE STILL HOLDS THE
// RECORD. At 30.0 the question splits the frame — two engraved options either side of the curiosity line:
// A BOMB AT 33,000 FT vs SHOT DOWN LOW — and the line writes WHY WE WONDER small at the bottom.
(function () {
  'use strict';
  FILM.scene({ id: 'outro', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    ctx.fillStyle = '#04060B'; ctx.fillRect(0, 0, 1080, 1920);
    const v = ctx.createRadialGradient(540, 900, 20, 540, 900, 900); v.addColorStop(0, 'rgba(26,34,60,0.9)'); v.addColorStop(1, 'rgba(4,6,11,0)'); ctx.fillStyle = v; ctx.fillRect(0, 0, 1080, 1920);
    const join = L.ease.inOutCubic(L.clamp((T - 27.5) / 0.8)), re = 1 - join;
    const q = L.clamp((T - 29.9) / 0.3);
    const cy = L.lerp(800, 560, q), cs = L.lerp(1, 0.62, q), cx = 540;
    const cut = (side) => { ctx.beginPath(); if (side < 0) { ctx.moveTo(-100, -100); ctx.lineTo(cx + 120, -100); ctx.lineTo(cx - 120, 2100); ctx.lineTo(-100, 2100); } else { ctx.moveTo(cx + 120, -100); ctx.lineTo(1200, -100); ctx.lineTo(1200, 2100); ctx.lineTo(cx - 120, 2100); } ctx.closePath(); };
    ctx.save(); ctx.translate(cx, cy); ctx.scale(cs, cs); ctx.translate(-cx, -cy);
    for (const side of [-1, 1]) { ctx.save(); cut(side); ctx.clip(); ctx.translate(side * 170 * re, 40 * re); ctx.rotate(side * 0.22 * re); FILM.pbCert(ctx, L, D, PB, cx, cy, 1); ctx.restore(); }
    if (join >= 1) PB.burst(ctx, cx, cy, 500, 0.2 * (1 - q));
    ctx.restore();
    // the question: two options either side of the line
    if (q > 0) {
      PB.beam(ctx, [540, 860], [540, L.lerp(860, 1480, q)], { T, w: 4, dots: false });
      const opt = (x, title, sub, col, d) => { const p = L.ease.outBack(L.clamp((T - 30.2 - d) / 0.25)); if (p <= 0) return; ctx.save(); ctx.translate(x, 1180); ctx.scale(p, p); D.engrave(ctx, L.rrectPts(-220, -150, 440, 300, 20), { ink: col, base: '#141A2C', light: () => 0.25, angle: 0.6, spacing: 5, seed: 400 + x, smooth: false, outW: 3, cross: false, stip: false }); L.text(ctx, title, 0, -40, { size: 52, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: col }); L.text(ctx, sub, 0, 40, { size: 26, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#C9D1E6', tracking: '0.12em' }); ctx.restore(); };
      opt(275, 'A BOMB', '33,000 FT FALL', '#F2C230', 0);
      opt(805, 'SHOT DOWN', '~800 M FALL', '#FF7A5A', 0.15);
    }
    const wa = L.clamp((T - 31.6) / 0.6);
    if (wa > 0) { L.text(ctx, 'WHY WE WONDER', 540, 1490, { size: 34, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: PB.Y, alpha: wa, tracking: '0.4em' }); PB.beam(ctx, [200, 1525], [L.lerp(200, 880, wa), 1525], { T, w: 3, dots: false, k: 0.9 }); }
    const f = L.clamp((T - 33.6) / 0.4); if (f > 0) { ctx.fillStyle = `rgba(4,6,11,${0.85 * f})`; ctx.fillRect(0, 0, 1080, 1920); }
  } });
})();
