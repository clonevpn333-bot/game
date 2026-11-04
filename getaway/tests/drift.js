(async () => { try {
  // Get in the Saetta and drift hard (W + Space + A/D), timing every frame, rendering every 10th, watching for errors/new shaders.
  const G = __G, g = __game, K = G.input.keys, R = G.renderer; G.player.godMode = true; const out = [];
  const errs = []; const ce = console.error; console.error = (...a) => { errs.push(a.map(String).join(' ').slice(0, 300)); ce(...a); };
  window.__fixedDt = 1 / 30; const s = G.mission.ctx.vars.saetta; G.player.teleport(s.pos.x - 2.2, 0.15, s.pos.z, Math.PI / 2);
  for (let i = 0; i < 15; i++) g.frame(true); K.add('KeyF'); for (let i = 0; i < 3; i++) g.frame(true); K.delete('KeyF'); for (let i = 0; i < 75; i++) g.frame(true);
  out.push('in car=' + (G.player.vehicle === s) + ' progs=' + R.info.programs.length);
  let progs = R.info.programs.length, worst = 0, worstAt = '';
  const phase = async (keys, n, label) => { for (const k of keys) K.add(k); for (let i = 0; i < n; i++) { const rend = i % 10 === 0; const t0 = performance.now(); g.frame(!rend); const ms = performance.now() - t0; if (!rend && ms > worst) { worst = ms; worstAt = label + '#' + i; }
      if (R.info.programs.length !== progs) { out.push(`  NEW SHADER during ${label} frame ${i} (${progs}→${R.info.programs.length})`); progs = R.info.programs.length; }
      if (!Number.isFinite(s.pos.x + s.pos.y + s.pos.z + s.yaw + s.speed)) { out.push('  NaN car at ' + label + ' ' + i); break; }
      if (i % 30 === 0) await new Promise((r) => setTimeout(r, 0)); } for (const k of keys) K.delete(k);
    out.push(`${label}: pos=${s.pos.x.toFixed(0)},${s.pos.y.toFixed(1)},${s.pos.z.toFixed(0)} spd=${s.speed.toFixed(0)} slip=${(s.slip || 0).toFixed(1)} spin=${(s.spin || 0).toFixed(2)} skids=${G.fx.skids.i} smoke=${G.fx.smoke.n} mode=${s.mode} hp=${s.hp.toFixed(0)}`); };
  await phase(['KeyW'], 90, 'accelerate');
  await phase(['KeyW', 'Space', 'KeyA'], 90, 'drift left');
  await phase(['KeyW', 'KeyD'], 60, 'countersteer');
  await phase(['KeyW', 'Space', 'KeyD'], 90, 'drift right');
  await phase(['KeyW', 'ShiftLeft', 'Space', 'KeyA'], 120, 'boost drift');
  await phase(['KeyS', 'Space'], 60, 'reverse handbrake');
  window.__fixedDt = 0;
  out.push(`worst sim frame ${worst.toFixed(0)}ms at ${worstAt}; errors: ${errs.length ? errs.slice(0, 5).join(' || ') : 'none'}`);
  return out.join('\n'); } catch (e) { return 'ERR ' + e.stack; } })()
