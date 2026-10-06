// 01 · hook · T 0–3.0 · three hard cuts, the whole fact on screen at once.
//   A 0–1.0  extreme close-up on the iron mask's eye slits, torch flicker: FRANCE HID / THIS MAN'S FACE
//   B 1.0–1.9 a candle in the dark as the cell door slams across the frame (1.25): FOR 34 YEARS (1.87 lands)
//   C 1.9–3.0 the bust in torchlight, pulling back; the keyhole transition opens from his left eye slit at 3.0
(function () {
  'use strict';
  function wall(ctx, L, lit, seed) {
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.12, spacing: 6.5, width: 1.1, color: '#A8A0B0', alpha: 0.8, seed, density: (x, y) => lit(x, y) * 0.7, length: [30, 120] });
    for (let row = 0, y = 40; y < 1920; y += 112, row++) { L.inkPath(ctx, [[-10, y], [1090, y + 6]], { width: 3, color: '#000', seed: 200 + row, taper: 0 }); for (let x = (row % 2) * 120 - 60; x < 1080; x += 240) L.inkPath(ctx, [[x, y], [x + 4, y + 112]], { width: 2.6, color: '#000', seed: 300 + row * 9 + x, taper: 0 }); }
  }
  FILM.scene({ id: 'hook', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const flick = 0.85 + 0.15 * L.noise1(T * 7, 3);
    D.plate(ctx);
    if (T < 1.0) {
      const lit = D.lights([{ x: 160, y: 1200, r: 1500, k: 0.6 * flick }], 0.04);
      wall(ctx, L, lit, 11);
      const z = 1 + 0.05 * T;
      ctx.save(); ctx.translate(540, 960); ctx.scale(z, z); ctx.translate(-540, -960);
      D.bust(ctx, 540, 1100, 1900, { yaw: -0.12, pitch: 0.04, key: [-0.85, 0.35, 0.4], glint: 1, res: 0.15, slot: 1 });
      ctx.restore();
    } else if (T < 1.9) {
      const lit = D.lights([{ x: 540, y: 1150, r: 1100, k: 0.75 * flick }], 0.04);
      wall(ctx, L, lit, 12);
      D.candle(ctx, 540, 1250, 2.2, T, { seed: 4, h: 360 });
      // the cell door slams across the frame
      const sw = L.ease.inQuad(L.clamp((T - 1.0) / 0.25));
      const x1 = L.lerp(-700, 1080, sw);
      if (sw > 0) {
        const door = [[-20, 0], [x1, 0], [x1, 1920], [-20, 1920]];
        D.engrave(ctx, door, { ink: C.wood, light: (x, y) => lit(x, y) * 0.9 + 0.1, angle: 1.57, spacing: 4.6, seed: 31, smooth: false, outW: 5 });
        for (let k = 0; k < 4; k++) { const y0 = 260 + k * 420; D.engrave(ctx, [[-20, y0], [x1, y0], [x1, y0 + 52], [-20, y0 + 52]], { ink: '#B8BCC8', base: '#141218', light: lit, angle: 0.05, spacing: 3.6, seed: 40 + k, smooth: false, outW: 2.4 }); }
        // a small barred window in the door: the candle still glows through it
        if (sw >= 1) { ctx.fillStyle = '#000'; ctx.fillRect(390, 760, 300, 360); D.glow(ctx, 540, 940, 260, C.candle, 0.7 * flick); for (let k = 0; k < 4; k++) L.inkPath(ctx, [[420 + k * 80, 760], [422 + k * 80, 1120]], { width: 14, color: '#141218', seed: 50 + k, taper: 0 }); }
      }
      const d = T - 1.25; if (d > 0 && d < 0.25) { ctx.fillStyle = `rgba(255,240,210,${0.25 * (1 - d / 0.25)})`; ctx.fillRect(0, 0, 1080, 1920); }
    } else {
      const lit = D.lights([{ x: 150, y: 1350, r: 1300, k: 0.6 * flick }, { x: 980, y: 500, r: 700, k: 0.18 }], 0.03);
      wall(ctx, L, lit, 13);
      D.glow(ctx, 160, 1300, 900, C.candle, 0.45 * flick);
      const pull = L.ease.outCubic(L.clamp((T - 1.9) / 1.1));
      D.bust(ctx, 540, L.lerp(1000, 900, pull), L.lerp(1150, 800, pull), { yaw: -0.3 + 0.15 * pull, pitch: 0.06, key: [-0.7, 0.2, 0.65], glint: 0.7 + 0.3 * Math.abs(Math.sin(T * 1.7)), res: 0.34, slot: 2 });
      D.candle(ctx, 150, 1600, 1.3, T, { seed: 3, h: 300 });
    }
    D.mist(ctx, T, { y: 1760, h: 400, a: 0.3, speed: 30 });
    D.grain(ctx, T, 1);
    D.word(ctx, 'FRANCE HID', 540, 160, 104, T / 0.1, { under: false, seed: 4 });
    D.word(ctx, "THIS MAN'S FACE", 540, 300, 104, (T - 0.12) / 0.12, { seed: 5 });
    D.word(ctx, 'FOR 34 YEARS', 540, 450, 118, (T - 0.3) / 0.14, { color: C.yellow, seed: 6 });
  } });
})();
