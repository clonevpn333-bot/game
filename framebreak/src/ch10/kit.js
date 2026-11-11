// Finale kit: shared sky, materials for each "format" as it appears inside one
// 3D world (voxel, paper, ink/toon with outlines, clay, neon), particles, HUD.
import * as THREE from 'three';
import { makeCanvas, rng } from '../core/util.js';

export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
export const el = (cls, html = '') => { const e = document.createElement('div'); e.className = cls; e.innerHTML = html; return e; };
const cache = {};
function tex(key, size, fn, nearest) { if (cache[key]) return cache[key]; const c = makeCanvas(size, size), x = c.getContext('2d'); fn(x, size); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; } else t.anisotropy = 8; return (cache[key] = t); }
const r0 = rng(21);
export const TEX = {
  ramp: () => { if (!cache.ramp) { const d = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 255, 255, 255, 255]); const t = new THREE.DataTexture(d, 3, 1); t.magFilter = t.minFilter = THREE.NearestFilter; t.needsUpdate = true; cache.ramp = t; } return cache.ramp; },
  voxwin: () => tex('voxwin', 32, (x) => { x.fillStyle = '#fff'; x.fillRect(0, 0, 32, 32); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { x.fillStyle = r0() < 0.4 ? '#ffe9a8' : '#5a6aa0'; x.fillRect(i * 8 + 2, j * 8 + 2, 4, 5); } }, true),
  road: () => tex('road', 512, (x, s) => { x.fillStyle = '#23262f'; x.fillRect(0, 0, s, s); for (let i = 0; i < 9000; i++) { const g = 26 + r0.int(0, 40); x.fillStyle = `rgb(${g},${g},${g + 6})`; x.fillRect(r0() * s, r0() * s, 2, 2); } x.fillStyle = '#f4f6ff'; x.fillRect(14, 0, 8, s); x.fillRect(s - 22, 0, 8, s); x.fillStyle = '#ffd166'; for (const lx of [0.25, 0.5, 0.75]) x.fillRect(s * lx - 4, 40, 8, 200); }),
  paper: () => tex('paper', 256, (x, s) => { x.fillStyle = '#fff'; x.fillRect(0, 0, s, s); for (let i = 0; i < 2400; i++) { const g = 205 + r0.int(0, 50); x.strokeStyle = `rgba(${g},${g},${g},0.3)`; x.beginPath(); const px = r0() * s, py = r0() * s, a = r0() * 6.3; x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 9, py + Math.sin(a) * 9); x.stroke(); } }),
  print: () => tex('print', 256, (x, s) => { x.fillStyle = '#808080'; x.fillRect(0, 0, s, s); for (let k = 0; k < 18; k++) { const cx = r0() * s, cy = r0() * s; for (let i = 3; i < 30; i += 3) { x.strokeStyle = `rgba(${i % 2 ? 50 : 200},${i % 2 ? 50 : 200},${i % 2 ? 50 : 200},0.4)`; x.beginPath(); x.ellipse(cx, cy, i * 0.75, i, 0.4, 0, 7); x.stroke(); } } }),
  dot: () => tex('dot', 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }),
  page: () => tex('page', 512, (x, s) => { x.fillStyle = '#f6edd6'; x.fillRect(0, 0, s, s); x.strokeStyle = '#17131f'; x.lineWidth = 8; for (const [a, b, c, d] of [[20, 20, 220, 300], [260, 20, 232, 140], [260, 180, 232, 140], [20, 340, 472, 150]]) { x.strokeRect(a, b, c, d); x.save(); x.beginPath(); x.rect(a, b, c, d); x.clip(); x.lineWidth = 2; for (let i = -d; i < c; i += 14) { x.beginPath(); x.moveTo(a + i, b + d); x.lineTo(a + i + d, b); x.stroke(); } x.restore(); x.lineWidth = 8; } }),
};
export const M = {
  toon: (c) => new THREE.MeshToonMaterial({ color: c, gradientMap: TEX.ramp() }),
  vox: (c, win) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true, map: win ? TEX.voxwin() : null, emissive: win ? '#ffd27a' : '#000', emissiveMap: win ? TEX.voxwin() : null, emissiveIntensity: win ? 0.9 : 0 }),
  paper: (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, map: TEX.paper(), bumpMap: TEX.paper(), bumpScale: 0.3, side: THREE.DoubleSide }),
  clay: (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.96, bumpMap: TEX.print(), bumpScale: 1.4 }),
  metal: (c, r = 0.35) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.85 }),
  paint: (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.3, metalness: 0.4, clearcoat: 1, clearcoatRoughness: 0.12 }),
  glow: (c, i = 3) => new THREE.MeshStandardMaterial({ color: '#111', emissive: c, emissiveIntensity: i, roughness: 0.4 }),
  ink: () => new THREE.MeshBasicMaterial({ color: '#17131f', side: THREE.BackSide }),
};
export function mesh(geo, mat, x = 0, y = 0, z = 0, parent) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent?.add(m); return m; }
export const box = (w, h, d, mat, x, y, z, parent) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
// inverted-hull outline: how "ink" objects stay drawn inside a lit 3D world
export function outline(m, t = 0.05) { const o = new THREE.Mesh(m.geometry, M.ink()); o.scale.setScalar(1 + t); m.add(o); return m; }

// Sky: gradient dome with stars, plus THE FRAMEWORK — vast nested frames turning overhead.
export function buildSky(scene) {
  const mat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { top: { value: new THREE.Color('#141a3a') }, mid: { value: new THREE.Color('#5e3a82') }, hor: { value: new THREE.Color('#ff9a6a') }, t: { value: 0 } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 top, mid, hor; uniform float t; float h(vec3 p){ return fract(sin(dot(floor(p), vec3(12.9, 78.2, 37.7))) * 43758.5); }
      void main(){ vec3 d = normalize(vP); float y = d.y; vec3 c = mix(hor, mid, smoothstep(-0.05, 0.3, y)); c = mix(c, top, smoothstep(0.25, 0.8, y)); float s = step(0.9975, h(d * 260.0)) * smoothstep(0.1, 0.5, y); c += s * (0.7 + 0.3 * sin(t * 3.0 + d.x * 90.0)); c += hor * 0.5 * exp(-abs(y) * 9.0); gl_FragColor = vec4(c, 1.0); }` });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 20), mat); dome.frustumCulled = false; scene.add(dome);
  const frames = new THREE.Group(); const fm = new THREE.MeshBasicMaterial({ color: '#f4f6ff', fog: false }), fo = new THREE.MeshBasicMaterial({ color: '#ff9a3c', fog: false });
  for (let i = 0; i < 4; i++) { const s = 260 - i * 52, g = new THREE.Group(); for (const [w, h, x, y] of [[s * 2, 7, 0, s], [s * 2, 7, 0, -s], [7, s * 2, s, 0], [7, s * 2, -s, 0]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 7), i % 2 ? fo : fm); b.position.set(x, y, 0); g.add(b); } g.rotation.z = i * 0.4; g.userData.sp = (i % 2 ? -1 : 1) * (0.05 + i * 0.02); frames.add(g); }
  frames.position.set(0, 380, -620); frames.rotation.x = -0.5; scene.add(frames);
  return { dome, mat, frames, update(t, pos) { mat.uniforms.t.value = t; dome.position.copy(pos); frames.children.forEach((g) => (g.rotation.z += g.userData.sp * 0.016)); }, set(top, mid, hor, k = 1) { mat.uniforms.top.value.lerp(new THREE.Color(top), k); mat.uniforms.mid.value.lerp(new THREE.Color(mid), k); mat.uniforms.hor.value.lerp(new THREE.Color(hor), k); } };
}

export class Particles {
  constructor(scene, n = 600, size = 1.2, additive = true) {
    this.n = n; this.i = 0; this.p = new Float32Array(n * 3).fill(-9999); this.c = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.life = new Float32Array(n); this.g = 0;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(this.p, 3)); geo.setAttribute('color', new THREE.BufferAttribute(this.c, 3));
    this.pts = new THREE.Points(geo, new THREE.PointsMaterial({ size, map: TEX.dot(), vertexColors: true, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true })); this.pts.frustumCulled = false; scene.add(this.pts);
  }
  emit(pos, vel, col, life = 1, spread = 1) { const i = this.i; this.i = (i + 1) % this.n; this.p[i * 3] = pos.x; this.p[i * 3 + 1] = pos.y; this.p[i * 3 + 2] = pos.z; this.v[i * 3] = vel.x + (Math.random() - 0.5) * spread; this.v[i * 3 + 1] = vel.y + (Math.random() - 0.5) * spread; this.v[i * 3 + 2] = vel.z + (Math.random() - 0.5) * spread; this.c[i * 3] = col.r; this.c[i * 3 + 1] = col.g; this.c[i * 3 + 2] = col.b; this.life[i] = life; }
  update(dt) { for (let i = 0; i < this.n; i++) { if (this.life[i] <= 0) continue; this.life[i] -= dt; if (this.life[i] <= 0) { this.p[i * 3 + 1] = -9999; continue; } this.v[i * 3 + 1] -= this.g * dt; this.p[i * 3] += this.v[i * 3] * dt; this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt; this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt; if (this.life[i] < 0.3) { this.c[i * 3] *= 0.93; this.c[i * 3 + 1] *= 0.93; this.c[i * 3 + 2] *= 0.93; } } this.pts.geometry.attributes.position.needsUpdate = true; this.pts.geometry.attributes.color.needsUpdate = true; }
}

// 3D Vell: a faceted gem with mismatched eyes and a ribbon tail.
export function buildVell() {
  const g = new THREE.Group(); mesh(new THREE.IcosahedronGeometry(0.3, 1), new THREE.MeshPhysicalMaterial({ color: '#c06fc0', roughness: 0.15, metalness: 0.3, clearcoat: 1, emissive: '#6a2a8a', emissiveIntensity: 0.8, flatShading: true }), 0, 0, 0, g);
  for (const [x, s] of [[-0.1, 0.11], [0.13, 0.055]]) { mesh(new THREE.SphereGeometry(s, 12, 10), new THREE.MeshBasicMaterial({ color: '#fff' }), x, 0.04, 0.25, g); mesh(new THREE.SphereGeometry(s * 0.45, 8, 8), new THREE.MeshBasicMaterial({ color: '#17131f' }), x, 0.04, 0.25 + s * 0.75, g); }
  for (const s of [-1, 1]) { const ear = mesh(new THREE.ConeGeometry(0.09, 0.22, 4), M.glow('#c06fc0', 1.5), s * 0.17, 0.3, 0, g); ear.rotation.z = -s * 0.4; }
  g.userData.tail = []; let p = g; for (let i = 0; i < 6; i++) { const s = new THREE.Group(); s.position.set(0, 0, i ? -0.2 : -0.25); p.add(s); mesh(new THREE.BoxGeometry(0.1 - i * 0.012, 0.02, 0.2), M.glow('#f09bd0', 2), 0, 0, -0.1, s); g.userData.tail.push(s); p = s; }
  g.userData.tick = (t) => g.userData.tail.forEach((s, i) => { s.rotation.x = Math.sin(t * 5 - i * 0.8) * 0.25; s.rotation.y = Math.sin(t * 3.3 - i * 0.6) * 0.3; });
  return g;
}

export function buildHud(game) {
  const ui = el('hud3'), dlg = el('dlg dark', '<div class="who"></div><div class="txt"></div>'), banner = el('banner'), obj = el(''), meters = el('mach'), big = el('');
  dlg.style.top = 'auto'; dlg.style.bottom = '9%';
  obj.style.cssText = 'position:absolute;left:50%;top:4%;transform:translateX(-50%);padding:.5em 1.2em;background:rgba(13,15,31,.72);color:#fff;font:800 calc(var(--u)*13)/1.3 Trebuchet MS,sans-serif;letter-spacing:.16em;text-transform:uppercase;border-bottom:calc(var(--u)*3) solid #ff9a3c;white-space:nowrap';
  big.style.cssText = 'position:absolute;right:3%;bottom:5%;text-align:right;color:#fff;font:900 calc(var(--u)*54)/1 Impact,Arial Black,sans-serif;letter-spacing:.04em;text-shadow:0 calc(var(--u)*3) 0 #0d0f1f';
  ui.append(dlg, banner, obj, meters, big); game.ui.appendChild(ui);
  let last = '';
  return { ui, banner, big, set(objective, rows) { const h = objective + '|' + rows.join('|'); if (h === last) return; last = h; obj.textContent = objective; obj.style.display = objective ? 'block' : 'none'; meters.innerHTML = rows.map((r) => `<div class="${r.startsWith('!') ? 'sel' : ''}">${r.replace(/^!/, '')}</div>`).join(''); },
    title(small, text) { banner.innerHTML = `<small>${small}</small>${text}`; banner.style.opacity = '1'; setTimeout(() => (banner.style.opacity = '0'), 3200); },
    tick() { const d = game.dialogue.current; if (d) { dlg.style.display = 'block'; dlg.firstChild.textContent = d.speaker.name; dlg.firstChild.style.color = d.speaker.color; dlg.lastChild.textContent = game.dialogue.visibleText; } else dlg.style.display = 'none'; },
    remove() { ui.remove(); } };
}
export const bar = (label, k, n = 14) => `<kbd>${label}</kbd>${'█'.repeat(Math.round(Math.max(0, Math.min(1, k)) * n))}${'░'.repeat(n - Math.round(Math.max(0, Math.min(1, k)) * n))}`;
