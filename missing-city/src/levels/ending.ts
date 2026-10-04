import type { Chapter } from './index';
import { V } from './common';
import { island } from './ch8';
import { buildOrchard } from './ch1';
import { orpheusStructure, animateOrpheus } from './orpheus';
import { M } from '../render/Materials';
import { SKY } from '../render/Sky';
import { audio } from '../audio/AudioEngine';
import type { World } from '../world/World';
import type { Game, Script } from '../game/Game';
import { Actor, CIVILIANS } from '../actors/Characters';
import { G } from '../render/Globals';

const CORE = V(0, 300, 0);
let orph: ReturnType<typeof orpheusStructure> | null = null;
let pulse = 0.8;

function buildCore(W: World, g: Game): void {
  const L = M();
  island(W, CORE.x - 18, CORE.z - 18, CORE.x + 18, CORE.z + 30, CORE.y, L.concreteDark, 20);
  orph = orpheusStructure(1.6);
  orph.group.position.set(CORE.x, CORE.y, CORE.z - 8);
  W.add(orph.group);
  W.physics.add({ cx: CORE.x, cy: CORE.y + 10, cz: CORE.z - 8, hx: 4, hy: 10, hz: 4 });
  W.light({ x: CORE.x, y: CORE.y + 4, z: CORE.z - 2 }, '#c8a8ff', { intensity: 40, distance: 40, glow: 2, pool: false });
  // Bellwether at dawn, where everyone comes home
  buildOrchard(W, { boundary: true });
  void g;
}

const DAWN = {
  sky: SKY.sunrise, fog: '#c8a890', fogDensity: 0.006, rain: 0, envKind: 'sunrise' as const, exposure: 1.0,
  hemi: ['#ffd8b0', '#403020', 0.9] as [string, string, number], moon: { color: '#ffd0a0', intensity: 2.2, dir: [0.25, 0.25, -1] as [number, number, number] },
  reverb: [1.6, 0.2] as [number, number], bloom: 0.5, grade: { sat: 1.05, tint: '#fff4ea', vignette: 0.8 },
};

export const ending: Chapter = {
  id: 'end', num: 'EPILOGUE', title: '2:17', sub: 'Home',
  env: {
    sky: SKY.otherPale, fog: '#d8c8f0', fogDensity: 0.008, rain: 0, envKind: 'other', exposure: 1.05,
    hemi: ['#ffffff', '#806aa0', 0.7], moon: { color: '#ffffff', intensity: 0.8, dir: [0.2, 1, 0.3] }, reverb: [7, 0.6], motes: 1.2, bloom: 0.9,
    floorY: -1000, grade: { sat: 0.9, tint: '#fff8ff', vignette: 0.9 },
  },
  chars: ['elias', 'maya', 'ellie', 'civ_man', 'civ_woman', 'civ_office', 'civ_nurse', 'civ_kid'],
  echoUnlocked: false,
  gun: false,
  seed: 12,
  build(W, g) {
    buildCore(W, g);
    pulse = 0.8;
    W.onUpdate((dt, t) => orph && animateOrpheus(orph, dt, t, pulse));
    W.spawn.set(CORE.x, CORE.y, CORE.z + 24);
    W.spawnYaw = Math.PI;
  },
  ambience() {
    audio.drone(0.08, 32.7, 0.2);
  },
  shots: {
    core(g) {
      g.player.teleport(V(CORE.x + 2, CORE.y, CORE.z + 14), Math.PI);
      g.player.camPitch = 0.3;
      g.player.snapCamera();
    },
    dawn(g) {
      g.applyEnv({ ...g.world!.env, ...DAWN, floorY: 0 } as never);
      g.player.teleport(V(1, 0, -50), Math.PI);
      g.player.camPitch = 0.05;
      g.player.camYaw = 0;
      g.player.snapCamera();
    },
  },
  async run(s) {
    await core(s);
    await dawn(s);
  },
};

async function core(s: Script): Promise<void> {
  const g = s.g;
  g.hud.setFade(1);
  g.hud.setFade(1);
  const maya = g.npc('maya', V(CORE.x - 2, CORE.y, CORE.z + 26), Math.PI);
  const ellie = g.npc('ellie', V(CORE.x + 1.6, CORE.y, CORE.z + 25.5), Math.PI);
  s.control(false);
  void s.fade(0, 3, true);
  await s.card('', '2:17', 'THE CORE');
  s.control(true);
  maya.follow(V(-1.6, 0, -1.4));
  ellie.follow(V(1.3, 0, -1.2));
  s.objective('ORPHEUS', 'Approach the structure');
  await s.near(V(CORE.x, CORE.y, CORE.z + 2), 9);
  await s.cut(async () => {
    g.player.teleport(V(CORE.x, CORE.y, CORE.z + 7), Math.PI);
    maya.place(V(CORE.x - 2, CORE.y, CORE.z + 9), Math.PI);
    ellie.place(V(CORE.x + 1.4, CORE.y, CORE.z + 9.2), Math.PI);
    maya.hold(Math.PI);
    ellie.hold(Math.PI);
    s.cam(V(CORE.x + 6, CORE.y + 2, CORE.z + 14), V(CORE.x, CORE.y + 8, CORE.z - 8), 46);
    pulse = 1.2;
    await s.wait(1.5);
    await s.say('MAYA', 'It\'s not a machine. It\'s a door. It holds whatever it\'s given.', { dur: 3.6 });
    await s.say('MAYA', 'If it lets go, everything it\'s holding falls. Bellwether. Them. Us. Unless something holds it open from inside.', { dur: 5 });
    s.cam(V(CORE.x - 2, CORE.y + 1.6, CORE.z + 4), g.player.head, 38);
    await s.say('ELIAS', 'Someone has to stay connected to it.', { dur: 2.8 });
    await s.say('MAYA', 'Elias, no. We find another way. Voss can—', { dur: 2.6 });
    await s.say('ELIAS', 'It listened to me once. It\'ll listen again.', { dur: 3 });
    s.cam(V(CORE.x + 2.8, CORE.y + 1.1, CORE.z + 7.4), V(CORE.x + 1.4, CORE.y + 0.9, CORE.z + 9.2), 34);
    ellie.lookTarget = () => g.player.head;
    await s.say('ELLIE', 'Eli? You\'re coming too, right?', { dur: 2.6 });
    s.cam(V(CORE.x + 0.6, CORE.y + 1.3, CORE.z + 8.4), g.player.head, 30);
    await s.say('ELIAS', 'Go with Maya. Hold her hand the whole way. Don\'t let go, okay?', { dur: 4 });
    await s.say('ELLIE', 'But you\'ll come right back. That\'s the rule.', { dur: 3 });
    audio.ellieTheme(0.06, 1.25);
    await s.wait(1.5);
    await s.say('ELIAS', 'I\'ll be right behind you.', { dur: 3.4 });
    await s.wait(1.2);
  });
  s.objective('ORPHEUS', 'Connect');
  await s.use('connect', V(CORE.x, CORE.y + 1.2, CORE.z - 3), 'Hold the door', { radius: 3.2 });
  await s.cut(async () => {
    s.cam(V(CORE.x + 3, CORE.y + 1.8, CORE.z + 6), V(CORE.x, CORE.y + 1.6, CORE.z - 3), 44);
    void s.camTo(V(CORE.x + 1.2, CORE.y + 1.6, CORE.z + 2), V(CORE.x, CORE.y + 2, CORE.z - 6), 10, 36);
    g.player.actor.play('reach', { hold: true });
    pulse = 2.4;
    G.uWarp.value = 0.3;
    audio.pad(['A2', 'E3', 'A3', 'C#4', 'E4'], 16, 0.06, 6);
    audio.rumble(6, 0.6);
    await s.wait(3);
    await s.thought('Everyone. Come home.', 3.4);
    for (let i = 0; i <= 40; i++) {
      g.engine.post.uWhite.value = (i / 40) * 1.2;
      await s.wait(0.08);
    }
    await s.fade(1, 1, true);
  }, { keepControlAfter: false });
  g.engine.post.uWhite.value = 0;
  G.uWarp.value = 0;
}

async function dawn(s: Script): Promise<void> {
  const g = s.g;
  // sunrise over Bellwether
  g.applyEnv({ ...g.world!.env, ...DAWN, floorY: 0, floorSurface: 'wet' } as never);
  g.player.actor.root.visible = false;
  for (const n of g.npcs.values()) n.actor.root.visible = false;
  orph!.group.visible = false;
  const walkers: Actor[] = [];
  for (let i = 0; i < 16; i++) {
    const a = new Actor(CIVILIANS[i % CIVILIANS.length]);
    const x = -8 + (i % 4) * 5 + Math.sin(i) * 1.2;
    const z = -10 + Math.floor(i / 4) * 9;
    a.root.position.set(x, 0.05, z);
    a.root.rotation.y = Math.PI + Math.sin(i * 3) * 0.6;
    if (i % 5 === 1) a.setPose('look_around');
    else if (i % 5 === 3) a.setPose('look_up');
    g.world!.add(a.root);
    walkers.push(a);
  }
  g.world!.onUpdate((dt) => {
    walkers.forEach((a, i) => {
      if (!a.poseName) {
        a.speed = 0.8 + (i % 3) * 0.15;
        a.root.position.x += Math.sin(a.root.rotation.y) * dt * a.speed;
        a.root.position.z += Math.cos(a.root.rotation.y) * dt * a.speed;
      }
      a.update(dt);
    });
  });
  const maya = g.npcs.get('maya')!;
  const ellie = g.npcs.get('ellie')!;
  maya.actor.root.visible = true;
  ellie.actor.root.visible = true;
  maya.place(V(-1, 0, -63), 0);
  ellie.place(V(0.2, 0, -63.4), 0);
  maya.hold(0);
  ellie.hold(0);
  audio.stopAllLoops(1);
  audio.wind(0.06);
  await s.cut(async () => {
    s.cam(V(4, 3.5, -78), V(0, 8, 20), 50);
    void s.fade(0, 4, true);
    audio.pad(['C3', 'G3', 'E4'], 14, 0.05, 4);
    audio.pianoPhrase([['C4', 0], ['E4', 1], ['G4', 2], ['E4', 3], ['F4', 4], ['A4', 5], ['G4', 6]], 0.9, 0.06);
    await s.camTo(V(2, 2.4, -66), V(0, 4, 10), 10, 44);
    g.hud.showSub('', 'Bellwether returned at 2:34 AM.', false, 4);
    await s.wait(4.5);
    g.hud.showSub('', '2,301,447 people walked out into a morning eleven years in the future.', false, 5);
    await s.wait(5.5);
    g.hud.showSub('', 'For them, seventeen minutes had passed.', false, 4);
    await s.wait(4.5);
    s.cam(V(-3.5, 1.4, -70), V(-0.2, 1.0, -63), 32);
    ellie.faceYaw = Math.PI;
    await s.wait(2.5);
    ellie.faceYaw = 0;
    await s.camTo(V(-1.8, 1.1, -66.5), V(0.2, 1.05, -63.2), 5, 28);
    audio.musicBoxNote(659, 0, 0.06);
    await s.wait(2.5);
    g.hud.showSub('', 'Agent Elias Vale was never found.', false, 4);
    await s.wait(5);
    await s.fade(1, 3);
  }, { keepControlAfter: false });
  await s.wait(2);
  await g.hud.credits([
    ['A STORY OF', 'BELLWETHER'],
    ['ELIAS VALE', 'The one who came home'],
    ['MAYA CHEN', 'Field scientist'],
    ['DANIEL REYES', 'Who held the door'],
    ['DR. ADRIAN VOSS', 'Program director, Project Orpheus'],
    ['ELLIE VALE', 'Age eight'],
    ['CHARACTERS', 'Built in Blender on the CC0 MakeHuman base mesh'],
    ['ENGINE', 'Three.js · Web Audio'],
    ['MUSIC & SOUND', 'Synthesised in the browser'],
  ], 50);
}

export type { Script };
