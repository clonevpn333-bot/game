import * as THREE from 'three';
import type { ChapterDef } from '../game/types';
import type { Level } from '../game/Level';
import { look } from '../render/Atmosphere';
import { Tex } from '../render/Textures';
import { boxGeo, roundedGeo } from '../world/Geo';
import { door } from '../world/Interior';
import { audio, glowMat, sign } from './common';
import { createSeededRandom } from '../core/rng';
import type { Sleepless, Watcher } from '../entities/Actors';

const LOOK = look({
  sky: { top: '#5a4e2a', mid: '#8a7a3a', sun: '#000000', cloudCover: 0, seaAmount: 0, ceiling: 1 },
  fog: { color: '#bfae62', sun: '#bfae62', low: '#8a7a3a', density: 0.042, base: 0, falloff: 0.001, heightMix: 0, max: 0.93 },
  sunDir: [0.1, 1, 0.1],
  sunColor: '#fff4c0',
  sunIntensity: 0.2,
  hemiSky: '#fff2b0',
  hemiGround: '#8a7030',
  hemiIntensity: 1.25,
  rimColor: '#fff0a0',
  rimStrength: 0.12,
  envIntensity: 0.3,
  wobble: 0.025,
  dread: 0.8,
  shadows: false,
  post: { bloom: 0.75, bloomThreshold: 0.78, warp: 0.9, edgeBlur: 0.9, desat: 0.05, grain: 0.2, vignette: 0.55, lift: 0.08, shadowTint: '#e0d090', highlightTint: '#fff6c8', contrast: 1.12, exposure: 1, glitch: 0.02 },
  motes: { kind: 'dust', color: '#fff6c0', density: 0.7 },
});

const DARK = look({
  ...LOOK,
  fog: { ...LOOK.fog, color: '#3a3218', sun: '#3a3218', low: '#1a160a', density: 0.06 },
  hemiSky: '#c8a860',
  hemiIntensity: 0.6,
  dread: 0.9,
  post: { ...LOOK.post, desat: 0.2, grain: 0.24, vignette: 0.75, glitch: 0.06, shadowTint: '#c09070' },
});

export const ch08: ChapterDef = {
  id: 7,
  key: 'yellow-rooms',
  title: 'The Yellow Rooms',
  subtitle: 'The dream ran out of new rooms. So it kept the old ones.',
  uiDread: 2,
  oriDread: 0.8,
  parcelColor: '#ffe880',
  look: LOOK,
  audio: audio({
    chords: [[45, 52, 56], [44, 51, 55], [43, 50, 53], [44, 48, 55]],
    chordDur: 12,
    padType: 'sine',
    padGain: 0.35,
    bellGain: 0.15,
    arpEvery: 0,
    wobble: 0.3,
    pitch: 0.92,
    lowpass: 1200,
    reverb: 1,
    hum: 1,
    room: 0.5,
    drone: 0.4,
  }),
  build(lv: Level) {
    const b = lv.b;
    const m = lv.mats;
    lv.killY = -20;
    const wallT = Tex.yellowWallpaper();
    const wall = m.tex('yellowWall', wallT, { roughness: 0.9 });
    const carpet = m.tex('yellowCarpet', Tex.carpet('#a8955a'), { roughness: 1 });
    const ceilT = Tex.ceilingTiles().clone();
    ceilT.repeat.set(1 / 2.4, 1 / 2.4);
    const ceil = m.tex('yellowCeil', ceilT, { roughness: 0.9 });
    const rnd = createSeededRandom(808);

    // =================== maze generation (seeded, linear-but-mazy) ===================
    const NX = 10, NZ = 12, S = 7, H = 3.1;
    const X0 = -S / 2, Z0 = S / 2;
    const cx = (i: number) => i * S;
    const cz = (j: number) => -j * S;
    // walls: vertical edges v[i][j] between (i,j)-(i+1,j); horizontal edges h[i][j] between (i,j)-(i,j+1)
    const v: boolean[][] = Array.from({ length: NX - 1 }, () => Array(NZ).fill(true));
    const h: boolean[][] = Array.from({ length: NX }, () => Array(NZ - 1).fill(true));
    const seen: boolean[][] = Array.from({ length: NX }, () => Array(NZ).fill(false));
    const stack: Array<[number, number]> = [[0, 0]];
    seen[0][0] = true;
    while (stack.length) {
      const [i, j] = stack[stack.length - 1];
      const n: Array<[number, number]> = [];
      if (i > 0 && !seen[i - 1][j]) n.push([i - 1, j]);
      if (i < NX - 1 && !seen[i + 1][j]) n.push([i + 1, j]);
      if (j > 0 && !seen[i][j - 1]) n.push([i, j - 1]);
      if (j < NZ - 1 && !seen[i][j + 1]) n.push([i, j + 1]);
      if (!n.length) {
        stack.pop();
        continue;
      }
      const [a, c] = n[Math.floor(rnd() * n.length)];
      if (a !== i) v[Math.min(a, i)][j] = false;
      else h[i][Math.min(c, j)] = false;
      seen[a][c] = true;
      stack.push([a, c]);
    }
    // open extra loops so it feels like rooms, not corridors
    for (let i = 0; i < NX - 1; i++) for (let j = 0; j < NZ; j++) if (rnd() < 0.28) v[i][j] = false;
    for (let i = 0; i < NX; i++) for (let j = 0; j < NZ - 1; j++) if (rnd() < 0.28) h[i][j] = false;
    // BFS route start → exit (for the hum guidance)
    const EXIT: [number, number] = [NX - 1, NZ - 1];
    const prev = new Map<string, string>();
    const q: Array<[number, number]> = [[0, 0]];
    const key = (i: number, j: number) => `${i},${j}`;
    prev.set(key(0, 0), '');
    while (q.length) {
      const [i, j] = q.shift()!;
      if (i === EXIT[0] && j === EXIT[1]) break;
      const tryN = (a: number, c: number, open: boolean) => {
        if (open && !prev.has(key(a, c))) {
          prev.set(key(a, c), key(i, j));
          q.push([a, c]);
        }
      };
      if (i > 0) tryN(i - 1, j, !v[i - 1][j]);
      if (i < NX - 1) tryN(i + 1, j, !v[i][j]);
      if (j > 0) tryN(i, j - 1, !h[i][j - 1]);
      if (j < NZ - 1) tryN(i, j + 1, !h[i][j]);
    }
    const route: THREE.Vector3[] = [];
    let k = key(EXIT[0], EXIT[1]);
    while (k) {
      const [i, j] = k.split(',').map(Number);
      route.unshift(new THREE.Vector3(cx(i), 0, cz(j)));
      k = prev.get(k) ?? '';
    }

    // =================== build ===================
    const W = NX * S, D = NZ * S;
    b.box({ x: X0 + W / 2, y: -0.25, z: Z0 - D / 2, w: W, h: 0.5, d: D, mat: carpet, color: '#ffffff', surface: 'carpet' });
    b.box({ x: X0 + W / 2, y: H + 0.2, z: Z0 - D / 2, w: W, h: 0.4, d: D, mat: ceil, color: '#ffffff', climbable: false });
    const T = 0.3;
    const wallBox = (x: number, z: number, w: number, d: number) => b.box({ x, y: H / 2, z, w, h: H, d, mat: wall, color: '#ffffff', climbable: false, ao: 0.25 });
    // outer walls
    wallBox(X0 + W / 2, Z0 + T / 2, W, T);
    wallBox(X0 + W / 2, Z0 - D - T / 2, W, T);
    wallBox(X0 - T / 2, Z0 - D / 2, T, D);
    wallBox(X0 + W + T / 2, Z0 - D / 2, T, D);
    for (let i = 0; i < NX - 1; i++) for (let j = 0; j < NZ; j++) if (v[i][j]) wallBox(cx(i) + S / 2, cz(j), T, S + T);
    for (let i = 0; i < NX; i++) for (let j = 0; j < NZ - 1; j++) if (h[i][j]) wallBox(cx(i), cz(j) - S / 2, S + T, T);
    // baseboards are part of the feeling
    // fluorescent panels: one per cell, some dead
    const flickerers: THREE.Mesh[] = [];
    for (let i = 0; i < NX; i++)
      for (let j = 0; j < NZ; j++) {
        const r = rnd();
        if (r < 0.1) {
          b.add(boxGeo(1.2, 0.05, 0.6), { x: cx(i), y: H - 0.02, z: cz(j), color: '#7a7050', shadow: false, ao: 0 });
        } else if (r < 0.2) {
          const fl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.6), glowMat('#fff8d8', 1.8));
          fl.position.set(cx(i), H - 0.04, cz(j));
          lv.root.add(fl);
          flickerers.push(fl);
        } else b.add(boxGeo(1.2, 0.05, 0.6), { x: cx(i), y: H - 0.02, z: cz(j), color: '#fff8d8', mat: m.glow, shadow: false, ao: 0 });
      }
    // wrong details
    const chair = (x: number, z: number, ry: number) => {
      b.box({ x, y: 0.45, z, w: 0.5, h: 0.06, d: 0.5, ry, color: '#6a5a3a', collide: false });
      b.box({ x: x - Math.sin(ry) * 0.24, y: 0.75, z: z - Math.cos(ry) * 0.24, w: 0.5, h: 0.6, d: 0.06, ry, color: '#6a5a3a', collide: false });
      for (const [dx, dz] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) b.add(boxGeo(0.04, 0.45, 0.04), { x: x + dx, y: 0.22, z: z + dz, color: '#4a3a2a' });
      b.physics.addBox(x, 0.45, z, 0.6, 0.9, 0.6, { climbable: true });
    };
    for (let n = 0; n < 9; n++) {
      const i = Math.floor(rnd() * NX), j = 1 + Math.floor(rnd() * (NZ - 2));
      const kind = n % 4;
      const x = cx(i) + (rnd() - 0.5) * 3, z = cz(j) + (rnd() - 0.5) * 3;
      if (kind === 0) chair(x, z, rnd() * Math.PI * 2);
      if (kind === 1) door(b, cx(i) - S / 2 + 0.16, 0, cz(j), Math.PI / 2, { color: '#c8b070', frame: '#e8d890' });
      if (kind === 2) b.add(new THREE.CircleGeometry(1.2 + rnd(), 24), { x, y: 0.01, z, rx: -Math.PI / 2, color: '#6a6040', mat: m.water, shadow: false, ao: 0 });
      if (kind === 3) sign(lv, 'EXIT →', cx(i), 2.6, cz(j) - S / 2 + 0.17, 0.8, 0.3, 0, { bg: '#1a3a1a', fg: '#7aff8a', glow: 1.6 });
    }
    // the ringing phone
    b.box({ x: cx(3), y: 0.4, z: cz(5), w: 0.7, h: 0.8, d: 0.5, color: '#8a7a5a' });
    b.add(roundedGeo(0.3, 0.12, 0.2, 0.04, 1), { x: cx(3), y: 0.86, z: cz(5), color: '#c84a4a', mat: m.satin });
    lv.interact(cx(3), 1, cz(5), 'Answer the phone', () => lv.say(['Voice', '...hello? is anyone dreaming? hello? hello? is anyone—'], ['Ori', '(The line goes dead. It was my voice.)', 'scared']), { radius: 1.8, once: true });
    lv.stamp('c8-phone', cx(3) + 1.2, 0, cz(5) - 1.2);
    lv.stamp('c8-dead-end', cx(0), 0, cz(NZ - 1));
    lv.stamp('c8-far-corner', cx(NX - 1), 0, cz(0));

    // start + exit
    lv.setStart(0, 0, -1.2, Math.PI);
    const exitPos = route[route.length - 1];
    door(b, exitPos.x, 0, exitPos.z - S / 2 + 0.2, 0, { color: '#ffffff', frame: '#ffffff', w: 1.1 });
    const exitGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), glowMat('#ffffff', 2.5));
    exitGlow.position.set(exitPos.x, 1.1, exitPos.z - S / 2 + 0.3);
    lv.root.add(exitGlow);
    lv.trigger(exitPos.x, 1, exitPos.z - S / 2 + 1, 2, 3, 1.6, async () => {
      lv.lock(true);
      sleepless.hunting = false;
      lv.chase = 0;
      lv.flash('#ffffff', 1);
      lv.game.audio.wake();
      await lv.wait(0.8);
      lv.complete();
    });

    // =================== threats ===================
    const watchers: Watcher[] = [];
    for (const idx of [4, 9, 14]) {
      const p = route[Math.min(idx, route.length - 1)];
      const w = lv.watcher(p.x + (rnd() > 0.5 ? 1 : -1) * 2.6, 0, p.z - 2.6, 1.15);
      w.mode = 'vanishOnLook';
      watchers.push(w);
    }
    const chaseAt = Math.floor(route.length * 0.55);
    const spawnAt = Math.max(0, chaseAt - 4);
    const sleepless: Sleepless = lv.sleepless(route[spawnAt].x, 0, route[spawnAt].z, 1.3);
    sleepless.chaseSpeed = 6.9;
    let chasing = false;
    const startChase = async (instant: boolean) => {
      chasing = true;
      sleepless.placeAt(route[spawnAt]);
      sleepless.hunting = true;
      lv.setLook(DARK, instant ? 0.01 : 1.2);
      lv.chase = 1;
      if (!instant) {
        lv.glitch(1);
        lv.shake(0.5);
        await lv.say(['Ori', '(Something is in the rooms with me. It does not belong in a dream at all.)', 'scared']);
      }
      lv.objective('RUN — follow the hum (Pulse to see the way)', exitPos);
    };
    const cpChase = lv.checkpoint(route[chaseAt - 1].x, 0, route[chaseAt - 1].z, Math.PI, { objective: 'Keep moving. Follow the hum (Pulse)', waypoint: null, radius: 2.5 });
    lv.trigger(route[chaseAt].x, 1, route[chaseAt].z, S - 1, 3, S - 1, () => void startChase(false), { reArm: true });
    lv.onRespawn(() => {
      sleepless.hunting = false;
      chasing = false;
      lv.setLook(LOOK, 0.01);
      void cpChase;
    });

    // =================== the hum: pulse shows the way ===================
    lv.onPulse((o) => {
      // nearest route node, then trail the next few nodes
      let best = 0;
      let bd = Infinity;
      route.forEach((p, i) => {
        const d = p.distanceTo(new THREE.Vector3(o.x, 0, o.z));
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      const pts = route.slice(best, best + 6);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], c = pts[i + 1];
        for (let s = 0; s < 6; s++) {
          const p = a.clone().lerp(c, s / 6);
          p.y = 0.6;
          lv.after(i * 0.15 + s * 0.02, () => lv.game.vfx.emit(p, 3, { color: '#ffe880', color2: '#ffffff', speed: 0.3, up: 0.6, life: 3.5, size: 0.22, drag: 1 }));
        }
      }
      lv.game.audio.chime(0.6);
    });

    // =================== lucidity decay while standing still ===================
    let still = 0;
    let warned = false;
    lv.onUpdate((dt, t) => {
      const sp = Math.hypot(lv.player.body.vel.x, lv.player.body.vel.z);
      if (sp < 0.6 && !lv.game.ui.dialogueOpen && !lv.game.scriptLock) still += dt;
      else still = Math.max(0, still - dt * 2);
      if (still > 3.5) {
        if (!warned) {
          warned = true;
          lv.toast('Keep moving — the rooms are forgetting you');
        }
        if (still > 7) {
          still = 3.5;
          lv.game.drainLucidity(1, 'The Yellow Rooms forgot you.');
        }
      }
      for (const f of flickerers) f.visible = Math.sin(t * 13 + f.position.x) > -0.3 || Math.sin(t * 47 + f.position.z) > 0.6;
      if (chasing) {
        const d = sleepless.position.distanceTo(lv.player.pos);
        lv.game.post.aberrationPulse = Math.max(lv.game.post.aberrationPulse, THREE.MathUtils.clamp(1 - d / 14, 0, 0.8));
        lv.chase = 1;
      }
    });

    // =================== extended layer: rooms beyond rooms ===================
    // (the maze is enclosed; what lies beyond is implied by fog and repetition — add a few
    // false openings to more yellow rooms that never end)
    for (let j = 1; j < NZ; j += 3) {
      b.box({ x: X0 - 4, y: H / 2, z: cz(j), w: 8, h: H, d: S - 1, mat: wall, color: '#ffffff', layer: 'near', collide: false });
    }

    lv.intro = async () => {
      lv.lock(true);
      lv.cine([1.4, 1.7, 3.2], [0, 1.4, -10], 64);
      await lv.wait(1.2);
      await lv.say(
        ['Ori', '(Yellow. The kitchen wallpaper, stretched out forever. The lights hum one note.)', 'scared'],
        ['Ori', "(The parcel's humming the same note. Louder when I'm facing the right way, I think.)", 'worried'],
        ['Ori', "(Don't stand still. Something about standing still here feels like being erased.)", 'scared'],
      );
      lv.cineEnd();
      lv.lock(false);
      lv.objective('Find the way out — Pulse (Q) to hear the hum', null);
      lv.toast('Dream Pulse shows the way for a moment');
    };
  },
};
