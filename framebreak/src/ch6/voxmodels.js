// Voxel-art models for Chapter 6. Characters and props are authored as small
// 3D voxel grids (a rule per cell → colour), meshed with hidden-face removal
// and baked per-face shading, then rigged from separate parts on pivots.
import * as THREE from 'three';
import { makeCanvas, rng, hash2 } from '../core/util.js';
import { pbr } from '../fx/tex.js';

const F = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const Q = [[[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]]];
const LIGHT = [0.82, 0.7, 1, 0.5, 0.92, 0.62];
let vmat;
// fn(x,y,z) → '#rrggbb' | null. Origin: centred on x/z, y = 0 at the bottom (or pivotTop → y = 0 at the top).
export function voxMesh(w, h, d, s, fn, pivotTop = false) {
  const g = new Array(w * h * d), at = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= w || y >= h || z >= d ? null : g[x + w * (z + d * y)]);
  for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) g[x + w * (z + d * y)] = fn(x, y, z) || null;
  const pos = [], col = [], nor = [], c = new THREE.Color(), oy = pivotTop ? -h : 0;
  for (let y = 0; y < h; y++) for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) { const m = at(x, y, z); if (!m) continue; c.set(m); const n = 0.94 + hash2(x * 3 + y * 7, z * 5 + y) * 0.12;
    for (let f = 0; f < 6; f++) { if (at(x + F[f][0], y + F[f][1], z + F[f][2])) continue; const l = LIGHT[f] * n; for (const i of [0, 1, 2, 0, 2, 3]) { const q = Q[f][i]; pos.push((x + q[0] - w / 2) * s, (y + q[1] + oy) * s, (z + q[2] - d / 2) * s); col.push(c.r * l, c.g * l, c.b * l); nor.push(F[f][0], F[f][1], F[f][2]); } } }
  const ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ge.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); ge.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  vmat ||= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }); const m = new THREE.Mesh(ge, vmat); m.castShadow = true; return m;
}

// 16px pixel-art tiles for each block material (index = material id − 1).
export function voxAtlas() {
  const c = makeCanvas(128, 16), x = c.getContext('2d'), r = rng(9), px = (t, i, j, col) => { x.fillStyle = col; x.fillRect(t * 16 + i, j, 1, 1); }, fill = (t, col) => { x.fillStyle = col; x.fillRect(t * 16, 0, 16, 16); };
  fill(0, '#8f949f'); for (let i = 0; i < 70; i++) px(0, r.int(0, 15), r.int(0, 15), r.pick(['#7c818c', '#a2a7b2', '#878c97'])); for (let i = 0; i < 16; i++) { px(0, i, 15, '#6b707a'); px(0, 15, i, '#6b707a'); px(0, i, 0, '#a9aeb9'); }
  fill(1, '#5a3a34'); for (let j = 0; j < 4; j++) for (let i = -1; i < 2; i++) { const bx = i * 8 + (j % 2) * 4, col = r.pick(['#b85c48', '#a84f3e', '#c46a52', '#9c4638']); for (let a = 0; a < 7; a++) for (let b = 0; b < 3; b++) if (bx + a >= 0 && bx + a < 16) px(1, bx + a, j * 4 + b, b === 0 ? '#d07a60' : col); }
  fill(2, '#4d5c80'); for (let i = 0; i < 16; i++) { px(2, i, 0, '#7f8fb5'); px(2, 0, i, '#7f8fb5'); px(2, i, 15, '#2f3a58'); px(2, 15, i, '#2f3a58'); px(2, i, 8, '#3a4666'); } for (const [a, b] of [[2, 2], [13, 2], [2, 13], [13, 13], [2, 6], [13, 10]]) { px(2, a, b, '#c9d1e6'); px(2, a, b + 1, '#2f3a58'); } for (let i = 4; i < 12; i++) if ((i >> 1) % 2) { px(2, i, 11, '#ffd166'); px(2, i, 12, '#ffd166'); }
  fill(3, '#9e6b3d'); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) if ((i % 4 === 3)) px(3, i, j, '#6f4526'); else if (hash2(i, j >> 2) > 0.7) px(3, i, j, '#b58049'); for (const [a, b] of [[1, 3], [9, 11], [5, 7]]) { px(3, a, b, '#6f4526'); px(3, a + 1, b, '#6f4526'); }
  fill(4, '#8cd9e6'); for (let i = 0; i < 16; i++) { px(4, i, 0, '#3a4666'); px(4, 0, i, '#3a4666'); px(4, i, 15, '#3a4666'); px(4, 15, i, '#3a4666'); } for (let i = 2; i < 9; i++) { px(4, i, 11 - i + 2, '#dff7ff'); px(4, i + 3, 13 - i + 2, '#b9eef7'); }
  x.drawImage(c, 0, 0, 16, 16, 80, 0, 16, 16); x.fillStyle = 'rgba(40,40,48,0.35)'; x.fillRect(80, 0, 16, 16); for (const [a, b, e, f] of [[2, 1, 7, 8], [7, 8, 5, 14], [7, 8, 13, 6], [11, 0, 13, 6]]) { let i = a, j = b; while (i !== e || j !== f) { px(5, i, j, '#23262e'); if (i !== e) i += Math.sign(e - i); if (j !== f) j += Math.sign(f - j); } }
  fill(6, '#f2b85c'); for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) if (j % 4 === 3) px(6, i, j, '#b07a2e'); else if (hash2(i >> 2, j) > 0.75) px(6, i, j, '#ffd591'); for (const [a, b] of [[1, 1], [14, 1], [1, 9], [14, 9]]) px(6, a, b, '#7a5320');
  const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; return t;
}

// RIN, voxel form: separate head / torso / limbs on pivots so he can animate.
export function buildVoxRin() {
  const s = 0.075, G = new THREE.Group(), W = '#f4f6ff', SK = '#ffd0a4', T = '#2fd3c6', TD = '#178a86', O = '#ff9a3c', N = '#3f5196', K = '#1a1f3a';
  const piv = (x, y, z, parent = G) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  const legs = [-1, 1].map((sd) => { const p = piv(sd * 0.115, 0.53, 0); p.add(voxMesh(3, 7, 3, s, (x, y, z) => (y <= 1 ? (y === 0 && z === 2 ? '#c9d1e6' : W) : y === 2 ? K : (x === 1 && z === 2 && y === 4 ? '#52609a' : N)), true)); return p; });
  const body = piv(0, 0.53, 0); body.add(voxMesh(6, 7, 4, s, (x, y, z) => (y === 0 ? (z === 3 && x >= 2 && x <= 3 ? '#ffd166' : '#4a3528') : y === 6 ? O : z === 3 && (x === 2 || x === 3) ? (x === 3 ? '#c9d1e6' : TD) : z === 3 && y === 3 && (x === 0 || x === 5) ? TD : z === 0 && y >= 2 && y <= 5 && x >= 1 && x <= 4 ? '#6a4a34' : T)));
  const arms = [-1, 1].map((sd) => { const p = piv(sd * 0.3, 1.02, 0); p.add(voxMesh(2, 7, 2, s, (x, y) => (y <= 1 ? SK : y === 2 ? TD : T), true)); return p; });
  const head = piv(0, 1.06, 0); head.add(voxMesh(8, 10, 8, s, (x, y, z) => { if (y >= 8) return (y === 8 && ((x + z) % 3 !== 1) && z < 7 && x > 0 && x < 7) || (y === 9 && (x === 2 || x === 5) && (z === 2 || z === 4)) ? W : null; if (y >= 6) return W; if (z <= 1 && y >= 2) return W; if ((x === 0 || x === 7) && y >= 4 && z < 6) return W; if (y === 5) return z === 7 && (x === 2 || x === 5) ? '#ffd166' : O; if (z === 7) { if (y === 3 && (x === 2 || x === 5)) return K; if (y === 4 && (x === 2 || x === 5)) return W; if (y === 1 && (x === 3 || x === 4)) return '#b0655a'; } return SK; }));
  const sc1 = piv(-0.05, 0.98, -0.16); sc1.add(voxMesh(2, 1, 4, s, () => O)); sc1.children[0].position.z = -0.15; const sc2 = piv(0, 0, -0.3, sc1); sc2.add(voxMesh(2, 1, 4, s, (x, y, z) => (z < 1 ? '#e8642a' : O))); sc2.children[0].position.z = -0.15;
  G.userData.tick = (t, p) => { const mv = Math.hypot(p.vx, p.vz); head.rotation.y = Math.sin(t * 0.8) * 0.12; head.position.y = 1.06 + (mv > 1 && p.ground ? Math.abs(Math.sin(p.walk)) * 0.03 : Math.sin(t * 2) * 0.008); body.rotation.x = mv > 1 ? 0.12 : 0; head.rotation.x = p.swing * 0.3; sc1.rotation.x = -0.2 - Math.min(0.9, mv * 0.1) + Math.sin(t * 7) * 0.12; sc2.rotation.x = Math.sin(t * 7 - 1) * 0.3 - Math.min(0.5, mv * 0.05); if (!p.ground) { legs[0].rotation.x = 0.5; legs[1].rotation.x = -0.4; arms[0].rotation.x = -2.4; if (p.swing <= 0) arms[1].rotation.x = -2.2; } arms[0].rotation.z = -0.08; arms[1].rotation.z = 0.08; };
  return { group: G, legs, arms };
}
export function buildVoxVell() { const m = voxMesh(6, 8, 6, 0.1, (x, y, z) => { if (y >= 6) return (y === 6 && x === 3 && z === 3) || (y === 7 && x === 4 && z === 3) ? (y === 7 ? '#ffd166' : '#8a52a8') : null; if (x >= 4 && y <= 1 && z >= 4) return null; if (z === 5) { if (x >= 1 && x <= 2 && y >= 2 && y <= 4) return x === 2 && y === 3 ? '#1a1f3a' : '#ffffff'; if (x === 4 && y === 3) return '#ffffff'; } return y >= 4 ? '#c06fc0' : y <= 0 ? '#5e3a82' : '#8a52a8'; }); m.geometry.translate(0, -0.3, 0); return m; }
export function buildVoxTurret() { const G = new THREE.Group(); G.add(voxMesh(8, 3, 8, 0.2, (x, y, z) => (y === 2 && (x + z) % 2 ? '#ffd166' : '#3a4666'))); const head = voxMesh(6, 5, 6, 0.2, (x, y, z) => (x === 0 && y >= 1 && y <= 3 && z >= 1 && z <= 4 ? (y === 2 && z >= 2 && z <= 3 ? '#ffffff' : '#c2362f') : y === 4 ? '#7f8fb5' : '#52609a')); head.position.y = 0.6; G.add(head); const bar = voxMesh(5, 2, 2, 0.2, (x) => (x === 0 ? '#c2362f' : '#2b3040')); bar.position.set(-1.0, 1.0, 0); G.add(bar); return G; }

// THE LEVELER: an armoured demolition rig with toothed grinding drums, a
// lit cab, exhaust stacks and floodlights.
export function buildLeveler(SZ) {
  const L = new THREE.Group(), P = pbr('metal'), hull = new THREE.MeshStandardMaterial({ color: '#3a4152', map: P.map, normalMap: P.normalMap, roughnessMap: P.roughnessMap, roughness: 0.7, metalness: 0.7 }), dark = new THREE.MeshStandardMaterial({ color: '#1c2029', roughness: 0.6, metalness: 0.6, normalMap: P.normalMap }), haz = new THREE.MeshStandardMaterial({ color: '#e0a92e', roughness: 0.5, metalness: 0.3 }), red = new THREE.MeshStandardMaterial({ color: '#c2362f', roughness: 0.45, metalness: 0.5, normalMap: P.normalMap });
  const add = (geo, m, x, y, z, par = L) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; par.add(o); return o; }, W = SZ + 4, cz = SZ / 2;
  hull.map.repeat?.set(1, 1); add(new THREE.BoxGeometry(11, 20, W), hull, -8, 14, cz); add(new THREE.BoxGeometry(7, 6, W - 6), dark, -8.5, 27, cz); add(new THREE.BoxGeometry(12.5, 3, W + 1), dark, -8, 3, cz);
  for (let z = 1; z < W; z += 4) add(new THREE.BoxGeometry(0.4, 18, 0.5), dark, -2.45, 14, z - 2);                       // armour ribs
  for (let i = 0; i < 7; i++) add(new THREE.BoxGeometry(0.3, 1.2, 2.2), haz, -2.4, 24.6, 2 + i * 4);                        // hazard teeth
  add(new THREE.BoxGeometry(0.3, 2.6, W - 10), new THREE.MeshStandardMaterial({ color: '#111', emissive: '#ffcf8a', emissiveIntensity: 2.2 }), -4.9, 27.5, cz); // cab windows
  for (const z of [4, SZ - 4]) { add(new THREE.CylinderGeometry(0.9, 1.1, 9, 10), dark, -11, 32, z); add(new THREE.CylinderGeometry(1.2, 0.9, 1, 10), haz, -11, 36.6, z); const fl = add(new THREE.BoxGeometry(0.6, 1.6, 2.6), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#fff3c4', emissiveIntensity: 5 }), -2.2, 21.5, z); void fl; add(new THREE.BoxGeometry(0.5, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ff3c2c', emissiveIntensity: 5 }), -2.2, 25.8, z); }
  for (const z of [-1.2, SZ + 1.2]) for (let i = 0; i < 4; i++) { const w = add(new THREE.CylinderGeometry(2.1, 2.1, 1.6, 14), dark, -12 + i * 3.4, 2.1, z); w.rotation.x = Math.PI / 2; }                       // road wheels
  const drums = []; for (let y = 2.4; y < 24; y += 4.9) { const d = add(new THREE.CylinderGeometry(2.2, 2.2, SZ + 2, 12), y % 9.8 < 4.9 ? red : hull, -1.4, y, cz); d.rotation.x = Math.PI / 2; const teeth = new THREE.InstancedMesh(new THREE.ConeGeometry(0.42, 1.3, 4), haz, 8 * 13), dm = new THREE.Object3D(); let k = 0; for (let i = 0; i < 13; i++) for (let a = 0; a < 8; a++) { const an = (a / 8) * Math.PI * 2 + i * 0.4; dm.position.set(Math.cos(an) * 2.7, -SZ / 2 + i * 2, Math.sin(an) * 2.7); dm.rotation.set(0, -an, -Math.PI / 2); dm.updateMatrix(); teeth.setMatrixAt(k++, dm.matrix); } teeth.castShadow = true; d.add(teeth); drums.push(d); for (const z of [-1.5, SZ + 1.5]) add(new THREE.BoxGeometry(3.4, 1.2, 1), dark, -3.4, y, z); }
  for (const z of [5, SZ - 5]) { const sp = new THREE.SpotLight('#fff0d0', 120, 70, 0.45, 0.7, 1.6); sp.position.set(-2, 21.5, z); sp.target.position.set(40, 0, z); L.add(sp, sp.target); }
  return { group: L, drums };
}
