// 01 · hook · T 0–2.5 · frame 1 picks up where Part 1 ended: the record certificate torn in two, the curiosity line
// slicing through it, a red ? between the halves (HER RECORD FALL / MIGHT NEVER HAVE HAPPENED).
// 1.2: the altimeter reading 33,330 FT glitches and is struck out in red (1.75).
(function () {
  'use strict';
  FILM.scene({ id: 'hook', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 201, color: '#0B0D16' });
    PB.burst(ctx, 540, 1100, 900, 0.18, '255,220,160');
    if (T < 1.2) {
      const re = 0.55 + 0.45 * L.ease.outCubic(L.clamp(T / 0.4)), cx = 540, cy = 1150, z = 1 + 0.05 * T;
      ctx.save(); ctx.translate(540, 1150); ctx.scale(z, z); ctx.translate(-540, -1150);
      const cut = (side) => { ctx.beginPath(); if (side < 0) { ctx.moveTo(-100, -100); ctx.lineTo(cx + 120, -100); ctx.lineTo(cx - 120, 2100); ctx.lineTo(-100, 2100); } else { ctx.moveTo(cx + 120, -100); ctx.lineTo(1200, -100); ctx.lineTo(1200, 2100); ctx.lineTo(cx - 120, 2100); } ctx.closePath(); };
      for (const side of [-1, 1]) { ctx.save(); cut(side); ctx.clip(); ctx.translate(side * 150 * re, 60 * re); ctx.rotate(side * 0.22 * re); FILM.pbCert(ctx, L, D, PB, cx, cy, 1); ctx.restore(); }
      PB.beam(ctx, [cx + 420, 520], [cx - 420, 1800], { T, w: 7, dots: true, k: 1 });
      L.text(ctx, '?', cx, cy + 40, { size: 300, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: PB.RED });
      ctx.restore();
      return;
    }
    // the altimeter: 33,330 glitches, then is struck out
    const gl = T < 1.6 ? Math.floor(T * 24) % 3 : 0;
    PB.grid(ctx, 0.06, 60);
    ctx.save(); if (gl) ctx.translate((gl - 1) * 14, 0);
    PB.alt(ctx, 540, 1080, gl === 2 ? 3330 : 33330, { s: 2.2 });
    ctx.restore();
    const st = L.clamp((T - 1.75) / 0.1);
    if (st > 0) { L.inkPath(ctx, [[150, 1180], [L.lerp(150, 930, st), L.lerp(1180, 980, st)]], { width: 18, color: PB.RED, seed: 210, taper: 0 }); L.inkPath(ctx, [[150, 980], [L.lerp(150, 930, st), L.lerp(980, 1180, st)]], { width: 18, color: PB.RED, seed: 211, taper: 0 }); }
    for (let k = 0; k < 4; k++) if (gl) { ctx.fillStyle = 'rgba(242,232,208,0.12)'; ctx.fillRect(0, 300 + k * 380 + gl * 40, 1080, 10); }
  } });
})();
