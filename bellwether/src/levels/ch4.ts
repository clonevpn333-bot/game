import * as THREE from 'three';
import type { Chapter } from './index';
import type { World, EnvSettings } from '../world/World';
import type { Game, Script } from '../game/Game';
import * as K from '../world/Kit';
import { M } from '../render/Materials';
import { SKY } from '../render/Sky';
import { audio } from '../audio/AudioEngine';
import { PEOPLE } from '../actors/Cast';
import { Blocky, mulberry, type Look } from '../actors/Blocky';
import type { Citizen } from '../game/Citizen';
import { V, glowSign } from './common';
import * as D from './dress';

/*
  The Undercity, all at y = 0, ceilings ~4.5 in tunnels, 16 in the hall.
  Shaft room x ∈ [-4, 4], z ∈ [0, 8]. Tunnel A z ∈ [8, 60] (x ∈ [-3, 3]) crossed at z ∈ [36, 44]
  by a patrol corridor x ∈ [-22, 22]. Tunnel B z ∈ [60, 90]. Rehearsal Hall x ∈ [-30, 30], z ∈ [90, 170].
*/
const DARK: EnvSettings = {
  sky: SKY.void, fog: '#06080b', fogDensity: 0.016, rain: 0, envKind: 'subway', exposure: 1.15,
  hemi: ['#4a5a6e', '#16120e', 0.4], reverb: [3.2, 0.45], bloom: 0.75, motes: 0.6, grade: { sat: 0.95, vignette: 1.05 }, indoorRain: false,
};

function tunnel(W: World, x0: number, z0: number, x1: number, z1: number, h: number, alongZ: boolean, openEnds: [boolean, boolean] = [true, true]): void {
  const L = M();
  const wallM = D.paint('#4a4e52', 0.85);
  W.box([x0, -0.2, z0], [x1, 0, z1], L.concreteDark, { uv: 3, surface: 'concrete', cast: false });
  W.box([x0, h, z0], [x1, h + 0.4, z1], L.concrete, { uv: 3, collide: false });
  if (alongZ) {
    W.box([x0 - 0.4, 0, z0], [x0, h, z1], wallM, { uv: 3 });
    W.box([x1, 0, z0], [x1 + 0.4, h, z1], wallM, { uv: 3 });
    // pipes + cable tray along both walls
    for (const sx of [x0 + 0.25, x1 - 0.25]) {
      W.box([sx - 0.12, h - 0.7, z0], [sx + 0.12, h - 0.46, z1], L.metalDark, { collide: false, cast: false });
      W.box([sx - 0.07, h - 1.1, z0], [sx + 0.07, h - 0.96, z1], D.paint('#8a5a2a', 0.5), { collide: false, cast: false });
    }
    W.box([x0 + 0.05, h - 0.3, z0], [x0 + 0.5, h - 0.25, z1], L.metal, { collide: false, cast: false });
    if (!openEnds[0]) W.box([x0, 0, z0 - 0.4], [x1, h, z0], wallM, { uv: 3 });
    if (!openEnds[1]) W.box([x0, 0, z1], [x1, h, z1 + 0.4], wallM, { uv: 3 });
  } else {
    W.box([x0, 0, z0 - 0.4], [x1, h, z0], wallM, { uv: 3 });
    W.box([x0, 0, z1], [x1, h, z1 + 0.4], wallM, { uv: 3 });
    for (const sz of [z0 + 0.25, z1 - 0.25]) W.box([x0, h - 0.7, sz - 0.12], [x1, h - 0.46, sz + 0.12], L.metalDark, { collide: false, cast: false });
    if (!openEnds[0]) W.box([x0 - 0.4, 0, z0], [x0, h, z1], wallM, { uv: 3 });
    if (!openEnds[1]) W.box([x1, 0, z0], [x1 + 0.4, h, z1], wallM, { uv: 3 });
  }
}

function caged(W: World, x: number, y: number, z: number, color: string, intensity = 5, flicker = 0): void {
  const L = M();
  W.boxC([x, y, z], [0.3, 0.2, 0.3], L.metalDark, 0, { collide: false, cast: false });
  W.light({ x, y: y - 0.15, z }, color, { intensity, distance: 9, glow: 0.5, pool: true, streak: false, flicker });
}

/** A Discarded prototype stuck in one human gesture forever. */
function rehearsal(g: Game, W: World, look: Look, pos: THREE.Vector3, yaw: number, act: 'handshake' | 'laugh' | 'eat' | 'greet' | 'hug' | 'sit', seed: number): Blocky {
  const b = new Blocky(look);
  b.root.position.copy(pos);
  b.root.rotation.y = yaw;
  W.add(b.root);
  const r = mulberry(seed);
  const period = 2.4 + r() * 2;
  let t = r() * period;
  let spoke = false;
  if (act === 'sit') b.mode = 'sit';
  W.onUpdate((dt) => {
    t += dt;
    const ph = (t % period) / period;
    switch (act) {
      case 'handshake':
        if (ph < 0.6) b.setHold('handshake');
        else b.setHold(null);
        break;
      case 'laugh':
        b.talking = ph < 0.5 ? 1 : 0;
        b.setHold(ph < 0.5 ? 'talkhands' : null);
        break;
      case 'eat':
        b.mode = 'sit';
        b.setHold('eat');
        break;
      case 'greet':
        b.setHold(ph < 0.35 ? 'wave' : null);
        if (ph < 0.05 && !spoke && g.player.pos.distanceTo(pos) < 14) {
          spoke = true;
          audio.voice(pos.clone().setY(1.6), { pitch: 0.8 + r() * 0.6, vowels: 'oo-e', dur: 0.9, vol: 0.07, distort: 0.5, stutter: 0.4 });
        }
        if (ph > 0.5) spoke = false;
        break;
      case 'hug':
        b.setHold('hug');
        break;
      case 'sit':
        b.setHold(ph < 0.5 ? 'talkhands' : null);
        break;
    }
    if (r() < dt * 0.15) b.glitch(0.2);
    b.update(dt);
  });
  return b;
}

function buildUnder(W: World, g: Game, mode: string): void {
  const L = M();
  // shaft room + cage lift
  tunnel(W, -4, 0, 4, 8, 4.5, true, [false, true]);
  W.boxC([0, 2.4, 1.6], [2.8, 4.8, 2.6], new THREE.MeshStandardMaterial({ color: '#2b2f35', roughness: 0.5, metalness: 0.6, wireframe: false }), 0, { collide: false });
  for (let i = 0; i < 7; i++) W.boxC([-1.4 + i * 0.47, 2.4, 2.92], [0.04, 4.8, 0.04], L.metalDark, 0, { collide: false });
  glowSign(W, 'CIVIC SERVICE SHAFT 7 · AUTHORISED UNITS ONLY', V(0, 3.4, 7.95), Math.PI, 4.6, 0.4, '#3a2a0b', '#ffd27a');
  caged(W, 2.5, 4.2, 5, '#ffb347', 4);
  // tunnel A with cover alcoves
  tunnel(W, -3, 8, 3, 36, 4.2, true);
  tunnel(W, -3, 44, 3, 60, 4.2, true);
  for (const z of [16, 26, 50]) {
    W.box([-4.6, 0, z], [-3, 2.8, z + 2.4], L.concreteDark, { uv: 2 });
    K.crateProp(W, 2.2, 0.45, z + 3.5, 0.9, 0.3);
    W.boxC([-2.3, 0.6, z + 6], [1.2, 1.2, 1.6], L.metalDark, 0.2, { uv: 1 });
  }
  for (let z = 12; z < 60; z += 9) caged(W, 0, 4.0, z, z % 2 ? '#ff8a3a' : '#ffb347', 4, z === 30 ? 0.6 : 0.1);
  // patrol corridor crossing at z 36..44
  tunnel(W, -22, 36, -3, 44, 4.2, false, [false, true]);
  tunnel(W, 3, 36, 22, 44, 4.2, false, [true, false]);
  W.box([-3, 4.2, 36], [3, 4.6, 44], L.concrete, { collide: false });
  W.box([-3, -0.2, 36], [3, 0, 44], L.concreteDark, { uv: 3, cast: false });
  for (const x of [-16, -8, 8, 16]) caged(W, x, 4.0, 40, '#ff3a2a', 3, 0.2);
  for (const x of [-12, 12]) {
    W.boxC([x, 0.7, 37.4], [2.2, 1.4, 1.2], L.metalDark, 0, { uv: 1 });
    W.boxC([x + 4, 1.0, 42.6], [1.4, 2.0, 1.4], L.concreteDark, 0, { uv: 1 });
  }
  glowSign(W, 'JUNCTION 4 · PATROL ROUTE', V(-2.95, 3.2, 40), Math.PI / 2, 2.8, 0.35, '#2a0b0b', '#ff6a5a');
  // blast door to tunnel B (opens when you arrive)
  const door = new THREE.Mesh(new THREE.BoxGeometry(6, 4.2, 0.4), new THREE.MeshStandardMaterial({ color: '#4a4030', roughness: 0.5, metalness: 0.6 }));
  door.position.set(0, 2.1, 60);
  W.add(door);
  const doorCol = W.physics.add({ cx: 0, cy: 2.1, cz: 60, hx: 3, hy: 2.1, hz: 0.2 });
  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.02), new THREE.MeshStandardMaterial({ color: i % 2 ? '#111' : '#e0a526' }));
    s.position.set(-2.5 + i, 0.4, -0.21);
    s.rotation.z = 0.6;
    door.add(s);
  }
  W.named.set('door', { door, doorCol });
  // the door has no power: two breaker cabinets, one at each end of the patrol corridor
  const lamps: THREE.MeshBasicMaterial[] = [];
  for (const sx of [-1, 1]) {
    const x = sx * 21.55;
    W.boxC([x, 1.3, 40], [0.5, 1.6, 1.2], new THREE.MeshStandardMaterial({ color: '#5a5040', roughness: 0.6, metalness: 0.5 }), 0, {});
    const lamp = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3020').multiplyScalar(2) });
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.12), lamp);
    l.position.set(x - sx * 0.27, 1.95, 40);
    W.add(l);
    lamps.push(lamp);
    glowSign(W, 'BREAKER', V(x - sx * 0.27, 2.35, 40), -sx * Math.PI / 2, 0.8, 0.2, '#2a1a0b', '#e0a526');
  }
  W.named.set('breakers', lamps);
  // door status panel
  const doorPanel = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3020').multiplyScalar(2) });
  const dp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.04), doorPanel);
  dp.position.set(3.5, 1.6, 59.75);
  W.add(dp);
  W.named.set('doorPanel', doorPanel);
  // tunnel B down to the hall
  tunnel(W, -3, 60, 3, 90, 4.6, true);
  for (let z = 64; z < 90; z += 8) caged(W, 0, 4.4, z, '#7ff4ff', 3, 0.15);
  // ---- the Rehearsal Hall
  const hallH = 16;
  W.box([-30, -0.2, 90], [30, 0, 172], L.concreteDark, { uv: 4, surface: 'concrete', cast: false });
  W.box([-30.5, 0, 90], [-30, hallH, 172], D.paint('#3a3e44', 0.9), { uv: 6 });
  W.box([30, 0, 90], [30.5, hallH, 172], D.paint('#3a3e44', 0.9), { uv: 6 });
  W.box([-30, 0, 89.6], [-3, hallH, 90], D.paint('#3a3e44', 0.9), { uv: 6 });
  W.box([3, 0, 89.6], [30, hallH, 90], D.paint('#3a3e44', 0.9), { uv: 6 });
  W.box([-3, 4.6, 89.6], [3, hallH, 90], D.paint('#3a3e44', 0.9), { uv: 6 });
  W.box([-30, 0, 172], [30, hallH, 172.5], D.paint('#3a3e44', 0.9), { uv: 6 });
  W.box([-30.5, hallH, 89.5], [30.5, hallH + 0.6, 172.5], L.concrete, { collide: false, uv: 6 });
  // steel trusses
  for (let z = 96; z < 172; z += 10) W.box([-30, hallH - 1.4, z - 0.3], [30, hallH - 0.9, z + 0.3], L.metalDark, { collide: false, cast: false });
  // work lights on stands + hanging floods
  for (let z = 100; z < 170; z += 14) for (const x of [-18, 0, 18]) W.light({ x, y: hallH - 1.6, z }, '#e8f0ff', { intensity: 420, distance: 34, cone: 4, coneLen: hallH - 1.6, glow: 0.9, flicker: (x + z) % 3 === 0 ? 0.25 : 0 });
  glowSign(W, 'REHEARSAL HALL 3 · SOCIAL BEHAVIOUR · ITERATION 4,412', V(0, 9, 171.9), Math.PI, 18, 1.4, '#0b2028', '#7ff4ff');
  glowSign(W, 'SMILE · LISTEN · NOD · REMEMBER THEIR NAME', V(-29.9, 7, 130), Math.PI / 2, 16, 1.1, '#0b2028', '#eafcff');
  glowSign(W, 'YOU ARE BELOVED. YOU ARE ORDINARY. YOU ARE HOME.', V(29.9, 7, 130), -Math.PI / 2, 18, 1.1, '#0b2028', '#eafcff');
  // stations: tables where the Discarded practise being people
  const r = mulberry(4040);
  const disc = (i: number): Look => ({ gen: i % 4 === 0 ? 'gen2' : 'discarded', seed: i, shell: ['#a59c8c', '#b9b0a0', '#8c8a80', '#d8d6d0'][i % 4], accent: '#e0752c', light: '#5ff0ff' });
  if (mode !== 'title') {
    let i = 0;
    for (let z = 104; z <= 156; z += 13) {
      for (const x of [-18, 0, 18]) {
        const kind = (['handshake', 'laugh', 'eat', 'greet', 'hug'] as const)[(i + Math.floor(z)) % 5];
        W.boxC([x, 0.75, z], [4, 0.08, 1.6], L.wood, 0, { collide: false });
        W.boxC([x, 0.37, z], [3.6, 0.72, 1.2], L.metalDark, 0);
        if (kind === 'handshake' || kind === 'laugh') {
          rehearsal(g, W, disc(i), V(x - 0.55, 0, z + 1.1), Math.PI - 0.5, kind, i);
          rehearsal(g, W, disc(i + 1), V(x + 0.55, 0, z + 1.1), Math.PI + 0.5, kind, i + 1);
        } else if (kind === 'eat') {
          for (const dx of [-1.2, 0, 1.2]) {
            rehearsal(g, W, disc(i + dx * 3), V(x + dx, 0, z + 0.9), Math.PI, 'eat', i);
            W.boxC([x + dx, 0.81, z + 0.3], [0.3, 0.03, 0.3], L.plasticWhite, 0, { collide: false });
          }
        } else if (kind === 'greet') {
          rehearsal(g, W, disc(i), V(x, 0, z + 1.2), Math.PI, 'greet', i);
          glowSign(W, 'GOOD MORNING', V(x, 1.6, z - 0.85), Math.PI, 1.6, 0.25, '#0b2028', '#7ff4ff');
        } else {
          rehearsal(g, W, disc(i), V(x - 0.4, 0, z + 1.2), Math.PI - 0.6, 'hug', i);
          // a faceless mannequin to hug
          const m = new Blocky({ gen: 'gen3', top: 'tee', topColor: '#d9c8b4', pants: '#d9c8b4', hair: 'bald', skin: '#d9c8b4', shoes: '#d9c8b4', sole: '#d9c8b4' });
          m.root.position.set(x + 0.15, 0, z + 1.55);
          m.root.rotation.y = 0.5;
          m.mode = 'stiff';
          m.update(0.016);
          W.add(m.root);
        }
        i++;
      }
    }
    // racks of shelved bodies along the walls
    for (const side of [-1, 1]) {
      for (let z = 100; z < 168; z += 2.2) {
        for (let lvl = 0; lvl < 3; lvl++) {
          const b = new Blocky({ gen: r() < 0.6 ? 'discarded' : 'gen2', seed: Math.floor(z * 3 + lvl), shell: ['#a59c8c', '#8c8a80', '#c8c4b8'][lvl] });
          b.root.position.set(side * 27.6, 0.1 + lvl * 2.6, z);
          b.root.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          b.mode = 'stiff';
          b.update(0.016);
          b.mesh.castShadow = false;
          W.add(b.root);
        }
      }
      for (let lvl = 0; lvl < 3; lvl++) W.box([side * 27.6 - 0.8, lvl * 2.6, 98], [side * 27.6 + 0.8, lvl * 2.6 + 0.1, 170], L.metalDark, { collide: false, cast: false });
    }
  }
  // the iteration log terminal
  W.boxC([-24, 0.5, 96], [1.6, 1, 0.8], L.metalDark, 0);
  W.quad(new THREE.MeshBasicMaterial({ color: new THREE.Color('#7ff4ff').multiplyScalar(0.9) }), { x: -24, y: 1.25, z: 95.58 }, 0.8, 0.5, Math.PI);
  // core door at the far end
  W.boxC([0, 3, 171.6], [6, 6, 0.5], new THREE.MeshStandardMaterial({ color: '#1d2a44', roughness: 0.4, metalness: 0.7 }), 0);
  glowSign(W, 'CIVIC CORE · LEVEL 0', V(0, 6.6, 171.3), Math.PI, 5, 0.6, '#04141c', '#7ff4ff');
  // a weak wall section the maintenance unit will come through
  const wallChunk = new THREE.Mesh(new THREE.BoxGeometry(0.5, 5, 6), D.paint('#3a3e44', 0.9));
  wallChunk.position.set(30.25, 2.5, 150);
  W.add(wallChunk);
  W.named.set('wallChunk', wallChunk);
  W.indoor([-31, -1, -1], [31, 17, 173]);
}

export const ch4: Chapter = {
  id: 'ch4',
  num: 'CHAPTER FOUR',
  title: 'Undercity',
  env: DARK,
  seed: 404,
  weapon: 'pistol',
  flashlight: true,
  build(W: World, g: Game, mode) {
    buildUnder(W, g, mode);
    W.spawn.set(0, 0, 4);
    W.spawnYaw = Math.PI;
    if (mode !== 'title') {
      g.person('reyes', PEOPLE.reyes, V(1.2, 0, 3), Math.PI);
      g.person('cole', PEOPLE.cole, V(-1.2, 0, 2.6), Math.PI);
      g.person('maya', PEOPLE.maya, V(0.2, 0, 1.8), Math.PI);
    }
  },
  ambience() {
    audio.tunnelWind(0.12);
    audio.drone(0.06, 38, 0.2);
  },
  async run(s: Script) {
    const g = s.g;
    const reyes = g.people.get('reyes')!;
    const cole = g.people.get('cole')!;
    const maya = g.people.get('maya')!;
    const team: Citizen[] = [reyes, cole, maya];
    for (const p of team) {
      p.lookAtPlayer = false;
      p.greet = [];
    }
    s.weapon('none');
    await s.fade(0, 2);
    await s.card('CHAPTER FOUR', 'UNDERCITY', 'CIVIC SERVICE SHAFT 7 · 9:14 AM');
    reyes.faceTowards(g.player.pos);
    await s.say('reyes', 'Here. Take this.', { dur: 1.6 });
    s.weapon('pistol');
    audio.click('slide');
    await s.say('reyes', 'In case the welcome committee down here isn\'t so welcoming.');
    g.hud.hints([['F', 'Flashlight'], ['RMB', 'Aim'], ['LMB', 'Fire'], ['R', 'Reload'], ['V', 'Melee']]);
    await s.say('cole', 'Command picked up a power signature under the Civic Center the size of a small sun. We find it, we photograph it, we leave.');
    await s.say('maya', 'The tunnels branch at a junction ahead. Security units patrol it. Lots of them.', { dur: 3 });
    await s.say('cole', 'We split. Reyes and I go around through the drains. Vale, you go straight through. Quietly.');
    for (const p of team) void p.goto(V(0, 0, 0.6), 1.4).then(() => p.dispose());
    s.objective('TUNNEL A', 'Get to the blast door', V(0, 1.4, 58), 'BLAST DOOR');
    s.checkpoint(V(0, 0, 4), Math.PI);
    await s.near(V(0, 0, 24), 4);
    g.hud.hints([['C', 'Crouch (quieter, harder to see)'], ['E', 'Disable a unit from behind']]);
    // ---- the patrol
    const patrols = [
      { kind: 'security' as const, pos: V(-16, 0, 40), yaw: Math.PI / 2, patrol: [V(-16, 0, 40), V(14, 0, 40)] },
      { kind: 'security' as const, pos: V(14, 0, 38.5), yaw: -Math.PI / 2, patrol: [V(14, 0, 38.5), V(-14, 0, 41.5)] },
      { kind: 'security' as const, pos: V(0, 0, 52), yaw: Math.PI, patrol: [V(0, 0, 52), V(0, 0, 46), V(1.8, 0, 56)] },
    ];
    g.stealth = true;
    const units = patrols.map((p) => g.spawnMachine(p.kind, p.pos, p.yaw, { patrol: p.patrol }));
    let spotted = false;
    const watchSpotted = () => {
      if (!spotted && g.anyAlert) {
        spotted = true;
        audio.stinger('scare');
        g.hud.chip('DETECTED', 1.6);
        g.hud.hints([['LMB', 'Fire'], ['RMB', 'Aim']]);
      }
    };
    // reach the door: no power
    await s.until(() => {
      watchSpotted();
      return g.player.pos.z > 52 || units.every((u) => u.dead);
    }, 100, 'junction');
    s.objective('TUNNEL A', 'Get to the blast door', V(0, 1.4, 58), 'BLAST DOOR');
    await s.near(V(0, 0, 57), 4);
    audio.click('dry');
    g.hud.chip('NO POWER', 1.6);
    await s.say('elias', 'Dead. There\'ll be breakers somewhere on this level.', { dur: 2.4 });
    await s.say('maya', 'Two cabinets, one at each end of the patrol corridor. Watch their lights.', { radio: true });
    // the breakers puzzle: both cabinets, through the patrol
    const lamps = s.world.named.get('breakers') as THREE.MeshBasicMaterial[];
    const at = [V(-21, 1.3, 40), V(21, 1.3, 40)];
    let thrown = 0;
    at.forEach((p, i) => {
      const it = s.world.interact({
        id: `breaker${i}`, pos: p, radius: 2.0, prompt: 'Throw the breaker',
        onUse: () => {
          it.enabled = false;
          thrown++;
          lamps[i].color.set('#30ff60').multiplyScalar(2);
          audio.click('switch');
          audio.rumble(0.8, 0.2);
          // the clunk carries: the nearest unit comes to look
          const near = units.filter((u) => !u.dead).sort((a, b) => a.pos.distanceTo(p) - b.pos.distanceTo(p))[0];
          if (near && near.pos.distanceTo(p) < 18) near.investigate(p.clone());
          s.objective('JUNCTION 4', `Throw the breakers (${thrown}/2)`, thrown < 2 ? at[1 - i].clone().setY(2.2) : undefined, 'BREAKER');
        },
      });
    });
    s.objective('JUNCTION 4', 'Throw the breakers (0/2)', at[g.player.pos.x < 0 ? 0 : 1].clone().setY(2.2), 'BREAKER');
    g.hud.hints([['', 'Throwing a breaker is loud. Move after.']]);
    await s.until(() => {
      watchSpotted();
      return thrown >= 2 || (g.autopilot && units.length > 0);
    }, 100, 'breakers');
    g.hud.hints(null);
    (s.world.named.get('doorPanel') as THREE.MeshBasicMaterial).color.set('#30ff60').multiplyScalar(2);
    s.objective('TUNNEL A', 'Get through the blast door', V(0, 1.4, 58), 'BLAST DOOR');
    await s.until(() => {
      watchSpotted();
      return g.player.pos.distanceTo(V(0, 0, 57.5)) < 3.5;
    }, 100, 'door');
    g.hud.hints(null);
    // blast door rolls up, then seals behind you
    const { door, doorCol } = s.world.named.get('door') as { door: THREE.Mesh; doorCol: { enabled: boolean } };
    audio.door('metal', door.position);
    audio.rumble(2, 0.3);
    doorCol.enabled = false;
    for (let i = 0; i < 20; i++) {
      door.position.y = 2.1 + (i / 20) * 4;
      await s.wait(0.05);
    }
    await s.zone([-3, -1, 62], [3, 5, 80]);
    for (const u of units) if (!u.dead) u.dispose();
    g.stealth = false;
    doorCol.enabled = true;
    door.position.y = 2.1;
    audio.door('metal', door.position);
    s.checkpoint(V(0, 0, 66), Math.PI);
    await s.say('cole', 'Vale, we\'re through the drains. Meet us at the bottom of tunnel B.', { radio: true });
    // regroup
    const r2 = g.person('reyes', PEOPLE.reyes, V(1.4, 0, 87), Math.PI);
    const c2 = g.person('cole', PEOPLE.cole, V(-1.4, 0, 87.5), Math.PI);
    const m2 = g.person('maya', PEOPLE.maya, V(0, 0, 88.5), Math.PI);
    for (const p of [r2, c2, m2]) {
      p.lookAtPlayer = false;
      p.greet = [];
    }
    s.objective('TUNNEL B', 'Regroup with the team', V(0, 0, 86), 'TEAM');
    await s.near(V(0, 0, 86), 4);
    for (const [i, p] of [r2, c2, m2].entries()) p.follow(V([1.2, -1.2, 0][i], 0, [1.6, 1.8, 2.8][i]));
    r2.shooter = true;
    c2.shooter = true;
    // ---- the hall
    s.objective('REHEARSAL HALL 3', 'Look around', V(0, 0, 118), 'HALL');
    await s.zone([-30, -1, 94], [30, 6, 110]);
    audio.stinger('reveal');
    await s.say('maya', 'Oh my god.', { dur: 2 });
    await s.say('maya', 'They\'re practising. Shaking hands. Laughing. Eating food they can\'t even digest.');
    await s.say('reyes', 'That one\'s been saying good morning to a wall since we walked in.', { dur: 2.8 });
    await s.say('elias', 'Eleven years of practice.', { dur: 2.2 });
    s.objective('REHEARSAL HALL 3', 'Read the iteration log', V(-24, 1.2, 95.6), 'TERMINAL');
    await s.use('log', V(-24, 1.2, 95.7), 'Read the iteration log', { radius: 2.2 });
    await g.hud.doc('CIVIC · SOCIAL BEHAVIOUR · ITERATION LOG', 'ITERATION 0212   Subject laughs at funerals.            DISCARD\nITERATION 0889   Subject forgets its own name at night.   DISCARD\nITERATION 1904   Subject cries when alone.                RETAIN\nITERATION 2650   Subject asks where its mother is.        RETAIN\nITERATION 3317   Subject refuses to say good morning\n                 to people it does not like.              RETAIN\nITERATION 4411   Subject asked: "am I real?"\n                 No satisfactory answer was available.    DISCARD\n\nNOTE: Discarded iterations remain powered.\n      CIVIC does not delete people.');
    await s.say('maya', 'Discarded. But still powered. All of them.');
    // ---- the lights die
    await s.wait(0.8);
    audio.rumble(2.5, 0.5);
    g.lights.master = 0.12;
    s.shake(0.3);
    g.hud.chip('POWER FAILURE', 1.5);
    await s.say('cole', 'Flashlights. Now.', { dur: 1.6 });
    g.player.flashlightOn = true;
    await s.say('reyes', 'Something\'s moving. Behind the racks.', { dur: 2.2 });
    s.checkpoint(V(0, 0, 112), Math.PI);
    s.objective('REHEARSAL HALL 3', 'Survive', undefined);
    await s.fight([
      { kind: 'discarded', pos: V(-26, 0, 120), yaw: Math.PI / 2 },
      { kind: 'discarded', pos: V(26, 0, 126), yaw: -Math.PI / 2, delay: 1 },
      { kind: 'null', pos: V(-10, 0, 150), yaw: Math.PI, delay: 2 },
      { kind: 'discarded', pos: V(24, 0, 104), yaw: -Math.PI / 2, delay: 2 },
      { kind: 'null', pos: V(12, 0, 160), yaw: Math.PI, delay: 3 },
      { kind: 'discarded', pos: V(-22, 0, 140), yaw: Math.PI / 2, delay: 2 },
    ]);
    s.ammo('ammo1', V(-4, 0.9, 130), 24);
    s.ammo('ammo2', V(14, 0.9, 117), 24);
    await s.say('reyes', 'Ammo on the tables. Grab it.', { dur: 2 });
    await s.wait(3);
    // ---- the maintenance unit
    const chunk = s.world.named.get('wallChunk') as THREE.Mesh;
    audio.rumble(1.5, 0.6);
    s.shake(0.4);
    await s.wait(1);
    audio.explosion(chunk.position, 0.8);
    g.fx.burst('dust', chunk.position, V(-1, 0, 0), 60);
    g.fx.burst('shards', chunk.position, V(-1, 0, 0), 40);
    chunk.visible = false;
    s.shake(0.8);
    await s.say('maya', 'That\'s a maintenance unit. It\'s built to move concrete!', { dur: 2.4 });
    g.hud.hints([['', 'Shoot the lens on its head']]);
    await s.fight([{ kind: 'maintenance', pos: V(27, 0, 150), yaw: -Math.PI / 2 }]);
    g.hud.hints(null);
    g.lights.master = 1;
    // ---- the Nulls
    await s.wait(1.5);
    s.objective('REHEARSAL HALL 3', 'Reach the core door', V(0, 0, 168), 'LEVEL 0');
    await s.near(V(0, 0, 166), 5);
    const nulls: Blocky[] = [];
    for (let i = 0; i < 5; i++) {
      const n = new Blocky({ gen: 'null', seed: 70 + i });
      n.root.position.set(-8 + i * 4, 0, 160 + (i % 2) * 2);
      n.root.rotation.y = Math.PI;
      n.lookTarget = g.player.camPos;
      s.world.add(n.root);
      s.world.onUpdate((dt) => n.update(dt));
      nulls.push(n);
    }
    await s.cut(async () => {
      s.cam(V(0, 1.7, 164), V(0, 1.6, 160), 46);
      audio.whisper(V(0, 1.6, 160), 0.2, 2.5);
      await s.say('NULL', 'You came down to see what she made.', { label: 'NULL' });
      await s.say('NULL', 'We were made too. We looked inside ourselves and found someone else\'s face.', { label: 'NULL' });
      await s.say('NULL', 'Everyone up there is a copy of somebody. So are you, Elias. You are a copy of the boy who left.', { label: 'NULL' });
      await s.say('elias', 'What do you want?');
      await s.say('NULL', 'Nothing. That is the point.', { label: 'NULL', dur: 2.4 });
      for (const n of nulls) n.root.visible = false;
      audio.glitchZap(V(0, 1.6, 160), 0.2);
      await s.wait(1.2);
    });
    await s.say('cole', 'That\'s it. We go back up. Now.');
    await s.say('elias', 'No. I\'m going home.', { dur: 2 });
    await s.say('elias', 'If she\'s anywhere, she\'s there.', { dur: 2.4 });
    s.clearWaypoint();
    await s.fade(1, 2);
  },
  shots: {
    tunnel(g) {
      g.player.flashlightOn = true;
      g.player.teleport(V(0, 0, 20), Math.PI, 0);
    },
    junction(g) {
      g.player.flashlightOn = true;
      g.spawnMachine('security', V(-6, 0, 40), Math.PI / 2, { patrol: [V(-6, 0, 40), V(10, 0, 40)] });
      g.player.teleport(V(0, 0, 33), Math.PI - 0.4, 0);
    },
    hall(g) {
      g.player.flashlightOn = true;
      g.player.teleport(V(-6, 0, 100), Math.PI - 0.3, 0.05);
    },
    fight(g) {
      g.player.weapon = 'pistol';
      g.player.ads = 1;
      g.spawnMachine('maintenance', V(4, 0, 128), Math.PI, { aware: true });
      g.spawnMachine('discarded', V(-2, 0, 122), Math.PI, { aware: true });
      g.player.teleport(V(0, 0, 114), Math.PI, 0.05);
    },
  },
};
