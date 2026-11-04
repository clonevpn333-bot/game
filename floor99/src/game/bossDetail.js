// Extra modelling detail for the bosses (Foreman, Megamouth, Bruiser): bevelled plates, collars,
// hydraulic sleeves, bolts, a proper shark hull and fins, plus a little idle motion.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/three/addons/geometries/RoundedBoxGeometry.js';
import { detailedSurface } from '../engine/textures.js';
import { BUILD } from '../build.js';

function detailedBox(parent, size, pos, material, radius = 0.08) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(...size, BUILD.fast ? 1 : 2, Math.min(radius, ...size.map((v) => v * 0.45))), material);
  m.position.set(...pos); parent.add(m); return m;
}
export function addBolts(parent, positions, material, radius = 0.07) {
  const g = new THREE.CylinderGeometry(radius, radius, radius * 0.55, 8); g.rotateX(Math.PI / 2);
  const mesh = new THREE.InstancedMesh(g, material, positions.length), mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  positions.forEach((p, i) => { mtx.compose(new THREE.Vector3(...p), q, one); mesh.setMatrixAt(i, mtx); });
  mesh.instanceMatrix.needsUpdate = true; parent.add(mesh); return mesh;
}
function surface(material, kind, n) {
  const maps = detailedSurface(kind);
  material.map = maps.map; material.normalMap = maps.normalMap; material.roughnessMap = maps.roughnessMap; material.normalScale = new THREE.Vector2(n, n);
  material.needsUpdate = true;
}

export function enhanceForeman(boss) {
  const m = boss.M;
  for (const mat of [m.paint, m.dark, m.steel]) surface(mat, mat === m.steel ? 'metal' : 'paint', 0.2);
  boss.root.traverse((mesh) => {
    if (mesh.geometry?.type === 'BoxGeometry') {
      const p = mesh.geometry.parameters; mesh.geometry.dispose();
      mesh.geometry = new RoundedBoxGeometry(p.width, p.height, p.depth, BUILD.fast ? 1 : 2, Math.min(0.1, p.width * 0.2, p.height * 0.2, p.depth * 0.2));
    }
  });
  for (const arm of Object.values(boss.arms)) {
    for (const y of [-0.45, 0.2]) { const collar = new THREE.Mesh(new THREE.TorusGeometry(0.84, 0.065, 6, BUILD.fast ? 16 : 28), m.steel); collar.rotation.y = Math.PI / 2; collar.position.set(0, y, 0); arm.sh.add(collar); }
    for (const x of [-0.58, 0.58]) {
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 2.1, 10), m.dark); sleeve.position.set(x, -2, 0.38); arm.sh.add(sleeve);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 2.8, 10), m.steel); rod.position.set(x, -2.1, 0.38); arm.sh.add(rod);
    }
    addBolts(arm.sh, [[-0.35, -0.9, 0.58], [0.35, -0.9, 0.58], [-0.35, -3.9, 0.58], [0.35, -3.9, 0.58]], m.steel, 0.09);
  }
  for (const y of [2.1, 4.9]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.09, 6, BUILD.fast ? 20 : 36), m.steel); ring.rotation.x = Math.PI / 2; ring.position.y = y; boss.body.add(ring); }
  const count = BUILD.fast ? 4 : 8;
  for (let i = 0; i < count; i++) { const a = i / count * Math.PI * 2; const plate = detailedBox(boss.body, [0.2, 2.05, 0.16], [Math.sin(a) * 2.47, 3.5, Math.cos(a) * 2.47], m.dark, 0.045); plate.rotation.y = a; }
  for (let i = 0; i < (BUILD.fast ? 4 : 7); i++) detailedBox(boss.body, [1.5, 0.12, 0.18], [0, 2.8 + i * 0.23, -2.36], m.dark, 0.03);
  const lens = new THREE.Mesh(new THREE.TorusGeometry(0.91, 0.1, 8, 32), m.steel); lens.position.z = 0.77; boss.eyeG.add(lens);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.035, 6, 32), m.weak); inner.position.z = 1.02; boss.eyeG.add(inner); boss.detailLens = inner;
  addBolts(boss.trolley, [[-2, 0.2, 2.03], [2, 0.2, 2.03], [-2, -0.2, 2.03], [2, -0.2, 2.03]], m.steel, 0.13);
}

export function enhanceBruiser(boss) {
  for (const arm of boss.arms) { const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.65, 8), boss.M.steel); sleeve.position.set(0.23, -0.38, 0.16); arm.sh.add(sleeve); }
  addBolts(boss.body, [[-0.6, 0.78, 0.58], [0.6, 0.78, 0.58], [-0.6, -0.13, 0.58], [0.6, -0.13, 0.58]], boss.M.steel, 0.045);
  const guard = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.045, 6, 24), boss.M.steel); guard.position.set(0, 0.35, -0.64); boss.body.add(guard);
}

export function triangularPrism(points, thickness = 0.12) {
  const p = [], index = [];
  for (const x of [-thickness / 2, thickness / 2]) for (const [y, z] of points) p.push(x, y, z);
  index.push(0, 2, 1, 3, 4, 5);
  for (let i = 0; i < 3; i++) { const j = (i + 1) % 3; index.push(i, j, i + 3, j, j + 3, i + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setIndex(index); g.computeVertexNormals();
  return g;
}
function sharkHull() {
  const profile = [[-4.6, 0.22, 0.3], [-3.7, 0.6, 0.62], [-2.3, 1.15, 1.12], [-0.4, 1.55, 1.48], [1.4, 1.46, 1.28], [2.9, 1.06, 0.93], [3.9, 0.65, 0.64], [4.6, 0.1, 0.16]];
  const segs = BUILD.fast ? 20 : 36, pos = [], uv = [], idx = [];
  for (let r = 0; r < profile.length; r++) for (let j = 0; j <= segs; j++) { const a = j / segs * Math.PI * 2, [z, w, h] = profile[r]; pos.push(Math.cos(a) * w, Math.sin(a) * h, z); uv.push(j / segs, r / (profile.length - 1)); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  for (let r = 0; r < profile.length - 1; r++) for (let j = 0; j < segs; j++) {
    const a = r * (segs + 1) + j, b = a + 1, c = a + segs + 1, d = c + 1, start = idx.length;
    idx.push(a, b, c, b, d, c);
    g.addGroup(start, 6, Math.sin((j + 0.5) / segs * Math.PI * 2) < -0.3 ? 1 : 0); // belly material underneath
  }
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
export function enhanceShark(boss) {
  const body = boss.body.children[0];
  body.geometry.dispose(); body.geometry = sharkHull(); body.scale.set(1, 1, 1); body.material = [boss.M.paint, boss.M.belly];
  boss.body.children[1].visible = false;
  for (const mat of [boss.M.paint, boss.M.belly]) { surface(mat, 'metal', 0.18); mat.metalness = 0.35; mat.roughness = 0.42; }
  const jaw = boss.jaw.children[0]; jaw.geometry.dispose(); jaw.geometry = new THREE.SphereGeometry(1, BUILD.fast ? 18 : 28, 14); jaw.scale.set(1.09, 0.28, 1.2); jaw.position.z = 0.4;
  boss.fin.geometry.dispose(); boss.fin.geometry = triangularPrism([[0, 0.5], [2.25, -0.65], [0, -1.75]], 0.16); boss.fin.scale.set(1, 1, 1); boss.fin.rotation.x = 0; boss.fin.position.set(0, 1.05, 0.1);
  boss.flippers = [];
  for (const mesh of boss.body.children.slice()) {
    const p = mesh.geometry?.parameters;
    if (p?.width === 2.2 && p?.height === 0.12) {
      const sign = Math.sign(mesh.position.x);
      mesh.geometry.dispose(); mesh.geometry = triangularPrism([[0, 0], [0, -1.4], [2.4, -1.7]], 0.12);
      mesh.rotation.set(0, 0, -sign * Math.PI / 2); mesh.position.set(sign * 0.9, -0.65, 1.1); boss.flippers.push(mesh);
    }
  }
  if (boss.tail.children[1]) boss.tail.children[1].visible = false;
  boss.tailLobes = [];
  for (const sign of [-1, 1]) { const fin = new THREE.Mesh(triangularPrism([[0, -1.25], [sign * (sign > 0 ? 2.2 : 1.65), -2.3], [sign * 0.35, -3.05]], 0.14), boss.M.paint); boss.tail.add(fin); boss.tailLobes.push(fin); }
  boss.M.eye.emissiveIntensity = 2;
  for (const eye of boss.eyes) { const socket = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.065, 6, 20), boss.M.dark); socket.position.copy(eye.position); socket.rotation.y = Math.sign(eye.position.x) * 0.5; boss.body.add(socket); }
  addBolts(boss.body, [[-1.18, 0.45, 2.65], [1.18, 0.45, 2.65], [-1.45, 0.2, 0.5], [1.45, 0.2, 0.5]], boss.M.steel, 0.055);
}

export function updateBossDetail(boss, dt) {
  if (boss.type === 'foreman' && boss.detailLens) { boss.detailLens.rotation.z += dt * 0.5; boss.eyeG.rotation.y = Math.sin(boss.game.time * 0.8) * 0.035; }
  if (boss.type === 'shark') {
    const target = boss.jaw.rotation.x;
    boss.jawAngle = (boss.jawAngle ?? target) + (target - (boss.jawAngle ?? target)) * (1 - Math.exp(-12 * dt));
    boss.jaw.rotation.x = boss.jawAngle;
    for (let i = 0; i < (boss.flippers?.length || 0); i++) boss.flippers[i].rotation.x = Math.sin(boss.game.time * 2.2 + i * 0.3) * 0.09;
    for (const fin of boss.tailLobes || []) fin.rotation.y = Math.sin(boss.game.time * 6 - 0.45) * 0.16;
  }
}
