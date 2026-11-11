// CHAPTER 16 — CAT'S CRADLE. Two giant hands and one loop of string. The
// level IS the string figure held between the fingers: Rin walks the strings,
// and at any knot or fingertip you can have the hands change the figure —
// they dip, re-thread, and the strings under him stretch into a new shape.
import * as THREE from 'three';
import { renderFX } from '../fx/post.js';
import { getRenderer } from '../ch3/chapter3.js';
import { buildHand } from '../fx/hand.js';
import { pbr } from '../fx/tex.js';
import { buildRin3D, animateRin } from '../ch7/rig.js';
import { V, buildVell, buildHud, Particles } from '../ch18/kit.js';
import { clamp, lerp, hash2, TAU, ease, makeCanvas } from '../core/util.js';

// nodes: 0-3 left fingertips (top to bottom), 4-7 right fingertips, 8-10 knots in the middle
const FIG = [
  { name: 'THE CRADLE', e: [[1, 9], [9, 6], [0, 8], [8, 4], [3, 10], [2, 10]], c: [[0, 3.4], [-0.5, 0.3], [0.5, -3.0]], dx: 0, curl: [0.08, 0.08, 0.08, 0.08], splay: 1, tilt: 0 },
  { name: "SOLDIER'S BED", e: [[9, 8], [9, 10], [0, 4], [2, 10], [10, 7], [8, 1]], c: [[-2.2, 2.4], [0, 0], [2.2, -2.4]], dx: 1.5, curl: [0.04, 0.3, 0.04, 0.3], splay: 1.25, tilt: 0.16 },
  { name: 'DIAMONDS', e: [[8, 4], [4, 5], [10, 7], [7, 6], [3, 10], [9, 1]], c: [[1.8, 3.0], [-2.5, 0.6], [0, -3.4]], dx: -1.1, curl: [0.28, 0.04, 0.28, 0.04], splay: 0.85, tilt: -0.14 },
];
const START = 1, EXIT = 5, BEADS = [8, 7, 3], ALL = []; FIG.forEach((F) => F.e.forEach(([a, b]) => { if (!ALL.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) ALL.push([a, b]); }));
const SONG = (() => { const bars = {}, ch = [['D3', 'F4+A4', 'A5 . . F5 . . D5 . E5 . F5 .'], ['A#2', 'D4+F4', 'F5 . . D5 . . A#4 . . . . .'], ['F2', 'A3+C4', 'C5 . . F5 . . A5 . G5 . F5 .'], ['C3', 'E4+G4', 'G5 . . E5 . . C5 . . . . .']];
  const A = ch.map(([b, c, m], i) => { bars['a' + i] = { bass: `${b} . . . . . ${b} . . . . .`, box: m, uke: `. . ${c} . . . . . ${c} . . .` }; return 'a' + i; });
  return { bpm: 90, gain: 1, reverb: 0.4, start: 'A', tracks: { bass: { inst: 'upright', vol: 0.7 }, box: { inst: 'musicbox', vol: 0.7, pan: 0.15, send: 0.5 }, uke: { inst: 'ukulele', vol: 0.5, pan: -0.2 } }, bars, sections: { A }, next: { A: 'A' } }; })();
export { SONG as SONG_CH16 };

export default class Chapter16 {
  constructor(game) { this.game = game; this.id = 16; this.compositesOutgoing = true; }
  async load() {}
  controlsHelp() { return '<b>W/A/S/D</b> walk along the strings · <b>Q / E</b> change the figure (only while standing on a knot or a fingertip)<br>Collect the three gold knots, then reach the glowing fingertip.'; }
  start({ handoff } = {}) {
    const g = this.game, r = (this.r = getRenderer(g)); r.shadowMap.enabled = g.settings.shadows > 0; r.toneMappingExposure = 0.85; g.c2d.style.imageRendering = ''; g.gl.style.imageRendering = '';
    const S = (this.scene = new THREE.Scene()); S.fog = new THREE.FogExp2('#e9d2c4', 0.006); this.cam = new THREE.PerspectiveCamera(38, g.W / g.H, 0.5, 200); this.cam.position.set(0, 0.8, 25);
    { const c = makeCanvas(512, 512), x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 512, 512); gr.addColorStop(0, '#fff1dc'); gr.addColorStop(0.55, '#f1cdbc'); gr.addColorStop(1, '#b9a6c9'); x.fillStyle = gr; x.fillRect(0, 0, 512, 512); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${0.04 + hash2(i, 1) * 0.07})`; x.beginPath(); x.arc(hash2(i, 2) * 512, hash2(i, 3) * 512, 10 + hash2(i, 4) * 46, 0, TAU); x.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; const w = new THREE.Mesh(new THREE.PlaneGeometry(120, 70), new THREE.MeshStandardMaterial({ map: t, roughness: 1 })); w.position.z = -7; w.receiveShadow = true; S.add(w); }
    S.add(new THREE.HemisphereLight('#fff4e6', '#c9a0a0', 1.0)); const sun = new THREE.DirectionalLight('#ffe9cf', 2.2); sun.position.set(-9, 14, 18); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 16, bottom: -16, near: 1, far: 70 }); sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.05; S.add(sun);
    const cl = pbr('clay'), skin = new THREE.MeshStandardMaterial({ color: '#e6ab8a', normalMap: cl.normalMap, roughness: 0.8 });
    this.hands = [-1, 1].map((s) => { const h = buildHand(skin, { left: s > 0 }); h.scale.setScalar(3.4); h.rotation.z = s * Math.PI / 2; h.position.set(s * 11, 0, 0); S.add(h); return h; });
    const strM = new THREE.MeshStandardMaterial({ color: '#d23a44', roughness: 0.9 }), sg = new THREE.CylinderGeometry(0.075, 0.075, 1, 8); sg.translate(0, 0.5, 0);
    this.str = ALL.map(([a, b]) => { const m = new THREE.Mesh(sg, strM); m.castShadow = true; S.add(m); return { a, b, m, w: 0 }; });
    this.knots = [8, 9, 10].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), strM); m.castShadow = true; S.add(m); return m; });
    const gold = new THREE.MeshStandardMaterial({ color: '#ffd166', emissive: '#ffb020', emissiveIntensity: 1.6, roughness: 0.3 }); this.beads = BEADS.map((n) => { const m = new THREE.Mesh(new THREE.TorusKnotGeometry(0.22, 0.08, 40, 8), gold); S.add(m); return { n, m, got: false }; });
    this.exit = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.07, 8, 28), new THREE.MeshBasicMaterial({ color: '#8a8a96' })); S.add(this.exit);
    this.rin = buildRin3D(pbr('fabric').map); this.rin.scale.setScalar(0.8); S.add(this.rin); this.vell = buildVell(); this.vell.scale.setScalar(1.2); S.add(this.vell); this.fx = new Particles(S, 300, 0.25, false); this.fx.g = 0.2;
    this.hud = buildHud(g); this.hud.title('CHAPTER 16', "CAT'S CRADLE");
    this.t = 0; this.fin = null; this.noPause = false; this.fig = 0; this.from = 0; this.sw = 1; this.pos = Array.from({ length: 11 }, () => V()); this.p = { a: START, b: null, u: 0, face: 1, sp: 0 }; this.got = 0; this.said = {};
    g.show3d(true); if (handoff) g.fadeFrozen(1700, () => g.director.releaseOutgoing()); else g.clear2d();
    g.audio.muffle(0); g.music.play(SONG, { intensity: 1, fade: 1 });
    g.dialogue.say([{ who: 'vell', text: 'String! One loop, two hands. Every shape they make with it is a different place to stand.' }, { who: 'rin', text: 'Those hands are very large.' }, { who: 'vell', text: "They're gentle. Walk the strings. When you're on a knot or a fingertip, Q and E ask them to change the figure." }]);
    g.director.preload(17); this.place(0);
  }
  stop() { this.hud?.remove(); }
  respawn() {}
  has(k, a, b) { return FIG[k].e.some(([x, y]) => (x === a && y === b) || (x === b && y === a)); }
  place(dt) { // hands and knots, eased between the last figure and this one
    const A = FIG[this.from], B = FIG[this.fig], e = ease.inOutCubic(clamp(this.sw, 0, 1)), dip = Math.sin(clamp(this.sw, 0, 1) * Math.PI), t = this.t, k = this.fin ? ease.inOutCubic(clamp(this.fin.t / 4, 0, 1)) : 0;
    this.hands.forEach((h, i) => { const s = i ? 1 : -1; h.position.set(s * (11 + lerp(A.dx, B.dx, e) + k * 3), Math.sin(t * 0.9 + i) * 0.18 - dip * 1.3, dip * 1.6 * s); h.rotation.set(dip * 0.5, 0, s * Math.PI / 2 + s * lerp(A.tilt, B.tilt, e) + Math.sin(t * 0.7 + i * 2) * 0.02); h.userData.curl(A.curl.map((c, j) => lerp(c, B.curl[j], e) + dip * 0.25)); h.userData.splay(lerp(A.splay, B.splay, e) * (1 - k * 0.6)); h.userData.thumb(0.2 + dip * 0.5); h.updateMatrixWorld(true); h.userData.tips.forEach((tp, j) => tp.getWorldPosition(this.pos[i * 4 + j])); });
    for (let j = 0; j < 3; j++) this.pos[8 + j].set(lerp(A.c[j][0], B.c[j][0], e) + Math.sin(t * 1.1 + j * 2) * 0.08, lerp(A.c[j][1], B.c[j][1], e) * (1 - k) + Math.cos(t * 1.3 + j) * 0.08 - dip * 0.6, 0);
    for (const s of this.str) { const on = this.has(this.fig, s.a, s.b) && !this.fin; s.w = clamp(s.w + (on ? 1 : -1) * dt * 2.6, 0, 1); const a = this.pos[s.a], b = this.pos[s.b], d = b.clone().sub(a), L = d.length(); s.m.visible = s.w > 0.01; s.m.position.copy(a); s.m.scale.set(1, Math.max(0.001, L * ease.outCubic(s.w)), 1); s.m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); }
    this.knots.forEach((m, j) => m.position.copy(this.pos[8 + j]));
  }
  update(dt, outgoing) {
    if (outgoing || !this.scene) return; const g = this.game, inp = g.input, p = this.p, sfx = g.sfx; this.t += dt; this.fx.update(dt); this.sw = Math.min(1, this.sw + dt / 0.75);
    if (this.fin) { this.fin.t += dt; g.audio.muffle(clamp(this.fin.t / 6, 0, 0.6)); this.place(dt); return; }
    const ix = (inp.keys.has('KeyD') ? 1 : 0) - (inp.keys.has('KeyA') ? 1 : 0), iy = (inp.keys.has('KeyW') ? 1 : 0) - (inp.keys.has('KeyS') ? 1 : 0), il = Math.hypot(ix, iy) || 1, mag = ix || iy ? 1 : 0;
    const fd = (inp.pressed.interact ? 1 : 0) - (inp.pressed.special ? 1 : 0); if (fd && this.sw >= 1) { if (p.b === null) { this.from = this.fig; this.fig = (this.fig + fd + 3) % 3; this.sw = 0; sfx.play('pp.string'); sfx.play('ink.stretch', { vol: 0.5 }); sfx.play('pp.fold', { vol: 0.5 }); } else { sfx.play('ui.back'); if (!this.said.sw) { this.said.sw = true; g.dialogue.say('vell', "Not from the middle of a string! Stand on a knot or a fingertip first, or there's nothing to hold you."); } } }
    this.place(dt); p.sp = lerp(p.sp, 0, Math.min(1, dt * 10));
    if (this.sw >= 1 && mag) {
      if (p.b === null) { let best = null, bd = 0.35; for (const [x, y] of FIG[this.fig].e) { const o = x === p.a ? y : y === p.a ? x : -1; if (o < 0) continue; const d = this.pos[o].clone().sub(this.pos[p.a]).normalize(), dot = (d.x * ix + d.y * iy) / il; if (dot > bd) { bd = dot; best = o; } } if (best !== null) { p.b = best; p.u = 0; } }
      if (p.b !== null) { const d = this.pos[p.b].clone().sub(this.pos[p.a]), L = d.length(), pr = (d.x * ix + d.y * iy) / (L * il); p.u += (pr * 3.6 * dt) / L; p.sp = Math.abs(pr) * 3.6; if (Math.abs(d.x * pr) > 0.02) p.face = Math.sign(d.x * pr); if (Math.floor(this.t * 5) !== Math.floor((this.t - dt) * 5) && Math.abs(pr) > 0.3) sfx.play('pp.step', { vol: 0.25, pitch: 1.4 }); if (p.u >= 1) { p.a = p.b; p.b = null; sfx.play('pp.pin', { vol: 0.4 }); } else if (p.u <= 0) { p.b = null; p.u = 0; } }
    }
    if (p.b === null) { for (const b of this.beads) if (!b.got && b.n === p.a) { b.got = true; b.m.visible = false; this.got++; sfx.play('pp.chime', { pitch: 1 + this.got * 0.2 }); sfx.play('px.pickup'); for (let i = 0; i < 20; i++) this.fx.emit(this.pos[p.a], V(0, 1, 0), new THREE.Color('#ffd166'), 1.2, 3); g.save.setCheckpoint(16, null); if (this.got === 3) g.dialogue.say('vell', 'All three! The ring finger on the right hand is lit. Get there.'); }
      if (p.a === EXIT && this.got >= 3) { this.fin = { t: 0 }; this.noPause = true; sfx.play('fx.rise'); sfx.play('pp.string'); g.dialogue.clear(); g.dialogue.say([{ who: 'rin', text: 'They are letting the loop go.' }, { who: 'vell', text: "It's falling open into wires and weights. Something's HANGING from it. Don't look down — look across!" }]); } }
    if (!this.said.a && this.t > 16 && this.got === 0) { this.said.a = true; g.dialogue.say('vell', 'A knot you cannot reach in this figure might be one step away in the next. Q and E.'); }
  }
  render(dt) {
    if (!this.scene) return; const g = this.game, r = this.r, p = this.p, t = this.t, k = this.fin ? clamp(this.fin.t / 5, 0, 1) : 0; if (r.domElement.width !== g.W || r.domElement.height !== g.H) r.setSize(g.W, g.H, false);
    const at = p.b === null ? this.pos[p.a].clone() : this.pos[p.a].clone().lerp(this.pos[p.b], p.u); this.rin.position.set(at.x, at.y + 0.06, at.z + 0.1); let dy = (p.face > 0 ? Math.PI / 2 : -Math.PI / 2) * (p.sp > 0.3 ? 1 : 0.35) - this.rin.rotation.y; this.rin.rotation.y += dy * Math.min(1, dt * 9); this.rin.rotation.z = Math.sin(t * 3.1) * 0.07 + Math.sin(t * 5.3) * 0.03;
    animateRin(this.rin, { speed: p.sp * 1.6, ground: true, vy: 0, slide: false, climb: 0, grapple: false, strike: 0, hurt: 0, t, dt, lookAt: null, talk: false }); if (this.fin) this.rin.position.y -= k * k * 14;
    this.vell.position.lerp(V(at.x - 1.3, at.y + 2.1 + Math.sin(t * 2) * 0.15, 0.8), Math.min(1, dt * 4)); this.vell.rotation.y = t; this.vell.userData.tick(t);
    for (const b of this.beads) { b.m.position.copy(this.pos[b.n]).add(V(0, 0.55, 0)); b.m.rotation.set(t, t * 1.3, 0); } this.exit.position.copy(this.pos[EXIT]).add(V(0, 0.2, 0)); this.exit.rotation.y = t * 1.5; this.exit.material.color.set(this.got >= 3 ? '#8ff5e3' : '#8a8a96'); if (this.got >= 3) this.exit.material.color.multiplyScalar(2.2); this.exit.scale.setScalar(1 + (this.got >= 3 ? Math.sin(t * 6) * 0.15 : 0));
    if (Math.random() < 0.4) this.fx.emit(V((Math.random() - 0.5) * 30, -8 + Math.random() * 16, -2 + Math.random() * 6), V(0.1, 0.15, 0), new THREE.Color('#fff6e0'), 5, 0.2);
    this.cam.position.set(at.x * 0.12, 0.8 + at.y * 0.1, 25 + k * 10); this.cam.lookAt(at.x * 0.2, at.y * 0.12, 0); this.cam.aspect = g.W / g.H; this.cam.updateProjectionMatrix();
    renderFX(g, r, this.scene, this.cam, { bloom: 0.3 + k, threshold: 1.1, tilt: 0.35, focus: 0.5, vig: 0.34, sat: 1.12, con: 1.04 });
    if (this.fin && this.fin.t > 5.6 && !this.fin.done) { this.fin.done = true; g.freezeFrame(); const ok = g.director.handoff(17, { from16: true }); if (!ok) { g.clear2d(); g.save.complete(16); g.audio.muffle(0); g.director.end({ chapter: 16 }); } return; }
    if (!this.fin) this.hud.set(this.got < 3 ? `Collect the gold knots — ${this.got} / 3` : 'Reach the glowing fingertip', [`!<kbd>Q</kbd><kbd>E</kbd>${FIG[this.fig].name}`, p.b === null ? '<kbd>●</kbd>ON A KNOT — YOU CAN CHANGE THE FIGURE' : '<kbd>~</kbd>ON A STRING']); else this.hud.set('', []); this.hud.tick();
  }
  perfInfo() { const i = this.r.info.render; return `calls ${i.calls} · tris ${i.triangles}`; }
}
