// SKYFALL full playthrough (scripted): drop -> roof A -> zipline -> roof B -> safe -> raid -> base jump onto the truck -> lose cops -> drive into the big rig
(async () => { const log = []; try {
  const G = __G, g = __game, K = G.input.keys; const obj = () => (document.querySelector('.hud-obj-text') || {}).textContent; G.player.godMode = true;
  const settle = async (s = 1) => { window.__fixedDt = 1 / 20; for (let i = 0; i < Math.round(s * 20); i++) { g.frame(true); await Promise.resolve(); await Promise.resolve(); } window.__fixedDt = 0; };
  const tap = async (c) => { K.add(c); await settle(0.05); K.delete(c); await settle(0.1); };
  const step = (l) => log.push(`${l} | cp=${G.mission ? G.mission.cpReached : '-'} obj="${obj()}" stars=${G.police.stars} pos=${G.player.pos.toArray().map((v) => v.toFixed(0))}`);
  const V = (x, y, z) => new (G.player.pos.constructor)(x, y, z); const vars = () => G.mission.ctx.vars; const kill = (team) => { for (const n of G.npcs.list) if (n.alive && (!team || n.team === team)) n.die(V(0, 0, 1)); };
  await settle(0.3); G.cam.stopCine(); await settle(2); step('on roof A'); kill('halcyon'); await settle(2); step('roof clear');
  const z = vars().zip; const st = z.a.clone().add(V(0, -2.6, 0)); G.player.teleport(st.x, st.y + 0.2, st.z, 0); await settle(0.5); await tap('KeyE'); await settle(1); step('zipping riding=' + (G.player.riding ? 'yes' : 'no'));
  await settle(7); step('landed on B'); kill('halcyon'); await settle(2); step('B clear');
  const sp = vars().ph.safePos; G.player.teleport(sp.x, sp.y + 0.2, sp.z, 0); await settle(0.5); await tap('KeyE'); await settle(0.5); step('safe ui=' + !!document.querySelector('.sc-n'));
  { const sc0 = vars().sc; for (let i = 0; i < 900 && sc0 && !sc0.done; i++) { const tn = sc0.t + 0.05 * (1 + sc0.round * 0.22); const x = 0.5 + 0.5 * Math.sin(tn * 2.6); const [a, b] = sc0.zone; const m = (b - a) * 0.2; if (x > a + m && x < b - m) { K.add('KeyE'); await settle(0.05); K.delete('KeyE'); await settle(0.05); } else await settle(0.05); } }
  const sc = vars().sc; step('safe round=' + (sc && sc.round) + ' misses=' + (sc && sc.misses) + ' done=' + (sc && sc.done) + ' zone=' + (sc && sc.zone.map((v) => v.toFixed(2))) + ' needle=' + (document.querySelector('.sc-n') || { style: {} }).style.left);
  await settle(6); step('safe cracked');
  for (let w = 0; w < 2; w++) { await settle(3); kill('police'); await settle(2); step('raid wave ' + (w + 1)); }
  await settle(7); step('jump time');
  // run off the roof edge towards the truck, open the chute, steer onto it
  const t = vars().truck; const yb = vars().yb; G.player.teleport(-130 + 9.5, yb + 0.2, 30, Math.PI / 2); G.player.vel.set(6, 0, 0); G.player.vy = 0; G.player.grounded = false; G.player.pos.x += 1.5; await settle(0.6); step('falling riding=' + (G.player.riding ? G.player.riding.constructor.name : 'none'));
  const sky = vars().sky; if (sky) { await settle(0.8); sky.open(); for (let i = 0; i < 600 && G.player.riding === sky; i++) { const tp = t.pos.clone().add(t.vel.clone().multiplyScalar(0.6)); const dx = tp.x - sky.pos.x, dz = tp.z - sky.pos.z; sky.yaw = Math.atan2(dx, dz); const d = Math.hypot(dx, dz); sky.vel.x = dx / Math.max(d, 1) * Math.min(12, d * 2); sky.vel.z = dz / Math.max(d, 1) * Math.min(12, d * 2); await settle(0.05); } }
  await settle(2); step('after landing veh=' + (G.player.vehicle === t ? 'TRUCK' : G.player.vehicle ? 'other' : 'none'));
  if (G.player.vehicle !== t) { G.player.teleport(t.pos.x + 3, t.pos.y, t.pos.z, 0); G.player.enterVehicle(t); await settle(1); }
  G.police.setStars(0); G.emit('escaped'); await settle(3); step('cops lost');
  // drive up behind the rig at its speed
  const rig = G.vehicles.list.find((v) => v.spec && v.spec.id === 'truck' && v !== t && v.keep) || G.vehicles.list.filter((v) => v.keep && v !== t).pop(); step('rig=' + !!rig);
  if (rig) for (let i = 0; i < 400 && G.mission && G.mission.active && !G.player.controlsLocked; i++) { const back = V(rig.pos.x - Math.sin(rig.yaw) * (rig.spec.L / 2 + 4), t.pos.y, rig.pos.z - Math.cos(rig.yaw) * (rig.spec.L / 2 + 4)); t.pos.copy(back); t.yaw = rig.yaw; t.vel.set(rig.vel.x, 0, rig.vel.z); t.speed = rig.speed; await settle(0.05); }
  step('into the rig'); for (let k = 0; k < 10 && G.mission && G.mission.active; k++) await settle(2);
  step('end'); log.push('completed: ' + JSON.stringify(Object.keys(G.save.completed || {})) + ' screen: ' + (document.body.innerText.match(/MISSION (COMPLETE|FAILED)[^\n]*/) || ['(none)'])[0]);
  return log.join('\n');
} catch (e) { return log.join('\n') + '\nERR ' + e.message + '\n' + e.stack; } })()
