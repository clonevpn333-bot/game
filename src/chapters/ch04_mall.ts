import * as THREE from 'three';
import type { ChapterDef } from '../game/types';
import type { Level } from '../game/Level';
import { look } from '../render/Atmosphere';
import { Tex } from '../render/Textures';
import { boxGeo, puffGeo, roundedGeo } from '../world/Geo';
import { bench, repeatingRooms } from '../world/Kit';
import { pillar, shell } from '../world/Interior';
import { audio, cloudHorizon, sign, solidMat, STYLES } from './common';
import { createSeededRandom } from '../core/rng';
import type { StaticFigure } from '../entities/Actors';

const LOOK = look({
  sky: { top: '#6fa8b8', mid: '#e8d2c0', sun: '#ffe2c4', sunSize: 1.8, cloudLit: '#fff4ea', cloudShade: '#a8c0c8', cloudCover: 0.42, seaLit: '#f2ece2', seaShade: '#a8bcc0' },
  fog: { color: '#d6dcd2', sun: '#f6e6cc', low: '#a8b8b8', density: 0.0032, base: 0, falloff: 0.01, heightMix: 0.1, max: 0.85 },
  sunDir: [0.2, 0.8, -0.4],
  sunColor: '#fff2dc',
  sunIntensity: 1.6,
  hemiSky: '#e6f2f0',
  hemiGround: '#f2d8c8',
  hemiIntensity: 0.72,
  rimColor: '#e8fff6',
  rimStrength: 0.22,
  envIntensity: 0.55,
  dread: 0.4,
  post: { bloom: 0.7, bloomThreshold: 0.84, warp: 0.65, edgeBlur: 0.8, desat: 0.12, grain: 0.1, vignette: 0.45, lift: 0.12, shadowTint: '#c8e0e0', highlightTint: '#fff0e2', contrast: 1.05, exposure: 1, glitch: 0 },
  motes: { kind: 'dust', color: '#fff6e8', density: 0.6 },
});

const DARK = look({
  ...LOOK,
  sky: { ...LOOK.sky, top: '#1a2a30', mid: '#3a3a40', sun: '#000000', cloudLit: '#4a5058', cloudShade: '#20262c', ceiling: 0.6 },
  fog: { color: '#2a2628', sun: '#3a2a2a', low: '#141418', density: 0.03, base: 0, falloff: 0.01, heightMix: 0.1, max: 0.95 },
  sunIntensity: 0.15,
  hemiSky: '#6a4a4a',
  hemiGround: '#1a1418',
  hemiIntensity: 0.55,
  rimColor: '#ff8a7a',
  rimStrength: 0.2,
  envIntensity: 0.2,
  dread: 0.6,
  post: { ...LOOK.post, desat: 0.35, grain: 0.16, vignette: 0.65, lift: 0.05, shadowTint: '#c89a9a', highlightTint: '#ffd6c8', bloom: 1.1 },
  motes: { kind: 'dust', color: '#ffb8a8', density: 0.4 },
});

const STORES = ['MEMORY LANE', 'SOFT GOODS', "YESTERDAY'S", 'SLEEPWEAR', 'CANDLE & CLOUD', 'THE LAST VIDEO STORE', 'LOST TIME', 'WAITING ROOM', 'AQUARIUM', 'FOOD COURT', 'MANNEQUIN & CO.', 'ALMOST HOME', 'GIFTS FOR NOBODY', 'NIGHT OWL'];

export const ch04: ChapterDef = {
  id: 3,
  key: 'quiet-mall',
  title: 'The Quiet Mall',
  subtitle: 'Store closes at never.',
  uiDread: 1,
  oriDread: 0.42,
  parcelColor: '#7affd0',
  look: LOOK,
  audio: audio({
    chords: [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]],
    chordDur: 6,
    padGain: 0.35,
    bellGain: 0.3,
    arpEvery: 0,
    wobble: 0.1,
    pitch: 0.98,
    reverb: 0.95,
    muzak: 1,
    hum: 0.25,
    room: 0.5,
  }),
  build(lv: Level) {
    const b = lv.b;
    const m = lv.mats;
    lv.killY = -12;
    const tile = m.tex('mallTile', Tex.mallTile('#f2e8dc', '#d8e6e2'), { roughness: 0.12 });
    const wallT = Tex.carpet('#f2d8c4', 'mallWall').clone();
    wallT.repeat.set(1 / 6, 1 / 6);
    const wallM = m.tex('mallWall', wallT, { roughness: 0.9 });
    const rnd = createSeededRandom(44);
    const F1 = 7, F2 = 14, TOP = 24;
    const X0 = -32, X1 = 32, Z0 = -102, Z1 = 8;

    // =================== shell + floors ===================
    shell(b, X0, Z0, X1, Z1, 0, TOP, { floorMat: tile, wallMat: wallM, wallColor: '#ffffff', noCeiling: true, surface: 'tile', baseboard: '#c8b8a8', openings: [{ side: 'n', from: -26, to: -18, h: 0 }, { side: 'n', from: -12, to: 12, h: 0 }] });
    // wall under/over the service corridor opening
    b.box({ x: -22, y: F2 / 2, z: Z0 - 0.2, w: 8, h: F2, d: 0.4, mat: wallM, color: '#ffffff', climbable: false });
    b.box({ x: -22, y: (F2 + 4 + TOP) / 2, z: Z0 - 0.2, w: 8, h: TOP - F2 - 4, d: 0.4, mat: wallM, color: '#ffffff', climbable: false });
    // north window wall: sill + glass, frames
    b.box({ x: 0, y: 0.6, z: Z0 - 0.2, w: 24, h: 1.2, d: 0.4, color: '#f6efe6' });
    b.add(boxGeo(24, TOP - 1.2, 0.08), { x: 0, y: 1.2 + (TOP - 1.2) / 2, z: Z0 - 0.2, color: '#d8f0ec', mat: m.glass, shadow: false, ao: 0 });
    b.wall(0, TOP / 2, Z0 - 0.2, 24, TOP, 0.3);
    for (const x of [-12, -6, 0, 6, 12]) b.add(boxGeo(0.3, TOP, 0.3), { x, y: TOP / 2, z: Z0 - 0.15, color: '#f6efe6' });
    // galleries
    const slab = (x0: number, x1: number, z0: number, z1: number, y: number) => {
      b.box({ x: (x0 + x1) / 2, y: y - 0.35, z: (z0 + z1) / 2, w: x1 - x0, h: 0.7, d: z1 - z0, mat: tile, color: '#ffffff', surface: 'tile' });
      b.add(boxGeo(x1 - x0, 0.6, z1 - z0), { x: (x0 + x1) / 2, y: y - 1.0, z: (z0 + z1) / 2, color: '#e8dcd0', shadow: false });
    };
    slab(12, X1, Z0, Z1, F1);
    slab(X0, -12, Z0, Z1, F1);
    slab(-12, 12, Z0, -92, F1);
    slab(X0, -12, Z0, Z1, F2);
    // ceilings over galleries
    b.box({ x: 22, y: F2 + 0.2, z: (Z0 + Z1) / 2, w: 20, h: 0.4, d: Z1 - Z0, color: '#f6efe6', collide: true, climbable: false });
    b.box({ x: -22, y: TOP - 2.8, z: (Z0 + Z1) / 2, w: 20, h: 0.4, d: Z1 - Z0, color: '#f6efe6', collide: true, climbable: false });
    // glass balustrades
    const rail = (x: number, y: number, z0: number, z1: number) => {
      b.add(boxGeo(0.06, 1.0, z1 - z0), { x, y: y + 0.5, z: (z0 + z1) / 2, color: '#d8f0ec', mat: m.glass, shadow: false });
      b.add(boxGeo(0.12, 0.08, z1 - z0), { x, y: y + 1.05, z: (z0 + z1) / 2, color: '#c8b8a0', mat: m.metal, shadow: false });
      b.wall(x, y + 0.6, (z0 + z1) / 2, 0.2, 1.2, z1 - z0);
    };
    rail(12.1, F1, -38, Z1);
    rail(12.1, F1, -92, -40.5);
    rail(-12.1, F1, -92, Z1);
    // F2 west rail with a gap where the hidden walkway lands
    rail(-12.1, F2, -54.5, Z1);
    rail(-12.1, F2, Z0, -59.5);
    // skylight
    const sky = new THREE.CylinderGeometry(14, 14, Z1 - Z0, 24, 1, true, -Math.PI / 2, Math.PI);
    sky.rotateX(Math.PI / 2);
    b.add(sky, { x: 0, y: TOP - 2, z: (Z0 + Z1) / 2, sy: 0.4, color: '#d8f0f0', mat: m.glass, shadow: false, ao: 0 });
    for (let z = Z1; z >= Z0; z -= 5) b.add(new THREE.TorusGeometry(14, 0.12, 6, 32, Math.PI), { x: 0, y: TOP - 2, z, sy: 0.4, color: '#f6efe6', mat: m.satin, shadow: false });
    b.box({ x: 0, y: TOP - 2.6, z: (Z0 + Z1) / 2, w: 28, h: 0.4, d: 1, color: '#f6efe6', collide: false });
    // pillars
    for (const x of [-12.5, 12.5]) for (let z = 0; z >= -96; z -= 16) pillar(b, x, 0, z, TOP - 2.6, { r: 0.6, color: '#f6efe6', collide: false });

    // =================== storefronts ===================
    let si = 0;
    const store = (side: 1 | -1, y: number, z: number, name: string, lit: boolean, open = false) => {
      const xw = side * (X1 - 0.3);
      const fx = side * 26;
      // store interior (extended layer): shelves seen through glass
      b.box({ x: side * 29, y: y + 0.02, z, w: 6, h: 0.04, d: 9, color: lit ? '#f2e6d2' : '#8a8a8a', collide: false, ao: 0 });
      for (let k = 0; k < 3; k++) b.box({ x: side * (28 + (k % 2)), y: y + 0.9, z: z - 3 + k * 3, w: 0.8, h: 1.8, d: 2, color: lit ? '#d8c8b8' : '#6a6a70', collide: false });
      // front
      if (!open) {
        b.add(boxGeo(0.08, 3.2, 8.6), { x: fx, y: y + 1.8, z, color: lit ? '#e8fff8' : '#9aa8a8', mat: m.glass, shadow: false });
        b.wall(fx, y + 1.8, z, 0.3, 3.6, 9);
      } else {
        b.wall(fx, y + 1.8, z - 3.4, 0.3, 3.6, 2.2);
        b.wall(fx, y + 1.8, z + 3.4, 0.3, 3.6, 2.2);
        b.box({ x: side * 29, y: y + 0.5, z: z + 1, w: 2.6, h: 1, d: 1.2, color: '#5a4a6a', surface: 'wood' });
      }
      b.box({ x: fx, y: y + 3.9, z, w: 0.6, h: 0.8, d: 9, color: '#f6efe6', collide: false });
      sign(lv, name, fx - side * 0.32, y + 3.9, z, 6, 0.62, side > 0 ? -Math.PI / 2 : Math.PI / 2, { bg: lit ? '#2a5a5a' : '#4a4a50', fg: lit ? '#e6fff6' : '#a8a8a8', glow: lit ? 1.35 : 0.9 });
      // dividers
      b.box({ x: side * 29, y: y + 2.2, z: z - 4.7, w: 6, h: 4.4, d: 0.4, color: '#f2e6da' });
      if (lit) b.add(boxGeo(3, 0.06, 6), { x: side * 29, y: y + 3.4, z, color: '#fff4e0', mat: m.glow, shadow: false, ao: 0 });
      void xw;
      si++;
    };
    for (let z = 0; z >= -90; z -= 10) {
      store(1, 0, z, STORES[si % STORES.length], rnd() > 0.35, si === 5);
      store(-1, 0, z, STORES[si % STORES.length], rnd() > 0.35);
      store(1, F1, z, STORES[si % STORES.length], rnd() > 0.5);
      store(-1, F1, z, STORES[si % STORES.length], rnd() > 0.5);
      store(-1, F2, z, STORES[si % STORES.length], rnd() > 0.6);
    }
    lv.stamp('c4-video-store', 29, 1, -50);

    // =================== ground floor ===================
    lv.setStart(0, 0, 4, Math.PI);
    // fountain (still water)
    b.add(new THREE.CylinderGeometry(6, 6.4, 0.9, 40), { x: 0, y: 0.45, z: -40, color: '#e8dcd0', mat: m.satin });
    b.physics.addBox(0, 0.45, -40, 12, 0.9, 12, { climbable: true });
    const water = new THREE.Mesh(new THREE.CircleGeometry(5.6, 40), m.water);
    water.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(water.geometry.getAttribute('position').count * 3).fill(0.7), 3));
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, 0.82, -40);
    lv.root.add(water);
    b.add(new THREE.CylinderGeometry(0.4, 0.6, 3, 12), { x: 0, y: 1.5, z: -40, color: '#e8dcd0', mat: m.satin });
    b.add(new THREE.CylinderGeometry(1.6, 0.6, 0.4, 20), { x: 0, y: 3.1, z: -40, color: '#e8dcd0', mat: m.satin });
    // palms in planters
    const palm = (x: number, y: number, z: number) => {
      b.box({ x, y: y + 0.5, z, w: 2, h: 1, d: 2, r: 0.1, color: '#c8b8a8' });
      b.add(new THREE.CylinderGeometry(0.15, 0.25, 4, 8), { x, y: y + 3, z, color: '#a8806a' });
      for (let k = 0; k < 7; k++) {
        const leaf = new THREE.SphereGeometry(1.4, 8, 4);
        leaf.scale(1, 0.12, 0.35);
        leaf.translate(1.2, 0, 0);
        b.add(leaf, { x, y: y + 5, z, ry: (k / 7) * Math.PI * 2, rz: -0.35, color: '#7ab89a', mat: m.satin, shadow: false });
      }
    };
    for (const [x, z] of [[-8, -12], [8, -12], [-8, -70], [8, -70]] as const) palm(x, 0, z);
    for (const z of [-25, -55]) {
      bench(b, -6, 0, z, Math.PI / 2, '#c8a88a');
      bench(b, 6, 0, z, -Math.PI / 2, '#c8a88a');
    }
    // directory kiosk (stamp on top)
    b.box({ x: -6, y: 1.4, z: -6, w: 1.8, h: 2.8, d: 0.8, r: 0.1, color: '#2a5a5a' });
    sign(lv, 'YOU ARE HERE ★', -6, 1.8, -5.58, 1.5, 1.6, 0, { bg: '#e6fff6', fg: '#2a5a5a', glow: 1.1 });
    b.box({ x: -6, y: 0.6, z: -4.6, w: 1.2, h: 1.2, d: 1.2, r: 0.1, color: '#c8b8a8' });
    lv.stamp('c4-directory', -6, 2.8, -6);
    lv.interact(-6, 1.4, -5.2, 'Read the directory', () => lv.say(['Ori', '(“You are here.” There are six stars. They are all here.)', 'worried']), { radius: 2.2 });
    // food court (north, F0)
    for (let i = 0; i < 12; i++) {
      const x = -9 + (i % 4) * 6, z = -80 - Math.floor(i / 4) * 6;
      b.add(new THREE.CylinderGeometry(1, 1, 0.08, 20), { x, y: 1.05, z, color: '#fff6ee', mat: m.satin });
      b.add(new THREE.CylinderGeometry(0.08, 0.1, 1.05, 8), { x, y: 0.52, z, color: '#c8b8a8', mat: m.metal });
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2 + i;
        b.add(new THREE.CylinderGeometry(0.35, 0.35, 0.08, 12), { x: x + Math.cos(a) * 1.5, y: 0.6, z: z + Math.sin(a) * 1.5, color: ['#ff9fb2', '#7ab0a0', '#ffd46b'][k], mat: m.satin });
      }
      b.physics.addBox(x, 0.55, z, 2, 1.1, 2, { climbable: true });
    }
    const janitor = lv.resident({
      name: 'Janitor', style: { ...STYLES.worker('#7ab0a0'), hat: 'none' }, pos: [3, 0, -24], behavior: 'sweep', voice: 260,
      bark: ['Store closes at never.', 'Almost done. Almost done. Almost done.'],
    });
    lv.interact(3, 1, -24, 'Talk to the janitor', async () => {
      janitor.talking = true;
      await lv.say(
        ['Janitor', "Evening. Or morning. The skylight hasn't decided."],
        ['Ori', "Do you know where Customer Service is? I have a delivery — it says 'Lost Children'.", 'curious'],
        ['Janitor', "Top floor, far end. Escalator's out of order, though. Has been since the music started."],
        ['Ori', 'When did the music start?', 'curious'],
        ['Janitor', "It didn't start. It just never stopped. Almost done here. Almost done."],
      );
      janitor.talking = false;
    }, { radius: 2.4 });
    // escalator F0 → F1 (east)
    const escalator = (x: number, y0: number, y1: number, zStart: number, len: number) => {
      b.ramp(x, zStart - len / 2, 3, len, y0, y1, 'z', -1, { color: '#b8b0a8', mat: m.metal, surface: 'metal' });
      const steps = Math.round(len / 0.5);
      for (let i = 0; i < steps; i++) {
        const k = i / steps;
        b.add(boxGeo(2.8, 0.05, 0.08), { x, y: y0 + (y1 - y0) * k + 0.03, z: zStart - len * k, color: '#e8c27a', mat: m.metal, shadow: false });
      }
      for (const s of [-1.6, 1.6]) {
        const L = Math.hypot(len, y1 - y0);
        const ang = Math.atan2(y1 - y0, len);
        b.add(boxGeo(0.08, 1.0, L), { x: x + s, y: (y0 + y1) / 2 + 0.5, z: zStart - len / 2, rx: ang, color: '#d8f0ec', mat: m.glass, shadow: false });
        b.add(boxGeo(0.14, 0.1, L), { x: x + s, y: (y0 + y1) / 2 + 1.05, z: zStart - len / 2, rx: ang, color: '#222226', shadow: false });
        b.wall(x + s, (y0 + y1) / 2 + 0.6, zStart - len / 2, 0.2, Math.abs(y1 - y0) + 2, len);
      }
    };
    escalator(10, 0, F1, -24, 14);
    b.box({ x: 10.25, y: F1 - 0.35, z: -39.25, w: 3.5, h: 0.7, d: 2.5, mat: tile, color: '#ffffff', surface: 'tile' });
    // broken escalator F1 → F2 (west)
    escalator(-16, F1, F2 - 2.5, -24, 10);
    b.wall(-16, F1 + 1, -23, 3.2, 2, 0.4);
    sign(lv, 'OUT OF ORDER', -16, F1 + 1.3, -22.7, 2.4, 0.5, 0, { bg: '#ffd46b', fg: '#3a2a2a', glow: 1 });
    lv.checkpoint(15, F1, -40, Math.PI, { objective: 'Find a way to the top floor', waypoint: new THREE.Vector3(14, F1, -46) });

    // =================== hidden walkways (lens parcel) ===================
    const hidden: Array<{ mesh: THREE.Mesh; col: ReturnType<typeof b.physics.addBox> }> = [];
    const hiddenMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 2.2, 1.7), transparent: true, opacity: 0, toneMapped: false, depthWrite: false });
    const panelDefs: Array<[number, number, number]> = [[6.5, F1 + 0.9, -44], [3, F1 + 1.9, -47], [-0.5, F1 + 2.9, -50], [-4, F1 + 3.9, -53], [-7.5, F1 + 4.9, -56], [-10, F1 + 5.9, -57.5], [5.5, F1 + 2.4, -50.5]];
    for (const [x, top, z] of panelDefs) {
      const mesh = new THREE.Mesh(roundedGeo(2.6, 0.18, 2.6, 0.05, 2), hiddenMat);
      mesh.position.set(x, top - 0.09, z);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.6, 0.18, 2.6)), new THREE.LineBasicMaterial({ color: new THREE.Color(0.8, 3, 2.4), transparent: true, opacity: 0, toneMapped: false }));
      mesh.add(edges);
      lv.root.add(mesh);
      const col = b.physics.addBox(x, top - 0.09, z, 2.6, 0.18, 2.6, { surface: 'metal', noCamera: true });
      col.enabled = false;
      hidden.push({ mesh, col });
    }
    lv.stamp('c4-hidden-panel', 5.5, F1 + 2.4, -50.5);
    let lensUnlocked = false;
    let reveal = 0;
    lv.onPulse(() => {
      if (lensUnlocked) reveal = 7;
    });
    lv.anchor(14.5, F1, -46, '#7affd0', 'Lens anchor', async () => {
      lensUnlocked = true;
      reveal = 7;
      await lv.say(
        ['Ori', '(There are walkways in the air. Glass, or... something that wants to be glass.)', 'surprised'],
        ['Ori', "(They're fading. Pulse again to keep them visible.)", 'determined'],
      );
      lv.objective('Cross the atrium on the hidden walkways — Pulse (Q) to keep them visible', [-12, F2, -57]);
    });

    // =================== top floor: mannequins + customer service ===================
    const statics: StaticFigure[] = [];
    const staticDefs: Array<[number, number, number]> = [[-20, F2, -68], [-26, F2, -76], [-18, F2, -84], [-24, F2, -42], [-20, F2, -34]];
    for (const [x, y, z] of staticDefs) {
      const s = lv.staticFigure(x, y, z, z < -57 ? 0 : Math.PI);
      s.catchRange = 0.9;
      statics.push(s);
    }
    lv.checkpoint(-16, F2, -57, -Math.PI / 2, { objective: 'Reach Customer Service at the far end — keep your eyes on them', waypoint: new THREE.Vector3(-22, F2, -92), restore: () => { lensUnlocked = true; lv.parcel('#7affd0'); } });
    lv.trigger(-16, F2 + 1, -57, 4, 4, 5, () => void lv.say(['Ori', '(Mannequins. They were facing the other way a second ago.)', 'scared']).then(() => lv.objective('Reach Customer Service — keep your eyes on the mannequins', [-22, F2, -92])));
    // desk
    b.box({ x: -22, y: F2 + 0.6, z: -92, w: 6, h: 1.2, d: 1.6, r: 0.1, color: '#2a5a5a', surface: 'wood' });
    sign(lv, 'CUSTOMER SERVICE · LOST CHILDREN', -22, F2 + 3.6, -96.8, 7, 0.7, 0, { bg: '#2a5a5a', fg: '#e6fff6', glow: 1.3 });
    const bellM = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), solidMat('#e8c27a', 0.2, { metalness: 0.9 }));
    bellM.position.set(-21, F2 + 1.2, -91.6);
    lv.root.add(bellM);
    // service corridor (behind the desk)
    const serviceDoor = b.mesh(roundedGeo(3.4, 3.6, 0.2, 0.05, 2), m.metal, { x: -22, y: F2 + 1.8, z: -101.8, color: '#8a9a9a' });
    const serviceCol = b.physics.addBox(-22, F2 + 2, -102, 8, 4, 0.6, { climbable: false });
    shell(b, -26, -200, -18, -102, F2, 3.6, { wallColor: '#c8ccc4', floorColor: '#9a9a96', ceilColor: '#d8d8d0', surface: 'stone', openings: [{ side: 's', from: -26, to: -18 }], lights: { spacing: 8, color: '#ffeedd', w: 0.3, d: 1.6 } });
    for (let z = -110; z > -196; z -= 9) {
      b.box({ x: -25, y: F2 + 0.6, z, w: 1.2, h: 1.2, d: 1.2, r: 0.05, color: '#b98a58', surface: 'wood' });
      b.add(new THREE.CylinderGeometry(0.15, 0.15, 8, 8), { x: -25.5, y: F2 + 3, z: z - 4, rx: Math.PI / 2, color: '#7a8a8a', mat: m.metal });
    }
    const exitT = lv.trigger(-22, F2 + 1, -197, 8, 4, 3, async () => {
      lv.lock(true);
      lv.game.audio.door();
      lv.flash('#ffd8b0', 0.9);
      await lv.wait(0.6);
      lv.complete();
    });
    exitT.enabled = false;
    let rang = false;
    const ring = async (instant: boolean) => {
      rang = true;
      serviceCol.enabled = false;
      serviceDoor.position.y = F2 + 5.5;
      exitT.enabled = true;
      lv.setLook(DARK, instant ? 0.01 : 2.5);
      // more mannequins wake up behind you
      for (const st of statics) st.speedUnseen = 7.8;
      if (!instant) {
        lv.game.audio.stinger('static');
        lv.glitch(1);
        lv.shake(0.4);
      }
      lv.chase = 1;
      lv.objective('RUN — into the service corridor', [-22, F2, -190]);
    };
    const extra = [lv.staticFigure(-14, F2, -70, Math.PI), lv.staticFigure(-28, F2, -60, Math.PI), lv.staticFigure(-16, F2, -48, Math.PI)];
    for (const e of extra) e.dormant = true;
    lv.interact(-21, F2 + 1.3, -91, 'Ring the bell', async () => {
      lv.game.audio.chime(2);
      await lv.wait(0.8);
      await lv.say(
        ['Ori', 'Hello? I have a delivery for... Lost Children?', 'worried'],
        ['Voice', '(PA) Attention shoppers. Ori, please come to the service corridor.'],
        ['Voice', '(PA) Ori. Ori. Ori. Ori. Ori.'],
        ['Ori', 'How does it know my name—', 'scared'],
      );
      for (const e of extra) e.dormant = false;
      await ring(false);
    }, { radius: 2.4, once: true, enabled: () => !rang });
    lv.checkpoint(-22, F2, -88, Math.PI, {
      objective: 'Ring the bell at Customer Service',
      waypoint: new THREE.Vector3(-21, F2, -91.5),
      restore: () => { lensUnlocked = true; lv.parcel('#7affd0'); },
    });
    lv.onRespawn(() => {
      if (rang) {
        for (const e of extra) e.dormant = false;
        lv.chase = 1;
      } else for (const e of extra) e.dormant = true;
    });

    // =================== extended + distant ===================
    // through the north glass: another mall, and another
    b.box({ x: 0, y: 10, z: -102.2, w: 28, h: 20, d: 0.2, color: '#d8f0ec', mat: m.glass, collide: false });
    repeatingRooms(b, -60, -140, 6, 6, 24, 22, 0, '#e8dcd0');
    for (let i = 0; i < 5; i++) {
      const z = -140 - i * 46;
      b.box({ x: 0, y: 12, z, w: 26, h: 0.6, d: 30, color: '#f2e6da', layer: 'far', collide: false });
      b.box({ x: 0, y: 5, z, w: 26, h: 0.6, d: 30, color: '#f2e6da', layer: 'far', collide: false });
      for (const x of [-13, 13]) for (let k = 0; k < 4; k++) b.add(boxGeo(1, 24, 1), { x, y: 12, z: z - 12 + k * 8, color: '#f6efe6', layer: 'far' });
      for (const x of [-18, 18]) b.add(boxGeo(6, 3, 26), { x, y: 13.6, z, color: '#2a5a5a', layer: 'far', mat: m.softGlow });
    }
    // parking garage in the clouds (south, through entrance)
    for (let i = 0; i < 6; i++) b.box({ x: -40 + i * 16, y: -4 + (i % 2) * 6, z: 60, w: 14, h: 0.6, d: 30, color: '#b8b8b0', layer: 'far', collide: false });
    for (let i = 0; i < 20; i++) b.add(puffGeo(i % 6, 1), { x: -60 + rnd() * 120, y: -10 + rnd() * 10, z: 40 + rnd() * 60, s: 6 + rnd() * 6, mat: m.cloud, color: '#f2ece2', layer: 'far' });
    cloudHorizon(lv, 0, -50, { radius: 300, count: 200, y: 30, ySpread: 30, size: 80, lit: '#fff4ea', shade: '#a8c0c8' });

    // =================== runtime ===================
    lv.onUpdate((dt, t) => {
      reveal = Math.max(0, reveal - dt);
      const a = Math.min(1, reveal / 1.2);
      const blink = reveal < 2 && reveal > 0 ? (Math.sin(t * 20) > 0 ? 1 : 0.35) : 1;
      hiddenMat.opacity = 0.45 * a * blink;
      for (const h of hidden) {
        h.col.enabled = reveal > 0;
        ((h.mesh.children[0] as THREE.LineSegments).material as THREE.LineBasicMaterial).opacity = a * blink;
      }
      water.position.y = 0.82 + Math.sin(t * 0.8) * 0.01;
      if (rang) lv.chase = Math.max(lv.chase, 0.8);
    });

    lv.intro = async () => {
      lv.lock(true);
      lv.cine([4, 3, 3], [0, 8, -40], 60);
      await lv.wait(1);
      await lv.say(
        ['Ori', '(A mall. Every light is on. Nobody is shopping.)', 'worried'],
        ['Ori', "(The parcel's addressed to 'Customer Service — Lost Children'.)", 'neutral'],
        ['Ori', "(It's open too. There's a little lens inside. Everything looks... thinner through it.)", 'curious'],
      );
      lv.cineEnd();
      lv.lock(false);
      lv.objective('Find Customer Service (top floor)', [10, 0, -24]);
    };
  },
};
