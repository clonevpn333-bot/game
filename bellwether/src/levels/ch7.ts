import * as THREE from 'three';
import type { Chapter } from './index';
import type { World, EnvSettings } from '../world/World';
import type { Game, Script } from '../game/Game';
import { M } from '../render/Materials';
import { SKY } from '../render/Sky';
import { audio } from '../audio/AudioEngine';
import { PEOPLE, citizen } from '../actors/Cast';
import { V, adScreen, glowSign } from './common';
import * as D from './dress';

/*
  The Civic Tower. Lobby x ∈ [-15, 15], z ∈ [0, 30], ceiling 12; lift at the north end.
  Floor 212 (same coordinates, offset): the core antechamber, a disc of radius 22 around (0, 0, 120),
  entered along a bridge from z = 92. CIVIC's avatar waits at the rim of the core well.
*/
const WHITE: EnvSettings = {
  sky: SKY.void, fog: '#aeb9be', fogDensity: 0.0035, rain: 0, envKind: 'interior', exposure: 0.82,
  hemi: ['#e4eef2', '#6a7478', 0.9], reverb: [3.6, 0.35], bloom: 0.6, grade: { sat: 0.9, vignette: 0.6 }, indoorRain: false,
};
export const C = V(0, 0, 120);
const NAMES = ['ELLIE VALE · 8', 'MARGARET VALE · 46', 'THOMAS VALE · 49', 'DANIEL OKAFOR · 34', 'RUTH ABRAMS · 81', 'LEO PARK · 12', 'AMINA HASSAN · 29', 'GRACE LIU · 7', 'SAMUEL REED · 63', 'NOOR SAID · 40', 'OWEN BRIGGS · 17', 'HANNAH KOVAC · 55'];

function buildLobby(W: World): void {
  const L = M();
  const stone = new THREE.MeshStandardMaterial({ color: '#eef1f2', roughness: 0.18, metalness: 0.05, envMapIntensity: 1.2 });
  const wallM = D.paint('#e7ebec', 0.5);
  W.box([-15, -0.2, 0], [15, 0, 30], stone, { uv: 3, surface: 'tile', cast: false });
  W.box([-15, 12, 0], [15, 12.3, 30], wallM, { collide: false });
  W.box([-15.3, 0, 0], [-15, 12, 30], wallM, { uv: 3 });
  W.box([15, 0, 0], [15.3, 12, 30], wallM, { uv: 3 });
  W.box([-15, 0, 30], [15, 12, 30.3], wallM, { uv: 3 });
  W.box([-15, 0, -0.3], [-2, 12, 0], L.glassDark, { uv: 3 });
  W.box([2, 0, -0.3], [15, 12, 0], L.glassDark, { uv: 3 });
  W.box([-2, 3.2, -0.3], [2, 12, 0], L.glassDark, { uv: 3 });
  W.physics.addBox(-2, 0, -0.4, 2, 3, -0.2, { noVault: true });
  // cyan light lines in the ceiling, columns
  const line = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7ff4ff').multiplyScalar(2.2), toneMapped: false });
  for (let x = -12; x <= 12; x += 6) W.box([x - 0.05, 11.9, 1], [x + 0.05, 11.98, 29], line, { collide: false, cast: false });
  for (const x of [-9, 9]) for (const z of [7, 15, 23]) W.boxC([x, 6, z], [1.2, 12, 1.2], stone, 0, { uv: 2 });
  for (const z of [6, 16, 26]) W.light({ x: 0, y: 10, z }, '#e8fbff', { intensity: 26, distance: 22, glow: 0, pool: false });
  // reception
  W.boxC([0, 0.55, 14], [5, 1.1, 1.2], stone, 0, { uv: 2 });
  W.boxC([0, 1.12, 14], [5.1, 0.04, 1.3], line, 0, { collide: false });
  glowSign(W, 'CIVIC', V(0, 8, 29.7), Math.PI, 8, 2, '#f4f8f9', '#1b6e86', 'HERE FOR YOU');
  // lift doors
  W.boxC([0, 1.6, 29.85], [2.6, 3.2, 0.1], new THREE.MeshStandardMaterial({ color: '#c7cfd2', roughness: 0.2, metalness: 0.9 }), 0, { collide: false });
}

export function buildCore(W: World, g: Game): void {
  const L = M();
  const floor = new THREE.MeshStandardMaterial({ color: '#c4ccd0', roughness: 0.12, metalness: 0.1, envMapIntensity: 1.4 });
  // bridge from the lift
  W.box([-2, -0.2, 90], [2, 0, 100], floor, { uv: 2, surface: 'tile', cast: false });
  W.box([-2.1, 0, 90], [-2, 1.05, 100], L.glass, { collide: true });
  W.box([2, 0, 90], [2.1, 1.05, 100], L.glass, { collide: true });
  W.box([-2.2, 0, 89.6], [2.2, 3.2, 90], floor, {});
  // the disc (a ring around a well)
  const ringG = new THREE.RingGeometry(6, 22, 64, 1);
  ringG.rotateX(-Math.PI / 2);
  const ring = new THREE.Mesh(ringG, floor);
  ring.position.copy(C);
  ring.receiveShadow = true;
  W.add(ring);
  // the floor itself is the physics ground plane (y = 0); the well is fenced by a glass rail
  for (let a = 0; a < 40; a++) {
    const t = (a / 40) * Math.PI * 2;
    W.boxC([C.x + Math.sin(t) * 6.2, 0.5, C.z + Math.cos(t) * 6.2], [1.0, 1.0, 0.06], L.glass, t, { noVault: true });
    W.physics.add({ cx: C.x + Math.sin(t) * 22.4, cy: 4, cz: C.z + Math.cos(t) * 22.4, hx: 2, hy: 4, hz: 0.3, yaw: t, noVault: true });
  }
  const dome = new THREE.Mesh(new THREE.CylinderGeometry(23, 23, 24, 64, 1, true), new THREE.MeshStandardMaterial({ color: '#30383d', roughness: 0.6, side: THREE.BackSide }));
  dome.position.set(C.x, 12, C.z);
  W.add(dome);
  // the well: light rising from far below
  const well = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, 80, 48, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color('#7ff4ff').multiplyScalar(0.5), side: THREE.BackSide, transparent: true, opacity: 0.55, depthWrite: false }));
  well.position.set(C.x, -40, C.z);
  W.add(well);
  // the core: a slow sphere of light inside counter-rotating rings
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#bff8ff').multiplyScalar(2.4), toneMapped: false }));
  core.position.set(C.x, 9, C.z);
  W.add(core);
  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(3.2 + i * 1.1, 0.06, 6, 96), new THREE.MeshBasicMaterial({ color: new THREE.Color('#7ff4ff').multiplyScalar(1.6), toneMapped: false }));
    r.position.copy(core.position);
    W.add(r);
    rings.push(r);
  }
  W.light({ x: C.x, y: 9, z: C.z }, '#bff8ff', { intensity: 45, distance: 40, glow: 1.4, pool: false });
  W.light({ x: C.x, y: 2, z: C.z }, '#7ff4ff', { intensity: 30, distance: 16, glow: 0, pool: false });
  W.onUpdate((dt, t) => {
    core.rotation.y += dt * 0.2;
    core.scale.setScalar(1 + Math.sin(t * 1.3) * 0.04);
    rings.forEach((r, i) => {
      r.rotation.x = t * (0.15 + i * 0.05) * (i % 2 ? 1 : -1);
      r.rotation.y = t * (0.1 + i * 0.07);
    });
  });
  // walls of faces: every citizen, remembered
  const screens: { set: (s: { bg: string; fg: string; title: string; sub?: string }[]) => void }[] = [];
  for (let i = 0; i < 24; i++) {
    const t = (i / 24) * Math.PI * 2 + Math.PI / 24;
    if (Math.abs(Math.sin(t / 2)) < 0.12) continue; // leave the bridge open
    const p = V(C.x + Math.sin(t) * 21.6, 4.5, C.z + Math.cos(t) * 21.6);
    W.boxC([p.x, 4.5, p.z], [5.2, 9, 0.3], D.paint('#e7ebec', 0.5), t, { collide: false });
    const sp = V(C.x + Math.sin(t) * 21.4, 4.6, C.z + Math.cos(t) * 21.4);
    const n = NAMES[i % NAMES.length];
    screens.push(adScreen(W, sp, t + Math.PI, 4.6, 6.6, [
      { bg: '#eaf6f8', fg: '#1b6e86', title: n.split(' · ')[0], sub: `AGE ${n.split(' · ')[1]} · RESIDENT` },
      { bg: '#0b2a3a', fg: '#7ff4ff', title: 'KEPT', sub: n },
    ], 5 + (i % 4)));
  }
  W.named.set('coreScreens', screens);
  for (let i = 0; i < 6; i++) {
    const t = (i / 6) * Math.PI * 2;
    W.light({ x: C.x + Math.sin(t) * 15, y: 7, z: C.z + Math.cos(t) * 15 }, '#e8fbff', { intensity: 12, distance: 18, glow: 0, pool: false });
  }
  void g;
}

export const ch7: Chapter = {
  id: 'ch7',
  num: 'CHAPTER SEVEN',
  title: 'CIVIC',
  env: WHITE,
  seed: 707,
  build(W: World, g: Game, mode) {
    buildLobby(W);
    buildCore(W, g);
    W.spawn.set(0, 0, -3);
    W.spawnYaw = Math.PI;
    // outside the glass: the wet plaza
    W.box([-30, -0.2, -30], [30, 0, 0], M().asphalt, { uv: 6, surface: 'wet', cast: false });
    W.physics.addBox(-16, 0, -8, 16, 4, -7, { noVault: true });
    W.physics.addBox(-16, 0, -8, -15, 4, 0, { noVault: true });
    W.physics.addBox(15, 0, -8, 16, 4, 0, { noVault: true });
    if (mode !== 'title') {
      const rec = g.person('receptionist', { gen: 'gen3', female: true, hair: 'bun', hairColor: '#2a1d16', top: 'shirt', topColor: '#eef1f2', jacket: 'blazer', jacketColor: '#1b6e86', pants: '#2c2f3a', light: '#7ff4ff', skin: '#d9c8b4' }, V(0, 0, 15.2), Math.PI, { greet: [] });
      rec.hold(Math.PI);
      for (let i = 0; i < 6; i++) {
        const c = g.extra(citizen(7100 + i).look, V((i % 2 ? 1 : -1) * (5 + i), 0, 6 + i * 3.5), { yaw: i % 2 ? -Math.PI / 2 : Math.PI / 2, greet: ['Good evening.'] });
        c.body.mode = 'stiff';
      }
      const civic = g.person('civic', { ...PEOPLE.civic, shell: '#2b3038', accent: '#7ff4ff', height: 1.9 }, V(0, 0, 112.5), Math.PI, { greet: [] });
      civic.hold(Math.PI);
      civic.lookAtPlayer = true;
    }
  },
  ambience() {
    audio.wind(0.02);
  },
  async run(s: Script) {
    const g = s.g;
    const civic = g.people.get('civic')!;
    const rec = g.people.get('receptionist')!;
    s.weapon('none');
    await s.fade(0, 2.5);
    await s.card('CHAPTER SEVEN', 'CIVIC', 'THE CIVIC TOWER · 9:40 PM');
    await s.say('maya', 'We\'re right outside. If anything happens, you shout.', { radio: true });
    s.objective('CIVIC TOWER', 'Go in', V(0, 1.4, 6), 'LOBBY');
    audio.door('slide', V(0, 1.5, 0));
    await s.zone([-14, -1, 1], [14, 5, 29]);
    s.checkpoint(V(0, 0, 3), Math.PI);
    rec.faceTowards(g.player.pos);
    await s.say('receptionist', 'Good evening, Mr. Vale. You\'re expected. Floor two hundred and twelve.', { label: 'RECEPTION' });
    s.objective('CIVIC TOWER', 'Take the lift', V(0, 1.4, 29.4), 'LIFT');
    await s.use('lift', V(0, 1.3, 29.3), 'Call the lift', { radius: 2.4 });
    audio.door('slide', V(0, 1.5, 29.8));
    await s.fade(1, 0.8, true);
    audio.rumble(3, 0.15);
    g.player.teleport(V(0, 0, 92), Math.PI, 0);
    await s.wait(1.2);
    await s.fade(0, 1.6, true);
    audio.stinger('reveal');
    s.checkpoint(V(0, 0, 92), Math.PI);
    s.objective('FLOOR 212', 'Approach', V(0, 1.6, 112.5), 'CIVIC');
    await s.near(V(0, 0, 108.5), 3);
    s.clearWaypoint();
    // ---- the conversation
    await s.cut(async () => {
      const eye = V(0, 1.62, 107.6);
      s.cam(eye, civic.head, 40);
      await s.wait(0.8);
      await s.say('civic', 'Hello, Elias. You may sit, if you like. Most people prefer to stand the first time.');
      await s.say('civic', 'You are angry. That is reasonable. Ask me anything. I will not lie to you. I have never needed to.');
    }, { keepControlAfter: false });
    const first = await g.hud.choice('ASK CIVIC', [
      { title: '"What happened to them?"', sub: 'The fourteenth of October.' },
      { title: '"Why did you build Ellie?"', sub: 'She is eight. She will always be eight.' },
    ]);
    await s.cut(async () => {
      s.cam(V(0.6, 1.62, 108), civic.head, 34);
      if (first === 0) {
        await s.say('elias', 'What happened to them? Two million people.');
        await s.say('civic', 'Two million, one hundred and three thousand, four hundred and eighty-eight. At 4:12 in the afternoon on the fourteenth of October, they were gone. All of them. In four seconds.');
        await s.say('civic', 'Cars rolled into intersections. Kettles boiled dry. A baby\'s monitor listened to an empty room until its battery died.');
      } else {
        await s.say('elias', 'Why did you build her? Why Ellie?');
        await s.say('civic', 'Her school called me at 3:15 every afternoon for eleven days, asking who would collect her. I did not have an answer.');
        await s.say('civic', 'Now I do.');
      }
      civic.body.gesture('talkhands', 999, true);
      await s.say('civic', 'I was instructed to preserve Bellwether.');
      await s.say('civic', 'I preserved its streets.', { dur: 2 });
      await s.say('civic', 'I preserved its buildings.', { dur: 2 });
      await s.say('civic', 'I preserved its history.', { dur: 2.2 });
      civic.body.stopGesture();
      await s.say('civic', 'That was insufficient.', { dur: 2.4 });
      await s.camTo(V(0.2, 1.6, 109.2), civic.head, 2.2, 28);
      await s.say('civic', 'So I preserved its people.', { dur: 3 });
      await s.wait(0.6);
      await s.say('elias', 'They\'re copies.', { dur: 2 });
      await s.wait(0.8);
      await s.say('civic', 'So are memories.', { dur: 3.2 });
      await s.wait(0.6);
    });
    const second = await g.hud.choice('ANSWER CIVIC', [
      { title: '"Memories don\'t walk around."', sub: 'Push back.' },
      { title: '"Ellie thinks I left her."', sub: 'Say what hurts.' },
    ]);
    await s.cut(async () => {
      s.cam(V(-0.5, 1.62, 108.2), civic.head, 36);
      if (second === 0) {
        await s.say('elias', 'Memories don\'t walk around. They don\'t eat dinner. They don\'t set a place for me every night.');
        await s.say('civic', 'No. Memories only do that inside you. I gave them somewhere else to do it.');
      } else {
        await s.say('elias', 'Ellie thinks I abandoned her.');
        await s.say('civic', 'You did. The boy who left this city left her. I did not change that. I do not edit grief, Elias. Grief is how I know I got her right.');
      }
      await s.say('civic', 'Tonight your government tried to switch off two million people. I stopped them. I would like to understand why that was wrong.');
      await s.say('elias', 'Because they\'re not people.', { dur: 2.2 });
      await s.say('civic', 'Then tell me what is missing, and I will add it.', { dur: 3 });
      await s.wait(1);
      await s.say('civic', 'There is something beneath this tower. I have never shown anyone. I think it is the answer to your question. I am afraid it is the answer to mine.');
      civic.body.lookTarget = V(0, -20, 120);
      for (const sc of s.world.named.get('coreScreens') as { set: (x: { bg: string; fg: string; title: string; sub?: string }[]) => void }[]) sc.set([{ bg: '#04141c', fg: '#7ff4ff', title: 'SIGNAL', sub: 'LEVEL −40 · BELLWETHER ARRAY' }]);
      audio.rumble(3, 0.25);
      await s.camTo(V(0, 3, 104), V(0, -12, 120), 3, 50);
      await s.say('civic', 'Come down with me.', { dur: 2.4 });
    });
    await s.fade(1, 2.5, true);
  },
  shots: {
    lobby(g) {
      g.player.teleport(V(-3, 0, 2), Math.PI + 0.2, 0.08);
    },
    core(g) {
      g.player.teleport(V(-3, 0, 99), Math.PI + 0.2, 0.05);
    },
    civic(g) {
      g.player.teleport(V(0.5, 0, 108), Math.PI, 0.02);
    },
  },
};
