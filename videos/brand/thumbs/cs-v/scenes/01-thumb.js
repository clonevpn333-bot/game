// WHY WE WONDER · ep5 vertical cover: the 3D skull in its tiara, eyes burning, in a candle-lit nave.
(function () {
  'use strict';
  FILM.scene({ id: 'thumb', draw(ctx) {
    const L = FILM.lib, D = FILM.df, C = D.C, T = 12.2;
    D.nave(ctx, T, { z: 1200, y: -200, f: 900, cy: 1050 });
    ctx.fillStyle = 'rgba(6,4,8,0.55)'; ctx.fillRect(0, 0, 1080, 1920);
    D.glow(ctx, 540, 1250, 1000, C.candle, 0.7);
    D.glow(ctx, 900, 600, 700, '#A11F22', 0.5);
    D.skull3d(ctx, 540, 1130, 760, { yaw: -0.22, pitch: 0.1, roll: -0.05, jaw: 0.45, ember: 1, res: 0.55 });
    D.candle(ctx, 130, 1600, 1.3, T, { seed: 2, h: 300 });
    D.candle(ctx, 950, 1640, 1.2, T + 1, { seed: 5, h: 280 });
    D.fog(ctx, T, { y: 1750, h: 500, a: 0.35 });
    D.grain(ctx, T, 0.8);
    D.stamp(ctx, 'DEAD POPE', 540, 175, 150, 1, { color: C.bone, glowCol: 'rgba(255,70,30,0.85)', blur: 30 });
    D.stamp(ctx, 'ON TRIAL', 540, 1690, 150, 1, { color: '#FF3B30', glowCol: 'rgba(255,30,10,0.9)', blur: 40 });
    L.text(ctx, 'WHY WE WONDER', 540, 1850, { size: 30, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: C.bone, alpha: 0.8, tracking: '0.4em' });
  } });
})();
