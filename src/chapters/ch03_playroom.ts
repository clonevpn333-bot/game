import * as THREE from 'three';
import type { ChapterDef } from '../game/types';
import type { Level } from '../game/Level';
import { look } from '../render/Atmosphere';
import { Tex } from '../render/Textures';
import { fieldMaterial } from '../render/DreamShading';
import { boxGeo, puffGeo, roundedGeo } from '../world/Geo';
import { cloudIsland, house, tree } from '../world/Kit';
import { shell, tubeLight } from '../world/Interior';
import { audio, cloudField, cloudHorizon, glowMat, sign, solidMat, STYLES } from './common';
import { createSeededRandom } from '../core/rng';
import { easeOutBack } from '../core/math';

const LOOK = look({
  sky: { top: '#5f9cff', mid: '#bfe3ff', sun: '#fff4d6', sunSize: 1.4, cloudLit: '#ffffff', cloudShade: '#bcd0f0', cloudCover: 0.5, seaLit: '#ffffff', seaShade: '#bcd0f0' },
  fog: { color: '#efe0d4', sun: '#fff0c8', low: '#c9b8e0', density: 0.0026, base: 0, falloff: 0.01, heightMix: 0.2, max: 0.85 },
  sunDir: [0.85, 0.42, -0.3],
  sunColor: '#ffe6c2',
  sunIntensity: 2.3,
  hemiSky: '#e6eaff',
  hemiGround: '#f2d6b8',
  hemiIntensity: 0.7,
  rimColor: '#fff4e6',
  rimStrength: 0.3,
  envIntensity: 0.5,
  dread: 0.15,
  post: { bloom: 0.75, bloomThreshold: 0.8, warp: 0.6, edgeBlur: 0.7, desat: 0, grain: 0.07, vignette: 0.4, lift: 0.2, shadowTint: '#d9cfff', highlightTint: '#fff2e0', contrast: 1.08, exposure: 1, glitch: 0 },
  motes: { kind: 'dust', color: '#fff4d0', density: 0.9 },
});

function cityCarpet(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#8fd0a0';
  g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#6a6a7a';
  for (let i = 0; i < 5; i++) {
    g.fillRect(i * 110 + 20, 0, 34, 512);
    g.fillRect(0, i * 110 + 20, 512, 34);
  }
  g.strokeStyle = '#fff6c8';
  g.setLineDash([10, 10]);
  g.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    g.beginPath(); g.moveTo(i * 110 + 37, 0); g.lineTo(i * 110 + 37, 512); g.stroke();
    g.beginPath(); g.moveTo(0, i * 110 + 37); g.lineTo(512, i * 110 + 37); g.stroke();
  }
  const cols = ['#ff9fb2', '#ffd46b', '#9fc8ff', '#c9b6ff', '#ffffff'];
  const r = createSeededRandom(8);
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 5; j++) {
      for (let k = 0; k < 3; k++) {
        g.fillStyle = cols[Math.floor(r() * cols.length)];
        g.fillRect(i * 110 + 62 + r() * 30, j * 110 + 62 + r() * 30, 18, 18);
      }
      if (r() > 0.6) {
        g.fillStyle = '#5fb0e0';
        g.beginPath(); g.arc(i * 110 + 90, j * 110 + 90, 16, 0, Math.PI * 2); g.fill();
      }
    }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / 40, 1 / 40);
  t.anisotropy = 8;
  return t;
}

export const ch03: ChapterDef = {
  id: 2,
  key: 'playroom-quarter',
  title: 'The Playroom Quarter',
  subtitle: 'Somebody is still counting. Nobody is hiding.',
  uiDread: 1,
  oriDread: 0.25,
  parcelColor: '#9fe3ff',
  look: LOOK,
  audio: audio({
    chords: [[65, 69, 72, 76], [64, 67, 71, 74], [62, 65, 69, 72], [60, 64, 67, 71]],
    chordDur: 4.6,
    padType: 'triangle',
    padGain: 0.7,
    bellGain: 1.1,
    arpEvery: 0.42,
    wobble: 0.06,
    reverb: 0.6,
    room: 0.35,
  }),
  build(lv: Level) {
    const b = lv.b;
    const m = lv.mats;
    lv.killY = -20;
    const field = { center: { value: new THREE.Vector3(-30, 12, -70) }, radius: { value: 0 } };
    const woodT = Tex.wood('#c99a6b').clone();
    woodT.repeat.set(1 / 14, 1 / 14);
    woodT.needsUpdate = true;
    const wallT = Tex.nursery('#bfe3f2').clone();
    wallT.repeat.set(1 / 24, 1 / 24);
    wallT.needsUpdate = true;
    const fFloor = fieldMaterial(m.tex('pWood', woodT, { roughness: 0.55 }), field, 'p-floor');
    const fWall = fieldMaterial(m.tex('pWall', wallT, { roughness: 0.9 }), field, 'p-wall');
    const fPaint = fieldMaterial(m.paint, field, 'p-paint');
    const fSatin = fieldMaterial(m.satin, field, 'p-satin');
    const fCarpet = fieldMaterial(m.tex('pCarpet', cityCarpet(), { roughness: 0.95 }), field, 'p-carpet');
    for (const [k, v] of Object.entries({ fFloor, fWall, fPaint, fSatin, fCarpet })) m.textured.set(k, v);

    // =================== The giant room ===================
    const RX0 = -45, RX1 = 45, RZ0 = -150, RZ1 = -10, RH = 44;
    shell(b, RX0, RZ0, RX1, RZ1, 0, RH, {
      floorMat: fFloor, wallMat: fWall, ceilMat: fPaint, ceilColor: '#f2f0ff', surface: 'wood',
      openings: [{ side: 'e', from: -112, to: -58, h: 0 }, { side: 'n', from: -23, to: -17, h: 24.5 }],
      baseboard: '#fff8ee',
    });
    b.box({ x: -20, y: 10, z: -150.2, w: 6, h: 20, d: 0.4, mat: fWall, color: '#ffffff', climbable: false });
    // window opening in east wall: rebuild wall above/below the hole (shell gap h=0 removed whole span)
    b.box({ x: RX1 + 0.2, y: 7, z: -85, w: 0.4, h: 14, d: 54, mat: fWall, color: '#ffffff', climbable: false });
    b.box({ x: RX1 + 0.2, y: 39.5, z: -85, w: 0.4, h: 9, d: 54, mat: fWall, color: '#ffffff', climbable: false });
    // window frame + mullions
    b.box({ x: RX1 - 0.1, y: 14, z: -85, w: 1.4, h: 0.8, d: 55, color: '#fff8ee', mat: fSatin, collide: false });
    b.box({ x: RX1 - 0.1, y: 35, z: -85, w: 1.0, h: 0.8, d: 55, color: '#fff8ee', mat: fSatin, collide: false });
    for (const z of [-112, -85, -58]) b.box({ x: RX1 - 0.1, y: 24.5, z, w: 0.8, h: 21, d: 0.8, color: '#fff8ee', mat: fSatin, collide: false });
    b.box({ x: RX1 - 0.1, y: 24.5, z: -85, w: 0.5, h: 0.5, d: 54, color: '#fff8ee', mat: fSatin, collide: false });
    // curtains
    for (const z of [-56, -114]) for (let i = 0; i < 5; i++) b.add(new THREE.CylinderGeometry(1.0, 1.2, 30, 10), { x: RX1 - 1.8, y: 22, z: z + (z < -85 ? -1 : 1) * i * 1.6, color: '#ffb8d6', mat: fSatin, shadow: false });
    // rug (printed city carpet)
    b.add(new THREE.CylinderGeometry(26, 26, 0.3, 64), { x: 4, y: 0.15, z: -85, mat: fCarpet, color: '#ffffff', ao: 0 });
    b.physics.addBox(4, 0.15, -85, 36, 0.3, 36, { surface: 'carpet', climbable: false });

    // ---- the door crack (start) ----
    b.box({ x: -30, y: 18, z: -10.6, w: 12, h: 36, d: 0.6, color: '#ffe6c2', mat: fPaint, collide: false });
    const crack = new THREE.Mesh(new THREE.PlaneGeometry(12, 0.5), glowMat('#fff2c8', 2.5));
    crack.position.set(-30, 0.25, -10.9);
    lv.root.add(crack);
    lv.setStart(-30, 0, -15, Math.PI);

    // ---- west climb: crayon box → blocks → books → chair → desk ----
    const rnd = createSeededRandom(31);
    const block = (x: number, y0: number, z: number, s: number, color: string, letter?: string) => {
      b.box({ x, y: y0 + s / 2, z, w: s, h: s, d: s, r: s * 0.06, color, mat: fSatin, surface: 'wood' });
      if (letter) {
        sign(lv, letter, x, y0 + s / 2, z + s / 2 + 0.02, s * 0.7, s * 0.7, 0, { bg: '#fff8ee', fg: color, glow: 1 });
      }
    };
    // crayon box (top 2.2)
    b.box({ x: -36, y: 1.1, z: -27, w: 4.6, h: 2.2, d: 3, r: 0.12, color: '#ffd46b', mat: fSatin, surface: 'wood' });
    for (let i = 0; i < 6; i++) b.add(new THREE.CylinderGeometry(0.28, 0.28, 2.2, 8), { x: -37.8 + i * 0.72, y: 2.9, z: -26.4, color: ['#ff6a7a', '#6ab0ff', '#7ae09a', '#ffb05a', '#b58aff', '#ff9fd0'][i], mat: fSatin });
    // block B (top 3.4)
    block(-36, 0, -30.2, 3.4, '#9fc8ff', 'B');
    // book stack (5 x 1.1 = top 5.5)
    for (let i = 0; i < 5; i++) b.box({ x: -36 + (i % 2 ? 0.2 : -0.2), y: 0.55 + i * 1.1, z: -33.7, w: 5.0 - (i % 3) * 0.3, h: 1.1, d: 3.6, ry: (i % 2 ? 0.05 : -0.06), r: 0.08, color: ['#c96a7a', '#6a8ac9', '#e8b04a', '#7aa87a', '#a87ac9'][i], mat: fSatin, surface: 'wood' });
    // block stack C (top 7.6)
    block(-36, 0, -37.3, 3.8, '#ff9fb2', 'A');
    block(-36, 3.8, -37.3, 3.8, '#c9b6ff', 'C');
    // chair (seat top 9.7)
    b.box({ x: -34, y: 9.1, z: -42.5, w: 6.5, h: 1.2, d: 6, r: 0.3, color: '#ff9fb2', mat: fSatin, surface: 'wood' });
    for (const [x, z] of [[-36.9, -39.9], [-31.1, -39.9], [-36.9, -45.1], [-31.1, -45.1]] as const) b.add(new THREE.CylinderGeometry(0.3, 0.3, 8.5, 10), { x, y: 4.25, z, color: '#ffffff', mat: fSatin });
    b.box({ x: -34, y: 15.3, z: -39.7, w: 6.5, h: 11, d: 0.6, r: 0.25, color: '#ff9fb2', mat: fSatin, collide: false });
    // desk
    const DT = 12.0;
    b.box({ x: -34, y: DT - 0.6, z: -73, w: 22, h: 1.2, d: 54, r: 0.25, color: '#f2e6d2', mat: fSatin, surface: 'wood' });
    for (const [x, z] of [[-44, -47], [-24, -47], [-44, -99], [-24, -99]] as const) b.box({ x, y: (DT - 1.2) / 2, z, w: 1.4, h: DT - 1.2, d: 1.4, color: '#f2e6d2', mat: fSatin, collide: false });
    // desk clutter: papers, crayons, pencil cup (stamp), lamp
    for (let i = 0; i < 6; i++) b.add(boxGeo(3.4, 0.04, 4.4), { x: -38 + rnd() * 8, y: DT + 0.02 + i * 0.01, z: -56 - rnd() * 30, ry: rnd() * 1.5, color: '#fffdf6', mat: fPaint, shadow: false, ao: 0 });
    for (let i = 0; i < 4; i++) {
      const cr = new THREE.CylinderGeometry(0.3, 0.3, 4.6, 8);
      cr.rotateZ(Math.PI / 2);
      b.add(cr, { x: -27 - i * 0.3, y: DT + 0.3, z: -60 - i * 1.4, ry: 0.3 + i * 0.4, color: ['#ff6a7a', '#6ab0ff', '#7ae09a', '#ffb05a'][i], mat: fSatin });
    }
    b.add(new THREE.CylinderGeometry(1.4, 1.2, 2.2, 16, 1, true), { x: -41, y: DT + 1.1, z: -88, color: '#6ab0ff', mat: fSatin });
    b.physics.addBox(-41, DT + 1.1, -88, 2.6, 2.2, 2.6, { climbable: true });
    for (let i = 0; i < 4; i++) b.add(new THREE.CylinderGeometry(0.16, 0.16, 5, 6), { x: -41 + (i - 1.5) * 0.4, y: DT + 3, z: -88, rz: (i - 1.5) * 0.12, color: ['#ffd46b', '#ff9fb2', '#9fc8ff', '#ffffff'][i], mat: fSatin });
    lv.stamp('c3-pencil-cup', -41, DT + 2.2, -88);
    b.add(new THREE.CylinderGeometry(2, 2.4, 0.6, 16), { x: -42, y: DT + 0.3, z: -62, color: '#5a5aa0', mat: fSatin });
    b.add(new THREE.CylinderGeometry(0.25, 0.25, 9, 8), { x: -42, y: DT + 4.8, z: -62, color: '#5a5aa0', mat: fSatin });
    b.add(new THREE.ConeGeometry(3, 3, 16, 1, true), { x: -40, y: DT + 9, z: -62, rz: -0.6, color: '#ffd46b', mat: fSatin });
    b.physics.addBox(-42, DT + 0.3, -62, 4.4, 0.6, 4.4, {});
    lv.checkpoint(-34, 9.7, -43, Math.PI, { objective: 'Find out why the room is asleep', waypoint: new THREE.Vector3(-30, DT, -70) });
    // the alarm clock (anchor)
    const clockG = new THREE.Group();
    const face = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 1.2, 32), solidMat('#ff7a8a', 0.4));
    face.rotation.x = Math.PI / 2;
    const dial = new THREE.Mesh(new THREE.CircleGeometry(2.0, 32), glowMat('#fff6e6', 1.1));
    dial.position.z = 0.62;
    const bells: THREE.Mesh[] = [];
    for (const s of [-1, 1]) {
      const bell = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), solidMat('#ffd46b', 0.3, { metalness: 0.7 }));
      bell.position.set(s * 1.5, 2.3, 0);
      bell.rotation.z = -s * 0.5;
      clockG.add(bell);
      bells.push(bell);
    }
    clockG.add(face, dial);
    clockG.position.set(-30, DT + 2.6, -74);
    lv.root.add(clockG);
    b.physics.addBox(-30, DT + 1.6, -74, 5, 3.4, 1.4, { climbable: false });
    // the counting kid
    const kid = lv.resident({ name: 'Kid', style: STYLES.kid('#ffb05a', '#3a2a2a'), pos: [-37, DT, -80], facing: -Math.PI / 2, behavior: 'count', bark: ['...97, 98, 99, 100. One, two, three...', '...98, 99, 100. Ready or— one, two...'], barkRange: 9, oblivious: true });

    // ---- bed, nightstand (decor + extended scale cues) ----
    b.box({ x: 32, y: 6, z: -85, w: 24, h: 6, d: 46, r: 0.6, color: '#ffffff', mat: fSatin, surface: 'soft' });
    for (let i = 0; i < 14; i++) b.add(puffGeo(i % 6, 2), { x: 24 + rnd() * 16, y: 9.6, z: -66 - rnd() * 36, sx: 4 + rnd() * 2, sy: 1.6, sz: 4 + rnd() * 2, color: '#9fc8ff', top: '#d9ecff', mat: fPaint });
    b.box({ x: 32, y: 10.5, z: -106, w: 18, h: 3, d: 6, r: 1.4, color: '#fff6f8', mat: fSatin, collide: false });
    b.box({ x: 32, y: 14, z: -109.5, w: 26, h: 28, d: 1.6, r: 0.6, color: '#ffd9e8', mat: fSatin });
    b.box({ x: 14, y: 5, z: -112, w: 8, h: 10, d: 8, r: 0.3, color: '#c9b6ff', mat: fSatin });
    b.add(new THREE.CylinderGeometry(1.2, 2, 4, 12), { x: 14, y: 12, z: -112, color: '#ffd46b', mat: fSatin });
    const nightGlow = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), glowMat('#ffe6b0', 1.6));
    nightGlow.position.set(14, 14.5, -112);
    lv.root.add(nightGlow);
    // scattered giant toys on the floor
    block(10, 0, -40, 4.4, '#7ae09a', 'D');
    block(16, 0, -46, 3.6, '#ffd46b', 'E');
    block(11.5, 4.4, -40.5, 3, '#ff9fb2');
    const ball = new THREE.Mesh(new THREE.SphereGeometry(5, 32, 20), solidMat('#ff6a7a', 0.35));
    ball.position.set(-6, 5, -120);
    lv.root.add(ball);
    b.physics.addBox(-6, 5, -120, 7, 10, 7, { climbable: false });
    // mobile
    const mobile = new THREE.Group();
    mobile.position.set(0, RH - 6, -85);
    const bar = new THREE.Mesh(new THREE.TorusGeometry(8, 0.2, 6, 40), solidMat('#fff6ee', 0.5));
    bar.rotation.x = Math.PI / 2;
    mobile.add(bar);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sh = i % 2 ? new THREE.Mesh(new THREE.OctahedronGeometry(1.6), glowMat('#ffe6a0', 1.2)) : new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.5, 8, 16, Math.PI * 1.3), glowMat('#e6dcff', 1.1));
      sh.position.set(Math.cos(a) * 8, -6 - (i % 3) * 2, Math.sin(a) * 8);
      mobile.add(sh);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 6 + (i % 3) * 2, 4), solidMat('#fff6ee', 0.5));
      str.position.set(Math.cos(a) * 8, -3 - (i % 3), Math.sin(a) * 8);
      mobile.add(str);
    }
    lv.root.add(mobile);

    // ---- toy train ferry: desk → shelf ----
    const trainMesh = new THREE.Group();
    const tb = new THREE.Mesh(roundedGeo(4.4, 2, 6, 0.4, 2), solidMat('#ff6a7a', 0.4));
    const tch = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.6, 12), solidMat('#3a3a5a', 0.4));
    tch.position.set(0, 1.6, -2);
    trainMesh.add(tb, tch);
    for (const [x, z] of [[-2.3, -2], [2.3, -2], [-2.3, 2], [2.3, 2]] as const) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.4, 16), solidMat('#ffd46b', 0.4));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, -1, z);
      trainMesh.add(w);
    }
    trainMesh.position.set(-34, DT + 1.0, -104);
    lv.root.add(trainMesh);
    const ferry = lv.movingPlatform(trainMesh, 4.4, 2, 6, 'wood');
    // track bridge
    b.box({ x: -34, y: DT - 0.4, z: -119, w: 3, h: 0.4, d: 36, color: '#b8826a', mat: fSatin, surface: 'wood', collide: false });
    for (let z = -103; z > -138; z -= 6) b.box({ x: -34, y: DT / 2 - 0.4, z, w: 1.2, h: DT - 0.8, d: 1.2, color: '#9fc8ff', mat: fSatin, collide: false });
    let trainRunning = false;

    // ---- shelf (arena) + staircase blocks ----
    const ST = 20;
    b.box({ x: -27, y: ST - 0.5, z: -145, w: 36, h: 1, d: 10, r: 0.15, color: '#f2e6d2', mat: fSatin, surface: 'wood' });
    b.box({ x: -27, y: 30, z: -149, w: 36, h: 20, d: 1.4, color: '#e8dcc8', mat: fSatin, collide: false });
    b.box({ x: -27, y: ST + 10, z: -145, w: 36, h: 1, d: 10, r: 0.15, color: '#f2e6d2', mat: fSatin, collide: false });
    for (let i = 0; i < 2; i++) b.box({ x: -42, y: ST + 0.55 + i * 1.1, z: -146, w: 5, h: 1.1, d: 3.6, r: 0.08, color: ['#6a8ac9', '#e8b04a'][i], mat: fSatin, surface: 'wood' });
    lv.stamp('c3-shelf-books', -42, ST + 2.2, -146);
    const stairBlocks: Array<{ mesh: THREE.Mesh; col: ReturnType<typeof b.physics.addBox>; to: THREE.Vector3; from: THREE.Vector3 }> = [];
    const stairDefs: Array<[number, number, string]> = [[-34, 14.0, '#ff9fb2'], [-30.5, 16.0, '#ffd46b'], [-27, 18.0, '#9fc8ff']];
    stairDefs.forEach(([x, top, c], i) => {
      const s = 3;
      const to = new THREE.Vector3(x, top - s / 2, -138.5);
      const from = new THREE.Vector3(x + 18 + i * 6, s / 2, -120 + i * 5);
      const mesh = b.mesh(roundedGeo(s, s, s, 0.2, 2), fSatin, { x: from.x, y: from.y, z: from.z, color: c });
      const col = b.physics.addBox(to.x, to.y, to.z, s, s, s, { surface: 'wood' });
      col.enabled = false;
      stairBlocks.push({ mesh, col, to, from });
    });
    // staircase base pad at the end of the train line
    b.box({ x: -34, y: DT - 0.5, z: -138.5, w: 5, h: 1, d: 3, color: '#b8826a', mat: fSatin, surface: 'wood' });

    const wake = (instant: boolean) => {
      trainRunning = true;
      kid.def.behavior = 'idle';
      kid.def.bark = undefined;
      if (instant) {
        field.radius.value = 400;
        for (const s of stairBlocks) {
          s.mesh.position.copy(s.to);
          s.col.enabled = true;
        }
        return;
      }
      lv.game.tweens.add(6, (k) => (field.radius.value = k * 400), (t) => t * t);
      stairBlocks.forEach((s, i) =>
        lv.after(1.5 + i * 0.6, () => {
          lv.game.audio.whoosh();
          const p0 = s.from.clone();
          lv.game.tweens.add(1.3, (k) => {
            s.mesh.position.lerpVectors(p0, s.to, easeOutBack(k));
            s.mesh.position.y += Math.sin(Math.PI * Math.min(1, k)) * 8;
          }, (t) => t, () => (s.col.enabled = true));
        }),
      );
    };
    lv.anchor(-30, DT, -68.5, '#9fe3ff', 'Alarm anchor', async () => {
      lv.flash('#ffffff', 0.7);
      lv.shake(0.5);
      lv.game.audio.chime(1.2);
      lv.game.audio.chime(1.5);
      wake(false);
      await lv.wait(2);
      await lv.say(
        ['Kid', '...99, 100! Ready or not, here I come!'],
        ['Kid', '...'],
        ['Kid', "Where did everyone go? They were just here. They're always just here."],
        ['Ori', "Hey — hi. I'm Ori. I'm a courier. I think I just woke your room up.", 'happy'],
        ['Kid', "My room was asleep? ...Oh. That's why it was so quiet. It's been quiet for ages."],
        ['Kid', "Are you here for the box? I found it in my locker. It says 'Quiet Mall' on it. My mum works there."],
        ['Kid', '...worked. Works? I keep mixing them up.'],
        ['Ori', "(The box isn't sealed either.)", 'worried'],
        ['Kid', "Take the train to the shelf! The school door's up there. The hallway's longer than it used to be."],
      );
      lv.parcel('#7affd0');
      lv.objective('Ride the toy train to the shelf', [-34, DT, -104]);
    });

    // husks on the shelf
    const husks = [lv.husk(-20, ST, -144, 0, 0.8), lv.husk(-14, ST, -146, 0, 0.8), lv.husk(-26, ST, -147, 0, 0.8)];
    let fightAnnounced = false;
    lv.trigger(-30, ST + 1, -143, 8, 4, 8, async () => {
      if (fightAnnounced) return;
      fightAnnounced = true;
      await lv.say(['Ori', '(Those boxes are... moving. Parcels shouldn\'t move.)', 'scared']);
      lv.toast('Swing your bag: F / Left click · Dream Pulse (Q) stuns them');
      lv.objective('Fend off the Parcel Husks', null);
    }, { reArm: true });
    const doorPanel = b.mesh(roundedGeo(5.4, 4.2, 0.4, 0.1, 2), m.paint, { x: -20, y: ST + 2.1, z: -149.9, color: '#ffd46b' });
    const doorCol = b.physics.addBox(-20, ST + 2.1, -150, 6, 4.4, 1, { climbable: false });
    sign(lv, 'CLASSROOMS →', -20, ST + 5, -149.3, 3.2, 0.6, 0, { bg: '#3a6aa0', fg: '#ffffff', glow: 1.1 });
    let doorOpen = false;
    lv.onUpdate(() => {
      if (!doorOpen && husks.every((h) => !h.alive)) {
        doorOpen = true;
        doorCol.enabled = false;
        lv.game.audio.door();
        lv.game.tweens.add(1.2, (k) => (doorPanel.position.y = ST + 2.1 + k * 5));
        lv.objective('Go through the school door', [-20, ST, -152]);
      }
    });
    lv.checkpoint(-34, DT, -100, Math.PI, { objective: 'Ride the toy train to the shelf', waypoint: new THREE.Vector3(-34, DT, -104), restore: () => { wake(true); lv.parcel('#7affd0'); } });
    lv.checkpoint(-30, ST, -142, Math.PI, { objective: 'Fend off the Parcel Husks', restore: () => { wake(true); lv.parcel('#7affd0'); } });
    lv.onRespawn(() => {
      fightAnnounced = false;
      if (!doorOpen) for (const h of husks) h.reset();
    });

    // =================== The hallway that goes too far ===================
    const HZ0 = -150, HZ1 = -350, HX = -20, HW = 6, HH = 4.6;
    const lockerT = Tex.windows('#7a9ac8', '#5a7aa8', 0, 'locker').clone();
    lockerT.repeat.set(1 / 4, 1 / 4);
    const floorT = Tex.mallTile('#e8e2d6', '#d6cfc2').clone();
    floorT.repeat.set(1 / 2, 1 / 2);
    const hallFloor = m.tex('hallFloor', floorT, { roughness: 0.3 });
    shell(b, HX - HW / 2, HZ1, HX + HW / 2, HZ0, ST, HH, {
      floorMat: hallFloor, wallColor: '#f2ead6', ceilColor: '#f6f2ea', surface: 'tile', baseboard: '#8a8a9a',
      openings: [{ side: 's', from: HX - HW / 2, to: HX + HW / 2 }, ...Array.from({ length: 22 }, (_, i) => ({ side: 'e' as const, from: HZ1 + 10 + i * 8.5, to: HZ1 + 13 + i * 8.5, h: 3.4 }))],
    });
    // window sills/glass in the east openings (sky outside!)
    for (let i = 0; i < 22; i++) {
      const z = HZ1 + 11.5 + i * 8.5;
      b.box({ x: HX + HW / 2 + 0.2, y: ST + 0.5, z, w: 0.4, h: 1.0, d: 3, color: '#f2ead6' });
      b.add(boxGeo(0.05, 2.4, 3), { x: HX + HW / 2 + 0.2, y: ST + 2.2, z, color: '#cfe8ff', mat: m.glass, shadow: false });
      b.wall(HX + HW / 2 + 0.3, ST + 2, z, 0.3, 4, 3);
    }
    for (let z = HZ0 - 1; z > HZ1 + 1; z -= 0.9) {
      const lr = createSeededRandom(Math.floor(-z * 10));
      const c = ['#6a8ac8', '#7ab0a0', '#c88a6a', '#a87ac8'][Math.floor(-z / 22) % 4];
      b.box({ x: HX - HW / 2 + 0.35, y: ST + 1.15, z, w: 0.7, h: 2.3, d: 0.84, color: c, collide: false, ao: 0.3 });
      b.add(boxGeo(0.02, 0.3, 0.5), { x: HX - HW / 2 + 0.71, y: ST + 1.9, z, color: '#2a2a3a', shadow: false });
      if (lr() > 0.97) b.box({ x: HX - HW / 2 + 0.75, y: ST + 1.2, z, w: 0.06, h: 2.2, d: 0.8, ry: 0.6, color: c, collide: false });
    }
    b.wall(HX - HW / 2 + 0.35, ST + 1.2, (HZ0 + HZ1) / 2, 0.7, 2.4, HZ0 - HZ1);
    const flicker: THREE.Mesh[] = [];
    for (let z = HZ0 - 4; z > HZ1; z -= 6) tubeLight(b, HX, ST + HH - 0.05, z, Math.PI / 2, '#fff8e0', 2.4);
    for (let i = 0; i < 6; i++) {
      const fl = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 2.4), glowMat('#fff8e0', 2));
      fl.position.set(HX, ST + HH - 0.12, HZ0 - 28 - i * 30);
      lv.root.add(fl);
      flicker.push(fl);
    }
    sign(lv, 'NO RUNNING IN THE HALLS', HX - HW / 2 + 0.75, ST + 2.9, -200, 3, 0.45, Math.PI / 2, { bg: '#fff6e6', fg: '#c84a5a', glow: 1 });
    sign(lv, 'ROOM 1', HX - HW / 2 + 0.75, ST + 2.9, -170, 1.4, 0.45, Math.PI / 2, { bg: '#fff6e6', fg: '#3a3a5a', glow: 1 });
    sign(lv, 'ROOM 1', HX - HW / 2 + 0.75, ST + 2.9, -250, 1.4, 0.45, Math.PI / 2, { bg: '#fff6e6', fg: '#3a3a5a', glow: 1 });
    sign(lv, 'ROOM 1', HX - HW / 2 + 0.75, ST + 2.9, -320, 1.4, 0.45, Math.PI / 2, { bg: '#fff6e6', fg: '#3a3a5a', glow: 1 });
    // vending alcove with stamp
    b.box({ x: HX + HW / 2 - 0.6, y: ST + 1.2, z: -236, w: 1.2, h: 2.4, d: 1.6, color: '#ff6a7a', mat: m.satin });
    b.add(boxGeo(0.05, 1.6, 1.1), { x: HX + HW / 2 - 1.22, y: ST + 1.4, z: -236, color: '#ffe6b0', mat: m.glow, shadow: false });
    lv.stamp('c3-hallway-vending', HX + HW / 2 - 0.7, ST + 2.5, -236);
    lv.husk(HX, ST, -262, 0, 0.85);
    lv.husk(HX + 1.2, ST, -268, 0, 0.85);
    lv.checkpoint(HX, ST, -156, Math.PI, { objective: 'Follow the hallway', waypoint: new THREE.Vector3(HX, ST, HZ1 + 1), restore: () => { wake(true); lv.parcel('#7affd0'); doorOpen = true; doorCol.enabled = false; doorPanel.position.y = ST + 7; for (const h of husks) { h.alive = false; h.group.visible = false; } } });
    lv.trigger(HX, ST + 1, -215, HW, 4, 2, () => lv.say(['Ori', "(How long is this hallway? The room wasn't this deep.)", 'worried']));
    lv.trigger(HX, ST + 1, -290, HW, 4, 2, () => lv.say(['Ori', "(Room 1. Again. I'm sure I passed Room 1.)", 'scared']));
    sign(lv, 'THE QUIET MALL  →', HX, ST + 3.4, HZ1 + 0.45, 3.6, 0.6, 0, { bg: '#2a5a5a', fg: '#e6fff6', glow: 1.3 });
    b.box({ x: HX, y: ST + 1.3, z: HZ1 + 0.3, w: 3, h: 2.6, d: 0.2, color: '#7ab0a0', mat: m.metal, collide: false });
    lv.trigger(HX, ST + 1, HZ1 + 2, HW, 4, 2.5, async () => {
      lv.lock(true);
      lv.game.audio.door();
      lv.flash('#e6fff6', 0.8);
      await lv.wait(0.7);
      lv.complete();
    });

    // =================== Extended + distant (outside the window + hallway) ===================
    const pal = { wall: ['#ffe6c9', '#d9ecff', '#ffd9e2'], roof: ['#f28fb0', '#7aa6e0', '#8e7cc3'] };
    for (let i = 0; i < 6; i++) house(b, 90 + (i % 3) * 30, -30, -40 - i * 25, { w: 22, d: 22, h: 26, wall: pal.wall[i % 3], roof: pal.roof[i % 3], layer: 'far', lit: i % 2 === 0 });
    for (let i = 0; i < 8; i++) tree(b, 80 + i * 6, -30, -150 + i * 14, 6, { layer: 'far', leaf: '#9fd6a8' });
    cloudIsland(b, 140, -100, 120, 200, -30, 301, { layer: 'far' });
    // school wing seen from hallway windows
    for (let i = 0; i < 5; i++) b.box({ x: 30 + i * 3, y: ST - 10 + 12, z: -180 - i * 34, w: 24, h: 24, d: 26, color: '#f2d6c2', layer: 'far', collide: false });
    cloudHorizon(lv, 0, -150, { radius: 380, count: 220, y: -10, ySpread: 60, size: 90, lit: '#ffffff', shade: '#bcd0f0' });
    cloudField(lv, 60, 300, -400, 100, 10, { count: 120, size: 28, lit: '#ffffff', shade: '#c8d8f0', seed: 3 });

    // =================== Runtime ===================
    let ferryT = 0;
    lv.onUpdate((dt, t) => {
      if (trainRunning) {
        ferryT += dt;
        const k = (Math.sin(ferryT * 0.32 - Math.PI / 2) + 1) / 2;
        ferry.move(-34, DT + 1.0, -104 - k * 29);
        mobile.rotation.y += dt * 0.25;
        bells.forEach((bl, i) => (bl.rotation.z = (i ? -0.5 : 0.5) + Math.sin(t * 40) * (ferryT < 4 ? 0.2 : 0)));
      } else {
        ferry.col.delta!.set(0, 0, 0);
      }
      flicker.forEach((f, i) => (f.visible = Math.sin(t * (7 + i) + i * 3) > -0.6 || Math.sin(t * 31 + i) > 0.2));
      crack.visible = true;
    });

    lv.intro = async () => {
      lv.lock(true);
      lv.cine([-27, 3, -18], [-20, 14, -60], 62);
      await lv.wait(1.2);
      await lv.say(
        ['Ori', '(Okay. Either the room is enormous, or I am very, very small.)', 'surprised'],
        ['Ori', "(It's so quiet. Everything's grey, like the garden was.)", 'worried'],
        ['Ori', '(Somebody is counting. Up on the desk.)', 'curious'],
      );
      lv.cineEnd();
      lv.lock(false);
      lv.objective('Climb up to the desk', [-34, 9.7, -43]);
    };
  },
};
