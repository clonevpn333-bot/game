(async () => { try {
  const G = __G, g = __game; const log = []; const obj = () => document.querySelector('.hud-obj-text').textContent; G.player.godMode = true;
  const settle = async (s = 1) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(s * 30); i++) { g.frame(true); await Promise.resolve(); await Promise.resolve(); } window.__fixedDt = 0; };
  const step = (l) => log.push(`${l} | cp=${G.mission ? G.mission.cpReached : '-'} obj="${obj()}" stars=${G.police.stars} alive=${G.player.alive} failed=${G.mission && G.mission.failed}`);
  await settle(1); const m = G.mission.ctx; step('start cp5');
  const loaner = m.vars.loaner; G.player.enterVehicle(loaner); await settle(1.5); step('in loaner');
  loaner.pos.set(-146, 0, 100); loaner.vel.set(0,0,0); await settle(2); step('out of garage');
  await settle(2); G.police.escaped(); await settle(3); step('escaped');
  loaner.pos.set(550, 0.15, 104); loaner.yaw = 0; loaner.vel.set(0, 0, 0); await settle(3); step('at hideout');
  for (let i = 0; i < 4; i++) await settle(1); loaner.pos.set(550, 0.15, 150); loaner.vel.set(0,0,0); await settle(3); step('inside');
  for (let i = 0; i < 24; i++) await settle(1); step('ending');
  await settle(4); await new Promise((r) => setTimeout(r, 3600));
  log.push('completed: ' + JSON.stringify(G.save.completed) + ' unlocked=' + G.save.unlockedVehicles.join(','));
  log.push('results: ' + ((document.querySelector('.results') || {}).innerText || 'none').replace(/\n+/g, ' | ').slice(0, 400));
  return log.join('\n'); } catch (e) { return 'ERR ' + e.stack; } })()
