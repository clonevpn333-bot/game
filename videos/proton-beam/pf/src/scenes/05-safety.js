// 05 · safety · T 8.5–12.0 · one graphic causes the next:
//   8.5–8.85  the lit beam pipe from the tunnel swings and becomes the needle of a huge engraved gauge (the dial inks in round it)
//   8.85–9.75 the needle climbs, shaking, toward the red; THE SAFETY / SYSTEM
//   9.75      on the beat it SLAMS into the red — FAILED stamps across the dial
//   10.0–10.4 the red warning lamp flares; the camera dives into it — the lamp's hot core becomes the beam's front
//   10.4–11.5 the side diagram: that front races down the pipe into the back of his head; THE BEAM / WAS STILL ON.
//   11.5–12.0 freeze a hair from his skull; the world sinks to black (music drop-out) → the flash
(function () {
  'use strict';
  const C0 = [540, 1080], RD = 330, LAMP = [540, 640];
  const A_REST = Math.PI * 0.85, A_RED = Math.PI * 2.08;
  function gauge(ctx, L, D, PB, T, ap) {
    const lit = D.lights([{ x: 420, y: 800, r: 1200, k: 0.5 }], 0.08);
    // housing + face, drawn on with ap
    ctx.save(); ctx.globalAlpha = ap;
    D.engrave(ctx, L.ellipsePts(C0[0], C0[1], RD + 60, RD + 60, 80), { ink: '#8A9AB8', base: '#1A2030', light: lit, angle: 0.4, spacing: 4.5, seed: 500, outW: 5 });
    D.engrave(ctx, L.ellipsePts(C0[0], C0[1], RD, RD, 80), { ink: '#F2E8D0', base: '#DCD0B4', light: () => 0.12, angle: -0.6, spacing: 5, seed: 501, outW: 4, cross: false, stip: false });
    for (let k = 0; k <= 20; k++) {
      const a = A_REST + (k / 20) * (A_RED + 0.2 - A_REST), big = k % 5 === 0;
      L.inkPath(ctx, [[C0[0] + Math.cos(a) * RD * (big ? 0.76 : 0.83), C0[1] + Math.sin(a) * RD * (big ? 0.76 : 0.83)], [C0[0] + Math.cos(a) * RD * 0.93, C0[1] + Math.sin(a) * RD * 0.93]], { width: big ? 6 : 3, color: '#1A1206', seed: 510 + k, taper: 0 });
    }
    const red = []; for (let k = 0; k <= 16; k++) { const a = A_RED - 0.35 + (k / 16) * 0.55; red.push([C0[0] + Math.cos(a) * RD * 0.86, C0[1] + Math.sin(a) * RD * 0.86]); }
    L.inkPath(ctx, red, { width: 26, color: PB.RED, seed: 530, taper: 0 });
    if (T < 10.05) L.text(ctx, 'СИСТЕМА БЕЗОПАСНОСТИ', C0[0], C0[1] + RD * 0.45, { size: 26, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#1A1206', tracking: '0.06em' });
    if (T < 10.05) L.text(ctx, 'SAFETY INTERLOCK', C0[0], C0[1] + RD * 0.58, { size: 22, family: PB.MONO, weight: 600, align: 'center', baseline: 'middle', color: '#3A2A10', tracking: '0.3em' });
    // the warning lamp on top
    L.inkPath(ctx, [[LAMP[0], LAMP[1] + 60], [LAMP[0], C0[1] - RD - 60]], { width: 14, color: '#2A3048', seed: 540, taper: 0 });
    ctx.restore();
  }
  FILM.scene({ id: 'safety', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    if (T < 10.4) {
      PB.plate(ctx, { seed: 51, color: '#0C0F1A' });
      PB.grid(ctx, 0.06, 60);
      const dive = L.ease.inCubic(L.clamp((T - 10.05) / 0.35));
      const zs = 1 + dive * 7;
      const shake = T > 9.75 && T < 10.0 ? Math.sin(T * 130) * 10 * (1 - (T - 9.75) / 0.25) : 0;
      ctx.save(); ctx.translate(LAMP[0] + shake, LAMP[1]); ctx.scale(zs, zs); ctx.translate(-LAMP[0], -LAMP[1] + dive * 0);
      const ap = L.ease.outCubic(L.clamp((T - 8.5) / 0.35));
      gauge(ctx, L, D, PB, T, ap);
      // the needle: starts as the lit pipe line from the tunnel and swings onto the pivot
      const m = L.ease.inOutCubic(L.clamp((T - 8.5) / 0.35));
      const climb = L.clamp((T - 8.85) / 0.9);
      let ang = A_REST + (A_RED - 0.45 - A_REST) * L.ease.inQuad(climb) + 0.05 * Math.sin(T * 41) * climb;
      if (T >= 9.75) { const d = T - 9.75; ang = A_RED + 0.18 * Math.exp(-d * 9) * Math.cos(d * 40); }
      const nl = RD * 0.82, tip = [C0[0] + Math.cos(ang) * nl, C0[1] + Math.sin(ang) * nl], tail = [C0[0] - Math.cos(ang) * 40, C0[1] - Math.sin(ang) * 40];
      const P0 = [L.lerp(560, tail[0], m), L.lerp(880, tail[1], m)], P1 = [L.lerp(1100, tip[0], m), L.lerp(1240, tip[1], m)];
      if (m < 1) PB.beam(ctx, P0, P1, { T, w: 6, dots: false, k: 1 - m * 0.6 });
      L.inkPath(ctx, [P0, P1], { width: L.lerp(4, 12, m), color: T >= 9.75 ? PB.RED : '#111', seed: 545, taper: [0, 18] });
      L.inkCircle(ctx, C0[0], C0[1], 22 * m + 2, { width: 3, color: '#000', fill: '#3A3A3A', seed: 546 });
      // the lamp: blinks on the beat, flares on FAILED, then its core is all we see
      const beat = Math.floor((T - 8.5) / 0.5), on = T >= 9.75 || beat % 2 === 0;
      const flare = T >= 9.75 ? 1 : 0;
      ctx.globalAlpha = ap;
      L.inkCircle(ctx, LAMP[0], LAMP[1], 70, { width: 6, color: '#000', fill: on ? '#FF4A30' : '#4A1410', seed: 550 });
      ctx.globalAlpha = 1;
      if (on) PB.burst(ctx, LAMP[0], LAMP[1], 220 + 200 * flare, 0.6 + 0.4 * flare, '255,80,50');
      if (dive > 0) PB.burst(ctx, LAMP[0], LAMP[1], 80, dive, '255,240,200');
      ctx.restore();
      // FAILED stamps across the dial on the beat
      const st = L.clamp((T - 9.75) / 0.06);
      if (st > 0) {
        ctx.save(); ctx.globalAlpha = L.clamp(st * 1.5) * (1 - dive);
        ctx.translate(540, 1120); ctx.rotate(-0.22); const sc = 1 + 0.6 * (1 - L.ease.outCubic(st)); ctx.scale(sc, sc);
        const box = L.rrectPts(-380, -110, 760, 220, 18);
        ctx.fillStyle = 'rgba(242,232,208,0.85)'; ctx.beginPath(); L.tracePath(ctx, box, true); ctx.fill();
        L.inkPath(ctx, box, { closed: true, width: 12, color: PB.RED, seed: 580 });
        L.inkPath(ctx, L.rrectPts(-356, -88, 712, 176, 12), { closed: true, width: 4, color: PB.RED, seed: 581 });
        L.text(ctx, 'FAILED', 0, 6, { size: 170, family: PB.SERIF, weight: 700, align: 'center', baseline: 'middle', color: PB.RED, tracking: '0.08em' });
        L.stipple(ctx, box, { spacing: 9, r: [1, 2.6], color: '#F2E8D0', alpha: 0.6, seed: 582, density: () => 0.3 });
        ctx.restore();
      }
      if (dive > 0) { ctx.fillStyle = `rgba(255,90,60,${0.5 * dive})`; ctx.fillRect(0, 0, 1080, 1920); }
      ctx.save(); ctx.globalAlpha = 1 - dive;
      ctx.restore();
      return;
    }
    // side diagram: the lamp's hot core is now the beam's front, racing down the pipe into his head
    PB.plate(ctx, { seed: 52 });
    PB.grid(ctx, 0.08, 60);
    const freeze = L.clamp((T - 11.5) / 0.45);
    const H = 700, cx = 760, cy = 1150;
    const r = FILM.pb.head(ctx, cx, cy, H, { yaw: 1.3, key: [-0.3, 0.45, 0.8], res: 0.32, slot: 9 });
    const a = r.proj(...PB.BEAM_IN), b = r.proj(...PB.BEAM_OUT);
    const [p] = PB.extend(a, b, 1400);
    const ux = (a[0] - p[0]) / Math.hypot(a[0] - p[0], a[1] - p[1]), uy = (a[1] - p[1]) / Math.hypot(a[0] - p[0], a[1] - p[1]);
    const end = [a[0] - ux * 60, a[1] - uy * 60];
    const nx = -uy, ny = ux, R = 26;
    const tube = [[p[0] + nx * R, p[1] + ny * R], [end[0] + nx * R, end[1] + ny * R], [end[0] - nx * R, end[1] - ny * R], [p[0] - nx * R, p[1] - ny * R]];
    D.engrave(ctx, tube, { ink: '#A8B8E0', base: '#101830', light: (x, y) => 0.3 + 0.3 * ((x - p[0]) * nx + (y - p[1]) * ny > 0 ? 0 : 1), angle: Math.atan2(ny, nx), spacing: 4.5, seed: 590, smooth: false, outW: 3, cross: false, stip: false });
    L.inkCircle(ctx, end[0], end[1], R * 1.4, { width: 4, color: '#000', fill: PB.Y, seed: 591 });
    L.inkCircle(ctx, end[0], end[1], R * 0.7, { width: 2, color: '#000', fill: '#05070F', seed: 592 });
    const run = L.ease.inQuad(L.clamp((T - 10.4) / 1.1));
    const total = Math.hypot(a[0] - p[0], a[1] - p[1]) - 18;
    const fr = 900 + (total - 900) * run;
    const head = [p[0] + ux * fr, p[1] + uy * fr];
    PB.beam(ctx, p, head, { T: freeze > 0 ? 11.5 : T, w: 6, k: 1 });
    // the front is still red-hot from the lamp for a moment, then beam-yellow
    const hotR = 1 - L.clamp((T - 10.4) / 0.4);
    PB.burst(ctx, head[0], head[1], 160, 0.9, hotR > 0 ? '255,110,70' : '255,226,140');
    const la = 1 - freeze;
    if (la > 0) PB.label(ctx, 'PROTONS →', head[0] - 230, head[1] - 70, ((T - 10.45) / 0.15) * la, { size: 26 });
    PB.label(ctx, 'BEAM: ON', 70, 1540, ((T - 10.6) / 0.12) * la, { col: '#FF7A5A', size: 30 });
    if (freeze > 0) {
      ctx.fillStyle = `rgba(3,4,10,${0.86 * L.ease.inCubic(freeze)})`; ctx.fillRect(0, 0, 1080, 1920);
      PB.burst(ctx, head[0], head[1], 90, 0.9 * freeze);
      ctx.fillStyle = `rgba(255,250,230,${freeze})`; ctx.beginPath(); ctx.arc(head[0], head[1], 6, 0, Math.PI * 2); ctx.fill();
    }
    const ta = 1 - L.ease.inCubic(freeze);
  } });
})();
