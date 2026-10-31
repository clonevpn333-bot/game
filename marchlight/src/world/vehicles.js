// Vehicles of the Long Road, built from blocks: the convoy's haulers, market trailers and workshop vans,
// and the raiders' buggies and harpoon rig. Each is a group (front toward -z) with spinning wheels, a list
// of collider boxes in its own frame, and named spots (a deck to stand on, raider places, a harpoon).
import * as THREE from 'three';
import { Builder } from './builder.js';

class Lite extends Builder { constructor(game, parent) { super(game, parent, { cell: 1000 }); } }
const tyreG = new THREE.CylinderGeometry(1, 1, 1, 18); tyreG.rotateZ(Math.PI / 2);
const tyreM = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }), hubM = new THREE.MeshStandardMaterial({ color: 0x8a8a84, roughness: 0.4, metalness: 0.8 });
function wheel(grp, x, y, z, r, w) {
  const g = new THREE.Group(); g.position.set(x, y, z); grp.add(g);
  const t = new THREE.Mesh(tyreG, tyreM); t.scale.set(w, r, r); t.castShadow = true; g.add(t);
  const h = new THREE.Mesh(tyreG, hubM); h.scale.set(w + 0.02, r * 0.45, r * 0.45); g.add(h);
  for (let k = 0; k < 4; k++) { const b = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, r * 0.18, r * 0.9), tyreM); b.rotation.x = k * Math.PI / 4; g.add(b); }
  g.userData.r = r; return g;
}
function make(game, kind, o = {}) {
  const group = new THREE.Group(); group.name = 'vehicle:' + kind;
  const b = new Lite(game, group), V = { group, wheels: [], cols: [], spots: {}, kind };
  const box = (mat, p, s, opt = {}) => b.box(mat, p, s, { collide: false, ...opt });
  const col = (p, s) => V.cols.push({ type: 'box', hx: s[0] / 2, hy: s[1] / 2, hz: s[2] / 2, pos: { x: p[0], y: p[1], z: p[2] } });
  const paint = o.color ?? 0x6f7d50;
  if (kind === 'hauler') {
    box('paint', [0, 1.9, -3.0], [2.5, 1.6, 2.2], { color: paint, round: 0.14 });                 // cab
    box('glassDark', [0, 2.25, -4.12], [2.2, 0.7, 0.05], { rx: 0.25 });
    box('darkSteel', [0, 0.85, 0], [1.8, 0.4, 8.6], { color: 0x2a2a2a });                         // frame
    box('wood', [0, 1.45, 1.1], [2.6, 0.18, 6.0], { color: 0x6a5238, tex: 1 });                     // flatbed
    for (const sx of [-1, 1]) { box('steel', [sx * 1.27, 1.85, 1.1], [0.08, 0.06, 6.0], { color: 0x9a9a92 }); for (let k = 0; k < 5; k++) box('steel', [sx * 1.27, 1.66, -1.7 + k * 1.4], [0.08, 0.42, 0.08], { color: 0x9a9a92 }); }
    box('paint', [0, 2.0, -1.82], [2.5, 1.0, 0.12], { color: paint });                               // headboard
    for (let i = 0; i < 3; i++) box('wood', [-0.6 + i * 0.5, 1.9, 3.2 - i * 0.6], [0.8, 0.8, 0.8], { color: 0xb8a080, round: 0.03 }); // cargo to hide behind
    box('lampWarm', [0.8, 1.4, -4.15], [0.35, 0.2, 0.05], { ao: false }); box('lampWarm', [-0.8, 1.4, -4.15], [0.35, 0.2, 0.05], { ao: false });
    for (const [x, z] of [[-1.25, -3.1], [1.25, -3.1], [-1.25, 1.6], [1.25, 1.6], [-1.25, 3.0], [1.25, 3.0]]) V.wheels.push(wheel(group, x, 0.55, z, 0.55, 0.45));
    col([0, 1.4, 1.1], [2.6, 0.2, 6.0]); col([0, 1.9, -3.0], [2.5, 1.6, 2.2]); col([0, 2.0, -1.82], [2.5, 1.0, 0.12]);
    for (const sx of [-1, 1]) col([sx * 1.27, 1.75, 1.1], [0.1, 0.45, 6.0]);
    col([-0.6, 1.9, 3.2], [0.8, 0.8, 0.8]); col([-0.1, 1.9, 2.6], [0.8, 0.8, 0.8]); col([0.4, 1.9, 2.0], [0.8, 0.8, 0.8]);
    V.deckY = 1.55; V.spots.deck = new THREE.Vector3(0.5, 1.55, 0.6);
  } else if (kind === 'trailer') {
    box('paint', [0, 2.2, 0], [2.6, 2.6, 7.5], { color: paint, round: 0.12, tex: 2 });
    box('fabric', [0, 3.6, 0], [3.4, 0.12, 7.8], { color: o.awning ?? 0xc85a3a, ao: false });
    box('darkSteel', [0, 0.75, 0], [1.8, 0.35, 8.4], { color: 0x2a2a2a });
    box('darkSteel', [0, 0.95, -4.4], [0.3, 0.2, 1.2], { color: 0x2a2a2a });                       // hitch
    for (let k = 0; k < 6; k++) box('lampWarm', [1.32, 3.25, -3 + k * 1.2], [0.06, 0.12, 0.12], { ao: false });
    for (const [x, z] of [[-1.25, 1.6], [1.25, 1.6], [-1.25, 2.8], [1.25, 2.8]]) V.wheels.push(wheel(group, x, 0.5, z, 0.5, 0.4));
    col([0, 2.2, 0], [2.6, 2.6, 7.5]);
    V.spots.roof = new THREE.Vector3(0, 3.55, 0); V.spots.hitch = new THREE.Vector3(0, 1.0, -4.6); V.spots.tail = new THREE.Vector3(0, 2.0, 3.8);
  } else if (kind === 'van') {
    box('paint', [0, 1.9, 0], [2.4, 2.4, 6], { color: paint, round: 0.18 });
    box('glassDark', [0, 2.4, -3.02], [2.0, 0.8, 0.05]);
    box('corrugated', [0, 3.3, 0.6], [2.2, 0.5, 4], { color: 0x6a6a64 });
    box('lampWarm', [0.8, 1.2, -3.02], [0.3, 0.18, 0.04], { ao: false }); box('lampWarm', [-0.8, 1.2, -3.02], [0.3, 0.18, 0.04], { ao: false });
    for (const [x, z] of [[-1.15, -2], [1.15, -2], [-1.15, 2], [1.15, 2]]) V.wheels.push(wheel(group, x, 0.5, z, 0.5, 0.4));
    col([0, 1.9, 0], [2.4, 2.4, 6]);
  } else if (kind === 'buggy') {
    // a raider buggy: open frame, roll cage, oversized wheels, scrap plates and spikes
    const rust = o.color ?? 0x8a4a2a;
    box('darkSteel', [0, 0.95, 0], [1.9, 0.3, 4.2], { color: 0x2a2a2a });
    box('rust', [0, 1.25, -1.4], [1.7, 0.5, 1.2], { color: rust, tex: 1 });                           // engine block, front
    box('rust', [0, 1.15, 1.0], [2.0, 0.12, 2.2], { color: 0x5a4a3a });                               // rear deck
    for (const [ax, az, bx, bz] of [[-0.8, -0.4, -0.7, 0.6], [0.8, -0.4, 0.7, 0.6]]) b.tube('steel', [ax, 1.1, az], [bx, 2.4, bz], 0.05, { color: 0x6a6a64 });
    b.tube('steel', [-0.7, 2.4, 0.6], [0.7, 2.4, 0.6], 0.05, { color: 0x6a6a64 });
    for (let k = 0; k < 5; k++) b.cyl('steel', [-0.8 + k * 0.4, 0.9, -2.3], 0.05, 0.6, { rx: Math.PI / 2, r2: 0.0, color: 0xb0b0a8, seg: 5 });  // spikes
    box('rust', [0, 0.9, -2.15], [1.9, 0.5, 0.15], { color: rust });
    for (const [x, z] of [[-1.1, -1.4], [1.1, -1.4], [-1.15, 1.4], [1.15, 1.4]]) V.wheels.push(wheel(group, x, 0.62, z, 0.62, 0.5));
    col([0, 1.1, 0], [2.0, 0.5, 4.2]);
    V.spots.gunner = new THREE.Vector3(0.2, 1.2, 1.1); V.spots.driver = new THREE.Vector3(-0.35, 1.05, -0.3); V.spots.core = new THREE.Vector3(0, 1.4, -1.4);
  } else if (kind === 'rig') {
    // the harpoon rig: armoured cab, a long bed with rails, a harpoon gun on a pintle and a winch drum
    const rust = o.color ?? 0x6a4a32;
    box('rust', [0, 2.1, -3.6], [2.8, 1.9, 2.4], { color: rust, round: 0.1, tex: 1.5 });
    for (let k = 0; k < 3; k++) box('glassDark', [0, 2.5, -4.82], [2.0 - k * 0.6, 0.12, 0.04]);           // slit windows
    box('darkSteel', [0, 0.9, 0], [2.0, 0.45, 10], { color: 0x2a2a2a });
    box('rust', [0, 1.55, 1.2], [3.0, 0.2, 7.0], { color: 0x5a4a3a, tex: 1 });
    for (const sx of [-1, 1]) { box('rust', [sx * 1.45, 2.0, 1.2], [0.1, 0.8, 7.0], { color: rust }); }
    box('rust', [0, 2.0, 4.65], [3.0, 0.8, 0.1], { color: rust });
    b.cyl('darkSteel', [0, 2.2, -1.6], 0.55, 1.6, { rz: Math.PI / 2, color: 0x3a3a3a, seg: 16 });      // winch drum
    b.cyl('rust', [-1.1, 2.6, -1.6], 0.25, 1.4, { rx: Math.PI / 2, color: 0x4a4a42, seg: 10 });         // harpoon gun
    for (const [x, z] of [[-1.35, -3.6], [1.35, -3.6], [-1.35, 2.0], [1.35, 2.0], [-1.35, 3.6], [1.35, 3.6]]) V.wheels.push(wheel(group, x, 0.7, z, 0.7, 0.5));
    col([0, 1.5, 1.2], [3.0, 0.2, 7.0]); col([0, 2.1, -3.6], [2.8, 1.9, 2.4]); col([0, 2.0, 4.65], [3.0, 0.8, 0.1]);
    for (const sx of [-1, 1]) col([sx * 1.45, 2.0, 1.2], [0.1, 0.8, 7.0]);
    col([0, 2.2, -1.6], [1.6, 1.1, 1.1]);
    V.deckY = 1.65; V.spots.deck = new THREE.Vector3(0, 1.65, 1.6); V.spots.winch = new THREE.Vector3(0, 2.2, -1.6); V.spots.harpoon = new THREE.Vector3(-1.1, 2.6, -2.4);
    V.spots.raiders = [new THREE.Vector3(0.6, 1.65, 0.4), new THREE.Vector3(-0.7, 1.65, 2.2), new THREE.Vector3(0.5, 1.65, 3.8)];
    V.spots.mapCase = new THREE.Vector3(-0.9, 1.9, 3.9);
    box('wood', [-0.9, 1.85, 3.9], [0.7, 0.4, 0.5], { color: 0x7a5a3a });
  }
  b.finalize();
  group.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  V.spin = (dist) => { for (const w of V.wheels) w.rotation.x -= dist / w.userData.r; };
  V.dispose = () => { group.removeFromParent(); group.traverse(m => { if (m.geometry && m.geometry !== tyreG) m.geometry.dispose(); }); };
  return V;
}
export const vehicle = make;
