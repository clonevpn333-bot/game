import * as THREE from 'three';
import type { Chapter } from './index';
import { V, helicopter } from './common';
import * as K from '../world/Kit';
import { M, signMaterial, glowMaterial } from '../render/Materials';
import { SKY } from '../render/Sky';
import { audio } from '../audio/AudioEngine';
import type { World } from '../world/World';
import type { Game, Script } from '../game/Game';
import { CIVILIANS } from '../actors/Characters';
import { G } from '../render/Globals';

const FY = 24; // "floor 61"
const LY = 12; // floor below

type Reality = 'present' | 'future' | 'alt';
interface Tower {
  cab: THREE.Group;
  cabCol: ReturnType<World['physics']['add']>;
  sets: Record<Reality, THREE.Group>;
  hole: ReturnType<World['physics']['add']>[];
}

const GEO: Record<string, THREE.BufferGeometry> = {};
const geo = (k: string, w: number, h: number, d: number) => (GEO[k] ??= new THREE.BoxGeometry(w, h, d));

function officeSet(kind: Reality | 'past', y: number): THREE.Group {
  const L = M();
  const g = new THREE.Group();
  for (const k of Object.keys(GEO)) if (!GEO[k].attributes.position) delete GEO[k];
  const deskM = kind === 'future' ? new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 1 }) : L.plasticWhite;
  for (let x = -14; x <= 14; x += 4) {
    for (let z = 4; z <= 36; z += 5) {
      if (Math.abs(x) < 7 && z > 10 && z < 22) continue;
      const d = new THREE.Group();
      d.add(K.mesh(geo('top', 1.6, 0.05, 0.8), deskM, 0, 0.74, 0));
      d.add(K.mesh(geo('leg', 0.05, 0.74, 0.75), L.metalDark, -0.75, 0.37, 0));
      d.add(K.mesh(geo('leg', 0.05, 0.74, 0.75), L.metalDark, 0.75, 0.37, 0));
      d.add(K.mesh(geo('mon', 0.6, 0.38, 0.03), L.plasticDark, 0, 1.05, -0.2));
      if (kind !== 'future') d.add(K.mesh(geo('scr', 0.56, 0.32, 0.01), kind === 'present' ? L.black : L.lightCool, 0, 1.05, -0.18));
      d.add(K.mesh(geo('seat', 0.5, 0.08, 0.5), L.fabric, 0, 0.5, 0.6));
      d.position.set(x, y, z);
      d.rotation.y = kind === 'future' ? (x * z) % 3 * 0.4 : 0;
      if (kind === 'alt') {
        d.rotation.z = Math.PI;
        d.position.y = y + 3.6;
      }
      if (kind === 'future' && (x + z) % 3 === 0) d.rotation.z = 0.6;
      g.add(d);
    }
  }
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  return g;
}

function buildTower(W: World, g: Game): Tower {
  const L = M();
  // ---------------------------------------------------------------- lobby (y 0)
  K.room(W, -16, 0, 16, 32, 7, L.concrete, L.storeFloor, L.metalDark, [{ wall: 'n', c: 0, w: 4, h: 4 }], { floorSurface: 'tile' });
  W.indoor([-16, 0, 0], [16, 7, 32]);
  W.quad(signMaterial('MERIDIAN TOWER', { bg: '#0a0c10', fg: '#d8e8ff', w: 1024, h: 128, intensity: 2.2 }), { x: 0, y: 5.4, z: 31.85 }, 8, 1, Math.PI);
  W.boxC([0, 0.6, 18], [8, 1.2, 1.4], L.metalDark, 0);
  for (const x of [-10, 10]) for (const z of [6, 14, 22]) W.boxC([x, 3.5, z], [1, 7, 1], L.concrete, 0, { uv: 1 });
  for (const x of [-8, 0, 8]) for (const z of [8, 20]) K.ceilingLight(W, x, 6.98, z, { intensity: 10, distance: 12, flicker: x === 8 ? 0.5 : 0 });
  // elevator bank on the north wall: one shaft is open
  for (const x of [-6, -3, 3, 6]) W.boxC([x, 1.4, 31.9], [1.6, 2.8, 0.1], L.steel, 0, { collide: false });
  // shaft (x -1.2..1.2, z 32..35) up to the office floor
  W.box([-1.4, 0, 32], [-1.2, FY + 4, 35.4], L.concreteDark, { uv: 2 });
  W.box([1.2, 0, 32], [1.4, FY + 4, 35.4], L.concreteDark, { uv: 2 });
  W.box([-1.4, 0, 35.2], [1.4, FY + 4, 35.4], L.concreteDark, { uv: 2 });
  W.box([-1.2, -2, 32], [1.2, -1.8, 35.2], L.metal, {});
  W.boxC([0, -1.4, 33.6], [2.2, 0.8, 2.6], L.metalDark, 0.2, { collide: false });
  // the cab (exists in the Echo; rides up)
  const cab = new THREE.Group();
  cab.add(K.mesh(K.box(2.3, 0.15, 3.0), L.steel, 0, 0, 0));
  cab.add(K.mesh(K.box(2.3, 0.1, 3.0), L.metal, 0, 2.8, 0));
  for (const sx of [-1.12, 1.12]) cab.add(K.mesh(K.box(0.05, 2.8, 3.0), L.steel, sx, 1.4, 0));
  cab.add(K.mesh(K.box(2.3, 2.8, 0.05), L.steel, 0, 1.4, 1.5));
  cab.add(K.mesh(K.box(1.6, 0.04, 0.6), L.lightWarm, 0, 2.72, 0));
  cab.position.set(0, 0, 33.6);
  W.add(cab, 'echo');
  const cabCol = W.physics.add({ cx: 0, cy: -0.07, cz: 33.6, hx: 1.15, hy: 0.08, hz: 1.5, layer: 'echo' });
  // ---------------------------------------------------------------- office floor (y FY)
  const fy = FY;
  // floor slabs around a central hole (present) — the past floor fills it
  W.box([-20, fy - 0.3, 0], [20, fy, 10], L.carpetOffice, { uv: 2, surface: 'carpet' });
  W.box([-20, fy - 0.3, 22], [20, fy, 40], L.carpetOffice, { uv: 2, surface: 'carpet' });
  W.box([-20, fy - 0.3, 10], [-8, fy, 22], L.carpetOffice, { uv: 2, surface: 'carpet' });
  W.box([8, fy - 0.3, 10], [20, fy, 22], L.carpetOffice, { uv: 2, surface: 'carpet' });
  W.box([-8, fy - 0.3, 10], [8, fy, 22], L.carpetOffice, { uv: 2, surface: 'carpet', layer: 'echo' });
  // ragged edges of the hole
  for (let i = 0; i < 10; i++) W.boxC([-7.5 + i * 1.6, fy - 0.5, i % 2 ? 10.3 : 21.7], [1.4, 0.6, 0.8], L.concreteDark, i * 0.4, { collide: false });
  W.box([-20, fy + 4, 0], [20, fy + 4.3, 40], L.plasterWhite, { uv: 2 });
  for (const x of [-12, -4, 4, 12]) for (const z of [6, 16, 26, 34]) W.boxC([x, fy + 2, z], [0.8, 4, 0.8], L.concrete, 0, { uv: 1 });
  // curtain wall: mullions + glass (west side is where the helicopter comes in)
  for (let z = 0; z <= 40; z += 2.5) {
    W.boxC([-20, fy + 2, z], [0.15, 4, 0.15], L.metalDark, 0, { collide: false });
    W.boxC([20, fy + 2, z], [0.15, 4, 0.15], L.metalDark, 0, { collide: false });
  }
  W.box([-20.1, fy, 0], [-19.9, fy + 4, 40], L.glass, { noShoot: true });
  W.box([19.9, fy, 0], [20.1, fy + 4, 40], L.glass, { noShoot: true });
  W.box([-20, fy, 39.9], [20, fy + 4, 40.1], L.concreteDark, {});
  W.box([-20, fy, -0.1], [20, fy + 4, 0.1], L.concreteDark, {});
  W.indoor([-20, fy - 0.4, 0], [20, fy + 4.3, 40]);
  // shaft door opening on this floor
  W.box([-1.4, fy, 31.8], [1.4, fy + 0.02, 32.2], L.steel, { collide: false });
  // stairwell exit sign (far corner)
  W.quad(signMaterial('STAIRS', { bg: '#0c3a10', fg: '#70ff80', w: 256, h: 96, intensity: 2.5 }), { x: 17, y: fy + 2.6, z: 0.15 }, 1, 0.35, 0);
  W.light({ x: 17, y: fy + 2.4, z: 0.8 }, '#40ff60', { intensity: 3, distance: 5, glow: 0.3, pool: false });
  // ceiling lights: past only
  for (const x of [-12, 0, 12]) for (const z of [5, 15, 25, 35]) K.ceilingLight(W, x, fy + 3.98, z, { intensity: 8, distance: 10, layer: 'echo', long: true });
  // present: emergency lights
  for (const [x, z] of [[-18, 4], [18, 36], [0, 38]]) W.light({ x, y: fy + 3.6, z }, '#ff3020', { intensity: 4, distance: 9, glow: 0.3, pool: false, layer: 'present', flicker: 0.4 });
  // ---------------------------------------------------------------- floor below (y LY): burning future, echo bridge to the stairs
  W.box([-20, LY - 0.3, 20], [20, LY, 40], L.concreteDark, { uv: 3, surface: 'concrete' });
  W.box([-20, LY - 0.3, 0], [20, LY, 8], L.concreteDark, { uv: 3, surface: 'concrete' });
  W.box([-3, LY - 0.3, 8], [3, LY, 20], L.concreteDark, { uv: 3, layer: 'echo' });
  W.box([-20, LY + 4, 0], [20, LY + 4.3, 40], L.concreteDark, { uv: 3, collide: false });
  for (let i = 0; i < 12; i++) {
    const x = -16 + i * 3;
    W.light({ x, y: LY + 0.5, z: 24 + (i % 3) * 4 }, '#ff6020', { intensity: 10, distance: 8, flicker: 0.6, glow: 1.2, pool: false });
  }
  W.light({ x: 16, y: LY + 2, z: 2 }, '#40ff60', { intensity: 4, distance: 6, glow: 0.4, pool: false });
  W.quad(signMaterial('EXIT', { bg: '#0c3a10', fg: '#70ff80', w: 256, h: 96, intensity: 2.5 }), { x: 16, y: LY + 2.6, z: 0.15 }, 1, 0.35, 0);
  W.box([-20, LY, 0], [-19.8, LY + 4, 40], L.black, {});
  W.box([19.8, LY, 0], [20, LY + 4, 40], L.black, {});
  // skyline far below + around
  K.skyline(W, 0, 20, 70, 320, 160, 61, 120);
  // reality sets
  const sets: Record<Reality, THREE.Group> = {
    present: officeSet('present', fy),
    future: officeSet('future', fy),
    alt: officeSet('alt', fy),
  };
  for (const k of Object.keys(sets) as Reality[]) {
    W.add(sets[k]);
    sets[k].visible = k === 'present';
  }
  const past = officeSet('past', fy);
  W.add(past, 'echo');
  // future: fire light cards
  for (let i = 0; i < 8; i++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMaterial('#ff7020', 1.5, 'fire'));
    f.position.set(-14 + i * 4, fy + 0.6, 6 + (i * 7) % 30);
    f.scale.setScalar(2.2);
    f.userData.billboard = true;
    sets.future.add(f);
  }
  // alt: floating debris
  for (let i = 0; i < 30; i++) {
    const m = K.mesh(K.box(0.3 + (i % 3) * 0.2, 0.3, 0.3), L.concrete, -18 + (i * 7) % 36, fy + 1 + (i % 5) * 0.6, 2 + (i * 13) % 36);
    sets.alt.add(m);
  }
  W.physics.killY = -10;
  void g;
  return { cab, cabCol, sets, hole: [] };
}

let tower: Tower | null = null;
let reality: Reality = 'present';

function setReality(g: Game, r: Reality): void {
  if (!tower) return;
  reality = r;
  for (const k of Object.keys(tower.sets) as Reality[]) tower.sets[k].visible = k === r;
  const scene = g.engine.scene;
  const fog = scene.fog as THREE.FogExp2;
  if (r === 'present') {
    g.sky.set(SKY.storm);
    fog.color.set('#0b0f16');
    g.hemi.color.set('#5a6a88');
    g.engine.post.uTint.value.set('#f2f4ff');
    G.uWarp.value = 0;
  } else if (r === 'future') {
    g.sky.set(SKY.future);
    fog.color.set('#2a120a');
    g.hemi.color.set('#ff8040');
    g.engine.post.uTint.value.set('#ffd8b8');
    G.uWarp.value = 0;
  } else {
    g.sky.set(SKY.other);
    fog.color.set('#1a0c30');
    g.hemi.color.set('#a080ff');
    g.engine.post.uTint.value.set('#e8d8ff');
    G.uWarp.value = 0.35;
  }
  audio.reversedSwell(0.2, 0.8);
  g.engine.post.uGlitch.value = 1;
  window.setTimeout(() => (g.engine.post.uGlitch.value = 0), 180);
}

export const ch6: Chapter = {
  id: 'ch6', num: 'CHAPTER SIX', title: 'The Collapse', sub: 'Meridian Tower',
  env: {
    sky: SKY.storm, fog: '#0b0f16', fogDensity: 0.012, rain: 0.9, envKind: 'city', exposure: 1.15,
    hemi: ['#5a6a88', '#120e0a', 0.25], moon: { color: '#8aa0c8', intensity: 0.4, dir: [-0.6, 1, 0.2] }, reverb: [2.6, 0.35], bloom: 0.6, floorY: -60,
    grade: { sat: 0.92, tint: '#f2f4ff', vignette: 1.0 },
  },
  chars: ['elias', 'maya', 'reyes', 'voss', 'civ_office', 'civ_woman', 'civ_man', 'remnant'],
  echoUnlocked: true,
  gun: true,
  seed: 6,
  build(W, g) {
    tower = buildTower(W, g);
    reality = 'present';
    W.spawn.set(0, 0, 4);
    W.spawnYaw = 0;
  },
  ambience() {
    audio.setRain(0.9, false);
    audio.wind(0.25);
    audio.drone(0.08, 30, 0.7);
  },
  shots: {
    floor(g) {
      g.player.teleport(V(0, FY, 30), Math.PI);
      g.player.camPitch = -0.05;
      g.player.snapCamera();
    },
    future(g) {
      g.player.teleport(V(-6, FY, 28), Math.PI + 0.4);
      setReality(g, 'future');
      g.player.snapCamera();
    },
    alt(g) {
      g.player.teleport(V(6, FY, 28), Math.PI - 0.4);
      setReality(g, 'alt');
      g.player.snapCamera();
    },
  },
  async run(s) {
    await lobby(s);
    await ride(s);
    await shifting(s);
    await crash(s);
  },
};

async function lobby(s: Script): Promise<void> {
  const g = s.g;
  g.hud.setFade(1);
  const maya = g.npc('maya', V(-2, 0, 6), 0);
  const reyes = g.npc('reyes', V(2.5, 0, 5), 0);
  const voss = g.npc('voss', V(-1, 0, 2.5), 0);
  s.control(false);
  void s.fade(0, 2);
  await s.card('CHAPTER SIX', 'THE COLLAPSE', 'MERIDIAN TOWER');
  s.control(true);
  for (const n of [maya, reyes, voss]) n.follow();
  await s.say('REYES', 'Eighty-eight floors and the elevators are dead. Of course.');
  await s.say('VOSS', 'The relay is on sixty-one.');
  s.objective('MERIDIAN TOWER', 'Find a way up');
  await s.zone([-2, -1, 28], [2, 3, 32]);
  await s.say('MAYA', 'Shaft\'s empty. Cab\'s wrecked at the bottom.');
  await s.say('ELIAS', 'It wasn\'t, eleven years ago.');
  await s.say('VOSS', 'Elias, an Echo that long—', { dur: 1.6 });
  await s.say('ELIAS', 'I\'ll call down when I\'m there.');
  for (const n of [maya, reyes, voss]) n.hold(0);
  g.hud.hints([['Q', 'Enter Echo']]);
  s.objective('ELEVATOR', 'Ride the elevator as it was');
  await s.until(() => g.echo.active && Math.abs(g.player.pos.x) < 1.1 && g.player.pos.z > 32.2 && g.player.pos.z < 35);
  g.hud.hints(null);
}

async function ride(s: Script): Promise<void> {
  const g = s.g;
  const t = tower!;
  g.echo.enter(16, true);
  audio.elevatorDing(V(0, 1.5, 33.6));
  audio.door('slide', V(0, 1.5, 32));
  s.control(false);
  let y = 0;
  let done = false;
  g.world!.onUpdate((dt) => {
    if (done) return;
    y = Math.min(FY, y + dt * 2.0);
    t.cab.position.y = y;
    t.cabCol.cy = y - 0.07;
    if (y >= FY) done = true;
  });
  await s.cut(async () => {
    s.cam(V(0.8, 2.3, 34.6), V(0, 1.2, 32), 60);
    let flick = 0;
    const id = window.setInterval(() => {
      flick++;
      setReality(g, (['future', 'alt', 'present', 'future', 'present'] as Reality[])[flick % 5]);
      s.shake(0.25);
      audio.rumble(1.2, 0.3);
    }, 2100);
    while (!done) {
      g.cine.pos.set(0.8, y + 2.3, 34.6);
      g.cine.look.set(0, y + 1.2, 32);
      g.player.pos.set(0, y, 33.6);
      await s.wait(0.05);
    }
    clearInterval(id);
    setReality(g, 'present');
    audio.elevatorDing(V(0, FY + 1.5, 33.6));
    g.player.teleport(V(0, FY, 30.5), Math.PI);
    await s.wait(0.4);
  });
  s.checkpoint(V(0, FY, 30), Math.PI);
  await s.say('ELIAS', 'I\'m up. Sixty-one.', { radio: true });
  await s.say('MAYA', 'Elias, the readings down here are going insane. The whole building is— it\'s flickering.', { radio: true });
}

async function shifting(s: Script): Promise<void> {
  const g = s.g;
  s.objective('FLOOR 61', 'Reach the relay by the stairwell');
  // ghosts of office workers, only in the past
  for (let i = 0; i < 8; i++) {
    const x = -14 + (i % 4) * 8;
    const z = 6 + Math.floor(i / 4) * 24;
    const gh = g.ghost(CIVILIANS[i % 3 === 0 ? 2 : i % 5], [V(x, FY, z), V(x + 2, FY, z + 3), V(x - 1, FY, z + 5)], { speed: 0.7 });
    void gh;
  }
  let cycle = 0;
  let active = true;
  const order: Reality[] = ['present', 'future', 'present', 'alt'];
  g.world!.onUpdate((dt) => {
    if (!active) return;
    cycle += dt;
    if (cycle > 5.5) {
      cycle = 0;
      const next = order[(order.indexOf(reality) + 1) % order.length];
      setReality(g, next);
      if (next === 'alt') {
        g.player.trauma = 0.6;
        g.player.camPitch += 0.25;
      }
    }
  });
  await s.say('ELIAS', 'The floor\'s gone in the middle. Eleven years ago it was solid.', { dur: 3 });
  await s.zone([-20, FY - 1, 0], [20, FY + 4, 9]);
  active = false;
  s.checkpoint(V(0, FY, 6), Math.PI);
}

async function crash(s: Script): Promise<void> {
  const g = s.g;
  setReality(g, 'present');
  const h = helicopter(true);
  h.group.position.set(-80, FY + 10, 4);
  h.group.rotation.y = Math.PI / 2;
  g.world!.add(h.group);
  let ht = 0;
  let flying = true;
  g.world!.onUpdate((dt) => {
    h.rotor.rotation.y += dt * 12;
    h.tail.rotation.x += dt * 30;
    if (!flying) return;
    ht += dt;
    h.group.position.x = -80 + ht * 30;
    h.group.position.y = FY + 10 - ht * 3.2;
    h.group.rotation.z = Math.sin(ht * 3) * 0.3 + ht * 0.25;
  });
  const heliSnd = audio.helicopter(0.6, false);
  await s.cut(async () => {
    s.cam(V(8, FY + 1.8, 2.5), V(-20, FY + 3, 4), 50);
    await s.say('PILOT', 'Mayday, mayday— instruments are gone— I can\'t see the city, I can\'t see—', { radio: true, dur: 3 });
    await s.wait(0.8);
    s.shake(0.4);
    while (h.group.position.x < -18) await s.wait(0.05);
    flying = false;
    audio.explosion(V(-16, FY + 2, 4), 1);
    audio.impact('glass', V(-20, FY + 2, 4), 1.5);
    g.fx.burst('glass', V(-19.5, FY + 2, 4), V(1, 0, 0), 120);
    g.fx.burst('embers', V(-16, FY + 1, 4), undefined, 120);
    g.fx.burst('smoke', V(-16, FY + 1, 4), undefined, 40);
    G.uFlash.value = 3;
    g.engine.post.uWhite.value = 0.6;
    s.shake(1);
    h.group.position.set(-14, FY + 0.6, 4);
    h.group.rotation.set(0.2, Math.PI / 2 + 0.6, 0.9);
    await s.wait(0.2);
    g.engine.post.uWhite.value = 0;
    heliSnd?.stop(0.2);
    await s.camTo(V(6, FY + 1.2, 3), V(-10, FY + 1, 4), 1.4, 58);
    audio.rumble(3, 0.8);
    await s.say('ELIAS', '—!', { dur: 0.8 });
    // the floor gives way
    s.shake(1);
    await s.camTo(V(4, FY - 3, 4), V(0, FY + 2, 4), 1.2, 70);
    await s.fade(1, 0.3, true);
  });
  heliSnd?.stop(0.1);
  // wake on the floor below, in the burning future
  setReality(g, 'future');
  g.player.teleport(V(0, LY, 34), Math.PI);
  g.player.health = 55;
  s.checkpoint(V(0, LY, 34), Math.PI);
  await s.wait(0.8);
  void s.fade(0, 2);
  audio.drone(0.06, 44, 0.9);
  await s.say('MAYA', 'ELIAS! Elias, answer me!', { radio: true });
  await s.say('ELIAS', '...Still here. I fell. A floor. Maybe two.', { radio: true });
  await s.say('REYES', 'That was a helicopter. That was OUR helicopter. Somebody tell me why our ride just flew into a building.', { radio: true });
  await s.say('VOSS', 'Because to the pilot, the tower wasn\'t there. Get to the stairs, Elias.', { radio: true });
  s.objective('FLOOR 58', 'Reach the stairwell');
  g.hud.hints([['Q', 'Enter Echo']]);
  await s.zone([10, LY - 1, 0], [20, LY + 4, 6]);
  g.hud.hints(null);
  await s.say('VOSS', 'Elias. Listen to me carefully. There is a laboratory under the Civic Center. I\'m going to tell you everything. Meet us at the shaft.', { radio: true, dur: 5 });
  await s.fade(1, 2);
  setReality(g, 'present');
}
