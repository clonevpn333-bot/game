// 11 · prison · T 25.25–28.0 · an engraved stone cell: moonlight through a barred slit falls across Stephen, mitre gone.
// We watch through iron bars. "strangled" (27.10): the candle beside him is snuffed, smoke curls up, the cell goes dark.
(function () {
  'use strict';
  FILM.scene({ id: 'prison', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t + FILM.SHIFT;
    const out = L.clamp((T - 27.1) / 0.12), black = 0.9 * L.clamp((T - 27.55) / 0.4);
    D.plate(ctx, { color: '#0B090B' });
    const inShaft = (x, y) => { const u = (y - 400) / 1300; if (u < 0) return 0; const cx = L.lerp(280, 640, u), hw = L.lerp(100, 200, u); return L.clamp(1 - Math.abs(x - cx) / hw) * 0.75; };
    const lit = (x, y) => L.clamp(inShaft(x, y) + (1 - out) * 0.5 * Math.pow(L.clamp(1 - Math.hypot(x - 860, y - 1600) / 650), 1.5) + 0.03) * (1 - black);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.12, spacing: 6, width: 1.1, color: '#A6A2B2', alpha: 0.8, seed: 61, density: (x, y) => lit(x, y) * 0.8 });
    for (let row = 0, y = 20; y < 1920; y += 104, row++) { L.inkPath(ctx, [[-10, y], [1090, y + 5]], { width: 2.8, color: '#000', seed: 2000 + row, taper: 0 }); for (let x = (row % 2) * 120 - 50; x < 1080; x += 240) L.inkPath(ctx, [[x, y], [x + 3, y + 104]], { width: 2.4, color: '#000', seed: 2100 + row * 7 + x, taper: 0 }); }
    ctx.fillStyle = '#2A3048'; ctx.fillRect(180, 320, 200, 150);
    for (let k = 0; k < 4; k++) L.inkPath(ctx, [[204 + k * 50, 320], [206 + k * 50, 470]], { width: 12, color: '#05040A', seed: 2200 + k, taper: 0 });
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, 400, 0, 1760); g.addColorStop(0, `rgba(160,175,225,${0.22 * (1 - black)})`); g.addColorStop(1, 'rgba(160,175,225,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(180, 400); ctx.lineTo(380, 400); ctx.lineTo(840, 1700); ctx.lineTo(440, 1760); ctx.fill(); ctx.restore();
    const z = 1 + 0.06 * t;
    ctx.save(); ctx.translate(600, 1400); ctx.scale(z, z); ctx.translate(-600, -1400);
    D.figure(ctx, 620, 1660, 1.1, T, { pose: 'pray', hat: 'cap', tremble: 0.3, light: (x, y) => lit(x, y) * 1.2 + 0.18, ink: '#E2DEEE', seed: 23 });
    D.candle(ctx, 860, 1660, 0.9, T, { seed: 12, h: 110, out, smoke: Math.max(0, T - 27.1) });
    ctx.restore();
    for (const x of [70, 300, 960]) D.engrave(ctx, [[x - 20, -10], [x + 20, -10], [x + 20, 1930], [x - 20, 1930]], { ink: '#B8B4C4', base: '#060507', light: (a) => L.clamp(0.55 - Math.abs(a - (x - 8)) / 24) * (1 - black), angle: 0.05, spacing: 4, width: 1, seed: 2300 + x, smooth: false, cross: false, stip: false });
    for (const y of [210, 1790]) D.engrave(ctx, [[-10, y], [1090, y], [1090, y + 36], [-10, y + 36]], { ink: '#B8B4C4', base: '#060507', light: () => 0.25 * (1 - black), angle: 1.5, spacing: 4, seed: 2400 + y, smooth: false, cross: false, stip: false });
    D.grain(ctx, T, 1);
    if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, 1080, 1920); }
  } });
})();
