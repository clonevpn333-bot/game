(async () => { try {
  const G = __G, g = __game, K = G.input.keys; const log = []; const R = G.renderer; G.player.godMode = true;
  const names = () => R.info.programs.map((p) => p.name + ':' + (p.cacheKey || '').slice(0, 60));
  const run = async (s, label) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(s * 30); i++) { const rend = i % 10 === 0; const before = names(); const t0 = performance.now(); g.frame(!rend); const ms = performance.now() - t0; if (rend) { log.push('   ' + window.__rs.join(' ')); } window.__rs = []; if (rend) log.push(`${label} f${i}: ${ms.toFixed(0)}ms calls=${R.info.render.calls} tris=${R.info.render.triangles} shadowAuto=${R.shadowMap.autoUpdate} smoke=${G.fx.smoke.n} glow=${G.fx.glow.n} fire=${G.fx.fireL.n} near=${(() => { const c = G.camera.position, p = G.fx.smoke.pos; let k = 0; for (let j = 0; j < G.fx.smoke.n; j++) if (Math.hypot(p[j*3]-c.x, p[j*3+1]-c.y, p[j*3+2]-c.z) < 4) k++; return k; })()}`); await Promise.resolve(); } window.__fixedDt = 0; };
  const orig = R.render.bind(R); window.__rs = []; R.render = (sc, cam) => { const t0 = performance.now(); orig(sc, cam); window.__rs.push((sc.isScene && sc === G.scene ? 'SCENE' : 'pass') + ':' + (performance.now() - t0).toFixed(0) + 'ms/' + R.info.render.calls + 'c/' + R.info.render.triangles + 't'); };
  const sm = R.shadowMap.render.bind(R.shadowMap); R.shadowMap.render = (...a) => { const t0 = performance.now(); sm(...a); window.__rs.push('SHADOW:' + (performance.now() - t0).toFixed(0) + 'ms'); };
  R.info.autoReset = true; await run(1, 'start'); log.push('programs after start: ' + R.info.programs.length);
  const s = G.mission.ctx.vars.saetta; G.player.teleport(s.pos.x - 2.2, 0.15, s.pos.z, Math.PI / 2); await run(0.5, 'beside');
  K.add('KeyF'); await run(0.1, 'F'); K.delete('KeyF'); await run(3, 'entering');
  K.add('KeyW'); await run(4, 'driving'); K.delete('KeyW');
  return log.join('\n'); } catch (e) { return 'ERR ' + e.stack; } })()
