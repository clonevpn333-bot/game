import * as THREE from 'three';
import type { Chapter } from './index';
import { V } from './common';
import { valeHouse, house } from './ch4';
import { island } from './ch8';
import { orpheusStructure, animateOrpheus } from './orpheus';
import { M, texturedMaterial, coneMaterial } from '../render/Materials';
import { SKY } from '../render/Sky';
import { signTexture } from '../render/Textures';
import { audio } from '../audio/AudioEngine';
import type { World } from '../world/World';
import type { Game, Script } from '../game/Game';
import { G } from '../render/Globals';

const MEM = V(0, 0, -200); // memory stage
let mini: ReturnType<typeof orpheusStructure> | null = null;
let pulse = 0.3;
let clock: THREE.Mesh | null = null;

function buildFrozenHome(W: World, g: Game): void {
  const L = M();
  island(W, -10, -14, 30, 22, 0, L.grass, 14);
  W.box([-10, -0.05, -14], [30, 0.12, 22], L.grass, { uv: 3, surface: 'dirt', cast: false });
  valeHouse(W, 0, 0);
  house(W, 0, 0, 14, 12, L.siding, { porch: true, lit: 1, door: false, skipBody: true });
  // the kitchen clock: 2:17 — or seventeen minutes later
  const mk = (t: string) => texturedMaterial(signTexture(t, { bg: '#f4f0e6', fg: '#1a1a1a', w: 256, h: 128, font: '700 72px "Courier New", monospace' }), 0.5);
  clock = W.quad(mk('2:17'), { x: 13.78, y: 2.1, z: 3 }, 0.5, 0.25, -Math.PI / 2, { dynamic: true }) as THREE.Mesh;
  clock.userData.late = mk('2:34');
  // void dressing: drifting fragments of the neighbourhood
  for (let i = 0; i < 14; i++) {
    const a = i * 0.8;
    const r = 50 + (i % 4) * 20;
    island(W, Math.cos(a) * r - 5, 4 + Math.sin(a) * r - 5, Math.cos(a) * r + 5, 4 + Math.sin(a) * r + 5, -8 + (i % 6) * 8, L.grass, 6);
  }
  // memory stage: white floor, a chair, a small Orpheus
  W.box([MEM.x - 14, -0.2, MEM.z - 14], [MEM.x + 14, 0, MEM.z + 14], L.plasticWhite, { uv: 4 });
  W.boxC([MEM.x, 0.5, MEM.z], [0.7, 1.0, 0.7], L.metalDark, 0);
  W.boxC([MEM.x, 1.3, MEM.z - 0.3], [0.7, 0.9, 0.12], L.metalDark, 0, { collide: false });
  W.box([MEM.x - 6, 0, MEM.z + 4], [MEM.x + 6, 1, MEM.z + 4.2], L.metalDark, {});
  W.box([MEM.x - 6, 1, MEM.z + 4.05], [MEM.x + 6, 3, MEM.z + 4.15], L.glass, { noShoot: true });
  mini = orpheusStructure(0.35);
  mini.group.position.set(MEM.x, 0, MEM.z - 9);
  W.add(mini.group);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 4, 10, 24, 1, true), coneMaterial('#ffffff', 0.25));
  cone.position.set(MEM.x, 5, MEM.z);
  W.add(cone);
  W.light({ x: MEM.x, y: 5, z: MEM.z }, '#ffffff', { intensity: 30, distance: 14, glow: 1, pool: false });
  W.physics.killY = -20;
  W.physics.floorY = -1000;
  void g;
}

export const ch10: Chapter = {
  id: 'ch10', num: 'CHAPTER TEN', title: 'Ellie', sub: 'Seventeen minutes',
  env: {
    sky: SKY.other, fog: '#1a0e2c', fogDensity: 0.01, rain: 0, envKind: 'other', exposure: 1.2,
    hemi: ['#c0a0ff', '#20103a', 0.5], moon: { color: '#f0d8ff', intensity: 0.5, dir: [0.3, 1, 0.2] }, reverb: [1.4, 0.25], motes: 0.8, bloom: 0.7,
    floorY: -1000, grade: { sat: 1.0, tint: '#fbf2ff', vignette: 1.0 },
  },
  chars: ['elias', 'maya', 'ellie', 'elias_teen', 'elias_child', 'civ_man', 'civ_woman', 'civ_office', 'voss'],
  echoUnlocked: true,
  gun: true,
  seed: 10,
  build(W, g) {
    buildFrozenHome(W, g);
    pulse = 0.3;
    W.onUpdate((dt, t) => {
      if (mini) animateOrpheus(mini, dt, t, pulse);
      G.uWarp.value = 0.06;
    });
    W.spawn.set(5, 0.15, -8);
    W.spawnYaw = 0;
  },
  ambience() {
    audio.drone(0.06, 36.7, 0.4);
    audio.wind(0.08);
  },
  shots: {
    home(g) {
      g.player.teleport(V(3, 0.15, -6), 0.15);
      g.player.camPitch = 0.12;
      g.player.snapCamera();
    },
    memory(g) {
      g.player.teleport(V(MEM.x + 2, 0, MEM.z + 7), Math.PI);
      g.player.snapCamera();
    },
  },
  async run(s) {
    await home(s);
    await memory(s);
    await after(s);
  },
};

async function home(s: Script): Promise<void> {
  const g = s.g;
  g.hud.setFade(1);
  const maya = g.npc('maya', V(7, 0.15, -9), 0);
  s.control(false);
  void s.fade(0, 3, true);
  await s.card('CHAPTER TEN', 'ELLIE', 'SEVENTEEN MINUTES');
  s.control(true);
  maya.follow();
  await s.say('MAYA', 'Is this...?', { dur: 1.6 });
  await s.say('ELIAS', 'My house. October fourteenth.', { dur: 2.4 });
  s.objective('THE VALE HOUSE', 'Find her');
  await s.zone([0.5, -1, 0.5], [14, 3, 6]);
  await s.thought('The TV on. Two mugs in the sink. Mom and Dad weren\'t home that night. They were with me.', 4.6);
  await s.say('MAYA', 'Elias... then who was here?', { dur: 2.6 });
  // Ellie in her room
  const ellie = g.npc('ellie', V(6.2, 0, 9.2), Math.PI);
  ellie.actor.setPose('sit');
  ellie.hold(Math.PI);
  await s.zone([5.2, -1, 7.8], [10, 3, 12]);
  await s.cut(async () => {
    g.player.teleport(V(7.6, 0, 8.3), Math.PI * 0.85);
    maya.place(V(7.6, 0, 6.8), Math.PI);
    s.cam(V(8.6, 1.3, 9.6), V(6.2, 0.9, 9.6), 40);
    ellie.lookTarget = () => g.player.head;
    await s.wait(1.4);
    await s.say('ELLIE', 'Eli?', { dur: 1.6 });
    ellie.actor.setPose(null);
    await s.say('ELLIE', 'You look weird. You look like Dad.', { dur: 2.6 });
    s.cam(V(6.6, 1.25, 8.6), g.player.head, 36);
    await s.say('ELIAS', 'Ellie. Are you okay? Are you hurt?', { dur: 2.6 });
    s.cam(V(8.2, 1.5, 9.8), V(6.4, 1.0, 9.2), 30);
    await s.say('ELLIE', 'I\'m okay. Everybody outside is being statues. I stayed in my room like you said.', { dur: 4.2 });
    await s.say('ELLIE', 'You said you\'d come right back. It\'s been seventeen minutes. I counted on the kitchen clock.', { dur: 4.6 });
    if (clock) (clock.material as THREE.Material) = clock.userData.late as THREE.Material;
    s.cam(V(6.0, 1.6, 7.0), V(7.6, 1.6, 8.3), 38);
    await s.say('MAYA', '...Seventeen minutes. For them, it\'s only been seventeen minutes.', { dur: 3.6 });
    await s.say('ELIAS', 'Ellie... it\'s been eleven years.', { dur: 3 });
    s.cam(V(8.6, 1.3, 9.6), V(6.2, 1.0, 9.4), 30);
    await s.say('ELLIE', 'No it hasn\'t. Don\'t be dumb.', { dur: 2.4 });
    await s.say('ELLIE', 'You were so scared, Eli. In the room with the big black thing. You were crying.', { dur: 4 });
    audio.ellieTheme(0.05, 1.2);
    await s.say('ELLIE', 'Don\'t you remember?', { dur: 2.4 });
    await s.fade(1, 1.2, true);
  });
}

async function memory(s: Script): Promise<void> {
  const g = s.g;
  // nine years old
  g.player.teleport(V(MEM.x + 2.2, 0, MEM.z + 7.5), Math.PI);
  const child = g.ghost('elias_child', [V(MEM.x, 0.02, MEM.z - 0.15)], { clip: 'chair', always: true });
  child.actor.root.rotation.y = Math.PI;
  const sci = g.ghost('voss', [V(MEM.x - 2, 0, MEM.z + 5.2)], { clip: 'idle', always: true });
  sci.actor.root.rotation.y = Math.PI;
  const tech = g.ghost('civ_office', [V(MEM.x + 2.5, 0, MEM.z + 5.4)], { clip: 'keypad', always: true });
  tech.actor.root.rotation.y = Math.PI;
  g.echo.enter(60, true);
  await s.cut(async () => {
    s.cam(V(MEM.x + 3, 1.6, MEM.z + 6.5), V(MEM.x, 1.0, MEM.z), 40);
    void s.fade(0, 1.5, true);
    pulse = 0.5;
    await s.say('YOUNG VOSS', 'Again, Elias. Think of something you want. Really want.', { dur: 3.4 });
    s.cam(V(MEM.x + 1.2, 1.1, MEM.z + 1.4), V(MEM.x, 0.95, MEM.z), 34);
    await s.say('ELIAS (9)', 'I want a dog. A big one.', { dur: 2.6 });
    pulse = 1.2;
    audio.rumble(1.5, 0.3);
    s.cam(V(MEM.x - 3, 1.7, MEM.z + 6), V(MEM.x, 1.5, MEM.z - 8), 40);
    await s.say('TECHNICIAN', 'Field just spiked forty percent. From a kid wanting a dog.', { dur: 3.4 });
    await s.say('YOUNG VOSS', 'Not a kid. Subject E.V. Log it.', { dur: 3 });
    pulse = 0.4;
    await s.fade(1, 0.8, true);
    // the night of October 14
    child.dispose();
    sci.dispose();
    tech.dispose();
    g.echo.ghosts = [];
    const teen = g.ghost('elias_teen', [V(MEM.x, 0.02, MEM.z - 0.15)], { clip: 'chair', always: true });
    teen.actor.root.rotation.y = Math.PI;
    const dad = g.ghost('civ_man', [V(MEM.x - 1.2, 0, MEM.z + 5.4)], { clip: 'talk', always: true });
    dad.actor.root.rotation.y = Math.PI * 0.8;
    const mom = g.ghost('civ_woman', [V(MEM.x + 1.2, 0, MEM.z + 5.6)], { clip: 'point', always: true });
    mom.actor.root.rotation.y = -Math.PI * 0.8;
    const tech2 = g.ghost('civ_office', [V(MEM.x + 4, 0, MEM.z + 5.4)], { clip: 'keypad', always: true });
    tech2.actor.root.rotation.y = Math.PI;
    s.cam(V(MEM.x - 2.5, 1.7, MEM.z + 7.5), V(MEM.x, 1.2, MEM.z + 2), 44);
    void s.fade(0, 1, true);
    pulse = 0.7;
    await s.say('TECHNICIAN', 'October fourteenth. 2:16 AM. Full activation in sixty seconds.', { dur: 3.6 });
    await s.say('MOM', 'You said it was safe! Look at him, he\'s shaking!', { dur: 3 });
    await s.say('DAD', 'You signed the forms too, Claire. Don\'t you dare put this on me—', { dur: 3.4 });
    await s.say('MOM', 'He\'s eighteen, he\'s still our son, and you sold him to them for a—', { dur: 3.4 });
    await s.say('VOSS (RADIO)', 'This is Voss in Washington. Proceed with activation.', { radio: true, dur: 3.2 });
    s.cam(V(MEM.x + 0.9, 1.1, MEM.z + 1.1), V(MEM.x, 1.05, MEM.z - 0.1), 30);
    teen.actor.setPose('cower');
    audio.heartbeat(0.5);
    await s.wait(1);
    audio.heartbeat(0.6);
    await s.say('DAD', 'Ten seconds. Elias, just do what they say—', { dur: 2.6 });
    await s.say('MOM', 'Ellie\'s alone at home, Mark! She\'s eight!', { dur: 2.6 });
    pulse = 1.6;
    G.uWarp.value = 0.6;
    audio.rumble(3, 0.6);
    s.cam(V(MEM.x + 0.5, 1.05, MEM.z + 0.7), V(MEM.x, 1.1, MEM.z - 0.1), 22);
    await s.thought('Stop. Stop yelling. Everybody stop.', 2.6);
    audio.heartbeat(0.8);
    g.hud.showSub('', 'I want everyone to disappear.', false, 0);
    await s.wait(3.4);
    g.hud.hideSub();
    audio.stinger('reveal');
    for (let i = 0; i < 20; i++) {
      g.engine.post.uWhite.value = i / 20;
      await s.wait(0.04);
    }
    teen.dispose();
    dad.dispose();
    mom.dispose();
    tech2.dispose();
    g.echo.ghosts = [];
    await s.wait(1.5);
  }, { keepControlAfter: false });
  g.echo.exit();
  g.engine.post.uWhite.value = 0;
  G.uWarp.value = 0.06;
}

async function after(s: Script): Promise<void> {
  const g = s.g;
  const maya = g.npcs.get('maya')!;
  const ellie = g.npcs.get('ellie')!;
  g.player.teleport(V(7.6, 0, 8.3), Math.PI * 0.85);
  maya.place(V(7.6, 0, 6.8), Math.PI);
  await s.cut(async () => {
    s.cam(V(6.4, 1.6, 7.4), g.player.head, 36);
    await s.fade(0, 1.5, true);
    await s.say('ELIAS', 'It was me.', { dur: 2.4 });
    await s.say('ELIAS', 'It heard me. It took me literally. Everyone. Two point three million people.', { dur: 4 });
    s.cam(V(8.6, 1.6, 7.0), V(7.6, 1.6, 7.0), 36);
    maya.lookTarget = () => g.player.head;
    await s.say('MAYA', 'Elias. You were a kid strapped into a machine while the adults screamed over your head.', { dur: 4.2 });
    await s.say('MAYA', 'They used you. Voss used you. You didn\'t do this. You survived it.', { dur: 4 });
    ellie.place(V(7.0, 0, 8.6), -Math.PI * 0.4);
    ellie.actor.setPose('hug');
    ellie.lookTarget = () => g.player.head;
    s.cam(V(5.8, 1.2, 9.6), V(7.3, 1.0, 8.4), 34);
    await s.say('ELLIE', 'I\'m not mad. You came back. That\'s the rule.', { dur: 3.6 });
    audio.pianoPhrase([['E4', 0], ['G4', 1], ['A4', 2], ['G4', 3], ['E4', 4], ['D4', 6]], 0.7, 0.05);
    await s.wait(2.5);
    // the world begins to tear
    audio.rumble(5, 0.9);
    s.shake(0.7);
    G.uWarp.value = 0.5;
    g.engine.post.uGlitch.value = 0.6;
    s.cam(V(-6, 6, -8), V(6, 2, 6), 46);
    await s.say('MAYA', 'Elias— the readings. The anomaly is spreading. Past the city line. It\'s pulling the real world in.', { dur: 4.6 });
    await s.say('ELIAS', 'Then I end it where it started.', { dur: 2.6 });
    g.engine.post.uGlitch.value = 0;
    await s.fade(1, 1.5);
  });
  G.uWarp.value = 0;
}
