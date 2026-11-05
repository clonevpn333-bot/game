(async () => { try {
  // CHAOS SOAK: plays the loaded mission like a reckless player for SECS of game time — drives (GPS or random), drifts,
  // boosts, rams walls, blows up nearby cars, raises the wanted level, bails out, teleports — and checks every few
  // seconds that nothing errored, no state went NaN, budgets hold and memory stays flat.
  const SECS = window.__soakSecs || 150;
  const { Guard } = await import('/src/core/guard.js'); const { driveTo } = await import('/src/vehicles/traffic.js');
  const G = __G, g = __game, K = G.input.keys; G.player.godMode = true; const log = (x) => console.log(x);
  const rnd = (a, b) => a + Math.random() * (b - a); let target = null, action = 'drive', actT = 0, stuck = 0, rev = 0;
  const pu = G.player.update.bind(G.player);
  G.player.update = (dt, inp) => { pu(dt, inp); const v = G.player.vehicle; if (!v) return;
    if (rev > 0) { rev -= dt; v.ctrl.throttle = 0; v.ctrl.brake = 1; v.ctrl.steer = 1; return; }
    const r = G.hud.route; let aim = null; if (r && r.length > 1) { for (let i = 1; i < r.length; i++) { aim = r[i]; if (Math.hypot(r[i].x - v.pos.x, r[i].z - v.pos.z) > 14) break; } }
    if (!aim) { if (!target || Math.hypot(target.x - v.pos.x, target.z - v.pos.z) < 15) { const n = G.world.graph.nodes[(Math.random() * G.world.graph.nodes.length) | 0]; target = { x: n.x, z: n.z }; } aim = target; }
    driveTo(v, aim.x, aim.z, 40, { aggressive: true, reverseOk: false });
    if (action === 'drift') { v.ctrl.handbrake = true; v.ctrl.steer = Math.sin(G.time * 1.3) > 0 ? 1 : -1; v.ctrl.throttle = 1; }
    if (action === 'boost') { v.ctrl.boost = true; v.ctrl.throttle = 1; }
    if (v.speed < 1.2) { stuck += dt; if (stuck > 3) { stuck = 0; rev = 1.2; } } else stuck = 0; };
  const nums = { maxVeh: 0, maxRigid: 0, maxSmoke: 0, maxPeds: 0, heapMin: 1e9, heapMax: 0, slow: 0, worst: 0 }; const actions = {};
  const step = async (secs) => { window.__fixedDt = 1 / 30; for (let i = 0; i < Math.round(secs * 30); i++) { const t0 = performance.now(); const rend = window.__soakRender && i % window.__soakRender === 0; const pg = G.renderer.info.programs.length; g.frame(!rend); if (rend) await new Promise((r) => requestAnimationFrame(() => r())); /* let the browser present it, like a real frame */ if (rend && G.renderer.info.programs.length !== pg) { nums.newShaders = (nums.newShaders || 0) + 1; log('  NEW SHADER during ' + action); } const ms = performance.now() - t0; if (ms > nums.worst) nums.worst = ms; if (ms > 150) nums.slow++; if (i % 30 === 0) await new Promise((r) => setTimeout(r, 0)); } window.__fixedDt = 0; };
  const startErr = Guard.total;
  for (let t = 0; t < SECS; t += 3) {
    actT -= 3; if (actT <= 0) { // pick the next stunt
      const P = G.player; actT = rnd(4, 9);
      const opts = ['drive', 'drive', 'drift', 'boost', 'ram', 'explode', 'heat', 'bail', 'teleport', 'slowmo'];
      action = opts[(Math.random() * opts.length) | 0]; actions[action] = (actions[action] || 0) + 1;
      try {
        if (!P.vehicle && action !== 'bail') { const v = G.vehicles.spawn(Math.random() < 0.5 ? 'saetta' : 'muscle', { x: P.pos.x + 3, y: P.pos.y + 0.5, z: P.pos.z, yaw: 0 }); P.teleport(v.pos.x, v.pos.y, v.pos.z, 0); P.enterVehicle(v); }
        if (action === 'ram' && P.vehicle) { const v = P.vehicle; target = { x: v.pos.x + Math.sin(v.yaw) * 60 + rnd(-20, 20), z: v.pos.z + Math.cos(v.yaw) * 60 + rnd(-20, 20) }; }
        if (action === 'explode') { const near = G.vehicles.list.filter((o) => o !== P.vehicle && !o.dead && o.pos.distanceTo(P.pos) < 60); for (const o of near.slice(0, 3)) o.explode(); }
        if (action === 'heat' && G.police) { G.police.setStars(1 + ((Math.random() * 4) | 0)); }
        if (action === 'bail' && P.vehicle) { K.add('KeyF'); await step(0.1); K.delete('KeyF'); }
        if (action === 'teleport') { const n = G.world.graph.nodes[(Math.random() * G.world.graph.nodes.length) | 0]; const v = P.vehicle; if (v) { v.pos.set(n.x, (n.y || 0) + 1, n.z); v.vel.set(0, 0, 0); } else P.teleport(n.x, (n.y || 0) + 0.5, n.z, 0); }
        if (action === 'slowmo') G.emit('slowmo', 2, 0.25);
      } catch (e) { log('  ACTION ERROR ' + action + ': ' + e.message); }
    }
    await step(3);
    const heap = performance.memory ? performance.memory.usedJSHeapSize / 1e6 : 0; nums.heapMin = Math.min(nums.heapMin, heap); nums.heapMax = Math.max(nums.heapMax, heap);
    nums.maxVeh = Math.max(nums.maxVeh, G.vehicles.list.length); nums.maxRigid = Math.max(nums.maxRigid, G.rigid.bodies.length); nums.maxSmoke = Math.max(nums.maxSmoke, G.fx.smoke.n); nums.maxPeds = Math.max(nums.maxPeds, G.peds.list.length);
    const v = G.player.vehicle || G.player; const bad = !Number.isFinite(v.pos.x + v.pos.y + v.pos.z) || !Number.isFinite(G.camera.position.x + G.camera.position.y + G.camera.position.z);
    if (bad || t % 30 === 0) log(`  t=${t} ${action} pos=${v.pos.x.toFixed(0)},${v.pos.y.toFixed(1)},${v.pos.z.toFixed(0)} veh=${G.vehicles.list.length} rigid=${G.rigid.bodies.length} smoke=${G.fx.smoke.n} stars=${G.police.stars} heap=${heap.toFixed(0)}MB errors=${Guard.total - startErr}${bad ? ' **NaN**' : ''}`);
  }
  const errs = Guard.log.filter((l) => l.where !== 'guard'); const notes = Guard.log.filter((l) => l.where === 'guard');
  return `SOAK ${SECS}s ${location.search}: errors=${Guard.total - startErr} ${errs.slice(0, 6).map((l) => `[${l.where}×${l.n}] ${l.msg}`).join(' | ')}\n  repairs: ${notes.length ? notes.slice(0, 6).map((l) => l.msg).join(' | ') : 'none'}\n  max vehicles=${nums.maxVeh} rigid=${nums.maxRigid} smoke=${nums.maxSmoke} peds=${nums.maxPeds} heap ${nums.heapMin.toFixed(0)}–${nums.heapMax.toFixed(0)}MB, frames>150ms=${nums.slow} worst=${nums.worst.toFixed(0)}ms new-shaders=${nums.newShaders || 0}\n  actions: ${JSON.stringify(actions)}`;
} catch (e) { return 'SOAK HARNESS ERR ' + e.stack; } })()
