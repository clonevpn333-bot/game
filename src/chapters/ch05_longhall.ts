import * as THREE from 'three';
import type { ChapterDef } from '../game/types';
import type { Level } from '../game/Level';
import { look } from '../render/Atmosphere';
import { Tex } from '../render/Textures';
import { boxGeo, roundedGeo } from '../world/Geo';
import { repeatingRooms, tower } from '../world/Kit';
import { door, shell } from '../world/Interior';
import { audio, glowMat, sign } from './common';
import type { Expression } from '../entities/Rig';
import { createSeededRandom } from '../core/rng';
import type { StaticFigure } from '../entities/Actors';

const HALL = look({
  sky: { top: '#3a2a2a', mid: '#6a4a3a', sun: '#ffb070', sunSize: 3, cloudCover: 0.2, cloudLit: '#ffb88a', cloudShade: '#4a2a2a', seaAmount: 0.3, ceiling: 1 },
  fog: { color: '#4a3628', sun: '#4a3628', low: '#2e2018', density: 0.032, base: 0, falloff: 0.001, heightMix: 0, max: 0.97 },
  sunDir: [0.2, 0.9, 0.1],
  sunColor: '#ffd6a8',
  sunIntensity: 0.25,
  hemiSky: '#ffd6a8',
  hemiGround: '#6a3a30',
  hemiIntensity: 1.3,
  rimColor: '#ffc89a',
  rimStrength: 0.15,
  envIntensity: 0.3,
  dread: 0.55,
  shadows: false,
  post: { bloom: 1.0, bloomThreshold: 0.72, warp: 0.7, edgeBlur: 0.85, desat: 0.15, grain: 0.14, vignette: 0.6, lift: 0.1, shadowTint: '#c8a090', highlightTint: '#ffe0c0', contrast: 1.1, exposure: 1, glitch: 0 },
  motes: { kind: 'dust', color: '#ffd8b0', density: 0.5 },
});

const OFFICE = look({
  sky: { top: '#3a2a5a', mid: '#e88a5a', sun: '#ffb070', sunSize: 3.2, cloudLit: '#ffb88a', cloudShade: '#6a3a4a', cloudCover: 0.35, seaLit: '#f2a07a', seaShade: '#5a3a4a' },
  fog: { color: '#e8a07a', sun: '#ffc08a', low: '#6a4a5a', density: 0.006, base: 0, falloff: 0.01, heightMix: 0.2, max: 0.9 },
  sunDir: [0.97, 0.12, -0.15],
  sunColor: '#ffb070',
  sunIntensity: 3.2,
  hemiSky: '#e0c0b0',
  hemiGround: '#6a4a40',
  hemiIntensity: 0.75,
  rimColor: '#ffc89a',
  rimStrength: 0.25,
  envIntensity: 0.4,
  dread: 0.5,
  post: { bloom: 0.9, bloomThreshold: 0.75, warp: 0.6, edgeBlur: 0.8, desat: 0.1, grain: 0.12, vignette: 0.55, lift: 0.12, shadowTint: '#b89ac8', highlightTint: '#ffe0c0', contrast: 1.12, exposure: 1, glitch: 0 },
  motes: { kind: 'dust', color: '#ffd0a0', density: 0.8 },
});

const APART = look({
  ...HALL,
  fog: { ...HALL.fog, color: '#1e2a22', sun: '#1e2a22', low: '#121a14', density: 0.045 },
  hemiSky: '#c8e0b0',
  hemiGround: '#2a3a2a',
  hemiIntensity: 0.7,
  dread: 0.62,
  post: { ...HALL.post, desat: 0.3, shadowTint: '#9ab8a0', highlightTint: '#e6ffd8', grain: 0.16 },
});

export const ch05: ChapterDef = {
  id: 4,
  key: 'long-hall',
  title: 'The Long Hall',
  subtitle: 'Every door is the same door. One of them is yours.',
  uiDread: 2,
  oriDread: 0.55,
  parcelColor: '#ffb070',
  look: HALL,
  audio: audio({
    chords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 58, 62, 65], [52, 55, 59, 62]],
    chordDur: 8,
    padType: 'sine',
    padGain: 0.55,
    bellGain: 0.35,
    arpEvery: 1.6,
    wobble: 0.16,
    pitch: 0.96,
    reverb: 0.9,
    hum: 0.35,
    room: 0.6,
    drone: 0.25,
  }),
  build(lv: Level) {
    const b = lv.b;
    const m = lv.mats;
    lv.killY = -20;
    const rnd = createSeededRandom(55);

    // =================== A. The looping hotel corridor ===================
    const carpet = m.tex('hotelCarpet', Tex.hotelCarpet('#6b2a3a', '#d8a35a'), { roughness: 0.95 });
    const wallT = Tex.velvet('#b8865a').clone();
    wallT.repeat.set(1 / 1.4, 1 / 1.4);
    const wall = m.tex('hotelWall', wallT, { roughness: 0.9 });
    const W = 5, H = 3.4, ZA = 112, ZB = -154, PERIOD = 66, SP = 6;
    shell(b, -W / 2, ZB, W / 2, ZA, 0, H, { floorMat: carpet, wallMat: wall, ceilColor: '#e8d8c0', surface: 'carpet', baseboard: '#4a2a1a' });
    b.box({ x: 0, y: H - 0.12, z: (ZA + ZB) / 2, w: W - 0.2, h: 0.24, d: ZA - ZB, color: '#f2e2c8', collide: false });
    // doors, sconces and numbers (periodic so the loop is seamless)
    const doorZs: number[] = [];
    for (let z = ZA - 3; z > ZB + 2; z -= SP) {
      const k = Math.round((((z % PERIOD) + PERIOD) % PERIOD) / SP);
      doorZs.push(z);
      door(b, -W / 2 + 0.01, 0, z, Math.PI / 2, { color: '#5a2a2a', frame: '#e8c27a', w: 1.0, h: 2.2 });
      door(b, W / 2 - 0.01, 0, z - SP / 2, -Math.PI / 2, { color: '#5a2a2a', frame: '#e8c27a', w: 1.0, h: 2.2 });
      for (const [x, zz] of [[-W / 2 + 0.12, z + 1.6], [W / 2 - 0.12, z - SP / 2 + 1.6]] as const) {
        b.add(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), { x, y: 2.2, z: zz, rx: Math.PI, color: '#ffd6a0', mat: m.glow, shadow: false, ao: 0 });
        b.add(boxGeo(0.06, 0.3, 0.06), { x, y: 2.0, z: zz, color: '#c89a5a', mat: m.metal, shadow: false });
      }
      sign(lv, `04${String(10 + k).padStart(2, '0')}`, -W / 2 + 0.06, 2.55, z, 0.5, 0.18, Math.PI / 2, { bg: '#e8c27a', fg: '#3a1a1a', glow: 1 });
      if (k % 4 === 1) b.add(boxGeo(0.06, 0.9, 1.3), { x: W / 2 - 0.04, y: 1.6, z: z - SP / 2 - 2.5, color: '#3a3a5a', shadow: false });
    }
    // elevator (start)
    b.box({ x: W / 2 - 0.05, y: 1.25, z: 0, w: 0.1, h: 2.5, d: 1.8, color: '#c8a050', mat: m.metal, collide: false });
    b.add(boxGeo(0.02, 2.5, 0.04), { x: W / 2 - 0.12, y: 1.25, z: 0, color: '#3a2a1a', shadow: false });
    lv.setStart(0, 0, 0, Math.PI);
    // the lit door
    const lamp = new THREE.Group();
    for (let c = -2; c <= 2; c++) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), glowMat('#fff2c8', 3.5));
      l.position.z = c * PERIOD;
      lamp.add(l);
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), new THREE.MeshBasicMaterial({ color: '#ffe8b0', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.position.set(0.02, -1.4, c * PERIOD);
      halo.rotation.y = Math.PI / 2;
      lamp.add(halo);
    }
    lamp.visible = false;
    lv.root.add(lamp);
    let loops = 0;
    let litZ = 0;
    let doorTaken = false;
    const placeLamp = () => {
      const idx = Math.floor(rnd() * 10);
      litZ = -3 - idx * SP; // within (0, -66)
      lamp.position.set(-W / 2 + 0.15, 2.7, litZ);
      lamp.visible = true;
    };
    const litDoor = lv.interact(-W / 2 + 0.5, 1.1, 0, 'Open the lit door', async () => {
      doorTaken = true;
      lv.lock(true);
      lv.game.audio.door();
      await lv.game.ui.fade(true, true);
      enterOffice();
      await lv.game.ui.fade(false);
      lv.lock(false);
      await lv.say(['Ori', "(An office. The sun is setting. It's been setting for a long time, I think.)", 'worried']);
      lv.objective('Find the parcel and reach the elevator — stay out of the lantern light (C to sneak)', [200, 0, -64]);
    }, { radius: 1.8, once: true, enabled: () => lamp.visible && !doorTaken });
    const LOOP_LINES: Array<[string, Expression]> = [
      ['(Room 0410... I passed that one already.)', 'worried'],
      ['(Same carpet stain. Same painting. Same door. Again.)', 'scared'],
      ['(There — one of the doors has its light on.)', 'curious'],
    ];
    lv.onUpdate(() => {
      if (doorTaken) return;
      const p = lv.player.pos;
      if (p.x > -10 && p.x < 10 && p.y < 4) {
        if (p.z < -PERIOD / 2) {
          lv.game.warp(0, 0, PERIOD);
          loops++;
          onLoop();
        } else if (p.z > PERIOD / 2) {
          lv.game.warp(0, 0, -PERIOD);
          loops++;
          onLoop();
        }
      }
      // keep the interactable on the nearest copy of the lit door
      const pz = lv.player.pos.z;
      const copy = Math.round((pz - litZ) / PERIOD);
      litDoor.pos.set(-W / 2 + 0.5, 1.1, litZ + copy * PERIOD);
    });
    const onLoop = () => {
      lv.game.audio.stinger('watcher');
      lv.glitch(0.25);
      if (loops <= 3) void lv.say(['Ori', LOOP_LINES[Math.min(loops - 1, 2)][0], LOOP_LINES[Math.min(loops - 1, 2)][1]]);
      if (loops >= 2) placeLamp();
      if (loops === 2) lv.objective('Find the door with its light on', null);
    };
    lv.intro = async () => {
      lv.lock(true);
      lv.cine([1.6, 1.8, 3.2], [0, 1.4, -10], 62);
      await lv.wait(1.2);
      await lv.say(
        ['Ori', '(The parcel just says: “Room 0. The Long Hall.” No name. No stamp.)', 'worried'],
        ['Ori', "(Hotel carpet. Hotel lights. Somewhere a vacuum is running, very far away.)", 'neutral'],
      );
      lv.cineEnd();
      lv.lock(false);
      lv.objective('Find Room 0', null);
    };

    // =================== B. The office at endless sunset ===================
    const OX = 200;
    const OX0 = OX - 24, OX1 = OX + 24, OZ0 = -72, OZ1 = 30;
    const officeCarpet = m.tex('officeCarpet', Tex.carpet('#5a6a8a', 'office'), { roughness: 0.95 });
    const ceil = m.tex('officeCeil', Tex.ceilingTiles(), { roughness: 0.9 });
    shell(b, OX0, OZ0, OX1, OZ1, 0, 3.6, {
      floorMat: officeCarpet, ceilMat: ceil, wallColor: '#e8dcc8', surface: 'carpet', baseboard: '#6a6a7a',
      openings: Array.from({ length: 12 }, (_, i) => ({ side: 'e' as const, from: OZ0 + 4 + i * 8.4, to: OZ0 + 10.4 + i * 8.4, h: 3.0 })),
    });
    // windows with blinds (cast striped sunset light)
    for (let i = 0; i < 12; i++) {
      const z = OZ0 + 7.2 + i * 8.4;
      b.box({ x: OX1 + 0.2, y: 0.45, z, w: 0.4, h: 0.9, d: 6.4, color: '#d8ccb8' });
      b.wall(OX1 + 0.3, 1.8, z, 0.3, 3.6, 6.4);
      for (let k = 0; k < 9; k++) b.add(boxGeo(0.04, 0.09, 6.4), { x: OX1 - 0.15, y: 1.1 + k * 0.22, z, rz: 0.5, color: '#f2e6d0', shadow: true });
    }
    // fluorescent panels (some dead)
    for (let x = OX0 + 4; x < OX1; x += 6)
      for (let z = OZ0 + 4; z < OZ1; z += 6) {
        const on = rnd() > 0.35;
        b.add(boxGeo(1.2, 0.05, 0.6), { x, y: 3.57, z, color: on ? '#f2f6ff' : '#8a8a90', mat: on ? m.glow : m.paint, shadow: false, ao: 0 });
      }
    // cubicles grid
    const cubicle = (cx: number, cz: number) => {
      const c = '#8a9ab0';
      b.box({ x: cx, y: 0.7, z: cz - 1.6, w: 3.2, h: 1.4, d: 0.12, color: c, climbable: true });
      b.box({ x: cx - 1.6, y: 0.7, z: cz, w: 0.12, h: 1.4, d: 3.2, color: c, climbable: true });
      b.box({ x: cx + 0.2, y: 0.74, z: cz - 1.1, w: 2.6, h: 0.06, d: 0.9, color: '#d8c8a8', collide: false });
      b.physics.addBox(cx + 0.2, 0.38, cz - 1.1, 2.6, 0.76, 0.9, { climbable: true });
      b.add(roundedGeo(0.7, 0.45, 0.06, 0.02, 1), { x: cx + 0.4, y: 1.05, z: cz - 1.4, color: '#9fe3ff', mat: rnd() > 0.4 ? m.glow : m.satin, shadow: false, ao: 0 });
      b.add(boxGeo(0.1, 0.3, 0.1), { x: cx + 0.4, y: 0.85, z: cz - 1.45, color: '#3a3a4a', shadow: false });
      b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 10), { x: cx + 0.3, y: 0.5, z: cz - 0.3, color: '#3a3a4a' });
    };
    for (let x = OX0 + 6; x <= OX1 - 8; x += 4.4)
      for (let z = OZ1 - 10; z >= OZ0 + 12; z -= 4.4) {
        if (Math.abs(x - OX) < 3) continue; // central aisle
        if (Math.abs(z + 20) < 2.4) continue; // cross aisle
        cubicle(x, z);
      }
    // water cooler, printer, plants
    b.box({ x: OX0 + 1, y: 0.7, z: 10, w: 0.6, h: 1.4, d: 0.6, color: '#e8f0ff' });
    b.add(new THREE.CylinderGeometry(0.25, 0.25, 0.6, 12), { x: OX0 + 1, y: 1.7, z: 10, color: '#9fd0ff', mat: m.glass });
    b.box({ x: OX0 + 1.2, y: 0.6, z: -30, w: 1.4, h: 1.2, d: 1, color: '#d8d8d0' });
    for (const z of [20, -10, -50]) {
      b.add(new THREE.CylinderGeometry(0.35, 0.3, 0.6, 10), { x: OX1 - 1.2, y: 0.3, z, color: '#c89a6a' });
      b.add(new THREE.IcosahedronGeometry(0.7, 1), { x: OX1 - 1.2, y: 1.2, z, color: '#6aa87a', mat: m.satin });
    }
    // the lullaby parcel on a desk
    const parcelMesh = new THREE.Mesh(roundedGeo(0.5, 0.36, 0.4, 0.05, 2), glowMat('#c8b6ff', 1.6));
    parcelMesh.position.set(OX + 7.6, 0.98, -22.2);
    lv.root.add(parcelMesh);
    let hasLullaby = false;
    lv.interact(OX + 7.6, 1, -22.2, "Take the parcel labelled 'LULLABY'", async () => {
      hasLullaby = true;
      parcelMesh.visible = false;
      lv.parcel('#c8b6ff');
      lv.game.audio.chime(0.9);
      await lv.say(['Ori', "(“LULLABY — for the residents of the Long Hall.” Addressed in my handwriting.)", 'scared']);
      lv.objective('Reach the elevator at the far end', [OX, 0, OZ0 + 3]);
    }, { radius: 1.8, once: true });
    // lost couriers
    lv.courier([[OX, 0, 10], [OX, 0, -40], [OX, 0, 10]], { range: 9, speed: 1.4 });
    lv.courier([[OX - 18, 0, -20], [OX + 18, 0, -20]], { range: 8.5, speed: 1.6 });
    lv.courier([[OX + 14, 0, -50], [OX + 14, 0, -64], [OX - 14, 0, -64], [OX - 14, 0, -50]], { range: 9, speed: 1.3 });
    // elevator
    b.box({ x: OX, y: 1.4, z: OZ0 + 0.1, w: 2.4, h: 2.8, d: 0.2, color: '#c8a050', mat: m.metal, collide: false });
    sign(lv, '▼ 0', OX, 3.1, OZ0 + 0.25, 0.8, 0.3, 0, { bg: '#1a1a1a', fg: '#ff6a5a', glow: 1.5 });
    let rode = false;
    lv.interact(OX, 1.2, OZ0 + 1, () => (hasLullaby ? 'Call the elevator' : 'Call the elevator (you feel you should take the parcel)'), async () => {
      rode = true;
      lv.lock(true);
      lv.game.audio.door();
      await lv.game.ui.fade(true, true);
      enterApartments();
      await lv.game.ui.fade(false);
      lv.lock(false);
      await lv.say(['Ori', '(Floor 0. This hallway smells like rain on carpet.)', 'worried']);
      lv.objective('Find Room 0 — the residents are not asleep', [AX, 0, -54]);
    }, { radius: 2, once: true, enabled: () => hasLullaby && !rode });
    lv.stamp('c5-water-cooler', OX0 + 1, 1.6, 12);
    lv.stamp('c5-office-corner', OX1 - 2, 0, OZ0 + 2.5);

    // sunset city beyond the windows (distant layer)
    for (let i = 0; i < 40; i++) {
      const z = OZ0 - 200 + i * 14 + rnd() * 6;
      const x = OX1 + 40 + rnd() * 160;
      tower(b, x, -40, z, 12 + rnd() * 10, 12 + rnd() * 10, 50 + rnd() * 90, { color: '#6a4a5a', windows: '#ffc08a', lit: 0.4, layer: 'far', seed: i });
    }
    repeatingRooms(b, OX0 - 120, OZ0 - 60, 5, 8, 22, 3.6, 0, '#c8bca8');

    // =================== C. Apartment hallway + Room 0 ===================
    const AX = 320;
    const aCarpet = m.tex('aptCarpet', Tex.carpet('#3a5a44', 'apt'), { roughness: 1 });
    shell(b, AX - 2.5, -60, AX + 2.5, 6, 0, 3.0, { floorMat: aCarpet, wallColor: '#c8c8a8', ceilColor: '#d8d8c0', surface: 'carpet', baseboard: '#3a3a2a', lights: { spacing: 9, color: '#e6ffd0', w: 0.6, d: 0.6 } });
    for (let z = 2; z > -56; z -= 5) {
      door(b, AX - 2.49, 0, z, Math.PI / 2, { color: '#4a5a4a', frame: '#c8c8a8', w: 0.95 });
      door(b, AX + 2.49, 0, z - 2.5, -Math.PI / 2, { color: '#4a5a4a', frame: '#c8c8a8', w: 0.95 });
    }
    const statics: StaticFigure[] = [];
    for (const [x, z] of [[AX - 1, -18], [AX + 1.2, -30], [AX - 0.8, -42]] as const) statics.push(lv.staticFigure(x, 0, z, 0));
    lv.onPulse((o) => {
      if (!hasLullaby) return;
      for (const s of statics) {
        if (!s.calmed && s.position.distanceTo(o) < 8) {
          s.calmed = true;
          lv.game.vfx.emit(s.position.clone().setY(1.6), 30, { color: '#c8b6ff', color2: '#ffffff', speed: 1.5, up: 0.5, life: 2, size: 0.2 });
        }
      }
    });
    lv.trigger(AX, 1, -8, 5, 4, 3, () => void lv.say(['Ori', '(They\'re humming. The same three notes. ...The lullaby. Pulse it to them.)', 'determined']).then(() => lv.toast('Dream Pulse (Q) near them to lull them to sleep')));
    // Room 0
    door(b, AX, 0, -59.9, 0, { color: '#e8e2d0', frame: '#3a3a2a', w: 1.1 });
    sign(lv, '0', AX, 2.55, -59.82, 0.4, 0.4, 0, { bg: '#e8c27a', fg: '#2a1a1a', glow: 1.1 });
    let opened = false;
    lv.interact(AX, 1.1, -59, 'Open Room 0', async () => {
      opened = true;
      lv.lock(true);
      lv.cine([AX + 1.6, 1.9, -55.5], [AX, 1.2, -59], 48);
      await lv.say(
        ['Ori', '(No one answers. The door is unlocked. The parcel is warm — it wants to be here.)', 'worried'],
        ['Ori', "(The address on it isn't a room at all. It says: “To Ori. Care of the Route.”)", 'scared'],
        ['Ori', '(Inside... a courier badge. Mine. The same star. But it\'s old — scuffed, faded, years old.)', 'sad'],
        ['Ori', "(I got this badge last week. Didn't I?)", 'scared'],
        ['Voice', '...you always open this one. every time.'],
        ['Ori', 'Who said that?!', 'scared'],
      );
      lv.flash('#000000', 0.9);
      lv.game.audio.rumble(2.5);
      lv.shake(0.7);
      await lv.wait(0.5);
      await lv.say(['Ori', '(The floor — it\'s opening—)', 'scared']);
      lv.complete();
    }, { radius: 1.8, once: true, enabled: () => !opened });

    // region switching (look/atmosphere per area)
    const enterOffice = () => {
      lv.player.teleport(new THREE.Vector3(OX, 0, OZ1 - 3), Math.PI);
      lv.game.camRig.snap(lv.player.pos, 0);
      lv.setLook(OFFICE, 0.01);
      lv.game.saveCheckpoint(officeCp);
      lv.cpIndex = officeCp;
    };
    const enterApartments = () => {
      lv.player.teleport(new THREE.Vector3(AX, 0, 3), Math.PI);
      lv.game.camRig.snap(lv.player.pos, 0);
      lv.setLook(APART, 0.01);
      lv.cpIndex = aptCp;
      lv.game.saveCheckpoint(aptCp);
    };
    const officeCp = lv.checkpoint(OX, 0, OZ1 - 3, Math.PI, {
      objective: 'Find the parcel and reach the elevator — stay out of the lantern light (C to sneak)',
      waypoint: new THREE.Vector3(OX, 0, OZ0 + 3),
      restore: () => { doorTaken = true; lamp.visible = false; lv.setLook(OFFICE, 0.01); },
      radius: 0.1,
    });
    const aptCp = lv.checkpoint(AX, 0, 3, Math.PI, {
      objective: 'Find Room 0 — the residents are not asleep',
      waypoint: new THREE.Vector3(AX, 0, -54),
      restore: () => { hasLullaby = true; rode = true; parcelMesh.visible = false; lv.parcel('#c8b6ff'); lv.setLook(APART, 0.01); },
      radius: 0.1,
    });
    lv.onRespawn(() => {
      for (const s of statics) if (!s.calmed) s.reset();
      if (lv.cpIndex === aptCp) lv.setLook(APART, 0.01);
      else if (lv.cpIndex === officeCp) lv.setLook(OFFICE, 0.01);
    });
  },
};
