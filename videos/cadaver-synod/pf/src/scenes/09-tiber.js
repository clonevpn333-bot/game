// 09 · tiber · T 21.25–23.0 · from the bridge: the Tiber engraved in ruled moonlit dashes, Rome low on the horizon. The
// shrouded body drops away from us, turning, and splashes on "river" (22.5); the curiosity line becomes the current.
(function () {
  'use strict';
  FILM.scene({ id: 'tiber', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t + FILM.SHIFT;
    const HZ = 860, SPL = 22.5;
    D.sky(ctx, T, { moon: [640, 420], h: HZ + 20 });
    D.moon(ctx, 640, 420, 110, T);
    D.skyline(ctx, T, { base: HZ + 10, h: 90, seed: 7, light: () => 0.18, ink: '#B08070', spacing: 4 });
    D.water(ctx, T, { horizon: HZ + 10, moonX: 640, splash: [540, 1200, (T - SPL) / 1.0] });
    if (T < SPL) {
      const u = L.clamp((T - 21.35) / (SPL - 21.35));
      const x = L.lerp(570, 540, u), y = L.lerp(260, 1200, u * u), s = L.lerp(1.7, 0.5, u), rot = 0.6 + u * 1.8;
      const pts = L.ellipsePts(0, 0, 190, 56, 40).map(([a, b]) => { const ca = Math.cos(rot), sa = Math.sin(rot); return [x + (a * ca - b * sa) * s, y + (a * sa + b * ca) * s]; });
      D.engrave(ctx, pts, { ink: '#F0E8DA', light: (a, b) => L.clamp(0.75 - (b - y) / (90 * s)), angle: rot + 1.3, spacing: 4, seed: 81, outW: 2.4 });
      for (let k = -3; k <= 3; k++) { const a0 = [k * 45, -52], a1 = [k * 45 + 18, 52]; const tf = ([a, b]) => { const ca = Math.cos(rot), sa = Math.sin(rot); return [x + (a * ca - b * sa) * s, y + (a * sa + b * ca) * s]; }; L.inkPath(ctx, [tf(a0), tf(a1)], { width: 2 * s, color: '#000', seed: 82 + k }); }
    }
    const cur = L.clamp((T - 22.55) / 0.45);
    if (cur > 0) FILM.hc.line(ctx, L.smoothPts([[540, 1210], [640, 1300], [500, 1420], [700, 1560], [560, 1720], [760, 1930]], false, 6), { plate: 'blueprint', to: Math.max(0.02, cur), width: 4, seed: 91 });
    // bridge parapet, engraved stone
    D.engrave(ctx, [[-20, 1700], [1100, 1700], [1100, 1940], [-20, 1940]], { ink: '#B8ACA0', light: (x, y) => L.clamp(0.4 - (y - 1700) / 500), angle: 0.05, spacing: 5, seed: 92, smooth: false });
    for (let x = 20; x < 1080; x += 130) D.engrave(ctx, [[x, 1620], [x + 70, 1620], [x + 70, 1720], [x, 1720]], { ink: '#C8BCB0', light: (a) => L.clamp(0.55 - (a - x) / 120), angle: 1.5, spacing: 4.4, seed: 93 + x, smooth: false, cross: false });
    D.mist(ctx, T, { y: HZ + 60, h: 200, a: 0.3, speed: 18 });
    D.grain(ctx, T, 1);
    L.text(ctx, 'THE TIBER', 540, 300, { size: 30, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: C.ivory, alpha: L.clamp((T - 21.4) / 0.25) * 0.85, tracking: '0.4em' });
  } });
})();
