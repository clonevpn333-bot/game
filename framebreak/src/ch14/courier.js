// FINALE · ACT II — THE COURIER. Gliding on a torn comic page across an
// archipelago of erased format-islands. Dive for speed, pull up to climb,
// ride thermals, thread the wind rings, and deliver each island's "frame
// seed" through its beacon — the island comes back in full colour.
import * as THREE from 'three';
import { V, M, TEX, mesh, box, outline, buildSky, Particles, bar } from './kit.js';
import { buildRin3D, animateRin } from '../ch7/rig.js';
import { clamp, lerp, damp, rng } from '../core/util.js';

const ISL = [
  { k: 'pixel', name: 'PIXEL QUARTER', p: [-250, 0, 430], line: "Pixel Quarter's back! Count the squares — they're all there." },
  { k: 'paper', name: 'PAPER TOWN', p: [290, 45, 800], line: 'Paper Town! Somebody down there is waving. Wave back.' },
  { k: 'ink', name: 'INKWORKS', p: [-230, 85, 1190], line: 'Inkworks. Still wet. Do not touch.' },
  { k: 'clay', name: 'CLAY HILLS', p: [250, 35, 1560], line: "Clay Hills — you can see his thumbprints coming back OUT of it." },
];
const CORE = [0, 70, 1980], NOTES = [57, 64, 62, 60, 62, 64, 60, 57, 53, 57, 60, 65, 64, 62, 59, 62, 67];

export class Courier {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.name = 'THE COURIER'; this.done = false; }
  help() { return '<b>W</b> dive (gain speed) · <b>S</b> pull up (trade speed for height) · <b>A/D</b> bank · <b>SPACE</b> flap (uses wind)<br>Fly through each island\'s big beacon ring to deliver. Small rings and thermals give speed and wind.'; }
  build() {
    const g = this.game, S = (this.scene = new THREE.Scene()); S.fog = new THREE.Fog('#bcd6ee', 420, 2600); this.cam = new THREE.PerspectiveCamera(66, 16 / 9, 0.5, 3000);
    this.sky = buildSky(S); this.sky.set('#1f4fb0', '#6fa8e0', '#ffd9b0'); this.sky.frames.position.set(CORE[0], CORE[1] + 420, CORE[2] + 500);
    S.add(new THREE.HemisphereLight('#dfeaff', '#7a6a9a', 0.75)); const sun = (this.sun = new THREE.DirectionalLight('#ffe2b8', 2.4)); sun.castShadow = g.settings.shadows > 0; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 400 }); S.add(sun, sun.target);
    const r = rng(12), dm = new THREE.Object3D();
    // cloud sea
    const cl = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff7ee', roughness: 1, emissive: '#000000', emissiveIntensity: 0 }), 420); for (let i = 0; i < 420; i++) { const s = r.range(30, 90); dm.position.set(r.range(-900, 900), -120 + r.range(-12, 12), r.range(-200, 2400)); dm.scale.set(s * 1.6, s * 0.5, s * 1.3); dm.updateMatrix(); cl.setMatrixAt(i, dm.matrix); } cl.frustumCulled = false; S.add(cl);
    // islands
    this.tint = []; this.isl = ISL.map((I, n) => {
      const G = new THREE.Group(); G.position.set(...I.p); S.add(G); const mk = (mat, c) => { this.tint.push({ mat, c: new THREE.Color(c), n, e: mat.emissiveIntensity || 0 }); mat.color.set('#dcdce4'); mat.emissiveIntensity = 0; return mat; };
      const rock = mk(I.k === 'pixel' ? M.vox('#fff') : I.k === 'paper' ? M.paper('#fff') : I.k === 'ink' ? M.toon('#fff') : M.clay('#fff'), { pixel: '#3a4a7a', paper: '#b98d5e', ink: '#e9e2cc', clay: '#c98a6a' }[I.k]);
      const base = mesh(new THREE.ConeGeometry(78, 110, I.k === 'pixel' ? 4 : I.k === 'clay' ? 18 : 7), rock, 0, -62, 0, G); base.rotation.x = Math.PI; if (I.k === 'ink') outline(base, 0.02);
      mesh(new THREE.CylinderGeometry(80, 78, 8, I.k === 'pixel' ? 4 : I.k === 'clay' ? 18 : 7), mk(I.k === 'ink' ? M.toon('#fff') : I.k === 'clay' ? M.clay('#fff') : I.k === 'paper' ? M.paper('#fff') : M.vox('#fff'), { pixel: '#5876c9', paper: '#a9c79a', ink: '#f3ead2', clay: '#9bbf8a' }[I.k]), 0, -4, 0, G);
      const pals = { pixel: ['#3f5196', '#8a52a8', '#2fd3c6'], paper: ['#eab08c', '#d98f76', '#e9c46a'], ink: ['#ffffff', '#cfd6d9', '#f3ead2'], clay: ['#e6c27a', '#c98a6a', '#b5c9a0'] }[I.k];
      const mats = pals.map((c, i) => mk(I.k === 'pixel' ? M.vox('#fff', i < 2) : I.k === 'paper' ? M.paper('#fff') : I.k === 'ink' ? M.toon('#fff') : M.clay('#fff'), c));
      for (let i = 0; i < 26; i++) { const a = r.range(0, 6.28), d = r.range(8, 62), x = Math.cos(a) * d, z = Math.sin(a) * d, m = mats[i % 3]; let o;
        if (I.k === 'pixel') { const w = 6 + r.int(0, 3) * 2, h = 8 + r.int(0, 12) * 2; o = box(w, h, w, m, x, h / 2, z, G); }
        else if (I.k === 'paper') { const h = r.range(8, 28); o = i % 4 === 3 ? mesh(new THREE.ConeGeometry(4, h * 0.6, 4), m, x, h * 0.3, z, G) : box(r.range(8, 16), h, 0.6, m, x, h / 2, z, G); o.rotation.y = r.range(0, 3); }
        else if (I.k === 'ink') { const h = r.range(8, 34); o = outline(box(r.range(6, 12), h, r.range(6, 12), m, x, h / 2, z, G), 0.04); }
        else { const s = r.range(5, 14); o = mesh(new THREE.IcosahedronGeometry(1, 2), m, x, s * 0.5, z, G); o.scale.set(s, s * r.range(0.7, 1.5), s); } }
      // beacon + delivery ring
      const prev = n ? ISL[n - 1].p : [0, 120, 0], bc = V(I.p[0], I.p[1] + 62, I.p[2]); box(2.4, 62, 2.4, M.metal('#c9d1e6', 0.3), 0, 31, 0, G);
      const ring = mesh(new THREE.TorusGeometry(17, 1.3, 10, 40), M.glow('#ffd166', 4), bc.x, bc.y, bc.z, S); ring.lookAt(prev[0], bc.y, prev[2]); ring.castShadow = false;
      return { ...I, G, bc, ring, done: false, k01: 0 };
    });
    // wind rings along the route
    this.rings = []; const pts = [[0, 120, 0], ...ISL.map((I) => [I.p[0], I.p[1] + 62, I.p[2]]), [CORE[0], CORE[1], CORE[2] - 60]];
    for (let L = 0; L < pts.length - 1; L++) for (let k = 1; k <= 4; k++) { const u = k / 5, a = pts[L], b = pts[L + 1], p = V(lerp(a[0], b[0], u) + Math.sin(u * 6.3 + L) * 30, lerp(a[1], b[1], u) + Math.sin(u * 3.14) * 34 - 6, lerp(a[2], b[2], u)), m = mesh(new THREE.TorusGeometry(8, 0.5, 8, 28), M.glow('#8ff5e3', 3.5), p.x, p.y, p.z, S); m.lookAt(b[0], p.y, b[2]); m.castShadow = false; this.rings.push({ p, m, got: false }); }
    // the core: a white frame that only opens once every island is back
    this.core = new THREE.Group(); this.core.position.set(...CORE); for (let i = 0; i < 3; i++) { const s = 60 + i * 26, G = new THREE.Group(); for (const [w, h, x, y] of [[s * 2, 6, 0, s], [s * 2, 6, 0, -s], [6, s * 2, s, 0], [6, s * 2, -s, 0]]) box(w, h, 6, new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff', emissiveIntensity: 0.6 }), x, y, i * 14, G); this.core.add(G); }
    this.portal = mesh(new THREE.CircleGeometry(44, 40), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, side: THREE.DoubleSide }), 0, 0, 0, this.core); S.add(this.core);
    this.beams = [0, 1, 2].map((i) => { const b = box(620, 5, 5, new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ff8a8a', emissiveIntensity: 2 }), CORE[0], CORE[1] - 50 + i * 55, CORE[2] - 150 - i * 40, S); b.castShadow = false; return { b, sp: (i % 2 ? -1 : 1) * (0.22 + i * 0.07) }; });
    // glider: a torn comic page stretched over two spars
    const G = (this.gl = new THREE.Group()), pg = new THREE.MeshStandardMaterial({ map: TEX.page(), roughness: 0.9, side: THREE.DoubleSide });
    this.wings = [-1, 1].map((s) => { const sh = new THREE.Shape(); sh.moveTo(0, 0.9); sh.lineTo(s * 4.6, -0.9); sh.lineTo(s * 4.2, -1.5); sh.lineTo(s * 2.2, -1.1); sh.lineTo(0, -1.9); const w = mesh(new THREE.ShapeGeometry(sh), pg, 0, 0, 0, G); w.rotation.x = -Math.PI / 2; const piv = new THREE.Group(); piv.add(w); G.add(piv); const sp = mesh(new THREE.CylinderGeometry(0.05, 0.05, 4.9, 6), M.metal('#8a5a3a', 0.6), s * 2.3, 0.02, 0.05, piv); sp.rotation.z = Math.PI / 2; sp.rotation.y = s * 0.37; return piv; });
    mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.8, 6), M.metal('#8a5a3a', 0.6), 0, 0, -0.5, G).rotation.x = Math.PI / 2; mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 6), M.metal('#c9d1e6', 0.3), 0, -0.95, 0.5, G).rotation.z = Math.PI / 2;
    for (const s of [-0.7, 0.7]) mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4), M.metal('#c9d1e6', 0.3), s, -0.5, 0.5, G);
    this.rin = buildRin3D(TEX.paper()); this.rin.position.set(0, -1.75, -0.45); this.rin.rotation.x = 1.25; G.add(this.rin); S.add(G); this.vell = this.ch.vell; S.add(this.vell);
    this.fx = new Particles(S, 900, 2.2, true); this.pkg = [];
    Object.assign(this, { pos: V(0, 150, -40), yaw: 0, pitch: -0.1, roll: 0, v: 40, hp: 5, wind: 1, t: 0, n: 0, note: 0, shake: 0, last: V(0, 150, -40), lastYaw: 0, camPos: V(0, 156, -52), open: 0 });
    this.ch.hud.title('FINALE · ACT II', 'THE COURIER'); g.music.setIntensity(1);
    g.dialogue.say([{ who: 'vell', text: "It's a hang-glider now. Everything's a hang-glider if you believe in it." }, { who: 'rin', text: 'The islands are blank.' }, { who: 'vell', text: "Erased, not gone. I kept a seed of each one. You're the courier: fly it through the big gold ring over every island." }, { who: 'vell', text: 'W to dive, S to climb, SPACE to flap. Speed is height. Height is speed.' }]);
  }
  hit(n = 1) { const g = this.game; this.hp -= g.easy ? 0 : n; this.v *= 0.55; this.shake = 1; g.sfx.play('pp.hurt'); if (this.hp <= 0) this.respawn(); }
  respawn() { this.pos.copy(this.last); this.yaw = this.lastYaw; this.pitch = 0; this.v = 38; this.hp = 5; this.wind = 1; this.game.sfx.play('fx.whoosh'); }

  update(dt) {
    const g = this.game, inp = g.input, sfx = g.sfx; this.t += dt; this.shake = Math.max(0, this.shake - dt * 2);
    const ix = inp.axisX, iy = (inp.down.down ? 1 : 0) - (inp.down.up ? 1 : 0);
    this.roll = damp(this.roll, ix * 0.95, 5, dt); this.yaw -= this.roll * 0.95 * dt;
    this.pitch = clamp(this.pitch + iy * 1.25 * dt, -1.05, 0.95); if (!iy) this.pitch = damp(this.pitch, -0.06, 0.8, dt); if (this.v < 14) this.pitch = damp(this.pitch, -0.6, 3, dt);
    this.v += (-Math.sin(this.pitch) * 26 - (this.v - 30) * 0.1 - Math.abs(this.roll) * 2) * dt;
    if (inp.down.jump && this.wind > 0.02) { this.v += 26 * dt; this.wind -= dt * 0.45; this.pos.y += 5 * dt; if (Math.floor(this.t * 4) !== Math.floor((this.t - dt) * 4)) sfx.play('pp.jump', { vol: 0.5, pitch: 0.7 }); } else this.wind = Math.min(1, this.wind + dt * 0.035);
    this.v = clamp(this.v, 8, 92);
    const f = V(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch)); this.pos.addScaledVector(f, this.v * dt); this.pos.y -= (Math.max(0, 26 - this.v) * 0.3 + 0.9) * dt;
    // thermals over every island
    this.inTh = false; for (const I of this.isl) { const d = Math.hypot(this.pos.x - I.p[0], this.pos.z - I.p[2]); if (d < 62 && this.pos.y > I.p[1] && this.pos.y < I.p[1] + 150) { this.pos.y += 11 * dt; this.wind = Math.min(1, this.wind + dt * 0.25); this.inTh = true; }
      // solid ground
      if (d < 76 && this.pos.y < I.p[1] + 6 && this.pos.y > I.p[1] - 100) { this.pos.y = I.p[1] + 7; this.pitch = 0.5; this.hit(1); } }
    // wind rings
    for (const R of this.rings) if (!R.got && R.p.distanceTo(this.pos) < 9.5) { R.got = true; R.m.material = M.glow('#ffffff', 1); this.v = Math.min(92, this.v + 12); this.wind = Math.min(1, this.wind + 0.3); const m = NOTES[this.note++ % NOTES.length]; g.audio.ready && g.music.stinger([{ inst: 'bell', notes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][m % 12] + Math.floor(m / 12), step: 0.3, vol: 0.5, send: 0.5 }]); for (let i = 0; i < 20; i++) this.fx.emit(R.p, V(0, 0, 0), new THREE.Color('#8ff5e3'), 0.7, 26); this.last.copy(R.p); this.lastYaw = this.yaw; }
    // deliveries
    for (const I of this.isl) { if (!I.done && I.bc.distanceTo(this.pos) < 18) { I.done = true; this.n++; I.ring.material = M.glow('#8ff5e3', 2); sfx.play('pp.chime'); sfx.play('fx.shimmer'); g.music.stinger(this.ch.sting); g.music.setIntensity(this.n >= 2 ? 2 : 1); this.ch.hud.title('DELIVERED', I.name); g.dialogue.say('vell', I.line); const pk = box(2, 2, 2, M.glow('#ffd166', 5), this.pos.x, this.pos.y - 2, this.pos.z, this.scene); this.pkg.push({ m: pk, to: V(I.p[0], I.p[1] + 4, I.p[2]), k: 0, I }); this.last.copy(I.bc); this.lastYaw = this.yaw; this.wind = 1; this.hp = 5;
        if (this.n === 4) g.dialogue.say([{ who: 'curator', text: 'You are putting the mess BACK.' }, { who: 'vell', text: "Every one of them! The core's opening — dive for it, between his eraser beams!" }]); }
      if (I.done && I.k01 < 1) { I.k01 = Math.min(1, I.k01 + dt * 0.5); for (const T of this.tint) if (T.n === this.isl.indexOf(I)) { T.mat.color.lerp(T.c, 0.06); T.mat.emissiveIntensity = lerp(T.mat.emissiveIntensity, T.e, 0.06); } } }
    for (const p of this.pkg) { p.k = Math.min(1, p.k + dt * 0.7); p.m.position.lerp(p.to, 0.06); p.m.rotation.x += dt * 4; p.m.rotation.y += dt * 3; if (p.k >= 1 && !p.b) { p.b = true; this.scene.remove(p.m); for (let i = 0; i < 80; i++) this.fx.emit(p.to, V(0, 20, 0), new THREE.Color(['#ffd166', '#2fd3c6', '#ff9a3c', '#c06fc0'][i % 4]), 1.6, 70); sfx.play('fx.boom'); this.shake = 0.6; } }
    // eraser beams + the core
    this.open = damp(this.open, this.n === 4 ? 1 : 0, 1.5, dt); this.portal.material.opacity = this.open * 0.9; this.core.children.forEach((c, i) => { if (c.type === 'Group') c.rotation.z += dt * (i % 2 ? -0.3 : 0.3) * (1 + this.open); });
    for (const B of this.beams) { B.b.rotation.z += B.sp * dt; const lp = B.b.worldToLocal(this.pos.clone()); if (Math.abs(lp.x) < 310 && Math.abs(lp.y) < 5 && Math.abs(lp.z) < 6) { this.hit(1); this.pos.z -= 14; } }
    if (this.pos.y < -100 || this.pos.y > 520) this.respawn();
    const dc = V(...CORE).distanceTo(this.pos); if (dc < 40) { if (this.n === 4) { if (!this.out) { this.out = 0.001; sfx.play('fx.boom'); sfx.play('fx.rise'); } } else { this.hit(0); this.pos.z -= 30; this.yaw += Math.PI; if (!this.said) { this.said = true; g.dialogue.say('vell', "Not yet — it won't open until all four islands are back."); } } }
    if (this.out) { this.out += dt; if (this.out > 1.6) this.done = true; }
    this.vell.userData.tick(this.t);
  }
  frame(dt) {
    const g = this.game, t = this.t, G = this.gl; G.position.copy(this.pos); G.rotation.set(0, 0, 0); G.rotateY(this.yaw); G.rotateX(-this.pitch); G.rotateZ(this.roll);
    this.wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (0.1 + Math.sin(t * 7 + i) * 0.03 + (g.input.down.jump ? Math.sin(t * 16) * 0.3 : 0) - this.v * 0.0012)));
    animateRin(this.rin, { speed: 0, ground: false, vy: -this.pitch * 14, slide: false, climb: 0, grapple: true, strike: 0, hurt: 0, t, dt, lookAt: null, talk: false });
    const f = V(Math.sin(this.yaw), 0, Math.cos(this.yaw)), rt = V(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.vell.position.lerp(this.pos.clone().addScaledVector(rt, -5).add(V(0, 1.2 + Math.sin(t * 2) * 0.5, 0)).addScaledVector(f, 2), Math.min(1, dt * 5)); this.vell.rotation.y = this.yaw;
    if (this.v > 26) for (const s of [-1, 1]) this.fx.emit(this.pos.clone().addScaledVector(rt, -s * 4.4 * Math.cos(this.roll)).add(V(0, s * 4.4 * Math.sin(this.roll), 0)), V(0, 0, 0), new THREE.Color(this.inTh ? '#ffd166' : '#ffffff'), 0.5, 0.4);
    if (this.inTh && Math.random() < 0.5) this.fx.emit(this.pos.clone().add(V((Math.random() - 0.5) * 40, -20, (Math.random() - 0.5) * 40)), V(0, 26, 0), new THREE.Color('#ffd9a0'), 1.2, 2);
    this.fx.update(dt);
    const want = this.pos.clone().addScaledVector(f, -(10 + this.v * 0.06)).add(V(0, 3.4 - this.pitch * 5, 0)); this.camPos.lerp(want, 1 - Math.exp(-6 * dt)); const sh = this.shake * (g.settings.shake ?? 1);
    this.cam.position.copy(this.camPos).add(V((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, 0)); this.cam.lookAt(this.pos.clone().addScaledVector(f, 14).add(V(0, this.pitch * 8, 0))); this.cam.rotateZ(this.roll * 0.35); this.cam.fov = damp(this.cam.fov, 60 + this.v * 0.22, 4, dt); this.cam.aspect = g.W / g.H; this.cam.updateProjectionMatrix();
    this.sun.position.set(this.pos.x - 80, this.pos.y + 160, this.pos.z - 60); this.sun.target.position.copy(this.pos); this.sky.update(t, this.cam.position);
    if (this.out) { this.scene.fog.near = lerp(200, 2, this.out / 1.6); this.scene.fog.far = lerp(1500, 30, this.out / 1.6); this.scene.fog.color.set('#ffffff'); }
    const nx = this.isl.find((I) => !I.done); this.ch.hud.set(nx ? `Deliver to ${nx.name} — ${Math.round(nx.bc.distanceTo(this.pos))} m` : 'Dive into the core', [bar('HULL', this.hp / 5, 10), bar('WIND', this.wind, 10), `<kbd>✉</kbd>DELIVERED ${this.n} / 4`, (this.v < 16 ? '!' : '') + `<kbd>↕</kbd>ALT ${Math.round(this.pos.y + 120)} m`]); this.ch.hud.big.innerHTML = `${Math.round(this.v * 3.6)}<span style="font-size:.35em;letter-spacing:.2em"> KM/H</span>`;
    return { scene: this.scene, cam: this.cam, fx: { bloom: 0.45, threshold: 1.15, vig: 0.32, sat: 1.12, grain: 0.02 } };
  }
}
