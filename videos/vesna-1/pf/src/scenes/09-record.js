// 09 · record · T 23.0–26.75 · the fall line stands up as a scale beside Mount Everest (29,032 ft) — her fall (33,330 ft)
// is taller; the camera rises from the ground to her point of fall; the WORLD RECORD certificate stamps (24.0).
(function () {
  'use strict';
  const G = 1760, TOP = 600;                 // ground y, 33,330 ft y
  const Y = (ft) => G - (ft / 33330) * (G - TOP);
  FILM.scene({ id: 'record', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 161, color: '#0A1024' });
    PB.grid(ctx, 0.06, 60);
    // Everest: an engraved massif with snow ridges
    const ev = [[-40, G], [80, Y(14000)], [190, Y(22000)], [260, Y(26500)], [330, Y(29032)], [400, Y(26000)], [470, Y(23500)], [560, Y(15000)], [700, G]];
    D.engrave(ctx, ev, { ink: '#C8D2EC', base: '#1A2440', light: (x, y) => L.clamp(0.25 + 0.5 * (330 - x) / 400 + 0.2 * (1 - (y - TOP) / 1400)), angle: -0.8, spacing: 4.5, seed: 170, smooth: false, outW: 4 });
    L.inkPath(ctx, [[330, Y(29032)], [300, Y(25000)], [320, Y(21000)], [270, Y(16000)]], { width: 4, color: '#F2F0EA', alpha: 0.85, seed: 171 });
    L.inkPath(ctx, [[0, G], [1080, G]], { width: 4, color: PB.IV, seed: 172, taper: 0 });
    L.inkPath(ctx, [[150, Y(29032)], [520, Y(29032)]], { width: 2, color: PB.IV, alpha: 0.6, seed: 173, taper: 0 });
    PB.label(ctx, 'EVEREST · 29,032 FT', 60, Y(29032) - 50, (T - 23.15) / 0.15, { col: PB.IV, size: 24 });
    // her fall line, drawn up from the ground
    const up = L.ease.outCubic(L.clamp((T - 23.05) / 0.7));
    const fx = 800, ty = L.lerp(G, TOP, up);
    PB.beam(ctx, [fx, G], [fx, ty], { T, w: 6, speed: 2600 });
    PB.burst(ctx, fx, ty, 120, 0.8);
    if (up > 0.95) { L.inkPath(ctx, [[fx - 120, TOP], [fx + 60, TOP]], { width: 3, color: PB.Y, seed: 175, taper: 0 }); PB.label(ctx, 'HER FALL · 33,330 FT', 560, TOP - 60, (T - 23.75) / 0.15, { size: 26 }); }
    // the certificate stamps down
    const cs = L.clamp((T - 23.95) / 0.1);
    if (cs > 0) {
      const sc = 1 + 0.4 * (1 - L.ease.outCubic(cs));
      ctx.save(); ctx.translate(560, 1330); ctx.rotate(-0.04); ctx.scale(sc, sc); ctx.globalAlpha = L.clamp(cs * 2);
      FILM.pbCert(ctx, L, D, PB, 0, 0, 1);
      ctx.restore();
    }
  } });
  // the certificate (shared with the cliffhanger)
  FILM.pbCert = (ctx, L, D, PB, x, y, s, clip) => {
    const W = 760 * s, H = 470 * s;
    D.engrave(ctx, L.rectPts(x - W / 2, y - H / 2, W, H, 40), { ink: '#F2E8D0', base: '#E2D6B8', light: () => 0.1, angle: 0.5, spacing: 5, seed: 180, smooth: false, outW: 4, cross: false, stip: false });
    L.inkPath(ctx, L.rectPts(x - W / 2 + 18 * s, y - H / 2 + 18 * s, W - 36 * s, H - 36 * s, 40), { closed: true, width: 3, color: '#B08A3A', seed: 181 });
    L.inkPath(ctx, L.rectPts(x - W / 2 + 28 * s, y - H / 2 + 28 * s, W - 56 * s, H - 56 * s, 40), { closed: true, width: 1.5, color: '#B08A3A', seed: 182 });
    L.text(ctx, 'WORLD RECORD', x, y - 130 * s, { size: 66 * s, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: '#1A1206', tracking: '0.06em' });
    L.text(ctx, 'HIGHEST FALL SURVIVED', x, y - 45 * s, { size: 34 * s, family: PB.SERIF, weight: 600, align: 'center', baseline: 'middle', color: '#3A2A10' });
    L.text(ctx, 'WITHOUT A PARACHUTE', x, y + 2 * s, { size: 34 * s, family: PB.SERIF, weight: 600, align: 'center', baseline: 'middle', color: '#3A2A10' });
    L.text(ctx, '10,160 m · 33,330 ft · 1972', x, y + 70 * s, { size: 28 * s, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#3A2A10', tracking: '0.1em' });
    L.text(ctx, 'VESNA VULOVIĆ', x, y + 140 * s, { size: 36 * s, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: '#1A1206', tracking: '0.1em' });
    L.inkCircle(ctx, x + W / 2 - 90 * s, y + H / 2 - 90 * s, 46 * s, { width: 3, color: '#5A0A08', fill: '#C8321E', seed: 185 });
  };
})();
