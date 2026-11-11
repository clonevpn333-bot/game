// FINALE · ACT III — THE MISSING CITY. The first city the Framework ever
// drew, erased to white. Nothing fights you here. The world only has colour
// close to Rin; a PULSE (J) sends a ring of "rendering" out through the
// streets. Follow the chimes to three surviving drafts, bring the city back,
// then face the Curator and choose — by walking to a frame and holding on.
import * as THREE from 'three';
import { V, M, TEX, mesh, box, buildSky, Particles, bar } from './kit.js';
import { buildRin3D, animateRin } from '../ch7/rig.js';
import { clamp, lerp, damp, rng, makeCanvas, ease } from '../core/util.js';

const CELL = 30, HB = 11, N = 9, SPOTS = [[-105, 75], [105, -75], [75, 105]];
const MEM = [
  'I drew the first window. He erased the smudge around it. The smudge was the LIGHT.',
  'We were the drafts. He was the clean copy. Nobody told him a clean copy needs something to copy.',
  "You're a Keeper? Then keep us. That's all the word ever meant.",
];

export class City {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.name = 'THE MISSING CITY'; this.done = false; }
  help() { return '<b>W/A/S/D</b> walk · <b>SHIFT</b> run · <b>← →</b> or mouse: look · <b>J</b> pulse (reveals the city for a moment) · <b>E</b> wake a draft / hold to choose<br>The white erasers notice movement. Stand still and they drift past.'; }
  reveal(mat) { mat.onBeforeCompile = (sh) => { sh.uniforms.uP = this.uP; sh.uniforms.uR = this.uR; sh.uniforms.uPulse = this.uPulse;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvec4 wpR = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\nwpR = instanceMatrix * wpR;\n#endif\nvW = (modelMatrix * wpR).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vW; uniform vec3 uP; uniform float uR; uniform float uPulse;').replace('#include <color_fragment>', '#include <color_fragment>\nfloat dR = distance(vW.xz, uP.xz); float kR = smoothstep(uR, uR * 0.5, dR) + smoothstep(5.0, 0.0, abs(dR - uPulse)) * step(1.0, uPulse); diffuseColor.rgb = mix(vec3(0.94), diffuseColor.rgb, clamp(kR, 0.0, 1.0));').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= clamp(kR, 0.0, 1.0);'); }; return mat; }
  build() {
    const g = this.game, S = (this.scene = new THREE.Scene()); S.fog = new THREE.FogExp2('#f4f4f6', 0.06); S.background = new THREE.Color('#f4f4f6'); this.cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.2, 1200);
    this.uP = { value: V() }; this.uR = { value: 8 }; this.uPulse = { value: 0 };
    this.sky = buildSky(S); this.sky.dome.visible = false; this.sky.frames.position.set(0, 300, -200); this.sky.frames.visible = false;
    S.add(new THREE.HemisphereLight('#ffffff', '#c9c9d6', 0.95)); const sun = (this.sun = new THREE.DirectionalLight('#fff3e0', 1.6)); sun.castShadow = g.settings.shadows > 0; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 200 }); sun.shadow.bias = -0.0008; S.add(sun, sun.target);
    this.lamp = new THREE.PointLight('#ffd9a0', 22, 26, 1.6); S.add(this.lamp);
    const r = rng(41), dm = new THREE.Object3D(), col = new THREE.Color();
    // windows texture
    const wc = makeCanvas(128, 128), wx = wc.getContext('2d'); wx.fillStyle = '#fff'; wx.fillRect(0, 0, 128, 128); for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { wx.fillStyle = r.chance(0.4) ? '#ffe2a0' : '#7d8cb5'; wx.fillRect(i * 32 + 6, j * 16 + 4, 20, 9); } const wt = new THREE.CanvasTexture(wc); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.colorSpace = THREE.SRGBColorSpace;
    const ground = mesh(new THREE.PlaneGeometry(600, 600), this.reveal(new THREE.MeshStandardMaterial({ color: '#56617e', roughness: 0.8 })), 0, 0, 0, S); ground.rotation.x = -Math.PI / 2; ground.castShadow = false;
    // blocks
    this.h = []; const cnt = N * N - 1, bm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.reveal(new THREE.MeshStandardMaterial({ map: wt, roughness: 0.75, emissive: '#ffcf8a', emissiveMap: wt, emissiveIntensity: 0.5 })), cnt), rf = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.reveal(new THREE.MeshStandardMaterial({ roughness: 0.9 })), cnt * 3); let k = 0, q = 0;
    const PAL = ['#3f5196', '#8a52a8', '#2fd3c6', '#e2603a', '#e9c46a', '#d98f76', '#6fae7a', '#c06fc0', '#ff9a3c', '#5876c9'];
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { if (i === 4 && j === 4) continue; const x = (i - 4) * CELL, z = (j - 4) * CELL, hgt = 10 + r.int(0, 9) * 4 + (Math.abs(i - 4) + Math.abs(j - 4) < 3 ? 14 : 0); dm.position.set(x, hgt / 2, z); dm.rotation.set(0, 0, 0); dm.scale.set(HB * 2, hgt, HB * 2); dm.updateMatrix(); bm.setMatrixAt(k, dm.matrix); bm.setColorAt(k, col.set(r.pick(PAL))); k++;
      for (const [w, hh, ox, oz] of [[HB * 2 + 0.8, 0.8, 0, 0], [5, 3, r.range(-5, 5), r.range(-5, 5)], [1.2, r.range(3, 8), r.range(-7, 7), r.range(-7, 7)]]) { dm.position.set(x + ox, hgt + hh / 2, z + oz); dm.scale.set(w, hh, w === 5 ? 4 : w); dm.updateMatrix(); rf.setMatrixAt(q, dm.matrix); rf.setColorAt(q, col.set(r.pick(PAL)).multiplyScalar(0.8)); q++; } }
    bm.castShadow = bm.receiveShadow = true; rf.castShadow = true; S.add(bm, rf);
    // street dressing: lamps, trees, benches, crossings
    const add = (geo, color, n, fn) => { const im = new THREE.InstancedMesh(geo, this.reveal(new THREE.MeshStandardMaterial({ color, roughness: 0.8 })), n); for (let i = 0; i < n; i++) { fn(i); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); } im.castShadow = true; S.add(im); };
    const corner = (i) => { const a = Math.floor(i / 8) % 8, b = i % 8; return [(a - 3.5) * CELL + (i % 2 ? 2.6 : -2.6), (b - 3.5) * CELL + (i % 3 ? 2.6 : -2.6)]; };
    add(new THREE.CylinderGeometry(0.1, 0.14, 5, 6), '#3a4052', 64, (i) => { const [x, z] = corner(i); dm.position.set(x, 2.5, z); dm.rotation.set(0, 0, 0); dm.scale.set(1, 1, 1); });
    add(new THREE.SphereGeometry(0.35, 8, 6), '#ffd9a0', 64, (i) => { const [x, z] = corner(i); dm.position.set(x, 5.1, z); dm.scale.set(1, 1, 1); });
    add(new THREE.ConeGeometry(1.4, 3.6, 7), '#4f9f6a', 90, (i) => { const a = r.int(0, 8), b = r.int(0, 8), along = r.range(-12, 12), ns = r.chance(0.5); dm.position.set(ns ? (a - 4) * CELL + 15 + (i % 2 ? 2.8 : -2.8) : (a - 4) * CELL + along, 3.2, ns ? (b - 4) * CELL + along : (b - 4) * CELL + 15 + (i % 2 ? 2.8 : -2.8)); const s = r.range(0.7, 1.3); dm.scale.set(s, s, s); });
    add(new THREE.BoxGeometry(0.5, 0.02, 3), '#f4f6ff', 200, (i) => { const a = r.int(0, 8), b = r.int(0, 7), ns = i % 2; dm.position.set(ns ? (a - 4) * CELL + 15 : (b - 3.5) * CELL + (i % 5) * 1.2 - 2.4, 0.02, ns ? (b - 3.5) * CELL + (i % 5) * 1.2 - 2.4 : (a - 4) * CELL + 15); dm.rotation.set(0, ns ? Math.PI / 2 : 0, 0); dm.scale.set(1, 1, 1); });
    // the drafts: pencil-sketch people who never got inked
    this.res = SPOTS.map(([x, z], n) => { const pts = [], L = (a, b) => pts.push(...a, ...b), j = () => (Math.random() - 0.5) * 0.08; for (let pass = 0; pass < 3; pass++) { L([j(), 1.0 + j(), 0], [j(), 1.7 + j(), 0]); L([0, 1.6, 0], [-0.45 + j(), 1.1 + j(), 0]); L([0, 1.6, 0], [0.45 + j(), 1.15 + j(), 0]); L([0, 1.0, 0], [-0.25 + j(), 0.05, 0]); L([0, 1.0, 0], [0.25 + j(), 0.05, 0]); for (let a = 0; a < 10; a++) { const t0 = (a / 10) * 6.283, t1 = ((a + 1) / 10) * 6.283; L([Math.cos(t0) * 0.24 + j(), 1.95 + Math.sin(t0) * 0.26 + j(), 0], [Math.cos(t1) * 0.24 + j(), 1.95 + Math.sin(t1) * 0.26 + j(), 0]); } }
      const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); const G = new THREE.Group(); G.add(new THREE.LineSegments(ge, new THREE.LineBasicMaterial({ color: '#5876c9' }))); const heart = mesh(new THREE.SphereGeometry(0.12, 10, 8), M.glow('#ff9a3c', 0.6), 0, 1.35, 0.05, G); G.position.set(x, 0, z); S.add(G); return { G, heart, x, z, found: false, n }; });
    // erasers
    this.ers = [[-45, -15], [15, 45], [45, -75]].map(([x, z]) => { const G = new THREE.Group(); mesh(new THREE.SphereGeometry(1.5, 20, 14), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff', emissiveIntensity: 0.7, roughness: 0.2 }), 0, 0, 0, G); mesh(new THREE.SphereGeometry(0.36, 10, 8), new THREE.MeshBasicMaterial({ color: '#17131f' }), 0, 0, 1.3, G); G.position.set(x, 2, z); S.add(G); return { G, tx: x, tz: z }; });
    // plaza: the Curator's desk and the three frames
    const plz = (this.plz = new THREE.Group()); S.add(plz); mesh(new THREE.CylinderGeometry(10, 10, 0.3, 40), this.reveal(new THREE.MeshStandardMaterial({ color: '#e9c46a', roughness: 0.6 })), 0, 0.15, 0, plz);
    const cur = (this.cur = new THREE.Group()), cm = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.18, clearcoat: 1, sheen: 1 }); mesh(new THREE.CapsuleGeometry(0.55, 2.6, 8, 20), cm, 0, 2.2, 0, cur); for (const sx of [-0.2, 0.2]) box(0.2, 0.05, 0.05, new THREE.MeshBasicMaterial({ color: '#10121c' }), sx, 3.3, 0.52, cur); box(3.4, 0.14, 1.6, cm, 0, 1.1, 1.4, cur); for (const sx of [-1.5, 1.5]) box(0.12, 1.1, 1.4, cm, sx, 0.55, 1.4, cur); cur.position.set(0, 0.3, -4); plz.add(cur);
    this.frames = [['one', -7, '#ffffff', 'ONE FRAME'], ['seal', 0, '#2fd3c6', 'SEAL THE FRAMES'], ['open', 7, '#ff9a3c', 'LEAVE IT OPEN']].map(([kk, x, c, name]) => { const G = new THREE.Group(); for (const [w, hh, px, py] of [[3.6, 0.3, 0, 4.4], [3.6, 0.3, 0, 0.15], [0.3, 4.5, 1.65, 2.25], [0.3, 4.5, -1.65, 2.25]]) box(w, hh, 0.3, M.metal('#f4f6ff', 0.3), px, py, 0, G); const pane = mesh(new THREE.PlaneGeometry(3, 4), new THREE.MeshStandardMaterial({ color: '#111', emissive: c, emissiveIntensity: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }), 0, 2.25, 0, G); G.position.set(x, 0.3, 5.5); G.visible = false; plz.add(G); return { k: kk, G, pane, x, z: 5.5, name }; });
    this.rin = buildRin3D(TEX.paper()); S.add(this.rin); this.vell = this.ch.vell; S.add(this.vell); this.fx = new Particles(S, 500, 0.5, true);
    Object.assign(this, { p: V(-135, 0, -135), yaw: 0.8, cy: -2.3, sp: 0, t: 0, found: 0, pulseT: 9, pingT: 1, hold: 0, stage: 0, safe: V(-135, 0, -135), camPos: V(-140, 3, -140), flash: 0, end: null });
    this.ch.hud.title('FINALE · ACT III', 'THE MISSING CITY'); g.music.setIntensity(0);
    g.dialogue.say([{ who: 'rin', text: "There's nothing here." }, { who: 'vell', text: "There's EVERYTHING here. He erased it, that's all. This was the first city — where I was sketched." }, { who: 'vell', text: 'Three of the old drafts are still hiding. Listen for them. Press J and the city will show you its bones.' }]);
  }
  blocked(x, z) { const i = Math.round(x / CELL), j = Math.round(z / CELL); if (Math.abs(i) > 4 || Math.abs(j) > 4) return true; if (i === 0 && j === 0) return false; return Math.abs(x - i * CELL) < HB + 0.4 && Math.abs(z - j * CELL) < HB + 0.4; }

  update(dt) {
    const g = this.game, inp = g.input, sfx = g.sfx, p = this.p; this.t += dt; this.flash = Math.max(0, this.flash - dt * 1.5);
    if (this.end) return this.updateEnd(dt);
    if (inp.mouse.left && !inp.locked) inp.requestLock();
    this.cy += ((inp.keys.has('ArrowRight') ? 1 : 0) - (inp.keys.has('ArrowLeft') ? 1 : 0)) * 2.2 * dt + (inp.locked ? inp.mouse.dx * 0.003 : 0); inp.mouse.dx = 0;
    const iz = (inp.keys.has('KeyW') ? 1 : 0) - (inp.keys.has('KeyS') ? 1 : 0), ix = (inp.keys.has('KeyD') ? 1 : 0) - (inp.keys.has('KeyA') ? 1 : 0) || inp.padAxes?.[0] || 0, fw = V(-Math.sin(this.cy), 0, Math.cos(this.cy)), rt = V(-fw.z, 0, fw.x), want = fw.clone().multiplyScalar(iz).addScaledVector(rt, ix), mx = inp.down.dash ? 7.5 : 4;
    if (want.lengthSq() > 0.01) { want.normalize(); this.yaw = Math.atan2(want.x, want.z); this.sp = damp(this.sp, mx, 8, dt); const nx = p.x + want.x * this.sp * dt, nz = p.z + want.z * this.sp * dt; if (!this.blocked(nx, p.z)) p.x = nx; if (!this.blocked(p.x, nz)) p.z = nz; } else this.sp = damp(this.sp, 0, 10, dt);
    // pulse
    this.pulseT += dt; if (inp.pressed.attack && this.pulseT > 3) { this.pulseT = 0; sfx.play('fx.shimmer'); sfx.play('pp.chime', { pitch: 0.5 }); } this.uPulse.value = this.pulseT < 2.6 ? 1 + this.pulseT * 62 : 0;
    const base = [0.06, 0.042, 0.028, 0.012][this.found]; this.scene.fog.density = damp(this.scene.fog.density, this.pulseT < 2.6 ? base * 0.45 : base, 3, dt); this.uR.value = damp(this.uR.value, [8, 16, 30, 400][this.found], 0.8, dt);
    // drafts
    let near = null, best = 1e9; for (const R of this.res) { const d = Math.hypot(R.x - p.x, R.z - p.z); if (!R.found && d < best) { best = d; near = R; } R.G.rotation.y = Math.atan2(p.x - R.x, p.z - R.z); R.G.position.y = R.found ? Math.abs(Math.sin(this.t * 5 + R.n)) * 0.15 : 0; R.heart.material.emissiveIntensity = R.found ? 4 : 0.6 + Math.sin(this.t * 4) * 0.4 + (this.pulseT < 2.6 ? 3 : 0); }
    this.near = near; this.nearD = best;
    if (near) { this.pingT -= dt; if (this.pingT <= 0) { this.pingT = clamp(best / 40, 0.35, 2.2); const a = Math.atan2(near.x - p.x, near.z - p.z) + this.cy; sfx.play('pp.pin', { vol: clamp(1.3 - best / 110, 0.15, 1), pan: clamp(-Math.sin(a), -1, 1), pitch: 0.8 + near.n * 0.2 }); } if (best < 3) { this.prompt = 'E — WAKE THE DRAFT'; if (inp.pressed.interact) { near.found = true; this.found++; this.safe.copy(p); sfx.play('pp.chime'); sfx.play('fx.shimmer'); g.music.setIntensity(Math.min(2, this.found)); g.music.stinger(this.ch.sting); for (let i = 0; i < 60; i++) this.fx.emit(V(near.x, 1.4, near.z), V(0, 3, 0), new THREE.Color(['#ffd166', '#2fd3c6', '#ff9a3c', '#c06fc0'][i % 4]), 1.6, 9); g.dialogue.say({ 0: 'sys', 1: 'sys', 2: 'sys' }[near.n], MEM[near.n]); if (this.found === 3) { this.sky.dome.visible = true; this.sky.frames.visible = true; this.scene.background = null; this.scene.fog.color.set('#f2c9a0'); g.dialogue.say([{ who: 'vell', text: "That's all three. LOOK at it. It was never empty." }, { who: 'vell', text: 'He works in the middle of town. Come on. It ends at his desk.' }]); } } } else this.prompt = ''; } else this.prompt = '';
    // erasers: drawn to motion
    for (const E of this.ers) { const ep = E.G.position, d = Math.hypot(ep.x - p.x, ep.z - p.z), hunt = d < 34 && this.sp > 1 && this.found < 3; if (hunt) { E.tx = p.x; E.tz = p.z; } else if (Math.hypot(E.tx - ep.x, E.tz - ep.z) < 2) { E.tx = (Math.floor(Math.random() * 8) - 3.5) * CELL; E.tz = (Math.floor(Math.random() * 8) - 3.5) * CELL; } const dx = E.tx - ep.x, dz = E.tz - ep.z, L = Math.hypot(dx, dz) || 1, v = (hunt ? (g.easy ? 3.2 : 5) : 2) * dt; ep.x += (dx / L) * v; ep.z += (dz / L) * v; ep.y = 2 + Math.sin(this.t * 2 + E.tx) * 0.4; E.G.rotation.y = Math.atan2(dx, dz); if (d < 2.4 && this.found < 3) { this.flash = 1; p.copy(this.safe); sfx.play('pp.tear'); sfx.play('px.hurt'); g.dialogue.say('vell', 'Erased! ...Redrawn. They only see you MOVE. Hold still when they drift close.'); } }
    // the desk
    const dc = Math.hypot(p.x, p.z);
    if (this.found === 3 && this.stage === 0 && dc < 15) { this.stage = 1; g.dialogue.clear(); this.frames.forEach((f) => (f.G.visible = true)); g.sfx.play('pp.fold'); g.dialogue.say([{ who: 'curator', text: 'I only wanted it to hold together. It was all coming apart and nobody was TIDYING.' }, { who: 'vell', text: "He's the Framework's final render. I'm its first sketch — the draft it never deleted. We were always the same machine." }, { who: 'curator', text: 'Then let the Keeper decide. Three frames. I will abide by whichever one you hold.' }, { who: 'vell', text: "Walk to one and hold E. Whatever you pick — I'll remember you. It's the one thing I'm good at." }]); }
    if (this.stage === 1) { let at = null; for (const f of this.frames) { const d = Math.hypot(p.x - f.x, p.z - f.z); f.pane.material.emissiveIntensity = d < 2.6 ? 2.5 + Math.sin(this.t * 8) : 0.5; if (d < 2.6) at = f; } this.at = at; if (at) { this.prompt = `HOLD E — ${at.name}`; if (inp.down.interact) { this.hold += dt; if (Math.floor(this.hold * 8) !== Math.floor((this.hold - dt) * 8)) sfx.play('pp.crank'); if (this.hold > 2.4) this.choose(at.k); } else this.hold = Math.max(0, this.hold - dt * 2); } else this.hold = 0; }
    this.vell.userData.tick(this.t);
  }
  choose(k) {
    const g = this.game, S = this.scene; this.end = { k, t: 0, line: -1 }; g.dialogue.clear(); g.sfx.play('fx.boom'); g.sfx.play('fx.shimmer'); this.flash = 1; g.save.flag('ending', k); g.save.complete(18); this.ch.noPause = true; this.prompt = '';
    if (k === 'seal') { this.glass = []; const gm = new THREE.MeshPhysicalMaterial({ color: '#8ff5e3', roughness: 0.05, transmission: 0.7, transparent: true, opacity: 0.35, emissive: '#2fd3c6', emissiveIntensity: 0.35 }); for (let i = 0; i < 8; i++) for (const ns of [0, 1]) { const m = box(ns ? 0.4 : 270, 60, ns ? 270 : 0.4, gm, ns ? (i - 3.5) * CELL : 0, 30, ns ? 0 : (i - 3.5) * CELL, S); m.castShadow = false; m.scale.y = 0.001; this.glass.push(m); } }
    g.music.setIntensity(k === 'open' ? 2 : k === 'seal' ? 1 : 0);
  }
  updateEnd(dt) {
    const e = this.end, g = this.game, E = this.ch.ENDS[e.k]; e.t += dt; const k = clamp(e.t / 6, 0, 1);
    if (e.k === 'one') { this.uR.value = damp(this.uR.value, 0, 1.2, dt); this.scene.fog.density = damp(this.scene.fog.density, 0.03, 1, dt); this.scene.fog.color.lerp(new THREE.Color('#ffffff'), 0.03); this.sky.set('#ffffff', '#ffffff', '#f4f4f6', 0.03); this.res.forEach((R) => (R.G.scale.setScalar(Math.max(0.001, 1 - k)))); this.vell.scale.setScalar(Math.max(0.15, 1 - k * 0.85)); }
    else { this.uR.value = 600; this.scene.fog.density = damp(this.scene.fog.density, 0.004, 1, dt); if (e.k === 'seal') this.glass.forEach((m, i) => (m.scale.y = ease.outCubic(clamp(e.t / 4 - i * 0.03, 0.001, 1)))); else { this.sky.set('#2a3a8a', '#c06fc0', '#ffb47a', 0.03); if (Math.random() < 0.7) this.fx.emit(V(this.p.x + (Math.random() - 0.5) * 60, 30, this.p.z + (Math.random() - 0.5) * 60), V(0, -4, 0), new THREE.Color(['#ffd166', '#2fd3c6', '#ff9a3c', '#c06fc0', '#f4f6ff'][Math.floor(Math.random() * 5)]), 4, 2); this.res.forEach((R, i) => { R.G.position.x = R.x * (1 - k) + Math.cos(e.t * 0.6 + i * 2.1) * 5 * k; R.G.position.z = R.z * (1 - k) + (6 + Math.sin(e.t * 0.6 + i * 2.1) * 5) * k; }); } }
    if (e.line < 0 && e.t > 1.5) { e.line = 0; g.sfx.play('pp.chime', { pitch: 0.8 }); this.ch.hud.banner.innerHTML = `<small>${E.sub}</small>${E.name}`; this.ch.hud.banner.style.opacity = '1'; }
    if (e.t > 7.5 && !e.done) { e.done = true; this.ch.endK = e.k; this.ch.hud.banner.style.opacity = '0'; this.done = true; }
    this.vell.userData.tick(this.t);
  }
  frame(dt) {
    const g = this.game, p = this.p, t = this.t; this.uP.value.copy(p); this.rin.position.copy(p); let dy = this.yaw - this.rin.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); this.rin.rotation.y += dy * Math.min(1, dt * 12);
    const talking = g.dialogue.current; animateRin(this.rin, { speed: this.sp, ground: true, vy: 0, slide: false, climb: 0, grapple: false, strike: 0, hurt: 0, t, dt, lookAt: talking ? this.vell.position : this.near && this.nearD < 14 ? V(this.near.x, 1.6, this.near.z) : null, talk: talking?.speaker.name === 'RIN' && !talking.done });
    this.vell.position.lerp(V(p.x + Math.cos(t * 0.7) * 1.2, 2.2 + Math.sin(t * 2) * 0.15, p.z + Math.sin(t * 0.7) * 1.2), Math.min(1, dt * 3)); this.vell.rotation.y = this.cy + Math.PI;
    this.lamp.position.set(p.x, 2.4, p.z); this.fx.update(dt); for (const R of this.res) if (Math.floor(t * 8) !== Math.floor((t - dt) * 8)) R.G.children[0].rotation.z = (Math.random() - 0.5) * 0.03;
    const back = V(Math.sin(this.cy), 0, -Math.cos(this.cy)); let want = p.clone().addScaledVector(back, 6.2).add(V(0, 3, 0)), look = V(p.x, 1.6, p.z);
    if (this.end) { const k = ease.inOutCubic(clamp(this.end.t / 7, 0, 1)), a = this.end.t * 0.12; want = V(p.x + Math.sin(a) * lerp(8, 70, k), lerp(3, 46, k), p.z - Math.cos(a) * lerp(8, 70, k)); look = V(p.x * (1 - k), 4, p.z * (1 - k)); }
    this.camPos.lerp(want, 1 - Math.exp(-(this.end ? 1.6 : 7) * dt)); this.cam.position.copy(this.camPos); this.cam.lookAt(look); this.cam.aspect = g.W / g.H; this.cam.updateProjectionMatrix();
    this.sun.position.set(p.x - 30, 70, p.z - 20); this.sun.target.position.copy(p); this.sky.update(t, this.cam.position);
    const arrow = () => { if (!this.near) return ''; let a = Math.atan2(this.near.x - p.x, this.near.z - p.z) + this.cy; a = Math.atan2(Math.sin(a), Math.cos(a)); return ['↑', '↖', '←', '↙', '↓', '↘', '→', '↗'][(Math.round(a / (Math.PI / 4)) + 8) % 8]; };
    if (!this.end) this.ch.hud.set(this.prompt || (this.found < 3 ? `Find the drafts — ${this.found} / 3` : this.stage ? 'Choose a frame' : 'Go to the middle of the city'), [bar('PULSE', Math.min(1, this.pulseT / 3), 8), this.near ? `<kbd>${arrow()}</kbd>A DRAFT · ${Math.round(this.nearD)} m` : '<kbd>♥</kbd>ALL THREE AWAKE', ...(this.at ? [bar('HOLD', this.hold / 2.4, 12)] : [])]); else this.ch.hud.set('', []);
    this.ch.hud.big.innerHTML = '';
    const f = this.flash; return { scene: this.scene, cam: this.cam, fx: { bloom: 0.45 + f * 3, threshold: 1.15, vig: 0.38, sat: this.end?.k === 'one' ? lerp(1.05, 0.15, clamp(this.end.t / 6, 0, 1)) : 1.08, grain: 0.03, con: 1.03 } };
  }
}
