// Papercraft material + model kit for Chapter 3. Real 3D sheets with
// thickness, fibre textures, corrugated cardboard edges, brass split pins and
// string — lit with soft shadow maps so every layer casts onto the next.
import * as THREE from 'three';
import { makeCanvas, rng } from '../core/util.js';

const texCache = {}, matCache = {};
function fibreCanvas(kind) {
  const c = makeCanvas(256, 256), x = c.getContext('2d'), r = rng(kind === 'card' ? 5 : 9);
  x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) { const g = 200 + r.int(0, 55); x.strokeStyle = `rgba(${g},${g},${g},${r.range(0.05, 0.25)})`; x.beginPath(); const px = r.range(0, 256), py = r.range(0, 256), a = r.range(0, 6.3), l = r.range(2, 12); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(90,70,50,${r.range(0.02, 0.09)})`; x.fillRect(r.range(0, 256), r.range(0, 256), r.range(1, 3), 1); }
  if (kind === 'card') { for (let px = 0; px < 256; px += 8) { const g = x.createLinearGradient(px, 0, px + 8, 0); g.addColorStop(0, 'rgba(60,40,20,0.28)'); g.addColorStop(0.5, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(60,40,20,0.28)'); x.fillStyle = g; x.fillRect(px, 0, 8, 256); } }
  return c;
}
function tex(kind) { if (!texCache[kind]) { const t = new THREE.CanvasTexture(fibreCanvas(kind)); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; texCache[kind] = t; } return texCache[kind]; }
export function paper(color, kind = 'paper') {
  const k = color + kind; if (!matCache[k]) { const t = tex(kind === 'card' ? 'card' : 'paper'); matCache[k] = new THREE.MeshStandardMaterial({ color, map: t, bumpMap: t, bumpScale: kind === 'card' ? 0.6 : 0.25, roughness: 0.94, metalness: 0, side: THREE.DoubleSide }); } return matCache[k];
}
export const brass = new THREE.MeshStandardMaterial({ color: '#d9a94a', roughness: 0.32, metalness: 0.9 });
export const wood = new THREE.MeshStandardMaterial({ color: '#8a5a3a', roughness: 0.7 });
export const stringMat = new THREE.MeshStandardMaterial({ color: '#efe6cf', roughness: 1 });

export function box(w, h, d, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; }
export function disc(r, d, mat, x = 0, y = 0, z = 0, seg = 28) { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d, seg), mat); m.rotation.x = Math.PI / 2; m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; }
export function pin(x, y, z, s = 0.07) { const m = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), brass); m.scale.z = 0.5; m.position.set(x, y, z); m.castShadow = true; return m; }
export function string(x, y0, y1, z) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, Math.abs(y1 - y0), 5), stringMat); m.position.set(x, (y0 + y1) / 2, z); return m; }
// extruded cut-out from a list of [x,y] points (a real sheet with cut edges)
export function cutout(pts, depth, mat, x = 0, y = 0, z = 0) {
  const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); const m = new THREE.Mesh(g, mat); m.position.set(x, y, z - depth / 2); m.castShadow = m.receiveShadow = true; return m;
}
// a cardboard block with a coloured paper top sheet that overhangs slightly
export function block(x0, x1, y0, y1, topColor = '#9fbf8f', depth = 2.4, z = 0) {
  const g = new THREE.Group(), w = x1 - x0, h = y1 - y0;
  const body = box(w, h, depth, paper('#b98d5e', 'card'), (x0 + x1) / 2, (y0 + y1) / 2, z); body.material.map.repeat?.set(1, 1); g.add(body);
  g.add(box(w + 0.12, 0.06, depth + 0.12, paper(topColor), (x0 + x1) / 2, y1 + 0.03, z));
  g.add(box(w, 0.1, 0.04, paper('#8d6a44', 'card'), (x0 + x1) / 2, y1 - 0.22, z + depth / 2 + 0.02)); // printed score line
  return g;
}
// dashed "fold here" line printed on a sheet
export function foldLine(len, vertical, x, y, z) { const g = new THREE.Group(); const n = Math.floor(len / 0.3); for (let i = 0; i < n; i += 2) { const m = box(vertical ? 0.04 : 0.18, vertical ? 0.18 : 0.04, 0.012, paper('#e2603a'), x + (vertical ? 0 : i * 0.3 + 0.1), y + (vertical ? i * 0.3 + 0.1 : 0), z); m.castShadow = false; g.add(m); } return g; }
export function arrowSign(x, y, z, flip = 1) { return cutout([[0, 0.12], [0.5 * flip, 0.12], [0.5 * flip, 0.28], [0.85 * flip, 0], [0.5 * flip, -0.28], [0.5 * flip, -0.12], [0, -0.12]], 0.03, paper('#e2603a'), x, y, z); }

// ---- RIN as a jointed paper puppet (cut-out limbs on brass split pins) ------------
export function buildRin() {
  const g = new THREE.Group(), P = {};
  const teal = paper('#2fd3c6'), navy = paper('#3f5196'), white = paper('#f7f3ea'), skin = paper('#ffd0a4'), orange = paper('#ff9a3c'), ink = paper('#1a1f3a');
  const limb = (mat, len, w, z) => { const piv = new THREE.Group(); const m = box(w, len, 0.035, mat, 0, -len / 2 + 0.06, 0); piv.add(m); piv.add(pin(0, 0, 0.03, 0.045)); piv.position.z = z; return piv; };
  P.legB = limb(navy, 0.62, 0.2, -0.05); P.legB.position.set(-0.1, 0.66, -0.05); P.legB.add(box(0.36, 0.16, 0.035, paper('#c9d1e6'), 0.08, -0.6, 0)); g.add(P.legB);
  P.armB = limb(paper('#168a96'), 0.5, 0.16, -0.08); P.armB.position.set(-0.08, 1.12, -0.08); P.armB.add(disc(0.09, 0.035, white, 0, -0.48, 0, 12)); g.add(P.armB);
  // scarf tail: two hinged strips that trail
  P.scarf = new THREE.Group(); P.scarf.position.set(-0.16, 1.2, -0.03); const s1 = box(0.42, 0.14, 0.03, orange, -0.2, 0, 0); P.scarf.add(s1); P.scarf2 = new THREE.Group(); P.scarf2.position.set(-0.4, 0, 0); P.scarf2.add(box(0.36, 0.11, 0.03, paper('#e8642a'), -0.17, 0, 0)); P.scarf.add(P.scarf2); g.add(P.scarf);
  P.torso = new THREE.Group(); P.torso.position.set(0, 0.66, 0);
  P.torso.add(cutout([[-0.24, 0], [0.24, 0], [0.28, 0.5], [0.2, 0.62], [-0.2, 0.62], [-0.28, 0.5]], 0.04, teal)); P.torso.add(box(0.03, 0.56, 0.012, ink, 0.05, 0.3, 0.03)); P.torso.add(box(0.5, 0.07, 0.014, ink, 0, 0.04, 0.03)); P.torso.add(box(0.62, 0.15, 0.045, orange, 0, 0.6, 0.012)); g.add(P.torso);
  P.legF = limb(navy, 0.62, 0.22, 0.05); P.legF.position.set(0.1, 0.66, 0.05); P.legF.add(box(0.38, 0.17, 0.035, white, 0.08, -0.6, 0)); g.add(P.legF);
  // head: skin disc, hair cut-out, goggle band, eye
  P.head = new THREE.Group(); P.head.position.set(0.02, 1.36, 0.04);
  P.head.add(cutout([[-0.42, 0.2], [-0.62, 0.42], [-0.36, 0.44], [-0.5, 0.72], [-0.2, 0.62], [-0.12, 0.86], [0.08, 0.66], [0.3, 0.8], [0.36, 0.5], [0.3, 0.3], [-0.3, 0.1]], 0.03, white, 0, 0, -0.02));
  P.head.add(disc(0.36, 0.04, skin, 0, 0.3, 0)); P.head.add(cutout([[-0.37, 0.36], [0.38, 0.4], [0.38, 0.52], [-0.37, 0.48]], 0.03, orange, 0, 0, 0.03)); P.head.add(disc(0.1, 0.03, paper('#ffd166'), 0.22, 0.45, 0.05, 14));
  P.head.add(cutout([[-0.36, 0.5], [-0.2, 0.68], [0.12, 0.7], [0.36, 0.54], [0.3, 0.44], [-0.3, 0.42]], 0.03, white, 0, 0, 0.045));
  P.eye = disc(0.055, 0.02, ink, 0.17, 0.27, 0.035, 10); P.head.add(P.eye); P.head.add(box(0.14, 0.025, 0.02, ink, 0.17, 0.12, 0.03)); P.head.add(pin(0, 0.02, 0.04, 0.04)); g.add(P.head);
  P.armF = limb(teal, 0.5, 0.17, 0.09); P.armF.position.set(0.06, 1.14, 0.09); P.armF.add(disc(0.1, 0.035, white, 0, -0.48, 0, 12)); g.add(P.armF);
  g.userData.P = P; return g;
}
export function poseRin(g, { walk = 0, speed = 0, air = 0, vy = 0, t = 0, pull = 0 }) {
  const P = g.userData.P, s = Math.min(1, Math.abs(speed) / 4), sw = Math.sin(walk) * 0.75 * s;
  if (air) { P.legF.rotation.z = 0.5 + vy * 0.02; P.legB.rotation.z = -0.35 - vy * 0.02; P.armF.rotation.z = -2.2 + vy * 0.03; P.armB.rotation.z = 2.0 - vy * 0.03; }
  else { P.legF.rotation.z = sw; P.legB.rotation.z = -sw; P.armF.rotation.z = -sw * 0.9 + (pull ? -1.5 : 0); P.armB.rotation.z = sw * 0.9; }
  P.torso.rotation.z = -0.08 * s; P.head.rotation.z = Math.sin(t * 1.6) * 0.04 - 0.05 * s; P.head.position.y = 1.36 + Math.abs(Math.cos(walk)) * 0.03 * s;
  P.scarf.rotation.z = -0.25 + Math.sin(t * 5) * 0.08 + s * 0.35 - vy * 0.03; P.scarf2.rotation.z = Math.sin(t * 5 + 1) * 0.25 + s * 0.2;
  P.eye.scale.y = Math.sin(t * 1.3) > 0.985 ? 0.15 : 1;
}
// ---- VELL as origami -----------------------------------------------------------
export function buildVell() {
  const g = new THREE.Group(), a = paper('#c06fc0'), b = paper('#8a52a8'), w = paper('#f7f3ea'), k = paper('#1a1f3a');
  const tri = (pts, mat, z, ry) => { const m = cutout(pts, 0.02, mat, 0, 0, z); m.rotation.y = ry; return m; };
  g.add(tri([[0, -0.35], [-0.42, 0.1], [0, 0.2]], a, 0, 0.35)); g.add(tri([[0, -0.35], [0.42, 0.1], [0, 0.2]], b, 0, -0.35));
  g.add(tri([[-0.4, 0.08], [-0.34, 0.52], [-0.1, 0.18]], b, -0.02, 0.3)); g.add(tri([[0.4, 0.08], [0.34, 0.52], [0.1, 0.18]], a, -0.02, -0.3));
  g.add(disc(0.11, 0.02, w, -0.17, 0.02, 0.1, 12)); g.add(disc(0.05, 0.02, k, -0.15, 0.02, 0.12, 8)); g.add(disc(0.06, 0.02, w, 0.16, 0.03, 0.1, 10)); g.add(disc(0.028, 0.02, k, 0.17, 0.03, 0.12, 8));
  const tail = cutout([[0, 0], [-0.5, -0.1], [-0.62, 0.3], [-0.4, 0.05]], 0.02, a, 0, -0.2, -0.08); g.add(tail); g.userData.tail = tail; return g;
}
