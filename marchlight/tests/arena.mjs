export default async ({ shot, wait, key, ev, log }) => {
  const adv = (s) => ev(s => __game.advance(s), s);
  const hold = (k, s) => ev(([k, s]) => { __game.input.keys.add(k); __game.advance(s); __game.input.keys.delete(k); }, [k, s]);
  const tp = (x, y, z, yaw, pitch = 0.15) => ev(([x, y, z, yaw, pitch]) => { const g = __game; g.player.teleport(new (g.player.pos.constructor)(x, y, z), yaw); g.camera.snapBehind(yaw, pitch); }, [x, y, z, yaw, pitch]);
  const st = () => ev(() => ({ p: [__game.player.pos.x.toFixed(2), __game.player.pos.y.toFixed(2), __game.player.pos.z.toFixed(2)], s: __game.player.state }));
  await adv(0.5);
  await tp(6, 0, -4, Math.PI / 2);
  await ev(() => __game.input.keys.add('KeyW')); await adv(0.4);
  await hold('Space', 0.1); await adv(0.8); await ev(() => __game.input.keys.delete('KeyW'));
  log('mantle (expect y=2 on box)', await st()); await shot('a_mantle');
  await tp(0, 0, -10.4, Math.PI, 0.1);
  await ev(() => __game.input.keys.add('KeyW')); await hold('Space', 0.12); await adv(0.6); await ev(() => __game.input.keys.delete('KeyW'));
  log('hang (expect hang)', await st()); await shot('a_hang');
  await hold('KeyA', 0.6); log('shimmy', await st());
  await hold('Space', 0.1); await adv(1.0); log('climb up (expect y=4)', await st());
  // wall climb
  await tp(-15.5, 0, 0, -Math.PI / 2);
  await ev(() => __game.input.keys.add('KeyW')); await adv(1.2); log('wall climb?', await st()); await shot('a_wall'); await adv(4); await ev(() => __game.input.keys.delete('KeyW'));
  log('wall top (expect y=10)', await st());
  // ladder
  await tp(5, 0, -10.5, Math.PI);
  await ev(() => __game.input.keys.add('KeyW')); await adv(3); await ev(() => __game.input.keys.delete('KeyW')); log('ladder (expect y=4)', await st());
  // latch onto piston
  await tp(14, 0, 8, Math.PI / 2, -0.25);
  await adv(0.2);
  log('anchor?', await ev(() => !!__game.tether.anchor));
  await hold('KeyF', 0.1); await adv(0.6); log('latched', await st()); await shot('a_latch'); await adv(1.5); log('after latch', await st());
  // capture crate + release
  await tp(-1, 0, 9.5, Math.PI, 0.35);
  await adv(0.2); log('target', await ev(() => __game.tether.target?.label));
  await hold('KeyE', 1.5); log('cells', await ev(() => __game.tether.fill)); await shot('a_capture');
  await hold('KeyQ', 0.05); await adv(0.5); await shot('a_release');
  // combat
  await tp(0, 0, -6, Math.PI, -0.05);
  await ev(() => { __game.weapons.select('carbine'); __game.input.keys.add('Mouse2'); }); await adv(0.5);
  await ev(() => __game.input.keys.add('Mouse0')); await adv(0.8); await shot('a_fire'); await ev(() => __game.input.keys.delete('Mouse0'));
  await adv(3); await ev(() => __game.input.keys.delete('Mouse2'));
  log('enemies', await ev(() => __game.enemies.list.map(e => ({ t: e.type, hp: Math.round(e.hp), aware: e.aware }))));
  log('player hp', await ev(() => __game.player.health));
  await shot('a_combat');
};
