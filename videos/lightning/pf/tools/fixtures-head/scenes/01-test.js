FILM.scene({ id: 'test', draw(ctx, t, info) {
  const PB = FILM.pb, L = info.lib;
  ctx.fillStyle = '#0D1630'; ctx.fillRect(0, 0, 1080, 1920);
  const k = Math.floor(t);
  if (k < 2) { const r = PB.head(ctx, 540, 900, 820, { yaw: [0.4, 1.2][k], hat: true, slot: 1, key: [-0.3, 0.8, 0.5] }); const top = r.proj(0, 1.35, 0); PB.bolt(ctx, [300, -50], top, { seed: 3 }); return; }
  if (k === 2) { PB.ridges(ctx, t * 200, t); PB.storm(ctx, 700, 500, 900, t, { glow: 0.4 }); PB.truck(ctx, 400, 1500, 1.2, { roll: t * 300 }); PB.rain(ctx, t); return; }
  PB.ranger(ctx, 300, 1500, 2.2, { pose: 'fish' }); PB.ranger(ctx, 800, 1500, 2.2, { pose: 'walk', ph: t * 6, flip: true });
} });
