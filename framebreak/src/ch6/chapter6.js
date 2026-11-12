// CHAPTER 6 — BLOCK COLLAPSE. A real editable voxel world: chunked storage,
// face-culled chunk meshes rebuilt on edit, per-material hardness, and a
// structural pass that drops anything you cut loose from the ground.
// Dig (J), build (L), outrun THE LEVELER.
import * as THREE from 'three';
import { renderFX } from '../fx/post.js';

import { getRenderer } from '../ch3/chapter3.js';
import { voxAtlas, buildVoxRin, buildVoxVell, buildVoxTurret, buildLeveler } from './voxmodels.js';
import { clamp, lerp, damp, hash2, ease } from '../core/util.js';
import { buildHand } from '../fx/hand.js';

const SX = 168, SY = 32, SZ = 24, CH = 16, AIR = 0, CONC = 1, BRICK = 2, STEEL = 3, WOOD = 4, GLASS = 5, CRACK = 6, PLANK = 7;
const COL = { [CONC]: [0.56, 0.58, 0.64], [BRICK]: [0.72, 0.36, 0.28], [STEEL]: [0.3, 0.36, 0.5], [WOOD]: [0.62, 0.42, 0.24], [GLASS]: [0.55, 0.85, 0.9], [CRACK]: [0.42, 0.43, 0.48], [PLANK]: [0.95, 0.72, 0.36] };
const el = (cls, html = '') => { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; return e; };
const SONG = (() => { const bars = {}; const A = [0, 1, 2, 3].map((i) => { const r = ['D2', 'D2', 'F2', 'C2'][i]; bars['a' + i] = { sub: `${r} - - . ${r} . . ${r} - . ${r} . . . ${r} .`, acid: `${r.replace('2', '3')} . ${r.replace('2', '4')} . . ${r.replace('2', '3')} . . ${r.replace('2', '4')} . . ${r.replace('2', '3')} . ${r.replace('2', '4')} . .`, lead: ['D4 . . A4 . . G4 . F4 . G4 . A4 . . .', 'F4 . . D4 . . C4 . D4 . . . . . . .', 'F4 . . C5 . . A#4 . A4 . A#4 . C5 . . .', 'E4 . . G4 . . C5 . A#4 . G4 . E4 . . .'][i], drums: i === 3 ? 'k . z . p . k k . z k . p . l l' : 'k . z . p . . k . z k . p . z .' }; return 'a' + i; }); return { bpm: 104, gain: 1, reverb: 0.12, start: 'A', tracks: { sub: { inst: 'subbass', vol: 1 }, acid: { inst: 'acid', vol: 0.5, pan: 0.2 }, lead: { inst: 'saw', vol: 0.5, layer: 1, pan: -0.1 }, drums: { kit: 'electro', vol: 1 } }, bars, sections: { A }, next: { A: 'A' } }; })();
export { SONG as SONG_CH6 };

export default class Chapter6 {
  constructor(game) { this.game = game; this.id = 6; this.compositesOutgoing = true; }
  async load() {}
  controlsHelp() { return '<b>W/A/S/D</b> move · <b>SPACE</b> jump · <b>J</b> cut through blocks · <b>L</b> build blocks (bridges, steps)<br>Steel will not cut. Wood supports will. Whatever you cut loose, falls.'; }
  idx(x, y, z) { return x + SX * (z + SZ * y); }
  get(x, y, z) { return x < 0 || y < 0 || z < 0 || x >= SX || y >= SY || z >= SZ ? (y < 0 ? CONC : AIR) : this.v[x + SX * (z + SZ * y)]; }
  set(x, y, z, m) { if (x < 0 || y < 0 || z < 0 || x >= SX || y >= SY || z >= SZ) return; this.v[x + SX * (z + SZ * y)] = m; const cx = x >> 4, cy = y >> 4, cz = z >> 4; this.dirty.add(cx + ',' + cy + ',' + cz); if ((x & 15) === 0) this.dirty.add(cx - 1 + ',' + cy + ',' + cz); if ((x & 15) === 15) this.dirty.add(cx + 1 + ',' + cy + ',' + cz); if ((y & 15) === 0) this.dirty.add(cx + ',' + (cy - 1) + ',' + cz); if ((y & 15) === 15) this.dirty.add(cx + ',' + (cy + 1) + ',' + cz); if ((z & 15) === 0) this.dirty.add(cx + ',' + cy + ',' + (cz - 1)); if ((z & 15) === 15) this.dirty.add(cx + ',' + cy + ',' + (cz + 1)); }
  fill(x0, x1, y0, y1, z0, z1, m) { for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.set(x, y, z, m); }

  start({ handoff }) {
    const g = this.game; this.r = getRenderer(g); this.r.shadowMap.enabled = g.settings.shadows > 0; this.r.toneMappingExposure = 1.1; g.c2d.style.imageRendering = '';
    const S = (this.scene = new THREE.Scene()); S.background = new THREE.Color('#f2b08a'); S.fog = new THREE.Fog('#f2b08a', 40, 110);
    this.cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.3, 300); this.t = 0; this.said = {}; this.fin = null; this.noPause = false; this.shake = 0;
    S.add(new THREE.HemisphereLight('#fff0dc', '#6a5a7a', 1.0)); const sun = (this.sun = new THREE.DirectionalLight('#fff2d8', 2.2)); sun.castShadow = g.settings.shadows > 0; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160 }); sun.shadow.bias = -0.001; S.add(sun, sun.target);
    this.v = new Uint8Array(SX * SY * SZ); this.dirty = new Set(); this.chunks = {}; this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, map: voxAtlas() });
    this.gen(); for (const k of this.dirty) this.mesh(k); this.dirty.clear();
    // debris pool
    this.deb = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ roughness: 0.9 }), 700); this.deb.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.deb.castShadow = true; this.deb.count = 0; S.add(this.deb); this.debris = []; this.dummy = new THREE.Object3D();
    // Rin + Vell (voxel-art models on pivots)
    const vr = buildVoxRin(); this.rin = vr.group; this.legs = vr.legs; this.arms = vr.arms; S.add(this.rin);
    this.vell = buildVoxVell(); S.add(this.vell);
    const lv = buildLeveler(SZ); this.lev = lv.group; this.drums = lv.drums; S.add(this.lev); this.lx = -26;
    { const hm = new THREE.MeshLambertMaterial({ color: '#d9a07a', flatShading: true }); this.pushHand = buildHand(hm); this.pushHand.scale.setScalar(9); this.pushHand.rotation.y = Math.PI / 2; this.pushHand.position.set(-13, 5, SZ / 2); this.lev.add(this.pushHand); this.builder = buildHand(hm, { left: true }); this.builder.scale.setScalar(6); this.builder.rotation.set(Math.PI, 0, 0); this.builder.position.set(0, 80, 12); S.add(this.builder); this.bt = 5; this.bjob = null; }
    this.turrets = [[104, 12], [128, 8]].map(([x, z]) => { const m = buildVoxTurret(); m.position.set(x, 3, z); S.add(m); return { m, x, z, cool: 1, dead: false }; });
    this.orbs = []; this.orbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff5a3c' }));
    this.cps = [6, 54, 84, 112]; this.cp = 0; this.introK = handoff ? 0 : 1;
    this.p = { x: 6, y: 3, z: 12, vx: 0, vy: 0, vz: 0, fx: 1, fz: 0, ground: false, hp: 5, cd: 0, walk: 0, inv: 0, swing: 0 };
    this.ui = el('hud3'); this.dlg = el('dlg dark', '<div class="who"></div><div class="txt"></div>'); this.banner = el('banner', '<small>CHAPTER 6</small>BLOCK COLLAPSE'); this.hud = el('mach'); this.ui.append(this.dlg, this.banner, this.hud); g.ui.appendChild(this.ui);
    g.show3d(true); if (handoff) g.fadeFrozen(900, () => g.director.releaseOutgoing()); else g.clear2d();
    g.audio.muffle(0); g.music.play(SONG, { intensity: 1, fade: 0.5 }); setTimeout(() => { this.banner.style.opacity = '1'; setTimeout(() => (this.banner.style.opacity = '0'), 3000); }, 500);
    g.dialogue.say([{ who: 'vell', text: 'Volume! Everything here is made of the same little cube. Including the walls. Hint.' }, { who: 'vell', text: 'J cuts. L builds. And that noise behind us is the Curator\'s LEVELER, so... forward.' }]);
    g.director.preload(7);
  }
  stop() { this.game.gl.style.imageRendering = ''; this.ui?.remove(); this.scene = null; }
  respawn() { const p = this.p; p.x = this.cps[this.cp]; p.y = 12; p.z = 12; p.vx = p.vy = p.vz = 0; p.hp = 5; p.inv = 2; this.lx = p.x - 30; this.orbs.forEach((o) => this.scene.remove(o.m)); this.orbs = []; }
  gen() {
    const R = (a, b) => hash2(a * 7.3 + 1, b * 3.1 + 2);
    this.fill(0, SX - 1, 0, 2, 0, SZ - 1, CONC);
    for (let x = 0; x < SX; x += 6) this.fill(x, x + 2, 2, 2, 11, 12, PLANK);                 // lane markings
    for (let x = 0; x < SX; x++) { this.set(x, 2, 4, STEEL); this.set(x, 2, 19, STEEL); }      // kerbs
    // skyline: towers with window bands, ledges, doors, awnings and rooftop kit
    for (let x = 2; x < SX - 9; x += 9) { const h = 9 + Math.floor(R(x, 1) * 16), m = R(x, 2) > 0.5 ? BRICK : CONC, w = 5 + Math.floor(R(x, 3) * 3);
      this.fill(x, x + w, 3, h, 0, 3, m); this.fill(x, x + w, h + 1, h + 1, 0, 3, STEEL);
      for (let y = 6; y < h - 1; y += 3) for (let wx = x + 1; wx < x + w; wx += 2) { this.set(wx, y, 3, GLASS); this.set(wx, y + 1, 3, GLASS); }
      for (let y = 8; y < h; y += 6) this.fill(x, x + w, y, y, 4, 4, m === BRICK ? CONC : BRICK);
      this.fill(x + 1, x + 2, 3, 5, 3, 3, WOOD); if (R(x, 6) > 0.45) this.fill(x, x + w, 7, 7, 4, 5, PLANK);
      if (R(x, 4) > 0.4) this.fill(x + 1, x + 2, h + 2, h + 3 + Math.floor(R(x, 5) * 4), 1, 2, STEEL); if (R(x, 7) > 0.5) this.fill(x + w - 1, x + w - 1, h + 2, h + 7, 2, 2, STEEL); }
    for (let x = 8; x < SX - 8; x += 14) { this.fill(x, x, 3, 8, 5, 5, STEEL); this.set(x, 8, 6, STEEL); this.set(x, 7, 6, GLASS); }  // lamp posts
    for (let i = 0; i < 16; i++) { const x = 10 + Math.floor(R(i, 9) * (SX - 30)), z = R(i, 10) > 0.5 ? 6 + Math.floor(R(i, 12) * 3) : 15 + Math.floor(R(i, 12) * 3); this.fill(x, x + 1, 3, 4, z, z + 1, WOOD); if (R(i, 11) > 0.6) this.fill(x, x, 5, 5, z, z, WOOD); } // crates
    this.fill(24, 26, 3, 11, 4, SZ - 5, BRICK); this.fill(24, 26, 12, 12, 4, SZ - 5, STEEL); for (let z = 6; z < SZ - 6; z += 3) this.fill(24, 26, 8, 9, z, z, GLASS);   // 1) brick wall: cut through
    this.fill(40, 49, 0, 12, 0, SZ - 1, AIR);                                                                                              // 2) chasm: build across
    this.fill(68, 70, 3, 13, 4, SZ - 5, STEEL); this.fill(68, 70, 3, 6, 14, 17, CONC);                                                      // 3) steel wall with a concrete plug
    for (const [x, z] of [[94, 8], [94, 15], [99, 8], [99, 15]]) this.fill(x, x, 3, 9, z, z, WOOD);                                         // 4) tower on stilts
    this.fill(92, 101, 10, 17, 6, 17, BRICK); this.fill(93, 100, 11, 16, 7, 16, AIR); this.fill(92, 101, 10, 10, 6, 17, CONC); for (let x = 93; x < 101; x += 2) { this.fill(x, x, 13, 14, 6, 6, GLASS); this.fill(x, x, 13, 14, 17, 17, GLASS); } this.fill(92, 101, 18, 18, 6, 17, STEEL);
    this.fill(118, 120, 3, 8, 4, SZ - 5, STEEL);                                                                                            // 5) steel barricade: build over it
    this.fill(136, 138, 3, 9, 4, SZ - 5, BRICK); this.fill(150, SX - 1, 3, 20, 4, SZ - 5, CONC); this.fill(150, SX - 1, 3, 7, 10, 13, AIR);
  }
  mesh(key) { // face-culled chunk mesh with per-vertex ambient occlusion and atlas UVs
    const [cx, cy, cz] = key.split(',').map(Number); if (cx < 0 || cy < 0 || cz < 0 || cx * CH >= SX || cy * CH >= SY || cz * CH >= SZ) return;
    const pos = [], col = [], nor = [], uv = [], F = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], Q = [[[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]], LIGHT = [0.84, 0.72, 1, 0.5, 0.92, 0.64], o = [0, 0, 0], ao = [0, 0, 0, 0];
    for (let y = cy * CH; y < Math.min(SY, cy * CH + CH); y++) for (let z = cz * CH; z < Math.min(SZ, cz * CH + CH); z++) for (let x = cx * CH; x < Math.min(SX, cx * CH + CH); x++) {
      const m = this.v[x + SX * (z + SZ * y)]; if (!m) continue; const nz = 0.93 + hash2(x * 3 + y, z * 7 + y) * 0.14, tile = m - 1;
      for (let f = 0; f < 6; f++) { const n = F[f]; if (this.get(x + n[0], y + n[1], z + n[2])) continue; const q = Q[f], ax = f >> 1, ua = (ax + 1) % 3, va = (ax + 2) % 3;
        for (let i = 0; i < 4; i++) { const c = q[i], su = c[ua] ? 1 : -1, sv = c[va] ? 1 : -1; o[0] = x + n[0]; o[1] = y + n[1]; o[2] = z + n[2]; o[ua] += su; const s1 = this.get(o[0], o[1], o[2]) ? 1 : 0; o[va] += sv; const cc = this.get(o[0], o[1], o[2]) ? 1 : 0; o[ua] -= su; const s2 = this.get(o[0], o[1], o[2]) ? 1 : 0; ao[i] = s1 && s2 ? 0 : 3 - (s1 + s2 + cc); }
        for (const i of [0, 1, 2, 0, 2, 3]) { const c = q[i], l = LIGHT[f] * nz * (0.52 + ao[i] * 0.16); pos.push(x + c[0], y + c[1], z + c[2]); col.push(l, l, l); nor.push(n[0], n[1], n[2]); const u = ax === 0 ? c[2] : c[0], vv = ax === 1 ? c[2] : c[1]; uv.push((tile + 0.02 + u * 0.96) / 8, vv); } } }
    let me = this.chunks[key]; if (me) { me.geometry.dispose(); this.scene.remove(me); delete this.chunks[key]; } if (!pos.length) return;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    me = new THREE.Mesh(geo, this.mat); me.castShadow = me.receiveShadow = true; this.scene.add(me); this.chunks[key] = me;
  }
  spawnDebris(x, y, z, m, vx = 0, vy = 0) { if (this.debris.length >= 700 * (this.game.settings.particles ?? 1) * 0.9) return; const c = COL[m] || COL[CONC]; this.debris.push({ x: x + 0.5, y: y + 0.5, z: z + 0.5, vx: vx + (Math.random() - 0.5) * 5, vy: vy + Math.random() * 4, vz: (Math.random() - 0.5) * 5, t: 0, s: 0.45 + Math.random() * 0.4, c, rx: Math.random() * 6, ry: Math.random() * 6 }); }
  // Remove a ball of voxels (respecting hardness), then let unsupported structure fall.
  carve(cx, cy, cz, r, power = 1) {
    let n = 0; const seeds = [];
    for (let y = Math.max(3, Math.floor(cy - r)); y <= cy + r; y++) for (let z = Math.floor(cz - r); z <= cz + r; z++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 + (z + 0.5 - cz) ** 2 > r * r) continue; const m = this.get(x, y, z); if (!m || (m === STEEL && power < 9)) continue;
      if (m === CONC && power < 2) { this.set(x, y, z, CRACK); n++; continue; } this.set(x, y, z, AIR); if (n++ % 2 === 0) this.spawnDebris(x, y, z, m); seeds.push([x, y + 1, z], [x + 1, y, z], [x - 1, y, z], [x, y, z + 1], [x, y, z - 1]);
    }
    if (seeds.length) this.settle(seeds); return n;
  }
  settle(seeds) { // flood-fill from the cut: any connected piece that never touches the ground drops
    const seen = new Set(); let dropped = 0;
    for (const s of seeds) { const k0 = this.idx(s[0], s[1], s[2]); if (!this.get(s[0], s[1], s[2]) || seen.has(k0)) continue; const comp = [], st = [s]; let grounded = false; seen.add(k0);
      while (st.length) { const [x, y, z] = st.pop(); comp.push([x, y, z]); if (y <= 2 || comp.length > 6000) { grounded = true; break; } for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const X = x + dx, Y = y + dy, Z = z + dz; if (!this.get(X, Y, Z)) continue; const k = this.idx(X, Y, Z); if (!seen.has(k)) { seen.add(k); st.push([X, Y, Z]); } } }
      if (!grounded) { let mx = 0, mz = 0; comp.forEach(([x, y, z], i) => { const m = this.get(x, y, z); this.set(x, y, z, AIR); if (i % Math.ceil(comp.length / 160) === 0) this.spawnDebris(x, y, z, m, 0, -2); mx += x; mz += z; }); dropped += comp.length; mx /= comp.length; mz /= comp.length; for (const t of this.turrets) if (!t.dead && Math.hypot(t.x - mx, t.z - mz) < 9) { t.dead = true; this.scene.remove(t.m); this.game.sfx.play('px.explode'); this.game.dialogue.say('vell', 'You dropped a BUILDING on it. That counts as tidying!'); } } }
    if (dropped > 30) { this.shake = 1; this.game.sfx.play('fx.boom'); }
  }
  solidAt(x, y, z) { return !!this.get(Math.floor(x), Math.floor(y), Math.floor(z)); }
  hits(x, y, z) { const r = 0.3; for (const dy of [0.05, 0.9, 1.7]) for (const dx of [-r, r]) for (const dz of [-r, r]) if (this.solidAt(x + dx, y + dy, z + dz)) return true; return false; }

  update(dt, outgoing) {
    if (outgoing || !this.scene) return; const g = this.game, inp = g.input, p = this.p, sfx = g.sfx; this.t += dt; p.cd -= dt; p.inv -= dt; p.swing = Math.max(0, p.swing - dt * 5);
    if (this.fin) return this.updateFinale(dt);
    if (this.introK < 1) { this.introK = Math.min(1, this.introK + dt / 4.2); this.lx = Math.min(this.lx, p.x - 34); }
    const ax = (inp.down.up ? 1 : 0) - (inp.down.down ? 1 : 0), az = inp.axisX, len = Math.hypot(ax, az) || 1, sp = 7;
    p.vx = lerp(p.vx, (ax / len) * sp, 0.25); p.vz = lerp(p.vz, (az / len) * sp, 0.25); if (ax || az) { p.fx = ax / len; p.fz = az / len; p.walk += dt * 12; }
    if (inp.pressed.jump && p.ground) { p.vy = 9.5; sfx.play('px.jump', { pitch: 0.8 }); } p.vy = Math.max(p.vy - 26 * dt, -30);
    // move with one-block auto-step
    for (const [k, v] of [['x', p.vx * dt], ['z', p.vz * dt]]) { const o = p[k]; p[k] += v; if (this.hits(p.x, p.y, p.z)) { if (p.ground && !this.hits(p.x, p.y + 1.05, p.z)) p.y += 1.05; else p[k] = o; } }
    p.z = clamp(p.z, 0.5, SZ - 0.5); p.x = Math.max(p.x, 0.5);
    p.y += p.vy * dt; p.ground = false; if (this.hits(p.x, p.y, p.z)) { if (p.vy < 0) { p.y = Math.floor(p.y) + 1; p.ground = true; } else p.y = Math.floor(p.y + 1.7) - 1.75; p.vy = 0; }
    // cut / build
    if (inp.down.attack && p.cd <= 0) { p.cd = 0.22; p.swing = 1; const n = this.carve(p.x + p.fx * 1.7, p.y + 1.1, p.z + p.fz * 1.7, 1.9, 1); sfx.play(n ? 'px.crumble' : 'px.swing', { pitch: n ? 1.2 : 1 }); if (n) this.shake = Math.max(this.shake, 0.15); }
    if (inp.down.shoot && p.cd <= 0) { const bx = Math.floor(p.x + p.fx * 1.2), bz = Math.floor(p.z + p.fz * 1.2), fy = Math.floor(p.y + 0.01); for (const y of [fy - 1, fy, fy + 1]) if (!this.get(bx, y, bz) && y >= 0) { for (const dz of [-1, 0, 1]) { const zz = bz + (p.fx ? dz : 0), xx = bx + (p.fx ? 0 : dz); if (!this.get(xx, y, zz)) this.set(xx, y, zz, PLANK); } p.cd = 0.13; p.swing = 1; sfx.play('pp.thunk', { pitch: 1.5, vol: 0.6 }); break; } }
    // THE LEVELER: grinds forward, erasing every column it passes
    const want = Math.max(this.lx + (3.4 + this.t * 0.012) * (g.easy ? 0.55 : 1) * dt, p.x - 46); const from = Math.floor(this.lx), to = Math.floor(want); this.lx = want;
    for (let x = Math.max(0, from); x < Math.min(SX, to); x++) for (let y = 0; y < SY; y++) for (let z = 0; z < SZ; z++) { const m = this.v[this.idx(x, y, z)]; if (m) { this.set(x, y, z, AIR); if (Math.random() < 0.05) this.spawnDebris(x, y, z, m, 4, 3); } }
    if (to > from && Math.random() < 0.5) sfx.play('px.crumble', { vol: clamp(1 - (p.x - this.lx) / 40, 0.05, 0.7), pitch: 0.6 });
    if (p.x < this.lx + 1.5 || p.y < -12) { sfx.play('px.die'); g.save.data.stats.deaths++; this.respawn(); }
    // turrets
    for (const t of this.turrets) { if (t.dead) continue; if (t.x < this.lx) { t.dead = true; this.scene.remove(t.m); continue; } t.cool -= dt; const d = t.x - p.x; if (d > 2 && d < 30 && t.cool <= 0) { t.cool = 1.5; const m = this.orbMesh.clone(); this.scene.add(m); const a = Math.atan2(p.z - t.z, p.x - t.x); this.orbs.push({ m, x: t.x - 1, y: 4, z: t.z, vx: Math.cos(a) * 11, vz: Math.sin(a) * 11, t: 0 }); sfx.play('px.shot', { pitch: 0.5, vol: 0.5 }); } }
    for (const o of this.orbs) { o.x += o.vx * dt; o.z += o.vz * dt; o.t += dt; o.m.position.set(o.x, o.y, o.z); if (this.solidAt(o.x, o.y, o.z) || o.t > 4) o.dead = true; else if (Math.hypot(o.x - p.x, o.z - p.z) < 0.7 && Math.abs(o.y - p.y - 1) < 1.2 && p.inv <= 0) { o.dead = true; if (!(g.easy && p.hp <= 1)) p.hp--; p.inv = g.easy ? 2.5 : 1; sfx.play('px.hurt'); this.shake = 0.4; if (p.hp <= 0) this.respawn(); } if (o.dead) this.scene.remove(o.m); } this.orbs = this.orbs.filter((o) => !o.dead);
    this.cps.forEach((x, i) => { if (p.x > x && i > this.cp) { this.cp = i; g.save.setCheckpoint(6, null); p.hp = 5; } });
    const say = (k, x, who, text) => { if (!this.said[k] && p.x > x) { this.said[k] = true; g.dialogue.say(who, text); } };
    say('a', 17, 'vell', 'Brick. One cut. Go THROUGH.'); say('b', 33, 'vell', 'No floor. So make one — hold L and walk.'); say('c', 60, 'vell', "Steel doesn't cut. That grey plug in the middle isn't steel."); say('d', 84, 'rin', 'That tower is standing on four sticks.'); say('e', 110, 'vell', "Can't cut it, can't go round it. Stack blocks and climb.");
    if (p.x > 152) this.startFinale();
    this.shake = Math.max(0, this.shake - dt * 1.5);
    let budget = 6; for (const k of this.dirty) { this.mesh(k); this.dirty.delete(k); if (--budget <= 0) break; }
    for (const d of this.debris) { d.t += dt; d.vy -= 24 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt; if (d.vy < 0 && this.solidAt(d.x, d.y - d.s / 2, d.z)) { d.y = Math.floor(d.y - d.s / 2) + 1 + d.s / 2; d.vy *= -0.3; d.vx *= 0.6; d.vz *= 0.6; } } this.debris = this.debris.filter((d) => d.t < 3.2 && d.y > -20);
  }
  // ---- VOXEL → HIGH DETAIL: blocks split smaller and smaller ---------------------------
  startFinale() { const g = this.game; this.fin = { t: 0 }; this.noPause = true; g.sfx.play('fx.rise'); g.sfx.play('fx.shimmer'); g.dialogue.clear(); g.dialogue.say([{ who: 'vell', text: 'The cubes are splitting. Halves. Quarters. Smaller than I can count—' }, { who: 'rin', text: '...I can feel my fingers. All ten. Separately.' }]); for (let x = 150; x < SX; x += 2) for (let y = 3; y < 20; y += 2) for (let z = 4; z < SZ - 4; z += 3) if (this.get(x, y, z)) this.spawnDebris(x, y, z, CONC, -3, 6); }
  updateFinale(dt) { const f = this.fin, g = this.game; f.t += dt; f.k = clamp(f.t / 6, 0, 1); for (const d of this.debris) { d.t = Math.min(d.t, 1); d.vy += 30 * dt; d.s *= 1 - dt * 0.5; if (d.s < 0.12 && this.debris.length < 600) { d.s = 0.3; this.debris.push({ ...d, vx: -d.vx + 2, vz: -d.vz, s: 0.3 }); } d.x += d.vx * dt; d.y += d.vy * dt * 0.3; d.z += d.vz * dt; } if (Math.random() < 0.6) this.carve(150 + Math.random() * 16, 4 + Math.random() * 14, 6 + Math.random() * 12, 2.5, 9); let b = 8; for (const k of this.dirty) { this.mesh(k); this.dirty.delete(k); if (--b <= 0) break; } g.audio.muffle(f.k * 0.6); if (f.t > 6.4) f.snap = true; }

  render(dt) {
    if (!this.scene) return; const g = this.game, r = this.r, p = this.p, t = this.t; { const px = this.introK < 1 ? [10, 8, 6, 5, 4, 3, 2, 1][Math.min(7, Math.floor(this.introK * 2.4 * 8))] || 1 : 1, w = Math.round(g.W / px), h = Math.round(g.H / px); if (r.domElement.width !== w || r.domElement.height !== h) { r.setSize(w, h, false); g.gl.style.imageRendering = px > 1 ? 'pixelated' : ''; } }
    this.rin.position.set(p.x, p.y, p.z); this.rin.rotation.y = Math.atan2(-p.fz, p.fx) + Math.PI / 2; const mv = Math.hypot(p.vx, p.vz) > 1 && p.ground ? Math.sin(p.walk) * 0.7 : 0; this.legs[0].rotation.x = mv; this.legs[1].rotation.x = -mv; this.arms[0].rotation.x = -mv; this.arms[1].rotation.x = mv - p.swing * 2.2; this.rin.visible = !(p.inv > 0 && Math.floor(p.inv * 14) % 2);
    this.vell.position.set(p.x - 1.2, p.y + 2.6 + Math.sin(t * 2.4) * 0.3, p.z + 1); this.vell.rotation.y = Math.sin(t) * 0.6; this.rin.userData.tick?.(t, p);
    this.lev.position.x = this.lx; this.pushHand.userData.curl([0, 1, 2, 3].map((i) => 0.12 + Math.max(0, Math.sin(t * 6 - i * 0.9)) * 0.35)); this.pushHand.position.y = 5 + Math.sin(t * 2.2) * 0.4;
    if (!this.fin && this.introK >= 1) { this.bt -= 1 / 60; if (this.bt <= 0 && !this.bjob) { const bx = Math.min(SX - 6, Math.floor(p.x + 13 + Math.random() * 7)), bz = Math.max(2, Math.min(SZ - 4, Math.floor(p.z))); let top = 0; for (let y = SY - 1; y >= 0; y--) if (this.get(bx, y, bz) !== AIR) { top = y + 1; break; } this.bjob = { x: bx, z: bz, top, t: 0, done: false }; }
      const J = this.bjob; if (J) { J.t += 1 / 60; const u = J.t < 1 ? ease.inOutCubic(J.t) : J.t < 1.5 ? 1 : 1 - ease.inOutCubic(Math.min(1, (J.t - 1.5) / 1.2)); this.builder.position.set(J.x + 1, lerp(J.top + 34, J.top + 8.5, u), J.z + 1); this.builder.userData.curl(J.t < 1.1 ? 0.75 : 0.1); this.builder.userData.thumb(J.t < 1.1 ? 0.9 : 0.1); if (J.t > 1.05 && !J.done) { J.done = true; if (J.top < SY - 4) for (let dx = 0; dx < 2; dx++) for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) this.set(J.x + dx, J.top + dy, J.z + dz, dy ? PLANK : WOOD); g.sfx.play('pp.thunk', { vol: 0.6 }); this.shake = Math.max(this.shake || 0, 0.25); } if (J.t > 2.8) { this.bjob = null; this.bt = 6 + Math.random() * 4; } } } this.drums.forEach((d, i) => (d.rotation.y = t * (i % 2 ? 7 : -7)));
    const k = this.fin?.k || 0, sh = this.shake * (g.settings.shake ?? 1), tgt = new THREE.Vector3(p.x + 4, p.y + 1.5, lerp(p.z, SZ / 2, 0.5));
    const want = new THREE.Vector3(p.x - 11 + k * 6, p.y + 9 + k * 14, lerp(p.z, SZ / 2, 0.5) + 12); this.cam.position.lerp(want, 1 - Math.exp(-4 * dt)); this.cam.position.x += (Math.random() - 0.5) * sh; this.cam.position.y += (Math.random() - 0.5) * sh; if (this.introK < 1) { const e = ease.inOutCubic(clamp((this.introK - 0.45) / 0.55, 0, 1)); this.cam.position.lerpVectors(new THREE.Vector3(p.x + 0.25, p.y + 1.62, p.z), want, e); tgt.lerpVectors(new THREE.Vector3(p.x + 12, p.y + 1.4, p.z), tgt.clone(), e); this.rin.visible = e > 0.12; this.cam.fov = lerp(72, 50, e); } this.cam.lookAt(tgt); this.cam.aspect = g.W / g.H; this.cam.updateProjectionMatrix();
    this.sun.position.set(p.x - 20, 50, 34); this.sun.target.position.set(p.x + 6, 0, 12);
    const n = Math.min(700, this.debris.length), col = new THREE.Color(); this.deb.count = n; for (let i = 0; i < n; i++) { const d = this.debris[i], s = d.s * (d.t > 2.6 ? (3.2 - d.t) / 0.6 : 1); this.dummy.position.set(d.x, d.y, d.z); this.dummy.rotation.set(d.rx + d.t * 3, d.ry + d.t * 2, 0); this.dummy.scale.setScalar(Math.max(0.01, s)); this.dummy.updateMatrix(); this.deb.setMatrixAt(i, this.dummy.matrix); this.deb.setColorAt(i, col.setRGB(d.c[0], d.c[1], d.c[2])); } this.deb.instanceMatrix.needsUpdate = true; if (this.deb.instanceColor) this.deb.instanceColor.needsUpdate = true;
    if (k > 0) { this.scene.fog.near = lerp(40, 4, k); this.scene.fog.far = lerp(110, 30, k); this.scene.fog.color.lerp(new THREE.Color('#ffffff'), 0.03); this.scene.background = this.scene.fog.color; }
    renderFX(g, r, this.scene, this.cam, { bloom: 0.45, vig: 0.34, sat: 1.1 });
    if (this.fin?.snap && !this.fin.done) { this.fin.done = true; g.freezeFrame(); const ok = g.director.handoff(7, { from6: true }); if (!ok) { g.clear2d(); g.save.complete(6); g.audio.muffle(0); g.director.end({ chapter: 6 }); } return; }
    const hud = `<div><kbd>♥</kbd>${'■'.repeat(Math.max(0, p.hp))}${'□'.repeat(5 - Math.max(0, p.hp))}</div><div class="${p.x - this.lx < 14 ? 'sel' : ''}"><kbd>!</kbd>LEVELER ${Math.max(0, Math.round(p.x - this.lx))} m</div>`; if (hud !== this._hud) { this.hud.innerHTML = this._hud = hud; }
    const d = g.dialogue.current; if (d) { this.dlg.style.display = 'block'; this.dlg.firstChild.textContent = d.speaker.name; this.dlg.firstChild.style.color = d.speaker.color; this.dlg.lastChild.textContent = g.dialogue.visibleText; } else this.dlg.style.display = 'none';
  }
  perfInfo() { return `chunks ${Object.keys(this.chunks).length} · debris ${this.debris.length}`; }
}
void damp; void ease;
