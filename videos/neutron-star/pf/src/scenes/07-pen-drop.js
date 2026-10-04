// 07 · pen-drop · T 16.5–21.25 · on the star's surface: a pen held 1 m up. "here" (17.43) → it's gone — a flash and a
// crater in 0.000001 s. Then a SLOW-MO REPLAY: the pen falls again while the speed PiP climbs to 7,000,000 KM/H,
// hitting on "kilometers" (19.94).
(function () {
  'use strict';
  const MONO = '"JetBrains Mono", monospace', SERIF = '"Fraunces", Georgia, serif';
  const SURF = 1250, TIP0 = 760;
  function surface(ctx, L, T, hot) {
    const cx = 540, cy = SURF + 2600, R = 2600;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createLinearGradient(0, SURF, 0, 1920);
    g.addColorStop(0, '#E8F2FF'); g.addColorStop(0.05, '#86AEE6'); g.addColorStop(0.3, '#23417C'); g.addColorStop(1, '#0C1A3E');
    ctx.fillStyle = g; ctx.fillRect(0, SURF - 20, 1080, 1920);
    const pat = ctx.createPattern(FILM.sp.tex('ns'), 'repeat');
    ctx.globalAlpha = 0.35; ctx.globalCompositeOperation = 'multiply';
    ctx.save(); ctx.translate(0, SURF); ctx.scale(2.2, 0.6); ctx.fillStyle = pat; ctx.fillRect(0, 0, 600, 1200); ctx.restore();
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const rim = ctx.createLinearGradient(0, SURF - 120, 0, SURF + 40);
    rim.addColorStop(0, 'rgba(150,200,255,0)'); rim.addColorStop(0.75, 'rgba(170,215,255,0.5)'); rim.addColorStop(1, 'rgba(170,215,255,0)');
    ctx.fillStyle = rim; ctx.fillRect(0, SURF - 120, 1080, 160);
    ctx.restore();
  }
  function impact(ctx, L, d, big) {
    if (d < 0 || d > 1.4) return;
    const x = 540, y = SURF + 4;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const f = Math.max(0, 1 - d * 2.5);
    if (f > 0) { ctx.fillStyle = `rgba(255,248,230,${f * (big ? 1 : 0.85)})`; ctx.fillRect(0, 0, 1080, 1920); }
    const r = 60 + d * 900;
    ctx.strokeStyle = `rgba(255,220,150,${Math.max(0, 1 - d)})`; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.16, 0, 0, Math.PI * 2); ctx.stroke();
    const rr = L.rng(L.hash('debris', big ? 2 : 1));
    for (let i = 0; i < 40; i++) {
      const a = -Math.PI * (0.1 + rr() * 0.8), v = 300 + rr() * 900;
      const px = x + Math.cos(a) * v * d, py = y + Math.sin(a) * v * d + 900 * d * d;
      ctx.fillStyle = `rgba(255,${190 + rr() * 60},120,${Math.max(0, 1 - d)})`;
      ctx.fillRect(px, py, 6, 6);
    }
    ctx.restore();
    // the crater, a dark ellipse that stays
    ctx.fillStyle = 'rgba(10,20,50,0.75)'; ctx.beginPath(); ctx.ellipse(x, y + 6, 70, 14, 0, 0, Math.PI * 2); ctx.fill();
  }
  FILM.scene({ id: 'pen-drop', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, SP = FILM.sp, M = FILM.mk;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    let sh = 0;
    for (const h of [17.45, 19.94]) { const d = T - h; if (d >= 0 && d < 0.4) sh = Math.max(sh, (1 - d / 0.4) * 24); }
    ctx.save(); ctx.translate(sh * Math.sin(T * 93), sh * Math.cos(T * 71));
    SP.space(ctx, T, { zoom: 1.0, oy: -60 });
    surface(ctx, L, T);
    const replay = T >= 18.0;
    const tip = !replay ? (T < 17.43 ? TIP0 + 4 * Math.sin(T * 3) : null)
      : (T < 18.25 ? TIP0 : T < 19.94 ? L.lerp(TIP0, SURF, L.ease.inQuad((T - 18.25) / 1.69)) : null);
    if (tip != null) {
      SP.pen(ctx, 540, tip, 1.0, 0);
      if (replay && T > 18.4) { ctx.strokeStyle = 'rgba(242,232,208,0.45)'; ctx.lineWidth = 3; for (const dx of [-30, 30]) { ctx.beginPath(); ctx.moveTo(540 + dx, tip - 340); ctx.lineTo(540 + dx, tip - 340 - 260 * L.clamp((T - 18.4) / 1)); ctx.stroke(); } }
    }
    if (!replay && T < 17.43) {
      const b = L.clamp((T - 16.6) / 0.3);
      L.bracket(ctx, 720, TIP0, 720, SURF, { color: P.hcYellow, alpha: b, width: 3, p: b });
      L.text(ctx, '1 M', 760, (TIP0 + SURF) / 2 + 12, { size: 40, family: MONO, weight: 600, color: P.hcYellow, alpha: b });
    }
    if (!replay && T >= 17.43 && T < 17.47) { ctx.fillStyle = 'rgba(255,240,200,0.9)'; ctx.fillRect(530, TIP0, 20, SURF - TIP0); }
    impact(ctx, L, T - 17.45, false);
    if (replay) impact(ctx, L, T - 19.94, true);
    else if (T > 17.45) { ctx.fillStyle = 'rgba(10,20,50,0.75)'; ctx.beginPath(); ctx.ellipse(540, SURF + 10, 70, 14, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    // real-time tag
    const rt = L.clamp((T - 17.6) / 0.15) * (1 - L.clamp((T - 18.0) / 0.1));
    if (rt > 0) {
      L.text(ctx, 'THE FALL TOOK', 540, 360, { size: 34, family: MONO, weight: 600, align: 'center', color: P.hcIvory, alpha: rt, tracking: '0.2em' });
      L.text(ctx, '0.000001 SEC', 540, 450, { size: 76, family: SERIF, weight: 600, align: 'center', color: P.hcYellow, alpha: rt });
    }
    // slow-mo replay HUD + speed PiP
    if (replay) {
      const ra = L.clamp((T - 18.0) / 0.12);
      ctx.fillStyle = L.rgba(P.hcRed, ra * (0.6 + 0.4 * Math.sin(T * 10))); ctx.beginPath(); ctx.arc(110, 228, 14, 0, Math.PI * 2); ctx.fill();
      L.text(ctx, 'SLOW-MO REPLAY', 140, 240, { size: 30, family: MONO, weight: 600, color: P.hcIvory, alpha: ra, tracking: '0.18em' });
      const pp = L.clamp((T - 18.6) / 0.3);
      M.pip(ctx, { kind: 'rect', x: 140, y: 300, w: 800, h: 260, p: pp, label: 'IMPACT SPEED', plate: 'navy', target: [560, tip != null ? tip - 150 : SURF] }, (g) => {
        g.fillStyle = '#081026'; g.fillRect(140, 300, 800, 260);
        const u = L.clamp((T - 18.25) / 1.69);
        const v = Math.round(7e6 * u / 1000) * 1000;
        L.text(g, v.toLocaleString('en-US'), 540, 425, { size: 104, family: SERIF, weight: 600, align: 'center', baseline: 'middle', color: u >= 1 ? P.hcYellow : P.hcIvory });
        L.text(g, 'KM / H', 540, 520, { size: 30, family: MONO, weight: 600, align: 'center', color: P.hcYellow, tracking: '0.3em' });
      });
    }
  } });
})();
