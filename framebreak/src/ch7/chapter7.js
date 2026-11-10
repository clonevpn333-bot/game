// CHAPTER 7 — FULL RESOLUTION. Third-person parkour through a metropolis that
// is physically rearranging itself: shutters drop, road decks rise, towers
// slide on rails, cog platforms turn, and the Curator's REFRAMER closes the
// street behind you. Sprint, slide, vault/mantle, grapple, strike.
import * as THREE from 'three';
import { getRenderer } from '../ch3/chapter3.js';
import { buildRin3D, animateRin } from './rig.js';
import { clamp, lerp, makeCanvas, rng, ease } from '../core/util.js';

const el = (cls, html = '') => { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; return e; };
const V = (x, y, z) => new THREE.Vector3(x, y, z);
function canv(size, fn) { const c = makeCanvas(size, size), x = c.getContext('2d'); fn(x, size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t; }
function makeTextures() {
  const r = rng(4), T = {};
  T.concrete = canv(512, (x, s) => { x.fillStyle = '#8d8f96'; x.fillRect(0, 0, s, s); for (let i = 0; i < 9000; i++) { const g = 110 + r.int(0, 70); x.fillStyle = `rgba(${g},${g},${g + 6},0.35)`; x.fillRect(r.range(0, s), r.range(0, s), r.range(1, 3), r.range(1, 3)); } for (let i = 0; i < 26; i++) { const px = r.range(0, s), g = x.createLinearGradient(0, 0, 0, s); g.addColorStop(0, 'rgba(40,36,34,0.28)'); g.addColorStop(1, 'rgba(40,36,34,0)'); x.fillStyle = g; x.fillRect(px, 0, r.range(4, 26), r.range(s * 0.3, s)); } x.strokeStyle = 'rgba(30,30,34,0.55)'; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(0, (i * s) / 4); x.lineTo(s, (i * s) / 4); x.stroke(); x.beginPath(); x.moveTo((i * s) / 4, 0); x.lineTo((i * s) / 4, s); x.stroke(); } for (let i = 0; i < 6; i++) { x.strokeStyle = 'rgba(25,25,28,0.5)'; x.lineWidth = 1; x.beginPath(); let px = r.range(0, s), py = r.range(0, s); x.moveTo(px, py); for (let k = 0; k < 8; k++) { px += r.range(-20, 20); py += r.range(6, 30); x.lineTo(px, py); } x.stroke(); } });
  T.metal = canv(512, (x, s) => { x.fillStyle = '#9aa2b0'; x.fillRect(0, 0, s, s); for (let i = 0; i < 2600; i++) { const g = 120 + r.int(0, 110); x.strokeStyle = `rgba(${g},${g},${g + 8},0.3)`; x.beginPath(); const y = r.range(0, s), px = r.range(0, s); x.moveTo(px, y); x.lineTo(px + r.range(20, 160), y + r.range(-1, 1)); x.stroke(); } for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(120,70,40,0.18)'; x.beginPath(); x.arc(r.range(0, s), r.range(0, s), r.range(3, 16), 0, 7); x.fill(); } x.strokeStyle = 'rgba(20,24,30,0.7)'; x.lineWidth = 3; x.strokeRect(6, 6, s - 12, s - 12); for (const [a, b] of [[16, 16], [s - 16, 16], [16, s - 16], [s - 16, s - 16]]) { x.fillStyle = '#5a6070'; x.beginPath(); x.arc(a, b, 5, 0, 7); x.fill(); x.fillStyle = '#c9d1e6'; x.beginPath(); x.arc(a - 1, b - 1, 2, 0, 7); x.fill(); } });
  T.asphalt = canv(512, (x, s) => { x.fillStyle = '#2c2f38'; x.fillRect(0, 0, s, s); for (let i = 0; i < 12000; i++) { const g = 30 + r.int(0, 60); x.fillStyle = `rgba(${g},${g},${g + 5},0.5)`; x.fillRect(r.range(0, s), r.range(0, s), 2, 2); } x.fillStyle = '#d9c36a'; for (let y = 0; y < s; y += 128) x.fillRect(s / 2 - 6, y + 20, 12, 70); });
  T.wet = canv(256, (x, s) => { x.fillStyle = '#b0b0b0'; x.fillRect(0, 0, s, s); for (let i = 0; i < 26; i++) { const g = x.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, 'rgba(10,10,10,1)'); g.addColorStop(1, 'rgba(10,10,10,0)'); x.save(); x.translate(r.range(0, s), r.range(0, s)); x.scale(r.range(14, 50), r.range(8, 26)); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 1, 0, 7); x.fill(); x.restore(); } });
  const win = (lit) => canv(256, (x, s) => { const r = rng(9); x.fillStyle = lit ? '#000' : '#39414f'; x.fillRect(0, 0, s, s); for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) { const on = r.chance(0.34), wx = i * 64 + 10, wy = j * 32 + 7; if (lit) { if (on) { x.fillStyle = r.chance(0.3) ? '#9fdcff' : '#ffcf8a'; x.fillRect(wx, wy, 44, 19); x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(wx + r.int(0, 30), wy + 9, 10, 10); } } else { x.fillStyle = '#10161f'; x.fillRect(wx - 2, wy - 2, 48, 23); x.fillStyle = on ? '#6b5a3c' : '#1c2836'; x.fillRect(wx, wy, 44, 19); x.fillStyle = 'rgba(255,255,255,0.1)'; x.fillRect(wx, wy, 44, 3); x.fillStyle = '#4a5262'; x.fillRect(wx + 21, wy, 2, 19); x.fillStyle = '#5b6474'; x.fillRect(wx - 4, wy + 21, 52, 3); } } });
  T.win = win(false); T.winE = win(true);
  T.fabric = canv(128, (x, s) => { x.fillStyle = '#808080'; x.fillRect(0, 0, s, s); for (let i = 0; i < s; i += 2) { x.fillStyle = i % 4 ? '#6a6a6a' : '#9a9a9a'; x.fillRect(i, 0, 1, s); x.fillRect(0, i, s, 1); } });
  T.print = canv(256, (x, s) => { x.fillStyle = '#808080'; x.fillRect(0, 0, s, s); for (let k = 0; k < 14; k++) { const cx = r.range(0, s), cy = r.range(0, s); for (let i = 2; i < 34; i += 3) { x.strokeStyle = 'rgba(40,40,40,0.5)'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(cx, cy, i * 0.8, i, 0.4, 0, 7); x.stroke(); } } });
  for (const k of ['concrete', 'metal', 'asphalt', 'win']) T[k].colorSpace = THREE.SRGBColorSpace; T.winE.colorSpace = THREE.SRGBColorSpace;
  return T;
}
const SONG = (() => { const bars = {}, ch = [['D2', 'D3+A3+F4', 'D5 . . A5 . . G5 . F5 . G5 . A5 . . .'], ['A#1', 'A#2+F3+D4', 'F5 . . D5 . . A#4 . D5 . F5 . A#5 . A5 .'], ['C2', 'C3+G3+E4', 'G5 . . E5 . . C5 . E5 . G5 . C6 . . .'], ['A1', 'A2+E3+C#4', 'A5 . . F5 . . D5 . E5 . . . C#5 . E5 .']]; const A = ch.map(([b, c, m], i) => { bars['a' + i] = { sub: `${b} . ${b} ${b} . ${b} . ${b} ${b} . ${b} ${b} . ${b} . ${b}`, str: `${c} - - - - - - - - - - - - - - -`, brass: m, drums: i === 3 ? 'k . h k p . k k k h p k t t l l' : 'k . h . p . h k . k h . p . h .', arp: m.replace(/5/g, '6').replace(/ \. \./g, ' . .') }; return 'a' + i; }); return { bpm: 148, gain: 1, reverb: 0.35, start: 'A', tracks: { sub: { inst: 'subbass', vol: 0.9 }, str: { inst: 'strings', vol: 0.9, send: 0.5 }, brass: { inst: 'brass', vol: 0.75, send: 0.3 }, arp: { inst: 'bell', vol: 0.25, pan: 0.3, send: 0.5, layer: 2 }, drums: { kit: 'electro', vol: 0.9 } }, bars, sections: { A }, next: { A: 'A' } }; })();
export { SONG as SONG_CH7 };

export default class Chapter7 {
  constructor(game) { this.game = game; this.id = 7; this.compositesOutgoing = true; }
  async load() { this.T = makeTextures(); }
  controlsHelp() { return '<b>W/A/S/D</b> run · <b>SHIFT</b> sprint · <b>SPACE</b> jump (run at ledges to vault/mantle) · <b>S + SHIFT</b> or <b>C</b>: slide<br><b>J</b> grapple (hold) · <b>L</b> strike · <b>← →</b> or mouse: camera'; }

  start({ handoff }) {
    const g = this.game, T = this.T; this.r = getRenderer(g); this.r.shadowMap.enabled = g.settings.shadows > 0; this.r.toneMappingExposure = 0.95;
    const S = (this.scene = new THREE.Scene()); S.fog = new THREE.FogExp2('#3b4660', 0.012); S.background = new THREE.Color('#3b4660');
    this.cam = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 600); this.t = 0; this.said = {}; this.fin = null; this.noPause = false; this.shake = 0; this.plats = []; this.anchors = []; this.drones = []; this.bolts = []; this.movers = []; this.mats = [];
    // image-based lighting from a small procedural sky
    const sky = new THREE.Scene(), sm = new THREE.Mesh(new THREE.SphereGeometry(50, 16, 12), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })); const pc = sm.geometry.attributes.position, cols = []; for (let i = 0; i < pc.count; i++) { const h = pc.getY(i) / 50, c = new THREE.Color().lerpColors(new THREE.Color('#2a3350'), new THREE.Color('#ffb47a'), clamp(1 - Math.abs(h - 0.08) * 3, 0, 1)); if (h < -0.1) c.set('#141824'); cols.push(c.r, c.g, c.b); } sm.geometry.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); sky.add(sm);
    for (let i = 0; i < 20; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 2), new THREE.MeshBasicMaterial({ color: i % 2 ? '#ffcf8a' : '#7fd8ff' })); b.position.set(Math.cos(i) * 30, -4 + (i % 5) * 3, Math.sin(i) * 30); sky.add(b); }
    const pm = new THREE.PMREMGenerator(this.r); S.environment = pm.fromScene(sky, 0.04).texture; pm.dispose(); S.environmentIntensity = 0.9;
    S.add(new THREE.HemisphereLight('#aebfe8', '#2a2430', 0.5)); const sun = (this.sun = new THREE.DirectionalLight('#ffc591', 2.6)); sun.castShadow = g.settings.shadows > 0; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 160 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; S.add(sun, sun.target);
    const mat = (o) => { const m = new THREE.MeshStandardMaterial(o); this.mats.push({ m, r: m.roughness, me: m.metalness, c: m.color.clone() }); return m; };
    const mk = (this.M = { conc: mat({ map: T.concrete, bumpMap: T.concrete, bumpScale: 1.4, roughness: 0.9 }), metal: mat({ map: T.metal, roughnessMap: T.metal, bumpMap: T.metal, bumpScale: 0.6, metalness: 0.85, roughness: 0.55 }), road: mat({ map: T.asphalt, roughnessMap: T.wet, roughness: 1, metalness: 0.1, bumpMap: T.asphalt, bumpScale: 0.8 }), win: mat({ map: T.win, emissiveMap: T.winE, emissive: '#ffffff', emissiveIntensity: 1.6, roughness: 0.25, metalness: 0.6 }), haz: mat({ color: '#e0a92e', roughness: 0.6, metalness: 0.3, bumpMap: T.metal }), dark: mat({ color: '#252a36', roughness: 0.5, metalness: 0.7 }), red: mat({ color: '#c2362f', roughness: 0.45, metalness: 0.4 }), glass: mat({ color: '#9fd8ff', roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.45 }), neon: mat({ color: '#111', emissive: '#2fd3c6', emissiveIntensity: 3 }), neon2: mat({ color: '#111', emissive: '#ff5a8a', emissiveIntensity: 3 }) });
    const box = (w, h, d, m, x, y, z, parent = S) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
    // collidable platform (kinematic): fn(t, c) may move its centre
    const plat = (cx, cy, cz, hx, hy, hz, m, fn, dress) => { const grp = new THREE.Group(); S.add(grp); const b = box(hx * 2, hy * 2, hz * 2, m, 0, 0, 0, grp); if (m.map) { b.material = m; } dress?.(grp, hx, hy, hz); const p = { c: V(cx, cy, cz), h: V(hx, hy, hz), d: V(0, 0, 0), fn, grp, base: V(cx, cy, cz) }; grp.position.copy(p.c); this.plats.push(p); return p; };
    const rail = (grp, hx, hy, hz) => { for (const sx of [-1, 1]) { box(0.08, 1, hz * 2, mk.metal, sx * (hx - 0.1), hy + 0.5, 0, grp); for (let z = -hz + 0.5; z < hz; z += 2.5) box(0.08, 1, 0.08, mk.dark, sx * (hx - 0.1), hy + 0.5, z, grp); } };
    const roofKit = (grp, hx, hy, hz) => { box(hx * 2 + 0.3, 0.25, hz * 2 + 0.3, mk.metal, 0, hy - 0.1, 0, grp); box(1.4, 0.9, 1.4, mk.metal, -hx + 1.4, hy + 0.45, hz - 1.6, grp); box(0.9, 1.6, 0.9, mk.dark, hx - 1.2, hy + 0.8, -hz + 1.4, grp); const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 1.6, 14), mk.metal); tank.position.set(hx - 1.3, hy + 0.9, hz - 1.5); tank.castShadow = true; grp.add(tank); for (const s of [-1, 1]) for (const f of [-1, 1]) box(hx * 2 - 0.4, 1.2, 0.04, mk.win, 0, -1.4 - f * 0, s * (hz + 0.03), grp).scale.set(1, Math.min(6, hy) , 1); };
    // --- course
    const t0 = plat(0, -1, 25, 7, 1, 36, mk.road, null, rail); void t0;
    plat(-5.5, 3, 30, 1.5, 3, 0.6, mk.conc); plat(5.5, 3, 30, 1.5, 3, 0.6, mk.conc); box(14, 0.8, 1.4, mk.metal, 0, 6.2, 30);
    plat(0, 3.2, 30, 4, 2, 0.35, mk.haz, (t, c) => { c.y = 3.15 + (0.5 + 0.5 * Math.sin(t * 1.1)) * 2.2; });                         // shutter: slide under when low
    plat(0, 0.55, 42, 5, 0.55, 0.3, mk.haz); plat(0, 0.55, 49, 5, 0.55, 0.3, mk.haz);                                               // barriers: vault
    [0, 1, 2].forEach((i) => plat(0, -1, 65 + i * 8, 6, 1, 4, mk.road, (t, c) => { const k = ease.inOutCubic(clamp((this.rise || 0) - i * 0.25, 0, 1)); c.y = -1 + k * 1.5 * (i + 1); }, rail)); // road decks that rise
    plat(0, 0, 98, 5, 4.5, 8, mk.conc, (t, c) => { c.x = Math.sin(t * 0.5) * 5; }, roofKit);
    plat(0, 0.5, 117, 5, 5, 7, mk.conc, (t, c) => { c.x = -Math.sin(t * 0.6) * 6; }, roofKit);
    plat(0, 0, 134, 5, 5, 6, mk.conc, (t, c) => { c.z = 134 + Math.sin(t * 0.7) * 2.5; }, roofKit);
    this.anchors.push({ p: V(0, 17, 157) }); box(0.5, 0.5, 44, mk.metal, 0, 18, 157); box(0.3, 1.4, 0.3, mk.haz, 0, 17.4, 157);
    plat(0, 0, 186, 6, 6, 14, mk.conc, null, roofKit);
    [0, 1, 2, 3].forEach((k) => plat(0, 6.6 + k * 1.9, 214, 1.7, 0.3, 1.7, mk.haz, (t, c) => { const a = t * 0.45 + k * 1.57; c.x = Math.sin(a) * 5.2; c.z = 214 + Math.cos(a) * 5.2; }));
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 16, 20), mk.metal); hub.position.set(0, 8, 214); hub.castShadow = true; S.add(hub); this.cog = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, 0.5, 28), mk.dark); this.cog.position.set(0, 5.6, 214); S.add(this.cog);
    plat(0, 6.5, 290, 5, 7.5, 62, mk.road, null, rail);                                                                             // the high road
    plat(0, 16.9, 258, 5, 0.9, 0.35, mk.haz); plat(0, 14.55, 272, 5, 0.55, 0.3, mk.haz); plat(0, 16.9, 306, 5, 0.9, 0.35, mk.haz); plat(0, 14.55, 318, 5, 0.55, 0.3, mk.haz);
    this.walls = [-1, 1].map((s) => plat(s * 14, 20, 290, 4, 14, 62, mk.metal, (t, c) => { c.x = s * (9.6 - (this.squeeze || 0) * 6.2); }));
    this.anchors.push({ p: V(0, 34, 344) }); box(1, 30, 1, mk.metal, 0, 30, 352); box(8, 0.6, 0.6, mk.metal, 0, 34.6, 348);
    plat(0, 24, 362, 6, 1, 8, mk.conc, null, roofKit);
    // --- scenery towers (no collision): varied silhouettes, setbacks, signs
    const rr = rng(77); for (let i = 0; i < 70; i++) { const side = i % 2 ? 1 : -1, z = -20 + i * 6 + rr.range(-2, 2), w = rr.range(8, 16), h = rr.range(18, 70), x = side * (16 + w / 2 + rr.range(0, 22)); const b = box(w, h, w, mk.win, x, h / 2 - 12, z); b.material = mk.win; b.geometry.attributes.uv.array.forEach((v, k, a) => { a[k] = v * (k % 2 ? h / 6 : w / 8); }); box(w * 0.7, 3, w * 0.7, mk.conc, x, h - 10.5, z); if (rr.chance(0.5)) box(0.3, rr.range(4, 12), 0.3, mk.dark, x, h - 6, z); if (rr.chance(0.35)) box(0.3, rr.range(3, 7), rr.range(3, 6), rr.chance(0.5) ? mk.neon : mk.neon2, x - side * (w / 2 + 0.2), rr.range(4, 20), z); }
    for (const z of [10, 70, 150, 240, 320]) for (const s of [-1, 1]) { const m = box(1.2, 80, 1.2, mk.metal, s * 12, 20, z); this.movers.push({ m, s, z }); box(26, 1, 1, mk.dark, 0, 44 + (z % 7), z); }
    // rain
    const rg = new THREE.BufferGeometry(), rp = new Float32Array(1400 * 6); this.rainP = rp; for (let i = 0; i < 1400; i++) { rp[i * 6] = rp[i * 6 + 3] = Math.random() * 60 - 30; rp[i * 6 + 1] = Math.random() * 40; rp[i * 6 + 4] = rp[i * 6 + 1] - 0.9; rp[i * 6 + 2] = rp[i * 6 + 5] = Math.random() * 60 - 30; } rg.setAttribute('position', new THREE.BufferAttribute(rp, 3)); this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#b9cfff', transparent: true, opacity: 0.35 })); this.rain.frustumCulled = false; S.add(this.rain);
    // drones
    for (const [x, z, y] of [[-2, 54, 2.2], [3, 58, 2.6], [0, 190, 13.5], [-3, 282, 16.5], [3, 296, 16.5]]) { const d = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), mk.dark); const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ff3c3c', emissiveIntensity: 4 })); eye.position.z = -0.38; const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 20), mk.metal); ring.rotation.x = Math.PI / 2; d.add(b, eye, ring); d.position.set(x, y, z); S.add(d); this.drones.push({ d, home: V(x, y, z), cool: 1.5, hp: 1, ring }); }
    this.boltGeo = new THREE.SphereGeometry(0.14, 8, 6); this.boltMat = new THREE.MeshBasicMaterial({ color: '#ff5a3c' });
    // Rin, Vell
    this.rin = buildRin3D(T.fabric); S.add(this.rin);
    this.vell = new THREE.Group(); const vb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 1), new THREE.MeshStandardMaterial({ color: '#c06fc0', roughness: 0.2, metalness: 0.7, emissive: '#5e3a82' })); const ve = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff' })); ve.position.set(-0.06, 0.03, 0.19); const ve2 = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff' })); ve2.position.set(0.1, 0.04, 0.18); this.vell.add(vb, ve, ve2); S.add(this.vell);
    this.rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 5), new THREE.MeshBasicMaterial({ color: '#8ff5e3' })); this.rope.visible = false; S.add(this.rope);
    this.cps = [[0, 0, 2], [0, 0.5, 62], [0, 5.5, 132], [0, 6.2, 178], [0, 14.2, 234]]; this.cp = 0;
    this.p = { pos: V(0, 0.2, 2), vel: V(0, 0, 0), yaw: 0, ground: null, slide: 0, climb: null, grap: null, strike: 0, hp: 5, inv: 0, speed: 0, coy: 0, buf: 0 }; this.cy = 0; this.camPos = V(0, 3, -4);
    this.ui = el('hud3'); this.dlg = el('dlg dark', '<div class="who"></div><div class="txt"></div>'); this.dlg.style.top = 'auto'; this.dlg.style.bottom = '8%'; this.banner = el('banner', '<small>CHAPTER 7</small>FULL RESOLUTION'); this.hud = el('mach'); this.tip = el('prompt paper'); this.tip.style.cssText += ';left:50%;top:70%;background:rgba(13,15,31,.8);color:#fff;display:none'; this.ui.append(this.dlg, this.banner, this.hud, this.tip); g.ui.appendChild(this.ui);
    g.show3d(true); if (handoff) g.fadeFrozen(1400, () => g.director.releaseOutgoing()); else g.clear2d();
    g.audio.muffle(0); g.music.play(SONG, { intensity: 1, fade: 1 }); setTimeout(() => { this.banner.style.opacity = '1'; setTimeout(() => (this.banner.style.opacity = '0'), 3000); }, 700);
    g.dialogue.say([{ who: 'rin', text: 'Fingers. Eyelashes. Rain I can actually feel. Is this... the real one?' }, { who: 'vell', text: "It's the EXPENSIVE one. Don't confuse the two. Also the city is rearranging itself, so: run." }]);
    g.director.preload(8);
  }
  stop() { this.ui?.remove(); this.game.show3d(false); this.game.input.exitLock(); this.scene = null; }
  respawn() { const c = this.cps[this.cp], p = this.p; p.pos.set(c[0], c[1] + 1, c[2]); p.vel.set(0, 0, 0); p.hp = 5; p.inv = 1.5; p.grap = null; p.climb = null; if (this.cp >= 4) { this.squeeze = 0; this.sqOn = false; } this.game.sfx.play('px.hurt'); }
  hitBox(pos, h) { for (const q of this.plats) if (Math.abs(pos.x - q.c.x) < q.h.x + 0.33 && Math.abs(pos.z - q.c.z) < q.h.z + 0.33 && pos.y < q.c.y + q.h.y && pos.y + h > q.c.y - q.h.y) return q; return null; }

  update(dt, outgoing) {
    if (outgoing || !this.scene) return; const g = this.game, inp = g.input, p = this.p, sfx = g.sfx; this.t += dt; const t = this.t;
    for (const q of this.plats) { if (q.fn) { const o = q.c.clone(); q.fn(t, q.c); q.d.subVectors(q.c, o); q.grp.position.copy(q.c); } }
    if (this.fin) { this.fin.t += dt; this.fin.k = clamp(this.fin.t / 7, 0, 1); g.audio.muffle(this.fin.k * 0.5); if (this.fin.t > 7.6) this.fin.snap = true; p.vel.multiplyScalar(0.9); }
    if (inp.mouse.left && !inp.locked) inp.requestLock();
    this.cy += ((inp.keys.has('ArrowLeft') ? 1 : 0) - (inp.keys.has('ArrowRight') ? 1 : 0)) * 2.2 * dt - (inp.locked ? inp.mouse.dx * 0.003 : 0); inp.mouse.dx = 0;
    const ctl = !this.fin, ix = ctl ? inp.axisX : 0, iz = ctl ? (inp.keys.has('KeyW') ? 1 : 0) - (inp.keys.has('KeyS') ? 1 : 0) : 0, sprint = inp.down.dash, H = p.slide > 0 ? 0.9 : 1.75;
    p.inv -= dt; p.strike = Math.max(0, p.strike - dt * 3);
    if (p.ground) { p.pos.add(p.ground.d); p.coy = 0.12; } else p.coy -= dt; if (inp.pressed.jump) p.buf = 0.12; else p.buf -= dt;
    if (p.climb) { // mantle: pull up onto the ledge
      const c = p.climb; c.t += dt / 0.38; p.pos.lerpVectors(c.from, c.to, ease.inOutCubic(Math.min(1, c.t))); p.vel.set(0, 0, 0); if (c.t >= 1) p.climb = null;
    } else if (p.grap) { // elastic line: reel toward the anchor, keep tangential momentum
      const a = p.grap.p, d = a.clone().sub(p.pos).add(V(0, -1.4, 0)), L = d.length(); p.vel.add(d.normalize().multiplyScalar(34 * dt)); p.vel.y -= 9 * dt; p.vel.multiplyScalar(1 - 0.5 * dt); p.vel.z += 6 * dt;
      if (!inp.down.attack || L < 2.6 || p.pos.z > a.z + 6) { p.grap = null; p.vel.y = Math.max(p.vel.y, 6); p.vel.z += 5; sfx.play('ink.snap'); }
    } else {
      const fwd = V(-Math.sin(this.cy), 0, Math.cos(this.cy)), right = V(-fwd.z, 0, fwd.x), want = fwd.multiplyScalar(iz).add(right.multiplyScalar(-ix)), mx = sprint ? 9 : 5.6;
      if (want.lengthSq() > 0.01) { want.normalize(); p.yaw = Math.atan2(want.x, want.z); }
      if (p.slide > 0) { p.slide -= dt; p.vel.x *= 1 - 0.6 * dt; p.vel.z *= 1 - 0.6 * dt; if (p.slide <= 0 && this.hitBox(p.pos.clone().setY(p.pos.y + 0.05), 1.75)) p.slide = 0.1; }
      else { const acc = p.ground ? 40 : 12; p.vel.x = lerp(p.vel.x, want.x * mx, Math.min(1, acc * dt / mx)); p.vel.z = lerp(p.vel.z, want.z * mx, Math.min(1, acc * dt / mx)); }
      if (ctl && (inp.keys.has('KeyC') || (sprint && inp.keys.has('KeyS'))) && p.ground && p.slide <= 0 && Math.hypot(p.vel.x, p.vel.z) > 3) { p.slide = 0.75; const s = Math.hypot(p.vel.x, p.vel.z); p.vel.x *= 10.5 / s; p.vel.z *= 10.5 / s; sfx.play('px.slide'); }
      if (p.buf > 0 && p.coy > 0 && p.slide <= 0) { p.vel.y = 7.6; p.buf = 0; p.coy = 0; sfx.play('pp.jump'); }
      p.vel.y = Math.max(p.vel.y - 21 * dt, -40);
      if (inp.pressed.attack && ctl) { let best = null, bd = 30; for (const a of this.anchors) { const d = a.p.distanceTo(p.pos); if (d < bd && a.p.z > p.pos.z - 4) { bd = d; best = a; } } if (best) { p.grap = best; p.ground = null; sfx.play('ink.stretch'); sfx.play('ink.grab'); } }
      if (inp.pressed.shoot && ctl) { p.strike = 1; sfx.play('px.swing'); for (const d of this.drones) if (d.hp > 0 && d.d.position.distanceTo(p.pos.clone().setY(p.pos.y + 1.2)) < 2.6) { d.hp = 0; this.scene.remove(d.d); sfx.play('px.explode'); this.shake = 0.5; } }
    }
    // integrate + collide (axis separated), with vault / mantle on ledges
    if (!p.climb) {
      const old = p.pos.clone(); p.ground = null;
      for (const ax of ['x', 'z']) { p.pos[ax] += p.vel[ax] * dt; const q = this.hitBox(p.pos.clone().setY(p.pos.y + 0.12), H - 0.12); if (q) { const top = q.c.y + q.h.y, rise = top - p.pos.y; if (!p.grap && rise > 0.12 && rise < 2.5 && !this.hitBox(V(p.pos.x, top + 0.05, p.pos.z), 1.7)) { const to = p.pos.clone(); to.y = top + 0.02; to[ax] += Math.sign(p.vel[ax]) * 0.5; p.pos[ax] = old[ax]; p.climb = { from: p.pos.clone(), to, t: 0 }; sfx.play('pp.land'); break; } p.pos[ax] = old[ax]; p.vel[ax] = 0; } }
      if (!p.climb) { p.pos.y += p.vel.y * dt; const q = this.hitBox(p.pos, H); if (q) { if (p.vel.y <= 0) { p.pos.y = q.c.y + q.h.y; if (p.vel.y < -9) { sfx.play('pp.land'); this.shake = 0.2; } p.ground = q; } else p.pos.y = q.c.y - q.h.y - H - 0.01; p.vel.y = 0; } }
    }
    p.speed = Math.hypot(p.vel.x, p.vel.z);
    // set pieces
    if (p.pos.z > 54) this.rise = Math.min(2, (this.rise || 0) + dt * 0.45);
    if (p.pos.z > 236 && !this.fin) { if (!this.sqOn) { this.sqOn = true; sfx.play('px.bossroar'); g.music.setIntensity(2); g.dialogue.say([{ who: 'curator', text: 'This is the REFRAMER. It trims a world to fit. Hold still and it will not hurt.' }, { who: 'vell', text: 'It will absolutely hurt. SPRINT. Slide the low beams, vault the rest!' }]); } this.squeeze = Math.min(1, (this.squeeze || 0) + dt / (g.easy ? 40 : 21)); if (this.squeeze > 0.2) this.shake = Math.max(this.shake, 0.08); if (Math.abs(p.pos.x) > 9.6 - this.squeeze * 6.2 - 4.3 && p.pos.z < 352 && this.squeeze > 0.97) this.respawn(); }
    // drones
    for (const d of this.drones) { if (d.hp <= 0) continue; const dp = p.pos.clone().setY(p.pos.y + 1.2), dist = d.d.position.distanceTo(dp); d.d.position.y = d.home.y + Math.sin(t * 2 + d.home.z) * 0.3; d.d.lookAt(dp); d.ring.rotation.z = t * 6; d.cool -= dt; if (dist < 16 && d.cool <= 0) { d.cool = 1.8; const m = new THREE.Mesh(this.boltGeo, this.boltMat); m.position.copy(d.d.position); this.scene.add(m); this.bolts.push({ m, v: dp.sub(d.d.position).normalize().multiplyScalar(11), t: 0 }); sfx.play('px.shot', { pitch: 0.6, vol: 0.4 }); } }
    for (const b of this.bolts) { b.t += dt; b.m.position.addScaledVector(b.v, dt); if (b.m.position.distanceTo(p.pos.clone().setY(p.pos.y + 1)) < 0.7 && p.inv <= 0) { b.t = 9; if (!(g.easy && p.hp <= 1)) p.hp--; p.inv = g.easy ? 2.5 : 1; sfx.play('px.hurt'); this.shake = 0.5; if (p.hp <= 0) this.respawn(); } if (b.t > 3) this.scene.remove(b.m); } this.bolts = this.bolts.filter((b) => b.t <= 3);
    if (p.pos.y < (p.pos.z > 228 ? 4 : -14)) this.respawn();
    this.cps.forEach((c, i) => { if (i > this.cp && p.pos.z > c[2] && p.ground) { this.cp = i; g.save.setCheckpoint(7, null); p.hp = 5; } });
    const say = (k, z, who, text) => { if (!this.said[k] && p.pos.z > z) { this.said[k] = true; g.dialogue.say(who, text); } };
    say('a', 18, 'vell', 'Shutter! Sprint and slide — SHIFT, then C.'); say('b', 56, 'rin', 'The road is lifting itself into stairs.'); say('c', 86, 'vell', 'Buildings on rails. Time your jumps. They keep people in those, you know.'); say('d', 138, 'vell', 'Hold J. The line will take you — let go at the far side.'); say('e', 200, 'rin', 'Every reality I fell through is still back there. Running.'); say('f', 330, 'vell', 'The spire! One more line — hold J!');
    if (p.pos.z > 356 && p.pos.y > 24 && !this.fin) { this.fin = { t: 0, k: 0 }; this.noPause = true; g.sfx.play('fx.rise'); g.dialogue.clear(); g.dialogue.say([{ who: 'rin', text: 'The steel is... soft. I left a thumbprint in a skyscraper.' }, { who: 'vell', text: "Don't fight this one either. Somebody's hands are coming." }]); }
    this.shake = Math.max(0, this.shake - dt * 1.5);
  }

  render(dt) {
    if (!this.scene) return; const g = this.game, r = this.r, p = this.p, t = this.t; if (r.domElement.width !== g.W || r.domElement.height !== g.H) r.setSize(g.W, g.H, false);
    this.rin.position.copy(p.pos); let dy = p.yaw - this.rin.rotation.y; while (dy > Math.PI) dy -= 2 * Math.PI; while (dy < -Math.PI) dy += 2 * Math.PI; this.rin.rotation.y += dy * Math.min(1, dt * 12); this.rin.visible = !(p.inv > 0 && Math.floor(p.inv * 14) % 2);
    const vp = p.pos.clone().add(V(Math.sin(t) * 0.3 + 0.9, 2.1 + Math.sin(t * 2) * 0.12, 0.6)); this.vell.position.lerp(vp, Math.min(1, dt * 4)); this.vell.rotation.y = t * 0.8;
    animateRin(this.rin, { speed: p.speed, ground: !!p.ground, vy: p.vel.y, slide: p.slide > 0, climb: p.climb ? Math.min(1, p.climb.t) : 0, grapple: !!p.grap, strike: p.strike, hurt: p.inv > 0.6 ? 1 : 0, t, dt, lookAt: g.dialogue.current ? this.vell.position : null, talk: g.dialogue.current?.speaker.name === 'RIN' && !g.dialogue.current.done });
    if (p.grap) { const a = p.grap.p, h = p.pos.clone().add(V(0, 1.7, 0)), mid = a.clone().add(h).multiplyScalar(0.5), d = a.clone().sub(h); this.rope.visible = true; this.rope.position.copy(mid); this.rope.scale.y = d.length(); this.rope.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); } else this.rope.visible = false;
    this.cog.rotation.y = t * 0.45; for (const m of this.movers) m.m.position.x = m.s * (12 + Math.sin(t * 0.3 + m.z) * 2.5);
    // camera: over-the-shoulder follow, eases behind the direction of travel
    if (p.speed > 2 && !g.input.locked) { let d = p.yaw - (-this.cy); d = Math.atan2(Math.sin(p.yaw + this.cy), Math.cos(p.yaw + this.cy)); this.cy -= d * dt * 0.9; }
    const k = this.fin?.k || 0, dist = 5.4 + p.speed * 0.12 + k * 8, back = V(Math.sin(this.cy), 0, -Math.cos(this.cy)), want = p.pos.clone().add(back.multiplyScalar(dist)).add(V(0, 2.7 + k * 5, 0)); this.camPos.lerp(want, 1 - Math.exp(-7 * dt)); const sh = this.shake * (g.settings.shake ?? 1);
    this.cam.position.copy(this.camPos).add(V((Math.random() - 0.5) * sh * 0.3, (Math.random() - 0.5) * sh * 0.3, 0)); this.cam.lookAt(p.pos.x, p.pos.y + 1.5, p.pos.z); this.cam.fov = 58 + Math.min(10, p.speed * 0.9); this.cam.aspect = g.W / g.H; this.cam.updateProjectionMatrix();
    this.sun.position.set(p.pos.x - 25, p.pos.y + 34, p.pos.z - 14); this.sun.target.position.copy(p.pos);
    const rp = this.rainP; for (let i = 0; i < 1400; i++) { rp[i * 6 + 1] -= 34 * dt; rp[i * 6 + 4] -= 34 * dt; if (rp[i * 6 + 4] < -2) { rp[i * 6 + 1] = 38; rp[i * 6 + 4] = 37.1; } } this.rain.geometry.attributes.position.needsUpdate = true; this.rain.position.set(p.pos.x, p.pos.y - 6, p.pos.z);
    // HIGH DETAIL → CLAY: surfaces lose their gloss, pick up fingerprints and warm, matte colour
    if (k > 0) { const clay = new THREE.Color('#d9a27e'); for (const o of this.mats) { o.m.roughness = lerp(o.r, 1, k); o.m.metalness = lerp(o.me, 0, k); o.m.color.copy(o.c).lerp(clay, k * 0.75); if (k > 0.4 && o.m.bumpMap !== this.T.print) { o.m.bumpMap = this.T.print; o.m.bumpScale = 3; o.m.roughnessMap = null; o.m.needsUpdate = true; } if (o.m.emissiveIntensity) o.m.emissiveIntensity *= 1 - 0.02; } this.scene.environmentIntensity = 0.9 * (1 - k); this.rain.material.opacity = 0.35 * (1 - k); this.scene.fog.color.lerp(new THREE.Color('#e9c7a6'), 0.02); this.scene.background = this.scene.fog.color; const st = Math.floor(t * 10); for (const q of this.plats) { q.grp.scale.set(1 + Math.sin(st + q.base.z) * 0.012 * k, 1 + Math.cos(st * 1.3 + q.base.z) * 0.02 * k, 1); } }
    r.render(this.scene, this.cam);
    if (this.fin?.snap && !this.fin.done) { this.fin.done = true; g.freezeFrame(); const ok = g.director.handoff(8, { from7: true }); if (!ok) { g.clear2d(); g.save.complete(7); g.audio.muffle(0); g.director.end({ chapter: 7 }); } return; }
    const hud = `<div><kbd>♥</kbd>${'■'.repeat(Math.max(0, p.hp))}${'□'.repeat(5 - Math.max(0, p.hp))}</div>` + (this.sqOn && !this.fin ? `<div class="sel"><kbd>!</kbd>REFRAMER ${Math.round((this.squeeze || 0) * 100)}%</div>` : ''); if (hud !== this._hud) this.hud.innerHTML = this._hud = hud;
    let near = false; for (const a of this.anchors) if (a.p.distanceTo(p.pos) < 30 && a.p.z > p.pos.z - 4 && !p.grap) near = true; this.tip.style.display = near && !this.fin ? 'block' : 'none'; if (near) this.tip.innerHTML = '<kbd>J</kbd>HOLD — GRAPPLE';
    const d = g.dialogue.current; if (d) { this.dlg.style.display = 'block'; this.dlg.firstChild.textContent = d.speaker.name; this.dlg.firstChild.style.color = d.speaker.color; this.dlg.lastChild.textContent = g.dialogue.visibleText; } else this.dlg.style.display = 'none';
  }
  perfInfo() { const i = this.r.info.render; return `calls ${i.calls} · tris ${i.triangles}`; }
}
