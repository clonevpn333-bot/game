import * as THREE from 'three';
import type { Chapter } from './index';
import type { World } from '../world/World';
import type { Game, Script } from '../game/Game';
import { StaticBatcher } from '../render/Batcher';
import { Shepherd } from '../actors/Shepherd';
import { M, facadeMaterial, glowMaterial } from '../render/Materials';
import { SKY } from '../render/Sky';
import { audio } from '../audio/AudioEngine';
import { PEOPLE } from '../actors/Cast';
import { V, helicopter } from './common';
import { mulberry } from '../actors/Blocky';

const FLY = 22; // m/s over the city
const ALT = 150;

interface Pano {
  group: THREE.Group;
  update: (dt: number, t: number) => void;
}

/** The living city seen from the helicopter: instanced and batched so thousands of lights cost little. */
function panorama(W: World): Pano {
  const group = new THREE.Group();
  const B = new StaticBatcher();
  const rnd = mulberry(4417);
  const L = M();
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const SIZE = 1500;
  const BLOCK = 64;
  const ROAD = 14;
  const add = (min: [number, number, number], max: [number, number, number], mat: THREE.Material, uv = 22) => {
    const s = new THREE.Vector3(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
    const c = new THREE.Vector3((min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2);
    B.add(unit, mat, new THREE.Matrix4().compose(c, new THREE.Quaternion(), s), { uv: 'world', uvScale: uv, cast: false });
  };
  // ground + roads
  add([-SIZE, -1, -SIZE], [SIZE, 0, SIZE], L.asphalt, 30);
  const facades = [0, 1, 2, 3, 4, 5].flatMap((i) => [facadeMaterial('office', i, 2.6), facadeMaterial('apartment', i, 2.8), facadeMaterial('brick', i, 2.4)]);
  const stadium = new THREE.Vector3(30, 0, 520);
  for (let gx = -SIZE + BLOCK; gx < SIZE - BLOCK; gx += BLOCK) {
    for (let gz = -SIZE + BLOCK; gz < SIZE - BLOCK; gz += BLOCK) {
      const cx = gx + BLOCK / 2;
      const cz = gz + BLOCK / 2;
      if (Math.hypot(cx - stadium.x, cz - stadium.z) < 130) continue;
      const centre = Math.exp(-((cx * cx) / (380 * 380) + ((cz - 300) * (cz - 300)) / (700 * 700)));
      const inner = BLOCK - ROAD;
      const n = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const w = inner / n - 2;
        const x0 = cx - inner / 2 + i * (inner / n) + 1;
        const d = inner * (0.5 + rnd() * 0.45);
        const z0 = cz - inner / 2 + rnd() * (inner - d);
        // tall in the centre, but always well below the helicopter (and lower still under its path)
        const under = Math.abs(cx) < 90 ? 0.55 : 1;
        const h = Math.min(ALT - 45, 12 + Math.pow(rnd(), 1.6) * (30 + centre * 150)) * under;
        add([x0, 0, z0], [x0 + w, h, z0 + d], facades[Math.floor(rnd() * facades.length)]);
        if (rnd() < 0.5) add([x0 + w * 0.3, h, z0 + d * 0.3], [x0 + w * 0.6, h + 3, z0 + d * 0.6], L.metalDark);
      }
    }
  }
  B.build(group);
  // streetlights: one instanced cloud of warm points along every road
  const lamps: THREE.Vector3[] = [];
  for (let g = -SIZE + BLOCK; g < SIZE - BLOCK; g += BLOCK)
    for (let s = -SIZE; s < SIZE; s += 22) {
      lamps.push(V(g - ROAD / 2 + 1, 7, s), V(s, 7, g - ROAD / 2 + 1));
    }
  const lampMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.4, 0.5, 1.4), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb066').multiplyScalar(3.2), toneMapped: false }), lamps.length);
  const m4 = new THREE.Matrix4();
  lamps.forEach((p, i) => lampMesh.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z)));
  group.add(lampMesh);
  // traffic: head and tail light bars flowing along the grid
  const N = 900;
  const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.6, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff2d8').multiplyScalar(3.4), toneMapped: false }), N);
  const tails = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.6, 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2a1a').multiplyScalar(3), toneMapped: false }), N);
  const cars = Array.from({ length: N }, () => {
    const alongX = rnd() < 0.5;
    const road = -SIZE + BLOCK * (1 + Math.floor(rnd() * ((SIZE * 2) / BLOCK - 2))) - ROAD / 2;
    const dir = rnd() < 0.5 ? 1 : -1;
    return { alongX, road: road + dir * 3, s: (rnd() * 2 - 1) * SIZE, v: (10 + rnd() * 12) * dir };
  });
  group.add(heads, tails);
  // stadium: bowl, pitch, floodlights, crowd
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(105, 88, 26, 48, 1, true), new THREE.MeshStandardMaterial({ color: '#3b4048', roughness: 0.8, side: THREE.DoubleSide }));
  bowl.position.set(stadium.x, 13, stadium.z);
  group.add(bowl);
  const pitchTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const x = c.getContext('2d')!;
    for (let i = 0; i < 16; i++) {
      x.fillStyle = i % 2 ? '#2f8a3a' : '#38a046';
      x.fillRect(0, i * 16, 256, 16);
    }
    x.strokeStyle = '#f4f1e6';
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(128, 210);
    x.lineTo(40, 110);
    x.moveTo(128, 210);
    x.lineTo(216, 110);
    x.stroke();
    x.fillStyle = '#b07a4a';
    x.beginPath();
    x.arc(128, 165, 34, 0, Math.PI * 2);
    x.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const pitch = new THREE.Mesh(new THREE.CircleGeometry(88, 48), new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 0.9, emissive: new THREE.Color('#1c4a22'), emissiveIntensity: 0.6 }));
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.set(stadium.x, 0.3, stadium.z);
  group.add(pitch);
  const crowdCols = ['#c0392b', '#ecf0f1', '#2e86c1', '#f1c40f', '#1d2a44'];
  const seats = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ roughness: 0.8 }), 3000);
  const col = new THREE.Color();
  for (let i = 0; i < 3000; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 90 + rnd() * 13;
    const y = 2 + (r - 90) * 1.7;
    seats.setMatrixAt(i, m4.makeTranslation(stadium.x + Math.cos(a) * r, y, stadium.z + Math.sin(a) * r));
    seats.setColorAt(i, col.set(crowdCols[Math.floor(rnd() * crowdCols.length)]));
  }
  group.add(seats);
  const towerGlow = glowMaterial('#f4f8ff', 3.2, 'flood');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const tx = stadium.x + Math.cos(a) * 112;
    const tz = stadium.z + Math.sin(a) * 112;
    const tower = new THREE.Mesh(new THREE.BoxGeometry(2.5, 70, 2.5), L.metalDark);
    tower.position.set(tx, 35, tz);
    group.add(tower);
    const head = new THREE.Mesh(new THREE.BoxGeometry(14, 6, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#f6faff').multiplyScalar(4), toneMapped: false }));
    head.position.set(tx, 72, tz);
    head.lookAt(stadium.x, 0, stadium.z);
    group.add(head);
    const g = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), towerGlow);
    g.position.set(tx, 72, tz);
    g.scale.setScalar(70);
    g.userData.billboard = true;
    group.add(g);
  }
  const flood = new THREE.PointLight('#e8f0ff', 6000, 320, 1.6);
  flood.position.set(stadium.x, 80, stadium.z);
  group.add(flood);
  // elevated train with lit windows
  const train = new THREE.Group();
  const carMat = new THREE.MeshStandardMaterial({ color: '#c7ccd2', roughness: 0.4, metalness: 0.5 });
  const winMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe9b8').multiplyScalar(2.6), toneMapped: false });
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(3.2, 3.4, 17), carMat);
    c.position.z = -i * 18;
    train.add(c);
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 15), winMat);
      w.position.set(sx * 1.62, 0.4, -i * 18);
      train.add(w);
    }
  }
  train.position.set(-150, 22, 0);
  group.add(train);
  const track = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, SIZE * 2), L.concreteDark);
  track.position.set(-150, 19.6, 0);
  group.add(track);
  for (let z = -SIZE; z < SIZE; z += 40) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(2, 19, 2), L.concreteDark);
    p.position.set(-150, 9.5, z);
    group.add(p);
  }
  // giant ad screens on the tallest towers
  const adTex = (title: string, sub: string, bg: string) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const x = c.getContext('2d')!;
    x.fillStyle = bg;
    x.fillRect(0, 0, 512, 256);
    x.fillStyle = '#fff';
    x.font = '700 76px "Barlow Condensed", Arial Narrow, sans-serif';
    x.fillText(title, 28, 120);
    x.font = '500 30px Barlow, Arial, sans-serif';
    x.globalAlpha = 0.85;
    x.fillText(sub, 30, 180);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  const ads = [
    ['CIVIC', 'KEEPING BELLWETHER CONNECTED', '#0f5f7a'],
    ['BEACONS 3 · 2', 'BOTTOM OF THE 7TH · LIVE', '#1d2a6a'],
    ['ORANGE LINE', 'EVERY 4 MINUTES · ALWAYS', '#d8642a'],
    ['PERCH COFFEE', 'OPEN ALL NIGHT', '#2a5a3a'],
  ] as const;
  ads.forEach(([a, b, c], i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(56, 28), new THREE.MeshBasicMaterial({ map: adTex(a, b, c), toneMapped: false, color: new THREE.Color(2, 2, 2) }));
    m.position.set(i % 2 ? 70 : -60, 120 + i * 8, 200 + i * 160);
    m.rotation.y = i % 2 ? -0.6 : 0.6;
    group.add(m);
  });
  // the Shepherds: giant municipal walkers striding along the avenues below
  const walkers = [
    new Shepherd({ scale: 2.2, cargo: 'tank', name: 'SHEPHERD 02', glow: 0.3 }).place(new THREE.Vector3(150, 0, 470), 0.3),
    new Shepherd({ scale: 2.6, cargo: 'house', name: 'SHEPHERD 04', glow: 0.3 }).place(new THREE.Vector3(-110, 0, 420), Math.PI / 2),
    new Shepherd({ scale: 2.0, cargo: 'lamps', name: 'SHEPHERD 11', glow: 0.3 }).place(new THREE.Vector3(-90, 0, 640), Math.PI),
    new Shepherd({ scale: 2.4, name: 'SHEPHERD 07', glow: 0.3 }).place(new THREE.Vector3(170, 0, 640), Math.PI * 0.8),
  ];
  for (const w of walkers) {
    w.speed = w.cruise;
    group.add(w.root);
    W.disposers.push(() => w.dispose());
  }
  group.position.y = -ALT;
  W.add(group);
  return {
    group,
    update: (dt, t) => {
      group.position.z -= FLY * dt;
      for (const w of walkers) w.update(dt);
      for (let i = 0; i < N; i++) {
        const c = cars[i];
        c.s += c.v * dt;
        if (c.s > SIZE) c.s -= SIZE * 2;
        if (c.s < -SIZE) c.s += SIZE * 2;
        const x = c.alongX ? c.s : c.road;
        const z = c.alongX ? c.road : c.s;
        const yaw = c.alongX ? Math.PI / 2 : 0;
        const fwd = Math.sign(c.v);
        m4.makeRotationY(yaw).setPosition(x + (c.alongX ? fwd * 1.5 : 0), 0.8, z + (c.alongX ? 0 : fwd * 1.5));
        heads.setMatrixAt(i, m4);
        m4.makeRotationY(yaw).setPosition(x - (c.alongX ? fwd * 1.5 : 0), 0.8, z - (c.alongX ? 0 : fwd * 1.5));
        tails.setMatrixAt(i, m4);
      }
      heads.instanceMatrix.needsUpdate = true;
      tails.instanceMatrix.needsUpdate = true;
      train.position.z = ((t * 26) % (SIZE * 2)) - SIZE;
    },
  };
}

/** Helicopter cabin interior: seats, webbing, red lights, open door. */
function cabin(W: World): void {
  const L = M();
  const shell = new THREE.MeshStandardMaterial({ color: '#2b3038', roughness: 0.6, metalness: 0.4 });
  W.box([-1.35, -0.1, -2.8], [1.35, 0, 2.8], L.metalDark, { surface: 'metal' });
  W.box([-1.35, 2.05, -2.8], [1.35, 2.15, 2.8], shell, { collide: false });
  W.box([-1.45, 0, -2.8], [-1.35, 2.05, 2.8], shell, { collide: false });
  W.box([-1.35, 0, -2.9], [1.35, 2.05, -2.8], shell, { collide: false });
  // cockpit bulkhead with window into the cockpit
  W.box([-1.35, 0, 2.8], [-0.4, 2.05, 2.9], shell, { collide: false });
  W.box([0.4, 0, 2.8], [1.35, 2.05, 2.9], shell, { collide: false });
  W.box([-0.4, 1.4, 2.8], [0.4, 2.05, 2.9], shell, { collide: false });
  // +x side: open door between z -1.1 .. 1.5, wall elsewhere
  W.box([1.35, 0, -2.8], [1.45, 2.05, -1.1], shell, { collide: false });
  W.box([1.35, 0, 1.5], [1.45, 2.05, 2.8], shell, { collide: false });
  W.box([1.35, 1.9, -1.1], [1.45, 2.05, 1.5], shell, { collide: false });
  // benches + webbing
  W.box([-1.3, 0.42, -2.4], [-0.85, 0.5, 2.4], L.fabricRed, { collide: false });
  for (let i = -2; i <= 2; i++) W.box([-1.34, 0.6, i * 0.9 - 0.3], [-1.3, 1.65, i * 0.9 + 0.3], L.fabric, { collide: false });
  W.box([0.85, 0.42, -2.6], [1.3, 0.5, -1.3], L.fabricRed, { collide: false });
  // red cabin lamps + instrument glow + moonlight through the door
  for (const z of [-1.8, 0, 1.8]) {
    W.box([-0.08, 1.98, z - 0.08], [0.08, 2.02, z + 0.08], new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff3020').multiplyScalar(3) }), { collide: false, cast: false });
    W.light({ x: 0, y: 1.9, z }, '#ff3a20', { intensity: 6, distance: 5, glow: 0.25, pool: false });
  }
  W.light({ x: 0, y: 1.2, z: 2.6 }, '#ffb070', { intensity: 7, distance: 5, glow: 0, pool: false });
  W.light({ x: 2.2, y: 1.6, z: 0.2 }, '#9fbcff', { intensity: 9, distance: 6, glow: 0, pool: false });
  // cockpit glow
  W.quad(new THREE.MeshBasicMaterial({ color: new THREE.Color('#7fe3a0').multiplyScalar(1.5) }), { x: 0, y: 1.1, z: 3.6 }, 1.4, 0.4, Math.PI);
}

export const prologue: Chapter = {
  id: 'prologue',
  num: 'PROLOGUE',
  title: 'Two Point One Million',
  env: {
    sky: SKY.storm, fog: '#141b26', fogDensity: 0.0032, rain: 1, envKind: 'city', exposure: 1.1,
    hemi: ['#7d8fae', '#201814', 0.35], reverb: [1.2, 0.25], bloom: 0.9, grade: { sat: 1.1, vignette: 1.0 },
  },
  seed: 11,
  build(W: World, g: Game) {
    cabin(W);
    const pano = panorama(W);
    const heli = helicopter();
    heli.group.visible = false;
    heli.group.position.set(0, -1.1, 0);
    W.add(heli.group);
    W.named.set('heli', heli);
    W.named.set('pano', pano);
    W.onUpdate((dt, t) => {
      pano.update(dt, t);
      heli.rotor.rotation.y += dt * 24;
      heli.tail.rotation.x += dt * 40;
    });
    W.spawn.set(-1.0, 0, -0.2);
    W.spawnYaw = -Math.PI / 2;
    g.person('cole', PEOPLE.cole, V(-1.0, 0, -1.3), Math.PI / 2).body.mode = 'sit';
    g.person('maya', PEOPLE.maya, V(-1.0, 0, 0.9), Math.PI / 2).body.mode = 'sit';
    const reyes = g.person('reyes', PEOPLE.reyes, V(1.05, 0, -1.95), -Math.PI / 2);
    reyes.body.mode = 'sit';
    const tablet = g.people.get('maya')!.body.attach('phone', 'L');
    tablet.scale.setScalar(1.8);
    for (const p of g.people.values()) {
      p.lookAtPlayer = false;
      p.hold(p.yaw);
    }
  },
  ambience() {
    audio.helicopter(0.5, true);
    audio.setRain(1, false);
    audio.wind(0.25);
  },
  async run(s: Script) {
    const g = s.g;
    const heli = s.world.named.get('heli') as ReturnType<typeof helicopter>;
    const cole = g.people.get('cole')!;
    const maya = g.people.get('maya')!;
    const reyes = g.people.get('reyes')!;
    s.control(false);
    g.hud.setFade(1);
    await s.wait(0.8);
    for (const t of [
      'Eleven years ago, every human being in the city of Bellwether disappeared.',
      'Two point three million people. In a single night.',
      'The city was sealed. Abandoned. Forgotten.',
      'Three days ago, a weather satellite photographed Bellwether at night.',
      'It was full of light.',
    ]) {
      g.hud.showSub('', t, false, 0);
      await s.wait(3.4);
    }
    g.hud.hideSub();
    await s.cut(async () => {
      s.cam(V(-0.95, 1.18, -0.2), V(1.4, 1.05, -0.4), 62);
      void s.fade(0, 2.5);
      await s.wait(1.6);
      cole.body.lookTarget = V(-1.0, 1.2, -0.2);
      await s.camTo(V(-0.95, 1.18, -0.2), V(-1.0, 1.3, -1.3), 1.4, 50);
      await s.say('cole', 'Last check. Bellwether has been dark for eleven years. No power. No people.');
      await s.say('cole', 'We land, we find out what that satellite saw, we leave. Nobody touches anything.');
      reyes.body.lookTarget = V(-1.0, 1.2, -0.2);
      await s.camTo(V(-0.95, 1.18, -0.2), V(1.0, 1.25, -1.9), 1.2, 52);
      await s.say('reyes', 'Satellite saw lights. Old wiring. Solar backups.', { dur: 2.6 });
      await s.say('reyes', 'Maybe ghosts.', { dur: 1.8 });
      maya.body.lookTarget = V(1.05, 1.2, -1.95);
      await s.camTo(V(-0.95, 1.18, -0.2), V(-1.0, 1.25, 0.9), 1.2, 52);
      await s.say('maya', 'Solar backups don\'t run traffic signals, Reyes.');
      await s.say('PILOT', 'Coming over the ridge now. Thirty seconds.', { radio: true });
      // the reveal through the open door
      for (const p of [cole, maya, reyes]) p.body.lookTarget = V(6, -8, 0.2);
      await s.camTo(V(0.9, 1.25, 0.2), V(8, -6, 6), 3.5, 58);
      audio.stinger('soft');
      audio.cheer(0.12, 5);
      await s.camTo(V(1.35, 1.2, 0.3), V(30, -60, 70), 4.5, 62);
      await s.wait(2.2);
      await s.say('elias', 'How many people are down there?');
      maya.body.lookTarget = maya.body.bonePos('handL').add(V(0, -0.1, 0.1));
      await s.camTo(V(-0.2, 1.2, 0.0), V(-1.0, 1.0, 0.9), 1.6, 44);
      await s.say('maya', 'According to thermal imaging?', { dur: 2.4 });
      await s.wait(1.4);
      await s.say('maya', 'Two point one million.', { dur: 3.0 });
      audio.stinger('reveal');
      await s.camTo(V(-0.6, 1.25, -0.6), V(-1.0, 1.35, -1.3), 1.4, 46);
      await s.say('cole', '...That\'s not possible.');
      await s.say('reyes', 'Tell that to the ball game.', { dur: 2.2 });
      await s.say('PILOT', 'Uh... Cole? Something\'s walking down there. Something big.', { radio: true });
      await s.say('cole', 'Define big.', { dur: 1.6 });
      await s.say('PILOT', 'Big.', { radio: true, dur: 1.6 });
      // exterior: the helicopter dropping over a city that is very much alive
      heli.group.visible = true;
      heli.spot.intensity = 400;
      s.cam(V(-14, 6, -22), V(0, 0, 4), 50);
      await s.camTo(V(-10, -2, -30), V(0, -30, 30), 6, 55);
      await s.fade(1, 1.6);
    }, { keepControlAfter: false });
  },
  shots: {
    cabin(g) {
      g.engine.camera.position.set(-0.95, 1.18, -0.2);
      g.engine.camera.lookAt(1.4, 1.05, -0.4);
      g.cine.active = true;
      g.cine.pos.set(-0.95, 1.18, -0.2);
      g.cine.look.set(-1.0, 1.3, -1.3);
      g.cine.fov = 52;
    },
    reveal(g) {
      g.cine.active = true;
      g.cine.pos.set(1.35, 1.2, 0.3);
      g.cine.look.set(30, -60, 70);
      g.cine.fov = 62;
    },
    exterior(g) {
      const heli = g.world!.named.get('heli') as ReturnType<typeof helicopter>;
      heli.group.visible = true;
      heli.spot.intensity = 400;
      g.cine.active = true;
      g.cine.pos.set(-14, 6, -22);
      g.cine.look.set(0, -4, 6);
      g.cine.fov = 55;
    },
  },
};
