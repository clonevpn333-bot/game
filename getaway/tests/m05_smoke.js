(async () => { try {
  const G = __G, g = __game, K = G.input.keys; const log = []; const obj = () => document.querySelector('.hud-obj-text').textContent; G.player.godMode = true;
  const settle = async (s = 1) => { window.__fixedDt = 1 / 20; for (let i = 0; i < Math.round(s * 20); i++) { g.frame(true); await Promise.resolve(); await Promise.resolve(); } window.__fixedDt = 0; };
  const tap = async (c) => { K.add(c); await settle(0.05); K.delete(c); await settle(0.1); };
  const P = G.player; const step = (l) => log.push(`${l} | cp=${G.mission ? G.mission.cpReached : '-'} obj="${obj()}" stars=${G.police.stars} me=${P.pos.x.toFixed(1)},${P.pos.y.toFixed(1)},${P.pos.z.toFixed(1)} fail=${G.mission && G.mission.failed}`);
  const V = P.pos.constructor; const kill = (team) => { for (const n of G.npcs.list) if (n.team === team && n.alive) n.die(new V(0, 0, 1)); };
  await settle(0.3); G.cam.stopCine(); await settle(1); step('start');
  P.teleport(160, 0.15, -145.4, Math.PI); await settle(5); step('riding'); await settle(7); step('top of ride');
  await settle(2); P.teleport(166, 40.15, -160, 0); await settle(1); step('on floor 10 (stand)');
  kill('halcyon'); await settle(2); step('floor 10 clear');
  P.teleport(177, 40.15, -179, 0); await settle(0.5); await tap('KeyE'); await settle(1); step('generator');
  P.teleport(160, 40.15, -145.4, 0); await settle(8); step('hoist to 13');
  P.teleport(164, 52.15, -178.6, Math.PI); await settle(0.5); await tap('KeyE'); await settle(1); step('download started');
  for (let i = 0; i < 12; i++) { await settle(5); kill('halcyon'); P.teleport(164, 52.15, -178.6, Math.PI); } step('download done');
  await settle(4); P.teleport(151.5, 52.15, -165, 0); await settle(0.5); await tap('KeyE'); await settle(1); step('hooked');
  await settle(11); step('landed');
  const sv = G.mission.ctx.vars.sv; P.teleport(sv.pos.x + 2, 0.15, sv.pos.z, 0); P.enterVehicle(sv); await settle(1); step('in strada');
  G.police.escaped(); await settle(2); step('escaped');
  sv.pos.set(550, 0.15, 104); sv.vel.set(0, 0, 0); await settle(2.5); sv.pos.set(550, 0.15, 150); await settle(2); step('garage');
  await settle(22); await new Promise((r) => setTimeout(r, 3500));
  log.push('completed: ' + JSON.stringify(Object.keys(G.save.completed)) + ' results=' + !!document.querySelector('.results'));
  return log.join('\n'); } catch (e) { return 'ERR ' + e.stack; } })()
