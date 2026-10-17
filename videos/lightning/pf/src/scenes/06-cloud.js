// 06 · cloud · T 17.25–23.75 · the 1973 story, wide. A dark cloud gathers over the road (17.3–18.7); he drives away
// (18.9) — the truck races left, the cloud slides after it (19.77 IT FOLLOWED HIM); 21.0 the truck stops, the door swings,
// he steps out (21.4–22.3); 22.6 silence — everything holds — 23.0 THE BOLT, whiteout, STRIKE #5 · 1973.
(function () {
  'use strict';
  FILM.scene({ id: 'cloud', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const drive = L.clamp((T - 18.9) / 2.1), cam = 900 * L.ease.inOutSine(drive);
    const bolt = T - 23.0, bk = bolt >= 0 && bolt < 0.6 ? Math.exp(-bolt * 6) : 0;
    PB.plate(ctx, { seed: 960, color: '#080B18' });
    PB.flash(ctx, bk * 0.7 + 0.12 * Math.max(0, Math.sin(T * 3.3)) ** 8, 540, 0);
    PB.ridges(ctx, cam, T, { y: 1300 });
    D.engrave(ctx, [[-40, 1560], [1120, 1520], [1120, 1700], [-40, 1740]], { ink: '#5A6488', base: '#14182A', light: () => 0.3 + bk * 0.5, angle: 0.03, spacing: 6, seed: 961, smooth: false, outW: 3, cross: false, stip: false });
    for (let k = 0; k < 10; k++) { const x = ((k * 200 + cam * 1.1) % 2000 + 2000) % 2000 - 200; L.inkPath(ctx, [[x, 1636], [x + 80, 1634]], { width: 6, color: '#E6D27A', alpha: 0.8, seed: 970 + k, taper: 0 }); }
    // the cloud: gathers, then follows (stays over the truck as the world scrolls)
    const gather = L.ease.outCubic(L.clamp((T - 17.25) / 1.4));
    const cw = L.lerp(600, 1500, gather), cx = 560 + 40 * Math.sin(T * 1.7), cy = L.lerp(650, 900, gather);
    PB.storm(ctx, cx, cy, cw, T, { glow: bk + 0.25 * Math.max(0, Math.sin(T * 5.1)) ** 12, seed: 4 });
    // the truck — parked, then driving (wheels roll as the road scrolls), then stopped with the door open
    const stopped = T > 21.0, door = L.clamp((T - 21.2) / 0.3);
    PB.truck(ctx, 500, 1660, 2.0, { roll: cam * 1.1, flip: true, lights: drive > 0 && !stopped, door: stopped ? door : 0 });
    // he steps out and stands in the road — a real 3D figure; THE BOLT comes down in his space and wraps his hat
    if (T > 21.35) {
      const st = L.ease.outCubic(L.clamp((T - 21.35) / 0.9)), fx = L.lerp(620, 800, st), H = 600;
      const pose = bolt >= 0 ? PB.pose.struck(L.clamp(bolt / 0.15) * Math.exp(-Math.max(0, bolt - 0.3) * 2)) : st < 1 ? PB.pose.walk((T - 21.35) * 7) : PB.pose.stand();
      const BOO = { yaw: st < 1 ? 1.1 : 0.5 + 0.2 * L.clamp((T - 22.3) / 0.3), slot: 43, warm: [1 + bk, 1 + bk, 1 + 1.2 * bk] };
      const P = PB.bodyProj(fx, 1700, H, BOO), hat = [0, 1.66, 0.02], BO = { seed: 99, k: bolt < 0.08 ? 1 : Math.max(0, 0.75 - bolt * 1.8), w: 0.14, branches: 7 }, sky = [-2.5, 9, -3];
      const lay = (Lr) => { if (bolt >= 0 && bolt < 0.45) PB.fx.bolt3d(ctx, P, sky, hat, BO, Lr); PB.fx.sparks3d(ctx, P, hat, bolt, { seed: 9, n: 70 }, Lr); };
      lay('back'); PB.body(ctx, fx, 1700, H, pose, BOO); lay('front');
      if (bolt >= 0 && bolt < 0.45) { const q = P(...hat); PB.burst(ctx, q[0], q[1], 460, Math.exp(-bolt * 5), '210,225,255'); }
    }
    if (bolt >= 0 && bolt < 0.07) { ctx.fillStyle = 'rgba(240,244,255,0.85)'; ctx.fillRect(0, 0, 1080, 1920); }
    if (bolt >= 0.1) { PB.label(ctx, '1973', 80, 1310, (bolt - 0.1) / 0.08, { size: 34 }); PB.label(ctx, 'STRIKE #5', 80, 1380, (bolt - 0.15) / 0.08, { size: 28, col: PB.IV }); }
    // the silence beat: the rain stops falling (freeze), 22.6–23.0
    const frz = T >= 22.6 && T < 23.0;
    PB.rain(ctx, frz ? 22.6 : T, { n: 200, a: 0.35, seed: 6 });
    if (!frz) PB.ambient(ctx, T, { ground: 1740, seed: 6, flash: false });
  } });
})();
