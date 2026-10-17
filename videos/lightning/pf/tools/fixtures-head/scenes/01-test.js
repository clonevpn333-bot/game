FILM.scene({ id: 'test', draw(ctx, t, info) {
  const PB = FILM.pb;
  ctx.fillStyle = '#0D1630'; ctx.fillRect(0, 0, 1080, 1920);
  const k = Math.floor(t);
  if (k === 0) { PB.body(ctx, 540, 1850, 1700, PB.pose.stand(), { yaw: 0.35 }); return; }
  if (k === 1) { PB.body(ctx, 300, 1700, 900, PB.pose.walk(t * 6), { yaw: 0.9 }); PB.body(ctx, 780, 1700, 900, PB.pose.fish(t), { yaw: 0.6 }); return; }
  if (k === 2) { PB.body(ctx, 300, 1700, 900, PB.pose.reach(t), { yaw: 0.3, dress: true }); PB.body(ctx, 780, 1700, 900, PB.pose.struck(1), { yaw: -0.3 }); return; }
  PB.body(ctx, 540, 1850, 1700, PB.pose.stand(), { yaw: -0.6, dress: true });
} });
