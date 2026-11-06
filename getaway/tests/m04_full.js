// DEEP END full playthrough (scripted): dive -> sentries -> cavern loot + charges -> collapse escape -> sub run -> rig raid -> boss finisher
(async () => { const log = []; try {
  const G = __G, g = __game, K = G.input.keys; const obj = () => (document.querySelector('.hud-obj-text') || {}).textContent; G.player.godMode = true;
  const settle = async (s = 1) => { window.__fixedDt = 1 / 20; for (let i = 0; i < Math.round(s * 20); i++) { g.frame(true); await Promise.resolve(); await Promise.resolve(); } window.__fixedDt = 0; };
  const tap = async (c) => { K.add(c); await settle(0.05); K.delete(c); await settle(0.1); };
  const step = (l) => log.push(`${l} | cp=${G.mission ? G.mission.cpReached : '-'} obj="${obj()}"`);
  const V = (x, y, z) => new (G.player.pos.constructor)(x, y, z); const vars = () => G.mission.ctx.vars;
  await settle(0.3); G.cam.stopCine(); await settle(2); step('in the water');
  const D = G.player.riding; D.pos.set(-1010, -24, 903); await settle(2); for (const e of vars().sentries) e.hit(999, V(0, 1, 0)); await settle(1.5); step('sentries down');
  D.pos.set(-990, -27, 903); await settle(2); step('at the mouth');
  for (const p of [[-979, -29, 898], [-967, -30.5, 906], [-955, -30, 913], [-940, -30, 906]]) { D.pos.set(...p); await settle(0.4); } await settle(2); step('in the cavern');
  const W = vars().W; for (const x of W.minerals) { D.pos.copy(x.reach); await settle(0.25); } for (const c of W.charges) { D.pos.copy(c.reach); await settle(0.2); await tap('KeyE'); } await settle(2); step('looted ' + W.minerals.filter((x) => x.got).length + '/' + W.minerals.length + ' + charges ' + W.charges.filter((c) => c.planted).length + '/' + W.charges.length);
  await settle(5); step('blast'); const sub = vars().sub; D.pos.copy(sub.pos).add(V(0, 0, 3)); await settle(0.3); await tap('KeyE'); await settle(1); G.cam.stopCine(); await settle(4); step('in the sub');
  const S = G.player.riding; for (const gl of [V(-985, -14, 846), V(-700, -14, 870), V(-527, -10, 905)]) { for (let i = 0; i < 2000 && Math.hypot(gl.x - S.pos.x, gl.z - S.pos.z) > 10; i++) { S.yaw = Math.atan2(gl.x - S.pos.x, gl.z - S.pos.z); S.speed = 22; S.pitch = Math.max(-0.4, Math.min(0.4, (gl.y - S.pos.y) * 0.05)); await settle(0.05); } step('waypoint ' + gl.x); }
  K.add('Space'); await settle(6); K.delete('Space'); await settle(2); step('surfaced'); G.cam.stopCine(); await settle(3); step('raid');
  for (let w = 0; w < 3; w++) { await settle(3); for (const n of G.npcs.list) if (n.alive && n.team === 'police' && n.maxHp < 1000) n.die(V(0, 0, 1)); await settle(2); step('wave ' + (w + 1)); }
  await settle(1); G.cam.stopCine(); await settle(5); const boss = G.npcs.list.find((n) => n.maxHp >= 1000); step('boss ' + (boss ? boss.hp : 'none'));
  for (let i = 0; i < 15 && boss && !boss.calm; i++) { boss.target.hit(220, V(1, 0, 0), boss.pos, false, null, 'bullet'); await settle(0.3); } step('staggered=' + (boss && boss.calm));
  G.player.teleport(boss.pos.x - 1.5, boss.pos.y, boss.pos.z, 0); await settle(0.5); step('pre-finish d=' + G.player.pos.distanceTo(boss.pos).toFixed(2) + ' alive=' + boss.alive + ' mode=' + boss.human.mode + ' prompt=' + G.hud.promptOverride + ' locked=' + G.player.controlsLocked); await tap('KeyE'); for (let k = 0; k < 16; k++) { await settle(2); step('t+' + (k * 2 + 2) + ' active=' + !!(G.mission && G.mission.active) + ' cine=' + !!(G.mission && G.mission.cine) + ' ts=' + (G.timeScale || 1).toFixed(2) + ' bossAlive=' + boss.alive); if (!G.mission || !G.mission.active) break; }
  step('end'); log.push('completed: ' + JSON.stringify(Object.keys(G.save.completed || {})) + ' results=' + !!document.querySelector('.results') + ' screen: ' + (document.body.innerText.match(/(MISSION (PASSED|COMPLETE|FAILED)[^\n]*)|(FAILED[^\n]*)|(PASSED[^\n]*)/) || ['(no result text)'])[0]);
  return log.join('\n');
} catch (e) { return log.join('\n') + '\nERR ' + e.message + '\n' + e.stack; } })()
