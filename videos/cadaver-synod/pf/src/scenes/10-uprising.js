// 10 · uprising · T 23.0–25.25 · "Rome was horrified": an engraved street between leaning houses; a crowd of hooded
// torch-bearers marches at the camera in 3D rows, every figure lit by its neighbours' torches; embers rise.
(function () {
  'use strict';
  FILM.scene({ id: 'uprising', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t + FILM.SHIFT;
    D.sky(ctx, T, { moon: [820, 330], h: 1200 });
    D.moon(ctx, 820, 330, 80, T);
    const r = L.rng(L.hash('crowd'));
    const rows = [];
    for (let row = 0; row < 6; row++) for (let i = 0; i < 4 + row; i++) rows.push([row, (i + 0.5 + (r() - 0.5) * 0.5) / (4 + row), r() * 6, r()]);
    const torches = [];
    rows.forEach(([row, u, ph0]) => { const z = 1.3 + row * 0.8 - t * 0.45; if (z >= 0.8) torches.push({ x: 540 + (u - 0.5) * 1700 / z, y: 1020 + 900 / z - 560 * 1.05 / z, r: 520 / z, k: 0.5 }); });
    const lit = D.lights(torches.concat([{ x: 540, y: 1100, r: 900, k: 0.3 }]), 0.04);
    // houses either side (engraved, lit by the torches)
    for (const side of [-1, 1]) for (let k = 3; k >= 0; k--) {
      const s = Math.pow(0.72, k), x0 = side < 0 ? lerpX(-40, 360, 1 - s) : lerpX(1120, 720, 1 - s), w = 300 * s * side, base = 1020 + 700 * s, top = base - 900 * s;
      D.engrave(ctx, [[x0, base], [x0, top], [x0 + w * 0.5, top - 140 * s], [x0 + w, top], [x0 + w, base]], { ink: '#BFAE9E', light: (a, b) => lit(a, b) * 0.85, angle: 1.45, spacing: 5, seed: 1800 + k * 3 + (side > 0 ? 1 : 0), smooth: false });
      for (let wv = 0; wv < 3; wv++) { const wx = x0 + w * (0.25 + wv * 0.25), wy = top + 120 * s; ctx.fillStyle = L.rgba(C.candle, 0.6); ctx.fillRect(Math.min(wx, wx + 16 * s * side), wy, 16 * s, 26 * s); }
    }
    function lerpX(a, b, u) { return a + (b - a) * u; }
    D.engrave(ctx, [[-20, 1200], [1100, 1200], [1100, 1940], [-20, 1940]], { ink: '#9A8C7E', light: (a, b) => lit(a, b) * 0.7, angle: 0.05, spacing: 5, seed: 1850, smooth: false, outline: false });
    rows.sort((a, b) => b[0] - a[0]);
    for (const [row, u, ph0, k] of rows) {
      const z = 1.3 + row * 0.8 - t * 0.45;
      if (z < 0.8) continue;
      const s = 1.05 / z, x = 540 + (u - 0.5) * 1700 / z, y = 1020 + 900 / z;
      const tips = D.figure(ctx, x, y, s, T, { pose: 'torch', ph: T * 6 + ph0, hat: k < 0.5 ? 'hood' : 'cap', light: lit, seed: 1900 + row * 20 + Math.floor(u * 10) });
      if (tips.torch) D.torch(ctx, tips.torch[0], tips.torch[1], s * 1.4, T, Math.floor(ph0 * 10));
    }
    D.embers(ctx, T, { n: 60 });
    D.mist(ctx, T, { y: 1600, h: 400, a: 0.25, speed: 40 });
    D.grain(ctx, T, 1);
  } });
})();
