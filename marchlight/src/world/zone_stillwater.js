// CHAPTER FOUR — STILLWATER. A city that stopped in the rain, decades ago, and never started again:
// a main street of shops and flats, a tram halted mid-street, cars nose to tail, people caught mid-gesture,
// rain hanging in the air. A square with a frozen fountain and the town hall archive; past it the works,
// a hall of presses over a conveyor that still lurch now and then. Built in the ground frame (surface.js).
import * as THREE from 'three';
import { Zone, car, bush } from './surface.js';
import { sign, poster, crate, barrel } from './props.js';
import { rng } from '../core/util.js';

export const SW = { x: 60, edge: 40, square: -90, works: -160 };

export function buildStillwater(game) {
  const Z = new Zone(game, 'stillwater'), b = Z.b, r = rng(4444), V = (x, dy, z) => Z.v(x, dy, z);
  Z.terrain(-30, 160, -230, 80, 4);
  Z.offs.push(game.ground.addMask(-120, 240, -300, 160));
  const S = Z.spots, X = SW.x;
  // ---------------------------------------------------------------- the street
  for (let z = 60; z > -150; z -= 6) b.box('concrete', [X, Z.gy(X, z) + 0.03, z], [14, 0.08, 6.05], { color: 0x3e3e40, collide: false, ao: false, tex: 4 });
  for (const sx of [-1, 1]) for (let z = 60; z > -150; z -= 6) b.box('concrete', [X + sx * 8.5, Z.gy(X + sx * 8.5, z) + 0.12, z], [3, 0.24, 6.05], { color: 0x6a6866, ao: false, tex: 3 });
  for (let z = 50; z > -140; z -= 7) b.box('paint', [X, Z.gy(X, z) + 0.08, z], [0.18, 0.01, 3], { color: 0xc8c0a0, collide: false, ao: false });
  // buildings both sides: shops at street level, flats above, dark windows
  const shops = ['BAKERY', 'PHARMACY', 'HARDWARE', 'CAFÉ AURORE', 'TAILOR', 'BOOKS', 'GROCER', 'CINEMA', 'POST OFFICE', 'LAUNDRY', 'RADIO REPAIR', 'FLOWERS'];
  Z.doors = [];
  let si = 0;
  for (const sx of [-1, 1]) for (let z = 46; z > -66; z -= 0) {
    const w = 9 + Math.floor(r() * 6), h = 10 + Math.floor(r() * 4) * 3.5, x = X + sx * (10 + 5), cz = z - w / 2;
    const y = Z.gy(x, cz), col = [0x6a5a50, 0x7a6a5a, 0x5a5a5e, 0x8a7a68, 0x6a5040][Math.floor(r() * 5)];
    b.box('brick', [x, y + h / 2, cz], [10, h, w - 0.4], { color: col, tex: 2 });
    const face = X + sx * 10.02;
    for (let f = 1; f < h / 3.5 - 0.5; f++) for (let k = 0; k < Math.floor(w / 2.6); k++) b.box('glassDark', [face, y + 1.2 + f * 3.5, cz - w / 2 + 1.6 + k * 2.6], [0.08, 1.5, 1.1], { collide: false });
    b.box('glassDark', [face, y + 1.6, cz], [0.08, 2.4, w - 3], { collide: false });
    b.box('fabric', [X + sx * 9.0, y + 3.2, cz], [2.2, 0.08, w - 2], { rz: sx * 0.25, color: [0x7a3a2a, 0x2a4a5a, 0x5a6a3a, 0x6a4a6a][si % 4], collide: false, ao: false });
    sign(game, Z.root, shops[si % shops.length], [X + sx * 9.95, y + 3.9, cz], { neon: false, w: Math.min(5, w - 3), h: 0.6, ry: sx > 0 ? -Math.PI / 2 : Math.PI / 2, color: '#d8d0c0', bg: '#2a2622' });
    Z.doors.push({ pos: V(X + sx * 9.4, 0, cz - w / 2 + 1.4), yaw: sx > 0 ? Math.PI / 2 : -Math.PI / 2 });
    si++; z -= w;
    if (z < -66) break;
  }
  // street lamps (dead), a tram stopped mid-street, the traffic it stopped
  for (let z = 44; z > -66; z -= 14) for (const sx of [-1, 1]) { const x = X + sx * 7.6; b.tube('darkSteel', [x, Z.gy(x, z), z], [x, Z.gy(x, z) + 5.2, z], 0.08, { color: 0x2a2a2a }); b.box('darkSteel', [x - sx * 0.5, Z.gy(x, z) + 5.2, z], [1.0, 0.15, 0.3], { color: 0x2a2a2a, collide: false }); }
  { const tz = -20, ty = Z.gy(X - 2, tz);
    b.box('paint', [X - 2.2, ty + 1.7, tz], [2.6, 2.8, 12], { color: 0x8a2a22, round: 0.2 });
    for (let k = 0; k < 5; k++) b.box('glassDark', [X - 3.52, ty + 2.2, tz - 4.4 + k * 2.2], [0.05, 1.1, 1.6], { collide: false });
    b.box('paint', [X - 2.2, ty + 3.2, tz], [2.4, 0.2, 11.6], { color: 0xd8c8a0, collide: false });
    b.tube('darkSteel', [X - 2.2, ty + 3.3, tz], [X - 2.2, ty + 5.4, tz - 1], 0.04, { color: 0x2a2a2a });
    S.tram = V(X - 2.2, 0, tz); }
  for (const [x, z, ry] of [[X + 3, 30, Math.PI], [X - 3.2, 12, 0], [X + 3.4, 4, Math.PI + 0.05], [X + 2.8, -36, Math.PI], [X - 3, -46, 0.06], [X + 3.2, -58, Math.PI]]) car(Z, x, Z.gy(x, z), z, ry, { overgrown: false });
  // the city sign at the edge
  { const x = X + 9, z = 58, y = Z.gy(x, z); b.box('darkSteel', [x, y + 1.6, z], [0.15, 3.2, 0.15], { color: 0x2a2a2a }); sign(game, Z.root, 'STILLWATER', [x, y + 3.2, z + 0.1], { neon: false, w: 3.6, h: 0.9, color: '#e8e0d0', bg: '#2a4a3a' }); }
  // ---------------------------------------------------------------- the square: fountain, clock, town hall
  const SQ = V(X, 0, SW.square); S.square = SQ;
  b.box('tiles', [SQ.x, SQ.y + 0.05, SQ.z], [36, 0.1, 40], { color: 0x8a8478, collide: false, ao: false, tex: 2 });
  b.cyl('concrete', [SQ.x, SQ.y + 0.4, SQ.z], 4.2, 0.8, { color: 0x8a8478, seg: 24, collide: true });
  b.cyl('concrete', [SQ.x, SQ.y + 1.6, SQ.z], 0.5, 2.4, { color: 0x8a8478, seg: 12, collide: true });
  { // water frozen mid-arc: arcs of motionless droplets
    const pts = []; for (let a = 0; a < 16; a++) { const ang = a / 16 * Math.PI * 2; for (let k = 0; k < 18; k++) { const u = k / 18; pts.push(SQ.x + Math.cos(ang) * u * 3.6, SQ.y + 2.8 + Math.sin(u * Math.PI) * 1.6 - u * 1.5, SQ.z + Math.sin(ang) * u * 3.6); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const m = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xbfd8ff, size: 0.09, transparent: true, opacity: 0.9 })); Z.root.add(m); Z.disposers.push(() => { g.dispose(); m.material.dispose(); }); }
  const TH = V(SQ.x, 0, SQ.z - 26); S.hall = TH;
  b.box('plaster', [TH.x - 9, TH.y + 6, TH.z - 4], [8, 12, 10], { color: 0xb8ac98, tex: 3 }); b.box('plaster', [TH.x + 9, TH.y + 6, TH.z - 4], [8, 12, 10], { color: 0xb8ac98, tex: 3 });
  b.box('plaster', [TH.x, TH.y + 10, TH.z - 4], [10, 4, 10], { color: 0xb8ac98, tex: 3 });
  b.box('plaster', [TH.x, TH.y + 4, TH.z - 8.8], [10, 8, 0.4], { color: 0xb8ac98, tex: 3 });
  for (const sx of [-1, 1]) b.box('plaster', [TH.x + sx * 4.8, TH.y + 4, TH.z - 4], [0.4, 8, 10], { color: 0xb8ac98, tex: 3 });
  for (let k = -2; k <= 2; k++) b.cyl('plaster', [TH.x + k * 2.2, TH.y + 3.2, TH.z + 1.4], 0.35, 6.4, { color: 0xd8ccb8, seg: 12, collide: true });
  b.box('plaster', [TH.x, TH.y + 6.6, TH.z + 1.4], [12, 0.6, 1.4], { color: 0xc8bca8, collide: false });
  b.box('tiles', [TH.x, TH.y + 0.1, TH.z - 4], [9.2, 0.2, 9.6], { color: 0x6a6460, ao: false });
  // the clock: stopped at 4:52
  { const ck = V(TH.x, 10.6, TH.z + 1.1); b.cyl('paint', [ck.x, ck.y, ck.z], 1.3, 0.2, { rx: Math.PI / 2, color: 0xe8e0d0, seg: 24 });
    b.box('darkSteel', [ck.x - 0.15, ck.y + 0.45, ck.z + 0.12], [0.08, 0.9, 0.04], { rz: 0.4, color: 0x1a1a1a, collide: false }); b.box('darkSteel', [ck.x + 0.3, ck.y - 0.1, ck.z + 0.12], [0.08, 0.6, 0.04], { rz: -2.0, color: 0x1a1a1a, collide: false }); }
  sign(game, Z.root, 'CITY OF STILLWATER · TOWN HALL', [TH.x, TH.y + 7.6, TH.z + 2.15], { neon: false, w: 7, h: 0.6, color: '#2a2622', bg: '#d8ccb0' });
  // inside: the archive desk and its terminal
  b.box('wood', [TH.x + 2.4, TH.y + 0.85, TH.z - 7], [3, 0.1, 1.2], { color: 0x5a3a28 }); b.box('wood', [TH.x + 2.4, TH.y + 0.42, TH.z - 7], [2.8, 0.84, 1.0], { color: 0x4a3020 });
  b.box('darkSteel', [TH.x + 2.0, TH.y + 1.2, TH.z - 7.2], [0.7, 0.5, 0.5], { color: 0x3a3a38 });
  Z.screen = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.36), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.02, 0.05, 0.03) })); Z.screen.position.set(TH.x + 2.0, TH.y + 1.22, TH.z - 6.94); Z.root.add(Z.screen);
  for (let k = 0; k < 6; k++) b.box('wood', [TH.x - 3.6, TH.y + 0.4 + k * 0.5, TH.z - 8.2], [1.6, 0.04, 0.6], { color: 0x5a3a28, collide: false });
  S.terminal = V(TH.x + 2.0, 1.2, TH.z - 6.6); S.plaque = V(SQ.x + 4.6, 0, SQ.z + 4.6);
  b.box('darkSteel', [S.plaque.x, S.plaque.y + 0.7, S.plaque.z], [0.9, 1.4, 0.2], { ry: -0.8, color: 0x5a4a32 });
  poster(game, Z.root, ['STILLWATER', 'pop. 118,000', 'City of Rain', 'founded on the', 'old reservoir'], [S.plaque.x - 0.08, S.plaque.y + 0.95, S.plaque.z + 0.09], { ry: -0.8, w: 0.7, h: 0.95, title: 'WELCOME', accent: '#2a4a3a' });
  // the square's sides
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const x = SQ.x + sx * 23, z = SQ.z + 14 - k * 12; b.box('brick', [x, Z.gy(x, z) + 7, z], [10, 14, 11], { color: 0x6a5a50, tex: 2 }); for (let f = 0; f < 3; f++) for (let j = 0; j < 3; j++) b.box('glassDark', [x - sx * 5.02, Z.gy(x, z) + 2 + f * 4, z - 3.5 + j * 3.5], [0.08, 1.6, 1.2], { collide: false }); }
  // ---------------------------------------------------------------- the works: a hall of presses
  const W = V(X, 0, SW.works); S.works = W;
  const HW = 16, HL = 46, HH = 10, wy = Z.gy(W.x, W.z);
  for (const sx of [-1, 1]) b.box('corrugated', [W.x + sx * HW / 2, wy + HH / 2, W.z], [0.3, HH, HL], { color: 0x5a5e5a, tex: 3 });
  b.box('corrugated', [W.x, wy + HH / 2, W.z - HL / 2], [HW, HH, 0.3], { color: 0x5a5e5a, tex: 3 });
  for (const sx of [-1, 1]) b.box('corrugated', [W.x + sx * (HW / 4 + 1.5), wy + HH / 2, W.z + HL / 2], [HW / 2 - 3, HH, 0.3], { color: 0x5a5e5a, tex: 3 });
  b.box('corrugated', [W.x, wy + HH, W.z], [HW + 0.4, 0.3, HL + 0.4], { color: 0x4a4e4a, tex: 3 });
  for (let k = 0; k < 6; k++) b.box('glassDark', [W.x, wy + HH - 0.05, W.z - HL / 2 + 4 + k * 7.6], [HW - 4, 0.1, 2], { collide: false });
  // the conveyor down the middle and the presses over it
  b.box('darkSteel', [W.x, wy + 0.5, W.z], [3, 1.0, HL - 4], { color: 0x2a2a2a });
  for (let k = 0; k < 40; k++) b.box('rubber', [W.x, wy + 1.02, W.z - HL / 2 + 2.5 + k * 1.05], [2.8, 0.04, 0.9], { color: 0x1a1a1a, collide: false });
  Z.presses = [];
  for (let k = 0; k < 4; k++) {
    const pz = W.z + HL / 2 - 9 - k * 9;
    for (const sx of [-1, 1]) b.box('rust', [W.x + sx * 2.6, wy + 3.5, pz], [0.8, 7, 1.6], { color: 0x8a4a2a });
    b.box('rust', [W.x, wy + 7.2, pz], [6, 1.2, 1.8], { color: 0x8a4a2a });
    const ram = new THREE.Group(); ram.position.set(W.x, wy + 4.6, pz); Z.root.add(ram);
    const mm = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.6, 2.6), new THREE.MeshStandardMaterial({ color: 0x3a3a3a, metalness: 0.7, roughness: 0.4 })); ram.add(mm);
    const hz = new THREE.Mesh(new THREE.BoxGeometry(4.22, 0.25, 2.62), game.materials.hazard); hz.position.y = -0.7; ram.add(hz);
    mm.castShadow = true;
    Z.presses.push({ ram, pz, up: wy + 4.6, down: wy + 1.9, y: wy + 4.6, phase: 'up', t: 0 });
    Z.disposers.push(() => { mm.geometry.dispose(); mm.material.dispose(); hz.geometry.dispose(); });
  }
  // a walkway beside the conveyor and crates on it frozen mid-trip
  for (let k = 0; k < 8; k++) crate(b, [W.x + (r() - 0.5) * 1.6, wy + 1.04, W.z - HL / 2 + 4 + k * 5.2], 0.8, { ry: r() });
  for (let i = 0; i < 6; i++) barrel(b, [W.x + (r() < 0.5 ? -5.5 : 5.5), wy, W.z - HL / 2 + 3 + i * 7]);
  // the works office at the far end, up a stair
  const O = V(W.x + 5, 0, W.z - HL / 2 + 4); S.office = O;
  b.box('concrete', [O.x, wy + 3.0, O.z], [5, 0.3, 6], { color: 0x6a6866 });
  b.stairs('concrete', [O.x - 3.6, wy, O.z + 6], 6, 3.15, 1.4, Math.PI, { color: 0x6a6866, rails: true });
  b.box('wood', [O.x + 0.6, wy + 3.9, O.z - 1.8], [2.4, 0.08, 1.0], { color: 0x5a3a28 }); b.box('wood', [O.x + 0.6, wy + 3.5, O.z - 1.8], [2.3, 0.8, 0.9], { color: 0x4a3020 });
  b.box('paint', [O.x + 0.4, wy + 4.0, O.z - 1.8], [0.5, 0.06, 0.36], { color: 0x2a4a3a, collide: false }); // the logbook
  S.logbook = V(O.x + 0.4, wy + 4.0 - Z.gy(O.x, O.z), O.z - 1.8); S.logbookW = new THREE.Vector3(O.x + 0.4, wy + 4.0, O.z - 1.8);
  poster(game, Z.root, ['HARVEST TRIAL', 'NO. 7', 'AUTHORISED', 'PERSONNEL', 'ONLY'], [O.x + 2.45, wy + 4.6, O.z - 1], { ry: -Math.PI / 2, w: 0.8, h: 1.1, title: 'NOTICE', accent: '#a8322a' });
  S.worksDoor = V(W.x, 0, W.z + HL / 2 + 2);
  // ---------------------------------------------------------------- the rain that never landed
  { const n = 9000, pos = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) { const x = X + (r() - 0.5) * 40, z = 60 - r() * 230, y = Z.gy(x, z) + r() * 14; pos.set([x, y, z, x + 0.01, y - 0.35, z], i * 6); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x9ab0c8, transparent: true, opacity: 0.45 })); m.frustumCulled = false; Z.root.add(m);
    Z.rain = m; Z.disposers.push(() => { g.dispose(); m.material.dispose(); }); }
  // a dog mid-leap, a bird mid-flight, an umbrella in the air
  { const d = V(X + 4, 1.1, 18); b.box('wood', [d.x, d.y, d.z], [0.35, 0.38, 0.95], { rx: -0.35, color: 0x6a4a30, collide: false, round: 0.08 }); b.box('wood', [d.x, d.y + 0.35, d.z - 0.55], [0.28, 0.3, 0.38], { rx: -0.2, color: 0x6a4a30, collide: false, round: 0.06 });
    for (const [lx, lz, a] of [[-0.12, -0.3, -0.9], [0.12, -0.3, -0.9], [-0.12, 0.35, 0.9], [0.12, 0.35, 0.9]]) b.box('wood', [d.x + lx, d.y - 0.28, d.z + lz], [0.08, 0.4, 0.08], { rx: a, color: 0x5a3a24, collide: false });
    const u = V(X - 5, 2.6, -4); b.cyl('fabric', [u.x, u.y, u.z], 0.9, 0.35, { r2: 0.02, rz: 0.6, rx: 0.3, color: 0x2a3a6a, seg: 10 }); b.tube('darkSteel', [u.x, u.y, u.z], [u.x + 0.4, u.y - 0.8, u.z + 0.2], 0.02, { color: 0x1a1a1a }); }
  S.edge = V(X + 1.5, 0, 54); S.mule = V(X - 4, 0, 62);
  for (let i = 0; i < 20; i++) bush(Z, X + (r() < 0.5 ? -1 : 1) * (13 + r() * 30), Z.gy(X, 70) + 0.3, 70 - r() * 20, 0.6 + r() * 0.6);
  Z.finalize();
  return Z;
}
