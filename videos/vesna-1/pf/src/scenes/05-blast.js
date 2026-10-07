// 05 · blast · T 11.0–12.75 · THE DROP. Whiteout on the downbeat; the DC-9 tears into three pieces that tumble apart,
// fire blooming at the breaks, engraved debris shards spinning out, camera shake.
(function () {
  'use strict';
  FILM.scene({ id: 'blast', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const k = L.ease.outCubic(L.clamp((T - 11.0) / 1.5));
    const sh = T < 11.6 ? (1 - (T - 11.0) / 0.6) * 14 : 0;
    PB.plate(ctx, { seed: 121, color: '#0A0C18' });
    const g = ctx.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, 'rgba(60,30,20,0.6)'); g.addColorStop(1, 'rgba(6,8,18,0.9)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
    ctx.save(); ctx.translate(Math.sin(T * 90) * sh, Math.cos(T * 70) * sh);
    PB.clouds(ctx, 11.0 + (T - 11.0) * 0.4, { vx: -260, seed: 21, n: 8, alpha: 0.7, yOff: 500 });
    const r = PB.jet(ctx, 600, 900, 92 * 1.12, { yaw: -0.55, pitch: 0.22 + 0.3 * k, roll: 0.04 + 0.2 * k, brk: k * 0.9, key: [0.2, 0.9, 0.6], flat: 0.3, spacing: 4.5, res: 0.3, slot: 32, warm: [1.15, 0.9, 0.75] });
    // fire at the breaks
    for (const [bx, by] of [[1.4, 0], [-1.6, 0]]) {
      const p = r.proj(bx + (bx > 0 ? 0.6 : -0.6) * k, by, 0);
      PB.burst(ctx, p[0], p[1], 260 * (0.5 + k), 0.9 * (1 - 0.4 * k), '255,120,40');
      PB.rays(ctx, p[0], p[1], 20, 220 * (0.4 + k), 14, 0.8 * (1 - k * 0.6), 7 + bx * 3, '#FF9A40', T);
    }
    // debris shards: engraved triangles thrown out, spinning
    const rr = L.rng(L.hash('debris'));
    for (let i = 0; i < 26; i++) {
      const a = rr() * Math.PI * 2, sp = 300 + rr() * 700, d = sp * (T - 11.0), sz = 10 + rr() * 26, rot = (T - 11) * (rr() * 8 - 4);
      const cx = 540 + Math.cos(a) * d, cy = 900 + Math.sin(a) * d + 260 * (T - 11) * (T - 11);
      const pts = [0, 1, 2].map((j) => [cx + Math.cos(rot + j * 2.1 + i) * sz, cy + Math.sin(rot + j * 2.1 + i) * sz * 0.7]);
      D.engrave(ctx, pts, { ink: '#C8CCD6', base: '#2A2E3A', light: () => 0.5, spacing: 3, seed: 400 + i, smooth: false, outW: 2, cross: false, stip: false });
    }
    ctx.restore();
    const wo = T < 11.06 ? 1 : L.clamp(1 - (T - 11.06) / 0.3);
    if (wo > 0) { ctx.fillStyle = `rgba(255,246,226,${0.96 * wo})`; ctx.fillRect(0, 0, 1080, 1920); }
  } });
})();
