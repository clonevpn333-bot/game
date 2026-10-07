// WHY WE WONDER · ep7 vertical cover: the engraved 3D head with the proton beam tearing straight through it.
(function () {
  'use strict';
  FILM.scene({ id: 'thumb', draw(ctx) {
    const L = FILM.lib, PB = FILM.pb, T = 0.5;
    PB.plate(ctx, { seed: 11 });
    for (let i = 0; i < 9; i++) L.inkPath(ctx, L.ellipsePts(540, 2600, 900 + i * 120, 900 + i * 120, 140).filter((p) => p[1] < 1920 && p[1] > -20), { width: 1.2, color: '#5C78B8', alpha: 0.25, seed: 11 + i, closed: false });
    const r = PB.head(ctx, 500, 1080, 980, { yaw: 1.3, key: [-0.2, 0.45, 0.85], res: 0.6, spacing: 6.5, slot: 1 });
    const a = r.proj(...PB.BEAM_IN), b = r.proj(...PB.BEAM_OUT);
    const [p, q] = PB.extend(a, b, 2400);
    PB.beam(ctx, p, q, { T, w: 8 });
    PB.beam(ctx, a, b, { T, w: 5, k: 0.4, dots: false });
    PB.burst(ctx, a[0], a[1], 280, 0.9); PB.burst(ctx, b[0], b[1], 340, 1);
    PB.rays(ctx, b[0], b[1], 30, 260, 20, 0.9, 3, PB.Y, T);
    PB.word(ctx, 'A PARTICLE BEAM', 540, 170, 90, 1);
    PB.word(ctx, 'WENT THROUGH', 540, 290, 102, 1, { color: PB.Y });
    PB.word(ctx, 'HIS HEAD', 540, 420, 146, 1, { color: PB.Y });
    const g = ctx.createLinearGradient(0, 1500, 0, 1920); g.addColorStop(0, 'rgba(8,12,28,0)'); g.addColorStop(0.35, 'rgba(8,12,28,0.92)'); g.addColorStop(1, 'rgba(8,12,28,1)'); ctx.fillStyle = g; ctx.fillRect(0, 1500, 1080, 420);
    PB.word(ctx, '…AND HE LIVED', 540, 1710, 104, 1, { color: '#FF6A4A' });
    L.text(ctx, 'WHY WE WONDER', 540, 1850, { size: 30, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: PB.IV, alpha: 0.8, tracking: '0.4em' });
  } });
})();
