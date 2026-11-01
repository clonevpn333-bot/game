(async () => { try {
  const G = __G, g = __game, K = G.input.keys; const log = []; const obj = () => document.querySelector('.hud-obj-text').textContent; G.player.godMode = true;
  const settle = async (s = 1) => { window.__fixedDt = 1 / 20; for (let i = 0; i < Math.round(s * 20); i++) { g.frame(true); await Promise.resolve(); await Promise.resolve(); } window.__fixedDt = 0; };
  const tap = async (c) => { K.add(c); await settle(0.05); K.delete(c); await settle(0.1); };
  const step = (l) => log.push(`${l} | cp=${G.mission ? G.mission.cpReached : '-'} obj="${obj()}" stars=${G.police.stars} pos=${G.player.focus.x.toFixed(0)},${G.player.focus.y.toFixed(1)},${G.player.focus.z.toFixed(0)}`);
  const V = G.player.pos.constructor;
  await settle(0.3); G.cam.stopCine(); await settle(1); step('intro');
  G.player.teleport(-150, 0.15, 319, 0); await settle(1); step('inside');
  G.player.teleport(-143.5, 0.15, 404, Math.PI / 2); await settle(4); step('at store');
  G.player.teleport(-142.6, 0.15, 405.5, Math.PI / 2); await settle(0.5); await tap('KeyE'); await settle(1); step('grabbed');
  await settle(3); for (const n of G.npcs.list) if (n.team === 'halcyon' && n.alive) n.die(new V(0, 0, 1)); await settle(1.5); step('squad down');
  await settle(4); const v = G.mission.ctx.vars.vortice; G.player.teleport(v.pos.x - 2, 0.15, v.pos.z, 0); G.player.enterVehicle(v); await settle(1.5); step('in vortice');
  log.push('shutterN=' + G.world.static.boxes.filter((b) => b.mat === 'metal' && Math.abs(b.minZ - 486.95) < 0.3).map((b) => b.minY.toFixed(2) + (b.disabled ? 'd' : '')).join(','));
  for (let i = 0; i < 90; i++) { G.input.keys.add('KeyW'); await settle(0.1); if (v.pos.z > 494) break; } G.input.keys.delete('KeyW'); step('drove north z=' + v.pos.z.toFixed(1) + ' speed=' + v.speed.toFixed(1));
  if (v.pos.z < 494) { v.pos.set(-150, 0.15, 500); v.vel.set(0, 0, 0); } await settle(1.5); step('outside mode=' + v.mode + ' inV=' + (G.player.vehicle === v) + ' rigid=' + !!v.rigid);
  for (let i = 0; i < 12; i++) { v.hp = v.maxHp; await settle(1); } step('after 12s v=' + v.pos.x.toFixed(0) + ',' + v.pos.z.toFixed(0) + ' inV=' + (G.player.vehicle === v) + ' hp=' + v.hp.toFixed(0) + ' dead=' + v.dead); const pier = G.world.landmarks.pier; v.pos.set(pier.x, 0.6, 640); v.yaw = 0; v.vel.set(0, 0, 0); await settle(2); step('at pier v=' + v.pos.x.toFixed(0) + ',' + v.pos.y.toFixed(1) + ',' + v.pos.z.toFixed(0) + ' mode=' + v.mode + ' inV=' + (G.player.vehicle === v) + ' pv=' + (G.player.vehicle ? G.player.vehicle.type : 'none') + ' dead=' + v.dead + ' drowned=' + v.drowned);
  v.hp = v.maxHp; v.pos.set(pier.x, 0.6, pier.z1 - 30); v.yaw = 0; v.vel.set(0, 0, 40); G.input.keys.add('KeyW'); await settle(1.5); G.input.keys.delete('KeyW'); step('launching');
  await settle(5); step('in water');
  const boatZ = pier.z1 + 26; G.player.teleport(pier.x + 12, -1.4, boatZ - 2, 0); await settle(2); step('at boat');
  await settle(22); await new Promise((r) => setTimeout(r, 3500));
  log.push('completed: ' + JSON.stringify(Object.keys(G.save.completed)) + ' results=' + !!document.querySelector('.results'));
  return log.join('\n'); } catch (e) { return 'ERR ' + e.stack; } })()
