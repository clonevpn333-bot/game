// Full-screen 2D canvas layer for the chapters that leave 3D behind (the war table, the pixel
// village, the vector sky). It sits in the HUD layer under subtitles and choices, takes its own
// mouse input, and keeps the WebGL renderer drawing an empty black scene underneath.
import * as THREE from 'three';

export function overlay2D(game, { pixel = 0, cursor = 'default' } = {}) {
  const hud = game.ui.hud('<canvas class="c2d interactive"></canvas>');
  hud.style.transition = 'opacity 1.2s';
  const canvas = hud.querySelector('canvas');
  canvas.style.cssText = `position:absolute;inset:0;width:100%;height:100%;cursor:${cursor};${pixel ? 'image-rendering:pixelated;image-rendering:crisp-edges;' : ''}`;
  const ctx = canvas.getContext('2d');
  const O = { hud, canvas, ctx, W: 0, H: 0, dpr: 1, mouse: { x: 0, y: 0, down: new Set(), pressed: new Set(), released: new Set(), wheel: 0 } };
  O.resize = () => {
    if (pixel) { O.W = pixel; O.H = Math.round(pixel * innerHeight / innerWidth); O.dpr = O.W / innerWidth; }
    else { O.dpr = Math.min(2, devicePixelRatio || 1); O.W = Math.round(innerWidth * O.dpr); O.H = Math.round(innerHeight * O.dpr); }
    canvas.width = O.W; canvas.height = O.H; ctx.imageSmoothingEnabled = !pixel;
  };
  O.resize();
  const toC = (e) => { O.mouse.x = e.clientX * (O.W / innerWidth); O.mouse.y = e.clientY * (O.H / innerHeight); };
  const on = (t, f, el = canvas) => { el.addEventListener(t, f); (O.offs ||= []).push(() => el.removeEventListener(t, f)); };
  on('mousemove', toC);
  on('mousedown', (e) => { toC(e); O.mouse.down.add(e.button); O.mouse.pressed.add(e.button); });
  on('mouseup', (e) => { toC(e); O.mouse.down.delete(e.button); O.mouse.released.add(e.button); }, window);
  on('wheel', (e) => { O.mouse.wheel += Math.sign(e.deltaY); e.preventDefault(); });
  on('contextmenu', (e) => e.preventDefault());
  on('resize', O.resize, window);
  O.endFrame = () => { O.mouse.pressed.clear(); O.mouse.released.clear(); O.mouse.wheel = 0; };
  O.dispose = () => { for (const f of O.offs || []) f(); hud.remove(); };
  // keep the 3D pipeline alive but empty
  O.scene = new THREE.Scene(); O.scene.background = new THREE.Color(0x000000);
  O.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
  game.renderer.set(O.scene, O.camera);
  return O;
}

/** Seeded random. */
export function rng(seed = 1) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
