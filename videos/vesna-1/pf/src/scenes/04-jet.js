// 04 · jet · T 9.0–11.0 · the point of light becomes the DC-9's beacon: JAT 367 at cruising height over Czechoslovakia,
// clouds sliding below, the moon behind; the camera eases in. 10.75–11.0 the music drops out and the cabin goes dark.
(function () {
  'use strict';
  FILM.scene({ id: 'jet', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    PB.plate(ctx, { seed: 111, color: '#0A1024' });
    const g = ctx.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, 'rgba(30,48,96,0.9)'); g.addColorStop(1, 'rgba(6,8,18,0.9)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
    // moon (engraved disc) + stars
    D.engrave(ctx, L.ellipsePts(820, 330, 90, 90, 40), { ink: '#F2E8D0', base: '#9AA4C0', light: (x, y) => L.clamp(0.9 - Math.hypot(x - 790, y - 300) / 200), angle: -0.6, spacing: 4, seed: 120, outW: 2, stip: false });
    PB.burst(ctx, 820, 330, 300, 0.25, '200,210,240');
    const rr = L.rng(L.hash('stars8')); for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(242,232,208,${0.3 + rr() * 0.5})`; ctx.fillRect(rr() * 1080, rr() * 900, 2, 2); }
    PB.clouds(ctx, T, { vx: -260, seed: 21, n: 8, alpha: 0.85, yOff: 500 });
    const push = 1 + 0.12 * L.ease.inOutSine(L.clamp((T - 9.0) / 2.0));
    const bob = 8 * Math.sin(T * 1.6);
    const jx = 600, jy = 900 + bob;
    const r = PB.jet(ctx, jx, jy, 92 * push, { yaw: -0.55, pitch: 0.22, roll: 0.04, key: [0.2, 0.9, 0.6], flat: 0.3, spacing: 4.5, res: 0.3, slot: 31 });
    // nav lights: red beacon on the tail blinks on the beat
    const bt = r.proj(-4.3, 2.35, 0), on = Math.floor((T - 9.0) / 0.5) % 2 === 0;
    if (on) PB.burst(ctx, bt[0], bt[1], 60, 0.9, '255,70,50');
    const wl = r.proj(0.2, -0.3, -4.3), wr = r.proj(0.2, -0.3, 4.3);
    PB.burst(ctx, wl[0], wl[1], 40, 0.7, '255,70,50'); PB.burst(ctx, wr[0], wr[1], 40, 0.7, '80,255,140');
    // in-world labels
    PB.label(ctx, 'JAT FLIGHT 367 · DC-9', 90, 1320, (T - 9.2) / 0.15, { size: 28 });
    PB.label(ctx, 'OVER CZECHOSLOVAKIA', 90, 1385, (T - 9.6) / 0.15, { size: 24, col: PB.IV });
    PB.alt(ctx, 790, 1350, 33330, { s: 0.75, alpha: L.clamp((T - 9.35) / 0.15) });
    const dark = L.clamp((T - 10.78) / 0.2);
    if (dark > 0) { ctx.fillStyle = `rgba(2,3,8,${0.55 * dark})`; ctx.fillRect(0, 0, 1080, 1920); }
  } });
})();
