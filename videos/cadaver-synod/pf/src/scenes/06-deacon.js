// 06 · deacon · T 13.25–16.75 · the corpse enthroned; a hooded deacon trembles beside it, a Latin scroll unrolling as he
// speaks for it (13.97). 15.15 → cut: Stephen in the foreground, mitre and pointing arm, screaming (15.58) —
// candles gutter, the frame shakes, and on "corpse" (16.34) the dead jaw drops open.
(function () {
  'use strict';
  FILM.scene({ id: 'deacon', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const scream = T >= 15.15;
    let sh = 0; if (T > 15.55 && T < 16.6) sh = 10 + 6 * Math.sin(T * 9);
    ctx.save(); ctx.translate(sh * Math.sin(T * 97), sh * Math.cos(T * 83));
    D.bg(ctx, { top: '#140C14', bottom: '#050405' });
    D.glow(ctx, 450, 900, 900, C.candle, 0.35);
    ctx.save();
    const z = scream ? 1.1 : 1.0 + 0.04 * (t / 1.9);
    ctx.translate(scream ? 380 : 540, 1000); ctx.scale(z, z); ctx.translate(scream ? -380 : -540, -1000);
    D.corpse(ctx, 420, 1330, 0.78, T, { ember: scream ? 0.8 : 0.3, jaw: T > 16.3 ? 0.25 + 0.75 * L.clamp((T - 16.3) / 0.15) : 0.25 });
    for (const [x, y, s] of [[110, 1560, 0.9], [760, 1600, 0.9], [960, 1520, 0.7]]) D.candle(ctx, x, y, s, T, { seed: x, h: 120 });
    if (!scream) {
      const tips = D.figure(ctx, 820, 1560, 1.05, T, { pose: 'pray', hat: 'hood', tremble: 1, rim: C.candle });
      // the scroll he reads from
      const u = L.ease.outCubic(L.clamp((T - 13.9) / 0.6));
      if (u > 0) {
        const x0 = 640, y0 = 640, w = 400 * u;
        ctx.fillStyle = '#D8C8A0'; ctx.fillRect(x0, y0, w, 150);
        L.hatch(ctx, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + 150], [x0, y0 + 150]], { angle: 0.2, spacing: 6, width: 1, color: '#6A5A3A', alpha: 0.3, seed: 31 });
        ctx.fillStyle = '#B8A478'; ctx.beginPath(); ctx.ellipse(x0, y0 + 75, 16, 80, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.ellipse(x0 + w, y0 + 75, 16, 80, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, w, 150); ctx.clip();
        L.text(ctx, 'Non sum reus...', x0 + 30, y0 + 62, { size: 46, family: '"UnifrakturMaguntia", serif', weight: 400, color: '#3A1A10' });
        L.text(ctx, '— pro mortuo', x0 + 60, y0 + 118, { size: 34, family: '"UnifrakturMaguntia", serif', weight: 400, color: '#7A1A14' });
        ctx.restore();
      }
    }
    ctx.restore();
    if (scream) {
      // Stephen: huge foreground silhouette, crimson rim, pointing at the corpse
      const tips = D.figure(ctx, 880, 2150, 1.9, T, { pose: 'point', hat: 'mitre', flip: true, rim: '#FF4A2A', tremble: 0.6, fill: '#140A0C' });
      const sc = L.clamp((T - 15.55) / 0.1);
      if (sc > 0) {
        const hx = 880, hy = 2150 - 455 * 1.9;
        ctx.strokeStyle = `rgba(255,90,60,${0.85 * sc})`; ctx.lineWidth = 6; ctx.lineCap = 'round';
        const r = L.rng(Math.floor(T * 12) + 7);
        for (let k = 0; k < 9; k++) {
          const a = -Math.PI * (0.55 + k * 0.1), r0 = 150 + r() * 30, r1 = r0 + 90 + r() * 80;
          ctx.beginPath(); ctx.moveTo(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0);
          ctx.lineTo(hx + Math.cos(a + 0.05) * (r0 + r1) / 2, hy + Math.sin(a + 0.05) * (r0 + r1) / 2); ctx.lineTo(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1); ctx.stroke();
        }
      }
    }
    D.fog(ctx, T, { y: 1750, h: 500, a: 0.3, speed: 30 });
    ctx.restore();
    D.grain(ctx, T, 1);
  } });
})();
