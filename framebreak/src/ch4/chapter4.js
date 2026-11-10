// CHAPTER 4 — DOMINO CITY. Isometric diorama, rigid-body chain reactions.
// You do not control Rin's legs here: you operate the city's machinery
// (crane, drum, conveyor, barrel, magnets) and Rin walks wherever the
// physics opens a path. Real simulation (cannon-es), multiple solutions.
import * as THREE from 'three';
import * as C from 'cannon-es';
import { getRenderer } from '../ch3/chapter3.js';
import { clamp, lerp, damp, ease, makeCanvas, rng } from '../core/util.js';

const el = (cls, html = '') => { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; return e; };
const mats = {};
const mat = (color, rough = 0.6, metal = 0.1, emissive = null) => { const k = color + rough + metal + emissive; if (!mats[k]) mats[k] = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive: emissive || '#000', emissiveIntensity: emissive ? 1.2 : 0 }); return mats[k]; };
const bar = (n) => Array.from({ length: n }, (_, i) => i);
const SONG = (() => {
  const bars = {}, ch = [['A2', 'A4 C5 E5 A5'], ['F2', 'F4 A4 C5 F5'], ['G2', 'G4 B4 D5 G5'], ['E2', 'E4 G#4 B4 E5']];
  const mel = ['A4 . . E5 . . D5 . C5 . D5 . E5 . . .', 'C5 . . A4 . . F4 . A4 . C5 . F5 . E5 .', 'D5 . . B4 . . G4 . B4 . D5 . G5 . . .', 'E5 . . C5 . . A4 . B4 . . . G#4 . B4 .'];
  const A = bar(4).map((i) => { const [b, a] = ch[i], n = a.split(' '); bars['a' + i] = { bass: `${b} . ${b} . . ${b} . . ${b} . ${b} . . . ${b} .`, arp: `${n[0]} ${n[2]} ${n[1]} ${n[3]} ${n[2]} ${n[0]} ${n[3]} ${n[1]} ${n[0]} ${n[2]} ${n[1]} ${n[3]} ${n[2]} ${n[0]} ${n[3]} ${n[1]}`, drums: i === 3 ? 'k . x z k . s x . x k z s x s z' : 'k . x . s . x z . x k . s . x z', bell: mel[i] }; return 'a' + i; });
  return { bpm: 118, gain: 0.95, reverb: 0.2, start: 'A', tracks: { bass: { inst: 'acid', vol: 0.8 }, arp: { inst: 'marimba', vol: 0.5, pan: 0.3, send: 0.3 }, bell: { inst: 'bell', vol: 0.5, pan: -0.2, send: 0.5, layer: 1 }, drums: { kit: 'electro', vol: 0.8 } }, bars, sections: { A }, next: { A: 'A' } };
})();
export { SONG as SONG_CH4 };

export default class Chapter4 {
  constructor(game) { this.game = game; this.id = 4; this.compositesOutgoing = true; }
  async load() {}
  controlsHelp() { return '<b>1–6</b> or <b>W/S</b> select a machine · <b>A/D</b> swing the crane · <b>SPACE / E</b> operate · <b>R</b> reset the board<br>Open a route for Rin. There is more than one way.'; }

  start({ handoff }) {
    const g = this.game; this.r = getRenderer(g); this.r.shadowMap.enabled = g.settings.shadows > 0; this.r.toneMappingExposure = 1.1;
    this.t = 0; this.sel = 0; this.said = {}; this.fin = null; this.noPause = false; this.shake = 0; this.booms = [];
    this.ui = el('hud3'); this.panel = el('mach'); this.dlg = el('dlg dark', '<div class="who"></div><div class="txt"></div>'); this.banner = el('banner', '<small>CHAPTER 4</small>DOMINO CITY'); this.ui.append(this.panel, this.dlg, this.banner); g.ui.appendChild(this.ui);
    this.build(); g.show3d(true);
    if (handoff) g.fadeFrozen(1200, () => g.director.releaseOutgoing()); else g.clear2d();
    g.audio.muffle(0); g.music.play(SONG, { intensity: 1, fade: 1 });
    setTimeout(() => { this.banner.style.opacity = '1'; setTimeout(() => (this.banner.style.opacity = '0'), 3000); }, 600);
    g.dialogue.say([{ who: 'vell', text: "We're tiny! And you're stuck on that ledge. I can't push you..." }, { who: 'vell', text: '...but this whole city is levers. Pick a machine and make something fall over.' }]);
    g.director.preload(5);
  }
  stop() { this.ui?.remove(); this.game.show3d(false); this.game.gl.style.imageRendering = ''; this.scene = null; }
  respawn() { this.build(); }

  // ---- world -------------------------------------------------------------------
  build() {
    const g = this.game, S = (this.scene = new THREE.Scene()); S.background = new THREE.Color('#1d2440'); S.fog = new THREE.Fog('#1d2440', 90, 190);
    const W = (this.world = new C.World({ gravity: new C.Vec3(0, -22, 0) })); W.allowSleep = true; W.solver.iterations = 12; W.defaultContactMaterial.friction = 0.45; W.defaultContactMaterial.restitution = 0.05;
    this.bodies = []; this.machines = []; this.conv = null; this.trainGo = 0; this.smashed = false;
    S.add(new THREE.HemisphereLight('#bcd3ff', '#3a2f4a', 0.9));
    const sun = new THREE.DirectionalLight('#ffe2b8', 2.4); sun.position.set(-30, 50, 25); sun.castShadow = g.settings.shadows > 0; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 35, bottom: -35, near: 1, far: 140 }); sun.shadow.bias = -0.0008; S.add(sun);
    this.cam = new THREE.OrthographicCamera(-32, 32, 18, -18, 1, 300); this.cam.position.set(40, 44, 40); this.cam.lookAt(0, 0, 0);
    this.cam2 = new THREE.PerspectiveCamera(30, 16 / 9, 0.2, 400);
    const stat = (x, y, z, w, h, d, m, o = {}) => this.box(x, y, z, w, h, d, m, 0, o), dyn = (x, y, z, w, h, d, m, mass, o = {}) => this.box(x, y, z, w, h, d, m, mass, o);
    // ground: two banks with a canal between x -12..-8
    const asphalt = mat('#3d4560', 0.95), conc = mat('#8b93a8', 0.9);
    stat(-22, -2, 0, 20, 4, 40, conc); stat(8, -2, 0, 32, 4, 40, conc); stat(26.5, -2, 0, 5, 4, 40, conc);
    stat(-22, 0.03, 2, 20, 0.06, 3, asphalt, { noBody: true }); stat(9, 0.03, 2, 34, 0.06, 3, asphalt, { noBody: true });
    const water = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 40), mat('#2fd3c6', 0.2, 0.3, '#0e4f66')); water.position.set(-10, -3, 0); S.add(water);
    // city dressing (static, no bodies)
    const r = rng(8), cols = ['#52609a', '#6a738f', '#7d4a5c', '#3f5196', '#8a5a44'];
    for (let i = 0; i < 38; i++) { const x = r.range(-30, 27), z = r.chance(0.5) ? r.range(-19, -9) : r.range(9, 19); if (x > -13 && x < -7) continue; const w = r.range(2, 4.5), h = z > 0 ? r.range(1, 2.4) : r.range(2, 9), d = r.range(2, 4); stat(x, h / 2, z, w, h, d, mat(r.pick(cols), 0.8), { noBody: true }); const win = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.25, d + 0.05), mat('#ffd166', 0.5, 0, '#ffb23c')); for (let k = 1; k < h - 0.5; k += 1.2) { const m2 = win.clone(); m2.position.set(x, k, z); S.add(m2); } if (r.chance(0.4)) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 4, 10), mat('#454c63', 0.7, 0.4)); st.position.set(x, h + 2, z); st.castShadow = true; S.add(st); } }
    // --- stage A: dominoes + the bridge slab
    const dm = [mat('#e2603a', 0.5), mat('#ff9a3c', 0.5), mat('#ffd166', 0.5), mat('#2fd3c6', 0.5)];
    this.doms = [-20.5, -18.3, -16.1].map((x, i) => dyn(x, 2.5, 2, 0.6, 5, 3, dm[i], 40));
    this.slab = dyn(-13.2, 3.3, 2, 0.7, 6.6, 3, dm[3], 70); this.cleared = 0;
    // constrained simulation: each slab is hinged on its base edge, falls under gravity and strikes the next
    this.hinged = [...this.doms, this.slab].map((b, i) => { const h = i === 3 ? 6.6 : 5, t = i === 3 ? 0.7 : 0.6, H = { b, h, t, px: b.position.x + t / 2, th: 0, w: 0, on: false, rest: i === 3 ? Math.PI / 2 - 0.02 : 1.2 }; b.type = C.Body.KINEMATIC; b.updateMassProperties(); b.addEventListener('collide', (e) => { if (!H.on && e.body.type === C.Body.DYNAMIC && e.body.position.x < H.px && e.body.velocity.length() + Math.abs(e.contact.getImpactVelocityAlongNormal()) > 1.5) { H.on = true; H.w = 0.9; g.sfx.play('pp.thunk'); } }); return H; });
    // crane with a wrecking ball
    const cb = { x: -20, z: -6.5, a: 0.9, va: 0, len: 9.5 };
    stat(cb.x, 3.5, cb.z, 1.2, 7, 1.2, mat('#ffd166', 0.5, 0.3), { noBody: true });
    cb.arm = new THREE.Group(); cb.arm.position.set(cb.x, 7.2, cb.z); const am = new THREE.Mesh(new THREE.BoxGeometry(cb.len + 2, 0.6, 0.6), mat('#ffd166', 0.5, 0.3)); am.position.x = cb.len / 2 - 1; am.castShadow = true; cb.arm.add(am); S.add(cb.arm);
    cb.tip = new C.Body({ type: C.Body.KINEMATIC, position: new C.Vec3(cb.x, 7.2, cb.z) }); cb.tip.allowSleep = false; W.addBody(cb.tip);
    cb.ball = this.sphere(cb.x + cb.len * Math.cos(cb.a), 2.2, cb.z - cb.len * Math.sin(cb.a), 1.1, mat('#2b3040', 0.3, 0.9), 90); cb.ball.linearDamping = 0.05;
    W.addConstraint(new C.DistanceConstraint(cb.tip, cb.ball, 5)); cb.rope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 5), mat('#c9d1e6')); S.add(cb.rope); this.crane = cb;
    // drum on a ramp, held by a chock
    const ramp = stat(-28.5, 1.2, 2, 6, 0.4, 3, mat('#6a738f', 0.6, 0.5)); ramp.quaternion.setFromEuler(0, 0, -0.32); ramp.mesh.rotation.z = -0.32;
    this.drum = this.cyl(-30, 4.2, 2, 1.7, 2.6, mat('#c2362f', 0.4, 0.5), 260); this.chock = stat(-27.6, 2.9, 2, 0.4, 2.4, 3, mat('#ffd166'));
    // --- stage B: brick wall, conveyor, barrel, magnet + crate
    const bm = [mat('#b8704f', 0.9), mat('#8a4a44', 0.9)]; this.bricks = [];
    for (let y = 0; y < 4; y++) for (let z = 0; z < 8; z++) this.bricks.push(dyn(4, 0.5 + y, -1.5 + z + (y % 2 ? 0.25 : 0), 1, 1, 1, bm[(y + z) % 2], 6));
    stat(-1, 0.25, -3.2, 9, 0.5, 2, mat('#2b3040', 0.5, 0.6)); this.conv = { x0: -5.5, x1: 3.5, z: -3.2, on: false, stripes: [] };
    for (let i = 0; i < 9; i++) { const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 1.8), mat('#ffd166', 0.5, 0, '#b07a10')); s2.position.set(-5 + i, 0.53, -3.2); S.add(s2); this.conv.stripes.push(s2); }
    this.barrel = this.cyl(-4.5, 1.3, -3.2, 0.6, 1.4, mat('#e2603a', 0.4, 0.3, '#5a1505'), 8); this.barrel.mesh.rotation.x = 0; this.barrel.live = true;
    this.mag1 = this.magnet(4, 10, 2, dyn(4, 8.5, 2, 2.4, 2.4, 2.4, mat('#3f5196', 0.5, 0.5), 160));
    // --- stage C: container stack on the tracks, train, switch, ball drop
    const cm = [mat('#2fa39a', 0.5, 0.4), mat('#c06fc0', 0.5, 0.4), mat('#e2603a', 0.5, 0.4)]; this.stack = [0, 1, 2].map((i) => dyn(20, 1.25 + i * 2.5, 2, 2.6, 2.5, 5, cm[i], 60));
    for (const x of [19.2, 20.8]) stat(x, 0.1, -3, 0.2, 0.2, 34, mat('#c9d1e6', 0.3, 0.9), { noBody: true });
    this.train = dyn(20, 1.4, -16, 2.4, 2.6, 6, mat('#ffd166', 0.4, 0.5), 900); this.train.type = C.Body.KINEMATIC; this.train.updateMassProperties();
    this.sw = stat(12, 1, -6, 1.6, 2, 0.5, mat('#c2362f', 0.4, 0.2, '#5a0a05')); this.sw.addEventListener('collide', (e) => { if (Math.abs(e.contact.getImpactVelocityAlongNormal()) > 1.5) this.launchTrain(); });
    const chute = stat(12, 3.4, -11.5, 2, 0.3, 9, mat('#6a738f', 0.5, 0.5)); chute.quaternion.setFromEuler(0.5, 0, 0); chute.mesh.rotation.x = 0.5; for (const sx of [-1.1, 1.1]) { const w2 = stat(12 + sx, 3.9, -11.5, 0.2, 1, 9, mat('#454c63')); w2.quaternion.setFromEuler(0.5, 0, 0); w2.mesh.rotation.x = 0.5; }
    this.mag2 = this.magnet(12, 9.5, -14.6, this.sphere(12, 8.3, -14.6, 0.9, mat('#c9d1e6', 0.2, 1), 60));
    // exit tunnel
    stat(27, 2.2, 2, 4, 4.4, 5, mat('#2b3040', 0.8)); const hole = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 2.4), mat('#000', 1)); hole.position.set(24.95, 1.5, 2); S.add(hole);
    // Rin + Vell miniatures
    const rin = (this.rin = new THREE.Group()); const pc = (w, h, d, c, y, x = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, 0.7)); m.position.set(x, y, 0); m.castShadow = true; rin.add(m); return m; };
    pc(0.5, 0.6, 0.35, '#2fd3c6', 0.8); pc(0.5, 0.45, 0.45, '#ffd0a4', 1.35); pc(0.56, 0.2, 0.5, '#f4f6ff', 1.62); pc(0.6, 0.14, 0.4, '#ff9a3c', 1.1); this.legs = [pc(0.2, 0.5, 0.25, '#3f5196', 0.25, 0), pc(0.2, 0.5, 0.25, '#3f5196', 0.25, 0)]; this.legs[0].position.z = 0.14; this.legs[1].position.z = -0.14; S.add(rin);
    this.rp = { x: -24.8, y: 0, z: 6.5, stuck: 0 };
    this.vell = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat('#c06fc0', 0.4, 0, '#5e3a82')); S.add(this.vell);
    this.machines = [
      { name: 'CRANE', hint: 'A / D — swing', pos: [cb.x, 8, cb.z] },
      { name: 'DRUM CHOCK', hint: 'SPACE — release', pos: [-28.4, 3, 2], act: () => { if (this.chock) { W.removeBody(this.chock); S.remove(this.chock.mesh); this.chock = null; this.drum.wakeUp(); this.drum.velocity.set(13, 0, 0); g.sfx.play('pp.thunk'); } } },
      { name: 'CONVEYOR', hint: 'SPACE — on / off', pos: [-1, 1, -3.2], act: () => { this.conv.on = !this.conv.on; g.sfx.play('ink.crank'); } },
      { name: 'BARREL', hint: 'SPACE — detonate', pos: null, act: () => this.detonate() },
      { name: 'MAGNET A', hint: 'SPACE — drop', pos: [4, 10, 2], act: () => this.mag1.drop() },
      { name: 'MAGNET B', hint: 'SPACE — drop', pos: [12, 9.5, -14.6], act: () => this.mag2.drop() },
    ];
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.12, 8, 32), new THREE.MeshBasicMaterial({ color: '#ff9a3c' })); this.ring.rotation.x = Math.PI / 2; S.add(this.ring);
    this.drawPanel();
  }
  box(x, y, z, w, h, d, m, mass, o = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; this.scene.add(mesh);
    if (o.noBody) return { mesh, quaternion: { setFromEuler() {} } };
    const b = new C.Body({ mass, shape: new C.Box(new C.Vec3(w / 2, h / 2, d / 2)), position: new C.Vec3(x, y, z) }); b.sleepSpeedLimit = 0.3; b.mesh = mesh; this.world.addBody(b); if (mass) this.bodies.push(b); return b;
  }
  sphere(x, y, z, r, m, mass) { const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m); mesh.castShadow = true; this.scene.add(mesh); const b = new C.Body({ mass, shape: new C.Sphere(r), position: new C.Vec3(x, y, z) }); b.mesh = mesh; this.world.addBody(b); this.bodies.push(b); return b; }
  cyl(x, y, z, r, len, m, mass) { // axis along z
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 18), m); mesh.castShadow = true; this.scene.add(mesh);
    const b = new C.Body({ mass, position: new C.Vec3(x, y, z) }); const q = new C.Quaternion(); q.setFromEuler(Math.PI / 2, 0, 0); b.addShape(new C.Cylinder(r, r, len, 14), new C.Vec3(), q); b.mesh = mesh; b.cylFix = true; this.world.addBody(b); this.bodies.push(b); return b;
  }
  magnet(x, y, z, body) {
    const g = new THREE.Group(); const m1 = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 0.5, 20), mat('#c2362f', 0.4, 0.6)); g.add(m1); const pole = new THREE.Mesh(new THREE.BoxGeometry(0.3, 30, 0.3), mat('#454c63')); pole.position.y = 15; g.add(pole); g.position.set(x, y + 0.4, z); this.scene.add(g);
    body.type = C.Body.KINEMATIC; body.updateMassProperties(); const M = { held: body, drop: () => { if (!M.held) return; M.held.type = C.Body.DYNAMIC; M.held.updateMassProperties(); M.held.wakeUp(); M.held = null; this.game.sfx.play('px.clank'); } }; return M;
  }
  detonate(b = this.barrel) {
    if (!b || !b.live) return; b.live = false; const p = b.position.clone(), g = this.game; this.world.removeBody(b); this.scene.remove(b.mesh); this.bodies.splice(this.bodies.indexOf(b), 1); if (b === this.barrel) this.barrel = null;
    for (const o of this.bodies) { const d = o.position.vsub(p), L = d.length(); if (L < 8 && o.type === C.Body.DYNAMIC) { d.normalize(); d.y += 0.6; o.wakeUp(); o.applyImpulse(d.scale(o.mass * 16 * (1 - L / 8))); } }
    const f = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true })); f.position.copy(p); this.scene.add(f); this.booms.push({ f, t: 0 }); this.shake = 1; g.sfx.play('fx.boom'); g.sfx.play('px.explode');
  }
  launchTrain() { if (this.trainGo) return; this.trainGo = 0.001; this.stack.forEach((b) => b.wakeUp()); this.game.sfx.play('px.horn'); this.game.dialogue.say('vell', 'That did it — TRAIN!'); }
  drawPanel() { this.panel.innerHTML = this.machines.map((m, i) => `<div class="${i === this.sel ? 'sel' : ''}"><kbd>${i + 1}</kbd>${m.name}${i === this.sel ? `<small>${m.hint}</small>` : ''}</div>`).join('') + '<div><kbd>R</kbd>RESET BOARD</div>'; }

  // ---- update --------------------------------------------------------------------
  update(dt, outgoing) {
    if (outgoing || !this.scene) return; const g = this.game, inp = g.input, W = this.world; this.t += dt;
    if (!this.fin) {
      for (let i = 0; i < 6; i++) if (inp.keys.has('Digit' + (i + 1)) && this.sel !== i) { this.sel = i; this.drawPanel(); g.sfx.play('ui.move'); }
      const dy = (inp.pressed.down ? 1 : 0) - (inp.pressed.up ? 1 : 0); if (dy) { this.sel = (this.sel + dy + 6) % 6; this.drawPanel(); g.sfx.play('ui.move'); }
      if (inp.keys.has('KeyR') && !this.rHeld) { this.rHeld = true; g.sfx.play('ui.back'); this.build(); return; } if (!inp.keys.has('KeyR')) this.rHeld = false;
      const m = this.machines[this.sel];
      if ((inp.pressed.jump || inp.pressed.interact) && m.act) m.act();
      if (this.sel === 0) this.crane.va += inp.axisX * -2.6 * dt;
    }
    // crane
    const cb = this.crane; cb.va *= 1 - 2.2 * dt; cb.a += cb.va * dt; const tx = cb.x + cb.len * Math.cos(cb.a), tz = cb.z - cb.len * Math.sin(cb.a);
    cb.tip.velocity.set((tx - cb.tip.position.x) / dt, 0, (tz - cb.tip.position.z) / dt); cb.arm.rotation.y = cb.a;
    // conveyor
    const cv = this.conv; if (cv.on) { for (const b of this.bodies) if (b.position.x > cv.x0 && b.position.x < cv.x1 + 0.4 && Math.abs(b.position.z - cv.z) < 1.3 && b.position.y < 2.4) { b.wakeUp(); b.velocity.x = lerp(b.velocity.x, 3.2, 0.2); } cv.stripes.forEach((s, i) => (s.position.x = -5.4 + ((i + this.t * 3.2) % 9))); }
    // train
    if (this.trainGo > 0) { this.trainGo += dt; const tr = this.train; if (this.trainGo < 2.2) { tr.allowSleep = false; tr.wakeUp(); tr.velocity.set(0, 0, 22); if (!this.smashed && tr.position.z > -3.6) { this.smashed = true; this.stack.forEach((b, i) => { b.wakeUp(); b.velocity.set((i - 1) * 5, 5 + i * 4, 24); b.angularVelocity.set(3 - i * 2, i, 2); }); this.shake = 1; g.sfx.play('fx.boom'); g.sfx.play('px.explode'); } } else { tr.velocity.set(0, 0, 0); } if (this.trainGo < 0.1) this.shake = 0.6; }
    // barrel: hard knocks set it off
    if (this.barrel && this.barrel.live && !this.barrel.armed) { this.barrel.armed = true; this.barrel.addEventListener('collide', (e) => { if (Math.abs(e.contact.getImpactVelocityAlongNormal()) > 9) this.pendingBoom = true; }); }
    if (this.pendingBoom) { this.pendingBoom = false; this.detonate(); }
    // once the big slab is down across the canal, the spent dominoes shatter out of the way
    this.hinged.forEach((H, i) => { if (!H.on || H.th >= H.rest) return; H.w += (22 / H.h) * 1.5 * Math.sin(H.th + 0.06) * dt; H.th = Math.min(H.rest, H.th + H.w * dt); const c = Math.cos(H.th), sn = Math.sin(H.th); H.b.position.set(H.px - (H.t / 2) * c + (H.h / 2) * sn, (H.t / 2) * sn + (H.h / 2) * c, 2); H.b.quaternion.setFromEuler(0, 0, -H.th); H.b.aabbNeedsUpdate = true; H.b.updateAABB(); const nx = this.hinged[i + 1]; if (nx && !nx.on && H.th > 0.42) { nx.on = true; nx.w = 1.1; g.sfx.play('pp.thunk', { pitch: 1 + i * 0.12 }); } if (H.th >= H.rest) { g.sfx.play('px.slam', { vol: i === 3 ? 1 : 0.5 }); this.shake = i === 3 ? 0.8 : 0.3; } });
    if (this.doms.length && this.hinged[3].th > 1.5) { this.cleared += dt; if (this.cleared > 1.2) { for (const d of this.doms) { const f = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true })); f.position.copy(d.position); this.scene.add(f); this.booms.push({ f, t: 0.25 }); W.removeBody(d); this.scene.remove(d.mesh); this.bodies.splice(this.bodies.indexOf(d), 1); } this.doms = []; g.sfx.play('px.crumble'); } }
    W.step(1 / 60, dt, 3);
    for (const b of this.bodies) { b.mesh.position.copy(b.position); b.mesh.quaternion.copy(b.quaternion); if (b.cylFix) b.mesh.rotateX(Math.PI / 2); if (b.position.y < -30) b.position.y = -1000; }
    const bp = cb.ball.position, tp = cb.tip.position, mid = new THREE.Vector3((bp.x + tp.x) / 2, (bp.y + tp.y) / 2, (bp.z + tp.z) / 2), dv = new THREE.Vector3(bp.x - tp.x, bp.y - tp.y, bp.z - tp.z); cb.rope.position.copy(mid); cb.rope.scale.y = dv.length(); cb.rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dv.normalize());
    for (const b of this.booms) { b.t += dt; b.f.scale.setScalar(1 + b.t * 22); b.f.material.opacity = 1 - b.t * 2.2; } this.booms = this.booms.filter((b) => { if (b.t > 0.45) { this.scene.remove(b.f); return false; } return true; });
    this.walkRin(dt);
    if (this.fin) this.updateFinale(dt);
    this.shake = Math.max(0, this.shake - dt * 1.5);
  }
  // Rin walks whenever the physics has left a walkable surface ahead.
  walkRin(dt) {
    const p = this.rp, W = this.world, g = this.game; if (this.fin && this.fin.t > 0.5) return;
    const ray = (x0, y0, z0, x1, y1, z1) => { const res = new C.RaycastResult(); W.raycastClosest(new C.Vec3(x0, y0, z0), new C.Vec3(x1, y1, z1), { skipBackfaces: true }, res); return res.hasHit ? res : null; };
    // first: step off the ledge onto the road line (z = 2)
    let dirx = 1, dirz = 0; if (p.z > 2.05 && p.x < -22.5) { dirx = 0.4; dirz = -1; }
    const nx = p.x + dirx * 0.7, nz = p.z + dirz * 0.7, down = ray(nx, p.y + 1.5, nz, nx, p.y - 2.5, nz), fwd = ray(p.x, p.y + 1.1, p.z, p.x + dirx * 0.9, p.y + 1.1, p.z + dirz * 0.9), head = ray(p.x, p.y + 1.7, p.z, p.x + dirx * 0.7, p.y + 1.7, p.z + dirz * 0.7);
    const ok = down && !fwd && !head && down.hitPointWorld.y - p.y < 1.3 && down.hitPointWorld.y > -1.2;
    if (ok) { const sp = 3.2 * dt; p.x += dirx * sp; p.z += dirz * sp; p.z = dirz ? Math.max(2, p.z) : damp(p.z, 2, 4, dt); const here = ray(p.x, p.y + 1.5, p.z, p.x, p.y - 2.5, p.z); if (here) p.y = damp(p.y, here.hitPointWorld.y, 14, dt); p.stuck = 0; p.walk = (p.walk || 0) + dt * 10; }
    else p.stuck += dt;
    this.rin.position.set(p.x, p.y, p.z); this.rin.rotation.y = dirz ? 0.9 : 0; this.legs[0].position.x = ok ? Math.sin(p.walk) * 0.18 : 0; this.legs[1].position.x = ok ? -Math.sin(p.walk) * 0.18 : 0;
    this.vell.position.set(p.x - 0.9, p.y + 2.4 + Math.sin(this.t * 2.4) * 0.25, p.z + 0.6); this.vell.rotation.y = this.t;
    const say = (k, x, lines) => { if (!this.said[k] && p.x > x) { this.said[k] = true; g.dialogue.say(lines); } };
    if (p.stuck > 9 && !this.said.h1 && p.x < -20) { this.said.h1 = true; g.dialogue.say('vell', 'Those slabs are dominoes. Swing the crane into the first one — or let the drum roll.'); }
    say('b', -7, [{ who: 'vell', text: 'A bridge! Made of somebody else\'s wall. Next: THAT wall.' }, { who: 'vell', text: 'Conveyor, barrel, magnet... any of those ought to do something loud.' }]);
    say('c', 6, [{ who: 'rin', text: 'The Curator would call this a mess.' }, { who: 'vell', text: 'It IS a mess. It also works. Now: hit that red switch with something heavy.' }]);
    if (p.x > 23.5 && !this.fin) this.startFinale();
  }

  // ---- ISOMETRIC → FIRST PERSON ------------------------------------------------------
  startFinale() {
    const g = this.game; this.fin = { t: 0 }; this.noPause = true; this.panel.style.display = 'none'; g.dialogue.clear(); g.sfx.play('fx.rise'); g.music.setIntensity(1);
    g.dialogue.say([{ who: 'curator', text: 'Enough. If you love machinery so much — have ALL of it.' }, { who: 'vell', text: 'Everything just switched on at once. Into the tunnel! GO!' }]);
    // the whole city operates at once
    this.conv.on = true; this.mag1.drop(); this.mag2.drop(); this.launchTrain(); this.crane.va = 5;
    for (let i = 0; i < 46; i++) { const b = this.box(-20 + Math.random() * 40, 20 + Math.random() * 30, -8 + Math.random() * 18, 1.2, 1.2, 1.2, mat(['#e2603a', '#ffd166', '#2fd3c6', '#c06fc0'][i % 4], 0.5), 8); b.angularVelocity.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); }
  }
  updateFinale(dt) {
    const f = this.fin, g = this.game; f.t += dt; this.crane.va += dt * 3; if (Math.random() < dt * 2.5 && f.t < 5) { const b = this.bodies[Math.floor(Math.random() * this.bodies.length)]; if (b && b.type === C.Body.DYNAMIC) { b.wakeUp(); b.applyImpulse(new C.Vec3((Math.random() - 0.5) * 40 * b.mass / 8, 14 * b.mass, (Math.random() - 0.5) * 40 * b.mass / 8)); this.shake = 0.5; g.sfx.play('px.explode', { vol: 0.5 }); } }
    this.rp.x += dt * 1.2; f.k = ease.inOutCubic(clamp((f.t - 1) / 5, 0, 1));
    g.audio.muffle(f.k * 0.5);
    if (f.t > 6.6) f.snap = true;
  }

  render(dt) {
    if (!this.scene) return; const g = this.game, r = this.r, p = this.rp, f = this.fin;
    // detail collapses as the camera dives (the picture literally loses resolution)
    const pix = f ? Math.round(lerp(1, 5, f.k || 0)) : 1, w = Math.max(160, Math.round(g.W / pix)), h = Math.max(90, Math.round(g.H / pix));
    if (r.domElement.width !== w || r.domElement.height !== h) { r.setSize(w, h, false); g.gl.style.imageRendering = pix > 1 ? 'pixelated' : ''; }
    const m = this.machines[this.sel]; let rp = m.pos; if (this.sel === 3) rp = this.barrel ? [this.barrel.position.x, this.barrel.position.y, this.barrel.position.z] : null; this.ring.visible = !!rp && !f; if (rp) { this.ring.position.set(rp[0], rp[1] + 1.4 + Math.sin(this.t * 4) * 0.2, rp[2]); this.ring.rotation.z = this.t * 2; }
    let cam = this.cam; const cx = clamp(p.x * 0.55, -8, 8), sh = this.shake * (g.settings.shake ?? 1);
    cam.position.set(40 + cx + (Math.random() - 0.5) * sh, 44 + (Math.random() - 0.5) * sh, 40); cam.lookAt(cx, 0, 0);
    const asp = g.W / g.H; cam.left = -18 * asp; cam.right = 18 * asp; cam.updateProjectionMatrix();
    if (f && f.k > 0) { // hand the ortho view to a perspective lens, then fall into Rin's eyes
      cam = this.cam2; cam.aspect = asp; const k = f.k, eye = new THREE.Vector3(p.x - 0.4, p.y + 1.5, p.z), far = new THREE.Vector3(40 + cx, 44, 40).sub(new THREE.Vector3(cx, 0, 0)).multiplyScalar(2.2).add(new THREE.Vector3(cx, 0, 0));
      cam.position.lerpVectors(far, eye, ease.inOutCubic(k)); cam.fov = lerp(17, 70, k * k); cam.updateProjectionMatrix();
      const look = new THREE.Vector3().lerpVectors(new THREE.Vector3(cx, 0, 0), new THREE.Vector3(p.x + 6, p.y + 1.4, p.z), k); cam.lookAt(look); this.rin.visible = k < 0.8;
    }
    r.render(this.scene, cam);
    if (f?.snap && !f.done) { f.done = true; g.freezeFrame(); r.setSize(g.W, g.H, false); g.gl.style.imageRendering = ''; const ok = g.director.handoff(5, { from4: true }); if (!ok) { g.clear2d(); g.save.complete(4); g.director.end({ chapter: 4 }); } return; }
    const d = g.dialogue.current; if (d) { this.dlg.style.display = 'block'; this.dlg.firstChild.textContent = d.speaker.name; this.dlg.firstChild.style.color = d.speaker.color; this.dlg.lastChild.textContent = g.dialogue.visibleText; } else this.dlg.style.display = 'none';
  }
  perfInfo() { return `bodies ${this.bodies.length}`; }
}
