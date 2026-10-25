// Reusable set-dressing kit + a pooled point-light system.
import * as THREE from 'three';
import { rng, catenary } from '../core/util.js';

// --------------------------------------------------------------------------- light pool
// Authored light "spots" are many; real PointLights are few and reassigned to the nearest spots.
export class LightPool {
  constructor(game, n = 8) {
    this.game = game; this.spots = []; this.lights = [];
    for (let i = 0; i < n; i++) { const l = new THREE.PointLight(0xffffff, 0, 10, 2); game.engine.cityRoot.add(l); this.lights.push(l); }
    this.t = 0;
  }
  add(pos, color = 0xffc880, intensity = 6, distance = 12, flicker = 0) { const s = { pos: new THREE.Vector3(...pos), color: new THREE.Color(color), intensity, distance, flicker, on: true }; this.spots.push(s); return s; }
  update(dt) {
    this.t += dt;
    const c = this.game.engine.camera.position;
    const p = this.game.player.pos;
    const ranked = this.spots.filter(s => s.on).map(s => ({ s, d: Math.min(s.pos.distanceToSquared(c), s.pos.distanceToSquared(p) * 1.2) - s.distance * s.distance * 0.5 })).sort((a, b) => a.d - b.d);
    this.lights.forEach((l, i) => {
      const r = ranked[i];
      if (!r) { l.intensity = 0; return; }
      const s = r.s;
      l.position.copy(s.pos); l.color.copy(s.color); l.distance = s.distance;
      let k = s.intensity * 24;
      if (s.flicker) k *= 1 - s.flicker * (Math.random() < 0.08 ? Math.random() : 0) + Math.sin(this.t * 13 + s.pos.x) * s.flicker * 0.05;
      // fade lights near the edge of the active set to avoid popping
      const fade = i >= this.lights.length - 2 ? 0.5 : 1;
      l.intensity = k * fade * (this.game.lightMul ?? 1); // lightMul: whole-city brownouts (the Shearer feeding, blackouts)
    });
  }
}

// --------------------------------------------------------------------------- kit
export function crate(b, p, s = 1.2, o = {}) {
  b.box(o.mat || 'wood', [p[0], p[1] + s / 2, p[2]], [s, s, s], { ry: o.ry || 0, color: o.color ?? 0xb8a080, tex: 1.2, round: 0.035, ...o.opts });
  b.box('darkSteel', [p[0], p[1] + s / 2, p[2]], [s + 0.04, 0.08, s + 0.04], { ry: o.ry || 0, color: 0x3a3a3a, collide: false, ao: false });
}
export function barrel(b, p, o = {}) {
  b.cyl(o.mat || 'rust', [p[0], p[1] + 0.6, p[2]], 0.4, 1.2, { color: o.color ?? 0x7a5a40, seg: 14, collide: true });
  b.cyl('darkSteel', [p[0], p[1] + 0.9, p[2]], 0.41, 0.06, { color: 0x333333, seg: 14 });
  b.cyl('darkSteel', [p[0], p[1] + 0.3, p[2]], 0.41, 0.06, { color: 0x333333, seg: 14 });
}
export function lamp(b, lights, p, o = {}) { // hanging industrial lamp
  const col = o.color ?? 0xffc070;
  b.tube('cable', [p[0], p[1] + (o.drop ?? 1.2), p[2]], [p[0], p[1] + 0.25, p[2]], 0.015);
  b.cyl('darkSteel', [p[0], p[1] + 0.12, p[2]], 0.12, 0.25, { r2: 0.05, color: 0x2a2a2a, seg: 10, open: true });
  b.sphere(o.cool ? 'lampCool' : 'lampWarm', [p[0], p[1] - 0.02, p[2]], 0.08, { seg: 8 });
  if (lights && o.light !== false) lights.add([p[0], p[1] - 0.3, p[2]], col, o.intensity ?? 5, o.distance ?? 10, o.flicker ?? 0);
}
export function lantern(b, p, color = 'lampWarm') { b.sphere(color, p, 0.16, { seg: 8, sy: 1.3 }); }
export function stringLights(b, a, c, sag = 0.8, n = 10, mat = 'lampWarm') {
  const pts = catenary(new THREE.Vector3(...a), new THREE.Vector3(...c), sag, n);
  b.path('cable', pts, 0.012, { segs: n * 2 });
  pts.forEach((pt, i) => { if (i > 0 && i < pts.length - 1) b.sphere(i % 3 === 0 ? 'neonPink' : mat, [pt.x, pt.y - 0.12, pt.z], 0.07, { seg: 6 }); });
}
export function cable(b, a, c, sag = 1, r = 0.03) { b.path('cable', catenary(new THREE.Vector3(...a), new THREE.Vector3(...c), sag, 14), r); }
export function planter(b, p, w = 2, d = 0.8, o = {}) {
  b.box('wood', [p[0], p[1] + 0.35, p[2]], [w, 0.7, d], { color: 0x8a6a4a, ry: o.ry || 0 });
  b.box('matte', [p[0], p[1] + 0.68, p[2]], [w - 0.1, 0.06, d - 0.1], { color: 0x3a2a1a, ry: o.ry || 0, collide: false });
  const r = rng(Math.floor(p[0] * 13 + p[2] * 7));
  const n = Math.round(w * 3);
  for (let i = 0; i < n; i++) {
    const c = Math.cos(o.ry || 0), s = Math.sin(o.ry || 0);
    const lx = (r() - 0.5) * (w - 0.3), lz = (r() - 0.5) * (d - 0.3);
    const x = p[0] + lx * c + lz * s, z = p[2] - lx * s + lz * c, h = 0.3 + r() * 0.6;
    b.plane('leaf', [x, p[1] + 0.7 + h / 2, z], 0.7, h, { ry: r() * Math.PI, color: o.flowers && r() < 0.3 ? 0xd88a7a : 0xffffff, tex: 0.7 });
    b.plane('leaf', [x, p[1] + 0.7 + h / 2, z], 0.7, h, { ry: r() * Math.PI + 1.57, color: 0xffffff, tex: 0.7 });
  }
}
export function bench(b, p, ry = 0) {
  const c = Math.cos(ry), s = Math.sin(ry);
  b.box('wood', [p[0], p[1] + 0.45, p[2]], [1.8, 0.08, 0.45], { ry, color: 0x9a7a5a, tex: 1, round: 0.03 });
  b.box('wood', [p[0] - s * 0.2, p[1] + 0.75, p[2] - c * 0.2], [1.8, 0.4, 0.06], { ry, color: 0x9a7a5a, tex: 1, collide: false });
  for (const k of [-0.75, 0.75]) b.box('darkSteel', [p[0] + c * k, p[1] + 0.22, p[2] - s * k], [0.08, 0.44, 0.4], { ry, color: 0x2a2a2a, collide: false });
}
export function table(b, p, o = {}) {
  const w = o.w ?? 1.0, d = o.d ?? 0.8, h = o.h ?? 0.76;
  b.box(o.mat || 'wood', [p[0], p[1] + h, p[2]], [w, 0.05, d], { ry: o.ry || 0, color: o.color ?? 0x9a7a5a, tex: 1 });
  b.box('darkSteel', [p[0], p[1] + h / 2, p[2]], [0.08, h, 0.08], { color: 0x2a2a2a, collide: false });
  b.box('darkSteel', [p[0], p[1] + 0.02, p[2]], [0.5, 0.04, 0.5], { color: 0x2a2a2a, collide: false });
  b.solid([p[0], p[1] + h / 2, p[2]], [w, h, d], { ry: o.ry || 0 });
}
export function stool(b, p, h = 0.65) {
  b.cyl('darkSteel', [p[0], p[1] + h / 2, p[2]], 0.04, h, { color: 0x2a2a2a, seg: 6 });
  b.cyl('rubber', [p[0], p[1] + h, p[2]], 0.18, 0.06, { color: 0x6a2a22, seg: 12 });
}
export function chair(b, p, ry = 0, color = 0x6a4a3a) {
  const c = Math.cos(ry), s = Math.sin(ry);
  b.box('wood', [p[0], p[1] + 0.45, p[2]], [0.45, 0.05, 0.45], { ry, color, tex: 1, collide: false });
  b.box('wood', [p[0] - s * 0.21, p[1] + 0.72, p[2] - c * 0.21], [0.45, 0.5, 0.04], { ry, color, tex: 1, collide: false });
  for (const [dx, dz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) b.box('darkSteel', [p[0] + dx * c + dz * s, p[1] + 0.22, p[2] - dx * s + dz * c], [0.04, 0.44, 0.04], { color: 0x2a2a2a, collide: false });
}
export function awning(b, p, w, d, ry = 0, color = 0xc85a3a, stripes = true) {
  b.box('fabric', [p[0], p[1], p[2]], [w, 0.04, d], { ry, rx: 0.18, color, collide: false, tex: 1 });
}
export function sign(game, parent, text, p, o = {}) {
  const M = game.materials;
  const w = o.w ?? 3, h = o.h ?? 0.8;
  const mat = o.neon === false ? M.board(text, { color: o.color || '#e8e0d0', bg: o.bg || '#2a2a2e', font: o.font || '700 56px "Barlow Condensed", sans-serif', w: o.tw || 512, h: o.th || 128 })
    : M.sign(text, o.color || '#ff5a8a', { font: o.font || '700 70px "Barlow Condensed", sans-serif', intensity: o.intensity ?? 2.6, w: o.tw || 512, h: o.th || 128, sub: o.sub });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(...p); m.rotation.y = o.ry || 0; m.renderOrder = 2;
  parent.add(m);
  if (o.flicker) m.userData.flicker = true;
  return m;
}
export function poster(game, parent, lines, p, o = {}) {
  const M = game.materials;
  const c = document.createElement('canvas'); c.width = 256; c.height = 360; const x = c.getContext('2d');
  x.fillStyle = o.bg || '#d8cbb0'; x.fillRect(0, 0, 256, 360);
  for (let i = 0; i < 1600; i++) { x.fillStyle = `rgba(80,60,40,${Math.random() * 0.06})`; x.fillRect(Math.random() * 256, Math.random() * 360, 2, 2); }
  x.fillStyle = o.accent || '#a8322a'; x.fillRect(0, 0, 256, 70);
  x.fillStyle = '#f2ead8'; x.font = '700 30px "Barlow Condensed", sans-serif'; x.textAlign = 'center'; x.fillText(o.title || '', 128, 46);
  x.fillStyle = o.ink || '#2a2622'; x.font = '600 24px "Barlow Condensed", sans-serif';
  lines.forEach((l, i) => x.fillText(l, 128, 110 + i * 32));
  if (o.icon === 'city') { x.fillStyle = o.accent || '#a8322a'; x.fillRect(78, 240, 100, 40); for (const lx of [88, 110, 146, 168]) x.fillRect(lx - 4, 280, 8, 50); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(o.w ?? 0.7, (o.w ?? 0.7) * 1.4), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
  m.position.set(...p); m.rotation.y = o.ry || 0; m.rotation.z = o.rz || 0; parent.add(m);
  return m;
}
export function laundry(b, a, c, n = 6, seed = 1) {
  const pts = catenary(new THREE.Vector3(...a), new THREE.Vector3(...c), 0.4, n + 1);
  b.path('cable', pts, 0.01, { segs: 12 });
  const r = rng(seed); const cols = [0xe8e0d0, 0x5a7a9a, 0xc85a3a, 0xd8c070, 0x7a9a6a, 0xf0f0f0, 0x9a5a8a];
  const dir = new THREE.Vector3(...c).sub(new THREE.Vector3(...a)); const ry = Math.atan2(dir.x, dir.z) + Math.PI / 2;
  for (let i = 1; i < pts.length - 1; i++) { const h = 0.4 + r() * 0.5; b.plane('fabric', [pts[i].x, pts[i].y - h / 2, pts[i].z], 0.5 + r() * 0.3, h, { ry, color: cols[Math.floor(r() * cols.length)], tex: 1 }); }
}
export function pipeRun(b, pts, r = 0.15, color = 0x7a7a72, mat = 'steel') {
  for (let i = 0; i < pts.length - 1; i++) { b.tube(mat, pts[i], pts[i + 1], r, { color, seg: 10 }); b.sphere(mat, pts[i + 1], r * 1.15, { color, seg: 8 }); }
}
export function vent(b, p, ry = 0, s = 1) {
  b.box('darkSteel', p, [1.2 * s, 0.8 * s, 0.3 * s], { ry, color: 0x3a3a3a });
  for (let i = 0; i < 4; i++) b.box('steel', [p[0], p[1] - 0.3 * s + i * 0.2 * s, p[2]], [1.1 * s, 0.04, 0.34 * s], { ry, color: 0x6a6a6a, collide: false });
}
export function console_(b, p, ry = 0, screens = 1) {
  b.box('darkSteel', [p[0], p[1] + 0.5, p[2]], [1.4, 1.0, 0.7], { ry, color: 0x3a3e44 });
  b.box('paint', [p[0], p[1] + 1.02, p[2]], [1.42, 0.05, 0.72], { ry, color: 0x2a2c30, rx: -0.2, collide: false });
}
export function screen(game, parent, p, ry, w, h, draw) {
  const c = document.createElement('canvas'); c.width = 256; c.height = Math.round(256 * h / w); const x = c.getContext('2d');
  draw(x, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(1.5, 1.5, 1.5) }));
  m.position.set(...p); m.rotation.y = ry; parent.add(m); m.userData.canvas = c; m.userData.draw = draw;
  return m;
}
