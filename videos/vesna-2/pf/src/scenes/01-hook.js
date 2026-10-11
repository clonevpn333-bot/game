// 01 · hook · T 0–3.0 (v2) · frame 1: SHE IS FALLING. Vesna tumbles through cloud banks tearing upward, speed streaks,
// debris shards spinning past, the altimeter racing (HER 33,000-FOOT FALL / MAY BE A LIE.). 1.55 the fall FREEZES with a
// tape-stop: RGB glitch slices, the frame jitters, everything rewinds upward; on LIE (2.5) 33,330 FT is struck out in red.
(function () {
  'use strict';
  const ALT0 = 33330;
  FILM.scene({ id: 'hook', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const fr = L.clamp((T - 1.55) / 0.12);                                   // freeze
    const rew = L.ease.inCubic(L.clamp((T - 1.75) / 1.25));                  // rewind accelerates
    const Te = Math.min(T, 1.55) - rew * 1.6;                                 // world clock: runs, stops, runs backwards
    PB.plate(ctx, { seed: 81, color: '#0A1024' });
    const sky = ctx.createLinearGradient(0, 0, 0, 1920); sky.addColorStop(0, 'rgba(40,60,110,0.4)'); sky.addColorStop(1, 'rgba(8,10,24,0)');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 1080, 1920);
    PB.clouds(ctx, Te, { vy: 2400, seed: 11, n: 14, alpha: 0.8 });
    PB.streaks(ctx, Te, { angle: -Math.PI / 2, speed: 4200, n: 44, alpha: 0.45 * (1 - fr * 0.6) });
    // debris shards tumbling up past her (she falls faster than the light fragments)
    const rr = L.rng(L.hash('hookshards'));
    for (let i = 0; i < 16; i++) {
      const x = rr() * 1080, sp = 900 + rr() * 1400, sz = 12 + rr() * 30, y = ((rr() * 2400 - Te * sp) % 2400 + 2400) % 2400 - 200, rot = Te * (rr() * 8 - 4) + i;
      const pts = [0, 1, 2].map((j) => [x + Math.cos(rot + j * 2.1) * sz, y + Math.sin(rot + j * 2.1) * sz * 0.7]);
      D.engrave(ctx, pts, { ink: '#C8CCD6', base: '#2A2E3A', light: () => 0.5, spacing: 3, seed: 400 + i, smooth: false, outW: 2, cross: false, stip: false });
    }
    // Vesna, tumbling
    const hx = 540 + 30 * Math.sin(Te * 2.7), hy = 1060 + 20 * Math.cos(Te * 2.1), z = 1.02 + 0.04 * Math.sin(Te * 1.5);
    ctx.save(); ctx.translate(hx, hy); ctx.scale(z, z); ctx.rotate(0.85 + 0.9 * Te); ctx.translate(-hx, -hy);
    PB.fem(ctx, hx, hy, 820, { yaw: 0.6 + 0.25 * Math.sin(Te * 1.9), pitch: -0.25, wind: 1, key: [-0.3, 0.6, 0.75], rim: [0.6, -0.6, -0.4], res: 0.3, slot: 1 });
    ctx.restore();
    // near clouds rushing past the lens (bottom band only)
    PB.clouds(ctx, Te + 0.4, { vy: 3400, seed: 12, n: 6, alpha: 0.9, scale: 1.5, y0: 1580, y1: 2400 });
    // the curiosity line: the altitude tape down the right edge
    const ft = ALT0 - Math.max(0, Te) * 2100;
    PB.beam(ctx, [1000, -40], [1000, 1960], { T: Te, w: 4, speed: 2600, k: 0.8, dots: false });
    for (let k = -2; k < 24; k++) { const yy = 960 - ((ft % 1000) / 1000) * 1000 + k * 100 - 1000; if (yy < -20 || yy > 1940) continue; L.inkPath(ctx, [[1000, yy], [k % 5 ? 1030 : 1060, yy]], { width: k % 5 ? 2 : 4, color: PB.Y, alpha: 0.8, seed: 950 + k, taper: 0 }); }
    PB.alt(ctx, 540, 1440, ft, { s: 1.15 });
    const st = L.clamp((T - 2.5) / 0.07);
    if (st > 0) {
      const g = 1 + 0.35 * (1 - L.ease.outCubic(st));
      ctx.save(); ctx.translate(540, 1440); ctx.scale(g, g);
      L.inkPath(ctx, [[-210, 60], [210, -60]], { width: 16, color: PB.RED, seed: 960, taper: 0 }); L.inkPath(ctx, [[-210, -60], [210, 60]], { width: 16, color: PB.RED, seed: 961, taper: 0 });
      ctx.restore();
    }
    // freeze → glitch: RGB-split slices that jitter on twos, tape lines rolling
    if (fr > 0) {
      const k = Math.floor(T * 12);
      const rg = L.rng(L.hash('glitch', k));
      for (let i = 0; i < 7; i++) {
        const y = rg() * 1920, h = 20 + rg() * 90, dx = (rg() - 0.5) * 120 * fr;
        ctx.drawImage(ctx.canvas, 0, y * (ctx.canvas.height / 1920), ctx.canvas.width, h * (ctx.canvas.height / 1920), dx, y, 1080, h);
        ctx.fillStyle = `rgba(${rg() > 0.5 ? '255,60,60' : '60,200,255'},${0.12 * fr})`; ctx.fillRect(0, y, 1080, h);
      }
      for (let j = 0; j < 5; j++) { const yy = ((j * 420 - T * 3800) % 1920 + 1920) % 1920; ctx.fillStyle = `rgba(242,232,208,${0.08 * fr})`; ctx.fillRect(0, yy, 1080, 7); }
    }
  } });
})();
