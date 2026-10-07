// 01 · hook · T 0–3.0 · cuts on the beat (1.0, 2.0). The whole fact on frame 1.
//   A 0–1.0  profile head, the proton beam tears through on frame 0: A PARTICLE BEAM
//   B 1.0–2.0 X-ray: skull + glowing beam path; WENT STRAIGHT / THROUGH (sliced by the beam)
//   C 2.0–3.0 pull back to three-quarter: THIS MAN'S HEAD. — the head sinks to black, the beam settles onto line L0 (→ the map)
(function () {
  'use strict';
  const L0 = [[-120, 1000], [1200, 1430]];
  function backdrop(ctx, L, PB, T, seed) {
    PB.plate(ctx, { seed });
    // engraved field lines behind the head: concentric arcs of the accelerator, faint
    for (let i = 0; i < 9; i++) L.inkPath(ctx, L.ellipsePts(540, 2600, 900 + i * 120, 900 + i * 120, 140).filter((p) => p[1] < 1920 && p[1] > -20), { width: 1.2, color: '#5C78B8', alpha: 0.22, seed: seed + i, closed: false });
  }
  FILM.scene({ id: 'hook', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    let a, b;
    if (T < 1.0) {
      backdrop(ctx, L, PB, T, 11);
      const z = 1 + 0.06 * T;
      ctx.save(); ctx.translate(560, 1200); ctx.scale(z, z); ctx.translate(-560, -1200);
      const r = PB.head(ctx, 600, 1240, 1080, { yaw: 1.3, key: [-0.2, 0.45, 0.85], res: 0.3, slot: 1 });
      a = r.proj(...PB.BEAM_IN); b = r.proj(...PB.BEAM_OUT);
      const [p, q] = PB.extend(a, b, 2400);
      const to = 1;
      PB.beam(ctx, p, a, { T, to, w: 6 });
      PB.beam(ctx, a, b, { T, k: 0.35, w: 4, dots: false });
      PB.beam(ctx, b, q, { T, w: 6 });
      PB.burst(ctx, a[0], a[1], 220, L.clamp(1 - T * 1.5) * 0.9 + 0.25);
      PB.burst(ctx, b[0], b[1], 260, 0.95 - 0.5 * T);
      PB.rays(ctx, b[0], b[1], 30, 220, 18, L.clamp(1 - T * 1.2), 3, PB.Y, T);
      ctx.restore();
      const fl = L.clamp((T - 0.04) / 0.04) * L.clamp(1 - (T - 0.08) / 0.12); if (fl > 0) { ctx.fillStyle = `rgba(255,248,226,${0.3 * fl})`; ctx.fillRect(0, 0, 1080, 1920); }
      PB.word(ctx, 'A PARTICLE', 540, 210, 118, 0.6 + T / 0.08);
      PB.word(ctx, 'BEAM', 540, 345, 160, 0.4 + T / 0.1, { color: PB.Y });
    } else if (T < 2.0) {
      backdrop(ctx, L, PB, T, 12);
      ctx.fillStyle = 'rgba(4,20,40,0.55)'; ctx.fillRect(0, 0, 1080, 1920);
      const u0 = (T - 1.0), H = 820 * (1 + 0.05 * u0), cx = 715, cy = 1200, u = H / 2.2;
      // X-ray: the skull inside, the head as a cyan ghost
      D.skull(ctx, cx + 0.03 * u, cy + 0.09 * u, u * 2.45 * 0.78, { yaw: 1.3, pitch: 0.04, tiara: false, slot: 3, warm: [0.72, 1.0, 1.12], res: 0.32 });
      ctx.save(); ctx.globalAlpha = 0.62; ctx.globalCompositeOperation = 'screen';
      const r = PB.head(ctx, cx, cy, H, { yaw: 1.3, slot: 4, xray: true, flat: 0.3, res: 0.3 });
      ctx.restore();
      a = r.proj(...PB.BEAM_IN); b = r.proj(...PB.BEAM_OUT);
      const [p, q] = PB.extend(a, b, 2400);
      PB.beam(ctx, p, q, { T, w: 6 });
      PB.burst(ctx, a[0], a[1], 160, 0.5); PB.burst(ctx, b[0], b[1], 160, 0.5);
      // scan lines (x-ray film)
      L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0, spacing: 7, width: 1, color: '#7FD8E8', alpha: 0.06, seed: 5, density: () => 0.6, length: [200, 600] });
      PB.label(ctx, 'X-RAY · PATH OF THE BEAM', 60, 1520, (T - 1.15) / 0.2, { col: PB.CY, size: 26 });
      PB.word(ctx, 'WENT STRAIGHT', 540, 220, 110, (T - 1.0) / 0.1);
      // THROUGH sits on the beam, cut in two by it
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const wx = 235, wy = a[1] + (wx - a[0]) * Math.tan(ang);
      const pu = L.clamp((T - 1.72) / 0.12), gap = 4 + 16 * L.ease.outBack(pu);
      if (T > 1.7) PB.slice(ctx, 'THROUGH', wx, wy, 80, ang, gap, { color: PB.Y, alpha: L.clamp(pu * 2) });
    } else {
      backdrop(ctx, L, PB, T, 13);
      const pull = L.ease.outCubic(L.clamp((T - 2.0) / 0.7));
      const sink = L.ease.inCubic(L.clamp((T - 2.55) / 0.45));
      const H = L.lerp(980, 700, pull), cx = 540, cy = L.lerp(1220, 1140, pull);
      const r = PB.head(ctx, cx, cy, H, { yaw: L.lerp(1.0, 0.72, pull), key: [-0.45, 0.4, 0.8], res: 0.34, slot: 2 });
      a = r.proj(...PB.BEAM_IN); b = r.proj(...PB.BEAM_OUT);
      if (sink > 0) { ctx.fillStyle = `rgba(6,9,20,${0.92 * sink})`; ctx.fillRect(0, 0, 1080, 1920); }
      const [p, q] = PB.extend(a, b, 2400);
      const P = [L.lerp(p[0], L0[0][0], sink), L.lerp(p[1], L0[0][1], sink)], Q = [L.lerp(q[0], L0[1][0], sink), L.lerp(q[1], L0[1][1], sink)];
      PB.beam(ctx, P, Q, { T, w: 6 });
      PB.burst(ctx, b[0], b[1], 200, 0.45 * (1 - sink));
      const ta = 1 - sink;
      PB.word(ctx, "THIS MAN'S", 540, 220, 118, (T - 2.02) / 0.1, { alpha: ta });
      PB.word(ctx, 'HEAD.', 540, 360, 170, (T - 2.28) / 0.12, { color: PB.Y, alpha: ta });
    }
  } });
})();
