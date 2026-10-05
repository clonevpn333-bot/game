// 01 · hook · T 0–4.25 · FRAME 0: lightning on an engraved crypt wall; the 3D engraved skull in its tiara fills the frame.
// The whole insane fact is on screen within half a second: THEY PUT A / DEAD POPE / ON TRIAL. Then "He'd been dead for
// nine months" (2.21): DEAD FOR / 9 MONTHS (3.44). Exit: the camera dives into the left eye socket (4.05–4.25).
(function () {
  'use strict';
  FILM.scene({ id: 'hook', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const fl = D.flash(T, [0.0, 1.35, 3.42]);
    let punch = 0; for (const h of [0.0, 0.2, 0.4, 1.37, 2.82, 3.44]) { const d = T - h; if (d >= 0 && d < 0.3) punch = Math.max(punch, (1 - d / 0.3)); }
    const dive = L.ease.inCubic(L.clamp((T - 4.05) / 0.2));
    const EYE = [446, 1050];
    ctx.save();
    const z = 1 + 0.035 * punch + 6 * dive;
    ctx.translate(EYE[0], EYE[1]); ctx.scale(z, z); ctx.translate(-EYE[0], -EYE[1]);
    D.plate(ctx);
    const lit = D.lights([{ x: 880, y: 1520, r: 1300, k: 0.62 }, { x: 540, y: 700, r: 1100, k: 0.55 * fl }], 0.03);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.12, spacing: 6.5, width: 1.1, color: '#A89A8E', alpha: 0.8, seed: 11, density: (x, y) => lit(x, y) * 0.75, length: [30, 120] });
    for (let row = 0, y = 40; y < 1920; y += 118, row++) {
      L.inkPath(ctx, [[-10, y], [1090, y + 6]], { width: 3, color: '#000', seed: 200 + row, taper: 0 });
      for (let x = (row % 2) * 130 - 60; x < 1080; x += 260) L.inkPath(ctx, [[x, y], [x + 4, y + 118]], { width: 2.6, color: '#000', seed: 300 + row * 9 + x, taper: 0 });
    }
    D.rain(ctx, T, { n: 150, a: 0.22, seed: 2 });
    D.glow(ctx, 540, 1350, 900, C.candle, 0.3 + 0.3 * fl);
    const yaw = -0.42 + 0.5 * L.ease.inOutSine(L.clamp(t / 4.25)) + 0.04 * Math.sin(T * 1.7);
    const jaw = T > 1.3 && T < 1.9 ? 0.6 : T > 3.4 ? 0.25 + 0.5 * L.clamp((T - 3.4) / 0.12) : 0.15 + 0.12 * Math.max(0, Math.sin(T * 2.2));
    const em = L.clamp((T - 0.85) / 0.25);
    D.skull(ctx, 540, 1000, 800, { yaw, pitch: 0.1, roll: -0.04, jaw, ember: em * (0.85 + 0.15 * Math.sin(T * 13)), key: [-0.62 + 0.4 * fl, -0.32 + 0.6 * fl, 0.6] });
    D.candle(ctx, 880, 1560, 1.35, T, { seed: 3, h: 300 });
    D.rain(ctx, T + 3.1, { n: 70, a: 0.35, seed: 5 });
    D.mist(ctx, T, { y: 1720, h: 420, a: 0.35, speed: 40 });
    ctx.restore();
    D.grain(ctx, T, 1);
    if (dive > 0) { ctx.fillStyle = `rgba(0,0,0,${dive})`; ctx.fillRect(0, 0, 1080, 1920); }
    if (T < 2.15) {
      D.word(ctx, 'THEY PUT A', 540, 150, 76, (T - 0.0) / 0.12, { under: false, seed: 4 });
      D.word(ctx, 'DEAD POPE', 540, 280, 150, (T - 0.15) / 0.15, { seed: 5 });
      D.word(ctx, 'ON TRIAL.', 540, 430, 130, (T - 0.38) / 0.15, { color: '#E8443A', seed: 6 });
    } else {
      D.word(ctx, 'DEAD FOR', 540, 200, 96, (T - 2.21) / 0.15, { under: false, seed: 7 });
      D.word(ctx, '9 MONTHS', 540, 350, 170, (T - 3.44) / 0.14, { color: C.candle, seed: 8 });
    }
  } });
})();
