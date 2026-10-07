// WHY WE WONDER · ep8 PART 1 vertical cover: Vesna tumbling through cloud, the altimeter racing.
(function () {
  'use strict';
  FILM.scene({ id: 'thumb', draw(ctx) {
    const L = FILM.lib, PB = FILM.pb, T = 0.6;
    PB.plate(ctx, { seed: 81, color: '#0A1024' });
    const sky = ctx.createLinearGradient(0, 0, 0, 1920); sky.addColorStop(0, 'rgba(40,60,110,0.45)'); sky.addColorStop(1, 'rgba(8,10,24,0)'); ctx.fillStyle = sky; ctx.fillRect(0, 0, 1080, 1920);
    PB.clouds(ctx, T, { vy: 2200, seed: 11, n: 14, alpha: 0.8 });
    const rr = L.rng(L.hash('speed')); for (let i = 0; i < 40; i++) { const x = rr() * 1080, y = rr() * 1920; L.inkPath(ctx, [[x, y], [x, y + 140 + rr() * 160]], { width: 1.5 + rr() * 2, color: '#C8D2EC', alpha: 0.35, seed: 900 + i, taper: [4, 30] }); }
    ctx.save(); ctx.translate(540, 1080); ctx.rotate(1.15); ctx.translate(-540, -1080);
    PB.fem(ctx, 540, 1080, 980, { yaw: 0.65, pitch: -0.25, wind: 1, key: [-0.3, 0.6, 0.75], rim: [0.6, -0.6, -0.4], res: 0.6, spacing: 6.5, slot: 1 });
    ctx.restore();
    PB.beam(ctx, [1000, -40], [1000, 1960], { T, w: 4, k: 0.8, dots: false });
    PB.word(ctx, 'SHE FELL', 540, 170, 120, 1);
    PB.word(ctx, '33,000 FT', 540, 320, 150, 1, { color: PB.Y });
    const g = ctx.createLinearGradient(0, 1450, 0, 1920); g.addColorStop(0, 'rgba(8,12,28,0)'); g.addColorStop(0.35, 'rgba(8,12,28,0.92)'); g.addColorStop(1, 'rgba(8,12,28,1)'); ctx.fillStyle = g; ctx.fillRect(0, 1450, 1080, 470);
    PB.word(ctx, 'NO PARACHUTE', 540, 1640, 104, 1, { color: '#FF6A4A' });
    L.text(ctx, 'PART 1', 540, 1770, { size: 40, family: PB.MONO, weight: 600, align: 'center', color: PB.Y, tracking: '0.4em' });
    L.text(ctx, 'WHY WE WONDER', 540, 1860, { size: 28, family: PB.MONO, weight: 600, align: 'center', color: PB.IV, alpha: 0.8, tracking: '0.4em' });
  } });
})();
