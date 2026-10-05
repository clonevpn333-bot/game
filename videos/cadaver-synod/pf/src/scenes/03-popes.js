// 03 · popes · T 5.25–9.0 · two stained-glass lancets in an engraved stone wall: STEPHEN VI (crimson) and FORMOSUS
// (blue). "hated" (7.16): the curiosity line becomes the crack, racing through the blue glass; "old one" (8.25): it
// shatters and the shards fly at the camera in 3D, edges leaded and catching light.
(function () {
  'use strict';
  const LW = [290, 1380, 380, 860], RW = [790, 1380, 380, 860];
  FILM.scene({ id: 'popes', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    let sh = 0; { const d = T - 8.25; if (d >= 0 && d < 0.4) sh = (1 - d / 0.4) * 24; }
    const rage = L.clamp((T - 7.1) / 0.3), broken = T >= 8.25;
    ctx.save(); ctx.translate(sh * Math.sin(T * 93), sh * Math.cos(T * 71));
    D.plate(ctx);
    const lit = D.lights([{ x: LW[0], y: 950, r: 700, k: 0.45 + 0.25 * rage }, { x: RW[0], y: 950, r: 700, k: broken ? 0.05 : 0.45 }], 0.04);
    L.hatch(ctx, null, { bounds: { x: 0, y: 0, w: 1080, h: 1920 }, angle: 0.1, spacing: 6, width: 1.1, color: '#9E928A', alpha: 0.8, seed: 21, density: (x, y) => lit(x, y) * 0.8 });
    for (let row = 0, y = 30; y < 1920; y += 96, row++) { L.inkPath(ctx, [[-10, y], [1090, y + 4]], { width: 2.6, color: '#000', seed: 400 + row, taper: 0 }); for (let x = (row % 2) * 110 - 40; x < 1080; x += 220) L.inkPath(ctx, [[x, y], [x + 3, y + 96]], { width: 2.2, color: '#000', seed: 500 + row * 7 + x, taper: 0 }); }
    // stone tracery frames (engraved)
    for (const Wd of [LW, RW]) { ctx.save(); D.lancet(ctx, Wd[0], Wd[1] + 30, Wd[2] + 80, Wd[3] + 70); ctx.fillStyle = '#0A0809'; ctx.fill(); ctx.restore(); }
    // light shafts on the floor (light only)
    const shaft = (W, col, a) => { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(0, W[1], 0, 1920); g.addColorStop(0, L.rgba(col, 0.3 * a)); g.addColorStop(1, L.rgba(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(W[0] - W[2] / 2, W[1]); ctx.lineTo(W[0] + W[2] / 2, W[1]); ctx.lineTo(W[0] + W[2] / 2 + 220, 1920); ctx.lineTo(W[0] - W[2] / 2 - 120, 1920); ctx.fill(); ctx.restore(); };
    shaft(LW, rage > 0 ? '#FF5A3A' : '#D8443A', 1 + rage);
    if (!broken) shaft(RW, '#4A6AE8', 1);
    D.glass(ctx, LW[0], LW[1], LW[2], LW[3], T, { seed: 3, tint: ['#B8282A', '#D9A441', '#7A1418', '#D85A2A'], glow: 1 + 0.4 * rage, fig: { robe: '#5A0A10' } });
    if (!broken) {
      D.glass(ctx, RW[0], RW[1], RW[2], RW[3], T, { seed: 4, tint: ['#3E62D8', '#7A44C0', '#2A4AA8', '#5A3AA0'], fig: { robe: '#141C5A' } });
      // the crack IS the curiosity line
      const ck = L.clamp((T - 7.16) / 0.95);
      if (ck > 0) {
        const r = L.rng(L.hash('crack'));
        const o0 = [RW[0] + 10, RW[1] - RW[3] * 0.5];
        for (let b = 0; b < 8; b++) { let x = o0[0], y = o0[1], a = (b / 8) * Math.PI * 2 + r(); const pts = [[x, y]]; for (let k = 0; k < 9; k++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 38; y += Math.sin(a) * 38; pts.push([x, y]); } FILM.hc.line(ctx, pts, { plate: 'blueprint', to: Math.max(0.02, L.clamp(ck * 1.3 - b * 0.04)), width: 4, seed: 30 + b, head: ck < 1 }); }
      }
    } else {
      ctx.save(); D.lancet(ctx, RW[0], RW[1], RW[2], RW[3]); ctx.fillStyle = '#040303'; ctx.fill(); ctx.restore();
      const d = T - 8.25, r = L.rng(L.hash('shards'));
      for (let i = 0; i < 64; i++) {
        const sx = RW[0] + (r() - 0.5) * RW[2], sy = RW[1] - r() * RW[3];
        const vz = 900 + r() * 1800, vx = (r() - 0.5) * 900, vy = -200 + r() * 300, z = vz * d, k = 900 / Math.max(120, 900 - z);
        if (k > 8) continue;
        const x = 540 + (sx - 540 + vx * d) * k, y = 1000 + (sy - 1000 + vy * d + 700 * d * d) * k;
        const sz = (14 + r() * 26) * k, rot = r() * 6 + d * (4 + r() * 8), sq = Math.max(0.15, Math.abs(Math.cos(d * (6 + r() * 6) + i)));
        const pts = [[-sz, -sz * 0.4], [sz * 0.8, -sz * 0.7], [sz * 0.3, sz]].map(([a, b]) => { const ca = Math.cos(rot), sa = Math.sin(rot); return [x + a * ca - b * sq * sa, y + a * sa + b * sq * ca]; });
        ctx.beginPath(); L.tracePath(ctx, pts, true); ctx.fillStyle = ['#3E62D8', '#7A44C0', '#2A4AA8', '#8AA8F8'][i % 4]; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1;
        L.inkPath(ctx, pts, { closed: true, width: 2.4, color: sq > 0.7 ? '#E8F0FF' : '#000', seed: 600 + i, smooth: false, taper: 0 });
      }
      D.glow(ctx, RW[0], RW[1] - RW[3] / 2, 700, '#9AB0FF', Math.max(0, 1 - d * 4));
    }
    D.mist(ctx, T, { y: 1760, h: 360, a: 0.3, speed: 30 });
    ctx.restore();
    D.grain(ctx, T, 1);
    const MONO = '"JetBrains Mono", monospace';
    L.text(ctx, 'STEPHEN VI', LW[0], 395, { size: 38, family: MONO, weight: 600, align: 'center', color: rage > 0 ? '#FF7A5A' : C.ivory, alpha: L.clamp((T - 5.6) / 0.2), tracking: '0.2em' });
    L.text(ctx, 'THE NEW POPE', LW[0], 445, { size: 24, family: MONO, weight: 600, align: 'center', color: C.candle, alpha: L.clamp((T - 5.75) / 0.2), tracking: '0.2em' });
    if (!broken) L.text(ctx, 'FORMOSUS · † 896', RW[0], 395, { size: 32, family: MONO, weight: 600, align: 'center', color: '#B8C8FF', alpha: L.clamp((T - 6.2) / 0.2), tracking: '0.16em' });
  } });
})();
