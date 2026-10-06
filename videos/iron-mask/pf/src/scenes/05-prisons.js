// 05 · prisons · T 15.65–18.75 · an engraved map of France: four forts pop up numbered 1–4 on "Four prisons", the
// curiosity line threads the route (Pignerol → Exilles → Sainte-Marguerite → the Bastille) with the mask riding it.
(function () {
  'use strict';
  const FR = [[560, 330], [700, 380], [880, 560], [920, 800], [900, 1150], [840, 1330], [760, 1400], [600, 1420], [520, 1420], [330, 1340], [300, 1150], [260, 860], [160, 700], [220, 620], [360, 560], [420, 450]];
  const FORTS = [[960, 1110, 'PIGNEROL', 1669], [870, 1000, 'EXILLES', 1681], [820, 1470, 'STE-MARGUERITE', 1687], [600, 600, 'THE BASTILLE', 1698]];
  FILM.scene({ id: 'prisons', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    D.plate(ctx, { color: '#0C1430' });
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.0, spacing: 8, width: 1, color: '#5A6A9A', alpha: 0.6, seed: 41, length: [40, 160] });
    D.engrave(ctx, FR, { ink: '#E8DCC0', base: '#1A1A2A', light: (x, y) => L.clamp(0.55 - Math.hypot(x - 450, y - 700) / 2400), angle: -0.8, spacing: 5, seed: 42, outW: 3.4 });
    L.text(ctx, 'FRANCE', 520, 980, { size: 54, family: '"Fraunces", serif', weight: 700, align: 'center', color: '#2A2A3A', tracking: '0.3em' });
    // route
    const route = L.smoothPts(FORTS.map(([x, y]) => [x, y]), false, 6);
    const ru = L.ease.inOutCubic(L.clamp((T - 16.0) / 2.2));
    if (ru > 0) FILM.hc.line(ctx, route, { plate: 'blueprint', to: Math.max(0.02, ru), width: 5, seed: 43 });
    FORTS.forEach(([x, y, name], i) => {
      const a = L.ease.outBack(L.clamp((T - 15.83 - i * 0.16) / 0.25));
      if (a <= 0) return;
      ctx.save(); ctx.translate(x, y); ctx.scale(a, a);
      D.engrave(ctx, [[-22, 0], [-22, -50], [-30, -50], [-30, -66], [-14, -66], [-14, -58], [-4, -58], [-4, -66], [12, -66], [12, -58], [22, -58], [22, -66], [30, -66], [30, -50], [22, -50], [22, 0]], { ink: C.bone, light: () => 0.7, spacing: 3, seed: 50 + i, outW: 2, smooth: false, cross: false, stip: false });
      ctx.restore();
      L.inkPath(ctx, L.ellipsePts(x - 48, y - 86, 22, 22, 20), { closed: true, width: 2.5, color: '#000', fill: C.yellow, seed: 60 + i });
      L.text(ctx, String(i + 1), x - 48, y - 77, { size: 28, family: '"JetBrains Mono", monospace', weight: 700, align: 'center', color: '#0C1430' });
      L.text(ctx, name, x + (i === 3 ? -40 : 0), y + 36, { size: 22, family: '"JetBrains Mono", monospace', weight: 600, align: i === 3 ? 'right' : 'center', color: C.ivory, alpha: a, tracking: '0.1em' });
    });
    // the mask rides the route on "Always masked"
    const mu = L.clamp((T - 17.4) / 1.2);
    if (mu > 0) { const n = route.length - 1, p = route[Math.min(n, Math.floor(mu * n))]; D.maskIcon(ctx, p[0], p[1] - 40, 1.3, 70); }
    D.grain(ctx, T, 0.9);
    D.word(ctx, '4 PRISONS', 540, 210, 120, (T - 15.83) / 0.16, { seed: 14 });
    D.word(ctx, '1 JAILER', 540, 1490, 90, (T - 16.97) / 0.16, { color: C.yellow, under: false, seed: 15 });
  } });
})();
