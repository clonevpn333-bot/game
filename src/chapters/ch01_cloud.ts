import * as THREE from 'three';
import type { ChapterDef } from '../game/types';
import type { Level } from '../game/Level';
import { look } from '../render/Atmosphere';
import { fieldMaterial } from '../render/DreamShading';
import { boxGeo, puffGeo, roundedGeo } from '../world/Geo';
import { bench, cloudCluster, cloudIsland, fence, floatingDistrict, flowers, house, lamp, skylineRing, tree } from '../world/Kit';
import { audio, balloon, cloudField, cloudHorizon, glowMat, sign, skyOrb, solidMat, STYLES } from './common';
import { createSeededRandom } from '../core/rng';
import { Tex } from '../render/Textures';
import { easeOutBack } from '../core/math';

const WALLS = ['#ffd9e2', '#ffe6c9', '#d9ecff', '#e6dcff', '#ffeef5', '#dff5e6'];
const ROOFS = ['#8e7cc3', '#f28fb0', '#7aa6e0', '#f2a65a', '#b48ee0'];
const BLOOMS = ['#ff9fc2', '#ffd46b', '#b8a2ff', '#9fe3ff', '#ffb38a', '#ffffff'];

const LOOK = look({
  sky: { top: '#7fa6ff', mid: '#ffc6dc', sun: '#fff1d2', sunSize: 1.3, cloudLit: '#fff8f2', cloudShade: '#d9bfe6', cloudCover: 0.48, seaLit: '#fff6f0', seaShade: '#c7b2e6', seaAmount: 1 },
  fog: { color: '#ffcfe0', sun: '#ffe2b8', low: '#c9b2ee', density: 0.0055, base: 6, falloff: 0.02, heightMix: 0.6, max: 0.9 },
  sunDir: [0.3, 0.38, -0.88],
  sunColor: '#ffd9b8',
  sunIntensity: 2.1,
  hemiSky: '#e2d4ff',
  hemiGround: '#ffb8cc',
  hemiIntensity: 0.85,
  rimColor: '#ffe6f2',
  rimStrength: 0.38,
  envIntensity: 0.45,
  post: { bloom: 0.7, bloomThreshold: 0.82, warp: 0.5, edgeBlur: 0.7, desat: 0, grain: 0.05, vignette: 0.38, lift: 0.18, shadowTint: '#d9c4ff', highlightTint: '#fff1e0', contrast: 1.12, exposure: 1, glitch: 0 },
  motes: { kind: 'pollen', color: '#fff0c8', density: 0.75 },
});

export const ch01: ChapterDef = {
  id: 0,
  key: 'cloud-district',
  title: 'The Cloud District',
  subtitle: 'A sealed parcel. A sleepy morning. An ordinary job.',
  uiDread: 0,
  oriDread: 0,
  parcelColor: '#ffcf7a',
  look: LOOK,
  audio: audio({
    chords: [[60, 64, 67, 71, 74], [57, 60, 64, 67, 71], [53, 57, 60, 64, 69], [55, 59, 62, 64, 67]],
    chordDur: 5.2,
    arpEvery: 0.55,
    wind: 0.55,
    reverb: 0.55,
  }),
  build(lv: Level) {
    const b = lv.b;
    const m = lv.mats;
    lv.killY = -6;

    // =================== A. Courier booth island ===================
    cloudIsland(b, 0, 0, 16, 14, 10, 1, { belly: 1.4 });
    // booth
    b.box({ x: 4, y: 10.55, z: -1.1, w: 3.4, h: 1.1, d: 1.2, r: 0.12, color: '#ffb8cf', top: '#ffd6e2', surface: 'wood' });
    b.box({ x: 4, y: 11.12, z: -1.1, w: 3.6, h: 0.08, d: 1.4, r: 0.03, color: '#fff4ea', collide: false });
    for (const sx of [2.35, 5.65]) b.box({ x: sx, y: 12, z: -1.6, w: 0.18, h: 2.6, d: 0.18, color: '#fff4ea', collide: false });
    // striped awning
    for (let i = 0; i < 8; i++) {
      b.add(roundedGeo(0.48, 0.12, 1.9, 0.05, 2), { x: 2.2 + i * 0.5, y: 13.3 - 0.0, z: -1.2, rx: 0.22, color: i % 2 ? '#fff6ee' : '#ff8fb5', mat: m.satin });
    }
    // mail cubbies wall
    b.box({ x: 4, y: 11.6, z: -2.9, w: 3.6, h: 3.2, d: 0.5, r: 0.1, color: '#c7a6ff', top: '#e2d2ff' });
    const rnd = createSeededRandom(4);
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 4; j++) {
        b.add(boxGeo(0.48, 0.5, 0.1), { x: 2.6 + i * 0.56, y: 10.6 + j * 0.62, z: -2.62, color: '#5c4a8a' });
        if (rnd() > 0.45) b.add(roundedGeo(0.36, 0.3, 0.3, 0.04, 1), { x: 2.6 + i * 0.56, y: 10.55 + j * 0.62, z: -2.6, ry: rnd() * 0.4, color: ['#ffe7b0', '#ffc6d6', '#c9e6ff'][Math.floor(rnd() * 3)], mat: m.satin });
      }
    sign(lv, 'ROUTE POST', 4, 13.75, -0.25, 3.0, 0.62, 0, { bg: '#3a2a6a', fg: '#ffe7b8', glow: 1.3 });
    // parcel pile
    for (let i = 0; i < 9; i++) {
      const s = 0.4 + rnd() * 0.35;
      b.box({ x: 6.7 + (rnd() - 0.5) * 1.6, y: 10 + s / 2 + (i > 5 ? s : 0), z: 0.5 + (rnd() - 0.5) * 1.6, w: s * 1.2, h: s, d: s, ry: rnd() * 1.4, r: 0.05, color: ['#ffe2b0', '#ffc6d6', '#d9ecff', '#fff4ea'][i % 4], collide: false });
    }
    b.physics.addBox(6.7, 10.5, 0.5, 1.8, 1, 1.8, { climbable: true });
    lamp(b, -5, 10, 4);
    lamp(b, -5, 10, -5);
    bench(b, -4.5, 10, 0, Math.PI / 2, '#d99ab8');
    flowers(b, -2, 10, 5.5, 5, 1.2, 40, 2, BLOOMS);
    flowers(b, 1, 10, -5.8, 8, 1, 40, 3, BLOOMS);
    tree(b, -6, 10, -3.5, 0.9, { leaf: '#ffb8d6' });
    const mabel = lv.resident({ name: 'Mabel', style: STYLES.mabel, pos: [4, 10, -2.15], facing: 0, behavior: 'idle', voice: 420 });
    lv.setStart(0, 10, 4.5, Math.PI);

    // =================== B. Tutorial hops + fork ===================
    cloudIsland(b, 0, -12, 4.6, 4.6, 10, 11);
    cloudIsland(b, -2, -18, 4.2, 4.2, 10.8, 12);
    cloudIsland(b, 0, -25, 10, 6.5, 11.4, 13);
    // low route
    cloudIsland(b, -4, -31.5, 4, 4, 11.4, 14);
    cloudIsland(b, -2.5, -37, 4.2, 4.2, 11.4, 15);
    // high route (optional) with stamp
    cloudIsland(b, 4, -30, 3.2, 3.2, 12.6, 16);
    cloudIsland(b, 5.5, -34.5, 3.2, 3.2, 13.8, 17);
    lv.stamp('c1-high-route', 5.5, 13.8, -34.5);
    lamp(b, 3, 11.4, -24);
    sign(lv, 'LIGHTHOUSE  →', -2.6, 12.7, -27.3, 2.2, 0.5, 0, { bg: '#ffe7f0', fg: '#6a4a9a', glow: 1 });
    b.box({ x: -2.6, y: 11.95, z: -27.4, w: 0.1, h: 1.1, d: 0.1, color: '#fff4ea', collide: false });

    // =================== C. Cloud bridge ===================
    const bridgeZ0 = -40, bridgeZ1 = -66;
    const bridgeSeg = (z0: number, z1: number) => {
      const len = z0 - z1;
      b.box({ x: 0, y: 11.0, z: (z0 + z1) / 2, w: 3.2, h: 0.8, d: len, r: 0.35, color: '#fff0f4', top: '#ffffff', mat: m.cloud, surface: 'cloud' });
      for (let z = z0 - 0.6; z > z1; z -= 1.8) {
        for (const sx of [-1.8, 1.8]) b.add(puffGeo(Math.floor(Math.abs(z) % 6)), { x: sx, y: 10.85, z, s: 0.75, sy: 0.55, mat: m.cloud, color: '#fff4f6', top: '#ffffff', ao: 0.3 });
      }
      // rails
      for (const sx of [-1.55, 1.55]) {
        b.add(boxGeo(0.08, 0.08, len), { x: sx, y: 12.2, z: (z0 + z1) / 2, color: '#ffc6da', mat: m.satin });
        for (let z = z0 - 0.5; z > z1; z -= 2) b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 6), { x: sx, y: 11.8, z, color: '#ffc6da', mat: m.satin });
        b.wall(sx + Math.sign(sx) * 0.1, 12, (z0 + z1) / 2, 0.15, 1.6, len, { climbable: false });
      }
    };
    bridgeSeg(bridgeZ0, -52);
    bridgeSeg(-54.8, bridgeZ1);
    for (let z = -42; z > -66; z -= 6) lamp(b, 1.9, 11.4, z, { h: 2.6, bulb: '#ffe6b8' });
    lv.checkpoint(0, 11.4, -41, Math.PI, { objective: 'Deliver the Jar of Morning to the Lighthouse', waypoint: new THREE.Vector3(0, 17.4, -176) });
    lv.trigger(0, 12, -46, 4, 4, 3, () => lv.toast('Hold Shift to sprint — sprint into low things to vault'));
    // floating lanterns over the bridge
    const lanterns: THREE.Mesh[] = [];
    const lg = new THREE.SphereGeometry(0.22, 12, 10);
    for (let i = 0; i < 12; i++) {
      const l = new THREE.Mesh(lg, glowMat(i % 2 ? '#ffd9a0' : '#ffc0dc', 2));
      l.position.set((i % 2 ? -1 : 1) * (2.5 + (i % 3)), 14 + (i % 4) * 0.6, -40 - i * 2.2);
      lv.root.add(l);
      lanterns.push(l);
    }

    // =================== D. Resident street ===================
    cloudIsland(b, 0, -84, 26, 34, 11.4, 21, { belly: 1.3 });
    // paving path
    for (let z = -69; z > -100; z -= 1.3) {
      b.add(roundedGeo(1.1, 0.06, 1.0, 0.04, 1), { x: -0.6, y: 11.43, z, color: '#f6e6ff', shadow: false, ao: 0 });
      b.add(roundedGeo(1.1, 0.06, 1.0, 0.04, 1), { x: 0.6, y: 11.43, z: z - 0.65, color: '#ffe6ee', shadow: false, ao: 0 });
    }
    const hr = createSeededRandom(22);
    const housesL = [-73, -82, -91];
    const housesR = [-72, -81];
    for (const z of housesL) house(b, -8.5, 11.4, z, { ry: Math.PI / 2, w: 5, d: 5, h: 3.4 + hr() * 1.2, wall: WALLS[Math.floor(hr() * WALLS.length)], roof: ROOFS[Math.floor(hr() * ROOFS.length)], lit: hr() > 0.5 });
    for (const z of housesR) house(b, 8.5, 11.4, z, { ry: -Math.PI / 2, w: 5, d: 5, h: 3.4 + hr() * 1.2, wall: WALLS[Math.floor(hr() * WALLS.length)], roof: ROOFS[Math.floor(hr() * ROOFS.length)], lit: hr() > 0.5 });
    // bakery with flat roof (stamp)
    b.box({ x: 8.5, y: 11.4 + 1.6, z: -93, w: 5, h: 3.2, d: 5, r: 0.15, color: '#ffe6c9', surface: 'wood' });
    b.box({ x: 8.5, y: 14.65, z: -93, w: 5.4, h: 0.2, d: 5.4, r: 0.06, color: '#f28fb0', mat: m.satin });
    sign(lv, 'CLOUD BREAD', 5.9, 13.7, -93, 2.4, 0.55, -Math.PI / 2, { bg: '#f28fb0', fg: '#fff6ee' });
    b.box({ x: 5.2, y: 12.0, z: -95.6, w: 1.2, h: 1.2, d: 1.2, r: 0.06, color: '#c99a6b', surface: 'wood' });
    b.box({ x: 5.2, y: 13.2, z: -96.9, w: 1.2, h: 1.2 + 1.2, d: 1.2, r: 0.06, color: '#b9875a', surface: 'wood' });
    lv.stamp('c1-bakery-roof', 8.5, 14.75, -93);
    // shop stall
    b.box({ x: 4.6, y: 11.95, z: -77, w: 2.6, h: 1.1, d: 1.1, r: 0.1, color: '#ffd8a8', surface: 'wood' });
    for (let i = 0; i < 6; i++) b.add(puffGeo(i), { x: 3.7 + i * 0.36, y: 12.62, z: -77, s: 0.17, color: ['#fff6ee', '#ffd9e8', '#e7dcff'][i % 3], mat: m.cloud });
    for (let i = 0; i < 6; i++) b.add(roundedGeo(0.44, 0.1, 2.0, 0.04, 1), { x: 3.55 + i * 0.42, y: 13.5, z: -77.2, rx: 0.25, color: i % 2 ? '#fff6ee' : '#ffb05a', mat: m.satin });
    for (const sx of [3.45, 5.75]) b.box({ x: sx, y: 12.4, z: -77.7, w: 0.1, h: 2, d: 0.1, color: '#fff4ea', collide: false });
    lv.resident({ name: 'Shopkeeper', style: STYLES.shopkeeper, pos: [4.6, 11.4, -78.1], facing: 0, behavior: 'idle', bark: ['Cloud bread! Baked fresh from yesterday!', 'Still warm from last week!'] });
    // kids
    lv.resident({ name: 'Kid', style: STYLES.kid('#9fe3ff', '#5a3a2a'), pos: [-3, 11.4, -86], facing: 0.5, behavior: 'wave', bark: ['Again! Again!', 'Watch me jump the clouds!'] });
    lv.resident({ name: 'Kid ', style: STYLES.kid('#ffd46b', '#2a1a3a'), pos: [-1.6, 11.4, -87.2], facing: -2.2, behavior: 'wander', path: [[-1.6, 11.4, -87.2], [-3.5, 11.4, -88.5], [-4, 11.4, -85], [-1.8, 11.4, -84.5]], speed: 2.4 });
    // the commuter who has been waiting too long
    lv.resident({
      name: 'Commuter', style: STYLES.commuter, pos: [2.5, 11.4, -84], behavior: 'loop', speed: 1.1,
      path: [[2.5, 11.4, -84], [2.5, 11.4, -90], [-2, 11.4, -94], [-2.5, 11.4, -80], [2.5, 11.4, -84]],
      bark: ["It's been four o'clock for a while now.", 'The 4:00 is never late. It just never leaves.'],
    });
    // clock tower
    b.box({ x: 0, y: 11.4 + 4.5, z: -99, w: 3, h: 9, d: 3, r: 0.2, color: '#e6dcff', top: '#fff4ff' });
    b.add(new THREE.ConeGeometry(2.4, 2.6, 4), { x: 0, y: 11.4 + 10.3, z: -99, ry: Math.PI / 4, color: '#8e7cc3', mat: m.satin });
    const clock = new THREE.Mesh(new THREE.CircleGeometry(1.05, 40), glowMat('#fff2d6', 1.4));
    clock.position.set(0, 18.2, -97.48);
    lv.root.add(clock);
    const hand = (len: number, ang: number) => {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.08, len, 0.04), solidMat('#3a2a5c', 0.5));
      h.geometry.translate(0, len / 2, 0);
      h.position.set(0, 18.2, -97.44);
      h.rotation.z = -ang;
      lv.root.add(h);
    };
    hand(0.85, 0);
    hand(0.55, (4 / 12) * Math.PI * 2);
    lv.interact(0, 12.4, -97.2, 'Read the clock', () => lv.say(['Ori', "(Four o'clock. The hands are painted on.)", 'curious']), { radius: 2.6 });
    bench(b, -5, 11.4, -78, Math.PI / 2);
    bench(b, 5, 11.4, -88, -Math.PI / 2);
    for (const [x, z] of [[-5, -70], [5, -70], [-5, -96], [4.5, -96]] as const) lamp(b, x, 11.4, z);
    tree(b, -10.5, 11.4, -77.5, 1.1, { leaf: '#ffc9e0' });
    tree(b, 10.8, 11.4, -76.5, 1.0, { leaf: '#c9e6ff' });
    tree(b, -10.8, 11.4, -86.5, 1.2, { leaf: '#e2d2ff' });
    flowers(b, -5.5, 11.4, -82, 1.6, 6, 50, 23, BLOOMS);
    flowers(b, 5.5, 11.4, -84, 1.6, 6, 50, 24, BLOOMS);
    fence(b, -11.5, -69.5, -11.5, -98, 11.4, '#fff4ea');
    fence(b, 11.5, -69.5, 11.5, -98, 11.4, '#fff4ea');
    lv.checkpoint(0, 11.4, -70, Math.PI, { objective: 'Deliver the Jar of Morning to the Lighthouse', waypoint: new THREE.Vector3(0, 17.4, -176) });
    lv.trigger(0, 12.5, -72, 8, 4, 3, () => lv.say(['Ori', '(Everyone up so early. Or so late?)', 'curious']));

    // =================== E. The Faded Garden ===================
    // short bridge
    b.box({ x: 0, y: 11.0, z: -103.5, w: 3, h: 0.8, d: 5, r: 0.3, color: '#fff0f4', mat: m.cloud, surface: 'cloud' });
    const field = { center: { value: new THREE.Vector3(0, 11.4, -121) }, radius: { value: 0 } };
    const gPaint = fieldMaterial(m.paint, field, 'g-paint');
    const gSatin = fieldMaterial(m.satin, field, 'g-satin');
    const gCloud = fieldMaterial(m.cloud, field, 'g-cloud');
    m.textured.set('g-paint', gPaint);
    m.textured.set('g-satin', gSatin);
    m.textured.set('g-cloud', gCloud);
    b.physics.addBox(0, 10.8, -122, 26, 1.2, 30, { surface: 'cloud' });
    b.add(roundedGeo(26, 0.9, 30, 0.42, 3), { x: 0, y: 10.95, z: -122, mat: gCloud, color: '#f2fff2', top: '#ffffff' });
    cloudCluster(b, 0, 9.4, -122, 26, 30, 26, 31, { scale: 1.6 });
    const gr = createSeededRandom(32);
    // hedges forming garden rooms
    const hedge = (x: number, z: number, w: number, d: number) => b.box({ x, y: 11.4 + 0.6, z, w, h: 1.2, d, r: 0.45, color: '#8fd6a8', top: '#c8f2cf', mat: gSatin });
    hedge(-8, -112, 8, 1.2); hedge(8, -112, 8, 1.2);
    hedge(-11.5, -122, 1.2, 18); hedge(11.5, -122, 1.2, 18);
    hedge(-7, -131, 8, 1.2); hedge(7, -131, 8, 1.2);
    // flower beds
    for (let i = 0; i < 260; i++) {
      const x = (gr() - 0.5) * 22;
      const z = -110 - gr() * 24;
      if (Math.abs(x) < 2.4 && z > -134) continue;
      const h = 0.25 + gr() * 0.45;
      b.add(new THREE.CylinderGeometry(0.02, 0.025, h, 4), { x, y: 11.4 + h / 2, z, color: '#7fc28f', mat: gPaint, shadow: false, ao: 0 });
      b.add(new THREE.IcosahedronGeometry(0.1 + gr() * 0.07, 0), { x, y: 11.4 + h, z, color: BLOOMS[Math.floor(gr() * BLOOMS.length)], mat: gSatin, shadow: false, ao: 0 });
    }
    // garden trees
    for (const [x, z, s] of [[-8, -118, 1.3], [8.5, -124, 1.1], [-8.5, -127, 1.0], [7.5, -116, 0.9]] as const) {
      b.add(new THREE.CylinderGeometry(0.14 * s, 0.24 * s, 2.4 * s, 8), { x, y: 11.4 + 1.2 * s, z, color: '#b98b8b', mat: gPaint });
      for (let k = 0; k < 6; k++) b.add(puffGeo(k), { x: x + (gr() - 0.5) * 1.6 * s, y: 11.4 + (2.6 + gr()) * s, z: z + (gr() - 0.5) * 1.6 * s, s: (0.7 + gr() * 0.5) * s, color: ['#ffb8d6', '#ffd9a0', '#c9b6ff'][k % 3], top: '#ffffff', mat: gCloud });
      b.physics.addBox(x, 12.6, z, 0.5, 2.4, 0.5, { climbable: false });
    }
    // gazebo + fountain
    b.add(new THREE.CylinderGeometry(1.6, 1.8, 0.5, 20), { x: 0, y: 11.65, z: -121, color: '#f2e6ff', mat: gSatin });
    b.physics.addBox(0, 11.65, -121, 3.4, 0.5, 3.4, {});
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      b.add(new THREE.CylinderGeometry(0.1, 0.1, 3, 8), { x: Math.cos(a) * 2.6, y: 11.4 + 1.5, z: -121 + Math.sin(a) * 2.6, color: '#fff4ea', mat: gSatin });
    }
    b.add(new THREE.ConeGeometry(3.4, 1.6, 6), { x: 0, y: 15.2, z: -121, color: '#ff9fc2', mat: gSatin });
    bench(b, -4, 11.4, -126, 0, '#c28f6e');
    const sleeper = lv.resident({ name: 'Gardener', style: { ...STYLES.shopkeeper, top: '#b8e2c0', hat: 'beanie', hatColor: '#8fd6a8' }, pos: [-4, 11.4, -125.8], facing: 0, behavior: 'sit', oblivious: true });
    lv.trigger(0, 12.4, -110, 10, 4, 3, async () => {
      await lv.say(['Ori', "(It's... grey. Dreams aren't supposed to be grey.)", 'worried'], ['Ori', '(Mabel said to hold the parcel up to an anchor.)', 'determined']);
      lv.objective('Wake the garden: Dream Pulse the anchor (Q)', [0, 11.4, -116]);
    });
    // flower steps (appear after restoration)
    const steps: Array<{ mesh: THREE.Mesh; col: ReturnType<typeof b.physics.addBox>; top: number }> = [];
    const stepDefs: Array<[number, number, number, string]> = [[-4, 12.6, -128.5, '#ff9fc2'], [-1.8, 13.8, -132, '#ffd46b'], [1.2, 15.0, -135.2, '#b8a2ff']];
    for (const [x, top, z, c] of stepDefs) {
      const g = new THREE.CylinderGeometry(1.3, 0.5, 0.5, 10);
      const mesh = b.mesh(g, m.satin, { x, y: top - 0.25, z, color: c, top: '#ffffff' });
      // petals
      for (let k = 0; k < 5; k++) {
        const pg = new THREE.SphereGeometry(0.55, 10, 8);
        pg.scale(1, 0.25, 1.6);
        const pm = new THREE.Mesh(pg, solidMat(c, 0.5));
        const a = (k / 5) * Math.PI * 2;
        pm.position.set(Math.cos(a) * 1.1, 0.05, Math.sin(a) * 1.1);
        pm.rotation.y = -a;
        mesh.add(pm);
      }
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 6, 8), solidMat('#8fd6a8', 0.6));
      stem.position.y = -3.2;
      mesh.add(stem);
      mesh.scale.setScalar(0.001);
      const col = b.physics.addBox(x, top - 0.25, z, 2.2, 0.5, 2.2, { surface: 'soft' });
      col.enabled = false;
      steps.push({ mesh, col, top });
    }
    const restoreGarden = (instant: boolean) => {
      if (instant) {
        field.radius.value = 60;
        for (const s of steps) {
          s.mesh.scale.setScalar(1);
          s.col.enabled = true;
        }
        sleeper.def.behavior = 'wave';
        return;
      }
      lv.game.tweens.add(5, (k) => (field.radius.value = k * 60), (t) => t);
      steps.forEach((s, i) => {
        lv.after(1.2 + i * 0.5, () => {
          lv.game.audio.chime(1 + i * 0.25);
          lv.game.vfx.emit(s.mesh.position.clone(), 30, { color: '#ffffff', color2: '#ffd46b', speed: 3, life: 1, size: 0.25 });
          s.col.enabled = true;
          lv.game.tweens.add(0.9, (k) => s.mesh.scale.setScalar(Math.max(0.001, easeOutBack(k))), (t) => t);
        });
      });
    };
    lv.anchor(0, 11.9, -116, '#ffcf7a', 'Garden anchor', async () => {
      lv.flash('#fff2d0', 0.6);
      lv.shake(0.25);
      restoreGarden(false);
      lv.after(2.5, () => (sleeper.def.behavior = 'wave'));
      await lv.wait(2.5);
      await lv.say(
        ['Ori', 'Whoa — it woke up!', 'surprised'],
        ['Mabel', '(over the radio) Did the garden just... come back? Huh. Must have been a slow dream.'],
        ['Ori', 'Mabel, it was completely grey. Like somebody forgot to dream it.', 'worried'],
        ['Mabel', "Dreams get tired too, sweetheart. Don't worry about it. The Lighthouse is just up those flowers."],
      );
      lv.objective('Climb the flower steps to the Lighthouse', [0, 17.4, -176]);
    });

    // =================== F. Terrace + mantle tutorial ===================
    cloudIsland(b, 0, -146, 14, 16, 15.4, 41, { belly: 1.6 });
    flowers(b, -4, 15.4, -146, 4, 8, 50, 42, BLOOMS);
    lamp(b, 4.5, 15.4, -142);
    lv.checkpoint(0, 15.4, -142, Math.PI, {
      objective: 'Climb up to the Lighthouse',
      waypoint: new THREE.Vector3(0, 17.4, -176),
      restore: () => restoreGarden(true),
    });
    lv.trigger(0, 16.5, -149, 10, 4, 3, () => lv.toast('Run and jump into a ledge to climb up'));

    // =================== G. Lighthouse island ===================
    b.physics.addBox(0, 16.4, -170, 22, 2, 32, { surface: 'cloud', climbable: true });
    b.add(roundedGeo(22, 2.4, 32, 0.6, 3), { x: 0, y: 16.2, z: -170, mat: m.cloud, color: '#ffeef4', top: '#ffffff' });
    cloudCluster(b, 0, 14.4, -170, 22, 32, 30, 51, { scale: 1.8 });
    // lighthouse tower
    const LX = 0, LZ = -177;
    for (let i = 0; i < 7; i++) {
      const r0 = 3.0 - i * 0.22, r1 = 3.0 - (i + 1) * 0.22;
      b.add(new THREE.CylinderGeometry(r1, r0, 2, 28), { x: LX, y: 17.4 + i * 2 + 1, z: LZ, color: i % 2 ? '#ff9fb8' : '#fff6f2', mat: m.satin, ao: 0.1 });
    }
    b.physics.addBox(LX, 17.4 + 7, LZ, 5, 14, 5, { climbable: false });
    b.add(new THREE.CylinderGeometry(2.4, 2.4, 0.3, 28), { x: LX, y: 31.55, z: LZ, color: '#8e7cc3', mat: m.satin });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      b.add(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), { x: LX + Math.cos(a) * 2.25, y: 32.1, z: LZ + Math.sin(a) * 2.25, color: '#fff4ea', mat: m.satin });
    }
    b.add(new THREE.CylinderGeometry(1.3, 1.3, 2.0, 16), { x: LX, y: 32.7, z: LZ, color: '#cfe8ff', mat: m.glass });
    b.add(new THREE.ConeGeometry(1.7, 1.6, 16), { x: LX, y: 34.5, z: LZ, color: '#8e7cc3', mat: m.satin });
    const lampCore = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 14), glowMat('#ffe6b0', 2.2));
    lampCore.position.set(LX, 32.7, LZ);
    lv.root.add(lampCore);
    const beamMat = new THREE.MeshBasicMaterial({ color: '#fff0c8', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.ConeGeometry(4, 40, 24, 1, true), beamMat);
    beam.geometry.translate(0, -20, 0);
    beam.geometry.rotateZ(Math.PI / 2);
    beam.position.copy(lampCore.position);
    lv.root.add(beam);
    // little cottage at the base
    house(b, -6, 17.4, -171, { ry: Math.PI / 2, w: 4, d: 4, h: 3, wall: '#fff0e6', roof: '#ff9fb8', lit: true });
    bench(b, 3.5, 17.4, -170, -Math.PI / 2, '#c28f6e');
    flowers(b, 5, 17.4, -165, 3, 3, 30, 52, BLOOMS);
    flowers(b, -3, 17.4, -162, 4, 2, 30, 53, BLOOMS);
    for (const [x, z] of [[-4, -160], [4, -160], [-4, -186], [4, -186]] as const) lamp(b, x, 17.4, z);
    const noor = lv.resident({ name: 'Mrs. Noor', style: STYLES.elder, pos: [3.6, 17.4, -170], facing: -Math.PI / 2, behavior: 'sit', voice: 360 });
    // stamp on a floating puff behind the lighthouse
    cloudIsland(b, -9, -186, 3, 3, 18.8, 55);
    lv.stamp('c1-lighthouse-puff', -9, 18.8, -186);
    // pier
    b.box({ x: 0, y: 17.15, z: -193, w: 2.6, h: 0.5, d: 14, color: '#d9a77a', surface: 'wood', mat: m.tex('wood', Tex.wood('#d9a77a')) });
    for (let z = -187; z > -200; z -= 2) for (const sx of [-1.2, 1.2]) b.add(new THREE.CylinderGeometry(0.1, 0.12, 1.6, 8), { x: sx, y: 17.2, z, color: '#a8785a' });
    for (const sx of [-1.3, 1.3]) b.wall(sx, 18, -193, 0.12, 1.4, 14);
    sign(lv, 'VELVET LINE  ·  SKY-TRAM', 0, 19.6, -199.6, 3.6, 0.7, 0, { bg: '#5a2a52', fg: '#ffe2b0', glow: 1.3, double: true });
    for (const sx of [-1.9, 1.9]) b.box({ x: sx, y: 18.4, z: -199.7, w: 0.14, h: 2.5, d: 0.14, color: '#e8c27a', mat: m.metal, collide: false });
    // the tram (arrives later)
    const tram = new THREE.Group();
    const body = new THREE.Mesh(roundedGeo(5, 2.4, 2.6, 0.6, 3), solidMat('#ff9fb8', 0.45));
    const roof = new THREE.Mesh(roundedGeo(5.2, 0.4, 2.8, 0.18, 2), solidMat('#8e7cc3', 0.4));
    roof.position.y = 1.35;
    const win = new THREE.Mesh(roundedGeo(4.2, 0.9, 2.65, 0.2, 2), glowMat('#ffe2b0', 1.4));
    win.position.y = 0.35;
    tram.add(body, roof, win);
    tram.position.set(60, 18.8, -201.5);
    lv.root.add(tram);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 400, 6), solidMat('#5a4a7a', 0.6));
    cable.rotation.z = Math.PI / 2;
    cable.position.set(0, 21.6, -201.5);
    lv.root.add(cable);

    let delivered = false;
    lv.interact(3.6, 18.2, -170, () => (delivered ? 'Talk to Mrs. Noor' : 'Deliver the Jar of Morning'), async () => {
      noor.talking = true;
      if (!delivered) {
        delivered = true;
        lv.cine([7.5, 20, -166], [3, 18.3, -171], 45);
        await lv.say(
          ['Mrs. Noor', "Oh! A courier. I haven't had a delivery in... well. What day is it?"],
          ['Ori', 'A Jar of Morning, ma\'am. Sealed and stamped.', 'happy'],
          ['Mrs. Noor', '...Oh.'],
          ['Mrs. Noor', "It's open, dear. Look — the seal was already broken."],
          ['Ori', 'What? No — it was sealed when Mabel gave it to me.', 'surprised'],
          ['Mrs. Noor', "And the morning inside... I've had this one before. The yellow kitchen, the kettle singing. Every morning lately is that one."],
          ['Mrs. Noor', "Never mind. It's still lovely. Here, for your trouble — a ticket for the Velvet Line. The trams are never late, you know. Only early, for some other day."],
          ['Ori', '(Every morning... the same one?)', 'worried'],
        );
        lv.parcel(null);
        lampCore.scale.setScalar(1.6);
        lv.game.audio.chime(0.8);
        await lv.wait(0.6);
        await lv.say(
          ['Mabel', "(radio) Ori? New job. Something at the Velvet Station is asking for you. By name."],
          ['Ori', 'By name? Who even knows my name?', 'curious'],
          ['Mabel', "Take the sky-tram at the end of the pier. And Ori — keep the ticket close."],
        );
        lv.cineEnd();
        lv.objective('Take the sky-tram at the end of the pier', [0, 17.4, -199]);
        lv.game.setParcel('#c9a2ff');
      } else {
        await lv.say(['Mrs. Noor', 'Mind the trams, dear. They remember everyone.']);
      }
      noor.talking = false;
    }, { radius: 3 });
    lv.trigger(0, 18.4, -165, 14, 4, 4, () => lv.objective('Deliver the Jar of Morning to Mrs. Noor', [3.6, 17.4, -170]));
    lv.checkpoint(0, 17.4, -158, Math.PI, { objective: 'Deliver the Jar of Morning to Mrs. Noor', waypoint: new THREE.Vector3(3.6, 17.4, -170), restore: () => restoreGarden(true) });
    const endT = lv.trigger(0, 18.4, -197, 3, 4, 3, async () => {
      lv.lock(true);
      lv.game.audio.train();
      lv.game.tweens.add(3.2, (k) => tram.position.setX(60 * (1 - k)), (t) => 1 - Math.pow(1 - t, 3));
      lv.cine([6, 21, -192], [0, 19, -200], 50);
      await lv.wait(3.4);
      await lv.say(['Ori', '(Here we go. Velvet Station.)', 'determined']);
      lv.complete();
    });
    endT.enabled = false;
    lv.onUpdate(() => {
      endT.enabled = delivered;
    });

    // Mabel chat after intro
    lv.interact(4, 11.2, -0.6, 'Talk to Mabel', async () => {
      mabel.talking = true;
      await lv.say(['Mabel', 'Follow the lamps, cross the bridge, and the Lighthouse is past the garden. Easy as a nap.']);
      mabel.talking = false;
    }, { radius: 2.8 });

    // =================== Extended + distant layers ===================
    const pal = { wall: WALLS, roof: ROOFS };
    floatingDistrict(b, -42, 4, -62, 1.2, 101, pal);
    floatingDistrict(b, 46, 14, -110, 1.0, 102, pal);
    floatingDistrict(b, -55, 22, -150, 1.4, 103, pal);
    floatingDistrict(b, 40, 2, -20, 1.1, 104, pal);
    floatingDistrict(b, 62, 26, -195, 1.3, 105, pal);
    floatingDistrict(b, -36, 32, -235, 1.5, 106, pal);
    floatingDistrict(b, -70, -4, 10, 1.6, 107, pal);
    floatingDistrict(b, 90, 18, -60, 1.8, 108, pal);
    floatingDistrict(b, -95, 40, -120, 2.0, 109, pal);
    // near islands with houses (extended layer, unreachable but close)
    cloudIsland(b, -24, -84, 12, 14, 9, 120, { layer: 'near' });
    house(b, -24, 9, -84, { w: 4, d: 4, h: 3, wall: '#d9ecff', roof: '#f28fb0', layer: 'near', lit: true });
    cloudIsland(b, 26, -128, 10, 12, 13, 121, { layer: 'near' });
    house(b, 26, 13, -128, { w: 4.5, d: 4, h: 4, wall: '#ffe6c9', roof: '#7aa6e0', layer: 'near' });
    tree(b, 23, 13, -124, 1.2, { layer: 'near' });
    cloudIsland(b, 22, -40, 9, 9, 8, 122, { layer: 'near' });
    tree(b, 22, 8, -40, 1.4, { layer: 'near', leaf: '#c9b6ff' });
    skylineRing(b, 0, -100, 280, 30, 200, { y: -30, hMin: 40, hMax: 120, color: '#f3c7e0', top: '#fff0f8', windows: '#ffe3b0', lit: 0.25 });
    skylineRing(b, 0, -100, 180, 16, 201, { y: -10, hMin: 25, hMax: 60, color: '#e2d2ff', top: '#fff4ff', windows: '#ffe3b0', lit: 0.3, arc: [Math.PI * 0.9, Math.PI * 2.1] });
    cloudHorizon(lv, 0, -100, { radius: 420, count: 300, y: -10, ySpread: 60, size: 90, lit: '#fff6f2', shade: '#d9c2ec' });
    cloudField(lv, -220, 220, -320, 120, -8, { count: 220, size: 26, ySpread: 8, lit: '#fff8f4', shade: '#d2bfe8', seed: 5 });
    skyOrb(lv, -260, 210, -620, 70, '#f4e6ff', true);
    skyOrb(lv, 380, 120, -520, 24, '#ffe8f2');
    // cloud highway: a glowing ribbon road in the sky with tram-lights gliding along
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-260, 52, 60), new THREE.Vector3(-90, 46, -40), new THREE.Vector3(30, 44, -120), new THREE.Vector3(140, 50, -230), new THREE.Vector3(300, 60, -320),
    ]);
    const road = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 1.4, 8, false), solidMat('#fff0f6', 0.6, { emissive: '#ffd6ea', emissiveIntensity: 0.25 }));
    road.scale.y = 0.35;
    road.position.y = 30;
    lv.root.add(road);
    const travellers: THREE.Mesh[] = [];
    for (let i = 0; i < 14; i++) {
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), glowMat(i % 3 ? '#ffe2b0' : '#ffb8dc', 2));
      t.userData.u = i / 14;
      lv.root.add(t);
      travellers.push(t);
    }
    const balloons = [balloon(lv, -18, 24, -60, '#ffb8d6'), balloon(lv, 22, 28, -95, '#c9b6ff', 1.2), balloon(lv, -26, 30, -150, '#ffe2b0'), balloon(lv, 18, 34, -30, '#9fe3ff', 0.9)];

    lv.onUpdate((dt, t) => {
      for (const l of lanterns) l.position.y += Math.sin(t * 1.3 + l.position.z) * 0.004;
      balloons.forEach((bb, i) => {
        bb.position.y += Math.sin(t * 0.4 + i) * 0.01;
        bb.position.x += Math.sin(t * 0.05 + i * 2) * 0.01;
      });
      for (const tr of travellers) {
        tr.userData.u = (tr.userData.u + dt * 0.012) % 1;
        const p = curve.getPointAt(tr.userData.u);
        tr.position.set(p.x, p.y * 0.35 + 30 + 0.8, p.z);
      }
      beam.rotation.y = t * 0.6;
    });

    // =================== Intro ===================
    lv.intro = async () => {
      lv.lock(true);
      mabel.talking = true;
      lv.cine([1.5, 12.2, 3.2], [3.8, 11.4, -1.6], 46);
      await lv.wait(1.2);
      await lv.say(
        ['Mabel', "Ori! There you are. Good morning — well, it's always morning up here."],
        ['Ori', "Morning, Mabel! What've you got for me?", 'happy'],
        ['Mabel', 'Just the one today. A Jar of Morning, for Mrs. Noor at the Lighthouse.'],
        ['Mabel', "Sealed, stamped and sleepy. Hop the clouds, follow the lamps across the bridge, and you can't miss it."],
        ['Ori', "(It's warm. Like holding a sunrise in a jar.)", 'curious'],
        ['Mabel', "Oh — and if anything looks a little grey on the way, hold the parcel up to a dream anchor and give it a Pulse."],
        ['Ori', 'A little grey? Since when do dreams go grey?', 'curious'],
        ['Mabel', "Since never, dear. Off you go."],
      );
      mabel.talking = false;
      lv.cineEnd();
      lv.lock(false);
      lv.objective('Deliver the Jar of Morning to the Lighthouse', [0, 17.4, -176]);
      lv.toast('WASD to move · Mouse to look · Space to jump');
    };
  },
};
