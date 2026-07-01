// ============================================================================
//  NEON BAY — a third-person open-world action game (original, GTA-inspired).
//  Dusk neon city on Three.js: custom HDR bloom, gradient sky, lit windows,
//  streetlights, enterable storefronts, a living streaming crowd + traffic.
//  Optional CC0 glTF humans load online at runtime; rich procedural fallbacks
//  render everywhere so it always looks good and always runs.
// ============================================================================
import * as THREE from 'three';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const pick = a => a[(Math.random() * a.length) | 0];
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Optional community models (CC0 / public domain) — loaded online at runtime.
// Soldier.glb is a rigged humanoid with Idle/Walk/Run clips; Robot is a backup.
// Procedural figures render until (and if) a model arrives, so it never blocks.
// ---------------------------------------------------------------------------
const ASSETS = { ready: {} };
const CHAR_URLS = [
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/Soldier.glb',
  'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
];
async function loadModels() {
  let GLTFLoader, SkeletonUtils;
  try {
    ({ GLTFLoader } = await import(window.__GLTF_URL__));
    SkeletonUtils = await import(window.__SK_URL__);
  } catch (e) { console.warn('[models] loaders unavailable:', e && e.message); return; }
  ASSETS.SkeletonUtils = SkeletonUtils;
  const loader = new GLTFLoader();
  const urls = (window.__MODEL_CHAR__ ? [window.__MODEL_CHAR__] : []).concat(CHAR_URLS);
  const tryNext = (i) => {
    if (i >= urls.length) { console.warn('[models] no character GLB reachable; using built-in figures.'); return; }
    loader.load(urls[i], (gltf) => {
      const box = new THREE.Box3().setFromObject(gltf.scene), sz = new THREE.Vector3(); box.getSize(sz);
      gltf.userData.scale = 1.85 / (sz.y || 1.85); gltf.userData.minY = box.min.y;
      ASSETS.char = gltf; ASSETS.ready.char = true;
      if (window.GAME) window.GAME.onCharModel();
      window.__GAME_ASSETS_READY__ = true;
    }, undefined, () => tryNext(i + 1));
  };
  tryNext(0);
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
  lock() { this.canvas.requestPointerLock && this.canvas.requestPointerLock(); }
  unlock() { document.exitPointerLock && document.exitPointerLock(); }
  end() { this.pressed.clear(); this.mLe = false; this.mdx = 0; this.mdy = 0; this.wheel = 0; }
}

// ---------------------------------------------------------------------------
// Procedural textures (canvas) — building facades, glowing windows, asphalt.
// ---------------------------------------------------------------------------
function facadeTextures(baseHex, palette) {
  // returns { map, emissive } — color facade + a glowing-windows emissive map
  const W = 128, H = 128;
  const cc = document.createElement('canvas'); cc.width = W; cc.height = H; const x = cc.getContext('2d');
  const ec = document.createElement('canvas'); ec.width = W; ec.height = H; const e = ec.getContext('2d');
  x.fillStyle = baseHex; x.fillRect(0, 0, W, H);
  // subtle vertical concrete shading
  const grad = x.createLinearGradient(0, 0, W, 0); grad.addColorStop(0, 'rgba(0,0,0,0.18)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.05)'); grad.addColorStop(1, 'rgba(0,0,0,0.18)');
  x.fillStyle = grad; x.fillRect(0, 0, W, H);
  e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  const cols = 6, rows = 7, mx = 10, my = 12;
  const gw = (W - mx * 2) / cols, gh = (H - my * 2) / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const wx = mx + c * gw + 2, wy = my + r * gh + 2, ww = gw - 6, wh = gh - 7;
    // frame
    x.fillStyle = 'rgba(20,26,40,0.85)'; x.fillRect(wx - 1, wy - 1, ww + 2, wh + 2);
    const lit = Math.random() < 0.55;
    const glass = lit ? pick(palette) : 'rgba(26,34,52,0.95)';
    x.fillStyle = glass; x.fillRect(wx, wy, ww, wh);
    x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(wx, wy, ww, Math.max(2, wh * 0.25));
    if (lit) { e.fillStyle = pick(palette); e.fillRect(wx, wy, ww, wh); }
  }
  const map = new THREE.CanvasTexture(cc); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.colorSpace = THREE.SRGBColorSpace;
  const emissive = new THREE.CanvasTexture(ec); emissive.wrapS = emissive.wrapT = THREE.RepeatWrapping; emissive.colorSpace = THREE.SRGBColorSpace;
  return { map, emissive };
}
function noiseTexture(r, g, b, amt) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const d = x.createImageData(64, 64);
  for (let i = 0; i < 64 * 64; i++) { const v = (Math.random() - 0.5) * amt; d.data[i * 4] = r + v; d.data[i * 4 + 1] = g + v; d.data[i * 4 + 2] = b + v; d.data[i * 4 + 3] = 255; }
  x.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
let _blobTex = null;
function blobTexture() {
  if (_blobTex) return _blobTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); _blobTex = new THREE.CanvasTexture(c); return _blobTex;
}
function makeBlob(r) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.04; m.renderOrder = 1; return m;
}

// ---------------------------------------------------------------------------
// HDR bloom post pipeline (self-contained). Scene -> HDR target -> bright pass
// -> separable gaussian (ping-pong) -> composite (ACES + bloom + vignette).
// Falls back to a plain tone-mapped render if float targets aren't available.
// ---------------------------------------------------------------------------
const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
class Post {
  constructor(renderer, scene, camera) {
    this.renderer = renderer; this.scene = scene; this.camera = camera; this.enabled = true;
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
        s += texture2D(tDiffuse, vUv + dir*1.0).rgb * 0.1945946; s += texture2D(tDiffuse, vUv - dir*1.0).rgb * 0.1945946;
        s += texture2D(tDiffuse, vUv + dir*2.0).rgb * 0.1216216; s += texture2D(tDiffuse, vUv - dir*2.0).rgb * 0.1216216;
        s += texture2D(tDiffuse, vUv + dir*3.0).rgb * 0.054054;  s += texture2D(tDiffuse, vUv - dir*3.0).rgb * 0.054054;
        gl_FragColor = vec4(s, 1.0); }` });
    this.compMat = new THREE.ShaderMaterial({ uniforms: { tScene: { value: null }, tBloom: { value: null }, strength: { value: 0.85 }, exposure: { value: 1.42 } }, vertexShader: VERT, fragmentShader: `
      uniform sampler2D tScene; uniform sampler2D tBloom; uniform float strength; uniform float exposure; varying vec2 vUv;
      vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
      void main(){ vec3 col = texture2D(tScene, vUv).rgb + texture2D(tBloom, vUv).rgb * strength;
        col *= exposure; col = aces(col);
        vec2 q = vUv - 0.5; float vig = smoothstep(0.95, 0.30, length(q)); col *= mix(0.72, 1.0, vig);
        col = mix(col, col * vec3(1.04, 0.99, 1.07), 0.45); // gentle neon grade
        col = pow(col, vec3(1.0/2.2)); gl_FragColor = vec4(col, 1.0); }` });
    try { this._alloc(); } catch (e) { console.warn('[post] disabled:', e && e.message); this.enabled = false; }
  }
  _alloc() {
    const pr = this.renderer.getPixelRatio(); this.W = Math.max(2, Math.floor(innerWidth * pr)); this.H = Math.max(2, Math.floor(innerHeight * pr));
    const hw = Math.max(1, this.W >> 1), hh = Math.max(1, this.H >> 1); this.hw = hw; this.hh = hh;
    const opt = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter };
    this.sceneRT = new THREE.WebGLRenderTarget(this.W, this.H, Object.assign({ samples: 4 }, opt));
    this.rtA = new THREE.WebGLRenderTarget(hw, hh, opt);
    this.rtB = new THREE.WebGLRenderTarget(hw, hh, opt);
  }
  setSize() { if (!this.enabled) return; this.sceneRT.dispose(); this.rtA.dispose(); this.rtB.dispose(); this._alloc(); }
  _pass(mat, target) { this.quad.material = mat; this.renderer.setRenderTarget(target); this.renderer.clear(); this.renderer.render(this.fsScene, this.fsCam); }
  render() {
    const r = this.renderer;
    if (!this.enabled) { r.setRenderTarget(null); r.render(this.scene, this.camera); return; }
    r.setRenderTarget(this.sceneRT); r.clear(); r.render(this.scene, this.camera);
    this.brightMat.uniforms.tDiffuse.value = this.sceneRT.texture; this._pass(this.brightMat, this.rtA);
    let read = this.rtA, write = this.rtB;
    for (const radius of [1, 2, 3.5]) {
      this.blurMat.uniforms.tDiffuse.value = read.texture; this.blurMat.uniforms.dir.value.set(radius / this.hw, 0); this._pass(this.blurMat, write);
      let t = read; read = write; write = t;
      this.blurMat.uniforms.tDiffuse.value = read.texture; this.blurMat.uniforms.dir.value.set(0, radius / this.hh); this._pass(this.blurMat, write);
      t = read; read = write; write = t;
    }
    this.compMat.uniforms.tScene.value = this.sceneRT.texture; this.compMat.uniforms.tBloom.value = read.texture;
    this.quad.material = this.compMat; r.setRenderTarget(null); r.render(this.fsScene, this.fsCam);
  }
}

// ---------------------------------------------------------------------------
// Sky — gradient dusk dome (not affected by fog), follows the camera.
// ---------------------------------------------------------------------------
function makeSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { top: { value: new THREE.Color(0x1a1640) }, mid: { value: new THREE.Color(0xff8a5e) }, hor: { value: new THREE.Color(0xffd39a) }, bot: { value: new THREE.Color(0x2a1838) } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 hor; uniform vec3 bot; varying vec3 vDir;
      void main(){ float h = vDir.y;
        vec3 c; if (h > 0.0) { float t = pow(clamp(h,0.0,1.0), 0.55); c = mix(mix(hor, mid, smoothstep(0.0,0.18,h)), top, t); }
        else { c = mix(hor, bot, pow(clamp(-h,0.0,1.0), 0.5)); }
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), mat); m.renderOrder = -1; m.frustumCulled = false; return m;
}

// ---------------------------------------------------------------------------
// City — grid roads, glowing-window towers, enterable storefronts, parks,
// streetlights, neon signs, seaside. Collision is AABB vs solid boxes.
// ---------------------------------------------------------------------------
const FACADES = [0x8a93a8, 0x9c8aa6, 0xb0a48f, 0x7f95a0, 0xa88f8f, 0x8f9c8a, 0xc7b9b0, 0x6f7a90];
const NEONS = [0xff3d9a, 0x2fe6ff, 0xffe24a, 0x9b5cff, 0x4dff9e, 0xff7a3d];
const WINDOW_PALETTE = ['#ffd9a0', '#ffe7c0', '#bfe4ff', '#ffc08a', '#e8d6ff'];
class City {
  constructor(scene) {
    this.scene = scene; this.boxes = []; this.shops = []; this.size = 0;
    this.group = new THREE.Group(); scene.add(this.group);
    this.build();
  }
  build() {
    const N = 7, LOT = 44, ROAD = 16, CELL = LOT + ROAD;
    const span = N * CELL; this.size = span; this.cell = CELL; this.lot = LOT; this.road = ROAD; this.n = N;
    const half = span / 2;
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(span + 600, span + 600), new THREE.MeshStandardMaterial({ map: noiseTexture(70, 98, 70, 22), roughness: 1 }));
    grass.material.map.repeat.set(90, 90); grass.rotation.x = -Math.PI / 2; grass.position.y = -0.02; grass.receiveShadow = true; this.group.add(grass);

    const roadMat = new THREE.MeshStandardMaterial({ map: noiseTexture(52, 54, 66, 14), emissive: 0x0c0d16, emissiveIntensity: 1, roughness: 0.5, metalness: 0.35 });
    roadMat.map.repeat.set(2, 44);
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xffe14a, emissive: 0xffd23a, emissiveIntensity: 1.1, roughness: 0.6 });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x6b7079, roughness: 0.95 });
    for (let i = 0; i <= N; i++) {
      const rc = -half + i * CELL;
      this._road(rc, 0, ROAD, span + ROAD, roadMat, lineMat, true);
      this._road(0, rc, span + ROAD, ROAD, roadMat, lineMat, false);
    }
    let seed = 90210;
    const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let ix = 0; ix < N; ix++) for (let iz = 0; iz < N; iz++) {
      const cx = -half + ix * CELL + ROAD + LOT / 2, cz = -half + iz * CELL + ROAD + LOT / 2;
      const sw = new THREE.Mesh(new THREE.BoxGeometry(LOT + ROAD, 0.3, LOT + ROAD), sideMat); sw.position.set(cx, 0.1, cz); sw.receiveShadow = true; this.group.add(sw);
      const r = rng();
      if (r < 0.14) { this._park(cx, cz, LOT, rng); continue; }
      if (r < 0.40) { this._shop(cx, cz, LOT, rng); continue; }
      const sub = r < 0.72 ? 1 : 2;
      for (let s = 0; s < sub; s++) {
        const w = (LOT - 6) / sub - 5, d = LOT - 14;
        const bx = cx + (sub === 1 ? 0 : (s === 0 ? -1 : 1) * (LOT / 4 - 1)), bz = cz;
        const h = 16 + rng() * 64; const col = FACADES[(rng() * FACADES.length) | 0];
        this._tower(bx, bz, w, d, h, col, rng);
      }
    }
    // streetlights at intersections
    for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) this._lamp(-half + i * CELL + ROAD / 2, -half + j * CELL + ROAD / 2);
    // seaside
    const water = new THREE.Mesh(new THREE.PlaneGeometry(span + 800, 360), new THREE.MeshStandardMaterial({ color: 0x10314f, emissive: 0x14243a, emissiveIntensity: 0.5, transparent: true, opacity: 0.92, roughness: 0.12, metalness: 0.7 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.06, half + 260); this.group.add(water); this.water = water;
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(span + 800, 150), new THREE.MeshStandardMaterial({ color: 0xd8c594, roughness: 1 }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.03, half + 80); this.group.add(sand);
    for (let i = 0; i < 9; i++) this.palm(rnd(-half + 20, half - 20), half + 40 + rnd(0, 24));
  }
  _road(x, z, w, d, roadMat, lineMat, vertical) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), roadMat); r.position.set(x, 0.07, z); r.receiveShadow = true; this.group.add(r);
    // dashed center line
    const len = vertical ? d : w; const dash = 3, gap = 4; const n = Math.floor(len / (dash + gap));
    for (let i = 0; i < n; i++) {
      const o = -len / 2 + i * (dash + gap) + dash / 2;
      const seg = new THREE.Mesh(new THREE.BoxGeometry(vertical ? 0.4 : dash, 0.02, vertical ? dash : 0.4), lineMat);
      seg.position.set(vertical ? x : x + o, 0.17, vertical ? z + o : z); this.group.add(seg);
    }
  }
  _tower(x, z, w, d, h, color, rng) {
    const baseHex = '#' + color.toString(16).padStart(6, '0');
    const { map, emissive } = facadeTextures(baseHex, WINDOW_PALETTE);
    const rep = [Math.max(1, Math.round(w / 7)), Math.max(2, Math.round(h / 7))];
    [map, emissive].forEach(t => t.repeat.set(rep[0], rep[1]));
    const sideMat = () => { const m = new THREE.MeshStandardMaterial({ map: map.clone(), emissiveMap: emissive.clone(), emissive: 0xffffff, emissiveIntensity: 1.25, roughness: 0.62, metalness: 0.1 }); m.map.repeat.set(rep[0], rep[1]); m.emissiveMap.repeat.set(rep[0], rep[1]); return m; };
    const topMat = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
    const mats = [sideMat(), sideMat(), topMat, topMat, sideMat(), sideMat()];
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats); m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true; this.group.add(m);
    // roof detail
    const tank = new THREE.Mesh(new THREE.BoxGeometry(w * 0.3, 2.4, d * 0.3), new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.9 })); tank.position.set(x + rnd(-w * 0.2, w * 0.2), h + 1.2, z + rnd(-d * 0.2, d * 0.2)); tank.castShadow = true; this.group.add(tank);
    // big vertical neon sign on a tall building
    if (h > 34 && rng() < 0.7) {
      const nc = pick(NEONS); const sh = Math.min(h * 0.5, 18);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, sh, 0.5), new THREE.MeshStandardMaterial({ color: nc, emissive: nc, emissiveIntensity: 2.3, roughness: 0.4 }));
      sign.position.set(x + (rng() < .5 ? -1 : 1) * (w / 2 + 0.4), h * 0.55, z + d / 2 + 0.3); this.group.add(sign);
    } else if (rng() < 0.6) {
      const nc = pick(NEONS);
      const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.6, 1.6, 0.5), new THREE.MeshStandardMaterial({ color: nc, emissive: nc, emissiveIntensity: 2.0, roughness: 0.4 }));
      sign.position.set(x, 5 + rng() * (h - 9), z + d / 2 + 0.35); this.group.add(sign);
    }
    this.boxes.push({ x, z, hw: w / 2 + 0.3, hd: d / 2 + 0.3 });
  }
  _shop(cx, cz, LOT, rng) {
    // open-front storefront facing +Z (toward a road), with a lit walkable interior.
    const w = LOT - 12, d = LOT - 16, h = 5, t = 0.4;
    const accent = pick(NEONS);
    const wallMat = new THREE.MeshStandardMaterial({ color: pick(FACADES), roughness: 0.8 });
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2b2733, roughness: 0.85, metalness: 0.2 });
    const g = this.group;
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, d), floorMat); floor.position.set(cx, 0.18, cz); floor.receiveShadow = true; g.add(floor);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, t, d + 1), wallMat); roof.position.set(cx, h, cz); roof.castShadow = true; g.add(roof);
    const wall = (ww, dd, ox, oz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, h, dd), wallMat); m.position.set(cx + ox, h / 2, cz + oz); m.castShadow = true; m.receiveShadow = true; g.add(m); };
    wall(w, t, 0, -d / 2);        // back
    wall(t, d, -w / 2, 0);        // left
    wall(t, d, w / 2, 0);         // right
    // back wall solid boxes for collision (front open)
    this.boxes.push({ x: cx, z: cz - d / 2, hw: w / 2 + 0.3, hd: t / 2 + 0.3 });
    this.boxes.push({ x: cx - w / 2, z: cz, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    this.boxes.push({ x: cx + w / 2, z: cz, hw: t / 2 + 0.3, hd: d / 2 + 0.3 });
    // storefront pillars
    for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, h, 10), wallMat); p.position.set(cx + sx * (w / 2 - 0.6), h / 2, cz + d / 2 - 0.6); p.castShadow = true; g.add(p); this.boxes.push({ x: p.position.x, z: p.position.z, hw: 0.7, hd: 0.7 }); }
    // interior: counter, shelves, glowing ceiling panels, neon storefront sign
    const counter = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 1.1, 1.4), new THREE.MeshStandardMaterial({ color: 0x6b4a2e, roughness: 0.7 })); counter.position.set(cx, 0.85, cz - d * 0.18); counter.castShadow = true; g.add(counter);
    this.boxes.push({ x: cx, z: cz - d * 0.18, hw: w * 0.275 + 0.2, hd: 0.9 });
    for (const sx of [-1, 1]) { const sh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.4, d * 0.5), new THREE.MeshStandardMaterial({ color: 0x4a4550, roughness: 0.8 })); sh.position.set(cx + sx * (w / 2 - 1.2), 1.3, cz - d * 0.05); sh.castShadow = true; g.add(sh); }
    for (const ox of [-w * 0.22, w * 0.22]) { const panel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, 0.15, d * 0.55), new THREE.MeshStandardMaterial({ color: 0xfff2d8, emissive: 0xfff0d0, emissiveIntensity: 0.95 })); panel.position.set(cx + ox, h - 0.5, cz - d * 0.05); g.add(panel); }
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.8, 1.2, 0.4), new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: 2.2, roughness: 0.4 })); sign.position.set(cx, h + 0.8, cz + d / 2 + 0.2); g.add(sign);
    const light = new THREE.PointLight(0xffe6c0, 11, 20, 2); light.position.set(cx, h - 1, cz); g.add(light);
    this.shops.push({ x: cx, z: cz, w, d });
  }
  _park(cx, cz, LOT, rng) {
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(LOT, 0.35, LOT), new THREE.MeshStandardMaterial({ color: 0x3f7e44, roughness: 1 })); lawn.position.set(cx, 0.14, cz); lawn.receiveShadow = true; this.group.add(lawn);
    const n = 3 + (rng() * 3 | 0); for (let i = 0; i < n; i++) this.palm(cx + rnd(-LOT / 2 + 4, LOT / 2 - 4), cz + rnd(-LOT / 2 + 4, LOT / 2 - 4));
    // a glowing fountain
    const f = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 0.8, 16), new THREE.MeshStandardMaterial({ color: 0x8893a0, roughness: 0.8 })); f.position.set(cx, 0.5, cz); f.castShadow = true; this.group.add(f);
    const w = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.3, 16), new THREE.MeshStandardMaterial({ color: 0x2fe6ff, emissive: 0x2fe6ff, emissiveIntensity: 1.2, transparent: true, opacity: 0.9 })); w.position.set(cx, 0.85, cz); this.group.add(w);
  }
  palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.5, 6.5, 8), new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 1 })); trunk.position.y = 3.2; trunk.castShadow = true; g.add(trunk);
    for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.55, 4.2, 5), new THREE.MeshStandardMaterial({ color: 0x2f8f48, roughness: 1 })); f.position.set(Math.cos(i / 7 * TAU) * 1.7, 6.4, Math.sin(i / 7 * TAU) * 1.7); f.rotation.z = Math.cos(i / 7 * TAU) * 1.0; f.rotation.x = Math.sin(i / 7 * TAU) * 1.0; f.castShadow = true; g.add(f); }
    g.position.set(x, 0.2, z); this.group.add(g);
  }
  _lamp(x, z) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.7, metalness: 0.5 })); pole.position.y = 3; pole.castShadow = true; g.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.12), pole.material); arm.position.set(0.7, 5.9, 0); g.add(arm);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffd58a, emissiveIntensity: 3.4 })); head.position.set(1.4, 5.8, 0); g.add(head);
    g.position.set(x, 0, z); this.group.add(g);
  }
  collide(px, pz, radius) {
    for (const b of this.boxes) {
      const dx = px - b.x, dz = pz - b.z; const ex = b.hw + radius, ez = b.hd + radius;
      if (Math.abs(dx) < ex && Math.abs(dz) < ez) {
        const ox = ex - Math.abs(dx), oz = ez - Math.abs(dz);
        if (ox < oz) px = b.x + Math.sign(dx || 1) * ex; else pz = b.z + Math.sign(dz || 1) * ez;
      }
    }
    return [px, pz];
  }
  onRoad(x, z) {
    const half = this.size / 2; const lx = ((x + half) % this.cell + this.cell) % this.cell, lz = ((z + half) % this.cell + this.cell) % this.cell;
    return lx < this.road || lz < this.road;
  }
  // snap a point onto the nearest road's sidewalk band (keeps peds on footpaths)
  snapSidewalk(x, z) {
    const half = this.size / 2, side = this.road / 2 + 1.6;
    const gx = -half + Math.round((x + half) / this.cell) * this.cell;
    const gz = -half + Math.round((z + half) / this.cell) * this.cell;
    if (Math.abs(x - gx) < Math.abs(z - gz)) return [gx + (x >= gx ? side : -side), z];
    return [x, gz + (z >= gz ? side : -side)];
  }
}

// ---------------------------------------------------------------------------
// Procedural human (fallback) — believable proportioned adult, swinging gait.
// ---------------------------------------------------------------------------
const SKIN = [0xf2cfa6, 0xe7b58a, 0xc68642, 0x8d5524, 0xffe0bd, 0xa86a44];
const SHIRTS = [0x3f7cb4, 0xb44545, 0x4caf50, 0xcaa23a, 0x8e5cb4, 0x3a3f48, 0xd47ba0, 0x2a9d8f, 0xe8e3da, 0xe0683a];
const PANTS = [0x2c3242, 0x3a2e26, 0x4a4a52, 0x2a3b30, 0x554050, 0x222831];
const HAIR = [0x2b1d10, 0x111111, 0x6b4a2a, 0xc9a23a, 0x7a3a20, 0x4a4a4a];
function mat(c, opts) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85 }, opts || {})); }
function makeFigure(p) {
  const g = new THREE.Group(); const legs = [], arms = [];
  const skin = p.skin || pick(SKIN), shirt = p.shirt || pick(SHIRTS), pants = p.pants || pick(PANTS), hair = p.hair || pick(HAIR);
  const Sk = mat(skin, { roughness: 0.65 }), Sh = mat(shirt, { roughness: 0.75 }), Pa = mat(pants, { roughness: 0.85 }), Ha = mat(hair, { roughness: 0.9 }), Bo = mat(0x16161b, { roughness: 0.5 });
  const add = (geo, m, x, y, z, sx, sy, sz) => { const me = new THREE.Mesh(geo, m); me.position.set(x, y, z); if (sx !== undefined) me.scale.set(sx, sy, sz); g.add(me); return me; };
  add(new THREE.CapsuleGeometry(0.19, 0.14, 4, 10), Pa, 0, 0.96, 0);                 // hips
  add(new THREE.CylinderGeometry(0.19, 0.25, 0.62, 12), Sh, 0, 1.34, 0);            // torso
  add(new THREE.SphereGeometry(0.25, 12, 10), Sh, 0, 1.58, 0, 1, 0.62, 0.78);        // chest/shoulders
  add(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 8), Sk, 0, 1.72, 0);              // neck
  const head = add(new THREE.SphereGeometry(0.16, 16, 14), Sk, 0, 1.87, 0, 0.94, 1.06, 1); // head
  add(new THREE.SphereGeometry(0.172, 14, 12, 0, TAU, 0, 1.5), Ha, 0, 1.89, -0.005);// hair
  for (const sx of [-1, 1]) { // arms
    const gr = new THREE.Group(); gr.position.set(sx * 0.28, 1.56, 0);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.36, 4, 8), Sh); up.position.y = -0.22; gr.add(up);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), Sk); hand.position.y = -0.48; gr.add(hand);
    g.add(gr); arms.push(gr);
  }
  for (const sx of [-1, 1]) { // legs
    const gr = new THREE.Group(); gr.position.set(sx * 0.11, 0.94, 0);
    const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.4, 4, 8), Pa); th.position.y = -0.26; gr.add(th);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.3), Bo); shoe.position.set(0, -0.56, 0.05); gr.add(shoe);
    g.add(gr); legs.push(gr);
  }
  return { group: g, legs, arms, head, mixer: null };
}
function makeGltfFigure(p) {
  const gltf = ASSETS.char; const clone = ASSETS.SkeletonUtils.clone(gltf.scene);
  clone.scale.setScalar(gltf.userData.scale); clone.position.y = -gltf.userData.minY * gltf.userData.scale;
  const tint = new THREE.Color(p.shirt || pick(SHIRTS));
  clone.traverse(o => { if (o.isMesh) { o.castShadow = false; if (o.material) { o.material = o.material.clone(); if (o.material.color) o.material.color.lerp(tint, 0.18); } } });
  const grp = new THREE.Group(); grp.add(clone);
  const mixer = new THREE.AnimationMixer(clone); const by = {}; for (const a of gltf.animations) by[a.name] = a;
  const A = n => by[n] ? mixer.clipAction(by[n]) : null;
  const actions = { idle: A('Idle'), walk: A('Walk') || A('Walking'), run: A('Run') || A('Running') };
  if (actions.idle) actions.idle.play();
  return { group: grp, legs: [], arms: [], head: null, mixer, actions, gltf: true };
}
function buildPerson(p) { return (ASSETS.ready.char && ASSETS.char) ? makeGltfFigure(p) : makeFigure(p); }

// ---------------------------------------------------------------------------
// Car (procedural, lit) — beveled body, glass band, rims, glowing lights.
// ---------------------------------------------------------------------------
const CAR_COLORS = [0xb43b3b, 0x2f5fb4, 0x202329, 0xe6e6ea, 0x2f9e54, 0xc8a23a, 0x7a4fb0, 0xe87d2a, 0x14a0a0, 0xe04a7a];
function buildCar(color) {
  const g = new THREE.Group();
  const paint = mat(color, { metalness: 0.7, roughness: 0.28 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 4.5), paint); body.position.y = 0.6; body.castShadow = true; g.add(body);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 4.4), mat(0x14161b, { roughness: 0.8 })); skirt.position.y = 0.33; g.add(skirt);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.62, 2.3), paint); cabin.position.set(0, 1.12, -0.15); cabin.castShadow = true; g.add(cabin);
  const glassMat = mat(0x0c1018, { metalness: 0.5, roughness: 0.08 });
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.5, 2.34), glassMat); glass.position.set(0, 1.12, -0.15); g.add(glass);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 2.0), paint); cap.position.set(0, 1.44, -0.15); g.add(cap);
  for (const sz of [-1.5, 1.45]) for (const sx of [-1.0, 1.0]) {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.32, 16), mat(0x0c0d10, { roughness: 0.9 })); tire.rotation.z = Math.PI / 2; tire.position.set(sx, 0.44, sz); tire.castShadow = true; g.add(tire);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.34, 8), mat(0xbfc4cc, { metalness: 0.8, roughness: 0.3 })); rim.rotation.z = Math.PI / 2; rim.position.set(sx, 0.44, sz); g.add(rim);
  }
  const hl = mat(0xfff6d2, { emissive: 0xfff0b0, emissiveIntensity: 2.4 });
  for (const sx of [-0.65, 0.65]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.1), hl); l.position.set(sx, 0.72, -2.27); g.add(l); }
  const tl = mat(0xff2a2a, { emissive: 0xff1a1a, emissiveIntensity: 2.6 });
  for (const sx of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.18, 0.1), tl); l.position.set(sx, 0.74, 2.27); g.add(l); }
  return g;
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
class Game {
  constructor() {
    const canvas = document.getElementById('gl');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xc77a72, 130, 480);

    this.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
    this.camera.position.set(0, 60, 120);

    this.sky = makeSky(); this.scene.add(this.sky);
    this.hemi = new THREE.HemisphereLight(0xb59ce0, 0x4a3a3c, 1.15); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffc089, 2.5); this.sun.position.set(80, 60, 70); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048); const sc = this.sun.shadow.camera; sc.left = -80; sc.right = 80; sc.top = 80; sc.bottom = -80; sc.near = 1; sc.far = 420; this.sun.shadow.bias = -0.0006;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    this.fill = new THREE.DirectionalLight(0x7a86ff, 0.55); this.fill.position.set(-60, 40, -50); this.scene.add(this.fill);

    this.clock = new THREE.Clock(); this.time = 0; this.playing = false; this.paused = false; this.menuMode = true;
    this.input = new Input(canvas);
    this.city = new City(this.scene);
    this.post = new Post(this.renderer, this.scene, this.camera);
    if (!this.post.enabled) { this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05; }
    else this.renderer.toneMapping = THREE.NoToneMapping;
    this.ui = new UI(this);

    this.npcs = []; this.cars = []; this.fx = []; this.tracers = [];
    this.player = new Player(this);
    this.story = new Story(this);

    addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); this.post.setSize(); });
    canvas.addEventListener('mousedown', () => { if (this.playing && !this.paused && !this.ui.modal && !this.input.locked) this.input.lock(); });
    this.input.onLock = (l) => { if (!l && this.playing && !this.paused && !this.ui.modal) this.pause(); };

    window.GAME = this; loadModels();
    this.ui.title(); this.loop();
  }
  onCharModel() { for (const n of this.npcs) if (!n.dead && !n.gltf) n.upgrade(); if (this.player && !this.player.inCar) this.player.upgrade && this.player.upgrade(); }
  start() {
    this.playing = true; this.paused = false; this.menuMode = false; this.ui.modal = null; this.ui.hideTitle();
    this.player.root.visible = true;
    this.player.spawn();
    for (let i = 0; i < 46; i++) this.spawnPed();
    for (let i = 0; i < 22; i++) this.spawnTraffic();
    this.story.begin();
    this.input.lock();
  }
  spawnPed() { // stream pedestrians onto sidewalks in a ring around the player
    const c = this.city, a = rnd(TAU), r = rnd(22, 105);
    let x = this.player.pos.x + Math.cos(a) * r, z = this.player.pos.z + Math.sin(a) * r;
    [x, z] = c.snapSidewalk(x, z);
    const lim = c.size / 2 + 40; x = clamp(x, -lim, lim); z = clamp(z, -lim, lim);
    const n = new Ped(this, x, z); this.npcs.push(n); return n;
  }
  spawnTraffic() { // spawn cars on roads near the player so traffic is always in view
    const c = this.city, half = c.size / 2, px = this.player.pos.x, pz = this.player.pos.z;
    const vert = Math.random() < 0.5, lane = (Math.random() < 0.5 ? -1 : 1) * (c.road / 4);
    let x, z, dir;
    if (vert) { const gi = clamp(Math.round((px + half) / c.cell) + ((Math.random() * 5 | 0) - 2), 0, c.n); x = -half + gi * c.cell + lane; z = clamp(pz + rnd(-100, 100), -half, half); dir = new THREE.Vector3(0, 0, lane < 0 ? 1 : -1); }
    else { const gj = clamp(Math.round((pz + half) / c.cell) + ((Math.random() * 5 | 0) - 2), 0, c.n); z = -half + gj * c.cell + lane; x = clamp(px + rnd(-100, 100), -half, half); dir = new THREE.Vector3(lane < 0 ? 1 : -1, 0, 0); }
    const car = new Car(this, x, z, dir, pick(CAR_COLORS), true); this.cars.push(car); return car;
  }
  addTracer(a, b, color) { const geo = new THREE.BufferGeometry().setFromPoints([a, b]); const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true })); this.scene.add(line); this.tracers.push({ line, life: 0.06 }); }
  hitFx(pos, color, n = 12) {
    const g = new THREE.BufferGeometry(); const ps = new Float32Array(n * 3), vs = new Float32Array(n * 3);
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
    this.addTracer(origin.clone().addScaledVector(dir, 1.2), end, 0xffe98a);
    return victim;
  }
  pause() { if (!this.playing || this.paused) return; this.paused = true; this.input.unlock(); this.ui.pauseMenu(true); }
  resume() { this.paused = false; this.ui.pauseMenu(false); this.input.lock(); }
  menuCam(dt) {
    const t = this.time * 0.12; const r = 150; const c = this.city;
    this.camera.position.set(Math.cos(t) * r, 70 + Math.sin(t * 0.6) * 18, Math.sin(t) * r);
    this.camera.lookAt(0, 18, 0);
  }
  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.05); this.time += dt;
    if (this.menuMode) { this.menuCam(dt); }
    else if (this.playing) {
      if (this.input.p('Escape')) { if (this.ui.modal) this.ui.closeModal(); else if (this.paused) this.resume(); else this.pause(); }
      const frozen = this.paused || this.ui.modal;
      if (!frozen) {
        this.player.update(dt);
        for (const n of this.npcs) n.update(dt);
        for (const c of this.cars) c.update(dt);
        this.story.update(dt); this.updateWanted(dt); this.cull();
      }
      this.updateFx(dt);
      this.player.updateCamera(dt, frozen);
      this.ui.update();
    }
    if (this.player.pos) { this.sun.position.set(this.player.pos.x + 80, 90, this.player.pos.z + 70); this.sun.target.position.copy(this.player.pos); this.sun.target.updateMatrixWorld(); }
    this.sky.position.copy(this.camera.position);
    if (this.city.water) this.city.water.material.opacity = 0.9;
    this.post.render();
    this.input.end();
  }
  updateWanted(dt) { const p = this.player; if (p.heat > 0) { p.heat -= dt; if (p.heat <= 0) { p.wanted = Math.max(0, p.wanted - 1); p.heat = p.wanted > 0 ? 14 : 0; } } this.copT = (this.copT || 0) - dt; if (p.wanted > 0 && this.copT <= 0) { this.copT = 2.0; const want = Math.min(8, p.wanted * 2); let have = this.npcs.filter(n => n.cop && !n.dead).length; while (have < want) { const a = rnd(TAU), r = rnd(28, 44); const ped = new Ped(this, p.pos.x + Math.cos(a) * r, p.pos.z + Math.sin(a) * r, true); this.npcs.push(ped); have++; } } if (p.wanted === 0) for (const n of this.npcs) if (n.cop) n.removeMe = true; }
  updateFx(dt) {
    for (const t of this.tracers) { t.life -= dt; t.line.material.opacity = Math.max(0, t.life / 0.06); }
    this.tracers = this.tracers.filter(t => { if (t.life <= 0) { this.scene.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose(); return false; } return true; });
    for (const f of this.fx) { f.life -= dt; for (let i = 0; i < f.n; i++) { f.vs[i * 3 + 1] -= 12 * dt; f.ps[i * 3] += f.vs[i * 3] * dt; f.ps[i * 3 + 1] += f.vs[i * 3 + 1] * dt; f.ps[i * 3 + 2] += f.vs[i * 3 + 2] * dt; } f.g.attributes.position.needsUpdate = true; f.m.material.opacity = Math.max(0, f.life / 0.6); }
    this.fx = this.fx.filter(f => { if (f.life <= 0) { this.scene.remove(f.m); f.g.dispose(); f.m.material.dispose(); return false; } return true; });
  }
  cull() {
    this.npcs = this.npcs.filter(n => { if (n.removeMe) { this.scene.remove(n.root); return false; } return true; });
    if (this.npcs.filter(n => !n.cop && !n.story).length < 40) this.spawnPed();
    if (this.cars.length < 20) this.spawnTraffic();
  }
}
function raySphere(o, d, c, r) { const oc = o.clone().sub(c); const b = oc.dot(d); const cc = oc.dot(oc) - r * r; const h = b * b - cc; if (h < 0) return null; const t = -b - Math.sqrt(h); return t >= 0 ? t : null; }

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
class Player {
  constructor(game) {
    this.game = game; this.pos = new THREE.Vector3(0, 0, 0); this.yaw = 0; this.vy = 0; this.onGround = true;
    this.camYaw = 0; this.camPitch = 0.32; this.camDist = 6.5;
    this.health = 100; this.maxHealth = 100; this.money = 200; this.wanted = 0; this.heat = 0;
    this.inCar = null; this.regen = 0; this.phase = 0; this.swing = 0;
    this.hasGun = true; this.gunCd = 0; this.dead = false;
    this.root = new THREE.Group(); this.root.add(makeBlob(0.5)); game.scene.add(this.root); this.root.visible = false;
    this._build();
  }
  _build() { const f = buildPerson({ shirt: 0x2a9d8f, skin: 0xe7b58a, hair: 0x241a12, pants: 0x222831 }); this.fig = f; this.root.add(f.group); }
  upgrade() { if (this.fig && this.fig.gltf) return; this.root.remove(this.fig.group); this.fig = buildPerson({ shirt: 0x2a9d8f }); this.root.add(this.fig.group); }
  spawn() { const c = this.game.city; this.pos.set(30, 0, 30); this.camYaw = Math.PI; this.root.position.copy(this.pos); } // road intersection, clear of buildings
  enterCar(car) { this.inCar = car; car.driver = this; car.ai = false; this.root.visible = false; if (car.aiTraffic) this.game.addWanted(1); }
  exitCar() { const car = this.inCar; if (!car) return; this.inCar = null; car.driver = null; car.ai = true; this.root.visible = true; this.pos.set(car.pos.x + 2.4, 0, car.pos.z); this.vy = 0; }
  eye() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.5, this.pos.z); }
  update(dt) {
    const inp = this.game.input;
    this.camYaw -= inp.mdx * 0.0024; this.camPitch = clamp(this.camPitch - inp.mdy * 0.0024, -0.2, 1.2);
    this.camDist = clamp(this.camDist + inp.wheel * 0.8, 3.5, 12);
    if (inp.p('KeyF')) { if (this.inCar) this.exitCar(); else { const car = this.game.nearestCar(this.pos, 4.5); if (car) this.enterCar(car); } }
    if (this.inCar) { this._drive(dt, inp); this._stats(dt); return; }
    const fwd = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const wish = new THREE.Vector3();
    if (inp.k('KeyW')) wish.add(fwd); if (inp.k('KeyS')) wish.sub(fwd);
    if (inp.k('KeyD')) wish.add(right); if (inp.k('KeyA')) wish.sub(right);
    const moving = wish.lengthSq() > 0; if (moving) wish.normalize();
    const sprint = inp.k('ShiftLeft') || inp.k('ShiftRight'); const sp = (sprint ? 9.5 : 5.2);
    this.pos.x += wish.x * sp * dt; this.pos.z += wish.z * sp * dt;
    [this.pos.x, this.pos.z] = this.game.city.collide(this.pos.x, this.pos.z, 0.5);
    this.pos.x = clamp(this.pos.x, -this.game.city.size / 2 - 60, this.game.city.size / 2 + 60); this.pos.z = clamp(this.pos.z, -this.game.city.size / 2 - 8, this.game.city.size / 2 + 150);
    if (inp.k('Space') && this.onGround) { this.vy = 7; this.onGround = false; }
    this.vy -= 22 * dt; this.pos.y += this.vy * dt; if (this.pos.y <= 0) { this.pos.y = 0; this.vy = 0; this.onGround = true; }
    if (moving) this.yaw = lerpAngle(this.yaw, Math.atan2(wish.x, wish.z), Math.min(1, dt * 12));
    this.gunCd = Math.max(0, this.gunCd - dt);
    if (this.hasGun && inp.mL && this.gunCd <= 0) { this.gunCd = 0.16; const d = new THREE.Vector3(); this.game.camera.getWorldDirection(d); this.yaw = Math.atan2(d.x, d.z); this.game.shootRay(this.eye(), d, 18, 120); this.swing = 1; }
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    this._animate(moving, sprint, dt);
    this._stats(dt);
  }
  _drive(dt, inp) { const car = this.inCar; car.control(dt, inp); this.pos.copy(car.pos); this.yaw = car.yaw; }
  _animate(moving, sprint, dt) {
    const f = this.fig; const speed = moving ? (sprint ? 2.4 : 1.6) : 0;
    if (f.gltf && f.mixer) { const a = moving ? (f.actions.walk || f.actions.idle) : f.actions.idle; if (a && f._cur !== a) { if (f._cur) f._cur.fadeOut(0.18); a.reset().fadeIn(0.18).play(); f._cur = a; } if (moving && f.actions.walk) f.actions.walk.timeScale = sprint ? 1.6 : 1.0; f.mixer.update(dt); }
    else { this.phase += dt * (6 + speed * 4); const sw = moving ? Math.sin(this.phase) * 0.9 : 0; f.legs.forEach((l, i) => l.rotation.x = sw * (i % 2 ? -1 : 1)); f.arms.forEach((l, i) => l.rotation.x = -sw * (i % 2 ? -1 : 1) * 0.8); }
  }
  _stats(dt) {
    this.regen += dt; if (this.health < this.maxHealth && this.wanted === 0 && this.regen > 2) { this.health = Math.min(this.maxHealth, this.health + 6 * dt); }
    if (this.health <= 0 && !this.dead) { this.dead = true; this.game.ui.bustedOrDead('WASTED'); }
  }
  hurt(n) { if (this.dead) return; this.health -= n; this.regen = 0; this.game.ui.flash(); }
  updateCamera(dt, frozen) {
    const target = this.inCar ? new THREE.Vector3(this.inCar.pos.x, 1.6, this.inCar.pos.z) : new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z);
    if (this.inCar) { const k = 0.12; this.camYaw = lerpAngle(this.camYaw, Math.atan2(Math.sin(this.inCar.yaw), Math.cos(this.inCar.yaw)) + Math.PI, k); }
    const dist = this.inCar ? 9 : this.camDist, pitch = this.inCar ? 0.30 : this.camPitch;
    const off = new THREE.Vector3(Math.sin(this.camYaw + Math.PI) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.camYaw + Math.PI) * Math.cos(pitch)).multiplyScalar(dist);
    let cx = target.x + off.x, cy = target.y + off.y + 1.5, cz = target.z + off.z;
    if (cy < 0.8) cy = 0.8;
    this.game.camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 10) || 1);
    this.game.camera.lookAt(target);
  }
}
function lerpAngle(a, b, t) { let d = ((b - a + Math.PI) % TAU) - Math.PI; return a + d * t; }

// ---------------------------------------------------------------------------
// Ped / Cop
// ---------------------------------------------------------------------------
class Ped {
  constructor(game, x, z, cop) {
    this.game = game; this.cop = !!cop; this.pos = new THREE.Vector3(x, 0, z); this.yaw = rnd(TAU); this.vel = new THREE.Vector3();
    this.hp = cop ? 60 : 30; this.dead = false; this.removeMe = false; this.flee = 0; this.timer = rnd(3); this.wander = rnd(TAU); this.attackCd = 0; this.phase = rnd(6); this.deadT = 0;
    this.persona = { shirt: cop ? 0x21407a : pick(SHIRTS), skin: pick(SKIN), hair: pick(HAIR), pants: cop ? 0x16213f : pick(PANTS) };
    const f = buildPerson(this.persona); this.fig = f; this.gltf = f.gltf; this.root = new THREE.Group(); this.root.add(makeBlob(0.5)); this.root.add(f.group); this.root.position.copy(this.pos); game.scene.add(this.root);
    if (cop) { const cap = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.42), mat(0x12203f)); cap.position.y = f.gltf ? 1.95 : 2.02; this.root.add(cap); }
  }
  upgrade() { this.game.scene.remove(this.root); const f = buildPerson(this.persona); this.fig = f; this.gltf = true; this.root = new THREE.Group(); this.root.add(makeBlob(0.5)); this.root.add(f.group); this.root.position.copy(this.pos); this.game.scene.add(this.root); }
  damage(n, dir) { if (this.dead) return; this.hp -= n; this.flee = 7; if (this.hp <= 0) this.die(); }
  die() { this.dead = true; this.deadT = 0; const cash = 10 + (Math.random() * 40 | 0); this.game.player.money += cash; this.game.ui.toast('+$' + cash); }
  update(dt) {
    if (this.dead) { this.deadT += dt; this.root.rotation.z = Math.min(Math.PI / 2, this.deadT * 4); this.root.position.copy(this.pos); if (this.deadT > 6) this.removeMe = true; return; }
    const p = this.game.player; const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, dist = Math.hypot(dx, dz);
    this.attackCd = Math.max(0, this.attackCd - dt); if (this.flee > 0) this.flee -= dt; this.timer -= dt;
    let wx = 0, wz = 0, sp = this.cop ? 6 : 3.2;
    if (this.cop && dist < 42) { if (dist > 9) { wx = dx / dist; wz = dz / dist; } this.yaw = Math.atan2(dx, dz); if (dist < 28 && this.attackCd <= 0) { this.attackCd = 0.9; p.hurt(6 + Math.random() * 5); this.game.addTracer(this.pos.clone().setY(1.4), p.eye(), 0x9fc2ff); } }
    else if (this.flee > 0) { wx = -dx / (dist || 1); wz = -dz / (dist || 1); this.yaw = Math.atan2(wx, wz); sp = this.cop ? 6 : 5.5; }
    else if (!this.story) { if (this.timer <= 0) { this.timer = rnd(2, 5); this.wander = Math.random() < 0.35 ? null : rnd(TAU); } if (this.wander != null) { wx = Math.sin(this.wander); wz = Math.cos(this.wander); this.yaw = this.wander; } }
    const moving = wx || wz;
    this.pos.x += wx * sp * dt; this.pos.z += wz * sp * dt;
    [this.pos.x, this.pos.z] = this.game.city.collide(this.pos.x, this.pos.z, 0.5);
    if (!this.story && this.pos.distanceTo(p.pos) > 145) this.removeMe = true;
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    const f = this.fig;
    if (f.gltf && f.mixer) { const a = moving ? (f.actions.walk || f.actions.idle) : f.actions.idle; if (a && f._cur !== a) { if (f._cur) f._cur.fadeOut(0.2); a.reset().fadeIn(0.2).play(); f._cur = a; } f.mixer.update(dt); }
    else { this.phase += dt * (6 + sp); const sw = moving ? Math.sin(this.phase) * 0.85 : 0; f.legs.forEach((l, i) => l.rotation.x = sw * (i % 2 ? -1 : 1)); f.arms.forEach((l, i) => l.rotation.x = -sw * (i % 2 ? -1 : 1) * 0.8); }
  }
}

// ---------------------------------------------------------------------------
// Car
// ---------------------------------------------------------------------------
class Car {
  constructor(game, x, z, dir, color, aiTraffic) {
    this.game = game; this.pos = new THREE.Vector3(x, 0, z); this.yaw = Math.atan2(dir.x, dir.z); this.speed = 0; this.driver = null; this.ai = true; this.aiTraffic = !!aiTraffic; this.turnCd = 0;
    this.root = buildCar(color); this.root.add(makeBlob(1.6)); this.root.position.copy(this.pos); game.scene.add(this.root);
  }
  control(dt, inp) {
    const acc = (inp.k('KeyW') ? 1 : 0) - (inp.k('KeyS') ? 1 : 0); const steer = (inp.k('KeyA') ? 1 : 0) - (inp.k('KeyD') ? 1 : 0);
    this.speed += acc * 24 * dt; this.speed *= (inp.k('Space') ? 0.9 : 0.992); this.speed = clamp(this.speed, -14, 34);
    if (Math.abs(this.speed) > 0.5) this.yaw += steer * 1.7 * dt * (this.speed > 0 ? 1 : -1);
    this._move(dt);
    if (Math.abs(this.speed) > 7) for (const n of this.game.npcs) { if (!n.dead && n.pos.distanceTo(this.pos) < 2.4) { n.damage(40, null); if (!n.cop) this.game.addWanted(2); } }
  }
  update(dt) {
    if (this.driver) { this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; return; }
    if (!this.ai) return;
    const p = this.game.player; if (this.pos.distanceTo(p.pos) > 160) { this.game.scene.remove(this.root); this.game.cars = this.game.cars.filter(c => c !== this); this.game.spawnTraffic(); return; }
    this.turnCd -= dt; this.speed = lerp(this.speed, 11, dt * 2);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    const ahead = this.game.city.onRoad(this.pos.x + fx * 5, this.pos.z + fz * 5);
    if (!ahead || (this.turnCd <= 0 && Math.random() < 0.4)) {
      const opts = [this.yaw, this.yaw + Math.PI / 2, this.yaw - Math.PI / 2];
      const good = opts.filter(y => this.game.city.onRoad(this.pos.x + Math.sin(y) * 6, this.pos.z + Math.cos(y) * 6));
      this.yaw = good.length ? pick(good) : this.yaw + Math.PI; this.turnCd = 1.5 + Math.random();
    }
    this._move(dt);
  }
  _move(dt) {
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    let nx = this.pos.x + fx * this.speed * dt, nz = this.pos.z + fz * this.speed * dt;
    const [cx, cz] = this.game.city.collide(nx, nz, 1.4); if (cx !== nx || cz !== nz) this.speed *= -0.2;
    this.pos.x = cx; this.pos.z = cz;
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
  }
}

// ---------------------------------------------------------------------------
// Story / missions
// ---------------------------------------------------------------------------
class Story {
  constructor(game) { this.game = game; this.mi = -1; this.state = 'idle'; this.marker = null; this.giver = null; this.targets = null; this.t = 0; }
  begin() {
    this.chars = {};
    const c = this.game.city;
    this.spawnChar('tony', -c.cell + 6, -c.size / 2 + 44, 0x7a4fb0);
    this.spawnChar('sal', c.cell, c.cell, 0xc8a23a);
    this.marker = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 90, 14), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.28, depthWrite: false }));
    this.marker.visible = false; this.game.scene.add(this.marker);
    this.next();
  }
  spawnChar(id, x, z, shirt) { const p = new Ped(this.game, x, z, false); p.persona.shirt = shirt; p.story = true; p.timer = 1e9; p.wander = null; this.game.npcs.push(p); this.chars[id] = p; return p; }
  next() { this.mi++; const m = MISSIONS[this.mi]; if (!m) { this.state = 'done'; this.setObjective(''); this.game.ui.bigCard('YOU RUN THIS TOWN', 'Free roam — Neon Bay is yours.'); return; } this.state = 'goMeet'; this._setupMeet(m); }
  _setupMeet(m) { const giver = this.chars[m.giver]; this.giver = giver; if (giver) { this.marker.position.set(giver.pos.x, 45, giver.pos.z); this.marker.visible = true; this.marker.material.color.set(0xffd23a); } this.setObjective('Go see ' + CHARS[m.giver].name); }
  startStep() {
    const m = MISSIONS[this.mi], s = m.steps[this.si]; this.targets = null;
    if (s.at) { const wp = this.wp(s.at); this.marker.position.set(wp.x, 45, wp.z); this.marker.visible = true; this.marker.material.color.set(s.type === 'kill' ? 0xff5a5a : 0xffd23a); this.stepPos = wp; }
    else { this.marker.visible = false; this.stepPos = null; }
    if (s.type === 'kill') { this.targets = []; for (let i = 0; i < (s.count || 1); i++) { const t = new Ped(this.game, this.stepPos.x + rnd(-4, 4), this.stepPos.z + rnd(-4, 4), false); t.persona.shirt = 0x882222; t.hp = 50; t.story = true; t.flee = 0; this.game.npcs.push(t); this.targets.push(t); } }
    this.setObjective(s.text);
  }
  wp(at) { if (at.char) { const ch = this.chars[at.char]; return new THREE.Vector3(ch.pos.x, 0, ch.pos.z); } return new THREE.Vector3(at.x, 0, at.z); }
  update(dt) {
    if (this.state === 'cutscene' || this.state === 'done' || this.state === 'idle') return;
    const g = this.game, p = g.player, m = MISSIONS[this.mi];
    if (this.state === 'goMeet') { if (this.giver && p.pos.distanceTo(this.giver.pos) < 4.5) { this.play(m.before, () => { this.si = 0; if (m.steps && m.steps.length) { this.state = 'steps'; this.startStep(); } else this.finish(); }); } this._objDist(this.giver && this.giver.pos); return; }
    if (this.state === 'steps') {
      const s = m.steps[this.si]; let done = false;
      if (s.type === 'goto') done = this.stepPos && dist2(p.pos, this.stepPos) < 5;
      else if (s.type === 'getcar') done = !!p.inCar;
      else if (s.type === 'drive') done = p.inCar && this.stepPos && dist2(p.pos, this.stepPos) < 7;
      else if (s.type === 'evade') { if (this._armed == null) { this._armed = true; g.addWanted(s.wanted || 3); } done = p.wanted <= 0; }
      else if (s.type === 'kill') { done = this.targets && this.targets.every(t => t.dead); }
      if ((s.type === 'goto' || s.type === 'drive') && this.stepPos) this._objDist(this.stepPos);
      else if (s.type === 'kill' && this.targets) this.setObjective(s.text + '  (' + this.targets.filter(t => t.dead).length + '/' + this.targets.length + ')');
      if (done) { this._armed = null; this.si++; if (m.steps[this.si]) this.startStep(); else this.finish(); }
    }
  }
  finish() { const m = MISSIONS[this.mi]; this.play(m.after, () => { this.game.player.money += m.reward || 0; this.game.ui.bigCard('MISSION PASSED', (m.reward ? '+$' + m.reward : '')); this.marker.visible = false; setTimeout(() => this.next(), 2600); }); }
  play(lines, done) { this.state = 'cutscene'; this.marker.visible = false; this.game.ui.dialogue(lines || [], () => { this.state = 'steps'; done && done(); }); }
  _objDist(v) { if (!v) return; const d = Math.round(this.game.player.pos.distanceTo(v)); const base = this._lastObj || ''; this.game.ui.el.obj.textContent = base.replace(/\s+\d+m.*/, '') + '   ' + d + 'm →'; }
  setObjective(t) { this._lastObj = t; this.game.ui.el.obj.textContent = t; }
}
function dist2(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
const CHARS = { tony: { name: 'Tony Marenco', col: '#7fd0ff' }, sal: { name: 'Sal Greco', col: '#ffd23a' }, dezzy: { name: 'Dezzy', col: '#ff7eb0' }, victor: { name: 'Victor Salcido', col: '#ff5a5a' }, you: { name: 'You', col: '#bdeecb' } };
const MISSIONS = [
  { giver: 'tony', reward: 150,
    before: [['you', "Tony! You said the Bay was paved with gold."], ['tony', "...I may have oversold it. I'm into Victor Salcido for five grand."], ['tony', "His guys lean on my diner every week. Help me dig out and we run this town."], ['you', "Family's family. Where do we start?"]],
    steps: [], after: [['tony', "First we need cash. Go see Sal at the garage — he fences anything with wheels."]] },
  { giver: 'tony', reward: 400,
    before: [['tony', "Sal needs a ride to flip. Grab any car off the street and bring it to his garage."]],
    steps: [{ type: 'getcar', text: 'Steal any car (press F next to one)' }, { type: 'drive', text: "Deliver it to Sal's garage", at: { char: 'sal' } }],
    after: [['sal', "Clean pull. Here's your cut, kid. You've got a future in this."]] },
  { giver: 'tony', reward: 650,
    before: [['tony', "Cops flagged that plate. Shake the heat before they trace it to us."]],
    steps: [{ type: 'evade', text: 'Lose the cops — escape your wanted level', wanted: 3 }],
    after: [['tony', "Whew. Knew you had it in you, cuz."]] },
  { giver: 'tony', reward: 1500,
    before: [['tony', "Salcido's done warning us. His crew's hitting the block tonight. Put them down."]],
    steps: [{ type: 'kill', text: 'Take out the Salcido crew', count: 3, at: { x: 30, z: 30 } }],
    after: [['tony', "You held the line. But Victor himself? He won't quit now."]] },
  { giver: 'tony', reward: 6000,
    before: [['tony', "It ends tonight. Victor's down by the water. Finish it and the Bay is ours."]],
    steps: [{ type: 'kill', text: 'Take down Victor Salcido', count: 1, at: { x: -20, z: 130 } }],
    after: [['tony', "It's over. You're the king of Neon Bay now, cuz."]] },
];

// ---------------------------------------------------------------------------
// UI / HUD / minimap / dialogue
// ---------------------------------------------------------------------------
class UI {
  constructor(game) { this.game = game; this.modal = null; this.build(); }
  build() {
    const r = document.createElement('div'); r.id = 'ui'; r.innerHTML = `
      <canvas id="map" width="190" height="190"></canvas>
      <div id="topright"><div id="money">$200</div><div id="wanted"></div></div>
      <div id="hp"><div id="hpfill"></div></div>
      <div id="weapon">Pistol</div>
      <div id="obj"></div>
      <div id="toast"></div>
      <div id="dialogue" class="hidden"><div id="dspk"></div><div id="dtext"></div><div id="dhint">click / Space ▸</div></div>
      <div id="bigcard" class="hidden"><div class="bc1"></div><div class="bc2"></div></div>
      <div id="crosshair"></div>
      <div id="overlay" class="hidden"></div>`;
    document.body.appendChild(r); this.root = r;
    this.el = { map: r.querySelector('#map').getContext('2d'), mapc: r.querySelector('#map'), money: r.querySelector('#money'), wanted: r.querySelector('#wanted'), hp: r.querySelector('#hpfill'), obj: r.querySelector('#obj'), toast: r.querySelector('#toast'), dialogue: r.querySelector('#dialogue'), dspk: r.querySelector('#dspk'), dtext: r.querySelector('#dtext'), big: r.querySelector('#bigcard'), weapon: r.querySelector('#weapon'), overlay: r.querySelector('#overlay') };
    r.querySelector('#dialogue').addEventListener('mousedown', () => this._advance());
    addEventListener('keydown', e => { if ((e.code === 'Space' || e.code === 'Enter') && this._dlg) { e.preventDefault(); this._advance(); } });
  }
  title() {
    this.modal = 'title'; this.el.overlay.classList.remove('hidden'); this.el.overlay.className = 'menu';
    this.el.overlay.innerHTML = `
      <div class="menuwrap">
        <div class="logo"><span class="l1">NEON</span><span class="l2">BAY</span></div>
        <div class="tag">VICE • SUNSET • CHROME</div>
        <button id="play" class="bigbtn">START</button>
        <div class="ctrls">
          <span><b>WASD</b> move</span><span><b>Shift</b> sprint</span><span><b>Mouse</b> look</span>
          <span><b>Click</b> shoot</span><span><b>F</b> car</span><span><b>Esc</b> pause</span>
        </div>
        <div class="note">Original GTA-inspired game. Walk into lit storefronts. Online sessions stream in CC0 character models; offline it runs on built-in figures.</div>
      </div>`;
    this.el.overlay.querySelector('#play').onclick = () => { this.modal = null; this.game.start(); };
  }
  hideTitle() { this.el.overlay.classList.add('hidden'); }
  pauseMenu(on) { if (on) { this.modal = 'pause'; this.el.overlay.classList.remove('hidden'); this.el.overlay.className = 'menu'; this.el.overlay.innerHTML = `<div class="menuwrap"><div class="logo small"><span class="l1">PAUSED</span></div><button id="res" class="bigbtn">RESUME</button><button id="rl" class="bigbtn ghost">QUIT TO TITLE</button></div>`; this.el.overlay.querySelector('#res').onclick = () => this.game.resume(); this.el.overlay.querySelector('#rl').onclick = () => location.reload(); } else { this.modal = null; this.el.overlay.classList.add('hidden'); } }
  bustedOrDead(word) { this.modal = 'dead'; this.game.input.unlock(); this.el.overlay.classList.remove('hidden'); this.el.overlay.className = 'menu dead'; this.el.overlay.innerHTML = `<div class="menuwrap"><div class="logo small"><span class="wasted">${word}</span></div><button id="res" class="bigbtn">RESPAWN</button></div>`; this.el.overlay.querySelector('#res').onclick = () => location.reload(); }
  closeModal() { if (this.modal === 'pause') this.game.resume(); }
  flash() { document.body.classList.add('hurt'); clearTimeout(this._ht); this._ht = setTimeout(() => document.body.classList.remove('hurt'), 160); }
  toast(t) { this.el.toast.textContent = t; this.el.toast.style.opacity = 1; clearTimeout(this._tt); this._tt = setTimeout(() => this.el.toast.style.opacity = 0, 1200); }
  bigCard(a, b) { this.el.big.classList.remove('hidden'); this.el.big.querySelector('.bc1').textContent = a; this.el.big.querySelector('.bc2').textContent = b || ''; clearTimeout(this._bt); this._bt = setTimeout(() => this.el.big.classList.add('hidden'), 3800); }
  dialogue(lines, done) { this._dlg = { lines, i: 0, done }; this.modal = 'dlg'; this.game.input.unlock(); this.el.dialogue.classList.remove('hidden'); this._showLine(); }
  _showLine() { const d = this._dlg; const l = d.lines[d.i]; if (!l) return; const ch = CHARS[l[0]] || { name: l[0], col: '#fff' }; this.el.dspk.textContent = ch.name; this.el.dspk.style.color = ch.col; this.el.dtext.textContent = l[1]; }
  _advance() { const d = this._dlg; if (!d) return; d.i++; if (d.i >= d.lines.length) { this.el.dialogue.classList.add('hidden'); this._dlg = null; this.modal = null; if (this.game.playing && !this.game.paused) this.game.input.lock(); d.done && d.done(); } else this._showLine(); }
  update() {
    const p = this.game.player; this.el.money.textContent = '$' + (p.money | 0);
    this.el.wanted.textContent = p.wanted > 0 ? '★'.repeat(p.wanted) : '';
    this.el.hp.style.width = clamp(p.health, 0, 100) + '%';
    this.el.weapon.textContent = p.inCar ? '' : 'Pistol';
    document.getElementById('crosshair').style.display = (!p.inCar && this.game.input.mR) ? 'block' : 'none';
    this.minimap();
  }
  minimap() {
    const g = this.game, x = this.el.map, S = 190, sc = 0.5; x.clearRect(0, 0, S, S);
    x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); x.clip();
    x.fillStyle = '#141022'; x.fillRect(0, 0, S, S);
    const px = g.player.pos.x, pz = g.player.pos.z, c = g.city, half = c.size / 2;
    x.strokeStyle = '#39324d'; x.lineWidth = c.road * sc;
    for (let i = 0; i <= c.n; i++) { const gx = -half + i * c.cell; const sx = S / 2 + (gx - px) * sc; const sz = S / 2 + (gx - pz) * sc; x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx, S); x.stroke(); x.beginPath(); x.moveTo(0, sz); x.lineTo(S, sz); x.stroke(); }
    x.fillStyle = '#dfe6ef'; for (const car of g.cars) { const sx = S / 2 + (car.pos.x - px) * sc, sz = S / 2 + (car.pos.z - pz) * sc; x.fillRect(sx - 1.5, sz - 1.5, 3, 3); }
    for (const n of g.npcs) { if (n.dead) continue; x.fillStyle = n.cop ? '#5b8cff' : (n.story ? '#ffd23a' : '#5fe07f'); const sx = S / 2 + (n.pos.x - px) * sc, sz = S / 2 + (n.pos.z - pz) * sc; x.fillRect(sx - 1.5, sz - 1.5, 3, 3); }
    if (g.story.marker && g.story.marker.visible) { const m = g.story.marker.position; let sx = clamp(S / 2 + (m.x - px) * sc, 8, S - 8), sz = clamp(S / 2 + (m.z - pz) * sc, 8, S - 8); x.fillStyle = '#ffcf3a'; x.beginPath(); x.arc(sx, sz, 4, 0, TAU); x.fill(); }
    x.translate(S / 2, S / 2); x.rotate(-g.player.camYaw); x.fillStyle = '#ff4fa3'; x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 6); x.lineTo(-5, 6); x.closePath(); x.fill();
    x.restore();
    x.strokeStyle = 'rgba(255,79,163,0.5)'; x.lineWidth = 3; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); x.stroke();
  }
}

function boot() { try { new Game(); const b = document.getElementById('boot'); if (b) b.style.display = 'none'; } catch (e) { const b = document.getElementById('boot'); if (b) { b.style.display = 'block'; b.style.color = '#f88'; b.textContent = 'Error: ' + e.message; } console.error(e); } }
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
