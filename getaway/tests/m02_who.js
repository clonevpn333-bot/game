(async () => { try {
  const G = __G, g = __game, K = G.input.keys; const R = G.renderer; G.player.godMode = true;
  const { roadRoute } = await import('/src/missions/helpers.js'); const { driveTo } = await import('/src/vehicles/traffic.js');
  let route = null, wi = 0; const pu = G.player.update.bind(G.player);
  G.player.update = (dt, inp) => { pu(dt, inp); const v = G.player.vehicle; if (!route || !v) return; let p = route[wi]; if (!p) return; if (Math.hypot(p.x - v.pos.x, p.z - v.pos.z) < 10 && wi < route.length - 1) p = route[++wi]; driveTo(v, p.x, p.z, 38, { aggressive: true, reverseOk: true }); };
  // time every subsystem
  const T = {}; const wrap = (obj, fn, name) => { const o = obj[fn].bind(obj); obj[fn] = (...a) => { const t0 = performance.now(); const r = o(...a); const ms = performance.now() - t0; if (ms > 25) console.log(`  HITCH ${name} ${ms.toFixed(0)}ms t=${G.time.toFixed(1)}`); return r; }; };
  for (const [o, n] of [[G.police, 'police'], [G.traffic, 'traffic'], [G.vehicles, 'vehicles'], [G.combat, 'combat'], [G.fx, 'fx'], [G.npcs, 'npcs'], [G.rigid, 'rigid'], [G.peds, 'peds'], [G.mission, 'mission'], [G.props, 'props']]) wrap(o, o.step && n === 'rigid' ? 'step' : 'update', n);
  const VM = await import('/src/vehicles/vehicle.js'); const proto = VM.Vehicle.prototype;
  // which programs belong to which materials
  const progOf = () => { const m = new Map(); G.scene.traverse((o) => { const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; for (const mt of mats) { const pr = R.properties.get(mt).currentProgram; if (pr) { if (!m.has(pr)) m.set(pr, []); m.get(pr).push(`${o.type}:${o.name || o.parent && o.parent.name || '?'}/${mt.type}${mt.name ? ':' + mt.name : ''}${mt.map ? '+map' : ''}${mt.transparent ? '+tr' : ''}${o.isInstancedMesh ? '+inst' : ''}${o.isSkinnedMesh ? '+skin' : ''}`); } } }); return m; };
  let known = new Set(R.info.programs);
  const run = async (secs, label) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(secs * 30); i++) { const rend = i % 30 === 0; g.frame(!rend);
      if (rend) console.log(`R t=${G.time.toFixed(1)} calls=${R.info.render.calls} tris=${R.info.render.triangles} geos=${R.info.memory.geometries} tex=${R.info.memory.textures} heap=${(performance.memory.usedJSHeapSize/1e6).toFixed(0)}`); if (rend) { const now = R.info.programs.filter((p) => !known.has(p)); if (now.length) { const m = progOf(); for (const p of now) console.log(`  NEW PROGRAM t=${G.time.toFixed(1)} ${label} used by: ${(m.get(p) || ['(not in scene now)']).slice(0, 4).join(' | ')}  key=${(p.cacheKey || '').slice(0, 300)}`); known = new Set(R.info.programs); } }
      if (i % 30 === 0) await new Promise((r) => setTimeout(r, 0)); } window.__fixedDt = 0; };
  await run(1, 'start'); known = new Set(R.info.programs);
  const s = G.mission.ctx.vars.saetta; G.player.teleport(s.pos.x - 2.2, 0.15, s.pos.z, Math.PI / 2); await run(0.5, 'beside');
  K.add('KeyF'); await run(0.1, 'F'); K.delete('KeyF'); await run(2.5, 'entering');
  route = roadRoute(s.pos.x, s.pos.z, -60, -568); wi = 0;
  await run(20, 'drive');
  return 'done progs=' + R.info.programs.length + ' geos=' + R.info.memory.geometries; } catch (e) { return 'ERR ' + e.stack; } })()
