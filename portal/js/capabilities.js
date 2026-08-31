/**
 * Device + renderer capability detection (§1.3).
 *
 * Canonical implementation: games are told their tier by the portal in
 * `portal:hello` and never probe for themselves when embedded.
 *
 * Probing costs one throwaway GL context. Browsers cap live contexts at ~16
 * and drop the oldest silently, so every probe context is explicitly lost
 * before this module returns.
 */

export const TIER_RANK = { canvas2d: 0, webgl1: 1, webgl2: 2 };
export const TIER_LABEL = { canvas2d: '2D Canvas', webgl1: 'WebGL 1', webgl2: 'WebGL 2' };

let cached = null;

function loseContext(gl) {
  if (!gl) return;
  try {
    const ext = gl.getExtension('WEBGL_lose_context');
    if (ext) ext.loseContext();
  } catch { /* already gone */ }
}

function tryContext(canvas, type, attrs) {
  try { return canvas.getContext(type, attrs); } catch { return null; }
}

function rendererString(gl) {
  try {
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    if (dbg) return String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '');
    return String(gl.getParameter(gl.RENDERER) || '');
  } catch { return ''; }
}

/** Software rasterisers report as WebGL2-capable but cannot hold 30 fps on a
 *  real 3D scene; treat them as a reason to warn, not to hard-refuse. */
function isSoftware(renderer) {
  return /swiftshader|llvmpipe|software|basic render|microsoft basic/i.test(renderer);
}

export function detect({ force = false } = {}) {
  if (cached && !force) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const attrs = { antialias: false, alpha: false, depth: true, powerPreference: 'low-power' };

  let tier = 'canvas2d';
  let maxTextureSize = 0;
  let renderer = '';
  let instancing = false;

  const gl2 = tryContext(canvas, 'webgl2', attrs);
  if (gl2) {
    tier = 'webgl2';
    maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE) | 0;
    renderer = rendererString(gl2);
    instancing = true;
    loseContext(gl2);
  } else {
    const gl1 = tryContext(canvas, 'webgl', attrs) || tryContext(canvas, 'experimental-webgl', attrs);
    if (gl1) {
      tier = 'webgl1';
      maxTextureSize = gl1.getParameter(gl1.MAX_TEXTURE_SIZE) | 0;
      renderer = rendererString(gl1);
      instancing = !!gl1.getExtension('ANGLE_instanced_arrays');
      loseContext(gl1);
    } else if (!tryContext(canvas, '2d')) {
      tier = 'none';
    }
  }

  const offscreen = typeof OffscreenCanvas !== 'undefined';
  cached = {
    tier,
    renderer,
    software: isSoftware(renderer),
    maxTextureSize,
    instancing,
    offscreenCanvas: offscreen,
    // Worker rendering needs the transfer path, not just the constructor.
    workerRendering: offscreen && typeof HTMLCanvasElement !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.transferControlToOffscreen === 'function' &&
      typeof Worker !== 'undefined',
    pointerLock: typeof document.body?.requestPointerLock === 'function' ||
      typeof Element.prototype.requestPointerLock === 'function',
    deviceMemory: navigator.deviceMemory || null,
    cores: navigator.hardwareConcurrency || null,
    dpr: window.devicePixelRatio || 1,
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    heapLimitMB: performance.memory ? Math.round(performance.memory.jsHeapSizeLimit / 1048576) : null,
    serviceWorker: 'serviceWorker' in navigator,
    storage: 'storage' in navigator && 'estimate' in navigator.storage,
  };
  return cached;
}

export function meetsTier(available, required) {
  const a = TIER_RANK[available];
  const r = TIER_RANK[required];
  if (a === undefined) return false;
  if (r === undefined) return true;
  return a >= r;
}

/**
 * Memory headroom check. The tab ceiling on a 4 GB device is ~1-1.5 GB
 * (§0), so a title advertising more than the remaining headroom is a warning,
 * never a hard block: estMemoryMB is an estimate and devices lie.
 */
export function memoryHeadroom(estMemoryMB) {
  const caps = detect();
  const limit = caps.heapLimitMB || (caps.deviceMemory ? caps.deviceMemory * 256 : 1024);
  const used = performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0;
  const free = Math.max(0, limit - used);
  return { limitMB: Math.round(limit), usedMB: Math.round(used), freeMB: Math.round(free), tight: estMemoryMB > free * 0.8 };
}

export async function storageInfo() {
  if (!navigator.storage?.estimate) return null;
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    return { usage, quota, pct: quota ? usage / quota : 0 };
  } catch { return null; }
}

export function heapMB() {
  return performance.memory ? performance.memory.usedJSHeapSize / 1048576 : null;
}
