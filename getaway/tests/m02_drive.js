(async () => { try {
  // Real pursuit drive through Mission 02 from the Saetta: autopilot on the street graph, cops at 3 stars, explosions allowed.
  // Logs slow frames (CPU), new shader programs (GPU compile stalls), NaNs and entity counts.
  const G = __G, g = __game, K = G.input.keys; const log = []; const R = G.renderer; G.player.godMode = true;
  const { roadRoute } = await import('/src/missions/helpers.js'); const { driveTo } = await import('/src/vehicles/traffic.js');
  let route = null, wi = 0; const pu = G.player.update.bind(G.player);
  G.player.update = (dt, inp) => { pu(dt, inp); const v = G.player.vehicle; if (!route || !v) return; let p = route[wi]; if (!p) return; if (Math.hypot(p.x - v.pos.x, p.z - v.pos.z) < 10 && wi < route.length - 1) p = route[++wi]; driveTo(v, p.x, p.z, 38, { aggressive: true, reverseOk: true }); if (v.speed < 1.5 && v.ctrl.throttle > 0.5) { v._st = (v._st || 0) + dt; if (v._st > 2) { v.ctrl.throttle = 0; v.ctrl.brake = 1; v.ctrl.steer = 1; if (v._st > 3.2) v._st = 0; } } else v._st = 0; };
  let progs = R.info.programs.length, slow = 0, worst = 0, simT = 0; const progNames = () => R.info.programs.map((p) => p.name);
  const snap = (l) => { const v = G.player.vehicle || G.player; const M = R.info.memory; console.log(`MEM heap=${(performance.memory.usedJSHeapSize/1e6).toFixed(0)}MB geos=${M.geometries} tex=${M.textures} progs=${R.info.programs.length} bodies=${G.rigid.bodies ? G.rigid.bodies.length : "?"} npcs=${G.npcs.list.length} sceneKids=${G.scene.children.length}`); console.log(`${l} t=${simT.toFixed(0)} cp=${G.mission ? G.mission.cpReached : '-'} obj="${document.querySelector('.hud-obj-text').textContent}" pos=${v.pos.x.toFixed(0)},${v.pos.y.toFixed(1)},${v.pos.z.toFixed(0)} spd=${(v.speed || 0).toFixed(0)} stars=${G.police.stars} units=${G.police.units.length} veh=${G.vehicles.list.length} rigid=${G.rigid.bodies ? G.rigid.bodies.length : '?'} smoke=${G.fx.smoke.n} progs=${R.info.programs.length} wp=${wi}/${route ? route.length : 0}`); };
  const run = async (secs, label) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(secs * 30); i++) { const rend = i % 90 === 0; const before = rend ? progNames() : null; const t0 = performance.now(); g.frame(!rend); const ms = performance.now() - t0; simT += 1 / 30;
      if (!rend && ms > 40) { slow++; if (ms > worst) worst = ms; if (slow < 25) console.log(`  SLOW ${ms.toFixed(0)}ms at t=${simT.toFixed(1)} ${label}`); }
      if (rend && R.info.programs.length !== progs) { const now = progNames(); console.log(`  NEW PROGRAM(S) at t=${simT.toFixed(1)} ${label}: ${now.filter((n) => !before.includes(n) || now.filter((x) => x === n).length > before.filter((x) => x === n).length).join(', ')} (${progs} -> ${now.length})`); progs = now.length; }
      const v = G.player.vehicle; if (v && !Number.isFinite(v.pos.x + v.pos.y + v.pos.z + v.yaw)) { log.push('  NaN player car at ' + simT.toFixed(1)); return; }
      if (i % 30 === 0) await new Promise((r) => setTimeout(r, 0)); }
    window.__fixedDt = 0; };
  await run(1, 'start'); progs = R.info.programs.length; snap('start');
  const s = G.mission.ctx.vars.saetta; G.player.teleport(s.pos.x - 2.2, 0.15, s.pos.z, Math.PI / 2); await run(0.5, 'beside');
  K.add('KeyF'); await run(0.1, 'F'); K.delete('KeyF'); await run(2.5, 'entering'); snap('in car=' + (G.player.vehicle === s));
  route = roadRoute(s.pos.x, s.pos.z, -60, -568); wi = 0; snap('route to ramp');
  for (let k = 0; k < 12; k++) { await run(5, 'to ramp'); snap('drive'); if (G.mission.cpReached >= 5) break; }
  route = [{ x: 0, z: -560 }, { x: 120, z: -548 }, { x: 260, z: -548 }, { x: 330, z: -544 }, { x: 420, z: -544 }]; wi = 0;
  for (let k = 0; k < 10; k++) { await run(5, 'highway'); snap('hwy'); if (G.mission.cpReached >= 6) break; }
  const v = G.player.vehicle; if (v) { route = roadRoute(v.pos.x, v.pos.z, 550, 104); wi = 0; }
  for (let k = 0; k < 14; k++) { await run(5, 'escape'); snap('esc'); }
  // force the worst case: blow up every cop car near us at once
  for (const u of G.police.units.slice()) if (u.v && !u.v.dead) u.v.explode(); await run(4, 'mass explode'); snap('after explosions');
  log.push(`slow frames=${slow} worst=${worst.toFixed(0)}ms programs=${R.info.programs.length}`);
  return log.join('\n'); } catch (e) { return 'ERR ' + e.stack; } })()
