// 07 · forest · T 17.0–20.25 · CRASH on the downbeat into a steep snowy slope of firs: snow bursts, shake.
// 18.7 a villager trudges in from the left through the snow (walk cycle, footprints); 19.4 sound rings pulse from the wreck.
(function () {
  'use strict';
  function fir(ctx, L, D, x, y, h, seed, lit) {
    for (let k = 0; k < 3; k++) {
      const ty = y - h * (0.3 + k * 0.28), w = h * (0.42 - k * 0.1);
      const pts = [[x - w, ty + h * 0.32], [x, ty - h * 0.12], [x + w, ty + h * 0.32]];
      D.engrave(ctx, pts, { ink: '#2E4A3A', base: '#0A140E', light: () => lit * 0.6, angle: 1.0, spacing: 3.6, seed: seed + k, smooth: false, outW: 2.2, cross: false, stip: false });
      L.inkPath(ctx, [[x - w * 0.8, ty + h * 0.28], [x, ty - h * 0.06], [x + w * 0.85, ty + h * 0.26]], { width: 5, color: '#F2F0EA', alpha: 0.85, seed: seed + 9 + k });
    }
    L.inkPath(ctx, [[x, y], [x, y - h * 0.2]], { width: 6, color: '#2A1A10', seed: seed + 20, taper: 0 });
  }
  function walker(ctx, L, D, x, y, s, ph, seed) {
    const P = (a, b) => [x + a * s, y + b * s];
    const leg = (side) => { const a = Math.sin(ph + (side ? Math.PI : 0)) * 0.45; return [P(0, -90), P(Math.sin(a) * 45, -45), P(Math.sin(a) * 50 + 8, 0)]; };
    for (const sd of [0, 1]) L.inkPath(ctx, leg(sd), { width: 14 * s, color: '#0A0C14', seed: seed + sd, taper: 0 });
    const coat = [P(-26, -190), P(24, -190), P(34, -80), P(-34, -80)];
    D.engrave(ctx, coat, { ink: '#5A5A6A', base: '#0A0C14', light: () => 0.35, angle: 1.2, spacing: 3, seed: seed + 3, smooth: false, outW: 2, cross: false, stip: false });
    L.inkCircle(ctx, x, y - 205 * s, 15 * s, { width: 2, color: '#000', fill: '#1A1A22', seed: seed + 4 });
    L.inkPath(ctx, [P(-20, -214), P(20, -214)], { width: 7 * s, color: '#0A0C14', seed: seed + 5, taper: 0 });
    const arm = Math.sin(ph) * 0.4; L.inkPath(ctx, [P(0, -180), P(Math.sin(arm) * 40, -120)], { width: 10 * s, color: '#0A0C14', seed: seed + 6, taper: 0 });
  }
  FILM.scene({ id: 'forest', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const sh = T < 17.5 ? (1 - (T - 17.0) / 0.5) * 20 : 0;
    PB.plate(ctx, { seed: 141, color: '#0C1220' });
    const g = ctx.createLinearGradient(0, 0, 0, 1200); g.addColorStop(0, 'rgba(70,84,120,0.8)'); g.addColorStop(1, 'rgba(20,26,44,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1200);
    ctx.save(); ctx.translate(Math.sin(T * 80) * sh, Math.cos(T * 60) * sh);
    // the slope: engraved snow, blue hatched shadows, diagonal
    const slope = [[-40, 700], [1120, 1150], [1120, 1960], [-40, 1960]];
    D.engrave(ctx, slope, { ink: '#E8ECF4', base: '#AEB8CC', light: (x, y) => 0.18 + 0.25 * L.clamp((x - 300) / 900), angle: 0.4, spacing: 5, seed: 150, smooth: false, outW: 3, stip: false });
    // firs, back to front
    const rr = L.rng(L.hash('firs'));
    const trees = []; for (let i = 0; i < 22; i++) { const x = rr() * 1100 - 10, base = 700 + (x + 40) * 0.39; trees.push([x, base + rr() * 600, 160 + rr() * 220, i]); }
    trees.sort((a, b) => a[1] - b[1]).forEach(([x, y, h, i]) => { if (Math.abs(x - 600) < 120 && y > 1050 && y < 1350) return; fir(ctx, L, D, x, y, h, 160 + i * 30, 0.5); });
    // the wreck section, half-buried, smoking
    const wx = 610, wy = 1230;
    ctx.save(); ctx.translate(wx, wy); ctx.rotate(0.38);
    D.engrave(ctx, L.rrectPts(-200, -80, 400, 160, 30), { ink: '#B8C2D8', base: '#141A2C', light: () => 0.4, angle: 1.4, spacing: 4, seed: 190, smooth: false, outW: 4 });
    for (let k = 0; k < 4; k++) L.inkPath(ctx, L.rrectPts(-150 + k * 80, -60, 26, 36, 10), { closed: true, width: 2, color: '#C9D1E6', seed: 191 + k });
    ctx.restore();
    // snow burst at impact + spray falling back
    const bt = T - 17.0;
    if (bt < 1.6) { const r2 = L.rng(L.hash('snowburst')); for (let i = 0; i < 90; i++) { const a = -Math.PI * (0.1 + r2() * 0.8), sp = 300 + r2() * 900; const x = wx + Math.cos(a) * sp * bt, y = wy + Math.sin(a) * sp * bt + 700 * bt * bt; ctx.fillStyle = `rgba(242,244,250,${0.9 * (1 - bt / 1.6)})`; ctx.beginPath(); ctx.arc(x, y, 3 + r2() * 5, 0, 7); ctx.fill(); } }
    // smoke (engraved strokes drifting)
    for (let k = 0; k < 5; k++) { const ph = ((T - 17) * 0.4 + k / 5) % 1; L.inkPath(ctx, [[wx - 40 + k * 20, wy - 100 - ph * 400], [wx - 10 + k * 20 + 40 * Math.sin(ph * 6), wy - 160 - ph * 420]], { width: 10, color: '#8A92A8', alpha: 0.35 * (1 - ph), seed: 200 + k }); }
    // the villager trudges in
    if (T > 18.6) {
      const wk = L.clamp((T - 18.6) / 1.65), vx = L.lerp(-60, 330, wk), vy = 700 + (vx + 40) * 0.39 + 300;
      for (let k = 0; k < 8; k++) { const fx = vx - 30 - k * 46; if (fx < -40) break; ctx.fillStyle = 'rgba(80,90,120,0.6)'; ctx.beginPath(); ctx.ellipse(fx, 700 + (fx + 40) * 0.39 + 302 + (k % 2) * 8, 10, 5, 0.38, 0, 7); ctx.fill(); }
      walker(ctx, L, D, vx, vy, 1.0, (T - 18.6) * 8, 220);
    }
    // sound rings: screaming
    if (T > 19.35) for (let k = 0; k < 3; k++) { const ph = ((T - 19.35) * 1.8 + k / 3) % 1; L.inkCircle(ctx, wx, wy - 40, 60 + ph * 260, { width: 4, color: PB.Y, alpha: (1 - ph) * 0.9, seed: 230 + k }); }
    // falling snow
    const r3 = L.rng(L.hash('snowfall')); for (let i = 0; i < 140; i++) { const x = (r3() * 1200 + Math.sin(T + i) * 20) % 1080, y = ((r3() * 1920 + T * (60 + r3() * 80)) % 1920); ctx.fillStyle = 'rgba(242,244,250,0.7)'; ctx.fillRect(x, y, 3, 3); }
    ctx.restore();
    const wo = T < 17.05 ? 1 : L.clamp(1 - (T - 17.05) / 0.25);
    if (wo > 0) { ctx.fillStyle = `rgba(250,250,255,${0.95 * wo})`; ctx.fillRect(0, 0, 1080, 1920); }
  } });
})();
