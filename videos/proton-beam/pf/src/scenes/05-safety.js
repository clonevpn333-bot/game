// 05 · safety · T 12.0–16.0
//   A 12.0–14.0 engraved Soviet control panel, lamps blink red on the beat, needles shake; FAILED stamps across it (13.39)
//   B 14.0–15.25 side diagram on the hook's diagonal: the beam pipe runs into his head; the proton comet races toward it
//               carrying "76 GeV PROTONS"; THE BEAM / WAS STILL ON
//   C 15.25–16.0 freeze — the comet stops a hair from his skull; the world sinks to black (the drop-out before the flash)
(function () {
  'use strict';
  function panel(ctx, L, D, PB, T) {
    PB.plate(ctx, { seed: 51, color: '#0C0F1A' });
    const lit = D.lights([{ x: 540, y: 700, r: 1300, k: 0.55 }], 0.08);
    const plate = L.rrectPts(80, 520, 920, 1060, 26);
    D.engrave(ctx, plate, { ink: '#8A9AB8', base: '#1A2030', light: lit, angle: 0.3, spacing: 5, seed: 500, smooth: false, outW: 4 });
    // rivets
    for (const [x, y] of [[120, 560], [960, 560], [120, 1540], [960, 1540]]) L.inkCircle(ctx, x, y, 9, { width: 2, color: '#000', fill: '#C0C8D8', seed: 501 + x });
    // name plate (Cyrillic + English)
    D.engrave(ctx, L.rectPts(220, 580, 640, 110, 30), { ink: '#E6C878', base: '#3A2A0A', light: () => 0.55, spacing: 3.5, seed: 505, smooth: false, outW: 2.5, cross: false, stip: false });
    L.text(ctx, 'СИСТЕМА БЕЗОПАСНОСТИ', 540, 620, { size: 32, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#1A1206', tracking: '0.08em' });
    L.text(ctx, 'SAFETY SYSTEM', 540, 662, { size: 26, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#1A1206', tracking: '0.3em' });
    // three dials with shaking needles
    for (let i = 0; i < 3; i++) {
      const x = 260 + i * 280, y = 870, r = 105;
      D.engrave(ctx, L.ellipsePts(x, y, r, r, 48), { ink: '#F2E8D0', base: '#D8CCB0', light: () => 0.15, spacing: 4, seed: 510 + i, outW: 4, cross: false, stip: false });
      for (let k = 0; k <= 10; k++) { const a = Math.PI * (0.8 + k * 0.14); L.inkPath(ctx, [[x + Math.cos(a) * r * 0.78, y + Math.sin(a) * r * 0.78], [x + Math.cos(a) * r * 0.92, y + Math.sin(a) * r * 0.92]], { width: k % 5 ? 2 : 4, color: '#1A1206', seed: 520 + k, taper: 0 }); }
      const red = []; for (let k = 0; k <= 8; k++) { const a = Math.PI * (2.0 + k * 0.025); red.push([x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85]); }
      L.inkPath(ctx, red, { width: 8, color: PB.RED, seed: 530 + i, taper: 0 });
      const a = Math.PI * (1.45 + 0.5 * L.clamp((T - 12.0) / 1.4) + 0.06 * Math.sin(T * 37 + i * 2)), nr = r * 0.82;
      L.inkPath(ctx, [[x, y], [x + Math.cos(a) * nr, y + Math.sin(a) * nr]], { width: 5, color: '#000', seed: 540 + i, taper: [0, 10] });
      L.inkCircle(ctx, x, y, 9, { width: 2, color: '#000', fill: '#3A3A3A', seed: 545 + i });
    }
    // lamp row: blink red on the beat
    const beat = Math.floor((T - 12.0) / 0.5);
    for (let i = 0; i < 5; i++) {
      const x = 220 + i * 160, y = 1100, on = (beat + i) % 2 === 0 && T > 12.0;
      L.inkCircle(ctx, x, y, 42, { width: 4, color: '#000', fill: on ? '#FF4A30' : '#4A1410', seed: 550 + i });
      if (on) PB.burst(ctx, x, y, 150, 0.55, '255,80,50');
    }
    // toggle switches (all thrown to OFF… but the beam still runs)
    for (let i = 0; i < 6; i++) {
      const x = 200 + i * 136, y = 1320;
      D.engrave(ctx, L.rectPts(x - 34, y - 54, 68, 108, 14), { ink: '#A8B4D0', base: '#141A28', light: () => 0.4, spacing: 3.5, seed: 560 + i, smooth: false, outW: 2.5, cross: false, stip: false });
      L.inkPath(ctx, [[x, y], [x + 8, y + 50]], { width: 12, color: '#D8DCE8', seed: 570 + i, taper: [0, 4] });
    }
  }
  FILM.scene({ id: 'safety', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    if (T < 14.0) {
      const push = 1 + 0.05 * (T - 12.0), sh = T > 13.39 && T < 13.6 ? Math.sin(T * 120) * 8 * (1 - (T - 13.39) / 0.21) : 0;
      ctx.save(); ctx.translate(540 + sh, 1000); ctx.scale(push, push); ctx.translate(-540, -1000);
      panel(ctx, L, D, PB, T);
      ctx.restore();
      // FAILED stamped across the panel
      const st = L.clamp((T - 13.39) / 0.08);
      if (st > 0) {
        ctx.save(); ctx.translate(540, 1000); ctx.rotate(-0.22); const sc = 1 + 0.5 * (1 - L.ease.outCubic(st)); ctx.scale(sc, sc);
        ctx.globalAlpha = L.clamp(st * 1.5);
        const box = L.rrectPts(-380, -110, 760, 220, 18);
        L.inkPath(ctx, box, { closed: true, width: 12, color: PB.RED, seed: 580 });
        L.inkPath(ctx, L.rrectPts(-356, -88, 712, 176, 12), { closed: true, width: 4, color: PB.RED, seed: 581 });
        L.text(ctx, 'FAILED', 0, 6, { size: 170, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: PB.RED, tracking: '0.08em' });
        // ink speckle (worn stamp)
        L.stipple(ctx, box, { spacing: 9, r: [1, 2.6], color: '#0C0F1A', alpha: 0.7, seed: 582, density: () => 0.35 });
        ctx.restore();
      }
      PB.word(ctx, 'THE SAFETY', 540, 200, 112, (T - 12.2) / 0.12);
      PB.word(ctx, 'SYSTEM', 540, 330, 120, (T - 12.85) / 0.12, { color: PB.Y });
      return;
    }
    // B + C: the pipe runs into his head on the hook's diagonal; the comet races in
    PB.plate(ctx, { seed: 52 });
    PB.grid(ctx, 0.08, 60);
    const freeze = L.clamp((T - 15.25) / 0.6);
    const H = 700, cx = 760, cy = 1150;
    const r = FILM.pb.head(ctx, cx, cy, H, { yaw: 1.3, key: [-0.3, 0.45, 0.8], res: 0.32, slot: 9 });
    const a = r.proj(...PB.BEAM_IN), b = r.proj(...PB.BEAM_OUT);
    const [p] = PB.extend(a, b, 1400);
    const ux = (a[0] - p[0]) / Math.hypot(a[0] - p[0], a[1] - p[1]), uy = (a[1] - p[1]) / Math.hypot(a[0] - p[0], a[1] - p[1]);
    const end = [a[0] - ux * 60, a[1] - uy * 60];
    // the beam pipe (engraved tube) up to the open gap behind his head
    const nx = -uy, ny = ux, R = 26;
    const tube = [[p[0] + nx * R, p[1] + ny * R], [end[0] + nx * R, end[1] + ny * R], [end[0] - nx * R, end[1] - ny * R], [p[0] - nx * R, p[1] - ny * R]];
    D.engrave(ctx, tube, { ink: '#A8B8E0', base: '#101830', light: (x, y) => 0.3 + 0.3 * ((x - p[0]) * nx + (y - p[1]) * ny > 0 ? 0 : 1), angle: Math.atan2(ny, nx), spacing: 4.5, seed: 590, smooth: false, outW: 3, cross: false, stip: false });
    L.inkCircle(ctx, end[0], end[1], R * 1.4, { width: 4, color: '#000', fill: PB.Y, seed: 591, ry: R * 1.4 });
    L.inkCircle(ctx, end[0], end[1], R * 0.7, { width: 2, color: '#000', fill: '#05070F', seed: 592 });
    // the comet: races from the left edge to a hair from his skull, then freezes
    const run = L.ease.inQuad(L.clamp((T - 14.0) / 1.25));
    const total = Math.hypot(a[0] - p[0], a[1] - p[1]) - 18;
    const fr = 200 + (total - 200) * run;
    const head = [p[0] + ux * fr, p[1] + uy * fr];
    PB.beam(ctx, p, head, { T: freeze > 0 ? 15.25 : T, w: 6, k: 1 });
    PB.burst(ctx, head[0], head[1], 140, 0.9);
    // the label rides the beam front
    const la = 1 - freeze;
    if (la > 0) PB.label(ctx, '76 GeV PROTONS →', head[0] - 330, head[1] - 70, ((T - 14.05) / 0.2) * la, { size: 26 });
    PB.label(ctx, 'BEAM: ON', 70, 1540, ((T - 14.6) / 0.15) * la, { col: '#FF7A5A', size: 30 });
    // freeze → black (keep the comet and a rim of his head)
    if (freeze > 0) {
      ctx.fillStyle = `rgba(3,4,10,${0.86 * L.ease.inCubic(freeze)})`; ctx.fillRect(0, 0, 1080, 1920);
      PB.burst(ctx, head[0], head[1], 90, 0.9 * freeze);
      ctx.fillStyle = `rgba(255,250,230,${freeze})`; ctx.beginPath(); ctx.arc(head[0], head[1], 6, 0, Math.PI * 2); ctx.fill();
    }
    const ta = 1 - L.ease.inCubic(freeze);
    PB.word(ctx, 'THE BEAM', 540, 210, 120, (T - 14.0) / 0.1, { alpha: ta });
    PB.word(ctx, 'WAS STILL ON.', 540, 345, 112, (T - 14.5) / 0.12, { color: PB.Y, alpha: ta });
  } });
})();
