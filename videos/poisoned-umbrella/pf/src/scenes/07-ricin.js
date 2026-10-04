// 07 · ricin · T 22.50–27.75 · hybrid: a microscope field (shaded 3D-ish cells) on an ivory engraving
// The pellet's opening on the left of the field leaks ricin (two-part A/B glyphs) toward the cells.
// "castor-bean" → PiP: the castor bean, inked. 25.2–27.4 the field resolves into one cell: B docks on the
// membrane, A slips inside and stops a ribosome mid-protein ("stops cells making proteins").
(function () {
  'use strict';
  const ID = 'ricin';
  const F = [540, 800, 440]; // microscope field
  function ricinGlyph(ctx, L, P, x, y, s, rot) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    ctx.fillStyle = P.hcOrange;
    ctx.beginPath(); ctx.ellipse(-12, 0, 14, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = P.hcYellow;
    ctx.beginPath(); ctx.ellipse(13, 2, 12, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = P.hcInk; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.ellipse(-12, 0, 14, 11, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(13, 2, 12, 13, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  function cell(ctx, L, P, x, y, r, seed) {
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, '#FBE6E0');
    g.addColorStop(0.7, '#E7A99E');
    g.addColorStop(1, '#B85F57');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    L.inkCircle(ctx, x, y, r, { width: 2.5, color: '#5A1E1A', seed });
    L.inkCircle(ctx, x + r * 0.15, y + r * 0.1, r * 0.32, { width: 2, color: '#5A1E1A', seed: seed + 1, fill: L.rgba(P.hcViolet, 0.45) });
  }
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, M = FILM.mk, HC = FILM.hc;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      L.paper(ctx, { color: P.hcIvory, seed: 71, vignette: 0.45 });
      // microscope reticle around the field
      ctx.strokeStyle = P.hcInk;
      for (let i = 0; i < 120; i++) {
        const a = (i / 120) * Math.PI * 2, l = i % 10 === 0 ? 30 : 14;
        ctx.lineWidth = i % 10 === 0 ? 2 : 1;
        ctx.beginPath(); ctx.moveTo(F[0] + Math.cos(a) * (F[2] + 16), F[1] + Math.sin(a) * (F[2] + 16)); ctx.lineTo(F[0] + Math.cos(a) * (F[2] + 16 + l), F[1] + Math.sin(a) * (F[2] + 16 + l)); ctx.stroke();
      }
      const zoom = L.ease.inOutCubic(L.clamp((T - 25.0) / 0.5)); // field resolves into a single cell
      ctx.save();
      ctx.beginPath(); ctx.arc(F[0], F[1], F[2], 0, Math.PI * 2); ctx.clip();
      const bg = ctx.createRadialGradient(F[0], F[1] - 100, 50, F[0], F[1], F[2]);
      bg.addColorStop(0, '#5E2430');
      bg.addColorStop(1, '#2A0D14');
      ctx.fillStyle = bg;
      ctx.fillRect(F[0] - F[2], F[1] - F[2], 2 * F[2], 2 * F[2]);
      // field of cells (fades as we zoom into one)
      if (zoom < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - zoom;
        const r = L.rng(L.hash(ID, 'cells'));
        for (let i = 0; i < 11; i++) {
          const x = 300 + r() * 560, y = 440 + r() * 720, cr = 50 + r() * 50;
          cell(ctx, L, P, x + Math.sin(T * 0.8 + i) * 6, y + Math.cos(T * 0.6 + i) * 6, cr, 100 + i * 3);
        }
        // the pellet's surface on the left, with the opening leaking ricin
        const px = F[0] - F[2] - 520, py = F[1];
        M.sphere(ctx, M.pelletTex(), 'pellet', px, py, 640, 0.0, { spec: 0.6, ambient: 0.35, tilt: 0.0 });
        const hole = [px + 640 * Math.sin(Math.PI / 4 - 0.0) * 0.98, py];
        const r2 = L.rng(L.hash(ID, 'ricin'));
        for (let i = 0; i < 60; i++) {
          const t0 = 22.5 + r2() * 2.2, life = 1.6;
          const u = (T - t0) / life;
          if (u < 0 || u > 1) continue;
          const a = (r2() - 0.5) * 1.6;
          const d = 40 + u * (260 + r2() * 300);
          ricinGlyph(ctx, L, P, hole[0] + Math.cos(a) * d, hole[1] + Math.sin(a) * d + Math.sin(u * 6 + i) * 10, 0.9, u * 4 + i);
        }
        ctx.restore();
      }
      // one cell: membrane, a ribosome on an mRNA strand making a protein — until ricin stops it
      if (zoom > 0) {
        ctx.save();
        ctx.globalAlpha = zoom;
        const mem = [];
        for (let x = F[0] - F[2]; x <= F[0] + F[2]; x += 10) mem.push([x, 620 + Math.sin(x * 0.012) * 26]);
        const inside = mem.concat([[F[0] + F[2], F[1] + F[2]], [F[0] - F[2], F[1] + F[2]]]);
        L.tracePath(ctx, inside, true);
        ctx.fillStyle = '#F2C9BE';
        ctx.fill();
        L.stipple(ctx, inside, { spacing: 10, r: [0.6, 1.4], color: '#7A2E28', alpha: 0.4, seed: 120 });
        L.inkPath(ctx, mem, { width: 5, color: '#5A1E1A', seed: 121 });
        L.inkPath(ctx, mem.map(([x, y]) => [x, y + 14]), { width: 2, color: '#5A1E1A', seed: 122 });
        // mRNA + ribosome
        const rib = [600, 930];
        L.inkPath(ctx, [[250, 960], [900, 940]], { width: 3, color: P.hcViolet, seed: 123 });
        const dead = T >= 26.21;
        L.inkPath(ctx, L.ellipsePts(rib[0], rib[1] - 34, 70, 42, 30), { closed: true, width: 3, color: P.hcInk, seed: 124, fill: dead ? '#9A9AA0' : '#7FB7C8' });
        L.inkPath(ctx, L.ellipsePts(rib[0] + 6, rib[1] + 28, 54, 30, 30), { closed: true, width: 3, color: P.hcInk, seed: 125, fill: dead ? '#B4B4BA' : '#A6D3DE' });
        // the protein chain: beads emitted while alive
        const made = Math.min(14, Math.floor((Math.min(T, 26.21) - 25.0) * 8));
        for (let k = 0; k < made; k++) {
          const a = -1.2 + k * 0.32;
          const bx = rib[0] + 40 + k * 22, by = rib[1] - 90 - Math.sin(k * 0.7) * 26;
          L.inkCircle(ctx, bx, by, 11, { width: 2, color: P.hcInk, seed: 130 + k, fill: k % 3 ? P.hcYellowPale : P.hcOrange });
        }
        // ricin: B docks on the membrane (25.67), A goes in (25.9→26.2) and hits the ribosome
        const dock = [520, 620 + Math.sin(520 * 0.012) * 26];
        const app = L.ease.outCubic(L.clamp((T - 25.2) / 0.45));
        const bpos = [L.lerp(360, dock[0] + 14, app), L.lerp(400, dock[1] - 14, app)];
        const ain = L.ease.inOutCubic(L.clamp((T - 25.9) / 0.32));
        const apos = [L.lerp(bpos[0] - 26, rib[0] - 10, ain), L.lerp(bpos[1], rib[1] - 34, ain)];
        ctx.fillStyle = P.hcYellow;
        ctx.beginPath(); ctx.ellipse(bpos[0], bpos[1], 26, 28, 0, 0, Math.PI * 2); ctx.fill();
        L.inkCircle(ctx, bpos[0], bpos[1], 27, { width: 3, color: P.hcInk, seed: 140 });
        ctx.fillStyle = P.hcOrange;
        ctx.beginPath(); ctx.ellipse(apos[0], apos[1], 30, 24, 0, 0, Math.PI * 2); ctx.fill();
        L.inkCircle(ctx, apos[0], apos[1], 28, { width: 3, color: P.hcInk, seed: 141 });
        if (T > 25.65 && T < 26.0) { ctx.strokeStyle = L.rgba(P.hcYellow, 1 - (T - 25.65) / 0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(dock[0], dock[1], 40 + 160 * (T - 25.65), 0, Math.PI * 2); ctx.stroke(); }
        if (dead) {
          const k = L.ease.outBack(L.clamp((T - 26.21) / 0.2));
          L.inkPath(ctx, [[rib[0] - 90 * k, rib[1] - 110 * k], [rib[0] + 90 * k, rib[1] + 70 * k]], { width: 9, color: P.hcRed, seed: 150 });
          L.inkPath(ctx, [[rib[0] + 90 * k, rib[1] - 110 * k], [rib[0] - 90 * k, rib[1] + 70 * k]], { width: 9, color: P.hcRed, seed: 151 });
        }
        ctx.restore();
      }
      ctx.restore();
      L.inkCircle(ctx, F[0], F[1], F[2], { width: 6, color: P.hcInk, seed: 160 });
      // labels outside the field (≤3)
      if (zoom > 0.5) {
        M.label(ctx, 'B · DOCKS', 120, 1310, { size: 24, color: P.hcInk, alpha: L.clamp((T - 25.6) / 0.2) });
        M.label(ctx, 'A · ENTERS', 120, 1360, { size: 24, color: P.hcInk, alpha: L.clamp((T - 25.95) / 0.2) });
        M.label(ctx, 'RIBOSOME STOPS', 600, 1310, { size: 24, color: P.hcRed, ucolor: P.hcRed, alpha: L.clamp((T - 26.25) / 0.2) });
      } else {
        M.label(ctx, 'RICIN', 820, 1300, { size: 30, color: P.hcInk, alpha: L.clamp((T - 23.2) / 0.3) });
      }
      // PiP: the castor bean
      const pp = L.clamp((T - 24.4) / 0.3) * (1 - L.clamp((T - 25.6) / 0.3));
      M.pip(ctx, { kind: 'rect', x: 80, y: 1210, w: 400, h: 260, p: pp, label: 'RICINUS COMMUNIS', plate: 'paper' }, (g) => {
        g.translate(0, -80);
        g.fillStyle = '#EFE6D2';
        g.fillRect(80, 1290, 400, 260);
        const b = L.ellipsePts(280, 1420, 120, 78, 60, -0.15);
        L.tracePath(g, b, true);
        g.fillStyle = '#8A5A44';
        g.fill();
        g.save(); g.clip();
        const r = L.rng(L.hash(ID, 'bean'));
        for (let i = 0; i < 60; i++) { g.fillStyle = r() > 0.5 ? '#C9A27A' : '#4A2C1E'; g.beginPath(); g.ellipse(170 + r() * 220, 1350 + r() * 140, 6 + r() * 16, 3 + r() * 8, r() * 3, 0, Math.PI * 2); g.fill(); }
        g.restore();
        L.inkPath(g, b, { closed: true, width: 3, color: P.hcInk, seed: 170 });
        L.inkPath(g, L.ellipsePts(168, 1440, 22, 16, 20), { closed: true, width: 2.5, color: P.hcInk, seed: 171, fill: '#E8D8B8' });
      });
    },
  });
})();
