import * as THREE from 'three';
import type { ChapterDef } from '../game/types';
import type { Level } from '../game/Level';
import { look } from '../render/Atmosphere';
import { Tex } from '../render/Textures';
import { boxGeo, puffGeo, roundedGeo } from '../world/Geo';
import { shell } from '../world/Interior';
import { audio, glowMat, sign, solidMat, STYLES } from './common';
import { createSeededRandom } from '../core/rng';

const LOOK = look({
  sky: { top: '#0a1418', mid: '#16262a', sun: '#000000', cloudCover: 0, seaAmount: 0, ceiling: 1, stars: 0 },
  fog: { color: '#12262a', sun: '#1a3a3a', low: '#060c10', density: 0.022, base: 0, falloff: 0.004, heightMix: 0.2, max: 0.96 },
  sunDir: [0.2, 1, 0.1],
  sunColor: '#9fe8ff',
  sunIntensity: 0.35,
  hemiSky: '#7ad8e8',
  hemiGround: '#3a2418',
  hemiIntensity: 0.75,
  rimColor: '#7ae8ff',
  rimStrength: 0.35,
  envIntensity: 0.4,
  dread: 0.6,
  shadows: false,
  post: { bloom: 1.15, bloomThreshold: 0.65, warp: 0.5, edgeBlur: 0.7, desat: 0.1, grain: 0.14, vignette: 0.6, lift: 0.08, shadowTint: '#9ad8e0', highlightTint: '#ffe0b8', contrast: 1.15, exposure: 1, glitch: 0 },
  motes: { kind: 'embers', color: '#ffb070', density: 0.5 },
});

export const ch06: ChapterDef = {
  id: 5,
  key: 'below-the-route',
  title: 'Below the Route',
  subtitle: 'Where used dreams go to be used again.',
  uiDread: 2,
  oriDread: 0.62,
  parcelColor: '#ffb070',
  look: LOOK,
  audio: audio({
    chords: [[45, 52, 57, 60], [43, 50, 55, 58], [41, 48, 53, 57], [44, 51, 56, 59]],
    chordDur: 9,
    padType: 'sawtooth',
    padGain: 0.35,
    bellGain: 0.25,
    arpEvery: 2.2,
    wobble: 0.12,
    pitch: 0.94,
    lowpass: 1400,
    reverb: 0.9,
    machine: 0.8,
    drone: 0.35,
    room: 0.3,
  }),
  build(lv: Level) {
    const b = lv.b;
    const m = lv.mats;
    lv.killY = -26;
    const conc = m.tex('concrete', Tex.concrete('#6a7a7c'), { roughness: 0.95 });
    const rnd = createSeededRandom(66);
    const grate = m.metal;

    const pipe = (x: number, y: number, z: number, len: number, axis: 'x' | 'z' | 'y', r = 0.3, color = '#8a5a3a') => {
      const g = new THREE.CylinderGeometry(r, r, len, 12);
      if (axis === 'x') g.rotateZ(Math.PI / 2);
      if (axis === 'z') g.rotateX(Math.PI / 2);
      b.add(g, { x, y, z, color, mat: m.metal, shadow: false });
      for (let k = -len / 2 + 1; k < len / 2; k += 4) {
        const ring = new THREE.CylinderGeometry(r * 1.25, r * 1.25, 0.2, 12);
        if (axis === 'x') ring.rotateZ(Math.PI / 2);
        if (axis === 'z') ring.rotateX(Math.PI / 2);
        b.add(ring, { x: axis === 'x' ? x + k : x, y: axis === 'y' ? y + k : y, z: axis === 'z' ? z + k : z, color: '#5a4a3a', mat: m.metal, shadow: false });
      }
    };
    const workLight = (x: number, y: number, z: number) => {
      b.add(roundedGeo(0.9, 0.25, 0.35, 0.06, 1), { x, y, z, color: '#9fefff', mat: m.glow, shadow: false, ao: 0 });
      b.add(boxGeo(1.0, 0.1, 0.45), { x, y: y + 0.17, z, color: '#2a3a3a', shadow: false });
    };

    // =================== 1. Conveyor tunnel ===================
    shell(b, -5, -92, 5, 6, 0, 7, { floorMat: conc, wallMat: conc, ceilMat: conc, floorColor: '#ffffff', wallColor: '#ffffff', ceilColor: '#aaaaaa', surface: 'metal', openings: [{ side: 'n', from: -2.5, to: 2.5, h: 4 }] });
    // broken floor gap (the conveyor bridges it)
    // (floor is a single slab from the shell; carve a pit by overriding with a hole: disable shell floor collider region)
    lv.setStart(-2, 0, 2, Math.PI);
    pipe(-4.4, 6, -43, 98, 'z', 0.35);
    pipe(-3.6, 6.4, -43, 98, 'z', 0.2, '#4a7a8a');
    pipe(4.5, 6.2, -43, 98, 'z', 0.25, '#7a6a5a');
    for (let z = 0; z > -90; z -= 10) {
      workLight(-4.6, 4.2, z);
      b.add(boxGeo(0.1, 1.2, 2), { x: 4.95, y: 3.4, z: z - 5, color: '#1a2a2a', shadow: false });
      b.add(boxGeo(0.06, 0.9, 1.6), { x: 4.9, y: 3.4, z: z - 5, color: '#ffb070', mat: m.softGlow, shadow: false, ao: 0 });
    }
    // conveyor: x 2..4.5, top 0.7, moves -z at 1.9 m/s
    const CONV_SPEED = 1.9;
    b.box({ x: 3.25, y: 0.35, z: -43, w: 2.5, h: 0.7, d: 94, color: '#2a2a2e', mat: m.satin, collide: false });
    for (let z = 3; z > -90; z -= 1.2) b.add(boxGeo(2.4, 0.04, 0.08), { x: 3.25, y: 0.72, z, color: '#4a4a52', shadow: false });
    const belt = b.physics.addBox(3.25, 0.35, -43, 2.5, 0.7, 94, { surface: 'metal', climbable: true });
    belt.delta = new THREE.Vector3();
    // the pit (blocks the walkway between z -44 and -52)
    const pitMat = solidMat('#020406', 1);
    const pit = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 8), pitMat);
    pit.rotation.x = -Math.PI / 2;
    pit.position.set(-1.75, 0.02, -48);
    lv.root.add(pit);
    // replace floor collider with two pieces around the pit
    const floorCol = lv.game.physics.colliders.find((c) => c.max.y === 0 && c.min.x === -5 && c.max.x === 5 && c.min.z === -92);
    if (floorCol) floorCol.enabled = false;
    b.physics.addBox(0, -0.25, -19, 10, 0.5, 50, { surface: 'metal' });
    b.physics.addBox(0, -0.25, -72, 10, 0.5, 40, { surface: 'metal' });
    b.physics.addBox(3.25, -0.25, -48, 3.5, 0.5, 8, { surface: 'metal' });
    for (const x of [-5, 1.5]) b.add(boxGeo(0.2, 0.3, 8), { x, y: 0.15, z: -48, color: '#ffd46b', mat: m.satin, shadow: false });
    sign(lv, 'CAUTION · OPEN SHAFT', -1.8, 2.4, -43.6, 3, 0.5, 0, { bg: '#ffd46b', fg: '#1a1a1a', glow: 1 });
    // fragments of old dreams riding the belt
    const fragG = [roundedGeo(0.5, 0.45, 0.5, 0.08, 2), puffGeo(1, 1), new THREE.ConeGeometry(0.35, 0.5, 4), roundedGeo(0.45, 0.45, 0.45, 0.06, 2)];
    const fragCols = ['#ffd9e2', '#ffffff', '#8e7cc3', '#9fc8ff', '#ffd46b', '#ff9fb2'];
    const frags: THREE.Mesh[] = [];
    for (let i = 0; i < 46; i++) {
      const mesh = new THREE.Mesh(fragG[i % 4], solidMat(fragCols[i % fragCols.length], 0.6, { emissive: fragCols[i % fragCols.length], emissiveIntensity: 0.35 }));
      mesh.position.set(2.6 + rnd() * 1.3, 0.95, 3 - i * 2.05);
      mesh.rotation.y = rnd() * 3;
      if (i % 4 === 1) mesh.scale.setScalar(0.35);
      lv.root.add(mesh);
      frags.push(mesh);
    }
    // crates to vault
    for (const z of [-14, -30, -64]) b.box({ x: -1.5, y: 0.5, z, w: 2.2, h: 1.0, d: 1.0, r: 0.06, color: '#8a6a4a', surface: 'wood' });
    // memory parcel at the belt's end
    const memParcel = new THREE.Mesh(roundedGeo(0.55, 0.4, 0.45, 0.06, 2), glowMat('#ffb070', 1.6));
    memParcel.position.set(-3.2, 1.2, -86);
    lv.root.add(memParcel);
    b.box({ x: -3.2, y: 0.5, z: -86, w: 1.4, h: 1, d: 1.4, color: '#4a5a5a', mat: m.metal });
    let hasMemory = false;
    lv.interact(-3.2, 1.2, -86, "Take the parcel marked 'RETURN TO SENDER'", async () => {
      hasMemory = true;
      memParcel.visible = false;
      lv.parcel('#ffb070');
      lv.game.audio.chime(0.7);
      await lv.say(['Ori', "(“MEMORY — RETURN TO SENDER.” The sender is the Route. There's a name in the corner: Pell.)", 'curious']);
      lv.objective('Find Pell — cross the shaft', [0, 12, -156]);
    }, { radius: 2, once: true });
    lv.husk(0, 0, -70, 0, 0.9);
    lv.husk(-2, 0, -76, 0, 0.9);
    lv.stamp('c6-belt-end', 3.25, 0.7, -89);
    lv.checkpoint(0, 0, -56, Math.PI, { objective: 'Follow the conveyor', waypoint: new THREE.Vector3(-3.2, 0, -86) });
    lv.trigger(0, 1, -36, 10, 4, 3, () => lv.say(['Ori', "(The belt is carrying... little houses. Clouds. Toy blocks. Pieces of dreams I've walked through.)", 'scared']));

    // =================== 2. The Great Shaft ===================
    const SC = new THREE.Vector3(0, 0, -128);
    const R = 24;
    // shaft wall (near layer, huge)
    for (const [t0, len] of [[0.16, Math.PI - 0.32], [Math.PI + 0.16, Math.PI - 0.32]] as const) {
      const wallGeo = new THREE.CylinderGeometry(R + 1, R + 1, 120, 40, 1, true, t0, len);
      b.add(wallGeo, { x: SC.x, y: 10, z: SC.z, color: '#3a4a4c', mat: conc, shadow: false, layer: 'near', ao: 0.5 });
    }
    for (let y = -40; y < 60; y += 7) b.add(new THREE.TorusGeometry(R + 0.6, 0.25, 6, 48), { x: SC.x, y, z: SC.z, rx: Math.PI / 2, color: '#5a4a3a', mat: m.metal, shadow: false, layer: 'near' });
    // entrance landing
    b.box({ x: 0, y: -0.25, z: -98, w: 6, h: 0.5, d: 12, color: '#5a5a5a', mat: grate, surface: 'metal' });
    // ring catwalk: round grates from the south entrance, around the west wall, up to the north exit
    const segs = 12;
    const RC = R - 2.2;
    const catwalks: Array<{ x: number; z: number; y: number }> = [];
    for (let i = 0; i <= segs; i++) {
      const phi = (i / segs) * Math.PI;
      const x = SC.x - Math.sin(phi) * RC;
      const z = SC.z + Math.cos(phi) * RC;
      const y = Math.min(12, i * 1.05);
      catwalks.push({ x, y, z });
      if (i === 9) continue; // the cargo lift sits here
      const rad = i === 5 ? 1.5 : 2.45;
      b.add(new THREE.CylinderGeometry(rad, rad, 0.35, 20), { x, y: y - 0.175, z, color: '#6a6a6a', mat: grate });
      b.add(new THREE.TorusGeometry(rad, 0.06, 6, 24), { x, y: y + 0.02, z, rx: Math.PI / 2, color: '#ffb070', mat: m.metal, shadow: false });
      b.physics.addBox(x, y - 0.175, z, rad * 1.5, 0.35, rad * 1.5, { surface: 'metal' });
      b.add(new THREE.CylinderGeometry(0.12, 0.12, 40, 6), { x, y: y - 20.3, z, color: '#3a3a3a', mat: m.metal, shadow: false });
    }
    // fill the gap between the entrance landing and first catwalk
    b.box({ x: 0, y: -0.2, z: -104.5, w: 4, h: 0.4, d: 3, color: '#6a6a6a', mat: grate, surface: 'metal' });
    // moving cargo lift at the west side (bridges segment 9's gap vertically)
    const lift = b.mesh(roundedGeo(3.6, 0.5, 3.6, 0.1, 2), grate, { x: catwalks[9].x, y: catwalks[8].y, z: catwalks[9].z, color: '#8a7a5a' });
    const liftP = lv.movingPlatform(lift, 3.6, 0.5, 3.6, 'metal');
    // exit tunnel at north
    b.box({ x: 0, y: 11.75, z: -156, w: 6, h: 0.5, d: 10, color: '#5a5a5a', mat: grate, surface: 'metal' });
    // column of recycled dreams rising through the centre
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 160, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#ffd6a0', transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.set(SC.x, 20, SC.z);
    lv.root.add(beam);
    const risers: THREE.Mesh[] = [];
    for (let i = 0; i < 60; i++) {
      const mesh = new THREE.Mesh(fragG[i % 4], glowMat(fragCols[i % fragCols.length], 1.4));
      const a = rnd() * Math.PI * 2;
      const r = rnd() * 4;
      mesh.position.set(SC.x + Math.cos(a) * r, -60 + rnd() * 140, SC.z + Math.sin(a) * r);
      mesh.scale.setScalar(0.6 + rnd() * 1.4);
      lv.root.add(mesh);
      risers.push(mesh);
    }
    // giant gears in the walls
    const gears: THREE.Mesh[] = [];
    for (const [ang, y, s] of [[0.3, 30, 9], [2.2, -10, 12], [4.1, 20, 7], [5.2, 45, 14]] as const) {
      const g = new THREE.Mesh(new THREE.TorusGeometry(s, s * 0.18, 8, 24), solidMat('#6a5a4a', 0.5, { metalness: 0.7 }));
      for (let t = 0; t < 12; t++) {
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(s * 0.25, s * 0.35, s * 0.3), g.material as THREE.Material);
        const ta = (t / 12) * Math.PI * 2;
        tooth.position.set(Math.cos(ta) * s * 1.15, Math.sin(ta) * s * 1.15, 0);
        tooth.rotation.z = ta;
        g.add(tooth);
      }
      g.position.set(SC.x + Math.cos(ang) * (R + 2), y, SC.z + Math.sin(ang) * (R + 2));
      g.lookAt(SC.x, y, SC.z);
      lv.root.add(g);
      gears.push(g);
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      workLight(SC.x + Math.cos(a) * (R + 0.2), 4 + (i % 3) * 9, SC.z + Math.sin(a) * (R + 0.2));
    }
    b.box({ x: catwalks[6].x + 4.0, y: catwalks[6].y + 1.0, z: catwalks[6].z, w: 2, h: 0.4, d: 2, color: '#6a6a6a', mat: grate, surface: 'metal' });
    lv.stamp('c6-shaft-ledge', catwalks[6].x + 4.0, catwalks[6].y + 1.2, catwalks[6].z);
    lv.checkpoint(0, 0, -100, Math.PI, { objective: 'Climb the catwalks around the shaft', waypoint: new THREE.Vector3(0, 12, -156), restore: () => { hasMemory = true; memParcel.visible = false; lv.parcel('#ffb070'); } });

    // =================== 3. Sorting hall + Pell ===================
    const SY = 12;
    shell(b, -30, -232, 30, -161, SY, 14, { floorMat: conc, wallMat: conc, floorColor: '#ffffff', wallColor: '#ffffff', ceilColor: '#3a4a4c', surface: 'metal', openings: [{ side: 's', from: -3, to: 3, h: 4 }], lights: { spacing: 10, color: '#b8f6ff', w: 2, d: 0.4 } });
    b.box({ x: 0, y: SY - 0.25, z: -158.5, w: 6, h: 0.5, d: 5, color: '#5a5a5a', mat: grate, surface: 'metal' });
    // shelving walls of parcels
    for (const x of [-28.6, 28.6]) {
      b.box({ x, y: SY + 5, z: -196, w: 2, h: 10, d: 66, color: '#4a4a4a', mat: m.metal, collide: true, climbable: false });
      for (let y = 0; y < 5; y++)
        for (let z = -228; z < -164; z += 1.6) {
          if (rnd() > 0.75) continue;
          b.add(roundedGeo(1.2, 1.0, 1.2, 0.05, 1), { x: x + (x < 0 ? 0.6 : -0.6), y: SY + 0.8 + y * 2, z, color: ['#b98a58', '#c99a68', '#a87a48'][Math.floor(rnd() * 3)], shadow: false });
        }
    }
    // sorting machines + cross conveyors
    for (const [x, z] of [[-14, -180], [14, -180], [-14, -212], [14, -212]] as const) {
      b.box({ x, y: SY + 2, z, w: 6, h: 4, d: 6, r: 0.2, color: '#4a6a6a', mat: m.metal });
      b.add(boxGeo(5, 0.3, 0.1), { x, y: SY + 3.4, z: z + 3.05, color: '#7affd0', mat: m.glow, shadow: false });
      b.add(new THREE.CylinderGeometry(0.8, 0.8, 2, 12), { x, y: SY + 5, z, color: '#6a5a4a', mat: m.metal });
    }
    for (const z of [-196]) {
      b.box({ x: 0, y: SY + 0.35, z, w: 50, h: 0.7, d: 2.2, color: '#2a2a2e', mat: m.satin });
    }
    const cross = lv.game.physics.colliders[lv.game.physics.colliders.length - 1];
    cross.delta = new THREE.Vector3();
    // patrols + husks
    lv.courier([[-20, SY, -170], [-20, SY, -225], [-20, SY, -170]], { range: 9, speed: 1.4 });
    lv.courier([[20, SY, -225], [20, SY, -170], [20, SY, -225]], { range: 9, speed: 1.5 });
    lv.husk(-3, SY, -205, 0, 1);
    lv.husk(4, SY, -208, 0, 1);
    lv.husk(0, SY, -214, 0, 1.1);
    // Pell
    b.box({ x: -6, y: SY + 0.5, z: -222, w: 3, h: 1, d: 1.4, color: '#5a4a3a', mat: m.satin });
    const pell = lv.resident({ name: 'Pell', style: { ...STYLES.worker('#5a5f6e'), hat: 'courier', hatColor: '#3a3d4e', material: 'faded', scale: 1.05, face: 'simple', hair: '#aaaaaa' }, pos: [-6, SY, -223.4], facing: 0, behavior: 'sit', voice: 300, oblivious: true, bark: ['...sorted... sorted... returned...'] });
    let remembered = false;
    lv.anchor(-3, SY, -220.5, '#ffb070', 'Pell', async () => {
      remembered = true;
      pell.def.oblivious = false;
      pell.def.bark = undefined;
      pell.talking = true;
      lv.cine([-2.5, SY + 2.6, -216.5], [-6, SY + 1.4, -222.5], 44);
      await lv.say(
        ['Pell', '...oh. Oh. I remember my name.'],
        ['Pell', 'Pell. I was a courier. Like you. I carried the very first parcels, when the Route was new and the dreams came in by the thousand.'],
        ['Ori', "What happened to you? What's happening to all of this?", 'worried'],
        ['Pell', 'The dreams stopped coming. Out there — in the waking world — people stopped dreaming new things. Too tired. Too lit-up. Too afraid to close their eyes.'],
        ['Pell', "But the Route can't stop. If it stops, everyone up there wakes into nothing. So it started... reusing."],
        ['Pell', "Old rooms. Old malls. Hallways nobody walked. Stitched together, sent back up the conveyors, delivered again and again. It holds the shape of dreaming even when nobody's inside."],
        ['Ori', "That's why the parcels arrive open. They've already been delivered. Lots of times.", 'scared'],
        ['Pell', "And that's why there's a badge in your bag older than you think you are."],
        ['Pell', "Go up to the Sleeping Sea. It's where the old memories settle. The Route wants one last delivery made at its heart — and you're the only courier left who still remembers how."],
        ['Ori', '...Okay. Okay.', 'determined'],
      );
      lv.cineEnd();
      pell.talking = false;
      lv.objective('Take the cargo lift up to the Sleeping Sea', [0, SY, -229]);
    }, { enabled: () => hasMemory });
    lv.checkpoint(0, SY, -164, Math.PI, { objective: 'Find Pell — beware the patrols', waypoint: new THREE.Vector3(-6, SY, -222), restore: () => { hasMemory = true; memParcel.visible = false; lv.parcel('#ffb070'); } });
    lv.stamp('c6-sorting-machine', 14, SY + 4, -212);
    // cargo lift exit
    b.box({ x: 0, y: SY + 0.1, z: -229, w: 5, h: 0.2, d: 4, color: '#ffd46b', mat: m.satin, collide: false });
    sign(lv, 'CARGO LIFT · UP', 0, SY + 4, -231.7, 3, 0.5, 0, { bg: '#ffd46b', fg: '#1a1a1a', glow: 1 });
    lv.interact(0, SY + 1, -229, 'Ride the cargo lift', async () => {
      lv.lock(true);
      lv.game.audio.rumble(3);
      lv.shake(0.3);
      lv.cine([3, SY + 3, -223], [0, SY + 6, -229], 55);
      await lv.wait(1.4);
      lv.complete();
    }, { radius: 2.4, once: true, enabled: () => remembered });

    // =================== runtime ===================
    lv.onUpdate((dt, t) => {
      belt.delta!.set(0, 0, -CONV_SPEED * dt);
      cross.delta!.set(2.2 * dt, 0, 0);
      for (const f of frags) {
        f.position.z -= CONV_SPEED * dt;
        if (f.position.z < -90) f.position.z += 94;
      }
      for (const r of risers) {
        r.position.y += dt * (2 + (r.scale.x % 1) * 2);
        r.rotation.y += dt * 0.5;
        if (r.position.y > 90) r.position.y = -60;
      }
      for (const g of gears) g.rotateZ(dt * 0.15);
      // lift: bob between catwalk 8 and 10 heights
      const k = (Math.sin(t * 0.6) + 1) / 2;
      liftP.move(catwalks[9].x, catwalks[8].y - 0.25 + k * (catwalks[10].y - catwalks[8].y), catwalks[9].z);
      memParcel.rotation.y += dt;
    });

    lv.intro = async () => {
      lv.lock(true);
      lv.cine([-3, 2.5, 5], [2, 1, -20], 60);
      await lv.wait(1);
      await lv.say(
        ['Ori', '(Down. All the way down. Under the floor of the dream.)', 'scared'],
        ['Ori', "(Pipes, belts, machines. It's warm, and it hums, like something very big breathing in its sleep.)", 'worried'],
      );
      lv.cineEnd();
      lv.lock(false);
      lv.objective('Follow the conveyor', [-3.2, 0, -86]);
    };
  },
};
