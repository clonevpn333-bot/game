// GETAWAY! — real crash damage to buildings. When a car slams into a building, the wall itself is crushed in:
// the hit area of the facade is cut out (shader discard) and replaced by a deformed, subdivided patch of the same
// wall (same material, same texture mapping) pushed into the building in the actual shape of the car that hit it —
// measured from the car's own mesh (bumper deepest, grille/lights/hood shallower), depth from impact speed.
import * as THREE from 'three';
import { G } from '../core/context.js';
import { DENT_A, DENT_B, MAX_DENTS } from '../world/interior.js';

const GX = 26, GY = 16; // patch resolution
const _v = new THREE.Vector3();
export class Dents {
  constructor(scene) { this.scene = scene; this.list = []; this.slot = 0; this.last = new Map(); }
  // box: static collision box of a facade (box.fac = {mat, tw, th, base}); n: unit normal out of the wall (axis aligned)
  crash(v, box, n, imp) {
    if (!box || !box.fac || imp < 8 || !v) return false; const fac = box.fac; const mat = G.world.mats[fac.mat]; if (!mat) return false;
    const ax = Math.abs(n.x) > 0.5; const wall = ax ? (n.x > 0 ? box.maxX : box.minX) : (n.z > 0 ? box.maxZ : box.minZ);
    // tangent along the wall (matches the facade's u direction), and the car's surface measured against the wall plane
    const T = ax ? new THREE.Vector3(0, 0, n.x > 0 ? -1 : 1) : new THREE.Vector3(n.z > 0 ? 1 : -1, 0, 0);
    const key = `${box.id}:${Math.round((ax ? v.pos.z : v.pos.x) / 2)}`; if (G.time - (this.last.get(key) || -9) < 1) return true; this.last.set(key, G.time);
    const pts = []; v.root.updateMatrixWorld(true);
    v.root.traverse((o) => { if (!o.isMesh || !o.visible || !o.geometry || o.isInstancedMesh) return; const pa = o.geometry.attributes.position; if (!pa) return; const st = Math.max(1, Math.floor(pa.count / 1500));
      for (let i = 0; i < pa.count; i += st) { _v.fromBufferAttribute(pa, i).applyMatrix4(o.matrixWorld); const d = (ax ? _v.x - wall : _v.z - wall) * (ax ? Math.sign(n.x) : Math.sign(n.z)); if (d < -0.5 || d > 2.2) continue; pts.push([_v.x * T.x + _v.z * T.z, _v.y, d]); } });
    if (pts.length < 20) return false;
    let dmin = 1e9, t0 = 1e9, t1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of pts) dmin = Math.min(dmin, p[2]);
    const front = pts.filter((p) => p[2] < dmin + 1.1); for (const p of front) { t0 = Math.min(t0, p[0]); t1 = Math.max(t1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const M = 0.45; t0 -= M; t1 += M; y0 = Math.max(box.minY + 0.25, y0 - M * 0.6); y1 += M; // a margin of crushed wall around the car's outline
    // keep the patch on this wall face
    const ta = ax ? [box.minZ, box.maxZ].map((z) => z * T.z) : [box.minX, box.maxX].map((x) => x * T.x); const tmin = Math.min(...ta) + 0.05, tmax = Math.max(...ta) - 0.05; t0 = Math.max(t0, tmin); t1 = Math.min(t1, tmax); y1 = Math.min(y1, box.maxY - 0.2); if (t1 - t0 < 0.6 || y1 - y0 < 0.4) return false;
    // depth profile from the car's shape: closest parts of the car crush deepest
    const prof = new Float32Array(GX * GY).fill(-1);
    for (const p of front) { const i = Math.floor((p[0] - t0) / (t1 - t0) * GX), j = Math.floor((p[1] - y0) / (y1 - y0) * GY); if (i < 0 || j < 0 || i >= GX || j >= GY) continue; const k = 1 - Math.min(1, (p[2] - dmin) / 1.1); const c = j * GX + i; if (k > prof[c]) prof[c] = k; }
    const sm = new Float32Array(GX * GY); for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) { let s = 0, w = 0; for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= GX || jj >= GY) continue; const q = prof[jj * GX + ii]; s += Math.max(0, q); w++; } sm[j * GX + i] = s / w; }
    const D = Math.min(1.1, Math.max(0.18, (imp - 5) * 0.055)); // how far the wall gets pushed in
    // build the patch: same facade material, UVs from the facade's own world mapping, vertices pushed into the building
    const geo = new THREE.PlaneGeometry(1, 1, GX, GY); const pa = geo.attributes.position, uv = geo.attributes.uv;
    const sgn = ax ? Math.sign(n.x) : Math.sign(n.z);
    for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
      const idx = j * (GX + 1) + i; const t = t0 + (t1 - t0) * i / GX, y = y0 + (y1 - y0) * j / GY;
      const ci = Math.min(GX - 1, i), cj = Math.min(GY - 1, j); const rim = Math.min(1, Math.min(i, GX - i, j, GY - j) / 3); // walls of the crater slope up to the surface
      const crumple = 0.85 + 0.3 * Math.abs(Math.sin(i * 1.7 + j * 2.3) * Math.cos(i * 0.9 - j * 1.3));
      const depth = (i === 0 || j === 0 || i === GX || j === GY) ? 0.004 : D * sm[cj * GX + ci] * rim * crumple + 0.03 * rim; // border tucked 4 mm behind the wall; the hole is inset so the wall hides it
      const x = ax ? wall - sgn * depth : t * T.x, z = ax ? t * T.z : wall - sgn * depth; pa.setXYZ(idx, x, y, z);
      const u = ax ? (n.x > 0 ? -z : z) / fac.tw : (n.z > 0 ? x : -x) / fac.tw; uv.setXY(idx, u, (y - fac.base) / fac.th);
    }
    geo.computeVertexNormals(); const nn = geo.attributes.normal; let dot = 0; for (const i of [0, GX, (GY + 1) * (GX + 1) - 1]) dot += nn.getX(i) * n.x + nn.getZ(i) * n.z;
    if (dot < 0) { const ix = geo.index.array; for (let k = 0; k < ix.length; k += 3) { const tmp = ix[k]; ix[k] = ix[k + 2]; ix[k + 2] = tmp; } geo.computeVertexNormals(); } // make it face out of the wall
    geo.computeBoundingSphere();
    if (!this.crushed) this.crushed = new Map(); let cm = this.crushed.get(mat); if (!cm) { cm = mat.clone(); cm.color.multiplyScalar(0.72); cm.roughness = 1; this.crushed.set(mat, cm); } // dusty crushed masonry (same shader program)
    const mesh = new THREE.Mesh(geo, cm); mesh.receiveShadow = true; this.scene.add(mesh);
    // cut the matching hole out of the wall
    const s = this.slot; this.slot = (this.slot + 1) % MAX_DENTS; const old = this.list[s]; if (old) { this.scene.remove(old.mesh); old.mesh.geometry.dispose(); }
    const tc = (t0 + t1) / 2, yc = (y0 + y1) / 2; const cx = ax ? wall : tc * T.x, cz = ax ? tc * T.z : wall;
    DENT_A[s].set(cx, yc, cz, (t1 - t0) / 2 - 0.04); DENT_B[s].set(ax ? sgn : 0, ax ? 0 : sgn, (y1 - y0) / 2 - 0.04, 1);
    this.list[s] = { mesh };
    // the impact itself: chunks out of the rim, dust, a thump through the building
    const c = new THREE.Vector3(cx, yc, cz).addScaledVector(n, 0.2); if (G.fx) { G.fx.debris(c, 26, 0x8f8a80, 6, 0.14); G.fx.dust(c, 20, 3, 0.7); } if (G.decals) G.decals.chunks(c, n, imp * 1.4);
    if (G.audio) G.audio.impact(c, Math.min(1.6, imp / 14), 'concrete'); return true;
  }
  clear() { for (const d of this.list) if (d) { this.scene.remove(d.mesh); d.mesh.geometry.dispose(); } this.list = []; for (let i = 0; i < MAX_DENTS; i++) DENT_B[i].w = 0; }
}
