import * as THREE from 'three';
import type { Chapter } from './index';
import { V } from './common';
import * as K from '../world/Kit';
import { M, signMaterial, texturedMaterial } from '../render/Materials';
import { SKY } from '../render/Sky';
import { drawingTex } from '../render/Textures';
import { audio } from '../audio/AudioEngine';
import type { World } from '../world/World';
import type { Game, Script } from '../game/Game';
import { orpheusStructure, animateOrpheus } from './orpheus';
import { G } from '../render/Globals';

const CAVE_Y = -20;
let orph: ReturnType<typeof orpheusStructure> | null = null;
let pulse = 0.2;

function buildLab(W: World, g: Game): void {
  const L = M();
  const white = L.plasticWhite;
  // arrival: freight elevator platform (y 0) + corridor (z 0..40)
  W.box([-3, -0.2, -6], [3, 0, 0], L.metal, { surface: 'metal' });
  W.box([-3.2, 0, -6], [-3, 4, 0], L.metalDark, {});
  W.box([3, 0, -6], [3.2, 4, 0], L.metalDark, {});
  W.box([-3, 0, -6.2], [3, 4, -6], L.metalDark, {});
  K.room(W, -3, 0, 3, 40, 3.2, white, L.metal, L.plasterWhite, [{ wall: 'n', c: 0, w: 6, h: 3 }, { wall: 's', c: 0, w: 2.4, h: 2.6 }], { floorSurface: 'metal' });
  W.indoor([-30, -30, -6], [30, 6, 80]);
  for (let z = 4; z < 40; z += 6) {
    K.ceilingLight(W, 0, 3.18, z, { color: '#e8f0ff', intensity: 6, distance: 8, flicker: z === 22 ? 0.5 : 0 });
    W.light({ x: 2.6, y: 2.6, z: z + 2 }, '#ff2020', { intensity: 3, distance: 5, glow: 0.3, pool: false, flicker: 0.95 });
  }
  W.quad(signMaterial('PROJECT ORPHEUS', { bg: '#101418', fg: '#d0d8e0', w: 768, h: 160, intensity: 1.6, sub: 'DEPARTMENT OF ENERGY · LEVEL 4 CLEARANCE' }), { x: 0, y: 2.3, z: 0.25 }, 3.4, 0.7, 0);
  // offices off the corridor: documents
  K.desk(W, -2.2, 12, Math.PI / 2, true, true);
  K.desk(W, 2.2, 26, -Math.PI / 2, true, true);
  W.quad(texturedMaterial(drawingTex('eye2', 'eye'), 0.8), { x: -2.92, y: 1.8, z: 18 }, 0.6, 0.45, Math.PI / 2);
  // control room (z 40..52) overlooking the cavern through glass
  W.box([-10, -0.2, 40], [10, 0, 52], L.metal, { surface: 'metal' });
  W.box([-10, 3.4, 40], [10, 3.6, 52], L.metalDark, {});
  W.box([-10.2, 0, 40], [-10, 3.4, 52], white, {});
  W.box([10, 0, 40], [10.2, 3.4, 46], white, {});
  W.box([10, 0, 50], [10.2, 3.4, 52], white, {});
  W.box([10, 2.6, 46], [10.2, 3.4, 50], white, { collide: false });
  W.box([-10, 0, 40], [-3, 3.4, 40.2], white, {});
  W.box([3, 0, 40], [10, 3.4, 40.2], white, {});
  W.box([-10, 0, 51.9], [10, 1.0, 52.1], L.metalDark, {});
  W.box([-10, 1.0, 51.95], [10, 3.4, 52.05], L.glass, { noShoot: true });
  for (let x = -8; x <= 8; x += 4) {
    W.boxC([x, 0.5, 50.6], [3.4, 1.0, 1.2], L.metalDark, 0);
    W.boxC([x, 1.2, 51.0], [3.0, 0.5, 0.05], L.lightCool, 0, { collide: false });
  }
  K.ceilingLight(W, -5, 3.38, 45, { color: '#c0d0ff', intensity: 6, distance: 9 });
  K.ceilingLight(W, 5, 3.38, 45, { color: '#c0d0ff', intensity: 6, distance: 9, flicker: 0.3 });
  // the chair (where it happened)
  W.boxC([7.5, 0.5, 44], [0.7, 1.0, 0.7], L.metalDark, 0);
  W.boxC([7.5, 1.3, 43.7], [0.7, 0.9, 0.12], L.metalDark, 0, { collide: false });
  W.geo(new THREE.TorusGeometry(0.28, 0.05, 6, 16), L.steel, { x: 7.5, y: 1.95, z: 43.9 }, new THREE.Euler(Math.PI / 2, 0, 0), 1);
  // stairs down to the cavern floor via a side gantry (x 10..14)
  W.box([10, 0, 46], [14, 0.1, 50], L.metal, { surface: 'metal' });
  W.ramp([12, CAVE_Y / 2, 66], [3, -CAVE_Y, 32], Math.PI, L.metal, 0);
  W.box([10.4, CAVE_Y, 50], [10.5, 1.1, 82], L.metalDark, { collide: false });
  W.box([13.5, CAVE_Y, 50], [13.6, 1.1, 82], L.metalDark, { collide: false });
  W.physics.add({ cx: 10.45, cy: CAVE_Y / 2, cz: 66, hx: 0.1, hy: 12, hz: 16 });
  W.physics.add({ cx: 13.55, cy: CAVE_Y / 2, cz: 66, hx: 0.1, hy: 12, hz: 16 });
  // cavern
  W.box([-60, CAVE_Y - 0.5, 52], [60, CAVE_Y, 160], L.gravel, { uv: 3, surface: 'dirt' });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r = 50 + (i % 3) * 6;
    const x = Math.cos(a) * r;
    const z = 106 + Math.sin(a) * r * 0.9;
    W.boxC([x, CAVE_Y + 15, z], [10 + (i % 4) * 4, 34, 10], L.concreteDark, a, { collide: true, uv: 4 });
  }
  W.box([-60, CAVE_Y + 32, 52], [60, CAVE_Y + 33, 160], L.concreteDark, { collide: false });
  // scaffolds + work lights ringing the structure
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const x = Math.cos(a) * 20;
    const z = 106 + Math.sin(a) * 20;
    W.boxC([x, CAVE_Y + 4, z], [0.3, 8, 0.3], L.paintYellow, 0);
    W.light({ x, y: CAVE_Y + 8.2, z }, '#e8f0ff', { intensity: 26, distance: 30, glow: 1.0, cone: 3, coneLen: 8, poolY: CAVE_Y, flicker: i === 3 ? 0.6 : 0 });
  }
  // cables snaking to the structure
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const pts = [V(12, CAVE_Y + 0.15, 54), V(Math.cos(a) * 14, CAVE_Y + 0.15, 106 + Math.sin(a) * 14), V(Math.cos(a) * 4, CAVE_Y + 1.5, 106 + Math.sin(a) * 4)];
    const curve = new THREE.CatmullRomCurve3(pts);
    W.geo(new THREE.TubeGeometry(curve, 30, 0.12, 6), L.rubber, { x: 0, y: 0, z: 0 });
  }
  orph = orpheusStructure(1);
  orph.group.position.set(0, CAVE_Y, 106);
  W.add(orph.group);
  W.physics.add({ cx: 0, cy: CAVE_Y + 10, cz: 106, hx: 3, hy: 10, hz: 3 });
  W.light({ x: 0, y: CAVE_Y + 3, z: 106 }, '#9a70ff', { intensity: 30, distance: 40, glow: 0, pool: false });
  W.physics.killY = CAVE_Y - 10;
  void g;
}

export const ch7: Chapter = {
  id: 'ch7', num: 'CHAPTER SEVEN', title: 'Project Orpheus', sub: 'Beneath the Civic Center',
  env: {
    sky: SKY.void, fog: '#05060c', fogDensity: 0.014, rain: 0, envKind: 'lab', exposure: 1.15,
    hemi: ['#4a4a70', '#050508', 0.15], reverb: [4.5, 0.5], motes: 0.7, bloom: 0.75, floorY: -200,
    grade: { sat: 0.9, tint: '#eceaff', vignette: 1.0 },
  },
  chars: ['elias', 'maya', 'reyes', 'voss', 'remnant'],
  echoUnlocked: true,
  gun: true,
  seed: 7,
  build(W, g) {
    buildLab(W, g);
    pulse = 0.2;
    W.onUpdate((dt, t) => orph && animateOrpheus(orph, dt, t, pulse));
    W.spawn.set(0, 0, -3);
    W.spawnYaw = 0;
  },
  ambience() {
    audio.drone(0.12, 27.5, 1.0);
    audio.hum(V(0, 2, 20), 0.05, 50, 0.04);
    audio.hum(V(0, CAVE_Y + 5, 106), 0.12, 36.7, 0.0);
  },
  shots: {
    control(g) {
      g.player.teleport(V(-2, 0, 47), 0);
      g.player.camPitch = 0.05;
      g.player.snapCamera();
    },
    cavern(g) {
      g.player.teleport(V(6, CAVE_Y, 84), -0.25);
      g.player.camPitch = 0.28;
      g.player.snapCamera();
    },
  },
  async run(s) {
    const g = s.g;
    g.hud.setFade(1);
    const maya = g.npc('maya', V(-1.2, 0, -2), 0);
    const reyes = g.npc('reyes', V(1.4, 0, -2.5), 0);
    const voss = g.npc('voss', V(0, 0, -4.6), 0);
    s.control(false);
    void s.fade(0, 2);
    audio.rumble(4, 0.4);
    await s.card('CHAPTER SEVEN', 'PROJECT ORPHEUS', 'BENEATH THE CIVIC CENTER');
    s.control(true);
    await s.say('REYES', 'Department of Energy. Level four. Under a public plaza. Sure. Why not.');
    for (const n of [maya, reyes, voss]) n.follow();
    s.objective('ORPHEUS FACILITY', 'Follow the corridor');
    await s.use('memo', V(-2.2, 1.0, 12), 'Terminal', { radius: 2.2 });
    audio.click('key');
    await g.hud.doc('ORPHEUS — SITE SUMMARY', 'An object was discovered 410 m beneath the Civic Center during geothermal survey drilling.\n\nIt is not of human manufacture.\nRadiometric dating of the surrounding strata exceeds 1.8 billion years. The object appears older than the rock that encased it.\n\nIt reacts — measurably, repeatably — to proximity of conscious subjects. Memory. Emotion. Intent.\n\nIt does not appear to distinguish between what is imagined and what is real.');
    await s.zone([-3, -1, 40], [10, 3, 52]);
    s.checkpoint(V(0, 0, 44), 0);
    // the confession
    await s.cut(async () => {
      voss.place(V(-1.5, 0, 50), 0);
      maya.place(V(2.5, 0, 46.5), -0.4);
      reyes.place(V(5.5, 0, 45), -1.2);
      g.player.teleport(V(0.8, 0, 46.2), 0.2);
      s.cam(V(-4.5, 1.9, 46), V(0, 0, 90), 44);
      pulse = 0.4;
      await s.wait(1.2);
      await s.camTo(V(-3.5, 1.7, 48.4), V(-1.5, 1.6, 50.5), 3, 38);
      voss.lookTarget = V(0, CAVE_Y + 10, 106);
      await s.say('VOSS', 'We called it Orpheus. The man who went into the underworld to bring someone back.');
      await s.say('VOSS', 'I was the program director. Eleven years ago, on October fourteenth, at 2:17 in the morning, we attempted a full activation.');
      await s.say('MAYA', 'And Bellwether disappeared.', { dur: 2.2 });
      voss.lookTarget = () => g.player.head;
      s.cam(V(4.2, 1.6, 47.8), V(-1.5, 1.6, 50.3), 34);
      await s.say('VOSS', 'Immediately afterward. The entire city. I was in Washington that night, reporting the readings. I am the only member of the team who still exists.');
      await s.say('REYES', 'You knew. This whole time, you knew what this was.', { dur: 2.6 });
      await s.say('VOSS', 'I knew what we did. I never knew what it did.');
      s.cam(V(-1, 1.65, 44.5), g.player.head, 42);
      await s.say('ELIAS', 'Subject E.V.', { dur: 2 });
      await s.say('VOSS', 'Orpheus responded to the mind. Weakly, in most people. Children were... clearer.', { dur: 4 });
      await s.say('VOSS', 'There was one child whose resonance was off every scale we had.', { dur: 3.5 });
      await s.say('ELIAS', 'Say the name.', { dur: 1.6 });
      await s.wait(1.2);
      audio.rumble(3, 0.7);
      s.shake(0.5);
      pulse = 0.9;
      await s.say('MAYA', 'Something\'s happening. The structure— it\'s waking up!', { dur: 2.4 });
    });
    voss.lookTarget = null;
    reyes.shooter = true;
    s.objective('CONTROL ROOM', 'Hold them off');
    await s.fight([
      { kind: 'rusher', pos: V(0, 0, 38), yaw: Math.PI, delay: 0.6 },
      { kind: 'splitter', pos: V(-6, 0, 42), yaw: 0, delay: 1.0 },
      { kind: 'rusher', pos: V(0, 0, 30), yaw: 0, delay: 2.5 },
      { kind: 'watcher', pos: V(6, 0, 42), yaw: 0, delay: 1.5 },
      { kind: 'crawler', pos: V(12, 0, 48), yaw: -Math.PI / 2, delay: 2 },
    ]);
    reyes.shooter = false;
    s.checkpoint(V(0, 0, 46), 0);
    await s.say('REYES', 'They\'re coming from down there. From it.');
    await s.say('VOSS', 'They\'re drawn to it. We need to shut down the field emitters at the base. Elias—', { dur: 3 });
    await s.say('ELIAS', 'I know. It wants me.', { dur: 2 });
    for (const n of [maya, reyes, voss]) n.follow();
    s.objective('THE STRUCTURE', 'Go down to the base of Orpheus');
    await s.zone([-30, CAVE_Y - 1, 82], [30, CAVE_Y + 4, 96]);
    // it reaches
    await s.cut(async () => {
      s.cam(V(6, CAVE_Y + 1.6, 86), V(0, CAVE_Y + 9, 106), 50);
      pulse = 1.5;
      G.uWarp.value = 0.4;
      audio.stinger('reveal');
      g.echo.enter(6, true);
      await s.camTo(V(3, CAVE_Y + 1.4, 92), V(0, CAVE_Y + 6, 106), 4, 40);
      audio.ellieTheme(0.06, 0.8);
      await s.say('ELLIE', 'Eli. Eli, come home.', { dur: 3 });
      await s.say('MAYA', 'ELIAS, GET BACK—', { dur: 1.4 });
      s.shake(1);
      g.engine.post.uWhite.value = 0;
      for (let i = 0; i < 20; i++) {
        g.engine.post.uWhite.value = i / 20;
        await s.wait(0.05);
      }
      await s.fade(1, 0.5, true);
    });
    g.engine.post.uWhite.value = 0;
    G.uWarp.value = 0;
  },
};

export type { Script };
