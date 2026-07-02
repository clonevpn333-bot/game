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
  const d = new Uint8Array(steps); for (let i = 0; i < steps; i++) d[i] = Math.round(95 + 160 * (i / (steps - 1)));
  const t = new THREE.DataTexture(d, steps, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true; return t;
}
const RAMP = toonRamp(4);
function mat(c, o) {
  o = o || {}; const p = { color: c, gradientMap: RAMP };
  for (const k of ['emissive', 'emissiveIntensity', 'map', 'emissiveMap', 'transparent', 'opacity', 'side', 'depthWrite', 'alphaTest']) if (o[k] !== undefined) p[k] = o[k];
  return new THREE.MeshToonMaterial(p);
}
function skinMat(c) { const col = new THREE.Color(c); return new THREE.MeshToonMaterial({ color: c, gradientMap: RAMP, emissive: col.clone().multiplyScalar(0.08) }); }

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
  lock() { this.canvas.requestPointerLock && this.canvas.requestPointerLock(); }
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
function signTexture(text, hex) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#08060e'; x.fillRect(0, 0, 256, 64);
  x.font = '900 40px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.shadowColor = hex; x.shadowBlur = 22; x.fillStyle = hex; x.fillText(text, 128, 34);
  x.fillStyle = '#fff'; x.shadowBlur = 8; x.fillText(text, 128, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let _blobTex = null;
function blobTexture() {
  if (_blobTex) return _blobTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(0,0,0,0.5)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); _blobTex = new THREE.CanvasTexture(c); return _blobTex;
}
function makeBlob(r) { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.04; m.renderOrder = 1; return m; }

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
        strength: { value: 0.8 }, exposure: { value: 1.4 }, near: { value: 0.1 }, far: { value: 1100 }, ink: { value: 1.0 } }, vertexShader: VERT, fragmentShader: `
      uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tDepth; uniform vec2 texel;
      uniform float strength, exposure, near, far, ink; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
      float lin(vec2 uv){ float z = texture2D(tDepth, uv).x * 2.0 - 1.0; return (2.0*near*far)/(far+near - z*(far-near)); }
      void main(){
        vec3 col = texture2D(tScene, vUv).rgb + texture2D(tBloom, vUv).rgb * strength;
        col *= exposure; col = aces(col);
        if (ink > 0.5) {
          float d = lin(vUv);
          float e = abs(d-lin(vUv+vec2(texel.x,0.0))) + abs(d-lin(vUv-vec2(texel.x,0.0))) + abs(d-lin(vUv+vec2(0.0,texel.y))) + abs(d-lin(vUv-vec2(0.0,texel.y)));
          float edge = smoothstep(0.22, 1.0, e / max(d,1.0) * 95.0);
          if (d < far*0.9) col *= 1.0 - edge*0.92;
        }
        vec2 q = vUv - 0.5; float vig = smoothstep(0.95, 0.28, length(q)); col *= mix(0.7, 1.0, vig);
        col = mix(col, col * vec3(1.05, 0.98, 1.09), 0.35);
        gl_FragColor = vec4(pow(col, vec3(1.0/2.2)), 1.0); }` });
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
    cu.texel.value.set(1 / this.W, 1 / this.H); cu.near.value = this.camera.near; cu.far.value = this.camera.far;
    this._pass(this.compMat, this.ldrRT);
    this.fxaaMat.uniforms.tDiffuse.value = this.ldrRT.texture; this.fxaaMat.uniforms.texel.value.set(1 / this.W, 1 / this.H);
    this.quad.material = this.fxaaMat; r.setRenderTarget(null); r.render(this.fsScene, this.fsCam);
  }
}

// ---------------------------------------------------------------------------
// Sky — purple twilight dome (fog-independent), follows the camera.
// ---------------------------------------------------------------------------
function makeSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x140b32) }, mid: { value: new THREE.Color(0x5a2c76) }, hor: { value: new THREE.Color(0xd57390) }, bot: { value: new THREE.Color(0x1c0f2e) } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 bot; varying vec3 vDir;
      void main(){ float h = vDir.y; vec3 c; if (h>0.0){ float t=pow(clamp(h,0.0,1.0),0.55); c=mix(mix(hor,mid,smoothstep(0.0,0.16,h)),top,t);} else { c=mix(hor,bot,pow(clamp(-h,0.0,1.0),0.5)); } gl_FragColor=vec4(c,1.0);} `,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(760, 32, 16), mat); m.renderOrder = -1; m.frustumCulled = false; return m;
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
class City {
  constructor(scene) {
    this.scene = scene; this.boxes = []; this.shops = []; this.clubs = []; this.cullables = []; this.size = 0;
    this.group = new THREE.Group(); scene.add(this.group);
    this.build();
  }
  build() {
    const N = 7, LOT = 46, ROAD = 20, CELL = LOT + ROAD;
    const span = N * CELL; this.size = span; this.cell = CELL; this.lot = LOT; this.road = ROAD; this.n = N;
    const half = span / 2;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(span + 700, span + 700), mat(0x6a6c76, { map: noiseTexture(70, 72, 82, 14) }));
    ground.material.map.repeat.set(70, 70); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; this.group.add(ground);
    const roadMat = mat(0x4a4c58, { map: noiseTexture(46, 48, 58, 10), emissive: 0x0a0b13, emissiveIntensity: 1 }); roadMat.map.repeat.set(2, 46);
    const yellow = mat(0xffe14a, { emissive: 0xffd23a, emissiveIntensity: 1.0 }); const white = mat(0xe8ecf2, { emissive: 0x8a8f98, emissiveIntensity: 0.5 });
    for (let i = 0; i <= N; i++) { const rc = -half + i * CELL; this._road(rc, 0, ROAD, span + ROAD, roadMat, yellow, white, true); this._road(0, rc, span + ROAD, ROAD, roadMat, yellow, white, false); }
    let seed = 1234567; const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const curbMat = mat(0x9aa0aa), walkMat = mat(0x7f858f, { map: noiseTexture(120, 124, 132, 10) }); walkMat.map.repeat.set(6, 6);
    for (let ix = 0; ix < N; ix++) for (let iz = 0; iz < N; iz++) {
      const cx = -half + ix * CELL + ROAD + LOT / 2, cz = -half + iz * CELL + ROAD + LOT / 2;
      // raised sidewalk (lot-wide, does not cover the road) + curb ring at the road edges
      const sw = new THREE.Mesh(new THREE.BoxGeometry(LOT, 0.22, LOT), walkMat.clone()); sw.material.map = walkMat.map; sw.position.set(cx, 0.11, cz); sw.receiveShadow = true; this.group.add(sw);
      for (const e of [[LOT, 0.6, 0, -LOT / 2], [LOT, 0.6, 0, LOT / 2], [0.6, LOT, -LOT / 2, 0], [0.6, LOT, LOT / 2, 0]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(e[0], 0.34, e[1]), curbMat); c.position.set(cx + e[2], 0.17, cz + e[3]); this.group.add(c); }
      const G = new THREE.Group(); this.group.add(G); this.cullables.push({ o: G, p: new THREE.Vector3(cx, 26, cz), r: 100 });
      const r = rng();
      if (r < 0.12) this._park(cx, cz, LOT, rng, G);
      else if (r < 0.40) { const type = ['club', 'hotel', 'diner', 'shop', 'club', 'shop', 'diner', 'club'][(rng() * 8) | 0]; this._venue(cx, cz, LOT, type, rng, G); }
      else if (r < 0.66) this._tower(cx, cz, LOT - 12, LOT - 14, 42 + rng() * 96, FACADES[(rng() * FACADES.length) | 0], rng, G); // standalone enterable high-rise facing the street
      else this._block(cx, cz, LOT, rng, G);   // mixed block: rows of small shops + central towers
      this._props(cx, cz, LOT, rng, G);         // street furniture on every block
    }
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) this._lamp(-half + i * CELL + ROAD / 2, -half + j * CELL + ROAD / 2);
    const water = new THREE.Mesh(new THREE.PlaneGeometry(span + 900, 400), mat(0x1a2f5a, { emissive: 0x1a2a52, emissiveIntensity: 0.8, transparent: true, opacity: 0.92 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.06, half + 280); this.group.add(water); this.water = water;
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(span + 900, 160), mat(0xd6c493)); sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.03, half + 90); this.group.add(sand);
    for (let i = 0; i < 10; i++) this.palm(rnd(-half + 20, half - 20), half + 46 + rnd(0, 28), this.group);
  }
  _road(x, z, w, d, roadMat, yellow, white, vertical) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), roadMat); r.position.set(x, 0.07, z); r.receiveShadow = true; this.group.add(r);
    const len = vertical ? d : w, dash = 3.2, gap = 4.2, n = Math.floor(len / (dash + gap));
    for (let i = 0; i < n; i++) { const o = -len / 2 + i * (dash + gap) + dash / 2; const seg = new THREE.Mesh(new THREE.BoxGeometry(vertical ? 0.35 : dash, 0.02, vertical ? dash : 0.35), yellow); seg.position.set(vertical ? x : x + o, 0.17, vertical ? z + o : z); this.group.add(seg); }
    for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(vertical ? 0.2 : len, 0.02, vertical ? len : 0.2), white); e.position.set(vertical ? x + s * (w / 2 - 1.4) : x, 0.16, vertical ? z : z + s * (d / 2 - 1.4)); this.group.add(e); }
  }
  _tower(x, z, w, d, h, color, rng, G) {
    // EVERY tower is enterable: an open-front ground-floor lobby you can walk into,
    // with the tall shaft above it (visual only, so 2D collision leaves the floor clear).
    const h0 = Math.min(4.8, h - 1), t = 0.4, trimMat = mat(new THREE.Color(color).multiplyScalar(0.8).getHex());
    const wallMat = mat(new THREE.Color(color).multiplyScalar(0.92).getHex());
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), mat(0x2b2733)); floor.position.set(x, 0.12, z); floor.receiveShadow = true; G.add(floor);
    const wall = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h0, dd), wallMat); m.position.set(x + ox, h0 / 2, z + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); };
    wall(w, t, 0, -d / 2); wall(t, d, -w / 2, 0); wall(t, d, w / 2, 0);           // back + two sides
    this.boxes.push({ x, z: z - d / 2, hw: w / 2 + 0.3, hd: t / 2 + 0.3 });
    this.boxes.push({ x: x - w / 2, z, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    this.boxes.push({ x: x + w / 2, z, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, h0, 12), trimMat); c.position.set(x + sx * (w / 2 - 0.55), h0 / 2, z + d / 2 - 0.55); c.castShadow = true; G.add(c); this.boxes.push({ x: c.position.x, z: c.position.z, hw: 0.6, hd: 0.6 }); }
    // lobby fit-out: reception desk, glowing elevator doors, ceiling glow, point light
    const desk = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.1, 1.3), mat(0x5a4632)); desk.position.set(x, 0.82, z - d * 0.2); desk.castShadow = true; G.add(desk);
    this.boxes.push({ x, z: z - d * 0.2, hw: w * 0.25 + 0.2, hd: 0.85 });
    const elev = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.45, 3), h0 - 1.0, 0.16), mat(0x1a2530, { emissive: 0x2fd0e0, emissiveIntensity: 0.5 })); elev.position.set(x, (h0 - 1.0) / 2, z - d / 2 + 0.35); G.add(elev);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.16, d * 0.6), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.3 })); panel.position.set(x, h0 - 0.4, z); G.add(panel);
    // shaft above the lobby (no ground-level collision)
    const shaftH = h - h0, { map, emissive } = facadeTextures(w, shaftH, '#' + color.toString(16).padStart(6, '0'));
    const side = () => mat(0xffffff, { map: map.clone(), emissiveMap: emissive.clone(), emissive: 0xffffff, emissiveIntensity: 1.05 });
    const top = mat(color);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(w, shaftH, d), [side(), side(), top, top, side(), side()]); shaft.position.set(x, h0 + shaftH / 2, z); shaft.castShadow = true; shaft.receiveShadow = true; G.add(shaft);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.6, d + 0.8), trimMat); ledge.position.set(x, h0, z); ledge.castShadow = true; G.add(ledge);
    const para = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 1.0, d + 0.6), trimMat); para.position.set(x, h - 0.2, z); para.castShadow = true; G.add(para);
    const floors = Math.floor(shaftH / 4); for (let fl = 6; fl < floors; fl += 6) { const led = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.4, d + 0.5), trimMat); led.position.set(x, h0 + fl * 4, z); G.add(led); }
    const tank = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 2.4, d * 0.3), mat(0x33373f)); tank.position.set(x + rnd(-w * 0.2, w * 0.2), h + 1.2, z + rnd(-d * 0.2, d * 0.2)); tank.castShadow = true; G.add(tank);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.8, 5), 0.3, 1.0), mat(pick(NEONS))); awn.position.set(x, h0 + 0.2, z + d / 2 + 0.5); G.add(awn);
    if (h > 46 && rng() < 0.7) { const nc = pick(NEONS), sh = Math.min(h * 0.5, 20); const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, sh, 0.5), mat(nc, { emissive: nc, emissiveIntensity: 2.2 })); sign.position.set(x + (rng() < .5 ? -1 : 1) * (w / 2 + 0.4), h0 + shaftH * 0.55, z + d / 2 + 0.3); G.add(sign); }
    this.shops.push({ x, z, w, d, type: 'tower' });
  }
  _neonSign(text, hex, x, y, z, w, G) {
    const t = signTexture(text, '#' + hex.toString(16).padStart(6, '0'));
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), mat(0xffffff, { map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 2.4, transparent: true })); s.position.set(x, y, z); G.add(s); return s;
  }
  _venue(cx, cz, LOT, type, rng, G) {
    const w = LOT - 10, d = LOT - 14, h = type === 'club' ? 6.5 : 5.4, t = 0.4;
    const accent = type === 'club' ? pick([0xff3d9a, 0x9b5cff, 0x2fe6ff]) : type === 'hotel' ? 0xffd27a : type === 'diner' ? 0xff5a5a : pick(NEONS);
    const wallMat = mat(pick(FACADES)), floorMat = mat(type === 'club' ? 0x1a1428 : 0x33303d);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), floorMat); floor.position.set(cx, 0.18, cz); floor.receiveShadow = true; G.add(floor);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, t, d + 1), wallMat); roof.position.set(cx, h, cz); roof.castShadow = true; G.add(roof);
    const wall = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h, dd), wallMat); m.position.set(cx + ox, h / 2, cz + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); };
    wall(w, t, 0, -d / 2); wall(t, d, -w / 2, 0); wall(t, d, w / 2, 0);
    this.boxes.push({ x: cx, z: cz - d / 2, hw: w / 2 + 0.3, hd: t / 2 + 0.3 });
    this.boxes.push({ x: cx - w / 2, z: cz, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    this.boxes.push({ x: cx + w / 2, z: cz, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, h, 14), wallMat); p.position.set(cx + sx * (w / 2 - 0.6), h / 2, cz + d / 2 - 0.6); p.castShadow = true; G.add(p); this.boxes.push({ x: p.position.x, z: p.position.z, hw: 0.7, hd: 0.7 }); }
    this._neonSign(pick(VENUE_NAMES[type]), accent, cx, h + 1.0, cz + d / 2 + 0.25, w * 0.9, G);
    const under = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.5, 0.3), mat(accent, { emissive: accent, emissiveIntensity: 1.6 })); under.position.set(cx, h + 0.25, cz + d / 2 + 0.2); G.add(under);
    const rec = { x: cx, z: cz, w, d, type };
    if (type === 'club') {
      const cols = [0xff3d9a, 0x2fe6ff, 0x9b5cff, 0x4dff9e, 0xffe24a];
      for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const col = cols[(a + b + 4) % cols.length]; const tile = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 2.6), mat(col, { emissive: col, emissiveIntensity: 1.4 })); tile.position.set(cx + a * 2.8, 0.32, cz + b * 2.8 - 2); G.add(tile); }
      const dj = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 1.1, 1.6), mat(0x101018, { emissive: accent, emissiveIntensity: 0.6 })); dj.position.set(cx, 0.75, cz - d / 2 + 1.6); G.add(dj);
      for (const sx of [-1, 0, 1]) { const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.5, 12, 1, true), mat(pick(cols), { emissive: pick(cols), emissiveIntensity: 1.2, transparent: true, opacity: 0.28, side: THREE.DoubleSide })); beam.position.set(cx + sx * 6, h - 2.2, cz - 1); beam.rotation.x = Math.PI + sx * 0.2; G.add(beam); }
      const pl = new THREE.PointLight(accent, 12, 30, 2); pl.position.set(cx, h - 1.4, cz - 1); G.add(pl);
      rec.dance = [{ x: cx - 3, z: cz - 1 }, { x: cx + 3, z: cz - 2 }, { x: cx, z: cz + 2 }]; this.clubs.push(rec);
    } else if (type === 'hotel') {
      const desk = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.1, 1.6), mat(0x5a4632)); desk.position.set(cx, 0.85, cz - d * 0.22); desk.castShadow = true; G.add(desk);
      this.boxes.push({ x: cx, z: cz - d * 0.22, hw: w * 0.25 + 0.2, hd: 1.0 });
      for (const sx of [-1, 1]) { const sofa = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 1.3), mat(0x8a3a58)); sofa.position.set(cx + sx * (w / 2 - 3), 0.55, cz + d * 0.2); G.add(sofa); }
      const chand = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), mat(0xfff2cf, { emissive: 0xffe6b0, emissiveIntensity: 2.2 })); chand.position.set(cx, h - 1.2, cz); G.add(chand);
    } else if (type === 'diner') {
      const counter = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 1.05, 1.3), mat(0xc23232)); counter.position.set(cx, 0.82, cz - d * 0.16); counter.castShadow = true; G.add(counter);
      this.boxes.push({ x: cx, z: cz - d * 0.16, hw: w * 0.3 + 0.2, hd: 0.9 });
      for (let s = -2; s <= 2; s++) { const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12), mat(0x2b2b33)); stool.position.set(cx + s * 2.2, 0.55, cz - d * 0.16 + 1.6); G.add(stool); }
      for (const ox of [-w * 0.25, w * 0.25]) { const panel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.16, d * 0.5), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.3 })); panel.position.set(cx + ox, h - 0.5, cz); G.add(panel); }
    } else {
      const counter = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 1.1, 1.4), mat(0x6b4a2e)); counter.position.set(cx, 0.85, cz - d * 0.18); counter.castShadow = true; G.add(counter);
      this.boxes.push({ x: cx, z: cz - d * 0.18, hw: w * 0.275 + 0.2, hd: 0.9 });
      for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, d * 0.5), mat(0x45414c)); sh.position.set(cx + sx * (w / 2 - 1.2), 1.3, cz - d * 0.05); G.add(sh); }
      for (const ox of [-w * 0.22, w * 0.22]) { const panel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, 0.16, d * 0.55), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.3 })); panel.position.set(cx + ox, h - 0.5, cz - d * 0.05); G.add(panel); }
    }
    this.shops.push(rec);
  }
  _smallShop(x, z, w, d, h, rng, G, back) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(pick(SHOP_COLS))); b.position.set(x, h / 2, z); b.castShadow = true; b.receiveShadow = true; G.add(b);
    this.boxes.push({ x, z, hw: w / 2 + 0.3, hd: d / 2 + 0.3 });
    const dz = back ? -1 : 1, fz = z + dz * (d / 2 + 0.06);
    const win = new THREE.Mesh(new THREE.BoxGeometry(w * 0.82, 1.5, 0.1), mat(0x18243a, { emissive: pick(WIN_GLOW), emissiveIntensity: 1.1 })); win.position.set(x, 1.5, fz); G.add(win);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.0, 0.12), mat(0x12161e, { emissive: 0xffe6b0, emissiveIntensity: 0.4 })); door.position.set(x + w * 0.3, 1.0, fz + dz * 0.03); G.add(door);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.22, 1.0), mat(pick(NEONS))); awn.position.set(x, 2.85, fz + dz * 0.5); G.add(awn);
    const sign = this._neonSign(pick(BIZ), pick(NEONS), x, h + 0.45, fz + dz * 0.1, Math.min(w * 0.92, 7), G); if (back) sign.rotation.y = Math.PI;
  }
  _block(cx, cz, LOT, rng, G) {
    const n = 3 + (rng() * 2 | 0), sw = (LOT - 8) / n;
    for (let i = 0; i < n; i++) {
      const sx = cx - (LOT - 8) / 2 + sw * (i + 0.5);
      this._smallShop(sx, cz + LOT / 2 - 5, sw - 1.2, 8, 4 + rng() * 5, rng, G, false);
      this._smallShop(sx, cz - LOT / 2 + 5, sw - 1.2, 8, 4 + rng() * 5, rng, G, true);
    }
    const towers = rng() < 0.5 ? 1 : 2, bw = (LOT - 6) / towers;
    for (let t = 0; t < towers; t++) { const bx = cx + (towers === 1 ? 0 : (t === 0 ? -1 : 1) * (LOT / 4)); this._tower(bx, cz, bw - 3, LOT - 22, 26 + rng() * 86, FACADES[(rng() * FACADES.length) | 0], rng, G); }
  }
  _props(cx, cz, LOT, rng, G) {
    const edge = LOT / 2 - 2.6;
    for (const sz of [-edge, edge]) for (let i = 0, n = 2 + (rng() * 2 | 0); i < n; i++) {
      const px = cx + rnd(-LOT / 2 + 5, LOT / 2 - 5), z = cz + sz, r = rng();
      if (r < 0.34) { const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.7), mat(0x6a4a2e)); seat.position.set(px, 0.7, z); seat.castShadow = true; G.add(seat); const bk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 0.12), mat(0x6a4a2e)); bk.position.set(px, 1.0, z - 0.28); G.add(bk); }
      else if (r < 0.55) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.7, 8), mat(0xd23b3b)); h.position.set(px, 0.35, z); G.add(h); }
      else if (r < 0.75) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.9, 10), mat(0x2f3a33)); t.position.set(px, 0.45, z); G.add(t); }
      else if (r < 0.9) { const pb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), mat(0x8a8f98)); pb.position.set(px, 0.25, z); G.add(pb); const bush = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), mat(0x3f8f4a)); bush.position.set(px, 0.9, z); G.add(bush); }
      else { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), mat(0x3a3f48)); pole.position.set(px, 1.3, z); G.add(pole); const sgn = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.06), mat(0x2f74d0, { emissive: 0x2f74d0, emissiveIntensity: 0.9 })); sgn.position.set(px, 2.4, z); G.add(sgn); }
    }
  }
  _park(cx, cz, LOT, rng, G) {
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(LOT, 0.35, LOT), mat(0x3f7e44)); lawn.position.set(cx, 0.14, cz); lawn.receiveShadow = true; G.add(lawn);
    const n = 3 + (rng() * 3 | 0); for (let i = 0; i < n; i++) this.palm(cx + rnd(-LOT / 2 + 4, LOT / 2 - 4), cz + rnd(-LOT / 2 + 4, LOT / 2 - 4), G);
    const f = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.8, 18), mat(0x808a97)); f.position.set(cx, 0.5, cz); f.castShadow = true; G.add(f);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.3, 18), mat(0x2fe6ff, { emissive: 0x2fe6ff, emissiveIntensity: 1.1, transparent: true, opacity: 0.9 })); w.position.set(cx, 0.85, cz); G.add(w);
  }
  palm(x, z, G) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.5, 6.5, 10), mat(0x835530)); trunk.position.y = 3.2; trunk.castShadow = true; g.add(trunk);
    for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.55, 4.2, 6), mat(0x2f8f48)); f.position.set(Math.cos(i / 7 * TAU) * 1.7, 6.4, Math.sin(i / 7 * TAU) * 1.7); f.rotation.z = Math.cos(i / 7 * TAU); f.rotation.x = Math.sin(i / 7 * TAU); f.castShadow = true; g.add(f); }
    g.position.set(x, 0.2, z); (G || this.group).add(g);
  }
  _lamp(x, z) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.5, 8), mat(0x272b33)); pole.position.y = 3.25; pole.castShadow = true; g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), mat(0x272b33)); arm.position.set(0.7, 6.3, 0); g.add(arm);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), mat(0xfff0c0, { emissive: 0xffd58a, emissiveIntensity: 3.2 })); head.position.set(1.4, 6.2, 0); g.add(head);
    g.position.set(x, 0, z); this.group.add(g);
  }
  collide(px, pz, radius) {
    for (const b of this.boxes) { const dx = px - b.x, dz = pz - b.z, ex = b.hw + radius, ez = b.hd + radius; if (Math.abs(dx) < ex && Math.abs(dz) < ez) { const ox = ex - Math.abs(dx), oz = ez - Math.abs(dz); if (ox < oz) px = b.x + Math.sign(dx || 1) * ex; else pz = b.z + Math.sign(dz || 1) * ez; } }
    return [px, pz];
  }
  // distance from a coordinate to the nearest road centre-line
  _distToGrid(v) { const half = this.size / 2, m = ((v + half) % this.cell + this.cell) % this.cell; return Math.min(m, this.cell - m); }
  onRoad(x, z) { return this._distToGrid(x) < this.road / 2 || this._distToGrid(z) < this.road / 2; }
  gridLine(v) { const half = this.size / 2; return -half + clamp(Math.round((v + half) / this.cell), 0, this.n) * this.cell; }
  snapSidewalk(x, z) {
    const half = this.size / 2, side = this.road / 2 + 2.0;
    const gx = -half + Math.round((x + half) / this.cell) * this.cell, gz = -half + Math.round((z + half) / this.cell) * this.cell;
    if (Math.abs(x - gx) < Math.abs(z - gz)) return [gx + (x >= gx ? side : -side), z];
    return [x, gz + (z >= gz ? side : -side)];
  }
}

// ---------------------------------------------------------------------------
// Higher-poly cartoon human (rigged) + bouncy procedural animation.
// ---------------------------------------------------------------------------
const SKIN = [0xf6d3ab, 0xecbd90, 0xcf9058, 0xa06a40, 0x7a4a28, 0xffe0bd];
const SHIRTS = [0x3f7cb4, 0xd8484c, 0x4caf50, 0xf0b83a, 0x9a5ec8, 0x3a3f48, 0xe07bb0, 0x2ab5a0, 0xe8e8e8, 0xf07a34, 0x2f74a8];
const PANTS = [0x2c3242, 0x3a2e26, 0x45454e, 0x2a3b30, 0x554050, 0x1f2530, 0x5a5148];
const HAIR = [0x241810, 0x0e0e0e, 0x6b4a2a, 0xd0a63a, 0x7a3a20, 0x4a4a4a, 0x2b2b2b, 0x8a2f2f, 0xc0c0c8, 0x5a3fa0];
const HATS = [0x2a2f3a, 0xb43b3b, 0x2f6fd4, 0x2f9e54, 0xf0b83a, 0xe8e8e8, 0x8a4fd0, 0x101216];
const HAIR_STYLES = ['buzz', 'bowl', 'bowl', 'mop', 'spiky', 'afro', 'cap', 'beanie', 'bald', 'pony', 'cap'];
const CARDS = [{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }];
function cap(r, len, m, rs) { return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, rs || 16), m); }
function humanFigure(p) {
  const skin = p.skin || pick(SKIN), shirt = p.shirt || pick(SHIRTS), pants = p.pants || pick(PANTS), hair = p.hair || pick(HAIR);
  const Sk = skinMat(skin), Sh = mat(shirt), Pa = mat(pants), Ha = mat(hair), Bo = mat(0x16161c);
  const group = new THREE.Group();
  // pelvis / hips
  const hips = new THREE.Group(); hips.position.y = 0.9; group.add(hips);
  const pelvis = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), Pa); pelvis.scale.set(1.1, 0.7, 0.8); pelvis.position.y = 0.02; hips.add(pelvis);
  // legs: thigh + shin + foot, reaching the ground
  const legs = {};
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? -1 : 1; const leg = new THREE.Group(); leg.position.set(sx * 0.1, 0, 0); hips.add(leg);
    const thigh = cap(0.1, 0.34, Pa); thigh.position.y = -0.22; leg.add(thigh);
    const shin = new THREE.Group(); shin.position.y = -0.46; leg.add(shin);
    const shinM = cap(0.08, 0.32, Pa); shinM.position.y = -0.2; shin.add(shinM);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.3), Bo); foot.position.set(0, -0.4, 0.08); shin.add(foot);
    legs[s] = { leg, shin };
  }
  // torso (waist -> shoulders)
  const chest = new THREE.Group(); chest.position.y = 0.1; hips.add(chest);
  const prof = [[0.04, 0], [0.15, 0.02], [0.18, 0.14], [0.205, 0.3], [0.215, 0.42], [0.17, 0.5], [0.08, 0.55], [0.03, 0.57]].map(a => new THREE.Vector2(a[0], a[1]));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), Sh); torso.scale.z = 0.72; chest.add(torso);
  // head — ~1/7 of body height (no more bobblehead)
  const head = new THREE.Group(); head.position.y = 0.62; chest.add(head);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.1, 12), Sk); neck.position.y = -0.04; head.add(neck);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 28, 22), Sk); skull.position.y = 0.08; skull.scale.set(0.96, 1.06, 1.0); head.add(skull);
  const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 16), Sk); jaw.position.set(0, 0.0, 0.02); jaw.scale.set(0.86, 0.82, 0.92); head.add(jaw);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 10), mat(0xffffff)); eye.position.set(sx * 0.05, 0.09, 0.108); head.add(eye);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), mat(0x241a12)); iris.position.set(sx * 0.05, 0.09, 0.124); head.add(iris);
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.016), Ha); brow.position.set(sx * 0.05, 0.125, 0.112); head.add(brow);
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), Sk); ear.position.set(sx * 0.125, 0.06, 0.0); ear.scale.set(0.45, 1, 0.7); head.add(ear);
  }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.055, 8), Sk); nose.position.set(0, 0.06, 0.122); nose.rotation.x = Math.PI / 2 + 0.4; head.add(nose);
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.014), mat(0x8a4444)); mouth.position.set(0, 0.025, 0.114); head.add(mouth);
  // ---- varied hair / headwear so nobody's a clone ----
  const style = p.style || pick(HAIR_STYLES);
  if (style === 'buzz') { const h = new THREE.Mesh(new THREE.SphereGeometry(0.133, 20, 16, 0, TAU, 0, 1.5), Ha); h.position.set(0, 0.085, -0.004); head.add(h); }
  else if (style === 'bowl') { const h = new THREE.Mesh(new THREE.SphereGeometry(0.143, 24, 18, 0, TAU, 0, 1.55), Ha); h.position.set(0, 0.1, -0.006); head.add(h); }
  else if (style === 'mop') { const h = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 18, 0, TAU, 0, 1.95), Ha); h.position.set(0, 0.075, -0.02); head.add(h); }
  else if (style === 'spiky') { const b = new THREE.Mesh(new THREE.SphereGeometry(0.135, 20, 14, 0, TAU, 0, 1.3), Ha); b.position.set(0, 0.1, -0.004); head.add(b); for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.1, 5), Ha); s.position.set(rnd(-0.09, 0.09), 0.2, rnd(-0.07, 0.05)); s.rotation.set(rnd(-0.3, 0.3), 0, rnd(-0.3, 0.3)); head.add(s); } }
  else if (style === 'afro') { const h = new THREE.Mesh(new THREE.SphereGeometry(0.185, 20, 16), Ha); h.position.set(0, 0.14, -0.01); head.add(h); }
  else if (style === 'pony') { const h = new THREE.Mesh(new THREE.SphereGeometry(0.14, 22, 16, 0, TAU, 0, 1.5), Ha); h.position.set(0, 0.1, -0.006); head.add(h); const tail = cap(0.04, 0.22, Ha, 8); tail.position.set(0, 0.0, -0.14); head.add(tail); }
  else if (style === 'cap') { const col = pick(HATS); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.143, 20, 14, 0, TAU, 0, 1.5), mat(col)); dome.position.set(0, 0.1, 0); head.add(dome); const brim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.17), mat(col)); brim.position.set(0, 0.105, 0.15); head.add(brim); }
  else if (style === 'beanie') { const col = pick(HATS); const b = new THREE.Mesh(new THREE.SphereGeometry(0.146, 20, 16, 0, TAU, 0, 1.75), mat(col)); b.position.set(0, 0.085, -0.004); head.add(b); }
  // 'bald' adds nothing. occasional beard/stubble.
  if (style !== 'afro' && Math.random() < 0.3) { const beard = new THREE.Mesh(new THREE.SphereGeometry(0.098, 16, 12, 0, TAU, 0, 1.7), Ha); beard.position.set(0, -0.02, 0.02); beard.scale.set(0.92, 0.7, 0.88); head.add(beard); }
  // arms: shirt-sleeved upper arm, bare (skin) forearm, small hand pad — hang at sides
  const arms = {};
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? -1 : 1; const arm = new THREE.Group(); arm.position.set(sx * 0.2, 0.42, 0); arm.rotation.z = sx * 0.05; chest.add(arm);
    const up = cap(0.056, 0.24, Sh); up.position.y = -0.16; arm.add(up);
    const fore = new THREE.Group(); fore.position.y = -0.34; arm.add(fore);
    const foreM = cap(0.046, 0.22, Sk); foreM.position.y = -0.14; fore.add(foreM);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), Sk); hand.position.y = -0.29; hand.scale.set(1, 1.15, 0.7); fore.add(hand);
    arms[s] = { arm, fore };
  }
  if (!p.noScale) { const bs = rnd(0.9, 1.14); group.scale.set(bs * rnd(0.93, 1.08), bs, bs * rnd(0.95, 1.05)); } // varied heights & builds
  const f = { group, kind: 'proc', head, t: rnd(10), j: { hips, chest, head, armL: arms.L.arm, armR: arms.R.arm, foreL: arms.L.fore, foreR: arms.R.fore, legL: legs.L.leg, legR: legs.R.leg, shinL: legs.L.shin, shinR: legs.R.shin } };
  f.update = (dt, o) => animateHuman(f, dt, o || {}); animateHuman(f, 0, { state: 'idle' });
  return f;
}
function animateHuman(f, dt, o) {
  const j = f.j, state = o.state || 'idle'; f.t += dt; const t = f.t;
  const set = (n, x, y, z) => { const g = j[n]; if (x !== undefined) g.rotation.x = x; if (y !== undefined) g.rotation.y = y; if (z !== undefined) g.rotation.z = z; };
  j.chest.scale.set(1, 1, 1);
  if (state === 'walk' || state === 'run') {
    const run = state === 'run', amp = run ? 0.9 : 0.55, ph = t * (run ? 10.5 : 7.2);
    set('legL', Math.sin(ph) * amp); set('legR', Math.sin(ph + Math.PI) * amp);
    set('shinL', Math.max(0, -Math.sin(ph + 0.5)) * (amp + 0.6)); set('shinR', Math.max(0, -Math.sin(ph + Math.PI + 0.5)) * (amp + 0.6));
    j.armL.rotation.x = Math.sin(ph + Math.PI) * amp * 0.85; j.armR.rotation.x = Math.sin(ph) * amp * 0.85; j.armL.rotation.z = 0.08; j.armR.rotation.z = -0.08;
    j.foreL.rotation.x = -0.28 - Math.max(0, Math.sin(ph)) * 0.4; j.foreR.rotation.x = -0.28 - Math.max(0, Math.sin(ph + Math.PI)) * 0.4;
    set('hips', 0, Math.sin(ph) * 0.09, 0); j.chest.rotation.x = run ? 0.3 : 0.12; j.chest.rotation.y = -Math.sin(ph) * 0.08; j.head.rotation.x = 0; j.head.rotation.y = 0;
    const bob = Math.abs(Math.sin(ph)); f.group.position.y = bob * (run ? 0.09 : 0.05); j.chest.scale.set(1 - bob * 0.03, 1 + bob * 0.05, 1 - bob * 0.03); // squash/stretch = bouncy
  } else if (state === 'talk') {
    const ph = t * 2.4;
    j.chest.rotation.x = 0.03 + Math.sin(t * 1.2) * 0.02; j.chest.rotation.y = Math.sin(t * 0.8) * 0.05;
    j.head.rotation.x = Math.sin(t * 1.7) * 0.07; j.head.rotation.y = Math.sin(t * 0.9) * 0.14;
    j.armR.rotation.x = -0.55 + Math.sin(ph) * 0.35; j.armR.rotation.z = -0.25; j.foreR.rotation.x = -0.8 + Math.sin(ph + 1) * 0.45;
    j.armL.rotation.x = Math.sin(t * 1.1) * 0.06; j.armL.rotation.z = 0.12; j.foreL.rotation.x = -0.35;
    set('legL', 0); set('legR', 0); set('shinL', 0); set('shinR', 0); set('hips', 0, 0, 0); f.group.position.y = 0;
  } else if (state === 'dance') {
    const ph = t * 4.4;
    j.armL.rotation.x = -2.2 + Math.sin(ph) * 0.5; j.armR.rotation.x = -2.2 + Math.sin(ph + Math.PI) * 0.5; j.armL.rotation.z = 0.5; j.armR.rotation.z = -0.5; j.foreL.rotation.x = -0.5; j.foreR.rotation.x = -0.5;
    set('hips', 0, Math.sin(ph * 0.5) * 0.28, 0); j.chest.rotation.y = Math.sin(ph * 0.5 + 1) * 0.22; j.chest.rotation.x = 0.05; j.head.rotation.y = Math.sin(ph * 0.5) * 0.22;
    set('legL', Math.sin(ph) * 0.18); set('legR', -Math.sin(ph) * 0.18); set('shinL', 0.12); set('shinR', 0.12);
    const bob = Math.abs(Math.sin(ph)); f.group.position.y = bob * 0.1; j.chest.scale.set(1 - bob * 0.05, 1 + bob * 0.08, 1 - bob * 0.05);
  } else {
    const b = Math.sin(t * 1.5);
    j.chest.rotation.x = 0.02 + b * 0.014; j.chest.rotation.y = Math.sin(t * 0.6) * 0.03; j.chest.scale.set(1, 1 + b * 0.02, 1);
    j.armL.rotation.x = b * 0.04; j.armR.rotation.x = -b * 0.04; j.armL.rotation.z = 0.06; j.armR.rotation.z = -0.06; j.foreL.rotation.x = -0.06; j.foreR.rotation.x = -0.06;
    j.head.rotation.y = Math.sin(t * 0.5) * 0.09; j.head.rotation.x = Math.sin(t * 0.7) * 0.03;
    set('hips', 0, Math.sin(t * 0.7) * 0.02, 0); set('legL', 0); set('legR', 0); set('shinL', 0); set('shinR', 0); f.group.position.y = 0;
  }
}
function buildPerson(p) { return humanFigure(p); }

// ---------------------------------------------------------------------------
// Car
// ---------------------------------------------------------------------------
const CAR_COLORS = [0xd23b3b, 0x2f6fd4, 0x24272f, 0xf0f0f4, 0x2fb85e, 0xe8b83a, 0x8a4fd0, 0xf07d2a, 0x18b0b0, 0xf04a7a];
function buildCar(color) {
  const g = new THREE.Group(); const paint = mat(color);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 4.6), paint); body.position.y = 0.6; body.castShadow = true; g.add(body);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 4.5), mat(0x15171c)); skirt.position.y = 0.33; g.add(skirt);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.62, 2.3), paint); cabin.position.set(0, 1.12, -0.15); cabin.castShadow = true; g.add(cabin);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.5, 2.34), mat(0x0c1018)); glass.position.set(0, 1.12, -0.15); g.add(glass);
  const capm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 2.0), paint); capm.position.set(0, 1.44, -0.15); g.add(capm);
  for (const sz of [-1.52, 1.48]) for (const sx of [-1.0, 1.0]) { const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.32, 18), mat(0x0c0d11)); tire.rotation.z = Math.PI / 2; tire.position.set(sx, 0.45, sz); tire.castShadow = true; g.add(tire); const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.34, 10), mat(0xc4c9d1)); rim.rotation.z = Math.PI / 2; rim.position.set(sx, 0.45, sz); g.add(rim); }
  const hl = mat(0xfff6d2, { emissive: 0xfff0b0, emissiveIntensity: 2.4 }); for (const sx of [-0.65, 0.65]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.1), hl); l.position.set(sx, 0.72, -2.32); g.add(l); }
  const tl = mat(0xff2a2a, { emissive: 0xff1a1a, emissiveIntensity: 2.6 }); for (const sx of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tl); l.position.set(sx, 0.74, 2.32); g.add(l); }
  return g;
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
class Game {
  constructor() {
    const canvas = document.getElementById('gl');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false; this._shadowT = 0; // shadows refreshed ~8x/s, not every frame
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x43264f, 120, 300);
    this.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.3, 900);
    this.camera.position.set(0, 60, 130);
    this.renderDist = 185; this._frustum = new THREE.Frustum(); this._m = new THREE.Matrix4(); this._sph = new THREE.Sphere();

    this.sky = makeSky(); this.scene.add(this.sky);
    this.hemi = new THREE.HemisphereLight(0xa88ed0, 0x44363f, 1.4); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffbe86, 2.35); this.sun.position.set(90, 80, 60); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024); const sc = this.sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 380; this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.fill = new THREE.DirectionalLight(0x8a6bff, 0.6); this.fill.position.set(-70, 45, -55); this.scene.add(this.fill);

    this.clock = new THREE.Clock(); this.time = 0; this.playing = false; this.paused = false; this.menuMode = true; this.cine = null;
    this.input = new Input(canvas);
    this.city = new City(this.scene);
    this.post = new Post(this.renderer, this.scene, this.camera);
    this.renderer.toneMapping = this.post.enabled ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping; if (!this.post.enabled) this.renderer.toneMappingExposure = 1.1;
    this.ui = new UI(this);

    this.npcs = []; this.cars = []; this.fx = []; this.tracers = [];
    this.player = new Player(this);
    this.story = new Story(this);

    addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); this.post.setSize(); });
    canvas.addEventListener('mousedown', () => { if (this.playing && !this.paused && !this.ui.modal && !this.input.locked) this.input.lock(); });
    this.input.onLock = (l) => { if (!l && this.playing && !this.paused && !this.ui.modal) this.pause(); };

    window.GAME = this;
    this.ui.title(); this.loop();
  }
  start() {
    this.playing = true; this.paused = false; this.menuMode = false; this.ui.modal = null; this.ui.hideTitle();
    this.player.root.visible = true; this.player.spawn();
    for (let i = 0; i < 46; i++) this.spawnPed();
    for (let i = 0; i < 18; i++) this.spawnTraffic();
    let dancers = 0; for (const club of this.city.clubs) for (const d of club.dance) { if (dancers++ >= 6) break; const ped = new Ped(this, d.x, d.z, false, { dance: true }); ped.story = true; this.npcs.push(ped); }
    this.story.begin(); this.input.lock();
  }
  spawnPed() {
    const c = this.city, a = rnd(TAU), r = rnd(22, 110); let x = this.player.pos.x + Math.cos(a) * r, z = this.player.pos.z + Math.sin(a) * r;
    [x, z] = c.snapSidewalk(x, z); const lim = c.size / 2 + 40; x = clamp(x, -lim, lim); z = clamp(z, -lim, lim);
    const n = new Ped(this, x, z); this.npcs.push(n); return n;
  }
  spawnTraffic() {
    const c = this.city, half = c.size / 2, px = this.player.pos.x, pz = this.player.pos.z, vert = Math.random() < 0.5, lane = (Math.random() < 0.5 ? -1 : 1) * (c.road / 4); let x, z, dir;
    if (vert) { const gi = clamp(Math.round((px + half) / c.cell) + ((Math.random() * 5 | 0) - 2), 0, c.n); x = -half + gi * c.cell + lane; z = clamp(pz + rnd(-100, 100), -half, half); dir = new THREE.Vector3(0, 0, lane < 0 ? 1 : -1); }
    else { const gj = clamp(Math.round((pz + half) / c.cell) + ((Math.random() * 5 | 0) - 2), 0, c.n); z = -half + gj * c.cell + lane; x = clamp(px + rnd(-100, 100), -half, half); dir = new THREE.Vector3(lane < 0 ? 1 : -1, 0, 0); }
    const car = new Car(this, x, z, dir, pick(CAR_COLORS), true); this.cars.push(car); return car;
  }
  addTracer(a, b, color) { const geo = new THREE.BufferGeometry().setFromPoints([a, b]); const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true })); this.scene.add(line); this.tracers.push({ line, life: 0.06 }); }
  hitFx(pos, color, n = 12) {
    const g = new THREE.BufferGeometry(), ps = new Float32Array(n * 3), vs = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { ps[i * 3] = pos.x; ps[i * 3 + 1] = pos.y; ps[i * 3 + 2] = pos.z; vs[i * 3] = rnd(-4, 4); vs[i * 3 + 1] = rnd(1, 6); vs[i * 3 + 2] = rnd(-4, 4); }
    g.setAttribute('position', new THREE.BufferAttribute(ps, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.2, transparent: true })); this.scene.add(m); this.fx.push({ m, g, ps, vs, n, life: 0.6 });
  }
  nearestCar(pos, r) { let best = null, bd = r; for (const c of this.cars) { if (c.driver) continue; const d = c.pos.distanceTo(pos); if (d < bd) { bd = d; best = c; } } return best; }
  addWanted(n) { const p = this.player; p.wanted = Math.min(5, p.wanted + n); p.heat = Math.max(p.heat, 12 + p.wanted * 6); }
  shootRay(origin, dir, dmg, range) {
    let bestT = range, victim = null;
    for (const n of this.npcs) { if (n.dead) continue; const t = raySphere(origin, dir, n.pos.clone().setY(n.pos.y + 1.0), 0.7); if (t != null && t < bestT) { bestT = t; victim = n; } }
    const end = origin.clone().addScaledVector(dir, Math.min(bestT, range));
    if (victim) { victim.damage(dmg, dir); this.hitFx(end, 0xff5050, 10); if (!victim.cop) this.addWanted(2); }
    this.addTracer(origin.clone().addScaledVector(dir, 1.2), end, 0xffe98a); return victim;
  }
  startCutscene(other) {
    if (!other) return; const p = this.player, d = new THREE.Vector3().subVectors(other.pos, p.pos); d.y = 0;
    if (d.length() > 0.1) { d.normalize(); p.pos.copy(other.pos).addScaledVector(d, -2.7); p.pos.y = 0; p.root.position.copy(p.pos); p.yaw = Math.atan2(d.x, d.z); other.yaw = Math.atan2(-d.x, -d.z); }
    this.cine = { other, t: 0, side: Math.random() < 0.5 ? 1 : -1 }; this.ui.letterbox(true);
  }
  endCutscene() { this.cine = null; this.ui.letterbox(false); }
  updateCutscene(dt) {
    const c = this.cine; if (!c) return; c.t += dt; const p = this.player, o = c.other;
    const idx = this.ui._dlg ? this.ui._dlg.i : 0;
    const speaker = (this.ui._dlg && this.ui._dlg.lines[idx]) ? this.ui._dlg.lines[idx][0] : null, pTalk = speaker === 'you';
    if (idx !== c._idx) { c._idx = idx; c._t0 = c.t; } // fresh cut on each new line
    p.fig.update(dt, { state: pTalk ? 'talk' : 'idle' }); p.root.rotation.y = p.yaw; p.root.position.copy(p.pos);
    o.fig.update(dt, { state: pTalk ? 'idle' : 'talk' }); o.root.rotation.y = o.yaw; o.root.position.copy(o.pos);
    // shot / reverse-shot: over the listener's shoulder, framing the speaker's face
    const spk = pTalk ? p : o, lis = pTalk ? o : p;
    const dir = new THREE.Vector3().subVectors(spk.pos, lis.pos); dir.y = 0; if (dir.lengthSq() < 0.01) dir.set(0, 0, 1); dir.normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(pTalk ? 1.05 : -1.05);
    const slow = Math.sin((c.t - (c._t0 || 0)) * 0.5) * 0.25;
    const camPos = lis.pos.clone().addScaledVector(dir, -1.5).add(side).add(new THREE.Vector3(0, 1.62 + slow * 0.1, 0)).addScaledVector(dir, slow);
    const look = new THREE.Vector3(spk.pos.x, 1.55, spk.pos.z);
    this.camera.position.lerp(camPos, Math.min(1, dt * 5) || 1); this.camera.lookAt(look);
    for (const n of this.npcs) if (!n.dead && n !== o && n.pos.distanceTo(p.pos) < 55) n.animateIdle(dt);
  }
  pause() { if (!this.playing || this.paused) return; this.paused = true; this.input.unlock(); this.ui.pauseMenu(true); }
  resume() { this.paused = false; this.ui.pauseMenu(false); this.input.lock(); }
  menuCam() { const t = this.time * 0.1, r = 165; this.camera.position.set(Math.cos(t) * r, 66 + Math.sin(t * 0.6) * 18, Math.sin(t) * r); this.camera.lookAt(0, 20, 0); }
  updateCulling() {
    this.camera.updateMatrixWorld(); this._m.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse); this._frustum.setFromProjectionMatrix(this._m);
    const cp = this.camera.position, rd = this.renderDist, rd2 = rd * rd;
    for (const c of this.city.cullables) { const dx = c.p.x - cp.x, dz = c.p.z - cp.z; c.o.visible = (dx * dx + dz * dz) < rd2 && this._frustum.intersectsSphere(this._sph.set(c.p, c.r)); }
    for (const n of this.npcs) { if (n.dead) { continue; } const dx = n.pos.x - cp.x, dz = n.pos.z - cp.z; n.root.visible = (dx * dx + dz * dz) < 145 * 145 && this._frustum.intersectsSphere(this._sph.set(n.root.position, 2.2)); }
    for (const car of this.cars) { const dx = car.pos.x - cp.x, dz = car.pos.z - cp.z; car.root.visible = (dx * dx + dz * dz) < 170 * 170 && this._frustum.intersectsSphere(this._sph.set(car.root.position, 3.4)); }
  }
  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.05); this.time += dt;
    if (this.menuMode) { this.menuCam(); }
    else if (this.playing) {
      if (this.input.p('Escape')) { if (this.ui.modal) this.ui.closeModal(); else if (this.paused) this.resume(); else this.pause(); }
      const frozen = this.paused || this.ui.modal;
      if (this.cine) { this.updateCutscene(dt); }
      else if (!frozen) { this.player.update(dt); for (const n of this.npcs) n.update(dt); for (const c of this.cars) c.update(dt); this.story.update(dt); this.updateWanted(dt); this.cull(); this.player.updateCamera(dt, false); }
      else { this.player.updateCamera(dt, true); }
      this.updateFx(dt); this.ui.update(); this.updateCulling();
    }
    if (this.player.pos) { this.sun.position.set(this.player.pos.x + 90, 100, this.player.pos.z + 60); this.sun.target.position.copy(this.player.pos); this.sun.target.updateMatrixWorld(); }
    this.sky.position.copy(this.camera.position);
    // refresh the shadow map only a few times per second (buildings are static)
    this._shadowT -= dt; if (this._shadowT <= 0) { this.renderer.shadowMap.needsUpdate = true; this._shadowT = 0.11; }
    this.post.render(); this.input.end();
  }
  updateWanted(dt) { const p = this.player; if (p.heat > 0) { p.heat -= dt; if (p.heat <= 0) { p.wanted = Math.max(0, p.wanted - 1); p.heat = p.wanted > 0 ? 14 : 0; } } this.copT = (this.copT || 0) - dt; if (p.wanted > 0 && this.copT <= 0) { this.copT = 2.0; const want = Math.min(8, p.wanted * 2); let have = this.npcs.filter(n => n.cop && !n.dead).length; while (have < want) { const a = rnd(TAU), r = rnd(28, 44); this.npcs.push(new Ped(this, p.pos.x + Math.cos(a) * r, p.pos.z + Math.sin(a) * r, true)); have++; } } if (p.wanted === 0) for (const n of this.npcs) if (n.cop) n.removeMe = true; }
  updateFx(dt) {
    for (const t of this.tracers) { t.life -= dt; t.line.material.opacity = Math.max(0, t.life / 0.06); }
    this.tracers = this.tracers.filter(t => { if (t.life <= 0) { this.scene.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose(); return false; } return true; });
    for (const f of this.fx) { f.life -= dt; for (let i = 0; i < f.n; i++) { f.vs[i * 3 + 1] -= 12 * dt; f.ps[i * 3] += f.vs[i * 3] * dt; f.ps[i * 3 + 1] += f.vs[i * 3 + 1] * dt; f.ps[i * 3 + 2] += f.vs[i * 3 + 2] * dt; } f.g.attributes.position.needsUpdate = true; f.m.material.opacity = Math.max(0, f.life / 0.6); }
    this.fx = this.fx.filter(f => { if (f.life <= 0) { this.scene.remove(f.m); f.g.dispose(); f.m.material.dispose(); return false; } return true; });
  }
  cull() { this.npcs = this.npcs.filter(n => { if (n.removeMe) { this.scene.remove(n.root); return false; } return true; }); const civ = this.npcs.filter(n => !n.cop && !n.story).length; if (civ < 42) { this.spawnPed(); if (civ < 36) this.spawnPed(); } if (this.cars.length < 16) this.spawnTraffic(); }
}
function raySphere(o, d, c, r) { const oc = o.clone().sub(c), b = oc.dot(d), cc = oc.dot(oc) - r * r, h = b * b - cc; if (h < 0) return null; const t = -b - Math.sqrt(h); return t >= 0 ? t : null; }

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
class Player {
  constructor(game) {
    this.game = game; this.pos = new THREE.Vector3(0, 0, 0); this.yaw = 0; this.vy = 0; this.onGround = true;
    this.camYaw = 0; this.camPitch = 0.22; this.camDist = 6.5;
    this.health = 100; this.maxHealth = 100; this.money = 200; this.wanted = 0; this.heat = 0;
    this.inCar = null; this.regen = 0; this.dead = false; this.hasGun = true; this.gunCd = 0;
    this.root = new THREE.Group(); this.root.add(makeBlob(0.55)); game.scene.add(this.root); this.root.visible = false; this._build();
  }
  _build() { const f = buildPerson({ shirt: PLAYER_PURPLE, skin: 0xecbd90, hair: 0x201810, pants: 0x1f2530, style: 'mop', noScale: true }); this.fig = f; this.root.add(f.group); }
  spawn() { this.pos.set(30, 0, 30); this.camYaw = Math.PI; this.root.position.copy(this.pos); }
  enterCar(car) { this.inCar = car; car.driver = this; car.ai = false; this.root.visible = false; if (car.aiTraffic) this.game.addWanted(1); }
  exitCar() { const car = this.inCar; if (!car) return; this.inCar = null; car.driver = null; car.ai = true; this.root.visible = true; this.pos.set(car.pos.x + 2.4, 0, car.pos.z); this.vy = 0; }
  eye() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.5, this.pos.z); }
  update(dt) {
    const inp = this.game.input;
    this.camYaw -= inp.mdx * 0.0024; this.camPitch = clamp(this.camPitch - inp.mdy * 0.0024, -0.2, 1.2); this.camDist = clamp(this.camDist + inp.wheel * 0.8, 4, 13);
    if (inp.p('KeyF')) { if (this.inCar) this.exitCar(); else { const car = this.game.nearestCar(this.pos, 4.5); if (car) this.enterCar(car); } }
    if (this.inCar) { const car = this.inCar; car.control(dt, inp); this.pos.copy(car.pos); this.yaw = car.yaw; this._stats(dt); return; }
    const fwd = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw)), right = new THREE.Vector3(-fwd.z, 0, fwd.x), wish = new THREE.Vector3();
    if (inp.k('KeyW')) wish.add(fwd); if (inp.k('KeyS')) wish.sub(fwd); if (inp.k('KeyD')) wish.add(right); if (inp.k('KeyA')) wish.sub(right);
    const moving = wish.lengthSq() > 0; if (moving) wish.normalize();
    const sprint = inp.k('ShiftLeft') || inp.k('ShiftRight'), sp = sprint ? 9.5 : 5.0;
    this.pos.x += wish.x * sp * dt; this.pos.z += wish.z * sp * dt;
    [this.pos.x, this.pos.z] = this.game.city.collide(this.pos.x, this.pos.z, 0.5);
    this.pos.x = clamp(this.pos.x, -this.game.city.size / 2 - 60, this.game.city.size / 2 + 60); this.pos.z = clamp(this.pos.z, -this.game.city.size / 2 - 8, this.game.city.size / 2 + 170);
    if (inp.k('Space') && this.onGround) { this.vy = 7; this.onGround = false; }
    this.vy -= 22 * dt; this.pos.y += this.vy * dt; if (this.pos.y <= 0) { this.pos.y = 0; this.vy = 0; this.onGround = true; }
    if (moving) this.yaw = lerpAngle(this.yaw, Math.atan2(wish.x, wish.z), Math.min(1, dt * 12));
    this.gunCd = Math.max(0, this.gunCd - dt);
    if (this.hasGun && inp.mL && this.gunCd <= 0) { this.gunCd = 0.16; const d = new THREE.Vector3(); this.game.camera.getWorldDirection(d); this.yaw = Math.atan2(d.x, d.z); this.game.shootRay(this.eye(), d, 18, 120); }
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    this.fig.update(dt, { state: moving ? (sprint ? 'run' : 'walk') : 'idle' }); this._stats(dt);
  }
  _stats(dt) { this.regen += dt; if (this.health < this.maxHealth && this.wanted === 0 && this.regen > 2) this.health = Math.min(this.maxHealth, this.health + 6 * dt); if (this.health <= 0 && !this.dead) { this.dead = true; this.game.ui.bustedOrDead('WASTED'); } }
  hurt(n) { if (this.dead) return; this.health -= n; this.regen = 0; this.game.ui.flash(); }
  updateCamera(dt, frozen) {
    const target = this.inCar ? new THREE.Vector3(this.inCar.pos.x, 1.6, this.inCar.pos.z) : new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z);
    if (this.inCar) { const k = 0.12; this.camYaw = lerpAngle(this.camYaw, Math.atan2(Math.sin(this.inCar.yaw), Math.cos(this.inCar.yaw)) + Math.PI, k); }
    const dist = this.inCar ? 9.5 : this.camDist, pitch = this.inCar ? 0.24 : this.camPitch;
    const off = new THREE.Vector3(Math.sin(this.camYaw + Math.PI) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.camYaw + Math.PI) * Math.cos(pitch)).multiplyScalar(dist);
    let cx = target.x + off.x, cy = target.y + off.y + 0.75, cz = target.z + off.z; if (cy < 0.7) cy = 0.7;
    this.game.camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 10) || 1); this.game.camera.lookAt(target);
  }
}
function lerpAngle(a, b, t) { let d = ((b - a + Math.PI) % TAU) - Math.PI; return a + d * t; }

// ---------------------------------------------------------------------------
// Ped / Cop / Dancer
// ---------------------------------------------------------------------------
class Ped {
  constructor(game, x, z, cop, opts) {
    opts = opts || {}; this.game = game; this.cop = !!cop; this.dance = !!opts.dance; this.pos = new THREE.Vector3(x, 0, z); this.yaw = rnd(TAU);
    this.hp = cop ? 60 : 30; this.dead = false; this.removeMe = false; this.flee = 0; this.timer = rnd(3); this.wander = rnd(TAU); this.attackCd = 0; this.deadT = 0;
    this.persona = { shirt: cop ? 0x21407a : pick(SHIRTS), skin: pick(SKIN), hair: pick(HAIR), pants: cop ? 0x16213f : pick(PANTS) };
    if (cop) { this.persona.style = 'buzz'; this.persona.noScale = true; }
    const f = buildPerson(this.persona); this.fig = f; this.root = new THREE.Group(); this.root.add(makeBlob(0.55)); this.root.add(f.group); this.root.position.copy(this.pos); game.scene.add(this.root);
    if (cop) { const capm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.4), mat(0x11203f)); capm.position.y = 1.95; this.root.add(capm); }
  }
  animateIdle(dt) { if (!this.dead) this.fig.update(dt, { state: this.dance ? 'dance' : 'idle' }); }
  damage(n) { if (this.dead) return; this.hp -= n; this.flee = 7; if (this.hp <= 0) this.die(); }
  die() { this.dead = true; this.deadT = 0; const cash = 10 + (Math.random() * 40 | 0); this.game.player.money += cash; this.game.ui.toast('+$' + cash); }
  update(dt) {
    if (this.dead) { this.deadT += dt; this.root.rotation.z = Math.min(Math.PI / 2, this.deadT * 4); this.root.position.copy(this.pos); if (this.deadT > 6) this.removeMe = true; return; }
    if (this.dance) { this.root.rotation.y = this.yaw; this.fig.update(dt, { state: 'dance' }); return; }
    const p = this.game.player, dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, dist = Math.hypot(dx, dz);
    this.attackCd = Math.max(0, this.attackCd - dt); if (this.flee > 0) this.flee -= dt; this.timer -= dt;
    let wx = 0, wz = 0, sp = this.cop ? 6 : 3.0;
    if (this.cop && dist < 44) { if (dist > 9) { wx = dx / dist; wz = dz / dist; } this.yaw = Math.atan2(dx, dz); if (dist < 28 && this.attackCd <= 0) { this.attackCd = 0.9; p.hurt(6 + Math.random() * 5); this.game.addTracer(this.pos.clone().setY(1.4), p.eye(), 0x9fc2ff); } }
    else if (this.flee > 0) { wx = -dx / (dist || 1); wz = -dz / (dist || 1); this.yaw = Math.atan2(wx, wz); sp = this.cop ? 6 : 5.5; }
    else if (!this.story) { if (!this.pdir || this.timer <= 0) { this.timer = rnd(3, 8); this.pdir = Math.random() < 0.12 ? null : pick(CARDS); } if (this.pdir) { wx = this.pdir.x; wz = this.pdir.z; this.yaw = Math.atan2(wx, wz); } }
    const moving = !!(wx || wz);
    const nx = this.pos.x + wx * sp * dt, nz = this.pos.z + wz * sp * dt;
    const [cx, cz] = this.game.city.collide(nx, nz, 0.5);
    // civilians walk the block in straight lines and turn a corner when they hit a curb or wall
    if (moving && !this.cop && this.flee <= 0 && this.pdir && (this.game.city.onRoad(nx, nz) || Math.hypot(cx - nx, cz - nz) > 0.02)) {
      const l = { x: this.pdir.z, z: -this.pdir.x }, r = { x: -this.pdir.z, z: this.pdir.x };
      const okL = !this.game.city.onRoad(this.pos.x + l.x, this.pos.z + l.z), okR = !this.game.city.onRoad(this.pos.x + r.x, this.pos.z + r.z);
      this.pdir = okL && okR ? (Math.random() < 0.5 ? l : r) : okL ? l : okR ? r : { x: -this.pdir.x, z: -this.pdir.z };
      this.timer = rnd(3, 8);
    } else { this.pos.x = cx; this.pos.z = cz; }
    if (!this.story && this.pos.distanceTo(p.pos) > 155) this.removeMe = true;
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    this.fig.update(dt, { state: moving ? (sp > 5 ? 'run' : 'walk') : 'idle' });
  }
}

// ---------------------------------------------------------------------------
// Car
// ---------------------------------------------------------------------------
class Car {
  constructor(game, x, z, dir, color, aiTraffic) {
    this.game = game; this.pos = new THREE.Vector3(x, 0, z); this.speed = 0; this.driver = null; this.ai = true; this.aiTraffic = !!aiTraffic; this.turnCd = 1.5;
    this.dir = Math.abs(dir.x) > Math.abs(dir.z) ? { x: Math.sign(dir.x) || 1, z: 0 } : { x: 0, z: Math.sign(dir.z) || 1 };
    this.yaw = Math.atan2(this.dir.x, this.dir.z);
    this.root = buildCar(color); this.root.add(makeBlob(1.7)); this.root.position.copy(this.pos); game.scene.add(this.root);
  }
  control(dt, inp) {
    const acc = (inp.k('KeyW') ? 1 : 0) - (inp.k('KeyS') ? 1 : 0), steer = (inp.k('KeyA') ? 1 : 0) - (inp.k('KeyD') ? 1 : 0);
    this.speed += acc * 24 * dt; this.speed *= (inp.k('Space') ? 0.9 : 0.992); this.speed = clamp(this.speed, -14, 36);
    if (Math.abs(this.speed) > 0.5) this.yaw += steer * 1.7 * dt * (this.speed > 0 ? 1 : -1);
    this._move(dt);
    if (Math.abs(this.speed) > 7) for (const n of this.game.npcs) { if (!n.dead && n.pos.distanceTo(this.pos) < 2.4) { n.damage(40); if (!n.cop) this.game.addWanted(2); } }
  }
  update(dt) {
    if (this.driver) { this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; return; }
    if (!this.ai) return;
    const g = this.game, c = g.city, p = g.player;
    if (this.pos.distanceTo(p.pos) > 185) { g.scene.remove(this.root); g.cars = g.cars.filter(x => x !== this); g.spawnTraffic(); return; }
    this.turnCd -= dt; this.speed = lerp(this.speed, 13, dt * 2);
    const lane = c.road / 4;
    // advance along the current cardinal direction
    this.pos.x += this.dir.x * this.speed * dt; this.pos.z += this.dir.z * this.speed * dt;
    // stay glued to the road lane on the perpendicular axis
    if (this.dir.z !== 0) { const tx = c.gridLine(this.pos.x) + this.dir.z * lane; this.pos.x = lerp(this.pos.x, tx, Math.min(1, dt * 3)); }
    else { const tz = c.gridLine(this.pos.z) - this.dir.x * lane; this.pos.z = lerp(this.pos.z, tz, Math.min(1, dt * 3)); }
    // turn (or go straight) at intersections
    const along = this.dir.z !== 0 ? this.pos.z : this.pos.x;
    if (Math.abs(along - c.gridLine(along)) < 2.4 && this.turnCd <= 0) {
      this.turnCd = 2.5 + Math.random() * 2;
      if (Math.random() < 0.5) { const l = { x: this.dir.z, z: -this.dir.x }, r = { x: -this.dir.z, z: this.dir.x }; if (this.dir.z !== 0) this.pos.z = c.gridLine(this.pos.z); else this.pos.x = c.gridLine(this.pos.x); this.dir = Math.random() < 0.5 ? l : r; }
    }
    // reverse at the city edge so cars never leave the grid
    const edge = c.size / 2 + 2;
    if (Math.abs(this.pos.x) > edge || Math.abs(this.pos.z) > edge) { this.dir = { x: -this.dir.x, z: -this.dir.z }; this.turnCd = 2; }
    this.yaw = lerpAngle(this.yaw, Math.atan2(this.dir.x, this.dir.z), Math.min(1, dt * 6));
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
  }
  _move(dt) { const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw); let nx = this.pos.x + fx * this.speed * dt, nz = this.pos.z + fz * this.speed * dt; const [cx, cz] = this.game.city.collide(nx, nz, 1.4); if (cx !== nx || cz !== nz) this.speed *= -0.2; this.pos.x = cx; this.pos.z = cz; this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; }
}

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------
class Story {
  constructor(game) { this.game = game; this.mi = -1; this.state = 'idle'; this.marker = null; this.giver = null; this.targets = null; }
  begin() {
    this.chars = {}; const c = this.game.city;
    this.spawnChar('tony', -c.cell + 6, -c.size / 2 + 50, 0x7a4fb0); this.spawnChar('sal', c.cell, c.cell, 0xc8a23a); this.spawnChar('dezzy', -c.cell, -c.cell, 0xff5aa0);
    this.marker = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 95, 14), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.28, depthWrite: false }));
    this.marker.visible = false; this.game.scene.add(this.marker); this.next();
  }
  spawnChar(id, x, z, shirt) { const p = new Ped(this.game, x, z, false); p.persona.shirt = shirt; p.story = true; p.timer = 1e9; p.wander = null; this.game.npcs.push(p); this.chars[id] = p; return p; }
  next() { this.mi++; const m = MISSIONS[this.mi]; if (!m) { this.state = 'done'; this.setObjective(''); this.setChapter(null); this.game.ui.bigCard('YOU RUN THIS TOWN', 'Free roam — Neon Bay is yours.'); return; } this.state = 'goMeet'; this._setupMeet(m); }
  setChapter(m) { if (this.game.ui.el.chapter) this.game.ui.el.chapter.textContent = m ? ('CHAPTER ' + (this.mi + 1) + '/' + MISSIONS.length + ' · ' + (m.title || '')) : 'THE BAY IS YOURS'; }
  _setupMeet(m) { this.setChapter(m); const g = this.chars[m.giver]; this.giver = g; if (g) { this.marker.position.set(g.pos.x, 48, g.pos.z); this.marker.visible = true; this.marker.material.color.set(0xffd23a); } this.setObjective('Go see ' + CHARS[m.giver].name); }
  startStep() {
    const m = MISSIONS[this.mi], s = m.steps[this.si]; this.targets = null;
    if (s.at) { const wp = this.wp(s.at); this.marker.position.set(wp.x, 48, wp.z); this.marker.visible = true; this.marker.material.color.set(s.type === 'kill' ? 0xff5a5a : 0xffd23a); this.stepPos = wp; } else { this.marker.visible = false; this.stepPos = null; }
    if (s.type === 'kill') { this.targets = []; for (let i = 0; i < (s.count || 1); i++) { const t = new Ped(this.game, this.stepPos.x + rnd(-4, 4), this.stepPos.z + rnd(-4, 4), false); t.persona.shirt = 0x882222; t.hp = 50; t.story = true; this.game.npcs.push(t); this.targets.push(t); } }
    this.setObjective(s.text);
  }
  wp(at) { if (at.char) { const ch = this.chars[at.char]; return new THREE.Vector3(ch.pos.x, 0, ch.pos.z); } return new THREE.Vector3(at.x, 0, at.z); }
  update(dt) {
    if (this.state === 'cutscene' || this.state === 'done' || this.state === 'idle') return;
    const g = this.game, p = g.player, m = MISSIONS[this.mi];
    if (this.state === 'goMeet') { if (this.giver && p.pos.distanceTo(this.giver.pos) < 4.5) { this.game.ui.bigCard('CHAPTER ' + (this.mi + 1), m.title || ''); this.play(m.before, this.giver, () => { this.si = 0; if (m.steps && m.steps.length) { this.state = 'steps'; this.startStep(); } else this.finish(); }); } this._objDist(this.giver && this.giver.pos); return; }
    if (this.state === 'steps') {
      const s = m.steps[this.si]; let done = false;
      if (s.type === 'goto') done = this.stepPos && dist2(p.pos, this.stepPos) < 5;
      else if (s.type === 'getcar') done = !!p.inCar;
      else if (s.type === 'drive') done = p.inCar && this.stepPos && dist2(p.pos, this.stepPos) < 7;
      else if (s.type === 'evade') { if (this._armed == null) { this._armed = true; g.addWanted(s.wanted || 3); } done = p.wanted <= 0; }
      else if (s.type === 'kill') done = this.targets && this.targets.every(t => t.dead);
      if ((s.type === 'goto' || s.type === 'drive') && this.stepPos) this._objDist(this.stepPos);
      else if (s.type === 'kill' && this.targets) this.setObjective(s.text + '  (' + this.targets.filter(t => t.dead).length + '/' + this.targets.length + ')');
      if (done) { this._armed = null; this.si++; if (m.steps[this.si]) this.startStep(); else this.finish(); }
    }
  }
  finish() { const m = MISSIONS[this.mi]; this.play(m.after, this.giver, () => { this.game.player.money += m.reward || 0; this.game.ui.bigCard('MISSION PASSED', (m.reward ? '+$' + m.reward : '')); this.marker.visible = false; setTimeout(() => this.next(), 2600); }); }
  play(lines, who, done) { this.state = 'cutscene'; this.marker.visible = false; this.game.startCutscene(who); this.game.ui.dialogue(lines || [], () => { this.game.endCutscene(); this.state = 'steps'; done && done(); }); }
  _objDist(v) { if (!v) return; const d = Math.round(this.game.player.pos.distanceTo(v)); const base = this._lastObj || ''; this.game.ui.el.obj.textContent = base.replace(/\s+\d+m.*/, '') + '   ' + d + 'm →'; }
  setObjective(t) { this._lastObj = t; this.game.ui.el.obj.textContent = t; }
}
function dist2(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
const CHARS = { tony: { name: 'Tony Marenco', col: '#7fd0ff' }, sal: { name: 'Sal Greco', col: '#ffd23a' }, dezzy: { name: 'Dezzy Vale', col: '#ff7eb0' }, victor: { name: 'Victor Salcido', col: '#ff5a5a' }, you: { name: 'You', col: '#c39bff' } };
// ---- Neon Bay: an eight-chapter rise-and-reckoning arc ----
const MISSIONS = [
  { giver: 'tony', reward: 200, title: 'FRESH OFF THE BUS',
    before: [['you', "Tony. Ten years and you're still hugging me like we owe each other money."], ['tony', "Because we do now, cuz. I owe Victor Salcido five large and he doesn't do payment plans."], ['tony', "You came to the Bay for a fresh start — well, freshest thing here is the debt. Ride with me and we climb out together."], ['you', "Family's family. Point me at it."]],
    steps: [], after: [['tony', "Atta boy. Go see Sal down at the garage — he turns hot cars into cold cash. Tell him I sent you."]] },
  { giver: 'sal', reward: 500, title: "SAL'S CUT",
    before: [['sal', "So you're Tony's cousin. He talks big, owes bigger."], ['sal', "Prove you're useful: lift any ride off the street and park it in my bay. No scratches, no cops."], ['you', "One clean car, coming up."]],
    steps: [{ type: 'getcar', text: 'Steal any car (get in — press F)' }, { type: 'drive', text: "Deliver it to Sal's garage", at: { char: 'sal' } }],
    after: [['sal', "Smooth hands. Here's your end. Keep this quiet and there's more where it came from."]] },
  { giver: 'tony', reward: 700, title: 'HEAT',
    before: [['tony', "Bad news — that plate was flagged. Blues are sweeping the block right now."], ['tony', "Don't lead 'em to us. Shake the tail, then breathe."]],
    steps: [{ type: 'evade', text: 'Lose the cops — drop your wanted level', wanted: 3 }],
    after: [['tony', "Ha! You drive like you were born running. We might actually survive this."]] },
  { giver: 'dezzy', reward: 900, title: 'THE VELVET ROOM',
    before: [['dezzy', "You're the new muscle Tony keeps bragging about. I'm Dezzy — I own the club two doors down."], ['dezzy', "Salcido's boys 'tax' me every weekend. Tonight they came early and they're wrecking my floor."], ['you', "Say the word and they're gone."], ['dezzy', "The word's given. Clear them out — gently is optional."]],
    steps: [{ type: 'kill', text: "Clear Salcido's crew out of the club", count: 3, at: { char: 'dezzy' } }],
    after: [['dezzy', "First quiet Friday in a year. Stick around, hotshot — this town could use someone with your... enthusiasm."]] },
  { giver: 'tony', reward: 1400, title: 'DOCK MONEY',
    before: [['tony', "Victor moves his cash through the docks every night. Hit the runners, take the bag."], ['tony', "It's a message: the Bay isn't his anymore."]],
    steps: [{ type: 'kill', text: "Take out Victor's dock runners", count: 4, at: { x: 60, z: 250 } }],
    after: [['tony', "That'll sting him. He's gonna come looking — so let's be ready when he does."]] },
  { giver: 'dezzy', reward: 1800, title: 'BAD BLOOD',
    before: [['dezzy', "They grabbed Tony outside the diner. He's alive — shaken, not sliced — but the message is clear."], ['dezzy', "Victor's underboss, Reyes, is calling shots from the strip. Cut the head and the crew scatters."]],
    steps: [{ type: 'kill', text: 'Take down the underboss Reyes', count: 1, at: { x: -60, z: 33 } }, { type: 'evade', text: 'Get clear before the heat lands', wanted: 3 }],
    after: [['dezzy', "You just declared war and won the first battle. Victor won't send men next time. He'll come himself."]] },
  { giver: 'sal', reward: 2500, title: 'THE SETUP',
    before: [['sal', "Victor wants a sit-down at the waterfront. It's a trap, obviously."], ['sal', "So we spring ours first — I stashed a car for the getaway. Grab it, be at the pier, and don't die."]],
    steps: [{ type: 'getcar', text: 'Grab a car for the run' }, { type: 'drive', text: 'Get to the waterfront', at: { x: 0, z: 240 } }],
    after: [['sal', "He's here. Whole crew with him. This is it, kid — everything you came to the Bay for."]] },
  { giver: 'tony', reward: 8000, title: 'KING OF NEON BAY',
    before: [['tony', "There he is. Victor Salcido, down by the water, out of favors."], ['you', "Then let's finish what he started."], ['tony', "For the family."]],
    steps: [{ type: 'kill', text: 'Finish Victor Salcido', count: 1, at: { x: 0, z: 275 } }],
    after: [['dezzy', "It's over. The Bay's yours now — ours."], ['tony', "King of Neon Bay. Nobody's paved it with gold yet... but give the man a week."]] },
];

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
class UI {
  constructor(game) { this.game = game; this.modal = null; this.build(); }
  build() {
    const r = document.createElement('div'); r.id = 'ui'; r.innerHTML = `
      <div id="lbTop" class="lb"></div><div id="lbBot" class="lb"></div>
      <canvas id="map" width="190" height="190"></canvas>
      <div id="topright"><div id="money">$200</div><div id="wanted"></div></div>
      <div id="hp"><div id="hpfill"></div></div>
      <div id="weapon">Pistol</div>
      <div id="chapter"></div>
      <div id="obj"></div>
      <div id="toast"></div>
      <div id="dialogue" class="hidden"><div id="dspk"></div><div id="dtext"></div><div id="dhint">click / Space ▸</div></div>
      <div id="bigcard" class="hidden"><div class="bc1"></div><div class="bc2"></div></div>
      <div id="crosshair"></div>
      <div id="overlay" class="hidden"></div>`;
    document.body.appendChild(r); this.root = r;
    this.el = { map: r.querySelector('#map').getContext('2d'), mapc: r.querySelector('#map'), money: r.querySelector('#money'), wanted: r.querySelector('#wanted'), hp: r.querySelector('#hpfill'), obj: r.querySelector('#obj'), chapter: r.querySelector('#chapter'), toast: r.querySelector('#toast'), dialogue: r.querySelector('#dialogue'), dspk: r.querySelector('#dspk'), dtext: r.querySelector('#dtext'), big: r.querySelector('#bigcard'), weapon: r.querySelector('#weapon'), overlay: r.querySelector('#overlay'), lbTop: r.querySelector('#lbTop'), lbBot: r.querySelector('#lbBot') };
    r.querySelector('#dialogue').addEventListener('mousedown', () => this._advance());
    addEventListener('keydown', e => { if ((e.code === 'Space' || e.code === 'Enter') && this._dlg) { e.preventDefault(); this._advance(); } });
  }
  title() {
    this.modal = 'title'; this.el.overlay.className = 'menu';
    this.el.overlay.innerHTML = `<div class="menuwrap"><div class="logo"><span class="l1">NEON</span><span class="l2">BAY</span></div><div class="tag">VICE • DUSK • CHROME</div><button id="play" class="bigbtn">START</button><div class="ctrls"><span><b>WASD</b> move</span><span><b>Shift</b> sprint</span><span><b>Mouse</b> look</span><span><b>Click</b> shoot</span><span><b>F</b> car</span><span><b>Esc</b> pause</span></div><div class="note">Cel-shaded GTA-inspired game. Walk into the clubs, hotels and diners. Cinematic story cutscenes. Online sessions stream in CC0 characters; offline it runs on the built-in cast.</div></div>`;
    this.el.overlay.querySelector('#play').onclick = () => { this.modal = null; this.game.start(); };
  }
  hideTitle() { this.el.overlay.className = 'hidden'; }
  pauseMenu(on) { if (on) { this.modal = 'pause'; this.el.overlay.className = 'menu'; this.el.overlay.innerHTML = `<div class="menuwrap"><div class="logo small"><span class="l1">PAUSED</span></div><button id="res" class="bigbtn">RESUME</button><button id="rl" class="bigbtn ghost">QUIT TO TITLE</button></div>`; this.el.overlay.querySelector('#res').onclick = () => this.game.resume(); this.el.overlay.querySelector('#rl').onclick = () => location.reload(); } else { this.modal = null; this.el.overlay.className = 'hidden'; } }
  bustedOrDead(word) { this.modal = 'dead'; this.game.input.unlock(); this.el.overlay.className = 'menu dead'; this.el.overlay.innerHTML = `<div class="menuwrap"><div class="logo small"><span class="wasted">${word}</span></div><button id="res" class="bigbtn">RESPAWN</button></div>`; this.el.overlay.querySelector('#res').onclick = () => location.reload(); }
  closeModal() { if (this.modal === 'pause') this.game.resume(); }
  letterbox(on) { this.el.lbTop.style.height = on ? '11vh' : '0'; this.el.lbBot.style.height = on ? '11vh' : '0'; }
  flash() { document.body.classList.add('hurt'); clearTimeout(this._ht); this._ht = setTimeout(() => document.body.classList.remove('hurt'), 160); }
  toast(t) { this.el.toast.textContent = t; this.el.toast.style.opacity = 1; clearTimeout(this._tt); this._tt = setTimeout(() => this.el.toast.style.opacity = 0, 1200); }
  bigCard(a, b) { this.el.big.classList.remove('hidden'); this.el.big.querySelector('.bc1').textContent = a; this.el.big.querySelector('.bc2').textContent = b || ''; clearTimeout(this._bt); this._bt = setTimeout(() => this.el.big.classList.add('hidden'), 3800); }
  dialogue(lines, done) { this._dlg = { lines, i: 0, done }; this.modal = 'dlg'; this.game.input.unlock(); this.el.dialogue.classList.remove('hidden'); this._showLine(); }
  _showLine() { const d = this._dlg, l = d.lines[d.i]; if (!l) return; const ch = CHARS[l[0]] || { name: l[0], col: '#fff' }; this.el.dspk.textContent = ch.name; this.el.dspk.style.color = ch.col; this.el.dtext.textContent = l[1]; }
  _advance() { const d = this._dlg; if (!d) return; d.i++; if (d.i >= d.lines.length) { this.el.dialogue.classList.add('hidden'); this._dlg = null; this.modal = null; if (this.game.playing && !this.game.paused) this.game.input.lock(); d.done && d.done(); } else this._showLine(); }
  update() {
    const p = this.game.player; this.el.money.textContent = '$' + (p.money | 0); this.el.wanted.textContent = p.wanted > 0 ? '★'.repeat(p.wanted) : '';
    this.el.hp.style.width = clamp(p.health, 0, 100) + '%'; this.el.weapon.textContent = p.inCar ? '' : 'Pistol';
    document.getElementById('crosshair').style.display = (!p.inCar && this.game.input.mR) ? 'block' : 'none'; this.minimap();
  }
  minimap() {
    const g = this.game, x = this.el.map, S = 190, sc = 0.42; x.clearRect(0, 0, S, S);
    x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); x.clip(); x.fillStyle = '#160f24'; x.fillRect(0, 0, S, S);
    const px = g.player.pos.x, pz = g.player.pos.z, c = g.city, half = c.size / 2;
    x.strokeStyle = '#3a2f4d'; x.lineWidth = c.road * sc;
    for (let i = 0; i <= c.n; i++) { const gx = -half + i * c.cell, sx = S / 2 + (gx - px) * sc, sz = S / 2 + (gx - pz) * sc; x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx, S); x.stroke(); x.beginPath(); x.moveTo(0, sz); x.lineTo(S, sz); x.stroke(); }
    x.fillStyle = '#dfe6ef'; for (const car of g.cars) { const sx = S / 2 + (car.pos.x - px) * sc, sz = S / 2 + (car.pos.z - pz) * sc; x.fillRect(sx - 1.5, sz - 1.5, 3, 3); }
    for (const n of g.npcs) { if (n.dead) continue; x.fillStyle = n.cop ? '#5b8cff' : (n.story ? '#ffd23a' : '#5fe07f'); const sx = S / 2 + (n.pos.x - px) * sc, sz = S / 2 + (n.pos.z - pz) * sc; x.fillRect(sx - 1.5, sz - 1.5, 3, 3); }
    if (g.story.marker && g.story.marker.visible) { const m = g.story.marker.position; let sx = clamp(S / 2 + (m.x - px) * sc, 8, S - 8), sz = clamp(S / 2 + (m.z - pz) * sc, 8, S - 8); x.fillStyle = '#ffcf3a'; x.beginPath(); x.arc(sx, sz, 4, 0, TAU); x.fill(); }
    x.translate(S / 2, S / 2); x.rotate(-g.player.camYaw); x.fillStyle = '#c39bff'; x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 6); x.lineTo(-5, 6); x.closePath(); x.fill(); x.restore();
    x.strokeStyle = 'rgba(180,120,255,0.5)'; x.lineWidth = 3; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); x.stroke();
  }
}

function boot() { try { new Game(); const b = document.getElementById('boot'); if (b) b.style.display = 'none'; } catch (e) { const b = document.getElementById('boot'); if (b) { b.style.display = 'block'; b.style.color = '#f88'; b.textContent = 'Error: ' + e.message; } console.error(e); } }
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
