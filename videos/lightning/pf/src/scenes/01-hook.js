// 01 · hook · T 0–3.0 · FRAME 1 IS MID-STRIKE. A jagged bolt is already slamming into his campaign hat, sparks bursting,
// his face lit cold-white from above, rain slashing, camera kicked. Then six more strikes accelerate into the word
// "seven" (FILM.STRIKES): each one a hard cut to a new angle on him, a new place behind him, a new year — the strike
// counter (kinetic ×1…×7) slams with each. 2.0–3.0: the seventh strike's afterglow, smoke curling off the hat.
(function () {
  'use strict';
  const SHOTS = [
    { yaw: 0.35, z: 1.1, cx: 560, cy: 1250, from: [180, -80], bg: 0, year: '1942' },
    { yaw: 1.2, z: 1.05, cx: 600, cy: 1170, from: [1000, -60], bg: 1, year: '1969' },
    { yaw: -0.5, z: 1.2, cx: 520, cy: 1320, from: [120, -60], bg: 2, year: '1970' },
    { yaw: 0.9, z: 0.95, cx: 560, cy: 1150, from: [900, -80], bg: 0, year: '1972' },
    { yaw: -1.1, z: 1.2, cx: 500, cy: 1230, from: [220, -60], bg: 1, year: '1973' },
    { yaw: 0.2, z: 1.3, cx: 540, cy: 1350, from: [700, -80], bg: 2, year: '1976' },
    { yaw: 0.55, z: 1.1, cx: 540, cy: 1190, from: [360, -100], bg: 0, year: '1977' },
  ];
  FILM.scene({ id: 'hook', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb, ST = FILM.STRIKES;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    let i = 0; for (let k = 0; k < ST.length; k++) if (T >= ST[k]) i = k;
    const sh = SHOTS[i], d = T - ST[i];
    const hitK = Math.exp(-d * 7);                         // strike intensity, decays
    PB.plate(ctx, { seed: 900 + i, color: '#070A16' });
    // the place behind him (silhouettes, lit by the flash): ridge / tower / house
    const flashLit = 0.15 + 0.55 * hitK;
    if (sh.bg === 0) PB.ridges(ctx, i * 300 + T * 60, T, { y: 1350, seed: i });
    if (sh.bg === 1) { PB.ridges(ctx, i * 300, T, { y: 1500, seed: i }); D.engrave(ctx, [[700, 1500], [760, 900], [820, 900], [880, 1500]], { ink: '#6A80A8', base: '#0A0E18', light: () => flashLit, angle: 1.2, spacing: 4, seed: 940, smooth: false, outW: 3, cross: false, stip: false }); D.engrave(ctx, L.rectPts(730, 820, 120, 90, 30), { ink: '#6A80A8', base: '#0A0E18', light: () => flashLit, spacing: 4, seed: 941, smooth: false, outW: 3, cross: false, stip: false }); }
    if (sh.bg === 2) { D.engrave(ctx, [[60, 1600], [60, 1250], [260, 1100], [460, 1250], [460, 1600]], { ink: '#6A80A8', base: '#0A0E18', light: () => flashLit, angle: 1.1, spacing: 4, seed: 950, smooth: false, outW: 3, cross: false, stip: false }); L.inkPath(ctx, [[900, 1600], [900, 900]], { width: 10, color: '#0A0E18', seed: 951, taper: 0 }); }
    PB.rain(ctx, T, { n: 180, a: 0.4 });
    // camera kick on every strike
    const kick = hitK * 18, z = sh.z * (1 + 0.04 * hitK) + 0.02 * d;
    ctx.save(); ctx.translate(sh.cx + Math.sin(T * 97) * kick, sh.cy + Math.cos(T * 83) * kick); ctx.scale(z, z); ctx.translate(-sh.cx, -sh.cy);
    // REAL 3D: the bolt comes down from the sky in his own space, wraps in depth around the hat; sparks fly through 3D
    const HO = { yaw: sh.yaw, hat: true, key: [-0.25, 0.55, 0.8], fill: [0.6, -0.2, 0.5], rim: [0.2, 0.9, -0.3], res: 0.3, slot: 1 + (i % 2), warm: [1.0 + 0.2 * hitK, 0.95 + 0.2 * hitK, 1.0 + 0.3 * hitK] };
    const P = PB.headProj(sh.cx, sh.cy, 700, HO), hit = [0.1, 1.28, -0.05], sky = [(sh.from[0] < 540 ? -1 : 1) * 2.2, 9, -2.5 + (i % 3)];
    const bk = d < 0.06 ? 1 : d < 0.12 ? 0.35 : d < 0.2 ? 0.85 : Math.max(0, 0.6 - (d - 0.2) * 3);
    const BO = { seed: 10 + i, k: bk, w: 0.055, branches: 5 }, SO = { seed: 20 + i, n: 46 };
    PB.fx.bolt3d(ctx, P, sky, hit, BO, 'back'); PB.fx.sparks3d(ctx, P, hit, d, SO, 'back');
    if (i === 6) PB.fx.smoke3d(ctx, P, hit, T, L.clamp(d / 0.3), 'back', 3);
    PB.head(ctx, sh.cx, sh.cy, 700, HO);
    PB.fx.bolt3d(ctx, P, sky, hit, BO, 'front'); PB.fx.sparks3d(ctx, P, hit, d, SO, 'front');
    if (i === 6) PB.fx.smoke3d(ctx, P, hit, T, L.clamp(d / 0.3), 'front', 3);
    const top = P(...hit);
    PB.burst(ctx, top[0], top[1], 260 * (0.6 + hitK), 0.9 * hitK + 0.2, '200,215,255');
    ctx.restore();
    const topS = [sh.cx + (top[0] - sh.cx) * z + Math.sin(T * 97) * kick, sh.cy + (top[1] - sh.cy) * z + Math.cos(T * 83) * kick];
    PB.flash(ctx, hitK * 0.55, sh.from[0], 0);
    PB.ambient(ctx, T, { seed: 1 + i });
    // the year, stamped in-world at the strike point
    PB.label(ctx, sh.year, topS[0] + 40, topS[1] + 30, Math.min(1, d / 0.05), { size: 30 });
  } });
})();
