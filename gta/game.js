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
        col = mix(col, col * vec3(1.04, 1.0, 0.97), 0.22);
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
// Sky — clear blue daytime dome + sun disc + drifting clouds (follows camera).
// ---------------------------------------------------------------------------
function makeSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x2f6ad2) }, mid: { value: new THREE.Color(0x74a8e6) }, hor: { value: new THREE.Color(0xdcecf6) }, bot: { value: new THREE.Color(0xa6bccb) } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 bot; varying vec3 vDir;
      void main(){ float h = vDir.y; vec3 c; if (h>0.0){ float t=pow(clamp(h,0.0,1.0),0.7); c=mix(mix(hor,mid,smoothstep(0.0,0.22,h)),top,t);} else { c=mix(hor,bot,pow(clamp(-h,0.0,1.0),0.5)); } gl_FragColor=vec4(c,1.0);} `,
  });
  const g = new THREE.Group(); g.renderOrder = -2; g.frustumCulled = false;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(760, 32, 16), mat); dome.renderOrder = -2; dome.frustumCulled = false; g.add(dome);
  // sun disc (bright -> blooms into a glow)
  const sun = new THREE.Mesh(new THREE.SphereGeometry(26, 20, 16), new THREE.MeshBasicMaterial({ color: 0xfff6d8 })); sun.position.set(-260, 380, -520); sun.frustumCulled = false; g.add(sun);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(50, 20, 16), new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.35 })); halo.position.copy(sun.position); halo.frustumCulled = false; g.add(halo);
  // puffy clouds drifting across the sky
  const clouds = new THREE.Group(); g.add(clouds);
  const cmat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 });
  for (let i = 0; i < 16; i++) {
    const puff = new THREE.Group();
    for (let j = 0; j < 3 + (Math.random() * 3 | 0); j++) { const s = new THREE.Mesh(new THREE.SphereGeometry(rnd(14, 26), 12, 8), cmat); s.position.set(rnd(-26, 26), rnd(-4, 4), rnd(-10, 10)); s.scale.set(1, 0.55, 1); puff.add(s); }
    puff.position.set(rnd(-700, 700), rnd(150, 260), rnd(-700, 700)); clouds.add(puff);
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
class City {
  constructor(scene) {
    this.scene = scene; this.boxes = []; this.shops = []; this.clubs = []; this.vendors = []; this.cullables = []; this.size = 0;
    this.group = new THREE.Group(); scene.add(this.group);
    this.build();
  }
  build() {
    // ---- VICE CITY layout: west mainland (downtown/port) | bay + causeways | east beach island (Ocean Drive) + ocean ----
    const N = 8, LOT = 46, ROAD = 20, CELL = LOT + ROAD;
    const span = N * CELL; this.size = span; this.cell = CELL; this.lot = LOT; this.road = ROAD; this.n = N;
    const half = span / 2;
    this.bayIx = 5; this.bayX0 = -half + this.bayIx * CELL + ROAD; this.bayX1 = this.bayX0 + LOT;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(span + 120, span + 120), mat(0x6a6c76, { map: noiseTexture(70, 72, 82, 14) }));
    ground.material.map.repeat.set(70, 70); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true; this.group.add(ground);
    const roadMat = mat(0x4a4c58, { map: noiseTexture(46, 48, 58, 10), emissive: 0x0a0b13, emissiveIntensity: 1 }); roadMat.map.repeat.set(2, 46);
    const yellow = mat(0xffe14a, { emissive: 0xffd23a, emissiveIntensity: 1.0 }); const white = mat(0xe8ecf2, { emissive: 0x8a8f98, emissiveIntensity: 0.5 });
    for (let i = 0; i <= N; i++) { const rc = -half + i * CELL; this._road(rc, 0, ROAD, span + ROAD, roadMat, yellow, white, true); this._road(0, rc, span + ROAD, ROAD, roadMat, yellow, white, false); }
    let seed = 1234567; const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    const curbMat = mat(0x9aa0aa), walkMat = mat(0x7f858f, { map: noiseTexture(120, 124, 132, 10) }); walkMat.map.repeat.set(6, 6);
    const DECO = [0xf3c7d4, 0xbfe4e8, 0xf5e3b8, 0xc7e8c9, 0xe8c9f0, 0xffd9b0]; // ocean-drive pastels
    this._lodMats = new Map();
    this.errands = []; this.workposts = []; this.beachSpots = []; // where people go, and where people work
    // offshore islets — the far one is Victor's private spread
    this.islets = [
      { x: half + 205, z: -125, r: 56, h: 4.4, priv: true },
      { x: half + 185, z: 175, r: 38, h: 3.0 },
      { x: -half - 175, z: -70, r: 46, h: 3.6 },
    ];
    // Starfish Island: old-money villas in the middle of the bay, wedged between two causeways
    this.starfish = { x: (this.bayX0 + this.bayX1) / 2, z: -half + 3.5 * CELL - 66, rx: 20, rz: 26 };
    for (let ix = 0; ix < N; ix++) for (let iz = 0; iz < N; iz++) {
      if (ix === this.bayIx) continue; // the bay runs through this column
      const cx = -half + ix * CELL + ROAD + LOT / 2, cz = -half + iz * CELL + ROAD + LOT / 2;
      const sw = new THREE.Mesh(new THREE.BoxGeometry(LOT, 0.22, LOT), walkMat.clone()); sw.material.map = walkMat.map; sw.position.set(cx, 0.11, cz); sw.receiveShadow = true; this.group.add(sw);
      for (const e of [[LOT, 0.6, 0, -LOT / 2], [LOT, 0.6, 0, LOT / 2], [0.6, LOT, -LOT / 2, 0], [0.6, LOT, LOT / 2, 0]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(e[0], 0.34, e[1]), curbMat); c.position.set(cx + e[2], 0.17, cz + e[3]); this.group.add(c); }
      const G = new THREE.Group(); this.group.add(G); this._lod = [];
      // ---- districts ----
      const east = ix > this.bayIx, port = !east && iz <= 1, downtown = !east && ix >= 2 && ix <= 4 && iz >= 3 && iz <= 6;
      const r = rng();
      if (ix === 2 && iz === 2) this._dealership(cx, cz, LOT, rng, G); // MOTORMAX showroom + spray shop
      else if (ix === 0 && iz === 3) this._jail(cx, cz, LOT, G);        // Bay County lockup
      else if (ix === 4 && iz === 2) this._gunshop(cx, cz, LOT, G);     // AMMU-BAY
      else if (ix === 3 && iz === 4) this._bank(cx, cz, LOT, G);        // Bay Mutual bank
      else if (!east && iz >= 6) this._houses(cx, cz, LOT, rng, G, ix === 1 && iz === 6); // northwest suburbs (your house is here)
      else if (east) { // Vice Beach: pastel art-deco hotels, clubs and low slabs facing the ocean
        if (r < 0.1) this._park(cx, cz, LOT, rng, G);
        else if (r < 0.58) { const type = ['hotel', 'club', 'diner', 'hotel', 'shop', 'club'][(rng() * 6) | 0]; this._venue(cx, cz, LOT, type, rng, G); }
        else this._tower(cx, cz, LOT - 14, LOT - 16, 16 + rng() * 26, DECO[(rng() * DECO.length) | 0], rng, G);
        if (ix === N - 1) for (let p2 = 0; p2 < 3; p2++) this.palm(cx + LOT / 2 + 6, cz - LOT / 2 + 8 + p2 * 15, this.group); // palm rows on the shore drive
      } else if (port) { // docklands: warehouses + container yards
        if (r < 0.7) this._warehouse(cx, cz, LOT, rng, G);
        else this._block(cx, cz, LOT, rng, 0.45, G);
      } else if (downtown) { // mainland core: tall glass towers
        if (r < 0.16) { const type = ['shop', 'diner', 'club'][(rng() * 3) | 0]; this._venue(cx, cz, LOT, type, rng, G); }
        else this._tower(cx, cz, LOT - 12, LOT - 14, 70 + rng() * 85, FACADES[(rng() * FACADES.length) | 0], rng, G);
      } else { // little-havana style residential: colorful low blocks, parks, camps
        if (r < 0.06) this._camp(cx, cz, LOT, rng, G);
        else if (r < 0.18) this._park(cx, cz, LOT, rng, G);
        else if (r < 0.44) { const type = ['shop', 'diner', 'club', 'shop', 'diner'][(rng() * 5) | 0]; this._venue(cx, cz, LOT, type, rng, G); }
        else this._block(cx, cz, LOT, rng, 0.5 + rng() * 0.35, G);
      }
      this._props(cx, cz, LOT, rng, G);
      // ---- Distant-Horizons LOD: cheap flat shells that stand in for the lot at range ----
      const L = new THREE.Group();
      for (const s of this._lod) { const m2 = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), this._lodMat(s.c)); m2.position.set(s.x, s.h / 2, s.z); L.add(m2); }
      this.group.add(L); L.visible = false;
      this.cullables.push({ o: G, lod: L, p: new THREE.Vector3(cx, 26, cz), r: 105 });
    }
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) this._lamp(-half + i * CELL + ROAD / 2, -half + j * CELL + ROAD / 2);
    // ---- the bay + causeway railings ----
    const bayW = this.bayX1 - this.bayX0;
    const bay = new THREE.Mesh(new THREE.PlaneGeometry(bayW, span + 40), mat(0x2f83c6, { emissive: 0x1d4e7a, emissiveIntensity: 0.25, transparent: true, opacity: 0.9 }));
    bay.rotation.x = -Math.PI / 2; bay.position.set((this.bayX0 + this.bayX1) / 2, 0.02, 0); this.group.add(bay);
    const railMat = mat(0xb8c0ca);
    for (let i = 0; i <= N; i++) { const rc = -half + i * CELL; for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(bayW, 0.8, 0.3), railMat); rail.position.set((this.bayX0 + this.bayX1) / 2, 0.6, rc + s * (ROAD / 2 - 0.6)); this.group.add(rail); } }
    // ---- ISLAND: open ocean wraps the whole city, sand ring on every coast ----
    const water = new THREE.Mesh(new THREE.PlaneGeometry(3600, 3600), mat(0x2f83c6, { emissive: 0x1d4e7a, emissiveIntensity: 0.25, transparent: true, opacity: 0.92 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.0, 0); this.group.add(water); this.water = water;
    // shores follow the terrain: sand dunes east/south, grassy headland hills west, a ridge up north
    this._shore(half + 62, 0, 130, span + 240, 0xd6c493, 22, 80);   // east sand + dunes
    this._shore(0, -half - 32, span + 240, 70, 0xd6c493, 80, 12);   // south sand
    this._shore(-half - 32, 0, 70, span + 240, 0x4f8a4c, 14, 80);   // west grassy hills
    this._shore(0, half + 32, span + 240, 70, 0x4f8a4c, 80, 14);    // north grassy ridge
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(340, 420), mat(0xd6c493)); apron.rotation.x = -Math.PI / 2; apron.position.set(60, 0.02, -half - 150); this.group.add(apron); // airport peninsula
    // rural flora on the hills: bushes, pines-ish palms, boulders
    for (let i = 0; i < 14; i++) { const wx2 = -half - 8 - rnd(0, 44), wz2 = rnd(-half + 10, half - 10); const bsh = new THREE.Mesh(new THREE.SphereGeometry(rnd(0.7, 1.4), 9, 7), mat(pick([0x3f8f4a, 0x2f7e44, 0x55924e]))); bsh.position.set(wx2, this.groundH(wx2, wz2) + 0.5, wz2); bsh.castShadow = true; this.group.add(bsh); }
    for (let i = 0; i < 10; i++) { const nx2 = rnd(-half + 10, half - 10), nz2 = half + 8 + rnd(0, 44); const bsh = new THREE.Mesh(new THREE.SphereGeometry(rnd(0.7, 1.3), 9, 7), mat(pick([0x3f8f4a, 0x2f7e44]))); bsh.position.set(nx2, this.groundH(nx2, nz2) + 0.5, nz2); bsh.castShadow = true; this.group.add(bsh); }
    for (let i = 0; i < 7; i++) { const rx3 = -half - 10 - rnd(0, 40), rz3 = rnd(-half + 10, half - 10); const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(rnd(0.6, 1.5), 0), mat(0x8a8f98)); rock.position.set(rx3, this.groundH(rx3, rz3) + 0.3, rz3); rock.rotation.set(rnd(TAU), rnd(TAU), 0); rock.castShadow = true; this.group.add(rock); }
    // the islets themselves: displaced sand discs with grassy crowns
    for (const I of this.islets) {
      const geo = new THREE.CircleGeometry(I.r, 42); geo.rotateX(-Math.PI / 2);
      const P2 = geo.attributes.position; for (let i = 0; i < P2.count; i++) P2.setY(i, this.groundH(I.x + P2.getX(i), I.z + P2.getZ(i)) + 0.04);
      geo.computeVertexNormals();
      const sandI = new THREE.Mesh(geo, mat(0xd6c493)); sandI.position.set(I.x, 0, I.z); sandI.receiveShadow = true; this.group.add(sandI);
      const g2 = new THREE.CircleGeometry(I.r * 0.6, 30); g2.rotateX(-Math.PI / 2);
      const P3 = g2.attributes.position; for (let i = 0; i < P3.count; i++) P3.setY(i, this.groundH(I.x + P3.getX(i), I.z + P3.getZ(i)) + 0.1);
      g2.computeVertexNormals();
      const grassI = new THREE.Mesh(g2, mat(0x4c8a4f)); grassI.position.set(I.x, 0, I.z); grassI.receiveShadow = true; this.group.add(grassI);
      for (let i = 0, np = I.priv ? 5 : 3; i < np; i++) { const a = rnd(TAU), rr = I.r * rnd(0.28, 0.55); this.palm(I.x + Math.cos(a) * rr, I.z + Math.sin(a) * rr, this.group); }
      if (I.priv) this._mansion(I);
    }
    this._starfish();
    this._lighthouse(half);
    // Bayside Marina: wooden piers off the west bay shore, boats moored
    const mz = -half + 3.5 * CELL, mx = this.bayX0;
    for (const dz2 of [-6, 6]) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(15, 0.35, 2.2), mat(0x8a6a48)); pier.position.set(mx + 7, 0.5, mz + dz2); pier.castShadow = true; this.group.add(pier);
      for (let i = 0; i < 3; i++) for (const s of [-1, 1]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.5, 8), mat(0x6a4a30)); post.position.set(mx + 2 + i * 5.6, 0.45, mz + dz2 + s * 1.25); this.group.add(post); }
    }
    const msign = this._neonSign('BAYSIDE MARINA', 0x4fd0ff, mx - 1.2, 4.4, mz, 11, this.group); msign.rotation.y = Math.PI / 2;
    const mpole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.4, 8), mat(0x2a2e36)); mpole.position.set(mx - 1.2, 2.2, mz); this.group.add(mpole);
    this.marina = { x: mx + 9, z: mz };
    for (let i = 0; i < 14; i++) this.palm(half + 24 + rnd(0, 26), rnd(-half + 15, half - 15), this.group);
    for (let i = 0; i < 6; i++) this.palm(rnd(-half, half), half + 22 + rnd(0, 14), this.group);
    // beach day: umbrellas + towels along the east sand
    for (let i = 0; i < 9; i++) {
      const bx2 = half + 26 + rnd(0, 30), bz2 = rnd(-half + 24, half - 24), uc = pick([0xff5fb0, 0x2fe6ff, 0xffd23a, 0x4dff9e]), by = this.groundH(bx2, bz2);
      const pole2 = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), mat(0xe8e2d2)); pole2.position.set(bx2, by + 1.2, bz2); this.group.add(pole2);
      const top2 = new THREE.Mesh(new THREE.ConeGeometry(1.7, 0.85, 10), mat(uc)); top2.position.set(bx2, by + 2.5, bz2); top2.castShadow = true; this.group.add(top2);
      const tw = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.05, 2.0), mat(pick([0xff8a5a, 0x4fd0ff, 0xffe14a, 0xff5fb0]))); tw.position.set(bx2 + 1.7, this.groundH(bx2 + 1.7, bz2) + 0.08, bz2 + rnd(-0.6, 0.6)); tw.rotation.y = rnd(-0.4, 0.4); this.group.add(tw);
      this.beachSpots.push({ x: bx2 + 1.7, z: bz2 }); this.errands.push({ x: bx2 + 1.7, z: bz2 });
    }
    this._airport(half);
    // named places for the story
    const LC = (ix, iz) => ({ x: -half + ix * CELL + ROAD + LOT / 2, z: -half + iz * CELL + ROAD + LOT / 2 });
    this.places = { tonyDiner: LC(1, 4), salGarage: LC(1, 1), dezzyClub: LC(6, 4), docks: LC(3, 0), strip: LC(7, 6), waterfront: { x: (this.bayX0 + this.bayX1) / 2, z: -half + 6 * CELL }, finale: { x: (this.bayX0 + this.bayX1) / 2, z: half }, gunshop: LC(4, 2), bank: LC(3, 4), home: this.homePos || LC(1, 6), motormax: LC(2, 2), jail: LC(0, 3), beach: { x: half + 42, z: 40 }, privado: this.privIslet ? { x: this.privIslet.x, z: this.privIslet.z } : { x: half + 205, z: -125 }, marina: this.marina, starfish: this.starfishPlace || { x: 0, z: 0 } };
    // hidden packages (kept out of the water)
    this.packages = [];
    for (let i = 0; i < 12; i++) {
      let px2, pz2, tries = 0;
      do { [px2, pz2] = this.snapSidewalk(rnd(-half + 14, half - 14), rnd(-half + 14, half - 14)); tries++; } while ((this.inBay(px2, pz2) || px2 > half) && tries < 20);
      const pk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat(0x3ae08a, { emissive: 0x2fe07a, emissiveIntensity: 1.8 }));
      pk.position.set(px2, 0.5, pz2); this.group.add(pk); this.packages.push({ m: pk, x: px2, z: pz2, got: false });
    }
    for (let i = 0; i < 11; i++) { let vx, vz, t2 = 0; do { const a = rng() * TAU, rr = 18 + rng() * (half * 0.7); [vx, vz] = this.snapSidewalk(Math.cos(a) * rr, Math.sin(a) * rr); t2++; } while ((this.inBay(vx, vz) || vx > half) && t2 < 20); this._vendorStall(vx, vz); this.vendors.push({ x: vx, z: vz }); }
    for (const v of this.vendors) this.errands.push({ x: v.x, z: v.z + 2.4 }); // hungry pedestrians drift toward the food carts
  }
  _lodMat(c) { if (!this._lodMats.has(c)) this._lodMats.set(c, mat(new THREE.Color(c).multiplyScalar(0.94).getHex())); return this._lodMats.get(c); }
  // real windows: instanced glass panes (lit + dark) and a slab ring per storey —
  // actual geometry with floors between rows, not a painted-on texture.
  _towerWindows(x, z, w, d, h0, shaftH, G) {
    if (!this._winGeo) {
      this._winGeo = new THREE.BoxGeometry(2.2, 2.3, 0.14);
      this._winLit = mat(0xfff0c8, { emissive: 0xffe2a8, emissiveIntensity: 1.5 });
      this._winDark = mat(0x27313f); this._winDark.roughness = 0.35;
      this._slabMat = mat(0x555a64);
    }
    const floorH = 4, rows = Math.max(1, Math.floor((shaftH - 2.2) / floorH));
    const colsX = Math.max(1, Math.floor((w - 1.6) / 3.4)), colsZ = Math.max(1, Math.floor((d - 1.6) / 3.4));
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
    const litM = [], darkM = [];
    const place = (px, py, pz, ry) => { Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry); P.set(px, py, pz); M.compose(P, Q, S); (Math.random() < 0.45 ? litM : darkM).push(M.clone()); };
    for (let r = 0; r < rows; r++) {
      const wy = h0 + 2.2 + r * floorH;
      for (let c2 = 0; c2 < colsX; c2++) { const wx = x - ((colsX - 1) * 3.4) / 2 + c2 * 3.4; place(wx, wy, z + d / 2 + 0.09, 0); place(wx, wy, z - d / 2 - 0.09, Math.PI); }
      for (let c2 = 0; c2 < colsZ; c2++) { const wz = z - ((colsZ - 1) * 3.4) / 2 + c2 * 3.4; place(x + w / 2 + 0.09, wy, wz, Math.PI / 2); place(x - w / 2 - 0.09, wy, wz, -Math.PI / 2); }
    }
    const inst = (mats, m3) => { if (!mats.length) return; const im = new THREE.InstancedMesh(this._winGeo, m3, mats.length); for (let i = 0; i < mats.length; i++) im.setMatrixAt(i, mats[i]); im.instanceMatrix.needsUpdate = true; G.add(im); };
    inst(litM, this._winLit); inst(darkM, this._winDark);
    // one slab ring per storey — the "floors between the windows"
    const slabs = new THREE.InstancedMesh(new THREE.BoxGeometry(w + 0.5, 0.5, d + 0.5), this._slabMat, rows);
    for (let r = 0; r < rows; r++) { P.set(x, h0 + 0.6 + r * floorH, z); Q.identity(); M.compose(P, Q, S); slabs.setMatrixAt(r, M); }
    slabs.instanceMatrix.needsUpdate = true; G.add(slabs);
  }
  _dealership(cx, cz, LOT, rng, G) {
    // MOTORMAX: showroom pad with display cars to buy (B) + a spray shop pad (E in car)
    this.displays = this.displays || [];
    const pad = new THREE.Mesh(new THREE.BoxGeometry(LOT - 4, 0.26, LOT - 4), mat(0xd8dde6)); pad.position.set(cx, 0.14, cz); pad.receiveShadow = true; G.add(pad);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 14, 10), mat(0x2a2e36)); pole.position.set(cx - LOT / 2 + 4, 7, cz + LOT / 2 - 4); pole.castShadow = true; G.add(pole);
    this._neonSign('MOTORMAX', 0x2fe6ff, cx - LOT / 2 + 4, 13, cz + LOT / 2 - 3.4, 12, G);
    const specs = [{ kind: 'sports', color: 0xd23b3b, price: 3500, label: 'VELOCE GT' }, { kind: 'monster', color: 0x2f9e54, price: 5000, label: 'RHINO XL' }];
    specs.forEach((s, i) => {
      const px = cx - 8 + i * 16, pz = cz - 6;
      const ped2 = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.8, 0.5, 22), mat(0xb8c0ca)); ped2.position.set(px, 0.4, pz); G.add(ped2);
      this.boxes.push({ x: px, z: pz, hw: 4.6, hd: 4.6, h: 0.9 });
      const car = buildSpecial(s.kind, s.color); car.position.set(px, 0.65, pz); G.add(car);
      this.displays.push({ x: px, z: pz, kind: s.kind, color: s.color, price: s.price, label: s.label, root: car });
      this._neonSign('$' + s.price, 0xffe24a, px, 4.6, pz + 4.9, 5, G);
    });
    // spray pad
    const sp = new THREE.Mesh(new THREE.BoxGeometry(9, 0.28, 9), mat(0xff5fb0, { emissive: 0xff4fa0, emissiveIntensity: 0.5 })); sp.position.set(cx + 12, 0.16, cz + 12); G.add(sp);
    this._neonSign('SPRAY', 0xff5fb0, cx + 12, 4.2, cz + 16.4, 6, G);
    const spole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 4, 8), mat(0x2a2e36)); spole.position.set(cx + 12, 2, cz + 16.6); G.add(spole);
    this.sprayPad = { x: cx + 12, z: cz + 12 };
    this._lod.push({ x: cx, z: cz, w: LOT - 6, d: LOT - 6, h: 3, c: 0xd8dde6 });
  }
  // ---- Bay County lockup: walled yard, watchtower, and the holding cell you wake up in when they bust you ----
  _jail(cx, cz, LOT, G) {
    const wallM = mat(0x9aa0a8), barM = mat(0x3a3f48), t = 0.6, H = 4.4, W = LOT - 6, hw = W / 2;
    const yard = new THREE.Mesh(new THREE.BoxGeometry(W + 4, 0.24, W + 4), mat(0x70747c, { map: noiseTexture(104, 108, 116, 8) })); yard.position.set(cx, 0.13, cz); yard.receiveShadow = true; G.add(yard);
    const seg = (w, d, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, H, d), wallM); m.position.set(cx + ox, H / 2, cz + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); this.boxes.push({ x: cx + ox, z: cz + oz, hw: w / 2 + 0.25, hd: d / 2 + 0.25 }); };
    seg(W, t, 0, -hw); seg(t, W + t, -hw, 0); seg(t, W + t, hw, 0);
    const gw = (W - 6) / 2; seg(gw, t, -(3 + gw / 2), hw); seg(gw, t, 3 + gw / 2, hw); // gate gap onto the street
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.5, 7.5, 1.5), wallM); tower.position.set(cx + hw - 4, 3.75, cz - hw + 4); tower.castShadow = true; G.add(tower);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.4, 3.8), mat(0x2b3340, { emissive: 0x9fd0ff, emissiveIntensity: 0.3 })); cab.position.set(cx + hw - 4, 8.6, cz - hw + 4); cab.castShadow = true; G.add(cab);
    this.boxes.push({ x: cx + hw - 4, z: cz - hw + 4, hw: 1.0, hd: 1.0, h: 10 });
    this._neonSign('BAY COUNTY JAIL', 0x9fd0ff, cx, H + 1.5, cz + hw + 0.35, 17, G);
    // cell block: open side faces the yard; the left half is the holding cage
    const bw = 26, bd = 13, bh = 4.6, bz = cz - hw + 8, blkM = mat(0x848a94, { emissive: 0x848a94, emissiveIntensity: 0.16 });
    const bf = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.2, bd), mat(0x565b66, { emissive: 0x565b66, emissiveIntensity: 0.3 })); bf.position.set(cx, 0.14, bz); bf.receiveShadow = true; G.add(bf);
    const br = new THREE.Mesh(new THREE.BoxGeometry(bw + 1, 0.5, bd + 1), blkM); br.position.set(cx, bh, bz); br.castShadow = true; G.add(br);
    const bwall = (w2, d2, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w2, bh, d2), blkM); m.position.set(cx + ox, bh / 2, bz + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); this.boxes.push({ x: cx + ox, z: bz + oz, hw: w2 / 2 + 0.25, hd: d2 / 2 + 0.25 }); };
    bwall(bw, t, 0, -bd / 2); bwall(t, bd, -bw / 2, 0); bwall(t, bd, bw / 2, 0);
    const lampJ = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.7, 0.14, 4), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.7 })); lampJ.position.set(cx, bh - 0.4, bz); G.add(lampJ);
    this._lamp(cx - 10, cz + 10); this._lamp(cx + 10, cz + 2); // yard floods
    // the cage: vertical bars with one sliding door section that only opens from outside (or with three good picks)
    const doorX = cx - 7.5, frontZ = bz + bd / 2 - 0.5;
    const bars = (x0, z0, len, vert, skipC, skipW) => {
      const n2 = Math.max(2, Math.round(len / 0.55));
      for (let i = 0; i <= n2; i++) { const o = -len / 2 + (i / n2) * len, px = vert ? x0 : x0 + o, pz = vert ? z0 + o : z0; if (skipW && Math.abs((vert ? pz : px) - skipC) < skipW / 2) continue; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 3.4, 6), barM); b.position.set(px, 1.7, pz); G.add(b); }
      for (const ry of [0.14, 3.32]) { const r = new THREE.Mesh(new THREE.BoxGeometry(vert ? 0.1 : len, 0.1, vert ? len : 0.1), barM); r.position.set(x0, ry, z0); G.add(r); }
    };
    bars(cx - 2, bz, bd - 1, true); // cage side wall
    this.boxes.push({ x: cx - 2, z: bz, hw: 0.16, hd: (bd - 1) / 2, h: 3.5 });
    const fl = bw / 2 - 2; bars(cx - 2 - fl / 2, frontZ, fl, false, doorX, 2.6); // cage front with the door gap
    this.boxes.push({ x: (cx - bw / 2 + doorX - 1.3) / 2, z: frontZ, hw: (doorX - 1.3 - (cx - bw / 2)) / 2, hd: 0.16, h: 3.5 });
    this.boxes.push({ x: (doorX + 1.3 + cx - 2) / 2, z: frontZ, hw: (cx - 2 - (doorX + 1.3)) / 2, hd: 0.16, h: 3.5 });
    const door = new THREE.Group();
    for (let i = 0; i < 5; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 3.3, 6), barM); b.position.set(-1.1 + i * 0.55, 1.7, 0); door.add(b); }
    for (const ry of [0.2, 3.25]) { const r = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), barM); r.position.set(0, ry, 0); door.add(r); }
    door.position.set(doorX + 2.7, 0, frontZ); G.add(door); // parked in its open slot; it slides shut when they book you
    this.jailDoor = door; this.jailDoorBox = { x: doorX, z: frontZ, hw: 1.4, hd: 0.2, h: 3.5 };
    this.jail = { cell: { x: doorX, z: bz - 2 }, door: { x: doorX, z: frontZ } };
    this.jailOpen = true;
    // bunk + steel toilet in the cage, duty desk on the guard side
    const bunk = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.2), mat(0x4a5a6c)); bunk.position.set(cx - 11, 0.55, bz - 4.6); G.add(bunk); this.boxes.push({ x: cx - 11, z: bz - 4.6, hw: 1.4, hd: 0.7, h: 1 });
    const mtr = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.18, 1.1), mat(0xd8dde6)); mtr.position.set(cx - 11, 0.9, bz - 4.6); G.add(mtr);
    const toi = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.55, 10), mat(0xc8ced8)); toi.position.set(cx - 3.4, 0.32, bz - 4.9); G.add(toi);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.0, 1.2), mat(0x5a4632)); desk.position.set(cx + 6, 0.75, bz - 2); desk.castShadow = true; G.add(desk); this.boxes.push({ x: cx + 6, z: bz - 2, hw: 1.9, hd: 0.8, h: 1.3 });
    if (this._lod) { this._lod.push({ x: cx, z: bz, w: bw, d: bd, h: bh, c: 0x848a94 }); this._lod.push({ x: cx, z: cz, w: W, d: W, h: H, c: 0x9aa0a8 }); }
  }
  jailDoorClose() { if (!this.jailDoor) return; this.jailOpen = false; if (this.boxes.indexOf(this.jailDoorBox) < 0) this.boxes.push(this.jailDoorBox); }
  jailDoorOpen() { if (!this.jailDoor) return; this.jailOpen = true; const i = this.boxes.indexOf(this.jailDoorBox); if (i >= 0) this.boxes.splice(i, 1); }
  // ---- AMMU-BAY: the island's legal-carry gun counter (walk in, E at the counter to buy) ----
  _gunshop(cx, cz, LOT, G) {
    const w = LOT - 12, d = LOT - 18, h = 5.8, t = 0.4, col = 0x4a5260, wallMat = mat(col, { emissive: col, emissiveIntensity: 0.18 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), mat(0x3a4048, { emissive: 0x3a4048, emissiveIntensity: 0.32 })); floor.position.set(cx, 0.14, cz); floor.receiveShadow = true; G.add(floor);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, t, d + 1), wallMat); roof.position.set(cx, h, cz); roof.castShadow = true; G.add(roof);
    const wall = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h, dd), wallMat); m.position.set(cx + ox, h / 2, cz + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); this.boxes.push({ x: cx + ox, z: cz + oz, hw: ww / 2 + 0.25, hd: dd / 2 + 0.25 }); };
    wall(w, t, 0, -d / 2); wall(t, d, -w / 2, 0); wall(t, d, w / 2, 0);
    this._neonSign('AMMU-BAY', 0xff9a3a, cx, h + 1.1, cz + d / 2 + 0.25, w * 0.8, G);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(w * 0.94, 0.5, 0.3), mat(0xff9a3a, { emissive: 0xff9a3a, emissiveIntensity: 1.6 })); strip.position.set(cx, h + 0.25, cz + d / 2 + 0.2); G.add(strip);
    const cnt = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 1.05, 1.4), mat(0x2b3340)); cnt.position.set(cx, 0.8, cz - d * 0.18); cnt.castShadow = true; G.add(cnt);
    const showcase = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.3, 1.2), mat(0x9fe8ff, { emissive: 0x4fd0ff, emissiveIntensity: 0.9, transparent: true, opacity: 0.6 })); showcase.position.set(cx, 1.45, cz - d * 0.18); G.add(showcase);
    this.boxes.push({ x: cx, z: cz - d * 0.18, hw: w * 0.275 + 0.2, hd: 0.9, h: 1.5 });
    for (let i = 0; i < 4; i++) { // wall racks with hardware on pegs
      const rx = cx - w / 2 + 4 + i * (w - 8) / 3;
      const rack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 0.12), mat(0x2c313b)); rack.position.set(rx, 2.6, cz - d / 2 + 0.35); G.add(rack);
      const g1 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.1), mat(0x14171c)); g1.position.set(rx, 3.1, cz - d / 2 + 0.45); G.add(g1);
      const g2 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.7, 0.1), mat(0x14171c)); g2.position.set(rx - 0.45, 2.6, cz - d / 2 + 0.45); G.add(g2);
    }
    const tgt = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.7, 1.0), mat(0xe8e2d2)); tgt.position.set(cx + w / 2 - 0.4, 1.7, cz + d * 0.2); G.add(tgt);
    const sil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.55), mat(0x2b2b33)); sil.position.set(cx + w / 2 - 0.44, 1.7, cz + d * 0.2); G.add(sil);
    const lampG = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 0.14, d * 0.55), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.8 })); lampG.position.set(cx, h - 0.4, cz); G.add(lampG);
    this.workposts.push({ x: cx, z: cz - d * 0.18 - 1.35, yaw: 0 });
    this.errands.push({ x: cx, z: cz + d / 2 + 2.5 });
    this.shops.push({ x: cx, z: cz, w, d, type: 'gunshop', name: 'AMMU-BAY' });
    if (this._lod) this._lod.push({ x: cx, z: cz, w: w + 1, d: d + 1, h, c: col });
  }
  // ---- Bay Mutual: marble, columns, tellers — and a vault that only argues with a drawn pistol ----
  _bank(cx, cz, LOT, G) {
    const w = LOT - 10, d = LOT - 14, h = 9, t = 0.5, col = 0xd9d3c6, wallMat = mat(col, { emissive: col, emissiveIntensity: 0.14 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.22, d), mat(0xbfb9ac, { emissive: 0xbfb9ac, emissiveIntensity: 0.24 })); floor.position.set(cx, 0.15, cz); floor.receiveShadow = true; G.add(floor);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.4, 0.8, d + 1.4), mat(0xc9c3b6)); roof.position.set(cx, h, cz); roof.castShadow = true; G.add(roof);
    const wall = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h, dd), wallMat); m.position.set(cx + ox, h / 2, cz + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); this.boxes.push({ x: cx + ox, z: cz + oz, hw: ww / 2 + 0.25, hd: dd / 2 + 0.25 }); };
    wall(w, t, 0, -d / 2); wall(t, d, -w / 2, 0); wall(t, d, w / 2, 0);
    for (let i = 0; i < 4; i++) { const px = cx - w / 2 + (i + 0.5) * (w / 4); const c2 = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, h, 14), wallMat); c2.position.set(px, h / 2, cz + d / 2 - 0.7); c2.castShadow = true; G.add(c2); this.boxes.push({ x: px, z: cz + d / 2 - 0.7, hw: 0.85, hd: 0.85 }); }
    const steps = new THREE.Mesh(new THREE.BoxGeometry(w + 2, 0.5, 3), mat(0xcac4b7)); steps.position.set(cx, 0.25, cz + d / 2 + 1.4); G.add(steps);
    this._neonSign('BAY MUTUAL', 0xffd23a, cx, h + 1.2, cz + d / 2 + 0.3, w * 0.7, G);
    const cnt = new THREE.Mesh(new THREE.BoxGeometry(w * 0.66, 1.15, 1.4), mat(0x6b5638)); cnt.position.set(cx, 0.86, cz - d * 0.2); cnt.castShadow = true; G.add(cnt);
    this.boxes.push({ x: cx, z: cz - d * 0.2, hw: w * 0.33 + 0.2, hd: 0.9, h: 1.5 });
    const teller = new THREE.Mesh(new THREE.BoxGeometry(w * 0.62, 1.0, 0.08), mat(0xbfe4e8, { transparent: true, opacity: 0.35 })); teller.position.set(cx, 2.0, cz - d * 0.2); G.add(teller);
    const vault = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.6, 22), mat(0x8a8f98)); vault.rotation.x = Math.PI / 2; vault.position.set(cx, 2.2, cz - d / 2 + 0.7); G.add(vault);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.16, 10, 22), mat(0xffd23a, { emissive: 0xd4a92f, emissiveIntensity: 0.8 })); ring.position.set(cx, 2.2, cz - d / 2 + 1.02); G.add(ring);
    for (const sx of [-1, 1]) for (let i = 0; i < 2; i++) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 8), mat(0xc9a23a)); pole.position.set(cx + sx * 2.2, 0.65, cz + 1 + i * 2.4); G.add(pole); }
    const chand = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 0.16, d * 0.4), mat(0xfff2d8, { emissive: 0xffe9c0, emissiveIntensity: 1.4 })); chand.position.set(cx, h - 0.7, cz); G.add(chand);
    this.workposts.push({ x: cx - w * 0.15, z: cz - d * 0.2 - 1.4, yaw: 0 });
    this.workposts.push({ x: cx + w * 0.15, z: cz - d * 0.2 - 1.4, yaw: 0 });
    this.shops.push({ x: cx, z: cz, w, d, type: 'bank', name: 'Bay Mutual' });
    if (this._lod) this._lod.push({ x: cx, z: cz, w: w + 1, d: d + 1, h, c: col });
  }
  // ---- northwest suburbs: lawns, picket fences, family homes — and your own place ----
  _houses(cx, cz, LOT, rng, G, mine) {
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(LOT, 0.24, LOT), mat(0x4c8a4f, { map: noiseTexture(76, 134, 80, 14) })); lawn.material.map.repeat.set(5, 5); lawn.position.set(cx, 0.12, cz); lawn.receiveShadow = true; G.add(lawn);
    const HOUSE = [0xf2e0c8, 0xd8e8f0, 0xf0d2d8, 0xe2e8d0, 0xf5e6bc, 0xd9c9ee], ROOFS = [0x9a4f3a, 0x6b4a3a, 0x54606e, 0x7a5a46];
    const house = (hx, hz, open) => {
      const w2 = 15, d2 = 11, h2 = 3.4, col = open ? 0xf5e6bc : HOUSE[(rng() * HOUSE.length) | 0], rcol = ROOFS[(rng() * ROOFS.length) | 0], wallMat = mat(col);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(w2 * 0.74, 2.6, 4), mat(rcol)); roof.scale.z = d2 / w2 * 1.15; roof.rotation.y = Math.PI / 4; roof.position.set(hx, h2 + 1.3, hz); roof.castShadow = true; G.add(roof);
      const chim = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), mat(0x8a5a4a)); chim.position.set(hx + w2 / 2 - 2, h2 + 1.6, hz - 2); G.add(chim);
      if (open) { // your place: front door's always open for you
        const t2 = 0.4, wallMat2 = mat(col, { emissive: col, emissiveIntensity: 0.16 });
        const floor2 = new THREE.Mesh(new THREE.BoxGeometry(w2, 0.2, d2), mat(0x7a5a3c, { emissive: 0x7a5a3c, emissiveIntensity: 0.28 })); floor2.position.set(hx, 0.14, hz); floor2.receiveShadow = true; G.add(floor2);
        const wall2 = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h2, dd), wallMat2); m.position.set(hx + ox, h2 / 2, hz + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); this.boxes.push({ x: hx + ox, z: hz + oz, hw: ww / 2 + 0.25, hd: dd / 2 + 0.25 }); };
        wall2(w2, t2, 0, -d2 / 2); wall2(t2, d2, -w2 / 2, 0); wall2(t2, d2, w2 / 2, 0);
        wall2(w2 * 0.36, t2, -w2 * 0.32, d2 / 2); wall2(w2 * 0.36, t2, w2 * 0.32, d2 / 2); // front walls leave a door-width gap
        const ceil2 = new THREE.Mesh(new THREE.BoxGeometry(w2 + 0.6, t2, d2 + 0.6), wallMat); ceil2.position.set(hx, h2, hz); ceil2.castShadow = true; G.add(ceil2);
        const bed = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.55, 3.2), mat(0x8a3a58)); bed.position.set(hx - w2 / 2 + 1.8, 0.5, hz - d2 / 2 + 2.2); bed.castShadow = true; G.add(bed);
        const pil = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 0.8), mat(0xe8ecf2)); pil.position.set(hx - w2 / 2 + 1.8, 0.9, hz - d2 / 2 + 1.1); G.add(pil);
        this.boxes.push({ x: hx - w2 / 2 + 1.8, z: hz - d2 / 2 + 2.2, hw: 1.2, hd: 1.7, h: 1 });
        const couch = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 1.2), mat(0x4a6c8a)); couch.position.set(hx + 2.5, 0.55, hz + 1.5); couch.castShadow = true; G.add(couch);
        this.boxes.push({ x: hx + 2.5, z: hz + 1.5, hw: 1.7, hd: 0.7, h: 1 });
        const tv = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.1, 0.14), mat(0x10141c, { emissive: 0x2f7fd4, emissiveIntensity: 0.9 })); tv.position.set(hx + 2.5, 1.3, hz - d2 / 2 + 0.5); G.add(tv);
        const lamp3 = new THREE.Mesh(new THREE.BoxGeometry(w2 * 0.4, 0.12, d2 * 0.4), mat(0xffe8c8, { emissive: 0xffdca8, emissiveIntensity: 1.2 })); lamp3.position.set(hx, h2 - 0.35, hz); G.add(lamp3);
        this.homePos = { x: hx, z: hz };
        this.shops.push({ x: hx, z: hz, w: w2, d: d2, type: 'home', name: 'your place' });
        this._neonSign('CASA MIA', 0x4dff9e, hx, h2 + 0.6, hz + d2 / 2 + 0.28, 5.5, G);
      } else {
        const body = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, d2), wallMat); body.position.set(hx, h2 / 2, hz); body.castShadow = true; body.receiveShadow = true; G.add(body);
        this.boxes.push({ x: hx, z: hz, hw: w2 / 2 + 0.2, hd: d2 / 2 + 0.2, h: h2 + 2 });
        const doorM = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.3, 0.12), mat(0x5a4632)); doorM.position.set(hx, 1.15, hz + d2 / 2 + 0.07); G.add(doorM);
        for (const sx of [-1, 1]) { const win = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.3, 0.1), mat(0x18243a, { emissive: 0xffe2a8, emissiveIntensity: rng() < 0.6 ? 0.9 : 0.15 })); win.position.set(hx + sx * w2 * 0.28, 1.9, hz + d2 / 2 + 0.06); G.add(win); }
      }
      if (this._lod) this._lod.push({ x: hx, z: hz, w: w2, d: d2, h: h2 + 2, c: col });
    };
    house(cx - 11, cz - 6, mine);
    if (!mine && rng() < 0.35) this._smallShop(cx + 11, cz - 4, 13, 9, 4.4, rng, G, false); // the corner store every block needs
    else house(cx + 11, cz - 6, false);
    // driveway path, white picket fence with a gate gap, greenery
    const path = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.26, LOT / 2 - 2)); path.material = mat(0x8f959e); path.position.set(cx - 11, 0.15, cz + LOT / 4 + 1); G.add(path);
    const fz = cz + LOT / 2 - 1.2;
    for (const [rx2, rw2] of [[cx - 17, 9], [cx + 6, 29]]) { for (const ry2 of [0.3, 0.62]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(rw2, 0.14, 0.13), mat(0xeef2f6)); rail.position.set(rx2, ry2, fz); G.add(rail); } }
    for (let i = 0; i < 16; i++) { const px3 = cx - 21.5 + i * 2.9; if (Math.abs(px3 - (cx - 11)) < 1.6) continue; const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.85, 0.12), mat(0xeef2f6)); post.position.set(px3, 0.42, fz); G.add(post); }
    for (let i = 0; i < 3; i++) { const bush = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), mat(0x3f8f4a)); bush.position.set(cx + rnd(-LOT / 2 + 4, LOT / 2 - 4), 0.75, cz + rnd(2, LOT / 2 - 5)); bush.castShadow = true; G.add(bush); }
    for (let i = 0; i < 2; i++) { const mound = new THREE.Mesh(new THREE.SphereGeometry(rnd(2.6, 4.2), 14, 10), mat(0x55924e)); mound.scale.y = 0.16; mound.position.set(cx + rnd(-LOT / 2 + 7, LOT / 2 - 7), 0.12, cz - LOT / 2 + rnd(4, 11)); G.add(mound); } // rolling back yards
    this.palm(cx + rnd(-8, 8), cz + LOT / 2 - 6, G);
    this.errands.push({ x: cx - 11, z: cz + LOT / 2 - 4 });
  }
  inBay(x, z) { return x > this.bayX0 - 1 && x < this.bayX1 + 1 && Math.abs(z) < this.size / 2 + 10; }
  isWater(x, z) {
    const half = this.size / 2;
    if (this.starfish) { const S = this.starfish, ex = (x - S.x) / (S.rx + 2), ez = (z - S.z) / (S.rz + 2); if (ex * ex + ez * ez < 1) return false; } // Starfish is dry land in the bay
    if (this.inBay(x, z) && !this.onRoad(x, z)) return true;
    const onIsland = Math.abs(x) < half + 62 && Math.abs(z) < half + 62;
    const onAirport = x > -110 && x < 230 && z < -half - 40 && z > -half - 300;
    if (onIsland || onAirport) return false;
    for (const I of (this.islets || [])) if (Math.hypot(x - I.x, z - I.z) < I.r - 5) return false;
    return true;
  }
  // which neighbourhood are you standing in? (drives the GTA-style area callout)
  districtAt(x, z) {
    const half = this.size / 2;
    if (this.starfish && ((x - this.starfish.x) / (this.starfish.rx + 3)) ** 2 + ((z - this.starfish.z) / (this.starfish.rz + 3)) ** 2 < 1) return 'Starfish Island';
    if (this.privIslet && Math.hypot(x - this.privIslet.x, z - this.privIslet.z) < this.privIslet.r) return 'Isla Privada';
    if (x > half + 8) return 'Vice Beach';
    if (z < -half - 20) return 'Escobar Int’l';
    if (z > half - this.cell * 1.4) return 'Sunset Heights';
    const ix = Math.floor((x + half) / this.cell), iz = Math.floor((z + half) / this.cell);
    if (ix > this.bayIx) return 'Ocean Drive';
    if (iz <= 1) return 'The Docklands';
    if (ix >= 2 && ix <= 4 && iz >= 3 && iz <= 6) return 'Downtown';
    return 'Little Havana';
  }
  // ---- terrain: the island is only flat where the streets are ----
  groundH(x, z) {
    const half = this.size / 2; let h = 0;
    const ax = Math.abs(x), az = Math.abs(z);
    if ((ax > half + 2 || az > half + 2) && !(x > -110 && x < 230 && z < -half - 30 && z > -half - 310)) { // runway stays level
      const d = Math.max(ax, az) - (half + 2);
      if (d > 0 && d < 56) {
        let amp = 1.15 + Math.sin(x * 0.043) * Math.sin(z * 0.057) * 0.85;   // shore dunes
        if (x < -half) amp += 1.6 + Math.sin(z * 0.021 + 1.3) * 1.1;         // west headland hills
        if (z > half) amp += 1.3 + Math.sin(x * 0.024 + 0.6) * 0.9;          // north ridge behind the 'burbs
        h = Math.max(0, Math.sin(Math.PI * d / 56) * amp);
      }
    }
    for (const I of (this.islets || [])) { const di = Math.hypot(x - I.x, z - I.z); if (di < I.r) h = Math.max(h, I.h * Math.pow(Math.cos(di / I.r * Math.PI / 2), 1.35)); }
    return h;
  }
  // ground mesh that actually follows groundH — real dunes and hills, not painted flats
  _shore(cx, cz, w, d, color, sx, sz) {
    const geo = new THREE.PlaneGeometry(w, d, sx, sz); geo.rotateX(-Math.PI / 2);
    const P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) P.setY(i, this.groundH(cx + P.getX(i), cz + P.getZ(i)) + 0.03);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat(color)); m.position.set(cx, 0, cz); m.receiveShadow = true; this.group.add(m); return m;
  }
  // Starfish Island: gated old-money villas on a dry oval mid-bay, reached by boat
  _starfish() {
    const S = this.starfish, G = this.group;
    const geo = new THREE.CircleGeometry(1, 44); geo.scale(S.rx, 1, S.rz); geo.rotateX(-Math.PI / 2);
    const grass = new THREE.Mesh(geo, mat(0x4c8a4f)); grass.position.set(S.x, 0.16, S.z); grass.receiveShadow = true; G.add(grass);
    const ringG = new THREE.RingGeometry(0.86, 1, 44); ringG.scale(S.rx + 3, S.rz + 3, 1); ringG.rotateX(-Math.PI / 2);
    const sand = new THREE.Mesh(ringG, mat(0xd6c493)); sand.position.set(S.x, 0.12, S.z); G.add(sand);
    const path = new THREE.Mesh(new THREE.BoxGeometry(3, 0.2, S.rz * 1.7), mat(0x8f959e)); path.position.set(S.x, 0.2, S.z); G.add(path);
    const villaCols = [0xf2e0c8, 0xf0d2d8, 0xd9c9ee, 0xf5e6bc];
    for (let i = 0; i < 4; i++) {
      const ang = i / 4 * TAU + 0.4, vx = S.x + Math.cos(ang) * S.rx * 0.55, vz = S.z + Math.sin(ang) * S.rz * 0.55;
      const w = 9, d = 7, h = 4.2, col = villaCols[i], wallMat = mat(col, { emissive: col, emissiveIntensity: 0.14 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat); body.position.set(vx, 0.3 + h / 2, vz); body.castShadow = true; G.add(body);
      this.boxes.push({ x: vx, z: vz, hw: w / 2 + 0.2, hd: d / 2 + 0.2, h: h + 1 });
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.5, d + 1), mat(new THREE.Color(col).multiplyScalar(0.8).getHex())); roof.position.set(vx, 0.3 + h, vz); G.add(roof);
      for (const sx of [-1, 1]) { const win = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.1), mat(0x18243a, { emissive: 0xffe2a8, emissiveIntensity: 0.7 })); win.position.set(vx + sx * w * 0.28, 2.4, vz + d / 2 + 0.06); G.add(win); }
      this.palm(vx + rnd(-3, 3), vz + d / 2 + 2.5, G);
    }
    this._neonSign('STARFISH ISLAND', 0xffd27a, S.x, 5, S.z + S.rz - 2, 14, G);
    this.starfishPlace = { x: S.x, z: S.z };
  }
  // south-shore lighthouse: a rotating beacon you can see across the bay
  _lighthouse(half) {
    const G = this.group, lx = -half + 40, lz = -half - 28, gH = this.groundH(lx, lz);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 3.0, 2, 16), mat(0x8a8f98)); base.position.set(lx, gH + 1, lz); base.castShadow = true; G.add(base);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 2.0, 16, 16), mat(0xf0f0f4)); tower.position.set(lx, gH + 10, lz); tower.castShadow = true; G.add(tower);
    for (let i = 0; i < 3; i++) { const band = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.78, 2, 16), mat(0xd23b3b)); band.position.set(lx, gH + 5 + i * 4.5, lz); G.add(band); }
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.6, 16), mat(0x2a2e36)); gallery.position.set(lx, gH + 18.2, lz); G.add(gallery);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 2.4, 12), mat(0xfff2c0, { emissive: 0xffe08a, emissiveIntensity: 2.6, transparent: true, opacity: 0.9 })); lantern.position.set(lx, gH + 19.7, lz); G.add(lantern);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2, 12), mat(0x2a2e36)); cap.position.set(lx, gH + 21.9, lz); G.add(cap);
    const beam = new THREE.Mesh(new THREE.ConeGeometry(2.2, 26, 4, 1, true), mat(0xfff2c0, { emissive: 0xffe08a, emissiveIntensity: 1.4, transparent: true, opacity: 0.14, side: THREE.DoubleSide })); beam.rotation.z = Math.PI / 2; beam.position.set(lx, gH + 19.7, lz); G.add(beam);
    this.boxes.push({ x: lx, z: lz, hw: 2.2, hd: 2.2, h: gH + 22 });
    this.lighthouseBeam = beam;
  }
  _mansion(I) {
    const gH = this.groundH(I.x, I.z), G = this.group, y0 = gH + 0.28, wallMat = mat(0xf2ede2);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(22, 0.6, 16), mat(0xd8d2c4)); pad.position.set(I.x, gH - 0.02, I.z); pad.receiveShadow = true; G.add(pad);
    const w = 14, d = 9, h = 3.6, t = 0.4;
    const wall = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h, dd), wallMat); m.position.set(I.x + ox, y0 + h / 2, I.z + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); this.boxes.push({ x: I.x + ox, z: I.z + oz, hw: ww / 2 + 0.25, hd: dd / 2 + 0.25, h: gH + h + 1 }); };
    wall(w, t, 0, -d / 2); wall(t, d, -w / 2, 0); wall(t, d, w / 2, 0);
    wall(w * 0.34, t, -w * 0.33, d / 2); wall(w * 0.34, t, w * 0.33, d / 2); // grand open entry
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1.2, 0.5, d + 1.2), mat(0xe0d8c8)); roof.position.set(I.x, y0 + h, I.z); roof.castShadow = true; G.add(roof);
    const para = new THREE.Mesh(new THREE.BoxGeometry(w + 1.0, 0.6, d + 1.0), wallMat); para.position.set(I.x, y0 + h + 0.4, I.z); G.add(para);
    const lampM = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.12, d * 0.5), mat(0xffe8c8, { emissive: 0xffdca8, emissiveIntensity: 1.4 })); lampM.position.set(I.x, y0 + h - 0.35, I.z); G.add(lampM);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(4, 1.05, 1.1), mat(0x3a2a4a)); bar2.position.set(I.x - 3, y0 + 0.8, I.z - 2.6); G.add(bar2);
    const bedM = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 3.4), mat(0xc9a23a)); bedM.position.set(I.x + 4, y0 + 0.5, I.z - 2.2); G.add(bedM);
    // infinity pool + loungers on the pad
    const pool = new THREE.Mesh(new THREE.BoxGeometry(7, 0.3, 4.4), mat(0x2fd0e0, { emissive: 0x2fb8d0, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 })); pool.position.set(I.x - 2, gH + 0.3, I.z + 5.4); G.add(pool);
    for (let i = 0; i < 2; i++) { const lng = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 2.2), mat(0xf0f0f4)); lng.position.set(I.x + 4.5 + i * 1.6, gH + 0.45, I.z + 5.2); lng.rotation.x = -0.14; G.add(lng); }
    this._neonSign('ISLA PRIVADA', 0xffd23a, I.x, y0 + h + 1.7, I.z + d / 2 + 0.4, 12, G);
    // the stash: a golden briefcase on a pedestal inside
    const ped4 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.9, 12), mat(0x8a8f98)); ped4.position.set(I.x, y0 + 0.45, I.z + 1); G.add(ped4);
    const bc = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.3), mat(0xffd23a, { emissive: 0xd4a92f, emissiveIntensity: 1.2 })); bc.position.set(I.x, y0 + 1.2, I.z + 1); G.add(bc);
    this.briefcase = { x: I.x, z: I.z + 1, m: bc, got: false };
    this.privIslet = I;
  }
  _warehouse(cx, cz, LOT, rng, G) {
    // dockland warehouse: open loading front, crates inside, containers in the yard
    const w = LOT - 10, d = LOT - 16, h = 8 + rng() * 4, t = 0.5, col = pick([0x8a8f98, 0xa08a6a, 0x7a8a96, 0x96786a]);
    const wallMat = mat(col);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), mat(0x3a3d44)); floor.position.set(cx, 0.12, cz); floor.receiveShadow = true; G.add(floor);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, t, d + 1), mat(new THREE.Color(col).multiplyScalar(0.8).getHex())); roof.position.set(cx, h, cz); roof.castShadow = true; G.add(roof);
    const wall = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h, dd), wallMat); m.position.set(cx + ox, h / 2, cz + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); };
    wall(w, t, 0, -d / 2); wall(t, d, -w / 2, 0); wall(t, d, w / 2, 0);
    this.boxes.push({ x: cx, z: cz - d / 2, hw: w / 2 + 0.3, hd: t / 2 + 0.3 });
    this.boxes.push({ x: cx - w / 2, z: cz, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    this.boxes.push({ x: cx + w / 2, z: cz, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    for (let i = 0; i < 3; i++) { const crate = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.2, 2.2), mat(0x9a7a4a)); crate.position.set(cx + rnd(-w / 3, w / 3), 1.2, cz - d * 0.25 + rnd(-2, 2)); crate.castShadow = true; G.add(crate); this.boxes.push({ x: crate.position.x, z: crate.position.z, hw: 1.3, hd: 1.3, h: 2.4 }); }
    const cCols = [0xc84a3a, 0x3a6ac8, 0x3aa06a, 0xc8a23a];
    for (let i = 0; i < 2; i++) { const cont = new THREE.Mesh(new THREE.BoxGeometry(7, 2.6, 2.6), mat(pick(cCols))); cont.position.set(cx - w / 2 + 3, 1.3 + (i === 1 ? 2.6 : 0), cz + d / 2 + 3.6); cont.rotation.y = rnd(-0.08, 0.08); cont.castShadow = true; G.add(cont); if (i === 0) this.boxes.push({ x: cont.position.x, z: cont.position.z, hw: 3.7, hd: 1.5, h: 5.4 }); }
    this._lod.push({ x: cx, z: cz, w: w + 1, d: d + 1, h, c: col });
    this.shops.push({ x: cx, z: cz, w, d, type: 'warehouse' });
  }
  _airport(half) {
    const cz = -half - 105; // runway centre (south of the city), runway runs along Z
    const tar = new THREE.Mesh(new THREE.PlaneGeometry(150, 320), mat(0x40444d)); tar.rotation.x = -Math.PI / 2; tar.position.set(0, 0.05, cz); tar.receiveShadow = true; this.group.add(tar);
    const rw = new THREE.Mesh(new THREE.BoxGeometry(30, 0.3, 300), mat(0x2b2e35)); rw.position.set(0, 0.16, cz); this.group.add(rw);
    for (let i = -6; i <= 6; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.02, 12), mat(0xf0f0f4, { emissive: 0x9aa, emissiveIntensity: 0.4 })); d.position.set(0, 0.33, cz + i * 22); this.group.add(d); }
    const term = new THREE.Mesh(new THREE.BoxGeometry(120, 16, 30), mat(0xc6ccd6)); term.position.set(92, 8, cz - 20); term.castShadow = true; term.receiveShadow = true; this.group.add(term);
    this.boxes.push({ x: 92, z: cz - 20, hw: 60, hd: 16, h: 16 });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(118, 10, 0.4), mat(0x0e2036, { emissive: 0x2f6fd4, emissiveIntensity: 0.4 })); glass.position.set(92, 8, cz - 4.8); this.group.add(glass);
    const ctrl = new THREE.Mesh(new THREE.BoxGeometry(9, 30, 9), mat(0xb0b8c2)); ctrl.position.set(150, 15, cz - 20); ctrl.castShadow = true; this.group.add(ctrl);
    const ctop = new THREE.Mesh(new THREE.BoxGeometry(13, 6, 13), mat(0x123, { emissive: 0x2f6fd4, emissiveIntensity: 0.3 })); ctop.position.set(150, 32, cz - 20); this.group.add(ctop); this.boxes.push({ x: 150, z: cz - 20, hw: 6, hd: 6, h: 35 });
    this.airport = { z: cz, exit: { x: 24, z: -half - 40 } };
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
    const wallCol0 = new THREE.Color(color).multiplyScalar(0.92).getHex(), wallMat = mat(wallCol0, { emissive: wallCol0, emissiveIntensity: 0.14 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), mat(0x3d3849, { emissive: 0x3d3849, emissiveIntensity: 0.3 })); floor.position.set(x, 0.12, z); floor.receiveShadow = true; G.add(floor);
    const wall = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h0, dd), wallMat); m.position.set(x + ox, h0 / 2, z + oz); m.castShadow = true; m.receiveShadow = true; G.add(m); };
    wall(w, t, 0, -d / 2); wall(t, d, -w / 2, 0); wall(t, d, w / 2, 0);           // back + two sides
    this.boxes.push({ x, z: z - d / 2, hw: w / 2 + 0.3, hd: t / 2 + 0.3 });
    this.boxes.push({ x: x - w / 2, z, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    this.boxes.push({ x: x + w / 2, z, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, h0, 12), trimMat); c.position.set(x + sx * (w / 2 - 0.55), h0 / 2, z + d / 2 - 0.55); c.castShadow = true; G.add(c); this.boxes.push({ x: c.position.x, z: c.position.z, hw: 0.6, hd: 0.6 }); }
    // lobby fit-out: reception desk, glowing elevator doors, ceiling glow, point light
    const desk = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.1, 1.3), mat(0x5a4632)); desk.position.set(x, 0.82, z - d * 0.2); desk.castShadow = true; G.add(desk);
    this.boxes.push({ x, z: z - d * 0.2, hw: w * 0.25 + 0.2, hd: 0.85, h: 1.4 });
    const elev = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.45, 3), h0 - 1.0, 0.16), mat(0x1a2530, { emissive: 0x2fd0e0, emissiveIntensity: 0.5 })); elev.position.set(x, (h0 - 1.0) / 2, z - d / 2 + 0.35); G.add(elev);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.7, 0.16, d * 0.6), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.3 })); panel.position.set(x, h0 - 0.4, z); G.add(panel);
    const rug2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.45, 0.05, d * 0.4), mat(0x33405e)); rug2.position.set(x, 0.24, z + d * 0.12); rug2.receiveShadow = true; G.add(rug2);
    const pot2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 10), mat(0xa06a3a)); pot2.position.set(x + w / 2 - 1.3, 0.5, z + d / 2 - 1.5); G.add(pot2);
    const frond2 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 9, 7), mat(0x2f7e44)); frond2.position.set(x + w / 2 - 1.3, 1.1, z + d / 2 - 1.5); G.add(frond2);
    // shaft above the lobby (no ground-level collision) — REAL 3D windows + floor slabs
    const shaftH = h - h0;
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(w, shaftH, d), mat(color)); shaft.position.set(x, h0 + shaftH / 2, z); shaft.castShadow = true; shaft.receiveShadow = true; G.add(shaft);
    this._towerWindows(x, z, w, d, h0, shaftH, G);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.6, d + 0.8), trimMat); ledge.position.set(x, h0, z); ledge.castShadow = true; G.add(ledge);
    const para = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 1.0, d + 0.6), trimMat); para.position.set(x, h - 0.2, z); para.castShadow = true; G.add(para);
    const tank = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 2.4, d * 0.3), mat(0x33373f)); tank.position.set(x + rnd(-w * 0.2, w * 0.2), h + 1.2, z + rnd(-d * 0.2, d * 0.2)); tank.castShadow = true; G.add(tank);
    const awn = new THREE.Mesh(new THREE.BoxGeometry(Math.min(w * 0.8, 5), 0.3, 1.0), mat(pick(NEONS))); awn.position.set(x, h0 + 0.2, z + d / 2 + 0.5); G.add(awn);
    if (h > 46 && rng() < 0.7) { const nc = pick(NEONS), sh = Math.min(h * 0.5, 20); const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, sh, 0.5), mat(nc, { emissive: nc, emissiveIntensity: 2.2 })); sign.position.set(x + (rng() < .5 ? -1 : 1) * (w / 2 + 0.4), h0 + shaftH * 0.55, z + d / 2 + 0.3); G.add(sign); }
    if (this._lod) this._lod.push({ x, z, w, d, h, c: color });
    this.shops.push({ x, z, w, d, type: 'tower' });
  }
  _neonSign(text, hex, x, y, z, w, G) {
    const t = signTexture(text, '#' + hex.toString(16).padStart(6, '0'));
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, w / 4), mat(0xffffff, { map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 2.4, transparent: true })); s.position.set(x, y, z); G.add(s); return s;
  }
  _venue(cx, cz, LOT, type, rng, G) {
    const w = LOT - 10, d = LOT - 14, h = type === 'club' ? 6.5 : 5.4, t = 0.4;
    const accent = type === 'club' ? pick([0xff3d9a, 0x9b5cff, 0x2fe6ff]) : type === 'hotel' ? 0xffd27a : type === 'diner' ? 0xff5a5a : pick(NEONS);
    const wallCol = pick(FACADES), wallMat = mat(wallCol, { emissive: wallCol, emissiveIntensity: 0.16 }), floorCol = type === 'club' ? 0x241c38 : 0x4a4658, floorMat = mat(floorCol, { emissive: floorCol, emissiveIntensity: 0.3 });
    if (this._lod) this._lod.push({ x: cx, z: cz, w: w + 1, d: d + 1, h: h + 1, c: wallCol });
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
    const rec = { x: cx, z: cz, w, d, type, strip: under, name: pick(VENUE_NAMES[type]) };
    // day-shift staff post behind the counter/desk/booth (clerks clock in and out with the sun)
    this.workposts.push(type === 'club' ? { x: cx + w * 0.28, z: cz - d / 2 + 1.6, yaw: 0 } : type === 'hotel' ? { x: cx, z: cz - d * 0.22 - 1.4, yaw: 0 } : type === 'diner' ? { x: cx, z: cz - d * 0.16 - 1.35, yaw: 0 } : { x: cx, z: cz - d * 0.18 - 1.4, yaw: 0 });
    if (type === 'diner' || type === 'shop') this.errands.push({ x: cx + rnd(-3, 3), z: cz + d / 2 + 2.5 });
    if (type === 'club') {
      const cols = [0xff3d9a, 0x2fe6ff, 0x9b5cff, 0x4dff9e, 0xffe24a];
      for (let a = -2; a <= 2; a++) for (let b = -2; b <= 2; b++) { const col = cols[(a + b + 4) % cols.length]; const tile = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 2.6), mat(col, { emissive: col, emissiveIntensity: 1.4 })); tile.position.set(cx + a * 2.8, 0.32, cz + b * 2.8 - 2); G.add(tile); }
      const dj = new THREE.Mesh(new THREE.BoxGeometry(w * 0.4, 1.1, 1.6), mat(0x101018, { emissive: accent, emissiveIntensity: 0.6 })); dj.position.set(cx, 0.75, cz - d / 2 + 1.6); G.add(dj);
      for (const sx of [-1, 0, 1]) { const beam = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4.5, 12, 1, true), mat(pick(cols), { emissive: pick(cols), emissiveIntensity: 1.2, transparent: true, opacity: 0.28, side: THREE.DoubleSide })); beam.position.set(cx + sx * 6, h - 2.2, cz - 1); beam.rotation.x = Math.PI + sx * 0.2; G.add(beam); }
      const pl = new THREE.PointLight(accent, 12, 30, 2); pl.position.set(cx, h - 1.4, cz - 1); G.add(pl);
      // back bar with glowing bottles + PA stacks flanking the booth
      const barC = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.05, d * 0.45), mat(0x3a2a4a)); barC.position.set(cx - w / 2 + 1.7, 0.8, cz + d * 0.1); barC.castShadow = true; G.add(barC);
      this.boxes.push({ x: cx - w / 2 + 1.7, z: cz + d * 0.1, hw: 0.8, hd: d * 0.225, h: 1.3 });
      const shelfB = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.2, d * 0.4), mat(0x241a34)); shelfB.position.set(cx - w / 2 + 0.6, 1.5, cz + d * 0.1); G.add(shelfB);
      for (let i = 0; i < 6; i++) { const bc2 = pick([0x2fe6ff, 0xff5fb0, 0x4dff9e, 0xffd23a]); const bot = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.36, 0.13), mat(bc2, { emissive: bc2, emissiveIntensity: 1.0 })); bot.position.set(cx - w / 2 + 0.6, 1.15 + (i % 2) * 0.6, cz + d * 0.1 - d * 0.16 + i * d * 0.065); G.add(bot); }
      for (const sx of [-1, 1]) { const spk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.9), mat(0x14121e)); spk.position.set(cx + sx * w * 0.32, 0.95, cz - d / 2 + 1.2); spk.castShadow = true; G.add(spk); const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.06, 12), mat(0x2b2436, { emissive: accent, emissiveIntensity: 0.5 })); cone.rotation.x = Math.PI / 2; cone.position.set(cx + sx * w * 0.32, 1.3, cz - d / 2 + 1.66); G.add(cone); this.boxes.push({ x: cx + sx * w * 0.32, z: cz - d / 2 + 1.2, hw: 0.55, hd: 0.55, h: 2 }); }
      rec.dance = [{ x: cx - 3, z: cz - 1 }, { x: cx + 3, z: cz - 2 }, { x: cx, z: cz + 2 }]; this.clubs.push(rec);
    } else if (type === 'hotel') {
      const desk = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.1, 1.6), mat(0x5a4632)); desk.position.set(cx, 0.85, cz - d * 0.22); desk.castShadow = true; G.add(desk);
      this.boxes.push({ x: cx, z: cz - d * 0.22, hw: w * 0.25 + 0.2, hd: 1.0, h: 1.4 });
      for (const sx of [-1, 1]) { const sofa = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.8, 1.3), mat(0x8a3a58)); sofa.position.set(cx + sx * (w / 2 - 3), 0.55, cz + d * 0.2); G.add(sofa); }
      const chand = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), mat(0xfff2cf, { emissive: 0xffe6b0, emissiveIntensity: 2.2 })); chand.position.set(cx, h - 1.2, cz); G.add(chand);
      const rug = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.06, d * 0.36), mat(0x7a2f3f)); rug.position.set(cx, 0.24, cz + d * 0.02); rug.receiveShadow = true; G.add(rug);
      for (const sx of [-1, 1]) {
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.5, 10), mat(0xa06a3a)); pot.position.set(cx + sx * (w / 2 - 1.5), 0.5, cz - d * 0.34); G.add(pot);
        const frond = new THREE.Mesh(new THREE.SphereGeometry(0.55, 9, 7), mat(0x2f7e44)); frond.position.set(cx + sx * (w / 2 - 1.5), 1.15, cz - d * 0.34); G.add(frond);
        const art = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.05, 0.06), mat(pick([0xf3c7d4, 0xbfe4e8, 0xf5e3b8]), { emissive: 0x333, emissiveIntensity: 0.2 })); art.position.set(cx + sx * w * 0.28, 2.5, cz - d / 2 + 0.26); G.add(art);
      }
    } else if (type === 'diner') {
      const counter = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 1.05, 1.3), mat(0xc23232)); counter.position.set(cx, 0.82, cz - d * 0.16); counter.castShadow = true; G.add(counter);
      this.boxes.push({ x: cx, z: cz - d * 0.16, hw: w * 0.3 + 0.2, hd: 0.9, h: 1.3 });
      for (let s = -2; s <= 2; s++) { const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.9, 12), mat(0x2b2b33)); stool.position.set(cx + s * 2.2, 0.55, cz - d * 0.16 + 1.6); G.add(stool); }
      for (const ox of [-w * 0.25, w * 0.25]) { const panel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 0.16, d * 0.5), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.3 })); panel.position.set(cx + ox, h - 0.5, cz); G.add(panel); }
      for (let b2 = 0; b2 < 2; b2++) { // window booths: table + facing vinyl benches
        const bx2 = cx + w / 2 - 2.0, bz2 = cz + d * 0.02 + b2 * 3.6;
        const tab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 1.0), mat(0xe8e2d2)); tab.position.set(bx2, 0.6, bz2); tab.castShadow = true; G.add(tab);
        for (const s2 of [-1, 1]) { const bench = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.95, 0.55), mat(0xc23232)); bench.position.set(bx2, 0.55, bz2 + s2 * 0.95); G.add(bench); }
        this.boxes.push({ x: bx2, z: bz2, hw: 0.85, hd: 1.35, h: 1.2 });
      }
      const menu = new THREE.Mesh(new THREE.BoxGeometry(w * 0.38, 0.95, 0.08), mat(0x14171c, { emissive: 0xffd9a0, emissiveIntensity: 0.8 })); menu.position.set(cx, h - 1.25, cz - d / 2 + 0.3); G.add(menu);
    } else {
      const counter = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 1.1, 1.4), mat(0x6b4a2e)); counter.position.set(cx, 0.85, cz - d * 0.18); counter.castShadow = true; G.add(counter);
      this.boxes.push({ x: cx, z: cz - d * 0.18, hw: w * 0.275 + 0.2, hd: 0.9, h: 1.4 });
      for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, d * 0.5), mat(0x45414c)); sh.position.set(cx + sx * (w / 2 - 1.2), 1.3, cz - d * 0.05); G.add(sh); }
      for (const ox of [-w * 0.22, w * 0.22]) { const panel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, 0.16, d * 0.55), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.3 })); panel.position.set(cx + ox, h - 0.5, cz - d * 0.05); G.add(panel); }
      // centre aisle gondola stacked with goods + a lit drinks fridge
      const aisle = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.5, d * 0.4), mat(0x4a4550)); aisle.position.set(cx + w * 0.1, 0.95, cz + d * 0.04); aisle.castShadow = true; G.add(aisle);
      this.boxes.push({ x: cx + w * 0.1, z: cz + d * 0.04, hw: 0.55, hd: d * 0.2, h: 1.8 });
      for (let i2 = 0; i2 < 4; i2++) { const gd = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.18, 0.55), mat(pick([0xd23b3b, 0x2fb85e, 0xf0b83a, 0x4fd0ff]))); gd.position.set(cx + w * 0.1, 0.55 + (i2 % 3) * 0.4, cz + d * 0.04 - 1.1 + i2 * 0.75); G.add(gd); }
      const fridge = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.7), mat(0xd8dde6)); fridge.position.set(cx - w / 2 + 1.1, 1.2, cz - d * 0.28); G.add(fridge);
      const fglass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.7, 0.08), mat(0x9fe8ff, { emissive: 0x7fd0e8, emissiveIntensity: 1.1, transparent: true, opacity: 0.7 })); fglass.position.set(cx - w / 2 + 1.1, 1.25, cz - d * 0.28 + 0.38); G.add(fglass);
      this.boxes.push({ x: cx - w / 2 + 1.1, z: cz - d * 0.28, hw: 0.8, hd: 0.5, h: 2.4 });
    }
    this.shops.push(rec);
  }
  _smallShop(x, z, w, d, h, rng, G, back) {
    // every corner store is walk-in now: open front, three walls, lit interior
    const shopCol = pick(SHOP_COLS), t = 0.35, dz = back ? -1 : 1;
    const wallMat = mat(shopCol, { emissive: shopCol, emissiveIntensity: 0.16 });
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.18, d), mat(0x423d4e, { emissive: 0x423d4e, emissiveIntensity: 0.3 })); floor.position.set(x, 0.12, z); floor.receiveShadow = true; G.add(floor);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, t, d + 0.6), wallMat); roof.position.set(x, h, z); roof.castShadow = true; G.add(roof);
    const backW = new THREE.Mesh(new THREE.BoxGeometry(w, h, t), wallMat); backW.position.set(x, h / 2, z - dz * d / 2); backW.castShadow = true; backW.receiveShadow = true; G.add(backW);
    this.boxes.push({ x, z: z - dz * d / 2, hw: w / 2 + 0.25, hd: t / 2 + 0.25 });
    for (const sx of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(t, h, d), wallMat); side.position.set(x + sx * w / 2, h / 2, z); side.castShadow = true; side.receiveShadow = true; G.add(side); this.boxes.push({ x: x + sx * w / 2, z, hw: t / 2 + 0.25, hd: d / 2 + 0.25 }); }
    // interior: counter + register glow + shelf + ceiling light
    const counter = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.0, 1.0), mat(0x5f4530)); counter.position.set(x - w * 0.14, 0.75, z - dz * d * 0.22); counter.castShadow = true; G.add(counter);
    this.boxes.push({ x: x - w * 0.14, z: z - dz * d * 0.22, hw: w * 0.25 + 0.2, hd: 0.7, h: 1.3 });
    this.workposts.push({ x: x - w * 0.14, z: z - dz * (d * 0.22 + 1.3), yaw: dz > 0 ? 0 : Math.PI });
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, d * 0.5), mat(0x46414d)); shelf.position.set(x + w / 2 - 0.85, 1.05, z); G.add(shelf);
    const lamp2 = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 0.12, d * 0.4), mat(0xfff2d8, { emissive: 0xfff0d0, emissiveIntensity: 1.25 })); lamp2.position.set(x, h - 0.35, z); G.add(lamp2);
    const fz = z + dz * (d / 2 + 0.06);
    for (const sx of [-1, 1]) { const glassW = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 1.6, 0.08), mat(0x18243a, { emissive: pick(WIN_GLOW), emissiveIntensity: 0.9, transparent: true, opacity: 0.85 })); glassW.position.set(x + sx * w * 0.32, 1.6, fz - dz * 0.06); G.add(glassW); this.boxes.push({ x: x + sx * w * 0.32, z: fz - dz * 0.06, hw: w * 0.15, hd: 0.2, h: 2.6 }); }
    const awn = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, 0.22, 1.0), mat(pick(NEONS))); awn.position.set(x, 2.85, fz + dz * 0.5); G.add(awn);
    const sign = this._neonSign(pick(BIZ), pick(NEONS), x, h + 0.45, fz + dz * 0.1, Math.min(w * 0.92, 7), G); if (back) sign.rotation.y = Math.PI;
    if (this._lod) this._lod.push({ x, z, w, d, h, c: shopCol });
  }
  _block(cx, cz, LOT, rng, hs, G) {
    const n = 3 + (rng() * 2 | 0), sw = (LOT - 8) / n;
    for (let i = 0; i < n; i++) {
      const sx = cx - (LOT - 8) / 2 + sw * (i + 0.5);
      this._smallShop(sx, cz + LOT / 2 - 5, sw - 1.2, 8, 4 + rng() * 5, rng, G, false);
      this._smallShop(sx, cz - LOT / 2 + 5, sw - 1.2, 8, 4 + rng() * 5, rng, G, true);
    }
    const towers = rng() < 0.5 ? 1 : 2, bw = (LOT - 6) / towers;
    for (let t = 0; t < towers; t++) { const bx = cx + (towers === 1 ? 0 : (t === 0 ? -1 : 1) * (LOT / 4)); this._tower(bx, cz, bw - 3, LOT - 22, (24 + rng() * 84) * hs, FACADES[(rng() * FACADES.length) | 0], rng, G); }
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
    g.position.set(x, 0.2 + this.groundH(x, z), z); (G || this.group).add(g);
  }
  _camp(cx, cz, LOT, rng, G) {
    // homeless encampment: dirt lot, tents, cardboard, barrel fires
    this.camps = this.camps || [];
    const dirt = new THREE.Mesh(new THREE.BoxGeometry(LOT, 0.3, LOT), mat(0x6e6053, { map: noiseTexture(112, 98, 84, 16) })); dirt.position.set(cx, 0.12, cz); dirt.receiveShadow = true; G.add(dirt);
    const tentCols = [0x4a6c8a, 0x6d8a4a, 0x8a6b4a, 0x7a4a5a, 0x5a5a66];
    for (let i = 0; i < 4 + (rng() * 3 | 0); i++) {
      const tx = cx + rnd(-LOT / 2 + 5, LOT / 2 - 5), tz = cz + rnd(-LOT / 2 + 5, LOT / 2 - 5);
      const tent = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 2.0, 2.2, 4), mat(pick(tentCols))); tent.position.set(tx, 1.1, tz); tent.rotation.y = rnd(TAU); tent.castShadow = true; G.add(tent);
      this.boxes.push({ x: tx, z: tz, hw: 1.5, hd: 1.5, h: 2.4 });
    }
    for (let i = 0; i < 3; i++) { const cb = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.1), mat(0xa8906a)); cb.position.set(cx + rnd(-LOT / 2 + 4, LOT / 2 - 4), 0.3, cz + rnd(-LOT / 2 + 4, LOT / 2 - 4)); cb.rotation.y = rnd(TAU); G.add(cb); }
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.0, 12), mat(0x4a3c30)); barrel.position.set(cx, 0.62, cz); barrel.castShadow = true; G.add(barrel);
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 8), mat(0xff8a3a, { emissive: 0xff6a1a, emissiveIntensity: 2.4 })); fire.position.set(cx, 1.35, cz); G.add(fire);
    const cart = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 0.7), mat(0x9aa0aa)); cart.position.set(cx + 3, 0.75, cz + 2); cart.rotation.y = 0.4; G.add(cart);
    this.boxes.push({ x: cx, z: cz, hw: 0.6, hd: 0.6, h: 1.6 });
    this.camps.push({ x: cx, z: cz, r: LOT / 2 - 4 });
  }
  _vendorStall(x, z) {
    const G = this.group;
    const cart = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.0, 1.2), mat(0x8a5a3a)); cart.position.set(x, 0.6, z); cart.castShadow = true; G.add(cart);
    const goods = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.3, 0.9), mat(pick([0xd23b3b, 0x2fb85e, 0xf0b83a, 0xe0683a]))); goods.position.set(x, 1.2, z); G.add(goods);
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.12, 1.5), mat(pick([0xff5a5a, 0x4fd0ff, 0xffd23a, 0x4dff9e]))); top.position.set(x, 1.75, z); G.add(top);
    for (const sx of [-1, 1]) { const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.75, 6), mat(0x2a2e36)); pole.position.set(x + sx * 1.15, 0.87, z); G.add(pole); }
    this.boxes.push({ x, z, hw: 1.4, hd: 0.8, h: 2.0 });
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
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 10), Pa); knee.position.y = -0.45; leg.add(knee);
    const shin = new THREE.Group(); shin.position.y = -0.46; leg.add(shin);
    const shinM = cap(0.08, 0.32, Pa); shinM.position.y = -0.2; shin.add(shinM);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.1, 0.3), Bo); foot.position.set(0, -0.4, 0.08); shin.add(foot);
    const toe = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), Bo); toe.position.set(0, -0.42, 0.22); toe.scale.set(1, 0.72, 1); shin.add(toe);
    legs[s] = { leg, shin };
  }
  // torso (waist -> shoulders) + belt + collar
  const chest = new THREE.Group(); chest.position.y = 0.1; hips.add(chest);
  const prof = [[0.04, 0], [0.15, 0.02], [0.18, 0.14], [0.205, 0.3], [0.215, 0.42], [0.17, 0.5], [0.08, 0.55], [0.03, 0.57]].map(a => new THREE.Vector2(a[0], a[1]));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), Sh); torso.scale.z = 0.72; chest.add(torso);
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.17, 0.06, 20), mat(0x1a1a20)); belt.position.y = 0.03; belt.scale.z = 0.76; chest.add(belt);
  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.02), mat(0xc9b25a)); buckle.position.set(0, 0.03, 0.13); chest.add(buckle);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.105, 0.05, 16), mat(new THREE.Color(shirt).multiplyScalar(0.82).getHex())); collar.position.y = 0.55; collar.scale.z = 0.8; chest.add(collar);
  for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 12), Sh); sh.position.set(sx * 0.2, 0.44, 0); chest.add(sh); } // shoulder caps
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
  // ---- varied hair / headwear (sits above the brow so it never covers the face) ----
  const style = p.style || pick(HAIR_STYLES);
  const capHair = (r, y, tl, z) => { const h = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 16, 0, TAU, 0, tl), Ha); h.position.set(0, y, z === undefined ? -0.012 : z); head.add(h); return h; };
  if (style === 'buzz') capHair(0.134, 0.12, 1.35);
  else if (style === 'bowl') capHair(0.147, 0.13, 1.3);
  else if (style === 'mop') { capHair(0.15, 0.125, 1.36); const back = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14, 0, TAU, 0, 1.7), Ha); back.position.set(0, 0.05, -0.07); back.scale.set(1, 1.05, 0.8); head.add(back); }
  else if (style === 'spiky') { capHair(0.136, 0.125, 1.3); for (let i = 0; i < 8; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.1, 5), Ha); s.position.set(rnd(-0.08, 0.08), 0.245, rnd(-0.07, 0.03)); s.rotation.set(rnd(-0.3, 0.3), 0, rnd(-0.3, 0.3)); head.add(s); } }
  else if (style === 'afro') capHair(0.17, 0.16, 1.55, -0.02);
  else if (style === 'pony') { capHair(0.143, 0.13, 1.3); const tail = cap(0.04, 0.22, Ha, 8); tail.position.set(0, 0.02, -0.15); head.add(tail); }
  else if (style === 'cap') { const col = pick(HATS); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.147, 20, 14, 0, TAU, 0, 1.5), mat(col)); dome.position.set(0, 0.12, -0.01); head.add(dome); const brim = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.17), mat(col)); brim.position.set(0, 0.12, 0.15); head.add(brim); }
  else if (style === 'beanie') { const col = pick(HATS); const b = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16, 0, TAU, 0, 1.55), mat(col)); b.position.set(0, 0.115, -0.006); head.add(b); }
  // 'bald' adds nothing. occasional beard/stubble on the chin (below the mouth).
  if (style !== 'afro' && Math.random() < 0.28) { const beard = new THREE.Mesh(new THREE.SphereGeometry(0.096, 16, 12, 0, TAU, 1.4, 1.2), Ha); beard.position.set(0, -0.01, 0.03); beard.scale.set(0.92, 0.8, 0.9); head.add(beard); }
  // arms: shirt-sleeved upper arm, bare (skin) forearm, small hand pad — hang at sides
  const arms = {};
  for (const s of ['L', 'R']) {
    const sx = s === 'L' ? -1 : 1; const arm = new THREE.Group(); arm.position.set(sx * 0.2, 0.42, 0); arm.rotation.z = sx * 0.05; chest.add(arm);
    const up = cap(0.056, 0.24, Sh); up.position.y = -0.16; arm.add(up);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), Sk); elbow.position.y = -0.33; arm.add(elbow);
    const fore = new THREE.Group(); fore.position.y = -0.34; arm.add(fore);
    const foreM = cap(0.046, 0.22, Sk); foreM.position.y = -0.14; fore.add(foreM);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), Sk); hand.position.y = -0.29; hand.scale.set(1, 1.15, 0.7); fore.add(hand);
    const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), Sk); thumb.position.set(sx * -0.04, -0.27, 0.02); fore.add(thumb);
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
  j.chest.scale.set(1, 1, 1); f.group.rotation.x = 0; f.group.rotation.z = 0;
  if (state === 'walk' || state === 'run') {
    const run = state === 'run', amp = run ? 0.9 : 0.55, ph = t * (run ? 10.5 : 7.2);
    set('legL', Math.sin(ph) * amp); set('legR', Math.sin(ph + Math.PI) * amp);
    set('shinL', Math.max(0, -Math.sin(ph + 0.5)) * (amp + 0.6)); set('shinR', Math.max(0, -Math.sin(ph + Math.PI + 0.5)) * (amp + 0.6));
    j.armL.rotation.x = Math.sin(ph + Math.PI) * amp * 0.85; j.armR.rotation.x = Math.sin(ph) * amp * 0.85; j.armL.rotation.z = 0.08; j.armR.rotation.z = -0.08;
    j.foreL.rotation.x = -0.28 - Math.max(0, Math.sin(ph)) * 0.4; j.foreR.rotation.x = -0.28 - Math.max(0, Math.sin(ph + Math.PI)) * 0.4;
    set('hips', 0, Math.sin(ph) * 0.09, 0); j.chest.rotation.x = run ? 0.3 : 0.12; j.chest.rotation.y = -Math.sin(ph) * 0.08; j.head.rotation.x = 0; j.head.rotation.y = 0;
    const bob = Math.abs(Math.sin(ph)); f.group.position.y = bob * (run ? 0.09 : 0.05); j.chest.scale.set(1 - bob * 0.03, 1 + bob * 0.05, 1 - bob * 0.03); // squash/stretch = bouncy
  } else if (state === 'sit') {
    set('legL', -1.5); set('legR', -1.5); set('shinL', 1.7); set('shinR', 1.7);
    j.armL.rotation.x = -0.5; j.armR.rotation.x = -0.5; j.armL.rotation.z = 0.15; j.armR.rotation.z = -0.15; j.foreL.rotation.x = -0.6; j.foreR.rotation.x = -0.6;
    j.chest.rotation.x = 0.12 + Math.sin(t * 1.1) * 0.02; j.head.rotation.x = 0.1 + Math.sin(t * 0.8) * 0.05; set('hips', 0, 0, 0); f.group.position.y = -0.42;
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
  } else if (state === 'wave') {
    zero(j, f); j.armR.rotation.x = -2.6; j.armR.rotation.z = -0.35; j.foreR.rotation.x = -0.3; j.foreR.rotation.z = Math.sin(t * 7) * 0.55;
    j.head.rotation.y = Math.sin(t * 1.2) * 0.06; j.chest.rotation.x = 0.02;
  } else if (state === 'phone') {
    zero(j, f); j.armR.rotation.x = -0.5; j.foreR.rotation.x = -2.15; j.armR.rotation.z = -0.25;
    j.head.rotation.x = 0.28; j.head.rotation.y = -0.12 + Math.sin(t * 0.7) * 0.03; j.chest.rotation.x = 0.06;
  } else if (state === 'smoke') {
    zero(j, f); const cyc = (t % 5) / 5, up = cyc < 0.3 ? Math.sin(cyc / 0.3 * Math.PI) : 0;
    j.armR.rotation.x = -0.3 - up * 1.35; j.foreR.rotation.x = -0.5 - up * 0.9; j.head.rotation.x = up * 0.14; j.chest.rotation.x = 0.04;
  } else if (state === 'lean') {
    zero(j, f); j.chest.rotation.x = -0.14; f.group.position.y = -0.05; f.group.rotation.x = -0.18;
    j.armL.rotation.z = 0.3; j.armR.rotation.z = -0.3; j.foreL.rotation.x = -0.9; j.foreR.rotation.x = -0.9;
    set('legL', 0.25); set('legR', 0.25); set('shinL', -0.1); set('shinR', -0.1); j.head.rotation.y = Math.sin(t * 0.5) * 0.12;
  } else if (state === 'panhandle') {
    set('legL', -1.5); set('legR', -1.5); set('shinL', 1.7); set('shinR', 1.7); f.group.position.y = -0.42;
    j.chest.rotation.x = 0.22; j.head.rotation.x = 0.12 + Math.sin(t * 0.9) * 0.05;
    j.armR.rotation.x = -0.95; j.foreR.rotation.x = -0.35; j.armL.rotation.x = -0.25; j.foreL.rotation.x = -0.7; // cup held out
  } else if (state === 'sleep') {
    zero(j, f); f.group.rotation.z = Math.PI / 2; f.group.position.y = -0.62;
    set('legL', -0.5); set('legR', -0.4); set('shinL', 0.8); set('shinR', 0.7); j.armL.rotation.x = -1.3; j.foreL.rotation.x = -1.1; j.armR.rotation.x = -0.3;
    j.chest.rotation.x = 0.2; j.head.rotation.x = 0.3;
  } else if (state === 'workout') {
    const ph = Math.sin(t * 3.2), dn = (ph + 1) / 2; zero(j, f);
    set('legL', -dn * 1.5); set('legR', -dn * 1.5); set('shinL', dn * 1.9); set('shinR', dn * 1.9); f.group.position.y = -dn * 0.4;
    j.armL.rotation.x = -1.5; j.armR.rotation.x = -1.5; j.foreL.rotation.x = -0.15; j.foreR.rotation.x = -0.15; j.chest.rotation.x = 0.1;
  } else if (state === 'point') {
    zero(j, f); j.armR.rotation.x = -1.5; j.foreR.rotation.x = -0.06; j.head.rotation.y = -0.1; j.chest.rotation.y = -0.08;
  } else if (state === 'cheer') {
    const ph = t * 5, up = Math.abs(Math.sin(ph)); zero(j, f);
    j.armL.rotation.x = -2.5 - up * 0.4; j.armR.rotation.x = -2.5 - up * 0.4; j.armL.rotation.z = 0.35; j.armR.rotation.z = -0.35;
    f.group.position.y = up * 0.14; j.head.rotation.x = -0.15; j.chest.scale.set(1, 1 + up * 0.04, 1);
  } else if (state === 'cower') {
    zero(j, f); j.chest.rotation.x = 0.85; j.head.rotation.x = 0.5; f.group.position.y = -0.3;
    set('legL', -0.9); set('legR', -0.9); set('shinL', 1.3); set('shinR', 1.3);
    j.armL.rotation.x = -2.4; j.armR.rotation.x = -2.4; j.foreL.rotation.x = -1.2; j.foreR.rotation.x = -1.2; // arms over head
  } else if (state === 'handsup') {
    zero(j, f); j.armL.rotation.x = -2.9; j.armR.rotation.x = -2.9; j.armL.rotation.z = 0.25; j.armR.rotation.z = -0.25;
    j.foreL.rotation.x = -0.15; j.foreR.rotation.x = -0.15; j.head.rotation.x = 0.08 + Math.sin(t * 3) * 0.02;
  } else if (state === 'drunk') {
    const ph = t * 4.6;
    set('legL', Math.sin(ph) * 0.5); set('legR', Math.sin(ph + Math.PI) * 0.5);
    set('shinL', Math.max(0, -Math.sin(ph + 0.5)) * 1.0); set('shinR', Math.max(0, -Math.sin(ph + Math.PI + 0.5)) * 1.0);
    j.armL.rotation.x = Math.sin(ph * 0.7) * 0.6 - 0.2; j.armR.rotation.x = -Math.sin(ph * 0.6) * 0.6 - 0.2; j.foreL.rotation.x = -0.4; j.foreR.rotation.x = -0.4;
    j.chest.rotation.z = Math.sin(t * 1.7) * 0.16; j.chest.rotation.x = 0.1; j.head.rotation.z = Math.sin(t * 1.3) * 0.2;
    set('hips', 0, Math.sin(t * 1.1) * 0.2, 0); f.group.position.y = Math.abs(Math.sin(ph)) * 0.04;
  } else if (state === 'argue') {
    const ph = t * 3.4; zero(j, f);
    j.armR.rotation.x = -1.1 + Math.sin(ph) * 0.5; j.foreR.rotation.x = -0.5 + Math.sin(ph + 1) * 0.4;
    j.armL.rotation.x = -0.4 + Math.sin(ph * 0.7) * 0.3; j.foreL.rotation.x = -0.6;
    j.head.rotation.x = -0.06 + Math.sin(ph) * 0.06; j.chest.rotation.x = -0.05; j.head.rotation.y = Math.sin(t * 1.4) * 0.1;
  } else if (state === 'sweep') {
    const ph = Math.sin(t * 2.6); zero(j, f);
    j.armL.rotation.x = -0.8 + ph * 0.25; j.armR.rotation.x = -0.6 - ph * 0.25; j.foreL.rotation.x = -0.5; j.foreR.rotation.x = -0.4;
    j.chest.rotation.x = 0.28; j.chest.rotation.y = ph * 0.18; j.head.rotation.x = 0.24;
  } else if (state === 'yank') {
    // grab the door / driver and haul them out
    const pull = (Math.sin(t * 6.5) + 1) / 2; zero(j, f);
    j.armL.rotation.x = -1.55 + pull * 1.05; j.armR.rotation.x = -1.55 + pull * 1.05; j.foreL.rotation.x = -0.35; j.foreR.rotation.x = -0.35;
    j.chest.rotation.x = 0.3 - pull * 0.42; set('legL', -0.15 + pull * 0.1); set('legR', 0.2 - pull * 0.1); j.head.rotation.x = 0.1;
  } else if (state === 'limp') {
    // wounded hobble: favour one leg, hunch, clutch the ribs
    const ph = t * 4.6, hurt = Math.max(0, Math.sin(ph));
    set('legL', Math.sin(ph) * 0.35); set('legR', Math.sin(ph + Math.PI) * 0.6);
    set('shinL', Math.max(0, -Math.sin(ph + 0.5)) * 0.5); set('shinR', Math.max(0, -Math.sin(ph + Math.PI + 0.5)) * 1.1);
    j.chest.rotation.x = 0.28; j.chest.rotation.z = Math.sin(ph) * 0.08; j.head.rotation.x = 0.16;
    j.armL.rotation.x = -0.7; j.foreL.rotation.x = -1.1; j.armL.rotation.z = 0.35; // hand pressed to the side
    j.armR.rotation.x = Math.sin(ph) * 0.3; j.foreR.rotation.x = -0.2;
    f.group.position.y = -0.06 - hurt * 0.05;
  } else if (state === 'cuffed') {
    // on your knees, hands behind your back — the ride downtown is coming
    zero(j, f); set('legL', -1.25); set('legR', -1.25); set('shinL', 1.95); set('shinR', 1.95); f.group.position.y = -0.5;
    j.armL.rotation.x = 0.55; j.armR.rotation.x = 0.55; j.armL.rotation.z = 0.32; j.armR.rotation.z = -0.32; j.foreL.rotation.x = -0.55; j.foreR.rotation.x = -0.55;
    j.chest.rotation.x = 0.3; j.head.rotation.x = 0.35 + Math.sin(t * 2) * 0.03;
  } else if (state === 'knockout') {
    zero(j, f); f.group.rotation.x = -1.5; f.group.position.y = -0.62; // flat on their back, out cold
    j.armL.rotation.z = 0.9; j.armR.rotation.z = -0.7; set('legL', -0.25); set('shinL', 0.55); j.head.rotation.x = 0.15;
  } else if (state === 'hitstun') {
    zero(j, f); const k = Math.sin(t * 16) * 0.06;
    j.chest.rotation.x = -0.3 + k; j.head.rotation.x = -0.25; f.group.position.y = -0.06;
    j.armL.rotation.x = -0.9; j.armR.rotation.x = -0.9; j.foreL.rotation.x = -0.8; j.foreR.rotation.x = -0.8; set('legL', -0.2); set('legR', 0.24);
  } else {
    const b = Math.sin(t * 1.5); zero(j, f);
    j.chest.rotation.x = 0.02 + b * 0.014; j.chest.rotation.y = Math.sin(t * 0.6) * 0.03; j.chest.scale.set(1, 1 + b * 0.02, 1);
    j.armL.rotation.x = b * 0.04; j.armR.rotation.x = -b * 0.04; j.armL.rotation.z = 0.06; j.armR.rotation.z = -0.06; j.foreL.rotation.x = -0.06; j.foreR.rotation.x = -0.06;
    j.head.rotation.y = Math.sin(t * 0.5) * 0.09; j.head.rotation.x = Math.sin(t * 0.7) * 0.03;
    set('hips', 0, Math.sin(t * 0.7) * 0.02, 0);
  }
}
function zero(j, f) {
  j.legL.rotation.x = 0; j.legR.rotation.x = 0; j.shinL.rotation.x = 0; j.shinR.rotation.x = 0;
  j.armL.rotation.set(0, 0, 0.06); j.armR.rotation.set(0, 0, -0.06); j.foreL.rotation.set(-0.06, 0, 0); j.foreR.rotation.set(-0.06, 0, 0);
  j.hips.rotation.set(0, 0, 0); j.chest.rotation.set(0, 0, 0); j.head.rotation.set(0, 0, 0);
  f.group.position.y = 0; f.group.rotation.x = 0; f.group.rotation.z = 0;
}
function buildPerson(p) { return humanFigure(p); }
function buildPlane() {
  const g = new THREE.Group();
  const body = mat(0xeef1f6), wingm = mat(0xccd2db), trim = mat(0x2f6fd4), glass = mat(0x0e1420);
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 30, 16), body); fus.rotation.x = Math.PI / 2; fus.castShadow = true; g.add(fus);
  const nose = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12), body); nose.scale.set(1, 1, 1.6); nose.position.set(0, 0, 16); g.add(nose);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(2.4, 7, 16), body); tail.rotation.x = -Math.PI / 2; tail.position.set(0, 0, -16.5); g.add(tail);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(34, 0.5, 7), wingm); wing.position.set(0, -0.7, 0); wing.castShadow = true; g.add(wing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 6, 5), trim); fin.position.set(0, 4, -13); g.add(fin);
  const stab = new THREE.Mesh(new THREE.BoxGeometry(12, 0.4, 4), wingm); stab.position.set(0, 1.6, -13); g.add(stab);
  for (let i = -6; i <= 6; i++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.6), glass); w.position.set(2.35, 0.6, i * 2); g.add(w); const w2 = w.clone(); w2.position.x = -2.35; g.add(w2); }
  for (const sx of [-9, 9]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 4, 12), trim); e.rotation.x = Math.PI / 2; e.position.set(sx, -1.7, 1); g.add(e); }
  return g;
}
function buildPistol() {
  const g = new THREE.Group(); const m = mat(0x20242c), m2 = mat(0x3a3f48);
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.06, 0.2), m); slide.position.set(0, 0, 0.06); g.add(slide);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.06), m2); barrel.position.set(0, 0.01, 0.17); g.add(barrel);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.11, 0.05), m); grip.position.set(0, -0.07, -0.01); grip.rotation.x = -0.25; g.add(grip);
  return g;
}

// ---------------------------------------------------------------------------
// Car
// ---------------------------------------------------------------------------
const CAR_COLORS = [0xd23b3b, 0x2f6fd4, 0x24272f, 0xf0f0f4, 0x2fb85e, 0xe8b83a, 0x8a4fd0, 0xf07d2a, 0x18b0b0, 0xf04a7a];
const PROP = { shop: { cost: 500, rate: 12 }, diner: { cost: 800, rate: 18 }, hotel: { cost: 1500, rate: 32 }, club: { cost: 2500, rate: 55 } };
function buildCar(color) {
  const g = new THREE.Group(); const paint = mat(color);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 4.6), paint); body.position.y = 0.6; body.castShadow = true; g.add(body);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 4.5), mat(0x15171c)); skirt.position.y = 0.33; g.add(skirt);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.62, 2.3), paint); cabin.position.set(0, 1.12, -0.15); cabin.castShadow = true; g.add(cabin);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.5, 2.34), mat(0x0c1018, { transparent: true, opacity: 0.6 })); glass.position.set(0, 1.12, -0.15); g.add(glass);
  const capm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 2.0), paint); capm.position.set(0, 1.44, -0.15); g.add(capm);
  // someone is actually driving: low-poly driver visible through the glass
  const drv = new THREE.Group();
  const dTor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.32), mat(pick(SHIRTS))); drv.add(dTor);
  const dHead = new THREE.Mesh(new THREE.SphereGeometry(0.165, 10, 8), skinMat(pick(SKIN))); dHead.position.y = 0.46; drv.add(dHead);
  const dHair = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.3), mat(pick(HAIR))); dHair.position.y = 0.58; drv.add(dHair);
  const dArms = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.09, 0.34), mat(pick(SHIRTS))); dArms.position.set(0, 0.05, -0.28); drv.add(dArms);
  drv.position.set(0.45, 1.02, -0.5); drv.visible = false; g.add(drv); g.userData.driver = drv;
  g.userData.wheels = [];
  for (const sz of [-1.52, 1.48]) for (const sx of [-1.0, 1.0]) { const wg = new THREE.Group(); wg.position.set(sx, 0.45, sz); const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.32, 18), mat(0x0c0d11)); tire.rotation.z = Math.PI / 2; tire.castShadow = true; wg.add(tire); const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.34, 10), mat(0xc4c9d1)); rim.rotation.z = Math.PI / 2; wg.add(rim); g.add(wg); g.userData.wheels.push(wg); }
  const hl = mat(0xfff6d2, { emissive: 0xfff0b0, emissiveIntensity: 2.4 }); for (const sx of [-0.65, 0.65]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.1), hl); l.position.set(sx, 0.72, -2.32); g.add(l); }
  const tl = mat(0xff2a2a, { emissive: 0xff1a1a, emissiveIntensity: 2.6 }); for (const sx of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tl); l.position.set(sx, 0.74, 2.32); g.add(l); }
  // detail: bumpers, side mirrors, plates, door seams
  const chrome = mat(0xd8dde4);
  for (const sz of [-2.36, 2.36]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.16, 0.16), chrome); b.position.set(0, 0.5, sz); g.add(b); }
  for (const sx of [-1.03, 1.03]) { const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.04), chrome); arm2.position.set(sx, 1.02, -1.15); g.add(arm2); const mir = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.16), mat(0x14161b)); mir.position.set(sx * 1.08, 1.02, -1.15); g.add(mir); }
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.02), mat(0xe8e8d8)); plate.position.set(0, 0.55, 2.46); g.add(plate);
  return g;
}
function taxiSign() { const s = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.26, 0.4), mat(0xffd23a, { emissive: 0xffd23a, emissiveIntensity: 1.4 })); s.position.set(0, 1.66, -0.15); return s; }
function buildSpecial(kind, color) {
  const g = new THREE.Group(); const paint = mat(color);
  if (kind === 'sports') { // low, wide, winged
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.42, 4.7), paint); body.position.y = 0.5; body.castShadow = true; g.add(body);
    const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 1.2, 1.4, 4), paint); nose.rotation.x = -Math.PI / 2; nose.rotation.y = Math.PI / 4; nose.position.set(0, 0.5, -3.0); g.add(nose);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.44, 1.9), mat(0x0c1018)); cab.position.set(0, 0.9, 0.2); g.add(cab);
    const cap2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1.5), paint); cap2.position.set(0, 1.14, 0.25); g.add(cap2);
    for (const sx of [-0.85, 0.85]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), paint); post.position.set(sx, 0.9, 2.05); g.add(post); }
    const wing = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.1, 0.55), paint); wing.position.set(0, 1.12, 2.05); g.add(wing);
    g.userData.wheels = [];
    for (const sz of [-1.55, 1.5]) for (const sx of [-1.05, 1.05]) { const wg = new THREE.Group(); wg.position.set(sx, 0.4, sz); const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.34, 16), mat(0x0b0c10)); t2.rotation.z = Math.PI / 2; wg.add(t2); const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.36, 8), mat(0xd8b04a)); rim.rotation.z = Math.PI / 2; wg.add(rim); g.add(wg); g.userData.wheels.push(wg); }
    const hl2 = mat(0xfff6d2, { emissive: 0xfff0b0, emissiveIntensity: 2.4 }); for (const sx of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.1), hl2); l.position.set(sx, 0.56, -2.4); g.add(l); }
  } else { // monster: lifted body on comically big wheels
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 4.2), paint); body.position.y = 1.75; body.castShadow = true; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 1.8), paint); cab.position.set(0, 2.35, -0.3); g.add(cab);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.5, 1.84), mat(0x0c1018)); glass.position.set(0, 2.35, -0.3); g.add(glass);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 0.14), mat(0x2a2e36)); bar.position.set(0, 2.8, 0.7); g.add(bar);
    for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), mat(0xfff0b0, { emissive: 0xffe6a0, emissiveIntensity: 2 })); s.position.set(-0.75 + i * 0.5, 2.88, 0.7); g.add(s); }
    g.userData.wheels = [];
    for (const sz of [-1.5, 1.5]) for (const sx of [-1.25, 1.25]) { const wg = new THREE.Group(); wg.position.set(sx, 0.95, sz); const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.6, 18), mat(0x0b0c10)); t2.rotation.z = Math.PI / 2; t2.castShadow = true; wg.add(t2); const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.62, 10), mat(0xc4c9d1)); rim.rotation.z = Math.PI / 2; wg.add(rim); g.add(wg); g.userData.wheels.push(wg); }
  }
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
    this.scene.fog = new THREE.Fog(0xcfe0ee, 180, 720);
    this.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.3, 900);
    this.camera.position.set(0, 60, 130);
    this.renderDist = 185; this._frustum = new THREE.Frustum(); this._m = new THREE.Matrix4(); this._sph = new THREE.Sphere();

    this.sky = makeSky(); this.scene.add(this.sky);
    this.hemi = new THREE.HemisphereLight(0xbcd8f5, 0x9a8f7a, 1.15); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff3da, 2.7); this.sun.position.set(-48, 90, -95); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024); const sc = this.sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 380; this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.fill = new THREE.DirectionalLight(0x9ab8ff, 0.35); this.fill.position.set(70, 45, 55); this.scene.add(this.fill);

    this.clock = new THREE.Clock(); this.time = 0; this.playing = false; this.paused = false; this.menuMode = true; this.cine = null;
    this.input = new Input(canvas);
    this.city = new City(this.scene);
    this.post = new Post(this.renderer, this.scene, this.camera);
    this.renderer.toneMapping = this.post.enabled ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping; if (!this.post.enabled) this.renderer.toneMappingExposure = 1.1;
    this.ui = new UI(this);

    this.npcs = []; this.cars = []; this.fx = []; this.tracers = []; this.introMode = false;
    try { this.saveData = JSON.parse(localStorage.getItem('nb_save') || 'null'); } catch (e) { this.saveData = null; }
    this.player = new Player(this);
    this.story = new Story(this);
    for (let i = 0; i < 8; i++) this.spawnPed(); for (let i = 0; i < 5; i++) this.spawnTraffic(); // ambient life for the menu / intro

    addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); this.post.setSize(); });
    canvas.addEventListener('mousedown', () => { if (this.playing && !this.paused && !this.ui.modal && !this.input.locked) this.input.lock(); });
    this.input.onLock = (l) => { if (!l && this.playing && !this.paused && !this.ui.modal) this.pause(); };

    window.GAME = this;
    this.ui.title(); this.loop();
  }
  start() {
    this.playing = true; this.paused = false; this.menuMode = false; this.ui.modal = null; this.ui.hideTitle();
    this.player.root.visible = true; this.player.spawn();
    for (let i = 0; i < 22; i++) this.spawnPed(true);
    for (let i = 0; i < 16; i++) this.spawnTraffic();
    let dancers = 0; for (const club of this.city.clubs) for (const d of club.dance) { if (dancers++ >= 6) break; const ped = new Ped(this, d.x, d.z, false, { dance: true }); ped.story = true; this.npcs.push(ped); }
    for (const v of this.city.vendors) { const ped = new Ped(this, v.x, v.z - 1.4, false, { vendor: true, yaw: 0 }); ped.story = true; this.npcs.push(ped); }   // shopkeepers behind the carts
    for (let i = 0; i < 8; i++) { const [lx, lz] = this.city.snapSidewalk(rnd(-this.city.size / 2 + 20, this.city.size / 2 - 20), rnd(-this.city.size / 2 + 20, this.city.size / 2 - 20)); const ped = new Ped(this, lx, lz, false, { loiter: true, yaw: rnd(TAU) }); ped.story = true; this.npcs.push(ped); }   // loiterers sitting around
    for (const camp of (this.city.camps || [])) for (let i = 0; i < 4; i++) { const ped = new Ped(this, camp.x + rnd(-camp.r, camp.r), camp.z + rnd(-camp.r, camp.r), false, { homeless: true, yaw: rnd(TAU) }); ped.story = true; this.npcs.push(ped); }   // camp residents
    for (let i = 0; i < 5; i++) { const [hx, hz] = this.city.snapSidewalk(rnd(-this.city.size / 2 + 16, this.city.size / 2 - 16), rnd(-this.city.size / 2 + 16, this.city.size / 2 - 16)); const ped = new Ped(this, hx, hz, false, { homeless: true, yaw: rnd(TAU) }); ped.story = true; this.npcs.push(ped); }   // scattered homeless on sidewalks
    for (const b of (this.city.beachSpots || []).slice(0, 5)) { const ped = new Ped(this, b.x, b.z, false, { loiter: true, ambient: 'sit', yaw: rnd(TAU) }); ped.story = true; this.npcs.push(ped); }   // sunbathers on the towels
    // boats in the bay + off the beach (mid-block, clear of the causeways)
    const bx = (this.city.bayX0 + this.city.bayX1) / 2;
    for (let i = 0; i < 4; i++) this.cars.push(new Boat(this, bx + rnd(-5, 5), -this.city.size / 2 + 33 + i * 132));
    for (let i = 0; i < 2; i++) this.cars.push(new Boat(this, this.city.size / 2 + 115, -70 + i * 150));
    if (this.city.marina) this.cars.push(new Boat(this, this.city.marina.x + 4, this.city.marina.z)); // slip rental at Bayside
    this.story.begin(); this.input.lock();
    if (this.saveData) {
      this.player.money = this.saveData.money != null ? this.saveData.money : this.player.money; this.player.hasGun = !!this.saveData.gun; if (this.player.hasGun) this.player.weapon = 'pistol';
      for (const i of (this.saveData.own || [])) { const rec = this.city.shops[i]; if (rec && PROP[rec.type]) { rec.owned = true; if (rec.strip) { rec.strip.material.color.set(0x2fe07a); rec.strip.material.emissive.set(0x2fe07a); } } }
    }
  }
  spawnPed(cluster) {
    const c = this.city; let x, z, tr = 0;
    do { const a = rnd(TAU), r = rnd(22, 110); x = this.player.pos.x + Math.cos(a) * r; z = this.player.pos.z + Math.sin(a) * r; [x, z] = c.snapSidewalk(x, z); tr++; } while ((c.inBay(x, z) || x > c.size / 2 + 4) && tr < 12);
    const lim = c.size / 2 + 20; x = clamp(x, -lim, lim); z = clamp(z, -lim, lim);
    const n = new Ped(this, x, z); this.npcs.push(n);
    if (cluster && Math.random() < 0.5) { const k = 1 + (Math.random() * 2 | 0); for (let i = 0; i < k; i++) { const c2 = new Ped(this, x + rnd(-2.4, 2.4), z + rnd(-2.4, 2.4)); c2.pdir = n.pdir; this.npcs.push(c2); } }   // walk in little crowds
    return n;
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
  // cars are solid: walkers get pushed out of every hull (oriented box in the car's frame)
  pushOutOfCars(px, pz, radius) {
    for (const c of this.cars) {
      if (c.boat) continue; const dx = px - c.pos.x, dz = pz - c.pos.z;
      if (dx * dx + dz * dz > 36) continue;
      const cos = Math.cos(c.yaw), sin = Math.sin(c.yaw);
      const lx = dx * cos - dz * sin, lz = dx * sin + dz * cos;
      const hw = (c.kind === 'monster' ? 1.55 : 1.25) + radius, hd = (c.kind === 'monster' ? 2.5 : 2.55) + radius;
      if (Math.abs(lx) < hw && Math.abs(lz) < hd) {
        const ox = hw - Math.abs(lx), oz = hd - Math.abs(lz);
        let nlx = lx, nlz = lz;
        if (ox < oz) nlx = Math.sign(lx || 1) * hw; else nlz = Math.sign(lz || 1) * hd;
        px = c.pos.x + nlx * cos + nlz * sin; pz = c.pos.z - nlx * sin + nlz * cos;
      }
    }
    return [px, pz];
  }
  addWanted(n) { const p = this.player; const was = p.wanted; p.wanted = Math.min(5, p.wanted + n); p.heat = Math.max(p.heat, 12 + p.wanted * 6); if (was === 0 && p.wanted > 0) this.responseT = rnd(7, 12); } // dispatch takes time to arrive
  // ---- witness system: crimes only count if someone actually SAW (or heard) them ----
  reportCrime(pos, sev, opts) {
    opts = opts || {};
    let seen = false;
    for (const n of this.npcs) { if (n.dead) continue; const d = n.pos.distanceTo(pos); if (n.cop && d < 45) { seen = true; break; } if (!n.cop && d < (opts.loud ? 55 : 22)) { seen = true; break; } }
    if (!seen) { if (opts.quiet !== true) this.ui.toast('Nobody saw that...'); return false; }
    this.addWanted(sev); return true;
  }
  shootRay(origin, dir, dmg, range) {
    let bestT = range, victim = null;
    for (const n of this.npcs) { if (n.dead) continue; const t = raySphere(origin, dir, n.pos.clone().setY(n.pos.y + 1.0), 0.7); if (t != null && t < bestT) { bestT = t; victim = n; } }
    const end = origin.clone().addScaledVector(dir, Math.min(bestT, range));
    if (victim) { victim.damage(dmg, dir); this.hitFx(end, 0xff5050, 10); if (!victim.cop) this.reportCrime(origin, 2, { loud: true, quiet: true }); } // gunshots echo — anyone in a block hears
    this.player.gunOutT = 4;
    for (const n of this.npcs) if (!n.dead && n.scare && n.pos.distanceTo(origin) < 22) n.scare(5); // bystanders duck for cover
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
  menuCam() { const t = this.time * 0.14, r = 118 + Math.sin(t * 0.5) * 48; this.camera.position.set(Math.cos(t) * r, 34 + Math.sin(t * 0.37) * 24, Math.sin(t) * r); this.camera.lookAt(Math.sin(t * 0.3) * 24, 16, Math.cos(t * 0.3) * 24); }
  // ---- day / night cycle (blends day -> dusk -> night palettes) ----
  updateDayNight() {
    const phase = (this.time / 300) % 1, elev = Math.cos(phase * TAU);
    const day = clamp(elev, 0, 1), night = clamp(-elev, 0, 1), dusk = 1 - Math.abs(elev);
    const mixc = (d, k, n) => new THREE.Color(d).multiplyScalar(day).add(new THREE.Color(k).multiplyScalar(dusk)).add(new THREE.Color(n).multiplyScalar(night));
    const u = this.sky.children[0].material.uniforms;
    u.top.value.copy(mixc(0x2f6ad2, 0x3a1d5e, 0x0a0a22)); u.mid.value.copy(mixc(0x74a8e6, 0x8a3f86, 0x1a1438));
    u.hor.value.copy(mixc(0xdcecf6, 0xe08a88, 0x2c2448)); u.bot.value.copy(mixc(0xa6bccb, 0x3a2646, 0x0c0a1a));
    this.sun.intensity = 0.4 + day * 2.3 + dusk * 0.9; this.sun.color.copy(mixc(0xfff3da, 0xffb877, 0x93a8e0));
    this.hemi.intensity = 0.42 + day * 0.75 + dusk * 0.35; this.scene.fog.color.copy(mixc(0xcfe0ee, 0x5a3a5e, 0x131024));
    this.dayAmt = day; this.hour = (phase * 24 + 12) % 24; // phase 0 = high noon
  }
  // ---- property / economy layer: buy venues (B), they pay out every minute ----
  buyProperty() {
    const p = this.player;
    // dealership display cars first
    for (const d of (this.city.displays || [])) {
      if (Math.hypot(p.pos.x - d.x, p.pos.z - d.z) > 7) continue;
      if (p.money < d.price) { this.ui.toast(d.label + ' costs $' + d.price); return; }
      p.money -= d.price; const car = new Car(this, d.x + 10, d.z + 10, new THREE.Vector3(0, 0, 1), d.color, false, d.kind); car.ai = false; this.cars.push(car);
      this.ui.toast('★ Bought the ' + d.label + ' (-$' + d.price + ') — it\'s parked beside the pad'); return;
    }
    for (const rec of this.city.shops) {
      if (Math.abs(p.pos.x - rec.x) > (rec.w || 20) / 2 + 4 || Math.abs(p.pos.z - rec.z) > (rec.d || 20) / 2 + 4) continue;
      const deal = PROP[rec.type]; if (!deal) { this.ui.toast('Not for sale'); return; }
      if (rec.owned) { this.ui.toast(rec.name + ' is yours — pays $' + deal.rate + '/min'); return; }
      if (p.money < deal.cost) { this.ui.toast(rec.name + ' costs $' + deal.cost); return; }
      p.money -= deal.cost; rec.owned = true;
      if (rec.strip) { rec.strip.material.color.set(0x2fe07a); rec.strip.material.emissive.set(0x2fe07a); }
      this.ui.toast('★ Bought ' + rec.name + ' (-$' + deal.cost + ') — earns $' + deal.rate + '/min');
      this.saveGame(); return;
    }
    this.ui.toast('Stand inside a venue to buy it');
  }
  updateIncome(dt) {
    this.incomeT = (this.incomeT || 0) + dt; if (this.incomeT < 60) return;
    this.incomeT -= 60; let sum = 0; for (const rec of this.city.shops) if (rec.owned && PROP[rec.type]) sum += PROP[rec.type].rate;
    if (sum > 0) { this.player.money += sum; this.ui.toast('Properties paid out +$' + sum); }
  }
  // ---- day shifts: clerks clock in behind their counters in the morning and walk off at night ----
  updateWorkers(dt) {
    this._wkT = (this._wkT || 0) - dt; if (this._wkT > 0) return; this._wkT = 0.8;
    const onShift = this.hour >= 8 && this.hour < 21, p = this.player;
    let active = 0; for (const w of this.city.workposts) if (w.ped && !w.ped.dead) active++;
    for (const w of this.city.workposts) {
      const d = Math.hypot(w.x - p.pos.x, w.z - p.pos.z);
      if (!w.ped) {
        if (onShift && d < 100 && d > 14 && active < 12) { const ped = new Ped(this, w.x, w.z, false, { worker: true, yaw: w.yaw || 0 }); ped.story = true; w.ped = ped; this.npcs.push(ped); active++; }
      } else if (w.ped.dead || w.ped.removeMe) w.ped = null;
      else if (!onShift) { w.ped.story = false; w.ped.worker = false; w.ped.loiter = false; w.ped = null; } // clock out — they wander home like anyone else
      else if (d > 150) { w.ped.removeMe = true; w.ped = null; }
    }
  }
  // ---- phone GPS: a cyan beam you can drop on any pin from the phone ----
  setGps(name, pt) {
    this.gps = { name, x: pt.x, z: pt.z };
    if (!this.gpsMarker) { this.gpsMarker = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 95, 12), new THREE.MeshBasicMaterial({ color: 0x2fe6ff, transparent: true, opacity: 0.25, depthWrite: false })); this.scene.add(this.gpsMarker); }
    this.gpsMarker.position.set(pt.x, 48, pt.z); this.gpsMarker.visible = true;
  }
  clearGps() { this.gps = null; if (this.gpsMarker) this.gpsMarker.visible = false; }
  updateGps() { if (!this.gps) return; const p = this.player; if (Math.hypot(p.pos.x - this.gps.x, p.pos.z - this.gps.z) < 10) { this.ui.toast('GPS — you have arrived: ' + this.gps.name); this.clearGps(); } }
  // ---- free roam: no script, spawn at your place with wheels in the driveway ----
  startFreeRoam() {
    this.story.freeRoam = true;
    const H = this.city.places.home; this.player.spawnPos = { x: H.x, z: H.z + 8.5 };
    if (!this.saveData) this.player.money = 600;
    this.start();
    const car = new Car(this, H.x + 7, H.z + 12, new THREE.Vector3(0, 0, 1), 0x9b5cff, false); car.ai = false; this.cars.push(car);
    this.ui.bigCard('FREE ROAM', 'No missions, no script — the whole island, your rules.');
  }
  // ---- E interactions: rob registers, eat at diners, taxi fast-travel ----
  interact() {
    const p = this.player;
    if (p.inCar) { // spray shop: repaint your ride
      const sp = this.city.sprayPad;
      if (sp && Math.hypot(p.pos.x - sp.x, p.pos.z - sp.z) < 7 && !p.inCar.boat) {
        if (p.money >= 200) { p.money -= 200; p.inCar.repaint(pick(CAR_COLORS)); this.ui.toast('Fresh coat of paint (-$200)'); }
        else this.ui.toast('Respray costs $200');
      }
      return;
    }
    for (const rec of this.city.shops) {
      if (Math.abs(p.pos.x - rec.x) > (rec.w || 20) / 2 || Math.abs(p.pos.z - rec.z) > (rec.d || 20) / 2) continue;
      if (rec.type === 'gunshop') { // legal-carry island: the counter sells to anyone with the cash
        if (!p.hasGun) { if (p.money >= 250) { p.money -= 250; p.hasGun = true; p.weapon = 'pistol'; this.saveGame(); this.ui.toast('★ Pistol bought (-$250) — press 2 to draw, 1 to holster'); } else this.ui.toast('AMMU-BAY: the pistol runs $250'); }
        else this.ui.toast('AMMU-BAY: rounds are on the house — come again');
        return;
      }
      if (rec.type === 'bank') {
        if (!p.hasGun) { this.ui.toast('Bay Mutual: tellers only argue with a drawn pistol'); return; }
        const st = this.story, cur = st.state === 'steps' && MISSIONS[st.mi] && MISSIONS[st.mi].steps[st.si];
        if (rec.robT && this.time < rec.robT && !(cur && cur.type === 'rob')) { this.ui.toast('The vault is sealed tight — give it time'); return; }
        rec.robT = this.time + 600; this.lastBankRobT = this.time; const take = 600 + (Math.random() * 500 | 0); p.money += take; p.gunOutT = 6; this.addWanted(4);
        for (const n of this.npcs) if (!n.dead && n.scare && n.pos.distanceTo(p.pos) < 30) n.scare(8);
        this.ui.news('BAY MUTUAL HIT — masked robber empties the counter drawers in broad daylight');
        this.ui.toast('VAULT CASH +$' + take + ' — RUN'); return;
      }
      if (rec.type === 'home') {
        if (p.wanted > 0) { this.ui.toast("Can't sleep with the law outside — lose the heat first"); return; }
        p.health = p.maxHealth; const ph = (this.time / 300) % 1; this.time += ((20 / 24 - ph + 1) % 1) * 300; // fast-forward to 8 AM
        this.saveGame(); this.ui.bigCard('HOME SWEET HOME', 'Slept till morning — health full, game saved'); return;
      }
      if (rec.type === 'diner' && p.money >= 10) { p.money -= 10; p.health = p.maxHealth; this.ui.toast('Hot meal — HP restored (-$10)'); return; }
      if (rec.type !== 'tower' && (!rec.robT || this.time > rec.robT)) {
        rec.robT = this.time + 200; const take = 40 + (Math.random() * 90 | 0); p.money += take; this.addWanted(2);
        for (const n of this.npcs) if (!n.dead && n.scare && n.pos.distanceTo(p.pos) < 24) n.scare(6);
        this.ui.toast('Register robbed +$' + take); return;
      }
      if (rec.type === 'tower') { this.ui.toast('Lobby — nothing to take here'); return; }
      this.ui.toast('Register already emptied'); return;
    }
    // taxi fast-travel to the current objective
    for (const c of this.cars) { if (!c.taxi || c.driver) continue; if (c.pos.distanceTo(p.pos) > 5) continue;
      if (!this.story.marker || !this.story.marker.visible) { this.ui.toast('Taxi: no destination right now'); return; }
      if (p.money < 50) { this.ui.toast('Taxi: need $50'); return; }
      p.money -= 50; const m = this.story.marker.position; p.pos.set(m.x + 4, 0, m.z + 4); p.root.position.copy(p.pos); this.ui.toast('Taxi ride -$50'); return; }
  }
  updatePickups(dt) {
    for (const pk of this.city.packages) { if (pk.got) continue; pk.m.rotation.y += dt * 2.2; pk.m.position.y = 0.5 + Math.sin(this.time * 2.4 + pk.x) * 0.12;
      if (Math.hypot(this.player.pos.x - pk.x, this.player.pos.z - pk.z) < 1.4) { pk.got = true; pk.m.visible = false; this.player.money += 150; const got = this.city.packages.filter(q => q.got).length; this.hitFx(pk.m.position, 0x4dff9e, 10); this.ui.toast('Hidden package ' + got + '/12 +$150'); } }
    const bc = this.city.briefcase;
    if (bc && !bc.got) { bc.m.rotation.y += dt * 1.6; if (Math.hypot(this.player.pos.x - bc.x, this.player.pos.z - bc.z) < 2.2) { bc.got = true; bc.m.visible = false; this.player.money += 1000; this.hitFx(bc.m.position, 0xffd23a, 16); this.ui.toast('Isla Privada stash +$1000'); } }
  }
  copBark(cop, dist) {
    this._barkT = this._barkT || 0; if (this.time < this._barkT || dist > 26) return; this._barkT = this.time + 4.5;
    const p = this.player;
    const line = p.inCar ? pick(['"PULL OVER — engine off, keys out!"', '"Step OUT of the vehicle!"']) :
      (p.gunOutT > 0 ? '"Drop the weapon — NOW!"' : p.wanted >= 3 ? pick(['"On the ground! It\'s over!"', '"Stop running!"']) : pick(['"Break it up! Break it up!"', '"Hands where I can see them."', '"Any weapons on you? Keep \'em down."', '"That\'s far enough, pal."']));
    this.ui.toast(line);
  }
  carShield(dmg) { // you can't be shot through the body panels — only unlucky window hits land
    if (!this.player.inCar) return dmg;
    if (Math.random() < 0.68) { this.hitFx(this.player.inCar.pos.clone().setY(1.0), 0xffe27a, 5); return 0; } // spark off the panel
    return dmg * 0.5; // through the glass
  }
  updateArrest(dt) {
    const p = this.player; if (p.dead || this.jailed || p.cuffT > 0) { this._bustT = 0; return; }
    // TAZED: drawing/firing your gun while a cop is on you (below 5 stars) = instant ride downtown
    if (p.wanted > 0 && p.wanted < 5 && p.gunOutT > 0 && !p.inCar && p.tazedT <= 0) {
      for (const n of this.npcs) if (n.cop && !n.dead && n.pos.distanceTo(p.pos) < 12) {
        p.tazedT = 1.8; this.addTracer(n.pos.clone().setY(1.4), p.eye(), 0xfff23a); this.ui.toast('"TASER! TASER!"'); break;
      }
    }
    // RESTRAINED: two officers on top of you (on foot) and it's cuffs
    if (p.wanted > 0 && !p.inCar && p.tazedT <= 0) {
      let near = 0; for (const n of this.npcs) if (n.cop && !n.dead && n.pos.distanceTo(p.pos) < 2.3) near++;
      this._bustT = near >= 2 ? (this._bustT || 0) + dt : 0;
      if (this._bustT > 1.0 && p.cuffT <= 0) { p.cuffT = 1.7; this._arrestWhy = 'Restrained and cuffed'; this.ui.toast('"Hands behind your back!"'); this._bustT = 0; }
    } else this._bustT = 0;
  }
  goToJail(why) {
    const p = this.player; if (this.jailed) return;
    this.jailed = true; p.tazedT = 0; p.cuffT = 0; p.wanted = 0; p.heat = 0; p.health = p.maxHealth;
    for (const n of this.npcs) if (n.cop) n.removeMe = true;
    for (const c of this.cars) if (c.police) c.removeMe = true;
    if (p.inCar) { p.inCar.driver = null; p.inCar = null; p.root.visible = true; }
    const J = this.city.jail; p.pos.set(J.cell.x, 0, J.cell.z); p.root.position.copy(p.pos);
    this.city.jailDoorClose();
    this.ui.bigCard('BUSTED', why || ''); this.ui.news('Arrest on the mainland — suspect in custody at Bay County lockup');
    this.setJailObjective();
    this.saveGame();
  }
  setJailObjective() { this.ui.el.obj.textContent = 'JAIL — hold E at the cell door to work the lock (' + (3 - (this._picks || 0)) + ' picks left)'; }
  updateJail(dt) {
    if (!this.jailed) return;
    const p = this.player, J = this.city.jail;
    if (Math.hypot(p.pos.x - J.cell.x, p.pos.z - J.cell.z) > 40) { this.jailed = false; this._picks = 0; this.ui.toast('You slipped away. Lay low for a while.'); this.ui.el.obj.textContent = ''; this.story.setChapter(this.story.freeRoam ? null : MISSIONS[this.story.mi]); if (this.story.state === 'goMeet') this.story._setupMeet(MISSIONS[this.story.mi]); return; }
    if (this.input.p('KeyE') && !this.city.jailOpen && Math.hypot(p.pos.x - J.door.x, p.pos.z - J.door.z) < 3.4) {
      this._picks = (this._picks || 0) + 1; this.setJailObjective();
      if (this._picks >= 3) { this.city.jailDoorOpen(); this._picks = 0; this.ui.toast('The lock pops. GO.'); this.ui.el.obj.textContent = 'Get clear of the jail'; }
      else this.ui.toast('Working the lock... (' + (3 - this._picks) + ' to go)');
    }
  }
  saveGame() { try { const ch = this.story.freeRoam ? ((this.saveData && this.saveData.ch) || 0) : Math.max(0, this.story.mi); localStorage.setItem('nb_save', JSON.stringify({ ch, money: this.player.money | 0, gun: !!this.player.hasGun, own: this.city.shops.map((s, i) => s.owned ? i : -1).filter(i => i >= 0) })); } catch (e) {} }
  _ambient(dt) { for (const c of this.cars) c.update(dt); for (const n of this.npcs) if (!n.story) n.update(dt); this.updateCulling(); }
  intro() {
    this.ui.hideTitle(); this.ui.modal = null; this.menuMode = false; this.introMode = true; this.ui.letterbox(true);
    const az = this.city.airport.z;
    this.plane = buildPlane(); this.scene.add(this.plane);
    this.player.spawnPos = this.city.airport.exit;
    this._intro = { t: 0, dur: 19, bi: -1, az,
      // plane keyframes: [u, x, y, z] — descends from the south and rolls in toward the city
      path: [[0, 6, 150, az - 320], [0.4, 0, 30, az - 150], [0.55, 0, 2.6, az - 110], [1, 0, 2.6, az + 40]],
      beats: [
        { u: 0.3, lines: ['Neon Bay International. Wheels down in five.', 'Population: two million liars — and me.'] },
        { u: 0.56, lines: ['They call me a lot of things back home.', "‘Broke’ is the one that stuck."] },
        { u: 0.82, lines: ["One bus ticket's savings, a cousin with a plan,", 'and a one-way flight into the sun.'] },
        { u: 2, lines: ['I came here to disappear.', "Instead — I'm gonna own it."] },
      ] };
    this.ui.introSkip(true);
  }
  updateIntro(dt) {
    const I = this._intro; if (!I) { this.endIntro(); return; }
    I.t += dt; const u = clamp(I.t / I.dur, 0, 1);
    const p = I.path; let k = 0; while (k < p.length - 2 && u > p[k + 1][0]) k++;
    const a = p[k], b = p[k + 1], s = clamp((u - a[0]) / ((b[0] - a[0]) || 1), 0, 1), e = s * s * (3 - 2 * s);
    const px = lerp(a[1], b[1], e), py = lerp(a[2], b[2], e), pz = lerp(a[3], b[3], e);
    this.plane.position.set(px, py, pz); this.plane.rotation.x = py > 4 ? -0.1 : 0;
    this.camera.position.set(px + 20, py + 13, pz - 44); this.camera.lookAt(px, py + 2, pz + 10);
    let bi = 0; while (bi < I.beats.length - 1 && u >= I.beats[bi].u) bi++;
    if (bi !== I.bi) { I.bi = bi; this.ui.introText(I.beats[bi].lines); }
    if (this.input.p('Escape')) { this.endIntro(); return; }
    if (this.input.p('Space') || this.input.p('Enter')) I.t += I.dur * 0.16;
    if (u >= 1) this.endIntro();
  }
  endIntro() { if (!this.introMode) return; this.introMode = false; if (this.plane) { this.scene.remove(this.plane); this.plane = null; } this._intro = null; this.ui.introHide(); this.ui.introSkip(false); this.ui.letterbox(false); this.start(); }
  updateCulling() {
    this.camera.updateMatrixWorld(); this._m.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse); this._frustum.setFromProjectionMatrix(this._m);
    const cp = this.camera.position, near2 = 135 * 135;
    // Distant-Horizons style: full detail near, cheap LOD shells at any distance (in frustum)
    for (const c of this.city.cullables) {
      const dx = c.p.x - cp.x, dz = c.p.z - cp.z, near = (dx * dx + dz * dz) < near2;
      const vis = this._frustum.intersectsSphere(this._sph.set(c.p, c.r));
      c.o.visible = near && vis; if (c.lod) c.lod.visible = !near && vis;
    }
    for (const n of this.npcs) { if (n.dead) { continue; } const dx = n.pos.x - cp.x, dz = n.pos.z - cp.z; n.root.visible = (dx * dx + dz * dz) < 145 * 145 && this._frustum.intersectsSphere(this._sph.set(n.root.position, 2.2)); }
    for (const car of this.cars) { const dx = car.pos.x - cp.x, dz = car.pos.z - cp.z; car.root.visible = (dx * dx + dz * dz) < 170 * 170 && this._frustum.intersectsSphere(this._sph.set(car.root.position, 3.4)); }
  }
  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.05); this.time += dt;
    if (this.menuMode) { this.menuCam(); this._ambient(dt); }
    else if (this.introMode) { this.updateIntro(dt); this._ambient(dt); }
    else if (this.playing) {
      if (this.input.p('Escape')) { if (this.ui.modal) this.ui.closeModal(); else if (this.paused) this.resume(); else this.pause(); }
      if (this.input.p('KeyP') && !this.cine && !this.paused && (!this.ui.modal || this.ui.modal === 'phone')) this.ui.phone(this.ui.modal !== 'phone');
      const frozen = this.paused || this.ui.modal;
      if (this.cine) { this.updateCutscene(dt); }
      else if (!frozen) { this.player.update(dt); for (const n of this.npcs) n.update(dt); for (const c of this.cars) c.update(dt); this.story.update(dt); this.updateWanted(dt); this.updatePickups(dt); this.updateArrest(dt); this.updateJail(dt); this.updateIncome(dt); this.updateWorkers(dt); this.updateGps(); this.cull(); this.player.updateCamera(dt, false); }
      else { this.player.updateCamera(dt, true); }
      this.updateFx(dt); this.ui.update(); this.updateCulling();
    }
    if (this.player.pos) { this.sun.position.set(this.player.pos.x - 48, 95, this.player.pos.z - 95); this.sun.target.position.copy(this.player.pos); this.sun.target.updateMatrixWorld(); }
    this.sky.position.copy(this.camera.position);
    this.updateDayNight();
    if (this.city.displays) for (const d2 of this.city.displays) d2.root.rotation.y += dt * 0.5;
    const jd = this.city.jailDoor; if (jd) { const tx = this.city.jail.door.x + (this.city.jailOpen ? 2.7 : 0); jd.position.x += (tx - jd.position.x) * Math.min(1, dt * 3.5); } // cell door rolls on its track
    if (this.city.lighthouseBeam) this.city.lighthouseBeam.rotation.y += dt * 0.9; // sweeping beacon
    if (this.sky.userData.clouds) for (const c of this.sky.userData.clouds.children) { c.position.x += dt * 2.4; if (c.position.x > 720) c.position.x -= 1440; }
    // refresh the shadow map only a few times per second (buildings are static)
    this._shadowT -= dt; if (this._shadowT <= 0) { this.renderer.shadowMap.needsUpdate = true; this._shadowT = 0.11; }
    this.post.render(); this.input.end();
  }
  updateWanted(dt) { const p = this.player; if (p.heat > 0) { p.heat -= dt; if (p.heat <= 0) { p.wanted = Math.max(0, p.wanted - 1); p.heat = p.wanted > 0 ? 14 : 0; } }
    if (this.responseT > 0) { this.responseT -= dt; return; } // units are en route — no psychic instant cops
    this.copT = (this.copT || 0) - dt; if (p.wanted > 0 && this.copT <= 0) { this.copT = 2.0; const want = Math.min(8, p.wanted * 2); let have = this.npcs.filter(n => n.cop && !n.dead).length; while (have < want) { const a = rnd(TAU), r = rnd(34, 50); this.npcs.push(new Ped(this, p.pos.x + Math.cos(a) * r, p.pos.z + Math.sin(a) * r, true)); have++; } }
    // cruiser dispatch at 3+ stars
    if (p.wanted >= 3) { const want = p.wanted >= 5 ? 3 : p.wanted - 2, have = this.cars.filter(c => c.police && !c.removeMe).length; if (have < want) { const a = rnd(TAU), r = rnd(55, 80); this.cars.push(new PoliceCar(this, this.city.gridLine(p.pos.x + Math.cos(a) * r), clamp(p.pos.z + Math.sin(a) * r, -this.city.size / 2, this.city.size / 2))); if (p.wanted === 5 && !this._n5) { this._n5 = true; this.ui.news('FIVE-STAR MANHUNT — NBPD floods the causeways as chaos grips the Bay'); } } }
    if (p.wanted === 0) for (const n of this.npcs) if (n.cop) n.removeMe = true; }
  updateFx(dt) {
    for (const t of this.tracers) { t.life -= dt; t.line.material.opacity = Math.max(0, t.life / 0.06); }
    this.tracers = this.tracers.filter(t => { if (t.life <= 0) { this.scene.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose(); return false; } return true; });
    for (const f of this.fx) { f.life -= dt; for (let i = 0; i < f.n; i++) { f.vs[i * 3 + 1] -= 12 * dt; f.ps[i * 3] += f.vs[i * 3] * dt; f.ps[i * 3 + 1] += f.vs[i * 3 + 1] * dt; f.ps[i * 3 + 2] += f.vs[i * 3 + 2] * dt; } f.g.attributes.position.needsUpdate = true; f.m.material.opacity = Math.max(0, f.life / 0.6); }
    this.fx = this.fx.filter(f => { if (f.life <= 0) { this.scene.remove(f.m); f.g.dispose(); f.m.material.dispose(); return false; } return true; });
  }
  cull() { this.npcs = this.npcs.filter(n => { if (n.removeMe) { this.scene.remove(n.root); return false; } return true; }); this.cars = this.cars.filter(c => { if (c.removeMe) { this.scene.remove(c.root); return false; } return true; }); const civ = this.npcs.filter(n => !n.cop && !n.story).length; if (civ < 34) { this.spawnPed(); if (civ < 26) this.spawnPed(); } if (this.cars.filter(c => c.aiTraffic && !c.police).length < 15) this.spawnTraffic(); }
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
    this.inCar = null; this.regen = 0; this.dead = false; this.hasGun = false; this.weapon = 'fists'; this.gunCd = 0; this.punchT = 0; this.shootT = 0; this.jackT = 0; this.jackCar = null; this.tazedT = 0; this.gunOutT = 0; this.cuffT = 0;
    this.root = new THREE.Group(); this.root.add(makeBlob(0.55)); game.scene.add(this.root); this.root.visible = false; this._build();
  }
  _build() { const f = buildPerson({ shirt: PLAYER_PURPLE, skin: 0xecbd90, hair: 0x201810, pants: 0x1f2530, style: 'mop', noScale: true }); this.fig = f; this.root.add(f.group); this.gun = buildPistol(); this.gun.position.set(0.02, -0.3, 0.06); this.gun.visible = false; f.j.foreR.add(this.gun); }
  spawn() { const s = this.spawnPos || { x: 30, z: 30 }; this.pos.set(s.x, 0, s.z); this.camYaw = 0; this.root.position.copy(this.pos); }
  enterCar(car) { this.inCar = car; car.driver = this; car.ai = false; this.root.visible = false; const dv = car.root.userData && car.root.userData.driver; if (dv) dv.visible = false; }
  exitCar() { const car = this.inCar; if (!car) return; this.inCar = null; car.driver = null; car.ai = false; car.speed = 0; this.root.visible = true; this.pos.set(car.pos.x + 2.4, 0, car.pos.z); this.vy = 0; } // stolen cars STAY parked
  startJack(car) {
    // cinematic carjack: stop the car, yank the driver out cold, then take the wheel
    car.ai = false; car.speed = 0; this.jackT = 1.15; this.jackCar = car;
    const a = car.yaw + Math.PI / 2, dx = Math.sin(a) * 1.6, dz = Math.cos(a) * 1.6;
    this.pos.set(car.pos.x + dx, 0, car.pos.z + dz); this.root.position.copy(this.pos);
    this.yaw = Math.atan2(car.pos.x - this.pos.x, car.pos.z - this.pos.z);
    if (car.aiTraffic && !car.jacked) {
      car.jacked = true;
      const dvv = car.root.userData.driver; if (dvv) dvv.visible = false; // out of the seat...
      // ...and into your hands: the driver is hauled from behind the wheel to the asphalt
      const sy = car.yaw, seatX = car.pos.x + 0.45 * Math.cos(sy) - 0.5 * Math.sin(sy), seatZ = car.pos.z - 0.45 * Math.sin(sy) - 0.5 * Math.cos(sy);
      const owner = new Ped(this.game, seatX, seatZ); owner.story = true;
      owner.dragT = 0.62; owner.dragFrom = { x: seatX, z: seatZ }; owner.dragTo = { x: car.pos.x + dx * 2.0, z: car.pos.z + dz * 2.0 };
      owner.knockT = 3.2; owner.angryT = 4; owner.yaw = this.yaw + Math.PI; this.game.npcs.push(owner);
      setTimeout(() => { owner.story = false; }, 12000);
      this.game.ui.toast('"HEY! That\'s my car!"');
      this.game.reportCrime(car.pos, 1, { quiet: false }); // only matters if someone SAW you
    }
  }
  eye() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.5, this.pos.z); }
  update(dt) {
    const inp = this.game.input;
    this.camYaw -= inp.mdx * 0.0024; this.camPitch = clamp(this.camPitch + inp.mdy * 0.0024, -0.2, 1.2); this.camDist = clamp(this.camDist + inp.wheel * 0.8, 4, 13);
    this.gunOutT = Math.max(0, (this.gunOutT || 0) - dt);
    // cuffed: kneel, hands behind your back, then the cell
    if (this.cuffT > 0) {
      this.cuffT -= dt; this.fig.update(dt, { state: 'cuffed' }); this.root.position.copy(this.pos);
      if (this.cuffT <= 0) this.game.goToJail(this.game._arrestWhy || 'Booked at Bay County');
      this._stats(dt); return;
    }
    // tazed: you drop twitching, then wake up in a cell
    if (this.tazedT > 0) {
      this.tazedT -= dt; this.fig.update(dt, { state: 'knockout' }); this.root.position.copy(this.pos);
      if (this.tazedT <= 0) this.game.goToJail('Tazed while reaching for a weapon');
      this._stats(dt); return;
    }
    // carjack animation in progress: locked in the yank until it lands
    if (this.jackT > 0) {
      this.jackT -= dt; this.fig.update(dt, { state: 'yank' }); this.root.rotation.y = this.yaw;
      if (this.jackT <= 0 && this.jackCar) { this.enterCar(this.jackCar); this.jackCar = null; }
      this._stats(dt); return;
    }
    if (inp.p('KeyF')) { if (this.inCar) this.exitCar(); else { const car = this.game.nearestCar(this.pos, 4.5); if (car) { if (car.aiTraffic && !car.jacked && !car.boat) this.startJack(car); else this.enterCar(car); } } }
    if (inp.p('Digit1')) { this.weapon = 'fists'; this.game.ui.toast('Fists'); }
    if (inp.p('Digit2') && this.hasGun) { this.weapon = 'pistol'; this.gunOutT = 4; this.game.ui.toast('Pistol'); }
    if (inp.p('KeyE')) this.game.interact();
    if (!this.inCar && inp.p('KeyB')) this.game.buyProperty();
    if (this.inCar) { const car = this.inCar; car.control(dt, inp); this.pos.copy(car.pos); this.yaw = car.yaw; this._stats(dt); return; }
    const fwd = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw)), right = new THREE.Vector3(-fwd.z, 0, fwd.x), wish = new THREE.Vector3();
    if (inp.k('KeyW')) wish.add(fwd); if (inp.k('KeyS')) wish.sub(fwd); if (inp.k('KeyD')) wish.add(right); if (inp.k('KeyA')) wish.sub(right);
    const moving = wish.lengthSq() > 0; if (moving) wish.normalize();
    const inWater = this.game.city.isWater(this.pos.x, this.pos.z);
    const sprint = inp.k('ShiftLeft') || inp.k('ShiftRight'), sp = inWater ? 2.6 : (sprint ? 9.5 : 5.0);
    this.pos.x += wish.x * sp * dt; this.pos.z += wish.z * sp * dt;
    [this.pos.x, this.pos.z] = this.game.city.collide(this.pos.x, this.pos.z, 0.5);
    [this.pos.x, this.pos.z] = this.game.pushOutOfCars(this.pos.x, this.pos.z, 0.42);
    this.pos.x = clamp(this.pos.x, -this.game.city.size / 2 - 260, this.game.city.size / 2 + 300); this.pos.z = clamp(this.pos.z, -this.game.city.size / 2 - 330, this.game.city.size / 2 + 260);
    if (inp.k('Space') && this.onGround && !inWater) { this.vy = 7; this.onGround = false; }
    const gH = this.game.city.groundH(this.pos.x, this.pos.z);
    this.vy -= 22 * dt; this.pos.y += this.vy * dt; if (this.pos.y <= gH) { this.pos.y = gH; this.vy = 0; this.onGround = true; }
    if (moving) this.yaw = lerpAngle(this.yaw, Math.atan2(wish.x, wish.z), Math.min(1, dt * 12));
    this.gunCd = Math.max(0, this.gunCd - dt); this.punchT = Math.max(0, this.punchT - dt); this.shootT = Math.max(0, this.shootT - dt);
    const armed = this.weapon === 'pistol' && this.hasGun;
    if (this.gunCd <= 0) {
      if (armed && inp.mL) { this.gunCd = 0.16; this.shootT = 0.22; const d = new THREE.Vector3(); this.game.camera.getWorldDirection(d); this.yaw = Math.atan2(d.x, d.z); this.game.shootRay(this.eye(), d, 18, 120); }
      else if (!armed && inp.mLe) { this.gunCd = 0.42; this.punchT = 0.34; this.punchSide = -(this.punchSide || 1); this._punch(); }
    }
    // swimming in the bay/ocean: slow bobbing wade, no jumping
    const swim = inWater;
    if (swim) this.pos.y = -0.3 + Math.sin(this.game.time * 2.2) * 0.06;
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    const lowHp = this.health < 28 && !swim;
    this.fig.update(dt, { state: moving ? (lowHp ? 'limp' : (sprint && !swim ? 'run' : 'walk')) : (lowHp ? 'limp' : 'idle') });
    // arm overrides for punch / gun (cosmetic — aim itself is camera-based)
    if (this.gun) this.gun.visible = armed;
    const j = this.fig.j;
    if (this.punchT > 0) {
      const T = 0.34, tt = 1 - this.punchT / T, wind = clamp(tt / 0.3, 0, 1), str = clamp((tt - 0.3) / 0.35, 0, 1), rec = clamp((tt - 0.65) / 0.35, 0, 1);
      const ext = str * (1 - rec), side = this.punchSide || 1, A = side > 0 ? j.armR : j.armL, Fo = side > 0 ? j.foreR : j.foreL, O = side > 0 ? j.armL : j.armR, OF = side > 0 ? j.foreL : j.foreR;
      A.rotation.x = -0.5 * wind - ext * 1.15; A.rotation.z = -side * 0.12; Fo.rotation.x = -1.5 * wind + ext * 1.42; // chambered, then rams straight out
      O.rotation.x = -0.85; OF.rotation.x = -1.6; // guard hand stays up
      j.chest.rotation.y = side * (0.4 * wind - ext * 0.75); j.chest.rotation.x = 0.08 + ext * 0.12; j.hips.rotation.y = side * (0.2 * wind - ext * 0.4);
      j.legL.rotation.x = side > 0 ? -0.3 * ext : 0.22 * ext; j.legR.rotation.x = side > 0 ? 0.22 * ext : -0.3 * ext; // steps into it
      j.head.rotation.y = -side * ext * 0.1;
    }
    else if (armed) { const aim = this.shootT > 0 ? 1 : 0.35; j.armR.rotation.x = -0.5 - aim * 1.0; j.armR.rotation.z = -0.12; j.foreR.rotation.x = -0.12; }
    this._stats(dt);
  }
  _punch() {
    const reach = 2.3; let best = null, bd = reach; const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    for (const n of this.game.npcs) { if (n.dead) continue; const dx = n.pos.x - this.pos.x, dz = n.pos.z - this.pos.z, d = Math.hypot(dx, dz); if (d > bd) continue; if ((dx * fx + dz * fz) / (d || 1) < 0.25) continue; bd = d; best = n; }
    if (best) { best.damage(22, { x: fx, z: fz }); best.pos.x += fx * 0.8; best.pos.z += fz * 0.8; this.game.hitFx(best.pos.clone().setY(1.2), 0xffd27a, 6); if (!best.cop) { this.game.reportCrime(best.pos, 1, { quiet: true }); if (!best.dead && best.hp > 0 && Math.random() < 0.4) { best.fightT = 6; best.flee = 0; } } }
  }
  _stats(dt) { this.regen += dt; if (this.health < this.maxHealth && this.wanted === 0 && this.regen > 2) this.health = Math.min(this.maxHealth, this.health + 6 * dt); if (this.health <= 0 && !this.dead) { this.dead = true; this.game.saveGame(); const g = this.game; g.ui.bigCard('WASTED', 'You wake up at your place, $100 lighter');
      setTimeout(() => { const H = g.city.places.home; this.money = Math.max(0, this.money - 100); this.health = this.maxHealth; this.wanted = 0; this.heat = 0; if (this.inCar) { this.inCar.driver = null; this.inCar = null; this.root.visible = true; }
        this.pos.set(H.x, 0, H.z + 8); this.root.position.copy(this.pos); this.dead = false; for (const n of g.npcs) if (n.cop) n.removeMe = true; for (const c of g.cars) if (c.police) c.removeMe = true; }, 2200); } }
  hurt(n) { if (this.dead) return; this.health -= n; this.regen = 0; this.game.ui.flash(); }
  updateCamera(dt, frozen) {
    const target = this.inCar ? new THREE.Vector3(this.inCar.pos.x, 1.6, this.inCar.pos.z) : new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z);
    if (this.inCar) { const k = 0.12; this.camYaw = lerpAngle(this.camYaw, Math.atan2(Math.sin(this.inCar.yaw), Math.cos(this.inCar.yaw)) + Math.PI, k); }
    const dist = this.inCar ? 9.5 : this.camDist, pitch = this.inCar ? 0.24 : this.camPitch;
    const off = new THREE.Vector3(Math.sin(this.camYaw + Math.PI) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.camYaw + Math.PI) * Math.cos(pitch)).multiplyScalar(dist);
    let cx = target.x + off.x, cy = target.y + off.y + 0.75, cz = target.z + off.z; const gcam = this.game.city.groundH(cx, cz); if (cy < gcam + 0.7) cy = gcam + 0.7;
    // camera collision: march from the player toward the desired spot and stop at walls
    const boxes = this.game.city.boxes; let k = 1;
    for (let i = 1; i <= 12; i++) {
      const u = i / 12, px2 = lerp(target.x, cx, u), py2 = lerp(target.y, cy, u), pz2 = lerp(target.z, cz, u); let hit = false;
      for (const b of boxes) { if (py2 < (b.h === undefined ? 7 : b.h) && Math.abs(px2 - b.x) < b.hw + 0.35 && Math.abs(pz2 - b.z) < b.hd + 0.35) { hit = true; break; } }
      if (hit) { k = Math.max(0.12, (i - 1) / 12); break; } k = u;
    }
    cx = lerp(target.x, cx, k); cy = lerp(target.y, cy, k); cz = lerp(target.z, cz, k);
    this.game.camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 10) || 1); this.game.camera.lookAt(target);
  }
}
function lerpAngle(a, b, t) { let d = ((b - a + Math.PI) % TAU) - Math.PI; return a + d * t; }

// ---------------------------------------------------------------------------
// Ped / Cop / Dancer
// ---------------------------------------------------------------------------
class Ped {
  constructor(game, x, z, cop, opts) {
    opts = opts || {}; this.game = game; this.cop = !!cop; this.dance = !!opts.dance; this.loiter = !!opts.loiter; this.vendor = !!opts.vendor; this.homeless = !!opts.homeless; this.worker = !!opts.worker; this.pos = new THREE.Vector3(x, 0, z); this.yaw = opts.yaw != null ? opts.yaw : rnd(TAU);
    this.hp = cop ? 60 : 30; this.dead = false; this.removeMe = false; this.flee = 0; this.timer = rnd(3); this.wander = rnd(TAU); this.attackCd = 0; this.deadT = 0; this.cowerT = 0;
    this.errander = !cop && !this.dance && !this.loiter && !this.vendor && !this.homeless && !this.worker && Math.random() < 0.35; // some folks have somewhere to BE
    // district communities: suits downtown, bright beach fits, shabby camp clothes
    const cc = game.city, halfC = cc.size / 2, downtown = Math.hypot(x, z) < cc.cell * 1.6, beach = z > halfC - 50;
    if (this.homeless) this.persona = { shirt: pick([0x6a6053, 0x5a5148, 0x4a4a52, 0x6b5a3a]), skin: pick(SKIN), hair: pick([0x4a4a4a, 0x2b2b2b, 0x6b4a2a]), pants: pick([0x3a2e26, 0x4a4a52]), style: pick(['mop', 'bald', 'beanie', 'mop']) };
    else if (cop) this.persona = { shirt: 0x21407a, skin: pick(SKIN), hair: pick(HAIR), pants: 0x16213f, style: 'buzz', noScale: true };
    else if (this.worker) this.persona = { shirt: pick([0xe8e8e8, 0xc23232, 0x2f8f6a, 0x4a6c8a]), skin: pick(SKIN), hair: pick(HAIR), pants: pick([0x1f2530, 0x3a3f48]), style: pick(['cap', 'buzz', 'bowl', 'pony']) };
    else if (downtown && Math.random() < 0.5) this.persona = { shirt: pick([0x2a2f3a, 0x3a3f48, 0xe8e8e8, 0x1f2530]), skin: pick(SKIN), hair: pick(HAIR), pants: pick([0x1f2530, 0x2c3242]), style: pick(['buzz', 'bowl', 'bald', 'pony']) };
    else if (beach && Math.random() < 0.6) this.persona = { shirt: pick([0xff7a5a, 0x2fe6c0, 0xffe24a, 0xff5fb0, 0x4fd0ff]), skin: pick(SKIN), hair: pick(HAIR), pants: pick([0xe8e8e8, 0x4fd0ff, 0xff9a5a]), style: pick(['cap', 'spiky', 'afro', 'bald']) };
    else this.persona = { shirt: pick(SHIRTS), skin: pick(SKIN), hair: pick(HAIR), pants: pick(PANTS) };
    this.ambient = opts.ambient || (this.homeless ? pick(['panhandle', 'sit', 'sleep']) : this.worker ? pick(['idle', 'sweep', 'lean', 'wave']) : this.loiter ? pick(['sit', 'phone', 'smoke', 'lean']) : this.vendor ? pick(['idle', 'sweep', 'wave']) : null);
    const f = buildPerson(this.persona); this.fig = f; this.root = new THREE.Group(); this.root.add(makeBlob(0.55)); this.root.add(f.group); this.root.position.copy(this.pos); game.scene.add(this.root);
    if (cop) { const capm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.4), mat(0x11203f)); capm.position.y = 1.95; this.root.add(capm); }
    const [ux, uz] = game.city.collide(x, z, 0.55); if (Math.hypot(ux - x, uz - z) > 0.05) { this.pos.set(ux, 0, uz); this.root.position.copy(this.pos); } // never spawn inside a wall
  }
  animateIdle(dt) { if (!this.dead) this.fig.update(dt, { state: this.dance ? 'dance' : 'idle' }); }
  damage(n) { if (this.dead) return; this.hp -= n; this.flee = 7; if (this.hp <= 0) this.die(); else this.stunT = 0.45; }
  die() { this.dead = true; this.deadT = 0; const cash = 10 + (Math.random() * 40 | 0); this.game.player.money += cash; this.game.ui.toast('+$' + cash); }
  scare(t) { this.cowerT = Math.max(this.cowerT, t); }
  update(dt) {
    this.pos.y = this.game.city.groundH(this.pos.x, this.pos.z); // feet on the terrain, wherever it rolls
    if (this.dead) { this.deadT += dt; this.root.rotation.z = Math.min(Math.PI / 2, this.deadT * 4); this.root.position.copy(this.pos); if (this.deadT > 6) this.removeMe = true; return; }
    if (this.dance) { this.root.rotation.y = this.yaw; this.fig.update(dt, { state: 'dance' }); return; }
    if (this.dragT > 0) { // being hauled out of the driver's seat
      this.dragT -= dt; const k = 1 - Math.max(0, this.dragT) / 0.62, e = k * k * (3 - 2 * k);
      this.pos.x = this.dragFrom.x + (this.dragTo.x - this.dragFrom.x) * e; this.pos.z = this.dragFrom.z + (this.dragTo.z - this.dragFrom.z) * e;
      this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; this.root.rotation.z = -e * 0.85;
      this.fig.update(dt, { state: 'hitstun' }); return;
    }
    if (this.knockT > 0) { this.knockT -= dt; this.root.rotation.z *= Math.max(0, 1 - dt * 4); this.root.position.copy(this.pos); this.fig.update(dt, { state: 'knockout' }); if (this.knockT <= 0 && !this.angryT) this.flee = 6; return; } // out cold on the pavement
    if (this.angryT > 0 && this.flee <= 0) { this.angryT -= dt; const pp = this.game.player.pos; this.yaw = Math.atan2(pp.x - this.pos.x, pp.z - this.pos.z); this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; this.fig.update(dt, { state: 'argue' }); return; } // back on their feet, shaking a fist after you
    if (this.stunT > 0) { this.stunT -= dt; this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; this.fig.update(dt, { state: 'hitstun' }); return; }   // reeling from a hit
    this.cowerT = Math.max(0, this.cowerT - dt);
    if ((this.loiter || this.vendor || this.homeless || this.worker) && this.flee <= 0) {
      this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
      this.fig.update(dt, { state: this.cowerT > 0 ? 'cower' : (this.ambient || 'idle') }); return;
    }
    const p = this.game.player, dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, dist = Math.hypot(dx, dz);
    this.attackCd = Math.max(0, this.attackCd - dt); if (this.flee > 0) this.flee -= dt; this.timer -= dt; if (this.fightT > 0) this.fightT -= dt;
    let wx = 0, wz = 0, sp = this.cop ? 6 : 3.0;
    if (this.cop && p.wanted > 0 && dist < 55) {
      // escalation ladder: close in to restrain; NEVER shoot unless 5 stars AND your gun is out
      const gunOut = p.hasGun && p.weapon === 'pistol' && (p.gunOutT || 0) > 0;
      if (dist > 1.6) { wx = dx / dist; wz = dz / dist; } this.yaw = Math.atan2(dx, dz);
      this.game.copBark(this, dist);
      if (p.wanted >= 5 && gunOut && dist < 30 && this.attackCd <= 0) { this.attackCd = 1.1; p.hurt(this.game.carShield(6 + Math.random() * 5)); this.game.addTracer(this.pos.clone().setY(1.4), p.eye(), 0x9fc2ff); }
      // otherwise they converge — restrain/taze handled in Game.updateArrest
    }
    else if (this.enemy && !this.dead) { // mission goons: close on you (or the ally they were sent after) and swing
      const tgt = (this.attackAlly && !this.attackAlly.dead) ? this.attackAlly : p;
      const tdx = tgt.pos.x - this.pos.x, tdz = tgt.pos.z - this.pos.z, td = Math.hypot(tdx, tdz) || 1;
      if (td > 1.6) { wx = tdx / td; wz = tdz / td; } this.yaw = Math.atan2(tdx, tdz); sp = 5.2;
      if (td < 2.0 && this.attackCd <= 0) { this.attackCd = 0.9; if (tgt === p) { p.hurt(6 + Math.random() * 5); this.game.hitFx(p.eye(), 0xff7a5a, 6); } else { tgt.damage(7); } }
    }
    else if (this.fightT > 0 && !this.cop) { // civilians can swing back
      if (dist > 1.5) { wx = dx / dist; wz = dz / dist; } this.yaw = Math.atan2(dx, dz); sp = 4.6;
      if (dist < 1.9 && this.attackCd <= 0) { this.attackCd = 1.0; p.hurt(4 + Math.random() * 4); this.game.hitFx(p.eye(), 0xffd27a, 5); }
    }
    else if (this.flee > 0) { wx = -dx / (dist || 1); wz = -dz / (dist || 1); this.yaw = Math.atan2(wx, wz); sp = this.cop ? 6 : 5.5; }
    else if (!this.story && this.errandPt) { // somewhere to be: a food cart, a storefront, a towel on the sand
      this.pdir = null;
      const ex = this.errandPt.x - this.pos.x, ez = this.errandPt.z - this.pos.z, ed = Math.hypot(ex, ez);
      if (ed < 2.4) { this.errandWait = this.errandWait == null ? rnd(3.5, 7) : this.errandWait - dt; if (this.errandWait <= 0) { this.errandPt = null; this.errandWait = null; } }
      else { wx = ex / ed; wz = ez / ed; this.yaw = Math.atan2(wx, wz); }
    }
    else if (!this.story) {
      if (this.errander && !this.errandPt && Math.random() < dt * 0.09) { const es = this.game.city.errands; if (es && es.length) { const e2 = es[(Math.random() * es.length) | 0]; if (Math.hypot(e2.x - this.pos.x, e2.z - this.pos.z) < 130) this.errandPt = { x: e2.x + rnd(-1.4, 1.4), z: e2.z + rnd(-1.4, 1.4) }; } }
      if (!this.pdir || this.timer <= 0) { this.timer = rnd(3, 8); this.pdir = Math.random() < 0.12 ? null : pick(CARDS); }
      if (this.pdir) { wx = this.pdir.x; wz = this.pdir.z; this.yaw = Math.atan2(wx, wz); }
    }
    const moving = !!(wx || wz);
    const nx = this.pos.x + wx * sp * dt, nz = this.pos.z + wz * sp * dt;
    let [cx, cz] = this.game.city.collide(nx, nz, 0.5);
    if (moving) [cx, cz] = this.game.pushOutOfCars(cx, cz, 0.4);
    // civilians walk the block in straight lines and turn a corner when they hit a curb or wall
    if (moving && !this.cop && this.flee <= 0 && this.pdir && (this.game.city.onRoad(nx, nz) || this.game.city.inBay(nx, nz) || nx > this.game.city.size / 2 + 4 || Math.hypot(cx - nx, cz - nz) > 0.02)) {
      const l = { x: this.pdir.z, z: -this.pdir.x }, r = { x: -this.pdir.z, z: this.pdir.x };
      const okL = !this.game.city.onRoad(this.pos.x + l.x, this.pos.z + l.z), okR = !this.game.city.onRoad(this.pos.x + r.x, this.pos.z + r.z);
      this.pdir = okL && okR ? (Math.random() < 0.5 ? l : r) : okL ? l : okR ? r : { x: -this.pdir.x, z: -this.pdir.z };
      this.timer = rnd(3, 8);
    } else { this.pos.x = cx; this.pos.z = cz; }
    if (!this.story && this.pos.distanceTo(p.pos) > 155) this.removeMe = true;
    // un-stick: if pinched between buildings while trying to walk, relocate to the sidewalk
    if (moving) {
      const md = Math.hypot(this.pos.x - (this._px != null ? this._px : this.pos.x), this.pos.z - (this._pz != null ? this._pz : this.pos.z));
      this.stuckT = md < sp * dt * 0.2 ? (this.stuckT || 0) + dt : 0;
      if (this.stuckT > 2.5) { const s2 = this.game.city.snapSidewalk(this.pos.x, this.pos.z); const [rx, rz] = this.game.city.collide(s2[0], s2[1], 0.55); this.pos.set(rx, 0, rz); this.stuckT = 0; this.errandPt = null; this.errandWait = null; }
    }
    this._px = this.pos.x; this._pz = this.pos.z;
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    this.fig.update(dt, { state: moving ? (sp > 5 ? 'run' : 'walk') : 'idle' });
  }
}

// ---------------------------------------------------------------------------
// Car
// ---------------------------------------------------------------------------
class Car {
  constructor(game, x, z, dir, color, aiTraffic, kind) {
    this.game = game; this.pos = new THREE.Vector3(x, 0, z); this.speed = 0; this.driver = null; this.ai = true; this.aiTraffic = !!aiTraffic; this.turnCd = 1.5; this.kind = kind || null; this.color = color;
    this.taxi = aiTraffic && !kind && (Math.random() < 0.22 || game._forceTaxi); if (this.taxi) { color = 0xffd23a; this.color = color; }
    this.maxSpd = kind === 'sports' ? 50 : kind === 'monster' ? 30 : 36; this.accel = kind === 'sports' ? 36 : kind === 'monster' ? 20 : 24;
    this.dir = Math.abs(dir.x) > Math.abs(dir.z) ? { x: Math.sign(dir.x) || 1, z: 0 } : { x: 0, z: Math.sign(dir.z) || 1 };
    this.yaw = Math.atan2(this.dir.x, this.dir.z);
    this.root = kind ? buildSpecial(kind, color) : buildCar(color); if (this.taxi) this.root.add(taxiSign()); this.root.add(makeBlob(kind === 'monster' ? 2.2 : 1.7)); this.root.position.copy(this.pos); game.scene.add(this.root);
    const dv = this.root.userData.driver; if (dv) dv.visible = this.aiTraffic && !this.jacked;
  }
  repaint(color) {
    this.color = color; this.game.scene.remove(this.root);
    this.root = this.kind ? buildSpecial(this.kind, color) : buildCar(color); if (this.taxi) this.root.add(taxiSign()); this.root.add(makeBlob(this.kind === 'monster' ? 2.2 : 1.7));
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; this.game.scene.add(this.root);
    const dv = this.root.userData.driver; if (dv) dv.visible = this.aiTraffic && !this.jacked && !this.driver;
  }
  control(dt, inp) {
    this._ramCd = Math.max(0, (this._ramCd || 0) - dt);
    const acc = (inp.k('KeyW') ? 1 : 0) - (inp.k('KeyS') ? 1 : 0), steer = (inp.k('KeyA') ? 1 : 0) - (inp.k('KeyD') ? 1 : 0);
    const hb = inp.k('Space'); // handbrake = drift
    this.speed += acc * this.accel * dt; this.speed *= (hb ? 0.986 : 0.992); this.speed = clamp(this.speed, -14, this.maxSpd);
    if (Math.abs(this.speed) > 0.5) this.yaw += steer * (hb ? 2.9 : this.kind === 'sports' ? 2.0 : 1.7) * dt * (this.speed > 0 ? 1 : -1);
    // grip model: velocity chases the nose; with the handbrake down it lags behind = sideways
    this.vx = this.vx || 0; this.vz = this.vz || 0;
    const hx = Math.sin(this.yaw) * this.speed, hz = Math.cos(this.yaw) * this.speed, k = Math.min(1, (hb ? 1.8 : 8.5) * dt);
    this.vx += (hx - this.vx) * k; this.vz += (hz - this.vz) * k;
    const nx = this.pos.x + this.vx * dt, nz = this.pos.z + this.vz * dt;
    let [cx2, cz2] = this.game.city.collide(nx, nz, 1.4);
    if (cx2 !== nx || cz2 !== nz) { this.speed *= -0.2; this.vx *= -0.2; this.vz *= -0.2; }
    // fender-benders are real: your car shoves other cars, other cars stop you
    for (const o of this.game.cars) {
      if (o === this || o.boat) continue; const dx2 = cx2 - o.pos.x, dz2 = cz2 - o.pos.z, dd = Math.hypot(dx2, dz2);
      if (dd < 3.6 && dd > 0.01) {
        const push = (3.6 - dd), ux = dx2 / dd, uz = dz2 / dd;
        cx2 += ux * push * 0.6; cz2 += uz * push * 0.6;
        if (o.ai || o.aiTraffic) { o.pos.x -= ux * push * 0.4; o.pos.z -= uz * push * 0.4; o.speed *= 0.3; o.root.position.copy(o.pos); }
        const hit = Math.hypot(this.vx, this.vz);
        if (hit > 6 && (this._ramCd || 0) <= 0) { this._ramCd = 0.4; this.game.hitFx(o.pos.clone().setY(1), 0xffe27a, 6); if (o.fleeing) { o._rams = (o._rams || 0) + 1; if (o._rams >= 2) { o.fleeing = false; o.ai = false; o.speed = 0; o.cruise = 0; this.game.hitFx(o.pos.clone().setY(1), 0xff5a3a, 14); } } }
        this.speed *= 0.55; this.vx *= 0.45; this.vz *= 0.45;
      }
    }
    this.pos.x = cx2; this.pos.z = cz2; this.pos.y = this.game.city.groundH(this.pos.x, this.pos.z);
    for (const w of (this.root.userData.wheels || [])) w.rotation.x += Math.hypot(this.vx, this.vz) * Math.sign(this.speed || 1) * dt / 0.45;
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    this.root.rotation.z = hb ? clamp((this.vx * Math.cos(this.yaw) - this.vz * Math.sin(this.yaw)) * 0.012, -0.09, 0.09) : 0; // body lean in the slide
    const vmag = Math.hypot(this.vx, this.vz), rr = this.kind === 'monster' ? 3.4 : 2.4;
    if (vmag > 7) for (const n of this.game.npcs) { if (!n.dead && n.pos.distanceTo(this.pos) < rr) { n.damage(40); if (!n.cop) this.game.reportCrime(this.pos, 2, { quiet: true }); } }
  }
  update(dt) {
    if (this.driver) { this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; return; }
    if (!this.ai) { if (this.pos.distanceTo(this.game.player.pos) > 260) this.removeMe = true; return; } // parked/stolen cars stay put
    const g = this.game, c = g.city, p = g.player;
    if (this.pos.distanceTo(p.pos) > 185) { g.scene.remove(this.root); g.cars = g.cars.filter(x => x !== this); g.spawnTraffic(); return; }
    this.turnCd -= dt;
    // defensive driving: scan ahead (further at speed) and brake to a queue for cars, walkers, wrecks
    const scan = 8 + this.speed * 0.6; // base > the ~6m queue spacing so a stopped car stays detected even at rest (no creep-and-crawl)
    let blocked = false, nearGap = 99; // gap to the closest thing directly ahead
    for (const o of g.cars) { if (o === this || o.boat) continue; const ahead = (o.pos.x - this.pos.x) * this.dir.x + (o.pos.z - this.pos.z) * this.dir.z; const lat = Math.abs((o.pos.x - this.pos.x) * this.dir.z - (o.pos.z - this.pos.z) * this.dir.x); if (ahead > 0 && lat < 2.4 && ahead < scan) { blocked = true; nearGap = Math.min(nearGap, ahead); } }
    { const ahead = (p.pos.x - this.pos.x) * this.dir.x + (p.pos.z - this.pos.z) * this.dir.z, lat = Math.abs((p.pos.x - this.pos.x) * this.dir.z - (p.pos.z - this.pos.z) * this.dir.x); if (!p.inCar && ahead > 0 && lat < 2 && ahead < scan) { blocked = true; nearGap = Math.min(nearGap, ahead); } }
    for (const n of g.npcs) { if (n.dead || n.knockT > 0) continue; const ahead = (n.pos.x - this.pos.x) * this.dir.x + (n.pos.z - this.pos.z) * this.dir.z, lat = Math.abs((n.pos.x - this.pos.x) * this.dir.z - (n.pos.z - this.pos.z) * this.dir.x); if (ahead > 0 && lat < 1.8 && ahead < scan) { blocked = true; nearGap = Math.min(nearGap, ahead); } }
    this.speed = lerp(this.speed, blocked ? 0 : (this.cruise || 13), dt * (blocked ? 9 : 2));
    if (blocked && nearGap < 6) this.speed = 0; // hard stop before the bumper ahead — never overlap
    this.root.rotation.x = clamp(((this._lastSpd || 0) - this.speed) * 0.05, -0.05, 0.09); this._lastSpd = this.speed; // nose dips under braking
    for (const w of (this.root.userData.wheels || [])) w.rotation.x += this.speed * dt / 0.45;
    if (this.speed < 0.4 && blocked) { this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; return; } // sitting in the queue
    const lane = c.road / 4;
    // a fleeing target picks turns that widen the gap from the player
    if (this.fleeing && Math.abs((this.dir.z !== 0 ? this.pos.z : this.pos.x) - c.gridLine(this.dir.z !== 0 ? this.pos.z : this.pos.x)) < 3 && this.turnCd <= 0) {
      this.turnCd = 1.2; const l = { x: this.dir.z, z: -this.dir.x }, r = { x: -this.dir.z, z: this.dir.x };
      const dpx = this.pos.x - p.pos.x, dpz = this.pos.z - p.pos.z;
      const scoreL = l.x * dpx + l.z * dpz, scoreR = r.x * dpx + r.z * dpz, scoreS = this.dir.x * dpx + this.dir.z * dpz;
      const best = Math.max(scoreL, scoreR, scoreS);
      if (this.dir.z !== 0) this.pos.z = c.gridLine(this.pos.z); else this.pos.x = c.gridLine(this.pos.x);
      this.dir = best === scoreL ? l : best === scoreR ? r : this.dir;
    }
    // advance along the current cardinal direction
    this.pos.x += this.dir.x * this.speed * dt; this.pos.z += this.dir.z * this.speed * dt;
    // stay glued to the road lane on the perpendicular axis
    if (this.dir.z !== 0) { const tx = c.gridLine(this.pos.x) + this.dir.z * lane; this.pos.x = lerp(this.pos.x, tx, Math.min(1, dt * 3)); }
    else { const tz = c.gridLine(this.pos.z) - this.dir.x * lane; this.pos.z = lerp(this.pos.z, tz, Math.min(1, dt * 3)); }
    // turn (or go straight) at intersections
    const along = this.dir.z !== 0 ? this.pos.z : this.pos.x;
    if (!blocked && Math.abs(along - c.gridLine(along)) < 2.4 && this.turnCd <= 0) {
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
// Boat — drivable on the bay and the ocean (F to board, even mid-swim).
// ---------------------------------------------------------------------------
function buildBoat(color) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 6.2), mat(color)); hull.position.y = 0.45; hull.castShadow = true; g.add(hull);
  const bow = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 1.35, 2.2, 4), mat(color)); bow.rotation.x = -Math.PI / 2; bow.rotation.y = Math.PI / 4; bow.position.set(0, 0.45, -4.1); g.add(bow);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.14, 3.4), mat(0xe8dcc0)); deck.position.set(0, 0.95, 0.6); g.add(deck);
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.5), mat(0xffffff)); dash.position.set(0, 1.25, -1.2); g.add(dash);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.08), mat(0x0e1826)); glass.position.set(0, 1.7, -1.35); glass.rotation.x = -0.3; g.add(glass);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.9), mat(0xc0392b)); seat.position.set(0, 1.1, 0.6); g.add(seat);
  const motor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.6), mat(0x22262e)); motor.position.set(0, 0.9, 3.2); g.add(motor);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.16, 5.4), mat(0xffffff)); stripe.position.set(0, 0.72, 0.2); g.add(stripe);
  return g;
}
class Boat {
  constructor(game, x, z, color) {
    this.game = game; this.pos = new THREE.Vector3(x, 0, z); this.yaw = rnd(TAU); this.speed = 0; this.driver = null; this.ai = false; this.boat = true; this.aiTraffic = false;
    this.root = buildBoat(color || pick([0xf0f0f4, 0x2f6fd4, 0xd23b3b, 0x18b0b0])); this.root.position.copy(this.pos); game.scene.add(this.root);
  }
  control(dt, inp) {
    const acc = (inp.k('KeyW') ? 1 : 0) - (inp.k('KeyS') ? 1 : 0), steer = (inp.k('KeyA') ? 1 : 0) - (inp.k('KeyD') ? 1 : 0);
    this.speed += acc * 14 * dt; this.speed *= 0.99; this.speed = clamp(this.speed, -8, 26);
    if (Math.abs(this.speed) > 0.4) this.yaw += steer * 1.15 * dt * (this.speed > 0 ? 1 : -1);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw), nx = this.pos.x + fx * this.speed * dt, nz = this.pos.z + fz * this.speed * dt;
    const c = this.game.city, ok = c.inBay(nx, nz) || c.isWater(nx, nz); // bay, coasts and open ocean are all navigable
    if (ok) { this.pos.x = nx; this.pos.z = nz; } else this.speed *= -0.25;
    this._sync();
  }
  update(dt) { this._sync(); }
  _sync() { const t = this.game.time; this.root.position.set(this.pos.x, 0.06 + Math.sin(t * 1.7 + this.pos.x) * 0.05, this.pos.z); this.root.rotation.y = this.yaw; this.root.rotation.x = Math.sin(t * 1.4) * 0.02; }
}

// ---------------------------------------------------------------------------
// Police cruiser — dispatched at 3+ stars; sirens flashing, rams your bumper.
// ---------------------------------------------------------------------------
class PoliceCar extends Car {
  constructor(game, x, z) {
    super(game, x, z, new THREE.Vector3(0, 0, 1), 0xf0f0f4, false);
    this.police = true; this.copCd = 0;
    const dv = this.root.userData.driver; if (dv) { dv.visible = true; dv.children[0].material = mat(0x21407a); dv.children[2].material = mat(0x11203f); dv.children[3].material = mat(0x21407a); } // uniformed officer at the wheel
    const hood = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.2, 1.6), mat(0x14161b)); hood.position.set(0, 0.87, -1.5); this.root.add(hood);
    const doorL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 1.4), mat(0x14161b)); doorL.position.set(-1.02, 0.66, -0.1); this.root.add(doorL);
    const doorR = doorL.clone(); doorR.position.x = 1.02; this.root.add(doorR);
    this.lightR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.34), mat(0xff2a3a, { emissive: 0xff2030, emissiveIntensity: 2.5 })); this.lightR.position.set(-0.25, 1.62, -0.15); this.root.add(this.lightR);
    this.lightB = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.34), mat(0x2a6aff, { emissive: 0x2050ff, emissiveIntensity: 2.5 })); this.lightB.position.set(0.25, 1.62, -0.15); this.root.add(this.lightB);
  }
  update(dt) {
    if (this.driver) { this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; return; }
    const g = this.game, p = g.player, t = g.time;
    this.lightR.material.emissiveIntensity = Math.sin(t * 14) > 0 ? 3.2 : 0.2;
    this.lightB.material.emissiveIntensity = Math.sin(t * 14) > 0 ? 0.2 : 3.2;
    if (p.wanted <= 0 || this.pos.distanceTo(p.pos) > 220) { this.removeMe = true; this.root.visible = false; return; }
    // road-aware pursuit: run the grid toward you, lunge straight when close
    const c = g.city, dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, dist = Math.hypot(dx, dz);
    const onV = c._distToGrid(this.pos.x) < c.road / 2, onH = c._distToGrid(this.pos.z) < c.road / 2;
    let tx, tz;
    if (dist < 26) { tx = p.pos.x; tz = p.pos.z; }
    else if (!onV && !onH) { const gx = c.gridLine(this.pos.x), gz = c.gridLine(this.pos.z); if (Math.abs(gx - this.pos.x) < Math.abs(gz - this.pos.z)) { tx = gx; tz = this.pos.z + Math.sign(dz || 1) * 6; } else { tz = gz; tx = this.pos.x + Math.sign(dx || 1) * 6; } }
    else if (Math.abs(dx) > Math.abs(dz)) { if (onH) { tx = this.pos.x + Math.sign(dx) * 12; tz = c.gridLine(this.pos.z); } else { tx = this.pos.x; tz = this.pos.z + Math.sign(dz || 1) * 12; } }
    else { if (onV) { tz = this.pos.z + Math.sign(dz) * 12; tx = c.gridLine(this.pos.x); } else { tz = this.pos.z; tx = this.pos.x + Math.sign(dx || 1) * 12; } }
    this.yaw = lerpAngle(this.yaw, Math.atan2(tx - this.pos.x, tz - this.pos.z), Math.min(1, dt * 3.6));
    this.speed = lerp(this.speed, dist > 10 ? 17 : 6, dt * 2);
    this._move(dt);
    this.copCd = Math.max(0, this.copCd - dt);
    if (dist < 9 && this.copCd <= 0) { this.copCd = 7; let cops = 0; for (const n of g.npcs) if (n.cop && !n.dead) cops++; if (cops < 8) { for (let i = 0; i < 2; i++) g.npcs.push(new Ped(g, this.pos.x + rnd(-2, 2), this.pos.z + rnd(-2, 2), true)); } }
  }
}

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------
class Story {
  constructor(game) { this.game = game; this.mi = -1; this.state = 'idle'; this.marker = null; this.giver = null; this.targets = null; }
  begin() {
    this.chars = {}; const c = this.game.city, P = c.places;
    this.spawnChar('tony', P.tonyDiner.x + 8, P.tonyDiner.z + c.lot / 2 - 4, 0x7a4fb0);   // outside his diner, Little Havana
    this.spawnChar('sal', P.salGarage.x, P.salGarage.z + c.lot / 2 - 4, 0xc8a23a);        // the docklands garage
    this.spawnChar('dezzy', P.dezzyClub.x, P.dezzyClub.z + c.lot / 2 - 4, 0xff5aa0);      // her club on Ocean Drive
    this.marker = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 95, 14), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.28, depthWrite: false }));
    this.marker.visible = false; this.game.scene.add(this.marker);
    const sv = this.game.saveData; if (sv && sv.ch > 0) this.mi = Math.min(sv.ch, MISSIONS.length) - 1; // resume saved chapter
    if (this.freeRoam) { this.state = 'done'; this.setChapter(null); this.setObjective('Free roam — P phone · F cars · E shops'); setTimeout(() => { if (this.freeRoam) this.setObjective(''); }, 14000); return; }
    this.next();
  }
  spawnChar(id, x, z, shirt) { const p = new Ped(this.game, x, z, false); p.persona.shirt = shirt; p.story = true; p.timer = 1e9; p.wander = null; this.game.npcs.push(p); this.chars[id] = p; return p; }
  next() { this.mi++; this.game.saveGame(); const m = MISSIONS[this.mi]; if (!m) { this.state = 'done'; this.setObjective(''); this.setChapter(null); this.game.ui.bigCard('YOU RUN THIS TOWN', 'Free roam — Neon Bay is yours.'); return; } this.state = 'goMeet'; this._setupMeet(m); }
  setChapter(m) { const R = ['I', 'II', 'III']; if (this.game.ui.el.chapter) this.game.ui.el.chapter.textContent = m ? ('ACT ' + R[(m.act || 1) - 1] + ' · CH ' + (this.mi + 1) + '/' + MISSIONS.length + ' · ' + (m.title || '')) : 'THE BAY IS YOURS'; }
  _setupMeet(m) {
    this.setChapter(m);
    if (m.act && m.act !== this._act) { this._act = m.act; this.game.ui.bigCard('ACT ' + ['I', 'II', 'III'][m.act - 1], ACT_TITLES[m.act - 1]); }
    const g = this.chars[m.giver]; this.giver = g; if (g) { this.marker.position.set(g.pos.x, 48, g.pos.z); this.marker.visible = true; this.marker.material.color.set(0xffd23a); } this.setObjective('Go see ' + CHARS[m.giver].name + (m.where ? ' — ' + m.where : ''));
  }
  cleanupStep() {
    if (this.pickupMesh) { this.game.scene.remove(this.pickupMesh); this.pickupMesh = null; }
    if (this.chaseCar && !this.chaseCar.removeMe) { this.chaseCar.fleeing = false; } this.chaseCar = null;
    if (this.ally && !this.ally._keep) { this.ally.removeMe = true; } this.ally = null;
    this._armed = null; this._photoT = 0;
  }
  startStep() {
    const m = MISSIONS[this.mi], s = m.steps[this.si]; this.targets = null;
    if (s.at) { const wp = this.wp(s.at); this.marker.position.set(wp.x, 48, wp.z); this.marker.visible = true; this.marker.material.color.set(s.type === 'kill' || s.type === 'chase' ? 0xff5a5a : s.type === 'protect' ? 0x4dff9e : s.type === 'photo' ? 0x2fe6ff : 0xffd23a); this.stepPos = wp; } else { this.marker.visible = false; this.stepPos = null; }
    if (s.type === 'kill') { this.targets = []; for (let i = 0; i < (s.count || 1); i++) { const t = new Ped(this.game, this.stepPos.x + rnd(-4, 4), this.stepPos.z + rnd(-4, 4), false); t.persona.shirt = 0x882222; t.hp = 50; t.story = true; t.enemy = true; this.game.npcs.push(t); this.targets.push(t); } }
    else if (s.type === 'chase') { const car = new Car(this.game, this.stepPos.x, this.stepPos.z, new THREE.Vector3(0, 0, 1), 0x1a1a22, true); car.fleeing = true; car.cruise = 30; car.maxSpd = 40; car._rams = 0; car.taxi = false; const dv = car.root.userData.driver; if (dv) { dv.visible = true; dv.children[0].material = mat(0x882222); } this.game.cars.push(car); this.chaseCar = car; }
    else if (s.type === 'pickup') { const pk = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.3), mat(s.color || 0xffd23a, { emissive: s.color || 0xd4a92f, emissiveIntensity: 1.3 })); pk.position.set(this.stepPos.x, 1.2, this.stepPos.z); this.game.scene.add(pk); this.pickupMesh = pk; }
    else if (s.type === 'protect') { const a = new Ped(this.game, this.stepPos.x, this.stepPos.z, false); a.persona.shirt = 0x2f8f6a; a.hp = 70; a.story = true; a.ally = true; this.game.npcs.push(a); this.ally = a; this.targets = []; for (let i = 0; i < (s.count || 3); i++) { const t = new Ped(this.game, this.stepPos.x + rnd(-8, 8), this.stepPos.z + rnd(-8, 8), false); t.persona.shirt = 0x882222; t.hp = 45; t.story = true; t.enemy = true; t.attackAlly = a; this.game.npcs.push(t); this.targets.push(t); } }
    this._stepT0 = this.game.time; this._photoT = 0;
    this.setObjective(s.text);
  }
  wp(at) { if (at.char) { const ch = this.chars[at.char]; return new THREE.Vector3(ch.pos.x, 0, ch.pos.z); } if (at.place) { const p = this.game.city.places[at.place]; return new THREE.Vector3(p.x, 0, p.z); } return new THREE.Vector3(at.x, 0, at.z); }
  failStep(why) { this.game.ui.bigCard('MISSION FAILED', why || ''); this.game.ui.toast('Restarting from checkpoint...'); this.cleanupStep(); setTimeout(() => { if (this.state === 'steps') this.startStep(); }, 1800); this._failing = true; setTimeout(() => this._failing = false, 1900); }
  update(dt) {
    if (this.state === 'cutscene' || this.state === 'done' || this.state === 'idle') return;
    const g = this.game, p = g.player, m = MISSIONS[this.mi];
    if (!m) return;
    if (this.state === 'goMeet') { if (this.giver && p.pos.distanceTo(this.giver.pos) < 4.5) { this.game.ui.bigCard('CHAPTER ' + (this.mi + 1), m.title || ''); this.play(m.before, this.giver, () => { this.si = 0; if (m.steps && m.steps.length) { this.state = 'steps'; this.startStep(); } else this.finish(); }); } this._objDist(this.giver && this.giver.pos); return; }
    if (this.state === 'steps') {
      const s = m.steps[this.si]; if (!s || this._failing) return; let done = false;
      // per-step timer (soft fail → restart the step)
      if (s.limit) { const left = Math.ceil(s.limit - (this.game.time - this._stepT0)); if (left <= 0) { this.failStep('Out of time'); return; } this._stepTimeLeft = left; }
      if (s.type === 'goto') done = this.stepPos && dist2(p.pos, this.stepPos) < 5;
      else if (s.type === 'getcar') done = !!p.inCar && (!s.boat || p.inCar.boat) && (!s.needBoat || p.inCar.boat);
      else if (s.type === 'drive') done = p.inCar && this.stepPos && dist2(p.pos, this.stepPos) < 7;
      else if (s.type === 'evade') { if (this._armed == null) { this._armed = true; if (s.wanted) g.addWanted(s.wanted); } done = p.wanted <= 0; }
      else if (s.type === 'rob') done = (g.lastBankRobT || 0) > (this._stepT0 || 1e18);
      else if (s.type === 'kill') done = this.targets && this.targets.every(t => t.dead);
      else if (s.type === 'chase') { const c = this.chaseCar; if (c) { if (c.dead || c._rams >= 2 || (c.hp != null && c.hp <= 0)) done = true; } else done = true; }
      else if (s.type === 'pickup') { if (this.pickupMesh) { this.pickupMesh.rotation.y += dt * 2; this.pickupMesh.position.y = 1.2 + Math.sin(this.game.time * 2.5) * 0.12; } done = this.stepPos && dist2(p.pos, this.stepPos) < 2.6; }
      else if (s.type === 'photo') { const near = this.stepPos && dist2(p.pos, this.stepPos) < 12; if (near && g.input.p('KeyE')) { this._photoT = 1; g.ui.flashPhoto && g.ui.flashPhoto(); g.ui.toast('📷 Snapshot taken'); } done = this._photoT > 0; }
      else if (s.type === 'protect') { if (this.ally && this.ally.dead) { this.failStep('Your contact was killed'); return; } done = this.targets && this.targets.every(t => t.dead); }
      // live objective text (distance / counters / timer)
      let label = s.text;
      if (s.type === 'kill' && this.targets) label = s.text + '  (' + this.targets.filter(t => t.dead).length + '/' + this.targets.length + ')';
      else if (s.type === 'protect' && this.targets) label = s.text + '  (' + this.targets.filter(t => t.dead).length + '/' + this.targets.length + ')';
      else if (s.type === 'photo' && this.stepPos && dist2(p.pos, this.stepPos) < 12) label = s.text + '  — press E';
      if (s.limit && this._stepTimeLeft != null) label += '  ⏱ ' + this._stepTimeLeft + 's';
      this.setObjective(label);
      if ((s.type === 'goto' || s.type === 'drive' || s.type === 'pickup' || s.type === 'chase') && this.stepPos) this._objDist(this.stepPos);
      if (done) { this.cleanupStep(); this.si++; if (m.steps[this.si]) this.startStep(); else this.finish(); }
    }
  }
  finish() { const m = MISSIONS[this.mi]; this.cleanupStep(); this.play(m.after, this.giver, () => { this.game.player.money += m.reward || 0; if (m.gun) { this.game.player.hasGun = true; this.game.player.weapon = 'pistol'; this.game.ui.toast('★ Pistol acquired — Left-click to fire, 1/2 to switch'); } this.game.ui.bigCard('MISSION PASSED', (m.reward ? '+$' + m.reward : '')); this.game.ui.news(m.news || ('Witnesses report a new name moving through the Bay after "' + (m.title || '').toLowerCase() + '" rumors — NBPD declines to comment')); this.marker.visible = false; setTimeout(() => this.next(), 2600); }); }
  play(lines, who, done) { this.state = 'cutscene'; this.marker.visible = false; this.game.startCutscene(who); this.game.ui.dialogue(lines || [], () => { this.game.endCutscene(); this.state = 'steps'; done && done(); }); }
  _objDist(v) { if (!v) return; const d = Math.round(this.game.player.pos.distanceTo(v)); const base = this._lastObj || ''; this.game.ui.el.obj.textContent = base.replace(/\s+\d+m.*/, '') + '   ' + d + 'm →'; }
  setObjective(t) { this._lastObj = t; this.game.ui.el.obj.textContent = t; }
}
function dist2(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
const CHARS = { tony: { name: 'Tony Marenco', col: '#7fd0ff' }, sal: { name: 'Sal Greco', col: '#ffd23a' }, dezzy: { name: 'Dezzy Vale', col: '#ff7eb0' }, victor: { name: 'Victor Salcido', col: '#ff5a5a' }, you: { name: 'You', col: '#c39bff' } };
const ACT_TITLES = ['FRESH OFF THE PLANE', 'THE COST OF DOING BUSINESS', 'KING TIDE'];
// ---- Neon Bay: three acts, twelve chapters — chases, stakeouts, escorts, heists, a boat raid, a finale ----
const MISSIONS = [
  { act: 1, giver: 'tony', reward: 200, title: 'TOUCHDOWN', where: "his diner in Little Havana",
    before: [['you', "Tony. Ten years, and you still greet family like you owe them money."], ['tony', "Because I do, cuz. I'm into Victor Salcido for fifty grand and the man doesn't do payment plans."], ['tony', "Welcome to Neon Bay. Havana's home. The beach across the bay is where the money struts and the trouble tans."], ['you', "Family's family. Point me at the trouble."], ['tony', "Sal first. Docklands garage, south side. He turns hot cars into cold cash — and he'll size you up."]],
    steps: [], after: [['tony', "Go on. Sal's expecting Tony's famous cousin. Try not to disappoint him in the first minute."]] },
  { act: 1, giver: 'sal', reward: 500, title: "SAL'S CUT", gun: true, where: 'the docklands garage',
    before: [['sal', "So you're the cousin. Tony talks big, owes bigger — runs in the blood, I hear."], ['sal', "Prove your hands are worth feeding. Lift any ride, bring it to my bay. No scratches, no blues on your tail."], ['you', "One clean car, coming up."]],
    steps: [{ type: 'getcar', text: 'Steal any car — walk up and press F' }, { type: 'drive', text: "Deliver it clean to Sal's garage", at: { char: 'sal' }, limit: 90 }],
    after: [['sal', "Smooth. Barely a fingerprint on it. Here's your cut — and a little insurance."], ['sal', "A piece. This town bites; you bite back. Left-click fires, 1 holsters, 2 draws."]] },
  { act: 1, giver: 'tony', reward: 900, title: 'HOT WHEELS', where: 'Little Havana',
    before: [['tony', "One of Victor's bagmen is skipping town with a list of everyone who owes him — my name's on it, top of the page."], ['tony', "He's in a black coupe running the Havana blocks. Get a car and run him off the road before he reaches the causeway."], ['you', "He won't make the bridge."]],
    steps: [{ type: 'getcar', text: 'Grab a car for the chase' }, { type: 'chase', text: "Ram the bagman's black coupe until it's wrecked", at: { place: 'tonyDiner' } }, { type: 'evade', text: 'Ditch the wreck and lose any heat', wanted: 2 }],
    after: [['tony', "You drive like you were born running from something. The list burns, my name with it. For now."], ['tony', "Every job you pull chips at what I owe. Family pays family's debts — then we bury the collector."]] },
  { act: 2, giver: 'dezzy', reward: 1200, title: 'THE VELVET ROOM', where: 'her club on Ocean Drive',
    before: [['dezzy', "So you're the Havana boy they're whispering about. Dezzy Vale — my club, my rules, my ruined Friday."], ['dezzy', "Salcido's goons showed up early to 'tax' me and started breaking my people instead of my bottles."], ['you', "Stay behind me."], ['dezzy', "Charming AND useful. Keep me breathing and clear them out."]],
    steps: [{ type: 'protect', text: "Keep Dezzy alive — drop Salcido's crew", count: 3, at: { char: 'dezzy' } }],
    after: [['dezzy', "First quiet night in a year. Stick around, hotshot — Ocean Drive could use a new landlord."]] },
  { act: 2, giver: 'sal', reward: 1400, title: 'STAKEOUT', where: 'the docklands garage',
    before: [['sal', "Before we hit Victor we need to know his moves. His lieutenants meet on the north strip at dusk."], ['sal', "Get close, get pictures — quiet. Phone camera. You get spotted, they scatter and we're blind."], ['you', "Point, shoot, gone."]],
    steps: [{ type: 'goto', text: 'Get to the north strip', at: { place: 'strip' } }, { type: 'photo', text: 'Photograph the meeting — E when close', at: { place: 'strip' } }],
    after: [['sal', "Reyes, the accountant, two shooters. That's the whole rotten table. Now we know where to push."]] },
  { act: 2, giver: 'tony', reward: 1800, title: 'DOCK MONEY', where: 'Little Havana',
    before: [['tony', "Victor's cash sails out of the container yards every night. Hit the runners, take the bag."], ['tony', "It's not about the money — it's the message. The Bay isn't his anymore."]],
    steps: [{ type: 'kill', text: "Take out Victor's runners at the docks", count: 4, at: { place: 'docks' } }, { type: 'pickup', text: 'Grab the cash bag they dropped', at: { place: 'docks' }, color: 0x3ae08a }, { type: 'evade', text: 'Get the bag clear of the docks', wanted: 2 }],
    after: [['tony', "Ha! That'll sting him where he feels it. He's gonna come looking — be somewhere loud when he does."]] },
  { act: 2, giver: 'dezzy', reward: 2200, title: 'BAD BLOOD', where: 'Ocean Drive',
    before: [['dezzy', "They grabbed Tony outside the diner. He's alive — shaken, not sliced — but the message landed."], ['dezzy', "Reyes runs the north strip for Victor. Cut the head off and the crew loses its nerve."]],
    steps: [{ type: 'kill', text: 'Take down Reyes and his guards', count: 3, at: { place: 'strip' } }, { type: 'evade', text: 'Get clear before the heat lands', wanted: 3, limit: 75 }],
    after: [['dezzy', "War declared, first battle won. Victor won't send men next time. He'll come himself."]] },
  { act: 2, giver: 'sal', reward: 2600, title: 'WITHDRAWAL', where: 'the docklands garage',
    before: [['sal', "Victor launders his street money through Bay Mutual — a counter box under a shell name."], ['sal', "Walk in flashing that piece and empty the drawers. His whole month goes up in smoke."], ['you', "A withdrawal. My favorite kind of banking."]],
    steps: [{ type: 'goto', text: 'Get to Bay Mutual downtown', at: { place: 'bank' } }, { type: 'rob', text: 'Rob the counter — E inside with your pistol drawn', at: { place: 'bank' } }, { type: 'evade', text: 'Lose the heat before it sticks', wanted: 0, limit: 90 }],
    after: [['sal', "Beautiful. Victor's crews don't get paid this week — and unpaid muscle stops being muscle."], ['sal', "Tony's debt? Interest's frozen. The principal dies with Victor."]],
    news: 'Bay Mutual raided in daylight heist — NBPD reviewing how the alarm took eleven minutes' },
  { act: 3, giver: 'dezzy', reward: 3200, title: 'THE LEDGER', where: 'her club on Ocean Drive',
    before: [['dezzy', "Victor keeps a paper ledger on Isla Privada — his island east of the beach. Every bribe, every badge he owns."], ['dezzy', "Take a boat from Bayside Marina or the east sand. Bring me that book and his police protection evaporates."], ['you', "A pleasure cruise. Back before the ice melts."]],
    steps: [{ type: 'getcar', text: 'Get a boat — F at Bayside Marina or the east shore', needBoat: true }, { type: 'goto', text: 'Cross to Isla Privada', at: { place: 'privado' } }, { type: 'pickup', text: 'Take the ledger from the villa', at: { place: 'privado' }, color: 0xffd23a }, { type: 'goto', text: 'Bring the ledger back to Dezzy', at: { char: 'dezzy' } }],
    after: [['dezzy', "Names, dates, badge numbers. He's naked now — no bought cops left to hide behind."], ['dezzy', "Whatever comes next, it's a fair fight. Make it count."]],
    news: 'LEAKED LEDGER rocks NBPD — a dozen officers suspended over Salcido payroll allegations' },
  { act: 3, giver: 'sal', reward: 3600, title: 'STARFISH SITDOWN', where: 'the docklands garage',
    before: [['sal', "Victor wants a peace sit-down on Starfish Island. Old money, gated, one way in."], ['sal', "It's a trap, obviously. So walk in ready. His crew won't wait for handshakes."], ['you', "Neither will I."]],
    steps: [{ type: 'goto', text: 'Cross to Starfish Island', at: { place: 'starfish' } }, { type: 'kill', text: 'Fight through the ambush', count: 5, at: { place: 'starfish' } }, { type: 'evade', text: 'Escape Starfish before backup lands', wanted: 3 }],
    after: [['sal', "You walked into his trap and walked out over his men. He's out of moves — and out of friends."]] },
  { act: 3, giver: 'tony', reward: 4000, title: 'THE SETUP', where: 'Little Havana',
    before: [['tony', "Victor's cornered. He's massing what's left on the north causeway — water on both sides, nowhere to run."], ['tony', "Sal stashed a fast car for you. Get to the waterfront and we end this tonight."]],
    steps: [{ type: 'getcar', text: 'Grab wheels for the run' }, { type: 'drive', text: 'Drive to the bay waterfront', at: { place: 'waterfront' }, limit: 80 }],
    after: [['tony', "He's here. Whole crew. Everything you flew in for, kid — it's tonight."]] },
  { act: 3, giver: 'tony', reward: 10000, title: 'KING TIDE', where: 'Little Havana',
    before: [['tony', "Victor makes his stand on the north causeway. This is the one, cuz."], ['you', "Then let's finish what he started."], ['tony', "For the family. For the Bay."]],
    steps: [{ type: 'kill', text: "Wipe out Victor's guard", count: 4, at: { place: 'finale' } }, { type: 'kill', text: 'Finish Victor Salcido', count: 1, at: { place: 'finale' } }],
    after: [['dezzy', "It's over. Ocean Drive to the docklands — the Bay's ours now."], ['tony', "King of Neon Bay. Debt paid in full. Nobody's paved it with gold yet... give the man a week."]] },
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
      <div id="topright"><div id="money">$200</div><div id="wanted"></div><div id="clock"></div></div>
      <div id="gps"></div>
      <div id="district"></div>
      <div id="hp"><div id="hpfill"></div></div>
      <div id="weapon">Pistol</div>
      <div id="chapter"></div>
      <div id="obj"></div>
      <div id="toast"></div>
      <div id="dialogue" class="hidden"><div id="dspk"></div><div id="dtext"></div><div id="dhint">click / Space ▸</div></div>
      <div id="bigcard" class="hidden"><div class="bc1"></div><div class="bc2"></div></div>
      <div id="news" class="hidden"><span id="newstag">NB-24 NEWS</span><span id="newstxt"></span></div>
      <div id="introcap"></div>
      <div id="introskip" class="hidden">Space ▸ continue &nbsp;·&nbsp; Esc ▸ skip</div>
      <div id="crosshair"></div>
      <div id="overlay" class="hidden"></div>`;
    document.body.appendChild(r); this.root = r;
    this.el = { map: r.querySelector('#map').getContext('2d'), mapc: r.querySelector('#map'), money: r.querySelector('#money'), wanted: r.querySelector('#wanted'), clock: r.querySelector('#clock'), gps: r.querySelector('#gps'), district: r.querySelector('#district'), hp: r.querySelector('#hpfill'), obj: r.querySelector('#obj'), chapter: r.querySelector('#chapter'), toast: r.querySelector('#toast'), introcap: r.querySelector('#introcap'), introskip: r.querySelector('#introskip'), news: r.querySelector('#news'), newstxt: r.querySelector('#newstxt'), dialogue: r.querySelector('#dialogue'), dspk: r.querySelector('#dspk'), dtext: r.querySelector('#dtext'), big: r.querySelector('#bigcard'), weapon: r.querySelector('#weapon'), overlay: r.querySelector('#overlay'), lbTop: r.querySelector('#lbTop'), lbBot: r.querySelector('#lbBot') };
    r.querySelector('#dialogue').addEventListener('mousedown', () => this._advance());
    addEventListener('keydown', e => { if ((e.code === 'Space' || e.code === 'Enter') && this._dlg) { e.preventDefault(); this._advance(); } });
  }
  title() {
    this.modal = 'title'; this.el.overlay.className = 'menu';
    const sv = this.game.saveData, cont = sv && sv.ch > 0 ? `<button id="cont" class="bigbtn">CONTINUE — CH.${Math.min(sv.ch + 1, 8)}</button>` : '';
    this.el.overlay.innerHTML = `<div class="menuwrap"><div class="logo"><span class="l1">NEON</span><span class="l2">BAY</span></div><div class="tag">VICE • SUN • CHROME</div>${cont}<button id="play" class="bigbtn${cont ? ' ghost' : ''}">${cont ? 'NEW GAME' : 'START STORY'}</button><button id="free" class="bigbtn ghost">FREE ROAM</button><div class="ctrls"><span><b>WASD</b> move</span><span><b>Shift</b> sprint</span><span><b>Click</b> punch/shoot</span><span><b>1/2</b> holster/draw</span><span><b>E</b> use/rob/eat</span><span><b>B</b> buy</span><span><b>F</b> car</span><span><b>Space</b> jump / handbrake</span><span><b>P</b> phone</span></div><div class="note">An island city with a story — or pure free roam. Suburbs, beach, AMMU-BAY gun counter, Bay Mutual bank, county jail (escapable), day/night shifts with clerks who clock in and out, witnesses, tazers, drift physics. Your house is in the northwest 'burbs. Runs offline.</div></div>`;
    this.el.overlay.querySelector('#play').onclick = () => { this.modal = null; try { localStorage.removeItem('nb_save'); } catch (e) {} this.game.saveData = null; this.game.intro(); };
    this.el.overlay.querySelector('#free').onclick = () => { this.modal = null; this.game.startFreeRoam(); };
    const cb = this.el.overlay.querySelector('#cont'); if (cb) cb.onclick = () => { this.modal = null; this.game.start(); };
  }
  hideTitle() { this.el.overlay.className = 'hidden'; }
  pauseMenu(on) { if (on) { this.modal = 'pause'; this.el.overlay.className = 'menu'; this.el.overlay.innerHTML = `<div class="menuwrap"><div class="logo small"><span class="l1">PAUSED</span></div><button id="res" class="bigbtn">RESUME</button><button id="rl" class="bigbtn ghost">QUIT TO TITLE</button></div>`; this.el.overlay.querySelector('#res').onclick = () => this.game.resume(); this.el.overlay.querySelector('#rl').onclick = () => location.reload(); } else { this.modal = null; this.el.overlay.className = 'hidden'; } }
  bustedOrDead(word) { this.modal = 'dead'; this.game.input.unlock(); this.el.overlay.className = 'menu dead'; this.el.overlay.innerHTML = `<div class="menuwrap"><div class="logo small"><span class="wasted">${word}</span></div><button id="res" class="bigbtn">RESPAWN</button></div>`; this.el.overlay.querySelector('#res').onclick = () => location.reload(); }
  closeModal() { if (this.modal === 'pause') this.game.resume(); else if (this.modal === 'phone') this.phone(false); }
  // ---- your phone: clock, cash, GPS pins, cab dispatch ----
  phone(on) {
    if (!on) { this.modal = null; this.el.overlay.className = 'hidden'; this.el.overlay.innerHTML = ''; if (this.game.playing && !this.game.paused) this.game.input.lock(); return; }
    const g = this.game, p = g.player, hr = g.hour || 0, hh = ('' + (hr | 0)).padStart(2, '0'), mm = ('' + ((hr % 1) * 60 | 0)).padStart(2, '0');
    this.modal = 'phone'; g.input.unlock(); this.el.overlay.className = 'phone';
    const APPS = [['home', '🏠 Home'], ['gunshop', '🔫 Ammu-Bay'], ['motormax', '🚗 MotorMax'], ['bank', '🏦 Bay Mutual'], ['tonyDiner', "🍽 Tony's"], ['beach', '🌴 The Beach'], ['marina', '⚓ Marina'], ['privado', '🏝 Isla Privada']];
    this.el.overlay.innerHTML = `<div class="phoneui"><div class="pnotch"></div><div class="ptime">${hh}:${mm}</div><div class="pstat">$${p.money | 0} · ${p.wanted > 0 ? '★'.repeat(p.wanted) + ' heat' : 'no heat'}${g.jailed ? ' · JAILED' : ''}</div><div class="plabel">GPS PINS</div><div class="papps">${APPS.map(a => `<button data-gps="${a[0]}">${a[1]}</button>`).join('')}</div><button id="ptaxi" class="pwide">🚕 Call a cab — $50</button><button id="pclear" class="pwide pghost">✕ Clear GPS</button><div class="phint">P / ESC — pocket the phone</div></div>`;
    for (const b of this.el.overlay.querySelectorAll('[data-gps]')) b.onclick = () => { const pt2 = g.city.places[b.getAttribute('data-gps')]; if (pt2) { g.setGps(b.textContent.slice(2).trim(), pt2); this.toast('GPS set — follow the cyan beam'); } this.phone(false); };
    this.el.overlay.querySelector('#pclear').onclick = () => { g.clearGps(); this.phone(false); };
    this.el.overlay.querySelector('#ptaxi').onclick = () => {
      if (p.money < 50) { this.toast('Cab: you need $50'); return; }
      p.money -= 50; const c = g.city, gx = c.gridLine(p.pos.x) - c.road / 4, tz = clamp(p.pos.z + 8, -c.size / 2, c.size / 2);
      g._forceTaxi = true; const cab = new Car(g, gx, tz, new THREE.Vector3(0, 0, -1), 0xffd23a, true); g._forceTaxi = false; cab.speed = 0; g.cars.push(cab);
      this.toast('Cab dispatched — yellow ride on the nearest avenue (E to ride)'); this.phone(false);
    };
  }
  letterbox(on) { this.el.lbTop.style.height = on ? '11vh' : '0'; this.el.lbBot.style.height = on ? '11vh' : '0'; }
  introText(lines) { const el = this.el.introcap; el.innerHTML = lines.map(l => '<div>' + l + '</div>').join(''); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
  introHide() { this.el.introcap.classList.remove('show'); this.el.introcap.innerHTML = ''; }
  introSkip(on) { this.el.introskip.classList.toggle('hidden', !on); }
  flash() { document.body.classList.add('hurt'); clearTimeout(this._ht); this._ht = setTimeout(() => document.body.classList.remove('hurt'), 160); }
  flashPhoto() { document.body.classList.add('snap'); clearTimeout(this._st); this._st = setTimeout(() => document.body.classList.remove('snap'), 200); }
  toast(t) { this.el.toast.textContent = t; this.el.toast.style.opacity = 1; clearTimeout(this._tt); this._tt = setTimeout(() => this.el.toast.style.opacity = 0, 1200); }
  news(t) { this.el.newstxt.textContent = t; this.el.news.classList.remove('hidden'); this.el.news.classList.add('on'); clearTimeout(this._nt); this._nt = setTimeout(() => { this.el.news.classList.remove('on'); this.el.news.classList.add('hidden'); }, 7000); }
  bigCard(a, b) { this.el.big.classList.remove('hidden'); this.el.big.querySelector('.bc1').textContent = a; this.el.big.querySelector('.bc2').textContent = b || ''; clearTimeout(this._bt); this._bt = setTimeout(() => this.el.big.classList.add('hidden'), 3800); }
  dialogue(lines, done) { this._dlg = { lines, i: 0, done }; this.modal = 'dlg'; this.game.input.unlock(); this.el.dialogue.classList.remove('hidden'); this._showLine(); }
  _showLine() { const d = this._dlg, l = d.lines[d.i]; if (!l) return; const ch = CHARS[l[0]] || { name: l[0], col: '#fff' }; this.el.dspk.textContent = ch.name; this.el.dspk.style.color = ch.col; this.el.dtext.textContent = l[1]; }
  _advance() { const d = this._dlg; if (!d) return; d.i++; if (d.i >= d.lines.length) { this.el.dialogue.classList.add('hidden'); this._dlg = null; this.modal = null; if (this.game.playing && !this.game.paused) this.game.input.lock(); d.done && d.done(); } else this._showLine(); }
  update() {
    const p = this.game.player, g = this.game; this.el.money.textContent = '$' + (p.money | 0); this.el.wanted.textContent = p.wanted > 0 ? '★'.repeat(p.wanted) : '';
    const hr = g.hour || 0; this.el.clock.textContent = ('' + (hr | 0)).padStart(2, '0') + ':' + ('' + ((hr % 1) * 60 | 0)).padStart(2, '0') + (hr >= 6 && hr < 19 ? ' ☀' : ' ☾');
    this.el.gps.textContent = g.gps ? '➤ ' + g.gps.name + ' — ' + Math.round(Math.hypot(p.pos.x - g.gps.x, p.pos.z - g.gps.z)) + 'm' : '';
    const dist = g.city.districtAt(p.pos.x, p.pos.z); if (dist !== this._lastDistrict) { this._lastDistrict = dist; const el = this.el.district; el.textContent = dist; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
    this.el.hp.style.width = clamp(p.health, 0, 100) + '%'; this.el.weapon.textContent = p.inCar ? '' : (p.weapon === 'pistol' && p.hasGun ? 'Pistol' : 'Fists');
    document.getElementById('crosshair').style.display = (!p.inCar && this.game.input.mR) ? 'block' : 'none'; this.minimap();
  }
  minimap() {
    const g = this.game, x = this.el.map, S = 190, sc = 0.42; x.clearRect(0, 0, S, S);
    x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); x.clip(); x.fillStyle = '#160f24'; x.fillRect(0, 0, S, S);
    const px = g.player.pos.x, pz = g.player.pos.z, c = g.city, half = c.size / 2;
    x.fillStyle = '#1d4066'; // bay + ocean water
    x.fillRect(S / 2 + (c.bayX0 - px) * sc, 0, (c.bayX1 - c.bayX0) * sc, S);
    x.fillRect(S / 2 + (half + 12 - px) * sc, 0, S, S);
    x.strokeStyle = '#3a2f4d'; x.lineWidth = c.road * sc;
    for (let i = 0; i <= c.n; i++) { const gx = -half + i * c.cell, sx = S / 2 + (gx - px) * sc, sz = S / 2 + (gx - pz) * sc; x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx, S); x.stroke(); x.beginPath(); x.moveTo(0, sz); x.lineTo(S, sz); x.stroke(); }
    x.fillStyle = '#dfe6ef'; for (const car of g.cars) { const sx = S / 2 + (car.pos.x - px) * sc, sz = S / 2 + (car.pos.z - pz) * sc; x.fillRect(sx - 1.5, sz - 1.5, 3, 3); }
    for (const n of g.npcs) { if (n.dead) continue; x.fillStyle = n.cop ? '#5b8cff' : (n.story ? '#ffd23a' : '#5fe07f'); const sx = S / 2 + (n.pos.x - px) * sc, sz = S / 2 + (n.pos.z - pz) * sc; x.fillRect(sx - 1.5, sz - 1.5, 3, 3); }
    const pois = [[c.places.home, '#5fe07f'], [c.places.gunshop, '#ff9a3a'], [c.places.bank, '#ffd23a'], [c.places.motormax, '#2fe6ff'], [c.places.jail, '#9fb6c8']];
    for (const [pt2, col2] of pois) { const sx = S / 2 + (pt2.x - px) * sc, sz = S / 2 + (pt2.z - pz) * sc; if (sx < 8 || sx > S - 8 || sz < 8 || sz > S - 8) continue; x.fillStyle = col2; x.fillRect(sx - 2, sz - 2, 4, 4); }
    if (g.gps) { const sx = clamp(S / 2 + (g.gps.x - px) * sc, 8, S - 8), sz = clamp(S / 2 + (g.gps.z - pz) * sc, 8, S - 8); x.strokeStyle = '#2fe6ff'; x.lineWidth = 2; x.beginPath(); x.arc(sx, sz, 5, 0, TAU); x.stroke(); }
    if (g.story.marker && g.story.marker.visible) { const m = g.story.marker.position; let sx = clamp(S / 2 + (m.x - px) * sc, 8, S - 8), sz = clamp(S / 2 + (m.z - pz) * sc, 8, S - 8); x.fillStyle = '#ffcf3a'; x.beginPath(); x.arc(sx, sz, 4, 0, TAU); x.fill(); }
    x.translate(S / 2, S / 2); x.rotate(-g.player.camYaw); x.fillStyle = '#c39bff'; x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 6); x.lineTo(-5, 6); x.closePath(); x.fill(); x.restore();
    x.strokeStyle = 'rgba(180,120,255,0.5)'; x.lineWidth = 3; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); x.stroke();
  }
}

function boot() { try { new Game(); const b = document.getElementById('boot'); if (b) b.style.display = 'none'; } catch (e) { const b = document.getElementById('boot'); if (b) { b.style.display = 'block'; b.style.color = '#f88'; b.textContent = 'Error: ' + e.message; } console.error(e); } }
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
