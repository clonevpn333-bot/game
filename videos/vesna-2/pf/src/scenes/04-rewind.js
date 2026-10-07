// 04 · rewind · T 9.75–15.0 · the scale from Part 1: Everest beside her 33,330 ft fall line. IF THEY'RE RIGHT —
// 11.93 the 33,000 FT label is struck out; the line drains down to a stub of a few hundred metres (~2,600 ft, 13.1–14.4)
// next to the mountain; the drop is tiny now.
(function () {
  'use strict';
  const G = 1760, TOP = 600;
  const Y = (ft) => G - (ft / 33330) * (G - TOP);
  FILM.scene({ id: 'rewind', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 231, color: '#0A1024' });
    PB.grid(ctx, 0.06, 60);
    const ev = [[-40, G], [80, Y(14000)], [190, Y(22000)], [260, Y(26500)], [330, Y(29032)], [400, Y(26000)], [470, Y(23500)], [560, Y(15000)], [700, G]];
    D.engrave(ctx, ev, { ink: '#C8D2EC', base: '#1A2440', light: (x, y) => L.clamp(0.25 + 0.5 * (330 - x) / 400 + 0.2 * (1 - (y - TOP) / 1100)), angle: -0.8, spacing: 4.5, seed: 170, smooth: false, outW: 4 });
    L.inkPath(ctx, [[330, Y(29032)], [300, Y(25000)], [320, Y(21000)], [270, Y(16000)]], { width: 4, color: '#F2F0EA', alpha: 0.85, seed: 171 });
    L.inkPath(ctx, [[0, G], [1080, G]], { width: 4, color: PB.IV, seed: 172, taper: 0 });
    PB.label(ctx, 'EVEREST · 29,032 FT', 60, Y(29032) - 50, 1, { col: PB.IV, size: 24 });
    // her fall line: full, then draining to ~2,600 ft
    const drain = L.ease.inOutCubic(L.clamp((T - 13.1) / 1.3));
    const ft = L.lerp(33330, 2600, drain), fx = 800, ty = Y(ft);
    PB.beam(ctx, [fx, G], [fx, ty], { T, w: 6, speed: 2600 });
    PB.burst(ctx, fx, ty, 120, 0.8);
    // the old top, ghosted
    if (drain > 0) { L.inkPath(ctx, [[fx, TOP], [fx, ty]], { width: 2, color: PB.Y, alpha: 0.25, seed: 300, taper: 0 }); }
    L.inkPath(ctx, [[fx - 140, TOP], [fx + 60, TOP]], { width: 3, color: PB.Y, alpha: 1 - drain * 0.7, seed: 301, taper: 0 });
    PB.label(ctx, '33,330 FT', 640, TOP - 60, 1, { size: 26, col: drain > 0 ? '#8A7A40' : PB.Y });
    const st = L.clamp((T - 11.93) / 0.08);
    if (st > 0) L.inkPath(ctx, [[620, TOP - 60], [L.lerp(620, 900, st), TOP - 60]], { width: 10, color: PB.RED, seed: 302, taper: 0 });
    if (drain > 0.6) { L.inkPath(ctx, [[fx - 120, ty], [fx + 60, ty]], { width: 3, color: '#FF7A5A', seed: 303, taper: 0 }); L.inkPath(ctx, [[fx + 30, ty], [fx + 80, 1440]], { width: 2.5, color: '#FF7A5A', seed: 304 }); PB.label(ctx, '~800 M?', 820, 1410, (T - 13.9) / 0.15, { size: 30, col: '#FF7A5A' }); }
  } });
})();
