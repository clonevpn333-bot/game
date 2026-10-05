// 03 · popes · T 5.25–9.0 · two stained-glass windows: STEPHEN VI (crimson, alive) and FORMOSUS (blue, dead).
// "hated" (7.16) → Stephen's window flares red and cracks race across Formosus's glass; "old one" (8.21) → it shatters
// and the shards fly at the camera in 3D.
(function () {
  'use strict';
  const LW = [290, 1380, 380, 860], RW = [790, 1380, 380, 860];
  const figure = (mitre, col) => (g, x, y, w, h) => {
    g.fillStyle = col;
    g.beginPath(); g.moveTo(x - 110, y - 40); g.lineTo(x - 70, y - h * 0.55); g.lineTo(x + 70, y - h * 0.55); g.lineTo(x + 110, y - 40); g.closePath(); g.fill();
    g.beginPath(); g.arc(x, y - h * 0.62, 48, 0, Math.PI * 2); g.fill();
    if (mitre) { g.beginPath(); g.moveTo(x - 44, y - h * 0.66); g.lineTo(x - 36, y - h * 0.78); g.lineTo(x, y - h * 0.84); g.lineTo(x + 36, y - h * 0.78); g.lineTo(x + 44, y - h * 0.66); g.fill(); }
    g.strokeStyle = 'rgba(255,220,150,0.8)'; g.lineWidth = 8; g.beginPath(); g.arc(x, y - h * 0.62, 78, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
  };
  FILM.scene({ id: 'popes', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    let sh = 0; { const d = T - 8.25; if (d >= 0 && d < 0.4) sh = (1 - d / 0.4) * 26; }
    ctx.save(); ctx.translate(sh * Math.sin(T * 93), sh * Math.cos(T * 71));
    D.bg(ctx, { top: '#120C14', bottom: '#060407' });
    // masonry
    ctx.strokeStyle = 'rgba(80,70,90,0.35)'; ctx.lineWidth = 2;
    for (let y = 0, row = 0; y < 1920; y += 70, row++) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1080, y); ctx.stroke(); for (let x = (row % 2) * 70; x < 1080; x += 140) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 70); ctx.stroke(); } }
    const rage = L.clamp((T - 7.1) / 0.3);
    const crack = L.clamp((T - 7.16) / 0.95);
    const broken = T >= 8.25;
    // light shafts onto the floor
    D.shaft(ctx, [[LW[0] - 190, LW[1]], [LW[0] + 190, LW[1]], [LW[0] + 420, 1920], [LW[0] - 260, 1920]], rage > 0 ? '#FF4A2A' : '#C83A2A', 0.8 + 0.6 * rage);
    if (!broken) D.shaft(ctx, [[RW[0] - 190, RW[1]], [RW[0] + 190, RW[1]], [RW[0] + 300, 1920], [RW[0] - 380, 1920]], '#4A6AE0', 0.8);
    D.glass(ctx, LW[0], LW[1], LW[2], LW[3], { seed: 3, tint: ['#A11F22', '#D9A441', '#6A0E12', '#C2492A'], glow: 1 + 0.5 * rage, fig: figure(true, '#2A0608') });
    if (!broken) D.glass(ctx, RW[0], RW[1], RW[2], RW[3], { seed: 4, tint: ['#2B4BB8', '#5B2A8A', '#1E5A8A', '#3A2A7A'], crack, fig: figure(true, '#0C1030') });
    else {
      // empty frame + 3D shards flying toward the camera
      D.lancet(ctx, RW[0], RW[1], RW[2], RW[3]); ctx.fillStyle = '#050407'; ctx.fill(); ctx.strokeStyle = '#1A1418'; ctx.lineWidth = 22; ctx.stroke();
      const d = T - 8.25, r = L.rng(L.hash('shards'));
      for (let i = 0; i < 60; i++) {
        const sx = RW[0] + (r() - 0.5) * RW[2], sy = RW[1] - r() * RW[3];
        const vz = 900 + r() * 1800, vx = (r() - 0.5) * 900, vy = -200 + r() * 300;
        const z = vz * d, k = 900 / Math.max(120, 900 - z);
        if (k > 9) continue;
        const x = 540 + (sx - 540 + vx * d) * k, y = 1000 + (sy - 1000 + vy * d + 700 * d * d) * k;
        const sz = (14 + r() * 26) * k, rot = r() * 6 + d * (4 + r() * 8), sq = Math.cos(d * (6 + r() * 6) + i);
        const col = ['#2B4BB8', '#5B2A8A', '#1E5A8A', '#7A9AF0'][i % 4];
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, Math.max(0.15, Math.abs(sq)));
        ctx.fillStyle = col; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(-sz, -sz * 0.4); ctx.lineTo(sz * 0.8, -sz * 0.7); ctx.lineTo(sz * 0.3, sz); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(230,240,255,0.9)'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      }
      const f = Math.max(0, 1 - d * 4);
      if (f > 0) D.glow(ctx, RW[0], RW[1] - RW[3] / 2, 700, '#9AB0FF', f);
    }
    D.fog(ctx, T, { y: 1700, h: 500, a: 0.3, speed: 30 });
    ctx.restore();
    D.grain(ctx, T, 1);
    const L1 = L.clamp((T - 5.6) / 0.2), L2 = L.clamp((T - 6.0) / 0.2);
    D.stamp(ctx, 'STEPHEN VI', LW[0], 380, 58, T - 5.72, { color: rage > 0 ? '#FF6A4A' : C.bone, blur: 18 });
    if (T < 8.25) D.stamp(ctx, 'FORMOSUS', RW[0], 380, 58, T - 6.2, { color: '#AFC0FF', blur: 18, glowCol: 'rgba(80,110,255,0.7)' });
    L.text(ctx, '† 896', RW[0], 450, { size: 30, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: '#AFC0FF', alpha: L2 * (T < 8.25 ? 1 : 0), tracking: '0.3em' });
    L.text(ctx, 'THE NEW POPE', LW[0], 450, { size: 30, family: '"JetBrains Mono", monospace', weight: 600, align: 'center', color: C.candle, alpha: L1, tracking: '0.2em' });
  } });
})();
