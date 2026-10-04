// 10 · ring · T 25.5–29.75 · gold dust streams out of the kilonova (top-left) and condenses into a 3D gold ring
// on "gold" (25.83); it turns, glinting. "forged" (27.99) → sparks. "crash like this" (28.9) → PiP of the real one:
// GW170817, Aug 2017, a kilonova beside galaxy NGC 4993.
(function () {
  'use strict';
  const C = [540, 900], SRC = [170, 260];
  FILM.scene({ id: 'ring', draw(ctx, tIn, info) {
    const L = info.lib, P = L.pal, SP = FILM.sp, M = FILM.mk;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    SP.space(ctx, T, { zoom: 1.08, ox: -20 * t });
    // the kilonova remnant
    SP.star(ctx, 'ns', SRC[0], SRC[1], 14, T * 3, { glow: 2.5, glowR: 7, heat: 0.4, glowColor: '#FFC86A', slot: 2 });
    // dust stream (bezier from the source to the ring)
    const r = L.rng(L.hash('stream'));
    const pts = [];
    for (let i = 0; i < 140; i++) {
      const life = 1.2, t0 = 25.4 + r() * 2.2, u = (T - t0) / life;
      if (u < 0 || u > 1) continue;
      const q = L.ease.inOutCubic(u), off = (r() - 0.5) * 140;
      const c1 = [700 + off, 260], c2 = [140, 900 + off];
      const x = (1 - q) ** 3 * SRC[0] + 3 * (1 - q) ** 2 * q * c1[0] + 3 * (1 - q) * q * q * c2[0] + q ** 3 * C[0];
      const y = (1 - q) ** 3 * SRC[1] + 3 * (1 - q) ** 2 * q * c1[1] + 3 * (1 - q) * q * q * c2[1] + q ** 3 * C[1];
      pts.push([x, y, 2.5 + r() * 3]);
    }
    SP.sparks(ctx, pts, 0.9);
    const form = L.ease.outBack(L.clamp((T - 25.75) / 0.5));
    const S = 640 * form;
    if (S > 20) {
      const glow = ctx.createRadialGradient(C[0], C[1], 50, C[0], C[1], 520);
      glow.addColorStop(0, 'rgba(242,194,48,0.28)'); glow.addColorStop(1, 'rgba(242,194,48,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 1920);
      const heat = Math.max(0, 1 - (T - 25.75) / 0.6) * 0.8 + Math.max(0, 1 - Math.abs(T - 28.05) / 0.25) * 0.5;
      SP.ring(ctx, C[0], C[1], S, 1.05 + 0.15 * Math.sin(T * 0.7), T * 0.9, { heat });
    }
    // glints that travel around the band
    const gl = [];
    for (let k = 0; k < 3; k++) { const a = T * 1.6 + k * 2.1; gl.push([C[0] + Math.cos(a) * 210, C[1] + Math.sin(a) * 80, 4 + 3 * Math.max(0, Math.sin(T * 5 + k))]); }
    if (form > 0.9) SP.sparks(ctx, gl, 0.9);
    // forging sparks
    const fs = T - 27.95;
    if (fs > 0 && fs < 0.9) {
      const rr = L.rng(L.hash('forge'));
      const sp = [];
      for (let i = 0; i < 50; i++) { const a = rr() * Math.PI * 2, v = 150 + rr() * 500; sp.push([C[0] + Math.cos(a) * v * fs, C[1] + Math.sin(a) * v * fs * 0.7 + 400 * fs * fs, 3 + rr() * 3]); }
      SP.sparks(ctx, sp, 1 - fs / 0.9);
    }
    M.label(ctx, 'YOUR GOLD', 540, 1340, { size: 40, align: 'center', alpha: L.clamp((T - 26.0) / 0.25) * (1 - L.clamp((T - 28.6) / 0.2)) });
    // PiP: the real crash
    const pp = L.clamp((T - 28.75) / 0.3);
    M.pip(ctx, { kind: 'rect', x: 520, y: 220, w: 460, h: 330, p: pp, label: 'GW170817 · AUG 2017', plate: 'navy', target: [C[0] + 120, C[1] - 120] }, (g) => {
      g.fillStyle = '#030611'; g.fillRect(520, 220, 460, 330);
      const gx = 720, gy = 390;
      const gal = g.createRadialGradient(gx, gy, 0, gx, gy, 150);
      gal.addColorStop(0, 'rgba(255,240,215,0.95)'); gal.addColorStop(0.2, 'rgba(240,200,150,0.6)'); gal.addColorStop(1, 'rgba(200,150,110,0)');
      g.save(); g.translate(gx, gy); g.scale(1, 0.7); g.translate(-gx, -gy); g.fillStyle = gal; g.fillRect(520, 220, 460, 330); g.restore();
      const bl = 0.7 + 0.3 * Math.sin(T * 12);
      L.glowDot(g, 805, 350, 6, { color: '#FFD9A0', core: '#FFFFFF', rays: 6, rayLen: 10, glow: 14, intensity: bl, additive: true });
      g.strokeStyle = P.hcYellow; g.lineWidth = 3; g.beginPath(); g.arc(805, 350, 26, 0, Math.PI * 2); g.stroke();
      L.text(g, 'KILONOVA', 850, 300, { size: 22, family: '"JetBrains Mono", monospace', weight: 600, color: P.hcYellow, tracking: '0.15em' });
      L.text(g, 'NGC 4993', 545, 525, { size: 20, family: '"JetBrains Mono", monospace', weight: 600, color: '#C9D1E6', tracking: '0.15em' });
    });
  } });
})();
