// Furniture & fixtures for interiors. Each piece is built at the origin facing +Z
// (the side a person uses), with a collision footprint [w, d] (null = walk-through).
// Colours can be overridden per placement (o.c, o.c2, o.c3) for variety.
import { ModelKit } from './materials.js';

const W = '#ffffff';
const cache = new Map();

export const FURN = {
  // ------------------------------------------------------------ living
  sofa: { fp: [2.2, 0.95], b: (k, o) => {
    const c = o.c || '#5a6a8a';
    k.surf('fabric');
    k.rbox(0, 0.28, 0, 2.2, 0.36, 0.9, 0.06, c);
    k.rbox(0, 0.62, -0.36, 2.2, 0.62, 0.2, 0.08, c);
    for (const sx of [-1, 1]) k.rbox(sx * 1.0, 0.5, 0, 0.2, 0.42, 0.9, 0.07, c);
    for (const sx of [-0.48, 0.48]) k.rbox(sx, 0.5, 0.06, 0.92, 0.14, 0.74, 0.06, c);
    for (const sx of [-0.48, 0.48]) k.rbox(sx, 0.75, -0.22, 0.88, 0.4, 0.14, 0.06, c);
    k.surf('fabric'); k.rbox(-0.75, 0.68, -0.08, 0.38, 0.32, 0.12, 0.06, o.c2 || '#d8b060', 0, 0, [0.2, 0.3, 0]);
    k.surf('wood'); for (const sx of [-1.02, 1.02]) for (const sz of [-0.38, 0.38]) k.cyl(sx, 0.05, sz, 0.035, 0.1, '#3a2a1a', 6);
  } },
  armchair: { fp: [0.95, 0.9], b: (k, o) => {
    const c = o.c || '#8a5a4a';
    k.surf('leather');
    k.rbox(0, 0.3, 0, 0.9, 0.38, 0.86, 0.06, c);
    k.rbox(0, 0.7, -0.34, 0.9, 0.7, 0.18, 0.08, c);
    for (const sx of [-1, 1]) k.rbox(sx * 0.4, 0.55, 0, 0.16, 0.4, 0.86, 0.06, c);
    k.rbox(0, 0.52, 0.06, 0.6, 0.12, 0.66, 0.05, c);
  } },
  coffeeTable: { fp: [1.2, 0.6], b: (k, o) => {
    k.surf('wood'); k.rbox(0, 0.4, 0, 1.2, 0.05, 0.6, 0.02, o.c || '#6a4a30');
    for (const sx of [-0.52, 0.52]) for (const sz of [-0.24, 0.24]) k.box(sx, 0.2, sz, 0.05, 0.38, 0.05, '#3a2a1a');
    k.surf('glass'); k.cyl(0.3, 0.47, 0.05, 0.05, 0.1, '#c8d8e0', 10);
    k.surf('fabric'); k.box(-0.3, 0.44, -0.05, 0.25, 0.03, 0.32, '#c04040');
  } },
  tvStand: { fp: [1.6, 0.45], b: (k, o) => {
    k.surf('wood'); k.rbox(0, 0.25, 0, 1.6, 0.5, 0.45, 0.02, o.c || '#2a2420');
    k.surf('plastic'); k.rbox(0, 0.95, -0.05, 1.3, 0.75, 0.05, 0.02, '#0a0a0c');
    k.box(0, 0.95, -0.02, 1.22, 0.68, 0.01, o.on ? '#4a7ab0' : '#101418', 0, o.on ? 10 : 0);
    k.box(0, 0.55, -0.05, 0.3, 0.08, 0.15, '#1a1a1c');
    k.surf('plastic'); for (const sx of [-0.7, 0.7]) k.rbox(sx, 0.75, 0, 0.18, 0.5, 0.2, 0.03, '#1a1a1c');
  } },
  rug: { fp: null, b: (k, o) => {
    k.surf('carpet'); k.box(0, 0.012, 0, o.w || 2.6, 0.02, o.d || 1.8, o.c || '#8a3a3a');
    k.box(0, 0.014, 0, (o.w || 2.6) - 0.3, 0.02, (o.d || 1.8) - 0.3, o.c2 || '#c8a060');
    k.box(0, 0.016, 0, (o.w || 2.6) - 0.5, 0.02, (o.d || 1.8) - 0.5, o.c || '#8a3a3a');
  } },
  bookshelf: { fp: [1.0, 0.35], b: (k, o) => {
    k.surf('wood'); const c = o.c || '#5a3a24';
    k.box(0, 1.0, -0.15, 1.0, 2.0, 0.04, c);
    for (const sx of [-0.48, 0.48]) k.box(sx, 1.0, 0, 0.04, 2.0, 0.34, c);
    for (let i = 0; i < 5; i++) k.box(0, 0.05 + i * 0.47, 0, 0.96, 0.03, 0.34, c);
    const bc = ['#8a2a2a', '#2a4a7a', '#3a6a3a', '#c8a040', '#5a3a6a', '#e8e0d0', '#2a2a2a'];
    k.surf('leather');
    for (let i = 0; i < 4; i++) { let x = -0.44; let j = 0; while (x < 0.4) { const w = 0.03 + ((i * 7 + j * 3) % 5) * 0.012; const h = 0.26 + ((i + j) % 4) * 0.035; k.box(x + w / 2, 0.07 + i * 0.47 + h / 2, 0.02, w, h, 0.24, bc[(i * 3 + j) % bc.length]); x += w + 0.004; j++; } }
  } },
  plant: { fp: [0.5, 0.5], b: (k, o) => {
    k.surf('concrete'); k.lathe(0, 0, 0, [[0.16, 0], [0.22, 0.4], [0.24, 0.42]], o.c || '#c86a4a', 12);
    k.surf('leaf');
    for (let i = 0; i < 6; i++) { const a = i * 1.05; k.blob(Math.cos(a) * 0.14, 0.75 + (i % 3) * 0.18, Math.sin(a) * 0.14, 0.22, 0.28, 0.22, '#3a7a3a', 0, 0, i * 3.1, 0.3, 1); }
  } },
  tallPlant: { fp: [0.6, 0.6], b: (k) => {
    k.surf('concrete'); k.lathe(0, 0, 0, [[0.2, 0], [0.26, 0.5], [0.28, 0.52]], '#3a3a3c', 12);
    k.surf('bark'); k.cyl(0, 1.0, 0, 0.03, 1.1, '#5a4030', 6);
    k.surf('leaf'); for (let i = 0; i < 9; i++) { const a = i * 0.7; k.blob(Math.cos(a) * 0.25, 1.2 + (i % 4) * 0.22, Math.sin(a) * 0.25, 0.28, 0.12, 0.2, '#2e6a2e', 0, 0, i * 2.3, 0.3, 1); }
  } },
  floorLamp: { fp: null, b: (k) => {
    k.surf('metal'); k.cyl(0, 0.02, 0, 0.18, 0.04, '#2a2a2a', 12); k.cyl(0, 0.8, 0, 0.02, 1.6, '#2a2a2a', 6);
    k.surf('fabric'); k.lathe(0, 1.5, 0, [[0.24, 0], [0.16, 0.3]], '#f0e4c8', 14);
    k.sphere(0, 1.58, 0, 0.06, '#fff0c0', 0, 10, 1, 1, 1, 1);
  } },
  painting: { fp: null, b: (k, o) => {
    k.surf('wood'); k.rbox(0, 0, 0, (o.w || 0.9) + 0.08, (o.h || 0.65) + 0.08, 0.04, 0.01, '#3a2a1a');
    k.surf('fabric');
    const cs = o.cs || ['#c86a3a', '#3a6aa8', '#e8c860', '#4a8a5a'];
    const w = o.w || 0.9, h = o.h || 0.65;
    for (let i = 0; i < 4; i++) k.box(-w / 2 + (i + 0.5) * w / 4, ((i % 2) - 0.5) * h * 0.3, 0.025, w / 4, h * (0.6 + (i % 3) * 0.15), 0.01, cs[i]);
    k.box(0, 0, 0.022, w, h, 0.01, o.bg || '#e8e0d0');
  } },
  // ------------------------------------------------------------ bedroom
  bed: { fp: [1.7, 2.15], b: (k, o) => {
    const dbl = o.single ? 0.95 : 1.6;
    k.surf('wood'); k.rbox(0, 0.22, 0, dbl + 0.1, 0.3, 2.1, 0.03, o.c || '#6a4a30');
    k.rbox(0, 0.6, -1.03, dbl + 0.12, 1.0, 0.08, 0.03, o.c || '#6a4a30');
    k.surf('fabric'); k.rbox(0, 0.45, 0.02, dbl, 0.22, 2.0, 0.08, '#f2f0ea');
    k.rbox(0, 0.58, 0.25, dbl + 0.04, 0.08, 1.4, 0.04, o.c2 || '#4a6a9a');
    k.rbox(0, 0.55, 0.92, dbl + 0.06, 0.12, 0.25, 0.05, o.c2 || '#4a6a9a');
    for (const sx of (o.single ? [0] : [-0.38, 0.38])) k.rbox(sx, 0.62, -0.78, 0.62, 0.14, 0.36, 0.07, '#ffffff');
  } },
  nightstand: { fp: [0.5, 0.42], b: (k, o) => {
    k.surf('wood'); k.rbox(0, 0.28, 0, 0.5, 0.56, 0.42, 0.02, o.c || '#6a4a30');
    k.box(0, 0.38, 0.215, 0.42, 0.003, 0.003, '#2a1a10'); k.surf('chrome'); k.box(0, 0.44, 0.22, 0.1, 0.02, 0.02, '#c8c0a0');
    k.surf('fabric'); k.lathe(0.08, 0.56, 0, [[0.06, 0], [0.07, 0.2]], '#3a3a3a', 8); k.lathe(0.08, 0.76, 0, [[0.14, 0], [0.09, 0.16]], '#f0e4c8', 12);
    k.sphere(0.08, 0.82, 0, 0.04, '#fff0c0', 0, 10, 1, 1, 1, 1);
  } },
  wardrobe: { fp: [1.4, 0.6], b: (k, o) => {
    k.surf('wood'); k.rbox(0, 1.05, 0, 1.4, 2.1, 0.6, 0.02, o.c || '#8a6a4a');
    k.box(0, 1.05, 0.302, 0.006, 1.95, 0.004, '#3a2a1a');
    k.surf('chrome'); for (const sx of [-0.06, 0.06]) k.box(sx, 1.1, 0.31, 0.02, 0.25, 0.02, '#c8c0a0');
  } },
  dresser: { fp: [1.1, 0.5], b: (k, o) => {
    k.surf('wood'); k.rbox(0, 0.45, 0, 1.1, 0.9, 0.5, 0.02, o.c || '#8a6a4a');
    for (let i = 0; i < 3; i++) { k.box(0, 0.18 + i * 0.27, 0.252, 1.0, 0.004, 0.004, '#3a2a1a'); k.surf('chrome'); k.box(0, 0.28 + i * 0.27, 0.26, 0.14, 0.02, 0.02, '#c8c0a0'); k.surf('wood'); }
    k.surf('mirror'); k.rbox(0, 1.35, -0.2, 0.8, 0.8, 0.03, 0.02, '#c8d0d8');
  } },
  // ------------------------------------------------------------ kitchen & bath
  counter: { fp: [1, 0.65], b: (k, o) => {
    const w = o.w || 1;
    k.surf('wood'); k.box(0, 0.44, 0, w, 0.88, 0.6, o.c || '#e8e8e4');
    for (let x = -w / 2 + 0.3; x < w / 2; x += 0.6) { k.box(x, 0.44, 0.302, 0.004, 0.8, 0.004, '#8a8a88'); k.surf('chrome'); k.box(x + 0.22, 0.7, 0.31, 0.02, 0.12, 0.02, '#c8c8c8'); k.surf('wood'); }
    k.surf('marble'); k.box(0, 0.9, 0.01, w + 0.02, 0.04, 0.64, o.top || '#d8d4cc');
    if (o.upper) { k.surf('wood'); k.box(0, 1.85, -0.12, w, 0.7, 0.35, o.c || '#e8e8e4'); }
  } },
  sink: { fp: [1, 0.65], b: (k, o) => {
    FURN.counter.b(k, { ...o, w: 1 });
    k.surf('metal'); k.box(0, 0.9, 0.02, 0.55, 0.05, 0.4, '#b8bcc0'); k.box(0, 0.86, 0.02, 0.48, 0.05, 0.34, '#6a6e72');
    k.surf('chrome'); k.tube([[0, 0.9, -0.2], [0, 1.15, -0.2], [0, 1.15, -0.05]], 0.015, '#d8dce0', 6);
  } },
  stove: { fp: [0.7, 0.65], b: (k, o) => {
    k.surf('metal'); k.rbox(0, 0.45, 0, 0.7, 0.9, 0.62, 0.02, o.c || '#d8dcdf');
    k.surf('glass'); k.box(0, 0.42, 0.31, 0.56, 0.38, 0.01, '#101214');
    k.surf('plastic'); k.box(0, 0.92, 0, 0.66, 0.02, 0.58, '#151515');
    k.surf('metal'); for (const sx of [-0.17, 0.17]) for (const sz of [-0.13, 0.13]) k.cyl(sx, 0.94, sz, 0.1, 0.01, '#3a3a3a', 12);
    for (let i = 0; i < 4; i++) k.cyl(-0.24 + i * 0.16, 0.8, 0.32, 0.025, 0.03, '#2a2a2a', 8, 0, 0, [Math.PI / 2, 0, 0]);
    k.surf('metal'); k.cyl(0.17, 1.0, 0.13, 0.12, 0.12, '#8a8c90', 12);
  } },
  fridge: { fp: [0.8, 0.72], b: (k, o) => {
    k.surf('metal'); k.rbox(0, 0.95, 0, 0.8, 1.9, 0.7, 0.04, o.c || '#d8dcdf');
    k.box(0, 1.3, 0.352, 0.76, 0.005, 0.005, '#6a6e72');
    k.surf('chrome'); k.box(-0.32, 1.0, 0.37, 0.03, 0.5, 0.04, '#b8bcc0'); k.box(-0.32, 1.55, 0.37, 0.03, 0.3, 0.04, '#b8bcc0');
    k.surf('plastic'); k.box(0.1, 1.45, 0.355, 0.08, 0.06, 0.005, '#e05050'); k.box(0.2, 1.3, 0.355, 0.1, 0.12, 0.005, '#f0f0d0');
  } },
  dining: { fp: [1.6, 1.0], b: (k, o) => {
    k.surf('wood'); k.rbox(0, 0.75, 0, 1.6, 0.05, 0.95, 0.02, o.c || '#7a5a3a');
    for (const sx of [-0.7, 0.7]) for (const sz of [-0.4, 0.4]) k.box(sx, 0.37, sz, 0.06, 0.74, 0.06, '#4a3420');
    for (const sx of [-0.4, 0.4]) for (const sz of [-1, 1]) { FURN.chair.b(k, { at: [sx, sz * 0.72, sz < 0 ? 0 : Math.PI], c: o.c2 }); }
    k.surf('fabric'); k.box(0, 0.78, 0, 0.3, 0.01, 0.9, '#e8e0d0');
    k.surf('glass'); k.cyl(0, 0.84, 0, 0.06, 0.12, '#c8e0d8', 10);
  } },
  chair: { fp: [0.45, 0.45], b: (k, o) => {
    const [ox, oz, ry] = o.at || [0, 0, 0];
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const P = (x, z) => [ox + x * cs + z * sn, oz - x * sn + z * cs];
    k.surf('wood');
    let [x, z] = P(0, 0); k.rbox(x, 0.46, z, 0.44, 0.05, 0.42, 0.02, o.c || '#4a3420', 0, 0, [0, ry, 0]);
    [x, z] = P(0, -0.19); k.rbox(x, 0.75, z, 0.42, 0.55, 0.04, 0.02, o.c || '#4a3420', 0, 0, [0, ry, 0]);
    for (const [lx, lz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) { [x, z] = P(lx, lz); k.box(x, 0.22, z, 0.04, 0.45, 0.04, '#2a2018'); }
  } },
  toilet: { fp: [0.45, 0.7], b: (k) => {
    k.surf('plastic'); k.lathe(0, 0, 0.08, [[0.15, 0], [0.2, 0.25], [0.22, 0.4]], '#f4f4f2', 14, 0, 0, null, 1, 1.25);
    k.rbox(0, 0.42, 0.08, 0.4, 0.04, 0.5, 0.02, '#f4f4f2');
    k.rbox(0, 0.6, -0.26, 0.42, 0.42, 0.18, 0.04, '#f4f4f2');
    k.surf('chrome'); k.box(0.14, 0.76, -0.17, 0.06, 0.02, 0.02, '#d8dce0');
  } },
  bathSink: { fp: [0.6, 0.45], b: (k) => {
    k.surf('wood'); k.rbox(0, 0.42, 0, 0.6, 0.84, 0.45, 0.02, '#e8e4dc');
    k.surf('plastic'); k.lathe(0, 0.84, 0.02, [[0.0, 0], [0.2, 0.0], [0.22, 0.06]], '#f6f6f4', 14, 0, 0, null, 1, 0.75);
    k.surf('chrome'); k.tube([[0, 0.86, -0.17], [0, 1.0, -0.17], [0, 1.0, -0.08]], 0.012, '#d8dce0', 6);
    k.surf('mirror'); k.rbox(0, 1.45, -0.21, 0.55, 0.7, 0.02, 0.02, '#c8d0d8');
  } },
  shower: { fp: [0.95, 0.95], b: (k) => {
    k.surf('tile'); k.box(0, 0.04, 0, 0.95, 0.08, 0.95, '#e8eef0');
    k.surf('glass'); k.box(0.47, 1.0, 0, 0.02, 1.9, 0.95, '#a8c0c8', 0, 7); k.box(0, 1.0, 0.47, 0.95, 1.9, 0.02, '#a8c0c8', 0, 7);
    k.surf('chrome'); k.cyl(0, 2.0, -0.35, 0.1, 0.02, '#d8dce0', 12); k.tube([[0, 2.0, -0.45], [0, 2.08, -0.47]], 0.015, '#d8dce0', 6);
  } },
  bathtub: { fp: [1.7, 0.8], b: (k) => {
    k.surf('plastic'); k.rbox(0, 0.28, 0, 1.7, 0.56, 0.78, 0.1, '#f6f6f4');
    k.box(0, 0.5, 0, 1.5, 0.12, 0.6, '#d8e8f0');
    k.surf('chrome'); k.tube([[-0.72, 0.56, 0], [-0.82, 0.7, 0], [-0.75, 0.75, 0]], 0.015, '#d8dce0', 6);
  } },
  // ------------------------------------------------------------ work & study
  desk: { fp: [1.4, 0.75], b: (k, o) => {
    k.surf('wood'); k.rbox(0, 0.74, 0, 1.4, 0.04, 0.7, 0.01, o.c || '#c8b89a');
    for (const sx of [-0.66, 0.66]) k.box(sx, 0.37, 0, 0.04, 0.74, 0.66, '#4a4a4c');
    k.box(0.45, 0.45, 0, 0.42, 0.5, 0.62, o.c || '#c8b89a');
    if (o.pc !== false) {
      k.surf('plastic'); k.rbox(0, 1.08, -0.2, 0.62, 0.38, 0.03, 0.01, '#141416');
      k.box(0, 1.08, -0.18, 0.58, 0.33, 0.005, o.on ? '#5a8ac0' : '#0a0c10', 0, o.on ? 10 : 0);
      k.box(0, 0.86, -0.22, 0.06, 0.2, 0.04, '#222'); k.box(0, 0.77, -0.22, 0.22, 0.02, 0.16, '#222');
      k.rbox(0, 0.775, 0.05, 0.44, 0.02, 0.14, 0.008, '#2a2a2c');
      k.rbox(0.32, 0.775, 0.06, 0.06, 0.025, 0.1, 0.012, '#2a2a2c');
      k.surf('plastic'); k.cyl(-0.5, 0.82, 0.02, 0.04, 0.12, '#c84040', 10);
    }
    FURN.officeChair.b(k, { at: [0, 0.6, Math.PI] });
  } },
  officeChair: { fp: null, b: (k, o) => {
    const [ox, oz, ry] = o.at || [0, 0, 0];
    k.surf('metal'); for (let i = 0; i < 5; i++) { const a = i * 1.2566; k.box(ox + Math.cos(a) * 0.2, 0.06, oz + Math.sin(a) * 0.2, 0.42, 0.03, 0.05, '#1a1a1c', 0, 0, [0, -a, 0]); }
    k.cyl(ox, 0.28, oz, 0.03, 0.42, '#3a3a3c', 8);
    k.surf('fabric'); k.rbox(ox, 0.5, oz, 0.48, 0.08, 0.46, 0.03, '#2a2c34', 0, 0, [0, ry, 0]);
    k.rbox(ox - Math.sin(ry) * 0.22, 0.85, oz - Math.cos(ry) * 0.22, 0.44, 0.6, 0.07, 0.04, '#2a2c34', 0, 0, [0, ry, 0]);
  } },
  cubicle: { fp: [1.8, 1.6], b: (k, o) => {
    k.surf('fabric');
    k.box(0, 0.65, -0.78, 1.8, 1.3, 0.05, o.c || '#7a8a9a');
    for (const sx of [-0.9, 0.9]) k.box(sx, 0.65, 0, 0.05, 1.3, 1.6, o.c || '#7a8a9a');
    k.surf('metal'); k.box(0, 1.31, -0.78, 1.82, 0.03, 0.07, '#9a9ca0');
    FURN.desk.b(k, { on: true, c: '#d8d0c0' });
    k.surf('fabric'); k.box(-0.5, 1.0, -0.74, 0.2, 0.25, 0.005, '#f0e080'); k.box(-0.25, 1.05, -0.74, 0.15, 0.15, 0.005, '#80d0f0');
  } },
  whiteboard: { fp: null, b: (k) => {
    k.surf('metal'); k.rbox(0, 1.5, 0, 2.4, 1.2, 0.04, 0.01, '#b8bcc0');
    k.surf('plastic'); k.box(0, 1.5, 0.022, 2.3, 1.1, 0.005, '#f4f6f6');
    k.box(-0.6, 1.7, 0.026, 0.8, 0.02, 0.002, '#2a4aa8'); k.box(-0.4, 1.55, 0.026, 1.1, 0.02, 0.002, '#2a4aa8'); k.box(0.5, 1.35, 0.026, 0.5, 0.3, 0.002, '#c83a3a');
  } },
  chalkboard: { fp: null, b: (k) => {
    k.surf('wood'); k.rbox(0, 1.5, 0, 3.6, 1.3, 0.05, 0.01, '#6a4a2a');
    k.surf('felt'); k.box(0, 1.5, 0.03, 3.45, 1.15, 0.005, '#2a3a30');
    k.surf('plaster'); for (let i = 0; i < 5; i++) k.box(-1.2 + (i % 3) * 0.6, 1.8 - i * 0.12, 0.034, 0.5 + (i % 2) * 0.3, 0.02, 0.002, '#e8e8e0');
    k.box(0.9, 1.4, 0.034, 0.6, 0.6, 0.002, '#e8e8e0');
  } },
  schoolDesk: { fp: [0.7, 0.9], b: (k) => {
    k.surf('wood'); k.rbox(0, 0.72, 0.1, 0.7, 0.03, 0.5, 0.01, '#c8a878');
    k.surf('metal'); for (const sx of [-0.3, 0.3]) k.box(sx, 0.36, 0.1, 0.03, 0.72, 0.03, '#4a5a6a');
    FURN.chair.b(k, { at: [0, -0.32, 0], c: '#4a7aa8' });
    k.surf('fabric'); k.box(0.1, 0.745, 0.1, 0.22, 0.02, 0.28, '#e8e4d8');
  } },
  locker: { fp: [0.4, 0.5], b: (k, o) => {
    k.surf('metal'); k.rbox(0, 0.95, 0, 0.4, 1.9, 0.5, 0.01, o.c || '#4a6a9a');
    for (let i = 0; i < 4; i++) k.box(0, 1.6 + i * 0.05, 0.252, 0.25, 0.012, 0.003, '#2a3a5a');
    k.surf('chrome'); k.box(0.14, 1.0, 0.26, 0.03, 0.1, 0.02, '#c8c8c8');
  } },
  // ------------------------------------------------------------ retail
  shelf: { fp: [0.9, 1.8], b: (k, o) => {
    k.surf('metal'); k.box(0, 0.9, 0, 0.08, 1.8, 0.85, '#c8c8c4');
    const prod = o.prod || ['#d04040', '#40a040', '#e0c040', '#4060c0', '#e08030', '#c040a0', '#f0f0e8', '#8a5a3a'];
    for (const side of [-1, 1]) for (let s = 0; s < 4; s++) {
      k.surf('metal'); k.box(side * 0.22, 0.12 + s * 0.45, 0, 0.4, 0.03, 1.8, '#d8d8d4');
      k.surf('plastic');
      for (let j = 0; j < 9; j++) { const h = 0.18 + ((s + j) % 3) * 0.05; k.box(side * 0.22, 0.14 + s * 0.45 + h / 2, -0.8 + j * 0.2, 0.32, h, 0.17, prod[(s * 5 + j * 3 + (side > 0 ? 2 : 0)) % prod.length]); }
    }
  } },
  fridgeCase: { fp: [1.3, 0.8], b: (k, o) => {
    k.surf('metal'); k.rbox(0, 1.1, 0, 1.3, 2.2, 0.8, 0.03, '#d8dce0');
    k.box(0, 1.15, 0.33, 1.15, 1.8, 0.1, '#c8e8ff', 0, 10);
    const prod = ['#e04040', '#40c040', '#f0e040', '#4080e0', '#f0f0f0', '#e08040'];
    k.surf('plastic'); for (let s = 0; s < 4; s++) for (let j = 0; j < 6; j++) k.cyl(-0.5 + j * 0.2, 0.42 + s * 0.42, 0.25, 0.04, 0.24, prod[(s + j * 2) % prod.length], 8);
    k.surf('glass'); k.box(0, 1.15, 0.41, 1.2, 1.9, 0.02, '#a8c8d8', 0, 7);
  } },
  checkout: { fp: [1.8, 0.8], b: (k, o) => {
    k.surf('wood'); k.rbox(0, 0.48, 0, 1.8, 0.96, 0.75, 0.03, o.c || '#5a4a3a');
    k.surf('plastic'); k.box(0.3, 0.97, 0, 1.1, 0.02, 0.55, '#1a1a1a');
    k.rbox(-0.55, 1.1, -0.1, 0.4, 0.25, 0.35, 0.03, '#2a2a2c');
    k.box(-0.55, 1.28, -0.15, 0.3, 0.2, 0.02, '#40c080', 0, 10);
    k.surf('glass'); k.box(0.0, 0.99, 0.15, 0.3, 0.01, 0.2, '#f04040', 0, 10);
    if (o.lotto !== false) { k.surf('plastic'); k.rbox(0.75, 1.15, -0.25, 0.3, 0.4, 0.2, 0.03, '#d8b020'); k.box(0.75, 1.2, -0.14, 0.24, 0.2, 0.01, '#3060c0', 0, 10); }
    k.surf('plastic'); for (let i = 0; i < 5; i++) k.box(-0.8 + i * 0.12, 1.6 + (i % 2) * 0.1, -0.3, 0.1, 0.18, 0.06, ['#e04040', '#4040e0', '#f0f0f0', '#40a040', '#e0a040'][i]);
  } },
  clothesRack: { fp: [1.6, 0.6], b: (k, o) => {
    k.surf('chrome'); k.cyl(0, 1.5, 0, 0.02, 1.6, '#c8c8c8', 6, 0, 0, [0, 0, Math.PI / 2]);
    for (const sx of [-0.78, 0.78]) k.cyl(sx, 0.75, 0, 0.02, 1.5, '#c8c8c8', 6);
    const cs = o.cs || ['#c04040', '#4060a0', '#e8e8e0', '#2a2a2a', '#d8a040', '#3a8a5a', '#a04080'];
    k.surf('fabric'); for (let i = 0; i < 12; i++) k.rbox(-0.7 + i * 0.125, 1.1, 0, 0.04, 0.75, 0.45, 0.02, cs[i % cs.length]);
  } },
  mannequin: { fp: [0.5, 0.5], b: (k, o) => {
    k.surf('plastic'); k.cyl(0, 0.03, 0, 0.2, 0.05, '#2a2a2a', 12); k.cyl(0, 0.5, 0, 0.02, 1.0, '#2a2a2a', 6);
    k.surf('fabric'); k.loft([{ z: 1.0, w: 0.34, yb: -0.1, yt: 0.1, r: 0.8 }, { z: 1.25, w: 0.3, yb: -0.09, yt: 0.09, r: 0.8 }, { z: 1.45, w: 0.4, yb: -0.11, yt: 0.1, r: 0.8 }, { z: 1.55, w: 0.2, yb: -0.06, yt: 0.06, r: 0.9 }], o.c || '#c04060', 0, 0, 12, [-Math.PI / 2, 0, 0]);
    k.surf('plastic'); k.ball(0, 1.72, 0, 0.09, 0.11, 0.1, '#e8e4dc', 0, 0, 10, 8);
  } },
  displayCase: { fp: [1.6, 0.6], b: (k, o) => {
    k.surf('wood'); k.rbox(0, 0.45, 0, 1.6, 0.9, 0.6, 0.02, o.c || '#2a2420');
    k.surf('glass'); k.box(0, 1.0, 0, 1.55, 0.22, 0.56, '#b8d0d8', 0, 7);
    k.surf('felt'); k.box(0, 0.91, 0, 1.5, 0.01, 0.5, o.felt || '#2a3a5a');
    if (o.guns) { k.surf('metal'); for (let i = 0; i < 4; i++) { k.box(-0.55 + i * 0.36, 0.93, 0, 0.22, 0.03, 0.08, '#1a1a1c', 0, 0, [0, 0.2, 0]); k.box(-0.62 + i * 0.36, 0.93, 0.06, 0.05, 0.03, 0.1, '#3a2a1a', 0, 0, [0, 0.2, 0]); } }
    else { k.surf('chrome'); for (let i = 0; i < 6; i++) k.ball(-0.6 + i * 0.24, 0.94, 0, 0.05, 0.03, 0.05, ['#d8c060', '#c8c8d0', '#e04060'][i % 3], 0, 0, 8, 6); }
  } },
  gunRack: { fp: null, b: (k) => {
    k.surf('wood'); k.rbox(0, 1.4, 0, 3.0, 1.4, 0.06, 0.01, '#4a3a2a');
    k.surf('metal');
    for (let i = 0; i < 6; i++) { const x = -1.25 + i * 0.5; k.box(x, 1.45, 0.06, 0.06, 1.05, 0.05, '#1a1a1c'); k.surf('wood'); k.box(x, 1.05, 0.06, 0.08, 0.3, 0.06, '#5a3a24'); k.surf('metal'); k.box(x - 0.03, 1.3, 0.08, 0.04, 0.15, 0.04, '#1a1a1c'); }
  } },
  // ------------------------------------------------------------ food & drink
  booth: { fp: [1.8, 1.6], b: (k, o) => {
    const c = o.c || '#8a2a2a';
    k.surf('leather');
    for (const sz of [-0.62, 0.62]) {
      k.rbox(0, 0.25, sz, 1.6, 0.5, 0.5, 0.05, c);
      k.rbox(0, 0.8, sz + Math.sign(sz) * 0.22, 1.6, 0.8, 0.14, 0.06, c);
    }
    k.surf('wood'); k.rbox(0, 0.74, 0, 1.3, 0.04, 0.72, 0.02, o.c2 || '#d8c8a8');
    k.surf('metal'); k.cyl(0, 0.37, 0, 0.05, 0.74, '#2a2a2a', 8);
    k.surf('glass'); k.cyl(-0.3, 0.82, 0.1, 0.035, 0.12, '#c8e0f0', 8); k.cyl(0.3, 0.82, -0.1, 0.035, 0.12, '#e0a040', 8);
    k.surf('plastic'); k.cyl(0, 0.77, 0, 0.12, 0.012, '#f4f4f0', 14);
  } },
  cafeTable: { fp: [1.6, 1.6], b: (k, o) => {
    k.surf('marble'); k.cyl(0, 0.75, 0, 0.42, 0.04, o.c || '#e8e4dc', 18);
    k.surf('metal'); k.cyl(0, 0.37, 0, 0.04, 0.74, '#2a2a2a', 8); k.cyl(0, 0.02, 0, 0.25, 0.04, '#2a2a2a', 14);
    for (const a of [0, Math.PI]) FURN.chair.b(k, { at: [Math.sin(a) * 0.62, Math.cos(a) * 0.62, a + Math.PI], c: o.c2 || '#3a2a20' });
    k.surf('plastic'); k.cyl(0.1, 0.8, 0.05, 0.05, 0.08, '#f4f0e8', 10);
  } },
  bar: { fp: [1, 0.8], b: (k, o) => {
    const w = o.w || 4;
    k.surf('wood'); k.rbox(0, 0.55, 0, w, 1.1, 0.7, 0.04, o.c || '#3a2418');
    k.surf('marble'); k.rbox(0, 1.12, 0.05, w + 0.1, 0.06, 0.82, 0.02, o.top || '#2a2a2c');
    k.surf('chrome'); k.cyl(0, 0.15, 0.4, 0.025, w, '#c8b070', 8, 0, 0, [0, 0, Math.PI / 2]);
    for (let x = -w / 2 + 0.6; x < w / 2; x += 1.2) { k.surf('chrome'); k.cyl(x, 1.25, -0.2, 0.02, 0.2, '#d8d8d8', 6); for (let t = 0; t < 3; t++) k.cyl(x - 0.1 + t * 0.1, 1.38, -0.2, 0.015, 0.14, ['#c8a040', '#2a2a2a', '#c84040'][t], 6); }
    if (o.stools !== false) for (let x = -w / 2 + 0.5; x < w / 2; x += 0.75) FURN.stool.b(k, { at: [x, 0.75] });
  } },
  stool: { fp: null, b: (k, o) => {
    const [x, z] = o.at || [0, 0];
    k.surf('chrome'); k.cyl(x, 0.38, z, 0.03, 0.76, '#c8c8c8', 6); k.cyl(x, 0.02, z, 0.2, 0.03, '#c8c8c8', 12); k.lathe(x, 0.3, z, [[0.16, 0], [0.16, 0.02]], '#c8c8c8', 12);
    k.surf('leather'); k.cyl(x, 0.78, z, 0.19, 0.08, o.c || '#8a2a2a', 14);
  } },
  backBar: { fp: [1, 0.45], b: (k, o) => {
    const w = o.w || 4;
    k.surf('wood'); k.box(0, 0.5, 0, w, 1.0, 0.45, '#2a1810');
    k.surf('mirror'); k.box(0, 1.9, -0.18, w - 0.2, 1.4, 0.02, '#a8b0b8');
    k.surf('glass');
    const bc = ['#3a7a3a', '#8a5a20', '#d8d0b0', '#5a1a2a', '#2a4a8a', '#c8a040', '#e8e8e0'];
    for (const y of [1.15, 1.6, 2.05]) { k.surf('wood'); k.box(0, y - 0.04, -0.08, w - 0.2, 0.03, 0.25, '#4a3020'); k.surf('glass'); for (let x = -w / 2 + 0.2; x < w / 2 - 0.15; x += 0.13) { const c = bc[Math.floor((x * 7 + y * 13) * 10) % bc.length & 7] || bc[0]; k.cyl(x, y + 0.12, -0.08, 0.035, 0.22, c, 8); k.cyl(x, y + 0.27, -0.08, 0.012, 0.08, c, 6); } }
    k.box(0, 2.7, -0.1, w - 0.4, 0.04, 0.04, o.neon || '#ff3070', 0, 10);
  } },
  // ------------------------------------------------------------ nightlife & casino
  djBooth: { fp: [2.6, 1.2], b: (k) => {
    k.surf('metal'); k.rbox(0, 0.55, 0, 2.6, 1.1, 1.0, 0.04, '#141418');
    k.box(0, 0.6, 0.51, 2.5, 0.08, 0.01, '#d500f9', 0, 10);
    k.surf('plastic'); for (const sx of [-0.7, 0.7]) { k.box(sx, 1.12, 0, 0.6, 0.05, 0.5, '#2a2a2e'); k.cyl(sx, 1.16, 0, 0.18, 0.02, '#0a0a0a', 16); k.cyl(sx, 1.18, 0, 0.04, 0.01, '#c8c8c8', 8); }
    k.box(0, 1.13, 0, 0.5, 0.06, 0.4, '#1a1a1e');
    for (let i = 0; i < 8; i++) k.box(-0.18 + (i % 4) * 0.12, 1.17, -0.1 + Math.floor(i / 4) * 0.2, 0.06, 0.01, 0.06, ['#ff3060', '#30c0ff', '#ffd030', '#60ff60'][i % 4], 0, 10);
    k.surf('plastic'); k.rbox(1.0, 1.2, -0.2, 0.35, 0.22, 0.25, 0.02, '#c8c8c8'); k.box(1.0, 1.24, -0.07, 0.3, 0.16, 0.005, '#2a6ac0', 0, 10);
  } },
  speaker: { fp: [0.8, 0.7], b: (k) => {
    k.surf('wood'); k.rbox(0, 0.9, 0, 0.8, 1.8, 0.7, 0.03, '#121214');
    k.surf('rubber'); for (const [y, r] of [[0.5, 0.3], [1.15, 0.2], [1.55, 0.1]]) { k.cyl(0, y, 0.35, r, 0.03, '#1e1e20', 18, 0, 0, [Math.PI / 2, 0, 0]); k.cyl(0, y, 0.37, r * 0.35, 0.03, '#3a3a3c', 12, 0, 0, [Math.PI / 2, 0, 0]); }
  } },
  slot: { fp: [0.8, 0.8], b: (k, o) => {
    const c = o.c || '#c82030';
    k.surf('metal'); k.rbox(0, 0.6, 0, 0.75, 1.2, 0.65, 0.04, '#1a1a1e');
    k.surf('none'); k.rbox(0, 1.55, -0.05, 0.75, 0.7, 0.55, 0.08, c);
    k.surf('glass'); k.box(0, 1.5, 0.23, 0.6, 0.42, 0.01, '#101014');
    for (let i = 0; i < 3; i++) k.box(-0.19 + i * 0.19, 1.5, 0.235, 0.16, 0.34, 0.005, '#f8f4e8', 0, 10);
    for (let i = 0; i < 3; i++) k.box(-0.19 + i * 0.19, 1.5, 0.24, 0.1, 0.1, 0.004, ['#e02020', '#e0c020', '#20a040'][i], 0, 10);
    k.box(0, 1.98, 0.0, 0.66, 0.16, 0.5, o.top || '#ffd040', 0, 10);
    k.surf('plastic'); k.rbox(0, 1.12, 0.32, 0.6, 0.06, 0.2, 0.02, '#2a2a2e', 0, 0, [0.3, 0, 0]);
    for (let i = 0; i < 4; i++) k.cyl(-0.18 + i * 0.12, 1.16, 0.38, 0.03, 0.02, ['#e04040', '#40e040', '#4040e0', '#e0e040'][i], 8, 0, 10);
    k.surf('chrome'); k.cyl(0.42, 1.4, 0, 0.02, 0.5, '#d8d8d8', 6); k.sphere(0.42, 1.68, 0, 0.05, '#e02020');
    k.surf('leather'); FURN.stool.b(k, { at: [0, 0.62], c: '#2a1a1a' });
  } },
  blackjack: { fp: [2.4, 1.6], b: (k) => {
    k.surf('wood'); k.lathe(0, 0, 0, [[0.2, 0], [0.25, 0.7], [1.15, 0.72], [1.2, 0.8], [0.0, 0.82]], '#3a2010', 24, 0, 0, null, 1, 0.6);
    k.surf('felt'); k.lathe(0, 0.81, 0, [[0, 0], [1.08, 0], [1.08, 0.005]], '#1a6a3a', 24, 0, 0, null, 1, 0.55);
    k.surf('plastic'); for (let i = 0; i < 6; i++) k.box(-0.6 + i * 0.24, 0.825, 0.2 + Math.abs(i - 2.5) * -0.06, 0.06, 0.004, 0.09, '#f8f8f0');
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) k.cyl(-0.3 + i * 0.12, 0.83 + j * 0.008, -0.38, 0.03, 0.008, ['#e02020', '#2040e0', '#20a040', '#202020', '#f0f0f0'][i], 10);
    for (let i = 0; i < 5; i++) { const a = -1.0 + i * 0.5; FURN.stool.b(k, { at: [Math.sin(a) * 1.25, Math.cos(a) * 0.85], c: '#5a1a1a' }); }
  } },
  roulette: { fp: [2.8, 1.5], b: (k) => {
    k.surf('wood'); k.rbox(0, 0.4, 0, 2.8, 0.8, 1.3, 0.06, '#3a2010');
    k.surf('felt'); k.box(0.3, 0.81, 0, 1.9, 0.01, 1.1, '#1a6a3a');
    k.surf('plastic'); for (let i = 0; i < 12; i++) for (let j = 0; j < 3; j++) k.box(-0.35 + i * 0.12, 0.818, -0.25 + j * 0.2, 0.11, 0.002, 0.18, (i + j) % 2 ? '#c82020' : '#141414');
    k.surf('wood'); k.lathe(-1.0, 0.8, 0, [[0.5, 0], [0.5, 0.1], [0.35, 0.06], [0.1, 0.12], [0, 0.14]], '#5a3218', 24);
    k.surf('chrome'); k.cyl(-1.0, 0.95, 0, 0.03, 0.12, '#d8c060', 8);
    for (let i = 0; i < 4; i++) k.box(-1.0 + Math.cos(i) * 0.4, 0.905, Math.sin(i) * 0.4, 0.06, 0.004, 0.06, i % 2 ? '#c82020' : '#141414');
  } },
  pokerTable: { fp: [2.4, 1.4], b: (k) => {
    k.surf('leather'); k.lathe(0, 0, 0, [[0.2, 0], [0.25, 0.68], [1.2, 0.7], [1.22, 0.78], [0, 0.8]], '#2a1a14', 24, 0, 0, null, 1, 0.55);
    k.surf('felt'); k.lathe(0, 0.795, 0, [[0, 0], [1.1, 0], [1.1, 0.005]], '#2a3a6a', 24, 0, 0, null, 1, 0.5);
    for (let i = 0; i < 6; i++) { const a = i * 1.047; FURN.chair.b(k, { at: [Math.sin(a) * 1.4, Math.cos(a) * 0.95, a + Math.PI], c: '#3a1a1a' }); }
  } },
  cage: { fp: [3, 1.2], b: (k) => {
    k.surf('wood'); k.rbox(0, 0.55, 0, 3, 1.1, 0.8, 0.03, '#2a1810');
    k.surf('marble'); k.box(0, 1.12, 0.05, 3.05, 0.05, 0.85, '#d8d0c0');
    k.surf('chrome'); for (let x = -1.45; x <= 1.45; x += 0.12) k.cyl(x, 1.9, -0.1, 0.012, 1.5, '#d8c060', 6);
    k.box(0, 2.66, -0.1, 3.0, 0.06, 0.06, '#d8c060');
    k.box(0, 1.25, -0.1, 0.6, 0.25, 0.04, '#141414');
  } },
  chandelier: { fp: null, b: (k) => {
    k.surf('chrome'); k.cyl(0, 0, 0, 0.02, 0.8, '#d8c060', 6); k.lathe(0, -0.6, 0, [[0.6, 0], [0.5, 0.15], [0.1, 0.3]], '#d8c060', 16);
    k.surf('glass'); for (let i = 0; i < 12; i++) { const a = i * 0.52; k.sphere(Math.cos(a) * 0.55, -0.62, Math.sin(a) * 0.55, 0.06, '#fff4d0', 0, 10, 1, 1, 1, 1); k.cyl(Math.cos(a) * 0.45, -0.75, Math.sin(a) * 0.45, 0.01, 0.25, '#e8f0ff', 4); }
  } },
  stage: { fp: [6, 3], b: (k, o) => {
    const w = o.w || 6, d = o.d || 3;
    k.surf('planks'); k.box(0, 0.4, 0, w, 0.8, d, '#2a1a12');
    k.surf('metal'); k.box(0, 0.82, d / 2 - 0.05, w, 0.04, 0.06, '#d8c060');
    for (let i = 0; i < 8; i++) k.sphere(-w / 2 + 0.4 + i * (w - 0.8) / 7, 0.82, d / 2 + 0.02, 0.05, '#fff0c0', 0, 10, 1, 1, 1, 1);
    k.surf('fabric'); k.box(0, 2.4, -d / 2 + 0.1, w, 3.2, 0.1, o.curtain || '#7a0a2a');
    for (const sx of [-1, 1]) k.box(sx * (w / 2 - 0.4), 2.4, -d / 2 + 0.4, 0.8, 3.2, 0.2, o.curtain || '#7a0a2a');
    if (o.pole) { k.surf('chrome'); k.cyl(0, 2.4, 0, 0.03, 3.2, '#e0e0e0', 8); }
    k.surf('metal'); k.box(0, 3.9, 0, w, 0.12, 0.12, '#1a1a1a');
    for (let i = 0; i < 5; i++) { k.cyl(-w / 2 + 0.8 + i * (w - 1.6) / 4, 3.75, 0, 0.1, 0.25, '#1a1a1a', 10); k.sphere(-w / 2 + 0.8 + i * (w - 1.6) / 4, 3.6, 0.02, 0.07, ['#ff2060', '#2060ff', '#ffd040', '#ff2060', '#20ffa0'][i], 0, 10, 1, 1, 1, 1); }
  } },
  // ------------------------------------------------------------ bank
  tellerCounter: { fp: [1, 0.8], b: (k, o) => {
    const w = o.w || 8;
    k.surf('wood'); k.rbox(0, 0.6, 0, w, 1.2, 0.75, 0.02, '#4a2e1a');
    k.surf('marble'); k.box(0, 1.22, 0.05, w + 0.1, 0.05, 0.85, '#e8e0d0');
    k.surf('glass'); k.box(0, 1.95, -0.05, w, 1.4, 0.03, '#b8d0d8', 0, 7);
    k.surf('metal'); for (let x = -w / 2; x <= w / 2; x += 2) k.box(x, 1.95, -0.05, 0.06, 1.42, 0.06, '#c8b070');
    for (let x = -w / 2 + 1; x < w / 2; x += 2) { k.box(x, 1.32, -0.05, 0.4, 0.06, 0.3, '#b8bcc0'); k.surf('plastic'); k.box(x, 1.75, -0.08, 0.3, 0.2, 0.01, '#20d080', 0, 10); k.surf('metal'); }
  } },
  // ---------------------------------------------------------------- the countryside
  pine: { fp: [0.8, 0.8], b: (k, o) => {
    const h = o.h || 8;
    k.surf('bark'); k.cyl(0, h * 0.3, 0, 0.16, h * 0.6, '#4a3424', 7, 0, 0, null, 0.1);
    k.surf('leaf');
    for (let i = 0; i < 5; i++) { const y = h * (0.28 + i * 0.15), r = (1 - i * 0.17) * (o.r || 1.9); k.cyl(0, y, 0, r, h * 0.26, i % 2 ? '#2a4a2c' : '#24432a', 9, 0, 0, null, 0.05); }
  } },
  oak: { fp: [0.9, 0.9], b: (k, o) => {
    const h = o.h || 6;
    k.surf('bark'); k.cyl(0, h * 0.25, 0, 0.26, h * 0.5, '#5a4432', 8, 0, 0, null, 0.18);
    for (const [a, l] of [[0.6, 1.4], [2.4, 1.2], [4.2, 1.5]]) k.tube([[0, h * 0.4, 0], [Math.cos(a) * l * 0.6, h * 0.55, Math.sin(a) * l * 0.6], [Math.cos(a) * l, h * 0.62, Math.sin(a) * l]], 0.1, '#5a4432', 5);
    k.surf('leaf');
    for (let i = 0; i < 7; i++) { const a = i * 0.9; k.blob(Math.cos(a) * 1.3, h * 0.72 + (i % 3) * 0.5, Math.sin(a) * 1.3, 1.5, 1.1, 1.4, i % 2 ? '#4a7232' : '#3e6a2c', 0, 0, i * 4.7 + (o.seed || 0), 0.3, 1); }
    k.blob(0, h * 0.95, 0, 1.6, 1.2, 1.6, '#4c7834', 0, 0, 9, 0.3, 1);
  } },
  fence: { fp: null, b: (k, o) => {
    const w = o.w || 4;
    k.surf('wood');
    for (let x = -w / 2; x <= w / 2 + 0.01; x += 2) k.box(x, 0.55, 0, 0.12, 1.1, 0.12, '#8a7a62');
    k.box(0, 0.85, 0, w, 0.09, 0.05, '#9a8a70'); k.box(0, 0.45, 0, w, 0.09, 0.05, '#9a8a70');
  } },
  hayBale: { fp: [1.2, 0.9], b: (k) => { k.surf('fabric'); k.cyl(0, 0.6, 0, 0.6, 1.1, '#c8a850', 14, 0, 0, [0, 0, Math.PI / 2]); k.cyl(0, 0.6, 0, 0.62, 0.06, '#b89840', 14, 0, 0, [0, 0, Math.PI / 2]); } },
  cropRows: { fp: null, b: (k, o) => {
    const w = o.w || 8, d = o.d || 6, c = o.c || '#4a8a34';
    k.surf('concrete'); k.box(0, 0.02, 0, w, 0.04, d, '#5a4430');
    k.surf('leaf');
    for (let z = -d / 2 + 0.4; z < d / 2; z += 0.8) { k.box(0, 0.08, z, w, 0.12, 0.34, '#4a3626'); for (let x = -w / 2 + 0.3; x < w / 2; x += 0.45) k.blob(x, 0.32, z, 0.2, o.tall ? 0.45 : 0.22, 0.2, c, 0, 0, x * 7 + z, 0.35, 0); }
  } },
  tractor: { fp: [2.0, 3.4], b: (k) => {
    k.surf('metal'); k.rbox(0, 1.0, 0.2, 1.1, 0.7, 2.2, 0.08, '#3a8a3a'); k.rbox(0, 1.55, -0.6, 1.2, 1.1, 1.0, 0.06, '#3a8a3a');
    k.surf('glass'); k.box(0, 1.75, -0.6, 1.1, 0.6, 0.92, '#a8c8d8', 0, 7);
    k.surf('rubber'); for (const s of [-1, 1]) { k.cyl(s * 0.85, 0.75, -0.8, 0.75, 0.45, '#1e1e1e', 18, 0, 0, [0, 0, Math.PI / 2]); k.cyl(s * 0.7, 0.45, 1.0, 0.45, 0.35, '#1e1e1e', 14, 0, 0, [0, 0, Math.PI / 2]); }
    k.surf('metal'); k.cyl(0.3, 1.7, 0.9, 0.06, 0.8, '#2a2a2a', 6);
  } },
  pickup: { fp: [2.0, 5.0], b: (k, o) => {
    const c = o.c || '#8a2a24';
    k.surf('metal'); k.rbox(0, 0.85, 0, 1.9, 0.7, 4.9, 0.15, c); k.rbox(0, 1.45, 0.7, 1.8, 0.65, 1.6, 0.18, c);
    k.surf('glass'); k.box(0, 1.5, 0.7, 1.82, 0.4, 1.4, '#30404a', 0, 7);
    k.surf('rubber'); for (const s of [-1, 1]) for (const z of [-1.5, 1.55]) k.cyl(s * 0.88, 0.42, z, 0.42, 0.3, '#1a1a1a', 14, 0, 0, [0, 0, Math.PI / 2]);
    k.surf('chrome'); k.box(0, 0.6, 2.47, 1.8, 0.2, 0.06, '#c8ccd0');
  } },
  trailerHome: { fp: [3.6, 11], b: (k, o) => {
    k.surf('metal'); k.rbox(0, 1.55, 0, 3.4, 2.5, 10.8, 0.12, o.c || '#e8e2d2');
    k.box(0, 1.2, 0, 3.42, 0.22, 10.82, '#5a8aa8');
    k.surf('concrete'); for (const z of [-4, 0, 4]) k.box(0, 0.15, z, 3.0, 0.3, 0.4, '#7a7a76');
    k.surf('glass'); for (const z of [-3.5, 2.5]) k.box(1.72, 1.8, z, 0.03, 0.8, 1.4, '#9ab8d0', 0, 7);
  } },
  firepit: { fp: [1.4, 1.4], b: (k) => {
    k.surf('concrete'); for (let i = 0; i < 10; i++) { const a = i * 0.628; k.blob(Math.cos(a) * 0.6, 0.12, Math.sin(a) * 0.6, 0.16, 0.13, 0.14, '#7a746c', 0, 0, i, 0.3, 0); }
    k.surf('bark'); for (let i = 0; i < 4; i++) k.cyl(0, 0.15, 0, 0.06, 0.8, '#3a2a1e', 6, 0, 0, [Math.PI / 2, i * 0.8, 0.3]);
    k.surf('none'); k.blob(0, 0.3, 0, 0.22, 0.3, 0.22, '#ff8a30', 0, 10, 3, 0.4, 1);
  } },
  woodpile: { fp: [2.0, 0.8], b: (k) => { k.surf('bark'); for (let y = 0; y < 4; y++) for (let x = 0; x < 6 - y; x++) k.cyl(-0.8 + x * 0.3 + y * 0.15, 0.13 + y * 0.24, 0, 0.12, 0.7, y % 2 ? '#7a5a3a' : '#6a4a2e', 7, 0, 0, [Math.PI / 2, 0, 0]); } },
  coop: { fp: [2.2, 1.6], b: (k) => {
    k.surf('planks'); k.box(0, 0.8, 0, 2.0, 1.0, 1.4, '#a8462e'); k.taper(0, 1.3, 0, 2.2, 1.6, 0.1, 1.6, 0.5, '#4a3a2e');
    k.surf('metal'); k.box(0, 0.4, 0.95, 2.0, 0.8, 0.02, '#8a8a8a');
    k.surf('fabric'); for (let i = 0; i < 4; i++) k.ball(-0.6 + i * 0.4, 0.15, 1.3, 0.12, 0.12, 0.16, i % 2 ? '#f0ece4' : '#a86a3a');
  } },
  silo: { fp: [3.2, 3.2], b: (k) => { k.surf('metal'); k.cyl(0, 5, 0, 1.5, 10, '#b8bcc0', 18); k.lathe(0, 10, 0, [[1.55, 0], [1.2, 0.7], [0.4, 1.3], [0, 1.4]], '#8a9096', 18); } },
  mailboxPost: { fp: null, b: (k) => { k.surf('wood'); k.box(0, 0.55, 0, 0.1, 1.1, 0.1, '#6a4a30'); k.surf('metal'); k.rbox(0, 1.2, 0, 0.25, 0.25, 0.5, 0.1, '#3a4a6a'); k.box(0.14, 1.3, -0.1, 0.02, 0.18, 0.04, '#d03a2a'); } },
  porchSwing: { fp: [1.6, 0.8], b: (k) => { k.surf('wood'); k.box(0, 0.5, 0, 1.5, 0.08, 0.5, '#8a6a4a'); k.box(0, 0.75, -0.22, 1.5, 0.45, 0.06, '#8a6a4a'); k.surf('metal'); for (const s of [-1, 1]) k.cyl(s * 0.7, 1.6, 0, 0.01, 2.1, '#5a5a5a', 4); } },
  rocking: { fp: [0.7, 0.9], b: (k) => { k.surf('wood'); k.box(0, 0.45, 0, 0.55, 0.06, 0.5, '#6a4a30'); k.box(0, 0.8, -0.24, 0.55, 0.7, 0.05, '#6a4a30'); for (const s of [-1, 1]) k.box(s * 0.25, 0.08, 0, 0.04, 0.06, 0.9, '#5a3a24'); } },
  animal: { fp: [0.8, 1.8], b: (k, o) => {
    const c = o.c || '#5a3a2a';
    k.surf('leather'); k.ball(0, 1.0, 0, 0.42, 0.42, 0.85, c); k.ball(0, 1.2, 0.95, 0.2, 0.22, 0.3, c);
    for (const [x, z] of [[-0.25, -0.55], [0.25, -0.55], [-0.25, 0.5], [0.25, 0.5]]) k.cyl(x, 0.35, z, 0.07, 0.7, c, 6);
    if (o.spots) { k.ball(0.2, 1.15, -0.2, 0.25, 0.2, 0.3, '#f0ece4'); k.ball(-0.15, 0.95, 0.3, 0.3, 0.2, 0.25, '#f0ece4'); }
  } },
  vaultDoor: { fp: null, b: (k, o) => {
    const open = o.open ? 1 : 0;
    // a steel frame around a walk-through opening (hidden by the door when shut)
    k.surf('metal');
    for (const sx of [-1, 1]) k.rbox(sx * 1.275, 1.4, 0, 0.85, 3.0, 0.5, 0.04, '#5a5e64');
    k.rbox(0, 2.575, 0, 1.7, 0.65, 0.5, 0.04, '#5a5e64'); k.rbox(0, 0.225, 0, 1.7, 0.65, 0.5, 0.04, '#5a5e64');
    const door = new ModelKit();
    door.surf('chrome'); door.cyl(0, 0, 0, 1.25, 0.6, '#9aa0a8', 32, 0, 0, [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 3; i++) door.cyl(0, 0, 0.31 + i * 0.01, 1.1 - i * 0.25, 0.02, '#7a8088', 32, 0, 0, [Math.PI / 2, 0, 0]);
    door.surf('metal'); door.cyl(0, 0, 0.36, 0.18, 0.12, '#d8dce0', 14, 0, 0, [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 4; i++) door.box(Math.cos(i * 1.57) * 0.35, Math.sin(i * 1.57) * 0.35, 0.42, 0.06, 0.5, 0.06, '#d8dce0', 0, 0, [0, 0, i * 1.57]);
    for (let i = 0; i < 10; i++) door.cyl(Math.cos(i * 0.628) * 1.15, Math.sin(i * 0.628) * 1.15, 0, 0.07, 0.75, '#c8ccd0', 8, 0, 0, [Math.PI / 2, 0, 0]);
    k.append(door, open ? -1.2 : 0, 1.4, open ? 1.3 : 0.1, open ? 1.5 : 0);
    if (!open) { k.surf('none'); k.cyl(0, 1.4, 0.05, 1.28, 0.55, '#0a0a0c', 32, 0, 0, [Math.PI / 2, 0, 0]); }
  } },
  depositBoxes: { fp: null, b: (k, o) => {
    const w = o.w || 4;
    k.surf('chrome');
    k.box(0, 1.25, 0, w, 2.5, 0.4, '#b8a070');
    for (let x = -w / 2 + 0.15; x < w / 2; x += 0.3) for (let y = 0.2; y < 2.4; y += 0.25) { k.box(x, y, 0.205, 0.27, 0.22, 0.01, '#d8c080'); k.box(x, y, 0.215, 0.04, 0.04, 0.01, '#5a4a2a'); }
  } },
  cashPallet: { fp: [1.2, 0.8], b: (k) => {
    k.surf('wood'); k.box(0, 0.06, 0, 1.2, 0.12, 0.8, '#8a6a4a');
    k.surf('fabric'); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) for (let l = 0; l < 3; l++) k.rbox(-0.42 + i * 0.28, 0.2 + l * 0.14, -0.24 + j * 0.24, 0.26, 0.12, 0.2, 0.01, '#5a8a4a');
    k.surf('plastic'); for (let i = 0; i < 4; i++) k.box(-0.42 + i * 0.28, 0.48, 0, 0.27, 0.005, 0.02, '#e8e0c0');
  } },
  atm: { fp: [0.8, 0.6], b: (k) => {
    k.surf('metal'); k.rbox(0, 0.9, 0, 0.8, 1.8, 0.6, 0.04, '#2a4a7a');
    k.surf('glass'); k.box(0, 1.3, 0.301, 0.4, 0.3, 0.01, '#3a8ad8', 0, 10);
    k.surf('plastic'); k.rbox(0, 1.02, 0.32, 0.36, 0.04, 0.16, 0.01, '#1a1a1c', 0, 0, [0.4, 0, 0]);
    k.box(0, 0.85, 0.301, 0.2, 0.03, 0.01, '#0a0a0a'); k.box(0, 1.65, 0.301, 0.6, 0.12, 0.01, '#f0f0f0', 0, 10);
  } },
  // ------------------------------------------------------------ gym, health, civic
  treadmill: { fp: [0.9, 1.9], b: (k) => {
    k.surf('rubber'); k.rbox(0, 0.15, 0, 0.75, 0.2, 1.8, 0.04, '#1a1a1c');
    k.surf('metal'); for (const sx of [-0.38, 0.38]) k.tube([[sx, 0.2, 0.6], [sx, 1.2, 0.75]], 0.03, '#8a8c90', 6);
    k.surf('plastic'); k.rbox(0, 1.25, 0.78, 0.8, 0.3, 0.12, 0.03, '#2a2a2c', 0, 0, [0.5, 0, 0]); k.box(0, 1.28, 0.82, 0.3, 0.12, 0.01, '#e04030', 0, 10);
  } },
  benchPress: { fp: [1.8, 1.3], b: (k) => {
    k.surf('leather'); k.rbox(0, 0.42, 0, 0.3, 0.1, 1.2, 0.03, '#1a1a1c');
    k.surf('metal'); for (const sx of [-0.5, 0.5]) { k.cyl(sx, 0.6, -0.45, 0.03, 1.2, '#4a4a4c', 8); }
    k.surf('chrome'); k.cyl(0, 1.15, -0.45, 0.02, 1.9, '#c8c8c8', 8, 0, 0, [0, 0, Math.PI / 2]);
    k.surf('rubber'); for (const sx of [-0.8, 0.8]) k.cyl(sx, 1.15, -0.45, 0.22, 0.08, '#1a1a1c', 16, 0, 0, [0, 0, Math.PI / 2]);
  } },
  dumbbells: { fp: [2, 0.6], b: (k) => {
    k.surf('metal'); k.box(0, 0.4, 0, 2, 0.06, 0.5, '#3a3a3c'); for (const sx of [-0.9, 0.9]) k.box(sx, 0.2, 0, 0.05, 0.4, 0.5, '#3a3a3c');
    k.surf('rubber'); for (let i = 0; i < 8; i++) { const x = -0.85 + i * 0.24; k.cyl(x, 0.48, -0.08, 0.05 + i * 0.006, 0.06, '#1a1a1c', 10, 0, 0, [Math.PI / 2, 0, 0]); k.cyl(x, 0.48, 0.08, 0.05 + i * 0.006, 0.06, '#1a1a1c', 10, 0, 0, [Math.PI / 2, 0, 0]); k.surf('chrome'); k.cyl(x, 0.48, 0, 0.015, 0.16, '#c8c8c8', 6, 0, 0, [Math.PI / 2, 0, 0]); k.surf('rubber'); }
  } },
  hospitalBed: { fp: [1.0, 2.1], b: (k) => {
    k.surf('metal'); k.rbox(0, 0.35, 0, 0.95, 0.12, 2.0, 0.03, '#d8dce0'); for (const sx of [-0.42, 0.42]) for (const sz of [-0.9, 0.9]) k.cyl(sx, 0.17, sz, 0.02, 0.34, '#8a8c90', 6);
    k.surf('fabric'); k.rbox(0, 0.5, 0.05, 0.9, 0.16, 1.9, 0.06, '#f4f6f8'); k.rbox(0, 0.62, -0.75, 0.6, 0.12, 0.35, 0.05, '#ffffff'); k.rbox(0, 0.6, 0.35, 0.92, 0.06, 1.1, 0.03, '#a8c8e0');
    k.surf('metal'); k.cyl(0.62, 1.0, -0.8, 0.02, 2.0, '#8a8c90', 6); k.surf('plastic'); k.rbox(0.62, 1.4, -0.75, 0.35, 0.28, 0.08, 0.02, '#2a2a2c'); k.box(0.62, 1.4, -0.705, 0.3, 0.22, 0.005, '#20e080', 0, 10);
    k.surf('glass'); k.rbox(0.62, 1.85, -0.85, 0.12, 0.2, 0.05, 0.02, '#e0f0f8');
  } },
  reception: { fp: [3.2, 1.0], b: (k, o) => {
    k.surf('wood'); k.loft([{ z: -0.5, w: 3.2, yb: 0, yt: 1.1, r: 0.2 }, { z: 0.5, w: 3.2, yb: 0, yt: 1.1, r: 0.2 }], o.c || '#e8e4dc', 0, 0, 12);
    k.surf('marble'); k.box(0, 1.12, 0, 3.3, 0.05, 1.05, o.top || '#2a2a2c');
    k.box(0, 0.6, 0.51, 3.0, 0.08, 0.01, o.accent || '#40a0e0', 0, 10);
    FURN.desk.b(k, { on: true, c: '#d8d0c0' });
  } },
  cellBars: { fp: null, b: (k, o) => {
    const w = o.w || 3;
    k.surf('metal'); for (let x = -w / 2; x <= w / 2; x += 0.14) k.cyl(x, 1.4, 0, 0.018, 2.8, '#7a7e84', 6);
    k.box(0, 0.05, 0, w, 0.08, 0.06, '#5a5e64'); k.box(0, 2.8, 0, w, 0.08, 0.06, '#5a5e64'); k.box(0, 1.3, 0, w, 0.05, 0.05, '#5a5e64');
  } },
  cot: { fp: [0.8, 2.0], b: (k) => {
    k.surf('metal'); k.box(0, 0.4, 0, 0.8, 0.06, 1.95, '#5a5e64');
    k.surf('fabric'); k.rbox(0, 0.48, 0, 0.75, 0.1, 1.9, 0.04, '#8a8a7a');
  } },
  mailboxes: { fp: null, b: (k) => {
    k.surf('chrome'); k.box(0, 1.3, 0, 1.6, 1.0, 0.3, '#a8a088');
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { k.box(-0.64 + i * 0.32, 0.95 + j * 0.24, 0.155, 0.29, 0.2, 0.01, '#c8c0a0'); k.box(-0.54 + i * 0.32, 0.95 + j * 0.24, 0.165, 0.04, 0.04, 0.01, '#3a3a3a'); }
  } },
  elevator: { fp: null, b: (k) => {
    k.surf('metal'); k.box(0, 1.25, 0, 2.0, 2.5, 0.1, '#5a5e64');
    k.surf('chrome'); k.box(-0.42, 1.1, 0.06, 0.82, 2.2, 0.02, '#c8ccd0'); k.box(0.42, 1.1, 0.06, 0.82, 2.2, 0.02, '#c8ccd0');
    k.box(0, 2.4, 0.07, 0.6, 0.12, 0.01, '#ff9020', 0, 10);
    k.surf('plastic'); k.box(1.2, 1.2, 0.06, 0.12, 0.25, 0.02, '#2a2a2c'); k.sphere(1.2, 1.25, 0.08, 0.03, '#ffe080', 0, 10, 1, 1, 1, 1);
  } },
  waterCooler: { fp: [0.4, 0.4], b: (k) => {
    k.surf('plastic'); k.rbox(0, 0.5, 0, 0.35, 1.0, 0.35, 0.03, '#e8e8e8');
    k.surf('glass'); k.lathe(0, 1.0, 0, [[0.14, 0], [0.15, 0.3], [0.06, 0.4], [0.03, 0.45]], '#a8d0f0', 12);
  } },
  forklift: { fp: [1.2, 2.2], b: (k) => {
    k.surf('metal'); k.rbox(0, 0.6, -0.2, 1.1, 0.8, 1.6, 0.06, '#e8b020');
    k.box(0, 1.3, -0.5, 1.0, 0.08, 1.0, '#2a2a2a');
    for (const sx of [-0.45, 0.45]) k.cyl(sx, 1.0, -0.05, 0.03, 1.3, '#2a2a2a', 6), k.cyl(sx, 1.0, -0.95, 0.03, 1.3, '#2a2a2a', 6);
    k.box(0, 1.4, 0.6, 1.0, 2.6, 0.08, '#3a3a3a');
    for (const sx of [-0.3, 0.3]) k.box(sx, 0.08, 1.15, 0.12, 0.05, 1.1, '#3a3a3a');
    k.surf('rubber'); for (const sx of [-0.55, 0.55]) for (const sz of [0.35, -0.85]) k.cyl(sx, 0.25, sz, 0.25, 0.2, '#141414', 12, 0, 0, [0, 0, Math.PI / 2]);
  } },
  palletRack: { fp: [3, 1.1], b: (k) => {
    k.surf('metal'); for (const sx of [-1.45, 1.45]) for (const sz of [-0.5, 0.5]) k.box(sx, 2.25, sz, 0.08, 4.5, 0.08, '#2a5aa0');
    for (const y of [0.15, 1.6, 3.05]) { k.box(0, y, -0.5, 3, 0.1, 0.06, '#e07020'); k.box(0, y, 0.5, 3, 0.1, 0.06, '#e07020'); }
    k.surf('wood'); for (const y of [0.2, 1.65, 3.1]) for (let i = 0; i < 2; i++) { k.box(-0.7 + i * 1.4, y + 0.08, 0, 1.2, 0.12, 0.9, '#a88a5a'); k.surf('plastic'); k.rbox(-0.7 + i * 1.4, y + 0.6, 0, 1.1, 0.9, 0.85, 0.03, ['#b89a6a', '#c8aa7a', '#a88a5a'][(i + Math.floor(y)) % 3]); k.surf('wood'); }
  } },
  carLift: { fp: [2.6, 4.6], b: (k) => {
    k.surf('metal'); for (const sx of [-1.3, 1.3]) { k.box(sx, 1.4, -1.8, 0.3, 2.8, 0.3, '#c83020'); k.box(sx, 1.4, 1.8, 0.3, 2.8, 0.3, '#c83020'); }
    for (const sx of [-0.7, 0.7]) k.box(sx, 1.1, 0, 0.4, 0.12, 4.4, '#3a3a3c');
    k.surf('rubber'); k.cyl(1.6, 0.4, 2.2, 0.35, 0.25, '#141414', 14, 0, 0, [0, 0, Math.PI / 2]);
  } },
  toolChest: { fp: [1.1, 0.55], b: (k) => {
    k.surf('metal'); k.rbox(0, 0.55, 0, 1.1, 1.1, 0.55, 0.02, '#c82020');
    for (let i = 0; i < 6; i++) { k.box(0, 0.15 + i * 0.16, 0.278, 1.0, 0.004, 0.004, '#5a0a0a'); k.surf('chrome'); k.box(0, 0.22 + i * 0.16, 0.285, 0.5, 0.02, 0.02, '#c8c8c8'); k.surf('metal'); }
  } },
  train: { fp: null, b: (k) => {
    k.surf('metal'); k.rbox(0, 1.6, 0, 40, 3.0, 2.8, 0.25, '#c8ccd0');
    k.surf('glass'); for (let x = -18; x < 19; x += 3) k.box(x, 2.0, 1.41, 1.8, 1.0, 0.02, '#1a2a3a', 0, 7);
    k.surf('none'); k.box(0, 0.6, 1.41, 40, 0.25, 0.03, '#2e5e9e');
    for (let x = -16; x < 17; x += 8) { k.surf('glass'); k.box(x, 1.4, 1.42, 1.4, 2.2, 0.02, '#2a3a4a', 0, 7); }
  } },
};

// build (and cache) a furniture kit
export function piece(name, o = {}) {
  const key = name + JSON.stringify(o);
  let k = cache.get(key);
  if (!k) {
    k = new ModelKit();
    FURN[name].b(k, o);
    cache.set(key, k);
  }
  return k;
}
export function footprint(name) { return FURN[name] ? FURN[name].fp : null; }
void W;
