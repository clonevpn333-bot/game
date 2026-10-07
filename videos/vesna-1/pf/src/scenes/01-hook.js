// 01 · hook · T 0–3.0 · frame 1: she is already falling.
//   A 0–1.5  Vesna (3D, hair lifted by the wind) tumbling through cloud banks that tear upward; the fall line streaks
//            down to her; the altimeter is already racing (kinetic: SHE FELL / 33,000 FEET.)
//   B 1.5–3.0 the altimeter fills the frame, clouds rushing; NO PARACHUTE: a parachute icon is struck through (2.16)
//            2.7–3.0 TAPE-STOP: everything rewinds upward (→ the board: she was never supposed to be there)
(function () {
  'use strict';
  const ALT0 = 33330;
  FILM.scene({ id: 'hook', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const rew = L.ease.inCubic(L.clamp((T - 2.7) / 0.3));                 // rewind
    const Te = T - rew * 1.4;                                              // clouds/counter run backwards
    PB.plate(ctx, { seed: 81, color: '#0A1024' });
    const sky = ctx.createLinearGradient(0, 0, 0, 1920); sky.addColorStop(0, 'rgba(40,60,110,0.35)'); sky.addColorStop(1, 'rgba(8,10,24,0)');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 1080, 1920);
    PB.clouds(ctx, Te, { vy: 2200, seed: 11, n: 14, alpha: 0.8 });
    // speed lines
    const rr = L.rng(L.hash('speed'));
    for (let i = 0; i < 40; i++) { const x = rr() * 1080, sp = 2400 + rr() * 2000, y = ((rr() * 2400 - Te * sp) % 2400 + 2400) % 2400 - 200; L.inkPath(ctx, [[x, y], [x, y + 120 + rr() * 160]], { width: 1.5 + rr() * 2, color: '#C8D2EC', alpha: 0.35 * (1 - rew), seed: 900 + i, taper: [4, 30] }); }
    const ft = ALT0 - Math.max(0, Te) * 2100;
    // the curiosity line: an altitude tape down the right edge, ticks racing upward as she falls
    PB.beam(ctx, [1000, -40], [1000, 1960], { T: Te, w: 4, speed: 2600, k: 0.8, dots: false });
    for (let k = -2; k < 24; k++) { const y = ((k * 100 - (ft % 100) * 1.0) * 1) + ((ft / 100) % 1) * 0; const yy = 960 - ((ft % 1000) / 1000) * 1000 + k * 100 - 1000; if (yy < -20 || yy > 1940) continue; L.inkPath(ctx, [[1000, yy], [k % 5 ? 1030 : 1060, yy]], { width: k % 5 ? 2 : 4, color: PB.Y, alpha: 0.8, seed: 950 + k, taper: 0 }); }
    if (T < 1.5) {
      // the fall line from the top of the frame down to her
      const hx = 520 + 20 * Math.sin(T * 3), hy = 1020;
      const z = 1 + 0.05 * T;
      ctx.save(); ctx.translate(hx, hy); ctx.scale(z, z); ctx.rotate(0.9 + 0.55 * T); ctx.translate(-hx, -hy);
      PB.fem(ctx, hx, hy, 860, { yaw: 0.6 + 0.12 * Math.sin(T * 1.7), pitch: -0.25, wind: 1, key: [-0.3, 0.6, 0.75], rim: [0.6, -0.6, -0.4], res: 0.3, slot: 1 });
      ctx.restore();
      PB.clouds(ctx, Te + 0.4, { vy: 3200, seed: 12, n: 6, alpha: 0.9, scale: 1.5, y0: 1550, y1: 2300 });
      PB.alt(ctx, 540, 1460, ft, { s: 1.1 });
    } else {
      // the altimeter, huge: a dial with a needle spinning down, drum digits
      const cx = 540, cy = 1040, R = 330;
      const lit = D.lights([{ x: 400, y: 800, r: 1000, k: 0.5 }], 0.08);
      D.engrave(ctx, L.ellipsePts(cx, cy, R + 50, R + 50, 80), { ink: '#8A9AB8', base: '#1A2030', light: lit, angle: 0.4, spacing: 4.5, seed: 500, outW: 5 });
      D.engrave(ctx, L.ellipsePts(cx, cy, R, R, 80), { ink: '#2A3048', base: '#0C1020', light: () => 0.3, angle: -0.6, spacing: 5, seed: 501, outW: 4, cross: false, stip: false });
      for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k / 10) * Math.PI * 2; L.inkPath(ctx, [[cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78], [cx + Math.cos(a) * R * 0.93, cy + Math.sin(a) * R * 0.93]], { width: 6, color: '#F2E8D0', seed: 510 + k, taper: 0 }); L.text(ctx, String(k), cx + Math.cos(a) * R * 0.64, cy + Math.sin(a) * R * 0.64, { size: 44, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#F2E8D0' }); }
      const na = -Math.PI / 2 + ((ft / 1000) % 10) / 10 * Math.PI * 2;
      L.inkPath(ctx, [[cx - Math.cos(na) * 40, cy - Math.sin(na) * 40], [cx + Math.cos(na) * R * 0.85, cy + Math.sin(na) * R * 0.85]], { width: 12, color: PB.Y, seed: 520, taper: [0, 20] });
      L.inkCircle(ctx, cx, cy, 20, { width: 3, color: '#000', fill: '#3A3A3A', seed: 521 });
      PB.alt(ctx, cx, cy + R * 0.42, ft, { s: 0.75 });
      // NO PARACHUTE: a parachute icon, struck through on the word
      const px = 540, py = 1560, pp = L.clamp((T - 1.95) / 0.15);
      if (pp > 0) {
        ctx.save(); ctx.globalAlpha = pp * (1 - rew);
        const can = []; for (let k = 0; k <= 24; k++) { const a = Math.PI + (k / 24) * Math.PI; can.push([px + Math.cos(a) * 110, py - 40 + Math.sin(a) * 80]); }
        D.engrave(ctx, can.concat([[px + 110, py - 40]]), { ink: '#F2E8D0', base: '#2A3048', light: () => 0.5, angle: 1.2, spacing: 4, seed: 530, smooth: false, outW: 3, cross: false, stip: false });
        for (const dx of [-110, -40, 40, 110]) L.inkPath(ctx, [[px + dx, py - 40], [px, py + 70]], { width: 2.5, color: '#F2E8D0', seed: 531 + dx });
        const st = L.clamp((T - 2.16) / 0.08);
        if (st > 0) { L.inkCircle(ctx, px, py, 150, { width: 12, color: PB.RED, seed: 540 }); L.inkPath(ctx, [[px - 106, py + 106], [L.lerp(px - 106, px + 106, st), L.lerp(py + 106, py - 106, st)]], { width: 14, color: PB.RED, seed: 541, taper: 0 }); }
        ctx.restore();
      }
    }
    if (rew > 0) { ctx.fillStyle = `rgba(4,6,14,${0.85 * rew})`; ctx.fillRect(0, 0, 1080, 1920); for (let k = 0; k < 6; k++) { const y = ((k * 330 + T * 5000) % 1920); ctx.fillStyle = `rgba(242,232,208,${0.08 * rew})`; ctx.fillRect(0, y, 1080, 8); } }
  } });
})();
