import * as THREE from 'three';
import type { Chapter } from './index';
import { V } from './common';
import * as K from '../world/Kit';
import { M, facadeMaterial, glowMaterial } from '../render/Materials';
import { SKY } from '../render/Sky';
import { audio } from '../audio/AudioEngine';
import type { World } from '../world/World';
import type { Game, Script } from '../game/Game';
import { Actor } from '../actors/Characters';
import { G } from '../render/Globals';

/** Floating chunk of city: a slab with a jagged rock underside. */
export function island(W: World, x0: number, z0: number, x1: number, z1: number, y: number, top: THREE.Material, depth = 6): void {
  const L = M();
  W.box([x0, y - 0.3, z0], [x1, y, z1], top, { uv: 3, surface: 'concrete' });
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  const w = (x1 - x0) / 2;
  const d = (z1 - z0) / 2;
  const g = new THREE.ConeGeometry(1, 1, 7, 3);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const n = Math.sin(pos.getX(i) * 9 + pos.getZ(i) * 7) * 0.12;
    pos.setX(i, pos.getX(i) * (1 + n));
    pos.setZ(i, pos.getZ(i) * (1 - n));
  }
  g.computeVertexNormals();
  W.geo(g, L.concreteDark, { x: cx, y: y - 0.3 - depth / 2, z: cz }, new THREE.Euler(Math.PI, 0, 0), new THREE.Vector3(w * 1.25, depth, d * 1.25), { uv: 'world', uvScale: 3 });
}

/** Upside-down building hanging from the sky. */
function hanging(W: World, x: number, z: number, w: number, d: number, top: number, h: number, seed: number): void {
  W.box([x - w / 2, top - h, z - d / 2], [x + w / 2, top, z + d / 2], facadeMaterial((['office', 'apartment', 'brick'] as const)[seed % 3], seed % 6, 2.4), { collide: false, uv: 22, cast: false });
}

/** Cheap far-crowd silhouette (instanced). */
function frozenCrowd(W: World, pts: THREE.Vector3[]): void {
  const parts: THREE.BufferGeometry[] = [];
  const body = new THREE.CapsuleGeometry(0.2, 0.9, 3, 8);
  body.translate(0, 0.85, 0);
  const head = new THREE.SphereGeometry(0.13, 8, 6);
  head.translate(0, 1.62, 0);
  parts.push(body, head);
  const merged = new THREE.BufferGeometry();
  const ps: number[] = [];
  const ns: number[] = [];
  for (const p of parts) {
    const ng = p.toNonIndexed();
    ps.push(...(ng.getAttribute('position').array as Float32Array));
    ns.push(...(ng.getAttribute('normal').array as Float32Array));
  }
  merged.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3));
  merged.setAttribute('normal', new THREE.Float32BufferAttribute(ns, 3));
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a80b0, roughness: 0.5, metalness: 0.1, emissive: new THREE.Color(0.18, 0.12, 0.35) });
  const im = new THREE.InstancedMesh(merged, mat, pts.length);
  const m = new THREE.Matrix4();
  pts.forEach((p, i) => {
    m.compose(p, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), i * 2.3), new THREE.Vector3(1, 0.9 + (i % 5) * 0.06, 1));
    im.setMatrixAt(i, m);
  });
  im.castShadow = false;
  W.add(im);
}

let loopCount = 0;

function buildOther(W: World, g: Game): void {
  const L = M();
  // A: arrival — a chunk of Orchard Street
  island(W, -8, -10, 8, 30, 0, L.asphalt, 10);
  W.box([-12, -0.3, -10], [-8, 0.15, 30], L.sidewalk, { uv: 2 });
  W.box([8, -0.3, -10], [12, 0.15, 30], L.sidewalk, { uv: 2 });
  K.streetLight(W, -9, 0, Math.PI / 2, { color: '#d8b0ff' });
  K.streetLight(W, 9, 16, -Math.PI / 2, { color: '#d8b0ff' });
  K.car(W, -3, 8, 0.3, K.CAR_COLORS[1]);
  K.car(W, 3, 20, Math.PI + 0.2, K.CAR_COLORS[0], { lights: true });
  K.building(W, -24, 4, -12, 26, 14, 'brick', 81, { base: 0 });
  // floating steps (debris) from A to B
  const steps = [V(0, 0.6, 34), V(1.5, 1.3, 38.5), V(-0.5, 2.0, 43), V(1, 2.6, 47.5), V(0, 3.2, 52)];
  steps.forEach((p, i) => {
    W.boxC([p.x, p.y - 0.25, p.z], [3.2, 0.5, 3.2], i % 2 ? L.concrete : L.asphalt, i * 0.4, { uv: 2 });
  });
  // B: frozen plaza, millions standing still
  island(W, -18, 56, 18, 96, 3.2, L.sidewalk, 12);
  const crowd: THREE.Vector3[] = [];
  for (let i = 0; i < 160; i++) {
    const x = -16 + (i * 7.3) % 32;
    const z = 58 + ((i * 13.7) % 36);
    if (Math.abs(x) < 2.4) continue;
    crowd.push(V(x, 3.2, z));
  }
  frozenCrowd(W, crowd);
  for (const x of [-17, 17]) for (let z = 60; z < 96; z += 12) W.light({ x, y: 7, z }, '#c8a8ff', { intensity: 14, distance: 16, glow: 0.8, cone: 2.4, poolY: 3.2 });
  // the road that bends into the sky (visual)
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 0.9;
    const r = 60;
    const y = 3 + Math.sin(a) * r;
    const pz = 110 + Math.sin(a) * 2;
    const g2 = new THREE.BoxGeometry(12, 0.4, 5);
    W.geo(g2, L.asphalt, { x: 40 + (1 - Math.cos(a)) * r * 0.2, y, z: pz + (1 - Math.cos(a)) * r }, new THREE.Euler(-a, 0, 0), 1, { uv: 'world', uvScale: 8 });
  }
  // C: repeating apartment corridor (z 100..124)
  K.room(W, -2.5, 100, 2.5, 124, 3, L.wallpaper, L.carpet, L.plasterWhite, [{ wall: 'n', c: 0, w: 1.6, h: 2.3 }, { wall: 's', c: 0, w: 1.6, h: 2.3 }], { y: 3.2, floorSurface: 'carpet' });
  W.indoor([-2.5, 3, 100], [2.5, 6.4, 124]);
  for (let z = 103; z < 122; z += 4) {
    for (const sx of [-2.38, 2.38]) W.boxC([sx, 4.3, z], [0.1, 2.2, 1.0], L.wood, 0, { collide: false });
    K.ceilingLight(W, 0, 6.18, z, { color: '#ffe0b0', intensity: 5, distance: 6, flicker: z === 115 ? 0.6 : 0.05 });
  }
  W.box([-6, -0.3 + 3.2, 96], [6, 3.2, 100], L.sidewalk, { uv: 2 });
  // the "real" exit only exists in an Echo: a side door at z 118 (west)
  W.box([-2.5, 3.2, 117.5], [-2.3, 5.4, 118.7], L.black, { collide: false, layer: 'echo' });
  W.box([-2.6, 3.2, 117.4], [-2.2, 3.22, 118.8], L.lightWarm, { collide: false, layer: 'echo' });
  W.physics.add({ cx: -2.4, cy: 4.3, cz: 118.1, hx: 0.15, hy: 1.1, hz: 0.6, layer: 'present' });
  // D: beyond the hidden door — Maya's island (x -40..-4)
  W.box([-30, 3.2 - 0.3, 114], [-2.5, 3.2, 122], L.concrete, { uv: 2 });
  island(W, -48, 100, -26, 136, 3.2, L.sidewalk, 10);
  for (const [x, z] of [[-44, 104], [-30, 132]]) W.light({ x, y: 8, z }, '#d8b8ff', { intensity: 16, distance: 18, glow: 0.8, cone: 2.4, poolY: 3.2 });
  // overhead: upside-down city
  for (let i = 0; i < 26; i++) {
    const x = -80 + (i * 37) % 160;
    const z = -20 + (i * 53) % 180;
    hanging(W, x, z, 12 + (i % 4) * 5, 12 + (i % 3) * 6, 90 + (i % 5) * 10, 30 + (i % 7) * 10, i);
  }
  // distant floating chunks
  for (let i = 0; i < 18; i++) {
    const a = i * 0.7;
    const r = 90 + (i % 5) * 30;
    island(W, Math.cos(a) * r - 8, Math.sin(a) * r + 60 - 8, Math.cos(a) * r + 8, Math.sin(a) * r + 60 + 8, -10 + (i % 6) * 9, L.asphalt, 8);
  }
  // shimmering motes of light
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMaterial('#d0b0ff', 1.0, 'mote'));
    m.position.set(-40 + (i * 17) % 80, 6 + (i % 7) * 4, (i * 29) % 140);
    m.scale.setScalar(0.4 + (i % 3) * 0.3);
    m.userData.billboard = true;
    W.add(m);
  }
  W.physics.killY = -25;
  W.physics.floorY = -1000;
  void g;
}

export const ch8: Chapter = {
  id: 'ch8', num: 'CHAPTER EIGHT', title: 'The Other Bellwether', sub: 'Where the city went',
  env: {
    sky: SKY.other, fog: '#1c0e33', fogDensity: 0.009, rain: 0, envKind: 'other', exposure: 1.2,
    hemi: ['#b090ff', '#20103a', 0.45], moon: { color: '#e0c8ff', intensity: 0.6, dir: [0.2, 1, 0.5] }, reverb: [6, 0.55], motes: 1.0, bloom: 0.8,
    floorY: -1000, grade: { sat: 1.05, tint: '#f4e8ff', vignette: 1.0 },
  },
  chars: ['elias', 'maya', 'reyes', 'remnant', 'civ_man', 'civ_woman', 'civ_office', 'civ_kid', 'civ_nurse'],
  echoUnlocked: true,
  gun: true,
  seed: 8,
  build(W, g) {
    buildOther(W, g);
    loopCount = 0;
    W.spawn.set(0, 0, -6);
    W.spawnYaw = 0;
    // frozen people near the path, caught mid-step, looking toward the centre
    const near: [number, number, number, string][] = [[-3.2, 62, 0.2, 'civ_man'], [3.4, 66, -0.4, 'civ_woman'], [-3.6, 72, 0.1, 'civ_kid'], [3.0, 78, 0.5, 'civ_office'], [-3.0, 86, -0.2, 'civ_nurse']];
    for (const [x, z, yaw, n] of near) {
      const a = new Actor(n as never, 'frozen');
      a.root.position.set(x, 3.2, z);
      a.root.rotation.y = yaw;
      a.setPose(n === 'civ_kid' ? 'look_up' : 'idle', 0);
      a.update(0.6);
      a.timeScale = 0;
      W.add(a.root);
    }
    W.onUpdate((_dt, t) => {
      G.uWarp.value = 0.12 + Math.sin(t * 0.3) * 0.05;
    });
  },
  ambience() {
    audio.drone(0.1, 32.7, 1.2);
    audio.wind(0.18);
    audio.reversedSwell(0.2, 4);
  },
  shots: {
    arrival(g) {
      g.player.teleport(V(0, 0, 6), 0);
      g.player.camPitch = 0.25;
      g.player.snapCamera();
    },
    crowd(g) {
      g.player.teleport(V(0, 3.2, 62), 0);
      g.player.camPitch = 0.05;
      g.player.snapCamera();
    },
  },
  async run(s) {
    await arrival(s);
    await corridor(s);
    await maya(s);
  },
};

async function arrival(s: Script): Promise<void> {
  const g = s.g;
  g.hud.setFade(1);
  s.control(false);
  await s.wait(1);
  void s.fade(0, 3, false);
  await s.card('CHAPTER EIGHT', 'THE OTHER BELLWETHER', 'WHERE THE CITY WENT');
  s.control(true);
  await s.thought('Orchard Street. Floating in nothing.', 3);
  await s.say('ELIAS', 'Maya? Reyes? Voss, do you copy?', { radio: true });
  audio.voice(undefined, { pitch: 200, vowels: 'aoe', dur: 1.2, vol: 0.06, distort: 0.8, stutter: 0.5, bus: 'ui' });
  await s.say('MAYA', '...lias... ...on the other side of... ...people...', { radio: true });
  s.objective('???', 'Find Maya');
  await s.zone([-18, 2, 56], [18, 8, 64]);
  s.checkpoint(V(0, 3.2, 58), 0);
  await s.thought('People. Thousands of them. Standing perfectly still.', 3);
  await s.thought('They\'re not frozen like statues. Their chests move. Once a minute. Maybe less.', 4.5);
}

async function corridor(s: Script): Promise<void> {
  const g = s.g;
  s.objective('???', 'Go through the apartments');
  await s.zone([-2.4, 2.5, 100], [2.4, 6, 103]);
  s.checkpoint(V(0, 3.2, 101.5), 0);
  // the corridor repeats: leaving through the far door puts you back at the start
  const t = g.world!.trigger([-1, 2.5, 123.2], [1, 6, 125], () => {
    loopCount++;
    g.player.teleport(V(g.player.pos.x, 3.2, 101.2), g.player.yaw);
    audio.reversedSwell(0.25, 0.6);
    g.engine.post.uGlitch.value = 1;
    window.setTimeout(() => (g.engine.post.uGlitch.value = 0), 200);
    if (loopCount === 1) g.hud.showSub('', 'Apartment 4C. Again.', false, 3);
    if (loopCount === 2) g.hud.showSub('', 'The same coat on the same hook. The same flickering light.', false, 4);
    if (loopCount >= 3) {
      g.hud.showSub('', 'It\'s eleven years ago somewhere in here. Look the way it was.', false, 4);
      g.hud.hints([['Q', 'Enter Echo']]);
    }
    t.fired = false;
  }, { once: false });
  await s.zone([-30, 2.5, 114], [-6, 7, 122]);
  g.hud.hints(null);
  t.enabled = false;
  s.checkpoint(V(-10, 3.2, 118), -Math.PI / 2);
}

async function maya(s: Script): Promise<void> {
  const g = s.g;
  const maya = g.npc('maya', V(-38, 3.2, 118), Math.PI / 2);
  maya.actor.setPose('kneel', 0);
  s.objective('???', 'Reach Maya');
  await s.near(maya.pos, 5);
  await s.cut(async () => {
    s.cam(V(-34, 4.8, 121), V(-38, 4.0, 118), 44);
    maya.lookTarget = () => g.player.head;
    await s.say('MAYA', 'Elias. Oh thank God. Thank God.', { dur: 2.4 });
    maya.actor.setPose(null);
    await s.say('MAYA', 'I\'ve been scanning them. The people out there. They\'re alive. Brain activity, slow, but there. Like the moment before you wake up.');
    await s.say('ELIAS', 'And the Remnants?');
    await s.camTo(V(-36, 4.6, 123), V(-38.5, 4.6, 118), 4, 36);
    await s.say('MAYA', 'Same patterns. Same people. Only... split. Part of them got out of the moment and couldn\'t find the way back.', { dur: 5 });
    await s.say('MAYA', 'Every Remnant we\'ve killed was somebody\'s mother. Somebody\'s kid.', { dur: 4 });
    await s.wait(1);
    await s.say('ELIAS', 'Where\'s Reyes?', { dur: 2 });
    await s.say('MAYA', 'He was right behind me. And then he wasn\'t. I keep hearing him, Elias. On every channel.', { dur: 4 });
  });
  maya.follow();
  // they found us
  audio.stutterClicks(V(-40, 4, 130), 0.2, 20);
  s.objective('???', 'Survive');
  s.checkpoint(V(-36, 3.2, 118), 0);
  await s.fight([
    { kind: 'splitter', pos: V(-44, 3.2, 130), yaw: 0 },
    { kind: 'rusher', pos: V(-30, 3.2, 132), yaw: Math.PI, delay: 1.2 },
    { kind: 'splitter', pos: V(-46, 3.2, 106), yaw: 0, delay: 2.5 },
    { kind: 'disguised', pos: V(-28, 3.2, 104), yaw: Math.PI, delay: 0.5 },
  ]);
  audio.voice(undefined, { pitch: 120, vowels: 'eaeo', dur: 1.6, vol: 0.1, distort: 0.7, stutter: 0.4, bus: 'ui' });
  await s.say('REYES', 'Vale— Chen— can anybody— I can see you, I can SEE you—', { radio: true, dur: 3 });
  await s.say('MAYA', 'Daniel!', { dur: 1.4 });
  await s.thought('His voice is coming from inside an Echo.', 3);
  await s.fade(1, 2);
}
