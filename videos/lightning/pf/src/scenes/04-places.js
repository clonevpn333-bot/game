// 04 · places · T 9.75–13.25 · three hard cuts, each struck on its word: FIRE TOWER (strike 10.3, 1942), his TRUCK
// (11.25, 1969), his own FRONT YARD (12.25, 1970). Each frame: the place, the bolt, the year, STRIKE #n stamped.
(function () {
  'use strict';
  FILM.scene({ id: 'places', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const cut = T < 10.95 ? 0 : T < 11.7 ? 1 : 2, hit = [10.3, 11.25, 12.25][cut], d = T - hit;
    const fk = d >= 0 && d < 0.5 ? Math.exp(-d * 8) : 0;
    PB.plate(ctx, { seed: 940 + cut, color: '#080B18' });
    PB.flash(ctx, fk * 0.55, 540, 0);
    const lit = 0.25 + 0.5 * fk, shake = fk * 14;
    const pz = 1 + 0.06 * (T - [9.75, 10.95, 11.7][cut]);
    ctx.save(); ctx.translate(540 + Math.sin(T * 91) * shake, 1200 + Math.cos(T * 77) * shake); ctx.scale(pz, pz); ctx.translate(-540, -1200);
    let target;
    if (cut === 0) {
      // fire tower on a ridge
      PB.ridges(ctx, (T - 9.75) * 80, T, { y: 1500 });
      const legs = [[380, 1500], [700, 1500], [470, 800], [610, 800]];
      L.inkPath(ctx, [legs[0], legs[2]], { width: 10, color: '#0A0C14', seed: 1, taper: 0 }); L.inkPath(ctx, [legs[1], legs[3]], { width: 10, color: '#0A0C14', seed: 2, taper: 0 });
      for (let k = 0; k < 6; k++) { const y = 1500 - k * 120, w = L.lerp(160, 70, k / 6); L.inkPath(ctx, [[540 - w, y], [540 + w, y - 110]], { width: 4, color: '#2A3048', seed: 3 + k, taper: 0 }); L.inkPath(ctx, [[540 + w, y], [540 - w, y - 110]], { width: 4, color: '#2A3048', seed: 13 + k, taper: 0 }); }
      D.engrave(ctx, [[430, 800], [650, 800], [650, 660], [430, 660]], { ink: '#8A9AC8', base: '#141A2C', light: () => lit, angle: 1.4, spacing: 4, seed: 30, smooth: false, outW: 3 });
      D.engrave(ctx, [[400, 670], [680, 670], [540, 560]], { ink: '#8A9AC8', base: '#141A2C', light: () => lit, angle: 0.4, spacing: 4, seed: 31, smooth: false, outW: 3 });
      ctx.fillStyle = `rgba(255,220,150,${0.5 + 0.4 * fk})`; ctx.fillRect(460, 700, 160, 70);
      PB.body(ctx, 540, 790, 170, fk > 0.05 ? PB.pose.struck(fk) : PB.pose.stand(), { yaw: 0.4, slot: 41, res: 0.5 });
      target = [540, 560];
    } else if (cut === 1) {
      // his truck under a tree, lightning through the open window
      PB.ridges(ctx, 300 + (T - 10.95) * 80, T, { y: 1300 });
      D.engrave(ctx, [[-40, 1500], [1120, 1500], [1120, 1960], [-40, 1960]], { ink: '#3A4A3A', base: '#0A100A', light: () => 0.2 + fk * 0.3, angle: 0.1, spacing: 6, seed: 40, smooth: false, outW: 2, cross: false, stip: false });
      L.inkPath(ctx, [[900, 1500], [880, 900], [800, 700]], { width: 26, color: '#1A140E', seed: 41 }); L.inkPath(ctx, [[880, 1000], [1000, 820]], { width: 14, color: '#1A140E', seed: 42 });
      PB.truck(ctx, 480, 1520, 1.7, { lights: true });
      target = [500, 1290];
      if (fk > 0) { L.inkPath(ctx, [[820, 760], [700, 1100], [560, 1250]], { width: 5, color: '#E8F0FF', alpha: fk, seed: 43 }); }
    } else {
      // his house, the yard, a power pole and transformer
      PB.ridges(ctx, 700, T, { y: 1250 });
      D.engrave(ctx, [[-40, 1450], [1120, 1450], [1120, 1960], [-40, 1960]], { ink: '#3A4A3A', base: '#0A100A', light: () => 0.2 + fk * 0.3, angle: 0.1, spacing: 6, seed: 50, smooth: false, outW: 2, cross: false, stip: false });
      D.engrave(ctx, [[80, 1450], [80, 1100], [330, 920], [580, 1100], [580, 1450]], { ink: '#9A8A70', base: '#1A140E', light: () => lit, angle: 1.1, spacing: 4, seed: 51, smooth: false, outW: 3 });
      ctx.fillStyle = `rgba(255,210,140,${0.6})`; ctx.fillRect(140, 1220, 90, 80); ctx.fillRect(420, 1220, 90, 80);
      L.inkPath(ctx, [[900, 1450], [900, 760]], { width: 14, color: '#1A140E', seed: 52, taper: 0 }); L.inkPath(ctx, [[820, 800], [980, 800]], { width: 8, color: '#1A140E', seed: 53, taper: 0 });
      D.engrave(ctx, L.rectPts(862, 840, 76, 100, 30), { ink: '#8A92A8', base: '#1A1E28', light: () => lit, spacing: 3, seed: 54, smooth: false, outW: 2, cross: false, stip: false });
      PB.body(ctx, 690, 1470, 380, fk > 0.05 ? PB.pose.struck(fk) : PB.pose.walk((T - 11.7) * 5), { yaw: 0.9, slot: 42 });
      target = [690, 1265];
      if (fk > 0) L.inkPath(ctx, [[900, 900], [800, 1080], [700, 1260]], { width: 6, color: '#E8F0FF', alpha: fk, seed: 55 });
    }
    if (d >= 0 && d < 0.35) { PB.bolt(ctx, cut === 1 ? [820, -60] : [target[0] + 150, -60], cut === 1 ? [820, 760] : cut === 2 ? [900, 760] : target, { seed: 80 + cut, k: d < 0.07 ? 1 : Math.max(0, 0.7 - d * 2), w: 9, branches: 4 }); PB.burst(ctx, target[0], target[1], 280, Math.exp(-d * 7), '200,215,255'); }
    ctx.restore();
    if (d >= 0) { PB.label(ctx, ['1942', '1969', '1970'][cut], 80, 1310, d / 0.08, { size: 34 }); PB.label(ctx, 'STRIKE #' + (cut + 1), 80, 1380, (d - 0.05) / 0.08, { size: 28, col: PB.IV }); }
    PB.rain(ctx, T, { n: 140, a: 0.3, seed: 4 + cut });
    PB.ambient(ctx, T, { ground: 1560, seed: 4 + cut });
  } });
})();
