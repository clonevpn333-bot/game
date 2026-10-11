// 02 · lock · T 3.0–6.5 (v2) · SECOND HOOK on the 3.0 hit, all motion: the DC-9 (3D) races through cloud, camera
// tracking with a slow roll; a fighter's HUD crosshair closes on it one step per beat (3.0 … 4.5), the radar PiP
// sweeping in the corner; 4.5 a missile streaks up from below; 4.83 SHOT DOWN — the jet tears apart, fire, debris
// spinning past the lens; 5.53 BY MISTAKE? stamps over the falling pieces.
(function () {
  'use strict';
  FILM.scene({ id: 'radar', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const hit = T >= 4.83, k = L.ease.outCubic(L.clamp((T - 4.83) / 1.4));
    const sh = hit && T < 5.4 ? (1 - (T - 4.83) / 0.57) * 16 : 0;
    PB.plate(ctx, { seed: 211, color: '#0A1024' });
    const g = ctx.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, hit ? 'rgba(70,40,30,0.8)' : 'rgba(30,48,96,0.9)'); g.addColorStop(1, 'rgba(6,8,18,0.9)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
    ctx.save(); ctx.translate(Math.sin(T * 90) * sh, Math.cos(T * 70) * sh);
    PB.clouds(ctx, T, { vx: -900, seed: 23, n: 10, alpha: 0.75, yOff: 300 });
    PB.streaks(ctx, T, { angle: Math.PI, speed: 3200, n: 30, alpha: 0.3 });
    const roll = 0.05 * Math.sin(T * 1.3), jx = 520 + 20 * Math.sin(T * 1.1), jy = 860 + 16 * Math.sin(T * 1.7);
    const r = PB.jet(ctx, jx, jy, 76, { yaw: -0.5, pitch: 0.2 + 0.3 * k, roll: roll + 0.25 * k, brk: k * 0.9, key: [0.2, 0.9, 0.6], flat: 0.3, spacing: 4.5, res: 0.3, slot: 34, warm: hit ? [1.15, 0.9, 0.75] : undefined });
    const c = r.proj(0, 0, 0);
    // missile: a bright streak up from the bottom-left, smoke trail behind it
    if (T > 4.5 && T < 4.9) { const u = L.clamp((T - 4.5) / 0.33); const sx = -60, sy = 1700; const mx = L.lerp(sx, c[0], u), my = L.lerp(sy, c[1], u); for (let i = 0; i < 10; i++) { const v = u * i / 10; L.inkCircle(ctx, L.lerp(sx, c[0], v) + Math.sin(i * 3) * 8, L.lerp(sy, c[1], v), 10 + (10 - i) * 2, { width: 2, color: '#8A92A8', alpha: 0.35, seed: 270 + i }); } PB.beam(ctx, [L.lerp(sx, mx, 0.7), L.lerp(sy, my, 0.7)], [mx, my], { T, w: 6, dots: false }); PB.burst(ctx, mx, my, 90, 1, '255,200,120'); }
    if (hit) {
      for (const bx of [1.4, -1.6]) { const p = r.proj(bx + (bx > 0 ? 0.6 : -0.6) * k, 0, 0); PB.burst(ctx, p[0], p[1], 300 * (0.5 + k), 0.9 * (1 - 0.4 * k), '255,120,40'); PB.rays(ctx, p[0], p[1], 20, 240 * (0.4 + k), 14, 0.8 * (1 - k * 0.6), 7 + bx * 3, '#FF9A40', T); }
      const rr = L.rng(L.hash('lockdebris'));
      for (let i = 0; i < 30; i++) { const a = rr() * 6.283, sp = 300 + rr() * 900, d = sp * (T - 4.83), sz = 10 + rr() * 30, rot = (T - 4.83) * (rr() * 8 - 4); const x = c[0] + Math.cos(a) * d, y = c[1] + Math.sin(a) * d + 300 * (T - 4.83) ** 2; const pts = [0, 1, 2].map((j) => [x + Math.cos(rot + j * 2.1 + i) * sz, y + Math.sin(rot + j * 2.1 + i) * sz * 0.7]); D.engrave(ctx, pts, { ink: '#C8CCD6', base: '#2A2E3A', light: () => 0.5, spacing: 3, seed: 500 + i, smooth: false, outW: 2, cross: false, stip: false }); }
    }
    ctx.restore();
    // HUD crosshair closing one step per beat
    if (!hit) {
      const steps = Math.min(4, Math.floor((T - 3.0) / 0.5) + 1), R = [300, 210, 140, 80][steps - 1];
      const col = steps >= 4 ? '#FF5A40' : '#F2C230', rot = (T - 3) * 0.8;
      for (let q = 0; q < 4; q++) { const a0 = rot + q * Math.PI / 2; const arc = []; for (let s = 0; s <= 10; s++) { const a = a0 + 0.3 + s * 0.09; arc.push([c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R]); } L.inkPath(ctx, arc, { width: 5, color: col, seed: 240 + q }); }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) L.inkPath(ctx, [[c[0] + dx * R * 0.55, c[1] + dy * R * 0.55], [c[0] + dx * R * 1.25, c[1] + dy * R * 1.25]], { width: 4, color: col, seed: 250 + dx * 3 + dy, taper: 0 });
      PB.label(ctx, steps >= 4 ? 'LOCK' : 'TRACKING', c[0] + R * 0.7, c[1] + R + 40, 1, { col: steps >= 4 ? '#FF7A5A' : PB.Y, size: 24 });
    }
    // radar PiP, sweeping, bottom-left
    const px = 200, py = 1420, pr = 150;
    ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, 6.283); ctx.clip(); ctx.fillStyle = '#021208'; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
    for (let q = 1; q <= 3; q++) L.inkCircle(ctx, px, py, pr * q / 3, { width: 1.2, color: '#2E7A4A', alpha: 0.7, seed: 280 + q });
    const sa = (T - 3) * 3.2; for (let q = 0; q < 18; q++) { const a = sa - q * 0.04; ctx.strokeStyle = `rgba(90,255,150,${0.4 * (1 - q / 18)})`; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * pr, py + Math.sin(a) * pr); ctx.stroke(); }
    if (!hit) { ctx.fillStyle = '#B8FFD0'; ctx.beginPath(); ctx.arc(px + 50, py - 40, 7, 0, 6.283); ctx.fill(); } else PB.burst(ctx, px + 50, py - 40, 60, 1 - k * 0.5, '255,140,60');
    ctx.restore();
    L.inkCircle(ctx, px, py, pr, { width: 6, color: '#E6B652', seed: 290 });
    // BY MISTAKE? stamp
    const st = L.clamp((T - 5.53) / 0.07);
    if (st > 0) {
      ctx.save(); ctx.translate(560, 1180); ctx.rotate(-0.15); const g2 = 1 + 0.5 * (1 - L.ease.outCubic(st)); ctx.scale(g2, g2); ctx.globalAlpha = L.clamp(st * 1.5);
      ctx.fillStyle = 'rgba(242,232,208,0.88)'; ctx.beginPath(); L.tracePath(ctx, L.rrectPts(-340, -85, 680, 170, 14), true); ctx.fill();
      L.inkPath(ctx, L.rrectPts(-340, -85, 680, 170, 14), { closed: true, width: 10, color: PB.RED, seed: 260 });
      L.text(ctx, 'BY MISTAKE?', 0, 6, { size: 100, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: PB.RED, tracking: '0.04em' });
      ctx.restore();
    }
    const wo = T >= 4.83 && T < 4.89 ? 1 : (T >= 4.89 ? L.clamp(1 - (T - 4.89) / 0.25) : 0);
    if (wo > 0) { ctx.fillStyle = `rgba(255,246,226,${0.9 * wo})`; ctx.fillRect(0, 0, 1080, 1920); }
  } });
})();
