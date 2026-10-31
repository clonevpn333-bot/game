// CHAPTER THREE — the Long Road convoy, camped for the night: vehicles drawn up in a ring round a fire,
// market stalls under string lights, a long table for the shared meal, a line of cans on a fence for
// anyone who thinks they can shoot. Built in the ground frame like every zone (see surface.js).
import * as THREE from 'three';
import { Zone, bush, tree, grass } from './surface.js';
import { vehicle } from './vehicles.js';
import { crate, barrel } from './props.js';
import { rng } from '../core/util.js';

export const CAMP = { x: 40, z: -20 };

export function buildConvoyCamp(game) {
  const Z = new Zone(game, 'convoy'), b = Z.b, r = rng(3131), V = (x, dy, z) => Z.v(x, dy, z);
  Z.terrain(-50, 130, -110, 70, 4);
  Z.offs.push(game.ground.addMask(-120, 200, -180, 140));
  const S = Z.spots, C = V(CAMP.x, 0, CAMP.z); S.fire = C;
  // ---------------------------------------------------------------- the ring of vehicles
  Z.vehicles = [];
  const ring = [['hauler', 0x6f7d50], ['trailer', 0x3a6a8a, 0xd8a040], ['trailer', 0x8a3a2a, 0xe8e0d0], ['van', 0x5a5a4a], ['trailer', 0x4a6a3a, 0xc85a3a], ['hauler', 0x7a5a3a], ['van', 0x3a4a5a], ['trailer', 0x7a6a4a, 0x3a6a8a]];
  ring.forEach(([k, c, aw], i) => {
    const a = i / ring.length * Math.PI * 2 + 0.2, rr = 19, x = C.x + Math.cos(a) * rr, z = C.z + Math.sin(a) * rr;
    const v = vehicle(game, k, { color: c, awning: aw }); v.group.position.set(x, Z.gy(x, z), z); v.group.rotation.y = -a; Z.root.add(v.group);
    for (const c2 of v.cols) b.solid([x + Math.cos(-a) * c2.pos.x + Math.sin(-a) * c2.pos.z, Z.gy(x, z) + c2.pos.y, z - Math.sin(-a) * c2.pos.x + Math.cos(-a) * c2.pos.z], [c2.hx * 2, c2.hy * 2, c2.hz * 2], { ry: -a });
    Z.vehicles.push(v); Z.disposers.push(() => v.dispose());
  });
  // the Mule, parked with them
  S.mulePark = V(C.x - 12, 0, C.z + 24);
  // ---------------------------------------------------------------- the fire
  b.cyl('concrete', [C.x, C.y + 0.15, C.z], 1.6, 0.3, { color: 0x5a5650, seg: 14, collide: true });
  for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; b.box('wood', [C.x + Math.cos(a) * 0.5, C.y + 0.45, C.z + Math.sin(a) * 0.5], [0.15, 0.15, 1.2], { ry: a, rx: 0.6, color: 0x3a2618, collide: false }); }
  const flameM = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.55, 0.15).multiplyScalar(3.5), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending });
  const flames = []; for (let k = 0; k < 4; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.45 - k * 0.07, 1.4 - k * 0.2, 6), flameM); f.position.set(C.x + (k - 1.5) * 0.15, C.y + 0.9, C.z); Z.root.add(f); flames.push(f); }
  const fireL = new THREE.PointLight(0xff9040, 40, 30, 1.6); fireL.position.set(C.x, C.y + 1.6, C.z); Z.root.add(fireL);
  Z.offs.push(game.add((dt) => { const t = game.time; flames.forEach((f, k) => { f.scale.set(1 + Math.sin(t * 9 + k) * 0.12, 1 + Math.sin(t * 13 + k * 2) * 0.25, 1); f.rotation.y = t * (1 + k * 0.3); }); fireL.intensity = 34 + Math.sin(t * 17) * 5 + Math.sin(t * 7.3) * 4; }));
  { const em = game.fx.emitter({ pos: C.clone().add(new THREE.Vector3(0, 1.2, 0)), rate: 10, range: 80, spawn: (fx) => fx.add.spawn({ x: C.x + (Math.random() - 0.5) * 0.6, y: C.y + 1.3, z: C.z + (Math.random() - 0.5) * 0.6, vx: (Math.random() - 0.5) * 0.4, vy: 1.6 + Math.random() * 1.4, vz: (Math.random() - 0.5) * 0.4, life: 1.6, s0: 0.05, s1: 0.01, c0: [3, 1.6, 0.5, 1], c1: [1, 0.3, 0, 0], g: -0.5 }) }); Z.offs.push(() => { em.active = false; game.fx.emitters = game.fx.emitters.filter(e => e !== em); }); }
  Z.disposers.push(() => { flameM.dispose(); flames.forEach(f => f.geometry.dispose()); });
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, x = C.x + Math.cos(a) * 4.2, z = C.z + Math.sin(a) * 4.2; b.box('wood', [x, Z.gy(x, z) + 0.22, z], [1.8, 0.44, 0.5], { ry: -a + Math.PI / 2, color: 0x5a4632 }); }  // log benches
  S.fireSeats = [...Array(8)].map((_, k) => { const a = k / 8 * Math.PI * 2 + 0.2; return { pos: V(C.x + Math.cos(a) * 3.4, 0, C.z + Math.sin(a) * 3.4), yaw: Math.atan2(-Math.cos(a), -Math.sin(a)) }; });
  // ---------------------------------------------------------------- the long table (the shared meal)
  const T = V(C.x + 9, 0, C.z - 7); S.table = T;
  b.box('wood', [T.x, T.y + 0.78, T.z], [9, 0.1, 1.4], { color: 0x7a5a3a });
  for (const sx of [-4, 4]) for (const sz of [-0.55, 0.55]) b.box('wood', [T.x + sx, T.y + 0.38, T.z + sz], [0.1, 0.76, 0.1], { color: 0x5a4632, collide: false });
  for (const sz of [-1.1, 1.1]) b.box('wood', [T.x, T.y + 0.42, T.z + sz], [9, 0.08, 0.35], { color: 0x5a4632 });
  for (let k = 0; k < 14; k++) { const x = T.x - 4 + k * 0.62, z = T.z + (k % 2 ? 0.35 : -0.35); b.cyl('paint', [x, T.y + 0.86, z], 0.18, 0.05, { color: [0xd8c8a0, 0xc85a3a, 0x3a6a8a][k % 3], seg: 12 }); if (k % 3 === 0) b.sphere('paint', [x, T.y + 0.95, z], 0.12, { color: [0xd8a040, 0x8a3a2a, 0x5a8a3a][k % 3], seg: 8 }); }
  b.cyl('rust', [T.x, T.y + 1.0, T.z], 0.35, 0.4, { color: 0x3a3a3a, seg: 14 }); // the stew pot
  S.tableSeats = [...Array(8)].map((_, k) => ({ pos: V(T.x - 3.2 + (k % 4) * 2.1, 0, T.z + (k < 4 ? -1.1 : 1.1)), yaw: k < 4 ? 0 : Math.PI }));
  // ---------------------------------------------------------------- the market: stalls under string lights
  const stalls = [[C.x - 10, C.z - 8, 0.3, 0xc85a3a], [C.x - 12, C.z + 2, -0.2, 0x3a6a8a], [C.x - 7, C.z + 10, 0.8, 0xd8a040], [C.x + 3, C.z + 12, 1.4, 0x5a8a4a]];
  S.stalls = stalls.map(([x, z, ry, c]) => {
    const y = Z.gy(x, z), cs = Math.cos(ry), sn = Math.sin(ry), at = (lx, ly, lz) => [x + lx * cs + lz * sn, y + ly, z - lx * sn + lz * cs];
    b.box('wood', at(0, 0.5, 0), [2.4, 1.0, 1.0], { ry, color: 0x6a5238 });
    for (const sx of [-1.1, 1.1]) b.box('wood', at(sx, 1.2, -0.4), [0.08, 2.4, 0.08], { ry, color: 0x5a4632, collide: false });
    b.box('fabric', at(0, 2.35, 0.1), [2.8, 0.06, 1.8], { ry, rx: 0.2, color: c, collide: false, ao: false });
    for (let k = 0; k < 5; k++) b.box('paint', at(-0.9 + k * 0.45, 1.1, 0), [0.25, 0.2, 0.25], { ry, color: [0xd8a040, 0x8a3a2a, 0x3a6a8a, 0xe8e0d0, 0x5a8a3a][k], collide: false });
    return { pos: new THREE.Vector3(...at(0, 0, -1.3)), yaw: ry + Math.PI };
  });
  { const pts = [], poles = [[C.x - 14, C.z - 10], [C.x - 14, C.z + 6], [C.x - 4, C.z + 15], [C.x + 8, C.z + 14], [C.x + 14, C.z - 2], [C.x + 6, C.z - 14]];
    for (const [x, z] of poles) b.box('wood', [x, Z.gy(x, z) + 2.5, z], [0.15, 5, 0.15], { color: 0x5a4632, collide: false });
    for (let i = 0; i < poles.length; i++) { const [x0, z0] = poles[i], [x1, z1] = poles[(i + 1) % poles.length]; for (let k = 1; k < 12; k++) { const u = k / 12; pts.push(new THREE.Vector3(x0 + (x1 - x0) * u, Z.gy(x0, z0) + 4.8 - Math.sin(u * Math.PI) * 0.8, z0 + (z1 - z0) * u)); } }
    const geo = new THREE.SphereGeometry(0.09, 6, 4), cols = [0xffb060, 0xff7050, 0xffe090, 0x80c0ff].map(c => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(3) }));
    pts.forEach((p, i) => { const m = new THREE.Mesh(geo, cols[i % 4]); m.position.copy(p); Z.root.add(m); });
    Z.disposers.push(() => { geo.dispose(); cols.forEach(c => c.dispose()); });
    for (const [x, z] of [[C.x - 9, C.z], [C.x + 4, C.z + 9]]) { const l = new THREE.PointLight(0xffb070, 14, 18, 1.8); l.position.set(x, Z.gy(x, z) + 4, z); Z.root.add(l); } }
  // ---------------------------------------------------------------- the can fence (a shooting game)
  const F = V(C.x + 2, 0, C.z - 26); S.cansStand = V(C.x + 2, 0, C.z - 14); S.cans = F;
  b.box('wood', [F.x, F.y + 1.0, F.z], [6, 0.12, 0.3], { color: 0x6a5238 });
  for (const sx of [-2.8, 0, 2.8]) b.box('wood', [F.x + sx, F.y + 0.5, F.z], [0.12, 1.0, 0.12], { color: 0x5a4632, collide: false });
  Z.cans = [];
  const arm = (can) => { can.col = game.physics.addBox({ x: can.p.x, y: can.p.y, z: can.p.z }, { x: 0.12, y: 0.15, z: 0.12 }, null, { surface: 'metal', onShot: () => {
    if (can.down) return; can.down = true; game.physics.world.removeCollider(can.col, false); Z.colliders = Z.colliders.filter(c => c !== can.col);
    can.vel = new THREE.Vector3((Math.random() - 0.5) * 2, 3, -3); game.audio.impact(can.p, 'metal', 1); Z.onCan?.(); } }); Z.colliders.push(can.col); };
  for (let k = 0; k < 6; k++) {
    const p = new THREE.Vector3(F.x - 2.4 + k * 0.96, F.y + 1.22, F.z);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.26, 10), new THREE.MeshStandardMaterial({ color: [0xc8402a, 0xd8d0c0, 0x3a6a8a][k % 3], metalness: 0.6, roughness: 0.4 })); m.position.copy(p); Z.root.add(m);
    const can = { m, p, down: false, col: null }; arm(can); Z.cans.push(can);
  }
  Z.offs.push(game.add((dt) => { for (const c of Z.cans) if (c.down && c.m.position.y > F.y + 0.1) { c.vel.y -= 12 * dt; c.m.position.addScaledVector(c.vel, dt); c.m.rotation.x += dt * 9; } }));
  Z.resetCans = () => Z.cans.forEach(c => { if (!c.down) return; c.down = false; c.m.position.copy(c.p); c.m.rotation.set(0, 0, 0); arm(c); });
  // ---------------------------------------------------------------- the rest of the night
  for (let i = 0; i < 10; i++) { const x = C.x - 25 + r() * 50, z = C.z - 25 + r() * 50; if (Math.hypot(x - C.x, z - C.z) < 24 && Math.hypot(x - C.x, z - C.z) > 6) { crate(b, [x, Z.gy(x, z), z], 0.8, { ry: r() * 3 }); if (r() < 0.5) barrel(b, [x + 1, Z.gy(x, z), z]); } }
  grass(Z, -50, 130, -110, 70, 3200, { dry: true, skip: (x, z) => Math.hypot(x - C.x, z - C.z) < 23 });
  for (let i = 0; i < 26; i++) { const a = r() * Math.PI * 2, rr = 42 + r() * 40; tree(Z, C.x + Math.cos(a) * rr, C.z + Math.sin(a) * rr, 6 + r() * 6); }
  for (let i = 0; i < 30; i++) { const a = r() * Math.PI * 2, rr = 26 + r() * 50; bush(Z, C.x + Math.cos(a) * rr, Z.gy(C.x + Math.cos(a) * rr, C.z + Math.sin(a) * rr) + 0.3, C.z + Math.sin(a) * rr, 0.5 + r() * 0.6); }
  S.edge = V(C.x - 7, 0, C.z + 28); // where Nia sits, outside the ring, looking at the dark
  S.arrive = V(C.x - 18, 0, C.z + 30);
  Z.finalize();
  return Z;
}
