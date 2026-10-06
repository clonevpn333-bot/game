// 04 · order · T 11.1–15.65 · the written order inks itself line by line on parchment; on "kill him" (14.75) the phrase
// is circled in red and translated big: IF HE TALKS → KILL HIM. Saint-Mars, the jailer, stands right; hand to hilt.
(function () {
  'use strict';
  FILM.scene({ id: 'order', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    D.plate(ctx);
    const lit = D.lights([{ x: 300, y: 700, r: 1100, k: 0.55 }, { x: 900, y: 1300, r: 700, k: 0.35 }], 0.05);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.08, spacing: 6.5, width: 1, color: '#9A8C80', alpha: 0.7, seed: 31, density: (x, y) => lit(x, y) * 0.6 });
    // the letter (slightly rotated)
    ctx.save(); ctx.translate(360, 700); ctx.rotate(-0.06); ctx.scale(0.88, 0.88);
    L.paper(ctx, { x: -300, y: -440, w: 600, h: 860, color: '#DCCBA4', seed: 33, vignette: 0.5 });
    L.inkPath(ctx, [[-300, -440], [300, -440], [300, 420], [-300, 420]], { closed: true, width: 2.4, color: '#5A4A2A', seed: 34, smooth: false });
    const lines = 11;
    for (let i = 0; i < lines; i++) {
      const u = L.clamp((T - 11.3 - i * 0.24) / 0.35);
      if (u <= 0) continue;
      const y = -360 + i * 66, pts = [];
      for (let x = -250; x <= -250 + 500 * u; x += 6) pts.push([x, y + Math.sin(x * 0.21 + i) * 7 + Math.sin(x * 0.07) * 3]);
      if (pts.length > 1) L.inkPath(ctx, pts, { width: 2.2, color: i === 7 ? '#7A1414' : '#2A1A0C', seed: 1000 + i, taper: [4, 8], wobble: 1.5 });
    }
    L.text(ctx, 'Saint-Mars —', -250, -400, { size: 30, family: '"Fraunces", serif', weight: 600, color: '#2A1A0C', alpha: L.clamp((T - 11.2) / 0.2) });
    const kc = L.clamp((T - 14.6) / 0.3);
    if (kc > 0) FILM.mk.callout(ctx, 0, -360 + 7 * 66, 280, kc, { color: '#C8221A', width: 6, seed: 9 });
    ctx.restore();
    // the jailer
    D.person(ctx, 820, 1860, 2.5, T, { light: lit, hilt: L.ease.inOutCubic(L.clamp((T - 14.5) / 0.35)), seed: 11 });
    D.grain(ctx, T, 1);
    const MONO = '"JetBrains Mono", monospace';
    L.text(ctx, 'THE ORDER', 380, 250, { size: 40, family: MONO, weight: 600, align: 'center', color: C.ivory, alpha: L.clamp((T - 11.2) / 0.2), tracking: '0.3em' });
    L.text(ctx, 'SAINT-MARS · HIS JAILER', 800, 920, { size: 26, family: MONO, weight: 600, align: 'center', color: C.gold, alpha: L.clamp((T - 11.6) / 0.25), tracking: '0.16em' });
    D.word(ctx, 'IF HE TALKS', 330, 1170, 80, (T - 12.4) / 0.2, { under: false, seed: 12 });
    D.word(ctx, 'KILL HIM', 330, 1295, 120, (T - 14.75) / 0.14, { color: '#E8443A', seed: 13 });
  } });
})();
