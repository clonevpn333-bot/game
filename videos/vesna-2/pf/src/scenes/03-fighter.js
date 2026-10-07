// 03 · fighter · T 6.0–9.75 · NOT BY A BOMB: an engraved bomb is struck out in red (6.73). Then the night sky: the DC-9
// (3D) above, a Czechoslovak MiG-21 (engraved) streaks in beneath it with an afterburner trail (7.65–9.5); a callout
// marks the claim — CZECHOSLOVAK FIGHTER? — the curiosity line drawn from fighter to airliner.
(function () {
  'use strict';
  FILM.scene({ id: 'fighter', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    if (T < 7.5) {
      PB.plate(ctx, { seed: 221, color: '#0B0D16' });
      PB.grid(ctx, 0.05, 60);
      // the bomb: an engraved suitcase with a timer
      const bx = 540, by = 1050, s = 1 + 0.04 * (T - 6);
      ctx.save(); ctx.translate(bx, by); ctx.scale(s, s);
      D.engrave(ctx, L.rrectPts(-260, -170, 520, 340, 30), { ink: '#B07A48', base: '#2A1808', light: () => 0.45, angle: 0.9, spacing: 4.5, seed: 260, smooth: false, outW: 5 });
      D.engrave(ctx, L.rrectPts(-80, -230, 160, 70, 20), { ink: '#8A6040', base: '#1A1006', light: () => 0.4, spacing: 3.5, seed: 261, smooth: false, outW: 3, cross: false, stip: false });
      ctx.fillStyle = '#0A0A0A'; ctx.fillRect(-130, -60, 260, 110); L.inkPath(ctx, L.rectPts(-130, -60, 260, 110, 30), { closed: true, width: 3, color: '#000', seed: 262 });
      L.text(ctx, '0:00', 0, -4, { size: 72, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#FF5A40' });
      for (const dx of [-200, 200]) L.inkPath(ctx, [[dx, -170], [dx, 170]], { width: 8, color: '#5A3A1A', seed: 263 + dx, taper: 0 });
      ctx.restore();
      const st = L.clamp((T - 6.73) / 0.08);
      if (st > 0) { L.inkCircle(ctx, bx, by, 380, { width: 16, color: PB.RED, seed: 270 }); L.inkPath(ctx, [[bx - 270, by + 270], [L.lerp(bx - 270, bx + 270, st), L.lerp(by + 270, by - 270, st)]], { width: 18, color: PB.RED, seed: 271, taper: 0 }); }
      PB.label(ctx, 'OFFICIAL CAUSE: A BOMB', 230, 1520, (T - 6.2) / 0.15, { size: 26, col: PB.IV });
      return;
    }
    PB.plate(ctx, { seed: 222, color: '#0A1024' });
    const g = ctx.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, 'rgba(30,48,96,0.9)'); g.addColorStop(1, 'rgba(6,8,18,0.9)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
    PB.clouds(ctx, T, { vx: -500, seed: 23, n: 8, alpha: 0.7, yOff: 700 });
    const r = PB.jet(ctx, 640, 640, 62, { yaw: -0.4, pitch: 0.12, key: [0.2, 0.9, 0.6], flat: 0.3, spacing: 4, res: 0.34, slot: 33 });
    // the fighter streaks in from the lower left, climbing
    const u = L.ease.outCubic(L.clamp((T - 7.6) / 1.6));
    const fx = L.lerp(-300, 470, u), fy = L.lerp(1500, 1120, u);
    // afterburner trail (light)
    PB.beam(ctx, [fx - 900, fy + 380], [fx - 250, fy + 100], { T, w: 6, dots: false, k: 0.7 });
    PB.burst(ctx, fx - 260, fy + 10, 120, 0.9, '255,150,60');
    FILM.pbMig(ctx, L, D, fx, fy, 1.15, -0.4, 280);
    // the claim, drawn as the curiosity line from fighter to airliner
    if (T > 8.8) { const k = L.clamp((T - 8.8) / 0.4), jp = r.proj(0, -0.4, 0); L.inkPath(ctx, [[fx + 200, fy - 90], [L.lerp(fx + 200, jp[0], k), L.lerp(fy - 90, jp[1], k)]], { width: 3, color: PB.Y, seed: 290 }); PB.label(ctx, 'CZECHOSLOVAK MiG?', 380, 1440, (T - 8.9) / 0.15, { size: 30 }); PB.label(ctx, 'THE 2009 CLAIM', 380, 1500, (T - 9.0) / 0.15, { size: 22, col: PB.IV }); }
  } });
})();
