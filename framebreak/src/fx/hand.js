// A jointed hand: palm, four fingers (three phalanges each), a thumb and a
// forearm. Palm is about 1 unit wide and faces +z; fingers point up (+y).
import * as THREE from 'three';
export function buildHand(mat, { left = false } = {}) {
  const g = new THREE.Group(), s = left ? -1 : 1, fingers = [], th = [], tips = [];
  const cap = (r, l) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 12), mat); m.position.y = l / 2 + r * 0.4; m.castShadow = true; return m; };
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.5, 22, 16), mat); palm.scale.set(1, 1.14, 0.36); palm.position.y = 0.5; palm.castShadow = true; g.add(palm);
  const heel = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), mat); heel.scale.set(1.2, 1, 0.5); heel.position.set(-s * 0.2, 0.2, 0.06); g.add(heel);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 5, 16), mat); arm.position.y = -2.5; arm.scale.z = 0.72; arm.castShadow = true; g.add(arm);
  [[-0.33, 0.5, 0.11], [-0.11, 0.6, 0.12], [0.11, 0.56, 0.115], [0.32, 0.43, 0.1]].forEach(([x, len, r]) => { let p = g; const js = [], L = [0.46, 0.32, 0.26].map((q) => q * len); for (let k = 0; k < 3; k++) { const j = new THREE.Group(); j.position.set(k ? 0 : s * x, k ? L[k - 1] + r * 0.8 : 0.98, 0); j.add(cap(r * (1 - k * 0.1), L[k])); p.add(j); js.push(j); p = j; } const tip = new THREE.Group(); tip.position.y = L[2] + r * 0.9; p.add(tip); tips.push(tip); fingers.push(js); });
  { let p = g; [[0.34, 0.14], [0.28, 0.12]].forEach(([l, r], k) => { const j = new THREE.Group(); if (!k) { j.position.set(-s * 0.46, 0.34, 0.08); j.rotation.z = s * 0.95; } else j.position.y = 0.34 + 0.11; j.add(cap(r, l)); p.add(j); th.push(j); p = j; }); }
  g.userData.curl = (c) => fingers.forEach((js, i) => { const k = Array.isArray(c) ? c[i] : c; js.forEach((j, n) => (j.rotation.x = k * [1.1, 1.35, 1.0][n])); });
  g.userData.thumb = (c) => { th[0].rotation.x = c * 0.7; th[1].rotation.x = c * 0.9; th[0].rotation.z = s * (0.95 - c * 0.45); };
  const FX = [-0.33, -0.11, 0.11, 0.32]; g.userData.splay = (a) => fingers.forEach((js, i) => (js[0].rotation.z = -s * FX[i] * 1.3 * a));
  g.userData.tips = tips; g.userData.fingers = fingers;
  return g;
}
