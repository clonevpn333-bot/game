// THE LOWER DECKS — the industrial belly: Engineering Stop, the piston hall,
// the Underwell and Tomas's Engine Control gallery, the Runner Bay & hangar, the range.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { crate, barrel, lamp, cable, pipeRun, vent, console_, screen, sign, poster, bench, table, chair, stool } from './props.js';
import { rng } from '../core/util.js';

export const LD = { floor: -38, ceil: -8, x0: 30, x1: 196, z0: -250, z1: -140 };

export function buildLowerDecks(game, lights) {
  const root = new THREE.Group(); root.name = 'district:lower'; game.engine.cityRoot.add(root);
  const b = new Builder(game, root, { cell: 45 });
  const D = { root, spots: {}, anim: [], lanes: {} };
  const r = rng(77);
  const Y = LD.floor;
  const wallC = 0x6e6a62, floorC = 0x6a665e, dark = 0x3a3936;

  // ---------------------------------------------------------------- shell
  // floor with a square cut for the Underwell (center 75,-190, half 17)
  const UW = { x: 75, z: -190, r: 16 };
  b.box('concrete', [((LD.x0) + (UW.x - 17)) / 2, Y - 0.25, -195], [UW.x - 17 - LD.x0, 0.5, 110], { color: floorC, tex: 4 });
  b.box('concrete', [((UW.x + 17) + LD.x1) / 2, Y - 0.25, -195], [LD.x1 - (UW.x + 17), 0.5, 110], { color: floorC, tex: 4 });
  b.box('concrete', [UW.x, Y - 0.25, (LD.z1 + (UW.z + 17)) / 2], [34, 0.5, LD.z1 - (UW.z + 17)], { color: floorC, tex: 4 });
  b.box('concrete', [UW.x, Y - 0.25, (LD.z0 + (UW.z - 17)) / 2], [34, 0.5, (UW.z - 17) - LD.z0], { color: floorC, tex: 4 });
  // painted walkway lines
  b.box('hazard', [140, Y + 0.01, -224.6], [70, 0.01, 0.25], { collide: false, tex: 1 });
  b.box('hazard', [140, Y + 0.01, -219.4], [70, 0.01, 0.25], { collide: false, tex: 1 });
  // ceiling (the underside of the deck slab) with heavy beams
  b.box('darkSteel', [113, LD.ceil + 0.3, -195], [166, 0.6, 110], { color: 0x2e2d2b, collide: false, ao: false });
  for (let x = 36; x < 196; x += 14) b.box('darkSteel', [x, LD.ceil - 1.2, -195], [1.6, 2.4, 110], { color: 0x45433f, collide: false, ao: false });
  for (let z = -246; z < -140; z += 16) b.box('darkSteel', [113, LD.ceil - 0.8, z], [166, 1.4, 1.0], { color: 0x45433f, collide: false, ao: false });
  // walls
  b.box('panel', [113, -23, LD.z1 + 0.5], [166, 30, 1], { color: wallC, tex: 4 });
  b.box('panel', [113, -23, LD.z0 - 0.5], [166, 30, 1], { color: wallC, tex: 4 });
  b.box('panel', [LD.x0 - 0.5, -23, -195], [1, 30, 110], { color: wallC, tex: 4 });
  // east wall with the bay door opening z -201..-179, y -38..-24
  b.box('panel', [LD.x1 + 0.5, -23, (-140 + -179) / 2], [1, 30, 39], { color: wallC, tex: 4 });
  b.box('panel', [LD.x1 + 0.5, -23, (-201 + -250) / 2], [1, 30, 49], { color: wallC, tex: 4 });
  b.box('panel', [LD.x1 + 0.5, -16, -190], [1, 16, 22], { color: wallC, tex: 4 });
  // wall ribs & pipes
  for (let x = 38; x < 196; x += 12) { b.box('darkSteel', [x, -23, LD.z1 + 1.2], [1.2, 30, 0.6], { color: dark, collide: false, ao: false }); b.box('darkSteel', [x, -23, LD.z0 - 1.2], [1.2, 30, 0.6], { color: dark, collide: false, ao: false }); }
  pipeRun(b, [[32, -12, -141.6], [194, -12, -141.6]], 0.45, 0x8a7a68, 'rust');
  pipeRun(b, [[32, -14, -141.6], [194, -14, -141.6]], 0.3, 0x6a7a7a, 'steel');
  pipeRun(b, [[32, -12, -248.4], [194, -12, -248.4]], 0.45, 0x8a7a68, 'rust');
  // catwalk along the north wall (y -26)
  b.box('grate', [113, -26, -143.2], [160, 0.12, 3.2], { color: 0x9a9a9a, tex: 1 });
  b.railing([33, -26, -144.8], [193, -26, -144.8], { collide: true });
  for (let x = 40; x < 196; x += 16) b.box('darkSteel', [x, -26.6, -143.2], [0.4, 1, 3.2], { color: dark, collide: false });
  b.ladder([45, Y, -144.9], 12, Math.PI);
  // overhead gantry crane on rails
  D.crane = new THREE.Group(); D.crane.position.set(110, -11, -195); root.add(D.crane);
  { const cb = new Builder(game, D.crane, { cell: 1000 });
    cb.box('hazard', [0, 0, 0], [3, 2, 108], { collide: false, ao: false, tex: 2 });
    cb.box('darkSteel', [0, -1.6, 10], [2, 1.2, 3], { color: 0x3a3a3a, collide: false, ao: false });
    cb.tube('cable', [0, -2, 10], [0, -14, 10], 0.05); cb.box('rust', [0, -14.5, 10], [1.6, 1, 1.6], { color: 0x8a6a4a, collide: false, ao: false });
    cb.finalize(); }
  D.anim.push((t) => { D.crane.position.x = 110 + Math.sin(t * 0.07) * 50; });

  // ---------------------------------------------------------------- Engineering Stop
  b.box('concrete', [125, Y + 0.55, -232.8], [28, 1.1, 4.4], { color: 0x8a847a, tex: 3 });
  b.box('hazard', [125, Y + 1.11, -230.8], [28, 0.02, 0.3], { collide: false, tex: 1 });
  b.stairs('concrete', [141.6, Y, -232.8], 2.6, 1.1, 3.4, -Math.PI / 2, { color: 0xb0aa9c, rails: false });
  b.railing([111.1, Y + 1.1, -234.9], [138.9, Y + 1.1, -234.9]);
  b.box('corrugated', [125, Y + 6, -232.4], [28, 0.3, 6], { color: 0x9a8a7a, tex: 4 });
  for (const x of [113, 125, 137]) b.box('darkSteel', [x, Y + 3.5, -234.6], [0.5, 5, 0.5], { color: dark });
  sign(game, root, 'ENGINEERING STOP', [125, Y + 4.6, -234.3], { w: 5, h: 0.8, neon: false, color: '#f2ead8', bg: '#2a4a5a', font: '700 56px "Barlow Condensed", sans-serif' });
  lamp(b, lights, [119, Y + 5.6, -232.6], { drop: 0.2, intensity: 4, distance: 10 }); lamp(b, lights, [131, Y + 5.6, -232.6], { drop: 0.2, intensity: 4, distance: 10 });
  D.spots.tramStop = new THREE.Vector3(128, Y + 1.1, -232.0);
  bench(b, [117, Y + 1.1, -234.4], 0);

  // ---------------------------------------------------------------- the piston hall (life & rhythm)
  D.pistons = [];
  for (let i = 0; i < 7; i++) {
    const x = 42 + i * 14, z = -156;
    b.box('panel', [x, Y + 3, z], [5, 6, 5], { color: 0x5a5852, tex: 2 });
    b.box('hazard', [x, Y + 6.05, z], [5.1, 0.1, 5.1], { collide: false, tex: 1 });
    b.box('panel', [x, -12, z], [5, 7, 5], { color: 0x5a5852, collide: false, tex: 2 });
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 1, 20), game.materials.steel);
    rod.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(rod.geometry.attributes.position.count * 3).fill(0.9), 3));
    rod.position.set(x, -20, z); rod.castShadow = true; root.add(rod);
    D.pistons.push({ rod, x, z, ph: i * 0.9 });
    pipeRun(b, [[x + 2.6, Y + 1, z], [x + 2.6, -15, z]], 0.25, 0x7a6a58, 'rust');
    lights.add([x, Y + 7.5, z + 3], 0xffa860, 3, 9);
  }
  D.anim.push((t, city) => {
    for (const p of D.pistons) { const k = 0.5 + 0.5 * Math.sin((city.phase * 4 + p.ph / 7) * Math.PI * 2); const top = -15.5, bot = Y + 6 + k * 3.5; p.rod.position.y = (top + bot) / 2; p.rod.scale.y = top - bot; }
  });
  // flywheels on the north wall
  D.flywheels = [];
  for (const x of [60, 120, 170]) {
    const fw = new THREE.Group(); fw.position.set(x, -20, -141.2); root.add(fw);
    const fb = new Builder(game, fw, { cell: 1000 });
    fb.cyl('darkSteel', [0, 0, 0], 6, 0.8, { rx: Math.PI / 2, color: 0x3a3936, seg: 32 });
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; fb.box('rust', [Math.cos(a) * 3, Math.sin(a) * 3, 0.5], [5.4, 0.6, 0.3], { rz: a, color: 0x8a6a4a, collide: false, ao: false }); }
    fb.cyl('hazard', [0, 0, 0.6], 1.2, 0.4, { rx: Math.PI / 2, seg: 16 });
    fb.finalize(); D.flywheels.push(fw);
  }
  D.anim.push((t, city, dt) => { for (const f of D.flywheels) f.rotation.z += dt * 0.6 * (city.walking ? 1 : 0.05); });
  // workbenches in the west workshop
  for (let i = 0; i < 4; i++) {
    const z = -200 - i * 10;
    table(b, [40, Y, z], { w: 1.4, d: 3.6, mat: 'darkSteel', color: 0x4a4a48 });
    b.box('darkSteel', [40, Y + 1.0, z + 1], [0.6, 0.4, 0.8], { color: 0x6a6a68 }); // vise
    crate(b, [44, Y, z + 2], 0.9); barrel(b, [44.5, Y, z - 1.5]);
    lamp(b, lights, [40, -31, z], { drop: 0.4, intensity: i % 2 ? 0 : 4, distance: 9, light: i % 2 === 0 });
  }
  // engineers' stations along the main aisle
  for (const x of [100, 145]) { console_(b, [x, Y, -214], 0); screen(game, root, [x, Y + 1.5, -214.38], Math.PI, 1.2, 0.6, (c, w, h) => { c.fillStyle = '#081418'; c.fillRect(0, 0, w, h); c.strokeStyle = '#4fd6ff'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i < w; i += 4) c.lineTo(i, h / 2 + Math.sin(i * 0.08) * h * 0.3); c.stroke(); c.fillStyle = '#ffb35c'; c.font = '16px monospace'; c.fillText('GAIT 4/4  NOMINAL', 8, 18); }); }
  // steam vents
  D.steam = [new THREE.Vector3(70, Y + 0.3, -170), new THREE.Vector3(150, Y + 0.3, -150), new THREE.Vector3(36, Y + 0.3, -240)];
  for (const s of D.steam) vent(b, [s.x, Y + 0.2, s.z], 0, 0.8);
  // barrels, crates and clutter along the walls
  for (let i = 0; i < 14; i++) { const x = 34 + r() * 120, z = -246 + r() * 4; (r() < 0.5 ? crate : barrel)(b, [x, Y, z], 0.9 + r() * 0.5); }

  // ---------------------------------------------------------------- the Underwell
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(UW.r + 1, UW.r + 1, 54, 40, 6, true), game.materials.darkSteel);
  shaft.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(shaft.geometry.attributes.position.count * 3).fill(0.55), 3));
  shaft.material = game.materials.darkSteel.clone(); shaft.material.side = THREE.BackSide;
  shaft.position.set(UW.x, Y - 27, UW.z); root.add(shaft);
  { // floor between the square cut and the round opening (square minus circle)
    const sh = new THREE.Shape(); sh.moveTo(-17, -17); sh.lineTo(17, -17); sh.lineTo(17, 17); sh.lineTo(-17, 17); sh.closePath();
    const hole = new THREE.Path(); hole.absarc(0, 0, UW.r, 0, Math.PI * 2, true); sh.holes.push(hole);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.5, bevelEnabled: false, curveSegments: 40 }); g.rotateX(-Math.PI / 2);
    const m = new THREE.Matrix4().makeTranslation(UW.x, Y - 0.5, UW.z);
    b.geom('concrete', g.clone(), m.clone(), { color: new THREE.Color(floorC) });
    game.physics.addTrimesh(g, m, { surface: 'concrete' });
  }
  // glowing conduits down the shaft
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, x = UW.x + Math.cos(a) * (UW.r - 0.6), z = UW.z + Math.sin(a) * (UW.r - 0.6);
    b.tube('darkSteel', [x, Y, z], [x, Y - 54, z], 0.7, { color: 0x3a3a3a, seg: 10 });
    for (let k = 0; k < 6; k++) b.cyl('engineGlow', [x, Y - 4 - k * 8.5, z], 0.75, 0.6, { seg: 10, open: true });
  }
  // railing around the opening (16-gon)
  for (let i = 0; i < 16; i++) { const a0 = i / 16 * Math.PI * 2, a1 = (i + 1) / 16 * Math.PI * 2; const R = UW.r + 0.4; b.railing([UW.x + Math.cos(a0) * R, Y, UW.z + Math.sin(a0) * R], [UW.x + Math.cos(a1) * R, Y, UW.z + Math.sin(a1) * R], { h: 1.1 }); }
  // the floor slab between the square cut and the round railing
  lights.add([UW.x, Y - 6, UW.z], 0x6fd6ff, 8, 30);
  sign(game, root, 'UNDERWELL — CONDUIT 2', [UW.x, Y + 3.2, UW.z + 17.2], { w: 6, h: 0.6, neon: false, color: '#9fe8ff', bg: '#10202a', font: '700 40px "Barlow Condensed", sans-serif' });
  D.underwell = UW;

  // ---------------------------------------------------------------- Engine Control (Tomas)
  const GY = -30; // gallery floor
  const gal = new THREE.Group(); gal.position.set(6, 0, 4); root.add(gal);
  const gb = new Builder(game, gal, { cell: 1000, offset: { x: 6, y: 0, z: 4 } });
  const lightsG = { add: (p, ...a) => lights.add([p[0] + 6, p[1], p[2] + 4], ...a) };
  { const b = gb; const root = gal;
  b.box('concrete', [93, GY - 0.25, -172], [22, 0.5, 16], { color: 0x6a665e, tex: 3 });
  for (const [x, z] of [[83, -165], [103, -165], [83, -179], [103, -179]]) b.box('darkSteel', [x, (Y + GY) / 2, z], [0.8, GY - Y, 0.8], { color: dark });
  // stairs from the floor up to the gallery (x 104..114 heading -x)
  b.stairs('concrete', [114.5, Y, -170], 10, 8, 2.4, -Math.PI / 2, { color: 0xb0aa9c });
  b.box('concrete', [104.5, GY - 0.25, -170], [1.6, 0.5, 2.6], { color: 0x6a665e });
  // glass room x 84..102, z -179..-165
  b.box('panel', [93, GY + 1.6, -164.9], [18, 3.2, 0.2], { color: 0x8a8478, tex: 2 });
  b.box('panel', [93, GY + 0.5, -179.1], [18, 1, 0.2], { color: 0x8a8478 });
  b.box('glass', [93, GY + 2.1, -179.1], [18, 2.2, 0.06], { meta: { nocam: true } });
  b.box('panel', [84, GY + 0.5, -172], [0.2, 1, 14], { color: 0x8a8478 });
  b.box('glass', [84, GY + 2.1, -172], [0.06, 2.2, 14], { meta: { nocam: true } }); // window over the Underwell (west)
  for (let z = -178; z <= -166; z += 3) b.box('darkSteel', [84, GY + 1.6, z], [0.14, 3.2, 0.12], { color: 0x2a2a2a, collide: false });
  b.box('panel', [102, GY + 1.6, -175], [0.2, 3.2, 8], { color: 0x8a8478 });
  b.box('panel', [102, GY + 2.8, -168.4], [0.2, 0.8, 2.8], { color: 0x8a8478 }); // door gap at z -169.8..-167
  b.box('panel', [102, GY + 1.6, -165.7], [0.2, 3.2, 1.4], { color: 0x8a8478 });
  b.box('darkSteel', [93, GY + 3.3, -172], [18.4, 0.2, 14.4], { color: 0x3a3936 });
  // consoles facing the window, screens, Tomas's cot, coffee cups, schematics
  for (let i = 0; i < 3; i++) {
    console_(b, [86, GY, -176 + i * 3.4], -Math.PI / 2);
    screen(game, root, [85.95 + 0.0, GY + 1.55, -176 + i * 3.4], Math.PI / 2, 1.2, 0.55, (c, w, h) => {
      c.fillStyle = '#071216'; c.fillRect(0, 0, w, h); c.strokeStyle = i === 1 ? '#ff7a4a' : '#4fd6ff'; c.lineWidth = 2;
      c.beginPath(); for (let x = 0; x < w; x += 3) c.lineTo(x, h * 0.6 + Math.sin(x * 0.05 + i) * h * 0.2 + (i === 1 && x > w * 0.6 ? Math.sin(x * 0.4) * 10 : 0)); c.stroke();
      c.fillStyle = '#e8e0d0'; c.font = '15px monospace'; c.fillText(['LEG 1  ●  NOMINAL', 'LEG 2  ▲  HARMONIC DRIFT', 'HARVEST FIELD: DORMANT'][i], 8, 18);
    });
  }
  b.box('fabric', [99, GY + 0.35, -177.5], [2.0, 0.3, 0.9], { color: 0x5a6a5a, collide: false }); b.box('darkSteel', [99, GY + 0.18, -177.5], [2.0, 0.36, 0.9], { color: 0x3a3a3a });
  table(b, [96, GY, -167.5], { w: 1.6, d: 0.9, mat: 'darkSteel', color: 0x4a4a48 });
  for (let i = 0; i < 4; i++) b.cyl('paint', [95.6 + i * 0.25, GY + 0.84, -167.4 + (i % 2) * 0.2], 0.04, 0.1, { color: 0xe8e0d0, seg: 8 });
  b.box('paint', [97, GY + 0.79, -167.6], [0.5, 0.01, 0.35], { color: 0xd8e0e8, collide: false, ry: 0.2 });
  poster(game, root, ['MERIDIAN', 'Stride assembly', 'rev. 41-C'], [93, GY + 2, -165.05], { title: 'SCHEMATIC', ry: Math.PI, accent: '#2a4a6a', bg: '#c8d4dc', w: 1.0 });
  poster(game, root, ['', 'Mama, Papa,', 'and the boys', ''], [101.85, GY + 1.6, -173], { title: '', ry: -Math.PI / 2, accent: '#5a6a7a', bg: '#e8dcc0', w: 0.35 });
  lamp(b, lightsG, [93, GY + 3.0, -172], { drop: 0.2, intensity: 4, distance: 10, cool: true, color: 0xcfe8ff });
  D.spots.tomas = { pos: new THREE.Vector3(87.3 + 6, GY, -172.6 + 4), yaw: -Math.PI / 2 };
  D.spots.gallery = new THREE.Vector3(92 + 6, GY, -170 + 4);
  game.sky?.addZone([84 + 6, GY, -179 + 4], [102 + 6, GY + 3.3, -165 + 4], 0.9, 'control');
  // railing on the gallery's open sides
  b.railing([82.2, GY, -164.2], [82.2, GY, -179.8]); b.railing([82.2, GY, -179.8], [103.8, GY, -179.8]);
  gb.finalize(); }

  // ---------------------------------------------------------------- Runner Bay & hangar (x 158..196, z -215..-160)
  b.box('concrete', [177, Y + 0.02, -187.5], [38, 0.04, 55], { color: 0x7a766c, collide: false, tex: 3 });
  b.box('hazard', [177, Y + 0.03, -187.5], [16, 0.01, 0.3], { collide: false, tex: 1 });
  // lockers along the north wall
  for (let i = 0; i < 14; i++) { b.box('paint', [162 + i * 1.1, Y + 1.1, -141.4], [1.0, 2.2, 0.8], { color: i % 3 === 0 ? 0x2f5a6a : 0x4a6a7a }); b.box('darkSteel', [162 + i * 1.1, Y + 1.6, -140.98], [0.6, 0.08, 0.02], { color: 0x222222, collide: false }); }
  sign(game, root, 'RUNNER CREW 4', [170, Y + 3.6, -140.9], { w: 5, h: 0.9, neon: false, color: '#ffb35c', bg: '#1e2226', font: '700 64px "Barlow Condensed", sans-serif' });
  // briefing board + Bram's corner
  b.box('wood', [160.4, Y + 1.8, -165], [0.15, 1.6, 3.0], { color: 0x6a5040 });
  screen(game, root, [160.5, Y + 1.8, -165], Math.PI / 2, 2.8, 1.4, (c, w, h) => {
    c.fillStyle = '#d8cbb0'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a2622'; c.lineWidth = 2; c.strokeRect(20, 18, w - 40, h - 36);
    c.fillStyle = '#a8322a'; c.font = '700 16px sans-serif'; c.fillText('E-4 SPINE · LEG TWO · PYLON 7', 26, 36);
    c.strokeStyle = '#a8322a'; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(40, 60); c.lineTo(120, 70); c.lineTo(160, 100); c.lineTo(220, 104); c.stroke();
    c.fillStyle = '#2a2622'; c.font = '13px sans-serif'; c.fillText('relay faults: 3', 140, 120);
  });
  chair(b, [164, Y, -168.5], 0.4, 0x5a3a2a); table(b, [165.5, Y, -167.5], { w: 1.2, d: 0.8, color: 0x6a4a32 });
  b.cyl('paint', [165.3, Y + 0.84, -167.4], 0.05, 0.12, { color: 0x8a3a2a, seg: 8 }); // Bram's mug
  b.box('wood', [160.3, Y + 1.6, -170], [0.12, 0.8, 0.6], { color: 0x8a6a4a }); // framed old gauntlet
  b.cyl('darkSteel', [160.4, Y + 1.6, -170], 0.06, 0.4, { rx: Math.PI / 2, color: 0x4a4a4a, seg: 10 });
  // the Mule: Nia's six-wheeled cable crawler on a service lift
  D.mule = new THREE.Group(); D.mule.position.set(180, Y + 0.6, -176); root.add(D.mule);
  { const mb = new Builder(game, D.mule, { cell: 1000 });
    mb.box('hazard', [0, -0.45, 0], [5, 0.3, 9], { collide: false, tex: 2 });
    mb.box('paint', [0, 1.1, 0.4], [2.6, 1.3, 6.4], { color: 0x7a8a5a, collide: false });
    mb.box('paint', [0, 2.15, -0.6], [2.4, 1.0, 3.2], { color: 0x6a7a4a, collide: false });
    mb.box('glassDark', [0, 2.2, 1.05], [2.2, 0.75, 0.06], { rx: -0.35, collide: false });
    mb.box('darkSteel', [0, 0.45, 0], [2.2, 0.4, 7.2], { color: 0x2a2a2a, collide: false });
    for (const sz of [-2.6, 0, 2.6]) for (const sx of [-1.45, 1.45]) { mb.cyl('rubber', [sx, 0.55, sz], 0.65, 0.5, { rz: Math.PI / 2, color: 0x1e1e1e, seg: 16 }); mb.cyl('steel', [sx * 1.02, 0.55, sz], 0.3, 0.52, { rz: Math.PI / 2, color: 0x9a9a9a, seg: 10 }); }
    mb.box('darkSteel', [0, 2.75, 1.6], [2.2, 0.25, 1.2], { color: 0x3a3a3a, collide: false }); // winch
    mb.cyl('rust', [0, 3.05, 1.6], 0.4, 1.8, { rz: Math.PI / 2, color: 0x8a6a4a, seg: 12 });
    mb.box('lampWarm', [0.8, 1.4, 3.62], [0.4, 0.2, 0.05], { collide: false, ao: false }); mb.box('lampWarm', [-0.8, 1.4, 3.62], [0.4, 0.2, 0.05], { collide: false, ao: false });
    mb.box('paint', [1.31, 1.5, 0.6], [0.02, 0.5, 2.2], { color: 0xe8e0d0, collide: false });
    mb.finalize(); }
  b.solid([180, Y + 1.6, -176], [3, 3.2, 7.4]);
  sign(game, root, 'MULE', [181.33, Y + 2.1, -175.4], { ry: Math.PI / 2, w: 1.6, h: 0.45, neon: false, color: '#2a2a2a', bg: '#e8e0d0', font: '700 56px "Barlow Condensed", sans-serif' });
  D.spots.niaTinker = { pos: new THREE.Vector3(178.0, Y + 0.05, -176.8), yaw: Math.PI / 2 };
  // tool bench (where Nia hands back the tether)
  table(b, [172, Y, -184], { w: 3, d: 1, mat: 'darkSteel', color: 0x4a4a48 });
  b.box('darkSteel', [172, Y + 1.6, -184.45], [3, 1.2, 0.08], { color: 0x3a3a3a, collide: false }); // pegboard
  for (let i = 0; i < 9; i++) b.box('steel', [170.8 + i * 0.3, Y + 1.6 + (i % 3) * 0.25, -184.38], [0.05, 0.35, 0.03], { color: 0x9a9a9a, collide: false });
  D.spots.bench = new THREE.Vector3(172, Y, -182.8);
  // the tether lies on the bench (hidden once collected)
  D.benchTether = new THREE.Group(); D.benchTether.position.set(171.3, Y + 0.82, -184.0); root.add(D.benchTether);
  { const tb = new Builder(game, D.benchTether, { cell: 1000 }); tb.cyl('darkSteel', [0, 0.06, 0], 0.06, 0.18, { rz: Math.PI / 2, color: 0x2b2e33, seg: 12 }); tb.box('steel', [0, 0.1, 0.04], [0.14, 0.04, 0.05], { color: 0x6a6a6a }); tb.finalize(); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.008, 6, 16), game.materials.tether); ring.rotation.y = Math.PI / 2; ring.position.set(0.08, 0.06, 0); D.benchTether.add(ring); }
  // overhead lights in the bay
  for (const [x, z] of [[170, -165], [185, -165], [170, -185], [185, -195], [170, -205]]) {
    lamp(b, lights, [x, -24, z], { drop: 1.5, intensity: 10, distance: 20 });
    b.box('darkSteel', [x, -22.3, z], [2.4, 0.3, 0.6], { color: 0x2a2a2a, collide: false }); b.box('lampWarm', [x, -22.48, z], [2.2, 0.04, 0.45], { collide: false, ao: false });
  }
  // bay clutter: tool carts, drums, spools, a parts rack, hoist chain, cargo trolley, painted bay lines
  for (const [x, z] of [[188, -206], [189.2, -206.4], [188.6, -204.8]]) barrel(b, [x, LD.floor, z], { color: 0x3a5a7a });
  crate(b, [163, LD.floor, -205], 1.2); crate(b, [164.3, LD.floor, -205.3], 1.0, { ry: 0.3 }); crate(b, [163.5, LD.floor + 1.2, -205.1], 0.9, { ry: -0.2 });
  for (const [x, z] of [[175, -200], [186, -186]]) { b.box('paint', [x, LD.floor + 0.55, z], [1.2, 0.9, 0.7], { color: 0xb83a2a, round: 0.04 }); b.box('darkSteel', [x, LD.floor + 1.02, z], [1.25, 0.05, 0.75], { color: 0x3a3a3a, collide: false }); for (let k = 0; k < 5; k++) b.box('steel', [x - 0.4 + k * 0.2, LD.floor + 1.1, z], [0.06, 0.12, 0.3], { color: 0x9a9a9a, collide: false }); }
  b.cyl('wood', [191, LD.floor + 0.9, -170], 0.9, 1.2, { rz: Math.PI / 2, color: 0x8a6a4a, seg: 16, collide: true }); b.cyl('rubber', [191, LD.floor + 0.9, -170], 0.75, 1.0, { rz: Math.PI / 2, color: 0x1a1a1a, seg: 16 });
  b.box('darkSteel', [194.5, LD.floor + 2, -200], [0.6, 4, 6], { color: 0x4a4a48 });
  for (let k = 0; k < 3; k++) b.box('grate', [194.0, LD.floor + 0.6 + k * 1.2, -200], [0.9, 0.05, 5.8], { color: 0x8a8a8a, collide: false });
  for (let k = 0; k < 8; k++) b.box('paint', [193.9, LD.floor + 0.7 + Math.floor(k / 3) * 1.2, -202.4 + (k % 3) * 1.8 + r() * 0.5], [0.5, 0.25, 0.6], { color: [0x5a6a7a, 0xc8a040, 0x7a3a2a][k % 3], collide: false, round: 0.03 });
  b.path('cable', [[180, -9, -176], [180, -16, -176], [180.3, -22, -176.2]], 0.05, { segs: 10 });
  b.box('darkSteel', [180.3, -22.4, -176.2], [0.5, 0.5, 0.5], { color: 0xc8a030, collide: false });
  for (const [x0, z0, x1, z1] of [[172, -168, 188, -168], [172, -184, 188, -184], [172, -168, 172, -184], [188, -168, 188, -184]]) b.box('hazard', [(x0 + x1) / 2, LD.floor + 0.01, (z0 + z1) / 2], [Math.max(0.2, Math.abs(x1 - x0)), 0.01, Math.max(0.2, Math.abs(z1 - z0))], { collide: false, tex: 1 });
  b.box('paint', [166, LD.floor + 0.45, -190], [2.2, 0.5, 1.4], { color: 0x6a6a5a, round: 0.05 }); for (const dx of [-0.8, 0.8]) for (const dz of [-0.55, 0.55]) b.cyl('rubber', [166 + dx, LD.floor + 0.18, -190 + dz], 0.18, 0.12, { rz: Math.PI / 2, color: 0x1a1a1a, seg: 10 });
  lights.add([175, -30, -195], 0xffe0c0, 5, 26);
  // bay doors (two leaves slide apart along z)
  D.bayDoor = [];
  for (const sz of [-1, 1]) {
    const d = new THREE.Group(); d.position.set(LD.x1 + 0.3, Y + 7, -190 + sz * 5.5); root.add(d);
    const db = new Builder(game, d, { cell: 1000 });
    db.box('panel', [0, 0, 0], [0.6, 14, 11], { color: 0x8a7a5a, collide: false, tex: 3 });
    db.box('hazard', [0.32, -6.3, 0], [0.02, 1, 11], { collide: false, tex: 1 });
    for (let k = -2; k <= 2; k++) db.box('darkSteel', [0.35, k * 2.6, 0], [0.1, 0.3, 11], { color: 0x3a3a3a, collide: false });
    db.finalize();
    d.userData.base = d.position.z; d.userData.dir = sz; D.bayDoor.push(d);
  }
  D.bayDoorCol = game.physics.addBox({ x: LD.x1 + 0.3, y: Y + 7, z: -190 }, { x: 0.3, y: 7, z: 11 }, null, {});
  D.openBay = (k) => { D.bayDoor.forEach(d => (d.position.z = d.userData.base + d.userData.dir * 10.5 * k)); D.bayDoorOpen = k; };
  D.openBay(0);
  D.spots.bayExit = new THREE.Vector3(193, Y, -190);

  // ---------------------------------------------------------------- the Range (x 136..160, z -248..-236), entered via a corridor
  b.box('corrugated', [148, -33, -235.7], [24, 10, 0.4], { color: 0xa8a49a, tex: 4 }); // north wall of range
  b.box('panel', [135.8, -33, -242], [0.4, 10, 12], { color: 0x5a5852 });
  b.box('darkSteel', [148, -27.8, -242], [24, 0.3, 12], { color: 0x2a2a2a, collide: false });
  // corridor from the bay down to the range
  b.box('corrugated', [158.2, -33, -225], [0.4, 10, 20], { color: 0xa8a49a, tex: 4 });
  b.box('corrugated', [168.8, -33, -228], [0.4, 10, 14], { color: 0xa8a49a, tex: 4 });
  sign(game, root, 'RANGE', [163.5, -31, -215.3], { w: 2.4, h: 0.6, neon: false, color: '#ffb35c', bg: '#1e2226', font: '700 48px "Barlow Condensed", sans-serif' });
  // firing line counter
  b.box('darkSteel', [157, Y + 0.55, -242], [0.6, 1.1, 10], { color: 0x3a3a3a });
  b.box('hazard', [156.6, Y + 0.01, -242], [0.3, 0.01, 11], { collide: false, tex: 1 });
  // back berm
  b.box('concrete', [137, Y + 4, -242], [2, 8, 12], { color: 0x4a4640 });
  // high platform for the kinetic-leap drill
  b.box('panel', [141, Y + 2.5, -238.2], [4, 5, 3], { color: 0x6a6a68, meta: { ledge: true } });
  b.box('hazard', [141, Y + 5.03, -238.2], [4.04, 0.06, 3.04], { collide: false, tex: 1 });
  for (let i = 0; i < 3; i++) lamp(b, lights, [140 + i * 8, -28.5, -242], { drop: 0.2, intensity: i === 1 ? 5 : 0, distance: 14, light: i === 1 });
  D.range = { origin: new THREE.Vector3(158.5, Y, -242), yaw: -Math.PI / 2 };
  game.sky?.addZone([136, Y, -248], [160, -28, -236], 0.95, 'range');

  // ---------------------------------------------------------------- lights for the big hall
  for (let x = 46; x < 196; x += 24) for (const z of [-170, -215]) lamp(b, lights, [x, -16, z], { drop: 2.5, intensity: 7, distance: 22 });
  lights.add([120, -20, -195], 0xffb070, 4, 40);
  lights.add([178, -27, -185], 0xffd8b0, 9, 40); lights.add([60, -27, -215], 0xffc890, 6, 40);
  game.sky?.addZone([LD.x0, LD.floor - 1, LD.z0], [LD.x1, LD.ceil, LD.z1], 0.92, 'lower');
  game.sky?.addZone([LD.x0, LD.floor - 60, -207], [120, LD.floor, -173], 0.6, 'underwell');

  D.lanes.aisle = [new THREE.Vector3(60, Y, -222), new THREE.Vector3(100, Y, -222), new THREE.Vector3(150, Y, -222), new THREE.Vector3(160, Y, -200)];
  D.lanes.north = [new THREE.Vector3(45, Y, -165), new THREE.Vector3(100, Y, -166), new THREE.Vector3(150, Y, -165)];
  b.finalize();
  return D;
}
