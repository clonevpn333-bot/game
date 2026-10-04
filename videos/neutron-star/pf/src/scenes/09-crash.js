// 09 · crash · T 23.0–25.5 · two neutron stars spiral in (chirp), ripples of space spreading as blueprint rings; they
// "crash" (24.07) in a white flash; gold blasts outward and the 79 Au tile stamps on "gold" (24.99).
(function () {
  'use strict';
  const TC = 24.07, C = [540, 820];
  const orbit = (T) => { const tau = Math.max(0.0001, TC - T); const r = 330 * Math.pow(tau / 1.07, 0.25); const ph = -2.2 * Math.pow(tau, 0.625) * 9; return [r, ph]; };
  FILM.scene({ id: 'crash', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, SP = FILM.sp;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    let sh = 0; const dd = T - TC; if (dd >= 0 && dd < 0.6) sh = (1 - dd / 0.6) * 30; else if (T > 23.6 && T < TC) sh = (T - 23.6) * 8;
    ctx.save(); ctx.translate(sh * Math.sin(T * 97), sh * Math.cos(T * 83));
    SP.space(ctx, T, { zoom: 1.05 + 0.05 * L.clamp((T - 23) / 1.07) });
    // gravitational-wave ripples
    const k0 = T < TC ? T : TC;
    for (let i = 0; i < 9; i++) {
      const age = ((k0 * (2 + 4 * L.clamp((T - 23) / 1.07))) + i / 9) % 1;
      const r = 120 + age * 900;
      ctx.strokeStyle = `rgba(242,232,208,${0.22 * (1 - age) * (T < TC + 0.8 ? 1 : 0)})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.ellipse(C[0], C[1], r, r * 0.92, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (T < TC) {
      // trails
      for (const s of [0, Math.PI]) {
        const pts = [];
        for (let k = 0; k < 40; k++) { const [r, ph] = orbit(T - k * 0.012); pts.push([C[0] + Math.cos(ph + s) * r, C[1] + Math.sin(ph + s) * r * 0.55]); }
        FILM.hc.line(ctx, pts, { plate: 'blueprint', width: 4, seed: 91 + (s ? 1 : 0), head: false, alpha: 0.7, wobble: 0.3 });
      }
      const [r, ph] = orbit(T);
      const stars = [0, Math.PI].map((s) => [C[0] + Math.cos(ph + s) * r, C[1] + Math.sin(ph + s) * r * 0.55, Math.sin(ph + s)]);
      stars.sort((a, b) => a[2] - b[2]).forEach(([x, y, dz], i) => SP.star(ctx, 'ns', x, y, 95 * (1 + 0.12 * dz), T * 4 + i, { glow: 1.3, glowR: 2.4, slot: 2 + i }));
    } else {
      const d = T - TC;
      SP.burst(ctx, C[0], C[1], d / 0.9, { R: 1100, seed: 9 });
      // gold ejecta
      const r = L.rng(L.hash('ejecta'));
      const pts = [];
      for (let i = 0; i < 160; i++) { const a = r() * Math.PI * 2, v = 200 + r() * 900, dd = Math.min(d, 1.3); pts.push([C[0] + Math.cos(a) * v * L.ease.outCubic(dd / 1.3) * 1.2, C[1] + Math.sin(a) * v * L.ease.outCubic(dd / 1.3), 3 + r() * 5]); }
      SP.sparks(ctx, pts, Math.min(1, d * 4));
      SP.star(ctx, 'ns', C[0], C[1], 60, T * 5, { glow: 2.5, glowR: 4, heat: 0.5, glowColor: '#FFD27A' });
    }
    ctx.restore();
    // the gold tile
    const g = L.ease.outBack(L.clamp((T - 24.95) / 0.22));
    if (g > 0) {
      ctx.save(); ctx.translate(540, 1240); ctx.scale(g, g); ctx.rotate(-0.04);
      const gr = ctx.createLinearGradient(-130, -130, 130, 130); gr.addColorStop(0, '#FFE58A'); gr.addColorStop(0.5, '#E2A92A'); gr.addColorStop(1, '#9A6A10');
      ctx.fillStyle = gr; ctx.fillRect(-130, -130, 260, 260);
      ctx.strokeStyle = '#05080F'; ctx.lineWidth = 8; ctx.strokeRect(-130, -130, 260, 260);
      L.text(ctx, '79', -105, -78, { size: 40, family: '"JetBrains Mono", monospace', weight: 600, color: '#2A1A04' });
      L.text(ctx, 'Au', 0, 10, { size: 130, family: '"Fraunces", Georgia, serif', weight: 600, align: 'center', baseline: 'middle', color: '#2A1A04' });
      L.text(ctx, 'GOLD', 0, 105, { size: 32, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: '#2A1A04', tracking: '0.3em' });
      ctx.restore();
    }
  } });
})();
