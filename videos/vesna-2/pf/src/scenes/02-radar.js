// 02 · radar · T 2.5–6.0 · SECOND HOOK on the 2.5 hit: an engraved radar scope, its sweep (the curiosity line) finds the
// jet's blip; a crosshair locks on, one step per beat; 4.0 a missile streak; 4.33 SHOT DOWN — the blip flashes and
// breaks into three; 5.03 BY MISTAKE? is stamped across the scope.
(function () {
  'use strict';
  FILM.scene({ id: 'radar', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 211, color: '#050A08' });
    const cx = 540, cy = 1060, R = 430;
    D.engrave(ctx, L.ellipsePts(cx, cy, R + 50, R + 50, 90), { ink: '#6A7888', base: '#151A20', light: () => 0.35, angle: 0.4, spacing: 4.5, seed: 220, outW: 5 });
    ctx.fillStyle = '#021208'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();
    for (let k = 1; k <= 4; k++) L.inkCircle(ctx, cx, cy, R * k / 4, { width: 1.5, color: '#2E7A4A', alpha: 0.7, seed: 221 + k });
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; L.inkPath(ctx, [[cx, cy], [cx + Math.cos(a) * R, cy + Math.sin(a) * R]], { width: 1, color: '#2E7A4A', alpha: 0.5, seed: 230 + k, taper: 0 }); }
    // sweep: a bright arm with a fading wedge
    const sa = (T - 2.5) * 2.6 - 1.2;
    for (let k = 0; k < 24; k++) { const a = sa - k * 0.03; ctx.strokeStyle = `rgba(90,255,150,${0.35 * (1 - k / 24)})`; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke(); }
    PB.beam(ctx, [cx, cy], [cx + Math.cos(sa) * R, cy + Math.sin(sa) * R], { T, w: 3, dots: false, k: 0.8 });
    // the blip
    const bx = cx + 170, by = cy - 140, hit = T >= 4.33;
    if (!hit) { ctx.fillStyle = '#B8FFD0'; ctx.beginPath(); ctx.arc(bx, by, 12, 0, 7); ctx.fill(); PB.burst(ctx, bx, by, 60, 0.6, '120,255,170'); L.text(ctx, 'JU 367', bx + 30, by - 30, { size: 26, family: PB.MONO, weight: 600, align: 'left', baseline: 'middle', color: '#9FFFC0' }); }
    else { const d = T - 4.33; PB.burst(ctx, bx, by, 260 * Math.min(1, d * 5), Math.max(0, 1 - d * 0.8), '255,140,60'); for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.5; ctx.fillStyle = '#FFB070'; ctx.beginPath(); ctx.arc(bx + Math.cos(a) * d * 120, by + Math.sin(a) * d * 120 + d * d * 80, 8, 0, 7); ctx.fill(); } }
    // crosshair locking in one step per beat
    const steps = Math.min(4, Math.floor((T - 2.5) / 0.5) + 1), lockR = [220, 150, 95, 50][steps - 1];
    if (!hit) {
      const col = steps >= 4 ? '#FF5A40' : '#F2C230';
      L.inkCircle(ctx, bx, by, lockR, { width: 4, color: col, seed: 240 });
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) L.inkPath(ctx, [[bx + dx * lockR * 0.6, by + dy * lockR * 0.6], [bx + dx * lockR * 1.3, by + dy * lockR * 1.3]], { width: 4, color: col, seed: 241 + dx * 3 + dy, taper: 0 });
      if (steps >= 4) PB.label(ctx, 'LOCK', bx + 70, by + 90, 1, { col: '#FF7A5A', size: 26 });
    }
    // missile streak from the bottom-left
    if (T > 4.0 && T < 4.45) { const u = L.clamp((T - 4.0) / 0.33); PB.beam(ctx, [cx - 380, cy + 300], [L.lerp(cx - 380, bx, u), L.lerp(cy + 300, by, u)], { T, w: 5, dots: false, k: 1 }); }
    // BY MISTAKE? stamp
    const st = L.clamp((T - 5.03) / 0.07);
    if (st > 0) {
      ctx.save(); ctx.translate(cx, cy + 260); ctx.rotate(-0.15); const g = 1 + 0.5 * (1 - L.ease.outCubic(st)); ctx.scale(g, g); ctx.globalAlpha = L.clamp(st * 1.5);
      L.inkPath(ctx, L.rrectPts(-330, -80, 660, 160, 14), { closed: true, width: 10, color: PB.RED, seed: 250 });
      L.text(ctx, 'BY MISTAKE?', 0, 6, { size: 96, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: PB.RED, tracking: '0.04em' });
      ctx.restore();
    }
  } });
})();
