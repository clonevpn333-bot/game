// 06 · pellet · T 18.25–22.50 · hybrid: 3D lit platinum sphere + 2D blueprint overlays + PiP cross-section
// The pellet from the chamber, now huge, turning. Blueprint dimensions lock on (1.70 MM, Pt 90 / Ir 10).
// "drilled with two holes" → PiP cross-section: two 0.35 mm bores drilled to an X. "sealed to melt at body heat" →
// waxy plugs sit in the openings on the 3D sphere; a thermometer climbs to 37 °C on "body" and the plugs melt.
(function () {
  'use strict';
  const ID = 'pellet';
  const C = [560, 760], R = 300;
  const TILT = 0.25;
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, M = FILM.mk;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      L.blueprint(ctx, { color: P.hcNavyDeep, seed: 61, center: C, circles: 4 });
      const lon0 = 0.6 + T * 0.55;
      const grow = L.ease.outCubic(L.clamp((T - 18.25) / 0.4));
      const Rn = L.lerp(180, R, grow);
      // guide geometry
      L.guideCircle(ctx, C[0], C[1], Rn + 50, { alpha: 0.3, width: 1.5, cross: 22, quadrants: 14 });
      L.guideCircle(ctx, C[0], C[1], Rn + 110, { alpha: 0.14, width: 1, dash: [6, 8] });
      // the 3D pellet
      const glow = ctx.createRadialGradient(C[0], C[1], Rn * 0.9, C[0], C[1], Rn * 1.8);
      glow.addColorStop(0, L.rgba(P.hcYellow, 0.18));
      glow.addColorStop(1, L.rgba(P.hcYellow, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1080, 1920);
      M.sphere(ctx, M.pelletTex(), 'pellet', C[0], C[1], Rn, lon0, { spec: 1.0, ambient: 0.28, tilt: TILT });
      ctx.strokeStyle = L.rgba(P.lineWhite, 0.8);
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(C[0], C[1], Rn, 0, Math.PI * 2); ctx.stroke();
      // the visible openings, projected: plugs (coating) that melt on "body heat"
      const melt = L.clamp((T - 21.66) / 0.65);
      const plugA = L.clamp((T - 20.9) / 0.3);
      for (let k = 0; k < 4; k++) {
        const phi = Math.PI / 4 + (k * Math.PI) / 2 - lon0;
        const nx = Math.sin(phi), nz0 = Math.cos(phi);
        const ny = nz0 * Math.sin(TILT), nz = nz0 * Math.cos(TILT);
        if (nz < 0.15) continue;
        const x = C[0] + nx * Rn, y = C[1] + ny * Rn;
        const rr = 0.12 * Rn;
        if (plugA > 0 && melt < 1) {
          ctx.save();
          ctx.fillStyle = L.rgba(P.fat, 0.95 * plugA * (1 - melt));
          ctx.beginPath(); ctx.ellipse(x, y, rr * (0.4 + 0.6 * Math.abs(nz)) * (1 + 0.3 * melt), rr * (1 + 0.6 * melt), Math.atan2(ny, nx), 0, Math.PI * 2); ctx.fill();
          if (melt > 0) {
            ctx.fillStyle = L.rgba(P.fat, 0.9 * (1 - melt * 0.6));
            ctx.beginPath(); ctx.ellipse(x, y + rr + 80 * melt, rr * 0.35, rr * 0.6 * melt + 2, 0, 0, Math.PI * 2); ctx.fill();
          }
          ctx.restore();
          L.inkCircle(ctx, x, y, rr * 1.1, { width: 2, color: P.hcInk, alpha: plugA * (1 - melt), seed: 70 + k });
        }
        if (melt > 0.6) {
          // the opening is free: a red bloom leaks out (ricin, next shot)
          const g = ctx.createRadialGradient(x, y, 0, x, y, rr * 3 * melt);
          g.addColorStop(0, L.rgba(P.hcRed, 0.6));
          g.addColorStop(1, L.rgba(P.hcRed, 0));
          ctx.fillStyle = g;
          ctx.fillRect(x - rr * 3, y - rr * 3, rr * 6, rr * 6);
        }
      }
      // dimensions + composition
      const da = L.ease.outExpo(L.clamp((T - 18.9) / 0.4));
      if (da > 0) {
        L.bracket(ctx, C[0] - Rn, C[1] + Rn + 70, C[0] + Rn, C[1] + Rn + 70, { color: P.lineWhite, alpha: 0.85, width: 2, p: da });
        M.label(ctx, '1.70 MM', C[0], C[1] + Rn + 130, { size: 40, align: 'center', alpha: da, p: da });
      }
      const ma = L.clamp((T - 19.0) / 0.3);
      if (ma > 0) M.label(ctx, 'PLATINUM 90 · IRIDIUM 10', 80, 470, { size: 22, alpha: ma, color: '#C9D1E6', p: ma });
      // thermometer (left)
      const ta = L.clamp((T - 20.8) / 0.3);
      if (ta > 0) {
        ctx.save();
        ctx.globalAlpha = ta;
        const tx = 110, ty0 = 600, ty1 = 1080;
        L.inkPath(ctx, L.capsulePts(tx, (ty0 + ty1) / 2, ty1 - ty0, 18, Math.PI / 2, 40), { closed: true, width: 2.5, color: P.lineWhite, seed: 80 });
        L.inkCircle(ctx, tx, ty1 + 30, 34, { width: 2.5, color: P.lineWhite, seed: 81, fill: P.hcRed });
        const lvl = L.ease.inOutCubic(L.clamp((T - 20.9) / 0.76));
        const y37 = L.lerp(ty1, ty0 + 90, 0.62);
        const top = L.lerp(ty1, y37, lvl);
        ctx.fillStyle = P.hcRed;
        ctx.fillRect(tx - 7, top, 14, ty1 + 10 - top);
        for (let k = 0; k <= 12; k++) { const y = ty1 - (k / 12) * (ty1 - ty0 - 40); ctx.strokeStyle = L.rgba(P.lineWhite, 0.7); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(tx + 22, y); ctx.lineTo(tx + (k % 4 ? 32 : 42), y); ctx.stroke(); }
        ctx.strokeStyle = P.hcYellow; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(tx - 30, y37); ctx.lineTo(tx + 60, y37); ctx.stroke();
        M.label(ctx, '37 °C', tx + 70, y37 + 10, { size: 28, alpha: L.clamp((T - 21.5) / 0.2), color: P.hcYellow, underline: false });
        ctx.restore();
      }
      // PiP: cross-section, the two bores drilled into an X
      const pp = L.clamp((T - 19.45) / 0.3);
      M.pip(ctx, { kind: 'rect', x: 560, y: 1100, w: 440, h: 360, p: pp, label: 'CROSS-SECTION', target: [C[0] + Rn * 0.5, C[1] + Rn * 0.5], plate: 'navy' }, (g) => {
        g.translate(0, -40);
        g.fillStyle = '#0B142A';
        g.fillRect(560, 1140, 440, 360);
        const cx = 780, cy = 1320, r = 130;
        g.fillStyle = '#AEB4BE';
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
        L.hatch(g, L.ellipsePts(cx, cy, r, r, 48), { angle: -0.8, spacing: 5, width: 1, color: '#5A606C', alpha: 0.8, seed: 90 });
        const bw = (0.35 / 1.7) * 2 * r;
        const d1 = L.ease.inOutCubic(L.clamp((T - 19.6) / 0.35)), d2 = L.ease.inOutCubic(L.clamp((T - 19.95) / 0.35));
        g.fillStyle = '#0B0D12';
        g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4);
        g.fillRect(-r, -bw / 2, 2 * r * d1, bw);
        g.fillRect(-bw / 2, -r, bw, 2 * r * d2);
        g.restore();
        g.strokeStyle = P.lineWhite; g.lineWidth = 2.5;
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke();
        if (d2 > 0.9) {
          L.bracket(g, cx + r * 0.72 - bw * 0.36, cy - r * 0.72 - bw * 0.36, cx + r * 0.72 + bw * 0.36, cy - r * 0.72 + bw * 0.36, { color: P.hcYellow, alpha: 1, width: 2, offset: -26 });
          L.text(g, '0.35 MM', 600, 1180, { size: 22, family: '"JetBrains Mono", monospace', weight: 600, color: P.hcYellow, tracking: '0.12em' });
        }
      });
    },
  });
})();
