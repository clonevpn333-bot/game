import * as THREE from 'three';
import type { Chapter } from './index';
import type { World, EnvSettings } from '../world/World';
import type { Game, Script } from '../game/Game';
import * as K from '../world/Kit';
import { M } from '../render/Materials';
import * as T from '../render/Textures';
import { SKY } from '../render/Sky';
import { audio } from '../audio/AudioEngine';
import { PEOPLE, citizen } from '../actors/Cast';
import { mulberry } from '../actors/Blocky';
import type { Citizen } from '../game/Citizen';
import { V, glowSign } from './common';
import * as D from './dress';
import { carModel } from '../game/Traffic';

/*
  Lincoln Elementary in the morning. Building x ∈ [-30, 30], z ∈ [0, 40], ceiling 3.4.
  Entrance hall x ∈ [-6, 6], z ∈ [0, 10]; front office x ∈ [-16, -6], z ∈ [2, 10].
  Main corridor z ∈ [10, 14]. North side: Class 3B x ∈ [-28, -14], Room 2A x ∈ [-12, 0],
  Class 3A x ∈ [2, 14], gym x ∈ [16, 28] (opens north onto the playground, z ∈ [40, 80]).
*/
const H = 3.4;
const FL = 0.15;

const DAY: EnvSettings = {
  sky: SKY.morning, fog: '#cdd9e4', fogDensity: 0.0055, rain: 0, envKind: 'sunrise', exposure: 0.95,
  hemi: ['#cfe2ff', '#8a7a62', 1.1], moon: { color: '#fff0d8', intensity: 2.6, dir: [0.45, 0.85, -0.6] },
  reverb: [1.2, 0.2], bloom: 0.35, grade: { sat: 1.12, vignette: 0.55 },
};

/** A wall from (x0,z0) to (x1,z1) (axis-aligned) with door gaps [from,to] along its length. */
function wall(W: World, x0: number, z0: number, x1: number, z1: number, mat: THREE.Material, gaps: [number, number][] = [], h = H, t = 0.2, lower?: THREE.Material): void {
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const a = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
  const b = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
  const cuts = [...gaps].sort((p, q) => p[0] - q[0]);
  let cur = a;
  const L = M();
  const seg = (s: number, e: number, y0: number, y1: number) => {
    if (e - s < 0.01) return;
    if (alongX) W.box([s, y0, z0 - t / 2], [e, y1, z0 + t / 2], mat, { uv: 2 });
    else W.box([x0 - t / 2, y0, s], [x0 + t / 2, y1, e], mat, { uv: 2 });
    if (lower && y0 === 0) {
      // painted dado + wooden chair rail, both faces
      const u = 0.02;
      if (alongX) {
        W.box([s, 0, z0 - t / 2 - u], [e, 1.05, z0 + t / 2 + u], lower, { collide: false, uv: 2 });
        W.box([s, 1.05, z0 - t / 2 - 0.05], [e, 1.12, z0 + t / 2 + 0.05], L.wood, { collide: false });
      } else {
        W.box([x0 - t / 2 - u, 0, s], [x0 + t / 2 + u, 1.05, e], lower, { collide: false, uv: 2 });
        W.box([x0 - t / 2 - 0.05, 1.05, s], [x0 + t / 2 + 0.05, 1.12, e], L.wood, { collide: false });
      }
    }
  };
  for (const [g0, g1] of cuts) {
    seg(cur, g0, 0, h);
    seg(g0, g1, 2.4, h); // lintel over the door
    cur = g1;
  }
  seg(cur, b, 0, h);
}

function desk(W: World, x: number, z: number, top: THREE.Material, yaw = 0): void {
  const L = M();
  W.boxC([x, 0.62, z], [0.9, 0.05, 0.6], top, yaw, { collide: false });
  W.boxC([x, 0.31, z], [0.8, 0.6, 0.5], L.metalDark, yaw, { collide: false });
  W.physics.add({ cx: x, cy: 0.35, cz: z, hx: 0.45, hy: 0.35, hz: 0.3, yaw });
  // little chair behind
  const bz = z + Math.cos(yaw) * 0.55;
  const bx = x + Math.sin(yaw) * 0.55;
  W.boxC([bx, 0.38, bz], [0.4, 0.04, 0.4], top, yaw, { collide: false });
  W.boxC([bx + Math.sin(yaw) * 0.2, 0.6, bz + Math.cos(yaw) * 0.2], [0.4, 0.45, 0.04], top, yaw, { collide: false });
}

function drawing(W: World, x: number, y: number, z: number, yaw: number, kind: 'family' | 'city' | 'eye' | 'house', key: string): void {
  const tex = kind === 'family' ? T.familyPhoto('siblings', key.length) : T.drawingTex(key, kind === 'city' ? 'city' : kind === 'eye' ? 'eye' : 'house');
  K.poster(W, tex, x, y, z, yaw, 0.6, 0.45);
}

function buildSchool(W: World): void {
  const L = M();
  const cream = new THREE.MeshStandardMaterial({ color: '#efe6d2', roughness: 0.85 });
  const tileA = L.hospFloor;
  const blue = new THREE.MeshStandardMaterial({ color: '#7fa6c9', roughness: 0.8 });
  const yellow = new THREE.MeshStandardMaterial({ color: '#f2cf5a', roughness: 0.8 });
  const brick = L.brick;
  // ground: street, sidewalk, schoolyard grass, playground
  W.box([-300, -0.3, -300], [300, -0.2, 300], L.grass, { collide: false, cast: false, uv: 6 });
  K.street(W, -200, -22, 200, -10, { sidewalk: 0.01, axis: 'x', crosswalks: [0] });
  W.box([-200, 0, -10], [200, FL, 0], L.sidewalk, { uv: 2, surface: 'concrete', cast: false });
  W.box([-200, 0, -30], [200, FL, -22], L.sidewalk, { uv: 2, surface: 'concrete', cast: false });
  W.box([-30, 0, 0], [30, FL, 40], tileA, { uv: 2, surface: 'tile', cast: false });
  W.box([-34, 0, 40], [34, FL - 0.05, 82], new THREE.MeshStandardMaterial({ color: '#5a6066', roughness: 0.9 }), { uv: 4, surface: 'concrete', cast: false });
  // outer brick shell (doors: front entrance, gym back doors)
  wall(W, -30, 0, 30, 0, brick, [[-2.2, 2.2]], H + 2.4, 0.4);
  wall(W, -30, 40, 30, 40, brick, [[19.5, 24.5]], H + 2.4, 0.4);
  wall(W, -30, 0, -30, 40, brick, [], H + 2.4, 0.4);
  wall(W, 30, 0, 30, 40, brick, [], H + 2.4, 0.4);
  // roof + parapet + sign
  W.box([-30.4, H + 2.4, -0.4], [30.4, H + 2.8, 40.4], L.roofTar, { collide: false });
  W.box([-30, H, 0], [30, H + 0.05, 40], D.paint('#f4efe4', 0.9, 0.22), { collide: false, cast: false });
  glowSign(W, 'LINCOLN ELEMENTARY SCHOOL', V(0, H + 1.2, -0.25), Math.PI, 12, 1.1, '#1f3a5f', '#ffffff', 'EVERY CHILD BELONGS');
  W.boxC([0, H + 0.2, -1.6], [7, 0.25, 3.2], L.trimLight, 0, { collide: false });
  for (const x of [-3.2, 3.2]) W.boxC([x, H / 2, -3], [0.35, H, 0.35], L.trimLight, 0);
  // windows along the street side and the playground side (bright day light)
  const winMat = new THREE.MeshStandardMaterial({ color: '#2a4a5e', roughness: 0.05, metalness: 0.8, envMapIntensity: 1.6 });
  const frame = L.trimLight;
  for (let x = -27; x <= 27; x += 4.5) {
    if (Math.abs(x) < 4) continue;
    for (const [z, yaw] of [[-0.22, Math.PI], [40.22, 0]] as const) {
      if (z > 1 && x > 16) continue;
      W.quad(winMat, { x, y: 2.2, z }, 2.4, 1.8, yaw);
      const dz = z < 1 ? -0.06 : 0.06;
      W.box([x - 1.3, 1.25, z + dz - 0.05], [x + 1.3, 1.35, z + dz + 0.05], frame, { collide: false });
      W.box([x - 1.3, 3.05, z + dz - 0.05], [x + 1.3, 3.15, z + dz + 0.05], frame, { collide: false });
      W.box([x - 0.05, 1.3, z + dz - 0.04], [x + 0.05, 3.1, z + dz + 0.04], frame, { collide: false });
    }
  }
  // front lawn, hedges, flag, bike rack
  W.box([-30, 0, -9.8], [-4, FL + 0.02, -1.5], L.grass, { uv: 3, collide: false, cast: false });
  W.box([4, 0, -9.8], [30, FL + 0.02, -1.5], L.grass, { uv: 3, collide: false, cast: false });
  D.hedge(W, -29, -1.4, -5, -0.6);
  D.hedge(W, 5, -1.4, 29, -0.6);
  D.flagPole(W, -8, -6, 9);
  D.bikeRack(W, 12, -4, 0);
  // ---- interior walls
  const dado = D.paint('#3f6f8f', 0.7);
  const skin = D.paint('#efe6d2', 0.85);
  const dadoIn = D.paint('#4f8a6a', 0.7);
  wall(W, -29.7, 0.3, -29.7, 39.7, skin, [], H, 0.1, dadoIn);
  wall(W, 29.7, 0.3, 29.7, 39.7, skin, [], H, 0.1, dadoIn);
  wall(W, -29.7, 39.7, 15, 39.7, skin, [], H, 0.1, dadoIn);
  wall(W, -29.7, 0.3, -6.1, 0.3, skin, [], H, 0.1, dadoIn);
  wall(W, 6.1, 0.3, 29.7, 0.3, skin, [], H, 0.1, dadoIn);
  const dado2 = D.paint('#4f8a6a', 0.7);
  wall(W, -30, 10, -6, 10, cream, [[-12, -10.6]], H, 0.2, dado);
  wall(W, 6, 10, 30, 10, cream, [], H, 0.2, dado);
  wall(W, -6, 0, -6, 10, cream, [], H, 0.2, dado);
  wall(W, 6, 0, 6, 10, cream, [], H, 0.2, dado);
  wall(W, -30, 14, 30, 14, cream, [[-24, -22.4], [-5, -3.4], [7, 8.6], [17, 19.2]], H, 0.2, dado);
  wall(W, -13, 14, -13, 40, cream, [], H, 0.2, dado2);
  wall(W, 1, 14, 1, 40, cream, [], H, 0.2, dado2);
  wall(W, 15, 14, 15, 40, cream, [], H, 0.2, dado2);
  // lockers along the corridor
  for (let x = -29; x < 29; x += 0.62) {
    if ((x > -24.5 && x < -21.9) || (x > -5.5 && x < -2.9) || (x > 6.5 && x < 9.1) || (x > 16.5 && x < 19.7) || (x > -6.4 && x < 6.4)) continue;
    W.box([x, 0, 10.1], [x + 0.58, 1.9, 10.6], x % 2 < 1 ? blue : yellow, { uv: 1 });
  }
  // corridor + room lights
  for (let x = -26; x <= 26; x += 6) K.ceilingLight(W, x, H - 0.02, 12, { intensity: 6, distance: 8 });
  // corridor art: drawings by the children
  const kinds: ('family' | 'city' | 'eye' | 'house')[] = ['family', 'house', 'city', 'family', 'house', 'family', 'eye', 'city'];
  let n = 0;
  for (let x = -27; x < 27; x += 3.4) {
    if (Math.abs(x) < 7) continue;
    drawing(W, x, 2.0, 13.88, Math.PI, kinds[n % kinds.length], `kid${n}`);
    n++;
  }
  glowSign(W, 'MY FAMILY · BY THE STUDENTS OF 3B', V(-16, 2.75, 13.88), Math.PI, 4.2, 0.35, '#f2cf5a', '#3a2a1c');
  D.bulletinBoard(W, -18, 2.0, 10.62, 0, 3.2, 1.3, 11, 'FALL FESTIVAL · OCT 14');
  D.bulletinBoard(W, 22, 2.0, 10.62, 0, 3.2, 1.3, 12, 'STAR STUDENTS');
  D.bunting(W, V(-28, 3.1, 10.4), V(-8, 3.1, 13.6), 0.45, 3);
  D.bunting(W, V(8, 3.1, 13.6), V(28, 3.1, 10.4), 0.45, 4);
  D.wallClock(W, 0.5, 2.9, 13.88, Math.PI);
  D.waterFountain(W, 12, 13.7, Math.PI);
  glowSign(W, 'EXIT', V(29.88, 2.9, 12), -Math.PI / 2, 0.6, 0.25, '#7a1010', '#ff4a3a');
  glowSign(W, 'WHAT I REMEMBER', V(18, 2.75, 13.88), Math.PI, 3, 0.35, '#7fa6c9', '#ffffff');
  // ---- entrance hall + front office
  W.box([-16, 0, 6.5], [-11, 1.1, 7.2], L.woodPaint, { uv: 1 });
  W.box([-16.1, 1.1, 6.4], [-10.9, 1.15, 7.3], L.plasticDark, { collide: false });
  for (const z of [3, 5]) for (const x of [-15, -12.5]) desk(W, x, z, L.wood, Math.PI);
  K.ceilingLight(W, -11, H - 0.02, 5, { intensity: 6, distance: 7 });
  K.ceilingLight(W, 0, H - 0.02, 5, { intensity: 7, distance: 8 });
  glowSign(W, 'FRONT OFFICE · ALL VISITORS SIGN IN', V(-6.12, 2.6, 5), -Math.PI / 2, 3, 0.4, '#1f3a5f', '#fff');
  glowSign(W, 'CIVIC KEEPS US SAFE', V(0, 2.8, 9.88), Math.PI, 3.6, 0.6, '#0f5f7a', '#eafcff');
  // trophy case
  W.box([2, 0, 9], [5.6, 2.1, 9.8], L.woodPaint, { uv: 1 });
  // ---- Class 3B: in session
  const b3 = { x0: -28, x1: -14 };
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) desk(W, b3.x0 + 3 + c * 3, 20 + r * 3.0, L.wood);
  W.box([-24.2, 1.0, 39.55], [-17.8, 2.5, 39.62], new THREE.MeshStandardMaterial({ color: '#25423a', roughness: 0.6 }), { collide: false });
  glowSign(W, 'WHO KEEPS BELLWETHER SAFE?', V(-21, 2.2, 39.5), Math.PI, 5, 0.6, '#25423a', '#f4f1e6');
  W.boxC([-21, 0.45, 36.6], [2, 0.9, 0.9], L.wood, 0);
  for (const x of [-25, -18]) K.ceilingLight(W, x, H - 0.02, 26, { intensity: 6, distance: 9 });
  D.alphabet(W, -21, 2.95, 39.5, Math.PI, 6.4);
  D.cubbies(W, -26.3, 15.4, 0, 6, 21);
  D.bookshelf(W, -15.2, 18, -Math.PI / 2, 2.2, 1.2, 22);
  D.rug(W, -17.2, 32, 3, 3.2, ['#2e86c1', '#f1c40f']);
  D.bulletinBoard(W, -13.2, 1.9, 26, -Math.PI / 2, 3.4, 1.2, 23, 'OUR CITY');
  D.wallClock(W, -27.88, 2.7, 30, Math.PI / 2);
  for (const x of [-26.6, -15.6]) D.dayWindow(W, x, 2.0, 39.58, Math.PI, 2.2, 1.6);
  // ---- Room 2A: sealed eleven years, kept exactly as it was
  const dust = new THREE.MeshStandardMaterial({ color: '#c8b89a', roughness: 0.95 });
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) desk(W, -10.5 + c * 3, 18 + r * 3.2, dust);
  W.box([-9, 1.0, 39.55], [-3, 2.5, 39.62], new THREE.MeshStandardMaterial({ color: '#2e3a30', roughness: 0.7 }), { collide: false });
  glowSign(W, 'WELCOME BACK, 2A! · OCT 13', V(-6, 2.2, 39.5), Math.PI, 5, 0.6, '#2e3a30', '#f4f1e6');
  K.ceilingLight(W, -6, H - 0.02, 26, { intensity: 3, distance: 9, flicker: 0.4 });
  D.alphabet(W, -6, 2.95, 39.5, Math.PI, 6);
  D.cubbies(W, -11, 15.4, 0, 5, 31);
  D.bookshelf(W, -0.2, 20, -Math.PI / 2, 2.2, 1.2, 32);
  D.rug(W, -3, 33, 3, 3, ['#8e6a9a', '#e8c86a']);
  D.bulletinBoard(W, -12.8, 1.9, 28, Math.PI / 2, 3, 1.1, 33, 'SUMMER MEMORIES');
  for (const x of [-11, -1]) D.dayWindow(W, x, 2.0, 39.58, Math.PI, 1.8, 1.6);
  // Ellie's desk: name card, drawing, crayons
  W.quad(new THREE.MeshBasicMaterial({ map: T.signTexture('ELLIE V.', { w: 256, h: 96, bg: '#f4f1e6', fg: '#c0392b' }) }), { x: -7.5, y: 0.66, z: 27.05 }, 0.5, 0.18, 0, { pitch: -Math.PI / 2 });
  W.quad(new THREE.MeshStandardMaterial({ map: T.drawingTex('ellie-desk', 'house'), roughness: 0.9 }), { x: -7.5, y: 0.655, z: 27.3 }, 0.4, 0.3, 0.2, { pitch: -Math.PI / 2 });
  // the class photo, ticked off
  K.poster(W, T.familyPhoto('school', 7), -10, 1.7, 14.12, 0, 1.2, 0.85);
  glowSign(W, 'CLASS 2A · RECONSTRUCTED 19 / 22', V(-10, 1.12, 14.12), 0, 1.4, 0.12, '#0b2028', '#7ff4ff');
  // tape across the door
  for (const y of [1.0, 1.6]) W.boxC([-4.2, y, 13.9], [1.8, 0.08, 0.02], new THREE.MeshStandardMaterial({ color: '#f2cf5a', roughness: 0.6 }), 0.2, { collide: false });
  glowSign(W, 'CLOSED FOR RENOVATION', V(-4.2, 2.1, 13.88), Math.PI, 1.6, 0.3, '#3a2a1c', '#f2cf5a');
  // the locked door, its keypad, and a note in a child's handwriting
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.08), new THREE.MeshStandardMaterial({ color: '#8a6a4a', roughness: 0.6 }));
  door.position.set(-4.2, 1.2, 14.02);
  door.castShadow = true;
  W.add(door);
  const doorCol = W.physics.add({ cx: -4.2, cy: 1.2, cz: 14.02, hx: 0.8, hy: 1.2, hz: 0.06, noVault: true });
  W.named.set('door2a', { door, doorCol });
  W.boxC([-3.1, 1.25, 13.86], [0.18, 0.26, 0.05], L.plasticDark, 0, { collide: false });
  W.quad(new THREE.MeshBasicMaterial({ color: new THREE.Color('#7ff4ff').multiplyScalar(1.4) }), { x: -3.1, y: 1.3, z: 13.83 }, 0.12, 0.06, Math.PI);
  K.poster(W, T.signTexture('2A SECRET PASSWORD', { w: 256, h: 160, bg: '#fff6c8', fg: '#c0392b', sub: "= MS. HALE'S BIRTHDAY!!" }), -4.6, 1.45, 13.86, Math.PI, 0.5, 0.32);
  // ...and the birthday chart in 3B next door
  K.poster(W, T.signTexture('OUR BIRTHDAYS', { w: 256, h: 256, bg: '#f4f1e6', fg: '#2e86c1', sub: 'JAN · MAYA R  ·  MAR · LEO  ·  JUN · ELLIE V  ·  OCT 14 · MS. HALE (2A)' }), -16.6, 1.7, 14.13, 0, 1.0, 1.0);
  // ---- Class 3A (empty, chairs up)
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) desk(W, 4 + c * 3, 20 + r * 2.6, L.wood);
  K.ceilingLight(W, 8, H - 0.02, 26, { intensity: 5, distance: 9 });
  W.box([5, 1.0, 39.55], [11, 2.5, 39.62], new THREE.MeshStandardMaterial({ color: '#25423a', roughness: 0.6 }), { collide: false });
  D.alphabet(W, 8, 2.95, 39.5, Math.PI, 6);
  D.bookshelf(W, 14.2, 22, -Math.PI / 2, 2, 1.2, 41);
  for (const x of [3, 13]) D.dayWindow(W, x, 2.0, 39.58, Math.PI, 1.8, 1.6, x === 3);
  // ---- gym
  W.box([15.1, 0, 14.1], [29.9, FL + 0.02, 39.9], L.woodFloor, { uv: 2, collide: false, cast: false });
  for (const z of [20, 34]) K.ceilingLight(W, 22, H - 0.02, z, { intensity: 8, distance: 12, long: true });
  W.boxC([22, 2.6, 39.7], [1.8, 1.2, 0.08], L.plasticWhite, 0, { collide: false });
  W.boxC([22, 2.2, 39.2], [0.5, 0.05, 0.5], L.paintRed, 0, { collide: false });
  for (let i = 0; i < 4; i++) W.box([15.3, 0, 16 + i * 1.2], [17.3, 0.35 + i * 0.35, 17.2 + i * 1.2], L.wood, { uv: 1 });
  glowSign(W, 'GO LINCOLN LIONS!', V(29.88, 2.6, 26), -Math.PI / 2, 6, 1.1, '#c0392b', '#ffffff');
  D.bunting(W, V(15.5, 3.2, 20), V(29.5, 3.2, 20), 0.3, 9);
  D.bunting(W, V(15.5, 3.2, 32), V(29.5, 3.2, 32), 0.3, 10);
  // ---- playground: fence with a gap in the far corner, swings, slide, climbing frame
  const fence = new THREE.MeshStandardMaterial({ color: '#5a6066', roughness: 0.5, metalness: 0.6, transparent: true, opacity: 0.85 });
  W.box([-34, 0, 81.8], [27, 2.2, 82], fence, { noVault: true });
  W.box([30.5, 0, 81.8], [34, 2.2, 82], fence, { noVault: true });
  W.box([-34.2, 0, 40], [-34, 2.2, 82], fence, { noVault: true });
  W.box([34, 0, 40], [34.2, 2.2, 82], fence, { noVault: true });
  const red = L.paintRed;
  W.boxC([-14, 1.4, 56], [0.12, 2.8, 0.12], red, 0);
  W.boxC([-8, 1.4, 56], [0.12, 2.8, 0.12], red, 0);
  W.boxC([-11, 2.8, 56], [6.2, 0.14, 0.14], red, 0, { collide: false });
  for (const x of [-12.5, -9.5]) W.boxC([x, 0.55, 56], [0.6, 0.06, 0.3], L.rubber, 0, { collide: false });
  W.ramp([8, 1.1, 62], [1, 2.2, 4.4], Math.PI, L.paintYellow);
  W.boxC([8, 1.1, 64.6], [1.4, 2.2, 1.4], L.paintYellow, 0);
  for (let i = 0; i < 4; i++) W.boxC([-2 + (i % 2) * 2.4, 0.9, 70 + Math.floor(i / 2) * 2.4], [0.1, 1.8, 0.1], blue, 0);
  W.boxC([-0.8, 1.8, 71.2], [2.6, 0.1, 2.6], blue, 0, { collide: false });
  K.tree(W, -26, 74, 1.4);
  W.box([-16, 0.1, 53], [-6, 0.13, 59], D.paint('#c0392b', 0.95), { collide: false, cast: false });
  W.box([5, 0.1, 58], [11, 0.13, 68], D.paint('#2e86c1', 0.95), { collide: false, cast: false });
  W.box([-4, 0.1, 68], [3, 0.13, 75], D.paint('#27ae60', 0.95), { collide: false, cast: false });
  D.playMarkings(W, 18, 64);
  D.hoop(W, -26, 50, Math.PI / 2);
  K.bench(W, -20, 44, 0);
  K.bench(W, 28, 70, -Math.PI / 2);
  K.tree(W, 26, 50, 1.2);
  // the world beyond: houses and the suburb (no colliders past the fence)
  for (let i = 0; i < 10; i++) {
    const x = -90 + i * 20;
    K.building(W, x, 95, x + 14, 108, 8 + (i % 3) * 3, 'brick', 50 + i, { emissive: 0.15 });
    K.building(W, x, -60, x + 16, -40, 10 + (i % 4) * 4, i % 2 ? 'apartment' : 'brick', 60 + i, { emissive: 0.15 });
  }
  for (let x = -60; x < 60; x += 12) K.tree(W, x + 4, -33, 1.2);
  // outer limits for the player
  W.physics.addBox(-200, 0, -23, 200, 3, -22.5, { noVault: true });
  W.physics.addBox(-40, 0, -23, -39, 3, 0, { noVault: true });
  W.physics.addBox(39, 0, -23, 40, 3, 0, { noVault: true });
}

function populate(W: World, g: Game, mode: string): void {
  const r = mulberry(303);
  let seed = 600;
  // morning drop-off: children and parents along the front of the school
  for (let i = 0; i < 14; i++) {
    const kid = i % 3 !== 0;
    const spec = citizen(seed++, { child: kid });
    const x0 = -36 + r() * 30;
    const x1 = 6 + r() * 30;
    const z = -4 - r() * 4;
    const c = g.extra(spec.look, V(x0 + r() * (x1 - x0), FL, z), { path: [V(x0, FL, z), V(x1, FL, z)], speed: kid ? 1.3 : 1.1, greet: kid ? ['Hi!', 'Are you somebody\'s dad?', 'Good morning!'] : ['Morning!', 'Beautiful day after all that rain.'] });
    if (!kid && spec.prop) c.body.attach('coffee', 'R');
  }
  // crossing guard (an older unit with a stop sign)
  const guard = g.extra({ gen: 'gen2', shell: '#f2c12e', accent: '#1d2a44', light: '#7ff4ff' }, V(1, FL, -10.6), { yaw: Math.PI, greet: ['Good morning. Please use the crosswalk.'] });
  guard.name = 'CROSSING GUARD';
  guard.body.gesture('armsUp', 999, true);
  // school bus at the curb
  const bus = carModel({ kind: 'bus', color: '#f2b51e' });
  bus.position.set(-14, 0, -13.5);
  bus.rotation.y = Math.PI / 2;
  W.add(bus);
  W.physics.add({ cx: -14, cy: 1.4, cz: -13.5, hx: 5, hy: 1.4, hz: 1.3, yaw: 0 });
  // Class 3B: twelve children at their desks, one teacher
  for (let rr = 0; rr < 5; rr++) for (let c = 0; c < 4; c++) {
    const spec = citizen(seed++, { child: true });
    const k = g.extra(spec.look, V(-25 + c * 3, FL, 20.55 + rr * 3.0), { yaw: 0, solid: false });
    k.body.mode = 'sit';
    k.lookAtPlayer = false;
    k.faceYaw = 0;
  }
  const teacher = g.person('teacher', { gen: 'gen4', female: true, hair: 'bun', hairColor: '#6a2c1c', glasses: '#202226', top: 'sweater', topColor: '#7a5aa8', pants: '#2c2f3a', legs: 'skirt', shoes: '#3b2a20' }, V(-21, FL, 37.8), Math.PI, { greet: [] });
  teacher.lookAtPlayer = false;
  teacher.body.gesture('talkhands', 999, true);
  // the secretary in the front office
  g.person('secretary', { gen: 'gen4', female: true, hair: 'curly', hairColor: '#2a1d16', top: 'shirt', topColor: '#e8ecf0', jacket: 'blazer', jacketColor: '#7a2a2a', glasses: '#6b4a2e', pants: '#2c2f3a' }, V(-13.5, FL, 8.3), Math.PI, { greet: [] }).hold(Math.PI);
  // Ellie (hidden until recess)
  void mode;
}

export const ch3: Chapter = {
  id: 'ch3',
  num: 'CHAPTER THREE',
  title: 'School',
  env: DAY,
  seed: 303,
  build(W: World, g: Game, mode) {
    buildSchool(W);
    populate(W, g, mode);
    W.spawn.set(-3, FL, -6.5);
    W.spawnYaw = Math.PI; // facing the school (+z)
    if (mode !== 'title') {
      g.person('maya', PEOPLE.maya, V(-1.5, FL, -7.5), 0);
      g.person('cole', PEOPLE.cole, V(-6, FL, -9), 0.4);
      g.person('reyes', PEOPLE.reyes, V(-7, FL, -8), 0.2);
    }
  },
  ambience() {
    audio.wind(0.06);
    audio.crowdMurmur(0.05);
  },
  async run(s: Script) {
    const g = s.g;
    const maya = g.people.get('maya')!;
    const cole = g.people.get('cole')!;
    const reyes = g.people.get('reyes')!;
    const teacher = g.people.get('teacher')!;
    const secretary = g.people.get('secretary')!;
    for (const p of [maya, cole, reyes]) {
      p.lookAtPlayer = false;
      p.greet = [];
    }
    await s.fade(0, 2);
    await s.card('CHAPTER THREE', 'SCHOOL', 'LINCOLN ELEMENTARY · 7:52 AM');
    await s.say('cole', 'Ten minutes, Vale. In and out. Chen goes with you.');
    await s.say('reyes', 'I\'ll keep the engine running. Feels like a getaway.', { dur: 2.4 });
    maya.follow(V(1.2, 0, 1.6));
    cole.hold(0);
    reyes.hold(0.3);
    s.objective('LINCOLN ELEMENTARY', 'Go inside', V(0, FL, 2), 'ENTRANCE');
    await s.zone([-6, -1, 1], [6, 4, 9]);
    s.checkpoint(V(0, FL, 3), Math.PI);
    s.objective('LINCOLN ELEMENTARY', 'Sign in at the front office', V(-13.5, 1.1, 6.8), 'OFFICE');
    await s.use('signin', V(-13.5, 1.1, 6.6), 'Sign the visitor book', { radius: 2.4 });
    secretary.faceTowards(g.player.pos);
    await s.say('secretary', 'Good morning! Oh, you don\'t have to sign, Mr. Vale. You\'re already in the book.', { label: 'SECRETARY' });
    await g.hud.doc('VISITOR LOG · OCTOBER 14', 'NAME                VISITING        TIME\n\nELIAS VALE          ELLIE VALE      08:00\nELIAS VALE          ELLIE VALE      08:00\nELIAS VALE          ELLIE VALE      08:00\nELIAS VALE          ELLIE VALE      08:00\nELIAS VALE          ELLIE VALE      08:00\n\n(the same line, in your handwriting,\n down every page of the book)');
    await s.say('maya', 'That\'s your handwriting.', { dur: 2.2 });
    await s.say('elias', 'I know.', { dur: 1.6 });
    await s.say('secretary', 'She\'s in 3B. Lovely girl. Always looking out the window.', { label: 'SECRETARY' });
    s.objective('LINCOLN ELEMENTARY', 'Find Class 3B', V(-23.2, FL, 12), '3B');
    await s.near(V(-23.2, FL, 12.5), 2.6);
    // ---- 3B in session
    await s.cut(async () => {
      s.cam(V(-23.2, 1.5, 14.6), V(-21, 1.2, 30), 52);
      await s.say('teacher', 'And who keeps Bellwether safe?', { label: 'TEACHER' });
      audio.voice(V(-21, 1, 24), { pitch: 1.6, vowels: 'iii', dur: 0.8, vol: 0.12 });
      await s.say('CLASS', 'CIVIC!', { label: 'CLASS 3B', dur: 1.8 });
      await s.say('teacher', 'And who keeps CIVIC safe?', { label: 'TEACHER' });
      audio.voice(V(-21, 1, 24), { pitch: 1.6, vowels: 'eee', dur: 0.9, vol: 0.12 });
      await s.say('CLASS', 'WE DO!', { label: 'CLASS 3B', dur: 1.8 });
      await s.camTo(V(-23.2, 1.5, 14.6), V(-15.6, 1.0, 22.6), 2.4, 46);
      await s.wait(0.6);
    });
    await s.say('maya', 'One desk by the window is empty. Third row.');
    teacher.body.stopGesture();
    teacher.faceTowards(g.player.pos);
    await s.say('teacher', 'Ellie\'s out today. She has her bad days. Some of them do.', { label: 'TEACHER' });
    await s.say('elias', 'Some of them?');
    await s.say('teacher', 'Some of my children were rebuilt from records. Some CIVIC made new. I can\'t tell the difference anymore.', { label: 'TEACHER' });
    await s.say('teacher', 'I don\'t think they can either. Her old classroom is next door. She goes in there sometimes.', { label: 'TEACHER' });
    teacher.body.gesture('talkhands', 999, true);
    // ---- 2A: eleven years, untouched
    // ---- the keypad
    s.objective('LINCOLN ELEMENTARY', 'Get into Room 2A', V(-3.1, 1.3, 13.8), 'KEYPAD');
    const d2a = s.world.named.get('door2a') as { door: THREE.Mesh; doorCol: { enabled: boolean } };
    let tries = 0;
    for (;;) {
      await s.use('keypad2a', V(-3.1, 1.25, 13.7), 'Use the keypad', { radius: 2.0 });
      const ok = await g.hud.keypad('1014');
      if (ok) break;
      tries++;
      audio.click('dry');
      if (tries === 1) {
        await s.say('maya', 'Look at the note on the door. A kid wrote that. Kids write birthdays everywhere.');
        s.objective('LINCOLN ELEMENTARY', 'Find Ms. Hale\'s birthday (month, day)', V(-16.6, 1.7, 14.3), 'CLASS 3B');
      } else if (tries === 3) await s.say('maya', 'There\'s a birthday chart in 3B. By the door.');
    }
    audio.door('open', d2a.door.position);
    d2a.doorCol.enabled = false;
    for (let i = 0; i < 12; i++) {
      d2a.door.position.x = -4.2 - (i / 12) * 1.5;
      await s.wait(0.04);
    }
    await s.say('maya', 'October fourteenth.', { dur: 1.8 });
    await s.say('elias', 'That\'s the day. Her birthday party was that afternoon. The whole class was in there.', { dur: 3.4 });
    s.objective('LINCOLN ELEMENTARY', 'Look inside Room 2A', V(-4.2, FL, 15), '2A');
    await s.zone([-12.5, -1, 15], [0.5, 4, 39]);
    s.checkpoint(V(-4.2, FL, 16), Math.PI);
    audio.stinger('soft');
    s.objective('ROOM 2A', 'Find Ellie\'s desk', V(-7.5, 0.9, 27), 'DESK');
    await s.use('desk', V(-7.5, 0.8, 27.15), 'Look at the desk', { radius: 2.2 });
    await g.hud.doc('A DRAWING · CRAYON', 'MY FAMILY\nby Ellie V. (7 and a half)\n\nMOM — makes pancakes\nDAD — fixes the car\nELI — my BIG brother. he is\n       going away to collidge.\n       he said he will come back.\nME — i am the one with the\n       yellow raincoat\n\n(on the back, newer crayon, careful letters:)\n\nhe said he will come back.\nhe said he will come back.\nhe said he will come back.');
    await s.thought('I said I\'d come back for her.', 2.8);
    await s.say('maya', 'Elias. The class photo. Nineteen of twenty-two. Somebody is keeping score.');
    // ---- recess
    await s.wait(1.2);
    audio.chime(true);
    audio.chime(true);
    const kids: Citizen[] = [];
    for (let i = 0; i < 12; i++) {
      const c = g.extra(citizen(900 + i, { child: true }).look, V(-28 + i * 4.4, FL, 12.2), { path: [V(-28 + i * 4.4, FL, 12.2), V(22, FL, 20), V(22, FL, 46), V(-10 + i * 3, FL, 60)], loop: false, speed: 3.2 + (i % 3) * 0.3, solid: false });
      c.lookAtPlayer = false;
      kids.push(c);
    }
    await s.say('maya', 'Recess.', { dur: 1.4 });
    // Ellie appears at the end of the corridor
    const ellie = g.person('ellie', PEOPLE.ellie, V(14, FL, 12), Math.PI / 2, { greet: [] });
    ellie.lookAtPlayer = true;
    ellie.hold(-Math.PI / 2);
    s.objective('CORRIDOR', 'Go back into the corridor', V(-4.2, FL, 12.5));
    await s.zone([-12, -1, 10.2], [3, 4, 13.8]);
    await s.cut(async () => {
      const eye = g.player.camPos.clone();
      s.cam(eye, ellie.head, 34);
      await s.wait(1.4);
      ellie.body.gesture('flinch', 1.2);
      await s.camTo(eye.clone().lerp(ellie.head, 0.35), ellie.head, 1.6, 26);
      await s.say('elias', 'Ellie?', { dur: 1.6 });
      ellie.body.glitch(0.4);
      await s.wait(0.6);
    });
    // ---- the chase
    const route = [V(18, FL, 12), V(18.1, FL, 15.6), V(22, FL, 20), V(22, FL, 39), V(22, FL, 50), V(10, FL, 58), V(4, FL, 66), V(20, FL, 74), V(28.7, FL, 80.6), V(29, FL, 84), V(36, FL, 92)];
    let leg = 0;
    ellie.mode = 'goto';
    ellie.speed = 4.4;
    g.hud.hints([['Shift', 'Sprint']]);
    s.objective('LINCOLN ELEMENTARY', 'Follow Ellie', () => ellie.pos.clone().add(V(0, 1.3, 0)), 'ELLIE');
    audio.stinger('scare');
    while (leg < route.length) {
      const target = route[leg];
      const far = ellie.pos.distanceTo(g.player.pos);
      if (far > 22 && leg > 0 && leg < route.length - 2) {
        // she waits to be seen, then bolts again
        ellie.hold(Math.atan2(g.player.pos.x - ellie.pos.x, g.player.pos.z - ellie.pos.z));
        await s.until(() => ellie.pos.distanceTo(g.player.pos) < 14, 100, 'ellie waits');
        ellie.body.gesture('flinch', 0.8);
      }
      if (s.g.autopilot) {
        ellie.place(target);
        g.player.teleport(target.clone().add(V(-2, 0, -2)), g.player.yaw);
      } else await ellie.goto(target, 4.4);
      leg++;
    }
    ellie.dispose();
    g.people.delete('ellie');
    s.world.physics.addBox(26.8, 0, 81.6, 30.7, 3, 82.2, { noVault: true });
    for (const k of kids) k.lookAtPlayer = true;
    g.hud.hints(null);
    s.objective('PLAYGROUND', 'She went through the fence', V(28.7, FL, 80.6), 'FENCE');
    await s.near(V(28.7, FL, 79), 6);
    maya.follow();
    await s.say('maya', 'Elias! Elias, stop.', { dur: 1.8 });
    await s.say('maya', 'That was her. That was really her.', { dur: 2.4 });
    await s.say('elias', 'She looked right at me. She knew me.', { dur: 2.4 });
    await s.say('elias', 'And she ran.', { dur: 2 });
    await s.say('maya', 'Maybe she\'s been told what you\'re here to do.', { dur: 2.6 });
    await s.say('elias', 'What am I here to do?');
    await s.say('cole', 'Vale. Chen. Get back to the van. Command has new orders: there\'s something under this city.', { radio: true });
    s.clearWaypoint();
    await s.fade(1, 2);
  },
  shots: {
    front(g) {
      g.player.teleport(V(-3, FL, -6.5), Math.PI + 0.15, 0.08);
    },
    corridor(g) {
      g.player.teleport(V(-27, FL, 12), -Math.PI / 2, -0.02);
    },
    class3b(g) {
      g.player.teleport(V(-23.2, FL, 15), Math.PI + 0.25, -0.1);
    },
    room2a(g) {
      g.player.teleport(V(-3, FL, 17), Math.PI + 0.6, -0.25);
    },
    playground(g) {
      g.player.teleport(V(22, FL, 44), Math.PI, 0);
      const e = g.person('ellie', PEOPLE.ellie, V(10, FL, 58), Math.PI);
      e.body.speed = 4;
    },
  },
};
