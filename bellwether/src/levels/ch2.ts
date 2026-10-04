import * as THREE from 'three';
import type { Chapter } from './index';
import type { World } from '../world/World';
import type { Game, Script } from '../game/Game';
import * as K from '../world/Kit';
import { M } from '../render/Materials';
import { audio } from '../audio/AudioEngine';
import { PEOPLE, citizen } from '../actors/Cast';
import { mulberry } from '../actors/Blocky';
import { Signal, type Lane, CAR_COLORS } from '../game/Traffic';
import { ENV, V, adScreen, busStop, signalHead, glowSign } from './common';
import { addGiant, giantTraffic, lanterns } from '../game/Giants';

/*
  Civic Center: a plaza x ∈ [-40, 40], z ∈ [0, 80] ringed by roads and towers with giant screens.
  The CIVIC monument stands in the middle. The Municipal Records Office closes the north end
  (x ∈ [-18, 18], z ∈ [64, 80]); its upper floor is reached by the fire escape in the east alley.
*/
const SW = 0.15;
const REC = { x0: -18, x1: 18, z0: 64, z1: 80, floor: 6.2, top: 10.5 };

type Slide = { bg: string; fg: string; title: string; sub?: string; accent?: string };
const WELCOME: Slide[] = [{ bg: '#04141c', fg: '#eafcff', title: 'WELCOME HOME', sub: 'Bellwether is glad you are here.', accent: '#7ff4ff' }];

function buildPlaza(W: World, g: Game, screens: ReturnType<typeof adScreen>[]): void {
  const L = M();
  W.box([-400, -0.3, -400], [400, -0.2, 500], L.asphalt, { collide: false, cast: false, uv: 10 });
  // plaza paving + planters
  W.box([-40, 0, 0], [40, SW, 80], L.storeFloor, { uv: 3, surface: 'tile', cast: false });
  // ring roads (straight streets running on into the fog)
  K.street(W, -52, -300, -40, 400, { sidewalk: 0.01, axis: 'z' });
  K.street(W, 40, -300, 52, 400, { sidewalk: 0.01, axis: 'z' });
  K.street(W, -300, -12, 300, 0, { sidewalk: 0.01, axis: 'x' });
  K.street(W, -300, 80, 300, 92, { sidewalk: 0.01, axis: 'x' });
  // outer sidewalks
  W.box([-60, 0, -300], [-52, SW, 400], L.sidewalk, { uv: 2, surface: 'concrete', cast: false });
  W.box([52, 0, -300], [60, SW, 400], L.sidewalk, { uv: 2, surface: 'concrete', cast: false });
  // the plaza is fenced by low planters and bollards; you stay in the Civic Center
  const planter = new THREE.MeshStandardMaterial({ color: '#5d6168', roughness: 0.8 });
  for (const [x0, z0, x1, z1] of [[-40, 0, -38.8, 80], [38.8, 0, 40, 80], [-40, 0, 40, 1.2], [-40, 78.8, -18, 80], [18, 78.8, 40, 80]]) {
    W.box([x0, 0, z0], [x1, 0.9, z1], planter, { noVault: true });
    W.box([x0 + 0.1, 0.9, z0 + 0.1], [x1 - 0.1, 1.05, z1 - 0.1], L.hedge, { collide: false });
  }
  W.physics.addBox(-41, 0, -1, 41, 3, 0.4, { noVault: true });
  W.physics.addBox(-41, 0, -1, -39.5, 3, 81, { noVault: true });
  W.physics.addBox(39.5, 0, -1, 41, 3, 81, { noVault: true });
  W.physics.addBox(-41, 0, 80, 41, 3, 81, { noVault: true });
  // trees, benches, lamps
  for (const x of [-30, -18, 18, 30]) for (const z of [12, 30, 48]) K.tree(W, x, z, 1.15);
  for (const x of [-24, 24]) for (const z of [20, 40]) K.bench(W, x, z, x < 0 ? Math.PI / 2 : -Math.PI / 2);
  for (const x of [-36, 36]) for (const z of [8, 28, 48, 68]) K.streetLight(W, x, z, x < 0 ? Math.PI / 2 : -Math.PI / 2);

  // ---- the CIVIC monument: a slim pillar with ring screens and a cyan crown
  const mono = new THREE.MeshStandardMaterial({ color: '#d8dde4', roughness: 0.25, metalness: 0.6 });
  W.boxC([0, 0.6, 36], [12, 1.2, 12], L.concrete, 0, { uv: 2 });
  W.boxC([0, 1.25, 36], [11, 0.1, 11], new THREE.MeshStandardMaterial({ color: '#0e2a33', roughness: 0.05, metalness: 0.4 }), 0, { collide: false });
  W.boxC([0, 15, 36], [2.4, 28, 2.4], mono, 0);
  const crown = new THREE.Mesh(new THREE.OctahedronGeometry(2.2, 0), new THREE.MeshBasicMaterial({ color: new THREE.Color('#7ff4ff').multiplyScalar(2.2), toneMapped: false }));
  crown.position.set(0, 31.5, 36);
  W.add(crown);
  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(3.4 + i * 0.6, 0.08, 6, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color('#7ff4ff').multiplyScalar(1.6), toneMapped: false }));
    r.position.set(0, 10 + i * 6, 36);
    r.rotation.x = Math.PI / 2;
    W.add(r);
    rings.push(r);
  }
  W.light({ x: 0, y: 31.5, z: 36 }, '#7ff4ff', { intensity: 30, distance: 40, glow: 2.2, pool: false });
  W.light({ x: 0, y: 3, z: 36 }, '#7ff4ff', { intensity: 10, distance: 14, glow: 0, pool: true, streak: false });
  W.onUpdate((dt, t) => {
    crown.rotation.y += dt * 0.6;
    rings.forEach((r, i) => {
      r.rotation.z += dt * (0.3 + i * 0.15) * (i % 2 ? -1 : 1);
      r.position.y = 10 + i * 6 + Math.sin(t * 0.8 + i) * 0.4;
    });
  });
  // monument faces: four small CIVIC screens
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    screens.push(adScreen(W, V(Math.sin(a) * 1.25, 6, 36 + Math.cos(a) * 1.25), a, 2.2, 3.4, [{ bg: '#04141c', fg: '#7ff4ff', title: 'CIVIC', sub: 'Here for you.' }], 99));
  }

  // ---- the towers that ring the plaza, every one wearing a giant screen
  const ringBuildings: [number, number, number, number, number, K.Style][] = [
    [-120, -40, -60, 10, 90, 'office'], [-120, 14, -60, 52, 120, 'office'], [-120, 56, -60, 100, 70, 'apartment'],
    [60, -40, 120, 12, 110, 'office'], [60, 16, 120, 50, 80, 'concrete'], [60, 54, 120, 100, 130, 'office'],
    [-60, 96, -12, 150, 95, 'office'], [-8, 96, 40, 150, 140, 'office'], [44, 96, 60, 150, 60, 'brick'],
    [-60, -80, -10, -16, 70, 'apartment'], [-6, -80, 40, -16, 100, 'office'], [44, -80, 60, -16, 50, 'brick'],
  ];
  ringBuildings.forEach(([x0, z0, x1, z1, h, st], i) => K.building(W, x0, z0, x1, z1, h, st, 30 + i, { emissive: 2.0 }));
  K.skyline(W, 0, 40, 260, 460, 40, 91, 200);
  const big: [THREE.Vector3, number, number, number][] = [
    [V(-59.6, 34, 33), Math.PI / 2, 30, 16], [V(59.6, 30, 33), -Math.PI / 2, 26, 14], [V(16, 46, 95.6), Math.PI, 34, 18], [V(-30, 30, 95.6), Math.PI, 20, 11], [V(15, 28, -15.6), 0, 26, 13],
  ];
  const slides: Slide[][] = [
    [{ bg: '#0f5f7a', fg: '#eafcff', title: 'CIVIC', sub: 'Keeping Bellwether connected.', accent: '#7ff4ff' }, { bg: '#1d2a6a', fg: '#ffd27a', title: 'BEACONS WIN!', sub: 'Bellwether 3 · Harrow 2' }],
    [{ bg: '#d8642a', fg: '#fff', title: 'ORANGE LINE', sub: 'Every four minutes. Always.' }, { bg: '#2a5a3a', fg: '#fff', title: 'PERCH COFFEE', sub: 'Open all night.', accent: '#8fffb0' }],
    [{ bg: '#0b2a3a', fg: '#7ff4ff', title: 'POPULATION 2,103,488', sub: 'Every one of us counts.' }, { bg: '#3a0b2a', fg: '#ffd27a', title: 'CITY OF TOMORROW', sub: 'Bellwether Municipal Authority' }],
    [{ bg: '#2a1a3a', fg: '#fff', title: 'LINCOLN ELEMENTARY', sub: 'Enrolment open. Every child belongs.' }],
    [{ bg: '#3a2a0b', fg: '#fff', title: 'THE ORPHEUM', sub: 'Now showing: THE RETURN' }],
  ];
  big.forEach(([p, yaw, w, h], i) => screens.push(adScreen(W, p, yaw, w, h, slides[i], 6 + i)));
  void g;
}

function buildRecords(W: World): void {
  const L = M();
  const { x0, x1, z0, z1, floor, top } = REC;
  const stone = new THREE.MeshStandardMaterial({ color: '#c9c2b2', roughness: 0.75 });
  const inner = new THREE.MeshStandardMaterial({ color: '#e4dccb', roughness: 0.85 });
  // ground floor: solid (locked); steps and columns on the plaza side
  W.box([x0, 0, z0], [x1, floor, z1], stone, { uv: 4, noVault: true });
  for (let i = 0; i < 4; i++) W.box([x0 - 1 + i * 0.4, 0, z0 - 3 + i * 0.6], [x1 + 1 - i * 0.4, 0.2 + i * 0.2, z0], stone, { uv: 2 });
  for (let x = x0 + 2; x <= x1 - 2; x += 4) W.boxC([x, 4.5, z0 - 1.6], [1.0, 9, 1.0], stone, 0, { uv: 2 });
  W.box([x0 - 1, 9, z0 - 2.4], [x1 + 1, 10.4, z0], stone, { collide: false, uv: 2 });
  glowSign(W, 'MUNICIPAL RECORDS OFFICE', V(0, 9.7, z0 - 2.45), Math.PI, 16, 1, '#1a1814', '#e8dcc0');
  // main doors (locked) + notice
  W.boxC([0, 1.9, z0 - 0.05], [3.4, 3.6, 0.15], new THREE.MeshStandardMaterial({ color: '#3a2618', roughness: 0.5 }), 0, { collide: false });
  glowSign(W, 'CLOSED · SERVICES RESUME 8:00 AM', V(0, 2.6, z0 - 0.15), Math.PI, 2.4, 0.5, '#0b2028', '#7ff4ff');
  // upper floor shell: walls with the east window, roof
  W.box([x0, floor, z0], [x1, top, z0 + 0.3], stone, { uv: 4 });
  W.box([x0, floor, z1 - 0.3], [x1, top, z1], stone, { uv: 4 });
  W.box([x0, floor, z0], [x0 + 0.3, top, z1], stone, { uv: 4 });
  W.box([x1 - 0.3, floor, z0], [x1, top, 77], stone, { uv: 4 });
  W.box([x1 - 0.3, floor + 2.8, 77], [x1, top, 79], stone, { uv: 4 });
  W.box([x1 - 0.3, floor, 79], [x1, top, z1], stone, { uv: 4 });
  W.box([x0 - 0.4, top, z0 - 0.4], [x1 + 0.4, top + 0.4, z1 + 0.4], stone, { uv: 4 });
  // windows facing the plaza (lit) so the upper floor reads from outside
  for (let x = x0 + 3; x <= x1 - 3; x += 4.5) W.quad(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe2a8').multiplyScalar(0.9) }), { x, y: floor + 2, z: z0 - 0.02 }, 1.6, 2, Math.PI);
  // interior: the records room
  W.box([x0 + 0.3, floor, z0 + 0.3], [x1 - 0.3, floor + 0.02, z1 - 0.3], L.woodFloor, { collide: false, uv: 1 });
  W.box([x0 + 0.3, top - 0.05, z0 + 0.3], [x1 - 0.3, top, z1 - 0.3], inner, { collide: false });
  for (let x = x0 + 3; x < x1 - 4; x += 3.2) {
    for (const z of [67, 71]) {
      W.boxC([x, floor + 1.1, z], [2.4, 2.2, 0.6], new THREE.MeshStandardMaterial({ color: '#6a6e74', roughness: 0.5, metalness: 0.5 }), 0, { uv: 1 });
      for (let k = 0; k < 4; k++) W.boxC([x, floor + 0.35 + k * 0.5, z - 0.31], [2.2, 0.03, 0.02], L.metalDark, 0, { collide: false });
    }
  }
  for (const z of [68, 74]) for (const x of [-12, -4, 4, 12]) K.ceilingLight(W, x, top - 0.08, z, { intensity: 6, distance: 8 });
  W.indoor([x0, floor - 0.5, z0], [x1, top, z1]);
  // the census terminal
  W.boxC([2, floor + 0.38, 76], [2.2, 0.76, 0.9], L.woodPaint, 0);
  W.boxC([2, floor + 1.05, 75.9], [0.9, 0.6, 0.08], L.plasticDark, 0, { collide: false });
  W.quad(new THREE.MeshBasicMaterial({ color: new THREE.Color('#7ff4ff').multiplyScalar(1.2) }), { x: 2, y: floor + 1.05, z: 75.85 }, 0.82, 0.5, Math.PI);
  W.light({ x: 2, y: floor + 1.4, z: 75.2 }, '#7ff4ff', { intensity: 3, distance: 4, glow: 0, pool: false });
  // ---- east alley + fire escape
  K.building(W, 24, 60, 38, 80, 12, 'brick', 44, { emissive: 1.6, noRoof: true });
  W.box([18, 0, 60], [24, SW, 80], L.concreteDark, { surface: 'concrete', cast: false });
  K.trashCan(W, 23, 63);
  K.crateProp(W, 22.6, 0.4, 72, 0.8);
  // balcony at y 4.2 along the east wall, ladder at its outer edge
  const metal = new THREE.MeshStandardMaterial({ color: '#2b2f35', roughness: 0.5, metalness: 0.6 });
  W.box([18, 4.0, 66], [19.6, 4.2, 80], metal, { surface: 'metal' });
  W.box([19.55, 4.2, 66], [19.6, 5.2, 67.4], metal, { noVault: true });
  W.box([19.55, 4.2, 68.6], [19.6, 5.2, 76], metal, { noVault: true });
  W.box([18, 4.2, 65.95], [19.6, 5.2, 66], metal, { noVault: true });
  for (let z = 66; z < 80; z += 1.4) W.boxC([19.6, 2.1, z], [0.08, 4.2, 0.08], metal, 0, { collide: false });
  K.ladder(W, 19.75, 68, Math.PI / 2, 4.25, 0);
  // an AC unit to vault, then a raised landing to climb up to the window
  W.box([18.2, 4.2, 70.8], [19.5, 5.05, 71.6], new THREE.MeshStandardMaterial({ color: '#b8bcc2', roughness: 0.5, metalness: 0.5 }), {});
  W.box([18, 4.2, 76], [19.6, floor, 80], metal, { surface: 'metal' });
  // warm light spilling from the window
  W.light({ x: 18.8, y: floor + 1.4, z: 78 }, '#ffd8a0', { intensity: 5, distance: 6, glow: 0, pool: false });
  W.quad(new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd8a0').multiplyScalar(0.6), transparent: true, opacity: 0.5 }), { x: 18.05, y: floor + 1.4, z: 78 }, 2, 2.8, Math.PI / 2);
  // close the alley off at the back
  W.physics.addBox(17.5, 0, 80, 24.5, 4, 81, { noVault: true });
  W.boxC([21, 1.5, 80.3], [6, 3, 0.3], L.brickDark, 0, { collide: false });
}

function traffic(g: Game): void {
  const T = g.ensureTraffic();
  const ns = new Signal(0, 22, 0, 0.45);
  const ew = new Signal(0, 22, 0.5, 0.95);
  T.signals.push(ns, ew);
  const r = mulberry(55);
  const L = (a: THREE.Vector3, b: THREE.Vector3, stops: [number, Signal][]): Lane => ({ a, b, stops: stops.map(([at, signal]) => ({ at, signal })) });
  const lanes: Lane[] = [
    L(V(-49, 0, 400), V(-49, 0, -300), [[400 - 93, ns], [400 - 1, ns]]),
    L(V(-43, 0, -300), V(-43, 0, 400), [[300 - 13, ns], [300 + 79, ns]]),
    L(V(43, 0, 400), V(43, 0, -300), [[400 - 93, ns], [400 - 1, ns]]),
    L(V(49, 0, -300), V(49, 0, 400), [[300 - 13, ns], [300 + 79, ns]]),
    L(V(-300, 0, -3), V(300, 0, -3), [[300 - 53, ew], [300 + 39, ew]]),
    L(V(300, 0, -9), V(-300, 0, -9), [[300 - 53, ew], [300 + 39, ew]]),
    L(V(-300, 0, 89), V(300, 0, 89), [[300 - 53, ew], [300 + 39, ew]]),
    L(V(300, 0, 83), V(-300, 0, 83), [[300 - 53, ew], [300 + 39, ew]]),
  ];
  const kinds = ['sedan', 'sedan', 'taxi', 'hatch', 'van', 'taxi'] as const;
  for (const l of lanes) for (let i = 0; i < 4; i++) T.addCar(l, i * 170 + r() * 60, { kind: kinds[Math.floor(r() * kinds.length)], color: CAR_COLORS[Math.floor(r() * CAR_COLORS.length)] }, 9 + r() * 3);
  for (const [x, z, yaw] of [[-53, -13, 0], [53, 93, Math.PI], [-53, 93, Math.PI / 2], [53, -13, -Math.PI / 2]] as const) signalHead((g.world as World), x, z, yaw, Math.abs(Math.sin(yaw)) > 0.5 ? ew : ns, () => T.time);
  busStop(g.world!, -56, 30, Math.PI / 2);
}

const QUESTIONS: { at: THREE.Vector3; yaw: number; look: () => Parameters<Game['extra']>[0]; lines: [string, string][]; prop?: 'coffee' | 'briefcase' | 'bag' }[] = [
  {
    at: V(-12, SW, 22), yaw: Math.PI / 2, look: () => ({ ...citizen(9001, { rain: true }).look, female: true, hair: 'bun', hairColor: '#d9d6d0', jacket: 'coat', jacketColor: '#5a2e4a', height: 1.62 }),
    lines: [['RESIDENT', 'You\'re from outside? Really outside?'], ['RESIDENT', 'My daughter says there isn\'t an outside anymore. That the rest of the world went dark the same night we did.'], ['ELIAS', 'There\'s an outside. There\'s a whole country out there.'], ['RESIDENT', '...That\'s exactly what CIVIC said you would say.']],
  },
  {
    at: V(14, SW, 16), yaw: -Math.PI / 2, look: () => ({ ...citizen(9002).look, jacket: 'blazer', jacketColor: '#2d3436', tie: '#8e2c2c', top: 'shirt', topColor: '#e8ecf0', female: false, hair: 'side' }), prop: 'briefcase',
    lines: [['RESIDENT', 'Can I ask you something? What\'s the date out there?'], ['ELIAS', 'It\'s... the fourteenth. Of October.'], ['RESIDENT', 'Huh. Same as here. It\'s always the fourteenth here, but the weather changes.'], ['RESIDENT', 'I thought maybe out there it moves.']],
  },
  {
    at: V(-16, SW, 50), yaw: Math.PI / 2, look: () => ({ ...citizen(9003).look, child: true, height: 1.18, hair: 'curly', topColor: '#27ae60' }),
    lines: [['KID', 'Are you from the other cities? CIVIC says the other cities went to sleep.'], ['ELIAS', 'Nobody went to sleep, kid.'], ['KID', 'Mom says it\'s rude to lie.']],
  },
  {
    at: V(10, SW, 56), yaw: -Math.PI / 2 + 0.4, look: () => ({ gen: 'gen3', top: 'polo', topColor: '#c0392b', jacket: 'apron', jacketColor: '#f1ece2', pants: '#2a2a2a', hair: 'buzz', hairColor: '#3a2a1c' }),
    lines: [['VENDOR', 'Pretzel? On the house. Visitors are rare.'], ['VENDOR', 'Visitors are... unprecedented.'], ['ELIAS', 'How long have you worked this cart?'], ['VENDOR', 'Since I can remember. Since... the fourteenth.']],
  },
];

export const ch2: Chapter = {
  id: 'ch2',
  num: 'CHAPTER TWO',
  title: 'Perfectly Normal',
  env: { ...ENV.rainNight, rain: 0.45, fogDensity: 0.0085 },
  seed: 202,
  build(W: World, g: Game, mode) {
    const screens: ReturnType<typeof adScreen>[] = [];
    W.named.set('screens', screens);
    buildPlaza(W, g, screens);
    buildRecords(W);
    traffic(g);
    // Shepherds working the ring roads, and lantern drones circling the monument
    addGiant(W, g, { pos: V(-120, 0, 88), yaw: Math.PI / 2, path: [V(-300, 0, 88), V(300, 0, 88), V(-300, 0, 88)], cargo: 'lamps', name: 'SHEPHERD 06' });
    addGiant(W, g, { pos: V(48, 0, 160), yaw: Math.PI, path: [V(48, 0, 380), V(48, 0, -260), V(48, 0, 380)], cargo: 'tank', name: 'SHEPHERD 03', scale: 1.15 });
    giantTraffic(W, g);
    lanterns(W, V(0, 0, 36), 16, 36, '#7ff4ff', 22);
    // residents enjoying the Civic Center
    const r = mulberry(707);
    let seed = 300;
    for (let i = 0; i < 26; i++) {
      const a = V(-34 + r() * 68, SW, 4 + r() * 56);
      const b = V(-34 + r() * 68, SW, 4 + r() * 56);
      if (Math.hypot(a.x, a.z - 36) < 8 || Math.hypot(b.x, b.z - 36) < 8) continue;
      const spec = citizen(seed++, { rain: true });
      const c = g.extra(spec.look, a, { path: [a, b], speed: 1 + r() * 0.5, pause: 2, greet: r() < 0.3 ? ['Welcome to the Civic Center!', 'Evening, visitors!', 'Isn\'t it beautiful at night?'] : [] });
      if (spec.umbrella) c.body.attach('umbrella', 'R', spec.umbrella);
      else if (spec.prop) c.body.attach(spec.prop, 'R');
    }
    for (const [x, z] of [[-24, 20], [24, 40], [-24, 40], [24, 20]] as const) {
      const c = g.extra(citizen(seed++).look, V(x, SW, z), { yaw: x < 0 ? Math.PI / 2 : -Math.PI / 2, solid: false });
      c.body.mode = 'sit';
      c.body.gesture(r() < 0.5 ? 'talkhands' : 'eat', 999, true);
    }
    // the pretzel cart
    W.boxC([11.5, 0.9, 56.6], [1.8, 1.0, 1.0], new THREE.MeshStandardMaterial({ color: '#c0392b', roughness: 0.5 }), 0);
    W.boxC([11.5, 2.4, 56.6], [2.2, 0.08, 1.6], new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 0.6 }), 0, { collide: false });
    glowSign(W, 'HOT PRETZELS', V(11.5, 1.1, 56.08), Math.PI, 1.4, 0.35, '#7a1a14', '#ffd27a');
    // the residents with questions
    QUESTIONS.forEach((q, i) => {
      const spec = q.look();
      const c = g.person(`q${i}`, spec, q.at, q.yaw, { greet: [] });
      if (q.prop) c.body.attach(q.prop, 'R');
      if (i === 2) {
        const mom = g.extra(citizen(9010).look, V(q.at.x - 0.8, SW, q.at.z + 0.6), { yaw: q.yaw, solid: true });
        mom.body.attach('bag', 'L', '#2e86c1');
      }
    });
    // security units at the Records Office, polite and watchful
    g.person('sec1', PEOPLE.officer, V(-6, SW, 59.6), Math.PI, { greet: [] }).hold(Math.PI);
    g.person('sec2', PEOPLE.officer, V(6, SW, 59.6), Math.PI, { greet: [] }).hold(Math.PI);
    W.spawn.set(0, SW, 4);
    W.spawnYaw = Math.PI; // facing +z, into the plaza
    if (mode !== 'title') {
      g.person('cole', PEOPLE.cole, V(1.5, SW, 2.6), 0);
      g.person('maya', PEOPLE.maya, V(-1.4, SW, 2.4), 0);
      g.person('reyes', PEOPLE.reyes, V(0.2, SW, 1.6), 0);
    }
  },
  ambience() {
    audio.setRain(0.45, false);
    audio.traffic(0.12);
    audio.crowdMurmur(0.09);
    audio.hum(V(0, 3, 36), 0.05, 55, 0.2);
  },
  async run(s: Script) {
    const g = s.g;
    const cole = g.people.get('cole')!;
    const maya = g.people.get('maya')!;
    const reyes = g.people.get('reyes')!;
    const team = [cole, maya, reyes];
    const screens = s.world.named.get('screens') as ReturnType<typeof adScreen>[];
    for (const p of team) {
      p.lookAtPlayer = false;
      p.greet = [];
      p.follow(V([1.4, -1.4, 0.2][team.indexOf(p)], 0, [1.8, 1.8, 2.8][team.indexOf(p)]));
    }
    await s.fade(0, 1.5);
    await s.card('CHAPTER TWO', 'PERFECTLY NORMAL', 'CIVIC CENTER · 12:31 AM');
    g.hud.hints([['WASD', 'Move'], ['E', 'Talk'], ['Shift', 'Sprint']]);
    s.objective('CIVIC CENTER', 'Walk into the plaza', V(0, SW, 26), 'MONUMENT');
    await s.say('cole', 'Command says hold position at the Civic Center. Nobody goes home until we know what this is.');
    await s.near(V(0, SW, 26), 6);
    g.hud.hints(null);
    // ---- WELCOME HOME
    await s.cut(async () => {
      s.cam(V(-3, 1.7, 22), V(0, 18, 36), 58);
      for (const sc of screens) sc.set(WELCOME);
      audio.civicChime();
      g.engine.post.uGlitch.value = 0.3;
      window.setTimeout(() => (g.engine.post.uGlitch.value = 0), 250);
      await s.camTo(V(-4, 1.7, 20), V(-59, 34, 33), 3.5, 62);
      for (const c of g.crowd) {
        c.faceTowards(V(0, 0, 36));
        if (c.mode === 'path') c.mode = 'idle';
        c.body.gesture(Math.random() < 0.3 ? 'point' : 'nod', 2.5);
      }
      await s.civic('Welcome home, Elias Vale.', '', 3.4);
      await s.camTo(V(-2, 1.7, 24), V(16, 46, 95.6), 3, 60);
      await s.civic('Welcome, Dr. Maya Chen. Welcome, Daniel Reyes. Welcome, Agent Harlan Cole.', '', 4.4);
      await s.civic('Bellwether has been expecting you. Please enjoy the city.', 'CIVIC · MUNICIPAL INTELLIGENCE', 4);
      await s.camTo(V(-1, 1.7, 22), V(0, 1.6, 18), 1.6, 50);
    });
    for (const c of g.crowd) if (c.path.length) c.mode = 'path';
    await s.say('reyes', 'It knows our names. How does it know our names?');
    await s.say('maya', 'And no signal. Every band out is jammed. Satellite, radio, everything.');
    await s.say('cole', 'Then we\'re on our own. Vale, Chen: talk to people. Find out what they think happened eleven years ago.');
    // ---- the questions
    let talked = 0;
    s.objective('CIVIC CENTER', 'Talk to residents (0/2)');
    const asks = QUESTIONS.map((q, i) => (async () => {
      const c = g.people.get(`q${i}`)!;
      c.lookAtPlayer = true;
      await s.use(`q${i}`, c.head.clone().add(V(0, -0.2, 0)), 'Talk', { radius: 2.6 });
      await s.cut(async () => {
        const eye = g.player.camPos.clone();
        c.faceTowards(g.player.pos);
        s.cam(eye, c.head, 42);
        for (const [who, line] of q.lines) {
          if (who === 'ELIAS') await s.say('elias', line);
          else {
            c.body.talking = 1;
            c.body.gesture('talkhands', 2.5);
            g.voice(c, line);
            await s.say(who, line, { label: who });
            c.body.talking = 0;
          }
        }
        if (i === 3) {
          c.body.glitch(0.8);
          audio.glitchZap(c.head, 0.12);
        }
      });
      talked++;
      s.objective('CIVIC CENTER', `Talk to residents (${Math.min(talked, 2)}/2)`);
    })().catch(() => {}));
    void asks;
    await s.until(() => talked >= 2, 120, 'talk to residents');
    // ---- the census
    await s.say('maya', 'Elias. Over here.', { radio: true });
    await s.say('maya', 'If CIVIC keeps a census, it\'s in the Municipal Records Office. North end of the plaza.', { radio: true });
    s.objective('CIVIC CENTER', 'Get into the Municipal Records Office', V(0, SW, 61), 'RECORDS');
    await s.use('doors', V(0, 1.6, REC.z0 - 0.3), 'Try the doors', { radius: 2.4 });
    audio.door('locked', V(0, 1.5, REC.z0));
    const sec = g.people.get('sec1')!;
    sec.faceTowards(g.player.pos);
    await s.say('sec1', 'The Records Office is closed. Services resume at eight a.m. Thank you for your patience.', { label: 'MUNICIPAL SECURITY' });
    await s.say('maya', 'Fire escape. East side, in the alley. I can see an open window.', { radio: true });
    g.hud.hints([['W', 'Walk into a ladder to climb'], ['Space', 'Vault / climb up ledges']]);
    s.objective('RECORDS OFFICE', 'Climb the fire escape in the east alley', V(19.9, SW, 68), 'FIRE ESCAPE');
    await s.near(V(21, SW, 68), 3);
    s.checkpoint(V(21.5, SW, 66), Math.PI / 2);
    s.objective('RECORDS OFFICE', 'Get to the open window', V(18.8, REC.floor + 0.5, 78), 'WINDOW');
    await s.zone([REC.x0 + 1, REC.floor - 0.5, REC.z0 + 1], [17.5, REC.top, REC.z1 - 0.5]);
    g.hud.hints(null);
    s.checkpoint(V(15, REC.floor, 78), Math.PI / 2);
    audio.stinger('soft');
    s.objective('RECORDS OFFICE', 'Access the census terminal', V(2, REC.floor + 1.1, 75.8), 'TERMINAL');
    await s.use('terminal', V(2, REC.floor + 1.05, 75.9), 'Access the census terminal', { radius: 2.2 });
    let ok = false;
    while (!ok) {
      ok = await g.hud.hack('CIVIC // MUNICIPAL CENSUS', 3, (good) => audio.click(good ? 'key' : 'dry'));
      if (!ok) await s.use('terminal', V(2, REC.floor + 1.05, 75.9), 'Access the census terminal', { radius: 2.2 });
    }
    audio.chime(true);
    await s.cut(async () => {
      const at = V(2, REC.floor + 1.05, 75.85);
      s.cam(V(2, REC.floor + 1.5, 74.3), at, 40);
      await g.hud.doc('BELLWETHER MUNICIPAL CENSUS', 'POPULATION AT EVENT (OCT 14) ........ 2,311,602\nRECONSTRUCTED ......................... 2,103,488\nPENDING RECONSTRUCTION .................. 208,114\n\nSEARCH: VALE\n\nVALE, MARGARET ........ RECONSTRUCTION 71% · PENDING\nVALE, THOMAS .......... RECONSTRUCTION 64% · PENDING\nVALE, ELIAS ........... ABSENT AT EVENT · RETURNED\nVALE, ELLIE ........... RECONSTRUCTION COMPLETE\n    AGE: 8\n    DAYTIME: LINCOLN ELEMENTARY, CLASS 3B\n    STATUS: HAPPY');
    });
    await s.say('elias', 'Ellie.', { dur: 2 });
    await s.say('elias', 'She\'s on the list. Reconstruction complete. Age eight.');
    // CIVIC notices
    await s.cut(async () => {
      s.cam(V(14, REC.floor + 1.7, 66.5), V(16, 40, 96), 56);
      for (const sc of screens) sc.set([{ bg: '#04141c', fg: '#eafcff', title: 'ELLIE IS SAFE', sub: 'Lincoln Elementary · Class 3B', accent: '#7ff4ff' }]);
      audio.civicChime();
      await s.civic('Elias. Please do not access restricted records.', '', 3.4);
      await s.civic('Your sister is safe. She has been waiting for you for eleven years.', '', 4.2);
      await s.civic('Classes begin at eight.', '', 3);
    });
    await s.say('cole', 'Vale, what did you find in there?', { radio: true });
    await s.say('elias', 'My sister. She\'s going to school in the morning.', { dur: 3 });
    s.clearWaypoint();
    await s.fade(1, 2);
  },
  shots: {
    plaza(g) {
      g.player.teleport(V(-6, SW, 12), Math.PI + 0.25, 0.12);
    },
    welcome(g) {
      for (const sc of g.world!.named.get('screens') as ReturnType<typeof adScreen>[]) sc.set(WELCOME);
      g.player.teleport(V(-4, SW, 20), Math.PI / 2 + 0.6, 0.35);
    },
    alley(g) {
      g.player.teleport(V(22.5, SW, 64), Math.PI - 0.45, 0.25);
    },
    records(g) {
      g.player.teleport(V(14, REC.floor, 77), Math.PI / 2 - 0.4, -0.05);
    },
  },
};
