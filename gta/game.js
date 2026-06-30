// ============================================================================
//  NEON BAY — a third-person open-world action game (original, GTA-inspired).
//  Built on Three.js. Smooth lit world (no voxels). Optional CC0 glTF models
//  loaded at runtime with full procedural fallbacks so it always runs.
// ============================================================================
import * as THREE from 'three';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const pick = a => a[(Math.random() * a.length) | 0];
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Optional community models (CC0 / public domain) — loaded online at runtime.
// Swap these for any CC0 GLB you like. Procedural fallbacks render otherwise.
// ---------------------------------------------------------------------------
const ASSETS = { ready: {} };
const MODELS = {
  char: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r160/examples/models/gltf/RobotExpressive/RobotExpressive.glb',
};
async function loadModels() {
  let GLTFLoader, SkeletonUtils;
  try {
    ({ GLTFLoader } = await import(window.__GLTF_URL__));
    SkeletonUtils = await import(window.__SK_URL__);
  } catch (e) { console.warn('[models] loaders unavailable:', e && e.message); return; }
  ASSETS.SkeletonUtils = SkeletonUtils;
  const loader = new GLTFLoader();
  loader.load(window.__MODEL_CHAR__ || MODELS.char, (gltf) => {
    const box = new THREE.Box3().setFromObject(gltf.scene), sz = new THREE.Vector3(); box.getSize(sz);
    gltf.userData.scale = 1.8 / (sz.y || 1.8); gltf.userData.minY = box.min.y;
    ASSETS.char = gltf; ASSETS.ready.char = true;
    if (window.GAME) window.GAME.onCharModel();
  }, undefined, (err) => console.warn('[models] character GLB unavailable, using built-in figure:', err && err.message || err));
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
// Textures (procedural, canvas) — windows, road, etc.
// ---------------------------------------------------------------------------
function windowTexture(base, lit) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 64, 64);
  for (let gy = 6; gy < 64; gy += 14) for (let gx = 6; gx < 64; gx += 13) {
    const on = lit && Math.random() < 0.5;
    x.fillStyle = on ? 'rgba(255,236,170,0.95)' : 'rgba(40,55,75,0.85)';
    x.fillRect(gx, gy, 8, 9);
    x.fillStyle = 'rgba(255,255,255,0.12)'; x.fillRect(gx, gy, 8, 2);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function noiseTexture(r, g, b, amt) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const d = x.createImageData(64, 64);
  for (let i = 0; i < 64 * 64; i++) { const v = (Math.random() - 0.5) * amt; d.data[i * 4] = r + v; d.data[i * 4 + 1] = g + v; d.data[i * 4 + 2] = b + v; d.data[i * 4 + 3] = 255; }
  x.putImageData(d, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------------------
// City — roads on a grid, lit pastel buildings, sidewalks, props.
// Collision is AABB against building boxes (flat ground).
// ---------------------------------------------------------------------------
const PASTELS = [0x6fc7c0, 0xefb6c8, 0xf3e2bb, 0xf0a07a, 0xb9a7e0, 0x8fc1e3, 0xe8e3da, 0xd98aa6];
class City {
  constructor(scene) {
    this.scene = scene; this.boxes = []; this.roads = []; this.lots = []; this.size = 0;
    this.group = new THREE.Group(); scene.add(this.group);
    this.build();
  }
  build() {
    const N = 7, LOT = 44, ROAD = 16, CELL = LOT + ROAD;
    const span = N * CELL; this.size = span; this.cell = CELL; this.lot = LOT; this.road = ROAD; this.n = N;
    const half = span / 2;
    // ground (grass) + a big asphalt sheet for the whole grid implied by roads
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(span + 400, span + 400), new THREE.MeshStandardMaterial({ map: noiseTexture(96, 138, 80, 26), roughness: 1 }));
    grass.geometry.attributes.uv.array.forEach && 0; grass.material.map.repeat.set(80, 80);
    grass.rotation.x = -Math.PI / 2; grass.position.set(0, -0.02, 0); grass.receiveShadow = true; this.group.add(grass);
    // roads: lay an asphalt strip along each grid line
    const roadMat = new THREE.MeshStandardMaterial({ map: noiseTexture(46, 47, 52, 16), roughness: 0.9 });
    roadMat.map.repeat.set(2, 40);
    const lineMat = new THREE.MeshStandardMaterial({ color: 0xe8c84a, emissive: 0x6a5a10, emissiveIntensity: 0.3, roughness: 0.6 });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0xb9bcc2, roughness: 1 });
    for (let i = 0; i <= N; i++) {
      const c = -half + i * CELL + ROAD / 2 - ROAD / 2 + LOT / 2 + ROAD / 2; // center of the i-th road line
      const pos = -half + i * CELL - ROAD / 2 + ROAD / 2; // simpler: road centered at grid line
      const g = -half + i * CELL - ROAD / 2; // left edge approach
      const rc = -half + i * CELL; // grid line center
      // along Z (vertical road)
      this._road(rc, 0, ROAD, span + ROAD, roadMat, lineMat, sideMat, true);
      // along X (horizontal road)
      this._road(0, rc, span + ROAD, ROAD, roadMat, lineMat, sideMat, false);
      this.roads.push({ x: rc, vertical: true }); this.roads.push({ z: rc, vertical: false });
    }
    // buildings / parks per lot
    let seed = 1337;
    const rng = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for (let ix = 0; ix < N; ix++) for (let iz = 0; iz < N; iz++) {
      const cx = -half + ix * CELL + ROAD + LOT / 2, cz = -half + iz * CELL + ROAD + LOT / 2;
      this.lots.push({ x: cx, z: cz });
      // sidewalk slab under the lot
      const sw = new THREE.Mesh(new THREE.BoxGeometry(LOT + 6, 0.3, LOT + 6), sideMat); sw.position.set(cx, 0.12, cz); sw.receiveShadow = true; this.group.add(sw);
      const r = rng();
      if (r < 0.16) { this._park(cx, cz, LOT, rng); continue; }
      // 1-3 buildings on the lot
      const sub = r < 0.55 ? 1 : 2;
      for (let s = 0; s < sub; s++) {
        const w = (LOT - 8) / sub - 4, d = LOT - 14;
        const bx = cx + (sub === 1 ? 0 : (s === 0 ? -1 : 1) * (LOT / 4 - 2)), bz = cz;
        const h = 10 + rng() * 46; const col = PASTELS[(rng() * PASTELS.length) | 0];
        this._building(bx, bz, w, d, h, col, rng);
      }
    }
    // a beach + ocean on one edge for the seaside vibe
    const water = new THREE.Mesh(new THREE.PlaneGeometry(span + 600, 300), new THREE.MeshStandardMaterial({ color: 0x2a7fb8, transparent: true, opacity: 0.86, roughness: 0.25, metalness: 0.3 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, 0.05, half + 230); this.group.add(water); this.water = water;
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(span + 600, 120), new THREE.MeshStandardMaterial({ color: 0xe8d8a8, roughness: 1 }));
    sand.rotation.x = -Math.PI / 2; sand.position.set(0, 0.03, half + 70); this.group.add(sand);
  }
  _road(x, z, w, d, roadMat, lineMat, sideMat, vertical) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.16, d), roadMat); r.position.set(x, 0.08, z); r.receiveShadow = true; this.group.add(r);
    const line = new THREE.Mesh(new THREE.BoxGeometry(vertical ? 0.5 : w, 0.02, vertical ? d : 0.5), lineMat);
    line.position.set(x, 0.18, z); this.group.add(line);
  }
  _building(x, z, w, d, h, color, rng) {
    const tex = windowTexture('#' + color.toString(16).padStart(6, '0'), true);
    tex.repeat.set(Math.max(2, w / 6), Math.max(2, h / 6));
    const mats = [
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 }),                       // +x
      new THREE.MeshStandardMaterial({ map: tex.clone(), roughness: 0.7 }),               // -x
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),                          // top
      new THREE.MeshStandardMaterial({ color, roughness: 0.8 }),                          // bottom
      new THREE.MeshStandardMaterial({ map: tex.clone(), roughness: 0.7 }),               // +z
      new THREE.MeshStandardMaterial({ map: tex.clone(), roughness: 0.7 }),               // -z
    ];
    mats[0].map.wrapS = mats[0].map.wrapT = THREE.RepeatWrapping;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    m.position.set(x, h / 2, z); m.castShadow = true; m.receiveShadow = true; this.group.add(m);
    // emissive sign accent
    if (rng() < 0.5) { const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.4, 0.4), new THREE.MeshStandardMaterial({ color: pick([0xff4fa3, 0x4fd6ff, 0xffd23a]), emissive: pick([0xff4fa3, 0x4fd6ff, 0xffd23a]), emissiveIntensity: 1.2 })); sign.position.set(x, 4 + rng() * (h - 6), z - d / 2 - 0.3); this.group.add(sign); }
    this.boxes.push({ x, z, hw: w / 2 + 0.3, hd: d / 2 + 0.3 });
  }
  _park(cx, cz, LOT, rng) {
    const lawn = new THREE.Mesh(new THREE.BoxGeometry(LOT, 0.35, LOT), new THREE.MeshStandardMaterial({ color: 0x6cae54, roughness: 1 })); lawn.position.set(cx, 0.16, cz); lawn.receiveShadow = true; this.group.add(lawn);
    const n = 3 + (rng() * 3 | 0); for (let i = 0; i < n; i++) this.palm(cx + rnd(-LOT / 2 + 4, LOT / 2 - 4), cz + rnd(-LOT / 2 + 4, LOT / 2 - 4));
  }
  palm(x, z) {
    const g = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 6, 7), new THREE.MeshStandardMaterial({ color: 0x9a6a3a, roughness: 1 })); trunk.position.y = 3; trunk.castShadow = true; g.add(trunk);
    for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4, 5), new THREE.MeshStandardMaterial({ color: 0x3f9e54, roughness: 1 })); f.position.set(Math.cos(i / 6 * TAU) * 1.6, 6, Math.sin(i / 6 * TAU) * 1.6); f.rotation.z = Math.cos(i / 6 * TAU) * 0.9; f.rotation.x = Math.sin(i / 6 * TAU) * 0.9; f.castShadow = true; g.add(f); }
    g.position.set(x, 0.25, z); this.group.add(g);
  }
  streetlights() { /* could add; kept light for perf */ }
  // resolve a circle (px,pz,radius) out of building boxes; returns adjusted [x,z]
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
}

// ---------------------------------------------------------------------------
// Procedural human (fallback when no GLB) — smooth lit capsule figure.
// ---------------------------------------------------------------------------
const SKIN = [0xf2cfa6, 0xe7b58a, 0xc68642, 0x8d5524, 0xffe0bd];
const SHIRTS = [0x3f7cb4, 0xb44545, 0x4caf50, 0xcaa23a, 0x8e5cb4, 0x444a52, 0xd47ba0, 0x2a9d8f];
function mat(c, opts) { return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85 }, opts || {})); }
function makeFigure(p) {
  const g = new THREE.Group(); const legs = [];
  const skin = p.skin || pick(SKIN), shirt = p.shirt || pick(SHIRTS), pants = p.pants || 0x33384a;
  const add = (mesh) => { mesh.castShadow = true; g.add(mesh); return mesh; };
  const limb = (r, len, color, x, topY, z) => { const grp = new THREE.Group(); grp.position.set(x, topY, z); const seg = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 8), mat(color)); seg.position.y = -len / 2 - r; seg.castShadow = true; grp.add(seg); g.add(grp); return grp; };
  add(new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 5, 12), mat(shirt))).position.y = 1.25;
  const head = add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), mat(skin))); head.position.y = 1.95;
  add(new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 8, 0, TAU, 0, 1.6), mat(p.hair || 0x2b1d10))).position.set(0, 2.0, 0);
  legs.push(limb(0.12, 0.55, pants, -0.13, 0.92, 0)); legs.push(limb(0.12, 0.55, pants, 0.13, 0.92, 0));
  legs.push(limb(0.1, 0.5, shirt, -0.34, 1.55, 0)); legs.push(limb(0.1, 0.5, shirt, 0.34, 1.55, 0));
  return { group: g, legs, head, mixer: null };
}
function makeGltfFigure(p) {
  const gltf = ASSETS.char; const clone = ASSETS.SkeletonUtils.clone(gltf.scene);
  clone.scale.setScalar(gltf.userData.scale); clone.position.y = -gltf.userData.minY * gltf.userData.scale;
  const tint = new THREE.Color(p.shirt || pick(SHIRTS));
  clone.traverse(o => { if (o.isMesh) { o.castShadow = true; if (o.material) { o.material = o.material.clone(); if (o.material.color) o.material.color.lerp(tint, 0.22); } } });
  const grp = new THREE.Group(); grp.add(clone);
  const mixer = new THREE.AnimationMixer(clone); const by = {}; for (const a of gltf.animations) by[a.name] = a;
  const A = n => by[n] ? mixer.clipAction(by[n]) : null;
  const actions = { idle: A('Idle'), walk: A('Walking') || A('Running'), run: A('Running') };
  if (actions.idle) actions.idle.play();
  return { group: grp, legs: [], head: null, mixer, actions, gltf: true };
}
function buildPerson(p) { return (ASSETS.ready.char && ASSETS.char) ? makeGltfFigure(p) : makeFigure(p); }

// ---------------------------------------------------------------------------
// Car (procedural, lit, rounded wheels)
// ---------------------------------------------------------------------------
const CAR_COLORS = [0xb43b3b, 0x2f5fb4, 0x2b2e35, 0xe8e8ec, 0x3f9e54, 0xc8a23a, 0x7a4fb0, 0xe87d2a];
function buildCar(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 4.6), mat(color, { metalness: 0.5, roughness: 0.35 })); body.position.y = 0.75; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.7, 2.3), mat(color, { metalness: 0.5, roughness: 0.35 })); cabin.position.set(0, 1.3, -0.1); cabin.castShadow = true; g.add(cabin);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 2.05), mat(0x9fd0e6, { metalness: 0.6, roughness: 0.1, transparent: true, opacity: 0.7 })); glass.position.set(0, 1.34, -0.1); g.add(glass);
  for (const sz of [-1.45, 1.45]) for (const sx of [-1.0, 1.0]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16), mat(0x111317, { roughness: 0.9 })); w.rotation.z = Math.PI / 2; w.position.set(sx, 0.42, sz); w.castShadow = true; g.add(w); }
  const hl = mat(0xfff3c0, { emissive: 0xfff0b0, emissiveIntensity: 0.8 });
  for (const sx of [-0.7, 0.7]) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.1), hl); l.position.set(sx, 0.8, -2.3); g.add(l); }
  return g;
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
class Game {
  constructor() {
    const canvas = document.getElementById('gl');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8fcfe6);
    this.scene.fog = new THREE.Fog(0xbfe0ea, 120, 360);
    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 800);

    this.hemi = new THREE.HemisphereLight(0xcfeaff, 0x55585e, 1.0); this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d0, 2.0); this.sun.position.set(60, 120, 40); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048); const sc = this.sun.shadow.camera; sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 360; this.sun.shadow.bias = -0.0005;
    this.scene.add(this.sun); this.scene.add(this.sun.target);

    this.clock = new THREE.Clock(); this.time = 0; this.playing = false; this.paused = false;
    this.input = new Input(canvas);
    this.city = new City(this.scene);
    this.ui = new UI(this);

    this.npcs = []; this.cars = []; this.bullets = []; this.fx = []; this.tracers = [];
    this.player = new Player(this);
    this.story = new Story(this);

    addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); });
    canvas.addEventListener('mousedown', () => { if (this.playing && !this.paused && !this.ui.modal && !this.input.locked) this.input.lock(); });
    this.input.onLock = (l) => { if (!l && this.playing && !this.paused && !this.ui.modal) this.pause(); };

    window.GAME = this; loadModels();
    this.ui.title(); this.loop();
  }
  onCharModel() { /* upgrade existing peds to the GLB figure */
    for (const n of this.npcs) if (!n.dead && !n.gltf) n.upgrade();
    if (this.player && !this.player.inCar) this.player.upgrade && this.player.upgrade();
  }
  start() {
    this.playing = true; this.paused = false; this.ui.hideTitle();
    // populate
    for (let i = 0; i < 26; i++) this.spawnPed();
    for (let i = 0; i < 12; i++) this.spawnTraffic();
    this.player.spawn();
    this.story.begin();
    this.input.lock();
  }
  spawnPed(near) {
    const c = this.city; const s = c.size / 2 - 6;
    let x, z, tries = 0;
    do { x = rnd(-s, s); z = rnd(-s, s); tries++; } while (this.city.onRoad(x, z) && tries < 8);
    const n = new Ped(this, x, z); this.npcs.push(n); return n;
  }
  spawnTraffic() {
    const c = this.city, half = c.size / 2; const line = (((Math.random() * (c.n + 1)) | 0)) * c.cell - half;
    const vert = Math.random() < 0.5; const x = vert ? line : rnd(-half, half), z = vert ? rnd(-half, half) : line;
    const dir = vert ? new THREE.Vector3(0, 0, Math.random() < .5 ? 1 : -1) : new THREE.Vector3(Math.random() < .5 ? 1 : -1, 0, 0);
    const car = new Car(this, x, z, dir, pick(CAR_COLORS), true); this.cars.push(car); return car;
  }
  addTracer(a, b, color) { const geo = new THREE.BufferGeometry().setFromPoints([a, b]); const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true })); this.scene.add(line); this.tracers.push({ line, life: 0.06 }); }
  hitFx(pos, color, n = 12) {
    const g = new THREE.BufferGeometry(); const ps = new Float32Array(n * 3), vs = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { ps[i * 3] = pos.x; ps[i * 3 + 1] = pos.y; ps[i * 3 + 2] = pos.z; vs[i * 3] = rnd(-4, 4); vs[i * 3 + 1] = rnd(1, 6); vs[i * 3 + 2] = rnd(-4, 4); }
    g.setAttribute('position', new THREE.BufferAttribute(ps, 3)); const m = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.18, transparent: true })); this.scene.add(m); this.fx.push({ m, g, ps, vs, n, life: 0.6 });
  }
  nearestCar(pos, r) { let best = null, bd = r; for (const c of this.cars) { if (c.driver) continue; const d = c.pos.distanceTo(pos); if (d < bd) { bd = d; best = c; } } return best; }
  addWanted(n) { const p = this.player; p.wanted = Math.min(5, p.wanted + n); p.heat = Math.max(p.heat, 12 + p.wanted * 6); }
  // hitscan along a ray; damages nearest ped/cop; stops at buildings
  shootRay(origin, dir, dmg, range) {
    let bestT = range, victim = null;
    for (const n of this.npcs) { if (n.dead) continue; const t = raySphere(origin, dir, n.pos.clone().setY(n.pos.y + 1.0), 0.7); if (t != null && t < bestT) { bestT = t; victim = n; } }
    const end = origin.clone().addScaledVector(dir, Math.min(bestT, range));
    if (victim) { victim.damage(dmg, dir); this.hitFx(end, 0xb01010, 10); if (!victim.cop) this.addWanted(2); }
    this.addTracer(origin.clone().addScaledVector(dir, 1.2), end, 0xffe98a);
    return victim;
  }
  pause() { if (!this.playing || this.paused) return; this.paused = true; this.input.unlock(); this.ui.pauseMenu(true); }
  resume() { this.paused = false; this.ui.pauseMenu(false); this.input.lock(); }
  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.05); this.time += dt;
    if (this.playing) {
      if (this.input.p('Escape')) { if (this.ui.modal) this.ui.closeModal(); else if (this.paused) this.resume(); else this.pause(); }
      const frozen = this.paused || this.ui.modal;
      if (!frozen) {
        this.player.update(dt);
        for (const n of this.npcs) n.update(dt);
        for (const c of this.cars) c.update(dt);
        this.updateBullets(dt); this.story.update(dt); this.updateWanted(dt);
        this.cull();
      }
      this.updateFx(dt);
      this.player.updateCamera(dt, frozen);
      this.ui.update();
    }
    // day-ish: keep sun near player for shadow coverage
    if (this.player.root) { this.sun.position.set(this.player.pos.x + 60, 130, this.player.pos.z + 40); this.sun.target.position.copy(this.player.pos); this.sun.target.updateMatrixWorld(); }
    this.renderer.render(this.scene, this.camera);
    this.input.end();
  }
  updateWanted(dt) { const p = this.player; if (p.heat > 0) { p.heat -= dt; if (p.heat <= 0) { p.wanted = Math.max(0, p.wanted - 1); p.heat = p.wanted > 0 ? 14 : 0; } } this.copT = (this.copT || 0) - dt; if (p.wanted > 0 && this.copT <= 0) { this.copT = 2.0; const want = Math.min(8, p.wanted * 2); let have = this.npcs.filter(n => n.cop && !n.dead).length; while (have < want) { const a = rnd(TAU), r = rnd(26, 40); const ped = new Ped(this, p.pos.x + Math.cos(a) * r, p.pos.z + Math.sin(a) * r, true); this.npcs.push(ped); have++; } } if (p.wanted === 0) for (const n of this.npcs) if (n.cop) n.dead = true; }
  updateBullets() {}
  updateFx(dt) {
    for (const t of this.tracers) { t.life -= dt; t.line.material.opacity = Math.max(0, t.life / 0.06); }
    this.tracers = this.tracers.filter(t => { if (t.life <= 0) { this.scene.remove(t.line); t.line.geometry.dispose(); t.line.material.dispose(); return false; } return true; });
    for (const f of this.fx) { f.life -= dt; for (let i = 0; i < f.n; i++) { f.vs[i * 3 + 1] -= 12 * dt; f.ps[i * 3] += f.vs[i * 3] * dt; f.ps[i * 3 + 1] += f.vs[i * 3 + 1] * dt; f.ps[i * 3 + 2] += f.vs[i * 3 + 2] * dt; } f.g.attributes.position.needsUpdate = true; f.m.material.opacity = Math.max(0, f.life / 0.6); }
    this.fx = this.fx.filter(f => { if (f.life <= 0) { this.scene.remove(f.m); f.g.dispose(); f.m.material.dispose(); return false; } return true; });
  }
  cull() {
    this.npcs = this.npcs.filter(n => { if (n.removeMe) { this.scene.remove(n.root); return false; } return true; });
    // keep population up
    if (this.npcs.filter(n => !n.cop).length < 22) this.spawnPed();
    if (this.cars.length < 12) this.spawnTraffic();
  }
}
function raySphere(o, d, c, r) { const oc = o.clone().sub(c); const b = oc.dot(d); const cc = oc.dot(oc) - r * r; const h = b * b - cc; if (h < 0) return null; const t = -b - Math.sqrt(h); return t >= 0 ? t : null; }

// ---------------------------------------------------------------------------
// Player — third-person, on foot or driving
// ---------------------------------------------------------------------------
class Player {
  constructor(game) {
    this.game = game; this.pos = new THREE.Vector3(0, 0, 0); this.yaw = 0; this.vy = 0; this.onGround = true;
    this.camYaw = 0; this.camPitch = 0.35; this.camDist = 7;
    this.health = 100; this.maxHealth = 100; this.money = 200; this.wanted = 0; this.heat = 0;
    this.inCar = null; this.regen = 0; this.phase = 0; this.swing = 0;
    this.hasGun = true; this.gunCd = 0; this.dead = false;
    this.root = new THREE.Group(); game.scene.add(this.root);
    this._build();
  }
  _build() { const f = buildPerson({ shirt: 0x2a9d8f, skin: 0xe7b58a, hair: 0x241a12 }); this.fig = f; this.root.add(f.group); }
  upgrade() { if (this.fig && this.fig.gltf) return; this.root.remove(this.fig.group); this.fig = buildPerson({ shirt: 0x2a9d8f }); this.root.add(this.fig.group); }
  spawn() { const c = this.game.city; this.pos.set(c.road + 4, 0, c.road + 4); this.pos.set(0, 0, -c.size / 2 + 30); this.camYaw = 0; }
  enterCar(car) { this.inCar = car; car.driver = this; car.ai = false; this.root.visible = false; if (car.aiTraffic) this.game.addWanted(1); }
  exitCar() { const car = this.inCar; if (!car) return; this.inCar = null; car.driver = null; car.ai = true; this.root.visible = true; this.pos.set(car.pos.x + 2.4, 0, car.pos.z); this.vy = 0; }
  eye() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.5, this.pos.z); }
  update(dt) {
    const inp = this.game.input;
    this.camYaw -= inp.mdx * 0.0024; this.camPitch = clamp(this.camPitch - inp.mdy * 0.0024, -0.2, 1.2);
    this.camDist = clamp(this.camDist + inp.wheel * 0.8, 3.5, 12);
    if (inp.p('KeyF')) { if (this.inCar) this.exitCar(); else { const car = this.game.nearestCar(this.pos, 4.5); if (car) this.enterCar(car); } }
    if (this.inCar) { this._drive(dt, inp); this._stats(dt); return; }
    // on-foot movement relative to camera
    const fwd = new THREE.Vector3(Math.sin(this.camYaw), 0, Math.cos(this.camYaw));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const wish = new THREE.Vector3();
    if (inp.k('KeyW')) wish.add(fwd); if (inp.k('KeyS')) wish.sub(fwd);
    if (inp.k('KeyD')) wish.add(right); if (inp.k('KeyA')) wish.sub(right);
    const moving = wish.lengthSq() > 0; if (moving) wish.normalize();
    const sprint = inp.k('ShiftLeft') || inp.k('ShiftRight'); const sp = (sprint ? 9.5 : 5.2);
    this.pos.x += wish.x * sp * dt; this.pos.z += wish.z * sp * dt;
    [this.pos.x, this.pos.z] = this.game.city.collide(this.pos.x, this.pos.z, 0.5);
    const lim = this.game.city.size / 2 + 280; this.pos.x = clamp(this.pos.x, -lim, lim); this.pos.z = clamp(this.pos.z, -this.game.city.size / 2 - 8, this.game.city.size / 2 + 130);
    // jump / gravity
    if (inp.k('Space') && this.onGround) { this.vy = 7; this.onGround = false; }
    this.vy -= 22 * dt; this.pos.y += this.vy * dt; if (this.pos.y <= 0) { this.pos.y = 0; this.vy = 0; this.onGround = true; }
    if (moving) this.yaw = lerpAngle(this.yaw, Math.atan2(wish.x, wish.z), Math.min(1, dt * 12));
    // shooting
    this.gunCd = Math.max(0, this.gunCd - dt);
    if (this.hasGun && inp.mL && this.gunCd <= 0) { this.gunCd = 0.16; const d = new THREE.Vector3(); this.game.camera.getWorldDirection(d); this.yaw = Math.atan2(d.x, d.z); this.game.shootRay(this.eye(), d, 18, 120); this.swing = 1; }
    // animate
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    this._animate(moving, sprint, dt);
    this._stats(dt);
  }
  _drive(dt, inp) { const car = this.inCar; car.control(dt, inp); this.pos.copy(car.pos); this.yaw = car.yaw; }
  _animate(moving, sprint, dt) {
    const f = this.fig; const speed = moving ? (sprint ? 2.4 : 1.6) : 0;
    if (f.gltf && f.mixer) { const a = moving ? (f.actions.walk || f.actions.idle) : f.actions.idle; if (a && f._cur !== a) { if (f._cur) f._cur.fadeOut(0.18); a.reset().fadeIn(0.18).play(); f._cur = a; } if (moving && f.actions.walk) f.actions.walk.timeScale = sprint ? 1.6 : 1.0; f.mixer.update(dt); }
    else { this.phase += dt * (6 + speed * 4); const sw = moving ? Math.sin(this.phase) * 0.9 : 0; f.legs.forEach((l, i) => l.rotation.x = sw * (i % 2 ? -1 : 1)); }
  }
  _stats(dt) {
    this.regen += dt; if (this.health < this.maxHealth && this.wanted === 0 && this.regen > 2) { this.health = Math.min(this.maxHealth, this.health + 6 * dt); }
    if (this.health <= 0 && !this.dead) { this.dead = true; this.game.ui.bustedOrDead('WASTED'); }
  }
  hurt(n) { if (this.dead) return; this.health -= n; this.regen = 0; this.game.ui.flash(); }
  updateCamera(dt, frozen) {
    const target = this.inCar ? new THREE.Vector3(this.inCar.pos.x, 1.6, this.inCar.pos.z) : new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z);
    if (this.inCar) { const k = 0.12; this.camYaw = lerpAngle(this.camYaw, Math.atan2(Math.sin(this.inCar.yaw), Math.cos(this.inCar.yaw)) + Math.PI, k); }
    const dist = this.inCar ? 9 : this.camDist, pitch = this.inCar ? 0.32 : this.camPitch;
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
    this.persona = { shirt: cop ? 0x213a78 : pick(SHIRTS), skin: pick(SKIN), hair: pick([0x2b1d10, 0x111111, 0x6b4a2a, 0xc9a23a]) };
    const f = buildPerson(this.persona); this.fig = f; this.gltf = f.gltf; this.root = new THREE.Group(); this.root.add(f.group); this.root.position.copy(this.pos); game.scene.add(this.root);
    if (cop) { const cap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.5), mat(0x16203f)); cap.position.y = f.gltf ? 2.0 : 2.15; this.root.add(cap); }
  }
  upgrade() { this.game.scene.remove(this.root); const f = buildPerson(this.persona); this.fig = f; this.gltf = true; this.root = new THREE.Group(); this.root.add(f.group); this.root.position.copy(this.pos); this.game.scene.add(this.root); }
  damage(n, dir) { if (this.dead) return; this.hp -= n; this.flee = 7; if (this.hp <= 0) this.die(); }
  die() { this.dead = true; this.deadT = 0; const cash = 10 + (Math.random() * 40 | 0); this.game.player.money += cash; this.game.ui.toast('+$' + cash); }
  update(dt) {
    if (this.dead) { this.deadT += dt; this.root.rotation.z = Math.min(Math.PI / 2, this.deadT * 4); this.root.position.copy(this.pos); if (this.deadT > 6) this.removeMe = true; return; }
    const p = this.game.player; const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z, dist = Math.hypot(dx, dz);
    this.attackCd = Math.max(0, this.attackCd - dt); if (this.flee > 0) this.flee -= dt; this.timer -= dt;
    let wx = 0, wz = 0, sp = this.cop ? 6 : 3.2;
    if (this.cop && dist < 40) { if (dist > 9) { wx = dx / dist; wz = dz / dist; } this.yaw = Math.atan2(dx, dz); if (dist < 26 && this.attackCd <= 0) { this.attackCd = 0.9; p.hurt(6 + Math.random() * 5); this.game.addTracer(this.pos.clone().setY(1.4), p.eye(), 0x9fc2ff); } }
    else if (this.flee > 0) { wx = -dx / (dist || 1); wz = -dz / (dist || 1); this.yaw = Math.atan2(wx, wz); sp = this.cop ? 6 : 5.5; }
    else { if (this.timer <= 0) { this.timer = rnd(2, 5); this.wander = Math.random() < 0.4 ? null : rnd(TAU); } if (this.wander != null) { wx = Math.sin(this.wander); wz = Math.cos(this.wander); this.yaw = this.wander; } }
    const moving = wx || wz;
    this.pos.x += wx * sp * dt; this.pos.z += wz * sp * dt;
    [this.pos.x, this.pos.z] = this.game.city.collide(this.pos.x, this.pos.z, 0.5);
    const far = this.pos.distanceTo(p.pos); if (far > 140) this.removeMe = true;
    this.root.position.copy(this.pos); this.root.rotation.y = this.yaw;
    const f = this.fig;
    if (f.gltf && f.mixer) { const a = moving ? (f.actions.walk || f.actions.idle) : f.actions.idle; if (a && f._cur !== a) { if (f._cur) f._cur.fadeOut(0.2); a.reset().fadeIn(0.2).play(); f._cur = a; } f.mixer.update(dt); }
    else { this.phase += dt * (6 + sp); const sw = moving ? Math.sin(this.phase) * 0.85 : 0; f.legs.forEach((l, i) => l.rotation.x = sw * (i % 2 ? -1 : 1)); }
  }
}

// ---------------------------------------------------------------------------
// Car
// ---------------------------------------------------------------------------
class Car {
  constructor(game, x, z, dir, color, aiTraffic) {
    this.game = game; this.pos = new THREE.Vector3(x, 0, z); this.yaw = Math.atan2(dir.x, dir.z); this.speed = 0; this.driver = null; this.ai = true; this.aiTraffic = !!aiTraffic; this.turnCd = 0;
    this.root = buildCar(color); this.root.position.copy(this.pos); game.scene.add(this.root);
  }
  control(dt, inp) {
    const acc = (inp.k('KeyW') ? 1 : 0) - (inp.k('KeyS') ? 1 : 0); const steer = (inp.k('KeyA') ? 1 : 0) - (inp.k('KeyD') ? 1 : 0);
    this.speed += acc * 24 * dt; this.speed *= (inp.k('Space') ? 0.9 : 0.992); this.speed = clamp(this.speed, -14, 34);
    if (Math.abs(this.speed) > 0.5) this.yaw += steer * 1.7 * dt * (this.speed > 0 ? 1 : -1);
    this._move(dt);
    // run over peds
    if (Math.abs(this.speed) > 7) for (const n of this.game.npcs) { if (!n.dead && n.pos.distanceTo(this.pos) < 2.4) { n.damage(40, null); if (!n.cop) this.game.addWanted(2); } }
  }
  update(dt) {
    if (this.driver) { this.root.position.copy(this.pos); this.root.rotation.y = this.yaw; return; }
    if (!this.ai) return;
    const p = this.game.player; if (this.pos.distanceTo(p.pos) > 150) { this.game.scene.remove(this.root); this.dead = true; this.game.cars = this.game.cars.filter(c => c !== this); this.game.spawnTraffic(); return; }
    this.turnCd -= dt; this.speed = lerp(this.speed, 10, dt * 2);
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
// Story / missions — characters in places, dialogue cutscenes, objectives
// ---------------------------------------------------------------------------
class Story {
  constructor(game) { this.game = game; this.mi = -1; this.state = 'idle'; this.marker = null; this.giver = null; this.targets = null; this.t = 0; }
  begin() {
    this.chars = {};
    const c = this.game.city, off = (dx, dz) => new THREE.Vector3(dx, 0, dz);
    // place story characters as persistent peds near landmarks
    this.spawnChar('tony', -c.cell + 6, -c.size / 2 + 30 + 8, 0x7a4fb0);
    this.spawnChar('sal', c.cell, c.cell, 0xc8a23a);
    this.marker = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 80, 12), new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.22, depthWrite: false }));
    this.marker.visible = false; this.game.scene.add(this.marker);
    this.next();
  }
  spawnChar(id, x, z, shirt) { const p = new Ped(this.game, x, z, false); p.persona.shirt = shirt; p.story = true; p.timer = 1e9; p.wander = null; this.game.npcs.push(p); this.chars[id] = p; return p; }
  pos(off) { return new THREE.Vector3(off.x, 0, off.z); }
  next() { this.mi++; const m = MISSIONS[this.mi]; if (!m) { this.state = 'done'; this.setObjective(''); this.game.ui.bigCard('YOU RUN THIS TOWN', 'Free roam — Neon Bay is yours.'); return; } this.state = 'goMeet'; this._setupMeet(m); }
  _setupMeet(m) { const giver = this.chars[m.giver]; this.giver = giver; if (giver) { this.marker.position.set(giver.pos.x, 40, giver.pos.z); this.marker.visible = true; } this.setObjective('Go see ' + CHARS[m.giver].name); }
  startStep() {
    const m = MISSIONS[this.mi], s = m.steps[this.si]; this.targets = null;
    if (s.at) { const wp = this.wp(s.at); this.marker.position.set(wp.x, 40, wp.z); this.marker.visible = true; this.marker.material.color.set(s.type === 'kill' ? 0xff5a5a : 0xffd23a); this.stepPos = wp; }
    else { this.marker.visible = false; this.stepPos = null; }
    if (s.type === 'kill') { this.targets = []; for (let i = 0; i < (s.count || 1); i++) { const t = new Ped(this.game, this.stepPos.x + rnd(-4, 4), this.stepPos.z + rnd(-4, 4), false); t.persona.shirt = 0x882222; t.hp = 50; this.game.npcs.push(t); this.targets.push(t); } }
    this.setObjective(s.text);
  }
  wp(at) { const c = this.game.city; if (at.char) { const ch = this.chars[at.char]; return new THREE.Vector3(ch.pos.x, 0, ch.pos.z); } return new THREE.Vector3(at.x, 0, at.z); }
  update(dt) {
    if (this.state === 'cutscene' || this.state === 'done' || this.state === 'idle') return;
    const g = this.game, p = g.player, m = MISSIONS[this.mi];
    if (this.state === 'goMeet') { if (this.giver && p.pos.distanceTo(this.giver.pos) < 4) { this.play(m.before, () => { this.si = 0; if (m.steps && m.steps.length) { this.state = 'steps'; this.startStep(); } else this.finish(); }); } this._objDist(this.giver && this.giver.pos); return; }
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
    steps: [{ type: 'getcar', text: 'Steal any car (press F next to one)' }, { type: 'drive', text: 'Deliver it to Sal\'s garage', at: { char: 'sal' } }],
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
    steps: [{ type: 'kill', text: 'Take down Victor Salcido', count: 1, at: { x: -20, z: 120 } }],
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
  title() { this.modal = 'title'; this.el.overlay.classList.remove('hidden'); this.el.overlay.innerHTML = `<div class="card"><h1>NEON BAY</h1><p class="sub">an open-world action game</p><button id="play">Start</button><div class="hint">WASD move · Shift sprint · Mouse look · Click shoot · F enter/exit car · Esc pause</div><div class="hint2">Original game, GTA-inspired. Online loads CC0 character models; works offline with built-in figures.</div></div>`; this.el.overlay.querySelector('#play').onclick = () => { this.modal = null; this.game.start(); }; }
  hideTitle() { this.el.overlay.classList.add('hidden'); }
  pauseMenu(on) { if (on) { this.modal = 'pause'; this.el.overlay.classList.remove('hidden'); this.el.overlay.innerHTML = `<div class="card"><h1>Paused</h1><button id="res">Resume</button><button id="rl">Quit to title</button></div>`; this.el.overlay.querySelector('#res').onclick = () => this.game.resume(); this.el.overlay.querySelector('#rl').onclick = () => location.reload(); } else { this.modal = null; this.el.overlay.classList.add('hidden'); } }
  bustedOrDead(word) { this.modal = 'dead'; this.game.input.unlock(); this.el.overlay.classList.remove('hidden'); this.el.overlay.innerHTML = `<div class="card"><h1 style="color:#e05a5a">${word}</h1><button id="res">Respawn</button></div>`; this.el.overlay.querySelector('#res').onclick = () => location.reload(); }
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
    this.el.crosshair && (document.getElementById('crosshair').style.display = (!p.inCar && this.game.input.mR) ? 'block' : 'none');
    this.minimap();
  }
  minimap() {
    const g = this.game, x = this.el.map, S = 190, R = 90, sc = 0.5; x.clearRect(0, 0, S, S);
    x.save(); x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); x.clip();
    x.fillStyle = '#1b2b22'; x.fillRect(0, 0, S, S);
    const px = g.player.pos.x, pz = g.player.pos.z, c = g.city, half = c.size / 2;
    // roads
    x.strokeStyle = '#3c4750'; x.lineWidth = c.road * sc;
    for (let i = 0; i <= c.n; i++) { const gx = -half + i * c.cell; const sx = S / 2 + (gx - px) * sc; const sz = S / 2 + (gx - pz) * sc; x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx, S); x.stroke(); x.beginPath(); x.moveTo(0, sz); x.lineTo(S, sz); x.stroke(); }
    // cars
    x.fillStyle = '#cccccc'; for (const car of g.cars) { const sx = S / 2 + (car.pos.x - px) * sc, sz = S / 2 + (car.pos.z - pz) * sc; x.fillRect(sx - 1.5, sz - 1.5, 3, 3); }
    // peds
    for (const n of g.npcs) { if (n.dead) continue; x.fillStyle = n.cop ? '#5b8cff' : (n.story ? '#ffd23a' : '#6fe06f'); const sx = S / 2 + (n.pos.x - px) * sc, sz = S / 2 + (n.pos.z - pz) * sc; x.fillRect(sx - 1.5, sz - 1.5, 3, 3); }
    // mission marker
    if (g.story.marker && g.story.marker.visible) { const m = g.story.marker.position; let sx = S / 2 + (m.x - px) * sc, sz = S / 2 + (m.z - pz) * sc; sx = clamp(sx, 8, S - 8); sz = clamp(sz, 8, S - 8); x.fillStyle = '#ffcf3a'; x.beginPath(); x.arc(sx, sz, 4, 0, TAU); x.fill(); }
    // player arrow
    x.translate(S / 2, S / 2); x.rotate(-g.player.camYaw); x.fillStyle = '#fff'; x.beginPath(); x.moveTo(0, -6); x.lineTo(4, 5); x.lineTo(-4, 5); x.closePath(); x.fill();
    x.restore();
    x.strokeStyle = 'rgba(0,0,0,0.6)'; x.lineWidth = 3; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 2, 0, TAU); x.stroke();
  }
}

function boot() { try { new Game(); const b = document.getElementById('boot'); if (b) b.style.display = 'none'; } catch (e) { const b = document.getElementById('boot'); if (b) { b.style.display = 'block'; b.style.color = '#f88'; b.textContent = 'Error: ' + e.message; } console.error(e); } }
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();
