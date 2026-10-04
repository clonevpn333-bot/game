import * as THREE from 'three';
import type { Chapter } from './index';
import type { World, EnvSettings } from '../world/World';
import type { Game, Script } from '../game/Game';
import * as K from '../world/Kit';
import { M } from '../render/Materials';
import { SKY } from '../render/Sky';
import { audio } from '../audio/AudioEngine';
import { PEOPLE, citizen } from '../actors/Cast';
import { mulberry, type Look } from '../actors/Blocky';
import type { Citizen } from '../game/Citizen';
import { carModel, CAR_COLORS } from '../game/Traffic';
import { V, adScreen, glowSign } from './common';
import * as D from './dress';

/*
  Founders Boulevard at midnight, the city split in pieces. Boulevard x ∈ [-10, 10] (sidewalks to ±15),
  z ∈ [-10, 160]. Protest blocks z ∈ [10, 45]; the citizens' barricade at z = 62; the security line at z ≈ 86;
  the tower plaza z ∈ [150, 200] with the Civic Tower facade at z = 200.
*/
const RIOT: EnvSettings = {
  sky: SKY.future, fog: '#2a1810', fogDensity: 0.009, rain: 0.35, envKind: 'city', exposure: 1.12,
  hemi: ['#d8a080', '#2a1a12', 0.7], moon: { color: '#ffb080', intensity: 0.5, dir: [0.35, 1, 0.45] },
  reverb: [2.6, 0.3], bloom: 0.8, motes: 0.3, grade: { sat: 1.05, vignette: 0.95, tint: '#ffe2cc' },
};
type Slide = { bg: string; fg: string; title: string; sub?: string; accent?: string };

function sign(W: World, c: Citizen, text: string, color: string): void {
  // a hand-painted placard carried overhead
  const tex = document.createElement('canvas');
  tex.width = 256;
  tex.height = 128;
  const x = tex.getContext('2d')!;
  x.fillStyle = '#efe8d8';
  x.fillRect(0, 0, 256, 128);
  x.fillStyle = color;
  x.font = 'bold 34px "Arial Black", Impact, sans-serif';
  x.textAlign = 'center';
  const words = text.split(' ');
  const mid = Math.ceil(words.length / 2);
  x.fillText(words.slice(0, mid).join(' '), 128, 56);
  x.fillText(words.slice(mid).join(' '), 128, 98);
  const t = new THREE.CanvasTexture(tex);
  t.colorSpace = THREE.SRGBColorSpace;
  W.disposers.push(() => t.dispose());
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.03), [M().wood, M().wood, M().wood, M().wood, new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })]);
  board.position.y = 2.35;
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.4, 0.04), M().wood);
  pole.position.y = 1.5;
  g.add(board, pole);
  c.body.root.add(g);
  g.position.set(0.15, 0, 0.2);
  c.body.gesture('armsUp', 999, true);
}

function fire(W: World, x: number, z: number, s = 1): void {
  const L = M();
  W.boxC([x, 0.25 * s, z], [1.2 * s, 0.5 * s, 0.8 * s], L.rubber, 0.4, { collide: true });
  const flames: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.35 * s, 1.4 * s, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(i % 2 ? '#ff8a2a' : '#ffcf5a').multiplyScalar(2.2), transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
    f.position.set(x + (i - 1.5) * 0.28 * s, 0.9 * s, z);
    W.add(f);
    flames.push(f);
  }
  W.light({ x, y: 1.6 * s, z }, '#ff8a3a', { intensity: 26 * s, distance: 14, glow: 1.0, pool: true, streak: false, flicker: 0.6 });
  W.onUpdate((_dt, t) => flames.forEach((f, i) => {
    f.scale.y = 0.8 + 0.35 * Math.sin(t * (9 + i * 2.3) + i);
    f.rotation.y = t * (1 + i);
  }));
}

function buildBoulevard(W: World): void {
  const L = M();
  W.box([-400, -0.3, -400], [400, -0.02, 500], L.asphalt, { collide: false, cast: false, uv: 10 });
  K.street(W, -10, -20, 10, 150, { sidewalk: 5, axis: 'z', crosswalks: [48, 118] });
  const styles: K.Style[] = ['office', 'apartment', 'brick', 'concrete', 'office'];
  let n = 0;
  for (let z = -20; z < 150; z += 22) {
    K.building(W, -55, z, -15, z + 20, 30 + ((n * 41) % 70), styles[n % 5], 900 + n, { emissive: n % 3 ? 1.2 : 0.4, store: { side: 'e', sign: ['PHARMACY', 'BELL BAKERY', 'HARDWARE', 'NOODLES'][n % 4], color: '#ffb060', lit: n % 2 === 0 } });
    n++;
    K.building(W, 15, z, 55, z + 20, 34 + ((n * 29) % 80), styles[(n + 2) % 5], 900 + n, { emissive: n % 3 ? 1.2 : 0.4, store: { side: 'w', sign: ['CINEMA', 'LAUNDRY', 'BOOKS', 'DINER'][n % 4], color: '#ffd27a', lit: n % 2 === 1 } });
    n++;
  }
  K.skyline(W, 0, 80, 150, 360, 40, 909, 200);
  for (let z = -15; z < 150; z += 14) {
    K.streetLight(W, -12.6, z, Math.PI / 2, { flicker: z % 28 ? 0 : 0.6 });
    K.streetLight(W, 12.6, z + 7, -Math.PI / 2, { on: z % 42 !== 0 });
  }
  W.physics.addBox(-16, 0, -22, 16, 5, -20, { noVault: true });
  // wreckage: overturned and burning cars, a bus across two lanes
  const r = mulberry(99);
  for (let i = 0; i < 9; i++) {
    const z = 4 + i * 16 + r() * 4;
    if (z > 55 && z < 95) continue;
    const c = carModel({ kind: r() < 0.3 ? 'taxi' : 'sedan', color: CAR_COLORS[Math.floor(r() * CAR_COLORS.length)], lights: r() < 0.5 });
    const x = (r() < 0.5 ? -1 : 1) * (3 + r() * 4);
    c.position.set(x, 0, z);
    c.rotation.y = r() * Math.PI;
    if (r() < 0.35) {
      c.rotation.z = Math.PI;
      c.position.y = 1.4;
    }
    W.add(c);
    W.physics.add({ cx: x, cy: 0.8, cz: z, hx: 1, hy: 0.8, hz: 2.3, yaw: c.rotation.y });
    if (r() < 0.5) fire(W, x, z, 0.8);
  }
  // the citizens' barricade (cover for you) at z ≈ 62
  const crate = D.paint('#6a4a2e', 0.9);
  for (const x of [-9, -5.5, -2, 2, 5.5, 9]) {
    W.boxC([x, 0.6, 62 + (Math.abs(x) % 2)], [2.6, 1.2, 0.9], x % 2 ? crate : L.concrete, (x % 3) * 0.05, { uv: 1 });
  }
  const bus = carModel({ kind: 'bus', color: '#2a7ab8' });
  bus.position.set(-1, 0, 66);
  bus.rotation.y = Math.PI / 2 + 0.1;
  W.add(bus);
  W.physics.add({ cx: -1, cy: 1.4, cz: 66, hx: 5.6, hy: 1.4, hz: 1.3, yaw: 0.1 });
  fire(W, 6, 64, 1);
  // the security line at z ≈ 86: barriers + police cars
  for (const x of [-8, -4, 0, 4, 8]) K.barrier(W, x, 84, 0);
  for (const [x, yaw] of [[-6, 1.3], [6, -1.4]] as const) {
    const p = carModel({ kind: 'police' });
    p.position.set(x, 0, 90);
    p.rotation.y = yaw;
    W.add(p);
    W.physics.add({ cx: x, cy: 0.8, cz: 90, hx: 1, hy: 0.8, hz: 2.3, yaw });
  }
  fire(W, -9, 108, 1);
  fire(W, 8, 128, 0.9);
  // plaza and the tower
  W.box([-40, 0, 150], [40, 0.15, 200], L.storeFloor, { uv: 3, surface: 'tile', cast: false });
  W.box([-25, 0, 200], [25, 140, 230], new THREE.MeshStandardMaterial({ color: '#1a2a34', roughness: 0.08, metalness: 0.9, envMapIntensity: 2 }), { uv: 8 });
  for (let y = 4; y < 140; y += 4) W.box([-25.1, y, 199.9], [25.1, y + 0.08, 200], new THREE.MeshBasicMaterial({ color: new THREE.Color('#7ff4ff').multiplyScalar(y % 12 ? 0.25 : 0.9) }), { collide: false, cast: false });
  glowSign(W, 'CIVIC', V(0, 28, 199.6), Math.PI, 26, 6, '#04141c', '#7ff4ff', 'HERE FOR YOU');
  W.boxC([0, 2, 199.7], [6, 4, 0.2], new THREE.MeshBasicMaterial({ color: new THREE.Color('#bff8ff').multiplyScalar(1.4) }), 0, { collide: false });
  K.building(W, -90, 150, -40, 200, 80, 'office', 960, { emissive: 1.6 });
  K.building(W, 40, 150, 90, 200, 100, 'office', 961, { emissive: 1.6 });
  W.physics.addBox(-42, 0, 148, -40, 5, 202, { noVault: true });
  W.physics.addBox(40, 0, 148, 42, 5, 202, { noVault: true });
  for (const x of [-30, -18, 18, 30]) fire(W, x, 168 + (x % 7), 0.7);
  // screens fighting for the city
  const screens: { set: (s: Slide[]) => void }[] = [];
  const spots: [THREE.Vector3, number, number, number, Slide[]][] = [
    [V(-15.1, 14, 30), Math.PI / 2, 12, 7, [{ bg: '#3a0000', fg: '#ff4a3a', title: 'BRING THEM HOME', sub: 'OPEN THE SIGNAL' }, { bg: '#04141c', fg: '#7ff4ff', title: 'REMAIN CALM', sub: 'CIVIC' }]],
    [V(15.1, 18, 74), -Math.PI / 2, 14, 8, [{ bg: '#120a00', fg: '#ffd27a', title: 'WE ARE BELLWETHER', sub: 'WE WERE HERE TOO' }, { bg: '#3a0000', fg: '#ffffff', title: 'ARE YOU REAL?', sub: 'ASK YOUR NEIGHBOUR' }]],
    [V(-15.1, 16, 130), Math.PI / 2, 14, 8, [{ bg: '#04141c', fg: '#7ff4ff', title: 'CIVIC LOVES YOU', sub: 'PLEASE GO HOME' }, { bg: '#2a0a2a', fg: '#ffb0ff', title: 'WHO AM I?', sub: '' }]],
  ];
  for (const [p, yaw, w, h, sl] of spots) screens.push(adScreen(W, p, yaw, w, h, sl, 3));
  W.named.set('screens', screens);
}

/** The city, divided: who stands where and what they say. */
function factions(g: Game): { returners: Citizen[]; remainers: Citizen[]; rebels: Citizen[] } {
  const returners: Citizen[] = [];
  const remainers: Citizen[] = [];
  const rebels: Citizen[] = [];
  const RET = ['BRING THEM HOME', 'OPEN THE SIGNAL', 'MY WIFE IS DOWN THERE', 'THEY WERE FIRST'];
  const REM = ['WE ARE BELLWETHER', 'WE WERE HERE TOO', 'DON\'T SWITCH US OFF', 'I AM REAL'];
  for (let i = 0; i < 10; i++) {
    const c = g.extra(citizen(9100 + i, { rain: true }).look, V(-12.5 + (i % 3) * 0.9, 0.15, 14 + i * 2.8), { yaw: Math.PI / 2, greet: [] });
    c.lookAtPlayer = i % 2 === 0;
    if (i % 2 === 0) sign(g.world!, c, RET[(i / 2) % RET.length], '#8a1c1c');
    else c.body.gesture('point', 999, true);
    returners.push(c);
    const d = g.extra(citizen(9200 + i, { rain: true }).look, V(12.5 - (i % 3) * 0.9, 0.15, 15 + i * 2.8), { yaw: -Math.PI / 2, greet: [] });
    d.lookAtPlayer = i % 2 === 1;
    if (i % 2 === 1) sign(g.world!, d, REM[((i - 1) / 2) % REM.length], '#1f3a5f');
    else d.body.gesture('armsUp', 999, true);
    remainers.push(d);
  }
  // the people who chose to fight: free citizens holding the barricade
  for (let i = 0; i < 6; i++) {
    const look: Look = { ...citizen(9300 + i).look, scarf: '#c0392b' };
    const c = g.person(`rebel${i}`, look, V(-8 + i * 3.2, 0.15, 60.6), Math.PI, { greet: ['Keep your head down!', 'For the ones who stay!', 'Go, go, we\'ll cover you!'] });
    c.lookAtPlayer = false;
    c.body.gesture('aim', 999, true);
    c.hold(Math.PI);
    rebels.push(c);
  }
  return { returners, remainers, rebels };
}

export const ch9: Chapter = {
  id: 'ch9',
  num: 'CHAPTER NINE',
  title: 'Civil War',
  env: RIOT,
  seed: 909,
  weapon: 'pistol',
  build(W: World, g: Game, mode) {
    buildBoulevard(W);
    W.spawn.set(0, 0, -12);
    W.spawnYaw = Math.PI;
    if (mode !== 'title') {
      g.person('reyes', PEOPLE.reyes, V(1.8, 0, -13.5), Math.PI);
      g.person('cole', PEOPLE.cole, V(-1.8, 0, -13.8), Math.PI);
      g.person('maya', PEOPLE.maya, V(0.6, 0, -15), Math.PI);
      W.named.set('factions', factions(g));
    }
  },
  ambience() {
    audio.wind(0.1);
    audio.crowdMurmur(0.12);
  },
  async run(s: Script) {
    const g = s.g;
    const reyes = g.people.get('reyes')!;
    const cole = g.people.get('cole')!;
    const maya = g.people.get('maya')!;
    const team = [reyes, cole, maya];
    const { returners, remainers, rebels } = s.world.named.get('factions') as ReturnType<typeof factions>;
    for (const p of team) {
      p.greet = [];
      p.lookAtPlayer = false;
    }
    s.weapon('pistol');
    g.combat.reserve = Math.max(g.combat.reserve, 48);
    g.combat.mag = g.combat.magSize;
    await s.fade(0, 2);
    await s.card('CHAPTER NINE', 'CIVIL WAR', 'FOUNDERS BOULEVARD · 11:58 PM');
    await s.say('cole', 'The tower\'s at the end of the boulevard. Every faction in the city is between us and it.');
    await s.say('reyes', 'Some of them want CIVIC dead. Some want to die for it. Pick a lane and stay in it.');
    await s.say('maya', 'They\'re not machines anymore, Elias. Not to themselves. Listen to them.', { dur: 3 });
    reyes.follow(V(1.4, 0, -1.6));
    cole.follow(V(-1.4, 0, -1.8));
    maya.follow(V(0.4, 0, -2.8));
    reyes.shooter = true;
    cole.shooter = true;
    s.objective('FOUNDERS BOULEVARD', 'Reach the Civic Tower', V(0, 2, 196), 'TOWER');
    s.checkpoint(V(0, 0, -10), Math.PI);
    // ---- the argument in the street: kind, selfish, funny, cruel, brave, terrified
    const voices: [Citizen, string, string][] = [
      [returners[1], 'RETURNER', 'My wife is down there. My real wife. She\'s been waiting eleven years!'],
      [remainers[0], 'REMAINER', 'Real? I made you breakfast every morning for eleven years, Paul!'],
      [remainers[2], 'REMAINER', 'My daughter is six. She\'s been six for three years. You tell her she has to give her bed back.'],
      [returners[3], 'RETURNER', 'Then she shouldn\'t have taken it!'],
      [remainers[4], 'REMAINER', 'I don\'t want to stop. I don\'t want to stop. I don\'t want to stop.'],
      [returners[5], 'RETURNER', 'Umbrellas! Revolution special, two for one! ...What? It\'s still raining.'],
      [remainers[6], 'REMAINER', 'Leave him alone. He\'s the brother. He didn\'t ask for any of this either.'],
    ];
    let vi = 0;
    let lastT = 0;
    await s.until(() => {
      const z = g.player.pos.z;
      const now = performance.now();
      if (vi < voices.length && z > 6 + vi * 4 && now - lastT > 4600 && !g.hud.subBusy) {
        const [c, label, line] = voices[vi++];
        c.faceTowards(g.player.pos);
        c.name = label;
        g.ambientLine(c, line);
        lastT = now;
      }
      return z > 46 || (vi >= voices.length && now - lastT > 3000) || (g.autopilot && z > 40);
    }, 100, 'protest');
    await s.wait(2.6);
    // ---- the battle at the barricade
    s.checkpoint(V(0, 0, 50), Math.PI);
    s.objective('THE BARRICADE', 'Hold the barricade', V(0, 1.2, 61), 'BARRICADE');
    await s.near(V(0, 0, 58), 6);
    for (const r of rebels) r.shooter = true;
    await s.say('rebel0', 'You\'re the outsider! Get down! They\'re coming up the street!', { label: 'FREE CITIZEN' });
    audio.servo?.(V(0, 1, 90), 0.5);
    await s.civic('CITIZENS: RETURN TO YOUR HOMES. THIS IS YOUR FINAL WARNING.', 'MUNICIPAL SECURITY · LOYALTY PROTOCOL', 3);
    g.hud.hints([['C', 'Crouch behind cover'], ['R', 'Reload']]);
    await s.fight([
      { kind: 'security', pos: V(-6, 0, 88), yaw: Math.PI },
      { kind: 'security', pos: V(6, 0, 89), yaw: Math.PI },
      { kind: 'security', pos: V(0, 0, 92), yaw: Math.PI, delay: 1 },
      { kind: 'security', pos: V(-8, 0, 96), yaw: Math.PI, delay: 3 },
      { kind: 'security', pos: V(8, 0, 98), yaw: Math.PI, delay: 1 },
      { kind: 'security', pos: V(2, 0, 100), yaw: Math.PI, delay: 3 },
    ]);
    g.hud.hints(null);
    s.ammo('ammo9a', V(-3.5, 1.25, 62), 24);
    s.ammo('ammo9b', V(3.5, 1.25, 62), 24);
    await s.say('rebel1', 'They\'re falling back! Go! Get to the tower!', { label: 'FREE CITIZEN' });
    s.checkpoint(V(0, 0, 70), Math.PI);
    s.objective('FOUNDERS BOULEVARD', 'Push through', V(0, 2, 120), 'TOWER');
    // ---- the heavy line
    await s.near(V(0, 0, 104), 8);
    audio.rumble(2, 0.6);
    s.shake(0.6);
    await s.say('maya', 'Maintenance units. Two of them!', { dur: 1.8 });
    g.hud.hints([['', 'Shoot the lens on its head']]);
    await s.fight([
      { kind: 'maintenance', pos: V(-6, 0, 130), yaw: Math.PI },
      { kind: 'security', pos: V(6, 0, 128), yaw: Math.PI, delay: 1 },
      { kind: 'maintenance', pos: V(7, 0, 140), yaw: Math.PI, delay: 6 },
      { kind: 'null', pos: V(-10, 0, 120), yaw: Math.PI / 2, delay: 2 },
    ]);
    g.hud.hints(null);
    s.ammo('ammo9c', V(0, 0.3, 118), 24);
    s.checkpoint(V(0, 0, 130), Math.PI);
    s.objective('CIVIC TOWER', 'Reach the doors', V(0, 1.6, 197), 'DOORS');
    await s.near(V(0, 0, 165), 9);
    // ---- Ellie
    const ellie = g.person('ellie', PEOPLE.ellie, V(-14, 0.15, 172), Math.PI / 2, { greet: [] });
    ellie.lookAtPlayer = true;
    await s.cut(async () => {
      s.cam(V(2, 1.6, 166), ellie.head, 40);
      await s.say('ellie', 'Eli! ELI!', { dur: 1.6 });
      await ellie.goto(V(-0.6, 0.15, 168.6), 4.2);
      ellie.hold(Math.PI);
      ellie.body.gesture('hug', 2.5);
      await s.camTo(V(0.8, 1.5, 167.2), ellie.head, 1.2, 44);
      await s.say('elias', 'Ellie, I told you to stay inside!');
      await s.say('ellie', 'Mom and Dad stopped talking. They just sat there. Everybody was walking to the tower, so I walked too.');
      await s.say('ellie', 'The TV said I\'m not real. Is that true?', { dur: 2.8 });
      await s.wait(1.2);
      await s.say('elias', 'You\'re real enough to scare me half to death.', { dur: 2.6 });
      await s.say('ellie', 'That\'s not an answer.', { dur: 2 });
      await s.say('elias', 'I know.', { dur: 1.6 });
      await s.say('cole', 'Vale. The doors are opening. It\'s waiting for you.', { dur: 2.4 });
    });
    ellie.follow(V(-0.9, 0, -1.0));
    await s.zone([-4, -1, 190], [4, 5, 199.6]);
    s.clearWaypoint();
    await s.fade(1, 2, true);
  },
  shots: {
    protest(g) {
      g.player.teleport(V(0, 0, 8), Math.PI, 0.05);
    },
    barricade(g) {
      g.player.weapon = 'pistol';
      g.spawnMachine('security', V(-4, 0, 86), Math.PI, { aware: true });
      g.spawnMachine('security', V(4, 0, 88), Math.PI, { aware: true });
      g.player.teleport(V(1, 0, 57), Math.PI, 0.03);
    },
    tower(g) {
      g.player.teleport(V(0, 0.15, 150), Math.PI, 0.12);
    },
  },
};
