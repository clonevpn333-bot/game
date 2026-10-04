// 01 · rain-hook · T 0.00–3.00 · 3D (projected street) + a 2D red callout
// Layers: wet night street (sky plate, parapet, lamps, reflections, ripples) → the man walking toward camera →
// a red hand-drawn callout circles him on "murdered" → foreground umbrellas sweep past on "umbrella" → 3D rain.
(function () {
  'use strict';
  const ID = 'rain-hook';
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, M = FILM.mk;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      const c = M.cam({ x: -230, y: 150, z: T * 30, f: 1000, hz: 900 });
      M.street(ctx, T, c);
      // background pedestrians with open umbrellas, far
      [[-520, 1900, 0.2], [520, 2300, 0.9], [-380, 2800, 1.7]].forEach(([x, z, ph], i) => {
        const p = M.P3(c, x, 0, z - T * 40);
        if (!p) return;
        M.man(ctx, p[0], p[1], (175 * p[2]) / 685, T + ph, { rim: 0.4 });
        M.brolly(ctx, p[0], p[1] - 175 * p[2] * 1.02, p[2] * 0.75, { open: true });
      });
      // the man, walking toward us on the pavement
      const mz = 520 - T * 45;
      const mp = M.P3(c, -330, 0, mz);
      const ms = (180 * mp[2]) / 685;
      M.man(ctx, mp[0], mp[1], ms, T, { rim: 1 });
      // 2D: a red callout and a hand-lettered question as the narration says "murdered"
      const k = L.ease.outCubic(L.clamp((T - 1.0) / 0.45));
      if (k > 0) {
        M.callout(ctx, mp[0], mp[1] - 340 * ms, 330 * ms + 40, k, { color: P.hcRed, width: 5 });
        L.text(ctx, '?', mp[0] + 300 * ms + 46, mp[1] - 640 * ms, { size: 120, family: '"Fraunces", Georgia, serif', weight: 600, color: P.hcRed, alpha: k });
      }
      // foreground umbrellas sweeping across on "umbrella"
      const u = L.clamp((T - 1.9) / 1.0);
      if (u > 0 && u < 1) {
        const x = 1300 - u * 1700;
        ctx.save();
        ctx.filter = 'blur(3px)';
        M.brolly(ctx, x, 1500, 2.6, { open: true, fill: '#07090F', rot: -0.15 });
        ctx.restore();
      }
      M.rain(ctx, T, c, { n: 1000 });
      // the first frame of a mystery: a slow vignette
      const v = ctx.createRadialGradient(540, 900, 300, 540, 960, 1150);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(2,4,10,0.75)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, 1080, 1920);
    },
  });
})();
