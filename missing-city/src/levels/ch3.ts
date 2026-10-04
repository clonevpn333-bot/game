import * as THREE from 'three';
import type { Chapter } from './index';
import { V } from './common';
import * as K from '../world/Kit';
import { M, signMaterial } from '../render/Materials';
import { SKY } from '../render/Sky';
import { audio } from '../audio/AudioEngine';
import type { World } from '../world/World';
import type { Game, Script } from '../game/Game';
import type { LightSocket } from '../render/LightPool';
import { CIVILIANS } from '../actors/Characters';

const PY = -6; // platform level
const TRACK_X = 7;

/** A subway car (length along z). */
export function subwayCar(lit: boolean): { group: THREE.Group; doors: THREE.Object3D[]; interior: THREE.MeshBasicMaterial } {
  const L = M();
  const g = new THREE.Group();
  const body = new THREE.MeshPhysicalMaterial({ color: 0xa8adb2, roughness: 0.35, metalness: 0.85, clearcoat: 0.3 });
  const stripe = new THREE.MeshStandardMaterial({ color: 0xb01818, roughness: 0.5 });
  const interior = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.0, 0.95).multiplyScalar(lit ? 2.2 : 0.05) });
  const len = 16;
  const shell = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    g.add(o);
    return o;
  };
  shell(3.0, 0.3, len, 0, 0.55, 0, L.metalDark);
  shell(3.0, 0.25, len, 0, 3.55, 0, body);
  for (const sx of [-1.45, 1.45]) {
    shell(0.1, 0.9, len, sx, 1.15, 0, body);
    shell(0.1, 0.18, len, sx, 1.7, 0, stripe);
    shell(0.08, 1.1, len, sx * 0.99, 2.35, 0, L.glassDark);
    shell(0.1, 0.35, len, sx, 3.2, 0, body);
    for (let z = -len / 2 + 1; z < len / 2; z += 2.6) shell(0.12, 1.15, 0.15, sx, 2.35, z, body);
  }
  shell(3.0, 3.0, 0.1, 0, 2.05, len / 2, body);
  shell(3.0, 3.0, 0.1, 0, 2.05, -len / 2, body);
  // interior glow panel + seats
  shell(2.4, 0.06, len - 1, 0, 3.38, 0, interior);
  for (const sx of [-1.15, 1.15]) shell(0.5, 0.45, len - 2, sx, 0.95, 0, new THREE.MeshStandardMaterial({ color: 0x2a4a7a, roughness: 0.8 }));
  for (let z = -6; z <= 6; z += 3) shell(0.05, 2.6, 0.05, 0.6, 2.0, z, L.steel);
  // bogies
  for (const z of [-5.5, 5.5]) {
    shell(2.4, 0.5, 2.6, 0, 0.25, z, L.metalDark);
    for (const sx of [-0.8, 0.8]) for (const dz of [-0.8, 0.8]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.15, 14), L.steel);
      w.rotation.z = Math.PI / 2;
      w.position.set(sx, 0.35, z + dz);
      g.add(w);
    }
  }
  // sliding doors on the platform side (-x)
  const doors: THREE.Object3D[] = [];
  for (const z of [-4, 4]) {
    for (const s of [-1, 1]) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 0.75), body);
      d.position.set(-1.5, 1.85, z + s * 0.375);
      d.userData.base = d.position.z;
      d.userData.side = s;
      g.add(d);
      doors.push(d);
    }
  }
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), lit ? L.lightWarm : L.signalOff);
    hl.position.set(s * 0.9, 1.2, len / 2 + 0.06);
    g.add(hl);
  }
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  return { group: g, doors, interior };
}

function buildStation(W: World, g: Game): { sockets: LightSocket[]; train: ReturnType<typeof subwayCar>[]; ghostTrain: THREE.Group } {
  const L = M();
  const sockets: LightSocket[] = [];
  // concourse (y 0): x -16..16, z -10..24
  K.room(W, -16, -10, 16, 24, 5, L.subwayWall, L.subwayFloor, L.concreteDark, [{ wall: 'n', c: 0, w: 6, h: 4 }], { floorSurface: 'tile', noFloor: true });
  W.box([-16, -0.2, -10], [16, 0, 20], L.subwayFloor, { uv: 2, surface: 'tile', cast: false });
  W.box([-16, -0.2, 20], [-3.2, 0, 24], L.subwayFloor, { uv: 2, surface: 'tile', cast: false });
  W.box([3.2, -0.2, 20], [16, 0, 24], L.subwayFloor, { uv: 2, surface: 'tile', cast: false });
  W.indoor([-16, -12, -10], [16, 6, 120]);
  // entry stairs from the street (decor: come down from the north)
  W.ramp([0, 2.5, -18], [6, 5, 16], Math.PI, L.concrete, 16);
  W.box([-3.2, 0, -26], [-3, 6, -10], L.subwayWall, { uv: 2 });
  W.box([3, 0, -26], [3.2, 6, -10], L.subwayWall, { uv: 2 });
  W.box([-3.2, 5, -26], [3.2, 5.2, -10], L.concreteDark, { uv: 2 });
  // ticket booth + turnstiles (vaultable)
  W.boxC([-10, 1.4, 6], [5, 2.8, 3], L.woodPaint, 0);
  W.boxC([-10, 2.1, 7.52], [4.4, 1.2, 0.05], L.glass, 0, { collide: false });
  for (let x = -6; x <= 6; x += 1.5) {
    W.boxC([x, 0.5, 12], [0.35, 1.0, 1.1], L.steel, 0, { surface: 'metal' });
    if (x < 6) W.boxC([x + 0.75, 0.85, 12], [1.1, 0.06, 0.06], L.steel, 0, { collide: false });
  }
  W.box([-16, 0, 11.5], [-6.2, 1.0, 12.5], L.steel, {});
  W.box([6.2, 0, 11.5], [16, 1.0, 12.5], L.steel, {});
  W.quad(signMaterial('CIVIC CENTER', { bg: '#0b3a6a', fg: '#ffffff', w: 768, h: 128, intensity: 2, sub: 'TRAINS TO ALL DESTINATIONS ▼' }), { x: 0, y: 3.6, z: 23.85 }, 6, 1, Math.PI);
  // map + benches
  W.quad(signMaterial('BELLWETHER METRO', { bg: '#e8e4da', fg: '#1a2a4a', w: 512, h: 384, intensity: 1.1, sub: 'RED · BLUE · GOLD' }), { x: 15.85, y: 2, z: 4 }, 3, 2.2, -Math.PI / 2);
  // stairs down to the platform (z 18..30, descending 6m)
  W.ramp([0, -3, 26], [5, 6, 12], Math.PI, L.subwayFloor, 14);
  W.box([-3.2, PY, 20], [-2.5, 0, 32], L.subwayWall, { uv: 2 });
  W.box([2.5, PY, 20], [3.2, 0, 32], L.subwayWall, { uv: 2 });
  // hole in the concourse floor above the stairs (the room floor already covers; carve with a physics-free gap)
  // platform (x -5..4, z 30..120)
  W.box([-6, PY - 0.2, 20], [4, PY, 122], L.subwayFloor, { uv: 2, surface: 'tile' });
  W.box([3.5, PY, 30], [4, PY + 0.02, 122], L.paintYellow, { collide: false, cast: false });
  W.box([-6.2, PY, 20], [-6, PY + 6, 122], L.subwayWall, { uv: 2 });
  W.box([-6, PY + 5.2, 32], [12, PY + 5.4, 122], L.concreteDark, { uv: 3 });
  W.box([3.2, PY + 5.2, 20], [12, PY + 5.4, 32], L.concreteDark, { uv: 3 });
  W.box([-6, PY + 5.2, 20], [-3.2, PY + 5.4, 32], L.concreteDark, { uv: 3 });
  // trackbed
  W.box([4, PY - 1.4, 20], [12, PY - 1.2, 200], L.gravel, { uv: 2, surface: 'dirt' });
  W.box([4, PY - 1.2, 20], [4.1, PY, 122], L.concreteDark, { collide: true });
  for (const dx of [-0.75, 0.75]) W.box([TRACK_X + dx - 0.05, PY - 1.2, 20], [TRACK_X + dx + 0.05, PY - 1.05, 200], L.rail, { collide: false });
  for (let z = 22; z < 200; z += 0.8) W.box([TRACK_X - 1.1, PY - 1.22, z], [TRACK_X + 1.1, PY - 1.15, z + 0.25], L.railTie, { collide: false, cast: false });
  W.box([12, PY - 1.4, 20], [12.2, PY + 5.4, 200], L.tunnel, { uv: 3 });
  W.box([4, PY - 1.4, 199], [12, PY + 5.4, 200], L.black, {});
  W.box([4, PY - 1.4, 19.8], [12, PY + 5.4, 20], L.tunnel, {});
  // tunnel beyond the platform end (z 122..200) — low ceiling
  W.box([-6, PY - 0.2, 122], [4, PY + 5.4, 200], L.tunnel, { uv: 3 });
  W.box([4, PY + 4.6, 122], [12, PY + 5.4, 200], L.tunnel, { uv: 3, collide: false });
  // pillars + lamps + signs along the platform
  for (let z = 36; z < 120; z += 10) {
    W.boxC([2.0, PY + 2.6, z], [0.5, 5.2, 0.5], L.subwayWall, 0, { uv: 1 });
    W.quad(signMaterial('CIVIC CENTER', { bg: '#0b3a6a', fg: '#ffffff', w: 512, h: 96, intensity: 1.8 }), { x: -5.9, y: PY + 2.5, z: z + 5 }, 2.8, 0.5, Math.PI / 2);
    const s1 = W.light({ x: -1.5, y: PY + 5.0, z }, '#e6f4e8', { intensity: 12, distance: 11, glow: 0.7, pool: false });
    if (s1) sockets.push(s1);
    W.boxC([-1.5, PY + 5.08, z], [0.4, 0.06, 2.4], L.lightFluor, 0, { collide: false, cast: false });
    if (z % 20 === 6) K.bench(W, -4.8, z + 4, Math.PI / 2);
  }
  for (const [x, z] of [[-8, 0], [8, 0], [-8, 16], [8, 16], [0, 8]]) {
    K.ceilingLight(W, x, 4.98, z, { flicker: x === 8 && z === 0 ? 0.4 : 0, intensity: 9, distance: 10, long: true });
  }
  // emergency exit / maintenance door at the far end
  W.boxC([-5.9, PY + 1.2, 118], [0.1, 2.4, 1.4], L.paintRed, 0, { collide: false });
  W.light({ x: -5.4, y: PY + 2.8, z: 118 }, '#ff2a10', { intensity: 4, distance: 6, glow: 0.4, pool: false });
  W.quad(signMaterial('EXIT', { bg: '#0c3a10', fg: '#60ff70', w: 256, h: 96, intensity: 2.5 }), { x: -5.85, y: PY + 2.8, z: 118 }, 0.8, 0.3, Math.PI / 2);
  K.ladder(W, -5.6, 121.2, Math.PI / 2, 6.0, PY);
  W.box([-6, 0, 121], [-3, 0.2, 124], L.metal, { surface: 'metal' });
  // trains
  const train = [subwayCar(false), subwayCar(false), subwayCar(false)];
  train.forEach((c, i) => {
    c.group.position.set(TRACK_X, PY - 1.2, -60 - i * 16.4);
    W.add(c.group);
  });
  const ghostTrain = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const c = subwayCar(true);
    c.group.position.z = -i * 16.4;
    ghostTrain.add(c.group);
  }
  ghostTrain.position.set(TRACK_X, PY - 1.2, -80);
  W.add(ghostTrain, 'echo');
  W.physics.killY = -30;
  void g;
  return { sockets, train, ghostTrain };
}

let station: ReturnType<typeof buildStation> | null = null;

export const ch3: Chapter = {
  id: 'ch3', num: 'CHAPTER THREE', title: 'The Subway', sub: 'Civic Center Station',
  env: {
    sky: SKY.void, fog: '#06080a', fogDensity: 0.03, rain: 0, envKind: 'subway', exposure: 1.1,
    hemi: ['#4a5450', '#0a0a0a', 0.12], reverb: [3.4, 0.45], motes: 0.8, bloom: 0.6, floorY: -100,
    grade: { sat: 0.85, tint: '#eaf4ee', vignette: 1.0 },
  },
  chars: ['elias', 'maya', 'reyes', 'voss', 'remnant', 'civ_man', 'civ_woman', 'civ_office', 'civ_nurse', 'civ_kid'],
  echoUnlocked: true,
  seed: 3,
  build(W, g) {
    station = buildStation(W, g);
    W.spawn.set(0, 2.5, -20);
    W.spawnYaw = 0;
    W.onUpdate((dt) => {
      if (!station) return;
      // the ghost train runs through only while an Echo is active
      const gt = station.ghostTrain;
      if (g.echo.t > 0.05) {
        gt.position.z += dt * (gt.userData.speed ?? 0);
      }
    });
  },
  ambience() {
    audio.tunnelWind(0.22);
    audio.drone(0.08, 31, 0.5);
    audio.hum(V(0, 4, 8), 0.06, 60, 0.05);
  },
  shots: {
    platform(g) {
      g.player.teleport(V(-1, PY, 50), Math.PI);
      g.player.flashlightOn = true;
      g.player.camPitch = 0.02;
      g.player.snapCamera();
      g.player.camYaw = 0.25;
    },
    remnants(g) {
      g.player.teleport(V(-1, PY, 70), 0);
      g.combat.hasGun = true;
      g.player.flashlightOn = true;
      g.spawn('rusher', V(-0.5, PY, 82), Math.PI);
      g.spawn('watcher', V(-3, PY, 90), Math.PI);
      g.player.snapCamera();
    },
  },
  async run(s) {
    await descent(s);
    await trains(s);
    await firstContact(s);
  },
};

async function descent(s: Script): Promise<void> {
  const g = s.g;
  g.hud.setFade(1);
  s.control(false);
  void s.fade(0, 2);
  await s.card('CHAPTER THREE', 'THE SUBWAY', 'CIVIC CENTER STATION');
  s.control(true);
  s.objective('CIVIC CENTER STATION', 'Find the team');
  await s.zone([-16, -1, -8], [16, 5, 10]);
  const maya = g.npc('maya', V(-7, 0, 10), 0);
  const reyes = g.npc('reyes', V(-4.5, 0, 14), -Math.PI / 2);
  const voss = g.npc('voss', V(-9, 0, 13), 0.4);
  maya.lookTarget = () => g.player.head;
  await s.say('REYES', 'There he is. The human bridge.');
  await s.say('MAYA', 'Elias. What you did up there—', { dur: 1.6 });
  await s.say('ELIAS', 'I don\'t know how I did it.');
  await s.say('VOSS', 'Then we\'ll find out together. Carefully.');
  maya.lookTarget = null;
  audio.paChime(V(0, 4, 8));
  await s.wait(1.6);
  audio.paVoice(V(0, 4, 8), 5);
  await s.say('ANNOUNCEMENT', 'Attention passengers. Due to an incident at Civic Center, all service is suspended. Please remain calm and proceed to the street.', { radio: true, dur: 6 });
  await s.say('REYES', 'Eleven years late on that announcement.');
  for (const n of [maya, reyes, voss]) n.follow();
  reyes.followOffset.set(-1.2, 0, 3);
  s.objective('CIVIC CENTER STATION', 'Go down to the platform');
  g.hud.hints([['Space', 'Vault the turnstiles']]);
  await s.zone([-6, -8, 26], [4, -2, 40]);
  g.hud.hints(null);
  s.checkpoint(V(-1, PY, 34), 0);
  // the power fails
  await s.wait(0.5);
  for (const sk of station!.sockets) sk.flicker = 0.8;
  audio.rumble(3, 0.4);
  await s.wait(1.4);
  for (let i = station!.sockets.length - 1; i >= 0; i--) {
    station!.sockets[i].on = false;
    audio.click('switch', station!.sockets[i].pos);
    await s.wait(0.18);
  }
  g.lights.sockets.filter((x) => x.pos.y < -2).forEach((x) => (x.on = false));
  await s.say('MAYA', 'Power\'s going.');
  g.hud.hints([['F', 'Flashlight']]);
  s.objective('PLATFORM', 'Turn on your flashlight');
  await s.until(() => g.player.flashlightOn);
  g.hud.hints(null);
}

async function trains(s: Script): Promise<void> {
  const g = s.g;
  s.objective('PLATFORM', 'Walk the platform');
  await s.zone([-6, -8, 52], [4, -2, 64]);
  // the ghost train
  const gt = station!.ghostTrain;
  gt.position.z = -80;
  gt.userData.speed = 0;
  const pax: ReturnType<Game['ghost']>[] = [];
  await s.cut(async () => {
    s.cam(V(-3.5, PY + 1.6, 56), V(TRACK_X, PY + 1.5, 30), 46);
    g.echo.enter(12, true);
    audio.trainPass(V(TRACK_X, PY, 40), 6, 0.6);
    gt.userData.speed = 26;
    await s.wait(3.2);
    gt.userData.speed = 0;
    gt.position.z = 58 - 16;
    for (let i = 0; i < 10; i++) {
      const z = gt.position.z - 6 + (i % 5) * 3.2 - Math.floor(i / 5) * 16.4;
      const sit = i % 3 === 0;
      const gh = g.ghost(CIVILIANS[i % 5], [V(TRACK_X + (i % 2 ? 0.6 : -0.6), PY - 0.45 + (sit ? 0 : 0), z)], { clip: sit ? 'sit' : (i % 2 ? 'phone' : 'idle') });
      gh.actor.root.rotation.y = sit ? (i % 2 ? -Math.PI / 2 : Math.PI / 2) : Math.PI;
      pax.push(gh);
    }
    await s.camTo(V(-1.0, PY + 1.7, 50), V(TRACK_X, PY + 2, 46), 4, 40);
    await s.say('MAYA', 'It\'s full. It\'s completely full.', { dur: 2.4 });
    await s.camTo(V(1.8, PY + 1.6, 48), V(TRACK_X, PY + 1.8, 38), 4, 36);
  });
  await s.until(() => !g.echo.active);
  for (const p of pax) p.dispose();
  g.echo.ghosts = [];
  await s.say('REYES', 'Okay. Okay. Ghost train. Totally fine. Love that for us.');
  await s.wait(2);
  // a real train, with no power, arrives anyway
  const cars = station!.train;
  audio.trainPass(V(TRACK_X, PY, 20), 8, 0.9);
  s.shake(0.3);
  await s.say('VOSS', 'Something\'s coming.', { dur: 2.2 });
  let tz = -80;
  await new Promise<void>((res) => {
    const id = window.setInterval(() => {
      tz += 1.6 * Math.max(0.12, Math.min(1, (60 - tz) / 60)) * 1.6;
      cars.forEach((c, i) => (c.group.position.z = tz - i * 16.4));
      if (tz >= 58) {
        clearInterval(id);
        res();
      }
    }, 33);
  });
  audio.trainDoors(V(TRACK_X - 1.5, PY + 1, 58));
  let op = 0;
  g.world!.onUpdate((dt) => {
    op = Math.min(1, op + dt * 1.5);
    for (const c of cars) for (const d of c.doors) d.position.z = (d.userData.base as number) + (d.userData.side as number) * op * 0.7;
  });
  await s.say('MAYA', 'There\'s no power. How is it running?');
  await s.say('REYES', 'It\'s not. It\'s just... here. Doors open.');
  await s.say('VOSS', 'Nobody inside.');
  await s.wait(1);
}

async function firstContact(s: Script): Promise<void> {
  const g = s.g;
  const reyes = g.npcs.get('reyes')!;
  const voss = g.npcs.get('voss')!;
  const maya = g.npcs.get('maya')!;
  s.objective('PLATFORM', 'Continue toward the maintenance exit');
  await s.zone([-6, -8, 72], [4, -2, 84]);
  // first sighting: a figure at the far end
  const first = g.spawn('watcher', V(-1, PY, 104), Math.PI);
  first.actor.timeScale = 0;
  await s.cut(async () => {
    s.cam(V(-2.5, PY + 1.6, 78), V(-1, PY + 1.3, 104), 32);
    audio.stutterClicks(first.pos, 0.2, 14);
    await s.wait(1.4);
    await s.camTo(V(-2.2, PY + 1.6, 80), V(-1, PY + 1.5, 104), 3.5, 18);
    await s.say('REYES', 'Hey. Hey! Federal agents. Are you hurt?', { dur: 2.6 });
    audio.voice(first.headPos, { pitch: 200, vowels: 'aeao', dur: 1.4, vol: 0.25, distort: 0.6, stutter: 0.4 });
    await s.say('THE FIGURE', 'a-are you h-hurt— are you hurt— are y— ', { dur: 2.4 });
    audio.stinger('scare');
    first.actor.timeScale = 1;
  });
  reyes.hold();
  reyes.lookTarget = () => first.chest;
  void reyes.goto(V(-2.5, PY, 80));
  await s.say('REYES', 'Vale! Catch!', { dur: 1.2 });
  g.combat.hasGun = true;
  g.combat.mag = 12;
  g.combat.reserve = 36;
  audio.pickup();
  g.hud.toast('M9 Pistol', 'ACQUIRED');
  g.hud.hints([['RMB', 'Aim'], ['LMB', 'Fire'], ['R', 'Reload'], ['X', 'Dodge']]);
  reyes.shooter = true;
  void voss.goto(V(-4.5, PY, 70), true);
  void maya.goto(V(-4.8, PY, 72), true);
  s.objective('PLATFORM', 'Survive');
  // the watcher only moves when you are not looking at it
  await s.say('MAYA', 'It only moves when we look away!', { dur: 2 });
  await s.fight([
    { kind: 'rusher', pos: V(-1, PY, 112), yaw: Math.PI, delay: 1.5 },
    { kind: 'rusher', pos: V(1.5, PY, 116), yaw: Math.PI, delay: 2.5 },
  ]);
  if (!first.dead) await s.until(() => first.dead);
  g.hud.hints(null);
  s.checkpoint(V(-1, PY, 96), 0);
  await s.say('REYES', 'Everybody breathing?');
  await s.say('MAYA', 'What were they? They had faces. Under all that... they had faces.');
  await s.say('VOSS', 'Remnants.', { dur: 1.8 });
  await s.say('MAYA', 'You have a name for them too.');
  await s.say('VOSS', 'The drones saw them. We didn\'t know what they were. We still don\'t.');
  // crawler from the tunnel
  audio.stutterClicks(V(TRACK_X, PY, 130), 0.2, 20);
  await s.wait(1.5);
  await s.fight([
    { kind: 'crawler', pos: V(-2, PY, 128), yaw: Math.PI },
    { kind: 'crawler', pos: V(1, PY, 132), yaw: Math.PI, delay: 1.2 },
    { kind: 'rusher', pos: V(-1, PY, 134), yaw: Math.PI, delay: 2 },
  ]);
  reyes.shooter = false;
  reyes.lookTarget = null;
  for (const n of [maya, reyes, voss]) n.follow();
  s.checkpoint(V(-1, PY, 112), 0);
  s.objective('MAINTENANCE EXIT', 'Climb out at the end of the platform');
  await s.say('REYES', 'Exit ladder. End of the platform. Move.');
  await s.zone([-6, -1, 119], [-2, 3, 125]);
  await s.say('MAYA', 'Where does this come out?');
  await s.say('ELIAS', 'Maple Row. The east side.', { dur: 2 });
  await s.thought('Three blocks from home.', 2.6);
  await s.fade(1, 1.6);
}
