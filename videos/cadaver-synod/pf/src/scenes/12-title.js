// 12 · title · T 28.0–32.5 · an illuminated manuscript on a candle-lit desk: the page flips over in 3D (28.0–28.45),
// the blackletter title inks itself in ("Cadaver Synod" 29.14), then the camera pushes into the miniature of the
// trial on "a corpse was put on trial" (30.4 →).
(function () {
  'use strict';
  const PG = [140, 360, 800, 1160]; // page rect x, y, w, h
  function page(ctx, L, D, C, T) {
    const [x, y, w, h] = PG;
    ctx.fillStyle = '#D9C9A0'; ctx.fillRect(x, y, w, h);
    L.hatch(ctx, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { angle: 0.1, spacing: 9, width: 1, color: '#7A6A4A', alpha: 0.18, seed: 51 });
    const v = ctx.createRadialGradient(x + w / 2, y + h / 2, 200, x + w / 2, y + h / 2, 760); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(60,30,10,0.55)');
    ctx.fillStyle = v; ctx.fillRect(x, y, w, h);
    // border vines
    ctx.strokeStyle = '#7A1A14'; ctx.lineWidth = 6; ctx.strokeRect(x + 30, y + 30, w - 60, h - 60);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.strokeRect(x + 44, y + 44, w - 88, h - 88);
    for (let k = 0; k < 14; k++) { const yy = y + 80 + k * 76; ctx.fillStyle = k % 2 ? '#2E56C8' : '#A11F22'; ctx.beginPath(); ctx.arc(x + 37, yy, 8, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x + w - 37, yy, 8, 0, Math.PI * 2); ctx.fill(); }
    // gold drop cap C
    ctx.fillStyle = '#A11F22'; ctx.fillRect(x + 80, y + 80, 190, 210);
    ctx.strokeStyle = C.gold; ctx.lineWidth = 5; ctx.strokeRect(x + 80, y + 80, 190, 210);
    L.text(ctx, 'C', x + 175, y + 190, { size: 200, family: '"UnifrakturMaguntia", serif', weight: 400, align: 'center', baseline: 'middle', color: '#F2D27A' });
    // title (inks in left → right)
    const u = L.clamp((T - 29.0) / 0.8);
    ctx.save(); ctx.beginPath(); ctx.rect(x + 290, y + 70, (w - 330) * u, 240); ctx.clip();
    L.text(ctx, 'adaver', x + 290, y + 170, { size: 104, family: '"UnifrakturMaguntia", serif', weight: 400, color: '#1A0E08' });
    L.text(ctx, 'Synod', x + 300, y + 285, { size: 104, family: '"UnifrakturMaguntia", serif', weight: 400, color: '#7A1A14' });
    ctx.restore();
    L.text(ctx, 'Anno Domini DCCCXCVII', x + w / 2, y + 370, { size: 40, family: '"Cinzel", serif', weight: 700, align: 'center', color: '#3A2412', alpha: L.clamp((T - 29.7) / 0.3), tracking: '0.08em' });
    // the miniature
    const mx = x + 110, my = y + 420, mw = w - 220, mh = 640;
    ctx.save(); ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
    const g = ctx.createLinearGradient(0, my, 0, my + mh); g.addColorStop(0, '#1E2A6A'); g.addColorStop(1, '#0A0E2A'); ctx.fillStyle = g; ctx.fillRect(mx, my, mw, mh);
    for (let k = 0; k < 40; k++) { ctx.fillStyle = 'rgba(242,210,122,0.8)'; ctx.beginPath(); ctx.arc(mx + ((k * 97) % mw), my + ((k * 53) % 200), 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#5A3A20'; ctx.fillRect(mx, my + mh - 120, mw, 120);
    D.corpse(ctx, mx + mw * 0.42, my + mh - 80, 0.42, T, { ember: 0.5 });
    D.figure(ctx, mx + mw * 0.82, my + mh - 40, 0.5, T, { pose: 'point', hat: 'mitre', flip: true, fill: '#3A0A0C', rim: C.gold });
    D.figure(ctx, mx + mw * 0.12, my + mh - 40, 0.42, T, { pose: 'pray', hat: 'hood', fill: '#1A1410', rim: C.gold, tremble: 0.5 });
    ctx.restore();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 8; ctx.strokeRect(mx, my, mw, mh);
  }
  FILM.scene({ id: 'title', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    // desk
    const g = ctx.createLinearGradient(0, 0, 0, 1920); g.addColorStop(0, '#1A0E08'); g.addColorStop(1, '#060302'); ctx.fillStyle = g; ctx.fillRect(0, 0, 1080, 1920);
    L.hatch(ctx, [[0, 0], [1080, 0], [1080, 1920], [0, 1920]], { angle: 0.05, spacing: 10, width: 1.2, color: '#000', alpha: 0.4, seed: 52 });
    D.glow(ctx, 900, 1500, 900, C.candle, 0.6);
    // push into the miniature from 30.4
    const push = L.ease.inOutCubic(L.clamp((T - 30.4) / 1.9));
    const z = 0.92 + 1.15 * push;
    ctx.save(); ctx.translate(540, L.lerp(960, 1180, push)); ctx.scale(z, z); ctx.translate(-540, -960);
    // 3D page flip: the previous page turns over the spine (left edge) during 28.0–28.45
    const fp = L.ease.inOutCubic(L.clamp((T - 28.0) / 0.45));
    page(ctx, L, D, C, T);
    if (fp < 1) {
      const ang = fp * Math.PI, cw = Math.cos(ang), [x, y, w, h] = PG;
      const wx = w * cw, lift = Math.sin(ang) * 90;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + wx, y - lift); ctx.lineTo(x + wx, y + h + lift); ctx.lineTo(x, y + h); ctx.closePath();
      const pg = ctx.createLinearGradient(x, 0, x + Math.abs(wx) + 1, 0); pg.addColorStop(0, '#B8A880'); pg.addColorStop(1, cw > 0 ? '#E6D8B0' : '#8A7A58');
      ctx.fillStyle = pg; ctx.fill(); ctx.strokeStyle = '#5A4A2A'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    D.candle(ctx, 960, 1560, 1.0, T, { seed: 7, h: 200 });
    D.grain(ctx, T, 1);
  } });
})();
