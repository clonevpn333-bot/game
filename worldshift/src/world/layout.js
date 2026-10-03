// City layout: district map, terrain, roads, lots. Everything here is
// deterministic and era-independent — the *same* geography exists in 1996,
// 2047 and 2189. Era realisation happens in buildings.js / chunk builder.
import { RNG, hash2i, fbm2, ridged2, clamp, smoothstep, lerp } from '../core/mathx.js';

export const CHUNK = 96;
export const GRID = 28;
export const HALF = (GRID * CHUNK) / 2; // 1344
export const WORLD_SEED = 1996;

// Legend:
// M mountain  F forest  W wealthy (Northridge)  S suburbs (Elm Park)
// D downtown  G galleria / midtown  A abandoned (Old Kessler)
// I industrial (The Yards)  B waterfront  P park  H highway corridor
// R river  ~ bay
const MAP = [
  'MMMMMMMMMMMMMMMMMMMMMMMMMMMM', // 0
  'MMMMMMMMMMMMMMMMMMRRMMMMMMMM', // 1
  'MMMMMMMFFHFFFFMMMMRRMMMMMMMM', // 2
  'MMMMMFFFFHFFFFFFFFRRFFFFFMMM', // 3
  'MMMMFFFFFHWWWWFFFFRRFFFFFFMM', // 4
  'MMMFFFFWWHWWWWWFFFRRFFFFFFFM', // 5
  'MMFFFFFWWHWWWWWWFFRRFFIIIFFM', // 6
  'MFFFFSSSSHWWWWWWBBRRIIIIIFFM', // 7
  'MFFFSSSSSHDDDDDDBBRRIIIIIIFM', // 8
  'MFFSSSSSSHDDDDDDBBRRIIIIIIFM', // 9
  'MFFSSSSSPHDDDDDDBBRRIIIIIIFM', // 10
  'MFFSSSSSSHDDDDDDBBRRIIIIIIFM', // 11
  'MFFSSSSSSHDPDDDDBBRRIIIIIIFM', // 12
  'MFFSSSSSSHDDDDDDBBRRIIIIIFFM', // 13
  'MFFSSSSSSHGGGGGGBBRRIIIIIFFM', // 14
  'MFFSSSSSSHGGGGGGPBRRIIIIFFFM', // 15
  'MFFAAAAAAHGGGGGPPBRRIIIFFFFM', // 16
  'MFFAAAAAAHAGGGPPPB~~~~FFFFFM', // 17
  'MFFFAAAAAHAAFFFFF~~~~~~~FFFM', // 18
  'MFFFFAAAAHFFFFFF~~~~~~~~~FFM', // 19
  'MFFFFFFFFHFFFFF~~~~~~~~~~~FM', // 20
  'MMFFFFFFFHFFFF~~~~~~~~~~~~MM', // 21
  'MMMFFFFFFHFFF~~~~~~~~~~~~~MM', // 22
  'MMMMFFFFFHFF~~~~~~~~~~~~~MMM', // 23
  'MMMMMFFFFHF~~~~~~~~~~~~~MMMM', // 24
  'MMMMMMFFFHFF~~~~~~~~~~~MMMMM', // 25
  'MMMMMMMMMMMMMMMMMMMMMMMMMMMM', // 26
  'MMMMMMMMMMMMMMMMMMMMMMMMMMMM', // 27
];
for (const row of MAP) if (row.length !== GRID) throw new Error('bad map row ' + row);

export const DISTRICT_NAMES = {
  M: 'Kessler Range', F: 'Greywood Forest', W: 'Northridge Heights', S: 'Elm Park', D: 'Downtown',
  G: 'Galleria District', A: 'Old Kessler', I: 'The Yards', B: 'Waterfront', P: 'Park',
  H: 'Route 9', R: 'Kessler River', '~': 'Halcyon Bay',
};
export const URBAN = new Set(['W', 'S', 'D', 'G', 'A', 'I', 'B', 'P', 'H']);

export function district(ci, cj) {
  if (ci < 0 || cj < 0 || ci >= GRID || cj >= GRID) return 'M';
  return MAP[cj][ci];
}
export function chunkOrigin(ci, cj) {
  return { x: -HALF + ci * CHUNK, z: -HALF + cj * CHUNK };
}
export function chunkCoord(x, z) {
  return { ci: Math.floor((x + HALF) / CHUNK), cj: Math.floor((z + HALF) / CHUNK) };
}
export function districtAt(x, z) {
  const c = chunkCoord(x, z);
  return district(c.ci, c.cj);
}
export const chunkKey = (ci, cj) => ci + ',' + cj;

// ------------------------------------------------------------- water -------
export const WATER_Y = [-2.4, -2.4, -1.2]; // the sea rose by 2189
export const RIVER_X0 = 392, RIVER_X1 = 568;
export const HIGHWAY_X = -432; // centre of the Route 9 trench (column 9)
export const TRENCH_HALF = 16;
export const TRENCH_Y = -7;

export function isRiverChunk(ci, cj) {
  const d = district(ci, cj);
  return d === 'R' || d === '~';
}

// ----------------------------------------------------------- terrain -------
// Natural terrain heights are cached on a 8 m grid; urban features are exact.
const TGRID = 8;
const TN = (HALF * 2) / TGRID + 1; // 337
let natural = null;

function naturalHeightRaw(x, z) {
  const ex = Math.abs(x) / HALF, ez = Math.abs(z) / HALF;
  const edge = Math.max(ex, ez);
  let h = (fbm2(x * 0.0045, z * 0.0045, 4, 7) - 0.45) * 46 * smoothstep(0.25, 0.6, edge);
  const m = smoothstep(0.72, 0.97, edge);
  h += m * (50 + 150 * ridged2(x * 0.0032 + 3.1, z * 0.0032 - 1.7, 5, 9));
  // Mount Kessler (radio tower peak)
  const dk = Math.hypot(x + 760, z + 1040);
  h += 210 * Math.exp(-(dk * dk) / (2 * 230 * 230));
  // Hills west of Elm Park (Site K bunker)
  const dh = Math.hypot(x + 1180, z + 250);
  h += 34 * Math.exp(-(dh * dh) / (2 * 120 * 120));
  return h;
}

// Distance (in chunks, fractional) from an urban chunk — computed once
let urbanField = null;
function buildUrbanField() {
  urbanField = new Float32Array(GRID * GRID);
  for (let cj = 0; cj < GRID; cj++) {
    for (let ci = 0; ci < GRID; ci++) {
      let best = 99;
      for (let j = -4; j <= 4; j++) {
        for (let i = -4; i <= 4; i++) {
          const d = district(ci + i, cj + j);
          const riverCity = d === 'R' && cj + j >= 7 && cj + j <= 17;
          if ((URBAN.has(d) && d !== 'H') || riverCity) best = Math.min(best, Math.hypot(i, j));
        }
      }
      urbanField[cj * GRID + ci] = best;
    }
  }
}

export function initTerrain() {
  buildUrbanField();
  natural = new Float32Array(TN * TN);
  for (let j = 0; j < TN; j++) {
    const z = -HALF + j * TGRID;
    for (let i = 0; i < TN; i++) {
      const x = -HALF + i * TGRID;
      natural[j * TN + i] = naturalHeightRaw(x, z);
    }
  }
  buildHighwayProfile();
}

function sampleNatural(x, z) {
  const fx = clamp((x + HALF) / TGRID, 0, TN - 1.001);
  const fz = clamp((z + HALF) / TGRID, 0, TN - 1.001);
  const i = Math.floor(fx), j = Math.floor(fz);
  const tx = fx - i, tz = fz - j;
  const a = natural[j * TN + i], b = natural[j * TN + i + 1];
  const c = natural[(j + 1) * TN + i], d = natural[(j + 1) * TN + i + 1];
  return lerp(lerp(a, b, tx), lerp(c, d, tx), tz);
}

// smooth "urbanness": 1 inside city, fading over ~1.5 chunks outside
function urbanWeight(x, z) {
  const fx = (x + HALF) / CHUNK - 0.5, fz = (z + HALF) / CHUNK - 0.5;
  const i = Math.floor(fx), j = Math.floor(fz);
  const tx = fx - i, tz = fz - j;
  const g = (ci, cj) => {
    if (ci < 0 || cj < 0 || ci >= GRID || cj >= GRID) return 99;
    return urbanField[cj * GRID + ci];
  };
  const d = lerp(lerp(g(i, j), g(i + 1, j), tx), lerp(g(i, j + 1), g(i + 1, j + 1), tx), tz);
  return 1 - smoothstep(0.35, 1.6, d);
}

// Wealthy hills slope gently upward to the north
function cityLevel(x, z) {
  return smoothstep(-560, -980, z) * 26;
}

// River channel (natural meander outside the city, straight quays inside)
export function riverCenter(z) {
  const inCity = smoothstep(-850, -700, z) * (1 - smoothstep(560, 700, z));
  const meander = Math.sin(z * 0.004) * 60 + Math.sin(z * 0.011) * 15;
  return 480 + meander * (1 - inCity);
}
export function riverHalfWidth(z) {
  return 88 - (1 - smoothstep(-1100, -800, z)) * 30;
}

function heightNoHighway(x, z) {
  let h;
  const uw = urbanWeight(x, z);
  if (uw >= 0.999) h = cityLevel(x, z);
  else if (uw <= 0.001) h = sampleNatural(x, z);
  else h = lerp(sampleNatural(x, z), cityLevel(x, z), uw);

  // River channel (straight quays in the city, natural banks outside)
  const rc = riverCenter(z);
  const rhw = riverHalfWidth(z);
  const dr = Math.abs(x - rc);
  if (dr < rhw + 40) {
    const inCityQuay = z > -700 && z < 600;
    if (inCityQuay) {
      if (x > RIVER_X0 && x < RIVER_X1) h = -9 - smoothstep(0, 30, Math.min(x - RIVER_X0, RIVER_X1 - x)) * 2;
    } else {
      const k = smoothstep(rhw + 30, rhw - 10, dr);
      h = lerp(h, -9, k);
    }
  }
  const bay = bayDepth(x, z);
  if (bay > 0) h = lerp(h, -12, bay);
  return h;
}

// Route 9 vertical profile: smoothed terrain outside the city, trench inside
const HW_STEP = 8;
const HW_N = (HALF * 2) / HW_STEP + 1;
let hwProfile = null;
export function trenchFactor(z) {
  return smoothstep(-650, -560, z) * (1 - smoothstep(480, 570, z));
}
function buildHighwayProfile() {
  const raw = new Float32Array(HW_N);
  for (let i = 0; i < HW_N; i++) raw[i] = Math.max(heightNoHighway(HIGHWAY_X, -HALF + i * HW_STEP), 0);
  hwProfile = new Float32Array(HW_N);
  const R = 12;
  for (let i = 0; i < HW_N; i++) {
    let s = 0, n = 0;
    for (let k = -R; k <= R; k++) {
      const j = Math.min(HW_N - 1, Math.max(0, i + k));
      s += raw[j]; n++;
    }
    const z = -HALF + i * HW_STEP;
    hwProfile[i] = lerp(s / n, TRENCH_Y, trenchFactor(z));
  }
}
export function highwayRoadY(z) {
  if (!hwProfile) return 0;
  const f = clamp((z + HALF) / HW_STEP, 0, HW_N - 1.001);
  const i = Math.floor(f);
  return lerp(hwProfile[i], hwProfile[i + 1], f - i);
}

export function terrainHeight(x, z) {
  if (!natural) return 0;
  let h = heightNoHighway(x, z);
  const dxh = Math.abs(x - HIGHWAY_X);
  if (dxh < 64 && z > -1240 && z < 1240) {
    const ry = highwayRoadY(z);
    const tf = trenchFactor(z);
    if (dxh <= TRENCH_HALF) h = ry;
    else if (tf < 0.5) h = lerp(ry, h, smoothstep(TRENCH_HALF, 62, dxh));
  }
  return h;
}

export function bayDepth(x, z) {
  // fraction "in the bay" from the district map with soft shores
  const fx = (x + HALF) / CHUNK - 0.5, fz = (z + HALF) / CHUNK - 0.5;
  const i = Math.floor(fx), j = Math.floor(fz);
  const tx = fx - i, tz = fz - j;
  const g = (ci, cj) => (district(ci, cj) === '~' ? 1 : 0);
  const v = lerp(lerp(g(i, j), g(i + 1, j), tx), lerp(g(i, j + 1), g(i + 1, j + 1), tx), tz);
  const wob = (fbm2(x * 0.02, z * 0.02, 2, 33) - 0.5) * 0.5;
  return smoothstep(0.35, 0.75, v + wob);
}

export function isWater(x, z, era) {
  return terrainHeight(x, z) < WATER_Y[era] - 0.2;
}

// ------------------------------------------------------------- roads -------
// Each chunk owns half of every road along its four edges.
// Road classes and half-widths (carriageway half, sidewalk width)
export const ROAD = {
  none: { half: 0, carriage: 0, walk: 0 },
  avenue: { half: 10, carriage: 6.5, walk: 3.5 },
  street: { half: 8, carriage: 4.6, walk: 3.4 },
};
const AVENUE_D = new Set(['D', 'G', 'I', 'B']);

export function edgeRoad(ci, cj, side) {
  // side: 0 north (-z), 1 east (+x), 2 south (+z), 3 west (-x)
  const a = district(ci, cj);
  const ni = ci + (side === 1 ? 1 : side === 3 ? -1 : 0);
  const nj = cj + (side === 2 ? 1 : side === 0 ? -1 : 0);
  const b = district(ni, nj);
  const water = (d) => d === 'R' || d === '~';
  if (water(a) || water(b)) return 'none';
  const ua = URBAN.has(a), ub = URBAN.has(b);
  if (!ua && !ub) return 'none';
  if (!ua || !ub) {
    // city edge: keep a perimeter road only for real city districts
    const u = ua ? a : b;
    if (u === 'H') return 'none';
    return 'street';
  }
  // highway corridor: its north/south edges carry the trench, east/west carry frontage roads
  if (a === 'H' && b === 'H') return 'none';
  if (a === 'P' && b === 'P') return 'none';
  if (AVENUE_D.has(a) || AVENUE_D.has(b)) return 'avenue';
  return 'street';
}

export function chunkRoads(ci, cj) {
  return [0, 1, 2, 3].map((s) => edgeRoad(ci, cj, s));
}

// block rectangle inside a chunk (inside the sidewalks)
export function blockRect(ci, cj) {
  const o = chunkOrigin(ci, cj);
  const r = chunkRoads(ci, cj);
  return {
    x0: o.x + ROAD[r[3]].half,
    x1: o.x + CHUNK - ROAD[r[1]].half,
    z0: o.z + ROAD[r[0]].half,
    z1: o.z + CHUNK - ROAD[r[2]].half,
    roads: r,
  };
}

// --------------------------------------------------------- street names ----
const AVE_NAMES = ['Ashford', 'Birch', 'Calloway', 'Dunmore', 'Easton', 'Fulton', 'Grand', 'Harlan', 'Irving', 'Juniper',
  'Kessler', 'Lennox', 'Mercer', 'Norwood', 'Orchard', 'Pryor', 'Quarry', 'Ridley', 'Sterling', 'Tremont', 'Union',
  'Vance', 'Wexford', 'York', 'Alder', 'Bram', 'Crane', 'Delmar', 'Elgin'];
const ST_NAMES = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th', '13th', '14th',
  '15th', '16th', '17th', '18th', '19th', '20th', '21st', '22nd', '23rd', '24th', '25th', '26th', '27th', '28th', '29th'];
export function avenueName(lineI) { return AVE_NAMES[lineI % AVE_NAMES.length] + ' Ave'; }
export function streetName(lineJ) { return ST_NAMES[lineJ % ST_NAMES.length] + ' St'; }

export function nearestStreetName(x, z) {
  const li = Math.round((x + HALF) / CHUNK), lj = Math.round((z + HALF) / CHUNK);
  const dx = Math.abs(x - (-HALF + li * CHUNK)), dz = Math.abs(z - (-HALF + lj * CHUNK));
  return dx < dz ? avenueName(li) : streetName(lj);
}

// --------------------------------------------------------------- lots ------
// A lot is a rectangle within a block with a kind and seed. Lot identity is
// shared across eras — that's what makes the eras correspond.
export function lotsForChunk(ci, cj) {
  const d = district(ci, cj);
  const b = blockRect(ci, cj);
  const rng = new RNG(hash2i(ci, cj, WORLD_SEED));
  const lots = [];
  const add = (x0, z0, x1, z1, kind, extra = {}) => {
    lots.push({ id: lots.length, x0, z0, x1, z1, kind, seed: rng.int(1, 1e9), district: d, ci, cj, ...extra });
  };
  const W = b.x1 - b.x0, D = b.z1 - b.z0;
  if (W < 10 || D < 10) return lots;

  if (d === 'D' || d === 'B') {
    // split block into 2-4 lots
    const splitX = rng.chance(0.5);
    const parts = rng.weighted([[1, 1], [2, 4], [3, 3], [4, 2]]);
    if (parts === 4) {
      const mx = b.x0 + W * rng.range(0.4, 0.6), mz = b.z0 + D * rng.range(0.4, 0.6);
      add(b.x0, b.z0, mx, mz, 'tower');
      add(mx, b.z0, b.x1, mz, 'tower');
      add(b.x0, mz, mx, b.z1, 'tower');
      add(mx, mz, b.x1, b.z1, 'tower');
    } else {
      let cursor = splitX ? b.x0 : b.z0;
      const end = splitX ? b.x1 : b.z1;
      for (let p = 0; p < parts; p++) {
        const remaining = end - cursor;
        const w = p === parts - 1 ? remaining : remaining * rng.range(0.35, 0.65) * (parts - p > 2 ? 0.7 : 1);
        if (splitX) add(cursor, b.z0, cursor + w, b.z1, 'tower');
        else add(b.x0, cursor, b.x1, cursor + w, 'tower');
        cursor += w;
      }
    }
    if (d === 'B') for (const l of lots) l.kind = rng.chance(0.5) ? 'lowrise' : 'tower';
    // a few plazas / parking
    for (const l of lots) {
      if (rng.chance(0.08)) l.kind = 'plaza';
      else if (rng.chance(0.07)) l.kind = 'parking';
    }
  } else if (d === 'G') {
    const r = rng.next();
    if (r < 0.3) {
      add(b.x0, b.z0, b.x1, b.z1, 'mall');
    } else {
      // strip of shops along the north edge, parking behind
      const depth = D * rng.range(0.4, 0.55);
      const n = rng.int(3, 5);
      for (let i = 0; i < n; i++) {
        const x0 = b.x0 + (W / n) * i, x1 = b.x0 + (W / n) * (i + 1);
        add(x0, b.z0, x1, b.z0 + depth, rng.chance(0.25) ? 'tower' : 'shop');
      }
      add(b.x0, b.z0 + depth, b.x1, b.z1, rng.chance(0.6) ? 'parking' : 'lowrise');
    }
  } else if (d === 'S' || d === 'A' || d === 'W') {
    const big = d === 'W';
    const perSide = big ? 2 : 4;
    const depth = big ? D * 0.5 : Math.min(30, D * 0.42);
    // north & south rows face their streets
    for (let i = 0; i < perSide; i++) {
      const x0 = b.x0 + (W / perSide) * i, x1 = b.x0 + (W / perSide) * (i + 1);
      add(x0, b.z0, x1, b.z0 + depth, big ? 'mansion' : 'house', { face: 0 });
      add(x0, b.z1 - depth, x1, b.z1, big ? 'mansion' : 'house', { face: 2 });
    }
    if (!big) {
      // west & east short sides
      const midD = D - depth * 2;
      if (midD > 14) {
        add(b.x0, b.z0 + depth, b.x0 + 22, b.z1 - depth, 'house', { face: 3 });
        add(b.x1 - 22, b.z0 + depth, b.x1, b.z1 - depth, 'house', { face: 1 });
      }
    }
    if (d === 'A') {
      for (const l of lots) {
        if (rng.chance(0.3)) l.kind = 'lowrise';
        if (rng.chance(0.15)) l.kind = 'vacant';
        l.abandoned = true;
      }
    }
  } else if (d === 'I') {
    const r = rng.next();
    if (r < 0.45) {
      add(b.x0, b.z0, b.x1, b.z1, 'warehouse');
    } else {
      const mx = b.x0 + W * rng.range(0.45, 0.65);
      add(b.x0, b.z0, mx, b.z1, 'warehouse');
      add(mx, b.z0, b.x1, b.z1, rng.chance(0.5) ? 'yard' : 'warehouse');
    }
  } else if (d === 'P') {
    add(b.x0, b.z0, b.x1, b.z1, 'park');
  }
  return lots;
}

// Landmark registry: chunk key -> landmark id (custom generators override lots)
export const LANDMARKS = {
  home: { ci: 12, cj: 13, name: 'Calloway Block' },
  cityhall: { ci: 12, cj: 10, name: 'City Hall' },
  halvorsen: { ci: 14, cj: 11, name: 'Halvorsen Site' },
  galleria: { ci: 12, cj: 15, name: 'Riverside Galleria' },
  watertower: { ci: 22, cj: 10, name: 'Yards Water Tower' },
  kessler_lot: { ci: 6, cj: 17, name: 'Kessler Commons' },
  radio: { ci: 6, cj: 2, name: 'KXRS Radio Tower' },
  bunker: { ci: 1, cj: 11, name: 'Site K' },
  quinn: { ci: 16, cj: 12, name: 'Pier 9' },
};
const landmarkByChunk = new Map();
for (const [id, l] of Object.entries(LANDMARKS)) landmarkByChunk.set(chunkKey(l.ci, l.cj), id);
export function landmarkAt(ci, cj) {
  return landmarkByChunk.get(chunkKey(ci, cj)) || null;
}
export function landmarkCenter(id) {
  const l = LANDMARKS[id];
  const o = chunkOrigin(l.ci, l.cj);
  return { x: o.x + CHUNK / 2, z: o.z + CHUNK / 2 };
}

// Bridges across the river (edge rows) — z of road centreline
export const BRIDGES = {
  kessler: { z: -HALF + 12 * CHUNK, name: 'Kessler Bridge' },   // z = -192
  rail: { z: -HALF + 9 * CHUNK, name: 'Yards Rail Bridge' },     // z = -480
  skyway: { z: -HALF + 15 * CHUNK, name: 'Halcyon Skyway' },     // z = 96
};
