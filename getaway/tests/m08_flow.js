(async () => { try {
  const { Guard } = await import('/src/core/guard.js'); const G = __G, g = __game, K = G.input.keys; G.player.godMode = true; const log = (x) => console.log(x); let lastObj = ''; const V = G.camera.position.constructor;
  const obj = () => document.querySelector('.hud-obj-text').textContent + ' / ' + document.querySelector('.hud-obj-sub').textContent;
  const step = async (secs, each) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(secs * 30); i++) { if (each) each(i); g.frame(true); await Promise.resolve(); await Promise.resolve(); const o = obj(); if (o !== lastObj) { lastObj = o; log(`t=${G.time.toFixed(0)} cp=${G.mission ? G.mission.cpReached : '-'} OBJ ${o}`); } if (i % 30 === 0) await new Promise((r) => setTimeout(r, 0)); if (!G.mission || G.mission.done || G.mission.failed) break; } window.__fixedDt = 0; };
  G.cam.stopCine(); await step(2); const car = G.player.vehicle; car.pos.set(-1150, 0.3, -300); await step(2);
  car.pos.set(-1626, 0.3, -190); car.vel.set(0, 0, 0); await step(3);
  const fuel = G.mission.ctx.vars.fuel; fuel[0].damage(999, fuel[0].pos.clone(), new V(0, 1, 0)); await step(8);
  log('bowsers dead: ' + fuel.filter((f) => f.dead).length);
  G.player.leaveVehicleInstant(); G.player.teleport(-1640, 0.2, -203, 0); await step(1); K.add('KeyE'); await step(0.1); K.delete('KeyE'); await step(2);
  const pl = G.mission.ctx.vars.pl; log('riding=' + (G.player.riding === pl)); pl.pos.set(-2070, 2.2, -320); pl.yaw = Math.PI / 2; await step(3);
  K.add('KeyW'); await step(10); K.add('Space'); await step(3); K.delete('Space'); await step(6); log(`flying pos=${pl.pos.x.toFixed(0)},${pl.pos.y.toFixed(0)} hp=${pl.hp.toFixed(0)}`);
  K.add('Space'); await step(8); K.delete('Space'); await step(4); K.delete('KeyW'); log(`climb pos y=${pl.pos.y.toFixed(0)} hp=${pl.hp.toFixed(0)} alive=${pl.alive}`); await step(12);
  await new Promise((r) => setTimeout(r, 2000));
  return `END done=${G.mission && G.mission.done} failed=${G.mission && G.mission.failed} errors=${Guard.total} ${Guard.log.slice(0, 4).map((l) => l.where + ': ' + l.msg).join(' | ')}`;
} catch (e) { return 'ERR ' + e.stack; } })()
