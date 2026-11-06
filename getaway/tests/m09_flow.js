(async () => { try {
  const { Guard } = await import('/src/core/guard.js'); const G = __G, g = __game, K = G.input.keys; G.player.godMode = true; const log = (x) => console.log(x); let lastObj = '';
  const obj = () => document.querySelector('.hud-obj-text').textContent + ' / ' + document.querySelector('.hud-obj-sub').textContent;
  const step = async (secs, each) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(secs * 30); i++) { if (each) each(i); g.frame(true); await Promise.resolve(); await Promise.resolve(); const o = obj(); if (o !== lastObj) { lastObj = o; log(`t=${G.time.toFixed(0)} cp=${G.mission ? G.mission.cpReached : '-'} OBJ ${o}`); } if (i % 30 === 0) await new Promise((r) => setTimeout(r, 0)); if (!G.mission || G.mission.done || G.mission.failed) break; } window.__fixedDt = 0; };
  G.cam.stopCine(); await step(2); const V = m => m; const ctx = G.mission.ctx; const pl = ctx.vars.pl;
  for (let k = 0; k < 14 && G.mission.cpReached === 0; k++) { const p = ctx.vars.ringP; if (p) { pl.pos.copy(p); pl.pos.x -= 2; } await step(0.4); }
  log('rings done, cp=' + G.mission.cpReached + ' enemies=' + ctx.vars.enemies.length + ' hp=' + pl.hp.toFixed(0));
  await step(3); for (const e of ctx.vars.enemies) e.damage(9999, e.pos.clone()); await step(8);
  log('cp=' + G.mission.cpReached); const p2 = ctx.vars.pl; p2.pos.set(150, 6, 640); p2.pitch = -0.12; p2.yaw = 0.3; p2.roll = 0; p2.speed = 40; await step(4); log(`landed? grounded=${p2.grounded} pos=${p2.pos.x.toFixed(0)},${p2.pos.y.toFixed(1)},${p2.pos.z.toFixed(0)} same=${p2 === G.player.riding}`); await step(32);
  await new Promise((r) => setTimeout(r, 2000));
  return `END camcine=${G.cam.cine ? G.cam.cine.t.toFixed(1) + "/" + G.cam.cine.dur : "none"} waiters=${G.mission.ctx.waiters.length} time=${G.time.toFixed(0)} cp=${G.mission && G.mission.cpReached} retries=${G.mission && G.mission.autoRetries} riding=${!!G.player.riding} done=${G.mission && G.mission.done} failed=${G.mission && G.mission.failed} errors=${Guard.total} ${Guard.log.slice(0, 4).map((l) => l.where + ': ' + l.msg).join(' | ')}`;
} catch (e) { return 'ERR ' + e.stack; } })()
