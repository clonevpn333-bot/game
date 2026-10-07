// 01 · hook · T 0–2.0 · the whole idea lands by ~1 s.
//   A 0–1.0  frame 1: the proton beam is already blasting through his profile; A PROTON BEAM / SHOT THROUGH / HIS HEAD. all on screen
//   B 1.0–2.0 (beat cut) X-ray: skull + the beam's path; from 1.55 the head sinks away and the beam slides onto line L0,
//            which the next shot bends into the map of the USSR
(function () {
  'use strict';
  const L0 = [[-120, 1000], [1200, 1430]];
  function backdrop(ctx, L, PB, seed) {
    PB.plate(ctx, { seed });
    for (let i = 0; i < 9; i++) L.inkPath(ctx, L.ellipsePts(540, 2600, 900 + i * 120, 900 + i * 120, 140).filter((p) => p[1] < 1920 && p[1] > -20), { width: 1.2, color: '#5C78B8', alpha: 0.22, seed: seed + i, closed: false });
  }
  FILM.scene({ id: 'hook', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    if (T < 1.0) {
      backdrop(ctx, L, PB, 11);
      const z = 1 + 0.06 * T + 0.03 * Math.exp(-T * 12);
      ctx.save(); ctx.translate(560, 1200); ctx.scale(z, z); ctx.rotate(0.006 * Math.sin(T * 60) * Math.exp(-T * 6)); ctx.translate(-560, -1200);
      const r = PB.head(ctx, 600, 1260, 1040, { yaw: 1.3, key: [-0.2, 0.45, 0.85], res: 0.3, slot: 1 });
      const a = r.proj(...PB.BEAM_IN), b = r.proj(...PB.BEAM_OUT);
      const [p, q] = PB.extend(a, b, 2400);
      PB.beam(ctx, p, a, { T, w: 7 });
      PB.beam(ctx, a, b, { T, k: 0.4, w: 5, dots: false });
      PB.beam(ctx, b, q, { T, w: 7 });
      PB.burst(ctx, a[0], a[1], 240, 0.95 - 0.4 * T);
      PB.burst(ctx, b[0], b[1], 300, 1 - 0.45 * T);
      PB.rays(ctx, b[0], b[1], 30, 260, 20, 1 - 0.6 * T, 3, PB.Y, T);
      // sparks blasting off the exit point
      const rr = L.rng(L.hash('sparks'));
      for (let i = 0; i < 26; i++) { const ang = -0.3 + (rr() - 0.5) * 1.6, sp = 300 + rr() * 900, d = ((T * sp + rr() * 200) % 420); ctx.strokeStyle = `rgba(255,${200 + rr() * 55},120,${1 - d / 420})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(b[0] + Math.cos(ang) * d, b[1] + Math.sin(ang) * d); ctx.lineTo(b[0] + Math.cos(ang) * (d + 26), b[1] + Math.sin(ang) * (d + 26)); ctx.stroke(); }
      ctx.restore();
      const fl = L.clamp(1 - T / 0.1); if (fl > 0) { ctx.fillStyle = `rgba(255,248,226,${0.18 * fl})`; ctx.fillRect(0, 0, 1080, 1920); }
      return;
    }
    backdrop(ctx, L, PB, 12);
    ctx.fillStyle = 'rgba(4,20,40,0.55)'; ctx.fillRect(0, 0, 1080, 1920);
    const sink = L.ease.inCubic(L.clamp((T - 1.55) / 0.45));
    const H = 860 * (1 + 0.06 * (T - 1.0)), cx = 715, cy = 1230, u = H / 2.2;
    D.skull(ctx, cx + 0.03 * u, cy + 0.09 * u, u * 2.45 * 0.78, { yaw: 1.3, pitch: 0.04, tiara: false, slot: 3, warm: [0.72, 1.0, 1.12], res: 0.32 });
    ctx.save(); ctx.globalAlpha = 0.62; ctx.globalCompositeOperation = 'screen';
    const r = PB.head(ctx, cx, cy, H, { yaw: 1.3, slot: 4, xray: true, flat: 0.3, res: 0.3 });
    ctx.restore();
    const a = r.proj(...PB.BEAM_IN), b = r.proj(...PB.BEAM_OUT);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0, spacing: 7, width: 1, color: '#7FD8E8', alpha: 0.06, seed: 5, density: () => 0.6, length: [200, 600] });
    PB.label(ctx, 'X-RAY · PATH OF THE BEAM', 60, 1520, ((T - 1.08) / 0.12) * (1 - sink), { col: PB.CY, size: 26 });
    if (sink > 0) { ctx.fillStyle = `rgba(6,9,20,${0.92 * sink})`; ctx.fillRect(0, 0, 1080, 1920); }
    const [p, q] = PB.extend(a, b, 2400);
    const P = [L.lerp(p[0], L0[0][0], sink), L.lerp(p[1], L0[0][1], sink)], Q = [L.lerp(q[0], L0[1][0], sink), L.lerp(q[1], L0[1][1], sink)];
    PB.beam(ctx, P, Q, { T, w: 6 });
    PB.burst(ctx, a[0], a[1], 160, 0.5 * (1 - sink)); PB.burst(ctx, b[0], b[1], 160, 0.5 * (1 - sink));
  } });
})();
