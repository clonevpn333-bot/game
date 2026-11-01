// evaluated in page: returns report of driving scenarios
(() => {
  const G = __G, g = __game, K = G.input.keys; const out = {};
  const v = G.player.vehicle; const reset = (x, z, yaw) => { v.pos.set(x, 0, z); v.yaw = yaw; v.vel.set(0, 0, 0); v.yawRate = 0; v.hp = v.maxHp; if (v.mode === 'rigid') v.flipUpright(); };
  // 1 top speed on long straight (road z=-100 heading +x)
  reset(-750, -101.75, Math.PI / 2); K.clear(); K.add('KeyW'); g.simulate(9);
  out.top = { speedKmh: (v.speed * 3.6).toFixed(0), x: v.pos.x.toFixed(0), hp: v.hp | 0, nan: isNaN(v.pos.x) };
  // 2 cornering at speed: steer right 1.2s
  reset(-750, -101.75, Math.PI / 2); K.clear(); K.add('KeyW'); g.simulate(3); const y0 = v.yaw; K.add('KeyD'); g.simulate(1.0); K.delete('KeyD');
  out.corner = { speed: (v.speed * 3.6).toFixed(0), dyaw: (v.yaw - y0).toFixed(2), slip: v.slip.toFixed(1) };
  // 3 handbrake drift
  reset(-750, -101.75, Math.PI / 2); K.clear(); K.add('KeyW'); g.simulate(3); K.add('KeyA'); K.add('Space'); g.simulate(0.8); out.drift = { slip: v.slip.toFixed(1), speed: (v.speed * 3.6).toFixed(0), rate: v.yawRate.toFixed(2) }; K.clear(); g.simulate(1);
  // 4 crash into a building head-on
  reset(-50, -150, 0); K.clear(); const hp0 = v.hp; K.add('KeyW'); let t = 0; while (t < 6 && v.pos.z < -100) { g.simulate(0.1); t += 0.1; }
  g.simulate(1.5); out.crash = { z: v.pos.z.toFixed(1), speed: v.speed.toFixed(1), dmg: (hp0 - v.hp).toFixed(0), mode: v.mode, glass: v.glassLevel };
  // 5 stunt ramp at construction site (ramp x120..140 at z -133, heading +x)
  reset(60, -133, Math.PI / 2); K.clear(); K.add('KeyW'); let maxY = 0, air = false; for (let i = 0; i < 60; i++) { g.simulate(0.05); maxY = Math.max(maxY, v.pos.y); air = air || v.airborne; }
  out.ramp = { maxY: maxY.toFixed(2), wasAirborne: air, x: v.pos.x.toFixed(1), mode: v.mode, y: v.pos.y.toFixed(2) };
  K.clear();
  // 6 traffic soak
  g.simulate(20); const bad = G.vehicles.list.filter((c) => isNaN(c.pos.x) || isNaN(c.yaw) || c.pos.y < -10).length;
  out.traffic = { vehicles: G.vehicles.list.length, bad, moving: G.traffic.cars.filter((c) => c.speed > 2).length, rigid: G.vehicles.list.filter((c) => c.mode === 'rigid').length, peds: G.peds.list.length, ragdolls: G.peds.list.filter((p) => p.state === 'ragdoll').length };
  return JSON.stringify(out, null, 1);
})()
