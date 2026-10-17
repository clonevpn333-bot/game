// 03 · ranger · T 5.5–9.75 · Roy, close, under his campaign hat, slowly turning; Blue Ridge layers drift behind (parallax);
// name card stamps (6.4); from LIGHTNING (7.62) small bolts snap down all around him on the beats — it found him everywhere.
(function () {
  'use strict';
  FILM.scene({ id: 'ranger', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t, u = T - 5.5;
    PB.plate(ctx, { seed: 930, color: '#0A1020' });
    const hits = [7.62, 8.0, 8.32, 8.57, 9.0, 9.3];
    let fl = 0; hits.forEach((h) => { const d = T - h; if (d >= 0 && d < 0.4) fl = Math.max(fl, Math.exp(-d * 9)); });
    PB.flash(ctx, fl * 0.4, 540, 0);
    PB.ridges(ctx, u * 120, T, { y: 1250 });
    PB.motes(ctx, T, { n: 50, seed: 5, vy: 30, vx: -20, alpha: 0.4, col: '200,212,236' });
    const z = 1 + 0.05 * u;
    ctx.save(); ctx.translate(540, 1200); ctx.scale(z, z); ctx.translate(-540, -1200);
    PB.head(ctx, 540, 1200, 760, { yaw: 0.7 - 0.35 * L.ease.inOutSine(L.clamp(u / 4)), hat: true, key: [-0.4, 0.5, 0.8], rim: [0.6, 0.6, -0.4], res: 0.32, slot: 3, warm: [1 + 0.2 * fl, 1 + 0.15 * fl, 1 + 0.3 * fl] });
    ctx.restore();
    // small strikes all around him
    hits.forEach((h, j) => { const d = T - h; if (d < 0 || d > 0.3) return; const gx = [120, 960, 200, 880, 80, 1000][j], gy = [1500, 1450, 900, 950, 1250, 1300][j]; PB.bolt(ctx, [gx + (j % 2 ? -60 : 60), -60], [gx, gy], { seed: 70 + j, k: d < 0.06 ? 1 : Math.max(0, 0.6 - d * 2), w: 5, branches: 2 }); PB.burst(ctx, gx, gy, 160, Math.exp(-d * 8), '200,215,255'); });
    // name card
    const nc = L.clamp((T - 6.4) / 0.12);
    if (nc > 0) { PB.label(ctx, 'ROY SULLIVAN', 90, 1350, nc, { size: 36 }); PB.label(ctx, 'PARK RANGER · VIRGINIA', 90, 1420, (T - 6.55) / 0.12, { size: 26, col: PB.IV }); }
    PB.rain(ctx, T, { n: 120, a: 0.25 });
  } });
})();
