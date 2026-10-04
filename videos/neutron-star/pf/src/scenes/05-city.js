// 05 · city · T 10.25–12.0 · top-down blueprint city; the squeezed ball rushes in and hovers over it, exactly
// city-sized. "city" (11.56) → ≈ 20 KM bracket.
(function () {
  'use strict';
  FILM.scene({ id: 'city', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, SP = FILM.sp, M = FILM.mk;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    ctx.fillStyle = '#060B1C'; ctx.fillRect(0, 0, 1080, 1920);
    const z = L.lerp(0.95, 0.82, L.ease.inOutSine(t / info.dur));
    ctx.save(); ctx.translate(540, 1080); ctx.scale(1, 0.62); ctx.rotate(0.12 - 0.05 * t); ctx.translate(-540, -1080);
    SP.city(ctx, 540, 1080, z * 2.2, 1);
    ctx.restore();
    const v = ctx.createRadialGradient(540, 1080, 380, 540, 1080, 1150); v.addColorStop(0, 'rgba(6,11,28,0)'); v.addColorStop(1, 'rgba(6,11,28,0.95)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, 1080, 1920);
    // the ball hovers above; its footprint (same radius) is projected onto the city
    const hz = ctx.createLinearGradient(0, 250, 0, 700); hz.addColorStop(0, 'rgba(6,11,28,1)'); hz.addColorStop(1, 'rgba(6,11,28,0)'); ctx.fillStyle = hz; ctx.fillRect(0, 0, 1080, 700);
    const land = L.ease.outCubic(L.clamp((T - 10.3) / 0.5));
    const R = 210 * L.lerp(2.4, 1, land), C = [540, 560 + 80 * (1 - land)];
    const F = [540, 1080], fp = L.clamp((T - 10.6) / 0.35);
    if (fp > 0) {
      ctx.save();
      ctx.fillStyle = L.rgba(P.hcYellow, 0.16 * fp); ctx.beginPath(); ctx.ellipse(F[0], F[1], 210, 210 * 0.62, 0, 0, Math.PI * 2); ctx.fill();
      ctx.setLineDash([14, 10]); ctx.strokeStyle = L.rgba(P.hcYellow, fp); ctx.lineWidth = 4; ctx.stroke();
      ctx.strokeStyle = L.rgba(P.hcYellow, 0.55 * fp); ctx.lineWidth = 2;
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(F[0] + s * 210, C[1]); ctx.lineTo(F[0] + s * 210, F[1]); ctx.stroke(); }
      ctx.restore();
    }
    SP.star(ctx, 'ns', C[0], C[1], R, T * 1.2, { glow: 1.0, glowR: 1.9 });
    const b = L.clamp((T - 11.45) / 0.3);
    if (b > 0) {
      L.bracket(ctx, F[0] - 210, F[1] + 175, F[0] + 210, F[1] + 175, { color: P.hcYellow, alpha: 1, width: 4, p: b });
      L.text(ctx, '≈ 20 KM', 540, F[1] + 265, { size: 64, family: '"Fraunces", Georgia, serif', weight: 600, align: 'center', color: P.hcYellow, alpha: b });
    }
    M.label(ctx, 'MORE MASS THAN THE SUN', 540, 250, { size: 32, align: 'center', alpha: L.clamp((T - 10.4) / 0.25) });
  } });
})();
