import * as THREE from 'three';
import type { Chapter } from './index';
import { ENV, V } from './common';
import * as K from '../world/Kit';
import { M, signMaterial, texturedMaterial, coneMaterial } from '../render/Materials';
import { missingPoster, documentTex } from '../render/Textures';
import { audio } from '../audio/AudioEngine';
import type { World } from '../world/World';
import type { Game, Script } from '../game/Game';
import { CIVILIANS } from '../actors/Characters';

const LOBBY = { x0: 54, x1: 70, z0: -24, z1: -10 };

function buildDowntown(W: World, g: Game): void {
  const L = M();
  // Ninth Avenue runs east (x)
  K.street(W, -10, -6, 130, 6, { axis: 'x', crosswalks: [40, 96] });
  W.box([-10, 0, -30], [130, 0.15, -10], L.sidewalk, { uv: 2, cast: false });
  W.box([-10, 0, 10], [130, 0.15, 30], L.sidewalk, { uv: 2, cast: false });
  // south side
  K.building(W, -10, 10, 18, 34, 28, 'office', 21, { store: { side: 'n', sign: 'CAFE ROMA', color: '#ffb060', lit: true } });
  K.building(W, 20, 10, 44, 30, 18, 'brick', 22, { store: { side: 'n', sign: 'RECORD EXCHANGE', color: '#ff50a0', lit: true } });
  K.building(W, 46, 10, 80, 36, 46, 'office', 23, { store: { side: 'n', sign: 'BELLWETHER SAVINGS', color: '#9fd0ff' } });
  K.building(W, 82, 10, 110, 30, 24, 'apartment', 24, { store: { side: 'n', sign: 'DRY CLEANING', color: '#80ffd0', lit: true } });
  K.building(W, 112, 10, 140, 40, 60, 'office', 25);
  // north side
  K.building(W, -10, -36, 20, -10, 22, 'apartment', 26, { store: { side: 's', sign: 'DELI', color: '#ffd070', lit: true } });
  K.building(W, 22, -34, 50, -10, 30, 'brick', 27, { store: { side: 's', sign: 'GALLERY 9', color: '#ffffff' } });
  // Halvorsen Apartments (lobby interior on the ground floor)
  K.building(W, 50, -34, 76, -10, 26, 'apartment', 28, { base: 4.6 });
  W.box([50, 0, -34], [54, 4.6, -10], L.brick, { uv: 3 });
  W.box([70, 0, -34], [76, 4.6, -24], L.brick, { uv: 3 });
  W.box([70, 0, -24], [76, 4.6, -10], L.brick, { uv: 3 });
  W.box([54, 0, -34], [60, 4.6, -24], L.brick, { uv: 3 });
  K.building(W, 78, -34, 110, -10, 36, 'office', 29, { store: { side: 's', sign: 'OPTICIAN', color: '#a0e0ff' } });
  K.skyline(W, 60, -260, 120, 420, 180, 7, 200);
  K.skyline(W, 60, 220, 120, 300, 80, 8, 120);
  // lobby interior
  K.room(W, LOBBY.x0, LOBBY.z0, LOBBY.x1, LOBBY.z1, 4.4, L.wallpaper, L.carpet, L.plasterWhite, [{ wall: 's', c: 62, w: 2.2, h: 2.7 }, { wall: 'n', c: 66, w: 1.4, h: 2.3 }], { floorSurface: 'carpet' });
  W.indoor([LOBBY.x0, 0, LOBBY.z0], [LOBBY.x1, 4.6, LOBBY.z1]);
  W.quad(signMaterial('HALVORSEN APARTMENTS', { bg: '#1a1410', fg: '#e8c88a', w: 768, h: 96, intensity: 1.6 }), { x: 62, y: 3.3, z: -9.86 }, 4.2, 0.55, 0);
  W.light({ x: 62, y: 3.0, z: -8.6 }, '#ffc890', { intensity: 7, distance: 8, glow: 0.5 });
  for (const [x, z] of [[58, -14], [66, -14], [58, -20], [66, -20]]) K.ceilingLight(W, x, 4.38, z, { color: '#ffe2b0', intensity: 7, distance: 8 });
  // mailboxes
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) W.boxC([54.2, 1.1 + j * 0.42, -14 - i * 0.55], [0.3, 0.38, 0.5], L.steel, 0, { collide: false });
  W.boxC([54.25, 1.5, -15], [0.4, 1.4, 2.4], L.metalDark, 0);
  K.sofa(W, 57.2, -11.3, Math.PI, L.fabricRed);
  K.table(W, 57.2, -12.6, 0, 1.0, 0.5);
  // elevator (still running)
  W.boxC([60, 1.3, -23.85], [1.6, 2.6, 0.12], L.steel, 0);
  W.boxC([60, 2.85, -23.8], [0.5, 0.18, 0.08], L.black, 0, { collide: false });
  W.light({ x: 60, y: 2.85, z: -23.6 }, '#ffb040', { noLight: true, glow: 0.25, pool: false });
  // security door + keypad on the north wall
  const doorPivot = new THREE.Group();
  doorPivot.position.set(65.35, 0, -23.8);
  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(1.3, 2.3, 0.1), L.metalDark);
  doorMesh.position.set(0.65, 1.15, 0);
  doorMesh.castShadow = true;
  doorPivot.add(doorMesh);
  W.add(doorPivot);
  W.named.set('secdoor', doorPivot);
  W.physics.add({ cx: 66, cy: 1.15, cz: -23.8, hx: 0.65, hy: 1.15, hz: 0.08, tag: 'secdoor' });
  W.boxC([67.1, 1.35, -23.82], [0.16, 0.24, 0.06], L.plasticDark, 0, { collide: false });
  W.light({ x: 67.1, y: 1.42, z: -23.7 }, '#ff2010', { noLight: true, glow: 0.12, pool: false });
  K.poster(W, missingPoster('Mrs. Halvorsen\'s cat', '6', 3), 69.9, 1.6, -15, -Math.PI / 2, 0.5, 0.66);
  // ---------------------------------------------------------------- alley (z -24 .. -70)
  W.box([60, -0.2, -72], [72, 0, -24], L.concrete, { uv: 3, surface: 'wet' });
  W.box([58, 0, -72], [60, 14, -34], L.brickDark, { uv: 3 });
  W.box([72, 0, -72], [74, 14, -34], L.brickDark, { uv: 3 });
  W.box([72, 0, -34], [76, 14, -24], L.brickDark, { uv: 3 });
  W.box([56, 0, -34], [60, 14, -24], L.brickDark, { uv: 3 });
  // dumpster to vault
  W.boxC([66, 0.6, -36], [6, 1.2, 1.6], L.paintRed, 0, { surface: 'metal' });
  W.boxC([66, 1.23, -36], [6.1, 0.08, 1.7], L.metalDark, 0, { collide: false });
  // wall to mantle
  W.box([60, 0, -48.4], [72, 2.0, -47.6], L.concreteDark, { uv: 2 });
  W.box([60, 2.0, -48.4], [72, 2.15, -47.6], L.trimLight, { collide: false });
  K.crateProp(W, 61.5, 0, -45.5, 1.0, 0.3);
  // fire escape ladder to the footbridge deck (y=5)
  W.box([60, 4.8, -70], [72, 5.0, -64], L.metal, { surface: 'metal' });
  W.box([60, 5.0, -64.1], [72, 6.0, -64.0], L.metalDark, { collide: true, noVault: true });
  K.ladder(W, 66, -63.7, Math.PI, 5.0, 0);
  for (const z of [-40, -56, -66]) W.light({ x: 59.6, y: 4.2, z }, '#ffd0a0', { intensity: 7, distance: 10, glow: 0.4, flicker: z === -56 ? 0.5 : 0 });
  W.quad(texturedMaterial(documentTex(['NO DUMPING', 'VIOLATORS PROSECUTED'], 'nodump'), 0.9), { x: 71.85, y: 2.2, z: -40 }, 0.8, 1.0, -Math.PI / 2);
  // ---------------------------------------------------------------- rail cut + broken footbridge
  W.box([30, -9, -102], [110, -8.8, -70], L.gravel, { uv: 2, surface: 'dirt' });
  for (const x of [56, 76]) for (let i = 0; i < 2; i++) W.box([x - 30 + i * 1.5, -8.8, -102], [x - 29.9 + i * 1.5, -8.6, -70], L.rail, { collide: false });
  W.box([30, -9, -70.2], [110, 5, -70], L.concreteDark, { uv: 3 });
  W.box([30, -9, -102], [110, 5, -101.8], L.concreteDark, { uv: 3 });
  // bridge: intact ends, missing middle (exists in the Echo)
  const deck = L.concrete;
  W.box([63, 4.75, -78], [69, 5.0, -70], deck, { uv: 2 });
  W.box([63, 4.75, -102], [69, 5.0, -92], deck, { uv: 2 });
  W.box([63, 4.75, -92], [69, 5.0, -78], deck, { uv: 2, layer: 'echo' });
  for (const z0 of [-78, -92]) {
    // jagged sheared edges
    for (let i = 0; i < 6; i++) W.boxC([63.5 + i, 4.7 - (i % 2) * 0.15, z0 + (z0 < -80 ? 0.2 : -0.2)], [0.9, 0.4, 0.6], L.concreteDark, i * 0.3, { collide: false });
  }
  for (const side of [63, 69]) {
    W.box([side - 0.05, 5, -78], [side + 0.05, 6.1, -70], L.metalDark, { noVault: true });
    W.box([side - 0.05, 5, -102], [side + 0.05, 6.1, -92], L.metalDark, { noVault: true });
    W.box([side - 0.05, 5, -92], [side + 0.05, 6.1, -78], L.metalDark, { noVault: true, layer: 'echo' });
  }
  W.light({ x: 66, y: 7.5, z: -74 }, '#ffcf90', { intensity: 12, distance: 14, cone: 2.2, glow: 0.8, poolY: 5 });
  W.light({ x: 66, y: 7.5, z: -96 }, '#ffcf90', { intensity: 12, distance: 14, cone: 2.2, glow: 0.8, poolY: 5 });
  W.light({ x: 66, y: 7.5, z: -85 }, '#9fe8ff', { intensity: 14, distance: 14, cone: 2.2, glow: 0.8, poolY: 5, layer: 'echo' });
  // ---------------------------------------------------------------- terrace + Grand Boulevard below
  W.box([40, 4.75, -130], [92, 5.0, -102], L.sidewalk, { uv: 2 });
  W.box([40, 5.0, -130.2], [92, 6.1, -130], L.metalDark, { noVault: true });
  W.box([40, 5.0, -130], [40.2, 6.1, -102], L.metalDark, { noVault: true });
  W.box([92, 5.0, -130], [92.2, 6.1, -102], L.metalDark, { noVault: true });
  W.box([40, -0.2, -330], [92, 0, -130], L.asphalt, { uv: 8, surface: 'wet' });
  W.box([40, 0, -130], [92, 4.75, -129.8], L.concreteDark, { uv: 3 });
  // terrace ends at a stairwell down to the subway concourse
  W.box([82, 0, -128], [90, 4.75, -104], L.concreteDark, { uv: 3 });
  W.quad(signMaterial('CIVIC CENTER STATION', { bg: '#0a3a6a', fg: '#ffffff', w: 768, h: 128, intensity: 2.4, sub: '◉ RED LINE · BLUE LINE' }), { x: 86, y: 7.2, z: -112 }, 5.2, 0.9, Math.PI);
  W.boxC([86, 6.2, -112.2], [5.6, 2.4, 0.2], L.metalDark, 0, { collide: false });
  W.light({ x: 86, y: 6.8, z: -111.2 }, '#80c0ff', { intensity: 10, distance: 10, glow: 0.6, poolY: 5 });
  for (let z = -140; z > -320; z -= 22) {
    K.streetLight(W, 46, z, Math.PI / 2);
    K.streetLight(W, 86, z - 11, -Math.PI / 2);
  }
  for (let z = -140; z > -330; z -= 34) {
    K.building(W, 6, z - 30, 38, z, 30 + ((z * 7) % 30), (['office', 'apartment', 'brick'] as const)[Math.abs(z) % 3], 30 + Math.abs(z));
    K.building(W, 94, z - 30, 126, z, 26 + ((z * 11) % 34), (['office', 'concrete', 'apartment'] as const)[Math.abs(z) % 3], 60 + Math.abs(z));
  }
  // the Civic Center dome at the end of the boulevard: a column of pale light
  const dome = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), L.concrete);
  dome.position.set(66, 18, -420);
  W.add(dome);
  W.boxC([66, 9, -420], [90, 18, 90], L.concrete, 0, { collide: false });
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(6, 14, 400, 24, 1, true), coneMaterial('#c9b8ff', 0.25));
  pillar.position.set(66, 200, -420);
  pillar.rotation.x = Math.PI;
  W.add(pillar, 'echo');
  // street furniture along Ninth
  for (let x = -6; x < 128; x += 15) {
    K.streetLight(W, x, -8.4, 0, { flicker: x === 54 ? 0.6 : 0 });
    K.streetLight(W, x + 7, 8.4, Math.PI);
  }
  K.trafficLight(W, 38, -7.6, 0, 3);
  K.trafficLight(W, 98, 7.6, Math.PI, 9);
  K.car(W, 12, -3, Math.PI / 2, K.CAR_COLORS[3]);
  K.car(W, 26, 3, -Math.PI / 2, K.CAR_COLORS[1], { kind: 'van', lights: true });
  K.car(W, 44, -2.6, Math.PI / 2 + 0.3, K.CAR_COLORS[0], { lights: true });
  K.car(W, 78, 3.1, -Math.PI / 2, K.CAR_COLORS[6], { kind: 'suv' });
  K.car(W, 104, -3, Math.PI / 2, K.CAR_COLORS[2], { kind: 'hatch' });
  K.phoneBooth(W, 30, -8.6, 0);
  K.bench(W, 18, 8.6, Math.PI);
  K.trashCan(W, 34, -8.3);
  K.hydrant(W, 70, 8.3);
  K.neon(W, 21.5, 5, 9.9, Math.PI, 'VINYL', '#ff50a0', 2.2, 0.3);
  K.billboard(W, 112, 24, -8, 0, 'MERIDIAN TOWER', 'NOW LEASING · 88 FLOORS', '#7fd8ff', 0.2);
  // bounds
  W.physics.add({ cx: -10, cy: 3, cz: 0, hx: 0.5, hy: 3, hz: 10 });
  W.physics.add({ cx: 130, cy: 3, cz: 0, hx: 0.5, hy: 3, hz: 10 });
  W.box([-10, 0, -10.6], [50, 5, -10.1], L.black, { collide: true, cast: false });
  W.box([76, 0, -10.6], [130, 5, -10.1], L.black, { collide: true, cast: false });
  W.box([-10, 0, 10.1], [130, 5, 10.6], L.black, { collide: true, cast: false });
  W.box([50, 0, -10.6], [61, 5, -10.1], L.black, { collide: true, cast: false });
  W.box([63, 0, -10.6], [76, 5, -10.1], L.black, { collide: true, cast: false });
  W.physics.killY = -6;
  void g;
}

export const ch2: Chapter = {
  id: 'ch2', num: 'CHAPTER TWO', title: 'Empty Streets', sub: 'Downtown Bellwether',
  env: { ...ENV.stormCity, fogDensity: 0.0095 },
  chars: ['elias', 'maya', 'reyes', 'voss', 'ellie', 'civ_man', 'civ_woman', 'civ_office', 'civ_kid', 'civ_nurse'],
  seed: 2,
  build(W, g) {
    buildDowntown(W, g);
    W.spawn.set(0, 0.15, 0);
    W.spawnYaw = Math.PI / 2;
  },
  ambience() {
    audio.setRain(0.8, false);
    audio.drone(0.05, 34, 0.35);
    audio.wind(0.14);
    audio.crossingChirp(V(38, 1, -7), 0.07);
    audio.hum(V(62, 4, -15), 0.05, 60, 0.03);
  },
  shots: {
    avenue(g) {
      g.player.teleport(V(20, 0.15, -1), Math.PI / 2);
      g.player.camPitch = 0.04;
      g.npc('voss', V(22, 0.15, 2), Math.PI / 2);
      g.player.snapCamera();
    },
    bridge(g) {
      g.player.teleport(V(66, 5, -72), Math.PI);
      g.player.camPitch = -0.1;
      g.echo.unlocked = true;
      g.echo.enter(30, true);
      g.player.snapCamera();
    },
    vista(g) {
      g.player.teleport(V(66, 5, -126), Math.PI);
      g.player.camPitch = -0.12;
      g.echo.enter(30, true);
      for (let i = 0; i < 12; i++) g.ghost(CIVILIANS[i % 5], [V(48 + (i % 6) * 6, 0, -150 - i * 3), V(48 + (i % 6) * 6, 0, -320)], { loop: false, speed: 1.2 });
      g.player.snapCamera();
    },
  },
  async run(s) {
    const g = s.g;
    g.hud.setFade(1);
    const maya = g.npc('maya', V(-2, 0.15, 2), Math.PI / 2);
    const reyes = g.npc('reyes', V(3, 0.15, -2), Math.PI / 2);
    const voss = g.npc('voss', V(-3, 0.15, -2.4), Math.PI / 2);
    s.control(false);
    void s.fade(0, 2);
    await s.card('CHAPTER TWO', 'EMPTY STREETS', 'DOWNTOWN BELLWETHER');
    s.control(true);
    reyes.follow(V(-1.4, 0, 4));
    maya.follow(V(-1.8, 0, -1.4));
    voss.follow(V(1.8, 0, -1.6));
    s.objective('NINTH AVENUE', 'Head downtown');
    await s.say('MAYA', 'Every door unlocked. Every window lit. It\'s like the whole city stepped out for a minute.');
    await s.say('REYES', 'Two point three million people don\'t step out, doc.');
    // the phone
    await s.zone([18, -1, -10], [40, 4, 10]);
    const ring = audio.phoneRing(V(30, 1.4, -8.6), 0.4);
    await s.say('REYES', '...Is that a phone?');
    await s.say('VOSS', 'Leave it.');
    s.objective('NINTH AVENUE', 'Answer the phone');
    await s.use('phone', V(30, 1.4, -8.4), 'Answer the phone', { radius: 2.2 });
    ring?.stop(0.05);
    s.control(false);
    audio.click('switch');
    await s.wait(0.6);
    audio.voice(V(30, 1.4, -8.6), { pitch: 170, vowels: 'aeioeua', dur: 1.6, vol: 0.12, distort: 0.7, stutter: 0.35 });
    await s.say('VOICE', '...everyone\'s walking... walking to the center... the hum, can\'t you hear the hum...', { radio: true });
    audio.voice(V(30, 1.4, -8.6), { pitch: 320, vowels: 'eie', dur: 1.2, vol: 0.1, distort: 0.5, stutter: 0.4 });
    await s.say('VOICE', 'Eli? Eli, where are you? You said you\'d come back—', { radio: true });
    s.control(true);
    await s.say('ELIAS', '...Ellie?');
    await s.say('MAYA', 'Elias? Who was it?');
    await s.say('ELIAS', 'Nobody. Static.');
    await s.say('VOSS', 'Then let\'s keep moving.');
    s.checkpoint(V(40, 0.15, 0), Math.PI / 2);
    // Halvorsen lobby
    s.objective('HALVORSEN APARTMENTS', 'Cut through the Halvorsen building');
    await s.zone([56, -1, -12], [68, 4, -10.2]);
    audio.elevatorDing(V(60, 1.5, -23.5));
    await s.say('REYES', 'Elevator\'s still running. Nobody\'s pressed a button in eleven years and it\'s still running.');
    void voss.goto(V(64.5, 0, -21));
    void maya.goto(V(57.5, 0, -18));
    void reyes.goto(V(61, 0, -13));
    await s.use('diary', V(57.2, 0.85, -12.6), 'Read the notebook');
    audio.paper();
    await g.hud.doc('NOTEBOOK — APT 3C', 'Oct 9 — Same dream again. The stairs that go down forever. A hum under everything.\n\nOct 11 — Dana says she has it too. The whole building does. Mr. Kowalski swears he saw his late wife in the laundry room.\n\nOct 13 — Lost two hours today. Found myself standing at the window facing downtown. My feet were cold. I had been there a long time.\n\nOct 14 — It is so loud tonight. Everyone is getting up. I think we\'re supposed to go.');
    await s.say('MAYA', 'Mass hysteria, maybe. Or something in the water.');
    await s.say('VOSS', 'Or something under the city.', { dur: 2.5 });
    await s.say('MAYA', 'What does that mean?');
    await s.say('VOSS', 'The back exit. We need a way to the boulevard.');
    // the locked door
    s.objective('HALVORSEN APARTMENTS', 'Get through the security door');
    await s.use('keypad-first', V(67.1, 1.35, -23.4), 'Security keypad');
    await s.say('REYES', 'Keypad. Four digits. Ten thousand combinations, and nobody brought a crowbar.');
    // Ellie appears — touching the Echo pulls Elias in
    const ellie = g.ghost('ellie', [V(66, 0, -14)], { clip: 'idle', always: true });
    ellie.actor.root.rotation.y = Math.PI;
    audio.reversedSwell(0.35, 2.5);
    await s.cut(async () => {
      s.cam(V(64.4, 1.5, -21.2), V(66, 1.0, -14), 42);
      await s.wait(1.2);
      g.hud.showSub('', '"Eli. Come see."', false, 2.4);
      audio.ellieTheme(0.05, 1.1);
      await s.camTo(V(65.2, 1.3, -18.8), V(66, 1.0, -14.2), 3.5, 36);
    });
    s.objective('HALVORSEN APARTMENTS', 'Follow her');
    await s.near(V(66, 0, -14), 1.6);
    ellie.dispose();
    g.echo.ghosts = g.echo.ghosts.filter((x) => x !== ellie);
    // the first conscious Echo
    g.echo.unlocked = true;
    g.echo.enter(10, true);
    g.player.fovPunch = 10;
    const manager = g.ghost('civ_office', [V(62, 0, -12), V(66.4, 0, -22.9)], { loop: false, speed: 1.1 });
    await s.wait(2);
    await s.say('ELIAS', 'I\'m... inside it.');
    await s.until(() => manager.done || !g.echo.active);
    manager.actor.setPose('keypad');
    const digits = '1014';
    for (let i = 0; i < 4 && g.echo.active; i++) {
      await s.wait(0.65);
      audio.dtmf(digits[i], V(67.1, 1.35, -23.5));
      g.hud.chip(digits.slice(0, i + 1).padEnd(4, '·'), 1.5);
    }
    await s.until(() => !g.echo.active);
    manager.dispose();
    g.echo.ghosts = [];
    await s.say('MAYA', 'Elias! You just— you flickered. Your whole body. Like a bad signal.');
    await s.say('ELIAS', 'I saw him. The night manager. Eleven years ago, he typed the code.');
    await s.say('VOSS', '...You stepped into an Echo.', { dur: 2.4 });
    await s.say('VOSS', 'Remarkable. Can you do it again?');
    g.hud.hints([['Q', 'Enter Echo']]);
    s.objective('HALVORSEN APARTMENTS', 'Enter the code the manager typed');
    let open = false;
    while (!open) {
      await s.use('keypad', V(67.1, 1.35, -23.4), 'Enter code', { radius: 2 });
      g.hud.hints(null);
      open = await g.hud.keypad(digits, (d) => (d === 'x' ? audio.chime(false) : audio.dtmf(d)));
      if (!open) await s.say('ELIAS', 'Think. What did he type?', { dur: 1.6 });
    }
    audio.chime(true, V(66, 1.2, -23.5));
    audio.door('metal', V(66, 1.2, -23.5));
    const door = g.physics.colliders.find((c) => c.tag === 'secdoor');
    if (door) door.enabled = false;
    const pivot = g.world!.named.get('secdoor') as THREE.Group;
    let ang = 0;
    g.world!.onUpdate((dt) => {
      ang = Math.min(1.6, ang + dt * 1.8);
      pivot.rotation.y = -ang;
    });
    s.checkpoint(V(66, 0, -26), Math.PI);
    reyes.follow(V(-1.2, 0, -2.5));
    maya.follow(V(1.2, 0, -2.0));
    voss.follow(V(0, 0, -3.5));
    // alley traversal
    s.objective('BACK ALLEY', 'Find a way to the footbridge');
    g.hud.hints([['Space', 'Vault · Mantle · Climb']]);
    await s.zone([60, -1, -50], [72, 4, -46]);
    g.hud.hints(null);
    await s.zone([60, 4, -70], [72, 8, -64]);
    s.checkpoint(V(66, 5, -67), Math.PI);
    // the broken bridge
    await s.say('REYES', 'Bridge is gone. Clean through. Like someone forgot to finish it.');
    await s.say('MAYA', 'Not everything came back.');
    await s.say('REYES', 'We\'ll go around through the station. Vale—', { dur: 1.4 });
    for (const n of [maya, reyes, voss]) n.hold();
    void reyes.goto(V(64, 5, -66));
    await s.say('ELIAS', 'Eleven years ago, it was whole.');
    await s.say('VOSS', 'Elias. If the Echo collapses while you\'re on it—');
    await s.say('ELIAS', 'Then I run fast.');
    g.hud.hints([['Q', 'Enter Echo'], ['Shift', 'Sprint']]);
    s.objective('FOOTBRIDGE', 'Cross the bridge as it was');
    await s.zone([60, 3, -112], [72, 8, -100]);
    g.hud.hints(null);
    s.checkpoint(V(66, 5, -106), Math.PI);
    // the great Echo: the city walking to the center
    await s.cut(async () => {
      s.cam(V(66, 6.8, -110), V(66, 4, -200), 50);
      g.echo.enter(13, true);
      const n = 26;
      for (let i = 0; i < n; i++) {
        const x = 46 + (i % 8) * 5.2 + Math.sin(i * 7) * 1.2;
        const z0 = -136 - Math.floor(i / 8) * 7 - (i % 3) * 2;
        g.ghost(CIVILIANS[i % CIVILIANS.length], [V(x, 0, z0), V(x + Math.sin(i) * 3, 0, -330)], { loop: false, speed: 1.0 + (i % 4) * 0.12 });
      }
      audio.stinger('reveal');
      await s.camTo(V(66, 7.6, -124), V(66, 2, -170), 6, 46);
      await s.say('MAYA', 'Oh my God.', { dur: 2 });
      await s.camTo(V(70, 6.2, -128.5), V(62, 1.5, -150), 5, 40);
      await s.say('ELIAS', 'All of them. They\'re all walking to the center.', { dur: 3 });
      await s.camTo(V(66, 9, -126), V(66, 40, -420), 5, 34);
    });
    await s.until(() => !g.echo.active);
    g.echo.clearGhosts();
    await s.say('REYES', 'Vale! You alive up there?', { radio: true });
    await s.say('ELIAS', 'I\'m across. There\'s a station entrance on the terrace.', { radio: true });
    await s.say('VOSS', 'Civic Center Station. We\'ll meet you below. Elias— don\'t go further alone.', { radio: true });
    s.objective('CIVIC CENTER STATION', 'Go down into the subway');
    await s.zone([82, 3, -128], [90, 9, -104]);
    await s.fade(1, 1.5);
  },
};

export type { Script };
