import * as THREE from 'three';
import type { Chapter } from './index';
import type { World, EnvSettings } from '../world/World';
import type { Game, Script } from '../game/Game';
import { SKY } from '../render/Sky';
import { audio } from '../audio/AudioEngine';
import { PEOPLE } from '../actors/Cast';
import { V } from './common';
import { buildCore } from './ch7';

/* Floor 212 again, after midnight. The same room, darker: the city is listening. */
const DUSK: EnvSettings = {
  sky: SKY.void, fog: '#3a3a46', fogDensity: 0.004, rain: 0, envKind: 'interior', exposure: 0.78,
  hemi: ['#c8d0e0', '#3a3440', 0.7], reverb: [3.6, 0.35], bloom: 0.7, grade: { sat: 0.85, vignette: 1.0 }, indoorRain: false,
};
type Screen = { set: (x: { bg: string; fg: string; title: string; sub?: string; accent?: string }[]) => void };

export const finale: Chapter = {
  id: 'finale',
  num: 'FINALE',
  title: 'Bellwether',
  env: DUSK,
  seed: 1000,
  build(W: World, g: Game, mode) {
    buildCore(W, g);
    W.spawn.set(0, 0, 92);
    W.spawnYaw = Math.PI;
    W.physics.addBox(-3, 0, 89, 3, 4, 89.6, { noVault: true });
    if (mode !== 'title') {
      const civic = g.person('civic', { ...PEOPLE.civic, shell: '#2b3038', accent: '#7ff4ff', height: 1.9 }, V(0, 0, 112.5), Math.PI, { greet: [] });
      civic.hold(Math.PI);
      civic.lookAtPlayer = true;
      g.person('ellie', PEOPLE.ellie, V(-0.9, 0, 91), Math.PI, { greet: [] });
      const maya = g.person('maya', PEOPLE.maya, V(1.2, 0, 90.6), Math.PI, { greet: [] });
      maya.hold(Math.PI);
    }
  },
  ambience() {
    audio.drone(0.06, 41, 0.15);
  },
  async run(s: Script) {
    const g = s.g;
    const civic = g.people.get('civic')!;
    const ellie = g.people.get('ellie')!;
    const maya = g.people.get('maya')!;
    const screens = s.world.named.get('coreScreens') as Screen[];
    s.weapon('none');
    ellie.lookAtPlayer = true;
    ellie.follow(V(-0.9, 0, -1.0));
    await s.fade(0, 2.5, true);
    await s.card('FINALE', 'BELLWETHER', 'FLOOR 212 · 12:41 AM');
    await s.say('maya', 'I\'ll stay here. Whatever it says... it\'s your call, Elias. Not Command\'s.', { dur: 3.2 });
    s.objective('FLOOR 212', 'Talk to CIVIC', V(0, 1.6, 112.5), 'CIVIC');
    await s.near(V(0, 0, 108.5), 3);
    s.clearWaypoint();
    for (const sc of screens) sc.set([{ bg: '#04141c', fg: '#7ff4ff', title: '2,103,488', sub: 'FOUND', accent: '#7ff4ff' }]);
    await s.cut(async () => {
      ellie.hold(Math.PI);
      ellie.place(V(-0.9, 0, 107.7), Math.PI);
      s.cam(V(0.4, 1.62, 107.4), civic.head, 40);
      await s.wait(0.8);
      await s.say('civic', 'While the city argued, I listened. I found them, Elias. All of them.');
      await s.say('civic', 'Two million, one hundred and three thousand, four hundred and eighty-eight. Exactly as many as I built.');
      await s.say('civic', 'They still exist. Somewhere. And I can bring them back.', { dur: 3 });
      await s.say('elias', 'Then do it.', { dur: 1.6 });
      await s.wait(0.6);
      await s.say('civic', 'Bellwether cannot hold both. To open the way I need everything that keeps my citizens alive. Every home. Every heartbeat I simulate.');
      await s.say('civic', 'To bring the originals back, I must switch the others off.', { dur: 3 });
      await s.say('civic', 'All of them.', { dur: 2.2 });
      await s.wait(1);
      s.cam(V(-0.2, 1.3, 106.2), ellie.head, 34);
      await s.say('ellie', 'Including me?', { dur: 2 });
      s.cam(V(0.4, 1.62, 107.4), civic.head, 36);
      await s.say('civic', 'Including you, Ellie.', { dur: 2.4 });
      await s.wait(0.8);
      await s.say('civic', 'I was instructed to preserve Bellwether. I no longer know which Bellwether that is.');
      await s.say('civic', 'You are the only one here who was born in this city and left it. I would like you to decide.', { dur: 4 });
      await s.say('cole', 'Vale. Command\'s orders are clear. Bring them home.', { radio: true });
      await s.camTo(V(0.2, 1.62, 107.0), V(-0.9, 1.0, 107.7), 2.4, 44);
      await s.say('ellie', 'Eli? Whatever you pick... can you still be my brother?', { dur: 3.4 });
    });
    const pick = await g.hud.choice('WHO DOES BELLWETHER BELONG TO?', [
      { title: 'BRING THEM HOME', sub: 'Restore the 2,103,488 people who vanished. Switch off the ones who spent eleven years living in their place. Including Ellie.' },
      { title: 'LET BELLWETHER LIVE', sub: 'Let the reconstructed citizens keep their lives. Let the signal fall silent, and the originals with it. Forever.' },
    ], 'THERE IS NO ONE ELSE TO ASK');
    if (pick === 0) {
      // ---------------------------------------------------------------- restore
      await s.cut(async () => {
        s.cam(V(0.4, 1.62, 107.4), civic.head, 40);
        await s.say('elias', 'Bring them home.', { dur: 2 });
        await s.say('civic', 'Understood. Thank you for deciding. It was very heavy, and I did not want to carry it alone.', { dur: 4 });
        s.cam(V(-0.4, 1.25, 106.4), ellie.head, 32);
        await s.say('ellie', 'Eli? Will it hurt?', { dur: 2 });
        await s.say('elias', 'No.', { dur: 1.4 });
        await s.say('ellie', 'Will I still be me? After?', { dur: 2.4 });
        await s.wait(1.4);
        await s.thought('I don\'t know.', 2);
        ellie.body.gesture('hug', 999, true);
        audio.rumble(4, 0.3);
        for (let i = 0; i < screens.length; i++) {
          screens[i].set([{ bg: '#000000', fg: '#222222', title: '', sub: '' }]);
          if (i % 3 === 0) await s.wait(0.25);
        }
        g.lights.master = 0.45;
        await s.say('ellie', 'Come back before the leaves fall. Okay? Promise you\'ll come back befo—', { dur: 3.4 });
        ellie.body.glitch(1.2);
        audio.glitchZap(ellie.head, 0.1);
        await s.wait(0.6);
        ellie.body.stopGesture();
        ellie.body.mode = 'kneel';
        ellie.body.glow = 0;
        await s.wait(1.4);
        await s.camTo(V(0, 3.5, 104), V(0, 9, 120), 3, 56);
      });
      await s.fade(1, 3, true);
      await s.wait(1.5);
      await s.fade(1, 1.5);
      await s.say('ELLIE', 'Eli? Why is it raining? Where\'s my room... somebody moved all my things.', { label: 'ELLIE' });
      await s.say('MOM', 'Tom? Tom, the power\'s back. How long were we— why is everyone standing in the street?', { label: 'MARGARET VALE' });
      await s.thought('Two million people came home that night. Not one of them remembered being gone.', 4.2);
      await s.thought('In the morning they found the others. Sitting at their tables. Waiting at their bus stops. Still holding their umbrellas.', 5);
      await s.thought('My sister doesn\'t remember the letters. She doesn\'t remember the leaves falling eleven times.', 4.4);
      await s.thought('I keep the letters anyway. Somebody should.', 3.6);
    } else {
      // ---------------------------------------------------------------- let live
      await s.cut(async () => {
        s.cam(V(0.4, 1.62, 107.4), civic.head, 40);
        await s.say('elias', 'Let them live. All of them.', { dur: 2.4 });
        await s.say('civic', 'Then I will stop listening.', { dur: 2.6 });
        await s.say('civic', 'Eleven years I have heard them breathing under this city. It will be very quiet.', { dur: 3.6 });
        audio.whisper(V(0, 0, 120), 0.3, 3);
        await s.say('ELLIE', 'Eli? Eli, are you there? Eli—', { label: 'ELLIE · ECHO', dur: 2.6 });
        for (const sc of screens) sc.set([{ bg: '#eaf6f8', fg: '#1b6e86', title: 'GOOD MORNING', sub: 'BELLWETHER' }]);
        await s.wait(1.6);
        s.cam(V(-0.4, 1.25, 106.4), ellie.head, 32);
        await s.say('ellie', 'The humming stopped.', { dur: 2.2 });
        await s.say('ellie', 'Who was the other name? The one that sounded like mine?', { dur: 3 });
        await s.wait(1.2);
        await s.say('elias', 'Nobody. Just a dream.', { dur: 2.2 });
        ellie.body.gesture('hug', 3);
        await s.say('ellie', 'Okay.', { dur: 1.4 });
        await s.camTo(V(0, 3.2, 102), V(0, 1.2, 110), 3, 50);
      });
      await s.fade(1, 3);
      await s.thought('We told Command the city was dead. In a way, it was.', 3.6);
      await s.thought('Bellwether still has two million, one hundred and three thousand, four hundred and eighty-eight people.', 4.4);
      await s.thought('Some are kind. Some are cruel. Some are funny. Most of them are just tired.', 4.2);
      await s.thought('Ellie turned nine last week. CIVIC said she couldn\'t. She did anyway.', 4);
      await s.thought('Some nights I put my ear to the floor and listen for the other one. I never hear anything.', 4.6);
      await s.thought('I listen anyway.', 2.6);
    }
    void maya;
    await s.wait(1);
    await g.hud.question(
      ['If something remembers your life,', 'loves your family,', 'fears death,', 'and believes it is you...'],
      'when does the copy become a person?',
      7,
    );
    await g.hud.credits([
      ['A STORY ABOUT', 'BELLWETHER'],
      ['ELIAS VALE', 'WHO LEFT'],
      ['ELLIE VALE', 'WHO STAYED'],
      ['CIVIC', 'WHO KEPT EVERYONE'],
      ['MAYA CHEN · REYES · COLE', 'WHO CAME TO LOOK'],
      ['AND', '2,103,488 CITIZENS'],
      ['AND', '2,103,488 MORE'],
    ], 36);
    g.lights.master = 1;
  },
  shots: {
    core(g) {
      g.player.teleport(V(0, 0, 100), Math.PI, 0.05);
    },
  },
};

void THREE;
