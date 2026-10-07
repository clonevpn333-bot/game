// 06 · flash · T 16.0–19.5 · THE DROP.
//   A 16.0–17.5 whiteout on the downbeat; the beam through his head, engraved light rays, camera kicks on beats; A FLASH (the one slam) / BRIGHTER THAN
//   B 17.5–18.4 exactly 1,000 suns (25 × 40) pop outward from his eye on the 16ths: 1,000 SUNS
//   C 18.4–19.5 the suns cool to stars; his face, three-quarter, calm: AND NO PAIN.
(function () {
  'use strict';
  FILM.scene({ id: 'flash', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const kick = (tb) => { const d = T - tb; return d >= 0 && d < 0.25 ? Math.exp(-d * 18) : 0; };
    const k = Math.max(kick(16.0), kick(16.5) * 0.5, kick(17.0) * 0.5);
    PB.plate(ctx, { seed: 61, color: '#0A0E1E' });
    if (T < 17.5) {
      const z = 1 + 0.04 * k + 0.03 * (T - 16);
      ctx.save(); ctx.translate(540, 1100); ctx.scale(z, z); ctx.rotate(0.01 * k * Math.sin(T * 50)); ctx.translate(-540, -1100);
      const H = 860, cx = 600, cy = 1150;
      // rays behind the head
      const eye = [cx + 0.6 * H / 2.2 * 0.35, cy - 0.17 * H / 2.2];
      PB.rays(ctx, eye[0], eye[1], 120, 1300, 64, 0.85, 7, PB.Y, T);
      PB.burst(ctx, eye[0], eye[1], 900, 0.5);
      const r = FILM.pb.head(ctx, cx, cy, H, { yaw: 1.3, key: [0.4, 0.3, 0.86], fill: [-0.6, 0.2, 0.5], rim: [-0.9, 0.2, -0.3], res: 0.32, slot: 10, warm: [1, 0.95, 0.8] });
      const a = r.proj(...PB.BEAM_IN), b = r.proj(...PB.BEAM_OUT);
      const [p, q] = PB.extend(a, b, 2400);
      PB.beam(ctx, p, q, { T, w: 9 });
      PB.beam(ctx, a, b, { T, w: 7, k: 0.8, dots: false });
      PB.burst(ctx, a[0], a[1], 300, 0.8); PB.burst(ctx, b[0], b[1], 360, 0.9);
      ctx.restore();
      // whiteout on the downbeat
      const wo = T < 16.06 ? 1 : L.clamp(1 - (T - 16.06) / 0.3);
      if (wo > 0) { ctx.fillStyle = `rgba(255,250,236,${0.97 * wo})`; ctx.fillRect(0, 0, 1080, 1920); }
      // A FLASH — the film's one scale-slam
      const sp = L.clamp((T - 16.28) / 0.1);
      if (sp > 0) { ctx.save(); ctx.translate(540, 250); const sc = 1 + 1.2 * (1 - L.ease.outCubic(sp)); ctx.scale(sc, sc); L.text(ctx, 'A FLASH', 0, 0, { size: 160, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: '#FFF6DC', alpha: L.clamp(sp * 2) }); ctx.restore(); }
      PB.word(ctx, 'BRIGHTER THAN', 540, 400, 92, (T - 16.58) / 0.12, { color: PB.Y });
      return;
    }
    const cool = L.clamp((T - 18.4) / 0.5);
    // 1,000 suns
    const COLS = 25, ROWS = 40, sx = 1080 / COLS, sy = 1920 / ROWS;
    const ox = 540, oy = 860;
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) {
      const x = (i + 0.5) * sx, y = (j + 0.5) * sy, d = Math.hypot(x - ox, y - oy);
      const at = 17.5 + Math.floor((d / 1150) * 6) * 0.125;          // ripple out on the 16ths
      const p = L.clamp((T - at) / 0.1);
      if (p <= 0) continue;
      if (cool < 1) PB.sun(ctx, x, y, 15 * (1 - cool * 0.8), p * (1 - cool), i * 7 + j);
      if (cool > 0) { ctx.fillStyle = `rgba(255,240,200,${0.55 * cool * (0.4 + 0.6 * ((i * 13 + j * 7) % 5) / 4)})`; ctx.beginPath(); ctx.arc(x + ((i * 31) % 9) - 4, y + ((j * 17) % 9) - 4, 1.6, 0, Math.PI * 2); ctx.fill(); }
    }
    // his head, calm (cut on 18.5 to three-quarter)
    if (T < 18.5) {
      ctx.fillStyle = 'rgba(10,14,30,0.35)'; ctx.fillRect(0, 0, 1080, 1920);
      PB.burst(ctx, ox, oy, 380, 0.55);
      ctx.save(); ctx.fillStyle = 'rgba(8,10,22,0.82)'; ctx.beginPath(); ctx.roundRect(150, 760, 780, 300, 30); ctx.fill(); ctx.restore();
      L.inkPath(ctx, L.rrectPts(150, 760, 780, 300, 30), { closed: true, width: 4, color: PB.Y, seed: 640 });
      const n = Math.round(1000 * L.clamp((T - 17.5) / 0.75));
      L.text(ctx, n.toLocaleString('en-US'), 540, 880, { size: 190, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: PB.Y });
      PB.word(ctx, 'SUNS', 540, 1005, 80, (T - 18.1) / 0.1, { family: PB.MONO, weight: 600 });
    } else {
      const H = 820, push = 1 + 0.04 * (T - 18.5);
      ctx.save(); ctx.translate(540, 1100); ctx.scale(push, push); ctx.translate(-540, -1100);
      PB.burst(ctx, 540, 1000, 700, 0.25);
      const r = FILM.pb.head(ctx, 540, 1080, H, { yaw: 0.5, key: [-0.4, 0.5, 0.75], res: 0.34, slot: 11 });
      const a = r.proj(...PB.BEAM_IN), b = r.proj(...PB.BEAM_OUT);
      const [p, q] = PB.extend(a, b, 2400);
      PB.beam(ctx, b, q, { T, w: 4, k: 0.45 });
      ctx.restore();
      PB.word(ctx, 'AND NO', 540, 230, 120, (T - 18.45) / 0.15);
      PB.word(ctx, 'PAIN.', 540, 370, 150, (T - 18.95) / 0.15, { color: PB.Y });
    }
  } });
})();
