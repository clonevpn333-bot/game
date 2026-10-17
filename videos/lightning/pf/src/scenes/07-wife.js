// 07 · wife · T 23.75–26.5 · their back yard, wind: sheets flapping on the line, his wife pinning one up; STRUCK (25.25):
// the bolt hits the line, the sheets flare white. In-world: HIS WIFE · STRUCK TOO.
(function () {
  'use strict';
  function sheet(ctx, L, D, x, y, w, h, T, seed, lit) {
    const pts = []; for (let k = 0; k <= 8; k++) pts.push([x + (k / 8) * w, y + 8 * Math.sin(T * 6 + k + seed)]);
    for (let k = 8; k >= 0; k--) pts.push([x + (k / 8) * w + 24 * Math.sin(T * 5 + k * 0.7 + seed), y + h + 14 * Math.sin(T * 7 + k + seed)]);
    D.engrave(ctx, pts, { ink: '#F2E8D0', base: '#8A8478', light: () => lit, angle: 1.5, spacing: 4, seed, smooth: false, outW: 2.5, cross: false, stip: false });
  }
  FILM.scene({ id: 'wife', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t, d = T - 25.25;
    const fk = d >= 0 && d < 0.6 ? Math.exp(-d * 6) : 0;
    PB.plate(ctx, { seed: 970, color: '#0A0E1A' });
    PB.flash(ctx, fk * 0.6, 700, 0);
    PB.storm(ctx, 540, 380, 1300, T, { glow: fk, seed: 7 });
    PB.ridges(ctx, 200 + (T - 23.75) * 60, T, { y: 1200 });
    D.engrave(ctx, [[-40, 1400], [1120, 1400], [1120, 1960], [-40, 1960]], { ink: '#3A4A3A', base: '#0A100A', light: () => 0.2 + fk * 0.3, angle: 0.1, spacing: 6, seed: 971, smooth: false, outW: 2, cross: false, stip: false });
    // posts + line
    for (const px of [120, 960]) L.inkPath(ctx, [[px, 1420], [px, 960]], { width: 14, color: '#2A1A10', seed: 972 + px, taper: 0 });
    L.inkPath(ctx, [[120, 980], [540, 1010], [960, 980]], { width: 3, color: '#C9D1E6', seed: 974 });
    const lit = 0.35 + 0.6 * fk;
    sheet(ctx, L, D, 170, 1000, 190, 260, T, 1, lit); sheet(ctx, L, D, 400, 1012, 170, 220, T, 2, lit); sheet(ctx, L, D, 720, 1000, 200, 250, T, 3, lit);
    // his wife: an engraved silhouette in a dress, arms up pinning a sheet
    const wx = 640, wy = 1500, s = 1.45, P = (x, y) => [wx + x * s, wy + y * s];
    D.engrave(ctx, [P(-50, 0), P(-30, -150), P(-20, -210), P(20, -210), P(30, -150), P(50, 0)], { ink: '#7A6A8A', base: '#0A0C14', light: () => 0.35 + fk * 0.5, angle: 1.2, spacing: 3, seed: 980, smooth: false, outW: 2, cross: false, stip: false });
    L.inkCircle(ctx, wx, wy - 232 * s, 18 * s, { width: 2, color: '#000', fill: '#2A2420', seed: 981 });
    L.inkPath(ctx, [P(-14, -205), P(-34, -300), P(-44, -390)], { width: 10, color: '#0A0C14', seed: 982, taper: 0 }); L.inkPath(ctx, [P(14, -205), P(40, -300), P(56, -392)], { width: 10, color: '#0A0C14', seed: 983, taper: 0 });
    if (d >= 0 && d < 0.4) { PB.bolt(ctx, [820, 300], [wx + 30, 1000], { seed: 120, k: d < 0.08 ? 1 : Math.max(0, 0.7 - d * 2), w: 10, branches: 5 }); PB.burst(ctx, wx + 30, 1000, 360, Math.exp(-d * 6), '210,225,255'); }
    if (d >= 0.05) PB.label(ctx, 'HIS WIFE · STRUCK TOO', 80, 1350, (d - 0.05) / 0.1, { size: 30 });
    PB.rain(ctx, T, { n: 140, a: 0.3, seed: 8 });
    PB.motes(ctx, T, { n: 30, seed: 9, vx: 160, vy: 20, alpha: 0.5, col: '200,220,180', size: 3 });
  } });
})();
