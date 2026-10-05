// 01 · hook · T 0–3.5 · FRAME 0: lightning — a skull in a papal tiara fills the frame, lit from below by a candle,
// rain across it. Camera punches out from frame 0. "dead" (1.11) → embers ignite in the sockets + DEAD stamps;
// "nine months" (1.59) → 9 MONTHS; "trial" (3.26) → a crimson ON TRIAL slams with a second strike.
(function () {
  'use strict';
  FILM.scene({ id: 'hook', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const fl = D.flash(T, [0.0, 0.62, 3.24]);
    let sh = 0; for (const h of [0.0, 1.11, 3.26]) { const d = T - h; if (d >= 0 && d < 0.3) sh = Math.max(sh, (1 - d / 0.3) * 22); }
    D.bg(ctx, { top: '#160C14', bottom: '#040305' });
    if (fl > 0) { const lg = ctx.createRadialGradient(540, 700, 100, 540, 800, 1300); lg.addColorStop(0, `rgba(210,220,255,${0.9 * fl})`); lg.addColorStop(1, `rgba(120,110,160,${0.4 * fl})`); ctx.fillStyle = lg; ctx.fillRect(0, 0, 1080, 1920); }
    D.rain(ctx, T, { n: 160, a: 0.25, seed: 2 });
    const z = 1.0 + 0.5 * Math.pow(1 - L.clamp(t / 0.35), 3) + 0.05 * (t / info.dur);
    ctx.save();
    ctx.translate(540 + sh * Math.sin(T * 91), 860 + sh * Math.cos(T * 77)); ctx.scale(z, z); ctx.translate(-540, -860);
    D.glow(ctx, 540, 1450, 900, C.candle, 0.6); D.glow(ctx, 900, 700, 700, '#A11F22', 0.35);
    const em = L.clamp((T - 1.05) / 0.25);
    const yaw = -0.42 + 0.5 * L.ease.inOutSine(L.clamp(t / 3.5)) + 0.04 * Math.sin(T * 1.7);
    const jaw = T > 3.2 ? 0.25 + 0.55 * L.clamp((T - 3.2) / 0.12) : 0.15 + 0.12 * Math.max(0, Math.sin(T * 2.2));
    D.skull3d(ctx, 540, 1010, 800, { yaw, pitch: 0.1, roll: -0.04, jaw, ember: em * (0.85 + 0.15 * Math.sin(T * 13)) });
    ctx.restore();
    D.candle(ctx, 880, 1560, 1.4, T, { seed: 3, h: 300 });
    D.rain(ctx, T + 3.1, { n: 90, a: 0.4, seed: 5 });
    D.fog(ctx, T, { y: 1650, h: 520, a: 0.35, speed: 40 });
    D.grain(ctx, T, 1);
    // stamped words
    if (T < 1.11) D.stamp(ctx, 'THIS POPE', 540, 230, 130, T - 0.12, { color: C.bone, glowCol: 'rgba(255,70,30,0.8)' });
    const off = T < 3.26 ? 1 : 0;
    D.stamp(ctx, 'DEAD', 540, 230, 190, T - 1.11, { color: C.bone, glowCol: 'rgba(255,70,30,0.8)', alpha: off });
    D.stamp(ctx, '9 MONTHS', 540, 390, 96, T - 1.62, { color: C.candle, tracking: '0.12em', alpha: off });
    D.stamp(ctx, 'ON TRIAL', 540, 300, 170, T - 3.26, { color: '#E0302A', stroke: '#FFB89A', rot: -0.03 });
  } });
})();
