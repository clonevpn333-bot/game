// 06 · spin · T 12.0–16.5 · the pulsar: rotation ramps from lazy to a blur; twin beams sweep like a lighthouse and
// flash the frame when they face us. "seven hundred" (14.75–16.05) → counter climbs to 716 / SECOND.
(function () {
  'use strict';
  // integrated spin angle: ω ramps 1 → 6 rad/s at "spins" (12.77), then to 60 by 16
  const phase = (T) => {
    let a = 0, x = 12.0;
    const w = (u) => (u < 12.77 ? 1 : u < 13.6 ? 6 : 6 + 54 * Math.min(1, (u - 13.6) / 2.4));
    for (; x < T; x += 1 / 96) a += w(x) / 96;
    return a;
  };
  FILM.scene({ id: 'spin', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, SP = FILM.sp, M = FILM.mk;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const ph = phase(T);
    const fast = L.clamp((T - 13.6) / 2.0);
    const flash = Math.pow(Math.max(0, Math.cos(ph * 1.0)), 30) * (0.15 + 0.35 * fast);
    SP.space(ctx, T, { zoom: 1.05 + 0.03 * Math.sin(T) });
    const C = [540, 860], R = 270;
    const ax = -Math.PI / 2 + 0.55 * Math.sin(ph);
    SP.field(ctx, C[0], C[1], R, ax + Math.PI / 2, 1, { sq: Math.abs(Math.cos(ph)) * 0.8 + 0.2, alpha: 0.6 });
    SP.beams(ctx, C[0], C[1], ax, 1400, 0.45 + 0.55 * Math.abs(Math.cos(ph)), { spread: 0.1 + 0.05 * fast });
    SP.star(ctx, 'ns', C[0], C[1], R, ph, { glow: 1.1, glowR: 2.0, tilt: 0.2 });
    // motion-blur latitude streaks once it's fast
    if (fast > 0) {
      ctx.save(); ctx.beginPath(); ctx.arc(C[0], C[1], R, 0, Math.PI * 2); ctx.clip();
      ctx.strokeStyle = `rgba(230,240,255,${0.35 * fast})`; ctx.lineWidth = 3;
      for (let k = -6; k <= 6; k++) { const y = C[1] + (k / 7) * R; const hw = Math.sqrt(Math.max(0, R * R - (y - C[1]) ** 2)); ctx.beginPath(); ctx.ellipse(C[0], y, hw, 10, 0, 0, Math.PI); ctx.stroke(); }
      ctx.restore();
    }
    if (flash > 0.01) { ctx.fillStyle = `rgba(210,235,255,${flash})`; ctx.fillRect(0, 0, 1080, 1920); }
    // counter
    const ca = L.clamp((T - 14.6) / 0.2);
    if (ca > 0) {
      const v = Math.round(716 * L.ease.outCubic(L.clamp((T - 14.75) / 1.3)));
      L.text(ctx, String(v), 540, 330, { size: 200, family: '"Fraunces", Georgia, serif', weight: 600, align: 'center', baseline: 'middle', color: P.hcYellow, alpha: ca });
      M.label(ctx, 'SPINS PER SECOND', 540, 470, { size: 34, align: 'center', alpha: ca, p: ca });
    }
  } });
})();
