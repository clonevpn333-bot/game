import * as THREE from 'three';
import type { ChapterDef } from '../game/types';
import type { Level } from '../game/Level';
import { look } from '../render/Atmosphere';
import { Tex } from '../render/Textures';
import { boxGeo, roundedGeo } from '../world/Geo';
import { house, lamp } from '../world/Kit';
import { audio, cloudHorizon, glowMat, sign, skyOrb, solidMat, STYLES } from './common';
import { createSeededRandom } from '../core/rng';
import type { Watcher } from '../entities/Actors';

const LOOK = look({
  sky: { top: '#5a5a78', mid: '#b8b4c8', sun: '#f2e8ff', sunSize: 3, cloudLit: '#e2dcec', cloudShade: '#6a6a88', cloudCover: 0.8, cloudScale: 0.7, seaLit: '#c8c4d8', seaShade: '#5a5a74', seaAmount: 0 },
  fog: { color: '#b4b2c6', sun: '#e6def2', low: '#7a7890', density: 0.012, base: 0, falloff: 0.02, heightMix: 0.4, max: 0.94 },
  sunDir: [-0.3, 0.35, -0.9],
  sunColor: '#e8e2ff',
  sunIntensity: 1.3,
  hemiSky: '#c8c4e0',
  hemiGround: '#4a4a60',
  hemiIntensity: 1.0,
  rimColor: '#e8e4ff',
  rimStrength: 0.35,
  envIntensity: 1.2,
  dread: 0.65,
  post: { bloom: 0.9, bloomThreshold: 0.72, warp: 0.75, edgeBlur: 0.85, desat: 0.25, grain: 0.1, vignette: 0.5, lift: 0.2, shadowTint: '#b0b0d8', highlightTint: '#f6eef2', contrast: 1.06, exposure: 1, glitch: 0 },
  motes: { kind: 'bubbles', color: '#e8e8ff', density: 0.5 },
});

export const ch07: ChapterDef = {
  id: 6,
  key: 'sleeping-sea',
  title: 'The Sleeping Sea',
  subtitle: 'Where old memories settle when nobody remembers them.',
  uiDread: 2,
  oriDread: 0.66,
  parcelColor: '#9fd0ff',
  look: LOOK,
  audio: audio({
    chords: [[50, 57, 62, 65, 69], [48, 55, 60, 64, 67], [46, 53, 58, 62, 65], [45, 52, 57, 60, 64]],
    chordDur: 9,
    padType: 'sine',
    padGain: 0.8,
    bellGain: 0.7,
    arpEvery: 1.4,
    wobble: 0.1,
    pitch: 0.97,
    reverb: 1,
    water: 0.8,
    wind: 0.3,
  }),
  build(lv: Level) {
    const b = lv.b;
    const m = lv.mats;
    lv.killY = -10;
    const rnd = createSeededRandom(77);
    const wood = m.tex('seaWood', Tex.wood('#8a7a6a'), { roughness: 0.8 });
    const stone = m.tex('seaStone', Tex.concrete('#8a8a96'), { roughness: 0.9 });
    const HIGH = 1.6, LOW = -0.6, FLOOD = 5.4;
    let level = HIGH;

    // =================== the sea ===================
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400, 1, 1), m.water);
    sea.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(4 * 3).fill(0.62), 3));
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = level;
    sea.renderOrder = 2;
    lv.root.add(sea);
    const waterVol = b.physics.addWater(new THREE.Vector3(-700, -6, -700), new THREE.Vector3(700, HIGH, 700), true);
    b.physics.addBox(0, -4, -60, 1400, 2, 1400, { surface: 'stone', climbable: false });
    // ripples/lamps floating on the water (memory lights)
    const floaters: THREE.Mesh[] = [];
    for (let i = 0; i < 40; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), glowMat(i % 3 ? '#fff2d6' : '#d6e6ff', 2.2));
      f.position.set((rnd() - 0.5) * 140, level + 0.1, 20 - rnd() * 170);
      lv.root.add(f);
      floaters.push(f);
    }

    // =================== start pier ===================
    b.box({ x: 0, y: 1.9, z: 4, w: 3, h: 0.3, d: 12, mat: wood, color: '#ffffff', surface: 'wood' });
    for (let z = -1.5; z <= 9.5; z += 2.5) for (const x of [-1.4, 1.4]) b.add(new THREE.CylinderGeometry(0.14, 0.16, 6, 8), { x, y: -1, z, color: '#5a4a3a' });
    lamp(b, 1.3, 2.05, -1.5, { color: '#4a4a5a', bulb: '#e8eaff' });
    b.box({ x: 0, y: 2.6, z: 9.8, w: 3, h: 1.3, d: 0.3, color: '#6a6a7a', mat: m.metal });
    lv.setStart(0, 2.05, 6, Math.PI);

    // =================== drifting houses (rafts) ===================
    const rafts: Array<{ group: THREE.Group; p: ReturnType<Level['movingPlatform']>; base: THREE.Vector3; ax: THREE.Vector3; amp: number; speed: number; phase: number }> = [];
    const raft = (x: number, z: number, ax: [number, number], amp: number, speed: number, phase: number, wall: string, roof: string) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(roundedGeo(4.2, 3.4, 4.2, 0.15, 2), solidMat(wall, 0.8));
      body.position.y = -1.9;
      const top = new THREE.Mesh(roundedGeo(4.6, 0.3, 4.6, 0.08, 2), solidMat(roof, 0.6));
      const win = new THREE.Mesh(boxGeo(1.0, 0.9, 0.05), glowMat('#fff2c8', 1.3));
      win.position.set(0.8, -1.1, 2.12);
      g.add(body, top, win);
      g.position.set(x, HIGH + 1.0, z);
      lv.root.add(g);
      const p = lv.movingPlatform(g, 4.6, 0.3, 4.6, 'wood');
      rafts.push({ group: g, p, base: new THREE.Vector3(x, 0, z), ax: new THREE.Vector3(ax[0], 0, ax[1]).normalize(), amp, speed, phase });
    };
    raft(0, -6.5, [1, 0], 3.5, 0.55, 0, '#d8d0e8', '#7a6a8a');
    raft(-5, -13.5, [0, 1], 1.6, 0.7, 1.2, '#e8d8d0', '#8a5a5a');
    // memory room 1: the birthday (static, floats)
    const MX = -12, MZ = -20, MY = HIGH + 1.2;
    b.box({ x: MX, y: MY - 0.2, z: MZ, w: 9, h: 0.4, d: 7, mat: wood, color: '#ffffff', surface: 'wood' });
    b.box({ x: MX, y: MY + 1.6, z: MZ - 3.4, w: 9, h: 3.2, d: 0.2, color: '#f2d6e0', climbable: false });
    b.box({ x: MX - 4.4, y: MY + 1.6, z: MZ, w: 0.2, h: 3.2, d: 7, color: '#f2d6e0', climbable: false });
    b.box({ x: MX, y: MY + 0.4, z: MZ - 0.5, w: 2.4, h: 0.8, d: 1.4, r: 0.06, color: '#fff6ee', surface: 'wood' });
    b.add(new THREE.CylinderGeometry(0.4, 0.4, 0.35, 16), { x: MX, y: MY + 1.0, z: MZ - 0.5, color: '#ffb8d6', mat: m.satin });
    for (let i = 0; i < 5; i++) b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 4), { x: MX - 0.2 + i * 0.1, y: MY + 1.28, z: MZ - 0.5, color: '#fff6ee' });
    for (let i = 0; i < 5; i++) b.add(new THREE.SphereGeometry(0.03, 6, 4), { x: MX - 0.2 + i * 0.1, y: MY + 1.42, z: MZ - 0.5, color: '#ffd46b', mat: m.glow, shadow: false });
    for (let i = 0; i < 6; i++) b.add(new THREE.SphereGeometry(0.35, 12, 10), { x: MX - 3 + i * 1.1, y: MY + 3.2 + Math.sin(i) * 0.3, z: MZ - 3, color: ['#ff9fb2', '#9fc8ff', '#ffd46b'][i % 3], mat: m.satin });
    sign(lv, 'HAPPY BIRTHDAY', MX, MY + 2.4, MZ - 3.28, 4, 0.6, 0, { bg: '#fff6ee', fg: '#e86a8a', glow: 1 });
    const party = [
      lv.resident({ name: 'Guest', style: STYLES.kid('#9fc8ff', '#5a3a2a'), pos: [MX - 1.6, MY, MZ - 0.4], facing: Math.PI / 2, behavior: 'frozen', oblivious: true }),
      lv.resident({ name: 'Guest ', style: STYLES.kid('#ffd46b', '#2a1a1a'), pos: [MX + 1.6, MY, MZ - 0.6], facing: -Math.PI / 2, behavior: 'frozen', oblivious: true }),
      lv.resident({ name: 'Parent', style: { ...STYLES.elder, scale: 1.05, hair: '#5a3a2a', top: '#b8c8e8' }, pos: [MX, MY, MZ - 2.2], facing: 0, behavior: 'frozen', oblivious: true, bark: ['...make a wish...'] }),
    ];
    void party;
    lv.stamp('c7-birthday-cake', MX + 3.4, MY, MZ + 2.4);
    lv.trigger(MX, MY + 1, MZ, 9, 4, 7, () => lv.say(['Ori', "(A birthday party, frozen right before the wish. Nobody's breathing.)", 'sad']));
    raft(-3, -26.2, [1, 0], 2.8, 0.6, 2.4, '#d0dce8', '#5a6a8a');
    raft(1.5, -30.6, [0, 1], 0.8, 0.45, 0.6, '#e2e2d0', '#6a7a5a');

    // =================== island A + tide anchor ===================
    const islandA = (x: number, z: number, w: number, d: number, top: number) => {
      b.box({ x, y: top - 3, z, w, h: 6, d, r: 0.6, mat: stone, color: '#ffffff', surface: 'stone' });
    };
    islandA(0, -38, 10, 8, 3.0);
    lamp(b, 3.6, 3.0, -35, { color: '#4a4a5a', bulb: '#e8eaff' });
    lv.checkpoint(0, 3.0, -36, Math.PI, { objective: 'Wake the tide anchor', waypoint: new THREE.Vector3(0, 3, -40) });
    // causeway (revealed at low tide)
    for (let z = -43; z > -92; z -= 3.2) {
      b.box({ x: Math.sin(z * 0.08) * 2.2, y: -0.2, z, w: 3, h: 0.8, d: 3.1, r: 0.25, mat: stone, color: '#d8d8e2', surface: 'stone' });
    }
    for (let z = -46; z > -92; z -= 9.6) lamp(b, Math.sin(z * 0.08) * 2.2 + 1.7, 0.2, z, { h: 2.6, color: '#4a4a5a', bulb: '#d6e2ff' });
    let tide = 'high' as 'high' | 'low' | 'flood';
    const setTide = (to: 'low' | 'flood', instant: boolean) => {
      tide = to;
      const target = to === 'low' ? LOW : FLOOD;
      const from = level;
      if (instant) level = target;
      else lv.game.tweens.add(to === 'low' ? 5 : 6, (k) => (level = from + (target - from) * k), (t) => t * t * (3 - 2 * t));
    };
    lv.anchor(0, 3.0, -40.5, '#9fd0ff', 'Tide anchor', async () => {
      lv.game.audio.rumble(4);
      setTide('low', false);
      await lv.wait(2.5);
      await lv.say(['Ori', '(The sea is pulling back. There was a road underneath the whole time.)', 'surprised']);
      lv.objective('Follow the causeway before the sea remembers itself', [0, 0.2, -95]);
    });
    // watchers in the water
    const watchers: Watcher[] = [];
    for (const [x, z] of [[-26, -60], [24, -72], [-20, -96]] as const) {
      const w = lv.watcher(x, -0.5, z, 2.8);
      w.mode = 'approach';
      w.minDist = 11;
      w.approachStep = 4;
      w.active = false;
      watchers.push(w);
    }
    lv.trigger(0, 1, -50, 10, 6, 4, () => {
      for (const w of watchers) w.active = true;
      void lv.say(['Ori', '(Figures. Standing in the water. They only move when I\'m not looking.)', 'scared']);
    });
    lv.checkpoint(0, 0.2, -46, Math.PI, { objective: 'Follow the causeway', waypoint: new THREE.Vector3(0, 0.2, -95), restore: () => setTide('low', true) });

    // =================== island B + flood ===================
    islandA(0, -100, 12, 10, 6.0);
    // stairs up island B from the causeway
    b.stairs(0, -93.5, 3, 0.2, 6.0, 4.5, 'z', -1, { color: '#c8c8d2', mat: stone, surface: 'stone' });
    lamp(b, -4.5, 6, -98, { color: '#4a4a5a', bulb: '#e8eaff' });
    // the half-sunk apartment block across the channel
    const AZ = -112;
    b.box({ x: 0, y: 4, z: AZ - 4, w: 16, h: 24, d: 8, color: '#8a8aa0', mat: stone, climbable: false });
    for (let r = 0; r < 6; r++) for (let c = 0; c < 5; c++) {
      const lit = rnd() > 0.7;
      b.add(boxGeo(1.4, 1.6, 0.1), { x: -6 + c * 3, y: -4 + r * 3.6, z: AZ + 0.05, color: lit ? '#fff2c8' : '#3a3a4a', mat: lit ? m.glow : m.satin, shadow: false });
    }
    // balcony with the door
    b.box({ x: 0, y: 7.3, z: AZ + 1.2, w: 5, h: 0.4, d: 2.4, color: '#a8a8b8', mat: stone, surface: 'stone' });
    b.box({ x: 0, y: 8.6, z: AZ + 2.3, w: 5, h: 0.12, d: 0.1, color: '#5a5a6a', mat: m.metal, collide: false });
    b.box({ x: 0, y: 8.6, z: AZ + 0.05, w: 1.4, h: 2.4, d: 0.12, color: '#ffd46b', collide: false });
    const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.1), glowMat('#ffe08a', 3));
    doorGlow.position.set(0, 7.55, AZ + 0.12);
    lv.root.add(doorGlow);
    // floating house in the channel (rises with the flood)
    const fh = new THREE.Group();
    const fhBody = new THREE.Mesh(roundedGeo(4.4, 4, 4.4, 0.15, 2), solidMat('#e2d6c8', 0.8));
    fhBody.position.y = -2.2;
    const fhRoof = new THREE.Mesh(roundedGeo(4.8, 0.3, 4.8, 0.08, 2), solidMat('#6a5a7a', 0.6));
    fh.add(fhBody, fhRoof);
    fh.position.set(0, HIGH + 1.0, -107.3);
    lv.root.add(fh);
    const fhP = lv.movingPlatform(fh, 4.8, 0.3, 4.8, 'wood');
    lv.stamp('c7-apartment-roof', 6, 16, AZ - 4);
    b.box({ x: 6, y: 15.8, z: AZ - 4, w: 3, h: 0.4, d: 3, color: '#a8a8b8', mat: stone, collide: false });
    lv.anchor(3.6, 6.0, -102, '#9fd0ff', 'Flood anchor', async () => {
      lv.game.audio.rumble(5);
      setTide('flood', false);
      for (const w of watchers) w.active = false;
      await lv.wait(3);
      await lv.say(['Ori', '(The house is floating up with the water. Up to that lit door.)', 'determined']);
      lv.objective('Ride the floating house up to the lit door', [0, 7.5, AZ + 1]);
    }, { enabled: () => tide === 'low' });
    lv.checkpoint(0, 6, -97, Math.PI, { objective: 'Wake the flood anchor on the island', waypoint: new THREE.Vector3(3.6, 6, -102), restore: () => setTide('low', true) });

    // =================== the yellow kitchen ===================
    const KX = 40, KZ = -140, KY = 7.5;
    b.box({ x: KX, y: KY - 0.2, z: KZ, w: 7, h: 0.4, d: 7, color: '#c8b070', surface: 'tile', mat: m.tex('kitchenTile', Tex.mallTile('#f2e6a8', '#e2d098'), { roughness: 0.3 }) });
    for (const [x, z, w, d] of [[KX, KZ - 3.5, 7, 0.2], [KX - 3.5, KZ, 0.2, 7], [KX + 3.5, KZ, 0.2, 7]] as const) b.box({ x, y: KY + 1.5, z, w, h: 3, d, color: '#e8d27a', climbable: false });
    b.box({ x: KX, y: KY + 0.45, z: KZ - 0.5, w: 2, h: 0.9, d: 1.2, r: 0.04, color: '#fff6e6', surface: 'wood' });
    b.box({ x: KX - 2.6, y: KY + 0.5, z: KZ - 2.9, w: 1.6, h: 1, d: 1, color: '#f2f2ea' });
    const kettle = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 10), solidMat('#c8c8d8', 0.2, { metalness: 0.9 }));
    kettle.position.set(KX - 2.6, KY + 1.2, KZ - 2.9);
    lv.root.add(kettle);
    sign(lv, 'EVERY MORNING', KX, KY + 2.3, KZ - 3.38, 2.4, 0.4, 0, { bg: '#f2e6a8', fg: '#8a6a2a', glow: 1 });
    let inKitchen = false;
    lv.interact(0, 8.6, AZ + 0.6, 'Open the lit door', async () => {
      inKitchen = true;
      lv.lock(true);
      lv.game.audio.door();
      await lv.game.ui.fade(true, false);
      lv.player.teleport(new THREE.Vector3(KX, KY, KZ + 2.6), Math.PI);
      lv.game.camRig.snap(lv.player.pos, 0);
      lv.cpIndex = kitchenCp;
      lv.game.saveCheckpoint(kitchenCp);
      await lv.game.ui.fade(false);
      lv.lock(false);
      await lv.say(['Ori', '(A kitchen. Yellow walls. A kettle singing. I know this room — I delivered it in a jar.)', 'worried']);
      lv.objective('Look around the kitchen', [KX + 0.3, KY, KZ - 0.5]);
    }, { radius: 2, once: true, enabled: () => tide === 'flood' && !inKitchen });
    const noorEcho = lv.resident({ name: 'Mrs. Noor', style: { ...STYLES.elder, material: 'faded' }, pos: [KX + 1.2, KY, KZ - 0.6], facing: -Math.PI / 2, behavior: 'sit', oblivious: true, bark: ['...the kettle is singing again...'] });
    void noorEcho;
    lv.interact(KX + 0.3, KY + 1, KZ - 0.5, 'Read the note on the table', async () => {
      await lv.say(
        ['Note', '“Every morning lately is this one. I made the tea. I made the tea. I made the tea.”'],
        ['Ori', '(Mrs. Noor\'s morning. The jar I delivered. It was this kitchen — over and over.)', 'sad'],
        ['Ori', '(The wallpaper is yellow. The light is yellow. And the door behind it goes on and on.)', 'scared'],
      );
      lv.objective('Go through the kitchen door', [KX + 3, KY, KZ - 3.4]);
    }, { radius: 2.4 });
    b.box({ x: KX + 2.4, y: KY + 1.1, z: KZ - 3.38, w: 1.1, h: 2.2, d: 0.05, color: '#fff2a8', mat: m.glow, collide: false });
    lv.trigger(KX + 2.4, KY + 1, KZ - 3, 1.4, 3, 1.2, async () => {
      lv.lock(true);
      lv.flash('#ffe880', 1);
      lv.game.audio.stinger('watcher');
      await lv.wait(0.7);
      lv.complete();
    });
    const kitchenCp = lv.checkpoint(KX, KY, KZ + 2.6, Math.PI, { objective: 'Look around the kitchen', waypoint: new THREE.Vector3(KX + 0.3, KY, KZ - 0.5), restore: () => { setTide('flood', true); inKitchen = true; }, radius: 0.1 });

    // =================== extended + distant ===================
    // drowned towers, tilted, fading into fog
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 70 + rnd() * 160;
      const x = Math.cos(a) * r, z = -60 + Math.sin(a) * r;
      const h = 20 + rnd() * 50;
      b.box({ x, y: h / 2 - 8, z, w: 8 + rnd() * 8, h, d: 8 + rnd() * 8, rz: (rnd() - 0.5) * 0.25, rx: (rnd() - 0.5) * 0.2, color: '#7a7a92', layer: 'far', collide: false });
    }
    for (let i = 0; i < 8; i++) house(b, (rnd() - 0.5) * 120, -1.2, -20 - rnd() * 140, { w: 4, d: 4, h: 3, ry: rnd() * 3, wall: '#c8c4d8', roof: '#5a5a7a', layer: 'near', lit: rnd() > 0.6, chimney: false });
    // floating memory frames in the air
    const frames: THREE.Mesh[] = [];
    for (let i = 0; i < 18; i++) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(['#fff2d6', '#e6dcff', '#d6ecff'][i % 3]).multiplyScalar(1.3), transparent: true, opacity: 0.55, side: THREE.DoubleSide, toneMapped: false }));
      f.position.set((rnd() - 0.5) * 80, 8 + rnd() * 20, -10 - rnd() * 140);
      f.rotation.set(rnd(), rnd() * 3, rnd() * 0.4);
      lv.root.add(f);
      frames.push(f);
    }
    skyOrb(lv, -120, 90, -400, 40, '#e8e4f2');
    cloudHorizon(lv, 0, -60, { radius: 360, count: 220, y: 10, ySpread: 40, size: 90, lit: '#d8d4e4', shade: '#6a6a88' });

    // =================== runtime ===================
    lv.onUpdate((dt, t) => {
      sea.position.y = level + Math.sin(t * 0.4) * 0.02;
      waterVol.level = level;
      for (const f of floaters) f.position.y = level + 0.12 + Math.sin(t + f.position.x) * 0.05;
      for (const r of rafts) {
        const off = Math.sin(t * r.speed + r.phase) * r.amp;
        r.p.move(r.base.x + r.ax.x * off, level + 1.0 + Math.sin(t * 0.8 + r.phase) * 0.06, r.base.z + r.ax.z * off);
      }
      fhP.move(0, Math.max(HIGH, level) + 1.0 + Math.sin(t * 0.7) * 0.05, -107.3);
      for (const f of frames) f.rotation.y += dt * 0.05;
      kettle.position.y = KY + 1.2 + Math.sin(t * 30) * 0.004;
      // drowning
      const pb = lv.player.body;
      if (pb.inWater && pb.waterDepth > 1.3) lv.game.wake('The Sleeping Sea pulled you under.');
    });

    lv.intro = async () => {
      lv.lock(true);
      lv.cine([3, 4, 9], [0, 3, -30], 58);
      await lv.wait(1.2);
      await lv.say(
        ['Ori', '(The lift opened onto the sea. Grey sky, grey water, little lights floating like they\'re waiting to be picked up.)', 'sad'],
        ['Ori', "(The water's deep. I shouldn't fall in. The houses are drifting — I can ride their roofs.)", 'determined'],
      );
      lv.cineEnd();
      lv.lock(false);
      lv.objective('Cross the drifting houses to the island', [0, 3, -38]);
    };
  },
};
