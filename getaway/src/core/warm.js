import { G } from './context.js';

// Compile every shader the game can need, in the exact variant it is drawn with (into the post-processing target,
// with shadows). A program first compiled mid-game blocks the browser for seconds on many GPUs = the "freeze".
export function warmShaders(extra = null) {
  const R = G.renderer; const hidden = [], culled = [];
  G.scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });
  if (extra) extra.traverse((o) => { if (o.frustumCulled) { culled.push(o); o.frustumCulled = false; } });
  const prev = R.getRenderTarget();
  try { R.setRenderTarget(G.composer.readBuffer); R.compile(G.scene, G.camera); } catch (e) { console.warn('shader warm-up', e); }
  R.setRenderTarget(prev);
  if (extra) try { R.shadowMap.needsUpdate = true; G.composer.render(0); } catch (e) { console.warn('warm frame', e); } // shadow/depth variants too
  for (const o of hidden) o.visible = false; for (const o of culled) o.frustumCulled = true;
}
// cheap top-up after a mission checkpoint spawns its set pieces: only programs that don't exist yet get compiled
export function warmNew() { const R = G.renderer; if (!R || !G.composer) return; const prev = R.getRenderTarget(); try { R.setRenderTarget(G.composer.readBuffer); R.compile(G.scene, G.camera); } catch (e) {} R.setRenderTarget(prev); }
