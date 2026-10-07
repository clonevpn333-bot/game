// 08 · memory · T 24.25–27.5 · a filmstrip of her memory runs right to left behind her profile: the first frame lit —
// COPENHAGEN, boarding (her last memory) — then every frame after it goes dark; on THE FALL (27.0) an empty frame.
(function () {
  'use strict';
  FILM.scene({ id: 'memory', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 271, color: '#0A0C14' });
    // filmstrip band
    const y = 1330, H = 290, off = (T - 24.25) * 260;
    ctx.fillStyle = '#14161E'; ctx.fillRect(0, y - H / 2 - 40, 1080, H + 80);
    for (let k = -2; k < 30; k++) { const x = (k * 60 - off % 60); ctx.fillStyle = '#05060A'; ctx.fillRect(x, y - H / 2 - 30, 30, 20); ctx.fillRect(x, y + H / 2 + 10, 30, 20); }
    for (let i = 0; i < 6; i++) {
      const fx = 120 + i * 380 - off;
      if (fx < -400 || fx > 1400) continue;
      ctx.fillStyle = '#05060A'; ctx.fillRect(fx, y - H / 2, 340, H);
      if (i === 0) {
        // the last memory: a lit cabin aisle (engraved) — boarding in Copenhagen
        const lit = (a, b) => 0.5;
        ctx.save(); ctx.beginPath(); ctx.rect(fx, y - H / 2, 340, H); ctx.clip();
        D.engrave(ctx, [[fx, y + H / 2], [fx + 120, y - 40], [fx + 220, y - 40], [fx + 340, y + H / 2]], { ink: '#F2E8D0', base: '#6A5A40', light: lit, angle: 1.2, spacing: 4, seed: 380, smooth: false, outW: 2, cross: false, stip: false });
        for (let k = 0; k < 4; k++) { D.engrave(ctx, L.rectPts(fx + 20 + k * 22, y - 20 + k * 30, 40, 50, 20), { ink: '#3A5AA8', base: '#1A2440', light: () => 0.5, spacing: 3, seed: 381 + k, smooth: false, outW: 1.5, cross: false, stip: false }); D.engrave(ctx, L.rectPts(fx + 280 - k * 22, y - 20 + k * 30, 40, 50, 20), { ink: '#3A5AA8', base: '#1A2440', light: () => 0.5, spacing: 3, seed: 385 + k, smooth: false, outW: 1.5, cross: false, stip: false }); }
        PB.burst(ctx, fx + 170, y - 60, 160, 0.5, '255,230,180');
        ctx.restore();
        PB.label(ctx, 'LAST MEMORY: COPENHAGEN', fx, y - H / 2 - 80, (T - 24.4) / 0.15, { size: 22 });
      } else {
        const dk = L.clamp((T - 24.9 - i * 0.18) / 0.2);
        ctx.fillStyle = `rgba(80,90,120,${0.4 * (1 - dk)})`; ctx.fillRect(fx, y - H / 2, 340, H);
        L.text(ctx, '?', fx + 170, y, { size: 120, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: '#3A4058', alpha: dk });
      }
      L.inkPath(ctx, L.rectPts(fx, y - H / 2, 340, H, 40), { closed: true, width: 3, color: '#2A2E3A', seed: 390 + i });
    }
    // the curiosity line runs along the strip and stops at the last memory
    PB.beam(ctx, [0, y + H / 2 + 50], [Math.max(10, 460 - off), y + H / 2 + 50], { T, w: 3, dots: false, k: 0.8 });
    // her profile above, eyes closed in the dark
    PB.fem(ctx, 540, 770, 600, { win: [-1.9, 1.9, -1.55, 1.4], yaw: 1.25, key: [0.3, 0.5, 0.8], rim: [-0.9, 0.3, -0.3], res: 0.36, slot: 19 });
  } });
})();
