(async () => { try {
  const { Guard } = await import('/src/core/guard.js'); const G = __G, g = __game, K = G.input.keys; G.player.godMode = true; const log = (x) => console.log(x); let lastObj = '';
  const obj = () => document.querySelector('.hud-obj-text').textContent + ' / ' + document.querySelector('.hud-obj-sub').textContent;
  const step = async (secs, each) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(secs * 30); i++) { if (each) each(i); g.frame(true); await Promise.resolve(); await Promise.resolve(); const o = obj(); if (o !== lastObj) { lastObj = o; log(`t=${G.time.toFixed(0)} cp=${G.mission ? G.mission.cpReached : '-'} OBJ ${o}`); } if (i % 30 === 0) await new Promise((r) => setTimeout(r, 0)); if (!G.mission || G.mission.done || G.mission.failed) break; } window.__fixedDt = 0; };
  const killAll = () => { for (const n of G.npcs.list) if (n.alive && n.team !== 'player') n.die(new (G.player.pos.constructor)(1, 0, 0)); };
  G.cam.stopCine(); await step(2); G.player.teleport(360, 0.4, -200, Math.PI / 2); await step(3); killAll(); await step(2);
  G.player.teleport(394, 0.4, -200, Math.PI / 2); await step(3); killAll(); await step(2);
  G.player.teleport(399, 0.4, -200, Math.PI / 2); await step(0.5); K.add('KeyE'); await step(0.1); K.delete('KeyE'); await step(3);
  // shoot the gunship with the RPG like a player would
  const P = G.player; for (let k = 0; k < 12 && G.mission && G.mission.cpReached === 2; k++) { const sp = [...G.combat.spheres].find((s) => s.team === 'halcyon' && s.alive()); if (sp) { const from = P.pos.clone(); from.y += 1.5; const d = sp.pos.clone().sub(from).normalize(); G.combat.fire({ isPlayer: true, team: 'player', human: P.human, target: P.target, aiming: true }, { id: 'rpg', kind: 'heavy', projectile: 'rocket', shake: 0 }, from, d, from); } await step(2.5); }
  log(`after gunship: cp=${G.mission.cpReached} spans down=${0}`);
  await step(6); G.player.teleport(375, 0.4, -200, -Math.PI / 2); await step(4); G.player.teleport(380, -0.6, -216, 0); await step(16);
  await new Promise((r) => setTimeout(r, 2000));
  return `END done=${G.mission && G.mission.done} failed=${G.mission && G.mission.failed} errors=${Guard.total} ${Guard.log.slice(0, 4).map((l) => l.where + ': ' + l.msg).join(' | ')}`;
} catch (e) { return 'ERR ' + e.stack; } })()
