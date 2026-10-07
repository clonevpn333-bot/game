FILM.scene({ id: 'test', draw(ctx, t, info) {
  const L = info.lib, D = FILM.df, PB = FILM.pb;
  ctx.fillStyle = '#0D1630'; ctx.fillRect(0, 0, 1080, 1920);
  const k = Math.floor(t);
  const roll = [0.25, -0.25, 0.32, -0.32][k];
  const r = PB.head(ctx, 540, 800, 800, { yaw: 1.3, roll, slot: 1 });
  const a = r.proj(...PB.BEAM_IN), b = r.proj(...PB.BEAM_OUT);
  const [p, q] = PB.extend(a, b);
  PB.beam(ctx, p, q, { T: t });
  L.text(ctx, String(roll) + ' ' + (Math.atan2(b[1] - a[1], b[0] - a[0]) * 57.3).toFixed(1), 540, 1700, { size: 60, color: '#fff', align: 'center' });
} });
