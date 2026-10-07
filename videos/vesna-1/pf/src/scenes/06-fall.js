// 06 · fall · T 12.75–17.0
//   A 12.75–14.0 28 engraved seats (the people aboard); EVERYONE ELSE DIED: 27 go dark in a ripple, one stays lit (gold)
//   B 14.0–17.0 the cutaway: a broken fuselage section tumbling down through rushing cloud, her outline (schematic cyan)
//               pinned by the FOOD CART; the altimeter races to zero; the altitude tape (the curiosity line) returns
(function () {
  'use strict';
  function seat(ctx, L, D, x, y, s, lit, seed, glow) {
    const pts = [[-30, 40], [-30, -50], [-22, -60], [22, -60], [30, -50], [30, 0], [42, 0], [42, 40]].map(([a, b]) => [x + a * s, y + b * s]);
    D.engrave(ctx, pts, { ink: glow ? '#F2C230' : '#8A9AB8', base: glow ? '#4A3208' : '#141A28', light: () => lit, angle: 1.2, spacing: 3.6, seed, smooth: false, outW: 2.5, cross: false, stip: false });
  }
  FILM.scene({ id: 'fall', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    if (T < 14.0) {
      PB.plate(ctx, { seed: 131, color: '#0A0C16' });
      let i = 0;
      for (let r = 0; r < 7; r++) for (let c = 0; c < 4; c++) {
        const x = 230 + c * 180 + (c >= 2 ? 60 : 0), y = 620 + r * 130, idx = i++;
        const survivor = idx === 17;
        const off = L.clamp((T - (13.25 + ((idx * 7) % 28) * 0.012)) / 0.12);
        const lit = survivor ? 0.7 : L.lerp(0.55, 0.06, off);
        seat(ctx, L, D, x, y, 1.15, lit, 600 + idx, survivor && T > 13.3);
        if (survivor && T > 13.4) PB.burst(ctx, x, y - 10, 140, 0.8);
      }
      L.inkPath(ctx, [[540, 560], [540, 1560]], { width: 2, color: '#3A4568', seed: 640, taper: 0 });
      PB.label(ctx, '28 ON BOARD', 70, 1640, (T - 12.8) / 0.15, { size: 28, col: PB.IV });
      PB.label(ctx, '1 SURVIVOR', 640, 1640, (T - 13.6) / 0.15, { size: 28 });
      return;
    }
    PB.plate(ctx, { seed: 132, color: '#0A1024' });
    const g = ctx.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, 'rgba(30,44,88,0.7)'); g.addColorStop(1, 'rgba(6,8,18,0.9)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
    PB.clouds(ctx, T, { vy: 1600, seed: 31, n: 12, alpha: 0.75 });
    const ft = 33330 * (1 - L.clamp((T - 14.0) / 3.0)) ;
    // altitude tape (the curiosity line) — same as the hook
    PB.beam(ctx, [1000, -40], [1000, 1960], { T, w: 4, k: 0.8, dots: false });
    for (let k = -2; k < 24; k++) { const yy = 960 - ((ft % 1000) / 1000) * 1000 + k * 100 - 1000; if (yy < -20 || yy > 1940) continue; L.inkPath(ctx, [[1000, yy], [k % 5 ? 1030 : 1060, yy]], { width: k % 5 ? 2 : 4, color: PB.Y, alpha: 0.8, seed: 950 + k, taper: 0 }); }
    // the section: an engraved broken tube seen side-on, tumbling slowly
    const cx = 500, cy = 960, rot = -0.35 + 0.22 * Math.sin((T - 14) * 1.4) + 0.12 * (T - 14);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(1.3, 1.3);
    const W = 640, H = 300;
    const jag = (x0, dir, seed) => { const rr = L.rng(L.hash('jag', seed)); const pts = []; for (let k = 0; k <= 10; k++) pts.push([x0 + dir * (rr() * 40), -H / 2 + (k / 10) * H]); return pts; };
    const left = jag(-W / 2, -1, 1), right = jag(W / 2, 1, 2);
    const hull = left.slice().reverse().concat(right);
    const body = [left[0]].concat(right.slice(0, 1)).concat(right.slice(1)).concat(left.slice().reverse());
    const lit = (x, y) => 0.25 + 0.3 * L.clamp(1 - (y - cy + 200) / 500);
    D.engrave(ctx, [[-W / 2, -H / 2], [W / 2, -H / 2]].concat(right).concat([[W / 2, H / 2], [-W / 2, H / 2]]).concat(left.slice().reverse()), { ink: '#B8C2D8', base: '#141A2C', light: lit, angle: 1.4, spacing: 4.5, seed: 650, smooth: false, outW: 4 });
    // ribs + window row (cutaway: the near wall is cut away, we see inside)
    for (let k = 1; k < 8; k++) { const x = -W / 2 + (k / 8) * W; L.inkPath(ctx, [[x, -H / 2 + 6], [x, H / 2 - 6]], { width: 3, color: '#5A6488', seed: 660 + k, taper: 0 }); }
    for (let k = 0; k < 7; k++) { const x = -W / 2 + 60 + k * 85; L.inkPath(ctx, L.rrectPts(x - 16, -H / 2 + 34, 32, 44, 12), { closed: true, width: 2.5, color: '#C9D1E6', seed: 670 + k }); }
    // the food cart (engraved trolley) wedged against her
    D.engrave(ctx, L.rectPts(30, -10, 150, 140, 30), { ink: '#D8DCE6', base: '#2A3040', light: () => 0.55, angle: 0.2, spacing: 3.5, seed: 680, smooth: false, outW: 3, cross: false, stip: false });
    for (let k = 1; k < 4; k++) L.inkPath(ctx, [[34, -10 + k * 35], [176, -10 + k * 35]], { width: 2, color: '#1A1E2A', seed: 681 + k, taper: 0 });
    for (const wx of [55, 155]) L.inkCircle(ctx, wx, 140, 12, { width: 2.5, color: '#000', fill: '#3A3A3A', seed: 690 + wx });
    // her outline: a schematic figure (cyan), pinned under the cart
    const pose = [[-200, 60], [-120, 70], [-40, 80], [30, 90], [110, 110], [170, 120]];
    ctx.save(); ctx.shadowColor = 'rgba(127,216,232,0)';
    L.inkPath(ctx, [[-200, 60], [-40, 80], [60, 95], [160, 125]], { width: 34, color: '#7FD8E8', alpha: 0.55, seed: 700, taper: [10, 10] });
    L.inkCircle(ctx, -232, 52, 30, { width: 5, color: '#BFF4FA', fill: 'rgba(127,216,232,0.35)', seed: 701 });
    L.inkPath(ctx, [[-200, 60], [-40, 80], [60, 95], [160, 125]], { width: 3, color: '#9FE6F2', seed: 702 });
    L.inkPath(ctx, [[-150, 64], [-110, 120], [-60, 130]], { width: 3, color: '#9FE6F2', seed: 703 });
    ctx.restore();
    ctx.restore();
    const pw = (x, y) => { const c = Math.cos(rot), s = Math.sin(rot); x *= 1.3; y *= 1.3; return [cx + x * c - y * s, cy + x * s + y * c]; };
    const cp = pw(105, 60), hp = pw(-232, 52);
    if (T > 16.35) { L.inkPath(ctx, [cp, [cp[0] + 120, cp[1] + 260]], { width: 2.5, color: PB.Y, seed: 710 }); PB.label(ctx, 'FOOD CART', cp[0] + 40, cp[1] + 300, (T - 16.38) / 0.15, { size: 28 }); }
    if (T > 14.1) { L.inkPath(ctx, [hp, [hp[0] - 20, hp[1] - 260]], { width: 2.5, color: PB.CY, seed: 711 }); PB.label(ctx, 'VESNA', hp[0] - 120, hp[1] - 290, (T - 14.12) / 0.15, { size: 28, col: PB.CY }); }
    PB.alt(ctx, 500, 1450, ft, { s: 1.05 });
  } });
})();
