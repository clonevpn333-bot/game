// 12 · title · T 28.0–32.5 · an illuminated manuscript on an engraved desk: the previous leaf turns over in 3D (28.0–28.45),
// the gilded C and the blackletter "Cadaver Synod" ink in (29.0), and the camera pushes into the painted miniature of
// the trial on "a corpse was put on trial" (30.4 →). The film's single period display face lives here.
(function () {
  'use strict';
  const PG = [140, 360, 800, 1160];
  function miniature(ctx, L, D, C, T, mx, my, mw, mh) {
    ctx.save(); ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
    ctx.fillStyle = '#1E2A6A'; ctx.fillRect(mx, my, mw, mh);
    L.stipple(ctx, null, { bounds: { x: mx, y: my, w: mw, h: mh * 0.6 }, spacing: 16, r: [1.2, 2.6], color: '#F2D27A', alpha: 0.9, seed: 3001 });
    ctx.fillStyle = '#6A4426'; ctx.fillRect(mx, my + mh - 130, mw, 130);
    L.hatch(ctx, null, { bounds: { x: mx, y: my + mh - 130, w: mw, h: 130 }, angle: 0.05, spacing: 7, width: 1, color: '#2A1408', alpha: 0.6, seed: 3002 });
    const tx = mx + mw * 0.42, ty = my + mh - 100;
    const back = [[tx - 110, ty], [tx - 110, ty - 330], [tx, ty - 400], [tx + 110, ty - 330], [tx + 110, ty]];
    L.inkPath(ctx, back, { closed: true, width: 4, color: '#1A0E06', fill: '#8A2A1A', seed: 3003 });
    L.inkPath(ctx, back.map(([x, y]) => [tx + (x - tx) * 0.8, ty - 20 + (y - ty) * 0.85]), { closed: true, width: 3, color: '#F2D27A', seed: 3004 });
    L.inkPath(ctx, [[tx - 80, ty - 250], [tx - 100, ty - 20], [tx + 100, ty - 20], [tx + 80, ty - 250]], { closed: true, width: 4, color: '#1A0E06', fill: '#C8322A', seed: 3005 });
    L.inkPath(ctx, [[tx - 50, ty - 240], [tx, ty - 200], [tx + 50, ty - 240], [tx, ty - 200], [tx, ty - 40]], { width: 7, color: '#F0E8DA', seed: 3006 });
    L.inkPath(ctx, L.ellipsePts(tx, ty - 285, 34, 40, 24), { closed: true, width: 3, color: '#1A0E06', fill: '#EEE4CC', seed: 3007 });
    for (const sx of [-13, 13]) L.inkPath(ctx, [[tx + sx - 9, ty - 296], [tx + sx + 9, ty - 298], [tx + sx + 6, ty - 282], [tx + sx - 7, ty - 283]], { closed: true, width: 2, color: '#000', fill: '#120A08', seed: 3008 + sx });
    L.inkPath(ctx, [[tx, ty - 276], [tx - 5, ty - 266], [tx + 5, ty - 266]], { closed: true, width: 1.5, color: '#000', fill: '#120A08', seed: 3009 });
    L.hatch(ctx, [[tx - 80, ty - 250], [tx - 100, ty - 20], [tx + 100, ty - 20], [tx + 80, ty - 250]], { angle: 1.4, spacing: 5, width: 1, color: '#5A0A0C', alpha: 0.6, seed: 3015, density: (x) => L.clamp(Math.abs(x - tx) / 100) });
    L.inkPath(ctx, [[tx - 30, ty - 318], [tx - 26, ty - 380], [tx, ty - 400], [tx + 26, ty - 380], [tx + 30, ty - 318]], { closed: true, width: 3, color: '#1A0E06', fill: '#F2D27A', seed: 3010 });
    const st = [[mx + mw * 0.88, ty + 40], [mx + mw * 0.8, ty - 180], [mx + mw * 0.83, ty - 280], [mx + mw * 0.9, ty - 330], [mx + mw * 0.97, ty - 280], [mx + mw * 1.0, ty - 180], [mx + mw * 1.02, ty + 40]];
    L.inkPath(ctx, st, { closed: true, width: 4, color: '#1A0E06', fill: '#7A1418', seed: 3011 });
    L.inkPath(ctx, [[mx + mw * 0.84, ty - 220], [mx + mw * 0.66, ty - 250]], { width: 14, color: '#7A1418', seed: 3012 });
    const dc = [[mx + mw * 0.06, ty + 40], [mx + mw * 0.09, ty - 170], [mx + mw * 0.12, ty - 250], [mx + mw * 0.17, ty - 270], [mx + mw * 0.22, ty - 250], [mx + mw * 0.25, ty - 170], [mx + mw * 0.28, ty + 40]];
    L.inkPath(ctx, dc, { closed: true, width: 4, color: '#1A0E06', fill: '#3A3A4A', seed: 3013 });
    ctx.restore();
    L.inkPath(ctx, [[mx, my], [mx + mw, my], [mx + mw, my + mh], [mx, my + mh]], { closed: true, width: 8, color: C.gold, seed: 3014, smooth: false });
  }
  function page(ctx, L, D, C, T) {
    const [x, y, w, h] = PG;
    L.paper(ctx, { x, y, w, h, color: '#DCCBA4', seed: 21, vignette: 0.55, mottle: 1.4 });
    L.inkPath(ctx, [[x + 30, y + 30], [x + w - 30, y + 30], [x + w - 30, y + h - 30], [x + 30, y + h - 30]], { closed: true, width: 4, color: '#7A1A14', seed: 3020, smooth: false });
    L.inkPath(ctx, [[x + 44, y + 44], [x + w - 44, y + 44], [x + w - 44, y + h - 44], [x + 44, y + h - 44]], { closed: true, width: 2, color: '#B8862A', seed: 3021, smooth: false });
    // vine scrolls in the margins
    for (let k = 0; k < 9; k++) { const yy = y + 90 + k * 115; for (const xx of [x + 37, x + w - 37]) { const sp = []; for (let a = 0; a < Math.PI * 3; a += 0.25) sp.push([xx + Math.cos(a + k) * (4 + a * 3.2) * (xx < x + w / 2 ? 1 : -1), yy + Math.sin(a + k) * (4 + a * 3.2)]); L.inkPath(g0(ctx), sp, { width: 1.6, color: '#3A6A2A', seed: 3030 + k + (xx > x + w / 2 ? 50 : 0) }); L.inkPath(ctx, L.ellipsePts(xx, yy + 40, 6, 10, 10, 0.6), { closed: true, width: 1.2, color: '#1A3A10', fill: k % 2 ? '#A11F22' : '#2E56C8', seed: 3100 + k }); } }
    function g0(c) { return c; }
    // the gilded drop cap
    const dcx = x + 80, dcy = y + 80;
    L.inkPath(ctx, [[dcx, dcy], [dcx + 190, dcy], [dcx + 190, dcy + 210], [dcx, dcy + 210]], { closed: true, width: 4, color: '#3A0A08', fill: '#8A1A16', seed: 3200, smooth: false });
    L.hatch(ctx, [[dcx, dcy], [dcx + 190, dcy], [dcx + 190, dcy + 210], [dcx, dcy + 210]], { angle: 0.8, spacing: 5, width: 1, color: '#3A0A08', alpha: 0.5, seed: 3201 });
    L.text(ctx, 'C', dcx + 95, dcy + 112, { size: 200, family: '"UnifrakturMaguntia", serif', weight: 400, align: 'center', baseline: 'middle', color: '#F2D27A' });
    const u = L.clamp((T - 29.0) / 0.8);
    ctx.save(); ctx.beginPath(); ctx.rect(x + 290, y + 70, (w - 330) * u, 240); ctx.clip();
    L.text(ctx, 'adaver', x + 290, y + 170, { size: 104, family: '"UnifrakturMaguntia", serif', weight: 400, color: '#1A0E08' });
    L.text(ctx, 'Synod', x + 300, y + 285, { size: 104, family: '"UnifrakturMaguntia", serif', weight: 400, color: '#7A1A14' });
    ctx.restore();
    L.text(ctx, 'Romae · Anno Domini 897', x + w / 2, y + 368, { size: 36, family: '"Fraunces", serif', weight: 600, align: 'center', color: '#3A2412', alpha: L.clamp((T - 29.7) / 0.3) });
    miniature(ctx, L, D, C, T, x + 110, y + 420, w - 220, 640);
  }
  FILM.scene({ id: 'title', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t + FILM.SHIFT;
    D.plate(ctx, { color: '#120A06' });
    const lit = D.lights([{ x: 960, y: 1520, r: 1300, k: 0.55 }], 0.04);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.04, spacing: 5.5, width: 1.1, color: '#B07A48', alpha: 0.75, seed: 3300, density: (x, y) => lit(x, y) * 0.75, length: [60, 200] });
    const push = L.ease.inOutCubic(L.clamp((T - 30.4) / 1.9));
    const z = 0.92 + 1.15 * push;
    ctx.save(); ctx.translate(540, L.lerp(960, 1180, push)); ctx.scale(z, z); ctx.translate(-540, -960);
    page(ctx, L, D, C, T);
    const fp = L.ease.inOutCubic(L.clamp((T - 28.0) / 0.45));
    if (fp < 1) {
      const ang = fp * Math.PI, cw = Math.cos(ang), [x, y, w, h] = PG, wx = w * cw, lift = Math.sin(ang) * 90;
      const leaf = [[x, y], [x + wx, y - lift], [x + wx, y + h + lift], [x, y + h]];
      ctx.beginPath(); L.tracePath(ctx, leaf, true); ctx.fillStyle = cw > 0 ? '#E2D2AC' : '#9A8A64'; ctx.fill();
      L.hatch(ctx, leaf, { angle: 1.5, spacing: 5, width: 1, color: '#5A4A2A', alpha: 0.5, seed: 3400, density: (px) => L.clamp(Math.abs(px - x) / Math.max(1, Math.abs(wx)) * 0.8) });
      L.inkPath(ctx, leaf, { closed: true, width: 2.4, color: '#3A2A12', seed: 3401, smooth: false });
    }
    ctx.restore();
    D.candle(ctx, 960, 1560, 1.0, T, { seed: 7, h: 200 });
    D.grain(ctx, T, 0.9);
  } });
})();
