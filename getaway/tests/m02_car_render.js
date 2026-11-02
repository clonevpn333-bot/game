(async () => { try {
  const G = __G, g = __game, K = G.input.keys; const log = []; const obj = () => document.querySelector('.hud-obj-text').textContent; G.player.godMode = true;
  const run = async (s, label) => { window.__fixedDt = 1 / 30; let worst = 0, wi = 0; for (let i = 0; i < Math.round(s * 30); i++) { const t0 = performance.now(); g.frame(i % 10 !== 0); const ms = performance.now() - t0; if (ms > worst) { worst = ms; wi = i; } await Promise.resolve(); } window.__fixedDt = 0; log.push(`${label}: worst frame ${worst.toFixed(0)}ms (#${wi}) obj="${obj()}" inCar=${!!G.player.vehicle} stars=${G.police.stars}`); };
  await run(1, 'start');
  const s = G.mission.ctx.vars.saetta; G.player.teleport(s.pos.x - 2.2, 0.15, s.pos.z, Math.PI / 2); await run(0.5, 'beside car');
  K.add('KeyF'); await run(0.1, 'press F'); K.delete('KeyF'); await run(3, 'entering');
  K.add('KeyW'); await run(4, 'driving');  K.delete('KeyW');
  return log.join('\n'); } catch (e) { return 'ERR ' + e.stack; } })()
