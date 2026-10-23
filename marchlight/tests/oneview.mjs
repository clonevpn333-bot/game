export default async ({ shot, ev, log }) => {
  const t0 = Date.now();
  await ev(() => { const g = __game; const V = g.player.pos.constructor; g.director.begin({ letterbox: false }); g.director.shot({ pos: new V(155, 1.7, -50), look: new V(155, 2.5, -90), fov: 60 }); g.advance(0.2); });
  log('advance ms', Date.now() - t0);
  const t1 = Date.now(); await shot('one'); log('shot ms', Date.now() - t1);
  const t2 = Date.now(); await shot('one2'); log('shot2 ms', Date.now() - t2);
};
