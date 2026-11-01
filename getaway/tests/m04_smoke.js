(async () => { try {
  const G = __G, g = __game, K = G.input.keys; const log = []; const obj = () => document.querySelector('.hud-obj-text').textContent; G.player.godMode = true;
  const settle = async (s = 1) => { window.__fixedDt = 1 / 20; for (let i = 0; i < Math.round(s * 20); i++) { g.frame(true); await Promise.resolve(); await Promise.resolve(); } window.__fixedDt = 0; };
  const tap = async (c) => { K.add(c); await settle(0.05); K.delete(c); await settle(0.1); };
  const step = (l) => { const t = G.mission && G.mission.ctx && G.mission.ctx.vars.truck; log.push(`${l} | cp=${G.mission ? G.mission.cpReached : '-'} obj="${obj()}" stars=${G.police.stars} truck=${t ? t.pos.x.toFixed(0) + ',' + t.pos.z.toFixed(0) + ' v' + t.speed.toFixed(1) + ' hp' + t.hp.toFixed(0) : '-'} me=${G.player.focus.x.toFixed(0)},${G.player.focus.z.toFixed(0)} fail=${G.mission && G.mission.failed}`); };
  const V = G.player.pos.constructor; const vars = () => G.mission.ctx.vars;
  await settle(0.3); G.cam.stopCine(); await settle(1); step('tailing start');
  // follow the truck at ~60 m by teleporting the SV behind it
  for (let i = 0; i < 44; i++) { const t = vars().truck, sv = G.player.vehicle; if (t && sv) { const s = Math.sin(t.yaw), c = Math.cos(t.yaw); sv.pos.set(t.pos.x - s * 60, t.pos.y, t.pos.z - c * 60); sv.yaw = t.yaw; sv.vel.set(s * t.speed, 0, c * t.speed); } await settle(1); if (G.mission.cpReached > 0) break; }
  step('after tail');
  await settle(3); step('ambush');
  for (const v of G.vehicles.list) if (v.type === 'muscle' && !v.dead) v.explode(); await settle(2); step('marrow down');
  await settle(2); const esc = vars().escorts.find((e) => !e.dead); if (esc) esc.explode(); await settle(2); step('escort down');
  { const t = vars().truck; if (G.player.vehicle) G.player.leaveVehicleInstant(); const s = Math.sin(t.yaw), c = Math.cos(t.yaw); G.player.teleport(t.pos.x + c * 2.6, t.pos.y + 0.15, t.pos.z - s * 2.6, t.yaw); await settle(0.2); log.push('prompt=' + G.hud.promptOverride); await tap('KeyE'); }
  await settle(3); step('boarded inV=' + (G.player.vehicle === vars().truck));
  const tr = vars().truck; tr.pos.set(262, -2, 300); tr.vel.set(0, 0, 0); tr.yaw = Math.PI / 2; await settle(2); step('tunnel');
  tr.pos.set(550, 0.15, 104); tr.vel.set(0, 0, 0); await settle(1.5); tr.pos.set(550, 0.15, 150); await settle(2); step('garage');
  await settle(20); await new Promise((r) => setTimeout(r, 3500));
  log.push('completed: ' + JSON.stringify(Object.keys(G.save.completed)) + ' results=' + !!document.querySelector('.results'));
  return log.join('\n'); } catch (e) { return 'ERR ' + e.stack; } })()
