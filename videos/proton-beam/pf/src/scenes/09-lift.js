// 09 · lift · T 27.0–32.0 · "He didn't." The flat trace from the clinic monitor SPIKES out through the top of the monitor,
// then keeps going as his life line; the camera follows its head to the right: PhD (seal, 28.75) → BACK TO WORK (29.9) →
// the line curls into a circle: the same U-70 ring, with him inside it (AT THE SAME MACHINE, 30.9). Lasting damage noted.
(function () {
  'use strict';
  let PATH = null;
  function path(L) {
    if (PATH) return PATH;
    const { MON } = FILM.pbEcg;
    const base = MON.y + MON.h * 0.62;
    const pts = [[MON.x, base], [400, base], [430, base + 30], [470, 150], [510, base + 80], [540, base], [700, base - 20], [1000, 960], [1300, 880], [1600, 840], [1900, 760], [2150, 700]];
    const R = 300, cx = 2450, cy = 900;
    for (let k = 0; k <= 64; k++) { const a = Math.PI + Math.PI * 0.75 - (k / 64) * Math.PI * 2; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
    const res = FILM.hc.resample(pts, 4);
    const cum = [0]; for (let i = 1; i < res.length; i++) cum.push(cum[i - 1] + Math.hypot(res[i][0] - res[i - 1][0], res[i][1] - res[i - 1][1]));
    const at = (x) => { let i = 0; while (i < res.length - 1 && res[i][0] < x) i++; return cum[i]; };
    PATH = { res, cum, ring: { cx, cy, R }, sSpike: at(540), sPhd: at(1000), sWork: at(1600), sCurl: at(2150), sEnd: cum[cum.length - 1], base, MON };
    return PATH;
  }
  FILM.scene({ id: 'lift', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const P = path(L);
    PB.plate(ctx, { seed: 91 });
    const keys = [[21.5, 0.6 * P.sSpike], [21.6, P.sSpike], [23.45, P.sPhd], [24.45, P.sWork], [25.2, P.sCurl], [25.8, P.sEnd]];
    let s = keys[keys.length - 1][1];
    for (let i = 0; i < keys.length - 1; i++) if (T < keys[i + 1][0]) { s = L.lerp(keys[i][1], keys[i + 1][1], L.ease.inOutSine(L.clamp((T - keys[i][0]) / (keys[i + 1][0] - keys[i][0])))); break; }
    if (T < 21.5) s = keys[0][1];
    let n = 0; while (n < P.res.length - 1 && P.cum[n] < s) n++;
    const headPt = P.res[n];
    const camTarget = Math.max(0, Math.min(P.ring.cx - 540, headPt[0] - 640));
    const camX = T > 25.2 ? L.lerp(P.res[P.cum.findIndex((c) => c >= P.sCurl)][0] - 640, P.ring.cx - 540, L.ease.inOutCubic(L.clamp((T - 25.2) / 0.6))) : camTarget;
    const dy = 200 * L.ease.inOutCubic(L.clamp((T - 21.9) / 0.8));
    PB.grid(ctx, 0.07, 60, -camX, dy);
    ctx.save(); ctx.translate(-camX, dy);
    // the monitor it bursts out of (fades)
    const mon = 1 - L.clamp((T - 21.85) / 0.35);
    if (mon > 0) {
      const M = P.MON; ctx.save(); ctx.globalAlpha = mon;
      D.engrave(ctx, L.rrectPts(M.x - 24, M.y - 24, M.w + 48, M.h + 48, 22), { ink: '#8A9AB8', base: '#141A28', light: () => 0.35, angle: 0.4, spacing: 4.5, seed: 830, smooth: false, outW: 4, cross: false, stip: false });
      ctx.fillStyle = '#031208'; ctx.fillRect(M.x, M.y, M.w, M.h); PB.grid(ctx, 0.12, 45, M.x, M.y);
      // the burst: shards of the monitor's top edge
      ctx.restore();
    }
    // the life line
    const drawn = P.res.slice(0, n + 1);
    if (drawn.length > 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      [[22, 0.1], [9, 0.28], [4, 1]].forEach(([w, al], i) => { ctx.strokeStyle = i === 2 ? `rgba(255,248,214,${al})` : `rgba(242,194,48,${al})`; ctx.lineWidth = w; ctx.beginPath(); drawn.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); });
      ctx.restore();
      PB.burst(ctx, headPt[0], headPt[1], 110, 0.9);
    }
    const spk = Math.max(0, 1 - Math.abs(T - 21.6) / 0.25);
    if (spk > 0) { PB.burst(ctx, 470, 150, 420, spk); PB.rays(ctx, 470, 150, 40, 360, 24, spk, 9, PB.Y, T); }
    // milestones
    const node = (x, y, at, title, sub, up) => {
      const p = L.clamp((T - at) / 0.18); if (p <= 0) return;
      L.inkCircle(ctx, x, y, 14 * L.ease.outBack(p), { width: 4, color: '#000', fill: PB.Y, seed: x });
      const ly = up ? y - 120 : y + 110;
      L.inkPath(ctx, [[x, y + (up ? -16 : 16)], [x, ly + (up ? 30 : -30)]], { width: 2, color: PB.Y, alpha: p, seed: x + 1 });
      PB.label(ctx, title, x, ly, p, { align: 'center', size: 32 });
      if (sub) PB.label(ctx, sub, x, ly + (up ? -56 : 56), (T - at - 0.15) / 0.2, { align: 'center', size: 22, col: PB.IV });
    };
    node(540, P.base, 21.65, '1978', 'SURVIVED', false);
    // the PhD: a diploma with a wax seal stamps down
    const pd = L.clamp((T - 23.45) / 0.08);
    if (pd > 0) {
      const x = 1000, y = 960, sc = 1 + 0.5 * (1 - L.ease.outCubic(pd));
      ctx.save(); ctx.translate(x, y - 250); ctx.scale(sc, sc); ctx.rotate(-0.06); ctx.globalAlpha = L.clamp(pd * 2);
      D.engrave(ctx, L.rectPts(-150, -100, 300, 200, 30), { ink: '#F2E8D0', base: '#C8B890', light: () => 0.2, angle: 0.3, spacing: 5, seed: 900, smooth: false, outW: 3, cross: false, stip: false });
      for (let k = 0; k < 4; k++) L.inkPath(ctx, [[-110, -40 + k * 26], [k === 3 ? 20 : 110, -40 + k * 26]], { width: 2, color: '#3A2A10', seed: 901 + k });
      L.text(ctx, 'PhD', 0, -66, { size: 40, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: '#1A1206' });
      L.inkCircle(ctx, 100, 70, 38, { width: 3, color: '#5A0A08', fill: PB.RED, seed: 905 });
      L.text(ctx, '✓', 100, 72, { size: 40, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#FFD8C8' });
      ctx.restore();
      L.inkCircle(ctx, x, y, 14, { width: 4, color: '#000', fill: PB.Y, seed: 906 });
    }
    // what it cost him (true, lasting): small engraved notes under the line
    PB.label(ctx, 'LEFT EAR: DEAF', 1180, 1110, (T - 23.8) / 0.15, { size: 22, col: '#FF9A80' });
    PB.label(ctx, 'LEFT FACE: PARALYZED', 1180, 1168, (T - 23.95) / 0.15, { size: 22, col: '#FF9A80' });
    node(1600, 840, 24.45, 'BACK TO WORK', null, true);
    // the curl closes into the U-70 ring: magnets tick round it, protons circle, and he is inside
    const rg = L.clamp((T - 25.3) / 0.4);
    if (rg > 0) {
      const { cx, cy, R } = P.ring;
      for (let k = 0; k < 40; k++) { const a = (k / 40) * Math.PI * 2, p = L.clamp(rg * 1.4 - k / 60); if (p <= 0) continue; const q = [[cx + Math.cos(a - 0.05) * (R - 22), cy + Math.sin(a - 0.05) * (R - 22)], [cx + Math.cos(a + 0.05) * (R - 22), cy + Math.sin(a + 0.05) * (R - 22)], [cx + Math.cos(a + 0.05) * (R + 22), cy + Math.sin(a + 0.05) * (R + 22)], [cx + Math.cos(a - 0.05) * (R + 22), cy + Math.sin(a - 0.05) * (R + 22)]]; ctx.globalAlpha = p; D.engrave(ctx, q, { ink: k % 2 ? '#B8C6E8' : '#D8A08A', base: '#141C36', light: () => 0.45, angle: a, spacing: 4, seed: 950 + k, smooth: false, outW: 1.6, cross: false, stip: false }); ctx.globalAlpha = 1; }
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R - 40, 0, Math.PI * 2); ctx.clip(); ctx.globalAlpha = rg;
      FILM.pb.head(ctx, cx, cy + 40, 330, { yaw: -0.4 + 0.2 * (T - 25.3), key: [-0.4, 0.5, 0.75], res: 0.45, spacing: 5, slot: 15, swell: 0.35 });
      ctx.restore();
      const ca = (T * 5) % (Math.PI * 2);
      PB.burst(ctx, cx + Math.cos(ca) * R, cy + Math.sin(ca) * R, 120, rg);
    }
    ctx.restore();
  } });
})();
