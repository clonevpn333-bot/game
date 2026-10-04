import * as THREE from 'three';
import type { Chapter } from './index';
import { ENV, V, helicopter, cabin, cctvMaterial, textScreen, floodlight } from './common';
import * as K from '../world/Kit';
import { M, signMaterial, texturedMaterial } from '../render/Materials';
import { canvasTexture, documentTex } from '../render/Textures';
import { audio } from '../audio/AudioEngine';
import { Actor, isLoaded } from '../actors/Characters';
import type { World } from '../world/World';
import type { Game, Script } from '../game/Game';

const CAB = V(0, 40, -330);

/** Shared Orchard Street block (also used by the title screen and the final act). */
export function buildOrchard(W: World, o: { echoTraffic?: boolean; boundary?: boolean } = {}): void {
  const L = M();
  // the black earth outside the city line
  if (o.boundary !== false) {
    W.box([-400, -0.25, -420], [400, -0.02, -60], L.blackEarth, { uv: 40, surface: 'dirt', cast: false });
    W.box([-400, -0.25, -60], [-62, -0.02, 400], L.blackEarth, { uv: 40, surface: 'dirt', cast: false, collide: false });
  }
  // Orchard Street (north-south) and Ninth Avenue (east-west)
  K.street(W, -6, -60, 6, 24, { axis: 'z', crosswalks: [20] });
  K.street(W, -6, 36, 6, 140, { axis: 'z', crosswalks: [40] });
  K.street(W, -62, 24, 62, 36, { axis: 'x', crosswalks: [-8, 8] });
  W.box([-6, -0.2, 24], [6, 0, 36], L.asphalt, { uv: 8, surface: 'wet', cast: false });
  // sidewalk fill at the corners
  for (const [x0, x1] of [[-62, -10], [10, 62]]) {
    W.box([x0, 0, -60], [x1, 0.15, 20], L.sidewalk, { uv: 2, cast: false });
    W.box([x0, 0, 40], [x1, 0.15, 140], L.sidewalk, { uv: 2, cast: false });
  }
  // west side
  K.building(W, -30, -58, -10, -32, 18, 'brick', 1, { store: { side: 'e', sign: 'HALVORSEN HARDWARE', color: '#ffcf70' } });
  K.building(W, -34, -30, -10, -4, 26, 'apartment', 2, { store: { side: 'e', sign: 'LUCKY GARDEN', color: '#ff4060', lit: true } });
  K.building(W, -30, -2, -10, 20, 14, 'concrete', 3, { store: { side: 'e', sign: 'PHARMACY', color: '#40ff90', lit: true } });
  K.building(W, -36, 40, -10, 70, 38, 'office', 4, { store: { side: 'e', sign: 'FIRST BELLWETHER BANK', color: '#a0d0ff' } });
  K.building(W, -30, 72, -10, 104, 22, 'brick', 5, { store: { side: 'e', sign: 'OKAFOR BAKERY', color: '#ffb060', lit: true } });
  K.building(W, -40, 106, -10, 140, 52, 'office', 6);
  // east side
  K.building(W, 10, -58, 32, -30, 22, 'apartment', 7, { store: { side: 'w', sign: 'LAUNDROMAT', color: '#80e0ff', lit: true } });
  K.building(W, 10, -28, 30, 20, 30, 'brick', 8, { store: { side: 'w', sign: 'ROXY CINEMA', color: '#ff6080' } });
  // Quik-Stop building: store interior on the ground floor
  K.building(W, 10, 40, 34, 64, 20, 'apartment', 9, { base: 4.2 });
  K.building(W, 22, 40, 34, 64, 4.2, 'concrete', 10, { noRoof: true });
  W.box([10, 0, 58], [22, 4.2, 64], L.concrete, { uv: 3 });
  W.box([10, 0, 40], [22, 4.2, 44], L.concrete, { uv: 3 });
  K.building(W, 10, 66, 30, 100, 34, 'office', 11, { store: { side: 'w', sign: 'MERIDIAN TRAVEL', color: '#ffd080' } });
  K.building(W, 10, 102, 36, 140, 64, 'office', 12);
  // cross-street buildings
  K.building(W, -62, 40, -38, 70, 26, 'brick', 13);
  K.building(W, 36, -20, 62, 20, 24, 'apartment', 14);
  K.building(W, 36, 40, 62, 66, 30, 'concrete', 15);
  K.building(W, -62, -20, -36, 20, 20, 'apartment', 16);
  K.skyline(W, 0, 260, 140, 520, 220, 99, 190);
  K.skyline(W, -260, 60, 180, 320, 50, 37, 90);
  K.skyline(W, 260, 60, 180, 320, 50, 41, 90);
  // street furniture
  for (let z = -52; z < 136; z += 14) {
    if (z > 18 && z < 42) continue;
    K.streetLight(W, -8.4, z, Math.PI / 2, { flicker: z === 76 ? 0.7 : 0 });
    K.streetLight(W, 8.4, z + 7, -Math.PI / 2);
  }
  K.trafficLight(W, -7.6, 21.6, Math.PI / 2, 0);
  K.trafficLight(W, 7.6, 38.4, -Math.PI / 2, 11);
  K.trafficLight(W, 7.6, 21.6, Math.PI, 5);
  K.trafficLight(W, -7.6, 38.4, 0, 16);
  K.billboard(W, -20, 30, 12, Math.PI / 2, 'BELLWETHER', 'A CITY THAT NEVER SLEEPS', '#ff9a40', 0.5);
  K.neon(W, -9.9, 6.5, 10, Math.PI / 2, 'OPEN 24H', '#ff3070', 2.6, 0.2);
  K.neon(W, 9.9, 5.5, -40, -Math.PI / 2, 'COIN WASH', '#40d0ff', 2.6);
  K.bench(W, -8.6, -18, Math.PI / 2);
  K.bench(W, 8.6, 70, -Math.PI / 2);
  K.trashCan(W, -8.2, -12);
  K.trashCan(W, 8.3, 46);
  K.trashCan(W, -8.3, 60);
  K.hydrant(W, 8.2, -8);
  K.hydrant(W, -8.2, 52);
  for (const z of [-44, -26, 2, 64, 88]) K.tree(W, (z * 7) % 2 ? -9.2 : 9.2, z, 0.9);
  K.phoneBooth(W, -8.8, 44, Math.PI / 2);
  // abandoned cars: frozen mid-traffic
  K.car(W, -3, -36, 0, K.CAR_COLORS[0]);
  K.car(W, 3, -22, Math.PI, K.CAR_COLORS[2], { kind: 'suv' });
  K.car(W, -3, 14, 0.05, K.CAR_COLORS[1], { lights: true });
  K.car(W, -2.8, 30, Math.PI / 2 + 0.2, K.CAR_COLORS[3], { kind: 'hatch', lights: true });
  K.car(W, 14, 30, -Math.PI / 2, K.CAR_COLORS[5], { kind: 'van' });
  K.car(W, 26, 27.5, -Math.PI / 2, K.CAR_COLORS[6]);
  K.car(W, 3, 52, Math.PI, K.CAR_COLORS[4], { lights: true });
  K.car(W, -3, 80, 0, K.CAR_COLORS[7], { kind: 'suv' });
  K.car(W, 7.4, 96, Math.PI, K.CAR_COLORS[0], { kind: 'hatch' });
  K.car(W, -40, 30.5, Math.PI / 2, K.CAR_COLORS[2], { lights: true });
  // invisible bounds
  W.box([-11, 0, -60], [-10, 6, 140], L.black, { collide: true, cast: false });
  W.box([-62, 0, 36.2], [-62, 6, 36.3], L.black, { collide: false });
  W.physics.add({ cx: -62, cy: 3, cz: 30, hx: 0.5, hy: 3, hz: 6 });
  W.physics.add({ cx: 62, cy: 3, cz: 30, hx: 0.5, hy: 3, hz: 6 });
  W.physics.add({ cx: 0, cy: 3, cz: 140, hx: 10, hy: 3, hz: 0.5 });
  void o;
}

function buildStore(W: World, g: Game): { monitor: THREE.Mesh; cctvCam: THREE.PerspectiveCamera; rt: THREE.WebGLRenderTarget; mat: THREE.ShaderMaterial; tv: () => void } {
  const L = M();
  // interior: x 10..22, z 44..58, door on west wall (x=10) at z=50
  K.room(W, 10, 44, 22, 58, 4, L.plasterWhite, L.storeFloor, L.concreteDark, [{ wall: 'w', c: 50, w: 2.4, h: 2.6 }], { floorSurface: 'tile' });
  W.indoor([10, 0, 44], [22, 4.2, 58]);
  // big windows beside the door
  W.quad(L.glass, { x: 9.88, y: 1.8, z: 46.2 }, 3.6, 2.8, -Math.PI / 2);
  W.quad(L.glass, { x: 9.88, y: 1.8, z: 54.8 }, 5.6, 2.8, -Math.PI / 2);
  W.quad(signMaterial('QUIK-STOP 24', { bg: '#c81f1f', fg: '#ffffff', glow: '#ffffff', w: 512, h: 112, intensity: 2.8 }), { x: 9.7, y: 3.65, z: 50 }, 6, 1.1, -Math.PI / 2);
  W.light({ x: 8.4, y: 3.4, z: 50 }, '#ff5040', { intensity: 8, distance: 10, glow: 0, streak: true });
  // fluorescent ceiling (one flickers)
  for (const [x, z, f] of [[13, 47, 0], [13, 53, 0], [18, 47, 0.45], [18, 53, 0], [16, 56.5, 0]] as const) K.ceilingLight(W, x, 3.98, z, { flicker: f, intensity: 9, distance: 8, long: true });
  K.shelf(W, 15, 47.5, 0, 4);
  K.shelf(W, 15, 51, 0, 4);
  K.fridge(W, 21.4, 50, -Math.PI / 2, 5);
  K.counter(W, 12.2, 55.3, Math.PI / 2, 3);
  // coffee station
  W.boxC([13.4, 0.5, 44.5], [2.2, 1, 0.6], L.woodPaint, 0);
  W.boxC([13.0, 1.25, 44.45], [0.45, 0.5, 0.4], L.plasticDark, 0, { collide: false });
  W.light({ x: 13.0, y: 1.32, z: 44.7 }, '#ff3010', { noLight: true, glow: 0.12, pool: false });
  for (let i = 0; i < 3; i++) W.boxC([13.8 + i * 0.14, 1.06, 44.5], [0.08, 0.12, 0.08], L.plasticWhite, 0, { collide: false });
  // magazine rack + newspapers
  W.boxC([11.0, 0.6, 47.2], [0.4, 1.2, 1.6], L.metalDark, 0);
  W.quad(texturedMaterial(documentTex(['THE BELLWETHER HERALD', 'OCT 14 · LATE EDITION', '', 'CITY COUNCIL DENIES', '"SLEEP CLINIC" RUMORS', 'Hospital reports surge', 'in nightmare complaints'], 'herald'), 0.8), { x: 11.21, y: 0.9, z: 47.2 }, 0.42, 0.55, Math.PI / 2);
  // TV on a wall bracket
  W.boxC([21.7, 3.0, 55.0], [0.15, 0.7, 1.15], L.plasticDark, 0, { collide: false });
  const lines = ['EMERGENCY ALERT', 'CIVIL EMERGENCY · BELLWETHER COUNTY', 'RESIDENTS ARE ADVISED TO REMAIN INDOORS', 'DO NOT APPROACH THE CITY CENTER', 'THIS IS NOT A TEST'];
  let scroll = 0;
  const tv = textScreen('eas', () => [lines[0], ...lines.slice(1).map((l, i) => (i === Math.floor(scroll) % 4 ? `▶ ${l}` : l))]);
  const tvMesh = W.quad(new THREE.MeshBasicMaterial({ map: tv.tex, color: new THREE.Color(1.6, 1.6, 1.6) }), { x: 21.6, y: 3.0, z: 55.0 }, 1.05, 0.6, -Math.PI / 2, { dynamic: true }) as THREE.Mesh;
  void tvMesh;
  W.light({ x: 20.8, y: 3.0, z: 55 }, '#7090ff', { intensity: 3, distance: 5, glow: 0, pool: false, flicker: 0.3 });
  // security monitor behind the counter
  const rt = new THREE.WebGLRenderTarget(320, 240);
  const mat = cctvMaterial(rt.texture);
  W.boxC([11.25, 1.55, 56.6], [0.5, 0.42, 0.45], L.plasticDark, 0, { collide: false });
  const monitor = W.quad(mat, { x: 11.5, y: 1.56, z: 56.6 }, 0.4, 0.3, Math.PI / 2, { dynamic: true }) as THREE.Mesh;
  const ts = canvasTexture('cctv-ts', 256, 32, (c) => {
    c.fillStyle = 'rgba(0,0,0,0)';
    c.clearRect(0, 0, 256, 32);
    c.font = '600 18px "Courier New", monospace';
    c.fillStyle = '#e8ffe8';
    c.fillText('CAM 2  10-14  02:17:00', 6, 22);
    c.fillStyle = '#ff3030';
    c.beginPath();
    c.arc(240, 15, 6, 0, Math.PI * 2);
    c.fill();
  }, { repeat: false });
  const tsm = new THREE.MeshBasicMaterial({ map: ts, transparent: true, depthWrite: false });
  W.quad(tsm, { x: 11.51, y: 1.68, z: 56.6 }, 0.36, 0.045, Math.PI / 2, { dynamic: true });
  // CCTV camera body in the corner
  W.boxC([21.6, 3.75, 57.6], [0.25, 0.18, 0.35], L.plasticWhite, 0.8, { collide: false });
  const cctvCam = new THREE.PerspectiveCamera(78, 4 / 3, 0.1, 40);
  cctvCam.position.set(21.4, 3.6, 57.4);
  cctvCam.lookAt(13, 0.8, 48);
  cctvCam.layers.enable(2);
  W.add(cctvCam);
  W.onUpdate((dt) => {
    scroll += dt * 0.5;
    if (Math.floor(scroll * 4) !== Math.floor((scroll - dt * 0.5) * 4)) tv.redraw();
  });
  void g;
  return { monitor, cctvCam, rt, mat, tv: tv.redraw };
}

let store: ReturnType<typeof buildStore> | null = null;
let heli: ReturnType<typeof helicopter> | null = null;
let ellieCam: Actor | null = null;
let echoCars: THREE.Group[] = [];

export const ch1: Chapter = {
  id: 'ch1', num: 'CHAPTER ONE', title: 'The Return', sub: 'Orchard Street · 02:17 AM',
  env: ENV.stormCity,
  chars: ['elias', 'maya', 'reyes', 'voss', 'ellie', 'civ_man', 'civ_woman', 'civ_office', 'civ_kid'],
  flashlight: false,
  build(W, g) {
    const L = M();
    buildOrchard(W);
    store = buildStore(W, g);
    cabin(W, CAB.x, CAB.y, CAB.z);
    // landing zone: floodlights, barricades, military trucks
    floodlight(W, -14, -96, 0.6);
    floodlight(W, 16, -88, -0.7);
    for (let x = -24; x <= 24; x += 4) if (Math.abs(x) > 6) K.barrier(W, x, -64, 0);
    K.car(W, -18, -78, 0.3, '#3a4030', { kind: 'van' });
    K.car(W, 20, -104, -0.4, '#3a4030', { kind: 'van' });
    W.box([-30, -0.02, -122], [30, 0.02, -108], L.concreteDark, { uv: 4, collide: false });
    for (let i = 0; i < 6; i++) W.light({ x: -12 + i * 4.8, y: 0.1, z: -115 }, '#ff3020', { noLight: true, glow: 0.35, pool: false });
    // the helicopter at the LZ
    heli = helicopter(true);
    heli.group.position.set(6, 0, -116);
    heli.group.rotation.y = 0.3;
    W.add(heli.group);
    W.physics.add({ cx: 6, cy: 1.5, cz: -116, hx: 1.6, hy: 1.5, hz: 4, yaw: 0.3 });
    // a girl only the security camera can see
    ellieCam = isLoaded('ellie') ? new Actor('ellie') : null;
    if (ellieCam) {
      ellieCam.root.traverse((o) => o.layers.set(2));
      ellieCam.root.visible = false;
      W.add(ellieCam.root);
    }
    // echo traffic: cars that drive through the intersection only in an Echo
    echoCars = [];
    for (const [i, col] of [K.CAR_COLORS[1], K.CAR_COLORS[6], K.CAR_COLORS[2]].entries()) {
      const c = K.car(W, -40 + i * 20, 27.5 + (i % 2) * 4, Math.PI / 2, col, { dynamic: true, layer: 'echo', collide: false, lights: false });
      echoCars.push(c);
    }
    W.onUpdate((dt) => {
      if (heli) {
        heli.rotor.rotation.y += dt * (heli.group.userData.rpm ?? 6);
        heli.tail.rotation.x += dt * 30;
      }
      echoCars.forEach((c, i) => {
        if (g.echo.t < 0.02) return;
        const dir = i % 2 ? -1 : 1;
        c.position.x += dir * dt * 9;
        c.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        if (c.position.x > 60) c.position.x = -60;
        if (c.position.x < -60) c.position.x = 60;
      });
      // CCTV feed (throttled)
      if (store && g.player.pos.distanceTo(V(12, 0, 55)) < 9 && !(window as unknown as { __shot?: boolean }).__shot) {
        const r = g.engine.renderer;
        const prev = r.getRenderTarget();
        store.monitor.visible = false;
        r.setRenderTarget(store.rt);
        r.render(g.engine.scene, store.cctvCam);
        r.setRenderTarget(prev);
        store.monitor.visible = true;
        store.mat.uniforms.uTime.value += dt;
      }
    });
    W.spawn.set(4, 0, -110);
    W.spawnYaw = 0;
  },
  ambience(g) {
    audio.setRain(1, false);
    audio.drone(0.05, 38, 0.2);
    audio.wind(0.12);
    audio.crossingChirp(V(-7, 1, 22), 0.08);
    audio.crossingChirp(V(7, 1, 38), 0.06);
    audio.hum(V(-9, 6, 10), 0.05, 60, 0.04);
    audio.muzak(V(16, 3.5, 51), 0.11);
    audio.hum(V(21, 1, 50), 0.07, 60, 0.02);
    audio.emergencyBroadcast(V(21.6, 3, 55), 0.07);
    void g;
  },
  titleCam(t) {
    const a = t * 0.6;
    return { pos: V(Math.sin(a) * 3, 3.2 + Math.sin(t * 1.3) * 0.3, -40 + (t * 30) % 60), look: V(0, 9, 60) };
  },
  shots: {
    street(g) {
      g.player.teleport(V(0.5, 0, -8), 0);
      g.player.camPitch = 0.05;
      g.npc('maya', V(-1.8, 0, -10)).hold(0.2);
      g.npc('reyes', V(2.4, 0, -11)).hold(-0.1);
      g.player.snapCamera();
    },
    store(g) {
      g.player.teleport(V(11.6, 0, 50.4), Math.PI / 2 + 0.3);
      g.npc('voss', V(19.6, 0, 54.6), -Math.PI / 2);
      g.npc('maya', V(13.5, 0, 45.8), 0.5);
      g.player.snapCamera();
    },
    boundary(g) {
      g.player.teleport(V(-2, 0, -70), 0.15);
      g.player.camPitch = 0.12;
      g.player.snapCamera();
    },
  },
  async run(s) {
    await prologue(s);
    await landing(s);
    await street(s);
    await quikStop(s);
    await firstEcho(s);
  },
};

// ------------------------------------------------------------------ script
async function prologue(s: Script): Promise<void> {
  const g = s.g;
  g.hud.setFade(1);
  s.control(false);
  g.player.actor.root.visible = false;
  const heliLoop = audio.helicopter(0.55, true);
  await s.wait(1);
  for (const t of ['Eleven years ago, the American city of Bellwether disappeared.', 'Not destroyed. Not evacuated. Gone.', 'Buildings. Roads. 2.3 million people.', 'Tonight, at exactly 2:17 AM, it came back.']) {
    g.hud.showSub('', t, false, 0);
    await s.wait(3.6);
  }
  g.hud.hideSub();
  // cabin
  const maya = g.npc('maya', CAB.clone().add(V(-1.0, 0, 0.6)), Math.PI / 2);
  const reyes = g.npc('reyes', CAB.clone().add(V(-1.0, 0, -0.9)), Math.PI / 2);
  const voss = g.npc('voss', CAB.clone().add(V(1.0, 0, 1.2)), -Math.PI / 2);
  for (const n of [maya, reyes, voss]) {
    n.actor.setPose('sit', 0);
    n.hold();
  }
  // physics floor for the cabin set so they stay seated
  g.physics.add({ cx: CAB.x, cy: CAB.y - 0.05, cz: CAB.z, hx: 1.3, hy: 0.05, hz: 2.6 });
  for (const n of [maya, reyes, voss]) n.pos.y = CAB.y;
  await s.cut(async () => {
    s.cam(CAB.clone().add(V(0.9, 1.15, -2.2)), CAB.clone().add(V(-0.9, 1.0, 0.4)), 50);
    void s.fade(0, 2.5);
    g.rain.intensity = 1;
    await s.wait(1.5);
    await s.say('REYES', 'Twenty years flying into places nobody should go. Never had one come back on its own.');
    void s.camTo(CAB.clone().add(V(0.6, 1.2, -1.5)), CAB.clone().add(V(-1.0, 1.05, 0.8)), 5, 45);
    await s.say('MAYA', 'Spectrometers read normal. Concrete. Steel. Glass. Like it was never gone.');
    await s.say('VOSS', 'Nothing about this is normal, Dr. Chen. I need you to remember that.', { actor: 'voss' });
    void s.camTo(CAB.clone().add(V(-0.6, 1.25, -2.0)), CAB.clone().add(V(1.0, 1.0, 0.8)), 4, 45);
    await s.say('REYES', "You're quiet, Vale. Even for you.");
    await s.say('ELIAS', 'Just tired.');
    await s.say('PILOT', 'Bellwether in sight. Two minutes.', { radio: true });
    await s.camTo(CAB.clone().add(V(-0.4, 1.3, -0.4)), CAB.clone().add(V(20, -6, 80)), 4.5, 55);
    await s.say('MAYA', "...It's all still lit.");
    await s.say('VOSS', 'Every streetlight. Every sign. Every traffic signal. Still running.');
    await s.wait(1.2);
    // exterior fly-in over the black earth
    await s.fade(1, 0.6);
    heliLoop?.setVolume(0.3, 0.5);
    const fly = helicopter(true);
    g.world!.add(fly.group);
    fly.group.position.set(-20, 45, -330);
    fly.group.rotation.y = 0.2;
    let ft = 0;
    g.world!.onUpdate((dt) => {
      ft += dt;
      fly.rotor.rotation.y += dt * 9;
      fly.tail.rotation.x += dt * 30;
      fly.group.position.z = -330 + ft * 22;
      fly.group.position.x = -20 + ft * 2;
      fly.group.rotation.z = Math.sin(ft * 0.5) * 0.04;
    });
    s.cam(V(-6, 38, -250), V(-16, 44, -320), 40);
    void s.fade(0, 0.8);
    await s.camTo(V(-10, 36, -262), V(-6, 30, -150), 6, 50);
    await g.hud.chapterCard('', 'THE MISSING CITY', 'A STORY OF BELLWETHER', 3.4);
    fly.group.visible = false;
    await s.fade(1, 1.0);
  }, { keepControlAfter: false });
  heliLoop?.stop(2);
  for (const n of [maya, reyes, voss]) n.actor.setPose(null, 0);
}

async function landing(s: Script): Promise<void> {
  const g = s.g;
  const maya = g.npc('maya', V(1.5, 0, -112), 0.2);
  const reyes = g.npc('reyes', V(7.5, 0, -110.5), -0.3);
  const voss = g.npc('voss', V(4.0, 0, -106.5), Math.PI);
  g.player.teleport(V(4.2, 0, -111), 0);
  g.player.actor.root.visible = true;
  if (heli) heli.group.userData.rpm = 2.2;
  const idle = audio.helicopter(0.18, false);
  s.objective('BELLWETHER CITY LINE', 'Regroup with the team');
  await s.cut(async () => {
    s.cam(V(9, 1.7, -103), V(4, 1.5, -110), 42);
    void s.fade(0, 1.5);
    await g.hud.chapterCard('CHAPTER ONE', 'THE RETURN', 'BELLWETHER · 02:17 AM', 3);
    voss.lookTarget = () => g.player.head;
    await s.say('VOSS', 'We go in on foot. We stay together, and nobody touches anything they don\'t have to.');
    await s.say('REYES', 'You heard the man. Hands in pockets, kids.');
    await s.say('VOSS', 'Dr. Chen, readings every hundred meters. Mr. Reyes has point. Vale — you\'re with me.');
    await s.camTo(V(3, 2.2, -100), V(0, 6, -40), 4, 50);
  });
  idle?.stop(6);
  for (const n of [maya, reyes, voss]) n.lookTarget = null;
  reyes.follow(V(-1.5, 0, 3.5));
  maya.follow(V(-1.8, 0, -1.2));
  voss.follow(V(1.6, 0, -1.6));
  g.hud.hints([['WASD', 'Move'], ['Shift', 'Sprint'], ['Mouse', 'Look']]);
  s.objective('BELLWETHER CITY LINE', 'Enter the city');
  await s.zone([-30, -1, -74], [30, 4, -60]);
  g.hud.hints(null);
  await s.say('MAYA', 'Look at the line. The asphalt just... stops. Clean as a blade.');
  await s.say('REYES', 'Cookie cutter. Somebody pressed a cookie cutter into Ohio.');
  await s.say('VOSS', 'Eleven years this was a black field. Nothing grew on it. Not even moss.');
  s.checkpoint(V(0, 0, -58), 0);
}

async function street(s: Script): Promise<void> {
  s.objective('ORCHARD STREET', 'Follow Orchard Street north');
  await s.zone([-12, -1, -40], [12, 4, -20]);
  await s.say('REYES', 'Lights are still changing. For who?');
  await s.say('MAYA', 'Grid power reads live. There is no grid out here. There hasn\'t been for eleven years.');
  await s.zone([-12, -1, 4], [12, 4, 16]);
  await s.say('MAYA', 'This car\'s headlights are on. Engine off. That battery should have died a decade ago.');
  await s.say('VOSS', 'Unless, for the battery, a decade never happened.');
  await s.say('MAYA', 'Meaning what?');
  await s.say('VOSS', 'Meaning I\'d like to see a clock.');
  await s.zone([-12, -1, 22], [12, 4, 34]);
  audio.whisper(V(-20, 2, 60), 0.05, 2);
  await s.say('REYES', 'Anybody else feel like the whole street is holding its breath?');
  await s.say('ELIAS', 'Ninth and Orchard. There\'s a store on the corner.', { actor: 'elias' });
  await s.say('VOSS', 'You know the city, Agent Vale?');
  await s.say('ELIAS', 'I read the files.');
  s.objective('NINTH & ORCHARD', 'Search the Quik-Stop');
  s.checkpoint(V(4, 0, 38), 0);
}

async function quikStop(s: Script): Promise<void> {
  const g = s.g;
  void g;
  await s.zone([9, -1, 46], [12, 4, 54]);
  const maya = g.npcs.get('maya')!;
  const reyes = g.npcs.get('reyes')!;
  const voss = g.npcs.get('voss')!;
  void voss.goto(V(19.6, 0, 54.4));
  void maya.goto(V(17.5, 0, 49.4));
  void reyes.goto(V(12.2, 0, 52.8));
  await s.say('MAYA', 'The music\'s still playing.');
  await s.say('REYES', 'Smooth jazz. Great. We died and this is the waiting room.');
  voss.hold(-Math.PI / 2);
  maya.hold(Math.PI / 2);
  reyes.hold(Math.PI);
  g.hud.hints([['E', 'Examine']]);
  s.objective('QUIK-STOP', 'Look around');
  let found = 0;
  const examine = async (id: string, pos: THREE.Vector3, prompt: string, fn: () => Promise<void>) => {
    await s.use(id, pos, prompt);
    g.hud.hints(null);
    await fn();
    found++;
  };
  const tasks = [
    examine('coffee', V(13.2, 1.1, 44.8), 'Coffee pot', async () => {
      audio.click('ui');
      await s.say('ELIAS', 'The coffee\'s still warm.');
      await s.say('MAYA', 'That\'s... not possible. Let me see.');
    }),
    examine('register', V(12.3, 1.2, 55.0), 'Register receipt', async () => {
      audio.paper();
      await g.hud.doc('QUIK-STOP #0412', 'ORCHARD & NINTH\nOCT 14\n\n1  COFFEE LG          1.89\n1  CHOC MILK          1.29\n1  STRAWBERRY GUM     0.99\n\nSUBTOTAL             4.17\nCASH                 5.00\nCHANGE               0.83\n\n02:16 AM\n\nTHANK YOU — COME AGAIN!');
      await s.thought('Chocolate milk. Strawberry gum. Ellie\'s order. Every time.');
    }),
    examine('tv', V(21.2, 2.4, 55), 'Television', async () => {
      await s.say('VOSS', 'Emergency broadcast. Two-fifteen in the morning, eleven years ago. "Do not approach the city center."');
      await s.say('MAYA', 'So they knew something was happening. Before.');
      await s.say('VOSS', 'Someone did.');
    }),
    examine('paper', V(11.2, 1.0, 47.2), 'Newspaper', async () => {
      audio.paper();
      await g.hud.doc('THE BELLWETHER HERALD — LATE EDITION', 'CITY COUNCIL DENIES "SLEEP CLINIC" RUMORS\n\nBellwether Central Hospital has reported a sharp rise in patients describing identical nightmares, lost time and "voices in empty rooms."\n\nA spokesperson for the Department of Energy declined to comment on the federal construction site beneath the Civic Center, which residents have reported hearing "humming" at night.\n\nDr. A. Voss, project liaison, called the reports "unrelated."');
      await s.thought('Dr. A. Voss.');
    }),
  ];
  void Promise.allSettled(tasks);
  await s.until(() => found >= 2);
  await s.wait(1);
  // the monitor
  void reyes.goto(V(11.8, 0, 56.2));
  await s.say('REYES', 'Uh. Guys?');
  await s.say('REYES', 'Camera\'s live.');
  s.objective('QUIK-STOP', 'Check the security monitor');
  await s.near(V(11.8, 0, 56.0), 2.6);
  await s.cut(async () => {
    const p = g.player;
    p.teleport(V(13.4, 0, 51.6), Math.PI / 2 + 0.9);
    maya.place(V(14.6, 0, 53.2), 2.2);
    voss.place(V(15.4, 0, 51.4), 1.9);
    reyes.place(V(12.2, 0, 56.0), Math.PI / 2 + 1.3);
    // Ellie stands behind Elias — on camera only
    if (ellieCam) {
      ellieCam.root.visible = true;
      ellieCam.root.position.set(14.6, 0, 50.2);
      ellieCam.root.rotation.y = Math.PI / 2 + 0.6;
      ellieCam.setPose('idle', 0);
      g.world!.onUpdate((dt) => ellieCam?.update(dt));
    }
    s.cam(V(12.1, 1.62, 56.15), V(11.5, 1.56, 56.6), 32);
    await s.wait(1.2);
    await s.camTo(V(11.95, 1.58, 56.45), V(11.5, 1.56, 56.6), 4, 24);
    store!.mat.uniforms.uFlick.value = 0.5;
    await s.say('MAYA', 'Who is that?', { dur: 2.2 });
    audio.stinger('scare');
    // everyone turns
    s.cam(V(17.6, 1.6, 48.6), V(13.6, 1.3, 51.2), 46);
    if (ellieCam) ellieCam.root.visible = false;
    p.yaw = -Math.PI / 2 + 0.6;
    maya.yaw = -0.6;
    voss.yaw = -1.6;
    await s.wait(2.0);
    await s.say('REYES', 'There was a kid. There was a kid right there.');
    await s.say('VOSS', '...A recording artifact. Old footage on a loop.');
    await s.say('MAYA', 'It\'s a live feed, Adrian. That\'s us on it.');
    audio.whisper(g.player.head.clone().add(V(0.5, 0, 0.5)), 0.15, 1.2);
    g.hud.showSub('', '"Eli?"', false, 2);
    await s.wait(2.4);
    await s.say('ELIAS', 'Did anyone else hear that?');
    await s.wait(1.2);
    await s.say('VOSS', 'Outside. Now.');
  });
  void voss.goto(V(6, 0, 50), true);
  void maya.goto(V(6, 0, 47.5), true);
  void reyes.goto(V(5, 0, 52.5), true);
  s.objective('NINTH & ORCHARD', 'Get out of the store');
  await s.zone([0, -1, 40], [9.8, 4, 60]);
  s.checkpoint(V(5, 0, 50), Math.PI);
}

async function firstEcho(s: Script): Promise<void> {
  const g = s.g;
  // recordings of the final night
  const paths: [THREE.Vector3[], string][] = [
    [[V(-8.5, 0.15, 60), V(-8.5, 0.15, 0)], 'civ_woman'],
    [[V(8.6, 0.15, 10), V(8.6, 0.15, 70)], 'civ_man'],
    [[V(-30, 0.15, 37.5), V(30, 0.15, 37.5)], 'civ_office'],
    [[V(-8.4, 0.15, 30), V(30, 0.15, 33)], 'civ_kid'],
    [[V(9, 0.15, 0), V(9, 0.15, 60)], 'civ_woman'],
    [[V(-9, 0.15, -20), V(-9, 0.15, 60)], 'civ_office'],
  ];
  const ghosts = paths.map(([p, n], i) => g.ghost(n as never, p, { speed: 1.2 + (i % 3) * 0.2, loop: false }));
  await s.cut(async () => {
    s.cam(V(4, 1.5, 47), V(-2, 2, 30), 50);
    await s.wait(0.8);
    g.echo.enter(9, true);
    audio.reversedSwell(0.4, 1.5);
    await s.camTo(V(1, 2.4, 50), V(-1, 1.8, 20), 6, 58);
    await s.camTo(V(-2, 1.6, 44), V(-8.5, 1.4, 34), 3.5, 48);
  });
  await s.until(() => !g.echo.active);
  for (const gh of ghosts) gh.dispose();
  g.echo.ghosts = [];
  await s.say('MAYA', 'Tell me you all saw that.');
  await s.say('VOSS', 'We call them Echoes. The survey drones recorded dozens on the approach.');
  await s.say('MAYA', 'And that wasn\'t worth mentioning in the briefing?');
  await s.say('VOSS', 'You wouldn\'t have believed me until you saw one.');
  await s.say('REYES', 'Yeah. Well. I believe.');
  await s.thought('The woman in the red coat. Mrs. Okafor, from the bakery on Ninth. She used to give Ellie the broken cookies.', 5);
  await s.say('VOSS', 'Downtown. Whatever happened here started at the center. We follow it.');
  await s.wait(1);
  await s.fade(1, 2);
}
