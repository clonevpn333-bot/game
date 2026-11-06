(async () => { try {
  const { Guard } = await import('/src/core/guard.js'); const G = __G, g = __game, K = G.input.keys; G.player.godMode = true; const log = (x) => console.log(x); let lastObj = ''; const V = G.camera.position.constructor;
  const obj = () => document.querySelector('.hud-obj-text').textContent + ' / ' + document.querySelector('.hud-obj-sub').textContent;
  const step = async (secs, each) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(secs * 30); i++) { if (each) each(i); g.frame(true); await Promise.resolve(); await Promise.resolve(); const o = obj(); if (o !== lastObj) { lastObj = o; log(`t=${G.time.toFixed(0)} cp=${G.mission ? G.mission.cpReached : '-'} OBJ ${o}`); } if (i % 30 === 0) await new Promise((r) => setTimeout(r, 0)); if (!G.mission || G.mission.done || G.mission.failed) break; } window.__fixedDt = 0; };
  const tap = async (c) => { K.add(c); await step(0.1); K.delete(c); await step(0.3); };
  { const f0 = G.mission.fail.bind(G.mission); G.mission.fail = (r) => { log('FAIL: ' + r + ' at cp ' + G.mission.cpReached); f0(r); }; } G.cam.stopCine(); await step(2); for (const n of G.npcs.list) if (n.alive && n.team === 'halcyon') n.die(new V(1, 0, 0)); await step(3);
  // chase: hop in the muscle car, follow the SUV by teleporting behind it
  const car = G.vehicles.list.find((v) => v.type === 'muscle'); if (car) { G.player.teleport(car.pos.x, car.pos.y, car.pos.z, 0); G.player.enterVehicle(car); } await step(1);
  const suv = G.mission.ctx.vars.suv; for (let k = 0; k < 40 && G.mission.cpReached === 1; k++) { if (car && suv) { car.pos.set(suv.pos.x - Math.sin(suv.yaw) * 16, suv.pos.y + 0.3, suv.pos.z - Math.cos(suv.yaw) * 16); car.yaw = suv.yaw; car.vel.set(0, 0, 0); } log(`  suv ${suv.pos.x.toFixed(0)},${suv.pos.z.toFixed(0)} spd=${suv.speed.toFixed(0)}`); await step(2); }
  log('at pad, cp=' + G.mission.cpReached + ' failed=' + G.mission.failed + ' reason=' + (document.querySelector('.fail-reason, .results-title, .fail') || {}).textContent + ' suvdist=' + suv.pos.distanceTo(new V(60, 0, -200)).toFixed(0) + ' aidone=' + (suv.ai && suv.ai.done));
  const heli = G.mission.ctx.vars.heli; G.player.leaveVehicleInstant(); G.player.teleport(heli.pos.x + 2, 0.4 + heli.pos.y - heli.gear, heli.pos.z, 0); await step(0.5); await tap('KeyE'); log('riding heli=' + (G.player.riding === heli));
  K.add('Space'); await step(3); K.delete('Space'); K.add('KeyW'); await step(3); K.delete('KeyW'); log(`heli flying y=${heli.pos.y.toFixed(0)} hp=${heli.hp.toFixed(0)}`);
  G.mission.ctx.vars.cour.damage(1e6, G.mission.ctx.vars.cour.pos.clone()); await step(10);
  for (const e of G.mission.ctx.vars.escorts || []) e.damage(1e6, e.pos.clone()); await step(2); const cour = G.mission.ctx.vars.cour; const cp = G.mission.ctx.vars.caseP; heli.pos.set(cp.x + 6, cp.y + 5, cp.z); heli.vel.set(0, 0, 0); K.add('KeyC'); await step(4); K.delete('KeyC'); log(`landed=${heli.grounded} y=${heli.pos.y.toFixed(1)}`); await tap('KeyF'); log('out=' + !G.player.riding);
  await step(1); G.player.teleport(cp.x, cp.y + 0.3, cp.z, 0); await step(0.5); await tap('KeyE'); await step(1);
  G.player.teleport(heli.pos.x + 2, heli.pos.y - heli.gear + 0.4, heli.pos.z, 0); await step(0.5); await tap('KeyE'); log('reboarded=' + (G.player.riding === heli));
  heli.pos.set(0, 120, -900); await step(1); const hy = G.world.static.groundAt(0, -950, 600, 0).h; heli.pos.set(0, hy + 4, -950); K.add('KeyC'); await step(3); K.delete('KeyC'); await step(16);
  await new Promise((r) => setTimeout(r, 1500));
  return `END done=${G.mission && G.mission.done} failed=${G.mission && G.mission.failed} errors=${Guard.total} ${Guard.log.slice(0, 4).map((l) => l.where + ': ' + l.msg).join(' | ')}`;
} catch (e) { return 'ERR ' + e.stack; } })()
