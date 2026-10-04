import * as THREE from 'three';
import type { Chapter } from './index';
import { V } from './common';
import * as K from '../world/Kit';
import { M, signMaterial, texturedMaterial } from '../render/Materials';
import { SKY } from '../render/Sky';
import { documentTex } from '../render/Textures';
import { audio } from '../audio/AudioEngine';
import type { World } from '../world/World';
import type { Script } from '../game/Game';

function hospBed(W: World, x: number, z: number, yaw: number): void {
  const L = M();
  const g = new THREE.Group();
  g.add(K.mesh(K.box(0.95, 0.12, 2.0), L.mattress, 0, 0.62, 0));
  g.add(K.mesh(K.box(1.0, 0.06, 2.05), L.steel, 0, 0.52, 0));
  for (const [sx, sz] of [[-0.45, -0.95], [0.45, -0.95], [-0.45, 0.95], [0.45, 0.95]]) g.add(K.mesh(K.box(0.04, 0.52, 0.04), L.steel, sx, 0.26, sz));
  g.add(K.mesh(K.box(1.0, 0.6, 0.05), L.steel, 0, 0.9, -1.0));
  g.add(K.mesh(K.box(0.9, 0.08, 1.3), new THREE.MeshStandardMaterial({ color: 0x8fb0c0, roughness: 0.9 }), 0, 0.71, 0.3));
  W.prop(g, { x, y: 0, z }, yaw);
  W.physics.add({ cx: x, cy: 0.4, cz: z, hx: 0.5, hy: 0.4, hz: 1.0, yaw });
}

function buildHospital(W: World): void {
  const L = M();
  const H = 3.4;
  // exterior approach (z -30..0) + facade
  K.street(W, -40, -26, 40, -16, { axis: 'x' });
  W.box([-40, 0, -16], [40, 0.15, 0], L.sidewalk, { uv: 2, cast: false });
  K.building(W, -40, 0, 40, 60, 34, 'hospital', 3, { base: H, noRoof: false });
  W.quad(signMaterial('BELLWETHER CENTRAL HOSPITAL', { bg: '#0d2f2a', fg: '#e8fff6', w: 1024, h: 128, intensity: 2.2 }), { x: 0, y: H + 1.2, z: -0.08 }, 12, 1.5, Math.PI);
  W.quad(signMaterial('EMERGENCY', { bg: '#a01010', fg: '#ffffff', w: 512, h: 128, intensity: 3 }), { x: 14, y: H - 0.6, z: -0.08 }, 3.2, 0.8, Math.PI);
  W.light({ x: 14, y: H - 0.5, z: -1.2 }, '#ff3020', { intensity: 8, distance: 10, glow: 0 });
  for (let x = -32; x <= 32; x += 16) K.streetLight(W, x, -15, 0, { color: '#d8f0ff' });
  K.car(W, -12, -21, Math.PI / 2, '#e8e8e8', { kind: 'van', lights: true });
  W.light({ x: -12, y: 2.4, z: -21 }, '#ff2020', { intensity: 6, distance: 10, glow: 0.5, flicker: 0.9, pool: false });
  W.light({ x: -11, y: 2.4, z: -21 }, '#2040ff', { intensity: 6, distance: 10, glow: 0.5, flicker: 0.9, pool: false });
  // ground floor shell (x -40..40, z 0..60), entrance at x=0 on z=0
  K.room(W, -40, 0, 40, 60, H, L.plasterGreen, L.hospFloor, L.plasterWhite, [{ wall: 'n', c: 0, w: 3, h: 2.8 }], { floorSurface: 'tile' });
  W.indoor([-40, 0, 0], [40, H, 60]);
  // lobby (z 0..16): reception + waiting area
  W.boxC([0, 0.55, 9], [6, 1.1, 1.2], L.woodPaint, 0);
  W.boxC([0, 1.12, 9], [6.2, 0.06, 1.4], L.trimLight, 0, { collide: false });
  for (let i = 0; i < 4; i++) for (const x of [-12, -8]) K.chair(W, x, 3 + i * 1.6, Math.PI / 2, L.fabric);
  W.quad(texturedMaterial(documentTex(['VISITING HOURS', '8 AM — 8 PM', '', 'ALL PATIENTS REPORTING', 'SLEEP DISTURBANCE', 'PLEASE REGISTER AT', 'DESK 3'], 'visit'), 0.8), { x: 0, y: 2.2, z: 15.86 }, 1.0, 1.3, Math.PI);
  for (const x of [-14, -6, 6, 14]) for (const z of [4, 12]) K.ceilingLight(W, x, H - 0.02, z, { intensity: 8, distance: 9, long: true, flicker: x === 6 && z === 12 ? 0.6 : 0 });
  // partition between lobby and wards (z=16) with corridor opening at x 18..21
  W.box([-40, 0, 16], [17, H, 16.2], L.plasterGreen, { uv: 2, noVault: true });
  W.box([22, 0, 16], [40, H, 16.2], L.plasterGreen, { uv: 2, noVault: true });
  W.box([17, 2.4, 16], [22, H, 16.2], L.plasterGreen, { collide: false });
  // east corridor (x 17..22, z 16..58) with ward rooms on the west side
  for (let z = 18; z < 56; z += 8) {
    W.box([-2, 0, z + 7.8], [17, H, z + 8], L.plasterGreen, { uv: 2, noVault: true });
    W.box([16.9, 0, z], [17.1, H, z + 3], L.plasterGreen, { uv: 2, noVault: true });
    W.box([16.9, 0, z + 4.4], [17.1, H, z + 8], L.plasterGreen, { uv: 2, noVault: true });
    W.box([16.9, 2.3, z + 3], [17.1, H, z + 4.4], L.plasterGreen, { collide: false });
    hospBed(W, 6, z + 2.5, Math.PI / 2);
    hospBed(W, 12, z + 2.5, Math.PI / 2);
    W.boxC([9, 1.3, z + 0.5], [0.05, 2.6, 0.05], L.steel, 0, { collide: false });
    W.quad(new THREE.MeshStandardMaterial({ color: 0x9fc4c8, roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }), { x: 9, y: 1.4, z: z + 3.6 }, 0.05, 2.4, 0);
    K.ceilingLight(W, 19.5, H - 0.02, z + 4, { intensity: 6, distance: 8, flicker: z % 16 === 2 ? 0.7 : 0.1 });
    K.ceilingLight(W, 9, H - 0.02, z + 4, { intensity: 4, distance: 7, flicker: 0.2 });
  }
  W.box([-2, 0, 16], [-1.8, H, 58], L.plasterGreen, { uv: 2, noVault: true });
  // gurneys/wheelchair in the corridor (cover)
  W.boxC([20.6, 0.5, 26], [0.8, 1.0, 2.0], L.steel, 0.05, {});
  W.boxC([18.4, 0.5, 38], [0.8, 1.0, 2.0], L.steel, -0.08, {});
  W.boxC([20.4, 0.5, 47], [0.7, 1.0, 0.7], L.metalDark, 0, {});
  // records room (x 22..34, z 40..56) behind a door at z 48 (east corridor wall)
  W.box([22, 0, 16.2], [22.2, H, 47], L.plasterGreen, { uv: 2, noVault: true });
  W.box([22, 0, 49], [22.2, H, 58], L.plasterGreen, { uv: 2, noVault: true });
  W.box([22, 2.3, 47], [22.2, H, 49], L.plasterGreen, { collide: false });
  W.box([22, 0, 47], [22.2, 2.3, 49], L.metalDark, { layer: 'present', noVault: true });
  W.quad(signMaterial('RECORDS · STAFF ONLY', { bg: '#e8e8e0', fg: '#222', w: 512, h: 96, intensity: 1 }), { x: 21.86, y: 2.6, z: 48 }, 1.6, 0.3, -Math.PI / 2);
  W.box([22, 0, 40], [40, H, 40.2], L.plasterGreen, { uv: 2, noVault: true });
  for (let z = 42; z < 57; z += 2.6) for (const x of [26, 30]) W.boxC([x, 1.1, z], [0.6, 2.2, 2.0], L.metal, 0, { noVault: true });
  K.desk(W, 36, 52, -Math.PI / 2, true, true);
  K.ceilingLight(W, 30, H - 0.02, 48, { intensity: 6, distance: 9, flicker: 0.3 });
  // radiology lab (x 22..40, z 16..40): Maya's discovery
  W.box([22, 0, 28], [30, H, 28.2], L.plasterBlue, { uv: 2, noVault: true });
  W.box([32, 0, 28], [40, H, 28.2], L.plasterBlue, { uv: 2, noVault: true });
  W.box([30, 2.3, 28], [32, H, 28.2], L.plasterBlue, { collide: false });
  W.boxC([34, 1.0, 22], [2.4, 2.0, 2.4], L.plasticWhite, 0);
  W.geo(new THREE.TorusGeometry(1.0, 0.35, 12, 24), L.plasticWhite, { x: 34, y: 1.4, z: 22 }, new THREE.Euler(0, Math.PI / 2, 0), 1);
  K.desk(W, 26, 20, Math.PI / 2, true, true);
  K.ceilingLight(W, 30, H - 0.02, 22, { color: '#d8e8ff', intensity: 7, distance: 9 });
  W.light({ x: 34, y: 2.4, z: 22 }, '#80b0ff', { intensity: 4, distance: 6, glow: 0.3, pool: false });
  W.physics.add({ cx: 0, cy: 2, cz: -27, hx: 40, hy: 2, hz: 0.5 });
}

export const ch5: Chapter = {
  id: 'ch5', num: 'CHAPTER FIVE', title: 'The Hospital', sub: 'Bellwether Central',
  env: {
    sky: SKY.stormLight, fog: '#0a0f10', fogDensity: 0.02, rain: 0.8, envKind: 'interior', exposure: 1.1,
    hemi: ['#5a7068', '#0e0c0a', 0.18], moon: { color: '#8aa0b8', intensity: 0.2, dir: [0.2, 1, -0.4], shadow: false }, reverb: [1.6, 0.35], motes: 0.6, bloom: 0.55,
    grade: { sat: 0.82, tint: '#eef8f2', vignette: 1.05 },
  },
  chars: ['elias', 'maya', 'reyes', 'voss', 'remnant', 'civ_nurse'],
  echoUnlocked: true,
  gun: true,
  flashlight: true,
  seed: 5,
  build(W) {
    buildHospital(W);
    W.spawn.set(-4, 0.15, -10);
    W.spawnYaw = 0;
  },
  ambience() {
    audio.setRain(0.8, false);
    audio.drone(0.07, 33, 0.6);
    audio.hum(V(0, 3, 8), 0.05, 60, 0.06);
    audio.hum(V(19, 3, 36), 0.05, 60, 0.07);
  },
  shots: {
    corridor(g) {
      g.player.teleport(V(19.5, 0, 20), 0);
      g.player.flashlightOn = true;
      g.player.crouching = true;
      g.spawn('mimic', V(19.6, 0, 34), Math.PI);
      g.player.snapCamera();
    },
  },
  async run(s) {
    const g = s.g;
    g.hud.setFade(1);
    const maya = g.npc('maya', V(-1, 0.15, -6), Math.PI);
    const reyes = g.npc('reyes', V(1.5, 0.15, -7), Math.PI);
    const voss = g.npc('voss', V(-2.5, 0.15, -5), Math.PI);
    s.control(false);
    void s.fade(0, 2);
    await s.card('CHAPTER FIVE', 'THE HOSPITAL', 'BELLWETHER CENTRAL');
    s.control(true);
    for (const n of [maya, reyes, voss]) n.lookTarget = () => g.player.head;
    await s.say('REYES', 'Look who it is. You find what you were looking for?');
    await s.say('ELIAS', '...I don\'t know yet.');
    await s.say('MAYA', 'Admissions logs. Six hundred people in the last week before the disappearance. Same complaints. Every one.');
    await s.say('VOSS', 'Records room. Ground floor, east wing.');
    for (const n of [maya, reyes, voss]) {
      n.lookTarget = null;
      n.follow();
    }
    s.objective('BELLWETHER CENTRAL', 'Find the records room');
    await s.zone([-6, -1, 2], [6, 3, 14]);
    s.checkpoint(V(0, 0, 4), 0);
    await s.use('intake', V(0, 1.2, 8.4), 'Intake log', { radius: 2.2 });
    audio.paper();
    await g.hud.doc('PATIENT INTAKE — OCT 8 – OCT 14', '#5512  M, 34  "Same dream as my wife. Stairs going down, a hum."\n#5513  F, 61  Lost time. Found standing in street at 3 AM, facing downtown.\n#5519  M, 12  Hears his grandmother. Grandmother deceased 2004.\n#5523  F, 29  Saw her neighbour walk through a wall. Neighbour was at work.\n#5530  M, 45  "Remembers" a car accident that did not happen.\n#5541  F, 8   Says "the big black thing" is "very sad".\n\nNOTE (Dr. Ruiz): Recommend notifying DOE liaison. This is not mass hysteria.');
    await s.say('MAYA', 'Identical nightmares. Missing time. Voices. People seeing people who weren\'t there.');
    await s.say('REYES', 'Sounds like my unit after Fallujah.');
    await s.say('MAYA', 'Six hundred civilians, Daniel.');
    // the corridor is not empty
    s.objective('EAST WING', 'Get through the wards');
    await s.zone([16, -1, 16], [23, 3, 20]);
    const a = g.spawn('mimic', V(19.6, 0, 34), Math.PI);
    const b = g.spawn('mimic', V(19, 0, 52), Math.PI);
    for (const n of [maya, reyes, voss]) n.hold();
    void maya.goto(V(14, 0, 14));
    void reyes.goto(V(16, 0, 14.4));
    void voss.goto(V(12.6, 0, 13.8));
    await s.say('REYES', 'Contact. Two of them. Don\'t move.', { dur: 2 });
    await s.say('MAYA', 'They\'re not looking at us. They\'re... listening.', { dur: 2.4 });
    await s.say('VOSS', 'Elias. Quietly. We\'ll draw them if we all go.');
    g.hud.hints([['C', 'Crouch — move silently'], ['Shift', 'Running makes noise']]);
    s.objective('EAST WING', 'Sneak past them to the records room');
    s.checkpoint(V(19.5, 0, 18), 0);
    let mimicLine = 0;
    g.world!.onUpdate(() => {
      if (mimicLine === 0 && g.player.pos.z > 28) {
        mimicLine = 1;
        audio.voice(a.headPos, { pitch: 230, vowels: 'eiaao', dur: 1.6, vol: 0.2, distort: 0.3, stutter: 0.2 });
        g.hud.showSub('???', 'E-Elias... over here... I\'m hurt, Elias...', false, 3);
      }
    });
    await s.zone([20, -1, 45], [23, 3, 51]);
    g.hud.hints(null);
    await s.say('ELIAS', 'Door\'s sealed. Card lock.', { dur: 2 });
    await s.thought('Eleven years ago, somebody propped it open.', 3);
    g.hud.hints([['Q', 'Enter Echo']]);
    const nurse = g.ghost('civ_nurse', [V(20.5, 0, 52), V(23.5, 0, 48), V(28, 0, 48)], { loop: false, speed: 1.2 });
    void nurse;
    await s.zone([22.3, -1, 46], [27, 3, 50]);
    g.hud.hints(null);
    s.checkpoint(V(25, 0, 48), Math.PI / 2);
    await s.until(() => !g.echo.active);
    await s.use('records', V(36, 1.1, 52), 'Patient records terminal', { radius: 2 });
    audio.click('key');
    await g.hud.doc('DOE LIAISON — RESTRICTED', 'PROJECT ORPHEUS — MEDICAL ANNEX\n\nCivilian symptom clusters correlate with ORPHEUS field tests (see schedule). Intensity rises with proximity to the Civic Center shaft.\n\nPaediatric resonance remains significantly higher than adult. Subject E.V. continues to show the strongest coupling ever recorded.\n\nRecommendation: postpone the Oct 14, 02:17 full activation.\n\nRESPONSE (A. VOSS): Denied. We will not get another window.');
    await s.thought('Subject E.V.', 2.4);
    await s.say('ELIAS', 'Voss. Maya. Get to radiology, now.', { radio: true });
    // regroup in radiology (through the lab door)
    if (!a.dead || !b.dead) {
      a.awareness = 0;
      b.awareness = 0;
    }
    for (const r of [a, b]) {
      r.actor.dispose();
      r.removed = true;
    }
    g.enemies = [];
    maya.place(V(27, 0, 21), 0);
    voss.place(V(30, 0, 25), Math.PI);
    reyes.place(V(31, 0, 30), Math.PI);
    s.objective('RADIOLOGY', 'Meet the team');
    await s.zone([22.5, -1, 16.5], [39, 3, 27.8]);
    await s.cut(async () => {
      s.cam(V(24.5, 1.7, 25), V(26.5, 1.2, 20.5), 42);
      maya.lookTarget = V(26, 1.0, 20);
      await s.say('MAYA', 'I ran the medical isotopes. Iodine-131 in the pharmacy. Technetium in the scanners. Things that decay on a clock you can\'t argue with.');
      await s.camTo(V(25.6, 1.6, 23.6), V(27, 1.5, 21), 4, 34);
      await s.say('MAYA', 'Eleven years should have turned them to nothing. They\'ve barely decayed. It reads like... seventeen minutes.');
      await s.say('REYES', 'Seventeen minutes? Since what?');
      maya.lookTarget = () => g.player.head;
      await s.say('MAYA', 'Since 2:17. Bellwether didn\'t cease to exist.', { dur: 3.2 });
      audio.stinger('reveal');
      await s.say('MAYA', 'It existed somewhere else. Somewhere almost no time passed.', { dur: 4 });
      s.cam(V(29, 1.7, 22.5), V(30, 1.6, 25), 40);
      voss.lookTarget = V(34, 1.2, 22);
      await s.say('VOSS', 'Meridian Tower. Top floors. The relay we left there can reach the field station. We need to report this.', { dur: 4 });
      await s.say('ELIAS', 'Who is Subject E.V., Voss?', { dur: 2.6 });
      voss.lookTarget = () => g.player.head;
      await s.wait(1.2);
      await s.say('VOSS', 'I don\'t know.', { dur: 2 });
      await s.wait(0.6);
    });
    await s.fade(1, 1.8);
  },
};

export type { Script };
