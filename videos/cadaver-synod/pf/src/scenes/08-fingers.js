// 08 · fingers · T 18.5–21.25 · the engraved 3D skeletal hand raised in blessing, ring on. "three fingers" (19.57):
// I · II · III; the curiosity line draws the cut across the knuckles (19.85); the blade flashes (20.2) and the three
// fingers break away, tumbling in 3D.
(function () {
  'use strict';
  const HC = [560, 1200], HH = 1400;
  FILM.scene({ id: 'fingers', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t + FILM.SHIFT;
    const CUT = 20.2, cut = T >= CUT;
    let sh = 0; { const d = T - CUT; if (d >= 0 && d < 0.35) sh = (1 - d / 0.35) * 22; }
    ctx.save(); ctx.translate(sh * Math.sin(T * 97), sh * Math.cos(T * 83));
    D.plate(ctx);
    const lit = D.lights([{ x: 300, y: 1100, r: 1100, k: 0.42 }], 0.02);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: -0.2, spacing: 6.5, width: 1, color: '#9A8C80', alpha: 0.75, seed: 51, density: (x, y) => lit(x, y) * 0.65 });
    D.glow(ctx, 360, 1100, 800, C.candle, 0.3);
    const z = 1 + 0.04 * t + 0.16 * L.ease.inOutCubic(L.clamp((T - 19.3) / 0.6)) * (1 - L.clamp((T - 20.6) / 0.5));
    ctx.save(); ctx.translate(520, 760); ctx.scale(z, z); ctx.translate(-520, -760);
    const r = D.hand(ctx, HC[0], HC[1], HH, { cut, yaw: 0.25 + 0.05 * Math.sin(T), pitch: 0.05 });
    const knuck = [[-0.78, -0.12, 0.28], [-0.31, 0.58, 0.02], [0, 0.62, 0.02]].map((p) => r.proj(...p));
    const knuckP = knuck;
    const tipsP = [[-1.08, 0.62, 0.3], [-0.37, 1.86, 0.05], [0, 2.08, 0.05]].map((p) => r.proj(...p));
    const gl = L.clamp((T - 19.45) / 0.15) * (cut ? 0 : 1);
    if (gl > 0) tipsP.forEach(([x, y], i) => {
      const a = L.clamp((T - 19.5 - i * 0.14) / 0.12) * gl, kn = knuckP[i];
      L.inkPath(ctx, [kn, [x, y]], { width: 14, color: C.gold, alpha: 0.35 * a, seed: 75 + i, taper: [6, 6] });
      D.glow(ctx, x, y, 90, C.gold, a);
      FILM.mk.callout(ctx, x, y + 6, 48, a, { color: C.yellow, width: 5, seed: 70 + i });
      L.text(ctx, ['I', 'II', 'III'][i], x + [-58, -40, 40][i], y - 64, { size: 58, family: '"Fraunces", serif', weight: 700, align: 'center', color: C.yellow, alpha: a });
    });
    // the cut line: the curiosity line across the knuckles
    const cu = L.clamp((T - 19.85) / 0.3) * (1 - L.clamp((T - 20.35) / 0.2));
    if (cu > 0) FILM.hc.line(ctx, L.smoothPts([[knuck[0][0] - 120, knuck[0][1] + 40], knuck[0], knuck[1], knuck[2], [knuck[2][0] + 160, knuck[2][1] - 20]], false, 6), { plate: 'blueprint', to: Math.max(0.02, L.clamp((T - 19.85) / 0.3)), width: 5, seed: 61, alpha: cu });
    if (cut) {
      const d = T - CUT;
      knuck.forEach(([x, y], i) => { const vx = (i - 1) * 300 + 60, vy = -420 - i * 70; D.finger(ctx, x + vx * d, y - 160 + vy * d + 1700 * d * d, 260, { yaw: d * (3 + i), pitch: d * (5 + i * 2), roll: 0.4 * (i - 1) + d * (4 - i) * (i % 2 ? -1 : 1), slot: i }); });
      const rr = L.rng(L.hash('bonedust'));
      for (let i = 0; i < 40; i++) { const a = -Math.PI * (0.1 + rr() * 0.8), v = 200 + rr() * 500; L.inkPath(ctx, [[knuck[1][0] + Math.cos(a) * v * d, knuck[1][1] + Math.sin(a) * v * d + 600 * d * d], [knuck[1][0] + Math.cos(a) * v * d + 5, knuck[1][1] + Math.sin(a) * v * d + 600 * d * d + 3]], { width: 2.4, color: C.bone, alpha: Math.max(0, 0.9 - d), seed: 1700 + i, taper: 1 }); }
    }
    ctx.restore();
    const bd = (T - (CUT - 0.08)) / 0.16;
    if (bd > 0 && bd < 1.6) { const y = knuck[1][1], a = Math.max(0, 1 - (bd - 1) * 2), head = L.clamp(bd), tail = L.clamp(bd - 0.4); ctx.save(); ctx.globalCompositeOperation = 'lighter'; L.inkPath(ctx, [[L.lerp(-100, 1180, tail), y + 120 * tail - 60], [L.lerp(-100, 1180, head), y + 120 * head - 60]], { width: 14, color: '#F0F4FF', alpha: a, seed: 71, taper: [30, 4] }); ctx.restore(); }
    D.mist(ctx, T, { y: 1800, h: 300, a: 0.25 });
    ctx.restore();
    D.grain(ctx, T, 1);
    D.word(ctx, 'THE BLESSING', 540, 250, 92, (T - 19.45) / 0.18, { color: C.gold, under: false, seed: 12 });
    D.word(ctx, 'FINGERS', 540, 370, 120, (T - 19.6) / 0.18, { color: C.gold, seed: 13 });
  } });
})();
