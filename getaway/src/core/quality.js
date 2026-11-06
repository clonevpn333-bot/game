// GETAWAY! — graphics presets and first-run hardware detection. Everything that would need a shader rebuild
// (shadows on/off, interior-mapped windows, bloom) is decided here once, at boot, so nothing recompiles mid-game.
// The adaptive governor (perf.js) then fine-tunes resolution and sheds cheap effects at run time.
export const PRESETS = {
  minimum: { pr: 0.62, shadows: false, shadowMap: 512, shadowRange: 30, bloom: false, interior: false, viewFar: 600, treeD: 170, propD: 95, smallD: 55, peds: 0.3, traffic: 0.45, humanLodD: 16, carDetailD: 32, shadowEvery: 3, cityChunk: 500 },
  //        render scale  shadows / map / range         post   3D rooms    view (m)   cull distances (m)                 crowd      traffic   detail LODs (m)
  low:    { pr: 0.72, shadows: true, shadowMap: 512, shadowRange: 34, bloom: false, interior: false, viewFar: 700, treeD: 210, propD: 115, smallD: 55, peds: 0.4, traffic: 0.55, humanLodD: 20, carDetailD: 40, shadowEvery: 3, cityChunk: 450 },
  medium: { pr: 0.9, shadows: true, shadowMap: 1024, shadowRange: 55, bloom: true, interior: true, viewFar: 1150, treeD: 320, propD: 180, smallD: 85, peds: 0.7, traffic: 0.8, humanLodD: 30, carDetailD: 70, shadowEvery: 2, cityChunk: 340 },
  high:   { pr: 1.25, shadows: true, shadowMap: 2048, shadowRange: 80, bloom: true, interior: true, viewFar: 2000, treeD: 400, propD: 230, smallD: 130, peds: 1, traffic: 1, humanLodD: 45, carDetailD: 110, shadowEvery: 1, cityChunk: 240 },
  ultra:  { pr: 2, shadows: true, shadowMap: 2048, shadowRange: 100, bloom: true, interior: true, viewFar: 3200, treeD: 700, propD: 360, smallD: 200, peds: 1, traffic: 1, humanLodD: 60, carDetailD: 160, shadowEvery: 1, cityChunk: 200 },
};
export const QUALITY_NAMES = ['auto', 'minimum', 'low', 'medium', 'high', 'ultra'];

// best guess at what this machine can take: GPU name (WebGL), CPU cores, memory, mobile
export function detectQuality() {
  let r = '';
  try { const c = document.createElement('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl'); if (gl) { const ext = gl.getExtension('WEBGL_debug_renderer_info'); r = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER) || ''); const lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); } } catch (e) {}
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4; const mobile = /Android|iPhone|iPad|iPod|Mobile|CrOS/i.test(navigator.userAgent || '');
  let q;
  if (/swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(r)) q = 'minimum';
  else if (mobile) q = 'minimum';
  else if (/intel/i.test(r)) q = /iris.{0,6}xe|\barc\b/i.test(r) && cores >= 8 ? 'medium' : 'low';
  else if (/apple (m\d|gpu)/i.test(r)) q = cores >= 8 ? 'high' : 'medium';
  else if (/nvidia|geforce|rtx|gtx|quadro|radeon rx|radeon pro/i.test(r)) q = cores >= 6 && mem >= 8 ? 'high' : 'medium';
  else if (/radeon|vega|amd/i.test(r)) q = 'medium';
  else q = cores <= 4 || mem <= 4 ? 'low' : 'medium';
  return { quality: q, gpu: r, cores, mem };
}
// resolve the setting ('auto' or a fixed level) into a level + its preset
export function resolveQuality(setting) { const d = setting === 'auto' || !PRESETS[setting] ? detectQuality() : { quality: setting }; return { level: d.quality, preset: { ...PRESETS[d.quality] }, detected: d }; }
