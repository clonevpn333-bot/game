// 04 · the-crowd · T 9.75–15 · stamped dancers multiply 1 → 30 (12.37) → hundreds (14.32); counter PiP; porthole
(function () {
  'use strict';
  const PH = [880, 1210, 120];
  FILM.scene({ id: 'the-crowd', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, W = FILM.wc, M = FILM.mk;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const tw = info.shot.start + L.onTwos(t);
    W.street(ctx, T, { rows: 4, vy: 700 });
    // how many are dancing
    const n = T < 12.37 ? Math.round(1 + 29 * L.ease.inQuad(L.clamp((T - 10.0) / 2.37))) : Math.round(30 + 370 * L.ease.inCubic(L.clamp((T - 12.6) / 1.75)));
    const shown = Math.min(n, 160);
    const r = L.rng(L.hash('crowd'));
    const pos = [];
    for (let i = 0; i < 160; i++) { const k = Math.pow(r(), 0.7); pos.push([540 + (r() - 0.5) * L.lerp(220, 1300, k), L.lerp(760, 1880, k), L.lerp(0.08, 0.5, k), r() * 6, r() > 0.5]); }
    pos.slice(0, shown).sort((a, b) => a[1] - b[1]).forEach(([x, y, s, ph, man]) => W.dancer(ctx, x, y, s, (tw - 7) * 9 + ph, { kind: man ? 'man' : 'woman', flip: ph > 3 }));
    // counter PiP
    const pp = L.clamp((T - 10.4) / 0.3);
    M.pip(ctx, { kind: 'rect', x: 80, y: 220, w: 420, h: 240, p: pp, label: 'DANCERS', plate: 'paper' }, (g) => {
      g.fillStyle = P.parch; g.fillRect(80, 220, 420, 240);
      L.text(g, String(n), 290, 345, { size: 150, family: '"Fraunces", Georgia, serif', weight: 600, align: 'center', baseline: 'middle', color: n > 30 ? P.wcRed : P.wcInk });
    });
    W.frame(ctx);
  } });
  FILM.scene({ id: 'the-crowd-fg', draw(ctx) { FILM.wc.porthole(ctx, PH[0], PH[1], PH[2], { ring: true }); } });
})();
