import * as THREE from 'three';
import type { ChapterDef } from '../game/types';
import type { Level } from '../game/Level';
import { look } from '../render/Atmosphere';
import { Tex } from '../render/Textures';
import { boxGeo, roundedGeo } from '../world/Geo';
import { bench, lamp, tree } from '../world/Kit';
import { door } from '../world/Interior';
import { audio, cloudField, glowMat, sign, STYLES } from './common';
import { createSeededRandom } from '../core/rng';
import { easeOutBack } from '../core/math';

const LOOK = look({
  sky: { top: '#2a2838', mid: '#6a6880', sun: '#e8e4ff', sunSize: 0.6, cloudLit: '#b8b6c8', cloudShade: '#3a3848', cloudCover: 0.35, seaLit: '#8a889a', seaShade: '#2a2836', seaAmount: 0.6, grid: 0.6, stars: 0.2 },
  fog: { color: '#8a889c', sun: '#c8c4e0', low: '#3a3848', density: 0.009, base: -10, falloff: 0.01, heightMix: 0.3, max: 0.9 },
  sunDir: [0.1, 0.9, -0.4],
  sunColor: '#e8e6ff',
  sunIntensity: 1.6,
  hemiSky: '#b8b6d0',
  hemiGround: '#3a3848',
  hemiIntensity: 0.9,
  rimColor: '#d8d4ff',
  rimStrength: 0.5,
  envIntensity: 0.4,
  wobble: 0.015,
  dread: 0.88,
  post: { bloom: 0.85, bloomThreshold: 0.76, warp: 0.8, edgeBlur: 0.85, desat: 0.55, grain: 0.18, vignette: 0.6, lift: 0.1, shadowTint: '#b8b0e0', highlightTint: '#f2eef8', contrast: 1.15, exposure: 1, glitch: 0.05 },
  motes: { kind: 'static', color: '#e8e4ff', density: 0.7 },
});

export const ch09: ChapterDef = {
  id: 8,
  key: 'unfinished-dream',
  title: 'The Unfinished Dream',
  subtitle: 'Everything you delivered, with the colour taken out.',
  uiDread: 3,
  oriDread: 0.9,
  parcelColor: '#e8e4ff',
  look: LOOK,
  audio: audio({
    chords: [[48, 55, 59, 62], [47, 54, 57, 62], [45, 52, 55, 60], [46, 53, 56, 61]],
    chordDur: 10,
    padType: 'triangle',
    padGain: 0.45,
    bellGain: 0.6,
    arpEvery: 1.8,
    wobble: 0.35,
    pitch: 0.9,
    lowpass: 2000,
    reverb: 1,
    drone: 0.5,
    wind: 0.2,
  }),
  build(lv: Level) {
    const b = lv.b;
    const m = lv.mats;
    lv.killY = -30;
    const rnd = createSeededRandom(909);
    const grey = m.tex('unfinished', Tex.unfinished(), { roughness: 0.85 });
    // wireframe edge collector (one draw call)
    const edgePos: number[] = [];
    const edgesOf = (x: number, y: number, z: number, w: number, h: number, d: number, ry = 0) => {
      const g = new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d));
      g.rotateY(ry);
      g.translate(x, y, z);
      const p = g.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) edgePos.push(p.getX(i), p.getY(i), p.getZ(i));
      g.dispose();
    };
    const frag = (x: number, top: number, z: number, w: number, d: number, h = 1.2, color = '#ffffff') => {
      b.box({ x, y: top - h / 2, z, w, h, d, mat: grey, color, surface: 'stone' });
      edgesOf(x, top - h / 2, z, w, h, d);
    };

    // =================== 1. the grey courier booth (start) ===================
    frag(0, 0, 0, 14, 12, 2);
    b.box({ x: 4, y: 0.55, z: -1.1, w: 3.4, h: 1.1, d: 1.2, mat: grey, color: '#ffffff' });
    edgesOf(4, 0.55, -1.1, 3.4, 1.1, 1.2);
    b.box({ x: 4, y: 1.6, z: -2.9, w: 3.6, h: 3.2, d: 0.5, mat: grey, color: '#d8d8e0' });
    sign(lv, 'ROUTE POST', 4, 3.75, -0.25, 3.0, 0.62, 0, { bg: '#5a5a66', fg: '#c8c8d0', glow: 1 });
    const mabelEcho = lv.resident({ name: 'Mabel', style: { ...STYLES.mabel, material: 'static' }, pos: [4, 0, -2.15], facing: 0, behavior: 'frozen', oblivious: true, bark: ['Ori! There you are. Good mor— Ori! There you are. Good mor—'] });
    void mabelEcho;
    lamp(b, -5, 0, 4, { color: '#5a5a66', bulb: '#e8e4ff' });
    tree(b, -5.5, 0, -3, 0.9, { leaf: '#b8b8c4', trunk: '#8a8a94' });
    lv.setStart(0, 0, 4, Math.PI);

    // =================== 2. fragments path ===================
    // station bench fragment
    frag(-2, 0.6, -10, 5, 4);
    bench(b, -2, 0.6, -10, 0, '#9a9aa6');
    // toy block fragment
    frag(1.5, 1.8, -15, 3.4, 3.4, 3.4, '#ffffff');
    // escalator fragment (ramp)
    b.ramp(1, -19.7, 3, 6, 1.8, 4.2, 'z', -1, { mat: grey, color: '#ffffff' });
    edgesOf(1, 3, -19.7, 3, 0.3, 6.3);
    frag(1, 4.2, -24.7, 5, 4);
    // the hotel door standing alone — walk through it
    frag(-4, 4.2, -29.5, 6, 6);
    door(b, -4, 4.2, -31.7, 0, { color: '#6b2a3a', frame: '#e8c27a' });
    lv.trigger(-4, 5.4, -32.4, 1.2, 2.4, 1, async () => {
      lv.game.audio.door();
      lv.flash('#e8e4ff', 0.6);
      lv.player.teleport(new THREE.Vector3(14, 6.6, -46), Math.PI);
      lv.game.camRig.snap(lv.player.pos, 0);
      await lv.say(['Ori', '(I walked through the hotel door... and came out somewhere else. Dreams do that. Unfinished ones do it badly.)', 'worried']);
    }, { once: false });
    sign(lv, 'ROOM 0412', -4, 6.8, -31.6, 0.8, 0.25, 0, { bg: '#e8c27a', fg: '#3a1a1a', glow: 1 });
    lv.trigger(1, 5, -24.7, 4, 3, 3, () => lv.say(['Ori', '(The hotel door is just standing there. No hotel.)', 'curious']));
    // office cubicle fragment (where the door lets you out)
    frag(14, 6.6, -48, 7, 7);
    for (const dx of [-1.5, 1.5]) {
      b.box({ x: 14 + dx, y: 6.6 + 0.7, z: -50.5, w: 2.8, h: 1.4, d: 0.12, color: '#c8c8d0', mat: grey });
    }
    b.add(roundedGeo(0.7, 0.45, 0.06, 0.02, 1), { x: 14.5, y: 7.9, z: -50.2, color: '#d8d6ff', mat: m.glow, shadow: false });
    lv.checkpoint(14, 6.6, -46, Math.PI, { objective: 'Wake the fragment anchor', waypoint: new THREE.Vector3(14, 6.6, -50) });

    // =================== 3. fragment anchor → bridge ===================
    const chunks: Array<{ mesh: THREE.Mesh; col: ReturnType<typeof b.physics.addBox>; to: THREE.Vector3; from: THREE.Vector3; rot: THREE.Euler }> = [];
    const bridgeY = 6.6;
    for (let i = 0; i < 7; i++) {
      const to = new THREE.Vector3(14 - i * 0.6, bridgeY - 0.3, -56 - i * 3.8);
      const from = new THREE.Vector3(to.x + (rnd() - 0.5) * 50, to.y + (rnd() - 0.3) * 30, to.z + (rnd() - 0.5) * 30);
      const kinds: Array<[THREE.BufferGeometry, string]> = [
        [roundedGeo(3.4, 0.6, 3.8, 0.1, 2), '#ffffff'],
        [boxGeo(3.4, 0.6, 3.8), '#ffd9e2'],
        [roundedGeo(3.4, 0.6, 3.8, 0.25, 2), '#d9ecff'],
      ];
      const [geo, col] = kinds[i % 3];
      const mesh = b.mesh(geo, i % 3 === 0 ? grey : m.satin, { x: from.x, y: from.y, z: from.z, color: col });
      const rot = new THREE.Euler(rnd() * 2, rnd() * 2, rnd() * 2);
      mesh.rotation.copy(rot);
      const c = b.physics.addBox(to.x, to.y, to.z, 3.4, 0.6, 3.8, { surface: 'stone' });
      c.enabled = false;
      chunks.push({ mesh, col: c, to, from, rot });
    }
    let assembled = false;
    const assemble = (instant: boolean) => {
      assembled = true;
      chunks.forEach((ch, i) => {
        const go = () => {
          ch.col.enabled = true;
          if (instant) {
            ch.mesh.position.copy(ch.to);
            ch.mesh.rotation.set(0, 0, 0);
            return;
          }
          lv.game.audio.blip(300 + i * 40);
          lv.game.tweens.add(1.2, (k) => {
            const e = easeOutBack(k);
            ch.mesh.position.lerpVectors(ch.from, ch.to, e);
            ch.mesh.rotation.set(ch.rot.x * (1 - k), ch.rot.y * (1 - k), ch.rot.z * (1 - k));
          }, (t) => t, () => lv.game.vfx.emit(ch.to.clone().setY(ch.to.y + 0.4), 12, { color: '#e8e4ff', speed: 2, life: 0.6, size: 0.18 }));
        };
        if (instant) go();
        else lv.after(i * 0.35, go);
      });
    };
    lv.anchor(14, 6.6, -50.2, '#e8e4ff', 'Fragment anchor', async () => {
      assemble(false);
      await lv.wait(1.5);
      await lv.say(['Ori', '(Pieces of old dreams, snapping together into a road. The Route builds itself out of whatever is left.)', 'worried']);
      lv.objective('Cross the assembled bridge', [10, bridgeY, -84]);
    });

    // =================== 4. the staircase where down goes up ===================
    const LZ = -86;
    frag(10, bridgeY, LZ, 8, 8, 1.2);
    sign(lv, 'UP ↓', 10, bridgeY + 2.4, LZ - 3.9, 1.6, 0.6, 0, { bg: '#e8e4ff', fg: '#3a3848', glow: 1.2 });
    // stairs going DOWN from the landing (to y bridgeY-6) along -z
    b.stairs(10, LZ - 8, 3, bridgeY - 6, bridgeY, 8, 'z', 1, { mat: grey, color: '#ffffff' });
    frag(10, bridgeY - 6, LZ - 15, 6, 6, 1.2);
    // ...and arriving at the mirrored bottom landing, far above
    const UP = 24;
    frag(10, bridgeY - 6 + UP, LZ - 15, 6, 6, 1.2);
    b.stairs(10, LZ - 8, 3, bridgeY - 6 + UP, bridgeY + UP, 8, 'z', 1, { mat: grey, color: '#ffffff' });
    frag(10, bridgeY + UP, LZ, 8, 8, 1.2);
    lv.trigger(10, bridgeY - 5, LZ - 15, 5.5, 3, 5.5, () => {
      lv.game.warp(0, UP, 0);
      lv.glitch(0.6);
      lv.game.audio.stinger('watcher');
      void lv.say(['Ori', '(I went down the stairs. Now I\'m above where I started.)', 'scared']);
      lv.objective('Continue across the plaza', [10, bridgeY - 6 + UP, LZ - 61]);
    }, { once: false });
    lv.checkpoint(10, bridgeY - 6 + UP, LZ - 15, Math.PI, { objective: 'Continue across the plaza', waypoint: new THREE.Vector3(10, bridgeY - 6 + UP, LZ - 61), restore: () => assemble(true), radius: 2 });

    // =================== 5. the plaza of copies (gauntlet) ===================
    const PY = bridgeY - 6 + UP;
    const PZ = LZ - 18 - 17;
    frag(10, PY, PZ, 30, 34, 1.4);
    // checker floor tint, fountain fragment, pillars
    b.add(new THREE.CylinderGeometry(4, 4.3, 0.8, 32), { x: 10, y: PY + 0.4, z: PZ, mat: grey, color: '#ffffff' });
    b.physics.addBox(10, PY + 0.4, PZ, 8, 0.8, 8, {});
    for (const [x, z] of [[-2, PZ + 12], [22, PZ + 12], [-2, PZ - 12], [22, PZ - 12]] as const) {
      b.add(new THREE.CylinderGeometry(0.6, 0.6, 8, 12), { x, y: PY + 4, z, mat: grey, color: '#ffffff' });
      b.physics.addBox(x, PY + 4, z, 1.2, 8, 1.2, { climbable: false });
    }
    // frozen copies of residents (statue-like)
    const copies: Array<[number, number, typeof STYLES.mabel, number]> = [
      [2, PZ + 8, STYLES.commuter, 0.4], [18, PZ + 6, STYLES.shopkeeper, -0.6], [4, PZ - 6, STYLES.kid('#c8c8d0', '#5a5a66'), 2.4], [16, PZ - 10, STYLES.clerk, 3.0],
    ];
    copies.forEach(([x, z, st, f], i) => lv.resident({ name: `Copy ${i}`, style: { ...st, material: 'mannequin', top: '#c8c8d4', bottom: '#a8a8b8', umbrella: null }, pos: [x, PY, z], facing: f, behavior: 'frozen', oblivious: true }));
    const statics = [lv.staticFigure(0, PY, PZ - 2, 0), lv.staticFigure(20, PY, PZ + 2, 0), lv.staticFigure(10, PY, PZ - 14, 0)];
    for (const s of statics) s.speedUnseen = 6.4;
    const husks = [lv.husk(6, PY, PZ - 8, 0, 1), lv.husk(14, PY, PZ - 8, 0, 1), lv.husk(10, PY, PZ + 4, 0, 1.1)];
    void husks;
    lv.trigger(10, PY + 1, PZ + 14, 20, 4, 3, () => lv.say(['Ori', '(Everyone I met. Copied, emptied, and left standing here like furniture.)', 'sad']));
    lv.stamp('c9-fountain', 10, PY + 0.8, PZ);
    frag(-7, PY + 1.0, PZ + 6, 2.4, 2.4, 1);
    lv.stamp('c9-floating-corner', -7, PY + 1.0, PZ + 6);
    lv.stamp('c9-booth', 6.8, 0, 1);

    // =================== 6. the giant door to the core ===================
    const DZ = PZ - 26;
    frag(10, PY, DZ + 4, 8, 10, 1.4);
    for (const dx of [-3.5, 3.5]) b.box({ x: 10 + dx, y: PY + 5, z: DZ, w: 1, h: 10, d: 1, mat: grey, color: '#ffffff' });
    b.box({ x: 10, y: PY + 10.5, z: DZ, w: 8, h: 1, d: 1, mat: grey, color: '#ffffff' });
    edgesOf(10, PY + 5.5, DZ, 8, 11, 1);
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(6, 10), glowMat('#ffffff', 2.4));
    portal.position.set(10, PY + 5, DZ);
    lv.root.add(portal);
    lv.trigger(10, PY + 2, DZ, 6, 4, 1.4, async () => {
      lv.lock(true);
      lv.flash('#ffffff', 1);
      lv.game.audio.wake();
      await lv.wait(0.8);
      lv.complete();
    });

    // =================== extended + distant ===================
    // upside-down apartment blocks hanging from above
    for (let i = 0; i < 22; i++) {
      const x = (rnd() - 0.5) * 260, z = 40 - rnd() * 300;
      const hgt = 30 + rnd() * 60;
      b.box({ x, y: 120 - hgt / 2, z, w: 12 + rnd() * 10, h: hgt, d: 12 + rnd() * 10, mat: grey, color: '#9a98aa', layer: 'far', collide: false });
    }
    // inverted houses: rotate a few explicitly
    for (let i = 0; i < 10; i++) {
      const hx = (rnd() - 0.5) * 120, hz = -20 - rnd() * 140;
      b.add(roundedGeo(5, 4, 5, 0.2, 2), { x: hx, y: 60 + rnd() * 20, z: hz, rx: Math.PI, color: '#b8b6c8', mat: grey, layer: 'far' });
    }
    // drifting unassembled fragments
    const drifters: THREE.Mesh[] = [];
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(i % 2 ? boxGeo(2 + rnd() * 3, 0.5, 2 + rnd() * 3) : roundedGeo(2, 2, 2, 0.2, 2), grey);
      mesh.position.set((rnd() - 0.5) * 160, -20 + rnd() * 60, 20 - rnd() * 220);
      mesh.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
      mesh.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(mesh.geometry.getAttribute('position').count * 3).fill(0.9), 3));
      lv.root.add(mesh);
      drifters.push(mesh);
    }
    cloudField(lv, -200, 200, -300, 100, -25, { count: 160, size: 30, lit: '#8a889a', shade: '#2a2836', seed: 19 });
    cloudField(lv, -200, 200, -300, 100, 140, { count: 120, size: 40, lit: '#a8a6b8', shade: '#3a3848', seed: 20 });
    // finish edges
    const eg = new THREE.BufferGeometry();
    eg.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
    const lines = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ color: new THREE.Color(1.4, 1.35, 2.2), toneMapped: false, transparent: true, opacity: 0.7 }));
    lv.root.add(lines);

    lv.onUpdate((dt, t) => {
      for (const d of drifters) {
        d.rotation.x += dt * 0.05;
        d.rotation.y += dt * 0.03;
        d.position.y += Math.sin(t * 0.3 + d.position.x) * 0.005;
      }
      if (!assembled) for (const ch of chunks) {
        ch.mesh.rotation.x += dt * 0.1;
        ch.mesh.position.y = ch.from.y + Math.sin(t * 0.5 + ch.from.x) * 0.5;
      }
      portal.scale.x = 1 + Math.sin(t * 2) * 0.02;
    });

    lv.intro = async () => {
      lv.lock(true);
      lv.cine([3, 3, 9], [2, 1, -20], 58);
      await lv.wait(1.2);
      await lv.say(
        ['Ori', "(The booth. Mabel. The lamp. All of it — grey, like a drawing nobody coloured in.)", 'sad'],
        ['Mabel', 'Ori! There you are. Good mor— Ori! There you are. Good mor—'],
        ['Ori', 'Mabel? ...No. That isn\'t you.', 'scared'],
        ['Ori', '(The parcel in my bag is blank. No address. It feels like it\'s holding its breath.)', 'worried'],
      );
      lv.cineEnd();
      lv.lock(false);
      lv.objective('Cross the fragments', [-4, 4.2, -31]);
    };
  },
};
