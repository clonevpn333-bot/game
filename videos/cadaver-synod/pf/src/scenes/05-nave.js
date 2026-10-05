// 05 · nave · T 11.25–13.25 · 3D: dolly down an engraved, candle-lit nave (projected columns, ribbed arches, tiled floor)
// to the enthroned corpse — one engraved 3D assembly. "dressed it in robes" (11.41): a sweep of gold light reveals the
// crimson cope from the dark; "throne" (12.86) the dolly settles.
(function () {
  'use strict';
  FILM.scene({ id: 'nave', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t + FILM.SHIFT;
    const k = L.ease.inOutCubic(L.clamp(t / 1.9));
    const cz = L.lerp(-700, 2500, k), f = 900, cx = 540, cy = 1000, camY = L.lerp(-140, -260, k);
    const P3 = (x, y, z) => { const zz = z - cz; return zz < 40 ? null : [cx + x * f / zz, cy + (y - camY) * f / zz, zz]; };
    D.plate(ctx, { color: '#0C0A0B' });
    const W = 520, Hc = 1500, Z0 = 400, DZ = 520, N = 8, ZE = Z0 + DZ * N;
    // the far window
    const ew = P3(0, -700, ZE + 200);
    if (ew) { const sc = f / ew[2]; D.glow(ctx, ew[0], ew[1], 1100 * sc * 1.6, '#7A4AC8', 0.6); ctx.save(); ctx.translate(ew[0], ew[1]); ctx.scale(sc, sc); D.lancet(ctx, 0, 300, 320, 620); ctx.fillStyle = '#5A3AA8'; ctx.fill(); ctx.restore(); }
    // floor tiles
    for (let kk = N * 2; kk >= 0; kk--) {
      const z0 = Z0 - 300 + kk * DZ / 2, z1 = z0 + DZ / 2;
      for (let i = -4; i < 4; i++) {
        const a = P3(i * 130, 300, z0), b = P3((i + 1) * 130, 300, z0), c = P3((i + 1) * 130, 300, z1), d = P3(i * 130, 300, z1);
        if (!a || !d) continue;
        const fog = L.clamp((z0 - cz) / (ZE - cz));
        if ((i + kk) % 2 === 0) L.hatch(ctx, [[a[0], a[1]], [b[0], b[1]], [c[0], c[1]], [d[0], d[1]]], { angle: 0.0, spacing: Math.max(3, 9 * f / a[2]), width: 1, color: '#9A8E84', alpha: 0.7 * (1 - fog), seed: 1000 + kk * 9 + i });
        L.inkPath(ctx, [[a[0], a[1]], [b[0], b[1]]], { width: Math.max(1, 3 * f / a[2]), color: '#000', seed: 1100 + kk * 9 + i, taper: 0, smooth: false });
      }
    }
    // columns + arches, far to near; candles
    for (let kk = N; kk >= 0; kk--) {
      const z = Z0 + kk * DZ, fog = L.clamp((z - cz) / (ZE - cz));
      for (const side of [-1, 1]) {
        const base = P3(side * W, 300, z), top = P3(side * W, -Hc + 300, z);
        if (!base || !top) continue;
        const r = 72 * f / base[2];
        const colPts = [[base[0] - r, top[1]], [base[0] + r, top[1]], [base[0] + r, base[1]], [base[0] - r, base[1]]];
        const lx = base[0] - side * r * 0.6;
        D.engrave(ctx, colPts, { ink: '#C8BCAE', light: (x, y) => L.clamp((1 - Math.abs(x - lx) / (r * 1.6)) * (0.75 - fog * 0.6) * L.clamp((y - top[1]) / (base[1] - top[1]) * 1.3)), angle: 1.57, spacing: Math.max(3, 6 * Math.min(1, f / base[2] * 2.5)), width: 1, seed: 1200 + kk * 2 + (side > 0 ? 1 : 0), outW: Math.max(1.2, 3 * f / base[2]), smooth: false, cross: false });
        const nt = P3(side * W, -Hc + 300, z + DZ);
        if (nt) { const ap = L.smoothPts([[top[0], top[1]], [(top[0] + nt[0]) / 2, Math.min(top[1], nt[1]) - 170 * f / base[2]], [nt[0], nt[1]]], false, 6); L.inkPath(ctx, ap, { width: Math.max(2, 34 * f / base[2]), color: '#000', seed: 1300 + kk + side }); L.inkPath(ctx, ap.map(([x, y]) => [x, y + 6 * f / base[2]]), { width: Math.max(1, 4 * f / base[2]), color: '#B8AC9E', alpha: 0.7 * (1 - fog), seed: 1350 + kk + side }); }
        const cp = P3(side * (W - 110), 140, z - 60);
        if (cp && cp[2] < 4200) D.candle(ctx, cp[0], cp[1], 0.85 * f / cp[2], T, { seed: kk * 2 + (side > 0 ? 1 : 0), h: 120 });
      }
    }
    const at = P3(0, 300, 4300);
    if (at) {
      const Hpx = 12.4 * (f / at[2]) * 135;
      const rv = L.clamp((T - 11.41) / 0.7);
      const w = 0.22 + 0.78 * rv;
      D.glow(ctx, at[0], at[1] - Hpx * 0.45, Hpx * 0.8, C.candle, 0.35 + 0.3 * rv);
      D.corpse(ctx, at[0], at[1], Hpx, T, { warm: [w, w * 0.9, w * 0.8], ember: 0.3, res: 0.34 });
      if (rv > 0 && rv < 1) { const sy = at[1] - Hpx * (1 - rv); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, sy - 60, 0, sy + 60); g.addColorStop(0, 'rgba(242,194,48,0)'); g.addColorStop(0.5, 'rgba(242,194,48,0.55)'); g.addColorStop(1, 'rgba(242,194,48,0)'); ctx.fillStyle = g; ctx.fillRect(at[0] - Hpx * 0.4, sy - 60, Hpx * 0.8, 120); ctx.restore(); }
    }
    D.mist(ctx, T, { y: 1500, h: 500, a: 0.3, speed: 25 });
    D.grain(ctx, T, 1);
  } });
})();
