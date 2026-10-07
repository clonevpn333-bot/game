// 06 · flash · T 12.0–15.5 · THE BIG HIT (all type is the Remotion kinetic layer).
//   A 12.0–13.5 whiteout on the downbeat; the beam through his head, engraved light rays, camera kicks on beats
//   B 13.5–14.25 exactly 1,000 suns (25 × 40) ripple out on the 16ths (BRIGHTER THAN / 1,000 SUNS)
//   C 14.25–15.5 the suns cool to stars; his face, three-quarter, calm (PAIN: 0 → HE FELT NOTHING.)
(function () {
  'use strict';
  FILM.scene({ id: 'flash', draw(ctx, tIn, info) {
    const L = info.lib, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const kick = (tb) => { const d = T - tb; return d >= 0 && d < 0.25 ? Math.exp(-d * 18) : 0; };
    const k = Math.max(kick(12.0), kick(12.5) * 0.5, kick(13.0) * 0.5);
    PB.plate(ctx, { seed: 61, color: '#0A0E1E' });
    if (T < 13.5) {
      const z = 1 + 0.04 * k + 0.03 * (T - 12);
      ctx.save(); ctx.translate(540, 1100); ctx.scale(z, z); ctx.rotate(0.01 * k * Math.sin(T * 50)); ctx.translate(-540, -1100);
      const H = 860, cx = 600, cy = 1200;
      const eye = [cx + 0.6 * H / 2.2 * 0.35, cy - 0.17 * H / 2.2];
      PB.rays(ctx, eye[0], eye[1], 120, 1300, 64, 0.85, 7, PB.Y, T);
      PB.burst(ctx, eye[0], eye[1], 900, 0.5);
      const r = PB.head(ctx, cx, cy, H, { yaw: 1.3, key: [0.4, 0.3, 0.86], fill: [-0.6, 0.2, 0.5], rim: [-0.9, 0.2, -0.3], res: 0.32, slot: 10, warm: [1, 0.95, 0.8] });
      const a = r.proj(...PB.BEAM_IN), b = r.proj(...PB.BEAM_OUT);
      const [p, q] = PB.extend(a, b, 2400);
      PB.beam(ctx, p, q, { T, w: 9 });
      PB.beam(ctx, a, b, { T, w: 7, k: 0.8, dots: false });
      PB.burst(ctx, a[0], a[1], 300, 0.8); PB.burst(ctx, b[0], b[1], 360, 0.9);
      ctx.restore();
      const wo = T < 12.06 ? 1 : L.clamp(1 - (T - 12.06) / 0.3);
      if (wo > 0) { ctx.fillStyle = `rgba(255,250,236,${0.97 * wo})`; ctx.fillRect(0, 0, 1080, 1920); }
      return;
    }
    const cool = L.clamp((T - 14.2) / 0.4);
    const COLS = 25, ROWS = 40, sx = 1080 / COLS, sy = 1920 / ROWS, ox = 540, oy = 900;
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
      const x = (i + 0.5) * sx, y = (j + 0.5) * sy, d = Math.hypot(x - ox, y - oy);
      const at = 13.5 + Math.floor((d / 1150) * 8) * 0.0625;
      const p = L.clamp((T - at) / 0.08);
      if (p <= 0) continue;
      if (cool < 1) PB.sun(ctx, x, y, 15 * (1 - cool * 0.8), p * (1 - cool), i * 7 + j);
      if (cool > 0) { ctx.fillStyle = `rgba(255,240,200,${0.55 * cool * (0.4 + 0.6 * ((i * 13 + j * 7) % 5) / 4)})`; ctx.beginPath(); ctx.arc(x + ((i * 31) % 9) - 4, y + ((j * 17) % 9) - 4, 1.6, 0, Math.PI * 2); ctx.fill(); }
    }
    if (T < 14.25) {
      // a dark lens in the middle so the kinetic 1,000 SUNS reads
      const g = ctx.createRadialGradient(540, 900, 60, 540, 900, 520);
      g.addColorStop(0, 'rgba(8,10,22,0.92)'); g.addColorStop(0.6, 'rgba(8,10,22,0.7)'); g.addColorStop(1, 'rgba(8,10,22,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 300, 1080, 1200);
      PB.burst(ctx, ox, oy, 380, 0.25);
    } else {
      const H = 820, push = 1 + 0.04 * (T - 14.25);
      ctx.save(); ctx.translate(540, 1150); ctx.scale(push, push); ctx.translate(-540, -1150);
      PB.burst(ctx, 540, 1060, 700, 0.25);
      FILM.pb.head(ctx, 540, 1150, H, { yaw: 0.5, key: [-0.4, 0.5, 0.75], res: 0.34, slot: 11 });
      ctx.restore();
    }
  } });
})();
