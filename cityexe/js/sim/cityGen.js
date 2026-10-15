// Procedural generation of the one polished city: road grid, river + bridges,
// elevated ring expressway with interchanges, districts, lots and buildings.
import { C, nodeX, nodeZ, districtCode, DISTRICTS, BRIDGE_ROWS } from './config.js';
import { RoadNetwork } from './roads.js';
import { RNG } from '../core/rng.js';
import { STREETS_NS, STREETS_EW, genAptName, genTowerName } from '../core/names.js';
import { quadBezierPoints, smoothstep } from '../core/math.js';

const INSET = C.CURB + C.SIDEWALK_W; // 9.5 from road centerline to buildable edge

export function hasH(i, j) { // horizontal segment (i,j)-(i+1,j)
  if (i < 0 || i >= C.NB || j < 0 || j > C.NB) return false;
  if (i === 2 && !BRIDGE_ROWS.includes(j)) return false;
  if ((i === 7 || i === 8) && j === 5) return false;
  return true;
}
export function hasV(i, j) { // vertical segment (i,j)-(i,j+1)
  if (i < 0 || i > C.NB || j < 0 || j >= C.NB) return false;
  if (i === 8 && (j === 4 || j === 5)) return false;
  return true;
}

// Civic / special building placement: block -> spec
const SPECIAL = {
  '6,2': { half: 'N', civic: 'police', name: 'Central Police HQ' },
  '1,7': { half: 'N', civic: 'police', name: 'Westpoint Precinct' },
  '7,6': { half: 'N', civic: 'fire', name: 'Fire Station 1' },
  '0,2': { half: 'S', civic: 'fire', name: 'Fire Station 2' },
  '4,6': { full: true, civic: 'hospital', name: 'St. Aurelia General Hospital' },
  '5,4': { full: true, civic: 'cityhall', name: 'City Hall' },
  '6,6': { full: true, civic: 'mall', name: 'Midtown Mall' },
  '6,0': { full: true, civic: 'busdepot', name: 'Metro Transit Depot' },
  '9,0': { full: true, civic: 'powerplant', name: 'Ironworks Power Station' },
  '8,1': { half: 'S', civic: 'utility', name: 'City Utilities Yard' },
  '7,0': { half: 'S', civic: 'construction', name: 'Hale Construction Yard' },
  '9,1': { half: 'N', civic: 'towyard', name: 'Ironside Towing & Salvage' },
  '7,1': { half: 'N', civic: 'taxi', name: 'Checker Cab Co.' },
  '5,3': { tower: 'news', name: 'Channel 6 Tower' },
  '4,3': { garage: true, name: 'Downtown Parking' },
  '6,5': { garage: true, name: 'Grand Ave Garage' },
  '5,5': { metro: true, name: 'Central Station' },
  '1,2': { metro: true, name: 'Old Town Station' },
  '7,8': { metro: true, name: 'Maple Heights Station' },
  '3,3': { hotel: true, name: 'Riverside Hotel' },
};
const SUBSTATIONS = { '1,4': 'W', '7,2': 'C', '8,0': 'I', '6,8': 'S' };
export const POWER_ZONES = {
  W: { name: 'West Grid', districts: ['O', 'SW'] },
  C: { name: 'Central Grid', districts: ['D', 'C', 'W', 'P'] },
  I: { name: 'Industrial Grid', districts: ['I', 'H'] },
  S: { name: 'South Grid', districts: ['SE'] },
};
export function zoneOfDistrict(code) {
  for (const k in POWER_ZONES) if (POWER_ZONES[k].districts.includes(code)) return k;
  return 'C';
}

const PALETTE = {
  brick: ['#8a4a36', '#7a3f30', '#9b5a3f', '#6e4a3a', '#a0644a', '#7d5246'],
  stucco: ['#d9cbb0', '#c9b79a', '#e0d4c0', '#b8c4c0', '#d4b8a8', '#c8c0a8', '#a9b8c8'],
  concrete: ['#a8a8a4', '#9a9c9e', '#b4b0a8', '#8e9296', '#c0bcb4'],
  glass: ['#4c6a84', '#5a7a8a', '#3e5a70', '#6a8698', '#506c7c', '#2f4e66'],
  house: ['#e8e0cc', '#c9d6dc', '#d8c4a0', '#b8c8a8', '#e0c0b0', '#a8b8c8', '#f0e8d8', '#c8a888'],
  roof: ['#5a3a30', '#3a3a40', '#4a4038', '#6a4a3a', '#2e3a44'],
  warehouse: ['#8c8f88', '#7a8088', '#9a8a70', '#6a7a6a', '#8a7a6a'],
  pastel: ['#e8c8a0', '#9cc8c0', '#e0a890', '#c8b8e0', '#a8d0e8', '#f0d890', '#d8a8b8'],
};

export function generateCity(seed) {
  const rng = new RNG(seed);
  BID = 0;
  const net = new RoadNetwork();
  const grid = [];
  const city = { seed, net, grid, blocks: [], buildings: [], hRoad: [], vRoad: [], props: { trees: [], benches: [], lights: [], hydrants: [] }, districts: DISTRICTS, interchanges: [], substations: {}, special: {} };

  // ---------- grid nodes ----------
  const nodeExists = (i, j) => hasH(i, j) || hasH(i - 1, j) || hasV(i, j) || hasV(i, j - 1);
  for (let i = 0; i <= C.NB; i++) {
    grid[i] = [];
    city.hRoad[i] = []; city.vRoad[i] = [];
    for (let j = 0; j <= C.NB; j++) {
      if (!nodeExists(i, j)) { grid[i][j] = -1; continue; }
      let arms = 0;
      if (hasH(i, j)) arms++; if (hasH(i - 1, j)) arms++; if (hasV(i, j)) arms++; if (hasV(i, j - 1)) arms++;
      const adj = [districtCode(i - 1, j - 1), districtCode(i, j - 1), districtCode(i - 1, j), districtCode(i, j)].filter(Boolean);
      let control = 'stop';
      const busy = adj.some((d) => d === 'D' || d === 'C' || d === 'W');
      const bridgeEnd = (i === 2 || i === 3) && BRIDGE_ROWS.includes(j);
      if (arms >= 3 && (busy || bridgeEnd)) control = 'signal';
      else if (arms === 4 && adj.includes('O')) control = 'signal';
      else if (arms <= 2) control = 'pass';
      const d0 = adj.find((d) => d !== 'R') || adj[0];
      const n = net.addNode(nodeX(i), nodeZ(j), { kind: 'grid', control, gi: i, gj: j, trim: control === 'pass' ? 7 : 9, district: d0 });
      grid[i][j] = n.id;
    }
  }
  const roadSpeed = (codeA, codeB, isBridge) => {
    if (isBridge) return 14;
    const s = [codeA, codeB];
    if (s.includes('SE') || s.includes('SW')) return 11.5;
    if (s.includes('O')) return 12;
    return 13.5;
  };
  for (let j = 0; j <= C.NB; j++) for (let i = 0; i < C.NB; i++) {
    if (!hasH(i, j)) continue;
    const isBridge = i === 2;
    const r = net.addRoad(grid[i][j], grid[i + 1][j], { kind: isBridge ? 'bridge' : 'street', name: STREETS_EW[j], speed: roadSpeed(districtCode(i, j - 1), districtCode(i, j), isBridge), parking: !isBridge, blockL: [i, j - 1], blockR: [i, j] });
    r.gi = i; r.gj = j; r.dir = 'h';
    city.hRoad[i][j] = r.id;
  }
  for (let i = 0; i <= C.NB; i++) for (let j = 0; j < C.NB; j++) {
    if (!hasV(i, j)) continue;
    const r = net.addRoad(grid[i][j], grid[i][j + 1], { kind: 'street', name: STREETS_NS[i], speed: roadSpeed(districtCode(i - 1, j), districtCode(i, j), false), blockL: [i, j], blockR: [i - 1, j] });
    r.gi = i; r.gj = j; r.dir = 'v';
    city.vRoad[i][j] = r.id;
  }

  // ---------- ring expressway (one-way clockwise, elevated) ----------
  buildExpressway(city, net, grid);

  net.build();

  // ---------- blocks ----------
  for (let bz = 0; bz < C.NB; bz++) for (let bx = 0; bx < C.NB; bx++) {
    const code = districtCode(bx, bz);
    const X0 = nodeX(bx), Z0 = nodeZ(bz), X1 = nodeX(bx + 1), Z1 = nodeZ(bz + 1);
    const blk = {
      id: city.blocks.length, bx, bz, code, district: DISTRICTS[code].name,
      X0, Z0, X1, Z1, x0: X0 + INSET, z0: Z0 + INSET, x1: X1 - INSET, z1: Z1 - INSET,
      cx: (X0 + X1) / 2, cz: (Z0 + Z1) / 2,
      sides: {
        N: hasH(bx, bz) ? city.hRoad[bx][bz] : null,
        S: hasH(bx, bz + 1) ? city.hRoad[bx][bz + 1] : null,
        W: hasV(bx, bz) ? city.vRoad[bx][bz] : null,
        E: hasV(bx + 1, bz) ? city.vRoad[bx + 1][bz] : null,
      },
      buildings: [], water: code === 'R', park: code === 'P',
    };
    city.blocks.push(blk);
  }
  city.blockAt = (bx, bz) => (bx < 0 || bz < 0 || bx >= C.NB || bz >= C.NB ? null : city.blocks[bz * C.NB + bx]);

  for (const blk of city.blocks) layoutBlock(city, blk, rng);
  placeProps(city, rng);
  return city;
}

function buildExpressway(city, net, grid) {
  const E = C.HALF + C.HW_OFF, Y = C.HW_Y, R = 60, K = 70, RO = 2.5;
  const hw = (x, z, name) => net.addNode(x, z, { kind: 'hw', control: 'pass', trim: 3, y: Y, name });
  const D = { n: hw(-K, -E), e: hw(E, -K), s: hw(K, E), w: hw(-E, K) };
  const M = { n: hw(K, -E), e: hw(E, K), s: hw(-K, E), w: hw(-E, -K) };
  for (const k in M) M[k].control = 'merge';
  const flat = (pts) => pts.map(() => Y);
  const arc = (cx, cz, a0, a1, steps = 8) => {
    const out = [];
    for (let s = 0; s <= steps; s++) { const a = a0 + (a1 - a0) * (s / steps); out.push([cx + Math.cos(a) * R, cz + Math.sin(a) * R]); }
    return out;
  };
  const seg = (a, b, pts) => net.addRoad(a.id, b.id, { kind: 'highway', oneway: true, speed: 27, pts, ys: flat(pts), parking: false, name: 'Ring Expressway', width: 10 });
  // straight segments D->M on each side
  seg(D.n, M.n, [[-K, -E], [K, -E]]);
  seg(D.e, M.e, [[E, -K], [E, K]]);
  seg(D.s, M.s, [[K, E], [-K, E]]);
  seg(D.w, M.w, [[-E, K], [-E, -K]]);
  // corners M -> next D
  seg(M.n, D.e, [[K, -E], ...arc(E - R, -E + R, -Math.PI / 2, 0), [E, -K]]);
  seg(M.e, D.s, [[E, K], ...arc(E - R, E - R, 0, Math.PI / 2), [K, E]]);
  seg(M.s, D.w, [[-K, E], ...arc(-E + R, E - R, Math.PI / 2, Math.PI), [-E, K]]);
  seg(M.w, D.n, [[-E, -K], ...arc(-E + R, -E + R, Math.PI, Math.PI * 1.5), [-K, -E]]);

  const ramp = (from, to, p0, p1, p2, up) => {
    const pts = quadBezierPoints(p0, p1, p2, 14);
    const ys = pts.map((_, i) => { const t = i / (pts.length - 1); return Y * (up ? smoothstep(0, 1, t) : 1 - smoothstep(0, 1, t)); });
    return net.addRoad(from.id, to.id, { kind: 'ramp', oneway: true, speed: 15, pts, ys, parking: false, name: 'Expressway Ramp', width: 6 });
  };
  const G = (i, j) => net.nodes[grid[i][j]];
  const h = C.NB / 2;
  // North interchange at grid (5,0)
  const gn = G(h, 0), ge = G(C.NB, h), gs = G(h, C.NB), gw = G(0, h);
  ramp(D.n, gn, [-K, -E], [-RO, -E], [-RO, gn.z], false);
  ramp(gn, M.n, [RO, gn.z], [RO, -E], [K, -E], true);
  ramp(D.e, ge, [E, -K], [E, -RO], [ge.x, -RO], false);
  ramp(ge, M.e, [ge.x, RO], [E, RO], [E, K], true);
  ramp(D.s, gs, [K, E], [RO, E], [RO, gs.z], false);
  ramp(gs, M.s, [-RO, gs.z], [-RO, E], [-K, E], true);
  ramp(D.w, gw, [-E, K], [-E, RO], [gw.x, RO], false);
  ramp(gw, M.w, [gw.x, -RO], [-E, -RO], [-E, -K], true);
  for (const g of [gn, ge, gs, gw]) { g.control = 'signal'; g.noUturn = true; }
  city.interchanges = [gn.id, ge.id, gs.id, gw.id];
}

// ---------- block layout ----------
function sideInfo(city, blk, side) {
  // geometry of block side; returns road id, lane adjacent (right side is block), sidewalk line
  const roadId = blk.sides[side];
  if (roadId == null) return null;
  const net = city.net;
  const road = net.roads[roadId];
  // adjacent lane: lane whose right side faces the block
  let laneNear = null, laneFar = null;
  for (const lid of road.lanes) {
    const lane = net.links[lid];
    const a = net.nodes[lane.from], b = net.nodes[lane.to];
    const dx = Math.sign(b.x - a.x), dz = Math.sign(b.z - a.z);
    const rx = -dz, rz = dx; // right
    const toBlockX = blk.cx - (a.x + b.x) / 2, toBlockZ = blk.cz - (a.z + b.z) / 2;
    if (rx * toBlockX + rz * toBlockZ > 0) laneNear = lid; else laneFar = lid;
  }
  return { roadId, laneNear, laneFar };
}

function pickFront(blk, cx, cz, prefer) {
  // choose side facing a road, closest to building center
  const cands = [];
  const d = { N: cz - blk.z0, S: blk.z1 - cz, W: cx - blk.x0, E: blk.x1 - cx };
  for (const s of ['N', 'S', 'W', 'E']) if (blk.sides[s] != null) cands.push([s, d[s] + (prefer === s ? -100 : 0)]);
  cands.sort((a, b) => a[1] - b[1]);
  return cands.length ? cands[0][0] : null;
}

let BID = 0;
function addBuilding(city, blk, rect, spec, rng) {
  const cx = (rect.x0 + rect.x1) / 2, cz = (rect.z0 + rect.z1) / 2;
  const front = (spec.front && blk.sides[spec.front] != null) ? spec.front : pickFront(blk, cx, cz, spec.prefer);
  if (!front) return null;
  const si = sideInfo(city, blk, front);
  const w = rect.x1 - rect.x0, d = rect.z1 - rect.z0;
  let door, sw;
  const W = C.WALK_OFF;
  if (front === 'N') { door = [cx, rect.z0]; sw = [cx, blk.Z0 + W]; }
  if (front === 'S') { door = [cx, rect.z1]; sw = [cx, blk.Z1 - W]; }
  if (front === 'W') { door = [rect.x0, cz]; sw = [blk.X0 + W, cz]; }
  if (front === 'E') { door = [rect.x1, cz]; sw = [blk.X1 - W, cz]; }
  if (spec.doorOffset) { if (front === 'N' || front === 'S') { door[0] += spec.doorOffset; sw[0] += spec.doorOffset; } else { door[1] += spec.doorOffset; sw[1] += spec.doorOffset; } }
  const b = {
    id: BID++, block: blk.id, code: blk.code, district: blk.district,
    x: cx, z: cz, w, d, x0: rect.x0, z0: rect.z0, x1: rect.x1, z1: rect.z1,
    h: spec.h, floors: Math.max(1, Math.round(spec.h / 3.4)), kind: spec.kind, style: spec.style ?? 1,
    color: spec.color || '#aaaaaa', trim: spec.trim || '#333333', roof: spec.roof || 'flat', roofColor: spec.roofColor || '#444',
    front, door, sw, roadId: si.roadId, laneNear: si.laneNear, laneFar: si.laneFar,
    name: spec.name || '', bizType: spec.bizType || null, resUnits: spec.resUnits || 0, civic: spec.civic || null,
    residents: [], bizId: null, occupants: new Set(), state: 'ok', damage: 0, fire: 0, burned: 0,
    zone: zoneOfDistrict(blk.code), powered: true, shop: !!spec.shop, garage: !!spec.garage, metro: !!spec.metro,
    parts: [], seed: rng.int(0, 1e6), rent: spec.rent || 30, value: spec.value || 100000, lit: spec.lit ?? 0.6,
    jobsOverride: spec.jobs || null, heli: !!spec.heli, anomaly: null, signColor: spec.signColor || null, built: 0,
  };
  buildParts(b, spec, rng);
  city.buildings.push(b);
  blk.buildings.push(b.id);
  return b;
}

function buildParts(b, spec, rng) {
  const P = b.parts;
  const box = (x0, z0, x1, z1, y0, y1, style, color, extra = {}) => P.push({ x: (x0 + x1) / 2, z: (z0 + z1) / 2, y: (y0 + y1) / 2, w: x1 - x0, d: z1 - z0, h: y1 - y0, style, color, ...extra });
  const { x0, z0, x1, z1, h } = b;
  switch (b.kind) {
    case 'tower': {
      const podium = spec.podium ?? 7;
      box(x0, z0, x1, z1, 0, podium, 8, spec.trim || '#3a3f48');
      const ins = 1.5;
      const set = h > 70 ? h * rng.range(0.62, 0.78) : h;
      box(x0 + ins, z0 + ins, x1 - ins, z1 - ins, podium, set, b.style, b.color);
      let top = set;
      if (set < h) {
        const i2 = Math.min((x1 - x0) * 0.18, (z1 - z0) * 0.18, 6) + ins;
        box(x0 + i2, z0 + i2, x1 - i2, z1 - i2, set, h, b.style, b.color);
        top = h;
        const i3 = i2 + 3;
        box(x0 + i3, z0 + i3, x1 - i3, z1 - i3, h, h + 4, 7, '#5a6068');
      } else {
        box(x0 + ins + 3, z0 + ins + 3, x1 - ins - 3, z1 - ins - 3, h, h + 3.5, 7, '#5a6068');
      }
      if (h > 100) P.push({ x: b.x, z: b.z, y: h + 14, w: 0.6, d: 0.6, h: 20, style: 7, color: '#c0c4c8', antenna: true });
      if (spec.heli) P.push({ x: b.x, z: b.z, y: top + 4.2, w: 14, d: 14, h: 0.4, style: 11, color: '#2a2e33' });
      break;
    }
    case 'midrise':
    case 'brick': {
      box(x0, z0, x1, z1, 0, h, b.style, b.color);
      box(x0 - 0.35, z0 - 0.35, x1 + 0.35, z1 + 0.35, h, h + 0.8, 7, b.trim);
      if (b.kind === 'brick') box(x0 - 0.2, z0 - 0.2, x1 + 0.2, z1 + 0.2, 4.3, 4.8, 7, b.trim);
      const n = rng.int(1, 3);
      for (let i = 0; i < n; i++) {
        const ux = rng.range(x0 + 3, x1 - 5), uz = rng.range(z0 + 3, z1 - 5);
        box(ux, uz, ux + rng.range(2, 3.5), uz + rng.range(1.5, 3), h + 0.8, h + rng.range(1.6, 2.6), 7, '#8a8e92');
      }
      if (rng.chance(0.25) && h > 9) { const tx = rng.range(x0 + 4, x1 - 6), tz = rng.range(z0 + 4, z1 - 6); box(tx, tz, tx + 2.6, tz + 2.6, h + 0.8, h + 5.5, 7, '#6a5040', { tank: true }); }
      break;
    }
    case 'house': {
      box(x0, z0, x1, z1, 0, h, 4, b.color);
      P.push({ x: b.x, z: b.z, y: h, w: x1 - x0 + 0.8, d: z1 - z0 + 0.8, h: spec.roofH || 3, style: 12, color: b.roofColor, gable: (b.front === 'N' || b.front === 'S') ? 'x' : 'z' });
      if (rng.chance(0.6)) { const cx = rng.range(x0 + 1, x1 - 2), cz = rng.range(z0 + 1, z1 - 2); box(cx, cz, cx + 0.9, cz + 0.9, h, h + 3.6, 7, '#7a5a4a'); }
      break;
    }
    case 'warehouse': {
      box(x0, z0, x1, z1, 0, h, 5, b.color);
      const n = Math.max(1, Math.floor((x1 - x0) / 12));
      for (let i = 0; i < n; i++) { const vx = x0 + 4 + i * 12; box(vx, b.z - 1, vx + 2, b.z + 1, h, h + 1.2, 7, '#9a9a96'); }
      if (spec.stack) { P.push({ x: x1 - 5, z: z0 + 5, y: h + 9, w: 2.4, d: 2.4, h: 18, style: 10, color: '#7a6a5a', stack: true }); }
      break;
    }
    case 'civic': {
      box(x0, z0, x1, z1, 0, h, b.style, b.color);
      box(x0 - 0.4, z0 - 0.4, x1 + 0.4, z1 + 0.4, h, h + 1, 7, b.trim);
      if (b.civic === 'cityhall') {
        const cx = b.x, cz = b.z;
        box(cx - 9, cz - 9, cx + 9, cz + 9, h + 1, h + 8, 6, b.color);
        box(cx - 6, cz - 6, cx + 6, cz + 6, h + 8, h + 14, 6, '#d8d0b8');
        P.push({ x: cx, z: cz, y: h + 17, w: 1, d: 1, h: 6, style: 7, color: '#c8b070', antenna: true });
      }
      if (b.civic === 'hospital') {
        box(x0 + 6, z0 + 6, x1 - 6, z1 - 20, h, h + 14, 6, b.color);
        P.push({ x: b.x, z: b.z + 8, y: h + 1.2, w: 14, d: 14, h: 0.4, style: 11, color: '#2a2e33' });
      }
      if (b.civic === 'powerplant') {
        P.push({ x: x0 + 10, z: z0 + 10, y: h + 16, w: 3.4, d: 3.4, h: 32, style: 10, color: '#8a7e72', stack: true });
        P.push({ x: x0 + 18, z: z0 + 10, y: h + 16, w: 3.4, d: 3.4, h: 32, style: 10, color: '#8a7e72', stack: true });
        P.push({ x: x1 - 16, z: z1 - 16, y: 14, w: 22, d: 22, h: 28, style: 13, color: '#b8b4ac', cooling: true });
      }
      if (b.civic === 'mall') {
        box(x0 + 8, z0 + 8, x1 - 8, z1 - 8, h, h + 5, 8, '#4a6a80');
      }
      if (b.civic === 'fire' || b.civic === 'police') {
        box(x1 - 7, z0 + 2, x1 - 2, z0 + 7, h, h + 7, 7, b.trim);
      }
      break;
    }
    case 'garage': {
      box(x0, z0, x1, z1, 0, h, 9, b.color);
      box(x0 - 0.3, z0 - 0.3, x1 + 0.3, z1 + 0.3, h, h + 1.1, 7, '#8a8a86');
      break;
    }
    case 'metro': {
      box(x0, z0, x1, z1, 0, h, 8, b.color);
      box(x0 - 1, z0 - 1, x1 + 1, z1 + 1, h, h + 0.6, 7, '#2e5e9e');
      break;
    }
    case 'substation': {
      box(x0, z0, x1, z1, 0, 0.4, 7, '#6a6a66');
      for (let i = 0; i < 4; i++) { const tx = x0 + 4 + i * ((x1 - x0 - 8) / 3); box(tx - 1.2, b.z - 1.5, tx + 1.2, b.z + 1.5, 0.4, 3.6, 10, '#7a8088', { transformer: true }); }
      P.push({ x: b.x, z: b.z, y: 0.9, w: x1 - x0, d: z1 - z0, h: 1.8, style: 14, color: '#9a9a9a', fence: true });
      break;
    }
    default:
      box(x0, z0, x1, z1, 0, h, b.style, b.color);
  }
}

function lotsPerimeter(blk, nAlong, depth) {
  // returns rects around the block perimeter facing outward. N and S rows span full width; W/E fill between.
  const { x0, z0, x1, z1 } = blk;
  const W = x1 - x0;
  const out = [];
  const lw = W / nAlong;
  for (let i = 0; i < nAlong; i++) {
    out.push({ x0: x0 + i * lw, z0, x1: x0 + (i + 1) * lw, z1: z0 + depth, side: 'N' });
    out.push({ x0: x0 + i * lw, z0: z1 - depth, x1: x0 + (i + 1) * lw, z1, side: 'S' });
  }
  const midH = z1 - z0 - depth * 2;
  const nSide = Math.max(1, Math.round(midH / lw));
  const lh = midH / nSide;
  for (let i = 0; i < nSide; i++) {
    out.push({ x0, z0: z0 + depth + i * lh, x1: x0 + depth, z1: z0 + depth + (i + 1) * lh, side: 'W' });
    out.push({ x0: x1 - depth, z0: z0 + depth + i * lh, x1, z1: z0 + depth + (i + 1) * lh, side: 'E' });
  }
  return out;
}

function shrink(r, g) { return { x0: r.x0 + g, z0: r.z0 + g, x1: r.x1 - g, z1: r.z1 - g, side: r.side }; }

function pickBiz(rng, table) {
  const entries = Object.entries(table);
  const it = rng.weighted(entries, (e) => e[1]);
  return it[0] === 'none' ? null : it[0];
}

const BIZ_MIDTOWN = { grocery: 10, convenience: 10, restaurant: 16, cafe: 12, bar: 8, clothing: 10, electronics: 6, pharmacy: 6, gym: 4, autoshop: 3, office: 6, none: 16 };
const BIZ_OLDTOWN = { bar: 16, restaurant: 16, cafe: 12, grocery: 9, convenience: 9, clothing: 8, pharmacy: 5, autoshop: 4, none: 24 };
const BIZ_RIVER = { restaurant: 24, cafe: 18, bar: 12, clothing: 6, grocery: 6, none: 34 };

function layoutBlock(city, blk, rng) {
  const key = `${blk.bx},${blk.bz}`;
  const sp = SPECIAL[key];
  const code = blk.code;
  const sub = SUBSTATIONS[key];
  if (code === 'R' || code === 'P') return;

  const addSpecialHalf = (half) => {
    // civic building on half block
    let rect;
    const { x0, z0, x1, z1 } = blk;
    const mz = (z0 + z1) / 2;
    if (half === 'N') rect = { x0, z0, x1, z1: mz - 2 };
    else rect = { x0, z0: mz + 2, x1, z1 };
    return rect;
  };

  if (sp && (sp.full || sp.half)) {
    const civ = sp.civic;
    const specs = {
      police: { h: 12, style: 6, color: '#c8ccd4', trim: '#1f3a6a', signColor: '#2a5bd7' },
      fire: { h: 10, style: 6, color: '#b8463a', trim: '#e8e0d0', signColor: '#e04a2a' },
      hospital: { h: 26, style: 6, color: '#e8eaee', trim: '#b0b8c0', signColor: '#e03a3a' },
      cityhall: { h: 18, style: 6, color: '#ddd4bc', trim: '#a89870' },
      mall: { h: 16, style: 8, color: '#c8c0b0', trim: '#5a6470', signColor: '#d4a020' },
      busdepot: { h: 9, style: 5, color: '#5a7a9a', trim: '#2a3a4a' },
      powerplant: { h: 14, style: 10, color: '#8a8a84', trim: '#4a4a44' },
      utility: { h: 7, style: 5, color: '#c8a030', trim: '#4a4030' },
      construction: { h: 6, style: 5, color: '#d08a2a', trim: '#3a3a3a' },
      towyard: { h: 7, style: 5, color: '#6a6a70', trim: '#2a2a30' },
      taxi: { h: 8, style: 5, color: '#e0b020', trim: '#202020' },
    }[civ];
    const rect = sp.full ? { x0: blk.x0 + (civ === 'cityhall' ? 10 : 0), z0: blk.z0 + (civ === 'cityhall' ? 8 : 0), x1: blk.x1 - (civ === 'cityhall' ? 10 : 0), z1: blk.z1 - (civ === 'cityhall' ? 14 : 0) } : addSpecialHalf(sp.half);
    const b = addBuilding(city, blk, rect, { ...specs, kind: 'civic', civic: civ, name: sp.name, prefer: sp.half || (civ === 'cityhall' ? 'S' : null), rent: 0 }, rng);
    if (b) city.special[civ] = (city.special[civ] || []).concat(b.id);
    if (sp.half) {
      // fill other half with regular lots
      const other = sp.half === 'N' ? 'S' : 'N';
      const r2 = addSpecialHalf(other);
      const n = 3;
      const lw = (r2.x1 - r2.x0) / n;
      for (let i = 0; i < n; i++) {
        const rr = { x0: r2.x0 + i * lw + 1, x1: r2.x0 + (i + 1) * lw - 1, z0: r2.z0 + (other === 'S' ? 6 : 0), z1: r2.z1 - (other === 'N' ? 6 : 0) };
        regularLot(city, blk, rr, other, rng);
      }
    }
    if (sub) addSubstation(city, blk, sub, rng);
    return;
  }

  if (code === 'D') {
    const opts = sp || {};
    const distC = Math.hypot(blk.bx - 5, blk.bz - 4.5);
    const hmax = 150 - distC * 34;
    const { x0, z0, x1, z1 } = blk;
    const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    const quads = [
      { x0, z0, x1: mx - 2, z1: mz - 2, side: 'N' },
      { x0: mx + 2, z0, x1, z1: mz - 2, side: 'N' },
      { x0, z0: mz + 2, x1: mx - 2, z1, side: 'S' },
      { x0: mx + 2, z0: mz + 2, x1, z1, side: 'S' },
    ];
    if (opts.metro) {
      const q = quads.shift();
      addBuilding(city, blk, shrink(q, 8), { kind: 'metro', h: 5, style: 8, color: '#d0d4d8', name: opts.name, metro: true, prefer: 'N' }, rng);
      city.special.metro = (city.special.metro || []).concat(city.buildings[city.buildings.length - 1].id);
    }
    if (opts.garage) {
      const q = quads.shift();
      const g = addBuilding(city, blk, q, { kind: 'garage', h: 16, style: 9, color: '#a4a29c', name: opts.name, garage: true, prefer: q.side }, rng);
      city.special.garage = (city.special.garage || []).concat(g.id);
    }
    if (opts.tower === 'news' || rng.chance(0.35) && quads.length === 4) {
      // single big tower
      const r = shrink({ x0, z0, x1, z1 }, opts.tower ? 8 : 6);
      const tall = opts.tower ? 128 : Math.max(55, hmax + rng.range(-10, 20));
      const isRes = !opts.tower && rng.chance(0.3);
      const b = addBuilding(city, blk, r, { kind: 'tower', h: tall, style: rng.chance(0.6) ? 0 : 1, color: rng.pick(PALETTE.glass), trim: '#2c3036', name: opts.tower ? opts.name : genTowerName(rng), bizType: isRes ? null : 'office', resUnits: isRes ? rng.int(40, 70) : 0, heli: opts.tower === 'news', rent: 70, lit: 0.7, jobs: opts.tower === 'news' ? { news: 12 } : null }, rng);
      if (opts.tower === 'news') city.special.news = [b.id];
      return;
    }
    for (const q of quads) {
      const r = shrink(q, rng.range(1, 4));
      const tall = Math.max(24, hmax * rng.range(0.4, 0.95));
      const isRes = rng.chance(0.38);
      const isHotel = !isRes && rng.chance(0.08);
      addBuilding(city, blk, r, { kind: 'tower', h: tall, style: rng.chance(0.5) ? 0 : 1, color: rng.chance(0.5) ? rng.pick(PALETTE.glass) : rng.pick(PALETTE.concrete), name: isRes ? genAptName(rng, blk.district) : genTowerName(rng), bizType: isRes ? null : isHotel ? 'hotel' : 'office', resUnits: isRes ? Math.round(tall / 3.4) * 2 : 0, prefer: q.side, rent: 60 }, rng);
    }
    return;
  }

  if (code === 'C' || code === 'O' || code === 'W') {
    if (sp && sp.metro) {
      addBuilding(city, blk, { x0: blk.cx - 8, z0: blk.z0, x1: blk.cx + 8, z1: blk.z0 + 12 }, { kind: 'metro', h: 5, style: 8, color: '#d0d4d8', name: sp.name, metro: true, front: 'N' }, rng);
      city.special.metro = (city.special.metro || []).concat(city.buildings[city.buildings.length - 1].id);
    }
    if (sp && sp.hotel) {
      const b = addBuilding(city, blk, { x0: blk.x0, z0: blk.z0, x1: blk.x0 + 30, z1: blk.z1 }, { kind: 'tower', h: 42, style: 1, color: '#d8c8a8', trim: '#5a4a3a', name: sp.name, bizType: 'hotel', front: 'W', rent: 60 }, rng);
      for (const r of lotsPerimeter(blk, 3, 22)) if (r.x0 > blk.x0 + 31) regularLot(city, blk, shrink(r, 0.6), r.side, rng);
      return;
    }
    const n = code === 'O' ? 4 : 3;
    const depth = code === 'O' ? 18 : 21;
    for (const r of lotsPerimeter(blk, n, depth)) {
      if (sp && sp.metro && r.side === 'N' && r.x1 > blk.cx - 9 && r.x0 < blk.cx + 9) continue;
      if (sub && r.side === 'S' && r.x0 < blk.x0 + 1) { continue; }
      regularLot(city, blk, shrink(r, 0.6), r.side, rng);
    }
    if (sub) addSubstation(city, blk, sub, rng);
    return;
  }

  if (code === 'H' || code === 'I') {
    const { x0, z0, x1, z1 } = blk;
    const mz = (z0 + z1) / 2;
    const rects = [{ x0, z0, x1, z1: mz - 3, side: 'N' }, { x0, z0: mz + 3, x1, z1, side: 'S' }];
    for (const r of rects) {
      if (sub && r.side === 'S') { addSubstation(city, blk, sub, rng, r); continue; }
      const isFactory = code === 'I' && rng.chance(0.5);
      addBuilding(city, blk, shrink(r, 3), { kind: 'warehouse', h: rng.range(9, 15), color: rng.pick(PALETTE.warehouse), bizType: isFactory ? 'factory' : 'warehouse', stack: isFactory && rng.chance(0.7), prefer: r.side, name: '', rent: 20 }, rng);
    }
    return;
  }

  if (code === 'SE' || code === 'SW') {
    if (sp && sp.metro) {
      addBuilding(city, blk, { x0: blk.cx - 8, z0: blk.z0, x1: blk.cx + 8, z1: blk.z0 + 12 }, { kind: 'metro', h: 5, style: 8, color: '#d0d4d8', name: sp.name, metro: true, front: 'N' }, rng);
      city.special.metro = (city.special.metro || []).concat(city.buildings[city.buildings.length - 1].id);
    }
    const westpointApts = code === 'SW' && (blk.bz === 6 || blk.bz === 8) && blk.bx === 1;
    if (westpointApts) {
      const { x0, z0, x1, z1 } = blk;
      addBuilding(city, blk, { x0: x0 + 2, z0: z0 + 2, x1: x1 - 2, z1: z0 + 24 }, { kind: 'midrise', h: 17, style: 3, color: rng.pick(PALETTE.stucco), trim: '#5a5048', name: 'Westpoint Apartments', resUnits: 30, prefer: 'N', rent: 18 }, rng);
      addBuilding(city, blk, { x0: x0 + 2, z0: z1 - 24, x1: x1 - 2, z1: z1 - 2 }, { kind: 'midrise', h: 14, style: 3, color: rng.pick(PALETTE.stucco), trim: '#5a5048', name: genAptName(rng, 'Westpoint'), resUnits: 24, prefer: 'S', rent: 18 }, rng);
      return;
    }
    let corner = rng.chance(code === 'SE' ? 0.3 : 0.25);
    for (const r of lotsPerimeter(blk, 3, 23)) {
      if (sp && sp.metro && r.side === 'N' && r.x1 > blk.cx - 9 && r.x0 < blk.cx + 9) continue;
      if (sub && r.side === 'S' && r.x0 < blk.x0 + 1) { continue; }
      const lot = shrink(r, 0.5);
      if (corner && (r.side === 'N' || r.side === 'S')) {
        corner = false;
        const t = rng.pick(['convenience', 'cafe', 'grocery', 'gas', 'restaurant', 'pharmacy']);
        addBuilding(city, blk, shrink(lot, 2), { kind: 'midrise', h: t === 'gas' ? 5 : 7, style: t === 'gas' ? 8 : 3, color: rng.pick(PALETTE.pastel), trim: '#4a4a4a', bizType: t, shop: true, prefer: r.side, rent: 25 }, rng);
        continue;
      }
      // house set back from the street
      const W = lot.x1 - lot.x0, D = lot.z1 - lot.z0;
      const hw = Math.min(W - 6, 12), hd = Math.min(D - 8, 10);
      let hr;
      if (r.side === 'N') hr = { x0: lot.x0 + (W - hw) / 2, z0: lot.z0 + 6, x1: lot.x0 + (W + hw) / 2, z1: lot.z0 + 6 + hd };
      else if (r.side === 'S') hr = { x0: lot.x0 + (W - hw) / 2, z0: lot.z1 - 6 - hd, x1: lot.x0 + (W + hw) / 2, z1: lot.z1 - 6 };
      else if (r.side === 'W') hr = { x0: lot.x0 + 6, z0: lot.z0 + (D - hw) / 2, x1: lot.x0 + 6 + hd, z1: lot.z0 + (D + hw) / 2 };
      else hr = { x0: lot.x1 - 6 - hd, z0: lot.z0 + (D - hw) / 2, x1: lot.x1 - 6, z1: lot.z0 + (D + hw) / 2 };
      addBuilding(city, blk, hr, { kind: 'house', h: rng.chance(0.6) ? 6.2 : 3.6, color: rng.pick(PALETTE.house), roofColor: rng.pick(PALETTE.roof), roofH: rng.range(2.2, 3.4), resUnits: 1, prefer: r.side, front: r.side, rent: 22, lit: 0.5 }, rng);
      city.props.trees.push({ x: (lot.x0 + lot.x1) / 2 + rng.range(-3, 3), z: (lot.z0 + lot.z1) / 2 + rng.range(-3, 3), s: rng.range(0.8, 1.2), kind: 1 });
    }
    // backyard trees
    for (let k = 0; k < 4; k++) city.props.trees.push({ x: rng.range(blk.cx - 10, blk.cx + 10), z: rng.range(blk.cz - 10, blk.cz + 10), s: rng.range(0.9, 1.4), kind: rng.chance(0.3) ? 2 : 1 });
    if (sub) addSubstation(city, blk, sub, rng);
  }
}

function regularLot(city, blk, r, side, rng) {
  const code = blk.code;
  let bizType, kind, style, color, h, trim = '#3a3a3a';
  if (code === 'O') {
    bizType = pickBiz(rng, BIZ_OLDTOWN);
    kind = 'brick'; style = 2; color = rng.pick(PALETTE.brick); h = rng.int(3, 5) * 3.4 + 0.8; trim = '#d8ccb8';
  } else if (code === 'W') {
    bizType = pickBiz(rng, BIZ_RIVER);
    kind = 'midrise'; style = 3; color = rng.pick(PALETTE.pastel); h = rng.int(3, 6) * 3.4 + 0.8; trim = '#f0ece0';
  } else {
    bizType = pickBiz(rng, BIZ_MIDTOWN);
    kind = 'midrise'; style = rng.chance(0.5) ? 1 : 3; color = rng.chance(0.5) ? rng.pick(PALETTE.stucco) : rng.pick(PALETTE.concrete); h = rng.int(3, 7) * 3.4 + 0.8;
    if (rng.chance(0.25)) { kind = 'brick'; style = 2; color = rng.pick(PALETTE.brick); trim = '#d8ccb8'; }
  }
  const floors = Math.round(h / 3.4);
  const shop = !!bizType && bizType !== 'office';
  const resUnits = bizType === 'office' ? 0 : (floors - (shop ? 1 : 0)) * (r.x1 - r.x0 > 20 ? 3 : 2);
  addBuilding(city, blk, r, { kind, style, color, trim, h, bizType, shop, resUnits, prefer: side, front: blk.sides[side] != null ? side : undefined, rent: code === 'C' ? 35 : 28, name: resUnits > 6 && !bizType ? genAptName(rng, blk.district) : '' }, rng);
}

function addSubstation(city, blk, zone, rng, rect) {
  const r = rect ? shrink(rect, 6) : { x0: blk.x0 + 2, z0: blk.z1 - 18, x1: blk.x0 + 22, z1: blk.z1 - 2 };
  const b = addBuilding(city, blk, r, { kind: 'substation', h: 3, style: 7, color: '#6a6a66', name: `${zone === 'W' ? 'West' : zone === 'C' ? 'Central' : zone === 'I' ? 'Ironworks' : 'South'} Substation`, civic: 'substation', rent: 0 }, rng);
  if (b) { b.zoneFeeds = zone; city.substations[zone] = b.id; }
}

function placeProps(city, rng) {
  const { net } = city;
  // streetlights along both sides of grid streets
  for (const r of net.roads) {
    if (r.kind === 'highway' || r.kind === 'ramp') {
      const L = r.pts.length;
      continue;
    }
    const [ax, az] = r.pts[0], [bx, bz] = r.pts[r.pts.length - 1];
    const L = Math.hypot(bx - ax, bz - az);
    const dx = (bx - ax) / L, dz = (bz - az) / L;
    const nx = -dz, nz = dx;
    const off = C.CURB + 0.6;
    for (let s = 16; s < L - 12; s += 26) {
      for (const side of [1, -1]) {
        if ((s / 26 | 0) % 2 === (side > 0 ? 0 : 1)) {
          const x = ax + dx * s + nx * off * side, z = az + dz * s + nz * off * side;
          city.props.lights.push({ x, z, h: Math.atan2(-nx * side, -nz * side), road: r.id });
        }
      }
    }
    if (r.kind === 'street' && rng.chance(0.3)) {
      const s = rng.range(14, L - 14), side = rng.chance(0.5) ? 1 : -1;
      city.props.hydrants.push({ x: ax + dx * s + nx * (C.CURB + 0.5) * side, z: az + dz * s + nz * (C.CURB + 0.5) * side });
    }
  }
  // park: dense trees, benches, pond, zoo
  const parkBlocks = city.blocks.filter((b) => b.park);
  const px0 = Math.min(...parkBlocks.map((b) => b.x0)), px1 = Math.max(...parkBlocks.map((b) => b.x1));
  const pz0 = Math.min(...parkBlocks.map((b) => b.z0)), pz1 = Math.max(...parkBlocks.map((b) => b.z1));
  city.park = { x0: px0, z0: pz0, x1: px1, z1: pz1, pond: { x: (px0 + px1) / 2 - 18, z: (pz0 + pz1) / 2 + 12, r: 26 }, zoo: { x0: px1 - 52, z0: pz0 + 4, x1: px1 - 4, z1: pz0 + 46 } };
  const P = city.park;
  for (let k = 0; k < 170; k++) {
    const x = rng.range(px0 + 2, px1 - 2), z = rng.range(pz0 + 2, pz1 - 2);
    if (Math.hypot(x - P.pond.x, z - P.pond.z) < P.pond.r + 4) continue;
    if (x > P.zoo.x0 - 2 && x < P.zoo.x1 + 2 && z > P.zoo.z0 - 2 && z < P.zoo.z1 + 2) continue;
    if (Math.abs(x - (px0 + px1) / 2) < 3 || Math.abs(z - (pz0 + pz1) / 2) < 3) continue; // main paths
    city.props.trees.push({ x, z, s: rng.range(0.9, 1.6), kind: rng.chance(0.25) ? 2 : 0 });
  }
  for (let k = 0; k < 18; k++) {
    const t = k / 18;
    const horiz = k % 2 === 0;
    const x = horiz ? px0 + 8 + t * (px1 - px0 - 16) : (px0 + px1) / 2 + 2.5;
    const z = horiz ? (pz0 + pz1) / 2 + 2.5 : pz0 + 8 + t * (pz1 - pz0 - 16);
    city.props.benches.push({ x, z, h: horiz ? Math.PI : -Math.PI / 2, park: true });
  }
  // street trees in downtown/midtown/riverside along sidewalks; riverside promenade trees
  for (const blk of city.blocks) {
    if (blk.code === 'R') {
      for (let z = blk.Z0 + 14; z < blk.Z1 - 10; z += 14) {
        city.props.trees.push({ x: blk.X0 + C.CURB + 1.0 + 1.6, z, s: 0.8, kind: 0, street: true });
        city.props.trees.push({ x: blk.X1 - C.CURB - 1.0 - 1.6, z: z + 7, s: 0.8, kind: 0, street: true });
      }
      continue;
    }
    if (!['D', 'C', 'W', 'SE', 'SW'].includes(blk.code)) continue;
    const spacing = blk.code === 'D' ? 18 : 22;
    for (const side of ['N', 'S', 'W', 'E']) {
      if (blk.sides[side] == null) continue;
      for (let t = 12; t < blk.X1 - blk.X0 - 12; t += spacing) {
        let x, z;
        const o = C.CURB + 1.0;
        if (side === 'N') { x = blk.X0 + t; z = blk.Z0 + o; }
        if (side === 'S') { x = blk.X0 + t; z = blk.Z1 - o; }
        if (side === 'W') { x = blk.X0 + o; z = blk.Z0 + t; }
        if (side === 'E') { x = blk.X1 - o; z = blk.Z0 + t; }
        if (rng.chance(blk.code === 'D' ? 0.7 : 0.5)) city.props.trees.push({ x, z, s: rng.range(0.6, 0.8), kind: 0, street: true });
      }
    }
    if (blk.code === 'D' && rng.chance(0.5)) city.props.benches.push({ x: blk.cx, z: blk.Z0 + C.CURB + 2.4, h: 0 });
  }
  // city hall plaza
  const ch = city.special.cityhall && city.buildings[city.special.cityhall[0]];
  if (ch) {
    for (let k = -2; k <= 2; k++) city.props.trees.push({ x: ch.x + k * 10, z: ch.z1 + 7, s: 0.8, kind: 0 });
    city.props.benches.push({ x: ch.x - 6, z: ch.z1 + 4, h: 0 }, { x: ch.x + 6, z: ch.z1 + 4, h: 0 });
  }
}
