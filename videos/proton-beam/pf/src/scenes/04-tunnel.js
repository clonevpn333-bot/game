// 04 · tunnel · T 9.5–12.0 · inside the ring: engraved one-point tunnel, magnets in a row with the beam pipe through them.
// The camera dollies in (continuing the dive) and settles at an open gap in the pipe — BROKEN PART (10.95);
// his 3D head leans in from the left foreground toward the gap (11.0–12.0). TO CHECK / A BROKEN PART.
(function () {
  'use strict';
  const VP = [560, 880], F = 900;
  const GAPZ = 6.0;
  const px = 0.62, py = 0.42;
  FILM.scene({ id: 'tunnel', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const travel = L.ease.outCubic(L.clamp((T - 9.5) / 1.3));
    const cz = L.lerp(-2.5, GAPZ - 2.6, travel);
    const S = (x, y, z) => { const d = Math.max(0.15, z - cz); return [VP[0] + (x / d) * F, VP[1] + (y / d) * F, d]; };
    ctx.fillStyle = '#05070F'; ctx.fillRect(0, 0, 1080, 1920);
    const fog = (d) => L.clamp(1 - d / 14);
    // tunnel shell: arches every 1.0 unit, far → near, with lamps
    const z0 = Math.floor(cz) + 14;
    for (let z = z0; z > cz + 0.2; z -= 1) {
      const d = z - cz, a = fog(d);
      const arch = [];
      arch.push(S(-1.7, 1.3, z));
      for (let k = 0; k <= 24; k++) { const th = Math.PI + (k / 24) * Math.PI; arch.push(S(Math.cos(th) * 1.7, -0.3 + Math.sin(th) * 1.6, z)); }
      arch.push(S(1.7, 1.3, z));
      L.inkPath(ctx, arch.map((p) => [p[0], p[1]]), { width: Math.min(5, 14 / d), color: '#8EA0C8', alpha: 0.75 * a, seed: 800 + z });
      const lamp = S(0, -1.85, z + 0.5);
      PB.burst(ctx, lamp[0], lamp[1], 260 / (d + 0.5), 0.45 * a, '255,200,130');
    }
    // floor + wall hatching (engraved concrete), drawn as receding strokes
    L.hatch(ctx, [[0, 1920], [1080, 1920], [VP[0] + 40, VP[1] + 60], [VP[0] - 40, VP[1] + 60]], { angle: 0, spacing: 7, width: 1.1, color: '#6E7FA8', alpha: 0.55, seed: 820, density: (x, y) => L.clamp((y - VP[1]) / 900) * 0.8 });
    L.hatch(ctx, [[0, 0], [VP[0] - 60, VP[1] - 40], [VP[0] - 60, VP[1] + 60], [0, 1920]], { angle: 1.2, spacing: 8, width: 1, color: '#4E5E88', alpha: 0.5, seed: 821, density: (x, y) => L.clamp(1 - x / 700) * 0.7 });
    // cable trays down the left wall + floor joints (engraved detail)
    for (let k = 0; k < 4; k++) { const y = -0.9 + k * 0.16; const A = S(-1.62, y, cz + 0.3), B = S(-1.62, y, cz + 16); L.inkPath(ctx, [[A[0], A[1]], [B[0], B[1]]], { width: 3, color: k % 2 ? '#C86A3A' : '#8EA0C8', alpha: 0.7, seed: 830 + k, taper: 0 }); }
    for (const x of [-0.8, 0.0, 1.2]) { const A = S(x, 1.3, cz + 0.3), B = S(x, 1.3, cz + 16); L.inkPath(ctx, [[A[0], A[1]], [B[0], B[1]]], { width: 2, color: '#5E6E98', alpha: 0.6, seed: 840 + x * 10, taper: 0 }); }
    for (let z = Math.ceil(cz + 0.5); z < cz + 14; z += 0.5) { const A = S(-1.7, 1.3, z), B = S(1.7, 1.3, z); L.inkPath(ctx, [[A[0], A[1]], [B[0], B[1]]], { width: 1.2, color: '#5E6E98', alpha: 0.5 * fog(z - cz), seed: 850 + z * 2, taper: 0 }); }
    // the pipe between magnets: a line along the row; open at the gap
    const pA = S(px, py, Math.max(cz + 0.3, GAPZ + 0.35)), pB = S(px, py, 22);
    L.inkPath(ctx, [[pA[0], pA[1]], [pB[0], pB[1]]], { width: 0.13 / (pA[2]) * F * 0.5, color: '#A8B4D0', seed: 970, taper: 0 });
    const g0 = S(px, py, GAPZ - 0.35), g1 = S(px, py, GAPZ + 0.35);
    if (GAPZ - 0.35 > cz + 0.3) {
      const pN = S(px, py, cz + 0.3);
      L.inkPath(ctx, [[pN[0], pN[1]], [g0[0], g0[1]]], { width: 0.13 / g0[2] * F * 0.5, color: '#A8B4D0', seed: 971, taper: 0 });
      for (const g of [g0, g1]) { L.inkCircle(ctx, g[0], g[1], 0.13 / g[2] * F, { width: 3, color: '#000', fill: '#F2C230', seed: 972 }); L.inkCircle(ctx, g[0], g[1], 0.07 / g[2] * F, { width: 2, color: '#000', fill: '#05070F', seed: 973 }); }
    }
    // magnets + beam pipe (right side), far → near
    const items = [];
    for (let k = -2; k < 16; k++) { const z = k * 1.3 + 0.4; if (z > GAPZ - 2.4 && z < GAPZ + 0.4) continue; items.push(z); }
    items.filter((z) => z + 0.9 > cz + 0.3).sort((a, b) => b - a).forEach((z, i) => {
      const za = Math.max(z, cz + 0.3), zb = z + 0.9;
      if (zb <= za) return;
      const d = za - cz, a = fog(d);
      const x0 = 0.3, x1 = 0.94, y0 = 0.16, y1 = 0.7;
      const fr = [S(x0, y0, za), S(x1, y0, za), S(x1, y1, za), S(x0, y1, za)].map((p) => [p[0], p[1]]);
      const sd = [S(x0, y0, za), S(x0, y0, zb), S(x0, y1, zb), S(x0, y1, za)].map((p) => [p[0], p[1]]);
      const tp = [S(x0, y0, za), S(x1, y0, za), S(x1, y0, zb), S(x0, y0, zb)].map((p) => [p[0], p[1]]);
      const lit = () => 0.25 + 0.45 * a;
      D.engrave(ctx, sd, { ink: '#7C90C8', base: '#0C1226', light: () => lit() * 0.7, angle: 0.2, spacing: 4.5, seed: 900 + i, smooth: false, outW: 1.6, cross: false, stip: false });
      D.engrave(ctx, tp, { ink: '#A8B8E0', base: '#101830', light: lit, angle: 1.4, spacing: 4.5, seed: 920 + i, smooth: false, outW: 1.6, cross: false, stip: false });
      D.engrave(ctx, fr, { ink: '#D8885A', base: '#2A1208', light: lit, angle: -0.8, spacing: 4.5, seed: 940 + i, smooth: false, outW: 2, stip: false });
      const pc = S(px, py, za); L.inkCircle(ctx, pc[0], pc[1], 0.07 / d * F, { width: 2, color: '#000', fill: '#1A1A22', seed: 960 + i });
    });
    // BROKEN PART callout
    const ba = L.clamp((T - 10.9) / 0.15);
    if (ba > 0) {
      const gx = (g0[0] + g1[0]) / 2, gy = (g0[1] + g1[1]) / 2;
      for (let k = 0; k < 2; k++) { const ph = ((T - 10.9) * 1.6 + k / 2) % 1; L.inkCircle(ctx, gx, gy, 30 + ph * 70, { width: 3, color: PB.RED, alpha: (1 - ph) * ba, seed: 980 + k }); }
      L.inkPath(ctx, [[gx, gy - 40], [gx + 30, gy - 230]], { width: 2.5, color: PB.RED, seed: 985 });
      PB.label(ctx, 'BROKEN PART', gx - 190, gy - 260, ba, { col: '#FF7A5A', size: 30 });
    }
    // his head leans in from the left foreground
    const lean = L.ease.outCubic(L.clamp((T - 10.85) / 0.9));
    if (lean > 0) {
      const hx = L.lerp(-420, 300, lean), hy = 1080 + 40 * (1 - lean);
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(0.12 * lean); ctx.translate(-hx, -hy);
      FILM.pb.head(ctx, hx, hy, 760, { yaw: 1.35, key: [0.7, 0.2, 0.6], fill: [-0.6, -0.1, 0.5], rim: [0.9, 0.3, -0.3], res: 0.32, slot: 8, warm: [1, 0.86, 0.72] });
      ctx.restore();
    }
    D.grain(ctx, T, 0.8);
    PB.word(ctx, 'TO CHECK', 540, 230, 118, (T - 10.25) / 0.12);
    PB.word(ctx, 'A BROKEN PART', 540, 360, 104, (T - 10.7) / 0.12, { color: PB.Y });
  } });
})();
