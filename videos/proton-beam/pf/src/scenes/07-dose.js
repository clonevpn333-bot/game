// 07 · dose · T 19.5–23.0 · bar chart that becomes a camera move. A lethal dose is a stub (≈500 rad); his bar — the beam,
// stood upright — shoots off the top of the frame; the camera chases it up a scrolling scale; 200,000+ RAD stamps (21.0).
// HUNDREDS OF TIMES / WHAT KILLS A HUMAN. At 22.45 his bar thins into one vertical line down the middle (→ his face).
(function () {
  'use strict';
  const BASE = 1440;
  FILM.scene({ id: 'dose', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 71 });
    const grow = L.ease.inOutCubic(L.clamp((T - 19.95) / 1.05));
    const h = 3400 * grow;
    const cam = 1500 * L.ease.inOutCubic(L.clamp((T - 20.15) / 0.95)) - 1500 * L.ease.inOutCubic(L.clamp((T - 21.9) / 0.55));
    const thin = L.ease.inOutCubic(L.clamp((T - 22.45) / 0.5));
    const fade = 1 - thin;
    PB.grid(ctx, 0.08 * fade, 60, 0, cam);
    ctx.save(); ctx.translate(0, cam);
    // scale on the left: engraved ruler that scrolls with the camera
    ctx.globalAlpha = fade;
    for (let k = 0; k < 90; k++) {
      const y = BASE - k * 40; if (y + cam < -40 || y + cam > 1960) continue;
      L.inkPath(ctx, [[70, y], [k % 5 ? 96 : 130, y]], { width: k % 5 ? 2 : 3.5, color: '#8EA0C8', seed: 700 + k, taper: 0 });
      if (k % 10 === 0 && k && y + cam < 1520) L.text(ctx, (k * 2500).toLocaleString('en-US'), 142, y, { size: 22, family: PB.MONO, weight: 600, align: 'left', baseline: 'middle', color: '#8EA0C8' });
    }
    L.inkPath(ctx, [[80, BASE + 10], [80, BASE - 4000]], { width: 3, color: '#8EA0C8', seed: 790, taper: 0 });
    L.inkPath(ctx, [[60, BASE], [1020, BASE]], { width: 4, color: PB.IV, seed: 791, taper: 0 });
    // lethal dose: a stub
    const lp = L.ease.outBack(L.clamp((T - 19.6) / 0.25));
    const lh = 34 * lp;
    if (lp > 0) {
      D.engrave(ctx, L.rectPts(300, BASE - lh, 160, lh, 20), { ink: PB.IV, base: '#2A2A30', light: () => 0.6, angle: 0.8, spacing: 4, seed: 792, smooth: false, outW: 3, cross: false, stip: false });
      if (BASE + 60 + cam < 1515) PB.label(ctx, 'LETHAL ≈ 500 RAD', 380, BASE + 60, (T - 19.7) / 0.2, { align: 'center', col: PB.IV, size: 24 });
    }
    ctx.globalAlpha = 1;
    // his dose: the beam, upright
    const bx = L.lerp(700, 540, thin), bw = L.lerp(170, 6, thin);
    if (grow > 0) {
      const top = BASE - h;
      ctx.globalAlpha = fade;
      D.engrave(ctx, L.rectPts(bx - bw / 2, top, bw, h, 40), { ink: '#FFE7A0', base: '#6A4A08', light: () => 0.7, angle: 0.8, spacing: 4.5, seed: 793, smooth: false, outW: 3, cross: false, stip: false });
      ctx.globalAlpha = 1;
      PB.beam(ctx, [bx, BASE + (thin ? 600 : 0)], [bx, top - (thin ? 3000 : 0)], { T, w: L.lerp(8, 5, thin), k: L.lerp(0.55, 1, thin), dots: true, speed: -2600 });
      PB.burst(ctx, bx, top, 300, 0.7 * fade);
      if (fade > 0) {
        ctx.globalAlpha = fade;
        if (BASE + 60 + cam < 1515) PB.label(ctx, 'HIS DOSE', bx, BASE + 60, (T - 20.0) / 0.2, { align: 'center', size: 24 });
        // counter rides the bar top
        const n = Math.round(200000 * L.clamp((T - 19.95) / 1.05) / 1000) * 1000;
        const ty = Math.max(top - 70, -cam + 520);
        L.text(ctx, n.toLocaleString('en-US') + (T > 21.0 ? '+' : ''), bx, ty, { size: 96, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: PB.Y });
        L.text(ctx, 'RAD', bx, ty + 70, { size: 34, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: PB.IV, tracking: '0.3em' });
        ctx.globalAlpha = 1;
      }
    }
    ctx.restore();
    // stamp: ×400 (hundreds of times)
    const st = L.clamp((T - 21.0) / 0.08) * fade;
    if (st > 0) {
      ctx.save(); ctx.translate(330, 980); ctx.rotate(-0.15); const sc = 1 + 0.4 * (1 - L.ease.outCubic(L.clamp((T - 21.0) / 0.08))); ctx.scale(sc, sc); ctx.globalAlpha = st;
      L.inkPath(ctx, L.ellipsePts(0, 0, 200, 120, 48), { closed: true, width: 9, color: PB.RED, seed: 795 });
      L.text(ctx, '×400', 0, 0, { size: 120, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: PB.RED });
      ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = fade;
    if (T > 20.2) { ctx.fillStyle = 'rgba(8,12,28,0.9)'; ctx.fillRect(0, 140, 1080, T > 21.3 ? 250 : 150); L.inkPath(ctx, [[0, T > 21.3 ? 390 : 290], [1080, T > 21.3 ? 390 : 290]], { width: 2, color: PB.Y, alpha: 0.6, seed: 799, taper: 0 }); }
    PB.word(ctx, 'HUNDREDS OF TIMES', 540, 220, 92, (T - 20.25) / 0.12);
    PB.word(ctx, 'WHAT KILLS A HUMAN', 540, 330, 76, (T - 21.35) / 0.12, { color: PB.Y });
    ctx.restore();
  } });
})();
