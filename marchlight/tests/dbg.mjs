export default async ({ shot, wait, key, ev, log }) => {
  await wait(1000);
  await ev(() => { const g = __game; g.player.teleport(new (g.player.pos.constructor)(6, 0, -4), Math.PI / 2); g.camera.snapBehind(Math.PI / 2, 0.15); g.input.keys.add('KeyW'); });
  for (let i = 0; i < 6; i++) {
    await wait(150);
    log(await ev(() => { const p = __game.player; const k = p.kcc; const cols = []; for (let i = 0; i < k.numComputedCollisions(); i++) { const c = k.computedCollision(i); cols.push([c.normal1.x.toFixed(2), c.normal1.y.toFixed(2), c.normal1.z.toFixed(2), c.toi?.toFixed?.(3)]); } return { x: p.pos.x.toFixed(2), vx: p.vel.x.toFixed(2), st: p.state, cols, dt: __game.dt.toFixed(3), mv: __game.input.moveVector() }; }));
  }
};
