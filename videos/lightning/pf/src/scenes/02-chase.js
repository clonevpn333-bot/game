// 02 · chase · T 3.0–5.5 · SECOND HOOK on the 3.0 hit: a mountain road at dusk-dark, his pickup racing toward camera-left,
// a huge storm cloud bearing down from behind it; bolts walk up the road behind the truck, each one closer (3.5, 4.2, 4.9).
(function () {
  'use strict';
  FILM.scene({ id: 'chase', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t, u = T - 3.0;
    PB.plate(ctx, { seed: 920, color: '#080B18' });
    const hits = [3.5, 4.2, 4.9];
    let fl = 0; hits.forEach((h) => { const d = T - h; if (d >= 0 && d < 0.5) fl = Math.max(fl, Math.exp(-d * 8)); });
    PB.flash(ctx, fl * 0.5, 900, 0);
    PB.ridges(ctx, u * 400, T, { y: 1050 });
    // the road: a perspective band
    D.engrave(ctx, [[-40, 1560], [1120, 1440], [1120, 1640], [-40, 1780]], { ink: '#5A6488', base: '#14182A', light: () => 0.3 + fl * 0.4, angle: 0.08, spacing: 6, seed: 921, smooth: false, outW: 3, cross: false, stip: false });
    for (let k = 0; k < 12; k++) { const x = ((k * 160 - u * 900) % 1920 + 1920) % 1920 - 200; const y = 1660 - x * 0.11; L.inkPath(ctx, [[x, y], [x + 70, y - 8]], { width: 6, color: '#E6D27A', alpha: 0.8, seed: 930 + k, taper: 0 }); }
    // the cloud, catching up from the right
    const cx = L.lerp(1150, 760, L.ease.outCubic(L.clamp(u / 2.5))) + 20 * Math.sin(T * 2);
    PB.storm(ctx, cx, 640, 1500, T, { glow: fl, seed: 2 });
    // the truck, racing left, bouncing
    const tx = 500 + 30 * Math.sin(T * 7), ty = 1640 - 500 * 0.11 + 4 * Math.sin(T * 23);
    PB.truck(ctx, tx, ty, 1.55, { roll: u * 900, flip: true, lights: true });
    // bolts walking up the road behind it
    hits.forEach((h, j) => { const d = T - h; if (d < 0 || d > 0.35) return; const gx = L.lerp(1000, 700, j / 2), gy = 1650 - gx * 0.11; PB.bolt(ctx, [gx + 120, 650], [gx, gy], { seed: 50 + j, k: d < 0.08 ? 1 : Math.max(0, 0.7 - d * 2), w: 8 }); PB.burst(ctx, gx, gy, 220, Math.exp(-d * 6), '200,215,255'); });
    PB.rain(ctx, T, { n: 200, a: 0.35, seed: 3 });
    PB.ambient(ctx, T, { ground: 1720, seed: 2 });
    PB.streaks(ctx, T, { angle: Math.PI, speed: 2600, n: 18, alpha: 0.2 });
  } });
})();
