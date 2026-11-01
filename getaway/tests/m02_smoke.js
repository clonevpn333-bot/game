(async () => { try {
  const G = __G, g = __game, K = G.input.keys; const log = []; const obj = () => document.querySelector('.hud-obj-text').textContent; G.player.godMode = true;
  const settle = async (s = 1) => { window.__fixedDt = 1 / 20; for (let i = 0; i < Math.round(s * 20); i++) { g.frame(true); await Promise.resolve(); await Promise.resolve(); } window.__fixedDt = 0; };
  const tap = async (c) => { K.add(c); await settle(0.05); K.delete(c); await settle(0.1); };
  const step = (l) => log.push(`${l} | cp=${G.mission ? G.mission.cpReached : '-'} obj="${obj()}" stars=${G.police.stars}`);
  await settle(0.3); G.cam.stopCine(); await settle(8.5); step('alarm');
  G.player.leaveVehicleInstant(); G.player.teleport(-50, 0.15, -44, Math.PI); await settle(1); step('inside');
  for (const n of G.npcs.list) if (n.team === 'guard' && n.alive) n.die(new (G.player.pos.constructor)(0, 0, 1)); await settle(1); step('guards down');
  G.player.teleport(-50, 0.15, -67, Math.PI); await settle(4); step('vault open');
  for (const p of G.world.landmarks.bank.cash.slice(0, 3)) { G.player.teleport(p.x, 0.45, p.z + 1.2, Math.PI); await settle(0.3); await tap('KeyE'); }
  await settle(1); step('cash');
  G.player.teleport(-30, 0.15, -84, Math.PI); await settle(1.5); step('back door');
  const s = G.mission.ctx.vars.saetta; G.player.enterVehicle(s); await settle(1); step('in saetta');
  s.pos.set(-60, 2.7, -568); s.vel.set(0, 0, 0); await settle(1.5); step('on ramp');
  s.pos.set(150, 12, -544); s.vel.set(0, 0, 0); await settle(1); s.pos.set(300, 12, -544); await settle(1.5); step('past roadblock');
  await settle(1); G.police.escaped(); await settle(1.5); step('escaped');
  s.pos.set(550, 0.15, 104); s.vel.set(0, 0, 0); await settle(2.5); s.pos.set(550, 0.15, 150); await settle(2); step('inside garage');
  await settle(19); await new Promise((r) => setTimeout(r, 3500));
  log.push('completed: ' + JSON.stringify(Object.keys(G.save.completed)) + ' results=' + !!document.querySelector('.results'));
  return log.join('\n'); } catch (e) { return 'ERR ' + e.stack; } })()
