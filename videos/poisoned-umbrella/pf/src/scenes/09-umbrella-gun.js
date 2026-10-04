// 09 · umbrella-gun · T 30.50–33.00 · hybrid: a lathe-modelled 3D umbrella (rolling about its axis, perspective
// stations) with a 2D X-ray cutaway: barrel along the shaft, the pellet at the ferrule, a spring + trigger in the
// handle. The pellet circle from the board becomes the pellet at the tip; on "gun" (32.44) it fires along the line.
(function () {
  'use strict';
  const ID = 'umbrella-gun';
  const TIP = [240, 1300], HANDLE = [860, 380];
  // profile: radius along the shaft (u 0 = tip, 1 = top of the furled canopy)
  const prof = (u) => (u < 0.02 ? 6 : u < 0.12 ? 6 + (u - 0.02) * 400 : u < 0.8 ? 46 - (u - 0.12) * 20 : 32);
  FILM.scene({
    id: ID,
    draw(ctx, tIn, info) {
      const L = info.lib, P = L.pal, M = FILM.mk, HC = FILM.hc;
      const t = L.clamp(tIn, 0, info.dur);
      const T = info.shot.start + t;
      L.blueprint(ctx, { color: P.hcNavyDeep, seed: 91, center: [560, 860], circles: 4 });
      const roll = T * 2.2;
      const ax = [HANDLE[0] - TIP[0], HANDLE[1] - TIP[1]];
      const len = Math.hypot(ax[0], ax[1]);
      const d = [ax[0] / len, ax[1] / len], n = [-d[1], d[0]];
      const build = L.ease.outCubic(L.clamp((T - 30.5) / 0.45));
      // canopy body: stations with rolling fold stripes (the folds wrap around the axis → reads as 3D)
      const U1 = 0.8;
      const left = [], right = [];
      for (let u = 0; u <= U1; u += 0.01) {
        const p = [TIP[0] + ax[0] * u, TIP[1] + ax[1] * u];
        const r = prof(u) * (0.98 + 0.04 * Math.sin(u * 40));
        left.push([p[0] + n[0] * r, p[1] + n[1] * r]);
        right.push([p[0] - n[0] * r, p[1] - n[1] * r]);
      }
      const body = left.concat(right.slice().reverse());
      ctx.save();
      ctx.globalAlpha = build;
      L.tracePath(ctx, body, true);
      ctx.fillStyle = L.rgba(P.xray, 0.14);
      ctx.fill();
      ctx.save(); ctx.clip();
      for (let k = 0; k < 10; k++) {
        const ph = roll + (k / 10) * Math.PI * 2;
        const s = Math.sin(ph);
        if (Math.cos(ph) < 0) continue;
        ctx.strokeStyle = L.rgba(P.xray, 0.35 * Math.cos(ph));
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let u = 0.03; u <= U1; u += 0.02) {
          const p = [TIP[0] + ax[0] * u, TIP[1] + ax[1] * u];
          const r = prof(u) * s;
          const twist = Math.sin(u * 9 + roll) * 4;
          const q = [p[0] + n[0] * (r + twist), p[1] + n[1] * (r + twist)];
          if (u < 0.04) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]);
        }
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = L.rgba(P.lineWhite, 0.9); ctx.lineWidth = 2.5;
      L.tracePath(ctx, body, true); ctx.stroke();
      // shaft above the canopy + the crook handle
      const top = [TIP[0] + ax[0] * U1, TIP[1] + ax[1] * U1];
      const hk = [HANDLE[0], HANDLE[1]];
      ctx.lineWidth = 12; ctx.strokeStyle = L.rgba(P.lineWhite, 0.85);
      ctx.beginPath(); ctx.moveTo(top[0], top[1]); ctx.lineTo(hk[0], hk[1]); ctx.stroke();
      ctx.beginPath(); ctx.arc(hk[0] + n[0] * 50, hk[1] + n[1] * 50, 50, Math.atan2(-n[1], -n[0]), Math.atan2(-n[1], -n[0]) + Math.PI * 1.1); ctx.stroke();
      ctx.restore();
      // X-ray internals (2D): barrel, pellet, spring, trigger
      const xr = L.clamp((T - 30.9) / 0.4);
      if (xr > 0) {
        ctx.save();
        ctx.globalAlpha = xr;
        const at = (u, o = 0) => [TIP[0] + ax[0] * u + n[0] * o, TIP[1] + ax[1] * u + n[1] * o];
        ctx.strokeStyle = P.hcCyan; ctx.lineWidth = 3;
        [[-7], [7]].forEach(([o]) => { const a = at(0.0, o), b = at(0.95, o); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
        // spring in the handle
        ctx.beginPath();
        for (let k = 0; k <= 60; k++) { const u = 0.84 + (k / 60) * 0.1; const p = at(u, Math.sin(k * 1.2) * 16); if (k) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }
        ctx.stroke();
        // trigger lever
        const tg = at(0.9, 30);
        L.inkPath(ctx, [tg, [tg[0] + n[0] * 50 + d[0] * 20, tg[1] + n[1] * 50 + d[1] * 20]], { width: 6, color: P.hcYellow, seed: 30 });
        ctx.restore();
        M.label(ctx, 'BARREL', at(0.45, -90)[0], at(0.45, -90)[1], { size: 24, alpha: L.clamp((T - 31.1) / 0.2) });
        M.label(ctx, 'SPRING · TRIGGER', at(0.86, 110)[0] - 220, at(0.86, 110)[1] + 40, { size: 22, alpha: L.clamp((T - 31.5) / 0.2) });
      }
      // the pellet: at the ferrule until "gun", then it flies out along the curiosity line
      const fire = 32.44;
      const shot = L.clamp((T - fire) / 0.5);
      const path = L.smoothPts([[TIP[0], TIP[1]], [TIP[0] - 80, TIP[1] + 80], [120, 1600], [40, 1760]], false, 6);
      const ppos = T < fire ? [TIP[0] + d[0] * 6, TIP[1] + d[1] * 6] : FILM.hc.headAt(path, L.ease.outCubic(shot));
      if (T >= fire) {
        HC.line(ctx, path, { plate: 'blueprint', to: Math.max(0.02, L.ease.outCubic(shot)), width: 4, head: false, seed: 31 });
        const pf = L.clamp(1 - (T - fire) / 0.25);
        if (pf > 0) L.glowDot(ctx, TIP[0], TIP[1], 16, { color: P.hcYellow, rays: 14, rayLen: 5, intensity: pf });
      }
      L.inkCircle(ctx, ppos[0], ppos[1], 13, { width: 2, color: P.lineWhite, seed: 32, fill: P.platinum });
      M.callout(ctx, TIP[0], TIP[1], 46, L.clamp((T - 31.3) / 0.3) * (T < fire ? 1 : 0), { color: P.hcYellow, width: 4, seed: 33 });
      if (T < fire) M.label(ctx, 'PELLET', TIP[0] + 60, TIP[1] + 20, { size: 24, alpha: L.clamp((T - 31.35) / 0.2) });
    },
  });
})();
