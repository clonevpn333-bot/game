// CHAPTER 5 — RUNNING OUT OF TIME. 2.5D precision platformer.
// The battlefield folds into "the Works", a gigantic machine tearing itself apart. Side-on
// camera, tight controls (coyote time, jump buffering, variable jump height, wall slide and
// wall jump, an eight-way air dash), crumbling grates, crushers, saws, drones you can dash
// through, steam launchers, laser gates, a countdown and a wall of collapse that chases you.
// Deaths restart instantly at the last checkpoint.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Particles } from '../../engine/fx.js';
import { wait, el } from '../../engine/ui.js';
import { buildCharacter } from '../../characters/ml/rig.js';
import { Animator } from '../../characters/ml/anim.js';
import { B } from '../../characters/ml/rig.js';
import { buildCourse } from './level.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

// movement tuning
const RUN = 9.2, ACC_G = 85, ACC_A = 52, GRAV = 44, FALL_GRAV = 66, JUMP = 15.6, MAX_FALL = 26;
const COYOTE = 0.1, BUFFER = 0.13, WALL_SLIDE = 3.6, WJ_X = 9.8, WJ_Y = 14.6, WJ_LOCK = 0.15;
const DASH_V = 23, DASH_T = 0.155, PW = 0.62, PH = 1.7;

function metalTex(seed, stripes = false) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#4c5258'; g.fillRect(0, 0, 256, 256);
  let a = seed; const R = () => ((a = (a * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) { const v = R() < 0.5 ? 255 : 0; g.fillStyle = `rgba(${v},${v},${v},${R() * 0.06})`; g.fillRect(R() * 256, R() * 256, 2 + R() * 3, 2 + R() * 3); }
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 3; g.strokeRect(2, 2, 252, 252); g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 256); g.moveTo(0, 128); g.lineTo(256, 128); g.stroke();
  for (const x of [12, 116, 140, 244]) for (const y of [12, 116, 140, 244]) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(x - 1, y - 1, 2, 0, 7); g.fill(); }
  for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(120,60,20,${R() * 0.25})`; g.beginPath(); g.arc(R() * 256, R() * 256, 6 + R() * 22, 0, 7); g.fill(); }
  if (stripes) { g.save(); g.beginPath(); g.rect(0, 0, 256, 40); g.clip(); for (let x = -40; x < 300; x += 40) { g.fillStyle = '#e8b020'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 20, 0); g.lineTo(x + 0, 40); g.lineTo(x - 20, 40); g.fill(); } g.restore(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function slab(x0, x1, y0, y1, z0 = -2, z1 = 2) {
  const w = x1 - x0, h = y1 - y0, d = z1 - z0, g = new THREE.BoxGeometry(w, h, d);
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) { const X = p.getX(i) + (x0 + x1) / 2, Y = p.getY(i) + (y0 + y1) / 2, Z = p.getZ(i); const ny = Math.abs(n.getY(i)) > 0.5, nx = Math.abs(n.getX(i)) > 0.5; uv.setXY(i, (nx ? Z : X) / 2, (ny ? Z : Y) / 2); }
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return g;
}

export default class Chapter5 {
  constructor(game) { this.game = game; this.usesPointerLock = false; }

  async load(cp) {
    const g = this.game, R = g.renderer;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x120d0c);
    scene.fog = new THREE.Fog(0x1a1210, 30, 95);
    this.L = buildCourse();
    this.hemi = new THREE.HemisphereLight(0xa8b8d0, 0x5a3426, 1.7); scene.add(this.hemi);
    this.fill = new THREE.PointLight(0xffd8b0, 18, 16, 1.2); scene.add(this.fill);
    this.key = new THREE.DirectionalLight(0xc8d8ff, 2.8); this.key.position.set(-10, 30, 25); this.key.castShadow = true;
    this.key.shadow.mapSize.set(R.quality.shadows, R.quality.shadows); Object.assign(this.key.shadow.camera, { left: -30, right: 30, top: 25, bottom: -25, far: 120 }); this.key.shadow.bias = -0.0005;
    scene.add(this.key, this.key.target);
    this.mats = {
      metal: new THREE.MeshStandardMaterial({ map: metalTex(7), metalness: 0.55, roughness: 0.55 }),
      warn: new THREE.MeshStandardMaterial({ map: metalTex(11, true), metalness: 0.4, roughness: 0.6, color: 0xc8b8a0 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x1c1a1a, metalness: 0.6, roughness: 0.6 }),
      saw: new THREE.MeshStandardMaterial({ color: 0xc8ccd2, metalness: 0.9, roughness: 0.25 }),
      glow: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.45, 0.12).multiplyScalar(3) }),
      laser: new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 0.1, 0.08).multiplyScalar(5), transparent: true, opacity: 0.9 }),
      cpOff: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.3, 0.1).multiplyScalar(2) }),
      cpOn: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1, 0.5).multiplyScalar(3) }),
      drone: new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.8, roughness: 0.35 }),
      eye: new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.2, 0.1).multiplyScalar(4) }),
    };
    this.buildLevel();
    this.buildBackdrop();
    // Kai, in the clothes he crashed in (block rig)
    this.kai = buildCharacter({ skin: '#c99272', hair: '#1f1914', hairStyle: 'swept', eyes: '#4a3424', height: 1.0, build: 0.6, frame: 0.4, outfit: 'runner', primary: '#30353c', secondary: '#e07a2a', pants: '#2b2d33', boots: '#2a2018', tetherArm: true });
    scene.add(this.kai.group);
    this.anim = new Animator(this.kai); this.anim.fidgetsOn = false;
    this.anim.extraLayer = (a) => this.poseLayer(a);
    this.sparks = new Particles(scene, { max: 700, additive: true, texture: 'dot' });
    this.steam = new Particles(scene, { max: 700 });
    this.dust = new Particles(scene, { max: 500 });
    this.shards = [];
    this.camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.5, 400);
    R.set(scene, this.camera);
    R.setGrade({ exposure: 1.1, bloom: [0.7, 0.55, 0.8], saturation: 1.0, contrast: 1.12, vignette: 0.5, lift: [0.02, 0.0, 0.0], gain: [1.05, 0.97, 0.9] });
    this.hud = g.ui.hud(`<div class="pf"><div class="pf-time">04:00.00</div><div class="pf-sub">STRUCTURAL FAILURE</div><div class="pf-deaths"></div><div class="pause-hint">ESC · PAUSE</div></div>`);
    this.H = { time: this.hud.querySelector('.pf-time'), deaths: this.hud.querySelector('.pf-deaths') };
    this.deaths = 0;
    this.reset(cp);
  }

  // ---------------------------------------------------------------- level geometry
  buildLevel() {
    const L = this.L, s = this.scene, M = this.mats;
    const geos = [], warn = [];
    for (const b of L.S) {
      geos.push(slab(b.x0, b.x1, Math.max(b.y0, -14), b.y1));
      if (b.y1 - Math.max(b.y0, -14) > 0.5) warn.push(slab(b.x0, b.x1, b.y1 - 0.18, b.y1 + 0.02, 1.9, 2.05)); // front edge strip
    }
    const m = new THREE.Mesh(mergeGeometries(geos), M.metal); m.castShadow = m.receiveShadow = true; s.add(m);
    const w = new THREE.Mesh(mergeGeometries(warn), new THREE.MeshStandardMaterial({ color: 0xe8b020, roughness: 0.6 })); s.add(w);
    // one-way grates
    this.oneWayM = L.oneWay.map((o) => { const g = new THREE.Mesh(slab(o.x0, o.x1, o.y - 0.25, o.y, -1.6, 1.6), M.dark); g.castShadow = true; s.add(g); return g; });
    // crumbling grates
    for (const c of L.crumble) { c.mesh = new THREE.Mesh(slab(0, c.x1 - c.x0, -0.5, 0, -1.8, 1.8), M.warn); c.mesh.position.set(c.x0, c.y, 0); c.mesh.castShadow = c.mesh.receiveShadow = true; s.add(c.mesh); }
    // saws
    for (const sw of L.saws) {
      const g = new THREE.Group();
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(sw.r, sw.r, 0.12, 24), M.saw); disc.rotation.x = Math.PI / 2; g.add(disc);
      for (let i = 0; i < 12; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 4), M.saw); const a = (i / 12) * Math.PI * 2; t.position.set(Math.cos(a) * sw.r, Math.sin(a) * sw.r, 0); t.rotation.z = a - Math.PI / 2; g.add(t); }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 10), M.dark); hub.rotation.x = Math.PI / 2; g.add(hub);
      g.position.set(sw.x, sw.y, 0.2); s.add(g); sw.mesh = g;
      const rail = new THREE.Mesh(slab(Math.min(sw.path[0], sw.path[2]) - 0.1, Math.max(sw.path[0], sw.path[2]) + 0.1, Math.min(sw.path[1], sw.path[3]) - 0.1, Math.max(sw.path[1], sw.path[3]) + 0.1, -0.2, 0), M.dark); s.add(rail);
    }
    // crushers
    for (const p of L.pistons) {
      const g = new THREE.Group();
      const head = new THREE.Mesh(slab(p.x0, p.x1, 0, 1.4, -1.9, 1.9), M.warn); head.castShadow = true; g.add(head);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 8, 10), M.saw); rod.position.set((p.x0 + p.x1) / 2, 5.4, 0); g.add(rod);
      s.add(g); p.mesh = g; p.y = p.top;
    }
    // moving platforms
    for (const mv of L.movers) { mv.mesh = new THREE.Mesh(slab(-mv.w / 2, mv.w / 2, -0.4, 0, -1.6, 1.6), M.warn); mv.mesh.castShadow = mv.mesh.receiveShadow = true; s.add(mv.mesh); mv.x = mv.x0; mv.y = mv.y0; }
    // conveyors: rollers
    for (const c of L.conveyors) { c.rollers = []; for (let x = c.x0 + 0.5; x < c.x1; x += 1) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 3.8, 8), M.saw); r.rotation.x = Math.PI / 2; r.position.set(x, c.y + 0.05, 0); s.add(r); c.rollers.push(r); } }
    // vents
    for (const v of L.vents) { const m = new THREE.Mesh(slab(v.x - 0.9, v.x + 0.9, v.y, v.y + 0.25, -1.2, 1.2), M.dark); s.add(m); const gl = new THREE.Mesh(slab(v.x - 0.7, v.x + 0.7, v.y + 0.25, v.y + 0.3, -1, 1), M.glow); s.add(gl); v.glow = gl; }
    // laser gates
    for (const l of L.lasers) { const e = new THREE.Mesh(slab(l.x - 0.3, l.x + 0.3, l.y1 - 0.4, l.y1, -1, 1), M.dark); s.add(e); l.beam = new THREE.Mesh(new THREE.BoxGeometry(0.12, l.y1 - l.y0 - 0.4, 0.12), M.laser); l.beam.position.set(l.x, (l.y0 + l.y1 - 0.4) / 2, 0); s.add(l.beam); }
    // drones
    for (const d of L.drones) {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.9), M.drone));
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.05), M.eye); eye.position.set(0, 0, 0.47); g.add(eye);
      for (const sx of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.2), M.saw); r.position.set(sx * 0.7, 0.36, 0); g.add(r); }
      s.add(g); d.mesh = g; d.x = d.x0; d.dir = 1; d.alive = true;
    }
    // checkpoints: a beacon post
    for (const c of L.checkpoints) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.4, 0.2), M.dark); post.position.set(c.x, c.y + 1.2, -1.2); s.add(post); c.lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), M.cpOff); c.lamp.position.set(c.x, c.y + 2.6, -1.2); s.add(c.lamp); }
    // the exit: a lit doorway
    { const e = this.L.exit; const fr = new THREE.Mesh(slab(e.x - 1.6, e.x + 1.6, e.y, e.y + 4, -2.2, -1.6), M.dark); s.add(fr); const door = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3.4), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.95, 0.85).multiplyScalar(2.5) })); door.position.set(e.x, e.y + 1.75, -1.55); s.add(door); const l = new THREE.PointLight(0xfff0d8, 30, 14, 1.5); l.position.set(e.x, e.y + 2, 1); s.add(l); }
    // the collapse: a churning wall of debris and fire
    { const g = new THREE.Group(); const R = Math.random;
      for (let i = 0; i < 70; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(1 + R() * 3, 1 + R() * 3, 1 + R() * 3), R() < 0.3 ? M.warn : M.metal); b.position.set(-R() * 6, -14 + R() * 50, (R() - 0.5) * 6); b.rotation.set(R() * 3, R() * 3, R() * 3); b.userData.spin = V3(R() - 0.5, R() - 0.5, R() - 0.5).multiplyScalar(3); g.add(b); }
      const glow = new THREE.PointLight(0xff6a20, 60, 30, 1.4); glow.position.set(2, 8, 4); g.add(glow);
      s.add(g); this.collapseMesh = g; g.visible = false;
    }
  }

  buildBackdrop() {
    const s = this.scene, M = this.mats;
    // far wall of machinery
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#1c1715'; g.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${60 + Math.random() * 40},${50 + Math.random() * 30},${40},0.8)`; g.fillRect(Math.random() * 1024, Math.random() * 256, 20 + Math.random() * 120, 6 + Math.random() * 18); }
    for (let i = 0; i < 18; i++) { const x = Math.random() * 1024, y = Math.random() * 256, r = 20 + Math.random() * 50; g.strokeStyle = 'rgba(90,80,70,0.7)'; g.lineWidth = 6; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillStyle = 'rgba(90,80,70,0.7)'; g.fillRect(x + Math.cos(a) * r - 4, y + Math.sin(a) * r - 4, 8, 8); } }
    for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(255,${120 + Math.random() * 80},40,${0.3 + Math.random() * 0.5})`; g.fillRect(Math.random() * 1024, Math.random() * 256, 4 + Math.random() * 10, 3 + Math.random() * 6); }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(3, 1); tex.colorSpace = THREE.SRGBColorSpace;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(520, 110), new THREE.MeshBasicMaterial({ map: tex, color: 0x9a8a80 })); wall.position.set(140, 12, -45); s.add(wall);
    // molten glow far below
    const melt = new THREE.Mesh(new THREE.PlaneGeometry(600, 80), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.35, 0.08).multiplyScalar(0.9), fog: true })); melt.rotation.x = -Math.PI / 2; melt.position.set(140, -16, -10); s.add(melt);
    // mid-ground: giant turning gears, pipes, pumping pistons
    this.gears = [];
    const gearGeo = (r, teeth) => { const parts = [new THREE.CylinderGeometry(r, r, 1, 32)]; for (let i = 0; i < teeth; i++) { const a = (i / teeth) * Math.PI * 2; const t = new THREE.BoxGeometry(r * 0.25, 1, r * 0.25); t.translate(Math.cos(a) * r, 0, Math.sin(a) * r); t.rotateY(0); parts.push(t); } const m = mergeGeometries(parts.map((p) => p.toNonIndexed())); m.rotateX(Math.PI / 2); return m; };
    for (let i = 0; i < 16; i++) {
      const r = 3 + Math.random() * 7, x = -10 + i * 20 + Math.random() * 8, y = -4 + Math.random() * 30, z = -14 - Math.random() * 16;
      const gm = new THREE.Mesh(gearGeo(r, Math.round(r * 3)), M.metal); gm.position.set(x, y, z); gm.userData.w = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.6) / r * 3; s.add(gm); this.gears.push(gm);
    }
    const pipes = [];
    for (let i = 0; i < 22; i++) { const y = -6 + Math.random() * 34, z = -6 - Math.random() * 20, x0 = -20 + Math.random() * 280, len = 20 + Math.random() * 60; const p = new THREE.CylinderGeometry(0.4 + Math.random() * 0.8, 0.4 + Math.random() * 0.8, len, 10); p.rotateZ(Math.PI / 2); p.translate(x0 + len / 2, y, z); pipes.push(p); }
    for (let i = 0; i < 14; i++) { const x = -10 + i * 22, z = -8 - Math.random() * 12, h = 40; const p = new THREE.CylinderGeometry(0.5, 0.5, h, 10); p.translate(x, 10, z); pipes.push(p); }
    const pm = new THREE.Mesh(mergeGeometries(pipes), M.dark); s.add(pm);
    this.pumps = [];
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(4, 6, 4), M.warn); m.position.set(10 + i * 38, 20, -12 - Math.random() * 8); m.userData.ph = Math.random() * 6; s.add(m); this.pumps.push(m); }
    // furnace lights along the course
    this.furnaces = [];
    for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xff7a2a, 40, 40, 1.4); l.position.set(20 + i * 50, 4 + Math.random() * 12, -6); s.add(l); this.furnaces.push(l); }
  }

  // ---------------------------------------------------------------- state
  reset(cp) {
    const L = this.L;
    const c = L.checkpoints.find((k) => k.id === cp);
    this.cp = c ? cp : 'start';
    const at = c ? { x: c.x, y: c.y } : L.start;
    this.p = { x: at.x, y: at.y, vx: 0, vy: 0, face: 1, grounded: false, coyote: 0, buffer: 0, wall: 0, wallT: 0, lockT: 0, dash: 0, dashes: 1, dashV: [0, 0], dead: false, ride: null, landT: 0 };
    this.timeLeft = c ? c.budget : 240;
    for (const k of L.checkpoints) k.lamp.material = L.checkpoints.indexOf(k) <= L.checkpoints.indexOf(c) && c ? this.mats.cpOn : this.mats.cpOff;
    for (const k of L.crumble) { k.state = 'solid'; k.t = 0; k.mesh.visible = true; k.mesh.position.set(k.x0, k.y, 0); k.mesh.rotation.set(0, 0, 0); }
    for (const d of L.drones) { d.alive = true; d.mesh.visible = true; d.x = d.x0; d.dir = 1; }
    this.collapseX = null; this.collapseMesh.visible = false;
    this.camPos = null; this.time = 0; this.ending = false; this.shake = 0;
    this.kai.group.visible = true;
  }

  start(cp) {
    const g = this.game;
    g.audio.setReverb(3.0, 2.5); g.audio.setReverbMix(0.3); g.audio.setMuffle(20000, 0.5);
    g.music.play('works', { intensity: 0.5 });
    if (this.cp === 'start') this.intro(); else { g.ui.fadeColor('#000'); g.ui.fade(0, 0.6); }
    this.machineHum = null;
  }
  async restart(cp) { this.reset(cp); }

  async intro() {
    const g = this.game, ui = g.ui;
    this.introOn = true;
    ui.fadeColor('#fff6e0'); await ui.fade(1, 0.01); ui.fade(0, 1.6);
    g.audio.rewrite(1.5);
    ui.chapterCard(5, 'RUNNING OUT OF TIME', '2.5D precision platformer', 3);
    await ui.say('ANCHOR', 'LOCAL VERSION: THE WORKS. STRUCTURAL FAILURE IN 04:00.', { duration: 2.8 });
    await ui.say('KAI', 'The field turned into a— it\'s a machine. It\'s all one machine.', { duration: 2.8 });
    ui.say('SERA', 'Kai! I\'m at the far end, by the light. It\'s folding up behind you — RUN.', { duration: 3.4 });
    ui.hint('<kbd>A</kbd><kbd>D</kbd> run · <kbd>Space</kbd> jump (hold for higher) · jump against a wall to wall-jump · <kbd>Shift</kbd> air dash (aim with <kbd>WASD</kbd>) · <kbd>S</kbd> drop through grates', 10000);
    this.introOn = false;
  }

  // ---------------------------------------------------------------- collisions
  solids() {
    const L = this.L, out = [];
    for (const b of L.S) out.push(b);
    for (const c of L.crumble) if (c.state !== 'gone') out.push({ x0: c.x0, x1: c.x1, y0: c.y - 0.5, y1: c.y, crumble: c });
    for (const p of L.pistons) out.push({ x0: p.x0, x1: p.x1, y0: p.y, y1: p.y + 1.4, piston: p });
    for (const m of L.movers) out.push({ x0: m.x - m.w / 2, x1: m.x + m.w / 2, y0: m.y - 0.4, y1: m.y, mover: m });
    return out;
  }
  overlap(x, y, b) { return x + PW / 2 > b.x0 && x - PW / 2 < b.x1 && y + PH > b.y0 && y < b.y1; }

  // ---------------------------------------------------------------- frame
  update(dt, t) {
    const g = this.game, L = this.L;
    this.time += dt;
    this.updateHazards(dt, t);
    if (!this.ending) this.updatePlayer(dt);
    this.updateCollapse(dt);
    this.updateCamera(dt);
    this.updateFx(dt, t);
    // the clock
    if (!this.ending && !this.p.dead && !this.introOn) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.timeLeft = 0; this.die('OUT OF TIME'); }
    }
    const tl = Math.max(0, this.timeLeft), mm = Math.floor(tl / 60), ss = Math.floor(tl % 60), cs = Math.floor((tl * 100) % 100);
    this.H.time.textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    this.H.time.classList.toggle('low', tl < 20);
    this.H.deaths.textContent = this.deaths ? `RESETS ${this.deaths}` : '';
    g.music.setIntensity(this.collapseX !== null ? 1 : 0.55 + clamp((60 - tl) / 60, 0, 0.4));
  }

  updatePlayer(dt) {
    const g = this.game, inp = g.input, p = this.p, A = g.audio;
    if (p.dead) { p.deadT -= dt; if (p.deadT <= 0) this.respawn(); this.anim.update(dt); return; }
    const mx = (inp.any('KeyD', 'ArrowRight') ? 1 : 0) - (inp.any('KeyA', 'ArrowLeft') ? 1 : 0) + inp.padAxis(0);
    const my = (inp.any('KeyW', 'ArrowUp') ? 1 : 0) - (inp.any('KeyS', 'ArrowDown') ? 1 : 0) - inp.padAxis(1);
    const jumpHit = inp.anyHit('Space', 'KeyK') || inp.padBtn(0) > 0.5 && !this.padJ, jumpHeld = inp.any('Space', 'KeyK') || inp.padBtn(0) > 0.5;
    this.padJ = inp.padBtn(0) > 0.5;
    const dashHit = inp.anyHit('ShiftLeft', 'ShiftRight', 'KeyJ') || (inp.padBtn(2) > 0.5 && !this.padD); this.padD = inp.padBtn(2) > 0.5;
    if (jumpHit) p.buffer = BUFFER; else p.buffer -= dt;
    p.coyote = p.grounded ? COYOTE : p.coyote - dt;
    p.lockT -= dt;
    // dash: eight directions, refreshes on ground, walls and drone hits
    if (dashHit && p.dashes > 0 && p.dash <= 0) {
      let dx = Math.sign(Math.round(mx)), dy = Math.sign(Math.round(my)); if (!dx && !dy) dx = p.face;
      const l = Math.hypot(dx, dy); p.dashV = [dx / l * DASH_V, dy / l * DASH_V * 0.85]; p.dash = DASH_T; p.dashes--;
      A.burst({ freq: 1800, freqEnd: 400, q: 0.8, dur: 0.18, vol: 0.35, buf: A.pink }); this.shake = Math.max(this.shake, 0.15);
      for (let i = 0; i < 10; i++) this.sparks.emit(V3(p.x, p.y + 0.9, 0), V3(-p.dashV[0] * 0.2 + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 0), { life: 0.3, size: 0.12, color: [0.6, 0.85, 1], alpha: 1 });
    }
    if (p.dash > 0) {
      p.dash -= dt; p.vx = p.dashV[0]; p.vy = p.dashV[1];
      if (p.dash <= 0) { p.vx *= 0.45; p.vy = p.dashV[1] > 0 ? p.vy * 0.4 : Math.min(p.vy, 0) * 0.3; }
    } else {
      // run
      const target = mx * RUN, acc = p.grounded ? ACC_G : ACC_A;
      if (p.lockT <= 0) p.vx += clamp(target - p.vx, -acc * dt, acc * dt);
      // gravity (heavier on the way down and when the jump is released: variable height)
      p.boostT = (p.boostT || 0) - dt;
      const grav = p.vy < 0 || (!jumpHeld && p.boostT <= 0) ? FALL_GRAV : GRAV; // launches keep their full height
      p.vy -= grav * dt;
      // wall slide
      if (p.wall && !p.grounded && p.vy < 0 && Math.sign(mx) === p.wall) p.vy = Math.max(p.vy, -WALL_SLIDE);
      p.vy = Math.max(p.vy, -MAX_FALL);
      // jumps
      if (p.buffer > 0) {
        if (p.coyote > 0) { p.vy = JUMP; p.buffer = 0; p.coyote = 0; p.grounded = false; A.tone({ freq: 300, freqEnd: 520, dur: 0.08, vol: 0.12 }); this.anim.vy = JUMP; }
        else if (p.wall || p.wallT > 0) { const w = p.wall || p.lastWall; p.vy = WJ_Y; p.vx = -w * WJ_X; p.lockT = WJ_LOCK; p.buffer = 0; p.face = -w; A.tone({ freq: 380, freqEnd: 640, dur: 0.08, vol: 0.12 }); A.burst({ freq: 2200, q: 1, dur: 0.05, vol: 0.2 }); for (let i = 0; i < 6; i++) this.dust.emit(V3(p.x + w * PW / 2, p.y + 0.8, 0), V3(-w * 2, Math.random() * 2, (Math.random() - 0.5) * 2), { life: 0.4, size: 0.25, grow: 1, color: [0.5, 0.45, 0.4], alpha: 0.5 }); }
      }
    }
    // conveyor and moving-platform carry
    let carryX = 0, carryY = 0;
    if (p.grounded && p.ride?.mover) { carryX = p.ride.mover.dx || 0; carryY = p.ride.mover.dy || 0; }
    if (p.grounded) for (const c of this.L.conveyors) if (p.x > c.x0 && p.x < c.x1 && Math.abs(p.y - c.y) < 0.05) carryX += c.dir * c.speed * dt;
    // integrate with axis-separated collision
    const sol = this.solids();
    const dropThrough = my < -0.5;
    const wasGround = p.grounded, prevY = p.y;
    p.x += p.vx * dt + carryX;
    p.wall = 0;
    for (const b of sol) if (this.overlap(p.x, p.y, b)) {
      if (b.piston && p.y + PH > b.y0 && p.y < b.y0 && false) continue;
      if (p.vx + carryX / Math.max(dt, 1e-4) > 0 || (p.x < (b.x0 + b.x1) / 2)) { p.x = b.x0 - PW / 2 - 0.001; } else { p.x = b.x1 + PW / 2 + 0.001; }
      p.vx = 0;
    }
    // wall contact (for slides and wall jumps)
    for (const b of sol) {
      if (p.y + PH * 0.8 > b.y0 && p.y + 0.3 < b.y1) {
        if (Math.abs(p.x + PW / 2 - b.x0) < 0.06) p.wall = 1;
        if (Math.abs(p.x - PW / 2 - b.x1) < 0.06) p.wall = -1;
      }
    }
    if (p.wall) { p.wallT = 0.1; p.lastWall = p.wall; if (!p.grounded && p.dashes < 1) p.dashes = 1; } else p.wallT -= dt;
    p.y += p.vy * dt + carryY;
    p.grounded = false; p.ride = null;
    for (const b of sol) if (this.overlap(p.x, p.y, b)) {
      if (p.vy <= 0 && prevY + 0.05 >= b.y1 - Math.max(0, carryY) - 0.3) { p.y = b.y1; p.vy = 0; p.grounded = true; p.ride = b; }
      else if (p.vy > 0) { p.y = b.y0 - PH - 0.001; p.vy = 0; }
      else { p.y = b.y1; p.grounded = true; p.ride = b; }
    }
    // one-way grates
    if (!dropThrough && p.vy <= 0) for (const o of this.L.oneWay) if (p.x + PW / 2 > o.x0 && p.x - PW / 2 < o.x1 && prevY >= o.y - 0.02 && p.y < o.y) { p.y = o.y; p.vy = 0; p.grounded = true; }
    // standing still on a ledge counts as ground even if nothing moved
    if (!p.grounded) for (const b of sol) if (p.x + PW / 2 > b.x0 + 0.02 && p.x - PW / 2 < b.x1 - 0.02 && Math.abs(p.y - b.y1) < 0.02 && p.vy <= 0) { p.grounded = true; p.ride = b; }
    if (p.grounded) {
      p.dashes = 1;
      if (!wasGround) { const imp = clamp(-this.lastVy / 26, 0, 1); this.anim.land(0.3 + imp * 0.6); A.burst({ freq: 400, freqEnd: 120, type: 'lowpass', dur: 0.08, vol: 0.2 + imp * 0.3 }); if (imp > 0.6) this.shake = Math.max(this.shake, imp * 0.3); for (let i = 0; i < 5; i++) this.dust.emit(V3(p.x, p.y + 0.1, 0), V3((Math.random() - 0.5) * 3, Math.random(), (Math.random() - 0.5) * 2), { life: 0.5, size: 0.3, grow: 1.5, color: [0.45, 0.4, 0.36], alpha: 0.5 }); }
      // crumbles start to give under your weight
      if (p.ride?.crumble && p.ride.crumble.state === 'solid') { p.ride.crumble.state = 'shaking'; p.ride.crumble.t = 0; A.burst({ pos: V3(p.x, p.y, 0), freq: 900, q: 2, dur: 0.4, vol: 0.25 }); }
    }
    this.lastVy = p.vy;
    if (Math.abs(mx) > 0.2 && p.lockT <= 0 && p.dash <= 0) p.face = Math.sign(mx);
    // hazards that kill
    if (p.y < this.L.minY) return this.die('FELL');
    for (const b of sol) if (b.piston && this.overlap(p.x, p.y, { ...b, x0: b.x0 + 0.1, x1: b.x1 - 0.1, y0: b.y0 + 0.2 }) && p.grounded) return this.die('CRUSHED');
    for (const sw of this.L.saws) { const cx = clamp(sw.mx, p.x - PW / 2, p.x + PW / 2), cy = clamp(sw.my, p.y, p.y + PH); if (Math.hypot(sw.mx - cx, sw.my - cy) < sw.r * 0.92) return this.die('SAW'); }
    for (const l of this.L.lasers) if (l.active && p.x + PW / 2 > l.x - 0.08 && p.x - PW / 2 < l.x + 0.08 && p.y < l.y1 && p.y + PH > l.y0) return this.die('LASER');
    for (const d of this.L.drones) if (d.alive && Math.abs(d.x - p.x) < 0.45 + PW / 2 && Math.abs(d.y - (p.y + PH / 2)) < 0.3 + PH / 2) {
      if (p.dash > 0 || p.vy < -2 && p.y > d.y) { // dash through it, or stomp it
        d.alive = false; d.mesh.visible = false; p.dashes = 1; p.vy = 11; p.dash = 0; p.boostT = 0.3;
        A.explosion(V3(d.x, d.y, 0), 0.4); this.shake = Math.max(this.shake, 0.4);
        for (let i = 0; i < 24; i++) this.sparks.emit(V3(d.x, d.y, 0), V3((Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 3), { life: 0.5, size: 0.15, color: [1, 0.5, 0.2], alpha: 1, gravity: 10 });
      } else return this.die('DRONE');
    }
    for (const v of this.L.vents) if (v.active && Math.abs(p.x - v.x) < 1.0 && p.y >= v.y - 0.1 && p.y < v.y + 3) { p.vy = Math.max(p.vy, v.power); p.grounded = false; p.dashes = 1; p.boostT = 0.7; }
    // checkpoints
    for (const c of this.L.checkpoints) if (Math.abs(p.x - c.x) < 1.2 && Math.abs(p.y - c.y) < 2 && this.cp !== c.id && this.L.checkpoints.indexOf(c) > this.L.checkpoints.findIndex((k) => k.id === this.cp)) {
      this.cp = c.id; c.lamp.material = this.mats.cpOn; this.timeLeft = Math.max(this.timeLeft, c.budget); g.checkpoint(c.id);
    }
    // the exit
    const E = this.L.exit; if (Math.abs(p.x - E.x) < 1.2 && Math.abs(p.y - E.y) < 1) this.finish();
    // place and animate Kai
    const k = this.kai.group; k.position.set(p.x, p.y, 0); k.rotation.y = p.face > 0 ? Math.PI / 2 : -Math.PI / 2;
    const a = this.anim;
    a.speed = p.grounded ? Math.abs(p.vx + carryX / Math.max(dt, 1e-4) * 0) : 0; a.moveAngle = 0; a.grounded = p.grounded && p.dash <= 0; a.vy = p.vy;
    a.sprint = Math.abs(p.vx) > 7.5;
    a.update(dt);
  }

  /** Extra poses: wall slide and the dash. */
  poseLayer(a) {
    const p = this.p;
    if (p.dead) return 0;
    if (p.dash > 0) {
      a.mix(B.spine, 0.6, 0, 0, 1); a.mix(B.chest, 0.3, 0, 0, 1); a.mix(B.head, -0.4, 0, 0, 1);
      a.mix(B.armL, 1.2, 0, 0.3, 1); a.mix(B.armR, 1.2, 0, -0.3, 1); a.mix(B.foreL, -0.4, 0, 0, 1); a.mix(B.foreR, -0.4, 0, 0, 1);
      a.mix(B.thighL, -1.3, 0, 0, 1); a.mix(B.shinL, 1.6, 0, 0, 1); a.mix(B.thighR, 0.3, 0, 0, 1); a.mix(B.shinR, 0.6, 0, 0, 1);
      return 40;
    }
    if (p.wall && !p.grounded && p.vy < 0) {
      // back to the wall? no: facing the wall, one hand and one foot on it
      a.mix(B.armL, -2.4, 0, 0.4, 1); a.mix(B.foreL, -0.6, 0, 0, 1); a.mix(B.armR, -1.2, 0, -0.6, 1); a.mix(B.foreR, -1.0, 0, 0, 1);
      a.mix(B.thighL, -1.0, 0, 0.1, 1); a.mix(B.shinL, 1.3, 0, 0, 1); a.mix(B.thighR, -0.2, 0, -0.1, 1); a.mix(B.shinR, 0.4, 0, 0, 1);
      a.mix(B.spine, -0.1, 0, 0, 1); a.mix(B.head, 0.1, 0.6, 0, 1);
      return 24;
    }
    return 0;
  }

  die(cause) {
    const p = this.p, A = this.game.audio;
    if (p.dead || this.ending) return;
    p.dead = true; p.deadT = 0.7; this.deaths++;
    this.kai.group.visible = false;
    A.rewrite(0.6); A.burst({ freq: 900, freqEnd: 90, type: 'lowpass', dur: 0.35, vol: 0.6 });
    this.shake = 0.6; this.game.renderer.grade.uniforms.uRewrite.value = 0.6;
    // Kai breaks into blocks
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), i % 3 ? this.mats.warn : this.mats.metal); m.position.set(p.x + (Math.random() - 0.5) * 0.5, p.y + Math.random() * PH, 0); this.scene.add(m);
      this.shards.push({ m, v: V3((Math.random() - 0.5) * 8, 3 + Math.random() * 7, (Math.random() - 0.5) * 4), t: 0 });
    }
    this.deathCause = cause;
  }
  respawn() {
    const g = this.game, cp = this.cp;
    g.renderer.grade.uniforms.uRewrite.value = 0;
    const c = this.L.checkpoints.find((k) => k.id === cp), at = c ? c : this.L.start;
    const p = this.p;
    Object.assign(p, { x: at.x, y: at.y, vx: 0, vy: 0, dead: false, dash: 0, dashes: 1, lockT: 0, grounded: true });
    if (this.timeLeft <= 0) this.timeLeft = c ? c.budget : 240;
    // the collapse resets with you
    if (this.collapseX !== null && p.x < this.L.collapse.trigger) { this.collapseX = null; this.collapseMesh.visible = false; for (const k of this.L.crumble) if (k.x0 > 196) { k.state = 'solid'; k.mesh.visible = true; k.mesh.position.set(k.x0, k.y, 0); k.mesh.rotation.set(0, 0, 0); } }
    for (const d of this.L.drones) if (!d.alive) { d.alive = true; d.mesh.visible = true; }
    this.kai.group.visible = true; this.camPos = null;
  }

  updateHazards(dt, t) {
    const L = this.L, A = this.game.audio, p = this.p;
    for (const c of L.crumble) {
      if (c.state === 'shaking') { c.t += dt; c.mesh.position.set(c.x0 + (Math.random() - 0.5) * 0.06, c.y + (Math.random() - 0.5) * 0.04, 0); if (c.t > 0.42) { c.state = 'falling'; c.t = 0; c.vy = 0; A.burst({ pos: V3(c.x0, c.y, 0), freq: 500, q: 1, dur: 0.3, vol: 0.3 }); } }
      else if (c.state === 'falling') { c.t += dt; c.vy -= 30 * dt; c.mesh.position.y += c.vy * dt; c.mesh.rotation.z += dt * 0.8; if (c.t > 1.4) { c.state = 'gone'; c.mesh.visible = false; c.t = 0; } }
      else if (c.state === 'gone' && this.collapseX === null) { c.t += dt; if (c.t > 3.5) { c.state = 'solid'; c.mesh.visible = true; c.mesh.position.set(c.x0, c.y, 0); c.mesh.rotation.set(0, 0, 0); } }
    }
    for (const s of L.saws) {
      const k = (Math.sin(((t / s.period) * Math.PI * 2)) + 1) / 2;
      s.mx = s.path[0] + (s.path[2] - s.path[0]) * k; s.my = s.path[1] + (s.path[3] - s.path[1]) * k;
      s.mesh.position.set(s.mx, s.my, 0.2); s.mesh.rotation.z -= dt * 18;
      if (Math.random() < dt * 20 && Math.abs(s.mx - p.x) < 25) this.sparks.emit(V3(s.mx, s.my - s.r, 0.2), V3((Math.random() - 0.5) * 4, Math.random() * 3, 1), { life: 0.3, size: 0.08, color: [1, 0.7, 0.3], alpha: 1, gravity: 9 });
    }
    for (const pi of L.pistons) {
      // slam down fast, hold, crawl back up
      const u = ((t + pi.phase) % pi.period) / pi.period;
      let k; if (u < 0.12) k = (u / 0.12) ** 2; else if (u < 0.35) k = 1; else k = 1 - (u - 0.35) / 0.65;
      const prev = pi.y; pi.y = pi.top - (pi.top - pi.low) * k;
      if (prev > pi.low + 0.05 && pi.y <= pi.low + 0.05 && Math.abs((pi.x0 + pi.x1) / 2 - p.x) < 30) { A.metal({ pos: V3(pi.x0, pi.low, 0), base: 120, vol: 0.4, dur: 0.6 }); A.burst({ pos: V3(pi.x0, pi.low, 0), freq: 300, freqEnd: 60, type: 'lowpass', dur: 0.2, vol: 0.6 }); if (Math.abs((pi.x0 + pi.x1) / 2 - p.x) < 10) this.shake = Math.max(this.shake, 0.3); for (let i = 0; i < 10; i++) this.dust.emit(V3(pi.x0 + Math.random() * (pi.x1 - pi.x0), pi.low + 0.1, 0), V3((Math.random() - 0.5) * 6, Math.random(), 0), { life: 0.5, size: 0.4, grow: 1, color: [0.5, 0.45, 0.4], alpha: 0.5 }); }
      pi.mesh.position.y = pi.y;
    }
    for (const m of L.movers) {
      const k = (1 - Math.cos(((t + m.phase) / m.period) * Math.PI * 2)) / 2;
      const nx = m.x0 + (m.x1 - m.x0) * k, ny = m.y0 + (m.y1 - m.y0) * k;
      m.dx = nx - m.x; m.dy = ny - m.y; m.x = nx; m.y = ny; m.mesh.position.set(nx, ny, 0);
    }
    for (const c of L.conveyors) for (const r of c.rollers) r.rotation.y += dt * c.dir * c.speed * 3;
    for (const v of L.vents) {
      const u = ((t + v.phase) % v.period) / v.period; const was = v.active; v.active = u < 0.3;
      v.glow.material = v.active ? this.mats.glow : this.mats.dark;
      if (v.active && !was && Math.abs(v.x - p.x) < 30) A.burst({ pos: V3(v.x, v.y, 0), freq: 3000, q: 0.5, dur: 0.7, vol: 0.4 });
      if (v.active || u > 0.85) for (let i = 0; i < (v.active ? 4 : 1); i++) this.steam.emit(V3(v.x + (Math.random() - 0.5) * 1.2, v.y + 0.3, (Math.random() - 0.5)), V3((Math.random() - 0.5), v.active ? 14 : 2, 0), { life: v.active ? 0.9 : 0.6, size: 0.8, grow: 3, color: [0.85, 0.85, 0.85], alpha: v.active ? 0.35 : 0.15, drag: 1.5 });
    }
    for (const l of L.lasers) { const u = ((t) % l.period) / l.period; l.active = u < l.on / l.period; l.beam.visible = l.active || u > 0.95 ? true : false; l.beam.material.opacity = l.active ? 0.95 : 0.25; }
    for (const d of L.drones) if (d.alive) { d.x += d.dir * dt * 2.4; if (d.x > d.x1) d.dir = -1; if (d.x < d.x0) d.dir = 1; d.mesh.position.set(d.x, d.y + Math.sin(t * 4 + d.x0) * 0.12, 0.2); d.mesh.rotation.y = d.dir > 0 ? 0.3 : -0.3; }
  }

  updateCollapse(dt) {
    const C = this.L.collapse, p = this.p;
    if (this.collapseX === null && p.x > C.trigger && !p.dead && !this.ending) {
      this.collapseX = C.from; this.collapseV = C.speed; this.collapseMesh.visible = true;
      this.game.audio.explosion(V3(p.x - 10, p.y, 0), 1.2); this.shake = 1.0;
      this.game.ui.say('SERA', 'It\'s coming down behind you! DON\'T LOOK BACK!', { duration: 2.4 });
    }
    if (this.collapseX === null) return;
    // steady pressure, plus a catch-up push when you get far ahead (never a sudden lunge)
    if (!this.ending && !p.dead) { this.collapseV += C.accel * dt; this.collapseX += (this.collapseV + Math.max(0, p.x - this.collapseX - 24) * 0.35) * dt; }
    this.collapseMesh.position.set(this.collapseX, 0, 0);
    for (const b of this.collapseMesh.children) if (b.userData.spin) { b.rotation.x += b.userData.spin.x * dt; b.rotation.y += b.userData.spin.y * dt; }
    // things behind the wall fall away
    for (const c of this.L.crumble) if (c.x1 < this.collapseX && c.state === 'solid') { c.state = 'falling'; c.t = 0; c.vy = 0; }
    if (Math.random() < dt * 30) this.dust.emit(V3(this.collapseX + Math.random() * 2, -10 + Math.random() * 40, (Math.random() - 0.5) * 4), V3(3 + Math.random() * 3, (Math.random() - 0.5) * 3, 0), { life: 1.5, size: 2, grow: 2, color: [0.3, 0.25, 0.22], alpha: 0.6 });
    if (!p.dead && p.x - PW / 2 < this.collapseX + 1) this.die('COLLAPSE');
    this.shake = Math.max(this.shake, clamp(0.35 - (p.x - this.collapseX) / 60, 0.05, 0.35));
  }

  updateCamera(dt) {
    const cam = this.camera, p = this.p;
    const lookAhead = clamp(p.vx * 0.32, -3, 3) + (this.collapseX !== null ? 3 : 0);
    const want = V3(p.x + lookAhead, p.y + 2.2, 21);
    if (!this.camPos) this.camPos = want.clone();
    this.camPos.x += (want.x - this.camPos.x) * (1 - Math.exp(-dt * 6));
    this.camPos.y += (want.y - this.camPos.y) * (1 - Math.exp(-dt * (Math.abs(want.y - this.camPos.y) > 3 ? 6 : 2.5)));
    this.camPos.z = want.z;
    this.shake = Math.max(0, this.shake - dt * 1.8);
    const s = this.shake * this.shake * 0.4;
    cam.position.set(this.camPos.x + (Math.random() - 0.5) * s, this.camPos.y + (Math.random() - 0.5) * s, this.camPos.z);
    cam.lookAt(this.camPos.x, this.camPos.y - 1.0, 0);
    this.key.position.set(this.camPos.x - 10, this.camPos.y + 28, 25); this.key.target.position.set(this.camPos.x, this.camPos.y - 3, 0);
    this.fill.position.set(p.x + 1.5, p.y + 2.5, 5);
  }

  updateFx(dt, t) {
    for (const g of this.gears) g.rotation.z += g.userData.w * dt;
    for (const m of this.pumps) m.position.y = 20 + Math.sin(t * 1.6 + m.userData.ph) * 4;
    for (const l of this.furnaces) l.intensity = 34 + Math.sin(t * 7 + l.position.x) * 6 + Math.random() * 4;
    for (let i = this.shards.length - 1; i >= 0; i--) { const s = this.shards[i]; s.t += dt; s.v.y -= 20 * dt; s.m.position.addScaledVector(s.v, dt); s.m.rotation.x += dt * 6; if (s.t > 1.2) { this.scene.remove(s.m); this.shards.splice(i, 1); } }
    // ambient sparks raining from above
    if (Math.random() < dt * 8) this.sparks.emit(V3(this.p.x + (Math.random() - 0.3) * 30, this.p.y + 14, -2 - Math.random() * 6), V3(0, -2, 0), { life: 2.5, size: 0.08, color: [1, 0.6, 0.25], alpha: 1, gravity: 4 });
    this.sparks.update(dt); this.steam.update(dt); this.dust.update(dt);
  }

  async finish() {
    if (this.ending) return;
    this.ending = true;
    const g = this.game, ui = g.ui;
    this.kai.group.visible = true;
    g.audio.rewrite(2); g.music.stop(1.5);
    await ui.say('SERA', 'Got you. GOT you. Through — now!', { duration: 2 });
    ui.fadeColor('#fff6e0'); await ui.fade(1, 1.2);
    await ui.say('NONE', `<i>The Works fold shut behind you. ${this.deaths ? this.deaths + ' resets.' : 'Not a single reset.'}</i>`, { duration: 2.6 });
    ui.fadeColor('#000'); await ui.fade(1, 0.6);
    g.nextChapter();
  }

  dispose() {
    this.disposed = true;
    this.game.renderer.grade.uniforms.uRewrite.value = 0;
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    this.hud?.remove();
  }
}
