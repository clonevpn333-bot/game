import * as THREE from 'three';
import type { Chapter } from './index';
import { V } from './common';
import { island } from './ch8';
import { M, coneMaterial, glowMaterial } from '../render/Materials';
import { SKY } from '../render/Sky';
import { audio } from '../audio/AudioEngine';
import type { World } from '../world/World';
import type { Game, Script } from '../game/Game';
import { Actor } from '../actors/Characters';
import { G } from '../render/Globals';

let reyesTrue: Actor | null = null;
let reyesBroken: Actor | null = null;
let portal: THREE.Mesh | null = null;

function buildBetween(W: World, g: Game): void {
  const L = M();
  island(W, -8, -8, 8, 8, 0, L.sidewalk, 8);
  // path of alternating-reality stepping stones (z 10..70)
  const stones: [number, number, number, 'echo' | 'present' | 'always'][] = [
    [0, 0, 12, 'always'], [1.5, 0.4, 16.5, 'echo'], [-1, 0.8, 21, 'echo'], [1, 1.2, 25.5, 'always'], [-1.5, 1.6, 30, 'present'], [1, 2.0, 34.5, 'present'],
    [-0.5, 2.4, 39, 'always'], [1.5, 2.8, 43.5, 'echo'], [-1, 3.2, 48, 'echo'], [1, 3.6, 52.5, 'echo'], [0, 4.0, 57, 'always'], [0, 4.2, 61.5, 'present'], [0, 4.4, 66, 'always'],
  ];

  for (const [x, y, z, layer] of stones) {
    const mat = layer === 'echo' ? L.concrete : layer === 'present' ? L.asphalt : L.sidewalk;
    W.boxC([x, y - 0.25, z], [3.4, 0.5, 3.4], mat, (x * z) % 1, { layer: layer === 'always' ? 'always' : layer, uv: 2 });
    if (layer === 'echo') W.light({ x, y: y + 0.4, z }, '#80e8ff', { intensity: 0, noLight: true, glow: 1.0, pool: false, layer: 'echo' });
  }
  // convergence island where Reyes waits (z 72..100)
  island(W, -14, 72, 14, 100, 4.4, L.concrete, 14);
  for (const x of [-12, 12]) W.light({ x, y: 9, z: 86 }, '#e0a0ff', { intensity: 18, distance: 20, glow: 0.9, cone: 2.6, poolY: 4.4 });
  // the tear back to Bellwether
  portal = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.25, 12, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.4, 2.6) }));
  portal.position.set(0, 7, 98);
  W.add(portal);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(2.3, 48), glowMaterial('#f0e8ff', 1.2, 'portal'));
  fill.position.set(0, 7, 98.05);
  fill.rotation.y = Math.PI;
  W.add(fill);
  W.light({ x: 0, y: 7, z: 96 }, '#f0e0ff', { intensity: 30, distance: 24, glow: 0, pool: false });
  W.box([-2.4, 4.4, 97], [2.4, 4.5, 99], L.black, { collide: false });
  // the seam: a pale wall of light Reyes walks behind in the Echo
  const seam = new THREE.Mesh(new THREE.PlaneGeometry(4, 60), coneMaterial('#a0f0ff', 0.25));
  seam.position.set(6.5, 4, 40);
  seam.rotation.y = Math.PI / 2;
  W.add(seam, 'echo');
  // backdrop of folded city
  for (let i = 0; i < 14; i++) {
    const a = i * 0.9;
    island(W, Math.cos(a) * 60 - 6, 40 + Math.sin(a) * 60 - 6, Math.cos(a) * 60 + 6, 40 + Math.sin(a) * 60 + 6, -6 + (i % 5) * 7, L.asphalt, 8);
  }
  W.physics.killY = -20;
  W.physics.floorY = -1000;
  void g;
}

export const ch9: Chapter = {
  id: 'ch9', num: 'CHAPTER NINE', title: 'Reyes', sub: 'Between',
  env: {
    sky: SKY.other, fog: '#160a28', fogDensity: 0.011, rain: 0, envKind: 'other', exposure: 1.15,
    hemi: ['#9070e0', '#140a24', 0.4], moon: { color: '#d8c0ff', intensity: 0.5, dir: [-0.3, 1, 0.4] }, reverb: [6, 0.6], motes: 1, bloom: 0.8,
    floorY: -1000, grade: { sat: 0.95, tint: '#f0e6ff', vignette: 1.05 },
  },
  chars: ['elias', 'maya', 'reyes', 'remnant'],
  echoUnlocked: true,
  gun: true,
  seed: 9,
  build(W, g) {
    buildBetween(W, g);
    reyesTrue = new Actor('reyes');
    reyesBroken = new Actor('reyes', 'remnant');
    for (const a of [reyesTrue, reyesBroken]) {
      a.root.position.set(6.5, 1, 20);
      a.root.rotation.y = 0;
      W.add(a.root);
    }
    reyesTrue.root.visible = false;
    reyesBroken.root.visible = false;
    W.onUpdate((dt, t) => {
      reyesTrue?.update(dt);
      reyesBroken?.update(dt);
      if (portal) portal.rotation.z += dt * 0.6;
      G.uWarp.value = 0.15 + Math.sin(t * 0.4) * 0.05;
    });
    W.spawn.set(0, 0, -4);
    W.spawnYaw = 0;
  },
  ambience() {
    audio.drone(0.1, 29.1, 1.3);
    audio.wind(0.2);
  },
  shots: {
    path(g) {
      g.player.teleport(V(0, 2.0, 37), Math.PI * 0.05);
      g.echo.enter(30, true);
      g.player.snapCamera();
    },
  },
  async run(s) {
    const g = s.g;
    g.hud.setFade(1);
    const maya = g.npc('maya', V(-2, 0, -3), 0);
    s.control(false);
    void s.fade(0, 2.5);
    await s.card('CHAPTER NINE', 'REYES', 'BETWEEN');
    s.control(true);
    maya.follow(V(-1.4, 0, -2));
    await s.say('MAYA', 'The stones. Some of them are only there when you\'re... not here.', { dur: 3 });
    g.hud.hints([['Q', 'Enter Echo']]);
    s.objective('BETWEEN', 'Find Reyes');
    // Reyes is only visible in the Echo, walking beside the path behind the seam
    let rz = 14;
    let talk = 0;
    const lines = [
      'Vale? I can see you. You look like a photograph. Like somebody took you and left the picture.',
      'It\'s cold here. You know what\'s funny? I\'m not scared. I should be scared.',
      'My hands look wrong, man. Don\'t look at my hands.',
      'Tell Chen she\'s smart. Smartest one of us. Don\'t tell her I said it.',
    ];
    g.world!.onUpdate((dt) => {
      if (!reyesTrue || !reyesBroken) return;
      const show = g.echo.t > 0.5;
      const target = Math.min(70, g.player.pos.z + 4);
      rz += Math.sign(target - rz) * Math.min(Math.abs(target - rz), dt * 2.2);
      for (const a of [reyesTrue, reyesBroken]) {
        a.root.position.set(6.5, Math.max(0, (rz - 12) * 0.08), rz);
        a.speed = Math.abs(target - rz) > 0.2 ? 1.6 : 0;
      }
      const glitch = Math.random() < 0.08 + (rz / 70) * 0.25;
      reyesTrue.root.visible = show && !glitch;
      reyesBroken.root.visible = show && glitch;
      if (show && talk < lines.length && g.player.pos.z > 14 + talk * 13) {
        audio.voice(reyesTrue.root.position, { pitch: 110, vowels: 'aoeao', dur: 1.2, vol: 0.12, distort: 0.3 + talk * 0.2, stutter: 0.2 + talk * 0.1 });
        g.hud.showSub('REYES', lines[talk], true, 5);
        talk++;
      }
    });
    await s.zone([-14, 3, 72], [14, 9, 80]);
    g.hud.hints(null);
    s.checkpoint(V(0, 4.4, 76), 0);
    maya.place(V(-2, 4.4, 74), 0);
    // he is here — but not all of him
    for (const a of [reyesTrue!, reyesBroken!]) a.root.position.set(0, 4.4, 90);
    let flick = true;
    g.world!.onUpdate(() => {
      if (!flick || !reyesTrue || !reyesBroken) return;
      const gl = Math.random() < 0.3;
      reyesTrue.root.visible = !gl;
      reyesBroken.root.visible = gl;
      reyesTrue.root.rotation.y = Math.PI;
      reyesBroken.root.rotation.y = Math.PI;
    });
    await s.cut(async () => {
      s.cam(V(2.5, 6.2, 84), V(0, 5.6, 90), 40);
      await s.say('MAYA', 'Daniel...', { dur: 2 });
      audio.voice(V(0, 6, 90), { pitch: 100, vowels: 'aoe', dur: 1.0, vol: 0.15, distort: 0.6, stutter: 0.3 });
      await s.say('REYES', 'Hey, doc. Hey, Vale. Don\'t come closer. I keep... slipping.', { dur: 4 });
      await s.camTo(V(1.2, 6, 87.4), V(0, 6.0, 90), 4, 32);
      await s.say('REYES', 'There\'s a door behind me. Back to the real one. To home. I can feel it.', { dur: 4 });
      await s.say('ELIAS', 'Then we all go through.', { dur: 2.2 });
      await s.say('REYES', 'Yeah. About that.', { dur: 2 });
      audio.stutterClicks(V(0, 5, 70), 0.25, 30);
      audio.screech(V(0, 5, 70), 0.4, 0.8);
      s.cam(V(0, 7.5, 92), V(0, 5, 72), 50);
      await s.say('REYES', 'They followed you. They always follow you.', { dur: 3 });
    });
    flick = false;
    reyesBroken!.root.visible = false;
    reyesTrue!.root.visible = true;
    // the horde
    s.objective('THE DOOR', 'Hold them back');
    const reyesNpc = g.npc('reyes', V(0, 4.4, 92), Math.PI);
    reyesTrue!.root.visible = false;
    reyesNpc.shooter = true;
    reyesNpc.hold(Math.PI);
    await s.fight([
      { kind: 'rusher', pos: V(-4, 4.4, 74), yaw: 0 },
      { kind: 'rusher', pos: V(4, 4.4, 73), yaw: 0, delay: 0.6 },
      { kind: 'crawler', pos: V(0, 4.4, 72), yaw: 0, delay: 1.2 },
      { kind: 'splitter', pos: V(-8, 4.4, 80), yaw: 0, delay: 1.5 },
      { kind: 'rusher', pos: V(8, 4.4, 78), yaw: 0, delay: 1.5 },
      { kind: 'watcher', pos: V(0, 4.4, 74), yaw: 0, delay: 2 },
    ]);
    reyesNpc.shooter = false;
    // more keep coming; the door is closing
    await s.cut(async () => {
      s.cam(V(-3, 6, 86), V(0, 6, 96), 44);
      audio.rumble(4, 0.8);
      s.shake(0.6);
      await s.say('MAYA', 'There\'s more! Dozens!', { dur: 2 });
      await s.say('REYES', 'Door\'s closing. It only stays open if something holds it.', { dur: 3 });
      void reyesNpc.goto(V(0, 4.4, 96.4), true);
      await s.wait(1.6);
      reyesNpc.faceYaw = Math.PI;
      reyesNpc.actor.setPose('hold_door');
      s.cam(V(2.4, 5.4, 93), V(0, 6.2, 96.8), 36);
      await s.say('ELIAS', 'Reyes. No.', { dur: 2 });
      await s.say('REYES', 'Twenty years I went where nobody should go. Least I can do is hold the door on the way out.', { dur: 5 });
      await s.say('MAYA', 'Daniel, please—', { dur: 1.8 });
      await s.say('REYES', 'Hey. Chen. You\'re the smartest one of us. Don\'t tell anybody I said it.', { dur: 4.5 });
      audio.pianoPhrase([['A3', 0], ['C4', 1], ['E4', 2], ['D4', 4], ['C4', 5], ['A3', 6]], 0.75, 0.06);
      await s.say('REYES', 'Go home, Vale. Go get your sister.', { dur: 3.6 });
    });
    s.objective('THE DOOR', 'Go through');
    maya.follow();
    await s.near(V(0, 4.4, 97), 2.8);
    await s.cut(async () => {
      s.cam(V(0, 6.5, 99.5), V(0, 5.6, 92), 52);
      reyesNpc.actor.root.visible = false;
      reyesBroken!.root.position.set(0, 4.4, 96.6);
      reyesBroken!.root.rotation.y = Math.PI;
      reyesBroken!.root.visible = true;
      reyesBroken!.setPose('hold_door');
      await s.wait(2);
      await s.say('REYES', 'Funny... I\'m still not scared...', { radio: true, dur: 3 });
      await s.fade(1, 1.2, true);
    });
  },
};

export type { Script };
