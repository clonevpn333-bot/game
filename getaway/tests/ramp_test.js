(() => { const G = __G, g = __game, K = G.input.keys; const v = G.player.vehicle; const out = {};
  v.pos.set(98, 0, -133); v.yaw = Math.PI / 2; v.vel.set(32, 0, 0); v.hp = v.maxHp; K.clear(); K.add('KeyW');
  let maxY = 0, air = false, maxAir = 0; for (let i = 0; i < 80; i++) { g.simulate(0.05); maxY = Math.max(maxY, v.pos.y); air = air || v.airborne; maxAir = Math.max(maxAir, v.airTime); }
  out.ramp = { maxY: maxY.toFixed(2), air, maxAir: maxAir.toFixed(2), x: v.pos.x.toFixed(1), z: v.pos.z.toFixed(1), y: v.pos.y.toFixed(2), mode: v.mode, hp: v.hp | 0, pitch: v.pitch.toFixed(2) };
  // drift retest
  v.pos.set(-750, 0, -101.75); v.yaw = Math.PI / 2; v.vel.set(0, 0, 0); v.hp = v.maxHp; if (v.mode === 'rigid') v.flipUpright(); K.clear(); K.add('KeyW'); g.simulate(3); const s0 = v.speed; K.add('KeyA'); K.add('Space'); g.simulate(0.8);
  out.drift = { before: (s0 * 3.6).toFixed(0), after: (v.speed * 3.6).toFixed(0), slip: v.slip.toFixed(1) }; K.clear();
  return JSON.stringify(out); })()
