// 07 · dose · T 15.5–17.0 · the beam stands upright as a bar that shoots off the chart; the camera chases it up an
// unlabeled scale (no misleading dose comparison — THE DOSE WAS / ENORMOUS. is the kinetic layer). At 16.5 it thins
// into one vertical line down the middle (→ the line that splits his face).
(function () {
  'use strict';
  const BASE = 1440;
  FILM.scene({ id: 'dose', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 71 });
    const grow = L.ease.inCubic(L.clamp((T - 15.55) / 0.6));
    const h = 3600 * grow;
    const cam = 1400 * L.ease.inOutCubic(L.clamp((T - 15.75) / 0.6));
    const thin = L.ease.inOutCubic(L.clamp((T - 16.5) / 0.45));
    const fade = 1 - thin;
    PB.grid(ctx, 0.08 * fade, 60, 0, cam);
    ctx.save(); ctx.translate(0, cam);
    ctx.globalAlpha = fade;
    for (let k = 0; k < 100; k++) {
      const y = BASE - k * 40; if (y + cam < -40 || y + cam > 1960) continue;
      L.inkPath(ctx, [[70, y], [k % 5 ? 96 : 140, y]], { width: k % 5 ? 2 : 4, color: '#8EA0C8', seed: 700 + k, taper: 0 });
    }
    L.inkPath(ctx, [[80, BASE + 10], [80, BASE - 4200]], { width: 3, color: '#8EA0C8', seed: 790, taper: 0 });
    L.inkPath(ctx, [[60, BASE], [1020, BASE]], { width: 4, color: PB.IV, seed: 791, taper: 0 });
    ctx.globalAlpha = 1;
    const bx = L.lerp(880, 540, thin), bw = L.lerp(150, 6, thin);
    if (grow > 0) {
      const top = BASE - h;
      ctx.globalAlpha = fade;
      D.engrave(ctx, L.rectPts(bx - bw / 2, top, bw, h, 40), { ink: '#FFE7A0', base: '#6A4A08', light: () => 0.7, angle: 0.8, spacing: 4.5, seed: 793, smooth: false, outW: 3, cross: false, stip: false });
      ctx.globalAlpha = 1;
      PB.beam(ctx, [bx, BASE + (thin ? 900 : 0)], [bx, top - (thin ? 3000 : 0)], { T, w: L.lerp(9, 5, thin), k: L.lerp(0.6, 1, thin), speed: -2600 });
      PB.burst(ctx, bx, top, 340, 0.8 * fade);
    }
    ctx.restore();
  } });
})();
