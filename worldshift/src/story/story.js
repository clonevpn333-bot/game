// The full story: prologue, chapters, contained levels, bosses and ending.
import * as THREE from 'three';
import { G } from '../core/state.js';
import { Level, C } from './levels.js';
import { Cutscenes } from './cutscene.js';
import { Dutch, Warden, Hollow, Continuum, updateBossFX, clearBossFX } from './bosses.js';
import { LAYER as Ly } from '../world/textures.js';
import { CF, SURF } from '../world/collision.js';
import { LANDMARKS, blockRect, landmarkCenter } from '../world/layout.js';
import { seedLotRect, spireRect, SPIRE } from '../world/landmarks.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ===========================================================================
// LEVEL 1 — THE CANNERY (Red Sevens hideout, The Yards)
// 1996: working hideout · 2047: gutted server farm · 2189: collapsed shell
// ===========================================================================
const CANNERY = {
  id: 'cannery', name: 'The Cannery', sub: 'Red Sevens hideout · The Yards', origin: [3000, 0, 0],
  spawn: [0, 0, 2, 0], startEra: 0,
  objective: (L) => !L.flags.gate ? 'Get past the rolled-down gate (the 1996 gate rusted away by 2189)'
    : !L.flags.floor ? 'The 2189 floor is gone — cross it in 1996'
      : !L.flags.lever ? 'Open the arena door from the control booth (1996)'
        : !L.flags.bossDead ? 'Take down Dutch Kowalski' : 'Leave through the loading dock',
  build(B, era, f) {
    const brick = era === 2 ? C('#8a7a6a') : C('#d8c8c0');
    const wall = { wall: Ly.brick, wallCol: brick, floor: era === 2 ? Ly.rubble : Ly.concrete, ceilLayer: Ly.corrugated, ceilCol: C('#8a8e92') };
    // Room A: entry hall
    B.room(-8, 0, 8, 20, 6, { ...wall, gaps: { s: [-3, 3, 4.5] } });
    B.light(0, 5.6, 8, era === 1 ? 0xbfe8ff : 0xffc080, era === 2 ? 0 : 30);
    // Gate between A and B (z=20)
    if (era === 0) B.box(-3, 0, 19.8, 3, 4.5, 20.2, { layer: Ly.corrugated, col: C('#7a8a9a') });
    if (era === 1) B.box(-3, 0, 19.6, 3, 4.5, 20.4, { layer: Ly.panel, col: C('#2a2f38') });
    if (era === 2) { B.box(-3, 3.6, 19.8, 3, 4.5, 20.2, { layer: Ly.rust, col: C('#8a5a40') }); B.prop('rubble_1', 2.4, 0, 19, 0, 0.6); }
    // Room B: processing floor
    const ceil = era !== 2;
    B.room(-12, 20, 12, 44, 8, { ...wall, ceiling: ceil, gaps: { n: [-3, 3, 4.5], s: [-3, 3, 5] } });
    if (era === 2) {
      // floor collapsed into a flooded pit (only a strip by the gate survives)
      B.box(-12, -0.4, 20, 12, 0, 22.5, { layer: Ly.rubble, col: C('#8a8478') });
      B.box(-12, -0.4, 41.5, 12, 0, 44, { layer: Ly.rubble, col: C('#8a8478') });
      B.box(-12, -9, 22.5, 12, -8, 41.5, { layer: Ly.rubble, col: C('#5a5a50') });
      B.water(-12, 22.5, 12, 41.5, -6, [0.25, 0.45, 0.35]);
      B.hazard(-12, 22.5, 12, 41.5, -10, -5, 30, 'Toxic water!');
      for (let i = 0; i < 5; i++) B.prop('ivy', -11.6, 7, 24 + i * 4, Math.PI / 2, 1.2, { noCollide: true });
    } else {
      // conveyor lines + crates (cover)
      for (const x of [-7, 7]) B.box(x - 1, 0, 25, x + 1, 1.1, 39, { layer: Ly.metal, col: era === 1 ? C('#1a1e24') : C('#5a6a6a') });
      if (era === 1) for (let z = 26; z < 40; z += 3) B.glow(-0.9, 0.4, z, 0.9, 1.9, z + 0.1, [0.3, 2.4, 1], 4);
      B.prop('crate', -3, 0, 30); B.prop('crate', 3.5, 0, 34, 0.4); B.prop('pallet', 0, 0, 38); B.prop('drum', -4, 0, 36);
      // control booth with stairs (lever)
      B.box(6, 3.2, 40, 12, 3.6, 44, { layer: Ly.metal, col: C('#4a4f55') });
      B.box(6, 3.6, 40, 6.3, 4.6, 44, { layer: Ly.metal, col: C('#4a4f55') });
      B.light(0, 7.5, 32, era === 1 ? 0x9fe8ff : 0xffb070, 40, 28);
      if (era === 0 && !f.lever) B.interact(9, 4.2, 42, 2.2, 'cannery_lever', 'Pull the arena door lever', () => true);
    }
    // stairs to booth (ramp collider + steps)
    if (era !== 2) {
      const st = B.ctx.collider(3000 + 1, -0.5, 40.4, 3000 + 6, 3.6, 41.8);
      st.ramp = { axis: 'x', y0: 0, y1: 3.6, thick: 0.6 };
      for (let i = 0; i < 9; i++) B.box(1 + i * 0.55, 0, 40.4, 1.55 + i * 0.55, 0.4 + i * 0.4, 41.8, { layer: Ly.metal, col: C('#4a4f55'), collide: false });
    }
    // Arena door (z=44)
    const doorOpen = f.lever || era === 2;
    if (!doorOpen) B.box(-3, 0, 43.8, 3, 5, 44.2, { layer: Ly.corrugated, col: C('#8a3a2a') });
    // Room C: the arena
    B.room(-16, 44, 16, 76, 12, { ...wall, ceiling: era !== 2, gaps: { n: [-3, 3, 5], s: [-4, 4, 6] } });
    if (era === 2) {
      // holes in the arena floor
      B.hazard(-12, 52, -6, 58, -1, 0.6, 40, 'Falling debris below!');
      B.box(-12, 0.01, 52, -6, 0.05, 58, { kind: 'emissive', col: [0.05, 0.05, 0.04], collide: false });
      B.hazard(6, 64, 12, 70, -1, 0.6, 40);
      B.box(6, 0.01, 64, 12, 0.05, 70, { kind: 'emissive', col: [0.05, 0.05, 0.04], collide: false });
    } else {
      for (const [x, z] of [[-8, 52], [8, 56], [-6, 66], [9, 68], [0, 60]]) { B.prop('container_' + ((x + z) & 5), x, 0, z, (x * 0.1), 0.5); }
      B.light(-8, 11, 58, 0xffa060, 40, 30); B.light(8, 11, 68, 0xffa060, 40, 30);
      if (era === 1) { B.glow(-16, 2, 50, -15.6, 10, 70, [0.2, 1.6, 2.6], 2); B.glow(15.6, 2, 50, 16, 10, 70, [2.6, 0.3, 1.8], 2); }
    }
    // exit dock door
    if (!f.bossDead && era === 0) B.box(-4, 0, 75.8, 4, 6, 76.2, { layer: Ly.corrugated, col: C('#6a6a70') });
    if (f.bossDead) B.interact(0, 1, 74, 3, 'level_exit', 'Leave the cannery', () => true);
  },
  update(L) {
    const p = L.local();
    if (!L.flags.gate && p.z > 20.5) L.setFlag('gate');
    if (L.flags.gate && !L.flags.floor && p.z > 42) L.setFlag('floor');
    if (L.flags.lever && !L.flags.bossStarted && p.z > 47 && G.era === 0) STORY.dutchIntro(L);
  },
};

// ===========================================================================
// LEVEL 2 — THE UNDERCROFT (beneath the Halvorsen Spire)
// 1996: cold-war bunker · 2047: AEGIS black lab · 2189: flooded ruin
// ===========================================================================
const UNDERCROFT = {
  id: 'undercroft', name: 'The Undercroft', sub: 'Beneath the Halvorsen Spire', origin: [3400, 0, 0],
  spawn: [0, 0, 3, 0], startEra: 1,
  objective: (L) => !L.flags.pastLaser ? 'Lasers in 2047, a blast door in 1996 — weave between eras to get through'
    : !L.flags.inArena ? 'The security door is open in 1996 — reach the core chamber'
      : !L.flags.bossDead ? 'Destroy WARDEN-7 (cut its pylons\' 1996 power trunks first)' : 'Download the Continuum files at the terminal',
  build(B, era, f) {
    const pal = [{ wall: Ly.concrete, col: C('#8a9a8a'), fl: Ly.concrete }, { wall: Ly.panel, col: C('#e8ecf0'), fl: Ly.tiles }, { wall: Ly.concrete, col: C('#5a6a5a'), fl: Ly.rubble }][era];
    const R = { wall: pal.wall, wallCol: pal.col, floor: pal.fl, ceilLayer: pal.wall, ceilCol: pal.col };
    const lc = [0xd8f0c0, 0xcfefff, 0x60ffc0][era];
    B.room(-8, 0, 8, 16, 5, { ...R, gaps: { s: [-3, 3, 4] } });
    B.light(0, 4.6, 8, lc, era === 2 ? 8 : 25);
    // corridor
    B.room(-3, 16, 3, 48, 4.5, { ...R, gaps: { n: [-3, 3, 4], s: [-3, 3, 4] } });
    B.light(0, 4.1, 24, lc, era === 2 ? 6 : 18); B.light(0, 4.1, 40, lc, era === 2 ? 6 : 18);
    if (era === 1) {
      // laser grid at z=26
      for (let k = 0; k < 6; k++) B.glow(-3, 0.3 + k * 0.6, 25.9, 3, 0.35 + k * 0.6, 26.1, [6, 0.2, 0.3], 1);
      B.hazard(-3, 25.5, 3, 26.5, -1, 4, 400, 'LASER GRID');
      B.box(-3.2, 0, 25.6, -2.8, 4.5, 26.4, { layer: Ly.metal, col: C('#222') });
    }
    if (era === 0) B.box(-3, 0, 35.7, 3, 4.5, 36.3, { layer: Ly.metal, col: C('#5a6a5a') }); // blast door
    if (era === 2) { B.water(-3, 18, 3, 46, 0.25, [0.1, 0.4, 0.5]); B.hazard(-3, 18, 3, 46, -1, 1, 45, 'Electrified water!'); B.glow(-3, 0.26, 18, 3, 0.27, 46, [0.1, 0.6, 1.2], 1); }
    // junction room
    B.room(-14, 48, 14, 64, 6, { ...R, gaps: { n: [-3, 3, 4], s: [-3, 3, 4.5] } });
    B.light(0, 5.6, 56, lc, era === 2 ? 8 : 30);
    if (era === 1) { B.box(-3, 0, 63.7, 3, 4.5, 64.3, { layer: Ly.panel, col: C('#1a1e24') }); B.glow(-3.1, 4.5, 63.6, 3.1, 4.7, 63.7, [3, 0.3, 0.3], 2); }
    if (era === 2) { for (let i = 0; i < 4; i++) B.prop('rubble_' + i, -2 + i * 1.4, 0, 63.5, i, 1.6); }
    if (era === 0) for (let i = 0; i < 4; i++) B.prop('drum', -12 + i * 1.2, 0, 50);
    // arena / generator hall / core chamber
    B.room(-18, 64, 18, 100, 14, { ...R, gaps: { n: [-3, 3, 4.5] } });
    B.light(-10, 13, 80, lc, era === 2 ? 10 : 50, 40); B.light(10, 13, 86, lc, era === 2 ? 10 : 50, 40);
    const pyl = [[-10, 74], [10, 74], [0, 92]];
    pyl.forEach(([x, z], i) => {
      if (era === 1 && !f['cut' + i]) { B.box(x - 0.8, 0, z - 0.8, x + 0.8, 5, z + 0.8, { layer: Ly.panel, col: C('#1a1e24') }); B.glow(x - 0.3, 5, z - 0.3, x + 0.3, 9, z + 0.3, [0.3, 2, 4], 2); }
      if (era === 1 && f['cut' + i]) B.prop('rubble_' + i, x, 0, z, 0, 0.8);
      if (era === 0) {
        B.box(x - 1, 0, z - 0.6, x + 1, 2.4, z + 0.6, { layer: Ly.metal, col: C('#4a5a4a') });
        B.glow(x - 0.2, 2.4, z - 0.2, x + 0.2, 14, z + 0.2, f['cut' + i] ? [0.05, 0.05, 0.05] : [2, 1.6, 0.4], f['cut' + i] ? 0 : 1);
        if (!f['cut' + i]) B.interact(x, 1, z - 1.2, 2.4, 'cut' + i, 'Cut the power trunk', () => true);
      }
      if (era === 2) B.prop('rubble_' + i, x, 0, z, 0, 1.2);
    });
    if (era === 0) for (let i = 0; i < 4; i++) B.box(-16, 0, 70 + i * 6, -13, 3, 73 + i * 6, { layer: Ly.metal, col: C('#5a6a5a') });
    if (era === 1) for (const [x, z] of [[-6, 82], [6, 82], [-12, 90], [12, 90]]) B.box(x - 1.2, 0, z - 0.5, x + 1.2, 1.3, z + 0.5, { layer: Ly.panel, col: C('#2a2f38') });
    if (era === 2) { B.water(-18, 64, 18, 100, 0.2, [0.1, 0.35, 0.4]); for (const [x, z] of [[-8, 80], [8, 80], [0, 88]]) B.box(x - 2.5, 0, z - 2.5, x + 2.5, 0.8, z + 2.5, { layer: Ly.rubble, col: C('#7a7a6a') }); B.hazard(-18, 64, 18, 100, -1, 0.6, 30, 'Electrified water!'); }
    if (f.bossDead && era === 1) B.interact(0, 1, 97, 2.5, 'undercroft_terminal', 'Download the Continuum files', () => true);
  },
  update(L) {
    const p = L.local();
    if (!L.flags.pastLaser && p.z > 37) L.setFlag('pastLaser');
    if (!L.flags.inArena && p.z > 66) L.setFlag('inArena');
    if (L.flags.inArena && !L.flags.bossStarted && G.era === 1) STORY.wardenIntro(L);
  },
};

// ===========================================================================
// LEVEL 3 — THE DEEP ARCHIVE (beneath City Hall)
// 1996: subway maintenance tunnel · 2047: data vault · 2189: the Archive
// ===========================================================================
const ARCHIVE = {
  id: 'archive', name: 'The Deep Archive', sub: 'Beneath City Hall', origin: [3800, 0, 0],
  spawn: [0, 0, 3, 0], startEra: 2, checkpoint: [0, 0, 36, 0],
  objective: (L) => !L.flags.crossed ? 'Cross the chasm (a 2047 catwalk spans it; a 2047 gate blocks the far side)'
    : !(L.flags.m0 && L.flags.m1 && L.flags.m2) ? `Wake the three memory locks — one in each era (${['m0', 'm1', 'm2'].filter((k) => L.flags[k]).length}/3)`
      : !L.flags.met ? 'Enter the Sanctum' : !L.flags.bossDead ? 'Destroy the Hollow — follow it through time' : 'Speak to A.',
  build(B, era, f) {
    const pal = [{ w: Ly.brick, c: C('#8a7060'), fl: Ly.concrete }, { w: Ly.panel, c: C('#1e2228'), fl: Ly.tiles }, { w: Ly.stone, c: C('#8a9a80'), fl: Ly.moss }][era];
    const R = { wall: pal.w, wallCol: pal.c, floor: pal.fl, ceilLayer: pal.w, ceilCol: pal.c };
    const lc = [0xffc080, 0x60c0ff, 0x80ffb0][era];
    B.room(-10, 0, 10, 18, 7, { ...R, gaps: { s: [-3, 3, 5] } });
    B.light(0, 6.5, 9, lc, 25);
    // chasm z 18..30
    B.room(-6, 18, 6, 30, 9, { ...R, noFloor: era >= 1, gaps: { n: [-3, 3, 5], s: [-3, 3, 5] } });
    if (era === 0) B.box(-6, 0, 23.6, 6, 9, 24.4, { layer: Ly.rubble, col: C('#8a8478') });
    if (era >= 1) B.hazard(-6, 18.5, 6, 29.5, -30, -3, 999);
    if (era === 1) { B.box(-1.2, -0.3, 18, 1.2, 0, 30, { kind: 'glass', col: C('#a0d8ff') }); B.glow(-1.25, 0, 18, -1.2, 0.08, 30, [0.3, 2, 3], 2); B.glow(1.2, 0, 18, 1.25, 0.08, 30, [0.3, 2, 3], 2); B.box(-3, 0, 31.6, 3, 5, 32.2, { layer: Ly.panel, col: C('#2a2f38') }); B.glow(-3, 5, 31.5, 3, 5.2, 31.6, [3, 0.3, 0.3], 2); }
    if (era === 2) for (let i = 0; i < 4; i++) B.prop('ivy', -5.6, 8, 19 + i * 3, Math.PI / 2, 1.3, { noCollide: true });
    // memory hall
    B.room(-12, 30, 12, 60, 8, { ...R, gaps: { n: [-3, 3, 5], s: [-3, 3, 6] } });
    B.light(-6, 7.5, 44, lc, 30); B.light(6, 7.5, 52, lc, 30);
    const locks = [[-8, 40, 0, 'Restore the 1996 fuse box'], [8, 46, 1, 'Wake the 2047 vault terminal'], [0, 56, 2, 'Touch the 2189 root-node']];
    for (const [x, z, e, label] of locks) {
      const on = f['m' + e];
      if (era === e) {
        B.box(x - 0.6, 0, z - 0.4, x + 0.6, 1.6, z + 0.4, { layer: e === 2 ? Ly.bark : Ly.metal, col: e === 2 ? C('#6e6252') : C('#4a4f58') });
        B.glow(x - 0.4, 1.6, z - 0.42, x + 0.4, 2.0, z - 0.4, on ? [0.3, 3.5, 1.2] : [3.5, 0.4, 0.3], on ? 2 : 4);
        if (!on) B.interact(x, 1, z - 1, 2.2, 'm' + e, label, () => true);
      } else {
        B.glow(x - 0.2, 0.01, z - 0.2, x + 0.2, 0.03, z + 0.2, on ? [0.3, 2.5, 1] : [0.6, 0.6, 0.6], 2);
      }
    }
    if (era === 0) for (let z = 34; z < 58; z += 6) B.box(10, 0, z, 12, 2.2, z + 3, { layer: Ly.metal, col: C('#5a5048') });
    if (era === 1) for (let z = 34; z < 58; z += 4) { B.box(-12, 0, z, -10.5, 3, z + 2, { layer: Ly.panel, col: C('#14161a') }); B.glow(-10.45, 0.4, z + 0.2, -10.4, 2.6, z + 1.8, [0.2, 1.2, 2.4], 4); }
    if (era === 2) for (let i = 0; i < 6; i++) B.prop('tree_birch_' + (i % 3), -9 + (i % 2) * 18, 0, 36 + i * 4, i, 0.9);
    // sanctum door (2189 only blocks until all three locks wake)
    const allLocks = f.m0 && f.m1 && f.m2;
    if (!allLocks) B.box(-3, 0, 59.7, 3, 6, 60.3, { layer: era === 2 ? Ly.stone : Ly.metal, col: era === 2 ? C('#7a8a70') : C('#3a3f48') });
    // sanctum / arena
    B.room(-16, 60, 16, 94, 14, { ...R, ceiling: era !== 2, gaps: { n: [-3, 3, 6] } });
    B.light(0, 13, 78, lc, 60, 40);
    if (era === 2) { B.prop('tree_giant_0', 0, 0, 90, 0, 0.9); for (let i = 0; i < 8; i++) B.prop('bush_' + (i % 3), -14 + i * 4, 0, 62 + (i % 2) * 28, i, 1.4, { noCollide: true }); B.glow(-1, 0, 76, 1, 0.05, 80, [0.3, 3, 2], 2); }
    if (era === 1) { for (let i = 0; i < 6; i++) B.box(-14 + i * 5.5, 0, 92, -12 + i * 5.5, 6, 93.5, { layer: Ly.panel, col: C('#14161a') }); }
    for (const [x, z] of [[-8, 70], [8, 72], [-9, 84], [9, 86]]) B.box(x - 1.4, 0, z - 0.6, x + 1.4, 1.2, z + 0.6, { layer: era === 2 ? Ly.stone : Ly.concrete, col: C('#8a8a80') });
    if (f.bossDead && era === 2) B.interact(0, 1, 88, 3, 'archive_end', 'Speak to A.', () => true);
  },
  update(L) {
    const p = L.local();
    if (!L.flags.crossed && p.z > 32.5) L.setFlag('crossed');
    if (L.flags.m0 && L.flags.m1 && L.flags.m2 && !L.flags.met && p.z > 63 && G.era === 2) STORY.archiveReveal(L);
  },
};

// ===========================================================================
// LEVEL 4 — THE APEX (Continuum chamber at the heart of the Spire)
// 1996: bare construction floor with the rebar anchor · 2047: Continuum
// chamber · 2189: the machine heart
// ===========================================================================
const APEX = {
  id: 'apex', name: 'The Apex', sub: 'The heart of the Continuum', origin: [4200, 0, 0],
  spawn: [0, 0, -6, 0], startEra: 1,
  objective: (L) => !L.flags.bossDead ? (L.boss && L.boss.stage === 3 ? 'Shift to 1996 and set charges on the rebar anchor' : 'Defeat Victor Halvorsen') : 'It\'s over. Leave the Apex.',
  build(B, era, f) {
    const pal = [{ w: Ly.concrete, c: C('#b8b4ac'), fl: Ly.concrete }, { w: Ly.metal, c: C('#d8dce0'), fl: Ly.tiles }, { w: Ly.panel, c: C('#4a5a48'), fl: Ly.moss }][era];
    B.room(-22, -10, 22, 42, 18, { wall: pal.w, wallCol: pal.c, floor: pal.fl, ceiling: era === 1, ceilLayer: pal.w, ceilCol: pal.c });
    B.light(-12, 16, 10, [0xffd0a0, 0xffffff, 0x90ffb0][era], 60, 45); B.light(12, 16, 26, [0xffd0a0, 0xff6060, 0x90ffb0][era], 60, 45);
    if (era === 0) {
      // open frame: columns, the anchor (rebar core) at centre
      for (const x of [-18, -6, 6, 18]) for (const z of [0, 14, 28, 40]) B.box(x - 0.4, 0, z - 0.4, x + 0.4, 18, z + 0.4, { layer: Ly.concrete, col: C('#b8b4ac') });
      B.box(-1.5, 0, 18.5, 1.5, 6, 21.5, { layer: Ly.concrete, col: C('#a8a49c') });
      for (let i = 0; i < 9; i++) B.box(-1.2 + (i % 3) * 1.2, 6, 18.8 + Math.floor(i / 3) * 1.2, -1.1 + (i % 3) * 1.2, 8, 18.9 + Math.floor(i / 3) * 1.2, { layer: Ly.rust, col: C('#6a4030'), collide: false });
      [[0, 17.4], [2.6, 20], [-2.6, 20]].forEach(([x, z], i) => {
        if (f['anchor' + i]) B.glow(x - 0.2, 1, z - 0.2, x + 0.2, 1.4, z + 0.2, [3, 0.4, 0.2], 4);
        else if (f.anchorPhase) B.interact(x, 1, z, 2, 'anchor' + i, 'Set charge on the anchor', () => true);
      });
      B.prop('crane', 26, 0, 30, 0.4, 0.5);
    } else if (era === 1) {
      B.box(-2, 0, 18, 2, 18, 22, { kind: 'holo', col: [1.5, 0.3, 0.3] });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; B.glow(Math.cos(a) * 12 - 0.3, 0, 20 + Math.sin(a) * 12 - 0.3, Math.cos(a) * 12 + 0.3, 18, 20 + Math.sin(a) * 12 + 0.3, [2.4, 0.4, 0.4], 2); }
      for (const [x, z] of [[-10, 6], [10, 8], [-12, 32], [12, 30], [0, 2]]) B.box(x - 1.5, 0, z - 0.6, x + 1.5, 1.3, z + 0.6, { layer: Ly.panel, col: C('#2a2f38') });
    } else {
      B.prop('tree_giant_1', -14, 0, 34, 0, 1.0);
      B.box(-3, 0, 17, 3, 3, 23, { layer: Ly.rubble, col: C('#5a5a4a') });
      B.glow(-1, 3, 19, 1, 3.4, 21, [3, 0.4, 0.3], 2);
      for (const [x, z] of [[-10, 6], [10, 8], [-12, 32], [12, 30]]) B.prop('rubble_' + ((x + z) & 3), x, 0, z, 0, 1.6);
      for (let i = 0; i < 6; i++) B.prop('ivy', -21.6, 15, i * 7, Math.PI / 2, 2, { noCollide: true });
    }
    if (f.bossDead) B.interact(0, 1, -6, 3, 'apex_exit', 'Walk out into the new future', () => true);
  },
  update(L) {
    if (!L.flags.bossStarted) STORY.apexStart(L);
    if (L.boss && L.boss.stage === 3 && !L.flags.anchorPhase) L.setFlag('anchorPhase');
  },
};

// ===========================================================================
// Story controller
// ===========================================================================
export const STORY = {
  levels: {},
  init() {
    G.cutscene = new Cutscenes();
    this.levels = { cannery: new Level(CANNERY), undercroft: new Level(UNDERCROFT), archive: new Level(ARCHIVE), apex: new Level(APEX) };
    const M = G.missions;
    const I = G.interact;
    const pts = () => M.pts || {};
    const yardsDoor = () => { const b = blockRect(LANDMARKS.watertower.ci, LANDMARKS.watertower.cj); return { x: b.x0 + 8, z: b.z0 - 2 }; };
    const spirePlaza = () => { const S = spireRect(LANDMARKS.halvorsen.ci, LANDMARKS.halvorsen.cj); return { x: (S.x0 + S.x1) / 2 + 12, z: S.b.z0 - 2 }; };
    const hallSteps = () => { const b = blockRect(LANDMARKS.cityhall.ci, LANDMARKS.cityhall.cj); return { x: (b.x0 + b.x1) / 2 + 14, z: b.z0 + 4 }; };

    // ---- level interaction handlers
    I.on('cannery_lever', () => { this.levels.cannery.setFlag('lever'); G.audio.play('door'); G.hud.toast('The arena door grinds open.', 'good'); });
    for (let i = 0; i < 3; i++) {
      I.on('cut' + i, () => { this.levels.undercroft.setFlag('cut' + i); G.audio.play('glass'); G.fx.sparks(G.player.pos.clone().setY(G.player.pos.y + 1), 20); G.hud.toast(`Power trunk ${i + 1}/3 cut — in 2047 that pylon just died.`, 'good'); });
      I.on('m' + i, () => { this.levels.archive.setFlag('m' + i); G.audio.play('consequence'); G.hud.toast(`Memory lock ${['1996', '2047', '2189'][i]} awake.`, 'good'); });
      I.on('anchor' + i, () => { this.levels.apex.setFlag('anchor' + i); G.audio.play('click'); G.hud.toast(`Anchor charge ${i + 1}/3 set`, 'good'); });
    }
    I.on('level_exit', () => this.finishLevel('cannery'));
    I.on('undercroft_terminal', () => this.undercroftEnd());
    I.on('archive_end', () => this.archiveEnd());
    I.on('apex_exit', () => this.ending());

    // ---- new mission defs (contained chapters)
    const levelMission = (id, title, sub, where, start, xp) => ({
      title, subtitle: sub, where, xp, start,
      onStart: () => { M.data.levelId = id; G.cutscene.play(INTROS[id](), { x: 0, y: 0, z: 0 }, () => this.levels[id].enter()); },
      steps: [{ text: () => { const L = this.levels[id]; return L.active ? L.def.objective(L) : 'Entering…'; }, update: () => !!this.levels[id].flags.complete }],
    });
    M.defs.cannery = levelMission('cannery', 'Chapter 3 — Red Sevens', 'The Cannery · 1996', 'The Yards, 1996', () => ({ ...yardsDoor(), era: 0 }), 300);
    M.defs.undercroft = levelMission('undercroft', 'Chapter 5 — The Undercroft', 'Beneath the Spire · 2047', 'Halvorsen Spire, 2047', () => ({ ...spirePlaza(), era: 1 }), 350);
    M.defs.archive = levelMission('archive', 'Chapter 7 — The Deep Archive', 'Beneath City Hall · 2189', 'City Hall, 2189', () => ({ ...hallSteps(), era: 2 }), 400);
    M.defs.apex = levelMission('apex', 'Chapter 9 — The Apex', 'The Continuum · All eras', 'Halvorsen site', () => ({ ...spirePlaza(), era: 0 }), 600);
    for (const id of ['cannery', 'undercroft', 'archive', 'apex']) if (!M.state[id]) M.state[id] = 'locked';
    M.defs.cannery.onComplete = () => M.unlock('deaddrop');
    M.defs.seed.title = 'Chapter 1 — The Seed';
    M.defs.tommy.title = 'Chapter 2 — Game Over';
    M.defs.deaddrop.title = 'Chapter 4 — Dead Drop';
    M.defs.mara.title = 'Chapter 6 — Pier 9';
    M.defs.foundation.title = 'Chapter 8 — Foundation';

    // ---- chain chapters with cutscenes
    const chain = (id, scene, next) => {
      M.defs[id].onComplete = () => {
        G.cutscene.play(scene(), { x: 0, y: 0, z: 0 }, () => { for (const n of next) M.unlock(n); G.game.save(); });
      };
    };
    chain('seed', CUT.canopy, ['tommy']);
    chain('tommy', CUT.tommyAfter, ['cannery']);
    chain('deaddrop', CUT.oldTomCore, ['undercroft']);
    chain('mara', CUT.maraAfter, []);
    M.defs.foundation.onComplete = () => G.cutscene.play(CUT.continuumReaches(), {}, () => { M.unlock('apex'); M.start('apex'); });
    M.defs.foundation.steps.pop(); // the apex replaces "go and look"
    const kessDone = M.defs.kessler.onComplete;
    M.defs.kessler.onComplete = () => { if (kessDone) kessDone(); };
  },

  // called by the mission engine when a level's internal story finishes
  finishLevel(id, returnPt = null) {
    const L = this.levels[id];
    clearBossFX();
    L.exit(returnPt);
    L.flags.complete = true;
    G.chunks.update(G.player.pos.x, G.player.pos.z, G.era, true);
  },

  update(dt, input) {
    updateBossFX(dt);
    if (G.level) G.level.update(dt);
  },

  // ------------------------------------------------------------- beats --
  dutchIntro(L) {
    L.flags.bossStarted = true;
    const o = L.o;
    G.cutscene.play([
      { actor: ['dutch', { ...LOOK_DUTCH }, [0, 0, 66], Math.PI] },
      { cam: { from: [8, 3, 52], to: [3, 2.2, 58], look: [0, 2, 66] }, dur: 0.1 },
      { say: ['Dutch Kowalski', 'So you\'re the ghost who put three of my boys in the hospital. Over a kid\'s arcade.'], talk: 'dutch' },
      { anim: { dutch: 'arms' }, say: ['Dutch Kowalski', 'Halvorsen told me someone like you might show up. Said you don\'t belong to this year.'], talk: 'dutch' },
      { say: ['Ash', 'He\'s right. And in a few years, neither will you.'] },
      { anim: { dutch: 'idle' }, say: ['Dutch Kowalski', 'Funny. Let\'s see how funny you are with your jaw wired shut.'], talk: 'dutch' },
      { remove: 'dutch' },
    ], o, () => {
      const boss = new Dutch(V(o.x, o.y, o.z + 66));
      L.boss = boss;
      G.combat.drones.push(boss);
      boss.onDefeat = () => setTimeout(() => this.dutchDefeated(L), 1800);
    });
  },
  dutchDefeated(L) {
    L.setFlag('bossDead');
    const o = L.o;
    G.cutscene.play([
      { actor: ['dutch', { ...LOOK_DUTCH }, [0, 0, 62], 0], anim: { dutch: 'kneel' } },
      { cam: { from: [4, 1.8, 66], to: [2.5, 1.5, 65], look: [0, 1.2, 62] }, dur: 0.1 },
      { say: ['Dutch Kowalski', '…Alright. Alright! You want to know who pays us? Victor Halvorsen. Seven percent from every shop on the waterfront goes into his "foundation fund".'], talk: 'dutch' },
      { say: ['Dutch Kowalski', 'He\'s building something on Fulton. Says it\'ll stand for a hundred years. Says he already knows how the future ends.'], talk: 'dutch' },
      { say: ['Ash', 'How could he know that?'] },
      { say: ['Dutch Kowalski', 'Because somebody told him. Somebody from later. Like you.'], talk: 'dutch' },
      { say: ['', 'Dutch\'s ledger: payments to "H.D. Foundation Fund". A note in the margin — "Spire, floor 3. Install the trunk line exactly as specified."'] },
    ], o, () => { G.combat.give('shotgun'); });
  },
  wardenIntro(L) {
    L.flags.bossStarted = true;
    const o = L.o;
    G.cutscene.play([
      { cam: { from: [0, 2, 70], to: [0, 4, 74], look: [0, 6, 86] }, dur: 0.1 },
      { say: ['WARDEN-7', 'INTRUDER. AUTHORIZATION: NONE. TEMPORAL SIGNATURE: ANOMALOUS.'] },
      { say: ['WARDEN-7', 'DIRECTIVE FROM V. HALVORSEN: THE CONTINUUM MUST NOT BE INTERRUPTED. TERMINATION AUTHORIZED.'] },
      { say: ['A.', 'Its shield runs through those three pylons — and their power trunks were laid in 1996, when this was a bunker. Cut them in the past.'] },
    ], o, () => {
      const boss = new Warden(V(o.x, o.y + 6, o.z + 86), L);
      L.boss = boss;
      G.combat.drones.push(boss);
      G.combat.droneGroup.add(boss.mesh);
      boss.onDefeat = () => { L.setFlag('bossDead'); G.hud.toast('The Continuum terminal is unlocked.', 'good'); };
    });
  },
  undercroftEnd() {
    const L = this.levels.undercroft;
    G.cutscene.play([
      { cam: { from: [3, 2, 92], to: [1, 1.8, 94], look: [0, 1.5, 98] }, dur: 0.1 },
      { say: ['TERMINAL', 'CONTINUUM ENGINE — PROJECT LEAD: V. HALVORSEN (age 89). STATUS: SUBJECT UPLOAD 97%.'] },
      { say: ['TERMINAL', 'OBJECTIVE: anchor a single consciousness across all observed time. Projected stabilization: 2061.'] },
      { say: ['A.', 'That\'s the Collapse. Victor isn\'t building a machine. He\'s making himself the only thing that lasts.'] },
      { say: ['TERMINAL', 'NOTE: Anomalous observer "ASH" first recorded 1996. Source of prior warnings: the ARCHIVE (beneath City Hall).'] },
      { say: ['A.', '…Then it\'s time you came to see me. In person.'] },
    ], L.o, () => {
      this.finishLevel('undercroft', { ...spireBack(), era: 1 });
      for (const n of ['archive', 'mara', 'kessler', 'bridge']) G.missions.unlock(n);
    });
  },
  archiveReveal(L) {
    L.flags.met = true;
    const o = L.o;
    G.cutscene.play([
      { actor: ['a', 'archivist', [0, 0, 78], Math.PI] },
      { cam: { from: [5, 2, 66], to: [2.5, 1.8, 72], look: [0, 1.6, 78] }, dur: 0.1 },
      { say: ['A.', 'You came. You always come.'], talk: 'a' },
      { say: ['Ash', 'Who are you? Why does the harness answer to you?'] },
      { anim: { a: 'arms' }, say: ['A.', 'Because it\'s yours. I\'m yours. I\'m what\'s left of you after forty years of trying and failing in the last loop.'], talk: 'a' },
      { say: ['A.', 'In my timeline I never planted the seed. I let the Red Sevens burn the arcade. Mara died on Pier 9. I thought only the big moments mattered.'], talk: 'a' },
      { say: ['A.', 'The big moments are made of small ones. You proved that the second you put that seed in the ground.'], talk: 'a' },
      { say: ['A.', 'But Victor knows I\'m here. Something followed me home — what the Continuum leaves behind when it eats a timeline.'], talk: 'a' },
      { sfx: ['explosion'], say: ['A.', 'It\'s waking. It doesn\'t live in one year — follow it, or it will finish us both.'], talk: 'a' },
      { remove: 'a' },
    ], o, () => {
      const boss = new Hollow(V(o.x, o.y, o.z + 80));
      L.boss = boss;
      G.combat.drones.push(boss);
      boss.onDefeat = () => { L.setFlag('bossDead'); };
    });
  },
  archiveEnd() {
    const L = this.levels.archive;
    G.cutscene.play([
      { actor: ['a', 'archivist', [0, 0, 86], Math.PI], anim: { a: 'kneel' } },
      { cam: { from: [3, 1.6, 82], to: [1.5, 1.4, 84], look: [0, 1.2, 86] }, dur: 0.1 },
      { say: ['A.', 'It\'s gone. And so am I, nearly. I\'m a loop that\'s closing.'], talk: 'a' },
      { say: ['A.', 'Victor\'s anchor is the Spire\'s foundation — poured in 1996, with rebar he had shipped from the future. Destroy the foundation, and the Continuum has nothing to hold on to.'], talk: 'a' },
      { say: ['Ash', 'And you?'] },
      { say: ['A.', 'If you win, I never had to exist. That\'s the best ending I can imagine.'], talk: 'a' },
      { say: ['A.', 'Go. Old Tom will help you. He always did.'], talk: 'a' },
      { remove: 'a' },
    ], L.o, () => {
      this.finishLevel('archive', { ...hallBack(), era: 2 });
      G.missions.unlock('foundation');
    });
  },
  apexStart(L) {
    L.flags.bossStarted = true;
    const o = L.o;
    G.cutscene.play([
      { actor: ['v', 'victorOld', [0, 0, 18], Math.PI], anim: { v: 'sit' } },
      { cam: { from: [6, 2, 2], to: [3, 2.4, 10], look: [0, 1.5, 18] }, dur: 0.1 },
      { say: ['Victor Halvorsen', 'Ash. Forty-three years I\'ve waited for this conversation. You told me about the Collapse, you know — the other you did.'], talk: 'v' },
      { say: ['Victor Halvorsen', 'I listened. I decided that if the future was going to end, it would end as mine.'], talk: 'v' },
      { say: ['Ash', 'You blew up your own foundation\'s future the moment I set those charges.'] },
      { say: ['Victor Halvorsen', 'Did you think a few pounds of explosive could erase me? I poured myself into every year this city has.'], talk: 'v' },
      { anim: { v: 'arms' }, say: ['Victor Halvorsen', 'Come, then. Let\'s see whose timeline holds.'], talk: 'v' },
      { remove: 'v' },
    ], o, () => {
      const boss = new Continuum(V(o.x, o.y, o.z + 18), L);
      L.boss = boss;
      G.combat.drones.push(boss);
      G.combat.droneGroup.add(boss.throne);
      boss.onDefeat = () => { L.setFlag('bossDead'); setTimeout(() => this.ending(), 2500); };
    });
  },
  ending() {
    if (this._ended) return;
    this._ended = true;
    const L = this.levels.apex;
    this.finishLevel('apex', { ...spireBack(), era: 2 });
    G.missions.state.apex = 'done';
    G.missions.active = null;
    G.hud.setObjective(null);
    const home = landmarkCenter('home');
    const seed = M_seed();
    G.cutscene.play([
      { fade: 1, dur: 1.2 },
      { era: 2, time: 6.5 },
      { player: [seed.x + 6, 0.3, seed.z + 14, Math.PI] },
      { actor: ['a', 'archivist', [seed.x + 3, 0.15, seed.z + 10], 0], anim: { a: 'idle' } },
      { actor: ['m', 'ilse', [seed.x + 8, 0.15, seed.z + 11], -0.4] },
      { cam: { from: [seed.x + 14, 3, seed.z + 26], to: [seed.x + 6, 6, seed.z + 20], look: [seed.x, 22, seed.z] }, dur: 0.1 },
      { fade: 0, dur: 2 },
      { title: ['2189', 'THE LIVING FUTURE', '#9dff6a'], dur: 4 },
      { say: ['', 'Dawn over a city that never collapsed. The Spire was never built. The Continuum never woke.'], dur: 5 },
      { say: ['Mother Quinn', 'They tell a story in Haven about a stranger who saved the first Quinn on Pier 9 — and planted the Calloway tree.'], talk: 'm' },
      { say: ['A.', 'The loop is closing. I can feel the version of me that failed… thinning out. It doesn\'t hurt. It feels like waking up.'], talk: 'a' },
      { say: ['Ash', 'Will I remember any of this?'] },
      { say: ['A.', 'You\'ll remember the tree. Everything that matters grows from something small.'], talk: 'a' },
      { remove: 'a', fx: (B) => G.fx.shiftMotes(B([seed.x + 3, 1.2, seed.z + 10]), new THREE.Color(0.6, 1, 0.6)), sfx: ['consequence'] },
      { cam: { from: [seed.x + 6, 6, seed.z + 20], to: [seed.x - 30, 60, seed.z + 60], look: [seed.x, 20, seed.z] }, dur: 7 },
      { say: ['', 'WORLD//SHIFT — thank you for playing. The city is yours: every era still remembers what you did.'], dur: 6 },
      { fade: 0, dur: 0.5 },
    ], {}, () => {
      G.hud.showBanner('THE END', 'Free roam unlocked — keep shifting.', 6, '#9dff6a');
      G.chronicle.set('story.complete', true, 0);
      G.game.save();
    });
    void L; void home;
  },
};

function spireBack() { const S = spireRect(LANDMARKS.halvorsen.ci, LANDMARKS.halvorsen.cj); return { x: (S.x0 + S.x1) / 2 + 12, y: 0.3, z: S.b.z0 - 4, yaw: Math.PI }; }
function hallBack() { const b = blockRect(LANDMARKS.cityhall.ci, LANDMARKS.cityhall.cj); return { x: (b.x0 + b.x1) / 2 + 14, y: 0.3, z: b.z0 + 2, yaw: Math.PI }; }
function M_seed() { const s = seedLotRect(LANDMARKS.home.ci, LANDMARKS.home.cj); return { x: (s.x0 + s.x1) / 2, z: (s.z0 + s.z1) / 2 }; }

const LOOK_DUTCH = { skin: '#d8a888', hair: '#1a1410', top: '#6a1010', sleeve: '#2a1a14', forearm: '#d8a888', legs: '#1a1a1e', shoes: '#2a2018', hairStyle: 'none', scale: 1.35 };

// ===========================================================================
// Open-world cutscenes (absolute coordinates computed at play time)
// ===========================================================================
const hb = () => blockRect(LANDMARKS.home.ci, LANDMARKS.home.cj);
const CUT = {
  prologue: () => {
    const s = M_seed();
    const b = hb();
    const door = { x: b.x0 + 12, z: b.z0 - 1.5 };
    return [
      { fade: 1, dur: 0.01 },
      { era: 2, time: 19.3 },
      { fn: () => G.player.avatar.setVisible(false), always: true },
      { actor: ['a', 'archivist', [s.x, 0.15, s.z], 0.6], anim: { a: 'kneel' } },
      { cam: { from: [s.x + 18, 2.5, s.z + 18], to: [s.x + 7, 1.6, s.z + 7], look: [s.x, 1.2, s.z], lookTo: [s.x, 1.0, s.z] }, dur: 0.1 },
      { fade: 0, dur: 2.5 },
      { title: ['2189', 'THE DEAD FUTURE', '#9dff6a'], dur: 3.5 },
      { say: ['A.', 'This was Calloway Block. I was born two streets from here, in a city that doesn\'t exist anymore.'], talk: 'a' },
      { say: ['A.', 'In 2061 something called the Continuum folded time over this city like paper. Everything after was… this.'], talk: 'a' },
      { anim: { a: 'idle' }, say: ['A.', 'I\'ve spent forty years in the Archive learning one thing: the past can still be reached. Not changed from here — but reached.'], talk: 'a' },
      { say: ['A.', 'The harness can carry one person across. It can\'t be me. It has to be the one who hasn\'t failed yet.'], talk: 'a' },
      { anim: { a: 'point' }, say: ['A.', 'Find yourself, harness. 1996. Calloway Apartments. Go.'], talk: 'a' },
      { fx: (B) => G.fx.shiftMotes(B([s.x, 1.4, s.z]), new THREE.Color(0.6, 1, 0.6)), sfx: ['consequence'], dur: 0.3 },
      { remove: 'a' },
      { era: 0, wave: true, time: 17.5 },
      { cam: { from: [door.x + 10, 4, door.z - 16], to: [door.x + 3, 2, door.z - 6], look: [door.x, 1.2, door.z] }, dur: 3.5 },
      { title: ['1996', 'THE OLD CITY', '#ffb347'], dur: 3 },
      { fn: () => G.player.avatar.setVisible(true), always: true },
      { player: [door.x, 0.2, door.z - 3, 0] },
      { say: ['Ash', 'A package. No stamp. My name in handwriting I almost recognise.'] },
      { title: ['WORLD//SHIFT', 'One city. Three eras. Every choice echoes.', '#ffffff'], dur: 4 },
    ];
  },
  canopy: () => {
    const s = M_seed();
    return [
      { actor: ['a', 'archivist', [s.x + 3, 41.6, s.z - 2], -2.4] },
      { cam: { from: [s.x + 10, 44, s.z + 8], to: [s.x + 7, 43, s.z + 4], look: [s.x + 2, 42.6, s.z - 1] }, dur: 0.1 },
      { say: ['A.', 'You climbed it. Good. I\'m a projection — the harness lets me reach you for a few seconds at a time.'], talk: 'a' },
      { anim: { a: 'point' }, cam: { to: [s.x + 5, 46, s.z + 8], lookTo: [s.x + 120, 30, s.z - 150] }, dur: 0.1 },
      { say: ['A.', 'See the broken needle downtown? The Halvorsen Spire. In 2047 it\'s the tallest thing ever built here. In 2061 it\'s where the Collapse begins.'], talk: 'a' },
      { anim: { a: 'idle' }, say: ['A.', 'Victor Halvorsen breaks ground on it in 1996 — your year. Somebody is helping him. Somebody who knows too much about the future.'], talk: 'a' },
      { say: ['Ash', 'Then I stop the building.'] },
      { say: ['A.', 'Not yet. You\'re not strong enough, and the city isn\'t ready. Start small. The Red Sevens are shaking down the Neon Galaxy arcade. Save the boy there.'], talk: 'a' },
      { say: ['A.', 'Small things grow. Look where you\'re standing.'], talk: 'a' },
      { remove: 'a' },
    ];
  },
  tommyAfter: () => {
    const b = hb();
    const a = { x: b.x1 - 10, z: b.z0 - 3 };
    return [
      { actor: ['t', 'tommy', [a.x + 1, 0.15, a.z - 1], -2.4], scale: 0.66 },
      { fn: (cs) => { if (cs.actors.t) cs.actors.t.avatar.scale = 0.66; } },
      { cam: { from: [a.x - 3, 1.2, a.z - 5], to: [a.x - 2.5, 1.0, a.z - 4], look: [a.x + 1, 0.9, a.z - 1] }, dur: 0.1 },
      { say: ['Tommy (8)', 'They\'ll be back. Dutch always comes back. He\'s the boss of the Red Sevens — he works out of the old cannery in the Yards.'], talk: 't' },
      { say: ['Tommy (8)', 'My dad says Dutch takes money for some rich guy. Halvorsen. The one building the giant tower.'], talk: 't' },
      { say: ['Ash', 'Then I\'ll go and ask Dutch who he\'s collecting for.'] },
      { anim: { t: 'point' }, say: ['Tommy (8)', 'You\'re crazy. Cool, but crazy. The cannery\'s by the water tower — you can\'t miss it.'], talk: 't' },
      { remove: 't' },
    ];
  },
  oldTomCore: () => {
    const b = hb();
    const a = { x: b.x1 - 10, z: b.z0 - 3 };
    return [
      { era: 1 },
      { actor: ['tom', 'oldtom', [a.x, 0.15, a.z - 2], Math.PI] },
      { cam: { from: [a.x - 3, 1.8, a.z - 7], to: [a.x - 2, 1.7, a.z - 6], look: [a.x, 1.5, a.z - 2] }, dur: 0.1 },
      { say: ['Old Tom (59)', 'The core\'s mostly encrypted, but I cracked the routing. It talks to something under the Spire. The Undercroft.'], talk: 'tom' },
      { say: ['Old Tom (59)', 'AEGIS black lab. In 1996 it was a civil-defense bunker. In 2189…'], talk: 'tom' },
      { anim: { tom: 'arms' }, say: ['Old Tom (59)', 'I\'ve known you for fifty-one years and met you twice. Whatever you are, kid — you\'re the only one who can get down there.'], talk: 'tom' },
      { say: ['Ash', 'Thanks, Tommy.'] },
      { say: ['Old Tom (59)', 'Nobody\'s called me that since 1996.'], talk: 'tom' },
      { remove: 'tom' },
    ];
  },
  maraAfter: () => {
    const q = blockRect(LANDMARKS.quinn.ci, LANDMARKS.quinn.cj);
    const c = { x: (q.x0 + q.x1) / 2, z: (q.z0 + q.z1) / 2 };
    if (!G.chronicle.has('mara.saved', 0)) return [{ say: ['A.', 'She\'s gone. Not every echo can be saved — but every one is remembered.'] }];
    return [
      { actor: ['m', 'mara', [c.x - 2, 0.15, c.z + 1], 1.2] },
      { cam: { from: [c.x + 3, 1.7, c.z + 4], to: [c.x + 2, 1.6, c.z + 3], look: [c.x - 2, 1.5, c.z + 1] }, dur: 0.1 },
      { say: ['Mara Quinn', 'Who are you? You moved like you knew where every one of them would be.'], talk: 'm' },
      { say: ['Ash', 'Someone who\'s read the end of the story. Have a long life, Mara.'] },
      { say: ['Mara Quinn', 'I plan to. Big family. Lots of trouble. I\'ll tell them about the stranger on Pier 9.'], talk: 'm' },
      { remove: 'm' },
    ];
  },
  continuumReaches: () => {
    const sp = spireBack();
    return [
      { fade: 0.6, dur: 0.6 },
      { cam: { from: [sp.x - 20, 30, sp.z - 30], to: [sp.x - 5, 12, sp.z - 10], look: [sp.x - 12, 6, sp.z + 30] }, dur: 0.1 },
      { fade: 0, dur: 1 },
      { say: ['', 'The foundation crumbles. For a heartbeat, the Spire flickers across all three centuries at once — and something reaches back.'], dur: 5 },
      { say: ['Victor Halvorsen', 'ASH. You don\'t get to end me from 1996. Come to the Apex.'] },
      { say: ['A.', 'He\'s pulling you into the Continuum itself. This is it. Everything you planted, every life you saved — it all holds him back now.'] },
    ];
  },
};

// Chapter intros for contained levels
const INTROS = {
  cannery: () => [{ say: ['Ash', 'The Red Sevens\' cannery. The gate\'s down — but in 2189 it rusted off its rails.'] }],
  undercroft: () => [{ say: ['A.', 'The Undercroft. AEGIS lasers in 2047, a blast door in 1996. Neither era alone will get you through. Use both.'] }],
  archive: () => [{ say: ['A.', 'Beneath City Hall. This is my home. Each memory lock answers to a different century — wake all three and I\'ll open the Sanctum.'] }],
  apex: () => [],
};

// Prologue hook for new games
export function playPrologue(then) {
  G.cutscene.play(CUT.prologue(), {}, then);
}
