import * as THREE from 'three';
import type { Chapter } from './index';
import { V } from './common';
import { island } from './ch8';
import { subwayCar } from './ch3';
import * as K from '../world/Kit';
import { M, signMaterial } from '../render/Materials';
import { SKY } from '../render/Sky';
import { audio } from '../audio/AudioEngine';
import type { World } from '../world/World';
import type { Game, Script } from '../game/Game';
import { Actor } from '../actors/Characters';
import { G } from '../render/Globals';

const folding: { obj: THREE.Object3D; axis: THREE.Vector3; speed: number; base: THREE.Euler }[] = [];

function buildWayBack(W: World, g: Game): void {
  const L = M();
  folding.length = 0;
  // 1. start
  island(W, -6, -6, 6, 10, 0, L.asphalt, 8);
  // 2. the Quik-Stop, adrift (z 14..26)
  island(W, -6, 13, 6, 27, 0, L.storeFloor, 8);
  K.room(W, -5, 14, 5, 26, 3.6, L.plasterWhite, L.storeFloor, L.concreteDark, [{ wall: 'n', c: 0, w: 2, h: 2.6 }, { wall: 's', c: 0, w: 2, h: 2.6 }], { floorSurface: 'tile' });
  K.shelf(W, -2, 19, 0, 3);
  K.shelf(W, 2, 22, 0, 3);
  K.fridge(W, 4.4, 20, -Math.PI / 2, 3);
  K.counter(W, -4, 24, Math.PI / 2, 2.4);
  K.ceilingLight(W, 0, 3.58, 18, { intensity: 8, distance: 8, flicker: 0.5, long: true });
  K.ceilingLight(W, 0, 3.58, 23, { intensity: 8, distance: 8, long: true });
  W.quad(signMaterial('QUIK-STOP 24', { bg: '#c81f1f', fg: '#ffffff', w: 512, h: 112, intensity: 2.6 }), { x: 0, y: 3.2, z: 13.88 }, 4, 0.9, Math.PI);
  // 3. Orchard Street with a section bent upward (z 30..62)
  island(W, -8, 30, 8, 62, 0, L.asphalt, 10);
  W.box([-8, 0, 30], [-6, 0.15, 62], L.sidewalk, { uv: 2 });
  W.box([6, 0, 30], [8, 0.15, 62], L.sidewalk, { uv: 2 });
  K.streetLight(W, -7, 36, Math.PI / 2, { color: '#ffb468' });
  K.streetLight(W, 7, 50, -Math.PI / 2, { color: '#ffb468' });
  K.car(W, -2.5, 44, 0.2, K.CAR_COLORS[3]);
  // the road curling up into a wall beside the path (visual)
  const curl = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI;
    const seg = new THREE.Mesh(new THREE.BoxGeometry(14, 0.35, 2.2), L.asphalt);
    seg.position.set(20 + Math.sin(a) * -10 + 10, 10 - Math.cos(a) * 10, 46);
    seg.rotation.z = -a;
    curl.add(seg);
    if (i % 4 === 2) {
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6, 6), L.metalDark);
      lamp.position.copy(seg.position).add(new THREE.Vector3(Math.sin(a) * 3, -Math.cos(a) * 3, 0));
      lamp.rotation.z = -a;
      curl.add(lamp);
    }
  }
  W.add(curl);
  folding.push({ obj: curl, axis: new THREE.Vector3(0, 0, 1), speed: 0.03, base: curl.rotation.clone() });
  // 4. gap — a bridge that only exists in the Echo — then the subway car (z 64..100)
  W.box([-1.6, -0.3, 62], [1.6, 0, 70], L.concrete, { layer: 'echo', uv: 2 });
  const car = subwayCar(true);
  car.group.position.set(0, -0.7, 78);
  car.group.rotation.set(0, 0, 0.05);
  W.add(car.group);
  W.box([-1.4, -0.3, 70], [1.4, 0, 86], L.metal, { surface: 'metal' });
  W.box([-1.55, 0, 70], [-1.45, 3, 86], L.glassDark, { noVault: true });
  W.box([1.45, 0, 70], [1.55, 3, 86], L.glassDark, { noVault: true });
  W.box([-1.6, -0.3, 86], [1.6, 0, 94], L.concrete, { layer: 'echo', uv: 2 });
  // 5. hospital corridor folding + a room inside a room (z 94..130)
  island(W, -10, 94, 10, 130, 0, L.hospFloor, 10);
  for (let z = 96; z < 128; z += 4) {
    for (const sx of [-1, 1]) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3.2, 3.6), L.plasterGreen);
      wall.position.set(sx * 3, 1.6, z + 2);
      W.add(wall);
      folding.push({ obj: wall, axis: new THREE.Vector3(0, 0, sx), speed: 0.25 + (z % 8) * 0.03, base: wall.rotation.clone() });
    }
    K.ceilingLight(W, 0, 3.4, z + 2, { intensity: 5, distance: 7, flicker: 0.4 });
  }
  // the little bedroom sitting inside the corridor
  K.room(W, -8.5, 104, -4.5, 110, 2.6, L.wallpaperKid, L.woodFloor, null, [{ wall: 'e', c: 107, w: 1.2, h: 2.1 }], { floorSurface: 'wood' });
  K.bed(W, -7.2, 107.4, 0, true, '#d070a0');
  // 6. other versions of themselves
  // 7. final approach to the core (z 132..160)
  island(W, -12, 132, 12, 166, 0, L.concreteDark, 14);
  W.light({ x: 0, y: 6, z: 160 }, '#c0a0ff', { intensity: 30, distance: 30, glow: 1.4, pool: false });
  // falling-up rain dressing: big drifting fragments
  for (let i = 0; i < 20; i++) {
    const a = i * 0.9;
    const r = 40 + (i % 5) * 18;
    const fr = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 8), i % 2 ? L.asphalt : L.sidewalk);
    fr.add(slab);
    const b = new THREE.Mesh(new THREE.BoxGeometry(5, 8 + (i % 3) * 6, 5), L.concrete);
    b.position.y = 4 + (i % 3) * 3;
    fr.add(b);
    fr.position.set(Math.cos(a) * r, -10 + (i % 7) * 7, 80 + Math.sin(a) * r);
    W.add(fr);
    folding.push({ obj: fr, axis: new THREE.Vector3(Math.sin(i), 1, Math.cos(i)).normalize(), speed: 0.05 + (i % 4) * 0.03, base: fr.rotation.clone() });
  }
  W.physics.killY = -18;
  W.physics.floorY = -1000;
  void g;
}

export const ch11: Chapter = {
  id: 'ch11', num: 'CHAPTER ELEVEN', title: 'The Way Back', sub: 'Everything at once',
  env: {
    sky: SKY.other, fog: '#140a26', fogDensity: 0.011, rain: 0.9, envKind: 'other', exposure: 1.15,
    hemi: ['#a080ff', '#140a24', 0.42], moon: { color: '#e0c8ff', intensity: 0.5, dir: [0.2, 1, 0.4] }, reverb: [5, 0.5], motes: 0.8, bloom: 0.8,
    floorY: -1000, grade: { sat: 1.0, tint: '#f2e8ff', vignette: 1.05 },
  },
  chars: ['elias', 'maya', 'ellie', 'remnant'],
  echoUnlocked: true,
  gun: true,
  seed: 11,
  build(W, g) {
    buildWayBack(W, g);
    W.spawn.set(0, 0, 0);
    W.spawnYaw = 0;
    // alternate selves, watching
    const me = new Actor('elias', 'frozen');
    me.root.position.set(5.5, 0, 112);
    me.root.rotation.y = -Math.PI / 2;
    me.setPose('look_around', 0);
    me.update(0.5);
    me.timeScale = 0;
    const her = new Actor('maya', 'frozen');
    her.root.position.set(6.5, 0, 114);
    her.root.rotation.y = -Math.PI / 2;
    her.update(0.2);
    her.timeScale = 0;
    W.add(me.root);
    W.add(her.root);
    W.onUpdate((_dt, t) => {
      for (const f of folding) {
        const a = Math.sin(t * f.speed * 3) * 0.6;
        f.obj.rotation.set(f.base.x + f.axis.x * a, f.base.y + f.axis.y * a, f.base.z + f.axis.z * a);
      }
      G.uWarp.value = 0.25 + Math.sin(t * 0.5) * 0.08;
    });
  },
  ambience(g) {
    G.uRainDir.value = -1;
    audio.drone(0.1, 27.5, 1.4);
    audio.wind(0.2);
    audio.setRain(0.5, false);
    g.echo.instability = 0.5;
  },
  shots: {
    store(g) {
      G.uRainDir.value = -1;
      g.player.teleport(V(0, 0, 8), 0);
      g.player.camPitch = 0.1;
      g.player.snapCamera();
    },
    corridor(g) {
      g.player.teleport(V(0, 0, 100), 0);
      g.player.snapCamera();
    },
  },
  async run(s) {
    const g = s.g;
    g.hud.setFade(1);
    G.uRainDir.value = -1;
    const maya = g.npc('maya', V(-1.5, 0, -2), 0);
    const ellie = g.npc('ellie', V(1.5, 0, -2.5), 0);
    s.control(false);
    void s.fade(0, 2);
    await s.card('CHAPTER ELEVEN', 'THE WAY BACK', 'EVERYTHING AT ONCE');
    s.control(true);
    maya.follow(V(-1.4, 0, -1.6));
    ellie.follow(V(1.2, 0, -1.4));
    await s.say('ELLIE', 'The rain\'s going the wrong way.', { dur: 2.2 });
    await s.say('MAYA', 'Everything is. Stay close to your brother.', { dur: 2.6 });
    s.objective('THE WAY BACK', 'Reach Orpheus');
    await s.zone([-5, -1, 14], [5, 4, 26]);
    await s.thought('The coffee is still warm.', 2.4);
    await s.zone([-8, -1, 30], [8, 4, 40]);
    s.checkpoint(V(0, 0, 32), 0);
    await s.say('MAYA', 'The street is folding. Like paper.', { dur: 2.4 });
    await s.zone([-8, -1, 56], [8, 4, 62]);
    g.hud.hints([['Q', 'Enter Echo']]);
    s.checkpoint(V(0, 0, 58), 0);
    // remnants hunting behind
    const chase = s.fight([
      { kind: 'rusher', pos: V(-4, 0, 34), yaw: 0, delay: 2 },
      { kind: 'rusher', pos: V(4, 0, 36), yaw: 0, delay: 3 },
      { kind: 'crawler', pos: V(0, 0, 32), yaw: 0, delay: 4 },
    ], { music: true }).catch(() => {});
    await s.zone([-2, -1, 88], [2, 4, 96]);
    g.hud.hints(null);
    s.checkpoint(V(0, 0, 96), 0);
    void chase;
    await s.zone([-3, -1, 108], [3, 4, 116]);
    await s.say('MAYA', 'Elias. That\'s... us.', { dur: 2.2 });
    await s.thought('A version of me that never went home. A version of her who never came.', 3.6);
    await s.zone([-12, -1, 132], [12, 4, 140]);
    s.checkpoint(V(0, 0, 136), 0);
    for (const e of g.enemies) {
      e.actor.dispose();
      e.removed = true;
    }
    g.enemies = [];
    g.encounterEpoch++;
    await s.say('ELLIE', 'Eli, it\'s really big.', { dur: 2.2 });
    await s.fade(1, 1.5, true);
    G.uRainDir.value = 1;
    g.echo.instability = 0;
  },
};

export type { Script };
