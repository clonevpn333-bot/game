// 03 · supernova · T 5.25–8.0 · a red giant fills the frame; "crushed" (5.62) → blueprint arrows drive it inward and
// it collapses to a white-hot core (6.3); "exploded" (7.34) → supernova; only the tiny neutron star is left.
(function () {
  'use strict';
  FILM.scene({ id: 'supernova', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, SP = FILM.sp, M = FILM.mk;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    let sh = 0; { const d = T - 7.34; if (d >= 0 && d < 0.5) sh = (1 - d / 0.5) * 26; }
    const col = L.clamp((T - 5.62) / 0.7);
    const shake2 = T > 6.3 && T < 7.34 ? 3 + 6 * (T - 6.3) : 0;
    const ox = sh * Math.sin(T * 91) + shake2 * Math.sin(T * 130), oy = sh * Math.cos(T * 77);
    SP.space(ctx, T, { zoom: 1.08, ox: ox * 0.5, oy: oy * 0.5 });
    const C = [540 + ox, 820 + oy];
    const R = T < 7.34 ? L.lerp(470, 34, L.ease.inCubic(col)) : 34;
    if (T < 7.34) {
      SP.star(ctx, 'giant', C[0], C[1], R, T * 0.25, { glow: 1, glowR: 1.8, heat: 0.9 * col * col, glowColor: col > 0.8 ? '#FFE0B0' : undefined });
      // inward arrows on "crushed"
      const aa = L.clamp((T - 5.55) / 0.15) * (1 - L.clamp((T - 6.4) / 0.2));
      if (aa > 0) for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + 0.2, r0 = R + 150, r1 = R + 40;
        FILM.hc.line(ctx, [[C[0] + Math.cos(a) * r0, C[1] + Math.sin(a) * r0], [C[0] + Math.cos(a) * r1, C[1] + Math.sin(a) * r1]], { plate: 'blueprint', width: 5, seed: 40 + k, head: true, alpha: aa });
      }
      M.label(ctx, 'GIANT STAR', 540, 230, { size: 34, align: 'center', alpha: L.clamp((T - 5.3) / 0.2) * (1 - col) });
      const ca = L.clamp((T - 6.3) / 0.2);
      if (ca > 0) { L.guideCircle(ctx, C[0], C[1], 90, { alpha: 0.5 * ca, width: 2, dash: [6, 8] }); M.label(ctx, 'CORE', 540, 980, { size: 34, align: 'center', alpha: ca }); }
    } else {
      SP.burst(ctx, C[0], C[1], (T - 7.34) / 0.75, { R: 1000, seed: 3 });
      SP.star(ctx, 'ns', C[0], C[1], 34, T * 3, { glow: 2, glowR: 5, slot: 1 });
    }
  } });
})();
