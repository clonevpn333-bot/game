// 02 · ussr · T 3.0–6.5 · the beam line (L0 from the hook) bends into the outline of the USSR (shape morph),
// the map engraves itself; THE SOVIET UNION carved above; a red star stamps (3.5); 1978 types in (4.3);
// a pin drops on Protvino (5.0); the camera dives into the pin and its ring opens into the U-70 (→ ring).
(function () {
  'use strict';
  const L0 = [[-120, 1000], [1200, 1430]];
  const N = 360;
  let GEO = null;
  function geo(L, PB) {
    if (GEO) return GEO;
    const raw = PB.mapProj({ cx: 0, cy: 0, k: 1 });
    const pts = PB.USSR.map(([lo, la]) => raw(lo, la));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const k = 1000 / (x1 - x0);
    const box = { cx: 540 - ((x0 + x1) / 2) * k, cy: 820 - ((y0 + y1) / 2) * k, k };
    const P = PB.mapProj(box);
    const out = PB.USSR.map(([lo, la]) => P(lo, la));
    const res = FILM.hc.resample(out.concat([out[0]]), 1);
    const step = Math.max(1, Math.floor(res.length / N));
    const ring = []; for (let i = 0; i < N; i++) ring.push(res[Math.min(res.length - 1, Math.floor((i / N) * res.length))]);
    GEO = { P, ring, out: L.smoothPts(out, true, 4), casp: PB.CASPIAN.map(([lo, la]) => P(lo, la)), pin: P(37.3, 54.9), mos: P(37.6, 55.75) };
    return GEO;
  }
  FILM.scene({ id: 'ussr', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const G = geo(L, PB);
    PB.plate(ctx, { seed: 21 });
    // camera dive into the pin
    const dive = L.ease.inCubic(L.clamp((T - 2.9) / 0.35));
    const zs = 1 + dive * 3.5, [px, py] = G.pin;
    ctx.save();
    ctx.translate(L.lerp(px, 540, dive), L.lerp(py, 900, dive)); ctx.scale(zs, zs); ctx.translate(-px, -py);
    PB.grid(ctx, 0.07, 60);
    // graticule (engraved meridians + parallels in the map's projection)
    const ga = L.clamp((T - 2.1) / 0.3) * 0.35;
    if (ga > 0) {
      for (let lo = 20; lo <= 190; lo += 20) { const ln = []; for (let la = 34; la <= 80; la += 2) ln.push(G.P(lo, la)); L.inkPath(ctx, ln, { width: 1.2, color: '#6E8CC8', alpha: ga, seed: lo }); }
      for (let la = 40; la <= 80; la += 10) { const ln = []; for (let lo = 16; lo <= 194; lo += 3) ln.push(G.P(lo, la)); L.inkPath(ctx, ln, { width: 1.2, color: '#6E8CC8', alpha: ga, seed: 400 + la }); }
    }
    // morph: line → outline
    const m = L.ease.inOutCubic(L.clamp((T - 2.0) / 0.3));
    const fillA = L.clamp((T - 2.15) / 0.25);
    const mapA = 1 - L.clamp(dive * 2.2);
    if (fillA > 0 && mapA > 0) {
      ctx.save(); ctx.globalAlpha = fillA * mapA;
      D.engrave(ctx, G.out, { ink: '#C9B48A', base: '#141A30', light: (x, y) => 0.25 + 0.35 * L.clamp(1 - Math.hypot(x - G.pin[0], y - G.pin[1]) / 900), angle: -0.8, spacing: 5.5, seed: 31, smooth: false, outW: 3, stip: true });
      // engraved coastal ripples outside the outline (classic map engraving)
      for (let k = 1; k <= 3; k++) L.inkPath(ctx, G.out.map(([x, y]) => [x, y - k * 9]).slice(0, Math.floor(G.out.length * 0.42)), { width: 1, color: '#6E8CC8', alpha: 0.5 - k * 0.12, seed: 50 + k });
      ctx.beginPath(); L.tracePath(ctx, L.smoothPts(G.casp, true, 4), true); ctx.fillStyle = '#0B1226'; ctx.fill();
      L.inkPath(ctx, L.smoothPts(G.casp, true, 4), { closed: true, width: 2, color: '#000', seed: 61 });
      ctx.restore();
    }
    const pts = G.ring.map((q, i) => { const u = i / (N - 1); const l = [L.lerp(L0[0][0], L0[1][0], u), L.lerp(L0[0][1], L0[1][1], u)]; return [L.lerp(l[0], q[0], m), L.lerp(l[1], q[1], m)]; });
    // the outline is the beam: hot while it bends, then settles to an inked gold coast
    const hot = 1 - L.clamp((T - 2.3) / 0.3);
    if (hot > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; [[50, 0.08], [22, 0.2], [6, 0.95]].forEach(([w, a], i) => { ctx.strokeStyle = i === 2 ? `rgba(255,248,220,${a * hot})` : `rgba(242,194,48,${a * hot})`; ctx.lineWidth = w / zs; ctx.beginPath(); pts.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); }); ctx.restore(); }
    if (T > 2.3 && mapA > 0) L.inkPath(ctx, pts, { width: 3.5 / Math.sqrt(zs), color: PB.Y, alpha: 0.9 * mapA, seed: 70 });
    // the pin on Protvino
    const pinP = L.clamp((T - 2.75) / 0.12);
    if (pinP > 0 && dive < 0.5) {
      const drop = (1 - L.ease.outBounce(pinP)) * 120;
      const pr = 16;
      for (let k = 0; k < 3; k++) { const ph = ((T - 2.75) * 2.5 + k / 3) % 1; if (T > 2.8) L.inkCircle(ctx, px, py, pr + ph * 70, { width: 2.5 / Math.sqrt(zs), color: PB.Y, alpha: (1 - ph) * 0.8 * (1 - dive), seed: 80 + k }); }
      ctx.fillStyle = PB.RED; ctx.beginPath(); ctx.arc(px, py - drop, pr * 0.6, 0, Math.PI * 2); ctx.fill();
      L.inkCircle(ctx, px, py - drop, pr, { width: 4 / Math.sqrt(zs), color: PB.Y, seed: 90 });
      ctx.fillStyle = '#FFF4D0'; ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2); ctx.fill();
      // Moscow dot
      ctx.fillStyle = PB.IV; ctx.beginPath(); ctx.arc(G.mos[0], G.mos[1], 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    const ua = 1 - dive;
    // the pin's ring opening into the accelerator ring (screen space)
    if (dive > 0) { const R = L.lerp(16 * zs, 400, dive), rcx = L.lerp(px, 540, dive), rcy = L.lerp(py, 900, dive); L.inkCircle(ctx, rcx, rcy, R, { width: 6, color: PB.Y, seed: 95 }); PB.burst(ctx, rcx, rcy, R * 1.3, 0.25 * dive); }
    if (pinP > 0 && ua > 0) {
      ctx.save(); ctx.globalAlpha = ua;
      const lx = px + 60, ly = py + 90;
      L.inkPath(ctx, [[px + 10, py + 10], [lx, ly]], { width: 2, color: PB.Y, seed: 99 });
      PB.label(ctx, 'PROTVINO', lx - 10, ly + 30, (T - 2.8) / 0.12, { size: 30 });
      PB.label(ctx, 'NEAR MOSCOW', lx - 10, ly + 86, (T - 2.86) / 0.12, { size: 22, col: PB.IV });
      ctx.restore();
    }
    // titles
    ctx.save(); ctx.globalAlpha = ua;
    // red star stamp
    const st = L.clamp((T - 2.25) / 0.06);
    if (st > 0) {
      const s = 70 * (1 + 0.6 * (1 - L.ease.outCubic(st))), sx = 540, sy = 150;
      const star = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.42 : s; star.push([sx + Math.cos(a) * r, sy + Math.sin(a) * r]); }
      D.engrave(ctx, star, { ink: '#FF8A70', base: PB.RED, light: () => 0.55, spacing: 3.5, seed: 120, smooth: false, outW: 3, cross: false, stip: false });
    }
    // 1978: digits roll in on the beat
    const yr = '1978';
    for (let i = 0; i < 4; i++) {
      const p = L.clamp((T - 2.5 - i * 0.0625) / 0.08);
      if (p <= 0) continue;
      const x = 540 + (i - 1.5) * 150, y = 1180;
      ctx.save(); ctx.beginPath(); ctx.rect(x - 80, y - 110, 160, 220); ctx.clip();
      L.text(ctx, yr[i], x, y + (1 - L.ease.outBack(p)) * 200, { size: 220, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: i < 2 ? PB.IV : PB.Y });
      ctx.restore();
    }
    ctx.restore();
  } });
})();
