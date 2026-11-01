(async () => { try {
  const G = __G, g = __game, K = G.input.keys; const log = [];
  const run = async (s) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(s * 30); i++) { const t0 = performance.now(); g.frame(true); const ms = performance.now() - t0; const v = G.player.vehicle; if (ms > 400) log.push('SLOW FRAME ' + ms.toFixed(0) + 'ms'); if (v && ![v.pos.x, v.pos.y, v.pos.z, v.yaw, v.vF, G.cam.yaw].every(Number.isFinite)) { log.push('NONFINITE ' + JSON.stringify({ p: v.pos, yaw: v.yaw, vF: v.vF, cy: G.cam.yaw })); return false; } await Promise.resolve(); } window.__fixedDt = 0; return true; };
  for (const car of ['rostr', 'strada', 'rivolta', 'sedan', 'muscle', 'moto']) {
    const v = G.vehicles.spawn(car, { x: 60, y: 0, z: -40, yaw: 0 }); G.player.teleport(60, 0.2, -40); G.player.enterVehicle(v); await run(0.5);
    const combos = [['KeyS'], ['KeyS', 'KeyA'], ['KeyS', 'KeyD', 'Space'], ['KeyS', 'ShiftLeft'], ['KeyS', 'ShiftLeft', 'KeyA'], ['KeyW'], ['KeyS', 'KeyD']];
    for (const c of combos) { c.forEach((k) => K.add(c === combos[5] ? k : k)); const ok = await run(3); c.forEach((k) => K.delete(k)); log.push(`${car} ${c.join('+')} vF=${v.vF.toFixed(1)} ok=${ok}`); if (!ok) break; }
    G.player.leaveVehicleInstant(); G.vehicles.remove(v);
  }
  return log.join('\n'); } catch (e) { return 'ERR ' + e.stack; } })()
