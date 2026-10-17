// 08 · fish · T 26.5–30.75 · a mountain river; Roy fishing on a rock. STRIKE SEVEN (27.0) hits him on the bank
// (STRIKE #7 · 1977); then a black bear (engraved) lumbers in from the right (28.4) and goes for the trout in his creel
// (29.5); he swings a stick — THWACK (30.15) — the bear flinches back.
(function () {
  'use strict';
  function bear(ctx, L, D, x, y, s, ph, flinch, seed) {
    const P = (a, b) => [x + a * s, y + b * s];
    const bob = Math.sin(ph) * 6;
    for (const [lx, o] of [[-90, 0], [-50, Math.PI], [60, Math.PI / 2], [100, 3 * Math.PI / 2]]) { const a = Math.sin(ph + o) * 14; L.inkPath(ctx, [P(lx, -60 + bob), P(lx + a, 0)], { width: 30 * s, color: '#08080C', seed: seed + lx, taper: 0 }); }
    const body = []; for (let k = 0; k <= 30; k++) { const a = (k / 30) * Math.PI * 2; body.push(P(Math.cos(a) * 140, -110 + bob + Math.sin(a) * 70 - (Math.cos(a) < -0.5 ? 18 : 0))); }
    D.engrave(ctx, body, { ink: '#3A3440', base: '#06060A', light: () => 0.3, angle: 0.9, spacing: 3.5, seed: seed + 5, outW: 3, cross: false });
    const hx = -150 - flinch * 40, hy = -140 + bob - flinch * 20;
    const head = []; for (let k = 0; k <= 24; k++) { const a = (k / 24) * Math.PI * 2; head.push(P(hx + Math.cos(a) * 52, hy + Math.sin(a) * 44)); }
    D.engrave(ctx, head, { ink: '#3A3440', base: '#06060A', light: () => 0.35, angle: 0.7, spacing: 3, seed: seed + 6, outW: 3, cross: false });
    D.engrave(ctx, [P(hx - 40, hy - 6), P(hx - 86, hy + 4), P(hx - 86, hy + 22), P(hx - 40, hy + 26)], { ink: '#6A5A50', base: '#14100E', light: () => 0.4, spacing: 3, seed: seed + 7, smooth: false, outW: 2, cross: false, stip: false });
    for (const ex of [-20, 20]) L.inkCircle(ctx, P(hx + ex, hy - 40)[0], P(hx + ex, hy - 40)[1], 13 * s, { width: 2, color: '#000', fill: '#08080C', seed: seed + 8 + ex });
    ctx.fillStyle = '#F2E8D0'; ctx.beginPath(); ctx.arc(P(hx - 18, hy - 8)[0], P(hx - 18, hy - 8)[1], 3.5 * s, 0, 6.283); ctx.fill();
  }
  function trout(ctx, L, D, x, y, s, rot, seed) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
    D.engrave(ctx, [[-60, 0], [-30, -18], [30, -14], [55, 0], [30, 14], [-30, 18]], { ink: '#C8B888', base: '#3A3A2A', light: () => 0.6, spacing: 3, seed, outW: 2, cross: false, stip: false });
    D.engrave(ctx, [[-60, 0], [-84, -18], [-80, 18]], { ink: '#C8B888', base: '#3A3A2A', light: () => 0.6, spacing: 3, seed: seed + 1, smooth: false, outW: 2, cross: false, stip: false });
    ctx.restore();
  }
  FILM.scene({ id: 'fish', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, PB = FILM.pb;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t, d = T - 27.0;
    const fk = d >= 0 && d < 0.6 ? Math.exp(-d * 6) : 0;
    PB.plate(ctx, { seed: 980, color: '#0A0E1A' });
    PB.flash(ctx, fk * 0.6, 300, 0);
    PB.ridges(ctx, (T - 26.5) * 50, T, { y: 1150 });
    // river: engraved current lines streaming right
    D.engrave(ctx, [[-40, 1250], [1120, 1200], [1120, 1500], [-40, 1560]], { ink: '#5A7AB0', base: '#0E1830', light: () => 0.35 + fk * 0.4, angle: 0.03, spacing: 5, seed: 981, smooth: false, outW: 2, cross: false, stip: false });
    for (let k = 0; k < 14; k++) { const y = 1260 + (k % 7) * 40, x = ((k * 170 + (T - 26.5) * 260) % 1300) - 120; L.inkPath(ctx, [[x, y], [x + 90, y - 3]], { width: 3, color: '#B8D0F0', alpha: 0.6, seed: 990 + k, taper: [6, 20] }); }
    D.engrave(ctx, [[-40, 1520], [1120, 1460], [1120, 1960], [-40, 1960]], { ink: '#4A5A3A', base: '#0A100A', light: () => 0.2 + fk * 0.3, angle: 0.1, spacing: 6, seed: 982, smooth: false, outW: 2, cross: false, stip: false });
    // Roy on the bank: fishing → struck → swinging a stick at the bear
    const swing = L.clamp((T - 29.95) / 0.2), swingBack = L.clamp((T - 30.35) / 0.3);
    const pose = T > 29.6 ? 'swing' : 'fish';
    PB.ranger(ctx, 300, 1620, 1.75, { pose, swing: swing * (1 - swingBack * 0.6), lit: 0.3 + fk * 0.6 });
    // the creel with the trout
    const grab = L.ease.inOutCubic(L.clamp((T - 29.45) / 0.4)), drop = L.clamp((T - 30.2) / 0.3);
    // the bear lumbers in from the right
    const bin = L.ease.outCubic(L.clamp((T - 28.4) / 1.1)), flinch = L.clamp((T - 30.15) / 0.15) * (1 - L.clamp((T - 30.5) / 0.2) * 0.5);
    const bx = L.lerp(1500, 760, bin) + flinch * 140, by = 1640;
    if (bin > 0) bear(ctx, L, D, bx, by, 1.45, (T - 28.4) * 7 * (1 - flinch), flinch, 1000);
    const tx = L.lerp(480, bx - 300, grab * (1 - drop)), ty = L.lerp(1560, 1430, grab * (1 - drop)) + drop * 80;
    trout(ctx, L, D, tx, ty, 1.4, 0.2 + grab * 0.6, 1100);
    // THWACK
    const th = T - 30.15; if (th >= 0 && th < 0.3) { PB.burst(ctx, bx - 230, by - 230, 200, Math.exp(-th * 10), '255,240,200'); PB.rays(ctx, bx - 230, by - 230, 20, 180, 12, Math.exp(-th * 8), 7, '#F2C230', T); }
    // strike seven
    if (d >= 0 && d < 0.4) { PB.bolt(ctx, [140, -60], [300, 1180], { seed: 130, k: d < 0.08 ? 1 : Math.max(0, 0.7 - d * 2), w: 11, branches: 5 }); PB.burst(ctx, 300, 1200, 420, Math.exp(-d * 6), '210,225,255'); }
    if (d >= 0.05) { PB.label(ctx, '1977', 80, 1410, (d - 0.05) / 0.08, { size: 34 }); PB.label(ctx, 'STRIKE #7', 290, 1410, (d - 0.1) / 0.08, { size: 34 }); }
    PB.rain(ctx, T, { n: 120, a: 0.25, seed: 10 });
  } });
})();
