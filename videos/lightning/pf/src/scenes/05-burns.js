// 05 · burns · T 13.25–17.25 · Roy close. EYEBROWS (14.19): a sizzle of sparks across his brow, smoke. A strike (14.75)
// and his hair is ON FIRE — engraved flames licking out under the hat brim (15.4). TWICE (16.38): struck again, flames again.
(function () {
  'use strict';
  function flames(ctx, L, D, PB, x, y, w, T, k, seed) {
    if (k <= 0) return;
    PB.burst(ctx, x, y - 80, w * 1.1, 0.8 * k, '255,140,50');
    for (const layer of [0, 1]) for (let i = 0; i < 11; i++) {
      const fx = x - w / 2 + (i + 0.5) * (w / 11), n = L.noise1(T * 7, seed + i + layer * 50), h = (layer ? 110 : 190) * (0.7 + 0.5 * n) * k, sway = 26 * Math.sin(T * 10 + i * 1.7);
      const pts = [[fx - 30, y], [fx - 22 + sway * 0.3, y - h * 0.4], [fx - 6 + sway * 0.7, y - h * 0.75], [fx + sway, y - h], [fx + 10 + sway * 0.6, y - h * 0.62], [fx + 22 + sway * 0.2, y - h * 0.3], [fx + 30, y]];
      D.engrave(ctx, pts, { ink: layer ? '#FFF2C0' : '#FFB040', base: layer ? '#FF8A20' : '#B8380E', light: () => 0.75, angle: 1.5, spacing: 3, seed: seed + i + layer * 20, outW: 1.5, cross: false, stip: false });
    }
    const rs = L.rng(L.hash('embers9', Math.floor(T * 12))); for (let i = 0; i < 18; i++) { const ex = x - w / 2 + rs() * w, ey = y - 60 - rs() * 260 * k; ctx.fillStyle = `rgba(255,${180 + rs() * 60},90,${0.9 * k})`; ctx.beginPath(); ctx.arc(ex, ey, 2 + rs() * 3, 0, 6.283); ctx.fill(); }
  }
  FILM.scene({ id: 'burns', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const hits = [14.75, 16.38];
    let fk = 0, hi = -1; hits.forEach((h, j) => { const d = T - h; if (d >= 0 && d < 0.5) { fk = Math.max(fk, Math.exp(-d * 8)); hi = j; } });
    PB.plate(ctx, { seed: 950, color: '#0A0C18' });
    PB.flash(ctx, fk * 0.5, 540, 0);
    PB.motes(ctx, T, { n: 50, seed: 6, vy: -80, alpha: 0.5, col: '255,180,110' });
    const sh = fk * 16, z = 1.15 + 0.06 * (T - 13.25);
    ctx.save(); ctx.translate(540 + Math.sin(T * 91) * sh, 1180 + Math.cos(T * 77) * sh); ctx.scale(z, z); ctx.translate(-540, -1180);
    const HO = { yaw: 0.25 + 0.1 * Math.sin(T), hat: true, key: [-0.3, 0.5, 0.8], rim: [0.7, 0.4, -0.3], res: 0.32, slot: 4, warm: [1.1 + 0.3 * fk, 0.95, 0.9] };
    const P = PB.headProj(540, 1180, 800, HO), hit = [0.1, 1.28, -0.05];
    // hair on fire: a 3D ring of flames round the hat crown — the back half burns BEHIND his head, the front half in front
    const f1 = L.clamp((T - 14.85) / 0.3) * (1 - L.clamp((T - 16.1) / 0.3)), f2 = L.clamp((T - 16.45) / 0.25), fire = Math.max(f1, f2) * 1.3;
    const eb = L.clamp((T - 14.15) / 0.5), brow = [0, 0.05, 0.85];
    const bd = hi >= 0 ? T - hits[hi] : -1, BO = { seed: 90 + hi, k: bd < 0.07 ? 1 : Math.max(0, 0.7 - bd * 2), w: 0.06, branches: 5 }, sky = [hi ? 2.5 : -2.5, 9, -2];
    const layer = (Lr) => {
      PB.fx.fire3d(ctx, P, [0, 0.62, -0.05], 0.8, T, fire, Lr, 5);
      PB.fx.smoke3d(ctx, P, [0, 0.9, -0.05], T, Math.max(fire * 0.8, T > 14.2 ? 0.5 : 0), Lr, 7);
      PB.fx.sparks3d(ctx, P, brow, T - 14.15, { seed: 33, n: 40 }, Lr);
      if (hi >= 0 && bd < 0.4) { PB.fx.bolt3d(ctx, P, sky, hit, BO, Lr); PB.fx.sparks3d(ctx, P, hit, bd, { seed: 40 + hi, n: 50 }, Lr); }
    };
    layer('back');
    PB.head(ctx, 540, 1180, 800, HO);
    layer('front');
    if (eb > 0 && eb < 1) { const b = P(...brow); PB.burst(ctx, b[0], b[1], 220, 0.8 * (1 - eb), '255,190,110'); }
    if (hi >= 0 && bd < 0.4) { const tp = P(...hit); PB.burst(ctx, tp[0], tp[1], 280, Math.exp(-bd * 7), '200,215,255'); }
    ctx.restore();
    PB.ambient(ctx, T, { seed: 5, flash: false });
    if (T > 14.75) { PB.label(ctx, '1972', 80, 1340, (T - 14.78) / 0.08, { size: 34 }); PB.label(ctx, 'STRIKE #4', 80, 1410, (T - 14.82) / 0.08, { size: 28, col: PB.IV }); }
    if (T > 16.38) { PB.label(ctx, '1973', 700, 1340, (T - 16.41) / 0.08, { size: 34 }); PB.label(ctx, 'STRIKE #5', 700, 1410, (T - 16.45) / 0.08, { size: 28, col: PB.IV }); }
  } });
})();
