import * as THREE from 'three';
import type { ChapterDef } from '../game/types';
import type { Level } from '../game/Level';
import { look } from '../render/Atmosphere';
import { Tex } from '../render/Textures';
import { boxGeo, roundedGeo } from '../world/Geo';
import { bench, cloudCluster, cloudIsland, floatingDistrict, lamp, skylineRing } from '../world/Kit';
import { pillar, shell } from '../world/Interior';
import { audio, cloudField, cloudHorizon, glowMat, sign, skyOrb, solidMat, STYLES } from './common';
import { createSeededRandom } from '../core/rng';

const LOOK = look({
  sky: { top: '#24205c', mid: '#7a4f9e', sun: '#ffb38a', sunSize: 2.4, cloudLit: '#ffc2c8', cloudShade: '#5c4a8e', cloudCover: 0.55, seaLit: '#f7b8c8', seaShade: '#5a4a8a', seaAmount: 1, stars: 0.45 },
  fog: { color: '#d99ac2', sun: '#ffb89a', low: '#6a5a9e', density: 0.0065, base: 14, falloff: 0.02, heightMix: 0.5, max: 0.9 },
  sunDir: [-0.2, 0.12, -0.97],
  sunColor: '#ffb48c',
  sunIntensity: 1.8,
  hemiSky: '#9a86d8',
  hemiGround: '#e89ab8',
  hemiIntensity: 0.9,
  rimColor: '#ffc8e0',
  rimStrength: 0.4,
  envIntensity: 0.6,
  post: { bloom: 0.9, bloomThreshold: 0.75, warp: 0.55, edgeBlur: 0.75, desat: 0, grain: 0.06, vignette: 0.45, lift: 0.2, shadowTint: '#b9a2ff', highlightTint: '#ffe6d6', contrast: 1.1, exposure: 1, glitch: 0 },
  motes: { kind: 'embers', color: '#ffd2a8', density: 0.5 },
});

export const ch02: ChapterDef = {
  id: 1,
  key: 'velvet-station',
  title: 'The Velvet Station',
  subtitle: 'Every train is on time. Some of them are on time for somebody else.',
  uiDread: 0,
  oriDread: 0.1,
  parcelColor: '#c9a2ff',
  look: LOOK,
  audio: audio({
    chords: [[62, 65, 69, 72, 76], [58, 62, 65, 69, 72], [60, 64, 67, 70, 74], [57, 61, 64, 67, 71]],
    chordDur: 6,
    padType: 'triangle',
    padGain: 0.75,
    arpEvery: 0.8,
    wobble: 0.04,
    reverb: 0.75,
    wind: 0.3,
    room: 0.3,
  }),
  build(lv: Level) {
    const b = lv.b;
    const m = lv.mats;
    lv.killY = 4;
    const velvet = m.tex('velvet', Tex.velvet('#6a2a5a'), { roughness: 0.95 });
    const floor = m.tex('stationFloor', Tex.mallTile('#efe2d0', '#5a3a5e'), { roughness: 0.25 });
    const wood = m.tex('stationWood', Tex.wood('#9a5a42'), { roughness: 0.6 });
    const Y = 20;

    // =================== Arrival tram stop ===================
    cloudIsland(b, 0, 6, 12, 12, Y, 1, { color: '#f2c6dc', belly: 1.4 });
    lv.setStart(0, Y, 9, Math.PI);
    const tram = new THREE.Group();
    const body = new THREE.Mesh(roundedGeo(5, 2.4, 2.6, 0.6, 3), solidMat('#ff9fb8', 0.45));
    const win = new THREE.Mesh(roundedGeo(4.2, 0.9, 2.65, 0.2, 2), glowMat('#ffe2b0', 1.4));
    win.position.y = 0.35;
    tram.add(body, win);
    tram.position.set(-4.5, Y + 2.4, 10);
    lv.root.add(tram);
    lamp(b, 3.5, Y, 4, { color: '#c9a25a', bulb: '#ffd9a0' });
    lamp(b, -3.5, Y, 4, { color: '#c9a25a', bulb: '#ffd9a0' });
    b.box({ x: 0, y: Y - 0.1, z: -2, w: 6, h: 0.4, d: 8, color: '#e8c27a', mat: m.metal, surface: 'metal' });

    // =================== Grand concourse ===================
    const X0 = -18, X1 = 18, Z0 = -58, Z1 = -6, H = 12;
    shell(b, X0, Z0, X1, Z1, Y, H, {
      floorMat: floor, floorColor: '#ffffff', wallMat: velvet, wallColor: '#ffffff', noCeiling: true, surface: 'tile',
      openings: [{ side: 's', from: -3, to: 3, h: 4 }, { side: 'n', from: -3, to: 3, h: 4.5 }],
      baseboard: '#e8c27a',
    });
    // arched glass roof + brass ribs
    const roofR = 18;
    const glass = new THREE.CylinderGeometry(roofR, roofR, Z1 - Z0, 40, 1, true, -Math.PI / 2, Math.PI);
    glass.rotateX(Math.PI / 2);
    b.add(glass, { x: 0, y: Y + H, z: (Z0 + Z1) / 2, sy: 0.55, color: '#e8d6ff', mat: m.glass, shadow: false, ao: 0 });
    for (let z = Z1; z >= Z0; z -= 4.4) {
      const rib = new THREE.TorusGeometry(roofR, 0.18, 6, 40, Math.PI);
      b.add(rib, { x: 0, y: Y + H, z, sy: 0.55, color: '#e8c27a', mat: m.metal, shadow: false });
    }
    for (let x = -14; x <= 14; x += 7) b.add(boxGeo(0.2, 0.2, Z1 - Z0), { x, y: Y + H + Math.sqrt(Math.max(0, roofR * roofR - x * x)) * 0.55, z: (Z0 + Z1) / 2, color: '#e8c27a', mat: m.metal, shadow: false });
    // brass pillars + clocks + hanging lanterns
    for (const x of [-12, 12]) {
      for (let z = -12; z >= -52; z -= 10) {
        pillar(b, x, Y, z, H, { r: 0.45, color: '#e8c27a', mat: m.metal });
        b.add(new THREE.CircleGeometry(0.75, 32), { x: x + (x < 0 ? 0.5 : -0.5), y: Y + 7, z, ry: x < 0 ? Math.PI / 2 : -Math.PI / 2, color: '#fff2d6', mat: m.softGlow, shadow: false, ao: 0 });
        b.add(new THREE.SphereGeometry(0.42, 14, 10), { x: x * 0.5, y: Y + 8.5, z: z - 5, color: '#ffcf9a', mat: m.glow, shadow: false, ao: 0 });
        b.add(new THREE.CylinderGeometry(0.015, 0.015, 3.5, 4), { x: x * 0.5, y: Y + 10.5, z: z - 5, color: '#3a2a4a', shadow: false });
      }
    }
    // benches rows
    for (let z = -14; z >= -50; z -= 6) {
      if (Math.abs(z + 32) < 6) continue;
      for (const x of [-7, 7]) bench(b, x, Y, z, 0, '#8a3a5a');
    }
    // ticket booth
    b.box({ x: 0, y: Y + 0.7, z: -32, w: 7, h: 1.4, d: 3.2, r: 0.12, mat: wood, color: '#ffffff', surface: 'wood' });
    b.box({ x: 0, y: Y + 1.45, z: -32, w: 7.3, h: 0.1, d: 3.5, color: '#e8c27a', mat: m.metal, collide: false });
    for (const x of [-3.4, 3.4]) for (const z of [-30.6, -33.4]) b.box({ x, y: Y + 3, z, w: 0.18, h: 3, d: 0.18, color: '#e8c27a', mat: m.metal, collide: false });
    b.box({ x: 0, y: Y + 4.6, z: -32, w: 7.6, h: 0.5, d: 3.8, r: 0.15, color: '#5a2a52', mat: m.satin });
    b.box({ x: 0, y: Y + 2.2, z: -32, w: 6.6, h: 1.4, d: 0.05, color: '#e8d6ff', mat: m.glass, collide: false });
    const board = sign(lv, 'PLATFORM 9 · DUSK EXPRESS · ON TIME', 0, Y + 6.4, -30.1, 8, 0.9, 0, { bg: '#1c1430', fg: '#ffd9a0', glow: 1.5 });
    void board;
    sign(lv, 'TICKETS', 0, Y + 4.6, -30.08, 2.4, 0.42, 0, { bg: '#5a2a52', fg: '#ffe2b0', glow: 1.3 });
    sign(lv, 'PLATFORM 9  ↑', 0, Y + 5.2, -57.6, 3.6, 0.7, 0, { bg: '#1c1430', fg: '#ffd9a0', glow: 1.4 });
    sign(lv, 'THE VELVET STATION', 0, Y + 5.5, -6.5, 6, 0.9, Math.PI, { bg: '#5a2a52', fg: '#ffe7b8', glow: 1.3 });
    const clerk = lv.resident({ name: 'Clerk', style: STYLES.clerk, pos: [0, Y, -33.2], facing: 0, behavior: 'idle', voice: 460 });
    lv.stamp('c2-booth-roof', 2.5, Y + 4.85, -32);
    // commuters
    const cr = createSeededRandom(5);
    const travelers: Array<[number, number, number]> = [[-7, -20, 0], [7, -26, 0], [-7, -44, 0], [7, -38, 0]];
    travelers.forEach(([x, z], i) =>
      lv.resident({ name: `Traveller ${i}`, style: { ...STYLES.commuter, top: ['#8c84b8', '#b87a9e', '#6a8ab8', '#9e8a6a'][i], umbrella: null, hat: cr() > 0.5 ? 'top' : 'bowler', briefcase: cr() > 0.4 }, pos: [x, Y, z + 0.4], facing: 0, behavior: 'sit', bark: i === 1 ? ['Do you have the time?', "It's always about now."] : undefined }),
    );
    lv.resident({
      name: 'Commuter', style: { ...STYLES.commuter, umbrella: null, briefcase: true }, pos: [-3, Y, -18], behavior: 'loop', speed: 1.3,
      path: [[-3, Y, -18], [-3, Y, -46], [3, Y, -46], [3, Y, -18]],
      bark: ['Next stop...', 'Next stop... next stop...', 'Next stop.'],
    });
    // gate to Platform 9
    const gate = b.mesh(roundedGeo(6, 3.8, 0.2, 0.06, 2), m.metal, { x: 0, y: Y + 1.9, z: -58, color: '#e8c27a' });
    const gateCol = b.physics.addBox(0, Y + 2, -58, 6, 4, 0.6, { climbable: false });
    let ticketChecked = false;
    lv.interact(0, Y + 1.3, -30.3, () => (ticketChecked ? 'Talk to the clerk' : 'Show your ticket'), async () => {
      clerk.talking = true;
      if (!ticketChecked) {
        ticketChecked = true;
        lv.cine([3.5, Y + 2.6, -26.5], [0, Y + 1.8, -32.5], 42);
        await lv.say(
          ['Clerk', 'Ticket, please.'],
          ['Ori', "Here. Mrs. Noor gave it to me. And — someone here asked for me? I'm Ori. The courier.", 'curious'],
          ['Clerk', '...'],
          ['Clerk', 'Yes. This parcel has been asking for you. It would not stop.'],
          ['Clerk', 'Deliver it to Lost & Found, at Platform Ø. The Dusk Express will take you. It is early for you.'],
          ['Ori', "Platform... zero? I've never heard of it.", 'worried'],
          ['Clerk', 'No one has. That is why it is lost.'],
        );
        lv.parcel('#c9a2ff');
        lv.game.audio.door();
        lv.game.tweens.add(1.6, (k) => gate.position.setY(Y + 1.9 + k * 4.2));
        gateCol.enabled = false;
        lv.cineEnd();
        lv.objective('Board the Dusk Express at Platform 9', [0, Y, -96]);
      } else {
        await lv.say(['Clerk', 'Platform 9. Mind the gap between the days.']);
      }
      clerk.talking = false;
    }, { radius: 2.6 });

    // =================== Platform 9 (open air) ===================
    b.box({ x: 0, y: Y - 0.5, z: -94, w: 8, h: 1, d: 72, color: '#e9d8e8', mat: floor, surface: 'tile' });
    b.box({ x: -4.1, y: Y - 0.3, z: -94, w: 0.25, h: 0.62, d: 72, color: '#ffd46b', mat: m.satin, collide: false });
    // canopy
    for (let z = -64; z >= -126; z -= 8) {
      pillar(b, 2.6, Y, z, 5, { r: 0.18, color: '#e8c27a', mat: m.metal });
      b.box({ x: 0.5, y: Y + 5.2, z: z - 4, w: 6.5, h: 0.25, d: 8.2, color: '#5a2a52', mat: velvet, collide: false });
      b.add(new THREE.SphereGeometry(0.22, 10, 8), { x: 0.5, y: Y + 4.8, z: z - 4, color: '#ffd9a0', mat: m.glow, shadow: false });
    }
    for (let z = -70; z >= -122; z -= 12) bench(b, 2.6, Y, z - 2, -Math.PI / 2, '#8a3a5a');
    b.wall(4.2, Y + 1, -94, 0.3, 2, 72);
    cloudCluster(b, 0, Y - 3, -94, 10, 72, 40, 7, { scale: 2, color: '#f2c6dc' });
    // rails + trestle
    const railLen = 900;
    const railZ = -94 - railLen / 2 + 36;
    for (const dx of [-0.7, 0.7]) b.add(boxGeo(0.12, 0.14, railLen), { x: -7 + dx, y: Y - 0.4, z: railZ, color: '#c9a25a', mat: m.metal, shadow: false });
    for (let z = -58; z > -58 - railLen; z -= 1.6) b.add(boxGeo(2.2, 0.12, 0.3), { x: -7, y: Y - 0.55, z, color: '#5a3a4a', shadow: false });
    for (let z = -70; z > -58 - railLen; z -= 24) b.add(new THREE.CylinderGeometry(0.3, 0.5, 30, 8), { x: -7, y: Y - 15.6, z, color: '#4a3a5a', mat: m.metal, shadow: false });
    lv.checkpoint(0, Y, -62, Math.PI, { objective: 'Board the Dusk Express at Platform 9', waypoint: new THREE.Vector3(0, Y, -96), restore: () => { ticketChecked = true; gate.position.y = Y + 6.1; gateCol.enabled = false; lv.parcel('#c9a2ff'); } });
    lv.resident({ name: 'Commuter ', style: { ...STYLES.commuter, umbrella: '#c9b6ff' }, pos: [1, Y, -110], facing: -Math.PI / 2, behavior: 'idle', bark: ['Next stop...', 'Next stop... next stop...'] });

    // ---- the Dusk Express ----
    const train = new THREE.Group();
    const cars: THREE.Group[] = [];
    for (let i = 0; i < 4; i++) {
      const car = new THREE.Group();
      const shellM = new THREE.Mesh(roundedGeo(3, 3.2, 11, 0.8, 3), solidMat(i === 0 ? '#3a1a3e' : '#6a2a5a', 0.5));
      const stripe = new THREE.Mesh(roundedGeo(3.04, 0.2, 11.04, 0.05, 1), solidMat('#e8c27a', 0.3, { metalness: 0.8 }));
      stripe.position.y = -0.7;
      const windows = new THREE.Mesh(roundedGeo(3.06, 0.9, 9.6, 0.2, 2), glowMat('#ffd9a0', 1.5));
      windows.position.y = 0.45;
      car.add(shellM, stripe, windows);
      if (i === 0) {
        const lampM = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), glowMat('#fff2c8', 3));
        lampM.position.set(0, -0.2, -5.6);
        car.add(lampM);
      }
      car.position.z = i * 11.6;
      train.add(car);
      cars.push(car);
    }
    train.position.set(-7, Y + 1.2, -700);
    lv.root.add(train);

    let boarded = false;
    let riding = false;
    let rideT = 0;
    const RIDE = 13;
    const rideFrom = -98, rideTo = -398;
    const boardIt = lv.interact(-3.6, Y + 1.2, -98, 'Board the Dusk Express', async () => {
      boarded = true;
      lv.lock(true);
      lv.objective('', null);
      riding = true;
      rideT = 0;
      lv.player.rig.setVisible(false);
      lv.game.audio.train();
      lv.cine([8, Y + 6, -90], [-7, Y + 2, -100], 55);
      await lv.wait(1.6);
      await lv.say(
        ['Ori', '(The seats are warm. Like somebody just left.)', 'curious'],
        ['Voice', 'Next stop... Platform Ø. Next stop... Platform Ø.'],
      );
    }, { radius: 3.2, once: true, enabled: () => trainArrived && !boarded });
    void boardIt;
    let trainArrived = false;
    lv.trigger(0, Y + 1, -92, 8, 4, 6, async () => {
      lv.game.audio.train();
      lv.game.audio.rumble(3);
      lv.game.tweens.add(5.5, (k) => (train.position.z = -700 + (rideFrom - 18 + 700) * k), (t) => 1 - Math.pow(1 - t, 3), () => (trainArrived = true));
      lv.objective('Board the Dusk Express', [-3.6, Y, -98]);
    });

    // =================== Platform Ø ===================
    const PZ = -405;
    b.box({ x: 0, y: Y - 0.5, z: PZ, w: 8, h: 1, d: 34, color: '#d8c8d8', mat: floor, surface: 'tile' });
    cloudCluster(b, 0, Y - 3, PZ, 10, 34, 24, 8, { scale: 2, color: '#d2b6d2' });
    b.wall(4.2, Y + 1, PZ, 0.3, 2, 34);
    sign(lv, 'PLATFORM  —', 1.6, Y + 3.2, PZ + 6, 2.6, 0.55, -Math.PI / 2, { bg: '#1c1430', fg: '#c9b6d8', glow: 1.1 });
    for (const z of [PZ + 10, PZ - 2]) bench(b, 2.6, Y, z, Math.PI / 2, '#5a3a5a');
    lv.resident({ name: 'Commuter  ', style: { ...STYLES.commuter, umbrella: null, top: '#6a648a' }, pos: [2.6, Y, PZ - 2], facing: Math.PI / 2, behavior: 'sit', oblivious: true, bark: ['Next stop.', 'Next stop.', 'Next stop.'] });
    lamp(b, 2.8, Y, PZ + 15, { color: '#8a7a9a', bulb: '#d9c8ff' });
    lamp(b, 2.8, Y, PZ - 15, { color: '#8a7a9a', bulb: '#d9c8ff' });
    const arriveCp = lv.checkpoint(0, Y, PZ + 8, Math.PI, { objective: 'Find a way off Platform Ø', waypoint: new THREE.Vector3(0, Y, PZ - 15), restore: () => { ticketChecked = true; boarded = true; lv.parcel('#c9a2ff'); } });
    void arriveCp;

    // ticket staircase across the void
    const tickets: Array<{ mesh: THREE.Mesh; col: ReturnType<typeof b.physics.addBox> }> = [];
    for (let i = 0; i < 9; i++) {
      const tz = PZ - 19.5 - i * 1.9;
      const ty = Y + 0.45 * (i + 1);
      const mesh = b.mesh(roundedGeo(2.2, 0.12, 1.5, 0.04, 2), m.glow, { x: (i % 2 ? 0.25 : -0.25), y: ty - 0.06, z: tz, color: i % 2 ? '#f2d6ff' : '#ffe6c2', ry: (i % 2 ? 0.12 : -0.12) });
      mesh.visible = false;
      const col = b.physics.addBox(mesh.position.x, ty - 0.06, tz, 2.2, 0.14, 1.5, { surface: 'soft', climbable: true });
      col.enabled = false;
      tickets.push({ mesh, col });
    }
    const printTickets = (instant: boolean) => {
      tickets.forEach((t, i) => {
        const go = () => {
          t.mesh.visible = true;
          t.col.enabled = true;
          if (!instant) {
            lv.game.audio.blip(500 + i * 60);
            lv.game.vfx.emit(t.mesh.position, 14, { color: '#f2d6ff', color2: '#ffe6c2', speed: 2, life: 0.8, size: 0.18 });
          }
        };
        if (instant) go();
        else lv.after(0.25 * i, go);
      });
    };
    lv.anchor(0, Y, PZ - 14, '#c9a2ff', 'Ticket anchor', async () => {
      printTickets(false);
      await lv.wait(1);
      await lv.say(['Ori', "(A staircase of tickets. To a path that shouldn't be here.)", 'surprised']);
      lv.objective('Climb the ticket stairs to the signal gantries', [0, Y + 4, PZ - 38]);
    });

    // =================== Signal gantries ===================
    const gantry = (x: number, top: number, z: number, w: number, d: number) => {
      b.box({ x, y: top - 0.2, z, w, h: 0.4, d, color: '#5a4a6a', mat: m.metal, surface: 'metal' });
      for (const sx of [-1, 1]) b.add(boxGeo(0.1, 0.5, d), { x: x + sx * (w / 2 - 0.05), y: top + 0.25, z, color: '#e8c27a', mat: m.metal, shadow: false });
      b.add(new THREE.CylinderGeometry(0.12, 0.12, 30, 6), { x: x - w / 2 + 0.2, y: top - 15.2, z, color: '#3a2a4a', mat: m.metal, shadow: false });
      const sigc = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), glowMat(Math.abs(z) % 2 > 1 ? '#ff6a7a' : '#7affb8', 2.5));
      sigc.position.set(x + w / 2 - 0.3, top + 1.4, z);
      lv.root.add(sigc);
      b.add(new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6), { x: x + w / 2 - 0.3, y: top + 0.6, z, color: '#3a2a4a', shadow: false });
    };
    const GZ = PZ - 37;
    gantry(0, Y + 4, GZ, 6, 4);
    gantry(4, Y + 5, GZ - 7, 3, 3);
    const mover = b.mesh(roundedGeo(3, 0.4, 3, 0.08, 2), m.metal, { x: 0, y: Y + 4.8, z: GZ - 13.5, color: '#7a6a8a' });
    const moving = lv.movingPlatform(mover, 3, 0.4, 3, 'metal');
    gantry(0, Y + 6.2, GZ - 20, 4.5, 3.5);
    b.box({ x: 0, y: Y + 6.2 + 0.4, z: GZ - 20.3, w: 2.6, h: 0.8, d: 0.9, r: 0.12, color: '#b8826a', surface: 'soft' });
    gantry(-3, Y + 7.4, GZ - 25.6, 3, 3);
    gantry(0, Y + 7.4, GZ - 37, 3.2, 16);
    b.box({ x: 0, y: Y + 7.4 + 0.45, z: GZ - 35, w: 3, h: 0.9, d: 1.0, r: 0.15, color: '#8a5a7a', surface: 'soft' });
    b.box({ x: 0, y: Y + 7.4 + 0.4, z: GZ - 40, w: 3, h: 0.8, d: 1.2, r: 0.15, color: '#b8826a', surface: 'soft' });
    // high stamp gantry (mantle from GZ-20)
    gantry(3.9, Y + 8.6, GZ - 22, 2.6, 2.6);
    lv.stamp('c2-high-signal', 3.9, Y + 8.6, GZ - 22);
    lv.checkpoint(0, Y + 4, GZ, Math.PI, { objective: 'Cross the signal gantries to Lost & Found', waypoint: new THREE.Vector3(0, Y + 7.4, GZ - 51), restore: () => { ticketChecked = true; boarded = true; printTickets(true); lv.parcel('#c9a2ff'); } });
    lv.trigger(0, Y + 7, GZ - 30, 6, 4, 4, () => lv.toast('Sprint into luggage to vault over it'));
    const watcher = lv.watcher(42, Y - 2, GZ - 30, 3.2);
    watcher.mode = 'vanishOnLook';
    watcher.onSeen = () => void lv.say(['Ori', "(Someone's standing on that far platform. Very tall. Very still.)", 'worried']);
    b.box({ x: 42, y: Y - 2.5, z: GZ - 30, w: 8, h: 1, d: 14, color: '#4a3a5a', mat: m.metal, collide: false, layer: 'near' });

    // =================== Lost & Found ===================
    const LZ = GZ - 51;
    cloudIsland(b, 0, LZ, 14, 12, Y + 7.4, 31, { color: '#d9b8d8', belly: 1.4 });
    shell(b, -4.5, LZ - 5, 4.5, LZ + 1, Y + 7.4, 3.6, { wallMat: wood, wallColor: '#ffffff', floorMat: wood, ceilColor: '#5a2a52', surface: 'wood', openings: [{ side: 's', from: -1.6, to: 1.6, h: 2.6 }, { side: 'n', from: -0.6, to: 0.6, h: 2.3 }], lights: { spacing: 3, color: '#ffd9a0' } });
    sign(lv, 'LOST & FOUND', 0, Y + 7.4 + 3.1, LZ + 1.45, 3.2, 0.55, 0, { bg: '#5a2a52', fg: '#ffe2b0', glow: 1.3 });
    // shelves with lost things
    const lr = createSeededRandom(77);
    for (const x of [-3.8, 3.8]) {
      b.box({ x, y: Y + 7.4 + 1.4, z: LZ - 2, w: 0.8, h: 2.8, d: 5.5, color: '#6a3a3a', mat: wood });
      for (let i = 0; i < 14; i++) {
        const kind = lr();
        const yy = Y + 7.4 + 0.6 + Math.floor(lr() * 3) * 0.85;
        const zz = LZ - 4.3 + lr() * 4.6;
        if (kind < 0.33) b.add(new THREE.SphereGeometry(0.22, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), { x: x * 0.92, y: yy, z: zz, color: ['#ffb8d6', '#9fe3ff', '#ffe2b0'][i % 3], mat: m.satin, shadow: false });
        else if (kind < 0.66) b.add(roundedGeo(0.32, 0.18, 0.18, 0.05, 1), { x: x * 0.92, y: yy, z: zz, color: '#fff4ea', shadow: false });
        else b.add(new THREE.CylinderGeometry(0.15, 0.18, 0.25, 10), { x: x * 0.92, y: yy, z: zz, color: '#3a2a4a', shadow: false });
      }
    }
    b.box({ x: 0, y: Y + 7.4 + 0.5, z: LZ - 3, w: 3, h: 1, d: 0.8, mat: wood, color: '#ffffff', surface: 'wood' });
    const keeper = lv.resident({ name: 'Lost & Found', style: { ...STYLES.worker('#9e8a6a'), hat: 'bowler', hatColor: '#3a2a3a', face: 'simple', scale: 0.95 }, pos: [0, Y + 7.4, -3.9 + LZ], facing: 0, behavior: 'idle', voice: 330 });
    const backDoor = b.mesh(roundedGeo(1.1, 2.2, 0.12, 0.05, 2), m.paint, { x: 0, y: Y + 7.4 + 1.1, z: LZ - 5.05, color: '#ffe6c2' });
    const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.12), glowMat('#fff2c8', 3));
    doorGlow.position.set(0, Y + 7.45, LZ - 4.95);
    lv.root.add(doorGlow);
    const doorCol = b.physics.addBox(0, Y + 7.4 + 1.1, LZ - 5.2, 1.4, 2.2, 0.4, { climbable: false });
    lv.stamp('c2-lost-behind', 5.5, Y + 7.4, LZ - 4);
    let delivered = false;
    lv.interact(0, Y + 8.4, LZ - 2.4, () => (delivered ? 'Talk to Lost & Found' : 'Deliver the parcel'), async () => {
      keeper.talking = true;
      if (!delivered) {
        delivered = true;
        lv.cine([2.6, Y + 9.6, LZ + 0.8], [0, Y + 8.6, LZ - 3.5], 45);
        await lv.say(
          ['Lost & Found', 'Ah. The one that kept asking. Thank you, courier.'],
          ['Lost & Found', "Hm. It's open."],
          ['Ori', "It can't be. I didn't — I would never—", 'surprised'],
          ['Lost & Found', "They all arrive open now. Don't take it personally. Look: a crayon drawing. A bedroom. Somebody sent it back."],
          ['Lost & Found', "This belongs to the Playroom Quarter. And this—"],
          ['Lost & Found', "—a Wake-Up parcel. Little alarm-clock bell. Somebody's room fell asleep and forgot to get up."],
          ['Ori', 'A room... fell asleep? Inside a dream?', 'worried'],
          ['Lost & Found', "Rooms get tired, courier. Everything up here does, lately. Through the back. Mind your head — it's bigger in there."],
        );
        lv.parcel('#9fe3ff');
        lv.game.setParcel('#9fe3ff');
        lv.cineEnd();
        lv.game.audio.door();
        lv.game.tweens.add(1.2, (k) => (backDoor.rotation.y = -k * 1.6));
        backDoor.geometry.translate(0.55, 0, 0);
        backDoor.position.x -= 0.55;
        doorCol.enabled = false;
        lv.objective('Go through the door behind Lost & Found', [0, Y + 7.4, LZ - 6]);
      } else {
        await lv.say(['Lost & Found', 'Everything gets found eventually. Mostly by me.']);
      }
      keeper.talking = false;
    }, { radius: 2.8 });
    lv.checkpoint(0, Y + 7.4, LZ + 4, Math.PI, { objective: 'Deliver the parcel to Lost & Found', waypoint: new THREE.Vector3(0, Y + 7.4, LZ - 3), restore: () => { ticketChecked = true; boarded = true; printTickets(true); lv.parcel('#c9a2ff'); } });
    const endT = lv.trigger(0, Y + 8.4, LZ - 6.4, 2, 3, 1.6, async () => {
      lv.lock(true);
      lv.flash('#fff2c8', 1);
      await lv.wait(0.6);
      lv.complete();
    });
    endT.enabled = false;
    lv.onUpdate(() => (endT.enabled = delivered));

    // =================== Extended + distant ===================
    const pal = { wall: ['#d9b8e8', '#f2c6dc', '#c9b6ff', '#ffd9c2'], roof: ['#5a2a52', '#3a2a6a', '#8a3a5a'] };
    floatingDistrict(b, -60, 10, -40, 1.4, 201, pal);
    floatingDistrict(b, 55, 26, -150, 1.2, 202, pal);
    floatingDistrict(b, -50, 30, -260, 1.6, 203, pal);
    floatingDistrict(b, 60, 14, -330, 1.3, 204, pal);
    floatingDistrict(b, -40, 18, -470, 1.5, 205, pal);
    floatingDistrict(b, 70, 36, -520, 1.8, 206, pal);
    // other stations along the line
    for (const [z, side] of [[-170, 1], [-240, -1], [-310, 1]] as const) {
      b.box({ x: side * 20, y: Y - 0.5, z, w: 8, h: 1, d: 30, color: '#c9b6d8', layer: 'near', collide: false });
      for (let k = 0; k < 4; k++) lamp(b, side * 20 + 2.5, Y, z - 12 + k * 8, { layer: 'near', color: '#c9a25a', bulb: '#ffd9a0' });
      b.box({ x: side * 20, y: Y + 4, z, w: 7, h: 0.3, d: 28, color: '#5a2a52', layer: 'near', collide: false });
    }
    skylineRing(b, 0, -250, 330, 34, 210, { y: -30, hMin: 50, hMax: 140, color: '#5a4a8a', top: '#c99ac8', windows: '#ffd9a0', lit: 0.5 });
    cloudHorizon(lv, 0, -250, { radius: 470, count: 300, y: -5, ySpread: 50, size: 100, lit: '#f7b8c8', shade: '#5a4a8a' });
    cloudField(lv, -200, 200, -650, 60, -2, { count: 260, size: 30, ySpread: 10, lit: '#f2b8c8', shade: '#5c4a8e', seed: 9 });
    skyOrb(lv, 200, 160, -700, 55, '#ffd9e6', true);

    // =================== Runtime ===================
    const seat = new THREE.Vector3();
    lv.onUpdate((dt, t) => {
      // gantry mover
      moving.move(Math.sin(t * 0.7) * 4, Y + 4.8, GZ - 13.5);
      if (riding) {
        rideT += dt;
        const k = Math.min(1, rideT / RIDE);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        train.position.z = rideFrom - 18 + (rideTo - rideFrom) * e;
        seat.set(-7, Y + 0.6, train.position.z + 12);
        lv.player.teleport(seat, Math.PI);
        lv.game.camRig.cinematic = {
          pos: new THREE.Vector3(10 + Math.sin(rideT * 0.3) * 3, Y + 5 + Math.sin(rideT * 0.2) * 2, train.position.z + 8 - k * 6),
          look: new THREE.Vector3(-7, Y + 1.5, train.position.z + 4),
          fov: 55,
        };
        if (k >= 1 && riding) {
          riding = false;
          lv.player.teleport(new THREE.Vector3(0, Y, PZ + 10), Math.PI);
          lv.player.rig.setVisible(true);
          lv.cineEnd();
          lv.lock(false);
          lv.game.camRig.snap(lv.player.pos, 0);
          lv.after(1.5, () => lv.game.tweens.add(4, (q) => (train.position.z = rideTo - 18 - q * 400), (x) => x * x));
          void lv.say(['Ori', "(There's nothing here. Just... the platform, and the dark.)", 'worried']).then(() =>
            lv.objective('Find a way off Platform Ø', [0, Y, PZ - 14]),
          );
        }
      }
      cars.forEach((c, i) => (c.position.y = Math.sin(t * 6 + i) * 0.02));
      doorGlow.visible = !delivered;
      void tram;
    });

    lv.intro = async () => {
      lv.lock(true);
      lv.cine([6, Y + 4, 2], [0, Y + 6, -20], 55);
      await lv.wait(1);
      await lv.say(
        ['Ori', '(The Velvet Station. I used to only see it from the tram.)', 'curious'],
        ['Ori', "(Everyone here seems to be waiting for something. That's what stations are for, I guess.)", 'neutral'],
      );
      lv.cineEnd();
      lv.lock(false);
      lv.objective('Find whoever asked for you — try the ticket booth', [0, Y, -30]);
    };
  },
};
