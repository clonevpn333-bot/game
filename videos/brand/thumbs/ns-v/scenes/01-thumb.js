// WHY WE WONDER · ep4 thumbnail (shared by the vertical 1080×1920 cover and the 16:9 1280×720 thumb)
(function () {
  'use strict';
  FILM.scene({ id: 'thumb', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, SP = FILM.sp, M = FILM.mk;
    const W = ctx.canvas.width, H = ctx.canvas.height, V = H > W;
    const T = 4.2;
    // space background stretched to the canvas
    ctx.save(); ctx.scale(W / 1080, H / 1920); SP.space(ctx, T, { zoom: 1.1 }); ctx.restore();
    const S = V ? 1 : 0.62;
    const C = V ? [560, 1010] : [870, 360];
    const R = 330 * S;
    SP.beams(ctx, C[0], C[1], -Math.PI / 2 - 0.45, 1500 * S, 0.8, { spread: 0.12 });
    SP.field(ctx, C[0], C[1], R, -0.45, 1, { width: 4 * S, alpha: 0.85 });
    SP.star(ctx, 'ns', C[0], C[1], R, 1.3, { glow: 1.6, glowR: 2.4, heat: 0.14 });
    // the spoon in the foreground, holding a white-hot blob
    const sp = V ? [380, 1560, 1.55, -0.32] : [330, 520, 1.0, -0.3];
    SP.spoon(ctx, sp[0], sp[1], sp[2], sp[3]);
    SP.star(ctx, 'ns', sp[0], sp[1] - 6 * sp[2], 52 * sp[2], 2.0, { glow: 2.2, glowR: 4, heat: 0.15, slot: 1 });
    M.callout(ctx, sp[0], sp[1] - 6 * sp[2], 120 * sp[2], 1, { color: P.hcYellow, width: 7 * sp[2], seed: 9 });
    // headline
    const F = '"Fraunces", Georgia, serif';
    const shadow = (fn) => { ctx.save(); ctx.shadowColor = 'rgba(3,5,12,0.95)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 6; fn(); ctx.restore(); };
    if (V) {
      shadow(() => L.text(ctx, '1 SPOON', 540, 300, { size: 190, family: F, weight: 800, align: 'center', color: P.hcIvory }));
      shadow(() => L.text(ctx, '= EVEREST', 540, 480, { size: 150, family: F, weight: 800, align: 'center', color: P.hcYellow }));
      L.text(ctx, 'WHY WE WONDER', 540, 1820, { size: 34, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: P.hcIvory, alpha: 0.85, tracking: '0.4em' });
    } else {
      shadow(() => L.text(ctx, '1 SPOON', 40, 150, { size: 128, family: F, weight: 800, color: P.hcIvory }));
      shadow(() => L.text(ctx, '= EVEREST', 40, 270, { size: 104, family: F, weight: 800, color: P.hcYellow }));
    }
  } });
})();
