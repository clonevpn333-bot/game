// 10 · uprising · T 23.0–25.25 · "Rome was horrified": a torch-lit crowd fills the street and marches at the camera,
// rows walking in 3D perspective, embers rising.
(function () {
  'use strict';
  FILM.scene({ id: 'uprising', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    D.rome(ctx, T, { px: 0, moon: [820, 360], moonR: 120 });
    ctx.fillStyle = 'rgba(5,3,5,0.55)'; ctx.fillRect(0, 0, 1080, 1920);
    D.glow(ctx, 540, 1150, 1000, '#E06A20', 0.75); D.glow(ctx, 540, 1100, 500, '#FFB040', 0.5);
    // crowd rows: z from far to near, advancing
    const r = L.rng(L.hash('crowd'));
    const rows = [];
    for (let row = 0; row < 6; row++) for (let i = 0; i < 4 + row; i++) rows.push([row, (i + 0.5 + (r() - 0.5) * 0.5) / (4 + row), r() * 6, r()]);
    rows.sort((a, b) => b[0] - a[0]);
    for (const [row, u, ph0, k] of rows) {
      const z = 1.3 + row * 0.8 - t * 0.45;
      if (z < 0.8) continue;
      const s = 1.05 / z, x = 540 + (u - 0.5) * 1700 / z, y = 1020 + 900 / z;
      const tips = D.figure(ctx, x, y, s, T, { pose: 'torch', ph: T * 6 + ph0, hat: k < 0.5 ? 'hood' : 'cap', rim: C.candle, rimA: 1.2 });
      if (tips.torch) D.torch(ctx, tips.torch[0], tips.torch[1], s * 1.6, T, Math.floor(ph0 * 10));
    }
    // embers
    const er = L.rng(L.hash('embers'));
    for (let i = 0; i < 70; i++) { const x = er() * 1080, sp = 120 + er() * 220, y = 1900 - ((er() * 1900 + T * sp) % 1900); D.glow(ctx, x + Math.sin(T * 2 + i) * 20, y, 10, C.ember, 0.9); }
    D.fog(ctx, T, { y: 1500, h: 500, a: 0.25, speed: 40 });
    D.grain(ctx, T, 1);
  } });
})();
