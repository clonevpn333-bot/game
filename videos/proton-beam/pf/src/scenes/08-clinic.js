// 08 · clinic · T 23.0–27.0
//   A 23.0–24.5 his face, front-on, split by the vertical beam line (from the dose bar). HALF is cut by the line; the subject's
//               left half swells and reddens (23.6–24.2): SWELLED UP
//   B 24.5–27.0 the line tips over into a heart-monitor trace; he lies in a clinic bed below, engraved. Beats on the beat
//               (24.5…26.0), then the trace runs flat: SENT TO A CLINIC / TO DIE.
(function () {
  'use strict';
  const BEATS = [24.5, 25.0, 25.5, 26.0];
  const MON = { x: 90, y: 520, w: 900, h: 470 };
  const ecg = (tau) => {
    let v = 0;
    for (const tb of BEATS) {
      const d = tau - tb;
      if (d < -0.12 || d > 0.4) continue;
      v += 18 * Math.exp(-(((d + 0.08) / 0.03) ** 2)) - 26 * Math.exp(-(((d - 0.0) / 0.008) ** 2)) + 190 * Math.exp(-(((d - 0.02) / 0.012) ** 2)) - 60 * Math.exp(-(((d - 0.045) / 0.012) ** 2)) + 32 * Math.exp(-(((d - 0.2) / 0.05) ** 2));
    }
    return v;
  };
  FILM.pbEcg = { ecg, MON };
  FILM.scene({ id: 'clinic', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 81 });
    if (T < 24.5) {
      const sw = L.ease.inOutSine(L.clamp((T - 23.55) / 0.7));
      const push = 1 + 0.05 * (T - 23.0);
      ctx.save(); ctx.translate(540, 1050); ctx.scale(push, push); ctx.translate(-540, -1050);
      const o = { yaw: 0, key: [-0.35, 0.45, 0.82], res: 0.36, slot: 12, swell: sw };
      FILM.pb.head(ctx, 540, 1060, 900, o);
      // the swollen half, re-lit hot and red
      if (sw > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(540, 0, 600, 1920); ctx.clip(); ctx.beginPath(); ctx.ellipse(560, 1090, 230, 260, 0, 0, Math.PI * 2); ctx.clip(); ctx.globalAlpha = 0.75 * sw;
        FILM.pb.head(ctx, 540, 1060, 900, Object.assign({}, o, { slot: 13, warm: [1.1, 0.72, 0.64] }));
        ctx.restore();
      }
      ctx.restore();
      PB.beam(ctx, [540, -200], [540, 2200], { T, w: 5, speed: 2600 });
      if (sw > 0.3) { L.inkPath(ctx, [[700, 1000], [900, 1480]], { width: 2.5, color: '#FF7A5A', alpha: L.clamp((sw - 0.3) * 3), seed: 810 }); PB.label(ctx, 'LEFT SIDE', 760, 1510, (sw - 0.35) * 3, { col: '#FF7A5A', size: 28 }); }
      const hp = L.clamp((T - 23.02) / 0.1);
      if (hp > 0) PB.slice(ctx, 'HALF HIS FACE', 540, 230, 104, Math.PI / 2, 6 + 22 * L.ease.outBack(L.clamp((T - 23.1) / 0.25)), { alpha: hp });
      PB.word(ctx, 'SWELLED UP', 540, 360, 112, (T - 23.75) / 0.12, { color: PB.Y });
      return;
    }
    // B: clinic
    const lit = D.lights([{ x: 540, y: 700, r: 1100, k: 0.35 }, { x: 540, y: 1500, r: 700, k: 0.25 }], 0.05);
    // the patient: his head on the pillow, lying on his back (profile, swollen side to us)
    const bedY = 1560;
    D.engrave(ctx, L.ellipsePts(330, bedY + 40, 250, 70, 40), { ink: '#E8E0D0', base: '#2A2A32', light: (x, y) => lit(x, y) + 0.1, angle: 0.3, spacing: 4.5, seed: 820, outW: 2.5 });
    const sheet = [[380, bedY - 40], [560, bedY - 110], [760, bedY - 140], [1000, bedY - 130], [1120, bedY - 120], [1120, 1920], [420, 1920], [360, bedY + 60]];
    D.engrave(ctx, sheet, { ink: '#C8D2E8', base: '#1A2032', light: lit, angle: -0.4, spacing: 5, seed: 821, outW: 3 });
    D.lines(ctx, [[[600, bedY - 90], [700, bedY + 40], [740, 1900]], [[860, bedY - 120], [900, bedY + 20]], [[460, bedY + 10], [600, bedY + 120]]], lit, { w: 2, seed: 822 });
    ctx.save(); ctx.translate(300, bedY - 70); ctx.rotate(-Math.PI / 2); ctx.translate(-300, -(bedY - 70));
    FILM.pb.head(ctx, 300, bedY - 70, 420, { yaw: 1.3, key: [-0.2, 0.7, 0.7], res: 0.4, slot: 14, swell: 1, scar: 1, win: [-1.2, 1.3, -1.35, 1.25] });
    ctx.restore();
    // monitor
    D.engrave(ctx, L.rrectPts(MON.x - 24, MON.y - 24, MON.w + 48, MON.h + 48, 22), { ink: '#8A9AB8', base: '#141A28', light: () => 0.35, angle: 0.4, spacing: 4.5, seed: 830, smooth: false, outW: 4, cross: false, stip: false });
    ctx.fillStyle = '#031208'; ctx.fillRect(MON.x, MON.y, MON.w, MON.h);
    ctx.save(); ctx.beginPath(); ctx.rect(MON.x, MON.y, MON.w, MON.h); ctx.clip();
    PB.grid(ctx, 0.12, 45, MON.x, MON.y);
    // the line tips from vertical to horizontal, then writes the trace
    const tip = L.ease.inOutCubic(L.clamp((T - 24.5) / 0.22));
    const base = MON.y + MON.h * 0.62, right = MON.x + MON.w - 20, sp = 700;
    if (tip < 1) {
      const a = L.lerp(Math.PI / 2, 0, tip), c = [540, base], l = 1400;
      PB.beam(ctx, [c[0] - Math.cos(a) * l, c[1] - Math.sin(a) * l], [c[0] + Math.cos(a) * l, c[1] + Math.sin(a) * l], { T, w: 5, dots: false });
    } else {
      const pts = [];
      for (let x = MON.x; x <= right; x += 3) { const tau = T - (right - x) / sp; pts.push([x, base - ecg(tau)]); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
      [[16, 0.12], [7, 0.3], [3, 1]].forEach(([w, al], i) => { ctx.strokeStyle = i === 2 ? `rgba(255,248,214,${al})` : `rgba(242,194,48,${al})`; ctx.lineWidth = w; ctx.beginPath(); pts.forEach((p, j) => (j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); });
      ctx.restore();
      PB.burst(ctx, right, pts[pts.length - 1][1], 60, 0.8);
    }
    ctx.restore();
    // readout: heart rate, then dashes as it runs flat
    const flat = T > 26.35;
    L.text(ctx, flat ? '– –' : '♥ ' + (88 + Math.round(6 * Math.sin(T * 3))), MON.x + MON.w - 30, MON.y + 50, { size: 40, family: PB.MONO, weight: 600, align: 'right', baseline: 'middle', color: flat ? '#FF5A40' : PB.Y });
    L.text(ctx, 'MOSCOW CLINIC · 1978', MON.x + 30, MON.y + 50, { size: 24, family: PB.MONO, weight: 600, align: 'left', baseline: 'middle', color: '#7FB89A', tracking: '0.2em' });
    PB.word(ctx, 'SENT TO A CLINIC', 540, 220, 96, (T - 24.8) / 0.12);
    PB.word(ctx, 'TO DIE.', 540, 360, 140, (T - 26.18) / 0.14, { color: '#FF5A40' });
  } });
})();
