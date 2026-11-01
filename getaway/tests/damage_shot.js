(async () => { try {
  const G = __G, g = __game; const S = G.world.static; const V = G.player.pos.constructor;
  const run = async (s) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(s * 30); i++) { g.frame(true); await Promise.resolve(); } window.__fixedDt = 0; };
  const B = S.boxes.find((b) => !b.disabled && !b.glass && b.solid && b.minY < 0.5 && b.maxY > 8 && b.maxZ - b.minZ > 12 && b.minX > 20 && b.minX < 400 && Math.abs(b.minZ) < 400 && !S.boxesIn(b.minX - 12, (b.minZ + b.maxZ) / 2 - 3, b.minX - 0.5, (b.minZ + b.maxZ) / 2 + 3).some((o) => o !== b && o.solid && o.maxY > 0.6));
  const x = B.minX, z = (B.minZ + B.maxZ) / 2; G.player.teleport(x - 30, 0.2, z - 10);
  for (const dz of [-2.5, 2.5]) { const v = G.vehicles.spawn('sedan', { x: x - 9, y: 0, z: z + dz, yaw: Math.PI / 2, color: dz < 0 ? 0xc0392b : 0x1e3a8a }); v.keep = true; v.vel.set(19, 0, 0); v.vF = 19; await run(1.2); v.burnT = 0; v.smoking = 0; }
  for (let i = 0; i < 18; i++) G.decals.bullet(new V(x - 0.01, 1.5 + Math.random() * 3, z + 4 + Math.random() * 3), new V(-1, 0, 0), 'concrete');
  G.sky.setTime(13); G.cam.play({ dur: 1e9, fov: 45, letterbox: false, pos: () => new V(x - 9, 2.2, z - 7), look: () => new V(x - 1.5, 1.2, z + 0.5) });
  await run(0.3); window.__fixedDt = 1 / 30; g.frame(false); window.__fixedDt = 0; return 'ok ' + G.decals.crack.n;
  } catch (e) { return 'ERR ' + e.stack; } })()
