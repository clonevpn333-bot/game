// 03 · ring · T 6.5–9.5 · the pin's ring (top-down, R 400 at 540,900) tilts into an engraved aerial view of the U-70
// synchrotron in the birch forest; protons race round it as a comet. PiP medallion: ANATOLI BUGORSKI (6.52).
// U-70 · 1.5 KM AROUND (7.4). PARTICLE / ACCELERATOR (8.82). At 9.1 the camera dives into the ring wall (→ tunnel).
(function () {
  'use strict';
  const NB = 56;
  FILM.scene({ id: 'ring', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 31, color: '#0A1022' });
    const tilt = L.ease.inOutCubic(L.clamp((T - 3.75) / 0.5));
    const phi = L.lerp(Math.PI / 2, 0.68, tilt), psi = 0.3 * (T - 3.75);
    const dive = L.ease.inCubic(L.clamp((T - 5.1) / 0.4));
    const s = L.lerp(400, 500, tilt) * (1 + dive * 5), cx = 540, cy = L.lerp(900, 1010, tilt) + dive * 1500;
    const Dz = 4;
    const P = (X, Y, Z) => {
      const x1 = X * Math.cos(psi) - Z * Math.sin(psi), z1 = X * Math.sin(psi) + Z * Math.cos(psi);
      const f = Dz / (Dz + z1 * Math.cos(phi));
      return [cx + x1 * s * f, cy - (z1 * Math.sin(phi) + Y * Math.cos(phi)) * s * f, z1];
    };
    // ground: engraved field strips + forest
    const gl = (x, y) => 0.25 + 0.3 * L.clamp(1 - Math.hypot(x - 540, y - 900) / 900);
    for (let i = -6; i <= 6; i++) {
      const a = [], b = [];
      for (let k = -6; k <= 6; k++) { a.push(P(i * 0.5, 0, k * 0.5)); b.push(P(k * 0.5, 0, i * 0.5)); }
      L.inkPath(ctx, a, { width: 1.2, color: '#3E5488', alpha: 0.55, seed: 300 + i });
      L.inkPath(ctx, b, { width: 1.2, color: '#3E5488', alpha: 0.55, seed: 330 + i });
    }
    const rr = L.rng(L.hash('forest'));
    const trees = [];
    for (let i = 0; i < 420; i++) {
      const a = rr() * Math.PI * 2, d = rr() < 0.5 ? 0.25 + rr() * 0.55 : 1.25 + rr() * 1.8;
      if (Math.abs(Math.sin(a * 3 + d)) < 0.18) continue;           // clearings
      trees.push([Math.cos(a) * d, Math.sin(a) * d, 0.04 + rr() * 0.05]);
    }
    trees.map(([x, z, h]) => [P(x, 0, z), P(x, h, z), h]).sort((A, B) => B[0][2] - A[0][2]).forEach(([b, top, h], i) => {
      if (b[1] < -50 || b[1] > 1980) return;
      const w = Math.max(2, Math.abs(top[1] - b[1]) * 0.45 + h * s * 0.15 * Math.sin(phi));
      const pts = [[b[0] - w, b[1]], [top[0], top[1] - w * 0.4], [b[0] + w, b[1]]];
      ctx.beginPath(); L.tracePath(ctx, pts, true); ctx.fillStyle = '#0E1A2E'; ctx.fill();
      L.inkPath(ctx, pts, { closed: true, width: 1.3, color: '#7E96C8', alpha: 0.55, seed: 500 + i, taper: 0 });
    });
    // the ring: magnet blocks as engraved boxes, far → near
    const blocks = [];
    for (let i = 0; i < NB; i++) {
      const a0 = (i / NB) * Math.PI * 2 + 0.01, a1 = ((i + 1) / NB) * Math.PI * 2 - 0.01, r0 = 0.95, r1 = 1.05, h = 0.07;
      const c = (a, r, y) => P(Math.cos(a) * r, y, Math.sin(a) * r);
      const top = [c(a0, r0, h), c(a1, r0, h), c(a1, r1, h), c(a0, r1, h)];
      const side = [c(a0, r1, 0), c(a1, r1, 0), c(a1, r1, h), c(a0, r1, h)];
      const inner = [c(a0, r0, 0), c(a1, r0, 0), c(a1, r0, h), c(a0, r0, h)];
      blocks.push({ i, z: c((a0 + a1) / 2, 1, 0)[2], top, side, inner });
    }
    const comet = (T * 4.2) % (Math.PI * 2);
    blocks.sort((A, B) => B.z - A.z).forEach((bk) => {
      const near = (a) => { let d = Math.abs(((bk.i + 0.5) / NB) * Math.PI * 2 - comet); d = Math.min(d, Math.PI * 2 - d); return L.clamp(1 - d / 0.9); };
      const lit = (x, y) => gl(x, y) + 0.5 * near();
      if (Math.cos(phi) > 0.05) {
        D.engrave(ctx, (bk.z > 0 ? bk.inner : bk.side).map((p) => [p[0], p[1]]), { ink: '#8EA4D8', base: '#101830', light: (x, y) => lit(x, y) * 0.8, angle: 1.57, spacing: 4, seed: 600 + bk.i, smooth: false, outW: 1.6, cross: false, stip: false });
      }
      D.engrave(ctx, bk.top.map((p) => [p[0], p[1]]), { ink: bk.i % 2 ? '#B8C6E8' : '#D8A08A', base: '#141C36', light: lit, angle: 0.4, spacing: 4, seed: 700 + bk.i, smooth: false, outW: 1.8, cross: false, stip: false });
    });
    // the protons: a comet racing round the beam line (light only)
    const trail = [];
    for (let k = 0; k <= 40; k++) { const a = comet - k * 0.03; trail.push(P(Math.cos(a), 0.09, Math.sin(a))); }
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (let k = 0; k < 40; k++) { const u = 1 - k / 40; ctx.strokeStyle = `rgba(255,${200 + 50 * u},${90 + 140 * u},${u})`; ctx.lineWidth = 3 + 10 * u; ctx.beginPath(); ctx.moveTo(trail[k][0], trail[k][1]); ctx.lineTo(trail[k + 1][0], trail[k + 1][1]); ctx.stroke(); }
    ctx.restore();
    PB.burst(ctx, trail[0][0], trail[0][1], 120, 0.8);
    // the yellow ring the pin opened (fades as the 3D ring takes over)
    const yr = 1 - L.clamp((T - 3.8) / 0.4);
    if (yr > 0) { const ring = []; for (let k = 0; k <= 96; k++) { const a = (k / 96) * Math.PI * 2; ring.push(P(Math.cos(a), 0.09, Math.sin(a))); } L.inkPath(ctx, ring, { width: 6, color: PB.Y, alpha: yr, seed: 95, closed: true }); }
    if (dive > 0) { ctx.fillStyle = `rgba(4,6,14,${dive})`; ctx.fillRect(0, 0, 1080, 1920); }
    const ua = 1;
    ctx.save(); ctx.globalAlpha = ua;
    // callout: U-70, 1.5 km round
    const cp = P(Math.cos(-0.8), 0.1, Math.sin(-0.8));
    const ca = L.clamp((T - 4.6) / 0.15);
    if (ca > 0 && dive <= 0) { L.inkPath(ctx, [[cp[0], cp[1]], [cp[0] + 60, cp[1] + 110]], { width: 2, color: PB.Y, seed: 140 }); PB.label(ctx, 'U-70 SYNCHROTRON', cp[0] - 330, cp[1] + 140, ca, { size: 28 }); PB.label(ctx, '1.5 KM AROUND', cp[0] - 330, cp[1] + 196, (T - 4.7) / 0.15, { size: 24, col: PB.IV }); }
    // PiP medallion: the physicist
    const pin = L.ease.outBack(L.clamp((T - 4.35) / 0.18)), pout = L.ease.inCubic(L.clamp((T - 5.05) / 0.15));
    const pr = 190 * pin * (1 - pout);
    if (pr > 4) {
      const mx = 760, my = 400;
      ctx.save(); ctx.beginPath(); ctx.arc(mx, my, pr, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#121A34'; ctx.fillRect(mx - pr, my - pr, pr * 2, pr * 2);
      L.hatch(ctx, null, { bounds: { x: mx - pr, y: my - pr, w: pr * 2, h: pr * 2 }, angle: -0.8, spacing: 6, width: 1, color: '#3E5488', alpha: 0.7, seed: 150, density: () => 0.5 });
      FILM.pb.head(ctx, mx - pr * 0.04, my + pr * 0.08, pr * 1.55, { yaw: -0.45 + 0.15 * (T - 4.25), key: [-0.5, 0.45, 0.75], res: 0.42, spacing: 5, slot: 7 });
      ctx.restore();
      L.inkCircle(ctx, mx, my, pr, { width: 7, color: '#E6B652', seed: 151 });
      L.inkCircle(ctx, mx, my, pr + 12, { width: 2, color: '#E6B652', alpha: 0.7, seed: 152 });
      const q = P(Math.cos(-2.3), 0.1, Math.sin(-2.3));
      if (pout < 1) L.inkPath(ctx, [[mx - pr * 0.7, my + pr * 0.7], [q[0], q[1]]], { width: 2, color: '#E6B652', alpha: 0.7 * (1 - pout), seed: 153 });
      PB.label(ctx, 'ANATOLI BUGORSKI', 560, my + pr + 60, (T - 4.55) / 0.15 * (1 - pout), { size: 30 });
      PB.label(ctx, 'PHYSICIST · AGE 36', 560, my + pr + 116, (T - 4.55) / 0.15 * (1 - pout), { size: 24, col: PB.IV });
    }
    const tA = 1 - L.clamp((T - 4.1) / 0.15);
    ctx.restore();
  } });
})();
