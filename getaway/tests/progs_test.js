(async () => { try {
  const G = __G, g = __game, K = G.input.keys; const log = []; const R = G.renderer;
  const progs = () => R.info.programs.length; const run = async (s, label) => { const p0 = progs(); window.__fixedDt = 1 / 15; let worst = 0; for (let i = 0; i < Math.round(s * 15); i++) { const t0 = performance.now(); g.frame(i % 6 !== 0); worst = Math.max(worst, performance.now() - t0); await new Promise((r) => setTimeout(r, 0)); } window.__fixedDt = 0; const nw = R.info.programs.slice(-(progs() - p0)).map((p) => p.name || p.cacheKey.slice(0, 40)); log.push(`${label}: +${progs() - p0} programs ${nw.join(' | ')} worst=${worst.toFixed(0)}ms`); };
  await run(1, 'idle');
  const v = G.player.vehicle; K.add('KeyS'); await run(4, 'reverse'); K.add('KeyA'); await run(3, 'reverse+steer'); K.delete('KeyA'); K.delete('KeyS');
  K.add('KeyW'); await run(4, 'forward'); K.delete('KeyW');
  // reverse into a wall hard
  v.vel.set(0, 0, 0); K.add('KeyS'); K.add('ShiftLeft'); await run(5, 'reverse boost'); K.delete('ShiftLeft'); K.delete('KeyS');
  // crash damage + glass + fire
  v.damage(200, v.pos.clone(), null); v.crackGlass(2); await run(2, 'damaged');
  return log.join('\n'); } catch (e) { return 'ERR ' + e.stack; } })()
