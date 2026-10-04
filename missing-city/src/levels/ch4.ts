import * as THREE from 'three';
import type { Chapter } from './index';
import { V } from './common';
import * as K from '../world/Kit';
import { M, texturedMaterial, glowMaterial } from '../render/Materials';
import { SKY } from '../render/Sky';
import { familyPhoto, heightMarks, drawingTex, signTexture } from '../render/Textures';
import { audio } from '../audio/AudioEngine';
import type { World } from '../world/World';

import { Actor } from '../actors/Characters';

/** Suburban house exterior. */
export function house(W: World, x: number, z: number, w: number, d: number, wall: THREE.Material, o: { yaw?: number; porch?: boolean; lit?: number; door?: boolean; skipBody?: boolean } = {}): void {
  const L = M();
  const h = 3.2;
  if (!o.skipBody) W.box([x, 0, z], [x + w, h, z + d], wall, { uv: 2, surface: 'wood' });
  // gable roof (extruded triangle along x)
  const s = new THREE.Shape();
  s.moveTo(-d / 2 - 0.5, 0);
  s.lineTo(0, 2.2);
  s.lineTo(d / 2 + 0.5, 0);
  s.lineTo(-d / 2 - 0.5, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: w + 0.8, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  W.geo(g, L.shingle, { x: x - 0.4, y: h, z: z + d / 2 }, 0, 1, { uv: 'world', uvScale: 1.5 });
  // trim + windows
  W.box([x - 0.05, h - 0.15, z - 0.05], [x + w + 0.05, h, z + d + 0.05], L.woodPaint, { collide: false });
  const lit = o.lit ?? 0.5;
  for (let i = 0; i < Math.floor(w / 3); i++) {
    const wx = x + 1.5 + i * 3;
    if (Math.abs(wx - (x + w / 2)) < 1) continue;
    W.box([wx - 0.6, 1.0, z - 0.06], [wx + 0.6, 2.3, z - 0.02], L.woodPaint, { collide: false });
    const on = ((wx * 13) % 10) / 10 < lit;
    W.quad(on ? glowMaterial('#ffcf8a', 0.9, 'win') : L.glassDark, { x: wx, y: 1.65, z: z - 0.07 }, 1.0, 1.1, Math.PI);
    if (on) W.light({ x: wx, y: 1.7, z: z - 0.8 }, '#ffcf8a', { intensity: 3, distance: 5, glow: 0, pool: false });
  }
  if (o.porch !== false) {
    const px = x + w / 2;
    W.box([px - 1.6, 0, z - 1.8], [px + 1.6, 0.3, z], L.wood, { uv: 1, surface: 'wood' });
    W.box([px - 1.7, 2.6, z - 2.0], [px + 1.7, 2.75, z], L.woodPaint, { collide: false });
    for (const sx of [-1.5, 1.5]) W.box([px + sx - 0.07, 0.3, z - 1.85], [px + sx + 0.07, 2.6, z - 1.71], L.woodPaint, {});
    if (o.door !== false) W.box([px - 0.5, 0.3, z - 0.05], [px + 0.5, 2.4, z - 0.01], L.wood, { collide: false });
    W.light({ x: px + 0.8, y: 2.3, z: z - 0.3 }, '#ffc070', { intensity: 5, distance: 7, glow: 0.35, poolY: 0.3 });
  }
}

function fence(W: World, x0: number, x1: number, z: number): void {
  const L = M();
  for (let x = x0; x < x1; x += 0.25) W.box([x, 0, z - 0.03], [x + 0.08, 0.9, z + 0.03], L.woodPaint, { collide: false });
  W.box([x0, 0.6, z - 0.04], [x1, 0.7, z + 0.04], L.woodPaint, { collide: true, noVault: false });
}

function buildMaple(W: World): { musicBox: THREE.Vector3 } {
  const L = M();
  // street (along x) + lawns
  K.street(W, -60, -16, 80, -6, { axis: 'x', sidewalk: 2 });
  W.box([-60, -0.05, -4], [80, 0.12, 30], L.grass, { uv: 3, surface: 'dirt', cast: false });
  W.box([-60, -0.05, -40], [80, 0.12, -18], L.grass, { uv: 3, surface: 'dirt', cast: false });
  // neighbours
  house(W, -44, 4, 12, 9, L.sidingBlue, { lit: 0.6 });
  house(W, -26, 5, 11, 8, L.siding, { lit: 0.3 });
  house(W, 22, 4, 12, 9, L.sidingGreen, { lit: 0.5 });
  house(W, 40, 5, 12, 8, L.siding, { lit: 0.7 });
  house(W, -40, -32, 12, 9, L.siding, { lit: 0.4 });
  house(W, -20, -33, 11, 9, L.sidingGreen, { lit: 0.6 });
  house(W, 2, -33, 12, 9, L.sidingBlue, { lit: 0.2 });
  house(W, 24, -32, 12, 9, L.siding, { lit: 0.8 });
  for (const x of [-38, -20, 28, 46]) fence(W, x - 6, x + 6, 0.4);
  for (const [x, z] of [[-48, 0], [-32, 1], [-8, 0], [16, 0], [36, 0], [56, 1], [-30, -22], [-6, -24], [18, -22]]) K.tree(W, x, z, 1.1);
  for (let x = -54; x < 80; x += 18) K.streetLight(W, x, -4.6, Math.PI, { color: '#ffc890' });
  K.car(W, -30, -8, Math.PI / 2, K.CAR_COLORS[4]);
  K.car(W, 30, -14, -Math.PI / 2, K.CAR_COLORS[0], { kind: 'suv' });
  // kid's bike on a lawn
  W.boxC([-22, 0.35, 1.6], [0.05, 0.6, 1.2], L.paintRed, 0.4, { collide: false });
  W.geo(new THREE.TorusGeometry(0.3, 0.04, 6, 16), L.rubber, { x: -22.3, y: 0.32, z: 1.2 }, new THREE.Euler(0, 0.4 + Math.PI / 2, 0), 1);
  W.geo(new THREE.TorusGeometry(0.3, 0.04, 6, 16), L.rubber, { x: -21.7, y: 0.32, z: 2.0 }, new THREE.Euler(0, 0.4 + Math.PI / 2, 0), 1);
  // street sign
  W.boxC([-3, 1.5, -4.8], [0.08, 3, 0.08], L.metal, 0);
  W.quad(texturedMaterial(signTexture('MAPLE ROW', { bg: '#1a5a2a', fg: '#ffffff', w: 512, h: 128 }), 0.5), { x: -3, y: 2.9, z: -4.8 }, 1.4, 0.35, 0);
  const r = valeHouse(W, 0, 0);
  backyard(W);
  W.physics.add({ cx: 10, cy: 2, cz: -40, hx: 80, hy: 2, hz: 0.5 });
  W.physics.add({ cx: 10, cy: 2, cz: 30, hx: 80, hy: 2, hz: 0.5 });
  W.physics.add({ cx: -60, cy: 2, cz: 0, hx: 0.5, hy: 2, hz: 40 });
  W.physics.add({ cx: 80, cy: 2, cz: 0, hx: 0.5, hy: 2, hz: 40 });
  return r;
}

/** The Vale family home (x 0..14, z 0..12 relative to ox/oz). */
export function valeHouse(W: World, ox: number, oz: number): { musicBox: THREE.Vector3 } {
  const L = M();
  house(W, ox, oz, 14, 12, L.siding, { porch: true, lit: 1, door: false, skipBody: true });
  const wallM = L.wallpaper;
  // exterior shell with openings
  const T = 0.2;
  const seg = (a: [number, number, number], b: [number, number, number], m = L.siding) => W.box(a, b, m, { uv: 2, noVault: true });
  seg([ox, 0, oz], [ox + 3, 3.2, oz + T]);
  seg([ox + 4.2, 0, oz], [ox + 14, 3.2, oz + T]);
  seg([ox + 3, 2.4, oz], [ox + 4.2, 3.2, oz + T]);
  seg([ox, 0, oz + 12 - T], [ox + 14, 3.2, oz + 12]);
  seg([ox, 0, oz], [ox + T, 3.2, oz + 12]);
  seg([ox + 14 - T, 0, oz], [ox + 14, 3.2, oz + 6.3]);
  seg([ox + 14 - T, 0, oz + 7.5], [ox + 14, 3.2, oz + 12]);
  seg([ox + 14 - T, 2.3, oz + 6.3], [ox + 14, 3.2, oz + 7.5]);
  W.box([ox, -0.1, oz], [ox + 14, 0.01, oz + 12], L.woodFloor, { uv: 2, surface: 'wood', cast: false });
  W.box([ox, 3.0, oz], [ox + 14, 3.2, oz + 12], L.plasterWhite, { uv: 2 });
  W.indoor([ox, 0, oz], [ox + 14, 3.2, oz + 12]);
  // interior partitions: hallway z 6..7.6
  const inner = (a: [number, number, number], b: [number, number, number], m: THREE.Material = wallM) => W.box(a, b, m, { uv: 2, noVault: true });
  inner([ox, 0, oz + 6], [ox + 6.2, 3.0, oz + 6.15]);
  inner([ox + 7.4, 0, oz + 6], [ox + 14, 3.0, oz + 6.15]);
  inner([ox, 0, oz + 7.6], [ox + 1.6, 3.0, oz + 7.75]);
  inner([ox + 2.6, 0, oz + 7.6], [ox + 6.6, 3.0, oz + 7.75]);
  inner([ox + 7.6, 0, oz + 7.6], [ox + 11.2, 3.0, oz + 7.75]);
  inner([ox + 12.2, 0, oz + 7.6], [ox + 14, 3.0, oz + 7.75]);
  inner([ox + 5.0, 0, oz + 7.75], [ox + 5.15, 3.0, oz + 12]);
  inner([ox + 10.0, 0, oz + 7.75], [ox + 10.15, 3.0, oz + 12]);
  for (const [a, b] of [[1.6, 2.6], [6.6, 7.6], [11.2, 12.2]] as const) W.box([ox + a, 2.2, oz + 7.6], [ox + b, 3.0, oz + 7.75], wallM, { collide: false });
  // door frame with height marks (Ellie's room)
  W.box([ox + 7.55, 0, oz + 7.55], [ox + 7.65, 2.2, oz + 7.8], L.woodPaint, { collide: false });
  W.quad(new THREE.MeshStandardMaterial({ map: heightMarks(), transparent: true, roughness: 0.8 }), { x: ox + 7.67, y: 1.1, z: oz + 7.4 }, 0.42, 1.7, Math.PI / 2 * 0 + Math.PI);
  // living room
  K.sofa(W, ox + 3.2, oz + 4.6, Math.PI, L.fabric);
  K.table(W, ox + 3.2, oz + 3.3, 0, 1.2, 0.6);
  W.boxC([ox + 3.2, 0.5, oz + 0.7], [1.6, 1.0, 0.5], L.wood, 0);
  W.boxC([ox + 3.2, 1.35, oz + 0.75], [1.2, 0.7, 0.08], L.plasticDark, 0, { collide: false });
  W.light({ x: ox + 3.2, y: 1.35, z: oz + 0.9 }, '#6080ff', { intensity: 2.5, distance: 5, glow: 0, pool: false, flicker: 0.3 });
  W.boxC([ox + 0.8, 0.45, oz + 3], [0.9, 0.9, 0.9], L.fabricRed, 0);
  W.light({ x: ox + 1, y: 1.7, z: oz + 5 }, '#ffcf96', { intensity: 5, distance: 7, glow: 0.4, pool: false });
  W.boxC([ox + 1, 0.8, oz + 5.2], [0.3, 1.6, 0.3], L.wood, 0);
  K.picture(W, familyPhoto('family', 3), ox + 0.21, 1.7, oz + 2.2, Math.PI / 2, 0.6, 0.46);
  K.picture(W, familyPhoto('siblings', 5), ox + 0.21, 1.6, oz + 3.4, Math.PI / 2, 0.44, 0.34);
  K.picture(W, familyPhoto('beach', 7), ox + 5.2, 1.7, oz + 5.84, Math.PI, 0.6, 0.46);
  // kitchen
  W.boxC([ox + 12.6, 0.45, oz + 3], [2.4, 0.9, 5.4], L.woodPaint, 0);
  W.boxC([ox + 12.6, 0.92, oz + 3], [2.5, 0.05, 5.5], L.trimLight, 0, { collide: false });
  K.table(W, ox + 9.5, oz + 3, 0, 1.4, 1.0);
  K.chair(W, ox + 9.5, oz + 2.1, 0);
  K.chair(W, ox + 9.5, oz + 3.9, Math.PI);
  K.ceilingLight(W, ox + 10, 2.98, oz + 3, { color: '#fff1d6', intensity: 5, distance: 7 });
  // hallway lights
  W.light({ x: ox + 3, y: 2.8, z: oz + 6.8 }, '#ffd8a0', { intensity: 3.5, distance: 5, glow: 0.3, pool: false });
  W.light({ x: ox + 11, y: 2.8, z: oz + 6.8 }, '#ffd8a0', { intensity: 3.5, distance: 5, glow: 0.3, pool: false, flicker: 0.4 });
  // Elias's room (x 0..5)
  K.bed(W, ox + 1.2, oz + 10.4, Math.PI / 2, true, '#2a4a6a');
  K.desk(W, ox + 3.6, oz + 11.4, Math.PI, false);
  K.poster(W, texturedMaterial(signTexture('BELLWETHER BOMBERS', { bg: '#1a2a5a', fg: '#ffd040', w: 256, h: 384, sub: 'STATE CHAMPS' }), 0.8).map!, ox + 4.95, 1.8, oz + 9.5, -Math.PI / 2, 0.6, 0.9);
  K.poster(W, drawingTex('city', 'city'), ox + 2.4, 1.6, oz + 11.82, Math.PI, 0.5, 0.38);
  W.light({ x: ox + 3.6, y: 1.25, z: oz + 11.2 }, '#ffc078', { intensity: 2.5, distance: 4, glow: 0.2, pool: false });
  // Ellie's room (x 5..10)
  K.bed(W, ox + 6.2, oz + 10.4, Math.PI / 2, true, '#d070a0');
  W.boxC([ox + 9.3, 0.4, oz + 11.3], [0.9, 0.8, 0.6], L.woodPaint, 0);
  const musicBox = V(ox + 9.3, 0.9, oz + 11.3);
  W.boxC([musicBox.x, 0.86, musicBox.z], [0.22, 0.12, 0.16], L.wood, 0, { collide: false });
  W.geo(new THREE.SphereGeometry(0.15, 10, 8), new THREE.MeshStandardMaterial({ color: 0xb08050, roughness: 0.9 }), { x: ox + 6.2, y: 0.75, z: oz + 9.4 });
  K.poster(W, drawingTex('house', 'house'), ox + 7.5, 1.4, oz + 11.82, Math.PI, 0.5, 0.38);
  K.poster(W, drawingTex('eye', 'eye'), ox + 9.94, 1.5, oz + 9.2, -Math.PI / 2, 0.45, 0.34);
  K.poster(W, drawingTex('stairs', 'stairs'), ox + 5.2, 1.5, oz + 9.2, Math.PI / 2, 0.45, 0.34);
  W.light({ x: ox + 8, y: 0.5, z: oz + 8.4 }, '#ff90c8', { intensity: 2, distance: 3, glow: 0.15, pool: false });
  return { musicBox };
}

function backyard(W: World): void {
  const L = M();
  // backyard with swing set
  W.box([14, -0.05, -2], [30, 0.12, 18], L.grass, { uv: 3, surface: 'dirt', cast: false });
  fence(W, 14, 30, 18);
  W.box([30, 0, -2], [30.1, 1.4, 18], L.woodPaint, {});
  for (const sx of [21, 24]) W.boxC([sx, 1.2, 9], [0.08, 2.4, 0.08], L.metal, 0);
  W.boxC([22.5, 2.4, 9], [3.2, 0.08, 0.08], L.metal, 0, { collide: false });
  W.boxC([22.5, 0.55, 9], [0.6, 0.05, 0.25], L.wood, 0, { collide: false });
  W.light({ x: 14.3, y: 2.4, z: 7.6 }, '#ffd090', { intensity: 5, distance: 9, glow: 0.4, poolY: 0.12 });
  W.light({ x: 22.5, y: 4.5, z: 9 }, '#a0c0ff', { intensity: 3, distance: 10, glow: 0, pool: false });
}

let mb: THREE.Vector3 = V(0, 0, 0);

export const ch4: Chapter = {
  id: 'ch4', num: 'CHAPTER FOUR', title: 'Home', sub: 'Maple Row',
  env: {
    sky: SKY.suburb, fog: '#0a0d14', fogDensity: 0.016, rain: 0.35, envKind: 'city', exposure: 1.2,
    hemi: ['#5a6480', '#14100c', 0.28], moon: { color: '#9ab0d8', intensity: 0.45, dir: [-0.5, 1, 0.3] }, reverb: [1.2, 0.2], bloom: 0.55,
    grade: { sat: 0.9, tint: '#f6f2ec', vignette: 1.0 },
  },
  chars: ['elias', 'ellie'],
  echoUnlocked: true,
  gun: true,
  seed: 4,
  build(W) {
    mb = buildMaple(W).musicBox;
    W.spawn.set(-50, 0.15, -11);
    W.spawnYaw = Math.PI / 2;
  },
  ambience() {
    audio.setRain(0.35, false);
    audio.wind(0.1);
    audio.hum(V(3, 1.4, 1), 0.03, 60, 0.02);
  },
  shots: {
    street(g) {
      g.player.teleport(V(-12, 0.15, -10), Math.PI / 2 + 0.5);
      g.player.camPitch = 0.08;
      g.player.snapCamera();
    },
    hallway(g) {
      g.player.teleport(V(1.2, 0, 6.8), Math.PI / 2);
      g.player.snapCamera();
    },
  },
  async run(s) {
    const g = s.g;
    g.hud.setFade(1);
    s.control(false);
    void s.fade(0, 3);
    await s.card('CHAPTER FOUR', 'HOME', 'MAPLE ROW');
    s.control(true);
    await s.say('MAYA', 'Elias, you\'re off the map. Where are you going?', { radio: true });
    await s.say('ELIAS', 'Give me five minutes.', { radio: true });
    await s.say('VOSS', 'Let him go, Maya.', { radio: true });
    s.objective('MAPLE ROW', 'Go home');
    await s.zone([-30, -1, -16], [-14, 4, 0]);
    await s.thought('Mr. Delgado\'s bike. He never once put it away.');
    await s.zone([-6, -1, -16], [12, 4, -1]);
    await s.thought('The porch light. Mom always left it on until both of us were home.', 4);
    s.objective('THE VALE HOUSE', 'Go inside');
    await s.near(V(3.6, 0, 0), 1.6);
    audio.door('open', V(3.6, 1.2, 0));
    await s.wait(0.8);
    await s.zone([0.5, -1, 0.5], [6, 3, 5.5]);
    s.checkpoint();
    s.objective('THE VALE HOUSE', 'Look around');
    let seen = 0;
    const look = (id: string, p: THREE.Vector3, prompt: string, fn: () => Promise<void>) => s.use(id, p, prompt).then(fn).then(() => void seen++);
    const all = Promise.allSettled([
      look('photo', V(0.4, 1.7, 2.2), 'Family photo', async () => {
        await s.thought('Dad, Mom, me at thirteen, Ellie with no front teeth. The last good summer.', 4.5);
      }),
      look('marks', V(7.6, 1.1, 7.3), 'Doorframe', async () => {
        await s.thought('"ELLIE 8!" She made Dad measure her the morning of her birthday. The night before.', 5);
      }),
      look('mine', V(2.4, 1.4, 11.4), 'Drawing', async () => {
        await s.thought('"The thing under the city." I drew that. I don\'t remember drawing that.', 4.5);
        audio.whisper(V(2, 1.4, 11), 0.08, 1.6);
      }),
      look('tv', V(3.2, 1.3, 1.1), 'Television', async () => {
        await s.thought('Static. Channel 4 went off the air at 2:16. We were watching it. Ellie couldn\'t sleep.', 4.5);
      }),
    ]);
    await s.until(() => seen >= 2);
    s.objective('THE VALE HOUSE', 'Ellie\'s room');
    await s.use('musicbox', mb, 'Music box');
    s.control(false);
    const dur = audio.ellieTheme(0.08, 1.05);
    await s.thought('She wound it every night. Every single night.', 4);
    s.control(true);
    await s.wait(Math.max(0, dur - 4));
    void all;
    // "Eli?"
    const ellie = new Actor('ellie');
    g.world!.add(ellie.root);
    ellie.root.position.set(12.8, 0, 6.8);
    ellie.root.rotation.y = -Math.PI / 2;
    g.world!.onUpdate((dt) => ellie.update(dt));
    await s.zone([0.2, -1, 6.1], [14, 3, 7.6]);
    await s.cut(async () => {
      s.cam(g.player.head.clone().add(V(-0.3, 0.05, -0.4)), V(12.8, 1.0, 6.8), 40);
      await s.wait(1.4);
      audio.voice(V(12.8, 1.1, 6.8), { pitch: 330, vowels: 'ei', dur: 0.6, vol: 0.12 });
      await s.say('ELLIE', 'Eli?', { dur: 2 });
      await s.camTo(g.player.head.clone().add(V(0.4, 0.0, -0.2)), V(12.8, 0.95, 6.8), 2.5, 22);
      await s.say('ELIAS', 'Ellie...?', { dur: 1.8 });
    });
    // she runs
    const goal = V(22.5, 0, 8.6);
    let run = true;
    ellie.setPose(null);
    g.world!.onUpdate((dt) => {
      if (!run) return;
      const p = ellie.root.position;
      const target = p.x < 14.5 ? V(15.5, 0, 6.9) : goal;
      const d = target.clone().sub(p);
      const dist = d.length();
      if (dist < 0.3 && target === goal) {
        ellie.speed = 0;
        return;
      }
      d.normalize();
      const sp = g.player.pos.distanceTo(p) < 5 ? 4.0 : 2.2;
      p.addScaledVector(d, Math.min(dist, sp * dt));
      ellie.root.rotation.y = Math.atan2(d.x, d.z);
      ellie.speed = sp;
    });
    audio.door('creak', V(14, 1.2, 6.9));
    s.objective('BACKYARD', 'Follow her');
    await s.until(() => ellie.root.position.distanceTo(goal) < 0.5);
    await s.near(goal, 4.5);
    run = false;
    ellie.root.rotation.y = -Math.PI / 2;
    ellie.speed = 0;
    await s.cut(async () => {
      s.cam(V(18.5, 1.5, 6.5), V(22.5, 1.0, 8.6), 38);
      await s.wait(1.5);
      await s.say('ELLIE', 'You said you\'d come right back.', { dur: 3 });
      g.fx.burst('shards', V(22.5, 1, 8.6), undefined, 50);
      g.fx.burst('echo', V(22.5, 1, 8.6), undefined, 40);
      audio.stutterClicks(V(22.5, 1, 8.6), 0.15, 10);
      audio.reversedSwell(0.3, 1.2);
      ellie.root.visible = false;
      await s.wait(2);
      audio.piano('A3', 0, 0.07, 6);
      audio.piano('E4', 0.4, 0.05, 6);
      await s.camTo(V(17.5, 1.2, 7.5), g.player.head, 3, 44);
    });
    await s.thought('She was eight. She is still eight.', 3.6);
    await s.say('MAYA', 'Elias. Come in. Elias!', { radio: true });
    await s.say('ELIAS', 'I\'m here.', { radio: true });
    await s.say('VOSS', 'Bellwether Central Hospital, two blocks north. Maya found something you need to see.', { radio: true });
    await s.fade(1, 2);
  },
};
