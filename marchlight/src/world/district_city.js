// Residential Terraces, Rook's apartment, the Market and the Edge Walk.
// Coordinates are in Meridian's city frame (meters). +x = starboard edge, -z = direction of travel.
import * as THREE from 'three';
import { Builder } from './builder.js';
import { crate, barrel, lamp, stringLights, cable, planter, bench, table, stool, chair, awning, sign, poster, laundry, pipeRun, vent, screen } from './props.js';
import { paperTexture } from '../core/textures.js';
import { rng } from '../core/util.js';
import { facade, rooftop } from './arch.js';

const WALL = 0.2;

export function buildCityDistrict(game, lights) {
  const root = new THREE.Group(); root.name = 'district:city';
  game.engine.cityRoot.add(root);
  const b = new Builder(game, root, { cell: 40 });
  const D = { root, anchors: {}, interact: {}, spots: {}, lanes: {}, dyn: [] };
  const r = rng(2024);

  // =================================================================== HALVARD BLOCK (Rook's building)
  // massing below Rook's floor
  b.box('plaster', [187, 3.5, -20], [14, 7, 40], { color: 0xc9b9a3, tex: 3 });
  b.box('plaster', [187, 10.5, -20], [14, 7, 40], { color: 0xd4c4ac, tex: 3 });
  b.box('concrete', [187, 7.05, -20], [14.4, 0.3, 40.4], { color: 0x9a948a, collide: false, ao: false });
  b.box('concrete', [187, 13.85, -20], [14.6, 0.3, 40.6], { color: 0x9a948a, collide: false, ao: false });
  // facade details: windows on the west face (courtyard side) for floors 1-2
  facade(b, { face: 'x-', at: 180, u0: -40, u1: 0, y0: 7, y1: 14, floor: 3.5, bay: 4.25, style: 'terrace', seed: 11, ac: 0.2, cornice: false, pilasters: 4,
    skip: [-34, -26, -14, -6].map(z => [z - 1.2, z + 1.2, 7, 10.5]) });
  // doors to floor-2 units on the courtyard level (y=7)
  for (const z of [-34, -26, -14, -6]) b.box('wood', [179.95, 8.1, z], [0.12, 2.2, 1.1], { color: 0x5a3a2a, collide: false });
  // east face (edge side): balconies with lit windows
  facade(b, { face: 'x+', at: 194, u0: -40, u1: 0, y0: 0, y1: 14, floor: 3.5, bay: 3.3, style: 'terrace', seed: 12, balcony: 0.55, lit: 0.45, cornice: false });
  facade(b, { face: 'x+', at: 194, u0: -40, u1: 0, y0: 14, y1: 17.6, floor: 3.6, bay: 3.3, style: 'terrace', seed: 13, skip: [[-26.5, -15.5, 13, 18]] });
  facade(b, { face: 'x-', at: 180, u0: -40, u1: 0, y0: 14, y1: 17.6, floor: 3.6, bay: 3.3, style: 'terrace', seed: 14, shutters: 0.6, ac: 0, skip: [[-26.5, -15.5, 13, 18], [-34.4, -31.6, 13, 18], [-9.4, -6.6, 13, 18]] });

  // third floor: Rook's apartment (interior x 182..192, z -26..-16) and closed neighbour units
  const F = 14.0;
  b.box('plaster', [187, F + 1.7, -33], [14, 3.4, 14], { color: 0xd8c8b0, tex: 3 }); // unit north (z -40..-26)
  b.box('plaster', [187, F + 1.7, -8], [14, 3.4, 16], { color: 0xd8c8b0, tex: 3 });   // unit south (z -16..0)
  b.box('plaster', [181, F + 1.7, -21], [2, 3.4, 10], { color: 0xd8c8b0, tex: 3, visible: false, collide: false });
  // apartment floor (wood)
  b.box('wood', [187, F - 0.03, -21], [10, 0.1, 10], { color: 0xb08a64, tex: 2.5 });
  // west wall with doorway at z -21.6..-20.4
  b.box('plaster', [182, F + 1.7, -23.8], [WALL, 3.4, 4.4], { color: 0xe4d8c6, tex: 3 });
  b.box('plaster', [182, F + 1.7, -18.2], [WALL, 3.4, 4.4], { color: 0xe4d8c6, tex: 3 });
  b.box('plaster', [182, F + 2.8, -21], [WALL, 1.2, 1.2], { color: 0xe4d8c6, tex: 3 });
  // north & south walls
  b.box('plaster', [187, F + 1.7, -26], [10.2, 3.4, WALL], { color: 0xe8dcc8, tex: 3 });
  b.box('plaster', [187, F + 1.7, -16], [10.2, 3.4, WALL], { color: 0xe8dcc8, tex: 3 });
  // east wall with the big window (z -24..-18, y F+0.9..F+3.1)
  b.box('plaster', [192, F + 0.45, -21], [WALL, 0.9, 10], { color: 0xe8dcc8, tex: 3 });
  b.box('plaster', [192, F + 3.25, -21], [WALL, 0.3, 10], { color: 0xe8dcc8, tex: 3 });
  b.box('plaster', [192, F + 1.7, -25], [WALL, 3.4, 2], { color: 0xe8dcc8, tex: 3 });
  b.box('plaster', [192, F + 1.7, -17], [WALL, 3.4, 2], { color: 0xe8dcc8, tex: 3 });
  b.box('glass', [192, F + 2, -21], [0.04, 2.2, 6], { collide: true, meta: { nocam: true } });
  for (const z of [-24, -22, -20, -18]) b.box('darkSteel', [192, F + 2, z], [0.12, 2.2, 0.08], { color: 0x3a3632, collide: false });
  b.box('darkSteel', [192, F + 2, -21], [0.12, 0.06, 6], { color: 0x3a3632, collide: false });
  b.box('wood', [191.75, F + 0.92, -21], [0.4, 0.05, 6.2], { color: 0x9a7a5a, collide: false }); // sill
  // ceiling
  b.box('plaster', [187, F + 3.45, -21], [10.4, 0.3, 10.4], { color: 0xf0e8dc, tex: 3 });
  b.box('wood', [187, F + 3.25, -21], [10, 0.12, 0.25], { color: 0x6a5040, collide: false });
  // roof
  b.box('concrete', [187, F + 3.8, -20], [14.6, 0.4, 40.6], { color: 0x8a847a, tex: 4 });
  b.cyl('rust', [183, F + 5.6, -34], 1.4, 3.2, { color: 0x8a6a4a, seg: 12 });
  b.cyl('rust', [190, F + 5.6, -6], 1.2, 3.2, { color: 0x6a7a7a, seg: 12 });
  for (let i = 0; i < 4; i++) b.box('glassDark', [186 + i * 1.6, F + 4.4, -12], [1.4, 0.06, 2.2], { rx: 0.4, collide: false });
  b.tube('steel', [193, F + 4, -30], [193, F + 9, -30], 0.05); b.tube('steel', [193, F + 8, -30], [191, F + 8.6, -30], 0.03);

  // ---------------- apartment interior furniture
  // bed (head against the north wall, along the window)
  b.box('wood', [190.1, F + 0.2, -24.5], [2.9, 0.4, 2.0], { color: 0x5a4030, tex: 1 });
  b.box('fabric', [190.1, F + 0.5, -24.5], [2.8, 0.22, 1.9], { color: 0xece4d6, collide: false, tex: 1 });
  b.box('fabric', [188.97, F + 0.675, -24.45], [0.5, 0.12, 1.1], { color: 0xf4efe6, collide: false, tex: 1, round: 0.05 }); // pillow
  D.blanket = makeBlanket(root, F);
  b.box('wood', [188.5, F + 0.95, -25.85], [0.12, 1.3, 2.0], { color: 0x5a4030, collide: false, ry: Math.PI / 2 });
  // nightstand with glass + lamp
  b.box('wood', [188.2, F + 0.3, -25.55], [0.5, 0.6, 0.4], { color: 0x6a5040, tex: 1 });
  b.cyl('glass', [188.1, F + 0.68, -25.5], 0.035, 0.14, { seg: 10 });
  b.cyl('darkSteel', [188.35, F + 0.7, -25.6], 0.05, 0.2, { color: 0x2a2a2a, seg: 8 });
  b.sphere('lampWarm', [188.35, F + 0.86, -25.6], 0.07, { seg: 8 });
  lights.add([188.4, F + 1.0, -25.4], 0xffb870, 0.35, 4);
  // kitchenette along the north wall (west part)
  b.box('wood', [184.3, F + 0.45, -25.55], [4.2, 0.9, 0.6], { color: 0x8a6a4a, tex: 1 });
  b.box('tiles', [184.3, F + 0.92, -25.55], [4.25, 0.05, 0.65], { color: 0xe0d8c8, collide: false, tex: 0.8 });
  b.box('tiles', [184.3, F + 1.5, -25.88], [4.2, 1.1, 0.04], { color: 0xd8e0e0, collide: false, tex: 0.8 });
  b.box('wood', [184.6, F + 2.4, -25.65], [3.4, 0.7, 0.4], { color: 0x8a6a4a, collide: false, tex: 1 });
  b.box('steel', [185.4, F + 0.93, -25.5], [0.6, 0.04, 0.4], { color: 0xa0a0a0, collide: false }); // sink
  b.box('darkSteel', [183.5, F + 0.95, -25.5], [0.6, 0.02, 0.5], { color: 0x1a1a1a, collide: false }); // stove
  b.cyl('steel', [183.4, F + 1.05, -25.45], 0.11, 0.18, { color: 0xc8c8c8, seg: 12 }); // kettle
  b.box('paint', [182.65, F + 0.95, -25.4], [0.75, 1.9, 0.75], { color: 0xd8d4c8 }); // fridge
  b.box('darkSteel', [182.98, F + 1.2, -25.0], [0.04, 0.5, 0.05], { color: 0x6a6a6a, collide: false });
  // notes on the fridge
  const noteT = paperTexture(['Ate your noodles.', 'Sorry. Shift starts at', 'nine. Don\'t be late —', 'Bram won\'t cover for', 'you again.', '            — T.'], { w: 256, h: 300, font: 'italic 24px Georgia, serif' });
  const note = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.26), new THREE.MeshStandardMaterial({ map: noteT, roughness: 0.9 }));
  note.position.set(183.03, F + 1.45, -25.25); note.rotation.y = Math.PI / 2; root.add(note);
  // table + chairs
  table(b, [185.4, F, -21.3], { w: 1.2, d: 0.85 });
  chair(b, [184.6, F, -21.3], Math.PI / 2); chair(b, [186.2, F, -21.3], -Math.PI / 2, 0x7a5a4a);
  b.cyl('paint', [185.2, F + 0.82, -21.1], 0.045, 0.1, { color: 0xc8692b, seg: 10 }); // mug
  b.box('darkSteel', [185.6, F + 0.8, -21.5], [0.3, 0.06, 0.2], { color: 0x4a4a4a, collide: false }); // gadget
  b.box('paint', [185.7, F + 0.79, -21.0], [0.3, 0.01, 0.22], { color: 0xe8e0d0, collide: false, ry: 0.3 }); // bulletin
  // rug
  b.box('fabric', [187.5, F + 0.03, -21], [3.5, 0.02, 2.6], { color: 0x8a4a3a, collide: false, tex: 1 });
  // gear rack on the south wall: jacket, harness, boots
  b.box('darkSteel', [189.5, F + 1.9, -16.2], [2.4, 0.06, 0.12], { color: 0x2a2a2a, collide: false });
  b.box('fabric', [189.0, F + 1.4, -16.3], [0.6, 0.9, 0.12], { color: 0x2f4858, collide: false, tex: 1 });
  b.box('fabric', [190.0, F + 1.45, -16.3], [0.5, 0.8, 0.1], { color: 0x3b332b, collide: false, tex: 1 });
  b.box('rubber', [190.6, F + 0.12, -16.5], [0.5, 0.25, 0.3], { color: 0x3a2a20, collide: false });
  b.box('wood', [188.0, F + 0.5, -16.45], [1.0, 1.0, 0.45], { color: 0x6a5040, tex: 1 }); // chest
  // bookshelf by the door + photos
  b.box('wood', [182.35, F + 1.1, -17.4], [0.4, 2.2, 1.6], { color: 0x6a5040, tex: 1 });
  for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) b.box('paint', [182.4, F + 0.35 + i * 0.5, -18.0 + j * 0.2], [0.25, 0.3 + r() * 0.1, 0.12], { color: [0x8a3a2a, 0x2a4a6a, 0xc8a050, 0x3a5a3a, 0xd8d0c0][Math.floor(r() * 5)], collide: false });
  // bathroom nook (SW): partition and fixtures
  b.box('plaster', [182.9, F + 1.2, -19.0], [1.4, 2.4, WALL], { color: 0xd8e0e0, tex: 3 });
  b.box('plaster', [185.2, F + 1.2, -17.6], [WALL, 2.4, 2.8], { color: 0xd8e0e0, tex: 3 });
  b.box('tiles', [183.6, F + 0.02, -17.6], [2.8, 0.04, 2.8], { color: 0xe8eef0, collide: false, tex: 0.6 });
  b.box('paint', [182.45, F + 0.85, -17.6], [0.4, 0.1, 0.5], { color: 0xf0f0f0 }); // basin
  b.box('glassDark', [182.13, F + 1.55, -17.6], [0.02, 0.8, 0.55], { collide: false }); // mirror
  b.box('steel', [185.03, F + 2.1, -16.5], [0.14, 0.05, 0.15], { color: 0xc0c0c0, collide: false }); // shower head, on the wall
  b.tube('steel', [185.1, F + 2.12, -16.5], [185.03, F + 2.12, -16.5], 0.015);
  // plants on the window sill
  for (let i = 0; i < 4; i++) { b.cyl('paint', [191.7, F + 1.0, -23.3 + i * 1.5], 0.09, 0.16, { color: 0xb86a4a, seg: 10 }); b.plane('leaf', [191.7, F + 1.25, -23.3 + i * 1.5], 0.4, 0.4, { ry: i, tex: 0.4 }); b.plane('leaf', [191.7, F + 1.25, -23.3 + i * 1.5], 0.4, 0.4, { ry: i + 1.6, tex: 0.4 }); }
  // radio on the kitchen shelf
  b.box('wood', [185.8, F + 1.05, -25.55], [0.36, 0.22, 0.18], { color: 0x8a5a3a, collide: false });
  b.box('darkSteel', [185.8, F + 1.05, -25.45], [0.2, 0.14, 0.02], { color: 0x222222, collide: false });
  // ceiling lamp
  lamp(b, lights, [187, F + 2.75, -21], { drop: 0.5, intensity: 0.8, distance: 8 });
  lights.add([190.8, F + 2.0, -21], 0xffe0b0, 0.7, 7); // window bounce fill
  // photos (textures)
  const photo = (p, lines, accent) => { const m = poster(game, root, lines, p, { ry: Math.PI / 2, w: 0.42, bg: '#e8dcc0', accent, title: '' }); return m; };
  D.photoParents = photo([182.12, F + 1.8, -23.2], ['', 'MIGRATION OF \'79', 'Mama · Papa', 'Tomas · Rook'], '#5a6a7a');
  D.photoCrew = photo([182.12, F + 1.75, -24.4], ['', 'RUNNER CREW 4', 'Bram · Nia · Rook', '"never again"'], '#8a5a3a');
  D.bed = { pos: new THREE.Vector3(190.2, F + 0.6, -24.4) };
  D.blanket.set(1, 1); // made bed with someone in it until the wake beat says otherwise

  // exterior walkway along the west face at y=14
  b.box('concrete', [178.5, F - 0.15, -20], [3, 0.3, 40], { color: 0xa8a294, tex: 2 });
  b.railing([177.05, F, -39.8], [177.05, F, -9.8]);
  b.railing([177.05, F, -2.2], [177.05, F, -0.2]);
  b.railing([177.05, F, -39.8], [180, F, -39.8]);
  for (let z = -38; z <= -2; z += 6) b.box('darkSteel', [177.3, F / 2, z], [0.3, F, 0.3], { color: 0x5a5a56, collide: false });
  for (const z of [-33, -8]) b.box('wood', [180.05, F + 1.1, z], [0.12, 2.2, 1.1], { color: 0x4a3a2a, collide: false });
  b.box('wood', [182.0, F + 1.1, -21], [0.08, 2.2, 1.15], { color: 0x6a4a32, collide: false, ry: 0, visible: false });
  lamp(b, lights, [178.5, F + 2.8, -21], { drop: 0.3, intensity: 2.5, distance: 7 });
  sign(game, root, '3-C  ROOK', [180.11, F + 2.5, -21], { ry: Math.PI / 2, w: 0.7, h: 0.18, neon: false, color: '#e8e0d0', bg: '#2a3a4a', tw: 256, th: 64, font: '700 40px "Barlow Condensed", sans-serif' });
  // stairs from the walkway down to the courtyard (y 14 -> 7), heading -x
  b.box('concrete', [176.4, F - 0.15, -6], [1.6, 0.3, 3], { color: 0xa8a294 });
  b.stairs('concrete', [165.6, 7, -6], 10, 7, 2.4, Math.PI / 2, { color: 0xb0aa9c, tex: 1.5, open: true });

  // =================================================================== TERRACE COURTYARD (y=7)
  const T = 7;
  b.box('concrete', [165, T / 2, -20], [30, T, 40], { color: 0xb8ae9e, tex: 3 });
  b.box('tiles', [165, T + 0.02, -20], [30, 0.04, 40], { color: 0xc8beac, collide: false, tex: 1.2 });
  // shopfronts under the courtyard face the market (south face z=-40)
  for (let x = 152; x <= 175; x += 4.5) { b.box('glassDark', [x, 2, -40.05], [3.2, 2.6, 0.1], { collide: false }); b.box('fabric', [x, 3.6, -40.6], [3.4, 0.05, 1.2], { rx: -0.25, color: [0x3a6a8a, 0xc85a3a, 0x6a8a4a][Math.floor(r() * 3)], collide: false }); }
  // railings at the courtyard south edge (overlooking market), with gap for the stairs (x 152..158)
  b.railing([158.4, T, -39.9], [176.9, T, -39.9]);
  b.railing([150.1, T, -39.9], [151.6, T, -39.9]);
  b.railing([158.4, T, -0.3], [179.8, T, -0.3]);
  // stairs down to the market street, heading -z
  b.stairs('concrete', [155, 0, -52], 11.5, 7, 5.6, 0, { color: 0xb0aa9c, tex: 1.5 });
  // NOTE: stairs() builds upward along +z from p; the courtyard is at z=-40, so start at the street (z -52) going +z.
  // school building
  b.box('plaster', [155.5, T + 2.2, -6.5], [9, 4.4, 9], { color: 0xe0c890, tex: 3 });
  b.box('corrugated', [155.5, T + 4.7, -6.5], [9.8, 0.6, 9.8], { color: 0xc87a5a, tex: 3 });
  for (const z of [-9.5, -6.5, -3.5]) b.box('glassDark', [160.05, T + 2.4, z], [0.1, 1.4, 1.8], { collide: false });
  b.box('wood', [160.05, T + 1.1, -11], [0.12, 2.2, 1.4], { color: 0x3a6a8a, collide: false });
  sign(game, root, 'TERRACE SCHOOL No.4', [160.12, T + 3.8, -6.5], { ry: Math.PI / 2, w: 4.5, h: 0.6, neon: false, color: '#2a2a2a', bg: '#e8d8a8', font: '700 48px "Barlow Condensed", sans-serif' });
  // painted hopscotch
  for (let i = 0; i < 6; i++) b.box('paint', [163.5, T + 0.03, -14 - i * 0.7], [0.6, 0.01, 0.6], { color: 0xf0f0e8, collide: false });
  // gardens: planters around the edges and a tree
  planter(b, [165, T, -38.6], 6, 1.0, { flowers: true }); planter(b, [172, T, -38.6], 6, 1.0);
  planter(b, [176, T, -30], 1.0, 6, { flowers: true }); planter(b, [176, T, -22], 1.0, 5);
  planter(b, [151.2, T, -26], 1.0, 8, { flowers: true }); planter(b, [151.2, T, -16], 1.0, 6);
  // the old tree in the courtyard
  b.cyl('concrete', [167, T + 0.4, -22], 2.2, 0.8, { color: 0x9a948a, seg: 16, collide: true });
  b.tube('wood', [167, T + 0.8, -22], [167.4, T + 4.5, -21.6], 0.22, { r2: 0.16, color: 0x5a4a3a, seg: 8 });
  b.tube('wood', [167.3, T + 3.2, -21.8], [168.6, T + 5, -22.6], 0.12, { color: 0x5a4a3a, seg: 6 });
  b.tube('wood', [167.2, T + 3.6, -21.8], [165.8, T + 5.2, -21.0], 0.12, { color: 0x5a4a3a, seg: 6 });
  for (let i = 0; i < 26; i++) { const a = r() * 6.28, rr = r() * 2.4; b.plane('leaf', [167.2 + Math.cos(a) * rr, T + 4.8 + r() * 1.8, -21.8 + Math.sin(a) * rr], 1.6, 1.4, { ry: r() * 3, rx: (r() - 0.5) * 0.6, tex: 1.6, color: 0xffffff }); }
  bench(b, [170.5, T, -22], -Math.PI / 2); bench(b, [163.5, T, -22], Math.PI / 2);
  // laundry lines across the courtyard
  b.tube('darkSteel', [158, T, -30], [158, T + 4, -30], 0.06); b.tube('darkSteel', [174, T, -30], [174, T + 4, -30], 0.06);
  laundry(b, [158, T + 3.8, -30], [174, T + 3.8, -30], 9, 3);
  laundry(b, [158, T + 3.3, -30], [174, T + 3.3, -30], 8, 5);
  // notice board
  b.box('wood', [172, T + 1.3, -12.2], [2.2, 1.4, 0.1], { color: 0x6a5040 });
  for (const x of [171.0, 173.0]) b.box('wood', [x, T + 1.0, -12.27], [0.09, 2.0, 0.09], { color: 0x5a4030 }); // posts
  poster(game, root, ['Route: Sallow Plains', '→ Gray Fork crossing', 'Day 214 of the March'], [171.4, T + 1.35, -12.12], { title: 'MIGRATION NOTICE', w: 0.6 });
  poster(game, root, ['Report unregistered', 'surface persons to', 'Security, Deck 2.'], [172.5, T + 1.35, -12.12], { title: 'BY ORDER', accent: '#2a3a5a', w: 0.6 });
  // water pump / fountain
  b.cyl('concrete', [160, T + 0.3, -32], 1.1, 0.6, { color: 0x8a847a, seg: 16, collide: true });
  b.tube('rust', [160, T + 0.6, -32], [160, T + 1.4, -32], 0.08, { color: 0x6a5a4a }); b.tube('rust', [160, T + 1.4, -32], [160.5, T + 1.3, -32], 0.05, { color: 0x6a5a4a });
  // bikes and crates
  crate(b, [152, T, -36], 0.8); crate(b, [152.9, T, -36.3], 0.7, { ry: 0.3 });
  // west apartment block (Coil Block) with balconies facing the courtyard
  b.box('brick', [143, 12, -20], [14, 24, 40], { color: 0xc08068, tex: 4 });
  b.box('concrete', [143, 8.6, -20], [14.2, 3.2, 40.2], { color: 0xb8ac98, tex: 3, collide: false }); // stone base storey
  facade(b, { face: 'x+', at: 150.1, u0: -40, u1: 0, y0: 7, y1: 24, floor: 3.5, bay: 3.3, style: 'brick', seed: 21, balcony: 0.6, lit: 0.4,
    skip: [-30, -18, -6].map(z => [z - 1.4, z + 1.4, 7, 10.4]) });
  rooftop(b, 143, 24, -20, 14, 40, { seed: 22, style: 'brick' });
  for (const z of [-30, -18, -6]) b.box('wood', [150.05, T + 1.1, z], [0.12, 2.2, 1.2], { color: 0x5a3a2a, collide: false });
  // north closure: Lantern Row
  b.box('brick', [166, 10, 4], [62, 20, 8], { color: 0xb47a62, tex: 4 });
  b.box('plaster', [172.5, 13.5, -0.06], [15, 13, 0.1], { color: 0xd6bc9c, tex: 3, collide: false }); // the eastern house is rendered, not brick
  facade(b, { face: 'z-', at: 0, u0: 150, u1: 165, y0: 7, y1: 20, floor: 3.25, bay: 3.2, style: 'brick', seed: 31, balcony: 0.4, lit: 0.45 });
  facade(b, { face: 'z-', at: -0.11, u0: 165, u1: 180, y0: 7, y1: 20, floor: 3.25, bay: 3.0, style: 'terrace', seed: 32, shutters: 0.7, lit: 0.4 });
  rooftop(b, 166, 20, 4, 62, 8, { seed: 33, style: 'brick' });
  stringLights(b, [151.5, T + 4.2, -38], [176.5, T + 4.6, -8], 1.2, 16);
  stringLights(b, [151.5, T + 4.0, -8], [176.5, T + 4.4, -38], 1.0, 16);

  // =================================================================== THE MARKET (y=0)
  b.box('concrete', [155, -0.15, -86], [26, 0.3, 92], { color: 0x8a847a, tex: 3 });
  b.box('tiles', [155, 0.01, -86], [12, 0.02, 92], { color: 0x9a9284, collide: false, tex: 1.5 });
  // gutters
  b.box('darkSteel', [149.1, 0.02, -86], [0.25, 0.02, 92], { color: 0x2a2a2a, collide: false });
  b.box('darkSteel', [160.9, 0.02, -86], [0.25, 0.02, 92], { color: 0x2a2a2a, collide: false });
  const shopColors = [0xc9a888, 0xb89878, 0xd0b898, 0xa88c70, 0xc0a890, 0x9a8a78, 0xd8c0a0];
  const shopSigns = [
    ['SUN LOAF', '#ffcf6a', 'bakery'], ['WEN\'S SALVAGE', '#7fdcff', 'parts'], ['TEA·HOUSE', '#9fffb0', 'tea'], ['FRESH GREENS', '#b8ff6a', 'veg'],
    ['CLOTH & THREAD', '#ff8acb', 'cloth'], ['SPICE', '#ffa64a', 'spice'], ['REPAIRS', '#7fdcff', 'repair'], ['LUCKY TANK', '#6affd8', 'fish'],
  ];
  // a painted shop interior: shelves of goods glimpsed through the open front
  const interiorMat = (kind) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
    const rr = rng(kind.length * 31 + 7);
    const wall = { bakery: '#6a4a32', parts: '#3a3e44', tea: '#4a3a2a', veg: '#4a4030', cloth: '#5a3a4a', spice: '#5a3a22', repair: '#3a3a3a', fish: '#24404a' }[kind] || '#4a4030';
    x.fillStyle = wall; x.fillRect(0, 0, 512, 256);
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, 'rgba(255,220,160,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0.35)'); x.fillStyle = g; x.fillRect(0, 0, 512, 256);
    for (const sy of [70, 140, 210]) {
      x.fillStyle = '#2a1e14'; x.fillRect(0, sy, 512, 8);
      let px = 6;
      while (px < 500) {
        const w = 10 + rr() * 26, hgt = 18 + rr() * 34;
        const hues = { bakery: ['#c8904a', '#a8703a', '#e0b070'], parts: ['#8a8e94', '#5a5e64', '#b0a080', '#c86a2a'], tea: ['#7a9a5a', '#c8a050', '#8a4a2a', '#d8d0c0'], veg: ['#6a9a3a', '#c83a2a', '#e8a030', '#4a7a2a'], cloth: ['#c83a5a', '#3a6a9a', '#d8c070', '#7a4a8a'], spice: ['#c8502a', '#e0a020', '#8a3a1a', '#d87a3a'], repair: ['#5a6a7a', '#9a9a9a', '#c8a040'], fish: ['#3a8aa8', '#5ab8c8', '#e8c060'] }[kind] || ['#a08060', '#c8a070'];
        x.fillStyle = hues[Math.floor(rr() * hues.length)];
        if (kind === 'bakery' || kind === 'veg' || kind === 'spice') { x.beginPath(); x.ellipse(px + w / 2, sy - hgt * 0.35, w / 2, hgt * 0.35, 0, 0, Math.PI * 2); x.fill(); }
        else if (kind === 'cloth') x.fillRect(px, sy - hgt - 10, w * 0.7, hgt + 10);
        else x.fillRect(px, sy - hgt, w, hgt);
        x.fillStyle = 'rgba(255,255,255,0.15)'; x.fillRect(px + 2, sy - hgt + 2, 3, hgt * 0.6);
        px += w + 3 + rr() * 6;
      }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, emissive: new THREE.Color(0.35, 0.28, 0.2), emissiveMap: t });
  };
  const interior = (kind, p, w, h, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), interiorMat(kind)); m.position.set(...p); m.rotation.y = ry; root.add(m); };
  // framed, recessed windows with sills — optional shutters & flower boxes
  const windowAt = (x, y, z, face, o = {}) => {
    const n = face; // +1 = facing +x, -1 = facing -x
    const w = o.w ?? 1.3, hh = o.h ?? 1.6;
    b.box('glassDark', [x - n * 0.08, y, z], [0.06, hh, w], { collide: false });
    b.box('wood', [x + n * 0.02, y + hh / 2 + 0.05, z], [0.14, 0.1, w + 0.2], { color: o.frame ?? 0xe8e0d0, collide: false, ao: false, tex: 1 });
    b.box('wood', [x + n * 0.04, y - hh / 2 - 0.05, z], [0.24, 0.08, w + 0.3], { color: o.frame ?? 0xe8e0d0, collide: false, ao: false, tex: 1 });
    for (const dz of [-1, 1]) b.box('wood', [x + n * 0.02, y, z + dz * (w / 2 + 0.05)], [0.12, hh, 0.1], { color: o.frame ?? 0xe8e0d0, collide: false, ao: false, tex: 1 });
    b.box('wood', [x + n * 0.0, y, z], [0.06, hh, 0.05], { color: o.frame ?? 0xe8e0d0, collide: false, ao: false });
    if (o.shutters) for (const dz of [-1, 1]) b.box('wood', [x + n * 0.06, y, z + dz * (w / 2 + 0.38)], [0.05, hh, 0.62], { ry: dz * n * 0.25, color: o.shutters, collide: false, tex: 0.6 });
    if (o.flowers) planter(b, [x + n * 0.25, y - hh / 2 - 0.12, z], 0.35, w * 0.9, { flowers: true, ry: Math.PI / 2 });
    if (o.ac) { b.box('paint', [x + n * 0.35, y - 0.3, z + w / 2 + 0.8], [0.6, 0.5, 0.8], { color: 0xc8c4bc, collide: false, round: 0.04 }); b.box('darkSteel', [x + n * 0.66, y - 0.3, z + w / 2 + 0.8], [0.02, 0.4, 0.6], { color: 0x3a3a3a, collide: false }); }
  };
  // west row (x 136..148): ground floor recessed shop, upper floors with framed windows
  let zi = 0;
  const shutterCols = [0x3a6a5a, 0x7a3a2a, 0x3a5a7a, 0x8a7a3a];
  for (let z = -40; z > -120; z -= 10) {
    const h = 9 + (zi % 3) * 3 + r() * 2;
    const col = shopColors[zi % shopColors.length], brick = zi % 3 === 1;
    const mat = brick ? 'brick' : 'plaster', mcol = brick ? 0xe8d8c8 : col, tx = brick ? 4 : 3;
    b.box(mat, [141.2, 1.7, z - 5], [10.4, 3.4, 9.8], { color: mcol, tex: tx });                 // ground floor (behind the shop)
    b.box(mat, [142, (h + 3.4) / 2, z - 5], [12, h - 3.4, 9.8], { color: mcol, tex: tx });       // upper floors
    b.box('wood', [147.95, 3.45, z - 5], [0.14, 0.18, 9.8], { color: 0x5a4030, collide: false });  // fascia beam
    for (const dz of [-4.85, 4.85]) b.box(mat, [147.2, 1.7, z - 5 + dz], [1.6, 3.4, 0.1], { color: mcol, tex: tx });
    const s = shopSigns[zi % shopSigns.length];
    interior(s[2], [146.45, 1.65, z - 5], 9.4, 3.2, Math.PI / 2);
    // counter inside the recess, goods on it
    b.box('wood', [147.5, 0.5, z - 5], [0.8, 1.0, 7.2], { color: 0x8a6a4a, tex: 1, round: 0.03 });
    b.box('wood', [147.5, 1.03, z - 5], [1.0, 0.06, 7.4], { color: 0xa8845a, collide: false, tex: 1, round: 0.02 });
    for (let k = 0; k < 7; k++) b.box('paint', [147.4 + (r() - 0.5) * 0.4, 1.15, z - 8.2 + k * 1.05], [0.38, 0.18 + r() * 0.2, 0.45], { color: [0xd8b050, 0x8aaa5a, 0xc85a3a, 0x7a9aba, 0xe0d0c0][Math.floor(r() * 5)], collide: false, round: 0.04 });
    for (let k = 0; k < 3; k++) crate(b, [148.6, 0, z - 8.6 + k * 0.7], 0.55, { color: 0xa88a60 });
    awning(b, [149.0, 3.3, z - 5], 1.9, 8.8, 0, [0xc85a3a, 0x3a6a8a, 0xd8a040, 0x5a8a5a][zi % 4]);
    // cornice per floor + windows
    for (let y = 6.6; y < h - 0.5; y += 3.2) b.box(mat === 'brick' ? 'concrete' : 'plaster', [148.08, y + 1.5, z - 5], [0.25, 0.18, 9.8], { color: 0xd8d0c4, collide: false, ao: false });
    for (let y = 5.0; y < h - 1.2; y += 3.2) for (const dz of [-2.4, 2.4]) windowAt(148.0, y, z - 5 + dz, 1, { shutters: zi % 2 ? shutterCols[zi % 4] : null, flowers: r() < 0.35, ac: r() < 0.2 });
    b.box('concrete', [142, h + 0.4, z - 5], [12.2, 0.8, 10], { color: 0xb8b0a4, collide: false });           // parapet
    if (r() < 0.6) b.cyl('rust', [139 + r() * 4, h + 1.8, z - 5 + (r() - 0.5) * 5], 0.9, 2.2, { color: 0x7a6a5a, seg: 12 });
    b.tube('rust', [148.1, 0.2, z - 0.4], [148.1, h, z - 0.4], 0.06, { color: 0x6a6a64 });                     // downpipe
    if (zi % 2 === 0) { b.box('concrete', [148.8, 4.5, z - 5], [1.5, 0.15, 3], { color: 0x8a847a }); b.railing([149.5, 4.6, z - 6.4], [149.5, 4.6, z - 3.6], { collide: false, h: 0.9 }); }
    sign(game, root, s[0], [148.95, 3.0, z - 5], { ry: Math.PI / 2, w: 3.2, h: 0.75, color: s[1], intensity: 2.2 });
    lights.add([147.0, 2.8, z - 5], 0xffd0a0, 2.2, 6);
    D.spots['shopW' + zi] = { pos: new THREE.Vector3(146.9, 0, z - 5), yaw: Math.PI / 2, kind: s[2] };
    zi++;
  }
  // east row (x 161..175), with Odile's Kitchen (z -58..-72) and the alley to the Edge Walk (z -88..-94)
  zi = 0;
  const eastShops = [
    { z0: -40, z1: -57, sign: ['FLOWERS', '#ffa0d0'], kind: 'veg' }, { z0: -72.5, z1: -88, sign: ['MERIDIAN MARKET', '#ffb35c'], kind: 'tea' }, { z0: -94, z1: -104, sign: ['NOODLE BAR 9', '#ff5a8a'], kind: 'bakery' }, { z0: -104, z1: -116, sign: ['OPTICS', '#7fdcff'], kind: 'repair' },
  ];
  for (const s of eastShops) {
    const h = 10 + r() * 4, zc = (s.z0 + s.z1) / 2, len = s.z0 - s.z1;
    const col = shopColors[zi++ % 7];
    b.box('plaster', [168.7, 1.7, zc], [12.6, 3.4, len], { color: col, tex: 3 });
    b.box('plaster', [168, (h + 3.4) / 2, zc], [14, h - 3.4, len], { color: col, tex: 3 });
    b.box('wood', [161.05, 3.45, zc], [0.14, 0.18, len], { color: 0x5a4030, collide: false });
    for (const dz of [-1, 1]) b.box('plaster', [161.8, 1.7, zc + dz * (len / 2 - 0.05)], [1.6, 3.4, 0.1], { color: col, tex: 3 });
    interior(s.kind, [162.45, 1.65, zc], len - 0.6, 3.2, -Math.PI / 2);
    b.box('wood', [161.5, 0.5, zc], [0.8, 1.0, len - 2.4], { color: 0x8a6a4a, tex: 1, round: 0.03 });
    awning(b, [160.0, 3.3, zc], 1.9, len - 1.2, Math.PI, [0x3a6a8a, 0xc85a3a, 0xd8a040][zi % 3]);
    for (let y = 6.6; y < h - 0.5; y += 3.2) b.box('plaster', [160.92, y + 1.5, zc], [0.25, 0.18, len], { color: 0xd8d0c4, collide: false, ao: false });
    for (let y = 5.2; y < h - 1.2; y += 3.2) for (let dz = -len / 2 + 2; dz < len / 2 - 1; dz += 3.2) windowAt(161.0, y, zc + dz, -1, { shutters: zi % 2 ? shutterCols[zi % 4] : null, flowers: r() < 0.3, ac: r() < 0.15 });
    b.box('concrete', [168, h + 0.4, zc], [14.2, 0.8, len + 0.2], { color: 0xb8b0a4, collide: false });
    sign(game, root, s.sign[0], [161.05, 3.0, zc], { ry: -Math.PI / 2, w: 3.6, h: 0.8, color: s.sign[1], intensity: 2.2 });
    lights.add([162.0, 2.8, zc], 0xffd0a0, 2.2, 6);
  }
  // alley block walls
  b.box('plaster', [178, 6, -91], [6, 12, 0.3], { visible: false });

  // ---- ODILE'S KITCHEN: an open-fronted restaurant you can walk into (x 161..172, z -57..-72.5)
  const OZ0 = -57.2, OZ1 = -72.3;
  b.box('plaster', [173.5, 6, -64.75], [3, 12, 15.2], { color: 0xb8a088, tex: 3 });   // back wall block
  b.box('plaster', [167, 9, -64.75], [12, 6, 15.2], { color: 0xc8a888, tex: 3 });   // upper floors
  for (let dz = -6; dz <= 6; dz += 3) windowAt(161.0, 8.6, -64.75 + dz, -1, { shutters: 0x7a3a2a, flowers: dz % 2 === 0 });
  b.box('plaster', [167, 3.0, OZ0 - 0.15], [12, 6, 0.3], { color: 0xb8a088, tex: 3 });  // side walls
  b.box('plaster', [167, 3.0, OZ1 + 0.15], [12, 6, 0.3], { color: 0xb8a088, tex: 3 });
  b.box('wood', [167, 5.95, -64.75], [12, 0.1, 15], { color: 0x6a4a32, collide: false });
  b.box('tiles', [167, 0.02, -64.75], [12, 0.04, 15], { color: 0xb87a5a, collide: false, tex: 0.7 });
  // kitchen counter (L-shape) with Odile behind it
  b.box('wood', [169.2, 0.55, -64.75], [0.8, 1.1, 9], { color: 0x7a4a2a, tex: 1 });
  b.box('wood', [169.2, 1.12, -64.75], [1.0, 0.06, 9.2], { color: 0xa87a4a, collide: false, tex: 1 });
  b.box('steel', [171.6, 0.5, -64.75], [1.2, 1.0, 8], { color: 0x9a9a9a });
  for (const z of [-62, -64.75, -67.5]) { b.cyl('darkSteel', [171.6, 1.1, z], 0.35, 0.25, { color: 0x2a2a2a, seg: 14, open: true }); }
  for (let i = 0; i < 6; i++) stool(b, [168.3, 0, -61.2 - i * 1.4], 0.72);
  table(b, [164, 0, -60.5], { w: 1.4, d: 0.9 }); table(b, [164, 0, -69], { w: 1.4, d: 0.9 });
  chair(b, [163.2, 0, -60.5], Math.PI / 2); chair(b, [164.8, 0, -60.5], -Math.PI / 2); chair(b, [163.2, 0, -69], Math.PI / 2);
  // outdoor table in the street
  table(b, [157.8, 0, -64], { w: 1.2, d: 0.8 }); stool(b, [157.0, 0, -64]); stool(b, [158.6, 0, -64]);
  // shelves, jars, hanging lanterns
  b.box('wood', [172.9, 2.2, -64.75], [0.4, 0.06, 8], { color: 0x6a4a32, collide: false });
  for (let i = 0; i < 14; i++) b.cyl('glass', [172.9, 2.38, -68.5 + i * 0.55], 0.1, 0.3, { seg: 8, collide: false });
  for (let i = 0; i < 4; i++) lamp(b, lights, [166, 5.2, -59 - i * 3.6], { drop: 0.6, intensity: i % 2 ? 0 : 4, distance: 8, light: i % 2 === 0 });
  sign(game, root, 'ODILE\'S', [160.95, 4.2, -64.75], { ry: -Math.PI / 2, w: 5, h: 1.25, color: '#ffcf8a', intensity: 3, sub: 'KITCHEN · SINCE THE 3RD MARCH' });
  awning(b, [160.2, 3.7, -64.75], 2.4, 15, Math.PI, 0xa83a2a);
  D.spots.odile = { pos: new THREE.Vector3(170.4, 0, -63.5), yaw: -Math.PI / 2 };
  D.spots.bramSeat = { pos: new THREE.Vector3(168.25, 0, -64.0), yaw: Math.PI / 2 };
  D.steam = [new THREE.Vector3(171.6, 1.4, -62), new THREE.Vector3(171.6, 1.4, -64.75), new THREE.Vector3(171.6, 1.4, -67.5)];
  D.odileBounds = { min: new THREE.Vector3(161, -1, -72.5), max: new THREE.Vector3(173, 6, -57) };

  // ---- street furniture: carts, string lights, a footbridge, posters, PA poles
  const cart = (x, z, col, label) => {
    b.box('wood', [x, 0.7, z], [1.4, 0.7, 2.2], { color: col, tex: 1 });
    b.cyl('rubber', [x - 0.75, 0.35, z - 0.6], 0.35, 0.12, { rz: Math.PI / 2, color: 0x222222, seg: 12 }); b.cyl('rubber', [x - 0.75, 0.35, z + 0.6], 0.35, 0.12, { rz: Math.PI / 2, color: 0x222222, seg: 12 });
    b.box('fabric', [x, 2.3, z], [1.8, 0.06, 2.6], { color: 0xe8d8b8, collide: false, rx: 0.08 });
    for (const dz of [-1, 1]) for (const dx of [-0.6, 0.6]) b.tube('darkSteel', [x + dx, 1.05, z + dz], [x + dx, 2.3, z + dz], 0.03);
    for (let k = 0; k < 8; k++) b.sphere('paint', [x + (r() - 0.5) * 0.9, 1.15, z + (r() - 0.5) * 1.6], 0.09, { color: [0xd85a3a, 0xe8b040, 0x8aaa4a][k % 3], seg: 6 });
  };
  cart(154, -76, 0x6a8a5a); cart(156.5, -101, 0x8a5a4a); cart(153.2, -110, 0x5a6a8a);
  for (let z = -50; z > -116; z -= 9) stringLights(b, [149.5, 6.5 + (z % 2), z], [160.5, 6.8, z - 4.5], 1.4, 10);
  for (let z = -54; z > -116; z -= 18) { b.tube('darkSteel', [149.6, 0, z], [149.6, 6, z], 0.08, { color: 0x3a3a3a }); b.box('darkSteel', [149.9, 5.8, z], [0.5, 0.3, 0.3], { color: 0x3a3a3a, collide: false }); lamp(b, lights, [150.3, 5.6, z], { drop: 0.2, intensity: 4, distance: 9, light: false }); }
  // footbridge at z -96 (y 7.5)
  b.box('concrete', [155, 7.6, -96], [12.4, 0.4, 2.6], { color: 0x8a847a });
  b.railing([148.9, 7.8, -94.8], [161.1, 7.8, -94.8], { collide: false }); b.railing([148.9, 7.8, -97.2], [161.1, 7.8, -97.2], { collide: false });
  sign(game, root, 'KEEP MERIDIAN MOVING', [155, 7.0, -94.65], { w: 6, h: 0.7, neon: false, color: '#f2ead8', bg: '#7a2a22', font: '700 52px "Barlow Condensed", sans-serif' });
  // posters on the walls
  poster(game, root, ['THE MARCH IS LIFE', 'Every step carries', 'our children forward.'], [148.06, 2.2, -82], { title: 'COUNCIL', ry: Math.PI / 2, icon: 'city' });
  poster(game, root, ['STILLNESS ZONES', 'Do not approach.', 'Do not engage.'], [148.06, 2.2, -98.6], { title: 'WARNING', ry: Math.PI / 2, accent: '#c8a020', ink: '#1a1a1a' });
  poster(game, root, ['Runners wanted.', 'Good hands, steady', 'nerve. See Bay 4.'], [161.94, 2.2, -90], { title: 'HIRING', ry: -Math.PI / 2, accent: '#3a6a5a' });
  // Sefa the busker's spot (west side, by the footbridge)
  crate(b, [150.6, 0, -88.5], 0.55, { color: 0x9a7a5a });
  D.spots.sefa = { pos: new THREE.Vector3(150.7, 0.55, -88.5), yaw: Math.PI / 2 };
  b.box('fabric', [151.4, 0.02, -88.5], [0.6, 0.02, 0.4], { color: 0x6a2a3a, collide: false }); // open case

  // ---- alley east (z -88..-94) to the Edge Walk
  b.box('concrete', [182, -0.15, -91], [42, 0.3, 6], { color: 0x8a847a, tex: 3 });
  b.box('plaster', [182, 6, -87.85], [14, 12, 0.3], { color: 0xa89880, tex: 3 });
  b.box('plaster', [182, 6, -94.15], [14, 12, 0.3], { color: 0xa89880, tex: 3 });
  cable(b, [175, 5, -88], [189, 5.5, -94], 0.8); cable(b, [175, 6.5, -94], [189, 6, -88], 0.6);
  pipeRun(b, [[175.2, 3.5, -88.2], [189, 3.5, -88.2]], 0.12, 0x7a6a5a, 'rust');
  vent(b, [182, 1.2, -88.1], 0); barrel(b, [186, 0, -93.3]); barrel(b, [186.9, 0, -93.5]);
  lamp(b, lights, [182, 4.5, -91], { drop: 0.4, intensity: 3, distance: 8, flicker: 0.4 });
  // strip of deck east of Halvard Block (seen from Rook's window)
  b.box('concrete', [197, -0.15, -22], [6, 0.3, 44], { color: 0x8f897e, tex: 3 });
  b.railing([199.6, 0, -43.8], [199.6, 0, -0.2], { h: 1.15, spacing: 1.2 });
  // ---- the Edge Walk: promenade along the hull edge (x 189..200, z -118..-44)
  b.box('concrete', [194.5, -0.15, -81], [11, 0.3, 74], { color: 0x8f897e, tex: 3 });
  b.box('wood', [196, 0.02, -81], [6, 0.04, 74], { color: 0x8a6a4a, collide: false, tex: 2 });
  b.railing([199.6, 0, -117.8], [199.6, 0, -44.2], { h: 1.15, spacing: 1.2 });
  b.box('concrete', [189, 2.5, -66], [0.6, 5, 44], { color: 0x9a948a }); // back wall (behind the east shops)
  b.box('concrete', [189, 2.5, -106], [0.6, 5, 24], { color: 0x9a948a });
  b.box('concrete', [194.5, 2, -118], [11, 4, 0.4], { color: 0x9a948a }); b.box('concrete', [194.5, 2, -44], [11, 4, 0.4], { color: 0x9a948a });
  for (let z = -112; z > -46; z += 0) { bench(b, [197.6, 0, z], -Math.PI / 2); z += 14; }
  for (let z = -115; z < -44; z += 12) lamp(b, lights, [199.2, 3.2, z], { drop: 0.1, intensity: 3, distance: 8, light: false });
  for (let z = -115; z < -44; z += 12) b.tube('darkSteel', [199.3, 0, z], [199.3, 3.3, z], 0.06, { color: 0x3a3a3a });
  // coin telescope
  b.tube('darkSteel', [198.6, 0, -78], [198.6, 1.1, -78], 0.06); b.cyl('darkSteel', [198.7, 1.3, -78], 0.12, 0.6, { rz: Math.PI / 2 + 0.25, color: 0x3a5a6a, seg: 10 });
  D.spots.telescope = { pos: new THREE.Vector3(198.0, 0, -78), yaw: Math.PI / 2 };
  planter(b, [190, 0, -60], 0.8, 6, { flowers: true }); planter(b, [190, 0, -100], 0.8, 6);
  // a closed gate in the west alley (z -100) toward the Crown lift
  b.box('darkSteel', [136.2, 2.5, -100], [0.3, 5, 6], { color: 0x3a3a40 });
  sign(game, root, 'CROWN LIFT — AUTHORIZED ONLY', [136.4, 4.3, -100], { ry: Math.PI / 2, w: 4, h: 0.5, neon: false, color: '#e8e0d0', bg: '#3a2a2a', font: '700 40px "Barlow Condensed", sans-serif' });

  // ---- tram station (elevated platform y 5.5, x 144..170, z -122..-131)
  b.box('concrete', [155, 5.3, -123.8], [26, 0.5, 3.6], { color: 0x8a847a, tex: 3 });
  b.box('hazard', [155, 5.56, -125.45], [26, 0.02, 0.3], { collide: false, tex: 1 });
  for (const x of [145, 155, 165]) b.box('darkSteel', [x, 2.6, -122.6], [0.6, 5.2, 0.6], { color: 0x4a4a4a });
  for (const x of [145, 165]) b.box('darkSteel', [x, 2.6, -131], [0.6, 5.2, 0.6], { color: 0x4a4a4a, collide: false });
  b.box('corrugated', [155, 9.6, -126.5], [26, 0.3, 9.6], { color: 0xb8b0a8, tex: 4 }); // canopy
  for (const x of [145, 155, 165]) b.tube('darkSteel', [x, 5.5, -122.6], [x, 9.5, -122.6], 0.12, { color: 0x4a4a4a });
  b.stairs('concrete', [155, 0, -117.2], 5.0, 5.55, 4, Math.PI, { color: 0xb0aa9c, tex: 1.5 });
  b.railing([142.1, 5.55, -122.2], [152.9, 5.55, -122.2]); b.railing([157.1, 5.55, -122.2], [169.9, 5.55, -122.2]);
  b.railing([142.1, 5.55, -122.2], [142.1, 5.55, -125.6]); b.railing([169.9, 5.55, -122.2], [169.9, 5.55, -125.6]);
  bench(b, [148, 5.55, -122.75], Math.PI); bench(b, [162, 5.55, -122.75], Math.PI);
  sign(game, root, 'MARKET STATION', [155, 8.6, -122.1], { w: 4.6, h: 0.8, neon: false, color: '#f2ead8', bg: '#2a4a5a', font: '700 56px "Barlow Condensed", sans-serif' });
  sign(game, root, '→ LOWER DECKS · ENGINEERING', [155, 7.9, -122.1], { w: 4.6, h: 0.4, neon: false, color: '#ffb35c', bg: '#1a1a1a', font: '700 34px "Barlow Condensed", sans-serif' });
  lamp(b, lights, [150, 9.3, -126.5], { drop: 0.2, intensity: 4, distance: 10 }); lamp(b, lights, [160, 9.3, -126.5], { drop: 0.2, intensity: 4, distance: 10 });
  D.spots.tramStop = new THREE.Vector3(155, 5.55, -124.2);
  // closing buildings south of the station (Customs House)
  b.box('plaster', [155, 9, -139], [40, 18, 14], { color: 0xd0c4b0, tex: 3 });
  facade(b, { face: 'z+', at: -132, u0: 135, u1: 175, y0: 0, y1: 18, floor: 3.6, bay: 3.4, style: 'terrace', seed: 41, shutters: 0.5, flowers: 0.3, lit: 0.5,
    skip: [[152.5, 157.5, 10, 18], [141, 170, 0, 10.5]] });
  rooftop(b, 155, 18, -139, 40, 14, { seed: 42 });
  b.box('fabric', [155, 14, -131.9], [3, 6, 0.05], { color: 0x7a2a22, collide: false });
  // boundary: west side closed by the Coil Block & market backs; invisible walls at district edges
  b.solid([135.5, 10, -80], [1, 20, 120]);
  b.solid([200.2, 10, -60], [0.4, 20, 120]);   // edge (railing handles most)
  b.solid([170, 5, 0.5], [70, 10, 1]);

  // lanes for the crowd
  D.lanes.market = [new THREE.Vector3(155, 0, -54), new THREE.Vector3(155, 0, -70), new THREE.Vector3(154, 0, -86), new THREE.Vector3(155.5, 0, -100), new THREE.Vector3(155, 0, -116)];
  D.lanes.edge = [new THREE.Vector3(195, 0, -50), new THREE.Vector3(195.5, 0, -80), new THREE.Vector3(194.5, 0, -112)];
  D.lanes.court = [new THREE.Vector3(170, T, -36), new THREE.Vector3(163, T, -30), new THREE.Vector3(158, T, -18), new THREE.Vector3(165, T, -8)];
  D.lanes.alley = [new THREE.Vector3(162, 0, -91), new THREE.Vector3(189, 0, -91)];

  b.finalize();
  // interior zones (darker ambient indoors)
  game.sky?.addZone([182, F, -26], [192, F + 3.4, -16], 0.65, 'apartment');
  game.sky?.addZone([161.5, 0, -72.3], [173, 5.9, -57.2], 0.45, 'odile');
  return D;
}

// Rook's blanket: a height field draped over the mattress that follows the body under it.
// set(torso, legs): how much of the torso / legs are under it (1 asleep, 0 out of bed). As the
// torso leaves, the top edge folds back to the waist.
function makeBlanket(root, F) {
  const NX = 40, NZ = 26, X1 = 191.64, Z0 = -25.64, Z1 = -23.36, top = F + 0.622, bodyZ = -24.3;
  const g = new THREE.BufferGeometry(), pos = new Float32Array((NX + 1) * (NZ + 1) * 3), col = new Float32Array(pos.length), idx = [];
  const base = new THREE.Color(0x3d5a78), stripe = new THREE.Color(0x5a7896), tmp = new THREE.Color();
  for (let i = 0; i <= NX; i++) for (let j = 0; j <= NZ; j++) {
    const k = (i * (NZ + 1) + j) * 3, sv = i / NX;
    tmp.copy(base).lerp(stripe, (Math.sin(sv * 34) > 0.82 ? 0.7 : 0) + (j === 0 || j === NZ ? 0.2 : 0));
    col[k] = tmp.r; col[k + 1] = tmp.g; col[k + 2] = tmp.b;
  }
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) { const a = i * (NZ + 1) + j, b = a + 1, c = a + NZ + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(idx);
  const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide }));
  mesh.receiveShadow = true; root.add(mesh);
  const bump = (x, x0, x1, s) => { const a = Math.min(1, Math.max(0, (x - x0) / s)), b = Math.min(1, Math.max(0, (x1 - x) / s)); return a * a * (3 - 2 * a) * b * b * (3 - 2 * b); };
  let last = '';
  const set = (torso, legs) => {
    const key = torso.toFixed(3) + legs.toFixed(3); if (key === last) return; last = key;
    const X0 = 189.22 + (1 - torso) * 0.55; // the top edge slides down to the waist as the torso comes up
    for (let i = 0; i <= NX; i++) for (let j = 0; j <= NZ; j++) {
      const k = (i * (NZ + 1) + j) * 3, x = X0 + (X1 - X0) * (i / NX), z = Z0 + (Z1 - Z0) * (j / NZ);
      // body under the covers: chest/belly, then two legs, toes pointing up
      const dz = z - bodyZ;
      const torsoH = 0.3 * torso * bump(x, 189.05, 190.4, 0.22) * Math.exp(-(((dz / 0.42) ** 2) ** 2));
      const legH = legs * (0.19 * bump(x, 189.8, 190.55, 0.2) * Math.exp(-((dz / 0.2) ** 2))
        + 0.3 * bump(x, 190.3, 190.8, 0.12) * Math.exp(-((dz / 0.24) ** 2)));
      const rumple = (1 - legs) * 0.02 * Math.sin(x * 3.1 + z * 1.7) * Math.sin(z * 4.3 - x * 1.3);
      const roll = 0.025 * Math.exp(-(((x - X0) / 0.05) ** 2)); // folded-over edge
      let y = top + Math.max(torsoH, legH) + rumple + roll;
      // drape over the sides and the foot of the bed
      const over = Math.max(Math.abs(z + 24.5) - 0.96, x - 191.52, 0);
      y -= over * 1.4;
      pos[k] = x; pos[k + 1] = y; pos[k + 2] = z;
    }
    g.attributes.position.needsUpdate = true; g.computeVertexNormals(); g.computeBoundingSphere();
  };
  return { mesh, set };
}

