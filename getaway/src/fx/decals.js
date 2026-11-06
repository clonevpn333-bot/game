// GETAWAY! — persistent world damage: crash craters with radiating cracks, bullet holes, explosion scorch marks,
// with concrete chunks + dust. Fixed instanced pools created at boot (no shader compiles mid-game), ring buffers.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { rand } from '../core/utils.js';

function tex(draw, size = 256) { const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d'); draw(g, size); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
function crackTex() {
  return tex((g, S) => {
    const C = S / 2; // crater: dark broken core, lighter chipped ring, branching cracks
    let gr = g.createRadialGradient(C, C, 0, C, C, S * 0.3); gr.addColorStop(0, 'rgba(20,18,16,0.95)'); gr.addColorStop(0.45, 'rgba(45,42,38,0.9)'); gr.addColorStop(0.75, 'rgba(120,115,105,0.55)'); gr.addColorStop(1, 'rgba(120,115,105,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 26; i++) { const a = Math.random() * 6.283, r0 = S * 0.05 + Math.random() * S * 0.12; g.fillStyle = `rgba(${15 + Math.random() * 30},${14 + Math.random() * 28},${12 + Math.random() * 25},0.9)`; g.beginPath(); const x = C + Math.cos(a) * r0, y = C + Math.sin(a) * r0; g.moveTo(x, y); for (let k = 0; k < 5; k++) { const aa = a + (k / 5) * 6.283; g.lineTo(x + Math.cos(aa) * rand(4, 14), y + Math.sin(aa) * rand(4, 14)); } g.fill(); }
    g.strokeStyle = 'rgba(20,18,16,0.85)'; g.lineCap = 'round';
    const crack = (x, y, a, len, w, depth) => { if (depth > 3 || len < 6) return; let px = x, py = y; g.lineWidth = w; g.beginPath(); g.moveTo(px, py); const n = 6; for (let k = 0; k < n; k++) { a += rand(-0.45, 0.45); px += Math.cos(a) * len / n; py += Math.sin(a) * len / n; g.lineTo(px, py); if (Math.random() < 0.3) { g.stroke(); crack(px, py, a + rand(-1, 1), len * 0.5, w * 0.6, depth + 1); g.beginPath(); g.moveTo(px, py); g.lineWidth = w; } } g.stroke(); };
    for (let i = 0; i < 9; i++) crack(C, C, i / 9 * 6.283 + rand(-0.2, 0.2), S * rand(0.3, 0.48), rand(2, 3.5), 0);
  });
}
function dentTex() {
  return tex((g, S) => {
    const W = S, H = S; g.clearRect(0, 0, S, S); const x0 = W * 0.08, y0 = H * 0.12, x1 = W * 0.92, y1 = H * 0.92, R = H * 0.22;
    const rr = (a, b, c, d, r) => { g.beginPath(); g.moveTo(a + r, b); g.lineTo(c - r, b); g.quadraticCurveTo(c, b, c, b + r); g.lineTo(c, d); g.lineTo(a, d); g.lineTo(a, b + r); g.quadraticCurveTo(a, b, a + r, b); g.closePath(); };
    // pressed-in panel: darker in the middle, a lit lip along the top edge, crushed seams across it
    let gr = g.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, 'rgba(25,23,20,0.55)'); gr.addColorStop(0.35, 'rgba(45,42,38,0.75)'); gr.addColorStop(1, 'rgba(20,18,16,0.85)'); rr(x0, y0, x1, y1, R); g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(200,195,185,0.45)'; g.lineWidth = 3; rr(x0, y0, x1, y1, R); g.stroke(); g.strokeStyle = 'rgba(12,11,10,0.8)'; g.lineWidth = 2; rr(x0 + 4, y0 + 4, x1 - 4, y1 - 2, R * 0.8); g.stroke();
    g.strokeStyle = 'rgba(15,14,12,0.6)'; g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const y = y0 + (y1 - y0) * (0.2 + i * 0.13); g.beginPath(); g.moveTo(x0 + 6, y); for (let x = x0 + 6; x < x1 - 6; x += 14) g.lineTo(x, y + rand(-3, 3)); g.stroke(); }
    // headlight/grille pocks
    g.fillStyle = 'rgba(8,8,8,0.7)'; for (const fx of [0.2, 0.8]) { g.beginPath(); g.ellipse(W * fx, H * 0.5, W * 0.07, H * 0.12, 0, 0, 6.3); g.fill(); } g.fillRect(W * 0.38, H * 0.42, W * 0.24, H * 0.18);
    // cracks running out from the corners
    g.strokeStyle = 'rgba(20,18,16,0.85)'; g.lineCap = 'round';
    const crack = (x, y, a, len, w, d) => { if (d > 3 || len < 5) return; let px = x, py = y; g.lineWidth = w; g.beginPath(); g.moveTo(px, py); for (let k = 0; k < 5; k++) { a += rand(-0.5, 0.5); px += Math.cos(a) * len / 5; py += Math.sin(a) * len / 5; g.lineTo(px, py); if (Math.random() < 0.3) { g.stroke(); crack(px, py, a + rand(-1, 1), len * 0.5, w * 0.6, d + 1); g.beginPath(); g.moveTo(px, py); } } g.stroke(); };
    for (const [cx, cy, a] of [[x0, y0, -2.4], [x1, y0, -0.7], [x0, y1, 2.5], [x1, y1, 0.6], [W / 2, y0, -1.57]]) crack(cx, cy, a, W * rand(0.06, 0.12), 2, 0);
  });
}
function holeTex() { return tex((g, S) => { const C = S / 2; let gr = g.createRadialGradient(C, C, 0, C, C, C); gr.addColorStop(0, 'rgba(8,8,8,1)'); gr.addColorStop(0.18, 'rgba(15,14,13,0.95)'); gr.addColorStop(0.3, 'rgba(90,85,78,0.7)'); gr.addColorStop(0.55, 'rgba(60,57,52,0.35)'); gr.addColorStop(1, 'rgba(60,57,52,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); g.strokeStyle = 'rgba(15,14,13,0.7)'; g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { const a = Math.random() * 6.283; g.beginPath(); g.moveTo(C + Math.cos(a) * S * 0.08, C + Math.sin(a) * S * 0.08); g.lineTo(C + Math.cos(a) * S * rand(0.25, 0.42), C + Math.sin(a) * S * rand(0.25, 0.42)); g.stroke(); } }, 64); }
function scorchTex() { return tex((g, S) => { const C = S / 2; for (let i = 0; i < 40; i++) { const r = S * rand(0.08, 0.32), x = C + rand(-1, 1) * S * 0.16, y = C + rand(-1, 1) * S * 0.16; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(8,7,6,0.22)'); gr.addColorStop(1, 'rgba(8,7,6,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); } let gr = g.createRadialGradient(C, C, 0, C, C, S * 0.22); gr.addColorStop(0, 'rgba(5,5,5,0.8)'); gr.addColorStop(1, 'rgba(5,5,5,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); }); }

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), Z = new THREE.Vector3(0, 0, 1);
class Pool {
  constructor(scene, map, max) {
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: 0.95, metalness: 0, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }), max);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 2; this.max = max; this.i = 0; this.n = 0; this.mesh.receiveShadow = true;
    _m.makeTranslation(0, -500, 0); this.mesh.setMatrixAt(0, _m); this.mesh.count = 1; scene.add(this.mesh); // count 1 so it is compiled at warm-up
  }
  add(pos, normal, size, sy = 0, spin = true) {
    _q.setFromUnitVectors(Z, normal); _q2.setFromAxisAngle(Z, spin ? Math.random() * 6.283 : 0); _q.multiply(_q2);
    _m.compose(_p.copy(pos).addScaledVector(normal, 0.015), _q, _s.set(size, sy || size, 1)); this.mesh.setMatrixAt(this.i, _m);
    this.i = (this.i + 1) % this.max; this.n = Math.min(this.max, this.n + 1); this.mesh.count = Math.max(1, this.n); this.mesh.instanceMatrix.needsUpdate = true;
  }
}
export class Decals {
  constructor(scene) { this.crack = new Pool(scene, crackTex(), 220); this.hole = new Pool(scene, holeTex(), 500); this.scorch = new Pool(scene, scorchTex(), 120); this.dent = new Pool(scene, dentTex(), 90); this.lastCrack = new Map(); }
  // vehicle slammed into a static box: crater on the wall face + chunks + dust
  crash(box, x, y, z, nx, nz, imp, v = null) {
    if (!box || box.glass || imp < 7) return; const ax = Math.abs(nx) > Math.abs(nz);
    if (v && imp > 9 && box.maxY - box.minY > 1.5 && !box.fac) { // (facades get real crushed geometry from fx/dents.js instead) // the car's own outline pressed into the wall: width (head-on) or length (side-on) x body height
      const fx = ax ? (nx > 0 ? box.maxX : box.minX) : v.pos.x, fz = ax ? v.pos.z : (nz > 0 ? box.maxZ : box.minZ); const n = new THREE.Vector3(ax ? Math.sign(nx) : 0, 0, ax ? 0 : Math.sign(nz));
      const key = `dent${box.id}:${Math.round(fx / 2)}:${Math.round(fz / 2)}`; if (G.time - (this.lastCrack.get(key) || -9) > 1.2) { this.lastCrack.set(key, G.time);
        const head = Math.abs(Math.sin(v.yaw) * n.x + Math.cos(v.yaw) * n.z) > 0.6; const w = (head ? v.spec.W : v.spec.L * 0.9) * (1 + Math.min(0.3, imp / 80)); const h = Math.min(1.5, v.spec.H * 0.75) * (1 + Math.min(0.25, imp / 90));
        const p = new THREE.Vector3(fx, Math.max(box.minY, v.pos.y) + h * 0.5 + 0.12, fz); this.dent.add(p, n, w, h, false); this.chunks(p, n, imp * 1.3);
        if (G.fx) G.fx.debris(p.clone().addScaledVector(n, 0.3), Math.min(20, imp), 0x8f8a80, 5, 0.12); } }
    const fx = ax ? (nx > 0 ? box.maxX : box.minX) : x, fz = ax ? z : (nz > 0 ? box.maxZ : box.minZ); const n = new THREE.Vector3(ax ? Math.sign(nx) : 0, 0, ax ? 0 : Math.sign(nz));
    const key = `${box.id}:${Math.round(fx)}:${Math.round(fz)}`; const now = G.time; if (now - (this.lastCrack.get(key) || -9) < 0.6) return; this.lastCrack.set(key, now);
    const size = Math.min(4.2, 1 + imp * 0.12); const p = new THREE.Vector3(fx, Math.max(box.minY + 0.3, Math.min(box.maxY - 0.2, y + rand(-0.2, 0.3))), fz);
    this.crack.add(p, n, size); this.chunks(p, n, imp);
  }
  chunks(p, n, imp) {
    const fx = G.fx; if (!fx) return; const k = Math.min(1, imp / 25);
    fx.debris(p, Math.round(8 + 16 * k), 0x8f8a80, 3 + 4 * k, 0.06 + 0.07 * k); fx.debris(p, Math.round(4 + 8 * k), 0x5e5a54, 2 + 3 * k, 0.04);
    fx.dust(p.clone().addScaledVector(n, 0.4), Math.round(5 + 10 * k), 1.5 + 2 * k, 0.7);
    if (G.audio && imp > 12) G.audio.impact(p.clone(), Math.min(1.4, imp / 18), 'concrete');
  }
  bullet(p, n, mat) { if (mat === 'glass' && Math.abs(n.y) < 0.5) { this.crack.add(p, n, rand(0.45, 0.85)); if (G.fx) G.fx.glass(p, 10, n, 3); if (G.audio && Math.random() < 0.5) G.audio.glass(p, 0.35); return; } // shot glass facades star and shed shards
    if (mat === 'glass' || mat === 'water' || (mat === 'ground' && n.y > 0.9 && Math.random() < 0.6)) return; this.hole.add(p, n, rand(0.12, 0.2)); if (Math.random() < 0.35 && G.fx) G.fx.debris(p, 2, 0x8f8a80, 2, 0.04); }
  explosion(p, size) {
    const S = G.world.static; const R = 7 * size;
    const g = S.groundAt(p.x, p.z, p.y + 1, 0).h; if (p.y - g < 3) this.scorch.add(new THREE.Vector3(p.x, g + 0.02, p.z), new THREE.Vector3(0, 1, 0), 6 * size);
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; const d = new THREE.Vector3(Math.cos(a), rand(-0.15, 0.25), Math.sin(a)).normalize(); const h = S.raycast(p.x, p.y + 0.5, p.z, d.x, d.y, d.z, R, { noGround: true }); if (!h || (h.box && h.box.glass)) continue; const n = new THREE.Vector3(h.nx, h.ny, h.nz); const hp = new THREE.Vector3(h.x, h.y, h.z); const k = 1 - h.t / R; this.scorch.add(hp, n, (3 + 4 * k) * size); if (k > 0.4) { this.crack.add(hp, n, (1.5 + 2 * k) * size); this.chunks(hp, n, 25 * k * size); } }
  }
}
