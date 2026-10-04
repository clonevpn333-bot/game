import * as THREE from 'three';
import type { Chapter } from './index';
import type { World, EnvSettings } from '../world/World';
import type { Game, Script } from '../game/Game';
import * as K from '../world/Kit';
import { M, glowMaterial } from '../render/Materials';
import * as T from '../render/Textures';
import { SKY } from '../render/Sky';
import { audio } from '../audio/AudioEngine';
import { PEOPLE, citizen } from '../actors/Cast';
import type { Citizen } from '../game/Citizen';
import { V, adScreen, suburbHouse, gableRoof } from './common';
import { addGiant } from '../game/Giants';
import * as D from './dress';

/*
  Maple Street at night. Street along x, asphalt z ∈ [-5, 5], sidewalks to ±8, lawns beyond.
  The Vale house: x ∈ [-8, 8], z ∈ [12, 28], floor y = 0, ceiling 2.8. Front door at x = 0 (z = 12).
  Hall x ∈ [-1.2, 1.2]. West: living room z ∈ [12, 20], kitchen/dining z ∈ [20, 28].
  East: Eli's old room z ∈ [12, 20], Ellie's room z ∈ [20, 28].
*/
const H = 2.8;
const NIGHT: EnvSettings = {
  sky: SKY.stormLight, fog: '#1b2330', fogDensity: 0.011, rain: 0.45, envKind: 'city', exposure: 1.2,
  hemi: ['#8fa6c8', '#2a2018', 0.68], moon: { color: '#a8bede', intensity: 0.5, dir: [-0.35, 1, 0.45] },
  reverb: [1.0, 0.18], bloom: 0.65, grade: { sat: 1.08, vignette: 0.8 },
};

type Gap = [number, number, number?, number?];
/** Axis-aligned wall with gaps [from, to, bottom = 0, top = 2.15]: below bottom and above top stay solid. */
function wall(W: World, x0: number, z0: number, x1: number, z1: number, mat: THREE.Material, gaps: Gap[] = [], t = 0.16, h = H): void {
  const alongX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  const a = alongX ? Math.min(x0, x1) : Math.min(z0, z1);
  const b = alongX ? Math.max(x0, x1) : Math.max(z0, z1);
  const seg = (s: number, e: number, y0: number, y1: number) => {
    if (e - s < 0.01 || y1 - y0 < 0.01) return;
    if (alongX) W.box([s, y0, z0 - t / 2], [e, y1, z0 + t / 2], mat, { uv: 2, noVault: true });
    else W.box([x0 - t / 2, y0, s], [x0 + t / 2, y1, e], mat, { uv: 2, noVault: true });
  };
  let cur = a;
  for (const [g0, g1, bot = 0, top = 2.15] of [...gaps].sort((p, q) => p[0] - q[0])) {
    seg(cur, g0, 0, h);
    seg(g0, g1, 0, bot);
    seg(g0, g1, top, h);
    cur = g1;
  }
  seg(cur, b, 0, h);
}

/** A hinged door leaf; returns a setter for its open amount (0 closed .. 1 open). */
function doorLeaf(W: World, hinge: THREE.Vector3, along: 'x' | 'z', len: number, swing: number, color: string): (k: number) => void {
  const L = M();
  const pivot = new THREE.Group();
  pivot.position.copy(hinge);
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(along === 'x' ? len : 0.05, 2.1, along === 'x' ? 0.05 : len), new THREE.MeshStandardMaterial({ color, roughness: 0.55 }));
  leaf.position.set(along === 'x' ? len / 2 : 0, 1.05, along === 'x' ? 0 : len / 2);
  leaf.castShadow = true;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), L.steel);
  knob.position.set(along === 'x' ? len - 0.1 : 0.05, 1.0, along === 'x' ? 0.05 : len - 0.1);
  pivot.add(leaf, knob);
  W.add(pivot);
  const col = W.physics.add({ cx: hinge.x + (along === 'x' ? len / 2 : 0), cy: 1.05, cz: hinge.z + (along === 'z' ? len / 2 : 0), hx: along === 'x' ? len / 2 : 0.05, hy: 1.05, hz: along === 'z' ? len / 2 : 0.05, noVault: true });
  return (k: number) => {
    pivot.rotation.y = swing * k * (Math.PI / 2) * 0.92;
    col.enabled = k < 0.3;
  };
}

/** Flush ceiling dome lamp: soft, warm, no glare. */
function dome(W: World, x: number, z: number, intensity: number): void {
  W.boxC([x, H - 0.05, z], [0.42, 0.1, 0.42], D.paint('#fff1d8', 0.6, 0.22), 0, { collide: false, cast: false });
  W.light({ x, y: H - 0.25, z }, '#ffd9a8', { intensity, distance: 8, glow: 0, pool: false });
}

function buildStreet(W: World): void {
  const L = M();
  W.box([-200, -0.3, -200], [200, -0.01, 200], L.grass, { uv: 6, surface: 'concrete', cast: false });
  K.street(W, -120, -5, 120, 5, { sidewalk: 3, axis: 'x', crosswalks: [-60, 60] });
  // lawns, hedges and fences for a few houses each side
  const sidings = [L.siding, L.sidingBlue, L.sidingGreen];
  let seed = 51;
  for (const side of [1, -1] as const) {
    for (let x = -96; x <= 96; x += 19) {
      if (side === 1 && Math.abs(x) < 10) continue;
      const cz = side * 20;
      suburbHouse(W, x, cz, 12, 10, side === 1 ? -1 : 1, sidings[seed % 3], seed++, {});
      // mailbox + hedge
      W.boxC([x + 3, 0.55, side * 9.2], [0.1, 1.1, 0.1], L.woodPaint, 0);
      W.boxC([x + 3, 1.15, side * 9.2], [0.24, 0.24, 0.45], L.metalDark, 0, { collide: false });
      D.hedge(W, x - 6, side * 9.1 - 0.4, x - 1.2, side * 9.1 + 0.4, 0.8);
      if (seed % 2) K.tree(W, x + 7, side * 10.5, 1.1);
    }
  }
  for (let x = -110; x <= 110; x += 22) {
    K.streetLight(W, x, 6.3, Math.PI, {});
    K.streetLight(W, x + 11, -6.3, 0, {});
  }
  // parked cars
  const cols = ['#7a1414', '#1c2a44', '#d8d8d4', '#5a6066', '#3a4a2a'];
  for (let i = 0; i < 9; i++) {
    const x = -90 + i * 21 + (i % 3) * 3;
    if (Math.abs(x) < 9) continue;
    K.car(W, x, i % 2 ? 3.6 : -3.6, i % 2 ? Math.PI / 2 : -Math.PI / 2, cols[i % cols.length], {});
  }
  // the edges of the playable block
  for (const [a, b] of [[[-60, 0, -9], [60, 4, -8.6]], [[-60, 0, 30], [60, 4, 30.4]], [[-60.4, 0, -9], [-60, 4, 30]], [[60, 0, -9], [60.4, 4, 30]]] as [[number, number, number], [number, number, number]][]) {
    W.physics.addBox(a[0], a[1], a[2], b[0], b[1], b[2], { noVault: true });
  }
}

function buildHouse(W: World): { front: (k: number) => void; ellieDoor: (k: number) => void } {
  const L = M();
  const sidingY = new THREE.MeshStandardMaterial({ map: (L.siding as THREE.MeshStandardMaterial).map, color: '#f3e3b8', roughness: 0.8 });
  const paintHall = D.paint('#d9cbb0', 0.85);
  const paintLiving = L.wallpaper;
  const paintEllie = D.paint('#e9b8c4', 0.85);
  const paintEli = D.paint('#7d8fa6', 0.85);
  const trim = L.woodPaint;
  // floor + ceiling
  W.box([-8, -0.2, 12], [8, 0.01, 28], L.woodFloor, { uv: 2, surface: 'wood', cast: false });
  W.box([-8, H, 12], [8, H + 0.2, 28], D.paint('#efe9dc', 0.95), { uv: 2, collide: false });
  gableRoof(W, 0, 20, 17, 17, H + 0.2, L.shingle, sidingY, 0.55);
  // lawn, path, porch
  W.box([-9, 0.15, 8], [-0.9, 0.17, 12], L.grass, { collide: false, cast: false, uv: 3 });
  W.box([0.9, 0.15, 8], [9, 0.17, 12], L.grass, { collide: false, cast: false, uv: 3 });
  W.box([-0.9, 0.0, 8], [0.9, 0.16, 10], L.sidewalk, { collide: false, cast: false });
  W.box([-3, 0, 10], [3, 0.16, 12], L.wood, { uv: 2, surface: 'wood', collide: false });
  W.box([-3.1, 2.75, 9.8], [3.1, 2.9, 12], trim, { collide: false });
  for (const sx of [-2.9, 2.9]) W.boxC([sx, 1.4, 10.1], [0.14, 2.8, 0.14], trim, 0);
  W.light({ x: 0.9, y: 2.4, z: 11.7 }, '#ffcf8a', { intensity: 5, distance: 7, glow: 0.4, pool: true, streak: false });
  // mailbox
  W.boxC([2.4, 0.55, 8.6], [0.1, 1.1, 0.1], trim, 0);
  W.boxC([2.4, 1.15, 8.6], [0.26, 0.26, 0.48], D.paint('#2b4a7a', 0.4), 0, { collide: false });
  W.quad(new THREE.MeshStandardMaterial({ map: T.signTexture('VALE', { w: 256, h: 64, bg: '#2b4a7a', fg: '#ffffff' }), roughness: 0.5 }), { x: 2.535, y: 1.15, z: 8.6 }, 0.42, 0.12, Math.PI / 2);
  // exterior shell (siding) with front door + windows
  wall(W, -8, 12, 8, 12, sidingY, [[-0.55, 0.55], [-6.2, -3.4, 0.9, 2.1], [3.4, 6.2, 0.9, 2.1]], 0.22);
  wall(W, -8, 28, 8, 28, sidingY, [[-6, -3.5, 0.9, 2.1], [4, 6.5, 0.9, 2.1]], 0.22);
  wall(W, -8, 12, -8, 28, sidingY, [[14.5, 16.5, 0.9, 2.1]], 0.22);
  wall(W, 8, 12, 8, 28, sidingY, [[15, 17, 0.9, 2.1], [24, 26, 0.7, 2.0]], 0.22);
  // window glass (warm glow seen from outside)
  const glass = L.glass;
  for (const [x, z, yaw, w] of [[-4.8, 12, 0, 2.8], [4.8, 12, 0, 2.8], [-4.75, 28, 0, 2.5], [5.25, 28, 0, 2.5], [-8, 15.5, Math.PI / 2, 2], [8, 16, Math.PI / 2, 2], [8, 25, Math.PI / 2, 2]] as const) {
    W.quad(glass, { x, y: 1.5, z }, w, 1.2, yaw);
    W.boxC([x, 0.86, z], yaw ? [0.3, 0.06, w + 0.1] : [w + 0.1, 0.06, 0.3], trim, 0, { collide: false });
  }
  // interior walls
  wall(W, -1.2, 12, -1.2, 28, paintHall, [[13.2, 18.6], [22.6, 24]]);
  wall(W, 1.2, 12, 1.2, 28, paintHall, [[15.6, 16.6], [23.1, 24.0]]);
  wall(W, -8, 20, -1.2, 20, paintLiving, [[-6.2, -2.6]]);
  wall(W, 1.2, 20, 8, 20, paintEli, []);
  // painted skins on the room sides (with the same window openings)
  const win: Gap = [0, 0, 0.9, 2.1];
  const w = (a: number, b: number): Gap => [a, b, win[2], win[3]];
  wall(W, 1.3, 20.095, 7.88, 20.095, paintEllie, [], 0.01);
  wall(W, 7.875, 20.1, 7.875, 27.88, paintEllie, [w(24, 26)], 0.01);
  wall(W, 1.3, 27.875, 7.88, 27.875, paintEllie, [w(4, 6.5)], 0.01);
  wall(W, 7.875, 12.12, 7.875, 19.9, paintEli, [w(15, 17)], 0.01);
  wall(W, 1.3, 12.125, 7.88, 12.125, paintEli, [w(3.4, 6.2)], 0.01);
  wall(W, -7.875, 12.12, -7.875, 27.88, paintLiving, [w(14.5, 16.5)], 0.01);
  wall(W, -7.88, 12.125, -1.3, 12.125, paintLiving, [w(-6.2, -3.4)], 0.01);
  wall(W, -7.88, 27.875, -1.3, 27.875, paintLiving, [w(-6, -3.5)], 0.01);
  // curtains
  for (const [x, z, yaw, col] of [[7.8, 23.7, Math.PI / 2, '#ffd36b'], [7.8, 26.3, Math.PI / 2, '#ffd36b'], [-7.8, 14.2, Math.PI / 2, '#7a2a2a'], [-7.8, 16.8, Math.PI / 2, '#7a2a2a']] as const) W.boxC([x, 1.45, z], [0.06, 1.6, 0.5], D.paint(col, 0.95), yaw - Math.PI / 2, { collide: false });
  // baseboards
  for (const [a, b] of [[[-7.9, 0, 12.1], [7.9, 0.12, 12.16]], [[-7.9, 0, 27.84], [7.9, 0.12, 27.9]]] as [[number, number, number], [number, number, number]][]) W.box(a, b, trim, { collide: false, cast: false });
  // hall: runner rug, coat hooks, photos, a lamp
  D.rug(W, 0, 20, 1.6, 14, ['#6a2c2c', '#c9a46a'], 0.012);
  for (let i = 0; i < 5; i++) K.picture(W, T.familyPhoto((['family', 'siblings', 'beach', 'parents', 'ellie'] as const)[i], 30 + i), -1.1, 1.55 + (i % 2) * 0.12, 19.6 + i * 0.6, Math.PI / 2, 0.36, 0.28);
  for (const [x, z, i] of [[0, 14.5, 3.5], [0, 24, 3.5], [-4.5, 16, 4], [4.6, 16, 3.5], [4.6, 24.2, 3.5]] as const) dome(W, x, z, i);
  // height marks on Ellie's door frame (hall side)
  const marks = new THREE.MeshStandardMaterial({ map: T.heightMarks(), transparent: true, roughness: 0.8 });
  W.box([1.09, 0, 22.75], [1.12, 2.15, 23.1], D.paint('#efe8da', 0.7), { collide: false, cast: false });
  W.quad(marks, { x: 1.085, y: 1.05, z: 22.92 }, 0.32, 1.9, -Math.PI / 2);
  // ---- living room
  D.rug(W, -4.5, 16, 4, 3, ['#3f5f8a', '#d9c49a'], 0.012);
  K.sofa(W, -3.2, 16, -Math.PI / 2, D.paint('#7a5a3a', 0.95));
  W.boxC([-7.6, 0.3, 16], [0.5, 0.6, 2.2], L.wood, 0);
  D.bookshelf(W, -5, 12.35, 0, 1.8, 1.9, 8);
  K.picture(W, T.familyPhoto('family', 3), -7.86, 1.75, 18.6, Math.PI / 2, 0.8, 0.6);
  W.light({ x: -6.8, y: 1.5, z: 13.2 }, '#ffcf96', { intensity: 5, distance: 6, glow: 0.3, pool: false });
  W.boxC([-6.8, 0.75, 13.2], [0.06, 1.5, 0.06], L.metalDark, 0, { collide: false });
  W.boxC([-6.8, 1.5, 13.2], [0.35, 0.3, 0.35], D.paint('#efe2c4', 0.9, 0.6), 0, { collide: false });
  // ---- kitchen / dining: dinner for four, every night
  K.table(W, -4.6, 24.2, 0, 1.8, 1.1, L.wood);
  for (const [x, z, y] of [[-4.6, 23.35, 0], [-4.6, 25.05, Math.PI], [-5.8, 24.2, Math.PI / 2], [-3.4, 24.2, -Math.PI / 2]] as const) K.chair(W, x, z, y, L.wood);
  const plate = L.plasticWhite;
  for (const [x, z] of [[-4.6, 23.75], [-4.6, 24.65], [-5.3, 24.2], [-3.9, 24.2]]) W.boxC([x, 0.785, z], [0.26, 0.02, 0.26], plate, 0, { collide: false, cast: false });
  K.counter(W, -4.6, 27.45, 0, 5);
  K.fridge(W, -7.5, 25.3, Math.PI / 2, 1);
  W.light({ x: -4.6, y: 2.2, z: 24.2 }, '#ffd59a', { intensity: 7, distance: 7, glow: 0.5, pool: false });
  W.boxC([-4.6, 2.5, 24.2], [0.5, 0.18, 0.5], D.paint('#2b2b2b', 0.4), 0, { collide: false });
  // ---- Eli's room: exactly as he left it
  K.bed(W, 6.8, 14.4, Math.PI / 2, false, '#3f5f4a');
  K.desk(W, 3.4, 19.3, Math.PI, false);
  W.boxC([3.4, 0.83, 19.3], [0.36, 0.12, 0.28], D.paint('#efe6d2', 0.9), 0, { collide: false });
  for (const [i, t] of ['STATE UNIVERSITY', 'BELLWETHER HAWKS', 'NO SIGNAL'].entries()) K.poster(W, T.signTexture(t, { w: 256, h: 340, bg: ['#7a2a2a', '#1f3a5f', '#111'][i], fg: '#ffffff' }), 7.85, 1.7, 13.6 + i * 1.1, -Math.PI / 2, 0.6, 0.8);
  W.light({ x: 3.4, y: 1.2, z: 19.4 }, '#ffe2b0', { intensity: 3, distance: 5, glow: 0.25, pool: false });
  // half-packed duffel bag
  W.boxC([2.2, 0.2, 13.2], [0.8, 0.4, 0.4], D.paint('#3a4a2a', 0.9), 0.2);
  // ---- Ellie's room
  K.bed(W, 6.8, 26.4, Math.PI, true, '#e8778f');
  D.rug(W, 4.5, 23.8, 2.2, 1.8, ['#ffd36b', '#e8778f'], 0.012);
  D.bookshelf(W, 2.0, 27.6, Math.PI, 1.2, 1.1, 12);
  for (const [i, k] of (['house', 'city', 'eye', 'stairs'] as const).entries()) K.poster(W, T.drawingTex(`ellie-${i}`, k), 1.3, 1.5 + (i % 2) * 0.25, 21.0 + i * 0.95, Math.PI / 2, 0.6, 0.45);
  // desk + lamp, toy chest, bear, star poster
  W.boxC([2.0, 0.6, 21.0], [0.9, 0.05, 0.6], D.paint('#f4efe4', 0.6), 0, { collide: false });
  for (const [dx, dz] of [[-0.4, -0.25], [0.4, -0.25], [-0.4, 0.25], [0.4, 0.25]]) W.boxC([2.0 + dx, 0.3, 21.0 + dz], [0.05, 0.6, 0.05], D.paint('#f4efe4', 0.6), 0, { collide: false });
  W.physics.add({ cx: 2.0, cy: 0.35, cz: 21.0, hx: 0.45, hy: 0.35, hz: 0.3 });
  W.boxC([2.25, 0.75, 21.15], [0.12, 0.25, 0.12], D.paint('#7ff4ff', 0.4, 0.5), 0, { collide: false });
  W.light({ x: 2.25, y: 0.95, z: 21.15 }, '#bff6ff', { intensity: 2, distance: 4, glow: 0.15, pool: false });
  for (let i = 0; i < 5; i++) W.boxC([1.7 + i * 0.09, 0.66, 20.9], [0.07, 0.07, 0.25], D.paint(['#e8778f', '#ffd36b', '#3d5a8a', '#27ae60', '#8e44ad'][i], 0.7), 0.1 * i, { collide: false });
  W.boxC([4.9, 0.3, 27.4], [1.2, 0.6, 0.6], D.paint('#3d5a8a', 0.7), 0);
  const bear = D.paint('#a8724e', 0.95);
  W.boxC([7.0, 0.82, 27.1], [0.34, 0.36, 0.24], bear, 0.3, { collide: false });
  W.boxC([7.0, 1.12, 27.1], [0.26, 0.24, 0.22], bear, 0.3, { collide: false });
  for (const sx of [-0.1, 0.1]) W.boxC([7.0 + sx, 1.27, 27.12], [0.08, 0.08, 0.06], bear, 0.3, { collide: false });
  K.poster(W, T.signTexture('★ ★ ★', { w: 256, h: 256, bg: '#1b2a6b', fg: '#ffd36b' }), 3.0, 1.7, 27.84, Math.PI, 0.7, 0.7);
  K.poster(W, T.familyPhoto('siblings', 9), 5.5, 1.55, 20.2, 0, 0.42, 0.32);
  // the yellow raincoat on a hook
  W.boxC([4.0, 1.75, 20.2], [0.12, 0.05, 0.12], L.metalDark, 0, { collide: false });
  W.boxC([4.0, 1.3, 20.28], [0.55, 0.8, 0.14], D.paint('#f2c12e', 0.45), 0, { collide: false });
  W.boxC([4.0, 1.68, 20.3], [0.3, 0.14, 0.16], D.paint('#f2c12e', 0.45), 0, { collide: false });
  // fairy lights
  for (let i = 0; i < 14; i++) W.boxC([1.4 + i * 0.46, 2.55 + Math.sin(i * 0.9) * 0.06, 27.82], [0.06, 0.06, 0.06], glowMaterial(['#ffd36b', '#ff8fb0', '#7ff4ff'][i % 3], 2.5, 'fairy'), 0, { collide: false, cast: false });
  W.light({ x: 4.6, y: 2.3, z: 27.2 }, '#ffb3c6', { intensity: 3, distance: 6, glow: 0, pool: false });
  W.light({ x: 7.0, y: 0.9, z: 24.4 }, '#9fd6ff', { intensity: 2.5, distance: 4, glow: 0.2, pool: false });
  W.indoor([-8, -1, 12], [8, 4, 28]);
  // doors
  const front = doorLeaf(W, V(-0.55, 0, 12), 'x', 1.1, -1, '#7a2a2a');
  const ellieDoor = doorLeaf(W, V(1.2, 0, 23.1), 'z', 0.9, 1, '#f4efe4');
  return { front, ellieDoor };
}

export const ch5: Chapter = {
  id: 'ch5',
  num: 'CHAPTER FIVE',
  title: 'Ellie',
  env: NIGHT,
  seed: 505,
  build(W: World, g: Game, mode) {
    buildStreet(W);
    const doors = buildHouse(W);
    W.named.set('doors', doors);
    // far off over the rooftops: a Shepherd planting lamps along a new road
    addGiant(W, g, { pos: V(-60, 0, -62), yaw: Math.PI / 2, path: [V(-220, 0, -62), V(220, 0, -62), V(-220, 0, -62)], cargo: 'lamps', name: 'SHEPHERD 15', scale: 1.6, glow: 0.18 });
    // the house TV: CIVIC's evening programme
    const tv = adScreen(W, V(-7.3, 1.35, 16), Math.PI / 2, 1.5, 0.85, [
      { bg: '#0b2a3f', fg: '#7ff4ff', title: 'GOOD EVENING, BELLWETHER', sub: 'TOMORROW: LIGHT RAIN · 11°' },
      { bg: '#1c3a2a', fg: '#e8ffe8', title: 'HAWKS 3 · RIVERS 1', sub: 'THE STREAK CONTINUES' },
      { bg: '#0b2a3f', fg: '#ffffff', title: 'NOBODY LEAVES', sub: 'EVERYBODY STAYS · CIVIC' },
    ], 6);
    W.named.set('tv', tv);
    W.light({ x: -6.6, y: 1.3, z: 16 }, '#7fc8ff', { intensity: 3, distance: 5, glow: 0, pool: false, flicker: 0.15 });
    W.spawn.set(-14, 0.15, -6.5);
    W.spawnYaw = Math.PI * 0.82;
    // a couple of neighbours out in the rain
    if (mode !== 'title') {
      const n1 = g.extra(citizen(5101, { rain: true }).look, V(-30, 0.15, 7), { yaw: 0, greet: ['Evening.', 'Good to see the Vale boy back.'] });
      n1.body.attach('umbrella', 'R', '#1f3a5f');
      n1.body.gesture('umbrella', 999, true);
      const dog = g.extra(citizen(5102, { rain: true }).look, V(26, 0.15, -6.5), { path: [V(26, 0.15, -6.5), V(-26, 0.15, -6.5)], loop: true, speed: 0.9 });
      dog.greet = ['Lovely night for it.'];
      g.person('mom', PEOPLE.mom, V(-5.2, 0, 26.7), 0, { greet: [] });
      const dad = g.person('dad', PEOPLE.dad, V(-3.3, 0, 16), -Math.PI / 2, { greet: [], solid: false });
      dad.body.mode = 'sit';
      dad.lookAtPlayer = false;
      dad.hold(-Math.PI / 2);
      const ellie = g.person('ellie', PEOPLE.ellie, V(6.05, 0, 26.0), -Math.PI / 2, { greet: [], solid: false });
      ellie.body.mode = 'sit';
      ellie.lookAtPlayer = false;
      ellie.hold(-Math.PI / 2);
    }
  },
  ambience() {
    audio.wind(0.05);
  },
  async run(s: Script) {
    const g = s.g;
    const mom = g.people.get('mom')!;
    const dad = g.people.get('dad')!;
    const ellie = g.people.get('ellie')!;
    const doors = s.world.named.get('doors') as { front: (k: number) => void; ellieDoor: (k: number) => void };
    const tv = s.world.named.get('tv') as { set: (x: { bg: string; fg: string; title: string; sub?: string }[]) => void };
    const route = async (c: Citizen, pts: THREE.Vector3[], speed: number) => {
      for (const p of pts) await c.goto(p, speed);
    };
    const anim = async (fn: (k: number) => void, sec: number, from = 0, to = 1) => {
      const n = Math.max(1, Math.round(sec * 20));
      for (let i = 1; i <= n; i++) {
        fn(from + (to - from) * (i / n));
        await s.wait(sec / n);
      }
    };
    mom.lookAtPlayer = false;
    mom.hold(0);
    s.weapon('none');
    await s.fade(0, 2.5);
    await s.card('CHAPTER FIVE', 'ELLIE', '41 MAPLE STREET · 7:20 PM');
    await s.say('maya', 'Elias, Cole says you have twenty minutes. Then we come in after you.', { radio: true });
    await s.say('elias', 'Copy.', { radio: true, dur: 1.2 });
    s.objective('MAPLE STREET', 'Go home', V(0, 1.2, 11.4), '41');
    await s.near(V(0, 0, 9.5), 3.2);
    s.objective('MAPLE STREET', 'Knock', V(0, 1.2, 11.9));
    await s.use('knock', V(0, 1.2, 11.85), 'Knock', { radius: 2.2 });
    audio.knock(V(0, 1.2, 12));
    s.clearWaypoint();
    await s.wait(1.6);
    // Mom answers
    mom.place(V(0.1, 0, 13.0), Math.PI);
    mom.hold(Math.PI);
    mom.lookAtPlayer = true;
    audio.door('open', V(0, 1.2, 12));
    await anim(doors.front, 0.9);
    await s.lookAt(mom.head, 0.8);
    await s.say('mom', 'Eli! Oh, look at you. You\'re soaked.', { label: 'MOM' });
    await s.say('elias', '...Mom.', { dur: 1.6 });
    await s.thought('Same sweater as the last photo on my phone. Same everything.', 3.2);
    mom.body.gesture('wave', 1.2);
    await s.say('mom', 'Come in, come in. Dinner\'s nearly ready. I set your place.', { label: 'MOM' });
    await s.say('mom', 'I set it every night. Just in case.', { label: 'MOM', dur: 2.6 });
    void route(mom, [V(-0.1, 0, 23.3), V(-2.5, 0, 23.3), V(-5.2, 0, 26.7)], 1.1).then(() => mom.hold(0));
    s.checkpoint(V(0, 0, 13.4), Math.PI);
    s.objective('THE VALE HOUSE', 'Go inside', V(0, 1.2, 14), 'HOME');
    await s.zone([-1.2, -1, 12.4], [1.2, 3, 19]);
    s.clearWaypoint();
    dad.lookAtPlayer = true;
    await s.say('dad', 'There he is. College boy.', { label: 'DAD' });
    await s.say('dad', 'Hawks won again. Twelve in a row. You\'d have loved it.', { label: 'DAD' });
    await s.say('mom', 'Ellie\'s in her room. She\'s been in a mood all day. Go on, she\'ll come round.', { label: 'MOM' });
    s.objective('THE VALE HOUSE', 'Ellie\'s room', V(1.2, 1.3, 23.55), 'ELLIE');
    await s.use('ellieDoor', V(1.1, 1.2, 23.55), 'Knock', { radius: 1.8 });
    audio.knock(V(1.2, 1.2, 23.5));
    await s.wait(0.8);
    await s.say('ellie', 'Go away, Eli.', { dur: 1.8 });
    await s.say('mom', 'Give her a minute, love. Your room\'s just how you left it.', { label: 'MOM' });
    // ---- the house remembers
    s.objective('THE VALE HOUSE', 'Look around your old room', V(3.4, 1.0, 19.1), 'DESK');
    await s.use('letters', V(3.4, 0.9, 19.1), 'Read the letters', { radius: 2 });
    await g.hud.doc('A SHOEBOX · 132 LETTERS · NEVER POSTED', 'Dear Eli,\nMom says college is very far. How far? Farther than the stadium?\nLove Ellie\n\nDear Eli,\nI lost a tooth. I am keeping it for you.\n\nDear Eli,\nCIVIC says nobody leaves Bellwether.\nYou did though.\n\nDear Eli,\nThe leaves fell again. You said before the leaves fall.\n\nDear Eli,\nI am still 8. Mom says that is ok.\n\n(the last letter is just the date, written 41 times)');
    await s.thought('One hundred and thirty-two letters. Eleven years.', 2.6);
    s.objective('THE VALE HOUSE', 'The door frame in the hall', V(1.1, 1.3, 22.92), 'MARKS');
    await s.use('marks', V(1.06, 1.1, 22.92), 'Look at the height marks', { radius: 1.8 });
    await s.cut(async () => {
      s.cam(V(-0.4, 1.4, 22.5), V(1.1, 1.0, 22.92), 34);
      await s.camTo(V(-0.3, 1.2, 22.7), V(1.1, 1.25, 22.92), 3, 26);
      await s.thought('ELLIE 7. ELLIE 8!', 2.2);
      await s.thought('And then nothing. Eleven years of nothing, in the same spot.', 3);
    });
    // ---- Ellie
    audio.door('creak', V(1.2, 1.2, 23.5));
    await anim(doors.ellieDoor, 1.2);
    await s.say('ellie', '...You can come in. If you want.', { dur: 2.4 });
    s.objective('ELLIE\'S ROOM', 'Go in', V(3.5, 1.2, 23.6), 'ELLIE');
    await s.zone([1.3, -1, 20.2], [7.8, 3, 27.8]);
    s.clearWaypoint();
    s.checkpoint(V(2.6, 0, 23.6), -Math.PI / 2);
    audio.stinger('soft');
    await s.cut(async () => {
      s.cam(V(2.4, 1.55, 23.0), ellie.head, 40);
      ellie.lookAtPlayer = false;
      ellie.body.lookTarget = V(2.4, 1.55, 23.0);
      await s.wait(1.2);
      await s.say('ellie', 'Eli?', { dur: 1.8 });
      ellie.body.mode = 'idle';
      ellie.place(V(5.6, 0, 25.6), -Math.PI / 2);
      await ellie.goto(V(3.05, 0, 23.25), 2.6);
      ellie.hold(-Math.PI / 2 - 0.25);
      ellie.body.gesture('hug', 999, true);
      audio.stinger('soft');
      await s.camTo(V(2.25, 1.4, 23.0), ellie.head, 1.2, 50);
      await s.wait(1.6);
      await s.say('ellie', 'You said you\'d come back. On the porch. You said before the leaves fall.');
      await s.say('elias', 'I know. I know I did.');
      await s.say('ellie', 'The leaves fell eleven times, Eli. I counted.', { dur: 3 });
      ellie.body.stopGesture();
      await s.wait(0.4);
      ellie.body.gesture('talkhands', 999, true);
      await s.say('ellie', 'Mom said you were busy. Dad said college is far. CIVIC said people who leave don\'t come back.');
      await s.say('ellie', 'Everybody said something. Nobody said you were coming.');
      await s.say('elias', 'I couldn\'t get back in, Ellie. Nobody could. The whole city just... stopped answering.');
      ellie.body.stopGesture();
      await s.say('ellie', 'That\'s not true. Everybody stayed. Everybody. Only you left.', { dur: 3.2 });
      await s.camTo(V(2.0, 1.62, 23.2), ellie.head, 2, 30);
      await s.thought('Tell her. Tell her what she is.', 2.4);
      await s.say('elias', '...I\'m sorry, Ellie.', { dur: 2.2 });
      ellie.body.lookTarget = V(7.8, 1.6, 25);
      await s.say('ellie', 'Sometimes I wake up and I can\'t remember being seven. Just the words of it. Like reading about somebody else.');
      await s.say('ellie', 'Is that normal?', { dur: 1.8 });
      ellie.body.lookTarget = V(2.0, 1.62, 23.2);
      await s.say('elias', 'Yeah. That\'s normal. Everybody forgets things.', { dur: 2.6 });
      ellie.body.glitch(0.35);
      audio.glitchZap(ellie.head, 0.08);
      await s.wait(0.5);
      await s.say('ellie', 'Okay.', { dur: 1.4 });
      await s.say('ellie', 'The man in the tower hums at night. Under the floor. Do you hear him?', { dur: 3.4 });
      await s.say('elias', 'No. What does he hum?');
      await s.say('ellie', 'Names. Mine is in it. Mine and another one that sounds like mine.', { dur: 3.4 });
      await s.say('mom', 'Dinner! Both of you. It\'s getting cold.', { label: 'MOM' });
      ellie.body.lookTarget = null;
    });
    ellie.lookAtPlayer = true;
    // ---- dinner
    s.objective('THE VALE HOUSE', 'Dinner', V(-4.6, 1.0, 23.4), 'TABLE');
    void route(ellie, [V(-0.2, 0, 23.5), V(-2.4, 0, 23.4), V(-2.6, 0, 25.5), V(-4.6, 0, 25.5), V(-4.6, 0, 25.05)], 1.4).then(() => {
      ellie.hold(Math.PI);
      ellie.body.mode = 'sit';
    });
    dad.body.mode = 'idle';
    void route(dad, [V(-4.2, 0, 18.6), V(-4.2, 0, 21.2), V(-2.8, 0, 22.6), V(-2.9, 0, 24.2), V(-3.4, 0, 24.2)], 1.1).then(() => {
      dad.hold(-Math.PI / 2);
      dad.body.mode = 'sit';
    });
    await s.near(V(-4.6, 0, 23.2), 1.8);
    s.clearWaypoint();
    await s.until(() => ellie.body.mode === 'sit' || g.autopilot, 100, 'ellie sits');
    await s.cut(async () => {
      mom.place(V(-5.8, 0, 24.2), Math.PI / 2);
      mom.hold(Math.PI / 2);
      mom.body.mode = 'sit';
      for (const p of [mom, dad, ellie]) p.lookAtPlayer = true;
      const seat = V(-4.6, 1.2, 23.25);
      s.cam(seat, V(-4.6, 1.0, 25), 52);
      await s.wait(1);
      await s.say('dad', 'So. How long are you staying this time?', { label: 'DAD' });
      await s.say('elias', 'I don\'t know yet.', { dur: 1.8 });
      await s.say('mom', 'As long as you like. Your room\'s always yours.', { label: 'MOM' });
      // the strike
      audio.rumble(2.5, 0.5);
      s.shake(0.25);
      g.lights.master = 0.3;
      await s.wait(0.6);
      g.lights.master = 1;
      tv.set([{ bg: '#3a0000', fg: '#ff4a3a', title: 'EXTERNAL ATTACK IN PROGRESS', sub: 'REMAIN INDOORS · CIVIC IS PROTECTING YOU' }]);
      g.lights.tintMix = 0.85;
      audio.civicChime?.();
      await s.civic('CITIZENS OF BELLWETHER. OUR CITY IS UNDER ATTACK.', 'REMAIN INDOORS. MUNICIPAL SECURITY IS MOBILISING.', 3.6);
      await s.say('cole', 'Vale! Command just hit the grid. They\'re trying to shut the whole city off. Get out of there, now!', { radio: true });
      for (const p of [mom, dad]) {
        p.lookAtPlayer = false;
        p.body.mode = 'stiff';
        p.body.glitch(0.6);
      }
      audio.glitchZap(V(-4.6, 1.2, 24.2), 0.12);
      await s.say('mom', 'Eli, sit down. The food will get cold.', { label: 'MOM' });
      await s.say('dad', 'Sit down, son.', { label: 'DAD', dur: 1.8 });
      await s.say('ellie', 'Eli? What\'s happening? Why is everything red?', { dur: 2.6 });
      await s.say('elias', 'Stay here. Lock the door. I\'ll come back for you.', { dur: 2.8 });
      ellie.body.glitch(0.25);
      await s.say('ellie', 'That\'s what you said last time.', { dur: 2.8 });
    });
    s.objective('MAPLE STREET', 'Get out', V(0, 1.2, 11.6), 'DOOR');
    await s.zone([-3, -1, 6], [3, 3, 11.8]);
    s.clearWaypoint();
    await s.fade(1, 2);
  },
  shots: {
    street(g) {
      g.player.teleport(V(-14, 0.15, -6.5), Math.PI * 0.82, 0.03);
    },
    porch(g) {
      g.player.teleport(V(-2, 0.15, 5), Math.PI * 0.95, 0.12);
    },
    living(g) {
      g.player.teleport(V(-0.2, 0, 13.6), Math.PI * 0.62, -0.08);
    },
    hall(g) {
      g.player.teleport(V(0, 0, 13.2), Math.PI, -0.02);
    },
    ellie(g) {
      const d = g.world!.named.get('doors') as { ellieDoor: (k: number) => void };
      d.ellieDoor(1);
      g.player.teleport(V(1.9, 0, 22.4), -Math.PI * 0.78, -0.12);
    },
    dinner(g) {
      g.player.teleport(V(-4.6, 0, 22.4), Math.PI, -0.18);
      g.lights.tintMix = 0.85;
    },
  },
};

