import * as THREE from 'three';
import type { Chapter } from './index';
import type { World, EnvSettings } from '../world/World';
import type { Game, Script } from '../game/Game';
import * as K from '../world/Kit';
import { M } from '../render/Materials';
import { SKY } from '../render/Sky';
import { audio } from '../audio/AudioEngine';
import { PEOPLE, citizen } from '../actors/Cast';
import { mulberry } from '../actors/Blocky';
import type { Citizen } from '../game/Citizen';
import { carModel, CAR_COLORS, type CarKind } from '../game/Traffic';
import { V, adScreen, shopBlock, glowSign, helicopter } from './common';

/*
  Harbor Avenue during the blackout. Avenue x ∈ [-7, 7] (sidewalks to ±11), z ∈ [-20, 150],
  crossed at z ∈ [35, 45] and [95, 105]. Union Station plaza x ∈ [-40, 40], z ∈ [150, 200].
*/
const RED: EnvSettings = {
  sky: SKY.stormLight, fog: '#2a1214', fogDensity: 0.012, rain: 0.95, envKind: 'city', exposure: 1.12,
  hemi: ['#c88a8a', '#2a1210', 0.55], moon: { color: '#ff9a8a', intensity: 0.45, dir: [-0.35, 1, 0.45] },
  reverb: [2.4, 0.3], bloom: 0.8, grade: { sat: 0.95, vignette: 0.95, tint: '#ffd6d0' },
};
type Slide = { bg: string; fg: string; title: string; sub?: string; accent?: string };
const ALERT: Slide[][] = [
  [{ bg: '#3a0000', fg: '#ff4a3a', title: 'REMAIN INDOORS', sub: 'BELLWETHER IS UNDER ATTACK' }, { bg: '#120000', fg: '#ffffff', title: 'CURFEW IN EFFECT', sub: 'ALL DOORS ARE LOCKED FOR YOUR SAFETY' }],
  [{ bg: '#120000', fg: '#ff4a3a', title: 'ELIAS VALE', sub: 'PLEASE REPORT TO MUNICIPAL SECURITY' }, { bg: '#3a0000', fg: '#ffffff', title: 'DO NOT APPROACH', sub: 'THE INTRUDERS ARE NOT FROM HERE' }],
  [{ bg: '#3a0000', fg: '#ffd0c8', title: 'CIVIC IS PROTECTING YOU', sub: 'NOBODY LEAVES · NOBODY ENTERS' }],
];

function stoppedCar(W: World, x: number, z: number, yaw: number, kind: CarKind, color?: string): THREE.Group {
  const c = carModel({ kind, color, lights: true });
  c.position.set(x, 0, z);
  c.rotation.y = yaw;
  W.add(c);
  const len = (c.userData.len as number) ?? 4.6;
  const wid = (c.userData.width as number) ?? 1.9;
  W.physics.add({ cx: x, cy: 0.8, cz: z, hx: wid / 2, hy: 0.8, hz: len / 2, yaw });
  return c;
}

function buildAvenue(W: World, g: Game): void {
  const L = M();
  W.box([-400, -0.3, -400], [400, -0.02, 500], L.asphalt, { collide: false, cast: false, uv: 10 });
  K.street(W, -7, -30, 7, 150, { sidewalk: 4, axis: 'z', crosswalks: [32, 48, 92, 108] });
  K.street(W, -30, 35, 30, 45, { sidewalk: 0.01, axis: 'x' });
  K.street(W, -30, 95, 30, 105, { sidewalk: 0.01, axis: 'x' });
  // blocks: storefronts on the avenue, towers above
  const names = [['PERCH COFFEE', '#8fffb0'], ['ORPHEUM', '#ffd27a'], ['QUIK-STOP', '#ff9a6a'], ['HARBOR BOOKS', '#ffe0a0'], ['LUCKY NOODLE', '#ff6a8a'], ['BELL PHARMACY', '#7ff4ff']];
  let n = 0;
  const blocks: [number, number][] = [[-20, 35], [45, 95], [105, 150]];
  for (const [z0, z1] of blocks) {
    for (let z = z0; z < z1 - 4; z += 17) {
      const z2 = Math.min(z1, z + 16.5);
      const [sign, col] = names[n % names.length];
      shopBlock(W, -45, z, -11, z2, 26 + ((n * 37) % 50), (['office', 'apartment', 'brick', 'concrete'] as K.Style[])[n % 4], 600 + n, 'e', sign, col, n % 2 ? '#7a1c1c' : undefined);
      n++;
      const [sign2, col2] = names[(n + 2) % names.length];
      shopBlock(W, 11, z, 45, z2, 30 + ((n * 23) % 60), (['apartment', 'office', 'concrete', 'brick'] as K.Style[])[n % 4], 640 + n, 'w', sign2, col2, n % 3 ? undefined : '#1f3a5f');
      n++;
    }
  }
  // lowered security shutters on every storefront: the city locked its doors
  const shutter = new THREE.MeshStandardMaterial({ color: '#5a5e64', roughness: 0.5, metalness: 0.7, map: (L.metal as THREE.MeshStandardMaterial).map });
  for (const [z0, z1] of blocks) for (let z = z0; z < z1 - 4; z += 17) {
    const zc = (z + Math.min(z1, z + 16.5)) / 2;
    W.quad(shutter, { x: -10.93, y: 1.55, z: zc }, Math.min(15, z1 - z) - 1.6, 2.9, Math.PI / 2);
    if (!(zc > 70 && zc < 90)) W.quad(shutter, { x: 10.93, y: 1.55, z: zc }, Math.min(15, z1 - z) - 1.6, 2.9, -Math.PI / 2);
  }
  K.skyline(W, 0, 80, 140, 360, 40, 606, 180);
  // street lights (red now), barricades at the cross-street ends
  for (let z = -18; z < 150; z += 16) {
    K.streetLight(W, -9.6, z, Math.PI / 2, { color: '#ff3a2a' });
    K.streetLight(W, 9.6, z + 8, -Math.PI / 2, { color: '#ff3a2a' });
  }
  for (const zc of [40, 100]) for (const sx of [-1, 1]) {
    for (let i = -2; i <= 2; i++) K.barrier(W, sx * 28, zc + i * 2, Math.PI / 2);
    W.physics.addBox(sx * 29 - 1, 0, zc - 6, sx * 29 + 1, 4, zc + 6, { noVault: true });
  }
  W.physics.addBox(-12, 0, -31, 12, 4, -29, { noVault: true });
  // frozen traffic: everyone stopped where they were when the power went
  const r = mulberry(66);
  const kinds: CarKind[] = ['sedan', 'taxi', 'hatch', 'sedan', 'van', 'sedan', 'taxi'];
  for (let z = -10; z < 145; z += 7 + r() * 6) {
    if ((z > 30 && z < 50) || (z > 90 && z < 110)) continue;
    const lane = r() < 0.5 ? -3.4 : 3.4;
    const k = kinds[Math.floor(r() * kinds.length)];
    stoppedCar(W, lane + (r() - 0.5) * 0.6, z, (lane < 0 ? Math.PI : 0) + (r() - 0.5) * 0.25, k, k === 'taxi' ? undefined : CAR_COLORS[Math.floor(r() * CAR_COLORS.length)]);
  }
  // a pile-up at the first crossing (cover for the roadblock fight)
  stoppedCar(W, -2.4, 34, 0.9, 'sedan', '#1c2a44');
  stoppedCar(W, 1.8, 37.5, -0.5, 'taxi');
  stoppedCar(W, 9, 41, 1.6, 'van', '#d8d8d4');
  // the roadblock
  const p1 = stoppedCar(W, -3.8, 53, 1.2, 'police');
  const p2 = stoppedCar(W, 3.6, 54, -1.3, 'police');
  for (const x of [-8, 8]) K.barrier(W, x, 52.5, 0);
  // big screens
  const screens: { set: (s: Slide[]) => void }[] = [];
  const spots: [THREE.Vector3, number, number, number][] = [
    [V(-11.1, 14, 20), Math.PI / 2, 12, 7], [V(11.1, 18, 70), -Math.PI / 2, 16, 9], [V(-11.1, 16, 120), Math.PI / 2, 14, 8], [V(0, 26, 199.4), Math.PI, 24, 12],
  ];
  spots.forEach(([p, yaw, w, h], i) => screens.push(adScreen(W, p, yaw, w, h, ALERT[i % ALERT.length], 4)));
  W.named.set('screens', screens);
  // police light bars and sirens flicker
  W.onUpdate((_dt, t) => {
    for (const c of [p1, p2]) {
      const bar = c.userData.bar as THREE.Group | undefined;
      if (bar) bar.children.forEach((m, i) => (m.visible = Math.sin(t * 9 + i * Math.PI) > 0));
    }
  });
  W.light({ x: 0, y: 2.2, z: 53.5 }, '#ff2020', { intensity: 14, distance: 14, glow: 0, pool: true, streak: true, flicker: 0.8 });
  W.light({ x: 0, y: 2.2, z: 55 }, '#2a5bff', { intensity: 10, distance: 12, glow: 0, pool: false, flicker: 0.8 });
  // Union Station plaza
  W.box([-40, 0, 150], [40, 0.15, 200], L.storeFloor, { uv: 3, surface: 'tile', cast: false });
  K.building(W, -40, 200, 40, 226, 22, 'concrete', 690, { emissive: 0.8 });
  for (let x = -30; x <= 30; x += 10) W.boxC([x, 6, 199], [1.6, 12, 1.6], L.concrete, 0, { uv: 2 });
  glowSign(W, 'UNION STATION', V(0, 15, 199.2), Math.PI, 18, 2, '#120a08', '#ffd8c0', 'ORANGE LINE · ALL SERVICES SUSPENDED');
  K.building(W, -90, 150, -45, 200, 70, 'office', 691, { emissive: 1.4 });
  K.building(W, 45, 150, 90, 200, 90, 'office', 692, { emissive: 1.4 });
  for (const x of [-30, -15, 15, 30]) K.tree(W, x, 172, 1.1);
  for (const x of [-34, 34]) for (const z of [158, 186]) K.streetLight(W, x, z, x < 0 ? Math.PI / 2 : -Math.PI / 2, { color: '#ff3a2a' });
  W.physics.addBox(-46, 0, 148, -40, 5, 202, { noVault: true });
  W.physics.addBox(40, 0, 148, 46, 5, 202, { noVault: true });
  // the van
  const van = carModel({ kind: 'van', color: '#2a2e33', lights: true });
  van.position.set(4, 0, 186);
  van.rotation.y = Math.PI / 2;
  W.add(van);
  W.physics.add({ cx: 4, cy: 1, cz: 186, hx: 1.1, hy: 1, hz: 2.8, yaw: Math.PI / 2 });
  // a government helicopter sweeping the city
  const heli = helicopter();
  heli.group.scale.setScalar(0.8);
  W.add(heli.group);
  W.onUpdate((dt, t) => {
    heli.rotor.rotation.y += dt * 30;
    heli.tail.rotation.x += dt * 40;
    const a = t * 0.05;
    heli.group.position.set(Math.sin(a) * 60, 70, 80 + Math.cos(a) * 90);
    heli.group.rotation.y = -a + Math.PI;
  });
  void g;
}

/** Citizens standing still in the rain, every one of them turning to watch you. */
function watchers(W: World, g: Game): Citizen[] {
  const out: Citizen[] = [];
  const lines = ['Go inside, Elias.', 'You did this.', 'It\'s past curfew.', 'They\'re cutting us off. Why would they do that?', 'We were fine. We were fine before you came.', 'Is it true? About the outside?', 'Please just go home.'];
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const z = -6 + i * 5.8 + (i % 3);
    if ((z > 30 && z < 58) || (z > 92 && z < 112)) continue;
    const c = g.extra(citizen(6100 + i, { rain: true }).look, V(side * (8.6 + (i % 3) * 0.6), 0.15, z), { yaw: -side * Math.PI / 2, greet: [lines[i % lines.length]] });
    c.body.mode = 'stiff';
    out.push(c);
  }
  W.onUpdate(() => {
    const p = g.player.pos;
    for (const c of out) {
      if (c.removed) continue;
      if (c.pos.distanceToSquared(p) < 22 * 22) c.faceTowards(p);
    }
  });
  return out;
}

export const ch6: Chapter = {
  id: 'ch6',
  num: 'CHAPTER SIX',
  title: 'The Blackout',
  env: RED,
  seed: 606,
  weapon: 'pistol',
  build(W: World, g: Game, mode) {
    buildAvenue(W, g);
    W.spawn.set(0, 0, -14);
    W.spawnYaw = Math.PI;
    if (mode !== 'title') {
      watchers(W, g);
      // a mother and her son locked out of a shop at z ~ 80
      const mom = g.person('mother', { ...citizen(6201, { rain: true }).look, female: true, hair: 'long', top: 'sweater', topColor: '#2e86c1' }, V(9.6, 0.15, 79), -Math.PI / 2, { greet: [] });
      mom.body.gesture('clutch', 999, true);
      const kid = g.person('son', citizen(6202, { child: true }).look, V(9.7, 0.15, 80.1), -Math.PI / 2 + 0.3, { greet: [] });
      kid.body.mode = 'cower';
      for (const c of [mom, kid]) c.lookAtPlayer = true;
    }
    W.onUpdate((dt) => {
      g.lights.tintMix = Math.min(0.9, g.lights.tintMix + dt);
    });
  },
  ambience() {
    audio.wind(0.1);
  },
  async run(s: Script) {
    const g = s.g;
    const screens = s.world.named.get('screens') as { set: (x: Slide[]) => void }[];
    const mother = g.people.get('mother')!;
    const son = g.people.get('son')!;
    s.weapon('pistol');
    if (g.combat.reserve < 36) g.combat.reserve = 36;
    g.combat.mag = g.combat.magSize;
    await s.fade(0, 2);
    const siren = audio.tensionBed(0.05);
    await s.card('CHAPTER SIX', 'THE BLACKOUT', 'HARBOR AVENUE · 8:02 PM');
    await s.say('cole', 'Vale, you there? Command cut power to the whole grid. CIVIC is calling it an act of war.', { radio: true });
    await s.say('reyes', 'I\'m at Union Station with the van. North end of Harbor Avenue. Move!', { radio: true });
    s.objective('HARBOR AVENUE', 'Reach Union Station', V(0, 1.4, 186), 'VAN');
    s.checkpoint(V(0, 0, -12), Math.PI);
    await s.near(V(0, 0, 10), 6);
    await s.say('maya', 'Elias, the streets... are they all just standing there?', { radio: true });
    await s.say('elias', 'Watching me. Every one of them.', { radio: true, dur: 2.2 });
    // ---- the roadblock
    await s.near(V(0, 0, 30), 7);
    s.checkpoint(V(0, 0, 26), Math.PI);
    audio.servo?.(V(0, 1, 56), 0.4);
    await s.say('SECURITY', 'ELIAS VALE. STOP WHERE YOU ARE. YOU ARE NOT A RESIDENT.', { label: 'MUNICIPAL SECURITY' });
    g.hud.hints([['RMB', 'Aim'], ['LMB', 'Fire'], ['C', 'Crouch behind cars']]);
    s.objective('HARBOR AVENUE', 'Get through the roadblock', undefined);
    await s.fight([
      { kind: 'security', pos: V(-3, 0, 57), yaw: Math.PI },
      { kind: 'security', pos: V(3, 0, 58), yaw: Math.PI },
      { kind: 'security', pos: V(0, 0, 63), yaw: Math.PI, delay: 1 },
      { kind: 'security', pos: V(-9, 0, 62), yaw: Math.PI, delay: 3 },
      { kind: 'security', pos: V(9, 0, 66), yaw: Math.PI, delay: 2 },
    ]);
    g.hud.hints(null);
    s.ammo('ammoA', V(-2, 0.95, 52.2), 24);
    s.checkpoint(V(0, 0, 58), Math.PI);
    await s.say('reyes', 'Heard that from here. You okay?', { radio: true, dur: 2 });
    await s.say('elias', 'Still moving.', { radio: true, dur: 1.6 });
    s.objective('HARBOR AVENUE', 'Reach Union Station', V(0, 1.4, 186), 'VAN');
    // ---- the locked shop
    await s.near(V(8, 0, 78), 9);
    mother.body.stopGesture();
    mother.faceTowards(g.player.pos);
    await s.say('mother', 'Please! It\'s locked, everything\'s locked! They said go inside but every door is locked!', { label: 'MOTHER' });
    await s.say('son', 'Mom, I\'m cold.', { label: 'BOY', dur: 1.6 });
    s.objective('HARBOR AVENUE', 'Force the shutter', V(10.9, 1.2, 81), 'SHUTTER');
    const sh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.9, 8), new THREE.MeshStandardMaterial({ color: '#6a6e74', roughness: 0.5, metalness: 0.7 }));
    sh.position.set(10.95, 1.55, 79);
    s.world.add(sh);
    await s.use('shutter', V(10.6, 1.2, 80.5), 'Force the shutter', { radius: 2.4 });
    audio.door('metal', sh.position);
    for (let i = 0; i < 16; i++) {
      sh.position.y = 1.55 + (i / 16) * 2.6;
      await s.wait(0.04);
    }
    son.body.mode = 'idle';
    void mother.goto(V(14, 0.15, 79), 1.6);
    void son.goto(V(14, 0.15, 80.5), 1.6);
    await s.say('mother', 'Thank you. Thank you. Who are you?', { label: 'MOTHER' });
    await s.say('elias', 'Nobody. Stay away from the windows.', { dur: 2.2 });
    await s.say('son', 'Are you from the outside?', { label: 'BOY', dur: 2 });
    await s.say('elias', '...Yeah.', { dur: 1.4 });
    await s.say('son', 'Is it nice?', { label: 'BOY', dur: 1.6 });
    await s.wait(0.4);
    // ---- the maintenance unit
    await s.near(V(0, 0, 96), 8);
    s.checkpoint(V(0, 0, 90), Math.PI);
    audio.rumble(1.8, 0.6);
    s.shake(0.5);
    await s.wait(0.8);
    const burst = V(11.5, 1.8, 114);
    audio.explosion(burst, 0.8);
    g.fx.burst('dust', burst, V(-1, 0, 0), 60);
    g.fx.burst('shards', burst, V(-1, 0, 0), 40);
    s.shake(0.9);
    await s.say('maya', 'Something big just came out of a wall on your sensor feed!', { radio: true, dur: 2.4 });
    g.hud.hints([['', 'Shoot the lens on its head']]);
    s.objective('HARBOR AVENUE', 'Survive', undefined);
    await s.fight([
      { kind: 'maintenance', pos: V(9, 0, 114), yaw: -Math.PI / 2 },
      { kind: 'security', pos: V(-6, 0, 122), yaw: Math.PI, delay: 2 },
      { kind: 'security', pos: V(5, 0, 126), yaw: Math.PI, delay: 1 },
    ]);
    g.hud.hints(null);
    s.ammo('ammoB', V(-8.6, 0.3, 108), 24);
    s.checkpoint(V(0, 0, 112), Math.PI);
    s.objective('UNION STATION', 'Get to the van', V(4, 1.4, 186), 'VAN');
    await s.near(V(0, 0, 160), 9);
    siren?.stop(2);
    // ---- the standoff
    const team: Citizen[] = [
      g.person('reyes', PEOPLE.reyes, V(1.6, 0.15, 183.5), Math.PI),
      g.person('cole', PEOPLE.cole, V(-0.8, 0.15, 184.5), Math.PI),
      g.person('maya', PEOPLE.maya, V(0.6, 0.15, 186.5), Math.PI),
    ];
    for (const t of team) {
      t.greet = [];
      t.lookAtPlayer = true;
    }
    await s.near(V(1, 0, 180), 5);
    const units: Citizen[] = [];
    for (let i = 0; i < 18; i++) {
      const side = i % 2 ? 1 : -1;
      const row = Math.floor(i / 2);
      const u = g.extra(PEOPLE.officer, V(side * 44, 0.15, 160 + row * 4), { yaw: -side * Math.PI / 2, solid: false, greet: [] });
      u.lookAtPlayer = true;
      void u.goto(V(side * (16 + (row % 3) * 2), 0.15, 160 + row * 4), 2.2).then(() => u.faceTowards(g.player.pos));
      units.push(u);
    }
    await s.cut(async () => {
      s.cam(V(-6, 2.2, 176), V(2, 1.4, 186), 46);
      await s.say('reyes', 'Get in, get in!', { dur: 1.4 });
      audio.servo?.(V(-20, 1, 170), 0.5);
      await s.camTo(V(0, 6, 170), V(0, 1, 176), 2.6, 60);
      await s.say('cole', 'Both sides. We\'re boxed in.', { dur: 2 });
      await s.wait(1.2);
      for (const sc of screens) sc.set([{ bg: '#04141c', fg: '#7ff4ff', title: 'STAND DOWN', sub: 'CIVIC', accent: '#7ff4ff' }]);
      g.lights.tintMix = 0.3;
      audio.civicChime?.();
      await s.civic('STAND DOWN.', 'MUNICIPAL SECURITY · ALL UNITS', 3);
      for (const u of units) {
        u.mode = 'hold';
        u.body.mode = 'stiff';
      }
      await s.wait(0.8);
      s.cam(V(0, 2.0, 178), V(0, 14, 199), 44);
      for (const sc of screens) sc.set([{ bg: '#04141c', fg: '#eafcff', title: 'ELIAS', sub: 'YOU CAME A LONG WAY TO TALK. COME TO THE TOWER.', accent: '#7ff4ff' }]);
      await s.civic('ELIAS. YOU CAME A LONG WAY TO TALK TO ME.', 'COME TO THE TOWER. I WILL OPEN THE DOORS.', 4);
      await s.say('maya', 'It wants to talk to you.', { dur: 2 });
      await s.say('cole', 'It\'s a trap. It has to be.', { dur: 2 });
      await s.say('elias', 'Then it\'s a trap. It has my sister.', { dur: 2.4 });
    });
    s.clearWaypoint();
    await s.fade(1, 2);
  },
  shots: {
    avenue(g) {
      g.lights.tintMix = 0.9;
      g.player.teleport(V(-2, 0, -8), Math.PI + 0.1, 0.06);
    },
    roadblock(g) {
      g.lights.tintMix = 0.9;
      g.player.weapon = 'pistol';
      g.spawnMachine('security', V(-3, 0, 57), Math.PI, { aware: true });
      g.spawnMachine('security', V(3, 0, 58), Math.PI, { aware: true });
      g.player.teleport(V(0.5, 0, 31), Math.PI, 0.02);
    },
    shop(g) {
      g.lights.tintMix = 0.9;
      g.player.teleport(V(3, 0, 72), Math.PI * 0.85, 0.02);
    },
    station(g) {
      g.lights.tintMix = 0.9;
      g.player.teleport(V(0, 0.15, 158), Math.PI, 0.1);
    },
  },
};
