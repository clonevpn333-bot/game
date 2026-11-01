// GETAWAY! — infrastructure: streets, intersections, bridges, elevated highway, harbor tunnel, rail line
import * as THREE from 'three';
import { HR, CURB, RIVER, BRIDGES_Z, TUNNEL, HWY, MIDRAMP, RAIL_Z, SEA_X, roadKind } from './layout.js';
import { hex3 } from './city.js';

export function buildInfrastructure(ctx) {
  const { S, B, graph } = ctx;
  // ---- street segments ----
  const done = new Set();
  for (const e of graph.live) {
    if (e.tunnel || e.hwy) continue;
    const a = graph.nodes[e.a], b = graph.nodes[e.b]; const k = Math.min(e.a, e.b) + '-' + Math.max(e.a, e.b); if (done.has(k)) continue; done.add(k);
    if (a.y !== 0 || b.y !== 0) continue;
    const mat = e.kind === 'res' ? 'roadRes' : 'road';
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz); if (len < 20) continue;
    const ux = dx / len, uz = dz / len; const rx = -uz, rz = ux; // right of travel
    const s0 = (a.kind === 'isect' ? HR : 0), s1 = len - (b.kind === 'isect' ? HR : 0);
    const p = (s, side) => [a.x + ux * s + rx * HR * side, 0, a.z + uz * s + rz * HR * side];
    const v0 = s0 / 12, v1 = s1 / 12;
    B.quad(mat, [p(s0, -1), p(s0, 1), p(s1, 1), p(s1, -1)], [0, v0, 1, v0, 1, v1, 0, v1]);
    ctx.spawnRoads.push(e);
  }
  for (const n of graph.nodes) {
    if (n.kind !== 'isect' || n.out.length === 0) continue;
    B.quad('isect', [[n.x - HR, 0.002, n.z + HR], [n.x + HR, 0.002, n.z + HR], [n.x + HR, 0.002, n.z - HR], [n.x - HR, 0.002, n.z - HR]], [0, 0, 1, 0, 1, 1, 0, 1]);
    if (n.light) ctx.lights.push({ node: n.id, x: n.x, z: n.z });
  }
  // generic road surface collision (flat terrain covers this) ; bridges need decks
  for (const z of BRIDGES_Z) bridge(ctx, z, z === 0);
  riverWalls(ctx);
  highway(ctx);
  tunnel(ctx);
  rail(ctx);
}

function bridge(ctx, z, grand) {
  const { S, B } = ctx; const x0 = 300 + HR, x1 = 500 - HR;
  S.addBox(x0, -1.6, z - HR - 2.5, x1, 0, z + HR + 2.5, { mat: 'concrete', tag: 'bridge' });
  B.box('concrete', x0, -1.6, z - HR - 2.5, x1, -0.01, z + HR + 2.5, { tw: 6, faces: 'pz nz ny' });
  B.box('walk', x0, 0, z - HR - 2.5, x1, CURB, z - HR, { faces: 'py pz', topScale: 4 }); B.box('walk', x0, 0, z + HR, x1, CURB, z + HR + 2.5, { faces: 'py nz', topScale: 4 });
  S.addBox(x0, 0, z - HR - 2.5, x1, CURB, z - HR, { solid: false }); S.addBox(x0, 0, z + HR, x1, CURB, z + HR + 2.5, { solid: false });
  // railings as breakable props + solid end posts
  for (let x = x0 + 2; x < x1 - 1; x += 4) { ctx.prop('rail', x, z - HR - 2.3, 0, CURB); ctx.prop('rail', x, z + HR + 2.3, 0, CURB); }
  // piers
  for (const px of [RIVER.x0 + 14, (RIVER.x0 + RIVER.x1) / 2, RIVER.x1 - 14]) ctx.solid('concrete', px - 2, -6, z - 6, px + 2, -1.6, z + 6, { tw: 4 });
  if (grand) {
    for (const tx of [RIVER.x0 + 10, RIVER.x1 - 10]) for (const s of [-1, 1]) {
      const tz = z + s * (HR + 3.6); ctx.solid('concrete', tx - 1.6, -1.6, tz - 1.2, tx + 1.6, 46, tz + 1.2, { tw: 4, top: 'roof' });
      ctx.glowBox(0xff3030, tx - 0.4, 46, tz - 0.4, tx + 0.4, 46.8, tz + 0.4);
    }
    ctx.vbox(0x8a8f96, RIVER.x0 + 8, 40, z - HR - 4.8, RIVER.x1 - 8, 42, z + HR + 4.8, true);
    // suspension cables
    const cable = (ax, ay, bx, by, cz) => { const len = Math.hypot(bx - ax, by - ay); const g = new THREE.BoxGeometry(len, 0.25, 0.25); const m = new THREE.Matrix4().makeTranslation((ax + bx) / 2, (ay + by) / 2, cz).multiply(new THREE.Matrix4().makeRotationZ(Math.atan2(by - ay, bx - ax))); B.geom('vcMetal', g, m, { color: hex3(0xd8dce0) }); };
    for (const s of [-1, 1]) { const cz = z + s * (HR + 3.6); for (const tx of [RIVER.x0 + 10, RIVER.x1 - 10]) { cable(tx, 44, tx - 50, 0.5, cz); cable(tx, 44, tx + 50 * (tx < 400 ? 1 : -1) * 0.6 + 0, 0.5 + 6, cz); } cable(RIVER.x0 + 10, 43, RIVER.x1 - 10, 43, cz); for (let x = RIVER.x0 + 14; x < RIVER.x1 - 12; x += 6) ctx.vbox(0xd8dce0, x - 0.05, 0.3, cz - 0.05, x + 0.05, 43, cz + 0.05); }
  } else {
    for (let x = x0; x < x1; x += 12) { ctx.vbox(0x6d7378, x, -1.6, z - HR - 2.7, x + 0.6, 1.2, z - HR - 2.5, false, { metal: true }); ctx.vbox(0x6d7378, x, -1.6, z + HR + 2.5, x + 0.6, 1.2, z + HR + 2.7, false, { metal: true }); }
  }
}
function riverWalls(ctx) {
  const { B } = ctx;
  for (const x of [RIVER.x0, RIVER.x1]) {
    B.box('concrete', x - 0.6, -5.2, -1400, x + 0.6, CURB, 760, { tw: 6, faces: x === RIVER.x0 ? 'px' : 'nx' });
    // breakable railings along bank (skip road crossings at bridges / tunnel)
    for (let z = -790; z < 600; z += 4) {
      if (BRIDGES_Z.some((bz) => Math.abs(z - bz) < HR + 4)) continue; if (Math.abs(z + 550) < 14) continue; if (Math.abs(z + 650) < 12) continue;
      ctx.prop('rail', x + (x === RIVER.x0 ? -0.8 : 0.8), z, Math.PI / 2, CURB);
    }
  }
}
function highway(ctx) {
  const { S, B } = ctx; const z0 = HWY.z - HWY.half, z1 = HWY.z + HWY.half, y = HWY.y;
  const deck = (xa, xb) => {
    S.addBox(xa, y - 1.2, z0, xb, y, z1, { mat: 'concrete', tag: 'hwy' });
    B.quad('hwy', [[xa, y, z1], [xb, y, z1], [xb, y, z0], [xa, y, z0]], [1, xa / 12, 1, xb / 12, 0, xb / 12, 0, xa / 12]);
    B.box('concrete', xa, y - 1.2, z0, xb, y - 0.01, z1, { tw: 6, faces: 'pz nz ny' });
  };
  for (let x = HWY.x0; x < HWY.x1; x += 200) deck(x, Math.min(HWY.x1, x + 200));
  // jersey barriers with gaps for mid ramps
  const barrier = (xa, xb, zc) => { if (xb - xa < 1) return; S.addBox(xa, y, zc - 0.35, xb, y + 1.05, zc + 0.35, { mat: 'concrete' }); B.box('concrete', xa, y, zc - 0.35, xb, y + 1.05, zc + 0.35, { tw: 4 }); };
  const mr = MIDRAMP;
  barrier(HWY.x0, mr.s.x0 - 8, z1 - 0.35); barrier(mr.s.x0 + 46, HWY.x1, z1 - 0.35);
  barrier(HWY.x0, mr.n.x1 - 46, z0 + 0.35); barrier(mr.n.x1 + 8, HWY.x1, z0 + 0.35);
  // median
  for (let x = HWY.x0; x < HWY.x1; x += 200) { const xb = Math.min(HWY.x1, x + 200); S.addBox(x, y, HWY.z - 0.3, xb, y + 0.8, HWY.z + 0.3, { mat: 'concrete' }); B.box('concrete', x, y, HWY.z - 0.3, xb, y + 0.8, HWY.z + 0.3, { tw: 4 }); }
  // pillars avoiding streets
  const XSn = [-800, -700, -600, -500, -400, -300, -200, -100, 0, 100, 200, 300, 500, 600, 700];
  for (let x = HWY.x0 + 20; x < HWY.x1; x += 40) {
    if (XSn.some((rx) => Math.abs(rx - x) < 13)) continue; if (x > RIVER.x0 - 2 && x < RIVER.x1 + 2) continue;
    ctx.solid('concrete', x - 1.4, x > -800 ? 0 : -1, HWY.z - 1.4, x + 1.4, y - 1.2, HWY.z + 1.4, { tw: 4 });
    ctx.deco('concrete', x - 1.8, y - 2.2, z0 + 1, x + 1.8, y - 1.2, z1 - 1, { tw: 4 });
  }
  // lamp posts on median
  for (let x = HWY.x0 + 10; x < HWY.x1; x += 50) ctx.prop('hwylamp', x, HWY.z, 0, y + 0.8);
  // end ramps
  rampVisual(ctx, HWY.rampW0, z0, HWY.x0, z1, 'x', 0, y, 'hwy');
  rampVisual(ctx, HWY.x1, z0, HWY.rampE1 - HR, z1, 'x', y, 0, 'hwy');
  // mid ramps (south: off-ramp eastbound descending east; north: on-ramp ascending east)
  rampVisual(ctx, mr.s.x0, mr.s.z0, mr.s.x1, mr.s.z1, 'x', y, 0, 'road', true);
  rampVisual(ctx, mr.n.x0, mr.n.z0, mr.n.x1, mr.n.z1, 'x', 0, y, 'road', true);
  // overhead sign gantries
  for (const gx of [-600, 150]) {
    ctx.vbox(0x6d7378, gx - 0.3, y, z0 - 0.5, gx + 0.3, y + 8, z0 + 0.1, true, { metal: true }); ctx.vbox(0x6d7378, gx - 0.3, y, z1 - 0.1, gx + 0.3, y + 8, z1 + 0.5, true, { metal: true });
    ctx.vbox(0x6d7378, gx - 0.3, y + 7, z0, gx + 0.3, y + 7.6, z1, false, { metal: true });
    ctx.vbox(0x1e6b3a, gx - 0.45, y + 5.2, z0 + 1, gx - 0.35, y + 7, z1 - 1);
  }
  ctx.landmarks.highway = { z: HWY.z, y };
}
function rampVisual(ctx, xa, za, xb, zb, axis, h0, h1, mat, rails = false) {
  const { S, B } = ctx; S.addRamp(xa, za, xb, zb, axis, h0, h1, { tag: 'ramp' });
  B.quad(mat === 'hwy' ? 'hwy' : 'road', [[xa, h0 + 0.01, zb], [xb, h1 + 0.01, zb], [xb, h1 + 0.01, za], [xa, h0 + 0.01, za]], mat === 'hwy' ? [1, 0, 1, (xb - xa) / 12, 0, (xb - xa) / 12, 0, 0] : [1, 0, 1, (xb - xa) / 12, 0, (xb - xa) / 12, 0, 0]);
  // underside + side skirts
  B.quad('concrete', [[xa, Math.max(0, h0 - 1.2), za], [xb, Math.max(0, h1 - 1.2), za], [xb, Math.max(0, h1 - 1.2), zb], [xa, Math.max(0, h0 - 1.2), zb]], [0, 0, 4, 0, 4, 1, 0, 1], [0, -1, 0]);
  for (const zz of [za, zb]) { const s = zz === za ? -1 : 1; B.quad('concrete', s < 0 ? [[xb, Math.max(0, h1 - 1.2), zz], [xa, Math.max(0, h0 - 1.2), zz], [xa, h0 + 1.0, zz], [xb, h1 + 1.0, zz]] : [[xa, Math.max(0, h0 - 1.2), zz], [xb, Math.max(0, h1 - 1.2), zz], [xb, h1 + 1.0, zz], [xa, h0 + 1.0, zz]], [0, 0, (xb - xa) / 6, 0, (xb - xa) / 6, 0.5, 0, 0.5], [0, 0, s]); }
  // stepped collision walls along ramp edges
  const n = Math.ceil((xb - xa) / 5);
  for (let i = 0; i < n; i++) {
    const x0 = xa + i * 5, x1 = Math.min(xb, x0 + 5); const t = (x0 + x1) / 2; const h = h0 + (h1 - h0) * ((t - xa) / (xb - xa));
    if (h < 0.4) continue;
    for (const zz of [za, zb]) S.addBox(x0, Math.max(0.3, h - 1.6), zz - 0.3, x1, h + 1.0, zz + 0.3, { mat: 'concrete', surface: false });
    if (rails && h > 2.2 && i % 4 === 0) ctx.solid('concrete', t - 0.8, 0, (za + zb) / 2 - 0.8, t + 0.8, h - 1.2, (za + zb) / 2 + 0.8, { tw: 4 });
  }
}
function tunnel(ctx) {
  const { S, B } = ctx; const T = TUNNEL; const z0 = T.z - HR, z1 = T.z + HR;
  S.addRamp(T.x0, z0, T.rampW, z1, 'x', 0, T.floor, { tag: 'tunnel' }); S.addRamp(T.rampE, z0, T.x1, z1, 'x', T.floor, 0, { tag: 'tunnel' });
  S.addBox(T.rampW, T.floor - 1, z0, T.rampE, T.floor, z1, { mat: 'concrete', tag: 'tunnel' });
  // ramps render
  const rq = (xa, xb, ha, hb) => B.quad('road', [[xa, ha + 0.01, z1], [xb, hb + 0.01, z1], [xb, hb + 0.01, z0], [xa, ha + 0.01, z0]], [1, xa / 12, 1, xb / 12, 0, xb / 12, 0, xa / 12]);
  rq(T.x0, T.rampW, 0, T.floor); rq(T.rampE, T.x1, T.floor, 0); rq(T.rampW, T.rampE, T.floor, T.floor);
  // retaining walls along the whole cut
  for (const [zz, face] of [[z0, 'pz'], [z1, 'nz']]) {
    const zi = face === 'pz' ? zz - 0.6 : zz; const zo = face === 'pz' ? zz : zz + 0.6;
    S.addBox(T.x0, T.floor - 1, zi, T.x1, 0, zo, { mat: 'concrete', surface: false });
    B.box('tunnelWall', T.x0, T.floor - 1, zi, T.x1, 0.15, zo, { tw: 4, faces: face });
  }
  // guard rails on surface around open cuts
  for (const [xa, xb] of [[T.x0, T.rampW], [T.rampE, T.x1]]) for (const zz of [z0 - 0.4, z1 + 0.4]) { S.addBox(xa, 0, zz - 0.2, xb, 1.1, zz + 0.2, { mat: 'metal' }); ctx.vbox(0xb0b4b8, xa, 0.4, zz - 0.12, xb, 0.9, zz + 0.12, false, { metal: true }); for (let x = xa; x < xb; x += 4) ctx.vbox(0x8a8f96, x, 0, zz - 0.08, x + 0.15, 0.9, zz + 0.08); }
  // ceiling (also serves as ground above the tunnel)
  const ceil = (xa, xb, top) => { S.addBox(xa, T.ceil, z0 - 0.6, xb, top, z1 + 0.6, { mat: 'concrete', tag: 'tunnelRoof' }); B.box('tunnelWall', xa, T.ceil, z0, xb, T.ceil + 0.01, z1, { faces: 'ny', topScale: 6 }); };
  ceil(T.rampW, RIVER.x0, 0); ceil(RIVER.x0, RIVER.x1, RIVER.bed); ceil(RIVER.x1, T.rampE, 0);
  // portal headers
  for (const px of [T.rampW, T.rampE]) { B.box('concrete', px - 0.8, T.ceil, z0 - 1.5, px + 0.8, 0.6, z1 + 1.5, { tw: 4 }); ctx.sign(SIGN_IDX.telecom, px + (px === T.rampW ? -0.85 : 0.85), -2.5, T.z, 9, 1.6, px === T.rampW ? 'nx' : 'px'); }
  // lights strips
  for (let x = T.rampW; x < T.rampE; x += 8) { ctx.glowBox(0xffe6b0, x, T.ceil - 0.15, z0 + 0.2, x + 3.5, T.ceil - 0.05, z0 + 0.6); ctx.glowBox(0xffe6b0, x, T.ceil - 0.15, z1 - 0.6, x + 3.5, T.ceil - 0.05, z1 - 0.2); }
  for (let x = T.rampW + 20; x < T.rampE; x += 60) ctx.interiorLights.push({ x, y: T.ceil - 0.6, z: T.z, color: 0xffd9a0, intensity: 30, distance: 40 });
  ctx.landmarks.tunnel = { x0: T.rampW, x1: T.rampE, z: T.z, y: T.floor };
}
const SIGN_IDX = { telecom: 61 };
function rail(ctx) {
  const { S, B } = ctx; const z = RAIL_Z; const x0 = -1520, x1 = 770;
  // ballast + two tracks
  for (let x = x0; x < x1; x += 200) {
    const xb = Math.min(x1, x + 200);
    B.quad('dirt', [[x, 0.03, z + 10], [xb, 0.03, z + 10], [xb, 0.03, z - 10], [x, 0.03, z - 10]], [x / 6, 0, xb / 6, 0, xb / 6, 3, x / 6, 3]);
    for (const tz of [z - 4, z + 4]) B.quad('rails', [[x, 0.06, tz + 2], [xb, 0.06, tz + 2], [xb, 0.06, tz - 2], [x, 0.06, tz - 2]], [1, x / 8, 1, xb / 8, 0, xb / 8, 0, x / 8]);
  }
  S.addBox(x0, -0.5, z - 10, x1, 0.06, z + 10, { solid: false, mat: 'rails' });
  // rail bridge over river
  S.addBox(RIVER.x0 - 1, -1.4, z - 9, RIVER.x1 + 1, 0.06, z + 9, { mat: 'metal' }); B.box('steel', RIVER.x0 - 1, -1.4, z - 9, RIVER.x1 + 1, 0.0, z + 9, { faces: 'pz nz ny', tw: 4 });
  for (let x = RIVER.x0; x <= RIVER.x1; x += 10) { ctx.vbox(0x8c3b22, x - 0.3, 0, z - 9.4, x + 0.3, 5, z - 9.0, true, { metal: true }); ctx.vbox(0x8c3b22, x - 0.3, 0, z + 9.0, x + 0.3, 5, z + 9.4, true, { metal: true }); }
  ctx.vbox(0x8c3b22, RIVER.x0, 4.6, z - 9.4, RIVER.x1, 5.0, z - 9.0, false, { metal: true }); ctx.vbox(0x8c3b22, RIVER.x0, 4.6, z + 9.0, RIVER.x1, 5.0, z + 9.4, false, { metal: true });
  // level crossings: gates (animated by train system)
  ctx.crossings = [];
  for (const rx of [-800, -700, -600, -500, -400, -300, -200, -100, 0, 100, 200, 300, 500, 600, 700]) { ctx.crossings.push({ x: rx, z }); ctx.prop('xing', rx - HR - 1.5, z - 11, 0); ctx.prop('xing', rx + HR + 1.5, z + 11, Math.PI); }
  // west portal into the hills
  ctx.solid('concrete', x0 - 30, 0, z - 14, x0, 14, z - 9, { tw: 4, top: 'grass' }); ctx.solid('concrete', x0 - 30, 0, z + 9, x0, 14, z + 14, { tw: 4, top: 'grass' });
  ctx.solid('concrete', x0 - 30, 8, z - 9, x0, 14, z + 9, { tw: 4, top: 'grass' }); ctx.deco('vc', x0 - 29.5, 0, z - 9, x0 - 29, 8, z + 9, { color: [0.02, 0.02, 0.02] });
  ctx.solid('grass', x0 - 120, 0, z - 40, x0 - 30, 22, z + 40, { tw: 10, top: 'grass' });
  // buffer stop at port
  ctx.vbox(0xd4ac0d, x1 - 2, 0, z - 6, x1, 1.2, z - 2, true); ctx.vbox(0xd4ac0d, x1 - 2, 0, z + 2, x1, 1.2, z + 6, true);
  ctx.landmarks.rail = { z, x0, x1, tracks: [z - 4, z + 4] };
}
