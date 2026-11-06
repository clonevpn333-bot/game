(async () => { try {
  const { Guard } = await import('/src/core/guard.js'); const G = __G, g = __game, K = G.input.keys; G.player.godMode = true; const log = (x) => console.log(x); let lastObj = ''; const V = G.camera.position.constructor;
  const obj = () => document.querySelector('.hud-obj-text').textContent + ' / ' + document.querySelector('.hud-obj-sub').textContent;
  const step = async (secs, each) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(secs * 30); i++) { if (each) each(i); g.frame(true); await Promise.resolve(); await Promise.resolve(); const o = obj(); if (o !== lastObj) { lastObj = o; log(`t=${G.time.toFixed(0)} cp=${G.mission ? G.mission.cpReached : '-'} OBJ ${o} door=${(G.mission.ctx.vars.door || 0).toFixed(0)}`); } if (i % 30 === 0) await new Promise((r) => setTimeout(r, 0)); if (!G.mission || G.mission.done || G.mission.failed) break; } window.__fixedDt = 0; };
  const killAll = () => { for (const n of G.npcs.list) if (n.alive && n.team === 'halcyon') n.die(new V(1, 0, 0)); };
  G.cam.stopCine(); await step(2);
  // man the turret once to exercise it
  G.player.teleport(584, 0.2, 118, 0); await step(0.5); K.add('KeyE'); await step(0.1); K.delete('KeyE'); await step(1); log('on turret=' + !!G.player.riding); G.input.mouseButtons = 1; await step(2); G.input.mouseButtons = 4; await step(0.3); G.input.mouseButtons = 0; K.add('KeyF'); await step(0.1); K.delete('KeyF'); await step(1); log('off turret=' + !G.player.riding);
  for (let k = 0; k < 20 && G.mission.cpReached === 0; k++) { await step(3); killAll(); }
  for (let k = 0; k < 20 && G.mission.cpReached === 1; k++) { await step(3); for (const v of G.vehicles.list) if (v.type === 'armored' && !v.dead) v.explode(); killAll(); }
  for (let k = 0; k < 30 && G.mission.cpReached === 2; k++) { await step(3); for (const s of [...(G.combat.spheres || [])]) if (s.team === 'halcyon') s.hit(99999, s.pos, null, 'rocket'); killAll(); }
  await step(4); const bike = G.vehicles.list.find((v) => v.type === 'moto'); log('bike=' + !!bike); if (bike) { G.player.teleport(bike.pos.x, bike.pos.y, bike.pos.z, 0); G.player.enterVehicle(bike); await step(1); bike.pos.set(700, 0.3, 120); await step(2); bike.pos.set(705, 0.3, 300); await step(2); bike.pos.set(740, 0.3, 425); bike.vel.set(0, 0, 0); await step(20); }
  await new Promise((r) => setTimeout(r, 1500));
  return `END done=${G.mission && G.mission.done} failed=${G.mission && G.mission.failed} errors=${Guard.total} ${Guard.log.slice(0, 4).map((l) => l.where + ': ' + l.msg).join(' | ')}`;
} catch (e) { return 'ERR ' + e.stack; } })()
