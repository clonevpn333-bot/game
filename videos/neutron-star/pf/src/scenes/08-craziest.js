// 08 · craziest · T 21.25–23.0 · "But here's the craziest part" — the curiosity line writes a huge question mark
// across the starfield; the dot lands on "part" (22.68). Two faint stars circle in the background (setup for 09).
(function () {
  'use strict';
  FILM.scene({ id: 'craziest', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, SP = FILM.sp;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    SP.space(ctx, T, { zoom: 1.15 - 0.08 * t / info.dur });
    for (let k = 0; k < 2; k++) { const a = T * 2.2 + k * Math.PI; SP.star(ctx, 'ns', 540 + Math.cos(a) * 160, 1500 + Math.sin(a) * 50, 10, 0, { glow: 1.3, glowR: 5, slot: 2 + k }); }
    const q = FILM.hc.question(540, 760, 820);
    const u = L.ease.inOutCubic(L.clamp((T - 21.35) / 1.25));
    FILM.hc.line(ctx, q.hook, { plate: 'blueprint', to: Math.max(0.02, u), width: 16, seed: 81, head: u < 1, wobble: 0.8 });
    const d = L.ease.outBack(L.clamp((T - 22.66) / 0.2));
    if (d > 0) L.glowDot(ctx, q.dot[0], q.dot[1], q.dotR * 1.3 * d, { color: P.hcYellow, core: '#FFF6D8', rays: 8, rayLen: 18, glow: 30, additive: true });
  } });
})();
