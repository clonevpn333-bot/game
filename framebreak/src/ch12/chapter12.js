// CHAPTER 12 — LOOSE THREADS. A knitted valley in real 3D: every surface is
// stitches, with fair-isle bands, patchwork hills, pom-pom trees and sewing
// pins. Rin rides a ball of wool downhill. Rolling spends wool (the ball
// unwinds behind you as a thread), skeins wind it back up, and where the
// knitting has come undone there is nothing to roll on.
import * as THREE from 'three';
import { renderFX } from '../fx/post.js';
import { getRenderer } from '../ch3/chapter3.js';
import { canvasTex, normalFromHeight } from '../fx/tex.js';
import { V, buildVell, buildHud, bar } from '../ch18/kit.js';
import { clamp, lerp, hash2, TAU } from '../core/util.js';

const LEN = 1000, RAMPS = [340, 540, 820], HOLES = [[150, 172, -1], [250, 270, 1], [340, 348, 0], [420, 444, -1], [468, 492, 1], [540, 548, 0], [620, 650, 1], [700, 724, -1], [728, 752, 1], [820, 828, 0], [880, 910, -1]];
const cxf = (z) => Math.sin(z * 0.017) * 20 + Math.sin(z * 0.006 + 1) * 14;
function H(x, z) { const u = x - cxf(z); let h = -z * 0.14 + Math.min(10, u * u * 0.014) + Math.sin(z * 0.09) * 0.6 * Math.min(1, Math.abs(u) / 10) + Math.sin(x * 0.21 + z * 0.13) * 0.22; for (const r of RAMPS) if (z > r - 10 && z <= r) h += ((z - r + 10) / 10) * 4 * clamp(1.4 - Math.abs(u) / 9, 0, 1); return h; }
const hole = (x, z) => { const u = x - cxf(z); for (const [a, b, s] of HOLES) if (z > a && z < b && Math.abs(u) < 13 && (s === 0 || s * u > 1.5)) return true; return false; };
const SONG = (() => { const bars = {}, ch = [['C4+E4+G4', 'C2', 'E5 . G5 . C6 . . G5 . . E5 . G5 . . .'], ['A3+C4+E4', 'A1', 'E5 . A5 . C6 . . A5 . . E5 . C5 . . .'], ['F3+A3+C4', 'F2', 'F5 . A5 . C6 . . A5 . . F5 . A5 . . .'], ['G3+B3+D4', 'G2', 'D5 . G5 . B5 . . D6 . . B5 . G5 . D5 .']];
  const A = ch.map(([c, b, m], i) => { bars['a' + i] = { uke: `${c} . . ${c} . . ${c} . . . ${c} . ${c} . . .`, bass: `${b} . . . . . ${b} . ${b} . . . . . . .`, mel: m, drums: 'k . h . s . h . k . h k s . h .' }; return 'a' + i; });
  return { bpm: 112, gain: 1, reverb: 0.2, start: 'A', tracks: { uke: { inst: 'ukulele', vol: 0.7, pan: -0.2 }, bass: { inst: 'upright', vol: 0.85 }, mel: { inst: 'marimba', vol: 0.6, pan: 0.2, send: 0.3, layer: 1 }, drums: { kit: 'chip', vol: 0.35 } }, bars, sections: { A }, next: { A: 'A' } }; })();
export { SONG as SONG_CH12 };
const WOOL = ['#e8dcc0', '#d9a441', '#3f9c94', '#c9605a', '#8fae6e', '#6b7fb8'].map((c) => new THREE.Color(c));

export default class Chapter12 {
  constructor(game) { this.game = game; this.id = 12; this.compositesOutgoing = true; }
  async load() {
    const stitch = (ctx, s) => { ctx.fillStyle = '#777'; ctx.fillRect(0, 0, s, s); const n = 4, c = s / n; for (let j = -1; j <= n; j++) for (let i = 0; i < n; i++) for (const d of [-1, 1]) { const x = i * c + c / 2 + d * c * 0.23, y = j * c + c * 0.5, g = ctx.createLinearGradient(x - c * 0.2, y, x + c * 0.2, y); g.addColorStop(0, d < 0 ? '#fff' : '#b5b5b5'); g.addColorStop(1, d < 0 ? '#b5b5b5' : '#fff'); ctx.fillStyle = g; ctx.save(); ctx.translate(x, y); ctx.rotate(d * 0.5); ctx.beginPath(); ctx.ellipse(0, 0, c * 0.2, c * 0.62, 0, 0, TAU); ctx.fill(); ctx.restore(); } };
    this.knit = canvasTex(128, stitch); this.knitN = normalFromHeight(this.knit.image, 3.2);
    const yarn = (ctx, s) => { ctx.fillStyle = '#cfcfcf'; ctx.fillRect(0, 0, s, s); for (let i = 0; i < 90; i++) { const y = hash2(i, 1) * s, a = (hash2(i, 2) - 0.5) * 0.9; ctx.strokeStyle = hash2(i, 3) > 0.5 ? '#fff' : '#8d8d8d'; ctx.lineWidth = 5 + hash2(i, 4) * 4; ctx.beginPath(); ctx.moveTo(-10, y); ctx.lineTo(s + 10, y + Math.tan(a) * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-10, y - s); ctx.lineTo(s + 10, y - s + Math.tan(a) * s); ctx.stroke(); } };
    this.yarnT = canvasTex(256, yarn); this.yarnN = normalFromHeight(this.yarnT.image, 4);
  }
  controlsHelp() { return '<b>W/S</b> roll / brake · <b>A/D</b> steer · <b>SPACE</b> hop<br>Rolling unwinds your wool. Pick up skeins to wind it back. Do not roll where the knitting has come undone.'; }
  wool(color, o = {}) { return new THREE.MeshPhysicalMaterial({ color, map: this.knit, normalMap: this.knitN, roughness: 1, sheen: 1, sheenRoughness: 0.7, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#fff'), 0.5), ...o }); }
  start({ handoff } = {}) {
    const g = this.game, r = (this.r = getRenderer(g)); r.shadowMap.enabled = g.settings.shadows > 0; r.toneMappingExposure = 0.78; g.c2d.style.imageRendering = ''; g.gl.style.imageRendering = '';
    const S = (this.scene = new THREE.Scene()); S.background = new THREE.Color('#f1d3bd'); S.fog = new THREE.FogExp2('#f1d3bd', 0.0075); this.cam = new THREE.PerspectiveCamera(56, g.W / g.H, 0.3, 600);
    this.hemi = new THREE.HemisphereLight('#fff4e4', '#b98a78', 0.75); const sun = (this.sun = new THREE.DirectionalLight('#ffe2bd', 2.2)); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -40, right: 40, top: 40, bottom: -40, near: 1, far: 160 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.05; S.add(this.hemi, sun, sun.target);
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(450, 24, 16), new THREE.MeshBasicMaterial({ color: '#f1d3bd', side: THREE.BackSide, fog: false, depthWrite: false })); S.add(this.dome);
    { const under = new THREE.Mesh(new THREE.PlaneGeometry(500, LEN + 400), new THREE.MeshStandardMaterial({ color: '#b98068', roughness: 1 })); under.rotation.x = -Math.PI / 2 + 0.139; under.position.set(0, -LEN * 0.07 - 30, LEN / 2); under.receiveShadow = true; S.add(under); }
    // --- the knitted valley
    const NU = 81, DU = 1.1, Z0 = -24, NZ = Math.ceil((LEN + 60) / DU), pos = new Float32Array(NU * NZ * 3), col = new Float32Array(NU * NZ * 3), uv = new Float32Array(NU * NZ * 2), idx = [], c = new THREE.Color();
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NU; i++) { const z = Z0 + j * DU, u = (i - 40) * DU, x = cxf(z) + u, o = j * NU + i, band = Math.floor(z / 26);
      pos[o * 3] = x; pos[o * 3 + 1] = H(x, z); pos[o * 3 + 2] = z; uv[o * 2] = x * 0.42; uv[o * 2 + 1] = z * 0.42;
      if (Math.abs(u) > 15) c.copy(WOOL[Math.floor(hash2(Math.floor(u / 9), Math.floor(z / 13)) * 6)]).multiplyScalar(0.92); else { c.copy(WOOL[((band % 6) + 6) % 6]); const zz = ((z % 26) + 26) % 26; if (zz < 6 && (((i + Math.floor(zz / DU)) % 4) + 4) % 4 < 2) c.copy(WOOL[(((band + 3) % 6) + 6) % 6]); if (zz > 6 && zz < 7.2) c.copy(WOOL[0]); }
      for (const [a, b, s] of HOLES) if (z > a - 1.5 && z < b + 1.5 && Math.abs(u) < 14.5 && (s === 0 || s * u > 0)) c.lerp(new THREE.Color('#5a3a34'), 0.35);                                          // frayed edge
      col[o * 3] = c.r; col[o * 3 + 1] = c.g; col[o * 3 + 2] = c.b; }
    for (let j = 0; j < NZ - 1; j++) for (let i = 0; i < NU - 1; i++) { const z = Z0 + (j + 0.5) * DU, x = cxf(z) + (i - 39.5) * DU; if (hole(x, z)) continue; const a = j * NU + i; idx.push(a, a + NU, a + 1, a + 1, a + NU, a + NU + 1); }
    const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); tg.setAttribute('color', new THREE.BufferAttribute(col, 3)); tg.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); tg.setIndex(idx); tg.computeVertexNormals();
    this.terr = new THREE.Mesh(tg, this.wool('#ffffff', { vertexColors: true, side: THREE.DoubleSide })); this.terr.receiveShadow = true; S.add(this.terr);
    // --- haberdashery
    const dm = new THREE.Object3D(), inst = (geo, mat, list) => { const m = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((f, i) => { dm.position.set(0, 0, 0); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); f(dm, i); dm.updateMatrix(); m.setMatrixAt(i, dm.matrix); }); m.castShadow = m.receiveShadow = true; S.add(m); return m; };
    const trees = []; for (let z = -10; z < LEN + 20; z += 7) for (const s of [-1, 1]) { const u = s * (17 + hash2(z, s) * 14), x = cxf(z) + u; trees.push({ x, z, y: H(x, z), s: 1.3 + hash2(z, s + 3) * 1.6, c: Math.floor(hash2(z, s + 5) * 6) }); }
    inst(new THREE.CylinderGeometry(0.16, 0.22, 1, 8), new THREE.MeshStandardMaterial({ color: '#8a6a4a', roughness: 0.9 }), trees.map((q) => (d) => { d.position.set(q.x, q.y + q.s * 0.9, q.z); d.scale.set(1, q.s * 1.8, 1); }));
    for (let k = 0; k < 6; k++) { const L = trees.filter((q) => q.c === k); if (L.length) inst(new THREE.SphereGeometry(1, 18, 14), this.wool(WOOL[k], { map: this.yarnT, normalMap: this.yarnN }), L.map((q) => (d) => { d.position.set(q.x, q.y + q.s * 2.3, q.z); d.scale.setScalar(q.s); d.rotation.set(q.x, q.z, 0); })); }
    this.pins = []; for (const z of [110, 205, 300, 400, 500, 590, 670, 780, 860, 950]) for (const u of z % 200 < 100 ? [-7, 0, 7] : [-10, -3.5, 3.5, 10]) { const x = cxf(z) + u; if (!hole(x, z)) this.pins.push({ x, z, y: H(x, z) }); }
    inst(new THREE.CylinderGeometry(0.09, 0.02, 5, 8), new THREE.MeshStandardMaterial({ color: '#d9dde6', metalness: 1, roughness: 0.25 }), this.pins.map((q) => (d) => { d.position.set(q.x, q.y + 2.3, q.z); d.rotation.z = 0.08; }));
    inst(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#e8483c', roughness: 0.2, clearcoat: 1 }), this.pins.map((q) => (d) => d.position.set(q.x - 0.2, q.y + 4.9, q.z)));
    const bg = new THREE.CylinderGeometry(0.75, 0.75, 0.16, 20), hg = new THREE.CylinderGeometry(0.1, 0.1, 0.2, 8); this.buttons = [];
    for (let i = 0; i < 74; i++) { const z = 26 + i * 13, x = cxf(z) + Math.sin(i * 1.7) * 7; if (hole(x, z) || RAMPS.some((r) => z > r - 12 && z < r + 10)) continue; const m = new THREE.Mesh(bg, new THREE.MeshPhysicalMaterial({ color: ['#f4f6ff', '#ffd166', '#ff9a3c', '#2fd3c6'][i % 4], roughness: 0.3, clearcoat: 0.6 })); for (const [a, b] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) { const hh = new THREE.Mesh(hg, new THREE.MeshBasicMaterial({ color: '#2a2030' })); hh.position.set(a, 0, b); m.add(hh); } m.position.set(x, H(x, z) + 1.3, z); m.rotation.x = Math.PI / 2; m.castShadow = true; S.add(m); this.buttons.push(m); }
    this.skeins = []; for (let j = 0; j < 18; j++) { const z = 58 + j * 54, x = cxf(z) - Math.sin(j * 2.3) * 8; if (hole(x, z)) continue; const m = new THREE.Mesh(new THREE.TorusKnotGeometry(0.55, 0.3, 48, 10, 2, 5), this.wool('#2fd3c6', { map: this.yarnT, normalMap: this.yarnN, emissive: '#0a5a54', emissiveIntensity: 0.5 })); m.position.set(x, H(x, z) + 1.5, z); m.castShadow = true; S.add(m); this.skeins.push(m); }
    { const wood = new THREE.MeshStandardMaterial({ color: '#e3c28f', roughness: 0.5 }), ez = LEN - 14, ex = cxf(ez), ey = H(ex, ez); for (const s of [-1, 1]) { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.2, 60, 14), wood); n.position.set(ex, ey + 16, ez); n.rotation.z = s * 0.62; n.castShadow = true; S.add(n); const k = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 12), wood); k.position.set(ex + s * -17.4, ey + 40.4, ez); S.add(k); } }
    for (let i = 0; i < 25; i++) { const z = i * 44, m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: '#fffaf2', roughness: 1 })); m.position.set(cxf(z) + (hash2(i, 1) - 0.5) * 90, H(cxf(z), z) + 30 + hash2(i, 2) * 14, z + 30); m.scale.set(9 + hash2(i, 3) * 8, 3.2, 5); S.add(m); }
    // --- Rin on his ball of wool, and the thread he leaves
    this.ball = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 26), this.wool('#2fb8ad', { map: this.yarnT, normalMap: this.yarnN, normalScale: new THREE.Vector2(1.6, 1.6) })); this.ball.castShadow = true; S.add(this.ball);
    const rd = (this.rider = new THREE.Group()), felt = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }); const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 16), felt('#f2c9a0')); head.position.y = 0.72; rd.add(head); const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.3, 6, 12), this.wool('#2fd3c6')); body.position.y = 0.2; rd.add(body);
    for (let i = 0; i < 6; i++) { const h = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 8), felt('#f4f6ff')); h.position.set(Math.sin(i * 1.1 - 2.7) * 0.26, 1.06 + (i % 2) * 0.06, -0.12 + Math.cos(i * 1.1 - 2.7) * 0.1); h.rotation.set(-0.5, 0, -Math.sin(i * 1.1 - 2.7) * 0.7); rd.add(h); }
    const gog = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.07, 8, 24), felt('#ff9a3c')); gog.position.y = 0.8; gog.rotation.x = Math.PI / 2; rd.add(gog); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial({ color: '#17131f' })); e.position.set(s * 0.15, 0.74, 0.38); rd.add(e); }
    this.scarf = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 1.1), this.wool('#ff9a3c')); this.scarf.position.set(0, 0.45, -0.6); rd.add(this.scarf); rd.traverse((m) => (m.castShadow = true)); S.add(rd);
    this.vell = buildVell(); S.add(this.vell);
    this.TN = 300; const rg = new THREE.BufferGeometry(), rp = new Float32Array(this.TN * 6), ri = []; for (let i = 0; i < this.TN - 1; i++) ri.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); rg.setIndex(ri); this.trailM = new THREE.MeshBasicMaterial({ color: '#2fd3c6', side: THREE.DoubleSide }); this.trail = new THREE.Mesh(rg, this.trailM); this.trail.frustumCulled = false; S.add(this.trail); this.pts = [];
    this.hud = buildHud(g); this.hud.title('CHAPTER 12', 'LOOSE THREADS');
    this.t = 0; this.fin = null; this.noPause = false; this.said = {}; this.got = 0; this.shake = 0; this.cp = 4; this.p = { x: cxf(4), y: H(cxf(4), 4) + 1.3, z: 4, vx: 0, vy: 0, vz: 4, gr: true, yarn: 1, coy: 0, lx: -99, lz: -99 }; this.camPos = V(this.p.x, this.p.y + 8, this.p.z - 14);
    g.show3d(true); if (handoff) g.fadeFrozen(1700, () => g.director.releaseOutgoing()); else g.clear2d();
    g.audio.muffle(0); g.music.play(SONG, { intensity: 1, fade: 1 });
    g.dialogue.say([{ who: 'vell', text: "WOOL. Somebody knitted a whole valley. Don't pull anything." }, { who: 'rin', text: 'I am sitting on a ball of it, Vell.' }, { who: 'vell', text: 'Then roll! It unwinds as you go — grab the teal skeins to wind it back up.' }]);
    g.director.preload(13);
  }
  stop() { this.hud?.remove(); }
  respawn() { const p = this.p, z = this.cp; p.x = cxf(z); p.z = z; p.y = H(p.x, z) + 2; p.vx = p.vy = 0; p.vz = 3; p.gr = false; p.yarn = Math.max(p.yarn, 0.6); this.pts = []; this.game.sfx.play('pp.hurt'); }
  update(dt, outgoing) {
    if (outgoing || !this.scene) return; const g = this.game, inp = g.input, p = this.p, sfx = g.sfx; this.t += dt; this.shake = Math.max(0, this.shake - dt * 2);
    if (this.fin) { this.fin.t += dt; p.vx *= 0.94; p.vz *= 0.94; g.audio.muffle(clamp(this.fin.t / 6, 0, 0.6)); }
    const ctl = !this.fin, ix = ctl ? (inp.keys.has('KeyD') || inp.keys.has('ArrowRight') ? 1 : 0) - (inp.keys.has('KeyA') || inp.keys.has('ArrowLeft') ? 1 : 0) : 0, iz = ctl ? (inp.keys.has('KeyW') || inp.keys.has('ArrowUp') ? 1 : 0) - (inp.keys.has('KeyS') || inp.keys.has('ArrowDown') ? 1 : 0) : 0, r = 0.55 + p.yarn * 0.75, e = 0.3;
    if (p.gr) { const gx = (H(p.x + e, p.z) - H(p.x - e, p.z)) / (2 * e), gz = (H(p.x, p.z + e) - H(p.x, p.z - e)) / (2 * e); p.vx += (-26 * gx - ix * 22 - p.vx * 0.45) * dt; p.vz += (-26 * gz + iz * (iz > 0 ? 20 : 26) - p.vz * 0.4) * dt; p.coy = 0.12; } else { p.vx -= ix * 9 * dt; p.vz += iz * 6 * dt; p.coy -= dt; }
    p.vz = clamp(p.vz, -5, 24); p.vx = clamp(p.vx, -22, 22);
    const y0 = p.y; p.x += p.vx * dt; p.z += p.vz * dt; p.z = Math.max(-6, p.z); { const u = p.x - cxf(p.z); if (Math.abs(u) > 40) { p.x = cxf(p.z) + Math.sign(u) * 40; p.vx *= -0.5; } }
    const gy = (hole(p.x, p.z) ? -1e4 : H(p.x, p.z)) + r;
    if (p.gr) { const yB = y0 + p.vy * dt - 15 * dt * dt; if (gy < yB - 0.04) { p.gr = false; p.y = yB; p.vy -= 30 * dt; } else { p.vy = (gy - y0) / dt; p.y = gy; } }
    else { p.vy -= 30 * dt; p.y += p.vy * dt; if (p.y <= gy) { if (p.vy < -9) { sfx.play('pp.land'); this.shake = 0.3; } p.y = gy; p.gr = true; p.vy = 0; } }
    if (ctl && inp.pressed.jump && p.coy > 0) { p.vy = Math.max(p.vy, 0) + 10; p.gr = false; p.coy = 0; sfx.play('ink.boing', { vol: 0.6 }); }
    const sp = Math.hypot(p.vx, p.vz); if (ctl) p.yarn -= sp * dt * 0.0011 * (g.easy ? 0.5 : 1);
    for (const q of this.pins) { const dx = p.x - q.x, dz = p.z - q.z, d = Math.hypot(dx, dz); if (d < r + 0.35 && p.y - r < q.y + 4.5) { const nx = dx / (d || 1), nz = dz / (d || 1), vn = p.vx * nx + p.vz * nz; p.x = q.x + nx * (r + 0.36); p.z = q.z + nz * (r + 0.36); if (vn < 0) { p.vx -= 1.7 * vn * nx; p.vz -= 1.7 * vn * nz; } p.yarn -= 0.03; this.shake = 0.5; sfx.play('pp.pin'); sfx.play('ink.bonk', { vol: 0.5 }); } }
    for (const b of this.buttons) if (b.visible && Math.hypot(p.x - b.position.x, p.y - b.position.y, p.z - b.position.z) < r + 1.1) { b.visible = false; this.got++; sfx.play('px.pickup', { pitch: 1 + (this.got % 5) * 0.08 }); }
    for (const s of this.skeins) if (s.visible && Math.hypot(p.x - s.position.x, p.y - s.position.y, p.z - s.position.z) < r + 1.3) { s.visible = false; p.yarn = Math.min(1, p.yarn + 0.28); sfx.play('pp.chime'); sfx.play('pp.string', { vol: 0.6 }); }
    if (ctl && p.y < -p.z * 0.14 - 26) this.respawn();
    if (ctl && p.yarn <= 0.02) { if (!this.said.out) { this.said.out = true; g.dialogue.say('vell', 'All unwound! I wound you back up at the last knot. Grab the skeins.'); } p.yarn = 0.7; this.respawn(); }
    if (p.gr && p.z > this.cp + 90 && !hole(p.x, p.z + 6)) { this.cp = Math.floor(p.z); g.save.setCheckpoint(12, null); }
    if (p.gr && Math.hypot(p.x - p.lx, p.z - p.lz) > 0.5) { p.lx = p.x; p.lz = p.z; const n = sp || 1; this.pts.push([p.x, p.y - r + 0.07, p.z, -p.vz / n, p.vx / n]); if (this.pts.length > this.TN) this.pts.shift(); }
    const say = (k, z, who, text) => { if (!this.said[k] && p.z > z) { this.said[k] = true; g.dialogue.say(who, text); } };
    say('a', 96, 'vell', 'Pins! Go round them. They take a bite out of your wool.'); say('b', 138, 'rin', 'Half the valley has come unravelled.'); say('c', 322, 'vell', 'A ramp, then nothing. Fast and straight — or SPACE at the lip!'); say('e', 610, 'vell', 'More of it has come loose down here. Keep to the side that still has stitches.'); say('d', LEN - 70, 'rin', 'Needles. This is where it was cast off.');
    if (p.z > LEN - 20 && !this.fin) { this.fin = { t: 0 }; this.noPause = true; sfx.play('fx.rise'); sfx.play('pp.string'); g.dialogue.clear(); g.dialogue.say([{ who: 'rin', text: "It's all coming off the needles." }, { who: 'vell', text: 'Down to one thread. One bright line on a dark screen... oh, I know this one. This one is OLD.' }]); }
  }
  render(dt) {
    if (!this.scene) return; const g = this.game, r = this.r, p = this.p, t = this.t, k = this.fin ? clamp(this.fin.t / 5, 0, 1) : 0; if (r.domElement.width !== g.W || r.domElement.height !== g.H) r.setSize(g.W, g.H, false);
    const rad = (0.55 + p.yarn * 0.75) * (1 - k * 0.92), sp = Math.hypot(p.vx, p.vz); this.ball.scale.setScalar(rad); this.ball.position.set(p.x, p.y - (0.55 + p.yarn * 0.75) + rad, p.z);
    if (sp > 0.05) this.ball.rotateOnWorldAxis(V(p.vz, 0, -p.vx).normalize(), (sp * dt) / Math.max(0.3, rad));
    const yaw = Math.atan2(p.vx, Math.max(2, p.vz)); this.rider.position.set(p.x, this.ball.position.y + rad - 0.1 + Math.sin(t * 9) * 0.03 * Math.min(1, sp / 8), p.z); this.rider.rotation.set(Math.min(0.5, sp * 0.02), yaw, -p.vx * 0.025); this.scarf.rotation.x = Math.sin(t * 10) * 0.2 + Math.min(0.7, sp * 0.03); this.rider.scale.setScalar(1 - k * 0.5);
    this.vell.position.lerp(V(p.x + 1.6, p.y + 2.2 + Math.sin(t * 2) * 0.2, p.z + 0.5), Math.min(1, dt * 4)); this.vell.rotation.y = t;
    for (const b of this.buttons) b.rotation.z = t * 2 + b.position.z; for (const s of this.skeins) { s.rotation.y = t * 1.5; s.position.y += Math.sin(t * 3 + s.position.z) * 0.004; }
    { const a = this.trail.geometry.attributes.position, n = this.pts.length; for (let i = 0; i < this.TN; i++) { const q = this.pts[Math.min(i, n - 1)] || [p.x, p.y, p.z, 1, 0], w = 0.11 + k * 0.25; a.setXYZ(i * 2, q[0] + q[3] * w, q[1] + k * i * 0.004, q[2] + q[4] * w); a.setXYZ(i * 2 + 1, q[0] - q[3] * w, q[1] + k * i * 0.004, q[2] - q[4] * w); } a.needsUpdate = true; }
    if (k > 0) { const dk = 1 - k; this.hemi.intensity = 0.75 * dk * dk; this.sun.intensity = 2.2 * dk * dk; this.scene.background.set('#f1d3bd').multiplyScalar(dk * dk); this.scene.fog.color.copy(this.scene.background); this.dome.material.color.copy(this.scene.background); this.trailM.color.set('#2fd3c6').multiplyScalar(1 + k * 9); }
    const cz = p.z - 13 - sp * 0.12, want = V(lerp(p.x, cxf(p.z), 0.35), p.y + 6.5 + k * 9, cz - k * 10); this.camPos.lerp(want, 1 - Math.exp(-6 * dt)); const sh = this.shake * (g.settings.shake ?? 1) * 0.4; this.cam.position.copy(this.camPos).add(V((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh, 0)); this.cam.lookAt(p.x, p.y + 0.6, p.z + 7); this.cam.fov = 56 + Math.min(14, sp * 0.5); this.cam.aspect = g.W / g.H; this.cam.updateProjectionMatrix();
    this.dome.position.copy(this.cam.position);
    this.sun.position.set(p.x - 22, p.y + 40, p.z - 16); this.sun.target.position.set(p.x, p.y, p.z + 6);
    renderFX(g, r, this.scene, this.cam, { bloom: 0.25 + k * 1.2, threshold: 1.15, tilt: 0.45 * (1 - k), focus: 0.56, vig: 0.36, sat: 1.18, con: 1.05 });
    if (this.fin && this.fin.t > 5.8 && !this.fin.done) { this.fin.done = true; g.freezeFrame(); const ok = g.director.handoff(13, { from12: true }); if (!ok) { g.clear2d(); g.save.complete(12); g.audio.muffle(0); g.director.end({ chapter: 12 }); } return; }
    if (!this.fin) this.hud.set(p.z < 60 ? 'Roll downhill — W' : 'Reach the needles', [(p.yarn < 0.3 ? '!' : '') + bar('WOOL', p.yarn, 14), `<kbd>●</kbd>BUTTONS ${this.got} / ${this.buttons.length}`, `<kbd>→</kbd>${Math.max(0, Math.round(LEN - 20 - p.z))} m`]); else this.hud.set('', []); this.hud.tick();
  }
  perfInfo() { const i = this.r.info.render; return `calls ${i.calls} · tris ${i.triangles}`; }
}
