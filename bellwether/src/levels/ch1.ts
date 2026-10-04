import * as THREE from 'three';
import type { Chapter } from './index';
import type { World } from '../world/World';
import type { Game, Script } from '../game/Game';
import * as K from '../world/Kit';
import { M } from '../render/Materials';
import { audio } from '../audio/AudioEngine';
import { PEOPLE, citizen } from '../actors/Cast';
import { mulberry, type Look } from '../actors/Blocky';
import type { Citizen } from '../game/Citizen';
import { Signal, type Lane, CAR_COLORS, carModel } from '../game/Traffic';
import { ENV, V, helicopter, adScreen, shopBlock, busStop, cafeTable, scaffold, walkSignal, signalHead, glowSign } from './common';

/*
  Orchard Avenue runs north (+z). Road x ∈ [-7, 7], sidewalks to |x| = 12, shopfronts beyond.
  Founders Square (landing zone) opens off the west side at z ∈ [-50, -14].
  Ninth Street crosses at z ∈ [36, 48]. Quik-Stop: east side, z ∈ [62, 78].
  Scaffolded renovation (the accident): east side, z ∈ [96, 118].
  Playable z ∈ [-58, 172]; the street and its traffic run on into the fog.
*/
const SW = 0.15; // sidewalk top
const QS = { x0: 12, x1: 26, z0: 62, z1: 78, door: 70 };
const GREETS = [
  'Evening!', 'Terrible rain tonight, huh?', 'Welcome back, officers.', 'Third night of rain. Can you believe it?',
  'Love the jacket.', 'You folks lost? Orchard\'s that way.', 'Mind the puddles!', 'Evening. Lovely night for it.',
  'Oh, visitors! We don\'t get many visitors.', 'Have a good one.',
];

interface Ch1State {
  avenue: Signal;
  cross: Signal;
  courier: Citizen | null;
  sign: THREE.Group | null;
}

function building(W: World, side: 'e' | 'w', z0: number, z1: number, h: number, style: K.Style, seed: number, sign?: string, color?: string, awning?: string): void {
  const x0 = side === 'e' ? 12 : -32 - (seed % 3) * 2;
  const x1 = side === 'e' ? 32 + (seed % 3) * 2 : -12;
  const face = side === 'e' ? 'w' : 'e';
  if (sign) shopBlock(W, x0, z0, x1, z1, h, style, seed, face, sign, color ?? '#ffd27a', awning);
  else K.building(W, x0, z0, x1, z1, h, style, seed, { emissive: 1.9 });
}

function buildAvenue(W: World, g: Game, st: Ch1State, mode: string): void {
  const L = M();
  // ---- ground: everything you can see has a floor
  W.box([-400, -0.3, -400], [400, -0.2, 600], L.asphalt, { collide: false, cast: false, uv: 10 });
  K.street(W, -7, -300, 7, 460, { sidewalk: 5, axis: 'z', crosswalks: [32.5, 51.5, -54] });
  K.street(W, -300, 36, 300, 48, { sidewalk: 5, axis: 'x' });
  // fill the sidewalk gap inside the intersection
  W.box([-12, -0.2, 36], [12, 0, 48], L.asphalt, { uv: 8, surface: 'wet', cast: false });
  // ---- Founders Square (landing zone)
  W.box([-64, 0, -52], [-12, SW, -12], L.storeFloor, { uv: 3, surface: 'tile', cast: false });
  // fountain
  W.boxC([-24, 0.35, -40], [6, 0.7, 6], L.concrete, 0, { uv: 2 });
  W.boxC([-24, 0.72, -40], [5.2, 0.05, 5.2], new THREE.MeshStandardMaterial({ color: '#1d3a4a', roughness: 0.05, metalness: 0.3 }), 0, { collide: false });
  W.boxC([-24, 1.4, -40], [0.8, 1.4, 0.8], L.concrete, 0);
  for (const [x, z] of [[-18, -18], [-30, -18], [-56, -18], [-56, -46], [-18, -48]]) K.tree(W, x, z, 1.1);
  for (const [x, z] of [[-40, -16], [-14, -30], [-60, -32]]) K.streetLight(W, x, z, Math.atan2(-40 - x, -32 - z) * 0 + (x > -20 ? -Math.PI / 2 : Math.PI / 2));
  // city hall across the square
  K.building(W, -92, -56, -64, -8, 26, 'concrete', 7, { emissive: 1.4 });
  for (let z = -50; z <= -14; z += 6) W.boxC([-63, 5, z], [1.2, 10, 1.2], L.trimLight, 0);
  W.boxC([-63.4, 11, -32], [1.6, 2, 46], L.trimLight, 0, { collide: false });
  glowSign(W, 'BELLWETHER CITY HALL', V(-62.2, 12.2, -32), Math.PI / 2, 14, 1.2, '#10161e', '#e8eef6');
  K.building(W, -64, -80, -37, -52, 34, 'apartment', 3);
  K.building(W, -64, -12, -37, 2, 30, 'brick', 4);
  // police tape cordon around the landing pad
  for (const [x, z] of [[-44, -26], [-32, -26], [-44, -38], [-32, -38]]) K.barrier(W, x, z, 0);

  // ---- Orchard Avenue frontage
  const east: [number, number, number, K.Style, number, string?, string?, string?][] = [
    [-300, -58, 40, 'office', 1], [-58, -30, 34, 'concrete', 2, 'FIRST BELLWETHER BANK', '#9fd0ff'], [-30, -10, 22, 'brick', 3, 'SUDS LAUNDROMAT', '#7fe3ff', '#2a7ab8'],
    [-10, 12, 28, 'apartment', 4, 'PAGE & SPINE BOOKS', '#ffd27a', '#7a2a2a'], [12, 36, 38, 'office', 5, 'PERCH COFFEE', '#8fffb0', '#2e6b4a'],
    [48, 62, 30, 'brick', 6, 'ORCHARD PHARMACY', '#7fffd2', '#1f6b5a'], [78, 96, 46, 'apartment', 7], [96, 118, 26, 'concrete', 8],
    [118, 140, 32, 'brick', 9, 'NEON NOODLE', '#ff6fd8', '#8e2c6a'], [140, 172, 58, 'office', 10, 'THE ORCHARD HOTEL', '#ffe2a8'], [172, 460, 70, 'office', 11],
  ];
  const west: [number, number, number, K.Style, number, string?, string?, string?][] = [
    [-300, -58, 44, 'apartment', 12], [-58, -52, 30, 'brick', 13], [-14, 12, 24, 'brick', 14, 'SUNRISE BAKERY', '#ffcf8a', '#c48a2a'],
    [12, 36, 34, 'concrete', 15, 'THE BLUE NOTE', '#7fb4ff', '#1f3a5f'], [48, 70, 28, 'brick', 16], [70, 95, 52, 'apartment', 17],
    [95, 120, 30, 'office', 18, 'VOLT ELECTRONICS', '#7fe3ff', '#1d2a44'], [120, 145, 26, 'concrete', 19, 'IRON GYM', '#ff8a5a'], [145, 172, 40, 'brick', 20, 'MABEL\'S DINER', '#ff5a6a', '#c0392b'], [172, 460, 64, 'apartment', 21],
  ];
  for (const [z0, z1, h, style, seed, sign, color, awn] of east) {
    if (z0 === 62) continue;
    building(W, 'e', z0, z1, h, style, seed, sign, color, awn);
  }
  for (const [z0, z1, h, style, seed, sign, color, awn] of west) building(W, 'w', z0, z1, h, style, seed, sign, color, awn);
  // the ORPHEUM theatre marquee on the west block at Ninth
  glowSign(W, 'ORPHEUM · TONIGHT: THE RETURN', V(-11.9, 4.4, 59), Math.PI / 2, 11, 1.4, '#1a0a14', '#ffd27a', 'SOLD OUT');
  // Ninth Street frontage (both sides, out into the fog)
  for (let x = 38; x < 300; x += 22 + (x % 5)) {
    K.building(W, x, 53, x + 20, 80, 24 + ((x * 7) % 40), x % 2 ? 'brick' : 'apartment', x % 6, { emissive: 1.8 });
    K.building(W, x, 4, x + 20, 31, 22 + ((x * 3) % 36), x % 3 ? 'office' : 'concrete', (x + 2) % 6, { emissive: 1.8 });
    K.building(W, -x - 20, 53, -x, 80, 26 + ((x * 5) % 34), x % 2 ? 'apartment' : 'brick', (x + 1) % 6, { emissive: 1.8 });
    K.building(W, -x - 20, 4, -x, 31, 20 + ((x * 9) % 40), x % 3 ? 'concrete' : 'office', (x + 3) % 6, { emissive: 1.8 });
  }
  K.skyline(W, 0, 120, 360, 560, 46, 77, 180);

  // ---- the Quik-Stop: a real interior
  quikStop(W);

  // ---- renovation scaffolding over the east sidewalk (the accident)
  scaffold(W, 12, 98, 116, -1, 7.5);
  const sign = new THREE.Group();
  const signFace = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 6), new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.6 }));
  sign.add(signFace);
  const neon = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 1.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2), map: (() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const x = c.getContext('2d')!;
    x.fillStyle = '#0b0b0b';
    x.fillRect(0, 0, 512, 128);
    x.strokeStyle = '#ff5ad0';
    x.lineWidth = 6;
    x.shadowColor = '#ff5ad0';
    x.shadowBlur = 18;
    x.font = '700 64px "Barlow Condensed", Arial Narrow';
    x.strokeText('COMING SOON: MORE BELLWETHER', 18, 86);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })(), toneMapped: false }));
  neon.position.x = -0.11;
  neon.rotation.y = -Math.PI / 2;
  sign.add(neon);
  sign.position.set(10.4, 6.6, 107);
  W.add(sign);
  st.sign = sign;

  // ---- street furniture
  for (let z = -50; z < 172; z += 18) {
    if (z > 30 && z < 54) continue;
    K.streetLight(W, 7.6, z, -Math.PI / 2);
    K.streetLight(W, -7.6, z + 9, Math.PI / 2);
  }
  for (const z of [-4, 26, 88, 132]) {
    K.trashCan(W, 11.3, z);
    K.trashCan(W, -11.3, z + 6);
  }
  K.hydrant(W, 7.8, 56);
  K.hydrant(W, -7.8, 92);
  for (const z of [16, 80, 150]) K.tree(W, -10.8, z, 0.9);
  for (const z of [-20, 86, 160]) K.tree(W, 10.8, z, 0.9);
  busStop(W, -9.6, 104, Math.PI / 2);
  // café terrace outside Perch Coffee
  for (const [z, c] of [[18, '#2e6b4a'], [24, '#e8e2d0'], [30, '#2e6b4a']] as const) cafeTable(W, 10.3, z, c);
  // signals at Ninth
  const tf = () => g.traffic?.time ?? 0;
  signalHead(W, 7.6, 33, -Math.PI / 2, st.avenue, tf);
  signalHead(W, -7.6, 51, Math.PI / 2, st.avenue, tf);
  signalHead(W, -8.5, 33.5, Math.PI, st.cross, tf);
  signalHead(W, 8.5, 50.5, 0, st.cross, tf);
  const crossWalk = () => st.avenue.green; // crossing Ninth on foot is safe while the avenue is green
  walkSignal(W, 9.8, 33.2, Math.PI, crossWalk);
  walkSignal(W, -9.8, 50.8, 0, crossWalk);
  walkSignal(W, 9.8, 50.8, 0, crossWalk);
  walkSignal(W, -9.8, 33.2, Math.PI, crossWalk);
  // CIVIC ad screens
  adScreen(W, V(11.9, 11, 22), -Math.PI / 2, 10, 5.6, [
    { bg: '#0f5f7a', fg: '#eafcff', title: 'CIVIC', sub: 'Keeping Bellwether connected.', accent: '#7ff4ff' },
    { bg: '#d8642a', fg: '#fff', title: 'ORANGE LINE', sub: 'Every four minutes. Always.' },
    { bg: '#1d2a6a', fg: '#ffd27a', title: 'BEACONS WIN!', sub: 'Bellwether 3 · Harrow 2' },
  ]);
  adScreen(W, V(-11.9, 14, 84), Math.PI / 2, 12, 6.6, [
    { bg: '#2a5a3a', fg: '#fff', title: 'PERCH COFFEE', sub: 'Open all night. Like you.', accent: '#8fffb0' },
    { bg: '#0f5f7a', fg: '#eafcff', title: 'A CITY THAT CARES', sub: 'CIVIC Municipal Services', accent: '#7ff4ff' },
  ], 6);
  adScreen(W, V(0, 26, 176), Math.PI, 16, 8, [
    { bg: '#0b2a3a', fg: '#7ff4ff', title: 'POPULATION 2,103,488', sub: 'Every one of us counts. — CIVIC' },
    { bg: '#3a0b2a', fg: '#ffd27a', title: 'ORPHEUM: THE RETURN', sub: 'Tonight only. Sold out.' },
  ], 5);
  // north + south road closures (the street continues, you don't)
  for (const z of [-58, 172]) {
    for (const x of [-10, -5, 0, 5, 10]) K.barrier(W, x, z, 0);
    W.physics.addBox(-12, 0, z - 0.4, 12, 3, z + 0.4, { noVault: true });
  }
  for (const x of [-44, 44]) {
    for (const z of [33, 38, 42, 46, 51]) K.barrier(W, x, z, Math.PI / 2);
    W.physics.addBox(x - 0.4, 0, 31, x + 0.4, 3, 53, { noVault: true });
  }
  // closing the square's edges
  W.physics.addBox(-64, 0, -54, -12, 4, -52);
  W.physics.addBox(-64, 0, -14, -36, 4, -12);
  void mode;
}

function quikStop(W: World): void {
  const L = M();
  const { x0, x1, z0, z1, door } = QS;
  const h = 3.8;
  const wall = new THREE.MeshStandardMaterial({ color: '#d8d2c4', roughness: 0.85 });
  // floor + ceiling + upper storeys
  W.box([x0, 0, z0], [x1, SW, z1], L.storeFloor, { uv: 1, surface: 'tile', cast: false });
  W.box([x0, h, z0], [x1, h + 0.2, z1], L.plasterWhite, { collide: false });
  K.building(W, x0, z0, x1 + 8, z1, 34, 'brick', 22, { base: h + 0.2, emissive: 1.8 });
  W.box([x1, 0, z0], [x1 + 8, h + 0.2, z1], L.brickDark, {});
  // walls with the door gap on the west face (x = x0)
  W.box([x0 - 0.2, 0, z0], [x0, h, door - 1.3], L.glassDark, { noShoot: true });
  W.box([x0 - 0.2, 0, door + 1.3], [x0, h, z1], L.glassDark, { noShoot: true });
  W.box([x0 - 0.2, 2.6, door - 1.3], [x0, h, door + 1.3], L.metalDark, { collide: false });
  W.box([x0, 0, z0 - 0.2], [x1, h, z0], wall, {});
  W.box([x0, 0, z1], [x1, h, z1 + 0.2], wall, {});
  W.box([x1 - 0.2, 0, z0], [x1, h, z1], wall, {});
  // glow behind the glass (the store is lit), sign
  W.quad(new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4dc').multiplyScalar(0.5), transparent: true, opacity: 0.25 }), { x: x0 - 0.22, y: 1.6, z: (z0 + door - 1.3) / 2 }, door - 1.3 - z0, 2.6, -Math.PI / 2);
  glowSign(W, 'QUIK-STOP 24', V(x0 - 0.25, 3.3, door), -Math.PI / 2, 5, 0.9, '#c0392b', '#fff', 'OPEN ALL NIGHT');
  W.light({ x: x0 - 1.2, y: 3.0, z: door }, '#ff8a6a', { intensity: 6, distance: 8, glow: 0, pool: true, streak: false });
  // interior lighting
  for (const z of [z0 + 3.5, z0 + 8, z0 + 12.5]) for (const x of [x0 + 3.5, x0 + 9]) K.ceilingLight(W, x, h - 0.02, z, { intensity: 7, distance: 8 });
  W.indoor([x0, -1, z0], [x1, h, z1]);
  // aisles + fridges + counter
  K.shelf(W, x0 + 6, z0 + 5, Math.PI / 2, 5);
  K.shelf(W, x0 + 9.2, z0 + 5, Math.PI / 2, 5);
  K.shelf(W, x0 + 6, z0 + 11.6, Math.PI / 2, 4);
  K.fridge(W, x1 - 0.7, z0 + 6, -Math.PI / 2, 5);
  K.counter(W, x0 + 3, z1 - 3.4, 0, 3.2);
  K.counter(W, x0 + 4.4, z1 - 4.8, Math.PI / 2, 2.2);
  // coffee station, lottery screen, newspapers
  W.boxC([x0 + 1.1, 0.5, z0 + 1.5], [1.6, 1, 0.7], L.woodPaint, 0);
  W.boxC([x0 + 1.1, 1.25, z0 + 1.5], [0.4, 0.5, 0.35], L.plasticDark, 0, { collide: false });
  glowSign(W, 'LOTTO · JACKPOT $12,000,000', V(x0 + 3, 2.6, z1 - 0.15), Math.PI, 2.6, 0.5, '#1a2a6a', '#ffd27a');
  glowSign(W, 'COFFEE · ANY SIZE $1', V(x0 + 1.1, 2.0, z0 + 0.12), 0, 1.6, 0.4, '#3a2618', '#ffcf8a');
}

function populate(W: World, g: Game, st: Ch1State, mode: string): void {
  const r = mulberry(9001);
  const lanes = [8.6, 9.6, 10.6];
  const segments: [number, number][] = [[-50, 31], [53, 168]];
  let seed = 100;
  // sidewalk walkers: back and forth along a stretch of pavement
  for (const sx of [-1, 1]) {
    for (const [za, zb] of segments) {
      const n = za < 0 ? 12 : 14;
      for (let i = 0; i < n; i++) {
        const x = sx * lanes[i % 3];
        const z0 = za + r() * 10;
        const z1 = zb - r() * 10;
        const start = V(x, SW, z0 + r() * (z1 - z0));
        const spec = citizen(seed++, { rain: true });
        const c = g.extra(spec.look, start, {
          path: r() < 0.5 ? [V(x, SW, z1), V(x, SW, z0)] : [V(x, SW, z0), V(x, SW, z1)],
          speed: 1.1 + r() * 0.5,
          greet: r() < 0.35 ? GREETS : [],
        });
        if (spec.umbrella) c.body.attach('umbrella', 'R', spec.umbrella);
        else if (spec.prop) c.body.attach(spec.prop, 'R');
      }
    }
  }
  // Ninth street walkers (stay on their own sidewalks)
  for (const [z, xa, xb] of [[33.5, -40, -13], [50.5, 13, 40], [33.5, 13, 40], [50.5, -40, -13]] as const) {
    for (let i = 0; i < 2; i++) {
      const spec = citizen(seed++, { rain: true });
      const c = g.extra(spec.look, V(xa + r() * (xb - xa), SW, z + (i - 0.5) * 1.2), { path: [V(xa, SW, z + (i - 0.5) * 1.2), V(xb, SW, z + (i - 0.5) * 1.2)], speed: 1.2 + r() * 0.3 });
      if (spec.umbrella) c.body.attach('umbrella', 'R', spec.umbrella);
    }
  }
  // café terrace: people sitting and talking under umbrellas
  for (const [z, dx] of [[18, 0.75], [18, -0.75], [24, 0.75], [30, -0.75]] as const) {
    const spec = citizen(seed++, {});
    const c = g.extra(spec.look, V(10.3 + dx, 0, z), { yaw: dx > 0 ? -Math.PI / 2 : Math.PI / 2, solid: false, greet: r() < 0.5 ? ['Evening!', 'Pull up a chair!'] : [] });
    c.body.mode = 'sit';
    c.body.gesture(r() < 0.5 ? 'talkhands' : 'eat', 999, true);
    c.body.talking = r() < 0.5 ? 0.6 : 0;
    c.lookAtPlayer = r() < 0.7;
  }
  // bus stop queue
  for (let i = 0; i < 3; i++) {
    const spec = citizen(seed++, { rain: true });
    const c = g.extra(spec.look, V(-10.2, SW, 102 + i * 1.3), { yaw: Math.PI / 2 });
    if (i === 1) c.body.gesture('lookWatch', 999, true);
    if (i === 2) c.body.attach('phone', 'R');
  }
  // an argument outside Neon Noodle
  const a1 = g.extra(citizen(777).look, V(10.5, SW, 128), { yaw: Math.PI, solid: true });
  const a2 = g.extra(citizen(778, { rain: true }).look, V(10.5, SW, 126.4), { yaw: 0, solid: true });
  a1.body.gesture('hands_hips', 999, true);
  a2.body.gesture('talkhands', 999, true);
  a2.body.talking = 1;
  W.named.set('argue', [a1, a2]);
  // window shoppers + a phone caller
  const w1 = g.extra(citizen(seed++).look, V(-10.9, SW, 98), { yaw: -Math.PI / 2 });
  w1.body.gesture('point', 999, true);
  const ph = g.extra(citizen(seed++, { rain: true }).look, V(11.1, SW, 44 + 9), { yaw: -Math.PI / 2 });
  ph.body.attach('phone', 'R');
  // CIVIC machines doing honest work
  g.worker([V(-20, SW, -20), V(-46, SW, -20), V(-46, SW, -46), V(-20, SW, -46)], 0.7);
  g.worker([V(-9.5, SW, 60), V(-9.5, SW, 90)], 0.5);
  const sweeper = g.extra({ gen: 'gen2', shell: '#e8e4dc', accent: '#2e86c1', light: '#7ff4ff' }, V(9.8, SW, 140), { path: [V(9.8, SW, 132), V(9.8, SW, 165)], speed: 0.8, greet: ['Good evening. Mind the wet floor.'] });
  sweeper.name = 'MAINTENANCE UNIT';
  // a municipal security unit at the square, calm and polite
  const officer = g.person('officer', PEOPLE.officer, V(-13.5, SW, -16), -Math.PI / 2, { greet: [] });
  officer.lookAtPlayer = true;
  officer.hold(-Math.PI / 2 - 0.4);
  void st;
  void mode;
}

function trafficSetup(g: Game, st: Ch1State): void {
  const T = g.ensureTraffic();
  T.signals.push(st.avenue, st.cross);
  const r = mulberry(31);
  const lane = (a: THREE.Vector3, b: THREE.Vector3, stopAt: number[], sig: Signal): Lane => ({ a, b, stops: stopAt.map((at) => ({ at, signal: sig })) });
  // avenue: two lanes each way, stop lines before Ninth
  const nb = [lane(V(1.75, 0, -300), V(1.75, 0, 460), [300 + 31], st.avenue), lane(V(5.25, 0, -300), V(5.25, 0, 460), [300 + 31], st.avenue)];
  const sb = [lane(V(-1.75, 0, 460), V(-1.75, 0, -300), [460 - 53], st.avenue), lane(V(-5.25, 0, 460), V(-5.25, 0, -300), [460 - 53], st.avenue)];
  const eb = lane(V(-300, 0, 39.5), V(300, 0, 39.5), [300 - 13], st.cross);
  const wb = lane(V(300, 0, 44.5), V(-300, 0, 44.5), [300 - 13], st.cross);
  const kinds = ['sedan', 'sedan', 'taxi', 'hatch', 'sedan', 'van', 'taxi', 'sedan'] as const;
  for (const l of [...nb, ...sb]) for (let i = 0; i < 6; i++) T.addCar(l, i * 125 + r() * 40, { kind: kinds[Math.floor(r() * kinds.length)], color: CAR_COLORS[Math.floor(r() * CAR_COLORS.length)] }, 8 + r() * 3);
  for (const l of [eb, wb]) for (let i = 0; i < 5; i++) T.addCar(l, i * 120 + r() * 40, { kind: kinds[Math.floor(r() * kinds.length)], color: CAR_COLORS[Math.floor(r() * CAR_COLORS.length)] }, 8 + r() * 2);
  T.addCar(nb[0], 260, { kind: 'bus' }, 7);
}

export const ch1: Chapter = {
  id: 'ch1',
  num: 'CHAPTER ONE',
  title: 'Welcome Home',
  env: ENV.rainNight,
  seed: 101,
  build(W: World, g: Game, mode) {
    const st: Ch1State = {
      avenue: new Signal(0, 20, 0, 0.5),
      cross: new Signal(0, 20, 0.55, 0.95),
      courier: null,
      sign: null,
    };
    W.named.set('st', st);
    buildAvenue(W, g, st, mode);
    trafficSetup(g, st);
    populate(W, g, st, mode);
    // landing zone: the helicopter, rotors winding down
    const heli = helicopter();
    heli.group.position.set(-38, SW, -32);
    heli.group.rotation.y = Math.PI / 2 + 0.3;
    W.add(heli.group);
    W.named.set('heli', heli);
    let rpm = 1;
    W.onUpdate((dt) => {
      rpm = Math.max(0.15, rpm - dt * 0.03);
      heli.rotor.rotation.y += dt * 22 * rpm;
      heli.tail.rotation.x += dt * 36 * rpm;
    });
    W.physics.add({ cx: -38, cy: 1.5, cz: -32, hx: 1.5, hy: 1.5, hz: 3, yaw: Math.PI / 2 + 0.3 });
    W.spawn.set(-34.5, SW, -31);
    W.spawnYaw = -Math.PI / 2; // facing +x, toward the avenue
    if (mode !== 'title') {
      g.person('cole', PEOPLE.cole, V(-33.5, SW, -29.5), Math.PI / 2);
      g.person('maya', PEOPLE.maya, V(-35.5, SW, -28.8), Math.PI / 2);
      g.person('reyes', PEOPLE.reyes, V(-36, SW, -33.5), Math.PI / 2);
    }
  },
  ambience(g) {
    audio.setRain(0.85, false);
    audio.traffic(0.14);
    audio.crowdMurmur(0.06);
    audio.muzak(V(QS.x0 + 6, 1.5, QS.door), 0.1);
    void g;
  },
  titleCam(t) {
    const z = -40 + ((t * 180) % 200);
    return { pos: V(Math.sin(t * 3) * 3, 9 + Math.sin(t * 2) * 1.5, z), look: V(0, 4, z + 30) };
  },
  async run(s: Script) {
    const g = s.g;
    const st = s.world.named.get('st') as Ch1State;
    const cole = g.people.get('cole')!;
    const maya = g.people.get('maya')!;
    const reyes = g.people.get('reyes')!;
    const officer = g.people.get('officer')!;
    const team = [cole, maya, reyes];
    for (const p of team) {
      p.lookAtPlayer = false;
      p.greet = [];
    }

    // ---- landing
    await s.cut(async () => {
      s.cam(V(-28, 3.4, -24), V(-36, 1.4, -31), 48);
      void s.fade(0, 2);
      await s.card('CHAPTER ONE', 'WELCOME HOME', 'BELLWETHER · 11:42 PM');
      cole.faceTowards(V(0, 0, -20));
      await s.camTo(V(-30, 1.8, -26.5), V(-34, 1.55, -29.6), 3, 40);
      await s.say('cole', 'Stay together. We walk Orchard Avenue to the river and back. Nobody touches anything.');
      reyes.body.gesture('hands_hips', 3);
      await s.say('reyes', 'There\'s a guy selling pretzels, Cole.', { dur: 2.4 });
      maya.body.gesture('point', 2.2);
      await s.camTo(V(-31, 2.0, -27), V(-12, 1.6, -22), 2.4, 46);
      await s.say('maya', 'Thermal says they\'re warm. Heartbeats, body heat. They look... normal.');
      await s.say('reyes', 'Normal. In a city that\'s been empty for eleven years.');
    });
    for (const [i, p] of team.entries()) p.follow(V([-1.3, 1.4, 0.2][i], 0, [1.6, 1.8, 2.8][i]));
    g.hud.hints([['WASD', 'Move'], ['Mouse', 'Look'], ['Shift', 'Sprint'], ['E', 'Interact']]);
    s.objective('FOUNDERS SQUARE', 'Walk with the team onto Orchard Avenue', V(-10, SW, -14), 'ORCHARD AVE');
    s.checkpoint(V(-34.5, SW, -31), -Math.PI / 2);

    // ---- a polite machine
    await s.near(V(-16, SW, -18), 7);
    g.hud.hints(null);
    officer.faceTowards(g.player.pos);
    officer.body.gesture('wave', 1.6);
    audio.servo(officer.chest, 0.06);
    await s.say('officer', 'Good evening. Welcome to Bellwether.', { label: 'MUNICIPAL SECURITY' });
    await s.say('officer', 'Please enjoy your stay. Mind the wet pavement.', { label: 'MUNICIPAL SECURITY' });
    await s.say('cole', 'Keep walking. Don\'t engage.', { dur: 2 });
    s.objective('ORCHARD AVENUE', 'Walk north with the team', V(9.5, SW, 26), 'NINTH ST');

    // ---- overheard life along the avenue
    const once = (z: number, fn: () => Promise<void>) => s.world.trigger([-14, -1, z], [14, 4, z + 3], () => void fn().catch(() => {}));
    once(-6, async () => {
      await s.say('maya', 'Elias. You grew up here. Does this look right to you?');
      await s.say('elias', 'It looks exactly right. That\'s the problem.');
    });
    once(12, async () => {
      await s.say('reyes', 'Perch Coffee. They\'re open. At midnight. In a dead city.');
    });

    // ---- Ninth Street: a taxi loses its patience
    await s.zone([-14, -1, 24], [14, 4, 33]);
    const jay = g.extra(citizen(4242, { rain: true }).look, V(-9, SW, 41), { path: [V(-9, SW, 41), V(9.5, SW, 41.5)], loop: false, speed: 0.9 });
    jay.body.attach('phone', 'R');
    jay.lookAtPlayer = false;
    await s.wait(1.8);
    audio.horn(V(-14, 1, 39.5), true);
    await s.say('TAXI DRIVER', 'Come ON, buddy! Some of us got fares!', { label: 'TAXI DRIVER' });
    jay.body.gesture('shrug', 1.6);
    await s.say('PEDESTRIAN', 'Yeah, yeah. Relax.', { label: 'PEDESTRIAN' });
    await s.say('cole', 'Vale. Talk to someone. Anyone. Find out what they think is going on here.');
    s.objective('ORCHARD & NINTH', 'Talk to a resident: try the Quik-Stop', V(QS.x0 - 0.6, SW, QS.door), 'QUIK-STOP');
    s.checkpoint(V(9.5, SW, 28), Math.PI);

    // ---- the Quik-Stop
    await s.near(V(QS.x0 - 1.5, SW, QS.door), 3.5);
    for (const [i, p] of team.entries()) {
      void p.goto(V(9.0 - i * 0.9, SW, QS.door - 2.4 + i * 1.6));
      p.faceYaw = Math.PI / 2;
    }
    await s.say('cole', 'We\'ll be right out here.', { dur: 1.8 });
    s.objective('QUIK-STOP', 'Talk to the cashier', V(QS.x0 + 2.4, 1.2, QS.z1 - 3.6), 'CASHIER');
    const cashierPos = V(QS.x0 + 2.6, SW, QS.z1 - 2.5);
    const cashier = g.person('cashier', PEOPLE.cashier, cashierPos, Math.PI, { greet: [] });
    cashier.lookAtPlayer = true;
    const shopper = g.extra(citizen(5150).look, V(QS.x0 + 7.5, SW, QS.z0 + 8), { path: [V(QS.x0 + 7.6, SW, QS.z0 + 2.5), V(QS.x0 + 7.6, SW, QS.z0 + 9.5)], speed: 0.7, pause: 3 });
    shopper.body.attach('bag', 'L', '#c23a3a');
    const stocker = g.extra({ gen: 'gen2', shell: '#f2f0ea', accent: '#c0392b', light: '#7ff4ff' }, V(QS.x0 + 10.6, SW, QS.z0 + 3), { path: [V(QS.x0 + 10.6, SW, QS.z0 + 2), V(QS.x0 + 10.6, SW, QS.z0 + 12)], speed: 0.5, pause: 4, greet: ['Restocking. Please excuse me.'] });
    stocker.name = 'STOCK UNIT';
    await s.use('cashier', V(QS.x0 + 2.6, 1.3, QS.z1 - 3.4), 'Talk to the cashier', { radius: 2.4 });
    await s.cut(async () => {
      const eye = g.player.camPos.clone();
      s.cam(eye, cashier.head, 40);
      cashier.body.talking = 0;
      await s.say('cashier', 'Evening! Just the coffee?', { label: 'CASHIER' });
      await s.say('elias', 'No. I... what\'s the date today?');
      cashier.body.gesture('shrug', 1.6);
      await s.say('cashier', 'Long shift? It\'s the fourteenth. October.', { label: 'CASHIER' });
      await s.camTo(eye.clone().lerp(cashier.head, 0.25), cashier.head, 2.4, 30);
      await s.wait(0.6);
      cashier.body.gesture('reach', 1.0);
      await s.say('cashier', '...Elias? Elias Vale?', { label: 'CASHIER', dur: 2.6 });
      audio.stinger('soft');
      await s.wait(1.2);
      await s.say('cashier', 'You\'ve gotten older.', { label: 'CASHIER', dur: 2.4 });
      cashier.body.glitch(0.9);
      audio.glitchZap(cashier.head, 0.18);
      g.engine.post.uGlitch.value = 0.35;
      window.setTimeout(() => (g.engine.post.uGlitch.value = 0), 220);
      await s.wait(1.0);
      cashier.body.gesture('nod', 1.2);
      await s.say('cashier', 'Have a good night, Eli. Say hi to your mom.', { label: 'CASHIER' });
      await s.camTo(eye, cashier.head.clone().add(V(0, -0.2, 0)), 1.2, 52);
    });
    await s.thought('I have never seen that woman before in my life.');
    await s.say('maya', 'Elias? You okay? You look like you saw a ghost.', { radio: true });
    s.objective('QUIK-STOP', 'Rejoin the team outside', V(9.4, SW, QS.door), 'TEAM');
    await s.near(V(9.5, SW, QS.door), 3.2);
    await s.say('elias', 'The cashier knew my name. She said I\'d gotten older.');
    await s.say('reyes', 'Small town. People remember faces.', { dur: 2.2 });
    await s.say('elias', 'I was eighteen when I left, Reyes. I have never met her.');
    await s.say('cole', 'Then we keep moving. Eyes open.');
    for (const [i, p] of team.entries()) p.follow(V([-1.3, 1.4, 0.2][i], 0, [1.6, 1.8, 2.8][i]));
    s.objective('ORCHARD AVENUE', 'Continue north up Orchard Avenue', V(9.5, SW, 96), 'MAPLE ST');
    s.checkpoint(V(9.5, SW, QS.door), Math.PI);

    // ---- the accident
    const courier = g.person('courier', PEOPLE.courier, V(10.3, SW, 112), Math.PI, { greet: [] });
    courier.mode = 'path';
    courier.path = [V(10.3, SW, 109), V(10.3, SW, 107.2)];
    courier.loop = false;
    courier.speed = 1.0;
    courier.body.attach('phone', 'R');
    courier.lookAtPlayer = false;
    st.courier = courier;
    await s.zone([-14, -1, 92], [14, 4, 97]);
    await s.wait(0.6);
    audio.impact('metal', st.sign!.position, 0.6);
    g.fx.burst('sparks', st.sign!.position.clone(), V(0, -1, 0), 30);
    await s.say('courier', 'Yeah, I\'m two minutes out, I\'m— hey, what\'s that noise?', { label: 'COURIER', dur: 2.6 });
    await s.cut(async () => {
      s.cam(V(6.5, 1.7, 100), V(10.3, 2.5, 107), 46);
      courier.body.lookTarget = st.sign!.position;
      const sign = st.sign!;
      const y0 = sign.position.y;
      let t = 0;
      audio.screech(sign.position, 0.25, 0.6);
      await s.wait(0.6);
      g.fx.burst('sparks', sign.position.clone(), V(0, -1, 0), 60);
      while (t < 0.55) {
        await s.wait(0.03);
        t += 0.03;
        sign.position.y = y0 - 9 * t * t * 1.4;
        sign.rotation.x = t * 0.9;
      }
      sign.position.y = 1.0;
      sign.rotation.set(0.5, 0, 0.35);
      audio.impact('metal', sign.position, 1.4);
      audio.impact('thud', sign.position, 1);
      g.fx.burst('glass', sign.position.clone(), V(0, 1, 0), 120);
      g.fx.burst('sparks', sign.position.clone(), V(0, 1, 0), 90);
      s.shake(0.6);
      courier.body.mode = 'dead';
      courier.body.lookTarget = null;
      for (const c of g.crowd) if (c.pos.distanceTo(courier.pos) < 14) {
        c.body.gesture('flinch', 1.5);
        c.faceTowards(courier.pos);
        if (c.mode === 'path') c.mode = 'idle';
      }
      await s.wait(1.4);
    });
    for (const p of team) p.hold();
    s.objective('ORCHARD & MAPLE', 'Help him', V(10.2, 0.6, 107.5), 'COURIER');
    await s.use('courier', V(10.2, 0.5, 107.6), 'Help the courier', { radius: 2.6 });
    await s.cut(async () => {
      courier.body.mode = 'cower';
      courier.yaw = -Math.PI / 2;
      courier.faceYaw = -Math.PI / 2;
      const eye = V(9.2, 1.0, 107.4);
      s.cam(eye, courier.head, 50);
      await s.say('elias', 'Don\'t move. You were hit. Where does it hurt?');
      courier.body.lookTarget = eye;
      await s.say('courier', 'I\'m fine— I\'m fine, it doesn\'t... it doesn\'t hurt.', { label: 'COURIER' });
      await s.say('courier', 'Why doesn\'t it hurt?', { label: 'COURIER', dur: 2.2 });
      courier.body.openArm();
      courier.body.gesture('clutch', 999, true);
      audio.glitchZap(courier.chest, 0.14);
      audio.servo(courier.chest, 0.08, false);
      const arm = courier.body.bonePos('lowerArmL').add(V(0, -0.1, 0));
      await s.camTo(V(9.4, 1.05, 107.6), arm, 2.2, 32);
      audio.stinger('reveal');
      await s.wait(1.6);
      courier.body.lookTarget = arm;
      await s.say('courier', 'What is that?', { label: 'COURIER', dur: 2.0 });
      courier.body.glitch(1.2);
      await s.say('courier', 'What IS that? That\'s not— that\'s not my arm, that\'s not—', { label: 'COURIER', dur: 3.0 });
      await s.camTo(eye, courier.head, 0.8, 46);
      courier.body.lookTarget = eye;
      await s.say('courier', 'I\'m not— I\'m a PERSON. I\'m a person!', { label: 'COURIER', dur: 2.8 });
    });
    courier.body.mode = 'idle';
    courier.body.stopGesture();
    courier.body.gesture('clutch', 999, true);
    courier.mode = 'flee';
    courier.lookAtPlayer = false;
    audio.voice(courier.chest, { pitch: 1.1, vowels: 'aao', dur: 1.6, vol: 0.08, distort: 0.2 });
    window.setTimeout(() => courier.dispose(), 6000);
    await s.wait(2);
    for (const p of team) p.follow();
    await s.wait(2.5);
    await s.say('maya', 'Elias... his arm.');
    await s.say('reyes', 'Tell me that was a prosthetic.', { dur: 2.2 });
    await s.say('maya', 'That was not a prosthetic.', { dur: 2.2 });
    await s.say('elias', 'He didn\'t know. Did you see his face? He didn\'t know.');
    cole.body.attach('phone', 'R');
    await s.say('cole', 'Command, this is Cole.', { radio: true });
    await s.wait(1.0);
    await s.say('cole', 'We have a problem.', { radio: true, dur: 2.4 });
    s.clearWaypoint();
    await s.fade(1, 2.5);
    await s.card('', 'BELLWETHER ISN\'T DEAD', '');
    await s.wait(1.2);
  },
  shots: {
    square(g) {
      g.player.teleport(V(-30, SW, -30), -Math.PI / 2 - 0.3, -0.05);
    },
    avenue(g) {
      g.player.teleport(V(9.4, SW, -2), Math.PI, -0.02);
      for (const c of g.crowd) c.update(1 / 60, { pos: g.player.pos, camPos: g.player.camPos }, g.crowd);
    },
    ninth(g) {
      g.player.teleport(V(9.2, SW, 28), Math.PI - 0.5, -0.04);
    },
    store(g) {
      g.player.teleport(V(QS.x0 + 1.6, SW, QS.door - 4), -Math.PI / 2 - 0.55, -0.1);
      g.person('cashier', PEOPLE.cashier, V(QS.x0 + 2.6, SW, QS.z1 - 2.5), Math.PI);
    },
    cafe(g) {
      g.player.teleport(V(8.2, SW, 34), Math.PI - 0.35, -0.12);
    },
    accident(g) {
      const c = g.person('courier', PEOPLE.courier, V(10.2, SW, 107.4), -Math.PI / 2);
      c.body.mode = 'cower';
      c.body.openArm();
      c.body.gesture('clutch', 999, true);
      g.player.teleport(V(8.2, SW, 107.2), -Math.PI / 2 + 0.2, -0.45);
    },
  },
};

export type { Look };
void carModel;
