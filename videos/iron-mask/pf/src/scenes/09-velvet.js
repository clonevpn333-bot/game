// 09 · velvet · T 28.8–33.6 · the twist. The 3D mask close: IRON labelled (30.7), struck out in red on "never iron" (31.9);
// then the mask turns to black velvet in one sweep (32.45–33.2) and BLACK VELVET lands (32.9).
(function () {
  'use strict';
  FILM.scene({ id: 'velvet', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t + FILM.OFF2;
    D.plate(ctx);
    const lit = D.lights([{ x: 200, y: 900, r: 1300, k: 0.45 }], 0.03);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.12, spacing: 6.5, width: 1, color: '#A8A0B0', alpha: 0.7, seed: 81, density: (x, y) => lit(x, y) * 0.6 });
    const vel = L.ease.inOutCubic(L.clamp((T - 32.45) / 0.75));
    const z = 1 + 0.08 * L.ease.inOutSine(t / info.dur);
    ctx.save(); ctx.translate(540, 900); ctx.scale(z, z); ctx.translate(-540, -900);
    const r = D.bust(ctx, 540, 860, 860, { yaw: 0.22 - 0.1 * t / info.dur, pitch: 0.05, velvet: vel, slot: 4, res: 0.36 });
    if (vel > 0 && vel < 1) { const sy = 860 - 1.3 * 410 + 2.7 * 410 * vel; ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, sy - 50, 0, sy + 50); g.addColorStop(0, 'rgba(180,160,230,0)'); g.addColorStop(0.5, 'rgba(180,160,230,0.5)'); g.addColorStop(1, 'rgba(180,160,230,0)'); ctx.fillStyle = g; ctx.fillRect(160, sy - 50, 760, 100); ctx.restore(); }
    ctx.restore();
    D.grain(ctx, T, 1);
    // IRON — then struck through
    const ia = L.clamp((T - 30.65) / 0.2) * (1 - L.clamp((T - 32.4) / 0.2));
    if (ia > 0) {
      L.text(ctx, 'IRON', 540, 300, { size: 150, family: '"Fraunces", serif', weight: 700, align: 'center', baseline: 'middle', color: '#C8D0DC', alpha: ia });
      const s = L.clamp((T - 31.86) / 0.2);
      if (s > 0) L.inkPath(ctx, [[340, 310], [340 + 400 * s, 292]], { width: 12, color: '#E8352C', alpha: ia, seed: 91, taper: [6, 6] });
    }
    D.word(ctx, 'BLACK VELVET', 540, 300, 120, (T - 32.9) / 0.2, { color: C.yellow, seed: 19 });
  } });
})();
