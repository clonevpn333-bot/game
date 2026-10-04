// 02 · reveal · T 3.75–5.25 · the spoon's glow rushes up into a full 3D neutron star; its magnetic field draws on
// as curiosity lines; NEUTRON STAR locks on "neutron" (4.36).
(function () {
  'use strict';
  FILM.scene({ id: 'reveal', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, SP = FILM.sp, M = FILM.mk;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const g = L.ease.outExpo(L.clamp(t / 0.45));
    SP.space(ctx, T, { zoom: L.lerp(1.8, 1.05, g) });
    const C = [540, 820], R = L.lerp(40, 300, g);
    SP.field(ctx, C[0], C[1], R, -0.25, L.clamp((T - 4.15) / 0.8));
    SP.beams(ctx, C[0], C[1], -Math.PI / 2 - 0.25, 1100, 0.35 * L.clamp((T - 4.4) / 0.3));
    SP.star(ctx, 'ns', C[0], C[1], R, T * 0.9, { glow: 1.2, glowR: 2.2 });
    L.guideCircle(ctx, C[0], C[1], R + 40, { alpha: 0.3 * g, width: 1.5, cross: 22, quadrants: 14 });
    const a = L.clamp((T - 4.36) / 0.2);
    M.label(ctx, 'NEUTRON STAR', 540, 1290, { size: 52, align: 'center', alpha: a, p: a, color: P.hcIvory });
  } });
})();
