// 04 · exhume · T 9.0–11.25 · an engraved graveyard under a smaller blood moon; a hooded gravedigger hacks at
// FORMOSVS's grave ("dug" 9.73). PiP: the grave in cross-section — soil strata, roots, the coffin 9 months down.
// "corpse" (10.38): lightning, the lid bursts and the engraved 3D skull stares out.
(function () {
  'use strict';
  FILM.scene({ id: 'exhume', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C, M = FILM.mk;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t + FILM.SHIFT;
    const fl = D.flash(T, [10.36]);
    let sh = 0; { const d = T - 10.38; if (d >= 0 && d < 0.35) sh = (1 - d / 0.35) * 20; }
    ctx.save(); ctx.translate(sh * Math.sin(T * 91), sh * Math.cos(T * 79));
    D.sky(ctx, T, { moon: [800, 380], h: 1300 });
    D.moon(ctx, 800, 380, 95, T);
    const lit = D.lights([{ x: 800, y: 380, r: 1700, k: 0.5 + 0.5 * fl }, { x: 110, y: 1480, r: 650, k: 0.7 }], 0.12);
    const r = L.rng(L.hash('graves'));
    for (let row = 5; row >= 1; row--) {
      const k = 1 / (1 + row * 0.55), y = 1060 + 480 * k, n = 5 + row;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5 + (r() - 0.5) * 0.4) / n * 1080, s = 130 * k * (0.8 + r() * 0.4);
        const pts = r() < 0.5 ? [[x - s * 0.08, y], [x - s * 0.08, y - s * 0.95], [x - s * 0.4, y - s * 0.95], [x - s * 0.4, y - s * 1.1], [x - s * 0.08, y - s * 1.1], [x - s * 0.08, y - s * 1.45], [x + s * 0.08, y - s * 1.45], [x + s * 0.08, y - s * 1.1], [x + s * 0.4, y - s * 1.1], [x + s * 0.4, y - s * 0.95], [x + s * 0.08, y - s * 0.95], [x + s * 0.08, y]]
          : [[x - s * 0.35, y]].concat(L.ellipsePts(x, y - s * 0.8, s * 0.35, s * 0.35, 12).filter(([, py]) => py <= y - s * 0.8)).concat([[x + s * 0.35, y]]);
        D.engrave(ctx, pts, { ink: '#B8B0A8', light: (a, b) => lit(a, b) * (0.5 + k), spacing: 4.5, seed: row * 40 + i, outW: 1.8, smooth: false, cross: false });
      }
    }
    D.mist(ctx, T, { y: 1280, h: 380, a: 0.35, speed: 25 });
    // ground
    const gnd = [[-20, 1440], [1100, 1440], [1100, 1940], [-20, 1940]];
    D.engrave(ctx, gnd, { ink: '#8A7A6A', light: (a, b) => lit(a, b) * 0.6, angle: 0.08, spacing: 5, seed: 77, smooth: false, outline: false });
    ctx.beginPath(); L.tracePath(ctx, [[300, 1520], [780, 1520], [860, 1770], [220, 1770]], true); ctx.fillStyle = '#020101'; ctx.fill();
    // headstone, carved
    const hs = [[370, 1500], [370, 1170], [400, 1080], [470, 1020], [540, 1004], [610, 1020], [680, 1080], [710, 1170], [710, 1500]];
    D.engrave(ctx, hs, { ink: '#C8C0B4', light: (a, b) => lit(a, b) * 0.9 + 0.1, angle: 0.7, spacing: 4.4, seed: 21, outW: 3 });
    L.text(ctx, 'FORMOSVS', 542, 1172, { size: 54, family: '"Fraunces", serif', weight: 700, align: 'center', baseline: 'middle', color: '#000' });
    L.text(ctx, 'FORMOSVS', 540, 1170, { size: 54, family: '"Fraunces", serif', weight: 700, align: 'center', baseline: 'middle', color: '#E8DCC8', alpha: 0.55 });
    L.text(ctx, '† DCCCXCVI', 540, 1250, { size: 30, family: '"Fraunces", serif', weight: 700, align: 'center', baseline: 'middle', color: '#000' });
    // coffin
    const burst = L.clamp((T - 10.38) / 0.3);
    const cof = [[330, 1640], [750, 1640], [720, 1740], [360, 1740]];
    D.engrave(ctx, cof, { ink: C.wood, light: (a, b) => lit(a, b) * 0.8 + 0.15 * fl, angle: 0.02, spacing: 4, seed: 31, smooth: false });
    if (burst > 0) {
      ctx.beginPath(); L.tracePath(ctx, [[350, 1646], [730, 1646], [705, 1730], [375, 1730]], true); ctx.fillStyle = '#020101'; ctx.fill();
      D.skull(ctx, 540, 1700, 105, { ember: 0.7 * burst, jaw: 0.5, tiara: false, res: 0.5, slot: 3, yaw: 0.2 });
      const ang = L.ease.outBack(burst) * 1.2;
      const lid = [[320, 1640], [760, 1640], [760, 1640 - 70 * Math.cos(ang)], [320, 1640 - 70 * Math.cos(ang)]].map(([a, b]) => [a, b - 120 * Math.sin(ang)]);
      D.engrave(ctx, lid, { ink: C.wood, light: () => 0.55 + 0.3 * fl, angle: 1.5, spacing: 4, seed: 33, smooth: false });
      const d = T - 10.38, rr = L.rng(L.hash('dust'));
      for (let i = 0; i < 50; i++) { const a = -Math.PI * (0.1 + rr() * 0.8), v = 200 + rr() * 500; L.inkPath(ctx, [[540 + Math.cos(a) * v * d, 1640 + Math.sin(a) * v * d + 300 * d * d], [540 + Math.cos(a) * v * d + 6, 1640 + Math.sin(a) * v * d + 300 * d * d + 4]], { width: 3, color: '#A89880', alpha: Math.max(0, 0.8 - d), seed: 700 + i, taper: 1 }); }
    } else {
      D.engrave(ctx, [[320, 1580], [760, 1580], [760, 1640], [320, 1640]], { ink: C.wood, light: (a, b) => lit(a, b) * 0.8, angle: 0.02, spacing: 4, seed: 35, smooth: false });
    }
    // mound + gravedigger + clods
    D.engrave(ctx, L.ellipsePts(170, 1560, 220, 90, 30).filter(([, y]) => y <= 1560), { ink: '#8A7A6A', light: (a, b) => lit(a, b), angle: 0.3, spacing: 4.5, seed: 41 });
    const ph = (T - 9.0) * 7.5;
    const tips = D.figure(ctx, 950, 1660, 0.95, T, { pose: 'dig', ph, hat: 'hood', flip: true, light: (a, b) => lit(a, b) * 0.9 + 0.15, seed: 9 });
    if (tips.shovel) { const [hx, hy] = tips.shovel, bx = hx - 70 - 50 * Math.sin(ph), by = hy + 220; L.inkPath(ctx, [[hx + 60, hy - 120], [bx, by]], { width: 9, color: '#2A1A10', seed: 51, taper: 2 }); D.engrave(ctx, L.ellipsePts(bx, by + 20, 30, 42, 14, 0.3), { ink: '#A8A8B0', light: () => 0.6, spacing: 3.5, seed: 52, outW: 2 }); }
    for (let k = 0; k < 4; k++) { const d = T - (9.15 + k * (Math.PI * 2 / 7.5)); if (d < 0 || d > 0.8) continue; const rr = L.rng(L.hash('clod', k)); for (let i = 0; i < 12; i++) { const vx = 300 + rr() * 500, vy = -700 - rr() * 400; L.inkPath(ctx, L.ellipsePts(760 - vx * d, 1600 + vy * d + 1500 * d * d, 7, 5, 8), { closed: true, width: 2, color: '#000', fill: '#3A2A1C', seed: 800 + k * 20 + i }); } }
    D.candle(ctx, 110, 1470, 0.8, T, { seed: 9, h: 90 });
    ctx.restore();
    D.rain(ctx, T, { n: 140, a: 0.22 });
    // PiP: the grave in cross-section
    const pp = L.clamp((T - 9.45) / 0.3) * (1 - L.clamp((T - 10.2) / 0.2));
    M.pip(ctx, { kind: 'rect', x: 120, y: 260, w: 560, h: 380, p: pp, label: '9 MONTHS UNDERGROUND', plate: 'navy', target: [540, 1600] }, (g) => {
      D.plate(g);
      const bands = [[260, '#3A2A1C'], [330, '#2A1E14'], [420, '#1E160E'], [520, '#140E0A']];
      bands.forEach(([y0, c], i) => { const pts = [[120, y0], [680, y0 + 8], [680, 640], [120, 640]]; D.engrave(g, pts, { ink: '#D8C0A0', base: c, light: () => 0.6 - i * 0.08, angle: 0.15 + i * 0.2, spacing: 4.6, seed: 900 + i, outW: 1.6, smooth: false, cross: false }); });
      for (let k = 0; k < 6; k++) L.inkPath(g, [[160 + k * 90, 262], [170 + k * 90 + Math.sin(k) * 20, 330], [150 + k * 90, 380]], { width: 1.6, color: '#C8B098', alpha: 0.6, seed: 950 + k, taper: [4, 20] });
      D.engrave(g, [[260, 520], [540, 520], [520, 600], [280, 600]], { ink: C.wood, light: () => 0.45, spacing: 3.8, seed: 960, smooth: false });
      L.inkPath(g, [[300, 560], [500, 560]], { width: 6, color: C.bone, alpha: 0.7, seed: 961, taper: [10, 10] });
      L.text(g, '1.8 M', 600, 450, { size: 22, family: '"JetBrains Mono", monospace', weight: 600, color: C.yellow, tracking: '0.18em' });
      L.bracket(g, 580, 262, 580, 520, { color: C.yellow, alpha: 0.9, width: 2 });
    });
    D.grain(ctx, T, 1);
  } });
})();
