(async () => { try {
  const G = __G, g = __game; const log = [];
  const run = async (s) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(s * 30); i++) { g.frame(true); await Promise.resolve(); } window.__fixedDt = 0; };
  const disp = (v) => { const md = v.model; const list = md.deformList || [[md.bodyMesh, md.origBody]]; let mx = 0; for (const [m, o] of list) { const a = m.geometry.attributes.position.array; for (let i = 0; i < a.length; i++) mx = Math.max(mx, Math.abs(a[i] - o[i])); } return mx.toFixed(3); };
  // find a solid building wall: drive the player car and an AI car into the same wall at 25 m/s
  const S = G.world.static; const B = S.boxes.find((b) => !b.disabled && !b.glass && b.solid && b.minY < 0.5 && b.maxY > 8 && b.maxZ - b.minZ > 12 && b.minX > 20 && b.minX < 400 && Math.abs(b.minZ) < 400 && !S.boxesIn(b.minX - 12, (b.minZ + b.maxZ) / 2 - 3, b.minX - 0.5, (b.minZ + b.maxZ) / 2 + 3).some((o) => o !== b && o.solid && o.maxY > 0.6));
    const hit = { x: B.minX, z: (B.minZ + B.maxZ) / 2 }; log.push('wall ' + JSON.stringify({ x: hit.x.toFixed(1), z: hit.z.toFixed(1), mat: B.mat }));
  for (const [type, player] of [['sedan', true], ['sedan', false], ['strada', true], ['rivolta', false]]) {
    const v = G.vehicles.spawn(type, { x: hit.x - 8, y: 0, z: hit.z, yaw: Math.PI / 2 }); if (player) { G.player.teleport(v.pos.x, 0.2, v.pos.z); G.player.enterVehicle(v); }
    const hp0 = v.hp; v.vel.set(25, 0, 0); v.vF = 25; await run(1.5);
    log.push(`${type} ${player ? 'PLAYER' : 'AI'} hp ${hp0.toFixed(0)} -> ${v.hp.toFixed(0)} (${(100 * (hp0 - v.hp) / hp0).toFixed(0)}%) maxDent=${disp(v)}m`);
    if (player) G.player.leaveVehicleInstant(); G.vehicles.remove(v);
  }
  log.push('decals crack=' + G.decals.crack.n + ' hole=' + G.decals.hole.n + ' scorch=' + G.decals.scorch.n);
  G.emit('explosion', new (G.player.pos.constructor)(hit.x - 3, 1, hit.z), 1, 'test'); await run(0.5);
  log.push('after explosion crack=' + G.decals.crack.n + ' scorch=' + G.decals.scorch.n);
  return log.join('\n'); } catch (e) { return 'ERR ' + e.stack; } })()
