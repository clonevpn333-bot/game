import * as THREE from 'three';
import type { ChapterDef } from '../game/types';
import type { Level } from '../game/Level';
import { look } from '../render/Atmosphere';
import { Tex } from '../render/Textures';
import { boxGeo, roundedGeo } from '../world/Geo';
import { bench, cloudIsland, flowers, house, lamp, tree } from '../world/Kit';
import { pillar } from '../world/Interior';
import { audio, cloudField, glowMat, STYLES } from './common';
import { createSeededRandom } from '../core/rng';
import type { Sleepless } from '../entities/Actors';
import { dreamUniforms } from '../render/DreamShading';

const LOOK = look({
  sky: { top: '#06040e', mid: '#1a1230', sun: '#ffffff', sunSize: 6, cloudLit: '#6a5a9a', cloudShade: '#120c22', cloudCover: 0.6, seaLit: '#3a2a5a', seaShade: '#06040e', seaAmount: 0.7, stars: 0.6, grid: 0.2 },
  fog: { color: '#1a1430', sun: '#e8e4ff', low: '#06040e', density: 0.008, base: -5, falloff: 0.01, heightMix: 0.3, max: 0.9 },
  sunDir: [0, 0.12, -1],
  sunColor: '#e8e4ff',
  sunIntensity: 1.4,
  hemiSky: '#8a7ac8',
  hemiGround: '#1a1030',
  hemiIntensity: 0.75,
  rimColor: '#e8e4ff',
  rimStrength: 0.6,
  envIntensity: 0.5,
  wobble: 0.02,
  dread: 1,
  post: { bloom: 1.2, bloomThreshold: 0.6, warp: 0.9, edgeBlur: 0.9, desat: 0.2, grain: 0.2, vignette: 0.65, lift: 0.06, shadowTint: '#a89ae8', highlightTint: '#f6f0ff', contrast: 1.18, exposure: 1, glitch: 0.06 },
  motes: { kind: 'embers', color: '#e8e4ff', density: 0.6 },
});

const RESTORED = look({
  sky: { top: '#7fa6ff', mid: '#ffc6dc', sun: '#fff1d2', sunSize: 1.4, cloudLit: '#fff8f2', cloudShade: '#d9bfe6', cloudCover: 0.45, seaLit: '#fff6f0', seaShade: '#c7b2e6' },
  fog: { color: '#ffcfe0', sun: '#ffe2b8', low: '#c9b2ee', density: 0.0045, base: 6, falloff: 0.02, heightMix: 0.6, max: 0.9 },
  sunDir: [0.3, 0.4, -0.88],
  sunColor: '#ffd9b8',
  sunIntensity: 2.2,
  hemiSky: '#e2d4ff',
  hemiGround: '#ffb8cc',
  hemiIntensity: 0.9,
  rimColor: '#ffe6f2',
  rimStrength: 0.4,
  envIntensity: 0.5,
  dread: 0,
  post: { bloom: 0.8, bloomThreshold: 0.8, warp: 0.5, edgeBlur: 0.7, desat: 0, grain: 0.05, vignette: 0.35, lift: 0.18, shadowTint: '#d9c4ff', highlightTint: '#fff1e0', contrast: 1.1, exposure: 1, glitch: 0 },
  motes: { kind: 'petals', color: '#ffd0e4', density: 0.8 },
});

const WAKING = look({
  sky: { top: '#a8c8f0', mid: '#ffe6c8', sun: '#fff2d8', sunSize: 2, cloudCover: 0.2, ceiling: 0.9, seaAmount: 0 },
  fog: { color: '#f2e8dc', sun: '#fff2d8', low: '#e8dcd0', density: 0.002, base: 0, falloff: 0.01, heightMix: 0, max: 0.6 },
  sunDir: [0.9, 0.35, -0.2],
  sunColor: '#ffe6c8',
  sunIntensity: 2.8,
  hemiSky: '#f2ecff',
  hemiGround: '#e8d8c8',
  hemiIntensity: 0.8,
  rimColor: '#ffffff',
  rimStrength: 0.05,
  envIntensity: 0.4,
  dread: 0,
  post: { bloom: 0.6, bloomThreshold: 0.85, warp: 0, edgeBlur: 0.2, desat: 0.05, grain: 0.04, vignette: 0.25, lift: 0.1, shadowTint: '#f2ece6', highlightTint: '#fff6ec', contrast: 1.05, exposure: 1, glitch: 0 },
  motes: { kind: 'dust', color: '#fff6e0', density: 0.4 },
});

export const ch10: ChapterDef = {
  id: 9,
  key: 'sleepless-core',
  title: 'The Sleepless Core',
  subtitle: 'The heart of the Route. It has been waiting for its courier.',
  uiDread: 3,
  oriDread: 0.85,
  parcelColor: '#ffffff',
  look: LOOK,
  audio: audio({
    chords: [[38, 45, 50, 53, 57], [36, 43, 48, 52, 55], [41, 48, 53, 56, 60], [40, 47, 52, 55, 59]],
    chordDur: 10,
    padType: 'sawtooth',
    padGain: 0.4,
    bellGain: 0.7,
    arpEvery: 1.2,
    wobble: 0.2,
    pitch: 0.95,
    lowpass: 1800,
    reverb: 1,
    drone: 0.6,
    wind: 0.4,
  }),
  build(lv: Level) {
    const b = lv.b;
    const m = lv.mats;
    lv.killY = -18;
    const rnd = createSeededRandom(1010);
    const marble = m.tex('marble', Tex.mallTile('#2a2440', '#3a3258'), { roughness: 0.12 });

    // =================== 1. collapsed sky-lobby ===================
    b.box({ x: 0, y: -0.25, z: -15, w: 40, h: 0.5, d: 50, mat: marble, color: '#ffffff', surface: 'tile' });
    for (const x of [-14, 14])
      for (let z = 4; z >= -36; z -= 10) {
        const hgt = 4 + rnd() * 18;
        pillar(b, x, 0, z, hgt, { r: 0.9, color: '#3a3258' });
        if (hgt < 10) b.box({ x: x + (rnd() - 0.5) * 3, y: 0.6, z: z - 2, w: 1.6, h: 1.2, d: 2.6, ry: rnd(), r: 0.2, color: '#3a3258' });
      }
    b.box({ x: 0, y: 0.6, z: -6, w: 8, h: 1.2, d: 1.6, r: 0.1, color: '#2a2440', mat: m.satin });
    b.add(boxGeo(7, 0.08, 0.1), { x: 0, y: 1.0, z: -5.15, color: '#e8e4ff', mat: m.glow, shadow: false });
    // fallen chandelier
    b.add(new THREE.TorusGeometry(2.4, 0.15, 6, 24), { x: -5, y: 0.3, z: -20, rx: Math.PI / 2 + 0.2, color: '#c8b8e8', mat: m.metal });
    for (let i = 0; i < 10; i++) b.add(new THREE.OctahedronGeometry(0.25), { x: -5 + Math.cos(i) * 2.4, y: 0.4, z: -20 + Math.sin(i) * 2.4, color: '#e8e4ff', mat: m.glow, shadow: false });
    // broken ceiling slabs high above
    for (let i = 0; i < 8; i++) b.box({ x: (rnd() - 0.5) * 40, y: 26 + rnd() * 6, z: -15 + (rnd() - 0.5) * 40, w: 6 + rnd() * 8, h: 1, d: 6 + rnd() * 8, rx: (rnd() - 0.5) * 0.6, rz: (rnd() - 0.5) * 0.6, color: '#2a2440', layer: 'near', collide: false });
    lv.setStart(0, 0, 6, Math.PI);

    // =================== 2. the collapsing route ===================
    const tiles: Array<{ mesh: THREE.Mesh; col: ReturnType<typeof b.physics.addBox>; base: THREE.Vector3; state: 'ok' | 'shaking' | 'falling'; t: number }> = [];
    const N = 56;
    let tz = -42;
    let ty = 0;
    for (let i = 0; i < N; i++) {
      const x = Math.sin(i * 0.35) * 5;
      ty = Math.max(-1.5, Math.min(3, ty + (rnd() - 0.45) * 0.8));
      if (i > N - 7) ty = Math.max(0.4, ty);
      const mesh = b.mesh(roundedGeo(3.2, 0.6, 3.2, 0.12, 2), m.satin, { x, y: ty - 0.3, z: tz, color: i % 7 === 0 ? '#e8e4ff' : '#4a3a7a', top: '#8a7ac8' });
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.8, 1.6), transparent: true, opacity: 0.25, toneMapped: false, depthWrite: false }));
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.31;
      mesh.add(glow);
      const col = b.physics.addBox(x, ty - 0.3, tz, 3.2, 0.6, 3.2, { surface: 'stone' });
      tiles.push({ mesh, col, base: mesh.position.clone(), state: 'ok', t: 0 });
      tz -= 3.8;
    }
    const lastTile = tiles[N - 1].base;
    const resetTiles = (from = 0) => {
      tiles.forEach((t, i) => {
        if (i < from) {
          t.state = 'falling';
          t.mesh.visible = false;
          t.col.enabled = false;
          return;
        }
        t.state = 'ok';
        t.t = 0;
        t.mesh.visible = true;
        t.mesh.position.copy(t.base);
        t.col.enabled = true;
      });
    };
    let progress = -1;
    let routeActive = false;
    const hunters: Sleepless[] = [lv.sleepless(-3, 0, -30, 1.35), lv.sleepless(3, 0, -34, 1.5)];
    hunters[0].chaseSpeed = 7.3;
    hunters[1].chaseSpeed = 6.9;
    const startRoute = async (instant: boolean) => {
      routeActive = true;
      for (const [i, h] of hunters.entries()) {
        h.placeAt(new THREE.Vector3(i ? 3 : -3, 0, lv.player.pos.z + 18 + i * 4));
        h.hunting = true;
      }
      lv.chase = 1;
      if (!instant) {
        lv.glitch(1);
        lv.shake(0.6);
        lv.game.audio.stinger('sleepless');
        await lv.say(['Ori', '(The Sleepless. They followed me out of the yellow rooms. RUN.)', 'scared']);
      }
      lv.objective('RUN to the Core — the route is collapsing behind you', [0, 0, -290]);
    };
    lv.trigger(0, 1, -38, 12, 4, 4, () => void startRoute(false), { reArm: true });
    lv.checkpoint(0, 0, -32, Math.PI, { objective: 'Cross the route to the Core', waypoint: new THREE.Vector3(0, 0, -290), radius: 4 });
    const midCp = lv.checkpoint(tiles[28].base.x, tiles[28].base.y + 0.3, tiles[28].base.z, Math.PI, { objective: 'Keep running to the Core', waypoint: new THREE.Vector3(0, 0, -290), radius: 1.6 });
    lv.onRespawn(() => {
      routeActive = false;
      for (const h of hunters) h.hunting = false;
      progress = -1;
      resetTiles(0);
      if (lv.cpIndex >= midCp) {
        resetTiles(0);
        lv.after(0.8, () => void startRoute(true));
      }
    });

    // =================== 3. the Core ===================
    const CZ = lastTile.z - 26;
    b.add(new THREE.CylinderGeometry(22, 20, 2, 64), { x: 0, y: -1, z: CZ, color: '#2a2048', mat: m.satin });
    b.physics.addBox(0, -1, CZ, 30, 2, 30, { surface: 'stone' });
    b.add(new THREE.TorusGeometry(21.5, 0.25, 8, 96), { x: 0, y: 0.05, z: CZ, rx: Math.PI / 2, color: '#e8e4ff', mat: m.glow, shadow: false });
    b.ramp(lastTile.x / 2, (lastTile.z + CZ + 13) / 2, 3.2, Math.abs(lastTile.z - (CZ + 13)), 0, lastTile.y, 'z', 1, { color: '#4a3a7a', mat: m.satin, surface: 'stone' });
    const coreUniforms = { uTime: dreamUniforms.uTime, uPower: { value: 1 }, uTint: { value: new THREE.Color('#ffffff') } };
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(10, 5),
      new THREE.ShaderMaterial({
        uniforms: coreUniforms,
        vertexShader: `uniform float uTime; varying vec3 vN; varying vec3 vP;
          void main(){ vN = normalize(normalMatrix * normal); vec3 p = position + normal * (sin(position.y * 0.8 + uTime * 1.3) * 0.3 + sin(position.x * 1.1 - uTime) * 0.25);
          vP = p; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }`,
        fragmentShader: `uniform float uTime; uniform float uPower; uniform vec3 uTint; varying vec3 vN; varying vec3 vP;
          void main(){ float f = pow(1.0 - abs(vN.z), 2.0); float bands = 0.5 + 0.5 * sin(vP.y * 2.0 + uTime * 2.0);
          vec3 c = uTint * (1.2 + f * 2.5 + bands * 0.4) * uPower; gl_FragColor = vec4(c, 1.0); }`,
        toneMapped: false,
      }),
    );
    core.position.set(0, 18, CZ - 8);
    lv.root.add(core);
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(14 + i * 3.5, 0.18, 8, 96), glowMat(i % 2 ? '#c8b8ff' : '#ffffff', 1.8));
      r.position.copy(core.position);
      r.rotation.set(rnd() * 3, rnd() * 3, 0);
      lv.root.add(r);
      rings.push(r);
    }
    // orbiting parcels: every dream ever delivered
    const parcelCount = 220;
    const parcels = new THREE.InstancedMesh(roundedGeo(0.7, 0.5, 0.55, 0.08, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), parcelCount);
    const pData: Array<{ r: number; a: number; y: number; s: number; tilt: number }> = [];
    const pal = ['#ffcf7a', '#c9a2ff', '#9fe3ff', '#7affd0', '#ffb070', '#c8b6ff', '#9fd0ff', '#ffe880', '#e8e4ff'];
    for (let i = 0; i < parcelCount; i++) {
      pData.push({ r: 13 + rnd() * 16, a: rnd() * Math.PI * 2, y: (rnd() - 0.5) * 18, s: 0.1 + rnd() * 0.25, tilt: rnd() });
      parcels.setColorAt(i, new THREE.Color(pal[i % pal.length]).multiplyScalar(1.6));
    }
    parcels.frustumCulled = false;
    lv.root.add(parcels);
    const dummy = new THREE.Object3D();
    const beacon = lv.game.vfx.beacon('#ffffff', 80, 1.5);
    beacon.position.set(0, 0, CZ + 10);

    let atCore = false;
    let chosen = false;
    lv.trigger(0, 1, CZ + 18, 30, 6, 6, async () => {
      atCore = true;
      routeActive = false;
      for (const h of hunters) {
        h.hunting = false;
        lv.game.vfx.emit(h.position.clone().setY(h.position.y + 1.5), 60, { color: '#06040e', color2: '#e8e4ff', speed: 3, life: 1.5, size: 0.4 });
      }
      lv.chase = 0;
      lv.objective('', null);
      lv.lock(true);
      lv.cine([6, 3, CZ + 22], [0, 12, CZ - 8], 55);
      await lv.wait(1.5);
      await lv.say(
        ['Ori', "(They stopped. They won't come into the light.)", 'surprised'],
        ['Mabel', '...ri... Ori. You made it. You always make it.'],
        ['Ori', 'Mabel? Where are you?', 'curious'],
        ['Mabel', "Here, sweetheart. Everywhere. I'm the Route. I've been the voice on your radio since the very first parcel."],
        ['Ori', 'The badge in Room 0. The kitchen. The hallway. ...I\'ve done all this before.', 'sad'],
        ['Mabel', "Many times. You were the first courier — a dreamer who didn't want to wake up. When people stopped dreaming new dreams, I kept the old ones running. And I kept you."],
        ['Mabel', 'Every loop, you forget. Every loop, I give you a new badge and a jar of morning, and you go.'],
        ['Mabel', 'The parcel in your bag is the last one. It holds every dream you ever carried.'],
        ['Mabel', "Deliver it into the Core and dreaming starts again — new dreams, real ones. But someone has to carry them. It would be you. For a very long time."],
        ['Mabel', 'Or seal it. The Route stops. No more recycled rooms, no more loops, no more Sleepless. Everyone wakes up — you too. And no one knows what they\'ll dream of next. If anything.'],
        ['Ori', '...', 'determined'],
      );
      lv.cineEnd();
      lv.lock(false);
      lv.objective('Decide what to do with the Last Parcel', [0, 0, CZ + 9]);
    });
    lv.interact(0, 1.2, CZ + 9, 'Hold up the Last Parcel', async () => {
      chosen = true;
      lv.lock(true);
      lv.cine([5, 2.5, CZ + 15], [0, 10, CZ - 8], 50);
      const choice = await lv.game.ending();
      lv.lock(true);
      if (choice === 'restore') await restoreEnding();
      else await shutdownEnding();
    }, { radius: 3, once: true, enabled: () => atCore && !chosen });

    // =================== epilogue sets ===================
    // A. restored cloud garden (far east)
    const EX = 600;
    cloudIsland(b, EX, 0, 30, 26, 0, 1001, { belly: 1.4 });
    flowers(b, EX, 0, 0, 24, 20, 260, 1002, ['#ff9fc2', '#ffd46b', '#b8a2ff', '#9fe3ff', '#ffb38a', '#ffffff']);
    house(b, EX - 9, 0, -7, { w: 4.5, d: 4.5, h: 3.4, wall: '#ffd9e2', roof: '#8e7cc3', lit: true });
    house(b, EX + 9, 0, -8, { w: 4.5, d: 4.5, h: 3.8, wall: '#d9ecff', roof: '#f28fb0', lit: true });
    tree(b, EX - 4, 0, -9, 1.2);
    tree(b, EX + 5, 0, 7, 1.0, { leaf: '#c9b6ff' });
    lamp(b, EX + 3, 0, -3);
    bench(b, EX - 3, 0, 3, Math.PI / 2, '#d99ab8');
    lv.resident({ name: 'Mabel ', style: STYLES.mabel, pos: [EX + 1.6, 0, -1.5], facing: -2.3, behavior: 'wave' });
    lv.resident({ name: 'Mrs. Noor ', style: STYLES.elder, pos: [EX - 3, 0, 3.3], facing: Math.PI / 2, behavior: 'sit' });
    lv.resident({ name: 'Kid ', style: STYLES.kid('#ffb05a', '#3a2a2a'), pos: [EX + 4, 0, 2], facing: -1, behavior: 'wave' });
    lv.resident({ name: 'Pell ', style: { ...STYLES.worker('#5a5f6e'), hat: 'courier', hatColor: '#3a3d4e', hair: '#aaaaaa' }, pos: [EX + 6, 0, -2], facing: -2, behavior: 'idle' });
    cloudField(lv, EX - 200, EX + 200, -200, 200, -10, { count: 140, size: 26, lit: '#fff8f4', shade: '#d2bfe8', seed: 77 });
    // B. a small real bedroom at sunrise (far west)
    const WX = -600;
    b.box({ x: WX, y: -0.25, z: 0, w: 8, h: 0.5, d: 8, color: '#c8a888', mat: m.tex('bedWood', Tex.wood('#c8a888'), { roughness: 0.6 }), surface: 'wood' });
    for (const [x, z, w, d] of [[WX, -4, 8, 0.3], [WX - 4, 0, 0.3, 8], [WX, 4, 8, 0.3]] as const) b.box({ x, y: 1.6, z, w, h: 3.2, d, color: '#f2ece2', climbable: false });
    b.box({ x: WX + 4, y: 0.5, z: 0, w: 0.3, h: 1, d: 8, color: '#f2ece2' });
    b.box({ x: WX + 4, y: 3.0, z: 0, w: 0.3, h: 0.4, d: 8, color: '#f2ece2' });
    b.box({ x: WX + 4, y: 1.6, z: -2.9, w: 0.3, h: 3.2, d: 2.2, color: '#f2ece2' });
    b.box({ x: WX + 4, y: 1.6, z: 2.9, w: 0.3, h: 3.2, d: 2.2, color: '#f2ece2' });
    b.box({ x: WX, y: 3.4, z: 0, w: 8, h: 0.3, d: 8, color: '#faf6f0', climbable: false });
    b.box({ x: WX - 1.5, y: 0.3, z: -1.5, w: 2, h: 0.6, d: 3.6, r: 0.1, color: '#e8e0f0', surface: 'soft' });
    b.box({ x: WX - 1.5, y: 0.75, z: -3, w: 1.6, h: 0.3, d: 0.6, r: 0.12, color: '#ffffff', collide: false });
    b.box({ x: WX + 2.5, y: 0.4, z: -3.2, w: 1, h: 0.8, d: 0.8, color: '#c8a888' });
    const realBadge = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), glowMat('#ffd46b', 1.5));
    realBadge.position.set(WX + 2.5, 0.88, -3.2);
    lv.root.add(realBadge);

    const restoreEnding = async () => {
      lv.game.audio.pulse();
      lv.game.audio.chime(1);
      lv.player.startAction('pulse', 1.2);
      await lv.wait(0.6);
      lv.flash('#ffffff', 1);
      coreUniforms.uTint.value.set('#ffe6c2');
      lv.game.tweens.add(2, (k) => (coreUniforms.uPower.value = 1 + k * 2));
      for (let i = 0; i < 4; i++) lv.game.vfx.ring(core.position, '#ffffff', 40 + i * 10, 2 + i * 0.4, i % 2 === 0);
      lv.game.vfx.emit(core.position, 200, { color: '#ffd9e2', color2: '#9fe3ff', speed: 18, life: 3, size: 0.6, drag: 0.5 });
      await lv.say(
        ['Ori', '(The parcel opens. Every dream I ever carried pours out — and they\'re not the same dreams. They\'re new.)', 'surprised'],
        ['Mabel', 'Oh, Ori. Look at that. Look at all those new places.'],
      );
      await lv.game.ui.fade(true, false);
      lv.player.teleport(new THREE.Vector3(EX, 0, 6), Math.PI);
      lv.game.camRig.snap(lv.player.pos, 0);
      lv.setLook(RESTORED, 0.01);
      lv.game.ui.setDread(0);
      lv.player.dread = 0;
      lv.player.rig.expression = 'happy';
      lv.game.setParcel('#ffcf7a');
      lv.cine([EX + 4, 3, 14], [EX, 1.6, -2], 50);
      await lv.wait(0.4);
      await lv.game.ui.fade(false);
      await lv.wait(1.6);
      await lv.say(
        ['Mabel', "Ori! There you are. Good morning — a real one, this time. Brand new."],
        ['Ori', "Morning, Mabel. What've you got for me?", 'happy'],
        ['Mabel', "Oh, lots. More than we've had in years. Somewhere, somebody's dreaming about a lighthouse made of clouds."],
        ['Ori', "(I'll remember this one. I'm sure of it. I'll keep the old badge in the bag — just in case.)", 'happy'],
      );
      lv.game.showCredits('restore');
    };

    const shutdownEnding = async () => {
      lv.game.audio.stinger('reveal');
      await lv.say(['Ori', '(I close the parcel. I hold it shut. The Core goes quiet, one light at a time.)', 'sad']);
      lv.game.tweens.add(4, (k) => (coreUniforms.uPower.value = 1 - k * 0.95));
      for (const r of rings) lv.game.tweens.add(3, (k) => r.scale.setScalar(1 - k * 0.9));
      await lv.wait(3);
      await lv.say(['Mabel', "...thank you, Ori. Go on, now. It's morning. Wake up."]);
      lv.flash('#ffffff', 1);
      await lv.game.ui.fade(true, false);
      lv.player.teleport(new THREE.Vector3(WX - 1.2, 0.6, -1.2), Math.PI / 2);
      lv.player.startAction('sit', 999);
      lv.game.camRig.snap(lv.player.pos, -Math.PI / 2);
      lv.setLook(WAKING, 0.01);
      lv.game.ui.setDread(0);
      lv.player.dread = 0.2;
      lv.game.setParcel(null);
      lv.player.rig.expression = 'neutral';
      lv.cine([WX + 2.6, 1.8, 2.6], [WX - 1.3, 1.0, -1.4], 50);
      await lv.wait(0.4);
      await lv.game.ui.fade(false);
      await lv.wait(2);
      await lv.say(
        ['Ori', '(A small room. A window full of sunrise. No hum. No haze.)', 'neutral'],
        ['Ori', '(On the table: a scuffed little star badge.)', 'curious'],
        ['Ori', "(I don't know what I'll dream about tonight. Maybe nothing. Maybe something nobody has ever dreamed before.)", 'happy'],
      );
      lv.game.showCredits('shutdown');
    };

    // =================== distant: clouds somehow indoors above, the void below ===================
    cloudField(lv, -260, 260, -420, 120, 90, { count: 200, size: 50, lit: '#8a7ac8', shade: '#1a1030', seed: 31 });
    cloudField(lv, -260, 260, -420, 120, -30, { count: 160, size: 40, lit: '#3a2a5a', shade: '#06040e', seed: 32 });
    for (let i = 0; i < 30; i++) {
      const a = rnd() * Math.PI * 2;
      const r = 90 + rnd() * 140;
      b.box({ x: Math.cos(a) * r, y: -10 + rnd() * 50, z: -150 + Math.sin(a) * r, w: 6 + rnd() * 10, h: 4 + rnd() * 20, d: 6 + rnd() * 10, rx: rnd(), ry: rnd(), rz: rnd(), color: '#2a2048', layer: 'far', collide: false });
    }

    // =================== runtime ===================
    lv.onUpdate((dt, t) => {
      // tiles collapse behind the player
      if (routeActive) {
        const pz = lv.player.pos.z;
        let idx = -1;
        for (let i = 0; i < N; i++) if (tiles[i].base.z + 1.9 > pz) idx = i;
        if (idx > progress) progress = idx;
        for (let i = 0; i < N; i++) {
          const tl = tiles[i];
          if (tl.state === 'ok' && i <= progress - 2) {
            tl.state = 'shaking';
            tl.t = 0;
          }
        }
        for (const h of hunters) {
          if (h.position.y < -12) h.placeAt(new THREE.Vector3(lv.player.pos.x, lv.player.pos.y, lv.player.pos.z + 16));
        }
      }
      for (const tl of tiles) {
        if (tl.state === 'shaking') {
          tl.t += dt;
          tl.mesh.position.x = tl.base.x + Math.sin(t * 60) * 0.05;
          if (tl.t > 0.55) {
            tl.state = 'falling';
            tl.t = 0;
            tl.col.enabled = false;
          }
        } else if (tl.state === 'falling' && tl.mesh.visible) {
          tl.t += dt;
          tl.mesh.position.y -= tl.t * 18 * dt;
          tl.mesh.rotation.x += dt * 0.6;
          if (tl.mesh.position.y < tl.base.y - 40) tl.mesh.visible = false;
        }
      }
      core.rotation.y += dt * 0.1;
      rings.forEach((r, i) => {
        r.rotation.x += dt * (0.1 + i * 0.03);
        r.rotation.y += dt * (0.07 - i * 0.02);
      });
      pData.forEach((p, i) => {
        p.a += dt * p.s * 0.6;
        dummy.position.set(core.position.x + Math.cos(p.a) * p.r, core.position.y + p.y + Math.sin(p.a * 2 + p.tilt * 6) * 2, core.position.z + Math.sin(p.a) * p.r);
        dummy.rotation.set(p.a, p.a * 0.5, p.tilt);
        dummy.updateMatrix();
        parcels.setMatrixAt(i, dummy.matrix);
      });
      parcels.instanceMatrix.needsUpdate = true;
      realBadge.rotation.y += dt;
    });

    lv.intro = async () => {
      lv.lock(true);
      lv.cine([3, 2.5, 9], [0, 8, -60], 60);
      await lv.wait(1.2);
      await lv.say(
        ['Ori', '(A lobby, at the top of everything. The ceiling is gone. There are clouds above me — indoors.)', 'scared'],
        ['Mabel', '(radio) ...ri... can you... the Core is... straight ahead... don\'t stop...'],
        ['Ori', '(The light at the end. That\'s where the Last Parcel goes.)', 'determined'],
      );
      lv.cineEnd();
      lv.lock(false);
      lv.objective('Head toward the light', [0, 0, -40]);
    };
  },
};
