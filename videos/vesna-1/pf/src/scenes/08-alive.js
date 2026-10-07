// 08 · alive · T 20.25–23.0 · the X-ray: her skull inside the cyan ghost of her head; fracture cracks draw across it (20.3);
// a PiP of the leg bones snaps (21.35); a heart-monitor line runs across and SPIKES on ALIVE (22.16).
(function () {
  'use strict';
  FILM.scene({ id: 'alive', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 151, color: '#061220' });
    PB.grid(ctx, 0.06, 60);
    const H = 900 * (1 + 0.04 * (T - 20.25)), cx = 560, cy = 1000, u = H / 2.2;
    D.skull(ctx, cx + 0.02 * u, cy + 0.06 * u, u * 2.45 * 0.74, { yaw: 0.45, pitch: 0.04, tiara: false, slot: 3, warm: [0.72, 1.0, 1.12], res: 0.32 });
    ctx.save(); ctx.globalAlpha = 0.55; ctx.globalCompositeOperation = 'screen';
    PB.fem(ctx, cx, cy, H, { yaw: 0.45, slot: 4, xray: true, flat: 0.3, res: 0.3, cap: false });
    ctx.restore();
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0, spacing: 7, width: 1, color: '#7FD8E8', alpha: 0.05, seed: 5, density: () => 0.6, length: [200, 600] });
    // fracture: a jagged crack drawing across the crown
    const cr = L.clamp((T - 20.3) / 0.35);
    if (cr > 0) {
      const pts = [[cx - 200, cy - 330], [cx - 140, cy - 300], [cx - 110, cy - 340], [cx - 40, cy - 310], [cx - 10, cy - 350], [cx + 60, cy - 320], [cx + 90, cy - 280], [cx + 150, cy - 300]];
      const n = Math.max(2, Math.round(pts.length * cr));
      L.inkPath(ctx, pts.slice(0, n), { width: 6, color: '#FF5A40', seed: 300 });
      L.inkPath(ctx, [[cx - 40, cy - 310], [cx - 60, cy - 250], [cx - 30, cy - 220]].slice(0, Math.max(2, Math.round(3 * cr))), { width: 4, color: '#FF5A40', seed: 301 });
      PB.label(ctx, 'SKULL: FRACTURED', 80, 560, (T - 20.4) / 0.15, { col: '#FF7A5A', size: 28 });
    }
    // PiP: leg bones (engraved, cyan), snapping
    const pp = L.ease.outBack(L.clamp((T - 21.25) / 0.2));
    if (pp > 0.02) {
      const px = 860, py = 1450, pr = 170 * pp;
      ctx.save(); ctx.beginPath(); ctx.arc(px, py, pr, 0, 7); ctx.clip();
      ctx.fillStyle = '#04101C'; ctx.fillRect(px - pr, py - pr, pr * 2, pr * 2);
      const snap = L.clamp((T - 21.35) / 0.1);
      for (const dx of [-45, 45]) {
        const bone = (y0, y1, off) => D.engrave(ctx, L.capsulePts(px + dx + off, (y0 + y1) / 2, y1 - y0, 16, Math.PI / 2, 30), { ink: '#BFF0F8', base: '#1A4050', light: () => 0.6, angle: 0.1, spacing: 3, seed: 320 + dx + y0, outW: 2, cross: false, stip: false });
        bone(py - 150, py - 10 - 12 * snap, 0);
        bone(py + 10 + 12 * snap, py + 150, (dx > 0 ? 14 : -10) * snap);
      }
      ctx.restore();
      L.inkCircle(ctx, px, py, pr, { width: 6, color: '#E6B652', seed: 330 });
      PB.label(ctx, 'LEGS: BROKEN', px - 180, py - pr - 40, (T - 21.4) / 0.15, { col: '#FF7A5A', size: 26 });
    }
    // heartbeat line → ALIVE
    if (T > 21.7) {
      const base = 1700, pts = [];
      for (let x = 0; x <= 1080; x += 4) {
        const tau = T - (1080 - x) / 900;
        const d = tau - 22.16;
        const v = 220 * Math.exp(-(((d - 0.02) / 0.02) ** 2)) - 70 * Math.exp(-(((d - 0.06) / 0.02) ** 2)) + 30 * Math.exp(-(((d + 0.07) / 0.04) ** 2));
        pts.push([x, base - v]);
      }
      PB.beam(ctx, [0, base], [0, base], { k: 0 });
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
      [[14, 0.12], [6, 0.3], [3, 1]].forEach(([w, al], i) => { ctx.strokeStyle = i === 2 ? `rgba(255,248,214,${al})` : `rgba(242,194,48,${al})`; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); });
      ctx.restore();
    }
  } });
})();
