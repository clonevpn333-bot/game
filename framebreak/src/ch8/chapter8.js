// CHAPTER 8 — CLAY HEART. Stop-motion claymation: everything is posed "on
// twos" (12 fps) with thumbprints in every surface. Rin is a lump of clay and
// shape IS the mechanic: squash flat to slip under things, stretch tall to
// reach ledges, stretch long to inchworm across gaps, absorb clay to gain
// mass, pinch a piece off to leave weight behind.
import * as THREE from 'three';
import { getRenderer } from '../ch3/chapter3.js';
import { clamp, lerp, makeCanvas, rng, Spring, ease, approach } from '../core/util.js';

const el = (cls, html = '') => { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; return e; };
const SONG = (() => { const bars = {}, ch = [['C3', 'E4+G4', 'E5 . G5 . C6 . B5 . G5 . . . E5 . . .'], ['A2', 'C4+E4', 'A4 . C5 . E5 . D5 . C5 . . . A4 . . .'], ['F2', 'A3+C4', 'F5 . . E5 . . C5 . A4 . C5 . F5 . . .'], ['G2', 'B3+D4', 'D5 . G5 . . F5 . D5 . B4 . . G4 . B4 .']]; const A = ch.map(([b, c, m], i) => { bars['a' + i] = { uke: `. . ${c} . . ${c} . . . . ${c} . . ${c} . .`, bass: `${b} . . . . . ${b} . ${b} . . . . . . .`, mar: m, kaz: i % 2 ? m.replace(/5/g, '4') : '. . . . . . . . . . . . . . . .', perc: i === 3 ? 'w . q . w w q . w . q q w q w q' : 'w . . q . . w . . q . . w . q .' }; return 'a' + i; }); return { bpm: 96, swing: 0.2, gain: 1, reverb: 0.15, start: 'A', tracks: { uke: { inst: 'ukulele', vol: 0.8, pan: -0.2 }, bass: { inst: 'pizz', vol: 1 }, mar: { inst: 'marimba', vol: 0.9, pan: 0.2, send: 0.2 }, kaz: { inst: 'kazoo', vol: 0.3, pan: 0.3, layer: 2 }, perc: { kit: 'jazz', vol: 0.8 } }, bars, sections: { A }, next: { A: 'A' } }; })();
export { SONG as SONG_CH8 };

export default class Chapter8 {
  constructor(game) { this.game = game; this.id = 8; this.compositesOutgoing = true; }
  async load() {
    const r = rng(6), c = makeCanvas(256, 256), x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
    for (let k = 0; k < 22; k++) { const cx = r.range(0, 256), cy = r.range(0, 256), a = r.range(0, 3); for (let i = 3; i < 30; i += 3) { x.strokeStyle = `rgba(${i % 2 ? 50 : 200},${i % 2 ? 50 : 200},${i % 2 ? 50 : 200},0.35)`; x.lineWidth = 1.4; x.beginPath(); x.ellipse(cx, cy, i * 0.75, i, a, 0, 7); x.stroke(); } }
    for (let i = 0; i < 60; i++) { x.strokeStyle = 'rgba(40,40,40,0.25)'; x.lineWidth = r.range(1, 3); x.beginPath(); const px = r.range(0, 256), py = r.range(0, 256); x.moveTo(px, py); x.lineTo(px + r.range(-30, 30), py + r.range(-30, 30)); x.stroke(); }
    this.print = new THREE.CanvasTexture(c); this.print.wrapS = this.print.wrapT = THREE.RepeatWrapping;
  }
  controlsHelp() { return '<b>A/D</b> squidge along · <b>SPACE</b> hop · hold <b>W</b>: stretch TALL · hold <b>S</b>: squash FLAT · hold <b>J</b>: stretch LONG, release to inchworm<br><b>L</b>: absorb clay · <b>Q</b>: pinch a lump off (it stays where you leave it)'; }
  clay(color) { return new THREE.MeshStandardMaterial({ color, roughness: 0.95, bumpMap: this.print, bumpScale: 1.6 }); }
  lump(w, h, d, color, x, y, z, seed = 1) { // a hand-pressed block: box with nudged vertices
    const g = new THREE.BoxGeometry(w, h, d, 4, 3, 2), p = g.attributes.position, r = rng(seed * 13 + 5); for (let i = 0; i < p.count; i++) { p.setXYZ(i, p.getX(i) + r.range(-0.06, 0.06), p.getY(i) + r.range(-0.05, 0.05), p.getZ(i) + r.range(-0.06, 0.06)); } g.computeVertexNormals(); const m = new THREE.Mesh(g, this.clay(color)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; this.scene.add(m); return m; }
  solid(x0, x1, y0, y1, color = '#9bbf8a', deco = true) { const s = { x0, x1, y0, y1, on: true }; this.solids.push(s); if (deco) s.mesh = this.lump(x1 - x0, y1 - y0, 3, color, (x0 + x1) / 2, (y0 + y1) / 2, 0, x0 + y0); return s; }

  start({ handoff }) {
    const g = this.game; this.r = getRenderer(g); this.r.shadowMap.enabled = g.settings.shadows > 0; this.r.toneMappingExposure = 0.85;
    const S = (this.scene = new THREE.Scene()); S.background = new THREE.Color('#e9c7a6'); this.cam = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 200); this.t = 0; this.frame = 0; this.said = {}; this.fin = null; this.noPause = false; this.solids = []; this.pellets = []; this.shake = 0;
    S.add(new THREE.HemisphereLight('#fff3e0', '#b08a72', 0.8)); const key = (this.key = new THREE.SpotLight('#fff0d6', 900, 80, 0.7, 0.6, 1.2)); key.castShadow = g.settings.shadows > 0; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0005; key.shadow.radius = 6; S.add(key, key.target);
    // miniature set: table, cardboard backdrop, props
    const table = new THREE.Mesh(new THREE.BoxGeometry(160, 1, 30), new THREE.MeshStandardMaterial({ color: '#7a5236', roughness: 0.6 })); table.position.set(30, -6.5, 0); table.receiveShadow = true; S.add(table);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(170, 40), new THREE.MeshStandardMaterial({ color: '#f1dcbc', roughness: 1 })); back.position.set(30, 8, -9); back.receiveShadow = true; S.add(back);
    const r = rng(3); for (let i = 0; i < 16; i++) { const x = -8 + i * 5 + r.range(-1, 1); this.lump(r.range(3, 6), r.range(3, 9), 1, ['#d9a27e', '#c98a6a', '#b5c9a0', '#e6c27a'][i % 4], x, -3 + r.range(0, 2), -6 - (i % 3), i + 40); if (i % 3 === 0) { const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 3, 5), new THREE.MeshStandardMaterial({ color: '#555', metalness: 0.8, roughness: 0.4 })); tr.position.set(x + 2, 1.5, -4); S.add(tr); const top = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), this.clay('#7fae7a')); top.position.set(x + 2, 3.2, -4); top.castShadow = true; S.add(top); } }
    const pencil = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 9, 6), new THREE.MeshStandardMaterial({ color: '#e2b23a', roughness: 0.4 })); pencil.rotation.z = Math.PI / 2; pencil.position.set(8, -5.7, 6); S.add(pencil);
    // course
    this.solid(-8, 12, -6, 0); this.solid(12, 15.5, -6, 0, '#9bbf8a'); this.solid(12, 15.5, 0.55, 5, '#c98a6a');            // low gap: go FLAT
    this.solid(15.5, 20, -6, 0); this.solid(20, 28, -6, 2.6, '#e6c27a');                                                   // tall ledge: go TALL
    this.solid(31.6, 44, -6, 2.6, '#e6c27a');                                                                              // gap 28..32.4: go LONG
    this.plate = { x: 36, w: 2 }; this.plateMesh = this.lump(2, 0.25, 2.4, '#e2603a', 36, 2.72, 0, 99);
    this.door = this.solid(40, 40.8, 2.6, 8, '#7d4a5c'); this.solid(40, 40.8, 8, 12, '#7d4a5c');
    this.solid(44, 72, -6, 0, '#b5c9a0');                                                                                  // the sculptor's bench
    this.lever = this.lump(0.3, 3.4, 0.3, '#e2603a', 68, 2.9, 0, 7); this.knob = this.lump(0.9, 0.9, 0.9, '#ffd166', 68, 4.8, 0, 8);
    for (const [x, y] of [[17.5, 0.4], [24, 3.0], [34, 3.0]]) this.addPellet(x, y);
    // Rin: a lump with a face, a scarf and a tuft
    const R = (this.rin = new THREE.Group()), body = (this.body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), this.clay('#2fd3c6'))); body.castShadow = true; R.add(body);
    this.face = new THREE.Group(); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshStandardMaterial({ color: '#fff', roughness: 0.4 })); e.position.set(0.14 + s * 0.15, 0.12, 0.42); const pu = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshStandardMaterial({ color: '#1a1f3a' })); pu.position.set(0.16 + s * 0.15, 0.12, 0.51); this.face.add(e, pu); } const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.02, 5, 8, Math.PI), new THREE.MeshStandardMaterial({ color: '#1a1f3a' })); mouth.rotation.z = Math.PI; mouth.position.set(0.16, -0.08, 0.46); this.face.add(mouth); R.add(this.face);
    this.scarf = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.09, 6, 14), this.clay('#ff9a3c')); this.scarf.rotation.x = Math.PI / 2; R.add(this.scarf); this.tuft = new THREE.Group(); for (let i = 0; i < 4; i++) { const t = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 5), this.clay('#f4f6ff')); t.position.set(-0.15 + i * 0.1, 0.1, 0); t.rotation.z = 0.5 - i * 0.3; this.tuft.add(t); } R.add(this.tuft); S.add(R);
    this.vell = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), this.clay('#c06fc0')); const ve = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), new THREE.MeshStandardMaterial({ color: '#fff' })); ve.position.set(-0.08, 0.05, 0.24); this.vell.add(ve); S.add(this.vell);
    // the sculptor's hands
    this.hands = [-1, 1].map((s) => { const h = new THREE.Group(), m = this.clay('#e8b48f'); const palm = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 3.4, 3, 2, 3), m); palm.castShadow = true; h.add(palm); for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 1.6, 4, 8), m); f.position.set(-1.1 + i * 0.73, -0.9, 1.2); f.rotation.x = 0.5; f.castShadow = true; h.add(f); } const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 1.1, 4, 8), m); th.position.set(s * 1.8, -0.4, 0.3); th.rotation.z = s * 0.9; th.castShadow = true; h.add(th); h.position.set(52 + s * 6, 14, 0); S.add(h); return { h, x: 52 + s * 6, y: 14, st: 'hover', t: s > 0 ? 1.4 : 0, s }; });
    this.pin = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 14, 18), new THREE.MeshStandardMaterial({ color: '#b98d5e', roughness: 0.55 })); this.pin.rotation.x = Math.PI / 2; this.pin.position.set(-40, 2.2, 0); this.pin.castShadow = true; S.add(this.pin);
    this.p = { x: -4, y: 0, vx: 0, vy: 0, mass: 1, w: new Spring(0.95, 220, 16), h: new Spring(1, 220, 16), ground: false, face: 1, shape: 'blob', long: 0, hp: 3, inv: 0, coy: 0 }; this.lumps = []; this.cps = [-4, 16, 33, 45]; this.cp = 0;
    this.ui = el('hud3'); this.dlg = el('dlg paper', '<div class="who"></div><div class="txt"></div>'); this.banner = el('banner', '<small>CHAPTER 8</small>CLAY HEART'); this.banner.style.color = '#5a3a2a'; this.banner.style.textShadow = '0 3px 0 #fff3d6'; this.hud = el('mach'); this.ui.append(this.dlg, this.banner, this.hud); g.ui.appendChild(this.ui);
    g.show3d(true); if (handoff) g.fadeFrozen(1500, () => g.director.releaseOutgoing()); else g.clear2d();
    g.audio.muffle(0); g.music.play(SONG, { intensity: 1, fade: 1 }); setTimeout(() => { this.banner.style.opacity = '1'; setTimeout(() => (this.banner.style.opacity = '0'), 3000); }, 700);
    g.dialogue.say([{ who: 'rin', text: 'I had cheekbones a minute ago.' }, { who: 'vell', text: 'Now you have OPTIONS. Hold W to be tall. Hold S to be flat. Hold J to be long.' }]);
    g.director.preload(9);
  }
  stop() { this.ui?.remove(); this.game.show3d(false); this.scene = null; }
  addPellet(x, y) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), this.clay('#2fd3c6')); m.position.set(x, y, 0.3); m.castShadow = true; this.scene.add(m); this.pellets.push({ x, y, m }); }
  respawn() { const p = this.p; p.x = this.cps[this.cp]; p.y = this.cp === 2 ? 2.7 : 0.1; p.vx = p.vy = 0; p.hp = 3; p.inv = 1.5; this.game.sfx.play('ink.squash'); }
  dims() { const p = this.p, k = 1 + (p.mass - 1) * 0.22; return p.shape === 'tall' ? [0.6 * k, 3.1 * k] : p.shape === 'flat' ? [1.9 * k, 0.38] : [0.95 * k, 1.0 * k]; }
  hit(x, y, w, h) { for (const s of this.solids) if (s.on && x + w / 2 > s.x0 && x - w / 2 < s.x1 && y + h > s.y0 && y < s.y1) return s; return null; }

  update(dt, outgoing) {
    if (outgoing || !this.scene) return; const g = this.game, inp = g.input, p = this.p, sfx = g.sfx; this.t += dt; p.inv -= dt;
    if (this.fin) return this.updateFinale(dt);
    // choose shape (it must physically fit to change back)
    const want = inp.down.down ? 'flat' : inp.down.up ? 'tall' : 'blob'; if (want !== p.shape && !p.long) { const old = p.shape; p.shape = want; const [w, h] = this.dims(); if (this.hit(p.x, p.y + 0.02, w * 0.9, h - 0.04)) p.shape = old; else { sfx.play(want === 'flat' ? 'ink.squash' : want === 'tall' ? 'ink.stretch' : 'ink.pop', { vol: 0.6 }); } }
    const [w, h] = this.dims(); p.w.target = w; p.h.target = h; p.w.update(dt); p.h.update(dt);
    const ix = inp.axisX, sp = p.shape === 'flat' ? 2.2 : p.shape === 'tall' ? 1.6 : 3.6 - (p.mass - 1) * 0.4;
    // LONG: reach forward along the ground / across a gap; release to pull the rear end up
    if (inp.down.attack && p.ground && p.shape === 'blob') { if (!p.long) sfx.play('ink.stretch'); p.long = Math.min(4.8, p.long + dt * 5); p.vx = 0; }
    else if (p.long > 0) { const fx = p.x + p.face * p.long; if (this.hit(fx, p.y - 0.3, 0.4, 0.25) && !this.hit(fx, p.y + 0.05, 0.6, 0.8)) { p.x = fx; sfx.play('ink.snap'); p.w.kick(-6); } else sfx.play('ink.boing', { vol: 0.5 }); p.long = 0; }
    else { p.vx = lerp(p.vx, ix * sp, 0.2); if (Math.abs(ix) > 0.3) p.face = Math.sign(ix); }
    if (p.ground) p.coy = 0.1; else p.coy -= dt;
    if (inp.pressed.jump && p.coy > 0 && p.shape === 'blob' && !p.long) { p.vy = 7.2 - (p.mass - 1) * 0.6; p.coy = 0; p.h.kick(5); sfx.play('ink.boing', { vol: 0.6 }); }
    p.vy = Math.max(p.vy - 22 * dt, -20);
    p.x += p.vx * dt; let s = this.hit(p.x, p.y + 0.05, w, h - 0.1);
    if (s) { // TALL climbs: if the top of the lump clears the ledge, it flops up onto it
      if (p.shape === 'tall' && s.y1 - p.y < h - 0.2 && s.y1 - p.y > 0.2 && !this.hit(p.x + p.face * 0.6, s.y1 + 0.05, w, 1)) { p.y = s.y1 + 0.02; p.x += p.face * 0.7; p.shape = 'blob'; p.h.kick(-6); sfx.play('ink.pop'); }
      else { p.x -= p.vx * dt; p.vx = 0; } }
    p.y += p.vy * dt; p.ground = false; s = this.hit(p.x, p.y, w, h); if (s) { if (p.vy <= 0) { p.y = s.y1; if (p.vy < -7) { p.w.kick(4); p.h.kick(-5); sfx.play('ink.land'); } p.ground = true; } else p.y = s.y0 - h - 0.01; p.vy = 0; }
    // absorb / pinch off
    if (inp.pressed.shoot) { let got = false; for (const q of this.pellets) if (!q.dead && Math.hypot(q.x - p.x, q.y - p.y - 0.4) < 1.5) { q.dead = true; this.scene.remove(q.m); p.mass++; got = true; } for (const l of this.lumps) if (!l.dead && Math.abs(l.x - p.x) < 1.5 && Math.abs(l.y - p.y) < 1.5) { l.dead = true; this.scene.remove(l.m); p.mass++; got = true; } if (got) { sfx.play('ink.pop', { pitch: 0.7 }); p.w.kick(5); } this.lumps = this.lumps.filter((l) => !l.dead); this.pellets = this.pellets.filter((q) => !q.dead); }
    if (inp.pressed.special && p.mass > 1 && p.ground) { p.mass--; const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 6), this.clay('#2fd3c6')); m.scale.y = 0.8; m.position.set(p.x - p.face * 0.2, p.y + 0.3, 0.2); m.castShadow = true; this.scene.add(m); this.lumps.push({ x: p.x - p.face * 0.2, y: p.y, m }); p.x += p.face * 0.9; sfx.play('ink.splat', { vol: 0.5 }); }
    // pressure plate → door (weight has to STAY there)
    const onPlate = this.lumps.some((l) => Math.abs(l.x - this.plate.x) < 1.2) || (Math.abs(p.x - this.plate.x) < 1.1 && p.ground); if (onPlate !== this.plateOn) { this.plateOn = onPlate; sfx.play('pp.thunk'); } this.doorK = approach(this.doorK || 0, onPlate ? 1 : 0, dt * 1.5); this.door.on = this.doorK < 0.8;
    // the hands
    if (p.x > 44) for (const H of this.hands) { H.t += dt; if (H.st === 'hover') { H.x = lerp(H.x, clamp(p.x + H.s * 2.5, 46, 70), dt * 1.2); H.y = lerp(H.y, 9, dt * 2); if (H.t > 3.2) { H.st = 'aim'; H.t = 0; sfx.play('px.telegraph', { pitch: 0.5 }); } } else if (H.st === 'aim') { H.x = lerp(H.x, p.x, dt * 3); if (H.t > 0.9) { H.st = 'slam'; H.t = 0; } } else if (H.st === 'slam') { H.y -= 40 * dt; if (H.y <= 1.2) { H.y = 1.2; H.st = 'rest'; H.t = 0; this.shake = 1; sfx.play('ink.hammer'); if (Math.abs(p.x - H.x) < 2.3 && p.shape !== 'flat' && p.inv <= 0) { p.hp--; p.inv = 1.5; p.h.kick(-8); sfx.play('ink.hurt'); if (p.hp <= 0) this.respawn(); } else if (Math.abs(p.x - H.x) < 2.3) this.say2('flatok', 'vell', 'It pressed you and you were ALREADY flat. Ha!'); } } else if (H.st === 'rest' && H.t > 0.8) { H.st = 'hover'; H.t = 0; } }
    if (p.y < -12) this.respawn();
    this.cps.forEach((x, i) => { if (i > this.cp && p.x > x && p.ground) { this.cp = i; g.save.setCheckpoint(8, null); p.hp = 3; } });
    this.say2('a', 'vell', 'A gap under that wall. Be a pancake about it. (Hold S.)', p.x > 8); this.say2('b', 'vell', "Tall ledge. Hold W and lean on it — you'll flop up.", p.x > 17); this.say2('c', 'vell', 'Too wide to hop. Hold J to stretch across, then let go.', p.x > 25);
    this.say2('d', 'vell', 'A plate and a door. It wants weight to STAY. Absorb the spare clay (L), then pinch a lump off on the plate (Q).', p.x > 33);
    if (p.x > 45 && !this.said.e) { this.said.e = true; g.music.setIntensity(2); g.dialogue.say([{ who: 'rin', text: 'Those are HANDS.' }, { who: 'curator', text: 'Mine. I am remaking this world properly. Hold still; you are a smudge.' }, { who: 'vell', text: "When they come down — be flat. You can't squash what's already squashed. Then pull that lever!" }]); }
    if (Math.abs(p.x - 68) < 1.2 && p.shape === 'tall' && !this.fin) this.startFinale();
    this.shake = Math.max(0, this.shake - dt * 2);
  }
  say2(k, who, text, cond = true) { if (cond && !this.said[k]) { this.said[k] = true; this.game.dialogue.say(who, text); } }
  // ---- CLAY → COMIC: the rolling pin flattens everything into a page -----------------
  startFinale() { const g = this.game; this.fin = { t: 0 }; this.noPause = true; this.knob.position.x += 1.2; this.lever.rotation.z = -0.6; g.sfx.play('pp.rumble'); g.dialogue.clear(); g.dialogue.say([{ who: 'rin', text: 'That lever was not the off switch.' }, { who: 'curator', text: 'No. That was the rolling pin.' }, { who: 'vell', text: "Flat again! But inked this time — I can hear the panel borders coming. See you on the page!" }]); }
  updateFinale(dt) { const f = this.fin, g = this.game; f.t += dt; this.pin.position.x = -40 + ease.inOutCubic(clamp(f.t / 6, 0, 1)) * 130; this.pin.rotation.y += dt * 4; f.k = clamp((f.t - 1) / 5, 0, 1); if (Math.floor(f.t * 2) !== Math.floor((f.t - dt) * 2)) g.sfx.play('ink.hammer', { vol: 0.5 }); this.shake = 0.3; g.audio.muffle(f.k * 0.5); if (f.t > 7) f.snap = true; }

  render(dt) {
    if (!this.scene) return; const g = this.game, r = this.r, p = this.p, t = this.t; if (r.domElement.width !== g.W || r.domElement.height !== g.H) r.setSize(g.W, g.H, false);
    // stop-motion: poses only update 12 times a second
    const fr = Math.floor(t * 12);
    if (fr !== this.frame) { this.frame = fr; const w = p.w.x, h = p.h.x, wob = 1 + Math.sin(fr * 1.7) * 0.03, long = p.long;
      this.rin.position.set(p.x + (long ? (p.face * long) / 2 : 0), p.y, 0); this.body.scale.set((long ? long + w : w) * wob, h / wob, 0.95 + Math.sin(fr) * 0.03); this.body.position.y = h / 2; this.body.rotation.z = Math.sin(fr * 0.9) * 0.03;
      const fx = long ? (p.face * long) / 2 : 0; this.face.position.set(fx + p.face * (w * 0.5 - 0.48), h * 0.62 - 0.1, 0); this.face.scale.x = p.face; this.scarf.position.set(fx, h * 0.38, 0); this.scarf.scale.set(w * 1.02, w * 1.02, 1); this.scarf.visible = p.shape !== 'flat'; this.tuft.position.set(fx, h, 0); this.rin.visible = !(p.inv > 0 && fr % 2);
      this.vell.position.set(p.x - p.face * 1.4, p.y + 2 + Math.sin(fr * 0.5) * 0.2, 0.5); this.vell.scale.set(1 + Math.sin(fr) * 0.06, 1 - Math.sin(fr) * 0.06, 1);
      for (const H of this.hands) { H.h.position.set(H.x + (H.st === 'aim' ? Math.sin(fr * 3) * 0.15 : 0), H.y, 0); H.h.rotation.z = Math.sin(fr * 0.4 + H.s) * 0.05; }
      this.door.mesh.position.y = 5.3 + (this.doorK || 0) * 4.8; this.plateMesh.position.y = 2.72 - (this.plateOn ? 0.12 : 0);
      for (const q of this.pellets) q.m.position.y = q.y + Math.sin(fr * 0.6 + q.x) * 0.08;
      if (this.fin) { const px = this.pin.position.x; this.scene.traverse((o) => { if (o.isMesh && o !== this.pin && o.geometry.type !== 'PlaneGeometry') { const wp = o.getWorldPosition(new THREE.Vector3()); if (wp.x < px - 1 && !o.userData.fl) { o.userData.fl = true; o.scale.z *= 0.04; o.scale.y *= 0.9; } } }); }
    }
    const k = this.fin?.k || 0, cx = this.fin ? lerp(p.x, 30, k) : p.x + p.face * 1.5; this.camT = (this.camT ?? cx) + (cx - (this.camT ?? cx)) * Math.min(1, dt * 3);
    const sh = this.shake * (g.settings.shake ?? 1); this.cam.position.set(this.camT + 2 + (Math.random() - 0.5) * sh * 0.3, p.y * 0.5 + 5 + k * 8 + (Math.random() - 0.5) * sh * 0.3, 20 + k * 44 + (p.x > 44 ? 8 : 0)); this.cam.lookAt(this.camT, p.y * 0.5 + 2, 0); this.cam.aspect = g.W / g.H; this.cam.updateProjectionMatrix();
    this.key.position.set(this.camT - 8, 22, 14); this.key.target.position.set(this.camT, 0, 0);
    r.render(this.scene, this.cam);
    if (this.fin?.snap && !this.fin.done) { this.fin.done = true; g.freezeFrame(); const ok = g.director.handoff(9, { from8: true }); if (!ok) { g.clear2d(); g.save.complete(8); g.audio.muffle(0); g.director.end({ chapter: 8 }); } return; }
    const hud = `<div><kbd>♥</kbd>${'●'.repeat(Math.max(0, p.hp))}${'○'.repeat(3 - Math.max(0, p.hp))}</div><div><kbd>◍</kbd>MASS ${p.mass} · ${p.long ? 'LONG' : p.shape.toUpperCase()}</div>`; if (hud !== this._hud) this.hud.innerHTML = this._hud = hud;
    const d = g.dialogue.current; if (d) { this.dlg.style.display = 'block'; this.dlg.firstChild.textContent = d.speaker.name; this.dlg.firstChild.style.color = d.speaker.color === '#f4f6ff' ? '#3b2c22' : d.speaker.color; this.dlg.lastChild.textContent = g.dialogue.visibleText; } else this.dlg.style.display = 'none';
  }
}
