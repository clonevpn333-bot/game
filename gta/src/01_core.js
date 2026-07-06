// ============================================================================
// NEON BAY · 01_core.js — engine core: imports, math/material/texture helpers, HDR post stack, rain, storm sky
// Concatenated in order by build.mjs into one module (shared scope, no cross-imports).
// ============================================================================
// ============================================================================
//  NEON BAY — third-person open-world action game (original, GTA-inspired).
//  CARTOON / CEL-SHADED build: custom toon light-ramp materials + a depth-based
//  ink-outline & FXAA post pass + HDR bloom, purple-dusk sky, real multi-floor
//  building facades, enterable venues, cinematic dialogue, and view-frustum +
//  distance culling so heavy scenes still hold framerate. Higher-poly bouncy
//  characters with rigged procedural animation — every model is built in-engine.
// ============================================================================
import * as THREE from 'three';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const pick = a => a[(Math.random() * a.length) | 0];
const TAU = Math.PI * 2;
const PLAYER_PURPLE = 0x7b3ff2;

// ---------------------------------------------------------------------------
// Toon (cel) material system — a stepped light ramp gives banded cartoon shading.
// mat()/skinMat() whitelist props so no console spam, and everything is toon.
// ---------------------------------------------------------------------------
function toonRamp(steps) {
  // smooth, high-resolution gradient (LinearFilter) — soft cinematic shading, not hard childish cel bands;
  // a slightly deeper toe (72) and brighter shoulder (252) give moodier contrast for the neon-noir look.
  const d = new Uint8Array(steps); for (let i = 0; i < steps; i++) { const u = i / (steps - 1); d[i] = Math.round(72 + 180 * Math.pow(u, 0.9)); }
  const t = new THREE.DataTexture(d, steps, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
}
const RAMP = toonRamp(24); // retained for legacy references; PBR shading below replaces the cel look
// ---- PBR material factory: dark, gritty MeshStandardMaterial with real roughness/metalness + env reflections ----
function mat(c, o) {
  o = o || {};
  // noir palette lock: mute every surface toward grim concrete/steel (emissive stays saturated, so neon still pops)
  const col = new THREE.Color(c); if (!o.keepColor) col.offsetHSL(0, -0.32, -0.05);
  const p = { color: col, roughness: o.roughness != null ? o.roughness : 0.82, metalness: o.metalness != null ? o.metalness : 0.0, envMapIntensity: o.envMapIntensity != null ? o.envMapIntensity : 0.5 };
  for (const k of ['emissive', 'emissiveIntensity', 'map', 'emissiveMap', 'normalMap', 'roughnessMap', 'transparent', 'opacity', 'side', 'depthWrite', 'alphaTest', 'polygonOffset', 'polygonOffsetFactor', 'polygonOffsetUnits', 'vertexColors', 'flatShading']) if (o[k] !== undefined) p[k] = o[k];
  return new THREE.MeshStandardMaterial(p);
}
function skinMat(c) { const col = new THREE.Color(c); return new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: 0.0, envMapIntensity: 0.45, emissive: col.clone().multiplyScalar(0.03) }); }
// moody equirectangular env: dark sky, a dim neon horizon glow — subtle IBL + wet-surface reflections
function makeEnvTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0.0, '#04050b'); g.addColorStop(0.42, '#0a1024'); g.addColorStop(0.5, '#341f42'); g.addColorStop(0.55, '#5c3454'); g.addColorStop(0.62, '#180f24'); g.addColorStop(1.0, '#040409');
  x.fillStyle = g; x.fillRect(0, 0, 256, 128);
  const glow = ['#ff2d78', '#2df0ff', '#a855ff', '#ffd9a0'];
  for (let i = 0; i < 60; i++) { x.fillStyle = glow[i % 4]; x.globalAlpha = 0.14; x.fillRect(Math.random() * 256, 58 + Math.random() * 10, 2, 2); }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
class Input {
  constructor(canvas) {
    this.canvas = canvas; this.keys = new Set(); this.pressed = new Set();
    this.mdx = 0; this.mdy = 0; this.locked = false; this.mL = false; this.mLe = false; this.mR = false; this.wheel = 0;
    addEventListener('keydown', e => { const a = document.activeElement; if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA')) return; if (!e.repeat) { this.keys.add(e.code); this.pressed.add(e.code); } if (this.locked && ['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mL = this.mR = false; });
    canvas.addEventListener('mousedown', e => { if (!this.locked) return; if (e.button === 0) { this.mL = true; this.mLe = true; } if (e.button === 2) this.mR = true; });
    addEventListener('mouseup', e => { if (e.button === 0) this.mL = false; if (e.button === 2) this.mR = false; });
    addEventListener('contextmenu', e => e.preventDefault());
    addEventListener('mousemove', e => { if (this.locked) { this.mdx += e.movementX || 0; this.mdy += e.movementY || 0; } });
    canvas.addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); if (this.locked) e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; if (this.onLock) this.onLock(this.locked); });
  }
  k(c) { return this.keys.has(c); }
  p(c) { return this.pressed.has(c); }
  lock() { if (document.pointerLockElement === this.canvas) return; try { const r = this.canvas.requestPointerLock && this.canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
  unlock() { document.exitPointerLock && document.exitPointerLock(); }
  end() { this.pressed.clear(); this.mLe = false; this.mdx = 0; this.mdy = 0; this.wheel = 0; }
}

// ---------------------------------------------------------------------------
// Facade texture — real per-floor windows sized to the building (no squish).
// ---------------------------------------------------------------------------
const WINDOW_PALETTE = ['#ffe3ad', '#fff0d0', '#bfe6ff', '#ffcf9a', '#ecd9ff', '#c8f5e0'];
function facadeTextures(w, h, baseHex) {
  const cols = clamp(Math.round(w / 4.2), 2, 8), rows = clamp(Math.round(h / 4.0), 3, 30);
  const cw = 26, ch = 24, W = cols * cw, H = rows * ch;
  const cc = document.createElement('canvas'); cc.width = W; cc.height = H; const x = cc.getContext('2d');
  const ec = document.createElement('canvas'); ec.width = W; ec.height = H; const e = ec.getContext('2d');
  x.fillStyle = baseHex; x.fillRect(0, 0, W, H); e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  const shade = x.createLinearGradient(0, 0, W, 0); shade.addColorStop(0, 'rgba(0,0,0,0.16)'); shade.addColorStop(0.5, 'rgba(255,255,255,0.06)'); shade.addColorStop(1, 'rgba(0,0,0,0.16)');
  x.fillStyle = shade; x.fillRect(0, 0, W, H);
  for (let r = 0; r < rows; r++) {
    // floor slab band (darker) at the bottom of each storey → reads as real floors
    x.fillStyle = 'rgba(0,0,0,0.28)'; x.fillRect(0, r * ch + ch - 5, W, 5);
    x.fillStyle = 'rgba(255,255,255,0.06)'; x.fillRect(0, r * ch + ch - 6, W, 1);
    for (let c = 0; c < cols; c++) {
      const wx = c * cw + 4, wy = r * ch + 3, ww = cw - 8, wh = ch - 10;
      x.fillStyle = 'rgba(14,18,30,0.95)'; x.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
      const lit = Math.random() < 0.5; const col = lit ? pick(WINDOW_PALETTE) : 'rgba(30,40,60,0.95)';
      x.fillStyle = col; x.fillRect(wx, wy, ww, wh);
      x.fillStyle = 'rgba(255,255,255,0.14)'; x.fillRect(wx, wy, ww, Math.max(2, wh * 0.28));
      x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(wx + ww / 2 - 0.5, wy, 1, wh); // mullion
      if (lit) { e.fillStyle = col; e.fillRect(wx, wy, ww, wh); }
    }
  }
  const map = new THREE.CanvasTexture(cc); map.colorSpace = THREE.SRGBColorSpace;
  const emissive = new THREE.CanvasTexture(ec); emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive };
}
function noiseTexture(r, g, b, amt) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const d = x.createImageData(64, 64);
  for (let i = 0; i < 64 * 64; i++) { const v = (Math.random() - 0.5) * amt; d.data[i * 4] = r + v; d.data[i * 4 + 1] = g + v; d.data[i * 4 + 2] = b + v; d.data[i * 4 + 3] = 255; }
  x.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
// tiling wet-asphalt: dark speckled grain + faint cracks, so the road reads as textured tarmac under the sheen
let _asphaltTex = null;
function asphaltTexture() {
  if (_asphaltTex) return _asphaltTex;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const img = x.createImageData(S, S), d = img.data;
  for (let i = 0; i < S * S; i++) { const n = (Math.random() * 26 - 13) | 0; d[i * 4] = clamp(20 + n, 0, 255); d[i * 4 + 1] = clamp(22 + n, 0, 255); d[i * 4 + 2] = clamp(28 + n, 0, 255); d[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0);
  x.strokeStyle = 'rgba(6,7,10,0.7)'; x.lineWidth = 1.2;
  for (let i = 0; i < 16; i++) { x.beginPath(); let px = Math.random() * S, py = Math.random() * S; x.moveTo(px, py); for (let j = 0; j < 4; j++) { px += rnd(-46, 46); py += rnd(-46, 46); x.lineTo(px, py); } x.stroke(); }
  x.fillStyle = 'rgba(160,164,172,0.10)'; for (let i = 0; i < 5; i++) { const mx = Math.random() * S, my = Math.random() * S; x.beginPath(); x.arc(mx, my, rnd(3, 6), 0, TAU); x.stroke(); } // faint manhole rims
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; _asphaltTex = t; return t;
}
function signTexture(text, hex) {
  // crisp hi-res neon sign: framed panel, auto-fit weight, tube-glow + hot white core + colored rim
  const c = document.createElement('canvas'); c.width = 512; c.height = 128; const x = c.getContext('2d');
  const bg = x.createLinearGradient(0, 0, 0, 128); bg.addColorStop(0, '#100c1c'); bg.addColorStop(0.5, '#0a0714'); bg.addColorStop(1, '#05030a');
  x.fillStyle = bg; x.fillRect(0, 0, 512, 128);
  x.strokeStyle = 'rgba(255,255,255,0.14)'; x.lineWidth = 4; x.strokeRect(5, 5, 502, 118);
  x.strokeStyle = hex; x.globalAlpha = 0.35; x.lineWidth = 2; x.strokeRect(10, 10, 492, 108); x.globalAlpha = 1;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  let fs = 78; do { x.font = '900 ' + fs + 'px "Arial Black", Arial, sans-serif'; fs -= 4; } while (x.measureText(text).width > 462 && fs > 20);
  x.shadowColor = hex; x.shadowBlur = 38; x.fillStyle = hex; x.fillText(text, 256, 67); x.fillText(text, 256, 67);
  x.shadowBlur = 12; x.fillStyle = '#ffffff'; x.fillText(text, 256, 65);
  x.shadowBlur = 0; x.lineWidth = 2.2; x.strokeStyle = hex; x.globalAlpha = 0.9; x.strokeText(text, 256, 65); x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
let _blobTex = null;
function blobTexture() {
  if (_blobTex) return _blobTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(0,0,0,0.32)'); g.addColorStop(0.7, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); _blobTex = new THREE.CanvasTexture(c); return _blobTex;
}
function makeBlob(r) { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.04; m.renderOrder = 1; return m; }
// soft white radial glow (tinted per-mesh) — the wet-asphalt light pool cast by every streetlamp/neon
let _glowTex = null;
function glowTexture() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 1, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128); _glowTex = new THREE.CanvasTexture(c); _glowTex.colorSpace = THREE.SRGBColorSpace; return _glowTex;
}
// a flat, additive pool of light on the ground — reads as a reflection of the lamp on the wet road
function lightPool(r, hex, opacity) { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: glowTexture(), color: hex, transparent: true, opacity: opacity == null ? 0.8 : opacity, blending: THREE.AdditiveBlending, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.09; m.renderOrder = 2; return m; }

// ---------------------------------------------------------------------------
// Post — HDR bloom + depth-based ink outline + FXAA (cartoon look, one chain).
// Robust fallbacks: no float RT -> plain render; no depth -> bloom without ink.
// ---------------------------------------------------------------------------
const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
class Post {
  constructor(renderer, scene, camera) {
    this.renderer = renderer; this.scene = scene; this.camera = camera; this.enabled = true; this.outline = true;
    this.geo = new THREE.PlaneGeometry(2, 2);
    this.fsScene = new THREE.Scene(); this.fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial()); this.fsScene.add(this.quad);
    this.brightMat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, threshold: { value: 1.0 } }, vertexShader: VERT, fragmentShader: `
      uniform sampler2D tDiffuse; uniform float threshold; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126,0.7152,0.0722));
        float k = smoothstep(threshold, threshold + 0.7, l); gl_FragColor = vec4(c * k, 1.0); }` });
    this.blurMat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } }, vertexShader: VERT, fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;
      void main(){ vec3 s = texture2D(tDiffuse, vUv).rgb * 0.227027;
        s += texture2D(tDiffuse, vUv + dir).rgb * 0.1945946; s += texture2D(tDiffuse, vUv - dir).rgb * 0.1945946;
        s += texture2D(tDiffuse, vUv + dir*2.0).rgb * 0.1216216; s += texture2D(tDiffuse, vUv - dir*2.0).rgb * 0.1216216;
        s += texture2D(tDiffuse, vUv + dir*3.0).rgb * 0.054054;  s += texture2D(tDiffuse, vUv - dir*3.0).rgb * 0.054054;
        gl_FragColor = vec4(s, 1.0); }` });
    this.compMat = new THREE.ShaderMaterial({ uniforms: {
        tScene: { value: null }, tBloom: { value: null }, tDepth: { value: null }, texel: { value: new THREE.Vector2() },
        strength: { value: 0.8 }, exposure: { value: 1.4 }, near: { value: 0.1 }, far: { value: 1100 }, ink: { value: 1.0 }, grainT: { value: 0 } }, vertexShader: VERT, fragmentShader: `
      uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tDepth; uniform vec2 texel;
      uniform float strength, exposure, near, far, ink, grainT; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
      float lin(vec2 uv){ float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return (2.0*near*far)/(far+near - z*(far-near)); }
      float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
      void main(){
        // slight chromatic aberration toward the edges (sampled from the scene buffer)
        vec2 q = vUv - 0.5; float rq = length(q); vec2 ca = q * rq * 0.006;
        vec3 sc = vec3(texture2D(tScene, vUv + ca).r, texture2D(tScene, vUv).g, texture2D(tScene, vUv - ca).b);
        vec3 col = sc + texture2D(tBloom, vUv).rgb * strength;
        col *= exposure; col = aces(col);
        if (ink > 0.5) {
          float d = lin(vUv);
          float e = abs(d-lin(vUv+vec2(texel.x,0.0))) + abs(d-lin(vUv-vec2(texel.x,0.0))) + abs(d-lin(vUv+vec2(0.0,texel.y))) + abs(d-lin(vUv-vec2(0.0,texel.y)));
          float edge = smoothstep(0.22, 1.0, e / max(d,1.0) * 95.0);
          if (d < far*0.9) col *= 1.0 - edge*0.92;
        }
        // ---- NOIR GRADE: desaturate, crush blacks, teal-shadow / amber-highlight split-tone, heavy vignette, film grain ----
        float luma = dot(col, vec3(0.2126,0.7152,0.0722));
        col = mix(vec3(luma), col, 0.72);                                   // pull a little saturation out (keep neon readable)
        col = clamp(col - 0.006, 0.0, 1.0) * 1.02;                          // barely crush blacks — the night is dark enough
        vec3 shadowTint = vec3(0.88, 1.0, 1.08), highTint = vec3(1.08, 1.02, 0.90);
        col *= mix(shadowTint, highTint, smoothstep(0.02, 0.62, luma));     // teal-shadow / amber-highlight split-tone
        float vig = smoothstep(1.2, 0.3, rq); col *= mix(0.74, 1.0, vig);   // gentle vignette — the frame stays readable to the edges
        float grain = (hash(vUv * vec2(1920.0,1080.0) + grainT) - 0.5) * 0.008;
        col += grain * (0.3 + luma * 0.7);                                  // very fine grain that FADES OUT in shadows (no mud in the dark)
        gl_FragColor = vec4(pow(clamp(col,0.0,1.0), vec3(1.0/2.2)), 1.0); }` });
    this.fxaaMat = new THREE.ShaderMaterial({ uniforms: { tDiffuse: { value: null }, texel: { value: new THREE.Vector2() } }, vertexShader: VERT, fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 texel; varying vec2 vUv;
      float lm(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
      void main(){
        vec3 m=texture2D(tDiffuse,vUv).rgb, nw=texture2D(tDiffuse,vUv+vec2(-1,-1)*texel).rgb, ne=texture2D(tDiffuse,vUv+vec2(1,-1)*texel).rgb, sw=texture2D(tDiffuse,vUv+vec2(-1,1)*texel).rgb, se=texture2D(tDiffuse,vUv+vec2(1,1)*texel).rgb;
        float lM=lm(m),lNW=lm(nw),lNE=lm(ne),lSW=lm(sw),lSE=lm(se);
        float lMin=min(lM,min(min(lNW,lNE),min(lSW,lSE))), lMax=max(lM,max(max(lNW,lNE),max(lSW,lSE)));
        vec2 dir=vec2(-((lNW+lNE)-(lSW+lSE)), ((lNW+lSW)-(lNE+lSE)));
        float red=max((lNW+lNE+lSW+lSE)*0.25*0.125, 1.0/128.0), rcp=1.0/(min(abs(dir.x),abs(dir.y))+red);
        dir=clamp(dir*rcp,-8.0,8.0)*texel;
        vec3 a=0.5*(texture2D(tDiffuse,vUv+dir*(1.0/3.0-0.5)).rgb+texture2D(tDiffuse,vUv+dir*(2.0/3.0-0.5)).rgb);
        vec3 b=a*0.5+0.25*(texture2D(tDiffuse,vUv-dir*0.5).rgb+texture2D(tDiffuse,vUv+dir*0.5).rgb);
        float lB=lm(b); gl_FragColor=vec4((lB<lMin||lB>lMax)?a:b,1.0); }` });
    try { this._alloc(); } catch (e) { console.warn('[post] disabled:', e && e.message); this.enabled = false; }
  }
  _alloc() {
    const pr = this.renderer.getPixelRatio(); this.W = Math.max(2, Math.floor(innerWidth * pr)); this.H = Math.max(2, Math.floor(innerHeight * pr));
    const hw = Math.max(1, this.W >> 1), hh = Math.max(1, this.H >> 1); this.hw = hw; this.hh = hh;
    const opt = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.sceneRT = new THREE.WebGLRenderTarget(this.W, this.H, opt);
    try { this.sceneRT.depthTexture = new THREE.DepthTexture(this.W, this.H); this.sceneRT.depthTexture.type = THREE.UnsignedIntType; this.outline = true; } catch (e) { this.outline = false; }
    this.rtA = new THREE.WebGLRenderTarget(hw, hh, opt); this.rtB = new THREE.WebGLRenderTarget(hw, hh, opt);
    this.ldrRT = new THREE.WebGLRenderTarget(this.W, this.H, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  }
  setSize() { if (!this.enabled) return; for (const rt of [this.sceneRT, this.rtA, this.rtB, this.ldrRT]) rt.dispose(); this._alloc(); }
  _pass(mat, target) { this.quad.material = mat; this.renderer.setRenderTarget(target); this.renderer.clear(); this.renderer.render(this.fsScene, this.fsCam); }
  render() {
    const r = this.renderer;
    if (!this.enabled) { r.setRenderTarget(null); r.render(this.scene, this.camera); return; }
    r.setRenderTarget(this.sceneRT); r.clear(); r.render(this.scene, this.camera);
    this.brightMat.uniforms.tDiffuse.value = this.sceneRT.texture; this._pass(this.brightMat, this.rtA);
    let read = this.rtA, write = this.rtB;
    for (const radius of [1.5, 3]) {
      this.blurMat.uniforms.tDiffuse.value = read.texture; this.blurMat.uniforms.dir.value.set(radius / this.hw, 0); this._pass(this.blurMat, write); let t = read; read = write; write = t;
      this.blurMat.uniforms.tDiffuse.value = read.texture; this.blurMat.uniforms.dir.value.set(0, radius / this.hh); this._pass(this.blurMat, write); t = read; read = write; write = t;
    }
    const cu = this.compMat.uniforms; cu.tScene.value = this.sceneRT.texture; cu.tBloom.value = read.texture;
    cu.tDepth.value = this.outline ? this.sceneRT.depthTexture : null; cu.ink.value = this.outline ? 1.0 : 0.0;
    cu.texel.value.set(1 / this.W, 1 / this.H); cu.near.value = this.camera.near; cu.far.value = this.camera.far; cu.grainT.value = (performance.now() * 0.001) % 100;
    this._pass(this.compMat, this.ldrRT);
    this.fxaaMat.uniforms.tDiffuse.value = this.ldrRT.texture; this.fxaaMat.uniforms.texel.value.set(1 / this.W, 1 / this.H);
    this.quad.material = this.fxaaMat; r.setRenderTarget(null); r.render(this.fsScene, this.fsCam);
  }
}

// ---------------------------------------------------------------------------
// Rain — a persistent field of stretched vertical streaks that follows the camera.
// One THREE.Points buffer of N drops recycled around a box; density set by weather.
// ---------------------------------------------------------------------------
function makeRain(N) {
  // each drop is a short vertical line segment (2 verts) so it reads as a streak, not a dot
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(N * 6), vel = new Float32Array(N);
  const R = 88, TOP = 62, LEN = 1.5;
  for (let i = 0; i < N; i++) {
    const x = rnd(-R, R), y = rnd(0, TOP), z = rnd(-R, R);
    pos[i * 6] = x; pos[i * 6 + 1] = y; pos[i * 6 + 2] = z;
    pos[i * 6 + 3] = x + rnd(-0.06, 0.06); pos[i * 6 + 4] = y - LEN; pos[i * 6 + 5] = z;
    vel[i] = rnd(58, 88);
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat2 = new THREE.LineBasicMaterial({ color: 0xc2dcf2, transparent: true, opacity: 0.42, depthWrite: false });
  const pts = new THREE.LineSegments(geo, mat2); pts.frustumCulled = false; pts.renderOrder = 2;
  return { pts, geo, pos, vel, N, R, TOP, LEN, mat: mat2 };
}
// ---------------------------------------------------------------------------
// Sky — clear blue daytime dome + sun disc + drifting clouds (follows camera).
// ---------------------------------------------------------------------------
function makeSky() {
  // permanent storm night: a near-black vertical gradient to a faint desaturated-blue horizon glow, no sun.
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x05060a) }, mid: { value: new THREE.Color(0x080a12) }, hor: { value: new THREE.Color(0x0d1018) }, bot: { value: new THREE.Color(0x07090f) } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 bot; varying vec3 vDir;
      void main(){ float h = vDir.y; vec3 c; if (h>0.0){ float t=pow(clamp(h,0.0,1.0),0.7); c=mix(mix(hor,mid,smoothstep(0.0,0.22,h)),top,t);} else { c=mix(hor,bot,pow(clamp(-h,0.0,1.0),0.5)); } gl_FragColor=vec4(c,1.0);} `,
  });
  const g = new THREE.Group(); g.renderOrder = -2; g.frustumCulled = false;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(760, 32, 16), mat); dome.renderOrder = -2; dome.frustumCulled = false; g.add(dome);
  // low, dark storm banding drifting across the sky (no sun disc)
  const clouds = new THREE.Group(); g.add(clouds);
  const cmat = new THREE.MeshBasicMaterial({ color: 0x0a0d15, transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 18; i++) {
    const puff = new THREE.Group();
    for (let j = 0; j < 3 + (Math.random() * 3 | 0); j++) { const s = new THREE.Mesh(new THREE.SphereGeometry(rnd(24, 46), 12, 8), cmat); s.position.set(rnd(-42, 42), rnd(-6, 6), rnd(-18, 18)); s.scale.set(1, 0.4, 1); puff.add(s); }
    puff.position.set(rnd(-700, 700), rnd(120, 210), rnd(-700, 700)); clouds.add(puff);
  }
  g.userData.clouds = clouds; return g;
}

// ---------------------------------------------------------------------------
// City — grouped, cullable buildings; real facades; enterable venues.
// ---------------------------------------------------------------------------
const FACADES = [0x9aa2b0, 0xa892b0, 0xb8ab94, 0x7f96a4, 0xc98f9a, 0x8fb0a0, 0xcabfb2, 0x9c8fc0, 0xd08a6a, 0x6fa0c0];
const NEONS = [0xff3d9a, 0x2fe6ff, 0xffe24a, 0x9b5cff, 0x4dff9e, 0xff7a3d];
const VENUE_NAMES = { club: ['PULSE', 'MIRAGE', 'VICE', 'AZURE', 'SABLE', 'HALO'], hotel: ['BAYVIEW', 'ROYALE', 'ORCHID', 'MARLIN', 'SUNSET'], diner: ["MEL'S", 'STARLITE', 'CHROME', 'THE PIER'], shop: ['24/7', 'PAWN', 'LIQUOR', 'THREADS', 'AMMU-BAY'] };
const BIZ = ['DELI', 'NAILS', 'TACOS', 'LAUNDRY', 'BOOKS', 'COFFEE', 'BARBER', 'PHARMACY', 'MOTORS', 'VINYL', 'PIZZA', 'BODEGA', 'GYM', 'BANK', 'SUSHI', 'RAMEN', 'FLORIST', 'ARCADE', 'MOTEL', 'MARKET', 'SUBS', 'BURGERS', 'TATTOO', 'NOODLES', 'TOYS', 'SHOES', 'WINE', 'KEYS', 'PRINTS', 'DONUTS', 'THRIFT', 'CIGARS'];
const SHOP_COLS = [0xc86a4a, 0x5a86c0, 0xc04a5a, 0x4aa080, 0xc9a23a, 0x8a5ac0, 0xa0a6ae, 0xd08a9a, 0x3a9a9a, 0xd0783a, 0x6a7a8a, 0xb85a86];
const WIN_GLOW = [0xffe3ad, 0xbfe6ff, 0xffcf9a, 0xc8f5e0, 0xecd9ff];

// ============================================================================
// RoadNetwork — Stage 1 of the organic-city migration.
// An agent-grown (Parish–Müller style) node/edge road GRAPH that replaces the
// uniform grid. Deterministic from a single seed. Nothing here quantizes to a
// grid: node positions are free-form world coords, roads are chained segments
// that curve as the growth agents steer along a density field and the coast.
// Downstream systems (car AI, lights, missions, minimap) will be ported onto
// this in later stages; for now it is a self-contained, testable generator.
// ============================================================================
