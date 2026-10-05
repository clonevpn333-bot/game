// 04 · exhume · T 9.0–11.25 · a graveyard at night. A gravedigger hacks at FORMOSVS's grave ("dug" 9.73), dirt flying;
// "corpse" (10.38) → lightning, the coffin lid bursts up and the skull stares out.
(function () {
  'use strict';
  FILM.scene({ id: 'exhume', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const fl = D.flash(T, [10.36]);
    let sh = 0; { const d = T - 10.38; if (d >= 0 && d < 0.35) sh = (1 - d / 0.35) * 22; }
    ctx.save(); ctx.translate(sh * Math.sin(T * 91), sh * Math.cos(T * 79));
    D.bg(ctx, { top: '#1A0F1C', bottom: '#060407' });
    D.glow(ctx, 820, 380, 500, '#C8322A', 0.5);
    ctx.fillStyle = '#E8A080'; ctx.beginPath(); ctx.arc(820, 380, 90, 0, Math.PI * 2); ctx.fill();
    if (fl > 0) { ctx.fillStyle = `rgba(210,215,255,${0.7 * fl})`; ctx.fillRect(0, 0, 1080, 1100); }
    // rows of crosses/headstones receding (3D depth)
    const r = L.rng(L.hash('graves'));
    for (let row = 6; row >= 1; row--) {
      const k = 1 / (1 + row * 0.55), y = 1050 + 520 * k, n = 6 + row;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5 + (r() - 0.5) * 0.4) / n * 1080, s = 120 * k * (0.8 + r() * 0.4);
        ctx.fillStyle = `rgb(${Math.round(30 * k + 10)},${Math.round(24 * k + 8)},${Math.round(34 * k + 12)})`;
        if (r() < 0.5) { ctx.fillRect(x - s * 0.08, y - s * 1.4, s * 0.16, s * 1.4); ctx.fillRect(x - s * 0.4, y - s * 1.05, s * 0.8, s * 0.16); }
        else { ctx.beginPath(); ctx.moveTo(x - s * 0.35, y); ctx.lineTo(x - s * 0.35, y - s * 0.8); ctx.arc(x, y - s * 0.8, s * 0.35, Math.PI, 0); ctx.lineTo(x + s * 0.35, y); ctx.fill(); }
      }
    }
    D.fog(ctx, T, { y: 1280, h: 420, a: 0.4, speed: 25 });
    // ground + the open grave
    ctx.fillStyle = '#0E0A0C'; ctx.fillRect(0, 1450, 1080, 470);
    ctx.fillStyle = '#030203'; ctx.beginPath(); ctx.moveTo(300, 1520); ctx.lineTo(780, 1520); ctx.lineTo(860, 1760); ctx.lineTo(220, 1760); ctx.closePath(); ctx.fill();
    // headstone
    ctx.save(); ctx.translate(540, 1500);
    ctx.beginPath(); ctx.moveTo(-170, 0); ctx.lineTo(-170, -330); ctx.arc(0, -330, 170, Math.PI, 0); ctx.lineTo(170, 0); ctx.closePath();
    const g = ctx.createLinearGradient(-170, 0, 170, 0); g.addColorStop(0, '#2C2830'); g.addColorStop(0.6, '#5A5260'); g.addColorStop(1, '#1C1A20'); ctx.fillStyle = g; ctx.fill();
    L.hatch(ctx, [[-170, 0], [-170, -500], [170, -500], [170, 0]], { angle: 0.7, spacing: 7, width: 1.2, color: '#000', alpha: 0.4, seed: 21 });
    ctx.strokeStyle = '#0A080C'; ctx.lineWidth = 6; ctx.stroke();
    L.text(ctx, 'FORMOSVS', 0, -330, { size: 54, family: '"Cinzel", serif', weight: 700, align: 'center', baseline: 'middle', color: '#B8B0A4', tracking: '0.1em' });
    L.text(ctx, '† DCCCXCVI', 0, -255, { size: 32, family: '"Cinzel", serif', weight: 700, align: 'center', baseline: 'middle', color: '#8A8278' });
    ctx.restore();
    // the coffin: lid bursts up on "corpse"
    const burst = L.clamp((T - 10.38) / 0.3);
    ctx.save(); ctx.translate(540, 1690);
    ctx.fillStyle = '#2A170C'; ctx.beginPath(); ctx.moveTo(-210, -50); ctx.lineTo(210, -50); ctx.lineTo(180, 60); ctx.lineTo(-180, 60); ctx.closePath(); ctx.fill();
    if (burst > 0) {
      ctx.fillStyle = '#050304'; ctx.beginPath(); ctx.moveTo(-190, -46); ctx.lineTo(190, -46); ctx.lineTo(165, 40); ctx.lineTo(-165, 40); ctx.closePath(); ctx.fill();
      D.skull(ctx, 0, -10, 0.42, { ember: 0.6 * burst, jaw: 0.5 });
      const ang = L.ease.outBack(burst) * 1.25;
      ctx.save(); ctx.translate(0, -50); ctx.scale(1, Math.cos(ang)); ctx.translate(0, -110 * Math.sin(ang) / Math.max(0.2, Math.cos(ang)) * 0.4);
      ctx.fillStyle = '#3E2414'; ctx.fillRect(-220, -60, 440, 60); ctx.strokeStyle = '#140A06'; ctx.lineWidth = 6; ctx.strokeRect(-220, -60, 440, 60);
      ctx.fillStyle = '#8A6A30'; ctx.fillRect(-10, -60, 20, 60); ctx.fillRect(-60, -38, 120, 14);
      ctx.restore();
      const d = T - 10.38, rr = L.rng(L.hash('dust'));
      for (let i = 0; i < 40; i++) { const a = -Math.PI * (0.1 + rr() * 0.8), v = 200 + rr() * 500; ctx.fillStyle = `rgba(150,130,110,${Math.max(0, 0.6 - d)})`; ctx.beginPath(); ctx.arc(Math.cos(a) * v * d, -50 + Math.sin(a) * v * d + 300 * d * d, 6 + rr() * 10 + d * 20, 0, Math.PI * 2); ctx.fill(); }
    } else {
      ctx.fillStyle = '#3E2414'; ctx.fillRect(-220, -110, 440, 60); ctx.strokeStyle = '#140A06'; ctx.lineWidth = 6; ctx.strokeRect(-220, -110, 440, 60);
    }
    ctx.restore();
    // dirt mound + gravedigger
    ctx.fillStyle = '#1C140E'; ctx.beginPath(); ctx.ellipse(170, 1560, 220, 90, 0, Math.PI, 0); ctx.fill();
    const ph = (T - 9.0) * 7.5;
    const tips = D.figure(ctx, 960, 1660, 0.95, T, { pose: 'dig', ph, hat: 'hood', rim: C.candle, rimA: 1.5, flip: true, fill: '#120C10' });
    if (tips.shovel) {
      const [hx, hy] = tips.shovel; const bx = hx - 60 - 50 * Math.sin(ph), by = hy + 230;
      ctx.strokeStyle = '#2A1A10'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(hx + 60, hy - 120); ctx.lineTo(bx, by); ctx.stroke();
      ctx.fillStyle = '#6A6A70'; ctx.beginPath(); ctx.ellipse(bx, by + 20, 30, 42, 0.3, 0, Math.PI * 2); ctx.fill();
    }
    // dirt clods every stroke
    for (let k = 0; k < 4; k++) {
      const t0 = 9.15 + k * (Math.PI * 2 / 7.5), d = T - t0;
      if (d < 0 || d > 0.8) continue;
      const rr = L.rng(L.hash('clod', k));
      for (let i = 0; i < 12; i++) { const vx = 300 + rr() * 500, vy = -700 - rr() * 400; ctx.fillStyle = '#2A1E14'; ctx.beginPath(); ctx.arc(760 - vx * d, 1600 + vy * d + 1500 * d * d, 6 + rr() * 8, 0, Math.PI * 2); ctx.fill(); }
    }
    D.candle(ctx, 120, 1470, 0.8, T, { seed: 9, h: 90 });
    ctx.restore();
    D.rain(ctx, T, { n: 150, a: 0.25 });
    D.grain(ctx, T, 1);
  } });
})();
