(async () => { try {
  // Drives Mission 02 from the Saetta to the end by following ONLY the on-screen GPS route (G.hud.route), like a player.
  const G = __G, g = __game, K = G.input.keys; G.player.godMode = true; const { driveTo } = await import('/src/vehicles/traffic.js');
  const pu = G.player.update.bind(G.player); let auto = false, stuckT = 0, revT = 0, revS = 1;
  G.player.update = (dt, inp) => { pu(dt, inp); const v = G.player.vehicle; const r = G.hud.route; if (!auto || !v || !r || r.length < 2) return;
    // aim at the route point ~14m ahead of us
    let best = 1, acc = 0; for (let i = 1; i < r.length; i++) { const d = Math.hypot(r[i].x - v.pos.x, r[i].z - v.pos.z); if (d > 14) { best = i; break; } best = i; }
    if (revT > 0) { revT -= dt; v.ctrl.throttle = 0; v.ctrl.brake = 1; v.ctrl.steer = revS; return; }
    driveTo(v, r[best].x, r[best].z, 30, { aggressive: true, reverseOk: false }); window.__aim = r[best];
    if (v.speed < 1.5) { stuckT += dt; if (stuckT > 2.5) { stuckT = 0; revT = 1.4; revS = Math.random() < 0.5 ? 1 : -1; log.push(`  (unstick at ${v.pos.x.toFixed(0)},${v.pos.y.toFixed(1)},${v.pos.z.toFixed(0)} aiming ${window.__aim.x.toFixed(0)},${window.__aim.y.toFixed(1)},${window.__aim.z.toFixed(0)})`); } } else stuckT = 0; };
  const log = { push: (x) => console.log(x), join: () => '' }; let lastObj = ''; const obj = () => document.querySelector('.hud-obj-text').textContent;
  const run = async (secs) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(secs * 30); i++) { g.frame(true); const o = obj(); if (o !== lastObj) { lastObj = o; const v = G.player.vehicle || G.player; log.push(`t=${G.time.toFixed(0)} OBJ "${o}" at ${v.pos.x.toFixed(0)},${v.pos.y.toFixed(1)},${v.pos.z.toFixed(0)} stars=${G.police.stars}`); } if (i % 60 === 0) await new Promise((r) => setTimeout(r, 0)); if (!G.mission || G.mission.done || G.mission.failed) { window.__fixedDt = 0; return; } } window.__fixedDt = 0; };
  await run(1); const s = G.mission.ctx.vars.saetta; G.player.teleport(s.pos.x - 2.2, 0.15, s.pos.z, Math.PI / 2); await run(0.5);
  K.add('KeyF'); await run(0.1); K.delete('KeyF'); await run(2); auto = true;
  let forced = false; const t0 = G.time;
  for (let k = 0; k < 200; k++) { await run(3); if (!G.mission || G.mission.done || G.mission.failed) { log.push('STOP: mission=' + !!G.mission + ' done=' + (G.mission && G.mission.done) + ' failed=' + (G.mission && G.mission.failed) + ' screen=' + (document.querySelector('.fail, .failed, .results') || {}).className); break; }
    if (G.mission.cpReached === 6 && /LOSE THE COPS/.test(obj()) && !forced && G.time - t0 > 5) { if (!this._t6) this._t6 = G.time; if (G.time - this._t6 > 25) { forced = true; log.push('  (forcing escape after 25s of losing cops)'); G.police.escaped(); } }
    if (k % 5 === 0) { const v = G.player.vehicle || G.player; log.push(`   t=${G.time.toFixed(0)} pos=${v.pos.x.toFixed(0)},${v.pos.y.toFixed(1)},${v.pos.z.toFixed(0)} spd=${(v.speed||0).toFixed(0)} cp=${G.mission.cpReached} units=${G.police.units.length} veh=${G.vehicles.list.length} heap=${(performance.memory.usedJSHeapSize/1e6).toFixed(0)}MB`); } }
  await new Promise((r) => setTimeout(r, 3000));
  log.push('END cp=' + (G.mission ? G.mission.cpReached : '-') + ' done=' + (G.mission ? G.mission.done : '-') + ' results=' + !!document.querySelector('.results'));
  return log.join('\n'); } catch (e) { return 'ERR ' + e.stack; } })()
