// CHAPTER 1 — WRONG TURN. High-speed driving action.
import * as THREE from 'three';
import { buildCity, CITY } from './city.js';
import { Traffic } from './traffic.js';
import { Police, Helicopter, segmentClear } from './police.js';
import { WARP, warpMaterial, placeWarped, warpPoint } from './warp.js';
import { buildCar } from '../../vehicles/carModel.js';
import { CarBody, HANDLING, collideStatic, collideCars } from '../../vehicles/carPhysics.js';
import { buildCharacter, KAI } from '../../characters/cast.js';
import { Animator } from '../../characters/anim.js';
import { makeSky } from '../../engine/sky.js';
import { hdri, pbr, preloadSets } from '../../engine/assets.js';
import { Particles, Decals } from '../../engine/fx.js';
import { EngineSound, NoiseLoop } from '../../audio/audio.js';
import { el, wait } from '../../engine/ui.js';
import { state, setFlag } from '../../game/state.js';

const { P, N } = CITY;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// key locations
const START = V3(P * 1 - 3.4, 0, P * 0.35);
const YARD = V3(P * 8.5, 0, P * 2.5);
const MARKET = V3(P * 4.5, 0, P * 6);
const HARBOR_Z = N * P + 45;
const AVENUE_X = P * 5;

const CHECKPOINTS = {
  start: { pos: START, yaw: 0 },
  air: { pos: V3(P * 8.5, 0, P * 2.5), yaw: 0 },
  fold: { pos: V3(P * 4.6, 0, P * 6 - 3.4), yaw: Math.PI / 2 },
};

export default class Chapter1 {
  constructor(game) {
    this.game = game; this.usesPointerLock = false;
    this.events = []; this.timers = [];
  }

  // ------------------------------------------------------------------ load
  async load(checkpoint) {
    const g = this.game, R = g.renderer;
    const scene = this.scene = new THREE.Scene();
    const env = await hdri(R, 'city_dusk');
    scene.environment = env.env; scene.environmentIntensity = 0.5;
    this.sunDir = V3(-0.62, 0.1, 0.78).normalize();
    this.sky = makeSky({ sunDir: this.sunDir, top: 0x1b2440, mid: 0xc4643a, horizon: 0xf7a35f, cloud: 0.55, cloudColor: 0x4a3446 });
    scene.add(this.sky);
    scene.fog = new THREE.FogExp2(0x8a5d55, 0.0019);
    const sun = this.sun = new THREE.DirectionalLight(0xffa86e, 2.2);
    sun.castShadow = true; sun.shadow.mapSize.set(R.quality.shadows, R.quality.shadows);
    const sc = sun.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 1; sc.far = 700;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.06;
    scene.add(sun, sun.target);
    scene.add(new THREE.HemisphereLight(0x7a88b0, 0x2a1c18, 0.35));

    this.city = await buildCity(scene, { skipBlocks: [[8, 2]] });
    this.colliders = this.city.colliders;
    this.buildYard(); this.buildMarket(); this.buildInstitute(); await this.buildHarbor();

    // player car
    this.carMesh = buildCar('gt', { color: 0x6e1c18, spoiler: true, caliper: true, plate: 'VOSS 7', dirt: 0.3, chips: 60 });
    scene.add(this.carMesh);
    this.car = new CarBody(this.carMesh, HANDLING.gt, { player: true });
    this.car.onShift = () => this.game.audio.tone({ type: 'sawtooth', freq: 140, freqEnd: 90, dur: 0.08, vol: 0.05, reverb: 0 });
    // headlights
    this.headlights = [];
    for (const sx of [-0.65, 0.65]) {
      const s = new THREE.SpotLight(0xfff0d8, 60, 90, 0.42, 0.55, 1.6);
      s.position.set(sx, 0.7, 2.2); s.target.position.set(sx * 2, 0, 30);
      this.carMesh.body.add(s, s.target); this.headlights.push(s);
    }
    this.headlights[0].castShadow = R.quality.shadows >= 2048;
    // Kai, seated
    this.kai = await buildCharacter(KAI);
    this.kaiAnim = new Animator(this.kai);
    this.kaiAnim.mode = 'drive'; this.kaiAnim.blend.drive = 1;
    this.kai.scale.setScalar(0.95);
    this.carMesh.body.add(this.kai);
    this.kai.position.copy(this.carMesh.seatPos).add(V3(0, -0.42, -0.12));

    this.traffic = new Traffic(scene, { count: R.quality.drawScale < 0.8 ? 16 : 24 });
    this.police = new Police(scene, g.audio, { max: 6 });
    this.heli = new Helicopter(scene, g.audio);
    this.smoke = new Particles(scene, { max: 500 });
    this.sparks = new Particles(scene, { max: 300, additive: true, texture: 'dot' });
    this.skids = new Decals(scene, { max: 900 });
    this.debris = this.makeDebris();

    this.camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 5000);
    R.set(scene, this.camera);
    R.setGrade({ exposure: 1.0, bloom: [0.65, 0.5, 0.82], saturation: 1.06, contrast: 1.06, vignette: 0.38, lift: [0.02, 0.0, 0.03], gain: [1.03, 0.99, 0.95] });
    this.camState = { pos: new THREE.Vector3(), look: new THREE.Vector3(), mode: 0, shake: 0, fovKick: 0 };
    this.buildHud();
    this.reset(checkpoint);
  }

  buildYard() {
    // freight yard on block (8,2): containers, cranes, gate
    const s = this.scene, x0 = 8 * P + CITY.HALF, z0 = 2 * P + CITY.HALF, B = CITY.B;
    const colors = [0x8c3b2a, 0x2f5a7a, 0x6e7a3a, 0x9a8a2a, 0x3a3a40];
    const corr = pbr('corrugated', { size: 2.4 });
    for (let i = 0; i < 26; i++) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(2.45, 2.6, 6.1), corr.clone());
      c.material.color.setHex(colors[i % colors.length]);
      warpMaterial(c.material);
      const row = i % 2, k = Math.floor(i / 2);
      const x = x0 + 8 + (k % 6) * 13, z = z0 + 10 + Math.floor(k / 6) * 26 + row * 3;
      if (Math.abs(z - (z0 + B / 2)) < 9) continue;
      c.position.set(x, 1.3 + (i % 5 === 0 ? 2.6 : 0), z);
      c.castShadow = c.receiveShadow = true; s.add(c);
      this.colliders.push({ minX: x - 1.3, maxX: x + 1.3, minZ: z - 3.1, maxZ: z + 3.1, h: 5 });
    }
    this.yardGate = new THREE.Group();
    const gm = warpMaterial(new THREE.MeshStandardMaterial({ color: 0xc2a23a, metalness: 0.6, roughness: 0.5 }));
    for (let i = 0; i < 10; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.2, 0.12), gm); bar.position.set(0, 1.6, -9 + i * 2); this.yardGate.add(bar); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 20), gm); top.position.y = 3.2; this.yardGate.add(top);
    this.yardGate.position.set(x0 - 1, 0, z0 + B / 2); this.yardGate.userData.open = 1;
    s.add(this.yardGate);
  }

  buildMarket() {
    // the covered market: a glazed iron roof over one block of Sixth Street
    const s = this.scene;
    const x0 = 4 * P + CITY.HALF, x1 = 5 * P - CITY.HALF, z = 6 * P;
    const iron = warpMaterial(new THREE.MeshStandardMaterial({ color: 0x2b3a35, metalness: 0.7, roughness: 0.45 }));
    const glassRoof = warpMaterial(new THREE.MeshStandardMaterial({ color: 0x223338, metalness: 0.3, roughness: 0.25, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    const len = x1 - x0;
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, len, 24, 1, true, 0, Math.PI), glassRoof);
    roof.rotation.z = Math.PI / 2; roof.position.set((x0 + x1) / 2, 9, z); roof.scale.set(1, 1, 0.9); s.add(roof);
    for (let x = x0; x <= x1; x += 6) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(14.8, 0.18, 6, 24, Math.PI), iron); arch.rotation.y = Math.PI / 2; arch.position.set(x, 9, z); arch.scale.set(1, 1, 0.9); s.add(arch);
      for (const sz of [-13.5, 13.5]) { const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 9, 8), iron); col.position.set(x, 4.5, z + sz); col.castShadow = true; s.add(col); }
    }
    const signTex = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 160; const g = c.getContext('2d'); g.fillStyle = '#1d2a26'; g.fillRect(0, 0, 1024, 160); g.fillStyle = '#e8d9a8'; g.font = 'bold 96px Cormorant Garamond, serif'; g.textAlign = 'center'; g.fillText('THE COVERED MARKET · 1889', 512, 112); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    for (const [x, ry] of [[x0, -Math.PI / 2], [x1, Math.PI / 2], [x0 + 0.2, Math.PI / 2], [x1 - 0.2, -Math.PI / 2]]) { const sg = new THREE.Mesh(new THREE.PlaneGeometry(22, 3.4), warpMaterial(new THREE.MeshStandardMaterial({ map: signTex, emissiveMap: signTex, emissive: 0xffffff, emissiveIntensity: 0.6 }))); sg.position.set(x, 11, z); sg.rotation.y = ry; s.add(sg); }
    this.marketBox = { minX: x0 - 2, maxX: x1 + 2, minZ: z - 13, maxZ: z + 13 };
  }

  buildInstitute() {
    const s = this.scene;
    const tex = (() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#0b1416'; g.fillRect(0, 0, 1024, 256); g.strokeStyle = '#4fe3ff'; g.lineWidth = 6; g.beginPath(); g.arc(128, 128, 80, 0, 7); g.stroke(); g.fillStyle = '#dfeff2'; g.font = 'bold 92px Rajdhani, sans-serif'; g.fillText('MERIDIAN INSTITUTE', 240, 120); g.font = '44px Rajdhani, sans-serif'; g.fillStyle = '#7fc9d8'; g.fillText('ATLAS PROGRAMME · LOADING BAY 3', 244, 186); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 4), warpMaterial(new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.9 })));
    sign.position.set(P + CITY.HALF + 5.6, 7, P * 0.38); sign.rotation.y = -Math.PI / 2; s.add(sign);
    const lamp = new THREE.PointLight(0x7fe7ff, 30, 25, 2); lamp.position.set(P + CITY.HALF + 3, 6, P * 0.38); s.add(lamp);
  }

  async buildHarbor() {
    const s = this.scene;
    // water: dark reflective plane with procedural wave normals (bent with the world)
    const water = new THREE.MeshPhysicalMaterial({ color: 0x0a1c24, roughness: 0.08, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.1 });
    const U = { uTime: { value: 0 } };
    water.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWW = (modelMatrix * vec4(position,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWW; uniform float uTime;')
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          vec2 q = vWW.xz;
          float nx = sin(q.x * 0.21 + uTime * 1.3) * 0.5 + sin(q.x * 0.73 + q.y * 0.31 + uTime * 2.1) * 0.25 + sin(q.y * 1.7 - uTime * 3.0) * 0.1;
          float nz = sin(q.y * 0.19 - uTime * 1.1) * 0.5 + sin(q.y * 0.67 - q.x * 0.27 + uTime * 1.7) * 0.25 + sin(q.x * 1.9 + uTime * 2.6) * 0.1;
          normal = normalize(normal + mat3(viewMatrix) * vec3(nx * 0.18, 0.0, nz * 0.18));`);
    };
    warpMaterial(water);
    this.waterU = U;
    const wg = new THREE.PlaneGeometry(4000, 3000, 160, 120); wg.rotateX(-Math.PI / 2); wg.translate(650, -1.5, HARBOR_Z + 1500);
    const wm = new THREE.Mesh(wg, water); s.add(wm);
    // the bridge: deck continuing the avenue over the water, with rails
    const deck = new THREE.Mesh(new THREE.BoxGeometry(26, 1.2, 600, 1, 1, 60), warpMaterial(pbr('asphalt', { size: 6, color: 0x8a8a8a })));
    deck.position.set(AVENUE_X, -0.6, HARBOR_Z + 300); deck.receiveShadow = true; s.add(deck);
    const rail = warpMaterial(new THREE.MeshStandardMaterial({ color: 0x5a6168, metalness: 0.8, roughness: 0.4 }));
    for (const sx of [-13, 13]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 600, 1, 1, 60), rail); r.position.set(AVENUE_X + sx, 0.55, HARBOR_Z + 300); s.add(r); }
    // the wave: a breaking crest spanning the harbour (hidden until the flood)
    const prof = [];
    for (let i = 0; i <= 40; i++) { const t = i / 40; const a = t * Math.PI * 1.25; prof.push([Math.sin(a) * 34 * (1 - t * 0.2) - t * 20, (1 - Math.cos(a)) * 30 * (1 - t * 0.15)]); }
    const geo = new THREE.BufferGeometry(); const pos = [], uv = [], idx = [];
    const W = 900, segX = 90;
    for (let i = 0; i <= segX; i++) for (let j = 0; j <= 40; j++) {
      const x = -W / 2 + (i / segX) * W; const [z, y] = prof[j];
      const wob = Math.sin(x * 0.03) * 3 + Math.sin(x * 0.11) * 1.2;
      pos.push(x, y + wob * (j / 40), -z - wob); uv.push(i / segX * 20, j / 40);
    }
    for (let i = 0; i < segX; i++) for (let j = 0; j < 40; j++) { const a = i * 41 + j, b = a + 41; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const waveMat = new THREE.MeshPhysicalMaterial({ color: 0x0d3440, roughness: 0.15, metalness: 0, clearcoat: 1, side: THREE.DoubleSide, transmission: 0.0 });
    waveMat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWU;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWU = uv;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vWU; uniform float uTime; float wh(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }')
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float foam = smoothstep(0.55, 0.9, vWU.y) * (0.6 + 0.4 * wh(floor(vWU * vec2(60.0, 40.0) + uTime * 4.0)));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.85, 0.92, 0.95), foam);
          totalEmissiveRadiance += vec3(0.02, 0.09, 0.1) * (1.0 - vWU.y) + foam * 0.08;`);
    };
    warpMaterial(waveMat);
    this.wave = new THREE.Mesh(geo, waveMat); this.wave.visible = false; this.wave.frustumCulled = false;
    s.add(this.wave);
  }

  makeDebris() {
    // facade chunks torn off by the bend (instanced, physically integrated)
    const n = 160;
    const mat = this.city.styles.brick.clone ? new THREE.MeshStandardMaterial({ color: 0x6a4a3a, roughness: 0.9 }) : null;
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), warpMaterial(mat), n);
    m.count = 0; m.castShadow = true; m.frustumCulled = false; this.scene.add(m);
    return { mesh: m, items: [], n };
  }

  // ------------------------------------------------------------------ HUD
  buildHud() {
    const ui = this.game.ui;
    this.hud = ui.hud(`
      <div class="heat"><div class="stars">CIVIC SECURITY</div><div class="lights">${'<i></i>'.repeat(6)}</div></div>
      <canvas class="minimap" width="360" height="360"></canvas>
      <div class="health"><div class="label">CHASSIS</div><div class="track"><i></i></div><div class="label" style="margin-top:10px">NITROUS</div><div class="track"><i class="nitro" style="background:var(--cyan)"></i></div></div>
      <div class="speedo"><div class="v">0</div><div class="u">MPH</div><div class="gear">GEAR 1</div><div class="bar"><i></i></div></div>
      <div class="waypoint"><div class="m"></div><div class="d"></div></div>
      <div class="pause-hint">ESC · PAUSE</div>`);
    this.hud.style.opacity = 0;
    const q = (s) => this.hud.querySelector(s);
    this.H = { speed: q('.speedo .v'), gear: q('.speedo .gear'), bar: q('.speedo .bar i'), health: q('.health .track i'), healthBox: q('.health'), nitro: q('.nitro'), lights: [...this.hud.querySelectorAll('.heat .lights i')], heat: q('.heat'), map: q('.minimap'), wp: q('.waypoint'), wpd: q('.waypoint .d') };
    this.mapCtx = this.H.map.getContext('2d');
  }
  showHud(on) { this.hud.style.opacity = on ? 1 : 0; }

  // ------------------------------------------------------------------ flow
  reset(cp) {
    this.cp = cp;
    const c = CHECKPOINTS[cp] || CHECKPOINTS.start;
    this.car.place(c.pos.x, c.pos.z, c.yaw); this.car.health = Math.max(0.6, this.car.health); if (cp !== 'start') this.car.health = 1;
    this.car.nitroFuel = 1;
    this.police.clear(); this.heli.deactivate(); this.traffic.hideAll();
    WARP.uniforms.uBend.value.set(0, 1e6, 1e5, 0); WARP.uniforms.uFold.value.set(0, AVENUE_X, MARKET.z + 200, 0); WARP.uniforms.uVersion.value.set(0, 0, 0, 0);
    this.sky.userData.u.uRewrite.value = 0;
    this.wave.visible = false; this.waveZ = HARBOR_Z + 600;
    this.debris.items.length = 0; this.debris.mesh.count = 0;
    this.phase = { start: 'escape', air: 'air', fold: 'fold' }[cp] || 'escape';
    this.phaseT = 0; this.busted = 0; this.hiddenT = 0; this.spawnT = 2; this.roadblockDone = false; this.glitchT = 6;
    this.marketLost = false; this.flood = false; this.ending = false; this.said = new Set();
    this.yardGate.userData.open = 1;
    this.cinematic = null;
    this.camState.p = null; this.camState.yaw = undefined;
  }

  start(cp) {
    const g = this.game;
    this.startAudio();
    g.music.play('drive', { intensity: 0.1 });
    g.audio.setReverb(1.6, 3); g.audio.setReverbMix(0.22);
    if (cp === 'start') this.intro();
    else { this.beginPhase(this.phase); g.ui.fade(0, 1); }
  }

  async restart(cp) {
    this.cancelLines();
    this.reset(cp);
    this.beginPhase(this.phase);
  }

  startAudio() {
    const a = this.game.audio;
    if (!a.ctx) return;
    this.engine = new EngineSound(a, { cylinders: 8, vol: 0.32 });
    this.tyres = new NoiseLoop(a, { type: 'bandpass', freq: 1800, q: 2.5 });
    this.wind = new NoiseLoop(a, { type: 'lowpass', freq: 500, dest: a.amb });
    this.cityAmb = new NoiseLoop(a, { type: 'lowpass', freq: 300, buf: a.brown, dest: a.amb }); this.cityAmb.set(0.25, 300);
  }

  // dialogue that never blocks gameplay
  line(id, lines) { if (this.said.has(id)) return; this.said.add(id); const token = this.lineToken = (this.lineToken || 0) + 1; this.game.ui.conversation(lines, () => this.disposed || this.lineToken < token - 3); }
  cancelLines() { this.lineToken = (this.lineToken || 0) + 10; this.game.ui.subs.innerHTML = ''; }

  // ------------------------------------------------------------------ intro cinematic
  async intro() {
    const g = this.game, ui = g.ui;
    this.cinematic = { t: 0, shot: 0 };
    ui.letterbox(true); ui.showSkip(true);
    this.kaiAnim.expression = 'neutral';
    let skipped = false, holdT = 0;
    this.skipCheck = (dt) => { if (g.input.down('Space')) holdT += dt; else holdT = 0; if (holdT > 0.6) skipped = true; return skipped; };
    const shot = (n) => { this.cinematic.shot = n; this.cinematic.t = 0; };
    const sleep = async (s) => { const end = performance.now() + s * 1000; while (performance.now() < end) { if (skipped || this.disposed) return; await wait(50); } };
    ui.fadeColor('#000');
    await ui.fade(1, 0.01);
    ui.chapterCard(1, 'WRONG TURN', 'High-speed driving action', 3.4);
    await sleep(2.2);
    shot(0); ui.fade(0, 2.5);
    g.music.setIntensity(0.05);
    await sleep(1.5);
    const say = async (who, text, d) => { if (skipped) return; await Promise.race([ui.say(who, text, d ? { duration: d } : {}), sleep(99)]); };
    await say('MARA', 'Kai, you still at Meridian? Client says the package is "time-sensitive." Whatever that means for a box.');
    shot(1);
    this.kaiAnim.expression = 'amused'; this.kaiAnim.talking = true;
    await say('KAI', 'It means they tipped in advance. Signing for it now.');
    this.kaiAnim.talking = false; this.kaiAnim.expression = 'confused';
    shot(2);
    await say('KAI', '…Mara. Does a box usually hum?');
    // the Anchor bonds
    if (!skipped) {
      g.audio.rewrite(1.6); g.renderer.grade.uniforms.uRewrite.value = 0.6;
      this.kai.anchor.light.intensity = 3; this.kaiAnim.expression = 'fear';
      await sleep(0.4); g.renderer.grade.uniforms.uFlash.value = 0.8; await sleep(0.15); g.renderer.grade.uniforms.uFlash.value = 0; g.renderer.grade.uniforms.uRewrite.value = 0;
    }
    await say('ANCHOR', 'IDENTITY LOCK: VOSS, KAI. ANCHOR BONDED. VERSION DRIFT 0.4%.');
    this.kaiAnim.talking = true;
    await say('KAI', 'Whoa — okay — no. Get off. Get OFF—', 2);
    this.kaiAnim.talking = false;
    shot(3);
    // police arrive behind
    const u = this.police.spawn(V3(START.x, 0, START.z - 70), 0); if (u) u.scripted = V3(START.x + 0.6, 0, START.z - 10); // pulls up 10 m behind
    this.kaiAnim.expression = 'surprise';
    await say('VENN', 'Mr. Voss. You are wearing eleven years of my work. Stay exactly where you are.');
    this.kaiAnim.expression = 'focus'; this.kaiAnim.talking = true;
    await say('KAI', "Lady, I don't even know what I'm wearing.");
    this.kaiAnim.talking = false;
    await say('VENN', "Then you won't miss it. Officers.", 2);
    await say('MARA', 'Kai? Why are there sirens on your channel?', 2.2);
    this.kaiAnim.talking = true;
    await say('KAI', 'Wrong turn. Talk later.', 1.8);
    this.kaiAnim.talking = false;
    ui.letterbox(false); ui.showSkip(false);
    this.kai.anchor.light.intensity = 0.25;
    this.cinematic = null;
    if (skipped) { this.cancelLines(); this.police.clear(); ui.fade(0, 0.5); }
    this.beginPhase('escape');
  }

  // ------------------------------------------------------------------ phases
  beginPhase(name) {
    const g = this.game, ui = g.ui;
    for (const u of this.police.activeUnits) u.scripted = null;
    this.phase = name; this.phaseT = 0;
    this.showHud(true);
    if (name === 'escape') {
      ui.objective('Lose Civic Security', 'Reach the freight yard on Ninth — the gate closes behind you');
      ui.hint('<kbd>W</kbd><kbd>S</kbd> throttle / brake · <kbd>A</kbd><kbd>D</kbd> steer · <kbd>Space</kbd> handbrake · <kbd>Shift</kbd> nitrous · <kbd>C</kbd> camera', 9000);
      g.music.setIntensity(0.55);
      for (let i = 0; i < 2; i++) this.police.spawnBehind(this.car, this.colliders);
      this.wanted = 2;
      this.line('p1a', [2, ['MARA', 'Okay. Civic Security. Four units on your channel. Head east — the freight yard on Ninth has a gate on a timer. My cousin runs it.'], ['KAI', 'Your cousin runs everything.'], ['MARA', 'And you never say thank you.']]);
    }
    if (name === 'air') {
      this.yardGate.userData.open = 0;
      ui.objective('Lose Air-1', 'Get under the Covered Market on Sixth Street and stay hidden');
      g.music.setIntensity(0.8);
      this.heli.activate(this.car.pos.clone().add(V3(-60, 70, -60)));
      for (let i = 0; i < 3; i++) this.police.spawnBehind(this.car, this.colliders);
      this.wanted = 4;
      this.line('p2a', [1, ['PILOT', 'Air-One on station. I have the suspect vehicle. Lighting him up.'], ['MARA', "There's a helicopter on you. The Covered Market — Sixth Street, the glass roof. Get under it and sit still."], ['KAI', 'Sit still. In a car chase. Great plan.']]);
    }
    if (name === 'fold') {
      ui.objective('Follow the signal', 'Head north up the avenue to the harbour');
      g.music.setIntensity(0.95);
      this.heli.deactivate();
      for (let i = 0; i < 3; i++) this.police.spawnBehind(this.car, this.colliders);
      this.wanted = 3;
      this.foldStart = this.car.pos.z;
      this.line('p3a', [1.5, ['VENN', 'Do you feel that? Your city is deciding it was never real. Give me the Anchor and I can choose which version stays.'], ['KAI', 'You did this?'], ['VENN', 'I am the only one trying to stop it.'], 3,
        ['RADIO', '…anyone with an Anchor… if you can hear this… go to the water. Don\'t stop at the edge. Go through.'], ['KAI', 'Who is this?'], ['SERA', '…Sera. Research vessel Meridian. Please — we\'re running out of—'], ['ANCHOR', 'VERSION DRIFT 61%. COLLAPSE IMMINENT.']]);
    }
  }

  // ------------------------------------------------------------------ update
  update(dt, t) {
    const g = this.game;
    this.t = t;
    if (this.waterU) this.waterU.uTime.value = t;
    this.city.update(dt, t, 1);
    this.sky.userData.u.uTime.value = t;
    if (this.cinematic) { this.updateCinematic(dt, t); return; }
    if (this.ending) { this.updateEnding(dt, t); return; }
    this.drive(dt, t);
  }

  updateCinematic(dt, t) {
    this.skipCheck?.(dt);
    const c = this.cinematic; c.t += dt;
    this.car.input = { throttle: 0, brake: 1, steer: 0, handbrake: 1, nitro: 0 };
    this.car.update(dt, null);
    placeWarped(this.carMesh, this.car.pos, this.car.yaw, this.car.pitch, this.car.roll);
    this.updateKai(dt);
    this.police.update(dt, t, this.car, this.colliders, this.ctx());
    // cutscenes obey the same collisions as gameplay: nothing passes through Kai's car
    for (const u of this.police.activeUnits) collideCars(this.car, u.body);
    for (const tc of this.traffic.active) collideCars(this.car, tc.body);
    const cam = this.camera, car = this.carMesh;
    const L = (x, y, z) => car.localToWorld(V3(x, y, z));
    let pos, look;
    if (c.shot === 0) { const a = c.t * 0.04; pos = L(-9 + a * 10, 2.2 + c.t * 0.1, 7 + c.t * 0.3); look = L(0, 0.8, 0); cam.fov = 40; }
    else if (c.shot === 1) { pos = L(0.25, 1.15, 1.35); look = this.kai.bones.head.getWorldPosition(V3()); cam.fov = 38; }
    else if (c.shot === 2) { pos = L(-0.25, 1.05, 0.45); const w = this.kai.bones.handL.getWorldPosition(V3()); look = w; cam.fov = 45; }
    else { pos = L(1.6, 1.3, -3.6 - c.t * 0.2); look = L(0.3, 1.0, 0); cam.fov = 42; }
    cam.position.copy(pos); cam.lookAt(look); cam.updateProjectionMatrix();
    // the passenger-seat package glows during shot 2
    if (c.shot === 2) { this.kai.anchor.light.intensity = 0.6 + Math.sin(t * 10) * 0.4; this.kaiAnim.ik.handL = L(0.15, 0.95, 0.35); }
    else this.kaiAnim.ik.handL = null;
    this.updateAudio(dt);
    this.sun.position.copy(cam.position).addScaledVector(this.sunDir, 300); this.sun.target.position.copy(cam.position);
  }

  ctx() {
    return {
      nearColliders: (p, r = 40) => this.city.near(p.x, p.z, r).concat(this.extraColliders(p)),
      collideStatic: (b, c) => collideStatic(b, c),
    };
  }
  extraColliders() { return this.yardGate.userData.open < 0.5 ? [{ minX: this.yardGate.position.x - 0.5, maxX: this.yardGate.position.x + 0.5, minZ: this.yardGate.position.z - 10, maxZ: this.yardGate.position.z + 10 }] : []; }

  drive(dt, t) {
    const g = this.game, inp = g.input, car = this.car;
    this.phaseT += dt;
    // ---- input
    if (inp.hit('KeyC')) this.camState.mode = (this.camState.mode + 1) % 3;
    if (inp.hit('KeyR') && car.speed < 3) { car.yaw += Math.PI; car.vel.set(0, 0, 0); }
    // keyboard steering ramps like GETAWAY!'s (faster back to centre than out to lock)
    const sx = clamp(inp.steer, -1, 1), cur = this.steerIn || 0, rate = (Math.sign(sx) !== Math.sign(cur) || sx === 0 ? 10 : 6) * dt;
    this.steerIn = inp.pad && Math.abs(inp.padAxis(0)) > 0 ? sx : (cur < sx ? Math.min(sx, cur + rate) : Math.max(sx, cur - rate));
    car.input = { throttle: inp.throttle, brake: inp.brake, steer: this.steerIn, handbrake: inp.down('Space') || inp.padBtn(0) > 0.5 ? 1 : 0, nitro: inp.down('ShiftLeft') || inp.down('ShiftRight') || inp.padBtn(1) > 0.5 ? 1 : 0 };
    // ---- physics (2 substeps)
    const sub = Math.max(1, Math.ceil(dt / (1 / 100))); // Getaway steps vehicles at <= 1/100 s
    let impact = 0;
    for (let s = 0; s < sub; s++) {
      car.update(dt / sub, null);
      for (const c of this.city.near(car.pos.x, car.pos.z, 8).concat(this.extraColliders())) impact = Math.max(impact, collideStatic(car, c));
      for (const tc of this.traffic.active) {
        const hit = collideCars(car, tc.body);
        if (hit > 2.5) this.traffic.wreck(tc);
        impact = Math.max(impact, hit);
      }
      for (const u of this.police.activeUnits) {
        const hit = collideCars(car, u.body);
        if (hit > 0) { impact = Math.max(impact, hit * 0.8); if (hit > 12) u.crashed = 2.5; }
      }
    }
    // police vs traffic, police vs police
    for (const u of this.police.activeUnits) {
      for (const tc of this.traffic.active) if (collideCars(u.body, tc.body) > 3) this.traffic.wreck(tc);
      for (const w of this.police.activeUnits) if (w !== u) collideCars(u.body, w.body);
    }
    if (impact > 3) this.onImpact(impact);
    placeWarped(this.carMesh, car.pos, car.yaw, car.pitch, car.roll);
    this.updateKai(dt);
    this.traffic.update(dt, car, { honk: (p) => this.game.audio.tone({ pos: warpPoint(p).p, type: 'square', freq: 392, dur: 0.35, vol: 0.06, reverb: 0.2 }) });
    this.police.update(dt, t, car, this.colliders, this.ctx());
    const lit = this.heli.update(dt, t, car, this.underMarket());
    this.updateFx(dt);
    this.updatePhase(dt, t, lit);
    this.updateCamera(dt, t);
    this.updateAudio(dt);
    this.updateHud(dt);
    // busted / wrecked
    const nearCop = this.police.activeUnits.some((u) => u.body.pos.distanceTo(car.pos) < 8);
    this.busted = nearCop && car.speed < 2.5 ? this.busted + dt : Math.max(0, this.busted - dt * 2);
    if (this.busted > 3.5) { g.fail('BUSTED'); this.busted = 0; }
    if (car.health <= 0) { g.fail('WRECKED'); car.health = 1; }
  }

  underMarket() { const p = this.car.pos, b = this.marketBox; return p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ; }

  onImpact(v) {
    const g = this.game, car = this.car;
    const p = warpPoint(car.pos.clone().add(V3(0, 0.6, 0))).p;
    g.audio.crash(p, clamp(v / 25, 0.2, 1));
    car.health -= clamp((v - 4) / 160, 0, 0.3);
    this.camState.shake = Math.min(1, this.camState.shake + v / 30);
    this.kaiAnim.hitReact(Math.sign(car.yawRate) || 1, clamp(v / 20, 0.2, 1));
    for (let i = 0; i < Math.min(30, v * 2); i++) this.sparks.emit(p, V3((Math.random() - 0.5) * 10, Math.random() * 6, (Math.random() - 0.5) * 10), { life: 0.4 + Math.random() * 0.4, size: 0.12, grow: 0, color: [1, 0.7, 0.3], alpha: 1, gravity: 12, drag: 1 });
    for (let i = 0; i < 6; i++) this.smoke.emit(p, V3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3), { life: 1.5, size: 2, color: [0.35, 0.33, 0.32], alpha: 0.5 });
    if (v > 14) { this.line('crash' + Math.floor(this.t / 20), [['KAI', ['Sorry! Sorry!', 'That was— that was not my fault.', 'Okay, ow.', 'Insurance is gonna love this.'][Math.floor(Math.random() * 4)], { duration: 1.6 }]]); }
  }

  updatePhase(dt, t, lit) {
    const g = this.game, car = this.car, ui = g.ui;
    // reinforcement spawns
    this.spawnT -= dt;
    if (this.spawnT < 0 && this.phase !== 'fold-end') {
      this.spawnT = 6;
      if (this.police.activeUnits.length < this.wanted) this.police.spawnBehind(car, this.colliders);
    }
    if (this.phase === 'escape') {
      this.waypoint = YARD;
      if (!this.roadblockDone && this.phaseT > 35) { this.roadblockDone = true; this.police.roadblock(car); this.line('rb', [['DISPATCH', 'Units seven and nine, block the intersection ahead. Spike him if you have to.']]); }
      if (this.phaseT > 20 && this.wanted < 4) { this.wanted = 4; this.line('p1b', [['VENN', 'Every mile you run, Mr. Voss, the world gets a little less certain. Pull over.']]); }
      if (this.phaseT > 50) this.line('p1c', [['ANCHOR', 'VERSION DRIFT 4%. LOCAL REALITY UNSTABLE.'], ['KAI', 'Stop talking in capital letters.']]);
      if (car.pos.distanceTo(YARD) < 38) {
        this.yardGate.userData.open = 0;
        g.checkpoint('air');
        for (const u of this.police.activeUnits) if (u.body.pos.distanceTo(car.pos) > 25) u.crashed = 4;
        this.line('yard', [['MARA', "Gate's closing — you're in! Tell me you're in."], ['KAI', "I'm in. Tell your cousin I love him."]]);
        this.beginPhase('air');
      }
    } else if (this.phase === 'air') {
      this.waypoint = MARKET;
      this.glitch(dt, t, 0.6);
      if (lit) this.line('lit', [['PILOT', 'Suspect is lit. Ground units, converge on my light.']]);
      if (this.phaseT > 25) this.line('glitch', [['KAI', 'Mara. Did that building just turn into a castle?'], ['MARA', 'Did— what? Kai, have you eaten today?'], ['ANCHOR', 'VERSION DRIFT 19%. ADJACENT REALITY BLEED.']]);
      if (this.underMarket()) {
        this.hiddenT += dt;
        ui.objectiveDetail(`Stay hidden… ${Math.max(0, 5 - this.hiddenT).toFixed(1)}s`);
        if (this.hiddenT > 5 && !this.marketLost) {
          this.marketLost = true;
          g.checkpoint('fold');
          this.line('lost', [['PILOT', 'Lost visual. Suspect under cover.'], 1.5, ['PILOT', '…Dispatch, what is that? The skyline. The skyline is moving.']]);
          this.beginPhase('fold');
        }
      } else { this.hiddenT = Math.max(0, this.hiddenT - dt * 2); if (this.hiddenT === 0) ui.objectiveDetail('Get under the Covered Market on Sixth Street and stay hidden'); }
    } else if (this.phase === 'fold') {
      this.waypoint = V3(AVENUE_X, 0, HARBOR_Z + 120);
      // the bend grows: the avenue ahead curls up into the sky
      const k = clamp(this.phaseT / 40, 0, 1);
      const b = WARP.uniforms.uBend.value;
      b.x = 1; b.y = MARKET.z + 90; b.z = THREE.MathUtils.lerp(4000, 330, k * k * (3 - 2 * k)); b.w = t;
      const f = WARP.uniforms.uFold.value; f.x = k * 1.2; f.y = AVENUE_X; f.z = MARKET.z + 150;
      this.sky.userData.u.uRewrite.value = k;
      g.renderer.grade.uniforms.uCA.value = 0.0015 + k * 0.004;
      this.glitch(dt, t, 1.2);
      this.tearDebris(dt, k);
      if (this.phaseT > 22) this.line('mara-gone', [['MARA', 'Kai — the harbour. The harbour is in the sky. Kai, what is happen—'], 1, ['KAI', 'Mara? Mara!'], ['ANCHOR', 'CHANNEL HAS NO VERSION TO RETURN TO.']]);
      // police get swallowed by the drift
      if (this.phaseT > 15) for (const u of this.police.activeUnits) if (Math.random() < dt * 0.15) { this.game.audio.rewrite(0.5); this.police.despawn(u); }
      if (this.phaseT > 15) this.wanted = 1;
      if (car.pos.z > HARBOR_Z - 120 && !this.flood) this.startFlood();
      if (this.flood) this.updateFlood(dt, t);
    }
  }

  glitch(dt, t, strength) {
    // brief bleeds of an adjacent reality: facades become castle stone
    const vU = WARP.uniforms.uVersion.value;
    this.glitchT -= dt;
    if (this.glitchT < 0 && vU.x <= 0.01) {
      this.glitchT = 9 + Math.random() * 8 / strength;
      const ahead = this.car.pos.clone().addScaledVector(this.car.forward, 60 + Math.random() * 60);
      vU.set(0.001, ahead.x, ahead.z, 45 + Math.random() * 50);
      this.glitchLife = 0;
      this.game.audio.rewrite(1.2);
    }
    if (vU.x > 0) {
      this.glitchLife += dt;
      const L = this.glitchLife;
      vU.x = L < 0.3 ? L / 0.3 : L < 1.8 ? 1 - Math.random() * 0.3 * strength : Math.max(0, 1 - (L - 1.8) / 0.6);
      this.game.renderer.grade.uniforms.uRewrite.value = L < 2.4 ? 0.15 * strength * (Math.random() < 0.3 ? 1 : 0.3) : 0;
      if (L > 2.4) { vU.x = 0; this.game.renderer.grade.uniforms.uRewrite.value = 0; }
    }
    for (const s of Object.values(this.city.styles)) s.userData.facade.uTime.value = t;
  }

  tearDebris(dt, k) {
    const d = this.debris, car = this.car;
    if (k > 0.25 && d.items.length < d.n && Math.random() < dt * 20 * k) {
      const side = Math.random() < 0.5 ? -1 : 1;
      const p = V3(AVENUE_X + side * (CITY.HALF + 6 + Math.random() * 10), 6 + Math.random() * 30, car.pos.z + 40 + Math.random() * 160);
      d.items.push({ p, v: V3(-side * Math.random() * 3, 4 + Math.random() * 8, (Math.random() - 0.5) * 3), r: V3(Math.random(), Math.random(), Math.random()), w: V3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(2), s: V3(1 + Math.random() * 3, 0.5 + Math.random() * 2, 1 + Math.random() * 3) });
    }
    const M = new THREE.Matrix4(), q = new THREE.Quaternion();
    d.items.forEach((it, i) => {
      it.p.addScaledVector(it.v, dt); it.v.y += dt * 1.5; it.r.addScaledVector(it.w, dt);
      q.setFromEuler(new THREE.Euler(it.r.x, it.r.y, it.r.z));
      M.compose(it.p, q, it.s); d.mesh.setMatrixAt(i, M);
    });
    d.mesh.count = d.items.length; d.mesh.instanceMatrix.needsUpdate = true;
  }

  startFlood() {
    this.flood = true; this.floodT = 0;
    this.wave.visible = true; this.waveZ = HARBOR_Z + 420;
    this.game.ui.objective('Go through', '');
    this.line('flood', [['ANCHOR', 'HOLD ON TO SOMETHING THAT IS YOURS.'], ['KAI', 'Okay. Okay. Through it.']]);
    this.game.music.hit(1);
    this.game.audio.thunder(0.5);
  }

  updateFlood(dt, t) {
    this.floodT += dt;
    this.waveZ -= dt * (22 + this.floodT * 4);
    this.wave.position.set(AVENUE_X, -1.5, this.waveZ);
    this.camState.shake = Math.max(this.camState.shake, 0.3 + this.floodT * 0.05);
    this.wind?.set(0.4, 900);
    if (this.waveZ - this.car.pos.z < 22 || this.floodT > 14) this.beginEnding();
  }

  // ------------------------------------------------------------------ ending: into the flood
  beginEnding() {
    if (this.ending) return;
    this.ending = { t: 0 };
    const g = this.game;
    g.ui.objective(null); this.showHud(false); this.cancelLines();
    g.timeScale = 0.3;
    this.car.airborne = true; this.car.vy = 14; this.car.yawRate = 1.2;
    g.audio.splash(warpPoint(this.car.pos).p, 3);
    g.audio.explosion(warpPoint(this.car.pos).p, 0.6);
    setFlag('ch1_drift', true);
  }

  updateEnding(dt, t) {
    const g = this.game, e = this.ending; e.t += dt;
    const car = this.car;
    car.input = { throttle: 0, brake: 0, steer: 0, handbrake: 0, nitro: 0 };
    car.vel.multiplyScalar(0.99);
    car.update(dt, null);
    car.pitch += dt * 1.5; car.roll += dt * 2.2;
    placeWarped(this.carMesh, car.pos, car.yaw, car.pitch, car.roll);
    this.updateKai(dt);
    this.kaiAnim.expression = 'fear';
    this.waveZ -= dt * 30; this.wave.position.z = this.waveZ;
    this.updateCamera(dt, t);
    this.updateFx(dt);
    if (e.t > 0.6 && !e.under) {
      e.under = true;
      g.ui.fadeColor('#05222c'); g.ui.fade(0.92, 0.25);
      g.audio.setMuffle(280, 0.2); g.audio.splash(null, 2.5);
      g.music.stop(0.3);
      this.engine?.stop(); this.engine = null; this.wind?.set(0, 200); this.tyres?.set(0);
    }
    if (e.t > 0.9 && !e.bubbles) {
      e.bubbles = true; g.timeScale = 1;
      for (let i = 0; i < 18; i++) setTimeout(() => g.audio.tone({ type: 'sine', freq: 300 + Math.random() * 600, freqEnd: 900 + Math.random() * 800, dur: 0.12, vol: 0.05, reverb: 0.5 }), i * 160 + Math.random() * 120);
    }
    if (e.t > 3.5 && !e.done) {
      e.done = true;
      g.ui.fadeColor('#000'); g.ui.fade(1, 1.2).then(() => g.nextChapter({ fromWater: true }));
    }
  }

  // ------------------------------------------------------------------ helpers
  updateKai(dt) {
    const a = this.kaiAnim, car = this.carMesh;
    // hands on the steering wheel rim (IK targets), follow its rotation
    const sw = car.steeringWheel;
    sw.updateMatrixWorld(true);
    a.ik.handR = sw.localToWorld(V3(-0.17, 0.02, 0.03));
    if (!a.ik.handLOverride) a.ik.handL = this.cinematic?.shot === 2 ? a.ik.handL : sw.localToWorld(V3(0.17, 0.02, 0.03));
    a.grip.L = a.grip.R = 0.95;
    this.kai.updateMatrixWorld(true);
    a.handPose('L', V3(0, 0.75, 0.65), V3(-1, 0, 0.3)); a.handPose('R', V3(0, 0.75, 0.65), V3(1, 0, 0.3));
    a.lookTarget = this.cinematic && this.cinematic.shot === 1 ? this.camera.position : car.localToWorld(V3(this.car.steerAngle * -8, 1, 30));
    if (!this.cinematic) a.expression = this.car.speed > 45 ? 'focus' : this.busted > 1 ? 'fear' : this.car.health < 0.3 ? 'strain' : 'focus';
    a.update(dt);
  }

  updateFx(dt) {
    const car = this.car;
    if (car.skid > 0.25 && !car.airborne) {
      for (const w of this.carMesh.wheels) if (!w.front || car.input.brake > 0.5) {
        const wp = w.steer.getWorldPosition(V3()); wp.y = warpPoint(car.pos).p.y;
        this.skids.add(w, wp, car.skid);
        if (Math.random() < car.skid * 0.6) this.smoke.emit(wp.clone().add(V3(0, 0.3, 0)), V3((Math.random() - 0.5) * 2, 1 + Math.random(), (Math.random() - 0.5) * 2), { life: 1.8, size: 1.2, grow: 3, color: [0.75, 0.73, 0.72], alpha: 0.35 * car.skid });
      }
    } else for (const w of this.carMesh.wheels) this.skids.break(w);
    // nitrous flames
    if (car.input.nitro && car.nitroFuel > 0) for (const sx of [-0.42, 0.42]) { const p = this.carMesh.body.localToWorld(V3(sx, 0.28, -2.4)); this.sparks.emit(p, this.carMesh.body.localToWorld(V3(sx, 0.28, -4)).sub(p).multiplyScalar(8), { life: 0.12, size: 0.5, grow: -0.6, color: [0.4, 0.6, 1], alpha: 1, drag: 0 }); }
    // damage smoke
    if (car.health < 0.45 && Math.random() < 0.4) { const p = this.carMesh.body.localToWorld(V3(0, 0.9, 1.6)); this.smoke.emit(p, V3(0, 2, 0).sub(car.vel.clone().multiplyScalar(0.3)), { life: 2, size: 0.8, grow: 3, color: car.health < 0.2 ? [0.12, 0.12, 0.12] : [0.5, 0.5, 0.5], alpha: 0.4 }); }
    this.smoke.update(dt); this.sparks.update(dt);
  }

  /** GETAWAY!'s chase camera (src/core/camera.js `_vehicle`), computed in unwarped space then bent. */
  updateCamera(dt, t) {
    const cs = this.camState, cam = this.camera, car = this.car, mesh = this.carMesh, spec = car.h;
    const speed = car.speed, damp = (a, b2, k) => a + (b2 - a) * (1 - Math.exp(-k * dt));
    const dampAng = (a, b2, k) => a + Math.atan2(Math.sin(b2 - a), Math.cos(b2 - a)) * (1 - Math.exp(-k * dt));
    if (cs.yaw === undefined) { cs.yaw = car.yaw; cs.p = null; cs.fov = 72; cs.roll = 0; }
    // heading: car yaw, blending toward the velocity direction while drifting fast
    let head = car.yaw;
    if (speed > 8 && car.vF > 0) { const vh = Math.atan2(car.vel.x, car.vel.z); head = car.yaw + Math.atan2(Math.sin(vh - car.yaw), Math.cos(vh - car.yaw)) * 0.45; }
    cs.yaw = dampAng(cs.yaw, head, car.airborne ? 1.5 : 6.5);
    const boosting = car.input.nitro && car.nitroFuel > 0 && car.input.throttle;
    const target = V3(car.pos.x, car.pos.y + spec.H * 0.85 + 0.4, car.pos.z);
    let dist = 2.6 + spec.L * 0.7 + clamp(speed * 0.05, 0, 3.2) + (car.airborne ? 1.4 : 0) + (boosting ? 0.8 : 0), height = 0.85 + spec.H * 0.5;
    if (cs.mode === 1) { dist *= 1.7; height *= 1.8; }
    cs.roll = damp(cs.roll, clamp(-car.yawRate * clamp(speed / 35, 0, 1.2) * 0.07, -0.1, 0.1), 4);
    let pos, look;
    if (cs.mode === 2) { // hood cam
      const sx = Math.sin(car.yaw), cz = Math.cos(car.yaw);
      pos = V3(car.pos.x + sx * spec.L * 0.15, car.pos.y + spec.H * 0.8 + 0.25, car.pos.z + cz * spec.L * 0.15);
      look = V3(pos.x + sx * 20, pos.y - 0.6, pos.z + cz * 20); cs.p = pos.clone();
    } else {
      const desired = V3(target.x - Math.sin(cs.yaw) * dist, target.y + height - 0.2, target.z - Math.cos(cs.yaw) * dist);
      this.camCollide(target, desired);
      if (!cs.p) cs.p = desired.clone();
      cs.p.x = damp(cs.p.x, desired.x, 8.5); cs.p.z = damp(cs.p.z, desired.z, 8.5); cs.p.y = damp(cs.p.y, desired.y, 6);
      this.camCollide(target, cs.p); // never let the lag put the camera inside a wall
      pos = cs.p.clone();
      look = V3(target.x + car.vel.x * 0.12, target.y + 0.2, target.z + car.vel.z * 0.12);
    }
    // trauma shake + speed shake
    cs.shake = Math.max(0, cs.shake - dt * 1.1);
    const tr = cs.shake * cs.shake, sp = clamp((speed - 18) / 45, 0, 1) * 0.09 + (boosting ? 0.05 : 0);
    const n = (k) => Math.sin(t * k) * 0.6 + Math.sin(t * k * 2.31 + 1.7) * 0.4;
    // bend both points with the world
    const wp = warpPoint(pos).p.clone(), wl = warpPoint(look).p.clone(), { pitch } = warpPoint(car.pos);
    cam.position.copy(wp);
    cam.up.set(0, Math.cos(pitch), -Math.sin(pitch));
    cam.lookAt(wl);
    cam.rotateX((n(19) * tr * 0.7 + n(8) * sp * 0.6) * 0.08); cam.rotateY((n(18) * tr * 0.9 + n(7) * sp) * 0.08); cam.rotateZ(n(15) * tr * 0.05 + (cs.mode === 2 ? 0 : cs.roll));
    const fovT = 72 + clamp(speed - 8, 0, 70) * 0.42 + (boosting ? 13 : 0) + (cs.mode === 2 ? 6 : 0);
    cs.fov = damp(cs.fov, fovT, 2.5);
    cam.fov = Math.min(cs.fov, 110); cam.updateProjectionMatrix();
    this.game.renderer.grade.uniforms.uSpeedBlur.value = clamp((speed - 30) / 45, 0, 1) * 0.6 + (boosting ? 0.4 : 0);
    this.game.renderer.grade.uniforms.uDamage.value = clamp(0.35 - car.health, 0, 0.35) * 2 * (0.6 + 0.4 * Math.sin(t * 6));
    this.sun.position.copy(mesh.position).addScaledVector(this.sunDir, 300); this.sun.target.position.copy(mesh.position);
  }

  /** Pull `to` back toward `from` if the segment enters a building (2D boxes with height). */
  camCollide(from, to, pad = 0.4) {
    const boxes = this.city.near(to.x, to.z, 20).concat(this.extraColliders());
    let tMin = 1;
    const dx = to.x - from.x, dz = to.z - from.z;
    for (const b of boxes) {
      if (b.h !== undefined && Math.min(from.y, to.y) > b.h) continue;
      let t0 = 0, t1 = 1, ok = true;
      for (const [p, d, lo, hi] of [[from.x, dx, b.minX - pad, b.maxX + pad], [from.z, dz, b.minZ - pad, b.maxZ + pad]]) {
        if (Math.abs(d) < 1e-6) { if (p < lo || p > hi) { ok = false; break; } continue; }
        let ta = (lo - p) / d, tb = (hi - p) / d; if (ta > tb) [ta, tb] = [tb, ta];
        t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); if (t0 > t1) { ok = false; break; }
      }
      if (ok && t0 < tMin) tMin = Math.max(0.15, t0);
    }
    if (tMin < 1) to.lerpVectors(from, to.clone(), tMin);
    return to;
  }

  updateAudio(dt) {
    const car = this.car;
    if (!this.engine && !this.ending && this.game.audio.ctx) this.startAudio();
    if (this.engine) this.engine.update(car.rpm, car.input.throttle);
    if (this.tyres) this.tyres.set(car.skid * 0.25, 1200 + car.speed * 20);
    if (this.wind) this.wind?.set(clamp(car.speed / 70, 0, 1) * 0.22, 300 + car.speed * 25);
  }

  updateHud(dt) {
    const H = this.H, car = this.car;
    const mph = Math.round(car.speed * 2.237);
    H.speed.textContent = mph;
    H.gear.textContent = 'GEAR ' + car.gear;
    H.bar.style.width = clamp((car.rpm - 900) / 6400, 0, 1) * 100 + '%';
    H.health.style.width = Math.max(0, car.health) * 100 + '%';
    H.healthBox.classList.toggle('low', car.health < 0.3);
    H.nitro.style.width = car.nitroFuel * 100 + '%';
    const n = this.police.activeUnits.length;
    const flash = Math.floor(this.t * 4) % 2;
    H.lights.forEach((l, i) => { l.classList.toggle('on', i < n); l.classList.toggle('b', (i + flash) % 2 === 0); });
    H.heat.style.opacity = n > 0 || this.heli.active ? 1 : 0.35;
    // waypoint marker
    if (this.waypoint) {
      const wp = warpPoint(this.waypoint.clone().add(V3(0, 3, 0))).p;
      const v = wp.clone().project(this.camera);
      const behind = v.z > 1;
      let x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
      if (behind) { x = innerWidth - x; y = innerHeight - 40; }
      x = clamp(x, 40, innerWidth - 40); y = clamp(y, 60, innerHeight - 60);
      H.wp.style.left = x + 'px'; H.wp.style.top = y + 'px'; H.wp.style.display = 'block';
      H.wpd.textContent = Math.round(this.waypoint.distanceTo(car.pos)) + ' m';
    } else H.wp.style.display = 'none';
    // minimap (every other frame)
    this.mapFrame = (this.mapFrame || 0) + 1;
    if (this.mapFrame % 2) return;
    const g = this.mapCtx, S = 360, scale = 0.55; // px per metre
    g.clearRect(0, 0, S, S);
    g.save(); g.translate(S / 2, S / 2); g.rotate(car.yaw + Math.PI); g.scale(-1, 1);
    g.translate(-car.pos.x * scale, -car.pos.z * scale);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let i = 0; i <= N; i++) { g.fillRect(i * P * scale - CITY.HALF * scale, -50, CITY.S * scale, (N * P + 100) * scale); g.fillRect(-50, i * P * scale - CITY.HALF * scale, (N * P + 100) * scale, CITY.S * scale); }
    if (this.marketBox) { g.fillStyle = 'rgba(120,200,160,0.35)'; const b = this.marketBox; g.fillRect(b.minX * scale, b.minZ * scale, (b.maxX - b.minX) * scale, (b.maxZ - b.minZ) * scale); }
    for (const u of this.police.activeUnits) { g.fillStyle = Math.floor(this.t * 6) % 2 ? '#ff4a3d' : '#3d7bff'; g.beginPath(); g.arc(u.body.pos.x * scale, u.body.pos.z * scale, 6, 0, 7); g.fill(); }
    if (this.heli.active) { g.strokeStyle = '#ffd27a'; g.lineWidth = 2; g.beginPath(); g.arc(this.heli.pos.x * scale, this.heli.pos.z * scale, 9, 0, 7); g.stroke(); }
    if (this.waypoint) { g.fillStyle = '#ffb547'; g.beginPath(); g.arc(this.waypoint.x * scale, this.waypoint.z * scale, 8, 0, 7); g.fill(); }
    g.restore();
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(S / 2, S / 2 - 10); g.lineTo(S / 2 + 7, S / 2 + 8); g.lineTo(S / 2 - 7, S / 2 + 8); g.fill();
  }

  dispose() {
    this.disposed = true;
    this.cancelLines();
    this.engine?.stop(); this.tyres?.stop(); this.wind?.stop(); this.cityAmb?.stop();
    this.police.clear(); this.heli.deactivate();
    this.game.audio.setMuffle(20000, 0.5);
    this.game.timeScale = 1;
    const gr = this.game.renderer.grade.uniforms; gr.uSpeedBlur.value = 0; gr.uDamage.value = 0; gr.uRewrite.value = 0; gr.uCA.value = 0.0015;
    WARP.uniforms.uBend.value.set(0, 1e6, 1e5, 0); WARP.uniforms.uFold.value.set(0, 0, 0, 0); WARP.uniforms.uVersion.value.set(0, 0, 0, 0);
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.hud?.remove();
  }
}
