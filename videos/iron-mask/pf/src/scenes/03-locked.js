// 03 · locked · T 8.1–11.1 · a dungeon door, oak and iron, slams shut (8.15, 3D swing), the key turns (9.2), and a red wax
// seal stamps SECRET (10.27) with its explanation: a secret royal order.
(function () {
  'use strict';
  FILM.scene({ id: 'locked', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t + FILM.OFF1;
    let sh = 0; { const d = T - 8.45; if (d >= 0 && d < 0.35) sh = (1 - d / 0.35) * 22; }
    ctx.save(); ctx.translate(sh * Math.sin(T * 93), sh * Math.cos(T * 71));
    D.plate(ctx);
    const lit = D.lights([{ x: 760, y: 500, r: 1600, k: 0.85 }], 0.12);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.1, spacing: 6, width: 1.1, color: '#A8A0B0', alpha: 0.8, seed: 21, density: (x, y) => lit(x, y) * 0.75 });
    for (let row = 0, y = 30; y < 1920; y += 104, row++) { L.inkPath(ctx, [[-10, y], [1090, y + 4]], { width: 2.6, color: '#000', seed: 400 + row, taper: 0 }); for (let x = (row % 2) * 110 - 40; x < 1080; x += 220) L.inkPath(ctx, [[x, y], [x + 3, y + 104]], { width: 2.2, color: '#000', seed: 500 + row * 7 + x, taper: 0 }); }
    // doorway
    const DX = 210, DY = 300, DW = 660, DH = 1300;
    ctx.fillStyle = '#020102'; ctx.fillRect(DX, DY, DW, DH);
    const sw = L.ease.inQuad(L.clamp((T - 8.1) / 0.35));
    const ang = (1 - sw) * 1.1, cw = Math.cos(ang), persp = Math.sin(ang) * 120;
    const door = [[DX, DY], [DX + DW * cw, DY + persp], [DX + DW * cw, DY + DH - persp], [DX, DY + DH]];
    D.engrave(ctx, door, { ink: C.wood, light: (x, y) => lit(x, y) * 0.9 + 0.1, angle: 1.57, spacing: 4.6, seed: 31, smooth: false, outW: 4 });
    for (let k = 0; k < 4; k++) { const y0 = DY + 160 + k * 330; const band = [[DX, y0], [DX + DW * cw, y0 + persp * (1 - (y0 - DY) / DH * 2) * 0.2], [DX + DW * cw, y0 + 46], [DX, y0 + 46]]; D.engrave(ctx, band, { ink: '#B8BCC8', base: '#141218', light: (x, y) => lit(x, y), angle: 0.05, spacing: 3.6, seed: 40 + k, smooth: false, outW: 2.4 }); for (let r = 0; r < 6; r++) { const rx = DX + (r + 0.5) / 6 * DW * cw; L.inkPath(ctx, L.ellipsePts(rx, y0 + 23, 7, 7, 10), { closed: true, width: 1.6, color: '#000', fill: '#D8D8E0', seed: 60 + k * 6 + r }); } }
    // lock + key
    if (sw >= 1) {
      const lx = DX + DW - 150, ly = DY + 760;
      D.engrave(ctx, [[lx - 70, ly - 90], [lx + 70, ly - 90], [lx + 70, ly + 90], [lx - 70, ly + 90]], { ink: '#C8CCD8', base: '#141218', light: () => 0.6, spacing: 3.4, seed: 70, smooth: false, outW: 3 });
      const kt = L.ease.inOutCubic(L.clamp((T - 9.15) / 0.4)) * Math.PI / 2;
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(-kt);
      D.engrave(ctx, L.ellipsePts(0, -130, 46, 46, 24), { ink: C.gold, light: () => 0.75, spacing: 3.2, seed: 71, outW: 3 });
      ctx.beginPath(); ctx.arc(0, -130, 20, 0, Math.PI * 2); ctx.fillStyle = '#000'; ctx.fill();
      D.engrave(ctx, [[-9, -86], [9, -86], [9, 10], [-9, 10]], { ink: C.gold, light: () => 0.75, spacing: 3, seed: 72, smooth: false, outW: 2.4 });
      ctx.restore();
    }
    ctx.restore();
    // the seal
    const sd = T - 10.27;
    if (sd >= 0) {
      const k = 1 + 0.5 * Math.pow(1 - L.clamp(sd / 0.12), 2);
      ctx.save(); ctx.translate(540, 1500); ctx.scale(k, k);
      const blob = []; for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2, r = 150 + 12 * Math.sin(i * 2.3) + 8 * Math.sin(i * 5.1); blob.push([Math.cos(a) * r, Math.sin(a) * r]); }
      D.engrave(ctx, blob, { ink: '#FF8A70', base: '#9A1414', light: (x, y) => L.clamp(0.55 - (x + y) / 500), angle: 0.8, spacing: 3.6, seed: 80, outW: 3 });
      L.inkPath(ctx, L.ellipsePts(0, 0, 112, 112, 40), { closed: true, width: 3, color: '#5A0808', seed: 81 });
      D.fleur(ctx, 0, -10, 0.55, () => 0.6, 82, '#FFB8A0');
      ctx.restore();
      L.text(ctx, 'SECRET', 540, 1500 + 6, { size: 30, family: '"JetBrains Mono", monospace', weight: 700, align: 'center', color: '#FFE0D0', alpha: L.clamp(sd / 0.15), tracking: '0.3em' });
      L.text(ctx, 'A SECRET ROYAL ORDER', 540, 1300, { size: 34, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: C.ivory, alpha: L.clamp((sd - 0.1) / 0.2), tracking: '0.2em' });
    }
    D.grain(ctx, T, 1);
  } });
})();
