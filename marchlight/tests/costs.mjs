// Relative render cost of features: times engine.render with each toggled off.
export default async ({ ev, log }) => {
  const adv = (s) => ev(s => __game.advance(s), s);
  await adv(4);
  const r = await ev(() => {
    const g = __game, e = g.engine, sc = e.scene;
    const gl = e.renderer.getContext(), px = new Uint8Array(4);
    const sync = () => gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); // forces the GPU to finish
    const time = (n = 2) => { e.render(1 / 60); sync(); const t = performance.now(); for (let i = 0; i < n; i++) { e.render(1 / 60); sync(); } return +((performance.now() - t) / n).toFixed(0); };
    const out = {};
    out.base = time();
    const chars = []; sc.traverse(o => { if (o.isSkinnedMesh) chars.push(o); });
    const charVis = chars.map(o => o.visible);
    chars.forEach(o => o.visible = false); out.noChars = time(); chars.forEach((o, i) => o.visible = charVis[i]);
    e.renderer.shadowMap.enabled = false; sc.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); out.noShadows = time(); e.renderer.shadowMap.enabled = true; sc.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); time(1);
    const gm = g.ground.mesh; gm.visible = false; out.noTerrain = time(); gm.visible = true;
    if (e.bloom) { e.bloom.enabled = false; out.noBloom = time(); e.bloom.enabled = true; }
    const pls = []; sc.traverse(o => { if (o.isPointLight) pls.push(o); }); out.pointLights = pls.length;
    pls.forEach(l => l.visible = false); sc.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); out.noPointLights = time(); pls.forEach(l => l.visible = true); sc.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); });
    const keep = e.renderer.getPixelRatio(); e.renderer.setPixelRatio(keep * 0.5); e.setSize?.(innerWidth, innerHeight); out.halfRes = time(); e.renderer.setPixelRatio(keep); e.setSize?.(innerWidth, innerHeight);
    return out;
  });
  log(JSON.stringify(r));
};
