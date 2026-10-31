// VESPER — the second walking city. Where Meridian strides on four legs, Vesper rolls: a platform four
// hundred metres wide on four tread units the size of hills, industry stacked in its lower decks and, on
// top, a city of boulevards, towers, cafés, greenhouses and a festival plaza. It walks beside Meridian at
// the same pace, so it lives in Meridian's own frame (built under cityRoot, colliders and all) and is
// built only for the chapters that visit it.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { sign, crate } from './props.js';
import { rng } from '../core/util.js';

export const VS = { x: 760, y: -40, x0: 560, x1: 960, z0: -260, z1: 260 };

export function buildVesper(game) {
  const root = new THREE.Group(); root.name = 'city:vesper'; game.engine.cityRoot.add(root);
  const P = game.physics, cols = [];
  const b = new Builder(game, root, { cell: 70 });
  b.physics = new Proxy(P, { get: (t, k) => (k === 'addBox' || k === 'addCylinder' || k === 'addTrimesh') ? (...a) => { const c = t[k](...a); cols.push(c); return c; } : (typeof t[k] === 'function' ? t[k].bind(t) : t[k]) });
  const r = rng(5005), D = VS.y, X = VS.x, Vx = { root, spots: {}, offs: [], disposers: [], lamps: [], anim: [] };
  const L = (x, y, z, c = 0xffd8a0, i = 2.6, d = 14) => Vx.lamps.push(game.lights.add([x, y, z], c, i, d));
  const S = Vx.spots;
  // ---------------------------------------------------------------- the body: platform, decks, treads
  const W = VS.x1 - VS.x0, Dd = VS.z1 - VS.z0;
  b.box('plaster', [X, D - 145, 0], [W, 290, Dd], { color: 0xb8ae9c, tex: 8, collide: false });
  b.box('plaster', [X, D - 0.5, 0], [W + 6, 1, Dd + 6], { color: 0x8a8274, tex: 4 });                 // the deck slab (walkable)
  // lit bands of the lower decks on every face, and industrial clutter on the flanks
  for (let k = 0; k < 9; k++) { const y = D - 30 - k * 28;
    b.box('facade', [VS.x0 - 0.3, y, 0], [0.6, 15, Dd - 20], { tex: 9, collide: false, ao: false }); b.box('facade', [VS.x1 + 0.3, y, 0], [0.6, 15, Dd - 20], { tex: 9, collide: false, ao: false });
    b.box('facade', [X, y, VS.z0 - 0.3], [W - 20, 15, 0.6], { tex: 9, collide: false, ao: false }); b.box('facade', [X, y, VS.z1 + 0.3], [W - 20, 15, 0.6], { tex: 9, collide: false, ao: false });
    for (const [px, pz, sx, sz] of [[VS.x0 - 0.9, 0, 1.2, Dd], [VS.x1 + 0.9, 0, 1.2, Dd], [X, VS.z0 - 0.9, W, 1.2], [X, VS.z1 + 0.9, W, 1.2]]) b.box('panel', [px, y + 9.5, pz], [sx, 2.5, sz], { color: 0x6a6258, collide: false, tex: 6 });
    b.box('darkSteel', [VS.x0 - 1.5, y - 6, 0], [3, 1.2, Dd], { color: 0x5a5650, collide: false }); }
  for (let k = 0; k <= 20; k++) { const z = VS.z0 + k * 26; for (const x of [VS.x0 - 1.2, VS.x1 + 1.2]) b.box('plaster', [x, D - 140, z], [2.4, 280, 3], { color: 0xa89e8c, collide: false, tex: 8 }); const x2 = VS.x0 + k * 20; if (x2 < VS.x1) for (const zz of [VS.z0 - 1.2, VS.z1 + 1.2]) b.box('plaster', [x2, D - 140, zz], [3, 280, 2.4], { color: 0xa89e8c, collide: false, tex: 8 }); } // vertical ribs
  for (let k = 0; k < 7; k++) { const z = -220 + k * 70; b.cyl('rust', [VS.x1 + 6, D - 120, z], 4, 200, { color: 0x6a5a4a, seg: 12 }); b.box('lampWarm', [VS.x1 + 4, D - 200 + (k % 3) * 40, z], [2, 6, 6], { collide: false, ao: false }); }
  for (const [x, z] of [[VS.x1 - 30, -200], [VS.x1 - 30, 200], [VS.x1 - 60, -120]]) { b.cyl('brick', [x, D + 30, z], 6, 60, { r2: 4.5, color: 0x7a5a4a, seg: 16, collide: true }); }
  // four tread units, the size of hills
  Vx.treads = [];
  for (const tx of [VS.x0 + 60, VS.x1 - 60]) for (const tz of [-150, 150]) {
    const g = new THREE.Group(); g.position.set(tx, -400, tz); root.add(g);
    const tb = new Builder(game, g, { cell: 1000 });
    tb.box('darkSteel', [0, 40, 0], [80, 70, 210], { color: 0x3a3936, collide: false });
    for (const sz of [-1, 1]) tb.cyl('darkSteel', [0, 36, sz * 98], 34, 84, { rz: Math.PI / 2, color: 0x2e2d2a, seg: 28 });
    tb.box('panel', [0, 82, 0], [70, 14, 160], { color: 0x6e6a62, collide: false });
    tb.finalize();
    // tread plates: a belt of blocks that rolls under the unit
    const plates = new THREE.InstancedMesh(new THREE.BoxGeometry(84, 3, 6), new THREE.MeshStandardMaterial({ color: 0x24231f, roughness: 0.6, metalness: 0.7 }), 40);
    plates.frustumCulled = false; g.add(plates); Vx.treads.push({ g, plates, off: 0 });
    Vx.disposers.push(() => { plates.geometry.dispose(); plates.material.dispose(); });
  }
  const mt = new THREE.Matrix4();
  Vx.anim.push((dt) => { const sp = game.city.speed * game.city.speedMul * (game.city.walking ? 1 : 0); for (const T of Vx.treads) { T.off = (T.off + sp * dt) % 6; for (let i = 0; i < 40; i++) { const z = -117 + ((i * 6 + T.off) % 234); mt.makeTranslation(0, 1.5, z); T.plates.setMatrixAt(i, mt); } T.plates.instanceMatrix.needsUpdate = true; } });
  // ---------------------------------------------------------------- the deck edge: balustrades all round
  const rail = (x0, z0, x1, z1) => { b.railing([x0, D, z0], [x1, D, z1], { h: 1.1 }); };
  rail(VS.x0 + 2, VS.z0 + 2, VS.x0 + 2, VS.z1 - 2); rail(VS.x1 - 2, VS.z0 + 2, VS.x1 - 2, VS.z1 - 2); rail(VS.x0 + 2, VS.z0 + 2, VS.x1 - 2, VS.z0 + 2); rail(VS.x0 + 2, VS.z1 - 2, VS.x1 - 2, VS.z1 - 2);
  // ---------------------------------------------------------------- the gondola station (west, facing Meridian)
  const ST = new THREE.Vector3(VS.x0 + 12, D, -40); S.station = ST.clone().add(new THREE.Vector3(8, 0, 0));
  b.box('plaster', [ST.x, D + 0.2, ST.z], [16, 0.4, 14], { color: 0xe8e0d0, tex: 3 });
  for (const sx of [-6, 6]) for (const sz of [-6, 6]) b.cyl('steel', [ST.x + sx, D + 4, ST.z + sz], 0.25, 8, { color: 0xc8c8c0, seg: 10, collide: true });
  b.box('glass', [ST.x, D + 8.2, ST.z], [17, 0.3, 15], {});
  sign(game, root, 'VESPER · MERIDIAN LINE', [ST.x + 7.9, D + 6.8, ST.z], { ry: Math.PI / 2, w: 6, h: 0.8, color: '#2a2622', bg: '#e8dcc0', neon: false });
  S.cableEnd = new THREE.Vector3(ST.x - 4, D + 6, ST.z);
  // the promenade along the west edge, looking across at Meridian
  for (let z = -200; z <= 200; z += 20) { const x = VS.x0 + 8; b.box('wood', [x, D + 0.45, z], [0.6, 0.12, 2.2], { color: 0x6a5238 }); if (Math.abs(z + 40) > 12) { b.tube('darkSteel', [x + 2, D, z + 10], [x + 2, D + 4.5, z + 10], 0.07, { color: 0x2a2a2a }); b.sphere('lampWarm', [x + 2, D + 4.7, z + 10], 0.25, { seg: 8 }); L(x + 2, D + 4.6, z + 10); } }
  // ---------------------------------------------------------------- the boulevard
  const BW = 26;
  b.box('tiles', [X, D + 0.05, 0], [BW, 0.1, 360], { color: 0x9a8e7c, tex: 2, collide: false, ao: false });
  for (const sx of [-1, 1]) for (let z = -170; z <= 170; z += 14) {
    const x = X + sx * (BW / 2 - 2.5);
    b.cyl('wood', [x, D + 2.2, z], 0.18, 4.4, { r2: 0.12, color: 0x4a3a2a, seg: 7, collide: true }); b.sphere('leaf', [x, D + 5.2, z], 2.0, { color: 0x4a6a2a, seg: 9, sy: 0.85 });
    b.box('wood', [x - sx * 1.8, D + 0.45, z + 7], [0.6, 0.1, 2.0], { color: 0x6a5238 });
    b.tube('darkSteel', [x - sx * 1.2, D, z + 3.5], [x - sx * 1.2, D + 5, z + 3.5], 0.07, { color: 0x2a2a2a }); b.sphere('lampWarm', [x - sx * 1.2, D + 5.2, z + 3.5], 0.28, { seg: 8 }); L(x - sx * 1.2, D + 5, z + 3.5);
  }
  // tram rails down the middle and the tram that runs on them
  for (const sx of [-0.7, 0.7]) b.box('steel', [X + sx, D + 0.12, 0], [0.12, 0.06, 350], { color: 0x9a9a92, collide: false });
  { const tram = new THREE.Group(); root.add(tram); const tb = new Builder(game, tram, { cell: 1000 });
    tb.box('paint', [0, 1.7, 0], [2.6, 2.6, 10], { color: 0x2a4a6a, round: 0.25, collide: false }); tb.box('paint', [0, 3.15, 0], [2.4, 0.3, 9.6], { color: 0xd8c8a0, collide: false });
    for (let k = 0; k < 4; k++) for (const sx of [-1, 1]) tb.box('glassLit', [sx * 1.31, 2.0, -3.6 + k * 2.4], [0.04, 1.1, 1.8], { collide: false, ao: false });
    tb.finalize(); let t = 0; Vx.tram = tram;
    Vx.anim.push((dt) => { t += dt; const u = (Math.sin(t * 0.06) + 1) / 2; tram.position.set(X, D, -160 + u * 320); }); }
  // ---------------------------------------------------------------- towers (lit windows) and the street fronts
  const tower = (x, z, w, d, h, col) => { b.box('facade', [x, D + h / 2, z], [w, h, d], { tex: 7, color: col ?? 0xd8ccb8 }); b.box('plaster', [x, D + h + 0.6, z], [w + 0.6, 1.2, d + 0.6], { color: 0xd8d0c0 }); return { x, z, w, d, h }; };
  Vx.towers = [];
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) { const z = -150 + k * 56 + (sx > 0 ? 18 : 0); if (Math.abs(z + 60) < 26 && sx < 0) continue; if (sx > 0 && z > 40 && z < 140) continue; Vx.towers.push(tower(X + sx * (BW / 2 + 14), z, 22, 22 + r() * 10, 30 + r() * 60)); }
  // café terraces along the station street (z = -40), between the promenade and the boulevard
  S.cafes = [];
  for (let k = 0; k < 4; k++) { const cx = VS.x0 + 40 + k * 40, cz = -54;
    b.box('plaster', [cx, D + 4, cz - 6], [24, 8, 8], { color: [0xe8d8c0, 0xd8c8b0, 0xe0d0c0, 0xd0c0a8][k], tex: 3 });
    b.box('glassLit', [cx, D + 1.8, cz - 1.95], [18, 2.6, 0.08], { collide: false, ao: false });
    b.box('fabric', [cx, D + 3.6, cz - 0.6], [20, 0.08, 3], { rx: 0.25, color: [0x8a2a3a, 0x2a5a4a, 0xc8a040, 0x2a3a6a][k], collide: false, ao: false });
    sign(game, root, ['LE PONT', 'CAFÉ VESPER', 'THE SLOW TRAIN', 'MARGUERITE'][k], [cx, D + 5.2, cz - 1.9], { neon: true, w: 5, h: 0.9, color: ['#ffb070', '#7fe3c4', '#ffd27a', '#ff8fb0'][k] });
    for (let t = 0; t < 4; t++) { const tx = cx - 7 + t * 4.6, tz = cz + 3; b.cyl('paint', [tx, D + 0.75, tz], 0.55, 0.06, { color: 0xe8e0d0, seg: 14 }); b.cyl('darkSteel', [tx, D + 0.38, tz], 0.05, 0.75, { color: 0x2a2a2a, seg: 6 });
      S.cafes.push({ pos: new THREE.Vector3(tx - 0.9, D, tz), yaw: Math.PI / 2 }, { pos: new THREE.Vector3(tx + 0.9, D, tz), yaw: -Math.PI / 2 }); }
    L(cx, D + 3, cz + 1, 0xffc890, 2.2, 10); }
  for (let k = 0; k < 3; k++) tower(VS.x0 + 50 + k * 50, -90, 30, 26, 24 + k * 10, 0xd8d0c4);
  // ---------------------------------------------------------------- the festival plaza (on the boulevard)
  const FP = new THREE.Vector3(X, D, -80); S.plaza = FP;
  b.cyl('tiles', [FP.x, D + 0.06, FP.z], 22, 0.12, { color: 0xc8bca8, seg: 32 });
  b.box('wood', [FP.x + 14, D + 0.7, FP.z], [6, 1.4, 10], { color: 0x5a3a28 }); // stage
  for (const sz of [-4.5, 4.5]) b.tube('darkSteel', [FP.x + 16.5, D + 1.4, FP.z + sz], [FP.x + 16.5, D + 7, FP.z + sz], 0.1, { color: 0x2a2a2a });
  b.box('fabric', [FP.x + 16.6, D + 6, FP.z], [0.1, 2, 9.5], { color: 0x8a2a3a, collide: false, ao: false });
  S.stage = new THREE.Vector3(FP.x + 14, D + 1.4, FP.z);
  { const geo = new THREE.SphereGeometry(0.22, 8, 6), mats = [0xff9050, 0xffd070, 0xff6080, 0x90d0ff].map(c => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.6) }));
    for (let a = 0; a < 6; a++) { const ang = a / 6 * Math.PI * 2; for (let k = 1; k < 14; k++) { const u = k / 14, m = new THREE.Mesh(geo, mats[(a + k) % 4]); m.position.set(FP.x + Math.cos(ang) * 20 * u, D + 8 - Math.sin(u * Math.PI) * 2.5 - u * 1.5, FP.z + Math.sin(ang) * 20 * u); root.add(m); } }
    b.cyl('darkSteel', [FP.x, D + 4.5, FP.z], 0.2, 9, { color: 0x2a2a2a, seg: 8, collide: true });
    Vx.disposers.push(() => { geo.dispose(); mats.forEach(m => m.dispose()); }); }
  for (const [x, z] of [[FP.x - 8, FP.z - 8], [FP.x + 8, FP.z + 8], [FP.x - 8, FP.z + 8], [FP.x + 8, FP.z - 8]]) L(x, D + 6, z, 0xffb070, 3, 16);
  // ---------------------------------------------------------------- greenhouses (east)
  S.greenhouses = [];
  for (const [x, z, rr] of [[X + 60, 70, 16], [X + 60, 115, 12]]) {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(rr, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), game.materials.glass); dome.position.set(x, D, z); root.add(dome);
    const frame = new THREE.Mesh(new THREE.SphereGeometry(rr + 0.05, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xd8d8d0, wireframe: true })); frame.position.copy(dome.position); root.add(frame);
    for (let i = 0; i < 12; i++) { const a = r() * 6.28, d = r() * rr * 0.6; b.sphere('leaf', [x + Math.cos(a) * d, D + 2 + r() * 3, z + Math.sin(a) * d], 1.4 + r() * 1.4, { color: [0x3a6a2a, 0x5a8a3a, 0x2f5a24][i % 3], seg: 8 }); }
    b.box('plaster', [x - rr - 0.5, D + 1.5, z], [1, 3, 3], { color: 0xd8d0c0, collide: false }); L(x, D + 6, z, 0xd0ffd0, 2, rr * 1.5);
    Vx.disposers.push(() => { dome.geometry.dispose(); frame.geometry.dispose(); frame.material.dispose(); });
    S.greenhouses.push(new THREE.Vector3(x - rr - 1.5, D, z));
  }
  // ---------------------------------------------------------------- apartments (east blocks with balconies)
  for (let k = 0; k < 4; k++) { const x = X + 52, z = -150 + k * 44; b.box('plaster', [x, D + 12, z], [26, 24, 30], { color: [0xe0d4c0, 0xd4c4ac, 0xe8dcc8, 0xc8bca4][k], tex: 3 });
    for (let f = 1; f < 6; f++) for (let j = 0; j < 4; j++) { b.box('glassLit', [x - 13.05, D + f * 4, z - 10.5 + j * 7], [0.08, 1.8, 2.4], { collide: false, ao: false }); b.box('plaster', [x - 13.8, D + f * 4 - 1.1, z - 10.5 + j * 7], [1.5, 0.15, 3], { color: 0xd8d0c0, collide: false }); } }
  // ---------------------------------------------------------------- the embassy (north end of the boulevard): hall, archive, steps
  const E = new THREE.Vector3(X, D, -175); S.embassy = E;
  const EW = 34, ED = 26, EH = 12;
  b.box('plaster', [E.x, D + EH / 2, E.z - ED / 2], [EW, EH, 0.6], { color: 0xece4d4, tex: 3 });
  for (const sx of [-1, 1]) b.box('plaster', [E.x + sx * EW / 2, D + EH / 2, E.z], [0.6, EH, ED], { color: 0xece4d4, tex: 3 });
  for (const sx of [-1, 1]) b.box('plaster', [E.x + sx * (EW / 4 + 2), D + EH / 2, E.z + ED / 2], [EW / 2 - 4, EH, 0.6], { color: 0xece4d4, tex: 3 });
  b.box('plaster', [E.x, D + EH - 1.5, E.z + ED / 2], [8, 3, 0.6], { color: 0xece4d4, tex: 3 });
  b.box('plaster', [E.x, D + EH + 0.3, E.z], [EW + 1, 0.6, ED + 1], { color: 0xd8d0c0 });
  { const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x6a8a7a, metalness: 0.6, roughness: 0.4 })); dome.position.set(E.x, D + EH + 0.6, E.z); root.add(dome); Vx.disposers.push(() => dome.geometry.dispose()); }
  for (let k = -3; k <= 3; k++) b.cyl('plaster', [E.x + k * 3.6, D + 5, E.z + ED / 2 + 3], 0.45, 10, { color: 0xf0e8d8, seg: 14, collide: true });
  b.box('plaster', [E.x, D + 10.4, E.z + ED / 2 + 3], [26, 0.8, 3], { color: 0xe0d8c8, collide: false });
  b.box('tiles', [E.x, D + 0.1, E.z], [EW - 1, 0.2, ED - 1], { color: 0x8a6a5a, tex: 1.5 });
  sign(game, root, 'EMBASSY OF THE WALKING CITIES', [E.x, D + 11.2, E.z + ED / 2 + 4.6], { neon: false, w: 10, h: 0.7, color: '#2a2622', bg: '#e8dcc0' });
  // inside: the reception hall (a long table, banners of both cities), and the archive room off to the east
  b.box('wood', [E.x - 4, D + 0.85, E.z - 2], [12, 0.12, 2.4], { color: 0x5a3a28 });
  for (const sx of [-1, 1]) b.box('fabric', [E.x + sx * 8, D + 7, E.z - ED / 2 + 0.4], [3, 6, 0.06], { color: sx > 0 ? 0x2a4a6a : 0x8a3a22, collide: false, ao: false });
  for (const [x, z] of [[E.x - 8, E.z - 4], [E.x + 4, E.z - 4], [E.x - 2, E.z + 6]]) L(x, D + 8, z, 0xffe0b0, 3.4, 18);
  { const z0 = E.z - ED / 2, z1 = E.z + ED / 2, d0 = E.z + 6 - 1.1, d1 = E.z + 6 + 1.1;                              // the archive wall, with a doorway
    b.box('plaster', [E.x + 10, D + EH / 2, (z0 + d0) / 2], [0.4, EH, d0 - z0], { color: 0xe4dccc, tex: 3 });
    b.box('plaster', [E.x + 10, D + EH / 2, (d1 + z1) / 2], [0.4, EH, z1 - d1], { color: 0xe4dccc, tex: 3 });
    b.box('plaster', [E.x + 10, D + (EH + 2.6) / 2, E.z + 6], [0.4, EH - 2.6, 2.2], { color: 0xe4dccc, tex: 3 });
    b.box('wood', [E.x + 10.25, D + 1.3, E.z + 7.0], [0.08, 2.6, 0.12], { color: 0x5a3a28, collide: false }); }
  S.archiveDoor = new THREE.Vector3(E.x + 8.5, D, E.z + 6); S.archive = new THREE.Vector3(E.x + 14, D, E.z - 6);
  b.box('wood', [E.x + 14, D + 0.85, E.z - 7], [3, 0.1, 1.4], { color: 0x4a3020 }); b.box('wood', [E.x + 14, D + 0.42, E.z - 7], [2.8, 0.84, 1.2], { color: 0x3a2818 });
  b.box('darkSteel', [E.x + 14, D + 1.05, E.z - 7], [0.6, 0.3, 0.45], { color: 0x5a4a32 });                       // the document case
  S.caseW = new THREE.Vector3(E.x + 14, D + 1.1, E.z - 7);
  L(E.x + 14, D + 3, E.z - 5, 0xffd0a0, 1.6, 8);
  S.hallIn = new THREE.Vector3(E.x - 2, D, E.z + 4); S.steps = new THREE.Vector3(E.x, D, E.z + ED / 2 + 7);
  // ---------------------------------------------------------------- the rooftop (a tower by the west promenade, reached by its lift)
  const RT = new THREE.Vector3(VS.x0 + 30, D, 60); const RH = 48;
  b.box('facade', [RT.x, D + RH / 2, RT.z], [18, RH, 18], { tex: 7, color: 0xd0c4b0 });
  b.box('plaster', [RT.x, D + RH + 0.25, RT.z], [18.6, 0.5, 18.6], { color: 0xc8c0b0 });
  for (const [a, c] of [[[RT.x - 9, D + RH + 0.5, RT.z - 9], [RT.x + 9, D + RH + 0.5, RT.z - 9]], [[RT.x + 9, D + RH + 0.5, RT.z - 9], [RT.x + 9, D + RH + 0.5, RT.z + 9]], [[RT.x + 9, D + RH + 0.5, RT.z + 9], [RT.x - 9, D + RH + 0.5, RT.z + 9]], [[RT.x - 9, D + RH + 0.5, RT.z + 9], [RT.x - 9, D + RH + 0.5, RT.z - 9]]]) b.railing(a, c, { h: 1.1 });
  b.box('wood', [RT.x - 6.5, D + RH + 0.95, RT.z], [0.6, 0.12, 3], { color: 0x6a5238 });                         // a bench facing Meridian
  b.box('plaster', [RT.x + 6, D + RH + 1.6, RT.z + 6], [3, 2.2, 3], { color: 0xd0c8b8 });                         // the lift house
  for (let k = 0; k < 5; k++) b.box('wood', [RT.x + 2, D + RH + 0.5 + 0.02, RT.z - 6 + k * 0.4], [2, 0.02, 0.2], { color: 0x6a5238, collide: false });
  L(RT.x - 6, D + RH + 2, RT.z, 0xffc890, 0.8, 8);
  S.roofLift = new THREE.Vector3(RT.x + 9.6, D, RT.z + 6); S.roofTop = new THREE.Vector3(RT.x + 4.4, D + RH + 0.5, RT.z + 4); S.roofBench = new THREE.Vector3(RT.x - 6.0, D + RH + 0.5, RT.z);
  S.roofLook = new THREE.Vector3(150, -20, 60);
  b.box('darkSteel', [RT.x + 9.05, D + 1.4, RT.z + 6], [0.1, 2.6, 1.8], { color: 0x8a7a5a, collide: false });     // the lift doors
  // ---------------------------------------------------------------- the west quarter: a park and townhouses between promenade and boulevard
  { const PK = new THREE.Vector3(VS.x0 + 90, D, 30);
    b.box('leaf', [PK.x, D + 0.06, PK.z], [70, 0.12, 80], { color: 0x4a6a34, collide: false, ao: false, tex: 3 });
    for (const [x0, z0, x1, z1] of [[PK.x - 35, PK.z, PK.x + 35, PK.z], [PK.x, PK.z - 40, PK.x, PK.z + 40]]) { const len = Math.hypot(x1 - x0, z1 - z0); b.box('tiles', [(x0 + x1) / 2, D + 0.13, (z0 + z1) / 2], [x0 === x1 ? 4 : len, 0.04, x0 === x1 ? len : 4], { color: 0xb8a888, collide: false, ao: false }); }
    for (let i = 0; i < 26; i++) { const x = PK.x + (r() - 0.5) * 64, z = PK.z + (r() - 0.5) * 74; if (Math.abs(x - PK.x) < 4 || Math.abs(z - PK.z) < 4) continue; const h = 4 + r() * 4; b.cyl('wood', [x, D + h * 0.35, z], 0.18, h * 0.7, { r2: 0.12, color: 0x4a3a2a, seg: 7, collide: true }); b.sphere('leaf', [x, D + h * 0.8, z], 1.6 + r() * 1.4, { color: [0x3a6a2a, 0x4a7a30, 0x2f5a24][i % 3], seg: 9, sy: 0.85 }); }
    b.cyl('concrete', [PK.x, D + 0.4, PK.z], 3, 0.8, { color: 0xd8d0c0, seg: 20, collide: true }); b.cyl('glass', [PK.x, D + 0.75, PK.z], 2.7, 0.1, { seg: 20 });
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; b.box('wood', [PK.x + Math.cos(a) * 6, D + 0.45, PK.z + Math.sin(a) * 6], [1.8, 0.1, 0.5], { ry: -a + Math.PI / 2, color: 0x6a5238 }); }
    for (const [x, z] of [[PK.x - 20, PK.z - 20], [PK.x + 20, PK.z + 20], [PK.x - 20, PK.z + 20], [PK.x + 20, PK.z - 20]]) { b.tube('darkSteel', [x, D, z], [x, D + 4.5, z], 0.07, { color: 0x2a2a2a }); b.sphere('lampWarm', [x, D + 4.7, z], 0.25, { seg: 8 }); L(x, D + 4.6, z); }
    S.park = PK;
    for (let k = 0; k < 6; k++) { const x = VS.x0 + 48 + k * 16, z = 120; b.box('plaster', [x, D + 7, z], [14, 14, 12], { color: [0xd8c8b0, 0xc8b8a0, 0xe0d0b8][k % 3], tex: 3 });
      for (let f = 0; f < 3; f++) for (let j = 0; j < 3; j++) b.box('glassLit', [x - 4.5 + j * 4.5, D + 2.2 + f * 4.2, z - 6.05], [1.6, 1.8, 0.08], { collide: false, ao: false });
      b.box('rust', [x, D + 14.6, z], [14.4, 1.2, 12.4], { color: 0x7a4a32 }); }
    for (let k = 0; k < 6; k++) { const x = VS.x0 + 48 + k * 16, z = -10; b.box('plaster', [x, D + 6, z], [14, 12, 10], { color: [0xe0d4c0, 0xd0c0a8, 0xd8ccb4][k % 3], tex: 3 }); for (let j = 0; j < 3; j++) b.box('glassLit', [x - 4.5 + j * 4.5, D + 2.4, z + 5.05], [1.6, 2.4, 0.08], { collide: false, ao: false }); }
  }
  // ---------------------------------------------------------------- lanes for the crowds
  S.lanes = {
    boulevardW: [...Array(9)].map((_, i) => new THREE.Vector3(X - 8, D, -160 + i * 40)), boulevardE: [...Array(9)].map((_, i) => new THREE.Vector3(X + 8, D, -160 + i * 40)),
    station: [...Array(6)].map((_, i) => new THREE.Vector3(VS.x0 + 24 + i * 30, D, -40)), promenade: [...Array(8)].map((_, i) => new THREE.Vector3(VS.x0 + 10, D, -180 + i * 50)),
  };
  for (let i = 0; i < 20; i++) crate(b, [X + 30 + r() * 10, D, -40 + r() * 20], 0.8, { ry: r() * 3 });
  b.finalize();
  Vx.offs.push(game.add((dt) => Vx.anim.forEach(f => f(dt))));
  Vx.colliders = cols;
  Vx.dispose = () => {
    for (const c of cols) { try { const body = c.parent(); P.world.removeCollider(c, false); if (body) P.world.removeRigidBody(body); } catch { /* */ } }
    Vx.offs.forEach(f => f()); Vx.disposers.forEach(f => f()); Vx.lamps.forEach(s => (s.on = false)); game.lights.spots = game.lights.spots.filter(s => !Vx.lamps.includes(s));
    root.traverse(o => o.geometry?.dispose?.()); root.removeFromParent();
  };
  return Vx;
}
