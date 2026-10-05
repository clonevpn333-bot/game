// 09 · tiber · T 21.25–23.0 · from the bridge: the moonlit Tiber in perspective, Rome low on the horizon. The shrouded
// body drops away from camera, turning, and splashes on "river" (22.54).
(function () {
  'use strict';
  FILM.scene({ id: 'tiber', draw(ctx, tIn, info) {
    const L = info.lib, D = FILM.df, C = D.C;
    const t = L.clamp(tIn, 0, info.dur), T = info.shot.start + t;
    const HZ = 860, SPL = 22.5;
    const sky = ctx.createLinearGradient(0, 0, 0, HZ); sky.addColorStop(0, '#0A0610'); sky.addColorStop(1, '#3A1018');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, 1080, HZ);
    D.glow(ctx, 640, 420, 520, '#C8322A', 0.8);
    ctx.fillStyle = '#E8A080'; ctx.beginPath(); ctx.arc(640, 420, 110, 0, Math.PI * 2); ctx.fill();
    // far skyline
    const r = L.rng(L.hash('far'));
    ctx.fillStyle = '#12060A'; ctx.beginPath(); ctx.moveTo(0, HZ);
    for (let x = 0; x <= 1080; x += 30) ctx.lineTo(x, HZ - 20 - r() * 60 - (r() < 0.1 ? 90 : 0));
    ctx.lineTo(1080, HZ); ctx.fill();
    D.water(ctx, T, { horizon: HZ, moonX: 640, splash: [540, 1200, (T - SPL) / 1.0] });
    // the body: a white shroud falling away from us
    if (T < SPL) {
      const u = L.clamp((T - 21.4) / (SPL - 21.4));
      const x = L.lerp(560, 540, u), y = L.lerp(300, 1200, u * u), s = L.lerp(1.8, 0.55, u), rot = 0.6 + u * 1.8;
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
      const g = ctx.createLinearGradient(0, -60, 0, 60); g.addColorStop(0, '#E8E0D0'); g.addColorStop(1, '#6A6258');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, 190, 58, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3A342C'; ctx.lineWidth = 3;
      for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(k * 45, -55); ctx.lineTo(k * 45 + 18, 55); ctx.stroke(); }
      ctx.restore();
    }
    // bridge parapet in the foreground
    ctx.fillStyle = '#0C0A0E'; ctx.fillRect(0, 1720, 1080, 200);
    for (let x = 20; x < 1080; x += 120) { ctx.fillStyle = '#16121A'; ctx.fillRect(x, 1640, 70, 120); }
    D.fog(ctx, T, { y: HZ + 40, h: 260, a: 0.35, speed: 18 });
    D.grain(ctx, T, 1);
    L.text(ctx, 'THE TIBER', 540, 300, { size: 34, family: '"Cinzel", serif', weight: 700, align: 'center', color: C.bone, alpha: L.clamp((T - 21.4) / 0.25) * 0.85, tracking: '0.4em' });
  } });
})();
