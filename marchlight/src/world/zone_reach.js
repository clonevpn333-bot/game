// CHAPTER TWO — CALLOW REACH, Grid Forty-One. A ground settlement that is very much alive: block houses
// around a square, a school, gardens, a greenhouse, goats, a flywheel generator and a water tower, washing
// on the lines. Built in the ground's frame like every zone (see surface.js).
import * as THREE from 'three';
import { Zone, car, bush, tree, grass } from './surface.js';
import { muleBoom } from './zone_underfoot.js';
import { sign, crate, barrel } from './props.js';
import { Builder } from './builder.js';
import { rng } from '../core/util.js';

class BuilderLite extends Builder { constructor(game, parent) { super(game, parent, { cell: 1000 }); } }
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
// a tilt about the local x axis, then a yaw — as the Builder's XYZ euler
const eul = (rx, ry) => { _q.setFromEuler(new THREE.Euler(rx, ry, 0, 'YXZ')); _e.setFromQuaternion(_q, 'XYZ'); return { rx: _e.x, ry: _e.y, rz: _e.z }; };

export const RC = { x: 330, z: -990 }; // the square

export function buildReach(game) {
  const Z = new Zone(game, 'reach'), b = Z.b, r = rng(4141), V = (x, dy, z) => Z.v(x, dy, z);
  Z.terrain(246, 430, -1104, -876, 4);
  muleBoom(Z);
  Z.offs.push(game.ground.addMask(150, 520, -1180, -150));
  const S = Z.spots;
  // ---------------------------------------------------------------- the road in, and the stalled truck
  for (let z = -880; z > -975; z -= 4) { const x = 320 + Math.sin(z * 0.03) * 3; b.box('concrete', [x, Z.gy(x, z) + 0.02, z], [4.2, 0.1, 4.2], { color: 0x8a7a62, collide: false, tex: 3 }); }
  Z.truck = truck(Z, 323.5, -918, Math.PI + 0.08);
  S.gate = V(320, 0, -905); S.mulePark = V(315.5, 0, -896);
  // ---------------------------------------------------------------- the square
  const sq = V(RC.x, 0, RC.z); S.square = sq;
  b.box('concrete', [sq.x, sq.y + 0.04, sq.z], [22, 0.12, 20], { color: 0x9a8a72, collide: false, tex: 2 });
  b.cyl('concrete', [sq.x, sq.y + 0.45, sq.z], 1.2, 0.9, { color: 0x8a8278, seg: 16, collide: true });  // the well
  b.box('wood', [sq.x, sq.y + 2.2, sq.z], [2.8, 0.15, 0.15], { color: 0x5a4632, collide: false });
  for (const sx of [-1, 1]) b.box('wood', [sq.x + sx * 1.3, sq.y + 1.4, sq.z], [0.15, 1.8, 0.15], { color: 0x5a4632, collide: false });
  for (const [x, z] of [[322, -982], [338, -998], [324, -999]]) { b.box('wood', [x, Z.gy(x, z) + 0.45, z], [1.8, 0.12, 0.5], { color: 0x6a5238 }); b.box('wood', [x, Z.gy(x, z) + 0.22, z], [0.12, 0.45, 0.4], { color: 0x5a4632, collide: false }); } // benches
  // ---------------------------------------------------------------- houses
  const H = [[310, -966, 7, 6, 0.15, 0xc0ac8c], [349, -964, 7.5, 6, -0.12, 0xa8987e], [306, -1012, 6, 6.5, 0.08, 0xb6a284], [318, -1030, 7, 6, -0.04, 0xb09a7c],
    [356, -1032, 7, 6, 0.1, 0xa89276], [372, -1006, 6, 6, 0.32, 0xbca88a], [296, -968, 6, 6, 0.4, 0x9e8e74], [366, -962, 6, 5.5, -0.3, 0xb4a07e]];
  Z.houses = H.map(([x, z, w, d, ry, c]) => house(Z, x, z, w, d, ry, c, r));
  // ---------------------------------------------------------------- the school
  { const x = 344, z = -1012, w = 12, d = 8; house(Z, x, z, w, d, Math.PI, 0xd8c8a0, r, { h: 3.6, door: 1.4, roof: 0x7a3a2a });
    sign(game, Z.root, 'CALLOW REACH SCHOOL', [x, Z.gy(x, z) + 3.3, z + d / 2 + 0.25], { neon: false, w: 5, h: 0.7, ry: 0, color: '#2a2622', bg: '#e8dcc0' });
    S.school = V(x, 0, z + d / 2 + 2.2); S.schoolDoor = V(x, 0, z + d / 2 + 0.6);
    // a yard with a hopscotch, a ball, a chalkboard
    for (let i = 0; i < 6; i++) b.box('paint', [x - 4 + (i % 2) * 0.7, Z.gy(x, z + 7) + 0.03, z + 6 + Math.floor(i / 2) * 0.8], [0.6, 0.02, 0.6], { color: 0xe8e0d0, collide: false, ao: false });
    b.sphere('paint', [x + 3, Z.gy(x + 3, z + 7) + 0.18, z + 7], 0.18, { color: 0xc8402a, seg: 10 });
    b.box('darkSteel', [x - 6.3, Z.gy(x - 6.3, z + 4.4) + 1.6, z + 4.4], [2.0, 1.2, 0.08], { color: 0x2a3a2a, collide: false });
    S.yard = V(x, 0, z + 7.5); }
  // ---------------------------------------------------------------- the greenhouse (east) — where the field closes in
  { const x = 386, z = -984, w = 12, d = 7, y = Z.gy(x, z), h = 3.4;
    b.box('concrete', [x, y + 0.1, z], [w, 0.2, d], { color: 0x7a7266 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box('steel', [x + sx * w / 2, y + h / 2, z + sz * d / 2], [0.12, h, 0.12], { color: 0xd8d8d0, collide: false });
    for (let k = -2; k <= 2; k++) b.box('steel', [x + k * w / 5, y + h + 0.6, z], [0.08, 0.08, d], { color: 0xd8d8d0, collide: false });
    for (const sz of [-1, 1]) b.box('glass', [x, y + h / 2, z + sz * d / 2], [w, h, 0.05], {});
    b.box('glass', [x + w / 2, y + h / 2, z], [0.05, h, d], {});
    b.box('glass', [x - w / 2, y + h / 2, z - d / 4 - 0.6], [0.05, h, d / 2 - 1.2], {}); b.box('glass', [x - w / 2, y + h / 2, z + d / 4 + 0.6], [0.05, h, d / 2 - 1.2], {}); // door gap, west
    for (const sz of [-1, 1]) b.box('glass', [x, y + h + 0.3, z + sz * d / 4], [w, 0.05, d / 2 + 0.3], { rx: sz * 0.32, collide: false });
    for (const sz of [-1.6, 1.6]) { b.box('wood', [x + 0.8, y + 0.8, z + sz], [w - 3.2, 0.12, 1.1], { color: 0x6a5238 }); for (let i = 0; i < 7; i++) bush(Z, x - 3.5 + i * 1.2 + 0.8, y + 1.15, z + sz, 0.28 + r() * 0.12); }
    S.greenhouse = V(x, 0, z); S.ghDoor = V(x - w / 2 - 1.2, 0, z); S.ghInside = [V(x - 2.6, 0.2, z - 0.3), V(x - 0.4, 0.2, z + 0.5), V(x + 1.6, 0.2, z - 0.2)];
    Z.gh = { x, z, w, d, h }; }
  // ---------------------------------------------------------------- the generator (west): a flywheel fed by a wind wheel, and the water tower
  { const x = 296, z = -990, y = Z.gy(x, z);
    b.box('corrugated', [x, y + 1.6, z], [5, 3.2, 6], { color: 0x6a7a6a, tex: 2 });
    b.box('paint', [x, y + 3.35, z], [5.4, 0.3, 6.4], { color: 0x4a4a42, collide: false });
    const fly = new THREE.Group(); fly.position.set(x + 3.6, y + 2.1, z); Z.root.add(fly);
    const fb = new BuilderLite(game, fly);
    fb.cyl('darkSteel', [0, 0, 0], 1.9, 0.45, { rz: Math.PI / 2, color: 0x3a3a3a, seg: 28 });
    fb.cyl('paint', [0, 0, 0], 1.95, 0.2, { rz: Math.PI / 2, color: 0xc8a030, seg: 28 });
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; fb.box('steel', [0.26, Math.cos(a) * 1.1, Math.sin(a) * 1.1], [0.1, 0.3, 1.9], { rx: a, color: 0x9a9a92, collide: false }); }
    fb.finalize();
    b.box('darkSteel', [x + 3.6, y + 1.0, z], [0.9, 2.0, 0.6], { color: 0x2a2a2a });
    b.box('darkSteel', [x + 3.6, y + 2.1, z], [1.2, 0.3, 0.3], { color: 0x2a2a2a, collide: false });
    Z.gen = { fly, spin: 2.6, target: 2.6, pos: new THREE.Vector3(x + 3.6, y + 2.1, z), alive: true };
    Z.offs.push(game.add((dt) => { const G = Z.gen; G.spin += (G.target - G.spin) * Math.min(1, dt * 0.6); fly.rotation.x += G.spin * dt; }));
    S.generator = V(x + 6, 0, z);
    // water tower
    const tx = 286, tz = -1010, ty = Z.gy(tx, tz);
    for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) b.tube('wood', [tx + dx, ty, tz + dz], [tx + dx * 0.8, ty + 8, tz + dz * 0.8], 0.14, { color: 0x5a4632 });
    b.cyl('wood', [tx, ty + 9.4, tz], 2.2, 2.8, { color: 0x7a5a3a, seg: 18, collide: true });
    b.cyl('rust', [tx, ty + 11.1, tz], 2.4, 0.6, { r2: 0.3, color: 0x6a4a32, seg: 18 });
    // a little wind wheel on the shed roof, feeding the flywheel
    Z.offs.push(game.add((dt) => { /* the wheel's spin is part of the flywheel's: one source of motion */ }));
  }
  // ---------------------------------------------------------------- lights on lines across the square (the generator keeps them lit)
  { const poles = [[318, -976], [342, -976], [342, -1004], [318, -1004]], pts = [];
    for (const [x, z] of poles) b.box('wood', [x, Z.gy(x, z) + 2.4, z], [0.18, 4.8, 0.18], { color: 0x5a4632, collide: false });
    for (let i = 0; i < 4; i++) { const [x0, z0] = poles[i], [x1, z1] = poles[(i + 1) % 4], y0 = Z.gy(x0, z0) + 4.6, y1 = Z.gy(x1, z1) + 4.6;
      for (let k = 1; k < 10; k++) { const u = k / 10; pts.push(new THREE.Vector3(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * 0.7, z0 + (z1 - z0) * u)); } }
    for (let k = 1; k < 10; k++) { const u = k / 10; pts.push(new THREE.Vector3(318 + 24 * u, Z.gy(330, -990) + 4.6 - Math.sin(u * Math.PI) * 0.9, -976 - 28 * u)); }
    const geo = new THREE.SphereGeometry(0.11, 6, 4), mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.7, 0.35).multiplyScalar(3) });
    const im = new THREE.InstancedMesh(geo, mat, pts.length), m = new THREE.Matrix4(); pts.forEach((p, i) => { m.makeTranslation(p.x, p.y, p.z); im.setMatrixAt(i, m); }); Z.root.add(im);
    Z.bulbs = { mat, on: true }; Z.disposers.push(() => { geo.dispose(); mat.dispose(); });
    Z.lamps = [new THREE.PointLight(0xffb070, 0, 26, 2), new THREE.PointLight(0xffb070, 0, 26, 2)];
    Z.lamps[0].position.set(324, Z.gy(324, -984) + 4, -984); Z.lamps[1].position.set(338, Z.gy(338, -998) + 4, -998); Z.lamps.forEach(l => Z.root.add(l));
    Z.setLights = (on, k = 1) => { Z.bulbs.on = on; mat.color.setRGB(1, 0.7, 0.35).multiplyScalar(on ? 3 * k : 0.08); Z.lamps.forEach(l => (l.intensity = on ? 18 * k : 0)); };
  }
  // ---------------------------------------------------------------- washing lines
  for (const [x0, z0, x1, z1] of [[312, -969, 300, -972], [352, -967, 364, -965], [309, -1015, 316, -1027]]) {
    const y = Z.gy(x0, z0) + 2.2; b.tube('cable', [x0, y, z0], [x1, y, z1], 0.012);
    for (let k = 1; k < 6; k++) { const u = k / 6; b.box('fabric', [x0 + (x1 - x0) * u, y - 0.42, z0 + (z1 - z0) * u], [0.7, 0.8, 0.03], { ry: Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, color: [0xc85a3a, 0x3a6a8a, 0xe8e0d0, 0xd8a040, 0x5a8a4a][k % 5], collide: false, ao: false }); }
  }
  // ---------------------------------------------------------------- gardens, crops, the goat pen
  for (let i = 0; i < 7; i++) { const z = -1046 - i * 3.2; b.box('wood', [330, Z.gy(330, z) + 0.2, z], [44, 0.4, 1.4], { color: 0x5a4232 }); for (let k = 0; k < 16; k++) bush(Z, 310 + k * 2.7 + r(), Z.gy(330, z) + 0.55, z, 0.32 + r() * 0.18); }
  S.gardens = V(330, 0, -1056);
  grass(Z, 250, 428, -1100, -880, 2600, { skip: (x, z) => Math.abs(x - 330) < 62 && z < -952 && z > -1040 });
  { const px = 362, pz = -946, w = 12, d = 9, y = Z.gy(px, pz);
    for (const [ax, az, bx, bz] of [[-1, -1, 1, -1], [1, -1, 1, 1], [1, 1, -1, 1], [-1, 1, -1, -1]]) {
      const A = new THREE.Vector3(px + ax * w / 2, 0, pz + az * d / 2), B = new THREE.Vector3(px + bx * w / 2, 0, pz + bz * d / 2), n = Math.ceil(A.distanceTo(B) / 2);
      for (let k = 0; k <= n; k++) { const p = A.clone().lerp(B, k / n); b.box('wood', [p.x, y + 0.5, p.z], [0.12, 1.0, 0.12], { color: 0x6a5238, collide: false }); }
      const mid = A.clone().lerp(B, 0.5); b.box('wood', [mid.x, y + 0.85, mid.z], [Math.abs(B.x - A.x) + 0.1 || 0.08, 0.08, Math.abs(B.z - A.z) + 0.1 || 0.08], { color: 0x6a5238 });
    }
    Z.goats = goats(Z, px, pz, w - 2, d - 2, 6, r); S.pen = V(px, 0, pz + d / 2 + 1.5);
  }
  for (let i = 0; i < 18; i++) { const a = r() * Math.PI * 2, rr = 80 + r() * 40; tree(Z, RC.x + Math.cos(a) * rr, RC.z + Math.sin(a) * rr, 8 + r() * 6); }
  for (let i = 0; i < 8; i++) { const x = 300 + r() * 60, z = -960 - r() * 70; if (Math.abs(x - 330) < 12 && Math.abs(z + 990) < 11) continue; crate(b, [x, Z.gy(x, z), z], 0.9, { ry: r() * 3 }); if (r() < 0.4) barrel(b, [x + 1.2, Z.gy(x, z), z]); }
  // ---------------------------------------------------------------- where the harvest's anchors come down
  S.anchors = [V(404, 0, -960), V(334, 0, -1082), V(268, 0, -1000)];
  S.niaPost = V(326, 0, -980);
  Z.finalize();
  return Z;
}

// a block house: walls, a pitched roof (ridge along its width), a door and two windows facing +z (before ry)
function house(Z, x, z, w, d, ry, col, r, o = {}) {
  const b = Z.b, y = Z.gy(x, z) - 0.1, h = o.h ?? 3.0, c = Math.cos(ry), s = Math.sin(ry);
  const at = (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
  b.box('plaster', at(0, h / 2, 0), [w, h, d], { ry, color: col, tex: 2.5 });
  const a = 0.5, half = d / 2 + 0.45, roofCol = o.roof ?? [0x7a4a32, 0x5a4a3a, 0x8a5a3a, 0x4a5a5a][Math.floor(r() * 4)];
  for (const sd of [-1, 1]) { const e = eul(sd * a, ry); b.box('rust', at(0, h + Math.tan(a) * half / 2 - 0.05, sd * half / 2), [w + 0.6, 0.18, half / Math.cos(a) + 0.1], { ...e, color: roofCol, tex: 1.5 }); }
  for (const sd of [-1, 1]) b.box('plaster', at(sd * (w / 2 - 0.1), h + Math.tan(a) * d / 4 - 0.2, 0), [0.2, Math.tan(a) * d / 2, d * 0.62], { ry, color: col, collide: false, tex: 2.5 }); // gables
  b.box('wood', at(-w * 0.18, (o.door ?? 1.0) + 0.05, d / 2 + 0.03), [1.0, 2.1, 0.08], { ry, color: 0x5a3a28, collide: false });
  for (const lx of [w * 0.12, w * 0.34]) { b.box('glassDark', at(lx, 1.7, d / 2 + 0.03), [0.9, 0.8, 0.06], { ry, collide: false }); b.box('wood', at(lx, 1.22, d / 2 + 0.09), [1.1, 0.1, 0.16], { ry, color: 0x6a5238, collide: false }); }
  b.box('brick', at(w * 0.3, h + Math.tan(a) * half * 0.8 + 0.4, -d * 0.18), [0.6, 1.4, 0.6], { ry, color: 0x7a4a3a, collide: false });
  return { x, z, w, d, ry, door: new THREE.Vector3(...at(-w * 0.18, 0.1, d / 2 + 1.2)) };
}
function truck(Z, x, z, ry) {
  const b = Z.b, y = Z.gy(x, z), c = Math.cos(ry), s = Math.sin(ry), at = (lx, ly, lz) => [x + lx * c + lz * s, y + ly, z - lx * s + lz * c];
  b.box('paint', at(0, 1.1, 1.6), [2.2, 1.5, 2.0], { ry, color: 0x3a5a6a, round: 0.12 });
  b.box('glassDark', at(0, 1.5, 2.62), [1.9, 0.6, 0.05], { ry, collide: false });
  b.box('wood', at(0, 0.95, -1.4), [2.3, 0.9, 4.0], { ry, color: 0x6a5238 });
  for (const sx of [-1, 1]) for (const sz of [-2.4, 1.6]) b.cyl('rubber', at(sx * 1.05, 0.42, sz), 0.42, 0.3, { rz: Math.PI / 2, ry, color: 0x1a1a1a, seg: 12 });
  for (let i = 0; i < 4; i++) crate(b, at(-0.5 + (i % 2), 1.4, -0.4 - Math.floor(i / 2) * 1.1), 0.7, { ry });
  return { pos: new THREE.Vector3(...at(0, 1.2, 1.6)), running: true };
}
// goats: a block body, a head that dips to graze, four legs, two horns; they amble around the pen
function goats(Z, cx, cz, w, d, n, r) {
  const list = [], geos = [new THREE.BoxGeometry(0.9, 0.5, 0.42), new THREE.BoxGeometry(0.3, 0.3, 0.42), new THREE.BoxGeometry(0.1, 0.5, 0.1), new THREE.BoxGeometry(0.05, 0.2, 0.05)];
  geos[0].rotateY(Math.PI / 2); geos[1].rotateY(Math.PI / 2);
  const mats = [0xe8e0d0, 0x8a6a4a, 0x3a3230, 0xd8c8a8].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 })), dark = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 0.9 });
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group(), m = mats[i % 4];
    const body = new THREE.Mesh(geos[0], m); body.position.y = 0.72; g.add(body);
    const neck = new THREE.Group(); neck.position.set(0, 0.85, 0.42); g.add(neck);
    const head = new THREE.Mesh(geos[1], m); head.position.set(0, 0.12, 0.2); neck.add(head);
    for (const sx of [-0.08, 0.08]) { const hn = new THREE.Mesh(geos[3], dark); hn.position.set(sx, 0.32, 0.12); hn.rotation.x = -0.4; neck.add(hn); }
    for (const [lx, lz] of [[-0.13, 0.3], [0.13, 0.3], [-0.13, -0.3], [0.13, -0.3]]) { const L = new THREE.Mesh(geos[2], m === mats[0] ? mats[3] : m); L.position.set(lx, 0.25, lz); g.add(L); }
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const p = new THREE.Vector3(cx + (r() - 0.5) * w, 0, cz + (r() - 0.5) * d); g.position.set(p.x, Z.gy(p.x, p.z), p.z); g.rotation.y = r() * 6.28; Z.root.add(g);
    list.push({ g, neck, t: r() * 10, goal: p.clone(), still: false });
  }
  Z.disposers.push(() => { geos.forEach(x => x.dispose()); mats.forEach(x => x.dispose()); dark.dispose(); });
  Z.offs.push(Z.game.add((dt) => {
    for (const G of list) {
      if (G.still) continue;
      G.t -= dt;
      if (G.t < 0) { G.t = 3 + Math.random() * 6; G.goal.set(cx + (Math.random() - 0.5) * w, 0, cz + (Math.random() - 0.5) * d); }
      const to = G.goal.clone().sub(G.g.position).setY(0), L = to.length();
      if (L > 0.3) { const yaw = Math.atan2(to.x, to.z); let dy = yaw - G.g.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); G.g.rotation.y += dy * Math.min(1, dt * 3); G.g.position.addScaledVector(to.normalize(), Math.min(L, dt * 0.6)); G.g.position.y = Z.gy(G.g.position.x, G.g.position.z); G.neck.rotation.x = 0.1; }
      else G.neck.rotation.x = 0.9 + Math.sin(Z.game.time * 3 + G.t) * 0.15; // grazing
    }
  }));
  return list;
}
