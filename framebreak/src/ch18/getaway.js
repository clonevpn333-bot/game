// FINALE · ACT I — THE GETAWAY. Arcade driving down the Framework's spine:
// a banked, rolling highway that crosses four format districts through giant
// frame gates (each one a jump). Drift to charge boost, thread traffic, dodge
// the Curator's delete-blocks, and stay ahead of the REFRAMER.
import * as THREE from 'three';
import { V, M, TEX, mesh, box, buildSky, Particles, bar } from './kit.js';
import { buildRin3D, animateRin } from '../ch7/rig.js';
import { clamp, lerp, damp, rng, ease } from '../core/util.js';

const DS = 2, LEN = 3440, HW = 9.2;
const DIST = [
  { name: 'PIXEL QUARTER', s0: 0, sky: ['#101536', '#5e3a82', '#ff9a6a'], fog: '#6a4a8a', edge: '#2fd3c6' },
  { name: 'PAPER TOWN', s0: 800, sky: ['#7fb7c9', '#f6d9a8', '#f2a98a'], fog: '#f2c9a0', edge: '#e2603a' },
  { name: 'INKWORKS', s0: 1600, sky: ['#e9e2cc', '#f3ead2', '#fff8e6'], fog: '#efe6cf', edge: '#17131f' },
  { name: 'CLAY HILLS', s0: 2400, sky: ['#f1b98a', '#e9c7a6', '#ffe9c9'], fog: '#e9c7a6', edge: '#c06fc0' },
  { name: 'THE EDGE', s0: 3200, sky: ['#f4f6ff', '#ffffff', '#ffffff'], fog: '#ffffff', edge: '#ffffff' },
];
const GAPS = [780, 1580, 2380, 3180];

export class Getaway {
  constructor(ch) { this.ch = ch; this.game = ch.game; this.name = 'THE GETAWAY'; this.done = false; }
  help() { return '<b>W</b> accelerate · <b>S</b> brake · <b>A/D</b> steer · hold <b>SPACE</b> in a corner to DRIFT, release for BOOST<br>Hit the frame gates fast — every gate is a jump.'; }
  build() {
    const g = this.game, S = (this.scene = new THREE.Scene()); S.fog = new THREE.Fog('#6a4a8a', 60, 420); this.cam = new THREE.PerspectiveCamera(62, 16 / 9, 0.3, 2400);
    this.sky = buildSky(S); S.add(new THREE.HemisphereLight('#cfd8ff', '#3a2f4a', 0.9)); const sun = (this.sun = new THREE.DirectionalLight('#ffd9b0', 2.4)); sun.castShadow = g.settings.shadows > 0; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 220 }); sun.shadow.bias = -0.0008; S.add(sun, sun.target);
    // --- track: integrate heading, add hills and a launch bump before every gate
    const n = (this.n = Math.floor(LEN / DS) + 1), P = (this.P = new Float32Array(n * 3)), TH = (this.TH = new Float32Array(n)); let x = 0, z = 0;
    for (let i = 0; i < n; i++) { const s = i * DS, th = 0.85 * Math.sin(s / 250) + 0.5 * Math.sin(s / 96 + 1) + 0.25 * Math.sin(s / 47); TH[i] = th; let y = 16 * Math.sin(s / 300) + 6 * Math.sin(s / 118); for (const gp of GAPS) { const u = (s - (gp - 46)) / 46; if (u > 0 && u <= 1) y += 4.2 * u * u; if (s > gp && s < gp + 60) y += 4.2 * (1 - (s - gp) / 60) ** 2; } P[i * 3] = x; P[i * 3 + 1] = y; P[i * 3 + 2] = z; x += Math.sin(th) * DS; z += Math.cos(th) * DS; }
    const inGap = (s) => GAPS.some((gp) => s > gp && s < gp + 26);
    const ribbon = (off0, off1, y0, y1, mat, uvS = 14) => { const pos = [], uv = [], idx = []; for (let i = 0; i < n; i++) { const th = TH[i], rx = Math.cos(th), rz = -Math.sin(th), px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2]; pos.push(px + rx * off0, py + y0, pz + rz * off0, px + rx * off1, py + y1, pz + rz * off1); uv.push(0, (i * DS) / uvS, 1, (i * DS) / uvS); if (i < n - 1 && !inGap(i * DS) && !inGap(i * DS + DS)) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } } const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); ge.setIndex(idx); ge.computeVertexNormals(); const m = new THREE.Mesh(ge, mat); m.receiveShadow = true; m.frustumCulled = false; S.add(m); return m; };
    ribbon(-HW - 1, HW + 1, 0, 0, new THREE.MeshStandardMaterial({ map: TEX.road(), roughness: 0.55, metalness: 0.25, side: THREE.DoubleSide }));
    this.edges = [ribbon(-HW - 1.2, -HW - 1.2, 0, 0.9, new THREE.MeshStandardMaterial({ color: '#111', emissive: '#2fd3c6', emissiveIntensity: 1.7, side: THREE.DoubleSide })), ribbon(HW + 1.2, HW + 1.2, 0, 0.9, new THREE.MeshStandardMaterial({ color: '#111', emissive: '#2fd3c6', emissiveIntensity: 1.7, side: THREE.DoubleSide }))];
    ribbon(-HW - 1.2, HW + 1.2, -1.2, -1.2, M.metal('#3a4052', 0.6));
    // --- scenery per district (instanced)
    const r = rng(5), dm = new THREE.Object3D(), col = new THREE.Color(), inst = (geo, mat, count, fn) => { const m = new THREE.InstancedMesh(geo, mat, count); m.castShadow = true; m.receiveShadow = true; for (let i = 0; i < count; i++) { fn(i, dm, col); dm.updateMatrix(); m.setMatrixAt(i, dm.matrix); m.setColorAt(i, col); } m.frustumCulled = false; S.add(m); return m; };
    const place = (s, side, d, y = 0) => { const a = this.at(s); dm.position.set(a.x + Math.cos(a.th) * side * d, a.y + y, a.z - Math.sin(a.th) * side * d); dm.rotation.set(0, a.th, 0); return a; };
    const bx = new THREE.BoxGeometry(1, 1, 1);
    inst(bx, M.vox('#ffffff', true), 190, (i, d, c) => { const w = 6 + r.int(0, 4) * 2, h = 8 + r.int(0, 20) * 2; place(r.range(-40, 800), r.chance(0.5) ? 1 : -1, r.range(16, 110), h / 2 - 30); d.scale.set(w, h + 60, w); c.set(r.pick(['#3f5196', '#5876c9', '#5e3a82', '#8a52a8', '#2f3a6b'])); });
    inst(bx, M.vox('#ffffff'), 60, (i, d, c) => { place(r.range(0, 800), r.chance(0.5) ? 1 : -1, r.range(12, 60), r.range(8, 40)); const s = r.int(1, 3) * 2; d.scale.set(s, s, s); d.rotation.set(r() * 3, r() * 3, 0); c.set(r.pick(['#2fd3c6', '#ff9a3c', '#f4f6ff', '#c06fc0'])); });
    inst(bx, M.paper('#ffffff'), 170, (i, d, c) => { const h = r.range(10, 40); place(r.range(800, 1600), r.chance(0.5) ? 1 : -1, r.range(13, 90), h / 2 - 20); d.scale.set(r.range(8, 18), h + 40, 0.5); d.rotation.y += Math.PI / 2 + r.range(-0.3, 0.3); c.set(r.pick(['#eab08c', '#d98f76', '#9a6a7e', '#e9c46a', '#f6edd6'])); });
    inst(new THREE.ConeGeometry(1, 1, 4), M.paper('#ffffff'), 90, (i, d, c) => { const h = r.range(5, 12); place(r.range(800, 1600), r.chance(0.5) ? 1 : -1, r.range(11.5, 40), h / 2); d.scale.set(r.range(2, 4), h, r.range(2, 4)); c.set(r.pick(['#6fae7a', '#8fc98a', '#4f8f6a'])); });
    { const mats = []; const a = inst(bx, M.toon('#ffffff'), 150, (i, d, c) => { const w = r.range(6, 14), h = r.range(10, 54); place(r.range(1600, 2400), r.chance(0.5) ? 1 : -1, r.range(15, 100), h / 2 - 25); d.scale.set(w, h + 50, w); d.rotation.y += r.range(-0.2, 0.2); d.updateMatrix(); mats.push(d.matrix.clone()); c.set(r.pick(['#ffffff', '#f3ead2', '#cfd6d9'])); }); const o = new THREE.InstancedMesh(bx, M.ink(), 150); mats.forEach((m, i) => { dm.matrix.copy(m); dm.matrix.decompose(dm.position, dm.quaternion, dm.scale); dm.scale.multiplyScalar(1.035); dm.scale.x += 0.5; dm.scale.z += 0.5; dm.updateMatrix(); o.setMatrixAt(i, dm.matrix); }); o.frustumCulled = false; S.add(o); void a; }
    this.gears = []; for (let i = 0; i < 14; i++) { const gm = mesh(new THREE.CylinderGeometry(9, 9, 1.2, 14), M.toon('#cfd6d9'), 0, 0, 0, S); const a = this.at(1640 + i * 55), sd = i % 2 ? 1 : -1; gm.position.set(a.x + Math.cos(a.th) * sd * 22, a.y + 14 + (i % 3) * 8, a.z - Math.sin(a.th) * sd * 22); gm.rotation.set(Math.PI / 2, 0, a.th); const o = new THREE.Mesh(gm.geometry, M.ink()); o.scale.setScalar(1.06); gm.add(o); this.gears.push(gm); }
    inst(new THREE.IcosahedronGeometry(1, 2), M.clay('#ffffff'), 170, (i, d, c) => { const s = r.range(6, 22); place(r.range(2400, 3200), r.chance(0.5) ? 1 : -1, r.range(14 + s * 0.6, 110), -s * 0.2); d.scale.set(s * r.range(0.8, 1.4), s * r.range(0.7, 1.6), s * r.range(0.8, 1.4)); c.set(r.pick(['#b5c9a0', '#e6c27a', '#c98a6a', '#d9a27e', '#9bbf8a'])); });
    inst(new THREE.CylinderGeometry(0.16, 0.2, 7, 6), M.metal('#454c63', 0.5), 230, (i, d, c) => { place(i * 15, i % 2 ? 1 : -1, HW + 2.2, 3.5); c.set('#ffffff'); });
    inst(new THREE.SphereGeometry(0.32, 8, 6), M.glow('#ffd9a0', 0.8), 230, (i, d, c) => { place(i * 15, i % 2 ? 1 : -1, HW + 1.6, 7); c.set('#ffffff'); });
    inst(bx, M.metal('#2b3040', 0.7), 86, (i, d, c) => { place(i * 40, 0, 0, -41.5); d.scale.set(5, 80, 5); c.set('#ffffff'); });
    // frame gates over each gap + boost pads
    for (const gp of GAPS) { const a = this.at(gp + 13), G = new THREE.Group(); G.position.set(a.x, a.y, a.z); G.rotation.y = a.th; for (const [w, h, px, py] of [[34, 3, 0, 22], [34, 3, 0, -6], [3, 31, 15.5, 8], [3, 31, -15.5, 8]]) { box(w, h, 3, new THREE.MeshStandardMaterial({ color: '#f4f6ff', emissive: '#f4f6ff', emissiveIntensity: 0.8 }), px, py, 0, G); box(w * (w > h ? 0.94 : 0.4), h * (w > h ? 0.4 : 0.94), 3.4, M.glow('#ff9a3c', 3), px * 0.985, py, 0, G); } S.add(G); }
    this.pads = []; for (let s = 150; s < 3150; s += 235) { if (GAPS.some((gp) => Math.abs(s - gp) < 80)) continue; const xo = [-5, 0, 5][Math.floor(r() * 3)], a = this.at(s), pm = mesh(new THREE.PlaneGeometry(3.4, 7), M.glow('#ffd166', 4), a.x + Math.cos(a.th) * xo, a.y + 0.06, a.z - Math.sin(a.th) * xo, S); pm.rotation.set(-Math.PI / 2, 0, -a.th); pm.castShadow = false; this.pads.push({ s, x: xo }); }
    // --- the car
    const car = (this.car = new THREE.Group()), body = M.paint('#ff7a2c'), trim = M.paint('#178a86'), dark = M.metal('#1a1d28', 0.5);
    const sh = new THREE.Shape(); sh.moveTo(-2.3, 0.25); sh.lineTo(2.1, 0.25); sh.quadraticCurveTo(2.5, 0.3, 2.45, 0.62); sh.lineTo(1.0, 0.9); sh.lineTo(0.35, 0.92); sh.lineTo(-0.2, 0.9); sh.lineTo(-2.0, 1.0); sh.quadraticCurveTo(-2.4, 0.95, -2.3, 0.25);
    const hull = mesh(new THREE.ExtrudeGeometry(sh, { depth: 1.9, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 3 }), body, 0, 0, 0, car); hull.rotation.y = -Math.PI / 2; hull.position.set(0.95, 0, 0);
    box(1.96, 0.14, 4.3, trim, 0, 0.33, 0, car); box(1.5, 0.05, 0.9, dark, 0, 0.93, 0.95, car); const ws = box(1.6, 0.5, 0.06, new THREE.MeshPhysicalMaterial({ color: '#9fd8ff', roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.5 }), 0, 1.12, 0.55, car); ws.rotation.x = -0.5;
    box(1.9, 0.08, 0.5, trim, 0, 1.35, -2.05, car); for (const sx of [-0.8, 0.8]) box(0.08, 0.4, 0.3, dark, sx, 1.15, -2.05, car);
    for (const sx of [-0.7, 0.7]) { mesh(new THREE.SphereGeometry(0.16, 10, 8), M.glow('#fff3c4', 6), sx, 0.62, 2.42, car); box(0.4, 0.12, 0.06, M.glow('#ff2a2a', 5), sx, 0.82, -2.32, car); }
    this.wheels = []; for (const [wx, wz] of [[-1.0, 1.5], [1.0, 1.5], [-1.0, -1.45], [1.0, -1.45]]) { const piv = new THREE.Group(); piv.position.set(wx, 0.42, wz); const w = mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 18), M.metal('#15171f', 0.8), 0, 0, 0, piv); w.rotation.z = Math.PI / 2; mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 8), M.metal('#c9d1e6', 0.25), 0, 0, 0, w); car.add(piv); this.wheels.push({ piv, w, front: wz > 0 }); }
    this.flame = mesh(new THREE.ConeGeometry(0.3, 1.8, 8), new THREE.MeshBasicMaterial({ color: '#8ff5e3' }), 0, 0.5, -3.1, car); this.flame.rotation.x = -Math.PI / 2;
    this.rin = buildRin3D(TEX.paper()); this.rin.position.set(-0.4, -0.22, -0.2); car.add(this.rin); this.vell = this.ch.vell; S.add(this.vell);
    this.hl = new THREE.SpotLight('#fff3c4', 600, 90, 0.5, 0.6, 1.4); car.add(this.hl); this.hl.position.set(0, 0.8, 2.4); car.add(this.hl.target); this.hl.target.position.set(0, -0.5, 30); S.add(car);
    // traffic, delete-blocks, the Reframer
    const tm = [M.vox('#5876c9'), M.paper('#e2603a'), M.toon('#ffffff'), M.clay('#c98a6a')];
    this.traffic = []; for (let i = 0; i < 20; i++) { const t = new THREE.Group(); const b = box(1.9, 0.8, 4, tm[0], 0, 0.75, 0, t), c2 = box(1.6, 0.6, 2, tm[0], 0, 1.4, -0.2, t); box(1.7, 0.2, 0.1, M.glow('#ff2a2a', 4), 0, 0.9, -2.02, t); const ol = [b, c2].map((m) => { const o = new THREE.Mesh(m.geometry, M.ink()); o.scale.setScalar(1.06); o.visible = false; m.add(o); return o; }); S.add(t); this.traffic.push({ t, parts: [b, c2], ol, s: 120 + i * 62, x: [-6, -2, 2, 6][i % 4], v: 16 + (i % 5) * 3, hit: 0, tm }); }
    this.blocks = []; for (let i = 0; i < 6; i++) { const warn = mesh(new THREE.PlaneGeometry(4.4, 4.4), new THREE.MeshBasicMaterial({ color: '#ff2a2a', transparent: true, opacity: 0.7 }), 0, -999, 0, S); warn.rotation.x = -Math.PI / 2; const pil = box(4, 16, 4, new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff', emissiveIntensity: 1.2 }), 0, -999, 0, S); this.blocks.push({ warn, pil, t: 9, s: 0, x: 0 }); }
    this.wall = new THREE.Group(); box(80, 120, 2, new THREE.MeshBasicMaterial({ color: '#ffffff' }), 0, 30, 0, this.wall); box(84, 4, 3, M.glow('#ff2a2a', 4), 0, -2, 0, this.wall); for (const sx of [-41, 41]) box(4, 124, 3, M.glow('#ff2a2a', 4), sx, 30, 0, this.wall); S.add(this.wall);
    this.fx = new Particles(S, 700, 1.1, true); this.smoke = new Particles(S, 300, 2.6, false);
    Object.assign(this, { s: 20, x: 2, v: 0, xv: 0, yaw: 0, air: 0, vy: 0, hp: 100, drift: 0, charge: 0, boost: 0, sR: -160, t: 0, cpS: 20, district: -1, blockT: 4, out: 0, shake: 0, camPos: V(0, 6, -10) });
    this.ch.hud.title('FINALE · ACT I', 'THE GETAWAY');
    g.dialogue.say([{ who: 'vell', text: 'The page tore and dumped us on the Framework\'s spine. And I found us a CAR.' }, { who: 'rin', text: "It's made of four different realities." }, { who: 'vell', text: "So are you. W to floor it. Hold SPACE in the bends to drift — let go and it kicks. He's sending the Reframer down the road after us!" }]);
  }
  at(s) { const f = clamp(s / DS, 0, this.n - 1.001), i = Math.floor(f), k = f - i, P = this.P; return { x: lerp(P[i * 3], P[i * 3 + 3], k), y: lerp(P[i * 3 + 1], P[i * 3 + 4], k), z: lerp(P[i * 3 + 2], P[i * 3 + 5], k), th: lerp(this.TH[i], this.TH[i + 1], k), pitch: Math.atan2(P[i * 3 + 4] - P[i * 3 + 1], DS) }; }
  world(s, x, y = 0) { const a = this.at(s); return V(a.x + Math.cos(a.th) * x, a.y + y, a.z - Math.sin(a.th) * x); }
  crash(n, slow = 0.5) { const g = this.game; this.hp -= n * (g.easy ? 0.4 : 1); this.v *= slow; this.shake = 1; g.sfx.play('px.hitbig'); g.sfx.play('px.clank'); for (let i = 0; i < 16; i++) this.fx.emit(this.car.position, V(0, 4, 0), new THREE.Color('#ffd166'), 0.6, 14); if (this.hp <= 0) this.respawn(); }
  respawn() { this.s = this.cpS; this.x = 0; this.v = 20; this.xv = 0; this.hp = 100; this.air = 0; this.sR = this.s - 190; this.game.sfx.play('px.hurt'); this.game.save.data.stats.deaths++; }

  update(dt) {
    const g = this.game, inp = g.input, sfx = g.sfx; this.t += dt; this.shake = Math.max(0, this.shake - dt * 2.2);
    if (this.out) { this.out += dt; this.v = Math.max(this.v, 60); this.s += this.v * dt; this.vy -= 9 * dt; this.outY = (this.outY || 0) + this.vy * dt; if (this.out > 3.4) this.done = true; return; }
    const acc = inp.down.up, brk = inp.down.down, st = inp.axisX, a = this.at(this.s), kappa = (this.at(this.s + 6).th - a.th) / 6;
    const drifting = inp.down.jump && Math.abs(st) > 0.2 && this.v > 22 && !this.air;
    if (drifting) { if (!this.drift) sfx.play('px.slide'); this.drift = Math.sign(st); this.charge = Math.min(2.4, this.charge + dt); } else if (this.drift) { if (this.charge > 0.5) { this.boost = Math.max(this.boost, 0.6 + this.charge * 0.9); sfx.play('px.dash'); sfx.play('fx.whoosh'); } this.drift = 0; this.charge = 0; }
    this.boost = Math.max(0, this.boost - dt); const vmax = this.boost > 0 ? 88 : 62;
    if (!this.air) { if (acc || this.boost > 0) this.v += (this.boost > 0 ? 46 : 24) * (1 - this.v / (vmax + 4)) * dt; else this.v -= 6 * dt; if (brk) this.v -= 48 * dt; }
    this.v = clamp(this.v, 0, 92);
    const grip = drifting ? 2.3 : 6.5, tv = -st * (drifting ? 24 : 15) * clamp(this.v / 22, 0, 1);
    if (!this.air) { this.xv = damp(this.xv, tv, grip, dt); this.xv -= kappa * this.v * this.v * 0.55 * dt; }
    this.x += this.xv * dt; this.s += this.v * dt;
    if (Math.abs(this.x) > HW - 1.1) { this.x = Math.sign(this.x) * (HW - 1.1); if (!this.air && this.v > 12) { this.v *= 1 - 0.7 * dt; this.xv *= -0.3; if (Math.random() < 0.5) this.fx.emit(this.world(this.s, this.x + Math.sign(this.x), 0.6), V(0, 3, 0), new THREE.Color('#ffd166'), 0.4, 8); if (Math.floor(this.t * 6) !== Math.floor((this.t - dt) * 6)) { sfx.play('px.clank', { vol: 0.4 }); this.hp -= g.easy ? 0.4 : 1.2; if (this.hp <= 0) this.respawn(); } } }
    // gates: every district border is a jump
    for (const gp of GAPS) if (!this.air && this.s > gp && this.s < gp + 26) { if (this.v > 27) { this.air = 0.001; this.vy = 7 + this.v * 0.06; this.airY = 0; sfx.play('fx.whoosh'); } else { sfx.play('px.die'); this.hp -= 20; this.s = gp - 130; this.v = 30; this.x = 0; this.sR = Math.min(this.sR, this.s - 150); } }
    if (this.air) { this.air += dt; this.vy -= 22 * dt; this.airY += this.vy * dt; if (this.airY <= 0 && !GAPS.some((gp) => this.s > gp && this.s < gp + 26)) { this.air = 0; this.airY = 0; this.shake = 0.8; sfx.play('px.slam'); for (let i = 0; i < 14; i++) this.smoke.emit(this.world(this.s, this.x, 0.3), V(0, 2, 0), new THREE.Color('#888'), 0.8, 8); } }
    // districts
    let d = 0; for (let i = 0; i < DIST.length; i++) if (this.s >= DIST[i].s0) d = i; if (d !== this.district) { this.district = d; const D = DIST[d]; if (this.t > 1) { this.ch.hud.title('NOW ENTERING', D.name); g.music.stinger(this.ch.sting); } this.cpS = Math.max(20, D.s0 + 60); g.music.setIntensity(Math.min(2, 1 + (d > 1 ? 1 : 0))); for (const e of this.edges) e.material.emissive.set(D.edge); }
    const D = DIST[this.district]; this.sky.set(D.sky[0], D.sky[1], D.sky[2], 0.03); this.scene.fog.color.lerp(new THREE.Color(D.fog), 0.03);
    // pads
    for (const p of this.pads) if (Math.abs(p.s - this.s) < 4 && Math.abs(p.x - this.x) < 2.4 && !this.air && this.boost < 1.2) { this.boost = 2; sfx.play('px.pickup'); sfx.play('px.dash'); }
    // traffic
    for (const T of this.traffic) { if (T.hit > 0) { T.hit += dt; T.t.position.y += (9 - T.hit * 20) * dt; T.t.rotation.x += dt * 5; T.t.rotation.z += dt * 3; if (T.hit > 2.5) { T.hit = 0; T.s = this.s + 320 + Math.random() * 200; T.t.rotation.set(0, 0, 0); } continue; } T.s += T.v * dt; if (T.s < this.s - 50 || T.s > this.s + 700) { T.s = this.s + 300 + Math.random() * 260; T.x = [-6, -2, 2, 6][Math.floor(Math.random() * 4)]; } if (T.s > LEN - 250 || GAPS.some((gp) => Math.abs(T.s - gp - 10) < 60)) T.s += 90;
      let td = 0; for (let i = 0; i < 4; i++) if (T.s >= DIST[i].s0) td = i; if (T.d !== td) { T.d = td; T.parts.forEach((m) => (m.material = T.tm[td])); T.ol.forEach((o) => (o.visible = td === 2)); }
      const ta = this.at(T.s); T.t.position.set(ta.x + Math.cos(ta.th) * T.x, ta.y, ta.z - Math.sin(ta.th) * T.x); T.t.rotation.y = ta.th;
      if (!this.air && Math.abs(T.s - this.s) < 4.3 && Math.abs(T.x - this.x) < 2.0) { T.hit = 0.001; this.xv += Math.sign(this.x - T.x || 1) * 9; this.crash(9, 0.62); } }
    // the Curator's delete-blocks
    this.blockT -= dt; if (this.blockT <= 0 && this.s < 3100) { this.blockT = Math.max(0.9, 2.4 - this.district * 0.35); const b = this.blocks.find((q) => q.t > 4.2); if (b) { b.t = 0; b.s = this.s + 70 + this.v * 1.1; b.x = Math.random() < 0.6 ? clamp(this.x + (Math.random() - 0.5) * 4, -6.5, 6.5) : [-6, -2, 2, 6][Math.floor(Math.random() * 4)]; if (GAPS.some((gp) => Math.abs(b.s - gp - 10) < 50)) b.t = 9; else sfx.play('px.telegraph', { vol: 0.5, pitch: 0.7 }); } }
    for (const b of this.blocks) { if (b.t > 5) { b.warn.position.y = b.pil.position.y = -999; continue; } b.t += dt; const w = this.world(b.s, b.x, 0.08); b.warn.position.copy(w); b.warn.rotation.z = -this.at(b.s).th; b.warn.material.opacity = b.t < 1.1 ? 0.35 + 0.4 * Math.abs(Math.sin(b.t * 14)) : 0; const drop = clamp((b.t - 1.1) / 0.12, 0, 1); b.pil.position.set(w.x, w.y + 8 + (1 - drop) * 60, w.z); if (b.t > 1.1 && b.t - dt <= 1.1 && Math.abs(b.s - this.s) < 120) { sfx.play('px.slam', { vol: 0.6 }); this.shake = Math.max(this.shake, 0.4); } if (drop >= 1 && !this.air && Math.abs(b.s - this.s) < 3.6 && Math.abs(b.x - this.x) < 3) { b.t = 9; this.crash(14, 0.35); } }
    // the Reframer
    this.sR = Math.max(this.sR + (g.easy ? 36 : 46 + this.t * 0.06) * dt, this.s - 290); if (this.sR > this.s - 9) { this.game.dialogue.say('curator', 'Trimmed.'); this.respawn(); }
    if (this.hp < 100) this.hp = Math.min(100, this.hp + dt * 1.5);
    if (this.s > 3330) { this.out = 0.001; this.vy = 13; this.outY = 0; sfx.play('fx.rise'); g.dialogue.clear(); g.dialogue.say([{ who: 'rin', text: 'The road just ENDS.' }, { who: 'vell', text: "Roads do that. Pages don't. Grab the page!" }]); }
    this.vell.userData.tick(this.t);
  }

  frame(dt) {
    const g = this.game, s = this.s, a = this.at(s), t = this.t, lift = (this.airY || 0) + (this.outY || 0);
    const pos = this.world(s, this.x, lift), car = this.car; car.position.copy(pos);
    const slip = Math.atan2(this.xv, Math.max(12, this.v)) * 1.3 - this.drift * 0.42; this.yaw = damp(this.yaw, slip, 9, dt);
    car.rotation.set(0, 0, 0); car.rotateY(a.th + this.yaw); car.rotateX(-a.pitch - (this.air ? clamp(this.vy * 0.02, -0.25, 0.25) : 0) + (this.out ? -this.out * 0.12 : 0)); car.rotateZ(-this.yaw * 0.35 + Math.sin(t * 31) * 0.004 * this.v * 0.05);
    for (const w of this.wheels) { w.w.rotation.x += this.v * dt / 0.42; if (w.front) w.piv.rotation.y = -g.input.axisX * 0.35; }
    this.flame.visible = this.boost > 0; this.flame.scale.set(1, 1 + Math.sin(t * 60) * 0.3 + this.boost * 0.4, 1);
    animateRin(this.rin, { speed: 0, ground: true, vy: 0, slide: true, climb: 0, grapple: false, strike: 0, hurt: 0, t, dt, lookAt: null, talk: false });
    const vp = this.world(s + 2, this.x + 2.2, lift + 2.6 + Math.sin(t * 2) * 0.2); this.vell.position.lerp(vp, Math.min(1, dt * 6)); this.vell.rotation.y = a.th;
    if (this.drift || (this.boost > 0 && Math.random() < 0.5)) for (const sx of [-1, 1]) this.smoke.emit(this.world(s - 1.6, this.x + sx, 0.3), V(0, 1.5, 0), new THREE.Color(this.drift ? '#bbbbbb' : '#8ff5e3'), 0.7, 3);
    if (this.charge > 0.5 && Math.random() < 0.6) this.fx.emit(this.world(s - 1.5, this.x - this.drift, 0.3), V(0, 3, 0), new THREE.Color(this.charge > 1.4 ? '#ff5a8a' : '#ffd166'), 0.35, 6);
    this.fx.update(dt); this.smoke.update(dt); this.gears.forEach((gm, i) => (gm.rotation.y += dt * (i % 2 ? 0.8 : -0.8)));
    const wa = this.at(Math.max(0, this.sR)); this.wall.position.set(wa.x, wa.y, wa.z); this.wall.rotation.y = wa.th; this.wall.visible = this.sR > 0;
    // chase camera
    const back = 8.2 + this.v * 0.045 - (this.boost > 0 ? 1.4 : 0), cs = this.at(s - back), want = V(cs.x + Math.cos(cs.th) * this.x * 0.82, cs.y + 3.1 + lift * 0.75, cs.z - Math.sin(cs.th) * this.x * 0.82);
    if (this.out) want.add(V(Math.cos(a.th) * 10 * this.out, 3 * this.out, 0));
    this.camPos.lerp(want, 1 - Math.exp(-9 * dt)); const sh = this.shake * (g.settings.shake ?? 1) + (this.boost > 0 ? 0.05 : 0); this.cam.position.copy(this.camPos).add(V((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, 0));
    const la = this.world(s + 16, this.x * 0.5, 1.2 + lift * 0.6); this.cam.lookAt(la); this.cam.rotateZ(-this.yaw * 0.22); this.cam.fov = damp(this.cam.fov, 60 + this.v * 0.27 + (this.boost > 0 ? 9 : 0), 5, dt); this.cam.aspect = g.W / g.H; this.cam.updateProjectionMatrix();
    this.sun.position.set(pos.x - 40, pos.y + 70, pos.z - 20); this.sun.target.position.copy(pos); this.sky.update(t, this.cam.position);
    const gap = Math.round(s - this.sR);
    this.ch.hud.set('Outrun the Reframer — reach the core', [bar('HULL', this.hp / 100), bar('DRIFT', this.charge / 2.4), (gap < 70 ? '!' : '') + `<kbd>▲</kbd>REFRAMER ${Math.max(0, gap)} m`, `<kbd>→</kbd>${Math.max(0, Math.round(3330 - s))} m to go`]); this.ch.hud.big.innerHTML = `${Math.round(this.v * 3.6)}<span style="font-size:.35em;letter-spacing:.2em"> KM/H</span>`;
    return { scene: this.scene, cam: this.cam, fx: { bloom: 0.6, threshold: 1.1, vig: 0.42, sat: 1.12, grain: 0.035, con: 1.06 } };
  }
}
void ease;
