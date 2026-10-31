// @ts-nocheck
// Character lab: one lineup per second of time so stills can review the cast.
import { THREE, makeRenderer, makeStage, makeCamera, aim, V3 } from "./base.js";
import { clay, mesh, boxG } from "./clay.js";
import { CAST } from "./cast.js";
export function makeLab(canvas) {
  const { renderer, env } = makeRenderer(canvas, { exposure: 1.0, shadows: true });
  renderer.setClearColor(0x1a1428, 1);
  const { scene, key } = makeStage(env, { key: 2.6, keyPos: [3, 6, 6], rim: 2.0, hemi: 0.6, shadowSize: 4 });
  const floor = mesh(boxG(12, 0.2, 8, 0.05), clay(0x4a3a5a), 0, -0.1, 0); scene.add(floor);
  const cam = makeCamera(30);
  const cast = CAST();
  const names = Object.keys(cast);
  names.forEach((n) => scene.add(cast[n].root));
  return { render(T) {
    const page = Math.floor(T);
    names.forEach((n, i) => { const c = cast[n]; c.root.visible = false; });
    const sel = [[names[0], names[1], names[2]], [names[3], names[4], names[5]], [names[6], names[7], names[0]]][page % 3];
    sel.forEach((n, i) => { const c = cast[n]; if (!c) return; c.root.visible = true; c.root.position.set((i - 1) * 0.95, 0, 0); c.root.rotation.y = (i - 1) * -0.25;
      const t = T * 3; c.pose({ T: t, walk: page >= 3 ? t * 2 : null, zarms: c.zombie ? 1 : 0, smile: 0.6, open: page === 4 ? 0.8 : 0, brow: page === 4 ? 0.8 : 0, wide: page === 4 ? 1 : 0, lookX: 0.2 }); });
    const close = page >= 6;
    aim(cam, close ? V3(0, 1.62, 1.6) : V3(0, 1.2, 6.2), close ? V3(0, 1.55, 0) : V3(0, 0.95, 0), 30);
    renderer.render(scene, cam);
  } };
}
