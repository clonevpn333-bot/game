// 01 · teaspoon · T 0–3.75 · HOOK. Frame 0: a glowing teaspoon is already falling onto a balance; it slams the
// left pan down (0.3). "weighs" (1.63) → ≈ 1 BILLION TONS counts up. "Mount Everest" (2.65) → the mountain drops
// onto the right pan and the beam swings level (2.9): one spoon = one mountain.
(function () {
  'use strict';
  const MONO = '"JetBrains Mono", monospace', SERIF = '"Fraunces", Georgia, serif';
  const spring = (d, k = 9, w = 16) => (d < 0 ? 0 : 1 - Math.exp(-k * d) * Math.cos(w * d));
  FILM.scene({ id: 'teaspoon', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, SP = FILM.sp, M = FILM.mk;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    // impacts → shake
    let sh = 0;
    for (const h of [0.3, 2.85]) { const d = T - h; if (d >= 0 && d < 0.3) sh = Math.max(sh, (1 - d / 0.3) * 18); }
    const z = 1.24 - 0.04 * L.ease.inOutSine(t / info.dur);
    SP.space(ctx, T, { zoom: 1.1, oy: -40 * t });
    ctx.save();
    ctx.translate(540 + sh * Math.sin(T * 97), 800 + sh * Math.cos(T * 83)); ctx.scale(z, z); ctx.translate(-540, -800);
    // beam angle: 0 → −0.36 (spoon lands) → 0 (Everest lands)
    const ang = -0.3 * spring(T - 0.3) * (1 - spring(T - 2.85, 7, 14));
    const pans = SP.balance(ctx, 540, 600, ang, { half: 270, drop: 250, post: 640 });
    // the spoon: falls from the top until 0.3, then rides the left pan
    const fall = L.ease.inQuad(L.clamp((T + 0.12) / 0.42));
    const sx = pans.L[0] + 30, sy = T < 0.3 ? L.lerp(-150, pans.L[1] - 34, fall) : pans.L[1] - 34;
    if (T < 0.3) { ctx.strokeStyle = 'rgba(242,232,208,0.5)'; ctx.lineWidth = 3; for (const dx of [-60, 0, 60]) { ctx.beginPath(); ctx.moveTo(sx + dx, sy - 260); ctx.lineTo(sx + dx, sy - 90); ctx.stroke(); } }
    SP.spoon(ctx, sx, sy, 0.72, -0.08);
    const pulse = 1 + 0.08 * Math.sin(T * 9);
    SP.star(ctx, 'ns', sx, sy - 4, 32 * pulse, T * 2, { glow: 1.8, glowR: 5, slot: 1 });
    // Everest drops on "Mount"
    if (T > 2.5) {
      const ef = L.ease.inQuad(L.clamp((T - 2.5) / 0.35));
      const ey = T < 2.85 ? L.lerp(-300, pans.R[1] + 10, ef) : pans.R[1] + 10;
      SP.everest(ctx, pans.R[0], ey, 0.78);
    }
    // impact rings
    for (const [h, p] of [[0.3, pans.L], [2.85, pans.R]]) {
      const d = T - h;
      if (d > 0 && d < 0.5) { ctx.strokeStyle = L.rgba(P.hcYellow, 1 - d / 0.5); ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(p[0], p[1] + 20, 160 + d * 500, 30 + d * 90, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    // labels (inside the camera)
    const la = L.clamp((T - 0.4) / 0.2);
    L.text(ctx, '1 TEASPOON', 270, 1080, { size: 40, family: MONO, weight: 600, align: 'center', color: P.hcIvory, alpha: la, tracking: '0.12em' });
    const wk = L.clamp((T - 1.63) / 0.85);
    if (wk > 0) {
      const v = Math.round(1e9 * L.ease.outCubic(wk));
      L.text(ctx, v.toLocaleString('en-US'), 270, 1142, { size: 44, family: SERIF, weight: 600, align: 'center', color: P.hcYellow, alpha: L.clamp(wk * 4) });
      L.text(ctx, 'TONS', 270, 1188, { size: 30, family: MONO, weight: 600, align: 'center', color: P.hcYellow, alpha: L.clamp(wk * 4), tracking: '0.3em' });
    }
    const ea = L.clamp((T - 2.9) / 0.2);
    L.text(ctx, 'MT. EVEREST', 810, 1080, { size: 40, family: MONO, weight: 600, align: 'center', color: P.hcIvory, alpha: ea, tracking: '0.12em' });
    // the big equals
    const eq = L.ease.outBack(L.clamp((T - 3.0) / 0.25));
    if (eq > 0) {
      ctx.fillStyle = P.hcNavyDeep; ctx.beginPath(); ctx.arc(540, 1095, 62 * eq, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = P.hcYellow; ctx.lineWidth = 4; ctx.stroke();
      L.text(ctx, '=', 540, 1099, { size: 120 * eq, family: SERIF, weight: 600, align: 'center', baseline: 'middle', color: P.hcYellow });
    }
    ctx.restore();
  } });
})();
