FILM.scene({ id: 'test', draw(ctx, t, info) {
  ctx.fillStyle = '#0D1630'; ctx.fillRect(0, 0, 1080, 1920);
  const k = Math.floor(t);
  FILM.pb.clouds(ctx, t, { vy: 300, seed: 3 });
  const p = [{ yaw: -0.5, pitch: 0.25 }, { yaw: -1.2, pitch: 0.15, roll: 0.1 }, { yaw: -0.6, pitch: 0.3, brk: 0.5 }, { yaw: -0.6, pitch: 0.3, brk: 1 }][k];
  FILM.pb.jet(ctx, 540, 900, 120, Object.assign({ slot: 31, flat: 0.3, key: [0.2, 0.9, 0.6], spacing: 4.5 }, p));
  FILM.pb.alt(ctx, 540, 1500, 33330 - t * 1000);
} });
