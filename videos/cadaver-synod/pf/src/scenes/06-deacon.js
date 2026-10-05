// 06 · deacon · T 13.25–16.75 · the engraved 3D corpse enthroned; a hooded deacon trembles beside it. PiP: THE CHARGES —
// the scroll he must answer, red seals and all (13.95). 15.15: Stephen, mitred, in the foreground, screaming (15.58):
// ink shock-strokes, candles guttering, the frame shaking; on "corpse" (16.34) the dead jaw drops.
(function () {
  'use strict';
  FILM.scene({ id: 'deacon', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C, M = FILM.mk;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const scream = T >= 15.15;
    let sh = 0; if (T > 15.55 && T < 16.6) sh = 9 + 6 * Math.sin(T * 9);
    ctx.save(); ctx.translate(sh * Math.sin(T * 97), sh * Math.cos(T * 83));
    D.plate(ctx);
    const gut = scream ? 0.6 + 0.4 * Math.sin(T * 23) : 1;
    const lit = D.lights([{ x: 760, y: 1420, r: 900, k: 0.55 * gut }, { x: 120, y: 1500, r: 700, k: 0.4 * gut }], 0.03);
    // engraved arcade behind
    for (const ax of [-120, 360, 840]) {
      const arch = [[ax, 1520], [ax, 760]].concat(L.ellipsePts(ax + 180, 760, 180, 220, 24).filter(([, y]) => y <= 760).sort((a, b) => a[0] - b[0])).concat([[ax + 360, 760], [ax + 360, 1520]]);
      D.engrave(ctx, [[ax - 40, 1520], [ax - 40, 500], [ax + 400, 500], [ax + 400, 1520]], { ink: '#A89C90', light: (x, y) => lit(x, y) * 0.55, angle: 0.15, spacing: 5.5, seed: 1400 + ax, smooth: false, outline: false, cross: false });
      ctx.beginPath(); L.tracePath(ctx, arch, true); ctx.fillStyle = '#040303'; ctx.fill();
      L.inkPath(ctx, arch, { closed: true, width: 4, color: '#000', seed: 1450 + ax });
    }
    D.engrave(ctx, [[-20, 1520], [1100, 1520], [1100, 1940], [-20, 1940]], { ink: '#8E8276', light: (x, y) => lit(x, y) * 0.6, angle: 0.05, spacing: 5, seed: 1480, smooth: false, outline: false });
    const z = scream ? 1.08 : 1 + 0.03 * (t / 1.9);
    ctx.save(); ctx.translate(380, 1300); ctx.scale(z, z); ctx.translate(-380, -1300);
    D.corpse(ctx, 400, 1700, 1180, T, { yaw: 0.28, ember: scream ? 0.8 : 0.3, jaw: T > 16.3 ? 0.25 + 0.75 * L.clamp((T - 16.3) / 0.15) : 0.25, res: 0.34 });
    ctx.restore();
    D.candle(ctx, 120, 1560, 0.9 * (scream ? 1 : 1), T + (scream ? 3 : 0), { seed: 61, h: 130 });
    D.candle(ctx, 760, 1600, 0.9, T + (scream ? 5 : 0), { seed: 62, h: 130 });
    if (!scream) D.figure(ctx, 860, 1590, 0.95, T, { pose: 'pray', hat: 'hood', tremble: 1, light: (x, y) => lit(x, y) + 0.25, seed: 13 });
    if (scream) {
      D.figure(ctx, 880, 2150, 1.9, T, { pose: 'point', hat: 'mitre', flip: true, ink: '#E8584A', light: (x, y) => L.clamp(0.25 + (x - 700) / 900), tremble: 0.6, seed: 17 });
      const sc = L.clamp((T - 15.55) / 0.1);
      if (sc > 0) { const hx = 880, hy = 2150 - 462 * 1.9, rr = L.rng(Math.floor(T * 12) + 7); for (let k = 0; k < 10; k++) { const a = -Math.PI * (0.5 + k * 0.1), r0 = 140 + rr() * 30, r1 = r0 + 100 + rr() * 90; L.inkPath(ctx, [[hx + Math.cos(a) * r0, hy + Math.sin(a) * r0], [hx + Math.cos(a + 0.06) * (r0 + r1) / 2, hy + Math.sin(a + 0.06) * (r0 + r1) / 2], [hx + Math.cos(a) * r1, hy + Math.sin(a) * r1]], { width: 5, color: '#FF6A4A', alpha: sc, seed: 1500 + k, smooth: false, taper: [2, 16] }); } }
    }
    D.mist(ctx, T, { y: 1780, h: 360, a: 0.3, speed: 30 });
    ctx.restore();
    // PiP: the charges
    const pp = L.clamp((T - 13.95) / 0.3) * (1 - L.clamp((T - 15.0) / 0.15));
    M.pip(ctx, { kind: 'rect', x: 560, y: 260, w: 440, h: 420, p: pp, label: 'THE CHARGES', plate: 'paper', target: [860, 1080] }, (g) => {
      L.paper(g, { x: 560, y: 260, w: 440, h: 420, color: '#D8C8A2', seed: 9, vignette: 0.5 });
      const lines = ['Periurium', 'Ambitio papatus', 'Translatio sedis', 'Episcopus depositus'];
      lines.forEach((s, i) => { L.text(g, s, 600, 340 + i * 70, { size: 38, family: '"Fraunces", serif', weight: 600, color: '#2A1408' }); L.inkPath(g, [[600, 356 + i * 70], [600 + 300 * L.clamp((T - 14.0 - i * 0.18) / 0.3), 358 + i * 70]], { width: 2, color: '#7A1A14', alpha: 0.8, seed: 1600 + i }); });
      for (let k = 0; k < 2; k++) { const sx = 900 - k * 70, sy = 620; L.inkPath(g, L.ellipsePts(sx, sy, 30, 30, 24), { closed: true, width: 2.5, color: '#3A0808', fill: '#A01A16', seed: 1620 + k }); L.hatch(g, L.ellipsePts(sx, sy, 28, 28, 18), { angle: 0.8, spacing: 4, width: 1, color: '#3A0808', alpha: 0.6, seed: 1630 + k }); }
    });
    D.grain(ctx, T, 1);
  } });
})();
