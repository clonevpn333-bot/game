// 08 · fingers · T 18.5–21.25 · the corpse's right hand raised in blessing, ring on. "three fingers" (19.57) → the
// three blessing fingers glow I · II · III; a blade flashes across (20.2) and the finger bones tumble away in 3D.
(function () {
  'use strict';
  const H = [560, 1180], S = 1.9;
  FILM.scene({ id: 'fingers', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const CUT = 20.2, cut = T >= CUT;
    let sh = 0; { const d = T - CUT; if (d >= 0 && d < 0.35) sh = (1 - d / 0.35) * 24; }
    ctx.save(); ctx.translate(sh * Math.sin(T * 97), sh * Math.cos(T * 83));
    D.bg(ctx, { top: '#140A10', bottom: '#040304' });
    D.glow(ctx, 400, 1100, 900, C.candle, 0.45);
    D.glow(ctx, 860, 600, 600, '#A11F22', 0.3);
    const z = 1 + 0.05 * t;
    ctx.save(); ctx.translate(540, 1000); ctx.scale(z, z); ctx.translate(-540, -1000);
    D.hand(ctx, H[0], H[1], S, { cut: cut ? [true, true, true] : [false, false, false], ring: true });
    // glow on the three fingers
    const gl = L.clamp((T - 19.5) / 0.2) * (cut ? 0 : 1);
    if (gl > 0) D.F_TIPS.forEach((p, i) => { const [x, y] = p[3]; const a = L.clamp((T - 19.55 - i * 0.12) / 0.15); D.glow(ctx, H[0] + x * S, H[1] + y * S, 120, C.gold, a * gl); L.text(ctx, ['I', 'II', 'III'][i], H[0] + x * S, H[1] + (y - 70) * S, { size: 50, family: '"Cinzel", serif', weight: 900, align: 'center', color: C.gold, alpha: a * gl }); });
    if (cut) {
      const d = T - CUT;
      D.F_TIPS.forEach((p, i) => {
        const mx = (p[1][0] + p[3][0]) / 2, my = (p[1][1] + p[3][1]) / 2;
        const len = Math.hypot(p[3][0] - p[1][0], p[3][1] - p[1][1]);
        const ang0 = Math.atan2(p[3][1] - p[1][1], p[3][0] - p[1][0]) + Math.PI / 2;
        const vx = (i - 1) * 260 + 80, vy = -380 - i * 60;
        D.bone(ctx, H[0] + mx * S + vx * d, H[1] + my * S + vy * d + 1700 * d * d, S, ang0 + d * (3 + i * 2) * (i % 2 ? -1 : 1), Math.cos(d * (7 + i * 3)), len);
      });
      const rr = L.rng(L.hash('bonedust'));
      for (let i = 0; i < 40; i++) { const a = -Math.PI * (0.1 + rr() * 0.8), v = 200 + rr() * 500; ctx.fillStyle = `rgba(230,220,200,${Math.max(0, 0.8 - d)})`; ctx.beginPath(); ctx.arc(H[0] - 40 * S + Math.cos(a) * v * d, H[1] - 60 * S + Math.sin(a) * v * d + 600 * d * d, 3 + rr() * 4, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();
    // the blade: a silver arc sweeping across the knuckles
    const bd = (T - (CUT - 0.08)) / 0.16;
    if (bd > 0 && bd < 1.6) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const a0 = -0.15, x0 = -100, x1 = 1180, y = H[1] - 110 * S;
      const head = L.clamp(bd), tail = L.clamp(bd - 0.4);
      const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,1)');
      ctx.strokeStyle = `rgba(240,245,255,${Math.max(0, 1 - (bd - 1) * 2)})`; ctx.lineWidth = 16; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(L.lerp(x0, x1, tail), y + 140 * L.lerp(0, 1, tail) - 70); ctx.lineTo(L.lerp(x0, x1, head), y + 140 * head - 70); ctx.stroke();
      ctx.lineWidth = 50; ctx.strokeStyle = `rgba(160,190,255,${0.35 * Math.max(0, 1 - (bd - 1) * 2)})`; ctx.stroke();
      ctx.restore();
    }
    D.fog(ctx, T, { y: 1750, h: 500, a: 0.25, speed: 30 });
    ctx.restore();
    D.grain(ctx, T, 1);
    L.text(ctx, 'THE BLESSING FINGERS', 540, 300, { size: 46, family: '"Cinzel", serif', weight: 700, align: 'center', color: C.gold, alpha: L.clamp((T - 19.55) / 0.2), tracking: '0.12em' });
  } });
})();
