// WHY WE WONDER · ep9 vertical cover: the bolt slamming into Roy Sullivan's campaign hat — STRUCK BY LIGHTNING / 7 TIMES.
(function () {
  'use strict';
  FILM.scene({ id: 'thumb', draw(ctx) {
    const L = FILM.lib, PB = FILM.pb, T = 0.05;
    PB.plate(ctx, { seed: 900, color: '#070A16' });
    PB.ridges(ctx, 0, T, { y: 1350 });
    PB.rain(ctx, T, { n: 200, a: 0.4 });
    const r = PB.head(ctx, 560, 1230, 820, { yaw: 0.35, hat: true, key: [-0.25, 0.55, 0.8], fill: [0.6, -0.2, 0.5], rim: [0.2, 0.9, -0.3], res: 0.6, spacing: 6.5, slot: 1, warm: [1.15, 1.1, 1.25] });
    const top = r.proj(0.1, 1.28, -0.05);
    PB.flash(ctx, 0.5, 180, 0);
    PB.bolt(ctx, [180, -80], top, { seed: 10, k: 1, w: 12, branches: 6 });
    PB.burst(ctx, top[0], top[1], 380, 1, '200,215,255');
    PB.word(ctx, 'STRUCK BY', 540, 170, 120, 1);
    PB.word(ctx, 'LIGHTNING', 540, 310, 140, 1, { color: PB.Y });
    const g = ctx.createLinearGradient(0, 1450, 0, 1920); g.addColorStop(0, 'rgba(8,12,28,0)'); g.addColorStop(0.35, 'rgba(8,12,28,0.92)'); g.addColorStop(1, 'rgba(8,12,28,1)'); ctx.fillStyle = g; ctx.fillRect(0, 1450, 1080, 470);
    PB.word(ctx, '7 TIMES', 540, 1660, 170, 1, { color: '#FF6A4A' });
    L.text(ctx, 'WHY WE WONDER', 540, 1850, { size: 30, family: PB.MONO, weight: 600, align: 'center', color: PB.IV, alpha: 0.8, tracking: '0.4em' });
  } });
})();
