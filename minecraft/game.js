// ============================================================================
//  BLOCKCRAFT — a clean, from-scratch single-file voxel sandbox
//  Focus: correct fundamentals (lighting, controls, meshing, textures).
// ============================================================================
import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CX = 16, CZ = 16, CY = 72, SEA = 30;
const RENDER_DIST = 6;
const UP = new THREE.Vector3(0, 1, 0);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const idx = (x, y, z) => x + z * CX + y * CX * CZ;
const CVOL = CX * CZ * CY;

// ---------------------------------------------------------------------------
// Seeded noise (value-noise fbm — deterministic, smooth)
// ---------------------------------------------------------------------------
function mulberry32(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function makeNoise(seed) {
  const p = new Uint8Array(512); const perm = new Uint8Array(256);
  const rnd = mulberry32(seed);
  for (let i = 0; i < 256; i++) perm[i] = i;
  for (let i = 255; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y) => { const u = (h & 1) ? x : -x; const v = (h & 2) ? y : -y; return u + v; };
  function noise2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    return lerp(lerp(grad(aa, x, y), grad(ba, x - 1, y), u), lerp(grad(ab, x, y - 1), grad(bb, x - 1, y - 1), u), v);
  }
  return {
    n2: noise2,
    fbm(x, y, oct = 4, lac = 2, gain = 0.5) {
      let s = 0, amp = 1, f = 1, norm = 0;
      for (let o = 0; o < oct; o++) { s += amp * noise2(x * f, y * f); norm += amp; amp *= gain; f *= lac; }
      return s / norm;
    },
  };
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------
const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, COBBLE: 4, SAND: 5, SANDSTONE: 6,
  WATER: 7, LOG: 8, LEAVES: 9, PLANKS: 10, GLASS: 11, SNOW: 12, GRAVEL: 13,
  COAL: 14, IRON: 15, GOLD: 16, DIAMOND: 17, BRICK: 18, BOOKSHELF: 19,
  PUMPKIN: 20, GLOWSTONE: 21, OBSIDIAN: 22, POPPY: 23, TALLGRASS: 24,
  SPRUCE_LOG: 25, SPRUCE_LEAVES: 26, CACTUS: 27, MOSSY: 28, WOOL: 29, ICE: 30,
};

// definition: faces -> tile names; flags
function def(o) { return Object.assign({ solid: true, opaque: true, light: 0, tint: null, render: 'cube' }, o); }
const BLOCKS = {
  [B.AIR]: def({ name: 'Air', solid: false, opaque: false }),
  [B.GRASS]: def({ name: 'Grass Block', top: 'grass_top', side: 'grass_side', bottom: 'dirt', tint: 'grass' }),
  [B.DIRT]: def({ name: 'Dirt', all: 'dirt' }),
  [B.STONE]: def({ name: 'Stone', all: 'stone' }),
  [B.COBBLE]: def({ name: 'Cobblestone', all: 'cobble' }),
  [B.SAND]: def({ name: 'Sand', all: 'sand' }),
  [B.SANDSTONE]: def({ name: 'Sandstone', top: 'sandstone_top', side: 'sandstone', bottom: 'sandstone' }),
  [B.WATER]: def({ name: 'Water', all: 'water', solid: false, opaque: false, render: 'water', tint: 'water' }),
  [B.LOG]: def({ name: 'Oak Log', top: 'log_top', side: 'log_side', bottom: 'log_top' }),
  [B.LEAVES]: def({ name: 'Oak Leaves', all: 'leaves', tint: 'foliage' }),
  [B.PLANKS]: def({ name: 'Oak Planks', all: 'planks' }),
  [B.GLASS]: def({ name: 'Glass', all: 'glass', opaque: false, render: 'glass' }),
  [B.SNOW]: def({ name: 'Snow Block', all: 'snow' }),
  [B.GRAVEL]: def({ name: 'Gravel', all: 'gravel' }),
  [B.COAL]: def({ name: 'Coal Ore', all: 'coal_ore' }),
  [B.IRON]: def({ name: 'Iron Ore', all: 'iron_ore' }),
  [B.GOLD]: def({ name: 'Gold Ore', all: 'gold_ore' }),
  [B.DIAMOND]: def({ name: 'Diamond Ore', all: 'diamond_ore' }),
  [B.BRICK]: def({ name: 'Bricks', all: 'brick' }),
  [B.BOOKSHELF]: def({ name: 'Bookshelf', top: 'planks', side: 'bookshelf', bottom: 'planks' }),
  [B.PUMPKIN]: def({ name: 'Pumpkin', top: 'pumpkin_top', side: 'pumpkin_side', bottom: 'pumpkin_top' }),
  [B.GLOWSTONE]: def({ name: 'Glowstone', all: 'glowstone', light: 15 }),
  [B.OBSIDIAN]: def({ name: 'Obsidian', all: 'obsidian' }),
  [B.POPPY]: def({ name: 'Poppy', all: 'poppy', solid: false, opaque: false, render: 'cross' }),
  [B.TALLGRASS]: def({ name: 'Grass', all: 'tallgrass', solid: false, opaque: false, render: 'cross', tint: 'grass' }),
  [B.SPRUCE_LOG]: def({ name: 'Spruce Log', top: 'log_top', side: 'spruce_side', bottom: 'log_top' }),
  [B.SPRUCE_LEAVES]: def({ name: 'Spruce Leaves', all: 'spruce_leaves', tint: 'foliage' }),
  [B.CACTUS]: def({ name: 'Cactus', top: 'cactus_top', side: 'cactus_side', bottom: 'cactus_top', opaque: false }),
  [B.MOSSY]: def({ name: 'Mossy Cobblestone', all: 'mossy' }),
  [B.WOOL]: def({ name: 'White Wool', all: 'wool' }),
  [B.ICE]: def({ name: 'Ice', all: 'ice', opaque: false, render: 'glass' }),
};
function blockDef(id) { return BLOCKS[id] || BLOCKS[B.AIR]; }
function texOf(d, face) {
  // face: 0 +x,1 -x,2 +y,3 -y,4 +z,5 -z
  if (d.all) return d.all;
  if (face === 2) return d.top || d.side;
  if (face === 3) return d.bottom || d.side;
  return d.side || d.top;
}
const HOTBAR_BLOCKS = [B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.PLANKS, B.LOG, B.LEAVES, B.SAND, B.GLASS];
const ALL_PLACEABLE = [B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.MOSSY, B.SAND, B.SANDSTONE, B.GRAVEL, B.PLANKS, B.LOG, B.SPRUCE_LOG, B.LEAVES, B.SPRUCE_LEAVES, B.GLASS, B.BRICK, B.BOOKSHELF, B.WOOL, B.SNOW, B.ICE, B.OBSIDIAN, B.GLOWSTONE, B.COAL, B.IRON, B.GOLD, B.DIAMOND, B.PUMPKIN, B.CACTUS, B.WATER, B.POPPY, B.TALLGRASS];

// ---------------------------------------------------------------------------
// Texture atlas (clean, low-noise pixel art)
// ---------------------------------------------------------------------------
const TILE = 16, COLS = 8;
function buildAtlas() {
  const names = ['grass_top', 'grass_side', 'dirt', 'stone', 'cobble', 'sand', 'sandstone_top', 'sandstone',
    'water', 'log_top', 'log_side', 'spruce_side', 'leaves', 'spruce_leaves', 'planks', 'glass', 'snow',
    'gravel', 'coal_ore', 'iron_ore', 'gold_ore', 'diamond_ore', 'brick', 'bookshelf', 'pumpkin_top',
    'pumpkin_side', 'glowstone', 'obsidian', 'poppy', 'tallgrass', 'cactus_top', 'cactus_side', 'mossy', 'wool', 'ice'];
  const rows = Math.ceil(names.length / COLS);
  const size = COLS * TILE;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = rows * TILE;
  const ctx = canvas.getContext('2d');
  const uv = new Map();
  names.forEach((name, i) => {
    const col = i % COLS, row = (i / COLS) | 0;
    const tile = paintTile(name);
    ctx.putImageData(tile, col * TILE, row * TILE);
    uv.set(name, [col * TILE / canvas.width, row * TILE / canvas.height, (col + 1) * TILE / canvas.width, (row + 1) * TILE / canvas.height]);
  });
  return { canvas, uv };
}
function paintTile(name) {
  const d = new Uint8ClampedArray(TILE * TILE * 4);
  const rng = mulberry32(hashStr(name));
  const set = (x, y, r, g, b, a = 255) => { if (x < 0 || y < 0 || x >= TILE || y >= TILE) return; const i = (y * TILE + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = a; };
  const fillN = (r, g, b, amt = 6) => { for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const v = (rng() - 0.5) * 2 * amt; set(x, y, r + v, g + v, b + v); } };
  const rect = (x0, y0, w, h, r, g, b, a = 255) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, r, g, b, a); };
  const clearA = () => { for (let i = 0; i < d.length; i++) d[i] = 0; };
  const speck = (n, dr, dg, db, base) => { for (let i = 0; i < n; i++) { const x = rng() * TILE | 0, y = rng() * TILE | 0; set(x, y, base[0] + dr, base[1] + dg, base[2] + db); } };
  switch (name) {
    case 'grass_top': { const g = [110, 150, 72]; fillN(...g, 7); speck(10, -14, -12, -10, g); speck(7, 14, 12, 8, g); break; }
    case 'grass_side': { fillN(124, 96, 66, 7); for (let x = 0; x < TILE; x++) { const h = 4 + ((Math.sin(x * 1.4) * 1.2 + (rng() * 2 | 0)) | 0); for (let y = 0; y < h; y++) { const v = (rng() - 0.5) * 14; set(x, y, 110 + v, 150 + v, 72 + v); } } break; }
    case 'dirt': { const c = [124, 96, 66]; fillN(...c, 8); speck(10, -16, -14, -12, c); break; }
    case 'stone': { fillN(128, 128, 130, 7); speck(6, -16, -16, -16, [128, 128, 130]); speck(4, 14, 14, 14, [128, 128, 130]); break; }
    case 'cobble': { fillN(120, 120, 122, 4); const stones = [[1, 1, 6, 6], [8, 1, 7, 5], [1, 8, 5, 7], [7, 7, 4, 4], [12, 7, 3, 8], [2, 13, 6, 2]]; for (const [x, y, w, h] of stones) { const v = (rng() - 0.5) * 26; rect(x, y, w, h, 122 + v, 122 + v, 124 + v); rect(x, y, w, 1, 150 + v, 150 + v, 152 + v); rect(x, y + h - 1, w, 1, 96 + v, 96 + v, 98 + v); } break; }
    case 'mossy': { for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) set(x, y, 110, 118, 96); const stones = [[1, 1, 6, 6], [8, 1, 7, 5], [1, 8, 5, 7], [7, 7, 4, 4], [12, 7, 3, 8]]; for (const [x, y, w, h] of stones) { const v = (rng() - 0.5) * 24; const moss = rng() < 0.5; const c = moss ? [78, 110, 60] : [122, 122, 124]; rect(x, y, w, h, c[0] + v, c[1] + v, c[2] + v); } break; }
    case 'sand': fillN(221, 209, 165, 6); break;
    case 'sandstone_top': fillN(224, 212, 168, 5); break;
    case 'sandstone': { fillN(219, 207, 161, 5); rect(0, 0, TILE, 2, 206, 194, 150); rect(0, 13, TILE, 3, 200, 188, 146); break; }
    case 'water': { fillN(54, 96, 190, 8); for (let x = 0; x < TILE; x++) { const y = ((Math.sin(x * 0.8) * 1.4) + 5) | 0; set(x, y, 96, 140, 220); } break; }
    case 'ice': { fillN(150, 188, 232, 8); for (let i = 0; i < 5; i++) { const x = rng() * TILE | 0; for (let y = 0; y < TILE; y++) set(x, y, 180, 212, 245); } break; }
    case 'log_top': { const c = [150, 118, 78]; for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const dx = x - 7.5, dy = y - 7.5; const dist = Math.sqrt(dx * dx + dy * dy); const ring = Math.sin(dist * 1.6) * 0.5 + 0.5; const v = ring * 16 - 8; set(x, y, c[0] + v, c[1] + v, c[2] + v); } for (let i = 0; i < TILE; i++) { set(i, 0, 96, 74, 46); set(i, 15, 96, 74, 46); set(0, i, 96, 74, 46); set(15, i, 96, 74, 46); } break; }
    case 'log_side': { fillN(104, 80, 50, 5); for (let x = 0; x < TILE; x++) { if (x % 5 === 0) for (let y = 0; y < TILE; y++) set(x, y, 80, 60, 36); if (x % 5 === 2) for (let y = 0; y < TILE; y++) set(x, y, 120, 94, 60); } break; }
    case 'spruce_side': { fillN(72, 52, 34, 5); for (let x = 0; x < TILE; x++) if (x % 4 === 0) for (let y = 0; y < TILE; y++) set(x, y, 54, 38, 24); break; }
    case 'leaves': paintLeaves(set, rng, [62, 102, 44]); break;
    case 'spruce_leaves': paintLeaves(set, rng, [48, 78, 52]); break;
    case 'planks': { const c = [165, 130, 82]; fillN(...c, 5); for (let y = 0; y < TILE; y += 4) rect(0, y, TILE, 1, c[0] - 30, c[1] - 30, c[2] - 30); for (let i = 0; i < 8; i++) set(rng() * TILE | 0, rng() * TILE | 0, c[0] - 18, c[1] - 18, c[2] - 18); break; }
    case 'bookshelf': { const c = [165, 130, 82]; fillN(...c, 5); const cols = [[180, 60, 50], [60, 110, 180], [80, 160, 90], [200, 180, 80], [150, 90, 180]]; for (let s = 0; s < 2; s++) { const y = s * 7 + 1; rect(1, y, 14, 5, 70, 50, 30); for (let x = 1; x < 15; x += 2) { const cc = cols[rng() * cols.length | 0]; rect(x, y, 1, 5, cc[0], cc[1], cc[2]); } } break; }
    case 'glass': { clearA(); for (let i = 0; i < TILE; i++) { set(i, 0, 235, 245, 250, 180); set(i, 15, 205, 222, 232, 150); set(0, i, 235, 245, 250, 160); set(15, i, 205, 222, 232, 150); } set(3, 3, 255, 255, 255, 200); set(4, 3, 255, 255, 255, 120); set(3, 4, 255, 255, 255, 120); break; }
    case 'snow': fillN(238, 246, 248, 5); break;
    case 'gravel': { const c = [126, 121, 118]; fillN(...c, 6); for (let i = 0; i < 22; i++) { const v = (rng() - 0.5) * 50; set(rng() * TILE | 0, rng() * TILE | 0, c[0] + v, c[1] + v, c[2] + v); } break; }
    case 'coal_ore': paintOre(set, rng, [42, 42, 46]); break;
    case 'iron_ore': paintOre(set, rng, [200, 162, 130]); break;
    case 'gold_ore': paintOre(set, rng, [238, 205, 90]); break;
    case 'diamond_ore': paintOre(set, rng, [110, 224, 220]); break;
    case 'brick': { const m = [120, 70, 60]; rect(0, 0, TILE, TILE, m[0], m[1], m[2]); for (let row = 0; row < 4; row++) { const off = (row % 2) * 4; for (let col = -1; col < 4; col++) { const x = col * 8 + off + 1, y = row * 4 + 1; const v = (rng() - 0.5) * 12; rect(x, y, 6, 3, 158 + v, 96 + v, 82 + v); } } break; }
    case 'pumpkin_top': { fillN(206, 142, 40, 6); rect(6, 1, 4, 2, 120, 90, 30); break; }
    case 'pumpkin_side': { fillN(212, 142, 36, 6); for (let x = 2; x < TILE; x += 4) for (let y = 0; y < TILE; y++) set(x, y, 172, 112, 28); break; }
    case 'glowstone': { fillN(176, 138, 84, 8); for (let i = 0; i < 10; i++) set(rng() * TILE | 0, rng() * TILE | 0, 255, 238, 158); break; }
    case 'obsidian': { fillN(24, 20, 34, 6); for (let i = 0; i < 8; i++) set(rng() * TILE | 0, rng() * TILE | 0, 60, 44, 86); break; }
    case 'cactus_top': { fillN(86, 124, 60, 5); rect(5, 5, 6, 6, 64, 102, 50); break; }
    case 'cactus_side': { fillN(86, 124, 60, 6); for (let y = 0; y < TILE; y++) { set(0, y, 50, 84, 44); set(15, y, 50, 84, 44); } for (let i = 0; i < 5; i++) set(2 + (rng() * 12 | 0), rng() * TILE | 0, 210, 210, 170); break; }
    case 'wool': fillN(236, 236, 236, 5); break;
    case 'poppy': { clearA(); for (let y = 6; y < TILE; y++) set(8, y, 40, 120, 40); rect(6, 3, 4, 4, 210, 44, 44); set(7, 4, 255, 220, 60); break; }
    case 'tallgrass': { clearA(); for (let x = 3; x < 13; x++) { const h = 6 + (rng() * 7 | 0); for (let y = 15; y > 15 - h; y--) { const v = (rng() - 0.5) * 26; set(x, y, 92 + v, 150 + v, 58 + v); } } break; }
    default: fillN(200, 60, 200, 0); break;
  }
  return new ImageData(d, TILE, TILE);
}
function paintLeaves(set, rng, c) {
  const dk = [c[0] - 18, c[1] - 18, c[2] - 18], lt = [c[0] + 14, c[1] + 14, c[2] + 14];
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) {
    const r = rng(); let base = c; if (r < 0.24) base = dk; else if (r > 0.82) base = lt;
    const v = (rng() - 0.5) * 8; set(x, y, base[0] + v, base[1] + v, base[2] + v, 255);
  }
}
function paintOre(set, rng, ore) {
  // stone base
  for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const v = (rng() - 0.5) * 12; set(x, y, 128 + v, 128 + v, 130 + v); }
  const spots = 5 + (rng() * 3 | 0);
  for (let s = 0; s < spots; s++) {
    const cx = 2 + (rng() * 12 | 0), cy = 2 + (rng() * 12 | 0), rad = 1 + (rng() * 1.3 | 0);
    for (let y = -rad; y <= rad; y++) for (let x = -rad; x <= rad; x++) if (x * x + y * y <= rad * rad + 0.6) { const v = (rng() - 0.5) * 24; set(cx + x, cy + y, ore[0] + v, ore[1] + v, ore[2] + v); }
  }
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

// ---------------------------------------------------------------------------
// Biome tints (gentle multipliers over already-colored textures)
// ---------------------------------------------------------------------------
const TINTS = {
  grass: { plains: [0.95, 1.02, 0.72], forest: [0.86, 0.98, 0.70], desert: [0.92, 0.90, 0.62], snow: [0.86, 0.95, 0.86] },
  foliage: { plains: [0.86, 0.98, 0.66], forest: [0.78, 0.94, 0.62], desert: [0.82, 0.88, 0.58], snow: [0.80, 0.92, 0.80] },
  water: [0.42, 0.62, 1.0],
};

// ---------------------------------------------------------------------------
// World generation
// ---------------------------------------------------------------------------
class WorldGen {
  constructor(seed) {
    this.seed = seed >>> 0;
    this.height = makeNoise(this.seed + 1);
    this.temp = makeNoise(this.seed + 2);
    this.moist = makeNoise(this.seed + 3);
    this.tree = makeNoise(this.seed + 4);
    this.cache = new Map();
  }
  column(wx, wz) {
    const key = wx + ',' + wz;
    let c = this.cache.get(key);
    if (c) return c;
    const cont = this.height.fbm(wx * 0.006, wz * 0.006, 4);
    const hills = this.height.fbm(wx * 0.02 + 99, wz * 0.02, 3);
    let h = SEA + 4 + cont * 16 + hills * 6;
    const t = this.temp.fbm(wx * 0.004 + 11, wz * 0.004, 2);
    const m = this.moist.fbm(wx * 0.004, wz * 0.004 + 23, 2);
    let biome = 'plains';
    if (t > 0.35 && m < 0.0) biome = 'desert';
    else if (t < -0.3) biome = 'snow';
    else if (m > 0.15) biome = 'forest';
    h = Math.floor(clamp(h, 4, CY - 12));
    c = { h, biome, t, m };
    if (this.cache.size > 6000) this.cache.clear();
    this.cache.set(key, c);
    return c;
  }
  hash(x, y, z) { let h = (x * 374761393 + y * 668265263 + z * 2147483647 + this.seed * 13) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  generate(chunk) {
    const bx = chunk.cx * CX, bz = chunk.cz * CZ;
    const set = (x, y, z, id) => { if (y >= 0 && y < CY) chunk.blocks[idx(x, y, z)] = id; };
    for (let lz = 0; lz < CZ; lz++) for (let lx = 0; lx < CX; lx++) {
      const wx = bx + lx, wz = bz + lz;
      const col = this.column(wx, wz);
      const h = col.h, biome = col.biome;
      for (let y = 0; y <= h; y++) {
        let id = B.STONE;
        if (y === 0) id = B.OBSIDIAN;
        else if (y > h - 4) {
          if (biome === 'desert') id = (y === h) ? B.SAND : B.SANDSTONE;
          else if (y === h) id = (h <= SEA) ? (biome === 'snow' ? B.GRAVEL : B.SAND) : (biome === 'snow' ? B.SNOW : B.GRASS);
          else id = B.DIRT;
        }
        set(lx, y, lz, id);
      }
      // ores
      for (let y = 1; y < h - 1; y++) { if (chunk.blocks[idx(lx, y, lz)] !== B.STONE) continue; const r = this.hash(wx, y, wz); if (y < 14 && r > 0.992) set(lx, y, lz, B.DIAMOND); else if (y < 22 && r > 0.985) set(lx, y, lz, B.GOLD); else if (r > 0.965 && r < 0.978) set(lx, y, lz, B.IRON); else if (r > 0.93 && r < 0.95) set(lx, y, lz, B.COAL); }
      // water + beaches
      if (h < SEA) { for (let y = h + 1; y <= SEA; y++) set(lx, y, lz, B.WATER); if (biome === 'snow') set(lx, SEA, lz, B.ICE); }
    }
    this.decorate(chunk);
  }
  decorate(chunk) {
    const bx = chunk.cx * CX, bz = chunk.cz * CZ, M = 3;
    const put = (wx, wy, wz, id, mode) => {
      const lx = wx - bx, lz = wz - bz; if (lx < 0 || lz < 0 || lx >= CX || lz >= CZ || wy < 0 || wy >= CY) return;
      const i = idx(lx, wy, lz); const cur = chunk.blocks[i];
      if (mode === 'leaf') { if (cur === B.AIR) chunk.blocks[i] = id; }
      else chunk.blocks[i] = id;
    };
    // trees (with margin so canopies seam across chunks)
    for (let oz = -M; oz < CZ + M; oz++) for (let ox = -M; ox < CX + M; ox++) {
      const wx = bx + ox, wz = bz + oz; const col = this.column(wx, wz);
      if (col.h < SEA + 1 || col.biome === 'desert') continue;
      const density = col.biome === 'forest' ? 0.045 : 0.012;
      if (this.hash(wx, 7, wz) > density) continue;
      this.tree_(put, wx, col.h + 1, wz, col.biome);
    }
    // surface plants (within chunk)
    for (let lz = 0; lz < CZ; lz++) for (let lx = 0; lx < CX; lx++) {
      const wx = bx + lx, wz = bz + lz; const col = this.column(wx, wz);
      if (col.h < SEA + 1) continue;
      const top = chunk.blocks[idx(lx, col.h, lz)];
      const above = idx(lx, col.h + 1, lz);
      if (chunk.blocks[above] !== B.AIR) continue;
      const r = this.hash(wx, 31, wz);
      if (top === B.GRASS) { if (r < 0.02) chunk.blocks[above] = B.POPPY; else if (r < 0.22) chunk.blocks[above] = B.TALLGRASS; }
      else if (top === B.SAND && col.biome === 'desert' && r > 0.985) { const ch = 1 + (this.hash(wx, 5, wz) * 3 | 0); for (let k = 0; k < ch; k++) chunk.blocks[idx(lx, col.h + 1 + k, lz)] = B.CACTUS; }
    }
  }
  tree_(put, wx, wy, wz, biome) {
    const spruce = biome === 'snow' || biome === 'forest' && this.hash(wx, 3, wz) < 0.25;
    const log = spruce ? B.SPRUCE_LOG : B.LOG, leaf = spruce ? B.SPRUCE_LEAVES : B.LEAVES;
    const h = spruce ? 6 + (this.hash(wx, 1, wz) * 4 | 0) : 4 + (this.hash(wx, 1, wz) * 3 | 0);
    for (let i = 0; i < h; i++) put(wx, wy + i, wz, log, 'log');
    if (spruce) {
      let r = 2;
      for (let y = h - 1; y >= 2; y--) { const rr = ((h - y) % 2 === 0) ? r : r - 1; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (Math.abs(dx) + Math.abs(dz) > rr + 1) continue; if (dx === 0 && dz === 0 && y < h) continue; put(wx + dx, wy + y, wz + dz, leaf, 'leaf'); } if ((h - y) % 2 === 0) r = Math.min(r + 1, 3); }
      put(wx, wy + h, wz, leaf, 'leaf');
    } else {
      const top = wy + h;
      for (let dy = -2; dy <= -1; dy++) for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) { if (Math.abs(dx) === 2 && Math.abs(dz) === 2 && this.hash(wx + dx, dy, wz + dz) < 0.4) continue; put(wx + dx, top + dy, wz + dz, leaf, 'leaf'); }
      for (let dy = 0; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { if (Math.abs(dx) === 1 && Math.abs(dz) === 1 && dy === 1 && this.hash(wx + dx, dy + 9, wz + dz) < 0.5) continue; put(wx + dx, top + dy, wz + dz, leaf, 'leaf'); }
      put(wx, top + 2, wz, leaf, 'leaf');
    }
  }
  tintAt(wx, wz, kind) {
    if (kind === 'water') return TINTS.water;
    const biome = this.column(wx, wz).biome;
    return (TINTS[kind] && TINTS[kind][biome]) || [1, 1, 1];
  }
}

// ---------------------------------------------------------------------------
// Chunk + lighting + meshing
// ---------------------------------------------------------------------------
const FACES = [
  { dir: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], uA: 2, vA: 1, shade: 0.82 },
  { dir: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], uA: 2, vA: 1, shade: 0.82 },
  { dir: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], uA: 0, vA: 2, shade: 1.0 },
  { dir: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], uA: 0, vA: 2, shade: 0.55 },
  { dir: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], uA: 0, vA: 1, shade: 0.9 },
  { dir: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], uA: 0, vA: 1, shade: 0.7 },
];
const AXIS = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const AO_LV = [0.45, 0.65, 0.82, 1.0];

class Chunk {
  constructor(cx, cz) { this.cx = cx; this.cz = cz; this.blocks = new Uint8Array(CVOL); this.sky = new Uint8Array(CVOL); this.blk = new Uint8Array(CVOL); this.state = 'empty'; this.meshes = {}; }
  get(x, y, z) { if (y < 0 || y >= CY) return B.AIR; return this.blocks[idx(x, y, z)]; }
}

function computeLight(chunk) {
  const { blocks, sky, blk } = chunk; sky.fill(0); blk.fill(0);
  // vertical skylight
  for (let z = 0; z < CZ; z++) for (let x = 0; x < CX; x++) {
    let light = 15;
    for (let y = CY - 1; y >= 0; y--) { const i = idx(x, y, z); const id = blocks[i]; sky[i] = light; if (id !== B.AIR && blockDef(id).opaque) light = 0; else if (id !== B.AIR) light = Math.max(0, light - 1); }
  }
  // flood-fill skylight under overhangs/canopy
  const q = [];
  for (let i = 0; i < CVOL; i++) if (sky[i] > 1) q.push(i);
  floodLight(chunk, sky, q);
  // block light from emissive blocks
  const q2 = [];
  for (let i = 0; i < CVOL; i++) { const l = blockDef(blocks[i]).light; if (l > 0) { blk[i] = l; q2.push(i); } }
  floodLight(chunk, blk, q2);
}
function floodLight(chunk, arr, q) {
  const { blocks } = chunk; let head = 0;
  while (head < q.length) {
    const i = q[head++]; const level = arr[i]; if (level <= 1) continue;
    const y = (i / (CX * CZ)) | 0, rem = i - y * CX * CZ, z = (rem / CX) | 0, x = rem - z * CX;
    const nb = [[x + 1, y, z], [x - 1, y, z], [x, y + 1, z], [x, y - 1, z], [x, y, z + 1], [x, y, z - 1]];
    for (const [nx, ny, nz] of nb) {
      if (nx < 0 || nz < 0 || nx >= CX || nz >= CZ || ny < 0 || ny >= CY) continue;
      const ni = idx(nx, ny, nz); const id = blocks[ni];
      if (id !== B.AIR && blockDef(id).opaque) continue;
      if (level - 1 > arr[ni]) { arr[ni] = level - 1; q.push(ni); }
    }
  }
}

const MAT = { OPAQUE: 0, WATER: 1, GLASS: 2 };
function bucketOf(id) { const d = blockDef(id); if (d.render === 'water') return MAT.WATER; if (d.render === 'glass') return MAT.GLASS; return MAT.OPAQUE; }
function shouldDraw(self, n) {
  if (n === B.AIR) return true;
  const nd = blockDef(n), sd = blockDef(self);
  if (nd.opaque) return false;
  if (self === n && nd.render !== 'cross') return false; // merge same transparent (water/glass/leaves)
  if (sd.render === 'water' && nd.render === 'water') return false;
  return true;
}

function buildGeometry(chunk, world) {
  const bx = chunk.cx * CX, bz = chunk.cz * CZ;
  const out = { [MAT.OPAQUE]: buf(), [MAT.WATER]: buf(), [MAT.GLASS]: buf() };
  const wget = (x, y, z) => world.getBlock(bx + x, y, bz + z);
  const isOp = (x, y, z) => { const id = wget(x, y, z); return id !== B.AIR && blockDef(id).opaque; };
  for (let y = 0; y < CY; y++) for (let z = 0; z < CZ; z++) for (let x = 0; x < CX; x++) {
    const id = chunk.blocks[idx(x, y, z)]; if (id === B.AIR) continue;
    const d = blockDef(id); const wx = bx + x, wz = bz + z;
    if (d.render === 'cross') { emitCross(out[MAT.OPAQUE], x, y, z, wx, wz, d, world); continue; }
    const b = out[bucketOf(id)];
    for (let f = 0; f < 6; f++) {
      const dir = FACES[f].dir; const n = wget(x + dir[0], y + dir[1], z + dir[2]);
      if (!shouldDraw(id, n)) continue;
      emitFace(b, f, x, y, z, wx, wz, id, d, world, isOp);
    }
  }
  return out;
}
function buf() { return { pos: [], nor: [], uv: [], ao: [], sky: [], tint: [], idx: [], n: 0 }; }
function tintColor(d, wx, wz, world) { if (d.tint === 'grass') return world.tintAt(wx, wz, 'grass'); if (d.tint === 'foliage') return world.tintAt(wx, wz, 'foliage'); if (d.tint === 'water') return world.tintAt(wx, wz, 'water'); return [1, 1, 1]; }
function emitFace(b, f, x, y, z, wx, wz, id, d, world, isOp) {
  const face = FACES[f], dir = face.dir;
  const uvr = world.uv(texOf(d, f)); const tint = tintColor(d, wx, wz, world);
  const sky = world.getSky(wx + dir[0], y + dir[1], wz + dir[2]) / 15;
  const blk = world.getBlk(wx + dir[0], y + dir[1], wz + dir[2]) / 15;
  const slight = Math.max(sky, 0); // store sky; block light folded as floor via tint? keep separate via max in shader using blk baked into ao? -> fold blk into sky channel max
  const base = b.n;
  const dax = dir[0] !== 0 ? 0 : dir[1] !== 0 ? 1 : 2;
  const tan = [0, 1, 2].filter(a => a !== dax);
  const aoArr = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    const cor = face.corners[c];
    b.pos.push(x + cor[0], y + cor[1], z + cor[2]);
    b.nor.push(dir[0], dir[1], dir[2]);
    const su = cor[tan[0]] === 1 ? 1 : -1, sv = cor[tan[1]] === 1 ? 1 : -1;
    const a1 = AXIS[tan[0]], a2 = AXIS[tan[1]];
    const nx = x + dir[0], ny = y + dir[1], nz = z + dir[2];
    const s1 = isOp(nx + su * a1[0], ny + su * a1[1], nz + su * a1[2]) ? 1 : 0;
    const s2 = isOp(nx + sv * a2[0], ny + sv * a2[1], nz + sv * a2[2]) ? 1 : 0;
    const cc = isOp(nx + su * a1[0] + sv * a2[0], ny + su * a1[1] + sv * a2[1], nz + su * a1[2] + sv * a2[2]) ? 1 : 0;
    const aol = (s1 && s2) ? 0 : (3 - (s1 + s2 + cc));
    const aoB = AO_LV[aol] * face.shade; aoArr[c] = aoB;
    b.ao.push(aoB);
    const uu = cor[face.uA], vv = cor[face.vA];
    b.uv.push(uvr[0] + uu * (uvr[2] - uvr[0]), uvr[3] - vv * (uvr[3] - uvr[1]));
    b.sky.push(Math.max(slight, blk)); // combined light level for this face
    b.tint.push(tint[0], tint[1], tint[2]);
  }
  b.n += 4;
  if (aoArr[0] + aoArr[2] > aoArr[1] + aoArr[3]) b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  else b.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
}
function emitCross(b, x, y, z, wx, wz, d, world) {
  const uvr = world.uv(texOf(d, 0)); const tint = tintColor(d, wx, wz, world);
  const sky = world.getSky(wx, y, wz) / 15;
  const planes = [[[0.15, 0.15], [0.85, 0.85]], [[0.85, 0.15], [0.15, 0.85]]];
  for (const [a, c] of planes) {
    for (const flip of [0, 1]) {
      const base = b.n; const A = flip ? c : a, C = flip ? a : c;
      const pts = [[A[0], 0, A[1]], [A[0], 1, A[1]], [C[0], 1, C[1]], [C[0], 0, C[1]]];
      const uvc = [[uvr[0], uvr[3]], [uvr[0], uvr[1]], [uvr[2], uvr[1]], [uvr[2], uvr[3]]];
      for (let i = 0; i < 4; i++) { b.pos.push(x + pts[i][0], y + pts[i][1], z + pts[i][2]); b.nor.push(0, 1, 0); b.uv.push(uvc[i][0], uvc[i][1]); b.ao.push(0.95); b.sky.push(sky); b.tint.push(tint[0], tint[1], tint[2]); }
      b.n += 4; b.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
}

// ---------------------------------------------------------------------------
// World (streaming)
// ---------------------------------------------------------------------------
class World {
  constructor(scene, gen, materials, uv) { this.scene = scene; this.gen = gen; this.materials = materials; this.uvMap = uv; this.chunks = new Map(); this.group = new THREE.Group(); scene.add(this.group); this.genQ = []; this.meshQ = []; this.edits = {}; }
  key(cx, cz) { return cx + ',' + cz; }
  getC(cx, cz) { return this.chunks.get(this.key(cx, cz)); }
  getBlock(wx, wy, wz) { if (wy < 0 || wy >= CY) return B.AIR; const cx = Math.floor(wx / CX), cz = Math.floor(wz / CZ); const c = this.getC(cx, cz); if (!c || c.state === 'empty') return B.AIR; return c.blocks[idx(wx - cx * CX, wy, wz - cz * CZ)]; }
  getSky(wx, wy, wz) { if (wy >= CY) return 15; if (wy < 0) return 0; const cx = Math.floor(wx / CX), cz = Math.floor(wz / CZ); const c = this.getC(cx, cz); if (!c || c.state === 'empty') return 15; return c.sky[idx(wx - cx * CX, wy, wz - cz * CZ)]; }
  getBlk(wx, wy, wz) { if (wy < 0 || wy >= CY) return 0; const cx = Math.floor(wx / CX), cz = Math.floor(wz / CZ); const c = this.getC(cx, cz); if (!c || c.state === 'empty') return 0; return c.blk[idx(wx - cx * CX, wy, wz - cz * CZ)]; }
  uv(name) { return this.uvMap.get(name) || [0, 0, 1, 1]; }
  tintAt(wx, wz, kind) { return this.gen.tintAt(wx, wz, kind); }
  highestY(wx, wz) { for (let y = CY - 1; y >= 0; y--) { const id = this.getBlock(wx, y, wz); if (id !== B.AIR && blockDef(id).opaque) return y; } return 0; }
  isLoaded(wx, wz) { const c = this.getC(Math.floor(wx / CX), Math.floor(wz / CZ)); return c && c.state === 'meshed'; }

  setBlock(wx, wy, wz, id) {
    if (wy < 0 || wy >= CY) return; const cx = Math.floor(wx / CX), cz = Math.floor(wz / CZ); const c = this.getC(cx, cz); if (!c || c.state === 'empty') return;
    const lx = wx - cx * CX, lz = wz - cz * CZ; c.blocks[idx(lx, wy, lz)] = id;
    (this.edits[this.key(cx, cz)] || (this.edits[this.key(cx, cz)] = {}))[idx(lx, wy, lz)] = id;
    computeLight(c); this.remesh(cx, cz);
    if (lx === 0) this.relight(cx - 1, cz); if (lx === CX - 1) this.relight(cx + 1, cz);
    if (lz === 0) this.relight(cx, cz - 1); if (lz === CZ - 1) this.relight(cx, cz + 1);
    if (lx === 0) this.remesh(cx - 1, cz); if (lx === CX - 1) this.remesh(cx + 1, cz);
    if (lz === 0) this.remesh(cx, cz - 1); if (lz === CZ - 1) this.remesh(cx, cz + 1);
  }
  relight(cx, cz) { const c = this.getC(cx, cz); if (c && c.state !== 'empty') computeLight(c); }
  remesh(cx, cz) { const c = this.getC(cx, cz); if (c && c.state !== 'empty' && !c._q) { c._q = true; this.meshQ.unshift(c); } }

  update(px, pz) {
    const pcx = Math.floor(px / CX), pcz = Math.floor(pz / CZ);
    for (let dz = -RENDER_DIST; dz <= RENDER_DIST; dz++) for (let dx = -RENDER_DIST; dx <= RENDER_DIST; dx++) {
      if (dx * dx + dz * dz > (RENDER_DIST + 0.5) ** 2) continue;
      const cx = pcx + dx, cz = pcz + dz, k = this.key(cx, cz);
      if (!this.chunks.has(k)) { const c = new Chunk(cx, cz); this.chunks.set(k, c); this.genQ.push(c); }
    }
    this.genQ.sort((a, b) => ((a.cx - pcx) ** 2 + (a.cz - pcz) ** 2) - ((b.cx - pcx) ** 2 + (b.cz - pcz) ** 2));
    let g = 0;
    while (this.genQ.length && g < 2) { const c = this.genQ.shift(); if (c.state !== 'empty') continue; this.gen.generate(c); const e = this.edits[this.key(c.cx, c.cz)]; if (e) for (const i in e) c.blocks[i] = e[i]; computeLight(c); c.state = 'gen'; g++; this.tryMesh(c.cx, c.cz); this.tryMesh(c.cx + 1, c.cz); this.tryMesh(c.cx - 1, c.cz); this.tryMesh(c.cx, c.cz + 1); this.tryMesh(c.cx, c.cz - 1); }
    this.meshQ.sort((a, b) => ((a.cx - pcx) ** 2 + (a.cz - pcz) ** 2) - ((b.cx - pcx) ** 2 + (b.cz - pcz) ** 2));
    let m = 0;
    while (this.meshQ.length && m < 2) { const c = this.meshQ.shift(); c._q = false; if (c.state === 'empty') continue; this.mesh(c); m++; }
    const maxD = (RENDER_DIST + 2) ** 2;
    for (const [k, c] of this.chunks) if ((c.cx - pcx) ** 2 + (c.cz - pcz) ** 2 > maxD) this.unload(k, c);
  }
  tryMesh(cx, cz) { const c = this.getC(cx, cz); if (!c || c.state === 'empty') return; for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = this.getC(cx + dx, cz + dz); if (!n || n.state === 'empty') return; } if (!c._q) { c._q = true; this.meshQ.push(c); } }
  mesh(c) {
    const geo = buildGeometry(c, this);
    for (const bk of [MAT.OPAQUE, MAT.WATER, MAT.GLASS]) {
      const d = geo[bk]; const ex = c.meshes[bk];
      if (d.n === 0) { if (ex) { this.group.remove(ex); ex.geometry.dispose(); delete c.meshes[bk]; } continue; }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(d.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
      g.setAttribute('ao', new THREE.Float32BufferAttribute(d.ao, 1));
      g.setAttribute('skylight', new THREE.Float32BufferAttribute(d.sky, 1));
      g.setAttribute('tint', new THREE.Float32BufferAttribute(d.tint, 3));
      g.setIndex(d.idx); g.computeBoundingSphere();
      if (ex) { ex.geometry.dispose(); ex.geometry = g; }
      else { const mesh = new THREE.Mesh(g, this.materials[bk]); mesh.position.set(c.cx * CX, 0, c.cz * CZ); mesh.renderOrder = bk; c.meshes[bk] = mesh; this.group.add(mesh); }
    }
    c.state = 'meshed';
  }
  unload(k, c) { for (const bk in c.meshes) { this.group.remove(c.meshes[bk]); c.meshes[bk].geometry.dispose(); } c.meshes = {}; this.chunks.delete(k); }
}

// ---------------------------------------------------------------------------
// Materials (simple, predictable sRGB; baked light + AO + tint + fog)
// ---------------------------------------------------------------------------
function makeMaterials(tex, uniforms) {
  const vert = `
    attribute float ao; attribute float skylight; attribute vec3 tint;
    varying vec2 vUv; varying float vAo; varying float vSky; varying vec3 vTint; varying float vFog;
    uniform float uTime, uFogNear, uFogFar; uniform int uWave;
    void main(){
      vUv=uv; vAo=ao; vSky=skylight; vTint=tint;
      vec4 wp = modelMatrix * vec4(position,1.0);
      if (uWave==1 && normal.y>0.5) wp.y += sin(uTime*1.4 + wp.x*0.6 + wp.z*0.6)*0.05 - 0.08;
      vec4 mv = viewMatrix*wp; vFog = clamp((length(mv.xyz)-uFogNear)/(uFogFar-uFogNear),0.0,1.0);
      gl_Position = projectionMatrix*mv;
    }`;
  const frag = (mode) => `
    uniform sampler2D map; uniform float uDay, uAmbient; uniform vec3 uFog;
    varying vec2 vUv; varying float vAo; varying float vSky; varying vec3 vTint; varying float vFog;
    void main(){
      vec4 t = texture2D(map, vUv);
      ${mode === 'cutout' ? 'if (t.a < 0.5) discard;' : ''}
      float light = max(uAmbient, vSky*uDay);
      vec3 c = t.rgb * vTint * light * vAo;
      ${mode === 'water' ? 'gl_FragColor = vec4(mix(c, uFog, vFog), 0.78);' : ''}
      ${mode === 'glass' ? 'gl_FragColor = vec4(mix(c, uFog, vFog), t.a);' : ''}
      ${mode === 'cutout' ? 'gl_FragColor = vec4(mix(c, uFog, vFog), 1.0);' : ''}
    }`;
  const mk = (mode, opts) => new THREE.ShaderMaterial({
    uniforms: Object.assign({ map: { value: tex } }, uniforms, opts.extra || {}),
    vertexShader: vert, fragmentShader: frag(mode), transparent: !!opts.transparent,
    depthWrite: opts.depthWrite !== false, side: opts.side || THREE.FrontSide,
  });
  return {
    [MAT.OPAQUE]: mk('cutout', { side: THREE.DoubleSide, extra: { uWave: { value: 0 } } }),
    [MAT.WATER]: mk('water', { transparent: true, depthWrite: false, side: THREE.DoubleSide, extra: { uWave: { value: 1 } } }),
    [MAT.GLASS]: mk('glass', { transparent: true, depthWrite: true, side: THREE.DoubleSide, extra: { uWave: { value: 0 } } }),
  };
}

// ---------------------------------------------------------------------------
// Sky + sun + 3D clouds
// ---------------------------------------------------------------------------
// 3D voxel cloud layer (tileable so it scrolls seamlessly)
function makeClouds() {
  const T = 22, cell = 12, ht = 4, thr = 0.52;
  const rnd = mulberry32(4242);
  const R = new Float32Array(T * T); for (let i = 0; i < T * T; i++) R[i] = rnd();
  const sm = new Float32Array(T * T);
  for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) { let s = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) s += R[(((j + dj + T) % T) * T) + ((i + di + T) % T)]; sm[j * T + i] = s / 9; }
  const on = (i, j) => sm[(((j % T) + T) % T) * T + (((i % T) + T) % T)] > thr;
  const pos = [], col = [], idx = []; let n = 0;
  const quad = (v, sh) => { const b = n; for (const q of v) { pos.push(q[0], q[1], q[2]); col.push(sh, sh, sh); } n += 4; idx.push(b, b + 1, b + 2, b, b + 2, b + 3); };
  for (let tj = -1; tj <= 1; tj++) for (let ti = -1; ti <= 1; ti++)
    for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
      if (!on(i, j)) continue;
      const x0 = (ti * T + i) * cell, z0 = (tj * T + j) * cell, x1 = x0 + cell, z1 = z0 + cell, y0 = 0, y1 = ht;
      quad([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], 1.0);
      quad([[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]], 0.55);
      if (!on(i - 1, j)) quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], 0.8);
      if (!on(i + 1, j)) quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], 0.8);
      if (!on(i, j - 1)) quad([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], 0.72);
      if (!on(i, j + 1)) quad([[x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1]], 0.72);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false, side: THREE.DoubleSide }));
  mesh.frustumCulled = false;
  return { mesh, tw: T * cell };
}
function makeSky(uniforms) {
  const group = new THREE.Group();
  const skyU = { uTop: { value: new THREE.Color(0x4a8fe0) }, uBottom: { value: new THREE.Color(0xcfe7f7) }, uSun: { value: new THREE.Vector3(0.4, 0.8, 0.3) } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(800, 24, 16), new THREE.ShaderMaterial({
    uniforms: skyU, side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 vd; void main(){ vd=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `varying vec3 vd; uniform vec3 uTop,uBottom,uSun; void main(){ vec3 d=normalize(vd); float h=clamp(d.y*0.5+0.5,0.0,1.0); vec3 col=mix(uBottom,uTop,smoothstep(0.0,0.7,h)); float s=max(dot(d,normalize(uSun)),0.0); col+=vec3(1.0,0.95,0.8)*pow(s,260.0)*1.6; col+=vec3(1.0,0.9,0.7)*pow(s,6.0)*0.12; gl_FragColor=vec4(col,1.0);} `,
  }));
  dome.frustumCulled = false; group.add(dome);
  const sun = new THREE.Mesh(new THREE.CircleGeometry(38, 20), new THREE.MeshBasicMaterial({ color: 0xfff4d0, depthWrite: false, transparent: true })); group.add(sun);
  const moon = new THREE.Mesh(new THREE.CircleGeometry(26, 20), new THREE.MeshBasicMaterial({ color: 0xdfe6ff, depthWrite: false, transparent: true })); group.add(moon);
  // stars
  const sg = new THREE.BufferGeometry(); const sp = []; const rnd = mulberry32(99);
  for (let i = 0; i < 800; i++) { const v = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1); if (v.lengthSq() < 0.02) continue; v.normalize().multiplyScalar(760); if (v.y < 0) v.y = -v.y; sp.push(v.x, v.y, v.z); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.6, sizeAttenuation: true, transparent: true, depthWrite: false })); stars.frustumCulled = false; group.add(stars);
  const clouds = makeClouds(); group.add(clouds.mesh);
  return {
    group, sun, moon, stars, skyU, clouds,
    update(cam, sunDir, time, day) {
      group.position.copy(cam.position); skyU.uSun.value.copy(sunDir);
      sun.position.copy(cam.position).addScaledVector(sunDir, 600); sun.lookAt(cam.position);
      moon.position.copy(cam.position).addScaledVector(sunDir, -600); moon.lookAt(cam.position);
      stars.material.opacity = clamp(1 - day * 1.6, 0, 1);
      sun.material.opacity = clamp(day * 1.5, 0, 1);
      moon.material.opacity = clamp(1 - day, 0, 1);
      const tw = clouds.tw, dx = (time * 3) % tw;
      clouds.mesh.position.set(Math.floor(cam.position.x / tw) * tw + dx - cam.position.x, 118 - cam.position.y, Math.floor(cam.position.z / tw) * tw - cam.position.z);
      clouds.mesh.material.opacity = 0.55 + 0.4 * day;
    },
  };
}
// ---------------------------------------------------------------------------
// Survival: items, mining, drops, inventory, crafting
// ---------------------------------------------------------------------------
const T_HAND = 0, T_WOOD = 1, T_STONE = 2, T_IRON = 3, T_DIAMOND = 4;
const ITEM = {
  STICK: 256, COAL: 257, DIAMOND: 258, IRON: 259, GOLD: 260, APPLE: 261,
  W_PICK: 262, W_AXE: 263, W_SHOVEL: 264, W_SWORD: 265,
  S_PICK: 266, S_AXE: 267, S_SHOVEL: 268, S_SWORD: 269,
  I_PICK: 270, I_AXE: 271, I_SHOVEL: 272, I_SWORD: 273,
  D_PICK: 274, D_AXE: 275, D_SHOVEL: 276, D_SWORD: 277,
};
// per-block: s=hardness, t=tool, need=min tier to drop anything, drop=item (null=nothing, undefined=self)
const SURV = {
  [B.GRASS]: { s: 0.6, t: 'shovel', drop: B.DIRT }, [B.DIRT]: { s: 0.5, t: 'shovel' },
  [B.STONE]: { s: 1.5, t: 'pickaxe', need: T_WOOD, drop: B.COBBLE }, [B.COBBLE]: { s: 2, t: 'pickaxe', need: T_WOOD },
  [B.MOSSY]: { s: 2, t: 'pickaxe', need: T_WOOD }, [B.SAND]: { s: 0.5, t: 'shovel' },
  [B.SANDSTONE]: { s: 0.8, t: 'pickaxe', need: T_WOOD }, [B.GRAVEL]: { s: 0.6, t: 'shovel' },
  [B.LOG]: { s: 2, t: 'axe' }, [B.SPRUCE_LOG]: { s: 2, t: 'axe' }, [B.PLANKS]: { s: 2, t: 'axe' },
  [B.BOOKSHELF]: { s: 1.5, t: 'axe' }, [B.LEAVES]: { s: 0.2, drop: null, apple: 0.02 }, [B.SPRUCE_LEAVES]: { s: 0.2, drop: null },
  [B.GLASS]: { s: 0.3, drop: null }, [B.ICE]: { s: 0.5, t: 'pickaxe', drop: null }, [B.SNOW]: { s: 0.2, t: 'shovel' },
  [B.WOOL]: { s: 0.8 }, [B.COAL]: { s: 3, t: 'pickaxe', need: T_WOOD, drop: ITEM.COAL },
  [B.IRON]: { s: 3, t: 'pickaxe', need: T_STONE, drop: ITEM.IRON }, [B.GOLD]: { s: 3, t: 'pickaxe', need: T_IRON, drop: ITEM.GOLD },
  [B.DIAMOND]: { s: 3, t: 'pickaxe', need: T_IRON, drop: ITEM.DIAMOND }, [B.OBSIDIAN]: { s: 12, t: 'pickaxe', need: T_DIAMOND },
  [B.BRICK]: { s: 2, t: 'pickaxe', need: T_WOOD }, [B.GLOWSTONE]: { s: 0.3 }, [B.PUMPKIN]: { s: 1, t: 'axe' },
  [B.CACTUS]: { s: 0.4 }, [B.POPPY]: { s: 0 }, [B.TALLGRASS]: { s: 0, drop: null }, [B.SANDSTONE]: { s: 0.8, t: 'pickaxe', need: T_WOOD },
};
function surv(id) { return SURV[id] || { s: 1 }; }
function dropOf(id) { const sv = surv(id); if (sv.drop === null) return null; if (sv.drop !== undefined) return sv.drop; return id; }

const ITEMS = {};
const cap = s => s[0].toUpperCase() + s.slice(1);
function it(id, o) { ITEMS[id] = Object.assign({ id, stack: 64 }, o); }
it(ITEM.STICK, { name: 'Stick' }); it(ITEM.COAL, { name: 'Coal' }); it(ITEM.DIAMOND, { name: 'Diamond' });
it(ITEM.IRON, { name: 'Iron Ingot' }); it(ITEM.GOLD, { name: 'Gold Ingot' }); it(ITEM.APPLE, { name: 'Apple', food: 4 });
const TSPEED = { wood: 2, stone: 4, iron: 6, diamond: 8 }, TTIER = { wood: T_WOOD, stone: T_STONE, iron: T_IRON, diamond: T_DIAMOND };
[['wood', 'W'], ['stone', 'S'], ['iron', 'I'], ['diamond', 'D']].forEach(([m, k]) => {
  it(ITEM[k + '_PICK'], { name: cap(m) + ' Pickaxe', stack: 1, tool: 'pickaxe', tier: TTIER[m], speed: TSPEED[m] });
  it(ITEM[k + '_AXE'], { name: cap(m) + ' Axe', stack: 1, tool: 'axe', tier: TTIER[m], speed: TSPEED[m] });
  it(ITEM[k + '_SHOVEL'], { name: cap(m) + ' Shovel', stack: 1, tool: 'shovel', tier: TTIER[m], speed: TSPEED[m] });
  it(ITEM[k + '_SWORD'], { name: cap(m) + ' Sword', stack: 1, tool: 'sword', tier: TTIER[m], speed: 1.5 });
});
function itemDef(id) { if (id == null) return null; if (id < 256) return { id, isBlock: true, name: blockDef(id).name, stack: 64 }; return ITEMS[id] || { id, name: 'Item', stack: 64 }; }
function maxStack(id) { const d = itemDef(id); return d ? (d.stack || 64) : 64; }
function canHarvest(blockId, heldId) { const sv = surv(blockId); const need = sv.need || 0; if (need <= 0) return true; const tl = heldId != null ? itemDef(heldId) : null; return !!(tl && tl.tool === sv.t && (tl.tier || 0) >= need); }
function mineTime(blockId, heldId) {
  const sv = surv(blockId); const h = sv.s || 1; if (h <= 0) return 0.04;
  const tl = heldId != null ? itemDef(heldId) : null; let mult = 1;
  if (tl && tl.tool === sv.t) mult = tl.speed || 1;
  return Math.max(0.05, h * (canHarvest(blockId, heldId) ? 1.5 : 5) / mult);
}

class Inventory {
  constructor() { this.slots = new Array(36).fill(null); this.sel = 0; this.cursor = null; this.craft = new Array(9).fill(null); this.craftSize = 2; }
  held() { return this.slots[this.sel]; }
  heldId() { const s = this.held(); return s ? s.id : null; }
  add(id, count = 1) {
    const max = maxStack(id);
    for (let i = 0; i < 36 && count > 0; i++) { const s = this.slots[i]; if (s && s.id === id && s.count < max) { const a = Math.min(max - s.count, count); s.count += a; count -= a; } }
    for (let i = 0; i < 36 && count > 0; i++) { if (!this.slots[i]) { const a = Math.min(max, count); this.slots[i] = { id, count: a }; count -= a; } }
    return count;
  }
  consumeSel(n = 1) { const s = this.held(); if (!s) return; s.count -= n; if (s.count <= 0) this.slots[this.sel] = null; }
  count(id) { let n = 0; for (const s of this.slots) if (s && s.id === id) n += s.count; return n; }
}

// crafting recipes
const SHAPED = [], SHAPELESS = [];
function aShaped(res, c, rows) { SHAPED.push({ rows, w: rows[0].length, h: rows.length, res: { id: res, count: c } }); }
function aShapeless(res, c, ids) { SHAPELESS.push({ ids: ids.slice().sort((a, b) => a - b), res: { id: res, count: c } }); }
aShapeless(B.PLANKS, 4, [B.LOG]); aShapeless(B.PLANKS, 4, [B.SPRUCE_LOG]);
aShaped(ITEM.STICK, 4, [[B.PLANKS], [B.PLANKS]]);
const CMATS = { wood: B.PLANKS, stone: B.COBBLE, iron: ITEM.IRON, diamond: ITEM.DIAMOND };
[['wood', 'W'], ['stone', 'S'], ['iron', 'I'], ['diamond', 'D']].forEach(([m, k]) => {
  const x = CMATS[m], S = ITEM.STICK;
  aShaped(ITEM[k + '_PICK'], 1, [[x, x, x], [null, S, null], [null, S, null]]);
  aShaped(ITEM[k + '_AXE'], 1, [[x, x], [x, S], [null, S]]);
  aShaped(ITEM[k + '_SHOVEL'], 1, [[x], [S], [S]]);
  aShaped(ITEM[k + '_SWORD'], 1, [[x], [x], [S]]);
});
function trimGrid(ids, size) {
  let r0 = size, r1 = -1, c0 = size, c1 = -1;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (ids[r * size + c]) { r0 = Math.min(r0, r); r1 = Math.max(r1, r); c0 = Math.min(c0, c); c1 = Math.max(c1, c); }
  if (r1 < 0) return null; const out = [];
  for (let r = r0; r <= r1; r++) { const row = []; for (let c = c0; c <= c1; c++) row.push(ids[r * size + c] || null); out.push(row); }
  return out;
}
function gridEq(a, b) { if (a.length !== b.length || a[0].length !== b[0].length) return false; for (let r = 0; r < a.length; r++) for (let c = 0; c < a[0].length; c++) if ((a[r][c] || null) !== (b[r][c] || null)) return false; return true; }
function craftMatch(grid, size) {
  const ids = grid.map(s => s ? s.id : 0); if (!ids.some(v => v)) return null;
  const tr = trimGrid(ids, size);
  for (const r of SHAPED) if (r.w <= size && r.h <= size && gridEq(tr, r.rows)) return r.res;
  const sorted = ids.filter(v => v).sort((a, b) => a - b);
  for (const r of SHAPELESS) if (r.ids.length === sorted.length && r.ids.every((v, i) => v === sorted[i])) return r.res;
  return null;
}

// crack overlay texture (10 progressive frames stacked vertically)
function makeCrackTexture() {
  const F = 10, S = 16; const c = document.createElement('canvas'); c.width = S; c.height = S * F; const ctx = c.getContext('2d');
  const rnd = mulberry32(55);
  ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 1;
  for (let f = 0; f < F; f++) { const oy = f * S, lines = f + 1;
    for (let l = 0; l < lines; l++) { let x = 2 + (rnd() * 12 | 0), y = oy + 2 + (rnd() * 12 | 0); ctx.beginPath(); ctx.moveTo(x, y); for (let k = 0; k < 3; k++) { x = clamp(x + (rnd() * 6 - 3), 0, S); y = clamp(y + (rnd() * 6 - 3), oy, oy + S); ctx.lineTo(x, y); } ctx.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.flipY = false; t.repeat.set(1, 1 / F);
  return { tex: t, F };
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
class Input {
  constructor(canvas) {
    this.canvas = canvas; this.keys = new Set(); this.pressed = new Set();
    this.mdx = 0; this.mdy = 0; this.locked = false;
    this.mL = false; this.mR = false; this.mLe = false; this.mRe = false; this.wheel = 0;
    addEventListener('keydown', e => { if (!e.repeat) { this.keys.add(e.code); this.pressed.add(e.code); } if (this.locked && ['Space', 'Tab'].includes(e.code)) e.preventDefault(); });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mL = this.mR = false; });
    canvas.addEventListener('mousedown', e => { if (!this.locked) return; if (e.button === 0) { this.mL = true; this.mLe = true; } if (e.button === 2) { this.mR = true; this.mRe = true; } });
    addEventListener('mouseup', e => { if (e.button === 0) this.mL = false; if (e.button === 2) this.mR = false; });
    addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('wheel', e => { if (this.locked) { this.wheel += Math.sign(e.deltaY); e.preventDefault(); } }, { passive: false });
    addEventListener('mousemove', e => { if (this.locked) { this.mdx += e.movementX || 0; this.mdy += e.movementY || 0; } });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; if (this.onLock) this.onLock(this.locked); });
  }
  k(c) { return this.keys.has(c); }
  p(c) { return this.pressed.has(c); }
  lock() { this.canvas.requestPointerLock && this.canvas.requestPointerLock(); }
  unlock() { document.exitPointerLock && document.exitPointerLock(); }
  end() { this.pressed.clear(); this.mLe = this.mRe = false; this.mdx = 0; this.mdy = 0; this.wheel = 0; }
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
const PW = 0.6, PH = 1.8, EYE = 1.62, HW = 0.3;
class Player {
  constructor(game) {
    this.game = game; this.camera = game.camera; this.world = game.world;
    this.pos = new THREE.Vector3(8, 60, 8); this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0; this.onGround = false; this.fly = false; this._lastSpace = 0;
    this.target = null; this.breakTarget = null; this.breakProgress = 0; this.mineCd = 0;
    this.health = 20; this.hunger = 20; this.sat = 5; this.exhaustion = 0; this.dead = false;
    this.invuln = 0; this.regenT = 0; this.fallStart = null; this.sprinting = false;
  }
  eye() { return new THREE.Vector3(this.pos.x, this.pos.y + EYE, this.pos.z); }
  update(dt, input) {
    dt = Math.min(dt, 0.05);
    const creative = this.game.mode === 'creative';
    const sens = 0.0022;
    this.yaw -= input.mdx * sens; this.pitch -= input.mdy * sens;
    this.pitch = clamp(this.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

    if (creative && input.p('Space')) { const now = performance.now(); if (now - this._lastSpace < 300) { this.fly = !this.fly; this.vel.y = 0; } this._lastSpace = now; }

    const fwd = new THREE.Vector3(); this.camera.getWorldDirection(fwd); fwd.y = 0;
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1); fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, UP).normalize();
    const wish = new THREE.Vector3();
    if (input.k('KeyW')) wish.add(fwd);
    if (input.k('KeyS')) wish.sub(fwd);
    if (input.k('KeyD')) wish.add(right);
    if (input.k('KeyA')) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize();
    this.sprinting = input.k('ControlLeft') && input.k('KeyW');

    if (this.fly) {
      const sp = 10 * (input.k('ControlLeft') ? 2.2 : 1);
      this.vel.x = wish.x * sp; this.vel.z = wish.z * sp; this.vel.y = 0;
      if (input.k('Space')) this.vel.y = sp; if (input.k('ShiftLeft')) this.vel.y = -sp;
      this.move(dt);
    } else {
      const inWater = this.world.getBlock(Math.floor(this.pos.x), Math.floor(this.pos.y + 0.4), Math.floor(this.pos.z)) === B.WATER;
      const sp = (this.sprinting ? 5.8 : 4.4) * (inWater ? 0.6 : 1);
      this.vel.x += (wish.x * sp - this.vel.x) * Math.min(1, 12 * dt);
      this.vel.z += (wish.z * sp - this.vel.z) * Math.min(1, 12 * dt);
      this.vel.y -= (inWater ? 10 : 28) * dt; this.vel.y = Math.max(this.vel.y, inWater ? -3 : -56);
      if (input.k('Space')) { if (this.onGround) { this.vel.y = 8.4; } else if (inWater) this.vel.y = 4; }
      this.move(dt);
      this._fall(dt);
    }
    if (this.pos.y < -24) { if (!creative) this.takeDamage(6); this.pos.set(this.pos.x, 90, this.pos.z); this.vel.set(0, 0, 0); }
    this.camera.position.copy(this.eye());
    this.updateStats(dt);

    this.target = this.raycast(6);
    if (!this.game.ui.open && !this.dead) {
      this._mine(dt, input);
      if (input.mRe && this.target) this._use(input);
    } else { this.breakTarget = null; this.breakProgress = 0; }
    const inv = this.game.inventory;
    const w = input.wheel; if (w) inv.sel = (inv.sel + w + 9) % 9;
    for (let i = 1; i <= 9; i++) if (input.p('Digit' + i)) inv.sel = i - 1;
  }
  _fall(dt) {
    if (!this.onGround && this.vel.y < 0 && this.fallStart === null) this.fallStart = this.pos.y;
    if (this.fallStart !== null && this.pos.y > this.fallStart) this.fallStart = this.pos.y;
    if (this.onGround && this.fallStart !== null) {
      const dist = this.fallStart - this.pos.y;
      if (dist > 3.2) this.takeDamage(Math.floor(dist - 3));
      this.fallStart = null;
    }
  }
  updateStats(dt) {
    if (this.game.mode === 'creative' || this.dead) return;
    if (this.sprinting) this.exhaustion += 0.02;
    this.exhaustion += 0.004;
    while (this.exhaustion >= 4) { this.exhaustion -= 4; if (this.sat > 0) this.sat = Math.max(0, this.sat - 1); else this.hunger = Math.max(0, this.hunger - 1); }
    this.regenT += dt;
    if (this.hunger >= 18 && this.health < 20) { if (this.regenT >= 3) { this.regenT = 0; this.health = Math.min(20, this.health + 1); this.exhaustion += 1.2; } }
    else if (this.hunger <= 0) { if (this.regenT >= 4) { this.regenT = 0; if (this.health > 1) this.health -= 1; } }
    else this.regenT = 0;
    this.invuln = Math.max(0, this.invuln - dt);
  }
  takeDamage(n) { if (this.game.mode === 'creative' || this.dead || this.invuln > 0) return; this.health -= n; this.invuln = 0.5; this.game.onHurt(); if (this.health <= 0) { this.health = 0; this.dead = true; this.game.onDeath(); } }
  _mine(dt, input) {
    const t = this.target;
    if (!input.mL || !t) { this.breakTarget = null; this.breakProgress = 0; this.mineCd = 0; return; }
    if (this.game.mode === 'creative') {
      this.mineCd -= dt; if (input.mLe || this.mineCd <= 0) { this.world.setBlock(t.x, t.y, t.z, B.AIR); this.mineCd = 0.09; }
      this.breakTarget = null; this.breakProgress = 0; return;
    }
    const held = this.game.inventory.heldId();
    if (!this.breakTarget || this.breakTarget.x !== t.x || this.breakTarget.y !== t.y || this.breakTarget.z !== t.z) { this.breakTarget = { x: t.x, y: t.y, z: t.z }; this.breakProgress = 0; }
    this.breakProgress += dt / mineTime(t.id, held);
    if (this.breakProgress >= 1) {
      const give = canHarvest(t.id, held) ? dropOf(t.id) : null;
      this.world.setBlock(t.x, t.y, t.z, B.AIR);
      if (give != null) this.game.inventory.add(give, 1);
      const sv = surv(t.id); if (sv.apple && Math.random() < sv.apple) this.game.inventory.add(ITEM.APPLE, 1);
      this.exhaustion += 0.05; this.breakProgress = 0; this.breakTarget = null;
    }
  }
  _use(input) {
    const held = this.game.inventory.held(); if (!held) return;
    const d = itemDef(held.id);
    if (d.food && this.hunger < 20) { this.hunger = Math.min(20, this.hunger + d.food); this.sat = Math.min(this.hunger, this.sat + d.food * 0.6); if (this.game.mode !== 'creative') this.game.inventory.consumeSel(1); return; }
    if (d.isBlock) this.place(held.id);
  }
  move(dt) {
    this.onGround = false;
    this.axis(0, this.vel.x * dt); this.axis(1, this.vel.y * dt); this.axis(2, this.vel.z * dt);
  }
  solid(x, y, z) { const id = this.world.getBlock(x, y, z); return id !== B.AIR && blockDef(id).solid; }
  axis(a, amt) {
    if (amt === 0) return; const p = this.pos; const comp = ['x', 'y', 'z'][a]; p[comp] += amt;
    const x0 = Math.floor(p.x - HW), x1 = Math.floor(p.x + HW - 1e-4);
    const y0 = Math.floor(p.y), y1 = Math.floor(p.y + PH - 1e-4);
    const z0 = Math.floor(p.z - HW), z1 = Math.floor(p.z + HW - 1e-4);
    let limit = amt > 0 ? Infinity : -Infinity, hit = false;
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      if (!this.solid(x, y, z)) continue; hit = true; const lo = a === 0 ? x : a === 1 ? y : z;
      if (amt > 0) limit = Math.min(limit, lo); else limit = Math.max(limit, lo + 1);
    }
    if (!hit) return; const e = 1e-3;
    if (a === 0) p.x = amt > 0 ? limit - HW - e : limit + HW + e;
    else if (a === 2) p.z = amt > 0 ? limit - HW - e : limit + HW + e;
    else { if (amt > 0) p.y = limit - PH - e; else { p.y = limit + e; this.onGround = true; } }
    this.vel[comp] = 0;
  }
  raycast(maxD) {
    const o = this.eye(); const d = new THREE.Vector3(); this.camera.getWorldDirection(d);
    let x = Math.floor(o.x), y = Math.floor(o.y), z = Math.floor(o.z);
    const sx = Math.sign(d.x), sy = Math.sign(d.y), sz = Math.sign(d.z);
    const dx = sx !== 0 ? Math.abs(1 / d.x) : 1e9, dy = sy !== 0 ? Math.abs(1 / d.y) : 1e9, dz = sz !== 0 ? Math.abs(1 / d.z) : 1e9;
    let tx = sx > 0 ? (x + 1 - o.x) / d.x : sx < 0 ? (x - o.x) / d.x : 1e9;
    let ty = sy > 0 ? (y + 1 - o.y) / d.y : sy < 0 ? (y - o.y) / d.y : 1e9;
    let tz = sz > 0 ? (z + 1 - o.z) / d.z : sz < 0 ? (z - o.z) / d.z : 1e9;
    let nx = 0, ny = 0, nz = 0, t = 0;
    while (t <= maxD) {
      const id = this.world.getBlock(x, y, z);
      if (id !== B.AIR && id !== B.WATER) return { x, y, z, px: x + nx, py: y + ny, pz: z + nz, id };
      if (tx < ty && tx < tz) { x += sx; t = tx; tx += dx; nx = -sx; ny = 0; nz = 0; }
      else if (ty < tz) { y += sy; t = ty; ty += dy; nx = 0; ny = -sy; nz = 0; }
      else { z += sz; t = tz; tz += dz; nx = 0; ny = 0; nz = -sz; }
    }
    return null;
  }
  place(id) {
    const t = this.target; const px = t.px, py = t.py, pz = t.pz;
    if (this.world.getBlock(px, py, pz) !== B.AIR) return;
    const d = blockDef(id);
    if (d.solid) { const minX = this.pos.x - HW, maxX = this.pos.x + HW, minY = this.pos.y, maxY = this.pos.y + PH, minZ = this.pos.z - HW, maxZ = this.pos.z + HW; if (px + 1 > minX && px < maxX && py + 1 > minY && py < maxY && pz + 1 > minZ && pz < maxZ) return; }
    this.world.setBlock(px, py, pz, id);
    if (this.game.mode !== 'creative') this.game.inventory.consumeSel(1);
  }
}

// ---------------------------------------------------------------------------
// UI (drawn icons only — no emoji/fonts for graphics)
// ---------------------------------------------------------------------------
function heartURL(state) {
  const c = document.createElement('canvas'); c.width = c.height = 18; const x = c.getContext('2d');
  const heart = col => { x.fillStyle = col; x.beginPath(); x.moveTo(9, 16); x.bezierCurveTo(0, 9, 2, 2, 9, 6.5); x.bezierCurveTo(16, 2, 18, 9, 9, 16); x.closePath(); x.fill(); };
  heart(state === 'empty' ? '#4a4f5c' : '#ff3b3b');
  if (state === 'half') { x.save(); x.beginPath(); x.rect(9, 0, 9, 18); x.clip(); heart('#4a4f5c'); x.restore(); }
  x.lineWidth = 1.5; x.strokeStyle = 'rgba(0,0,0,0.6)'; x.beginPath(); x.moveTo(9, 16); x.bezierCurveTo(0, 9, 2, 2, 9, 6.5); x.bezierCurveTo(16, 2, 18, 9, 9, 16); x.closePath(); x.stroke();
  return c.toDataURL();
}
function hungerURL(state) {
  const c = document.createElement('canvas'); c.width = c.height = 18; const x = c.getContext('2d');
  const draw = col => { x.fillStyle = col; x.beginPath(); x.arc(7, 8, 5.5, 0, 7); x.fill(); x.fillStyle = '#efe2c0'; x.fillRect(11, 9, 6, 3); x.beginPath(); x.arc(16, 10.5, 2, 0, 7); x.fill(); };
  draw(state === 'empty' ? '#4a4438' : '#b9772f');
  if (state === 'half') { x.save(); x.beginPath(); x.rect(9, 0, 9, 18); x.clip(); draw('#4a4438'); x.restore(); }
  return c.toDataURL();
}
const HEART = { full: heartURL('full'), half: heartURL('half'), empty: heartURL('empty') };
const HUNGER = { full: hungerURL('full'), half: hungerURL('half'), empty: hungerURL('empty') };

class UI {
  constructor(game) { this.game = game; this.iconCache = new Map(); this.open = null; this.build(); }
  blockIcon(id) {
    if (this.iconCache.has(id)) return this.iconCache.get(id);
    const d = blockDef(id); const g = this.game;
    const c = document.createElement('canvas'); c.width = c.height = 32; const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
    const face = (name, dxs) => { const uv = g.uv.get(name); if (!uv) return; ctx.drawImage(g.atlas, uv[0] * g.atlas.width, uv[1] * g.atlas.height, (uv[2] - uv[0]) * g.atlas.width, (uv[3] - uv[1]) * g.atlas.height, dxs[0], dxs[1], dxs[2], dxs[3]); };
    face(texOf(d, 2), [0, 0, 32, 14]); face(texOf(d, 4), [0, 12, 32, 20]);
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, 12, 32, 20);
    const url = c.toDataURL(); this.iconCache.set(id, url); return url;
  }
  itemIcon(id) {
    if (id < 256) return this.blockIcon(id);
    if (this.iconCache.has(id)) return this.iconCache.get(id);
    const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d'); const d = itemDef(id);
    if (d.tool) {
      x.strokeStyle = '#7a5a2e'; x.lineWidth = 4; x.beginPath(); x.moveTo(23, 28); x.lineTo(12, 16); x.stroke();
      const col = { 1: '#9a6a3a', 2: '#9a9a9a', 3: '#dcdcdc', 4: '#5ad7d2' }[d.tier] || '#aaa'; x.fillStyle = col;
      if (d.tool === 'pickaxe') { x.fillRect(6, 6, 16, 4); x.fillRect(6, 6, 3, 5); x.fillRect(19, 6, 3, 5); }
      else if (d.tool === 'axe') { x.fillRect(15, 4, 9, 8); x.fillRect(13, 6, 3, 5); }
      else if (d.tool === 'shovel') { x.fillRect(15, 5, 8, 8); }
      else if (d.tool === 'sword') { x.strokeStyle = col; x.lineWidth = 4; x.beginPath(); x.moveTo(23, 7); x.lineTo(12, 18); x.stroke(); x.fillStyle = '#7a5a2e'; x.fillRect(8, 18, 7, 3); }
    } else if (id === ITEM.STICK) { x.strokeStyle = '#9a6a3a'; x.lineWidth = 3; x.beginPath(); x.moveTo(22, 26); x.lineTo(10, 9); x.stroke(); }
    else if (id === ITEM.COAL) { x.fillStyle = '#2a2a2e'; x.fillRect(8, 8, 16, 16); }
    else if (id === ITEM.DIAMOND) { x.fillStyle = '#5ad7d2'; x.beginPath(); x.moveTo(16, 5); x.lineTo(26, 14); x.lineTo(16, 27); x.lineTo(6, 14); x.closePath(); x.fill(); }
    else if (id === ITEM.IRON) { x.fillStyle = '#dcdcdc'; x.fillRect(7, 12, 18, 8); }
    else if (id === ITEM.GOLD) { x.fillStyle = '#e7c65a'; x.fillRect(7, 12, 18, 8); }
    else if (id === ITEM.APPLE) { x.fillStyle = '#d33'; x.beginPath(); x.arc(16, 18, 9, 0, 7); x.fill(); x.fillStyle = '#5a3'; x.fillRect(15, 6, 2, 5); }
    else { x.fillStyle = '#c0c'; x.fillRect(8, 8, 16, 16); }
    const url = c.toDataURL(); this.iconCache.set(id, url); return url;
  }
  build() {
    const root = document.createElement('div'); root.id = 'ui';
    root.innerHTML = `<div id="cross"><div id="breakbar"></div></div>
      <div id="stats"><div id="hearts" class="pips"></div><div id="hungers" class="pips"></div></div>
      <div id="hotbar"></div><div id="selname"></div>
      <div id="hint">WASD move · mouse look · L/R break/place · 1-9 / scroll · E inventory · Esc menu</div>
      <div id="screen" class="hidden"></div><div id="cursor" class="hidden"></div><div id="menu" class="hidden"></div>`;
    document.body.appendChild(root); this.root = root;
    this.el = { hotbar: root.querySelector('#hotbar'), hearts: root.querySelector('#hearts'), hungers: root.querySelector('#hungers'), selname: root.querySelector('#selname'), screen: root.querySelector('#screen'), cursor: root.querySelector('#cursor'), menu: root.querySelector('#menu'), breakbar: root.querySelector('#breakbar') };
    for (let i = 0; i < 9; i++) { const s = document.createElement('div'); s.className = 'hs'; s.onclick = () => { if (!this.open) this.game.inventory.sel = i; }; this.el.hotbar.appendChild(s); }
    document.addEventListener('mousemove', e => { this._mx = e.clientX; this._my = e.clientY; this._moveCursor(); });
  }
  _pips(row, count, value, icons) {
    if (row._n === count && row._v === value) return; row.innerHTML = '';
    for (let i = 0; i < count; i++) { const f = value - i; const url = f >= 1 ? icons.full : f >= 0.5 ? icons.half : icons.empty; const s = document.createElement('span'); s.className = 'pip'; s.style.backgroundImage = `url(${url})`; row.appendChild(s); }
    row._n = count; row._v = value;
  }
  update() {
    const p = this.game.player, inv = this.game.inventory;
    [...this.el.hotbar.children].forEach((s, i) => {
      s.classList.toggle('sel', i === inv.sel); const it = inv.slots[i];
      s.style.backgroundImage = it ? `url(${this.itemIcon(it.id)})` : ''; s.dataset.c = (it && it.count > 1) ? it.count : '';
    });
    const cre = this.game.mode === 'creative';
    this.el.hearts.style.display = cre ? 'none' : 'flex';
    this.el.hungers.style.display = cre ? 'none' : 'flex';
    if (!cre) { this._pips(this.el.hearts, 10, p.health / 2, HEART); this._pips(this.el.hungers, 10, p.hunger / 2, HUNGER); }
    const sit = inv.held(); this.el.selname.textContent = sit ? itemDef(sit.id).name : '';
    this.el.breakbar.style.width = (p.breakProgress > 0 ? p.breakProgress * 22 : 0) + 'px';
    if (this.open === 'inv' || this.open === 'craft') this._renderScreen();
    this._moveCursor();
  }
  _moveCursor() {
    const cur = this.game.inventory.cursor;
    if (cur && this.open) { this.el.cursor.classList.remove('hidden'); this.el.cursor.style.left = this._mx + 'px'; this.el.cursor.style.top = this._my + 'px'; this.el.cursor.style.backgroundImage = `url(${this.itemIcon(cur.id)})`; this.el.cursor.dataset.c = cur.count > 1 ? cur.count : ''; }
    else this.el.cursor.classList.add('hidden');
  }
  openInventory() { if (this.game.mode === 'creative') this.openPalette(); else { this.open = 'inv'; this.game.inventory.craftSize = 2; this._showScreen(); } }
  openPalette() {
    this.open = 'palette'; this.game.input.unlock(); const s = this.el.screen; s.classList.remove('hidden'); s.innerHTML = '<div class="panel"><h3>Creative Blocks</h3><div class="pg"></div></div>';
    const grid = s.querySelector('.pg');
    const all = ALL_PLACEABLE.concat([ITEM.W_PICK, ITEM.S_PICK, ITEM.I_PICK, ITEM.D_PICK, ITEM.D_SWORD, ITEM.D_AXE, ITEM.APPLE, ITEM.COAL, ITEM.IRON, ITEM.DIAMOND]);
    for (const id of all) { const b = document.createElement('div'); b.className = 'pi'; b.style.backgroundImage = `url(${this.itemIcon(id)})`; b.title = itemDef(id).name; b.onclick = () => { const iv = this.game.inventory; iv.slots[iv.sel] = { id, count: itemDef(id).stack || 1 }; this.close(); }; grid.appendChild(b); }
  }
  _showScreen() { this.game.input.unlock(); this.el.screen.classList.remove('hidden'); this._renderScreen(); }
  close() {
    if (this.open === 'inv' || this.open === 'craft') { const iv = this.game.inventory; for (let i = 0; i < iv.craft.length; i++) if (iv.craft[i]) { iv.add(iv.craft[i].id, iv.craft[i].count); iv.craft[i] = null; } if (iv.cursor) { iv.add(iv.cursor.id, iv.cursor.count); iv.cursor = null; } }
    this.open = null; this.el.screen.classList.add('hidden'); this.el.cursor.classList.add('hidden');
    if (this.game.playing && !this.game.paused) this.game.input.lock();
  }
  _slot(get, set, opts = {}) {
    const el = document.createElement('div'); el.className = 'islot' + (opts.cls ? ' ' + opts.cls : '');
    const it = get(); if (it) { el.style.backgroundImage = `url(${this.itemIcon(it.id)})`; if (it.count > 1) el.dataset.c = it.count; }
    el.addEventListener('mousedown', e => { e.preventDefault(); opts.out ? this._takeOutput(opts) : this._click(get, set, e.button); });
    return el;
  }
  _click(get, set, btn) {
    const iv = this.game.inventory; let cur = iv.cursor, s = get();
    if (btn === 2) {
      if (cur) { if (!s) { set({ id: cur.id, count: 1 }); cur.count--; } else if (s.id === cur.id && s.count < maxStack(s.id)) { s.count++; cur.count--; set(s); } if (cur.count <= 0) iv.cursor = null; }
      else if (s) { const h = Math.ceil(s.count / 2); iv.cursor = { id: s.id, count: h }; s.count -= h; set(s.count > 0 ? s : null); }
    } else {
      if (!cur && s) { iv.cursor = s; set(null); }
      else if (cur && !s) { set(cur); iv.cursor = null; }
      else if (cur && s) { if (s.id === cur.id) { const m = maxStack(s.id), mv = Math.min(cur.count, m - s.count); s.count += mv; cur.count -= mv; set(s); if (cur.count <= 0) iv.cursor = null; } else { iv.cursor = s; set(cur); } }
    }
    this._renderScreen(); this._moveCursor(); this.update();
  }
  _takeOutput(opts) {
    const iv = this.game.inventory; const res = craftMatch(iv.craft.slice(0, opts.size * opts.size), opts.size);
    if (!res) return; if (iv.cursor && (iv.cursor.id !== res.id || iv.cursor.count + res.count > maxStack(res.id))) return;
    if (iv.cursor) iv.cursor.count += res.count; else iv.cursor = { id: res.id, count: res.count };
    for (let i = 0; i < opts.size * opts.size; i++) { const s = iv.craft[i]; if (s) { s.count--; if (s.count <= 0) iv.craft[i] = null; } }
    this._renderScreen(); this._moveCursor(); this.update();
  }
  _renderScreen() {
    const iv = this.game.inventory, sz = iv.craftSize; const s = this.el.screen; s.innerHTML = '';
    const panel = document.createElement('div'); panel.className = 'panel';
    panel.innerHTML = `<h3>Inventory</h3>`;
    const craftWrap = document.createElement('div'); craftWrap.className = 'craftwrap';
    const cg = document.createElement('div'); cg.className = 'grid'; cg.style.gridTemplateColumns = `repeat(${sz},1fr)`;
    for (let i = 0; i < sz * sz; i++) cg.appendChild(this._slot(() => iv.craft[i], v => iv.craft[i] = v));
    const arrow = document.createElement('div'); arrow.className = 'arrow';
    const res = craftMatch(iv.craft.slice(0, sz * sz), sz);
    const out = this._slot(() => res ? { id: res.id, count: res.count } : null, () => {}, { out: true, size: sz, cls: 'out' });
    craftWrap.appendChild(cg); craftWrap.appendChild(arrow); craftWrap.appendChild(out);
    panel.appendChild(craftWrap);
    const main = document.createElement('div'); main.className = 'grid'; main.style.gridTemplateColumns = 'repeat(9,1fr)'; main.style.marginTop = '10px';
    for (let i = 9; i < 36; i++) main.appendChild(this._slot(() => iv.slots[i], v => iv.slots[i] = v));
    panel.appendChild(main);
    const hb = document.createElement('div'); hb.className = 'grid hotrow'; hb.style.gridTemplateColumns = 'repeat(9,1fr)';
    for (let i = 0; i < 9; i++) hb.appendChild(this._slot(() => iv.slots[i], v => iv.slots[i] = v));
    panel.appendChild(hb);
    s.appendChild(panel);
  }
  showMenu(which) {
    this.open = which ? 'menu' : (this.open === 'menu' ? null : this.open);
    const m = this.el.menu; if (!which) { m.classList.add('hidden'); return; }
    m.classList.remove('hidden'); this.game.input.unlock();
    if (which === 'start') {
      m.innerHTML = `<div class="card"><h1>BLOCKCRAFT</h1><p class="sub">a voxel survival sandbox</p><button id="bs">Play Survival</button><button id="bc">Play Creative</button><div class="hint2">WASD · mouse · L/R click · E inventory · Esc menu</div></div>`;
      m.querySelector('#bs').onclick = () => this.game.start('survival');
      m.querySelector('#bc').onclick = () => this.game.start('creative');
    } else if (which === 'pause') {
      m.innerHTML = `<div class="card"><h1>Paused</h1><button id="br">Resume</button><button id="bt">Quit to Title</button></div>`;
      m.querySelector('#br').onclick = () => this.game.resume();
      m.querySelector('#bt').onclick = () => location.reload();
    } else if (which === 'death') {
      m.innerHTML = `<div class="card"><h1 style="color:#e05a5a">You Died</h1><button id="brs">Respawn</button></div>`;
      m.querySelector('#brs').onclick = () => this.game.respawn();
    }
  }
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
const DAY_LENGTH = 1200; // 20 minutes, like Minecraft
class Game {
  constructor() {
    const canvas = document.getElementById('gl');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 1200);
    this.scene.add(this.camera);
    this.time = 0; this.gameTime = DAY_LENGTH * 0.10; this.clock = new THREE.Clock();
    this.playing = false; this.paused = false; this.mode = 'survival';

    const atlas = buildAtlas(); this.atlas = atlas.canvas; this.uv = atlas.uv;
    this.tex = new THREE.CanvasTexture(atlas.canvas); this.tex.magFilter = THREE.NearestFilter; this.tex.minFilter = THREE.NearestFilter; this.tex.generateMipmaps = false; this.tex.flipY = false;
    this.uniforms = { uTime: { value: 0 }, uDay: { value: 1 }, uAmbient: { value: 0.3 }, uFog: { value: new THREE.Color(0xcfe7f7) }, uFogNear: { value: RENDER_DIST * 16 * 0.62 }, uFogFar: { value: RENDER_DIST * 16 * 0.96 } };
    this.materials = makeMaterials(this.tex, this.uniforms);
    this.sky = makeSky(this.uniforms); this.scene.add(this.sky.group);

    // selection outline + crack overlay
    this.sel = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)), new THREE.LineBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.35 }));
    this.sel.visible = false; this.scene.add(this.sel);
    this.crackT = makeCrackTexture();
    this.crack = new THREE.Mesh(new THREE.BoxGeometry(1.005, 1.005, 1.005), new THREE.MeshBasicMaterial({ map: this.crackT.tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.crack.visible = false; this.scene.add(this.crack);

    this.inventory = new Inventory();
    this.input = new Input(canvas);
    this.ui = new UI(this);
    this.makeHand();

    canvas.addEventListener('mousedown', () => { if (this.playing && !this.paused && !this.ui.open && !this.input.locked) this.input.lock(); });
    addEventListener('resize', () => { this.camera.aspect = innerWidth / innerHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(innerWidth, innerHeight); });
    this.input.onLock = (locked) => { if (!locked && this.playing && !this.paused && !this.ui.open) this.pause(); };
    window.GAME = this;
    this.ui.showMenu('start');
    this.loop();
  }
  makeHand() {
    this.hand = new THREE.Group(); this.camera.add(this.hand);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), new THREE.MeshBasicMaterial({ color: 0xe0a578 }));
    arm.geometry.translate(0, -0.25, 0); arm.position.set(0.42, -0.4, -0.6); arm.rotation.set(-0.3, -0.2, -0.3);
    this.hand.add(arm); this.arm = arm; this.hand.visible = false;
  }
  start(mode) {
    this.mode = mode;
    this.gen = new WorldGen((Math.random() * 1e9) | 0);
    this.world = new World(this.scene, this.gen, this.materials, this.uv);
    this.player = new Player(this);
    this.inventory.slots.fill(null); this.inventory.craft.fill(null); this.inventory.cursor = null; this.inventory.sel = 0;
    if (mode === 'creative') { [B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.PLANKS, B.LOG, B.LEAVES, B.GLASS, B.SAND].forEach((id, i) => this.inventory.slots[i] = { id, count: 64 }); }
    // spawn
    for (let i = 0; i < 10; i++) this.world.update(8, 8);
    const sy = this.world.highestY(8, 8); this.player.pos.set(8.5, sy + 2, 8.5);
    this.playing = true; this.paused = false; this.hand.visible = true;
    this.ui.showMenu(null); this.input.lock();
  }
  onHurt() { document.body.classList.add('hurt'); clearTimeout(this._ht); this._ht = setTimeout(() => document.body.classList.remove('hurt'), 180); }
  onDeath() { this.input.unlock(); this.ui.showMenu('death'); }
  respawn() { const sy = this.world.highestY(8, 8); const p = this.player; p.pos.set(8.5, sy + 2, 8.5); p.vel.set(0, 0, 0); p.health = 20; p.hunger = 20; p.sat = 5; p.dead = false; p.fallStart = null; this.ui.showMenu(null); this.input.lock(); }
  pause() { if (!this.playing || this.paused) return; this.paused = true; this.input.unlock(); this.ui.showMenu('pause'); }
  resume() { this.paused = false; this.ui.showMenu(null); this.input.lock(); }
  loop() {
    requestAnimationFrame(() => this.loop());
    const dt = Math.min(this.clock.getDelta(), 0.1); this.time += dt;

    if (this.playing) {
      // global keys
      if (this.input.p('KeyE')) { if (this.ui.open === 'inv' || this.ui.open === 'palette') this.ui.close(); else if (!this.paused) this.ui.openInventory(); }
      if (this.input.p('Escape')) { if (this.ui.open === 'inv' || this.ui.open === 'palette') this.ui.close(); else if (this.paused) this.resume(); else this.pause(); }
      const frozen = this.paused || this.ui.open;
      if (!frozen && !this.player.dead) this.player.update(dt, this.input);
      if (this.world) this.world.update(this.player.pos.x, this.player.pos.z);
      this.gameTime += dt;
      // selection + crack
      const t = this.player.target;
      if (t && !frozen) { this.sel.visible = true; this.sel.position.set(t.x + 0.5, t.y + 0.5, t.z + 0.5); } else this.sel.visible = false;
      const bt = this.player.breakTarget;
      if (bt && this.player.breakProgress > 0 && this.mode !== 'creative') { this.crack.visible = true; this.crack.position.set(bt.x + 0.5, bt.y + 0.5, bt.z + 0.5); this.crackT.tex.offset.y = (Math.min(this.crackT.F - 1, (this.player.breakProgress * this.crackT.F) | 0)) / this.crackT.F; }
      else this.crack.visible = false;
      this.hand.visible = !frozen;
    }
    this._sky(dt);
    if (this.playing) this.ui.update();
    this.input.end();
    this.renderer.render(this.scene, this.camera);
  }
  _sky(dt) {
    const dayT = (this.gameTime / DAY_LENGTH) % 1;
    const ang = dayT * Math.PI * 2;
    const elev = Math.sin(ang);
    const sunDir = new THREE.Vector3(Math.cos(ang) * 0.8, elev, 0.34).normalize();
    const dayLight = smooth(-0.08, 0.22, elev);
    this.uniforms.uDay.value = 0.1 + 0.9 * dayLight;
    this.uniforms.uTime.value = this.time;
    this.uniforms.uAmbient.value = 0.16 + 0.16 * dayLight;
    const dayTop = new THREE.Color(0x4a8fe0), dayBot = new THREE.Color(0xcfe7f7);
    const nightTop = new THREE.Color(0x070b1c), nightBot = new THREE.Color(0x121a33);
    const top = nightTop.clone().lerp(dayTop, dayLight), bot = nightBot.clone().lerp(dayBot, dayLight);
    const horizon = clamp(1 - Math.abs(elev) / 0.3, 0, 1);
    bot.lerp(new THREE.Color(0xe8954a), horizon * 0.55);
    this.sky.skyU.uTop.value.copy(top); this.sky.skyU.uBottom.value.copy(bot);
    this.uniforms.uFog.value.copy(bot);
    this.sky.update(this.camera, sunDir, this.time, dayLight);
    this.arm.material.color.setRGB(0.88 * (0.3 + 0.7 * dayLight) + 0.1, 0.62 * (0.3 + 0.7 * dayLight) + 0.08, 0.45 * (0.3 + 0.7 * dayLight) + 0.06);
  }
}
function smooth(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }

function boot() { try { new Game(); const b = document.getElementById('boot'); if (b) b.style.display = 'none'; } catch (e) { const b = document.getElementById('boot'); if (b) { b.style.display = 'block'; b.style.color = '#f88'; b.textContent = 'Error: ' + e.message; } console.error(e); } }
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', boot); else boot();

