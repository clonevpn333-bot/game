(async () => { try {
  const G = __G, g = __game, K = G.input.keys; const log = []; const obj = () => document.querySelector('.hud-obj-text').textContent;
  const sim = (s) => g.simulate(s, 1 / 30); const tap = (code) => { K.add(code); sim(1 / 30); K.delete(code); sim(1 / 30); };
  let T0 = performance.now(); const step = (label) => { const ms = (performance.now() - T0) | 0; T0 = performance.now(); console.log(`[${ms}ms] ` + log[log.push(`${label} | cp=${G.mission ? G.mission.cpReached : '-'} obj="${obj()}" stars=${G.police.stars} hunters=${G.mission && G.mission.ctx ? G.mission.ctx.vars.hunters?.alive().length : '-'}`) - 1]); };
  const settle = async (s = 1) => { sim(s); await new Promise((r) => setTimeout(r, 0)); sim(0.1); await new Promise((r) => setTimeout(r, 0)); };
  await settle(0.5); G.cam.stopCine(); await settle(1); step('after intro');
  const m = G.mission.ctx; const car = m.vars.car; G.player.enterVehicle(car); await settle(3); step('entered car');
  car.pos.set(10, 0, -194.75); await settle(1); await settle(6); step('ambush');
  await settle(6); step('jump objective');
  car.pos.set(118, 0.15, -133); car.yaw = Math.PI / 2; car.vel.set(25, 0, 0); for (let i = 0; i < 12; i++) await settle(0.25); step('construction');
  for (const u of m.vars.hunters.units) if (!u.v.dead) u.v.explode(); await settle(3); step('hunters dead');
  for (let i = 0; i < 8; i++) await settle(0.5); step('cp2?');
  car.pos.set(30, 0, 98.25); car.yaw = -Math.PI / 2; car.vel.set(-10, 0, 0); await settle(0.5); for (let i = 0; i < 10; i++) await settle(0.5); step('kill switch');
  car.vel.set(0, 0, 0); tap('KeyF'); await settle(2); step('bailed');
  const trunk = car.local(0, -car.spec.L / 2 - 0.9); G.player.pos.set(trunk.x, 0.15, trunk.z); await settle(0.3); tap('KeyE'); await settle(1); step('case');
  await settle(3); step('fire escape obj');
  G.player.teleport(-13.2, 4.6, 125, Math.PI); await settle(1); step('on fire escape');
  G.player.teleport(-20, 8.15, 123, -Math.PI / 2); await settle(1.5); step('roof');
  for (const p of [[-39, 10.15, 123], [-56, 10.15, 123], [-77, 16.15, 120]]) { G.player.teleport(p[0], p[1], p[2], -Math.PI / 2); await settle(1.2); step('route ' + p[0]); }
  G.player.teleport(-87, 16.15, 119, -Math.PI / 2); await settle(1); G.player.teleport(-117, 16.15, 119, -Math.PI / 2); await settle(2); step('garage roof');
  const loaner = m.vars.loaner; G.player.enterVehicle(loaner); await settle(1.5); step('in loaner');
  loaner.pos.set(-146, 0, 100); await settle(2); step('out of garage');
  await settle(2); G.police.escaped(); await settle(3); step('escaped');
  loaner.pos.set(550, 0.15, 104); loaner.vel.set(0, 0, 0); await settle(3); step('at hideout');
  loaner.pos.set(550, 0.15, 150); await settle(3); step('inside');
  for (let i = 0; i < 20; i++) await settle(1); step('ending');
  log.push('completed: ' + JSON.stringify(G.save.completed));
  log.push('menu: ' + (document.querySelector('.results h2') || {}).textContent);
  return log.join('\n'); } catch (e) { return log.join('\n') + '\nERROR ' + e.stack; }
})()
