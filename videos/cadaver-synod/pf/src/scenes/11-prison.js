// 11 · prison · T 25.25–28.0 · Stephen, mitre gone, alone in a cell under a moon shaft, seen through iron bars.
// "strangled" (27.10) → the candle beside him is snuffed; smoke rises; the frame falls to black.
(function () {
  'use strict';
  FILM.scene({ id: 'prison', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const out = L.clamp((T - 27.1) / 0.12), black = 0.9 * L.clamp((T - 27.55) / 0.4);
    D.bg(ctx, { top: '#0E0A10', bottom: '#040304' });
    // stone blocks
    ctx.strokeStyle = 'rgba(70,62,80,0.4)'; ctx.lineWidth = 2;
    for (let y = 0, row = 0; y < 1920; y += 90, row++) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1080, y); ctx.stroke(); for (let x = (row % 2) * 90; x < 1080; x += 180) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 90); ctx.stroke(); } }
    // high window + moon shaft
    ctx.fillStyle = '#2A3048'; ctx.fillRect(180, 320, 200, 160);
    for (let k = 0; k < 4; k++) { ctx.fillStyle = '#05040A'; ctx.fillRect(200 + k * 50, 320, 12, 160); }
    D.shaft(ctx, [[180, 400], [380, 400], [820, 1700], [460, 1760]], '#9AA8D8', 0.9 * (1 - black));
    const z = 1 + 0.06 * t;
    ctx.save(); ctx.translate(560, 1400); ctx.scale(z, z); ctx.translate(-560, -1400);
    ctx.fillStyle = 'rgba(150,165,215,0.22)'; ctx.beginPath(); ctx.ellipse(640, 1660, 260, 60, 0, 0, Math.PI * 2); ctx.fill();
    D.figure(ctx, 640, 1660, 1.1, T, { pose: 'pray', hat: 'cap', rim: '#C8D4FF', rimA: 1.6, tremble: 0.3, fill: '#0C0B12' });
    D.shaft(ctx, [[180, 400], [380, 400], [820, 1700], [460, 1760]], '#9AA8D8', 0.35 * (1 - black));
    D.candle(ctx, 860, 1660, 0.9, T, { seed: 12, h: 110, out, smoke: Math.max(0, T - 27.1) });
    ctx.restore();
    // iron bars in front (3D-shaded cylinders)
    for (const x of [70, 300, 960]) {
      const g = ctx.createLinearGradient(x - 18, 0, x + 18, 0); g.addColorStop(0, '#050405'); g.addColorStop(0.4, '#3A363E'); g.addColorStop(1, '#050405');
      ctx.fillStyle = g; ctx.fillRect(x - 18, 0, 36, 1920);
    }
    ctx.fillStyle = '#0A090C'; ctx.fillRect(0, 200, 1080, 40); ctx.fillRect(0, 1780, 1080, 40);
    D.grain(ctx, T, 1);
    if (black > 0) { ctx.fillStyle = `rgba(0,0,0,${black})`; ctx.fillRect(0, 0, 1080, 1920); }
  } });
})();
