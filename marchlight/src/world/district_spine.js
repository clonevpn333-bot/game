// THE SPINE — Meridian's exterior maintenance network on the starboard hull face,
// from the Runner Bay down past Leg Two to the Undercroft. The traversal tutorial,
// the first fight, the relay, and the work-tram line all live here.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { crate, barrel, lamp, cable, pipeRun, vent, sign, poster } from './props.js';
import { rng, catenary } from '../core/util.js';
import { G } from '../core/physics.js';

export const SP = {
  A: -38, B: -52, deck: -96, under: -122,
  lineU: new THREE.Vector3(211, -51.2, -266.5), lineL: new THREE.Vector3(166, -120.6, -286),
  hook: new THREE.Vector3(183, -101, -287),
};

export function buildSpine(game, lights) {
  const root = new THREE.Group(); root.name = 'district:spine'; game.engine.cityRoot.add(root);
  const b = new Builder(game, root, { cell: 40 });
  const D = { root, spots: {}, anim: [], anchors: [], kin: {} };
  const r = rng(808);
  const hullC = 0x8f897c, dark = 0x3e3d3a, rail = 0xb8a050;

  // ================================================================ hull east face (x=200), z -300..-120
  // panels split around the bay tunnel (z -201..-179, y -38..-24)
  const face = (y0, y1, z0, z1) => b.box('panel', [201, (y0 + y1) / 2, (z0 + z1) / 2], [2, y1 - y0, z1 - z0], { color: hullC, tex: 4, ao: false });
  face(-92, -38, -300, -120); face(-24, 0, -300, -120); face(-38, -24, -300, -201); face(-38, -24, -179, -120);
  // bay tunnel through the hull
  b.box('panel', [198, -31, -201.4], [4, 14, 0.8], { color: 0x6a665e }); b.box('panel', [198, -31, -178.6], [4, 14, 0.8], { color: 0x6a665e });
  b.box('panel', [198, -23.6, -190], [4, 0.8, 23], { color: 0x6a665e }); b.box('concrete', [198, -38.25, -190], [4, 0.5, 23], { color: 0x7a766c });
  // ribs, window bands, vents, numbers
  for (let z = -298; z <= -122; z += 11) {
    if (z > -203 && z < -177) continue;
    b.box('darkSteel', [202.3, -46, z], [0.8, 92, 1.4], { color: 0x5a5852, collide: false, ao: false });
  }
  for (const y of [-12, -66, -80]) b.box('facade', [202.15, y, -210], [0.3, 5, 176], { color: 0xd0c8b8, collide: false, tex: 26, ao: false });
  for (let z = -290; z < -130; z += 22) vent(b, [202.3, -30, z], Math.PI / 2, 1.5);
  sign(game, root, 'E-4', [202.75, -27, -214], { ry: Math.PI / 2, w: 6, h: 3, neon: false, color: '#e8e0d0', bg: '#00000000', font: '700 110px "Barlow Condensed", sans-serif', tw: 256, th: 128 });
  sign(game, root, 'LEG TWO ACCESS →', [202.75, -42.5, -236], { ry: Math.PI / 2, w: 6, h: 0.8, neon: false, color: '#ffb35c', bg: '#1e1e20', font: '700 48px "Barlow Condensed", sans-serif' });
  pipeRun(b, [[203, -60, -120], [203, -60, -300]], 0.9, 0x7a6a58, 'rust');
  pipeRun(b, [[203.2, -34.5, -120], [203.2, -34.5, -205]], 0.35, 0x6a7a7a);
  // ================================================================ GALLERY A (y=-38)
  const A = SP.A;
  // apron outside the bay doors
  b.box('grate', [206, A - 0.1, -190], [12, 0.2, 30], { color: 0x9a9a9a, tex: 1 });
  b.box('darkSteel', [206, A - 0.5, -190], [12, 0.6, 30], { color: dark, collide: false, ao: false });
  for (const z of [-204, -190, -176]) b.tube('darkSteel', [211.5, A - 0.6, z], [202.5, A - 9, z], 0.25, { color: 0x4a4a48 });
  b.railing([211.9, A, -175.2], [211.9, A, -204.8], { h: 1.15 });
  b.railing([202, A, -175.2], [211.9, A, -175.2], { h: 1.15 });
  b.railing([204.2, A, -204.8], [211.9, A, -204.8], { h: 1.15 });
  crate(b, [208, A, -180], 1.2); crate(b, [209.3, A, -180.4], 1.0, { ry: 0.4 }); crate(b, [208.5, A + 1.2, -180.2], 0.9, { ry: -0.2 });
  barrel(b, [210.6, A, -200]); barrel(b, [210.6, A, -201.2]);
  lamp(b, lights, [206, A + 6, -186], { drop: 0.3, intensity: 5, distance: 14 });
  b.box('darkSteel', [206, A + 6.5, -190], [12, 0.3, 0.3], { color: dark, collide: false });
  for (const x of [200.35, 211.65]) b.box('darkSteel', [x, A + 3.25, -190], [0.3, 6.5, 0.3], { color: dark, collide: false }); // posts under the lamp beam
  D.spots.apron = new THREE.Vector3(205, A, -190);
  D.spots.revealCam = new THREE.Vector3(208, A + 2.4, -185);
  // walkway forward (z -205..-212)
  const walk = (z0, z1, y = A, x0 = 200.2, x1 = 204.2, rails = true) => {
    b.box('grate', [(x0 + x1) / 2, y - 0.1, (z0 + z1) / 2], [x1 - x0, 0.2, Math.abs(z1 - z0)], { color: 0x9a9a9a, tex: 1 });
    b.box('darkSteel', [x1 - 0.1, y - 0.35, (z0 + z1) / 2], [0.2, 0.4, Math.abs(z1 - z0)], { color: rail, collide: false, ao: false });
    if (rails) b.railing([x1 - 0.1, y, z0], [x1 - 0.1, y, z1], { h: 1.1 });
    for (let z = Math.max(z0, z1) - 2; z > Math.min(z0, z1); z -= 6) b.tube('darkSteel', [x1 - 0.3, y - 0.5, z], [201.2, y - 4.5, z], 0.12, { color: 0x4a4a48 });
  };
  walk(-204.8, -212, A);
  // the walkway is broken for one short stretch: a 1.6 m hop (the amber hang rail on the hull is the
  // optional long way round)
  walk(-212, -215.6, A); walk(-217.2, -222.5, A);
  for (const z of [-215.5, -217.3]) b.box('hazard', [202.2, A + 0.005, z], [4, 0.01, 0.2], { collide: false, tex: 1 });
  sign(game, root, 'WALKWAY DAMAGED — MIND THE GAP', [202.2, A + 1.6, -211.7], { w: 2.6, h: 0.35, neon: false, color: '#1a1a1a', bg: '#d8b030', font: '700 30px "Barlow Condensed", sans-serif' });
  // the ledge rail along the hull face (hang & shimmy), z -211..-223, top at y A+2.15
  b.box('hazard', [200.35, A + 2.0, -217], [0.5, 0.3, 12.4], { tex: 1, meta: { ledge: true } });
  b.box('panel', [200.6, A + 0.9, -217], [0.8, 2.0, 12.4], { color: hullC, meta: { ledge: true }, tex: 2 });
  D.spots.ledgeStart = new THREE.Vector3(202.0, A, -211.2);
  // walkway continues z -222..-232
  walk(-222.5, -232, A);
  // ---- gap 1 (z -232..-242): the shuttling cradle + a latch anchor
  b.box('darkSteel', [202.2, A + 8.2, -237], [0.4, 0.4, 16], { color: rail, collide: false, ao: false }); // cradle rail
  const cradle = new THREE.Group(); cradle.position.set(202.2, A - 0.15, -234); root.add(cradle);
  { const cb = new Builder(game, cradle, { cell: 1000 });
    cb.box('grate', [0, 0, 0], [3.4, 0.2, 3.4], { color: 0x9a9a9a, collide: false, tex: 1 });
    cb.box('hazard', [0, -0.2, 0], [3.5, 0.2, 3.5], { collide: false, tex: 1 });
    for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) cb.tube('cable', [x, 0, z], [0, 8.2, 0], 0.03);
    cb.railing([1.6, 0, -1.6], [1.6, 0, 1.6], { collide: false, h: 1.0 });
    cb.box('darkSteel', [0, 8.2, 0], [1.2, 0.6, 1.2], { color: 0x2a2a2a, collide: false });
    cb.finalize(); }
  D.kin.cradle = game.physics.addKinematic(cradle, [{ type: 'box', hx: 1.7, hy: 0.1, hz: 1.7 }, { type: 'box', hx: 0.05, hy: 0.55, hz: 1.7, pos: { x: 1.6, y: 0.6, z: 0 } }]);
  D.cradle = cradle;
  let cradleV = 0;
  D.anim.push((t) => { const k = (Math.sin(t * 0.55) + 1) / 2; const z = -233.9 - k * 6.2; cradleV = (z - cradle.position.z); cradle.position.z = z; });
  game.tether.register({ kind: 'machine', label: 'Cradle', getPos: () => cradle.position.clone().add(new THREE.Vector3(0, 0.5, 0)), getVel: () => new THREE.Vector3(0, 0, cradleV * 60), radius: 1.5,
    capture: (dt) => 700 * dt * Math.min(1, Math.abs(cradleV) * 60 / 1.5 + 0.2), push: () => {} });
  const anc = new THREE.Vector3(202.6, A + 7.2, -243.5);
  b.box('hazard', [201.5, A + 7.2, -243.5], [2.4, 0.4, 0.4], { tex: 1, collide: false });
  b.sphere('lampCool', [202.7, A + 7.2, -243.5], 0.18, { seg: 8 });
  D.anchors.push(game.tether.registerAnchor({ getPoint: () => anc.clone(), label: 'Anchor', onArrive: (p) => { p.endLatch(false); p.vel.set(0, -1, -2.5); } }));
  // a catch grating under the cradle gap with a ladder back up, so a missed jump costs seconds, not a life
  b.box('grate', [202.2, A - 3.3, -236.85], [4, 0.2, 10.1], { color: 0x8a8a8a, tex: 1 });
  b.railing([204.1, A - 3.2, -231.8], [204.1, A - 3.2, -241.9], { h: 1.0 });
  b.railing([200.3, A - 3.2, -231.8], [204.1, A - 3.2, -231.8], { h: 1.0 });
  b.box('panel', [202.2, A - 1.7, -242.05], [4, 3.2, 0.2], { color: 0x8a8070, meta: { climb: 'wall' }, tex: 1 }); // rung wall: the way back up
  for (let y = A - 2.9; y < A - 0.2; y += 0.4) b.box('hazard', [202.2, y, -241.92], [3.4, 0.06, 0.08], { collide: false, tex: 0.5 });
  // walkway resumes z -242..-262
  walk(-242, -262, A);
  // stairs up to the top of the bulkhead (the rung panel stays for climbers)
  b.stairs('grate', [202.2, A, -254], 8, 5, 2.6, Math.PI, { color: 0x9a9a9a, tex: 1, open: true });
  b.railing([200.2, A, -242.1], [204.1, A, -242.1], { h: 1.1, collide: false });
  // ---- bulkhead with rungs (climb) at z -262..-264.5
  b.box('panel', [202.2, A + 2.5, -263.3], [4.2, 5, 2.4], { color: 0x7a7468, tex: 2 });
  b.box('panel', [202.2, A + 2.4, -262.05], [3.6, 4.8, 0.12], { color: 0x8a8070, meta: { climb: 'wall' }, tex: 1 });
  for (let y = A + 0.4; y < A + 4.8; y += 0.4) b.box('hazard', [202.2, y, -261.95], [3.4, 0.06, 0.08], { collide: false, tex: 0.5 });
  // pipe-bundle walkway on top (y A+5), z -264.5..-276
  const PB = A + 5;
  b.box('grate', [202.2, PB - 0.1, -270], [4, 0.2, 12], { color: 0x9a9a9a, tex: 1 });
  for (const dx of [-1.2, 0, 1.2]) b.tube('rust', [202.2 + dx, PB - 0.8, -262], [202.2 + dx, PB - 0.8, -278], 0.5, { color: 0x7a6a58 });
  b.railing([204.1, PB, -264.5], [204.1, PB, -276]);
  // ---- scaffold drops down to gallery B
  // each drop is ~6.3 m (no damage) and each platform is deep enough that even a sprint off the edge
  // lands on the next one, so nobody skips a level and takes a long fall
  b.box('grate', [203.6, PB - 6.2, -280], [5, 0.2, 7], { color: 0x9a9a9a, tex: 1 }); // S1  z -276.5..-283.5
  b.box('hazard', [203.6, PB - 6.0, -276.6], [5, 0.2, 0.15], { collide: false, tex: 1 });
  b.box('grate', [205.6, PB - 12.6, -288.25], [5, 0.2, 9.5], { color: 0x9a9a9a, tex: 1 }); // S2  z -283.5..-293
  for (const [x, y, z, d] of [[203.6, PB - 6.2, -280, 7], [205.6, PB - 12.6, -288.25, 9.5]]) {
    for (const dz of [-d / 3, d / 3]) b.tube('darkSteel', [x + 2.4, y - 0.1, z + dz], [201.2, y - 5, z + dz], 0.15, { color: 0x4a4a48 });
    b.railing([x + 2.45, y, z - d / 2 + 0.1], [x + 2.45, y, z + d / 2 - 0.1], { collide: true, h: 1.0 });
  }
  D.spots.vantage = new THREE.Vector3(205.6, PB - 12.6, -286);

  // ================================================================ GALLERY B (y=-52): the cable trunks — first fight
  const B = SP.B;
  b.box('grate', [207, B - 0.1, -281], [14, 0.2, 38], { color: 0x9a9a9a, tex: 1 });
  b.box('darkSteel', [207, B - 0.6, -281], [14, 0.8, 38], { color: dark, collide: false, ao: false });
  for (let z = -297; z <= -264; z += 6) b.tube('darkSteel', [213.6, B - 0.8, z], [202, B - 12, z], 0.3, { color: 0x4a4a48 });
  // railing with gaps (broken by the scavs) along x=213.9
  const railSegs = [[-262.2, -270], [-274, -283], [-287.5, -299.8]];
  for (const [z0, z1] of railSegs) b.railing([213.9, B, z0], [213.9, B, z1], { h: 1.1 });
  b.railing([200.2, B, -299.8], [213.9, B, -299.8], { h: 1.1 });
  b.railing([206.2, B, -262.2], [213.9, B, -262.2], { h: 1.1 });
  // broken railing stubs
  for (const z of [-270.5, -273.4, -283.6, -287]) b.tube('steel', [213.9, B, z], [213.9 + (r() - 0.5) * 0.4, B + 0.5 + r() * 0.4, z + (r() - 0.5) * 0.6], 0.03, { color: 0x9aa0a6 });
  // cable trunks along the wall (the scavs' prize)
  for (const [dy, rr] of [[1.1, 0.7], [2.6, 0.55], [3.8, 0.45]]) b.tube('rubber', [201.3 + rr, B + dy, -262], [201.3 + rr, B + dy, -300], rr, { color: 0x1e1e20, seg: 12 });
  for (let z = -264; z > -300; z -= 4) b.box('darkSteel', [201.6, B + 2.4, z], [1.6, 4.4, 0.25], { color: 0x6a665e, collide: false });
  // cover: junction boxes, crates, a cable spool, a control hut
  b.box('paint', [207.5, B + 0.7, -270], [2.2, 1.4, 1.2], { color: 0x5a6a5a });
  b.box('paint', [210.5, B + 0.9, -280], [1.4, 1.8, 2.4], { color: 0x6a6a5a });
  crate(b, [205, B, -286], 1.3); crate(b, [206.3, B, -287], 1.1, { ry: 0.5 }); crate(b, [205.4, B + 1.3, -286.3], 0.9);
  b.cyl('wood', [209.5, B + 1.1, -292], 1.1, 1.4, { rz: Math.PI / 2, color: 0x8a6a4a, seg: 16, collide: true });
  // the control hut stands well back from the south edge (from its roof a sprint would clear the railing)
  b.box('panel', [203.5, B + 1.4, -291.5], [3, 2.8, 3], { color: 0x8a8070 });
  b.box('glassDark', [205.05, B + 1.8, -291.5], [0.06, 1, 1.8], { collide: false });
  lamp(b, lights, [207, B + 5.5, -270], { drop: 0.4, intensity: 5, distance: 14 }); lamp(b, lights, [207, B + 5.5, -290], { drop: 0.4, intensity: 5, distance: 14, flicker: 0.5 });
  // scav harpoon lines over the edge (how they got up here)
  for (const z of [-272, -285.5]) { b.tube('cable', [213.6, B + 0.3, z], [222, B - 40, z + 3], 0.04); b.box('rust', [213.4, B + 0.25, z], [0.6, 0.5, 0.6], { color: 0x6a3a2a, collide: false }); }
  D.spots.leech1 = new THREE.Vector3(203.2, B, -270.5); D.spots.leech2 = new THREE.Vector3(203.2, B, -296);
  D.spots.gnat1 = new THREE.Vector3(209, B + 4, -275); D.spots.gnat2 = new THREE.Vector3(211, B + 5, -292); D.spots.gnat3 = new THREE.Vector3(216, B + 3, -283);
  D.spots.galleryB = new THREE.Vector3(207, B, -268);
  // upper station of the work-tram line (north end of B)
  b.box('panel', [210, B + 3, -264], [4, 6, 3], { color: 0x6a6a68 });
  b.box('hazard', [210, B + 6.1, -264], [4.2, 0.2, 3.2], { collide: false, tex: 1 });
  sign(game, root, 'WORK LINE · UNDERCROFT', [207.95, B + 4.5, -264], { ry: -Math.PI / 2, w: 3.2, h: 0.4, neon: false, color: '#e8e0d0', bg: '#2a3a4a', font: '700 34px "Barlow Condensed", sans-serif' });

  b.railing([200.3, B, -299.85], [204.4, B, -299.85], { h: 1.1 }); // south edge beside the lift shaft
  // ---- cargo lift: gallery B (south end) down to the relay deck
  const lift = new THREE.Group(); lift.position.set(207, B - 0.1, -296.8); root.add(lift);
  { const lb = new Builder(game, lift, { cell: 1000 });
    lb.box('grate', [0, 0, 0], [5, 0.2, 5], { color: 0xa0a0a0, collide: false, tex: 1 });
    lb.box('hazard', [0, -0.25, 0], [5.1, 0.3, 5.1], { collide: false, tex: 1 });
    lb.railing([2.45, 0, -2.45], [2.45, 0, 2.45], { collide: false }); lb.railing([-2.45, 0, -2.45], [2.45, 0, -2.45], { collide: false });
    lb.box('paint', [-1.9, 0.6, 1.9], [0.5, 1.2, 0.5], { color: 0xc8a030, collide: false });
    lb.box('lampGreen', [-1.9, 1.25, 1.9], [0.2, 0.1, 0.2], { collide: false, ao: false });
    lb.finalize(); }
  D.kin.lift = game.physics.addKinematic(lift, [{ type: 'box', hx: 2.5, hy: 0.1, hz: 2.5 }, { type: 'box', hx: 0.05, hy: 0.55, hz: 2.5, pos: { x: 2.45, y: 0.6, z: 0 } }, { type: 'box', hx: 2.5, hy: 0.55, hz: 0.05, pos: { x: 0, y: 0.6, z: -2.45 } }]);
  D.lift = lift; D.liftTop = B - 0.1; D.liftBottom = SP.deck - 0.1;
  // lift frame along the hull
  for (const dx of [-2.8, 2.8]) b.tube('darkSteel', [207 + dx, B + 6, -299.6], [207 + dx, SP.deck - 4, -299.6], 0.25, { color: 0x5a5852 });
  b.box('darkSteel', [207, B + 6, -299.6], [6, 0.5, 0.5], { color: 0x5a5852, collide: false });
  D.spots.liftPanel = new THREE.Vector3(205.1, B, -294.9);

  // ================================================================ RELAY DECK (y=-96) beside Leg Two's hip
  const DK = SP.deck;
  b.box('grate', [209, DK - 0.1, -283], [26, 0.2, 34], { color: 0x9a9a9a, tex: 1 });
  b.box('darkSteel', [209, DK - 0.8, -283], [26, 1.2, 34], { color: dark, collide: false, ao: false });
  for (const [x, z] of [[198, -268], [220, -268], [198, -298], [220, -298]]) b.tube('darkSteel', [x, DK, z], [x + (x < 209 ? 2 : -10), -92, z], 0.5, { color: 0x4a4a48 });
  // railings: east edge with two gaps (where things can go over), north & south edges
  b.railing([221.9, DK, -266.2], [221.9, DK, -276]); b.railing([221.9, DK, -281], [221.9, DK, -290]); b.railing([221.9, DK, -295], [221.9, DK, -299.8]);
  b.railing([196.2, DK, -266.2], [221.9, DK, -266.2]); b.railing([196.2, DK, -299.8], [221.9, DK, -299.8]);
  b.railing([196.2, DK, -266.2], [196.2, DK, -280]); b.railing([196.2, DK, -288], [196.2, DK, -294.8]); // west gaps face the line & the crane gangway
  // Pylon 7: relay tower with three coupling clamps
  b.box('panel', [212, DK + 4, -284], [3, 8, 3], { color: 0x6a6a68, tex: 2 });
  b.box('hazard', [212, DK + 8.1, -284], [3.2, 0.3, 3.2], { collide: false, tex: 1 });
  sign(game, root, 'PYLON 7', [212, DK + 6.8, -282.45], { w: 2.4, h: 0.6, neon: false, color: '#e8e0d0', bg: '#2a2a2a', font: '700 56px "Barlow Condensed", sans-serif' });
  b.box('glassDark', [212, DK + 9, -284], [1, 2, 1], { collide: false });
  D.relayLight = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.6, 0.2) })); D.relayLight.position.set(212, DK + 10.3, -284); root.add(D.relayLight);
  // conduit from the pylon to the hip housing
  pipeRun(b, [[210.5, DK + 6, -284], [200, DK + 6, -284], [196, DK + 6, -270], [196, DK + 6, -252]], 0.45, 0x2a2a2a, 'rubber');
  D.couplings = [];
  for (const [dx, dz, ry] of [[-1.7, 0, -Math.PI / 2], [0, 1.7, 0], [0, -1.7, Math.PI]]) {
    const cg = new THREE.Group(); cg.position.set(212 + dx, DK + 3.2, -284 + dz); cg.rotation.y = ry; root.add(cg);
    const arm = new THREE.Group(); arm.position.set(0, 0, 0.2); cg.add(arm);
    const ab = new Builder(game, arm, { cell: 1000 });
    ab.box('darkSteel', [0, 0.9, 0.25], [0.5, 1.8, 0.35], { color: 0x3a3a3a, collide: false });
    ab.box('hazard', [0, 1.75, 0.25], [0.7, 0.3, 0.6], { collide: false, tex: 0.5 });
    ab.finalize();
    const lamp2 = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.5, 0.15) })); lamp2.position.set(0.5, 0.4, 0.15); cg.add(lamp2);
    arm.rotation.x = -0.9;
    D.couplings.push({ g: cg, arm, lamp: lamp2, seated: false });
  }
  // Leg Two's hip flywheel (outboard end cap) — huge rotating gear the tether can drain
  const fly = new THREE.Group(); fly.position.set(201.5, -104, -228); root.add(fly);
  { const fb = new Builder(game, fly, { cell: 1000 });
    fb.cyl('darkSteel', [0, 0, 0], 13, 1.6, { rz: Math.PI / 2, color: 0x3a3936, seg: 40 });
    for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; fb.box('hazard', [0.9, Math.cos(a) * 9, Math.sin(a) * 9], [0.4, 1.4, 6], { rx: a, collide: false, tex: 1 }); }
    for (let k = 0; k < 24; k++) { const a = k / 24 * Math.PI * 2; fb.box('rust', [0, Math.cos(a) * 13.4, Math.sin(a) * 13.4], [1.4, 1.6, 1.6], { rx: a, color: 0x7a5a42, collide: false, ao: false }); }
    fb.cyl('engineGlow', [1.0, 0, 0], 2.2, 0.4, { rz: Math.PI / 2, seg: 20 });
    fb.finalize(); }
  D.flywheel = fly;
  D.anim.push((t, city, dt) => { fly.rotation.x += dt * (city.walking ? 0.35 : 0.02); });
  // hanging counterweight on a small cargo crane at the deck's south-west corner (swings; tether target)
  const cw = new THREE.Group(); cw.position.set(200.5, DK + 9.5, -296); root.add(cw);
  b.tube('darkSteel', [198.6, DK, -298.6], [198.6, DK + 10, -298.6], 0.35, { color: 0xc8a030 });
  b.box('darkSteel', [200, DK + 10, -297.5], [4, 0.6, 0.6], { ry: 0.6, color: 0xc8a030, collide: false });
  { const wb = new Builder(game, cw, { cell: 1000 }); wb.tube('cable', [0, 0, 0], [0, -6.5, 0], 0.05); wb.box('rust', [0, -7.5, 0], [1.8, 2, 1.8], { color: 0x5a4a3a, collide: false }); wb.box('hazard', [0, -6.4, 0], [1.9, 0.2, 1.9], { collide: false, tex: 1 }); wb.finalize(); }
  D.counterweight = cw;
  // deck lights & clutter
  lamp(b, lights, [205, DK + 6, -272], { drop: 0.3, intensity: 6, distance: 16 }); lamp(b, lights, [215, DK + 6, -294], { drop: 0.3, intensity: 6, distance: 16 });
  crate(b, [218, DK, -270], 1.2); crate(b, [219.2, DK, -271], 1.0, { ry: 0.3 }); barrel(b, [217.5, DK, -296]); barrel(b, [218.6, DK, -296.4]);
  b.box('paint', [203, DK + 0.6, -270], [2, 1.2, 1.2], { color: 0x5a6a5a });
  D.spots.deckArrive = new THREE.Vector3(207, DK, -294);
  D.spots.deckCenter = new THREE.Vector3(209, DK, -283);
  D.spots.shearerIn = new THREE.Vector3(219, DK, -268.5);

  // ================================================================ the work line, its towers, the Undercroft and its crane
  const U = SP.lineU, Lw = SP.lineL;
  const lineCurve = new THREE.LineCurve3(U, Lw);
  D.line = lineCurve;
  b.tube('steel', [U.x, U.y + 0.6, U.z], [Lw.x, Lw.y + 0.6, Lw.z], 0.12, { color: 0x9a9a9a });          // track cable
  b.tube('cable', [U.x, U.y + 1.4, U.z], [Lw.x, Lw.y + 1.4, Lw.z], 0.05);                              // haul cable
  D.towers = [];
  for (const t of [0.34, 0.68]) {
    const p = U.clone().lerp(Lw, t);
    b.tube('darkSteel', [p.x, p.y + 1, p.z], [p.x, -92, p.z], 0.6, { color: 0x4a4a48 });
    b.box('darkSteel', [p.x, p.y + 1.2, p.z], [2.6, 0.6, 1.4], { ry: Math.atan2(Lw.x - U.x, Lw.z - U.z), color: 0x4a4a48, collide: false });
    // emergency brake clamp (a lever the tether can slam shut)
    const clamp = new THREE.Group(); clamp.position.set(p.x, p.y + 0.4, p.z); root.add(clamp);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.4, 0.35), new THREE.MeshStandardMaterial({ color: 0xc82a1a, roughness: 0.5, metalness: 0.3 }));
    lever.geometry.translate(0, 1.2, 0); lever.position.set(1.0, 0, 0); lever.rotation.z = -0.9; clamp.add(lever);
    const lmp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.4, 0.1) })); lmp.position.set(0, 1.4, 0); clamp.add(lmp);
    D.towers.push({ t, p, clamp, lever, lamp: lmp, engaged: false });
  }
  // the Undercroft platform (y=-122)
  const UN = SP.under;
  b.box('concrete', [147, UN - 0.25, -288], [62, 0.5, 36], { color: 0x8a847a, tex: 3 });
  b.box('darkSteel', [147, UN - 1.2, -288], [62, 1.4, 36], { color: dark, collide: false, ao: false });
  for (const [x, z] of [[120, -272], [174, -272], [120, -304], [174, -304], [147, -288]]) b.tube('cable', [x, UN, z], [x + (x - 147) * 0.2, -92, z], 0.15);
  b.railing([116.2, UN, -270.2], [177.8, UN, -270.2]); b.railing([116.2, UN, -305.8], [177.8, UN, -305.8]);
  b.railing([116.2, UN, -270.2], [116.2, UN, -305.8]); b.railing([177.8, UN, -270.2], [177.8, UN, -305.8]);
  b.box('rust', [140, UN + 3.6, -296], [16, 0.3, 8], { color: 0x6a5a4a }); // shelter roof
  for (const [x, z] of [[133, -292.5], [147, -292.5], [133, -299.5], [147, -299.5]]) b.tube('darkSteel', [x, UN, z], [x, UN + 3.5, z], 0.12);
  for (let i = 0; i < 4; i++) { b.box('wood', [134 + i * 4, UN + 0.45, -299], [3, 0.1, 0.6], { color: 0x8a6a4a }); for (const dx of [-1.3, 1.3]) b.box('darkSteel', [134 + i * 4 + dx, UN + 0.2, -299], [0.08, 0.4, 0.5], { color: 0x3a3a3a, collide: false }); } // benches
  // lower station
  b.box('panel', [170, UN + 2.5, -277], [4, 5, 3], { color: 0x6a6a68 });
  sign(game, root, 'UNDERCROFT', [167.95, UN + 4, -277], { ry: -Math.PI / 2, w: 3, h: 0.5, neon: false, color: '#e8e0d0', bg: '#2a3a4a', font: '700 44px "Barlow Condensed", sans-serif' });
  lamp(b, lights, [140, UN + 3.3, -296], { drop: 0.1, intensity: 5, distance: 16 });
  lamp(b, lights, [160, UN + 5, -284], { drop: 0.3, intensity: 5, distance: 16 });
  D.spots.crowd = []; for (let i = 0; i < 18; i++) D.spots.crowd.push(new THREE.Vector3(160 + (r() - 0.5) * 26, UN, -288 + (r() - 0.5) * 22));
  D.spots.underCenter = new THREE.Vector3(150, UN, -288);
  // the Undercroft crane (hangs from the hull bottom; boom reaches over the void)
  const crane = new THREE.Group(); crane.position.set(190, -92, -300); root.add(crane);
  { const cb = new Builder(game, crane, { cell: 1000 });
    cb.box('darkSteel', [0, -2, 0], [4, 4, 4], { color: 0xc8a030, collide: false });
    cb.cyl('darkSteel', [0, -4.5, 0], 1.8, 1.4, { color: 0x3a3a3a, seg: 16 });
    cb.finalize(); }
  const boom = new THREE.Group(); boom.position.set(0, -5.2, 0); crane.add(boom);
  const hookLocal = SP.hook.clone().sub(new THREE.Vector3(190, -97.2, -300));
  const boomLen = Math.hypot(hookLocal.x, hookLocal.z);
  boom.rotation.y = Math.atan2(hookLocal.x, hookLocal.z);
  { const bb = new Builder(game, boom, { cell: 1000, offset: null });
    bb.box('hazard', [0, 0, boomLen / 2], [1.4, 1.4, boomLen + 1], { collide: false, tex: 2 });
    for (let z = 1; z < boomLen; z += 2) bb.box('darkSteel', [0, 0.85, z], [1.6, 0.1, 0.1], { color: 0x2a2a2a, collide: false });
    bb.tube('cable', [0, 0, boomLen], [0, hookLocal.y, boomLen], 0.06);
    bb.box('darkSteel', [0, hookLocal.y - 0.4, boomLen], [2.8, 0.8, 0.8], { color: 0x3a3a3a, collide: false }); // catch frame
    bb.box('hazard', [0, hookLocal.y - 1.0, boomLen], [3.0, 0.3, 1.0], { collide: false, tex: 1 });
    bb.finalize(); }
  D.crane = crane; D.boom = boom; D.boomLen = boomLen;
  // a walkable catwalk on top of the boom (where the workers climb to) — static colliders in city frame
  const bs = new THREE.Vector3(190, -96.4, -300), be = SP.hook.clone().setY(-96.4);
  const mid = bs.clone().lerp(be, 0.5), blen = bs.distanceTo(be), bry = Math.atan2(be.x - bs.x, be.z - bs.z);
  b.box('grate', [mid.x, mid.y, mid.z], [1.8, 0.15, blen], { ry: bry, color: 0x9a9a9a, tex: 1 });
  const bperp = new THREE.Vector3(Math.cos(bry), 0, -Math.sin(bry));
  // side railings start just past the gangway so you can walk straight on from it
  const bdir = be.clone().sub(bs).normalize(), r0 = bs.clone().addScaledVector(bdir, 1.3);
  for (const s of [-1, 1]) b.railing([r0.x + bperp.x * 0.9 * s, -96.3, r0.z + bperp.z * 0.9 * s], [be.x + bperp.x * 0.9 * s, -96.3, be.z + bperp.z * 0.9 * s], { h: 1.0 });
  // a gangway from the deck's south-west corner to the boom root (solid railings: the only way off is the boom)
  b.box('grate', [193, DK - 0.1, -298.5], [7, 0.2, 3], { color: 0x9a9a9a, tex: 1 });
  b.railing([189.5, DK, -300], [196.2, DK, -300]); b.railing([189.5, DK, -297], [196.2, DK, -297]);
  b.railing([189.5, DK, -297], [189.5, DK, -297.95]); // closes the corner beside the catwalk mouth
  D.boomCatwalk = { start: bs, end: be };
  D.anchors.push(game.tether.registerAnchor({ getPoint: () => SP.hook.clone().add(new THREE.Vector3(0, 5.2, 0)), label: 'Crane', enabled: () => D.craneAnchorOn !== false }));
  D.spots.boomTip = be.clone();
  b.finalize();
  game.sky?.addZone([196, -45, -205], [212, -30, -175], 0.0, 'apron');
  return D;
}
